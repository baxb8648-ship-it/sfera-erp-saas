"""
Парсер компаний по ОКВЭД — «Суперсила» CRM СФЕРУМ.
Источники: api-fns.ru (ЕГРЮЛ) → rusprofile.ru (обогащение контактами) → Ollama (AI-скоринг).
"""
import logging
import urllib.request
import urllib.parse
import json
import re
import time
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from ..models import LeadDatabase, SpecialTask
from ..utils.ai_engine import ask_ollama
from ..notifications import send_telegram_notification

logger = logging.getLogger("uvicorn.error")

# ─── Константы ────────────────────────────────────────────────────────────────
FNS_API_KEY    = "216875492cb989d65bc93071c4d0fcd6288a18ba"
FNS_API_BASE   = "https://api-fns.ru/api"
CHECKO_API_KEY = "oh8J5uZ8rMU2pwXH"
CHECKO_API_BASE = "https://api.checko.ru/v2"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
}

# Словарь: код региона → название (для подстановки в поиск)
REGION_NAMES = {
    "01": "Адыгея", "02": "Башкортостан", "03": "Бурятия", "04": "Алтай",
    "05": "Дагестан", "06": "Ингушетия", "07": "Кабардино-Балкария", "08": "Калмыкия",
    "09": "Карачаево-Черкессия", "10": "Карелия", "11": "Коми", "12": "Марий Эл",
    "13": "Мордовия", "14": "Якутия", "15": "Северная Осетия", "16": "Татарстан",
    "17": "Тыва", "18": "Удмуртия", "19": "Хакасия", "20": "Чечня",
    "21": "Чувашия", "22": "Алтайский край", "23": "Краснодарский край",
    "24": "Красноярский край", "25": "Приморский край", "26": "Ставропольский край",
    "27": "Хабаровский край", "28": "Амурская область", "29": "Архангельская область",
    "30": "Астраханская область", "31": "Белгородская область", "32": "Брянская область",
    "33": "Владимирская область", "34": "Волгоградская область", "35": "Вологодская область",
    "36": "Воронежская область", "37": "Ивановская область", "38": "Иркутская область",
    "39": "Калининградская область", "40": "Калужская область", "41": "Камчатский край",
    "42": "Кемеровская область", "43": "Кировская область", "44": "Костромская область",
    "45": "Курганская область", "46": "Курская область", "47": "Ленинградская область",
    "48": "Липецкая область", "49": "Магаданская область", "50": "Московская область",
    "51": "Мурманская область", "52": "Нижегородская область", "53": "Новгородская область",
    "54": "Новосибирская область", "55": "Омская область", "56": "Оренбургская область",
    "57": "Орловская область", "58": "Пензенская область", "59": "Пермский край",
    "60": "Псковская область", "61": "Ростовская область", "62": "Рязанская область",
    "63": "Самарская область", "64": "Саратовская область", "65": "Сахалинская область",
    "66": "Свердловская область", "67": "Смоленская область", "68": "Тамбовская область",
    "69": "Тверская область", "70": "Томская область", "71": "Тульская область",
    "72": "Тюменская область", "73": "Ульяновская область", "74": "Челябинская область",
    "75": "Забайкальский край", "76": "Ярославская область", "77": "Москва",
    "78": "Санкт-Петербург", "79": "Еврейская АО", "83": "Ненецкий АО",
    "86": "Ханты-Мансийский АО", "87": "Чукотский АО", "89": "Ямало-Ненецкий АО",
    "91": "Республика Крым", "92": "Севастополь",
}


def _fns_request(method: str, params: dict) -> dict:
    """Выполняет запрос к api-fns.ru с ключом и возвращает JSON."""
    params["key"] = FNS_API_KEY
    qs = urllib.parse.urlencode(params, quote_via=urllib.parse.quote)
    url = f"{FNS_API_BASE}/{method}?{qs}"
    try:
        import ssl
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, context=ctx, timeout=20) as resp:
            raw = resp.read().decode("utf-8", errors="ignore")
        return json.loads(raw)
    except Exception as e:
        logger.warning(f"[FNS API] {method} error: {e}")
        return {}


