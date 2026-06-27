import subprocess

proc = subprocess.Popen(["adb", "logcat", "-d"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
stdout, _ = proc.communicate()
log_lines = stdout.decode("utf-8", errors="ignore").split("\n")

# Lọc log của 2 phút gần nhất
print("--- Recent input event / click log ---")
keywords = ["input", "motion", "pointer", "touch", "click", "MainActivity", "com.sale.keyboard"]
for line in log_lines[-500:]:
    if any(kw.lower() in line.lower() for kw in keywords):
        print(line)
