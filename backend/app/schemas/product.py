from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict


class ProductVariantCreate(BaseModel):

    brand: str = Field(min_length=1, max_length=100)
    variant_name: str = Field(min_length=1, max_length=100)

    sku: str | None = None
    unit: str = "piece"

    purchase_price: Decimal = Field(ge=0)
    selling_price: Decimal = Field(ge=0)

    current_stock: Decimal = Field(ge=0)
    reorder_level: Decimal = Field(ge=0)
    target_stock: Decimal = Field(ge=0)


class ProductCreate(BaseModel):

    name: str = Field(min_length=1, max_length=150)
    category: str = Field(min_length=1, max_length=100)

    description: str | None = None

    variants: list[ProductVariantCreate] = Field(min_length=1)


class ProductVariantResponse(BaseModel):

    id: int
    brand: str
    variant_name: str
    sku: str | None
    unit: str

    purchase_price: Decimal
    selling_price: Decimal

    current_stock: Decimal
    reorder_level: Decimal
    target_stock: Decimal

    model_config = ConfigDict(from_attributes=True)


class ProductResponse(BaseModel):

    id: int
    name: str
    category: str
    description: str | None

    variants: list[ProductVariantResponse]

    model_config = ConfigDict(from_attributes=True)


class StockAdjustment(BaseModel):

    quantity: Decimal = Field(gt=0)
    movement_type: str
    note: str | None = None