def search_companies_by_keyword(keyword: str, region_code: str, limit: int = 20) -> list[dict]:
    """
    Ищет компании через api-fns.ru/api/search по ключевому слову и региону.
    Возвращает список только ДЕЙСТВУЮЩИХ компаний (до limit).
    
    Стратегия: строим несколько поисковых запросов с разными комбинациями
    ключевого слова + названия региона.
    """
    region_name = REGION_NAMES.get(region_code, "")
    
    # Строим набор поисковых запросов: сначала точные, потом широкие
    search_queries = []
    if region_name:
        search_queries.append(f"{keyword} {region_name}")
    search_queries.append(keyword)
    # Дополнительные варианты с сокращением
    if region_name and " область" in region_name:
        short_region = region_name.replace(" область", "")
        search_queries.append(f"{keyword} {short_region}")
    
    seen_inns = set()
    results = []
    
    for query in search_queries:
        if len(results) >= limit:
            break
        
        logger.info(f"[OKVAD Parser] Searching: '{query}' (limit={limit})")
        
        # API-ФНС принимает rows до 20 за раз
        rows_per_req = min(limit - len(results), 20)
        data = _fns_request("search", {"q": query, "rows": rows_per_req})
        items = data.get("items", [])
        
        for item in items:
            if len(results) >= limit:
                break
            
            # Поддержка ЮЛ (юридические лица) и ИП
            entity = item.get("ЮЛ") or item.get("ИП")
            if not entity:
                continue
            
            status = entity.get("Статус", "")
            if status not in ("Действующее", ""):
                continue  # Пропускаем ликвидированных
            
            inn = entity.get("ИНН", "")
            if not inn or inn in seen_inns:
                continue
            seen_inns.add(inn)
            
            # Собираем запись
            is_ip = "ИП" in item
            name_short = entity.get("НаимСокрЮЛ") or entity.get("НаимИП") or entity.get("ФИО", "")
            name_full = entity.get("НаимПолнЮЛ") or name_short
            
            results.append({
                "name": name_short,
                "full_name": name_full,
                "inn": inn,
                "ogrn": entity.get("ОГРН", ""),
                "okvad_main": entity.get("ОКВЭДКод", ""),
                "okvad_name": entity.get("ОснВидДеят", ""),
                "address": entity.get("АдресПолн", ""),
                "reg_date": entity.get("ДатаОГРН", ""),
                "status": status or "Действующее",
                "source": "api-fns",
                "type": "ИП" if is_ip else "ЮЛ",
            })
        
        time.sleep(0.5)  # Пауза между запросами для лимита API
    
    logger.info(f"[OKVAD Parser] Found {len(results)} active companies for keyword='{keyword}'")
    return results


