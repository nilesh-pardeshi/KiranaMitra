
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    Numeric,
    DateTime,
    CheckConstraint
)

from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Sale(Base):

    __tablename__ = "sales"

    __table_args__ = (
        CheckConstraint(
            "subtotal >= 0",
            name="check_sale_subtotal_nonnegative"
        ),

        CheckConstraint(
            "discount >= 0 AND discount <= subtotal",
            name="check_sale_discount_valid"
        ),

        CheckConstraint(
            "total_amount >= 0 AND total_amount <= subtotal",
            name="check_sale_total_valid"
        ),

        CheckConstraint(
            "paid_amount >= 0 AND paid_amount <= total_amount",
            name="check_sale_paid_amount_valid"
        ),

        CheckConstraint(
            "payment_status IN ('PAID', 'PARTIAL', 'UNPAID')",
            name="check_sale_payment_status"
        )
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    invoice_number: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False
    )

    customer_id: Mapped[int | None] = mapped_column(
        ForeignKey("customers.id", ondelete="RESTRICT"),
        nullable=True,
        index=True
    )

    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )

    discount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=0
    )

    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )

    paid_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=0
    )

    payment_status: Mapped[str] = mapped_column(
        String(20), default="UNPAID"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    items: Mapped[list["SaleItem"]] = relationship(
        back_populates="sale",
        cascade="all, delete-orphan"
    )

    customer: Mapped["Customer"] = relationship()


class SaleItem(Base):

    __tablename__ = "sale_items"

    __table_args__ = (
        CheckConstraint(
            "quantity > 0",
            name="check_sale_item_quantity_positive"
        ),

        CheckConstraint(
            "unit_price >= 0",
            name="check_sale_item_price_nonnegative"
        ),

        CheckConstraint(
            "unit_cost >= 0",
            name="check_sale_item_cost_nonnegative"
        ),

        CheckConstraint(
            "subtotal >= 0",
            name="check_sale_item_subtotal_nonnegative"
        )
    )

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    sale_id = Column(
        Integer,
        ForeignKey("sales.id"),
        nullable=False
    )

    variant_id = Column(
        Integer,
        ForeignKey("product_variants.id"),
        nullable=False
    )

    # Supports fractional quantities such as 0.500 kg
    quantity = Column(
        Numeric(12, 3),
        nullable=False
    )

    unit_price = Column(
        Numeric(10, 2),
        nullable=False
    )

    unit_cost = Column(
        Numeric(10, 2),
        nullable=False,
        default=0
    )

    subtotal = Column(
        Numeric(10, 2),
        nullable=False
    )

    sale = relationship(
        "Sale",
        back_populates="items"
    )

    variant = relationship(
        "ProductVariant"
    )


class Payment(Base):

    __tablename__ = "payments"

    __table_args__ = (
        CheckConstraint(
            "amount > 0",
            name="check_payment_amount_positive"
        ),

        CheckConstraint(
            "payment_method IN ('CASH', 'UPI', 'CARD', 'OTHER')",
            name="check_payment_method"
        )
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    sale_id: Mapped[int | None] = mapped_column(
        ForeignKey("sales.id", ondelete="RESTRICT"),
        nullable=True,
        index=True
    )

    customer_id: Mapped[int | None] = mapped_column(
        ForeignKey("customers.id", ondelete="RESTRICT"),
        nullable=True,
        index=True
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )

    payment_method: Mapped[str] = mapped_column(
        String(20), nullable=False
    )

    payment_type: Mapped[str] = mapped_column(
        String(30), default="SALE_PAYMENT"
    )

    reference_number: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )


class CustomerLedger(Base):

    __tablename__ = "customer_ledger"

    __table_args__ = (
        CheckConstraint(
            "entry_type IN ('DEBIT', 'CREDIT')",
            name="check_ledger_entry_type"
        ),

        CheckConstraint(
            "amount > 0",
            name="check_ledger_amount_positive"
        )
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    customer_id: Mapped[int] = mapped_column(
        ForeignKey("customers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )

    sale_id: Mapped[int | None] = mapped_column(
        ForeignKey("sales.id", ondelete="RESTRICT"),
        nullable=True
    )

    payment_id: Mapped[int | None] = mapped_column(
        ForeignKey("payments.id", ondelete="RESTRICT"),
        nullable=True
    )

    entry_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )

    description: Mapped[str | None] = mapped_column(
        String(300), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    customer: Mapped["Customer"] = relationship()



class PaymentAllocation(Base):

    __tablename__ = "payment_allocations"

    __table_args__ = (
        CheckConstraint(
            "amount > 0",
            name="check_payment_allocation_amount_positive"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    payment_id: Mapped[int] = mapped_column(
        ForeignKey("payments.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )

    sale_id: Mapped[int] = mapped_column(
        ForeignKey("sales.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )
