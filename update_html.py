import json, os, re

# Load compiled taxa
with open('compiled_taxa.json', 'r', encoding='utf-8') as f:
    compiled_taxa = json.load(f)

print(f"Loaded {len(compiled_taxa)} taxa for dataset generation.")

# Let's inspect the entire modulo-11-garden.html
with open('modulo-11-garden.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Verify where buildFull180Dataset is and replace it with the complete 568-species dataset
json_taxa_str = json.dumps(compiled_taxa, ensure_ascii=False)

# Let's build the new complete modulo-11-garden.html
print("Building updated HTML with complete 568 taxa...")
