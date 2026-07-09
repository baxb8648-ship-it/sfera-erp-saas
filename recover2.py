
import json
import re

transcript_path = r"C:\Users\LEONIKA\.gemini\antigravity-ide\brain\576c75b9-edf2-4794-b26a-a96f7ad9efc7\.system_generated\logs\transcript.jsonl"
with open(transcript_path, "r", encoding="utf-8") as f:
    for line in f:
        data = json.loads(line)
        if data.get("type") == "TOOL_RESPONSE":
            content = data.get("content", "")
            if "Total Lines: 782" in content and "MOCK_LISTINGS" in content:
                # remove line numbers from the output
                lines = content.split("\n")
                recovered = []
                in_code = False
                for l in lines:
                    if l.startswith("1: ") or (in_code and re.match(r"^\d+: ", l)):
                        in_code = True
                        # strip the number and colon
                        recovered.append(re.sub(r"^\d+: ", "", l))
                with open("recovered2.tsx", "w", encoding="utf-8") as outf:
                    outf.write("\n".join(recovered))
                print("Recovered file to recovered2.tsx")
                break

