from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum, Boolean, Text, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from .database import Base

class Tenant(Base):
    """
    Таблица компаний-клиентов (тенантов) в SaaS.
    Каждая компания изолирована и имеет свой набор данных.
    """
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)                          # Краткое наименование
    full_name = Column(String, nullable=True)                   # Полное наименование (из ФНС)
    inn = Column(String, unique=True, index=True)               # ИНН
    kpp = Column(String, nullable=True)                         # КПП
    ogrn = Column(String, nullable=True)                        # ОГРН
    address = Column(Text, nullable=True)                       # Юридический адрес
    director = Column(String, nullable=True)                    # ФИО генерального директора
    sphere = Column(String, default="construction")             # Сфера деятельности: construction, service, agri, booking
    is_active = Column(Boolean, default=True)                   # Активность (блокировка за неуплату)
    subscription_ends_at = Column(DateTime, nullable=True)      # Срок действия подписки
    is_onboarded = Column(Boolean, default=False)               # Пройден ли Setup Wizard
    welcome_email_sent = Column(Boolean, default=False)
    day7_email_sent = Column(Boolean, default=False)
    trial_ending_email_sent = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    # Список модулей, доступных по тарифу (динамический сайдбар)
    # Пример: ["clients", "tasks", "objects", "finance", "tenders", "analytics", "inventory", "equipment", "templates"]
    plan_modules = Column(JSON, nullable=True, default=None)    # None = доступны все модули (Энтерпрайз)


class Invoice(Base):
    """
    Таблица B2B счетов на оплату подписки SaaS.
    """
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    amount = Column(Float, nullable=False)
    pdf_path = Column(String, nullable=False)
    status = Column(String, default="pending")                  # pending, paid, cancelled
    created_at = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant")


class SegmentEnum(str, enum.Enum):
    oil_gas = "Нефтегаз"
    municipal = "Муниципальные учреждения"
    agro = "Агросектор"
    commercial = "Коммерческая недвижимость"
    energy = "ТЭК/ТЭС"

class ClientStatusEnum(str, enum.Enum):
    new = "Новый"
    negotiation = "Переговоры"
    audit = "Выезд на аудит"
    kp_sent = "КП отправлено"
    contract = "Договор"
    in_progress = "В работе"
    completed = "Завершено"

class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    name = Column(String, index=True)

    inn = Column(String, unique=True, index=True, nullable=True)
    contact_person = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    segment = Column(Enum(SegmentEnum), nullable=True)
    status = Column(Enum(ClientStatusEnum), default=ClientStatusEnum.new)
    notes = Column(String, nullable=True)
    kpp = Column(String, nullable=True)
    legal_address = Column(String, nullable=True)
    ogrn = Column(String, nullable=True)
    bank_name = Column(String, nullable=True)
    bik = Column(String, nullable=True)
    rs = Column(String, nullable=True)
    ks = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    acquisition_cost = Column(Float, default=0.0)
    # Владелец записи (для RBAC own_only): менеджер, создавший клиента
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    custom_fields = Column(JSONB, nullable=True, default={})
    
    # relations
    interactions = relationship("Interaction", back_populates="client")
    objects = relationship("Object", back_populates="client")

class Interaction(Base):
    __tablename__ = "interactions"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    client_id = Column(Integer, ForeignKey("clients.id"))

    type = Column(String) # call, email, meeting
    notes = Column(String)
    date = Column(DateTime, default=datetime.utcnow)
    
    client = relationship("Client", back_populates="interactions")

class Object(Base):
    __tablename__ = "objects"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    client_id = Column(Integer, ForeignKey("clients.id"))

    name = Column(String)
    # --- Фаза 3.1: Project Engine ---
    object_type = Column(String, default="construction")  # construction | furniture | agro | fleet | generic
    custom_fields = Column(JSONB, nullable=True, default={})  # Кастомные поля тенанта (Конструктор полей)
    # --- Строительство (legacy поля — остаются для обратной совместимости) ---
    area_sqm = Column(Float, nullable=True)
    surface_type = Column(String, nullable=True)  # concrete, metal
    service_required = Column(String, nullable=True)  # Sandblasting, AKZ, PPU
    status = Column(String)
    # Владелец/ответственный (для RBAC own_only)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    client = relationship("Client", back_populates="objects")
    material_consumptions = relationship("MaterialConsumption", back_populates="object", cascade="all, delete-orphan")

    @property
    def client_name(self):
        return self.client.name if self.client else None


class MaterialConsumption(Base):
    __tablename__ = "material_consumptions"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    object_id = Column(Integer, ForeignKey("objects.id"))

    inventory_id = Column(Integer, ForeignKey("inventory.id"))
    quantity = Column(Float)
    date = Column(DateTime, default=datetime.utcnow)
    
    object = relationship("Object", back_populates="material_consumptions")
    inventory_item = relationship("InventoryItem")

    @property
    def inventory_name(self):
        return self.inventory_item.name if self.inventory_item else None

    @property
    def inventory_unit(self):
        return self.inventory_item.unit if self.inventory_item else "шт"


class DailyReport(Base):
    __tablename__ = "daily_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    object_id = Column(Integer, ForeignKey("objects.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    
    date = Column(DateTime, default=datetime.utcnow)
    text = Column(Text, nullable=True)
    weather_temp = Column(String, nullable=True)
    weather_conditions = Column(String, nullable=True)
    geo_lat = Column(Float, nullable=True)
    geo_lon = Column(Float, nullable=True)
    photos = Column(JSON, nullable=True, default=[]) # Array of URLs
    
    object = relationship("Object")
    user = relationship("User")

    @property
    def username(self):
        return self.user.username if self.user else None


