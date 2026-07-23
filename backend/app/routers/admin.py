from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import exists, select
from sqlalchemy.orm import Session

from app.auth import RequireAdmin
from app.config import settings
from app.database import get_db
from app.models import ServiceRequest, Tenant, User, UserRole
from app.schemas.tenant import TenantSelection
from app.schemas.user import UserResponse, UserRoleUpdate

router = APIRouter(prefix="/admin/users", tags=["admin"])


@router.get("", response_model=list[UserResponse], summary="List registered users")
def list_users(_: RequireAdmin, db: Annotated[Session, Depends(get_db)]) -> list[UserResponse]:
    users = db.scalars(
        select(User).where(User.role != UserRole.ADMIN).order_by(User.created_at, User.id)
    ).all()
    return [UserResponse.model_validate(user) for user in users]


@router.patch("/{user_id}/role", response_model=UserResponse, summary="Change a user's OWNER or OPERATOR role")
def update_user_role(
    user_id: int,
    payload: UserRoleUpdate,
    _: RequireAdmin,
    db: Annotated[Session, Depends(get_db)],
) -> UserResponse:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.firebase_uid == settings.admin_firebase_uid.strip():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The configured administrator role cannot be changed",
        )

    user.role = payload.role
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


@router.patch(
    "/{user_id}/tenant",
    response_model=UserResponse,
    summary="Correct a user's country tenant",
    responses={
        404: {"description": "User not found"},
        409: {"description": "Administrator account or service-request history prevents correction"},
    },
)
def correct_user_tenant(
    user_id: int,
    payload: TenantSelection,
    _: RequireAdmin,
    db: Annotated[Session, Depends(get_db)],
) -> UserResponse:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.role == UserRole.ADMIN or user.firebase_uid == settings.admin_firebase_uid.strip():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The configured administrator is global")
    if db.scalar(select(exists().where(ServiceRequest.owner_id == user.id))):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tenant cannot be changed after a service request has been created",
        )
    tenant = db.get(Tenant, payload.tenant_code)
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unknown tenant")

    user.tenant_code = tenant.code
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)
