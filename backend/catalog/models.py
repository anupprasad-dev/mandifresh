from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils.text import slugify


class Category(models.Model):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=90, unique=True, blank=True)
    emoji = models.CharField(max_length=8, blank=True, default="🛒")
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name_plural = "categories"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Product(models.Model):
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="products")
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    name = models.CharField(max_length=160)
    slug = models.SlugField(max_length=190, unique=True, blank=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0.01)])
    mrp = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    unit = models.CharField(max_length=40, default="1 kg", help_text="e.g. 500 g, 1 L, 1 dozen")
    stock = models.PositiveIntegerField(default=0)
    image_url = models.URLField(max_length=500, blank=True)
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["is_active", "category"]), models.Index(fields=["name"])]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)[:150] or "product"
            slug, n = base, 1
            while Product.objects.filter(slug=slug).exists():
                n += 1
                slug = f"{base}-{n}"
            self.slug = slug
        super().save(*args, **kwargs)

    @property
    def discount_percent(self):
        if self.mrp and self.mrp > self.price:
            return int(round((self.mrp - self.price) / self.mrp * 100))
        return 0

    def __str__(self):
        return self.name
