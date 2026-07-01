from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import User, SpecialTask
from ..schemas import SpecialTaskCreate, SpecialTaskResponse
from .auth import get_current_user
from ..services.special_tasks_service import run_special_task_campaign

router = APIRouter(prefix="/special-tasks", tags=["Special Tasks"])

@router.get("/", response_model=List[SpecialTaskResponse])
def get_special_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(SpecialTask).order_by(SpecialTask.created_at.desc()).all()

@router.post("/", response_model=SpecialTaskResponse, status_code=status.HTTP_201_CREATED)
def create_special_task(
    payload: SpecialTaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_task = SpecialTask(**payload.model_dump())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@router.put("/{task_id}", response_model=SpecialTaskResponse)
def update_special_task(
    task_id: int,
    payload: SpecialTaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_task = db.query(SpecialTask).filter(SpecialTask.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Спецзадание не найдено")
        
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(db_task, key, value)
        
    db.commit()
    db.refresh(db_task)
    return db_task

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_special_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_task = db.query(SpecialTask).filter(SpecialTask.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Спецзадание не найдено")
        
    db.delete(db_task)
    db.commit()
    return None

@router.post("/{task_id}/run")
def run_task(
    task_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Запускает спецзадание на поиск и рассылку КП по ключевым словам.
    """
    db_task = db.query(SpecialTask).filter(SpecialTask.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Спецзадание не найдено")
        
    background_tasks.add_task(run_special_task_campaign, db, task_id, current_user.id)
    return {"status": "success", "message": f"Снайпер-кампания '{db_task.name}' запущена в фоновом режиме."}
