import json, os

# Load clean dataset
with open('tools/clean_dataset_aves_flora.json', 'r', encoding='utf-8') as f:
    clean_data = json.load(f)

aves = clean_data['aves']
flora = clean_data['flora']

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

js_nodes_lines = []
js_nodes_lines.append("function buildFullDataset() {")
js_nodes_lines.append("  const nodes = [];")
js_nodes_lines.append("")

# Flora
js_nodes_lines.append("  // 1. FLORA URBANA Y DE HUMEDAL (Censo JBB / SIGAU)")
js_nodes_lines.append("  const floraBase = [")
for f in flora:
    esc_id = f["id"]
    esc_name = f['name'].replace('"', '\\"')
    esc_sci = f['sciname'].replace('"', '\\"')
    esc_role = f['role'].replace('"', '\\"')
    esc_strat = f['stratum'].replace('"', '\\"')
    esc_img = f['img'].replace('"', '\\"')
    count = f.get('count', 100)
    js_nodes_lines.append(f'    ["{esc_id}", "{esc_name}", "{esc_sci}", "{esc_role}", "{esc_strat}", {count}, "{esc_img}"],')
js_nodes_lines.append("  ];")
js_nodes_lines.append("  floraBase.forEach((item, idx) => {")
js_nodes_lines.append("    nodes.push({")
js_nodes_lines.append("      id: item[0],")
js_nodes_lines.append("      name: item[1],")
js_nodes_lines.append("      sci: item[2],")
js_nodes_lines.append("      cat: 0,")
js_nodes_lines.append("      role: item[3],")
js_nodes_lines.append("      stratum: item[4],")
js_nodes_lines.append("      count: item[5],")
js_nodes_lines.append("      img: item[6],")
js_nodes_lines.append("      loc: 'Localidad 09 Kennedy — Censo Forestal SIGAU / JBB',")
js_nodes_lines.append("      alert: item[1].includes('Junco') ? 'Especie clave de hábitat para Tingua Bogotana' : 'Monitoreo Arbolado Urbano Kennedy',")
js_nodes_lines.append("      inatUrl: 'https://colombia.inaturalist.org/search?q=' + encodeURIComponent(item[2])")
js_nodes_lines.append("    });")
js_nodes_lines.append("  });")
js_nodes_lines.append("")

# Aves
js_nodes_lines.append("  // 2. AVES DE KENNEDY (236 especies únicas)")
js_nodes_lines.append("  const avesBase = [")
for a in aves:
    esc_name = a['name'].replace('"', '\\"')
    esc_sci = a['sciname'].replace('"', '\\"')
    esc_role = a['role'].replace('"', '\\"')
    esc_loc = a['loc'].replace('"', '\\"')
    esc_alert = a['alert'].replace('"', '\\"')
    esc_img = a['img'].replace('"', '\\"')
    js_nodes_lines.append(f'    ["{a["id"]}", "{esc_name}", "{esc_sci}", "{esc_role}", "{esc_loc}", "{esc_alert}", "{esc_img}"],')
js_nodes_lines.append("  ];")
js_nodes_lines.append("  avesBase.forEach(item => {")
js_nodes_lines.append("    nodes.push({")
js_nodes_lines.append("      id: item[0],")
js_nodes_lines.append("      name: item[1],")
js_nodes_lines.append("      sci: item[2],")
js_nodes_lines.append("      cat: 1,")
js_nodes_lines.append("      role: item[3],")
js_nodes_lines.append("      loc: item[4],")
js_nodes_lines.append("      alert: item[5],")
js_nodes_lines.append("      img: item[6],")
js_nodes_lines.append("      inatUrl: 'https://colombia.inaturalist.org/search?q=' + encodeURIComponent(item[2])")
js_nodes_lines.append("    });")
js_nodes_lines.append("  });")
js_nodes_lines.append("")

def append_group(name, cat_id, dataset, group_alert, loc_desc):
    js_nodes_lines.append(f"  // {name}")
    js_nodes_lines.append(f"  const {name.lower()}Base = [")
    for row in dataset:
        esc_id = row[0]
        esc_name = row[1].replace('"', '\\"')
        esc_sci = row[2].replace('"', '\\"')
        esc_role = row[3].replace('"', '\\"')
        esc_strat = row[4].replace('"', '\\"')
        esc_img = row[5].replace('"', '\\"')
        js_nodes_lines.append(f'    ["{esc_id}", "{esc_name}", "{esc_sci}", "{esc_role}", "{esc_strat}", "{esc_img}"],')
    js_nodes_lines.append("  ];")
    js_nodes_lines.append(f"  {name.lower()}Base.forEach(item => {{")
    js_nodes_lines.append("    nodes.push({")
    js_nodes_lines.append("      id: item[0],")
    js_nodes_lines.append("      name: item[1],")
    js_nodes_lines.append("      sci: item[2],")
    js_nodes_lines.append(f"      cat: {cat_id},")
    js_nodes_lines.append("      role: item[3],")
    js_nodes_lines.append("      stratum: item[4],")
    js_nodes_lines.append(f"      loc: '{loc_desc}',")
    js_nodes_lines.append(f"      alert: '{group_alert}',")
    js_nodes_lines.append("      img: item[5],")
    js_nodes_lines.append("      inatUrl: 'https://colombia.inaturalist.org/search?q=' + encodeURIComponent(item[2])")
    js_nodes_lines.append("    });")
    js_nodes_lines.append("  });")
    js_nodes_lines.append("")

append_group("Mamiferos", 2, mamiferos, "Monitoreo Mastozoológico Kennedy", "Humedales El Burro, La Vaca, Meandro del Say y Corredores Verdes")
append_group("Moluscos", 3, moluscos, "Monitoreo Malacológico y Bentónico", "Espejos de agua, juncales y riberas de Kennedy")
append_group("Anfibios", 4, anfibios, "Monitoreo Herpetológico y Bioindicadores de Calidad Hídrica", "Espejo Central y Zonas Litorales de Humedales")
append_group("Reptiles", 5, reptiles, "Monitoreo Herpetológico Sabana de Bogotá", "Zonas de Ronda, Taludes Secos y Coberturas Arbóreas")

js_nodes_lines.append("  return nodes;")
js_nodes_lines.append("}")

js_dataset_string = "\n".join(js_nodes_lines)