class ConstructionEstimate(Base):
    __tablename__ = "construction_estimates"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    object_id = Column(Integer, ForeignKey("objects.id"))
    
    inventory_id = Column(Integer, ForeignKey("inventory.id"))
    planned_quantity = Column(Float, default=0.0)
    unit_price = Column(Float, default=0.0)
    
    object = relationship("Object")
    inventory_item = relationship("InventoryItem")

    @property
    def inventory_name(self):
        return self.inventory_item.name if self.inventory_item else None

    @property
    def inventory_unit(self):
        return self.inventory_item.unit if self.inventory_item else "шт"


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    username = Column(String, unique=True, index=True)

    hashed_password = Column(String)
    role = Column(String, default="manager")
    telegram_chat_id = Column(String, nullable=True)
    is_active = Column(Integer, default=1)
    
    # SMTP Settings per user
    smtp_host = Column(String, nullable=True)
    smtp_port = Column(Integer, nullable=True)
    smtp_user = Column(String, nullable=True)
    smtp_password = Column(String, nullable=True)
    smtp_use_ssl = Column(Integer, default=1)

    tenant = relationship("Tenant")

    @property
    def is_onboarded(self):
        return self.tenant.is_onboarded if self.tenant else True

class AuthLog(Base):
    __tablename__ = "auth_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    username = Column(String, nullable=True)
    status = Column(String) # success, failure
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")

class FinanceTransaction(Base):
    __tablename__ = "finance_transactions"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)

    object_id = Column(Integer, ForeignKey("objects.id"), nullable=True)
    amount = Column(Float)
    transaction_type = Column(String) # income, expense
    payment_method = Column(String) # Наличный, Безнал с НДС, Безнал без НДС
    category = Column(String) # ГСМ, Суточные, Закупка, Оплата
    date = Column(DateTime, default=datetime.utcnow)
    cash_register = Column(String, default="works") # works or materials
    description = Column(String, nullable=True) # Описание транзакции / Контрагент на стороне (Авито и др.)

    client = relationship("Client")
    object = relationship("Object")

    @property
    def client_name(self):
        return self.client.name if self.client else None

    @property
    def object_name(self):
        return self.object.name if self.object else None

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    client_id = Column(Integer, ForeignKey("clients.id"))

    object_id = Column(Integer, ForeignKey("objects.id"), nullable=True)
    tender_id = Column(Integer, ForeignKey("tenders.id"), nullable=True)
    name = Column(String, nullable=True)
    is_uploaded = Column(Integer, default=0) # 1 if uploaded manually, 0 if generated
    doc_type = Column(String) # КП, Договор, Акт, Счет
    file_url = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    # relationships
    client = relationship("Client")
    object = relationship("Object")
    tender = relationship("Tender")

    @property
    def client_name(self):
        return self.client.name if self.client else None

    @property
    def object_name(self):
        return self.object.name if self.object else None

    @property
    def tender_title(self):
        return self.tender.title if self.tender else None



class InventoryItem(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    name = Column(String, index=True)

    quantity = Column(Float, default=0.0)
    unit = Column(String, default="шт")
    category = Column(String, nullable=True)
    inventory_type = Column(String, default="general") # general, b2c_service, b2b_machinery, construction
    barcode = Column(String, unique=True, index=True, nullable=True)

class EquipmentItem(Base):
    __tablename__ = "equipment"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    name = Column(String, index=True)

    status = Column(String, default="На базе") # На базе, На объекте, В ремонте, Списано
    last_service = Column(DateTime, nullable=True)
    inspector = Column(String, nullable=True)
    object_id = Column(Integer, ForeignKey("objects.id"), nullable=True)
    barcode = Column(String, unique=True, index=True, nullable=True)

    object = relationship("Object")

    @property
    def object_name(self):
        return self.object.name if self.object else None

class CompanySetting(Base):
    __tablename__ = "company_settings"

    tenant_id = Column(Integer, ForeignKey("tenants.id"), primary_key=True)
    key = Column(String, primary_key=True, index=True)
    value = Column(String, nullable=True)



class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    name = Column(String, index=True)

    subtitle = Column(String, nullable=True)
    legal_name = Column(String, nullable=True)
    inn = Column(String, nullable=True)
    kpp = Column(String, nullable=True)
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    website = Column(String, nullable=True)
    website_url = Column(String, nullable=True)
    regions = Column(String, nullable=True)
    director = Column(String, nullable=True)

    # Works bank
    bank_name = Column(String, nullable=True)
    bik = Column(String, nullable=True)
    rs = Column(String, nullable=True)
    ks = Column(String, nullable=True)

    # Materials bank
    bank_name_materials = Column(String, nullable=True)
    bik_materials = Column(String, nullable=True)
    rs_materials = Column(String, nullable=True)
    ks_materials = Column(String, nullable=True)

    is_active = Column(Integer, default=0)


class Tender(Base):
    __tablename__ = "tenders"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    tender_number = Column(String, unique=True, index=True)

    title = Column(String)
    description = Column(String, nullable=True)
    customer_name = Column(String, nullable=True)
    inn = Column(String, nullable=True)
    price = Column(Float)
    currency = Column(String, default="RUB")
    platform = Column(String)
    link = Column(String, nullable=True)
    status = Column(String, default="Анализ") # Анализ, Участие, Заявка подана, Выигран, Проигран, Отклонен
    publication_date = Column(DateTime, nullable=True)
    submission_deadline = Column(DateTime, nullable=True)
    assigned_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    object_id = Column(Integer, ForeignKey("objects.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    notified_3_days = Column(Integer, default=0)
    notified_1_day = Column(Integer, default=0)
    telegram_thread_id = Column(Integer, nullable=True)
    expected_dumping = Column(String, nullable=True)
    expected_participants = Column(String, nullable=True)
    platform_updated_at = Column(DateTime, nullable=True)
    ai_analysis = Column(String, nullable=True)

    assigned_user = relationship("User")
    client = relationship("Client")
    object = relationship("Object")

    @property
    def assigned_username(self):
        return self.assigned_user.username if self.assigned_user else None

    @property
    def client_name(self):
        return self.client.name if self.client else None

    @property
    def object_name(self):
        return self.object.name if self.object else None


class TenderPlatform(Base):
    __tablename__ = "tender_platforms"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    name = Column(String, index=True)

    api_url = Column(String)
    api_key = Column(String, nullable=True)
    is_active = Column(Integer, default=1)
    keywords = Column(String) # Comma-separated
    exclude_keywords = Column(String, nullable=True) # Comma-separated minus words
    regions = Column(String) # Comma-separated
    min_price = Column(Float, nullable=True)
    max_price = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class TenderRole(Base):
    __tablename__ = "tender_roles"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    tender_id = Column(Integer, ForeignKey("tenders.id"))

    user_id = Column(Integer, ForeignKey("users.id"))
    role_name = Column(String) # e.g. 'Менеджер', 'Сметчик', 'Юрист'
    created_at = Column(DateTime, default=datetime.utcnow)

    tender = relationship("Tender", backref="roles")
    user = relationship("User")

    @property
    def username(self):
        return self.user.username if self.user else None


class DocumentTemplate(Base):
    __tablename__ = "document_templates"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    name = Column(String, index=True)

    doc_type = Column(String) # e.g. "Заявка на участие", "Коммерческое предложение"
    file_path = Column(String)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    title = Column(String, index=True)

    description = Column(String, nullable=True)
    status = Column(String, default="Новая")  # Новая, В процессе, Выполнена, Отменена
    priority = Column(String, default="Средний")  # Низкий, Средний, Высокий
    created_by_id = Column(Integer, ForeignKey("users.id"))
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    created_by = relationship("User", foreign_keys=[created_by_id])
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])

    @property
    def creator_name(self):
        return self.created_by.username if self.created_by else None

    @property
    def assignee_name(self):
        return self.assigned_to.username if self.assigned_to else None


class TaskMessage(Base):
    __tablename__ = "task_messages"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)  # Nullable для общего командного чата

    user_id = Column(Integer, ForeignKey("users.id"))
    message = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")

    @property
    def username(self):
        return self.user.username if self.user else None


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    username = Column(String, nullable=True)
    action = Column(String)  # "create", "update", "delete"
    object_type = Column(String)  # "Client", "Object", "Tender", "Task", "FinanceTransaction", "EquipmentItem", "InventoryItem", "Document"
    object_id = Column(Integer, nullable=True)
    object_name = Column(String, nullable=True)
    changes = Column(String, nullable=True)  # JSON-serialized changed fields
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")


