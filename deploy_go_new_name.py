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

# ID của app Go lỗi trước đó để dọn dẹp
old_failed_go_id = "qnkDd1ksDOHiHX5fPvLdB"

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
    print("=== DEPLOY BACKEND GO VỚI TÊN MỚI ===")
    
    # 0. Dọn dẹp ứng dụng Go cũ
    if old_failed_go_id:
        print(f"\n0. Đang dọn dẹp ứng dụng Go cũ (ID: {old_failed_go_id})...")
        delete_res = make_request("application.delete", {"applicationId": old_failed_go_id})
        if delete_res is not None:
            print("-> Đã xóa ứng dụng cũ thành công!")
            
    # 1. Tạo ứng dụng Golang với tên mới 'sale-keyboard-backend'
    print("\n1. Đang tạo ứng dụng Golang mới 'sale-keyboard-backend'...")
    create_payload = {
        "name": "sale-keyboard-backend",
        "environmentId": environment_id
    }
    app_data = make_request("application.create", create_payload)
    if not app_data:
        print("Không thể tạo ứng dụng Golang mới. Dừng.")
        sys.exit(1)
        
    go_app_id = app_data.get("applicationId")
    go_app_name = app_data.get("appName")
    print(f"-> Đã tạo thành công! ID: {go_app_id}, AppName: {go_app_name}")
    
    # 2. Cấu hình Git Custom URL (giống Next.js 100%)
    print("\n2. Cấu hình Git repository và Dockerfile...")
    update_payload = {
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
    make_request("application.update", update_payload)
    print("-> Đã cấu hình Git thành công!")
    
    # 3. Tạo Domain phụ ảo
    print("\n3. Tạo domain ảo cho ứng dụng Go...")
    domain_payload = {
        "host": "go-backend-103-82-193-14.sslip.io",
        "applicationId": go_app_id,
        "port": 8080,
        "https": False,
        "certificateType": "none",
        "path": "/"
    }
    make_request("domain.create", domain_payload)
    print("-> Đã tạo domain go-backend-103-82-193-14.sslip.io thành công!")
    
    # 4. Thiết lập biến môi trường
    print("\n4. Thiết lập các biến môi trường cho server Go...")
    go_env_vars = (
        "PORT=8080\n"
        "GIN_MODE=release\n"
        "DATABASE_URL=postgresql://admin:password123@postgres-compress-auxiliary-sensor-fwzvc9:5432/salekeyboard?sslmode=disable\n"
        "REDIS_URL=redis://:redisPassword123@redis-navigate-redundant-bus-zorldi:6379/0\n"
        "AI_API_URL=https://vps.mun-ai.art/v1\n"
        "AI_API_KEY=sk-77056df5cbf6399d-iadki5-d3d0f1f5\n"
        "AI_MODEL=minimax/MiniMax-M3\n"
        "ADMIN_SESSION_SECRET=sale_keyboard_secret_key_123"
    )
    env_payload = {
        "applicationId": go_app_id,
        "env": go_env_vars,
        "buildArgs": "",
        "buildSecrets": "",
        "createEnvFile": True
    }
    make_request("application.saveEnvironment", env_payload)
    print("-> Đã lưu cấu hình biến môi trường!")
    
    # 5. Cập nhật biến môi trường cho Next.js để kết nối mạng nội bộ
    print("\n5. Cập nhật định tuyến Next.js...")
    next_app_url = f"application.one?applicationId={nextjs_app_id}"
    next_app_data = make_request(next_app_url, method="GET")
    if not next_app_data:
        print("Không thể lấy cấu hình Next.js.")
        sys.exit(1)
        
    current_next_env = next_app_data.get("env", "")
    go_internal_url = f"http://{go_app_name}:8080"
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
    print(f"-> Đã cập nhật GO_SERVER_URL={go_internal_url} cho Next.js!")
    
    # 6. Kích hoạt deploy Go app mới
    print("\n6. Kích hoạt deploy server Go...")
    make_request("application.deploy", {"applicationId": go_app_id})
    print("-> Đã gửi lệnh deploy cho Go server!")
    
    # 7. Kích hoạt deploy Next.js
    print("\n7. Kích hoạt deploy Next.js...")
    make_request("application.deploy", {"applicationId": nextjs_app_id})
    print("-> Đã gửi lệnh deploy cho Next.js!")
    
    print("\n=== HOÀN TẤT KỊCH BẢN ===")
    print(f"Go App ID mới: {go_app_id}")
    print(f"Đường dẫn kết nối nội bộ: {go_internal_url}")

if __name__ == "__main__":
    main()
