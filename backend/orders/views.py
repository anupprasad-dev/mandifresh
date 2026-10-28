from django.db import transaction
from django.db.models import F
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsCustomer, IsSeller
from catalog.models import Product

from .models import Order, OrderItem
from .serializers import OrderCreateSerializer, OrderSerializer, SellerOrderItemSerializer


class OrderListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsCustomer]

    def get_queryset(self):
        return Order.objects.filter(customer=self.request.user).prefetch_related("items__product")

    def get_serializer_class(self):
        return OrderCreateSerializer if self.request.method == "POST" else OrderSerializer

    def create(self, request, *args, **kwargs):
        s = OrderCreateSerializer(data=request.data, context={"request": request})
        s.is_valid(raise_exception=True)
        order = s.save()
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderDetailView(generics.RetrieveAPIView):
    permission_classes = [IsCustomer]
    serializer_class = OrderSerializer

    def get_queryset(self):
        return Order.objects.filter(customer=self.request.user).prefetch_related("items__product")


def restock(item):
    if item.product_id:
        Product.objects.filter(pk=item.product_id).update(stock=F("stock") + item.quantity)


class OrderCancelView(APIView):
    permission_classes = [IsCustomer]

    @transaction.atomic
    def post(self, request, pk):
        order = get_object_or_404(Order.objects.select_for_update(), pk=pk, customer=request.user)
        items = list(order.items.select_for_update())
        if any(i.status != OrderItem.Status.PENDING for i in items):
            return Response(
                {"detail": "This order is already being processed and can no longer be cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        for item in items:
            item.status = OrderItem.Status.CANCELLED
            item.save(update_fields=["status"])
            restock(item)
        order = Order.objects.prefetch_related("items__product").get(pk=order.pk)
        return Response(OrderSerializer(order).data)


# ---------------- seller side ----------------
class SellerOrderListView(generics.ListAPIView):
    permission_classes = [IsSeller]
    serializer_class = SellerOrderItemSerializer

    def get_queryset(self):
        qs = OrderItem.objects.filter(seller=self.request.user).select_related("order")
        st = self.request.query_params.get("status")
        if st:
            qs = qs.filter(status=st)
        return qs.order_by("-order__created_at", "id")


class SellerOrderStatusView(APIView):
    permission_classes = [IsSeller]

    @transaction.atomic
    def patch(self, request, pk):
        item = get_object_or_404(OrderItem.objects.select_for_update().select_related("order"), pk=pk, seller=request.user)
        new = request.data.get("status")
        if new not in OrderItem.TRANSITIONS.get(item.status, set()):
            return Response({"detail": f"Cannot move an order from {item.status} to {new}."}, status=400)
        item.status = new
        item.save(update_fields=["status"])
        if new == OrderItem.Status.CANCELLED:
            restock(item)
        return Response(SellerOrderItemSerializer(item).data)
