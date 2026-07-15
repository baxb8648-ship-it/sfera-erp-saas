from fastapi import APIRouter, Depends, Request, BackgroundTasks
import urllib.request
import urllib.parse
import json
import logging
import threading
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Tender, CompanySetting, User, TempVoiceTask, Task, Client, DecisionLog
try:
    from ..services.pm_copilot_engine import PMCopilotEngine
except ImportError:
    PMCopilotEngine = None

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/telegram", tags=["Telegram Webhook"])

def run_in_background(func, *args, **kwargs):
    t = threading.Thread(target=func, args=args, kwargs=kwargs)
    t.daemon = True
    t.start()

def delete_telegram_message(token: str, chat_id: int, message_id: int):
    url = f"https://api.telegram.org/bot{token}/deleteMessage"
    payload = {
        "chat_id": chat_id,
        "message_id": message_id
    }
    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url, 
            data=data, 
            headers={"Content-Type": "application/json"}, 
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            res = response.read().decode("utf-8")
            logger.info(f"Telegram message {message_id} deleted successfully.")
    except Exception as e:
        logger.error(f"Failed to delete Telegram message {message_id}: {e}")

def edit_message_reply_markup(token: str, chat_id: int, message_id: int, reply_markup: dict):
    url = f"https://api.telegram.org/bot{token}/editMessageReplyMarkup"
    payload = {
        "chat_id": chat_id,
        "message_id": message_id,
        "reply_markup": reply_markup
    }
    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url, 
            data=data, 
            headers={"Content-Type": "application/json"}, 
            method="POST"
        )
        urllib.request.urlopen(req, timeout=5)
    except Exception as e:
        logger.error(f"Failed to edit markup {message_id}: {e}")

def create_forum_topic(token: str, chat_id: str, name: str):
    url = f"https://api.telegram.org/bot{token}/createForumTopic"
    payload = {
        "chat_id": chat_id,
        "name": name
    }
    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url, 
            data=data, 
            headers={"Content-Type": "application/json"}, 
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            res = json.loads(response.read().decode("utf-8"))
            if res.get("ok"):
                return res["result"]["message_thread_id"]
    except Exception as e:
        logger.error(f"Failed to create topic: {e}")
    return None

def send_message_to_topic(token: str, chat_id: str, thread_id: int, text: str):
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "message_thread_id": thread_id,
        "text": text,
        "parse_mode": "HTML"
    }
    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url, 
            data=data, 
            headers={"Content-Type": "application/json"}, 
            method="POST"
        )
        urllib.request.urlopen(req, timeout=5)
    except Exception as e:
        logger.error(f"Failed to send to topic: {e}")

@router.post("/webhook/{token}")
async def telegram_webhook(token: str, request: Request, db: Session = Depends(get_db)):
    try:
        update = await request.json()
    except Exception:
        return {"status": "error", "message": "Invalid JSON"}

    # Process the update in a background thread to respond immediately
    run_in_background(process_telegram_update_sync, update, token)
    return {"status": "ok"}

def process_telegram_update_sync(update: dict, token: str):
    from ..database import SessionLocal
    db = SessionLocal()
    try:
        process_telegram_update_internal(update, db, token)
    except Exception as e:
        logger.error(f"Error processing telegram update: {e}")
    finally:
        db.close()

