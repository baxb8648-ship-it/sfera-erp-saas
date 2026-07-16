"""
API Router для Глобального Маркетплейса (Фаза 6).
Обеспечивает взаимодействие между разными тенантами (cross-tenant).
"""
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime

from ..database import get_db
from ..models import User, Tenant, MarketplaceListing, MarketplaceResponse
from .auth import get_current_user
from ..notifications import send_telegram_notification

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/marketplace", tags=["Marketplace B2B"])

# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class ListingCreate(BaseModel):
    title: str
    description: str
    category: str # subcontracting, equipment_rental, materials, services
    budget: Optional[float] = None
    currency: Optional[str] = "RUB"

class ListingOut(BaseModel):
    id: int
    author_tenant_id: int
    author_tenant_name: str
    title: str
    description: str
    category: str
    budget: Optional[float]
    currency: str
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class ResponseCreate(BaseModel):
    message: str
    contact_info: Optional[str] = None

class ResponseOut(BaseModel):
    id: int
    listing_id: int
    responder_tenant_id: int
    responder_tenant_name: str
    message: str
    contact_info: Optional[str]
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/listings", response_model=List[ListingOut])
def get_active_listings(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить список всех активных заявок на бирже (из всех тенантов)."""
    query = db.query(MarketplaceListing).filter(
        MarketplaceListing.is_active == True,
        MarketplaceListing.status == "open"
    )
    
    if category:
        query = query.filter(MarketplaceListing.category == category)
        
    listings = query.order_by(MarketplaceListing.created_at.desc()).all()
    
    result = []
    for lst in listings:
        tenant_name = lst.author_tenant.name if lst.author_tenant else "Неизвестная компания"
        result.append(ListingOut(
            id=lst.id,
            author_tenant_id=lst.author_tenant_id,
            author_tenant_name=tenant_name,
            title=lst.title,
            description=lst.description,
            category=lst.category,
            budget=lst.budget,
            currency=lst.currency,
            status=lst.status,
            created_at=lst.created_at
        ))
    return result


@router.post("/listings", response_model=ListingOut)
def create_listing(
    data: ListingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Создать новую заявку на бирже и разослать умные уведомления."""
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Пользователь не привязан к компании (тенанту)")
        
    author_tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    
    new_listing = MarketplaceListing(
        author_tenant_id=current_user.tenant_id,
        author_user_id=current_user.id,
        title=data.title,
        description=data.description,
        category=data.category,
        budget=data.budget,
        currency=data.currency,
        status="open",
        is_active=True
    )
    
    db.add(new_listing)
    db.commit()
    db.refresh(new_listing)
    
    # ─── Smart Matching & Notifications ───
    # Ищем другие компании, которым это может быть интересно
    matching_tenants = []
    
    if data.category == "equipment_rental":
        # Кому нужна техника? Тем у кого модуль construction или fleet
        matching_tenants = db.query(Tenant).filter(Tenant.id != current_user.tenant_id).all()
        # В реальной системе тут фильтр по JSONB plan_modules
    elif data.category == "subcontracting":
        matching_tenants = db.query(Tenant).filter(Tenant.id != current_user.tenant_id).all()
    else:
        matching_tenants = db.query(Tenant).filter(Tenant.id != current_user.tenant_id).all()
        
    if matching_tenants:
        # Уведомляем админов платформы и потенциальных клиентов (для демо шлем в общий канал)
        msg = (
            f"🌐 <b>Новая заявка на B2B Бирже!</b>\n\n"
            f"🏢 <b>Компания:</b> {author_tenant.name if author_tenant else 'Скрыто'}\n"
            f"📌 <b>Заголовок:</b> {data.title}\n"
            f"🏷️ <b>Категория:</b> {data.category}\n"
            f"💰 <b>Бюджет:</b> {data.budget or 'Договорная'} {data.currency}\n\n"
            f"Откликнуться можно в разделе «Биржа Заказов» в СФЕРУМ."
        )
        send_telegram_notification(msg, db)
    
    return ListingOut(
        id=new_listing.id,
        author_tenant_id=new_listing.author_tenant_id,
        author_tenant_name=author_tenant.name if author_tenant else "Неизвестно",
        title=new_listing.title,
        description=new_listing.description,
        category=new_listing.category,
        budget=new_listing.budget,
        currency=new_listing.currency,
        status=new_listing.status,
        created_at=new_listing.created_at
    )


@router.post("/listings/{listing_id}/respond", response_model=ResponseOut)
def respond_to_listing(
    listing_id: int,
    data: ResponseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Оставить отклик на чужую заявку."""
    listing = db.query(MarketplaceListing).filter(MarketplaceListing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
        
    if listing.author_tenant_id == current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Нельзя откликаться на собственные заявки")
        
    responder_tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    
    new_response = MarketplaceResponse(
        listing_id=listing_id,
        responder_tenant_id=current_user.tenant_id,
        responder_user_id=current_user.id,
        message=data.message,
        contact_info=data.contact_info,
        status="pending"
    )
    
    db.add(new_response)
    db.commit()
    db.refresh(new_response)
    
    # Уведомляем автора заявки
    msg = (
        f"🤝 <b>Новый отклик на вашу заявку!</b>\n\n"
        f"📌 <b>Заявка:</b> {listing.title}\n"
        f"🏢 <b>От компании:</b> {responder_tenant.name if responder_tenant else 'Неизвестно'}\n"
        f"💬 <b>Сообщение:</b> {data.message}\n"
        f"📞 <b>Контакты:</b> {data.contact_info or 'Не указаны'}\n"
    )
    # В реальной системе нужно отправить в личный чат автора заявки, пока шлем в общий лог
    send_telegram_notification(msg, db)
    
    return ResponseOut(
        id=new_response.id,
        listing_id=new_response.listing_id,
        responder_tenant_id=new_response.responder_tenant_id,
        responder_tenant_name=responder_tenant.name if responder_tenant else "Неизвестно",
        message=new_response.message,
        contact_info=new_response.contact_info,
        status=new_response.status,
        created_at=new_response.created_at
    )
