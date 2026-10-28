from django.contrib import admin

from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    raw_id_fields = ("product", "seller")


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "customer", "total", "payment_method", "created_at")
    inlines = [OrderItemInline]
    search_fields = ("customer__email", "full_name", "phone")
