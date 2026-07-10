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
from ..models import (
    FurnitureProduct, FurnitureBOM, FurnitureOrder, FurnitureOrderOperation,
    FurnitureOrderFitting, FurnitureOrderDetail, InventoryItem, User
)
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

class FurnitureFittingCreate(BaseModel):
    fitting_name: str
    article: Optional[str] = None
    supplier: Optional[str] = None
    quantity: int = 1
    unit_price: float = 0.0

class FurnitureDetailCreate(BaseModel):
    detail_name: str
    length_mm: float
    width_mm: float
    quantity: int = 1
    edge_top: str = "none"
    edge_bottom: str = "none"
    edge_left: str = "none"
    edge_right: str = "none"

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
        fittings = db.query(FurnitureOrderFitting).filter(FurnitureOrderFitting.order_id == o.id).all()
        details = db.query(FurnitureOrderDetail).filter(FurnitureOrderDetail.order_id == o.id).all()

        total_edge_meters = sum(d.calc_linear_meters for d in details)
        total_fittings_cost = sum((f.quantity * f.unit_price) for f in fittings)

        o_dict = {
            "id": o.id,
            "product_name": o.product.name if o.product else "Unknown",
            "quantity": o.quantity,
            "status": o.status,
            "total_edge_meters": round(total_edge_meters, 2),
            "total_fittings_cost": round(total_fittings_cost, 2),
            "operations": [{"id": op.id, "name": op.operation_name, "status": op.status} for op in ops],
            "fittings": [
                {
                    "id": f.id,
                    "fitting_name": f.fitting_name,
                    "article": f.article or "",
                    "supplier": f.supplier or "",
                    "quantity": f.quantity,
                    "unit_price": f.unit_price,
                    "status": f.status
                } for f in fittings
            ],
            "details": [
                {
                    "id": d.id,
                    "detail_name": d.detail_name,
                    "length_mm": d.length_mm,
                    "width_mm": d.width_mm,
                    "quantity": d.quantity,
                    "edge_top": d.edge_top,
                    "edge_bottom": d.edge_bottom,
                    "edge_left": d.edge_left,
                    "edge_right": d.edge_right,
                    "calc_linear_meters": round(d.calc_linear_meters, 2)
                } for d in details
            ]
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

@router.post("/orders/{order_id}/fittings")
def add_order_fitting(order_id: int, fitting: FurnitureFittingCreate, tenant_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tid = _get_tenant_id(current_user, tenant_id)
    order = db.query(FurnitureOrder).filter(FurnitureOrder.id == order_id, FurnitureOrder.tenant_id == tid).first()
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    
    db_fit = FurnitureOrderFitting(
        tenant_id=tid,
        order_id=order_id,
        fitting_name=fitting.fitting_name,
        article=fitting.article,
        supplier=fitting.supplier,
        quantity=fitting.quantity,
        unit_price=fitting.unit_price,
        status="pending"
    )
    db.add(db_fit)
    db.commit()
    db.refresh(db_fit)
    return {"message": "Фурнитура добавлена к заказу", "fitting_id": db_fit.id}

@router.patch("/fittings/{fitting_id}/status")
def update_fitting_status(fitting_id: int, status: str, tenant_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tid = _get_tenant_id(current_user, tenant_id)
    fit = db.query(FurnitureOrderFitting).filter(FurnitureOrderFitting.id == fitting_id, FurnitureOrderFitting.tenant_id == tid).first()
    if not fit:
        raise HTTPException(status_code=404, detail="Позиция фурнитуры не найдена")
    if status not in ("pending", "ordered", "in_stock", "issued"):
        raise HTTPException(status_code=400, detail="Недопустимый статус комплектации")
    fit.status = status
    db.commit()
    return {"message": "Статус фурнитуры обновлен", "new_status": status}

@router.post("/orders/{order_id}/details")
def add_order_detail(order_id: int, detail: FurnitureDetailCreate, tenant_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tid = _get_tenant_id(current_user, tenant_id)
    order = db.query(FurnitureOrder).filter(FurnitureOrder.id == order_id, FurnitureOrder.tenant_id == tid).first()
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    # Авторасчет погонных метров кромки
    top_m = (detail.length_mm / 1000.0) if detail.edge_top != "none" else 0.0
    bottom_m = (detail.length_mm / 1000.0) if detail.edge_bottom != "none" else 0.0
    left_m = (detail.width_mm / 1000.0) if detail.edge_left != "none" else 0.0
    right_m = (detail.width_mm / 1000.0) if detail.edge_right != "none" else 0.0
    calc_meters = round((top_m + bottom_m + left_m + right_m) * detail.quantity, 3)

    db_det = FurnitureOrderDetail(
        tenant_id=tid,
        order_id=order_id,
        detail_name=detail.detail_name,
        length_mm=detail.length_mm,
        width_mm=detail.width_mm,
        quantity=detail.quantity,
        edge_top=detail.edge_top,
        edge_bottom=detail.edge_bottom,
        edge_left=detail.edge_left,
        edge_right=detail.edge_right,
        calc_linear_meters=calc_meters
    )
    db.add(db_det)
    db.commit()
    db.refresh(db_det)
    return {
        "message": "Деталь и расчёт кромки добавлены",
        "detail_id": db_det.id,
        "calc_linear_meters": calc_meters
    }

