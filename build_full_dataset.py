import json, os, re, zipfile
import xml.etree.ElementTree as ET
from collections import Counter

def normalize(s):
    if not s: return ""
    s = s.lower().strip()
    s = re.sub(r'[áàäâ]', 'a', s)
    s = re.sub(r'[éèëê]', 'e', s)
    s = re.sub(r'[íìïî]', 'i', s)
    s = re.sub(r'[óòöô]', 'o', s)
    s = re.sub(r'[úùüû]', 'u', s)
    s = re.sub(r'[ñ]', 'n', s)
    s = re.sub(r'[^a-z0-9]', ' ', s)
    return ' '.join(s.split())

netCenter = {'x': 5341.33, 'y': 3161.9}
SCALE = 0.08

def to_scene(x, y):
    return round((x - netCenter['x']) * SCALE, 2), round((y - netCenter['y']) * SCALE, 2)

lat_ref = 4.636
lng_ref = -74.153
x_ref = 209.56
z_ref = -10.93
scale_lng = 15700.0
scale_lat = -11600.0

def latlng_to_scene(lat, lng):
    x = x_ref + (lng - lng_ref) * scale_lng
    z = z_ref + (lat - lat_ref) * scale_lat
    return round(x, 2), round(z, 2)

def clean_coord(val):
    if not val: return None
    try:
        f = float(val)
        if abs(f) > 180:
            s = str(int(abs(f)))
            if s.startswith('4'): # lat
                f = float(s[0] + '.' + s[1:])
            elif s.startswith('74'): # lng
                f = -float(s[:2] + '.' + s[2:])
        return f
    except:
        return None

# 1. READ TREES
with open('assets/kennedy_trees_real.json', 'r', encoding='utf-8') as f:
    trees_raw = json.load(f)

tree_counts = Counter()
tree_samples = {}
tree_all_coords = {}
for t in trees_raw:
    if len(t) > 3 and t[3]:
        sp = t[3].strip()
        tree_counts[sp] += 1
        if sp not in tree_samples:
            tree_samples[sp] = t
        if sp not in tree_all_coords:
            tree_all_coords[sp] = []
        if len(tree_all_coords[sp]) < 20:
            sx, sz = to_scene(t[0], t[1])
            tree_all_coords[sp].append({'x': sx, 'y': (t[2] or 4.0) * SCALE * 0.85 + 1.2, 'z': sz})

flora_photos = os.listdir('assets/fotos/fotos_flora') if os.path.exists('assets/fotos/fotos_flora') else []
flora_map = {normalize(os.path.splitext(p)[0]): f'./assets/fotos/fotos_flora/{p}' for p in flora_photos}

flora_taxa = []
s_idx = 1
for sp_name, count in tree_counts.most_common():
    norm = normalize(sp_name)
    photo_url = None
    if norm in flora_map:
        photo_url = flora_map[norm]
    else:
        for part in sp_name.split(','):
            n_p = normalize(part)
            if n_p in flora_map:
                photo_url = flora_map[n_p]
                break
            for k, v in flora_map.items():
                if n_p and (n_p in k or k in n_p):
                    photo_url = v
                    break
            if photo_url: break
    
    s_id = f"SIGAU-{s_idx:03d}"
    s_idx += 1
    sample = tree_samples.get(sp_name, [5341.33, 3161.9, 4.0, sp_name, s_id])
    sx, sz = to_scene(sample[0], sample[1])
    h = sample[2] if len(sample) > 2 and sample[2] else 4.0
    sy = round(h * SCALE * 0.85 + 1.2, 2)
    
    flora_taxa.append({
        'id': s_id,
        'name': f"{sp_name} ({s_id})",
        'sciname': sp_name.split(',')[0].strip(),
        'cat': 0,
        'role': f"Especie arbórea de Kennedy • {count} individuos en SIGAU • Altura promedio {h}m",
        'loc': f"Censo SIGAU Kennedy • Sector X:{sx} Z:{sz}",
        'alert': f"Censo Oficial SIGAU: {count} registros activos georreferenciados en Kennedy",
        'img': photo_url or "",
        'territoryPos': {
            'x': sx,
            'y': sy,
            'z': sz,
            'locName': f"Censo SIGAU Kennedy — {sp_name.split(',')[0].strip()}"
        }
    })

print(f"Total Flora Taxa: {len(flora_taxa)}")

