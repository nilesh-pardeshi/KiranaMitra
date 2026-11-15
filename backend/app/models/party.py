
from datetime import datetime, timezone

from sqlalchemy import String, Boolean, DateTime

from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class Supplier(Base):

    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(
        String(150), nullable=False
    )

    phone: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )

    address: Mapped[str | None] = mapped_column(
        String(300), nullable=True
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )


class Customer(Base):

    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(
        String(150), nullable=False, index=True
    )

    phone: Mapped[str | None] = mapped_column(
        String(20), nullable=True, index=True
    )

    address: Mapped[str | None] = mapped_column(
        String(300), nullable=True
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )
