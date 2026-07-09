
import json
import re

with open("recovered_line.txt", "r", encoding="utf-16") as f: # PowerShell out is usually utf-16
    line = f.read()

try:
    data = json.loads(line)
    if data.get("type") == "TOOL_RESPONSE":
        out = data.get("content", "")
        if "MOCK_LISTINGS" in out:
            lines = out.split("\n")
            recovered = []
            in_code = False
            for l in lines:
                if l.startswith("1: ") or (in_code and re.match(r"^\d+: ", l)):
                    in_code = True
                    recovered.append(re.sub(r"^\d+: ", "", l))
                elif in_code:
                    if "The above content does NOT show the entire file contents" in l:
                        break
            with open("recovered4.tsx", "w", encoding="utf-8") as outf:
                outf.write("\n".join(recovered))
            print("Recovered file to recovered4.tsx, lines:", len(recovered))
        else:
            print("no mock listings in content")
except Exception as e:
    print("Error:", e)

