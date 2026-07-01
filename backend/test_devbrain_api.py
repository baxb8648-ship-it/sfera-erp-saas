import urllib.request
import json

def make_post(url, payload):
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url, data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=5) as r:
        return json.loads(r.read())

def make_get(url):
    with urllib.request.urlopen(url, timeout=5) as r:
        return json.loads(r.read())

print("Testing DevBrain REST API...")

try:
    # 1. Сводка
    status = make_get("http://localhost:8000/devbrain/status")
    print("Initial status:", json.dumps(status))

    # 2. Создаем Epic
    epic = make_post("http://localhost:8000/devbrain/epics", {
        "title": "Telegram Mini App v2",
        "description": "Новый UI/UX для Kanban доски в Telegram",
        "priority": "High"
    })
    print(f"Created Epic #{epic['id']}: {epic['title']}")

    # 3. Создаем Bug
    bug = make_post("http://localhost:8000/devbrain/bugs", {
        "title": "Сбой квоты Groq при длинных аудио",
        "steps": "Записать аудио > 2 мин, отправить боту",
        "severity": "Critical",
        "component": "bot"
    })
    print(f"Created Bug #{bug['id']}: {bug['title']}")

    # 4. Проверяем сводку еще раз
    status_updated = make_get("http://localhost:8000/devbrain/status")
    print("Updated status:", json.dumps(status_updated))
    print("\nAPI TESTS PASSED!")

except Exception as e:
    print(f"Error testing DevBrain API: {e}")
