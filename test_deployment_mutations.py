import urllib.request
import json

api_key = "DdCbtjbnwkPrXovpVzIuOQoqrziDapCpShQmWVeBTWDcnofZqSbRhaSVwNQrxRdm"
headers = {
    "x-api-key": api_key,
    "Content-Type": "application/json"
}
base_url = "http://103.82.193.14:3000/api"
go_app_id = "006h5miD_aPldWyT7o76O"

# Dò các procedure trong router deployment
mutations = [
    "deployment.clean", 
    "deployment.cancel", 
    "deployment.cleanQueue", 
    "deployment.cancelAll"
]

for proc in mutations:
    print(f"\nTesting mutation: {proc}...")
    url = f"{base_url}/{proc}"
    payload = {"applicationId": go_app_id}
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as res:
            print(f"-> {proc} Success! Status: {res.status}, Response: {res.read().decode()}")
    except Exception as e:
        print(f"-> {proc} Failed: {e}")
        if hasattr(e, 'read'):
            print(f"   Details: {e.read().decode()}")
