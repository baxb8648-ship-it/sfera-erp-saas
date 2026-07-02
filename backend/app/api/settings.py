from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, List
from ..database import get_db
from ..models import CompanySetting, User, Organization
from ..schemas import OrganizationCreate, OrganizationResponse, SMTPTestSchema
from .auth import get_current_user

router = APIRouter(prefix="/settings", tags=["Settings"])

DEFAULT_SETTINGS = {
    "company_name": "СФЕРА",
    "company_subtitle": "Промышленная группа",
    "company_legal_name": "ООО \"СФЕРА\"",
    "company_inn": "5610234567",
    "company_kpp": "561001001",
    "company_address": "г. Оренбург, ул. Монтажников, д. 22",
    "company_phone": "+7 (3532) 99-88-77",
    "company_email": "info@sphera-akz.ru",
    "company_website": "леоника56.рф",
    "company_website_url": "https://xn--56-6kc6dma2c.xn--p1ai",
    "company_regions": "Оренбург • Самара • Уфа",
    "company_director": "Леонтьев А.В.",
    "company_bank_name": "АО \"АЛЬФА-БАНК\"",
    "company_bik": "044525593",
    "company_rs": "40702810101234567890",
    "company_ks": "30101810200000000593",
    "company_bank_name_materials": "АО \"АЛЬФА-БАНК\"",
    "company_bik_materials": "044525593",
    "company_rs_materials": "40702810101234567891",
    "company_ks_materials": "30101810200000000593",
    "smtp_host": "smtp.yandex.ru",
    "smtp_port": "465",
    "smtp_user": "info@sphera-akz.ru",
    "smtp_password": "",
    "smtp_use_ssl": "1",
    "dadata_api_key": "",
    "telegram_bot_token": "",
    "telegram_channel_id": "",
    "tender_sync_mode": "demo",
    "brand_name": "СФЕРА ERP",
    "brand_color": "#F95700",
    "brand_logo_url": "",
    "email_template_contract": "Здравствуйте, {{client_contact}}!\n\nВо вложении к этому письму находится Договор подряда на объект {{object_name}}.\nПожалуйста, ознакомьтесь и подпишите его со своей стороны.\n\nС уважением,\n{{company_name}}\nТел.: {{company_phone}}",
    "email_template_act": "Здравствуйте, {{client_contact}}!\n\nВо вложении к этому письму находится Акт выполненных работ на объекте {{object_name}}.\nПросьба подписать его и отправить ответный скан.\n\nС уважением,\n{{company_name}}\nТел.: {{company_phone}}",
    "email_template_kp": "Здравствуйте, {{client_contact}}!\n\nВо вложении к этому письму находится Коммерческое предложение по вашему объекту {{object_name}}.\nМы готовы обсудить условия и приступить к работе.\n\nС уважением,\n{{company_name}}\nТел.: {{company_phone}}",
    "email_template_invoice": "Здравствуйте, {{client_contact}}!\n\nВо вложении к этому письму находится Счет на оплату: {{doc_name}}.\nПожалуйста, произведите оплату в соответствии с указанными реквизитами.\n\nС уважением,\n{{company_name}}\nТел.: {{company_phone}}",
    "email_template_other": "Здравствуйте, {{client_contact}}!\n\nВо вложении к этому письму находится документ: {{doc_name}}.\n\nС уважением,\n{{company_name}}\nТел.: {{company_phone}}",
    "invoice_disclaimer": "Внимание! Оплата данного счета означает согласие с условиями поставки товара. Уведомление об оплате обязательно.",
    "factura_disclaimer": "Счет-фактура действителен в течение 10 дней.",
    "upd_disclaimer": "Товары (работы, услуги) переданы в полном объеме, претензий по качеству и количеству нет.",
    "contract_template": """ДОГОВОР ПОДРЯДА № {{contract_number}}
на оказание услуг по антикоррозийной защите

г. Оренбург                                        "{{date}}""
ООО "{{company_name}}", именуемое в дальнейшем "Исполнитель", в лице Генерального директора {{company_director}}, действующего на основании Устава, с одной стороны, и
{{client_name}} (ИНН {{client_inn}}), именуемое в дальнейшем "Заказчик", в лице {{client_contact}}, с другой стороны, заключили настоящий Договор о нижеследующем:

1. ПРЕДМЕТ ДОГОВОРА
1.1. Исполнитель обязуется выполнить по заданию Заказчика работы на объекте: {{object_name}}.
1.2. Характеристики объекта и виды работ определяются в соответствии с Техническим заданием и Коммерческим предложением.

2. СТОИМОСТЬ РАБОТ И ПОРЯДОК РАСЧЕТОВ
2.1. Общая стоимость работ по настоящему Договору составляет: {{total_price}} рублей. НДС не облагается в связи с применением УСН.
2.2. Заказчик производит оплату в соответствии со счетами и актами выполненных работ.

3. СРОКИ ВЫПОЛНЕНИЯ РАБОТ
3.1. Срок начала работ: в течение 5 рабочих дней с момента подписания Договора.
3.2. Срок окончания работ: определяется графиком производства работ.

4. ПОДПИСИ И РЕКВИЗИТЫ СТОРОН
Исполнитель:
ООО "{{company_name}}", ИНН {{company_inn}}
Адрес: {{company_address}}
Генеральный директор {{company_director}} /_________________/

Заказчик:
{{client_name}}, ИНН {{client_inn}}
Контакты: {{client_contact_phone}}, {{client_contact_email}}
Представитель: {{client_contact}} /_________________/"""
}

