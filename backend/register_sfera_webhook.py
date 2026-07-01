import urllib.request
import json

BOT_TOKEN = "8842262640:AAH7WYTqklaq0wEL-KQw-GxIg2x1FLtXqxI"
WEBHOOK_URL = "https://api.xn--56-6kctpmeri.xn--p1ai/sfera_bot/webhook"


url = f"https://api.telegram.org/bot{BOT_TOKEN}/setWebhook?url={urllib.parse.quote(WEBHOOK_URL)}"

print(f"Registering Telegram webhook for oblakocrmbot...")
print(f"Target URL: {WEBHOOK_URL}")

try:
    with urllib.request.urlopen(url, timeout=10) as response:
        res = json.loads(response.read().decode("utf-8"))
        if res.get("ok"):
            print("🎉 SUCCESS: Webhook registered successfully in Telegram!")
            print(f"Details: {res}")
        else:
            print(f"❌ FAILED: Telegram returned error: {res}")
except Exception as e:
    print(f"❌ ERROR: Request failed: {e}")
