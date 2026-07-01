from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from ..database import get_db
from ..models import Task, TaskMessage, User
from .auth import get_current_user
from ..telegram import send_personal_telegram_notification, send_telegram_notification
from ..websocket_manager import manager

router = APIRouter(prefix="/tasks", tags=["Tasks"])

# --- Pydantic Schemas ---
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "Новая"
    priority: Optional[str] = "Средний"
    assigned_to_id: Optional[int] = None
    due_date: Optional[datetime] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to_id: Optional[int] = None
    due_date: Optional[datetime] = None

class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: str
    priority: str
    created_by_id: int
    assigned_to_id: Optional[int]
    due_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    creator_name: Optional[str]
    assignee_name: Optional[str]

    class Config:
        from_attributes = True

class TaskMessageCreate(BaseModel):
    message: str
    task_id: Optional[int] = None

class TaskMessageResponse(BaseModel):
    id: int
    task_id: Optional[int]
    user_id: int
    message: str
    created_at: datetime
    username: Optional[str]

    class Config:
        from_attributes = True

# --- API Routes ---

@router.get("/", response_model=List[TaskResponse])
def get_tasks(
    status_filter: Optional[str] = None,
    assigned_to_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Task)
    if status_filter:
        query = query.filter(Task.status == status_filter)
    if assigned_to_id:
        query = query.filter(Task.assigned_to_id == assigned_to_id)
    return query.order_by(Task.created_at.desc()).all()

