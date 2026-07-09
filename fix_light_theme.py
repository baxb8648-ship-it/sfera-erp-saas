
import re

with open("src/pages/SaaSLanding.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    # Fix the double dark classes
    if "dark:bg-zinc-50 dark:bg-zinc-900/80" in line:
        lines[i] = line.replace("dark:bg-zinc-50 dark:bg-zinc-900/80", "dark:bg-zinc-900/80")
    if "dark:border-zinc-200 dark:border-zinc-800/80" in line:
        lines[i] = line.replace("dark:border-zinc-200 dark:border-zinc-800/80", "dark:border-zinc-800/80")

    # Fix H1, H2, H3 text-white
    if re.search(r"<(h1|h2|h3)[^>]*text-white", line):
        lines[i] = line.replace("text-white", "text-zinc-900 dark:text-white")

    # Fix specific gradients and boxes
    if "from-zinc-900/90 to-zinc-950/90" in line:
        lines[i] = line.replace("from-zinc-900/90 to-zinc-950/90", "from-zinc-50/90 to-zinc-100/90 dark:from-zinc-900/90 dark:to-zinc-950/90")
    
    if "input" in line and "text-white" in line and "bg-zinc-100/80" in line:
        lines[i] = line.replace("text-white", "text-zinc-900 dark:text-white")

    if "from-zinc-900/90 via-zinc-900/60 to-orange-950/20" in line:
        lines[i] = line.replace("from-zinc-900/90 via-zinc-900/60 to-orange-950/20", "from-zinc-50/90 via-zinc-50/60 to-orange-100/20 dark:from-zinc-900/90 dark:via-zinc-900/60 dark:to-orange-950/20")

    if "from-orange-950/40 via-zinc-900/80 to-orange-950/40" in line:
        lines[i] = line.replace("from-orange-950/40 via-zinc-900/80 to-orange-950/40", "from-orange-50/40 via-zinc-50/80 to-orange-50/40 dark:from-orange-950/40 dark:via-zinc-900/80 dark:to-orange-950/40")

with open("src/pages/SaaSLanding.tsx", "w", encoding="utf-8") as f:
    f.writelines(lines)
print("Applied targeted light theme fixes!")

