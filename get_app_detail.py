import urllib.request
import json

api_key = "DdCbtjbnwkPrXovpVzIuOQoqrziDapCpShQmWVeBTWDcnofZqSbRhaSVwNQrxRdm"
headers = {"x-api-key": api_key}

url = "http://103.82.193.14:3000/api/application.one?applicationId=6EuIS0o5EfjwZDflndjwI"
req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode())
        print(json.dumps(data, indent=2))
except Exception as e:
    print("Error:", e)
