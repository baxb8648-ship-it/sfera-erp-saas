"""
API роут для управления шаблонами кастомных полей (Конструктор полей - Фаза 3.1 & 3.2).
Позволяет каждой компании (тенанту) создавать свои собственные свойства для объектов, клиентов и задач без миграций схемы БД.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime

from ..database import get_db, current_tenant_id
from ..api.auth import get_current_user
from ..models import User, FieldTemplate
from ..services.audit import log_audit_action


router = APIRouter(prefix="/field-templates", tags=["FieldTemplates"])


# ─── Схемы данных ─────────────────────────────────────────────────────────────

class FieldTemplateBase(BaseModel):
    entity_type: str = "object"        # "object" | "client" | "task"
    object_type: Optional[str] = None  # "construction" | "agro" | "fleet" | "furniture" | None
    field_key: str                     # Ключ в JSONB: "площадь_га" (snake_case)
    field_label: str                   # Отображаемое название: "Площадь (га)"
    field_type: str = "text"           # text | number | date | select | boolean | textarea
    options: Optional[list] = None     # Для select: ["Бетон", "Металлоконструкции"]
    placeholder: Optional[str] = None
    is_required: bool = False
    sort_order: int = 0

class FieldTemplateCreate(FieldTemplateBase):
    pass

class FieldTemplateUpdate(BaseModel):
    entity_type: Optional[str] = None
    object_type: Optional[str] = None
    field_key: Optional[str] = None
    field_label: Optional[str] = None
    field_type: Optional[str] = None
    options: Optional[list] = None
    placeholder: Optional[str] = None
    is_required: Optional[bool] = None
    sort_order: Optional[int] = None

class FieldTemplateResponse(FieldTemplateBase):
    id: int
    tenant_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Вспомогательные функции ──────────────────────────────────────────────────

def get_tenant_id_or_400(current_user: User) -> int:
    """Получить ID тенанта из контекста или профиля пользователя."""
    tid = current_tenant_id.get() or current_user.tenant_id
    if tid is None:
        raise HTTPException(
            status_code=400,
            detail="Невозможно определить компанию (tenant_id). Для выполнения действия требуется привязка к тенанту или режим аудита."
        )
    return tid


DEFAULT_FIELD_TEMPLATES = [
    # --- Строительство и АКЗ ---
    {
        "entity_type": "object", "object_type": "construction", "field_key": "area_sqm",
        "field_label": "Площадь объекта (м²)", "field_type": "number", "placeholder": "1000",
        "is_required": False, "sort_order": 10
    },
    {
        "entity_type": "object", "object_type": "construction", "field_key": "surface_type",
        "field_label": "Тип поверхности", "field_type": "select",
        "options": ["Бетон", "Металлоконструкции", "Кирпич", "Дерево", "Комбинированная"],
        "is_required": False, "sort_order": 20
    },
    {
        "entity_type": "object", "object_type": "construction", "field_key": "service_required",
        "field_label": "Требуемые работы", "field_type": "select",
        "options": ["Антикоррозийная защита (АКЗ)", "Пескоструйная очистка", "Огнезащитная обработка", "Покраска фасадов", "Утепление ППУ"],
        "is_required": False, "sort_order": 30
    },
    # --- Агропромышленность ---
    {
        "entity_type": "object", "object_type": "agro", "field_key": "cadastral_num",
        "field_label": "Кадастровый номер участка", "field_type": "text", "placeholder": "56:44:0000000:123",
        "is_required": False, "sort_order": 10
    },
    {
        "entity_type": "object", "object_type": "agro", "field_key": "crop_type",
        "field_label": "Выращиваемая культура", "field_type": "select",
        "options": ["Озимая пшеница", "Подсолнечник", "Кукуруза", "Ячмень", "Соя", "Паровое поле"],
        "is_required": False, "sort_order": 20
    },
    {
        "entity_type": "object", "object_type": "agro", "field_key": "area_ha",
        "field_label": "Площадь поля (га)", "field_type": "number", "placeholder": "150",
        "is_required": False, "sort_order": 30
    },
    # --- Аренда спецтехники и автопарк ---
    {
        "entity_type": "object", "object_type": "fleet", "field_key": "tech_model",
        "field_label": "Модель и марка техники", "field_type": "text", "placeholder": "JCB 3CX / КАМАЗ 65115",
        "is_required": False, "sort_order": 10
    },
    {
        "entity_type": "object", "object_type": "fleet", "field_key": "license_plate",
        "field_label": "Гос. регистрационный знак / VIN", "field_type": "text", "placeholder": "А 123 АА 56",
        "is_required": False, "sort_order": 20
    },
    {
        "entity_type": "object", "object_type": "fleet", "field_key": "fuel_rate",
        "field_label": "Норма расхода ГСМ (л/ч или л/100км)", "field_type": "number", "placeholder": "18.5",
        "is_required": False, "sort_order": 30
    },
    # --- Мебельное производство ---
    {
        "entity_type": "object", "object_type": "furniture", "field_key": "material_type",
        "field_label": "Основной материал / плитный материал", "field_type": "select",
        "options": ["ЛДСП Egger 18мм", "МДФ в пленке ПВХ", "Массив дуба/ясеня", "Фанера березовая"],
        "is_required": False, "sort_order": 10
    },
    {
        "entity_type": "object", "object_type": "furniture", "field_key": "dimensions_mm",
        "field_label": "Габариты изделия (ДхШхВ мм)", "field_type": "text", "placeholder": "2400х600х2200",
        "is_required": False, "sort_order": 20
    }
]

def seed_default_field_templates(tenant_id: int, db: Session):
    """Создать стандартные шаблоны полей для тенанта, если они отсутствуют."""
    for item in DEFAULT_FIELD_TEMPLATES:
        exists = db.query(FieldTemplate).filter_by(
            tenant_id=tenant_id,
            entity_type=item["entity_type"],
            field_key=item["field_key"]
        ).first()
        if not exists:
            tpl = FieldTemplate(**item, tenant_id=tenant_id)
            db.add(tpl)
    db.commit()


# ─── Эндпоинты ────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[FieldTemplateResponse])
def get_field_templates(
    entity_type: Optional[str] = Query(None, description="Тип сущности (object, client, task)"),
    object_type: Optional[str] = Query(None, description="Тип объекта (construction, agro, fleet, furniture)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получить список шаблонов кастомных полей для текущего тенанта.
    Поддерживается фильтрация по типу сущности (entity_type) и типу объекта (object_type).
    """
    tid = get_tenant_id_or_400(current_user)
    
    # Проверяем, есть ли вообще шаблоны у тенанта; если нет — сидим дефолтные для старта
    count = db.query(FieldTemplate).filter(FieldTemplate.tenant_id == tid).count()
    if count == 0:
        seed_default_field_templates(tid, db)
        
    query = db.query(FieldTemplate).filter(FieldTemplate.tenant_id == tid)
    
    if entity_type:
        query = query.filter(FieldTemplate.entity_type == entity_type)
        
    if object_type:
        # Для объектов возвращаем шаблоны конкретной отрасли + общие шаблоны (где object_type is None или пустая строка)
        query = query.filter(
            or_(
                FieldTemplate.object_type == object_type,
                FieldTemplate.object_type == None,
                FieldTemplate.object_type == ""
            )
        )
        
    return query.order_by(FieldTemplate.sort_order.asc(), FieldTemplate.id.asc()).all()


