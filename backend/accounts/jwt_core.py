"""Pure JSON Web Token (RFC 7519) helpers built on PyJWT. No Django imports, so it is easy to unit-test.

Every token we issue carries these claims:
    iss  issuer              aud  audience            sub  user id (string)
    iat  issued-at           exp  expiry              jti  unique token id
    type "access" | "refresh"                          role (access tokens only)

Tokens are signed with HS256 (HMAC-SHA256). On decode we PIN the algorithm (so an attacker
can't switch to "none"), and require/verify exp, iat, iss, aud, sub, jti and type.
"""
import uuid
from datetime import datetime, timedelta, timezone

import jwt

REQUIRED_CLAIMS = ["exp", "iat", "iss", "aud", "sub", "jti", "type"]


class TokenError(Exception):
    """Raised for any invalid, expired, or wrong-type token."""


def new_jti():
    return uuid.uuid4().hex


def encode_token(*, sub, token_type, ttl: timedelta, cfg, extra=None, jti=None, now=None):
    now = now or datetime.now(timezone.utc)
    claims = {
        "iss": cfg["ISSUER"],
        "aud": cfg["AUDIENCE"],
        "sub": str(sub),
        "type": token_type,
        "jti": jti or new_jti(),
        "iat": now,
        "exp": now + ttl,
    }
    if extra:
        claims.update(extra)
    return jwt.encode(claims, cfg["SECRET"], algorithm=cfg["ALGORITHM"])


def decode_token(token, *, expected_type, cfg):
    try:
        claims = jwt.decode(
            token,
            cfg["SECRET"],
            algorithms=[cfg["ALGORITHM"]],  # pinned: never trust the algorithm named in the token header
            audience=cfg["AUDIENCE"],
            issuer=cfg["ISSUER"],
            leeway=10,  # seconds of clock-skew tolerance
            options={"require": REQUIRED_CLAIMS},
        )
    except jwt.ExpiredSignatureError:
        raise TokenError("Token has expired.")
    except jwt.InvalidTokenError:
        raise TokenError("Invalid token.")
    if claims.get("type") != expected_type:
        raise TokenError("Wrong token type.")
    return claims
