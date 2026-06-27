import urllib.request
import json

token = "1Y0w6ibMgAh6nSb7gT-pe"
base_url = "http://103.82.193.14:3000"

# Các định dạng Webhook URL có thể có của Dokploy
urls = [
    f"{base_url}/api/deploy/github?token={token}",
    f"{base_url}/api/deploy/{token}",
    f"{base_url}/api/webhook/github?token={token}",
]

# GitHub webhook mock payload
payload = {
    "ref": "refs/heads/main",
    "repository": {
        "html_url": "https://github.com/mun0602/web_management_sale"
    }
}
data = json.dumps(payload).encode("utf-8")

headers = {
    "Content-Type": "application/json",
    "User-Agent": "GitHub-Hookshot/abc123" # Giả lập request gửi từ GitHub
}

for url in urls:
    print(f"Testing webhook trigger URL: {url}")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as res:
            print(f"-> SUCCESS! Status: {res.status}")
            print(f"   Response: {res.read().decode()}\n")
    except Exception as e:
        print(f"-> FAILED: {e}")
        if hasattr(e, 'read'):
            print(f"   Details: {e.read().decode()}")
        print()