def process_telegram_update_internal(update: dict, db: Session, token: str):
    from ..models import TelegramBot
    bot = db.query(TelegramBot).filter(TelegramBot.bot_token == token, TelegramBot.is_active == True).first()
    if not bot:
        logger.warning(f"Received webhook for unknown token: {token[:10]}...")
        return
        
    role = bot.role

    if "callback_query" in update:
        callback = update["callback_query"]
        callback_id = callback.get("id")
        data = callback.get("data", "")
        message = callback.get("message", {})
        
        chat_id = message.get("chat", {}).get("id")
        message_id = message.get("message_id")
        
        if token and callback_id:
            # Определяем текст уведомления для Telegram клиента
            ack_text = "Обрабатываем..."
            if data.startswith("confirm_voice_") or data.startswith("confirm_voice_with_client_"):
                ack_text = "Создаём задачу..."
            elif data.startswith("cancel_voice_"):
                ack_text = "Отменено"
            elif data.startswith("delete_tender_"):
                ack_text = "Удаляем..."
            elif data.startswith("hitl_approve_"):
                ack_text = "Решение утверждается..."
            elif data.startswith("hitl_reject_"):
                ack_text = "Решение отклоняется..."
            elif data.startswith("hitl_details_"):
                ack_text = "Готовим сводку PM Copilot..."
            
            ans_url = f"https://api.telegram.org/bot{token}/answerCallbackQuery"
            ans_payload = {"callback_query_id": callback_id, "text": ack_text}
            try:
                ans_data = json.dumps(ans_payload).encode("utf-8")
                ans_req = urllib.request.Request(
                    ans_url, data=ans_data, headers={"Content-Type": "application/json"}, method="POST"
                )
                urllib.request.urlopen(ans_req, timeout=5)
            except Exception as e:
                logger.error(f"Failed to answer callback query: {e}")

        if data.startswith("delete_tender_"):
            try:
                tender_id = int(data.split("_")[-1])
            except ValueError:
                return
                
            db_tender = db.query(Tender).filter(Tender.id == tender_id).first()
            if db_tender:
                db.delete(db_tender)
                db.commit()
                logger.info(f"Tender {tender_id} deleted from DB via Telegram callback.")
                
            if token and chat_id and message_id:
                run_in_background(delete_telegram_message, token, chat_id, message_id)

        elif data.startswith("hitl_approve_"):
            try:
                proposal_id = int(data.split("_")[-1])
            except ValueError:
                return
            username = callback.get("from", {}).get("username") or callback.get("from", {}).get("first_name") or "Руководитель"
            
            db_proposal = db.query(DecisionLog).filter(DecisionLog.id == proposal_id).first()
            if db_proposal:
                db_proposal.tags = "hitl,approved"
                db_proposal.decision += f" [УТВЕРЖДЕНО @{username}]"
                db.commit()
                logger.info(f"HITL proposal #{proposal_id} approved by @{username}.")
            
            if token and chat_id and message_id:
                new_text = f"<b>✅ РЕШЕНИЕ #{proposal_id} УТВЕРЖДЕНО</b>\n\nСанкционировано руководителем: <b>@{username}</b>\n<i>Затраты официально внесены в финансовый график PM Copilot.</i>"
                run_in_background(edit_message_text, token, chat_id, message_id, new_text)

        elif data.startswith("hitl_reject_"):
            try:
                proposal_id = int(data.split("_")[-1])
            except ValueError:
                return
            username = callback.get("from", {}).get("username") or callback.get("from", {}).get("first_name") or "Руководитель"
            
            db_proposal = db.query(DecisionLog).filter(DecisionLog.id == proposal_id).first()
            if db_proposal:
                db_proposal.tags = "hitl,rejected"
                db_proposal.decision += f" [ОТКЛОНЕНО @{username}]"
                db.commit()
                logger.info(f"HITL proposal #{proposal_id} rejected by @{username}.")
            
            if token and chat_id and message_id:
                new_text = f"<b>❌ РЕШЕНИЕ #{proposal_id} ОТКЛОНЕНО</b>\n\nЗаблокировано руководителем: <b>@{username}</b>\n<i>Оплата или закупка остановлена по решению руководства.</i>"
                run_in_background(edit_message_text, token, chat_id, message_id, new_text)

        elif data.startswith("hitl_details_"):
            try:
                proposal_id = int(data.split("_")[-1])
            except ValueError:
                return
            
            if token and chat_id and PMCopilotEngine:
                copilot = PMCopilotEngine()
                summary = copilot.generate_executive_summary(db)
                fin = summary.get("finances", {})
                
                details_text = (
                    f"<b>📊 Аналитическая сводка PM Copilot к решению #{proposal_id}</b>\n\n"
                    f"💰 Текущий баланс: <code>{fin.get('current_balance', 0):,.2f} руб.</code>\n"
                    f"🔥 Скорость сжигания (Burn Rate): <code>{fin.get('daily_burn_rate', 0):,.2f} руб/день</code>\n"
                    f"⏳ Запас прочности (Runway): <b>{fin.get('runway_days', 0)} дней</b>\n"
                    f"🎯 Финансовый статус: <b>{fin.get('cash_gap_status', 'UNKNOWN')}</b>\n\n"
                    f"💡 <i>Резюме ИИ:</i> {summary.get('copilot_verdict', '')}"
                )
                run_in_background(send_message_to_topic, token, str(chat_id), message.get("message_thread_id") or 0, details_text)

        elif data.startswith("take_"):
            try:
                tender_id = int(data.split("_")[1])
            except ValueError:
                return
            db_tender = db.query(Tender).filter(Tender.id == tender_id).first()
            if db_tender:
                db_tender.status = "Решение об участии"
                
                # Check if this telegram user is mapped to a CRM user
                telegram_user_id = callback.get("from", {}).get("id")
                username = "Сотрудник"
                
                # Look for matching user in CRM
                if telegram_user_id:
                    # telegram_chat_id might be stored as string
                    crm_user = db.query(User).filter(User.telegram_chat_id == str(telegram_user_id)).first()
                    if crm_user:
                        db_tender.assigned_user_id = crm_user.id
                        username = crm_user.username
                
                if token and chat_id and not db_tender.telegram_thread_id:
                    topic_name = f"📝 {db_tender.title[:30]}..."
                    thread_id = create_forum_topic(token, chat_id, topic_name)
                    if thread_id:
                        db_tender.telegram_thread_id = thread_id
                        welcome_msg = (
                            f"📌 <b>Обсуждение тендера начато!</b>\n\n"
                            f"<b>Название:</b> {db_tender.title}\n"
                            f"<b>Ответственный:</b> {username}\n"
                            f"<b>Ссылка:</b> <a href='{db_tender.link}'>Перейти на площадку</a>"
                        )
                        run_in_background(send_message_to_topic, token, chat_id, thread_id, welcome_msg)

                db.commit()
                if token and chat_id and message_id:
                    new_markup = {
                        "inline_keyboard": [
                            [{"text": "✅ В работе", "callback_data": "noop"}],
                            [{"text": "📁 Документы", "url": db_tender.link}] if db_tender.link else []
                        ]
                    }
                    run_in_background(edit_message_reply_markup, token, chat_id, message_id, new_markup)

        elif data.startswith("assign_menu_"):
            try:
                tender_id = int(data.split("_")[2])
            except ValueError:
                return
            
            users = db.query(User).filter(User.is_active == 1).all()
            if token and chat_id and message_id:
                keyboard = []
                # Group users 2 per row
                row = []
                for u in users:
                    row.append({"text": f"👤 {u.username}", "callback_data": f"assign_{tender_id}_{u.id}"})
                    if len(row) == 2:
                        keyboard.append(row)
                        row = []
                if row:
                    keyboard.append(row)
                    
                keyboard.append([{"text": "🔙 Назад", "callback_data": f"cancel_assign_{tender_id}"}])
                new_markup = {"inline_keyboard": keyboard}
                run_in_background(edit_message_reply_markup, token, chat_id, message_id, new_markup)

        elif data.startswith("cancel_assign_"):
            try:
                tender_id = int(data.split("_")[2])
            except ValueError:
                return
            db_tender = db.query(Tender).filter(Tender.id == tender_id).first()
            if db_tender and token and chat_id and message_id:
                new_markup = {
                    "inline_keyboard": [
                        [{"text": "✅ Взять в работу", "callback_data": f"take_{tender_id}"}],
                        [
                            {"text": "👨‍💼 Назначить", "callback_data": f"assign_menu_{tender_id}"},
                            {"text": "🤖 ИИ-Анализ", "callback_data": f"ai_analyze_{tender_id}"}
                        ],
                        [{"text": "📁 Документы", "url": db_tender.link}] if db_tender.link else [],
                        [{"text": "❌ Удалить (Не интересно)", "callback_data": f"delete_tender_{tender_id}"}]
                    ]
                }
                run_in_background(edit_message_reply_markup, token, chat_id, message_id, new_markup)

        elif data.startswith("assign_"):
            parts = data.split("_")
            if len(parts) == 3:
                try:
                    tender_id = int(parts[1])
                    user_id = int(parts[2])
                except ValueError:
                    return
                
                db_tender = db.query(Tender).filter(Tender.id == tender_id).first()
                user = db.query(User).filter(User.id == user_id).first()
                if db_tender and user:
                    db_tender.assigned_user_id = user.id
                    db_tender.status = "Решение об участии"
                    db.commit()
                    if token and chat_id and message_id:
                        new_markup = {
                            "inline_keyboard": [
                                [{"text": f"✅ Назначен: {user.username}", "callback_data": "noop"}],
                                [{"text": "📁 Документы", "url": db_tender.link}] if db_tender.link else []
                            ]
                        }
                        run_in_background(edit_message_reply_markup, token, chat_id, message_id, new_markup)

        elif data.startswith("ai_analyze_"):
            try:
                tender_id = int(data.split("_")[-1])
            except ValueError:
                return
                
            if token and callback_id:
                ans_url = f"https://api.telegram.org/bot{token}/answerCallbackQuery"
                ans_payload = {"callback_query_id": callback_id, "text": "ИИ анализирует закупку..."}
                try:
                    ans_data = json.dumps(ans_payload).encode("utf-8")
                    ans_req = urllib.request.Request(
                        ans_url, data=ans_data, headers={"Content-Type": "application/json"}, method="POST"
                    )
                    urllib.request.urlopen(ans_req, timeout=5)
                except Exception as e:
                    logger.error(f"Failed to answer callback query: {e}")
                    
            run_in_background(
                handle_telegram_tender_ai_analysis,
                token,
                chat_id,
                tender_id,
                message_id
            )

        # ---- ГОЛОСОВЫЕ ЗАДАЧИ: Подтвердить (сделка/лид) ----
        elif data.startswith("confirm_voice_deal_"):
            try:
                temp_id = int(data.split("_")[-1])
            except ValueError:
                return
            run_in_background(
                handle_confirm_voice_deal,
                token, chat_id, message_id, temp_id
            )

        # ---- ГОЛОСОВЫЕ ЗАДАЧИ: Подтвердить (только задача) ----
        elif data.startswith("confirm_voice_") and not data.startswith("confirm_voice_with_client_") and not data.startswith("confirm_voice_deal_"):
            try:
                temp_id = int(data.split("_")[-1])
            except ValueError:
                return
            run_in_background(
                handle_confirm_voice_task,
                token, chat_id, message_id, temp_id, create_client=False
            )

        # ---- ГОЛОСОВЫЕ ЗАДАЧИ: Подтвердить (задача + новый клиент) ----
        elif data.startswith("confirm_voice_with_client_"):
            try:
                temp_id = int(data.split("_")[-1])
            except ValueError:
                return
            run_in_background(
                handle_confirm_voice_task,
                token, chat_id, message_id, temp_id, create_client=True
            )

        # ---- ГОЛОСОВЫЕ ЗАДАЧИ: ТОиР (Вызов механика) ----
        elif data.startswith("confirm_voice_mro_"):
            try:
                temp_id = int(data.split("_")[-1])
            except ValueError:
                return
            run_in_background(
                handle_confirm_voice_mro_task,
                token, chat_id, message_id, temp_id
            )

        # ---- ГОЛОСОВЫЕ ЗАДАЧИ: Снабжение (Заказ ТМЦ) ----
        elif data.startswith("confirm_voice_supply_"):
            try:
                temp_id = int(data.split("_")[-1])
            except ValueError:
                return
            run_in_background(
                handle_confirm_voice_supply_task,
                token, chat_id, message_id, temp_id
            )

        # ---- ГОЛОСОВЫЕ ЗАДАЧИ: Отмена ----
        elif data.startswith("cancel_voice_"):
            try:
                temp_id = int(data.split("_")[-1])
            except ValueError:
                return
            run_in_background(
                handle_cancel_voice_task,
                token, chat_id, message_id, temp_id
            )

    elif "message" in update:
        message = update["message"]
        chat = message.get("chat", {})
        chat_id = chat.get("id")
        text = message.get("text", "")
        chat_type = chat.get("type")
        voice = message.get("voice")  # Голосовое сообщение
        from_user = message.get("from", {})
        
        # ---- ОБРАБОТКА ГОЛОСОВЫХ СООБЩЕНИЙ ----
        if token and chat_id and voice:
            if role not in ["internal_copilot", "internal_pto"]:
                # Внешние боты не должны обрабатывать голосовые сообщения здесь
                return
            telegram_user_id = str(from_user.get("id", ""))
            file_id = voice.get("file_id")
            msg_id = message.get("message_id")
            thread_id = message.get("message_thread_id")
            
            if file_id:
                if role == "internal_pto":
                    send_telegram_reply_message(
                        token, chat_id,
                        "🎙 <b>Голосовое от прораба получено!</b> Анализирую списание...",
                        reply_to_message_id=msg_id,
                        thread_id=thread_id
                    )
                    run_in_background(
                        handle_pto_voice_message,
                        token, chat_id, file_id, telegram_user_id, msg_id, thread_id, db
                    )
                else:
                    send_telegram_reply_message(
                        token, chat_id,
                        "🎙 <b>Голосовое получено!</b> Распознаю речь...",
                        reply_to_message_id=msg_id,
                        thread_id=thread_id
                    )
                    run_in_background(
                        handle_voice_message,
                        token, chat_id, file_id, telegram_user_id, msg_id, thread_id, db
                    )
            return
        
        if token and chat_id and text:
            # Check for commands in private or group chat
            if text.strip().startswith("/"):
                cmd = text.strip().split()[0].lower()
                cmd_base = cmd.split("@")[0]
                
                # ── БЛОКИРОВКА IT-КОМАНД ДЛЯ ВНЕШНИХ БОТОВ ──
                if cmd_base in ["/bug", "/баг", "/bag", "/idea", "/идея", "/epic", "/эпик", "/decision", "/решение", "/decisions", "/решения", "/dev_status", "/разработка"]:
                    if role != "internal_copilot":
                        send_telegram_reply_message(
                            token, chat_id,
                            "⚠️ <b>Доступ ограничен</b>\nЭта команда предназначена только для внутренних разработчиков платформы СФЕРА.",
                            reply_to_message_id=message.get("message_id"),
                            thread_id=message.get("message_thread_id")
                        )
                        return

                # ── HELP COMMAND ─────────────────────────────────────────────
                if cmd_base in ["/help", "/команны", "/справка", "/команды"]:
                    if role == "internal_copilot":
                        help_msg = (
                            "📖 <b>Справка по командам СФЕРА</b>\n\n"
                            "👤 <b>Пользовательские команды:</b>\n"
                            "• /start, /crm — открыть Mini App\n"
                            "• /мои_задачи — список ваших активных задач\n"
                            "• <code>@ai [вопрос]</code> — задать вопрос ИИ-копилоту\n"
                            "• <i>Голосовое</i> — запишите аудио для автопостановки задачи\n\n"
                            "📊 <b>Аналитика:</b>\n"
                            "• /status (или /статус) — сводный дашборд по проектам\n\n"
                            "🧠 <b>Разработка (DevBrain):</b>\n"
                            "• /dev_status (или /разработка) — дашборд разработки\n"
                            "• /idea <code>Название | Описание | Приоритет</code>\n"
                            "• /bug <code>Заголовок | Шаги | Компонент | Важность</code>\n"
                            "• /decision <code>Название | Что решили | Почему</code>\n"
                            "• /decisions (или /решения) — 10 последних арх. решений"
                        )
                    else:
                        help_msg = (
                            "📖 <b>Справка по командам ЛЕОНИКА АКЗ</b>\n\n"
                            "👤 <b>Доступные команды:</b>\n"
                            "• /start, /crm — открыть Mini App с Kanban-доской тендеров\n"
                            "• /мои_задачи — список ваших активных задач по тендерам\n"
                            "• /status (или /статус) — дашборд по проектам и объектам"
                        )
                    
                    markup = {
                        "inline_keyboard": [
                            [{"text": "📱 Открыть CRM Mini App", "web_app": {"url": "https://срм.леоника56.рф/#/crm"}}]
                        ]
                    }
                    
                    send_telegram_reply_message(
                        token, chat_id, help_msg,
                        reply_to_message_id=message.get("message_id"),
                        thread_id=message.get("message_thread_id"),
                        reply_markup=markup
                    )
                    return

                # ── DECISION LOG ─────────────────────────────────────────────
                elif cmd_base in ["/решение", "/decision"]:
                    from ..database import SessionLocal as _SL
                    from ..models import DecisionLog as _DL
                    args_text = text.strip()[len(cmd_base):].strip()
                    parts = [p.strip() for p in args_text.split("|")]
                    if len(parts) < 3:
                        send_telegram_reply_message(
                            token, chat_id,
                            "📋 <b>Decision Log — формат:</b>\n\n"
                            "<code>/решение Название | Решение | Обоснование</code>\n\n"
                            "<b>Пример:</b>\n"
                            "<code>/решение STT: Groq vs Whisper | Groq API | Бесплатно, GPU не нужен</code>\n\n"
                            "<i>Опционально 4-я часть — отвергнутые альтернативы</i>",
                            reply_to_message_id=message.get("message_id"),
                            thread_id=message.get("message_thread_id")
                        )
                        return
                    _db2 = _SL()
                    try:
                        _rec = _DL(title=parts[0], decision=parts[1], rationale=parts[2],
                                   alternatives=parts[3] if len(parts) > 3 else None,
                                   tags="telegram", source="telegram")
                        _db2.add(_rec)
                        _db2.commit()
                        _db2.refresh(_rec)
                        send_telegram_reply_message(
                            token, chat_id,
                            f"✅ <b>Решение #{_rec.id} зафиксировано!</b>\n\n"
                            f"<b>📌 {parts[0]}</b>\n"
                            f"<b>Решение:</b> {parts[1]}\n"
                            f"<b>Обоснование:</b> {parts[2]}"
                            + (f"\n<b>Альтернативы:</b> <i>{parts[3]}</i>" if len(parts) > 3 else ""),
                            reply_to_message_id=message.get("message_id"),
                            thread_id=message.get("message_thread_id")
                        )
                    except Exception as _e:
                        logger.error(f"[DecisionLog] {_e}")
                        send_telegram_reply_message(token, chat_id, f"❌ Ошибка: {_e}",
                                                    reply_to_message_id=message.get("message_id"))
                    finally:
                        _db2.close()
                    return

                elif cmd_base in ["/решения", "/decisions"]:
                    from ..database import SessionLocal as _SL
                    from ..models import DecisionLog as _DL
                    _db2 = _SL()
                    try:
                        _recs = _db2.query(_DL).order_by(_DL.created_at.desc()).limit(10).all()
                        if not _recs:
                            send_telegram_reply_message(token, chat_id,
                                "📋 <b>Decision Log пуст.</b>\n\n"
                                "<code>/решение Название | Решение | Обоснование</code>",
                                reply_to_message_id=message.get("message_id"))
                        else:
                            _lines = [f"📋 <b>Архитектурные решения ({len(_recs)}):</b>\n"]
                            for _r in _recs:
                                _d = _r.created_at.strftime("%d.%m.%Y") if _r.created_at else "—"
                                _s = _r.decision[:80] + ("..." if len(_r.decision) > 80 else "")
                                _lines.append(f"<b>#{_r.id}</b> <code>{_d}</code> — {_r.title}\n   ↳ <i>{_s}</i>")
                            _lines.append("\n<i>Экспорт: GET /decisions/export</i>")
                            send_telegram_reply_message(token, chat_id, "\n".join(_lines),
                                                        reply_to_message_id=message.get("message_id"))
                    finally:
                        _db2.close()
                    return

                # ── DEVBRAIN COMMANDS ─────────────────────────────────────────
                elif cmd_base in ["/bug", "/баг", "/bag"]:
                    # Формат: /bug Заголовок | Шаги воспроизведения | Компонент [| Важность]
                    from ..database import SessionLocal as _SL
                    from ..models import Bug as _Bug
                    
                    args_text = text.strip()[len(cmd_base):].strip()
                    parts = [p.strip() for p in args_text.split("|")]
                    
                    if not parts or not parts[0]:
                        send_telegram_reply_message(
                            token, chat_id,
                            "🪲 <b>Decision Log / DevBrain — Регистрация бага:</b>\n\n"
                            "<code>/bug Заголовок | Шаги воспроизведения | Компонент | Важность</code>\n\n"
                            "<b>Пример:</b>\n"
                            "<code>/bug Ошибка STT | Падает при пустом аудиофайле | bot | Critical</code>",
                            reply_to_message_id=message.get("message_id")
                        )
                        return
                        
                    title = parts[0]
                    steps = parts[1] if len(parts) > 1 else None
                    component = parts[2] if len(parts) > 2 else "unknown"
                    severity = parts[3] if len(parts) > 3 else "Medium"
                    
                    _db2 = _SL()
                    try:
                        record = _Bug(
                            title=title,
                            steps=steps,
                            component=component,
                            severity=severity,
                            status="open"
                        )
                        _db2.add(record)
                        _db2.commit()
                        _db2.refresh(record)
                        send_telegram_reply_message(
                            token, chat_id,
                            f"🪲 <b>Баг #{record.id} успешно зарегистрирован!</b>\n\n"
                            f"<b>📌 {title}</b>\n"
                            f"<b>Компонент:</b> <code>{component}</code> | <b>Важность:</b> {severity}\n"
                            f"<b>Шаги:</b> {steps or 'не указаны'}",
                            reply_to_message_id=message.get("message_id")
                        )
                    except Exception as _e:
                        logger.error(f"[DevBrain] Ошибка создания бага: {_e}")
                        send_telegram_reply_message(token, chat_id, f"❌ Ошибка записи бага: {_e}",
                                                    reply_to_message_id=message.get("message_id"))
                    finally:
                        _db2.close()
                    return

                elif cmd_base in ["/idea", "/идея", "/epic", "/эпик"]:
                    # Формат: /idea Название | Описание [| Приоритет]
                    from ..database import SessionLocal as _SL
                    from ..models import Epic as _Epic
                    
                    args_text = text.strip()[len(cmd_base):].strip()
                    parts = [p.strip() for p in args_text.split("|")]
                    
                    if not parts or not parts[0]:
                        send_telegram_reply_message(
                            token, chat_id,
                            "💡 <b>DevBrain — Новая идея / Эпик:</b>\n\n"
                            "<code>/idea Название | Описание | Приоритет</code>\n\n"
                            "<b>Пример:</b>\n"
                            "<code>/idea Снабженец | Отдельный бот для прорабов | High</code>",
                            reply_to_message_id=message.get("message_id")
                        )
                        return
                        
                    title = parts[0]
                    desc = parts[1] if len(parts) > 1 else None
                    priority = parts[2] if len(parts) > 2 else "Medium"
                    
                    _db2 = _SL()
                    try:
                        record = _Epic(
                            title=title,
                            description=desc,
                            priority=priority,
                            status="planned"
                        )
                        _db2.add(record)
                        _db2.commit()
                        _db2.refresh(record)
                        send_telegram_reply_message(
                            token, chat_id,
                            f"💡 <b>Идея/Эпик #{record.id} сохранена в бэклог!</b>\n\n"
                            f"<b>📌 {title}</b>\n"
                            f"<b>Описание:</b> {desc or 'отсутствует'}\n"
                            f"<b>Приоритет:</b> {priority}",
                            reply_to_message_id=message.get("message_id")
                        )
                    except Exception as _e:
                        logger.error(f"[DevBrain] Ошибка создания идеи: {_e}")
                        send_telegram_reply_message(token, chat_id, f"❌ Ошибка записи идеи: {_e}",
                                                    reply_to_message_id=message.get("message_id"))
                    finally:
                        _db2.close()
                    return

                elif cmd_base in ["/dev_status", "/dev_dashboard", "/разработка"]:
                    from ..database import SessionLocal as _SL
                    from ..models import Epic as _Epic, Feature as _Feature, Bug as _Bug
                    
                    _db2 = _SL()
                    try:
                        # Сводные показатели
                        total_epics = _db2.query(_Epic).count()
                        active_epics = _db2.query(_Epic).filter(_Epic.status == "in_progress").count()
                        
                        total_features = _db2.query(_Feature).count()
                        active_features = _db2.query(_Feature).filter(_Feature.status == "in_progress").count()
                        
                        open_bugs = _db2.query(_Bug).filter(_Bug.status.in_(["open", "in_progress"])).count()
                        critical_bugs = _db2.query(_Bug).filter(_Bug.status.in_(["open", "in_progress"]), _Bug.severity == "Critical").count()
                        
                        # Списки последних активностей
                        recent_bugs = _db2.query(_Bug).filter(_Bug.status.in_(["open", "in_progress"])).order_by(_Bug.created_at.desc()).limit(3).all()
                        recent_epics = _db2.query(_Epic).filter(_Epic.status == "in_progress").order_by(_Epic.created_at.desc()).limit(3).all()
                        
                        lines = [
                            "🧠 <b>DevBrain — Сводка разработки</b>\n━━━━━━━━━━━━━━━━━━━━",
                            f"💡 <b>Эпики (Roadmap):</b> {total_epics} всего (🏗 {active_epics} в работе)",
                            f"⚙️ <b>Фичи:</b> {total_features} всего (🛠 {active_features} в работе)",
                            f"🪲 <b>Баги в бэклоге:</b> {open_bugs} открытых (🚨 {critical_bugs} критических)\n━━━━━━━━━━━━━━━━━━━━"
                        ]
                        
                        if recent_bugs:
                            lines.append("🛑 <b>Последние открытые баги:</b>")
                            for b in recent_bugs:
                                lines.append(f"  • #{b.id} <code>[{b.component or 'unknown'}]</code> {b.title} ({b.severity})")
                            lines.append("━━━━━━━━━━━━━━━━━━━━")
                            
                        if recent_epics:
                            lines.append("🏗 <b>Активные эпики в работе:</b>")
                            for e in recent_epics:
                                lines.append(f"  • #{e.id} {e.title} (Приоритет: {e.priority})")
                            lines.append("━━━━━━━━━━━━━━━━━━━━")
                            
                        lines.append("<i>Для детального экспорта используйте API /devbrain/status</i>")
                        
                        send_telegram_reply_message(
                            token, chat_id, "\n".join(lines),
                            reply_to_message_id=message.get("message_id")
                        )
                    except Exception as _e:
                        logger.error(f"[DevBrain] Ошибка /dev_status: {_e}")
                        send_telegram_reply_message(token, chat_id, f"❌ Ошибка получения дашборда разработки: {_e}",
                                                    reply_to_message_id=message.get("message_id"))
                    finally:
                        _db2.close()
                    return

                # ── DASHBOARD & PERSONAL TASKS COMMANDS ──────────────────────

                elif cmd_base in ["/status", "/dashboard", "/статус", "/дашборд"]:
                    from ..database import SessionLocal as _SL
                    from ..models import Client, Object, Task, Tender
                    from sqlalchemy import func
                    from datetime import datetime
                    
                    _db2 = _SL()
                    try:
                        # 1. Задачи
                        total_tasks = _db2.query(Task).filter(Task.status != "Выполнена", Task.status != "Отменена").count()
                        overdue_tasks = 0
                        now_dt = datetime.utcnow()
                        # простым циклом или фильтром посчитаем просроченные задачи
                        overdue_tasks = _db2.query(Task).filter(
                            Task.status != "Выполнена",
                            Task.status != "Отменена",
                            Task.due_date < now_dt
                        ).count()
                        
                        # 2. Объекты в работе
                        active_objects = _db2.query(Object).filter(Object.status == "В работе").count()
                        
                        # 3. Тендеры
                        total_tenders = _db2.query(Tender).count()
                        new_tenders = _db2.query(Tender).filter(Tender.status == "Новый").count()
                        
                        # 4. Лиды/Клиенты
                        total_clients = _db2.query(Client).count()
                        
                        msg_text = (
                            f"📊 <b>СФЕРА — сводка</b>\n"
                            f"<i>на {datetime.now().strftime('%d.%m.%Y %H:%M')}</i>\n"
                            f"━━━━━━━━━━━━━━━━━━━━\n"
                            f"📁 <b>Задачи:</b> {total_tasks} активных (🔴 {overdue_tasks} просрочено)\n"
                            f"🏗 <b>Объекты:</b> {active_objects} в работе\n"
                            f"🎯 <b>Тендеры:</b> {total_tenders} всего (🆕 {new_tenders} новых)\n"
                            f"👥 <b>Лиды/Клиенты:</b> {total_clients} в базе\n"
                            f"━━━━━━━━━━━━━━━━━━━━"
                        )
                        
                        send_telegram_reply_message(
                            token, chat_id, msg_text,
                            reply_to_message_id=message.get("message_id"),
                            thread_id=message.get("message_thread_id")
                        )
                    except Exception as _e:
                        logger.error(f"[TelegramBot] Ошибка /status: {_e}")
                        send_telegram_reply_message(token, chat_id, f"❌ Ошибка получения сводки: {_e}",
                                                    reply_to_message_id=message.get("message_id"))
                    finally:
                        _db2.close()
                    return

                elif cmd_base in ["/мои_задачи", "/my_tasks"]:
                    from ..database import SessionLocal as _SL
                    from ..models import User, Task
                    from sqlalchemy import or_
                    
                    _db2 = _SL()
                    try:
                        # Найдём пользователя по telegram_chat_id (используем chat_id или from_user.id)
                        tg_user_id = str(from_user.get("id", ""))
                        crm_user = _db2.query(User).filter(User.telegram_chat_id == tg_user_id).first()
                        
                        if not crm_user:
                            # Пробуем по chat_id если приватный чат
                            if chat_type == "private":
                                crm_user = _db2.query(User).filter(User.telegram_chat_id == str(chat_id)).first()
                        
                        if not crm_user:
                            send_telegram_reply_message(
                                token, chat_id,
                                "👤 <b>Пользователь не найден</b>\n\n"
                                "Ваш Telegram ID не привязан к сотруднику в CRM.\n"
                                "Попросите администратора указать ваш Telegram ID в карточке сотрудника.",
                                reply_to_message_id=message.get("message_id")
                            )
                            return
                        
                        # Выбираем невыполненные задачи пользователя
                        my_tasks = _db2.query(Task).filter(
                            Task.assigned_to_id == crm_user.id,
                            Task.status != "Выполнена",
                            Task.status != "Отменена"
                        ).order_by(Task.priority.desc(), Task.due_date.asc()).all()
                        
                        if not my_tasks:
                            send_telegram_reply_message(
                                token, chat_id,
                                f"🎉 <b>У вас нет активных задач, {crm_user.username}!</b>",
                                reply_to_message_id=message.get("message_id")
                            )
                        else:
                            lines = [f"📌 <b>Задачи сотрудника: {crm_user.username}</b>\n━━━━━━━━━━━━━━━━━━━━"]
                            for t in my_tasks:
                                prio_icon = "🟢"
                                if t.priority == "Высокий":
                                    prio_icon = "🔴"
                                elif t.priority == "Средний":
                                    prio_icon = "🟡"
                                    
                                due_str = t.due_date.strftime("%d.%m.%Y") if t.due_date else "без срока"
                                lines.append(
                                    f"{prio_icon} <b>#{t.id} {t.title}</b>\n"
                                    f"   Срок: <code>{due_str}</code> | Статус: <i>{t.status}</i>"
                                )
                            lines.append("━━━━━━━━━━━━━━━━━━━━\n<i>Завершить задачу можно через веб-интерфейс CRM.</i>")
                            send_telegram_reply_message(
                                token, chat_id, "\n".join(lines),
                                reply_to_message_id=message.get("message_id")
                            )
                    except Exception as _e:
                        logger.error(f"[TelegramBot] Ошибка /my_tasks: {_e}")
                        send_telegram_reply_message(token, chat_id, f"❌ Ошибка получения задач: {_e}",
                                                    reply_to_message_id=message.get("message_id"))
                    finally:
                        _db2.close()
                    return


                elif cmd_base in ["/start", "/tma", "/crm"]:

                    welcome_text = (
                        "👋 <b>Добро пожаловать в СФЕРА!</b>\n\n"
                        "Здесь вы можете управлять задачами компании прямо в Telegram.\n"
                        "Нажмите на кнопку ниже, чтобы открыть Mini App с Kanban-доской."
                    )
                    
                    if chat_type == "private":
                        markup = {
                            "inline_keyboard": [
                                [{"text": "📱 Открыть CRM Mini App", "web_app": {"url": "https://срм.леоника56.рф/#/crm"}}]
                            ]
                        }
                    else:
                        # В группах Telegram запрещает прямые кнопки web_app.
                        # Оставляем ровно ОДНУ ссылку на Mini App, тогда Telegram автоматически вынесет ее в синюю кнопку закрепа на телефонах.
                        markup = {
                            "inline_keyboard": [
                                [{"text": "📱 Открыть Mini App", "url": "https://t.me/Sphera56_bot/crm"}]
                            ]
                        }
                    
                    send_telegram_reply_message(
                        token,
                        chat_id,
                        welcome_text,
                        reply_to_message_id=message.get("message_id"),
                        thread_id=message.get("message_thread_id"),
                        reply_markup=markup
                    )
                    return

            should_trigger = False
            if chat_type == "private":
                should_trigger = True
            elif any(trigger in text.lower() for trigger in ["@ai", "/ai", "@ollama", "/ollama", "@sphera56_bot"]):
                should_trigger = True
                
            if should_trigger:
                if role == "internal_pto":
                    run_in_background(
                        handle_pto_text_message,
                        token,
                        chat_id,
                        text,
                        message.get("message_id"),
                        message.get("message_thread_id"),
                        db
                    )
                else:
                    run_in_background(
                        handle_telegram_ai_query,
                        token,
                        chat_id,
                        text,
                        message.get("message_id"),
                        message.get("message_thread_id"),
                        str(from_user.get("id", ""))
                    )

