from decimal import Decimal

from django.conf import settings
from django.db import transaction
from rest_framework import serializers

from catalog.models import Product

from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    line_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    product_slug = serializers.CharField(source="product.slug", read_only=True, default=None)

    class Meta:
        model = OrderItem
        fields = ("id", "product_name", "product_slug", "unit", "image_url", "price", "quantity", "line_total", "status")


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status = serializers.CharField(read_only=True)

    class Meta:
        model = Order
        fields = (
            "id", "status", "full_name", "phone", "address_line", "city", "state", "pincode", "notes",
            "payment_method", "subtotal", "delivery_fee", "total", "created_at", "items",
        )


class CartLineSerializer(serializers.Serializer):
    product = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, max_value=50)


class OrderCreateSerializer(serializers.Serializer):
    items = CartLineSerializer(many=True, allow_empty=False, max_length=50)
    full_name = serializers.CharField(max_length=120)
    phone = serializers.RegexField(r"^[0-9+\-\s]{7,15}$")
    address_line = serializers.CharField(max_length=255)
    city = serializers.CharField(max_length=80)
    state = serializers.CharField(max_length=80)
    pincode = serializers.RegexField(r"^[1-9][0-9]{5}$", error_messages={"invalid": "Enter a valid 6-digit PIN code."})
    notes = serializers.CharField(max_length=300, required=False, allow_blank=True)
    payment_method = serializers.ChoiceField(choices=Order.Payment.choices, default=Order.Payment.COD)

    def validate_items(self, lines):
        merged = {}
        for line in lines:  # merge duplicate product lines
            merged[line["product"]] = merged.get(line["product"], 0) + line["quantity"]
        return merged

    @transaction.atomic
    def create(self, validated):
        customer = self.context["request"].user
        wanted = validated.pop("items")
        # Lock rows in a stable order so concurrent checkouts can't oversell stock.
        products = {
            p.id: p
            for p in Product.objects.select_for_update().filter(id__in=sorted(wanted), is_active=True)
        }
        errors = []
        for pid, qty in wanted.items():
            p = products.get(pid)
            if p is None:
                errors.append(f"A product in your cart is no longer available.")
            elif p.stock < qty:
                errors.append(f"Only {p.stock} left of {p.name}." if p.stock else f"{p.name} is out of stock.")
        if errors:
            raise serializers.ValidationError({"items": errors})

        subtotal = sum((products[pid].price * qty for pid, qty in wanted.items()), Decimal("0"))
        fee = Decimal("0") if subtotal >= settings.FREE_DELIVERY_THRESHOLD else Decimal(settings.DELIVERY_FEE)
        order = Order.objects.create(customer=customer, subtotal=subtotal, delivery_fee=fee, total=subtotal + fee, **validated)
        for pid, qty in wanted.items():
            p = products[pid]
            OrderItem.objects.create(
                order=order, product=p, seller=p.seller, product_name=p.name, unit=p.unit,
                image_url=p.image_url, price=p.price, quantity=qty,
            )
            p.stock -= qty
            p.save(update_fields=["stock", "updated_at"])
        return order


class SellerOrderItemSerializer(serializers.ModelSerializer):
    order_id = serializers.IntegerField(source="order.id", read_only=True)
    placed_at = serializers.DateTimeField(source="order.created_at", read_only=True)
    customer_name = serializers.CharField(source="order.full_name", read_only=True)
    phone = serializers.CharField(source="order.phone", read_only=True)
    address = serializers.SerializerMethodField()
    line_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    allowed_next = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = (
            "id", "order_id", "placed_at", "customer_name", "phone", "address", "product_name", "unit",
            "price", "quantity", "line_total", "status", "allowed_next",
        )

    def get_address(self, obj):
        o = obj.order
        return f"{o.address_line}, {o.city}, {o.state} - {o.pincode}"

    def get_allowed_next(self, obj):
        return sorted(OrderItem.TRANSITIONS.get(obj.status, set()))
