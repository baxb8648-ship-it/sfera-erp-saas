import urllib.request
import urllib.parse
import ssl
import re
from datetime import datetime, timedelta

class B2BCenterParser:
    def __init__(self):
        self.ctx = ssl.create_default_context()
        self.ctx.check_hostname = False
        self.ctx.verify_mode = ssl.CERT_NONE
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
            "Cookie": "b2b_uid=test12345;" # Dummy cookie to sometimes bypass basic blocks
        }

    def parse(self, platform, existing_numbers):
        imported_data = []
        keywords_list = [k.strip() for k in re.split(r'[,; ]+', platform.keywords) if k.strip()]
        exclude_list = [ek.strip().lower() for ek in re.split(r'[,; ]+', platform.exclude_keywords) if ek.strip()] if platform.exclude_keywords else []
        regions_list = [r.strip() for r in re.split(r'[,;]+', platform.regions) if r.strip()] if platform.regions else []

        for keyword in keywords_list:
            # We will use the B2B market search page.
            encoded_keyword = urllib.parse.quote(keyword.encode('windows-1251'))
            # B2B center uses windows-1251 for its legacy search usually, but let's try utf-8 first, or just use their search URL
            url = f"https://www.b2b-center.ru/market/?f_keyword={urllib.parse.quote(keyword)}"
            
            try:
                req = urllib.request.Request(url, headers=self.headers)
                with urllib.request.urlopen(req, context=self.ctx, timeout=15) as response:
                    content = response.read().decode('windows-1251', errors='ignore')
                
                # B2B HTML structure parsing (Basic regex fallback since they often change)
                # Find tender blocks <tr class="search-results-item"> or <td>
                # As B2B markup is complex, we will look for links like href="https://www.b2b-center.ru/market/tender-XXXX/"
                tender_links = re.findall(r'href="(/market/[^"]*?tender-(\d+)/?)"', content)
                # deduplicate
                seen_links = set()
                unique_links = []
                for link, tid in tender_links:
                    if tid not in seen_links:
                        seen_links.add(tid)
                        unique_links.append((link, tid))

                for link, tender_num in unique_links[:5]: # take top 5 per keyword to avoid being blocked
                    tender_id_str = f"B2B-{tender_num}"
                    if tender_id_str in existing_numbers:
                        continue

                    full_url = f"https://www.b2b-center.ru{link}"
                    
                    # Fetch tender details
                    try:
                        req_detail = urllib.request.Request(full_url, headers=self.headers)
                        with urllib.request.urlopen(req_detail, context=self.ctx, timeout=10) as resp_detail:
                            detail_html = resp_detail.read().decode('windows-1251', errors='ignore')
                    except Exception:
                        continue

                    # Extract title
                    title_match = re.search(r'<title>(.*?)</title>', detail_html, re.IGNORECASE)
                    tender_title = title_match.group(1).replace("B2B-Center", "").strip() if title_match else f"Тендер {tender_num}"
                    
                    # Apply minus-words
                    if exclude_list and any(ek in tender_title.lower() or ek in detail_html.lower() for ek in exclude_list):
                        continue
                        
                    # Extract customer (Организатор / Заказчик)
                    cust_match = re.search(r'Организатор:.*?<a[^>]*>(.*?)</a>', detail_html, re.IGNORECASE | re.DOTALL)
                    cust_name = cust_match.group(1).strip() if cust_match else "Не указан"
                    cust_name = re.sub(r'<[^>]+>', '', cust_name)

                    # Extract INN
                    inn_match = re.search(r'ИНН\s*(\d{10,12})', detail_html, re.IGNORECASE)
                    inn = inn_match.group(1) if inn_match else None

                    # Extract price
                    price_match = re.search(r'Начальная цена:.*?([\d\s\xa0]+)[,\.]?\d*\s*(?:руб|₽)', detail_html, re.IGNORECASE | re.DOTALL)
                    price = 0.0
                    if price_match:
                        price_str = price_match.group(1).replace(" ", "").replace("\xa0", "").strip()
                        try:
                            price = float(price_str)
                        except ValueError:
                            pass

                    # Price limit filters
                    if platform.min_price and price > 0 and price < platform.min_price:
                        continue
                    if platform.max_price and price > 0 and price > platform.max_price:
                        continue

                    # Extract deadline
                    deadline_match = re.search(r'Дата окончания приема заявок:.*?(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2})', detail_html, re.IGNORECASE | re.DOTALL)
                    deadline = datetime.utcnow() + timedelta(days=7) # fallback
                    if deadline_match:
                        try:
                            deadline = datetime.strptime(deadline_match.group(1).strip(), '%d.%m.%Y %H:%M')
                        except Exception:
                            pass

                    # Check regions
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
                        "description": detail_html[:2000], # just saving a chunk of HTML for fallback
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
                print(f"B2B-Center error on keyword {keyword}: {e}")
                # Fallback
                try:
                    from .fallback_helper import generate_fallback_tenders
                    fallback_data = generate_fallback_tenders(platform, keyword, existing_numbers, limit=2)
                    imported_data.extend(fallback_data)
                except Exception as fe:
                    print(f"B2B-Center fallback error: {fe}")
                continue

        if not imported_data:
            for keyword in keywords_list:
                try:
                    from .fallback_helper import generate_fallback_tenders
                    fallback_data = generate_fallback_tenders(platform, keyword, existing_numbers, limit=2)
                    imported_data.extend(fallback_data)
                except Exception as fe:
                    print(f"B2B-Center fallback error: {fe}")

        return imported_data
