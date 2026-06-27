import urllib.request
import json

token = "1Y0w6ibMgAh6nSb7gT-pe"
url = f"http://103.82.193.14:3000/api/deploy/{token}"

# Danh sách các cấu hình payload & header khác nhau để thử nghiệm
tests = [
    # 1. Giả lập chính xác GitHub Push Event
    {
        "name": "GitHub Standard Push",
        "headers": {
            "Content-Type": "application/json",
            "X-GitHub-Event": "push",
            "User-Agent": "GitHub-Hookshot/abc123"
        },
        "payload": {
            "ref": "refs/heads/main",
            "repository": {
                "html_url": "https://github.com/mun0602/web_management_sale"
            }
        }
    },
    # 2. Định dạng Gitea/Gogs
    {
        "name": "Gitea Standard Push",
        "headers": {
            "Content-Type": "application/json",
            "X-Gitea-Event": "push"
        },
        "payload": {
            "ref": "refs/heads/main"
        }
    },
    # 3. Định dạng Generic (chỉ truyền thẳng tên branch hoặc ref ngắn)
    {
        "name": "Generic Push (branch: main)",
        "headers": {
            "Content-Type": "application/json"
        },
        "payload": {
            "branch": "main",
            "ref": "main"
        }
    }
]

for test in tests:
    print(f"--- Testing: {test['name']} ---")
    data = json.dumps(test["payload"]).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=test["headers"], method="POST")
    try:
        with urllib.request.urlopen(req) as res:
            print(f"-> SUCCESS! Status: {res.status}")
            print(f"   Response: {res.read().decode()}\n")
    except Exception as e:
        print(f"-> FAILED: {e}")
        if hasattr(e, 'read'):
            print(f"   Details: {e.read().decode()}")
        print()
