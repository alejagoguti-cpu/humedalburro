import json
from collections import Counter

with open('compiled_taxa.json', 'r', encoding='utf-8') as f:
    rawTaxa = json.load(f)

print(f"Loaded {len(rawTaxa)} taxa.")

INTER_TYPES = {
    'PREDATION':    {'id': 0, 'name': 'Depredación', 'color': '#C96349'},
    'HERBIVORY':    {'id': 1, 'name': 'Herbivoría', 'color': '#84A48B'},
    'DISPERSAL':    {'id': 2, 'name': 'Dispersión de Semillas', 'color': '#E69888'},
    'MUTUALISM':    {'id': 3, 'name': 'Mutualismo', 'color': '#E7C878'},
    'NESTING':      {'id': 4, 'name': 'Nidificación & Refugio', 'color': '#F79E70'},
    'POLLINATION':  {'id': 5, 'name': 'Visita Floral / Polinización', 'color': '#A386A9'},
    'NEST_SITE':    {'id': 6, 'name': 'Anidamiento de Dosel', 'color': '#D1A996'},
    'PARASITISM':   {'id': 7, 'name': 'Parasitismo de Nido', 'color': '#C6B3CA'},
    'ALLELOPATHY':  {'id': 8, 'name': 'Competencia / Biofiltro', 'color': '#6B9080'}
}

rawNodes = []
for idx, t in enumerate(rawTaxa):
    rawNodes.append({
        'id': idx,
        'taxaId': t['id'],
        'label': t['name'],
        'sciname': t['sciname'],
        'cat': t['cat'],
        'role': t['role'],
        'neighbors': [],
        'active': True
    })

rawEdges = []
edgeDetailsMap = {}

def add_edge(na, nb, inter, rationale):
    if not na or not nb or na['id'] == nb['id']: return
    key = f"{na['id']}_{nb['id']}" if na['id'] < nb['id'] else f"{nb['id']}_{na['id']}"
    if key in edgeDetailsMap: return
    rawEdges.append({'source': na['id'], 'target': nb['id']})
    edgeDetailsMap[key] = {'source': na['id'], 'target': nb['id'], 'type': inter, 'rationale': rationale}
    if nb not in na['neighbors']: na['neighbors'].append(nb)
    if na not in nb['neighbors']: nb['neighbors'].append(na)

floraNodes = [n for n in rawNodes if n['cat'] == 0]
aveNodes   = [n for n in rawNodes if n['cat'] == 1]
mamNodes   = [n for n in rawNodes if n['cat'] == 2]
molNodes   = [n for n in rawNodes if n['cat'] == 3]
anfNodes   = [n for n in rawNodes if n['cat'] == 4]
repNodes   = [n for n in rawNodes if n['cat'] == 5]

def matches(n, keywords):
    text = (n['label'] + " " + n['sciname']).lower()
    return any(k.lower() in text for k in keywords)

# Sub-grupos funcionales de Flora (JBB & Sabana de Bogotá)
pollination_flora = [n for n in floraNodes if matches(n, ['sauco', 'sambucus', 'chilco', 'baccharis', 'raque', 'vallea', 'farolito', 'abutilon', 'chicala', 'tecoma', 'tibar', 'escallonia', 'fucsia', 'fuchsia', 'siete cueros', 'tibouchina', 'salvia', 'drago', 'croton', 'arboloco', 'smallanthus', 'mortiño', 'hesperomeles', 'cayeno', 'abelia', 'corono', 'hayuelo', 'verben', 'lantana', 'borracho', 'brugmansia'])]
berry_flora = [n for n in floraNodes if matches(n, ['sauco', 'sambucus', 'capuli', 'capulí', 'cerezo', 'prunus', 'caucho', 'ficus', 'eugenia', 'arrayan', 'arrayán', 'myrcianthes', 'pimiento', 'schinus', 'espino', 'duranta', 'palma', 'yucca', 'guayacan', 'guayacán', 'passiflora', 'curuba', 'jazmin', 'jazmín', 'laurel', 'durazno', 'mora', 'rubus', 'chicala'])]
marsh_flora = [n for n in floraNodes if matches(n, ['junco', 'schoenoplectus', 'enea', 'totora', 'typha', 'papiro', 'cyperus', 'cortadera', 'carex', 'botoncillo', 'bidens', 'lenteja', 'lemna', 'buchon', 'buchón', 'limnobium', 'barbasco', 'polygonum', 'ludwigia', 'eichhornia', 'azolla'])]
canopy_flora = [n for n in floraNodes if matches(n, ['sauce', 'salix', 'aliso', 'alnus', 'eucalipto', 'eucalyptus', 'cipres', 'ciprés', 'pino', 'cupressus', 'urapan', 'urapán', 'fresno', 'fraxinus', 'acacia', 'nogal', 'juglans', 'cedro', 'cedrela', 'araucaria', 'roble', 'quercus'])]

