with open("/Users/macmoon/Documents/code/khach/sale_keyboard_server/main.go", "r", encoding="utf-8") as f:
    lines = f.readlines()

found = False
for i, line in enumerate(lines):
    if "func handleExtractProperty" in line:
        found = True
        print(f"--- Found handleExtractProperty at Line {i+1} ---")
        for j in range(i, min(i+120, len(lines))):
            print(lines[j].rstrip())
        break

if not found:
    print("Function not found!")
