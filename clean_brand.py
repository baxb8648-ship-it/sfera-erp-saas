import os

root_dirs = [
    "L:/LEONIKA/Комерческая CRM-ERP (SaaS)/СФЕРА-ЕРП/SPHERA/backend/app",
    "L:/LEONIKA/Комерческая CRM-ERP (SaaS)/СФЕРА-ЕРП/SPHERA/src",
    "L:/LEONIKA/Комерческая CRM-ERP (SaaS)/СФЕРА-ЕРП/SPHERA"
]

# Файлы для обработки
extensions = (".py", ".ts", ".tsx", ".html", ".css", ".json")

# Словари замен
replacements = {
    "ЛЕОНИКА CRM": "СФЕРА",
    "ЛЕОНИКА": "СФЕРА",
    "Леоника": "Сфера",
    "leonika": "sphera",
    "Leonika": "Sphera",
    "LEONIKA": "SPHERA",
    "Welcome to ЛЕОНИКА CRM API": "Welcome to SPHERA API",
    "ЛЕОНИКА CRM API": "SPHERA API",
    # Убираем специфику АКЗ
    "АКЗ/пескоструй/огнезащита": "Строительство и услуги",
    "АКЗ, пескоструй, огнезащита": "Строительство и снабжение",
    "АКЗ и пескоструй": "Работы и услуги",
    "service_required=\"АКЗ\"": "service_required=\"Строительство\"",
    "service_required = \"АКЗ\"": "service_required = \"Строительство\"",
}

modified_files_count = 0

print("Starting codebase cleaning (abstracting to SPHERA)...")

for root_dir in root_dirs:
    if not os.path.exists(root_dir):
        continue
    for root, dirs, files in os.walk(root_dir):
        # Пропускаем системные папки
        if any(p in root for p in ["node_modules", "venv", ".git", "dist", ".agents"]):
            continue
        for file in files:
            # Не трогаем сам скрипт очистки
            if file == "clean_brand.py" or file == "find_brand_mentions.py":
                continue
            if file.endswith(extensions):
                path = os.path.join(root, file)
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        content = f.read()
                    
                    original_content = content
                    has_changes = False
                    
                    # Применяем замены
                    for old, new in replacements.items():
                        if old in content:
                            content = content.replace(old, new)
                            has_changes = True
                            
                    if has_changes:
                        with open(path, "w", encoding="utf-8") as f:
                            f.write(content)
                        rel_path = path.replace("L:/LEONIKA/Комерческая CRM-ERP (SaaS)/СФЕРА-ЕРП/SPHERA/", "")
                        print(f"  CLEANED: {rel_path}")
                        modified_files_count += 1
                except Exception as e:
                    print(f"  Error processing file {file}: {e}")

print(f"\n🎉 Clean up complete! Modified {modified_files_count} files.")
