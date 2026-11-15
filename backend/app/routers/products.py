
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.dependencies import get_current_user

from app.schemas.product import (
    ProductCreate,
    ProductResponse,
    ProductVariantResponse,
    StockAdjustment
)

from app.services import inventory_service


router = APIRouter(
    prefix="/api/products",
    tags=["Products & Inventory"],
    dependencies=[Depends(get_current_user)]
)


@router.post("/", response_model=ProductResponse, status_code=201)
def add_product(
    data: ProductCreate,
    db: Session = Depends(get_db)
):

    try:
        return inventory_service.create_product(db, data)

    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))


@router.get("/", response_model=list[ProductResponse])
def list_products(
    search: str | None = None,
    category: str | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):

    return inventory_service.get_all_products(
        db,
        search,
        category,
        skip,
        limit
    )


@router.get("/low-stock")
def low_stock_products(db: Session = Depends(get_db)):

    return inventory_service.get_low_stock_products(db)


@router.get("/summary")
def inventory_summary(db: Session = Depends(get_db)):

    return inventory_service.get_inventory_summary(db)


@router.get("/{product_id}", response_model=ProductResponse)
def product_details(
    product_id: int,
    db: Session = Depends(get_db)
):

    product = inventory_service.get_product_by_id(
        db, product_id
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    return product


@router.patch(
    "/variants/{variant_id}/stock",
    response_model=ProductVariantResponse
)
def adjust_stock(
    variant_id: int,
    data: StockAdjustment,
    db: Session = Depends(get_db)
):

    try:
        return inventory_service.update_stock(
            db,
            variant_id,
            data.quantity,
            data.movement_type,
            data.note
        )

    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
