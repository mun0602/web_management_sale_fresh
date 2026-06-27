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
    print("=== KHỞI TẠO BẢN BUILD ĐẦU TIÊN QUA DOCKER IMAGE ===")
    
    # 1. Chuyển sourceType thành 'docker' và cấu hình Docker Image nginx:alpine
    print("\n1. Đang cấu hình Go app sử dụng Docker Image 'nginx:alpine'...")
    update_payload = {
        "applicationId": go_app_id,
        "sourceType": "docker",
        "dockerImage": "nginx:alpine",
        "username": None,
        "password": None
    }
    # Thử update sourceType trước
    make_request("application.update", update_payload)
    
    # Gọi saveDockerProvider để đảm bảo ghi nhận
    docker_payload = {
        "applicationId": go_app_id,
        "dockerImage": "nginx:alpine",
        "username": "",
        "password": "",
        "registryUrl": ""
    }
    make_request("application.saveDockerProvider", docker_payload)
    print("-> Đã chuyển cấu hình sang Docker Image thành công!")
    
    # 2. Kích hoạt deploy nginx
    print("\n2. Kích hoạt deploy Docker Image...")
    deploy_res = make_request("application.deploy", {"applicationId": go_app_id})
    print("-> Kết quả gọi deploy:", deploy_res)
    
    # 3. Chờ 15 giây và kiểm tra xem đã có deployment chưa
    print("\n3. Đang chờ Dokploy tạo bản ghi build...")
    time.sleep(15)
    
    deployments = check_deployments()
    print(f"-> Danh sách deployments hiện tại: {deployments}")
    
    if not deployments:
        print("-> Vẫn chưa có bản ghi build. Thử gọi redeploy...")
        make_request("application.redeploy", {"applicationId": go_app_id})
        time.sleep(15)
        deployments = check_deployments()
        print(f"-> Danh sách deployments sau redeploy: {deployments}")
        
    if not deployments:
        print("Thất bại trong việc tạo bản ghi build đầu tiên bằng Docker Image. Dừng.")
        sys.exit(1)
        
    print("\n-> Đã khởi tạo bản ghi build đầu tiên thành công!")
    
    # 4. Cấu hình trở lại Git Custom URL của Golang server
    print("\n4. Đang chuyển cấu hình trở lại Git Custom URL thật...")
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
        "cleanCache": True
    }
    make_request("application.update", git_payload)
    print("-> Đã phục hồi cấu hình Git Custom URL!")
    
    # 5. Kích hoạt redeploy ứng dụng Go thật
    print("\n5. Kích hoạt redeploy code Go thật từ GitHub...")
    make_request("application.redeploy", {"applicationId": go_app_id})
    print("-> Đã gửi lệnh redeploy cho server Go thật!")

if __name__ == "__main__":
    main()