def enrich_with_checko(inn: str) -> dict:
    """
    Обогащает данные компании через официальный API checko.ru.
    Эндпоинт: GET https://api.checko.ru/v2/company?key=...&req={\u0418\u041d\u041d}

    Структура ответа:
      data.\u041a\u043e\u043d\u0442\u0430\u043a\u0442\u044b.\u0422\u0435\u043b     → []
      data.\u041a\u043e\u043d\u0442\u0430\u043a\u0442\u044b.\u0415\u043c\u044d\u0439\u043b   → []
      data.\u041a\u043e\u043d\u0442\u0430\u043a\u0442\u044b.\u0412\u0435\u0431\u0421\u0430\u0439\u0442 → "https://..."
      data.\u0420\u0443\u043a\u043e\u0432\u043e\u0434[0].\u0424\u0418\u041e  → "\u0424\u0430\u043c\u0438\u043b\u0438\u044f \u0418\u043c\u044f \u041e\u0442\u0447\u0435\u0441\u0442\u0432\u043e"
    """
    contacts = {"phone": None, "email": None, "website": None, "director": None}

    if not inn:
        return contacts

    try:
        import ssl
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        params = urllib.parse.urlencode({"key": CHECKO_API_KEY, "inn": inn})
        url = f"{CHECKO_API_BASE}/company?{params}"
        req = urllib.request.Request(url, headers={
            **HEADERS,
            "Accept": "application/json",
        })
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            raw = resp.read().decode("utf-8", errors="ignore")

        data = json.loads(raw).get("data", {})
        if not data:
            return contacts

        # Руководитель
        leaders = data.get("Руковод", [])
        if leaders and isinstance(leaders, list):
            fio = leaders[0].get("ФИО", "")
            if fio:
                contacts["director"] = fio

        # Контакты
        cb = data.get("Контакты") or {}

        phones = cb.get("Тел", [])
        if phones:
            contacts["phone"] = phones[0] if isinstance(phones, list) else str(phones)

        emails = cb.get("Емэйл", [])
        if emails:
            contacts["email"] = (emails[0] if isinstance(emails, list) else str(emails)).lower()

        site = cb.get("ВебСайт", "")
        if site:
            contacts["website"] = ("https://" + site) if not site.startswith("http") else site

    except Exception as e:
        logger.debug(f"[Checko API] INN {inn}: {e}")

    return contacts


def enrich_with_fns_egr(inn: str) -> dict:
    """
    Обогащает данные компании через api-fns.ru метод `egr` (ЕГРЮЛ).
    Возвращает: директор, телефон, email, сайт.
    
    Примечание: rusprofile.ru сменил архитектуру и теперь скрывает контакты
    за платным доступом — заменён на официальный ЕГРЮЛ через api-fns.ru.
    """
    contacts = {"phone": None, "email": None, "website": None, "director": None}

    if not inn:
        return contacts

    # ── Шаг 0: checko.ru (агрегатор контактов — тел + email + сайт) ──────────
    try:
        checko_data = enrich_with_checko(inn)
        for key in contacts:
            if checko_data.get(key):
                contacts[key] = checko_data[key]
    except Exception as e:
        logger.debug(f"[Checko step] INN {inn}: {e}")

    # ── Шаг 1: ЕГРЮЛ через api-fns.ru/egr ────────────────────────────────────
    try:
        data = _fns_request("egr", {"req": inn, "key": FNS_API_KEY})
        items = data.get("items", [])
        if items:
            entity = items[0].get("ЮЛ") or items[0].get("ИП")
            if entity:
                # Руководитель
                head = entity.get("Руководитель") or {}
                if isinstance(head, list):
                    head = head[0] if head else {}
                fio = head.get("ФИОПолн", "") or entity.get("ФИО", "")
                if fio:
                    contacts["director"] = fio

                # Контакты из ЕГРЮЛ (телефон, email, сайт — возвращаются как списки)
                contact_block = entity.get("Контакты") or {}
                if isinstance(contact_block, list):
                    contact_block = contact_block[0] if contact_block else {}
                phones = contact_block.get("Телефон", [])
                if phones:
                    contacts["phone"] = phones[0] if isinstance(phones, list) else str(phones)
                emails = contact_block.get("e-mail", [])
                if emails:
                    contacts["email"] = (emails[0] if isinstance(emails, list) else str(emails)).lower()
                sites = contact_block.get("Сайт", [])
                if sites:
                    site = sites[0] if isinstance(sites, list) else str(sites)
                    contacts["website"] = ("https://" + site) if not site.startswith("http") else site

    except Exception as e:
        logger.debug(f"[FNS EGR] INN {inn}: {e}")

    # ── Шаг 2: Поиск сайта/контактов через DuckDuckGo (если egr не дал) ──────
    if not contacts["website"] and not contacts["phone"]:
        try:
            import ssl
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE

            ddg_query = urllib.parse.quote(f"{inn} официальный сайт телефон")
            ddg_url = f"https://html.duckduckgo.com/html/?q={ddg_query}"
            req = urllib.request.Request(ddg_url, headers=HEADERS)
            with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
                html = resp.read().decode("utf-8", errors="ignore")

            # Телефон
            phone_m = re.search(
                r'((?:\+7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2})', html
            )
            if phone_m:
                contacts["phone"] = phone_m.group(1)

            # Email
            email_m = re.search(r'\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b', html)
            if email_m:
                em = email_m.group(1).lower()
                if not any(x in em for x in ["duckduckgo", "nalog", "noreply", "example", "gosuslugi"]):
                    contacts["email"] = em

            # Сайт — ищем первый result__url не из системных доменов
            SKIP_DOMAINS = {"nalog.ru", "egrul.nalog.ru", "rusprofile.ru", "duckduckgo.com",
                            "gosuslugi.ru", "kad.arbitr.ru", "spark-interfax.ru", "zachestnyibiznes.ru"}
            site_matches = re.findall(r'class="result__url"[^>]*>([^<]+)<', html)
            for s in site_matches:
                s = s.strip().lower()
                if s and not any(skip in s for skip in SKIP_DOMAINS):
                    contacts["website"] = ("https://" + s) if not s.startswith("http") else s
                    break

        except Exception as e:
            logger.debug(f"[DuckDuckGo enrich] INN {inn}: {e}")

    return contacts


