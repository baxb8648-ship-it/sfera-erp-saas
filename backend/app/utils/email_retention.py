import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from sqlalchemy.orm import Session
from ..models import CompanySetting, Tenant

logger = logging.getLogger("uvicorn.error")

def get_smtp_settings(db: Session):
    """Извлекает настройки SMTP из базы данных CompanySetting"""
    settings = {}
    for key in ["smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_use_ssl", "company_name"]:
        db_setting = db.query(CompanySetting).filter(CompanySetting.key == key).first()
        settings[key] = db_setting.value if db_setting else None
    
    # Defaults
    if not settings["company_name"]:
        settings["company_name"] = "СФЕРА ERP"
    return settings

def send_email(db: Session, to_email: str, subject: str, body_html: str):
    """Базовый метод отправки email"""
    settings = get_smtp_settings(db)
    
    # Если SMTP не настроен, просто логируем (Mock mode)
    if not settings.get("smtp_host") or not settings.get("smtp_user") or not settings.get("smtp_password"):
        logger.info(f"📧 [MOCK EMAIL] To: {to_email} | Subject: {subject}")
        logger.debug(f"Body: {body_html}")
        return True
        
    try:
        msg = MIMEMultipart()
        msg['From'] = settings["smtp_user"]
        msg['To'] = to_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(body_html, 'html', 'utf-8'))
        
        use_ssl = str(settings.get("smtp_use_ssl", "1")) == "1"
        port = int(settings.get("smtp_port", 465))
        host = settings.get("smtp_host")
        
        if use_ssl:
            server = smtplib.SMTP_SSL(host, port, timeout=10)
        else:
            server = smtplib.SMTP(host, port, timeout=10)
            try:
                server.ehlo()
                server.starttls()
                server.ehlo()
            except Exception as e:
                logger.warning(f"STARTTLS failed: {e}")
                
        server.login(settings["smtp_user"], settings["smtp_password"])
        server.send_message(msg)
        server.quit()
        logger.info(f"📧 [EMAIL SENT] To: {to_email} | Subject: {subject}")
        return True
    except Exception as e:
        logger.error(f"❌ [EMAIL FAILED] To: {to_email} | Error: {e}")
        return False

# ==========================================
# RETENTION ПИСЬМА
# ==========================================

def send_welcome_email(db: Session, to_email: str, company_name: str, admin_username: str):
    subject = f"Добро пожаловать в СФЕРА ERP, {company_name}!"
    body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <h2 style="color: #F95700;">Добро пожаловать в СФЕРА ERP!</h2>
        <p>Уважаемый администратор <b>{company_name}</b>,</p>
        <p>Ваша учетная запись (логин: <b>{admin_username}</b>) успешно создана.</p>
        <p>Чтобы получить максимум пользы от платформы, мы рекомендуем выполнить 3 простых шага:</p>
        <ol>
            <li>Пройти стартовую настройку и выбрать нишу</li>
            <li>Пригласить своих коллег по ссылке-приглашению</li>
            <li>Добавить первого клиента в базу</li>
        </ol>
        <p>Ваш пробный период (Trial) активирован и продлится 14 дней.</p>
        <br/>
        <p>С уважением,<br/>Команда СФЕРА ERP</p>
    </body>
    </html>
    """
    return send_email(db, to_email, subject, body)

def send_day7_checkin_email(db: Session, to_email: str, company_name: str):
    subject = f"Прошла неделя с нами! Как успехи, {company_name}?"
    body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <h2 style="color: #4F46E5;">Как продвигается работа?</h2>
        <p>Здравствуйте!</p>
        <p>Вы с нами уже 7 дней. Мы надеемся, что СФЕРА ERP помогает вам автоматизировать бизнес-процессы.</p>
        <p>Знаете ли вы, что у нас есть <b>встроенные ИИ-Агенты</b>? Вы можете поручить ИИ анализировать ваши документы (RAG) или искать тендеры.</p>
        <p><a href="https://сфера-erp.рф/crm/ai-agents" style="background: #4F46E5; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Попробовать ИИ-Агентов</a></p>
        <br/>
        <p>С уважением,<br/>Команда СФЕРА ERP</p>
    </body>
    </html>
    """
    return send_email(db, to_email, subject, body)

def send_trial_ending_alert_email(db: Session, to_email: str, company_name: str, days_left: int):
    subject = f"Ваш пробный период заканчивается через {days_left} дн."
    body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <h2 style="color: #E11D48;">Осталось {days_left} дн. до конца пробного периода</h2>
        <p>Здравствуйте!</p>
        <p>Ваш пробный период для компании <b>{company_name}</b> подходит к концу.</p>
        <p>Чтобы не потерять доступ к данным и продвинутым функциям (ИИ-Агенты, Снабжение, Финансы), пожалуйста, выберите подходящий тариф и произведите оплату в разделе <b>Биллинг</b>.</p>
        <br/>
        <p><a href="https://сфера-erp.рф/crm/admin" style="background: #E11D48; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Перейти к оплате</a></p>
        <br/>
        <p>С уважением,<br/>Команда СФЕРА ERP</p>
    </body>
    </html>
    """
    return send_email(db, to_email, subject, body)
