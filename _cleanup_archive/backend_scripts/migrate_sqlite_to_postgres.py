import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Добавляем backend в sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import Base
from app.models import (
    Tenant, Invoice, User, Client, Interaction, Object, MaterialConsumption, InventoryItem,
    EquipmentItem, Document, AuditLog, SpecialTask, LeadDatabase,
    TenderPlatform, Tender, TenderRole, Task, TaskMessage, DocumentTemplate,
    DecisionLog, TempVoiceTask, CompanySetting
)


# SQLite подключение
SQLITE_URL = "sqlite:///./leonika_crm.db"
# Для SQLite нам нужно указать абсолютный путь
backend_dir = os.path.dirname(os.path.abspath(__file__))
abs_sqlite_path = os.path.abspath(os.path.join(backend_dir, "leonika_crm.db"))

SQLITE_CONN_URL = f"sqlite:///{abs_sqlite_path}"

# Postgres подключение (Neon)
# Считываем из .env
from dotenv import load_dotenv
load_dotenv()
POSTGRES_URL = os.getenv("DATABASE_URL")

if not POSTGRES_URL or not POSTGRES_URL.startswith("postgresql"):
    print("Error: DATABASE_URL in .env is not configured for PostgreSQL!")
    sys.exit(1)

print("Starting DB Migration...")
print(f"Source SQLite: {SQLITE_CONN_URL}")
print(f"Target Postgres: {POSTGRES_URL.split('@')[-1] if '@' in POSTGRES_URL else POSTGRES_URL}")

sqlite_engine = create_engine(SQLITE_CONN_URL)
pg_engine = create_engine(POSTGRES_URL)

SqliteSession = sessionmaker(bind=sqlite_engine)
PgSession = sessionmaker(bind=pg_engine)

sqlite_db = SqliteSession()
pg_db = PgSession()

# Порядок таблиц для безопасного удаления и вставки (учитывая ForeignKey зависимости)
TABLE_MODELS = [
    # 0. Сначала справочник компаний
    (Tenant, "tenants"),
    (Invoice, "invoices"),
    # 1. Первый уровень зависимостей
    (User, "users"),
    (Client, "clients"),
    (InventoryItem, "inventory"),
    (EquipmentItem, "equipment"),
    (TenderPlatform, "tender_platforms"),
    (DocumentTemplate, "document_templates"),
    (SpecialTask, "special_tasks"),
    (DecisionLog, "decision_log"),
    (CompanySetting, "company_settings"),


    
    # 2. Таблицы, зависящие от первого уровня
    (Interaction, "interactions"),
    (Object, "objects"),
    (LeadDatabase, "lead_database"),
    (AuditLog, "audit_logs"),
    (TempVoiceTask, "temp_voice_tasks"),
    (Task, "tasks"),
    
    # 3. Таблицы, зависящие от второго уровня
    (MaterialConsumption, "material_consumptions"),
    (Tender, "tenders"),
    (TaskMessage, "task_messages"),
    
    # 4. Третий уровень зависимостей
    (TenderRole, "tender_roles"),
    (Document, "documents"),
]

