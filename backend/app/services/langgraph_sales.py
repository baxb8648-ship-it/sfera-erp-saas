"""
LangGraph Оркестратор для B2B Продаж (Фаза 5.1).
Автономная цепочка:
1. Поиск (research_node): По ИНН или названию через api-fns (обогащение контактами).
2. Скрапинг (scrape_node): Извлечение текста с найденного сайта (beautifulsoup).
3. Юрист-агент (lawyer_node): LLM оценка рисков и базового профиля компании.
4. Сейлз-агент (sales_node): LLM генерация коммерческого предложения.
"""
import logging
from typing import Dict, Any, Optional
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, END
import urllib.request
from bs4 import BeautifulSoup

from .okvad_parser import enrich_with_fns_egr, search_companies_by_keyword
from ..utils.ai_engine import ask_ollama

logger = logging.getLogger("uvicorn.error")

class SalesState(TypedDict):
    query: str
    inn: Optional[str]
    company_data: Dict[str, Any]
    website_url: Optional[str]
    website_text: Optional[str]
    lawyer_report: Optional[str]
    sales_proposal: Optional[str]
    error: Optional[str]

def research_node(state: SalesState) -> SalesState:
    """Узел 1: Поиск и обогащение информации о компании."""
    logger.info(f"[LangGraph] research_node: query={state.get('query')}, inn={state.get('inn')}")
    query = state.get("query", "")
    inn = state.get("inn")
    
    company_data = {}
    
    if not inn and query:
        # Пытаемся найти по названию
        results = search_companies_by_keyword(query, region_code="", limit=1)
        if results:
            company_data = results[0]
            inn = company_data.get("inn")
    
    if inn:
        # Обогащаем (сайт, телефон, email, директор)
        contacts = enrich_with_fns_egr(inn)
        company_data.update(contacts)
    
    if not company_data:
        return {"error": "Компания не найдена по заданному запросу"}
        
    return {
        "inn": inn,
        "company_data": company_data,
        "website_url": company_data.get("website")
    }

def scrape_node(state: SalesState) -> SalesState:
    """Узел 2: Извлечение текста с веб-сайта компании."""
    url = state.get("website_url")
    if not url:
        return {"website_text": "Сайт не найден. Информация собрана только из ЕГРЮЛ."}
        
    logger.info(f"[LangGraph] scrape_node: scraping {url}")
    text = ""
    try:
        import ssl
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        
        req = urllib.request.Request(
            url, 
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"}
        )
        with urllib.request.urlopen(req, context=ctx, timeout=15) as response:
            html = response.read()
            
        soup = BeautifulSoup(html, "html.parser")
        # Удаляем лишние теги
        for script in soup(["script", "style", "nav", "footer", "header"]):
            script.extract()
            
        text = soup.get_text(separator=' ', strip=True)
        # Ограничиваем размер (около 15 000 символов для LLM)
        text = text[:15000]
    except Exception as e:
        logger.warning(f"[LangGraph] scrape_node failed for {url}: {e}")
        text = f"Не удалось проанализировать сайт ({str(e)}). Доступна только регистрационная информация."
        
    return {"website_text": text}

def lawyer_node(state: SalesState) -> SalesState:
    """Узел 3: Юрист-агент (оценка рисков)."""
    company = state.get("company_data", {})
    if not company:
        return {"lawyer_report": "Нет данных для анализа."}
        
    logger.info("[LangGraph] lawyer_node: generating report")
    prompt = f"""Ты — корпоративный юрист и compliance-менеджер.
Проанализируй профиль компании и сделай краткий вывод об ее надежности (до 3-х предложений).
Учти дату регистрации и статус.

Компания: {company.get('full_name') or company.get('name')}
ИНН: {company.get('inn')}
ОКВЭД: {company.get('okvad_main')} - {company.get('okvad_name')}
Статус: {company.get('status')}
Дата регистрации: {company.get('reg_date')}
Сайт: {company.get('website')}
Директор: {company.get('director')}

Твой отчет (кратко, профессионально):"""

    report = ask_ollama(prompt)
    if not report:
        report = "Офлайн-режим (LLM недоступна). Автоматическая проверка ЕГРЮЛ пройдена."
        
    return {"lawyer_report": report}

def sales_node(state: SalesState) -> SalesState:
    """Узел 4: Сейлз-агент (Генерация коммерческого предложения)."""
    company = state.get("company_data", {})
    website_text = state.get("website_text", "")
    
    logger.info("[LangGraph] sales_node: generating proposal")
    prompt = f"""Ты — топовый B2B менеджер по продажам.
Твоя задача написать ОЧЕНЬ персонализированное, холодное письмо-предложение (до 4-х абзацев) для этой компании.
Учитывай то, чем они занимаются (информация с их сайта или ОКВЭД). 
Мы предлагаем внедрение ERP-системы "СФЕРУМ", которая закроет их хаос в учете, складе и задачах.

Информация о клиенте:
Название: {company.get('name')}
Сфера деятельности: {company.get('okvad_name')}
Директор: {company.get('director')}

Контекст с их сайта (чтобы сделать точечное предложение, если есть):
{website_text[:3000]}

Напиши мощное, персонализированное письмо для отправки директору (обращайся по имени отчеству, если известно, или просто уважаемый руководитель). Без воды."""

    proposal = ask_ollama(prompt)
    if not proposal:
        proposal = "Офлайн-режим (LLM недоступна). Шаблонное предложение: Здравствуйте, предлагаем внедрить СФЕРУМ для оптимизации ваших процессов."
        
    return {"sales_proposal": proposal}


# ─── Построение Графа ─────────────────────────────────────────────────────────

def build_sales_graph():
    builder = StateGraph(SalesState)
    
    builder.add_node("research", research_node)
    builder.add_node("scrape", scrape_node)
    builder.add_node("lawyer", lawyer_node)
    builder.add_node("sales", sales_node)
    
    # Прямая последовательность: Research -> Scrape -> Lawyer -> Sales -> END
    builder.set_entry_point("research")
    
    def research_router(state: SalesState):
        if state.get("error"):
            return END
        return "scrape"
        
    builder.add_conditional_edges("research", research_router)
    builder.add_edge("scrape", "lawyer")
    builder.add_edge("lawyer", "sales")
    builder.add_edge("sales", END)
    
    return builder.compile()

# Экспортируем готовый граф
sales_agent_graph = build_sales_graph()
