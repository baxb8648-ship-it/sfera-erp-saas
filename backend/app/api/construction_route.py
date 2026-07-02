from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
import os

from ..database import get_db
from ..models import Object, DailyReport, ConstructionEstimate, MaterialConsumption, InventoryItem, User, Tenant
from .auth import get_current_user

router = APIRouter(prefix="/construction", tags=["Construction Module"])

templates_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "templates")
templates = Jinja2Templates(directory=templates_dir)

from ..database import get_db
from ..models import Object, DailyReport, ConstructionEstimate, MaterialConsumption, InventoryItem, User
from .auth import get_current_user

router = APIRouter(prefix="/construction", tags=["Construction Module"])

class EstimateItemSchema(BaseModel):
    inventory_id: int
    planned_quantity: float
    unit_price: float = 0.0

class EstimateResponseSchema(BaseModel):
    id: int
    inventory_id: int
    inventory_name: str
    inventory_unit: str
    planned_quantity: float
    actual_quantity: float
    unit_price: float

class DailyReportSchema(BaseModel):
    date: str
    text: Optional[str] = None
    weather_temp: Optional[str] = None
    weather_conditions: Optional[str] = None
    geo_lat: Optional[float] = None
    geo_lon: Optional[float] = None
    photos: List[str] = []

class DailyReportResponseSchema(BaseModel):
    id: int
    date: datetime
    text: Optional[str]
    weather_temp: Optional[str]
    weather_conditions: Optional[str]
    geo_lat: Optional[float]
    geo_lon: Optional[float]
    photos: List[str]
    author_name: Optional[str]

@router.get("/objects/{object_id}/estimate", response_model=List[EstimateResponseSchema])
def get_object_estimate(object_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Object).filter(Object.id == object_id)
    if current_user.role != "superadmin":
        q = q.filter(Object.tenant_id == current_user.tenant_id)
    obj = q.first()
    if not obj:
        raise HTTPException(status_code=404, detail="Object not found")

    estimates = db.query(ConstructionEstimate).filter(ConstructionEstimate.object_id == object_id).all()
    
    consumptions = db.query(
        MaterialConsumption.inventory_id,
        func.sum(MaterialConsumption.quantity).label('total')
    ).filter(MaterialConsumption.object_id == object_id).group_by(MaterialConsumption.inventory_id).all()
    
    consumption_map = {c.inventory_id: c.total for c in consumptions}
    
    result = []
    for est in estimates:
        result.append({
            "id": est.id,
            "inventory_id": est.inventory_id,
            "inventory_name": est.inventory_name,
            "inventory_unit": est.inventory_unit,
            "planned_quantity": est.planned_quantity,
            "actual_quantity": consumption_map.get(est.inventory_id, 0.0),
            "unit_price": est.unit_price
        })
    return result

@router.post("/objects/{object_id}/estimate")
def add_estimate_item(object_id: int, payload: EstimateItemSchema, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Object).filter(Object.id == object_id)
    if current_user.role != "superadmin":
        q = q.filter(Object.tenant_id == current_user.tenant_id)
    obj = q.first()
    if not obj:
        raise HTTPException(status_code=404, detail="Object not found")
        
    q_inv = db.query(InventoryItem).filter(InventoryItem.id == payload.inventory_id)
    if current_user.role != "superadmin":
        q_inv = q_inv.filter(InventoryItem.tenant_id == current_user.tenant_id)
    inv = q_inv.first()
    if not inv:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    est = db.query(ConstructionEstimate).filter(
        ConstructionEstimate.object_id == object_id,
        ConstructionEstimate.inventory_id == payload.inventory_id
    ).first()
    
    if est:
        est.planned_quantity = payload.planned_quantity
        est.unit_price = payload.unit_price
    else:
        from ..database import current_tenant_id
        tid = obj.tenant_id or current_tenant_id.get() or current_user.tenant_id or 1
        est = ConstructionEstimate(
            tenant_id=tid,
            object_id=object_id,
            inventory_id=payload.inventory_id,
            planned_quantity=payload.planned_quantity,
            unit_price=payload.unit_price
        )
        db.add(est)
        
    db.commit()
    return {"status": "success"}

