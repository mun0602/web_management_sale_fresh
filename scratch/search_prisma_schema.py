with open("/Users/macmoon/Documents/code/khach/web_management_sale/prisma/schema.prisma", "r", encoding="utf-8") as f:
    schema = f.read()

print("--- Scan schema.prisma for AI Profile ---")
if "AiProfile" in schema or "ai_profile" in schema or "Profile" in schema:
    # In ra các phần khớp
    lines = schema.split("\n")
    for i, line in enumerate(lines):
        if "model " in line and ("profile" in line.lower() or "ai" in line.lower()):
            start = max(0, i - 1)
            end = min(len(lines), i + 25)
            print(f"\n--- Model definition at line {i+1} ---")
            for j in range(start, end):
                print(lines[j])
else:
    print("AI Profile model not found in Prisma schema.")
