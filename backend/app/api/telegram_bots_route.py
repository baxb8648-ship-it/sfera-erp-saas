import requests
import os
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from ..database import get_db
from ..models import User, TelegramBot
from .auth import get_current_user

router = APIRouter(prefix="/telegram-bots", tags=["Telegram Bots"])

# В реальности URL бэкенда должен браться из переменных окружения
WEBHOOK_HOST = os.getenv("WEBHOOK_HOST", "https://api.sferum.space/api/v1")

class BotCreate(BaseModel):
    bot_token: str
    bot_name: str
    role: str

class BotOut(BaseModel):
    id: int
    bot_token: str
    bot_name: str
    role: str
    is_active: bool
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[BotOut])
def get_bots(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    bots = db.query(TelegramBot).filter(TelegramBot.tenant_id == current_user.tenant_id).all()
    # Mask tokens for security in UI
    masked_bots = []
    for bot in bots:
        masked = BotOut.model_validate(bot)
        if masked.bot_token and len(masked.bot_token) > 15:
            masked.bot_token = masked.bot_token[:8] + "..." + masked.bot_token[-5:]
        masked_bots.append(masked)
    return masked_bots

@router.post("/", response_model=BotOut)
def add_bot(payload: BotCreate, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Только админ может управлять ботами.")
        
    if payload.role not in ["internal_copilot", "external_sales", "external_support", "internal_pto", "internal_supply", "internal_finance", "internal_legal"]:
        raise HTTPException(status_code=400, detail="Неверная роль бота")
        
    bot_count = db.query(TelegramBot).filter(TelegramBot.tenant_id == current_user.tenant_id).count()
    if bot_count >= 3:
        raise HTTPException(status_code=400, detail="Достигнут лимит: максимум 3 бота на компанию.")
        
    existing = db.query(TelegramBot).filter(TelegramBot.bot_token == payload.bot_token).first()
    if existing:
        raise HTTPException(status_code=400, detail="Этот токен уже используется.")
        
    # Динамический вебхук: добавляем токен в URL, чтобы роутер понял, какому боту пришло сообщение
    webhook_url = f"{WEBHOOK_HOST}/telegram/webhook/{payload.bot_token}"
    tg_url = f"https://api.telegram.org/bot{payload.bot_token}/setWebhook?url={webhook_url}"
    try:
        res = requests.get(tg_url)
        data = res.json()
        if not data.get("ok"):
            raise HTTPException(status_code=400, detail=f"Ошибка Telegram API (webhook): {data.get('description')}")
            
        # Настройка кнопки Menu Button (СФЕРУМ) для бота
        frontend_host = "https://sferum.space"
        if "localhost" in WEBHOOK_HOST or "127.0.0.1" in WEBHOOK_HOST:
            frontend_host = "http://localhost:5173"
            
        menu_url = f"{frontend_host}/#/crm"
        menu_button_url = f"https://api.telegram.org/bot{payload.bot_token}/setChatMenuButton"
        menu_payload = {
            "menu_button": {
                "type": "web_app",
                "text": "СФЕРУМ",
                "web_app": {
                    "url": menu_url
                }
            }
        }
        requests.post(menu_button_url, json=menu_payload, timeout=5)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Не удалось подключиться к Telegram API: {str(e)}")
        
    new_bot = TelegramBot(
        tenant_id=current_user.tenant_id,
        bot_token=payload.bot_token,
        bot_name=payload.bot_name,
        role=payload.role,
        is_active=True
    )
    db.add(new_bot)
    db.commit()
    db.refresh(new_bot)
    return new_bot

@router.delete("/{bot_id}")
def delete_bot(bot_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Только админ может управлять ботами.")
        
    bot = db.query(TelegramBot).filter(TelegramBot.id == bot_id, TelegramBot.tenant_id == current_user.tenant_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Бот не найден")
        
    tg_url = f"https://api.telegram.org/bot{bot.bot_token}/deleteWebhook"
    try:
        requests.get(tg_url)
    except:
        pass
        
    db.delete(bot)
    db.commit()
    return {"status": "ok"}
