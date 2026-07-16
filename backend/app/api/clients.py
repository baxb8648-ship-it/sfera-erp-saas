from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
import json
import urllib.request
from ..database import get_db
from ..models import Client, User, CompanySetting, Object, ClientStatusEnum
from ..schemas import ClientCreate, ClientResponse, INNLookupResponse, PublicLeadCreate
from .auth import get_current_user
from ..telegram import send_telegram_notification
from ..websocket_manager import manager
import xml.etree.ElementTree as ET
from ..utils.rbac import require_permission

router = APIRouter(prefix="/clients", tags=["Clients"])

@router.post("/", response_model=ClientResponse)
def create_client(client: ClientCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), perm = Depends(require_permission("clients", "write"))):
    db_client = Client(**client.model_dump(), tenant_id=current_user.tenant_id, owner_id=current_user.id)
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    
    from ..services.audit import log_audit_action
    log_audit_action(
        db,
        current_user,
        "создание",
        "Клиент",
        db_client.id,
        db_client.name,
        changes={"name": {"old": "—", "new": db_client.name}}
    )

    try:
        msg = f"🆕 Добавлен новый клиент: <b>{db_client.name}</b>\nИНН: {db_client.inn or 'не указан'}\nКонтактное лицо: {db_client.contact_person or '—'}"
        send_telegram_notification(msg, db)
    except Exception as e:
        # Avoid breaking client creation if telegram fails
        print(f"Telegram notification error: {e}")
        
    background_tasks.add_task(manager.broadcast, {
        "type": "success",
        "message": f"🆕 Добавлен новый клиент: {db_client.name}",
        "refetchKey": "clients"
    })
    return db_client

