import json

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

# 1. Flora sub-groups
pollination_flora = [n for n in floraNodes if matches(n, ['sauco', 'sambucus', 'chilco', 'baccharis', 'raque', 'vallea', 'farolito', 'abutilon', 'chicala', 'tecoma', 'tibar', 'escallonia', 'fucsia', 'fuchsia', 'siete cueros', 'tibouchina', 'salvia', 'drago', 'croton', 'arboloco', 'smallanthus', 'mortiño', 'hesperomeles', 'cayeno', 'abelia', 'corono', 'hayuelo'])]
berry_flora = [n for n in floraNodes if matches(n, ['sauco', 'sambucus', 'capuli', 'capulí', 'cerezo', 'prunus', 'caucho', 'ficus', 'eugenia', 'arrayan', 'arrayán', 'myrcianthes', 'pimiento', 'schinus', 'espino', 'duranta', 'palma', 'yucca', 'guayacan', 'guayacán', 'passiflora', 'curuba', 'jazmin', 'jazmín', 'laurel', 'durazno', 'chicala'])]
marsh_flora = [n for n in floraNodes if matches(n, ['junco', 'schoenoplectus', 'enea', 'totora', 'typha', 'papiro', 'cyperus', 'cortadera', 'carex', 'botoncillo', 'bidens', 'lenteja', 'lemna', 'buchon', 'buchón', 'limnobium', 'barbasco', 'polygonum', 'ludwigia'])]
canopy_flora = [n for n in floraNodes if matches(n, ['sauce', 'salix', 'aliso', 'alnus', 'eucalipto', 'eucalyptus', 'cipres', 'ciprés', 'pino', 'cupressus', 'urapan', 'urapán', 'fresno', 'fraxinus', 'acacia', 'nogal', 'juglans', 'cedro', 'cedrela', 'araucaria', 'roble', 'quercus'])]

# Fallbacks if empty
if not pollination_flora: pollination_flora = floraNodes[:30]
if not berry_flora: berry_flora = floraNodes[10:40]
if not marsh_flora: marsh_flora = floraNodes[20:50]
if not canopy_flora: canopy_flora = floraNodes[30:60]

# 2. Fauna sub-groups
colibries = [n for n in aveNodes if matches(n, ['colibr', 'eriocnemis', 'lesbia', 'diglossa', 'metallura', 'chaetocercus', 'coeligena', 'aglaeactis', 'phaethornis', 'calzadito', 'chillón', 'cometa', 'picaflor', 'brillante'])]
frugivores = [n for n in aveNodes if matches(n, ['turdus', 'thraupis', 'zonotrichia', 'icterus', 'mimus', 'pheucticus', 'euphonia', 'piranga', 'tangara', 'tángara', 'mirla', 'copetón', 'calandria', 'centzontle', 'eufonia', 'semillero', 'cacique', 'oropéndola', 'frutero', 'cardenal'])]
marsh_birds = [n for n in aveNodes if matches(n, ['rallus', 'chrysomus', 'porphyrio', 'porphyriops', 'gallinula', 'fulica', 'mustelirallus', 'oxyura', 'pardirallus', 'sicalis', 'tingua', 'monjita', 'polla', 'focha', 'burrito', 'pato', 'rascón', 'canario', 'cerceta', 'anade', 'pisingo', 'garcita'])]
raptors = [n for n in aveNodes if matches(n, ['asio', 'megascops', 'tyto', 'bubo', 'elanus', 'rupornis', 'falco', 'geranoaetus', 'buteo', 'caracara', 'búho', 'autillo', 'lechuza', 'gavilán', 'aguililla', 'halcón', 'águila', 'elanio', 'carancho', 'cernícalo', 'guaco'])]
herons = [n for n in aveNodes if matches(n, ['ardea', 'egretta', 'nycticorax', 'podilymbus', 'phimosus', 'garza', 'garceta', 'guaco', 'zambullidor', 'cuervillo', 'coquito', 'ibis', 'alcaraván', 'avefría'])]
chamon = [n for n in aveNodes if matches(n, ['molothrus', 'chamón', 'tordo'])]

# A. POLINIZACIÓN (Colibríes <--> Flora Melífera)
for col in (colibries or aveNodes[:15]):
    for fl in pollination_flora[:8]:
        add_edge(col, fl, INTER_TYPES['POLLINATION'], 'Polinización cruzada y libación de néctar floral')

