from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import (
    ChangePasswordSerializer, CustomerLoginSerializer, CustomerRegisterSerializer,
    PasswordResetConfirmSerializer, PasswordResetRequestSerializer, ProfileUpdateSerializer,
    SellerLoginSerializer, SellerRegisterSerializer, UserSerializer,
)


# ---------- helpers ----------
def set_refresh_cookie(response, refresh):
    response.set_cookie(
        settings.REFRESH_COOKIE_NAME,
        str(refresh),
        max_age=int(refresh.lifetime.total_seconds()),
        httponly=True,
        secure=settings.REFRESH_COOKIE_SECURE,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
        path=settings.REFRESH_COOKIE_PATH,
    )


def clear_refresh_cookie(response):
    response.delete_cookie(
        settings.REFRESH_COOKIE_NAME, path=settings.REFRESH_COOKIE_PATH, samesite=settings.REFRESH_COOKIE_SAMESITE
    )


def origin_allowed(request):
    """Cookie-based endpoints only accept requests from our own frontend (CSRF defence in depth)."""
    origin = request.headers.get("Origin")
    if not origin:
        return True
    allowed = set(settings.CORS_ALLOWED_ORIGINS) | {settings.FRONTEND_URL}
    return origin in allowed or origin == request.build_absolute_uri("/").rstrip("/")


def token_response(user, http_status=status.HTTP_200_OK):
    refresh = RefreshToken.for_user(user)
    resp = Response({"access": str(refresh.access_token), "user": UserSerializer(user).data}, status=http_status)
    set_refresh_cookie(resp, refresh)
    return resp


class AuthThrottledView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"
    authentication_classes = []


# ---------- register / login ----------
class CustomerRegisterView(AuthThrottledView):
    def post(self, request):
        s = CustomerRegisterSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return token_response(s.save(), status.HTTP_201_CREATED)


class CustomerLoginView(AuthThrottledView):
    serializer_class = CustomerLoginSerializer

    def post(self, request):
        s = self.serializer_class(data=request.data, context={"request": request})
        s.is_valid(raise_exception=True)
        return token_response(s.validated_data["user"])


class SellerRegisterView(AuthThrottledView):
    def post(self, request):
        s = SellerRegisterSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return token_response(s.save(), status.HTTP_201_CREATED)


class SellerLoginView(CustomerLoginView):
    serializer_class = SellerLoginSerializer


# ---------- token refresh / logout ----------
class RefreshView(AuthThrottledView):
    throttle_scope = "auth"

    def post(self, request):
        if not origin_allowed(request):
            return Response({"detail": "Origin not allowed."}, status=status.HTTP_403_FORBIDDEN)
        raw = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)
        if not raw:
            return Response({"detail": "Not signed in."}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            old = RefreshToken(raw)
            user = User.objects.get(pk=old["user_id"], is_active=True)
            old.blacklist()
        except (TokenError, User.DoesNotExist, KeyError):
            resp = Response({"detail": "Session expired."}, status=status.HTTP_401_UNAUTHORIZED)
            clear_refresh_cookie(resp)
            return resp
        return token_response(user)


class LogoutView(AuthThrottledView):
    def post(self, request):
        if not origin_allowed(request):
            return Response({"detail": "Origin not allowed."}, status=status.HTTP_403_FORBIDDEN)
        raw = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)
        if raw:
            try:
                RefreshToken(raw).blacklist()
            except TokenError:
                pass
        resp = Response(status=status.HTTP_204_NO_CONTENT)
        clear_refresh_cookie(resp)
        return resp


# ---------- profile ----------
class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        s = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(UserSerializer(request.user).data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        s = ChangePasswordSerializer(data=request.data, context={"request": request})
        s.is_valid(raise_exception=True)
        request.user.set_password(s.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        return Response({"detail": "Password updated. Please sign in again on other devices."})


# ---------- password reset ----------
class PasswordResetRequestView(AuthThrottledView):
    def post(self, request):
        s = PasswordResetRequestSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = User.objects.filter(email__iexact=s.validated_data["email"], is_active=True).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            path = "/seller/reset-password" if user.role == User.Role.SELLER else "/reset-password"
            link = f"{settings.FRONTEND_URL}{path}?uid={uid}&token={token}"
            send_mail(
                "Reset your MandiFresh password",
                f"Hi {user.name},\n\nUse the link below to set a new password (valid for 1 hour):\n{link}\n\n"
                "If you did not request this, you can ignore this email.",
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=True,
            )
        # Always the same answer, whether or not the account exists.
        return Response({"detail": "If that email is registered, a reset link has been sent."})


class PasswordResetConfirmView(AuthThrottledView):
    def post(self, request):
        s = PasswordResetConfirmSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        try:
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(d["uid"])))
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            user = None
        if user is None or not default_token_generator.check_token(user, d["token"]):
            return Response({"detail": "This reset link is invalid or has expired."}, status=400)
        try:
            validate_password(d["new_password"], user=user)
        except Exception as exc:
            return Response({"new_password": list(getattr(exc, "messages", [str(exc)]))}, status=400)
        user.set_password(d["new_password"])
        user.save(update_fields=["password"])
        return Response({"detail": "Password has been reset. You can sign in now."})
