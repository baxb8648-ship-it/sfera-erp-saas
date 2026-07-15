import os
from dotenv import load_dotenv
from contextvars import ContextVar
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Query

load_dotenv()

# Глобальный асинхронный контекст для хранения ID текущей компании (тенанта)
current_tenant_id: ContextVar[int | None] = ContextVar("current_tenant_id", default=None)

# Настройки для базы данных (из окружения с фолбеком на SQLite)
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sphera_crm.db")

# Превращаем относительный путь SQLite в абсолютный относительно директории backend
if SQLALCHEMY_DATABASE_URL.startswith("sqlite:///"):
    db_path = SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "")
    if not os.path.isabs(db_path):
        # Получаем директорию backend (родительскую для папки app)
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        # Разрешаем путь относительно backend_dir
        abs_db_path = os.path.abspath(os.path.join(backend_dir, db_path))
        SQLALCHEMY_DATABASE_URL = f"sqlite:///{abs_db_path}"

# Конфигурируем СУБД с оптимизациями в зависимости от типа
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, 
        connect_args={"check_same_thread": False, "timeout": 30.0}
    )
    
    # Включаем режим WAL (Write-Ahead Logging) для SQLite, чтобы избежать блокировок при записи
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()
else:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"connect_timeout": 5}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# Автоматическая RLS-фильтрация на уровне SQLAlchemy
@event.listens_for(Query, "before_compile", retval=True)
def apply_tenant_filter(query: Query) -> Query:
    tenant_id = current_tenant_id.get()
    
    # Если в текущем контексте задан ID тенанта, изолируем выборку
    if tenant_id is not None:
        has_limit_or_offset = query._limit_clause is not None or query._offset_clause is not None
        
        if has_limit_or_offset:
            # SQLAlchemy не разрешает вызывать .filter() на запросах с LIMIT/OFFSET.
            # Временно сбрасываем их, применяем фильтрацию RLS и восстанавливаем.
            limit = query._limit_clause
            offset = query._offset_clause
            query = query.limit(None).offset(None)
            
            for ent in query.column_descriptions:
                entity = ent.get("entity")
                if entity is not None and hasattr(entity, "tenant_id"):
                    query = query.filter(entity.tenant_id == tenant_id)
                    
            if limit is not None:
                query = query.limit(limit)
            if offset is not None:
                query = query.offset(offset)
        else:
            for ent in query.column_descriptions:
                entity = ent.get("entity")
                if entity is not None and hasattr(entity, "tenant_id"):
                    query = query.filter(entity.tenant_id == tenant_id)
                
    return query


# Автоматическое присвоение tenant_id при создании новых записей (SaaS RLS)
@event.listens_for(SessionLocal, "before_flush")
def auto_set_tenant_id(session, flush_context, instances):
    tenant_id = current_tenant_id.get()
    if tenant_id is not None:
        for obj in session.new:
            if hasattr(obj, "tenant_id") and getattr(obj, "tenant_id", None) is None:
                setattr(obj, "tenant_id", tenant_id)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

