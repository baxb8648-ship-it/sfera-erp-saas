import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from .database import SessionLocal
from .models import Tender, CompanySetting
from .ops_monitor import (
    check_tunnel_health,
    check_ollama_health,
    check_groq_quota,
    check_api_fns_quota,
    check_backup_freshness,
    check_disk_space,
)

logger = logging.getLogger("uvicorn.error")

try:
    from apscheduler.schedulers.background import BackgroundScheduler
    HAS_SCHEDULER = True
except ImportError:
    HAS_SCHEDULER = False
    logger.warning("APScheduler is not installed. Background tasks will not run.")

scheduler = None

def send_morning_digest():
    """
    Формирует и отправляет утренний дайджест в Telegram.
    """
    logger.info("Running morning digest task...")
    db: Session = SessionLocal()
    try:
        # Get Telegram Bot Token and Chat ID
        bot = db.query(TelegramBot).first()
        
        if not bot or not bot.bot_token or not bot.telegram_chat_id:
            logger.warning("Morning digest skipped: Telegram bot configuration is missing.")
            return

        token = bot.bot_token
        chat_id = bot.telegram_chat_id

        # Time bounds
        now = datetime.utcnow()
        yesterday = now - timedelta(days=1)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow_end = today_start + timedelta(days=2)

        # 1. Tenders found in the last 24 hours
        recent_tenders = db.query(Tender).filter(Tender.created_at >= yesterday).all()
        recent_count = len(recent_tenders)
        total_sum = sum(t.price for t in recent_tenders if t.price)

        # 2. Tenders with approaching deadlines (today or tomorrow) and not rejected/completed
        active_statuses = ["Анализ", "Решение об участии", "В работе"]
        deadline_tenders = db.query(Tender).filter(
            Tender.status.in_(active_statuses),
            Tender.submission_deadline >= today_start,
            Tender.submission_deadline <= tomorrow_end
        ).order_by(Tender.submission_deadline.asc()).all()

        if recent_count == 0 and len(deadline_tenders) == 0:
            logger.info("Morning digest: Nothing to report.")
            return

        # Build message
        msg_lines = [
            "🌅 <b>Доброе утро! Ежедневная сводка по тендерам:</b>\n"
        ]
        
        if recent_count > 0:
            msg_lines.append(f"📊 <b>За прошедшие сутки найдено:</b> {recent_count} новых тендеров.")
            msg_lines.append(f"💰 <b>Общая сумма:</b> {total_sum:,.2f} руб.\n")
        else:
            msg_lines.append("📊 <b>За прошедшие сутки новых профильных тендеров не найдено.</b>\n")

        if deadline_tenders:
            msg_lines.append("🚨 <b>ГОРЯЩИЕ ДЕДЛАЙНЫ ПОДАЧИ ЗАЯВОК:</b>")
            for idx, t in enumerate(deadline_tenders[:5], 1): # show up to 5
                dl_str = t.submission_deadline.strftime('%d.%m.%Y %H:%M')
                msg_lines.append(f"{idx}. <a href='{t.link}'>{t.title[:50]}...</a> (до {dl_str})")
            
            if len(deadline_tenders) > 5:
                msg_lines.append(f"...и еще {len(deadline_tenders) - 5} шт.")
        else:
            msg_lines.append("✅ <i>На сегодня и завтра нет горящих дедлайнов.</i>")

        msg_lines.append("\n<i>Зайдите в CRM, чтобы проверить детали!</i>")
        
        message_text = "\n".join(msg_lines)

        # Send via Telegram API
        import urllib.request
        import urllib.parse
        import json

        url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": message_text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True
        }
        
        req = urllib.request.Request(
            url, 
            data=json.dumps(payload).encode("utf-8"), 
            headers={"Content-Type": "application/json"}, 
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            logger.info("Morning digest sent successfully.")
            
    except Exception as e:
        logger.error(f"Error in send_morning_digest: {e}")
    finally:
        db.close()


def check_tender_updates():
    """
    Пункт 9: Проверяет изменения документации на площадке для тендеров в работе.
    """
    logger.info("Running check_tender_updates...")
    db: Session = SessionLocal()
    try:
        token_setting = db.query(CompanySetting).filter(CompanySetting.key == "telegram_bot_token").first()
        chat_id_setting = db.query(CompanySetting).filter(CompanySetting.key == "telegram_channel_id").first()
        if not token_setting or not chat_id_setting or not token_setting.value or not chat_id_setting.value: return
        token = token_setting.value
        chat_id = chat_id_setting.value

        active_tenders = db.query(Tender).filter(
            Tender.status.in_(["Анализ", "Решение об участии", "В работе"]),
            Tender.platform == "Закупки.gov.ru"
        ).all()
        
        import urllib.request
        from bs4 import BeautifulSoup
        
        for tender in active_tenders:
            try:
                if not tender.link: continue
                req = urllib.request.Request(tender.link, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=10) as response:
                    html = response.read().decode('utf-8')
                
                # Check for updates. Simple heuristic for MVP:
                if "Извещение изменено" in html or "Обновлено" in html:
                    # In a real scenario, we parse the exact date and compare with tender.platform_updated_at
                    # Here we simulate update detection
                    if tender.platform_updated_at is None:
                        tender.platform_updated_at = datetime.utcnow()
                        db.commit()
                        
                        # Notify
                        thread_id = tender.telegram_thread_id
                        msg = (
                            f"🚨 <b>Внимание! Изменена документация!</b>\n\n"
                            f"Заказчик внес правки в тендер <b>{tender.tender_number}</b>.\n"
                            f"Срочно перепроверьте ТЗ и объемы!\n"
                            f"<a href='{tender.link}'>Ссылка на извещение</a>"
                        )
                        
                        import json
                        url = f"https://api.telegram.org/bot{token}/sendMessage"
                        payload = {
                            "chat_id": chat_id,
                            "text": msg,
                            "parse_mode": "HTML"
                        }
                        if thread_id:
                            payload["message_thread_id"] = thread_id
                            
                        req_api = urllib.request.Request(
                            url, data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json"}, method="POST"
                        )
                        urllib.request.urlopen(req_api, timeout=5)
            except Exception as e:
                logger.error(f"Error checking updates for {tender.id}: {e}")
                
    except Exception as e:
        logger.error(f"Error in check_tender_updates: {e}")
    finally:
        db.close()


def run_subcontract_search():
    """
    Пункт 10: Поиск победителей по завершенным торгам.
    """
    from .database import SessionLocal
    from .parsers.subcontract_parser import search_subcontracts
    db = SessionLocal()
    try:
        # Default keywords, or we can fetch them from settings
        search_subcontracts(db, ["антикоррозийная", "огнезащита"], min_price=10000000)
    finally:
        db.close()


def start_scheduler():
    global scheduler
    if not HAS_SCHEDULER:
        return
        
    if scheduler is None:
        scheduler = BackgroundScheduler()

        # ── Существующие задачи ──────────────────────────────────────────────
        # Утренний дайджест по тендерам
        scheduler.add_job(send_morning_digest,   'cron',     hour=9,  minute=0,  id='morning_digest',       replace_existing=True)
        # Поиск субподрядных контрактов раз в день
        scheduler.add_job(run_subcontract_search, 'cron',    hour=14, minute=0,  id='subcontract_search',   replace_existing=True)
        # Проверка обновлений документации на площадках раз в час
        scheduler.add_job(check_tender_updates,  'interval', hours=1,            id='check_tender_updates', replace_existing=True)

        # ── Ops Monitor Agent (раздел 10.2) ──────────────────────────────────
        # 1. Cloudflare Tunnel / VPS — каждые 10 минут
        scheduler.add_job(check_tunnel_health,   'interval', minutes=10,         id='ops_tunnel',           replace_existing=True)
        # 2. Ollama (локальный LLM) — каждые 15 минут
        scheduler.add_job(check_ollama_health,   'interval', minutes=15,         id='ops_ollama',           replace_existing=True)
        # 3. Groq API — остаток квоты, раз в час
        scheduler.add_job(check_groq_quota,      'interval', hours=1,            id='ops_groq',             replace_existing=True)
        # 4. api-fns.ru — остаток лимитов, раз в день в 11:00
        scheduler.add_job(check_api_fns_quota,   'cron',     hour=11, minute=0,  id='ops_api_fns',          replace_existing=True)
        # 5. SQLite бэкап — проверка наличия бэкапа сегодня, в 20:00
        scheduler.add_job(check_backup_freshness,'cron',     hour=20, minute=0,  id='ops_backup',           replace_existing=True)
        # 6. Место на диске — раз в день в 09:30
        scheduler.add_job(check_disk_space,      'cron',     hour=9,  minute=30, id='ops_disk',             replace_existing=True)

        scheduler.start()
        logger.info(
            "APScheduler started: "
            "digest(09:00), updates(hourly), subcontracts(14:00) | "
            "OpsMonitor: tunnel(10min), ollama(15min), groq(1h), "
            "api-fns(11:00), backup(20:00), disk(09:30)"
        )

def stop_scheduler():
    global scheduler
    if scheduler:
        scheduler.shutdown()
        logger.info("APScheduler stopped.")
