from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import RequireAdmin
from app.config import settings
from app.database import get_db
from app.models import User, UserRole
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
