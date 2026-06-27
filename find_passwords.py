import os
import re

root_dir = "/Users/macmoon/Documents/code/khach"
print(f"Scanning for .env files in {root_dir}...")

password_patterns = [
    r"pass", r"secret", r"key", r"token", r"auth"
]

found_items = []

for root, dirs, files in os.walk(root_dir):
    # Bỏ qua node_modules và các thư mục ẩn lớn
    if "node_modules" in root or ".next" in root or ".git" in root:
        continue
    for file in files:
        if file.endswith(".env") or file == ".env" or file.endswith(".env.production") or file.endswith(".env.local"):
            file_path = os.path.join(root, file)
            print(f"Found config file: {file_path}")
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    lines = f.readlines()
                for line in lines:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    # Check xem dòng này có chứa pattern mật khẩu không
                    if any(re.search(pattern, line, re.IGNORECASE) for pattern in password_patterns):
                        # Lọc bớt các dòng quá dài hoặc rác
                        if len(line) < 150:
                            found_items.append((file_path, line))
            except Exception as e:
                print(f"Error reading {file_path}: {e}")

print(f"\nScan complete! Found {len(found_items)} potential credentials/keys:")
for path, line in found_items:
    rel_path = os.path.relpath(path, root_dir)
    print(f"[{rel_path}] {line}")