def ensure_active_organization(db: Session) -> Organization:
    # Check if we have active organization
    org = db.query(Organization).filter(Organization.is_active == 1).first()
    if org:
        return org
        
    org = db.query(Organization).first()
    if org:
        org.is_active = 1
        db.commit()
        db.refresh(org)
        return org
        
    # None exist, migrate from CompanySetting or default
    org_data = {}
    for key in [
        "company_name", "company_subtitle", "company_legal_name", "company_inn",
        "company_kpp", "company_address", "company_phone", "company_email",
        "company_website", "company_website_url", "company_regions", "company_director",
        "company_bank_name", "company_bik", "company_rs", "company_ks",
        "company_bank_name_materials", "company_bik_materials", "company_rs_materials", "company_ks_materials"
    ]:
        db_val = db.query(CompanySetting).filter(CompanySetting.key == key).first()
        org_data[key] = db_val.value if db_val else DEFAULT_SETTINGS.get(key)
        
    new_org = Organization(
        name=org_data.get("company_name", "СФЕРА"),
        subtitle=org_data.get("company_subtitle"),
        legal_name=org_data.get("company_legal_name"),
        inn=org_data.get("company_inn"),
        kpp=org_data.get("company_kpp"),
        address=org_data.get("company_address"),
        phone=org_data.get("company_phone"),
        email=org_data.get("company_email"),
        website=org_data.get("company_website"),
        website_url=org_data.get("company_website_url"),
        regions=org_data.get("company_regions"),
        director=org_data.get("company_director"),
        
        bank_name=org_data.get("company_bank_name"),
        bik=org_data.get("company_bik"),
        rs=org_data.get("company_rs"),
        ks=org_data.get("company_ks"),
        
        bank_name_materials=org_data.get("company_bank_name_materials"),
        bik_materials=org_data.get("company_bik_materials"),
        rs_materials=org_data.get("company_rs_materials"),
        ks_materials=org_data.get("company_ks_materials"),
        
        is_active=1
    )
    db.add(new_org)
    db.commit()
    db.refresh(new_org)
    return new_org

@router.get("/")
def get_settings(db: Session = Depends(get_db)):
    active_org = ensure_active_organization(db)
    
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
    for key in [
        "contract_template", "smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_use_ssl",
        "email_template_contract", "email_template_act", "email_template_kp", "email_template_invoice", "email_template_other",
        "invoice_disclaimer", "factura_disclaimer", "upd_disclaimer", "dadata_api_key", "telegram_bot_token", "telegram_channel_id",
        "tender_sync_mode"
    ]:
        db_setting = db.query(CompanySetting).filter(CompanySetting.key == key).first()
        settings_dict[key] = db_setting.value if db_setting else DEFAULT_SETTINGS.get(key)
        
    return settings_dict

