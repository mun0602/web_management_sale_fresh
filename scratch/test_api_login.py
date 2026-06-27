import urllib.request
import json

url = "https://munbds.shop/api/keyboard?action=login"
payload = {
    "username": "admin@sale.com",
    "password": "123456"
}
data = json.dumps(payload).encode("utf-8")
req = urllib.request.Request(
    url, 
    data=data, 
    headers={"Content-Type": "application/json"},
    method="POST"
)

try:
    with urllib.request.urlopen(req) as res:
        print(f"Status: {res.status}")
        print("Response:", res.read().decode())
except Exception as e:
    print("API Request Failed:", e)
    if hasattr(e, 'read'):
        print("Details:", e.read().decode())
