import json, re, os

# Load clean dataset
with open('tools/clean_dataset_aves_flora.json', 'r', encoding='utf-8') as f:
    clean_data = json.load(f)

aves = clean_data['aves']
flora = clean_data['flora']

# Other groups
mamiferos = [
    ["MAM-01", "Chucha de agua / Zarigüeya", "Didelphis marsupialis", "Consumidor secundario / Marsupial omnívoro", "Estrato arbustivo y suelo", "./assets/fotos/fotos_mamiferos/Ardilla de cola roja.jpeg"],
    ["MAM-02", "Comadreja andina", "Neogale felipei / Mustela", "Depredador carnívoro / Control de roedores", "Estrato terrestre ripario", "./assets/fotos/fotos_mamiferos/Turdus fuscater gigas.jpeg"],
    ["MAM-03", "Curí sabanero", "Cavia anolaimae", "Herbívoro de juncal y pastizal", "Estrato herbáceo ripario", "./assets/fotos/fotos_mamiferos/Turdus fuscater gigas.jpeg"],
    ["MAM-04", "Murciélago frugívoro", "Artibeus bogotensis", "Dispersor de semillas nocturno", "Estrato dosel aéreo", "./assets/fotos/fotos_mamiferos/Turdus fuscater gigas.jpeg"],
    ["MAM-05", "Murciélago insectívoro", "Tadarida brasiliensis", "Controlador biológico de insectos plaga", "Estrato aéreo superior", "./assets/fotos/fotos_mamiferos/Turdus fuscater gigas.jpeg"],
    ["MAM-06", "Ratón campestre", "Thomasomys laniger", "Consumidor primario / Dispersor de semillas", "Estrato suelo", "./assets/fotos/fotos_mamiferos/Turdus fuscater gigas.jpeg"],
    ["MAM-07", "Ratón arrocero", "Oligoryzomys fulvescens", "Granívoro e insectívoro de juncales", "Estrato litoral", "./assets/fotos/fotos_mamiferos/Turdus fuscater gigas.jpeg"],
    ["MAM-08", "Zarigüeya común", "Didelphis pernigra", "Omnívoro oportunista / Dispersor de semillas", "Estrato arbóreo y suelo", "./assets/fotos/fotos_mamiferos/Ardilla de cola roja.jpeg"],
    ["MAM-09", "Ardilla de cola roja", "Sciurus granatensis", "Frugívoro y granívoro de dosel", "Estrato dosel arbóreo", "./assets/fotos/fotos_mamiferos/Ardilla de cola roja.jpeg"],
    ["MAM-10", "Nutria neotropical (Histórica)", "Lontra longicaudis", "Depredador tope acuático / Bioindicador", "Estrato acuático lótico", "./assets/fotos/fotos_mamiferos/Turdus fuscater gigas.jpeg"]
]

moluscos = [
    ["MOL-01", "Caracol de agua dulce", "Physella venustula", "Detritívoro acuático / Bioindicador", "Estrato bentónico", "./assets/fotos/fotos_moluscos/Caracoles, babosas y parientes.jpg"],
    ["MOL-02", "Caracol trompeta", "Planorbella trivolvis", "Filtrador bentónico / Ciclaje de nutrientes", "Estrato bentónico", "./assets/fotos/fotos_moluscos/Planorbinae.jpg"],
    ["MOL-03", "Caracol de jardín común", "Cornu aspersum", "Herbívoro y descomponedor de hojarasca", "Estrato suelo", "./assets/fotos/fotos_moluscos/Caracol europeo de jardín.jpg"],
    ["MOL-04", "Babosa gris de jardín", "Deroceras reticulatum", "Descomponedor de materia vegetal", "Estrato suelo húmedo", "./assets/fotos/fotos_moluscos/Babosa gris de jardín.jpg"],
    ["MOL-05", "Babosa tigre", "Limax maximus", "Detritívoro y depredador de babosas menores", "Estrato hojarasca", "./assets/fotos/fotos_moluscos/Babosa europea tigre.jpg"],
    ["MOL-06", "Babosa de tres bandas", "Ambigolimax valentianus", "Detritívoro de riberas sombrías", "Estrato ribereño", "./assets/fotos/fotos_moluscos/Babosas de tres bandas.jpg"],
    ["MOL-07", "Caracol transparente", "Oxychilus alliarius", "Detritívoro y carnívoro de microfauna", "Estrato suelo húmedo", "./assets/fotos/fotos_moluscos/Oxychilus.jpeg"],
    ["MOL-08", "Babosa amarilla europea", "Limacus flavus", "Descomponedor de materia orgánica", "Estrato suelo húmedo", "./assets/fotos/fotos_moluscos/Babosa europea amarilla.jpg"],
    ["MOL-09", "Babosa de invernadero", "Lehmannia valentiana", "Herbívoro de sotobosque y viveros", "Estrato arbustivo bajo", "./assets/fotos/fotos_moluscos/Babosa europea de invernadero.jpg"],
    ["MOL-10", "Almeja pisidio", "Pisidium sp.", "Filtrador de sedimentos finos", "Estrato bentónico profundo", "./assets/fotos/fotos_moluscos/Gasterópodos eutineuros.jpeg"]
]

