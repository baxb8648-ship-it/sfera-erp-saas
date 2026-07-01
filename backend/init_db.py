import sys
import os

# Добавляем backend в sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base
import app.models  # Импортируем модели, чтобы SQLAlchemy знал о них

print("Connecting to Neon PostgreSQL and creating tables...")
try:
    Base.metadata.create_all(bind=engine)
    print("All tables successfully initialized in Neon PostgreSQL!")
except Exception as e:
    print(f"Error initializing database tables: {e}")
    sys.exit(1)
