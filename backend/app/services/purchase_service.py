
from decimal import Decimal
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import IntegrityError

from app.models.party import Supplier
from app.models.product import ProductVariant
from app.models.purchase import Purchase, PurchaseItem
from app.models.inventory import StockMovement


def create_purchase(db: Session, data):
    try:
        # 1. Reject duplicate product variants in one purchase.
        variant_ids = [item.variant_id for item in data.items]

        if len(variant_ids) != len(set(variant_ids)):
            raise ValueError(
                "A product variant can only appear once in a purchase."
            )

        # 2. Validate supplier.
        supplier = db.get(Supplier, data.supplier_id)

        if not supplier or not supplier.is_active:
            raise ValueError("Supplier not found or inactive.")

        # 3. Normalize supplier invoice number.
        invoice_number = (
            (data.invoice_number or "").strip() or None
        )

        # 4. Check duplicate supplier invoice.
        if invoice_number:
            existing_purchase = db.scalar(
                select(Purchase).where(
                    Purchase.supplier_id == data.supplier_id,
                    Purchase.invoice_number == invoice_number
                )
            )

            if existing_purchase:
                raise ValueError(
                    f"Duplicate invoice: supplier already has "
                    f"invoice number '{invoice_number}'."
                )

        # 5. Generate internal invoice number if not provided.
        if not invoice_number:
            invoice_number = (
                "KM-PUR-" +
                datetime.now().strftime("%Y%m%d%H%M%S%f")
            )

        # 6. Create purchase record.
        purchase = Purchase(
            supplier_id=data.supplier_id,
            invoice_number=invoice_number,
            total_amount=Decimal("0"),
            status="RECEIVED"
        )

        db.add(purchase)
        db.flush()

        total = Decimal("0")

        # 7. Process variants in ascending ID order.
        # This reduces deadlock risk during concurrent purchases.
        for item in sorted(
            data.items,
            key=lambda item: item.variant_id
        ):

            variant = db.scalar(
                select(ProductVariant)
                .where(
                    ProductVariant.id == item.variant_id,
                    ProductVariant.is_active == True
                )
                .with_for_update()
            )

            if not variant:
                raise ValueError(
                    f"Product variant {item.variant_id} not found."
                )

            # 8. Calculate purchase item subtotal.
            subtotal = item.quantity * item.unit_cost
            total += subtotal

            # 9. Increase inventory and update purchase price.
            variant.current_stock += item.quantity
            variant.purchase_price = item.unit_cost

            # 10. Create purchase item.
            purchase_item = PurchaseItem(
                purchase_id=purchase.id,
                variant_id=variant.id,
                quantity=item.quantity,
                unit_cost=item.unit_cost,
                subtotal=subtotal
            )

            db.add(purchase_item)
            db.flush()

            # 11. Record stock movement.
            db.add(
                StockMovement(
                    variant_id=variant.id,
                    movement_type="IN",
                    quantity=item.quantity,
                    reference_type="PURCHASE",
                    reference_id=purchase.id,
                    note=f"Stock received from {supplier.name}"
                )
            )

        # 12. Update purchase total.
        purchase.total_amount = total

        # 13. Commit all changes together.
        db.commit()

        return db.scalar(
            select(Purchase)
            .options(selectinload(Purchase.items))
            .where(Purchase.id == purchase.id)
        )

    except ValueError:
        db.rollback()
        raise

    except IntegrityError as exc:
        db.rollback()

        # Handle duplicate invoice requests arriving concurrently.
        constraint_name = getattr(
            getattr(exc.orig, "diag", None),
            "constraint_name",
            None
        )

        if constraint_name == "uq_purchase_supplier_invoice":
            raise ValueError(
                "This supplier invoice number has already been recorded."
            ) from exc

        raise

    except Exception:
        db.rollback()
        raise


def get_all_purchases(db: Session):
    return db.scalars(
        select(Purchase)
        .options(selectinload(Purchase.items))
        .order_by(Purchase.created_at.desc())
    ).unique().all()


def get_purchase_by_id(db: Session, purchase_id: int):
    return db.scalar(
        select(Purchase)
        .options(selectinload(Purchase.items))
        .where(Purchase.id == purchase_id)
    )
