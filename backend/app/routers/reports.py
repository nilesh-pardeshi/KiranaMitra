
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.dependencies import get_current_user
from app.services import report_service, pdf_service

router = APIRouter(
    prefix="/api/reports",
    tags=["Reports & Invoices"],
    dependencies=[Depends(get_current_user)]
)


@router.get("/daily-sales")
def daily_sales(
    report_date: date = Query(default_factory=date.today),
    db: Session = Depends(get_db)
):
    return report_service.get_daily_sales(db, report_date)


@router.get("/monthly-sales")
def monthly_sales(
    year: int = Query(ge=2000, le=2100),
    month: int = Query(ge=1, le=12),
    db: Session = Depends(get_db)
):
    return report_service.get_monthly_sales(db, year, month)


@router.get("/product-sales")
def product_sales(
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db)
):
    if end_date < start_date:
        raise HTTPException(
            status_code=400,
            detail="End date cannot be earlier than start date."
        )

    return report_service.get_product_sales(
        db, start_date, end_date
    )


@router.get("/inventory-valuation")
def inventory_valuation(db: Session = Depends(get_db)):
    return report_service.get_inventory_valuation(db)


@router.get("/estimated-profit")
def estimated_profit(
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db)
):
    if end_date < start_date:
        raise HTTPException(
            status_code=400,
            detail="End date cannot be earlier than start date."
        )

    return report_service.get_estimated_profit(
        db, start_date, end_date
    )


@router.get("/invoices/{sale_id}/pdf")
def download_invoice(
    sale_id: int,
    db: Session = Depends(get_db)
):
    pdf_buffer = pdf_service.generate_invoice_pdf(db, sale_id)

    if pdf_buffer is None:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found."
        )

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="invoice-{sale_id}.pdf"'
        }
    )
