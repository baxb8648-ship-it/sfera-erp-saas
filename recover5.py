
import json

transcript_path = r"C:\Users\LEONIKA\.gemini\antigravity-ide\brain\576c75b9-edf2-4794-b26a-a96f7ad9efc7\.system_generated\logs\transcript.jsonl"
with open(transcript_path, "r", encoding="utf-8") as f:
    for line in f:
        data = json.loads(line)
        if data.get("type") == "PLANNER_RESPONSE":
            for call in data.get("tool_calls", []):
                args = call.get("args", {})
                target_file = args.get("TargetFile", "")
                if "SaaSLanding.tsx" in target_file:
                    if "CodeContent" in args:
                        with open("recovered_from_write.tsx", "w", encoding="utf-8") as outf:
                            outf.write(args["CodeContent"])
                        print("Found write_to_file in step", data.get("step_index"))
                    elif "ReplacementContent" in args:
                        print("Found replace_file_content in step", data.get("step_index"))

