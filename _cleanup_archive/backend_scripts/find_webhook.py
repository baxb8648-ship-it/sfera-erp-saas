import os

root_dir = "L:/SPHERA/Комерческая CRM-ERP (SaaS)/СФЕРА-ЕРП/АКЗ/backend"
found = []

for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith(".py"):
            path = os.path.join(root, file)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                    if "setwebhook" in content.lower():
                        found.append(path)
            except Exception:
                pass

if found:
    print("Found files:")
    for f in found:
        print(f"  {f}")
else:
    print("No files with setWebhook found.")
