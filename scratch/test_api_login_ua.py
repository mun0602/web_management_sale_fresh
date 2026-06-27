import urllib.request
import json

url = "https://munbds.shop/api/keyboard?action=login"
payload = {
    "username": "admin@sale.com",
    "password": "123456"
}
data = json.dumps(payload).encode("utf-8")

# Sử dụng User-Agent của Chrome để qua mặt Cloudflare Browser Integrity Check
headers = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

req = urllib.request.Request(
    url, 
    data=data, 
    headers=headers,
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
