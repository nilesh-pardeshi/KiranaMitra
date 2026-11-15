
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class SaleItemCreate(BaseModel):
    variant_id: int = Field(gt=0)
    quantity: Decimal = Field(gt=0)


class SaleCreate(BaseModel):
    customer_id: int | None = Field(default=None, gt=0)
    discount: Decimal = Field(default=Decimal("0"), ge=0)
    paid_amount: Decimal = Field(default=Decimal("0"), ge=0)
    payment_method: Literal["CASH", "UPI", "CARD", "OTHER"] | None = None
    reference_number: str | None = None
    items: list[SaleItemCreate] = Field(min_length=1)


class SaleItemResponse(BaseModel):
    id: int
    variant_id: int
    quantity: Decimal
    unit_price: Decimal
    subtotal: Decimal

    model_config = ConfigDict(from_attributes=True)



class SaleResponse(BaseModel):
    id: int
    invoice_number: str
    customer_id: int | None

    subtotal: Decimal
    discount: Decimal
    total_amount: Decimal

    # Original payment information at billing time
    paid_amount: Decimal
    payment_status: str

    # Current payment information after repayments
    current_outstanding: Decimal
    current_paid_amount: Decimal
    current_payment_status: Literal["PAID", "PARTIAL", "UNPAID"]

    created_at: datetime
    items: list[SaleItemResponse]

    model_config = ConfigDict(from_attributes=True)