@router.get("/objects/{object_id}/daily-reports", response_model=List[DailyReportResponseSchema])
def get_daily_reports(object_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    reports = db.query(DailyReport).filter(DailyReport.object_id == object_id).order_by(DailyReport.date.desc()).all()
    res = []
    for r in reports:
        res.append({
            "id": r.id,
            "date": r.date,
            "text": r.text,
            "weather_temp": r.weather_temp,
            "weather_conditions": r.weather_conditions,
            "geo_lat": r.geo_lat,
            "geo_lon": r.geo_lon,
            "photos": r.photos if r.photos else [],
            "author_name": r.username
        })
    return res

@router.post("/objects/{object_id}/daily-reports")
def create_daily_report(object_id: int, payload: DailyReportSchema, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Object).filter(Object.id == object_id)
    if current_user.role != "superadmin":
        q = q.filter(Object.tenant_id == current_user.tenant_id)
    obj = q.first()
    if not obj:
        raise HTTPException(status_code=404, detail="Object not found")
        
    try:
        dt = datetime.fromisoformat(payload.date.replace('Z', '+00:00')) if payload.date else datetime.utcnow()
    except:
        dt = datetime.utcnow()
    
    from ..database import current_tenant_id
    tid = obj.tenant_id or current_tenant_id.get() or current_user.tenant_id or 1
    report = DailyReport(
        tenant_id=tid,
        object_id=object_id,
        user_id=current_user.id,
        date=dt,
        text=payload.text,
        weather_temp=payload.weather_temp,
        weather_conditions=payload.weather_conditions,
        geo_lat=payload.geo_lat,
        geo_lon=payload.geo_lon,
        photos=payload.photos
    )
    db.add(report)
    db.commit()
    return {"status": "success", "id": report.id}

@router.post("/objects/{object_id}/generate-ks2")
def generate_ks2(object_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Object).filter(Object.id == object_id)
    if current_user.role != "superadmin":
        q = q.filter(Object.tenant_id == current_user.tenant_id)
    obj = q.first()
    if not obj:
        raise HTTPException(status_code=404, detail="Object not found")
        
    tenant = db.query(Tenant).filter(Tenant.id == (obj.tenant_id or current_user.tenant_id or 1)).first()
    
    estimates = db.query(ConstructionEstimate).filter(ConstructionEstimate.object_id == object_id).all()
    consumptions = db.query(
        MaterialConsumption.inventory_id,
        func.sum(MaterialConsumption.quantity).label('total')
    ).filter(MaterialConsumption.object_id == object_id).group_by(MaterialConsumption.inventory_id).all()
    
    consumption_map = {c.inventory_id: c.total for c in consumptions}

    items = []
    total_sum = 0
    for est in estimates:
        fact = consumption_map.get(est.inventory_id, 0.0)
        if fact > 0:
            total = fact * est.unit_price
            total_sum += total
            items.append({
                "name": est.inventory_name,
                "unit": est.inventory_unit,
                "planned_quantity": est.planned_quantity,
                "actual_quantity": fact,
                "price": est.unit_price,
                "total": total
            })
            
    context = {
        "client_name": obj.client_name if obj.client_name else "Неизвестно",
        "company_name": tenant.name if tenant else "Подрядчик",
        "object_name": obj.name,
        "date": datetime.now().strftime("%d.%m.%Y"),
        "items": items,
        "total_sum": total_sum
    }
    
    template = templates.get_template("ks2.html")
    html_content = template.render(context)
    
    return {"status": "success", "html": html_content, "message": "Акт КС-2 успешно сгенерирован"}

@router.post("/objects/{object_id}/generate-ks3")
def generate_ks3(object_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Object).filter(Object.id == object_id)
    if current_user.role != "superadmin":
        q = q.filter(Object.tenant_id == current_user.tenant_id)
    obj = q.first()
    if not obj:
        raise HTTPException(status_code=404, detail="Object not found")
        
    tenant = db.query(Tenant).filter(Tenant.id == (obj.tenant_id or current_user.tenant_id or 1)).first()
    
    estimates = db.query(ConstructionEstimate).filter(ConstructionEstimate.object_id == object_id).all()
    consumptions = db.query(
        MaterialConsumption.inventory_id,
        func.sum(MaterialConsumption.quantity).label('total')
    ).filter(MaterialConsumption.object_id == object_id).group_by(MaterialConsumption.inventory_id).all()
    
    consumption_map = {c.inventory_id: c.total for c in consumptions}

    total_sum = 0
    for est in estimates:
        fact = consumption_map.get(est.inventory_id, 0.0)
        total_sum += fact * est.unit_price
            
    context = {
        "client_name": obj.client_name if obj.client_name else "Неизвестно",
        "company_name": tenant.name if tenant else "Подрядчик",
        "object_name": obj.name,
        "date": datetime.now().strftime("%d.%m.%Y"),
        "total_sum": total_sum
    }
    
    template = templates.get_template("ks3.html")
    html_content = template.render(context)
    
    return {"status": "success", "html": html_content, "message": "Справка КС-3 успешно сгенерирована"}
