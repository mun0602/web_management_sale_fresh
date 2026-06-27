import urllib.request
import json

url = "https://munbds.shop/api/keyboard?action=login"
headers = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

accounts = [
    {"username": "mun", "password": "Mun@Sale2026!BdS", "desc": "Admin Account"},
    {"username": "nguyenvana@gmail.com", "password": "user123", "desc": "User Account A"}
]

for acc in accounts:
    print(f"--- Testing {acc['desc']} ({acc['username']}) ---")
    payload = {
        "username": acc["username"],
        "password": acc["password"]
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as res:
            print(f"Status: {res.status}")
            print("Response:", res.read().decode())
    except Exception as e:
        print("Failed:", e)
        if hasattr(e, 'read'):
            print("Details:", e.read().decode())
    print()
