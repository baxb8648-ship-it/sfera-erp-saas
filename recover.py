
import json

transcript_path = r"C:\Users\LEONIKA\.gemini\antigravity-ide\brain\576c75b9-edf2-4794-b26a-a96f7ad9efc7\.system_generated\logs\transcript.jsonl"
with open(transcript_path, "r", encoding="utf-8") as f:
    for line in f:
        data = json.loads(line)
        # Look for the view_file tool call output or model output
        if data.get("type") == "TOOL_RESPONSE":
            for call in data.get("tool_calls", []):
                if call.get("tool_name") == "default_api:view_file":
                    out = call.get("output", "")
                    if "MOCK_LISTINGS =" in out:
                        with open("recovered_SaaSLanding.tsx", "w", encoding="utf-8") as outf:
                            outf.write(out)
                        print("Recovered file to recovered_SaaSLanding.tsx")

