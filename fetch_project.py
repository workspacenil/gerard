import urllib.request
import json
import os

token = "1794595198_3ab4d463ba84fcc546771c1e2da3c4f590c35971b63fc10ecaf2d852b345a200adf5bb4912acc9f4d0025d81679ed40552c32542b96403fa8f8b220d246bde92"
url = f"https://projects.scratch.mit.edu/1394528307?token={token}"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        print("Keys:", list(data.keys()))
        print("Targets count:", len(data.get("targets", [])))
        for t in data.get("targets", []):
            print(f" - Target: {t.get('name')} (isStage: {t.get('isStage')}), blocks count: {len(t.get('blocks', {}))}, costumes: {len(t.get('costumes', []))}")
        with open("project.json", "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        print("Saved project.json successfully")
except Exception as e:
    print("Error:", e)
