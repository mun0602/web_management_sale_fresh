import urllib.request
import json

api_key = "DdCbtjbnwkPrXovpVzIuOQoqrziDapCpShQmWVeBTWDcnofZqSbRhaSVwNQrxRdm"
headers = {
    "x-api-key": api_key,
    "Content-Type": "application/json"
}

# 1. Remove old mount (/app/public/downloads/apk)
print("Removing old mount...")
remove_url = "http://103.82.193.14:3000/api/mounts.remove"
remove_payload = json.dumps({"mountId": "5TwhEU-MmGatKRvSTheZS"}).encode("utf-8")
req_remove = urllib.request.Request(remove_url, data=remove_payload, headers=headers, method="POST")

try:
    with urllib.request.urlopen(req_remove) as res:
        print("Remove status:", res.status)
        print("Remove response:", res.read().decode())
except Exception as e:
    print("Error removing mount:", e)

# 2. Create new mount (/app/public/downloads)
print("\nCreating new mount...")
create_url = "http://103.82.193.14:3000/api/mounts.create"
create_payload = json.dumps({
    "type": "bind",
    "mountPath": "/app/public/downloads",
    "serviceId": "6EuIS0o5EfjwZDflndjwI",
    "serviceType": "application",
    "hostPath": "/var/lib/dokploy/sale_keyboard_downloads"
}).encode("utf-8")
req_create = urllib.request.Request(create_url, data=create_payload, headers=headers, method="POST")

try:
    with urllib.request.urlopen(req_create) as res:
        print("Create status:", res.status)
        print("Create response:", res.read().decode())
except Exception as e:
    print("Error creating mount:", e)

# 3. Trigger application redeploy to apply new volume configuration
print("\nTriggering application redeploy...")
deploy_url = "http://103.82.193.14:3000/api/application.deploy"
deploy_payload = json.dumps({"applicationId": "6EuIS0o5EfjwZDflndjwI"}).encode("utf-8")
req_deploy = urllib.request.Request(deploy_url, data=deploy_payload, headers=headers, method="POST")

try:
    with urllib.request.urlopen(req_deploy) as res:
        print("Deploy status:", res.status)
        print("Deploy response:", res.read().decode())
except Exception as e:
    print("Error triggering deploy:", e)
