from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models import ServiceRequest, ServiceRequestStatus, Workshop
from app.schemas.service_request import ServiceRequestResponse
from app.services.pubsub import EventPublisher, ServiceRequestAssignedEvent


class AssignmentError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


def assign_workshop_to_request(
    db: Session,
    *,
    request_id: int,
    workshop_id: int,
    publisher: EventPublisher,
) -> ServiceRequest:
    """Assign an active workshop to a service request and publish after commit.

    Repeated assignment: an already ASSIGNED request may be reassigned to another
    active workshop. Status remains ASSIGNED, assigned_workshop_id and assigned_at
    are updated, and a new service_request.assigned event is published.
    """
    service_request = db.scalar(
        select(ServiceRequest)
        .options(joinedload(ServiceRequest.assigned_workshop))
        .where(ServiceRequest.id == request_id)
    )
    if service_request is None:
        raise AssignmentError(status.HTTP_404_NOT_FOUND, "Service request not found")

    workshop = db.get(Workshop, workshop_id)
    if workshop is None:
        raise AssignmentError(status.HTTP_404_NOT_FOUND, "Workshop not found")
    if not workshop.active:
        raise AssignmentError(status.HTTP_400_BAD_REQUEST, "Workshop is inactive")

    assigned_at = datetime.now(UTC)
    service_request.assigned_workshop_id = workshop.id
    service_request.status = ServiceRequestStatus.ASSIGNED
    service_request.assigned_at = assigned_at

    request_id = service_request.id
    db.commit()

    loaded_request = db.scalar(
        select(ServiceRequest)
        .options(joinedload(ServiceRequest.assigned_workshop))
        .where(ServiceRequest.id == request_id)
    )
    if loaded_request is None:
        raise AssignmentError(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to load assigned request")

    try:
        publisher.publish_service_request_assigned(
            ServiceRequestAssignedEvent.create(
                request_id=loaded_request.id,
                owner_id=loaded_request.owner_id,
                workshop_id=workshop.id,
                workshop_name=workshop.name,
                occurred_at=assigned_at,
            )
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to publish assignment event",
        ) from exc

    return loaded_request


def to_service_request_response(service_request: ServiceRequest) -> ServiceRequestResponse:
    return ServiceRequestResponse.model_validate(service_request)
