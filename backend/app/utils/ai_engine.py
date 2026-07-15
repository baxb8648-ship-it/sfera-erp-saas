import os
import math
import hashlib
import random
import urllib.request
import json
import logging
from typing import List, Optional

logger = logging.getLogger("uvicorn.error")

# Адрес локального сервера Ollama по умолчанию
OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
# Модель, отлично понимающая русский (Qwen2 7B или Llama3)
MODEL_NAME = "qwen2:7b" 

# Настройки генерации эмбеддингов
OLLAMA_EMBED_URL = "http://127.0.0.1:11434/api/embeddings"
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "nomic-embed-text")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_EMBED_URL = "https://api.openai.com/v1/embeddings"
OPENAI_EMBED_MODEL = "text-embedding-3-small" 

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


# ─── ФАЗА 2: ГЕНЕРАТОР ЭМБЕДДИНГОВ (RAG & PINECONE) ─────────────────────────────

def _normalize_and_resize(vec: List[float], target_dim: int) -> List[float]:
    """
    Приводит вектор к нужной размерности (для Pinecone по умолчанию 1536) 
    и нормализует (L2 norm = 1.0) для корректного расчета косинусного расстояния.
    """
    if not vec:
        vec = [0.0] * target_dim
    
    if len(vec) > target_dim:
        vec = vec[:target_dim]
    elif len(vec) < target_dim:
        repeats = (target_dim // len(vec)) + 1
        vec = (vec * repeats)[:target_dim]
        
    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 1e-12:
        vec = [x / norm for x in vec]
    else:
        vec = [1.0 / math.sqrt(target_dim)] * target_dim
    return vec


def _get_fallback_embedding(text: str, target_dim: int) -> List[float]:
    """
    Генерация детерминированного вектора на основе SHA-256 хеша текста (failsafe/офлайн режим).
    Позволяет тестировать RAG-индексацию и поиск в Pinecone без запущенной Ollama и без ключей OpenAI.
    """
    h = hashlib.sha256(text.encode("utf-8", errors="ignore")).hexdigest()
    seed_val = int(h, 16)
    rng = random.Random(seed_val)
    vec = [rng.uniform(-1.0, 1.0) for _ in range(target_dim)]
    return _normalize_and_resize(vec, target_dim)


def get_embedding(text: str, target_dim: int = 1536) -> List[float]:
    """
    Генерирует векторное представление (embedding) для текста.
    
    Стратегия:
    1. Если задан OPENAI_API_KEY в .env, использует OpenAI (text-embedding-3-small, размерность 1536).
    2. Если нет, пытается использовать локальный Ollama API (/api/embeddings или /api/embed).
    3. При сбое или отсутствии сети/модели возвращает детерминированный нормализованный вектор (failsafe).
    """
    if not text or not text.strip():
        return [0.0] * target_dim

    # 1. Попытка через OpenAI API
    if OPENAI_API_KEY:
        try:
            payload = {
                "model": OPENAI_EMBED_MODEL,
                "input": text.strip()
            }
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                OPENAI_EMBED_URL,
                data=data,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {OPENAI_API_KEY}"
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                res_json = json.loads(resp.read().decode("utf-8"))
                embedding = res_json["data"][0]["embedding"]
                return _normalize_and_resize(embedding, target_dim)
        except Exception as e:
            logger.warning(f"[ai_engine] OpenAI embedding failed: {e}. Falling back to Ollama/failsafe.")

    # 2. Попытка через локальный Ollama
    try:
        payload = {
            "model": EMBEDDING_MODEL_NAME,
            "prompt": text.strip()
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            OLLAMA_EMBED_URL,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            res_json = json.loads(resp.read().decode("utf-8"))
            embedding = res_json.get("embedding")
            if not embedding and "embeddings" in res_json and res_json["embeddings"]:
                embedding = res_json["embeddings"][0]
            if embedding:
                return _normalize_and_resize(embedding, target_dim)
    except Exception as e:
        logger.debug(f"[ai_engine] Ollama embedding failed: {e}. Using deterministic failsafe embedding.")

    # 3. Failsafe: детерминированный вектор
    return _get_fallback_embedding(text.strip(), target_dim)


def get_embeddings_batch(texts: List[str], target_dim: int = 1536) -> List[List[float]]:
    """
    Пакетная генерация эмбеддингов для списка текстовых фрагментов.
    """
    if not texts:
        return []
    
    results = []
    for t in texts:
        results.append(get_embedding(t, target_dim=target_dim))
    return results


def generate_rag_answer(query: str, context_chunks: List[dict], model_name: Optional[str] = None) -> str:
    """
    Генерирует ответ на основе RAG-контекста с помощью локальной LLM (Qwen / Ollama).
    Если контекст найден, формирует строгий промпт, запрещающий галлюцинировать.
    Если Ollama недоступна, возвращает информативное сообщение с данными из найденных чанков.
    """
    if not context_chunks:
        prompt = f"""Ты — интеллектуальный бизнес-ассистент СФЕРА ERP.
Вопрос пользователя: {query}
В базе знаний компании не найдено прямых документов по этому вопросу. Ответь профессионально и кратко на основе общих знаний о бизнес-процессах и ERP-системах, но укажи, что в корпоративной базе нет специального документа на эту тему.
Ответ на русском языке:"""
    else:
        context_str = "\n\n".join([
            f"[Фрагмент #{i+1} | Источник: {c.get('source') or c.get('metadata', {}).get('source_file') or 'База знаний'} | Релевантность: {round(c.get('score', 0)*100, 1)}%]\n{c.get('text', '')}"
            for i, c in enumerate(context_chunks)
        ])
        prompt = f"""Ты — интеллектуальный бизнес-ассистент СФЕРА ERP. Ответь на вопрос пользователя на русском языке, опираясь СТРОГО на предоставленные ниже фрагменты из корпоративной базы знаний.
Правила:
1. Используй только факты из предоставленного контекста. Не выдумывай цены, сроки или условия, если их нет в тексте.
2. Если в тексте есть ответ, сформулируй его четко, структурированно и понятно для сотрудника или руководителя.
3. Можно делать ссылки на названия документов/источников, из которых взята информация.

КОНТЕКСТ ИЗ БАЗЫ ЗНАНИЙ:
=========================================
{context_str}
=========================================

ВОПРОС ПОЛЬЗОВАТЕЛЯ: {query}

ОТВЕТ АССИСТЕНТА:"""

    answer = ask_ollama(prompt)
    if not answer:
        if context_chunks:
            top_text = context_chunks[0].get('text', '')
            source = context_chunks[0].get('source') or context_chunks[0].get('metadata', {}).get('source_file') or 'База знаний'
            return f"[Офлайн-режим RAG: локальная LLM ({MODEL_NAME}) временно не отвечает]\n\nНаиболее релевантный ответ из базы знаний (источник: {source}):\n«{top_text}»"
        else:
            return "[Офлайн-режим: локальная нейросеть временно недоступна, а в базе знаний нет информации по вашему вопросу]"
            
    return answer


def ai_extract_pto_material_consumption(text: str) -> dict:
    """
    Извлекает данные для списания материалов прорабом с объекта.
    Возвращает JSON с полями:
      - material_name: str | None (например, "цемент", "кирпич")
      - quantity: float | None (число списания)
      - unit: str | None (например, "мешок", "шт")
      - object_name: str | None (название объекта, например, "ЖК Гагаринский")
    """
    prompt = f"""Ты — ИИ-ассистент инженера ПТО строительной компании.
Тебе дана текстовая расшифровка сообщения от прораба со стройки о списании материалов.
Извлеки из него структурированные данные о списании и верни ТОЛЬКО валидный JSON-объект — без пояснений, без markdown-тегов, только чистый JSON.

Поля JSON:
- "material_name": наименование материала (или null)
- "quantity": количество списания в виде числа с плавающей точкой (или null)
- "unit": единица измерения (например, "мешок", "кг", "шт", "литр") (или null)
- "object_name": название строительного объекта/площадки (или null)

Текст сообщения:
"{text}"

Ответ (только JSON):"""

    response = ask_ollama(prompt)
    if not response:
        return {
            "material_name": None,
            "quantity": None,
            "unit": None,
            "object_name": None
        }

    import re
    import json
    clean = re.sub(r'```(?:json)?\s*', '', response).strip()
    clean = clean.split('```')[0].strip()
    try:
        return json.loads(clean)
    except Exception as e:
        logger.error(f"[AIEngine] Failed to parse pto extraction JSON: {e}. Raw response: {response}")
        mat = re.search(r'"material_name"\s*:\s*(?:"([^"]+)"|null)', clean)
        qty = re.search(r'"quantity"\s*:\s*([\d\.]+)', clean)
        unt = re.search(r'"unit"\s*:\s*(?:"([^"]+)"|null)', clean)
        obj = re.search(r'"object_name"\s*:\s*(?:"([^"]+)"|null)', clean)
        return {
            "material_name": mat.group(1) if mat else None,
            "quantity": float(qty.group(1)) if qty else None,
            "unit": unt.group(1) if unt else None,
            "object_name": obj.group(1) if obj else None
        }



