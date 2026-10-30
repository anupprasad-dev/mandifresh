from django.core.cache import cache
from rest_framework.test import APIClient, APITestCase

from accounts.models import SellerProfile, User
from catalog.models import Category, Product

STRONG = "Str0ng!Passw0rd"


def client_for(email, path):
    c = APIClient()
    r = c.post(path, {"email": email, "password": STRONG})
    c.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")
    return c


class AdminPanelTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.admin = User.objects.create_superuser("boss@example.com", STRONG, name="Boss")
        self.seller = User.objects.create_user("s@example.com", STRONG, name="S", role="seller")
        SellerProfile.objects.create(user=self.seller, store_name="S Store")  # not approved yet
        self.customer = User.objects.create_user("c@example.com", STRONG, name="C")
        self.cat = Category.objects.create(name="Fruits")
        self.product = Product.objects.create(seller=self.seller, category=self.cat, name="Apple", price=10, stock=5)
        self.admin_api = client_for("boss@example.com", "/api/admin/auth/login/")

    def test_only_admins_can_use_admin_api(self):
        self.assertEqual(self.client.get("/api/admin/stats/").status_code, 401)
        self.assertEqual(client_for("c@example.com", "/api/auth/login/").get("/api/admin/stats/").status_code, 403)
        self.assertEqual(client_for("s@example.com", "/api/seller/auth/login/").get("/api/admin/users/").status_code, 403)
        self.assertEqual(self.admin_api.get("/api/admin/stats/").status_code, 200)

    def test_seller_products_hidden_until_admin_approves(self):
        self.assertEqual(self.client.get("/api/products/").data["count"], 0)
        r = self.admin_api.post(f"/api/admin/sellers/{self.seller.id}/approval/", {"approved": True}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.client.get("/api/products/").data["count"], 1)

    def test_disable_user_and_protect_admins(self):
        r = self.admin_api.post(f"/api/admin/users/{self.customer.id}/active/", {"is_active": False}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.client.post("/api/auth/login/", {"email": "c@example.com", "password": STRONG}).status_code, 400)
        self.assertEqual(self.admin_api.post(f"/api/admin/users/{self.admin.id}/active/", {"is_active": False}, format="json").status_code, 400)

    def test_category_crud_and_delete_protection(self):
        r = self.admin_api.post("/api/admin/categories/", {"name": "Dairy", "emoji": "🥛", "sort_order": 2}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(self.admin_api.delete(f"/api/admin/categories/{self.cat.id}/").status_code, 400)  # has products
        self.assertEqual(self.admin_api.delete(f"/api/admin/categories/{r.data['id']}/").status_code, 204)

    def test_feature_and_hide_product(self):
        r = self.admin_api.patch(f"/api/admin/products/{self.product.id}/", {"is_featured": True, "price": "1"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.product.refresh_from_db()
        self.assertTrue(self.product.is_featured)
        self.assertEqual(str(self.product.price), "10.00")  # admin cannot change seller's price
