import sys
import urllib.request
import urllib.parse

def set_webhook(token: str, webhook_url: str):
    url = f"https://api.telegram.org/bot{token}/setWebhook"
    data = urllib.parse.urlencode({'url': webhook_url}).encode('utf-8')
    try:
        req = urllib.request.Request(url, data=data)
        with urllib.request.urlopen(req) as response:
            result = response.read().decode('utf-8')
            print("Response:", result)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python set_webhook.py <BOT_TOKEN> <WEBHOOK_URL>")
        print("Example: python set_webhook.py 123456:ABC-DEF https://api.леоника56.рф/telegram/webhook")
        sys.exit(1)
        
    token = sys.argv[1]
    url = sys.argv[2]
    
    # URL encode domain if it is cyrillic
    if 'леоника56.рф' in url:
        url = url.replace('леоника56.рф', 'xn--56-6kctpmeri.xn--p1ai')
        
    print(f"Setting webhook for bot to {url} ...")
    set_webhook(token, url)
