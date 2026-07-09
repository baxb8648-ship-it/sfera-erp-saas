import logging
import os
import shutil
import contextlib
import asyncio
from datetime import datetime, timedelta
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base, SQLALCHEMY_DATABASE_URL
from . import models

logger = logging.getLogger("uvicorn.error")

def cleanup_old_backups(backup_dir):
    try:
        now = datetime.now()
        files = os.listdir(backup_dir)
        
        for file in files:
            if not (file.startswith("backup_") and file.endswith(".db")):
                continue
                
            file_path = os.path.join(backup_dir, file)
            date_str = file.replace("backup_", "").replace(".db", "")
            try:
                file_date = datetime.strptime(date_str, "%Y-%m-%d")
            except ValueError:
                continue
                
            age_days = (now - file_date).days
            keep = False
            
            # Регламент хранения:
            # 1. Ежемесячный бэкап (1-е число месяца) -> храним 365 дней (12 месяцев)
            if file_date.day == 1:
                if age_days < 365:
                    keep = True
            # 2. Еженедельный бэкап (Воскресенье) -> храним 28 дней (4 недели)
            elif file_date.weekday() == 6:
                if age_days < 28:
                    keep = True
            # 3. Ежедневный бэкап -> храним 7 дней
            else:
                if age_days < 7:
                    keep = True
            
            if not keep:
                os.remove(file_path)
                logger.info(f"Удален устаревший бэкап согласно регламенту хранения: {file}")
                
    except Exception as e:
        logger.error(f"Ошибка при очистке бэкапов: {e}")

def perform_db_backup():
    # Если база данных не SQLite, резервное копирование файла .db пропускается
    if not SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
        return

    # Получаем абсолютный путь к базе данных из SQLALCHEMY_DATABASE_URL
    db_file = "sphera_crm.db"
    backup_dir = "backups"
    
    if SQLALCHEMY_DATABASE_URL.startswith("sqlite:///"):

        db_file = SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "")
        
    # backup_dir также сделаем абсолютным относительно папки backend
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    abs_backup_dir = os.path.abspath(os.path.join(backend_dir, backup_dir))
    os.makedirs(abs_backup_dir, exist_ok=True)
    
    if not os.path.exists(db_file):
        logger.error(f"Файл базы данных для резервного копирования не найден: {db_file}")
        return

    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    backup_filename = f"backup_{today_str}.db"
    backup_path = os.path.join(abs_backup_dir, backup_filename)
    
    if os.path.exists(backup_path):
        # Бэкап на сегодня уже есть, запускаем только ротацию
        cleanup_old_backups(abs_backup_dir)
        return

    try:
        shutil.copy2(db_file, backup_path)
        logger.info(f"Резервная копия базы данных успешно создана: {backup_path}")
    except Exception as e:
        logger.error(f"Ошибка при резервном копировании базы данных: {e}")
        return

    cleanup_old_backups(abs_backup_dir)

async def scheduled_backup_loop():
    # Ждем 15 секунд после запуска, чтобы не нагружать старт приложения
    await asyncio.sleep(15)
    while True:
        try:
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, perform_db_backup)
        except Exception as e:
            logger.error(f"Ошибка планировщика резервного копирования: {e}")
        
        # Проверяем каждые 6 часов
        await asyncio.sleep(21600)

def run_tender_deadline_check():
    from .database import SessionLocal
    from .notifications import check_tender_deadlines
    db = SessionLocal()
    try:
        check_tender_deadlines(db)
    except Exception as e:
        logger.error(f"Ошибка при проверке дедлайнов тендеров: {e}")
    finally:
        db.close()

async def scheduled_tender_notifications_loop():
    # Ждем 30 секунд после запуска, чтобы не нагружать старт приложения
    await asyncio.sleep(30)
    while True:
        try:
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, run_tender_deadline_check)
        except Exception as e:
            logger.error(f"Ошибка планировщика уведомлений тендеров: {e}")
        
        # Проверяем каждые 12 часов (43200 секунд)
        await asyncio.sleep(43200)

