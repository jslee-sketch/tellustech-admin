from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import date

from database import get_db
from models import ASDispatch, User
from routers.auth import get_current_user

router = APIRouter(prefix="/as", tags=["as_dispatch"])


class ASDispatchOut(BaseModel):
    id: int
    asset_id: int
    customer_id: int
    date: date
    issue: Optional[str] = None
    status: Optional[str] = None

    model_config = {"from_attributes": True}


class ASDispatchCreate(BaseModel):
    asset_id: int
    customer_id: int
    date: date
    issue: Optional[str] = None
    status: str = "received"


@router.get("/", response_model=list[ASDispatchOut])
def list_as_dispatch(
    skip: int = 0,
    limit: int = Query(default=100, le=500),
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(ASDispatch)
    if status:
        q = q.filter(ASDispatch.status == status)
    return q.offset(skip).limit(limit).all()


@router.post("/", response_model=ASDispatchOut, status_code=201)
def create_as_dispatch(
    data: ASDispatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = ASDispatch(**data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
