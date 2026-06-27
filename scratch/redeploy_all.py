import urllib.request
import json
import time

api_key = "DdCbtjbnwkPrXovpVzIuOQoqrziDapCpShQmWVeBTWDcnofZqSbRhaSVwNQrxRdm"
headers = {
    "x-api-key": api_key,
    "Content-Type": "application/json"
}
base_url = "http://103.82.193.14:3000/api"

def make_request(endpoint, payload=None):
    url = f"{base_url}/{endpoint}"
    data = json.dumps(payload).encode("utf-8") if payload else None
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as res:
            res_data = res.read().decode()
            return json.loads(res_data) if res_data else {}
    except Exception as e:
        print(f"Error calling {endpoint}: {e}")
        if hasattr(e, 'read'):
            print(f"Response details: {e.read().decode()}")
        return None

def main():
    print("=== STARTING REDEPLOY OF ALL SERVICES ===")
    
    # 1. Redeploy Go Backend
    go_backend_id = "_mBoqfsm1eZPi3_jXOFTB"
    print(f"\n1. Triggering redeploy for Go Backend (ID: {go_backend_id})...")
    res_go = make_request("application.redeploy", {"applicationId": go_backend_id})
    if res_go is not None:
        print("-> Go Backend redeploy triggered successfully!")
        
    # 2. Redeploy Next.js Frontend
    nextjs_id = "6EuIS0o5EfjwZDflndjwI"
    print(f"\n2. Triggering redeploy for Next.js Frontend (ID: {nextjs_id})...")
    res_next = make_request("application.redeploy", {"applicationId": nextjs_id})
    if res_next is not None:
        print("-> Next.js Frontend redeploy triggered successfully!")

if __name__ == "__main__":
    main()
