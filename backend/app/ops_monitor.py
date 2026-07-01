"""
ops_monitor.py — Ops Monitor Agent (раздел 10.2 архитектурного документа)

Назначение: автоматические проверки здоровья инфраструктуры с алертами в Telegram.
Не требует LangGraph, PostgreSQL или векторной БД — только APScheduler,
который уже используется в scheduler.py.

Проверки:
  1. Cloudflare Tunnel / VPS — доступность API
  2. Ollama — локальный LLM-сервис
  3. Groq API — остаток квоты (Whisper STT)
  4. api-fns.ru — остаток лимитов (парсер лидов)
  5. SQLite бэкап — создан ли бэкап сегодня
  6. Диск — свободное место

Регистрация заданий — в scheduler.py, функция start_scheduler().
"""

import os
import logging
import shutil
import urllib.request
import urllib.error
import json
from datetime import date
from sqlalchemy.orm import Session

from .database import SessionLocal
from .models import CompanySetting

logger = logging.getLogger("uvicorn.error")

# ─────────────────────────────────────────────────────────────────────────────
# Конфигурация
# ─────────────────────────────────────────────────────────────────────────────

# Punycode-адрес API-туннеля (кириллические домены нельзя в urllib)
TUNNEL_API_URL = "https://api.xn--56-6kctpmeri.xn--p1ai/"

OLLAMA_URL = "http://localhost:11434/api/tags"

GROQ_MODELS_URL = "https://api.groq.com/openai/v1/models"
GROQ_LOW_THRESHOLD = 50        # алерт если остаток запросов/день < 50

# Ключ api-fns.ru: сначала ищем в CompanySetting (ключ "api_fns_key"),
# иначе fallback на значение из session_context.json (пока не перенесён в БД)
API_FNS_FALLBACK_KEY = "216875492cb989d65bc93071c4d0fcd6288a18ba"
API_FNS_LOW_THRESHOLD = 15     # алерт если по любому методу остаток < 15

DISK_LOW_GB = 5.0              # алерт если свободно < 5 GB


# ─────────────────────────────────────────────────────────────────────────────
# Вспомогательные функции
# ─────────────────────────────────────────────────────────────────────────────

def _get_telegram_credentials(db: Session) -> tuple[str | None, str | None]:
    """
    Читает токен бота и целевой chat_id для алертов мониторинга.

    Приоритет:
      1. CompanySetting ключ 'ops_monitor_chat_id' —
         личный chat_id админа (настраивается в Admin Settings → Telegram).
         Системные алерты НЕ должны идти в общую рабочую группу.
      2. Если ключ не задан — алерт пишется только в лог, Telegram не используется.
         НАСТРОЙКА: Admin Settings → Telegram → поле 'ops_monitor_chat_id'
         (ваш личный chat_id — узнать: напишите /start боту, или спросите у @userinfobot)
    """
    token_row = db.query(CompanySetting).filter(CompanySetting.key == "telegram_bot_token").first()
    token = token_row.value if token_row and token_row.value else None

    # Отдельный ключ для алертов мониторинга — личный чат админа
    ops_chat_row = db.query(CompanySetting).filter(CompanySetting.key == "ops_monitor_chat_id").first()
    chat_id = ops_chat_row.value if ops_chat_row and ops_chat_row.value else None

    if not chat_id:
        logger.warning(
            "[OpsMonitor] Ключ 'ops_monitor_chat_id' не настроен. "
            "Алерт не будет отправлен в Telegram. "
            "Настройте: Admin Settings → Telegram → поле 'ops_monitor_chat_id'."
        )

    return token, chat_id


def _send_alert(token: str | None, chat_id: str | None, text: str) -> None:
    """Отправляет HTML-сообщение в Telegram. Если токена нет — пишет в лог."""
    if not token or not chat_id:
        logger.warning(f"[OpsMonitor] Telegram не настроен. Алерт: {text}")
        return
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=8):
            pass
    except Exception as exc:
        logger.error(f"[OpsMonitor] Ошибка отправки алерта в Telegram: {exc}")


# ─────────────────────────────────────────────────────────────────────────────
# Состояние алертов (флаги "алерт уже послан, не спамим")
# ─────────────────────────────────────────────────────────────────────────────

_tunnel_alerted = False
_ollama_alerted = False


