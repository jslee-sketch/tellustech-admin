from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models import Customer, User
from routers.auth import get_current_user

router = APIRouter(prefix="/customers", tags=["customers"])


class CustomerOut(BaseModel):
    id: int
    code: str
    name: str
    contact: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = None

    model_config = {"from_attributes": True}


class CustomerCreate(BaseModel):
    code: str
    name: str
    contact: Optional[str] = None
    phone: Optional[str] = None
    status: str = "active"


@router.get("/", response_model=list[CustomerOut])
def list_customers(
    skip: int = 0,
    limit: int = Query(default=100, le=500),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Customer)
    if search:
        q = q.filter(Customer.name.ilike(f"%{search}%"))
    return q.offset(skip).limit(limit).all()


@router.post("/", response_model=CustomerOut, status_code=201)
def create_customer(
    data: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    customer = Customer(**data.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="고객을 찾을 수 없습니다")
    return customer
