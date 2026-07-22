from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import UserRole


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    firebase_uid: str
    email: str
    name: str
    role: UserRole


class OwnerSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str


class UserRoleUpdate(BaseModel):
    role: Literal[UserRole.OWNER, UserRole.OPERATOR]
