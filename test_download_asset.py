import json
import urllib.request
import os

with open("project.json", "r", encoding="utf-8") as f:
    project = json.load(f)

os.makedirs("assets", exist_ok=True)

costume_count = 0
for t in project["targets"]:
    for c in t.get("costumes", []):
        md5 = c.get("md5ext")
        name = c.get("name")
        costume_count += 1

print(f"Total costumes across all targets: {costume_count}")
# test download first costume
test_costume = project["targets"][0]["costumes"][0]
test_md5 = test_costume["md5ext"]
print(f"Testing download of {test_md5}...")
url = f"https://assets.scratch.mit.edu/internalapi/asset/{test_md5}/get/"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
try:
    with urllib.request.urlopen(req) as resp:
        data = resp.read()
        print(f"Success! Downloaded {len(data)} bytes")
        with open(f"assets/{test_md5}", "wb") as f:
            f.write(data)
except Exception as e:
    print("Error:", e)
    # try alternate CDN
    url2 = f"https://cdn.assets.scratch.mit.edu/internalapi/asset/{test_md5}/get/"
    try:
        with urllib.request.urlopen(url2) as resp:
            data = resp.read()
            print(f"Success with url2! Downloaded {len(data)} bytes")
    except Exception as e2:
        print("Error url2:", e2)
