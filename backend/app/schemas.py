from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from .models import SegmentEnum, ClientStatusEnum

class ClientBase(BaseModel):
    name: str
    inn: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    segment: Optional[SegmentEnum] = None
    status: Optional[ClientStatusEnum] = ClientStatusEnum.new
    notes: Optional[str] = None
    kpp: Optional[str] = None
    legal_address: Optional[str] = None
    ogrn: Optional[str] = None
    bank_name: Optional[str] = None
    bik: Optional[str] = None
    rs: Optional[str] = None
    ks: Optional[str] = None
    custom_fields: Optional[dict] = None

class ClientCreate(ClientBase):
    pass

class ClientResponse(ClientBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class PublicLeadCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    notes: Optional[str] = None
    object_name: Optional[str] = None
    area_sqm: Optional[float] = None
    surface_type: Optional[str] = None

class ObjectBase(BaseModel):
    client_id: Optional[int] = None
    name: str
    area_sqm: Optional[float] = None
    surface_type: Optional[str] = None
    service_required: Optional[str] = None
    status: str = "Выезд на аудит"
    object_type: str = "construction"
    custom_fields: Optional[dict] = None

class ObjectCreate(ObjectBase):
    pass

class ObjectResponse(ObjectBase):
    id: int
    client_name: Optional[str] = None

    class Config:
        from_attributes = True

class FinanceBase(BaseModel):
    client_id: Optional[int] = None
    object_id: Optional[int] = None
    amount: float
    transaction_type: str
    payment_method: str
    category: str
    cash_register: Optional[str] = "works"
    description: Optional[str] = None

class FinanceCreate(FinanceBase):
    pass

class FinanceResponse(FinanceBase):
    id: int
    date: datetime
    client_name: Optional[str] = None
    object_name: Optional[str] = None

    class Config:
        from_attributes = True

class DocumentBase(BaseModel):
    client_id: int
    object_id: Optional[int] = None
    doc_type: str
    file_url: str

class DocumentResponse(DocumentBase):
    id: int
    created_at: datetime
    name: Optional[str] = None
    is_uploaded: int = 0
    client_name: Optional[str] = None
    object_name: Optional[str] = None

    class Config:
        from_attributes = True

class EmailSendSchema(BaseModel):
    doc_id: Optional[int] = None
    recipient_email: str
    subject: str
    body: str

class SMTPTestSchema(BaseModel):
    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_password: str
    smtp_use_ssl: int


class InventoryBase(BaseModel):
    name: str
    quantity: float = 0.0
    unit: str = "шт"
    category: Optional[str] = None
    barcode: Optional[str] = None

class InventoryCreate(InventoryBase):
    pass

class InventoryResponse(InventoryBase):
    id: int

    class Config:
        from_attributes = True

class EquipmentBase(BaseModel):
    name: str
    status: str = "На базе"
    last_service: Optional[datetime] = None
    inspector: Optional[str] = None
    object_id: Optional[int] = None
    barcode: Optional[str] = None

class EquipmentCreate(EquipmentBase):
    pass

class EquipmentResponse(EquipmentBase):
    id: int
    object_name: Optional[str] = None

    class Config:
        from_attributes = True


class KPItemSchema(BaseModel):
    name: str
    quantity: float
    unit: str = "м2"
    price: float

class KPCreateSchema(BaseModel):
    client_id: int
    object_id: Optional[int] = None
    segment: str
    items: List[KPItemSchema]
    custom_number: Optional[str] = None
    custom_date: Optional[str] = None

class InvoiceCreateSchema(BaseModel):
    client_id: int
    object_id: Optional[int] = None
    segment: str
    items: List[KPItemSchema]
    account_type: str = "works"
    nds_rate: str = "Без НДС"
    custom_number: Optional[str] = None
    custom_date: Optional[str] = None

class FacturaCreateSchema(BaseModel):
    client_id: int
    object_id: Optional[int] = None
    segment: str
    items: List[KPItemSchema]
    account_type: str = "works"
    nds_rate: str = "Без НДС"
    custom_number: Optional[str] = None
    custom_date: Optional[str] = None

class UPDCreateSchema(BaseModel):
    client_id: int
    object_id: Optional[int] = None
    segment: str
    items: List[KPItemSchema]
    account_type: str = "works"
    nds_rate: str = "Без НДС"
    custom_number: Optional[str] = None
    custom_date: Optional[str] = None

class SettingBase(BaseModel):
    key: str
    value: Optional[str] = None

class SettingResponse(SettingBase):
    class Config:
        from_attributes = True


class OrganizationBase(BaseModel):
    name: str
    subtitle: Optional[str] = None
    legal_name: Optional[str] = None
    inn: Optional[str] = None
    kpp: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    website_url: Optional[str] = None
    regions: Optional[str] = None
    director: Optional[str] = None

    # Works bank
    bank_name: Optional[str] = None
    bik: Optional[str] = None
    rs: Optional[str] = None
    ks: Optional[str] = None

    # Materials bank
    bank_name_materials: Optional[str] = None
    bik_materials: Optional[str] = None
    rs_materials: Optional[str] = None
    ks_materials: Optional[str] = None

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationResponse(OrganizationBase):
    id: int
    is_active: int

    class Config:
        from_attributes = True


class INNLookupResponse(BaseModel):
    name: str
    kpp: Optional[str] = None
    ogrn: Optional[str] = None
    legal_address: Optional[str] = None
    contact_person: Optional[str] = None
    bank_name: Optional[str] = None
    bik: Optional[str] = None
    rs: Optional[str] = None
    ks: Optional[str] = None


class MaterialConsumptionBase(BaseModel):
    inventory_id: int
    quantity: float

class MaterialConsumptionCreate(MaterialConsumptionBase):
    pass

class MaterialConsumptionResponse(MaterialConsumptionBase):
    id: int
    object_id: int
    date: datetime
    inventory_name: Optional[str] = None
    inventory_unit: Optional[str] = None

    class Config:
        from_attributes = True


class UserCreateSchema(BaseModel):
    username: str
    password: str
    role: str = "manager"
    telegram_chat_id: Optional[str] = None

class UserResponseSchema(BaseModel):
    id: int
    username: str
    role: str
    telegram_chat_id: Optional[str] = None
    is_active: int
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_use_ssl: Optional[int] = 1
    is_onboarded: Optional[bool] = None
    tenant_id: Optional[int] = None
    subscription_ends_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserUpdateSMTPSchema(BaseModel):
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_use_ssl: Optional[int] = 1

class AuthLogResponseSchema(BaseModel):
    id: int
    user_id: Optional[int] = None
    username: Optional[str] = None
    status: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True


class TenderBase(BaseModel):
    tender_number: str
    title: str
    description: Optional[str] = None
    customer_name: Optional[str] = None
    inn: Optional[str] = None
    price: float
    currency: str = "RUB"
    platform: str
    link: Optional[str] = None
    status: str = "Анализ"
    publication_date: Optional[datetime] = None
    submission_deadline: Optional[datetime] = None
    assigned_user_id: Optional[int] = None
    client_id: Optional[int] = None
    object_id: Optional[int] = None
    ai_analysis: Optional[str] = None

class TenderCreate(TenderBase):
    pass

class TenderResponse(TenderBase):
    id: int
    created_at: datetime
    updated_at: datetime
    assigned_username: Optional[str] = None
    client_name: Optional[str] = None
    object_name: Optional[str] = None
    roles: List['TenderRoleResponse'] = []

    class Config:
        from_attributes = True


class TenderPlatformBase(BaseModel):
    name: str
    api_url: str
    api_key: Optional[str] = None
    is_active: int = 1
    keywords: str
    exclude_keywords: Optional[str] = None
    regions: str
    min_price: Optional[float] = None
    max_price: Optional[float] = None

class TenderPlatformCreate(TenderPlatformBase):
    pass

class TenderPlatformResponse(TenderPlatformBase):
    id: int

    class Config:
        from_attributes = True

class TenderRoleBase(BaseModel):
    user_id: int
    role_name: str

class TenderRoleCreate(TenderRoleBase):
    tender_id: int

class TenderRoleResponse(TenderRoleBase):
    id: int
    tender_id: int
    username: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentTemplateBase(BaseModel):
    name: str
    doc_type: str

class DocumentTemplateCreate(DocumentTemplateBase):
    pass

class DocumentTemplateResponse(DocumentTemplateBase):
    id: int
    file_path: str
    is_active: int
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogResponseSchema(BaseModel):
    id: int
    user_id: Optional[int] = None
    username: Optional[str] = None
    action: str
    object_type: str
    object_id: Optional[int] = None
    object_name: Optional[str] = None
    changes: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True


class SpecialTaskBase(BaseModel):
    name: str
    keyword: str
    offer_context: str
    platform: Optional[str] = "Закупки.gov.ru"
    search_type: Optional[str] = "tenders"
    is_active: Optional[int] = 1
    schedule_interval: Optional[str] = "weekly"
    # Поля ОКВЭД-парсера
    okvad_code: Optional[str] = None
    region_code: Optional[str] = None
    search_limit: Optional[int] = 20
    use_ai_filter: Optional[int] = 0
    ai_filter_prompt: Optional[str] = None
    run_status: Optional[str] = "idle"

class SpecialTaskCreate(SpecialTaskBase):
    pass

class SpecialTaskResponse(SpecialTaskBase):
    id: int
    last_run: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class LeadDatabaseResponse(BaseModel):
    id: int
    task_id: Optional[int] = None
    name: str
    full_name: Optional[str] = None
    inn: Optional[str] = None
    ogrn: Optional[str] = None
    okvad_main: Optional[str] = None
    okvad_name: Optional[str] = None
    region: Optional[str] = None
    address: Optional[str] = None
    reg_date: Optional[str] = None
    status: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    director: Optional[str] = None
    ai_score: Optional[int] = 0
    ai_reason: Optional[str] = None
    kp_sent: Optional[int] = 0
    kp_sent_at: Optional[datetime] = None
    added_to_crm: Optional[int] = 0
    source: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════
# ФАЗА 9.3 — СХЕМЫ СНАБЖЕНИЯ И ЛОГИСТИКИ
# ═══════════════════════════════════════════════════════

class SupplyOrderBase(BaseModel):
    object_id: Optional[int] = None
    service_ticket_id: Optional[int] = None
    item_name: str
    quantity: float
    budget: Optional[float] = None
    supplier_name: Optional[str] = None
    status: str = "new"
    expected_delivery_date: Optional[datetime] = None

class SupplyOrderCreate(SupplyOrderBase):
    pass

class SupplyOrderResponse(SupplyOrderBase):
    id: int
    tenant_id: int
    creator_id: int
    created_at: datetime
    creator_name: Optional[str] = None
    object_name: Optional[str] = None

    class Config:
        from_attributes = True

class VehiclePassBase(BaseModel):
    supply_order_id: int
    driver_name: str
    driver_phone: str
    vehicle_plate: str
    vehicle_model: Optional[str] = None
    status: str = "active"

class VehiclePassCreate(VehiclePassBase):
    pass

class VehiclePassResponse(VehiclePassBase):
    id: int
    tenant_id: int
    pass_code: str
    created_at: datetime

    class Config:
        from_attributes = True

class QualityControlBase(BaseModel):
    supply_order_id: int
    is_passed: bool = True
    defects_description: Optional[str] = None
    photos: Optional[List[str]] = None

class QualityControlCreate(QualityControlBase):
    pass

class QualityControlResponse(QualityControlBase):
    id: int
    tenant_id: int
    inspector_id: int
    created_at: datetime
    inspector_name: Optional[str] = None

    class Config:
        from_attributes = True

# ═══════════════════════════════════════════════════════
# ФАЗА 9.4 — СХЕМЫ ТОиР И ВЫЕЗДНЫЕ МЕХАНИКИ
# ═══════════════════════════════════════════════════════

class ServiceTicketBase(BaseModel):
    equipment_id: Optional[int] = None
    object_id: Optional[int] = None
    mechanic_id: Optional[int] = None
    issue_description: str
    status: str = "open"
    resolution_notes: Optional[str] = None

class ServiceTicketCreate(ServiceTicketBase):
    pass

class ServiceTicketResponse(ServiceTicketBase):
    id: int
    tenant_id: int
    creator_id: Optional[int] = None
    audio_transcript: Optional[str] = None
    created_at: datetime
    closed_at: Optional[datetime] = None
    creator_name: Optional[str] = None
    mechanic_name: Optional[str] = None
    equipment_name: Optional[str] = None
    object_name: Optional[str] = None

    class Config:
        from_attributes = True

# ═══════════════════════════════════════════════════════
# ФАЗА 9.1 — СХЕМЫ СФЕРЫ УСЛУГ И ОНЛАЙН-ЗАПИСИ
# ═══════════════════════════════════════════════════════

class BookingCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class BookingCategoryCreate(BookingCategoryBase):
    pass

class BookingCategoryResponse(BookingCategoryBase):
    id: int
    tenant_id: int

    class Config:
        from_attributes = True

class TechCardItemBase(BaseModel):
    inventory_id: int
    quantity: float

class TechCardItemCreate(TechCardItemBase):
    pass

class TechCardItemResponse(TechCardItemBase):
    id: int
    tenant_id: int
    service_id: int
    inventory_name: Optional[str] = None
    inventory_unit: Optional[str] = None

    class Config:
        from_attributes = True

class BookingServiceBase(BaseModel):
    category_id: Optional[int] = None
    name: str
    price: float = 0.0
    duration_minutes: int = 60
    is_active: bool = True

class BookingServiceCreate(BookingServiceBase):
    tech_cards: Optional[List[TechCardItemCreate]] = None

class BookingServiceResponse(BookingServiceBase):
    id: int
    tenant_id: int
    category_name: Optional[str] = None
    tech_cards: List[TechCardItemResponse] = []

    class Config:
        from_attributes = True

class AppointmentBase(BaseModel):
    service_id: int
    master_id: int
    client_name: str
    client_phone: Optional[str] = None
    datetime_start: datetime
    datetime_end: datetime
    status: str = "new"
    notes: Optional[str] = None

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentResponse(AppointmentBase):
    id: int
    tenant_id: int
    created_at: datetime
    service_name: Optional[str] = None
    master_name: Optional[str] = None

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════
# ФАЗА 1 — СХЕМЫ АРЕНДЫ СПЕЦТЕХНИКИ (FLEET)
# ═══════════════════════════════════════════════════════

class FleetVehicleBase(BaseModel):
    name: str
    model: Optional[str] = None
    plate_number: Optional[str] = None
    category: str = "Экскаваторы"
    daily_rate: float = 0.0
    book_value: float = 0.0
    year_built: Optional[int] = None
    osago_until: Optional[str] = None
    status: str = "available"
    notes: Optional[str] = None

class FleetVehicleCreate(FleetVehicleBase):
    pass

class FleetVehicleResponse(FleetVehicleBase):
    id: int
    tenant_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class FleetBookingBase(BaseModel):
    vehicle_id: int
    client_id: Optional[int] = None
    client_name: Optional[str] = None
    start_date: str
    end_date: str
    status: str = "rented"
    total_price: float = 0.0
    notes: Optional[str] = None

class FleetBookingCreate(FleetBookingBase):
    pass

class FleetBookingResponse(FleetBookingBase):
    id: int
    tenant_id: int
    created_at: datetime

    class Config:
        from_attributes = True
