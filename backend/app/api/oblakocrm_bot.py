from fastapi import APIRouter, Depends, Request
import urllib.request
import urllib.parse
import json
import logging
import threading
from sqlalchemy.orm import Session
import os

from ..database import get_db
from ..models import Bug, Epic, DecisionLog

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/sfera_bot", tags=["Sfera Meta Bot Webhook"])

# Получаем токен из окружения
BOT_TOKEN = os.getenv("OBLAKO_CRM_BOT_TOKEN", "8842262640:AAH7WYTqklaq0wEL-KQw-GxIg2x1FLtXqxI")

def run_in_background(func, *args, **kwargs):
    t = threading.Thread(target=func, args=args, kwargs=kwargs)
    t.daemon = True
    t.start()

def send_telegram_reply_message(token: str, chat_id: int, text: str, reply_to_message_id: int = None, thread_id: int = None):
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True
    }
    if reply_to_message_id:
        payload["reply_to_message_id"] = reply_to_message_id
    if thread_id:
        payload["message_thread_id"] = thread_id

    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as e:
        logger.error(f"[OblakoCRM Bot] Failed to send message: {e}")
        return None

@router.post("/webhook")
async def sfera_bot_webhook(request: Request):
    """Принимает вебхуки от Telegram для бота oblakocrmbot."""
    try:
        update = await request.json()
    except Exception:
        return {"status": "error", "message": "Invalid JSON"}

    run_in_background(process_update_sync, update)
    return {"status": "ok"}

def process_update_sync(update: dict):
    from ..database import SessionLocal
    db = SessionLocal()
    try:
        process_update_internal(update, db)
    except Exception as e:
        logger.error(f"[OblakoCRM Bot] Error processing update: {e}")
    finally:
        db.close()