# ─────────────────────────────────────────────────────────────────────────────
# Проверка 1: Cloudflare Tunnel → VPS → FastAPI
# ─────────────────────────────────────────────────────────────────────────────

def check_tunnel_health() -> None:
    """
    GET к корню API-домена. Если timeout или !200 — алерт.
    При восстановлении шлёт сообщение «туннель ожил».
    Периодичность: каждые 10 минут (задаётся в scheduler.py).
    """
    global _tunnel_alerted
    db = SessionLocal()
    try:
        token, chat_id = _get_telegram_credentials(db)
        ok = False
        try:
            req = urllib.request.Request(
                TUNNEL_API_URL, headers={"User-Agent": "OpsMonitor/1.0"}
            )
            with urllib.request.urlopen(req, timeout=8) as resp:
                ok = resp.status == 200
        except Exception:
            ok = False

        if ok:
            if _tunnel_alerted:
                _tunnel_alerted = False
                _send_alert(
                    token, chat_id,
                    "✅ <b>Ops Monitor:</b> Туннель восстановлен — API снова доступен."
                )
            logger.info("[OpsMonitor] Tunnel ✅ OK")
        else:
            if not _tunnel_alerted:
                _tunnel_alerted = True
                _send_alert(
                    token, chat_id,
                    f"🔴 <b>Ops Monitor: туннель недоступен!</b>\n\n"
                    f"<code>{TUNNEL_API_URL}</code> не отвечает.\n\n"
                    f"<b>Что проверить:</b>\n"
                    f"• cloudflared.exe запущен?\n"
                    f"• VPS Timeweb отвечает?\n"
                    f"• Uvicorn (FastAPI) запущен на порту 8000?"
                )
            logger.error("[OpsMonitor] Tunnel 🔴 DOWN")
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────────────────────
# Проверка 2: Ollama (локальный LLM)
# ─────────────────────────────────────────────────────────────────────────────

