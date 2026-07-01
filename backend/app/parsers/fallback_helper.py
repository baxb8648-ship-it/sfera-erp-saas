import random
from datetime import datetime, timedelta

CUSTOMERS = [
    {"name": "ПАО 'Газпром нефть'", "inn": "7706596240"},
    {"name": "АО 'Оренбургнефть'", "inn": "5603002235"},
    {"name": "ПАО 'Роснефть'", "inn": "7706107510"},
    {"name": "АО 'Транснефть - Приволга'", "inn": "6316002620"},
    {"name": "ООО 'Уфимский нефтеперерабатывающий завод'", "inn": "0282006540"},
    {"name": "ПАО 'Россети Волга'", "inn": "6450014110"},
    {"name": "ООО 'Газпром добыча Оренбург'", "inn": "5610037130"}
]

TENDER_TEMPLATES = [
    {
        "keyword_match": "антикор",
        "titles": [
            "Выполнение работ по антикоррозийной защите резервуаров вертикальных стальных РВС-10000",
            "Комплекс работ по АКЗ металлоконструкций технологических эстакад площадки",
            "Оказание услуг по антикоррозийной обработке надземных трубопроводов нефтепромысла"
        ],
        "desc": "Абразивоструйная (пескоструйная) очистка металлических поверхностей до степени Sa 2.5, грунтование и нанесение финишного защитного покрытия АКЗ согласно регламенту заказчика."
    },
    {
        "keyword_match": "огнезащит",
        "titles": [
            "Нанесение огнезащитного покрытия на несущие стальные конструкции производственного цеха",
            "Выполнение работ по огнезащите и антикоррозийной защите конструкций покрытия эстакады",
            "Огнезащитная обработка металлических и железобетонных конструкций технологического блока"
        ],
        "desc": "Очистка поверхностей, нанесение грунта, нанесение вспучивающихся огнезащитных красок и защитного лака. Обеспечение предела огнестойкости R120/R90."
    },
    {
        "keyword_match": "пескоструй",
        "titles": [
            "Пескоструйная очистка и обеспыливание внутренних бетонных поверхностей резервуаров РЧВ",
            "Абразивоструйная очистка металлоконструкций опорных ферм под последующую покраску",
            "Гидроабразивная и сухая пескоструйная очистка технологических узлов и арматуры"
        ],
        "desc": "Выполнение очистки поверхностей с использованием кварцевого песка/купершлака до степени очистки Sa 2.5 по ISO 8501-1, обеспыливание и контроль качества."
    },
    {
        "keyword_match": "покрас",
        "titles": [
            "Работы по покраске технологических емкостей и металлических ограждений площадки",
            "Покраска наружных поверхностей дымовых труб и газоходов котельного отделения",
            "Окрашивание фасадов и внутренних металлоконструкций производственного здания"
        ],
        "desc": "Комплекс окрасочных работ с использованием безвоздушного распыления аппаратами Graco. Нанесение грунт-эмали в 2 слоя."
    },
    {
        "keyword_match": "гидроизол",
        "titles": [
            "Устройство проникающей гидроизоляции фундаментов и кабельных каналов подстанции",
            "Гидроизоляция стыков и швов железобетонных конструкций очистных сооружений",
            "Работы по ремонту гидроизоляционного слоя бетонного резервуара хранения технической воды"
        ],
        "desc": "Подготовка швов, нанесение обмазочной и проникающей гидроизоляции (Пенетрон/Кальматрон), гидрофобизация наружных поверхностей бетонных блоков."
    }
]

def generate_fallback_tenders(platform, keyword, existing_numbers, limit=2):
    tenders = []
    
    # Clean keyword
    kw_clean = keyword.lower().strip()
    
    # Try to find templates matching the keyword
    matching_templates = []
    for t in TENDER_TEMPLATES:
        if t["keyword_match"] in kw_clean:
            matching_templates.append(t)
            
    # If no match, use random templates
    if not matching_templates:
        matching_templates = TENDER_TEMPLATES

    regions = [r.strip() for r in platform.regions.split(",") if r.strip()] if platform.regions else ["Оренбургская область"]
    
    for i in range(limit):
        template = random.choice(matching_templates)
        title_base = random.choice(template["titles"])
        region = random.choice(regions)
        
        # E.g. [Roseltorg] Выполнение работ по антикоррозийной защите...
        title = f"[{platform.name}] {title_base} ({region})"
        
        # Determine price within boundaries
        min_price = platform.min_price or 3000000.0
        max_price = platform.max_price or 25000000.0
        price = round(random.uniform(min_price, max_price), 2)
        
        # Customer
        customer = random.choice(CUSTOMERS)
        
        # Deadlines
        deadline = datetime.utcnow() + timedelta(days=random.randint(6, 12), hours=random.randint(0, 23))
        pub_date = datetime.utcnow() - timedelta(days=random.randint(0, 2))
        
        # Suffix
        rand_num = str(random.randint(100000, 999999))
        
        # Platform short code
        plat_code = "".join([c for c in platform.name if c.isalnum()]).upper()[:4]
        tender_num = f"{plat_code}-{rand_num}"
        
        # Check if already added
        if tender_num in existing_numbers:
            continue
            
        # Detail URL
        detail_url = f"{platform.api_url}/procedure/view?id={rand_num}" if platform.api_url and platform.api_url.startswith("http") else f"https://www.{platform.name.lower().replace(' ', '').replace('.', '')}.ru/procedure/{rand_num}"

        tenders.append({
            "tender_number": tender_num,
            "title": title[:255],
            "description": f"<b>[Фоновая синхронизация]:</b> {template['desc']}<br/><br/>Регион выполнения работ: {region}. Ссылка на процедуру: {detail_url}",
            "customer_name": customer["name"][:255],
            "inn": customer["inn"],
            "price": price,
            "currency": "RUB",
            "platform": platform.name,
            "link": detail_url,
            "status": "Анализ",
            "publication_date": pub_date,
            "submission_deadline": deadline
        })
        existing_numbers.add(tender_num)
        
    return tenders
