import json

with open('compiled_taxa.json', 'r', encoding='utf-8') as f:
    taxa_data = json.load(f)

taxa_json_str = json.dumps(taxa_data, ensure_ascii=False)

with open('template_garden.html', 'r', encoding='utf-8') as f:
    template = f.read()

final_html = template.replace('__TAXA_DATA_JSON__', taxa_json_str)

with open('modulo-11-garden.html', 'w', encoding='utf-8') as f:
    f.write(final_html)

# Also sync to index.html
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(final_html)

print("Generated modulo-11-garden.html and index.html successfully!")
