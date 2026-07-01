import urllib.request
import urllib.parse
import json

def get_token():
    url = "http://127.0.0.1:8000/auth/login"
    data = urllib.parse.urlencode({"username": "admin", "password": "admin123"}).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            return res_data["access_token"]
    except Exception as e:
        print(f"Ошибка получения токена: {e}")
        return None

def test_tenders_flow(token):
    print("--- 1. Создание настроек API площадки ---")
    platform_url = "http://127.0.0.1:8000/tenders/platforms"
    platform_payload = {
        "name": "B2B-Center Test Platform",
        "api_url": "https://www.b2b-center.ru/api/v2",
        "api_key": "testkey123",
        "is_active": 1,
        "keywords": "антикор",
        "exclude_keywords": "трубопровод",
        "regions": "Самара",
        "min_price": 1000000.0,
        "max_price": 20000000.0
    }
    
    req = urllib.request.Request(platform_url, data=json.dumps(platform_payload).encode("utf-8"), method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", f"Bearer {token}")
    
    try:
        with urllib.request.urlopen(req) as response:
            platform = json.loads(response.read().decode("utf-8"))
            print(f"[Успех] Создана площадка: {platform['name']} (ID: {platform['id']})")
    except Exception as e:
        print(f"[Ошибка] Не удалось создать площадку: {e}")
        return False

    print("\n--- 2. Запуск синхронизации тендеров ---")
    sync_url = "http://127.0.0.1:8000/tenders/sync"
    req_sync = urllib.request.Request(sync_url, method="POST")
    req_sync.add_header("Authorization", f"Bearer {token}")
    
    try:
        with urllib.request.urlopen(req_sync) as response:
            sync_res = json.loads(response.read().decode("utf-8"))
            print(f"[Успех] {sync_res['message']}")
    except Exception as e:
        print(f"[Ошибка] Сбой синхронизации: {e}")
        return False

    print("\n--- 3. Получение списка тендеров ---")
    list_url = "http://127.0.0.1:8000/tenders/"
    req_list = urllib.request.Request(list_url)
    req_list.add_header("Authorization", f"Bearer {token}")
    
    tender_to_participate = None
    try:
        with urllib.request.urlopen(req_list) as response:
            tenders = json.loads(response.read().decode("utf-8"))
            print(f"Всего найдено тендеров в системе: {len(tenders)}")
            for t in tenders:
                print(f"- {t['title']} (НМЦК: {t['price']}) - Статус: {t['status']}")
                if t["status"] == "Анализ":
                    assert "трубопровод" not in t["title"].lower(), "Ошибка: в импортированные тендеры попало минус-слово 'трубопровод'!"
                    tender_to_participate = t
    except Exception as e:
        print(f"[Ошибка] Не удалось получить список тендеров: {e}")
        return False

    if not tender_to_participate:
        print("[Предупреждение] Нет подходящих тендеров для тестирования участия.")
        return False

    print(f"\n--- 4. Тестирование перехода к участию (Tender ID: {tender_to_participate['id']}) ---")
    part_url = f"http://127.0.0.1:8000/tenders/{tender_to_participate['id']}/participate"
    req_part = urllib.request.Request(part_url, method="POST")
    req_part.add_header("Authorization", f"Bearer {token}")
    
    try:
        with urllib.request.urlopen(req_part) as response:
            updated_tender = json.loads(response.read().decode("utf-8"))
            print(f"[Успех] Статус тендера изменен на: {updated_tender['status']}")
            print(f"Привязанный Клиент ID: {updated_tender['client_id']}")
            print(f"Привязанный Объект ID: {updated_tender['object_id']}")
            
            assert updated_tender["status"] == "Участие", "Ошибка: статус тендера не перевелся в Участие"
            assert updated_tender["client_id"] is not None, "Ошибка: клиент не создан"
            assert updated_tender["object_id"] is not None, "Ошибка: объект не создан"
            print("[Успех] Закупка успешно запущена в CRM!")
    except Exception as e:
        print(f"[Ошибка] Ошибка участия: {e}")
        return False

    print("\n--- 5. Очистка тестовых данных ---")
    del_plat_url = f"http://127.0.0.1:8000/tenders/platforms/{platform['id']}"
    req_del_plat = urllib.request.Request(del_plat_url, method="DELETE")
    req_del_plat.add_header("Authorization", f"Bearer {token}")
    try:
        urllib.request.urlopen(req_del_plat)
        print("[Успех] Тестовая площадка удалена.")
    except Exception as e:
        print(f"Не удалось удалить тестовую площадку: {e}")

    return True

if __name__ == "__main__":
    token = get_token()
    if token:
        success = test_tenders_flow(token)
        if success:
            print("\n[SUCCESS] All tenders integration tests passed successfully!")
        else:
            print("\n[ERROR] Testing finished with errors.")
    else:
        print("Failed to authenticate.")

