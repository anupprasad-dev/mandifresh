"""Populate categories and demo products. Safe to run more than once.

    python manage.py seed_demo                 # categories + demo seller + products
    python manage.py seed_demo --categories-only   # only categories (recommended for production)
"""
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import SellerProfile, User
from catalog.models import Category, Product

CATEGORIES = [
    ("Fruits", "🍎"), ("Vegetables", "🥦"), ("Dairy & Eggs", "🥛"), ("Bakery", "🍞"),
    ("Rice, Atta & Dal", "🌾"), ("Spices & Masala", "🌶️"), ("Snacks", "🍪"),
    ("Beverages", "🧃"), ("Meat & Fish", "🐟"), ("Household", "🧴"),
]

# (name, category, price, mrp, unit, stock, featured)
PRODUCTS = [
    ("Fresh Bananas", "Fruits", 49, 60, "1 dozen", 80, True),
    ("Kashmiri Apples", "Fruits", 189, 220, "1 kg", 40, True),
    ("Alphonso Mangoes", "Fruits", 299, 360, "1 kg", 25, False),
    ("Seedless Grapes", "Fruits", 99, 120, "500 g", 35, False),
    ("Watermelon", "Fruits", 59, None, "1 piece", 20, False),
    ("Fresh Tomatoes", "Vegetables", 32, 40, "500 g", 120, True),
    ("Onions", "Vegetables", 38, 45, "1 kg", 150, False),
    ("Potatoes", "Vegetables", 30, None, "1 kg", 200, False),
    ("Green Spinach (Palak)", "Vegetables", 25, 30, "250 g", 60, True),
    ("Cauliflower", "Vegetables", 45, None, "1 piece", 40, False),
    ("Fresh Carrots", "Vegetables", 52, 65, "500 g", 70, False),
    ("Farm Fresh Milk", "Dairy & Eggs", 34, None, "500 ml", 100, True),
    ("Paneer Block", "Dairy & Eggs", 95, 110, "200 g", 45, True),
    ("Curd (Dahi)", "Dairy & Eggs", 28, None, "400 g", 90, False),
    ("Country Eggs", "Dairy & Eggs", 78, 90, "12 pcs", 60, False),
    ("Salted Butter", "Dairy & Eggs", 58, 62, "100 g", 55, False),
    ("Whole Wheat Bread", "Bakery", 42, 48, "400 g", 50, False),
    ("Butter Croissant", "Bakery", 35, None, "2 pcs", 30, False),
    ("Basmati Rice", "Rice, Atta & Dal", 139, 165, "1 kg", 90, True),
    ("Whole Wheat Atta", "Rice, Atta & Dal", 285, 320, "5 kg", 60, True),
    ("Toor Dal", "Rice, Atta & Dal", 149, 175, "1 kg", 70, False),
    ("Moong Dal", "Rice, Atta & Dal", 129, 150, "1 kg", 65, False),
    ("Turmeric Powder", "Spices & Masala", 62, 75, "200 g", 80, False),
    ("Red Chilli Powder", "Spices & Masala", 74, 90, "200 g", 80, False),
    ("Garam Masala", "Spices & Masala", 68, None, "100 g", 75, True),
    ("Whole Cumin (Jeera)", "Spices & Masala", 59, 70, "100 g", 60, False),
    ("Salted Potato Chips", "Snacks", 20, None, "52 g", 150, False),
    ("Roasted Peanuts", "Snacks", 55, 65, "200 g", 90, False),
    ("Digestive Biscuits", "Snacks", 45, 50, "250 g", 100, False),
    ("Masala Tea Leaves", "Beverages", 135, 160, "250 g", 70, True),
    ("Fresh Orange Juice", "Beverages", 85, 99, "1 L", 40, False),
    ("Filter Coffee Powder", "Beverages", 210, 245, "250 g", 45, False),
    ("Rohu Fish (Cleaned)", "Meat & Fish", 260, 300, "500 g", 20, False),
    ("Chicken Curry Cut", "Meat & Fish", 220, 250, "500 g", 25, False),
    ("Dishwash Liquid", "Household", 99, 120, "500 ml", 60, False),
    ("Floor Cleaner", "Household", 145, 175, "1 L", 50, False),
]


class Command(BaseCommand):
    help = "Seed categories and (optionally) demo products."

    def add_arguments(self, parser):
        parser.add_argument("--categories-only", action="store_true")

    @transaction.atomic
    def handle(self, *args, **opts):
        cats = {}
        for i, (name, emoji) in enumerate(CATEGORIES):
            cat, _ = Category.objects.update_or_create(name=name, defaults={"emoji": emoji, "sort_order": i})
            cats[name] = cat
        self.stdout.write(self.style.SUCCESS(f"{len(cats)} categories ready."))
        if opts["categories_only"]:
            return

        seller, created = User.objects.get_or_create(
            email="seller@mandifresh.test",
            defaults={"name": "Demo Seller", "role": User.Role.SELLER},
        )
        if created:
            seller.set_password("Seller@12345")
            seller.save()
        SellerProfile.objects.update_or_create(
            user=seller, defaults={"store_name": "Odisha Farm Fresh", "city": "Bhubaneswar", "is_approved": True}
        )
        if not User.objects.filter(email="admin@mandifresh.test").exists():
            User.objects.create_superuser(email="admin@mandifresh.test", password="Admin@12345", name="Demo Admin")
        for name, cat, price, mrp, unit, stock, featured in PRODUCTS:
            Product.objects.update_or_create(
                seller=seller, name=name,
                defaults={
                    "category": cats[cat], "price": Decimal(price), "mrp": Decimal(mrp) if mrp else None,
                    "unit": unit, "stock": stock, "is_featured": featured,
                    "description": f"Fresh, quality-checked {name.lower()} delivered to your door.",
                },
            )
        self.stdout.write(self.style.SUCCESS(f"{len(PRODUCTS)} demo products ready."))
        self.stdout.write("DEV ONLY demo logins:")
        self.stdout.write("  seller: seller@mandifresh.test / Seller@12345  ->  /seller/login")
        self.stdout.write("  admin : admin@mandifresh.test  / Admin@12345   ->  /admin/login")
