from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import UserRole

if TYPE_CHECKING:
    from app.models.service_request import ServiceRequest
    from app.models.tenant import Tenant


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    firebase_uid: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role"), nullable=False)
    tenant_code: Mapped[str | None] = mapped_column(ForeignKey("tenants.code"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (UniqueConstraint("id", "tenant_code", name="uq_users_id_tenant"),)

    tenant: Mapped["Tenant | None"] = relationship(back_populates="users")
    service_requests: Mapped[list["ServiceRequest"]] = relationship(
        back_populates="owner", overlaps="service_requests,tenant"
    )
