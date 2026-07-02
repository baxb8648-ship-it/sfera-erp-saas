"""Миграция Phase 3: добавление новых колонок в существующие таблицы Neon PostgreSQL."""
from app.database import engine
from sqlalchemy import text

migrations = [
    # tenants
    ("tenants.plan_modules",
     "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_modules JSON"),

    # objects — Project Engine
    ("objects.object_type",
     "ALTER TABLE objects ADD COLUMN IF NOT EXISTS object_type VARCHAR DEFAULT 'construction'"),
    ("objects.custom_fields",
     "ALTER TABLE objects ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'"),
    ("objects.owner_id",
     "ALTER TABLE objects ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES users(id)"),

    # objects — make old fields nullable (они уже могут быть nullable, IF NOT EXISTS игнорирует)
    ("objects.area_sqm nullable",
     "ALTER TABLE objects ALTER COLUMN area_sqm DROP NOT NULL"),
    ("objects.surface_type nullable",
     "ALTER TABLE objects ALTER COLUMN surface_type DROP NOT NULL"),
    ("objects.service_required nullable",
     "ALTER TABLE objects ALTER COLUMN service_required DROP NOT NULL"),

    # clients — owner for row-level RBAC
    ("clients.owner_id",
     "ALTER TABLE clients ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES users(id)"),
]

with engine.connect() as conn:
    for label, sql in migrations:
        try:
            conn.execute(text(sql))
            print(f"  + {label} — OK")
        except Exception as e:
            print(f"  ! {label}: {e}")
    conn.commit()
    print("\nМиграция Phase 3 завершена.")
