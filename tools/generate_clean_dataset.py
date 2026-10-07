import json, csv, collections, os, difflib

# 1. Load and deduplicate Aves
with open('tools/compiled_aves.json', 'r', encoding='utf-8') as f:
    raw_aves = json.load(f)

unique_aves = {}
for a in raw_aves:
    sci = a.get('sciname', '').strip()
    name = a.get('name', '').strip()
    key = sci.lower() if sci else name.lower()
    if key and key not in unique_aves:
        unique_aves[key] = a

aves_list = list(unique_aves.values())
for i, a in enumerate(aves_list, 1):
    a['id'] = f"AVE-{i:03d}"

print(f"Total unique Aves: {len(aves_list)}")

# 2. Extract unique Flora from ARB9LP.csv
csv_trees_counter = collections.Counter()
tree_samples = {}
with open(r'C:\antigravity\ECXEL_ARBOLES\ARB9LP.csv', mode='r', encoding='utf-8-sig', errors='replace') as f:
    reader = csv.DictReader(f)
    for row in reader:
        name = row.get('Nombre_Esp', '').strip()
        if name and len(name) > 2:
            csv_trees_counter[name] += 1
            if name not in tree_samples:
                tree_samples[name] = row

print(f"Total unique raw common names in CSV: {len(csv_trees_counter)}")

