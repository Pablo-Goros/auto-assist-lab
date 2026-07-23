from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.service_request import ServiceRequest
    from app.models.tenant import Tenant


class Workshop(Base):
    __tablename__ = "workshops"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    specialty: Mapped[str] = mapped_column(String(255), nullable=False)
    tenant_code: Mapped[str] = mapped_column(ForeignKey("tenants.code"), nullable=False, index=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (UniqueConstraint("id", "tenant_code", name="uq_workshops_id_tenant"),)

    tenant: Mapped["Tenant"] = relationship(back_populates="workshops")
    service_requests: Mapped[list["ServiceRequest"]] = relationship(
        back_populates="assigned_workshop", overlaps="service_requests,tenant"
    )
