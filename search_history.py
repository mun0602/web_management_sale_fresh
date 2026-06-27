import os
import re

history_path = os.path.expanduser("~/.zsh_history")
print(f"Reading history from {history_path}...")

if not os.path.exists(history_path):
    print("History file not found.")
    # Thử check bash_history
    history_path = os.path.expanduser("~/.bash_history")

if os.path.exists(history_path):
    try:
        # Lịch sử zsh đôi khi chứa ký tự không hợp lệ, dùng errors='ignore'
        with open(history_path, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
        
        matches = []
        for line in lines:
            if "103.82.193.14" in line or "ssh" in line.lower() or "dokploy" in line.lower():
                matches.append(line.strip())
                
        print(f"Found {len(matches)} matching history lines:")
        # In ra 30 dòng cuối cùng khớp để tránh log quá dài
        for idx, match in enumerate(matches[-30:]):
            print(f"{idx+1}: {match}")
    except Exception as e:
        print("Error reading file:", e)
else:
    print("No history file found.")