class SpecialTask(Base):
    __tablename__ = "special_tasks"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    name = Column(String, index=True)

    keyword = Column(String)
    offer_context = Column(String)
    platform = Column(String, default="Закупки.gov.ru")
    search_type = Column(String, default="tenders") # tenders, organizations, okvad
    is_active = Column(Integer, default=1)
    schedule_interval = Column(String, default="weekly") # manual, daily, weekly
    last_run = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    # Поля для ОКВЭД-парсинга
    okvad_code = Column(String, nullable=True)       # e.g. "43.99" или "43.99,43.91"
    region_code = Column(String, nullable=True)       # e.g. "56" (Оренбургская обл.)
    search_limit = Column(Integer, default=20)        # 20 или 50
    use_ai_filter = Column(Integer, default=0)        # 0 или 1
    ai_filter_prompt = Column(Text, nullable=True)    # Описание целевой аудитории для ИИ
    run_status = Column(String, default="idle")       # idle, running, error

    leads = relationship("LeadDatabase", back_populates="task", cascade="all, delete-orphan")


class LeadDatabase(Base):
    """База лидов, собранных через ОКВЭД-парсер и другие источники."""
    __tablename__ = "lead_database"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    task_id = Column(Integer, ForeignKey("special_tasks.id"), nullable=True)


    # Реквизиты из ЕГРЮЛ
    name = Column(String, index=True)          # Краткое название ООО
    full_name = Column(String, nullable=True)  # Полное наименование
    inn = Column(String, nullable=True, index=True)
    ogrn = Column(String, nullable=True)
    okvad_main = Column(String, nullable=True) # Основной ОКВЭД
    okvad_name = Column(String, nullable=True) # Расшифровка основного ОКВЭД
    region = Column(String, nullable=True)     # Регион из адреса
    address = Column(String, nullable=True)    # Юридический адрес
    reg_date = Column(String, nullable=True)   # Дата регистрации
    status = Column(String, default="Действующее")  # Действующее / Ликвидировано

    # Контакты (из rusprofile/DuckDuckGo обогащения)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    website = Column(String, nullable=True)
    director = Column(String, nullable=True)   # Руководитель

    # AI-оценка
    ai_score = Column(Integer, default=0)      # 0-10 релевантность по ИИ
    ai_reason = Column(Text, nullable=True)    # Пояснение ИИ

    # Статус работы
    kp_sent = Column(Integer, default=0)       # Отправлено ли КП
    kp_sent_at = Column(DateTime, nullable=True)
    added_to_crm = Column(Integer, default=0)  # Добавлен ли в клиенты CRM
    source = Column(String, default="api-fns") # Источник: api-fns, rusprofile, duckduckgo

    created_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("SpecialTask", back_populates="leads")


class TempVoiceTask(Base):
    """Временное хранилище параметров задачи, распознанных из голосового сообщения.
    Запись создаётся при распознавании и удаляется после подтверждения или отмены.
    """
    __tablename__ = "temp_voice_tasks"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    telegram_user_id = Column(String, index=True)  # ID пользователя в Telegram

    chat_id = Column(String)                        # ID чата, куда отправить ответ
    original_text = Column(Text, nullable=True)     # Расшифрованный текст голосового

    # Сущности, извлечённые ИИ
    client_name = Column(String, nullable=True)
    contact_person = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    service_type = Column(String, nullable=True)
    area = Column(String, nullable=True)
    deadline_desc = Column(String, nullable=True)
    task_title = Column(String, nullable=True)
    task_description = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)


class DecisionLog(Base):
    """
    Журнал архитектурных решений (Decision Log) — часть мета-модуля управления платформой.

    Фиксирует ПОЧЕМУ было принято то или иное техническое решение,
    чтобы будущие сессии агента (и команда) понимали контекст без повторного анализа.

    Пример: 'STT через Groq, а не локальный faster-whisper — потому что
    Groq бесплатен, не требует GPU и работает быстрее на текущем железе.'

    Добавить из Telegram: /решение Название | Решение | Обоснование
    Посмотреть список: /решения
    API: GET /decisions, POST /decisions, GET /decisions/export
    """
    __tablename__ = "decision_log"

    id           = Column(Integer,  primary_key=True, index=True)
    title        = Column(String,   nullable=False)   # Короткое название: "STT: Groq vs Whisper"
    decision     = Column(Text,     nullable=False)   # Что решили: "Используем Groq Whisper API"
    rationale    = Column(Text,     nullable=False)   # Почему: "Бесплатно, не нужен GPU, быстрее"
    alternatives = Column(Text,     nullable=True)    # Что отвергли: "faster-whisper — нужен GPU"
    tags         = Column(String,   nullable=True)    # "ai,infrastructure" — через запятую
    source       = Column(String,   default="telegram")  # "telegram" | "api" | "seed"
    created_at   = Column(DateTime, default=datetime.utcnow)


