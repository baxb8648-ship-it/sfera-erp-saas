import urllib.request
import urllib.parse
import json
import logging
from sqlalchemy.orm import Session
from .models import CompanySetting

logger = logging.getLogger("uvicorn.error")

def send_telegram_notification(text: str, db: Session, reply_markup: dict = None):
    token_setting = db.query(CompanySetting).filter(CompanySetting.key == "telegram_bot_token").first()
    channel_setting = db.query(CompanySetting).filter(CompanySetting.key == "telegram_channel_id").first()
    
    token = token_setting.value if token_setting else None
    chat_id = channel_setting.value if channel_setting else None
    
    if not token or not chat_id or token.strip() == "" or chat_id.strip() == "":
        logger.info(f"[Telegram Mock Log] {text}")
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
            res = response.read().decode("utf-8")
            logger.info(f"Telegram notification sent successfully: {res}")
    except Exception as e:
        logger.error(f"Failed to send Telegram notification: {e}")

def send_personal_telegram_notification(user_id: int, text: str, db: Session, fallback_to_general: bool = True):
    from .models import User
    
    # 1. Fetch token
    token_setting = db.query(CompanySetting).filter(CompanySetting.key == "telegram_bot_token").first()
    token = token_setting.value if token_setting else None
    
    if not token or token.strip() == "":
        logger.info(f"[Telegram Personal Mock Log] User ID {user_id} - {text}")
        return
        
    # 2. Fetch user's chat_id
    user = db.query(User).filter(User.id == user_id).first()
    chat_id = user.telegram_chat_id if user else None
    
    # Fallback to main channel if user doesn't have a chat_id
    if not chat_id or chat_id.strip() == "":
        if fallback_to_general:
            logger.info(f"User {user_id} has no telegram_chat_id, falling back to main channel.")
            send_telegram_notification(text, db)
        else:
            logger.info(f"User {user_id} has no telegram_chat_id, fallback to general channel is disabled.")
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
            res = response.read().decode("utf-8")
            logger.info(f"Personal Telegram notification sent to user {user_id} successfully: {res}")
    except Exception as e:
        logger.error(f"Failed to send personal Telegram notification to user {user_id}: {e}")
        if fallback_to_general:
            # Try falling back to main channel
            send_telegram_notification(text, db)

