import urllib.request
import json

import sys

api_key = "DdCbtjbnwkPrXovpVzIuOQoqrziDapCpShQmWVeBTWDcnofZqSbRhaSVwNQrxRdm"
headers = {"x-api-key": api_key}

default_app_id = "6EuIS0o5EfjwZDflndjwI"
application_id = sys.argv[1] if len(sys.argv) > 1 else default_app_id

url = f"http://103.82.193.14:3000/api/application.one?applicationId={application_id}"
req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode())
        print(json.dumps(data, indent=2))
except Exception as e:
    print("Error:", e)
