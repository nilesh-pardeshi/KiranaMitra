
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.dependencies import get_current_user
from app.schemas.sales import SaleCreate, SaleResponse
from app.services import sales_service

router = APIRouter(
    prefix="/api/sales",
    tags=["Sales & Billing"],
    dependencies=[Depends(get_current_user)]
)


@router.post("/", response_model=SaleResponse, status_code=201)
def create_new_sale(
    data: SaleCreate,
    db: Session = Depends(get_db)
):
    try:
        return sales_service.create_sale(db, data)

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )


@router.get("/", response_model=list[SaleResponse])
def list_sales(db: Session = Depends(get_db)):
    return sales_service.get_all_sales(db)


@router.get("/{sale_id}", response_model=SaleResponse)
def sale_details(
    sale_id: int,
    db: Session = Depends(get_db)
):
    sale = sales_service.get_sale_by_id(db, sale_id)

    if not sale:
        raise HTTPException(
            status_code=404,
            detail="Sale not found."
        )

    return sale
