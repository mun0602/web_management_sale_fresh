import urllib.request
import json

api_key = "DdCbtjbnwkPrXovpVzIuOQoqrziDapCpShQmWVeBTWDcnofZqSbRhaSVwNQrxRdm"
headers = {"x-api-key": api_key}
base_url = "http://103.82.193.14:3000/api"

url = f"{base_url}/project.all"
req = urllib.request.Request(url, headers=headers)

try:
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode())
        # Tìm project có tên hoặc ID khớp
        target_project = next((p for p in data if p.get("projectId") == "wzHNuvZzw9-_UMoz_XDUk"), None)
        if target_project:
            print(json.dumps(target_project, indent=2))
        else:
            print("Target project not found")
except Exception as e:
    print("Error:", e)
