import urllib.request
import json

api_key = "DdCbtjbnwkPrXovpVzIuOQoqrziDapCpShQmWVeBTWDcnofZqSbRhaSVwNQrxRdm"
headers = {"x-api-key": api_key}
nextjs_app_id = "6EuIS0o5EfjwZDflndjwI"

url = f"http://103.82.193.14:3000/api/application.one?applicationId={nextjs_app_id}"
req = urllib.request.Request(url, headers=headers)

try:
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode())
        env = data.get("env", "")
        print("--- Next.js ENV Variables ---")
        for line in env.split("\n"):
            if "GO_SERVER_URL" in line:
                print(line)
except Exception as e:
    print("Error:", e)
