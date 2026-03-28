from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import date

from database import get_db
from models import Calibration, User
from routers.auth import get_current_user

router = APIRouter(prefix="/calibration", tags=["calibration"])


class CalibrationOut(BaseModel):
    id: int
    asset_id: int
    customer_id: Optional[int] = None
    date: date
    cert_no: Optional[str] = None
    status: Optional[str] = None

    model_config = {"from_attributes": True}


class CalibrationCreate(BaseModel):
    asset_id: int
    customer_id: Optional[int] = None
    date: date
    cert_no: Optional[str] = None
    status: str = "pending"


@router.get("/", response_model=list[CalibrationOut])
def list_calibration(
    skip: int = 0,
    limit: int = Query(default=100, le=500),
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Calibration)
    if status:
        q = q.filter(Calibration.status == status)
    return q.offset(skip).limit(limit).all()


@router.post("/", response_model=CalibrationOut, status_code=201)
def create_calibration(
    data: CalibrationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = Calibration(**data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