# Write master JS file with organic breathing animations and instant failsafe veil hide
with open("tools/engine_template.js", "w", encoding="utf-8") as f:
    f.write("""// modulo-11-garden.js — Sistema Socioecológico de Kennedy: Red Biótica & Territorio 3D
// Desarrollado con Three.js, shaders de partículas WebGL, censo forestal SIGAU/JBB e inventario eBird/iNaturalist

(() => {
  "use strict";

  // =====================================================================
  // 1. DECLARACIÓN DE VARIABLES Y OBJETOS TOP-LEVEL (Prevención Total de TDZ)
  // =====================================================================
  const SCALE = 0.08;
  const netCenter = { x: 5341.33, y: 3161.9 };

  function toScene(x, y) {
    return { x: (x - netCenter.x) * SCALE, z: -(y - netCenter.y) * SCALE };
  }

  // ---- Setup de Elementos DOM ----
  const canvas = document.getElementById("sceneCanvas");
  const loadingVeil = document.getElementById("loadingVeil");
  const topHeader = document.getElementById("topHeader");
  const sideDrawer = document.getElementById("sideDrawer");
  const nodeInspector = document.getElementById("nodeInspector");
  const chatWidgetBtn = document.getElementById("chatWidgetBtn");
  const chatWindow = document.getElementById("chatWindow");

  const slider = document.getElementById("morphSlider");
  const btnToggle = document.getElementById("btnToggleView");
  const btnActionText = document.getElementById("btnActionText");
  const labelSwarm = document.getElementById("labelSwarm");
  const labelTerritory = document.getElementById("labelTerritory");

  const activeTreeChip = document.getElementById("activeTreeChip");
  const activeTreeName = document.getElementById("activeTreeName");
  const activeTreeCount = document.getElementById("activeTreeCount");

  const territoryTooltip = document.getElementById("territorySpeciesTooltip");
  const territoryModal = document.getElementById("territorySpeciesModal");
  const treeTooltip = document.getElementById("treeHoverTooltip");
  const pieChartsModal = document.getElementById("pieChartsModalOverlay");

  // ---- Three.js Core Objects ----
  let scene = null;
  let camera = null;
  let renderer = null;
  let controls = null;

  const sceneRoot = new THREE.Group();
  const networkGroup = new THREE.Group();
  const sceneBaseGroup = new THREE.Group();
  const territoryBeaconsGroup = new THREE.Group();
  const speciesConstellationGroup = new THREE.Group();
  const activeTreeIndicatorGroup = new THREE.Group();

  let particleGeo = null;
  let particleMat = null;
  let particleMesh = null;

  let edgeLinesMesh = null;
  let edgeMat = null;

  const nodeSprites = [];
  const territoryBeacons = [];
  const territoryTreesList = [];
  const treeSpatialGrid = {};

  const rawNodes = [];
  const rawEdges = [];
  const edgeDetailsMap = new Map();

  const treeSpeciesClusters = {};
  const treeSpeciesNames = [
    "chicala", "sauco", "cajeto", "caucho sabanero", "caucho benjamin",
    "falso pimiento", "jazmin del cabo", "holly liso", "eugenia", "cayeno",
    "guayacan de manizales", "palma yuca", "jazmin de la china", "acacia japonesa",
    "eucalipto", "cipres", "urapan", "acacia baracatinga", "acacia negra",
    "caballero de la noche", "hayuelo", "aliso", "cerezo", "calistemo",
    "araucaria", "pino libro", "mangle de tierra fria", "corono",
    "arrayan blanco", "liquidambar", "chilco", "abutilon", "cucharo",
    "roble", "nogal", "sauce lloron", "cedro", "espino", "palma fenix",
    "schefflera", "gaque", "ciro", "junco", "totora", "buchon", "lenteja de agua"
  ];
  treeSpeciesNames.forEach(k => { treeSpeciesClusters[k] = []; });

  // ---- Interaction Tools & State ----
  const raycaster = new THREE.Raycaster();
  const mouseVec = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const groundIntersection = new THREE.Vector3();

  let tourActive = false;
  let tourTimer = null;
  let currentTourIndex = 0;
  let currentMorph = 0.0;
  let targetMorph = 0.0;

  const clock = new THREE.Clock();

  // Particle Buffers
  let currentParticleIndex = 0;
  const pTarget = [];
  const pSwarm  = [];
  const pColor  = [];
  const pSize   = [];
  const pPhase  = [];
  const pCat    = [];

  const opts = {
    subred: 'todos',
    layout: 'circular',
    autoRotate: true,
    showLabels: true,
    curved: false,
    sound: false,
    activeCategories: {
      0: true, // Flora
      1: true, // Aves
      2: true, // Mamíferos
      3: true, // Moluscos
      4: true, // Anfibios
      5: true  // Reptiles
    }
  };

  const CATEGORY_META = {
    0: { name: "Flora & Árboles", color: "#84A48B", hex: 0x84A48B, icon: "fa-seedling" },
    1: { name: "Aves de Kennedy", color: "#F79E70", hex: 0xF79E70, icon: "fa-feather-pointed" },
    2: { name: "Mamíferos", color: "#E7C878", hex: 0xE7C878, icon: "fa-paw" },
    3: { name: "Moluscos", color: "#6B9080", hex: 0x6B9080, icon: "fa-water" },
    4: { name: "Anfibios", color: "#00B4D8", hex: 0x00B4D8, icon: "fa-frog" },
    5: { name: "Reptiles", color: "#C96349", hex: 0xC96349, icon: "fa-dragon" }
  };

  function hideVeil() {
    if (loadingVeil) {
      loadingVeil.style.opacity = "0";
      setTimeout(() => { loadingVeil.style.display = "none"; }, 400);
    }
  }

  // Spatial Grid Helper for 3D Tree Hover Tooltip
  function getSpatialKey(gx, gz) {
    return gx + "_" + gz;
  }

  function addTreeToSpatialGrid(treeObj) {
    const gx = Math.floor(treeObj.x / 8);
    const gz = Math.floor(treeObj.z / 8);
    const key = getSpatialKey(gx, gz);
    if (!treeSpatialGrid[key]) treeSpatialGrid[key] = [];
    treeSpatialGrid[key].push(treeObj);
  }

  function findClosestTree(wx, wz, maxRadius) {
    const gx = Math.floor(wx / 8);
    const gz = Math.floor(wz / 8);
    let closest = null;
    let minDistSq = maxRadius * maxRadius;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const key = getSpatialKey(gx + dx, gz + dz);
        const cell = treeSpatialGrid[key];
        if (cell) {
          for (let i = 0; i < cell.length; i++) {
            const t = cell[i];
            const distSq = (t.x - wx) * (t.x - wx) + (t.z - wz) * (t.z - wz);
            if (distSq < minDistSq) {
              minDistSq = distSq;
              closest = t;
            }
          }
        }
      }
    }
    return closest;
  }

  // =====================================================================
  // 2. DATASET COMPLETO DEDUPLICADO (1 Nodo Por Especie)
  // =====================================================================
  /*__DATASET_PLACEHOLDER__*/

  // Helper para generar Texturas SVG de Especies
  function generateSpeciesSvgDataUri(taxonId, speciesName, cat) {
    const meta = CATEGORY_META[cat] || { color: '#84A48B' };
    const c = meta.color;
    const shortName = speciesName.length > 17 ? speciesName.substring(0, 15) + '..' : speciesName;
    const initial = speciesName.charAt(0).toUpperCase();

    const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
      <defs>
        <radialGradient id="g_${taxonId}" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${c}" stop-opacity="0.95"/>
          <stop offset="65%" stop-color="${c}" stop-opacity="0.65"/>
          <stop offset="100%" stop-color="${c}" stop-opacity="0.0"/>
        </radialGradient>
      </defs>
      <circle cx="64" cy="64" r="58" fill="url(#g_${taxonId})" />
      <circle cx="64" cy="64" r="44" fill="#0c121e" stroke="${c}" stroke-width="3.5" />
      <text x="64" y="60" font-family="'IBM Plex Mono', monospace, sans-serif" font-size="20" font-weight="900" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${initial}</text>
      <text x="64" y="80" font-family="'Inter', sans-serif" font-size="9" font-weight="700" fill="${c}" text-anchor="middle" dominant-baseline="middle">${taxonId}</text>
      <text x="64" y="116" font-family="'Inter', sans-serif" font-size="8.5" font-weight="600" fill="#ffffff" text-anchor="middle">${shortName}</text>
    </svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);
  }

  // =====================================================================
  // 3. CONSTRUCCIÓN DE LA RED BIÓTICA (eBird / iNaturalist / JBB)
  // =====================================================================
  function buildConscientiousBioticNetwork() {
    const nodes = buildFullDataset();
    rawNodes.length = 0;
    nodes.forEach(n => {
      n.active = true;
      n.degree = 0;
      rawNodes.push(n);
    });

    rawEdges.length = 0;
    edgeDetailsMap.clear();

    const floraNodes = rawNodes.filter(n => n.cat === 0);
    const avesNodes = rawNodes.filter(n => n.cat === 1);
    const mamifNodes = rawNodes.filter(n => n.cat === 2);
    const moluscNodes = rawNodes.filter(n => n.cat === 3);
    const anfibNodes = rawNodes.filter(n => n.cat === 4);
    const reptilNodes = rawNodes.filter(n => n.cat === 5);

    function addEdge(sourceId, targetId, relType, colorHex, desc) {
      if (sourceId === targetId) return;
      const s = rawNodes.find(n => n.id === sourceId);
      const t = rawNodes.find(n => n.id === targetId);
      if (!s || !t) return;

      const key = s.id < t.id ? `${s.id}_${t.id}` : `${t.id}_${s.id}`;
      if (!edgeDetailsMap.has(key)) {
        rawEdges.push({ source: s.id, target: t.id, rel: relType, color: colorHex });
        edgeDetailsMap.set(key, { rel: relType, color: colorHex, desc: desc || relType });
        s.degree = (s.degree || 0) + 1;
        t.degree = (t.degree || 0) + 1;
      }
    }

    // 1. Polinización (Colibríes & Insectos -> Flora)
    const colibries = avesNodes.filter(a => {
      const txt = (a.name + ' ' + a.sci + ' ' + a.role).toLowerCase();
      return txt.includes('colibri') || txt.includes('amazilia') || txt.includes('metallura') || txt.includes('lesbia') || txt.includes('colibrí') || txt.includes('nectar');
    });
    const floraFlores = floraNodes.filter(f => {
      const txt = (f.name + ' ' + f.sci + ' ' + f.role).toLowerCase();
      return txt.includes('chicala') || txt.includes('abutilon') || txt.includes('salvia') || txt.includes('passiflora') || txt.includes('cayeno') || txt.includes('calistemo') || txt.includes('botoncillo');
    });

    colibries.forEach(col => {
      floraFlores.forEach(fl => {
        addEdge(col.id, fl.id, "Polinización", 0xA386A9, "Polinización especializada de flores tubulares y nativas en Kennedy");
      });
    });

    // 2. Frugivoría y Dispersión de Semillas
    const frugivoros = avesNodes.filter(a => {
      const txt = (a.name + ' ' + a.sci + ' ' + a.role).toLowerCase();
      return txt.includes('mirla') || txt.includes('tángara') || txt.includes('tangara') || txt.includes('turdus') || txt.includes('elaenia') || txt.includes('fruto');
    });
    const floraFrutos = floraNodes.filter(f => {
      const txt = (f.name + ' ' + f.sci + ' ' + f.role).toLowerCase();
      return txt.includes('sauco') || txt.includes('cerezo') || txt.includes('caucho') || txt.includes('falso pimiento') || txt.includes('cucharo') || txt.includes('arrayan') || txt.includes('espino');
    });

    frugivoros.forEach(fr => {
      floraFrutos.forEach(fl => {
        addEdge(fr.id, fl.id, "Dispersión de semillas", 0xE69888, "Dispersión zoócora de semillas carnosas a lo largo de la ronda");
      });
    });

    // 3. Hábitat y Nidificación en Juncal
    const avesJuncal = avesNodes.filter(a => {
      const txt = (a.name + ' ' + a.sci + ' ' + a.role).toLowerCase();
      return txt.includes('tingua') || txt.includes('rallus') || txt.includes('gallinula') || txt.includes('porphyrio') || txt.includes('cucarachero') || txt.includes('pato') || txt.includes('ixobrychus') || txt.includes('zambullidor');
    });
    const floraJuncal = floraNodes.filter(f => {
      const txt = (f.name + ' ' + f.sci).toLowerCase();
      return txt.includes('junco') || txt.includes('totora') || txt.includes('enea') || txt.includes('buchon') || txt.includes('lenteja');
    });

    avesJuncal.forEach(aj => {
      floraJuncal.forEach(fj => {
        addEdge(aj.id, fj.id, "Nidificación en juncal", 0xF79E70, "Soporte estructural y refugio de nidos en macrófitas");
      });
    });

    // 4. Anidamiento en Dosel y Percha
    const rapacesGarzas = avesNodes.filter(a => {
      const txt = (a.name + ' ' + a.sci + ' ' + a.role).toLowerCase();
      return txt.includes('garza') || txt.includes('ardea') || txt.includes('egretta') || txt.includes('halcon') || txt.includes('cernicalo') || txt.includes('buho') || txt.includes('lechuza') || txt.includes('aguililla') || txt.includes('asio');
    });
    const floraDosel = floraNodes.filter(f => {
      const txt = (f.name + ' ' + f.sci).toLowerCase();
      return txt.includes('eucalipto') || txt.includes('aliso') || txt.includes('acacia') || txt.includes('urapan') || txt.includes('nogal') || txt.includes('caucho');
    });

    rapacesGarzas.forEach(rg => {
      floraDosel.slice(0, 4).forEach(fd => {
        addEdge(rg.id, fd.id, "Anidamiento en dosel", 0xD1A996, "Puntos de percha alta y anidación en arbolado mayor");
      });
    });

    // 5. Parasitismo de Nido
    const chamones = avesNodes.filter(a => a.name.toLowerCase().includes('chamón') || a.name.toLowerCase().includes('tordo') || a.sci.toLowerCase().includes('molothrus'));
    const copetones = avesNodes.filter(a => a.name.toLowerCase().includes('copetón') || a.name.toLowerCase().includes('gorrión') || a.sci.toLowerCase().includes('zonotrichia'));
    chamones.forEach(ch => {
      copetones.forEach(cp => {
        addEdge(ch.id, cp.id, "Parasitismo de nido", 0xC6B3CA, "Parasitismo reproductivo de puesta en nidos ajenos");
      });
    });

    // 6. Depredación y Control Trófico
    rapacesGarzas.forEach(rg => {
      mamifNodes.filter(m => m.name.toLowerCase().includes('ratón') || m.name.toLowerCase().includes('curí')).forEach(ro => {
        addEdge(rg.id, ro.id, "Depredación y control", 0xC96349, "Regulación poblacional de roedores");
      });
      anfibNodes.forEach(anf => {
        addEdge(rg.id, anf.id, "Depredación acuática", 0xC96349, "Consumo trófico de anfibios en espejo de agua");
      });
    });

    // 7. Mamíferos Herbívoros & Flora
    mamifNodes.filter(m => m.name.toLowerCase().includes('curí') || m.name.toLowerCase().includes('ardilla')).forEach(m => {
      floraNodes.slice(0, 5).forEach(f => {
        addEdge(m.id, f.id, "Herbivoría y ramoneo", 0x84A48B, "Consumo de brotes tiernos y semillas");
      });
    });

    // 8. Filtración & Macroinvertebrados
    moluscNodes.forEach(mol => {
      floraJuncal.forEach(fj => {
        addEdge(mol.id, fj.id, "Filtración y detritivoría", 0x6B9080, "Descomposición de biomasa vegetal sumergida y filtrado");
      });
    });

    recalculateDegreesAndSizes();
  }

  function recalculateDegreesAndSizes() {
    rawNodes.forEach(n => { n.degree = 0; });
    rawEdges.forEach(e => {
      const s = rawNodes.find(n => n.id === e.source);
      const t = rawNodes.find(n => n.id === e.target);
      if (s && t) {
        s.degree = (s.degree || 0) + 1;
        t.degree = (t.degree || 0) + 1;
      }
    });
  }

  // =====================================================================
  // 4. GENERACIÓN DE DISPERSIÓN, PARTICULAS Y GEOMETRÍA DE KENNEDY
  // =====================================================================
  function randomSwarmCluster(index) {
    const phi = Math.acos(2 * (Math.random()) - 1);
    const theta = 2 * Math.PI * Math.random();
    const r = Math.pow(Math.random(), 0.5) * (70 + (index % 5) * 14);
    return {
      x: r * Math.sin(phi) * Math.cos(theta),
      y: (Math.random() - 0.5) * 60 + Math.sin(index * 0.3) * 15,
      z: r * Math.sin(phi) * Math.sin(theta)
    };
  }

  const particleVertexShader = `
    uniform float uMorph;
    uniform float uTime;
    attribute vec3 aSwarmPos;
    attribute vec3 aTargetPos;
    attribute vec3 aColor;
    attribute float aSize;
    attribute float aPhase;
    attribute float aCat;

    varying vec3 vColor;
    varying float vAlpha;
    varying float vCat;

    void main() {
      vColor = aColor;
      vCat = aCat;
      float t = clamp(uMorph, 0.0, 1.0);
      float ease = smoothstep(0.0, 1.0, t);

      float explosionIntensity = sin(ease * 3.14159);
      vec3 blastDir = normalize(aSwarmPos + vec3(0.001, 0.001, 0.001));
      vec3 blastedSwarm = aSwarmPos + blastDir * (explosionIntensity * 48.0);

      vec3 pos = mix(blastedSwarm, aTargetPos, ease);

      if (ease < 0.15) {
        float wave = sin(uTime * 1.5 + aPhase) * 1.8;
        pos.y += wave;
      }

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      float distFactor = 300.0 / -mvPosition.z;
      
      float finalSize = aSize;
      if (ease > 0.6) {
        finalSize *= 1.25;
      }
      
      gl_PointSize = clamp(finalSize * distFactor, 1.0, 24.0);
      gl_Position = projectionMatrix * mvPosition;

      float d = length(mvPosition.xyz);
      vAlpha = clamp(1.0 - (d / 950.0), 0.25, 0.95);
    }
  `;

  const particleFragmentShader = `
    uniform float uMorph;
    varying vec3 vColor;
    varying float vAlpha;
    varying float vCat;

    void main() {
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord);
      if (dist > 0.5) discard;

      float edgeAlpha = smoothstep(0.5, 0.08, dist);
      gl_FragColor = vec4(vColor, vAlpha * edgeAlpha);
    }
  `;

  function createParticleSystem() {
    particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.Float32BufferAttribute(pTarget, 3));
    particleGeo.setAttribute("aTargetPos", new THREE.Float32BufferAttribute(pTarget, 3));
    particleGeo.setAttribute("aSwarmPos", new THREE.Float32BufferAttribute(pSwarm, 3));
    particleGeo.setAttribute("aColor", new THREE.Float32BufferAttribute(pColor, 3));
    particleGeo.setAttribute("aSize", new THREE.Float32BufferAttribute(pSize, 1));
    particleGeo.setAttribute("aPhase", new THREE.Float32BufferAttribute(pPhase, 1));
    particleGeo.setAttribute("aCat", new THREE.Float32BufferAttribute(pCat, 1));

    particleMat = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      uniforms: {
        uMorph: { value: 0.0 },
        uTime: { value: 0.0 }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    particleMesh = new THREE.Points(particleGeo, particleMat);
    sceneBaseGroup.add(particleMesh);
  }

  // Safe Loader for Kennedy 3D Buildings
  function loadBuildings() {
    const BUILDINGS_URL = "./assets/kennedy_buildings.json";
    return fetch(BUILDINGS_URL)
      .then(r => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(buildings => {
        const colBldgPrimary   = new THREE.Color(0x3A3836);
        const colBldgSecondary = new THREE.Color(0x484440);
        const colRoofHighlight = new THREE.Color(0x544E48);
        const rawBldList = Array.isArray(buildings) ? buildings : (buildings.buildings || []);
        const bldList = rawBldList.filter((_, idx) => idx % 8 === 0);

        bldList.forEach((b, bIdx) => {
          const pts = b.pts;
          if (!pts || pts.length < 3) return;

          const sPts = pts.map(p => toScene(p[0], p[1]));
          const h = (b.h || b.height || 10) * SCALE;
          const bldgCol = (bIdx % 2 === 0) ? colBldgPrimary : colBldgSecondary;

          for (let i = 0; i < sPts.length; i++) {
            const p = sPts[i];
            const steps = Math.max(3, Math.floor(h / 1.1));
            for (let step = 0; step <= steps; step++) {
              const y = (step / steps) * h;
              const sw = randomSwarmCluster(currentParticleIndex++);
              pTarget.push(p.x, y, p.z);
              pSwarm.push(sw.x, sw.y, sw.z);
              
              const isRoof = (step === steps);
              const c = isRoof ? colRoofHighlight : bldgCol;
              pColor.push(c.r, c.g, c.b);
              pSize.push(isRoof ? 1.3 : 1.1);
              pPhase.push(bIdx + step);
              pCat.push(2.0);
            }
          }
        });
      })
      .catch(err => {
        console.warn("Using procedural fallback geometry for Kennedy buildings:", err.message);
        for (let bx = -250; bx <= 250; bx += 25) {
          for (let bz = -250; bz <= 250; bz += 25) {
            if (Math.abs(bx) < 40 && Math.abs(bz) < 40) continue;
            const h = (6 + (Math.sin(bx * 0.1) * Math.cos(bz * 0.1) + 1.0) * 8) * SCALE;
            for (let step = 0; step <= 4; step++) {
              const y = (step / 4) * h;
              const sw = randomSwarmCluster(currentParticleIndex++);
              pTarget.push(bx, y, bz);
              pSwarm.push(sw.x, sw.y, sw.z);
              pColor.push(0.24, 0.23, 0.22);
              pSize.push(1.2);
              pPhase.push(bx + bz + step);
              pCat.push(2.0);
            }
          }
        }
      });
  }

  // Safe Loader for Kennedy 3D Real Trees with Spatial Grid Index
  function loadTrees() {
    const TREES_URL = "./assets/kennedy_trees_real.json";
    return fetch(TREES_URL)
      .then(r => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(trees => {
        const colTreeLush = new THREE.Color(0x2E8B57);
        const colTreeBright = new THREE.Color(0x48BB78);
        const colTrunk = new THREE.Color(0x161D26);
        const rawList = Array.isArray(trees) ? trees : (trees.trees || []);
        const list = rawList.filter((_, idx) => idx % 4 === 0);

        list.forEach((t, i) => {
          const [x, y, hMeters, specName, treeCode] = t;
          const p = toScene(x, y);
          const h = Math.max(0.7, (hMeters || 8) * SCALE);

          const sKey = matchSpeciesKey(specName);
          if (sKey && treeSpeciesClusters[sKey]) {
            treeSpeciesClusters[sKey].push({ x: p.x, y: h * 0.85, z: p.z, height: h });
          }

          const treeObj = {
            x: p.x,
            y: h * 0.85,
            z: p.z,
            height: hMeters || 6.5,
            name: specName || "Árbol Urbano",
            sciName: getTreeScientificName(specName),
            code: treeCode || ("ARB-" + i)
          };
          territoryTreesList.push(treeObj);
          addTreeToSpatialGrid(treeObj);

          const folCol = (i % 2 === 0) ? colTreeLush : colTreeBright;
          const crownY = h * 0.85;
          const swCrown = randomSwarmCluster(currentParticleIndex++);
          pTarget.push(p.x, crownY, p.z);
          pSwarm.push(swCrown.x, swCrown.y, swCrown.z);
          pColor.push(folCol.r, folCol.g, folCol.b);
          pSize.push(1.6);
          pPhase.push(i * 0.25);
          pCat.push(1.0);

          const subNodes = 4;
          const rad = h * 0.45;
          for (let k = 0; k < subNodes; k++) {
            const ang = (k / subNodes) * Math.PI * 2 + (i % 7);
            const sx = p.x + Math.cos(ang) * rad;
            const sz = p.z + Math.sin(ang) * rad;
            const sy = crownY + Math.sin(ang * 2) * (h * 0.18);
            const swNode = randomSwarmCluster(currentParticleIndex++);
            pTarget.push(sx, sy, sz);
            pSwarm.push(swNode.x, swNode.y, swNode.z);
            pColor.push(folCol.r * 1.1, folCol.g * 1.15, folCol.b * 0.95);
            pSize.push(1.4);
            pPhase.push(i + k * 0.5);
            pCat.push(1.0);
          }

          const swTrunk = randomSwarmCluster(currentParticleIndex++);
          pTarget.push(p.x, h * 0.25, p.z);
          pSwarm.push(swTrunk.x, swTrunk.y, swTrunk.z);
          pColor.push(colTrunk.r, colTrunk.g, colTrunk.b);
          pSize.push(1.2);
          pPhase.push(i * 0.1);
          pCat.push(1.0);
        });
      })
      .catch(err => {
        console.warn("Using procedural fallback for Kennedy trees:", err.message);
        for (let i = 0; i < 600; i++) {
          const ang = Math.random() * Math.PI * 2;
          const rad = 25 + Math.random() * 220;
          const tx = Math.cos(ang) * rad;
          const tz = Math.sin(ang) * rad;
          const treeObj = {
            x: tx, y: 3.5, z: tz,
            height: 7.2,
            name: "Sauco / Chicalá Sabanero",
            sciName: "Sambucus nigra / Tecoma stans",
            code: "ARB-SIGAU-" + i
          };
          territoryTreesList.push(treeObj);
          addTreeToSpatialGrid(treeObj);

          const sw = randomSwarmCluster(currentParticleIndex++);
          pTarget.push(tx, 3.5, tz);
          pSwarm.push(sw.x, sw.y, sw.z);
          pColor.push(0.18, 0.55, 0.34);
          pSize.push(1.6);
          pPhase.push(i);
          pCat.push(1.0);
        }
      });
  }

  // Safe Loader for Kennedy Water Bodies
  function loadWaterBodies() {
    const WATER_URL = "./assets/kennedy_water_bodies.json";
    return fetch(WATER_URL)
      .then(r => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(waterList => {
        const colWater = new THREE.Color(0x00B4D8);
        const rawWater = Array.isArray(waterList) ? waterList : (waterList.water || []);
        rawWater.forEach((w, wIdx) => {
          const pts = w.pts;
          if (!pts || pts.length < 3) return;
          const sPts = pts.map(p => toScene(p[0], p[1]));

          sPts.forEach((p, pIdx) => {
            const sw = randomSwarmCluster(currentParticleIndex++);
            pTarget.push(p.x, 0.15, p.z);
            pSwarm.push(sw.x, sw.y, sw.z);
            pColor.push(colWater.r, colWater.g, colWater.b);
            pSize.push(1.8);
            pPhase.push(wIdx * 10 + pIdx);
            pCat.push(0.0);
          });
        });
      })
      .catch(err => {
        console.warn("Using procedural fallback for Kennedy wetlands:", err.message);
        const colWater = new THREE.Color(0x00B4D8);
        for (let a = 0; a < Math.PI * 2; a += 0.05) {
          const wx = Math.cos(a) * 35 + 209;
          const wz = Math.sin(a) * 18 - 10;
          const sw = randomSwarmCluster(currentParticleIndex++);
          pTarget.push(wx, 0.15, wz);
          pSwarm.push(sw.x, sw.y, sw.z);
          pColor.push(colWater.r, colWater.g, colWater.b);
          pSize.push(1.8);
          pPhase.push(a * 10);
          pCat.push(0.0);
        }
      });
  }

  function matchSpeciesKey(name) {
    if (!name) return null;
    const n = name.toLowerCase();
    for (const key of treeSpeciesNames) {
      if (n.includes(key)) return key;
    }
    return null;
  }

  function getTreeScientificName(specName) {
    if (!specName) return "Especie vegetal urbana";
    const n = specName.toLowerCase();
    if (n.includes("chicala")) return "Tecoma stans (Bignoniaceae)";
    if (n.includes("sauco")) return "Sambucus nigra (Adoxaceae)";
    if (n.includes("caucho sabanero")) return "Ficus soatensis (Moraceae)";
    if (n.includes("caucho benjamin")) return "Ficus benjamina (Moraceae)";
    if (n.includes("falso pimiento")) return "Schinus molle (Anacardiaceae)";
    if (n.includes("jazmin del cabo")) return "Pittosporum undulatum (Pittosporaceae)";
    if (n.includes("holly")) return "Ilex cornuta (Aquifoliaceae)";
    if (n.includes("eugenia")) return "Eugenia myrtifolia (Myrtaceae)";
    if (n.includes("cayeno")) return "Hibiscus rosa-sinensis (Malvaceae)";
    if (n.includes("guayacan")) return "Lafoensia acuminata (Lythraceae)";
    if (n.includes("palma yuca")) return "Yucca gigantea (Asparagaceae)";
    if (n.includes("acacia")) return "Acacia decurrens / melanoxylon (Fabaceae)";
    if (n.includes("eucalipto")) return "Eucalyptus globulus (Myrtaceae)";
    if (n.includes("cipres") || n.includes("pino")) return "Cupressus lusitanica (Cupressaceae)";
    if (n.includes("urapan")) return "Fraxinus chinensis (Oleaceae)";
    if (n.includes("aliso")) return "Alnus acuminata (Betulaceae)";
    if (n.includes("cerezo")) return "Prunus serotina (Rosaceae)";
    if (n.includes("junco")) return "Schoenoplectus californicus (Cyperaceae)";
    if (n.includes("totora") || n.includes("enea")) return "Typha latifolia (Typhaceae)";
    return specName + " (Arbolado Urbano JBB)";
  }

  // =====================================================================
  // 5. INICIALIZACIÓN DE LA ESCENA THREE.JS & LAYOUT DE RED
  // =====================================================================
  function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x000000, 0.0018);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.5, 3000);
    camera.position.set(0, 35, 175);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxDistance = 850;
    controls.minDistance = 5;

    scene.add(sceneRoot);
    sceneRoot.add(sceneBaseGroup);
    sceneRoot.add(networkGroup);
    sceneRoot.add(territoryBeaconsGroup);
    sceneRoot.add(speciesConstellationGroup);
    sceneRoot.add(activeTreeIndicatorGroup);

    // Luces
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(50, 150, 50);
    scene.add(dirLight);

    setupLayouts();
    buildConscientiousBioticNetwork();
    createNodeSprites();
    createEdgeLinesMesh();
    buildTerritorySpeciesBeacons();

    // Iniciar render loop y ocultar velo de carga de inmediato
    hideVeil();

    // Cargar datos geográficos de Kennedy en segundo plano
    Promise.all([
      loadBuildings(),
      loadTrees(),
      loadWaterBodies()
    ]).then(() => {
      createParticleSystem();
      hideVeil();
    }).catch(err => {
      console.warn("Non-fatal loading warning:", err);
      createParticleSystem();
      hideVeil();
    });

    setupEventListeners();
    updateWaypointsBar();
    renderPieCharts();
  }

  // Setup Layouts de la Red
  function setupLayouts() {
    const count = rawNodes.length;
    const phi = Math.PI * (3 - Math.sqrt(5));

    rawNodes.forEach((n, i) => {
      const angle = (i / count) * Math.PI * 2;
      const radius = 58 + (n.cat * 7.5);
      n.circPos = new THREE.Vector3(
        Math.cos(angle) * radius,
        (Math.sin(i * 0.5) * 12) + (n.cat - 2.5) * 6,
        Math.sin(angle) * radius
      );

      const yFloor = (n.cat === 0 ? -28 : n.cat === 1 ? 24 : (n.cat - 2.5) * 10);
      const radF = 35 + Math.random() * 45;
      const angF = Math.random() * Math.PI * 2;
      n.forcePos = new THREE.Vector3(
        Math.cos(angF) * radF,
        yFloor + (Math.random() - 0.5) * 14,
        Math.sin(angF) * radF
      );

      const rowY = 36 - (n.cat * 14);
      const colsInCat = 20;
      const colX = ((i % colsInCat) - colsInCat / 2) * 6.5;
      const depthZ = (Math.floor(i / colsInCat) - 2) * 12;
      n.hierPos = new THREE.Vector3(colX, rowY, depthZ);

      const ySph = 1 - (i / (count - 1)) * 2;
      const radiusSph = Math.sqrt(1 - ySph * ySph) * 65;
      const theta = phi * i;
      n.sphPos = new THREE.Vector3(
        Math.cos(theta) * radiusSph,
        ySph * 65,
        Math.sin(theta) * radiusSph
      );
    });
  }

  function getNodeTargetPos(n) {
    if (opts.layout === 'circular') return n.circPos || n.forcePos;
    if (opts.layout === 'force') return n.forcePos;
    if (opts.layout === 'hierarchical') return n.hierPos || n.forcePos;
    if (opts.layout === 'spherical') return n.sphPos || n.circPos;
    return n.circPos || n.forcePos;
  }

  // =====================================================================
  // 6. CREACIÓN DE NODOS SPRITES Y LÍNEAS DE INTERACCIÓN
  // =====================================================================
  function createNodeSprites() {
    const textureLoader = new THREE.TextureLoader();

    rawNodes.forEach((n, idx) => {
      const svgUri = generateSpeciesSvgDataUri(n.id, n.name, n.cat);
      const tex = textureLoader.load(svgUri);
      tex.minFilter = THREE.LinearFilter;

      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.NormalBlending
      });

      const sprite = new THREE.Sprite(mat);
      const baseScale = 2.8 + Math.sqrt(n.degree || 1) * 0.4;
      sprite.scale.set(baseScale, baseScale, 1.0);

      const targetPos = getNodeTargetPos(n);
      sprite.position.copy(targetPos);
      sprite.userData = { taxonData: n, baseScale: baseScale, basePos: targetPos.clone(), index: idx };

      nodeSprites.push(sprite);
      networkGroup.add(sprite);
    });
  }

  function createEdgeLinesMesh() {
    const positions = [];
    const colors = [];

    rawEdges.forEach(e => {
      const s = rawNodes.find(n => n.id === e.source);
      const t = rawNodes.find(n => n.id === e.target);
      if (!s || !t) return;

      const sPos = getNodeTargetPos(s);
      const tPos = getNodeTargetPos(t);

      positions.push(sPos.x, sPos.y, sPos.z);
      positions.push(tPos.x, tPos.y, tPos.z);

      const c = new THREE.Color(e.color || 0x84A48B);
      colors.push(c.r, c.g, c.b);
      colors.push(c.r, c.g, c.b);
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    edgeMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    edgeLinesMesh = new THREE.LineSegments(geo, edgeMat);
    networkGroup.add(edgeLinesMesh);
  }

  // =====================================================================
  // 7. BALIZAS Y MARCADORES DE ESPECIES EN EL TERRITORIO 3D DE KENNEDY
  // =====================================================================
  function calculateTerritoryCoordinate(t, idx, total) {
    const cat = t.cat;

    if (cat === 4 || cat === "Anfibios") {
      const waterHubs = [
        { x: 209.56, z: -10.93, name: "Humedal El Burro — Espejo Central" },
        { x: 67.66, z: 118.17, name: "Humedal La Vaca — Sector Norte" },
        { x: 291.67, z: -79.30, name: "Humedal de Techo — Espejo de Agua" },
        { x: 166.64, z: 348.81, name: "Lago Parque Timiza" },
        { x: 58.92, z: -417.76, name: "Humedal Meandro del Say" },
        { x: 220.0, z: 15.0, name: "Humedal El Burro — Ribera Oriental" }
      ];
      const hub = waterHubs[idx % waterHubs.length];
      const ang = (idx / total) * Math.PI * 2;
      return {
        x: hub.x + Math.cos(ang) * (6 + (idx % 4) * 3),
        y: 2.2 + (idx % 3) * 0.8,
        z: hub.z + Math.sin(ang) * (6 + (idx % 4) * 3),
        locName: hub.name
      };
    }

    if (cat === 3 || cat === "Moluscos") {
      const littoralHubs = [
        { x: 200.0, z: -18.0, name: "Humedal El Burro — Zona Litoral" },
        { x: 74.0, z: 112.0, name: "Humedal La Vaca — Ribera Sur" },
        { x: 285.0, z: -72.0, name: "Humedal de Techo — Ecotono" },
        { x: 172.0, z: 340.0, name: "Parque Timiza — Orilla" }
      ];
      const hub = littoralHubs[idx % littoralHubs.length];
      return {
        x: hub.x + (Math.sin(idx * 1.5) * 8),
        y: 1.2,
        z: hub.z + (Math.cos(idx * 1.5) * 8),
        locName: hub.name
      };
    }

    if (cat === 0 || cat === "Flora") {
      const parkHubs = [
        { x: 215.0, z: -25.0, name: "Humedal El Burro — Ronda Hidráulica" },
        { x: 55.0, z: 105.0, name: "Humedal La Vaca — Corredor de Restauración" },
        { x: 310.0, z: -65.0, name: "Humedal de Techo — Zona de Preservación" },
        { x: 180.0, z: 320.0, name: "Parque Metropolitano Timiza" },
        { x: -120.0, z: -80.0, name: "Corredor Verde Av. Ciudad de Cali" },
        { x: -40.0, z: 210.0, name: "Parque Central Bavaria / Castilla" }
      ];
      const hub = parkHubs[idx % parkHubs.length];
      const ang = (idx / total) * Math.PI * 2;
      const rad = 12 + (idx % 8) * 6.5;
      return {
        x: hub.x + Math.cos(ang) * rad,
        y: 4.5 + (idx % 5) * 1.5,
        z: hub.z + Math.sin(ang) * rad,
        locName: hub.name
      };
    }

    if (cat === 1 || cat === "Aves") {
      const birdHubs = [
        { x: 209.56, z: -10.93, name: "Humedal El Burro — Dosel y Juncales" },
        { x: 67.66, z: 118.17, name: "Humedal La Vaca — Espejo y Pastizales" },
        { x: 291.67, z: -79.30, name: "Humedal de Techo — Dosel Alto" },
        { x: 166.64, z: 348.81, name: "Parque Timiza — Arbolado Mayor" },
        { x: 58.92, z: -417.76, name: "Humedal Meandro del Say" },
        { x: -80.0, z: 150.0, name: "Corredor Ecológico Kennedy Norte" },
        { x: 120.0, z: -220.0, name: "Corredor Ambiental Las Américas" }
      ];
      const hub = birdHubs[idx % birdHubs.length];
      const ang = (idx / total) * Math.PI * 2;
      const rad = 14 + (idx % 12) * 7.0;
      return {
        x: hub.x + Math.cos(ang) * rad,
        y: 8.0 + (idx % 6) * 2.5,
        z: hub.z + Math.sin(ang) * rad,
        locName: hub.name
      };
    }

    if (cat === 2 || cat === "Mamíferos") {
      const mamHubs = [
        { x: 205.0, z: 5.0, name: "Humedal El Burro — Zona de Pastizales" },
        { x: 60.0, z: 130.0, name: "Humedal La Vaca — Ribera Sur" },
        { x: 295.0, z: -90.0, name: "Humedal de Techo — Bosque de Ronda" },
        { x: 70.0, z: -400.0, name: "Meandro del Say — Ecotono Ripario" }
      ];
      const hub = mamHubs[idx % mamHubs.length];
      return {
        x: hub.x + (Math.sin(idx * 2) * 12),
        y: 3.5,
        z: hub.z + (Math.cos(idx * 2) * 12),
        locName: hub.name
      };
    }

    // Reptiles
    const repHubs = [
      { x: 225.0, z: -15.0, name: "Humedal El Burro — Taludes y Rondón" },
      { x: 75.0, z: 125.0, name: "Humedal La Vaca — Zonas Altas" },
      { x: 160.0, z: 330.0, name: "Parque Timiza — Zonas Rocosas y Troncos" }
    ];
    const hub = repHubs[idx % repHubs.length];
    return {
      x: hub.x + (Math.cos(idx * 3) * 10),
      y: 2.5,
      z: hub.z + (Math.sin(idx * 3) * 10),
      locName: hub.name
    };
  }

  function buildTerritorySpeciesBeacons() {
    const textureLoader = new THREE.TextureLoader();

    rawNodes.forEach((t, idx) => {
      const pos = calculateTerritoryCoordinate(t, idx, rawNodes.length);
      t.territoryPos = new THREE.Vector3(pos.x, pos.y, pos.z);
      t.loc = pos.locName || t.loc;

      const svgUri = generateSpeciesSvgDataUri(t.id, t.name, t.cat);
      const tex = textureLoader.load(svgUri);
      tex.minFilter = THREE.LinearFilter;

      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.NormalBlending
      });

      const sprite = new THREE.Sprite(mat);
      sprite.position.copy(t.territoryPos);
      const beaconScale = 3.6 + Math.sqrt(t.degree || 1) * 0.35;
      sprite.scale.set(beaconScale, beaconScale, 1.0);
      sprite.userData = { taxonData: t, baseScale: beaconScale };

      territoryBeacons.push(sprite);
      territoryBeaconsGroup.add(sprite);
    });

    territoryBeaconsGroup.visible = false;
  }

  // =====================================================================
  // 8. METAMORFOSIS FLUIDA Y WAYPOINTS DE KENNEDY
  // =====================================================================
  function setMorphValue(val, smooth = false) {
    targetMorph = Math.max(0, Math.min(1, val));
    if (!smooth) currentMorph = targetMorph;
    if (slider) slider.value = targetMorph;

    if (btnActionText) {
      btnActionText.textContent = targetMorph > 0.5 ? "VER RED BIÓTICA" : "MATERIALIZAR TERRITORIO";
    }
    if (labelSwarm) labelSwarm.classList.toggle("active-mode", targetMorph < 0.5);
    if (labelTerritory) labelTerritory.classList.toggle("active-mode", targetMorph >= 0.5);

    if (particleMat) particleMat.uniforms.uMorph.value = currentMorph;

    const netVisible = (1.0 - currentMorph) > 0.05;
    networkGroup.visible = netVisible;
    if (territoryBeaconsGroup) territoryBeaconsGroup.visible = currentMorph > 0.25;

    if (currentMorph < 0.01) {
      if (treeTooltip) treeTooltip.style.display = "none";
    }
  }

  function flyToCoordinate(pos, tgt, duration = 1500) {
    const startPos = camera.position.clone();
    const startTgt = controls.target.clone();
    const startTime = performance.now();

    function updateCamAnim(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

      camera.position.lerpVectors(startPos, pos, ease);
      controls.target.lerpVectors(startTgt, tgt, ease);
      controls.update();

      if (progress < 1) {
        requestAnimationFrame(updateCamAnim);
      }
    }
    requestAnimationFrame(updateCamAnim);
  }

  const WAYPOINTS = [
    { id: 'red', name: 'Red Biótica Completa', morph: 0.0, pos: new THREE.Vector3(0, 35, 175), tgt: new THREE.Vector3(0, 0, 0) },
    { id: 'burro', name: 'Humedal El Burro', morph: 1.0, pos: new THREE.Vector3(209.56, 45, 65), tgt: new THREE.Vector3(209.56, 2, -10.93) },
    { id: 'vaca', name: 'Humedal La Vaca', morph: 1.0, pos: new THREE.Vector3(67.66, 40, 195), tgt: new THREE.Vector3(67.66, 2, 118.17) },
    { id: 'techo', name: 'Humedal de Techo', morph: 1.0, pos: new THREE.Vector3(291.67, 45, 5), tgt: new THREE.Vector3(291.67, 2, -79.30) },
    { id: 'timiza', name: 'Parque Timiza', morph: 1.0, pos: new THREE.Vector3(166.64, 55, 430), tgt: new THREE.Vector3(166.64, 2, 348.81) },
    { id: 'say', name: 'Meandro del Say', morph: 1.0, pos: new THREE.Vector3(58.92, 45, -330), tgt: new THREE.Vector3(58.92, 2, -417.76) },
    { id: 'kennedy', name: 'Vista Axonométrica Kennedy', morph: 1.0, pos: new THREE.Vector3(150, 240, 280), tgt: new THREE.Vector3(150, 0, 0) }
  ];

  function updateWaypointsBar() {
    const bar = document.querySelector(".waypoints-bar");
    if (!bar) return;
    bar.innerHTML = "";

    WAYPOINTS.forEach(wp => {
      const btn = document.createElement("button");
      btn.className = "waypoint-btn";
      btn.textContent = wp.name;
      btn.addEventListener("click", () => {
        document.querySelectorAll(".waypoint-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        setMorphValue(wp.morph, true);
        flyToCoordinate(wp.pos, wp.tgt);
      });
      bar.appendChild(btn);
    });
  }

  // =====================================================================
  // 9. TOUR GUIADO DE ESPECIES Y FOCALIZACIÓN
  // =====================================================================
  function highlightTreeSpecies(speciesKey) {
    const cluster = treeSpeciesClusters[speciesKey];
    if (!cluster || cluster.length === 0) return;

    activeTreeIndicatorGroup.clear();
    const geom = new THREE.RingGeometry(1.2, 2.2, 32);
    geom.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0x48BB78, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });

    cluster.forEach(pt => {
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(pt.x, 0.4, pt.z);
      activeTreeIndicatorGroup.add(mesh);
    });
  }

  function clearTreeFocus() {
    activeTreeIndicatorGroup.clear();
  }

  function runSpeciesTourStep() {
    if (!tourActive) return;
    const keys = Object.keys(treeSpeciesClusters).filter(k => treeSpeciesClusters[k].length > 0);
    if (keys.length === 0) return;

    const key = keys[currentTourIndex % keys.length];
    currentTourIndex++;
    const cluster = treeSpeciesClusters[key];
    if (cluster && cluster.length > 0) {
      const first = cluster[0];
      highlightTreeSpecies(key);
      flyToCoordinate(
        new THREE.Vector3(first.x + 25, first.y + 25, first.z + 35),
        new THREE.Vector3(first.x, first.y, first.z),
        1800
      );
      if (activeTreeChip) {
        activeTreeChip.classList.add("show");
        if (activeTreeName) activeTreeName.textContent = key.toUpperCase();
        if (activeTreeCount) activeTreeCount.textContent = cluster.length + " árboles censados";
      }
    }
    tourTimer = setTimeout(runSpeciesTourStep, 5000);
  }

  function startSpeciesTour() {
    tourActive = true;
    currentTourIndex = 0;
    const btn = document.getElementById("btnTourSpecies");
    if (btn) btn.classList.add("active");
    runSpeciesTourStep();
  }

  function stopSpeciesTour() {
    tourActive = false;
    if (tourTimer) clearTimeout(tourTimer);
    clearTreeFocus();
    const btn = document.getElementById("btnTourSpecies");
    if (btn) btn.classList.remove("active");
    if (activeTreeChip) activeTreeChip.classList.remove("show");
  }

  // =====================================================================
  // 10. INTERACCIÓN (Hover Tooltip, Click Modal Pop-up & Audio)
  // =====================================================================
  function showNodeTooltip(e, t) {
    if (!territoryTooltip) return;
    const meta = CATEGORY_META[t.cat] || { name: "Biodiversidad", color: "#84A48B" };
    document.getElementById("ttSpeciesCat").textContent = meta.name;
    document.getElementById("ttSpeciesCat").style.color = meta.color;
    document.getElementById("ttSpeciesId").textContent = t.id;
    document.getElementById("ttSpeciesName").textContent = t.name;
    document.getElementById("ttSpeciesSci").textContent = t.sci || "";
    document.getElementById("ttSpeciesRole").textContent = t.role || "";
    document.getElementById("ttSpeciesLoc").textContent = t.loc || "Localidad Kennedy";

    const imgEl = document.getElementById("ttSpeciesImg");
    if (imgEl) {
      imgEl.src = t.img || generateSpeciesSvgDataUri(t.id, t.name, t.cat);
      imgEl.onerror = () => { imgEl.src = generateSpeciesSvgDataUri(t.id, t.name, t.cat); };
    }

    territoryTooltip.style.display = "block";
    territoryTooltip.style.left = Math.min(e.clientX + 16, window.innerWidth - 300) + "px";
    territoryTooltip.style.top = Math.min(e.clientY + 16, window.innerHeight - 200) + "px";
  }

  function hideNodeTooltip() {
    if (territoryTooltip) territoryTooltip.style.display = "none";
  }

  function showTreeTooltip(e, tree) {
    if (!treeTooltip) return;
    document.getElementById("treeCommonName").textContent = tree.name;
    document.getElementById("treeSciName").textContent = tree.sciName || "";
    document.getElementById("treeHeight").textContent = tree.height + " m";
    document.getElementById("treeCode").textContent = tree.code || "SIGAU";

    treeTooltip.style.display = "block";
    treeTooltip.style.left = Math.min(e.clientX + 16, window.innerWidth - 280) + "px";
    treeTooltip.style.top = Math.min(e.clientY + 16, window.innerHeight - 150) + "px";
  }

  function hideTreeTooltip() {
    if (treeTooltip) treeTooltip.style.display = "none";
  }

  function openTerritorySpeciesModal(t) {
    if (!territoryModal) return;
    const meta = CATEGORY_META[t.cat] || { name: "Biodiversidad", color: "#84A48B" };

    document.getElementById("modalSpeciesCat").textContent = meta.name;
    document.getElementById("modalSpeciesCat").style.color = meta.color;
    document.getElementById("modalSpeciesId").textContent = t.id;
    document.getElementById("modalSpeciesName").textContent = t.name;
    document.getElementById("modalSpeciesSci").textContent = t.sci || "";
    document.getElementById("modalSpeciesRole").textContent = t.role || "Especie de la estructura ecológica de Kennedy";
    document.getElementById("modalSpeciesStratum").textContent = t.stratum || "No determinado";
    document.getElementById("modalSpeciesLoc").textContent = t.loc || "Localidad Kennedy";
    document.getElementById("modalSpeciesAlert").textContent = t.alert || "Monitoreo Biodiversidad Kennedy";

    const inatLink = document.getElementById("modalInatLink");
    if (inatLink) {
      inatLink.href = t.inatUrl || ('https://colombia.inaturalist.org/search?q=' + encodeURIComponent(t.sci || t.name));
    }

    const ebirdLink = document.getElementById("modalEbirdLink");
    if (ebirdLink) {
      ebirdLink.href = 'https://ebird.org/species/' + encodeURIComponent((t.sci || t.name).toLowerCase().replace(/\\s+/g, '-'));
    }

    const imgEl = document.getElementById("modalSpeciesImg");
    if (imgEl) {
      imgEl.src = t.img || generateSpeciesSvgDataUri(t.id, t.name, t.cat);
      imgEl.onerror = () => { imgEl.src = generateSpeciesSvgDataUri(t.id, t.name, t.cat); };
    }

    territoryModal.style.display = "flex";
  }

  function setupEventListeners() {
    // Morph Slider
    if (slider) {
      slider.addEventListener("input", (e) => {
        setMorphValue(parseFloat(e.target.value), false);
      });
    }

    // Toggle Button
    if (btnToggle) {
      btnToggle.addEventListener("click", () => {
        const nextVal = currentMorph > 0.5 ? 0.0 : 1.0;
        setMorphValue(nextVal, true);
      });
    }

    // Tour Button
    const btnTourSpecies = document.getElementById("btnTourSpecies");
    if (btnTourSpecies) {
      btnTourSpecies.addEventListener("click", () => {
        if (tourActive) stopSpeciesTour();
        else startSpeciesTour();
      });
    }

    // Close Modal Button
    const btnCloseModal = document.getElementById("btnCloseTerritoryModal");
    if (btnCloseModal) {
      btnCloseModal.addEventListener("click", () => {
        if (territoryModal) territoryModal.style.display = "none";
      });
    }

    if (territoryModal) {
      territoryModal.addEventListener("click", (e) => {
        if (e.target === territoryModal) territoryModal.style.display = "none";
      });
    }

    // Pointer Move for Tooltips
    window.addEventListener("pointermove", (e) => {
      mouseVec.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseVec.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouseVec, camera);

      // 1. In Biotic Network mode: check node sprites
      if (currentMorph < 0.35) {
        hideTreeTooltip();
        const intersects = raycaster.intersectObjects(nodeSprites, false);
        if (intersects.length > 0) {
          const hit = intersects[0].object;
          const t = hit.userData.taxonData;
          if (t) {
            showNodeTooltip(e, t);
            document.body.style.cursor = "pointer";
            return;
          }
        } else {
          hideNodeTooltip();
          document.body.style.cursor = "default";
        }
        return;
      }

      // 2. In 3D Territory mode: check species beacons first
      const beaconHits = raycaster.intersectObjects(territoryBeacons, false);
      if (beaconHits.length > 0) {
        hideTreeTooltip();
        const hit = beaconHits[0].object;
        const t = hit.userData.taxonData;
        if (t) {
          showNodeTooltip(e, t);
          document.body.style.cursor = "pointer";
          return;
        }
      }

      // 3. In 3D Territory mode: check trees on ground plane
      hideNodeTooltip();
      if (raycaster.ray.intersectPlane(groundPlane, groundIntersection)) {
        const closestTree = findClosestTree(groundIntersection.x, groundIntersection.z, 3.8);
        if (closestTree) {
          showTreeTooltip(e, closestTree);
          document.body.style.cursor = "pointer";
          return;
        }
      }

      hideTreeTooltip();
      document.body.style.cursor = "default";
    });

    // Pointer Down for Pop-up Modals
    window.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".glass-panel") || e.target.closest("#territorySpeciesModal") || e.target.closest("#pieChartsModalOverlay") || e.target.closest(".welcome-modal") || e.target.closest(".bottom-experience-bar") || e.target.closest(".waypoints-bar") || e.target.closest("#activeTreeChip")) return;

      mouseVec.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseVec.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouseVec, camera);

      if (currentMorph < 0.35) {
        const intersects = raycaster.intersectObjects(nodeSprites, false);
        if (intersects.length > 0) {
          const t = intersects[0].object.userData.taxonData;
          if (t) openTerritorySpeciesModal(t);
        }
      } else {
        const beaconHits = raycaster.intersectObjects(territoryBeacons, false);
        if (beaconHits.length > 0) {
          const t = beaconHits[0].object.userData.taxonData;
          if (t) openTerritorySpeciesModal(t);
        }
      }
    });

    // Category Toggles
    document.querySelectorAll(".cat-toggle").forEach(btn => {
      btn.addEventListener("click", () => {
        const cat = parseInt(btn.getAttribute("data-cat"));
        opts.activeCategories[cat] = !opts.activeCategories[cat];
        btn.classList.toggle("active", opts.activeCategories[cat]);

        nodeSprites.forEach(sp => {
          if (sp.userData.taxonData.cat === cat) {
            sp.userData.taxonData.active = opts.activeCategories[cat];
          }
        });
        territoryBeacons.forEach(sp => {
          if (sp.userData.taxonData.cat === cat) {
            sp.visible = opts.activeCategories[cat];
          }
        });
      });
    });

    // Window Resize
    window.addEventListener("resize", () => {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  // =====================================================================
  // 11. BUCLE DE ANIMACIÓN VIVA (Red Respirando y Oscilaciones Armónicas)
  // =====================================================================
  function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    // Metamorfosis Suave
    if (Math.abs(currentMorph - targetMorph) > 0.001) {
      currentMorph += (targetMorph - currentMorph) * 0.08;
      if (slider) slider.value = currentMorph;
      if (particleMat) particleMat.uniforms.uMorph.value = currentMorph;
      networkGroup.visible = (1.0 - currentMorph) > 0.05;
      if (territoryBeaconsGroup) territoryBeaconsGroup.visible = currentMorph > 0.25;
    }

    if (particleMat) {
      particleMat.uniforms.uTime.value = elapsedTime;
    }

    // Respiración Orgánica y Ondulación Dinámica de la Red Biótica
    if (currentMorph < 0.6) {
      const netMorphFactor = 1.0 - currentMorph;
      nodeSprites.forEach((sp, idx) => {
        const n = sp.userData.taxonData;
        if (!n || !n.active) {
          sp.visible = false;
          return;
        }
        sp.visible = true;

        // Pulso Armónico de Respiración
        const breathe = 1.0 + Math.sin(elapsedTime * 2.4 + idx * 0.2) * 0.14 + Math.cos(elapsedTime * 1.2 + (n.degree || 1) * 0.3) * 0.06;
        const dynamicScale = sp.userData.baseScale * breathe;
        sp.scale.set(dynamicScale, dynamicScale, 1.0);

        // Ondulación Flotante en el Espacio
        if (sp.userData.basePos) {
          const waveY = Math.sin(elapsedTime * 1.5 + idx * 0.35) * 1.2 * netMorphFactor;
          const waveX = Math.cos(elapsedTime * 1.0 + idx * 0.25) * 0.8 * netMorphFactor;
          sp.position.set(
            sp.userData.basePos.x + waveX,
            sp.userData.basePos.y + waveY,
            sp.userData.basePos.z
          );
        }

        if (camera) sp.quaternion.copy(camera.quaternion);
      });

      // Respiración Luminous Glow de las Líneas de Interacción
      if (edgeMat) {
        edgeMat.opacity = (0.28 + Math.sin(elapsedTime * 3.2) * 0.12) * netMorphFactor;
      }

      // Rotación Suave y Órbitas Vivas
      if (opts.autoRotate) {
        networkGroup.rotation.y = elapsedTime * 0.025;
        networkGroup.rotation.x = Math.sin(elapsedTime * 0.3) * 0.035;
      }
    } else {
      networkGroup.rotation.set(0, 0, 0);
    }

    // Balizas Territoriales
    if (territoryBeaconsGroup && territoryBeaconsGroup.visible && camera) {
      territoryBeacons.forEach(sp => {
        sp.quaternion.copy(camera.quaternion);
      });
    }

    if (controls) controls.update();
    if (renderer && scene && camera) renderer.render(scene, camera);
  }

  // =====================================================================
  // 12. GENERACIÓN Y RENDERIZADO DE TORTAS (PIE CHARTS DE EVIDENCIA)
  // =====================================================================
  function renderPieCharts() {
    function drawSvgPie(svgId, slices) {
      const svg = document.getElementById(svgId);
      if (!svg) return;
      svg.innerHTML = "";

      let cumulativePercent = 0;
      const cx = 80, cy = 80, r = 68;

      function getCoordinatesForPercent(percent) {
        const x = cx + r * Math.cos(2 * Math.PI * percent - Math.PI / 2);
        const y = cy + r * Math.sin(2 * Math.PI * percent - Math.PI / 2);
        return [x, y];
      }

      slices.forEach(slice => {
        const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
        cumulativePercent += slice.percent;
        const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
        const largeArcFlag = slice.percent > 0.5 ? 1 : 0;

        const pathData = [
          `M ${cx} ${cy}`,
          `L ${startX} ${startY}`,
          `A ${r} ${r} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
          'Z'
        ].join(' ');

        const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathEl.setAttribute('d', pathData);
        pathEl.setAttribute('fill', slice.color);
        pathEl.setAttribute('stroke', '#06090f');
        pathEl.setAttribute('stroke-width', '2.5');
        pathEl.style.transition = 'all 0.3s ease';
        pathEl.style.cursor = 'pointer';

        pathEl.addEventListener('mouseenter', () => {
          pathEl.setAttribute('stroke', '#ffffff');
          pathEl.setAttribute('stroke-width', '4');
        });
        pathEl.addEventListener('mouseleave', () => {
          pathEl.setAttribute('stroke', '#06090f');
          pathEl.setAttribute('stroke-width', '2.5');
        });

        svg.appendChild(pathEl);
      });

      // Donut Center Hole
      const innerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      innerCircle.setAttribute('cx', cx);
      innerCircle.setAttribute('cy', cy);
      innerCircle.setAttribute('r', '32');
      innerCircle.setAttribute('fill', '#06090f');
      innerCircle.setAttribute('stroke', 'rgba(255,255,255,0.12)');
      innerCircle.setAttribute('stroke-width', '1.5');
      svg.appendChild(innerCircle);
    }

    // Torta A: Interacciones Bióticas
    drawSvgPie('pieSvgA', [
      { percent: 0.3918, color: '#A386A9', name: 'Polinización' },
      { percent: 0.3158, color: '#84A48B', name: 'Herbivoría Parcial' },
      { percent: 0.0744, color: '#F79E70', name: 'Nidificación y Refugio' },
      { percent: 0.0488, color: '#E69888', name: 'Dispersión de Semillas' },
      { percent: 0.1692, color: '#C96349', name: 'Parasitismo / Depredación' }
    ]);

    // Torta B: Reinos Taxonómicos
    drawSvgPie('pieSvgB', [
      { percent: 0.595, color: '#84A48B', name: 'Plantae (Flora & Arbolado)' },
      { percent: 0.304, color: '#F79E70', name: 'Animalia (Aves & Fauna)' },
      { percent: 0.070, color: '#A386A9', name: 'Fungi (Micorrizas)' },
      { percent: 0.031, color: '#E7C878', name: 'Bacterias y Protistas' }
    ]);

    // Torta C: Fuentes de Evidencia
    drawSvgPie('pieSvgC', [
      { percent: 0.361, color: '#84A48B', name: 'Artículos Científicos & PEDH' },
      { percent: 0.258, color: '#E7C878', name: 'iNaturalist Kennedy' },
      { percent: 0.234, color: '#A386A9', name: 'Censo Forestal SIGAU / JBB' },
      { percent: 0.097, color: '#F79E70', name: 'eBird Hotspots' },
      { percent: 0.050, color: '#6B9080', name: 'GBIF Biodiversidad' }
    ]);
  }

  // Global Helpers for UI
  window.openWelcomeModal = () => {
    const modal = document.getElementById('welcomeModalOverlay');
    if (modal) modal.style.display = 'flex';
  };

  window.closeWelcomeModal = () => {
    const modal = document.getElementById('welcomeModalOverlay');
    if (modal) modal.style.display = 'none';
  };

  window.openPieChartsModal = () => {
    const modal = document.getElementById('pieChartsModalOverlay');
    if (modal) {
      modal.style.display = 'flex';
      renderPieCharts();
    }
  };

  window.closePieChartsModal = () => {
    const modal = document.getElementById('pieChartsModalOverlay');
    if (modal) modal.style.display = 'none';
  };

  window.setRedLayout = (layoutName) => {
    opts.layout = layoutName;
    document.querySelectorAll('.layout-pill').forEach(p => p.classList.remove('active'));
    const btn = document.getElementById('btnLayout_' + layoutName);
    if (btn) btn.classList.add('active');

    rawNodes.forEach((n, idx) => {
      const targetPos = getNodeTargetPos(n);
      if (nodeSprites[idx]) {
        nodeSprites[idx].userData.basePos = targetPos.clone();
        nodeSprites[idx].position.copy(targetPos);
      }
    });
    createEdgeLinesMesh();
  };

  // Arranque Seguro Inmediato
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initScene);
  } else {
    initScene();
  }

})();
""")

with open("tools/engine_template.js", "r", encoding="utf-8") as f:
    template = f.read()

final_js = template.replace("/*__DATASET_PLACEHOLDER__*/", js_dataset_string)

with open("modulo-11-garden.js", "w", encoding="utf-8") as f:
    f.write(final_js)

print("Master modulo-11-garden.js compiled with organic breathing, instant veil hide, and evidence pie charts.")
