from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from ..database import get_db
from ..models import AgroCrop, AgroField, AgroSeason, AgroSeeding, AgroOperation, EquipmentItem, InventoryItem, User
from .auth import get_current_user

router = APIRouter(prefix="/agro", tags=["agro"])

# ============================
# Schemas
# ============================

class AgroCropBase(BaseModel):
    name: str
    variety: Optional[str] = None
    expected_yield: float = 0.0

class AgroCropResponse(AgroCropBase):
    id: int
    tenant_id: int
    class Config:
        orm_mode = True

class AgroFieldBase(BaseModel):
    name: str
    area_hectares: float = 0.0
    soil_type: Optional[str] = None
    geo_json: Optional[str] = None
    is_active: int = 1

class AgroFieldResponse(AgroFieldBase):
    id: int
    tenant_id: int
    class Config:
        orm_mode = True

class AgroOperationBase(BaseModel):
    field_id: int
    operation_type: str
    date: datetime
    equipment_id: Optional[int] = None
    operator_id: Optional[int] = None
    fuel_consumed: float = 0.0
    inventory_item_id: Optional[int] = None
    inventory_quantity: float = 0.0

class AgroOperationResponse(AgroOperationBase):
    id: int
    tenant_id: int
    status: str
    equipment_name: Optional[str] = None
    operator_name: Optional[str] = None
    inventory_name: Optional[str] = None
    field_name: Optional[str] = None
    class Config:
        orm_mode = True

# ============================
# Endpoints
# ============================

def _get_tenant_id(current_user: User, tenant_id: Optional[int] = None) -> int:
    if current_user.role == "superadmin" and tenant_id:
        return tenant_id
    return current_user.tenant_id or 1

