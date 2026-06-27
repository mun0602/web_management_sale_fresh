import urllib.request
import json

api_key = "DdCbtjbnwkPrXovpVzIuOQoqrziDapCpShQmWVeBTWDcnofZqSbRhaSVwNQrxRdm"
headers = {"x-api-key": api_key}
application_id = "6EuIS0o5EfjwZDflndjwI"

url = f"http://103.82.193.14:3000/api/application.one?applicationId={application_id}"
req = urllib.request.Request(url, headers=headers)

try:
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode())
        
        # Chỉ in các trường liên quan đến Git, Auto Deploy và Webhook
        git_info = {
            "name": data.get("name"),
            "sourceType": data.get("sourceType"),
            "autoDeploy": data.get("autoDeploy"),
            "triggerType": data.get("triggerType"),
            "customGitUrl": data.get("customGitUrl"),
            "customGitBranch": data.get("customGitBranch"),
            "githubId": data.get("githubId"),
            "hasGitProviderAccess": data.get("hasGitProviderAccess")
        }
        print("--- Git and Auto Deploy Config ---")
        print(json.dumps(git_info, indent=2))
        
        # In các key có chứa từ khóa 'webhook' hoặc 'url' để tìm link webhook
        print("\n--- Searching for Webhook Keys ---")
        for k, v in data.items():
            if "webhook" in k.lower() or "url" in k.lower() or "token" in k.lower():
                print(f"{k}: {v}")
                
except Exception as e:
    print("Error:", e)
