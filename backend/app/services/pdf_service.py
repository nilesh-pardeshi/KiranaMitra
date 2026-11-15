
from io import BytesIO
from decimal import Decimal

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle
)

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


def generate_invoice_pdf(db: Session, sale_id: int):
    # Get sale
    sale = db.get(Sale, sale_id)

    if not sale:
        return None

    # --------------------------------------------------
    # 1. Calculate Current Invoice Balance
    # --------------------------------------------------

    original_unpaid = db.scalar(
        select(func.coalesce(func.sum(CustomerLedger.amount), 0))
        .where(
            CustomerLedger.sale_id == sale_id,
            CustomerLedger.entry_type == "DEBIT"
        )
    ) or Decimal("0")

    allocated_amount = db.scalar(
        select(func.coalesce(func.sum(PaymentAllocation.amount), 0))
        .where(
            PaymentAllocation.sale_id == sale_id
        )
    ) or Decimal("0")

    original_unpaid = Decimal(str(original_unpaid))
    allocated_amount = Decimal(str(allocated_amount))

    current_outstanding = original_unpaid - allocated_amount

    if current_outstanding < 0:
        raise ValueError(
            "Invoice allocations exceed the original outstanding amount."
        )

    current_paid_amount = (
        Decimal(str(sale.total_amount)) - current_outstanding
    )

    if current_outstanding == 0:
        current_payment_status = "PAID"

    elif current_paid_amount == 0:
        current_payment_status = "UNPAID"

    else:
        current_payment_status = "PARTIAL"

    # --------------------------------------------------
    # 2. Get Customer Details
    # --------------------------------------------------

    customer = None

    if sale.customer_id:
        customer = db.get(Customer, sale.customer_id)

    # --------------------------------------------------
    # 3. Get Purchased Product Details
    # --------------------------------------------------

    rows = db.execute(
        select(
            Product.name,
            ProductVariant.brand,
            ProductVariant.variant_name,
            SaleItem.quantity,
            SaleItem.unit_price,
            SaleItem.subtotal
        )
        .join(
            ProductVariant,
            SaleItem.variant_id == ProductVariant.id
        )
        .join(
            Product,
            ProductVariant.product_id == Product.id
        )
        .where(SaleItem.sale_id == sale_id)
    ).all()

    # --------------------------------------------------
    # 4. Get Initial Payments
    # --------------------------------------------------

    payments = db.scalars(
        select(Payment)
        .where(Payment.sale_id == sale_id)
        .order_by(Payment.created_at)
    ).all()

    # --------------------------------------------------
    # 5. Get Repayments Allocated to This Invoice
    # --------------------------------------------------

    allocated_payments = db.execute(
        select(
            Payment.payment_method,
            PaymentAllocation.amount,
            Payment.created_at
        )
        .join(
            PaymentAllocation,
            PaymentAllocation.payment_id == Payment.id
        )
        .where(
            PaymentAllocation.sale_id == sale_id
        )
        .order_by(Payment.created_at)
    ).all()

    # --------------------------------------------------
    # 6. Create PDF Document
    # --------------------------------------------------

    buffer = BytesIO()

    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=40,
        leftMargin=40,
        topMargin=35,
        bottomMargin=35
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "InvoiceTitle",
        parent=styles["Title"],
        alignment=TA_CENTER,
        textColor=colors.HexColor("#166534"),
        fontSize=22
    )

    right_style = ParagraphStyle(
        "Right",
        parent=styles["Normal"],
        alignment=TA_RIGHT
    )

    story = []

    # --------------------------------------------------
    # 7. Invoice Header
    # --------------------------------------------------

    story.append(
        Paragraph("KIRANAMITRA", title_style)
    )

    story.append(
        Paragraph(
            "Smart Kirana Store & Business Management",
            ParagraphStyle(
                "Subtitle",
                parent=styles["Normal"],
                alignment=TA_CENTER
            )
        )
    )

    story.append(Spacer(1, 20))

    # --------------------------------------------------
    # 8. Customer Information
    # --------------------------------------------------

    customer_name = (
        customer.name if customer else "Walk-in Customer"
    )

    customer_phone = (
        customer.phone
        if customer and customer.phone
        else "-"
    )

    invoice_info = [
        [
            Paragraph(
                f"<b>Invoice:</b> {sale.invoice_number}",
                styles["Normal"]
            ),
            Paragraph(
                f"<b>Date:</b> "
                f"{sale.created_at.strftime('%d-%m-%Y %I:%M %p')}",
                right_style
            )
        ],
        [
            Paragraph(
                f"<b>Customer:</b> {customer_name}",
                styles["Normal"]
            ),
            Paragraph(
                f"<b>Phone:</b> {customer_phone}",
                right_style
            )
        ]
    ]

    info_table = Table(
        invoice_info,
        colWidths=[260, 250]
    )

    info_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8)
        ])
    )

    story.append(info_table)
    story.append(Spacer(1, 18))

    # --------------------------------------------------
    # 9. Purchased Products Table
    # --------------------------------------------------

    table_data = [
        ["Product", "Qty", "Unit Price", "Amount"]
    ]

    for row in rows:

        product_label = (
            f"{row[0]} - {row[1]} {row[2]}"
        )

        table_data.append([
            product_label,
            str(row[3]),
            f"Rs. {row[4]:,.2f}",
            f"Rs. {row[5]:,.2f}"
        ])

    items_table = Table(
        table_data,
        colWidths=[250, 55, 100, 105],
        repeatRows=1
    )

    items_table.setStyle(
        TableStyle([
            (
                "BACKGROUND",
                (0, 0),
                (-1, 0),
                colors.HexColor("#166534")
            ),
            (
                "TEXTCOLOR",
                (0, 0),
                (-1, 0),
                colors.white
            ),
            (
                "FONTNAME",
                (0, 0),
                (-1, 0),
                "Helvetica-Bold"
            ),
            (
                "GRID",
                (0, 0),
                (-1, -1),
                0.5,
                colors.HexColor("#D1D5DB")
            ),
            (
                "ALIGN",
                (1, 1),
                (-1, -1),
                "RIGHT"
            ),
            (
                "PADDING",
                (0, 0),
                (-1, -1),
                8
            )
        ])
    )

    story.append(items_table)
    story.append(Spacer(1, 18))

    # --------------------------------------------------
    # 10. Updated Invoice Totals
    # --------------------------------------------------

    totals = [
        [
            "Subtotal",
            f"Rs. {sale.subtotal:,.2f}"
        ],
        [
            "Discount",
            f"Rs. {sale.discount:,.2f}"
        ],
        [
            "Total",
            f"Rs. {sale.total_amount:,.2f}"
        ],
        [
            "Paid at Sale",
            f"Rs. {sale.paid_amount:,.2f}"
        ],
        [
            "Current Total Paid",
            f"Rs. {current_paid_amount:,.2f}"
        ],
        [
            "Current Outstanding",
            f"Rs. {current_outstanding:,.2f}"
        ],
        [
            "Current Payment Status",
            current_payment_status
        ]
    ]

    totals_table = Table(
        totals,
        colWidths=[350, 160],
        hAlign="RIGHT"
    )

    totals_table.setStyle(
        TableStyle([
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ("FONTNAME", (0, 2), (-1, 2), "Helvetica-Bold"),
            ("LINEABOVE", (0, 2), (-1, 2), 1, colors.black),
            ("FONTNAME", (0, 4), (-1, 6), "Helvetica-Bold"),
            ("TEXTCOLOR", (1, 5), (1, 5), colors.HexColor("#DC2626")),
            ("PADDING", (0, 0), (-1, -1), 7)
        ])
    )

    story.append(totals_table)
    story.append(Spacer(1, 15))

    # --------------------------------------------------
    # 11. Payment Details
    # --------------------------------------------------

    story.append(
        Paragraph(
            "<b>Payment Details</b>",
            styles["Heading3"]
        )
    )

    if payments or allocated_payments:

        # Initial payments made during sale
        for payment in payments:

            story.append(
                Paragraph(
                    f"Initial Payment - {payment.payment_method}: "
                    f"Rs. {payment.amount:,.2f}",
                    styles["Normal"]
                )
            )

        # Subsequent repayments allocated to this invoice
        for payment_method, allocated, created_at in allocated_payments:

            story.append(
                Paragraph(
                    f"Repayment - {payment_method}: "
                    f"Rs. {allocated:,.2f} "
                    f"({created_at.strftime('%d-%m-%Y')})",
                    styles["Normal"]
                )
            )

    else:

        story.append(
            Paragraph(
                "No payment received.",
                styles["Normal"]
            )
        )

    # --------------------------------------------------
    # 12. Invoice Footer
    # --------------------------------------------------

    story.append(Spacer(1, 25))

    story.append(
        Paragraph(
            "Thank you for shopping with us!",
            ParagraphStyle(
                "Footer",
                parent=styles["Normal"],
                alignment=TA_CENTER,
                textColor=colors.HexColor("#166534")
            )
        )
    )

    # --------------------------------------------------
    # 13. Generate PDF
    # --------------------------------------------------

    document.build(story)

    buffer.seek(0)

    return buffer
