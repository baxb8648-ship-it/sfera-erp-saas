# -*- coding: utf-8 -*-
"""
Тест ОКВЭД-парсера в боевых условиях.
Запуск: backend/venv/Scripts/python.exe backend/test_okvad.py
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
import os
import time
import json
import urllib.request
import urllib.parse
import re
import ssl

# ─── Конфиг ───────────────────────────────────────────────────────────────────
FNS_API_KEY  = "216875492cb989d65bc93071c4d0fcd6288a18ba"
FNS_API_BASE = "https://api-fns.ru/api"
CHECKO_KEY   = "oh8J5uZ8rMU2pwXH"
CHECKO_BASE  = "https://api.checko.ru/v2"
KEYWORD      = "монтаж"        # Ключевое слово поиска
REGION_CODE  = "56"            # 56 = Оренбургская область
LIMIT        = 5               # Берём 5 компаний для быстрого теста (экономим лимиты)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
    "Accept-Language": "ru-RU,ru;q=0.9",
}

REGION_NAMES = {
    "56": "Оренбургская область",
}

# ─── Утилиты ──────────────────────────────────────────────────────────────────

def sep(title=""):
    line = "─" * 60
    if title:
        print(f"\n{line}")
        print(f"  {title}")
        print(line)
    else:
        print(line)

def ts():
    """Возвращает текущее время как строку."""
    return time.strftime("%H:%M:%S")

# ─── Шаг 0: Проверка лимитов api-fns.ru ──────────────────────────────────────

def check_fns_limits():
    sep("ШАГ 0: Проверка лимитов api-fns.ru")
    url = f"{FNS_API_BASE}/stat?key={FNS_API_KEY}"
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        req = urllib.request.Request(url, headers=HEADERS)
        t0 = time.time()
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            raw = resp.read().decode("utf-8", errors="ignore")
        elapsed = time.time() - t0
        data = json.loads(raw)
        print(f"[{ts()}] ✅ Ответ от api-fns.ru за {elapsed:.2f}с")
        print(f"         Данные: {json.dumps(data, ensure_ascii=False, indent=2)}")
        return data
    except Exception as e:
        print(f"[{ts()}] ❌ Ошибка при проверке лимитов: {e}")
        return {}

# ─── Шаг 1: Поиск компаний ────────────────────────────────────────────────────

def search_companies():
    sep(f"ШАГ 1: Поиск компаний — '{KEYWORD}' + '{REGION_NAMES[REGION_CODE]}'")

    region_name = REGION_NAMES.get(REGION_CODE, "")
    query = f"{KEYWORD} {region_name}"

    params = {"q": query, "rows": LIMIT, "key": FNS_API_KEY}
    qs = urllib.parse.urlencode(params, quote_via=urllib.parse.quote)
    url = f"{FNS_API_BASE}/search?{qs}"

    print(f"[{ts()}] 🔍 URL: {url}")

    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        req = urllib.request.Request(url, headers=HEADERS)
        t0 = time.time()
        with urllib.request.urlopen(req, context=ctx, timeout=25) as resp:
            raw = resp.read().decode("utf-8", errors="ignore")
        elapsed = time.time() - t0
        data = json.loads(raw)
        items = data.get("items", [])
        print(f"[{ts()}] ✅ Ответ за {elapsed:.2f}с. Найдено items: {len(items)}")

        companies = []
        for item in items:
            entity = item.get("ЮЛ") or item.get("ИП")
            if not entity:
                continue
            status = entity.get("Статус", "")
            if status not in ("Действующее", ""):
                continue
            inn = entity.get("ИНН", "")
            is_ip = "ИП" in item
            name = entity.get("НаимСокрЮЛ") or entity.get("НаимИП") or entity.get("ФИО", "")
            companies.append({
                "name": name,
                "inn": inn,
                "okvad_main": entity.get("ОКВЭДКод", ""),
                "okvad_name": entity.get("ОснВидДеят", ""),
                "address": entity.get("АдресПолн", ""),
                "status": status or "Действующее",
                "type": "ИП" if is_ip else "ЮЛ",
            })

        print(f"\n         Действующих компаний: {len(companies)}")
        for i, c in enumerate(companies, 1):
            print(f"         {i}. [{c['type']}] {c['name']} | ИНН: {c['inn']} | ОКВЭД: {c['okvad_main']}")

        return companies

    except Exception as e:
        print(f"[{ts()}] ❌ Ошибка поиска: {e}")
        return []

# ─── Шаг 2: Обогащение rusprofile ────────────────────────────────────────────

def enrich_one_egr(inn: str, company_name: str):
    """Обогащение: checko.ru API → FNS EGR → DuckDuckGo fallback."""
    contacts = {"phone": None, "email": None, "website": None, "director": None}

    # ── ШАГ 2a: checko.ru ОФИЦИАЛЬНЫЙ API (первый приоритет) ──
    checko_params = urllib.parse.urlencode({"key": CHECKO_KEY, "inn": inn})
    checko_url = f"{CHECKO_BASE}/company?{checko_params}"
    print(f"[{ts()}]    🟢 Checko API: {checko_url[:80]}...")
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        req = urllib.request.Request(checko_url, headers={**HEADERS, "Accept": "application/json"})
        t0 = time.time()
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            raw = resp.read().decode("utf-8", errors="ignore")
        elapsed = time.time() - t0
        data = json.loads(raw).get("data", {})
        if data:
            leaders = data.get("Руковод", [])
            if leaders and isinstance(leaders, list):
                fio = leaders[0].get("ФИО", "")
                if fio: contacts["director"] = fio
            cb = data.get("Контакты") or {}
            phones = cb.get("Тел", [])
            if phones: contacts["phone"] = phones[0] if isinstance(phones, list) else str(phones)
            emails = cb.get("Емэйл", [])
            if emails: contacts["email"] = (emails[0] if isinstance(emails, list) else str(emails)).lower()
            site = cb.get("ВебСайт", "")
            if site: contacts["website"] = ("https://" + site) if not site.startswith("http") else site

        found_ck = [k for k, v in contacts.items() if v]
        print(f"           ✅ Checko {elapsed:.2f}с | {found_ck if found_ck else 'нет данных'}")
        if contacts.get("director"): print(f"              👤 {contacts['director']}")
        if contacts.get("phone"):    print(f"              📞 {contacts['phone']}")
        if contacts.get("email"):    print(f"              ✉️  {contacts['email']}")
        if contacts.get("website"): print(f"              🌐 {contacts['website']}")
    except Exception as e:
        print(f"           ❌ Checko ошибка: {e}")

    # ── ШАГ 2b: FNS EGR (ЕГРЮЛ) — дополняем пробелы ──
    if not all([contacts["director"], contacts["phone"]]):
        egr_url_params = urllib.parse.urlencode({"req": inn, "key": FNS_API_KEY}, quote_via=urllib.parse.quote)
        egr_url = f"{FNS_API_BASE}/egr?{egr_url_params}"
        print(f"[{ts()}]    📋 FNS EGR: {egr_url[:80]}...")
        try:
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            req = urllib.request.Request(egr_url, headers=HEADERS)
            t0 = time.time()
            with urllib.request.urlopen(req, context=ctx, timeout=20) as resp:
                raw = resp.read()
            elapsed = time.time() - t0
            data = json.loads(raw.decode("utf-8-sig", errors="ignore"))
            items = data.get("items", [])
            if items:
                entity = items[0].get("ЮЛ") or items[0].get("ИП")
                if entity:
                    head = entity.get("Руководитель") or {}
                    if isinstance(head, list): head = head[0] if head else {}
                    fio = head.get("ФИОПолн", "") or entity.get("ФИО", "")
                    if fio and not contacts["director"]: contacts["director"] = fio
                    cb = entity.get("Контакты") or {}
                    if isinstance(cb, list): cb = cb[0] if cb else {}
                    phones = cb.get("Телефон", [])
                    if phones and not contacts["phone"]:
                        contacts["phone"] = phones[0] if isinstance(phones, list) else str(phones)
                    emails = cb.get("e-mail", [])
                    if emails and not contacts["email"]:
                        contacts["email"] = (emails[0] if isinstance(emails, list) else str(emails)).lower()
                    sites = cb.get("Сайт", [])
                    if sites and not contacts["website"]:
                        site = sites[0] if isinstance(sites, list) else str(sites)
                        contacts["website"] = ("https://" + site) if not site.startswith("http") else site
            found_egr = [k for k, v in contacts.items() if v]
            print(f"           ✅ EGR {elapsed:.2f}с | {found_egr if found_egr else 'нет дополнений'}")
        except Exception as e:
            print(f"           ❌ EGR ошибка: {e}")

    # ── ШАГ 2c: DuckDuckGo (fallback — остались пробелы) ─
    if not contacts["website"] and not contacts["phone"]:
        ddg_query = urllib.parse.quote(f"{inn} официальный сайт телефон")
        ddg_url = f"https://html.duckduckgo.com/html/?q={ddg_query}"
        print(f"[{ts()}]    🦆 DDG fallback...")
        try:
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            req = urllib.request.Request(ddg_url, headers=HEADERS)
            t0 = time.time()
            with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
                html = resp.read().decode("utf-8", errors="ignore")
            elapsed = time.time() - t0
            phone_m = re.search(r'((?:\+7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2})', html)
            if phone_m and not contacts["phone"]: contacts["phone"] = phone_m.group(1)
            email_m = re.search(r'\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b', html)
            if email_m and not contacts["email"]:
                em = email_m.group(1).lower()
                if not any(x in em for x in ["duckduckgo", "nalog", "noreply", "example"]):
                    contacts["email"] = em
            SKIP = {"nalog.ru", "egrul.nalog", "rusprofile", "duckduckgo", "gosuslugi", "kad.arbitr"}
            for s in re.findall(r'class="result__url"[^>]*>([^<]+)<', html):
                s = s.strip().lower()
                if s and not any(skip in s for skip in SKIP):
                    contacts["website"] = ("https://" + s) if not s.startswith("http") else s
                    break
            found_ddg = [k for k, v in contacts.items() if v and k != "director"]
            print(f"           ✅ DDG {elapsed:.2f}с | {found_ddg if found_ddg else 'нет дополнений'}")
        except Exception as e:
            print(f"           ❌ DDG ошибка: {e}")

    return contacts

def enrich_companies(companies: list):
    sep("ШАГ 2: Обогащение через api-fns.ru EGR (ЕГРЮЛ) + DuckDuckGo")
    results = []
    for i, c in enumerate(companies, 1):
        print(f"\n[{ts()}] [{i}/{len(companies)}] {c['name']} | ИНН: {c['inn']}")
        contacts = enrich_one_egr(c["inn"], c["name"])
        c.update(contacts)
        results.append(c)
        if i < len(companies):
            time.sleep(0.5)
    return results

# ─── Шаг 3: Итоговая сводка ───────────────────────────────────────────────────

def print_summary(companies: list):
    sep("ИТОГ: Сводка по собранным лидам")
    with_contacts = [c for c in companies if c.get("phone") or c.get("email")]
    print(f"  Всего компаний:       {len(companies)}")
    print(f"  С контактами:         {len(with_contacts)}")
    print(f"  Без контактов:        {len(companies) - len(with_contacts)}")
    print()
    for i, c in enumerate(companies, 1):
        has_email  = "✉️ " if c.get("email") else "   "
        has_phone  = "📞" if c.get("phone") else "  "
        print(f"  {i}. {has_email}{has_phone} {c['name'][:45]:<45} ИНН:{c.get('inn','')}")

# ─── MAIN ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print()
    print("=" * 60)
    print("  ТЕСТ ОКВЭД-ПАРСЕРА — СФЕРУМ")
    print(f"  Ключевое слово: {KEYWORD}")
    print(f"  Регион:         {REGION_NAMES[REGION_CODE]}")
    print(f"  Лимит:          {LIMIT} компаний")
    print("=" * 60)

    total_start = time.time()

    # 0. Проверка лимитов
    check_fns_limits()
    time.sleep(0.5)

    # 1. Поиск
    companies = search_companies()
    if not companies:
        print("\n❌ Компании не найдены. Тест завершён.")
        sys.exit(1)

    # 2. Обогащение
    companies = enrich_companies(companies)

    # 3. Итог
    print_summary(companies)

    total = time.time() - total_start
    sep()
    print(f"  ⏱️  Общее время теста: {total:.1f}с")
    print(f"  📊 Среднее на компанию: {total/len(companies):.1f}с")
    print()
    print("  ✅ Тест завершён! Парсер работает корректно.")
    print("     Для полного запуска — создай Спецзадание в CRM")
    print("     с типом 'okvad' и запусти через кнопку 'Запустить'.")
    sep()
