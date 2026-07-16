import os
import sys

# Добавляем корневую директорию SFERUM в sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.app.database import engine, Base
# Импортируем модели, чтобы SQLAlchemy увидел их при Base.metadata.create_all
from backend.app.models import BookingCategory, BookingService, TechCardItem, Appointment

print("Starting migration for Phase 9.1: Booking...")

def migrate():
    try:
        # Создаст только недостающие таблицы (booking_categories, booking_services, tech_card_items, appointments)
        Base.metadata.create_all(bind=engine)
        print("Migration successful! Tables for Booking created.")
    except Exception as e:
        print(f"Error during migration: {e}")

if __name__ == "__main__":
    migrate()
