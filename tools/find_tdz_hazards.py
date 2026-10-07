import re

with open('modulo-11-garden.js', 'r', encoding='utf-8') as f:
    code = f.read()

lines = code.split('\n')

# Find all let / const declarations
decl_pattern = re.compile(r'^\s*(const|let)\s+([a-zA-Z0-9_$]+)\s*(=|;)')
declarations = {}

for line_no, line in enumerate(lines, 1):
    m = decl_pattern.match(line)
    if m:
        var_name = m.group(2)
        if var_name not in declarations:
            declarations[var_name] = line_no

print(f"Total top-level let/const declarations: {len(declarations)}")

# Now for each declared variable, find the first line where it is referenced
tdz_warnings = []
for var_name, decl_line in declarations.items():
    ref_pattern = re.compile(rf'\b{re.escape(var_name)}\b')
    for line_no, line in enumerate(lines, 1):
        if line_no < decl_line:
            # Check if referenced before declaration
            # ignore comments
            clean_line = line.split('//')[0]
            if ref_pattern.search(clean_line):
                tdz_warnings.append((var_name, decl_line, line_no, line.strip()))
                break

print(f"\nTotal TDZ hazards found: {len(tdz_warnings)}")
for var_name, decl_line, first_ref, line_content in tdz_warnings:
    print(f"HAZARD: '{var_name}' declared at line {decl_line}, but used earlier at line {first_ref}: {line_content[:70]}")