# Sub-grupos funcionales de Aves (iNaturalist Humedales de Kennedy)
colibries = [n for n in aveNodes if matches(n, ['colibr', 'eriocnemis', 'lesbia', 'diglossa', 'metallura', 'chaetocercus', 'coeligena', 'aglaeactis', 'phaethornis', 'calzadito', 'chillón', 'cometa', 'picaflor', 'brillante'])]
frugivores = [n for n in aveNodes if matches(n, ['turdus', 'thraupis', 'zonotrichia', 'icterus', 'mimus', 'pheucticus', 'euphonia', 'piranga', 'tangara', 'tángara', 'mirla', 'copetón', 'calandria', 'centzontle', 'eufonia', 'semillero', 'cacique', 'oropéndola', 'frutero', 'cardenal', 'chara', 'cyanocorax'])]
marsh_birds = [n for n in aveNodes if matches(n, ['rallus', 'chrysomus', 'porphyrio', 'porphyriops', 'gallinula', 'fulica', 'mustelirallus', 'oxyura', 'pardirallus', 'sicalis', 'tingua', 'monjita', 'polla', 'focha', 'burrito', 'pato', 'rascón', 'canario', 'cerceta', 'anade', 'pisingo', 'garcita', 'ixobrychus'])]
raptors = [n for n in aveNodes if matches(n, ['asio', 'megascops', 'tyto', 'bubo', 'elanus', 'rupornis', 'falco', 'geranoaetus', 'buteo', 'caracara', 'búho', 'autillo', 'lechuza', 'gavilán', 'aguililla', 'halcón', 'águila', 'elanio', 'carancho', 'cernícalo', 'guaco', 'pandion'])]
herons = [n for n in aveNodes if matches(n, ['ardea', 'egretta', 'nycticorax', 'podilymbus', 'phimosus', 'garza', 'garceta', 'guaco', 'zambullidor', 'cuervillo', 'coquito', 'ibis', 'alcaraván', 'avefría', 'vanellus', 'bubulcus'])]
chamon = [n for n in aveNodes if matches(n, ['molothrus', 'chamón', 'tordo'])]
insectivores = [n for n in aveNodes if matches(n, ['troglodytes', 'cucarachero', 'tyrannus', 'sirirí', 'elaenia', 'pitangus', 'bienteveo', 'sayornis', 'myiarchus', 'pyrocephalus', 'atrapamoscas', 'mosquero', 'basileuterus', 'myioborus', 'setophaga', 'cardellina', 'chipe', 'reinita'])]

print(f"Functional groups: Colibries={len(colibries)}, Frugivores={len(frugivores)}, MarshBirds={len(marsh_birds)}, Raptors={len(raptors)}, Herons={len(herons)}, Insectivores={len(insectivores)}")

# A. POLINIZACIÓN & VISITA FLORAL
for col in (colibries or aveNodes[:20]):
    for fl in (pollination_flora[:10] or floraNodes[:10]):
        add_edge(col, fl, INTER_TYPES['POLLINATION'], f'Visita floral melífera de {col["label"]} libando néctar en flores de {fl["label"]}')

for ins in (insectivores[:30] or aveNodes[20:50]):
    for fl in (pollination_flora[5:15] or floraNodes[10:20]):
        add_edge(ins, fl, INTER_TYPES['POLLINATION'], f'Forrajeo floral e intercambio de polen por {ins["label"]} en {fl["label"]}')

# B. DISPERSIÓN DE SEMILLAS & ZOOCORÍA
for fr in (frugivores or aveNodes[10:40]):
    for tr in (berry_flora[:12] or floraNodes[:12]):
        add_edge(fr, tr, INTER_TYPES['DISPERSAL'], f'Frugivoría y dispersión endozoócora de semillas de {tr["label"]} por {fr["label"]}')

for mam in mamNodes:
    for tr in (berry_flora[:8] or floraNodes[:8]):
        add_edge(mam, tr, INTER_TYPES['DISPERSAL'], f'Transporte y diseminación zoócora de semillas de {tr["label"]} por {mam["label"]}')

# C. NIDIFICACIÓN & REFUGIO EN JUNCALES
for mb in (marsh_birds or aveNodes[30:60]):
    for mf in (marsh_flora[:10] or floraNodes[20:30]):
        add_edge(mb, mf, INTER_TYPES['NESTING'], f'Anclaje de plataformas de nidificación y resguardo de polluelos de {mb["label"]} en juncales de {mf["label"]}')

