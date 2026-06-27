with open("/Users/macmoon/Documents/code/khach/sale_keyboard_server/main.go", "r", encoding="utf-8") as f:
    lines = f.readlines()

print("--- Scan main.go for routes and login keywords ---")
for i, line in enumerate(lines):
    if "login" in line.lower() or "jwt" in line.lower() or "keyboard" in line.lower():
        # Chỉ in các dòng chứa định nghĩa func hoặc route handler để dễ nhìn
        if "func " in line or "r." in line or "router" in line or "group" in line or "api" in line:
            print(f"Line {i+1}: {line.strip()}")
