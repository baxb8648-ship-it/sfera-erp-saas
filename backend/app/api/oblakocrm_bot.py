from fastapi import APIRouter, Depends, Request
import urllib.request
import urllib.parse
import json
import logging
import threading
import re
import requests
from sqlalchemy.orm import Session
import os
from datetime import datetime

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

def set_bot_menu_button():
    try:
        url = f"https://api.telegram.org/bot{BOT_TOKEN}/setChatMenuButton"
        payload = {
            "menu_button": {
                "type": "web_app",
                "text": "СФЕРУМ",
                "web_app": {
                    "url": "https://sferum.space/#/crm"
                }
            }
        }
        resp = requests.post(url, json=payload, timeout=10)
        logger.info(f"[OblakoCRM Bot] Set menu button result: {resp.status_code} {resp.text}")
    except Exception as e:
        logger.error(f"[OblakoCRM Bot] Failed to set menu button on startup: {e}")

run_in_background(set_bot_menu_button)

def generate_ai_support_suggestion(topic: str, message: str) -> str:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return "⚠️ GROQ_API_KEY не задан в .env"
        
    url = "https://api.groq.com/openai/v1/chat/completions"
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {
                "role": "system",
                "content": (
                    "Вы — интеллектуальный ИИ-помощник техподдержки СФЕРУМ. "
                    "Вам прислали обращение от клиента. Сформулируйте краткий, профессиональный и полезный черновик ответа, который администратор техподдержки может использовать для ответа клиенту. "
                    "Пишите на русском языке, вежливо, сразу переходя к сути решения. Ответ должен быть лаконичным (до 3-4 предложений)."
                )
            },
            {
                "role": "user",
                "content": f"Тема: {topic}\nСообщение клиента: {message}"
            }
        ],
        "temperature": 0.5,
        "max_tokens": 300
    }
    
    try:
        response = requests.post(url, headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }, json=payload, timeout=8)
        if response.status_code == 200:
            res = response.json()
            return res["choices"][0]["message"]["content"].strip()
        return f"Ошибка API Groq: {response.status_code}"
    except Exception as e:
        logger.error(f"[OblakoCRM Bot] AI support suggestion generation failed: {e}")
        return f"Не удалось сгенерировать подсказку ИИ: {e}"

def transcribe_voice_file(file_path: str) -> str:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        logger.error("[OblakoCRM Bot] GROQ_API_KEY is not configured in .env")
        return ""
        
    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    headers = {
        "Authorization": f"Bearer {api_key}"
    }
    
    try:
        with open(file_path, "rb") as f:
            files = {
                "file": (os.path.basename(file_path), f, "audio/ogg")
            }
            data = {
                "model": "whisper-large-v3-turbo",
                "response_format": "json",
                "language": "ru"
            }
            response = requests.post(url, headers=headers, files=files, data=data, timeout=20)
            if response.status_code == 200:
                res_data = response.json()
                return res_data.get("text", "").strip()
            else:
                logger.error(f"[OblakoCRM Bot] Whisper transcription failed: {response.status_code} - {response.text}")
                return ""
    except Exception as e:
        logger.error(f"[OblakoCRM Bot] Error in Whisper transcription: {e}")
        return ""

