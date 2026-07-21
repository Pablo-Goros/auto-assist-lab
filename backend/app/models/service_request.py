from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import ProblemType, ServiceRequestStatus

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.workshop import Workshop


class ServiceRequest(Base):
    __tablename__ = "service_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    vehicle: Mapped[str] = mapped_column(String(255), nullable=False)
    problem_type: Mapped[ProblemType] = mapped_column(Enum(ProblemType, name="problem_type"), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[ServiceRequestStatus] = mapped_column(
        Enum(ServiceRequestStatus, name="service_request_status"),
        nullable=False,
        default=ServiceRequestStatus.PENDING,
        server_default=ServiceRequestStatus.PENDING.value,
    )
    assigned_workshop_id: Mapped[int | None] = mapped_column(
        ForeignKey("workshops.id"),
        nullable=True,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    assigned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    owner: Mapped["User"] = relationship(back_populates="service_requests")
    assigned_workshop: Mapped["Workshop | None"] = relationship(back_populates="service_requests")
