import json

with open("project.json", "r", encoding="utf-8") as f:
    project = json.load(f)

for target in project["targets"]:
    name = target["name"]
    blocks = target.get("blocks", {})
    print(f"\n==============================\nTARGET: {name}\n==============================")
    
    # Let's inspect custom procedures (My Blocks)
    for b_id, b in blocks.items():
        if isinstance(b, dict) and b.get("opcode") == "procedures_definition":
            proto_id = b["inputs"]["custom_block"][1]
            proto = blocks[proto_id]
            proccode = proto.get("mutation", {}).get("proccode", "")
            warp = proto.get("mutation", {}).get("warp", "")
            print(f"  [PROCEDURE] {proccode} (Run without screen refresh: {warp})")

    # Let's print whenFlagClicked / broadcast handlers
    for b_id, b in blocks.items():
        if isinstance(b, dict) and b.get("opcode") == "event_whenflagclicked":
            print(f"  [EVENT] When Green Flag Clicked -> block {b.get('next')}")
        elif isinstance(b, dict) and b.get("opcode") == "event_whenbroadcastreceived":
            bc = b.get("fields", {}).get("BROADCAST_OPTION", [None])[0]
            print(f"  [EVENT] When I receive '{bc}' -> block {b.get('next')}")
