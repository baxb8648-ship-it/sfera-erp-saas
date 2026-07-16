import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import tempfile

from ..database import get_db
from ..models import Document, User, Client, Object, CompanySetting, DocumentTemplate
from ..schemas import DocumentBase, DocumentResponse, KPCreateSchema, InvoiceCreateSchema, EmailSendSchema, FacturaCreateSchema, UPDCreateSchema
from .auth import get_current_user
from ..services.document_generator import generate_tender_document

router = APIRouter(prefix="/documents", tags=["Documents"])

def get_settings_dict(db: Session, tenant_id: int = None) -> dict:
    from .settings import ensure_active_organization, DEFAULT_SETTINGS
    active_org = ensure_active_organization(db, tenant_id=tenant_id)
    
    settings_dict = {
        "company_name": active_org.name or "",
        "company_subtitle": active_org.subtitle or "",
        "company_legal_name": active_org.legal_name or "",
        "company_inn": active_org.inn or "",
        "company_kpp": active_org.kpp or "",
        "company_address": active_org.address or "",
        "company_phone": active_org.phone or "",
        "company_email": active_org.email or "",
        "company_website": active_org.website or "",
        "company_website_url": active_org.website_url or "",
        "company_regions": active_org.regions or "",
        "company_director": active_org.director or "",
        "company_bank_name": active_org.bank_name or "",
        "company_bik": active_org.bik or "",
        "company_rs": active_org.rs or "",
        "company_ks": active_org.ks or "",
        "company_bank_name_materials": active_org.bank_name_materials or "",
        "company_bik_materials": active_org.bik_materials or "",
        "company_rs_materials": active_org.rs_materials or "",
        "company_ks_materials": active_org.ks_materials or "",
    }
    
    # Load general settings
    for key in ["contract_template", "invoice_disclaimer", "factura_disclaimer", "upd_disclaimer"]:
        query = db.query(CompanySetting).filter(CompanySetting.key == key)
        if tenant_id:
            query = query.filter(CompanySetting.tenant_id == tenant_id)
        db_setting = query.first()
        settings_dict[key] = db_setting.value if db_setting else DEFAULT_SETTINGS.get(key)
        
    return settings_dict



def draw_branding_header(c, font_name, font_bold_name, settings, draw_qr=True):
    # 1. Draw branding header (СФЕРУМ)
    c.setFont(font_bold_name, 22)
    c.setFillColorRGB(0.97, 0.34, 0.0) # #F95700
    c.drawString(54, 780, settings.get("company_name", "СФЕРУМ"))
    
    c.setFont(font_name, 10)
    c.setFillColorRGB(0.3, 0.3, 0.3)
    c.drawString(54, 765, settings.get("company_subtitle", "Промышленная группа"))
    
    # Draw horizontal orange accent line
    c.setStrokeColorRGB(0.97, 0.34, 0.0)
    c.setLineWidth(2)
    c.line(54, 755, 540, 755)
    
    # Draw company contact details
    c.setFont(font_name, 8)
    c.setFillColorRGB(0.5, 0.5, 0.5)
    contact_str = f"Адрес: {settings.get('company_address', '')} | Тел: {settings.get('company_phone', '')} | Email: {settings.get('company_email', '')}"
    c.drawString(54, 742, contact_str)
    
    # Reset fill colors
    c.setFillColorRGB(0.1, 0.1, 0.1)

    # Draw dynamic QR code in the top right of the header
    if draw_qr:
        website_url = settings.get("company_website_url") or settings.get("company_website")
        if website_url:
            try:
                from reportlab.graphics.shapes import Drawing
                from reportlab.graphics.barcode.qr import QrCodeWidget
                from reportlab.graphics import renderPDF
                
                qr_drawing = Drawing(45, 45)
                qr_widget = QrCodeWidget(website_url, barWidth=45, barHeight=45)
                qr_drawing.add(qr_widget)
                renderPDF.draw(qr_drawing, c, 495, 760)
            except Exception as e:
                print(f"Error rendering QR code in PDF: {e}")

