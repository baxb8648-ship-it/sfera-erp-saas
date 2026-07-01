import os

def search_in_file(filepath, keywords):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    for idx, line in enumerate(lines):
        for kw in keywords:
            if kw.lower() in line.lower():
                print(f"{os.path.basename(filepath)}:{idx+1}: {line.strip()[:100]}")
                break

search_in_file('l:/SPHERA/АКЗ/АКЗ/АКЗ/src/crm/pages/Tasks.tsx', ['kanban', 'modal', 'card', 'click', 'detail', 'dialog', 'view'])
