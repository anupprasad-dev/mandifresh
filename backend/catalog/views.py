from django.db.models import Count, DecimalField, F, Q, Sum
from rest_framework import generics, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsSeller
from orders.models import OrderItem

from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer, SellerProductSerializer


def public_products():
    return (
        Product.objects.filter(is_active=True)
        .select_related("category", "seller__seller_profile")
    )


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
        qs = Product.objects.filter(seller=self.request.user).select_related("category")
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
