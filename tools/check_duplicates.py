import re, collections

with open('modulo-11-garden.js', 'r', encoding='utf-8') as f:
    code = f.read()

m = re.search(r'const rawNodes = \[(.*?)\];\s*const rawEdges', code, re.DOTALL)
if m:
    nodes_code = m.group(1)
    node_lines = [l.strip() for l in nodes_code.split('\n') if l.strip().startswith('{') and 'id:' in l]
    print(f'Total parsed node entries: {len(node_lines)}')
    
    ids = []
    scis = []
    names = []
    for l in node_lines:
        id_m = re.search(r'id:\s*"([^"]+)"', l)
        sci_m = re.search(r'sci:\s*"([^"]+)"', l)
        name_m = re.search(r'name:\s*"([^"]+)"', l)
        if id_m: ids.append(id_m.group(1))
        if sci_m: scis.append(sci_m.group(1).lower().strip())
        if name_m: names.append(name_m.group(1).lower().strip())

    dup_ids = [k for k, v in collections.Counter(ids).items() if v > 1]
    dup_scis = [k for k, v in collections.Counter(scis).items() if v > 1]
    print('Duplicate IDs:', dup_ids)
    print(f'Duplicate scientific names count: {len(dup_scis)}')
    for d in dup_scis:
        print('  Duplicate sci:', d)