# D. HERBIVORÍA Y FITOFAGIA
for mb in (marsh_birds[:15] if marsh_birds else aveNodes[:15]):
    for mf in (marsh_flora[:8] or floraNodes[:8]):
        add_edge(mb, mf, INTER_TYPES['HERBIVORY'], f'Herbivoría directa de tejidos blandos y macrófitas de {mf["label"]} por {mb["label"]}')

for mol in molNodes:
    for fl in ((marsh_flora + berry_flora)[:10] or floraNodes[:10]):
        add_edge(mol, fl, INTER_TYPES['HERBIVORY'], f'Raspado fitófago con rádula de hojas y plántulas tiernas de {fl["label"]} por {mol["label"]}')

for mam in [m for m in mamNodes if matches(m, ['cavia', 'curi', 'curí', 'rat', 'mus', 'muroidea', 'roedor'])]:
    for fl in (marsh_flora + pollination_flora)[:8]:
        add_edge(mam, fl, INTER_TYPES['HERBIVORY'], f'Forrajeo de pastos, brotes y rizomas de {fl["label"]} por {mam["label"]}')

# E. ANIDAMIENTO DE DOSEL & PERCHA
for rap in (raptors or aveNodes[:12]):
    for tr in (canopy_flora[:10] or floraNodes[:10]):
        add_edge(rap, tr, INTER_TYPES['NEST_SITE'], f'Atalaya de caza y anidamiento en el dosel superior de {tr["label"]} por {rap["label"]}')

for hr in (herons or aveNodes[5:20]):
    for tr in [t for t in canopy_flora if matches(t, ['sauce', 'salix', 'aliso', 'alnus', 'urapan'])] or canopy_flora[:6]:
        add_edge(hr, tr, INTER_TYPES['NEST_SITE'], f'Dormidero colonial y posadero de descanso de {hr["label"]} en ramas ribereñas de {tr["label"]}')

for torc in [a for a in aveNodes if matches(a, ['zenaida', 'torcaza', 'paloma', 'columba', 'patagioenas'])]:
    for tr in (canopy_flora[:8] or floraNodes[:8]):
        add_edge(torc, tr, INTER_TYPES['NEST_SITE'], f'Nidificación en bifurcaciones de ramas y horquetas de {tr["label"]} por {torc["label"]}')

# F. DEPREDACIÓN CARNÍVORA & CONTROL BIOLÓGICO
for rap in (raptors or aveNodes[:12]):
    for mam in [m for m in mamNodes if matches(m, ['rattus', 'mus', 'cavia', 'muroidea', 'roedor', 'rata', 'ratón', 'ardilla'])]:
        add_edge(rap, mam, INTER_TYPES['PREDATION'], f'Depredación carnívora y regulación poblacional de {mam["label"]} por {rap["label"]}')
    for rep in repNodes:
        add_edge(rap, rep, INTER_TYPES['PREDATION'], f'Captura de reptiles de pastizal ({rep["label"]}) por {rap["label"]}')
    for anf in anfNodes[:5]:
        add_edge(rap, anf, INTER_TYPES['PREDATION'], f'Caza oportunista de {anf["label"]} en márgenes hídricos por {rap["label"]}')

# G. DEPREDACIÓN ICTIÓFAGA & DE ANFIBIOS
for hr in (herons or aveNodes[:15]):
    for anf in anfNodes:
        add_edge(hr, anf, INTER_TYPES['PREDATION'], f'Pesca y captura subacuática con pico de {anf["label"]} por {hr["label"]}')

# H. DEPREDACIÓN MALACÓFAGA
malacophages = [a for a in aveNodes if matches(a, ['aramus', 'carrao', 'rallus', 'tingua', 'porphyrio', 'gallinula', 'oxyura', 'pato', 'garza'])] or aveNodes[:10]
for mala in malacophages:
    for mol in molNodes:
        add_edge(mala, mol, INTER_TYPES['PREDATION'], f'Forrajeo y consumo de caracoles acuáticos ({mol["label"]}) por {mala["label"]}')

for rep in [r for r in repNodes if matches(r, ['atractus', 'serpiente', 'culebra'])]:
    for mol in molNodes:
        add_edge(rep, mol, INTER_TYPES['PREDATION'], f'Depredación especializada de moluscos y babosas ({mol["label"]}) por {rep["label"]}')

# I. DEPREDACIÓN MAMÍFERA
for comadreja in [m for m in mamNodes if matches(m, ['neogale', 'mustela', 'comadreja', 'chucurí'])]:
    for rod in [m for m in mamNodes if matches(m, ['rattus', 'mus', 'cavia', 'muroidea', 'roedor'])]:
        add_edge(comadreja, rod, INTER_TYPES['PREDATION'], f'Depredación en madrigueras subterráneas de {rod["label"]} por {comadreja["label"]}')
    for anf in anfNodes[:4]:
        add_edge(comadreja, anf, INTER_TYPES['PREDATION'], f'Caza ribereña de {anf["label"]} por {comadreja["label"]}')