@router.post("/")
def save_settings(payload: Dict[str, str], db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Только администратор может изменять настройки")
    active_org = ensure_active_organization(db)
    
    # Update active organization fields
    if "company_name" in payload: active_org.name = payload["company_name"]
    if "company_subtitle" in payload: active_org.subtitle = payload["company_subtitle"]
    if "company_legal_name" in payload: active_org.legal_name = payload["company_legal_name"]
    if "company_inn" in payload: active_org.inn = payload["company_inn"]
    if "company_kpp" in payload: active_org.kpp = payload["company_kpp"]
    if "company_address" in payload: active_org.address = payload["company_address"]
    if "company_phone" in payload: active_org.phone = payload["company_phone"]
    if "company_email" in payload: active_org.email = payload["company_email"]
    if "company_website" in payload: active_org.website = payload["company_website"]
    if "company_website_url" in payload: active_org.website_url = payload["company_website_url"]
    if "company_regions" in payload: active_org.regions = payload["company_regions"]
    if "company_director" in payload: active_org.director = payload["company_director"]
    
    if "company_bank_name" in payload: active_org.bank_name = payload["company_bank_name"]
    if "company_bik" in payload: active_org.bik = payload["company_bik"]
    if "company_rs" in payload: active_org.rs = payload["company_rs"]
    if "company_ks" in payload: active_org.ks = payload["company_ks"]
    
    if "company_bank_name_materials" in payload: active_org.bank_name_materials = payload["company_bank_name_materials"]
    if "company_bik_materials" in payload: active_org.bik_materials = payload["company_bik_materials"]
    if "company_rs_materials" in payload: active_org.rs_materials = payload["company_rs_materials"]
    if "company_ks_materials" in payload: active_org.ks_materials = payload["company_ks_materials"]
    
    # Update general settings in CompanySetting
    for key, value in payload.items():
        if not key.startswith("company_"):
            db_setting = db.query(CompanySetting).filter(CompanySetting.key == key).first()
            if db_setting:
                db_setting.value = value
            else:
                db_setting = CompanySetting(key=key, value=value)
                db.add(db_setting)
                
    db.commit()
    return {"message": "Настройки успешно сохранены"}

from pydantic import BaseModel
import urllib.request
import json

class TelegramTestSchema(BaseModel):
    telegram_bot_token: str
    telegram_channel_id: str

@router.post("/smtp/test")
@router.post("/test-smtp")
def test_smtp(payload: SMTPTestSchema, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Только администратор может тестировать настройки SMTP")
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    try:
        msg = MIMEMultipart()
        msg['From'] = payload.smtp_user
        msg['To'] = payload.smtp_user
        msg['Subject'] = "Тестовое сообщение от СФЕРА"
        
        body = "Приветствуем! Это тестовое сообщение, подтверждающее успешную настройку интеграции SMTP в вашей СФЕРА."
        msg.attach(MIMEText(body, 'plain', 'utf-8'))
        
        if payload.smtp_use_ssl == 1:
            server = smtplib.SMTP_SSL(payload.smtp_host, payload.smtp_port, timeout=10)
        else:
            server = smtplib.SMTP(payload.smtp_host, payload.smtp_port, timeout=10)
            try:
                server.ehlo()
                server.starttls()
                server.ehlo()
            except Exception as e:
                print(f"STARTTLS failed: {e}")
                
        server.login(payload.smtp_user, payload.smtp_password)
        server.send_message(msg)
        server.quit()
        return {"success": True, "message": "Тестовое письмо успешно отправлено на ваш адрес!"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ошибка SMTP: {str(e)}")

@router.post("/telegram/test")
@router.post("/test-telegram")
def test_telegram(payload: TelegramTestSchema, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Только администратор может тестировать настройки Telegram")
    try:
        token = payload.telegram_bot_token
        chat_id = payload.telegram_channel_id
        
        if not token or not chat_id or token.strip() == "" or chat_id.strip() == "":
            raise HTTPException(
                status_code=400, 
                detail="Настройки Telegram не заполнены. Укажите токен бота и ID канала."
            )
            
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        telegram_payload = {
            "chat_id": chat_id,
            "text": "🔔 Тестовое уведомление из СФЕРА ERP/CRM. Настройки интеграции верны!",
            "parse_mode": "HTML"
        }
        
        data = json.dumps(telegram_payload).encode("utf-8")
        req = urllib.request.Request(
            url, 
            data=data, 
            headers={"Content-Type": "application/json"}, 
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            res = response.read().decode("utf-8")
            res_data = json.loads(res)
            if not res_data.get("ok"):
                raise Exception(res_data.get("description", "Unknown Telegram error"))
                
        return {"success": True, "message": "Тестовое сообщение успешно отправлено в Telegram!"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ошибка Telegram: {str(e)}")

@router.get("/organizations", response_model=List[OrganizationResponse])
def get_organizations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ensure_active_organization(db)
    return db.query(Organization).all()

@router.post("/organizations", response_model=OrganizationResponse)
def create_organization(payload: OrganizationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Только администратор может управлять организациями")
    count = db.query(Organization).count()
    is_active = 1 if count == 0 else 0
    
    has_active = db.query(Organization).filter(Organization.is_active == 1).first()
    if not has_active:
        is_active = 1
        
    new_org = Organization(
        name=payload.name,
        subtitle=payload.subtitle,
        legal_name=payload.legal_name,
        inn=payload.inn,
        kpp=payload.kpp,
        address=payload.address,
        phone=payload.phone,
        email=payload.email,
        website=payload.website,
        website_url=payload.website_url,
        regions=payload.regions,
        director=payload.director,
        
        bank_name=payload.bank_name,
        bik=payload.bik,
        rs=payload.rs,
        ks=payload.ks,
        
        bank_name_materials=payload.bank_name_materials,
        bik_materials=payload.bik_materials,
        rs_materials=payload.rs_materials,
        ks_materials=payload.ks_materials,
        
        is_active=is_active
    )
    db.add(new_org)
    db.commit()
    db.refresh(new_org)
    return new_org

@router.put("/organizations/{org_id}", response_model=OrganizationResponse)
def update_organization(org_id: int, payload: OrganizationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Только администратор может управлять организациями")
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
        
    org.name = payload.name
    org.subtitle = payload.subtitle
    org.legal_name = payload.legal_name
    org.inn = payload.inn
    org.kpp = payload.kpp
    org.address = payload.address
    org.phone = payload.phone
    org.email = payload.email
    org.website = payload.website
    org.website_url = payload.website_url
    org.regions = payload.regions
    org.director = payload.director
    
    org.bank_name = payload.bank_name
    org.bik = payload.bik
    org.rs = payload.rs
    org.ks = payload.ks
    
    org.bank_name_materials = payload.bank_name_materials
    org.bik_materials = payload.bik_materials
    org.rs_materials = payload.rs_materials
    org.ks_materials = payload.ks_materials
    
    db.commit()
    db.refresh(org)
    return org

@router.delete("/organizations/{org_id}")
def delete_organization(org_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Только администратор может управлять организациями")
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
        
    total = db.query(Organization).count()
    if total <= 1:
        raise HTTPException(status_code=400, detail="Нельзя удалить единственную организацию")
        
    was_active = org.is_active
    db.delete(org)
    db.commit()
    
    if was_active == 1:
        another = db.query(Organization).first()
        if another:
            another.is_active = 1
            db.commit()
            
    return {"message": "Организация успешно удалена"}

@router.post("/organizations/{org_id}/activate")
def activate_organization(org_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Только администратор может управлять организациями")
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
        
    db.query(Organization).update({Organization.is_active: 0})
    org.is_active = 1
    db.commit()
    return {"message": f"Организация '{org.name}' активирована"}
