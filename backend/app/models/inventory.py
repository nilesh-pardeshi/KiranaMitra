
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import (
    String,
    ForeignKey,
    Numeric,
    DateTime,
    CheckConstraint
)

from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class StockMovement(Base):

    __tablename__ = "stock_movements"

    __table_args__ = (
        CheckConstraint(
            "movement_type IN ('IN', 'OUT', 'ADJUSTMENT')",
            name="check_movement_type"
        ),

        CheckConstraint(
            "quantity > 0",
            name="check_stock_movement_quantity_positive"
        )
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    variant_id: Mapped[int] = mapped_column(
        ForeignKey("product_variants.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )

    movement_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )

    quantity: Mapped[Decimal] = mapped_column(
        Numeric(12, 3), nullable=False
    )

    reference_type: Mapped[str | None] = mapped_column(
        String(30), nullable=True
    )

    reference_id: Mapped[int | None] = mapped_column(
        nullable=True
    )

    note: Mapped[str | None] = mapped_column(
        String(300), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    variant: Mapped["ProductVariant"] = relationship()
