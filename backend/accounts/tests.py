from datetime import timedelta
from unittest import mock

from django.conf import settings
from django.core.cache import cache
from django.test import SimpleTestCase
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase

from . import jwt_core
from .models import RefreshSession, User
from .tokens import create_access_token

STRONG = "Str0ng!Passw0rd"


class JwtCoreTests(SimpleTestCase):
    cfg = {"SECRET": "s" * 40, "ALGORITHM": "HS256", "ISSUER": "iss", "AUDIENCE": "aud"}

    def make(self, **kw):
        base = dict(sub=1, token_type="access", ttl=timedelta(minutes=5), cfg=self.cfg)
        base.update(kw)
        return jwt_core.encode_token(**base)

    def test_round_trip(self):
        claims = jwt_core.decode_token(self.make(extra={"role": "seller"}), expected_type="access", cfg=self.cfg)
        self.assertEqual((claims["sub"], claims["role"], claims["type"]), ("1", "seller", "access"))

    def test_rejects_tampered_expired_wrong_type_and_wrong_audience(self):
        good = self.make()
        with self.assertRaises(jwt_core.TokenError):
            jwt_core.decode_token(good[:-4] + "AAAA", expected_type="access", cfg=self.cfg)
        with self.assertRaises(jwt_core.TokenError):
            jwt_core.decode_token(self.make(ttl=timedelta(seconds=-60)), expected_type="access", cfg=self.cfg)
        with self.assertRaises(jwt_core.TokenError):
            jwt_core.decode_token(good, expected_type="refresh", cfg=self.cfg)
        with self.assertRaises(jwt_core.TokenError):
            jwt_core.decode_token(good, expected_type="access", cfg={**self.cfg, "AUDIENCE": "other"})


class AuthTests(APITestCase):
    def setUp(self):
        cache.clear()  # reset throttle counters

    def register(self, email="cu@example.com", client=None):
        return (client or self.client).post("/api/auth/register/", {"name": "Cu", "email": email, "password": STRONG})

    def test_register_returns_access_jwt_and_httponly_refresh_cookie(self):
        r = self.register("Asha@Example.com")
        self.assertEqual(r.status_code, 201)
        self.assertNotIn("refresh", r.data)  # refresh token is never in the JSON body
        self.assertTrue(r.cookies["mf_refresh"]["httponly"])
        self.assertEqual(r.data["user"]["role"], "customer")
        self.assertTrue(User.objects.filter(email="asha@example.com").exists())
        self.assertEqual(RefreshSession.objects.count(), 1)

    def test_weak_and_duplicate_passwords_rejected(self):
        r = self.client.post("/api/auth/register/", {"name": "A", "email": "a@example.com", "password": "12345678"})
        self.assertEqual(r.status_code, 400)
        self.register("a@example.com")
        self.assertEqual(self.register("A@example.com").status_code, 400)

    def test_portals_are_separate(self):
        self.client.post("/api/seller/auth/register/", {
            "name": "Ravi", "email": "ravi@example.com", "password": STRONG, "store_name": "Ravi Mart"})
        self.register("cu@example.com")
        User.objects.create_superuser("boss@example.com", STRONG, name="Boss")
        creds = lambda e: {"email": e, "password": STRONG}
        self.assertEqual(self.client.post("/api/auth/login/", creds("ravi@example.com")).status_code, 400)
        self.assertEqual(self.client.post("/api/auth/login/", creds("boss@example.com")).status_code, 400)
        self.assertEqual(self.client.post("/api/seller/auth/login/", creds("cu@example.com")).status_code, 400)
        self.assertEqual(self.client.post("/api/admin/auth/login/", creds("ravi@example.com")).status_code, 400)
        self.assertEqual(self.client.post("/api/seller/auth/login/", creds("ravi@example.com")).status_code, 200)
        self.assertEqual(self.client.post("/api/admin/auth/login/", creds("boss@example.com")).status_code, 200)

    def test_me_requires_valid_access_token(self):
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)
        r = self.register()
        c = APIClient()
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")
        self.assertEqual(c.get("/api/auth/me/").data["email"], "cu@example.com")
        c.credentials(HTTP_AUTHORIZATION="Bearer not.a.token")
        self.assertEqual(c.get("/api/auth/me/").status_code, 401)

    def test_refresh_token_cannot_be_used_as_access_token(self):
        self.register()
        refresh = self.client.cookies["mf_refresh"].value
        c = APIClient()
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh}")
        self.assertEqual(c.get("/api/auth/me/").status_code, 401)

    def test_disabled_user_is_locked_out_immediately(self):
        r = self.register()
        User.objects.update(is_active=False)
        c = APIClient()
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")
        self.assertEqual(c.get("/api/auth/me/").status_code, 401)

    def test_refresh_rotates_token_and_logout_revokes_family(self):
        self.register()
        first = self.client.cookies["mf_refresh"].value
        r = self.client.post("/api/auth/refresh/")
        self.assertEqual(r.status_code, 200)
        self.assertNotEqual(self.client.cookies["mf_refresh"].value, first)
        self.client.post("/api/auth/logout/")
        self.assertFalse(RefreshSession.objects.filter(revoked_at__isnull=True).exists())
        self.assertEqual(self.client.post("/api/auth/refresh/").status_code, 401)

    def test_reuse_of_old_refresh_token_revokes_whole_login(self):
        self.register()
        stolen = self.client.cookies["mf_refresh"].value
        self.client.post("/api/auth/refresh/")  # legitimate rotation
        RefreshSession.objects.filter(revoked_at__isnull=False).update(revoked_at=timezone.now() - timedelta(minutes=5))
        attacker = APIClient()
        attacker.cookies["mf_refresh"] = stolen
        self.assertEqual(attacker.post("/api/auth/refresh/").status_code, 401)
        self.assertFalse(RefreshSession.objects.filter(revoked_at__isnull=True).exists())  # victim's token died too

    def test_change_password_signs_out_other_devices(self):
        r = self.register()
        other = APIClient()
        other.post("/api/auth/login/", {"email": "cu@example.com", "password": STRONG})
        c = APIClient()
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")
        new = "An0ther!Passw0rd"
        resp = c.post("/api/auth/change-password/", {"old_password": STRONG, "new_password": new})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(other.post("/api/auth/refresh/").status_code, 401)
