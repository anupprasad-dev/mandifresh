from django.contrib import admin

from .models import Category, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "emoji", "sort_order")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "seller", "category", "price", "stock", "is_active", "is_featured")
    list_filter = ("category", "is_active", "is_featured")
    search_fields = ("name", "seller__email")
    list_editable = ("is_active", "is_featured")
