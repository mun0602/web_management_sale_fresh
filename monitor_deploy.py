import urllib.request
import json
import sys

api_key = "DdCbtjbnwkPrXovpVzIuOQoqrziDapCpShQmWVeBTWDcnofZqSbRhaSVwNQrxRdm"
headers = {"x-api-key": api_key}

# 1. Get the latest deployment ID
url = "http://103.82.193.14:3000/api/application.one?applicationId=6EuIS0o5EfjwZDflndjwI"
req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode())
        deps = data.get("deployments", [])
        if not deps:
            print("No deployments found.")
            sys.exit(0)
        
        deps.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
        latest_dep = deps[0]
        dep_id = latest_dep.get("deploymentId")
        status = latest_dep.get("status")
        title = latest_dep.get("title")
        
        print(f"Latest Deployment ID: {dep_id}")
        print(f"Title/Commit: {title}")
        print(f"Status: {status}")
        
        # 2. Get the build logs for this deployment
        logs_url = f"http://103.82.193.14:3000/api/deployment.readLogs?deploymentId={dep_id}"
        req_logs = urllib.request.Request(logs_url, headers=headers)
        with urllib.request.urlopen(req_logs) as res_logs:
            logs_data = json.loads(res_logs.read().decode())
            print("\n=== BUILD LOGS (Last 50 lines) ===")
            text = logs_data.get("logs", "") if isinstance(logs_data, dict) else str(logs_data)
            lines = text.split("\n")
            for line in lines[-50:]:
                print(line)
            print("===================================")
        
except Exception as e:
    print("Error:", e)