def run_retention_emails_check():
    from .database import SessionLocal
    from .models import Tenant, User, Organization
    from .utils.email_retention import send_day7_checkin_email, send_trial_ending_alert_email
    from datetime import datetime, timedelta
    
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        
        # 1. Day 7 checkin (Созданы 7-8 дней назад)
        day7_start = now - timedelta(days=8)
        day7_end = now - timedelta(days=7)
        
        tenants_for_day7 = db.query(Tenant).filter(
            Tenant.created_at >= day7_start,
            Tenant.created_at <= day7_end,
            Tenant.day7_email_sent == False
        ).all()
        
        for t in tenants_for_day7:
            org = db.query(Organization).filter(Organization.tenant_id == t.id).first()
            if org and org.email and t.is_onboarded:
                send_day7_checkin_email(db, org.email, t.name)
            t.day7_email_sent = True
        
        # 2. Trial ending alert (Осталось от 2 до 3 дней)
        trial_end_start = now + timedelta(days=2)
        trial_end_end = now + timedelta(days=3)
        
        tenants_for_trial = db.query(Tenant).filter(
            Tenant.subscription_ends_at >= trial_end_start,
            Tenant.subscription_ends_at <= trial_end_end,
            Tenant.trial_ending_email_sent == False,
            Tenant.is_active == True
        ).all()
        
        for t in tenants_for_trial:
            org = db.query(Organization).filter(Organization.tenant_id == t.id).first()
            if org and org.email:
                days_left = max(1, (t.subscription_ends_at - now).days)
                send_trial_ending_alert_email(db, org.email, t.name, days_left)
            t.trial_ending_email_sent = True
                
        db.commit()
    except Exception as e:
        logger.error(f"Ошибка при проверке retention email: {e}")
    finally:
        db.close()

async def scheduled_retention_emails_loop():
    await asyncio.sleep(45) # Ждем старта приложения
    while True:
        try:
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, run_retention_emails_check)
        except Exception as e:
            logger.error(f"Ошибка планировщика retention email: {e}")
        # Проверяем каждые 12 часов
        await asyncio.sleep(43200)

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    # Запуск фоновых задач при старте
    from .scheduler import start_scheduler, stop_scheduler
    from .telegram_polling import run_telegram_polling_loop
    start_scheduler()
    
    backup_task = asyncio.create_task(scheduled_backup_loop())
    tender_task = asyncio.create_task(scheduled_tender_notifications_loop())
    retention_task = asyncio.create_task(scheduled_retention_emails_loop())
    telegram_task = asyncio.create_task(run_telegram_polling_loop())
    yield
    # Остановка задач при завершении работы приложения
    stop_scheduler()
    backup_task.cancel()
    tender_task.cancel()
    retention_task.cancel()
    telegram_task.cancel()
    try:
        await asyncio.gather(backup_task, tender_task, retention_task, telegram_task, return_exceptions=True)
    except:
        pass


from .api import (clients, auth, objects, finance, documents, inventory, equipment, dashboard, settings, users, tenders, tender_integrations, templates, backup, analytics, websocket_route, tasks, export, audit, telegram_webhook, biurs_route, special_tasks_route, leads_route, ops_route, decision_log_route, devbrain_route, oblakocrm_bot, tenants, billing_route, ai_rag_route, support_route,
    permissions_route,
    field_templates_route,
    construction_route,
    langgraph_route,
    marketplace_route,
    ai_finetune_route,
    telegram_bots_route,
    supply_route,
    service_route,
    booking_route,
    agro_route,
    furniture_route,
    fleet_route,
    agents_route   # Монетизация ИИ-Агентов (3 бесплатных + платные)
)


# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(title="СФЕРА API", version="1.0.0", lifespan=lifespan)

# Middleware для автоматической простановки HTTP-заголовков безопасности и защиты от CSRF (Режим 10)
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    # CSRF-валидация для мутирующих запросов (POST, PUT, PATCH, DELETE)
    if request.method in ["POST", "PUT", "PATCH", "DELETE"]:
        path = request.url.path
        exclude_paths = ["/auth/login", "/auth/create-admin-init", "/docs", "/openapi.json", "/telegram/webhook", "/sfera_bot/webhook", "/tenants/register", "/tenants/suggest"]

        if not any(path.startswith(p) for p in exclude_paths):
            # CSRF-защита необходима только при авторизации через куки (Режим 10)
            if "access_token" in request.cookies:
                csrf_cookie = request.cookies.get("csrf_token")
                csrf_header = request.headers.get("X-CSRF-Token") or request.headers.get("x-csrf-token")
                if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
                    logger.warning(f"CSRF validation failed for path: {path}, method: {request.method}")
                    from fastapi.responses import JSONResponse
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "CSRF token validation failed"}
                    )

    response = await call_next(request)
    
    # Защита от кликджекинга: запрещаем встраивание страниц в iframe на сторонних сайтах (Режим 10)
    response.headers["X-Frame-Options"] = "DENY"
    # Запрет браузерам угадывать MIME-тип контента, предотвращая XSS через маскировку скриптов под файлы (Режим 10)
    response.headers["X-Content-Type-Options"] = "nosniff"
    # Ограничение передачи Referer для защиты конфиденциальности URL (Режим 10)
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    import os
    is_prod = os.getenv("ENVIRONMENT", "development") == "production"
    script_src = "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com;" if is_prod else "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com;"
    
    # Content Security Policy (CSP): разрешаем выполнение скриптов и загрузку стилей только из доверенных источников (Режим 10)
    # connect-src включает домен Cloudflare-туннеля API (punycode), чтобы браузер не блокировал fetch-запросы
    # ВАЖНО: кириллические домены в HTTP-заголовках недопустимы — использовать только punycode!
    response.headers["Content-Security-Policy"] = (
        f"default-src 'self' http://localhost:* http://127.0.0.1:* "
        f"https://api.xn--56-6kctpmeri.xn--p1ai; "
        f"{script_src} "
        f"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://unpkg.com; "
        f"font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net; "
        f"img-src 'self' data: blob: http://localhost:* http://127.0.0.1:* https://fastapi.tiangolo.com https://cdn.jsdelivr.net; "
        f"connect-src 'self' http://localhost:* http://127.0.0.1:* "
        f"https://api.xn--56-6kctpmeri.xn--p1ai wss://api.xn--56-6kctpmeri.xn--p1ai;"
    )
    return response

