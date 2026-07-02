import os
from sqlalchemy import create_engine
from app.models import Base

def run_migration():
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        print("DATABASE_URL is not set!")
        return

    # Подключаемся к БД
    print(f"Connecting to database...")
    engine = create_engine(DATABASE_URL)
    
    # Создаем новые таблицы
    # Base.metadata.create_all создаст только те таблицы, которых еще нет
    print("Creating tables for Phase 4.1: DailyReport, ConstructionEstimate...")
    Base.metadata.create_all(bind=engine)
    
    print("Migration Phase 4.1 completed successfully.")

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    run_migration()
