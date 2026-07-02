import os

root_dirs = [
    "L:/LEONIKA/Комерческая CRM-ERP (SaaS)/СФЕРА-ЕРП/SPHERA/backend/app",
    "L:/LEONIKA/Комерческая CRM-ERP (SaaS)/СФЕРА-ЕРП/SPHERA/src"
]
found = []

# Ищем упоминания ЛЕОНИКА, LEONIKA, АКЗ в текстовом виде (без учета регистра)
keywords = ["леоника", "leonika", "акз"]

for root_dir in root_dirs:
    if not os.path.exists(root_dir):
        continue
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith((".py", ".ts", ".tsx", ".html", ".css", ".json")):
                path = os.path.join(root, file)
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        lines = f.readlines()
                        for idx, line in enumerate(lines):
                            for kw in keywords:
                                if kw in line.lower():
                                    # Пропускаем комментарии или импорты, если они не влияют на UI/логику
                                    # Но лучше показать все
                                    found.append((path, idx + 1, line.strip(), kw))
                except Exception:
                    pass

if found:
    print(f"Found {len(found)} brand mentions:")
    # Покажем первые 50 упоминаний
    for path, line_num, text, kw in found[:50]:
        rel_path = path.replace("L:/LEONIKA/Комерческая CRM-ERP (SaaS)/СФЕРА-ЕРП/SPHERA/", "")
        print(f"  {rel_path}:{line_num} | Keyword: '{kw}' | Content: {text[:80]}")
else:
    print("No brand mentions found.")
