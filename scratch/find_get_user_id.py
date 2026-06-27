with open("/Users/macmoon/Documents/code/khach/sale_keyboard_server/main.go", "r", encoding="utf-8") as f:
    lines = f.readlines()

found = False
for i, line in enumerate(lines):
    if "func getUserIDFromToken" in line:
        found = True
        # In khoảng 30 dòng tiếp theo
        for j in range(i, min(i+40, len(lines))):
            print(f"Line {j+1}: {lines[j].rstrip()}")
        break

if not found:
    print("Function not found!")
