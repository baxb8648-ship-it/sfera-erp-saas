from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import EquipmentItem, User
from ..schemas import EquipmentCreate, EquipmentResponse
from .auth import get_current_user

router = APIRouter(prefix="/equipment", tags=["Equipment"])

@router.post("/", response_model=EquipmentResponse)
def create_equipment_item(item: EquipmentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_item = EquipmentItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.get("/", response_model=List[EquipmentResponse])
def get_equipment(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(EquipmentItem).offset(skip).limit(limit).all()

@router.patch("/{item_id}", response_model=EquipmentResponse)
def update_equipment_item(item_id: int, item: EquipmentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_item = db.query(EquipmentItem).filter(EquipmentItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Equipment item not found")
    
    update_data = item.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_item, key, value)
        
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/{item_id}")
def delete_equipment_item(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_item = db.query(EquipmentItem).filter(EquipmentItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Equipment item not found")
    db.delete(db_item)
    db.commit()
    return {"message": "Equipment item deleted successfully"}
