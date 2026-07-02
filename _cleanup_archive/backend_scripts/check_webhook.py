import urllib.request
import json

BOT_TOKEN = "8842262640:AAH7WYTqklaq0wEL-KQw-GxIg2x1FLtXqxI"
url = f"https://api.telegram.org/bot{BOT_TOKEN}/getWebhookInfo"

try:
    with urllib.request.urlopen(url, timeout=10) as response:
        res = json.loads(response.read().decode("utf-8"))
        print("Webhook Info:")
        print(json.dumps(res, indent=2))
except Exception as e:
    print(f"Error: {e}")
