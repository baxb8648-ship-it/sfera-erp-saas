"""
voice_service.py — Сервис распознавания голосовых сообщений из Telegram.

Поток работы:
  1. Получаем file_id голосового сообщения от Telegram.
  2. Запрашиваем у Telegram Bot API путь к файлу (getFile).
  3. Скачиваем .ogg-файл в оперативную память (BytesIO).
  4. Отправляем файл на Groq Whisper API и получаем транскрипт.
  5. Возвращаем строку с текстом.

Требование:
  В файле backend/.env должна быть переменная GROQ_API_KEY=gsk_...
  Её можно получить бесплатно на https://console.groq.com
"""

import os
import io
import json
import logging
import urllib.request
import urllib.parse
import urllib.error

logger = logging.getLogger("uvicorn.error")


def get_groq_api_key() -> str | None:
    """Читает GROQ_API_KEY из переменных окружения."""
    return os.environ.get("GROQ_API_KEY") or os.environ.get("OPENAI_API_KEY")


def download_voice_file(bot_token: str, file_id: str) -> bytes | None:
    """
    Загружает голосовой файл (.ogg) с серверов Telegram в память.
    Возвращает байты файла или None при ошибке.
    """
    try:
        # 1. Получаем путь к файлу через getFile
        get_file_url = f"https://api.telegram.org/bot{bot_token}/getFile?file_id={file_id}"
        req = urllib.request.Request(get_file_url, headers={"User-Agent": "TelegramBot/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode("utf-8"))

        if not result.get("ok"):
            logger.error(f"Telegram getFile failed: {result}")
            return None

        file_path = result["result"]["file_path"]

        # 2. Скачиваем файл по полному URL
        download_url = f"https://api.telegram.org/file/bot{bot_token}/{file_path}"
        req = urllib.request.Request(download_url, headers={"User-Agent": "TelegramBot/1.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            audio_bytes = resp.read()

        logger.info(f"Downloaded voice file: {file_path} ({len(audio_bytes)} bytes)")
        return audio_bytes

    except Exception as e:
        logger.error(f"Error downloading voice file (file_id={file_id}): {e}")
        return None


def transcribe_audio_groq(audio_bytes: bytes, filename: str = "voice.ogg") -> str | None:
    """
    Отправляет аудиофайл на Groq Whisper API и возвращает транскрипт.
    Groq принимает .ogg напрямую (ffmpeg не нужен).
    """
    api_key = get_groq_api_key()
    if not api_key:
        logger.error("GROQ_API_KEY не найден в переменных окружения. Добавьте его в backend/.env")
        return None

    url = "https://api.groq.com/openai/v1/audio/transcriptions"

    # Формируем multipart/form-data вручную (без сторонних библиотек)
    boundary = "----GrokWhisperBoundary1234567890"

    body_parts = []
    # Поле model
    body_parts.append(
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"model\"\r\n\r\nwhisper-large-v3-turbo"
    )
    # Поле language (русский для лучшего качества)
    body_parts.append(
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"language\"\r\n\r\nru"
    )
    # Поле response_format
    body_parts.append(
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"response_format\"\r\n\r\nverbose_json"
    )

    body_bytes = "\r\n".join(body_parts).encode("utf-8")
    # Добавляем бинарный файл
    file_header = (
        f"\r\n--{boundary}\r\n"
        f"Content-Disposition: form-data; name=\"file\"; filename=\"{filename}\"\r\n"
        f"Content-Type: audio/ogg\r\n\r\n"
    ).encode("utf-8")
    body_bytes = body_bytes + file_header + audio_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "User-Agent": "OpenAI/Python/1.0",
    }

    try:
        req = urllib.request.Request(url, data=body_bytes, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            transcript = result.get("text", "").strip()
            logger.info(f"Groq Whisper transcription ({len(transcript)} chars): {transcript[:100]}...")
            return transcript
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="replace")
        logger.error(f"Groq Whisper HTTP error {e.code}: {error_body}")
        return None
    except Exception as e:
        logger.error(f"Groq Whisper transcription error: {e}")
        return None


def transcribe_voice_message(bot_token: str, file_id: str) -> str | None:
    """
    Основная функция: скачивает голосовое сообщение из Telegram и возвращает текст.
    
    Args:
        bot_token: Telegram Bot API токен
        file_id: Telegram file_id голосового сообщения
    
    Returns:
        Транскрипт в виде строки или None при ошибке
    """
    audio_bytes = download_voice_file(bot_token, file_id)
    if not audio_bytes:
        return None
    return transcribe_audio_groq(audio_bytes)
