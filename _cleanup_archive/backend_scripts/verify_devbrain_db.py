import sys
sys.path.insert(0, 'l:/SPHERA/АКЗ/АКЗ/АКЗ/backend')
from app.models import Epic, Feature, Bug
from app.database import engine, Base

# Вызов создания таблиц
Base.metadata.create_all(bind=engine)
print("Tables 'epics', 'features', 'bugs' successfully created/verified!")

# Тестовая проверка подключения к БД
from sqlalchemy.orm import Session
db = Session(engine)
try:
    epic_count = db.query(Epic).count()
    feature_count = db.query(Feature).count()
    bug_count = db.query(Bug).count()
    print(f"Current counts in database:")
    print(f"  Epics: {epic_count}")
    print(f"  Features: {feature_count}")
    print(f"  Bugs: {bug_count}")
except Exception as e:
    print(f"Error checking tables: {e}")
finally:
    db.close()
