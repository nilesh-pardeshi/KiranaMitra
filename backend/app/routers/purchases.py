
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.dependencies import get_current_user
from app.schemas.purchase import PurchaseCreate, PurchaseResponse
from app.services import purchase_service

router = APIRouter(
    prefix="/api/purchases",
    tags=["Purchases"],
    dependencies=[Depends(get_current_user)]
)


@router.post("/", response_model=PurchaseResponse, status_code=201)
def add_purchase(
    data: PurchaseCreate,
    db: Session = Depends(get_db)
):
    try:
        return purchase_service.create_purchase(db, data)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))


@router.get("/", response_model=list[PurchaseResponse])
def list_purchases(db: Session = Depends(get_db)):
    return purchase_service.get_all_purchases(db)


@router.get("/{purchase_id}", response_model=PurchaseResponse)
def purchase_details(
    purchase_id: int,
    db: Session = Depends(get_db)
):
    purchase = purchase_service.get_purchase_by_id(db, purchase_id)

    if not purchase:
        raise HTTPException(
            status_code=404,
            detail="Purchase not found."
        )

    return purchase