@router.post("/", response_model=FieldTemplateResponse)
def create_field_template(
    template: FieldTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Создать новый шаблон кастомного поля в конструкторе.
    Полностью изолирован по tenant_id.
    """
    tid = get_tenant_id_or_400(current_user)
    
    # Проверяем уникальность ключа поля в рамках сущности и типа объекта для данного тенанта
    existing = db.query(FieldTemplate).filter(
        FieldTemplate.tenant_id == tid,
        FieldTemplate.entity_type == template.entity_type,
        FieldTemplate.object_type == template.object_type,
        FieldTemplate.field_key == template.field_key
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Шаблон поля с ключом '{template.field_key}' уже существует для данной конфигурации."
        )
        
    db_template = FieldTemplate(
        **template.model_dump(),
        tenant_id=tid
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    
    try:
        log_audit_action(
            db,
            current_user,
            "создание",
            "ШаблонПоля",
            db_template.id,
            db_template.field_label,
            changes={"field_key": {"old": "—", "new": db_template.field_key}}
        )
    except Exception as e:
        print(f"Audit log error: {e}")
        
    return db_template


@router.put("/{template_id}", response_model=FieldTemplateResponse)
def update_field_template(
    template_id: int,
    update_data: FieldTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Обновить параметры шаблона кастомного поля (название, тип, опции списка, обязательность, порядок сортировки).
    """
    tid = get_tenant_id_or_400(current_user)
    db_template = db.query(FieldTemplate).filter(
        FieldTemplate.id == template_id,
        FieldTemplate.tenant_id == tid
    ).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Шаблон поля не найден")
        
    update_dict = update_data.model_dump(exclude_unset=True)
    
    # Если изменяется field_key, проверяем на конфликт
    if "field_key" in update_dict and update_dict["field_key"] != db_template.field_key:
        existing = db.query(FieldTemplate).filter(
            FieldTemplate.tenant_id == tid,
            FieldTemplate.entity_type == update_dict.get("entity_type", db_template.entity_type),
            FieldTemplate.object_type == update_dict.get("object_type", db_template.object_type),
            FieldTemplate.field_key == update_dict["field_key"],
            FieldTemplate.id != template_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Шаблон поля с ключом '{update_dict['field_key']}' уже существует."
            )
            
    old_label = db_template.field_label
    for key, val in update_dict.items():
        setattr(db_template, key, val)
        
    db.commit()
    db.refresh(db_template)
    
    try:
        log_audit_action(
            db,
            current_user,
            "обновление",
            "ШаблонПоля",
            db_template.id,
            db_template.field_label,
            changes={"label": {"old": old_label, "new": db_template.field_label}}
        )
    except Exception as e:
        print(f"Audit log error: {e}")
        
    return db_template


@router.delete("/{template_id}")
def delete_field_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Удалить шаблон кастомного поля.
    """
    tid = get_tenant_id_or_400(current_user)
    db_template = db.query(FieldTemplate).filter(
        FieldTemplate.id == template_id,
        FieldTemplate.tenant_id == tid
    ).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Шаблон поля не найден")
        
    tid_val = db_template.id
    label_val = db_template.field_label
    db.delete(db_template)
    db.commit()
    
    try:
        log_audit_action(
            db,
            current_user,
            "удаление",
            "ШаблонПоля",
            tid_val,
            label_val,
            changes={"label": {"old": label_val, "new": "—"}}
        )
    except Exception as e:
        print(f"Audit log error: {e}")
        
    return {"message": "Шаблон поля успешно удален", "id": tid_val}


@router.post("/seed-defaults", response_model=List[FieldTemplateResponse])
def seed_templates_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Принудительно создать стандартные отраслевые шаблоны полей для тенанта.
    """
    tid = get_tenant_id_or_400(current_user)
    seed_default_field_templates(tid, db)
    return db.query(FieldTemplate).filter(FieldTemplate.tenant_id == tid).order_by(FieldTemplate.sort_order.asc(), FieldTemplate.id.asc()).all()
