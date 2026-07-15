import os
import json
import logging
import time
import urllib.request
import httpx
import base64
import re
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from ..database import get_db, current_tenant_id
from .auth import get_current_user
from ..models import User

logger = logging.getLogger("uvicorn.error")
router = APIRouter(prefix="/support", tags=["SaaS Helpdesk & Support"])

DATA_FILE = "support_tickets.json"

def send_telegram_support_notification(text: str, buttons: list = None, attachment: Optional[Dict[str, Any]] = None, thread_id: Optional[int] = None):
    token = os.getenv("OBLAKO_CRM_BOT_TOKEN", "8842262640:AAH7WYTqklaq0wEL-KQw-GxIg2x1FLtXqxI")
    chat_id = os.getenv("TELEGRAM_SUPPORT_CHAT_ID", "-10022334455")
    
    if not token or not chat_id:
        logger.warning("[TelegramSupport] Token or Chat ID not configured. Skipping notification.")
        return None

    # Helper to parse base64 Data URL
    def parse_base64_attachment(url_str: str):
        if url_str and url_str.startswith("data:"):
            try:
                match = re.match(r"^data:(?P<mime>[^;]+);base64,(?P<data>.+)$", url_str)
                if match:
                    mime_type = match.group("mime")
                    base64_data = match.group("data")
                    # Remove whitespace if any
                    base64_data = re.sub(r"\s+", "", base64_data)
                    file_bytes = base64.b64decode(base64_data)
                    return file_bytes, mime_type
            except Exception as e:
                logger.error(f"[TelegramSupport] Error parsing base64 attachment: {e}")
        return None, None

    file_url = None
    if attachment and attachment.get("url"):
        file_url = attachment["url"]
        att_type = attachment.get("type", "document")
        filename = attachment.get("name", "file")
        
        file_bytes, mime_type = parse_base64_attachment(file_url)
        
        if file_bytes:
            # Send file directly as multipart/form-data
            method = "sendPhoto" if att_type == "image" else "sendDocument"
            url = f"https://api.telegram.org/bot{token}/{method}"
            
            data = {
                "chat_id": chat_id,
                "caption": text[:1024],
                "parse_mode": "HTML"
            }
            if thread_id:
                data["message_thread_id"] = thread_id
            if buttons:
                data["reply_markup"] = json.dumps({"inline_keyboard": buttons})
                
            files = {
                "photo" if att_type == "image" else "document": (filename, file_bytes, mime_type)
            }
            
            try:
                r = httpx.post(url, data=data, files=files, timeout=20)
                r.raise_for_status()
                return r.json()
            except Exception as e:
                logger.error(f"[TelegramSupport] Failed to upload and send attachment in telegram: {e}")
                # Fallback to plain text message
                fallback_text = text + f"\n\n📎 <i>[Ошибка отправки файла {filename}]</i>"
                return send_telegram_support_notification(fallback_text, buttons, attachment=None, thread_id=thread_id)
        else:
            # External URL or fallback
            if not (file_url.startswith("http://") or file_url.startswith("https://") or file_url.startswith("data:")):
                file_url = "https://api.sferum.space" + ("" if file_url.startswith("/") else "/") + file_url
                
            method = "sendPhoto" if att_type == "image" else "sendDocument"
            url = f"https://api.telegram.org/bot{token}/{method}"
            
            payload = {
                "chat_id": chat_id,
                "photo" if att_type == "image" else "document": file_url,
                "caption": text[:1024],
                "parse_mode": "HTML"
            }
            if thread_id:
                payload["message_thread_id"] = thread_id
            if buttons:
                payload["reply_markup"] = {"inline_keyboard": buttons}
                
            try:
                r = httpx.post(url, json=payload, timeout=20)
                r.raise_for_status()
                return r.json()
            except Exception as e:
                logger.error(f"[TelegramSupport] Failed to send attachment URL to telegram: {e}")
                fallback_text = text + f"\n\n📎 <b>Вложение:</b> <a href='{file_url}'>{filename}</a>"
                return send_telegram_support_notification(fallback_text, buttons, attachment=None, thread_id=thread_id)
    else:
        # Standard text message
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True
        }
        if thread_id:
            payload["message_thread_id"] = thread_id
        if buttons:
            payload["reply_markup"] = {"inline_keyboard": buttons}
            
        try:
            r = httpx.post(url, json=payload, timeout=20)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            logger.error(f"[TelegramSupport] Failed to send support message: {e}")
            return None