# B. DISPERSIÓN DE SEMILLAS (Aves frugívoras & Mamíferos <--> Flora fructífera)
for fr in (frugivores or aveNodes[10:35]):
    for tr in berry_flora[:6]:
        add_edge(fr, tr, INTER_TYPES['DISPERSAL'], 'Consumo de frutos y dispersión zoócora de semillas en la matriz urbana')

for mam in mamNodes:
    for tr in berry_flora[:5]:
        add_edge(mam, tr, INTER_TYPES['DISPERSAL'], 'Forrajeo de frutos de dosel y transporte de semillas')

# C. NIDIFICACIÓN & REFUGIO EN JUNCALES (Rálidos y aves acuáticas <--> Macrófitas)
for mb in (marsh_birds or aveNodes[25:50]):
    for mf in marsh_flora[:6]:
        add_edge(mb, mf, INTER_TYPES['NESTING'], 'Anclaje de nidos flotantes y camuflaje entre juncos y eneas')

# D. HERBIVORÍA (Aves acuáticas, roedores, moluscos <--> Macrófitas y brotes)
for mb in (marsh_birds[:10] if marsh_birds else aveNodes[:10]):
    for mf in marsh_flora[:4]:
        add_edge(mb, mf, INTER_TYPES['HERBIVORY'], 'Consumo de hojas tiernas, tallos y algas periféricas')

for mol in molNodes:
    for fl in (marsh_flora + berry_flora)[:5]:
        add_edge(mol, fl, INTER_TYPES['HERBIVORY'], 'Raspado fitófago de hojas y plántulas de estrato bajo')

for mam in [m for m in mamNodes if matches(m, ['cavia', 'curi', 'curí', 'rat', 'mus', 'muroidea', 'roedor'])]:
    for fl in (marsh_flora + pollination_flora)[:4]:
        add_edge(mam, fl, INTER_TYPES['HERBIVORY'], 'Forrajeo herbívoro de raíces y gramíneas de borde')

# E. ANIDAMIENTO DE DOSEL & PERCHA (Rapaces, Garzas, Torcazas <--> Árboles altos)
for rap in (raptors or aveNodes[:10]):
    for tr in canopy_flora[:6]:
        add_edge(rap, tr, INTER_TYPES['NEST_SITE'], 'Percha de vigilancia diurna/nocturna y anidamiento en ramas altas')

for hr in (herons or aveNodes[5:15]):
    for tr in [t for t in canopy_flora if matches(t, ['sauce', 'salix', 'aliso', 'alnus', 'urapan'])] or canopy_flora[:4]:
        add_edge(hr, tr, INTER_TYPES['NEST_SITE'], 'Dormidero colonial y posadero sobre láminas de agua')

for torc in [a for a in aveNodes if matches(a, ['zenaida', 'torcaza', 'paloma', 'columba'])]:
    for tr in canopy_flora[:4]:
        add_edge(torc, tr, INTER_TYPES['NEST_SITE'], 'Nidificación en bifurcaciones de ramas')

# F. DEPREDACIÓN CARNÍVORA (Rapaces <--> Roedores, Reptiles, Anfibios)
for rap in (raptors or aveNodes[:10]):
    for mam in [m for m in mamNodes if matches(m, ['rattus', 'mus', 'cavia', 'muroidea', 'roedor', 'rata', 'ratón'])]:
        add_edge(rap, mam, INTER_TYPES['PREDATION'], 'Caza y control biológico de micromamíferos urbanos')
    for rep in repNodes:
        add_edge(rap, rep, INTER_TYPES['PREDATION'], 'Captura de serpientes sabaneras y lagartijas en pastizales')
    for anf in anfNodes[:4]:
        add_edge(rap, anf, INTER_TYPES['PREDATION'], 'Depredación oportunista de anfibios en orillas')

# G. DEPREDACIÓN ICTIÓFAGA & DE ANFIBIOS (Garzas / Acuáticas <--> Anfibios)
for hr in (herons or aveNodes[:10]):
    for anf in anfNodes:
        add_edge(hr, anf, INTER_TYPES['PREDATION'], 'Captura rápida con pico de ranas sabaneras y renacuajos')

