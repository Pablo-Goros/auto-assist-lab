from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import CurrentUser
from app.database import get_db
from app.models import Tenant, UserRole
from app.schemas.tenant import TenantResponse, TenantSelection
from app.schemas.user import UserResponse

router = APIRouter(tags=["tenants"])


@router.get("/tenants", response_model=list[TenantResponse], summary="List available country tenants")
def list_tenants(_: CurrentUser, db: Annotated[Session, Depends(get_db)]) -> list[TenantResponse]:
    return [TenantResponse.model_validate(tenant) for tenant in db.scalars(select(Tenant).order_by(Tenant.code))]


@router.post(
    "/me/tenant",
    response_model=UserResponse,
    summary="Select the authenticated user's country tenant",
    responses={409: {"description": "Tenant is already selected or the account is global"}},
)
def select_tenant(
    payload: TenantSelection,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> UserResponse:
    if current_user.role == UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The configured administrator is global")
    if current_user.tenant_code is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Tenant has already been selected")

    tenant = db.get(Tenant, payload.tenant_code)
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unknown tenant")

    current_user.tenant_code = tenant.code
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)
