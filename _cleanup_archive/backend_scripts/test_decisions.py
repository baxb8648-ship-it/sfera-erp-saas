import sys
sys.path.insert(0, 'l:/SFERUM/АКЗ/АКЗ/АКЗ/backend')
from app.models import DecisionLog
print('Model OK:', DecisionLog.__tablename__)

from app.database import engine, Base
Base.metadata.create_all(bind=engine)
print('Table created/verified OK')

from sqlalchemy.orm import Session
db = Session(engine)
count = db.query(DecisionLog).count()
print(f'Records in decision_log: {count}')
for r in db.query(DecisionLog).all():
    print(f'  #{r.id} {r.title}')
db.close()