def send_chat_action(token: str, chat_id: int, action: str, thread_id: int = None):
    url = f"https://api.telegram.org/bot{token}/sendChatAction"
    payload = {
        "chat_id": chat_id,
        "action": action
    }
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
        urllib.request.urlopen(req, timeout=5)
    except Exception as e:
        logger.error(f"Failed to send chat action: {e}")

def send_telegram_reply_message(token: str, chat_id: int, text: str, reply_to_message_id: int = None, thread_id: int = None, reply_markup: dict = None):
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML"
    }
    if reply_to_message_id:
        payload["reply_to_message_id"] = reply_to_message_id
    if thread_id:
        payload["message_thread_id"] = thread_id
    if reply_markup:
        payload["reply_markup"] = reply_markup
    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url, 
            data=data, 
            headers={"Content-Type": "application/json"}, 
            method="POST"
        )
        urllib.request.urlopen(req, timeout=5)
    except Exception as e:
        logger.error(f"Failed to send telegram reply message: {e}")

def handle_telegram_ai_query(token: str, chat_id: int, text: str, reply_to_message_id: int, thread_id: int = None, telegram_user_id: str = None):
    from ..database import SessionLocal
    from ..models import User, Tender, FinanceTransaction, Task
    from ..utils.ai_engine import generate_rag_answer, ai_classify_intent, ai_extract_quick_task_params, ask_ollama
    from ..services.pinecone_rag import search_similar_by_text
    from sqlalchemy import func
    from datetime import datetime
    
    send_chat_action(token, chat_id, "typing", thread_id)
    
    clean_query = text
    for trigger in ["@ai", "/ai", "@ollama", "/ollama", "@sphera56_bot"]:
        clean_query = clean_query.replace(trigger, "")
    clean_query = clean_query.strip()
    
    # 1. Запуск классификатора намерений ИИ
    intent = ai_classify_intent(clean_query)
    logger.info(f"[Telegram AI] Classified intent: {intent} for query: {clean_query}")
    
    db = SessionLocal()
    try:
        # Пытаемся найти пользователя
        user_tg_id = telegram_user_id or str(chat_id)
        user = db.query(User).filter(User.telegram_chat_id == user_tg_id).first()
        tenant_id = user.tenant_id if user else 1
        
        # 2. Выполнение действий в зависимости от Intent
        if intent == "get_tasks":
            if not user:
                send_telegram_reply_message(
                    token, chat_id,
                    "👤 <b>Пользователь не привязан</b>\nВаш Telegram ID не привязан к сотруднику в CRM.",
                    reply_to_message_id, thread_id
                )
                return
                
            active_tasks = db.query(Task).filter(
                Task.assigned_to_id == user.id,
                Task.status != "Выполнена",
                Task.status != "Отменена"
            ).order_by(Task.priority.desc(), Task.due_date.asc()).all()
            
            if not active_tasks:
                send_telegram_reply_message(
                    token, chat_id,
                    f"🎉 <b>У вас нет активных задач, {user.username}!</b>",
                    reply_to_message_id, thread_id
                )
            else:
                lines = [f"📌 <b>Задачи сотрудника: {user.username}</b>\n━━━━━━━━━━━━━━━━━━━━"]
                for t in active_tasks:
                    prio_icon = "🟢" if t.priority != "Высокий" else "🔴"
                    due_str = t.due_date.strftime("%d.%m.%Y") if t.due_date else "без срока"
                    lines.append(f"{prio_icon} <b>#{t.id} {t.title}</b>\n   Срок: <code>{due_str}</code> | Статус: <i>{t.status}</i>")
                lines.append("━━━━━━━━━━━━━━━━━━━━\n<i>Завершить задачу можно в CRM.</i>")
                send_telegram_reply_message(token, chat_id, "\n".join(lines), reply_to_message_id, thread_id)
            return

        elif intent == "get_tenders":
            recent_tenders = db.query(Tender).order_by(Tender.created_at.desc()).limit(5).all()
            if not recent_tenders:
                send_telegram_reply_message(token, chat_id, "📭 <b>Тендеров пока нет в базе данных.</b>", reply_to_message_id, thread_id)
            else:
                lines = ["🎯 <b>Последние 5 тендеров в CRM:</b>\n━━━━━━━━━━━━━━━━━━━━"]
                for t in recent_tenders:
                    lines.append(f"🆕 <b>{t.title[:50]}...</b>\n   Заказчик: {t.customer_name or '—'}\n   Бюджет: <code>{t.price:,.2f} руб.</code>")
                lines.append("━━━━━━━━━━━━━━━━━━━━\n<a href='https://срм.леоника56.рф/#/tenders'>Перейти в Тендеры →</a>")
                send_telegram_reply_message(token, chat_id, "\n".join(lines), reply_to_message_id, thread_id)
            return

        elif intent == "get_balance":
            if not user or user.role not in ["admin", "superadmin"]:
                send_telegram_reply_message(
                    token, chat_id,
                    "⚠️ <b>Доступ ограничен</b>\nФинансовая сводка доступна только руководителям компании.",
                    reply_to_message_id, thread_id
                )
                return
                
            income = db.query(func.sum(FinanceTransaction.amount)).filter(FinanceTransaction.tenant_id == tenant_id, FinanceTransaction.transaction_type == "income").scalar() or 0.0
            expense = db.query(func.sum(FinanceTransaction.amount)).filter(FinanceTransaction.tenant_id == tenant_id, FinanceTransaction.transaction_type == "expense").scalar() or 0.0
            balance = income - expense
            
            msg = (
                f"💰 <b>Финансовый баланс компании</b>\n"
                f"━━━━━━━━━━━━━━━━━━━━\n"
                f"🟢 <b>Общий приход:</b> <code>{income:,.2f} руб.</code>\n"
                f"🔴 <b>Общий расход:</b> <code>{expense:,.2f} руб.</code>\n"
                f"💳 <b>Свободный баланс:</b> <b>{balance:,.2f} руб.</b>\n"
                f"━━━━━━━━━━━━━━━━━━━━"
            )
            send_telegram_reply_message(token, chat_id, msg, reply_to_message_id, thread_id)
            return

        elif intent == "create_task":
            if not user:
                send_telegram_reply_message(
                    token, chat_id,
                    "👤 <b>Пользователь не привязан</b>\nПривяжите ваш Telegram ID в карточке сотрудника в CRM.",
                    reply_to_message_id, thread_id
                )
                return
                
            task_params = ai_extract_quick_task_params(clean_query)
            due_dt = None
            if task_params.get("deadline"):
                try:
                    due_dt = datetime.strptime(task_params["deadline"], "%Y-%m-%d")
                except:
                    pass
                    
            new_task = Task(
                tenant_id=tenant_id,
                title=task_params.get("title") or "Задача от ассистента",
                description=f"Создано голосовой командой: {clean_query}",
                status="Новая",
                priority="Средний",
                created_by_id=user.id,
                assigned_to_id=user.id,
                due_date=due_dt
            )
            db.add(new_task)
            db.commit()
            db.refresh(new_task)
            
            due_str = due_dt.strftime("%d.%m.%Y") if due_dt else "без срока"
            send_telegram_reply_message(
                token, chat_id,
                f"✅ <b>Задача #{new_task.id} успешно создана!</b>\n\n"
                f"📌 <b>Название:</b> {new_task.title}\n"
                f"📅 <b>Срок:</b> <code>{due_str}</code>\n"
                f"👤 <b>Исполнитель:</b> {user.username}\n\n"
                f"<a href='https://срм.леоника56.рф/#/tasks'>Перейти к задачам →</a>",
                reply_to_message_id, thread_id
            )
            return

        # 3. Fallback to RAG QA
        try:
            matches = search_similar_by_text(tenant_id=tenant_id, query_text=clean_query, top_k=3)
        except Exception as e:
            logger.warning(f"[RAG Telegram] Не удалось выполнить поиск в Pinecone для тенанта {tenant_id}: {e}")
            matches = []
            
        ai_response = generate_rag_answer(clean_query, matches)
        
        if matches:
            sources_list = []
            for m in matches:
                src = m.get("source") or m.get("metadata", {}).get("source_file") or m.get("metadata", {}).get("title") or "База знаний"
                score_pct = round(m.get("score", 0) * 100, 1)
                sources_list.append(f"• [{score_pct}%] {src}")
            if sources_list:
                ai_response += "\n\n📚 <b>Источники из базы знаний:</b>\n" + "\n".join(sorted(set(sources_list), reverse=True))

        if not ai_response:
            ai_response = (
                "Извините, локальный сервер ИИ (Ollama) временно недоступен или модель не загружена. "
                "Убедитесь, что на сервере запущена служба Ollama и скачана модель qwen2:7b."
            )
            
        send_telegram_reply_message(token, chat_id, ai_response, reply_to_message_id, thread_id)

    except Exception as e:
        logger.error(f"[Telegram AI Query] Exception: {e}")
        send_telegram_reply_message(token, chat_id, f"❌ Произошла техническая ошибка: {e}", reply_to_message_id, thread_id)
    finally:
        db.close()