def process_voice_transcription(text: str, chat_id: int, message_id: int, db: Session):
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        send_telegram_reply_message(
            BOT_TOKEN, 
            chat_id, 
            f"🎙 <b>Распознано:</b> {text}\n\n⚠️ GROQ_API_KEY не задан в .env для классификации.", 
            reply_to_message_id=message_id
        )
        return
        
    url = "https://api.groq.com/openai/v1/chat/completions"
    prompt = (
        "Вы — ИИ-классификатор задач для СФЕРУМ. "
        "Вам дан текст голосового сообщения, в котором пользователь сообщает о баге, предлагает фичу/идею или фиксирует архитектурное решение. "
        "Определите тип записи ('bug', 'idea', 'decision') и выделите краткое название (title) и подробное описание (description).\n"
        "Правила:\n"
        "- bug: если пользователь говорит об ошибке, сбое, поломке или некорректном поведении системы.\n"
        "- idea: если пользователь предлагает новую фичу, улучшение, модуль или доработку.\n"
        "- decision: если пользователь говорит об архитектурном или техническом решении (что решено и почему).\n"
        "Если тип не ясен, выберите 'bug'.\n"
        "Вы должны вернуть ответ строго в формате JSON, без какого-либо дополнительного текста, разметки markdown или тегов. "
        "Формат JSON:\n"
        "{\n"
        "  \"type\": \"bug\" | \"idea\" | \"decision\",\n"
        "  \"title\": \"краткое название на русском\",\n"
        "  \"description\": \"подробное описание на русском\"\n"
        "}"
    )
    
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": prompt},
            {"role": "user", "content": text}
        ],
        "temperature": 0.2,
        "response_format": {"type": "json_object"}
    }
    
    try:
        response = requests.post(url, headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }, json=payload, timeout=10)
        
        if response.status_code == 200:
            res_data = response.json()
            content = res_data["choices"][0]["message"]["content"].strip()
            parsed = json.loads(content)
            
            rec_type = parsed.get("type", "bug")
            title = parsed.get("title", "Без названия")
            desc = parsed.get("description", text)
            
            # Записываем в БД на основе типа
            if rec_type == "bug":
                bug = Bug(title=title, steps=desc, severity="Medium", component="voice", status="open")
                db.add(bug)
                db.commit()
                db.refresh(bug)
                ok_msg = (
                    f"🎙 <b>Голос распознан:</b> <i>«{text}»</i>\n\n"
                    f"🐞 <b>Баг #{bug.id} успешно зарегистрирован в DevBrain!</b>\n\n"
                    f"📌 <b>{title}</b>\n"
                    f"<b>Описание:</b> {desc}"
                )
            elif rec_type == "idea":
                epic = Epic(title=title, description=desc, status="planned", priority="Medium")
                db.add(epic)
                db.commit()
                db.refresh(epic)
                ok_msg = (
                    f"🎙 <b>Голос распознан:</b> <i>«{text}»</i>\n\n"
                    f"💡 <b>Идея #{epic.id} сохранена в Epics!</b>\n\n"
                    f"📌 <b>{title}</b>\n"
                    f"<b>Описание:</b> {desc}"
                )
            else: # decision
                log_rec = DecisionLog(title=title, decision=desc, rationale="Голосовое решение", source="voice", tags="telegram")
                db.add(log_rec)
                db.commit()
                db.refresh(log_rec)
                ok_msg = (
                    f"🎙 <b>Голос распознан:</b> <i>«{text}»</i>\n\n"
                    f"✅ <b>Архитектурное решение #{log_rec.id} зафиксировано!</b>\n\n"
                    f"📌 <b>{title}</b>\n"
                    f"<b>Решение:</b> {desc}"
                )
                
            send_telegram_reply_message(BOT_TOKEN, chat_id, ok_msg, reply_to_message_id=message_id)
        else:
            send_telegram_reply_message(
                BOT_TOKEN, 
                chat_id, 
                f"🎙 <b>Распознано:</b> <i>«{text}»</i>\n\n⚠️ Не удалось классифицировать через ИИ (код {response.status_code}).", 
                reply_to_message_id=message_id
            )
    except Exception as e:
        logger.error(f"[OblakoCRM Bot] Error in voice processing/classification: {e}")
        send_telegram_reply_message(
            BOT_TOKEN, 
            chat_id, 
            f"🎙 <b>Распознано:</b> <i>«{text}»</i>\n\n⚠️ Ошибка записи в DevBrain: {e}", 
            reply_to_message_id=message_id
        )


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
    
    # ─── ОБРАБОТКА CALLBACK QUERY (Inline-кнопки тикетов техподдержки) ───
    if "callback_query" in update:
        callback = update["callback_query"]
        callback_id = callback.get("id")
        from_user = callback.get("from", {})
        username = from_user.get("username", "admin")
        message = callback.get("message", {})
        chat_id = message.get("chat", {}).get("id")
        message_id = message.get("message_id")
        data = callback.get("data", "")
        
        # Подтверждение клика в Telegram
        answer_url = f"https://api.telegram.org/bot{BOT_TOKEN}/answerCallbackQuery"
        try:
            req = urllib.request.Request(
                answer_url,
                data=json.dumps({"callback_query_id": callback_id}).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            urllib.request.urlopen(req, timeout=5)
        except Exception as e:
            logger.error(f"[OblakoCRM Bot] Failed to answer callback query: {e}")
            
        if data.startswith("take_ticket_") or data.startswith("resolve_ticket_"):
            ticket_id = data.split("_")[-1]
            new_status = "in_progress" if data.startswith("take_ticket_") else "resolved"
            
            # Загружаем и обновляем тикет в support_tickets.json
            from .support_route import load_tickets, save_tickets
            tickets = load_tickets()
            target = None
            for t in tickets:
                if t["id"] == ticket_id:
                    target = t
                    break
                    
            if target:
                target["status"] = new_status
                save_tickets(tickets)
                
                # Обновляем текст сообщения в Telegram
                orig_text = message.get("text", "")
                
                # Заменяем строчку со статусом в исходном тексте
                updated_text = orig_text
                if "⚙️ Статус:" in updated_text:
                    lines = updated_text.split("\n")
                    for i, l in enumerate(lines):
                        if "⚙️ Статус:" in l:
                            lines[i] = f"⚙️ <b>Статус:</b> <code>{new_status}</code> (изменен @{username})"
                    updated_text = "\n".join(lines)
                else:
                    updated_text += f"\n\n⚙️ <b>Статус:</b> <code>{new_status}</code> (изменен @{username})"
                    
                # Отправляем обновленный текст и убираем кнопки
                edit_url = f"https://api.telegram.org/bot{BOT_TOKEN}/editMessageText"
                edit_payload = {
                    "chat_id": chat_id,
                    "message_id": message_id,
                    "text": updated_text,
                    "parse_mode": "HTML"
                }
                
                # Если перевели в in_progress, оставим только кнопку "Решено"
                if new_status == "in_progress":
                    edit_payload["reply_markup"] = {
                        "inline_keyboard": [
                            [{"text": "✅ Решено", "callback_data": f"resolve_ticket_{ticket_id}"}]
                        ]
                    }
                try:
                    req = urllib.request.Request(
                        edit_url,
                        data=json.dumps(edit_payload).encode("utf-8"),
                        headers={"Content-Type": "application/json"},
                        method="POST"
                    )
                    urllib.request.urlopen(req, timeout=5)
                except Exception as e:
                    logger.error(f"[OblakoCRM Bot] Failed to edit message: {e}")
                    
        elif data.startswith("quick_"):
            parts = data.split("_")
            if len(parts) >= 3:
                ticket_id = parts[1]
                action = parts[2]
                
                from .support_route import load_tickets, save_tickets
                tickets = load_tickets()
                target = None
                for t in tickets:
                    if t["id"] == ticket_id:
                        target = t
                        break
                        
                quick_responses = {
                    "checking": "Здравствуйте! Приняли в работу, уже проверяем. 🔧",
                    "details": "Здравствуйте! Пришлите, пожалуйста, скриншот или подробности. 📝",
                    "done": "Здравствуйте! Задача решена, проверяйте результат. ✅"
                }
                
                response_text = quick_responses.get(action)
                if not response_text:
                    if action == "ai" and target:
                        response_text = target.get("ai_suggestion", "Здравствуйте! Ваше обращение принято, ИИ готовит ответ.")
                    else:
                        response_text = "Проверяем."
                
                if target:
                    new_msg = {
                        "sender": f"{username} (Техподдержка)",
                        "text": response_text,
                        "time": datetime.now().strftime("%H:%M"),
                        "is_support": True
                    }
                    target["messages"].append(new_msg)
                    
                    if target["status"] == "open" and action in ["checking", "ai"]:
                        target["status"] = "in_progress"
                    elif action == "done":
                        target["status"] = "resolved"
                        
                    save_tickets(tickets)
                    
                    orig_text = message.get("text", "")
                    updated_text = orig_text
                    
                    new_status = target["status"]
                    if "⚙️ Статус:" in updated_text:
                        lines = updated_text.split("\n")
                        for i, l in enumerate(lines):
                            if "⚙️ Статус:" in l:
                                lines[i] = f"⚙️ <b>Статус:</b> <code>{new_status}</code> (изменен @{username})"
                        updated_text = "\n".join(lines)
                    else:
                        updated_text += f"\n\n⚙️ <b>Статус:</b> <code>{new_status}</code> (изменен @{username})"
                        
                    edit_url = f"https://api.telegram.org/bot{BOT_TOKEN}/editMessageText"
                    edit_payload = {
                        "chat_id": chat_id,
                        "message_id": message_id,
                        "text": updated_text,
                        "parse_mode": "HTML"
                    }
                    
                    if new_status == "resolved":
                        edit_payload["reply_markup"] = {"inline_keyboard": []}
                    elif new_status == "in_progress":
                        edit_payload["reply_markup"] = {
                            "inline_keyboard": [
                                [{"text": "✅ Решено", "callback_data": f"resolve_ticket_{ticket_id}"}],
                                [{"text": "🪄 Отправить ИИ-ответ", "callback_data": f"quick_{ticket_id}_ai"}],
                                [{"text": "📝 Ответ: Нужны скриншоты/детали", "callback_data": f"quick_{ticket_id}_details"}],
                                [{"text": "✅ Ответ: Готово, проверяйте", "callback_data": f"quick_{ticket_id}_done"}]
                            ]
                        }
                    else:
                        # Если вдруг остался open
                        edit_payload["reply_markup"] = {
                            "inline_keyboard": [
                                [
                                    {"text": "📥 Взять в работу", "callback_data": f"take_ticket_{ticket_id}"},
                                    {"text": "✅ Решено", "callback_data": f"resolve_ticket_{ticket_id}"}
                                ],
                                [{"text": "🪄 Отправить ИИ-ответ", "callback_data": f"quick_{ticket_id}_ai"}],
                                [{"text": "🔧 Ответ: Приняли, проверяем", "callback_data": f"quick_{ticket_id}_checking"}],
                                [{"text": "📝 Ответ: Нужны скриншоты/детали", "callback_data": f"quick_{ticket_id}_details"}],
                                [{"text": "✅ Ответ: Готово, проверяйте", "callback_data": f"quick_{ticket_id}_done"}]
                            ]
                        }
                        
                    try:
                        req = urllib.request.Request(
                            edit_url,
                            data=json.dumps(edit_payload).encode("utf-8"),
                            headers={"Content-Type": "application/json"},
                            method="POST"
                        )
                        urllib.request.urlopen(req, timeout=5)
                    except Exception as e:
                        logger.error(f"[OblakoCRM Bot] Failed to edit message on quick reply: {e}")
                        
                    send_telegram_reply_message(
                        BOT_TOKEN, 
                        chat_id, 
                        f"💬 <b>Отправлен быстрый ответ по #{ticket_id}:</b>\n<i>«{response_text}»</i>", 
                        reply_to_message_id=message_id,
                        thread_id=message.get("message_thread_id")
                    )
        return

    # ─── ОБРАБОТКА ОБЫЧНЫХ СООБЩЕНИЙ ───
    if "message" not in update:
        return

    message = update["message"]
    chat = message.get("chat", {})
    chat_id = chat.get("id")
    text = message.get("text", "")
    message_id = message.get("message_id")
    reply_to = message.get("reply_to_message")
    
    # ─── 1. ОПРЕДЕЛЕНИЕ ТИКЕТА (ПО ФОРУМНОМУ ТОПИКУ ИЛИ REPLY) ───
    ticket_id = None
    message_thread_id = message.get("message_thread_id")
    
    if message_thread_id:
        from .support_route import load_tickets
        tickets = load_tickets()
        for t in tickets:
            if t.get("telegram_thread_id") == message_thread_id:
                ticket_id = t["id"]
                break
                
    if not ticket_id and reply_to:
        reply_text = reply_to.get("text", "") or reply_to.get("caption", "")
        # Ищем ID тикета (SUP-XXX) в исходном сообщении
        match = re.search(r"SUP-\d+", reply_text)
        if match:
            ticket_id = match.group(0)
            
    if ticket_id:
        from_user = message.get("from", {})
        username = from_user.get("username", "admin")
        
        # Проверяем, есть ли вложение (фото или документ)
        photo = message.get("photo")
        document = message.get("document")
        attachment = None
        
        file_id = None
        file_name = "attachment"
        mime_type = "application/octet-stream"
        attachment_type = "document"
        
        if photo:
            # Берем фото лучшего качества
            file_id = photo[-1]["file_id"]
            file_name = f"photo_{int(time.time())}.jpg"
            mime_type = "image/jpeg"
            attachment_type = "image"
        elif document:
            file_id = document["file_id"]
            file_name = document.get("file_name", "document")
            mime_type = document.get("mime_type", "application/octet-stream")
            attachment_type = "image" if mime_type.startswith("image/") else "document"
            
        # Если нашли вложение, скачиваем и кодируем в Base64
        if file_id:
            get_file_url = f"https://api.telegram.org/bot{BOT_TOKEN}/getFile?file_id={file_id}"
            try:
                import base64
                req = urllib.request.Request(get_file_url, method="GET")
                with urllib.request.urlopen(req, timeout=10) as resp:
                    res = json.loads(resp.read().decode("utf-8"))
                    if res.get("ok"):
                        file_path = res["result"]["file_path"]
                        download_url = f"https://api.telegram.org/file/bot{BOT_TOKEN}/{file_path}"
                        
                        req_dl = urllib.request.Request(download_url, method="GET")
                        with urllib.request.urlopen(req_dl, timeout=30) as dl_resp:
                            file_bytes = dl_resp.read()
                            b64_data = base64.b64encode(file_bytes).decode("utf-8")
                            attachment = {
                                "name": file_name,
                                "url": f"data:{mime_type};base64,{b64_data}",
                                "type": attachment_type
                            }
            except Exception as ex:
                logger.error(f"[OblakoCRM Bot] Failed to download reply attachment: {ex}")
        
        # Текст ответа: приоритет у обычного текста, затем caption, иначе пустая строка или имя файла
        msg_text = text or message.get("caption", "")
        if not msg_text and attachment:
            msg_text = f"Отправлен файл: {file_name}"
        elif not msg_text:
            msg_text = ""
            
        # Если нет ни текста, ни вложения, и это не голосовое сообщение
        if not msg_text and not attachment and not message.get("voice"):
            pass
        elif not message.get("voice"):  # Если это не голосовое (голосовое обрабатывается в шаге 2 ниже)
            from .support_route import load_tickets, save_tickets
            tickets = load_tickets()
            target = None
            for t in tickets:
                if t["id"] == ticket_id:
                    target = t
                    break
                    
            if target:
                new_msg = {
                    "sender": f"{username} (Техподдержка)",
                    "text": msg_text,
                    "time": datetime.now().strftime("%H:%M"),
                    "is_support": True
                }
                if attachment:
                    new_msg["attachment"] = attachment
                    
                target["messages"].append(new_msg)
                
                # Если тикет был open, переводим в in_progress
                if target["status"] == "open":
                    target["status"] = "in_progress"
                    
                save_tickets(tickets)
                
                ok_label = " (с вложением)" if attachment else ""
                # Отвечаем админу в Telegram
                send_telegram_reply_message(
                    BOT_TOKEN, 
                    chat_id, 
                    f"✅ <b>Ответ по тикету #{ticket_id} доставлен клиенту!{ok_label}</b>", 
                    reply_to_message_id=message_id,
                    thread_id=message_thread_id
                )
                return

    # ─── 2. ОБРАБОТКА GOЛОСОВОГО ВВОДА (STT Whisper) ───
    voice = message.get("voice")
    if voice:
        file_id = voice.get("file_id")
        # Запрашиваем file_path через getFile
        get_file_url = f"https://api.telegram.org/bot{BOT_TOKEN}/getFile?file_id={file_id}"
        try:
            req = urllib.request.Request(get_file_url, method="GET")
            with urllib.request.urlopen(req, timeout=5) as response:
                res = json.loads(response.read().decode("utf-8"))
                if res.get("ok"):
                    file_path = res["result"]["file_path"]
                    download_url = f"https://api.telegram.org/file/bot{BOT_TOKEN}/{file_path}"
                    
                    # Скачиваем файл во временную директорию
                    temp_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "temp")
                    os.makedirs(temp_dir, exist_ok=True)
                    local_filename = os.path.join(temp_dir, f"voice_{file_id}.ogg")
                    
                    urllib.request.urlretrieve(download_url, local_filename)
                    logger.info(f"[OblakoCRM Bot] Downloaded voice file to {local_filename}")
                    
                    # Запускаем распознавание и классификацию
                    transcription = transcribe_voice_file(local_filename)
                    
                    # Удаляем временный файл
                    if os.path.exists(local_filename):
                        os.remove(local_filename)
                        
                    if transcription:
                        # Проверяем, является ли голосовое сообщение ответом на тикет (по топику или по Reply)
                        message_thread_id = message.get("message_thread_id")
                        ticket_id = None
                        
                        if message_thread_id:
                            from .support_route import load_tickets
                            tickets = load_tickets()
                            for t in tickets:
                                if t.get("telegram_thread_id") == message_thread_id:
                                    ticket_id = t["id"]
                                    break
                                    
                        if not ticket_id and reply_to:
                            reply_text = reply_to.get("text", "") or reply_to.get("caption", "")
                            match = re.search(r"SUP-\d+", reply_text)
                            if match:
                                ticket_id = match.group(0)

                        if ticket_id:
                            # Это ответ на тикет техподдержки!
                            from_user = message.get("from", {})
                            username = from_user.get("username", "admin")
                            
                            from .support_route import load_tickets, save_tickets
                            tickets = load_tickets()
                            target = None
                            for t in tickets:
                                if t["id"] == ticket_id:
                                    target = t
                                    break
                                    
                            if target:
                                new_msg = {
                                    "sender": f"{username} (Техподдержка)",
                                    "text": transcription,
                                    "time": datetime.now().strftime("%H:%M"),
                                    "is_support": True
                                }
                                target["messages"].append(new_msg)
                                if target["status"] == "open":
                                    target["status"] = "in_progress"
                                    
                                save_tickets(tickets)
                                
                                ok_msg = (
                                    f"🎙 <b>Голос распознан:</b> <i>«{transcription}»</i>\n\n"
                                    f"✅ <b>Ответ по тикету #{ticket_id} доставлен клиенту!</b>"
                                )
                                send_telegram_reply_message(
                                    BOT_TOKEN, 
                                    chat_id, 
                                    ok_msg, 
                                    reply_to_message_id=message_id,
                                    thread_id=message_thread_id
                                )
                        else:
                            # Обычное голосовое сообщение (создаем задачу в DevBrain)
                            process_voice_transcription(transcription, chat_id, message_id, db)
                    else:
                        send_telegram_reply_message(
                            BOT_TOKEN, 
                            chat_id, 
                            "❌ Не удалось распознать голосовое сообщение через Whisper.", 
                            reply_to_message_id=message_id
                        )
        except Exception as e:
            logger.error(f"[OblakoCRM Bot] Error processing voice message: {e}")
            send_telegram_reply_message(
                BOT_TOKEN, 
                chat_id, 
                f"❌ Ошибка обработки голосового: {e}", 
                reply_to_message_id=message_id
            )
        return

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
            "Welcome to SFERUM!\n\n"
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

    # 1.5. КОМАНДА /ID
    elif cmd_base == "/id":
        send_telegram_reply_message(BOT_TOKEN, chat_id, f"ID этого чата: <code>{chat_id}</code>", reply_to_message_id=message_id)
        return


    # 2. КОМАНДА /HELP
    elif cmd_base in ["/help", "/помощь", "/команды"]:
        help_text = (
            "🤖 <b>Глобальный пульт управления СФЕРУМ-ЕРП</b>\n\n"
            "<b>🎫 Работа с тикетами техподдержки:</b>\n"
            "• <b>Быстрый ответ ИИ</b>: Нажмите кнопку <code>🪄 Отправить ИИ-ответ</code> под сообщением тикета для моментальной отправки сгенерированного ИИ-черновика.\n"
            "• <b>Текстовый ответ</b>: Сделайте <b>Reply (Ответ)</b> на сообщение тикета и введите ваш текст.\n"
            "• <b>Голосовой ответ (STT)</b>: Сделайте <b>Reply (Ответ)</b> на сообщение тикета и отправьте голосовое сообщение — Whisper распознает его и доставит текст клиенту в CRM.\n"
            "• <b>Отправка скриншотов/файлов</b>: Сделайте <b>Reply (Ответ)</b> на сообщение тикета и прикрепите изображение или документ — они сохранятся как вложения в чате CRM.\n\n"
            "<b>📊 Управление задачами (DevBrain):</b>\n"
            "• <b>Голосовая регистрация</b>: Отправьте голосовое сообщение в ЛС боту. Оно автоматически распознается, классифицируется и создаст баг/идею/ADR в DevBrain.\n"
            "• 🐞 <b>Сообщить о баге:</b>\n"
            "<code>/bug Название | Описание | Приоритет</code>\n"
            "• 💡 <b>Предложить фичу/идею:</b>\n"
            "<code>/idea Название | Описание</code>\n"
            "• 📋 <b>Добавить решение (ADR):</b>\n"
            "<code>/decision Название | Решение | Обоснование</code>\n"
            "• 📊 <b>Сводка разработки</b>: Используй <code>/status</code> для получения сводки открытых багов."
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