anfibios = [
    ["ANF-01", "Rana sabanera", "Dendropsophus molitor", "Consumidor secundario / Insectívoro acuático", "Estrato litoral y macrófitas", "./assets/fotos/fotos_anfibios/Rana sabanera.jpg"],
    ["ANF-02", "Rana de cristal andina", "Ikakogi / Espadarana", "Bioindicador de calidad hídrica", "Estrato ribereño arbustivo", "./assets/fotos/fotos_anfibios/Pristimantis elegans.jpeg"],
    ["ANF-03", "Salamandra de Bogotá", "Bolitoglossa adspersa", "Microdepredador de hojarasca", "Estrato suelo y musgos", "./assets/fotos/fotos_anfibios/Bolitoglossa adspersa.jpg"],
    ["ANF-04", "Ranita de lluvia", "Pristimantis elegans", "Insectívoro de sotobosque húmedo", "Estrato herbáceo", "./assets/fotos/fotos_anfibios/Pristimantis elegans.jpeg"],
    ["ANF-05", "Rana crema de pantano", "Dendropsophus labialis", "Insectívoro de juncales y totorales", "Estrato litoral", "./assets/fotos/fotos_anfibios/Ranas y sapos.jpeg"],
    ["ANF-06", "Sapo común sabanero", "Rhinella marina / Rhinella marina", "Depredador de invertebrados terrestres", "Estrato suelo", "./assets/fotos/fotos_anfibios/Sapo gigante.jpeg"]
]

reptiles = [
    ["REP-01", "Serpiente sabanera / Culebra tierrera", "Atractus crassicaudatus", "Depredador de lombrices e insectos / Control biológico", "Estrato subterráneo y hojarasca", "./assets/fotos/fotos_reptiles/Serpiente sabanera.jpg"],
    ["REP-02", "Lagartija collareja sabanera", "Stenocercus trachycephalus", "Insectívoro heliófilo / Estructuras y taludes", "Estrato rocoso y troncos", "./assets/fotos/fotos_reptiles/Lagarto Collarejo.jpg"],
    ["REP-03", "Lagartija bombillo estriada", "Anolis heterodermus", "Insectívoro arborícola de camuflaje", "Estrato subdosel y ramas", "./assets/fotos/fotos_reptiles/Lagartija bombillo estriada.jpeg"],
    ["REP-04", "Iguana verde (Introducida)", "Iguana iguana", "Herbívoro y frugívoro de dosel", "Estrato dosel arbóreo", "./assets/fotos/fotos_reptiles/Iguana verde.jpg"],
    ["REP-05", "Jicotea / Tortuga de río (Introducida)", "Trachemys venusta", "Omnívoro acuático / Solario en troncos flotantes", "Estrato espejo de agua", "./assets/fotos/fotos_reptiles/Jicotea Sudamericana.jpg"],
    ["REP-06", "Hicotea sabanera", "Trachemys callirostris", "Omnívoro acuático / Solario en ribera", "Estrato litoral", "./assets/fotos/fotos_reptiles/Hicotea.jpeg"],
    ["REP-07", "Geco casero asiático", "Hemidactylus frenatus", "Insectívoro nocturno de infraestructura", "Estrato edificado", "./assets/fotos/fotos_reptiles/Besucona asiática.jpg"],
    ["REP-08", "Culebra ciega sabanera", "Epictia goudotii", "Fosorial / Depredador de hormigas y termitas", "Estrato suelo", "./assets/fotos/fotos_reptiles/Culebras y parientes.jpeg"]
]

print("Assembling master JavaScript dataset...")

# Build JavaScript code for buildFullDataset
js_lines = []
js_lines.append("function buildFullDataset() {")
js_lines.append("  const nodes = [];")
js_lines.append("")
js_lines.append("  // 1. FLORA URBANA Y DE HUMEDAL (Censo JBB / SIGAU)")
js_lines.append("  const floraBase = [")
for f in flora:
    # [id, name, sci, role, stratum, count]
    esc_name = f['name'].replace('"', '\\"')
    esc_sci = f['sciname'].replace('"', '\\"')
    esc_role = f['role'].replace('"', '\\"')
    esc_strat = f['stratum'].replace('"', '\\"')
    js_lines.append(f'    ["{f["id"]}", "{esc_name}", "{esc_sci}", "{esc_role}", "{esc_strat}", {f["count"]}],')
