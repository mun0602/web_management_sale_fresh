import urllib.request
import json
import sys

api_key = "DdCbtjbnwkPrXovpVzIuOQoqrziDapCpShQmWVeBTWDcnofZqSbRhaSVwNQrxRdm"
headers = {
    "x-api-key": api_key,
    "Content-Type": "application/json"
}
base_url = "http://103.82.193.14:3000/api"
go_app_id = "qnkDd1ksDOHiHX5fPvLdB"

def make_request(endpoint, payload):
    url = f"{base_url}/{endpoint}"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as res:
            res_data = res.read().decode()
            return json.loads(res_data) if res_data else {}
    except Exception as e:
        print(f"Error calling {endpoint}: {e}")
        if hasattr(e, 'read'):
            print(f"Details: {e.read().decode()}")
        sys.exit(1)

def main():
    print("=== TẠO DOMAIN CHO GO SERVER ===")
    domain_payload = {
        "host": "go-server-103-82-193-14.sslip.io",
        "applicationId": go_app_id,
        "port": 8080,
        "https": False,
        "certificateType": "none",
        "path": "/"
    }
    
    print("Đang gọi domain.create...")
    res = make_request("domain.create", domain_payload)
    print("-> Kết quả tạo domain:", res)
    
    print("\nĐang gọi application.redeploy...")
    res_redeploy = make_request("application.redeploy", {"applicationId": go_app_id})
    print("-> Kết quả redeploy Go app:", res_redeploy)
    
if __name__ == "__main__":
    main()
