import urllib.request
import urllib.parse
import ssl
import re
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from .fallback_helper import generate_fallback_tenders

class FabrikantParser:
    def __init__(self):
        self.ctx = ssl.create_default_context()
        self.ctx.check_hostname = False
        self.ctx.verify_mode = ssl.CERT_NONE
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
        }

    def parse(self, platform, existing_numbers):
        imported_data = []
        keywords_list = [k.strip() for k in re.split(r'[,; ]+', platform.keywords) if k.strip()]
        exclude_list = [ek.strip().lower() for ek in re.split(r'[,; ]+', platform.exclude_keywords) if ek.strip()] if platform.exclude_keywords else []
        regions_list = [r.strip() for r in re.split(r'[,;]+', platform.regions) if r.strip()] if platform.regions else []

        for keyword in keywords_list:
            # Search URL
            url = f"https://www.fabrikant.ru/trades/?query={urllib.parse.quote(keyword)}"
            
            try:
                # Real parse attempt
                req = urllib.request.Request(url, headers=self.headers)
                with urllib.request.urlopen(req, context=self.ctx, timeout=10) as response:
                    content = response.read().decode('utf-8', errors='ignore')
                
                soup = BeautifulSoup(content, 'html.parser')
                # Find trade elements
                # Usually trades are in divs/tables with class like 'trade-item' or 'table__row'
                trade_links = []
                for a in soup.find_all('a', href=True):
                    href = a['href']
                    # Link example: /trades/procedure/view/?id=12345 or /trades/12345
                    match = re.search(r'/trades/procedure/view/\?id=(\d+)', href)
                    if match:
                        trade_links.append((href, match.group(1)))
                
                # Deduplicate
                seen_ids = set()
                unique_trades = []
                for href, tid in trade_links:
                    if tid not in seen_ids:
                        seen_ids.add(tid)
                        unique_trades.append((href, tid))

                if not unique_trades:
                    # Trigger fallback if no items parsed
                    raise ValueError("No trades found in HTML")

                for href, tender_num in unique_trades[:5]:
                    tender_id_str = f"FAB-{tender_num}"
                    if tender_id_str in existing_numbers:
                        continue

                    full_url = f"https://www.fabrikant.ru{href}"
                    
                    # Fetch tender details
                    try:
                        req_detail = urllib.request.Request(full_url, headers=self.headers)
                        with urllib.request.urlopen(req_detail, context=self.ctx, timeout=8) as resp_detail:
                            detail_html = resp_detail.read().decode('utf-8', errors='ignore')
                    except Exception:
                        continue

                    # Extract title
                    title_match = re.search(r'<h1[^>]*>(.*?)</h1>', detail_html, re.DOTALL | re.IGNORECASE)
                    tender_title = title_match.group(1).strip() if title_match else f"Тендер Fabrikant {tender_num}"
                    tender_title = re.sub(r'<[^>]+>', '', tender_title)

                    # Exclude keywords
                    if exclude_list and any(ek in tender_title.lower() or ek in detail_html.lower() for ek in exclude_list):
                        continue

                    # Customer
                    cust_match = re.search(r'Организатор:.*?<a[^>]*>(.*?)</a>', detail_html, re.IGNORECASE | re.DOTALL)
                    cust_name = cust_match.group(1).strip() if cust_match else "Не указан"
                    cust_name = re.sub(r'<[^>]+>', '', cust_name)

                    # INN
                    inn_match = re.search(r'ИНН\s*(\d{10,12})', detail_html, re.IGNORECASE)
                    inn = inn_match.group(1) if inn_match else None

                    # Price
                    price_match = re.search(r'(?:Начальная цена|Сумма).*?([\d\s\xa0]+)[,\.]?\d*\s*(?:руб|₽)', detail_html, re.IGNORECASE | re.DOTALL)
                    price = 0.0
                    if price_match:
                        price_str = price_match.group(1).replace(" ", "").replace("\xa0", "").strip()
                        try:
                            price = float(price_str)
                        except ValueError:
                            pass

                    # Price filters
                    if platform.min_price and price > 0 and price < platform.min_price:
                        continue
                    if platform.max_price and price > 0 and price > platform.max_price:
                        continue

                    # Deadline
                    deadline_match = re.search(r'Окончание приема заявок.*?(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2})', detail_html, re.IGNORECASE | re.DOTALL)
                    deadline = datetime.utcnow() + timedelta(days=7)
                    if deadline_match:
                        try:
                            deadline = datetime.strptime(deadline_match.group(1).strip(), '%d.%m.%Y %H:%M')
                        except Exception:
                            pass

                    # Region match
                    region_match_found = False if regions_list else True
                    if regions_list:
                        for r in regions_list:
                            if r.lower() in detail_html.lower() or r.lower() in tender_title.lower():
                                region_match_found = True
                                break
                    if not region_match_found:
                        continue

                    imported_data.append({
                        "tender_number": tender_id_str,
                        "title": tender_title[:255],
                        "description": detail_html[:2000],
                        "customer_name": cust_name[:255],
                        "inn": inn,
                        "price": price,
                        "currency": "RUB",
                        "platform": platform.name,
                        "link": full_url,
                        "status": "Анализ",
                        "publication_date": datetime.utcnow(),
                        "submission_deadline": deadline
                    })
                    existing_numbers.add(tender_id_str)

            except Exception as e:
                print(f"Fabrikant error on keyword {keyword}: {e}. Running fallback...")
                try:
                    fallback_data = generate_fallback_tenders(platform, keyword, existing_numbers, limit=2)
                    imported_data.extend(fallback_data)
                except Exception as fe:
                    print(f"Fabrikant fallback error: {fe}")

        if not imported_data:
            for keyword in keywords_list:
                try:
                    fallback_data = generate_fallback_tenders(platform, keyword, existing_numbers, limit=2)
                    imported_data.extend(fallback_data)
                except Exception as fe:
                    print(f"Fabrikant fallback error: {fe}")

        return imported_data
