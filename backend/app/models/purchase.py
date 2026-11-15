
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import (
    String,
    ForeignKey,
    Numeric,
    DateTime,
    UniqueConstraint,
    CheckConstraint
)

from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Purchase(Base):

    __tablename__ = "purchases"

    __table_args__ = (
        UniqueConstraint(
            "supplier_id",
            "invoice_number",
            name="uq_purchase_supplier_invoice"
        ),

        CheckConstraint(
            "total_amount >= 0",
            name="check_purchase_total_nonnegative"
        )
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    supplier_id: Mapped[int] = mapped_column(
        ForeignKey("suppliers.id", ondelete="RESTRICT"),
        nullable=False
    )

    invoice_number: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )

    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=0
    )

    status: Mapped[str] = mapped_column(
        String(30), default="RECEIVED"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    items: Mapped[list["PurchaseItem"]] = relationship(
        back_populates="purchase",
        cascade="all, delete-orphan"
    )


class PurchaseItem(Base):

    __tablename__ = "purchase_items"

    __table_args__ = (
        CheckConstraint(
            "quantity > 0",
            name="check_purchase_item_quantity_positive"
        ),

        CheckConstraint(
            "unit_cost >= 0",
            name="check_purchase_item_cost_nonnegative"
        ),

        CheckConstraint(
            "subtotal >= 0",
            name="check_purchase_item_subtotal_nonnegative"
        )
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    purchase_id: Mapped[int] = mapped_column(
        ForeignKey("purchases.id", ondelete="CASCADE"),
        nullable=False
    )

    variant_id: Mapped[int] = mapped_column(
        ForeignKey("product_variants.id", ondelete="RESTRICT"),
        nullable=False
    )

    quantity: Mapped[Decimal] = mapped_column(
        Numeric(12, 3), nullable=False
    )

    unit_cost: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )

    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )

    purchase: Mapped["Purchase"] = relationship(
        back_populates="items"
    )
