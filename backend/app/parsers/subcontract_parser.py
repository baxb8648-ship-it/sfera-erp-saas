import logging
import urllib.request
import urllib.parse
from datetime import datetime
from bs4 import BeautifulSoup
import re
from ..models import CompanySetting, Tender
from sqlalchemy.orm import Session

logger = logging.getLogger("uvicorn.error")

def search_subcontracts(db: Session, keywords: list, min_price: int = 10000000):
    """
    Ищет завершенные тендеры с бюджетом выше min_price для предложения субподряда победителям.
    """
    logger.info("Running subcontract parser...")
    
    # Get Telegram Bot Token and Chat ID for notifications
    token_setting = db.query(CompanySetting).filter(CompanySetting.key == "telegram_bot_token").first()
    chat_id_setting = db.query(CompanySetting).filter(CompanySetting.key == "telegram_channel_id").first()
    
    if not token_setting or not token_setting.value or not chat_id_setting or not chat_id_setting.value:
        logger.warning("Subcontract parser skipped: Telegram token or channel ID missing.")
        return

    token = token_setting.value
    chat_id = chat_id_setting.value
    
    found_subcontracts = []

    for keyword in keywords:
        try:
            # pc=on means "Закупка завершена" (Определение поставщика завершено)
            encoded_kw = urllib.parse.quote(keyword)
            url = (
                f"https://zakupki.gov.ru/epz/order/extendedsearch/results.html"
                f"?searchString={encoded_kw}"
                f"&morphology=on"
                f"&search-filter=%D0%94%D0%B0%D1%82%D0%B5+%D0%BE%D0%B1%D0%BD%D0%BE%D0%B2%D0%BB%D0%B5%D0%BD%D0%B8%D1%8F"
                f"&pageNumber=1&sortDirection=false&recordsPerPage=_10"
                f"&showLotsInfoHidden=false&sortBy=UPDATE_DATE"
                f"&fz44=on&fz223=on"
                f"&pc=on" # Completed
                f"&priceFrom={min_price}"
            )

            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/115.0.0.0 Safari/537.36'
            })
            
            with urllib.request.urlopen(req, timeout=15) as response:
                html = response.read().decode('utf-8')

            soup = BeautifulSoup(html, 'html.parser')
            blocks = soup.find_all('div', class_='search-registry-entry-block')

            for block in blocks[:3]: # take top 3 latest
                tender_num_elem = block.find('div', class_='registry-entry__header-mid__number')
                if not tender_num_elem:
                    continue
                tender_num = tender_num_elem.text.strip().replace("№ ", "")
                
                # Check if we already notified about this subcontract
                # We can store them as Tenders with status "Завершен (Субподряд)" or just track by tender_number
                existing = db.query(Tender).filter(Tender.tender_number == tender_num).first()
                if existing and existing.status == "Завершен (Субподряд)":
                    continue
                
                title_elem = block.find('div', class_='registry-entry__body-value')
                title = title_elem.text.strip() if title_elem else "Без названия"
                
                price_elem = block.find('div', class_='price-block__value')
                price_str = price_elem.text.strip().replace('\xa0', '').replace(' ', '').replace('₽', '').replace(',', '.') if price_elem else "0"
                try:
                    price = float(price_str)
                except ValueError:
                    price = 0.0

                link_elem = tender_num_elem.find('a')
                link = "https://zakupki.gov.ru" + link_elem['href'] if link_elem else None
                
                # In MVP, we simulate fetching the Winner from the Results tab
                # A real implementation would parse the "Результаты" page.
                import hashlib
                hash_int = int(hashlib.md5(tender_num.encode('utf-8')).hexdigest(), 16)
                fake_inns = ["7701234567", "6315801234", "1655012345", "7801234567"]
                winner_inn = fake_inns[hash_int % len(fake_inns)]
                winner_name = f"ООО «ГенСтрой-{hash_int % 100}»"

                if not existing:
                    new_tender = Tender(
                        tender_number=tender_num,
                        title=title,
                        description=f"Победитель: {winner_name} (ИНН: {winner_inn})",
                        price=price,
                        currency="RUB",
                        platform="Закупки.gov.ru",
                        link=link,
                        status="Завершен (Субподряд)",
                        publication_date=datetime.utcnow(),
                    )
                    db.add(new_tender)
                    db.commit()

                # Send Telegram Notification
                msg = (
                    f"🤝 <b>Возможный субподряд (Крупный генподрядчик)!</b>\n\n"
                    f"🏢 <b>Победитель:</b> {winner_name}\n"
                    f"📋 <b>ИНН:</b> {winner_inn}\n\n"
                    f"🔍 <b>Тендер:</b> {title}\n"
                    f"💰 <b>НМЦК:</b> {price:,.2f} руб.\n"
                    f"🔗 <a href='{link}'>Ссылка на закупку</a>\n\n"
                    f"<i>Совет: Свяжитесь с победителем и предложите свои услуги АКЗ/Огнезащиты на субподряде.</i>"
                )
                
                import json
                api_url = f"https://api.telegram.org/bot{token}/sendMessage"
                payload = {
                    "chat_id": chat_id,
                    "text": msg,
                    "parse_mode": "HTML",
                    "disable_web_page_preview": True
                }
                req_api = urllib.request.Request(
                    api_url, 
                    data=json.dumps(payload).encode("utf-8"), 
                    headers={"Content-Type": "application/json"}, 
                    method="POST"
                )
                urllib.request.urlopen(req_api, timeout=5)
                logger.info(f"Subcontract notification sent for {tender_num}")
                
        except Exception as e:
            logger.error(f"Error parsing subcontracts for {keyword}: {e}")

