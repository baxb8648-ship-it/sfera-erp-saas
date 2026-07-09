from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Object, User, InventoryItem, MaterialConsumption
from ..schemas import ObjectCreate, ObjectResponse, MaterialConsumptionCreate, MaterialConsumptionResponse
from .auth import get_current_user
from ..telegram import send_telegram_notification
from ..utils.rbac import require_permission

router = APIRouter(prefix="/objects", tags=["Objects"])

@router.post("/", response_model=ObjectResponse)
def create_object(obj: ObjectCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), perm = Depends(require_permission("objects", "write"))):
    from ..database import current_tenant_id
    tid = current_tenant_id.get() or current_user.tenant_id or 1
    db_obj = Object(**obj.model_dump(), tenant_id=tid, owner_id=current_user.id)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    
    from ..services.audit import log_audit_action
    log_audit_action(
        db,
        current_user,
        "создание",
        "Объект",
        db_obj.id,
        db_obj.name,
        changes={"name": {"old": "—", "new": db_obj.name}}
    )
    return db_obj


@router.get("/", response_model=List[ObjectResponse])
def get_objects(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), perm = Depends(require_permission("objects", "read"))):
    q = db.query(Object)
    if current_user.role != "superadmin":
        q = q.filter(Object.tenant_id == current_user.tenant_id)
    if perm.own_only:
        q = q.filter(Object.owner_id == current_user.id)
    return q.offset(skip).limit(limit).all()


@router.get("/{obj_id}", response_model=ObjectResponse)
def get_object(obj_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), perm = Depends(require_permission("objects", "read"))):
    q = db.query(Object).filter(Object.id == obj_id)
    if current_user.role != "superadmin":
        q = q.filter(Object.tenant_id == current_user.tenant_id)
    if perm.own_only:
        q = q.filter(Object.owner_id == current_user.id)
    db_obj = q.first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Object not found")
    return db_obj

@router.patch("/{obj_id}/status", response_model=ObjectResponse)
def update_object_status(obj_id: int, status: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), perm = Depends(require_permission("objects", "write"))):
    q = db.query(Object).filter(Object.id == obj_id)
    if current_user.role != "superadmin":
        q = q.filter(Object.tenant_id == current_user.tenant_id)
    if perm.own_only:
        q = q.filter(Object.owner_id == current_user.id)
    db_obj = q.first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Object not found")
    
    old_status = db_obj.status
    db_obj.status = status
    db.commit()
    db.refresh(db_obj)
    
    from ..services.audit import log_audit_action
    log_audit_action(
        db,
        current_user,
        "обновление",
        "Объект",
        db_obj.id,
        db_obj.name,
        changes={"status": {"old": old_status, "new": status}}
    )
    
    try:
        msg = f"🔄 Объект <b>{db_obj.name}</b> (клиент: {db_obj.client_name or '—'}) переведен в статус: <b>{status}</b>"
        send_telegram_notification(msg, db)
    except Exception as e:
        print(f"Telegram notification error: {e}")
    return db_obj


@router.delete("/{obj_id}")
def delete_object(obj_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), perm = Depends(require_permission("objects", "delete"))):
    q = db.query(Object).filter(Object.id == obj_id)
    if current_user.role != "superadmin":
        q = q.filter(Object.tenant_id == current_user.tenant_id)
    if perm.own_only:
        q = q.filter(Object.owner_id == current_user.id)
    db_obj = q.first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Object not found")
    obj_name = db_obj.name
    obj_id_val = db_obj.id
    db.delete(db_obj)
    db.commit()
    
    from ..services.audit import log_audit_action
    log_audit_action(
        db,
        current_user,
        "удаление",
        "Объект",
        obj_id_val,
        obj_name,
        changes={"name": {"old": obj_name, "new": "—"}}
    )
    return {"message": "Object deleted successfully"}



@router.post("/{obj_id}/consume", response_model=MaterialConsumptionResponse)
def consume_material(
    obj_id: int, 
    consumption: MaterialConsumptionCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    q_obj = db.query(Object).filter(Object.id == obj_id)
    if current_user.role != "superadmin":
        q_obj = q_obj.filter(Object.tenant_id == current_user.tenant_id)
    db_obj = q_obj.first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Объект не найден или недоступен")
        
    inv_item = db.query(InventoryItem).filter(InventoryItem.id == consumption.inventory_id).first()
    if not inv_item:
        raise HTTPException(status_code=404, detail="Материал не найден на складе")
        
    if inv_item.quantity < consumption.quantity:
        raise HTTPException(
            status_code=400, 
            detail=f"Недостаточно '{inv_item.name}' на складе. Доступно: {inv_item.quantity} {inv_item.unit}"
        )
        
    inv_item.quantity -= consumption.quantity
    
    db_consumption = MaterialConsumption(
        object_id=obj_id,
        inventory_id=consumption.inventory_id,
        quantity=consumption.quantity
    )
    db.add(db_consumption)
    db.commit()
    db.refresh(db_consumption)
    try:
        msg = f"📦 На объекте <b>{db_obj.name}</b> списан материал: <b>{inv_item.name}</b> в количестве <b>{consumption.quantity} {inv_item.unit}</b>"
        send_telegram_notification(msg, db)
    except Exception as e:
        print(f"Telegram notification error: {e}")
    return db_consumption


@router.get("/{obj_id}/consumptions", response_model=List[MaterialConsumptionResponse])
def get_object_consumptions(
    obj_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    q_obj = db.query(Object).filter(Object.id == obj_id)
    if current_user.role != "superadmin":
        q_obj = q_obj.filter(Object.tenant_id == current_user.tenant_id)
    db_obj = q_obj.first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Объект не найден или недоступен")
    return db_obj.material_consumptions


@router.delete("/consumptions/{consumption_id}")
def delete_material_consumption(
    consumption_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    db_consumption = db.query(MaterialConsumption).filter(MaterialConsumption.id == consumption_id).first()
    if not db_consumption:
        raise HTTPException(status_code=404, detail="Запись о списании не найдена")
        
    db_obj = db.query(Object).filter(Object.id == db_consumption.object_id).first()
    if current_user.role != "superadmin" and db_obj and db_obj.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Нет прав для отмены списания по данному объекту")
        
    inv_item = db.query(InventoryItem).filter(InventoryItem.id == db_consumption.inventory_id).first()
    if inv_item:
        inv_item.quantity += db_consumption.quantity
        
    db.delete(db_consumption)
    db.commit()
    return {"message": "Списание успешно отменено, материалы возвращены на склад"}


