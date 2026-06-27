import urllib.request
import json
import urllib.parse

api_key = "DdCbtjbnwkPrXovpVzIuOQoqrziDapCpShQmWVeBTWDcnofZqSbRhaSVwNQrxRdm"
headers = {
    "x-api-key": api_key,
    "Content-Type": "application/json"
}
base_url = "http://103.82.193.14:3000/api"

def test_request(endpoint, method="GET", payload=None):
    if method == "GET" and payload:
        query_string = urllib.parse.urlencode(payload)
        url = f"{base_url}/{endpoint}?{query_string}"
        data = None
    else:
        url = f"{base_url}/{endpoint}"
        data = json.dumps(payload).encode("utf-8") if payload else None
        
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as res:
            print(f"[{method}] {endpoint} Success! Status: {res.status}")
            print("Response:", res.read().decode()[:1500])
    except Exception as e:
        print(f"[{method}] {endpoint} Failed: {e}")

print("--- Probing Docker/Swarm/Compose APIs ---")
test_request("docker.all", "GET")
test_request("docker.containers", "GET")
test_request("docker.services", "GET")
test_request("swarm.services", "GET")
test_request("swarm.all", "GET")
test_request("compose.all", "GET")
test_request("compose.list", "GET")
test_request("project.all", "GET")
