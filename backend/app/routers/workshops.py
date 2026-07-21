from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import RequireOperator
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
    },
)
def list_active_workshops(
    _: RequireOperator,
    db: Annotated[Session, Depends(get_db)],
) -> list[WorkshopResponse]:
    workshops = db.scalars(
        select(Workshop).where(Workshop.active.is_(True)).order_by(Workshop.name)
    ).all()
    return [WorkshopResponse.model_validate(workshop) for workshop in workshops]
