
import re

with open("src/pages/SaaSLanding.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    new_line = line
    # Replace background color
    new_line = new_line.replace("bg-[#0F0F11]", "bg-white dark:bg-[#0F0F11]")
    new_line = new_line.replace("bg-zinc-900/80", "bg-white/80 dark:bg-zinc-900/80")
    new_line = new_line.replace("bg-zinc-900/90", "bg-white/90 dark:bg-zinc-900/90")
    new_line = new_line.replace("bg-zinc-900", "bg-zinc-50 dark:bg-zinc-900")
    new_line = new_line.replace("bg-zinc-950/80", "bg-zinc-100/80 dark:bg-zinc-950/80")
    new_line = new_line.replace("bg-zinc-950/90", "bg-zinc-100/90 dark:bg-zinc-950/90")
    new_line = new_line.replace("bg-zinc-950/50", "bg-zinc-50/50 dark:bg-zinc-950/50")
    new_line = new_line.replace("bg-zinc-800/80", "bg-zinc-100/80 dark:bg-zinc-800/80")
    new_line = new_line.replace("bg-zinc-800/40", "bg-zinc-50/40 dark:bg-zinc-800/40")
    new_line = new_line.replace("bg-zinc-800", "bg-zinc-100 dark:bg-zinc-800")
    
    # Text colors
    new_line = new_line.replace("text-zinc-100", "text-zinc-900 dark:text-zinc-100")
    # careful with text-white, it"s often used in buttons. we should probably keep buttons white if they have colorful backgrounds.
    # let"s replace text-white only if it"s part of the text
    # Actually, text-white is used for headings. Let"s replace text-white -> text-zinc-900 dark:text-white
    # but not inside the cta buttons. So let"s just do text-white inside typography classes.
    new_line = new_line.replace("text-zinc-300", "text-zinc-700 dark:text-zinc-300")
    new_line = new_line.replace("text-zinc-400", "text-zinc-600 dark:text-zinc-400")
    new_line = new_line.replace("text-zinc-200", "text-zinc-800 dark:text-zinc-200")
    
    # Border colors
    new_line = new_line.replace("border-zinc-800/80", "border-zinc-200 dark:border-zinc-800/80")
    new_line = new_line.replace("border-zinc-800/60", "border-zinc-200 dark:border-zinc-800/60")
    new_line = new_line.replace("border-zinc-800", "border-zinc-200 dark:border-zinc-800")
    new_line = new_line.replace("border-zinc-700/60", "border-zinc-300 dark:border-zinc-700/60")
    new_line = new_line.replace("border-zinc-700/40", "border-zinc-200 dark:border-zinc-700/40")
    new_line = new_line.replace("border-zinc-700", "border-zinc-300 dark:border-zinc-700")

    # Gradients
    new_line = new_line.replace("from-zinc-900/80", "from-zinc-50/80 dark:from-zinc-900/80")
    new_line = new_line.replace("to-zinc-950/80", "to-zinc-100/80 dark:to-zinc-950/80")
    new_line = new_line.replace("from-zinc-800", "from-zinc-100 dark:from-zinc-800")
    new_line = new_line.replace("to-zinc-900", "to-zinc-50 dark:to-zinc-900")
    
    new_lines.append(new_line)

with open("src/pages/SaaSLanding.tsx", "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("Fixed theme via python script.")

