
import json
import os

transcript_path = r"C:\Users\LEONIKA\.gemini\antigravity-ide\brain\7d4718ee-9ab1-4156-bebb-4347047e7f68\.system_generated\logs\transcript.jsonl"
if not os.path.exists(transcript_path):
    print("Transcript not found at", transcript_path)
else:
    with open(transcript_path, "r", encoding="utf-8") as f:
        for line in f:
            data = json.loads(line)
            if data.get("type") == "PLANNER_RESPONSE":
                for call in data.get("tool_calls", []):
                    args = call.get("args", {})
                    target_file = args.get("TargetFile", "")
                    if "SaaSLanding.tsx" in target_file:
                        if "CodeContent" in args:
                            with open("recovered_from_write_old.tsx", "w", encoding="utf-8") as outf:
                                outf.write(args["CodeContent"])
                            print("Found write_to_file in step", data.get("step_index"))
                        elif "ReplacementContent" in args:
                            print("Found replace_file_content in step", data.get("step_index"))