# Dictionary of scientific names and ecological roles for Kennedy trees & wetland flora
TREE_KNOWLEDGE = {
    "chicala": ("Tecoma stans", "Bignoniaceae", "Arbolito nativo / Productor de néctar y polinizadores", "Estrato subdosel"),
    "sauco": ("Sambucus nigra", "Adoxaceae", "Árbol subandino / Productor de frutos para aves frugívoras", "Estrato dosel medio"),
    "cajeto": ("Citharexylum subflavescens", "Verbenaceae", "Árbol nativo / Refugio y percha de avifauna", "Estrato dosel"),
    "caucho sabanero": ("Ficus soatensis", "Moraceae", "Árbol nativo clave / Frutos para murciélagos y mirlas", "Estrato dosel alto"),
    "caucho benjamin": ("Ficus benjamina", "Moraceae", "Árbol urbano / Estructura de dosel y sombra", "Estrato dosel alto"),
    "falso pimiento": ("Schinus molle", "Anacardiaceae", "Árbol xerofítico / Frutos para aves y fijación de suelo", "Estrato dosel medio"),
    "jazmin del cabo": ("Pittosporum undulatum", "Pittosporaceae", "Árbol introducido / Follaje denso para nidificación", "Estrato dosel medio"),
    "holly liso": ("Ilex cornuta", "Aquifoliaceae", "Arbusto urbano / Refugio de paseriformes", "Estrato arbustivo"),
    "eugenia": ("Eugenia myrtifolia", "Myrtaceae", "Arbusto / Frutos y néctar para polinizadores", "Estrato subdosel"),
    "cayeno": ("Hibiscus rosa-sinensis", "Malvaceae", "Arbusto floral / Néctar para colibríes", "Estrato arbustivo"),
    "guayacan de manizales": ("Lafoensia acuminata", "Lythraceae", "Árbol nativo andino / Néctar y semillas", "Estrato dosel medio"),
    "palma yuca": ("Yucca gigantea", "Asparagaceae", "Planta arborescente / Refugio de invertebrados", "Estrato subdosel"),
    "jazmin de la china": ("Jasminum mesnyi", "Oleaceae", "Arbusto trepador / Floración y cobertura", "Estrato arbustivo"),
    "acacia japonesa": ("Ligustrum lucidum", "Oleaceae", "Árbol de dosel / Sombra y frutos otoñales", "Estrato dosel"),
    "eucalipto": ("Eucalyptus globulus", "Myrtaceae", "Árbol exótico de gran porte / Percha para rapaces y garzas", "Estrato dosel emergente"),
    "cipres": ("Cupressus lusitanica", "Cupressaceae", "Conífera de dosel / Refugio contra el viento y anidación", "Estrato dosel alto"),
    "urapan": ("Fraxinus chinensis", "Oleaceae", "Árbol de gran dosel urbano / Captura de material particulado", "Estrato dosel alto"),
    "acacia baracatinga": ("Mimosa scabrella", "Fabaceae", "Leguminosa / Fijación de nitrógeno y polinización", "Estrato dosel medio"),
    "acacia negra": ("Acacia decurrens", "Fabaceae", "Leguminosa / Cobertura y néctar", "Estrato dosel medio"),
    "caballero de la noche": ("Cestrum nocturnum", "Solanaceae", "Arbusto / Fragancia nocturna para polillas y murciélagos", "Estrato arbustivo"),
    "hayuelo": ("Dodonaea viscosa", "Sapindaceae", "Arbusto nativo / Control de erosión y semillas", "Estrato arbustivo"),
    "aliso": ("Alnus acuminata", "Betulaceae", "Árbol nativo ripario / Fijación biológica de nitrógeno en ribera", "Estrato dosel medio"),
    "cerezo": ("Prunus serotina", "Rosaceae", "Árbol nativo / Fruto silvestre clave para avifauna", "Estrato dosel medio"),
    "calistemo": ("Callistemon speciosus", "Myrtaceae", "Arbolito ornamental / Flores rojas para colibríes", "Estrato subdosel"),
    "araucaria": ("Araucaria excelsa", "Araucariaceae", "Conífera monumental / Percha alta", "Estrato dosel emergente"),
    "pino libro": ("Platycladus orientalis", "Cupressaceae", "Conífera ornamental / Refugio denso", "Estrato subdosel"),
    "mangle de tierra fria": ("Escallonia paniculata", "Escalloniaceae", "Árbol nativo andino / Protección de microcuencas", "Estrato dosel medio"),
    "corono": ("Xylosma spiculifera", "Salicaceae", "Arbusto espinoso nativo / Nidos seguros para copetones", "Estrato arbustivo"),
    "arrayan blanco": ("Myrcianthes leucoxyla", "Myrtaceae", "Árbol nativo de bosque altoandino / Frutos carnosos", "Estrato dosel"),
    "liquidambar": ("Liquidambar styraciflua", "Altingiaceae", "Árbol caducifolio / Dosel urbano", "Estrato dosel alto"),
    "chilco": ("Baccharis latifolia", "Asteraceae", "Arbusto nativo pionero / Estabilización de riberas", "Estrato arbustivo"),
    "abutilon": ("Abutilon striatum", "Malvaceae", "Arbusto floral nativo / Néctar para colibríes e insectos", "Estrato arbustivo"),
    "cucharo": ("Myrsine coriacea", "Primulaceae", "Árbol nativo pionero / Fruto de alta importancia ecológica", "Estrato dosel medio"),
    "roble": ("Quercus humboldtii", "Fagaceae", "Árbol nativo clímax / Bellotas y hábitat de epífitas", "Estrato dosel alto"),
    "nogal": ("Juglans neotropica", "Juglandaceae", "Árbol emblemático de Bogotá / Madera fina y semillas", "Estrato dosel alto"),
    "sauce lloron": ("Salix humboldtiana", "Salicaceae", "Árbol nativo ripario / Protección de orillas y humedal", "Estrato dosel ripario"),
    "cedro": ("Cedrela montana", "Meliaceae", "Árbol nativo / Refugio de avifauna andina", "Estrato dosel alto"),
    "espino": ("Duranta erecta", "Verbenaceae", "Arbusto nativo / Frutos dorados para aves", "Estrato arbustivo"),
    "palma fenix": ("Phoenix canariensis", "Arecaceae", "Palma monumental / Nidificación de tórtolas", "Estrato dosel alto"),
    "schefflera": ("Schefflera actinophylla", "Araliaceae", "Árbol de follaje umbelado / Néctar", "Estrato dosel medio"),
    "gaque": ("Clusia multiflora", "Clusiaceae", "Árbol nativo / Resina y frutos para fauna", "Estrato dosel medio"),
    "ciro": ("Baccharis bogotensis", "Asteraceae", "Arbusto nativo / Cobertura y néctar", "Estrato arbustivo"),
    "junco": ("Schoenoplectus californicus", "Cyperaceae", "Macrófita emergente / Nidificación de tingua bogotana y cucarachero", "Estrato litoral acuático"),
    "totora": ("Typha latifolia", "Typhaceae", "Macrófita emergente / Estructura de juncal y filtro hídrico", "Estrato litoral acuático"),
    "buchon": ("Eichhornia crassipes", "Pontederiaceae", "Macrófita flotante / Absorción de nutrientes y refugio de alevinos", "Estrato espejo de agua"),
    "lenteja de agua": ("Lemna minor", "Araceae", "Macrófita flotante menor / Alimento de patos y tinguas", "Estrato espejo de agua"),
    "botoncillo": ("Bidens laevis", "Asteraceae", "Hierba palustre / Floración amarilla y polinizadores", "Estrato ribereño"),
    "curuba de monte": ("Passiflora mixta", "Passifloraceae", "Trepador andino / Néctar para colibrí picoespada", "Estrato trepador"),
    "salvia bogotana": ("Salvia bogotensis", "Lamiaceae", "Arbusto aromático nativo / Néctar para polinizadores", "Estrato arbustivo"),
    "amarguero": ("Ageratina tinifolia", "Asteraceae", "Arbusto nativo / Polinización y cobertura", "Estrato arbustivo"),
    "sietecueros": ("Tibouchina lepidota", "Melastomataceae", "Sietecueros / Floración morada y polinización", "Estrato dosel medio"),
    "tuno esmeraldo": ("Miconia squamulosa", "Melastomataceae", "Arbusto nativo / Frutos para tangaras y mirlas", "Estrato arbustivo")
}

