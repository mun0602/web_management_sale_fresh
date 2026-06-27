import urllib.request
import json

api_key = "DdCbtjbnwkPrXovpVzIuOQoqrziDapCpShQmWVeBTWDcnofZqSbRhaSVwNQrxRdm"
headers = {
    "x-api-key": api_key
}
base_url = "http://103.82.193.14:3000"

def try_url(path):
    url = f"{base_url}{path}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as res:
            print(f"GET {path} Success! Status: {res.status}")
            content = res.read().decode()
            print("Content (first 500 chars):", content[:500])
            # Ghi ra file nếu content có vẻ là JSON lớn
            if len(content) > 1000:
                with open(f"swagger_probe_{path.replace('/', '_')}.txt", "w") as f:
                    f.write(content)
                print(f"-> Saved full content to swagger_probe_{path.replace('/', '_')}.txt")
    except Exception as e:
        print(f"GET {path} Failed: {e}")

print("--- Probing Swagger/API Documentation Paths ---")
try_url("/api")
try_url("/api/")
try_url("/swagger.json")
try_url("/api-docs")
try_url("/api/docs")
try_url("/api/openapi.json")
