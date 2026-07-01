from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Dict, Any
from datetime import datetime
import json
from enum import Enum

from .auth import get_current_user
from ..database import get_db, engine
from ..models import (
    Client, Interaction, Object, MaterialConsumption, User, AuthLog, 
    FinanceTransaction, Document, InventoryItem, EquipmentItem, 
    CompanySetting, Organization, Tender, TenderPlatform, TenderRole, 
    DocumentTemplate, User as UserModel
)

router = APIRouter(prefix="/backup", tags=["backup"])

MODELS_ORDER = [
    # Top level
    UserModel, CompanySetting, Organization, TenderPlatform, DocumentTemplate, InventoryItem,
    # Middle
    Client,
    # Depends on Client
    Object,
    # Depends on Client/Object
    Interaction, Document, EquipmentItem, MaterialConsumption, FinanceTransaction,
    # Tenders
    Tender,
    # Depends on Tender
    TenderRole,
    # Logs
    AuthLog
]

def serialize_value(val):
    if isinstance(val, datetime):
        return val.isoformat()
    if isinstance(val, Enum):
        return val.value
    return val

def deserialize_value(val):
    # Try to parse datetime strings
    if isinstance(val, str) and len(val) >= 19 and "T" in val:
        try:
            return datetime.fromisoformat(val)
        except ValueError:
            pass
    return val

@router.get("/export")
def export_database(db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Только администратор может делать бэкап")

    backup_data = {}
    
    for model in MODELS_ORDER:
        table_name = model.__tablename__
        records = db.query(model).all()
        
        table_data = []
        for record in records:
            # Convert sqlalchemy object to dict
            row_dict = {c.name: getattr(record, c.name) for c.name in record.__table__.columns.keys()}
            # Serialize
            for k, v in row_dict.items():
                row_dict[k] = serialize_value(v)
                
            table_data.append(row_dict)
            
        backup_data[table_name] = table_data
        
    return backup_data

@router.post("/import")
async def import_database(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Только администратор может восстанавливать бэкап")
        
    if not file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="Только JSON файлы поддерживаются")
        
    try:
        MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
        content = await file.read(MAX_FILE_SIZE + 1)
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="Файл слишком большой. Максимум 50MB.")
        backup_data = json.loads(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ошибка парсинга JSON: {str(e)}")

    # Delete existing data in reverse order to avoid foreign key constraint errors
    try:
        # For SQLite, it is safer to turn off PRAGMA foreign_keys to wipe
        db.execute(text("PRAGMA foreign_keys = OFF;"))
        
        for model in reversed(MODELS_ORDER):
            db.execute(text(f"DELETE FROM {model.__tablename__};"))
            
        # Re-insert
        for model in MODELS_ORDER:
            table_name = model.__tablename__
            if table_name in backup_data:
                for row in backup_data[table_name]:
                    deserialized_row = {k: deserialize_value(v) for k, v in row.items()}
                    new_record = model(**deserialized_row)
                    db.add(new_record)
        
        db.commit()
        db.execute(text("PRAGMA foreign_keys = ON;"))
        
    except Exception as e:
        db.rollback()
        # Ensure FK is ON again
        db.execute(text("PRAGMA foreign_keys = ON;"))
        raise HTTPException(status_code=500, detail=f"Ошибка при восстановлении базы данных: {str(e)}")
        
    return {"message": "База данных успешно восстановлена"}
