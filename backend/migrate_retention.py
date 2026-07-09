import os
import sys

# Добавляем родительскую папку в sys.path, чтобы импорт app работал корректно
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from sqlalchemy import text

def run_migration():
    print("Starting migration for Retention Email (RET-001/002)...")
    
    with engine.connect() as conn:
        try:
            # Пытаемся добавить колонку welcome_email_sent
            conn.execute(text("ALTER TABLE tenants ADD COLUMN welcome_email_sent BOOLEAN DEFAULT FALSE;"))
            print("Success: Column welcome_email_sent added.")
        except Exception as e:
            print(f"Warning: welcome_email_sent might already exist: {e}")

        try:
            # Пытаемся добавить колонку day7_email_sent
            conn.execute(text("ALTER TABLE tenants ADD COLUMN day7_email_sent BOOLEAN DEFAULT FALSE;"))
            print("Success: Column day7_email_sent added.")
        except Exception as e:
            print(f"Warning: day7_email_sent might already exist: {e}")

        try:
            # Пытаемся добавить колонку trial_ending_email_sent
            conn.execute(text("ALTER TABLE tenants ADD COLUMN trial_ending_email_sent BOOLEAN DEFAULT FALSE;"))
            print("Success: Column trial_ending_email_sent added.")
        except Exception as e:
            print(f"Warning: trial_ending_email_sent might already exist: {e}")

        conn.commit()

    print("Migration finished.")

if __name__ == "__main__":
    run_migration()