try:
    # Шаг 1: Полное пересоздание таблиц в Postgres для обновления структуры (добавление tenant_id и новых индексов)
    print("\nDropping all existing tables in target PostgreSQL Neon...")
    Base.metadata.drop_all(bind=pg_engine)
    print("Creating tables with new SaaS structure...")
    Base.metadata.create_all(bind=pg_engine)
    print("Tables created successfully.")


    # Кэш для хранения существующих ID в родительских таблицах
    existing_ids = {
        "users": set(),
        "clients": set(),
        "inventory": set(),
        "equipment": set(),
        "special_tasks": set(),
        "tenders": set(),
        "tasks": set(),
        "objects": set()
    }

    # Шаг 2: Перенос данных
    print("\nMigrating data...")
    from sqlalchemy import inspect
    sqlite_inspector = inspect(sqlite_engine)
    
    # 2.1 Создаем базового тенанта (ООО ЛЕОНИКА)
    print("Checking/Creating default tenant 'ООО ЛЕОНИКА'...")
    default_tenant = pg_db.query(Tenant).filter(Tenant.id == 1).first()
    if not default_tenant:
        default_tenant = Tenant(
            id=1,
            name="ООО ЛЕОНИКА",
            full_name="Общество с ограниченной ответственностью 'ЛЕОНИКА'",
            inn="5610248560",
            kpp="561001001",
            ogrn="1155658000000",
            address="Россия, Оренбургская обл., г. Оренбург",
            director="Халиков И.И.",
            sphere="construction",
            is_active=True
        )
        pg_db.add(default_tenant)
        pg_db.commit()
        print("Default tenant created (ID: 1).")
    else:
        print("Default tenant already exists.")

    for model, table_name in TABLE_MODELS:
        # Если таблицы нет в SQLite, пропускаем её чтение (новые SaaS таблицы)
        if not sqlite_inspector.has_table(table_name):
            print(f"Table '{table_name}' does not exist in SQLite. Skipping source reading.")
            continue
            
        # Считываем из SQLite через чистый SQL, чтобы избежать ошибок отсутствия tenant_id в SQLite таблицах
        result = sqlite_db.execute(text(f"SELECT * FROM {table_name}"))
        keys = result.keys()
        records = result.fetchall()
        
        print(f"Table '{table_name}': read {len(records)} records from SQLite.")
        
        if not records:
            continue
            
        # Для вставки используем SQLAlchemy ORM, перенося все атрибуты, включая ID
        for r in records:
            state = dict(zip(keys, r))
            
            # Прописываем tenant_id для мультитенантности
            if hasattr(model, "tenant_id"):
                state["tenant_id"] = 1


            
            # Проверяем и исправляем битые внешние ключи
            if table_name == "interactions":
                if state.get("client_id") not in existing_ids["clients"]:
                    state["client_id"] = None
            elif table_name == "objects":
                if state.get("client_id") not in existing_ids["clients"]:
                    state["client_id"] = None
            elif table_name == "lead_database":
                if state.get("task_id") not in existing_ids["special_tasks"]:
                    state["task_id"] = None
            elif table_name == "audit_logs":
                if state.get("user_id") not in existing_ids["users"]:
                    state["user_id"] = None
            elif table_name == "tasks":

                if state.get("created_by_id") not in existing_ids["users"]:
                    state["created_by_id"] = None # (или дефолтный юзер, но None безопаснее для вставки)
                if state.get("assigned_to_id") not in existing_ids["users"]:
                    state["assigned_to_id"] = None
            elif table_name == "material_consumptions":
                if state.get("object_id") not in existing_ids["objects"]:
                    state["object_id"] = None
                if state.get("inventory_id") not in existing_ids["inventory"]:
                    state["inventory_id"] = None
            elif table_name == "tenders":
                if state.get("client_id") and state.get("client_id") not in existing_ids["clients"]:
                    state["client_id"] = None
                if state.get("object_id") and state.get("object_id") not in existing_ids["objects"]:
                    state["object_id"] = None
                if state.get("assigned_user_id") and state.get("assigned_user_id") not in existing_ids["users"]:
                    state["assigned_user_id"] = None
            elif table_name == "task_messages":
                if state.get("task_id") and state.get("task_id") not in existing_ids["tasks"]:
                    state["task_id"] = None
                if state.get("user_id") not in existing_ids["users"]:
                    state["user_id"] = None
            elif table_name == "tender_roles":
                if state.get("tender_id") not in existing_ids["tenders"]:
                    state["tender_id"] = None
                if state.get("user_id") not in existing_ids["users"]:
                    state["user_id"] = None
            elif table_name == "documents":
                if state.get("client_id") not in existing_ids["clients"]:
                    state["client_id"] = None
                if state.get("object_id") and state.get("object_id") not in existing_ids["objects"]:
                    state["object_id"] = None
                if state.get("tender_id") and state.get("tender_id") not in existing_ids["tenders"]:
                    state["tender_id"] = None
            
            # Создаем чистый инстанс модели для вставки в Postgres
            pg_record = model(**state)
            pg_db.add(pg_record)
            
        pg_db.commit()
        print(f"Table '{table_name}': successfully wrote {len(records)} records to Postgres.")
        
        # Сохраняем вставленные ID в кэш
        if table_name in existing_ids:
            for r in records:
                existing_ids[table_name].add(r.id)

    # Шаг 3: Сброс последовательностей (sequences) в Postgres
    # Это КРИТИЧЕСКИ важно, чтобы автоинкремент ID в Postgres не выдавал Duplicate Key ошибок
    print("\nResetting PostgreSQL primary key sequences...")
    for model, table_name in TABLE_MODELS:
        try:
            # Начинаем новую подтранзакцию для каждого сброса
            pg_db.execute(text(f"SELECT setval(pg_get_serial_sequence('{table_name}', 'id'), coalesce(max(id), 1)) FROM {table_name};"))
            pg_db.commit()
            print(f"Sequence for table '{table_name}' reset successfully.")
        except Exception as seq_err:
            pg_db.rollback()
            print(f"Sequence reset skipped for table '{table_name}' (expected if no integer ID PK): {seq_err}")

    
    print("\nDB MIGRATION COMPLETED SUCCESSFULLY!")

except Exception as e:
    pg_db.rollback()
    print(f"\nMigration failed with error: {str(e).encode('utf-8', errors='ignore').decode('utf-8')}")
    sys.exit(1)

finally:
    sqlite_db.close()
    pg_db.close()
