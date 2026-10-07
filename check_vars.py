import re

with open('modulo-11-garden.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Extract the main script
scripts = re.findall(r'<script\b[^>]*>(.*?)</script>', text, re.DOTALL)
main_js = ""
for s in scripts:
    if 'THREE' in s:
        main_js = s
        break

lines = main_js.split('\n')
print(f"Total lines in main JS: {len(lines)}")

# Find all variable declarations (const, let, var)
declarations = {}
for i, line in enumerate(lines, 1):
    m = re.match(r'^\s*(const|let|var)\s+([a-zA-Z0-9_$]+)', line)
    if m:
        var_type, var_name = m.group(1), m.group(2)
        if var_name not in declarations:
            declarations[var_name] = (i, var_type)

print(f"Total declared top-level variables: {len(declarations)}")
for name, (lno, vtype) in sorted(declarations.items(), key=lambda x: x[1][0]):
    print(f"Line {lno:4d}: {vtype} {name}")