class Epic(Base):
    """
    Крупные блоки/модули разработки (например, 'Telegram Mini App v2', 'Бот-Снабженец').
    """
    __tablename__ = "epics"

    id          = Column(Integer,  primary_key=True, index=True)
    title       = Column(String,   nullable=False)
    description = Column(Text,     nullable=True)
    status      = Column(String,   default="planned")  # planned, in_progress, done, cancelled
    priority    = Column(String,   default="Medium")   # Low, Medium, High
    created_at  = Column(DateTime, default=datetime.utcnow)


class Feature(Base):
    """
    Конкретные функциональные фичи, привязанные к эпикам.
    """
    __tablename__ = "features"

    id          = Column(Integer,  primary_key=True, index=True)
    epic_id     = Column(Integer,  ForeignKey("epics.id"), nullable=True)
    title       = Column(String,   nullable=False)
    description = Column(Text,     nullable=True)
    module      = Column(String,   nullable=True)  # frontend, backend, bot, ai, infra
    status      = Column(String,   default="planned")  # planned, in_progress, done, cancelled
    priority    = Column(String,   default="Medium")   # Low, Medium, High
    created_at  = Column(DateTime, default=datetime.utcnow)

    epic = relationship("Epic")


class Bug(Base):
    """
    Баги и технические дефекты.
    """
    __tablename__ = "bugs"

    id          = Column(Integer,  primary_key=True, index=True)
    title       = Column(String,   nullable=False)
    steps       = Column(Text,     nullable=True)      # Шаги воспроизведения
    severity    = Column(String,   default="Medium")   # Low, Medium, High, Critical
    component   = Column(String,   nullable=True)      # frontend, backend, bot, parser
    status      = Column(String,   default="open")     # open, in_progress, resolved, closed
    created_at  = Column(DateTime, default=datetime.utcnow)


# ═══════════════════════════════════════════════════════
# ФАЗА 3.3 — ГЛУБОКИЙ RBAC (Role-Based Access Control)
# ═══════════════════════════════════════════════════════

class RolePermission(Base):
    """
    Матрица прав доступа к модулям системы для каждой роли внутри тенанта.
    Поддерживает два уровня контроля:
      1. Уровень модуля (module): read / write / delete
      2. Уровень строки (own_only): видит только свои записи (owner_id == user.id)

    Пример: менеджер видит ТОЛЬКО своих клиентов (clients, own_only=True),
    но не может удалять финансовые транзакции (finance, can_delete=False).

    Дефолтная матрица инициализируется при создании тенанта в tenants.py.
    """
    __tablename__ = "role_permissions"

    id         = Column(Integer, primary_key=True, index=True)
    tenant_id  = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    role       = Column(String, nullable=False, index=True)   # admin | manager | accountant | support_agent
    module     = Column(String, nullable=False, index=True)   # clients | objects | finance | tasks | tenders
                                                              # inventory | equipment | templates | analytics | audit
    # Разрешения уровня модуля
    can_read   = Column(Boolean, default=True)
    can_write  = Column(Boolean, default=False)
    can_delete = Column(Boolean, default=False)
    # Ограничение уровня строки: True = видит только записи, где owner_id == user.id
    own_only   = Column(Boolean, default=False)

    tenant = relationship("Tenant")


# ═══════════════════════════════════════════════════════
# ФАЗА 3.1/3.2 — PROJECT ENGINE И КОНСТРУКТОР ПОЛЕЙ
# ═══════════════════════════════════════════════════════

class FieldTemplate(Base):
    """
    Шаблоны кастомных полей для карточек объектов/клиентов/задач.
    Каждый тенант может создать свои поля без ALTER TABLE.
    Значения хранятся в JSONB-колонке custom_fields соответствующей модели.

    Пример: агрохозяйство добавляет поле 'Площадь (га)' типа number
    для типа объекта 'agro'. При создании объекта это поле появляется
    в форме динамически.
    """
    __tablename__ = "field_templates"

    id           = Column(Integer, primary_key=True, index=True)
    tenant_id    = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    entity_type  = Column(String, nullable=False)    # "object" | "client" | "task"
    object_type  = Column(String, nullable=True)     # "construction" | "agro" | None (для всех типов)
    field_key    = Column(String, nullable=False)    # Ключ в JSONB: "площадь_га" (snake_case)
    field_label  = Column(String, nullable=False)    # Отображаемое название: "Площадь (га)"
    field_type   = Column(String, default="text")    # text | number | date | select | boolean | textarea
    options      = Column(JSON, nullable=True)        # Для select: ["Пшеница", "Подсолнечник", "Кукуруза"]
    placeholder  = Column(String, nullable=True)     # Подсказка в поле ввода
    is_required  = Column(Boolean, default=False)    # Обязательное поле
    sort_order   = Column(Integer, default=0)        # Порядок отображения в форме
    created_at   = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant")

# ═══════════════════════════════════════════════════════
# ФАЗА 6.1 — ГЛОБАЛЬНЫЙ МАРКЕТПЛЕЙС B2B-ЗАЯВОК
# ═══════════════════════════════════════════════════════

class MarketplaceListing(Base):
    """
    Заявка на внутренней бирже субподрядов/аренды (Marketplace).
    Видна всем активным тенантам в системе (cross-tenant).
    """
    __tablename__ = "marketplace_listings"

    id = Column(Integer, primary_key=True, index=True)
    author_tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    author_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    title = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=False)
    category = Column(String, nullable=False, index=True) # subcontracting, equipment_rental, materials, services
    budget = Column(Float, nullable=True)                 # Бюджет/Цена
    currency = Column(String, default="RUB")
    status = Column(String, default="open")               # open, in_progress, closed, cancelled
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    author_tenant = relationship("Tenant", foreign_keys=[author_tenant_id])
    author_user = relationship("User", foreign_keys=[author_user_id])
    responses = relationship("MarketplaceResponse", back_populates="listing", cascade="all, delete-orphan")