js_lines.append("  ];")
js_lines.append("  floraBase.forEach((item, idx) => {")
js_lines.append("    nodes.push({")
js_lines.append("      id: item[0],")
js_lines.append("      name: item[1],")
js_lines.append("      sci: item[2],")
js_lines.append("      cat: 0,")
js_lines.append("      role: item[3],")
js_lines.append("      stratum: item[4],")
js_lines.append("      count: item[5],")
js_lines.append("      loc: 'Localidad 09 Kennedy — Censo Forestal SIGAU / JBB',")
js_lines.append("      alert: item[1].includes('Junco') ? 'Especie clave de hábitat para Tingua Bogotana' : 'Monitoreo Arbolado Urbano Kennedy',")
js_lines.append("      img: './assets/fotos/fotos_aves/' + item[1] + '.jpeg',")
js_lines.append("      inatUrl: 'https://colombia.inaturalist.org/search?q=' + encodeURIComponent(item[2])")
js_lines.append("    });")
js_lines.append("  });")
js_lines.append("")

js_lines.append("  // 2. AVES DE KENNEDY (236 especies del inventario)")
js_lines.append("  const avesBase = [")
for a in aves:
    esc_name = a['name'].replace('"', '\\"')
    esc_sci = a['sciname'].replace('"', '\\"')
    esc_role = a['role'].replace('"', '\\"')
    esc_loc = a['loc'].replace('"', '\\"')
    esc_alert = a['alert'].replace('"', '\\"')
    esc_img = a['img'].replace('"', '\\"')
    js_lines.append(f'    ["{a["id"]}", "{esc_name}", "{esc_sci}", "{esc_role}", "{esc_loc}", "{esc_alert}", "{esc_img}"],')
js_lines.append("  ];")
js_lines.append("  avesBase.forEach(item => {")
js_lines.append("    nodes.push({")
js_lines.append("      id: item[0],")
js_lines.append("      name: item[1],")
js_lines.append("      sci: item[2],")
js_lines.append("      cat: 1,")
js_lines.append("      role: item[3],")
js_lines.append("      loc: item[4],")
js_lines.append("      alert: item[5],")
js_lines.append("      img: item[6],")
js_lines.append("      inatUrl: 'https://colombia.inaturalist.org/search?q=' + encodeURIComponent(item[2])")
js_lines.append("    });")
js_lines.append("  });")
js_lines.append("")

def add_other_group(name, cat_id, dataset, group_alert, loc_desc):
    js_lines.append(f"  // {name}")
    js_lines.append(f"  const {name.lower()}Base = [")
    for row in dataset:
        esc_id = row[0]
        esc_name = row[1].replace('"', '\\"')
        esc_sci = row[2].replace('"', '\\"')
        esc_role = row[3].replace('"', '\\"')
        esc_strat = row[4].replace('"', '\\"')
        esc_img = row[5].replace('"', '\\"')
        js_lines.append(f'    ["{esc_id}", "{esc_name}", "{esc_sci}", "{esc_role}", "{esc_strat}", "{esc_img}"],')
    js_lines.append("  ];")
    js_lines.append(f"  {name.lower()}Base.forEach(item => {{")
    js_lines.append("    nodes.push({")
    js_lines.append("      id: item[0],")
    js_lines.append("      name: item[1],")
    js_lines.append("      sci: item[2],")
    js_lines.append(f"      cat: {cat_id},")
    js_lines.append("      role: item[3],")
    js_lines.append("      stratum: item[4],")
    js_lines.append(f"      loc: '{loc_desc}',")
    js_lines.append(f"      alert: '{group_alert}',")
    js_lines.append("      img: item[5],")
    js_lines.append("      inatUrl: 'https://colombia.inaturalist.org/search?q=' + encodeURIComponent(item[2])")
    js_lines.append("    });")
    js_lines.append("  });")
    js_lines.append("")

add_other_group("Mamiferos", 2, mamiferos, "Monitoreo Mastozoológico Kennedy", "Humedales El Burro, La Vaca, Meandro del Say y Corredores Verdes")
add_other_group("Moluscos", 3, moluscos, "Monitoreo Malacológico y Bentónico", "Espejos de agua, juncales y riberas de Kennedy")
add_other_group("Anfibios", 4, anfibios, "Monitoreo Herpetológico y Bioindicadores de Calidad Hídrica", "Espejo Central y Zonas Litorales de Humedales")
add_other_group("Reptiles", 5, reptiles, "Monitoreo Herpetológico Sabana de Bogotá", "Zonas de Ronda, Taludes Secos y Coberturas Arbóreas")

js_lines.append("  return nodes;")
js_lines.append("}")

js_dataset_code = "\n".join(js_lines)

# Write the complete JS file generator
print("Writing build_master_engine.py with robust 3D territory loader and spatial tree hover...")
