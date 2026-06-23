import os
from http.cookies import SimpleCookie
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

bearer_scheme = HTTPBearer(auto_error=False)
AUTH_COOKIE_NAME = os.getenv("AUTH_COOKIE_NAME", "nexcart_auth_token")


class AuthenticatedUser(BaseModel):
    user_id: str
    role: str
    wholesaler_id: str | None = None


def _get_jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET")
    if secret:
        return secret

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="AI service JWT validation is not configured",
    )


def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, _get_jwt_secret(), algorithms=["HS256"])
    except jwt.ExpiredSignatureError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired",
        ) from error
    except jwt.InvalidTokenError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        ) from error


def _extract_token_from_cookie(request: Request) -> str | None:
    cookie_header = request.headers.get("cookie", "")
    if not cookie_header:
        return None

    cookie_jar = SimpleCookie()
    cookie_jar.load(cookie_header)
    morsel = cookie_jar.get(AUTH_COOKIE_NAME)
    return morsel.value if morsel else None


def get_current_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> AuthenticatedUser:
    token = None
    if credentials and credentials.scheme.lower() == "bearer":
        token = credentials.credentials
    else:
        token = _extract_token_from_cookie(request)

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    payload = _decode_token(token)
    user_id = str(payload.get("userId") or "").strip()
    role = str(payload.get("role") or "").strip()

    if not user_id or not role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing required claims",
        )

    wholesaler_id = payload.get("wholesalerId")
    return AuthenticatedUser(
        user_id=user_id,
        role=role,
        wholesaler_id=str(wholesaler_id).strip() if wholesaler_id else None,
    )


def require_advisor_user(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> AuthenticatedUser:
    if current_user.role not in {"WHOLESALER", "SUPER_ADMIN"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Advisor access is restricted",
        )

    return current_user


def require_admin_user(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> AuthenticatedUser:
    if current_user.role != "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges are required for document ingestion",
        )

    return current_user
