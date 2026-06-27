import urllib.request
import json

api_key = "DdCbtjbnwkPrXovpVzIuOQoqrziDapCpShQmWVeBTWDcnofZqSbRhaSVwNQrxRdm"
headers = {
    "x-api-key": api_key
}
base_url = "http://103.82.193.14:3000/api"
go_app_id = "006h5miD_aPldWyT7o76O"
nextjs_app_id = "6EuIS0o5EfjwZDflndjwI"

def get_app(app_id):
    url = f"{base_url}/application.one?applicationId={app_id}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode())

next_app = get_app(nextjs_app_id)
go_app = get_app(go_app_id)

print(f"=== COMPARING CONFIGS ===")
# Lọc bỏ các trường ID, name sinh tự động, thời gian tạo, và env để so sánh cấu hình thuần túy
skip_keys = {
    "applicationId", "name", "appName", "env", "refreshToken", "createdAt", 
    "environmentId", "environment", "deployments", "domains", "mounts"
}

all_keys = set(next_app.keys()).union(set(go_app.keys()))

differences = []
for key in sorted(all_keys):
    if key in skip_keys:
        continue
    val_next = next_app.get(key)
    val_go = go_app.get(key)
    if val_next != val_go:
        differences.append((key, val_next, val_go))

print(f"{'Key':<30} | {'Next.js (Working)':<40} | {'Golang (Idle)':<40}")
print("-" * 120)
for key, next_val, go_val in differences:
    print(f"{key:<30} | {str(next_val):<40} | {str(go_val):<40}")
