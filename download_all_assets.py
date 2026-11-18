import json
import urllib.request
import os
import zipfile
import time

with open("project.json", "r", encoding="utf-8") as f:
    project = json.load(f)

os.makedirs("assets", exist_ok=True)

# Collect all assets
assets_to_download = {}
for target in project["targets"]:
    for costume in target.get("costumes", []):
        md5 = costume.get("md5ext")
        if md5:
            assets_to_download[md5] = costume.get("name")
    for sound in target.get("sounds", []):
        md5 = sound.get("md5ext")
        if md5:
            assets_to_download[md5] = sound.get("name")

print(f"Total unique assets to download: {len(assets_to_download)}")

downloaded = 0
failed = []

for md5, name in assets_to_download.items():
    local_path = os.path.join("assets", md5)
    if os.path.exists(local_path) and os.path.getsize(local_path) > 0:
        downloaded += 1
        continue
    
    urls = [
        f"https://assets.scratch.mit.edu/internalapi/asset/{md5}/get/",
        f"https://cdn.assets.scratch.mit.edu/internalapi/asset/{md5}/get/"
    ]
    
    success = False
    for url in urls:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                content = resp.read()
                with open(local_path, "wb") as out:
                    out.write(content)
                success = True
                downloaded += 1
                break
        except Exception as e:
            continue
            
    if not success:
        print(f"Failed to download: {md5} ({name})")
        failed.append(md5)

print(f"Downloaded {downloaded}/{len(assets_to_download)} assets.")

# Create the .sb3 file
sb3_name = "2D_Albert_Cabrera.sb3"
print(f"Packaging into {sb3_name}...")
with zipfile.ZipFile(sb3_name, "w", compression=zipfile.ZIP_DEFLATED) as zipf:
    zipf.write("project.json", "project.json")
    for md5 in assets_to_download:
        local_path = os.path.join("assets", md5)
        if os.path.exists(local_path):
            zipf.write(local_path, md5)

print(f"Created {sb3_name} ({os.path.getsize(sb3_name)} bytes).")
