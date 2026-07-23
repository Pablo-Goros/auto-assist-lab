from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.service_request import ServiceRequest
    from app.models.user import User
    from app.models.workshop import Workshop


class Tenant(Base):
    __tablename__ = "tenants"

    code: Mapped[str] = mapped_column(String(2), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)

    users: Mapped[list["User"]] = relationship(back_populates="tenant")
    workshops: Mapped[list["Workshop"]] = relationship(back_populates="tenant")
    service_requests: Mapped[list["ServiceRequest"]] = relationship(back_populates="tenant")
