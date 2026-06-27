with open("/Users/macmoon/Documents/code/khach/sale_keyboard_server/main.go", "r", encoding="utf-8") as f:
    lines = f.readlines()

print("--- Scan main.go for image / video endpoints ---")
for i, line in enumerate(lines):
    if "images" in line.lower() or "videos" in line.lower():
        if "c.json" in line or "action" in line or "http." in line:
            print(f"Line {i+1}: {line.strip()}")
