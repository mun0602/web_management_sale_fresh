import urllib.request
import json
import sys

api_key = "DdCbtjbnwkPrXovpVzIuOQoqrziDapCpShQmWVeBTWDcnofZqSbRhaSVwNQrxRdm"
headers = {
    "x-api-key": api_key,
    "Content-Type": "application/json"
}
base_url = "http://103.82.193.14:3000/api"
environment_id = "UwI4WZ5Z26JkQbGgeKhvE"
nextjs_app_id = "6EuIS0o5EfjwZDflndjwI"

# ID của app Go lỗi bằng Application cũ
old_failed_go_id = "RZs2GJn6Sjo3hvJS6dB1H"

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

def main():
    print("=== DEPLOY BACKEND GO QUA DOCKER COMPOSE ===")
    
    # 0. Dọn dẹp ứng dụng Go cũ (Application)
    if old_failed_go_id:
        print(f"\n0. Đang dọn dẹp ứng dụng Go cũ (ID: {old_failed_go_id})...")
        delete_res = make_request("application.delete", {"applicationId": old_failed_go_id})
        if delete_res is not None:
            print("-> Đã xóa ứng dụng Application cũ thành công!")
            
    # 1. Tạo dịch vụ Compose mới 'sale-keyboard-compose'
    print("\n1. Đang tạo dịch vụ Docker Compose mới 'sale-keyboard-compose'...")
    create_payload = {
        "name": "sale-keyboard-compose",
        "environmentId": environment_id
    }
    compose_data = make_request("compose.create", create_payload)
    if not compose_data:
        print("Không thể tạo dịch vụ Docker Compose. Dừng.")
        sys.exit(1)
        
    compose_id = compose_data.get("composeId")
    compose_app_name = compose_data.get("appName")
    print(f"-> Đã tạo thành công! ID: {compose_id}, AppName: {compose_app_name}")
    
    # 2. Cấu hình Git Custom URL cho Compose
    print("\n2. Cấu hình Git repository cho Compose...")
    update_payload = {
        "composeId": compose_id,
        "sourceType": "git",
        "customGitUrl": "https://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@github.com/mun0602/sale_keyboard_server.git",
        "customGitBranch": "main",
        "username": "mun0602",
        "password": "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",
        "repository": None,
        "branch": None,
        "composePath": "docker-compose.yml"
    }
    make_request("compose.update", update_payload)
    print("-> Đã cấu hình Git thành công!")
    
    # 3. Tạo Domain phụ ảo trỏ tới service 'app' trong compose
    print("\n3. Tạo domain ảo cho dịch vụ Compose...")
    domain_payload = {
        "host": "go-compose-103-82-193-14.sslip.io",
        "composeId": compose_id,
        "serviceName": "app", # Tên service định nghĩa trong docker-compose.yml
        "port": 8080,
        "https": False,
        "certificateType": "none",
        "path": "/"
    }
    make_request("domain.create", domain_payload)
    print("-> Đã tạo domain go-compose-103-82-193-14.sslip.io thành công!")
    
    # 4. Cập nhật biến môi trường cho Next.js để kết nối mạng nội bộ của Compose
    # Swarm service name mặc định cho compose là: [compose-appName]_app
    go_internal_url = f"http://{compose_app_name}_app:8080"
    print(f"\n4. Cập nhật GO_SERVER_URL={go_internal_url} cho Next.js...")
    next_app_url = f"application.one?applicationId={nextjs_app_id}"
    next_app_data = make_request(next_app_url, method="GET")
    if not next_app_data:
        print("Không thể lấy cấu hình Next.js.")
        sys.exit(1)
        
    current_next_env = next_app_data.get("env", "")
    lines = current_next_env.split("\n")
    updated_lines = []
    found = False
    for line in lines:
        if line.startswith("GO_SERVER_URL="):
            updated_lines.append(f"GO_SERVER_URL={go_internal_url}")
            found = True
        elif line.strip():
            updated_lines.append(line)
    if not found:
        updated_lines.append(f"GO_SERVER_URL={go_internal_url}")
    new_next_env = "\n".join(updated_lines)
    
    next_env_payload = {
        "applicationId": nextjs_app_id,
        "env": new_next_env,
        "buildArgs": "",
        "buildSecrets": "",
        "createEnvFile": True
    }
    make_request("application.saveEnvironment", next_env_payload)
    print(f"-> Đã cập nhật GO_SERVER_URL cho Next.js!")
    
    # 5. Kích hoạt deploy Compose
    print("\n5. Kích hoạt deploy Docker Compose...")
    make_request("compose.deploy", {"composeId": compose_id})
    print("-> Đã gửi lệnh deploy cho Docker Compose!")
    
    # 6. Kích hoạt deploy Next.js (để cập nhật định tuyến mới)
    print("\n6. Kích hoạt redeploy Next.js...")
    make_request("application.redeploy", {"applicationId": nextjs_app_id})
    print("-> Đã gửi lệnh redeploy cho Next.js!")
    
    print("\n=== HOÀN TẤT KỊCH BẢN COMPOSE ===")
    print(f"Compose ID: {compose_id}")
    print(f"Đường dẫn kết nối nội bộ của Next.js: {go_internal_url}")

if __name__ == "__main__":
    main()