@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: TaskCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_task = Task(
        title=payload.title,
        description=payload.description,
        status=payload.status or "Новая",
        priority=payload.priority or "Средний",
        created_by_id=current_user.id,
        assigned_to_id=payload.assigned_to_id,
        due_date=payload.due_date
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    
    from ..services.audit import log_audit_action
    log_audit_action(
        db,
        current_user,
        "создание",
        "Задача",
        new_task.id,
        new_task.title,
        changes={"title": {"old": "—", "new": new_task.title}}
    )


    # WebSocket Broadcast to notify about new task
    await manager.broadcast({
        "type": "task_created",
        "task_id": new_task.id,
        "title": new_task.title,
        "created_by_id": new_task.created_by_id,
        "assigned_to_id": new_task.assigned_to_id
    })

    # Background task for Telegram alerts
    def notify_task_created(task_id: int, creator_username: str, task_title: str, task_status: str, task_priority: str, task_due_date: Optional[datetime], assigned_to_id: Optional[int]):
        from ..database import SessionLocal
        bg_db = SessionLocal()
        try:
            due_date_str = task_due_date.strftime('%d.%m.%Y %H:%M') if task_due_date else 'Не указан'
            msg = (
                f"🎯 <b>Новая задача в CRM:</b> {task_title}\n"
                f"👤 <b>Автор:</b> {creator_username}\n"
                f"📋 <b>Статус:</b> {task_status}\n"
                f"⚡ <b>Приоритет:</b> {task_priority}\n"
                f"📅 <b>Срок:</b> {due_date_str}"
            )
            send_telegram_notification(msg, bg_db)
            
            # If there's an assignee, also notify them personally
            if assigned_to_id:
                personal_msg = (
                    f"🎯 <b>Новая задача:</b> {task_title}\n"
                    f"👤 <b>Автор:</b> {creator_username}\n"
                    f"📅 <b>Срок:</b> {due_date_str}"
                )
                send_personal_telegram_notification(assigned_to_id, personal_msg, bg_db)
        except Exception as e:
            print(f"Background task notification error: {e}")
        finally:
            bg_db.close()

    background_tasks.add_task(
        notify_task_created,
        new_task.id,
        current_user.username,
        new_task.title,
        new_task.status,
        new_task.priority,
        new_task.due_date,
        new_task.assigned_to_id
    )

    return new_task

@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Задача не найдена")

    old_status = task.status
    old_assignee = task.assigned_to_id

    old_data = {col.name: getattr(task, col.name) for col in task.__table__.columns}
    
    # Update fields
    if payload.title is not None:
        task.title = payload.title
    if payload.description is not None:
        task.description = payload.description
    if payload.status is not None:
        task.status = payload.status
    if payload.priority is not None:
        task.priority = payload.priority
    if payload.assigned_to_id is not None:
        task.assigned_to_id = payload.assigned_to_id
    if payload.due_date is not None:
        task.due_date = payload.due_date

    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    
    new_data = {col.name: getattr(task, col.name) for col in task.__table__.columns}
    from ..services.audit import get_model_changes, log_audit_action
    changes = get_model_changes(old_data, new_data)
    if changes:
        log_audit_action(db, current_user, "обновление", "Задача", task.id, task.title, changes)


    # WebSocket Broadcast
    await manager.broadcast({
        "type": "task_updated",
        "task_id": task.id,
        "title": task.title,
        "status": task.status,
        "assigned_to_id": task.assigned_to_id,
        "updated_by_id": current_user.id
    })

    # Telegram alerts on update
    if task.assigned_to_id and (task.status != old_status or task.assigned_to_id != old_assignee):
        msg = (
            f"🔄 <b>Обновление задачи:</b> {task.title}\n"
            f"ℹ️ <b>Статус:</b> {task.status}\n"
            f"👤 <b>Исполнитель:</b> {task.assignee_name or 'Не назначен'}"
        )
        send_personal_telegram_notification(task.assigned_to_id, msg, db)

    return task

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Задача не найдена")

    task_title_val = task.title
    task_id_val = task.id
    db.delete(task)
    db.commit()
    
    from ..services.audit import log_audit_action
    log_audit_action(
        db,
        current_user,
        "удаление",
        "Задача",
        task_id_val,
        task_title_val,
        changes={"title": {"old": task_title_val, "new": "—"}}
    )


    # WebSocket Broadcast
    await manager.broadcast({
        "type": "task_deleted",
        "task_id": task_id
    })

    return None

# --- Chat Routes ---

@router.get("/chat", response_model=List[TaskMessageResponse])
def get_chat_messages(
    task_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(TaskMessage)
    if task_id:
        query = query.filter(TaskMessage.task_id == task_id)
    else:
        query = query.filter(TaskMessage.task_id == None)  # Общий командный чат
    return query.order_by(TaskMessage.created_at.asc()).all()

def get_or_create_ai_user(db: Session) -> User:
    ai_user = db.query(User).filter(User.username == "AI-Копилот").first()
    if not ai_user:
        ai_user = User(
            username="AI-Копилот",
            hashed_password="ai_copilot_system_user_no_password",
            role="ai",
            is_active=1
        )
        db.add(ai_user)
        db.commit()
        db.refresh(ai_user)
    return ai_user

async def generate_and_broadcast_ai_response(task_id: Optional[int], user_query: str):
    import asyncio
    import logging
    from ..database import SessionLocal
    from ..utils.ai_engine import ask_ollama

    logger = logging.getLogger("uvicorn.error")

    # Clean query by removing triggers
    clean_query = user_query
    for trigger in ["@ai", "/ai", "@ollama", "/ollama"]:
        clean_query = clean_query.replace(trigger, "")
    clean_query = clean_query.strip()

    system_prompt = (
        "Ты — ИИ-Копилот, интеллектуальный помощник компании ООО СФЕРА, эксперт по антикоррозийной защите (АКЗ), "
        "огнезащите металлоконструкций, подготовке поверхностей (Sa 2.5, Sa 3, ГОСТ 9.402) и расходу ЛКМ. "
        "Твоя задача — давать профессиональные, точные, емкие ответы на технические вопросы сотрудников. "
        "Приводи ссылки на стандарты (ГОСТ, СНиП, ISO), если применимо, и формулы/расчеты расхода ЛКМ при указании толщины слоя. "
        "Отвечай на русском языке, кратко, по существу, профессионально и уверенно.\n\n"
        f"Вопрос сотрудника: {clean_query}"
    )

    # Run ask_ollama in executor since it is synchronous
    loop = asyncio.get_event_loop()
    ai_response = await loop.run_in_executor(None, ask_ollama, system_prompt)

    if not ai_response:
        ai_response = (
            "Извините, локальный сервер ИИ (Ollama) временно недоступен или модель не загружена. "
            "Убедитесь, что на сервере запущена служба Ollama и скачана модель qwen2:7b."
        )

    db = SessionLocal()
    try:
        ai_user = get_or_create_ai_user(db)
        new_msg = TaskMessage(
            task_id=task_id,
            user_id=ai_user.id,
            message=ai_response
        )
        db.add(new_msg)
        db.commit()
        db.refresh(new_msg)

        # Broadcast via WebSocket
        await manager.broadcast({
            "type": "chat_message",
            "id": new_msg.id,
            "task_id": new_msg.task_id,
            "user_id": new_msg.user_id,
            "username": ai_user.username,
            "message": new_msg.message,
            "created_at": new_msg.created_at.isoformat()
        })
    except Exception as e:
        logger.error(f"Error saving/broadcasting AI response: {e}")
    finally:
        db.close()

@router.post("/chat", response_model=TaskMessageResponse)
async def send_chat_message(
    payload: TaskMessageCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_msg = TaskMessage(
        task_id=payload.task_id,
        user_id=current_user.id,
        message=payload.message
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)

    # Real-time message broadcast
    await manager.broadcast({
        "type": "chat_message",
        "id": new_msg.id,
        "task_id": new_msg.task_id,
        "user_id": new_msg.user_id,
        "username": current_user.username,
        "message": new_msg.message,
        "created_at": new_msg.created_at.isoformat()
    })

    # Background task to send personal notifications to other users who have the bot running
    def notify_chat_users(sender_username: str, sender_id: int, message_text: str):
        from ..database import SessionLocal
        bg_db = SessionLocal()
        try:
            chat_notify_msg = (
                f"💬 <b>Командный чат ({sender_username}):</b>\n"
                f"{message_text}"
            )
            
            # Ищем упоминания через @
            import re
            mentions = re.findall(r'@([a-zA-Z0-9_а-яА-ЯёЁ]+)', message_text)
            
            if mentions:
                # Оповещаем только упомянутых пользователей лично
                mentioned_users = bg_db.query(User).filter(
                    User.username.in_(mentions),
                    User.id != sender_id,
                    User.telegram_chat_id != None,
                    User.telegram_chat_id != ""
                ).all()
                for target_user in mentioned_users:
                    send_personal_telegram_notification(target_user.id, chat_notify_msg, bg_db, fallback_to_general=False)
            else:
                # Если упоминаний нет ("без привязки"), отправляем в общий Telegram-канал
                send_telegram_notification(chat_notify_msg, bg_db)
                
        except Exception as e:
            print(f"Background chat notification error: {e}")
        finally:
            bg_db.close()

    background_tasks.add_task(notify_chat_users, current_user.username, current_user.id, new_msg.message)

    # Check for AI triggers
    message_lower = payload.message.lower()
    if any(trigger in message_lower for trigger in ["@ai", "/ai", "@ollama", "/ollama"]):
        # Broadcast "thinking" state immediately
        await manager.broadcast({
            "type": "chat_message_status",
            "status": "thinking",
            "task_id": payload.task_id
        })
        background_tasks.add_task(generate_and_broadcast_ai_response, payload.task_id, payload.message)

    return new_msg
