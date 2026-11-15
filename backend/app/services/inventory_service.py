from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError

from decimal import Decimal

from app.models.product import Product, ProductVariant
from app.models.inventory import StockMovement


def create_product(db: Session, data):

    try:
        product = Product(
            name=data.name,
            category=data.category,
            description=data.description
        )

        db.add(product)
        db.flush()

        for variant_data in data.variants:

            variant = ProductVariant(
                product_id=product.id,
                brand=variant_data.brand,
                variant_name=variant_data.variant_name,
                sku=variant_data.sku,
                unit=variant_data.unit,
                purchase_price=variant_data.purchase_price,
                selling_price=variant_data.selling_price,
                current_stock=variant_data.current_stock,
                reorder_level=variant_data.reorder_level,
                target_stock=variant_data.target_stock
            )

            db.add(variant)
            db.flush()

            # Record opening stock
            if variant_data.current_stock > 0:

                db.add(
                    StockMovement(
                        variant_id=variant.id,
                        movement_type="IN",
                        quantity=variant_data.current_stock,
                        reference_type="OPENING_STOCK",
                        note="Initial stock entry"
                    )
                )

        db.commit()

        return db.scalar(
            select(Product)
            .options(selectinload(Product.variants))
            .where(Product.id == product.id)
        )

    except IntegrityError:
        db.rollback()
        raise ValueError(
            "Duplicate product variant or SKU already exists."
        )

    except Exception:
        db.rollback()
        raise


def get_all_products(
    db: Session,
    search: str | None = None,
    category: str | None = None,
    skip: int = 0,
    limit: int = 50
):

    query = (
        select(Product)
        .options(selectinload(Product.variants))
        .where(Product.is_active == True)
    )

    if search:
        query = query.where(
            Product.name.ilike(f"%{search}%")
        )

    if category:
        query = query.where(
            Product.category.ilike(category)
        )

    query = query.order_by(Product.name).offset(skip).limit(limit)

    return db.scalars(query).unique().all()


def get_product_by_id(db: Session, product_id: int):

    return db.scalar(
        select(Product)
        .options(selectinload(Product.variants))
        .where(Product.id == product_id)
    )


def update_stock(
    db: Session,
    variant_id: int,
    quantity: Decimal,
    movement_type: str,
    note: str | None = None
):

    try:
        if quantity <= 0:
            raise ValueError("Quantity must be greater than zero.")

        if movement_type not in ["IN", "OUT"]:
            raise ValueError("Movement type must be IN or OUT.")

        variant = db.scalar(
            select(ProductVariant)
            .where(
                ProductVariant.id == variant_id,
                ProductVariant.is_active == True
            )
            .with_for_update()
        )

        if not variant:
            raise ValueError("Product variant not found.")

        if movement_type == "IN":
            variant.current_stock += quantity

        else:
            if variant.current_stock < quantity:
                raise ValueError("Insufficient stock available.")

            variant.current_stock -= quantity

        movement = StockMovement(
            variant_id=variant_id,
            movement_type=movement_type,
            quantity=quantity,
            reference_type="MANUAL_ADJUSTMENT",
            note=note
        )

        db.add(movement)
        db.commit()
        db.refresh(variant)

        return variant

    except Exception:
        db.rollback()
        raise


def get_low_stock_products(db: Session):

    return db.scalars(
        select(ProductVariant)
        .where(
            ProductVariant.is_active == True,
            ProductVariant.reorder_level > 0,
            ProductVariant.current_stock
            <= ProductVariant.reorder_level
        )
        .order_by(ProductVariant.current_stock)
    ).all()


def get_inventory_summary(db: Session):

    total_products = db.scalar(
        select(func.count(Product.id))
        .where(Product.is_active == True)
    ) or 0

    total_variants = db.scalar(
        select(func.count(ProductVariant.id))
        .where(ProductVariant.is_active == True)
    ) or 0

    inventory_value = db.scalar(
        select(
            func.coalesce(
                func.sum(
                    ProductVariant.current_stock
                    * ProductVariant.purchase_price
                ),
                0
            )
        ).where(ProductVariant.is_active == True)
    ) or Decimal("0")

    low_stock_count = db.scalar(
        select(func.count(ProductVariant.id))
        .where(
            ProductVariant.is_active == True,
            ProductVariant.reorder_level > 0,
            ProductVariant.current_stock
            <= ProductVariant.reorder_level
        )
    ) or 0

    return {
        "total_products": total_products,
        "total_variants": total_variants,
        "inventory_value": inventory_value,
        "low_stock_count": low_stock_count
    }