# J. PARASITISMO DE NIDO
for ch in (chamon or [a for a in aveNodes if 'cham' in a['label'].lower() or 'molothrus' in a['sciname'].lower()]):
    for host in [a for a in aveNodes if matches(a, ['zonotrichia', 'copetón', 'turdus', 'mirla', 'troglodytes', 'cucarachero', 'sturnella', 'chirlobirlo', 'icterus', 'thraupis'])]:
        add_edge(ch, host, INTER_TYPES['PARASITISM'], f'Parasitismo obligado de cría de {ch["label"]} depositando huevos en nido de {host["label"]}')

# K. MUTUALISMO & BIOFILTRO
for aliso in [n for n in floraNodes if matches(n, ['aliso', 'alnus'])]:
    for neighbor_fl in floraNodes[:12]:
        add_edge(aliso, neighbor_fl, INTER_TYPES['MUTUALISM'], f'Fijación simbiótica de nitrógeno por actinomicetos en raíces de {aliso["label"]} enriqueciendo a {neighbor_fl["label"]}')

for junc in (marsh_flora[:10] or floraNodes[:10]):
    for water_bird in (marsh_birds[:10] if marsh_birds else aveNodes[:10]):
        add_edge(junc, water_bird, INTER_TYPES['ALLELOPATHY'], f'Biofiltración fitoquímica de metales pesados en {junc["label"]} purificando el agua para {water_bird["label"]}')

for chipe in (insectivores[:15] if insectivores else aveNodes[:15]):
    for res in (frugivores[:6] if frugivores else aveNodes[:6]):
        add_edge(chipe, res, INTER_TYPES['MUTUALISM'], f'Asociación en bandadas mixtas de forrajeo y alerta auditiva entre {chipe["label"]} y {res["label"]}')

# L. COHESIÓN COMPLETA: Conectar toda especie restante
for n in rawNodes:
    if len(n['neighbors']) < 2:
        if n['cat'] == 0:
            target_ave = aveNodes[n['id'] % len(aveNodes)]
            add_edge(n, target_ave, INTER_TYPES['DISPERSAL'], f'Percha y transporte ornitócoro de frutos en {n["label"]}')
            target_col = colibries[n['id'] % len(colibries)] if colibries else aveNodes[(n['id'] + 3) % len(aveNodes)]
            add_edge(n, target_col, INTER_TYPES['POLLINATION'], f'Visita floral y forrajeo de néctar en {n["label"]}')
        elif n['cat'] == 1:
            target_flora1 = floraNodes[n['id'] % len(floraNodes)]
            add_edge(n, target_flora1, INTER_TYPES['POLLINATION'], f'Atracción floral y forrajeo en estrato arbustivo de {target_flora1["label"]}')
            target_flora2 = berry_flora[n['id'] % len(berry_flora)] if berry_flora else floraNodes[(n['id'] + 5) % len(floraNodes)]
            add_edge(n, target_flora2, INTER_TYPES['DISPERSAL'], f'Consumo y dispersión de semillas de {target_flora2["label"]}')
        elif n['cat'] in (2, 3, 4, 5):
            target_fl = floraNodes[n['id'] % len(floraNodes)]
            add_edge(n, target_fl, INTER_TYPES['HERBIVORY'], f'Microhábitat de suelo y forrajeo vegetal en {target_fl["label"]}')
            target_rap = raptors[n['id'] % len(raptors)] if raptors else aveNodes[n['id'] % len(aveNodes)]
            add_edge(n, target_rap, INTER_TYPES['PREDATION'], f'Eslabón de presa en la red trófica frente a {target_rap["label"]}')

type_counts = Counter([e['type']['name'] for e in edgeDetailsMap.values()])
print(f"\n=== GENERATION SUMMARY ===")
print(f"Total Edges generated: {len(rawEdges)}")
print("Interaction Types Distribution:")
for k, v in type_counts.most_common():
    print(f"  {k}: {v} connections")

degrees = [len(n['neighbors']) for n in rawNodes]
print(f"\nDegree stats: Min={min(degrees)}, Max={max(degrees)}, Avg={sum(degrees)/len(degrees):.2f}")

# Top 15 hubs
sorted_nodes = sorted(rawNodes, key=lambda n: len(n['neighbors']), reverse=True)
print("\nTop 15 Ecological Hubs:")
for i, n in enumerate(sorted_nodes[:15], 1):
    print(f"  #{i} [{n['taxaId']}] {n['label']} ({n['sciname']}) - Degree: {len(n['neighbors'])}")
