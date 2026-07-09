from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from ..database import get_db
from ..models import FleetVehicle, FleetBooking, User
from ..schemas import (
    FleetVehicleCreate,
    FleetVehicleResponse,
    FleetBookingCreate,
    FleetBookingResponse
)
from .auth import get_current_user

router = APIRouter(prefix="/fleet", tags=["Fleet"])


# ==========================================
# ВЕХИКУЛЫ (ЕДИНИЦЫ ТЕХНИКИ)
# ==========================================

@router.get("/vehicles", response_model=List[FleetVehicleResponse])
def get_fleet_vehicles(
    category: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить список спецтехники автопарка тенанта."""
    q = db.query(FleetVehicle).filter(FleetVehicle.tenant_id == current_user.tenant_id)
    if category:
        q = q.filter(FleetVehicle.category == category)
    if status:
        q = q.filter(FleetVehicle.status == status)
    return q.order_by(FleetVehicle.id.desc()).offset(skip).limit(limit).all()


@router.post("/vehicles", response_model=FleetVehicleResponse)
def create_fleet_vehicle(
    vehicle: FleetVehicleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Добавить новую единицу спецтехники в автопарк."""
    data = vehicle.model_dump()
    data["tenant_id"] = current_user.tenant_id
    db_item = FleetVehicle(**data)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@router.patch("/vehicles/{vehicle_id}", response_model=FleetVehicleResponse)
def update_fleet_vehicle(
    vehicle_id: int,
    vehicle: FleetVehicleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Обновить карточку единицы спецтехники."""
    db_item = db.query(FleetVehicle).filter(
        FleetVehicle.id == vehicle_id,
        FleetVehicle.tenant_id == current_user.tenant_id
    ).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Единица техники не найдена")

    update_data = vehicle.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_item, key, value)

    db.commit()
    db.refresh(db_item)
    return db_item


@router.delete("/vehicles/{vehicle_id}")
def delete_fleet_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Удалить единицу спецтехники."""
    db_item = db.query(FleetVehicle).filter(
        FleetVehicle.id == vehicle_id,
        FleetVehicle.tenant_id == current_user.tenant_id
    ).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Единица техники не найдена")

    db.delete(db_item)
    db.commit()
    return {"message": "Техника удалена успешно"}


# ==========================================
# БРОНИРОВАНИЯ И АРЕНДА (ШАХМАТКА ГАНТА)
# ==========================================

@router.get("/bookings", response_model=List[FleetBookingResponse])
def get_fleet_bookings(
    vehicle_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 500,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить список всех бронирований спецтехники."""
    q = db.query(FleetBooking).filter(FleetBooking.tenant_id == current_user.tenant_id)
    if vehicle_id:
        q = q.filter(FleetBooking.vehicle_id == vehicle_id)
    return q.order_by(FleetBooking.start_date.asc()).offset(skip).limit(limit).all()


@router.post("/bookings", response_model=FleetBookingResponse)
def create_fleet_booking(
    booking: FleetBookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Создать новое бронирование на единицу техники."""
    data = booking.model_dump()
    data["tenant_id"] = current_user.tenant_id
    db_item = FleetBooking(**data)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@router.delete("/bookings/{booking_id}")
def delete_fleet_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Удалить бронирование."""
    db_item = db.query(FleetBooking).filter(
        FleetBooking.id == booking_id,
        FleetBooking.tenant_id == current_user.tenant_id
    ).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")

    db.delete(db_item)
    db.commit()
    return {"message": "Бронирование удалено успешно"}
