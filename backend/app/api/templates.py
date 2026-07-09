import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from ..database import get_db
from ..models import DocumentTemplate, User
from .auth import get_current_user

router = APIRouter(prefix="/templates", tags=["Templates"])

# Ensure absolute or relative path to avoid issues
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_DIR = os.path.join(BASE_DIR, "data", "templates")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def ensure_default_templates(db: Session, tenant_id: int):
    """
    Создает стартовые профессиональные шаблоны документов для нового тенанта,
    если у компании еще нет активных шаблонов.
    """
    existing = db.query(DocumentTemplate).filter(
        DocumentTemplate.tenant_id == tenant_id,
        DocumentTemplate.is_active == 1
    ).first()
    if not existing:
        defaults = [
            ("Стандартное Коммерческое Предложение (ГОСТ Р 7.0.97)", "kp"),
            ("Типовой Договор подряда и оказания услуг", "contract"),
            ("Стандартный Счет на оплату с реквизитами", "invoice"),
            ("Акт сдачи-приемки выполненных работ (УПД)", "act"),
        ]
        for name, doc_type in defaults:
            db.add(DocumentTemplate(
                tenant_id=tenant_id,
                name=name,
                doc_type=doc_type,
                file_path="system_default",
                is_active=1
            ))
        db.commit()

@router.post("/upload")
async def upload_template(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not file.filename.endswith('.docx'):
        raise HTTPException(status_code=400, detail="Только .docx файлы разрешены")
    
    safe_filename = f"{int(datetime.utcnow().timestamp())}_{file.filename.replace(' ', '_')}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    content = await file.read(MAX_FILE_SIZE + 1)
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Файл слишком большой. Максимум 50MB.")
        
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка сохранения файла: {str(e)}")
        
    doc_type = file.filename.replace('.docx', '')
    
    new_template = DocumentTemplate(
        tenant_id=current_user.tenant_id,
        name=file.filename,
        doc_type=doc_type,
        file_path=file_path,
        is_active=1
    )
    
    db.add(new_template)
    db.commit()
    db.refresh(new_template)
    
    return {"message": "Шаблон успешно загружен", "id": new_template.id, "name": new_template.name}

@router.get("/")
def get_templates(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.tenant_id:
        ensure_default_templates(db, current_user.tenant_id)
    query = db.query(DocumentTemplate).filter(DocumentTemplate.is_active == 1)
    if current_user.tenant_id:
        query = query.filter((DocumentTemplate.tenant_id == current_user.tenant_id) | (DocumentTemplate.tenant_id == None))
    templates = query.order_by(DocumentTemplate.id.desc()).all()
    return templates

@router.delete("/{template_id}")
def delete_template(template_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(DocumentTemplate).filter(DocumentTemplate.id == template_id)
    if current_user.tenant_id:
        query = query.filter(DocumentTemplate.tenant_id == current_user.tenant_id)
    template = query.first()
    if not template:
        raise HTTPException(status_code=404, detail="Шаблон не найден")
        
    template.is_active = 0
    db.commit()
    
    return {"message": "Шаблон удален"}
