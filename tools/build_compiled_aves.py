import os, glob, zipfile, json
import xml.etree.ElementTree as ET

def parse_excel(path):
    with zipfile.ZipFile(path, 'r') as z:
        shared = []
        if 'xl/sharedStrings.xml' in z.namelist():
            tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for si in tree.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                shared.append(''.join([t.text for t in si.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') if t.text]))
        
        stree = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
        rows = []
        for row in stree.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
            r_vals = []
            for c in row.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                t = c.attrib.get('t')
                val = v.text if v is not None else ''
                if t == 's' and val.isdigit() and int(val) < len(shared):
                    val = shared[int(val)]
                r_vals.append(val)
            if any(r_vals):
                rows.append(r_vals)
        return rows

# Map local photos for fast local lookup
local_photos = {}
for root, dirs, files in os.walk('./assets/fotos'):
    for f in files:
        base_name = os.path.splitext(f)[0].lower()
        full_rel = os.path.join(root, f).replace('\\', '/')
        local_photos[base_name] = full_rel

print(f"Loaded {len(local_photos)} local photo filenames for matching.")

def find_best_photo(name, sciname, default_url=''):
    name_clean = name.lower()
    sci_clean = sciname.lower()
    
    # Check exact name or sciname in local photos
    if name_clean in local_photos:
        return local_photos[name_clean]
    if sci_clean in local_photos:
        return local_photos[sci_clean]
        
    # Check partial match
    for k, path in local_photos.items():
        if len(k) > 3 and (k in name_clean or k in sci_clean or name_clean in k):
            return path
            
    return default_url

# 1. Parse Aves (248 rows)
aves_rows = parse_excel(r'C:\Users\ACER\.gemini\antigravity\brain\9ec551ea-5123-4ec8-89b6-e1fc8aa6e1ce\.user_uploaded\media_1791392868962.xlsx')
aves_taxa = []
for idx, r in enumerate(aves_rows[1:], 1):
    c_name = r[37].strip() if len(r) > 37 and r[37] else ''
    s_guess = r[35].strip() if len(r) > 35 and r[35] else ''
    s_name = r[36].strip() if len(r) > 36 and r[36] else ''
    img = r[14].strip() if len(r) > 14 and r[14] else ''
    place = r[22].strip() if len(r) > 22 and r[22] else 'Humedales & Dosel Urbano de Kennedy'
    
    display_name = s_guess or c_name or s_name or f"Ave {idx}"
    sci_display = s_name or s_guess or "Aves"
    
    # Fix characters
    display_name = display_name.replace('\x81', 'Á').replace('\xad', 'í').replace('\xa9', 'é').replace('\xb3', 'ó').replace('\xba', 'ú').replace('\xb1', 'ñ')
    sci_display = sci_display.replace('\x81', 'Á').replace('\xad', 'í').replace('\xa9', 'é').replace('\xb3', 'ó').replace('\xba', 'ú').replace('\xb1', 'ñ')
    
    final_img = find_best_photo(display_name, sci_display, img)
    
    # Ecological niche inference
    dl = display_name.lower() + ' ' + sci_display.lower()
    if any(w in dl for w in ['colibr', 'brillante', 'calzadito', 'cometa', 'chillón', 'metalura']):
        role = "Polinizador nectarívoro / Forrajeo de flores tubulares"
    elif any(w in dl for w in ['tingua', 'pato', 'garza', 'garceta', 'focha', 'gallineta', 'rascón', 'monjita', 'burrito', 'carrao', 'chorlito', 'becasina']):
        role = "Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas"
    elif any(w in dl for w in ['gavilán', 'búho', 'lechuza', 'águila', 'cernícalo', 'halcón', 'caracara']):
        role = "Depredador tope / Control biológico de roedores y reptiles"
    elif any(w in dl for w in ['mirla', 'tángara', 'tangara', 'calandria', 'semillero', 'jilguero', 'pinzón', 'perico', 'cotorra']):
        role = "Frugívoro & Granívoro / Dispersión zoócora de semillas"
    else:
        role = "Consumidor secundario / Insectívoro de follaje y dosel"
        
    aves_taxa.append({
        'id': f"AVE-{idx:03d}",
        'name': display_name,
        'sciname': sci_display,
        'cat': 1,
        'role': role,
        'loc': place if len(place) > 3 and not place.isdigit() else "Humedales El Burro, La Vaca y Techo / Kennedy",
        'alert': "Monitoreo Biodiversidad Kennedy / Red iNaturalist",
        'img': final_img
    })

print(f"Generated {len(aves_taxa)} bird taxa records.")

# Save compiled taxa
with open('tools/compiled_aves.json', 'w', encoding='utf-8') as out:
    json.dump(aves_taxa, out, indent=2, ensure_ascii=False)