class MarketplaceResponse(Base):
    """
    Отклик другой компании (тенанта) на заявку в маркетплейсе.
    """
    __tablename__ = "marketplace_responses"

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("marketplace_listings.id"), nullable=False, index=True)
    responder_tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    responder_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    message = Column(Text, nullable=False)
    contact_info = Column(String, nullable=True) # Телефон или email для связи
    status = Column(String, default="pending")   # pending, accepted, rejected
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    listing = relationship("MarketplaceListing", back_populates="responses")
    responder_tenant = relationship("Tenant", foreign_keys=[responder_tenant_id])
    responder_user = relationship("User", foreign_keys=[responder_user_id])


# ═══════════════════════════════════════════════════════
# ФАЗА 7 — ПЕРСОНАЛЬНЫЙ FINE-TUNING ИИ (AI CUSTOMIZATION)
# ═══════════════════════════════════════════════════════

class AIFineTuneJob(Base):
    """
    Фоновые задачи дообучения ИИ (LoRA Fine-tuning).
    Отслеживает процесс экспорта данных и "прожарки" нейросети.
    """
    __tablename__ = "ai_finetune_jobs"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    status = Column(String, default="idle")          # idle, extracting, training, completed, failed
    progress_percent = Column(Integer, default=0)    # 0-100
    logs = Column(JSON, nullable=True, default=[])   # Массив строк логов (для терминала)
    adapter_path = Column(String, nullable=True)     # Путь к сгенерированному LoRA-файлу
    
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    tenant = relationship("Tenant")
    user = relationship("User")


# ═══════════════════════════════════════════════════════
# ФАЗА 8 — МУЛЬТИ-БОТЫ TELEGRAM (БЕЗОПАСНОСТЬ)
# ═══════════════════════════════════════════════════════

class TelegramBot(Base):
    """
    Таблица для управления Telegram-ботами тенанта (разделение Внутренних и Внешних).
    """
    __tablename__ = "telegram_bots"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    bot_token = Column(String, unique=True, nullable=False, index=True)
    bot_name = Column(String, nullable=True)
    role = Column(String, nullable=False, default="internal_copilot") # 'internal_copilot' или 'external_sales'
    is_active = Column(Boolean, default=True)
    
    tenant = relationship("Tenant")

# ═══════════════════════════════════════════════════════
# ФАЗА 9.3 — МОДУЛЬ СНАБЖЕНИЯ И ЛОГИСТИКИ (SUPPLY PIPELINE)
# ═══════════════════════════════════════════════════════

class SupplyOrder(Base):
    """
    Заявка на снабжение (Kanban-карточка).
    """
    __tablename__ = "supply_orders"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    object_id = Column(Integer, ForeignKey("objects.id"), nullable=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    service_ticket_id = Column(Integer, ForeignKey("service_tickets.id"), nullable=True) # Связь с поломкой

    item_name = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    budget = Column(Float, nullable=True)
    supplier_name = Column(String, nullable=True)
    
    status = Column(String, default="new") # new, approval, ordered, transit, gate, quality_control, received, rejected
    expected_delivery_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant")
    object = relationship("Object")
    creator = relationship("User", foreign_keys=[creator_id])
    service_ticket = relationship("ServiceTicket", foreign_keys=[service_ticket_id], post_update=True)


class VehiclePass(Base):
    """
    Пропуск на авто для доставки груза (генерируется при статусе In-Transit).
    """
    __tablename__ = "vehicle_passes"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    supply_order_id = Column(Integer, ForeignKey("supply_orders.id"), nullable=False)
    
    driver_name = Column(String, nullable=False)
    driver_phone = Column(String, nullable=False)
    vehicle_plate = Column(String, nullable=False)
    vehicle_model = Column(String, nullable=True)
    pass_code = Column(String, nullable=False, unique=True, index=True) # Сгенерированный код
    status = Column(String, default="active") # active, used, expired

    created_at = Column(DateTime, default=datetime.utcnow)

    supply_order = relationship("SupplyOrder")


class QualityControl(Base):
    """
    Входной контроль качества (ВКК) материалов на стройплощадке.
    """
    __tablename__ = "quality_controls"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    supply_order_id = Column(Integer, ForeignKey("supply_orders.id"), nullable=False)
    inspector_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    is_passed = Column(Boolean, default=True)
    defects_description = Column(Text, nullable=True)
    photos = Column(JSON, nullable=True, default=[]) # Фото брака
    
    created_at = Column(DateTime, default=datetime.utcnow)

    supply_order = relationship("SupplyOrder")
    inspector = relationship("User")


# ═══════════════════════════════════════════════════════
# ФАЗА 9.4 — ТОиР И ВЫЕЗДНЫЕ МЕХАНИКИ (MRO / FIELD SERVICE)
# ═══════════════════════════════════════════════════════

class ServiceTicket(Base):
    """
    Вызов механика / Заявка на ТО и ремонт.
    Может быть создана через Telegram (AI Voice-to-Ticket).
    """
    __tablename__ = "service_tickets"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    equipment_id = Column(Integer, ForeignKey("equipment.id"), nullable=True)
    object_id = Column(Integer, ForeignKey("objects.id"), nullable=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    mechanic_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    issue_description = Column(Text, nullable=False)
    audio_transcript = Column(Text, nullable=True) # Если создано голосом
    status = Column(String, default="open") # open, in_transit, in_progress, waiting_for_parts, closed
    resolution_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)

    tenant = relationship("Tenant")
    equipment = relationship("EquipmentItem")
    object = relationship("Object")
    creator = relationship("User", foreign_keys=[creator_id])
    mechanic = relationship("User", foreign_keys=[mechanic_id])

# ═══════════════════════════════════════════════════════
# ФАЗА 9.1 — СФЕРА УСЛУГ И ОНЛАЙН-ЗАПИСЬ (B2C BOOKING)
# ═══════════════════════════════════════════════════════

class BookingCategory(Base):
    """Категория услуг (например, Парикмахерский зал, Диагностика)"""
    __tablename__ = "booking_categories"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    services = relationship("BookingService", back_populates="category", cascade="all, delete-orphan")

class BookingService(Base):
    """Конкретная услуга для записи"""
    __tablename__ = "booking_services"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("booking_categories.id"), nullable=True)
    name = Column(String, nullable=False)
    price = Column(Float, default=0.0)
    duration_minutes = Column(Integer, default=60)
    is_active = Column(Boolean, default=True)

    category = relationship("BookingCategory", back_populates="services")
    tech_cards = relationship("TechCardItem", back_populates="service", cascade="all, delete-orphan")