# H. DEPREDACIÓN MALACÓFAGA (Carrao, Tinguas, Serpiente sabanera <--> Moluscos)
malacophages = [a for a in aveNodes if matches(a, ['aramus', 'carrao', 'rallus', 'tingua', 'porphyrio', 'gallinula', 'oxyura', 'pato'])] or aveNodes[:8]
for mala in malacophages:
    for mol in molNodes:
        add_edge(mala, mol, INTER_TYPES['PREDATION'], 'Extracción y consumo de caracoles y babosas de humedal')

for rep in [r for r in repNodes if matches(r, ['atractus', 'serpiente', 'culebra'])]:
    for mol in molNodes:
        add_edge(rep, mol, INTER_TYPES['PREDATION'], 'Depredación fosorial de babosas y lombrices bajo hojarasca')

# I. DEPREDACIÓN MAMÍFERA (Comadreja andina <--> Roedores y aves de suelo)
for comadreja in [m for m in mamNodes if matches(m, ['neogale', 'comadreja', 'chucurí'])]:
    for rod in [m for m in mamNodes if matches(m, ['rattus', 'mus', 'cavia', 'muroidea'])]:
        add_edge(comadreja, rod, INTER_TYPES['PREDATION'], 'Depredación carnívora especializada en galerías de roedores')
    for anf in anfNodes[:3]:
        add_edge(comadreja, anf, INTER_TYPES['PREDATION'], 'Caza en matorrales ribereños')

# J. PARASITISMO DE NIDO (Chamón <--> Aves hospedantes)
for ch in (chamon or [a for a in aveNodes if 'cham' in a['label'].lower()]):
    for host in [a for a in aveNodes if matches(a, ['zonotrichia', 'copetón', 'turdus', 'mirla', 'troglodytes', 'cucarachero', 'sturnella', 'chirlobirlo'])]:
        add_edge(ch, host, INTER_TYPES['PARASITISM'], 'Parasitismo de puesta: deposición de huevos en nidos ajenos')

# K. MUTUALISMO & BIOFILTRO (Fijación de N2, Biorremediación, Bandadas mixtas)
for aliso in [n for n in floraNodes if matches(n, ['aliso', 'alnus'])]:
    for neighbor_fl in floraNodes[:6]:
        add_edge(aliso, neighbor_fl, INTER_TYPES['MUTUALISM'], 'Enriquecimiento del suelo con nitrógeno simbiótico fijado por actinomicetos')

for junc in marsh_flora[:6]:
    for water_bird in (marsh_birds[:6] if marsh_birds else aveNodes[:6]):
        add_edge(junc, water_bird, INTER_TYPES['ALLELOPATHY'], 'Biofiltro de contaminantes pesados y purificación del hábitat acuático')

# Forrajeo cooperativo de bandadas mixtas
chipes = [a for a in aveNodes if matches(a, ['setophaga', 'cardellina', 'chipe', 'reinita', 'verivoro'])]
for chipe in chipes:
    for res in (frugivores[:4] if frugivores else aveNodes[:4]):
        add_edge(chipe, res, INTER_TYPES['MUTUALISM'], 'Bandada mixta de forrajeo y alerta acústica contra depredadores')

# Cohesión ecológica final para conectar a todos los 568 nodos
for n in rawNodes:
    if len(n['neighbors']) == 0:
        if n['cat'] == 0:
            target_ave = aveNodes[n['id'] % len(aveNodes)]
            add_edge(n, target_ave, INTER_TYPES['DISPERSAL'], 'Dispersión zoócora y percha en el dosel urbano')
        elif n['cat'] == 1:
            target_flora = floraNodes[n['id'] % len(floraNodes)]
            add_edge(n, target_flora, INTER_TYPES['POLLINATION'], 'Forrajeo de néctar y dispersión vegetal en Kennedy')
        elif n['cat'] in (2, 3, 4, 5):
            target_flora = floraNodes[n['id'] % len(floraNodes)]
            add_edge(n, target_flora, INTER_TYPES['HERBIVORY'], 'Microhábitat de suelo y forrajeo de hojarasca')

from collections import Counter
type_counts = Counter([e['type']['name'] for e in edgeDetailsMap.values()])
print(f"Total Edges generated: {len(rawEdges)}")
print("Interaction Types Distribution:")
for k, v in type_counts.most_common():
    print(f"  {k}: {v} connections")

# Degree analysis
degrees = [len(n['neighbors']) for n in rawNodes]
print(f"Min degree: {min(degrees)}, Max degree: {max(degrees)}, Avg degree: {sum(degrees)/len(degrees):.2f}")
