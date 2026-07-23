from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.auth import RequireTenantOperator
from app.database import get_db
from app.models import ServiceRequest, Workshop
from app.schemas.service_request import (
    AssignWorkshopRequest,
    OperatorServiceRequestResponse,
    ServiceRequestResponse,
)
from app.services.assignment import AssignmentError, assign_workshop_to_request, to_service_request_response
from app.services.pubsub import EventPublisher, get_event_publisher

router = APIRouter(prefix="/operator", tags=["operator"])


@router.get(
    "/service-requests",
    response_model=list[OperatorServiceRequestResponse],
    summary="List all service requests for operators",
    responses={
        401: {"description": "Missing or invalid authentication token"},
        403: {"description": "Operator role required"},
        409: {"description": "Country tenant selection is required"},
    },
)
def list_operator_service_requests(
    current_user: RequireTenantOperator,
    db: Annotated[Session, Depends(get_db)],
) -> list[OperatorServiceRequestResponse]:
    requests = db.scalars(
        select(ServiceRequest)
        .options(
            joinedload(ServiceRequest.owner),
            joinedload(ServiceRequest.assigned_workshop),
        )
        .where(ServiceRequest.tenant_code == current_user.tenant_code)
        .order_by(ServiceRequest.created_at.desc())
    ).all()
    return [OperatorServiceRequestResponse.model_validate(request) for request in requests]


@router.post(
    "/service-requests/{request_id}/assign",
    response_model=ServiceRequestResponse,
    summary="Assign an active workshop to a service request",
    description=(
        "Assigns a workshop, sets status to ASSIGNED, and publishes "
        "service_request.assigned after the database transaction commits. "
        "Reassigning an already assigned request updates the workshop and "
        "assigned_at and publishes a new event."
    ),
    responses={
        400: {"description": "Workshop is inactive"},
        401: {"description": "Missing or invalid authentication token"},
        403: {"description": "Operator role required"},
        409: {"description": "Country tenant selection is required"},
        404: {"description": "Service request or workshop not found"},
        500: {"description": "Assignment persisted but event publication failed"},
    },
)
def assign_service_request(
    request_id: int,
    payload: AssignWorkshopRequest,
    current_user: RequireTenantOperator,
    db: Annotated[Session, Depends(get_db)],
    publisher: Annotated[EventPublisher, Depends(get_event_publisher)],
) -> ServiceRequestResponse:
    try:
        service_request = assign_workshop_to_request(
            db,
            request_id=request_id,
            workshop_id=payload.workshop_id,
            tenant_code=current_user.tenant_code,
            publisher=publisher,
        )
    except AssignmentError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    return to_service_request_response(service_request)