def num2text_ru(amount: float) -> str:
    # Split into rubles and kopecks
    rubles = int(amount)
    kopecks = int(round((amount - rubles) * 100))
    
    # helper for three-digit groups
    units_m = (
        ("", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"),
        ("", "десять", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"),
        ("", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот")
    )
    
    units_f = (
        ("", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"),
        ("", "десять", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"),
        ("", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот")
    )
    
    teens = ("десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать", "пятнадцать", "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать")
    
    def get_group_words(val: int, is_feminine: bool = False) -> str:
        if val == 0:
            return ""
        
        words = []
        h = val // 100
        t = (val % 100) // 10
        u = val % 10
        
        dict_words = units_f if is_feminine else units_m
        
        if h > 0:
            words.append(dict_words[2][h])
            
        if t == 1:
            words.append(teens[u])
        else:
            if t > 0:
                words.append(dict_words[1][t])
            if u > 0:
                words.append(dict_words[0][u])
                
        return " ".join(words)

    # Let's get ruble declensions
    def get_ruble_declension(val: int) -> str:
        t = (val % 100) // 10
        u = val % 10
        if t == 1:
            return "рублей"
        if u == 1:
            return "рубль"
        if u in (2, 3, 4):
            return "рубля"
        return "рублей"

    def get_kopeck_declension(val: int) -> str:
        t = (val % 100) // 10
        u = val % 10
        if t == 1:
            return "копеек"
        if u == 1:
            return "копейка"
        if u in (2, 3, 4):
            return "копейки"
        return "копеек"

    def get_group_declension(group_idx: int, val: int) -> str:
        t = (val % 100) // 10
        u = val % 10
        
        # groups: 0 = units (rubles), 1 = thousands, 2 = millions, 3 = billions
        if group_idx == 1: # thousands
            if t == 1: return "тысяч"
            if u == 1: return "тысяча"
            if u in (2, 3, 4): return "тысячи"
            return "тысяч"
        elif group_idx == 2: # millions
            if t == 1: return "миллионов"
            if u == 1: return "миллион"
            if u in (2, 3, 4): return "миллиона"
            return "миллионов"
        elif group_idx == 3: # billions
            if t == 1: return "миллиардов"
            if u == 1: return "миллиард"
            if u in (2, 3, 4): return "миллиарда"
            return "миллиардов"
        return ""

    if rubles == 0:
        rubles_str = "Ноль рублей"
    else:
        # Split into groups of 3 digits
        groups = []
        tmp = rubles
        while tmp > 0:
            groups.append(tmp % 1000)
            tmp //= 1000
            
        group_words = []
        for i, grp in enumerate(groups):
            if grp == 0:
                continue
            is_fem = (i == 1) # thousands is feminine
            grp_txt = get_group_words(grp, is_fem)
            decl = get_group_declension(i, grp)
            if decl:
                group_words.append(f"{grp_txt} {decl}".strip())
            else:
                group_words.append(grp_txt)
                
        group_words.reverse()
        rubles_str = " ".join(group_words) + " " + get_ruble_declension(rubles)
        # Capitalize first letter
        rubles_str = rubles_str.strip().capitalize()
        
    kopecks_str = f"{kopecks:02d} {get_kopeck_declension(kopecks)}"
    return f"{rubles_str} {kopecks_str}"

@router.post("/generate/{client_id}/{doc_type}")
def generate_document(client_id: int, doc_type: str, object_id: int = None, custom_number: str = None, custom_date: str = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    client_query = db.query(Client).filter(Client.id == client_id)
    if current_user.tenant_id:
        client_query = client_query.filter(Client.tenant_id == current_user.tenant_id)
    client = client_query.first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    obj = None
    if object_id:
        obj_query = db.query(Object).filter(Object.id == object_id)
        if current_user.tenant_id:
            obj_query = obj_query.filter(Object.tenant_id == current_user.tenant_id)
        obj = obj_query.first()

    settings = get_settings_dict(db, tenant_id=current_user.tenant_id)

    # Create PDF
    temp_dir = tempfile.gettempdir()
    filename = f"{doc_type}_{client_id}_{int(datetime.utcnow().timestamp())}.pdf"
    file_path = os.path.join(temp_dir, filename)

    font_name = "Helvetica"
    font_bold_name = "Helvetica-Bold"
    try:
        pdfmetrics.registerFont(TTFont('Arial', 'C:\\Windows\\Fonts\\arial.ttf'))
        font_name = "Arial"
        pdfmetrics.registerFont(TTFont('Arial-Bold', 'C:\\Windows\\Fonts\\arialbd.ttf'))
        font_bold_name = "Arial-Bold"
    except Exception:
        pass

    c = canvas.Canvas(file_path)
    
    # Pre-generate general document numbers
    date_str = custom_date or datetime.now().strftime('%d.%m.%Y')
    contract_no = f"{client_id}-{int(datetime.utcnow().timestamp()) % 10000:04d}"
    doc_number = custom_number or f"{client_id}-{int(datetime.utcnow().timestamp()) % 100000:05d}"
    
    if doc_type == "contract":
        template_text = settings.get("contract_template", "")
        doc_number = custom_number or contract_no
        
        total_price = "0.00"
        if obj:
            total_price = f"{int(obj.area_sqm or 100) * 850:,.2f}".replace(",", " ")
            
        replacements = {
            "{{contract_number}}": doc_number,
            "{{date}}": date_str,
            "{{company_name}}": settings.get("company_name", "СФЕРУМ"),
            "{{company_inn}}": settings.get("company_inn", ""),
            "{{company_address}}": settings.get("company_address", ""),
            "{{company_director}}": settings.get("company_director", ""),
            "{{client_name}}": client.name,
            "{{client_inn}}": client.inn or "Не указан",
            "{{client_kpp}}": client.kpp or "Не указан",
            "{{client_address}}": client.legal_address or "Не указан",
            "{{client_contact}}": client.contact_person or "Не указан",
            "{{client_contact_phone}}": client.phone or "—",
            "{{client_contact_email}}": client.email or "—",
            "{{object_name}}": obj.name if obj else "Без объекта",
            "{{total_price}}": total_price
        }
        
        text = template_text
        for key, val in replacements.items():
            text = text.replace(key, str(val))
            
        # Draw multi-line text
        c.setFont(font_name, 10)
        y = 780
        lines = text.split("\n")
        for line in lines:
            if y < 54:
                c.showPage()
                c.setFont(font_name, 10)
                y = 780
            words = line.split(" ")
            current_line = ""
            for word in words:
                if len(current_line + " " + word) > 80:
                    c.drawString(54, y, current_line)
                    y -= 15
                    if y < 54:
                        c.showPage()
                        c.setFont(font_name, 10)
                        y = 780
                    current_line = word
                else:
                    current_line = (current_line + " " + word).strip()
            
            c.drawString(54, y, current_line)
            y -= 15
            
    elif doc_type == "act":
        # Draw branding header
        draw_branding_header(c, font_name, font_bold_name, settings)
        
        # Act content
        c.setFont(font_bold_name, 14)
        doc_number = custom_number or f"АКТ-{client_id}-{int(datetime.utcnow().timestamp()) % 100000:05d}"
        c.drawString(54, 700, f"АКТ ВЫПОЛНЕННЫХ РАБОТ № {doc_number}")
        c.setFont(font_name, 10)
        c.drawString(54, 685, f"Дата: {date_str}")
        
        # Details
        c.setFont(font_bold_name, 10)
        c.drawString(54, 640, "Заказчик:")
        c.setFont(font_name, 10)
        c.drawString(54, 625, f"Компания: {client.name}")
        c.drawString(54, 610, f"ИНН: {client.inn or 'Не указан'}")
        
        c.setFont(font_bold_name, 10)
        c.drawString(54, 570, "Исполнитель:")
        c.setFont(font_name, 10)
        c.drawString(54, 555, f"Компания: {settings.get('company_legal_name', 'ООО \"ЛЕОНИКА\"')}")
        c.drawString(54, 540, f"ИНН: {settings.get('company_inn', '5629021484')}")
        
        y = 500
        if obj:
            c.setFont(font_bold_name, 10)
            c.drawString(54, y, "Выполненные работы на объекте:")
            c.setFont(font_name, 10)
            c.drawString(54, y - 15, f"Объект: {obj.name} ({obj.surface_type})")
            c.drawString(54, y - 30, f"Объем выполненных работ: {obj.area_sqm} м2")
            c.drawString(54, y - 45, f"Вид работ: {obj.service_required or 'АКЗ'}")
            y -= 75
            
        c.setFont(font_name, 10)
        c.drawString(54, y, "Работы выполнены в полном объеме и в установленные сроки. Стороны претензий не имеют.")
        
        y -= 60
        c.drawString(54, y, "Исполнитель: _________________                  Заказчик: _________________")
        c.drawString(54, y - 15, f"({settings.get('company_director', 'Леонтьев А.В.')})")
        
    elif doc_type == "ks2":
        # Act of acceptance KS-2
        doc_number = custom_number or f"КС2-{client_id}-{int(datetime.utcnow().timestamp()) % 10000:04d}"
        
        # Draw top right info
        c.setFont(font_name, 6)
        c.drawRightString(540, 810, "Унифицированная форма № КС-2")
        c.drawRightString(540, 800, "Утверждена Постановлением Госкомстата")
        c.drawRightString(540, 790, "России от 11.11.99 № 100")
        
        # Draw codes table
        c.rect(430, 705, 110, 75)
        c.line(430, 760, 540, 760)
        c.line(430, 745, 540, 745)
        c.line(430, 730, 540, 730)
        c.line(430, 717, 540, 717)
        c.drawString(435, 765, "Форма по ОКУД")
        c.drawString(435, 750, "по ОКПО")
        c.drawString(435, 735, "по ОКПО")
        c.drawString(435, 722, "по ОКПО")
        c.drawString(435, 708, "Вид деятельности")
        
        c.setFont(font_bold_name, 7)
        c.drawRightString(535, 765, "0322005")
        c.drawRightString(535, 750, "88888888")
        c.drawRightString(535, 735, "77777777")
        c.drawRightString(535, 722, "66666666")
        
        # Main details
        c.setFont(font_name, 8)
        c.drawString(54, 770, f"Инвестор:  —")
        c.drawString(54, 755, f"Заказчик:  {client.name} (ИНН {client.inn or '—'}, КПП {client.kpp or '—'}, {client.legal_address or '—'})")
        c.drawString(54, 740, f"Подрядчик: {settings.get('company_legal_name', '')} (ИНН {settings.get('company_inn', '')}, КПП {settings.get('company_kpp', '')}, {settings.get('company_address', '')})")
        c.drawString(54, 725, f"Стройка:   {obj.name if obj else '—'}")
        c.drawString(54, 710, f"Объект:    {obj.name if obj else '—'}")
        c.drawString(54, 695, f"Договор подряда: Договор подряда № {contract_no} от {date_str}")
        
        # Document title box
        c.rect(54, 630, 486, 50)
        c.line(250, 630, 250, 680)
        c.line(350, 630, 350, 680)
        c.line(54, 655, 350, 655)
        c.line(350, 655, 540, 655)
        
        c.setFont(font_bold_name, 8)
        c.drawCentredString(152, 665, "Номер документа")
        c.drawCentredString(300, 665, "Дата составления")
        c.drawCentredString(445, 665, "Отчетный период")
        c.setFont(font_name, 7)
        c.drawCentredString(395, 638, "С")
        c.drawCentredString(485, 638, "ПО")
        
        c.setFont(font_bold_name, 9)
        c.drawCentredString(152, 640, doc_number)
        c.drawCentredString(300, 640, date_str)
        c.drawCentredString(395, 622, date_str)
        c.drawCentredString(485, 622, date_str)
        
        c.setFont(font_bold_name, 12)
        c.drawCentredString(297, 600, "АКТ О ПРИЕМКЕ ВЫПОЛНЕННЫХ РАБОТ")
        c.setFont(font_name, 7)
        c.drawCentredString(297, 590, "(составляется при приемке выполненных строительно-монтажных работ)")
        
        # Table
        table_top = 560
        c.rect(54, table_top - 20, 486, 20, fill=True, stroke=True)
        c.setStrokeColorRGB(0.7, 0.7, 0.7)
        c.setFillColorRGB(0.95, 0.95, 0.95)
        
        c.setFillColorRGB(0.1, 0.1, 0.1)
        c.setFont(font_bold_name, 7)
        c.drawString(58, table_top - 14, "№")
        c.drawString(78, table_top - 14, "Поз. по смете")
        c.drawString(140, table_top - 14, "Наименование работ / услуг")
        c.drawString(350, table_top - 14, "Ед.")
        c.drawString(380, table_top - 14, "Кол-во")
        c.drawString(425, table_top - 14, "Цена, руб.")
        c.drawString(485, table_top - 14, "Стоимость, руб.")
        
        # Draw table rows
        c.setFont(font_name, 8)
        current_y = table_top - 20
        
        # Row 1 (default work item)
        current_y -= 30
        c.rect(54, current_y, 486, 30)
        c.drawString(58, current_y + 10, "1")
        c.drawString(78, current_y + 10, "1")
        
        work_name = obj.service_required if obj and obj.service_required else "Антикоррозийная защита (АКЗ)"
        obj_area = obj.area_sqm if obj and obj.area_sqm else 100.0
        price_val = 850.0
        total_val = obj_area * price_val
        
        c.drawString(140, current_y + 10, f"{work_name} на объекте {obj.name if obj else '—'}")
        c.drawString(350, current_y + 10, "м2")
        c.drawString(380, current_y + 10, f"{obj_area:.1f}")
        c.drawString(425, current_y + 10, f"{price_val:,.2f}".replace(",", " "))
        c.drawString(485, current_y + 10, f"{total_val:,.2f}".replace(",", " "))
        
        # Totals
        current_y -= 20
        c.rect(54, current_y, 486, 20)
        c.setFont(font_bold_name, 8)
        c.drawString(78, current_y + 6, "Итого стоимость выполненных работ:")
        c.drawString(485, current_y + 6, f"{total_val:,.2f}".replace(",", " "))
        
        # Signatures
        current_y -= 60
        c.setFont(font_name, 8)
        director_name = settings.get('company_director', 'Леонтьев А.В.')
        c.drawString(54, current_y, f"Сдал (Подрядчик): Генеральный директор ___________________ ({director_name})")
        c.drawString(54, current_y - 25, f"Принял (Заказчик): Представитель заказчика ___________________ ({client.contact_person or '—'})")
        
    elif doc_type == "ks3":
        # Справка о стоимости выполненных работ и затрат KS-3
        doc_number = custom_number or f"КС3-{client_id}-{int(datetime.utcnow().timestamp()) % 10000:04d}"
        
        # Draw top right info
        c.setFont(font_name, 6)
        c.drawRightString(540, 810, "Унифицированная форма № КС-3")
        c.drawRightString(540, 800, "Утверждена Постановлением Госкомстата")
        c.drawRightString(540, 790, "России от 11.11.99 № 100")
        
        # Draw codes table
        c.rect(430, 705, 110, 75)
        c.line(430, 760, 540, 760)
        c.line(430, 745, 540, 745)
        c.line(430, 730, 540, 730)
        c.line(430, 717, 540, 717)
        c.drawString(435, 765, "Форма по ОКУД")
        c.drawString(435, 750, "по ОКПО")
        c.drawString(435, 735, "по ОКПО")
        c.drawString(435, 722, "по ОКПО")
        c.drawString(435, 708, "Вид деятельности")
        
        c.setFont(font_bold_name, 7)
        c.drawRightString(535, 765, "0322001")
        c.drawRightString(535, 750, "88888888")
        c.drawRightString(535, 735, "77777777")
        c.drawRightString(535, 722, "66666666")
        
        # Main details
        c.setFont(font_name, 8)
        c.drawString(54, 770, f"Инвестор:  —")
        c.drawString(54, 755, f"Заказчик:  {client.name} (ИНН {client.inn or '—'}, КПП {client.kpp or '—'}, {client.legal_address or '—'})")
        c.drawString(54, 740, f"Подрядчик: {settings.get('company_legal_name', '')} (ИНН {settings.get('company_inn', '')}, КПП {settings.get('company_kpp', '')}, {settings.get('company_address', '')})")
        c.drawString(54, 725, f"Стройка:   {obj.name if obj else '—'}")
        c.drawString(54, 710, f"Объект:    {obj.name if obj else '—'}")
        c.drawString(54, 695, f"Договор подряда: Договор подряда № {contract_no} от {date_str}")
        
        # Document title box
        c.rect(54, 630, 486, 50)
        c.line(250, 630, 250, 680)
        c.line(350, 630, 350, 680)
        c.line(54, 655, 350, 655)
        c.line(350, 655, 540, 655)
        
        c.setFont(font_bold_name, 8)
        c.drawCentredString(152, 665, "Номер документа")
        c.drawCentredString(300, 665, "Дата составления")
        c.drawCentredString(445, 665, "Отчетный период")
        c.setFont(font_name, 7)
        c.drawCentredString(395, 638, "С")
        c.drawCentredString(485, 638, "ПО")
        
        c.setFont(font_bold_name, 9)
        c.drawCentredString(152, 640, doc_number)
        c.drawCentredString(300, 640, date_str)
        c.drawCentredString(395, 622, date_str)
        c.drawCentredString(485, 622, date_str)
        
        c.setFont(font_bold_name, 11)
        c.drawCentredString(297, 600, "СПРАВКА О СТОИМОСТИ ВЫПОЛНЕННЫХ РАБОТ И ЗАТРАТ")
        
        # Table
        table_top = 560
        c.rect(54, table_top - 30, 486, 30, fill=True, stroke=True)
        c.setStrokeColorRGB(0.7, 0.7, 0.7)
        c.setFillColorRGB(0.95, 0.95, 0.95)
        
        c.setFillColorRGB(0.1, 0.1, 0.1)
        c.setFont(font_bold_name, 7)
        c.drawString(58, table_top - 20, "№")
        c.drawString(78, table_top - 20, "Наименование пусковых комплексов, объектов, видов работ")
        c.drawString(295, table_top - 20, "Код")
        c.drawString(320, table_top - 20, "С начала работ")
        c.drawString(395, table_top - 20, "С начала года")
        c.drawString(470, table_top - 20, "За отчетный период")
        
        # Draw table rows
        c.setFont(font_name, 8)
        current_y = table_top - 30
        
        # Row 1 (default work item)
        current_y -= 30
        c.rect(54, current_y, 486, 30)
        c.drawString(58, current_y + 10, "1")
        
        obj_area = obj.area_sqm if obj and obj.area_sqm else 100.0
        price_val = 850.0
        total_val = obj_area * price_val
        
        c.drawString(78, current_y + 10, f"Строительно-монтажные работы по объекту {obj.name if obj else '—'}")
        c.drawString(295, current_y + 10, "—")
        c.drawString(320, current_y + 10, f"{total_val:,.2f}".replace(",", " "))
        c.drawString(395, current_y + 10, f"{total_val:,.2f}".replace(",", " "))
        c.drawString(470, current_y + 10, f"{total_val:,.2f}".replace(",", " "))
        
        # Totals
        current_y -= 20
        c.rect(54, current_y, 486, 20)
        c.setFont(font_bold_name, 8)
        c.drawString(78, current_y + 6, "Итого:")
        c.drawString(320, current_y + 6, f"{total_val:,.2f}".replace(",", " "))
        c.drawString(395, current_y + 6, f"{total_val:,.2f}".replace(",", " "))
        c.drawString(470, current_y + 6, f"{total_val:,.2f}".replace(",", " "))
        
        # VAT
        current_y -= 20
        c.rect(54, current_y, 486, 20)
        c.drawString(78, current_y + 6, "В том числе НДС:")
        c.drawString(320, current_y + 6, "Без НДС")
        c.drawString(395, current_y + 6, "Без НДС")
        c.drawString(470, current_y + 6, "Без НДС")
        
        # Всего
        current_y -= 20
        c.rect(54, current_y, 486, 20)
        c.drawString(78, current_y + 6, "Всего стоимость выполненных работ:")
        c.drawString(320, current_y + 6, f"{total_val:,.2f}".replace(",", " "))
        c.drawString(395, current_y + 6, f"{total_val:,.2f}".replace(",", " "))
        c.drawString(470, current_y + 6, f"{total_val:,.2f}".replace(",", " "))
        
        # Signatures
        current_y -= 50
        c.setFont(font_name, 8)
        director_name = settings.get('company_director', 'Леонтьев А.В.')
        c.drawString(54, current_y, f"Заказчик: Представитель заказчика ___________________ ({client.contact_person or '—'})")
        c.drawString(54, current_y - 25, f"Подрядчик: Генеральный директор ___________________ ({director_name})")
        
    else:
        c.setFont(font_name, 12)
        c.drawString(100, 800, f"Документ: {doc_type}")
        c.drawString(100, 760, f"Заказчик: {client.name}")
        c.drawString(100, 740, f"Дата: {date_str}")

    c.save()

    # Save to DB
    doc_name = "Документ"
    if doc_type == "contract":
        doc_name = f"Договор подряда № {doc_number}"
    elif doc_type == "act":
        doc_name = f"Акт выполненных работ № {doc_number}"
    elif doc_type == "ks2":
        doc_name = f"Акт КС-2 № {doc_number}"
    elif doc_type == "ks3":
        doc_name = f"Справка КС-3 № {doc_number}"

    new_doc = Document(
        client_id=client_id,
        object_id=object_id,
        doc_type=doc_type,
        name=doc_name,
        is_uploaded=0,
        file_url=file_path,
        tenant_id=current_user.tenant_id
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    return {"id": new_doc.id, "file_path": file_path, "message": "Документ успешно сгенерирован"}

@router.post("/generate-kp")
def generate_kp(payload: KPCreateSchema, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    client_query = db.query(Client).filter(Client.id == payload.client_id)
    if current_user.tenant_id:
        client_query = client_query.filter(Client.tenant_id == current_user.tenant_id)
    client = client_query.first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    obj = None
    if payload.object_id:
        obj_query = db.query(Object).filter(Object.id == payload.object_id)
        if current_user.tenant_id:
            obj_query = obj_query.filter(Object.tenant_id == current_user.tenant_id)
        obj = obj_query.first()

    settings = get_settings_dict(db, tenant_id=current_user.tenant_id)

    # Create PDF
    temp_dir = tempfile.gettempdir()
    filename = f"kp_{payload.client_id}_{int(datetime.utcnow().timestamp())}.pdf"
    file_path = os.path.join(temp_dir, filename)

    font_name = "Helvetica"
    font_bold_name = "Helvetica-Bold"
    try:
        pdfmetrics.registerFont(TTFont('Arial', 'C:\\Windows\\Fonts\\arial.ttf'))
        font_name = "Arial"
        pdfmetrics.registerFont(TTFont('Arial-Bold', 'C:\\Windows\\Fonts\\arialbd.ttf'))
        font_bold_name = "Arial-Bold"
    except Exception:
        pass

    c = canvas.Canvas(file_path)
    
    # 1. Draw branding header
    draw_branding_header(c, font_name, font_bold_name, settings)
    
    # 2. Document Title
    c.setFont(font_bold_name, 14)
    kp_number = payload.custom_number or f"КП-{payload.client_id}-{int(datetime.utcnow().timestamp()) % 100000:05d}"
    c.drawString(54, 700, f"КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ № {kp_number}")
    c.setFont(font_name, 10)
    date_str = payload.custom_date or datetime.now().strftime('%d.%m.%Y')
    c.drawString(54, 685, f"Дата: {date_str}")
    
    # 3. Client details
    c.setFont(font_bold_name, 10)
    c.drawString(54, 650, "Получатель (Заказчик):")
    c.setFont(font_name, 10)
    c.drawString(54, 635, f"Компания: {client.name}")
    c.drawString(54, 620, f"ИНН: {client.inn or 'Не указан'}")
    if client.contact_person:
        c.drawString(54, 605, f"Вниманию: {client.contact_person}")
    
    # Object info if available
    start_y = 575
    if obj:
        c.setFont(font_bold_name, 10)
        c.drawString(54, 590, "Объект:")
        c.setFont(font_name, 10)
        c.drawString(54, 575, f"Наименование: {obj.name} ({obj.surface_type}, {obj.area_sqm} м2)")
        start_y = 550

    # 4. Table header
    table_top = start_y - 20
    c.setStrokeColorRGB(0.8, 0.8, 0.8)
    c.setLineWidth(1)
    
    # Header background fill
    c.setFillColorRGB(0.95, 0.95, 0.95)
    c.rect(54, table_top - 20, 486, 20, fill=True, stroke=True)
    
    c.setFillColorRGB(0.1, 0.1, 0.1)
    c.setFont(font_bold_name, 9)
    c.drawString(60, table_top - 14, "№")
    c.drawString(85, table_top - 14, "Наименование услуги")
    c.drawString(290, table_top - 14, "Ед.")
    c.drawString(330, table_top - 14, "Кол-во")
    c.drawString(380, table_top - 14, "Цена, руб.")
    c.drawString(460, table_top - 14, "Сумма, руб.")
    
    # Draw table rows
    c.setFont(font_name, 9)
    current_y = table_top - 20
    total_amount = 0.0
    
    for idx, item in enumerate(payload.items):
        current_y -= 20
        c.rect(54, current_y, 486, 20, fill=False, stroke=True)
        
        c.drawString(60, current_y + 6, str(idx + 1))
        name_str = item.name[:38] + "..." if len(item.name) > 40 else item.name
        c.drawString(85, current_y + 6, name_str)
        c.drawString(290, current_y + 6, item.unit)
        c.drawString(330, current_y + 6, f"{item.quantity:.1f}")
        c.drawString(380, current_y + 6, f"{item.price:,.2f}".replace(",", " "))
        
        item_sum = item.quantity * item.price
        total_amount += item_sum
        c.drawString(460, current_y + 6, f"{item_sum:,.2f}".replace(",", " "))
        
    # Draw Total row
    current_y -= 25
    c.setFont(font_bold_name, 10)
    c.drawString(335, current_y + 6, "ИТОГО:")
    c.drawString(460, current_y + 6, f"{total_amount:,.2f} руб.".replace(",", " "))
    
    current_y -= 15
    c.setFont(font_name, 8)
    c.setFillColorRGB(0.4, 0.4, 0.4)
    c.drawString(54, current_y, "НДС не облагается в связи с применением УСН. Срок действия предложения: 30 календарных дней.")
    
    # 5. Signatures
    current_y -= 60
    c.setFillColorRGB(0.1, 0.1, 0.1)
    c.setFont(font_name, 10)
    c.drawString(54, current_y, "Исполнитель:")
    c.drawString(54, current_y - 20, f"Генеральный директор {settings.get('company_legal_name', 'ИП Леонтьев А.В.')} ___________________")
    c.drawString(54, current_y - 40, "М.П.")
    
    c.save()

    # Save to DB
    new_doc = Document(
        client_id=payload.client_id,
        object_id=payload.object_id,
        doc_type="kp",
        name=f"Коммерческое предложение № {kp_number}",
        is_uploaded=0,
        file_url=file_path,
        tenant_id=current_user.tenant_id
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    return {"id": new_doc.id, "file_path": file_path, "message": "Коммерческое предложение успешно сгенерировано"}

@router.post("/generate-invoice")
def generate_invoice(payload: InvoiceCreateSchema, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    client_query = db.query(Client).filter(Client.id == payload.client_id)
    if current_user.tenant_id:
        client_query = client_query.filter(Client.tenant_id == current_user.tenant_id)
    client = client_query.first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    obj = None
    if payload.object_id:
        obj_query = db.query(Object).filter(Object.id == payload.object_id)
        if current_user.tenant_id:
            obj_query = obj_query.filter(Object.tenant_id == current_user.tenant_id)
        obj = obj_query.first()

    settings = get_settings_dict(db, tenant_id=current_user.tenant_id)

    # Map materials bank details if requested
    if payload.account_type == "materials":
        settings["company_bank_name"] = settings.get("company_bank_name_materials", settings.get("company_bank_name"))
        settings["company_bik"] = settings.get("company_bik_materials", settings.get("company_bik"))
        settings["company_rs"] = settings.get("company_rs_materials", settings.get("company_rs"))
        settings["company_ks"] = settings.get("company_ks_materials", settings.get("company_ks"))

    # Create PDF
    temp_dir = tempfile.gettempdir()
    invoice_number = payload.custom_number or f"СЧ-{payload.client_id}-{int(datetime.utcnow().timestamp()) % 100000:05d}"
    filename = f"invoice_{payload.client_id}_{int(datetime.utcnow().timestamp())}.pdf"
    file_path = os.path.join(temp_dir, filename)

    font_name = "Helvetica"
    font_bold_name = "Helvetica-Bold"
    try:
        pdfmetrics.registerFont(TTFont('Arial', 'C:\\Windows\\Fonts\\arial.ttf'))
        font_name = "Arial"
        pdfmetrics.registerFont(TTFont('Arial-Bold', 'C:\\Windows\\Fonts\\arialbd.ttf'))
        font_bold_name = "Arial-Bold"
    except Exception:
        pass

    c = canvas.Canvas(file_path)
    
    # 1. Draw branding header (no website QR here, to keep focus on payment QR)
    draw_branding_header(c, font_name, font_bold_name, settings, draw_qr=False)

    # 2. Disclaimer Text
    c.setFont(font_name, 7.5)
    c.setFillColorRGB(0.4, 0.4, 0.4)
    c.drawString(54, 725, settings.get("invoice_disclaimer", ""))

    # 3. Bank Details Grid (x=54 to x=540, y=615 to y=720)
    c.setStrokeColorRGB(0.7, 0.7, 0.7)
    c.setLineWidth(0.8)
    
    # Outer box
    c.rect(54, 615, 486, 105, fill=False, stroke=True)
    
    # Verticals
    c.line(374, 615, 374, 720)
    c.line(414, 615, 414, 720)
    c.line(214, 695, 214, 720)
    
    # Horizontals
    c.line(54, 695, 374, 695)
    c.line(54, 660, 540, 660)
    c.line(374, 637, 540, 637)
    
    # Bank detail text placement
    c.setFillColorRGB(0.1, 0.1, 0.1)
    
    # Zone 1 text
    c.setFont(font_name, 8)
    c.drawString(58, 707, f"ИНН {settings.get('company_inn', '')}")
    c.drawString(218, 707, f"КПП {settings.get('company_kpp', '')}")
    
    # Zone 2 text
    c.drawString(58, 685, "Получатель")
    c.setFont(font_bold_name, 9)
    c.drawString(58, 670, settings.get('company_legal_name', ''))
    
    # Zone 3 text
    c.setFont(font_name, 8)
    c.drawString(58, 648, "Банк получателя")
    c.setFont(font_bold_name, 9)
    c.drawString(58, 630, settings.get('company_bank_name', ''))
    
    # Account labels and values
    c.setFont(font_name, 8)
    c.drawString(378, 685, "Сч. №")
    c.setFont(font_bold_name, 9)
    c.drawString(418, 685, settings.get('company_rs', ''))
    
    c.setFont(font_name, 8)
    c.drawString(378, 645, "БИК")
    c.setFont(font_bold_name, 9)
    c.drawString(418, 645, settings.get('company_bik', ''))
    
    c.setFont(font_name, 8)
    c.drawString(378, 622, "Сч. №")
    c.setFont(font_bold_name, 9)
    c.drawString(418, 622, settings.get('company_ks', ''))

    # 4. Invoice Title
    c.setFont(font_bold_name, 14)
    c.setFillColorRGB(0.1, 0.1, 0.1)
    date_str = payload.custom_date or datetime.now().strftime('%d.%m.%Y')
    c.drawString(54, 590, f"Счет на оплату № {invoice_number} от {date_str}")
    
    # Thin divider line under title
    c.setStrokeColorRGB(0.1, 0.1, 0.1)
    c.setLineWidth(1.5)
    c.line(54, 582, 540, 582)

    # Calculate total amount
    total_amount = sum(item.quantity * item.price for item in payload.items)
    total_kopecks = int(round(total_amount * 100))

    # 5. GOСТ QR code & box
    c.setStrokeColorRGB(0.8, 0.8, 0.8)
    c.setLineWidth(0.8)
    c.rect(445, 475, 95, 95, fill=False, stroke=True)
    
    c.setFont(font_bold_name, 7)
    c.setFillColorRGB(0.3, 0.3, 0.3)
    c.drawCentredString(492.5, 560, "Быстрая оплата")
    c.drawCentredString(492.5, 550, "по QR-коду")

    # Generate QR payload
    qr_payload = f"ST00012|Name={settings.get('company_legal_name', '')}|PersonalAcc={settings.get('company_rs', '')}|BankName={settings.get('company_bank_name', '')}|BIC={settings.get('company_bik', '')}|CorrespAcc={settings.get('company_ks', '')}|PayeeINN={settings.get('company_inn', '')}|PayeeKPP={settings.get('company_kpp', '')}|Sum={total_kopecks}|Purpose=Оплата по счету № {invoice_number}"

    try:
        from reportlab.graphics.shapes import Drawing
        from reportlab.graphics.barcode.qr import QrCodeWidget
        from reportlab.graphics import renderPDF
        
        qr_drawing = Drawing(70, 70)
        qr_widget = QrCodeWidget(qr_payload, barWidth=70, barHeight=70)
        qr_drawing.add(qr_widget)
        renderPDF.draw(qr_drawing, c, 457.5, 480)
    except Exception as e:
        print(f"Error rendering GOСТ QR code: {e}")

    # 6. Supplier & Buyer details
    c.setFillColorRGB(0.1, 0.1, 0.1)
    c.setFont(font_bold_name, 9)
    c.drawString(54, 565, "Поставщик:")
    c.setFont(font_name, 9)
    supplier_info = f"{settings.get('company_legal_name', '')}, ИНН {settings.get('company_inn', '')}, КПП {settings.get('company_kpp', '')}, {settings.get('company_address', '')}, тел.: {settings.get('company_phone', '')}"
    
    words = supplier_info.split(" ")
    line1, line2 = "", ""
    for word in words:
        if len(line1 + " " + word) < 65:
            line1 = (line1 + " " + word).strip()
        else:
            line2 = (line2 + " " + word).strip()
    c.drawString(120, 565, line1)
    if line2:
        c.drawString(120, 553, line2)

    c.setFont(font_bold_name, 9)
    c.drawString(54, 525, "Покупатель:")
    c.setFont(font_name, 9)
    buyer_inn = f", ИНН {client.inn}" if client.inn else ""
    buyer_info = f"{client.name}{buyer_inn}, {client.contact_person or ''}, тел.: {client.phone or '—'}"
    
    words = buyer_info.split(" ")
    b_line1, b_line2 = "", ""
    for word in words:
        if len(b_line1 + " " + word) < 65:
            b_line1 = (b_line1 + " " + word).strip()
        else:
            b_line2 = (b_line2 + " " + word).strip()
    c.drawString(120, 525, b_line1)
    if b_line2:
        c.drawString(120, 513, b_line2)

    # 7. Table header
    table_top = 450
    c.setStrokeColorRGB(0.7, 0.7, 0.7)
    c.setLineWidth(0.8)
    
    # Header background fill
    c.setFillColorRGB(0.95, 0.95, 0.95)
    c.rect(54, table_top - 20, 486, 20, fill=True, stroke=True)
    
    c.setFillColorRGB(0.1, 0.1, 0.1)
    c.setFont(font_bold_name, 9)
    c.drawString(60, table_top - 14, "№")
    c.drawString(85, table_top - 14, "Товары (работы, услуги)")
    c.drawString(290, table_top - 14, "Кол-во")
    c.drawString(340, table_top - 14, "Ед.")
    c.drawString(380, table_top - 14, "Цена, руб.")
    c.drawString(460, table_top - 14, "Сумма, руб.")

    # 8. Draw table rows
    c.setFont(font_name, 9)
    current_y = table_top - 20
    for idx, item in enumerate(payload.items):
        current_y -= 20
        c.rect(54, current_y, 486, 20, fill=False, stroke=True)
        
        c.drawString(60, current_y + 6, str(idx + 1))
        name_str = item.name[:38] + "..." if len(item.name) > 40 else item.name
        c.drawString(85, current_y + 6, name_str)
        c.drawString(290, current_y + 6, f"{item.quantity:.1f}")
        c.drawString(340, current_y + 6, item.unit)
        c.drawString(380, current_y + 6, f"{item.price:,.2f}".replace(",", " "))
        
        item_sum = item.quantity * item.price
        c.drawString(460, current_y + 6, f"{item_sum:,.2f}".replace(",", " "))

    # 9. Totals & VAT
    current_y -= 20
    c.setFont(font_bold_name, 9)
    c.drawString(350, current_y + 6, "Итого:")
    c.drawRightString(530, current_y + 6, f"{total_amount:,.2f}".replace(",", " "))
    
    current_y -= 15
    if payload.nds_rate == "20%":
        nds_sum = total_amount * 20 / 120
        c.drawString(350, current_y + 6, "В том числе НДС (20%):")
        c.drawRightString(530, current_y + 6, f"{nds_sum:,.2f}".replace(",", " "))
    else:
        c.drawString(350, current_y + 6, "В том числе НДС:")
        c.drawRightString(530, current_y + 6, "Без НДС")
    
    current_y -= 15
    c.drawString(350, current_y + 6, "Всего к оплате:")
    c.drawRightString(530, current_y + 6, f"{total_amount:,.2f}".replace(",", " "))

    # 10. Total in Words (Сумма прописью)
    current_y -= 25
    c.setStrokeColorRGB(0.1, 0.1, 0.1)
    c.setLineWidth(1.5)
    c.line(54, current_y, 540, current_y)
    
    current_y -= 15
    c.setFont(font_name, 9)
    count_items = len(payload.items)
    summary_str = f"Всего наименований {count_items}, на сумму {total_amount:,.2f} руб.".replace(",", " ")
    c.drawString(54, current_y, summary_str)
    
    current_y -= 15
    words_str = num2text_ru(total_amount)
    c.setFont(font_bold_name, 9)
    c.drawString(54, current_y, words_str)
    
    c.setStrokeColorRGB(0.1, 0.1, 0.1)
    c.setLineWidth(1)
    c.line(54, current_y - 5, 540, current_y - 5)

    # 11. Signatures
    current_y -= 45
    c.setFont(font_name, 9)
    director_name = settings.get('company_director', 'Леонтьев А.В.')
    c.drawString(54, current_y, f"Руководитель ___________________ ({director_name})")
    c.drawString(300, current_y, f"Бухгалтер ___________________ ({director_name})")
    
    c.drawString(54, current_y - 30, "М.П.")

    c.save()

    # Save to DB
    new_doc = Document(
        client_id=payload.client_id,
        object_id=payload.object_id,
        doc_type="invoice",
        name=f"Счет на оплату № {invoice_number}",
        is_uploaded=0,
        file_url=file_path,
        tenant_id=current_user.tenant_id
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    return {"id": new_doc.id, "file_path": file_path, "message": "Счет на оплату успешно сгенерирован"}

@router.get("/download/{doc_id}")
def download_document(doc_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Document).filter(Document.id == doc_id)
    if current_user.tenant_id:
        query = query.filter(Document.tenant_id == current_user.tenant_id)
    doc = query.first()
    if not doc or not os.path.exists(doc.file_url):
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get extension of the file to determine correct mime-type
    ext = os.path.splitext(doc.file_url)[1].lower() or ".pdf"
    
    media_types = {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".doc": "application/msword",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xls": "application/vnd.ms-excel",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }
    
    mimetype = media_types.get(ext, "application/octet-stream")
    suggested_filename = f"{doc.doc_type}_{doc.client_id}{ext}"
    
    # Using 'inline' so browser displays it directly instead of forced download (which opens a blank tab)
    headers = {
        "Content-Disposition": f"inline; filename=\"{suggested_filename}\""
    }
    
    return FileResponse(doc.file_url, media_type=mimetype, headers=headers)

@router.get("/", response_model=List[DocumentResponse])
def get_documents(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Document)
    if current_user.tenant_id:
        query = query.filter(Document.tenant_id == current_user.tenant_id)
    return query.order_by(Document.created_at.desc()).offset(skip).limit(limit).all()

@router.post("/upload", response_model=DocumentResponse)
def upload_document(
    client_id: int = Form(...),
    object_id: int = Form(None),
    doc_type: str = Form(...),
    name: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    upload_dir = os.path.join("backend", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    
    # Извлекаем расширение файла для валидации (Режим 10)
    import uuid
    original_filename = file.filename or ""
    _, ext = os.path.splitext(original_filename)
    ext_lower = ext.lower()
    
    # Разрешаем только безопасные форматы файлов во избежание загрузки вредоносных скриптов (Режим 10)
    allowed_extensions = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".png", ".jpg", ".jpeg", ".webp"}
    if ext_lower not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail="Недопустимый формат файла. Разрешены только PDF, документы Office и изображения."
        )
        
    # Генерируем случайное UUID-имя для предотвращения Path Traversal и перезаписи критических файлов сервера (Режим 10)
    safe_filename = f"uploaded_{client_id}_{int(datetime.utcnow().timestamp())}_{uuid.uuid4().hex}{ext_lower}"
    file_path = os.path.join(upload_dir, safe_filename)
    
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    content = file.file.read(MAX_FILE_SIZE + 1)
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413, 
            detail="Файл слишком большой. Максимум 50MB."
        )

    try:
        with open(file_path, "wb") as buffer:
            buffer.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
        
    new_doc = Document(
        client_id=client_id,
        object_id=object_id,
        doc_type=doc_type,
        name=name,
        is_uploaded=1,
        file_url=file_path
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    
    return new_doc

@router.delete("/{doc_id}")
def delete_document(doc_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if doc.file_url and os.path.exists(doc.file_url):
        try:
            os.remove(doc.file_url)
        except Exception as e:
            print(f"Error removing file: {e}")
            
    db.delete(doc)
    db.commit()
    return {"message": "Документ успешно удален"}

@router.post("/send-email")
def send_document_email(payload: EmailSendSchema, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from email.mime.base import MIMEBase
    from email import encoders
    from .settings import ensure_active_organization, DEFAULT_SETTINGS
    
    doc = None
    if payload.doc_id:
        doc = db.query(Document).filter(Document.id == payload.doc_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        if not doc.file_url or not os.path.exists(doc.file_url):
            raise HTTPException(status_code=404, detail="Physical document file not found on server")
        
    # Determine which SMTP settings to use (user-specific or company global fallback)
    if current_user.smtp_host and current_user.smtp_user and current_user.smtp_password:
        settings = {
            "smtp_host": current_user.smtp_host,
            "smtp_port": int(current_user.smtp_port or 465),
            "smtp_user": current_user.smtp_user,
            "smtp_password": current_user.smtp_password,
            "smtp_use_ssl": int(current_user.smtp_use_ssl if current_user.smtp_use_ssl is not None else 1)
        }
    else:
        settings = {}
        for key in ["smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_use_ssl"]:
            db_setting = db.query(CompanySetting).filter(CompanySetting.key == key).first()
            settings[key] = db_setting.value if db_setting else DEFAULT_SETTINGS.get(key)
            
        if not settings.get("smtp_host") or not settings.get("smtp_user") or not settings.get("smtp_password"):
            raise HTTPException(status_code=400, detail="Настройки SMTP не настроены. Пожалуйста, заполните их в настройках.")
        
    try:
        msg = MIMEMultipart()
        msg['From'] = settings["smtp_user"]
        msg['To'] = payload.recipient_email
        msg['Subject'] = payload.subject
        
        msg.attach(MIMEText(payload.body, 'plain', 'utf-8'))
        
        if doc:
            filename = os.path.basename(doc.file_url)
            ext = os.path.splitext(filename)[1] or ".pdf"
            attachment_name = f"{doc.name or 'Документ'}{ext}"
            
            from email.header import Header
            attachment_name_encoded = Header(attachment_name, 'utf-8').encode()
            
            with open(doc.file_url, "rb") as attachment:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(attachment.read())
                encoders.encode_base64(part)
                part.add_header(
                    "Content-Disposition",
                    f"attachment; filename=\"{attachment_name_encoded}\""
                )
                msg.attach(part)
            
        use_ssl = int(settings.get("smtp_use_ssl", 1))
        host = settings["smtp_host"]
        port = int(settings["smtp_port"] or 465)
        
        if use_ssl == 1:
            server = smtplib.SMTP_SSL(host, port, timeout=15)
        else:
            server = smtplib.SMTP(host, port, timeout=15)
            try:
                server.ehlo()
                server.starttls()
                server.ehlo()
            except Exception as e:
                print(f"STARTTLS failed: {e}")
                
        server.login(settings["smtp_user"], settings["smtp_password"])
        server.send_message(msg)
        server.quit()
        
        return {"message": "Письмо успешно отправлено!"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ошибка при отправке почты: {str(e)}")

@router.post("/generate-factura")
def generate_factura(payload: FacturaCreateSchema, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    client = db.query(Client).filter(Client.id == payload.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    obj = None
    if payload.object_id:
        obj = db.query(Object).filter(Object.id == payload.object_id).first()

    settings = get_settings_dict(db)

    if payload.account_type == "materials":
        settings["company_bank_name"] = settings.get("company_bank_name_materials", settings.get("company_bank_name"))
        settings["company_bik"] = settings.get("company_bik_materials", settings.get("company_bik"))
        settings["company_rs"] = settings.get("company_rs_materials", settings.get("company_rs"))
        settings["company_ks"] = settings.get("company_ks_materials", settings.get("company_ks"))

    # Create PDF
    temp_dir = tempfile.gettempdir()
    factura_number = payload.custom_number or f"СФ-{payload.client_id}-{int(datetime.utcnow().timestamp()) % 100000:05d}"
    filename = f"factura_{payload.client_id}_{int(datetime.utcnow().timestamp())}.pdf"
    file_path = os.path.join(temp_dir, filename)

    font_name = "Helvetica"
    font_bold_name = "Helvetica-Bold"
    try:
        pdfmetrics.registerFont(TTFont('Arial', 'C:\\Windows\\Fonts\\arial.ttf'))
        font_name = "Arial"
        pdfmetrics.registerFont(TTFont('Arial-Bold', 'C:\\Windows\\Fonts\\arialbd.ttf'))
        font_bold_name = "Arial-Bold"
    except Exception:
        pass

    c = canvas.Canvas(file_path)
    
    # Title
    c.setFont(font_bold_name, 14)
    date_str = payload.custom_date or datetime.now().strftime('%d.%m.%Y')
    c.drawString(54, 750, f"Счет-фактура № {factura_number} от {date_str}")
    
    c.setStrokeColorRGB(0.1, 0.1, 0.1)
    c.setLineWidth(1.5)
    c.line(54, 742, 540, 742)

    # Info block
    c.setFont(font_name, 9)
    c.setFillColorRGB(0.1, 0.1, 0.1)
    c.drawString(54, 725, f"Продавец: {settings.get('company_legal_name', '')}")
    c.drawString(54, 712, f"Адрес продавца: {settings.get('company_address', '')}")
    c.drawString(54, 699, f"ИНН/КПП продавца: {settings.get('company_inn', '')} / {settings.get('company_kpp', '')}")
    c.drawString(54, 686, f"Грузоотправитель и его адрес: он же")
    c.drawString(54, 673, f"Грузополучатель и его адрес: {client.name}, {client.legal_address or ''}")
    c.drawString(54, 660, f"Покупатель: {client.name}")
    c.drawString(54, 647, f"Адрес покупателя: {client.legal_address or ''}")
    c.drawString(54, 634, f"ИНН/КПП покупателя: {client.inn or '—'} / {client.kpp or '—'}")
    c.drawString(54, 621, f"Валюта: наименование, код: Российский рубль, 643")

    # Table top
    table_top = 570
    c.setStrokeColorRGB(0.7, 0.7, 0.7)
    c.setLineWidth(0.8)
    
    # Headers
    c.setFillColorRGB(0.95, 0.95, 0.95)
    c.rect(54, table_top - 30, 486, 30, fill=True, stroke=True)
    c.setFillColorRGB(0.1, 0.1, 0.1)
    c.setFont(font_bold_name, 8)
    c.drawString(58, table_top - 18, "№")
    c.drawString(78, table_top - 18, "Наименование товара / услуги")
    c.drawString(250, table_top - 18, "Кол-во")
    c.drawString(295, table_top - 18, "Ед.")
    c.drawString(320, table_top - 18, "Цена, руб.")
    c.drawString(380, table_top - 18, "Сумма, руб.")
    c.drawString(440, table_top - 18, "Ставка НДС")
    c.drawString(495, table_top - 18, "НДС, руб.")

    total_amount = sum(item.quantity * item.price for item in payload.items)
    total_nds = 0.0

    c.setFont(font_name, 8)
    current_y = table_top - 30
    for idx, item in enumerate(payload.items):
        current_y -= 20
        c.rect(54, current_y, 486, 20, fill=False, stroke=True)
        
        c.drawString(58, current_y + 6, str(idx + 1))
        name_str = item.name[:32] + "..." if len(item.name) > 34 else item.name
        c.drawString(78, current_y + 6, name_str)
        c.drawString(250, current_y + 6, f"{item.quantity:.1f}")
        c.drawString(295, current_y + 6, item.unit)
        c.drawString(320, current_y + 6, f"{item.price:,.2f}".replace(",", " "))
        
        item_sum = item.quantity * item.price
        c.drawString(380, current_y + 6, f"{item_sum:,.2f}".replace(",", " "))
        
        if payload.nds_rate == "20%":
            nds_rate_label = "20%"
            item_nds = item_sum * 20 / 120
            total_nds += item_nds
            nds_label = f"{item_nds:,.2f}".replace(",", " ")
        else:
            nds_rate_label = "без НДС"
            nds_label = "без НДС"
            
        c.drawString(440, current_y + 6, nds_rate_label)
        c.drawString(495, current_y + 6, nds_label)

    # Totals
    current_y -= 20
    c.setFillColorRGB(0.95, 0.95, 0.95)
    c.rect(54, current_y, 486, 20, fill=True, stroke=True)
    c.setFillColorRGB(0.1, 0.1, 0.1)
    c.setFont(font_bold_name, 8)
    c.drawString(78, current_y + 6, "Всего к оплате:")
    c.drawString(380, current_y + 6, f"{total_amount:,.2f}".replace(",", " "))
    if payload.nds_rate == "20%":
        c.drawString(495, current_y + 6, f"{total_nds:,.2f}".replace(",", " "))
    else:
        c.drawString(495, current_y + 6, "без НДС")

    # Signatures
    current_y -= 50
    c.setFont(font_name, 9)
    director_name = settings.get('company_director', 'Леонтьев А.В.')
    c.drawString(54, current_y, f"Руководитель организации: ___________________ ({director_name})")
    c.drawString(54, current_y - 25, f"Главный бухгалтер: ___________________ ({director_name})")
    c.drawString(54, current_y - 50, "М.П.")

    factura_disclaimer = settings.get("factura_disclaimer", "")
    if factura_disclaimer:
        c.setFont(font_name, 7.5)
        c.setFillColorRGB(0.4, 0.4, 0.4)
        c.drawString(54, current_y - 70, factura_disclaimer)

    c.save()

    # Save to DB
    new_doc = Document(
        client_id=payload.client_id,
        object_id=payload.object_id,
        doc_type="factura",
        name=f"Счет-фактура № {factura_number}",
        is_uploaded=0,
        file_url=file_path
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    return {"id": new_doc.id, "file_path": file_path, "message": "Счет-фактура успешно сгенерирован"}

@router.post("/generate-upd")
def generate_upd(payload: UPDCreateSchema, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    client = db.query(Client).filter(Client.id == payload.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    obj = None
    if payload.object_id:
        obj = db.query(Object).filter(Object.id == payload.object_id).first()

    settings = get_settings_dict(db)

    if payload.account_type == "materials":
        settings["company_bank_name"] = settings.get("company_bank_name_materials", settings.get("company_bank_name"))
        settings["company_bik"] = settings.get("company_bik_materials", settings.get("company_bik"))
        settings["company_rs"] = settings.get("company_rs_materials", settings.get("company_rs"))
        settings["company_ks"] = settings.get("company_ks_materials", settings.get("company_ks"))

    # Create PDF
    temp_dir = tempfile.gettempdir()
    upd_number = payload.custom_number or f"УПД-{payload.client_id}-{int(datetime.utcnow().timestamp()) % 100000:05d}"
    filename = f"upd_{payload.client_id}_{int(datetime.utcnow().timestamp())}.pdf"
    file_path = os.path.join(temp_dir, filename)

    font_name = "Helvetica"
    font_bold_name = "Helvetica-Bold"
    try:
        pdfmetrics.registerFont(TTFont('Arial', 'C:\\Windows\\Fonts\\arial.ttf'))
        font_name = "Arial"
        pdfmetrics.registerFont(TTFont('Arial-Bold', 'C:\\Windows\\Fonts\\arialbd.ttf'))
        font_bold_name = "Arial-Bold"
    except Exception:
        pass

    c = canvas.Canvas(file_path)
    
    # Status Box in top right
    c.setStrokeColorRGB(0.1, 0.1, 0.1)
    c.setLineWidth(1)
    c.rect(460, 725, 80, 50, fill=False, stroke=True)
    c.setFont(font_bold_name, 8)
    status_val = "1" if payload.nds_rate == "20%" else "2"
    c.drawCentredString(500, 755, "Статус:")
    c.setFont(font_bold_name, 16)
    c.drawCentredString(500, 735, status_val)
    
    c.setFont(font_name, 6)
    c.drawString(462, 715, "1 - счет-фактура + акт")
    c.drawString(462, 705, "2 - передаточный акт")

    # Title
    c.setFont(font_bold_name, 12)
    date_str = payload.custom_date or datetime.now().strftime('%d.%m.%Y')
    c.drawString(54, 695, f"Универсальный передаточный документ № {upd_number} от {date_str}")
    
    c.line(54, 687, 540, 687)

    # Info block
    c.setFont(font_name, 8)
    c.setFillColorRGB(0.1, 0.1, 0.1)
    c.drawString(54, 675, f"Продавец: {settings.get('company_legal_name', '')}")
    c.drawString(54, 664, f"Адрес продавца: {settings.get('company_address', '')}")
    c.drawString(54, 653, f"ИНН/КПП продавца: {settings.get('company_inn', '')} / {settings.get('company_kpp', '')}")
    c.drawString(54, 642, f"Грузоотправитель и его адрес: он же")
    c.drawString(54, 631, f"Грузополучатель и его адрес: {client.name}, {client.legal_address or ''}")
    c.drawString(54, 620, f"Покупатель: {client.name}")
    c.drawString(54, 609, f"Адрес покупателя: {client.legal_address or ''}")
    c.drawString(54, 598, f"ИНН/КПП покупателя: {client.inn or '—'} / {client.kpp or '—'}")
    c.drawString(54, 587, f"Валюта: наименование, код: Российский рубль, 643")

    # Table top
    table_top = 560
    c.setStrokeColorRGB(0.7, 0.7, 0.7)
    c.setLineWidth(0.8)
    
    # Headers
    c.setFillColorRGB(0.95, 0.95, 0.95)
    c.rect(54, table_top - 30, 486, 30, fill=True, stroke=True)
    c.setFillColorRGB(0.1, 0.1, 0.1)
    c.setFont(font_bold_name, 8)
    c.drawString(58, table_top - 18, "№")
    c.drawString(78, table_top - 18, "Наименование товара / услуги")
    c.drawString(250, table_top - 18, "Кол-во")
    c.drawString(295, table_top - 18, "Ед.")
    c.drawString(320, table_top - 18, "Цена, руб.")
    c.drawString(380, table_top - 18, "Сумма, руб.")
    c.drawString(440, table_top - 18, "Ставка НДС")
    c.drawString(495, table_top - 18, "НДС, руб.")

    total_amount = sum(item.quantity * item.price for item in payload.items)
    total_nds = 0.0

    c.setFont(font_name, 8)
    current_y = table_top - 30
    for idx, item in enumerate(payload.items):
        current_y -= 20
        c.rect(54, current_y, 486, 20, fill=False, stroke=True)
        
        c.drawString(58, current_y + 6, str(idx + 1))
        name_str = item.name[:32] + "..." if len(item.name) > 34 else item.name
        c.drawString(78, current_y + 6, name_str)
        c.drawString(250, current_y + 6, f"{item.quantity:.1f}")
        c.drawString(295, current_y + 6, item.unit)
        c.drawString(320, current_y + 6, f"{item.price:,.2f}".replace(",", " "))
        
        item_sum = item.quantity * item.price
        c.drawString(380, current_y + 6, f"{item_sum:,.2f}".replace(",", " "))
        
        if payload.nds_rate == "20%":
            nds_rate_label = "20%"
            item_nds = item_sum * 20 / 120
            total_nds += item_nds
            nds_label = f"{item_nds:,.2f}".replace(",", " ")
        else:
            nds_rate_label = "без НДС"
            nds_label = "без НДС"
            
        c.drawString(440, current_y + 6, nds_rate_label)
        c.drawString(495, current_y + 6, nds_label)

    # Totals
    current_y -= 20
    c.setFillColorRGB(0.95, 0.95, 0.95)
    c.rect(54, current_y, 486, 20, fill=True, stroke=True)
    c.setFillColorRGB(0.1, 0.1, 0.1)
    c.setFont(font_bold_name, 8)
    c.drawString(78, current_y + 6, "Всего к оплате:")
    c.drawString(380, current_y + 6, f"{total_amount:,.2f}".replace(",", " "))
    if payload.nds_rate == "20%":
        c.drawString(495, current_y + 6, f"{total_nds:,.2f}".replace(",", " "))
    else:
        c.drawString(495, current_y + 6, "без НДС")

    # Bottom transfer section
    current_y -= 40
    c.setFont(font_bold_name, 8)
    c.drawString(54, current_y, "Совмещенный документ сдачи-приемки:")
    
    current_y -= 15
    c.setFont(font_name, 8)
    director_name = settings.get('company_director', 'Леонтьев А.В.')
    c.drawString(54, current_y, f"Товары (работы, услуги) передал (оказал): ___________________ / {director_name}")
    c.drawString(54, current_y - 20, f"Товары (работы, услуги) принял (получил): ___________________ / ")
    c.drawString(54, current_y - 40, f"Ответственный за оформление сделки: ___________________ / {director_name}")
    c.drawString(54, current_y - 60, "М.П.")

    upd_disclaimer = settings.get("upd_disclaimer", "")
    if upd_disclaimer:
        c.setFont(font_name, 7.5)
        c.setFillColorRGB(0.4, 0.4, 0.4)
        c.drawString(54, current_y - 75, upd_disclaimer)

    c.save()

    # Save to DB
    new_doc = Document(
        client_id=payload.client_id,
        object_id=payload.object_id,
        doc_type="upd",
        name=f"УПД № {upd_number}",
        is_uploaded=0,
        file_url=file_path
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    return {"id": new_doc.id, "file_path": file_path, "message": "УПД успешно сгенерирован"}


@router.post("/generate-from-template/{template_id}")
def generate_from_template(
    template_id: int,
    client_id: int,
    object_id: int = None,
    custom_number: str = None,
    custom_date: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(DocumentTemplate).filter(DocumentTemplate.id == template_id)
    if current_user.tenant_id:
        query = query.filter((DocumentTemplate.tenant_id == current_user.tenant_id) | (DocumentTemplate.tenant_id == None))
    template = query.first()
    if not template or not template.is_active:
        raise HTTPException(status_code=404, detail="Template not found")

    client = db.query(Client).filter(Client.id == client_id)
    if current_user.tenant_id:
        client = client.filter(Client.tenant_id == current_user.tenant_id)
    client = client.first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    obj = None
    if object_id:
        obj_query = db.query(Object).filter(Object.id == object_id)
        if current_user.tenant_id:
            obj_query = obj_query.filter(Object.tenant_id == current_user.tenant_id)
        obj = obj_query.first()

    settings = get_settings_dict(db, tenant_id=current_user.tenant_id)

    date_str = custom_date or datetime.now().strftime('%d.%m.%Y')
    doc_number = custom_number or f"{client_id}-{int(datetime.utcnow().timestamp()) % 100000:05d}"

    # Если выбран стартовый системный шаблон СФЕРУМ, используем встроенный PDF генератор
    if template.file_path == "system_default" or not os.path.exists(template.file_path):
        doc_type_map = {
            "kp": ("kp", "Коммерческое предложение", create_kp_pdf),
            "invoice": ("invoice", "Счет на оплату", create_invoice_pdf),
            "contract": ("contract", "Договор подряда", create_contract_pdf),
            "act": ("act", "Акт выполненных работ", create_act_pdf),
        }
        mapped = doc_type_map.get(template.doc_type, doc_type_map.get("contract"))
        mapped_type, type_label, pdf_generator = mapped
        filename = f"{mapped_type}_{client.id}_{int(datetime.utcnow().timestamp())}.pdf"
        file_path = os.path.join(PDF_DIR, filename)
        pdf_generator(file_path, client, obj, doc_number, settings, custom_date=date_str)
        
        new_doc = Document(
            client_id=client_id,
            object_id=object_id,
            doc_type=mapped_type,
            name=f"{template.name} № {doc_number}",
            is_uploaded=0,
            file_url=file_path,
            tenant_id=current_user.tenant_id
        )
        db.add(new_doc)
        db.commit()
        db.refresh(new_doc)
        return {"id": new_doc.id, "file_path": file_path, "message": f"{type_label} успешно сгенерирован по стартовому шаблону"}

    context = {
        "company_name": settings.get("company_name", ""),
        "company_legal_name": settings.get("company_legal_name", settings.get("company_name", "")),
        "company_inn": settings.get("company_inn", ""),
        "company_kpp": settings.get("company_kpp", ""),
        "company_director": settings.get("company_director", ""),
        "company_address": settings.get("company_address", ""),
        "company_phone": settings.get("company_phone", ""),
        "company_email": settings.get("company_email", ""),
        "company_bank_name": settings.get("company_bank_name", ""),
        "company_bik": settings.get("company_bik", ""),
        "company_rs": settings.get("company_rs", ""),
        "company_ks": settings.get("company_ks", ""),

        "client_name": client.name or "",
        "client_inn": client.inn or "",
        "client_kpp": client.kpp or "",
        "client_address": client.legal_address or "",
        "client_contact": client.contact_person or "",
        "client_phone": client.phone or "",
        "client_email": client.email or "",
        "client_bank_name": client.bank_name or "",
        "client_bik": client.bik or "",
        "client_rs": client.rs or "",
        "client_ks": client.ks or "",

        "object_name": obj.name if obj else "",
        "object_area": str(obj.area_sqm) if obj else "",
        "object_surface": obj.surface_type if obj else "",

        "current_date": date_str,
        "doc_number": doc_number
    }

    temp_dir = tempfile.gettempdir()

    try:
        output_path = generate_tender_document(
            template_path=template.file_path,
            output_dir=temp_dir,
            data=context,
            filename_prefix=f"{template.doc_type}_{client_id}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate doc: {e}")

    new_doc = Document(
        client_id=client_id,
        object_id=object_id,
        doc_type="custom_template",
        name=f"{template.name} № {doc_number}",
        is_uploaded=0,
        file_url=output_path,
        tenant_id=current_user.tenant_id
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    return {"id": new_doc.id, "file_path": output_path, "message": "Документ сгенерирован по шаблону"}