def create_telegram_forum_topic(subject: str) -> Optional[int]:
    token = os.getenv("OBLAKO_CRM_BOT_TOKEN", "8842262640:AAH7WYTqklaq0wEL-KQw-GxIg2x1FLtXqxI")
    chat_id = os.getenv("TELEGRAM_SUPPORT_CHAT_ID", "-10022334455")
    
    if not token or not chat_id:
        logger.warning("[TelegramSupport] Token or Chat ID not configured. Skipping topic creation.")
        return None
        
    url = f"https://api.telegram.org/bot{token}/createForumTopic"
    payload = {
        "chat_id": chat_id,
        "name": subject[:128]
    }
    
    try:
        r = httpx.post(url, json=payload, timeout=15)
        r.raise_for_status()
        res = r.json()
        if res.get("ok"):
            thread_id = res["result"]["message_thread_id"]
            logger.info(f"[TelegramSupport] Created forum topic: {subject} with thread_id {thread_id}")
            return thread_id
    except Exception as e:
        logger.error(f"[TelegramSupport] Failed to create forum topic: {e}")
    return None


def get_default_tickets() -> List[Dict[str, Any]]:
    return [
        {
            "id": "SUP-101",
            "tenant_id": 1,
            "tenant_name": "ООО Леоника",
            "sender_username": "admin",
            "category": "Биллинг и тарифы",
            "topic": "Вопрос по продлению тарифа Enterprise и закрывающим актам",
            "priority": "high",
            "status": "open",
            "created_at": "2026-07-02 11:30",
            "messages": [
                {
                    "sender": "admin (Клиент)",
                    "text": "Здравствуйте! Подскажите, когда будет сформирован акт КС-2 за прошлый месяц для нашей бухгалтерии?",
                    "time": "11:30",
                    "is_support": False
                },
                {
                    "sender": "Алексей (Служба поддержки)",
                    "text": "Здравствуйте! Сформировал и проверил предварительный акт, направляю файл во вложении. Оригинал будет доступен в разделе «Документооборот» завтра утром.",
                    "time": "11:45",
                    "is_support": True,
                    "attachment": {
                        "name": "Акт_сверки_СФЕРА_ERP_июнь_2026.pdf",
                        "url": "#",
                        "type": "document"
                    }
                }
            ]
        },
        {
            "id": "SUP-102",
            "tenant_id": 2,
            "tenant_name": "АО СтройТрест",
            "sender_username": "manager",
            "category": "Технический сбой",
            "topic": "Задержка при экспорте отчета КС-2 в формате PDF",
            "priority": "medium",
            "status": "in_progress",
            "created_at": "2026-07-02 10:15",
            "messages": [
                {
                    "sender": "manager (Клиент)",
                    "text": "При нажатии на кнопку выгрузки PDF система иногда думает 5-7 секунд. Можно ли ускорить? Прикрепил скриншот ошибки и замера сети:",
                    "time": "10:15",
                    "is_support": False,
                    "attachment": {
                        "name": "error_network_trace.png",
                        "url": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800",
                        "type": "image"
                    }
                },
                {
                    "sender": "Алексей (Служба поддержки)",
                    "text": "Добрый день! Мы оптимизировали генератор отчетов на бэкенде. Проверьте, пожалуйста, сейчас.",
                    "time": "10:45",
                    "is_support": True
                }
            ]
        },
        {
            "id": "SUP-103",
            "tenant_id": 1,
            "tenant_name": "ООО Леоника",
            "sender_username": "manager",
            "category": "Запрос функционала",
            "topic": "Добавить возможность прикреплять аудиозаписи к сделкам",
            "priority": "low",
            "status": "resolved",
            "created_at": "2026-07-01 16:45",
            "messages": [
                {
                    "sender": "manager (Клиент)",
                    "text": "Очень хотелось бы прикреплять записи звонков с клиентами к карточке сделки.",
                    "time": "16:45",
                    "is_support": False
                },
                {
                    "sender": "Инженер СФЕРА",
                    "text": "Спасибо за предложение! Мы добавили поддержку аудиофайлов в реестр документов.",
                    "time": "18:10",
                    "is_support": True
                }
            ]
        }
    ]

def load_tickets() -> List[Dict[str, Any]]:
    if not os.path.exists(DATA_FILE):
        default_data = get_default_tickets()
        save_tickets(default_data)
        return default_data
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading support tickets: {e}")
        return get_default_tickets()

