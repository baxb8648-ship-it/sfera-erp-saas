import os

root_dir = "L:/SPHERA/Комерческая CRM-ERP (SaaS)/СФЕРА-ЕРП/SPHERA"
found = []

# Расширения файлов для поиска жестких путей
extensions = (".py", ".bat", ".ts", ".tsx", ".json", ".html")

for root, dirs, files in os.walk(root_dir):
    # Пропускаем node_modules и venv
    if "node_modules" in root or "venv" in root:
        continue
    for file in files:
        if file.endswith(extensions):
            path = os.path.join(root, file)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                    # Ищем подстроки с АКЗ
                    if "АКЗ/АКЗ" in content or "АКЗ\\АКЗ" in content:
                        found.append((path, "АКЗ"))
            except Exception:
                pass

if found:
    print("Found files with old paths:")
    for f, term in found:
        print(f"  {f} ({term})")
else:
    print("No old paths found!")
