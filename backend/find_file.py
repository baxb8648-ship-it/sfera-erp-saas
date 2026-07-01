import os

root_dir = "l:/SPHERA/АКЗ/АКЗ"
found = []
for root, dirs, files in os.walk(root_dir):
    for file in files:
        if "saas_platform" in file.lower() or "module_map" in file.lower():
            found.append(os.path.join(root, file))

if found:
    print("Found files:")
    for f in found:
        print(f"  {f}")
else:
    print("No matching files found.")
