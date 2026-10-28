from decimal import Decimal

from django.conf import settings
from django.db import models


class Order(models.Model):
    class Payment(models.TextChoices):
        COD = "cod", "Cash on delivery"

    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="orders")
    full_name = models.CharField(max_length=120)
    phone = models.CharField(max_length=15)
    address_line = models.CharField(max_length=255)
    city = models.CharField(max_length=80)
    state = models.CharField(max_length=80)
    pincode = models.CharField(max_length=6)
    notes = models.CharField(max_length=300, blank=True)
    payment_method = models.CharField(max_length=10, choices=Payment.choices, default=Payment.COD)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    delivery_fee = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0"))
    total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def status(self):
        statuses = {i.status for i in self.items.all()}
        if len(statuses) == 1:
            return statuses.pop()
        if statuses == {OrderItem.Status.CANCELLED}:
            return OrderItem.Status.CANCELLED
        return "in_progress"

    def __str__(self):
        return f"Order #{self.pk}"


class OrderItem(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        PACKED = "packed", "Packed"
        SHIPPED = "shipped", "Shipped"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"

    # allowed seller-driven transitions
    TRANSITIONS = {
        "pending": {"confirmed", "cancelled"},
        "confirmed": {"packed", "cancelled"},
        "packed": {"shipped", "cancelled"},
        "shipped": {"delivered"},
        "delivered": set(),
        "cancelled": set(),
    }

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey("catalog.Product", on_delete=models.SET_NULL, null=True, related_name="order_items")
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="sold_items")
    # snapshots so history stays correct even if the product changes or is deleted
    product_name = models.CharField(max_length=160)
    unit = models.CharField(max_length=40, blank=True)
    image_url = models.URLField(max_length=500, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)

    @property
    def line_total(self):
        return self.price * self.quantity

    def __str__(self):
        return f"{self.quantity} x {self.product_name}"
