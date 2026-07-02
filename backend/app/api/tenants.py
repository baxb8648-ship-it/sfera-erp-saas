import os
import urllib.request
import urllib.parse
import json
import logging
from typing import Optional, List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from ..database import get_db, current_tenant_id
from ..models import Tenant, User, Organization
from .auth import get_password_hash, get_current_user
from ..utils.rbac import seed_default_permissions

logger = logging.getLogger("uvicorn.error")
router = APIRouter(prefix="/tenants", tags=["SaaS Tenants Management"])

API_FNS_KEY = os.getenv("API_FNS_KEY")

class TenantRegister(BaseModel):
    inn: str
    sphere: str  # construction, service, agri, booking
    admin_username: str
    admin_password: str
    email: Optional[str] = None


class TenantOut(BaseModel):
    id: int
    name: str
    inn: str
    sphere: str
    is_active: bool

    class Config:
        from_attributes = True


def fetch_fns_data(inn: str) -> dict:
    """Запрашивает данные юридического лица или ИП из API ФНС"""
    if not API_FNS_KEY:
        logger.warning("[FNS API] API_FNS_KEY not configured in .env. Using fallback.")
        return {}
        
    url = f"https://api-fns.ru/api/egr?req={inn}&key={API_FNS_KEY}"
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=10) as response:
            res = json.loads(response.read().decode("utf-8"))
            return res
    except Exception as e:
        logger.error(f"[FNS API] Request failed: {e}")
        return {}


def parse_company_details(fns_response: dict, inn: str) -> dict:
    """Парсит сырой JSON ответ от api-fns.ru"""
    items = fns_response.get("items", [])
    if not items:
        # Fallback заглушка, если API не вернуло данных (для тестов без интернета / лимитов)
        is_ip = len(inn) == 12
        return {
            "name": f"ИП ИНН {inn}" if is_ip else f"ООО Компания {inn}",
            "full_name": f"Индивидуальный предприниматель ИНН {inn}" if is_ip else f"Общество с ограниченной ответственностью {inn}",
            "inn": inn,
            "kpp": "" if is_ip else "561001001",
            "ogrn": "315565800000000" if is_ip else "1155658000000",
            "address": "Россия, Оренбургская обл., г. Оренбург",
            "director": "Иванов Иван Иванович"
        }

    company = items[0]
    
    # 1. Проверяем, ЮЛ это или ИП
    if "ЮЛ" in company:
        ul = company["ЮЛ"]
        name = ul.get("НаимСокр", ul.get("НаимПолн", f"ООО ИНН {inn}"))
        full_name = ul.get("НаимПолн", name)
        kpp = ul.get("КПП", "")
        ogrn = ul.get("ОГРН", "")
        address = ul.get("Адрес", {}).get("АдрПолн", "Не указан")
        
        # Получаем директора
        director_info = ul.get("Руководитель", {})
        director = "Не указан"
        if isinstance(director_info, list) and len(director_info) > 0:
            director = director_info[0].get("ФИО", "Не указан")
        elif isinstance(director_info, dict):
            director = director_info.get("ФИО", "Не указан")
            
        return {
            "name": name,
            "full_name": full_name,
            "inn": inn,
            "kpp": kpp,
            "ogrn": ogrn,
            "address": address,
            "director": director
        }
    elif "ИП" in company:
        ip = company["ИП"]
        name = ip.get("ФИО", f"ИП ИНН {inn}")
        full_name = f"Индивидуальный Предприниматель {name}"
        ogrn = ip.get("ОГРНИП", "")
        address = "Не указан"
        director = name
        
        return {
            "name": f"ИП {name}",
            "full_name": full_name,
            "inn": inn,
            "kpp": "",
            "ogrn": ogrn,
            "address": address,
            "director": director
        }
        
    return {}


@router.get("/suggest/{inn}")
def suggest_company_by_inn(inn: str):
    """Возвращает распарсенные реквизиты компании по ИНН (для автокомплита во фронтенде)"""
    if len(inn) not in [10, 12] or not inn.isdigit():
        raise HTTPException(status_code=400, detail="Неверный формат ИНН. Должно быть 10 или 12 цифр.")
        
    raw_data = fetch_fns_data(inn)
    parsed = parse_company_details(raw_data, inn)
    return parsed