# Оставляем алиас для обратной совместимости
enrich_with_rusprofile = enrich_with_fns_egr


def ai_score_company(company: dict, offer_context: str, ai_filter_prompt: str) -> tuple[int, str]:
    """
    Запрашивает у Ollama оценку релевантности компании.
    Возвращает (score 0-10, причина).
    """
    prompt = f"""Ты — B2B-аналитик. Оцени насколько компания является целевым клиентом для предложения.

Наше предложение:
{offer_context}

Целевая аудитория (дополнительно):
{ai_filter_prompt or 'Строительные и производственные компании, которым могут понадобиться наши услуги/товары.'}

Информация о компании:
- Название: {company.get('name', '')}
- Основная деятельность: {company.get('okvad_name', '')}
- ОКВЭД: {company.get('okvad_main', '')}
- Адрес: {company.get('address', '')}
- Статус: {company.get('status', '')}

Дай оценку от 0 до 10 (0 = совершенно не подходит, 10 = идеальный клиент).
Отвечай СТРОГО в формате:
ОЦЕНКА: [число от 0 до 10]
ПРИЧИНА: [одно предложение почему]"""

    response = ask_ollama(prompt)
    score = 5
    reason = "Автоматическая оценка"
    
    if response:
        score_match = re.search(r'ОЦЕНКА:\s*(\d+)', response, re.IGNORECASE)
        reason_match = re.search(r'ПРИЧИНА:\s*(.+)', response, re.IGNORECASE | re.DOTALL)
        if score_match:
            score = min(10, max(0, int(score_match.group(1))))
        if reason_match:
            reason = reason_match.group(1).strip()[:300]
    
    return score, reason


