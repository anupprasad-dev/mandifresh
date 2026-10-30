from datetime import timedelta

from django.db.models import Count, DecimalField, F, ProtectedError, Q, Sum
from django.db.models.functions import TruncDate
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, mixins, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import SellerProfile, User
from accounts.tokens import revoke_all_for_user
from catalog.models import Category, Product
from orders.models import Order, OrderItem

from .permissions import IsAdminRole
from .serializers import (
    AdminCategorySerializer, AdminOrderSerializer, AdminProductSerializer, AdminUserSerializer,
)

MONEY = DecimalField(max_digits=14, decimal_places=2)


class AdminStatsView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        live = OrderItem.objects.exclude(status=OrderItem.Status.CANCELLED)
        revenue = live.aggregate(t=Sum(F("price") * F("quantity"), output_field=MONEY))["t"] or 0

        days = 7
        today = timezone.localdate()
        since = today - timedelta(days=days - 1)
        rows = (
            live.filter(order__created_at__date__gte=since)
            .annotate(day=TruncDate("order__created_at"))
            .values("day")
            .annotate(revenue=Sum(F("price") * F("quantity"), output_field=MONEY), orders=Count("order", distinct=True))
        )
        by_day = {r["day"]: r for r in rows}
        series = []
        for i in range(days):
            d = since + timedelta(days=i)
            r = by_day.get(d)
            series.append({"date": d.isoformat(), "revenue": r["revenue"] if r else 0, "orders": r["orders"] if r else 0})

        recent = Order.objects.select_related("customer").prefetch_related("items")[:6]
        return Response({
            "users": {
                "customers": User.objects.filter(role=User.Role.CUSTOMER).count(),
                "sellers": User.objects.filter(role=User.Role.SELLER).count(),
                "pending_sellers": SellerProfile.objects.filter(is_approved=False).count(),
            },
            "products": {
                "total": Product.objects.count(),
                "active": Product.objects.filter(is_active=True).count(),
                "out_of_stock": Product.objects.filter(is_active=True, stock=0).count(),
            },
            "orders": {"total": Order.objects.count(), "revenue": revenue},
            "status_counts": {r["status"]: r["n"] for r in OrderItem.objects.values("status").annotate(n=Count("id"))},
            "sales_last_7_days": series,
            "recent_orders": AdminOrderSerializer(recent, many=True).data,
        })


class AdminUserListView(generics.ListAPIView):
    permission_classes = [IsAdminRole]
    serializer_class = AdminUserSerializer

    def get_queryset(self):
        p = self.request.query_params
        qs = (
            User.objects.select_related("seller_profile")
            .annotate(product_count=Count("products", distinct=True), order_count=Count("orders", distinct=True))
            .order_by("-date_joined")
        )
        if p.get("role") in {"customer", "seller", "admin"}:
            qs = qs.filter(role=p["role"])
        if p.get("pending") in {"1", "true"}:
            qs = qs.filter(role=User.Role.SELLER, seller_profile__is_approved=False)
        if p.get("q"):
            q = p["q"].strip()
            qs = qs.filter(Q(email__icontains=q) | Q(name__icontains=q) | Q(seller_profile__store_name__icontains=q))
        return qs


class AdminUserActiveView(APIView):
    """Enable / disable an account. Disabling signs the user out everywhere."""
    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        if user.pk == request.user.pk or user.role == User.Role.ADMIN:
            return Response({"detail": "Administrator accounts can't be changed here."}, status=400)
        active = bool(request.data.get("is_active"))
        user.is_active = active
        user.save(update_fields=["is_active"])
        if not active:
            revoke_all_for_user(user)
        return Response(AdminUserSerializer(User.objects.select_related("seller_profile").get(pk=pk)).data)


class AdminSellerApprovalView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        profile = get_object_or_404(SellerProfile, user_id=pk)
        profile.is_approved = bool(request.data.get("approved"))
        profile.save(update_fields=["is_approved"])
        return Response(AdminUserSerializer(User.objects.select_related("seller_profile").get(pk=pk)).data)


class AdminProductViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin,
                          mixins.DestroyModelMixin, viewsets.GenericViewSet):
    """Moderation: list/search products, hide, feature on the home page, delete."""
    permission_classes = [IsAdminRole]
    serializer_class = AdminProductSerializer
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        p = self.request.query_params
        qs = Product.objects.select_related("category", "seller__seller_profile").defer("image_data")
        if p.get("q"):
            q = p["q"].strip()
            qs = qs.filter(Q(name__icontains=q) | Q(seller__email__icontains=q) | Q(seller__seller_profile__store_name__icontains=q))
        if p.get("category"):
            qs = qs.filter(category_id=p["category"])
        if p.get("featured") in {"1", "true"}:
            qs = qs.filter(is_featured=True)
        if p.get("active") in {"0", "1"}:
            qs = qs.filter(is_active=p["active"] == "1")
        return qs.order_by("-created_at")


class AdminCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminRole]
    serializer_class = AdminCategorySerializer
    pagination_class = None
    queryset = Category.objects.annotate(product_count=Count("products")).order_by("sort_order", "name")

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response({"detail": "This category still has products. Move or delete them first."}, status=400)


class AdminOrderListView(generics.ListAPIView):
    permission_classes = [IsAdminRole]
    serializer_class = AdminOrderSerializer

    def get_queryset(self):
        p = self.request.query_params
        qs = Order.objects.select_related("customer").prefetch_related("items").order_by("-created_at")
        if p.get("status") in {s.value for s in OrderItem.Status}:
            qs = qs.filter(items__status=p["status"]).distinct()
        if p.get("q"):
            q = p["q"].strip()
            cond = Q(customer__email__icontains=q) | Q(full_name__icontains=q) | Q(phone__icontains=q)
            if q.isdigit():
                cond |= Q(pk=int(q))
            qs = qs.filter(cond)
        return qs
