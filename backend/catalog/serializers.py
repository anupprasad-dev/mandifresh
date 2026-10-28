from rest_framework import serializers

from .models import Category, Product


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "slug", "emoji")


class ProductSerializer(serializers.ModelSerializer):
    """Public, read-only representation."""
    category = CategorySerializer(read_only=True)
    store_name = serializers.CharField(source="seller.seller_profile.store_name", read_only=True, default="")
    discount_percent = serializers.IntegerField(read_only=True)
    in_stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id", "name", "slug", "description", "price", "mrp", "discount_percent", "unit",
            "stock", "in_stock", "image_url", "category", "store_name", "is_featured",
        )

    def get_in_stock(self, obj):
        return obj.stock > 0


class SellerProductSerializer(serializers.ModelSerializer):
    """Seller-side CRUD; the seller is always the authenticated user."""
    category_detail = CategorySerializer(source="category", read_only=True)
    discount_percent = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = (
            "id", "name", "slug", "description", "price", "mrp", "discount_percent", "unit", "stock",
            "image_url", "category", "category_detail", "is_active", "created_at",
        )
        read_only_fields = ("id", "slug", "created_at")

    def validate(self, attrs):
        price = attrs.get("price", getattr(self.instance, "price", None))
        mrp = attrs.get("mrp", getattr(self.instance, "mrp", None))
        if mrp is not None and price is not None and mrp < price:
            raise serializers.ValidationError({"mrp": "MRP cannot be lower than the selling price."})
        return attrs
