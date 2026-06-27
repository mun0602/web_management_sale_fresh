import re

file_path = "/Users/macmoon/Documents/code/khach/web_management_sale/dokploy_api.json"
try:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    print(f"File size: {len(content)} bytes")
    # Tìm các từ khóa 'volume' hoặc 'mount' trong bán kính 100 ký tự xung quanh
    matches = [m.start() for m in re.finditer(r"(?i)volume|mount", content)]
    print(f"Found {len(matches)} occurrences of 'volume' or 'mount'.")
    for idx, pos in enumerate(matches[:15]):
        start = max(0, pos - 50)
        end = min(len(content), pos + 100)
        snippet = content[start:end].replace("\n", " ")
        print(f"{idx+1}: ... {snippet} ...")
except Exception as e:
    print("Error:", e)