def handle_telegram_tender_ai_analysis(token: str, chat_id: int, tender_id: int, reply_to_message_id: int):
    import re
    from ..database import SessionLocal
    from ..utils.ai_engine import ask_ollama
    
    send_chat_action(token, chat_id, "typing")
    
    db = SessionLocal()
    try:
        tender = db.query(Tender).filter(Tender.id == tender_id).first()
        if not tender:
            send_telegram_reply_message(token, chat_id, "❌ Ошибка: тендер не найден в базе данных.", reply_to_message_id)
            return
            
        clean_desc = re.sub(r'<[^>]*>', '', tender.description or "")[:3000]
        prompt = (
            "Ты — ИИ-Копилот, технический эксперт компании ООО СФЕРА по антикоррозийной защите (АКЗ), "
            "огнезащите металлоконструкций, подготовке поверхностей (Sa 2.5, Sa 3, ГОСТ 9.402) и покраске ЛКМ.\n"
            "Проведи краткий экспресс-анализ этой закупки.\n\n"
            f"Название: {tender.title}\n"
            f"Заказчик: {tender.customer_name}\n"
            f"НМЦК: {tender.price:,.2f} руб.\n"
            f"ТЗ/Описание: {clean_desc}\n\n"
            "Напиши структурированный технический экспресс-анализ на русском языке:\n"
            "1. 🎯 Суть проекта (кратко)\n"
            "2. 🛠️ Ключевые объемы и требования к подготовке/ЛКМ\n"
            "3. ⚠️ Сложности и риски (высота, стесненность, погодные условия, сжатые сроки)\n"
            "4. 📊 Прогноз цены (учитывая демпинг заказчика: " + (tender.expected_dumping or "неизвестно") + ")\n\n"
            "Отвечай емко, по существу, профессионально и без лишних вводных слов."
        )
        
        ai_response = ask_ollama(prompt)
        if not ai_response:
            ai_response = (
                "Извините, локальный сервер ИИ (Ollama) временно недоступен или модель qwen2:7b не загружена."
            )
            
        send_telegram_reply_message(token, chat_id, ai_response, reply_to_message_id)
        
    except Exception as e:
        logger.error(f"Error in handle_telegram_tender_ai_analysis: {e}")
        send_telegram_reply_message(token, chat_id, f"❌ Произошла техническая ошибка при ИИ-анализе: {e}", reply_to_message_id)
    finally:
        db.close()


