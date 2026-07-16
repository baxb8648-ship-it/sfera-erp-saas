"""
API-роут для работы с базой лидов (LeadDatabase).
GET /leads/          — список лидов (фильтры: task_id, min_score, kp_sent)
GET /leads/export/csv — экспорт в CSV
POST /leads/{id}/send-kp — отправить КП конкретной компании
POST /leads/{id}/add-to-crm — добавить в Клиенты CRM
DELETE /leads/{id}   — удалить запись
DELETE /leads/       — очистить базу по task_id
"""
import csv
import io
import logging
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, LeadDatabase, Client, ClientStatusEnum
from ..schemas import LeadDatabaseResponse
from .auth import get_current_user
from ..utils.ai_engine import ask_ollama
from ..notifications import send_email_notification

logger = logging.getLogger("uvicorn.error")
router = APIRouter(prefix="/leads", tags=["Lead Database"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class SendKPPayload(BaseModel):
    offer_context: str
    custom_text: Optional[str] = None  # Если задан — отправляем его, иначе генерируем через Ollama


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[LeadDatabaseResponse])
def get_leads(
    task_id: Optional[int] = Query(None, description="Фильтр по спецзаданию"),
    min_score: Optional[int] = Query(None, description="Минимальный AI-score"),
    kp_sent: Optional[int] = Query(None, description="0=не отправлено, 1=отправлено"),
    status_filter: Optional[str] = Query(None, alias="status", description="Действующее/Ликвидировано"),
    search: Optional[str] = Query(None, description="Поиск по названию/ИНН/адресу"),
    limit: int = Query(100, le=500),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(LeadDatabase)
    if task_id is not None:
        q = q.filter(LeadDatabase.task_id == task_id)
    if min_score is not None:
        q = q.filter(LeadDatabase.ai_score >= min_score)
    if kp_sent is not None:
        q = q.filter(LeadDatabase.kp_sent == kp_sent)
    if status_filter:
        q = q.filter(LeadDatabase.status == status_filter)
    if search:
        like = f"%{search}%"
        q = q.filter(
            LeadDatabase.name.ilike(like) |
            LeadDatabase.inn.ilike(like) |
            LeadDatabase.address.ilike(like) |
            LeadDatabase.okvad_name.ilike(like)
        )
    total = q.count()
    leads = q.order_by(LeadDatabase.ai_score.desc(), LeadDatabase.created_at.desc()).offset(offset).limit(limit).all()
    return leads


@router.get("/count")
def count_leads(
    task_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(LeadDatabase)
    if task_id:
        q = q.filter(LeadDatabase.task_id == task_id)
    return {"count": q.count()}


@router.get("/export/csv")
def export_leads_csv(
    task_id: Optional[int] = Query(None),
    min_score: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Экспорт базы лидов в CSV-файл."""
    q = db.query(LeadDatabase)
    if task_id:
        q = q.filter(LeadDatabase.task_id == task_id)
    if min_score is not None:
        q = q.filter(LeadDatabase.ai_score >= min_score)
    leads = q.order_by(LeadDatabase.ai_score.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output, delimiter=";", quotechar='"', quoting=csv.QUOTE_MINIMAL)

    # Заголовок
    writer.writerow([
        "Название", "Полное наименование", "ИНН", "ОГРН",
        "Основной ОКВЭД", "Вид деятельности", "Регион", "Адрес",
        "Дата регистрации", "Статус", "Телефон", "Email", "Сайт",
        "Руководитель", "AI-Score", "AI-Оценка", "КП Отправлено",
        "Добавлен в CRM", "Источник", "Дата добавления",
    ])

    for lead in leads:
        writer.writerow([
            lead.name or "",
            lead.full_name or "",
            lead.inn or "",
            lead.ogrn or "",
            lead.okvad_main or "",
            lead.okvad_name or "",
            lead.region or "",
            lead.address or "",
            lead.reg_date or "",
            lead.status or "",
            lead.phone or "",
            lead.email or "",
            lead.website or "",
            lead.director or "",
            lead.ai_score or 0,
            lead.ai_reason or "",
            "Да" if lead.kp_sent else "Нет",
            "Да" if lead.added_to_crm else "Нет",
            lead.source or "",
            lead.created_at.strftime("%d.%m.%Y %H:%M") if lead.created_at else "",
        ])

    # BOM для корректного открытия в Excel
    bom = "\ufeff"
    content = bom + output.getvalue()
    filename = f"leads_export_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"

    return StreamingResponse(
        iter([content.encode("utf-8")]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/{lead_id}/send-kp")
def send_kp_to_lead(
    lead_id: int,
    payload: SendKPPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Отправить коммерческое предложение конкретной компании из базы."""
    lead = db.query(LeadDatabase).filter(LeadDatabase.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Лид не найден")

    if not lead.email:
        raise HTTPException(status_code=400, detail="У компании нет email для отправки")

    # Генерация КП через Ollama (или используем кастомный текст)
    if payload.custom_text:
        kp_text = payload.custom_text
    else:
        prompt = (
            f"Составь деловое коммерческое предложение от ООО «СФЕРУМ» для {lead.name}.\n"
            f"Деятельность компании: {lead.okvad_name or 'строительство и производство'}.\n\n"
            f"Суть предложения:\n{payload.offer_context}\n\n"
            f"Напиши лаконичное деловое письмо с выгодами и призывом к действию.\n\nПисьмо:"
        )
        kp_text = ask_ollama(prompt)
        if not kp_text:
            kp_text = (
                f"Уважаемые коллеги из {lead.name}!\n\n"
                f"ООО «СФЕРУМ» предлагает Вам:\n{payload.offer_context}\n\n"
                f"Свяжитесь с нами: info@sferum.space\nС уважением, ООО «СФЕРУМ»"
            )

    subject = f"Коммерческое предложение для {lead.name} от ООО «СФЕРУМ»"
    send_email_notification(lead.email, subject, kp_text, db)

    lead.kp_sent = 1
    lead.kp_sent_at = datetime.utcnow()
    db.commit()

    return {"status": "success", "message": f"КП отправлено на {lead.email}"}


@router.post("/{lead_id}/add-to-crm")
def add_lead_to_crm(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Добавить лида из базы в раздел Клиенты CRM."""
    lead = db.query(LeadDatabase).filter(LeadDatabase.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Лид не найден")

    # Проверяем — не добавлен ли уже
    if lead.inn:
        existing = db.query(Client).filter(Client.inn == lead.inn).first()
        if existing:
            return {"status": "exists", "message": f"Клиент с ИНН {lead.inn} уже есть в CRM", "client_id": existing.id}

    client = Client(
        name=lead.name,
        inn=lead.inn,
        ogrn=lead.ogrn,
        legal_address=lead.address,
        phone=lead.phone,
        email=lead.email,
        contact_person=lead.director,
        status=ClientStatusEnum.new,
        notes=f"Добавлен из базы лидов. Основной ОКВЭД: {lead.okvad_main} — {lead.okvad_name}.",
    )
    db.add(client)
    db.commit()
    db.refresh(client)

    lead.added_to_crm = 1
    db.commit()

    return {"status": "success", "message": f"{lead.name} добавлен в Клиенты CRM", "client_id": client.id}


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = db.query(LeadDatabase).filter(LeadDatabase.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Лид не найден")
    db.delete(lead)
    db.commit()
    return None


@router.delete("/", status_code=status.HTTP_200_OK)
def clear_leads_by_task(
    task_id: int = Query(..., description="ID спецзадания для очистки базы"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = db.query(LeadDatabase).filter(LeadDatabase.task_id == task_id).delete()
    db.commit()
    return {"status": "success", "deleted": count}
