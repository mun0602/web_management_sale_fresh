import subprocess

# Chạy lệnh logcat để lấy toàn bộ log
proc = subprocess.Popen(["adb", "logcat", "-d"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
stdout, _ = proc.communicate()
log_lines = stdout.decode("utf-8", errors="ignore").split("\n")

# Lọc các dòng log liên quan đến app hoặc lỗi
print("--- Filtered Logcat Outputs ---")
keywords = ["com.sale.keyboard", "System.err", "KeyboardRepository", "OkHttp", "SSL", "Exception"]
for line in log_lines:
    if any(kw in line for kw in keywords):
        # Chỉ in log của ngày hôm nay (06-27)
        if "06-27" in line:
            print(line)
