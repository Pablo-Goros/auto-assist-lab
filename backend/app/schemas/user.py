from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import UserRole
from app.schemas.tenant import TenantResponse


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    firebase_uid: str
    email: str
    name: str
    role: UserRole
    tenant: TenantResponse | None


class OwnerSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str


class UserRoleUpdate(BaseModel):
    role: Literal[UserRole.OWNER, UserRole.OPERATOR]
