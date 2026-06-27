with open("/Users/macmoon/Documents/code/khach/sale_keyboard_server/main.go", "r", encoding="utf-8") as f:
    lines = f.readlines()

print("--- Extract mockTopics and mockPhrases from main.go ---")
in_topics = False
in_phrases = False

for i, line in enumerate(lines):
    if "var mockTopics" in line or "mockTopics = " in line:
        in_topics = True
        print(f"--- mockTopics Start at Line {i+1} ---")
    if in_topics:
        print(line.rstrip())
        if "}" in line and "[]" not in line and not line.startswith("\t") and i > 50:
            # Dừng khi hết block định nghĩa
            if len(line.strip()) == 1 or "]" in line:
                in_topics = False
                print("--- mockTopics End ---\n")

    if "var mockPhrases" in line or "mockPhrases = " in line:
        in_phrases = True
        print(f"--- mockPhrases Start at Line {i+1} ---")
    if in_phrases:
        print(line.rstrip())
        if "}" in line and "[]" not in line and not line.startswith("\t") and i > 50:
            if len(line.strip()) == 1 or "]" in line:
                in_phrases = False
                print("--- mockPhrases End ---\n")
