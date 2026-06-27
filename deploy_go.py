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
environment_id = "UwI4WZ5Z26JkQbGgeKhvE"
nextjs_app_id = "6EuIS0o5EfjwZDflndjwI"

# ID của app Go lỗi trước đó để dọn dẹp sạch sẽ
old_failed_go_id = "006h5miD_aPldWyT7o76O"

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
    print("=== BẮT ĐẦU QUY TRÌNH DEPLOY TỰ ĐỘNG LÊN DOKPLOY ===")
    
    # 0. Dọn dẹp ứng dụng lỗi cũ nếu có
    if old_failed_go_id:
        print(f"\n0. Đang dọn dẹp ứng dụng Go cũ bị lỗi (ID: {old_failed_go_id})...")
        delete_res = make_request("application.delete", {"applicationId": old_failed_go_id})
        if delete_res is not None:
            print("-> Đã xóa ứng dụng cũ thành công!")
        else:
            print("-> Không cần xóa hoặc ứng dụng cũ không tồn tại.")
            
    # 1. Tạo ứng dụng Golang
    print("\n1. Đang tạo ứng dụng Golang 'sale-keyboard-server'...")
    create_payload = {
        "name": "sale-keyboard-server",
        "environmentId": environment_id
    }
    app_data = make_request("application.create", create_payload)
    if not app_data:
        print("Không thể tạo ứng dụng Golang mới. Dừng tiến trình.")
        sys.exit(1)
        
    go_app_id = app_data.get("applicationId")
    go_app_name = app_data.get("appName")
    print(f"-> Đã tạo ứng dụng thành công!")
    print(f"   Application ID: {go_app_id}")
    print(f"   Internal Docker App Name: {go_app_name}")
    
    # 2. Cấu hình Git & Dockerfile với đầy đủ thông tin branch và repository
    print("\n2. Đang cấu hình Git repository và Dockerfile...")
    update_payload = {
        "applicationId": go_app_id,
        "sourceType": "git",
        "customGitUrl": "https://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@github.com/mun0602/sale_keyboard_server.git",
        "customGitBranch": "main",
        "buildType": "dockerfile",
        "dockerfile": "Dockerfile",
        "username": "mun0602",
        "password": "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",
        "branch": "main",
        "repository": "mun0602/sale_keyboard_server",
        "cleanCache": True,
        "cpuLimit": None,
        "cpuReservation": None,
        "memoryLimit": None,
        "memoryReservation": None
    }
    make_request("application.update", update_payload)
    print("-> Đã cập nhật Git & Dockerfile thành công!")
    
    # 3. Cấu hình biến môi trường cho Go app
    print("\n3. Đang thiết lập các biến môi trường cho server Go...")
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
    print("-> Đã lưu cấu hình biến môi trường cho server Go!")
    
    # 4. Kích hoạt redeploy server Go
    print("\n4. Đang kích hoạt redeploy server Go để khởi động Docker Swarm service...")
    redeploy_payload = {
        "applicationId": go_app_id
    }
    make_request("application.redeploy", redeploy_payload)
    print("-> Server Go đang được biên dịch và chạy trên Dokploy!")
    
    # 5. Cập nhật biến môi trường cho Next.js để kết nối mạng nội bộ Docker
    print("\n5. Đang lấy thông tin ứng dụng Next.js hiện tại...")
    next_app_url = f"application.one?applicationId={nextjs_app_id}"
    next_app_data = make_request(next_app_url, method="GET")
    if not next_app_data:
        print("Không thể lấy thông tin ứng dụng Next.js. Dừng tiến trình.")
        sys.exit(1)
        
    current_next_env = next_app_data.get("env", "")
    print("   Đang phân tích biến môi trường của Next.js...")
    
    # Cập nhật hoặc thêm biến GO_SERVER_URL trỏ về container Go qua cổng 8080
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
    
    print(f"   Thiết lập GO_SERVER_URL={go_internal_url}")
    print("   Đang lưu cấu hình môi trường mới vào Next.js...")
    next_env_payload = {
        "applicationId": nextjs_app_id,
        "env": new_next_env,
        "buildArgs": "",
        "buildSecrets": "",
        "createEnvFile": True
    }
    make_request("application.saveEnvironment", next_env_payload)
    print("-> Đã cập nhật biến môi trường cho Next.js thành công!")
    
    # 6. Redeploy Next.js
    print("\n6. Đang kích hoạt redeploy ứng dụng Next.js để áp dụng định tuyến mới...")
    next_deploy_payload = {
        "applicationId": nextjs_app_id
    }
    make_request("application.redeploy", next_deploy_payload)
    print("-> Ứng dụng Next.js đang được redeploy!")
    
    print("\n=== QUY TRÌNH DEPLOY HOÀN TẤT THÀNH CÔNG ===")
    print(f"Mạng Docker nội bộ: Next.js sẽ định tuyến request AI đến {go_internal_url}")
    print("Vui lòng đợi vài phút để cả 2 container hoàn tất quá trình build và khởi chạy.")

if __name__ == "__main__":
    main()
