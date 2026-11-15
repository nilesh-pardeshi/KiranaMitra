
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import (
    String,
    ForeignKey,
    Numeric,
    Boolean,
    DateTime,
    UniqueConstraint,
    CheckConstraint
)

from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Product(Base):

    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(
        String(150), nullable=False, index=True
    )

    category: Mapped[str] = mapped_column(
        String(100), nullable=False
    )

    description: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    variants: Mapped[list["ProductVariant"]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan"
    )


class ProductVariant(Base):

    __tablename__ = "product_variants"

    __table_args__ = (
        UniqueConstraint(
            "product_id",
            "brand",
            "variant_name",
            name="uq_product_brand_variant"
        ),

        CheckConstraint(
            "purchase_price >= 0",
            name="check_variant_purchase_price_nonnegative"
        ),

        CheckConstraint(
            "selling_price >= 0",
            name="check_variant_selling_price_nonnegative"
        ),

        CheckConstraint(
            "current_stock >= 0",
            name="check_variant_stock_nonnegative"
        ),

        CheckConstraint(
            "reorder_level >= 0",
            name="check_variant_reorder_nonnegative"
        ),

        CheckConstraint(
            "target_stock >= 0",
            name="check_variant_target_nonnegative"
        )
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )

    brand: Mapped[str] = mapped_column(
        String(100), nullable=False
    )

    variant_name: Mapped[str] = mapped_column(
        String(100), nullable=False
    )

    sku: Mapped[str | None] = mapped_column(
        String(50), unique=True, nullable=True
    )

    unit: Mapped[str] = mapped_column(
        String(30), nullable=False
    )

    purchase_price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )

    selling_price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )

    current_stock: Mapped[Decimal] = mapped_column(
        Numeric(12, 3), default=0, nullable=False
    )

    reorder_level: Mapped[Decimal] = mapped_column(
        Numeric(12, 3), default=0, nullable=False
    )

    target_stock: Mapped[Decimal] = mapped_column(
        Numeric(12, 3), default=0, nullable=False
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True
    )

    product: Mapped["Product"] = relationship(
        back_populates="variants"
    )
