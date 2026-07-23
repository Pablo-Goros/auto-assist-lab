from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ProblemType, ServiceRequestStatus
from app.schemas.user import OwnerSummary
from app.schemas.workshop import WorkshopSummary


class ServiceRequestCreate(BaseModel):
    vehicle: str = Field(min_length=1, max_length=255)
    problem_type: ProblemType
    description: str = Field(min_length=1, max_length=1000)


class ServiceRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vehicle: str
    problem_type: ProblemType
    description: str
    status: ServiceRequestStatus
    assigned_workshop: WorkshopSummary | None
    created_at: datetime
    assigned_at: datetime | None


class OperatorServiceRequestResponse(ServiceRequestResponse):
    owner: OwnerSummary


class AssignWorkshopRequest(BaseModel):
    workshop_id: int = Field(gt=0)
