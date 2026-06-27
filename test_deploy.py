import urllib.request
import json
import sys

api_key = "DdCbtjbnwkPrXovpVzIuOQoqrziDapCpShQmWVeBTWDcnofZqSbRhaSVwNQrxRdm"
headers = {
    "x-api-key": api_key,
    "Content-Type": "application/json"
}
base_url = "http://103.82.193.14:3000/api"
go_app_id = "ItPibKdBGNrkF8GwsFkBg"

print("Triggering deploy for Go App...")
url = f"{base_url}/application.deploy"
payload = {"applicationId": go_app_id}
data = json.dumps(payload).encode("utf-8")
req = urllib.request.Request(url, data=data, headers=headers, method="POST")

try:
    with urllib.request.urlopen(req) as res:
        res_data = res.read().decode()
        print("Status Code:", res.status)
        print("Response Content:", res_data)
except Exception as e:
    print("Error:", e)
    if hasattr(e, 'read'):
        print("Error details:", e.read().decode())
