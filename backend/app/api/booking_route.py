from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from ..database import get_db
from ..models import BookingCategory, BookingService, TechCardItem, Appointment, InventoryItem, User, AuditLog, MaterialConsumption
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

class PublicAppointmentCreate(BaseModel):
    tenant_id: int
    service_id: int
    master_id: int
    client_name: str
    client_phone: Optional[str] = None
    datetime_start: datetime
    datetime_end: datetime
    notes: Optional[str] = None

class AppointmentUpdate(BaseModel):
    service_id: Optional[int] = None
    master_id: Optional[int] = None
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    datetime_start: Optional[datetime] = None
    datetime_end: Optional[datetime] = None
    notes: Optional[str] = None
    status: Optional[str] = None

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
            inv_item.quantity -= card.quantity
            
            # Логируем списание в материалах
            mat_cons = MaterialConsumption(
                tenant_id=tid,
                inventory_id=card.inventory_id,
                quantity=card.quantity
            )
            db.add(mat_cons)
            
            # Логируем списание в AuditLog
            log_entry = AuditLog(
                tenant_id=tid,
                action="Автоматическое списание ТМЦ по техкарте услуги",
                details=f"Списано {card.quantity} {inv_item.unit} ТМЦ '{inv_item.name}' при завершении записи #{appointment.id} клиента {appointment.client_name}."
            )
            db.add(log_entry)
            
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

# ----------------- PUBLIC ROUTES (NO AUTH) -----------------

@router.get("/public/services", response_model=List[ServiceResponse])
def get_public_services(tenant_id: int, db: Session = Depends(get_db)):
    return db.query(BookingService).filter(BookingService.tenant_id == tenant_id, BookingService.is_active == True).all()

class MasterResponse(BaseModel):
    id: int
    username: str
    class Config:
        orm_mode = True

@router.get("/public/masters", response_model=List[MasterResponse])
def get_public_masters(tenant_id: int, db: Session = Depends(get_db)):
    return db.query(User).filter(User.tenant_id == tenant_id, User.is_active == 1).all()

@router.post("/public/appointments", response_model=AppointmentResponse)
def create_public_appointment(appointment: PublicAppointmentCreate, db: Session = Depends(get_db)):
    srv = db.query(BookingService).filter(
        BookingService.id == appointment.service_id, 
        BookingService.tenant_id == appointment.tenant_id
    ).first()
    if not srv:
        raise HTTPException(status_code=400, detail="Услуга не найдена")
        
    db_app = Appointment(
        tenant_id=appointment.tenant_id,
        service_id=appointment.service_id,
        master_id=appointment.master_id,
        client_name=appointment.client_name,
        client_phone=appointment.client_phone,
        datetime_start=appointment.datetime_start,
        datetime_end=appointment.datetime_end,
        notes=appointment.notes,
        status="new"
    )
    db.add(db_app)
    db.commit()
    db.refresh(db_app)
    
    try:
        send_booking_notification(db_app, db, action="new")
    except Exception as e:
        print(f"Error sending booking notification: {e}")
        
    return db_app

class PublicAppointmentResponse(BaseModel):
    master_id: int
    datetime_start: datetime
    datetime_end: datetime
    class Config:
        orm_mode = True

@router.get("/public/appointments", response_model=List[PublicAppointmentResponse])
def get_public_appointments(tenant_id: int, date: str, db: Session = Depends(get_db)):
    try:
        dt = datetime.strptime(date, "%Y-%m-%d")
    except:
        raise HTTPException(status_code=400, detail="Неверный формат даты YYYY-MM-DD")
    
    start_day = datetime(dt.year, dt.month, dt.day, 0, 0, 0)
    end_day = datetime(dt.year, dt.month, dt.day, 23, 59, 59)
    
    return db.query(Appointment).filter(
        Appointment.tenant_id == tenant_id,
        Appointment.datetime_start >= start_day,
        Appointment.datetime_end <= end_day
    ).all()

# ----------------- ADMIN/MANAGEMENT ROUTES (WITH AUTH) -----------------

@router.post("/appointments/{appointment_id}/confirm", response_model=AppointmentResponse)
def confirm_appointment(appointment_id: int, tenant_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tid = _get_tenant_id(current_user, tenant_id)
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id, Appointment.tenant_id == tid).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Запись не найдена")
        
    appointment.status = "confirmed"
    db.commit()
    db.refresh(appointment)
    
    try:
        send_booking_notification(appointment, db, action="confirmed")
    except Exception as e:
        print(f"Error sending booking notification: {e}")
        
    return appointment

@router.post("/appointments/{appointment_id}/cancel", response_model=AppointmentResponse)
def cancel_appointment(appointment_id: int, tenant_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tid = _get_tenant_id(current_user, tenant_id)
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id, Appointment.tenant_id == tid).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Запись не найдена")
        
    appointment.status = "cancelled"
    db.commit()
    db.refresh(appointment)
    
    try:
        send_booking_notification(appointment, db, action="cancelled")
    except Exception as e:
        print(f"Error sending booking notification: {e}")
        
    return appointment

@router.put("/appointments/{appointment_id}", response_model=AppointmentResponse)
def update_appointment(appointment_id: int, appointment_data: AppointmentUpdate, tenant_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tid = _get_tenant_id(current_user, tenant_id)
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id, Appointment.tenant_id == tid).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Запись не найдена")
        
    for key, value in appointment_data.dict(exclude_unset=True).items():
        setattr(appointment, key, value)
        
    db.commit()
    db.refresh(appointment)
    return appointment

@router.delete("/appointments/{appointment_id}")
def delete_appointment(appointment_id: int, tenant_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tid = _get_tenant_id(current_user, tenant_id)
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id, Appointment.tenant_id == tid).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Запись не найдена")
        
    db.delete(appointment)
    db.commit()
    return {"status": "success", "message": "Запись успешно удалена"}
