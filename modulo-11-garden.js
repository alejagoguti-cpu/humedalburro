// modulo-11-garden.js — Sistema Socioecológico de Kennedy: Red Biótica & Territorio 3D
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

  const camInspectorBox = document.getElementById("camInspectorBox");
  const camPosVal = document.getElementById("camPosVal");
  const camTgtVal = document.getElementById("camTgtVal");

  const activeTreeChip = document.getElementById("activeTreeChip");
  const activeTreeName = document.getElementById("activeTreeName");
  const activeTreeCount = document.getElementById("activeTreeCount");

  const territoryTooltip = document.getElementById("territorySpeciesTooltip");
  const territoryModal = document.getElementById("territorySpeciesModal");
  const treeTooltip = document.getElementById("treeHoverTooltip");

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

  let selectedNode = null;
  let hoveredNode = null;
  let soundActive = false;
  let audioCtx = null;
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
  function buildFullDataset() {
  const nodes = [];

  // 1. FLORA URBANA Y DE HUMEDAL (Censo JBB / SIGAU)
  const floraBase = [
    ["FLO-001", "Chicala, chirlobirlo, flor amarillo / Chicala rosado", "Tecoma stans", "Arbolito nativo / Productor de néctar y polinizadores", "Estrato subdosel", 4364],
    ["FLO-002", "Jazmin del cabo, laurel huesito", "Pittosporum undulatum", "Árbol introducido / Follaje denso para nidificación", "Estrato dosel medio", 3132],
    ["FLO-003", "Sauco", "Sambucus nigra", "Árbol subandino / Productor de frutos para aves frugívoras", "Estrato dosel medio", 3016],
    ["FLO-004", "Holly liso", "Ilex cornuta", "Arbusto urbano / Refugio de paseriformes", "Estrato arbustivo", 2677],
    ["FLO-005", "Falso pimiento", "Schinus molle", "Árbol xerofítico / Frutos para aves y fijación de suelo", "Estrato dosel medio", 2628],
    ["FLO-006", "Eugenia", "Eugenia myrtifolia", "Arbusto / Frutos y néctar para polinizadores", "Estrato subdosel", 2529],
    ["FLO-007", "Cayeno", "Hibiscus rosa-sinensis", "Arbusto floral / Néctar para colibríes", "Estrato arbustivo", 2072],
    ["FLO-008", "Guayacan de Manizales", "Lafoensia acuminata", "Árbol nativo andino / Néctar y semillas", "Estrato dosel medio", 1959],
    ["FLO-009", "Palma yuca, palmiche", "Yucca gigantea", "Planta arborescente / Refugio de invertebrados", "Estrato subdosel", 1767],
    ["FLO-010", "Jazmin de la china", "Jasminum mesnyi", "Arbusto trepador / Floración y cobertura", "Estrato arbustivo", 1747],
    ["FLO-011", "Acacia japonesa", "Ligustrum lucidum", "Árbol de dosel / Sombra y frutos otoñales", "Estrato dosel", 1651],
    ["FLO-012", "Eucalipto com�n / Eucalipto de flor, eucalipto lavabotella / Eucalipto pomarroso / Eucalipto plateado", "Eucalyptus globulus", "Árbol exótico de gran porte / Percha para rapaces y garzas", "Estrato dosel emergente", 2450],
    ["FLO-013", "Cipr�s, Pino cipr�s, Pino", "Cipr�s, Pino cipr�s, Pino", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 1513],
    ["FLO-014", "Urap�n, Fresno", "Urap�n, Fresno", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 1499],
    ["FLO-015", "Acacia baracatinga, acacia sabanera, acacia nigra", "Mimosa scabrella", "Leguminosa / Fijación de nitrógeno y polinización", "Estrato dosel medio", 1352],
    ["FLO-016", "Caucho sabanero", "Ficus soatensis", "Árbol nativo clave / Frutos para murciélagos y mirlas", "Estrato dosel alto", 1327],
    ["FLO-017", "Caucho benjamin", "Ficus benjamina", "Árbol urbano / Estructura de dosel y sombra", "Estrato dosel alto", 1322],
    ["FLO-018", "Caballero de la noche, Jazmin, Dama de noche", "Cestrum nocturnum", "Arbusto / Fragancia nocturna para polillas y murciélagos", "Estrato arbustivo", 1583],
    ["FLO-019", "Acacia negra, gris", "Acacia decurrens", "Leguminosa / Cobertura y néctar", "Estrato dosel medio", 1220],
    ["FLO-020", "Hayuelo", "Dodonaea viscosa", "Arbusto nativo / Control de erosión y semillas", "Estrato arbustivo", 1206],
    ["FLO-021", "Aliso, fresno, chaquiro", "Alnus acuminata", "Árbol nativo ripario / Fijación biológica de nitrógeno en ribera", "Estrato dosel medio", 1036],
    ["FLO-022", "Cerezo / Cerezo, capuli / Cerezo, ciruelo", "Prunus serotina", "Árbol nativo / Fruto silvestre clave para avifauna", "Estrato dosel medio", 1375],
    ["FLO-023", "Calistemo lloron", "Callistemon speciosus", "Arbolito ornamental / Flores rojas para colibríes", "Estrato subdosel", 965],
    ["FLO-024", "Araucaria / Araucaria crespa", "Araucaria excelsa", "Conífera monumental / Percha alta", "Estrato dosel emergente", 1001],
    ["FLO-025", "Pino libro", "Platycladus orientalis", "Conífera ornamental / Refugio denso", "Estrato subdosel", 823],
    ["FLO-026", "Mangle de tierra fria", "Escallonia paniculata", "Árbol nativo andino / Protección de microcuencas", "Estrato dosel medio", 807],
    ["FLO-027", "Cajeto, garagay, urapo / Cajeto sp / Cajeto de Bogota", "Citharexylum subflavescens", "Árbol nativo / Refugio y percha de avifauna", "Estrato dosel", 1420],
    ["FLO-028", "Corono", "Xylosma spiculifera", "Arbusto espinoso nativo / Nidos seguros para copetones", "Estrato arbustivo", 736],
    ["FLO-029", "Arrayan blanco", "Myrcianthes leucoxyla", "Árbol nativo de bosque altoandino / Frutos carnosos", "Estrato dosel", 719],
    ["FLO-030", "Liquidambar, estoraque", "Liquidambar styraciflua", "Árbol caducifolio / Dosel urbano", "Estrato dosel alto", 697],
    ["FLO-031", "Chilco / Chilco de p�ramo", "Baccharis latifolia", "Arbusto nativo pionero / Estabilización de riberas", "Estrato arbustivo", 705],
    ["FLO-032", "Ligustrum", "Ligustrum", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 656],
    ["FLO-033", "Abutilon rojo y amarillo (Farolito) / Abutilon blanco / Abutilon  peque�o / Abutilon quesito", "Abutilon striatum", "Arbusto floral nativo / Néctar para colibríes e insectos", "Estrato arbustivo", 884],
    ["FLO-034", "Cucharo", "Myrsine coriacea", "Árbol nativo pionero / Fruto de alta importancia ecológica", "Estrato dosel medio", 584],
    ["FLO-035", "Roble / Roble australiano", "Quercus humboldtii", "Árbol nativo clímax / Bellotas y hábitat de epífitas", "Estrato dosel alto", 896],
    ["FLO-036", "Durazno comun", "Durazno comun", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 571],
    ["FLO-037", "Nogal, cedro nogal, cedro negro", "Juglans neotropica", "Árbol emblemático de Bogotá / Madera fina y semillas", "Estrato dosel alto", 550],
    ["FLO-038", "Sauce lloron", "Salix humboldtiana", "Árbol nativo ripario / Protección de orillas y humedal", "Estrato dosel ripario", 525],
    ["FLO-039", "Cedro, cedro andino, cedro clavel", "Cedrela montana", "Árbol nativo / Refugio de avifauna andina", "Estrato dosel alto", 466],
    ["FLO-040", "Espino, Garbancillo / Holly espinoso", "Duranta erecta", "Arbusto nativo / Frutos dorados para aves", "Estrato arbustivo", 661],
    ["FLO-041", "Palma fenix", "Phoenix canariensis", "Palma monumental / Nidificación de tórtolas", "Estrato dosel alto", 424],
    ["FLO-042", "Schefflera, Pategallina hojipeque�a / Schefflera, Pategallina hojigrande", "Schefflera actinophylla", "Árbol de follaje umbelado / Néctar", "Estrato dosel medio", 832],
    ["FLO-043", "Acacia morada", "Acacia morada", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 385],
    ["FLO-044", "Gaque", "Clusia multiflora", "Árbol nativo / Resina y frutos para fauna", "Estrato dosel medio", 374],
    ["FLO-045", "Ciro", "Baccharis bogotensis", "Arbusto nativo / Cobertura y néctar", "Estrato arbustivo", 372],
    ["FLO-046", "Duraznillo, velitas", "Duraznillo, velitas", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 364],
    ["FLO-047", "Caucho tequendama", "Caucho tequendama", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 348],
    ["FLO-048", "Mano de oso", "Mano de oso", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 344],
    ["FLO-049", "Alcaparro enano", "Alcaparro enano", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 343],
    ["FLO-050", "Lavanda", "Lavanda", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 325],
    ["FLO-051", "Sietecueros nazareno / Sietecueros real / Sietecueros plateado", "Tibouchina lepidota", "Sietecueros / Floración morada y polinización", "Estrato dosel medio", 564],
    ["FLO-052", "Pino romeron", "Pino romeron", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 298],
    ["FLO-053", "Dividivi de tierra fria", "Dividivi de tierra fria", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 297],
    ["FLO-054", "Alcaparro doble", "Alcaparro doble", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 266],
    ["FLO-055", "Feijoa", "Feijoa", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 257],
    ["FLO-056", "Palma de yuca, Palma de bayoneta", "Palma de yuca, Palma de bayoneta", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 256],
    ["FLO-057", "Chiripique", "Chiripique", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 252],
    ["FLO-058", "Pino p�tula", "Pino p�tula", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 249],
    ["FLO-059", "Naranjo", "Naranjo", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 248],
    ["FLO-060", "Sangregao, drago, croto", "Sangregao, drago, croto", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 216],
    ["FLO-061", "Caucho", "Caucho", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 211],
    ["FLO-062", "Caucho de la india, caucho", "Caucho de la india, caucho", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 210],
    ["FLO-063", "Palma payanesa", "Palma payanesa", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 200],
    ["FLO-064", "Garbancillo", "Garbancillo", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 198],
    ["FLO-065", "Milflores", "Milflores", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 188],
    ["FLO-066", "Higuerillo", "Higuerillo", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 187],
    ["FLO-067", "Laurel de cera (hoja peque�a)", "Laurel de cera (hoja peque�a)", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 187],
    ["FLO-068", "Aguacate", "Aguacate", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 177],
    ["FLO-069", "Poligala", "Poligala", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 169],
    ["FLO-070", "Brevo", "Brevo", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 168],
    ["FLO-071", "Palma Alejandra", "Palma Alejandra", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 158],
    ["FLO-072", "Cipr�s enano", "Cipr�s enano", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 145],
    ["FLO-073", "Cariseco", "Cariseco", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 144],
    ["FLO-074", "Tabaquillo", "Tabaquillo", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 141],
    ["FLO-075", "Pino colombiano, pino de pacho, pino romer�n", "Pino colombiano, pino de pacho, pino romer�n", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 132],
    ["FLO-076", "Pajarito", "Pajarito", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 129],
    ["FLO-077", "Palma de cera, Palma blanca", "Palma de cera, Palma blanca", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 127],
    ["FLO-078", "Garrocho", "Garrocho", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 126],
    ["FLO-079", "Sombrilla japonesa", "Sombrilla japonesa", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 125],
    ["FLO-080", "Pino candelabro", "Pino candelabro", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 123],
    ["FLO-081", "Arrayan negro", "Arrayan negro", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 122],
    ["FLO-082", "Sangregado", "Sangregado", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 121],
    ["FLO-083", "Tibar, pagoda o rodamonte", "Tibar, pagoda o rodamonte", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 120],
    ["FLO-084", "Cipres Japones, criptomeria / Cipres italiano", "Cupressus lusitanica", "Conífera de dosel / Refugio contra el viento y anidación", "Estrato dosel alto", 274],
    ["FLO-085", "Mandarina", "Mandarina", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 120],
    ["FLO-086", "Tinto", "Tinto", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 116],
    ["FLO-087", "Lupinus", "Lupinus", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 116],
    ["FLO-088", "Mortillo", "Mortillo", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 109],
    ["FLO-089", "Tibar", "Tibar", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 107],
    ["FLO-090", "Nispero", "Nispero", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 100],
    ["FLO-091", "Palma coquito", "Palma coquito", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 97],
    ["FLO-092", "Guayabo", "Guayabo", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 96],
    ["FLO-093", "Guamo santafere�o", "Guamo santafere�o", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 94],
    ["FLO-094", "Raque, San juanito", "Raque, San juanito", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 89],
    ["FLO-095", "Laurel de cera", "Laurel de cera", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 87],
    ["FLO-096", "Abelia", "Abelia", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 86],
    ["FLO-097", "Fucsia arbustiva", "Fucsia arbustiva", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 82],
    ["FLO-098", "Arboloco", "Arboloco", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 81],
    ["FLO-099", "Palma roebeleni", "Palma roebeleni", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 80],
    ["FLO-100", "Mermelada", "Mermelada", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 74],
    ["FLO-101", "Cedrillo, Yuco", "Cedrillo, Yuco", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 72],
    ["FLO-102", "Endrino", "Endrino", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 71],
    ["FLO-103", "Acebo", "Acebo", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 70],
    ["FLO-104", "Chocho", "Chocho", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 67],
    ["FLO-105", "Magnolio", "Magnolio", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 63],
    ["FLO-106", "Baeckea", "Baeckea", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 63],
    ["FLO-107", "Acacia", "Acacia", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 61],
    ["FLO-108", "Ciruelo", "Ciruelo", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 60],
    ["FLO-109", "Cariseco, Tres hojas", "Cariseco, Tres hojas", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 58],
    ["FLO-110", "Borrachero blanco", "Borrachero blanco", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 58],
    ["FLO-111", "Callistemo", "Callistemo", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 58],
    ["FLO-112", "Tibar, tobo, rodamonte", "Tibar, tobo, rodamonte", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 57],
    ["FLO-113", "Agracejo", "Agracejo", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 54],
    ["FLO-114", "Limon", "Limon", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 53],
    ["FLO-115", "Carbonero", "Carbonero", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 53],
    ["FLO-116", "Tuno esmeraldo", "Miconia squamulosa", "Arbusto nativo / Frutos para tangaras y mirlas", "Estrato arbustivo", 53],
    ["FLO-117", "Acacia de jardin", "Acacia de jardin", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 51],
    ["FLO-118", "Gurrubo", "Gurrubo", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 49],
    ["FLO-119", "Arrayan", "Arrayan", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 47],
    ["FLO-120", "Rama negra", "Rama negra", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 47],
    ["FLO-121", "Papayuelo", "Papayuelo", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 46],
    ["FLO-122", "Amarrabollo", "Amarrabollo", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 46],
    ["FLO-123", "Curapin, Campanilla", "Curapin, Campanilla", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 46],
    ["FLO-124", "Palma cinta", "Palma cinta", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 45],
    ["FLO-125", "Azara", "Azara", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 45],
    ["FLO-126", "Ayer, hoy y ma�ana", "Ayer, hoy y ma�ana", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 43],
    ["FLO-127", "Pino colombiano, chaquiro", "Pino colombiano, chaquiro", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 42],
    ["FLO-128", "Guamo", "Guamo", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 42],
    ["FLO-129", "Venturosa", "Venturosa", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 41],
    ["FLO-130", "Arbol de Te", "Arbol de Te", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 40],
    ["FLO-131", "Tibar, Rodamonte, Pagoda", "Tibar, Rodamonte, Pagoda", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 39],
    ["FLO-132", "Grevilea", "Grevilea", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 36],
    ["FLO-133", "Citrus spp.", "Citrus spp.", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 33],
    ["FLO-134", "Mirto", "Mirto", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 33],
    ["FLO-135", "Palma de cera", "Palma de cera", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 32],
    ["FLO-136", "Trompeto", "Trompeto", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 31],
    ["FLO-137", "Metrosideros", "Metrosideros", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 31],
    ["FLO-138", "Fucsia boliviana", "Fucsia boliviana", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 28],
    ["FLO-139", "Palma washingtoniana", "Palma washingtoniana", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 27],
    ["FLO-140", "Arbol de hierro", "Arbol de hierro", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 27],
    ["FLO-141", "Yarumo", "Yarumo", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 27],
    ["FLO-142", "Mimbre", "Mimbre", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 25],
    ["FLO-143", "Cucubo", "Cucubo", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 24],
    ["FLO-144", "Azuceno, enebro", "Azuceno, enebro", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 24],
    ["FLO-145", "Raphiolepys", "Raphiolepys", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 23],
    ["FLO-146", "Carbonero rojo", "Carbonero rojo", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 22],
    ["FLO-147", "Platano", "Platano", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 22],
    ["FLO-148", "Arbol de corcho", "Arbol de corcho", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 21],
    ["FLO-149", "Siete Cueros peludo", "Siete Cueros peludo", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 21],
    ["FLO-150", "Palma de cera, Palma de ramo", "Palma de cera, Palma de ramo", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 20],
    ["FLO-151", "Aligustre del Japon", "Aligustre del Japon", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 20],
    ["FLO-152", "Azalea", "Azalea", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 20],
    ["FLO-153", "Pomarroso", "Pomarroso", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 18],
    ["FLO-154", "Algodon extranjero", "Algodon extranjero", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 18],
    ["FLO-155", "Tibar extranjero", "Tibar extranjero", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 17],
    ["FLO-156", "Lulo de perro", "Lulo de perro", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 17],
    ["FLO-157", "Cedrillo", "Cedrillo", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 16],
    ["FLO-158", "Tuno", "Tuno", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 16],
    ["FLO-159", "Arbol de Fuego", "Arbol de Fuego", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 16],
    ["FLO-160", "Manzano", "Manzano", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 15],
    ["FLO-161", "Rosa", "Rosa", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 15],
    ["FLO-162", "Guayabo del peru", "Guayabo del peru", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 15],
    ["FLO-163", "Ceiba de tierra fria", "Ceiba de tierra fria", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 15],
    ["FLO-164", "Mulato", "Mulato", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 15],
    ["FLO-165", "Gualanday", "Gualanday", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 14],
    ["FLO-166", "Platano de tierra fria", "Platano de tierra fria", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 14],
    ["FLO-167", "Cafe", "Cafe", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 13],
    ["FLO-168", "Barbasco", "Barbasco", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 13],
    ["FLO-169", "Salvio negro", "Salvio negro", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 12],
    ["FLO-170", "Tomatillo", "Tomatillo", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 11],
    ["FLO-171", "Fotinia", "Fotinia", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 11],
    ["FLO-172", "Carbonero rosado", "Carbonero rosado", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 10],
    ["FLO-173", "Acacia azul", "Acacia azul", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 10],
    ["FLO-174", "Duranta amarilla", "Duranta amarilla", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 10],
    ["FLO-175", "Aloe arboreo", "Aloe arboreo", "Productor primario / Cobertura y estructura ecológica urbana", "Estrato arbóreo", 9],
    ["FLO-176", "Junco de estero", "Schoenoplectus californicus", "Macrófita emergente / Hábitat crítico y nidificación de Tingua Bogotana", "Estrato litoral", 500],
    ["FLO-177", "Enea / Totora", "Typha latifolia", "Macrófita emergente / Refugio de fauna de juncal y filtro hídrico", "Estrato litoral", 500],
    ["FLO-178", "Buchón de agua", "Eichhornia crassipes", "Macrófita flotante / Biofiltración y retención de metales pesados", "Estrato espejo de agua", 500],
    ["FLO-179", "Lenteja de agua", "Lemna minor", "Macrófita flotante / Alimento primario de anátidos y peces", "Estrato espejo de agua", 500],
    ["FLO-180", "Botoncillo de humedal", "Bidens laevis", "Hierba riparia nativa / Polinización por dípteros e himenópteros", "Estrato ribereño", 500],
    ["FLO-181", "Curuba silvestre", "Passiflora mixta", "Enredadera nativa / Polinización especializada por Ensifera ensifera", "Estrato trepador", 500],
  ];
  floraBase.forEach((item, idx) => {
    nodes.push({
      id: item[0],
      name: item[1],
      sci: item[2],
      cat: 0,
      role: item[3],
      stratum: item[4],
      count: item[5],
      loc: 'Localidad 09 Kennedy — Censo Forestal SIGAU / JBB',
      alert: item[1].includes('Junco') ? 'Especie clave de hábitat para Tingua Bogotana' : 'Monitoreo Arbolado Urbano Kennedy',
      img: './assets/fotos/fotos_aves/' + item[1] + '.jpeg',
      inatUrl: 'https://colombia.inaturalist.org/search?q=' + encodeURIComponent(item[2])
    });
  });

  // 2. AVES DE KENNEDY (236 especies únicas)
  const avesBase = [
    ["AVE-001", "Turdus fuscater gigas", "Turdus fuscater gigas", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Turdus fuscater gigas.jpeg"],
    ["AVE-002", "Zenaida auriculata pentheria", "Zenaida auriculata pentheria", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Zenaida auriculata pentheria.png"],
    ["AVE-003", "Thraupis palmarum atripennis", "Thraupis palmarum atripennis", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://static.inaturalist.org/photos/69262665/medium.png"],
    ["AVE-004", "Zonotrichia capensis costaricensis", "Zonotrichia capensis costaricensis", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Zonotrichia capensis costaricensis.png"],
    ["AVE-005", "Troglodytes musculus columbae", "Troglodytes musculus columbae", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Troglodytes musculus columbae.png"],
    ["AVE-006", "Sicalis luteola bogotensis", "Sicalis luteola bogotensis", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Sicalis luteola bogotensis.jpeg"],
    ["AVE-007", "Stelgidopteryx ruficollis uropygialis", "Stelgidopteryx ruficollis uropygialis", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Stelgidopteryx ruficollis uropygialis.jpg"],
    ["AVE-008", "Vanellus chilensis cayennensis", "Vanellus chilensis cayennensis", "Consumidor secundario / Insectívoro de follaje y dosel", "Universidad Distrital Francisco JosÃ© De Caldas - Sede Bosa El Porvenir", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Vanellus chilensis cayennensis.jpeg"],
    ["AVE-009", "Asio stygius robustus", "Asio stygius robustus", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Asio stygius robustus.jpg"],
    ["AVE-010", "Geranoaetus melanoleucus australis", "Geranoaetus melanoleucus australis", "Consumidor secundario / Insectívoro de follaje y dosel", "Urb. La Estancia, FontibÃ³n, BogotÃ¡, Colombia", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/705103444/medium.jpg"],
    ["AVE-011", "Geranoaetus", "ÃÁguilas y Aguiluchos", "Depredador tope / Control biológico de roedores y reptiles", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Águilas y Aguiluchos.jpeg"],
    ["AVE-012", "Anas platyrhynchos domesticus", "ÃÁnade azulÃón domÃéstico", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/28247708/medium.jpeg"],
    ["AVE-013", "Ganso cisne domÃéstico", "Anser cygnoides domesticus", "Consumidor secundario / Insectívoro de follaje y dosel", "Mundo Aventura, BogotÃ¡, BogotÃ¡, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/506023235/medium.jpg"],
    ["AVE-014", "Gallinago delicata", "Agachona Norteamericana", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Agachona Norteamericana.jpeg"],
    ["AVE-015", "Buteo platypterus", "Aguililla Alas Anchas", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Aguililla Alas Anchas.jpeg"],
    ["AVE-016", "Aguililla caminera", "Aves", "Consumidor secundario / Insectívoro de follaje y dosel", "BogotÃ¡, Colombia", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Aguililla caminera.jpeg"],
    ["AVE-017", "Geranoaetus albicaudatus", "Aguililla cola blanca", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Aguililla cola blanca.jpg"],
    ["AVE-018", "Buteo brachyurus", "Aguililla cola corta", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Aguililla cola corta.jpeg"],
    ["AVE-019", "Buteo", "Aguilillas y parientes", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Aguilillas y parientes.jpeg"],
    ["AVE-020", "Phaetusa simplex", "AtÃí", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/303533503/medium.jpg"],
    ["AVE-021", "Systellura longirostris", "Atajacaminos ÃñaÃñarca", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/420734/medium.jpg"],
    ["AVE-022", "Atlapetes pallidinucha", "atlapetes cabecipÃ¡lido", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/28648187/medium.jpeg"],
    ["AVE-023", "Megascops choliba", "Autillo comÃún", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/84447821/medium.jpeg"],
    ["AVE-024", "Vanellus chilensis", "AvefrÃía Tero", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Vanellus chilensis cayennensis.jpeg"],
    ["AVE-025", "Passeriformes", "Aves de percha", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Aves de percha.jpeg"],
    ["AVE-026", "Elanus leucurus leucurus", "BailarÃín", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/29281312/medium.jpeg"],
    ["AVE-027", "Asio flammeus bogotensis", "BÃúho Campestre de los Andes Ecuatoriales", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/31149636/medium.jpeg"],
    ["AVE-028", "Bubo virginianus", "BÃúho cornudo", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/86248675/medium.jpeg"],
    ["AVE-029", "Asio flammeus", "BÃúho Sabanero", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/84548198/medium.jpeg"],
    ["AVE-030", "Asio", "BÃúhos orejones", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Asio stygius robustus.jpg"],
    ["AVE-031", "BÃúhos y tecolotes", "Strigidae", "Consumidor secundario / Insectívoro de follaje y dosel", "Cundinamarca, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/452910772/medium.jpeg"],
    ["AVE-032", "Strigiformes", "BÃúhos, lechuzas y tecolotes", "Depredador tope / Control biológico de roedores y reptiles", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/87058787/medium.jpeg"],
    ["AVE-033", "Heliodoxa jacula", "Brillante Coroniverde", "Polinizador nectarívoro / Forrajeo de flores tubulares", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Brillante Coroniverde.jpg"],
    ["AVE-034", "Contopus fumigatus", "Burlisto copetÃón", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://static.inaturalist.org/photos/251178470/medium.jpeg"],
    ["AVE-035", "Burrito pico rojo", "Mustelirallus erythrops", "Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas", "Transversal 81, BogotÃ¡, DC, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Burrito pico rojo.jpg"],
    ["AVE-036", "Buteo platypterus platypterus", "Busardo aliancho continental", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Busardo aliancho continental.jpeg"],
    ["AVE-037", "Buteonine Hawks, Kites, and allies", "Buteoninae", "Consumidor secundario / Insectívoro de follaje y dosel", "Calle 6D, BogotÃ¡, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://static.inaturalist.org/photos/285661203/medium.jpg"],
    ["AVE-038", "caica de pÃ¡ramo", "Gallinago nobilis", "Consumidor secundario / Insectívoro de follaje y dosel", "Cundinamarca, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://static.inaturalist.org/photos/37745697/medium.jpg"],
    ["AVE-039", "Icterus galbula", "Calandria de Baltimore", "Frugívoro & Granívoro / Dispersión zoócora de semillas", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Calandria de Baltimore.jpeg"],
    ["AVE-040", "Icterus chrysater", "Calandria Dorso Amarillo", "Frugívoro & Granívoro / Dispersión zoócora de semillas", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Calandria Dorso Amarillo.jpeg"],
    ["AVE-041", "Icteridae", "Calandrias, tordos, caciques, oropÃéndolas, zanates, praderos y parientes", "Frugívoro & Granívoro / Dispersión zoócora de semillas", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Tordos.jpg"],
    ["AVE-042", "Calzadito Cobrizo", "Eriocnemis cupreoventris", "Polinizador nectarívoro / Forrajeo de flores tubulares", "Cundinamarca, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Calzadito Cobrizo.jpeg"],
    ["AVE-043", "Eriocnemis vestita", "Calzadito Reluciente", "Polinizador nectarívoro / Forrajeo de flores tubulares", "Cundinamarca, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Calzadito Reluciente.jpg"],
    ["AVE-044", "Sicalis flaveola", "Canario coronado", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Canario coronado.jpeg"],
    ["AVE-045", "Canarios o Jilgueros", "Sicalis", "Frugívoro & Granívoro / Dispersión zoócora de semillas", "AV. Esperanza - KR 96H, BogotÃ¡, Colombia", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Canarios o Jilgueros.jpeg"],
    ["AVE-046", "Tricolored Munia", "Lonchura malacca", "Consumidor secundario / Insectívoro de follaje y dosel", "Carrera 83 7D-02, BogotÃ¡, DC, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/41187316/medium.jpg"],
    ["AVE-047", "Caracara plancus", "Carancho", "Depredador tope / Control biológico de roedores y reptiles", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Carancho.jpeg"],
    ["AVE-048", "Carpintero habado", "Melanerpes rubricapillus", "Consumidor secundario / Insectívoro de follaje y dosel", "11011, BogotÃ¡, Colombia", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Carpintero habado.jpg"],
    ["AVE-049", "Aramus guarauna", "Carrao", "Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Carrao.jpeg"],
    ["AVE-050", "Mimus gilvus", "Centzontle tropical", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Centzontle tropical.jpeg"],
    ["AVE-051", "Centzontles", "Mimus", "Consumidor secundario / Insectívoro de follaje y dosel", "Carrera 72C, BogotÃ¡, BogotÃ¡, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Centzontles.jpg"],
    ["AVE-052", "Blue-winged Teal", "Spatula discors", "Consumidor secundario / Insectívoro de follaje y dosel", "Cra. 80f #41b Sur-1 a 41b Sur-37, BogotÃ¡, Colombia", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://static.inaturalist.org/photos/17142991/medium.jpeg"],
    ["AVE-053", "Falco sparverius", "CernÃícalo americano", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/112161199/medium.jpeg"],
    ["AVE-054", "Synallaxis subpudica", "chamicero cundiboyacense", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/chamicero cundiboyacense.jpeg"],
    ["AVE-055", "Chlidonias niger", "CharrÃ¡n negro", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/193324778/medium.jpg"],
    ["AVE-056", "ChimachimÃ¡", "Daptrius chimachima", "Consumidor secundario / Insectívoro de follaje y dosel", "Cra. 112c #12c-2 a Avenida Carrera 68, 12c, BogotÃ¡, Colombia", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/334885041/medium.jpeg"],
    ["AVE-057", "Northern Yellow Warbler", "Setophaga aestiva", "Consumidor secundario / Insectívoro de follaje y dosel", "Cra. 80f #41b Sur-2 a 41b Sur-38, BogotÃ¡, Colombia", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://static.inaturalist.org/photos/17141267/medium.jpeg"],
    ["AVE-058", "Setophaga striata", "Chipe Cabeza Negra", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Chipe Cabeza Negra.jpg"],
    ["AVE-059", "Setophaga castanea", "Chipe castaÃño", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/104483730/medium.jpg"],
    ["AVE-060", "Setophaga cerulea", "Chipe Celeste", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Chipe Celeste.jpeg"],
    ["AVE-061", "Parkesia noveboracensis", "Chipe charquero", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Chipe charquero.jpeg"],
    ["AVE-062", "Cardellina canadensis", "Chipe de collar", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Chipe de collar.jpeg"],
    ["AVE-063", "Geothlypis philadelphia", "Chipe de Pechera", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Chipe de Pechera.jpeg"],
    ["AVE-064", "Setophaga fusca", "Chipe garganta naranja", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Chipe garganta naranja.jpeg"],
    ["AVE-065", "Leiothlypis peregrina", "Chipe peregrino", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Chipe peregrino.jpeg"],
    ["AVE-066", "Setophaga pitiayumi", "Chipe Tropical", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Chipe Tropical.jpeg"],
    ["AVE-067", "Chipes", "Setophaga", "Consumidor secundario / Insectívoro de follaje y dosel", "Diagonal 2A, BogotÃ¡, BogotÃ¡, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Chipes.jpg"],
    ["AVE-068", "Vireo chivi", "ChivÃí ChivÃí", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://static.inaturalist.org/photos/260911087/medium.jpeg"],
    ["AVE-069", "Charadrius vociferus", "Chorlo tildÃío", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/422670709/medium.jpeg"],
    ["AVE-070", "Chordeiles", "Chotacabras", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Chotacabras.jpg"],
    ["AVE-071", "ColibrÃí de Mulsant", "Chaetocercus mulsant", "Polinizador nectarívoro / Forrajeo de flores tubulares", "Ciudad Kennedy Occidental, Antonio NariÃ±o, BogotÃ¡, Bogota, Colombia", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://static.inaturalist.org/photos/471468500/medium.jpeg"],
    ["AVE-072", "Colibri coruscans", "ColibrÃí Rutilante", "Polinizador nectarívoro / Forrajeo de flores tubulares", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://static.inaturalist.org/photos/17113330/medium.jpeg"],
    ["AVE-073", "ColibrÃíes", "Trochilidae", "Polinizador nectarívoro / Forrajeo de flores tubulares", "Carrera 69D, BogotÃ¡, DC, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/70401785/medium.jpg"],
    ["AVE-074", "Colibri", "ColibrÃíes oreja violeta", "Polinizador nectarívoro / Forrajeo de flores tubulares", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://static.inaturalist.org/photos/36851695/medium.jpeg"],
    ["AVE-075", "Grallaria ruficapilla", "ComprapÃ¡n", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/142836531/medium.jpeg"],
    ["AVE-076", "Coccyzus americanus", "Cuclillo pico amarillo", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Cuclillo pico amarillo.jpeg"],
    ["AVE-077", "Aves", "1960", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Aves de percha.jpeg"],
    ["AVE-078", "Phimosus infuscatus", "Cuervillo cara pelada", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Cuervillo cara pelada.jpeg"],
    ["AVE-079", "Cranioleuca curtata", "curutiÃé cejigrÃís", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/361096496/medium.jpg"],
    ["AVE-080", "North American White-tailed Kite", "Elanus leucurus majusculus", "Consumidor secundario / Insectívoro de follaje y dosel", "Villa Nelly Iii, BogotÃ¡, BogotÃ¡, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/583975065/medium.jpg"],
    ["AVE-081", "Falco columbarius columbarius", "esmerejÃón de la taiga", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://static.inaturalist.org/photos/335767168/medium.jpeg"],
    ["AVE-082", "Aves", "9487", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Aves de percha.jpeg"],
    ["AVE-083", "Aves", "16733", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Aves de percha.jpeg"],
    ["AVE-084", "FiofÃío silbÃón", "Elaenia albiceps", "Consumidor secundario / Insectívoro de follaje y dosel", "Mandalay, Antonio NariÃ±o, BogotÃ¡, Bogota, Colombia", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://static.inaturalist.org/photos/380590501/medium.jpeg"],
    ["AVE-085", "Fulica americana columbiana", "Focha comÃún", "Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/302944605/medium.jpeg"],
    ["AVE-086", "Fulica americana", "Gallareta americana", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Gallareta americana.jpeg"],
    ["AVE-087", "Gallaretas, polluelas y pollas de agua", "Rallidae", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedal El Burro", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Gallaretas, polluelas y pollas de agua.jpeg"],
    ["AVE-088", "Common Gallinule", "Gallinula galeata", "Consumidor secundario / Insectívoro de follaje y dosel", "Santaf? de Bogot?, CO-CU, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://static.inaturalist.org/photos/5186393/medium.jpeg"],
    ["AVE-089", "Gallineta morada", "Porphyrio martinica", "Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas", "Cra. 80f #41b Sur-2 a 41b Sur-38, BogotÃ¡, Colombia", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Gallineta morada.jpeg"],
    ["AVE-090", "Gallinetas", "Gallinula", "Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas", "humedal la vaca", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Gallinetas.jpeg"],
    ["AVE-091", "Ganso comÃún", "Anser anser", "Consumidor secundario / Insectívoro de follaje y dosel", "Carrera 103A, BogotÃ¡, BogotÃ¡, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/569423540/medium.jpg"],
    ["AVE-092", "Egretta caerulea", "Garceta azul", "Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Garceta azul.jpg"],
    ["AVE-093", "Ardea ibis", "Garcilla bueyera occidental", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Garcilla bueyera occidental.jpeg"],
    ["AVE-094", "Green Heron", "Butorides virescens", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedal La Vaca, BogotÃ¡, DC, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://static.inaturalist.org/photos/60568039/medium.jpg"],
    ["AVE-095", "Striated Heron", "Butorides striata", "Consumidor secundario / Insectívoro de follaje y dosel", "Cra. 80f #41b Sur-2 a 41b Sur-38, BogotÃ¡, Colombia", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://static.inaturalist.org/photos/17119902/medium.jpeg"],
    ["AVE-096", "Garza blanca", "Ardea alba", "Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas", "Carrera 80A 17-75, BogotÃ¡, DC, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Garza blanca.jpg"],
    ["AVE-097", "Aves", "4940", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Aves de percha.jpeg"],
    ["AVE-098", "Nycticorax nycticorax", "Garza Nocturna Corona Negra", "Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Garza Nocturna Corona Negra.jpeg"],
    ["AVE-099", "Garzas", "Ardeidae", "Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas", "San Bernardino", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Garzas.jpeg"],
    ["AVE-100", "Ardeinae", "Garzas, garcetas, garcillas y martinetes", "Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Garzas, garcetas, garcillas y martinetes.jpeg"],
    ["AVE-101", "Chondrohierax uncinatus", "GavilÃ¡n Pico de Gancho", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://static.inaturalist.org/photos/659819383/medium.jpg"],
    ["AVE-102", "Aves", "68826", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Aves de percha.jpeg"],
    ["AVE-103", "Progne tapera", "Golondrina parda", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Golondrina parda.jpeg"],
    ["AVE-104", "Orochelidon murina", "Golondrina plomiza", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Golondrina plomiza.jpg"],
    ["AVE-105", "Riparia riparia", "Golondrina ribereÃña", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/123837685/medium.jpeg"],
    ["AVE-106", "Petrochelidon pyrrhonota", "Golondrina risquera", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Golondrina risquera.jpeg"],
    ["AVE-107", "Hirundo rustica", "Golondrina tijereta", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Golondrina tijereta.jpeg"],
    ["AVE-108", "Hirundinidae", "Golondrinas", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Golondrinas.jpeg"],
    ["AVE-109", "Progne", "Golondrinas o martines", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Golondrinas o martines.jpeg"],
    ["AVE-110", "Aves", "9869", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Aves de percha.jpeg"],
    ["AVE-111", "Zonotrichia capensis", "GorriÃón Chingolo", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Zonotrichia capensis costaricensis.png"],
    ["AVE-112", "Zonotrichia", "Gorriones y Copetones", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Zonotrichia capensis costaricensis.png"],
    ["AVE-113", "Grandes garzas", "Ardea", "Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas", "Carrera 96F, BogotÃ¡, DC, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Grandes garzas.jpg"],
    ["AVE-114", "Steatornis caripensis", "GuÃ¡charo", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/143620420/medium.jpeg"],
    ["AVE-115", "Guacamaya roja", "Ara macao", "Consumidor secundario / Insectívoro de follaje y dosel", "Cundinamarca, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Guacamaya roja.jpg"],
    ["AVE-116", "Falco columbarius", "HalcÃón esmerejÃón", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/104986527/medium.jpeg"],
    ["AVE-117", "Falco deiroleucus", "HalcÃón Pecho Canela", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/178837882/medium.jpeg"],
    ["AVE-118", "Falco peregrinus", "HalcÃón Peregrino", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/112160847/medium.jpeg"],
    ["AVE-119", "Halcones", "Falco", "Consumidor secundario / Insectívoro de follaje y dosel", "Cundinamarca, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Halcones.jpg"],
    ["AVE-120", "Zenaida Doves", "Zenaida", "Consumidor secundario / Insectívoro de follaje y dosel", "BogotÃ¡, D.C. , CO-CU, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/216027476/medium.jpeg"],
    ["AVE-121", "Threskiornithidae", "Ibis y espÃ¡tulas", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/193322163/medium.jpg"],
    ["AVE-122", "Coeligena prunellei", "Inca Negro", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Inca Negro.jpeg"],
    ["AVE-123", "Gallito de ciÃénaga", "Jacana jacana", "Consumidor secundario / Insectívoro de follaje y dosel", "San Francisco, Mosquera, Cundinamarca, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Jacana.jpg"],
    ["AVE-124", "Spinus psaltria", "Jilguerito Dominico", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Jilguerito Dominico.jpeg"],
    ["AVE-125", "Spinus psaltria colombianus", "Jilguerito Dominico SureÃño", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Jilguerito Dominico.jpeg"],
    ["AVE-126", "Spinus", "Jilgueritos", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Jilgueritos.jpeg"],
    ["AVE-127", "Spinus spinescens", "Jilguero andino", "Frugívoro & Granívoro / Dispersión zoócora de semillas", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Jilguero andino.jpeg"],
    ["AVE-128", "Jilguero pechinegro", "Spinus xanthogastrus", "Frugívoro & Granívoro / Dispersión zoócora de semillas", "Calle 40C Sur, BogotÃ¡, BogotÃ¡, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Jilguero pechinegro.jpg"],
    ["AVE-129", "Tyto furcata", "lechuza comÃún americana", "Depredador tope / Control biológico de roedores y reptiles", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/76900690/medium.jpg"],
    ["AVE-130", "Oxyura ferruginea andina", "MalvasÃía colombiana", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/28647341/medium.jpeg"],
    ["AVE-131", "Arremon assimilis", "Matorralero de cabeza listada", "Consumidor secundario / Insectívoro de follaje y dosel", "Cundinamarca, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Matorralero de cabeza listada.jpg"],
    ["AVE-132", "Metallura tyrianthina", "Metalura Tiria", "Polinizador nectarívoro / Forrajeo de flores tubulares", "Cundinamarca, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Metalura Tiria.jpg"],
    ["AVE-133", "Conirostrum rufum", "Mielero Rufo", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Mielero Rufo.jpeg"],
    ["AVE-134", "Aves", "5277", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Aves de percha.jpeg"],
    ["AVE-135", "Ictinia mississippiensis", "Milano de Mississippi", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Milano de Mississippi.jpg"],
    ["AVE-136", "Elanus", "Milanos de alas negras", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Milanos de alas negras.jpg"],
    ["AVE-137", "Accipitridae", "Milanos, aguilillas, gavilanes y Ã¡guilas", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/89337841/medium.jpeg"],
    ["AVE-138", "Turdus fuscater", "Mirla patinaranja", "Frugívoro & Granívoro / Dispersión zoócora de semillas", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Mirla patinaranja.jpeg"],
    ["AVE-139", "Turdus", "Mirlos", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Mirlos.jpeg"],
    ["AVE-140", "Chrysomus icterocephalus bogotensis", "monjita bogotana", "Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/monjita bogotana.jpg"],
    ["AVE-141", "Chrysomus icterocephalus", "Monjita Cabeciamarilla", "Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Monjita Cabeciamarilla.jpeg"],
    ["AVE-142", "Camptostoma obsoletum", "Mosquerito silbador", "Consumidor secundario / Insectívoro de follaje y dosel", "Cundinamarca, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Mosquerito silbador.jpg"],
    ["AVE-143", "Mosquero cardenal", "Pyrocephalus rubinus", "Consumidor secundario / Insectívoro de follaje y dosel", "Cra. 81c #40c Sur-21 a 40c Sur-35, BogotÃ¡, Colombia", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Mosquero cardenal.jpeg"],
    ["AVE-144", "Mosquero Elaenia CopetÃón", "Elaenia flavogaster", "Consumidor secundario / Insectívoro de follaje y dosel", "PEDH La Vaca", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/44754102/medium.jpg"],
    ["AVE-145", "Aves", "16721", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Aves de percha.jpeg"],
    ["AVE-146", "Paloma DomÃéstica", "Columba livia domestica", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedal La Vaca, BogotÃ¡, DC, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://static.inaturalist.org/photos/16019684/medium.jpg"],
    ["AVE-147", "Palomas del Viejo Mundo", "Columba", "Consumidor secundario / Insectívoro de follaje y dosel", "Transversal 87 Bis A, BogotÃ¡, DC, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Palomas del Viejo Mundo.jpg"],
    ["AVE-148", "Columbidae", "Palomas, tortolitas y coquitas", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Palomas, tortolitas y coquitas.jpeg"],
    ["AVE-149", "Zenaida auriculata", "Palomita montera", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Palomita montera.jpeg"],
    ["AVE-150", "Empidonax alnorum", "Papamoscas Ailero", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Papamoscas Ailero.jpeg"],
    ["AVE-151", "Papamoscas Boreal", "Contopus cooperi", "Consumidor secundario / Insectívoro de follaje y dosel", "Carrera 106, BogotÃ¡, DC, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Papamoscas Boreal.jpg"],
    ["AVE-152", "Papamoscas", "Contopus", "Consumidor secundario / Insectívoro de follaje y dosel", "Cra. 80f #41b Sur-2 a 41b Sur-38, BogotÃ¡, Colombia", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Papamoscas Ailero.jpeg"],
    ["AVE-153", "Papamoscas del Este", "Contopus virens", "Consumidor secundario / Insectívoro de follaje y dosel", "Carrera 86 #6d-2 a 6d-82 Bogot?", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Papamoscas del Este.jpeg"],
    ["AVE-154", "Western Wood-Pewee", "Contopus sordidulus", "Consumidor secundario / Insectívoro de follaje y dosel", "Carrera 80D, BogotÃ¡, DC, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://static.inaturalist.org/photos/54760519/medium.jpg"],
    ["AVE-155", "Empidonax", "Papamoscas Empidonax", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Papamoscas Empidonax.jpeg"],
    ["AVE-156", "Myiarchus", "Papamoscas Myiarchus", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Papamoscas Myiarchus.jpeg"],
    ["AVE-157", "Myiodynastes maculatus", "Papamoscas Rayado Cheje", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Papamoscas Rayado Cheje.jpeg"],
    ["AVE-158", "Myiodynastes luteiventris", "Papamoscas Rayado ComÃún", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/28647894/medium.jpeg"],
    ["AVE-159", "Myiodynastes", "Papamoscas Rayados", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Papamoscas Rayados.jpg"],
    ["AVE-160", "Empidonax traillii", "Papamoscas Saucero", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Papamoscas Saucero.jpeg"],
    ["AVE-161", "Contopus bogotensis", "Papamoscas Tropical NorteÃño", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://static.inaturalist.org/photos/688797191/medium.jpg"],
    ["AVE-162", "Empidonax virescens", "Papamoscas Verdoso", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Papamoscas Verdoso.jpg"],
    ["AVE-163", "Great Crested Flycatcher", "Myiarchus crinitus", "Consumidor secundario / Insectívoro de follaje y dosel", "Calle 40bisa Sur, BogotÃ¡, DC, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://static.inaturalist.org/photos/101230015/medium.jpg"],
    ["AVE-164", "Tringa melanoleuca", "Patamarilla mayor", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Patamarilla mayor.jpeg"],
    ["AVE-165", "Tringa flavipes", "Patamarilla menor", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Patamarilla menor.jpeg"],
    ["AVE-166", "Tringa", "Patamarillas y parientes", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Patamarillas y parientes.jpeg"],
    ["AVE-167", "Pato careto", "Dendrocygna viduata", "Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas", "FontibÃ³n, BogotÃ¡, Colombia", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Pato careto.jpeg"],
    ["AVE-168", "Nomonyx dominicus", "Pato Enmascarado", "Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Pato Enmascarado.jpeg"],
    ["AVE-169", "Anas bahamensis", "Pato gargantilla", "Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Pato gargantilla.jpeg"],
    ["AVE-170", "Cairina moschata domestica", "Pato real domÃéstico", "Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/228079443/medium.jpeg"],
    ["AVE-171", "Oxyura ferruginea", "pato zambullidor grande", "Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/pato zambullidor grande.jpeg"],
    ["AVE-172", "Anatidae", "Patos, gansos, cisnes y parientes", "Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Patos, gansos, cisnes y parientes.jpeg"],
    ["AVE-173", "Penelope montagnii", "Pava Andina", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Pava Andina.jpeg"],
    ["AVE-174", "Aves", "10247", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Aves de percha.jpeg"],
    ["AVE-175", "Diglossa sittoides", "Payador canela", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Payador canela.jpeg"],
    ["AVE-176", "Tyrannus melancholicus melancholicus", "Pepite", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Pepite.png"],
    ["AVE-177", "Forpus conspicillatus", "Perico de anteojos", "Frugívoro & Granívoro / Dispersión zoócora de semillas", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Perico de anteojos.jpeg"],
    ["AVE-178", "Aves", "19339", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Aves de percha.jpeg"],
    ["AVE-179", "Aves", "19076", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Aves de percha.jpeg"],
    ["AVE-180", "Aves", "9839", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Aves de percha.jpeg"],
    ["AVE-181", "Diglossa humeralis", "Picaflor negro", "Consumidor secundario / Insectívoro de follaje y dosel", "Cundinamarca, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Picaflor negro.jpeg"],
    ["AVE-182", "Pheucticus ludovicianus", "Picogordo Degollado", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Picogordo Degollado.jpeg"],
    ["AVE-183", "Dendrocygna autumnalis", "Pijije Alas Blancas", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Pijije Alas Blancas.jpeg"],
    ["AVE-184", "Dendrocygna bicolor", "Pijije canelo", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Pijije canelo.jpeg"],
    ["AVE-185", "Mecocerculus leucophrys", "Piojito gargantilla", "Consumidor secundario / Insectívoro de follaje y dosel", "Cundinamarca, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Piojito gargantilla.jpg"],
    ["AVE-186", "Catamenia analis", "Piquitodeoro chico", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Piquitodeoro chico.jpg"],
    ["AVE-187", "Piranga olivacea", "Piranga escarlata", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Piranga escarlata.jpeg"],
    ["AVE-188", "Piranga rubra", "Piranga roja", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Piranga roja.jpeg"],
    ["AVE-189", "Piranga", "Pirangas", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Pirangas.jpeg"],
    ["AVE-190", "Actitis macularius", "Playero alzacolita", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Playero alzacolita.jpeg"],
    ["AVE-191", "Calidris melanotos", "Playero Pectoral", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Playero Pectoral.jpeg"],
    ["AVE-192", "Tringa solitaria", "Playero Solitario", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Playero Solitario.jpeg"],
    ["AVE-193", "Scolopacidae", "Playeros, zarapitos, picopandos, vuelvepiedras, costureros y falaropos", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Playeros, zarapitos, picopandos, vuelvepiedras, costureros y falaropos.jpeg"],
    ["AVE-194", "Polla de agua sabanera", "Porphyriops melanops bogotensis", "Consumidor secundario / Insectívoro de follaje y dosel", "Calle 40c Sur #80j-2 a 80j-98 BogotÃ¡", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Polla de agua sabanera.jpg"],
    ["AVE-195", "Polluela sora", "Porzana carolina", "Consumidor secundario / Insectívoro de follaje y dosel", "BogotÃ¡, DC, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Polluela Sora.jpg"],
    ["AVE-196", "Sturnella magna", "Pradero Tortillaconchile", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Pradero Tortillaconchile.jpg"],
    ["AVE-197", "Pardirallus maculatus", "RascÃón pinto", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/61213213/medium.jpg"],
    ["AVE-198", "Troglodytes", "Ratonas", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Ratonas.jpeg"],
    ["AVE-199", "Pheucticus aureoventris", "Rey del bosque", "Consumidor secundario / Insectívoro de follaje y dosel", "Cundinamarca, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Rey del bosque.jpeg"],
    ["AVE-200", "Troglodytes musculus", "Saltapared ComÃún SureÃño", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Troglodytes musculus columbae.png"],
    ["AVE-201", "Aves", "17289", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Aves de percha.jpeg"],
    ["AVE-202", "Palm Tanager", "Thraupis palmarum", "Consumidor secundario / Insectívoro de follaje y dosel", "Kennedy, BogotÃ¡, Colombia", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/150064441/medium.jpeg"],
    ["AVE-203", "Cissopis leverianus", "TÃ¡ngara urraca", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/88619399/medium.jpeg"],
    ["AVE-204", "Tangara azulgris", "Thraupis episcopus", "Frugívoro & Granívoro / Dispersión zoócora de semillas", "PEDH LA VACA", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/44754628/medium.jpg"],
    ["AVE-205", "Thraupidae", "Tangaras, mieleros, semilleros y parientes", "Frugívoro & Granívoro / Dispersión zoócora de semillas", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Tangaras, mieleros, semilleros y parientes.jpg"],
    ["AVE-206", "Chuck-will's-widow", "Antrostomus carolinensis", "Consumidor secundario / Insectívoro de follaje y dosel", "BogotÃ¡, DC, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://static.inaturalist.org/photos/62857404/medium.jpg"],
    ["AVE-207", "TapicurÃú", "Mesembrinibis cayennensis", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedal Meandro del Say, BogotÃ¡ FontibÃ³n", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://static.inaturalist.org/photos/291552888/medium.jpeg"],
    ["AVE-208", "Rallus semiplumbeus", "Tingua bogotana", "Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Tingua bogotana.jpg"],
    ["AVE-209", "Porphyriops melanops", "Tingua moteada", "Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Tingua moteada.jpeg"],
    ["AVE-210", "Tyrannus tyrannus", "Tirano dorso negro", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Tirano dorso negro.jpg"],
    ["AVE-211", "Tyrannus niveigularis", "Tirano GolinÃíveo", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/579248653/medium.jpg"],
    ["AVE-212", "Tyrannus dominicensis", "Tirano gris", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Tirano gris.jpeg"],
    ["AVE-213", "Tirano PirirÃí", "Tyrannus melancholicus", "Consumidor secundario / Insectívoro de follaje y dosel", "Cl. 7a Bis #80b-1 a 80b-55, BogotÃ¡, Colombia", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://static.inaturalist.org/photos/16452109/medium.jpg"],
    ["AVE-214", "Tyrannus savana", "Tirano Tijereta Gris", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Tirano Tijereta Gris.jpeg"],
    ["AVE-215", "Tiranos", "Tyrannus", "Consumidor secundario / Insectívoro de follaje y dosel", "Calle 15, BogotÃ¡, BogotÃ¡, CO", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Tiranos.jpg"],
    ["AVE-216", "Tyrannidae", "tiranos, papamoscas y parientes", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/tiranos, papamoscas y parientes.jpeg"],
    ["AVE-217", "Serpophaga cinerea", "Tiranuelo saltarroyo", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Tiranuelo saltarroyo.jpg"],
    ["AVE-218", "Molothrus bonariensis", "Tordo Sudamericano", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Tordo Sudamericano.jpeg"],
    ["AVE-219", "Molothrus", "Tordos", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Tordos.jpg"],
    ["AVE-220", "Tuquito gris", "Empidonomus aurantioatrocristatus", "Consumidor secundario / Insectívoro de follaje y dosel", "Pio XII, Bogota, Colombia", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Tuquito gris.jpeg"],
    ["AVE-221", "Empidonomus varius", "Tuquito rayado", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Tuquito rayado.jpeg"],
    ["AVE-222", "Icterus icterus", "Turpial", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Turpial.jpeg"],
    ["AVE-223", "Gymnomystax mexicanus", "Turpial lagunero", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Turpial lagunero.jpeg"],
    ["AVE-224", "Aves", "Streptoprocne zonaris", "Consumidor secundario / Insectívoro de follaje y dosel", "Cra. 105b #69a Sur-1 a 69a Sur-55, BogotÃ¡, Colombia", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Aves de percha.jpeg"],
    ["AVE-225", "Vireo olivaceus", "Vireo Ojos Rojos", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Vireo Ojos Rojos.jpg"],
    ["AVE-226", "Vireo verdeamarillo", "Vireo flavoviridis", "Consumidor secundario / Insectívoro de follaje y dosel", "Parque Aloha", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Vireo verdeamarillo.jpeg"],
    ["AVE-227", "Aves", "17355", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Aves de percha.jpeg"],
    ["AVE-228", "Podilymbus podiceps", "Zambullidor pico grueso", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Zambullidor pico grueso.jpeg"],
    ["AVE-229", "Quiscalus lugubris", "Zanate caribeÃño", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/28647360/medium.jpeg"],
    ["AVE-230", "Quiscalus", "Zanates", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Zanates.jpeg"],
    ["AVE-231", "Coragyps atratus", "Zopilote comÃún", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "https://inaturalist-open-data.s3.amazonaws.com/photos/37420938/medium.jpeg"],
    ["AVE-232", "Aves", "4761", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Aves de percha.jpeg"],
    ["AVE-233", "Cathartes", "Zopilotes", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Zopilotes.jpeg"],
    ["AVE-234", "Catharus fuscescens", "Zorzal Canelo", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Zorzal Canelo.jpeg"],
    ["AVE-235", "Catharus ustulatus", "Zorzal de Anteojos", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Zorzal de Anteojos.jpeg"],
    ["AVE-236", "Catharus", "Zorzales", "Consumidor secundario / Insectívoro de follaje y dosel", "Humedales El Burro, La Vaca y Techo / Kennedy", "Monitoreo Biodiversidad Kennedy / Red iNaturalist", "./assets/fotos/fotos_mamiferos/Zorzales.jpeg"],
  ];
  avesBase.forEach(item => {
    nodes.push({
      id: item[0],
      name: item[1],
      sci: item[2],
      cat: 1,
      role: item[3],
      loc: item[4],
      alert: item[5],
      img: item[6],
      inatUrl: 'https://colombia.inaturalist.org/search?q=' + encodeURIComponent(item[2])
    });
  });

  // Mamiferos
  const mamiferosBase = [
    ["MAM-01", "Chucha de agua / Zarigüeya", "Didelphis marsupialis", "Consumidor secundario / Marsupial omnívoro", "Estrato arbustivo y suelo", "./assets/fotos/fotos_mamiferos/Ardilla de cola roja.jpeg"],
    ["MAM-02", "Comadreja andina", "Neogale felipei / Mustela", "Depredador carnívoro / Control de roedores", "Estrato terrestre ripario", "./assets/fotos/fotos_mamiferos/Turdus fuscater gigas.jpeg"],
    ["MAM-03", "Curí sabanero", "Cavia anolaimae", "Herbívoro de juncal y pastizal", "Estrato herbáceo ripario", "./assets/fotos/fotos_mamiferos/Turdus fuscater gigas.jpeg"],
    ["MAM-04", "Murciélago frugívoro", "Artibeus bogotensis", "Dispersor de semillas nocturno", "Estrato dosel aéreo", "./assets/fotos/fotos_mamiferos/Turdus fuscater gigas.jpeg"],
    ["MAM-05", "Murciélago insectívoro", "Tadarida brasiliensis", "Controlador biológico de insectos plaga", "Estrato aéreo superior", "./assets/fotos/fotos_mamiferos/Turdus fuscater gigas.jpeg"],
    ["MAM-06", "Ratón campestre", "Thomasomys laniger", "Consumidor primario / Dispersor de semillas", "Estrato suelo", "./assets/fotos/fotos_mamiferos/Turdus fuscater gigas.jpeg"],
    ["MAM-07", "Ratón arrocero", "Oligoryzomys fulvescens", "Granívoro e insectívoro de juncales", "Estrato litoral", "./assets/fotos/fotos_mamiferos/Turdus fuscater gigas.jpeg"],
    ["MAM-08", "Zarigüeya común", "Didelphis pernigra", "Omnívoro oportunista / Dispersor de semillas", "Estrato arbóreo y suelo", "./assets/fotos/fotos_mamiferos/Ardilla de cola roja.jpeg"],
    ["MAM-09", "Ardilla de cola roja", "Sciurus granatensis", "Frugívoro y granívoro de dosel", "Estrato dosel arbóreo", "./assets/fotos/fotos_mamiferos/Ardilla de cola roja.jpeg"],
    ["MAM-10", "Nutria neotropical (Histórica)", "Lontra longicaudis", "Depredador tope acuático / Bioindicador", "Estrato acuático lótico", "./assets/fotos/fotos_mamiferos/Turdus fuscater gigas.jpeg"],
  ];
  mamiferosBase.forEach(item => {
    nodes.push({
      id: item[0],
      name: item[1],
      sci: item[2],
      cat: 2,
      role: item[3],
      stratum: item[4],
      loc: 'Humedales El Burro, La Vaca, Meandro del Say y Corredores Verdes',
      alert: 'Monitoreo Mastozoológico Kennedy',
      img: item[5],
      inatUrl: 'https://colombia.inaturalist.org/search?q=' + encodeURIComponent(item[2])
    });
  });

  // Moluscos
  const moluscosBase = [
    ["MOL-01", "Caracol de agua dulce", "Physella venustula", "Detritívoro acuático / Bioindicador", "Estrato bentónico", "./assets/fotos/fotos_moluscos/Caracoles, babosas y parientes.jpg"],
    ["MOL-02", "Caracol trompeta", "Planorbella trivolvis", "Filtrador bentónico / Ciclaje de nutrientes", "Estrato bentónico", "./assets/fotos/fotos_moluscos/Planorbinae.jpg"],
    ["MOL-03", "Caracol de jardín común", "Cornu aspersum", "Herbívoro y descomponedor de hojarasca", "Estrato suelo", "./assets/fotos/fotos_moluscos/Caracol europeo de jardín.jpg"],
    ["MOL-04", "Babosa gris de jardín", "Deroceras reticulatum", "Descomponedor de materia vegetal", "Estrato suelo húmedo", "./assets/fotos/fotos_moluscos/Babosa gris de jardín.jpg"],
    ["MOL-05", "Babosa tigre", "Limax maximus", "Detritívoro y depredador de babosas menores", "Estrato hojarasca", "./assets/fotos/fotos_moluscos/Babosa europea tigre.jpg"],
    ["MOL-06", "Babosa de tres bandas", "Ambigolimax valentianus", "Detritívoro de riberas sombrías", "Estrato ribereño", "./assets/fotos/fotos_moluscos/Babosas de tres bandas.jpg"],
    ["MOL-07", "Caracol transparente", "Oxychilus alliarius", "Detritívoro y carnívoro de microfauna", "Estrato suelo húmedo", "./assets/fotos/fotos_moluscos/Oxychilus.jpeg"],
    ["MOL-08", "Babosa amarilla europea", "Limacus flavus", "Descomponedor de materia orgánica", "Estrato suelo húmedo", "./assets/fotos/fotos_moluscos/Babosa europea amarilla.jpg"],
    ["MOL-09", "Babosa de invernadero", "Lehmannia valentiana", "Herbívoro de sotobosque y viveros", "Estrato arbustivo bajo", "./assets/fotos/fotos_moluscos/Babosa europea de invernadero.jpg"],
    ["MOL-10", "Almeja pisidio", "Pisidium sp.", "Filtrador de sedimentos finos", "Estrato bentónico profundo", "./assets/fotos/fotos_moluscos/Gasterópodos eutineuros.jpeg"],
  ];
  moluscosBase.forEach(item => {
    nodes.push({
      id: item[0],
      name: item[1],
      sci: item[2],
      cat: 3,
      role: item[3],
      stratum: item[4],
      loc: 'Espejos de agua, juncales y riberas de Kennedy',
      alert: 'Monitoreo Malacológico y Bentónico',
      img: item[5],
      inatUrl: 'https://colombia.inaturalist.org/search?q=' + encodeURIComponent(item[2])
    });
  });

  // Anfibios
  const anfibiosBase = [
    ["ANF-01", "Rana sabanera", "Dendropsophus molitor", "Consumidor secundario / Insectívoro acuático", "Estrato litoral y macrófitas", "./assets/fotos/fotos_anfibios/Rana sabanera.jpg"],
    ["ANF-02", "Rana de cristal andina", "Ikakogi / Espadarana", "Bioindicador de calidad hídrica", "Estrato ribereño arbustivo", "./assets/fotos/fotos_anfibios/Pristimantis elegans.jpeg"],
    ["ANF-03", "Salamandra de Bogotá", "Bolitoglossa adspersa", "Microdepredador de hojarasca", "Estrato suelo y musgos", "./assets/fotos/fotos_anfibios/Bolitoglossa adspersa.jpg"],
    ["ANF-04", "Ranita de lluvia", "Pristimantis elegans", "Insectívoro de sotobosque húmedo", "Estrato herbáceo", "./assets/fotos/fotos_anfibios/Pristimantis elegans.jpeg"],
    ["ANF-05", "Rana crema de pantano", "Dendropsophus labialis", "Insectívoro de juncales y totorales", "Estrato litoral", "./assets/fotos/fotos_anfibios/Ranas y sapos.jpeg"],
    ["ANF-06", "Sapo común sabanero", "Rhinella marina / Rhinella marina", "Depredador de invertebrados terrestres", "Estrato suelo", "./assets/fotos/fotos_anfibios/Sapo gigante.jpeg"],
  ];
  anfibiosBase.forEach(item => {
    nodes.push({
      id: item[0],
      name: item[1],
      sci: item[2],
      cat: 4,
      role: item[3],
      stratum: item[4],
      loc: 'Espejo Central y Zonas Litorales de Humedales',
      alert: 'Monitoreo Herpetológico y Bioindicadores de Calidad Hídrica',
      img: item[5],
      inatUrl: 'https://colombia.inaturalist.org/search?q=' + encodeURIComponent(item[2])
    });
  });

  // Reptiles
  const reptilesBase = [
    ["REP-01", "Serpiente sabanera / Culebra tierrera", "Atractus crassicaudatus", "Depredador de lombrices e insectos / Control biológico", "Estrato subterráneo y hojarasca", "./assets/fotos/fotos_reptiles/Serpiente sabanera.jpg"],
    ["REP-02", "Lagartija collareja sabanera", "Stenocercus trachycephalus", "Insectívoro heliófilo / Estructuras y taludes", "Estrato rocoso y troncos", "./assets/fotos/fotos_reptiles/Lagarto Collarejo.jpg"],
    ["REP-03", "Lagartija bombillo estriada", "Anolis heterodermus", "Insectívoro arborícola de camuflaje", "Estrato subdosel y ramas", "./assets/fotos/fotos_reptiles/Lagartija bombillo estriada.jpeg"],
    ["REP-04", "Iguana verde (Introducida)", "Iguana iguana", "Herbívoro y frugívoro de dosel", "Estrato dosel arbóreo", "./assets/fotos/fotos_reptiles/Iguana verde.jpg"],
    ["REP-05", "Jicotea / Tortuga de río (Introducida)", "Trachemys venusta", "Omnívoro acuático / Solario en troncos flotantes", "Estrato espejo de agua", "./assets/fotos/fotos_reptiles/Jicotea Sudamericana.jpg"],
    ["REP-06", "Hicotea sabanera", "Trachemys callirostris", "Omnívoro acuático / Solario en ribera", "Estrato litoral", "./assets/fotos/fotos_reptiles/Hicotea.jpeg"],
    ["REP-07", "Geco casero asiático", "Hemidactylus frenatus", "Insectívoro nocturno de infraestructura", "Estrato edificado", "./assets/fotos/fotos_reptiles/Besucona asiática.jpg"],
    ["REP-08", "Culebra ciega sabanera", "Epictia goudotii", "Fosorial / Depredador de hormigas y termitas", "Estrato suelo", "./assets/fotos/fotos_reptiles/Culebras y parientes.jpeg"],
  ];
  reptilesBase.forEach(item => {
    nodes.push({
      id: item[0],
      name: item[1],
      sci: item[2],
      cat: 5,
      role: item[3],
      stratum: item[4],
      loc: 'Zonas de Ronda, Taludes Secos y Coberturas Arbóreas',
      alert: 'Monitoreo Herpetológico Sabana de Bogotá',
      img: item[5],
      inatUrl: 'https://colombia.inaturalist.org/search?q=' + encodeURIComponent(item[2])
    });
  });

  return nodes;
}

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

    // Cargar datos geográficos de Kennedy
    Promise.all([
      loadBuildings(),
      loadTrees(),
      loadWaterBodies()
    ]).then(() => {
      createParticleSystem();
      if (loadingVeil) {
        loadingVeil.style.opacity = "0";
        setTimeout(() => { loadingVeil.style.display = "none"; }, 600);
      }
    }).catch(err => {
      console.warn("Non-fatal loading warning:", err);
      createParticleSystem();
      if (loadingVeil) {
        loadingVeil.style.opacity = "0";
        setTimeout(() => { loadingVeil.style.display = "none"; }, 600);
      }
    });

    setupEventListeners();
    updateWaypointsBar();
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
      sprite.userData = { taxonData: n, baseScale: baseScale };

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
      opacity: 0.32,
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
      ebirdLink.href = 'https://ebird.org/species/' + encodeURIComponent((t.sci || t.name).toLowerCase().replace(/\s+/g, '-'));
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

    // Close Modal on Background Click
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
      if (e.target.closest(".glass-panel") || e.target.closest("#territorySpeciesModal") || e.target.closest(".welcome-modal") || e.target.closest(".bottom-experience-bar") || e.target.closest(".waypoints-bar") || e.target.closest("#activeTreeChip")) return;

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
  // 11. BUCLE DE ANIMACIÓN
  // =====================================================================
  function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

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

    // Billboard effect
    if (camera) {
      nodeSprites.forEach(sp => sp.quaternion.copy(camera.quaternion));
      territoryBeacons.forEach(sp => sp.quaternion.copy(camera.quaternion));
    }

    if (controls) controls.update();
    if (renderer && scene && camera) renderer.render(scene, camera);
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

  window.setRedLayout = (layoutName) => {
    opts.layout = layoutName;
    document.querySelectorAll('.layout-pill').forEach(p => p.classList.remove('active'));
    const btn = document.getElementById('btnLayout_' + layoutName);
    if (btn) btn.classList.add('active');

    rawNodes.forEach((n, idx) => {
      const targetPos = getNodeTargetPos(n);
      if (nodeSprites[idx]) {
        nodeSprites[idx].position.copy(targetPos);
      }
    });
    createEdgeLinesMesh();
  };

  // Iniciar escena
  window.addEventListener("DOMContentLoaded", initScene);

})();
