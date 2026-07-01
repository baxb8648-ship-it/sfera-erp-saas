"""
decision_log_route.py — CRUD для журнала архитектурных решений.

Endpoints:
  GET    /decisions          — список (поиск через ?q=текст)
  POST   /decisions          — создать запись
  GET    /decisions/export   — экспорт всего журнала в Markdown
  GET    /decisions/{id}     — одна запись
  DELETE /decisions/{id}     — удалить
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from ..database import get_db
from ..models import DecisionLog

router = APIRouter(prefix="/decisions", tags=["Decision Log"])


# ─── Pydantic схемы ──────────────────────────────────────────────────────────

class DecisionCreate(BaseModel):
    title:        str
    decision:     str
    rationale:    str
    alternatives: Optional[str] = None
    tags:         Optional[str] = None
    source:       Optional[str] = "api"


class DecisionOut(BaseModel):
    id:           int
    title:        str
    decision:     str
    rationale:    str
    alternatives: Optional[str]
    tags:         Optional[str]
    source:       str
    created_at:   Optional[datetime] = None  # Optional: старые seed-записи могут иметь None

    class Config:
        from_attributes = True


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("", response_model=list[DecisionOut])
def list_decisions(q: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Список всех решений, новые первые.
    ?q=текст — поиск по title / decision / rationale / tags.
    """
    query = db.query(DecisionLog).order_by(DecisionLog.created_at.desc())
    if q:
        like = f"%{q}%"
        query = query.filter(
            DecisionLog.title.ilike(like)
            | DecisionLog.decision.ilike(like)
            | DecisionLog.rationale.ilike(like)
            | DecisionLog.tags.ilike(like)
        )
    return query.all()


@router.get("/export", response_class=PlainTextResponse)
def export_markdown(db: Session = Depends(get_db)):
    """
    Экспорт всего Decision Log в Markdown.
    Удобно вставить в docs/ или открыть в редакторе.
    """
    records = db.query(DecisionLog).order_by(DecisionLog.created_at.asc()).all()
    lines = [
        "# Decision Log — СФЕРА/ERP\n",
        f"_Обновлено: {datetime.utcnow().strftime('%Y-%m-%d')}_\n",
        f"_Всего решений: {len(records)}_\n",
    ]
    for r in records:
        date_str = r.created_at.strftime("%Y-%m-%d")
        tags_str = r.tags or "—"
        lines += [
            "\n---\n",
            f"## [{r.id}] {r.title}",
            f"**Дата:** {date_str} &nbsp;|&nbsp; **Теги:** `{tags_str}` &nbsp;|&nbsp; **Источник:** {r.source}\n",
            f"**Решение:** {r.decision}\n",
            f"**Обоснование:** {r.rationale}\n",
        ]
        if r.alternatives:
            lines.append(f"**Отвергнутые альтернативы:** {r.alternatives}\n")
    return PlainTextResponse("\n".join(lines), media_type="text/markdown; charset=utf-8")


@router.post("", response_model=DecisionOut, status_code=201)
def create_decision(body: DecisionCreate, db: Session = Depends(get_db)):
    """Создать новую запись в Decision Log."""
    record = DecisionLog(
        title=body.title,
        decision=body.decision,
        rationale=body.rationale,
        alternatives=body.alternatives,
        tags=body.tags,
        source=body.source or "api",
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/{decision_id}", response_model=DecisionOut)
def get_decision(decision_id: int, db: Session = Depends(get_db)):
    """Получить одно решение по ID."""
    record = db.query(DecisionLog).filter(DecisionLog.id == decision_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Решение не найдено")
    return record


@router.delete("/{decision_id}")
def delete_decision(decision_id: int, db: Session = Depends(get_db)):
    """Удалить решение по ID."""
    record = db.query(DecisionLog).filter(DecisionLog.id == decision_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Решение не найдено")
    db.delete(record)
    db.commit()
    return {"ok": True, "deleted_id": decision_id}
