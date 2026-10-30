"""JWT access tokens + rotating, database-backed refresh tokens.

Access token  : short-lived (15 min) JWT, sent as `Authorization: Bearer`, kept in browser memory.
Refresh token : long-lived (7 days) JWT, stored in an httpOnly cookie. Every use ROTATES it:
                the old one is revoked and a new one issued. Presenting an already-used token
                (a sign of theft) revokes the whole login family.
"""
import ipaddress
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .jwt_core import TokenError, decode_token, encode_token, new_jti
from .models import RefreshSession

REUSE_GRACE = timedelta(seconds=15)  # tolerate two browser tabs refreshing at the same moment


def _cfg():
    return settings.JWT


def create_access_token(user):
    return encode_token(
        sub=user.pk, token_type="access", ttl=_cfg()["ACCESS_TTL"], cfg=_cfg(), extra={"role": user.role}
    )


def verify_access_token(token):
    return decode_token(token, expected_type="access", cfg=_cfg())


def _client_info(request):
    if request is None:
        return "", None
    ua = request.META.get("HTTP_USER_AGENT", "")[:200]
    fwd = request.META.get("HTTP_X_FORWARDED_FOR", "")
    candidate = (fwd.split(",")[0].strip() if fwd else request.META.get("REMOTE_ADDR")) or ""
    try:
        ip = str(ipaddress.ip_address(candidate))
    except ValueError:  # missing or malformed header
        ip = None
    return ua, ip


def _new_session(user, family, request):
    jti = new_jti()
    ttl = _cfg()["REFRESH_TTL"]
    token = encode_token(sub=user.pk, token_type="refresh", ttl=ttl, cfg=_cfg(), jti=jti)
    ua, ip = _client_info(request)
    RefreshSession.objects.create(
        jti=jti, family=family or new_jti(), user=user, expires_at=timezone.now() + ttl, user_agent=ua, ip=ip
    )
    return token


def issue_refresh_token(user, request=None):
    """Start a new login family and return the refresh JWT."""
    return _new_session(user, None, request)


def rotate_refresh_token(raw, request=None):
    """Validate `raw`, revoke it, and return (user, new_refresh_token). Raises TokenError."""
    claims = decode_token(raw, expected_type="refresh", cfg=_cfg())
    now = timezone.now()
    reuse = False
    with transaction.atomic():
        session = RefreshSession.objects.select_for_update().select_related("user").filter(jti=claims["jti"]).first()
        if session is None or session.expires_at <= now or str(session.user_id) != claims["sub"]:
            raise TokenError("Session expired.")
        if session.revoked_at is not None:
            if now - session.revoked_at > REUSE_GRACE:
                RefreshSession.objects.filter(family=session.family, revoked_at__isnull=True).update(revoked_at=now)
                reuse = True
            else:
                raise TokenError("Token already used.")
        else:
            if not session.user.is_active:
                raise TokenError("Account disabled.")
            new_token = _new_session(session.user, session.family, request)
            new_jti_value = decode_token(new_token, expected_type="refresh", cfg=_cfg())["jti"]
            session.revoked_at = now
            session.replaced_by = new_jti_value
            session.save(update_fields=["revoked_at", "replaced_by"])
            return session.user, new_token
    if reuse:  # the family was revoked above and committed
        raise TokenError("Refresh token reuse detected. Please sign in again.")
    raise TokenError("Session expired.")


def revoke_family_of(raw):
    """Log out one device: revoke every token in the family of `raw` (ignores invalid tokens)."""
    try:
        claims = decode_token(raw, expected_type="refresh", cfg=_cfg())
    except TokenError:
        return
    session = RefreshSession.objects.filter(jti=claims["jti"]).first()
    if session:
        RefreshSession.objects.filter(family=session.family, revoked_at__isnull=True).update(revoked_at=timezone.now())


def revoke_all_for_user(user):
    """Log out everywhere (password change/reset, account disabled)."""
    RefreshSession.objects.filter(user=user, revoked_at__isnull=True).update(revoked_at=timezone.now())
