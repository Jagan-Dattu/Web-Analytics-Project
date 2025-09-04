import json, csv, os

LOG = os.path.join(os.path.dirname(__file__), "..", "logs", "events.jsonl")
OUT = os.path.join(os.path.dirname(__file__), "events_export.csv")

fields = ["ts","type","player","action","amount","pot","street","board"]

with open(LOG, "r", encoding="utf-8") as fin, open(OUT, "w", newline="", encoding="utf-8") as fout:
    w = csv.writer(fout)
    w.writerow(fields)
    for line in fin:
        obj = json.loads(line)
        w.writerow([
            obj.get("ts",""),
            obj.get("type",""),
            obj.get("player",""),
            obj.get("action",""),
            obj.get("amount",""),
            obj.get("pot",""),
            obj.get("street",""),
            ",".join(obj.get("board",[])) if isinstance(obj.get("board",[]), list) else ""
        ])

print("Wrote:", OUT)