@router.post("/public-lead", response_model=ClientResponse)
def create_public_lead(lead: PublicLeadCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    db_client = Client(
        name=lead.name,
        phone=lead.phone,
        email=lead.email,
        notes=lead.notes,
        status=ClientStatusEnum.new
    )
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    
    from ..services.audit import log_audit_action
    log_audit_action(
        db,
        None,
        "создание",
        "Клиент",
        db_client.id,
        db_client.name,
        changes={"name": {"old": "—", "new": db_client.name}, "notes": {"old": "—", "new": "Заявка с сайта"}}
    )

    
    if lead.object_name:
        db_obj = Object(
            client_id=db_client.id,
            name=lead.object_name,
            area_sqm=lead.area_sqm,
            surface_type=lead.surface_type,
            service_required="Строительство",
            status="Выезд на аудит"
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        
    try:
        if lead.object_name:
            msg = (
                f"⚡ <b>Новый расчет стоимости с квиза!</b>\n\n"
                f"🏢 Организация: <b>{db_client.name}</b>\n"
                f"📞 Телефон: {db_client.phone or '—'}\n"
                f"✉️ Email: {db_client.email or '—'}\n\n"
                f"🏗️ Тип конструкции: {lead.object_name}\n"
                f"📐 Площадь: {lead.area_sqm:,.0f} м²\n"
                f"🔧 Состояние: {lead.surface_type or '—'}\n"
                f"💰 {lead.notes or '—'}"
            )
        else:
            msg = (
                f"🔔 <b>Новая заявка с сайта СФЕРУМ!</b>\n\n"
                f"🏢 Организация: <b>{db_client.name}</b>\n"
                f"📞 Телефон: {db_client.phone or '—'}\n"
                f"✉️ Email: {db_client.email or '—'}\n"
                f"📝 Описание объекта: {lead.notes or '—'}"
            )
        send_telegram_notification(msg, db)
    except Exception as e:
        print(f"Telegram notification error: {e}")
        
    background_tasks.add_task(manager.broadcast, {
        "type": "info",
        "message": f"🔔 Получена новая заявка с сайта от: {db_client.name}",
        "refetchKey": "clients"
    })
    return db_client

@router.get("/", response_model=List[ClientResponse])
def get_clients(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), perm = Depends(require_permission("clients", "read"))):
    q = db.query(Client).filter(Client.tenant_id == current_user.tenant_id)
    if perm.own_only:
        q = q.filter(Client.owner_id == current_user.id)
    clients = q.offset(skip).limit(limit).all()
    return clients

@router.post("/import-xml")
async def import_clients_xml(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not file.filename.endswith('.xml'):
        raise HTTPException(status_code=400, detail="Invalid file type. Must be XML.")
    
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    contents = await file.read(MAX_FILE_SIZE + 1)
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Файл слишком большой. Максимум 50MB.")
    try:
        root = ET.fromstring(contents)
    except ET.ParseError:
        raise HTTPException(status_code=400, detail="Invalid XML format")
    
    added_count = 0
    # Expected format:
    # <clients>
    #   <client name="Test" inn="123" contact_person="Ivan" phone="555" />
    # </clients>
    for client_node in root.findall("client"):
        name = client_node.get("name")
        if not name:
            continue
        
        inn = client_node.get("inn")
        # simple deduplication by inn
        if inn:
            existing = db.query(Client).filter(Client.inn == inn).first()
            if existing:
                continue

        new_client = Client(
            name=name,
            inn=inn,
            contact_person=client_node.get("contact_person"),
            phone=client_node.get("phone"),
            email=client_node.get("email"),
        )
        db.add(new_client)
        added_count += 1
    
    db.commit()
    return {"message": f"Successfully imported {added_count} clients."}

@router.put("/{client_id}", response_model=ClientResponse)
def update_client(client_id: int, client_data: ClientCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), perm = Depends(require_permission("clients", "write"))):
    q = db.query(Client).filter(Client.id == client_id, Client.tenant_id == current_user.tenant_id)
    if perm.own_only:
        q = q.filter(Client.owner_id == current_user.id)
    db_client = q.first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    old_data = {col.name: getattr(db_client, col.name) for col in db_client.__table__.columns}
    for key, value in client_data.model_dump().items():
        setattr(db_client, key, value)
        
    db.commit()
    db.refresh(db_client)
    
    new_data = {col.name: getattr(db_client, col.name) for col in db_client.__table__.columns}
    from ..services.audit import get_model_changes, log_audit_action
    changes = get_model_changes(old_data, new_data)
    if changes:
        log_audit_action(db, current_user, "обновление", "Клиент", db_client.id, db_client.name, changes)

    background_tasks.add_task(manager.broadcast, {
        "type": "info",
        "message": f"✍️ Обновлены данные клиента: {db_client.name}",
        "refetchKey": "clients"
    })
    return db_client

@router.delete("/{client_id}")
def delete_client(client_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), perm = Depends(require_permission("clients", "delete"))):
    q = db.query(Client).filter(Client.id == client_id, Client.tenant_id == current_user.tenant_id)
    if perm.own_only:
        q = q.filter(Client.owner_id == current_user.id)
    db_client = q.first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    # Also delete associated objects and transactions if necessary, but cascading/nullable keys will handle or we just delete the client.
    # Note: in real app, we should decide on cascade, but for demo we delete directly
    client_name = db_client.name
    client_id_val = db_client.id
    db.delete(db_client)
    db.commit()
    
    from ..services.audit import log_audit_action
    log_audit_action(
        db,
        current_user,
        "удаление",
        "Клиент",
        client_id_val,
        client_name,
        changes={"name": {"old": client_name, "new": "—"}}
    )

    background_tasks.add_task(manager.broadcast, {
        "type": "warning",
        "message": f"🗑️ Удален клиент: {client_name}",
        "refetchKey": "clients"
    })
    return {"message": "Client deleted successfully"}


def get_mock_bank_details(inn: str) -> dict:
    h = hash(inn)
    banks = [
        {"name": "ПАО СБЕРБАНК", "bik": "044525225", "ks": "30101810400000000225"},
        {"name": "АО АЛЬФА-БАНК", "bik": "044525593", "ks": "30101810200000000593"},
        {"name": "Банк ВТБ (ПАО)", "bik": "044525411", "ks": "30101810145250000411"},
        {"name": "АО ГПБ (Газпромбанк)", "bik": "044525823", "ks": "30101810200000000823"}
    ]
    bank = banks[abs(h) % len(banks)]
    rs_suffix = str(abs(h) % 10000000000).zfill(10)
    rs = f"407028108{rs_suffix}00"
    return {
        "bank_name": bank["name"],
        "bik": bank["bik"],
        "rs": rs,
        "ks": bank["ks"]
    }


