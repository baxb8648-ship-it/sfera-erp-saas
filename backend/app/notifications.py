import urllib.request
import urllib.parse
import json
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from .models import TelegramBot, Tender, User

logger = logging.getLogger("uvicorn.error")

def send_telegram_notification(text: str, db: Session, reply_markup: dict = None):
    from .models import CompanySetting, TelegramBot
    bot = db.query(TelegramBot).filter(TelegramBot.role == "internal_copilot").first()
    channel_setting = db.query(CompanySetting).filter(CompanySetting.key == "telegram_channel_id").first()
    
    token = bot.bot_token if bot else None
    chat_id = channel_setting.value if channel_setting else None
    
    if not token or not chat_id or token.strip() == "" or chat_id.strip() == "":
        logger.info(f"[Telegram Notification Bypass] {text}")
        return
        
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML"
    }
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
        with urllib.request.urlopen(req, timeout=5) as response:
            logger.info(f"Telegram notification sent successfully")
    except Exception as e:
        logger.error(f"Failed to send Telegram notification: {e}")

def send_personal_telegram_notification(user_id: int, text: str, db: Session, fallback_to_general: bool = True):
    from .models import CompanySetting, TelegramBot
    bot = db.query(TelegramBot).filter(TelegramBot.role == "internal_copilot").first()
    token = bot.bot_token if bot else None
    
    if not token or token.strip() == "":
        logger.info(f"[Telegram Personal Bypass] User ID {user_id} - {text}")
        return
        
    user = db.query(User).filter(User.id == user_id).first()
    chat_id = user.telegram_chat_id if user else None
    
    if not chat_id or chat_id.strip() == "":
        if fallback_to_general:
            send_telegram_notification(text, db)
        return
        
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
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
        with urllib.request.urlopen(req, timeout=5) as response:
            logger.info(f"Personal Telegram notification sent to user {user_id} successfully")
    except Exception as e:
        logger.error(f"Failed to send personal Telegram notification to user {user_id}: {e}")
        if fallback_to_general:
            send_telegram_notification(text, db)

def send_email_notification(recipient_email: str, subject: str, body: str, db: Session):
    settings = {}
    for key in ["smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_use_ssl"]:
        db_setting = db.query(CompanySetting).filter(CompanySetting.key == key).first()
        settings[key] = db_setting.value if db_setting else None
        
    if not settings.get("smtp_host") or not settings.get("smtp_user") or not settings.get("smtp_password"):
        logger.warning("SMTP settings not configured. Skipping email notification.")
        return

    try:
        msg = MIMEMultipart()
        msg['From'] = settings["smtp_user"]
        msg['To'] = recipient_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain', 'utf-8'))
        
        use_ssl = int(settings.get("smtp_use_ssl", 1) or 1)
        host = settings["smtp_host"]
        port = int(settings.get("smtp_port", 465) or 465)
        
        if use_ssl == 1:
            server = smtplib.SMTP_SSL(host, port, timeout=10)
        else:
            server = smtplib.SMTP(host, port, timeout=10)
            
        server.login(settings["smtp_user"], settings["smtp_password"])
        server.sendmail(settings["smtp_user"], [recipient_email], msg.as_string())
        server.quit()
        logger.info(f"Email notification sent successfully to {recipient_email}")
    except Exception as e:
        logger.error(f"Failed to send Email notification: {e}")

