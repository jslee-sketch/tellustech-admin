from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models import Asset, User
from routers.auth import get_current_user

router = APIRouter(prefix="/assets", tags=["assets"])


class AssetOut(BaseModel):
    id: int
    code: str
    sn: Optional[str] = None
    barcode: Optional[str] = None
    name: str
    category: Optional[str] = None
    customer_id: Optional[int] = None

    model_config = {"from_attributes": True}


class AssetCreate(BaseModel):
    code: str
    sn: Optional[str] = None
    barcode: Optional[str] = None
    name: str
    category: Optional[str] = None
    customer_id: Optional[int] = None


@router.get("/", response_model=list[AssetOut])
def list_assets(
    skip: int = 0,
    limit: int = Query(default=100, le=500),
    search: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Asset)
    if search:
        q = q.filter((Asset.name.ilike(f"%{search}%")) | (Asset.sn.ilike(f"%{search}%")))
    if category:
        q = q.filter(Asset.category == category)
    return q.offset(skip).limit(limit).all()


@router.post("/", response_model=AssetOut, status_code=201)
def create_asset(
    data: AssetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    asset = Asset(**data.model_dump())
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


@router.get("/{asset_id}", response_model=AssetOut)
def get_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="자산을 찾을 수 없습니다")
    return asset
