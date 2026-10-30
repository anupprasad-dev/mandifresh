from rest_framework import serializers

from accounts.models import User
from catalog.models import Category, Product
from orders.models import Order
from orders.serializers import OrderItemSerializer


class AdminUserSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source="seller_profile.store_name", read_only=True, default=None)
    city = serializers.CharField(source="seller_profile.city", read_only=True, default=None)
    seller_approved = serializers.BooleanField(source="seller_profile.is_approved", read_only=True, default=None)
    product_count = serializers.IntegerField(read_only=True, default=0)
    order_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = User
        fields = (
            "id", "name", "email", "phone", "role", "is_active", "date_joined", "last_login",
            "store_name", "city", "seller_approved", "product_count", "order_count",
        )
        read_only_fields = fields


class AdminProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    store_name = serializers.CharField(source="seller.seller_profile.store_name", read_only=True, default="")
    seller_email = serializers.CharField(source="seller.email", read_only=True)
    seller_approved = serializers.BooleanField(source="seller.seller_profile.is_approved", read_only=True, default=False)
    image = serializers.CharField(source="image_src", read_only=True)

    class Meta:
        model = Product
        fields = (
            "id", "name", "slug", "price", "mrp", "unit", "stock", "image", "category_name", "store_name",
            "seller_email", "seller_approved", "is_active", "is_featured", "created_at",
        )
        read_only_fields = tuple(f for f in fields if f not in ("is_active", "is_featured"))


class AdminCategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ("id", "name", "slug", "emoji", "sort_order", "product_count")
        read_only_fields = ("id", "slug", "product_count")

    def validate_name(self, value):
        value = value.strip()
        qs = Category.objects.filter(name__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A category with this name already exists.")
        return value


class AdminOrderSerializer(serializers.ModelSerializer):
    customer_email = serializers.CharField(source="customer.email", read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)
    status = serializers.CharField(read_only=True)

    class Meta:
        model = Order
        fields = (
            "id", "status", "customer_email", "full_name", "phone", "address_line", "city", "state", "pincode",
            "payment_method", "subtotal", "delivery_fee", "total", "created_at", "items",
        )
