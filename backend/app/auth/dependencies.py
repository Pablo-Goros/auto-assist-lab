from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.provider import AuthProvider, FirebaseAuthProvider, StubAuthProvider
from app.config import settings
from app.database import get_db
from app.models import User, UserRole

_bearer_scheme = HTTPBearer(auto_error=False)
_auth_provider: AuthProvider = FirebaseAuthProvider(
    project_id=settings.firebase_project_id,
    credential_path=settings.firebase_credentials_path,
)


def get_auth_provider() -> AuthProvider:
    return _auth_provider


def set_auth_provider(provider: AuthProvider) -> None:
    global _auth_provider
    _auth_provider = provider


def reset_auth_provider() -> None:
    """Restore the credential-free provider used by the test suite."""
    set_auth_provider(StubAuthProvider())


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
    auth_provider: Annotated[AuthProvider, Depends(get_auth_provider)],
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized("Missing authentication token")

    try:
        identity = auth_provider.verify_token(credentials.credentials)
    except ValueError as exc:
        raise _unauthorized("Invalid authentication token") from exc

    if not identity.email:
        raise _unauthorized("Authenticated identity is missing an email address")

    configured_admin_uid = settings.admin_firebase_uid.strip()
    user = db.scalar(select(User).where(User.firebase_uid == identity.firebase_uid))
    if user is None:
        user = User(
            firebase_uid=identity.firebase_uid,
            email=identity.email,
            name=identity.name or identity.email,
            role=(
                UserRole.ADMIN
                if identity.firebase_uid == configured_admin_uid and configured_admin_uid
                else UserRole.OWNER
            ),
            tenant_code=None,
        )
        db.add(user)
    else:
        # The configured UID is the sole authority for ADMIN; all managed
        # OWNER/OPERATOR assignments otherwise remain intact until an
        # administrator changes them. Existing profile details are retained.
        if identity.firebase_uid == configured_admin_uid and configured_admin_uid:
            user.role = UserRole.ADMIN
            user.tenant_code = None
        elif user.role == UserRole.ADMIN:
            user.role = UserRole.OWNER

    db.commit()
    db.refresh(user)

    return user


def require_role(required_role: UserRole) -> Callable[..., User]:
    def dependency(current_user: Annotated[User, Depends(get_current_user)]) -> User:
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user

    return dependency


def require_tenant_role(required_role: UserRole) -> Callable[..., User]:
    def dependency(current_user: Annotated[User, Depends(require_role(required_role))]) -> User:
        if current_user.tenant_code is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Select a country tenant before using this endpoint",
            )
        return current_user

    return dependency


RequireOwner = Annotated[User, Depends(require_role(UserRole.OWNER))]
RequireOperator = Annotated[User, Depends(require_role(UserRole.OPERATOR))]
RequireAdmin = Annotated[User, Depends(require_role(UserRole.ADMIN))]
RequireTenantOwner = Annotated[User, Depends(require_tenant_role(UserRole.OWNER))]
RequireTenantOperator = Annotated[User, Depends(require_tenant_role(UserRole.OPERATOR))]
CurrentUser = Annotated[User, Depends(get_current_user)]
