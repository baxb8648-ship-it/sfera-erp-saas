import urllib.request, urllib.parse, json

# 1. Login
data = urllib.parse.urlencode({'username': 'admin', 'password': 'admin', 'grant_type': 'password'}).encode('utf-8')
req = urllib.request.Request('http://127.0.0.1:8000/auth/login', data=data)
try:
    with urllib.request.urlopen(req) as res:
        token_data = json.loads(res.read().decode('utf-8'))
        token = token_data['access_token']
except Exception as e:
    print("Login failed:", e)
    if hasattr(e, 'read'):
        print(e.read())
    exit(1)

# 2. Create Sale
payload = {
    'amount': 500,
    'transaction_type': 'income',
    'category': 'Продажа ЛКМ / на сторону',
    'payment_method': 'Наличный',
    'client_id': None,
    'object_id': None,
    'cash_register': 'materials',
    'description': None
}
req = urllib.request.Request('http://127.0.0.1:8000/finance/', data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'})
try:
    with urllib.request.urlopen(req) as res:
        print("Success:", res.read().decode('utf-8'))
except Exception as e:
    print("Create sale failed:", e)
    if hasattr(e, 'read'):
        print(e.read().decode('utf-8'))
