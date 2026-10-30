from django.db.models import Count, DecimalField, F, Q, Sum
from django.http import Http404, HttpResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET
from rest_framework import generics, viewsets
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsSeller
from orders.models import OrderItem

from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer, SellerProductSerializer


MAX_IMAGE_BYTES = 2 * 1024 * 1024  # 2 MB (the web app also shrinks photos before upload)


def public_products():
    """Only active products from admin-approved sellers are visible to shoppers."""
    return (
        Product.objects.filter(is_active=True, seller__seller_profile__is_approved=True)
        .select_related("category", "seller__seller_profile")
        .defer("image_data")
    )


def sniff_image(data: bytes):
    """Identify an image by its magic bytes (never trust the browser-supplied content type)."""
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


@require_GET
def product_image(request, pk):
    row = Product.objects.filter(pk=pk).exclude(image_type="").values_list("image_data", "image_type").first()
    if not row or not row[0]:
        raise Http404
    resp = HttpResponse(bytes(row[0]), content_type=row[1])
    resp["Cache-Control"] = "public, max-age=86400"  # URL carries ?v=<updated> so changes bust the cache
    resp["X-Content-Type-Options"] = "nosniff"
    return resp


class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]
    pagination_class = None


class ProductListView(generics.ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]

    SORTS = {
        "newest": "-created_at",
        "price_asc": "price",
        "price_desc": "-price",
        "name": "name",
    }

    def get_queryset(self):
        p = self.request.query_params
        qs = public_products()
        if p.get("category"):
            qs = qs.filter(category__slug=p["category"])
        if p.get("q"):
            q = p["q"].strip()
            qs = qs.filter(Q(name__icontains=q) | Q(description__icontains=q) | Q(category__name__icontains=q))
        if p.get("in_stock") in {"1", "true"}:
            qs = qs.filter(stock__gt=0)
        if p.get("deals") in {"1", "true"}:
            qs = qs.filter(mrp__gt=F("price"))
        for key, lookup in (("min_price", "price__gte"), ("max_price", "price__lte")):
            try:
                if p.get(key):
                    qs = qs.filter(**{lookup: float(p[key])})
            except ValueError:
                pass
        return qs.order_by(self.SORTS.get(p.get("sort"), "-created_at"), "id")


class ProductDetailView(generics.RetrieveAPIView):
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return public_products()


class HomeView(APIView):
    """One request that powers the whole home page."""
    permission_classes = [AllowAny]

    def get(self, request):
        base = public_products().filter(stock__gt=0)
        ser = lambda qs: ProductSerializer(qs, many=True).data
        return Response({
            "categories": CategorySerializer(Category.objects.all(), many=True).data,
            "featured": ser(base.filter(is_featured=True)[:8]),
            "deals": ser(base.filter(mrp__gt=F("price")).order_by("-created_at")[:8]),
            "new_arrivals": ser(base.order_by("-created_at")[:8]),
        })


class SellerProductViewSet(viewsets.ModelViewSet):
    serializer_class = SellerProductSerializer
    permission_classes = [IsSeller]

    def get_queryset(self):
        qs = Product.objects.filter(seller=self.request.user).select_related("category").defer("image_data")
        q = self.request.query_params.get("q")
        return qs.filter(name__icontains=q) if q else qs

    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)


class SellerStatsView(APIView):
    permission_classes = [IsSeller]

    def get(self, request):
        products = Product.objects.filter(seller=request.user)
        items = OrderItem.objects.filter(seller=request.user)
        live = items.exclude(status=OrderItem.Status.CANCELLED)
        revenue = live.aggregate(t=Sum(F("price") * F("quantity"), output_field=DecimalField(max_digits=14, decimal_places=2)))["t"] or 0
        return Response({
            "products": products.count(),
            "active_products": products.filter(is_active=True).count(),
            "low_stock": products.filter(stock__lte=5, is_active=True).count(),
            "orders": live.values("order").distinct().count(),
            "pending": items.filter(status=OrderItem.Status.PENDING).count(),
            "revenue": revenue,
            "status_counts": {r["status"]: r["n"] for r in items.values("status").annotate(n=Count("id"))},
        })


class SellerProductImageView(APIView):
    """POST multipart `image` to upload/replace a product photo; DELETE to remove it."""
    permission_classes = [IsSeller]
    parser_classes = [MultiPartParser]

    def _product(self, request, pk):
        return get_object_or_404(Product.objects.defer("image_data"), pk=pk, seller=request.user)

    def post(self, request, pk):
        product = self._product(request, pk)
        f = request.FILES.get("image")
        if f is None:
            return Response({"detail": "Choose an image file."}, status=400)
        if f.size > MAX_IMAGE_BYTES:
            return Response({"detail": "Image is too large (max 2 MB)."}, status=400)
        data = f.read()
        ctype = sniff_image(data)
        if ctype is None:
            return Response({"detail": "Only JPEG, PNG or WebP images are allowed."}, status=400)
        product.image_data = data
        product.image_type = ctype
        product.save(update_fields=["image_data", "image_type", "updated_at"])
        return Response(SellerProductSerializer(product).data)

    def delete(self, request, pk):
        product = self._product(request, pk)
        product.image_data = None
        product.image_type = ""
        product.save(update_fields=["image_data", "image_type", "updated_at"])
        return Response(SellerProductSerializer(product).data)
