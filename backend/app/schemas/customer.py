
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class CustomerCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    phone: str | None = None
    address: str | None = None


class CustomerResponse(BaseModel):
    id: int
    name: str
    phone: str | None
    address: str | None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class UdharCreate(BaseModel):
    amount: Decimal = Field(gt=0)
    description: str | None = None


class RepaymentCreate(BaseModel):
    amount: Decimal = Field(gt=0)
    payment_method: Literal["CASH", "UPI", "CARD", "OTHER"] = "CASH"
    reference_number: str | None = None


class LedgerEntryResponse(BaseModel):
    id: int
    entry_type: str
    amount: Decimal
    description: str | None
    created_at: object

    model_config = ConfigDict(from_attributes=True)