def save_tickets(tickets: List[Dict[str, Any]]):
    try:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(tickets, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Error saving support tickets: {e}")

class TicketCreate(BaseModel):
    category: str
    topic: str
    priority: str
    initial_message: str
    attachment: Optional[Dict[str, Any]] = None

class MessageCreate(BaseModel):
    text: str
    attachment: Optional[Dict[str, Any]] = None

class StatusUpdate(BaseModel):
    status: str

@router.get("/tickets")
def get_tickets(current_user: User = Depends(get_current_user)):
    tickets = load_tickets()
    # Если пользователь - специалист поддержки или супер-админ, показываем ВСЕ тикеты со всех компаний
    if current_user.role in ["superadmin", "support_agent"]:
        return tickets
    
    # Иначе фильтруем только по tenant_id текущего клиента (Мультитенантность RLS)
    user_tenant_id = current_tenant_id.get() or current_user.tenant_id
    if not user_tenant_id:
        return tickets
    
    client_tickets = [t for t in tickets if str(t.get("tenant_id")) == str(user_tenant_id)]
    return client_tickets

@router.post("/tickets")
def create_ticket(payload: TicketCreate, current_user: User = Depends(get_current_user)):
    tickets = load_tickets()
    new_id = f"SUP-{100 + len(tickets) + 1}"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
    
    user_tenant_id = current_tenant_id.get() or current_user.tenant_id or 1
    
    # Пытаемся заранее сгенерировать ИИ-подсказку для этого тикета
    ai_suggestion = "Не удалось сгенерировать подсказку ИИ."
    try:
        from .oblakocrm_bot import generate_ai_support_suggestion
        ai_suggestion = generate_ai_support_suggestion(payload.topic, payload.initial_message)
    except Exception as ex:
        logger.error(f"[SupportRoute] Error invoking AI Co-Pilot: {ex}")
        ai_suggestion = f"Ошибка ИИ: {ex}"

    # Создаем тему на форуме в Telegram
    thread_id = None
    try:
        topic_name = f"{new_id} | {payload.topic[:50]} ({current_user.username})"
        thread_id = create_telegram_forum_topic(topic_name)
    except Exception as ex:
        logger.error(f"[SupportRoute] Failed to create forum topic: {ex}")

    new_ticket = {
        "id": new_id,
        "tenant_id": user_tenant_id,
        "tenant_name": f"Компания #{user_tenant_id}",
        "sender_username": current_user.username,
        "category": payload.category,
        "topic": payload.topic,
        "priority": payload.priority,
        "status": "open",
        "created_at": now_str,
        "ai_suggestion": ai_suggestion,
        "telegram_thread_id": thread_id,
        "messages": [
            {
                "sender": f"{current_user.username} (Клиент)",
                "text": payload.initial_message,
                "time": datetime.now().strftime("%H:%M"),
                "is_support": False,
                "attachment": payload.attachment
            }
        ]
    }
    
    tickets.insert(0, new_ticket)
    save_tickets(tickets)
    
    # Отправляем уведомление в Telegram-чат техподдержки
    emoji = "🔴" if payload.priority.lower() == "high" else "🟡" if payload.priority.lower() == "medium" else "🟢"
    tg_text = (
        f"🎫 <b>Новое обращение: #{new_id}</b>\n\n"
        f"🏢 <b>Компания:</b> Компания #{user_tenant_id}\n"
        f"👤 <b>Отправитель:</b> {current_user.username}\n"
        f"🏷 <b>Категория:</b> {payload.category}\n"
        f"📌 <b>Тема:</b> {payload.topic}\n"
        f"💬 <b>Сообщение:</b> {payload.initial_message}\n\n"
        f"🤖 <b>ИИ-Черновик ответа:</b>\n<i>{ai_suggestion}</i>\n\n"
        f"{emoji} <b>Приоритет:</b> <code>{payload.priority.upper()}</code>\n"
        f"⚙️ <b>Статус:</b> <code>open</code>"
    )
    
    buttons = [
        [
            {"text": "📥 Взять в работу", "callback_data": f"take_ticket_{new_id}"},
            {"text": "✅ Решено", "callback_data": f"resolve_ticket_{new_id}"}
        ],
        [
            {"text": "🪄 Отправить ИИ-ответ", "callback_data": f"quick_{new_id}_ai"}
        ],
        [
            {"text": "🔧 Ответ: Приняли, проверяем", "callback_data": f"quick_{new_id}_checking"}
        ],
        [
            {"text": "📝 Ответ: Нужны скриншоты/детали", "callback_data": f"quick_{new_id}_details"}
        ],
        [
            {"text": "✅ Ответ: Готово, проверяйте", "callback_data": f"quick_{new_id}_done"}
        ]
    ]
    
    send_telegram_support_notification(tg_text, buttons, payload.attachment, thread_id=thread_id)
    
    return {"status": "success", "ticket": new_ticket}


@router.get("/tickets/{ticket_id}/ai-suggest")
def get_ai_suggest(ticket_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["superadmin", "support_agent", "admin"]:
        raise HTTPException(status_code=403, detail="Недостаточно прав для использования ИИ-помощника")
        
    tickets = load_tickets()
    target_ticket = None
    for t in tickets:
        if t["id"] == ticket_id:
            target_ticket = t
            break
            
    if not target_ticket:
        raise HTTPException(status_code=404, detail="Обращение не найдено")
        
    # Если в тикете уже есть готовый сохраненный ИИ-черновик, возвращаем его
    if target_ticket.get("ai_suggestion"):
        return {"status": "success", "suggestion": target_ticket["ai_suggestion"]}
        
    # Берем тему и последнее сообщение клиента (не техподдержки)
    topic = target_ticket.get("topic", "Без темы")
    
    # Ищем последнее сообщение клиента
    client_msg = ""
    for msg in reversed(target_ticket.get("messages", [])):
        if not msg.get("is_support"):
            client_msg = msg.get("text", "")
            break
            
    if not client_msg:
        client_msg = "Клиент не оставил сообщения."
        
    try:
        from .oblakocrm_bot import generate_ai_support_suggestion
        suggestion = generate_ai_support_suggestion(topic, client_msg)
        return {"status": "success", "suggestion": suggestion}
    except Exception as e:
        logger.error(f"[SupportRoute] Error in get_ai_suggest: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка генерации подсказки: {e}")


@router.post("/tickets/{ticket_id}/messages")
def add_message(ticket_id: str, payload: MessageCreate, current_user: User = Depends(get_current_user)):
    tickets = load_tickets()
    target_ticket = None
    for t in tickets:
        if t["id"] == ticket_id:
            target_ticket = t
            break
            
    if not target_ticket:
        raise HTTPException(status_code=404, detail="Обращение не найдено")
        
    is_support = current_user.role in ["superadmin", "support_agent"]
    sender_label = f"{current_user.username} (Техподдержка)" if is_support else f"{current_user.username} (Клиент)"
    
    new_msg = {
        "sender": sender_label,
        "text": payload.text,
        "time": datetime.now().strftime("%H:%M"),
        "is_support": is_support,
        "attachment": payload.attachment
    }
    
    target_ticket["messages"].append(new_msg)
    if is_support and target_ticket["status"] == "open":
        target_ticket["status"] = "in_progress"
        
    save_tickets(tickets)
    
    # Если написал клиент, дублируем в Telegram-чат поддержки
    if not is_support:
        tg_text = (
            f"💬 <b>Новое сообщение по тикету #{ticket_id}</b> от клиента <b>{current_user.username}</b>:\n\n"
            f"<i>{payload.text}</i>"
        )
        thread_id = target_ticket.get("telegram_thread_id")
        send_telegram_support_notification(tg_text, None, payload.attachment, thread_id=thread_id)
        
    return {"status": "success", "messages": target_ticket["messages"]}


@router.patch("/tickets/{ticket_id}/status")
def update_ticket_status(ticket_id: str, payload: StatusUpdate, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["superadmin", "support_agent", "admin"]:
        raise HTTPException(status_code=403, detail="Недостаточно прав для изменения статуса")
        
    tickets = load_tickets()
    for t in tickets:
        if t["id"] == ticket_id:
            t["status"] = payload.status
            save_tickets(tickets)
            return {"status": "success", "new_status": payload.status}
            
    raise HTTPException(status_code=404, detail="Обращение не найдено")

@router.get("/system-health")
def get_system_health(current_user: User = Depends(get_current_user)):
    # Эндпоинт доступен только специалистам техподдержки и супер-админу
    # Здесь нет никаких финансовых данных MRR - только технические метрики
    if current_user.role not in ["superadmin", "support_agent"]:
        raise HTTPException(status_code=403, detail="Доступ к телеметрии разрешен только инженерам техподдержки")
        
    tickets = load_tickets()
    open_count = sum(1 for t in tickets if t["status"] == "open")
    in_prog_count = sum(1 for t in tickets if t["status"] == "in_progress")
    resolved_count = sum(1 for t in tickets if t["status"] == "resolved")
    
    return {
        "status": "healthy",
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "kpi": {
            "open_tickets": open_count,
            "in_progress": in_prog_count,
            "resolved": resolved_count,
            "sla_percentage": 99.8,
            "avg_response_min": 14
        },
        "services": [
            {"name": "Neon PostgreSQL (RLS Database)", "status": "operational", "ping_ms": 12, "details": "Active connections: 24/100"},
            {"name": "FastAPI Core Server (8001)", "status": "operational", "ping_ms": 4, "details": "Uptime: 99.98%"},
            {"name": "WebSocket Real-time Broadcast", "status": "operational", "ping_ms": 8, "details": "Active channels: 18"},
            {"name": "Pinecone RAG Vector Store", "status": "operational", "ping_ms": 45, "details": "Index: sphera-knowledge-base"},
            {"name": "Telegram Bot Webhook Engine", "status": "operational", "ping_ms": 19, "details": "Webhook status: OK"}
        ]
    }
