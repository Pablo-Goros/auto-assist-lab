from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.auth import RequireTenantOwner
from app.database import get_db
from app.models import ServiceRequest, ServiceRequestStatus
from app.schemas.service_request import ServiceRequestCreate, ServiceRequestResponse
from app.services.assignment import to_service_request_response

router = APIRouter(prefix="/service-requests", tags=["service-requests"])


@router.post(
    "",
    response_model=ServiceRequestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a service request",
    responses={
        401: {"description": "Missing or invalid authentication token"},
        403: {"description": "Owner role required"},
        409: {"description": "Country tenant selection is required"},
        422: {"description": "Invalid request body"},
    },
)
def create_service_request(
    payload: ServiceRequestCreate,
    current_user: RequireTenantOwner,
    db: Annotated[Session, Depends(get_db)],
) -> ServiceRequestResponse:
    service_request = ServiceRequest(
        owner_id=current_user.id,
        tenant_code=current_user.tenant_code,
        vehicle=payload.vehicle,
        problem_type=payload.problem_type,
        description=payload.description,
        status=ServiceRequestStatus.PENDING,
    )
    db.add(service_request)
    db.commit()
    db.refresh(service_request)
    return to_service_request_response(service_request)


@router.get(
    "/me",
    response_model=list[ServiceRequestResponse],
    summary="List the authenticated owner's service requests",
    responses={
        401: {"description": "Missing or invalid authentication token"},
        403: {"description": "Owner role required"},
        409: {"description": "Country tenant selection is required"},
    },
)
def list_my_service_requests(
    current_user: RequireTenantOwner,
    db: Annotated[Session, Depends(get_db)],
) -> list[ServiceRequestResponse]:
    requests = db.scalars(
        select(ServiceRequest)
        .options(joinedload(ServiceRequest.assigned_workshop))
        .where(
            ServiceRequest.owner_id == current_user.id,
            ServiceRequest.tenant_code == current_user.tenant_code,
        )
        .order_by(ServiceRequest.created_at.desc())
    ).all()
    return [to_service_request_response(request) for request in requests]
