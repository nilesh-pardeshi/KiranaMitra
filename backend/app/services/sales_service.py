
from decimal import Decimal
from datetime import datetime
from uuid import uuid4
from sqlalchemy import func
from app.models.sales import PaymentAllocation
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.party import Customer
from app.models.product import ProductVariant
from app.models.sales import Sale, SaleItem, Payment, CustomerLedger
from app.models.inventory import StockMovement


def get_current_invoice_balance(db: Session, sale: Sale):
    # Original unpaid amount recorded in customer ledger.
    original_unpaid = db.scalar(
        select(
            func.coalesce(
                func.sum(CustomerLedger.amount), 0
            )
        ).where(
            CustomerLedger.sale_id == sale.id,
            CustomerLedger.entry_type == "DEBIT"
        )
    ) or Decimal("0")

    # Total repayments allocated to this invoice.
    allocated_amount = db.scalar(
        select(
            func.coalesce(
                func.sum(PaymentAllocation.amount), 0
            )
        ).where(
            PaymentAllocation.sale_id == sale.id
        )
    ) or Decimal("0")

    original_unpaid = Decimal(str(original_unpaid))
    allocated_amount = Decimal(str(allocated_amount))

    current_outstanding = original_unpaid - allocated_amount

    if current_outstanding < 0:
        raise ValueError(
            f"Invalid payment allocations for invoice {sale.invoice_number}."
        )

    current_paid_amount = (
        Decimal(str(sale.total_amount)) - current_outstanding
    )

    if current_outstanding == 0:
        current_status = "PAID"
    elif current_paid_amount == 0:
        current_status = "UNPAID"
    else:
        current_status = "PARTIAL"

    return {
        "current_outstanding": current_outstanding,
        "current_paid_amount": current_paid_amount,
        "current_payment_status": current_status
    }


def build_sale_response(db: Session, sale: Sale):
    balance = get_current_invoice_balance(db, sale)

    return {
        "id": sale.id,
        "invoice_number": sale.invoice_number,
        "customer_id": sale.customer_id,
        "subtotal": sale.subtotal,
        "discount": sale.discount,
        "total_amount": sale.total_amount,

        # Original billing-time values
        "paid_amount": sale.paid_amount,
        "payment_status": sale.payment_status,

        # Dynamically calculated current values
        "current_outstanding": balance["current_outstanding"],
        "current_paid_amount": balance["current_paid_amount"],
        "current_payment_status": balance["current_payment_status"],

        "created_at": sale.created_at,
        "items": sale.items
    }


def create_sale(db: Session, data):
    try:
        # Prevent duplicate variants in one request.
        variant_ids = [item.variant_id for item in data.items]

        if len(variant_ids) != len(set(variant_ids)):
            raise ValueError(
                "Do not repeat a product variant in the same bill."
            )

        # Lock and validate customer if supplied.
        customer = None

        if data.customer_id is not None:
            customer = db.scalar(
                select(Customer)
                .where(
                    Customer.id == data.customer_id,
                    Customer.is_active == True
                )
                .with_for_update()
            )

            if not customer:
                raise ValueError("Customer not found or inactive.")

        # Fetch and lock variants in a consistent order.
        variants = {}

        for variant_id in sorted(variant_ids):
            variant = db.scalar(
                select(ProductVariant)
                .where(
                    ProductVariant.id == variant_id,
                    ProductVariant.is_active == True
                )
                .with_for_update()
            )

            if not variant:
                raise ValueError(
                    f"Product variant {variant_id} not found or inactive."
                )

            variants[variant_id] = variant

        subtotal = Decimal("0")
        sale_items = []

        # Calculate each line using the database selling price.
        for item in data.items:
            variant = variants[item.variant_id]

            if variant.current_stock < item.quantity:
                raise ValueError(
                    f"Insufficient stock for variant {variant.id}. "
                    f"Available: {variant.current_stock}, "
                    f"requested: {item.quantity}."
                )

            unit_price = variant.selling_price
            line_total = (item.quantity * unit_price).quantize(
                Decimal("0.01")
            )

            subtotal += line_total

            sale_items.append({
                "variant": variant,
                "quantity": item.quantity,
                "unit_price": unit_price,
                "subtotal": line_total
            })

        subtotal = subtotal.quantize(Decimal("0.01"))

        if data.discount > subtotal:
            raise ValueError("Discount cannot exceed subtotal.")

        total_amount = subtotal - data.discount

        if data.paid_amount > total_amount:
            raise ValueError("Paid amount cannot exceed bill total.")

        unpaid_amount = total_amount - data.paid_amount

        if unpaid_amount > 0 and customer is None:
            raise ValueError(
                "Select a customer to record an unpaid amount as Udhar."
            )

        if data.paid_amount > 0 and not data.payment_method:
            raise ValueError(
                "Payment method is required when paid amount is greater than zero."
            )

        if total_amount == 0:
            payment_status = "PAID"
        elif data.paid_amount == 0:
            payment_status = "UNPAID"
        elif data.paid_amount < total_amount:
            payment_status = "PARTIAL"
        else:
            payment_status = "PAID"

        # Create the sale.
        sale = Sale(
            invoice_number=f"KM-{datetime.now().strftime('%Y%m%d')}-{uuid4().hex[:8].upper()}",
            customer_id=data.customer_id,
            subtotal=subtotal,
            discount=data.discount,
            total_amount=total_amount,
            paid_amount=data.paid_amount,
            payment_status=payment_status
        )

        db.add(sale)
        db.flush()

        # Create sale items, deduct stock and record movements.
        for item in sale_items:
            variant = item["variant"]

            variant.current_stock -= item["quantity"]

            db.add(SaleItem(
                sale_id=sale.id,
                variant_id=variant.id,
                quantity=item["quantity"],
                unit_price=item["unit_price"],
                unit_cost=variant.purchase_price,
                subtotal=item["subtotal"]
            ))

            db.add(StockMovement(
                variant_id=variant.id,
                movement_type="OUT",
                quantity=item["quantity"],
                reference_type="SALE",
                reference_id=sale.id,
                note=f"Sold through invoice {sale.invoice_number}"
            ))

        # Record the amount actually received.
        if data.paid_amount > 0:
            db.add(Payment(
                sale_id=sale.id,
                customer_id=data.customer_id,
                amount=data.paid_amount,
                payment_method=data.payment_method,
                payment_type="SALE_PAYMENT",
                reference_number=data.reference_number
            ))

        # Record only the unpaid portion as customer Udhar.
        if unpaid_amount > 0:
            db.add(CustomerLedger(
                customer_id=data.customer_id,
                sale_id=sale.id,
                entry_type="DEBIT",
                amount=unpaid_amount,
                description=f"Unpaid amount for invoice {sale.invoice_number}"
            ))

        db.commit()

        created_sale = db.scalar(
            select(Sale)
            .options(selectinload(Sale.items))
            .where(Sale.id == sale.id)
        )

        return build_sale_response(db, created_sale)

    except Exception:
        db.rollback()
        raise



def get_all_sales(db: Session):
    sales = db.scalars(
        select(Sale)
        .options(selectinload(Sale.items))
        .order_by(Sale.created_at.desc())
    ).unique().all()

    return [
        build_sale_response(db, sale)
        for sale in sales
    ]


def get_sale_by_id(db: Session, sale_id: int):
    sale = db.scalar(
        select(Sale)
        .options(selectinload(Sale.items))
        .where(Sale.id == sale_id)
    )

    if not sale:
        return None

    return build_sale_response(db, sale)