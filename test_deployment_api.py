import urllib.request
import json
import urllib.parse

api_key = "DdCbtjbnwkPrXovpVzIuOQoqrziDapCpShQmWVeBTWDcnofZqSbRhaSVwNQrxRdm"
headers = {
    "x-api-key": api_key
}
base_url = "http://103.82.193.14:3000/api"
go_app_id = "CLBD71p-FSrkyHxRn_BA0"
nextjs_app_id = "6EuIS0o5EfjwZDflndjwI"

def test_get(endpoint, params):
    # Dùng urllib để gọi API GET
    import urllib.parse
    query = urllib.parse.urlencode(params)
    url = f"{base_url}/{endpoint}?{query}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as res:
            print(f"GET {endpoint} with {params} Success! Status: {res.status}")
            print("Response:", res.read().decode())
    except Exception as e:
        print(f"GET {endpoint} with {params} Failed: {e}")
        if hasattr(e, 'read'):
            print("Details:", e.read().decode())

def main():
    print("--- Testing deployment.allByType on NextJS ---")
    test_get("deployment.allByType", {"id": nextjs_app_id, "type": "application"})
    
    print("\n--- Testing deployment.allByType on Golang (Compose) ---")
    test_get("deployment.allByType", {"id": go_app_id, "type": "compose"})

if __name__ == "__main__":
    main()