@router.get("/crops", response_model=List[AgroCropResponse])
def get_crops(tenant_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tid = _get_tenant_id(current_user, tenant_id)
    return db.query(AgroCrop).filter(AgroCrop.tenant_id == tid).all()

@router.post("/crops", response_model=AgroCropResponse)
def create_crop(crop: AgroCropBase, tenant_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tid = _get_tenant_id(current_user, tenant_id)
    db_crop = AgroCrop(**crop.dict(), tenant_id=tid)
    db.add(db_crop)
    db.commit()
    db.refresh(db_crop)
    return db_crop

@router.get("/fields", response_model=List[AgroFieldResponse])
def get_fields(tenant_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tid = _get_tenant_id(current_user, tenant_id)
    return db.query(AgroField).filter(AgroField.tenant_id == tid).all()

@router.post("/fields", response_model=AgroFieldResponse)
def create_field(field: AgroFieldBase, tenant_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tid = _get_tenant_id(current_user, tenant_id)
    db_field = AgroField(**field.dict(), tenant_id=tid)
    db.add(db_field)
    db.commit()
    db.refresh(db_field)
    return db_field

@router.put("/fields/{field_id}", response_model=AgroFieldResponse)
def update_field(field_id: int, field: AgroFieldBase, tenant_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tid = _get_tenant_id(current_user, tenant_id)
    db_field = db.query(AgroField).filter(AgroField.id == field_id, AgroField.tenant_id == tid).first()
    if not db_field:
        raise HTTPException(status_code=404, detail="Поле не найдено")
    
    for key, value in field.dict().items():
        setattr(db_field, key, value)
    
    db.commit()
    db.refresh(db_field)
    return db_field

@router.get("/operations", response_model=List[AgroOperationResponse])
def get_operations(tenant_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tid = _get_tenant_id(current_user, tenant_id)
    ops = db.query(AgroOperation).filter(AgroOperation.tenant_id == tid).all()
    for op in ops:
        if op.equipment:
            op.equipment_name = op.equipment.name
        if op.operator:
            op.operator_name = op.operator.username
        if op.inventory:
            op.inventory_name = op.inventory.name
        if op.field:
            op.field_name = op.field.name
    return ops

@router.post("/operations", response_model=AgroOperationResponse)
def create_operation(op: AgroOperationBase, tenant_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tid = _get_tenant_id(current_user, tenant_id)
    db_op = AgroOperation(**op.dict(), tenant_id=tid)
    db.add(db_op)
    db.commit()
    db.refresh(db_op)
    
    if db_op.equipment:
        db_op.equipment_name = db_op.equipment.name
    if db_op.operator:
        db_op.operator_name = db_op.operator.username
    if db_op.inventory:
        db_op.inventory_name = db_op.inventory.name
    if db_op.field:
        db_op.field_name = db_op.field.name
        
    return db_op

@router.post("/operations/{op_id}/complete")
def complete_operation(op_id: int, tenant_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tid = _get_tenant_id(current_user, tenant_id)
    db_op = db.query(AgroOperation).filter(AgroOperation.id == op_id, AgroOperation.tenant_id == tid).first()
    if not db_op:
        raise HTTPException(status_code=404, detail="Операция не найдена")
    
    if db_op.status == "completed":
        raise HTTPException(status_code=400, detail="Операция уже завершена")
        
    if db_op.inventory_item_id and db_op.inventory_quantity > 0:
        inv = db.query(InventoryItem).filter(InventoryItem.id == db_op.inventory_item_id, InventoryItem.tenant_id == tid).first()
        if inv:
            if db_op.operation_type == "Сбор урожая":
                inv.quantity += db_op.inventory_quantity
            else:
                if inv.quantity < db_op.inventory_quantity:
                    raise HTTPException(status_code=400, detail=f"Недостаточно ТМЦ '{inv.name}' на складе! Требуется {db_op.inventory_quantity}, в наличии {inv.quantity}.")
                inv.quantity -= db_op.inventory_quantity
    
    db_op.status = "completed"
    db.commit()
    return {"message": "Операция завершена, склад обновлен"}

# ============================
# Livestock Schemas
# ============================

class AgroLivestockBase(BaseModel):
    animal_type: str
    tracking_type: str = "individual"
    tag_number: Optional[str] = None
    herd_name: Optional[str] = None
    quantity: int = 1
    birth_date: Optional[datetime] = None
    current_weight: float = 0.0
    status: str = "active"

class AgroLivestockResponse(AgroLivestockBase):
    id: int
    tenant_id: int
    class Config:
        orm_mode = True

# ============================
# Livestock Endpoints
# ============================

@router.get("/livestock", response_model=List[AgroLivestockResponse])
def get_livestock(tenant_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tid = _get_tenant_id(current_user, tenant_id)
    from ..models import AgroLivestock
    return db.query(AgroLivestock).filter(AgroLivestock.tenant_id == tid).all()

@router.post("/livestock", response_model=AgroLivestockResponse)
def create_livestock(livestock: AgroLivestockBase, tenant_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tid = _get_tenant_id(current_user, tenant_id)
    from ..models import AgroLivestock
    db_livestock = AgroLivestock(**livestock.dict(), tenant_id=tid)
    db.add(db_livestock)
    db.commit()
    db.refresh(db_livestock)
    return db_livestock

@router.post("/livestock/{id}/feed")
def feed_livestock(id: int, inventory_item_id: int, quantity: float, tenant_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tid = _get_tenant_id(current_user, tenant_id)
    from ..models import AgroLivestock, AgroLivestockFeed, InventoryItem
    db_livestock = db.query(AgroLivestock).filter(AgroLivestock.id == id, AgroLivestock.tenant_id == tid).first()
    if not db_livestock:
        raise HTTPException(status_code=404, detail="Животное/Стадо не найдено")
        
    inv = db.query(InventoryItem).filter(InventoryItem.id == inventory_item_id, InventoryItem.tenant_id == tid).first()
    if not inv or inv.quantity < quantity:
        raise HTTPException(status_code=400, detail="Недостаточно корма на складе")
        
    inv.quantity -= quantity
    
    feed_record = AgroLivestockFeed(
        tenant_id=tid,
        livestock_id=id,
        date=datetime.utcnow(),
        inventory_item_id=inventory_item_id,
        quantity=quantity
    )
    db.add(feed_record)
    db.commit()
    return {"message": "Корм успешно списан"}

@router.post("/livestock/{id}/sell")
def sell_livestock(id: int, amount: float, description: str = "Реализация КРС/МРС", tenant_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tid = _get_tenant_id(current_user, tenant_id)
    from ..models import AgroLivestock, FinanceTransaction
    db_livestock = db.query(AgroLivestock).filter(AgroLivestock.id == id, AgroLivestock.tenant_id == tid).first()
    if not db_livestock:
        raise HTTPException(status_code=404, detail="Животное/Стадо не найдено")
        
    db_livestock.status = "sold"
    
    fin_tx = FinanceTransaction(
        tenant_id=tid,
        type="income",
        amount=amount,
        category="Продажа товаров",
        description=f"{description} (ID: {id})",
        date=datetime.utcnow(),
        cash_register="materials"
    )
    db.add(fin_tx)
    db.commit()
    return {"message": "Животное реализовано, транзакция создана"}
