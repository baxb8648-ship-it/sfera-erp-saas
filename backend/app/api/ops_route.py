"""
ops_route.py — REST-эндпоинты для ручного тестирования Ops Monitor Agent.

GET /ops/test          — запустить все 6 проверок немедленно
GET /ops/test/tunnel   — только проверка туннеля
GET /ops/test/ollama   — только Ollama
GET /ops/test/groq     — только Groq-квота
GET /ops/test/api-fns  — только api-fns.ru
GET /ops/test/backup   — только бэкап
GET /ops/test/disk     — только диск

Доступно только для залогиненных пользователей.
Для теста алертов: установите ops_monitor_chat_id в Admin Settings,
затем вызовите /ops/test — алерты придут в личный чат.
"""

import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import SessionLocal, get_db
from ..ops_monitor import (
    check_tunnel_health,
    check_ollama_health,
    check_groq_quota,
    check_api_fns_quota,
    check_backup_freshness,
    check_disk_space,
)

logger = logging.getLogger("uvicorn.error")
router = APIRouter(prefix="/ops", tags=["Ops Monitor"])


def _run_check(name: str, fn):
    """Запускает одну проверку и возвращает результат с обработкой ошибок."""
    try:
        fn()
        return {"check": name, "status": "ran", "note": "Смотрите логи uvicorn и Telegram"}
    except Exception as e:
        logger.error(f"[OpsRoute] Ошибка при запуске {name}: {e}")
        return {"check": name, "status": "error", "error": str(e)}


@router.get("/test")
def test_all_checks():
    """Запустить все 6 проверок Ops Monitor немедленно."""
    results = [
        _run_check("tunnel",  check_tunnel_health),
        _run_check("ollama",  check_ollama_health),
        _run_check("groq",    check_groq_quota),
        _run_check("api-fns", check_api_fns_quota),
        _run_check("backup",  check_backup_freshness),
        _run_check("disk",    check_disk_space),
    ]
    return {
        "message": "Все проверки запущены. Смотрите логи uvicorn и Telegram (если ops_monitor_chat_id настроен).",
        "results": results,
    }


@router.get("/test/tunnel")
def test_tunnel():
    """Проверка доступности Cloudflare Tunnel / VPS."""
    return _run_check("tunnel", check_tunnel_health)


@router.get("/test/ollama")
def test_ollama():
    """Проверка доступности локального Ollama LLM."""
    return _run_check("ollama", check_ollama_health)


@router.get("/test/groq")
def test_groq():
    """Проверка остатка квоты Groq API (Whisper STT)."""
    return _run_check("groq", check_groq_quota)


@router.get("/test/api-fns")
def test_api_fns():
    """Проверка остатка лимитов api-fns.ru (ОКВЭД-парсер)."""
    return _run_check("api-fns", check_api_fns_quota)


@router.get("/test/backup")
def test_backup():
    """Проверка наличия сегодняшнего SQLite-бэкапа."""
    return _run_check("backup", check_backup_freshness)


@router.get("/test/disk")
def test_disk():
    """Проверка свободного места на диске."""
    return _run_check("disk", check_disk_space)
