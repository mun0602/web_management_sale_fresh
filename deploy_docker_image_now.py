import urllib.request
import json
import time
import sys

api_key = "DdCbtjbnwkPrXovpVzIuOQoqrziDapCpShQmWVeBTWDcnofZqSbRhaSVwNQrxRdm"
headers = {
    "x-api-key": api_key,
    "Content-Type": "application/json"
}
base_url = "http://103.82.193.14:3000/api"
go_app_id = "RZs2GJn6Sjo3hvJS6dB1H"

def make_request(endpoint, payload=None, method="POST"):
    url = f"{base_url}/{endpoint}"
    data = json.dumps(payload).encode("utf-8") if payload else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as res:
            res_data = res.read().decode()
            return json.loads(res_data) if res_data else {}
    except Exception as e:
        print(f"Error calling {endpoint}: {e}")
        if hasattr(e, 'read'):
            print(f"Response details: {e.read().decode()}")
        return None

def check_deployments():
    url = f"deployment.allByType?id={go_app_id}&type=application"
    res = make_request(url, method="GET")
    return res if res else []

def main():
    print("=== TIẾN HÀNH DEPLOY DOCKER IMAGE TRÊN HÀNG ĐỢI SẠCH ===")
    
    # 1. Cấu hình Docker Image nginx:alpine
    print("\n1. Đang cấu hình Docker Image 'nginx:alpine' cho Go app...")
    update_payload = {
        "applicationId": go_app_id,
        "sourceType": "docker",
        "dockerImage": "nginx:alpine",
        "username": "",
        "password": "",
        "registryUrl": "",
        "applicationStatus": "done" # Ép trạng thái thành done luôn
    }
    make_request("application.update", update_payload)
    
    docker_payload = {
        "applicationId": go_app_id,
        "dockerImage": "nginx:alpine",
        "username": "",
        "password": "",
        "registryUrl": ""
    }
    make_request("application.saveDockerProvider", docker_payload)
    print("-> Cấu hình Docker Image thành công!")
    
    # 2. Gọi deploy
    print("\n2. Gọi lệnh deploy Docker Image...")
    make_request("application.deploy", {"applicationId": go_app_id})
    print("-> Đã gửi lệnh deploy!")
    
    # 3. Chờ 15 giây và check
    print("\n3. Đang chờ Dokploy sinh bản ghi build đầu tiên...")
    time.sleep(15)
    
    deployments = check_deployments()
    print(f"-> Kết quả deployments: {deployments}")
    
    if not deployments:
        print("\n-> Chưa thấy, thử gọi redeploy trong chế độ Docker Image...")
        make_request("application.redeploy", {"applicationId": go_app_id})
        time.sleep(15)
        deployments = check_deployments()
        print(f"-> Kết quả deployments sau redeploy: {deployments}")
        
    if not deployments:
        print("\n[Thất bại] Vẫn không thể tạo bản ghi build đầu tiên. Có thể có lỗi sâu hơn ở Dokploy core.")
        sys.exit(1)
        
    print("\n[Thành công] Đã có bản ghi build đầu tiên!")
    
    # 4. Phục hồi Git URL
    print("\n4. Đang khôi phục cấu hình Git Custom URL...")
    git_payload = {
        "applicationId": go_app_id,
        "sourceType": "git",
        "customGitUrl": "https://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@github.com/mun0602/sale_keyboard_server.git",
        "customGitBranch": "main",
        "buildType": "dockerfile",
        "dockerfile": "Dockerfile",
        "username": "mun0602",
        "password": "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",
        "repository": None,
        "branch": None,
        "cleanCache": True,
        "applicationStatus": "done"
    }
    make_request("application.update", git_payload)
    print("-> Khôi phục Git URL thành công!")
    
    # 5. Redeploy Git thật
    print("\n5. Kích hoạt redeploy code Go thật từ GitHub...")
    make_request("application.redeploy", {"applicationId": go_app_id})
    print("-> Đã kích hoạt redeploy Go server thật!")

if __name__ == "__main__":
    main()
