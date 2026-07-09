from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import InventoryItem, User
from ..schemas import InventoryCreate, InventoryResponse
from .auth import get_current_user

router = APIRouter(prefix="/inventory", tags=["Inventory"])

@router.post("/", response_model=InventoryResponse)
def create_inventory_item(item: InventoryCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    data = item.model_dump()
    data["tenant_id"] = current_user.tenant_id
    db_item = InventoryItem(**data)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.get("/", response_model=List[InventoryResponse])
def get_inventory(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(InventoryItem)
    if current_user.role != "superadmin":
        q = q.filter(InventoryItem.tenant_id == current_user.tenant_id)
    return q.offset(skip).limit(limit).all()

@router.get("/barcode/{barcode}", response_model=InventoryResponse)
def get_inventory_item_by_barcode(barcode: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(InventoryItem).filter(InventoryItem.barcode == barcode)
    if current_user.role != "superadmin":
        q = q.filter(InventoryItem.tenant_id == current_user.tenant_id)
    db_item = q.first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Товар с таким штрихкодом не найден")
    return db_item

@router.patch("/{item_id}", response_model=InventoryResponse)
def update_inventory_item(item_id: int, item: InventoryCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(InventoryItem).filter(InventoryItem.id == item_id)
    if current_user.role != "superadmin":
        q = q.filter(InventoryItem.tenant_id == current_user.tenant_id)
    db_item = q.first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    
    # Update fields
    update_data = item.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_item, key, value)
        
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/{item_id}")
def delete_inventory_item(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(InventoryItem).filter(InventoryItem.id == item_id)
    if current_user.role != "superadmin":
        q = q.filter(InventoryItem.tenant_id == current_user.tenant_id)
    db_item = q.first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    db.delete(db_item)
    db.commit()
    return {"message": "Inventory item deleted successfully"}
