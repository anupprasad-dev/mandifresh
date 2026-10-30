from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed

from .jwt_core import TokenError
from .models import User
from .tokens import verify_access_token


class JWTAuthentication(BaseAuthentication):
    """Authenticates `Authorization: Bearer <access JWT>` requests.

    The signature, expiry, issuer, audience and token type are verified, then the user is
    loaded from the database so disabled accounts and role changes take effect immediately.
    """

    def authenticate(self, request):
        parts = get_authorization_header(request).split()
        if not parts or parts[0].lower() != b"bearer":
            return None
        if len(parts) != 2:
            raise AuthenticationFailed("Invalid Authorization header.")
        try:
            claims = verify_access_token(parts[1].decode())
        except (TokenError, UnicodeError) as exc:
            raise AuthenticationFailed(str(exc))
        user = User.objects.filter(pk=claims["sub"], is_active=True).select_related("seller_profile").first()
        if user is None:
            raise AuthenticationFailed("User not found or disabled.")
        if user.role != claims.get("role"):
            raise AuthenticationFailed("Your role changed. Please sign in again.")
        return user, claims

    def authenticate_header(self, request):
        return 'Bearer realm="mandifresh"'