@router.post("/register", response_model=TenantOut, status_code=201)
def register_tenant(body: TenantRegister, db: Session = Depends(get_db)):
    """Регистрирует новую компанию в SaaS и создает её первого администратора"""
    # 1. Проверяем ИНН
    if len(body.inn) not in [10, 12] or not body.inn.isdigit():
        raise HTTPException(status_code=400, detail="Неверный формат ИНН. Должно быть 10 или 12 цифр.")
        
    # Проверяем, нет ли уже зарегистрированной компании с таким ИНН
    # Перед поиском временно сбрасываем RLS, чтобы искать по всей БД
    current_tenant_id.set(None)
    existing_tenant = db.query(Tenant).filter(Tenant.inn == body.inn).first()
    if existing_tenant:
        raise HTTPException(status_code=400, detail="Компания с таким ИНН уже зарегистрирована в системе.")
        
    existing_user = db.query(User).filter(User.username == body.admin_username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Имя пользователя администратора уже занято.")

    # 2. Получаем данные из ФНС
    raw_fns = fetch_fns_data(body.inn)
    details = parse_company_details(raw_fns, body.inn)
    
    try:
        # 3. Создаем компанию (Tenant)
        new_tenant = Tenant(
            name=details["name"],
            full_name=details["full_name"],
            inn=body.inn,
            kpp=details["kpp"],
            ogrn=details["ogrn"],
            address=details["address"],
            director=details["director"],
            sphere=body.sphere,
            is_active=True
        )
        db.add(new_tenant)
        db.flush() # Получаем ID новой компании
        
        # 4. Создаем администратора компании
        new_user = User(
            tenant_id=new_tenant.id,
            username=body.admin_username,
            hashed_password=get_password_hash(body.admin_password),
            role="admin",
            is_active=1
        )
        db.add(new_user)
        
        # 5. Создаем первичные реквизиты организации для счетов
        new_org = Organization(
            tenant_id=new_tenant.id,
            name=details["name"],
            legal_name=details["full_name"],
            inn=body.inn,
            kpp=details["kpp"],
            address=details["address"],
            director=details["director"],
            email=body.email,
            is_active=1
        )
        db.add(new_org)
        db.flush()

        # 6. Инициализируем матрицу прав RBAC для нового тенанта
        seed_default_permissions(new_tenant.id, db)
        
        db.commit()
        db.refresh(new_tenant)
        logger.info(f"[SaaS Tenant] Registered new tenant: {new_tenant.name} (ID: {new_tenant.id}, Sphere: {new_tenant.sphere})")
        return new_tenant
        
    except Exception as e:
        db.rollback()
        logger.error(f"[SaaS Tenant] Registration failed: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка регистрации компании: {e}")


class TenantAdminOut(BaseModel):
    id: int
    name: str
    full_name: Optional[str] = None
    inn: str
    kpp: Optional[str] = None
    ogrn: Optional[str] = None
    address: Optional[str] = None
    director: Optional[str] = None
    sphere: str
    is_active: bool
    subscription_ends_at: Optional[datetime] = None
    created_at: datetime
    users_count: int = 0

    class Config:
        from_attributes = True


def require_superadmin(current_user: User = Depends(get_current_user)):
    if current_user.role != "superadmin" and not (current_user.role == "admin" and current_user.tenant_id is None):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ запрещен. Требуются права Супер-Администратора платформы."
        )
    return current_user


@router.get("/all", response_model=List[TenantAdminOut])
def get_all_tenants(db: Session = Depends(get_db), superadmin: User = Depends(require_superadmin)):
    current_tenant_id.set(None)
    tenants = db.query(Tenant).order_by(Tenant.created_at.desc()).all()
    result = []
    for t in tenants:
        u_count = db.query(User).filter(User.tenant_id == t.id).count()
        t_dict = {
            "id": t.id,
            "name": t.name,
            "full_name": t.full_name,
            "inn": t.inn,
            "kpp": t.kpp,
            "ogrn": t.ogrn,
            "address": t.address,
            "director": t.director,
            "sphere": t.sphere,
            "is_active": t.is_active,
            "subscription_ends_at": t.subscription_ends_at,
            "created_at": t.created_at,
            "users_count": u_count
        }
        result.append(t_dict)
    return result


class ToggleStatusBody(BaseModel):
    is_active: bool


@router.patch("/{tenant_id}/status", response_model=TenantAdminOut)
def update_tenant_status(tenant_id: int, body: ToggleStatusBody, db: Session = Depends(get_db), superadmin: User = Depends(require_superadmin)):
    current_tenant_id.set(None)
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Компания не найдена")
    t.is_active = body.is_active
    db.commit()
    db.refresh(t)
    u_count = db.query(User).filter(User.tenant_id == t.id).count()
    return {**t.__dict__, "users_count": u_count}


class SubscriptionBody(BaseModel):
    subscription_ends_at: Optional[datetime] = None
    months_to_add: Optional[int] = None


@router.patch("/{tenant_id}/subscription", response_model=TenantAdminOut)
def update_tenant_subscription(tenant_id: int, body: SubscriptionBody, db: Session = Depends(get_db), superadmin: User = Depends(require_superadmin)):
    current_tenant_id.set(None)
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Компания не найдена")
    if body.months_to_add:
        current_end = t.subscription_ends_at or datetime.utcnow()
        if current_end < datetime.utcnow():
            current_end = datetime.utcnow()
        t.subscription_ends_at = current_end + timedelta(days=30 * body.months_to_add)
    elif body.subscription_ends_at is not None:
        t.subscription_ends_at = body.subscription_ends_at
    db.commit()
    db.refresh(t)
    u_count = db.query(User).filter(User.tenant_id == t.id).count()
    return {**t.__dict__, "users_count": u_count}


@router.post("/create-superadmin-init")
def create_initial_superadmin(db: Session = Depends(get_db)):
    current_tenant_id.set(None)
    user = db.query(User).filter(User.username == "superadmin").first()
    if user:
        return {"msg": "Superadmin already exists"}
    new_super = User(
        username="superadmin",
        hashed_password=get_password_hash("superadmin123"),
        role="superadmin",
        is_active=1
    )
    db.add(new_super)
    db.commit()
    return {"msg": "Superadmin created (superadmin / superadmin123)"}
