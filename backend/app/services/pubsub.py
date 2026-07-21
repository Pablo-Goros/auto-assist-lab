from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Protocol


@dataclass(frozen=True, slots=True)
class ServiceRequestAssignedEvent:
    event_type: str
    request_id: int
    owner_id: int
    workshop_id: int
    workshop_name: str
    occurred_at: datetime

    @classmethod
    def create(
        cls,
        *,
        request_id: int,
        owner_id: int,
        workshop_id: int,
        workshop_name: str,
        occurred_at: datetime | None = None,
    ) -> "ServiceRequestAssignedEvent":
        timestamp = occurred_at or datetime.now(UTC)
        return cls(
            event_type="service_request.assigned",
            request_id=request_id,
            owner_id=owner_id,
            workshop_id=workshop_id,
            workshop_name=workshop_name,
            occurred_at=timestamp,
        )

    def to_payload(self) -> dict[str, object]:
        return {
            "event_type": self.event_type,
            "request_id": self.request_id,
            "owner_id": self.owner_id,
            "workshop_id": self.workshop_id,
            "workshop_name": self.workshop_name,
            "occurred_at": self.occurred_at.isoformat().replace("+00:00", "Z"),
        }


class EventPublisher(Protocol):
    def publish_service_request_assigned(self, event: ServiceRequestAssignedEvent) -> None:
        """Publish a service_request.assigned event after the assignment transaction commits."""


class LoggingEventPublisher:
    """Phase 3 publisher: logs the serialized event. Phase 6 adds Google Cloud Pub/Sub."""

    def publish_service_request_assigned(self, event: ServiceRequestAssignedEvent) -> None:
        import logging

        logger = logging.getLogger(__name__)
        logger.info("Published event: %s", event.to_payload())


_event_publisher: EventPublisher = LoggingEventPublisher()


def get_event_publisher() -> EventPublisher:
    return _event_publisher


def set_event_publisher(publisher: EventPublisher) -> None:
    global _event_publisher
    _event_publisher = publisher


def reset_event_publisher() -> None:
    set_event_publisher(LoggingEventPublisher())
