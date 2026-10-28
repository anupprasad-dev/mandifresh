from django.core.cache import cache
from rest_framework.test import APITestCase

from .models import User

STRONG = "Str0ng!Passw0rd"


class AuthTests(APITestCase):
    def setUp(self):
        cache.clear()  # reset throttle counters

    def test_customer_register_sets_httponly_refresh_cookie(self):
        r = self.client.post("/api/auth/register/", {"name": "Asha", "email": "Asha@Example.com", "password": STRONG})
        self.assertEqual(r.status_code, 201)
        self.assertIn("access", r.data)
        self.assertEqual(r.data["user"]["role"], "customer")
        self.assertTrue(r.cookies["mf_refresh"]["httponly"])
        self.assertTrue(User.objects.filter(email="asha@example.com").exists())

    def test_weak_and_duplicate_passwords_rejected(self):
        r = self.client.post("/api/auth/register/", {"name": "A", "email": "a@example.com", "password": "12345678"})
        self.assertEqual(r.status_code, 400)
        self.client.post("/api/auth/register/", {"name": "A", "email": "a@example.com", "password": STRONG})
        r = self.client.post("/api/auth/register/", {"name": "B", "email": "A@example.com", "password": STRONG})
        self.assertEqual(r.status_code, 400)

    def test_seller_cannot_use_customer_login_and_vice_versa(self):
        self.client.post("/api/seller/auth/register/", {
            "name": "Ravi", "email": "ravi@example.com", "password": STRONG, "store_name": "Ravi Mart"})
        self.client.post("/api/auth/register/", {"name": "Cu", "email": "cu@example.com", "password": STRONG})
        bad = self.client.post("/api/auth/login/", {"email": "ravi@example.com", "password": STRONG})
        self.assertEqual(bad.status_code, 400)
        bad = self.client.post("/api/seller/auth/login/", {"email": "cu@example.com", "password": STRONG})
        self.assertEqual(bad.status_code, 400)
        ok = self.client.post("/api/seller/auth/login/", {"email": "ravi@example.com", "password": STRONG})
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(ok.data["user"]["store_name"], "Ravi Mart")

    def test_refresh_rotates_and_logout_revokes(self):
        self.client.post("/api/auth/register/", {"name": "Cu", "email": "cu@example.com", "password": STRONG})
        r = self.client.post("/api/auth/refresh/")
        self.assertEqual(r.status_code, 200)
        self.assertIn("access", r.data)
        self.client.post("/api/auth/logout/")
        self.assertEqual(self.client.post("/api/auth/refresh/").status_code, 401)

    def test_me_requires_token(self):
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)
        r = self.client.post("/api/auth/register/", {"name": "Cu", "email": "cu@example.com", "password": STRONG})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")
        self.assertEqual(self.client.get("/api/auth/me/").data["email"], "cu@example.com")
