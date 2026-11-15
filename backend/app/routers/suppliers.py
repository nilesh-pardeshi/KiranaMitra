
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.core.dependencies import get_current_user
from app.schemas.supplier import SupplierCreate, SupplierResponse
from app.services import supplier_service

router = APIRouter(
    prefix="/api/suppliers",
    tags=["Suppliers"],
    dependencies=[Depends(get_current_user)]
)


@router.post("/", response_model=SupplierResponse, status_code=201)
def add_supplier(
    data: SupplierCreate,
    db: Session = Depends(get_db)
):
    return supplier_service.create_supplier(db, data)


@router.get("/", response_model=list[SupplierResponse])
def list_suppliers(db: Session = Depends(get_db)):
    return supplier_service.get_all_suppliers(db)