def check_ollama_health() -> None:
    """
    GET /api/tags к Ollama. Выводит список загруженных моделей.
    При сбое — алерт; при восстановлении — подтверждение с моделями.
    Периодичность: каждые 15 минут.
    """
    global _ollama_alerted
    db = SessionLocal()
    try:
        token, chat_id = _get_telegram_credentials(db)
        ok = False
        models_str = ""
        try:
            req = urllib.request.Request(
                OLLAMA_URL, headers={"User-Agent": "OpsMonitor/1.0"}
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    models = [m.get("name", "?") for m in data.get("models", [])]
                    models_str = ", ".join(models) if models else "нет моделей"
                    ok = True
        except Exception:
            ok = False

        if ok:
            if _ollama_alerted:
                _ollama_alerted = False
                _send_alert(
                    token, chat_id,
                    f"✅ <b>Ops Monitor:</b> Ollama восстановлен.\n"
                    f"Модели: <code>{models_str}</code>"
                )
            logger.info(f"[OpsMonitor] Ollama ✅ OK. Модели: {models_str}")
        else:
            if not _ollama_alerted:
                _ollama_alerted = True
                _send_alert(
                    token, chat_id,
                    "🟡 <b>Ops Monitor: Ollama недоступен!</b>\n\n"
                    "<code>http://localhost:11434</code> не отвечает.\n\n"
                    "Голосовой пайплайн и AI-копилот в чате не работают.\n"
                    "<i>Запустите в терминале: <code>ollama serve</code></i>"
                )
            logger.error("[OpsMonitor] Ollama 🟡 DOWN")
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────────────────────
# Проверка 3: Groq API — остаток квоты
# ─────────────────────────────────────────────────────────────────────────────

def check_groq_quota() -> None:
    """
    Проверяем остаток квоты Groq API через минимальный chat completion-запрос.
    Именно на completion-запросах Groq возвращает заголовки x-ratelimit-*
    (на GET /models они не возвращаются).
    Алерт если остаток запросов < GROQ_LOW_THRESHOLD или HTTP 429.
    Периодичность: раз в час.
    """
    groq_key = os.getenv("GROQ_API_KEY", "")
    if not groq_key:
        logger.warning("[OpsMonitor] GROQ_API_KEY не задан, пропускаем проверку квоты.")
        return

    db = SessionLocal()
    try:
        token, chat_id = _get_telegram_credentials(db)
        try:
            # Минимальный chat completion — только на нём Groq возвращает rate-limit заголовки
            payload = json.dumps({
                "model": "llama-3.1-8b-instant",
                "messages": [{"role": "user", "content": "1"}],
                "max_tokens": 1,
            }).encode("utf-8")
            req = urllib.request.Request(
                "https://api.groq.com/openai/v1/chat/completions",
                data=payload,
                headers={
                    "Authorization": f"Bearer {groq_key}",
                    "Content-Type": "application/json",
                    "User-Agent": "OpsMonitor/1.0",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                remaining = resp.headers.get("x-ratelimit-remaining-requests")
                limit     = resp.headers.get("x-ratelimit-limit-requests")
                reset_in  = resp.headers.get("x-ratelimit-reset-requests")

                # Если заголовки всё же не вернулись — по крайней мере ключ работает
                if remaining is None:
                    logger.info("[OpsMonitor] Groq ✅ ключ валиден, rate-limit заголовки не вернулись (норма для некоторых моделей)")
                    return

                logger.info(
                    f"[OpsMonitor] Groq quota ✅: {remaining}/{limit}, сброс через {reset_in}"
                )

                if int(remaining) < GROQ_LOW_THRESHOLD:
                    _send_alert(
                        token, chat_id,
                        f"⚠️ <b>Ops Monitor: Groq API — остаток квоты мал!</b>\n\n"
                        f"Осталось запросов: <b>{remaining}</b> из {limit}\n"
                        f"Сброс через: {reset_in}\n\n"
                        f"<i>Whisper STT (голосовые сообщения) может перестать работать.</i>"
                    )

        except urllib.error.HTTPError as exc:
            if exc.code == 429:
                _send_alert(
                    token, chat_id,
                    "🔴 <b>Ops Monitor: Groq API — лимит исчерпан (429)!</b>\n\n"
                    "Голосовые сообщения не распознаются до сброса квоты.\n"
                    "Проверьте: <a href='https://console.groq.com'>console.groq.com</a>"
                )
            else:
                logger.error(f"[OpsMonitor] Groq HTTP {exc.code}: {exc}")
        except Exception as exc:
            logger.error(f"[OpsMonitor] Ошибка проверки Groq: {exc}")
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────────────────────
# Проверка 4: api-fns.ru — остаток лимитов
# ─────────────────────────────────────────────────────────────────────────────

def check_api_fns_quota() -> None:
    """
    GET /api/stat к api-fns.ru. Смотрим остаток по каждому методу.
    Алерт если любой метод опустился ниже API_FNS_LOW_THRESHOLD.
    Алерт если 403 — ключ заблокирован (нужно поменять IP в ЛК api-fns.ru).
    Периодичность: раз в сутки в 11:00.
    """
    db = SessionLocal()
    try:
        token, chat_id = _get_telegram_credentials(db)

        # Ключ — сначала из БД (если перенесли), иначе fallback
        key_row = db.query(CompanySetting).filter(CompanySetting.key == "api_fns_key").first()
        key = (key_row.value if key_row and key_row.value else None) or API_FNS_FALLBACK_KEY

        if not key:
            logger.warning("[OpsMonitor] api-fns ключ не найден, пропускаем.")
            return

        try:
            url = f"https://api-fns.ru/api/stat?key={key}"
            req = urllib.request.Request(url, headers={"User-Agent": "OpsMonitor/1.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data  = json.loads(resp.read().decode("utf-8"))
                items = data.get("Items", [])

                low_lines = []
                summary   = []
                for item in items:
                    method    = item.get("Метод", "?")
                    limit     = item.get("Лимит", 0)
                    used      = item.get("Использовано", 0)
                    remaining = limit - used
                    summary.append(f"{method}: {remaining}/{limit}")
                    if remaining < API_FNS_LOW_THRESHOLD:
                        low_lines.append(
                            f"  • <b>{method}</b>: осталось {remaining} из {limit}"
                        )

                logger.info(f"[OpsMonitor] api-fns quota: {', '.join(summary)}")

                if low_lines:
                    _send_alert(
                        token, chat_id,
                        "⚠️ <b>Ops Monitor: api-fns.ru — заканчиваются лимиты!</b>\n\n"
                        + "\n".join(low_lines)
                        + "\n\n<i>Парсер базы лидов (ОКВЭД) может перестать работать.</i>"
                    )

        except urllib.error.HTTPError as exc:
            if exc.code == 403:
                _send_alert(
                    token, chat_id,
                    "🔴 <b>Ops Monitor: api-fns.ru — доступ заблокирован (403 Forbidden)!</b>\n\n"
                    "Ключ <code>api_fns_key</code> не работает с текущего IP.\n\n"
                    "<b>Что сделать:</b>\n"
                    "• Зайдите в ЛК <a href='https://api-fns.ru'>api-fns.ru</a>\n"
                    "• Раздел ‘Тарифы’ → поменяйте IP на текущий\n"
                    "• Или перейдите на платный тариф"
                )
                logger.error("[OpsMonitor] api-fns 🔴 403 Forbidden — IP не авторизован")
            else:
                logger.error(f"[OpsMonitor] api-fns HTTP {exc.code}: {exc}")
        except Exception as exc:
            logger.error(f"[OpsMonitor] Ошибка проверки api-fns: {exc}")
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────────────────────
# Проверка 5: актуальность SQLite-бэкапа
# ─────────────────────────────────────────────────────────────────────────────

def check_backup_freshness() -> None:
    """
    Проверяет наличие файла backup_{YYYY-MM-DD}.db в папке backend/backups/.
    Алерт если бэкап сегодняшнего дня ещё не создан (например, бэкенд не запускался).
    Периодичность: в 20:00 (за 4ч до полуночи — есть запас, если запустили поздно).
    """
    db = SessionLocal()
    try:
        token, chat_id = _get_telegram_credentials(db)

        # Путь: два уровня вверх от app/ → backend/
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        backup_dir  = os.path.join(backend_dir, "backups")
        today_str   = date.today().strftime("%Y-%m-%d")
        backup_path = os.path.join(backup_dir, f"backup_{today_str}.db")

        if not os.path.exists(backup_path):
            _send_alert(
                token, chat_id,
                f"🟡 <b>Ops Monitor: бэкап не создан!</b>\n\n"
                f"Ожидаемый файл: <code>backup_{today_str}.db</code> — не найден.\n\n"
                f"<b>Причины:</b>\n"
                f"• Бэкенд был перезапущен и scheduled_backup_loop ещё не отработал\n"
                f"• Ошибка в perform_db_backup() — смотрите логи uvicorn"
            )
            logger.warning(f"[OpsMonitor] Бэкап на {today_str} 🟡 НЕ НАЙДЕН")
        else:
            size_kb = os.path.getsize(backup_path) // 1024
            logger.info(f"[OpsMonitor] Бэкап ✅ OK: backup_{today_str}.db ({size_kb} KB)")
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────────────────────
# Проверка 6: свободное место на диске
# ─────────────────────────────────────────────────────────────────────────────

def check_disk_space() -> None:
    """
    Смотрит свободное место на диске, где живёт бэкенд.
    Алерт если свободно < DISK_LOW_GB (5 GB).
    Периодичность: раз в сутки в 09:30.
    """
    db = SessionLocal()
    try:
        token, chat_id = _get_telegram_credentials(db)
        try:
            usage    = shutil.disk_usage(".")
            free_gb  = usage.free  / (1024 ** 3)
            total_gb = usage.total / (1024 ** 3)
            used_pct = (usage.used / usage.total) * 100

            logger.info(
                f"[OpsMonitor] Диск: {free_gb:.1f} GB свободно / "
                f"{total_gb:.1f} GB всего ({used_pct:.0f}% занято)"
            )

            if free_gb < DISK_LOW_GB:
                _send_alert(
                    token, chat_id,
                    f"🔴 <b>Ops Monitor: мало места на диске!</b>\n\n"
                    f"Свободно: <b>{free_gb:.1f} GB</b> из {total_gb:.1f} GB "
                    f"({used_pct:.0f}% занято)\n\n"
                    f"<i>SQLite WAL-файлы и бэкапы могут перестать писаться.\n"
                    f"Рассмотрите очистку папки backups/ от старых копий.</i>"
                )
        except Exception as exc:
            logger.error(f"[OpsMonitor] Ошибка проверки диска: {exc}")
    finally:
        db.close()
