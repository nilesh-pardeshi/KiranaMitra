from datetime import date, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.sales import (
    Sale,
    SaleItem,
    Payment,
    PaymentAllocation,
    CustomerLedger
)
from app.models.product import ProductVariant, Product
from app.models.party import Customer



def get_period_outstanding(db: Session, start: datetime, end: datetime):
    """
    Calculate the remaining outstanding amount for invoices
    created during the selected period.

    Subtracts repayments allocated to those invoices.
    Standalone Udhar entries are excluded.
    """

    original_unpaid = db.scalar(
        select(
            func.coalesce(func.sum(CustomerLedger.amount), 0)
        )
        .join(Sale, CustomerLedger.sale_id == Sale.id)
        .where(
            CustomerLedger.entry_type == "DEBIT",
            Sale.created_at >= start,
            Sale.created_at < end
        )
    ) or Decimal("0")

    allocated_amount = db.scalar(
        select(
            func.coalesce(func.sum(PaymentAllocation.amount), 0)
        )
        .join(Sale, PaymentAllocation.sale_id == Sale.id)
        .where(
            Sale.created_at >= start,
            Sale.created_at < end
        )
    ) or Decimal("0")

    outstanding = (
        Decimal(str(original_unpaid))
        - Decimal(str(allocated_amount))
    )

    if outstanding < 0:
        raise ValueError(
            "Invoice allocations exceed the original outstanding amount."
        )

    return outstanding


def get_daily_sales(db: Session, report_date: date):
    start = datetime.combine(report_date, time.min)
    end = start + timedelta(days=1)

    result = db.execute(
        select(
            func.count(Sale.id),
            func.coalesce(func.sum(Sale.subtotal), 0),
            func.coalesce(func.sum(Sale.discount), 0),
            func.coalesce(func.sum(Sale.total_amount), 0),
            func.coalesce(func.sum(Sale.paid_amount), 0)
        ).where(
            Sale.created_at >= start,
            Sale.created_at < end
        )
    ).one()

    # Actual money received during this date,
    # including later Udhar repayments.
    amount_collected = db.scalar(
        select(
            func.coalesce(func.sum(Payment.amount), 0)
        ).where(
            Payment.created_at >= start,
            Payment.created_at < end
        )
    )

    return {
        "date": report_date,
        "total_bills": result[0],
        "subtotal": result[1],
        "discount": result[2],
        "total_sales": result[3],
        "amount_collected": amount_collected,
        "outstanding_amount": get_period_outstanding(db, start, end)
    }




def get_monthly_sales(db: Session, year: int, month: int):
    start = datetime(year, month, 1)

    if month == 12:
        end = datetime(year + 1, 1, 1)
    else:
        end = datetime(year, month + 1, 1)

    result = db.execute(
        select(
            func.count(Sale.id),
            func.coalesce(func.sum(Sale.total_amount), 0),
            func.coalesce(func.sum(Sale.paid_amount), 0)
        ).where(
            Sale.created_at >= start,
            Sale.created_at < end
        )
    ).one()

    # Includes sale payments and Udhar repayments
    # received during the selected month.
    amount_collected = db.scalar(
        select(
            func.coalesce(func.sum(Payment.amount), 0)
        ).where(
            Payment.created_at >= start,
            Payment.created_at < end
        )
    )

    return {
        "year": year,
        "month": month,
        "total_bills": result[0],
        "total_sales": result[1],
        "amount_collected": amount_collected,
        "outstanding_amount": get_period_outstanding(db, start, end)
    }


def get_product_sales(db: Session, start_date: date, end_date: date):
    start = datetime.combine(start_date, time.min)
    end = datetime.combine(end_date + timedelta(days=1), time.min)

    rows = db.execute(
        select(
            Product.name,
            ProductVariant.brand,
            ProductVariant.variant_name,
            func.sum(SaleItem.quantity).label("quantity_sold"),
            func.sum(SaleItem.subtotal).label("revenue")
        )
        .join(ProductVariant, SaleItem.variant_id == ProductVariant.id)
        .join(Product, ProductVariant.product_id == Product.id)
        .join(Sale, SaleItem.sale_id == Sale.id)
        .where(
            Sale.created_at >= start,
            Sale.created_at < end
        )
        .group_by(
            Product.name,
            ProductVariant.brand,
            ProductVariant.variant_name
        )
        .order_by(func.sum(SaleItem.quantity).desc())
    ).all()

    return [
        {
            "product": row[0],
            "brand": row[1],
            "variant": row[2],
            "quantity_sold": row[3],
            "revenue": row[4]
        }
        for row in rows
    ]


def get_inventory_valuation(db: Session):
    rows = db.execute(
        select(
            Product.name,
            ProductVariant.brand,
            ProductVariant.variant_name,
            ProductVariant.current_stock,
            ProductVariant.purchase_price,
            ProductVariant.selling_price
        )
        .join(Product, ProductVariant.product_id == Product.id)
        .where(ProductVariant.is_active == True)
        .order_by(Product.name)
    ).all()

    products = []
    total_cost_value = Decimal("0")
    total_selling_value = Decimal("0")

    for row in rows:
        cost_value = row[3] * row[4]
        selling_value = row[3] * row[5]

        total_cost_value += cost_value
        total_selling_value += selling_value

        products.append({
            "product": row[0],
            "brand": row[1],
            "variant": row[2],
            "stock": row[3],
            "cost_value": cost_value,
            "selling_value": selling_value
        })

    return {
        "products": products,
        "total_cost_value": total_cost_value,
        "total_selling_value": total_selling_value
    }


def get_estimated_profit(db: Session, start_date: date, end_date: date):
    start = datetime.combine(start_date, time.min)
    end = datetime.combine(end_date + timedelta(days=1), time.min)

    result = db.execute(
        select(
            func.coalesce(func.sum(SaleItem.subtotal), 0),
            func.coalesce(
                func.sum(
                    SaleItem.quantity * SaleItem.unit_cost
                ), 0
            )
        )
        .join(Sale, SaleItem.sale_id == Sale.id)
        .where(
            Sale.created_at >= start,
            Sale.created_at < end
        )
    ).one()

    gross_revenue = result[0]
    estimated_cost = result[1]

    return {
        "start_date": start_date,
        "end_date": end_date,
        "gross_revenue_before_discount": gross_revenue,
        "estimated_cost": estimated_cost,
        "estimated_gross_profit_before_discount": (
            gross_revenue - estimated_cost
        )
    }