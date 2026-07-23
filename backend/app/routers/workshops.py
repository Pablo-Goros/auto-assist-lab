from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import RequireTenantOperator
from app.database import get_db
from app.models import Workshop
from app.schemas.workshop import WorkshopResponse

router = APIRouter(prefix="/workshops", tags=["workshops"])


@router.get(
    "",
    response_model=list[WorkshopResponse],
    summary="List active workshops",
    responses={
        401: {"description": "Missing or invalid authentication token"},
        403: {"description": "Operator role required"},
        409: {"description": "Country tenant selection is required"},
    },
)
def list_active_workshops(
    current_user: RequireTenantOperator,
    db: Annotated[Session, Depends(get_db)],
) -> list[WorkshopResponse]:
    workshops = db.scalars(
        select(Workshop)
        .where(Workshop.active.is_(True), Workshop.tenant_code == current_user.tenant_code)
        .order_by(Workshop.name)
    ).all()
    return [WorkshopResponse.model_validate(workshop) for workshop in workshops]