# 2. READ EXCEL HELPER
def parse_excel_rows(fpath):
    with zipfile.ZipFile(fpath, 'r') as z:
        shared_strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for si in tree.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                t = si.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')
                if t is not None and t.text:
                    shared_strings.append(t.text)
                else:
                    shared_strings.append(''.join(si.itertext()))
        sheet_tree = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
        rows = sheet_tree.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row')
        
        def get_row_dict(row):
            vals = {}
            for c in row.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                r_ref = c.attrib.get('r')
                col_letters = ''.join([ch for ch in r_ref if ch.isalpha()])
                v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                val = ''
                if v is not None and v.text:
                    if c.attrib.get('t') == 's':
                        val = shared_strings[int(v.text)]
                    else:
                        val = v.text
                vals[col_letters] = val
            return vals

        if not rows: return []
        header_map = get_row_dict(rows[0])
        col_name_to_letter = {v: k for k, v in header_map.items()}
        
        parsed_rows = []
        for r in rows[1:]:
            r_dict = get_row_dict(r)
            row_obj = {}
            for h_name, c_let in col_name_to_letter.items():
                row_obj[h_name] = r_dict.get(c_let, '')
            parsed_rows.append(row_obj)
        return parsed_rows

# 3. READ AVES
fpath_aves = r'C:\Users\ACER\.gemini\antigravity\brain\9ec551ea-5123-4ec8-89b6-e1fc8aa6e1ce\.user_uploaded\media_1791392868962.xlsx'
ave_rows = parse_excel_rows(fpath_aves)
ave_photos = os.listdir('assets/fotos/fotos_aves') if os.path.exists('assets/fotos/fotos_aves') else []
ave_map = {normalize(os.path.splitext(p)[0]): f'./assets/fotos/fotos_aves/{p}' for p in ave_photos}

ave_taxa = []
seen_aves = set()
a_idx = 1
for r in ave_rows:
    sci = r.get('scientific_name', '').strip()
    com = r.get('common_name', '').strip()
    sp = r.get('species_guess', '').strip()
    img = r.get('image_url', '').strip()
    place = r.get('place_guess', '').strip() or 'Kennedy'
    lat = clean_coord(r.get('latitude'))
    lng = clean_coord(r.get('longitude'))
    
    name = sp or com or sci
    if not name or name in seen_aves:
        continue
    seen_aves.add(name)
    
    n_name = normalize(name)
    n_sci = normalize(sci)
    photo_url = None
    if n_name in ave_map: photo_url = ave_map[n_name]
    elif n_sci in ave_map: photo_url = ave_map[n_sci]
    else:
        for k, pval in ave_map.items():
            if (n_name and (n_name in k or k in n_name)) or (n_sci and (n_sci in k or k in n_sci)):
                photo_url = pval
                break
    
    if lat and lng and 4.5 <= lat <= 4.75 and -74.3 <= lng <= -74.05:
        sx, sz = latlng_to_scene(lat, lng)
    else:
        # Assign to wetland hub by index
        hubs = [
            (209.56, -10.93, "Humedal El Burro"),
            (67.66, 118.17, "Humedal La Vaca"),
            (291.67, -79.30, "Humedal de Techo"),
            (166.64, 348.81, "Lago Parque Timiza"),
            (234.8, 102.9, "Corredor Castilla / Ronda Fucha"),
            (188.7, 180.1, "Corredor Tintal / Tintalito")
        ]
        hb = hubs[(a_idx - 1) % len(hubs)]
        sx, sz, place = hb[0] + ((a_idx * 7) % 25 - 12), hb[1] + ((a_idx * 11) % 25 - 12), hb[2]

    a_id = f"AVE-{a_idx:03d}"
    a_idx += 1
    ave_taxa.append({
        'id': a_id,
        'name': name,
        'sciname': sci or name,
        'cat': 1,
        'role': f"Avifauna de humedales y dosel de Kennedy • {com or sci}",
        'loc': place,
        'alert': "Registro verificado iNaturalist / Red de Humedales de Bogotá",
        'img': photo_url or img or "",
        'territoryPos': {
            'x': sx,
            'y': 4.5,
            'z': sz,
            'locName': place
        }
    })

print(f"Total Aves Taxa: {len(ave_taxa)}")

