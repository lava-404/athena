"""Verifies Privy access tokens sent from the frontend.

Privy issues short-lived ES256 JWTs for each authenticated session. Per
Privy's docs ("Verifying a user's Privy access token"), you can verify these
entirely offline with the per-app verification key from the dashboard
(App settings -> Access Tokens) — no call back to Privy is required per
request. `aud` is your Privy app ID and `iss` is always "privy.io".
"""
from __future__ import annotations

import jwt
from fastapi import HTTPException, WebSocketException, status

from app.config import settings


class AuthError(Exception):
    pass


def verify_privy_token(token: str) -> str:
    """Returns the Privy user id (the `sub` claim) or raises AuthError."""
    if not settings.privy_verification_key or not settings.privy_app_id:
        raise AuthError(
            "Privy is not configured on the backend (PRIVY_APP_ID / "
            "PRIVY_VERIFICATION_KEY missing)."
        )

    try:
        claims = jwt.decode(
            token,
            settings.privy_verification_key,
            algorithms=["ES256"],
            audience=settings.privy_app_id,
            issuer="privy.io",
        )
    except jwt.PyJWTError as exc:
        raise AuthError(f"Invalid Privy token: {exc}") from exc

    user_id = claims.get("sub")
    if not user_id:
        raise AuthError("Privy token missing subject claim")
    return user_id


def require_user_id_http(authorization: str | None) -> str:
    """For regular HTTP routes: pulls `Bearer <token>` from the header."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1]
    try:
        return verify_privy_token(token)
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


def require_user_id_ws(token: str | None) -> str:
    """For the websocket route: token arrives as a query param, since
    websockets can't send custom headers from the browser."""
    if not token:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Missing token")
    try:
        return verify_privy_token(token)
    except AuthError as exc:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason=str(exc)) from exc
