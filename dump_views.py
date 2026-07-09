
import json
import os

transcript_path = r"C:\Users\LEONIKA\.gemini\antigravity-ide\brain\7d4718ee-9ab1-4156-bebb-4347047e7f68\.system_generated\logs\transcript.jsonl"
with open(transcript_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

count = 0
for line in lines:
    try:
        data = json.loads(line)
        if data.get("type") == "TOOL_RESPONSE" and "output" in data.get("content", ""):
            output = data["content"]
            if "SaaSLanding.tsx" in output:
                with open(f"dump_{count}.txt", "w", encoding="utf-8") as out:
                    out.write(output)
                count += 1
    except:
        pass
print(f"Dumped {count} files")

