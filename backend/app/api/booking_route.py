from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from ..database import get_db
from ..models import BookingCategory, BookingService, TechCardItem, Appointment, InventoryItem, User
from ..schemas import (
    BookingCategoryCreate, BookingCategoryResponse,
    BookingServiceCreate, BookingServiceResponse,
    AppointmentCreate, AppointmentResponse
)
from .auth import get_current_user
from ..telegram import send_telegram_notification, send_personal_telegram_notification

router = APIRouter(prefix="/booking", tags=["Booking"])

# --- Categories ---

@router.get("/categories", response_model=List[BookingCategoryResponse])
def get_categories(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    categories = db.query(BookingCategory).filter(BookingCategory.tenant_id == current_user.tenant_id).all()
    return categories

@router.post("/categories", response_model=BookingCategoryResponse)
def create_category(category: BookingCategoryCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_category = BookingCategory(**category.model_dump(), tenant_id=current_user.tenant_id)
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

# --- Services and Tech Cards ---

@router.get("/services", response_model=List[BookingServiceResponse])
def get_services(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    services = db.query(BookingService).filter(BookingService.tenant_id == current_user.tenant_id).all()
    result = []
    for s in services:
        s_dict = {col.name: getattr(s, col.name) for col in s.__table__.columns}
        if s.category:
            s_dict["category_name"] = s.category.name
        
        # Format tech cards
        tech_cards = []
        for tc in s.tech_cards:
            tc_dict = {col.name: getattr(tc, col.name) for col in tc.__table__.columns}
            if tc.inventory_item:
                tc_dict["inventory_name"] = tc.inventory_item.name
                tc_dict["inventory_unit"] = tc.inventory_item.unit
            tech_cards.append(tc_dict)
        s_dict["tech_cards"] = tech_cards
        result.append(s_dict)
    return result

@router.post("/services", response_model=BookingServiceResponse)
def create_service(service: BookingServiceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service_data = service.model_dump(exclude={"tech_cards"})
    db_service = BookingService(**service_data, tenant_id=current_user.tenant_id)
    db.add(db_service)
    db.commit()
    db.refresh(db_service)
    
    if service.tech_cards:
        for tc in service.tech_cards:
            db_tc = TechCardItem(**tc.model_dump(), service_id=db_service.id, tenant_id=current_user.tenant_id)
            db.add(db_tc)
        db.commit()
        db.refresh(db_service)
        
    # Re-fetch with relationships
    s_dict = {col.name: getattr(db_service, col.name) for col in db_service.__table__.columns}
    if db_service.category:
        s_dict["category_name"] = db_service.category.name
    tech_cards = []
    for tc in db_service.tech_cards:
        tc_dict = {col.name: getattr(tc, col.name) for col in tc.__table__.columns}
        if tc.inventory_item:
            tc_dict["inventory_name"] = tc.inventory_item.name
            tc_dict["inventory_unit"] = tc.inventory_item.unit
        tech_cards.append(tc_dict)
    s_dict["tech_cards"] = tech_cards
    
    return s_dict

# --- Appointments ---

@router.get("/appointments", response_model=List[AppointmentResponse])
def get_appointments(start_date: str = None, end_date: str = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Appointment).filter(Appointment.tenant_id == current_user.tenant_id)
    if start_date:
        query = query.filter(Appointment.datetime_start >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(Appointment.datetime_end <= datetime.fromisoformat(end_date))
        
    appointments = query.all()
    result = []
    for a in appointments:
        a_dict = {col.name: getattr(a, col.name) for col in a.__table__.columns}
        if a.service:
            a_dict["service_name"] = a.service.name
        if a.master:
            a_dict["master_name"] = a.master.username
        result.append(a_dict)
    return result

@router.post("/appointments", response_model=AppointmentResponse)
def create_appointment(appointment: AppointmentCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_appointment = Appointment(**appointment.model_dump(), tenant_id=current_user.tenant_id)
    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    
    # Notify Master
    time_str = db_appointment.datetime_start.strftime("%d.%m.%Y %H:%M")
    master = db_appointment.master
    master_name = master.username if master else "Неизвестно"
    service_name = db_appointment.service.name if db_appointment.service else "Услуга"
    
    msg = f"📅 <b>Новая запись!</b>\n\nКлиент: {db_appointment.client_name}\nУслуга: {service_name}\nВремя: {time_str}\nМастер: {master_name}"
    background_tasks.add_task(send_telegram_notification, msg, db)
    background_tasks.add_task(send_personal_telegram_notification, db_appointment.master_id, f"У вас новая запись на {time_str} ({service_name})", db)
    
    a_dict = {col.name: getattr(db_appointment, col.name) for col in db_appointment.__table__.columns}
    a_dict["service_name"] = db_appointment.service.name if db_appointment.service else None
    a_dict["master_name"] = master_name
    return a_dict

@router.put("/appointments/{appointment_id}/complete")
def complete_appointment(appointment_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id, Appointment.tenant_id == current_user.tenant_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    if appointment.status == "completed":
        raise HTTPException(status_code=400, detail="Appointment already completed")
        
    # Auto-deduct inventory
    service = appointment.service
    if service and service.tech_cards:
        for tc in service.tech_cards:
            inv_item = db.query(InventoryItem).filter(InventoryItem.id == tc.inventory_id, InventoryItem.tenant_id == current_user.tenant_id).first()
            if inv_item:
                inv_item.quantity -= tc.quantity
                if inv_item.quantity < 0:
                    inv_item.quantity = 0 # Prevent negative or handle gracefully
                    msg = f"⚠️ <b>Внимание:</b> Критический остаток материала '{inv_item.name}'. Пожалуйста, пополните запасы!"
                    background_tasks.add_task(send_telegram_notification, msg, db)
                    
    appointment.status = "completed"
    db.commit()
    return {"message": "Appointment completed and inventory deducted based on tech card."}