def run_okvad_campaign(db: Session, task_id: int, current_user_id: int):
    """
    Главный пайплайн ОКВЭД-парсера:
    1. Поиск компаний через api-fns.ru по ключевому слову + регион
    2. Обогащение контактами через rusprofile
    3. (Опционально) AI-скоринг через Ollama
    4. Сохранение в таблицу lead_database
    5. Telegram-уведомление
    """
    task: Optional[SpecialTask] = db.query(SpecialTask).filter(SpecialTask.id == task_id).first()
    if not task:
        logger.error(f"[OKVAD] Task {task_id} not found")
        return

    logger.info(f"[OKVAD] Starting campaign '{task.name}': keyword='{task.keyword}', region='{task.region_code}', limit={task.search_limit}")

    limit = task.search_limit or 20
    keyword = task.keyword or ""
    region_code = task.region_code or ""

    # ── Шаг 1: Поиск компаний ─────────────────────────────────────────────────
    companies = search_companies_by_keyword(keyword, region_code, limit)

    if not companies:
        logger.warning(f"[OKVAD] No companies found for task '{task.name}'")
        task.last_run = datetime.utcnow()
        db.commit()
        return

    saved_count = 0
    enriched_count = 0
    scored_count = 0

    for company in companies:
        # Проверяем — не было ли уже такой записи по этому заданию и ИНН
        existing = None
        if company.get("inn"):
            existing = db.query(LeadDatabase).filter(
                LeadDatabase.task_id == task_id,
                LeadDatabase.inn == company["inn"]
            ).first()
        
        if existing:
            continue  # Пропускаем дубли

        # ── Шаг 2: Обогащение контактами (api-fns egr + DuckDuckGo) ───────────
        contacts = {"phone": None, "email": None, "website": None, "director": None}
        if company.get("inn"):
            try:
                contacts = enrich_with_fns_egr(company["inn"])
                if any(contacts.values()):
                    enriched_count += 1
                time.sleep(0.4)  # Небольшая пауза между запросами
            except Exception as e:
                logger.debug(f"[OKVAD] Enrich failed for {company['inn']}: {e}")

        # ── Шаг 3: AI-скоринг (опционально) ───────────────────────────────────
        ai_score = 0
        ai_reason = None
        if task.use_ai_filter:
            try:
                ai_score, ai_reason = ai_score_company(
                    company, task.offer_context, task.ai_filter_prompt or ""
                )
                scored_count += 1
                # Пропускаем нерелевантных (score < 4)
                if ai_score < 4:
                    logger.debug(f"[OKVAD] Skipped (score={ai_score}): {company['name']}")
                    continue
            except Exception as e:
                logger.debug(f"[OKVAD] AI scoring failed: {e}")
                ai_score = 5  # Нейтральная оценка при ошибке

        # ── Шаг 4: Сохранение в БД ────────────────────────────────────────────
        lead = LeadDatabase(
            task_id=task_id,
            name=company.get("name", ""),
            full_name=company.get("full_name", ""),
            inn=company.get("inn"),
            ogrn=company.get("ogrn"),
            okvad_main=company.get("okvad_main"),
            okvad_name=company.get("okvad_name"),
            address=company.get("address"),
            reg_date=company.get("reg_date"),
            status=company.get("status", "Действующее"),
            phone=contacts.get("phone"),
            email=contacts.get("email"),
            website=contacts.get("website"),
            director=contacts.get("director"),
            ai_score=ai_score,
            ai_reason=ai_reason,
            source=company.get("source", "api-fns"),
        )
        db.add(lead)
        saved_count += 1

    db.commit()
    task.last_run = datetime.utcnow()
    db.commit()

    # ── Шаг 5: Telegram-уведомление ───────────────────────────────────────────
    ai_note = f"\n🤖 AI-скоринг применён, отфильтровано нерелевантных" if task.use_ai_filter else ""
    tg_msg = (
        f"🏗️ <b>ОКВЭД-Парсер: '{task.name}' завершён!</b>\n\n"
        f"🔍 <b>Ключевое слово:</b> {keyword}\n"
        f"📍 <b>Регион:</b> {REGION_NAMES.get(region_code, region_code or 'Все')}\n"
        f"✅ <b>Найдено компаний:</b> {len(companies)}\n"
        f"📋 <b>Сохранено в базу:</b> {saved_count}\n"
        f"📞 <b>Обогащено контактами:</b> {enriched_count}{ai_note}\n\n"
        f"📂 <a href='https://срм.леоника56.рф/#/crm'>Открыть базу лидов в CRM</a>"
    )
    send_telegram_notification(tg_msg, db)
    logger.info(f"[OKVAD] Campaign '{task.name}' done: saved={saved_count}, enriched={enriched_count}")
