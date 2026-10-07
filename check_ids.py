import re

with open('modulo-11-garden.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Check DOM element IDs that might be accessed by document.getElementById
ids_accessed = re.findall(r"document\.getElementById\(['\"]([^'\"]+)['\"]\)", text)
ids_accessed += re.findall(r"\$\(['\"]#([^'\"]+)['\"]\)", text)
ids_accessed = set(ids_accessed)

print(f"Total element IDs accessed in JS: {len(ids_accessed)}")

# Find all IDs defined in HTML
ids_defined = set(re.findall(r'id=["\']([^"\']+)["\']', text))

missing = []
for id_name in sorted(ids_accessed):
    if id_name not in ids_defined:
        missing.append(id_name)

if missing:
    print("WARNING: The following IDs are accessed in JS but not found in HTML:")
    for m in missing:
        print("  -", m)
else:
    print("All accessed element IDs exist in HTML!")
