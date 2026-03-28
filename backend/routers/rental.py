from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import date

from database import get_db
from models import RentalOA, RentalTM, User
from routers.auth import get_current_user

router = APIRouter(prefix="/rental", tags=["rental"])


class RentalOAOut(BaseModel):
    id: int
    contract_no: str
    customer_id: int
    asset_id: int
    start: date
    end: Optional[date] = None
    status: Optional[str] = None

    model_config = {"from_attributes": True}


class RentalTMOut(BaseModel):
    id: int
    contract_no: str
    customer_id: int
    asset_id: int
    start: date
    end: Optional[date] = None
    status: Optional[str] = None

    model_config = {"from_attributes": True}


class RentalOACreate(BaseModel):
    contract_no: str
    customer_id: int
    asset_id: int
    start: date
    end: Optional[date] = None
    status: str = "active"


class RentalTMCreate(BaseModel):
    contract_no: str
    customer_id: int
    asset_id: int
    start: date
    end: Optional[date] = None
    status: str = "active"


@router.get("/oa", response_model=list[RentalOAOut])
def list_rental_oa(
    skip: int = 0,
    limit: int = Query(default=100, le=500),
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(RentalOA)
    if status:
        q = q.filter(RentalOA.status == status)
    return q.offset(skip).limit(limit).all()


@router.post("/oa", response_model=RentalOAOut, status_code=201)
def create_rental_oa(
    data: RentalOACreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rental = RentalOA(**data.model_dump())
    db.add(rental)
    db.commit()
    db.refresh(rental)
    return rental


@router.get("/tm", response_model=list[RentalTMOut])
def list_rental_tm(
    skip: int = 0,
    limit: int = Query(default=100, le=500),
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(RentalTM)
    if status:
        q = q.filter(RentalTM.status == status)
    return q.offset(skip).limit(limit).all()


@router.post("/tm", response_model=RentalTMOut, status_code=201)
def create_rental_tm(
    data: RentalTMCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rental = RentalTM(**data.model_dump())
    db.add(rental)
    db.commit()
    db.refresh(rental)
    return rental
