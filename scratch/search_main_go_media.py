with open("/Users/macmoon/Documents/code/khach/sale_keyboard_server/main.go", "r", encoding="utf-8") as f:
    lines = f.readlines()

print("--- Scan main.go for media / topics / phrases logic ---")
for i, line in enumerate(lines):
    if 'action == "images"' in line or 'action == "videos"' in line or 'action == "topics"' in line or 'action == "phrases"' in line:
        # In các dòng xung quanh
        start = max(0, i - 2)
        end = min(len(lines), i + 25)
        print(f"\n--- Occurrence at Line {i+1} ---")
        for j in range(start, end):
            print(f"Line {j+1}: {lines[j].rstrip()}")
