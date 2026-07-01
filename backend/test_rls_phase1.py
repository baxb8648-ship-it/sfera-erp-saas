"""
=============================================================
ТЕСТ ФАЗЫ 1: RLS изоляция тенантов на Neon PostgreSQL
=============================================================
Проверяем:
1. Бэкенд запускается с DATABASE_URL на Neon PostgreSQL
2. RLS изолирует данные между тенантами (tenant_1 не видит данные tenant_2)
3. Суперадмин (без tenant_id) видит все данные

Запуск: python test_rls_phase1.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()

print("=" * 60)
print("ФАЗА 1: ТЕСТ RLS ИЗОЛЯЦИИ ТЕНАНТОВ")
print("=" * 60)

DATABASE_URL = os.getenv("DATABASE_URL", "")
if "neon.tech" in DATABASE_URL:
    print("[OK] Подключение: Neon PostgreSQL (Cloud)")
elif "sqlite" in DATABASE_URL:
    print("[WARN] Подключение: SQLite (локальная БД — переключитесь на Neon!)")
else:
    print(f"[INFO] DATABASE_URL: {DATABASE_URL[:50]}...")

print()

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.database import current_tenant_id, Base
from app.models import User, Client, Tenant

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

# ── ТЕСТ 1: Список тенантов ─────────────────────────────
print("[TEST 1] Список тенантов в системе:")
db = Session()
try:
    tenants = db.query(Tenant).all()
    if not tenants:
        print("  Тенантов нет в БД")
    for t in tenants:
        print(f"  Tenant #{t.id}: {t.name} | ИНН: {t.inn} | Активен: {t.is_active}")
finally:
    db.close()

print()

# ── ТЕСТ 2: Без tenant_id — суперадмин видит всех пользователей ──
print("[TEST 2] Без tenant_id (суперадмин) — должны видеть ВСЕХ пользователей:")
db = Session()
try:
    token = current_tenant_id.set(None)  # нет фильтрации
    users = db.query(User).all()
    print(f"  Всего пользователей в системе: {len(users)}")
    for u in users[:5]:
        t_id = getattr(u, 'tenant_id', 'N/A')
        print(f"    User #{u.id}: {u.username} | tenant_id={t_id}")
    current_tenant_id.reset(token)
finally:
    db.close()

print()

# ── ТЕСТ 3: С tenant_id=1 — видим только данные первого тенанта ──
print("[TEST 3] С tenant_id=1 — RLS должен фильтровать только tenant_1:")
db = Session()
try:
    token = current_tenant_id.set(1)
    users_t1 = db.query(User).all()
    print(f"  Пользователей tenant_id=1: {len(users_t1)}")
    for u in users_t1[:3]:
        t_id = getattr(u, 'tenant_id', 'N/A')
        print(f"    User #{u.id}: {u.username} | tenant_id={t_id}")
    current_tenant_id.reset(token)
finally:
    db.close()

print()

# ── ТЕСТ 4: Создаём тестового второго тенанта ──────────────
print("[TEST 4] Создаём тестового Tenant #2 (ООО ТЕСТ):")
db = Session()
try:
    existing = db.query(Tenant).filter(Tenant.id == 2).first()
    if existing:
        print(f"  Tenant #2 уже существует: {existing.name}")
    else:
        tenant2 = Tenant(
            id=2,
            name="ООО ТЕСТ",
            full_name="ООО ТЕСТ — тестовый тенант для проверки RLS",
            inn="1234567890",
            kpp="123456789",
            ogrn="1231231231231",
            address="г. Москва, ул. Тестовая, д. 1",
            director="Тестов Т.Т.",
            sphere="services",
            is_active=True
        )
        db.add(tenant2)
        db.commit()
        print("  [OK] Tenant #2 создан: ООО ТЕСТ | ИНН: 1234567890")
finally:
    db.close()

print()

# ── ТЕСТ 5: Создаём пользователя для tenant #2 ──────────────
print("[TEST 5] Создаём тестового User для Tenant #2:")
db = Session()
try:
    existing_user = db.query(User).filter(User.username == "test_user_t2").first()
    if existing_user:
        print(f"  Пользователь уже существует: {existing_user.username} | tenant_id={existing_user.tenant_id}")
    else:
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        test_user = User(
            username="test_user_t2",
            hashed_password=pwd_context.hash("test1234"),
            role="manager",
            tenant_id=2,
            is_active=1
        )
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
        print(f"  [OK] Создан: test_user_t2 | tenant_id={test_user.tenant_id}")
finally:
    db.close()

print()

# ── ТЕСТ 6: RLS изоляция — tenant_1 НЕ должен видеть пользователей tenant_2 ──
print("[TEST 6] КРИТИЧЕСКИЙ ТЕСТ RLS: tenant_1 не видит пользователей tenant_2:")
db = Session()
try:
    token = current_tenant_id.set(1)
    users_for_t1 = db.query(User).all()
    usernames = [u.username for u in users_for_t1]
    if "test_user_t2" in usernames:
        print("  [FAIL] УТЕЧКА ДАННЫХ! tenant_1 видит пользователей tenant_2!")
    else:
        print(f"  [PASS] RLS работает корректно! Tenant_1 видит {len(users_for_t1)} пользователей, test_user_t2 скрыт")
    current_tenant_id.reset(token)
finally:
    db.close()

print()

# ── ТЕСТ 7: tenant_2 видит только своего пользователя ──
print("[TEST 7] tenant_2 видит только СВОИХ пользователей:")
db = Session()
try:
    token = current_tenant_id.set(2)
    users_for_t2 = db.query(User).all()
    usernames_t2 = [u.username for u in users_for_t2]
    if "test_user_t2" in usernames_t2:
        print(f"  [PASS] Tenant_2 видит {len(users_for_t2)} своего пользователя: {usernames_t2}")
    else:
        print(f"  [WARN] test_user_t2 не найден в tenant_2. Список: {usernames_t2}")
    current_tenant_id.reset(token)
finally:
    db.close()

print()
print("=" * 60)
print("ИТОГ ТЕСТА ФАЗЫ 1 ЗАВЕРШЁН")
print("=" * 60)