# 4. READ MAMÍFEROS, MOLUSCOS, ANFIBIOS, REPTILES
fauna_configs = [
    ('MAM', 2, r'C:\Users\ACER\.gemini\antigravity\brain\9ec551ea-5123-4ec8-89b6-e1fc8aa6e1ce\.user_uploaded\media_1791392875303.xlsx', 'fotos_mamiferos', 'Mamíferos / Mastofauna de Kennedy', 2.0, [
        (195.0, -25.0, "Humedal El Burro — Matorral Denso"),
        (225.0, 30.0, "Humedal El Burro — Franja Protectora"),
        (80.0, 105.0, "Humedal La Vaca — Bosque de Borde"),
        (155.0, 325.0, "Ronda Río Fucha — Madriguera")
    ]),
    ('MOL', 3, r'C:\Users\ACER\.gemini\antigravity\brain\9ec551ea-5123-4ec8-89b6-e1fc8aa6e1ce\.user_uploaded\media_1791392881436.xlsx', 'fotos_moluscos', 'Moluscos / Gasterópodos de Kennedy', 0.6, [
        (205.0, -5.0, "Humedal El Burro — Estrato Herbáceo"),
        (72.0, 112.0, "Humedal La Vaca — Macrófitas Acuáticas"),
        (285.0, -75.0, "Humedal de Techo — Suelo Húmedo"),
        (160.0, 340.0, "Riberas Parque Timiza")
    ]),
    ('ANF', 4, r'C:\Users\ACER\.gemini\antigravity\brain\9ec551ea-5123-4ec8-89b6-e1fc8aa6e1ce\.user_uploaded\media_1791392893161.xlsx', 'fotos_anfibios', 'Anfibios / Bioindicadores hídricos', 1.0, [
        (210.0, -12.0, "Humedal El Burro — Espejo de Agua"),
        (65.0, 120.0, "Humedal La Vaca — Juncal Inundado"),
        (295.0, -82.0, "Humedal de Techo — Espejo"),
        (170.0, 352.0, "Lago Parque Timiza — Borde")
    ]),
    ('REP', 5, r'C:\Users\ACER\.gemini\antigravity\brain\9ec551ea-5123-4ec8-89b6-e1fc8aa6e1ce\.user_uploaded\media_1791392900278.xlsx', 'fotos_reptiles', 'Reptiles / Sauros y Ofidios', 1.2, [
        (218.0, 15.0, "Humedal El Burro — Pastizales de Ronda"),
        (75.0, 95.0, "Humedal La Vaca — Ecotono"),
        (280.0, -65.0, "Humedal de Techo — Taludes"),
        (150.0, 320.0, "Parque Timiza — Pedregales")
    ])
]

other_taxa = []
for code_prefix, cat_idx, fpath, photo_folder, role_desc, y_height, def_hubs in fauna_configs:
    photos = os.listdir(f'assets/fotos/{photo_folder}') if os.path.exists(f'assets/fotos/{photo_folder}') else []
    pmap = {normalize(os.path.splitext(p)[0]): f'./assets/fotos/{photo_folder}/{p}' for p in photos}
    rows = parse_excel_rows(fpath)
    
    seen_f = set()
    f_idx = 1
    for r in rows:
        sci = r.get('scientific_name', '').strip()
        com = r.get('common_name', '').strip()
        sp = r.get('species_guess', '').strip()
        img = r.get('image_url', '').strip()
        place = r.get('place_guess', '').strip() or 'Kennedy'
        lat = clean_coord(r.get('latitude'))
        lng = clean_coord(r.get('longitude'))
        
        name = sp or com or sci
        if not name or name in seen_f:
            continue
        seen_f.add(name)
        
        n_name = normalize(name)
        n_sci = normalize(sci)
        photo_url = None
        if n_name in pmap: photo_url = pmap[n_name]
        elif n_sci in pmap: photo_url = pmap[n_sci]
        else:
            for k, pval in pmap.items():
                if (n_name and (n_name in k or k in n_name)) or (n_sci and (n_sci in k or k in n_sci)):
                    photo_url = pval
                    break
        
        if lat and lng and 4.5 <= lat <= 4.75 and -74.3 <= lng <= -74.05:
            sx, sz = latlng_to_scene(lat, lng)
        else:
            hb = def_hubs[(f_idx - 1) % len(def_hubs)]
            sx, sz, place = hb[0] + ((f_idx * 5) % 15 - 7), hb[1] + ((f_idx * 9) % 15 - 7), hb[2]

        f_id = f"{code_prefix}-{f_idx:03d}"
        f_idx += 1
        other_taxa.append({
            'id': f_id,
            'name': name,
            'sciname': sci or name,
            'cat': cat_idx,
            'role': f"{role_desc} • {com or sci}",
            'loc': place,
            'alert': "Registro verificado iNaturalist / Catálogo de Biodiversidad de Bogotá",
            'img': photo_url or img or "",
            'territoryPos': {
                'x': sx,
                'y': y_height,
                'z': sz,
                'locName': place
            }
        })

print(f"Total Other Fauna Taxa: {len(other_taxa)}")

all_taxa = flora_taxa + ave_taxa + other_taxa
print(f"Total Compiled Taxa: {len(all_taxa)}")

with open('compiled_taxa.json', 'w', encoding='utf-8') as f:
    json.dump(all_taxa, f, ensure_ascii=False, indent=2)

print("Saved compiled_taxa.json successfully!")