class TechCardItem(Base):
    """Техкарта услуги: какой ТМЦ и сколько списывать при оказании услуги"""
    __tablename__ = "tech_card_items"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    service_id = Column(Integer, ForeignKey("booking_services.id"), nullable=False)
    inventory_id = Column(Integer, ForeignKey("inventory.id"), nullable=False)
    quantity = Column(Float, nullable=False) # Количество для списания (в ед. изм. инвентаря)

    service = relationship("BookingService", back_populates="tech_cards")
    inventory_item = relationship("InventoryItem")

    @property
    def inventory_name(self):
        return self.inventory_item.name if self.inventory_item else None

    @property
    def inventory_unit(self):
        return self.inventory_item.unit if self.inventory_item else None

class Appointment(Base):
    """Запись клиента на услугу (Бронирование)"""
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    service_id = Column(Integer, ForeignKey("booking_services.id"), nullable=False)
    master_id = Column(Integer, ForeignKey("users.id"), nullable=False) # Мастер, который оказывает услугу
    
    client_name = Column(String, nullable=False)
    client_phone = Column(String, nullable=True)
    datetime_start = Column(DateTime, nullable=False)
    datetime_end = Column(DateTime, nullable=False)
    
    # Статус: new, confirmed, completed, cancelled
    status = Column(String, default="new")
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    service = relationship("BookingService")
    master = relationship("User")

# ==========================================
# ФАЗА 10: Агропромышленный SaaS-модуль
# ==========================================

class AgroCrop(Base):
    __tablename__ = "agro_crops"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    name = Column(String, nullable=False)
    variety = Column(String)
    expected_yield = Column(Float, default=0.0)

class AgroField(Base):
    __tablename__ = "agro_fields"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    name = Column(String, nullable=False)
    area_hectares = Column(Float, default=0.0)
    soil_type = Column(String)
    geo_json = Column(Text)
    is_active = Column(Integer, default=1)

class AgroSeason(Base):
    __tablename__ = "agro_seasons"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    name = Column(String, nullable=False)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    is_active = Column(Integer, default=1)

class AgroSeeding(Base):
    __tablename__ = "agro_seedings"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    field_id = Column(Integer, ForeignKey("agro_fields.id"))
    crop_id = Column(Integer, ForeignKey("agro_crops.id"))
    season_id = Column(Integer, ForeignKey("agro_seasons.id"))
    planted_area = Column(Float, default=0.0)

    field = relationship("AgroField")
    crop = relationship("AgroCrop")
    season = relationship("AgroSeason")

class AgroOperation(Base):
    __tablename__ = "agro_operations"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    seeding_id = Column(Integer, ForeignKey("agro_seedings.id"), nullable=True)
    field_id = Column(Integer, ForeignKey("agro_fields.id"))
    operation_type = Column(String) # Посев, Удобрение, СЗР, Уборка, Вспашка
    date = Column(DateTime)
    equipment_id = Column(Integer, ForeignKey("equipment.id"), nullable=True)
    operator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    fuel_consumed = Column(Float, default=0.0)
    inventory_item_id = Column(Integer, ForeignKey("inventory.id"), nullable=True)
    inventory_quantity = Column(Float, default=0.0)
    status = Column(String, default="planned") # planned, in_progress, completed

    seeding = relationship("AgroSeeding")
    field = relationship("AgroField")
    equipment = relationship("EquipmentItem")
    operator = relationship("User")
    inventory = relationship("InventoryItem")

# ==========================================
# ФАЗА 10.1: Животноводство (КРС / МРС)
# ==========================================

class AgroLivestock(Base):
    __tablename__ = "agro_livestock"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    animal_type = Column(String) # КРС, МРС, Лошади, Свиньи, Птица
    tracking_type = Column(String, default="individual") # individual, herd
    tag_number = Column(String, nullable=True) # Бирка
    rfid_chip = Column(String, nullable=True) # RFID / Чип
    breed = Column(String, nullable=True) # Порода
    gender = Column(String, nullable=True) # male, female
    mother_id = Column(Integer, nullable=True) # ID матери
    father_id = Column(Integer, nullable=True) # ID отца
    origin = Column(String, default="farm_born") # farm_born | purchased
    herd_name = Column(String, nullable=True) # Название стада/группы
    quantity = Column(Integer, default=1)
    birth_date = Column(DateTime, nullable=True)
    current_weight = Column(Float, default=0.0)
    status = Column(String, default="active") # active, sick, sold, dead

class AgroLivestockHealth(Base):
    __tablename__ = "agro_livestock_health"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    livestock_id = Column(Integer, ForeignKey("agro_livestock.id"))
    record_type = Column(String) # vaccine, inspection, certificate
    date = Column(DateTime)
    description = Column(Text)
    veterinarian = Column(String, nullable=True)

    livestock = relationship("AgroLivestock")

class AgroLivestockFeed(Base):
    __tablename__ = "agro_livestock_feed"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    livestock_id = Column(Integer, ForeignKey("agro_livestock.id"))
    date = Column(DateTime)
    inventory_item_id = Column(Integer, ForeignKey("inventory.id"))
    quantity = Column(Float)
    operator_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    livestock = relationship("AgroLivestock")
    inventory = relationship("InventoryItem")
    operator = relationship("User")

class AgroOffspring(Base):
    __tablename__ = "agro_offspring"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    mother_id = Column(Integer, ForeignKey("agro_livestock.id"))
    father_id = Column(Integer, ForeignKey("agro_livestock.id"), nullable=True)
    birth_date = Column(DateTime)
    sex = Column(String) # male | female
    birth_weight = Column(Float, default=0.0)
    status = Column(String, default="alive") # alive | stillborn
    new_animal_id = Column(Integer, ForeignKey("agro_livestock.id"), nullable=True)

