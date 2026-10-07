import re, collections

with open('modulo-11-garden.js', 'r', encoding='utf-8') as f:
    code = f.read()

m = re.search(r'function buildFullDataset\(\)\s*\{(.*?)\n  \}', code, re.DOTALL)
if m:
    fn_code = m.group(1)
    # Extract all array definitions [ID, name, sci, role, stratum, photo, ... ]
    pattern = re.compile(r'\[\s*["\']([A-Z]+-\d+)["\'],\s*["\']([^"\']+)["\'],\s*["\']([^"\']+)["\']')
    matches = pattern.findall(fn_code)
    print(f'Total species parsed: {len(matches)}')
    ids = [x[0] for x in matches]
    names = [x[1].strip() for x in matches]
    scis = [x[2].strip().lower() for x in matches]
    
    dup_ids = [k for k, v in collections.Counter(ids).items() if v > 1]
    dup_names = [k for k, v in collections.Counter(names).items() if v > 1]
    dup_scis = [k for k, v in collections.Counter(scis).items() if v > 1]
    print(f'Duplicate IDs: {dup_ids}')
    print(f'Duplicate common names: {len(dup_names)}')
    for n in dup_names:
        print(f'  Common name dup: {n}')
    print(f'Duplicate scientific names count: {len(dup_scis)}')
    for s in dup_scis:
        print(f'  Sci name dup: {s}')