# ============================================================
# ГОЛОСОВЫЕ ЗАДАЧИ — Фаза 1 AI Roadmap
# ============================================================

def handle_voice_message(token: str, chat_id: int, file_id: str, telegram_user_id: str,
                         reply_to_message_id: int, thread_id: int = None, parent_db=None):
    """
    Обрабатывает голосовое сообщение:
      1. Скачивает .ogg с серверов Telegram
      2. Транскрибирует через Groq Whisper
      3. Извлекает сущности через Ollama
      4. Сохраняет в TempVoiceTask
      5. Отправляет карточку подтверждения с кнопками
    """
    from ..database import SessionLocal
    from ..services.voice_service import transcribe_voice_message
    from ..utils.ai_engine import ai_extract_task_entities

    # Транскрипция
    send_chat_action(token, chat_id, "typing", thread_id)
    transcript = transcribe_voice_message(token, file_id)

    if not transcript:
        send_telegram_reply_message(
            token, chat_id,
            "❌ <b>Не удалось распознать голосовое сообщение.</b>\n"
            "Возможные причины:\n"
            "• Не настроен <code>GROQ_API_KEY</code> в файле .env\n"
            "• Слишком тихая запись или нет речи\n"
            "Попробуйте ещё раз или напишите текстом.",
            reply_to_message_id=reply_to_message_id,
            thread_id=thread_id
        )
        return

    # Извлечение сущностей через Ollama
    send_chat_action(token, chat_id, "typing", thread_id)
    entities = ai_extract_task_entities(transcript)

    # Сохраняем в базу данных
    db = SessionLocal()
    try:
        temp = TempVoiceTask(
            telegram_user_id=telegram_user_id,
            chat_id=str(chat_id),
            original_text=transcript,
            client_name=entities.get("client_name"),
            contact_person=entities.get("contact_person"),
            contact_phone=entities.get("contact_phone"),
            service_type=entities.get("service_type"),
            area=entities.get("area"),
            deadline_desc=entities.get("deadline_desc"),
            task_title=entities.get("task_title") or transcript[:60],
            task_description=entities.get("task_description") or transcript,
        )
        db.add(temp)
        db.commit()
        db.refresh(temp)
        temp_id = temp.id

        # Проверяем есть ли клиент в CRM
        client_in_crm = None
        if entities.get("client_name"):
            client_in_crm = db.query(Client).filter(
                Client.name.ilike(f"%{entities['client_name']}%")
            ).first()

    finally:
        db.close()

    # Формируем красивую карточку
    lines = ["🎙 <b>Распознано голосовое сообщение</b>\n"]
    lines.append(f"<b>📋 Задача:</b> {entities.get('task_title', '—')}")
    if entities.get("client_name"):
        found_marker = " ✅ <i>(есть в CRM)</i>" if client_in_crm else " 🆕 <i>(новый клиент)</i>"
        lines.append(f"<b>🏢 Клиент:</b> {entities['client_name']}{found_marker}")
    if entities.get("contact_person"):
        lines.append(f"<b>👤 Контакт:</b> {entities['contact_person']}")
    if entities.get("contact_phone"):
        lines.append(f"<b>📞 Телефон:</b> {entities['contact_phone']}")
    if entities.get("service_type"):
        lines.append(f"<b>🛠 Вид работ:</b> {entities['service_type']}")
    if entities.get("area"):
        lines.append(f"<b>📐 Объём:</b> {entities['area']}")
    if entities.get("deadline_desc"):
        lines.append(f"<b>⏰ Срок:</b> {entities['deadline_desc']}")
    if entities.get("task_description"):
        desc_preview = entities['task_description'][:200]
        lines.append(f"\n<b>📝 Описание:</b>\n<i>{desc_preview}</i>")

    card_text = "\n".join(lines)

    # Строим кнопки в зависимости от того, найден ли клиент
    keyboard = []

    if entities.get("client_name") and not client_in_crm:
        # Клиент не найден — предлагаем создать обоих
        keyboard.append([{
            "text": "✅ Создать задачу + нового клиента",
            "callback_data": f"confirm_voice_with_client_{temp_id}"
        }])

    keyboard.append([{
        "text": "💼 Создать сделку / лида",
        "callback_data": f"confirm_voice_deal_{temp_id}"
    }])
    keyboard.append([{
        "text": "📌 Создать задачу" + (" (без клиента)" if entities.get("client_name") and not client_in_crm else ""),
        "callback_data": f"confirm_voice_{temp_id}"
    }])
    keyboard.append([{
        "text": "🔧 Вызвать механика (ТОиР)",
        "callback_data": f"confirm_voice_mro_{temp_id}"
    }])
    keyboard.append([{
        "text": "📦 Заказать ТМЦ (Снабжение)",
        "callback_data": f"confirm_voice_supply_{temp_id}"
    }])
    keyboard.append([{
        "text": "❌ Отмена",
        "callback_data": f"cancel_voice_{temp_id}"
    }])

    send_telegram_reply_message(
        token, chat_id, card_text,
        reply_to_message_id=reply_to_message_id,
        thread_id=thread_id,
        reply_markup={"inline_keyboard": keyboard}
    )


