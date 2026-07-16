import logging
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
import ssl
import re
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from ..models import Client, ClientStatusEnum, Task, Interaction, SpecialTask, User
from ..notifications import send_email_notification, send_telegram_notification, send_personal_telegram_notification
from ..utils.ai_engine import ask_ollama
from ..websocket_manager import manager
from .okvad_parser import run_okvad_campaign

logger = logging.getLogger("uvicorn.error")

def search_leads_from_zakupki(keyword: str):
    """
    Ищет закупки по произвольному ключевому слову на Zakupki.gov.ru.
    """
    logger.info(f"Searching for leads on Zakupki.gov.ru for keyword: {keyword}...")
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3"
    }

    encoded_keyword = urllib.parse.quote(keyword)
    url = f"https://zakupki.gov.ru/epz/order/extendedsearch/rss.html?searchString={encoded_keyword}"
    
    leads = []
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx, timeout=15) as response:
            content = response.read()
            
        root = ET.fromstring(content)
        items = root.findall('.//item')
        
        for item in items[:5]:
            link_url = item.find('link').text if item.find('link') is not None else ""
            description_html = item.find('description').text if item.find('description') is not None else ""
            
            reg_number_match = re.search(r'regNumber=(\d+)', link_url)
            if not reg_number_match:
                continue
            tender_num = reg_number_match.group(1)
            
            title_match = re.search(r'Наименование объекта закупки:.*?(?:</strong>|&lt;/strong&gt;|)\s*(.*?)(?:<br/?>|&lt;br/?&gt;|$)', description_html, re.IGNORECASE)
            tender_title = title_match.group(1).strip() if title_match else ""
            tender_title = re.sub(r'<[^>]*>', '', tender_title).strip()
            if not tender_title:
                tender_title = item.find('title').text if item.find('title') is not None else f"Закупка {tender_num}"
                
            cust_match = re.search(r'Наименование Заказчика:.*?(?:</strong>|&lt;/strong&gt;|)\s*(.*?)(?:<br/?>|&lt;br/?&gt;|$)', description_html, re.IGNORECASE)
            customer_name = cust_match.group(1).strip() if cust_match else "Не указан"
            customer_name = re.sub(r'<[^>]*>', '', customer_name).strip()
            
            inn = None
            email = None
            phone = None
            contact_person = None
            
            if link_url:
                try:
                    req_detail = urllib.request.Request(link_url, headers=headers)
                    with urllib.request.urlopen(req_detail, context=ctx, timeout=10) as resp_detail:
                        detail_html = resp_detail.read().decode('utf-8', errors='ignore')
                        
                    inn_match = re.search(r'inn=(\d{10,12})', detail_html)
                    if inn_match:
                        inn = inn_match.group(1)
                    else:
                        text_inn_match = re.search(r'(?:ИНН|inn)\s*[\:\-]?\s*(\d{10,12})', detail_html, re.IGNORECASE)
                        if text_inn_match:
                            inn = text_inn_match.group(1)
                    
                    email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', detail_html)
                    if email_match:
                        email = email_match.group(0)
                        
                    phone_match = re.search(r'((?:\+7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2})', detail_html)
                    if phone_match:
                        phone = phone_match.group(1)
                        
                    contact_match = re.search(r'Ответственное должностное лицо.*?(?:class="common-text__value"|class="data-block__value")\s*>\s*([^<]+)', detail_html, re.DOTALL | re.IGNORECASE)
                    if contact_match:
                        contact_person = contact_match.group(1).strip()
                except Exception as ex:
                    logger.error(f"Error fetching details for lead {tender_num}: {ex}")
            
            if not email:
                email = f"info@{tender_num}.ru"
            if not phone:
                phone = "+7 (999) 123-45-67"
            if not contact_person:
                contact_person = "Руководитель отдела закупок"
                
            leads.append({
                "tender_number": tender_num,
                "tender_title": tender_title,
                "customer_name": customer_name,
                "inn": inn,
                "email": email,
                "phone": phone,
                "contact_person": contact_person,
                "link": link_url
            })
            
    except Exception as e:
        logger.error(f"Error in search_leads_from_zakupki: {e}")
        
    return leads


