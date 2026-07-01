import urllib.request
import json
import logging

logger = logging.getLogger("uvicorn.error")

# Адрес локального сервера Ollama по умолчанию
OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
# Модель, отлично понимающая русский (Qwen2 7B или Llama3)
MODEL_NAME = "qwen2:7b" 

def ask_ollama(prompt: str) -> str:
    """
    Отправляет запрос к локальной нейросети через Ollama.
    Если Ollama выключена или не установлена, возвращает пустую строку (failsafe).
    """
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False,
        "temperature": 0.1 # Низкая температура для логических задач (чтобы не фантазировала)
    }
    
    try:
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            OLLAMA_URL,
            data=data,
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=180) as response:
            result = json.loads(response.read().decode('utf-8'))
            return result.get('response', '').strip()
    except Exception as e:
        logger.error(f"Ollama AI Error (maybe not running): {e}")
        return ""

def ai_filter_tender(title: str, description: str) -> bool:
    """
    Пункт 5: Умный фильтр. Возвращает True, если тендер нам подходит, и False если это мусор (например, поставка материалов).
    """
    prompt = f"""Ты — строгий эксперт по государственным закупкам.
    Твоя задача: определить, относится ли этот тендер к ВЫПОЛНЕНИЮ РАБОТ (или оказанию услуг) по антикоррозийной защите, огнезащите, пескоструйной очистке или покраске.
    Если это поставка/закупка материалов (краски, огнезащиты), или это не относится к профилю — ответь ровно одним словом: НЕТ.
    Если это профильные работы — ответь ровно одним словом: ДА.
    
    Название тендера: {title}
    Описание/ТЗ: {description[:2000]}
    
    Твой ответ (только ДА или НЕТ):"""
    
    response = ask_ollama(prompt).strip().upper()
    if not response:
        # Failsafe: если AI выключен, пропускаем тендер, чтобы не сломать систему
        return True
        
    return "ДА" in response or "DA" in response

def ai_summarize_tender(text: str) -> str:
    """
    Пункт 3: Саммаризация документации.
    Выдает 2-3 коротких предложения с выжимкой требований из "каши" сырого текста ТЗ.
    """
    if not text or len(text) < 50:
        return ""
        
    prompt = f"""Сделай очень краткую выжимку (максимум 3 предложения) самых важных технических требований из этого текста технического задания. Укажи только объемы работ, материалы и ключевые требования.
    Не пиши вводных слов, пиши сразу по факту.
    
    Текст:
    {text[:4000]}
    
    Выжимка:"""
    
    response = ask_ollama(prompt)
    return response

def ai_extract_task_entities(text: str) -> dict:
    """
    Фаза 1 AI-Roadmap: Извлечение структурированных сущностей из расшифровки голосового сообщения.
    
    Отправляет промпт в Ollama и ожидает ответ в формате JSON.
    
    Args:
        text: Текст расшифрованного голосового сообщения
    
    Returns:
        dict с полями:
          - client_name: str | None
          - contact_person: str | None
          - contact_phone: str | None
          - service_type: str | None   (пескоструй, АКЗ, огнезащита и т.д.)
          - area: str | None           (объем работ, напр. "1000 м²")
          - deadline_desc: str | None  (текстовое описание срока, напр. "до пятницы")
          - task_title: str            (краткое название задачи — всегда присутствует)
          - task_description: str | None
    """
    prompt = f"""Ты — помощник менеджера компании по антикоррозийной защите (АКЗ), огнезащите и пескоструйной очистке.
Тебе дан расшифрованный текст голосового сообщения менеджера после встречи или переговоров.
Извлеки из него структурированные данные и верни ТОЛЬКО валидный JSON-объект — без пояснений, без markdown-блоков, только чистый JSON.

Поля JSON:
- "client_name": название компании/клиента (или null)
- "contact_person": имя контактного лица (или null)
- "contact_phone": номер телефона (или null)
- "service_type": вид работ (пескоструй, АКЗ, огнезащита, покраска и т.п.) (или null)
- "area": объем работ (площадь, метры, единицы) (или null)
- "deadline_desc": срок/дедлайн в виде текста (или null)
- "task_title": краткое название задачи на русском (обязательно, максимум 60 символов)
- "task_description": полное описание задачи — всё важное из сообщения

Текст голосового сообщения:
"{text}"

Ответ (только JSON):"""

    response = ask_ollama(prompt)
    
    if not response:
        # Если Ollama недоступна, возвращаем заготовку с полным текстом
        return {
            "client_name": None,
            "contact_person": None,
            "contact_phone": None,
            "service_type": None,
            "area": None,
            "deadline_desc": None,
            "task_title": text[:60] if text else "Задача из голосового сообщения",
            "task_description": text,
        }
    
    # Пробуем распарсить ответ как JSON
    import json
    import re
    
    # Очищаем возможные markdown-блоки ```json ... ```
    clean = re.sub(r'```(?:json)?\s*', '', response).strip()
    clean = clean.rstrip('`').strip()
    
    # Ищем первый {...} блок
    match = re.search(r'\{.*\}', clean, re.DOTALL)
    if match:
        clean = match.group(0)
    
    try:
        data = json.loads(clean)
        # Убеждаемся что task_title всегда заполнен
        if not data.get("task_title"):
            data["task_title"] = text[:60] if text else "Задача из голосового сообщения"
        return data
    except (json.JSONDecodeError, Exception) as e:
        logger.warning(f"ai_extract_task_entities: не удалось распарсить JSON от Ollama: {e}\nОтвет: {response[:300]}")
        return {
            "client_name": None,
            "contact_person": None,
            "contact_phone": None,
            "service_type": None,
            "area": None,
            "deadline_desc": None,
            "task_title": text[:60] if text else "Задача из голосового сообщения",
            "task_description": text,
        }