# Group and merge by unique scientific name
merged_flora = {}
for common_name, count in csv_trees_counter.most_common(200):
    cn_clean = common_name.strip()
    cn_lower = cn_clean.lower()
    
    sci_name = cn_clean
    family = "Urbano / Humedal"
    role = "Productor primario / Cobertura y estructura ecológica urbana"
    stratum = "Estrato arbóreo"
    
    for k, v in TREE_KNOWLEDGE.items():
        if k in cn_lower:
            sci_name, family, role, stratum = v
            break
            
    sci_key = sci_name.lower().strip()
    if sci_key not in merged_flora:
        merged_flora[sci_key] = {
            "name": cn_clean,
            "sciname": sci_name,
            "family": family,
            "role": role,
            "stratum": stratum,
            "cat": 0,
            "count": count
        }
    else:
        merged_flora[sci_key]["count"] += count
        if cn_clean not in merged_flora[sci_key]["name"]:
            merged_flora[sci_key]["name"] += " / " + cn_clean

# Add wetland macrophytes
macrophytes = [
    ("Junco de estero", "Schoenoplectus californicus", "Cyperaceae", "Macrófita emergente / Hábitat crítico y nidificación de Tingua Bogotana", "Estrato litoral"),
    ("Enea / Totora", "Typha latifolia", "Typhaceae", "Macrófita emergente / Refugio de fauna de juncal y filtro hídrico", "Estrato litoral"),
    ("Buchón de agua", "Eichhornia crassipes", "Pontederiaceae", "Macrófita flotante / Biofiltración y retención de metales pesados", "Estrato espejo de agua"),
    ("Lenteja de agua", "Lemna minor", "Araceae", "Macrófita flotante / Alimento primario de anátidos y peces", "Estrato espejo de agua"),
    ("Botoncillo de humedal", "Bidens laevis", "Asteraceae", "Hierba riparia nativa / Polinización por dípteros e himenópteros", "Estrato ribereño"),
    ("Curuba silvestre", "Passiflora mixta", "Passifloraceae", "Enredadera nativa / Polinización especializada por Ensifera ensifera", "Estrato trepador")
]

for name, sci, fam, role, strat in macrophytes:
    sci_key = sci.lower().strip()
    if sci_key not in merged_flora:
        merged_flora[sci_key] = {
            "name": name,
            "sciname": sci,
            "family": fam,
            "role": role,
            "stratum": strat,
            "cat": 0,
            "count": 500
        }

flora_photos = os.listdir(r'assets\fotos\fotos_flora') if os.path.exists(r'assets\fotos\fotos_flora') else []
flora_nodes = list(merged_flora.values())
for i, f in enumerate(flora_nodes, 1):
    f["id"] = f"FLO-{i:03d}"
    
    # Match photo
    name = f['name']
    sci = f['sciname']
    found = None
    for p in flora_photos:
        p_base = os.path.splitext(p)[0].lower()
        if name.lower() in p_base or p_base in name.lower() or sci.lower() in p_base:
            found = p
            break
    if not found:
        close = difflib.get_close_matches(name.lower(), [os.path.splitext(p)[0].lower() for p in flora_photos], n=1, cutoff=0.55)
        if close:
            for p in flora_photos:
                if os.path.splitext(p)[0].lower() == close[0]:
                    found = p
                    break
    if found:
        f['img'] = f'./assets/fotos/fotos_flora/{found}'
    else:
        f['img'] = f'./assets/fotos/fotos_flora/{name}.jpg'

print(f"Total strictly unique Flora species: {len(flora_nodes)}")

with open('tools/clean_dataset_aves_flora.json', 'w', encoding='utf-8') as f:
    json.dump({"aves": aves_list, "flora": flora_nodes}, f, ensure_ascii=False, indent=2)

print("Saved clean dataset with matched flora photos.")
