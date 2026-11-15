
from pydantic import BaseModel, Field, ConfigDict


class SupplierCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    phone: str | None = None
    address: str | None = None


class SupplierResponse(BaseModel):
    id: int
    name: str
    phone: str | None
    address: str | None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
