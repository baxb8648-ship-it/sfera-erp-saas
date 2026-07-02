from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from ..database import get_db
from ..models import User, AIFineTuneJob
from .auth import get_current_user
from ..services.ai_finetune_engine import run_lora_training

router = APIRouter(prefix="/ai/finetune", tags=["AI Fine-Tuning"])

class JobOut(BaseModel):
    id: int
    status: str
    progress_percent: int
    logs: list
    adapter_path: Optional[str]
    
    class Config:
        from_attributes = True

@router.post("/start", response_model=JobOut)
def start_finetuning(background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Запускает процесс сбора датасета и дообучения LoRA."""
    if current_user.role != "admin" and current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Доступ запрещен. Только администраторы.")
        
    tenant_id = current_user.tenant_id
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Нет tenant_id")

    # Проверка, нет ли уже активной задачи
    active_job = db.query(AIFineTuneJob).filter(
        AIFineTuneJob.tenant_id == tenant_id,
        AIFineTuneJob.status.in_(["idle", "extracting", "training"])
    ).first()
    
    if active_job:
        raise HTTPException(status_code=400, detail="Процесс обучения уже запущен.")
        
    new_job = AIFineTuneJob(
        tenant_id=tenant_id,
        user_id=current_user.id,
        status="idle",
        logs=["[init] Инициализация среды для дообучения..."]
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    
    background_tasks.add_task(run_lora_training, new_job.id)
    
    return new_job

@router.get("/status", response_model=JobOut)
def get_finetune_status(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Возвращает статус последнего запущенного процесса (для терминала)."""
    job = db.query(AIFineTuneJob).filter(AIFineTuneJob.tenant_id == current_user.tenant_id)\
        .order_by(AIFineTuneJob.created_at.desc()).first()
        
    if not job:
        raise HTTPException(status_code=404, detail="Нет запущенных процессов")
        
    return job