def process_update_internal(update: dict, db: Session):
    logger.info(f"[OblakoCRM Bot] Received update: {json.dumps(update)}")
    if "message" not in update:
        return

    message = update["message"]
    chat = message.get("chat", {})
    chat_id = chat.get("id")
    text = message.get("text", "")
    message_id = message.get("message_id")
    
    if not text or not chat_id:
        return

    # Парсим команды
    words = text.split()
    cmd = words[0].lower() if words else ""
    cmd_base = cmd.split("@")[0] # Убираем имя бота если есть

    logger.info(f"[OblakoCRM Bot] Processing command: {cmd_base} from chat {chat_id}")

    # 1. КОМАНДА /START
    if cmd_base == "/start":
        welcome = (
            "Welcome to SPHERA!\n\n"
            "Я — глобальный Meta-CoPilot платформы. "
            "Я помогаю управлять разработкой, фиксировать баги, предлагать идеи и следить за техническим состоянием всей SaaS-платформы.\n\n"
            "<b>Доступные команды:</b>\n"
            "❓ /help — Список команд и база знаний\n"
            "🐞 /bug Название | Описание | Приоритет — Сообщить о баге\n"
            "💡 /idea Название | Описание — Предложить идею развития\n"
            "📊 /status — Сводка по текущему состоянию разработки\n"
            "📋 /decisions — Журнал архитектурных решений (ADR)\n"
            "📝 /decision Название | Что решили | Почему — Добавить решение\n"
        )
        res = send_telegram_reply_message(BOT_TOKEN, chat_id, welcome, reply_to_message_id=message_id)
        logger.info(f"[OblakoCRM Bot] Send start response result: {res}")
        return


    # 2. КОМАНДА /HELP
    elif cmd_base in ["/help", "/помощь", "/команды"]:
        help_text = (
            "🤖 <b>Глобальный пульт управления СФЕРА-ЕРП</b>\n\n"
            "<b>Форматы отправки багов и идей:</b>\n\n"
            "🐞 <b>Сообщить о баге:</b>\n"
            "<code>/bug Карточка зависает | При переносе на Kanban-доске карточка зависает | High</code>\n"
            "<i>(Приоритеты: Low, Medium, High, Critical)</i>\n\n"
            "💡 <b>Предложить фичу/идею:</b>\n"
            "<code>/idea Бот-Снабженец | Автоматический парсинг цен у поставщиков</code>\n\n"
            "📋 <b>Добавить архитектурное решение (ADR):</b>\n"
            "<code>/decision Название | Решение | Обоснование | [Альтернативы]</code>\n\n"
            "📊 <b>Посмотреть статус разработки:</b>\n"
            "Используй /status для получения сводки открытых багов и планируемых фич."
        )
        send_telegram_reply_message(BOT_TOKEN, chat_id, help_text, reply_to_message_id=message_id)
        return

    # 3. КОМАНДА /BUG
    elif cmd_base in ["/bug", "/баг", "/bag"]:
        args_text = text[len(cmd):].strip()
        parts = [p.strip() for p in args_text.split("|")]
        
        if len(parts) < 2:
            err_msg = (
                "⚠️ <b>Неверный формат команды /bug</b>\n\n"
                "Используй формат:\n"
                "<code>/bug Название | Описание | Приоритет</code>\n\n"
                "<b>Пример:</b>\n"
                "<code>/bug Сбой авторизации | Не заходит по старому токену | Critical</code>"
            )
            send_telegram_reply_message(BOT_TOKEN, chat_id, err_msg, reply_to_message_id=message_id)
            return

        title = parts[0]
        steps = parts[1]
        severity = parts[2] if len(parts) > 2 else "Medium"
        if severity not in ["Low", "Medium", "High", "Critical"]:
            severity = "Medium"

        try:
            bug = Bug(
                title=title,
                steps=steps,
                severity=severity,
                component="bot" if "бот" in title.lower() else "backend",
                status="open"
            )
            db.add(bug)
            db.commit()
            db.refresh(bug)

            ok_msg = (
                f"🐞 <b>Баг #{bug.id} зарегистрирован в DevBrain!</b>\n\n"
                f"📌 <b>{title}</b>\n"
                f"<b>Описание:</b> {steps}\n"
                f"<b>Критичность:</b> <code>{severity}</code>\n"
                f"<b>Статус:</b> <code>open</code>"
            )
            send_telegram_reply_message(BOT_TOKEN, chat_id, ok_msg, reply_to_message_id=message_id)
        except Exception as e:
            logger.error(f"[OblakoCRM Bot] Error creating bug: {e}")
            send_telegram_reply_message(BOT_TOKEN, chat_id, f"❌ Ошибка сохранения бага: {e}", reply_to_message_id=message_id)
        return

    # 4. КОМАНДА /IDEA
    elif cmd_base in ["/idea", "/идея"]:
        args_text = text[len(cmd):].strip()
        parts = [p.strip() for p in args_text.split("|")]

        if not parts or not parts[0]:
            err_msg = (
                "⚠️ <b>Неверный формат команды /idea</b>\n\n"
                "Используй формат:\n"
                "<code>/idea Название | Описание</code>\n\n"
                "<b>Пример:</b>\n"
                "<code>/idea RAG на 1 Тб | Поиск по сметным документам и PDF</code>"
            )
            send_telegram_reply_message(BOT_TOKEN, chat_id, err_msg, reply_to_message_id=message_id)
            return

        title = parts[0]
        description = parts[1] if len(parts) > 1 else ""

        try:
            epic = Epic(
                title=title,
                description=description,
                status="planned",
                priority="Medium"
            )
            db.add(epic)
            db.commit()
            db.refresh(epic)

            ok_msg = (
                f"💡 <b>Идея #{epic.id} сохранена в Epics!</b>\n\n"
                f"📌 <b>{title}</b>\n"
                f"<b>Описание:</b> {description}\n"
                f"<b>Статус:</b> <code>planned</code>"
            )
            send_telegram_reply_message(BOT_TOKEN, chat_id, ok_msg, reply_to_message_id=message_id)
        except Exception as e:
            logger.error(f"[OblakoCRM Bot] Error creating epic/idea: {e}")
            send_telegram_reply_message(BOT_TOKEN, chat_id, f"❌ Ошибка сохранения идеи: {e}", reply_to_message_id=message_id)
        return

    # 5. КОМАНДА /DECISION
    elif cmd_base in ["/decision", "/решение"]:
        args_text = text[len(cmd):].strip()
        parts = [p.strip() for p in args_text.split("|")]
        
        if len(parts) < 3:
            err_msg = (
                "⚠️ <b>Неверный формат команды /decision</b>\n\n"
                "Используй формат:\n"
                "<code>/decision Название | Что решили | Почему | [Альтернативы]</code>"
            )
            send_telegram_reply_message(BOT_TOKEN, chat_id, err_msg, reply_to_message_id=message_id)
            return

        title = parts[0]
        decision = parts[1]
        rationale = parts[2]
        alternatives = parts[3] if len(parts) > 3 else None

        try:
            log = DecisionLog(
                title=title,
                decision=decision,
                rationale=rationale,
                alternatives=alternatives,
                tags="telegram",
                source="telegram"
            )
            db.add(log)
            db.commit()
            db.refresh(log)

            ok_msg = (
                f"✅ <b>Архитектурное решение #{log.id} зафиксировано!</b>\n\n"
                f"📌 <b>{title}</b>\n"
                f"<b>Решение:</b> {decision}\n"
                f"<b>Обоснование:</b> {rationale}"
            )
            send_telegram_reply_message(BOT_TOKEN, chat_id, ok_msg, reply_to_message_id=message_id)
        except Exception as e:
            logger.error(f"[OblakoCRM Bot] Error creating decision: {e}")
            send_telegram_reply_message(BOT_TOKEN, chat_id, f"❌ Ошибка сохранения решения: {e}", reply_to_message_id=message_id)
        return

    # 6. КОМАНДА /DECISIONS
    elif cmd_base in ["/decisions", "/решения"]:
        try:
            records = db.query(DecisionLog).order_by(DecisionLog.created_at.desc()).limit(10).all()
            if not records:
                send_telegram_reply_message(BOT_TOKEN, chat_id, "📋 <b>Журнал решений (ADR) пуст.</b>", reply_to_message_id=message_id)
            else:
                lines = ["📋 <b>Журнал архитектурных решений (ADR):</b>\n"]
                for r in records:
                    date_str = r.created_at.strftime('%d.%m.%Y')
                    lines.append(
                        f"<b>#{r.id}</b> <code>{date_str}</code> — {r.title}\n"
                        f"   ↳ <i>{r.decision[:80]}...</i>"
                    )
                send_telegram_reply_message(BOT_TOKEN, chat_id, "\n".join(lines), reply_to_message_id=message_id)
        except Exception as e:
            logger.error(f"[OblakoCRM Bot] Error listing decisions: {e}")
        return

    # 7. КОМАНДА /STATUS
    elif cmd_base in ["/status", "/статус"]:
        try:
            open_bugs = db.query(Bug).filter(Bug.status == "open").count()
            ip_bugs = db.query(Bug).filter(Bug.status == "in_progress").count()
            planned_ideas = db.query(Epic).filter(Epic.status == "planned").count()
            ip_ideas = db.query(Epic).filter(Epic.status == "in_progress").count()
            total_decisions = db.query(DecisionLog).count()

            status_msg = (
                "📊 <b>Сводка разработки Облако CRM (DevBrain)</b>\n\n"
                f"🐞 <b>Баги:</b>\n"
                f"  • Открыто: <code>{open_bugs}</code>\n"
                f"  • В работе: <code>{ip_bugs}</code>\n\n"
                f"💡 <b>Идеи / Эпики:</b>\n"
                f"  • В плане: <code>{planned_ideas}</code>\n"
                f"  • В реализации: <code>{ip_ideas}</code>\n\n"
                f"📋 <b>Архитектура (ADR):</b>\n"
                f"  • Зафиксировано решений: <code>{total_decisions}</code>\n\n"
                f"🟢 <b>Статус платформы:</b> Стабилен\n"
                f"🛢 <b>База данных:</b> PostgreSQL (Neon Cloud)"
            )
            send_telegram_reply_message(BOT_TOKEN, chat_id, status_msg, reply_to_message_id=message_id)
        except Exception as e:
            logger.error(f"[OblakoCRM Bot] Error getting status: {e}")
        return
