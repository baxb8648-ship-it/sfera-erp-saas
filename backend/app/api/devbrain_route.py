"""
devbrain_route.py — REST API для управления разработкой (DevBrain).
Предоставляет эндпоинты для управления Epic, Feature, Bug.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from ..database import get_db
from ..models import Epic, Feature, Bug

router = APIRouter(prefix="/devbrain", tags=["DevBrain"])

# ─── Pydantic схемы ──────────────────────────────────────────────────────────

class EpicCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "planned"
    priority: Optional[str] = "Medium"

class EpicOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: str
    priority: str
    created_at: datetime

    class Config:
        from_attributes = True

class FeatureCreate(BaseModel):
    epic_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    module: Optional[str] = None
    status: Optional[str] = "planned"
    priority: Optional[str] = "Medium"

class FeatureOut(BaseModel):
    id: int
    epic_id: Optional[int]
    title: str
    description: Optional[str]
    module: Optional[str]
    status: str
    priority: str
    created_at: datetime

    class Config:
        from_attributes = True

class BugCreate(BaseModel):
    title: str
    steps: Optional[str] = None
    severity: Optional[str] = "Medium"
    component: Optional[str] = None
    status: Optional[str] = "open"

class BugOut(BaseModel):
    id: int
    title: str
    steps: Optional[str]
    severity: str
    component: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# ─── Эндпоинты ────────────────────────────────────────────────────────────────

@router.get("/status")
def get_dev_dashboard(db: Session = Depends(get_db)):
    """
    Дашборд текущей разработки:
    Агрегированные данные о количестве багов, фич и эпиков по статусам.
    """
    total_epics = db.query(Epic).count()
    active_epics = db.query(Epic).filter(Epic.status == "in_progress").count()
    
    total_features = db.query(Feature).count()
    active_features = db.query(Feature).filter(Feature.status == "in_progress").count()
    
    total_bugs = db.query(Bug).count()
    open_bugs = db.query(Bug).filter(Bug.status.in_(["open", "in_progress"])).count()
    critical_bugs = db.query(Bug).filter(Bug.status.in_(["open", "in_progress"]), Bug.severity == "Critical").count()

    return {
        "epics": {
            "total": total_epics,
            "active": active_epics
        },
        "features": {
            "total": total_features,
            "active": active_features
        },
        "bugs": {
            "total": total_bugs,
            "open": open_bugs,
            "critical": critical_bugs
        }
    }

# ── Эпики (Epics) ──

@router.get("/epics", response_model=List[EpicOut])
def list_epics(db: Session = Depends(get_db)):
    return db.query(Epic).order_by(Epic.created_at.desc()).all()

@router.post("/epics", response_model=EpicOut, status_code=201)
def create_epic(body: EpicCreate, db: Session = Depends(get_db)):
    record = Epic(**body.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

@router.delete("/epics/{epic_id}")
def delete_epic(epic_id: int, db: Session = Depends(get_db)):
    record = db.query(Epic).filter(Epic.id == epic_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Эпик не найден")
    db.delete(record)
    db.commit()
    return {"ok": True, "deleted_id": epic_id}

# ── Фичи (Features) ──

@router.get("/features", response_model=List[FeatureOut])
def list_features(epic_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Feature)
    if epic_id is not None:
        query = query.filter(Feature.epic_id == epic_id)
    return query.order_by(Feature.created_at.desc()).all()

@router.post("/features", response_model=FeatureOut, status_code=201)
def create_feature(body: FeatureCreate, db: Session = Depends(get_db)):
    if body.epic_id:
        epic_exists = db.query(Epic).filter(Epic.id == body.epic_id).first()
        if not epic_exists:
            raise HTTPException(status_code=400, detail="Указанный Эпик не существует")
            
    record = Feature(**body.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

# ── Баги (Bugs) ──

@router.get("/bugs", response_model=List[BugOut])
def list_bugs(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Bug)
    if status:
        query = query.filter(Bug.status == status)
    return query.order_by(Bug.created_at.desc()).all()

@router.post("/bugs", response_model=BugOut, status_code=201)
def create_bug(body: BugCreate, db: Session = Depends(get_db)):
    record = Bug(**body.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

@router.post("/bugs/{bug_id}/resolve", response_model=BugOut)
def resolve_bug(bug_id: int, db: Session = Depends(get_db)):
    record = db.query(Bug).filter(Bug.id == bug_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Баг не найден")
    record.status = "resolved"
    db.commit()
    db.refresh(record)
    return record
