
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.party import Supplier


def create_supplier(db: Session, data):
    supplier = Supplier(
        name=data.name,
        phone=data.phone,
        address=data.address
    )

    db.add(supplier)
    db.commit()
    db.refresh(supplier)

    return supplier


def get_all_suppliers(db: Session):
    return db.scalars(
        select(Supplier)
        .where(Supplier.is_active == True)
        .order_by(Supplier.name)
    ).all()
