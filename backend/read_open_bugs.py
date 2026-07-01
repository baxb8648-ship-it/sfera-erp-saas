import sys
sys.path.insert(0, 'l:/SPHERA/АКЗ/АКЗ/АКЗ/backend')
from app.models import Bug
from app.database import engine, Base
from sqlalchemy.orm import Session

db = Session(engine)
bugs = db.query(Bug).filter(Bug.status == "open").all()
for b in bugs:
    print(f"BUG #{b.id}: {b.title}")
    print(f"  Component: {b.component}")
    print(f"  Severity: {b.severity}")
    print(f"  Steps: {b.steps}")
    print("-" * 40)
db.close()
