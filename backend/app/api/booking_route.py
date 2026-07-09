from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from ..database import get_db
from ..models import BookingCategory, BookingService, TechCardItem, Appointment, InventoryItem, User
from ..notifications import send_booking_notification
from .auth import get_current_user

router = APIRouter(prefix="/booking", tags=["Booking Engine (Phase 9.1)"])

# ----------------- SCHEMAS -----------------

class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class CategoryResponse(CategoryBase):
    id: int
    tenant_id: int
    class Config:
        orm_mode = True

class TechCardBase(BaseModel):
    inventory_id: int
    quantity: float

class TechCardResponse(TechCardBase):
    id: int
    inventory_name: Optional[str] = None
    inventory_unit: Optional[str] = None
    class Config:
        orm_mode = True

class ServiceBase(BaseModel):
    name: str
    category_id: Optional[int] = None
    price: float = 0.0
    duration_minutes: int = 60
    is_active: bool = True

class ServiceCreate(ServiceBase):
    tech_cards: List[TechCardBase] = []

class ServiceResponse(ServiceBase):
    id: int
    tenant_id: int
    tech_cards: List[TechCardResponse] = []
    class Config:
        orm_mode = True

class AppointmentBase(BaseModel):
    service_id: int
    master_id: int
    client_name: str
    client_phone: Optional[str] = None
    datetime_start: datetime
    datetime_end: datetime
    notes: Optional[str] = None

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentResponse(AppointmentBase):
    id: int
    tenant_id: int
    status: str
    created_at: datetime
    class Config:
        orm_mode = True

# ----------------- ROUTES -----------------

def _get_tenant_id(current_user: User, tenant_id: Optional[int] = None) -> int:
    if current_user.role == "superadmin" and tenant_id:
        return tenant_id
    return current_user.tenant_id or 1

@router.get("/categories", response_model=List[CategoryResponse])
def get_categories(tenant_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tid = _get_tenant_id(current_user, tenant_id)
    return db.query(BookingCategory).filter(BookingCategory.tenant_id == tid).all()

@router.post("/categories", response_model=CategoryResponse)
def create_category(category: CategoryBase, tenant_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tid = _get_tenant_id(current_user, tenant_id)
    db_cat = BookingCategory(**category.dict(), tenant_id=tid)
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat

@router.get("/services", response_model=List[ServiceResponse])
def get_services(tenant_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tid = _get_tenant_id(current_user, tenant_id)
    return db.query(BookingService).filter(BookingService.tenant_id == tid).all()

@router.post("/services", response_model=ServiceResponse)
def create_service(service: ServiceCreate, tenant_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tid = _get_tenant_id(current_user, tenant_id)
    db_srv = BookingService(
        name=service.name,
        category_id=service.category_id,
        price=service.price,
        duration_minutes=service.duration_minutes,
        is_active=service.is_active,
        tenant_id=tid
    )
    db.add(db_srv)
    db.commit()
    db.refresh(db_srv)
    
    for tc in service.tech_cards:
        db_tc = TechCardItem(
            service_id=db_srv.id,
            inventory_id=tc.inventory_id,
            quantity=tc.quantity,
            tenant_id=tid
        )
        db.add(db_tc)
    db.commit()
    db.refresh(db_srv)
    return db_srv

@router.get("/appointments", response_model=List[AppointmentResponse])
def get_appointments(tenant_id: Optional[int] = None, start: Optional[datetime] = None, end: Optional[datetime] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tid = _get_tenant_id(current_user, tenant_id)
    query = db.query(Appointment).filter(Appointment.tenant_id == tid)
    if start:
        query = query.filter(Appointment.datetime_start >= start)
    if end:
        query = query.filter(Appointment.datetime_end <= end)
    return query.all()

@router.post("/appointments", response_model=AppointmentResponse)
def create_appointment(appointment: AppointmentCreate, tenant_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tid = _get_tenant_id(current_user, tenant_id)
    db_app = Appointment(**appointment.dict(), tenant_id=tid)
    db.add(db_app)
    db.commit()
    db.refresh(db_app)
    
    try:
        send_booking_notification(db_app, db, action="new")
    except Exception as e:
        print(f"Error sending booking notification: {e}")
        
    return db_app

@router.post("/appointments/{appointment_id}/complete")
def complete_appointment(appointment_id: int, tenant_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tid = _get_tenant_id(current_user, tenant_id)
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id, Appointment.tenant_id == tid).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    
    if appointment.status == "completed":
        raise HTTPException(status_code=400, detail="Запись уже завершена")
        
    appointment.status = "completed"
    
    tech_cards = db.query(TechCardItem).filter(TechCardItem.service_id == appointment.service_id).all()
    
    deducted_items = []
    for card in tech_cards:
        inv_item = db.query(InventoryItem).filter(InventoryItem.id == card.inventory_id, InventoryItem.tenant_id == tid).first()
        if inv_item:
            if inv_item.quantity < card.quantity:
                pass
            inv_item.quantity -= card.quantity
            deducted_items.append({"name": inv_item.name, "amount_deducted": card.quantity, "remaining": inv_item.quantity})
            
    db.commit()
    
    try:
        send_booking_notification(appointment, db, action="completed")
    except Exception as e:
        print(f"Error sending booking notification: {e}")
        
    return {
        "status": "success",
        "appointment_id": appointment.id,
        "items_deducted": deducted_items
    }
