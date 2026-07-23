from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, ForeignKeyConstraint, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import ProblemType, ServiceRequestStatus

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.workshop import Workshop
    from app.models.tenant import Tenant


class ServiceRequest(Base):
    __tablename__ = "service_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(nullable=False, index=True)
    tenant_code: Mapped[str] = mapped_column(ForeignKey("tenants.code"), nullable=False, index=True)
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
        nullable=True,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    assigned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        ForeignKeyConstraint(
            ["owner_id", "tenant_code"],
            ["users.id", "users.tenant_code"],
            name="fk_service_requests_owner_tenant",
        ),
        ForeignKeyConstraint(
            ["assigned_workshop_id", "tenant_code"],
            ["workshops.id", "workshops.tenant_code"],
            name="fk_service_requests_workshop_tenant",
        ),
    )

    tenant: Mapped["Tenant"] = relationship(back_populates="service_requests")
    owner: Mapped["User"] = relationship(back_populates="service_requests", foreign_keys=[owner_id])
    assigned_workshop: Mapped["Workshop | None"] = relationship(
        back_populates="service_requests", foreign_keys=[assigned_workshop_id]
    )