class AgroMortality(Base):
    __tablename__ = "agro_mortality"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    animal_id = Column(Integer, ForeignKey("agro_livestock.id"))
    date = Column(DateTime)
    cause = Column(String) # disease | trauma | forced_slaughter | sold
    diagnosis = Column(String, nullable=True)
    vet_name = Column(String, nullable=True)
    note = Column(Text, nullable=True)

class AgroFeedRation(Base):
    __tablename__ = "agro_feed_rations"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    livestock_group = Column(String) # КРС, МРС, Лошади
    feed_name = Column(String)
    daily_norm_kg = Column(Float, default=0.0)
    inventory_item_id = Column(Integer, ForeignKey("inventory.id"), nullable=True)

class AgroFeedLog(Base):
    __tablename__ = "agro_feed_logs"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    date = Column(DateTime)
    herd_id = Column(Integer, ForeignKey("agro_livestock.id"), nullable=True)
    feed_item_id = Column(Integer, ForeignKey("inventory.id"), nullable=True)
    quantity_kg = Column(Float, default=0.0)
    head_count = Column(Integer, default=1)

# ==========================================
# ФАЗА 2.1: Серийное мебельное производство (BOM / MRP)
# ==========================================

class FurnitureProduct(Base):
    __tablename__ = "furniture_products"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    weight = Column(Float, default=0.0) # Вес в кг
    image_url = Column(String, nullable=True)
    pdf_url = Column(String, nullable=True) # Чертежи
    base_price = Column(Float, default=0.0) # Продажная цена

class FurnitureBOM(Base):
    __tablename__ = "furniture_bom"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("furniture_products.id"))
    inventory_item_id = Column(Integer, ForeignKey("inventory.id"))
    quantity = Column(Float, nullable=False) # Кол-во для 1 изделия
    operation_stage = Column(String, nullable=True) # На каком этапе списывать (раскрой, кромка, сборка)

    product = relationship("FurnitureProduct")
    inventory = relationship("InventoryItem")

class FurnitureOrder(Base):
    __tablename__ = "furniture_orders"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("furniture_products.id"))
    quantity = Column(Integer, default=1)
    status = Column(String, default="planned") # planned, in_progress, qc, completed
    created_at = Column(DateTime)
    completed_at = Column(DateTime, nullable=True)

    product = relationship("FurnitureProduct")
    fittings = relationship("FurnitureOrderFitting", back_populates="order", cascade="all, delete-orphan")
    details = relationship("FurnitureOrderDetail", back_populates="order", cascade="all, delete-orphan")

class FurnitureOrderOperation(Base):
    __tablename__ = "furniture_order_operations"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    order_id = Column(Integer, ForeignKey("furniture_orders.id"))
    operation_name = Column(String) # Раскрой, Кромка, Присадка, Сварка, Покраска, Сборка, Упаковка, ОТК
    status = Column(String, default="pending") # pending, in_progress, completed
    completed_at = Column(DateTime, nullable=True)
    operator_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    order = relationship("FurnitureOrder")
    operator = relationship("User")

class FurnitureOrderFitting(Base):
    """
    Индивидуальный список фурнитуры для конкретного заказа (петли, направляющие, ручки, крепеж).
    """
    __tablename__ = "furniture_order_fittings"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    order_id = Column(Integer, ForeignKey("furniture_orders.id"))
    fitting_name = Column(String, nullable=False)
    article = Column(String, nullable=True)
    supplier = Column(String, nullable=True)
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, default=0.0)
    status = Column(String, default="pending") # pending (Не заказана), ordered (Заказана), in_stock (На складе), issued (Выдана в цех)

    order = relationship("FurnitureOrder", back_populates="fittings")

class FurnitureOrderDetail(Base):
    """
    Детали изделия в заказе и расчёт погонных метров кромления по 4 сторонам.
    """
    __tablename__ = "furniture_order_details"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    order_id = Column(Integer, ForeignKey("furniture_orders.id"))
    detail_name = Column(String, nullable=False)
    length_mm = Column(Float, default=0.0)
    width_mm = Column(Float, default=0.0)
    quantity = Column(Integer, default=1)
    edge_top = Column(String, default="none")    # none | pvc_04 | pvc_20 | abs
    edge_bottom = Column(String, default="none") # none | pvc_04 | pvc_20 | abs
    edge_left = Column(String, default="none")   # none | pvc_04 | pvc_20 | abs
    edge_right = Column(String, default="none")  # none | pvc_04 | pvc_20 | abs
    calc_linear_meters = Column(Float, default=0.0)

    order = relationship("FurnitureOrder", back_populates="details")


# ═══════════════════════════════════════════════════════
# МОНЕТИЗАЦИЯ: ИИ-АГЕНТЫ (3 бесплатных + платные)
# ═══════════════════════════════════════════════════════

class AgentCatalog(Base):
    """
    Каталог всех доступных ИИ-агентов платформы.
    Статические данные — заполняются при инициализации системы.
    tier: free | paid
    """
    __tablename__ = "agent_catalog"

    id            = Column(Integer, primary_key=True, index=True)
    slug          = Column(String, unique=True, nullable=False, index=True)  # crm_assistant, tender_scout, gap_detector ...
    name          = Column(String, nullable=False)       # Отображаемое имя
    description   = Column(Text, nullable=True)          # Описание функционала
    icon          = Column(String, nullable=True)         # emoji или url иконки
    category      = Column(String, nullable=False)        # crm, sales, finance, logistics, construction, agro
    tier          = Column(String, default="paid")        # free | paid
    price_monthly = Column(Float, nullable=True)          # Цена/месяц (None для бесплатных)
    monthly_limit = Column(Integer, nullable=True)        # Лимит запросов/мес для free (None = безлимит)
    is_active     = Column(Boolean, default=True)
    sort_order    = Column(Integer, default=0)
    created_at    = Column(DateTime, default=datetime.utcnow)


class TenantAgentSubscription(Base):
    """
    Подписка конкретного тенанта на ИИ-агента.
    Для free-агентов создаётся автоматически при регистрации тенанта.
    Для платных — создаётся при оплате.
    """
    __tablename__ = "tenant_agent_subscriptions"

    id            = Column(Integer, primary_key=True, index=True)
    tenant_id     = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    agent_id      = Column(Integer, ForeignKey("agent_catalog.id"), nullable=False)
    status        = Column(String, default="active")    # active | suspended | cancelled
    # Для free: None (бессрочно), для paid: дата окончания оплаченного периода
    expires_at    = Column(DateTime, nullable=True)
    created_at    = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant")
    agent  = relationship("AgentCatalog")


