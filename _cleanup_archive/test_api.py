import urllib.request, urllib.parse, urllib.error
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

key = "oh8J5uZ8rMU2pwXH"
inn = "5614053370"
url = f"https://api.checko.ru/v2/company?key={key}&inn={inn}"

try:
    req = urllib.request.Request(url, headers={'Accept':'application/json'})
    res = urllib.request.urlopen(req, context=ctx).read().decode('utf-8')
    print("Success:", res[:200])
except urllib.error.HTTPError as e:
    print(f"HTTPError: {e.code}")
    print("Body:", e.read().decode('utf-8'))
except Exception as e:
    print("Exception:", e)