def handle_confirm_voice_deal(token: str, chat_id: int, message_id: int, temp_id: int):
    """
    Создаёт клиента/сделку в CRM со статусом 'negotiation' (Переговоры)
    по данным из TempVoiceTask.
    """
    from ..database import SessionLocal
    from ..models import Client, User, Task, ClientStatusEnum
    import re
    
    db = SessionLocal()
    try:
        temp = db.query(TempVoiceTask).filter(TempVoiceTask.id == temp_id).first()
        if not temp:
            edit_message_text(token, chat_id, message_id,
                              "❌ Сессия устарела. Пожалуйста, пришлите голосовое ещё раз.")
            return

        crm_user = db.query(User).filter(
            User.telegram_chat_id == temp.telegram_user_id
        ).first()
        creator_id = crm_user.id if crm_user else 1

        client_name = temp.client_name or f"Сделка из голосового ({temp.created_at.strftime('%d.%m %H:%M') if temp.created_at else ''})"
        
        # Пытаемся найти существующего клиента
        existing = db.query(Client).filter(Client.name.ilike(f"%{client_name}%")).first()
        
        budget_val = 0.0
        if temp.task_description and "Бюджет: " in temp.task_description:
            b_match = re.search(r'Бюджет:\s*([\d\s]+)\s*руб', temp.task_description)
            if b_match:
                try:
                    budget_val = float(b_match.group(1).replace(" ", ""))
                except:
                    pass

        if existing:
            new_client = existing
            new_client.status = ClientStatusEnum.negotiation
            if budget_val > 0:
                new_client.acquisition_cost = budget_val
            new_client.notes = f"Обновлено через голосовое. {temp.task_description}\n" + (new_client.notes or "")
        else:
            new_client = Client(
                tenant_id=crm_user.tenant_id if crm_user else 1,
                name=client_name,
                contact_person=temp.contact_person,
                phone=temp.contact_phone,
                status=ClientStatusEnum.negotiation,
                acquisition_cost=budget_val,
                notes=f"Создан автоматически из голосового сообщения.\n{temp.task_description or ''}",
                owner_id=creator_id
            )
            db.add(new_client)
            db.flush()

        # Создаём задачу "Провести переговоры"
        new_task = Task(
            tenant_id=crm_user.tenant_id if crm_user else 1,
            title=f"Переговоры по сделке: {new_client.name}",
            description=f"Подготовить КП и провести встречу.\nДетали из ИИ: {temp.task_description}",
            status="Новая",
            priority="Средний",
            created_by_id=creator_id,
            assigned_to_id=creator_id,
        )
        db.add(new_task)
        db.flush()

        db.delete(temp)
        db.commit()

        parts = ["🟢 <b>Сделка & Задача успешно созданы!</b>\n"]
        parts.append(f"<b>💼 Лид/Сделка:</b> <code>{new_client.name}</code>")
        if budget_val > 0:
            parts.append(f"<b>💰 Бюджет:</b> <code>{budget_val:,.2f} руб.</code>")
        parts.append(f"<b>📌 Задача:</b> {new_task.title}")
        parts.append(f"\n<a href='https://срм.леоника56.рф/#/clients'>Открыть Сделки в CRM →</a>")

        edit_message_text(token, chat_id, message_id, "\n".join(parts))

    except Exception as e:
        logger.error(f"handle_confirm_voice_deal error: {e}")
        edit_message_text(token, chat_id, message_id, f"❌ Ошибка при создании сделки: {e}")
    finally:
        db.close()


