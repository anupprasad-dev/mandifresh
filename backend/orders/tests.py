from django.core.cache import cache
from rest_framework.test import APIClient, APITestCase

from accounts.models import SellerProfile, User
from catalog.models import Category, Product

from .models import OrderItem

STRONG = "Str0ng!Passw0rd"
ADDRESS = {
    "full_name": "Asha Das", "phone": "9876543210", "address_line": "12 Market Rd",
    "city": "Bhubaneswar", "state": "Odisha", "pincode": "751001",
}


def login(email, path="/api/auth/login/"):
    c = APIClient()
    r = c.post(path, {"email": email, "password": STRONG})
    c.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")
    return c


class ShopFlowTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.cat = Category.objects.create(name="Fruits")
        self.seller = User.objects.create_user("s@example.com", STRONG, name="S", role="seller")
        SellerProfile.objects.create(user=self.seller, store_name="S Store", is_approved=True)
        self.other = User.objects.create_user("o@example.com", STRONG, name="O", role="seller")
        SellerProfile.objects.create(user=self.other, store_name="O Store", is_approved=True)
        self.customer = User.objects.create_user("c@example.com", STRONG, name="C")
        self.apple = Product.objects.create(seller=self.seller, category=self.cat, name="Apple", price=100, stock=5)

    def test_public_catalog_hides_inactive(self):
        Product.objects.create(seller=self.seller, category=self.cat, name="Hidden", price=10, stock=1, is_active=False)
        names = [p["name"] for p in self.client.get("/api/products/").data["results"]]
        self.assertEqual(names, ["Apple"])

    def test_order_decrements_stock_and_charges_delivery(self):
        c = login("c@example.com")
        r = c.post("/api/orders/", {"items": [{"product": self.apple.id, "quantity": 2}], **ADDRESS}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["subtotal"], "200.00")
        self.assertEqual(r.data["delivery_fee"], "40.00")
        self.apple.refresh_from_db()
        self.assertEqual(self.apple.stock, 3)

    def test_cannot_oversell(self):
        c = login("c@example.com")
        r = c.post("/api/orders/", {"items": [{"product": self.apple.id, "quantity": 9}], **ADDRESS}, format="json")
        self.assertEqual(r.status_code, 400)
        self.apple.refresh_from_db()
        self.assertEqual(self.apple.stock, 5)

    def test_cancel_restocks_only_while_pending(self):
        c = login("c@example.com")
        oid = c.post("/api/orders/", {"items": [{"product": self.apple.id, "quantity": 2}], **ADDRESS}, format="json").data["id"]
        self.assertEqual(c.post(f"/api/orders/{oid}/cancel/").status_code, 200)
        self.apple.refresh_from_db()
        self.assertEqual(self.apple.stock, 5)

    def test_seller_sees_only_own_products_and_orders(self):
        c = login("c@example.com")
        c.post("/api/orders/", {"items": [{"product": self.apple.id, "quantity": 1}], **ADDRESS}, format="json")
        mine = login("s@example.com", "/api/seller/auth/login/")
        theirs = login("o@example.com", "/api/seller/auth/login/")
        self.assertEqual(len(mine.get("/api/seller/orders/").data["results"]), 1)
        self.assertEqual(len(theirs.get("/api/seller/orders/").data["results"]), 0)
        self.assertEqual(theirs.get("/api/seller/products/").data["count"], 0)
        self.assertEqual(theirs.patch(f"/api/seller/products/{self.apple.id}/", {"price": "1"}, format="json").status_code, 404)

    def test_customer_cannot_reach_seller_api_and_status_flow_is_enforced(self):
        c = login("c@example.com")
        self.assertEqual(c.get("/api/seller/products/").status_code, 403)
        c.post("/api/orders/", {"items": [{"product": self.apple.id, "quantity": 1}], **ADDRESS}, format="json")
        item = OrderItem.objects.get()
        s = login("s@example.com", "/api/seller/auth/login/")
        self.assertEqual(s.patch(f"/api/seller/orders/{item.id}/status/", {"status": "delivered"}, format="json").status_code, 400)
        self.assertEqual(s.patch(f"/api/seller/orders/{item.id}/status/", {"status": "confirmed"}, format="json").status_code, 200)


class ImageUploadTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.cat = Category.objects.create(name="Fruits")
        self.seller = User.objects.create_user("s@example.com", STRONG, name="S", role="seller")
        SellerProfile.objects.create(user=self.seller, store_name="S Store", is_approved=True)
        self.apple = Product.objects.create(seller=self.seller, category=self.cat, name="Apple", price=100, stock=5)
        self.api = login("s@example.com", "/api/seller/auth/login/")

    def upload(self, data, name="a.png"):
        from django.core.files.uploadedfile import SimpleUploadedFile
        return self.api.post(f"/api/seller/products/{self.apple.id}/image/", {"image": SimpleUploadedFile(name, data)}, format="multipart")

    def test_valid_png_is_stored_and_served(self):
        png = b"\x89PNG\r\n\x1a\n" + b"0" * 64
        r = self.upload(png)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertTrue(r.data["has_upload"])
        served = self.client.get(f"/api/products/{self.apple.id}/image/")
        self.assertEqual(served["Content-Type"], "image/png")
        self.assertEqual(served.content, png)

    def test_non_image_is_rejected_even_with_image_extension(self):
        self.assertEqual(self.upload(b"<script>alert(1)</script>", "evil.png").status_code, 400)
