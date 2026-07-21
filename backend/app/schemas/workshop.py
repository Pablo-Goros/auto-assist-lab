from pydantic import BaseModel, ConfigDict


class WorkshopSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    specialty: str


class WorkshopResponse(WorkshopSummary):
    active: bool
