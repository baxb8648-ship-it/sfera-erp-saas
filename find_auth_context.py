import os

src_dir = "L:/LEONIKA/Комерческая CRM-ERP (SaaS)/СФЕРА-ЕРП/SPHERA/src"
found = []

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if "authcontext" in file.lower():
            found.append(os.path.join(root, file))

if found:
    print("Found AuthContext file:")
    for f in found:
        print(f"  {f}")
else:
    print("AuthContext file not found.")
