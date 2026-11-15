
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict


class PurchaseItemCreate(BaseModel):
    variant_id: int = Field(gt=0)
    quantity: Decimal = Field(gt=0)
    unit_cost: Decimal = Field(ge=0)


class PurchaseCreate(BaseModel):
    supplier_id: int = Field(gt=0)
    invoice_number: str | None = None
    items: list[PurchaseItemCreate] = Field(min_length=1)


class PurchaseItemResponse(BaseModel):
    id: int
    variant_id: int
    quantity: Decimal
    unit_cost: Decimal
    subtotal: Decimal

    model_config = ConfigDict(from_attributes=True)


class PurchaseResponse(BaseModel):
    id: int
    supplier_id: int
    invoice_number: str | None
    total_amount: Decimal
    status: str
    items: list[PurchaseItemResponse]

    model_config = ConfigDict(from_attributes=True)
