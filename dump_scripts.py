import json

with open("project.json", "r", encoding="utf-8") as f:
    project = json.load(f)

def get_block_summary(blocks, block_id):
    if not block_id:
        return ""
    b = blocks.get(block_id)
    if not b or not isinstance(b, dict):
        return str(b)
    op = b.get("opcode", "")
    inputs = b.get("inputs", {})
    fields = b.get("fields", {})
    next_id = b.get("next")
    
    # summarize
    res = f"({op} fields={fields} inputs={list(inputs.keys())})"
    if next_id:
        res += " -> " + get_block_summary(blocks, next_id)
    return res

for t in project["targets"]:
    print(f"\n=================== {t['name']} ===================")
    blocks = t.get("blocks", {})
    hats = [b_id for b_id, data in blocks.items() if isinstance(data, dict) and data.get("topLevel")]
    for h in hats:
        bdata = blocks[h]
        print(f"\n[SCRIPT] {bdata.get('opcode')} (fields: {bdata.get('fields')})")
        # follow next
        curr = bdata.get("next")
        depth = 1
        visited = set([h])
        while curr and curr not in visited:
            visited.add(curr)
            curr_b = blocks.get(curr)
            if not curr_b or not isinstance(curr_b, dict):
                break
            op = curr_b.get("opcode")
            inputs = curr_b.get("inputs", {})
            fields = curr_b.get("fields", {})
            print(f"  {' '*depth}{op} {fields} {list(inputs.keys())}")
            # check substacks
            if "SUBSTACK" in inputs:
                sub_id = inputs["SUBSTACK"][1]
                print(f"  {' '*depth}  [SUBSTACK -> {sub_id}]")
            curr = curr_b.get("next")
