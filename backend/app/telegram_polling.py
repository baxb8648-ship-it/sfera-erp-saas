import asyncio
import logging
import urllib.request
import json
import socket
import os
from .database import SessionLocal
from .models import CompanySetting
from .api.telegram_webhook import process_telegram_update_sync as process_client_update_sync
from .api.oblakocrm_bot import process_update_sync as process_sfera_update_sync

logger = logging.getLogger("uvicorn.error")

async def run_client_bot_polling():
    """Цикл Long Polling для локального бота клиента (АКЗ и др.)"""
    logger.info("[Client Bot Polling] Loop starting...")
    offset = 0
    last_token = None
    
    while True:
        try:
            db = SessionLocal()
            try:
                token_setting = db.query(CompanySetting).filter(CompanySetting.key == "telegram_bot_token").first()
                token = token_setting.value if token_setting else None
            finally:
                db.close()
                
            if not token:
                await asyncio.sleep(10)
                continue
                
            # Если токен изменился, удаляем вебхук
            if token != last_token:
                logger.info(f"[Client Bot] New Token detected (ending with ...{token[-6:] if len(token) > 6 else token}). Deleting webhook...")
                try:
                    url = f"https://api.telegram.org/bot{token}/deleteWebhook"
                    req = urllib.request.Request(url, data=b"{}", headers={"Content-Type": "application/json"}, method="POST")
                    with urllib.request.urlopen(req, timeout=10) as response:
                        res = json.loads(response.read().decode("utf-8"))
                        logger.info(f"[Client Bot] deleteWebhook result: {res}")
                        last_token = token
                except Exception as e:
                    logger.error(f"[Client Bot] Failed to delete webhook: {e}")
                    await asyncio.sleep(5)
                    continue
            
            # Запрос обновлений
            url = f"https://api.telegram.org/bot{token}/getUpdates?offset={offset}&timeout=10"
            try:
                loop = asyncio.get_running_loop()
                
                def fetch_updates():
                    req = urllib.request.Request(url, method="GET")
                    with urllib.request.urlopen(req, timeout=15) as response:
                        return json.loads(response.read().decode("utf-8"))
                
                res = await loop.run_in_executor(None, fetch_updates)
                
                if res.get("ok"):
                    updates = res.get("result", [])
                    for update in updates:
                        offset = update["update_id"] + 1
                        logger.info(f"[Client Bot] Received update ID {update['update_id']}")
                        process_client_update_sync(update)
            except (socket.timeout, urllib.error.URLError) as e:
                if isinstance(e, urllib.error.URLError) and "timed out" not in str(e).lower():
                    logger.warning(f"[Client Bot] Connection warning: {e}")
                    await asyncio.sleep(5)
            except Exception as e:
                logger.error(f"[Client Bot] Error fetching updates: {e}")
                await asyncio.sleep(5)
                
        except Exception as e:
            logger.error(f"[Client Bot] Error in loop: {e}")
            await asyncio.sleep(5)


async def run_sfera_bot_polling():
    """Цикл Long Polling для глобального СФЕРА-бота (oblakocrmbot)"""
    logger.info("[Sfera Bot Polling] Loop starting...")
    
    # Считываем токен из переменной окружения
    token = os.getenv("OBLAKO_CRM_BOT_TOKEN", "8842262640:AAH7WYTqklaq0wEL-KQw-GxIg2x1FLtXqxI")
    
    if not token:
        logger.warning("[Sfera Bot] OBLAKO_CRM_BOT_TOKEN not found in .env. Polling disabled.")
        return
        
    offset = 0
    webhook_deleted = False
    
    while True:
        try:
            # При первом запуске обязательно удаляем вебхук
            if not webhook_deleted:
                logger.info(f"[Sfera Bot] Deleting webhook to enable Long Polling...")
                try:
                    url = f"https://api.telegram.org/bot{token}/deleteWebhook"
                    req = urllib.request.Request(url, data=b"{}", headers={"Content-Type": "application/json"}, method="POST")
                    with urllib.request.urlopen(req, timeout=10) as response:
                        res = json.loads(response.read().decode("utf-8"))
                        logger.info(f"[Sfera Bot] deleteWebhook result: {res}")
                        webhook_deleted = True
                except Exception as e:
                    logger.error(f"[Sfera Bot] Failed to delete webhook: {e}")
                    await asyncio.sleep(5)
                    continue
            
            # Запрос обновлений
            url = f"https://api.telegram.org/bot{token}/getUpdates?offset={offset}&timeout=10"
            try:
                loop = asyncio.get_running_loop()
                
                def fetch_updates():
                    req = urllib.request.Request(url, method="GET")
                    with urllib.request.urlopen(req, timeout=15) as response:
                        return json.loads(response.read().decode("utf-8"))
                
                res = await loop.run_in_executor(None, fetch_updates)
                
                if res.get("ok"):
                    updates = res.get("result", [])
                    for update in updates:
                        offset = update["update_id"] + 1
                        logger.info(f"[Sfera Bot] Received update ID {update['update_id']}")
                        process_sfera_update_sync(update)
            except (socket.timeout, urllib.error.URLError) as e:
                if isinstance(e, urllib.error.URLError) and "timed out" not in str(e).lower():
                    logger.warning(f"[Sfera Bot] Connection warning: {e}")
                    await asyncio.sleep(5)
            except Exception as e:
                logger.error(f"[Sfera Bot] Error fetching updates: {e}")
                await asyncio.sleep(5)
                
        except Exception as e:
            logger.error(f"[Sfera Bot] Error in loop: {e}")
            await asyncio.sleep(5)


async def run_telegram_polling_loop():
    """Запускает параллельный опрос для обоих ботов"""
    # Ждем 5 секунд после старта uvicorn
    await asyncio.sleep(5)
    await asyncio.gather(
        run_client_bot_polling(),
        run_sfera_bot_polling()
    )
