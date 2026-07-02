import os
import sys
sys.path.insert(0, os.getcwd())

from sqlalchemy import text
from app.database import engine

def migrate():
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE clients ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;"))
        conn.commit()
    print("Migration successful")

if __name__ == "__main__":
    migrate()
