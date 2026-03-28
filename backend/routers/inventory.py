from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import date

from database import get_db
from models import Inventory, User
from routers.auth import get_current_user

router = APIRouter(prefix="/inventory", tags=["inventory"])


class InventoryOut(BaseModel):
    id: int
    asset_id: int
    type: str
    reason: Optional[str] = None
    date: date
    handler: Optional[str] = None

    model_config = {"from_attributes": True}


class InventoryCreate(BaseModel):
    asset_id: int
    type: str
    reason: Optional[str] = None
    date: date
    handler: Optional[str] = None


@router.get("/", response_model=list[InventoryOut])
def list_inventory(
    skip: int = 0,
    limit: int = Query(default=100, le=500),
    type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Inventory)
    if type:
        q = q.filter(Inventory.type == type)
    return q.offset(skip).limit(limit).all()


@router.post("/", response_model=InventoryOut, status_code=201)
def create_inventory(
    data: InventoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = Inventory(**data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
