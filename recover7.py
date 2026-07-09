
import json
import os

transcript_path = r"C:\Users\LEONIKA\.gemini\antigravity-ide\brain\7d4718ee-9ab1-4156-bebb-4347047e7f68\.system_generated\logs\transcript.jsonl"
with open(transcript_path, "r", encoding="utf-8") as f:
    for line in f:
        data = json.loads(line)
        if data.get("type") == "PLANNER_RESPONSE" and data.get("step_index") == 88:
            for call in data.get("tool_calls", []):
                args = call.get("args", {})
                if "SaaSLanding.tsx" in args.get("TargetFile", "") and "ReplacementContent" in args:
                    with open("recovered_replacement.tsx", "w", encoding="utf-8") as outf:
                        outf.write(args["ReplacementContent"])
                    print("Extracted replacement from step 88")

