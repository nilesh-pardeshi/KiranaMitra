
from decimal import Decimal

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.party import Customer
from app.models.sales import (
    CustomerLedger,
    Payment,
    PaymentAllocation,
    Sale
)


def create_customer(db: Session, data):
    customer = Customer(
        name=data.name,
        phone=data.phone,
        address=data.address
    )

    db.add(customer)
    db.commit()
    db.refresh(customer)

    return customer


def get_customer_balance(db: Session, customer_id: int):
    debit = db.scalar(
        select(func.coalesce(func.sum(CustomerLedger.amount), 0))
        .where(
            CustomerLedger.customer_id == customer_id,
            CustomerLedger.entry_type == "DEBIT"
        )
    ) or Decimal("0")

    credit = db.scalar(
        select(func.coalesce(func.sum(CustomerLedger.amount), 0))
        .where(
            CustomerLedger.customer_id == customer_id,
            CustomerLedger.entry_type == "CREDIT"
        )
    ) or Decimal("0")

    return Decimal(str(debit)) - Decimal(str(credit))


def get_all_customers(db: Session):
    customers = db.scalars(
        select(Customer)
        .where(Customer.is_active == True)
        .order_by(Customer.name)
    ).all()

    result = []

    for customer in customers:
        result.append({
            "id": customer.id,
            "name": customer.name,
            "phone": customer.phone,
            "address": customer.address,
            "is_active": customer.is_active,
            "outstanding_balance": get_customer_balance(db, customer.id)
        })

    return result


def get_customer_details(db: Session, customer_id: int):
    customer = db.get(Customer, customer_id)

    if not customer or not customer.is_active:
        return None

    return {
        "id": customer.id,
        "name": customer.name,
        "phone": customer.phone,
        "address": customer.address,
        "is_active": customer.is_active,
        "outstanding_balance": get_customer_balance(db, customer_id)
    }


def add_udhar(db: Session, customer_id: int, data):
    try:
        customer = db.scalar(
            select(Customer)
            .where(
                Customer.id == customer_id,
                Customer.is_active == True
            )
            .with_for_update()
        )

        if not customer:
            raise ValueError("Customer not found or inactive.")

        entry = CustomerLedger(
            customer_id=customer_id,
            entry_type="DEBIT",
            amount=data.amount,
            description=data.description or "Credit purchase"
        )

        db.add(entry)
        db.commit()
        db.refresh(entry)

        return {
            "message": "Udhar recorded successfully.",
            "entry": entry,
            "outstanding_balance": get_customer_balance(db, customer_id)
        }

    except Exception:
        db.rollback()
        raise



def add_repayment(db: Session, customer_id: int, data):
    try:
        # Lock customer to prevent concurrent repayments
        # from exceeding the outstanding balance.
        customer = db.scalar(
            select(Customer)
            .where(
                Customer.id == customer_id,
                Customer.is_active == True
            )
            .with_for_update()
        )

        if not customer:
            raise ValueError("Customer not found or inactive.")

        outstanding = get_customer_balance(db, customer_id)

        if outstanding <= 0:
            raise ValueError(
                "This customer has no outstanding balance."
            )

        if data.amount > outstanding:
            raise ValueError(
                f"Repayment exceeds outstanding balance of {outstanding}."
            )

        # Create the payment record.
        payment = Payment(
            customer_id=customer_id,
            sale_id=None,
            amount=data.amount,
            payment_method=data.payment_method,
            payment_type="UDHAR_REPAYMENT",
            reference_number=data.reference_number
        )

        db.add(payment)
        db.flush()

        # Record the customer-level repayment exactly once.
        ledger_entry = CustomerLedger(
            customer_id=customer_id,
            payment_id=payment.id,
            entry_type="CREDIT",
            amount=data.amount,
            description=f"Udhar repayment via {data.payment_method}"
        )

        db.add(ledger_entry)

        # Find invoices that have outstanding DEBIT entries.
        unpaid_sales = db.scalars(
            select(Sale)
            .join(
                CustomerLedger,
                CustomerLedger.sale_id == Sale.id
            )
            .where(
                Sale.customer_id == customer_id,
                CustomerLedger.customer_id == customer_id,
                CustomerLedger.entry_type == "DEBIT"
            )
            .order_by(Sale.created_at.asc(), Sale.id.asc())
            .with_for_update(of=Sale)
        ).unique().all()

        remaining_payment = Decimal(str(data.amount))
        allocations_created = []

        # FIFO: settle the oldest outstanding invoice first.
        for sale in unpaid_sales:

            if remaining_payment <= 0:
                break

            # Original unpaid amount for this invoice.
            invoice_debit = db.scalar(
                select(
                    func.coalesce(
                        func.sum(CustomerLedger.amount), 0
                    )
                ).where(
                    CustomerLedger.customer_id == customer_id,
                    CustomerLedger.sale_id == sale.id,
                    CustomerLedger.entry_type == "DEBIT"
                )
            ) or Decimal("0")

            # Amount already allocated to this invoice.
            previously_allocated = db.scalar(
                select(
                    func.coalesce(
                        func.sum(PaymentAllocation.amount), 0
                    )
                ).where(
                    PaymentAllocation.sale_id == sale.id
                )
            ) or Decimal("0")

            invoice_balance = (
                Decimal(str(invoice_debit))
                - Decimal(str(previously_allocated))
            )

            if invoice_balance <= 0:
                continue

            allocation_amount = min(
                remaining_payment,
                invoice_balance
            )

            allocation = PaymentAllocation(
                payment_id=payment.id,
                sale_id=sale.id,
                amount=allocation_amount
            )

            db.add(allocation)
            allocations_created.append(allocation)

            remaining_payment -= allocation_amount

        db.commit()

        db.refresh(ledger_entry)

        return {
            "message": "Repayment recorded and allocated successfully.",
            "entry": ledger_entry,
            "payment_id": payment.id,
            "allocations": [
                {
                    "sale_id": allocation.sale_id,
                    "amount": allocation.amount
                }
                for allocation in allocations_created
            ],
            "unallocated_amount": remaining_payment,
            "outstanding_balance": get_customer_balance(
                db, customer_id
            )
        }

    except Exception:
        db.rollback()
        raise


def get_customer_ledger(db: Session, customer_id: int):
    customer = db.get(Customer, customer_id)

    if not customer or not customer.is_active:
        return None

    entries = db.scalars(
        select(CustomerLedger)
        .where(CustomerLedger.customer_id == customer_id)
        .order_by(CustomerLedger.created_at.desc())
    ).all()

    return {
        "customer_id": customer_id,
        "customer_name": customer.name,
        "entries": entries,
        "outstanding_balance": get_customer_balance(db, customer_id)
    }
