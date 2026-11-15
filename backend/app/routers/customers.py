
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.dependencies import get_current_user
from app.schemas.customer import (
    CustomerCreate,
    CustomerResponse,
    UdharCreate,
    RepaymentCreate
)
from app.services import customer_service

router = APIRouter(
    prefix="/api/customers",
    tags=["Customers & Udhar"],
    dependencies=[Depends(get_current_user)]
)


@router.post("/", response_model=CustomerResponse, status_code=201)
def add_customer(
    data: CustomerCreate,
    db: Session = Depends(get_db)
):
    return customer_service.create_customer(db, data)


@router.get("/")
def list_customers(db: Session = Depends(get_db)):
    return customer_service.get_all_customers(db)


@router.get("/{customer_id}/ledger")
def customer_ledger(
    customer_id: int,
    db: Session = Depends(get_db)
):
    result = customer_service.get_customer_ledger(db, customer_id)

    if not result:
        raise HTTPException(status_code=404, detail="Customer not found.")

    return result


@router.post("/{customer_id}/udhar")
def record_udhar(
    customer_id: int,
    data: UdharCreate,
    db: Session = Depends(get_db)
):
    try:
        return customer_service.add_udhar(db, customer_id, data)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))


@router.post("/{customer_id}/repayments")
def record_repayment(
    customer_id: int,
    data: RepaymentCreate,
    db: Session = Depends(get_db)
):
    try:
        return customer_service.add_repayment(db, customer_id, data)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))


@router.get("/{customer_id}")
def customer_details(
    customer_id: int,
    db: Session = Depends(get_db)
):
    result = customer_service.get_customer_details(db, customer_id)

    if not result:
        raise HTTPException(status_code=404, detail="Customer not found.")

    return result
