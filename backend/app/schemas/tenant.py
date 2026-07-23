from pydantic import BaseModel, ConfigDict, Field


class TenantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str
    name: str


class TenantSelection(BaseModel):
    tenant_code: str = Field(min_length=2, max_length=2, pattern=r"^[A-Z]{2}$")