def handle_confirm_voice_task(token: str, chat_id: int, message_id: int,
                              temp_id: int, create_client: bool = False):
    """
    Создаёт задачу (и опционально клиента) в CRM по данным из TempVoiceTask.
    Вызывается при нажатии кнопки подтверждения.
    """
    from ..database import SessionLocal
    from datetime import datetime

    db = SessionLocal()
    try:
        temp = db.query(TempVoiceTask).filter(TempVoiceTask.id == temp_id).first()
        if not temp:
            edit_message_text(token, chat_id, message_id,
                              "❌ Сессия устарела. Пожалуйста, пришлите голосовое ещё раз.")
            return

        new_client_id = None
        new_client_name = temp.client_name

        if create_client and temp.client_name:
            # Создаём нового клиента
            existing = db.query(Client).filter(
                Client.name.ilike(f"%{temp.client_name}%")
            ).first()
            if existing:
                new_client_id = existing.id
                new_client_name = existing.name
            else:
                new_client = Client(
                    name=temp.client_name,
                    contact_person=temp.contact_person,
                    phone=temp.contact_phone,
                    notes=f"Создан автоматически из голосового сообщения.\n{temp.task_description or ''}",
                    status="new"
                )
                db.add(new_client)
                db.flush()
                new_client_id = new_client.id
        else:
            # Ищем существующего клиента
            if temp.client_name:
                existing = db.query(Client).filter(
                    Client.name.ilike(f"%{temp.client_name}%")
                ).first()
                if existing:
                    new_client_id = existing.id
                    new_client_name = existing.name

        # Ищем создавшего пользователя по telegram_user_id
        crm_user = db.query(User).filter(
            User.telegram_chat_id == temp.telegram_user_id
        ).first()
        creator_id = crm_user.id if crm_user else 1  # fallback на первого пользователя

        # Создаём задачу
        new_task = Task(
            title=temp.task_title or "Задача из голосового сообщения",
            description=temp.task_description,
            status="Новая",
            priority="Средний",
            created_by_id=creator_id,
            assigned_to_id=creator_id,
        )
        db.add(new_task)
        db.flush()
        task_id = new_task.id

        # Удаляем временную запись
        db.delete(temp)
        db.commit()

        # Формируем ответное сообщение
        parts = ["🟢 <b>Задача создана в CRM!</b>\n"]
        parts.append(f"<b>📋 Задача #{task_id}:</b> {new_task.title}")
        if new_client_name:
            action = "Добавлен клиент" if create_client else "Клиент"
            parts.append(f"<b>🏢 {action}:</b> {new_client_name}")
        parts.append(f"\n<a href='https://срм.леоника56.рф/#/tasks'>Открыть в CRM →</a>")

        edit_message_text(token, chat_id, message_id, "\n".join(parts))

    except Exception as e:
        logger.error(f"handle_confirm_voice_task error: {e}")
        edit_message_text(token, chat_id, message_id, f"❌ Ошибка при создании задачи: {e}")
    finally:
        db.close()

def handle_confirm_voice_mro_task(token: str, chat_id: int, message_id: int, temp_id: int):
    """
    Создаёт вызов механика (ServiceTicket) из голосового сообщения.
    """
    from ..database import SessionLocal
    from ..models import ServiceTicket, TempVoiceTask, User
    from datetime import datetime

    db = SessionLocal()
    try:
        temp = db.query(TempVoiceTask).filter(TempVoiceTask.id == temp_id).first()
        if not temp:
            edit_message_text(token, chat_id, message_id, "❌ Сессия устарела. Пожалуйста, пришлите голосовое ещё раз.")
            return

        crm_user = db.query(User).filter(User.telegram_chat_id == temp.telegram_user_id).first()
        creator_id = crm_user.id if crm_user else 1

        new_ticket = ServiceTicket(
            tenant_id=crm_user.tenant_id if crm_user else 1,
            creator_id=creator_id,
            issue_description=temp.task_description or temp.task_title or "Поломка техники",
            audio_transcript=temp.original_text,
            status="open"
        )
        db.add(new_ticket)
        db.flush()
        ticket_id = new_ticket.id

        db.delete(temp)
        db.commit()

        parts = ["🟢 <b>Вызов механика создан!</b>\n"]
        parts.append(f"<b>🔧 Заявка #{ticket_id} (ТОиР):</b> {new_ticket.issue_description[:100]}...")
        parts.append(f"\n<a href='https://срм.леоника56.рф/#/service'>Открыть доску механика →</a>")

        edit_message_text(token, chat_id, message_id, "\n".join(parts))

    except Exception as e:
        logger.error(f"handle_confirm_voice_mro_task error: {e}")
        edit_message_text(token, chat_id, message_id, f"❌ Ошибка при вызове механика: {e}")
    finally:
        db.close()