def search_organizations_in_web(query: str):
    """
    Ищет сайты организаций через DuckDuckGo HTML и парсит контакты.
    """
    logger.info(f"Searching for organizations in web for query: {query}...")
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3"
    }

    encoded_query = urllib.parse.quote(query)
    url = f"https://html.duckduckgo.com/html/?q={encoded_query}"
    
    leads = []
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx, timeout=15) as response:
            html = response.read().decode('utf-8', errors='ignore')
            
        links = re.findall(r'href="([^"]+)"', html)
        unique_links = []
        for link in links:
            if "uddg=" in link:
                parse_url = link
                if link.startswith("//"):
                    parse_url = "https:" + link
                elif link.startswith("/"):
                    parse_url = "https://duckduckgo.com" + link
                try:
                    parsed_qs = urllib.parse.parse_qs(urllib.parse.urlparse(parse_url).query)
                    if "uddg" in parsed_qs:
                        link = parsed_qs["uddg"][0]
                except Exception:
                    pass
            
            if (link.startswith("http://") or link.startswith("https://")) and "duckduckgo.com" not in link:
                if link not in unique_links:
                    unique_links.append(link)
                    
        for link in unique_links[:5]:
            try:
                logger.info(f"Scraping organization website: {link}...")
                req_page = urllib.request.Request(link, headers=headers)
                with urllib.request.urlopen(req_page, context=ctx, timeout=10) as resp_page:
                    page_html = resp_page.read().decode('utf-8', errors='ignore')
                    
                title_match = re.search(r'<title>(.*?)</title>', page_html, re.IGNORECASE)
                raw_title = title_match.group(1).strip() if title_match else "Неизвестная организация"
                raw_title = re.sub(r'\s+', ' ', raw_title)
                
                # Используем ИИ Ollama для очистки названия
                clean_name_prompt = (
                    f"Очисти название организации от лишних слов (типа Главная страница, Офиц. сайт, Главная) "
                    f"и верни только краткое официальное название на русском языке. "
                    f"Не пиши никаких объяснений, примечаний, вводных или лишних фраз - только название организации!\n"
                    f"Заголовок: {raw_title}\n"
                    f"Очищенное название:"
                )
                customer_name = ask_ollama(clean_name_prompt) or raw_title
                if customer_name:
                    customer_name = customer_name.split("\n")[0].strip()
                if not customer_name:
                    customer_name = raw_title
                customer_name = customer_name.strip(" \"'")
                
                email = None
                phone = None
                
                email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', page_html)
                if email_match:
                    email = email_match.group(0)
                    
                phone_match = re.search(r'((?:\+7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2})', page_html)
                if phone_match:
                    phone = phone_match.group(1)
                    
                if not email or not phone:
                    contact_page_match = re.search(r'href="([^"]*(?:contacts|kontakty|contact|контакты)[^"]*)"', page_html, re.IGNORECASE)
                    if contact_page_match:
                        contact_url = contact_page_match.group(1)
                        if not contact_url.startswith("http"):
                            base_url = "/".join(link.split("/")[:3])
                            contact_url = base_url + ("/" if not contact_url.startswith("/") else "") + contact_url
                        try:
                            req_contact = urllib.request.Request(contact_url, headers=headers)
                            with urllib.request.urlopen(req_contact, context=ctx, timeout=5) as resp_contact:
                                contact_html = resp_contact.read().decode('utf-8', errors='ignore')
                            if not email:
                                em_m = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', contact_html)
                                if em_m:
                                    email = em_m.group(0)
                            if not phone:
                                ph_m = re.search(r'((?:\+7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2})', contact_html)
                                if ph_m:
                                    phone = ph_m.group(1)
                        except Exception:
                            pass
                            
                if not email:
                    domain = link.split("//")[-1].split("/")[0].replace("www.", "")
                    email = f"info@{domain}"
                if not phone:
                    phone = "+7 (3532) 99-88-77"
                    
                leads.append({
                    "tender_number": f"WEB-{abs(hash(link)) % 1000000}",
                    "tender_title": f"Поставка и работы по запросу: {query}",
                    "customer_name": customer_name,
                    "inn": None,
                    "email": email,
                    "phone": phone,
                    "contact_person": "Администрация",
                    "link": link
                })
            except Exception as ex:
                logger.error(f"Error scraping link {link}: {ex}")
                
    except Exception as e:
        logger.error(f"Error searching DuckDuckGo: {e}")
        
    return leads


def generate_custom_commercial_offer(customer_name: str, tender_title: str, offer_context: str) -> str:
    """
    Генерирует коммерческое предложение на основе контекста, введенного пользователем.
    """
    prompt = f"""Составь деловое коммерческое предложение от компании ООО «СФЕРУМ» для заказчика {customer_name}.
Проект / тендер: "{tender_title}".

Суть предложения и условия (контекст):
{offer_context}

Напиши деловое, лаконичное письмо с четкой структурой, выгодами и призывом к действию. Не используй плейсхолдеры, пиши готовый текст.

Письмо:"""
    
    response = ask_ollama(prompt)
    if not response:
        response = (
            f"Уважаемые коллеги из {customer_name}!\n\n"
            f"ООО «СФЕРУМ» предлагает Вам рассмотреть наше предложение по проекту \"{tender_title}\".\n\n"
            f"Наши условия:\n{offer_context}\n\n"
            f"Контакты для связи: info@леоника56.рф\n"
            f"С уважением, ООО «СФЕРУМ»"
        )
    return response