# Настройка безопасных CORS-политик: исключаем wildcard "*" для защиты от несанкционированных CSRF/cross-origin запросов (Режим 10)
# Добавляем после add_security_headers, чтобы CORSMiddleware был внешним и проставлял заголовки для ответов из middleware
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://localhost:4173",
    "http://localhost:4174",
    "http://127.0.0.1:4173",
    "http://127.0.0.1:4174",
    "http://xn--56-6kctpmeri.xn--p1ai",
    "https://xn--56-6kctpmeri.xn--p1ai",
    "http://леоника56.рф",
    "https://леоника56.рф",
    "http://xn--l1ahc.xn--56-6kctpmeri.xn--p1ai",
    "https://xn--l1ahc.xn--56-6kctpmeri.xn--p1ai",
    "http://срм.леоника56.рф",
    "https://срм.леоника56.рф",
    "http://crm.xn--56-6kctpmeri.xn--p1ai",
    "https://crm.xn--56-6kctpmeri.xn--p1ai",
    "http://crm.леоника56.рф",
    "https://crm.леоника56.рф"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(clients.router)
app.include_router(objects.router)
app.include_router(finance.router)
app.include_router(documents.router)
app.include_router(inventory.router)
app.include_router(equipment.router)
app.include_router(dashboard.router)
app.include_router(analytics.router)
app.include_router(websocket_route.router)
app.include_router(settings.router)
app.include_router(users.router)
app.include_router(tenders.router)
app.include_router(tender_integrations.router)
app.include_router(templates.router)
app.include_router(backup.router)
app.include_router(tasks.router)
app.include_router(export.router)
app.include_router(audit.router)
app.include_router(telegram_webhook.router)
app.include_router(biurs_route.router)
app.include_router(special_tasks_route.router)
app.include_router(leads_route.router)
app.include_router(ops_route.router)
app.include_router(decision_log_route.router)
app.include_router(devbrain_route.router)
app.include_router(oblakocrm_bot.router)
app.include_router(tenants.router)
app.include_router(billing_route.router)
app.include_router(ai_rag_route.router)
app.include_router(support_route.router)
app.include_router(permissions_route.router)  # Фаза 3.3 — Глубокий RBAC
app.include_router(field_templates_route.router)  # Фаза 3.1 & 3.2 — Конструктор полей
app.include_router(construction_route.router)  # Фаза 4.1 — Строительство
app.include_router(langgraph_route.router)  # Фаза 5.1 — Оркестратор LangGraph
app.include_router(marketplace_route.router)  # Фаза 6.1 — Глобальный Маркетплейс B2B
app.include_router(ai_finetune_route.router)  # Фаза 7 — AI Fine-tuning
app.include_router(telegram_bots_route.router) # Фаза 8 — Мульти-Боты
app.include_router(supply_route.router) # Фаза 9.3 — Логистика и Снабжение
app.include_router(service_route.router) # Фаза 9.4 — ТОиР
app.include_router(booking_route.router) # Фаза 9.1 — Онлайн Запись и Услуги
app.include_router(furniture_route.router) # Фаза 2 — Мебельное производство
app.include_router(agro_route.router) # Фаза 10 - Агро
app.include_router(fleet_route.router) # Фаза 1 — Аренда спецтехники
app.include_router(agents_route.router)  # Монетизация: Каталог ИИ-агентов + Usage Limits



@app.get("/")
def read_root():
    return {"message": "Welcome to СФЕРА API"}
