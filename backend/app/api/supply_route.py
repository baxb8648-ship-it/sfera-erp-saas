from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import uuid

from ..database import get_db
from ..models import SupplyOrder, VehiclePass, QualityControl, User, InventoryItem
from ..schemas import (
    SupplyOrderCreate, SupplyOrderResponse,
    VehiclePassCreate, VehiclePassResponse,
    QualityControlCreate, QualityControlResponse
)
from .auth import get_current_user
from ..utils.rbac import require_permission
from ..websocket_manager import manager

router = APIRouter(prefix="/supply", tags=["Supply"])

@router.get("/", response_model=List[SupplyOrderResponse])
def get_supply_orders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), perm = Depends(require_permission("inventory", "read"))):
    orders = db.query(SupplyOrder).filter(SupplyOrder.tenant_id == current_user.tenant_id).offset(skip).limit(limit).all()
    
    # Enrich with names
    result = []
    for order in orders:
        o_dict = {col.name: getattr(order, col.name) for col in order.__table__.columns}
        if order.creator:
            o_dict["creator_name"] = order.creator.username
        if order.object:
            o_dict["object_name"] = order.object.name
        result.append(o_dict)
    return result

@router.post("/", response_model=SupplyOrderResponse)
def create_supply_order(order: SupplyOrderCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), perm = Depends(require_permission("inventory", "write"))):
    db_order = SupplyOrder(
        **order.model_dump(),
        tenant_id=current_user.tenant_id,
        creator_id=current_user.id
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    
    background_tasks.add_task(manager.broadcast, {
        "type": "info",
        "message": f"📦 Новая заявка на снабжение: {db_order.item_name} ({db_order.quantity} шт)",
        "refetchKey": "supply_orders"
    })
    
    # Enrich
    o_dict = {col.name: getattr(db_order, col.name) for col in db_order.__table__.columns}
    o_dict["creator_name"] = current_user.username
    if db_order.object:
        o_dict["object_name"] = db_order.object.name
    return o_dict

@router.put("/{order_id}/status")
def update_order_status(order_id: int, status: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), perm = Depends(require_permission("inventory", "write"))):
    db_order = db.query(SupplyOrder).filter(SupplyOrder.id == order_id, SupplyOrder.tenant_id == current_user.tenant_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    old_status = db_order.status
    db_order.status = status
    
    # Если статус меняется на "received", нужно оприходовать товар на склад
    if status == "received" and old_status != "received":
        # Ищем товар на складе или создаем новый
        inv_item = db.query(InventoryItem).filter(
            InventoryItem.tenant_id == current_user.tenant_id,
            InventoryItem.name == db_order.item_name
        ).first()
        
        if inv_item:
            inv_item.quantity += db_order.quantity
        else:
            inv_item = InventoryItem(
                tenant_id=current_user.tenant_id,
                name=db_order.item_name,
                quantity=db_order.quantity,
                category="Материалы" # Можно улучшить
            )
            db.add(inv_item)
            
        background_tasks.add_task(manager.broadcast, {
            "type": "success",
            "message": f"📦 Товар оприходован на склад: {db_order.item_name} (+{db_order.quantity})",
            "refetchKey": "inventory"
        })
        
    db.commit()
    
    background_tasks.add_task(manager.broadcast, {
        "type": "info",
        "message": f"🔄 Статус заявки '{db_order.item_name}' изменен на '{status}'",
        "refetchKey": "supply_orders"
    })
    
    return {"message": "Status updated successfully", "status": status}

# --- Пропуска ---

@router.post("/{order_id}/pass", response_model=VehiclePassResponse)
def generate_vehicle_pass(order_id: int, vpass: VehiclePassCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_order = db.query(SupplyOrder).filter(SupplyOrder.id == order_id, SupplyOrder.tenant_id == current_user.tenant_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    pass_code = str(uuid.uuid4()).split("-")[0].upper()
    db_pass = VehiclePass(
        **vpass.model_dump(),
        tenant_id=current_user.tenant_id,
        pass_code=pass_code
    )
    db.add(db_pass)
    db.commit()
    db.refresh(db_pass)
    return db_pass

@router.get("/{order_id}/pass", response_model=List[VehiclePassResponse])
def get_vehicle_passes(order_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(VehiclePass).filter(VehiclePass.supply_order_id == order_id, VehiclePass.tenant_id == current_user.tenant_id).all()

# --- ВКК (Входной контроль) ---

@router.post("/{order_id}/quality", response_model=QualityControlResponse)
def submit_quality_control(order_id: int, qc: QualityControlCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_order = db.query(SupplyOrder).filter(SupplyOrder.id == order_id, SupplyOrder.tenant_id == current_user.tenant_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    db_qc = QualityControl(
        **qc.model_dump(),
        tenant_id=current_user.tenant_id,
        inspector_id=current_user.id
    )
    db.add(db_qc)
    db.commit()
    db.refresh(db_qc)
    
    res = {col.name: getattr(db_qc, col.name) for col in db_qc.__table__.columns}
    res["inspector_name"] = current_user.username
    return res
