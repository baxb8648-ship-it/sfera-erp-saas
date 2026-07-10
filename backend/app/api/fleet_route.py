from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
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


@router.get("/vehicles/{vehicle_id}/history", response_model=List[FleetBookingResponse])
def get_vehicle_history(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить историю бронирований и аренды конкретной единицы техники."""
    bookings = db.query(FleetBooking).filter(
        FleetBooking.vehicle_id == vehicle_id,
        FleetBooking.tenant_id == current_user.tenant_id
    ).order_by(FleetBooking.start_date.desc()).all()
    return bookings


@router.post("/bookings/{booking_id}/complete", response_model=FleetBookingResponse)
def complete_fleet_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Завершить аренду (закрыть бронирование и освободить технику)."""
    booking = db.query(FleetBooking).filter(
        FleetBooking.id == booking_id,
        FleetBooking.tenant_id == current_user.tenant_id
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")

    booking.status = "completed"
    if booking.vehicle_id:
        vehicle = db.query(FleetVehicle).filter(
            FleetVehicle.id == booking.vehicle_id,
            FleetVehicle.tenant_id == current_user.tenant_id
        ).first()
        if vehicle:
            vehicle.status = "available"

    db.commit()
    db.refresh(booking)
    return booking


class TelemetryWebhookPayload(BaseModel):
    tracker_id: str
    gps_lat: float
    gps_lng: float
    speed_kmh: Optional[int] = 0
    fuel_level_percent: Optional[int] = None
    fuel_liters: Optional[float] = None
    engine_hours: Optional[float] = None
    ignition_status: Optional[bool] = True


@router.post("/telemetry/webhook")
def glonass_telemetry_webhook(
    payload: TelemetryWebhookPayload,
    db: Session = Depends(get_db)
):
    """Принимает телеметрию от Wialon / Omnicomm / АвтоГРАФ по tracker_id."""
    vehicle = db.query(FleetVehicle).filter(FleetVehicle.tracker_id == payload.tracker_id).first()
    if not vehicle:
        return {"status": "ignored", "reason": "vehicle not found"}
    vehicle.gps_lat = payload.gps_lat
    vehicle.gps_lng = payload.gps_lng
    if payload.speed_kmh is not None:
        vehicle.speed_kmh = payload.speed_kmh
    if payload.fuel_level_percent is not None:
        vehicle.fuel_level_percent = payload.fuel_level_percent
    if payload.fuel_liters is not None:
        vehicle.fuel_liters = payload.fuel_liters
    if payload.engine_hours is not None:
        vehicle.engine_hours = payload.engine_hours
    if payload.ignition_status is not None:
        vehicle.ignition_status = payload.ignition_status
    db.commit()
    return {"status": "ok", "vehicle_id": vehicle.id}


class TelemetryUpdate(BaseModel):
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None
    fuel_level_percent: Optional[int] = None
    fuel_liters: Optional[float] = None
    engine_hours: Optional[float] = None
    speed_kmh: Optional[int] = None
    ignition_status: Optional[bool] = None
    tracker_id: Optional[str] = None
    tracker_protocol: Optional[str] = None


@router.patch("/vehicles/{vehicle_id}/telemetry", response_model=FleetVehicleResponse)
def update_vehicle_telemetry(
    vehicle_id: int,
    data: TelemetryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Обновить настройки трекера или телеметрию спецтехники."""
    vehicle = db.query(FleetVehicle).filter(
        FleetVehicle.id == vehicle_id,
        FleetVehicle.tenant_id == current_user.tenant_id
    ).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Техника не найдена")
    payload = data.model_dump(exclude_unset=True)
    for k, v in payload.items():
        setattr(vehicle, k, v)
    db.commit()
    db.refresh(vehicle)
    return vehicle