def check_tender_deadlines(db: Session):
    logger.info("Scanning database for upcoming tender deadlines...")
    now = datetime.utcnow()
    three_days_later = now + timedelta(days=3)
    one_day_later = now + timedelta(days=1)
    
    # Check tenders in active states: Анализ, Участие, Заявка подана
    active_tenders = db.query(Tender).filter(
        Tender.status.in_(["Анализ", "Участие", "Заявка подана"]),
        Tender.submission_deadline != None,
        Tender.submission_deadline > now
    ).all()
    
    for tender in active_tenders:
        deadline = tender.submission_deadline
        time_to_deadline = deadline - now
        
        # 1. Check for 1-day warning
        if time_to_deadline <= timedelta(days=1) and not tender.notified_1_day:
            days_str = "<b>1 день</b>"
            subject = f"⚠️ Дедлайн тендера через 1 день: {tender.title}"
            body_text = (
                f"⚠️ <b>Внимание! До окончания подачи заявки остался 1 день!</b>\n\n"
                f"📋 <b>Тендер:</b> {tender.title}\n"
                f"🔢 <b>Номер:</b> {tender.tender_number}\n"
                f"💰 <b>Сумма:</b> {tender.price:,.2f} {tender.currency}\n"
                f"📅 <b>Дедлайн:</b> {deadline.strftime('%d.%m.%Y %H:%M')} (UTC)\n"
                f"🔗 <b>Ссылка:</b> {tender.link or 'Отсутствует'}"
            )
            # Send Telegram alerts
            if tender.assigned_user_id:
                send_personal_telegram_notification(tender.assigned_user_id, body_text, db)
                # If assignee has SMTP email, send email
                assignee = db.query(User).filter(User.id == tender.assigned_user_id).first()
                if assignee and assignee.smtp_user and assignee.smtp_user.strip() != "":
                    send_email_notification(assignee.smtp_user, subject, body_text.replace("<b>", "").replace("</b>", ""), db)
            else:
                send_telegram_notification(body_text, db)
                
            tender.notified_1_day = 1
            # Mark 3-day notification as sent as well if it hasn't been done
            tender.notified_3_days = 1
            db.commit()
            
        # 2. Check for 3-day warning
        elif time_to_deadline <= timedelta(days=3) and not tender.notified_3_days:
            subject = f"🔔 Дедлайн тендера через 3 дня: {tender.title}"
            body_text = (
                f"🔔 <b>Напоминание: До окончания подачи заявки осталось 3 дня!</b>\n\n"
                f"📋 <b>Тендер:</b> {tender.title}\n"
                f"🔢 <b>Номер:</b> {tender.tender_number}\n"
                f"💰 <b>Сумма:</b> {tender.price:,.2f} {tender.currency}\n"
                f"📅 <b>Дедлайн:</b> {deadline.strftime('%d.%m.%Y %H:%M')} (UTC)\n"
                f"🔗 <b>Ссылка:</b> {tender.link or 'Отсутствует'}"
            )
            # Send Telegram alerts
            if tender.assigned_user_id:
                send_personal_telegram_notification(tender.assigned_user_id, body_text, db)
                assignee = db.query(User).filter(User.id == tender.assigned_user_id).first()
                if assignee and assignee.smtp_user and assignee.smtp_user.strip() != "":
                    send_email_notification(assignee.smtp_user, subject, body_text.replace("<b>", "").replace("</b>", ""), db)
            else:
                send_telegram_notification(body_text, db)
                
            tender.notified_3_days = 1
            db.commit()



def send_booking_notification(appointment, db, action="new"):
    from .models import User, BookingService
    service = db.query(BookingService).filter(BookingService.id == appointment.service_id).first()
    master = db.query(User).filter(User.id == appointment.master_id).first()
    
    service_name = service.name if service else "Услуга"
    master_name = master.username if master else "Не назначен"
    
    if action == "new":
        text = (
            f"📅 <b>Новая запись!</b>\n\n"
            f"👤 <b>Клиент:</b> {appointment.client_name} ({appointment.client_phone or 'Не указан'})\n"
            f"🛠 <b>Услуга:</b> {service_name}\n"
            f"🕒 <b>Время:</b> {appointment.datetime_start.strftime('%d.%m.%Y %H:%M')}\n"
            f"👨‍🔧 <b>Мастер:</b> {master_name}"
        )
    elif action == "completed":
        text = (
            f"✅ <b>Запись завершена!</b>\n\n"
            f"👤 <b>Клиент:</b> {appointment.client_name}\n"
            f"🛠 <b>Услуга:</b> {service_name}\n"
            f"👨‍🔧 <b>Мастер:</b> {master_name}\n"
            f"📦 <i>ТМЦ списаны со склада согласно техкарте.</i>"
        )
    else:
        text = f"ℹ️ <b>Изменение записи ({action})</b>\nКлиент: {appointment.client_name}\nУслуга: {service_name}"
        
    if master:
        send_personal_telegram_notification(master.id, text, db, fallback_to_general=False)
        
    send_telegram_notification(text, db)
