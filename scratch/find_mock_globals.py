with open("/Users/macmoon/Documents/code/khach/sale_keyboard_server/main.go", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "var mockTopics" in line:
        print(f"--- Found mockTopics at Line {i+1} ---")
        for j in range(i, min(i+40, len(lines))):
            print(lines[j].rstrip())
        print("--------------------------------------\n")
    if "var mockPhrases" in line:
        print(f"--- Found mockPhrases at Line {i+1} ---")
        for j in range(i, min(i+100, len(lines))):
            print(lines[j].rstrip())
        print("--------------------------------------\n")