def handle_confirm_voice_supply_task(token: str, chat_id: int, message_id: int, temp_id: int):
    """
    Создаёт заявку на снабжение (SupplyOrder) из голосового сообщения.
    """
    from ..database import SessionLocal
    from ..models import SupplyOrder, TempVoiceTask, User
    import re

    db = SessionLocal()
    try:
        temp = db.query(TempVoiceTask).filter(TempVoiceTask.id == temp_id).first()
        if not temp:
            edit_message_text(token, chat_id, message_id, "❌ Сессия устарела. Пожалуйста, пришлите голосовое ещё раз.")
            return

        crm_user = db.query(User).filter(User.telegram_chat_id == temp.telegram_user_id).first()
        creator_id = crm_user.id if crm_user else 1
        
        # Пытаемся извлечь количество из текста (наивный парсинг)
        quantity = 1.0
        q_match = re.search(r'(\d+[\.,]?\d*)\s*(шт|т|тонн|кг|м|литров|л|упаковок)', temp.area or temp.task_description or "")
        if q_match:
            try:
                quantity = float(q_match.group(1).replace(',', '.'))
            except:
                pass

        new_order = SupplyOrder(
            tenant_id=crm_user.tenant_id if crm_user else 1,
            creator_id=creator_id,
            item_name=temp.task_title or "Материалы по заявке",
            quantity=quantity,
            status="new"
        )
        db.add(new_order)
        db.flush()
        order_id = new_order.id

        db.delete(temp)
        db.commit()

        parts = ["🟢 <b>Заявка на снабжение отправлена!</b>\n"]
        parts.append(f"<b>📦 Заказ #{order_id}:</b> {new_order.item_name} ({new_order.quantity} ед.)")
        parts.append(f"\n<a href='https://срм.леоника56.рф/#/supply'>Открыть Канбан снабжения →</a>")

        edit_message_text(token, chat_id, message_id, "\n".join(parts))

    except Exception as e:
        logger.error(f"handle_confirm_voice_supply_task error: {e}")
        edit_message_text(token, chat_id, message_id, f"❌ Ошибка при создании заявки на снабжение: {e}")
    finally:
        db.close()



def handle_cancel_voice_task(token: str, chat_id: int, message_id: int, temp_id: int):
    """Удаляет временную запись и редактирует карточку на 'Отменено'."""
    from ..database import SessionLocal

    db = SessionLocal()
    try:
        temp = db.query(TempVoiceTask).filter(TempVoiceTask.id == temp_id).first()
        if temp:
            db.delete(temp)
            db.commit()
    finally:
        db.close()

    edit_message_text(token, chat_id, message_id, "❌ Создание задачи отменено.")


def edit_message_text(token: str, chat_id: int, message_id: int, text: str):
    """Редактирует текст существующего сообщения в Telegram (убирает кнопки тоже)."""
    url = f"https://api.telegram.org/bot{token}/editMessageText"
    payload = {
        "chat_id": chat_id,
        "message_id": message_id,
        "text": text,
        "parse_mode": "HTML",
        "reply_markup": {"inline_keyboard": []}  # Убираем кнопки
    }
    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url, data=data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        urllib.request.urlopen(req, timeout=5)
    except Exception as e:
        logger.error(f"edit_message_text error: {e}")


def handle_pto_text_message(token: str, chat_id: int, text: str, reply_to_message_id: int, thread_id: int = None, parent_db=None):
    from ..utils.ai_engine import ai_extract_pto_material_consumption
    from ..models import InventoryItem, Object, AuditLog
    from ..database import SessionLocal
    
    send_chat_action(token, chat_id, "typing", thread_id)
    entities = ai_extract_pto_material_consumption(text)
    
    if not entities.get("material_name"):
        send_telegram_reply_message(
            token, chat_id,
            "❌ <b>Ошибка списания:</b> ИИ не смог распознать название материала в вашем сообщении.\n"
            "Пожалуйста, сформулируйте понятнее, например: <i>«Списал 10 мешков цемента на ЖК Гагаринский»</i>.",
            reply_to_message_id=reply_to_message_id,
            thread_id=thread_id
        )
        return

    qty = entities.get("quantity")
    if qty is None:
        send_telegram_reply_message(
            token, chat_id,
            f"❌ <b>Ошибка списания:</b> Для материала <code>{entities['material_name']}</code> не указано или не распознано количество.\n"
            "Пожалуйста, укажите число (например, <i>5 шт</i>, <i>10 кг</i>).",
            reply_to_message_id=reply_to_message_id,
            thread_id=thread_id
        )
        return

    db = SessionLocal()
    try:
        # Ищем товар по имени (похожее название)
        item = db.query(InventoryItem).filter(
            InventoryItem.name.ilike(f"%{entities['material_name']}%")
        ).first()

        if not item:
            send_telegram_reply_message(
                token, chat_id,
                f"❌ <b>Материал не найден:</b> В справочнике склада не найден материал <code>{entities['material_name']}</code>.\n"
                "Пожалуйста, добавьте ТМЦ в CRM в разделе Склад или проверьте правильность названия.",
                reply_to_message_id=reply_to_message_id,
                thread_id=thread_id
            )
            return

        # Ищем объект по имени
        obj = None
        if entities.get("object_name"):
            obj = db.query(Object).filter(
                Object.name.ilike(f"%{entities['object_name']}%")
            ).first()

        # Выполняем списание
        old_qty = item.quantity or 0.0
        new_qty = old_qty - float(qty)
        item.quantity = new_qty
        
        # Логируем действие в AuditLog
        log_entry = AuditLog(
            action="Списание ТМЦ через Telegram-бот ПТО",
            details=f"Списано {qty} {entities.get('unit') or item.unit} ТМЦ '{item.name}' (ID: {item.id}). Объект: {obj.name if obj else 'не указан'}. Прежний остаток: {old_qty}, новый: {new_qty}."
        )
        db.add(log_entry)
        db.commit()

        success_msg = (
            f"📦 <b>Списание материала выполнено успешно!</b>\n━━━━━━━━━━━━━━━━━━━━\n"
            f"🛠 <b>Материал:</b> <code>{item.name}</code>\n"
            f"📉 <b>Списано:</b> <code>{qty} {entities.get('unit') or item.unit}</code>\n"
            f"🏢 <b>Строительный объект:</b> <code>{obj.name if obj else 'Не указан'}</code>\n"
            f"📊 <b>Остаток на складе:</b> <code>{new_qty} {item.unit}</code>"
        )
        send_telegram_reply_message(token, chat_id, success_msg, reply_to_message_id, thread_id)
        
    except Exception as e:
        logger.error(f"[PTO Bot] Error in handle_pto_text_message: {e}")
        send_telegram_reply_message(
            token, chat_id,
            f"❌ <b>Техническая ошибка при списании:</b> {str(e)}",
            reply_to_message_id=reply_to_message_id,
            thread_id=thread_id
        )
    finally:
        db.close()


def handle_pto_voice_message(token: str, chat_id: int, file_id: str, telegram_user_id: str,
                             reply_to_message_id: int, thread_id: int = None, parent_db=None):
    from ..services.voice_service import transcribe_voice_message
    
    # 1. Транскрипция Whisper
    send_chat_action(token, chat_id, "typing", thread_id)
    transcript = transcribe_voice_message(token, file_id)

    if not transcript:
        send_telegram_reply_message(
            token, chat_id,
            "❌ <b>Не удалось распознать голосовое сообщение прораба.</b>\n"
            "Пожалуйста, запишите сообщение четче или напишите текстом.",
            reply_to_message_id=reply_to_message_id,
            thread_id=thread_id
        )
        return

    # Отправляем распознанный текст
    send_telegram_reply_message(
        token, chat_id,
        f"🎙 <b>Голосовое распознано:</b>\n<i>«{transcript}»</i>\n\nВыполняю списание...",
        reply_to_message_id=reply_to_message_id,
        thread_id=thread_id
    )

    # 2. Вызываем обработчик текста
    handle_pto_text_message(token, chat_id, transcript, reply_to_message_id, thread_id, parent_db)