class AgentUsageLog(Base):
    """
    Лог каждого вызова ИИ-агента по тенанту.
    Используется для:
    - Контроля месячных лимитов (free-агенты)
    - Аналитики платформы (SuperAdmin)
    - Биллинга по usage (будущее)
    """
    __tablename__ = "agent_usage_log"

    id            = Column(Integer, primary_key=True, index=True)
    tenant_id     = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    user_id       = Column(Integer, ForeignKey("users.id"), nullable=True)
    agent_id      = Column(Integer, ForeignKey("agent_catalog.id"), nullable=False, index=True)
    agent_slug    = Column(String, nullable=False, index=True)  # Дублируем для быстрых агрегаций
    # Контекст вызова
    input_tokens  = Column(Integer, nullable=True)
    output_tokens = Column(Integer, nullable=True)
    latency_ms    = Column(Integer, nullable=True)
    status        = Column(String, default="success")    # success | error | limit_exceeded
    error_detail  = Column(Text, nullable=True)
    # Временная метка
    called_at     = Column(DateTime, default=datetime.utcnow, index=True)

    tenant = relationship("Tenant")
    user   = relationship("User")
    agent  = relationship("AgentCatalog")


class KnowledgeBaseDocument(Base):
    """
    Хранит информацию о загруженных в Pinecone документах (RAG-база).
    Используется для вывода списка загруженных файлов и подсчета лимитов.
    """
    __tablename__ = "knowledge_base_documents"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    doc_id_pinecone = Column(String, unique=True, index=True, nullable=False) # ID в Pinecone
    title = Column(String, nullable=False)
    filename = Column(String, nullable=True)
    category = Column(String, default="general")
    chunks_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    tenant = relationship("Tenant")


class FleetVehicle(Base):
    """
    Таблица единиц спецтехники автопарка (модуль Аренда спецтехники).
    """
    __tablename__ = "fleet_vehicles"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    name = Column(String, nullable=False, index=True)           # Название единицы техники
    model = Column(String, nullable=True)                       # Модель (CAT 320, JCB 3CX и др.)
    plate_number = Column(String, nullable=True, index=True)    # Гос. номер
    category = Column(String, default="Экскаваторы")            # Категория
    daily_rate = Column(Float, default=0.0)                     # Суточная ставка аренды, руб.
    book_value = Column(Float, default=0.0)                     # Балансовая стоимость техники, руб.
    year_built = Column(Integer, nullable=True)                 # Год выпуска
    osago_until = Column(String, nullable=True)                 # Срок действия ОСАГО (YYYY-MM-DD)
    status = Column(String, default="available")                # available | rented | reserved | maintenance
    notes = Column(Text, nullable=True)                         # Примечания
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    tenant = relationship("Tenant")
    bookings = relationship("FleetBooking", back_populates="vehicle", cascade="all, delete-orphan")


class FleetBooking(Base):
    """
    Таблица бронирований и аренды единиц спецтехники (диаграмма Ганта).
    """
    __tablename__ = "fleet_bookings"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    vehicle_id = Column(Integer, ForeignKey("fleet_vehicles.id"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    client_name = Column(String, nullable=True)                 # Название арендатора / объекта
    start_date = Column(String, nullable=False)                 # Дата начала (YYYY-MM-DD)
    end_date = Column(String, nullable=False)                   # Дата окончания (YYYY-MM-DD)
    status = Column(String, default="rented")                   # rented | reserved | maintenance
    total_price = Column(Float, default=0.0)                    # Общая стоимость бронирования
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant")
    vehicle = relationship("FleetVehicle", back_populates="bookings")


# ═══════════════════════════════════════════════════════
# ФАЗА 2: ХОЛДИНГ / УПРАВЛЕНИЕ ГРУППОЙ КОМПАНИЙ (ENTERPRISE HOLDING)
# ═══════════════════════════════════════════════════════

class HoldingGroup(Base):
    """
    Холдинг (Группа компаний), объединяющий несколько юрлиц (Tenant).
    """
    __tablename__ = "holding_groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User")
    members = relationship("HoldingMember", back_populates="holding", cascade="all, delete-orphan")
    transfers = relationship("HoldingTransfer", back_populates="holding", cascade="all, delete-orphan")


class HoldingMember(Base):
    """
    Юрлицо / Дочерняя компания в составе Холдинга.
    """
    __tablename__ = "holding_members"

    id = Column(Integer, primary_key=True, index=True)
    holding_id = Column(Integer, ForeignKey("holding_groups.id"), nullable=False, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    company_name = Column(String, nullable=False)
    inn = Column(String, nullable=True)
    role = Column(String, default="subsidiary")                 # parent | subsidiary | branch
    share_percent = Column(Float, default=100.0)                # Доля владения (%)
    revenue_ytd = Column(Float, default=0.0)                    # Выручка юрлица с начала года
    net_profit_ytd = Column(Float, default=0.0)                 # Чистая прибыль с начала года
    employees_count = Column(Integer, default=0)                # Штат сотрудников
    is_active = Column(Boolean, default=True)

    holding = relationship("HoldingGroup", back_populates="members")
    tenant = relationship("Tenant")


class HoldingTransfer(Base):
    """
    Внутригрупповые операции (трансфер денежных средств / ТМЦ между юрлицами).
    """
    __tablename__ = "holding_transfers"

    id = Column(Integer, primary_key=True, index=True)
    holding_id = Column(Integer, ForeignKey("holding_groups.id"), nullable=False, index=True)
    from_company = Column(String, nullable=False)
    to_company = Column(String, nullable=False)
    amount = Column(Float, default=0.0)
    transfer_type = Column(String, default="loan")              # loan | dividend | asset_transfer | service
    description = Column(String, nullable=True)
    status = Column(String, default="completed")                # completed | pending
    created_at = Column(DateTime, default=datetime.utcnow)

    holding = relationship("HoldingGroup", back_populates="transfers")

