import json

with open("project.json", "r", encoding="utf-8") as f:
    project = json.load(f)

print("=== TARGETS ===")
for t in project["targets"]:
    print(f"\n--- Name: {t['name']} (isStage: {t['isStage']}) ---")
    vars = t.get("variables", {})
    if vars:
        print("  Variables:", {v[0]: v[1] for k, v in vars.items()})
    broadcasts = t.get("broadcasts", {})
    if broadcasts:
        print("  Broadcasts:", broadcasts)
    lists = t.get("lists", {})
    if lists:
        print("  Lists:", {l[0]: len(l[1]) for k, l in lists.items()})
    costumes = t.get("costumes", [])
    print("  Costumes:", [c.get("name") for c in costumes])
    sounds = t.get("sounds", [])
    print("  Sounds:", [s.get("name") for s in sounds])

    # Count top-level hat blocks (scripts)
    blocks = t.get("blocks", {})
    hats = [b for b, data in blocks.items() if isinstance(data, dict) and data.get("topLevel")]
    print(f"  Script roots (hats): {len(hats)}")
    for h in hats:
        bdata = blocks[h]
        opcode = bdata.get("opcode")
        print(f"    - Hat: {opcode}")
