# -*- coding: utf-8 -*-
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from ..services.raskroy_engine import RaskroyOptimizer, SheetSpec, PartSpec

router = APIRouter(prefix="/api/furniture", tags=["Furniture"])

class PartSpecModel(BaseModel):
    part_id: str
    name: str
    width: float
    height: float
    count: int = 1
    can_rotate: bool = False
    edge_banding: str = ""
    notes: str = ""

class SheetSpecModel(BaseModel):
    width: float = 2800.0
    height: float = 2070.0
    thickness: float = 16.0
    kerf: float = 4.0
    trim_top: float = 10.0
    trim_bottom: float = 10.0
    trim_left: float = 10.0
    trim_right: float = 10.0
    material_name: str = "ЛДСП 16мм"

class FurnitureRaskroyRequest(BaseModel):
    sheet: SheetSpecModel
    parts: List[PartSpecModel]
    min_reusable_side: float = 400.0

@router.post("/raskroy", summary="Calculate optimal 2D cutting map (raskroy)")
async def calculate_raskroy(req: FurnitureRaskroyRequest):
    try:
        # Convert request models to dataclasses
        sheet_spec = SheetSpec(
            width=req.sheet.width,
            height=req.sheet.height,
            thickness=req.sheet.thickness,
            kerf=req.sheet.kerf,
            trim_top=req.sheet.trim_top,
            trim_bottom=req.sheet.trim_bottom,
            trim_left=req.sheet.trim_left,
            trim_right=req.sheet.trim_right,
            material_name=req.sheet.material_name
        )
        
        parts_list = []
        for p in req.parts:
            parts_list.append(PartSpec(
                part_id=p.part_id,
                name=p.name,
                width=p.width,
                height=p.height,
                count=p.count,
                can_rotate=p.can_rotate,
                edge_banding=p.edge_banding,
                notes=p.notes
            ))
            
        optimizer = RaskroyOptimizer(sheet_spec=sheet_spec, min_reusable_side=req.min_reusable_side)
        result = optimizer.optimize(parts_list)
        
        return result.to_dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from sqlalchemy.orm import Session
from fastapi import Depends
from ..database import get_db
from ..models import FurnitureProduct, FurnitureBOM, FurnitureOrder, FurnitureOrderOperation, InventoryItem, User
from .auth import get_current_user
from datetime import datetime

# ============================
# Phase 2.1: MRP / BOM Schemas
# ============================

class FurnitureProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    weight: float = 0.0
    image_url: Optional[str] = None
    pdf_url: Optional[str] = None
    base_price: float = 0.0

class FurnitureProductResponse(FurnitureProductBase):
    id: int
    tenant_id: int
    cost_price: float = 0.0 # Рассчитывается динамически
    class Config:
        from_attributes = True

class FurnitureBOMBase(BaseModel):
    inventory_item_id: int
    quantity: float
    operation_stage: Optional[str] = None

class FurnitureOrderBase(BaseModel):
    product_id: int
    quantity: int = 1

# ============================
# Endpoints
# ============================

def _get_tenant_id(current_user: User, tenant_id: Optional[int] = None) -> int:
    if current_user.role == "superadmin" and tenant_id:
        return tenant_id
    return current_user.tenant_id or 1

@router.get("/products", response_model=List[FurnitureProductResponse])
def get_products(tenant_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tid = _get_tenant_id(current_user, tenant_id)
    products = db.query(FurnitureProduct).filter(FurnitureProduct.tenant_id == tid).all()
    res = []
    for p in products:
        boms = db.query(FurnitureBOM).filter(FurnitureBOM.product_id == p.id).all()
        cost = 0.0
        for b in boms:
            if b.inventory:
                cost += b.quantity * b.inventory.price
        
        p_dict = p.__dict__.copy()
        p_dict["cost_price"] = cost
        res.append(p_dict)
    return res

@router.post("/products", response_model=FurnitureProductResponse)
def create_product(prod: FurnitureProductBase, tenant_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tid = _get_tenant_id(current_user, tenant_id)
    db_prod = FurnitureProduct(**prod.dict(), tenant_id=tid)
    db.add(db_prod)
    db.commit()
    db.refresh(db_prod)
    
    p_dict = db_prod.__dict__.copy()
    p_dict["cost_price"] = 0.0
    return p_dict

@router.post("/products/{id}/bom")
def add_bom_item(id: int, bom: FurnitureBOMBase, tenant_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tid = _get_tenant_id(current_user, tenant_id)
    db_bom = FurnitureBOM(**bom.dict(), product_id=id, tenant_id=tid)
    db.add(db_bom)
    db.commit()
    return {"message": "BOM updated"}

@router.get("/orders")
def get_orders(tenant_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tid = _get_tenant_id(current_user, tenant_id)
    orders = db.query(FurnitureOrder).filter(FurnitureOrder.tenant_id == tid).all()
    res = []
    for o in orders:
        ops = db.query(FurnitureOrderOperation).filter(FurnitureOrderOperation.order_id == o.id).all()
        o_dict = {
            "id": o.id,
            "product_name": o.product.name if o.product else "Unknown",
            "quantity": o.quantity,
            "status": o.status,
            "operations": [{"id": op.id, "name": op.operation_name, "status": op.status} for op in ops]
        }
        res.append(o_dict)
    return res

@router.post("/orders")
def create_order(order: FurnitureOrderBase, tenant_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tid = _get_tenant_id(current_user, tenant_id)
    db_order = FurnitureOrder(**order.dict(), tenant_id=tid, created_at=datetime.utcnow())
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    
    stages = ["Раскрой", "Кромка", "Присадка", "Сварка", "Покраска", "Сборка", "Упаковка", "ОТК"]
    for s in stages:
        op = FurnitureOrderOperation(
            tenant_id=tid,
            order_id=db_order.id,
            operation_name=s,
            status="pending"
        )
        db.add(op)
    db.commit()
    
    return {"message": "Заказ и маршрутный лист созданы", "order_id": db_order.id}

@router.post("/operations/{op_id}/complete")
def complete_operation(op_id: int, tenant_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tid = _get_tenant_id(current_user, tenant_id)
    op = db.query(FurnitureOrderOperation).filter(FurnitureOrderOperation.id == op_id, FurnitureOrderOperation.tenant_id == tid).first()
    if not op:
        raise HTTPException(status_code=404, detail="Операция не найдена")
        
    if op.status == "completed":
        raise HTTPException(status_code=400, detail="Уже завершено")
        
    order = op.order
    if order and order.product_id:
        boms = db.query(FurnitureBOM).filter(FurnitureBOM.product_id == order.product_id).all()
        for b in boms:
            if b.operation_stage == op.operation_name:
                total_qty_needed = b.quantity * order.quantity
                if b.inventory:
                    b.inventory.quantity -= total_qty_needed
    
    op.status = "completed"
    op.completed_at = datetime.utcnow()
    db.commit()
    
    return {"message": f"Операция {op.operation_name} завершена. ТМЦ списаны согласно BOM."}