def get_mock_inn_data(inn: str) -> dict:
    if inn == "7707083893":
        return {
            "name": 'ПАО "СБЕРБАНК"',
            "kpp": "773601001",
            "ogrn": "1027700132195",
            "legal_address": "г. Москва, ул. Вавилова, д. 19",
            "contact_person": "Греф Герман Оскарович",
            "bank_name": "ПАО СБЕРБАНК",
            "bik": "044525225",
            "rs": "30301810800006003000",
            "ks": "30101810400000000225"
        }
    elif inn == "5610075890":
        return {
            "name": 'ООО "ГАЗПРОМ ДОБЫЧА ОРЕНБУРГ"',
            "kpp": "561001001",
            "ogrn": "1025601023546",
            "legal_address": "г. Оренбург, ул. Чкалова, д. 1/2",
            "contact_person": "Кияев Олег Александрович",
            "bank_name": "Филиал ГПБ (АО) в г. Оренбурге",
            "bik": "045354843",
            "rs": "40702810400000001234",
            "ks": "30101810000000000843"
        }

    region_code = inn[:2]
    regions = {
        "56": ("г. Оренбург", "Оренбургская обл."),
        "77": ("г. Москва", "Москва"),
        "63": ("г. Самара", "Самарская обл."),
        "02": ("г. Уфа", "Республика Башкортостан"),
        "78": ("г. Санкт-Петербург", "Санкт-Петербург"),
        "16": ("г. Казань", "Республика Татарстан")
    }
    city, region_name = regions.get(region_code, ("г. Екатеринбург", "Свердловская обл."))

    h = hash(inn)
    companies = [
        "НефтеМашЗащита", "ПромСтройКоррозия", "СпецПокрытие", "АнтикорПро", "ТехноПарк", "РемСервис",
        "ТрансЛогистика", "ОренТорг", "ЭнергоМонтаж", "ВолгаРесурс"
    ]
    company_name = companies[abs(h) % len(companies)]

    types = ["ООО", "АО", "ПАО"]
    comp_type = types[abs(h) % len(types)]

    street = ["Монтажников", "Победы", "Мира", "Советская", "Ленина", "Гагарина", "Чкалова", "Пролетарская"][abs(h) % 8]
    building = (abs(h) % 150) + 1
    office = (abs(h) % 99) + 1

    directors_first = ["Иван", "Сергей", "Алексей", "Дмитрий", "Александр", "Михаил", "Андрей", "Владимир"]
    directors_last = ["Иванов", "Петров", "Сидоров", "Смирнов", "Кузнецов", "Попов", "Васильев", "Соколов"]
    directors_middle = ["Иванович", "Петрович", "Сергеевич", "Александрович", "Дмитриевич", "Владимирович"]
    director = f"{directors_last[abs(h) % 8]} {directors_first[(abs(h) // 2) % 8]} {directors_middle[(abs(h) // 4) % 6]}"

    kpp = f"{region_code}1001001"
    ogrn_suffix = str(abs(h) % 10000000).zfill(8)
    ogrn = f"102{region_code}10{ogrn_suffix}"

    bank_info = get_mock_bank_details(inn)

    return {
        "name": f'{comp_type} "{company_name}"',
        "kpp": kpp,
        "ogrn": ogrn,
        "legal_address": f"{city}, ул. {street}, д. {building}, оф. {office}",
        "contact_person": director,
        "bank_name": bank_info["bank_name"],
        "bik": bank_info["bik"],
        "rs": bank_info["rs"],
        "ks": bank_info["ks"]
    }


@router.get("/lookup-inn/{inn}", response_model=INNLookupResponse)
def lookup_inn(inn: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not inn.isdigit() or len(inn) not in (10, 12):
        raise HTTPException(status_code=400, detail="Некорректный формат ИНН. Должно быть 10 или 12 цифр.")

    dadata_key_setting = db.query(CompanySetting).filter(CompanySetting.key == "dadata_api_key").first()
    api_key = dadata_key_setting.value if dadata_key_setting else None

    if not api_key or api_key.strip() == "":
        return get_mock_inn_data(inn)

    try:
        url = "https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party"
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": f"Token {api_key}"
        }
        data = json.dumps({"query": inn}).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=5) as response:
            res_data = json.loads(response.read().decode("utf-8"))

        suggestions = res_data.get("suggestions", [])
        if not suggestions:
            return get_mock_inn_data(inn)

        party = suggestions[0].get("data", {})
        name = suggestions[0].get("value") or party.get("name", {}).get("short_with_opf") or party.get("name", {}).get("full_with_opf") or "Неизвестная организация"
        kpp = party.get("kpp")
        ogrn = party.get("ogrn")

        address_data = party.get("address", {})
        legal_address = address_data.get("value") or (address_data.get("data", {}) or {}).get("source")

        management = party.get("management", {})
        contact_person = management.get("name")

        bank_info = get_mock_bank_details(inn)

        return INNLookupResponse(
            name=name,
            kpp=kpp,
            ogrn=ogrn,
            legal_address=legal_address,
            contact_person=contact_person,
            bank_name=bank_info.get("bank_name"),
            bik=bank_info.get("bik"),
            rs=bank_info.get("rs"),
            ks=bank_info.get("ks")
        )
    except Exception as e:
        return get_mock_inn_data(inn)


