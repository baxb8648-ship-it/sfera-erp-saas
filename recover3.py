
import json
import re

transcript_path = r"C:\Users\LEONIKA\.gemini\antigravity-ide\brain\576c75b9-edf2-4794-b26a-a96f7ad9efc7\.system_generated\logs\transcript.jsonl"
with open(transcript_path, "r", encoding="utf-8") as f:
    for line in f:
        data = json.loads(line)
        if data.get("type") == "TOOL_RESPONSE":
            for call in data.get("tool_calls", []):
                out = call.get("output", "")
                if "Total Lines: 782" in out and "MOCK_LISTINGS" in out:
                    lines = out.split("\n")
                    recovered = []
                    in_code = False
                    for l in lines:
                        if l.startswith("1: ") or (in_code and re.match(r"^\d+: ", l)):
                            in_code = True
                            recovered.append(re.sub(r"^\d+: ", "", l))
                        elif in_code:
                            # if we stop seeing line numbers, maybe we hit the end
                            if "The above content does NOT show the entire file contents" in l:
                                break
                    with open("recovered3.tsx", "w", encoding="utf-8") as outf:
                        outf.write("\n".join(recovered))
                    print("Recovered file to recovered3.tsx")
                    break

