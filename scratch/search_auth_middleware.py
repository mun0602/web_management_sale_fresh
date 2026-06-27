with open("/Users/macmoon/Documents/code/khach/sale_keyboard_server/main.go", "r", encoding="utf-8") as f:
    lines = f.readlines()

print("--- Scan main.go for authGroup and middleware config ---")
for i, line in enumerate(lines):
    if "authGroup :=" in line or "authGroup =" in line:
        start = max(0, i - 2)
        end = min(len(lines), i + 20)
        print(f"\n--- Occurrence at Line {i+1} ---")
        for j in range(start, end):
            print(f"Line {j+1}: {lines[j].rstrip()}")