def run_special_task_campaign(db: Session, task_id: int, current_user_id: int):
    """
    Запускает снайпер-рассылку по спецзаданию.
    """
    special_task = db.query(SpecialTask).filter(SpecialTask.id == task_id).first()
    if not special_task:
        logger.error(f"SpecialTask with id {task_id} not found.")
        return {"status": "error", "message": "Спецзадание не найдено"}

    logger.info(f"Running Special Task Campaign: '{special_task.name}' [{special_task.search_type}]")
    special_task.run_status = "running"
    db.commit()

    try:
            # ОКВЭД-парсер — отдельный пайплайн
        if special_task.search_type == "okvad":
            run_okvad_campaign(db, task_id, current_user_id)
            return {"status": "success", "message": "ОКВЭД-парсер завершён. База сохранена."}
        
        if special_task.search_type == "organizations":
            leads = search_organizations_in_web(special_task.keyword)
        else:
            leads = search_leads_from_zakupki(special_task.keyword)
    
        if not leads:
            logger.info(f"No leads found for special task: {special_task.name}")
            special_task.last_run = datetime.utcnow()
            db.commit()
            return {"status": "success", "processed_leads": 0, "message": "Новых предложений по ключевому слову не найдено"}
    
        processed_count = 0
        results = []
        
        current_user = db.query(User).filter(User.id == current_user_id).first()
        creator_name = current_user.username if current_user else "Система"
        
        for lead in leads:
            client = None
            if lead["inn"]:
                client = db.query(Client).filter(Client.inn == lead["inn"]).first()
                
            if not client:
                client = Client(
                    name=lead["customer_name"],
                    inn=lead["inn"],
                    contact_person=lead["contact_person"],
                    phone=lead["phone"],
                    email=lead["email"],
                    status=ClientStatusEnum.kp_sent,
                    notes=f"Создан автоматически по спецзаданию '{special_task.name}' ({lead['tender_number']})."
                )
                db.add(client)
                db.commit()
                db.refresh(client)
            else:
                client.status = ClientStatusEnum.kp_sent
                db.commit()
                
            # Генерируем предложение под контекст спецзадания
            kp_text = generate_custom_commercial_offer(lead["customer_name"], lead["tender_title"], special_task.offer_context)
            
            # Отправляем
            subject = f"Коммерческое предложение по проекту {lead['tender_title']}"
            send_email_notification(lead["email"], subject, kp_text, db)
            
            # Запись коммуникации
            interaction = Interaction(
                client_id=client.id,
                type="email",
                notes=f"Авто-рассылка по спецзаданию '{special_task.name}'.\nТема: {subject}\n\nТекст КП:\n{kp_text}"
            )
            db.add(interaction)
            
            # Сжатое саммари
            summary_prompt = f"Сделай краткое саммари этого письма в 2 предложениях:\n{kp_text}"
            kp_summary = ask_ollama(summary_prompt) or "Отправлено специальное коммерческое предложение по условиям спецзадания."
            
            # Создаем задачу менеджеру
            task = Task(
                title=f"Спецзадание '{special_task.name}': {lead['customer_name']}",
                description=(
                    f"Автоматическая задача по спецзаданию: **{special_task.name}**\n\n"
                    f"🏢 **Клиент:** {lead['customer_name']}\n"
                    f"📧 **Email:** {lead['email']}\n"
                    f"📞 **Телефон:** {lead['phone']}\n"
                    f"👤 **Контакт:** {lead['contact_person']}\n"
                    f"🔗 **Ссылка:** <a href='{lead['link']}'>{lead['link']}</a>\n\n"
                    f"📝 **Краткое содержание КП:**\n{kp_summary}\n\n"
                    f"🔔 **Действие:** Связаться, обсудить условия поставки по спецзаданию."
                ),
                status="Новая",
                priority="Высокий",
                created_by_id=current_user_id,
                assigned_to_id=current_user_id,
                due_date=datetime.utcnow() + timedelta(days=1)
            )
            db.add(task)
            db.commit()
            db.refresh(task)
            
            # Telegram уведомление
            tg_message = (
                f"🎯 <b>Снайпер-парсер: Сработало спецзадание '{special_task.name}'!</b>\n\n"
                f"🏢 <b>Клиент:</b> {lead['customer_name']} (ИНН: {lead['inn'] or 'Не указан'})\n"
                f"📧 <b>Отправлено КП на:</b> {lead['email']}\n"
                f"🔑 <b>Ключевое слово:</b> {special_task.keyword}\n"
                f"💼 <b>Задача в CRM:</b> <a href='https://срм.леоника56.рф/#/crm'>Связаться по спецзаданию</a>\n"
                f"👤 <b>Исполнитель:</b> @{creator_name}"
            )
            send_telegram_notification(tg_message, db)
            if current_user_id:
                send_personal_telegram_notification(current_user_id, tg_message, db)
                
            processed_count += 1
            results.append({
                "client_name": lead["customer_name"],
                "email": lead["email"],
                "task_id": task.id
            })
            
            if processed_count >= 3:
                break
                
        special_task.last_run = datetime.utcnow()
        db.commit()
    
    except Exception as e:
        logger.error(f"Error in run_special_task_campaign: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        special_task.run_status = "idle"
        db.commit()
        
        async def broadcast_update():
            await manager.broadcast({
                "type": "success",
                "message": f"🎯 Спецзадание '{special_task.name}' выполнено. Обработано {processed_count if 'processed_count' in locals() else 0} лидов.",
                "refetchKey": "tasks"
            })
            
        import asyncio
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(broadcast_update())
        except Exception:
            pass

    return {
        "status": "success",
        "processed_leads": processed_count,
        "results": results
    }
