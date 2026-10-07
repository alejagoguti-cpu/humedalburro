// =====================================================================
// Sistema Socioecológico de Kennedy — Red Biótica & Territorio 3D
// Living 568-Species Socioecological Network (289 Flora, 232 Aves, 15 Mamíferos, 14 Moluscos, 9 Anfibios, 9 Reptiles)
// =====================================================================

(() => {
  const BUILDINGS_URL = "./assets/kennedy_buildings.json";
  const TREES_URL = "./assets/kennedy_trees_real.json";
  const WATER_URL = "./assets/kennedy_water_bodies.json";
  const NET_URL = "./assets/kennedy_net.json";
  const SCALE = 1 / 10;

  // Estado Global de Transición
  let currentMorph = 0.0;
  let targetMorph = 0.0;
  let isTerritory = false;

  // Centro de proyección de Kennedy
  const netCenter = { x: 5341.33, y: 3161.9 };
  function toScene(x, y) {
    return { x: (x - netCenter.x) * SCALE, z: -(y - netCenter.y) * SCALE };
  }

  // ---- Setup de Escena, Cámara y Variables Principales ----
  const canvas = document.getElementById("sceneCanvas");
  const loadingVeil = document.getElementById("loadingVeil");
  const topHeader = document.getElementById("topHeader");
  const sideDrawer = document.getElementById("sideDrawer");
  const nodeInspector = document.getElementById("nodeInspector");
  const chatWidgetBtn = document.getElementById("chatWidgetBtn");
  const faqChatModal = document.getElementById("faqChatModal");
  const subnetworkModal = document.getElementById("subnetworkModal");
  const toastNotify = document.getElementById("toastNotify");
  const waypointsBar = document.getElementById("waypointsBar");
  const activeTreeChip = document.getElementById("activeTreeChip");
  const activeTreeImg = document.getElementById("activeTreeImg");
  const activeTreeName = document.getElementById("activeTreeName");

  const camInspectorBox = document.getElementById("camInspectorBox");
  const camCoordPos = document.getElementById("camCoordPos");
  const camCoordTarget = document.getElementById("camCoordTarget");
  const btnSaveCameraView = document.getElementById("btnSaveCameraView");
  const btnCloseCamInspector = document.getElementById("btnCloseCamInspector");
  const camToast = document.getElementById("camToast");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.FogExp2(0x000000, 0.00065);

  const sceneRoot = new THREE.Group();
  scene.add(sceneRoot);

  const sceneBaseGroup = new THREE.Group();
  sceneBaseGroup.visible = false;
  sceneRoot.add(sceneBaseGroup);

  const territoryBeaconsGroup = new THREE.Group();
  territoryBeaconsGroup.visible = false;
  sceneRoot.add(territoryBeaconsGroup);

  const territoryBeacons = [];
  const raycaster = new THREE.Raycaster();
  const mouseVec = new THREE.Vector2();
  let selectedNode = null;
  let hoveredNode = null;
  let activeTerritoryTaxon = null;
  let hoveredTerritoryBeacon = null;

  let currentFov = 44;
  const aspect = window.innerWidth / window.innerHeight;
  const camera = new THREE.PerspectiveCamera(currentFov, aspect, 0.8, 9500);

  const swarmCamPos = new THREE.Vector3(0, 0, 85);
  const swarmTarget = new THREE.Vector3(0, 0, 0);

  let territoryCamPos = new THREE.Vector3(180, 270, 310);
  let territoryTarget = new THREE.Vector3(35, 0, 10);

  try {
    const savedCam = localStorage.getItem("saved_territory_cam");
    if (savedCam) {
      const parsed = JSON.parse(savedCam);
      if (parsed.pos && parsed.target) {
        territoryCamPos.set(parsed.pos.x, parsed.pos.y, parsed.pos.z);
        territoryTarget.set(parsed.target.x, parsed.target.y, parsed.target.z);
      }
    }
    if (localStorage.getItem("hide_cam_helper") === "true" && camInspectorBox) {
      camInspectorBox.classList.add("hidden");
    }
  } catch(e) {}

  const waypoints = {
    overview:    { pos: territoryCamPos, target: territoryTarget, fov: 44 },
    burro:       { pos: new THREE.Vector3(210, 85, 95),  target: new THREE.Vector3(210, 0, -10), fov: 46 },
    vaca:        { pos: new THREE.Vector3(65, 80, 215),  target: new THREE.Vector3(65, 0, 125), fov: 46 },
    techo:       { pos: new THREE.Vector3(292, 80, 10),  target: new THREE.Vector3(292, 0, -80), fov: 46 },
    perspective: { pos: new THREE.Vector3(206, 3.8, 50), target: new THREE.Vector3(214, 3.2, 135), fov: 68 }
  };

  camera.position.copy(swarmCamPos);
  camera.lookAt(swarmTarget);

  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const controls = new THREE.OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxDistance = 1800;
  controls.minDistance = 3.0;
  controls.target.copy(swarmTarget);

  // Iluminación
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(120, 240, 160);
  scene.add(dirLight);

  // Opciones de Visualización
  const opts = {
    autoRotate: true,
    layout: 'hyperbolic',
    cats: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true },
    interactions: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true }
  };

  // Convenciones Taxonómicas
  const TAXONOMIC_CONVENTIONS = {
    0: { name: 'Flora & Arbolado SIGAU', color: '#84A48B', hex: 0x84A48B, catIdx: 0, badge: 'FLORA' },
    1: { name: 'Aves (Avifauna)', color: '#38BDF8', hex: 0x38BDF8, catIdx: 1, badge: 'AVE' },
    2: { name: 'Mamíferos (Mastofauna)', color: '#F59E0B', hex: 0xF59E0B, catIdx: 2, badge: 'MAMÍFERO' },
    3: { name: 'Moluscos (Gasterópodos)', color: '#EC4899', hex: 0xEC4899, catIdx: 3, badge: 'MOLUSCO' },
    4: { name: 'Anfibios (Bioindicadores)', color: '#10B981', hex: 0x10B981, catIdx: 4, badge: 'ANFIBIO' },
    5: { name: 'Reptiles (Sauros/Ofidios)', color: '#A855F7', hex: 0xA855F7, catIdx: 5, badge: 'REPTIL' }
  };

  const palette = {
    catColors: {
      0: '#84A48B',
      1: '#38BDF8',
      2: '#F59E0B',
      3: '#EC4899',
      4: '#10B981',
      5: '#A855F7'
    },
    catNames: {
      0: 'Flora & Arbolado SIGAU',
      1: 'Aves',
      2: 'Mamíferos',
      3: 'Moluscos',
      4: 'Anfibios',
      5: 'Reptiles'
    },
    hexColors: {
      0: 0x84A48B,
      1: 0x38BDF8,
      2: 0xF59E0B,
      3: 0xEC4899,
      4: 0x10B981,
      5: 0xA855F7
    }
  };

  function generateSpeciesSvgDataUri(taxonId, speciesName, cat) {
    const colors = {
      0: ['#2A3A2F', '#84A48B'],
      1: ['#1A2E3D', '#38BDF8'],
      2: ['#3A2C18', '#F59E0B'],
      3: ['#381829', '#EC4899'],
      4: ['#143324', '#10B981'],
      5: ['#2A183B', '#A855F7']
    };
    const c = colors[cat] || colors[0];
    const cleanTitle = (speciesName || '').split('(')[0].trim().substring(0, 10);

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="32" fill="${c[0]}"/>
      <circle cx="32" cy="32" r="28" stroke="${c[1]}" stroke-width="2.5" fill="none" opacity="0.9"/>
      <circle cx="32" cy="32" r="22" stroke="${c[1]}" stroke-width="1" stroke-dasharray="2,2" fill="none" opacity="0.5"/>
      <text x="32" y="27" font-family="monospace" font-size="8.5" font-weight="900" fill="${c[1]}" text-anchor="middle">${taxonId}</text>
      <text x="32" y="41" font-family="sans-serif" font-size="7.5" font-weight="bold" fill="#ffffff" text-anchor="middle">${cleanTitle}</text>
    </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  // 1. DATASET COMPILADO DE 568 ESPECIES REALES DE KENNEDY
  const FULL_DATASET = [{"id": "SIGAU-001", "name": "Chicala, chirlobirlo, flor amarillo (SIGAU-001)", "sciname": "Chicala", "cat": 0, "role": "Especie arbórea de Kennedy • 6884 individuos en SIGAU • Altura promedio 3.3m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 6884 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Chicala, chirlobirlo, flor amarillo.jpeg"}, {"id": "SIGAU-002", "name": "Jazmin del cabo, laurel huesito (SIGAU-002)", "sciname": "Jazmin del cabo", "cat": 0, "role": "Especie arbórea de Kennedy • 5650 individuos en SIGAU • Altura promedio 5.3m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 5650 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Jazmin del cabo, laurel huesito.jpeg"}, {"id": "SIGAU-003", "name": "Sauco (SIGAU-003)", "sciname": "Sauco", "cat": 0, "role": "Especie arbórea de Kennedy • 5553 individuos en SIGAU • Altura promedio 5.5m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 5553 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Sauco.jpg"}, {"id": "SIGAU-004", "name": "Holly liso (SIGAU-004)", "sciname": "Holly liso", "cat": 0, "role": "Especie arbórea de Kennedy • 4656 individuos en SIGAU • Altura promedio 5.3m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 4656 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-005", "name": "Falso pimiento (SIGAU-005)", "sciname": "Falso pimiento", "cat": 0, "role": "Especie arbórea de Kennedy • 4548 individuos en SIGAU • Altura promedio 2.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 4548 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Falso pimiento.jpeg"}, {"id": "SIGAU-006", "name": "Eugenia (SIGAU-006)", "sciname": "Eugenia", "cat": 0, "role": "Especie arbórea de Kennedy • 4370 individuos en SIGAU • Altura promedio 1.5m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 4370 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Eugenia.jpg"}, {"id": "SIGAU-007", "name": "Palma yuca, palmiche (SIGAU-007)", "sciname": "Palma yuca", "cat": 0, "role": "Especie arbórea de Kennedy • 4356 individuos en SIGAU • Altura promedio 1.9m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 4356 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Palma yuca, palmiche.jpeg"}, {"id": "SIGAU-008", "name": "Cayeno (SIGAU-008)", "sciname": "Cayeno", "cat": 0, "role": "Especie arbórea de Kennedy • 3950 individuos en SIGAU • Altura promedio 4.5m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 3950 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Cayeno.jpeg"}, {"id": "SIGAU-009", "name": "Urapán, Fresno (SIGAU-009)", "sciname": "Urapán", "cat": 0, "role": "Especie arbórea de Kennedy • 3113 individuos en SIGAU • Altura promedio 14.8m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 3113 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Urapán, Fresno.jpg"}, {"id": "SIGAU-010", "name": "Guayacan de Manizales (SIGAU-010)", "sciname": "Guayacan de Manizales", "cat": 0, "role": "Especie arbórea de Kennedy • 3098 individuos en SIGAU • Altura promedio 10.3m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 3098 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Guayacan de Manizales.jpeg"}, {"id": "SIGAU-011", "name": "Caucho sabanero (SIGAU-011)", "sciname": "Caucho sabanero", "cat": 0, "role": "Especie arbórea de Kennedy • 2860 individuos en SIGAU • Altura promedio 5.4m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 2860 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Caucho.jpeg"}, {"id": "SIGAU-012", "name": "Ciprés, Pino ciprés, Pino (SIGAU-012)", "sciname": "Ciprés", "cat": 0, "role": "Especie arbórea de Kennedy • 2828 individuos en SIGAU • Altura promedio 11.5m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 2828 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Ciprés, Pino ciprés, Pino.jpg"}, {"id": "SIGAU-013", "name": "Caucho benjamin (SIGAU-013)", "sciname": "Caucho benjamin", "cat": 0, "role": "Especie arbórea de Kennedy • 2614 individuos en SIGAU • Altura promedio 3.2m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 2614 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Caucho.jpeg"}, {"id": "SIGAU-014", "name": "Jazmin de la china (SIGAU-014)", "sciname": "Jazmin de la china", "cat": 0, "role": "Especie arbórea de Kennedy • 2602 individuos en SIGAU • Altura promedio 2.5m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 2602 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-015", "name": "Caballero de la noche, Jazmin, Dama de noche (SIGAU-015)", "sciname": "Caballero de la noche", "cat": 0, "role": "Especie arbórea de Kennedy • 2489 individuos en SIGAU • Altura promedio 2.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 2489 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Caballero de la noche, Jazmin, Dama de noche.jpeg"}, {"id": "SIGAU-016", "name": "Acacia baracatinga, acacia sabanera, acacia nigra (SIGAU-016)", "sciname": "Acacia baracatinga", "cat": 0, "role": "Especie arbórea de Kennedy • 2160 individuos en SIGAU • Altura promedio 7.4m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 2160 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Acacia baracatinga, acacia sabanera, acacia nigra.jpeg"}, {"id": "SIGAU-017", "name": "Acacia negra, gris (SIGAU-017)", "sciname": "Acacia negra", "cat": 0, "role": "Especie arbórea de Kennedy • 1986 individuos en SIGAU • Altura promedio 3.5m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1986 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Acacia negra, gris.jpeg"}, {"id": "SIGAU-018", "name": "Acacia japonesa (SIGAU-018)", "sciname": "Acacia japonesa", "cat": 0, "role": "Especie arbórea de Kennedy • 1934 individuos en SIGAU • Altura promedio 7.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1934 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Acacia.jpeg"}, {"id": "SIGAU-019", "name": "Cerezo (SIGAU-019)", "sciname": "Cerezo", "cat": 0, "role": "Especie arbórea de Kennedy • 1901 individuos en SIGAU • Altura promedio 5.6m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1901 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Cerezo.jpg"}, {"id": "SIGAU-020", "name": "Araucaria (SIGAU-020)", "sciname": "Araucaria", "cat": 0, "role": "Especie arbórea de Kennedy • 1844 individuos en SIGAU • Altura promedio 10.4m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1844 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Araucaria.jpg"}, {"id": "SIGAU-021", "name": "Eucalipto común (SIGAU-021)", "sciname": "Eucalipto común", "cat": 0, "role": "Especie arbórea de Kennedy • 1776 individuos en SIGAU • Altura promedio 12.8m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1776 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Eucalipto.jpg"}, {"id": "SIGAU-022", "name": "Hayuelo (SIGAU-022)", "sciname": "Hayuelo", "cat": 0, "role": "Especie arbórea de Kennedy • 1618 individuos en SIGAU • Altura promedio 3.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1618 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Hayuelo.jpeg"}, {"id": "SIGAU-023", "name": "Calistemo lloron (SIGAU-023)", "sciname": "Calistemo lloron", "cat": 0, "role": "Especie arbórea de Kennedy • 1451 individuos en SIGAU • Altura promedio 6.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1451 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Calistemo.jpeg"}, {"id": "SIGAU-024", "name": "Pino libro (SIGAU-024)", "sciname": "Pino libro", "cat": 0, "role": "Especie arbórea de Kennedy • 1262 individuos en SIGAU • Altura promedio 0.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1262 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Pino.jpg"}, {"id": "SIGAU-025", "name": "Corono (SIGAU-025)", "sciname": "Corono", "cat": 0, "role": "Especie arbórea de Kennedy • 1244 individuos en SIGAU • Altura promedio 3.8m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1244 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Corono.jpg"}, {"id": "SIGAU-026", "name": "Durazno comun (SIGAU-026)", "sciname": "Durazno comun", "cat": 0, "role": "Especie arbórea de Kennedy • 1165 individuos en SIGAU • Altura promedio 3.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1165 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-027", "name": "Eucalipto de flor, eucalipto lavabotella (SIGAU-027)", "sciname": "Eucalipto de flor", "cat": 0, "role": "Especie arbórea de Kennedy • 1159 individuos en SIGAU • Altura promedio 1.6m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1159 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Eucalipto de flor, eucalipto lavabotella.jpeg"}, {"id": "SIGAU-028", "name": "Abutilon rojo y amarillo (Farolito) (SIGAU-028)", "sciname": "Abutilon rojo y amarillo (Farolito)", "cat": 0, "role": "Especie arbórea de Kennedy • 1090 individuos en SIGAU • Altura promedio 3.6m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1090 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-029", "name": "Aliso, fresno, chaquiro (SIGAU-029)", "sciname": "Aliso", "cat": 0, "role": "Especie arbórea de Kennedy • 1058 individuos en SIGAU • Altura promedio 7.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1058 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Aliso, fresno, chaquiro.jpeg"}, {"id": "SIGAU-030", "name": "Cajeto, garagay, urapo (SIGAU-030)", "sciname": "Cajeto", "cat": 0, "role": "Especie arbórea de Kennedy • 1036 individuos en SIGAU • Altura promedio 3.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1036 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Cajeto, garagay, urapo.jpg"}, {"id": "SIGAU-031", "name": "Arrayan blanco (SIGAU-031)", "sciname": "Arrayan blanco", "cat": 0, "role": "Especie arbórea de Kennedy • 1004 individuos en SIGAU • Altura promedio 1.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1004 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Arrayan blanco.jpeg"}, {"id": "SIGAU-032", "name": "Liquidambar, estoraque (SIGAU-032)", "sciname": "Liquidambar", "cat": 0, "role": "Especie arbórea de Kennedy • 964 individuos en SIGAU • Altura promedio 1.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 964 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Liquidambar, estoraque.jpeg"}, {"id": "SIGAU-033", "name": "Mangle de tierra fria (SIGAU-033)", "sciname": "Mangle de tierra fria", "cat": 0, "role": "Especie arbórea de Kennedy • 902 individuos en SIGAU • Altura promedio 3.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 902 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Mangle de tierra fria.jpeg"}, {"id": "SIGAU-034", "name": "Chilco (SIGAU-034)", "sciname": "Chilco", "cat": 0, "role": "Especie arbórea de Kennedy • 884 individuos en SIGAU • Altura promedio 3.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 884 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Chilco.jpg"}, {"id": "SIGAU-035", "name": "Ligustrum (SIGAU-035)", "sciname": "Ligustrum", "cat": 0, "role": "Especie arbórea de Kennedy • 875 individuos en SIGAU • Altura promedio 7.5m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 875 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Ligustrum.jpg"}, {"id": "SIGAU-036", "name": "Schefflera, Pategallina hojipequeña (SIGAU-036)", "sciname": "Schefflera", "cat": 0, "role": "Especie arbórea de Kennedy • 805 individuos en SIGAU • Altura promedio 6.4m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 805 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Schefflera, Pategallina hojipequeña.jpg"}, {"id": "SIGAU-037", "name": "Cajeto (SIGAU-037)", "sciname": "Cajeto", "cat": 0, "role": "Especie arbórea de Kennedy • 777 individuos en SIGAU • Altura promedio 4.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 777 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Cajeto.jpg"}, {"id": "SIGAU-038", "name": "Nogal, cedro nogal, cedro negro (SIGAU-038)", "sciname": "Nogal", "cat": 0, "role": "Especie arbórea de Kennedy • 776 individuos en SIGAU • Altura promedio 0.9m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 776 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Nogal, cedro nogal, cedro negro.jpg"}, {"id": "SIGAU-039", "name": "Schefflera, Pategallina hojigrande (SIGAU-039)", "sciname": "Schefflera", "cat": 0, "role": "Especie arbórea de Kennedy • 770 individuos en SIGAU • Altura promedio 9.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 770 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Schefflera, Pategallina hojigrande.jpg"}, {"id": "SIGAU-040", "name": "Roble (SIGAU-040)", "sciname": "Roble", "cat": 0, "role": "Especie arbórea de Kennedy • 755 individuos en SIGAU • Altura promedio 4.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 755 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Roble.jpg"}, {"id": "SIGAU-041", "name": "Acacia morada (SIGAU-041)", "sciname": "Acacia morada", "cat": 0, "role": "Especie arbórea de Kennedy • 700 individuos en SIGAU • Altura promedio 3.6m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 700 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Acacia morada.jpg"}, {"id": "SIGAU-042", "name": "Caucho (SIGAU-042)", "sciname": "Caucho", "cat": 0, "role": "Especie arbórea de Kennedy • 689 individuos en SIGAU • Altura promedio 0.8m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 689 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Caucho.jpeg"}, {"id": "SIGAU-043", "name": "Palma de yuca, Palma de bayoneta (SIGAU-043)", "sciname": "Palma de yuca", "cat": 0, "role": "Especie arbórea de Kennedy • 686 individuos en SIGAU • Altura promedio 2.5m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 686 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-044", "name": "Sauce lloron (SIGAU-044)", "sciname": "Sauce lloron", "cat": 0, "role": "Especie arbórea de Kennedy • 658 individuos en SIGAU • Altura promedio 3.6m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 658 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Sauce lloron.jpeg"}, {"id": "SIGAU-045", "name": "Cucharo (SIGAU-045)", "sciname": "Cucharo", "cat": 0, "role": "Especie arbórea de Kennedy • 644 individuos en SIGAU • Altura promedio 6.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 644 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Cucharo.jpeg"}, {"id": "SIGAU-046", "name": "Palma fenix (SIGAU-046)", "sciname": "Palma fenix", "cat": 0, "role": "Especie arbórea de Kennedy • 621 individuos en SIGAU • Altura promedio 2.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 621 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-047", "name": "Alcaparro enano (SIGAU-047)", "sciname": "Alcaparro enano", "cat": 0, "role": "Especie arbórea de Kennedy • 619 individuos en SIGAU • Altura promedio 2.5m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 619 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Alcaparro enano.JPG"}, {"id": "SIGAU-048", "name": "Cerezo, capuli (SIGAU-048)", "sciname": "Cerezo", "cat": 0, "role": "Especie arbórea de Kennedy • 584 individuos en SIGAU • Altura promedio 4.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 584 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Cerezo, capuli.jpg"}, {"id": "SIGAU-049", "name": "Naranjo (SIGAU-049)", "sciname": "Naranjo", "cat": 0, "role": "Especie arbórea de Kennedy • 552 individuos en SIGAU • Altura promedio 0.9m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 552 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Naranjo.jpg"}, {"id": "SIGAU-050", "name": "Cedro, cedro andino, cedro clavel (SIGAU-050)", "sciname": "Cedro", "cat": 0, "role": "Especie arbórea de Kennedy • 544 individuos en SIGAU • Altura promedio 6.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 544 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Cedro, cedro andino, cedro clavel.jpg"}, {"id": "SIGAU-051", "name": "Lavanda (SIGAU-051)", "sciname": "Lavanda", "cat": 0, "role": "Especie arbórea de Kennedy • 528 individuos en SIGAU • Altura promedio 2.4m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 528 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Lavanda.jpg"}, {"id": "SIGAU-052", "name": "Pino pátula (SIGAU-052)", "sciname": "Pino pátula", "cat": 0, "role": "Especie arbórea de Kennedy • 509 individuos en SIGAU • Altura promedio 2.8m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 509 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Pino pátula.jpeg"}, {"id": "SIGAU-053", "name": "Caucho tequendama (SIGAU-053)", "sciname": "Caucho tequendama", "cat": 0, "role": "Especie arbórea de Kennedy • 478 individuos en SIGAU • Altura promedio 4.8m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 478 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Caucho.jpeg"}, {"id": "SIGAU-054", "name": "Abutilon blanco (SIGAU-054)", "sciname": "Abutilon blanco", "cat": 0, "role": "Especie arbórea de Kennedy • 466 individuos en SIGAU • Altura promedio 2.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 466 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-055", "name": "Holly espinoso (SIGAU-055)", "sciname": "Holly espinoso", "cat": 0, "role": "Especie arbórea de Kennedy • 462 individuos en SIGAU • Altura promedio 3.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 462 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Pino.jpg"}, {"id": "SIGAU-056", "name": "Higuerillo (SIGAU-056)", "sciname": "Higuerillo", "cat": 0, "role": "Especie arbórea de Kennedy • 455 individuos en SIGAU • Altura promedio 6.6m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 455 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-057", "name": "Caucho de la india, caucho (SIGAU-057)", "sciname": "Caucho de la india", "cat": 0, "role": "Especie arbórea de Kennedy • 450 individuos en SIGAU • Altura promedio 2.9m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 450 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Caucho de la india, caucho.jpeg"}, {"id": "SIGAU-058", "name": "Eucalipto pomarroso (SIGAU-058)", "sciname": "Eucalipto pomarroso", "cat": 0, "role": "Especie arbórea de Kennedy • 444 individuos en SIGAU • Altura promedio 7.6m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 444 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Eucalipto.jpg"}, {"id": "SIGAU-059", "name": "Ciro (SIGAU-059)", "sciname": "Ciro", "cat": 0, "role": "Especie arbórea de Kennedy • 433 individuos en SIGAU • Altura promedio 2.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 433 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Ciro.jpg"}, {"id": "SIGAU-060", "name": "Gaque (SIGAU-060)", "sciname": "Gaque", "cat": 0, "role": "Especie arbórea de Kennedy • 427 individuos en SIGAU • Altura promedio 1.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 427 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Gaque.jpeg"}, {"id": "SIGAU-061", "name": "Sietecueros nazareno (SIGAU-061)", "sciname": "Sietecueros nazareno", "cat": 0, "role": "Especie arbórea de Kennedy • 425 individuos en SIGAU • Altura promedio 4.5m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 425 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Sietecueros nazareno.jpg"}, {"id": "SIGAU-062", "name": "Espino, Garbancillo (SIGAU-062)", "sciname": "Espino", "cat": 0, "role": "Especie arbórea de Kennedy • 425 individuos en SIGAU • Altura promedio 3.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 425 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Espino, Garbancillo.jpeg"}, {"id": "SIGAU-063", "name": "Alcaparro doble (SIGAU-063)", "sciname": "Alcaparro doble", "cat": 0, "role": "Especie arbórea de Kennedy • 404 individuos en SIGAU • Altura promedio 5.5m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 404 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-064", "name": "Mano de oso (SIGAU-064)", "sciname": "Mano de oso", "cat": 0, "role": "Especie arbórea de Kennedy • 395 individuos en SIGAU • Altura promedio 0.9m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 395 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Mano de oso.jpeg"}, {"id": "SIGAU-065", "name": "Chiripique (SIGAU-065)", "sciname": "Chiripique", "cat": 0, "role": "Especie arbórea de Kennedy • 395 individuos en SIGAU • Altura promedio 1.9m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 395 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Chiripique.jpg"}, {"id": "SIGAU-066", "name": "Brevo (SIGAU-066)", "sciname": "Brevo", "cat": 0, "role": "Especie arbórea de Kennedy • 388 individuos en SIGAU • Altura promedio 2.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 388 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Brevo.jpg"}, {"id": "SIGAU-067", "name": "Chicala rosado (SIGAU-067)", "sciname": "Chicala rosado", "cat": 0, "role": "Especie arbórea de Kennedy • 378 individuos en SIGAU • Altura promedio 3.5m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 378 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Rosa.jpg"}, {"id": "SIGAU-068", "name": "Pajarito (SIGAU-068)", "sciname": "Pajarito", "cat": 0, "role": "Especie arbórea de Kennedy • 377 individuos en SIGAU • Altura promedio 3.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 377 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Pajarito.jpeg"}, {"id": "SIGAU-069", "name": "Feijoa (SIGAU-069)", "sciname": "Feijoa", "cat": 0, "role": "Especie arbórea de Kennedy • 374 individuos en SIGAU • Altura promedio 0.8m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 374 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Feijoa.jpeg"}, {"id": "SIGAU-070", "name": "Caballero de la noche (SIGAU-070)", "sciname": "Caballero de la noche", "cat": 0, "role": "Especie arbórea de Kennedy • 372 individuos en SIGAU • Altura promedio 3.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 372 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Caballero de la noche.jpeg"}, {"id": "SIGAU-071", "name": "Milflores (SIGAU-071)", "sciname": "Milflores", "cat": 0, "role": "Especie arbórea de Kennedy • 369 individuos en SIGAU • Altura promedio 0.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 369 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-072", "name": "Pino candelabro (SIGAU-072)", "sciname": "Pino candelabro", "cat": 0, "role": "Especie arbórea de Kennedy • 358 individuos en SIGAU • Altura promedio 7.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 358 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Pino.jpg"}, {"id": "SIGAU-073", "name": "Duraznillo, velitas (SIGAU-073)", "sciname": "Duraznillo", "cat": 0, "role": "Especie arbórea de Kennedy • 334 individuos en SIGAU • Altura promedio 4.2m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 334 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Duraznillo, velitas.jpg"}, {"id": "SIGAU-074", "name": "Sangregao, drago, croto (SIGAU-074)", "sciname": "Sangregao", "cat": 0, "role": "Especie arbórea de Kennedy • 332 individuos en SIGAU • Altura promedio 1.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 332 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Sangregao, drago, croto.jpg"}, {"id": "SIGAU-075", "name": "Palma payanesa (SIGAU-075)", "sciname": "Palma payanesa", "cat": 0, "role": "Especie arbórea de Kennedy • 329 individuos en SIGAU • Altura promedio 2.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 329 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-076", "name": "Dividivi de tierra fria (SIGAU-076)", "sciname": "Dividivi de tierra fria", "cat": 0, "role": "Especie arbórea de Kennedy • 313 individuos en SIGAU • Altura promedio 2.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 313 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-077", "name": "Pino romeron (SIGAU-077)", "sciname": "Pino romeron", "cat": 0, "role": "Especie arbórea de Kennedy • 313 individuos en SIGAU • Altura promedio 3.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 313 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Pino romeron.jpeg"}, {"id": "SIGAU-078", "name": "Sietecueros real (SIGAU-078)", "sciname": "Sietecueros real", "cat": 0, "role": "Especie arbórea de Kennedy • 310 individuos en SIGAU • Altura promedio 2.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 310 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-079", "name": "Poligala (SIGAU-079)", "sciname": "Poligala", "cat": 0, "role": "Especie arbórea de Kennedy • 303 individuos en SIGAU • Altura promedio 1.4m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 303 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Poligala.jpeg"}, {"id": "SIGAU-080", "name": "Palma Alejandra (SIGAU-080)", "sciname": "Palma Alejandra", "cat": 0, "role": "Especie arbórea de Kennedy • 300 individuos en SIGAU • Altura promedio 2.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 300 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Palma Alejandra.jpg"}, {"id": "SIGAU-081", "name": "Roble australiano (SIGAU-081)", "sciname": "Roble australiano", "cat": 0, "role": "Especie arbórea de Kennedy • 286 individuos en SIGAU • Altura promedio 2.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 286 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Roble australiano.jpeg"}, {"id": "SIGAU-082", "name": "Sombrilla japonesa (SIGAU-082)", "sciname": "Sombrilla japonesa", "cat": 0, "role": "Especie arbórea de Kennedy • 281 individuos en SIGAU • Altura promedio 3.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 281 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Sombrilla japonesa.jpeg"}, {"id": "SIGAU-083", "name": "Mandarina (SIGAU-083)", "sciname": "Mandarina", "cat": 0, "role": "Especie arbórea de Kennedy • 274 individuos en SIGAU • Altura promedio 1.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 274 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Mandarina.jpg"}, {"id": "SIGAU-084", "name": "Palma de cera, Palma blanca (SIGAU-084)", "sciname": "Palma de cera", "cat": 0, "role": "Especie arbórea de Kennedy • 269 individuos en SIGAU • Altura promedio 0.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 269 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Palma de cera, Palma blanca.jpg"}, {"id": "SIGAU-085", "name": "Aguacate (SIGAU-085)", "sciname": "Aguacate", "cat": 0, "role": "Especie arbórea de Kennedy • 268 individuos en SIGAU • Altura promedio 4.6m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 268 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Aguacate.jpg"}, {"id": "SIGAU-086", "name": "Fucsia arbustiva (SIGAU-086)", "sciname": "Fucsia arbustiva", "cat": 0, "role": "Especie arbórea de Kennedy • 262 individuos en SIGAU • Altura promedio 5.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 262 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-087", "name": "Calistemo (SIGAU-087)", "sciname": "Calistemo", "cat": 0, "role": "Especie arbórea de Kennedy • 227 individuos en SIGAU • Altura promedio 1.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 227 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Calistemo.jpeg"}, {"id": "SIGAU-088", "name": "Garbancillo (SIGAU-088)", "sciname": "Garbancillo", "cat": 0, "role": "Especie arbórea de Kennedy • 224 individuos en SIGAU • Altura promedio 3.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 224 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Garbancillo.jpg"}, {"id": "SIGAU-089", "name": "Acacia de jardin (SIGAU-089)", "sciname": "Acacia de jardin", "cat": 0, "role": "Especie arbórea de Kennedy • 213 individuos en SIGAU • Altura promedio 6.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 213 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Acacia.jpeg"}, {"id": "SIGAU-090", "name": "Sangregado (SIGAU-090)", "sciname": "Sangregado", "cat": 0, "role": "Especie arbórea de Kennedy • 213 individuos en SIGAU • Altura promedio 1.3m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 213 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Sangregado.jpg"}, {"id": "SIGAU-091", "name": "Cipres Japones, criptomeria (SIGAU-091)", "sciname": "Cipres Japones", "cat": 0, "role": "Especie arbórea de Kennedy • 185 individuos en SIGAU • Altura promedio 0.8m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 185 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Cipres Japones, criptomeria.jpg"}, {"id": "SIGAU-092", "name": "Pino colombiano, pino de pacho, pino romerón (SIGAU-092)", "sciname": "Pino colombiano", "cat": 0, "role": "Especie arbórea de Kennedy • 173 individuos en SIGAU • Altura promedio 1.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 173 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Pino colombiano, pino de pacho, pino romerón.jpg"}, {"id": "SIGAU-093", "name": "Callistemo (SIGAU-093)", "sciname": "Callistemo", "cat": 0, "role": "Especie arbórea de Kennedy • 170 individuos en SIGAU • Altura promedio 2.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 170 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Callistemo.jpeg"}, {"id": "SIGAU-094", "name": "Araucaria crespa (SIGAU-094)", "sciname": "Araucaria crespa", "cat": 0, "role": "Especie arbórea de Kennedy • 169 individuos en SIGAU • Altura promedio 3.6m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 169 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Araucaria.jpg"}, {"id": "SIGAU-095", "name": "Laurel de cera (hoja pequeña) (SIGAU-095)", "sciname": "Laurel de cera (hoja pequeña)", "cat": 0, "role": "Especie arbórea de Kennedy • 168 individuos en SIGAU • Altura promedio 2.3m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 168 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Laurel de cera (hoja pequeña).jpeg"}, {"id": "SIGAU-096", "name": "Nispero (SIGAU-096)", "sciname": "Nispero", "cat": 0, "role": "Especie arbórea de Kennedy • 167 individuos en SIGAU • Altura promedio 1.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 167 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Nispero.jpg"}, {"id": "SIGAU-097", "name": "Ciprés enano (SIGAU-097)", "sciname": "Ciprés enano", "cat": 0, "role": "Especie arbórea de Kennedy • 160 individuos en SIGAU • Altura promedio 1.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 160 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Ciprés enano.jpeg"}, {"id": "SIGAU-098", "name": "Magnolio (SIGAU-098)", "sciname": "Magnolio", "cat": 0, "role": "Especie arbórea de Kennedy • 156 individuos en SIGAU • Altura promedio 5.6m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 156 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Magnolio.jpg"}, {"id": "SIGAU-099", "name": "Limon (SIGAU-099)", "sciname": "Limon", "cat": 0, "role": "Especie arbórea de Kennedy • 155 individuos en SIGAU • Altura promedio 0.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 155 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Limon.jpeg"}, {"id": "SIGAU-100", "name": "Cariseco (SIGAU-100)", "sciname": "Cariseco", "cat": 0, "role": "Especie arbórea de Kennedy • 148 individuos en SIGAU • Altura promedio 1.2m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 148 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Cariseco.jpg"}, {"id": "SIGAU-101", "name": "Tabaquillo (SIGAU-101)", "sciname": "Tabaquillo", "cat": 0, "role": "Especie arbórea de Kennedy • 144 individuos en SIGAU • Altura promedio 2.5m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 144 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Tabaquillo.jpg"}, {"id": "SIGAU-102", "name": "Garrocho (SIGAU-102)", "sciname": "Garrocho", "cat": 0, "role": "Especie arbórea de Kennedy • 143 individuos en SIGAU • Altura promedio 1.9m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 143 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Garrocho.jpg"}, {"id": "SIGAU-103", "name": "Tibar (SIGAU-103)", "sciname": "Tibar", "cat": 0, "role": "Especie arbórea de Kennedy • 142 individuos en SIGAU • Altura promedio 1.2m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 142 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Tibar.jpeg"}, {"id": "SIGAU-104", "name": "Guayabo (SIGAU-104)", "sciname": "Guayabo", "cat": 0, "role": "Especie arbórea de Kennedy • 140 individuos en SIGAU • Altura promedio 4.6m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 140 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Guayabo.jpeg"}, {"id": "SIGAU-105", "name": "Cedrillo, Yuco (SIGAU-105)", "sciname": "Cedrillo", "cat": 0, "role": "Especie arbórea de Kennedy • 139 individuos en SIGAU • Altura promedio 2.4m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 139 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Cedrillo, Yuco.jpeg"}, {"id": "SIGAU-106", "name": "Arrayan negro (SIGAU-106)", "sciname": "Arrayan negro", "cat": 0, "role": "Especie arbórea de Kennedy • 138 individuos en SIGAU • Altura promedio 2.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 138 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Arrayan negro.jpg"}, {"id": "SIGAU-107", "name": "Palma coquito (SIGAU-107)", "sciname": "Palma coquito", "cat": 0, "role": "Especie arbórea de Kennedy • 134 individuos en SIGAU • Altura promedio 1.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 134 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-108", "name": "Metrosideros (SIGAU-108)", "sciname": "Metrosideros", "cat": 0, "role": "Especie arbórea de Kennedy • 133 individuos en SIGAU • Altura promedio 1.6m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 133 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Metrosideros.jpeg"}, {"id": "SIGAU-109", "name": "Tibar, pagoda o rodamonte (SIGAU-109)", "sciname": "Tibar", "cat": 0, "role": "Especie arbórea de Kennedy • 129 individuos en SIGAU • Altura promedio 3.6m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 129 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Tibar, pagoda o rodamonte.jpeg"}, {"id": "SIGAU-110", "name": "Mortillo (SIGAU-110)", "sciname": "Mortillo", "cat": 0, "role": "Especie arbórea de Kennedy • 128 individuos en SIGAU • Altura promedio 1.3m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 128 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-111", "name": "Palma roebeleni (SIGAU-111)", "sciname": "Palma roebeleni", "cat": 0, "role": "Especie arbórea de Kennedy • 127 individuos en SIGAU • Altura promedio 1.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 127 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-112", "name": "Lupinus (SIGAU-112)", "sciname": "Lupinus", "cat": 0, "role": "Especie arbórea de Kennedy • 125 individuos en SIGAU • Altura promedio 1.6m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 125 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Lupinus.jpg"}, {"id": "SIGAU-113", "name": "Cipres (SIGAU-113)", "sciname": "Cipres", "cat": 0, "role": "Especie arbórea de Kennedy • 124 individuos en SIGAU • Altura promedio 1.4m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 124 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Cipres.jpg"}, {"id": "SIGAU-114", "name": "Chocho (SIGAU-114)", "sciname": "Chocho", "cat": 0, "role": "Especie arbórea de Kennedy • 121 individuos en SIGAU • Altura promedio 3.9m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 121 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Chocho.jpg"}, {"id": "SIGAU-115", "name": "Cipres italiano (SIGAU-115)", "sciname": "Cipres italiano", "cat": 0, "role": "Especie arbórea de Kennedy • 119 individuos en SIGAU • Altura promedio 3.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 119 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Cipres italiano.jpg"}, {"id": "SIGAU-116", "name": "Carbonero rojo (SIGAU-116)", "sciname": "Carbonero rojo", "cat": 0, "role": "Especie arbórea de Kennedy • 113 individuos en SIGAU • Altura promedio 1.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 113 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Carbonero rojo.jpeg"}, {"id": "SIGAU-117", "name": "Tinto (SIGAU-117)", "sciname": "Tinto", "cat": 0, "role": "Especie arbórea de Kennedy • 113 individuos en SIGAU • Altura promedio 3.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 113 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Tinto.jpeg"}, {"id": "SIGAU-118", "name": "Mermelada (SIGAU-118)", "sciname": "Mermelada", "cat": 0, "role": "Especie arbórea de Kennedy • 109 individuos en SIGAU • Altura promedio 2.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 109 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Mermelada.jpg"}, {"id": "SIGAU-119", "name": "Papayuelo (SIGAU-119)", "sciname": "Papayuelo", "cat": 0, "role": "Especie arbórea de Kennedy • 106 individuos en SIGAU • Altura promedio 3.4m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 106 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-120", "name": "Laurel de cera (SIGAU-120)", "sciname": "Laurel de cera", "cat": 0, "role": "Especie arbórea de Kennedy • 103 individuos en SIGAU • Altura promedio 2.3m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 103 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Laurel de cera.jpeg"}, {"id": "SIGAU-121", "name": "Curapin, Campanilla (SIGAU-121)", "sciname": "Curapin", "cat": 0, "role": "Especie arbórea de Kennedy • 100 individuos en SIGAU • Altura promedio 0.8m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 100 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Curapin, Campanilla.jpeg"}, {"id": "SIGAU-122", "name": "Raphiolepys (SIGAU-122)", "sciname": "Raphiolepys", "cat": 0, "role": "Especie arbórea de Kennedy • 98 individuos en SIGAU • Altura promedio 0.9m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 98 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-123", "name": "Guamo santafereño (SIGAU-123)", "sciname": "Guamo santafereño", "cat": 0, "role": "Especie arbórea de Kennedy • 97 individuos en SIGAU • Altura promedio 3.2m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 97 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Guamo.jpg"}, {"id": "SIGAU-124", "name": "Cajeto sp (SIGAU-124)", "sciname": "Cajeto sp", "cat": 0, "role": "Especie arbórea de Kennedy • 97 individuos en SIGAU • Altura promedio 2.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 97 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Cajeto.jpg"}, {"id": "SIGAU-125", "name": "Baeckea (SIGAU-125)", "sciname": "Baeckea", "cat": 0, "role": "Especie arbórea de Kennedy • 96 individuos en SIGAU • Altura promedio 1.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 96 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Baeckea.jpeg"}, {"id": "SIGAU-126", "name": "Arbol de Te (SIGAU-126)", "sciname": "Arbol de Te", "cat": 0, "role": "Especie arbórea de Kennedy • 93 individuos en SIGAU • Altura promedio 1.5m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 93 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Arbol de Te.jpg"}, {"id": "SIGAU-127", "name": "Acacia (SIGAU-127)", "sciname": "Acacia", "cat": 0, "role": "Especie arbórea de Kennedy • 92 individuos en SIGAU • Altura promedio 3.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 92 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Acacia.jpeg"}, {"id": "SIGAU-128", "name": "Rama negra (SIGAU-128)", "sciname": "Rama negra", "cat": 0, "role": "Especie arbórea de Kennedy • 90 individuos en SIGAU • Altura promedio 1.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 90 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Rama negra.jpg"}, {"id": "SIGAU-129", "name": "Endrino (SIGAU-129)", "sciname": "Endrino", "cat": 0, "role": "Especie arbórea de Kennedy • 88 individuos en SIGAU • Altura promedio 2.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 88 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Endrino.jpg"}, {"id": "SIGAU-130", "name": "Raque, San juanito (SIGAU-130)", "sciname": "Raque", "cat": 0, "role": "Especie arbórea de Kennedy • 87 individuos en SIGAU • Altura promedio 0.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 87 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Raque, San juanito.jpeg"}, {"id": "SIGAU-131", "name": "Abelia (SIGAU-131)", "sciname": "Abelia", "cat": 0, "role": "Especie arbórea de Kennedy • 83 individuos en SIGAU • Altura promedio 1.3m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 83 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Abelia.jpg"}, {"id": "SIGAU-132", "name": "Arboloco (SIGAU-132)", "sciname": "Arboloco", "cat": 0, "role": "Especie arbórea de Kennedy • 81 individuos en SIGAU • Altura promedio 0.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 81 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Arboloco.jpg"}, {"id": "SIGAU-133", "name": "Carbonero (SIGAU-133)", "sciname": "Carbonero", "cat": 0, "role": "Especie arbórea de Kennedy • 77 individuos en SIGAU • Altura promedio 3.5m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 77 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Carbonero.jpg"}, {"id": "SIGAU-134", "name": "Azara (SIGAU-134)", "sciname": "Azara", "cat": 0, "role": "Especie arbórea de Kennedy • 77 individuos en SIGAU • Altura promedio 1.4m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 77 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Azara.jpeg"}, {"id": "SIGAU-135", "name": "Arrayan (SIGAU-135)", "sciname": "Arrayan", "cat": 0, "role": "Especie arbórea de Kennedy • 76 individuos en SIGAU • Altura promedio 3.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 76 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Arrayan.gif"}, {"id": "SIGAU-136", "name": "Abutilon quesito (SIGAU-136)", "sciname": "Abutilon quesito", "cat": 0, "role": "Especie arbórea de Kennedy • 75 individuos en SIGAU • Altura promedio 4.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 75 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-137", "name": "Borrachero blanco (SIGAU-137)", "sciname": "Borrachero blanco", "cat": 0, "role": "Especie arbórea de Kennedy • 74 individuos en SIGAU • Altura promedio 4.2m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 74 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Borrachero.jpg"}, {"id": "SIGAU-138", "name": "Arbol de corcho (SIGAU-138)", "sciname": "Arbol de corcho", "cat": 0, "role": "Especie arbórea de Kennedy • 73 individuos en SIGAU • Altura promedio 4.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 73 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Arbol de corcho.jpeg"}, {"id": "SIGAU-139", "name": "Acebo (SIGAU-139)", "sciname": "Acebo", "cat": 0, "role": "Especie arbórea de Kennedy • 70 individuos en SIGAU • Altura promedio 1.2m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 70 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Acebo.jpg"}, {"id": "SIGAU-140", "name": "Palma washingtoniana (SIGAU-140)", "sciname": "Palma washingtoniana", "cat": 0, "role": "Especie arbórea de Kennedy • 69 individuos en SIGAU • Altura promedio 5.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 69 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-141", "name": "Ciruelo (SIGAU-141)", "sciname": "Ciruelo", "cat": 0, "role": "Especie arbórea de Kennedy • 69 individuos en SIGAU • Altura promedio 3.2m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 69 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Ciruelo.jpg"}, {"id": "SIGAU-142", "name": "Pino colombiano, chaquiro (SIGAU-142)", "sciname": "Pino colombiano", "cat": 0, "role": "Especie arbórea de Kennedy • 67 individuos en SIGAU • Altura promedio 2.3m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 67 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Pino colombiano, chaquiro.jpg"}, {"id": "SIGAU-143", "name": "Cariseco, Tres hojas (SIGAU-143)", "sciname": "Cariseco", "cat": 0, "role": "Especie arbórea de Kennedy • 65 individuos en SIGAU • Altura promedio 2.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 65 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Cariseco, Tres hojas.jpg"}, {"id": "SIGAU-144", "name": "Arbol de Fuego (SIGAU-144)", "sciname": "Arbol de Fuego", "cat": 0, "role": "Especie arbórea de Kennedy • 65 individuos en SIGAU • Altura promedio 1.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 65 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-145", "name": "Eucalipto (SIGAU-145)", "sciname": "Eucalipto", "cat": 0, "role": "Especie arbórea de Kennedy • 64 individuos en SIGAU • Altura promedio 0.8m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 64 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Eucalipto.jpg"}, {"id": "SIGAU-146", "name": "Palma cinta (SIGAU-146)", "sciname": "Palma cinta", "cat": 0, "role": "Especie arbórea de Kennedy • 62 individuos en SIGAU • Altura promedio 1.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 62 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-147", "name": "Ayer, hoy y mañana (SIGAU-147)", "sciname": "Ayer", "cat": 0, "role": "Especie arbórea de Kennedy • 61 individuos en SIGAU • Altura promedio 2.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 61 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Ayer, hoy y mañana.jpg"}, {"id": "SIGAU-148", "name": "Gualanday (SIGAU-148)", "sciname": "Gualanday", "cat": 0, "role": "Especie arbórea de Kennedy • 60 individuos en SIGAU • Altura promedio 4.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 60 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Gualanday.jpeg"}, {"id": "SIGAU-149", "name": "Azalea (SIGAU-149)", "sciname": "Azalea", "cat": 0, "role": "Especie arbórea de Kennedy • 59 individuos en SIGAU • Altura promedio 0.8m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 59 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Azalea.jpeg"}, {"id": "SIGAU-150", "name": "Arbol de hierro (SIGAU-150)", "sciname": "Arbol de hierro", "cat": 0, "role": "Especie arbórea de Kennedy • 58 individuos en SIGAU • Altura promedio 2.5m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 58 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Arbol de hierro.jpeg"}, {"id": "SIGAU-151", "name": "Tibar, tobo, rodamonte (SIGAU-151)", "sciname": "Tibar", "cat": 0, "role": "Especie arbórea de Kennedy • 57 individuos en SIGAU • Altura promedio 4.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 57 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Tibar, tobo, rodamonte.jpeg"}, {"id": "SIGAU-152", "name": "Guamo (SIGAU-152)", "sciname": "Guamo", "cat": 0, "role": "Especie arbórea de Kennedy • 57 individuos en SIGAU • Altura promedio 1.6m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 57 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Guamo.jpg"}, {"id": "SIGAU-153", "name": "Cedrillo (SIGAU-153)", "sciname": "Cedrillo", "cat": 0, "role": "Especie arbórea de Kennedy • 56 individuos en SIGAU • Altura promedio 1.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 56 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Cedrillo.jpeg"}, {"id": "SIGAU-154", "name": "Agracejo (SIGAU-154)", "sciname": "Agracejo", "cat": 0, "role": "Especie arbórea de Kennedy • 54 individuos en SIGAU • Altura promedio 1.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 54 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Agracejo.jpeg"}, {"id": "SIGAU-155", "name": "Palma de cera (SIGAU-155)", "sciname": "Palma de cera", "cat": 0, "role": "Especie arbórea de Kennedy • 53 individuos en SIGAU • Altura promedio 8.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 53 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Palma de cera.jpg"}, {"id": "SIGAU-156", "name": "Abutilon  pequeño (SIGAU-156)", "sciname": "Abutilon  pequeño", "cat": 0, "role": "Especie arbórea de Kennedy • 53 individuos en SIGAU • Altura promedio 1.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 53 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-157", "name": "Tuno esmeraldo (SIGAU-157)", "sciname": "Tuno esmeraldo", "cat": 0, "role": "Especie arbórea de Kennedy • 53 individuos en SIGAU • Altura promedio 1.2m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 53 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Tuno esmeraldo.jpeg"}, {"id": "SIGAU-158", "name": "Mimbre (SIGAU-158)", "sciname": "Mimbre", "cat": 0, "role": "Especie arbórea de Kennedy • 51 individuos en SIGAU • Altura promedio 5.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 51 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Mimbre.jpg"}, {"id": "SIGAU-159", "name": "Eucalipto plateado (SIGAU-159)", "sciname": "Eucalipto plateado", "cat": 0, "role": "Especie arbórea de Kennedy • 50 individuos en SIGAU • Altura promedio 12.4m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 50 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Eucalipto plateado.jpg"}, {"id": "SIGAU-160", "name": "Tibar, Rodamonte, Pagoda (SIGAU-160)", "sciname": "Tibar", "cat": 0, "role": "Especie arbórea de Kennedy • 50 individuos en SIGAU • Altura promedio 1.6m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 50 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Tibar, Rodamonte, Pagoda.jpeg"}, {"id": "SIGAU-161", "name": "Citrus spp. (SIGAU-161)", "sciname": "Citrus spp.", "cat": 0, "role": "Especie arbórea de Kennedy • 49 individuos en SIGAU • Altura promedio 1.4m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 49 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-162", "name": "Amarrabollo (SIGAU-162)", "sciname": "Amarrabollo", "cat": 0, "role": "Especie arbórea de Kennedy • 47 individuos en SIGAU • Altura promedio 1.4m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 47 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Amarrabollo.jpg"}, {"id": "SIGAU-163", "name": "Venturosa (SIGAU-163)", "sciname": "Venturosa", "cat": 0, "role": "Especie arbórea de Kennedy • 45 individuos en SIGAU • Altura promedio 2.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 45 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Rosa.jpg"}, {"id": "SIGAU-164", "name": "Yarumo (SIGAU-164)", "sciname": "Yarumo", "cat": 0, "role": "Especie arbórea de Kennedy • 45 individuos en SIGAU • Altura promedio 0.9m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 45 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Yarumo.jpg"}, {"id": "SIGAU-165", "name": "Palma de cera, Palma de ramo (SIGAU-165)", "sciname": "Palma de cera", "cat": 0, "role": "Especie arbórea de Kennedy • 43 individuos en SIGAU • Altura promedio 1.6m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 43 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Palma de cera, Palma de ramo.jpg"}, {"id": "SIGAU-166", "name": "Guayabo de mico (SIGAU-166)", "sciname": "Guayabo de mico", "cat": 0, "role": "Especie arbórea de Kennedy • 37 individuos en SIGAU • Altura promedio 0.9m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 37 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Guayabo de mico.jpeg"}, {"id": "SIGAU-167", "name": "Mirto (SIGAU-167)", "sciname": "Mirto", "cat": 0, "role": "Especie arbórea de Kennedy • 37 individuos en SIGAU • Altura promedio 0.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 37 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Mirto.jpeg"}, {"id": "SIGAU-168", "name": "Lulo de perro (SIGAU-168)", "sciname": "Lulo de perro", "cat": 0, "role": "Especie arbórea de Kennedy • 37 individuos en SIGAU • Altura promedio 2.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 37 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Lulo de perro.jpg"}, {"id": "SIGAU-169", "name": "Grevilea (SIGAU-169)", "sciname": "Grevilea", "cat": 0, "role": "Especie arbórea de Kennedy • 36 individuos en SIGAU • Altura promedio 1.5m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 36 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Grevilea.jpeg"}, {"id": "SIGAU-170", "name": "Barbasco (SIGAU-170)", "sciname": "Barbasco", "cat": 0, "role": "Especie arbórea de Kennedy • 34 individuos en SIGAU • Altura promedio 0.9m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 34 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Barbasco.jpg"}, {"id": "SIGAU-171", "name": "Acacia azul (SIGAU-171)", "sciname": "Acacia azul", "cat": 0, "role": "Especie arbórea de Kennedy • 33 individuos en SIGAU • Altura promedio 2.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 33 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Acacia azul.jpg"}, {"id": "SIGAU-172", "name": "Azuceno, enebro (SIGAU-172)", "sciname": "Azuceno", "cat": 0, "role": "Especie arbórea de Kennedy • 31 individuos en SIGAU • Altura promedio 2.5m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 31 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Azuceno, enebro.jpg"}, {"id": "SIGAU-173", "name": "Sietecueros plateado (SIGAU-173)", "sciname": "Sietecueros plateado", "cat": 0, "role": "Especie arbórea de Kennedy • 28 individuos en SIGAU • Altura promedio 1.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 28 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-174", "name": "Pomarroso (SIGAU-174)", "sciname": "Pomarroso", "cat": 0, "role": "Especie arbórea de Kennedy • 27 individuos en SIGAU • Altura promedio 2.4m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 27 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-175", "name": "Guayabo del peru (SIGAU-175)", "sciname": "Guayabo del peru", "cat": 0, "role": "Especie arbórea de Kennedy • 26 individuos en SIGAU • Altura promedio 1.2m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 26 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Guayabo.jpeg"}, {"id": "SIGAU-176", "name": "Cucubo (SIGAU-176)", "sciname": "Cucubo", "cat": 0, "role": "Especie arbórea de Kennedy • 26 individuos en SIGAU • Altura promedio 0.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 26 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Cucubo.jpeg"}, {"id": "SIGAU-177", "name": "Palma de datiles (SIGAU-177)", "sciname": "Palma de datiles", "cat": 0, "role": "Especie arbórea de Kennedy • 26 individuos en SIGAU • Altura promedio 4.4m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 26 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-178", "name": "Siete Cueros peludo (SIGAU-178)", "sciname": "Siete Cueros peludo", "cat": 0, "role": "Especie arbórea de Kennedy • 26 individuos en SIGAU • Altura promedio 1.4m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 26 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Siete cueros.jpeg"}, {"id": "SIGAU-179", "name": "Aligustre del Japon (SIGAU-179)", "sciname": "Aligustre del Japon", "cat": 0, "role": "Especie arbórea de Kennedy • 25 individuos en SIGAU • Altura promedio 0.8m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 25 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-180", "name": "Gurrubo (SIGAU-180)", "sciname": "Gurrubo", "cat": 0, "role": "Especie arbórea de Kennedy • 24 individuos en SIGAU • Altura promedio 1.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 24 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Gurrubo.jpg"}, {"id": "SIGAU-181", "name": "Carbonero rosado (SIGAU-181)", "sciname": "Carbonero rosado", "cat": 0, "role": "Especie arbórea de Kennedy • 22 individuos en SIGAU • Altura promedio 1.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 22 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Carbonero.jpg"}, {"id": "SIGAU-182", "name": "Fucsia boliviana (SIGAU-182)", "sciname": "Fucsia boliviana", "cat": 0, "role": "Especie arbórea de Kennedy • 22 individuos en SIGAU • Altura promedio 1.8m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 22 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Fucsia boliviana.jpeg"}, {"id": "SIGAU-183", "name": "Platano (SIGAU-183)", "sciname": "Platano", "cat": 0, "role": "Especie arbórea de Kennedy • 22 individuos en SIGAU • Altura promedio 1.5m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 22 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Platano.jpg"}, {"id": "SIGAU-184", "name": "Algodon extranjero (SIGAU-184)", "sciname": "Algodon extranjero", "cat": 0, "role": "Especie arbórea de Kennedy • 21 individuos en SIGAU • Altura promedio 1.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 21 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Algodon extranjero.jpg"}, {"id": "SIGAU-185", "name": "Tibar extranjero (SIGAU-185)", "sciname": "Tibar extranjero", "cat": 0, "role": "Especie arbórea de Kennedy • 20 individuos en SIGAU • Altura promedio 4.3m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 20 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Tibar.jpeg"}, {"id": "SIGAU-186", "name": "Manzano (SIGAU-186)", "sciname": "Manzano", "cat": 0, "role": "Especie arbórea de Kennedy • 20 individuos en SIGAU • Altura promedio 1.6m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 20 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Manzano.jpg"}, {"id": "SIGAU-187", "name": "Gaquillo (SIGAU-187)", "sciname": "Gaquillo", "cat": 0, "role": "Especie arbórea de Kennedy • 19 individuos en SIGAU • Altura promedio 1.8m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 19 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-188", "name": "Trompeto (SIGAU-188)", "sciname": "Trompeto", "cat": 0, "role": "Especie arbórea de Kennedy • 19 individuos en SIGAU • Altura promedio 4.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 19 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Trompeto.jpeg"}, {"id": "SIGAU-189", "name": "Platano de tierra fria (SIGAU-189)", "sciname": "Platano de tierra fria", "cat": 0, "role": "Especie arbórea de Kennedy • 18 individuos en SIGAU • Altura promedio 1.9m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 18 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Platano.jpg"}, {"id": "SIGAU-190", "name": "Schefflera (SIGAU-190)", "sciname": "Schefflera", "cat": 0, "role": "Especie arbórea de Kennedy • 18 individuos en SIGAU • Altura promedio 1.5m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 18 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Schefflera.jpg"}, {"id": "SIGAU-191", "name": "Cajeto de Bogota (SIGAU-191)", "sciname": "Cajeto de Bogota", "cat": 0, "role": "Especie arbórea de Kennedy • 18 individuos en SIGAU • Altura promedio 1.3m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 18 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Cajeto.jpg"}, {"id": "SIGAU-192", "name": "Chilco de páramo (SIGAU-192)", "sciname": "Chilco de páramo", "cat": 0, "role": "Especie arbórea de Kennedy • 17 individuos en SIGAU • Altura promedio 1.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 17 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Chilco de páramo.jpeg"}, {"id": "SIGAU-193", "name": "Pino (SIGAU-193)", "sciname": "Pino", "cat": 0, "role": "Especie arbórea de Kennedy • 16 individuos en SIGAU • Altura promedio 7.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 16 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Pino.jpg"}, {"id": "SIGAU-194", "name": "Salvio negro (SIGAU-194)", "sciname": "Salvio negro", "cat": 0, "role": "Especie arbórea de Kennedy • 16 individuos en SIGAU • Altura promedio 3.3m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 16 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Salvio negro.jpeg"}, {"id": "SIGAU-195", "name": "Cafe (SIGAU-195)", "sciname": "Cafe", "cat": 0, "role": "Especie arbórea de Kennedy • 16 individuos en SIGAU • Altura promedio 1.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 16 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Cafe.jpg"}, {"id": "SIGAU-196", "name": "Tuno (SIGAU-196)", "sciname": "Tuno", "cat": 0, "role": "Especie arbórea de Kennedy • 16 individuos en SIGAU • Altura promedio 1.2m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 16 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Tuno.jpg"}, {"id": "SIGAU-197", "name": "Rosa (SIGAU-197)", "sciname": "Rosa", "cat": 0, "role": "Especie arbórea de Kennedy • 15 individuos en SIGAU • Altura promedio 1.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 15 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Rosa.jpg"}, {"id": "SIGAU-198", "name": "Cerezo, ciruelo (SIGAU-198)", "sciname": "Cerezo", "cat": 0, "role": "Especie arbórea de Kennedy • 15 individuos en SIGAU • Altura promedio 1.6m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 15 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Cerezo, ciruelo.jpg"}, {"id": "SIGAU-199", "name": "Ceiba de tierra fria (SIGAU-199)", "sciname": "Ceiba de tierra fria", "cat": 0, "role": "Especie arbórea de Kennedy • 15 individuos en SIGAU • Altura promedio 1.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 15 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-200", "name": "Mulato (SIGAU-200)", "sciname": "Mulato", "cat": 0, "role": "Especie arbórea de Kennedy • 15 individuos en SIGAU • Altura promedio 1.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 15 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Mulato.jpeg"}, {"id": "SIGAU-201", "name": "Tomatillo (SIGAU-201)", "sciname": "Tomatillo", "cat": 0, "role": "Especie arbórea de Kennedy • 13 individuos en SIGAU • Altura promedio 3.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 13 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Tomatillo.jpeg"}, {"id": "SIGAU-202", "name": "Leptospermun (SIGAU-202)", "sciname": "Leptospermun", "cat": 0, "role": "Especie arbórea de Kennedy • 13 individuos en SIGAU • Altura promedio 3.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 13 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-203", "name": "Pino azul (SIGAU-203)", "sciname": "Pino azul", "cat": 0, "role": "Especie arbórea de Kennedy • 12 individuos en SIGAU • Altura promedio 2.2m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 12 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Pino azul.jpg"}, {"id": "SIGAU-204", "name": "Borrachero rojo (SIGAU-204)", "sciname": "Borrachero rojo", "cat": 0, "role": "Especie arbórea de Kennedy • 12 individuos en SIGAU • Altura promedio 1.3m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 12 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Borrachero rojo.jpeg"}, {"id": "SIGAU-205", "name": "Aloe arboreo (SIGAU-205)", "sciname": "Aloe arboreo", "cat": 0, "role": "Especie arbórea de Kennedy • 12 individuos en SIGAU • Altura promedio 2.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 12 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-206", "name": "Malvavisco (SIGAU-206)", "sciname": "Malvavisco", "cat": 0, "role": "Especie arbórea de Kennedy • 11 individuos en SIGAU • Altura promedio 1.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 11 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Malvavisco.jpeg"}, {"id": "SIGAU-207", "name": "Lavatera, Malvavisco morado (SIGAU-207)", "sciname": "Lavatera", "cat": 0, "role": "Especie arbórea de Kennedy • 11 individuos en SIGAU • Altura promedio 2.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 11 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Lavatera, Malvavisco morado.jpeg"}, {"id": "SIGAU-208", "name": "Algodoncillo (SIGAU-208)", "sciname": "Algodoncillo", "cat": 0, "role": "Especie arbórea de Kennedy • 11 individuos en SIGAU • Altura promedio 2.5m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 11 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Algodoncillo.jpg"}, {"id": "SIGAU-209", "name": "Borrachero (SIGAU-209)", "sciname": "Borrachero", "cat": 0, "role": "Especie arbórea de Kennedy • 11 individuos en SIGAU • Altura promedio 1.5m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 11 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Borrachero.jpg"}, {"id": "SIGAU-210", "name": "Caucho Sabanero (SIGAU-210)", "sciname": "Caucho Sabanero", "cat": 0, "role": "Especie arbórea de Kennedy • 10 individuos en SIGAU • Altura promedio 1.6m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 10 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Caucho.jpeg"}, {"id": "SIGAU-211", "name": "Corazon de pollo (SIGAU-211)", "sciname": "Corazon de pollo", "cat": 0, "role": "Especie arbórea de Kennedy • 9 individuos en SIGAU • Altura promedio 1.2m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 9 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Corazon de pollo.jpg"}, {"id": "SIGAU-212", "name": "Tomate de arbol (SIGAU-212)", "sciname": "Tomate de arbol", "cat": 0, "role": "Especie arbórea de Kennedy • 9 individuos en SIGAU • Altura promedio 2.3m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 9 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Tomate de arbol.jpg"}, {"id": "SIGAU-213", "name": "Guayacán amarillo (SIGAU-213)", "sciname": "Guayacán amarillo", "cat": 0, "role": "Especie arbórea de Kennedy • 9 individuos en SIGAU • Altura promedio 1.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 9 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Guayacán amarillo.jpeg"}, {"id": "SIGAU-214", "name": "Mortiño (SIGAU-214)", "sciname": "Mortiño", "cat": 0, "role": "Especie arbórea de Kennedy • 9 individuos en SIGAU • Altura promedio 1.2m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 9 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Mortiño.jpg"}, {"id": "SIGAU-215", "name": "Guayabillo (SIGAU-215)", "sciname": "Guayabillo", "cat": 0, "role": "Especie arbórea de Kennedy • 8 individuos en SIGAU • Altura promedio 1.2m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 8 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Guayabillo.jpg"}, {"id": "SIGAU-216", "name": "Cucharo huesito (SIGAU-216)", "sciname": "Cucharo huesito", "cat": 0, "role": "Especie arbórea de Kennedy • 8 individuos en SIGAU • Altura promedio 1.4m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 8 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Cucharo.jpeg"}, {"id": "SIGAU-217", "name": "Pitosporo (SIGAU-217)", "sciname": "Pitosporo", "cat": 0, "role": "Especie arbórea de Kennedy • 7 individuos en SIGAU • Altura promedio 1.3m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 7 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Pitosporo.jpeg"}, {"id": "SIGAU-218", "name": "Eucalipto manchado (SIGAU-218)", "sciname": "Eucalipto manchado", "cat": 0, "role": "Especie arbórea de Kennedy • 7 individuos en SIGAU • Altura promedio 13.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 7 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Eucalipto.jpg"}, {"id": "SIGAU-219", "name": "Helecho palma (SIGAU-219)", "sciname": "Helecho palma", "cat": 0, "role": "Especie arbórea de Kennedy • 7 individuos en SIGAU • Altura promedio 1.2m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 7 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Helecho palma.jpg"}, {"id": "SIGAU-220", "name": "Fuscia arbórea (SIGAU-220)", "sciname": "Fuscia arbórea", "cat": 0, "role": "Especie arbórea de Kennedy • 7 individuos en SIGAU • Altura promedio 1.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 7 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-221", "name": "Palma funeral (SIGAU-221)", "sciname": "Palma funeral", "cat": 0, "role": "Especie arbórea de Kennedy • 6 individuos en SIGAU • Altura promedio 1.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 6 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-222", "name": "Guayabo brasilero (SIGAU-222)", "sciname": "Guayabo brasilero", "cat": 0, "role": "Especie arbórea de Kennedy • 6 individuos en SIGAU • Altura promedio 2.6m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 6 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Guayabo.jpeg"}, {"id": "SIGAU-223", "name": "Aromo (SIGAU-223)", "sciname": "Aromo", "cat": 0, "role": "Especie arbórea de Kennedy • 6 individuos en SIGAU • Altura promedio 1.5m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 6 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-224", "name": "Lechero (SIGAU-224)", "sciname": "Lechero", "cat": 0, "role": "Especie arbórea de Kennedy • 6 individuos en SIGAU • Altura promedio 1.4m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 6 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-225", "name": "Palma areca (SIGAU-225)", "sciname": "Palma areca", "cat": 0, "role": "Especie arbórea de Kennedy • 6 individuos en SIGAU • Altura promedio 1.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 6 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Palma areca.jpeg"}, {"id": "SIGAU-226", "name": "Espino blanco (SIGAU-226)", "sciname": "Espino blanco", "cat": 0, "role": "Especie arbórea de Kennedy • 6 individuos en SIGAU • Altura promedio 1.5m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 6 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Espino blanco.jpg"}, {"id": "SIGAU-227", "name": "Caucho lira (SIGAU-227)", "sciname": "Caucho lira", "cat": 0, "role": "Especie arbórea de Kennedy • 5 individuos en SIGAU • Altura promedio 6.2m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 5 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Caucho.jpeg"}, {"id": "SIGAU-228", "name": "Pino australiano (SIGAU-228)", "sciname": "Pino australiano", "cat": 0, "role": "Especie arbórea de Kennedy • 5 individuos en SIGAU • Altura promedio 3.2m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 5 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Pino.jpg"}, {"id": "SIGAU-229", "name": "Pino hayuelo (SIGAU-229)", "sciname": "Pino hayuelo", "cat": 0, "role": "Especie arbórea de Kennedy • 5 individuos en SIGAU • Altura promedio 5.8m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 5 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Hayuelo.jpeg"}, {"id": "SIGAU-230", "name": "Higueron (SIGAU-230)", "sciname": "Higueron", "cat": 0, "role": "Especie arbórea de Kennedy • 5 individuos en SIGAU • Altura promedio 4.5m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 5 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-231", "name": "Fotinia (SIGAU-231)", "sciname": "Fotinia", "cat": 0, "role": "Especie arbórea de Kennedy • 5 individuos en SIGAU • Altura promedio 2.2m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 5 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Fotinia.jpg"}, {"id": "SIGAU-232", "name": "Amargoso (SIGAU-232)", "sciname": "Amargoso", "cat": 0, "role": "Especie arbórea de Kennedy • 5 individuos en SIGAU • Altura promedio 1.6m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 5 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Amargoso.jpg"}, {"id": "SIGAU-233", "name": "Eucalipto blanco (SIGAU-233)", "sciname": "Eucalipto blanco", "cat": 0, "role": "Especie arbórea de Kennedy • 4 individuos en SIGAU • Altura promedio 0.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 4 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Eucalipto.jpg"}, {"id": "SIGAU-234", "name": "Flor morado (SIGAU-234)", "sciname": "Flor morado", "cat": 0, "role": "Especie arbórea de Kennedy • 4 individuos en SIGAU • Altura promedio 1.2m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 4 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-235", "name": "Pino Montezuma (SIGAU-235)", "sciname": "Pino Montezuma", "cat": 0, "role": "Especie arbórea de Kennedy • 4 individuos en SIGAU • Altura promedio 19.8m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 4 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Pino.jpg"}, {"id": "SIGAU-236", "name": "Cordoncillo (SIGAU-236)", "sciname": "Cordoncillo", "cat": 0, "role": "Especie arbórea de Kennedy • 4 individuos en SIGAU • Altura promedio 0.8m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 4 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Cordoncillo.JPG"}, {"id": "SIGAU-237", "name": "Fique (SIGAU-237)", "sciname": "Fique", "cat": 0, "role": "Especie arbórea de Kennedy • 4 individuos en SIGAU • Altura promedio 2.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 4 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Fique.jpeg"}, {"id": "SIGAU-238", "name": "Pichuelo (SIGAU-238)", "sciname": "Pichuelo", "cat": 0, "role": "Especie arbórea de Kennedy • 4 individuos en SIGAU • Altura promedio 1.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 4 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-239", "name": "Siete cueros (SIGAU-239)", "sciname": "Siete cueros", "cat": 0, "role": "Especie arbórea de Kennedy • 4 individuos en SIGAU • Altura promedio 2.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 4 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Siete cueros.jpeg"}, {"id": "SIGAU-240", "name": "Salvio (SIGAU-240)", "sciname": "Salvio", "cat": 0, "role": "Especie arbórea de Kennedy • 4 individuos en SIGAU • Altura promedio 1.5m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 4 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Salvio.jpg"}, {"id": "SIGAU-241", "name": "Schefflera, Yuco blanco (SIGAU-241)", "sciname": "Schefflera", "cat": 0, "role": "Especie arbórea de Kennedy • 3 individuos en SIGAU • Altura promedio 5.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 3 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Schefflera, Yuco blanco.jpg"}, {"id": "SIGAU-242", "name": "Hojarasco (SIGAU-242)", "sciname": "Hojarasco", "cat": 0, "role": "Especie arbórea de Kennedy • 3 individuos en SIGAU • Altura promedio 3.6m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 3 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-243", "name": "Palma sancona (SIGAU-243)", "sciname": "Palma sancona", "cat": 0, "role": "Especie arbórea de Kennedy • 3 individuos en SIGAU • Altura promedio 1.2m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 3 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-244", "name": "Tuno roso (SIGAU-244)", "sciname": "Tuno roso", "cat": 0, "role": "Especie arbórea de Kennedy • 3 individuos en SIGAU • Altura promedio 1.2m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 3 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Tuno roso.jpeg"}, {"id": "SIGAU-245", "name": "Laurel europeo (SIGAU-245)", "sciname": "Laurel europeo", "cat": 0, "role": "Especie arbórea de Kennedy • 3 individuos en SIGAU • Altura promedio 1.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 3 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Laurel.jpeg"}, {"id": "SIGAU-246", "name": "Mango (SIGAU-246)", "sciname": "Mango", "cat": 0, "role": "Especie arbórea de Kennedy • 3 individuos en SIGAU • Altura promedio 1.2m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 3 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Mango.jpeg"}, {"id": "SIGAU-247", "name": "Acacia blanca, leucaena (SIGAU-247)", "sciname": "Acacia blanca", "cat": 0, "role": "Especie arbórea de Kennedy • 3 individuos en SIGAU • Altura promedio 1.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 3 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Acacia blanca, leucaena.jpeg"}, {"id": "SIGAU-248", "name": "Olivo (SIGAU-248)", "sciname": "Olivo", "cat": 0, "role": "Especie arbórea de Kennedy • 3 individuos en SIGAU • Altura promedio 2.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 3 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Olivo.jpeg"}, {"id": "SIGAU-249", "name": "Bonetero del Japon (SIGAU-249)", "sciname": "Bonetero del Japon", "cat": 0, "role": "Especie arbórea de Kennedy • 3 individuos en SIGAU • Altura promedio 0.8m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 3 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-250", "name": "Cerezó uche (SIGAU-250)", "sciname": "Cerezó uche", "cat": 0, "role": "Especie arbórea de Kennedy • 3 individuos en SIGAU • Altura promedio 4.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 3 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Cerezo.jpg"}, {"id": "SIGAU-251", "name": "Palma Kenia (SIGAU-251)", "sciname": "Palma Kenia", "cat": 0, "role": "Especie arbórea de Kennedy • 3 individuos en SIGAU • Altura promedio 1.9m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 3 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-252", "name": "Alamo de lombardia (SIGAU-252)", "sciname": "Alamo de lombardia", "cat": 0, "role": "Especie arbórea de Kennedy • 2 individuos en SIGAU • Altura promedio 8.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 2 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-253", "name": "Quina (SIGAU-253)", "sciname": "Quina", "cat": 0, "role": "Especie arbórea de Kennedy • 2 individuos en SIGAU • Altura promedio 4.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 2 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Quina.jpg"}, {"id": "SIGAU-254", "name": "Balso blanco (SIGAU-254)", "sciname": "Balso blanco", "cat": 0, "role": "Especie arbórea de Kennedy • 2 individuos en SIGAU • Altura promedio 7.8m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 2 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-255", "name": "Pero (SIGAU-255)", "sciname": "Pero", "cat": 0, "role": "Especie arbórea de Kennedy • 2 individuos en SIGAU • Altura promedio 2.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 2 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Pero.jpeg"}, {"id": "SIGAU-256", "name": "Amarguero amarillo (SIGAU-256)", "sciname": "Amarguero amarillo", "cat": 0, "role": "Especie arbórea de Kennedy • 2 individuos en SIGAU • Altura promedio 1.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 2 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Amarguero amarillo.jpg"}, {"id": "SIGAU-257", "name": "Ojo de perdiz (SIGAU-257)", "sciname": "Ojo de perdiz", "cat": 0, "role": "Especie arbórea de Kennedy • 2 individuos en SIGAU • Altura promedio 4.5m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 2 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-258", "name": "Diosme (SIGAU-258)", "sciname": "Diosme", "cat": 0, "role": "Especie arbórea de Kennedy • 2 individuos en SIGAU • Altura promedio 1.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 2 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Diosme.jpg"}, {"id": "SIGAU-259", "name": "Yuca, palma yuca (SIGAU-259)", "sciname": "Yuca", "cat": 0, "role": "Especie arbórea de Kennedy • 2 individuos en SIGAU • Altura promedio 2.2m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 2 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Yuca, palma yuca.jpg"}, {"id": "SIGAU-260", "name": "Liberal o lechero (SIGAU-260)", "sciname": "Liberal o lechero", "cat": 0, "role": "Especie arbórea de Kennedy • 2 individuos en SIGAU • Altura promedio 1.4m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 2 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-261", "name": "Cidron (SIGAU-261)", "sciname": "Cidron", "cat": 0, "role": "Especie arbórea de Kennedy • 2 individuos en SIGAU • Altura promedio 1.2m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 2 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Cidron.jpg"}, {"id": "SIGAU-262", "name": "Boj (SIGAU-262)", "sciname": "Boj", "cat": 0, "role": "Especie arbórea de Kennedy • 2 individuos en SIGAU • Altura promedio 3.1m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 2 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Boj.jpg"}, {"id": "SIGAU-263", "name": "Arupo (SIGAU-263)", "sciname": "Arupo", "cat": 0, "role": "Especie arbórea de Kennedy • 2 individuos en SIGAU • Altura promedio 1.3m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 2 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-264", "name": "Palma Botella (SIGAU-264)", "sciname": "Palma Botella", "cat": 0, "role": "Especie arbórea de Kennedy • 2 individuos en SIGAU • Altura promedio 1.3m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 2 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-265", "name": "Laurel (SIGAU-265)", "sciname": "Laurel", "cat": 0, "role": "Especie arbórea de Kennedy • 2 individuos en SIGAU • Altura promedio 1.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 2 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Laurel.jpeg"}, {"id": "SIGAU-266", "name": "Mamey (SIGAU-266)", "sciname": "Mamey", "cat": 0, "role": "Especie arbórea de Kennedy • 1 individuos en SIGAU • Altura promedio 0.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-267", "name": "Guacimo (SIGAU-267)", "sciname": "Guacimo", "cat": 0, "role": "Especie arbórea de Kennedy • 1 individuos en SIGAU • Altura promedio 7.5m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-268", "name": "Guarana, guacharo (SIGAU-268)", "sciname": "Guarana", "cat": 0, "role": "Especie arbórea de Kennedy • 1 individuos en SIGAU • Altura promedio 2.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Guarana, guacharo.jpeg"}, {"id": "SIGAU-269", "name": "Ombu, Arbol de la bella sombra (SIGAU-269)", "sciname": "Ombu", "cat": 0, "role": "Especie arbórea de Kennedy • 1 individuos en SIGAU • Altura promedio 2.5m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-270", "name": "Tecomaria (SIGAU-270)", "sciname": "Tecomaria", "cat": 0, "role": "Especie arbórea de Kennedy • 1 individuos en SIGAU • Altura promedio 3.5m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-271", "name": "Nacedero (SIGAU-271)", "sciname": "Nacedero", "cat": 0, "role": "Especie arbórea de Kennedy • 1 individuos en SIGAU • Altura promedio 1.2m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Nacedero.jpeg"}, {"id": "SIGAU-272", "name": "Olmo de agua (SIGAU-272)", "sciname": "Olmo de agua", "cat": 0, "role": "Especie arbórea de Kennedy • 1 individuos en SIGAU • Altura promedio 4.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-273", "name": "Granado (SIGAU-273)", "sciname": "Granado", "cat": 0, "role": "Especie arbórea de Kennedy • 1 individuos en SIGAU • Altura promedio 2.5m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Granado.jpeg"}, {"id": "SIGAU-274", "name": "Escolin, Espadero (SIGAU-274)", "sciname": "Escolin", "cat": 0, "role": "Especie arbórea de Kennedy • 1 individuos en SIGAU • Altura promedio 2.5m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Escolin, Espadero.jpg"}, {"id": "SIGAU-275", "name": "Ocobo, Guayacan (SIGAU-275)", "sciname": "Ocobo", "cat": 0, "role": "Especie arbórea de Kennedy • 1 individuos en SIGAU • Altura promedio 1.5m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Ocobo, Guayacan.jpg"}, {"id": "SIGAU-276", "name": "Brunelia (SIGAU-276)", "sciname": "Brunelia", "cat": 0, "role": "Especie arbórea de Kennedy • 1 individuos en SIGAU • Altura promedio 1.2m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-277", "name": "Balazo (SIGAU-277)", "sciname": "Balazo", "cat": 0, "role": "Especie arbórea de Kennedy • 1 individuos en SIGAU • Altura promedio 2.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Balazo.jpeg"}, {"id": "SIGAU-278", "name": "Jazmin australiano (SIGAU-278)", "sciname": "Jazmin australiano", "cat": 0, "role": "Especie arbórea de Kennedy • 1 individuos en SIGAU • Altura promedio 1.6m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-279", "name": "Schefflera, Tortolito (SIGAU-279)", "sciname": "Schefflera", "cat": 0, "role": "Especie arbórea de Kennedy • 1 individuos en SIGAU • Altura promedio 2.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Schefflera.jpg"}, {"id": "SIGAU-280", "name": "Lembo, pategallo (SIGAU-280)", "sciname": "Lembo", "cat": 0, "role": "Especie arbórea de Kennedy • 1 individuos en SIGAU • Altura promedio 2.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-281", "name": "Chirimoyo (SIGAU-281)", "sciname": "Chirimoyo", "cat": 0, "role": "Especie arbórea de Kennedy • 1 individuos en SIGAU • Altura promedio 1.4m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Chirimoyo.jpg"}, {"id": "SIGAU-282", "name": "Cajeto 1 (SIGAU-282)", "sciname": "Cajeto 1", "cat": 0, "role": "Especie arbórea de Kennedy • 1 individuos en SIGAU • Altura promedio 0.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Cajeto.jpg"}, {"id": "SIGAU-283", "name": "Motilón (SIGAU-283)", "sciname": "Motilón", "cat": 0, "role": "Especie arbórea de Kennedy • 1 individuos en SIGAU • Altura promedio 1.6m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Motilón.jpg"}, {"id": "SIGAU-284", "name": "Papayuela (SIGAU-284)", "sciname": "Papayuela", "cat": 0, "role": "Especie arbórea de Kennedy • 1 individuos en SIGAU • Altura promedio 2.7m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Papayuela.jpeg"}, {"id": "SIGAU-285", "name": "Mortiño ferrugineo (SIGAU-285)", "sciname": "Mortiño ferrugineo", "cat": 0, "role": "Especie arbórea de Kennedy • 1 individuos en SIGAU • Altura promedio 1.3m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Mortiño.jpg"}, {"id": "SIGAU-286", "name": "Moradilla (SIGAU-286)", "sciname": "Moradilla", "cat": 0, "role": "Especie arbórea de Kennedy • 1 individuos en SIGAU • Altura promedio 1.9m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Moradilla.jpeg"}, {"id": "SIGAU-287", "name": "Hiperico, Corazoncillo (SIGAU-287)", "sciname": "Hiperico", "cat": 0, "role": "Especie arbórea de Kennedy • 1 individuos en SIGAU • Altura promedio 1.4m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1 registros activos georreferenciados", "img": "./assets/fotos/fotos_flora/Hiperico, Corazoncillo.jpeg"}, {"id": "SIGAU-288", "name": "Retamo (SIGAU-288)", "sciname": "Retamo", "cat": 0, "role": "Especie arbórea de Kennedy • 1 individuos en SIGAU • Altura promedio 3.0m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1 registros activos georreferenciados", "img": ""}, {"id": "SIGAU-289", "name": "Duranta sp (SIGAU-289)", "sciname": "Duranta sp", "cat": 0, "role": "Especie arbórea de Kennedy • 1 individuos en SIGAU • Altura promedio 1.6m", "loc": "Ronda Hidráulica, ZMPA y Parque Urbano Kennedy", "alert": "Censo Oficial SIGAU: 1 registros activos georreferenciados", "img": ""}, {"id": "AVE-001", "name": "Turdus fuscater gigas", "sciname": "Turdus fuscater gigas", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46293677609", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Turdus fuscater gigas.jpeg"}, {"id": "AVE-002", "name": "Zenaida auriculata pentheria", "sciname": "Zenaida auriculata pentheria", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46389048525", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Zenaida auriculata pentheria.png"}, {"id": "AVE-003", "name": "Thraupis palmarum atripennis", "sciname": "Thraupis palmarum atripennis", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46420617522", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://static.inaturalist.org/photos/69262665/medium.png"}, {"id": "AVE-004", "name": "Zonotrichia capensis costaricensis", "sciname": "Zonotrichia capensis costaricensis", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46423397871", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Zonotrichia capensis costaricensis.png"}, {"id": "AVE-005", "name": "Troglodytes musculus columbae", "sciname": "Troglodytes musculus columbae", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46430539943", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Troglodytes musculus columbae.png"}, {"id": "AVE-006", "name": "Sicalis luteola bogotensis", "sciname": "Sicalis luteola bogotensis", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749827603", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Sicalis luteola bogotensis.jpeg"}, {"id": "AVE-007", "name": "Stelgidopteryx ruficollis uropygialis", "sciname": "Stelgidopteryx ruficollis uropygialis", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749827603", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Stelgidopteryx ruficollis uropygialis.jpg"}, {"id": "AVE-008", "name": "Vanellus chilensis cayennensis", "sciname": "Vanellus chilensis cayennensis", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Vanellus chilensis cayennensis", "loc": "Universidad Distrital Francisco JosÃ© De Caldas - Sede Bosa El Porvenir", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Vanellus chilensis cayennensis.jpeg"}, {"id": "AVE-009", "name": "Asio stygius robustus", "sciname": "Asio stygius robustus", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46505373953", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Asio stygius robustus.jpg"}, {"id": "AVE-010", "name": "Geranoaetus melanoleucus australis", "sciname": "Geranoaetus melanoleucus australis", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Ãguila mora", "loc": "Urb. La Estancia, FontibÃ³n, BogotÃ¡, Colombia", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/705103444/medium.jpg"}, {"id": "AVE-011", "name": "Geranoaetus", "sciname": "Ãguilas y Aguiluchos", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4673194742", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Águilas y Aguiluchos.jpeg"}, {"id": "AVE-012", "name": "Anas platyrhynchos domesticus", "sciname": "Ãnade azulÃ³n domÃ©stico", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4629392008", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/28247708/medium.jpeg"}, {"id": "AVE-013", "name": "Ganso cisne domÃ©stico", "sciname": "Anser cygnoides domesticus", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Ãnsar cisnal domÃ©stico", "loc": "Mundo Aventura, BogotÃ¡, BogotÃ¡, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/506023235/medium.jpg"}, {"id": "AVE-014", "name": "Gallinago delicata", "sciname": "Agachona Norteamericana", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749827603", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Agachona Norteamericana.jpeg"}, {"id": "AVE-015", "name": "Buteo platypterus", "sciname": "Aguililla Alas Anchas", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46293677609", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Aguililla Alas Anchas.jpeg"}, {"id": "AVE-016", "name": "Aguililla caminera", "sciname": "Aves", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • 201041", "loc": "BogotÃ¡, Colombia", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Aguililla caminera.jpeg"}, {"id": "AVE-017", "name": "Geranoaetus albicaudatus", "sciname": "Aguililla cola blanca", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4675932", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Aguililla cola blanca.jpg"}, {"id": "AVE-018", "name": "Buteo brachyurus", "sciname": "Aguililla cola corta", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749827603", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Aguililla cola corta.jpeg"}, {"id": "AVE-019", "name": "Buteo", "sciname": "Aguilillas y parientes", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46415094829", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Aguilillas y parientes.jpeg"}, {"id": "AVE-020", "name": "Phaetusa simplex", "sciname": "AtÃ­", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749827603", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Atajacaminos ñañarca.jpg"}, {"id": "AVE-021", "name": "Systellura longirostris", "sciname": "Atajacaminos Ã±aÃ±arca", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4677146", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/420734/medium.jpg"}, {"id": "AVE-022", "name": "Atlapetes pallidinucha", "sciname": "atlapetes cabecipÃ¡lido", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46429069541", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/28648187/medium.jpeg"}, {"id": "AVE-023", "name": "Megascops choliba", "sciname": "Autillo comÃºn", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4676085", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/84447821/medium.jpeg"}, {"id": "AVE-024", "name": "Vanellus chilensis", "sciname": "AvefrÃ­a Tero", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4641913", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Vanellus chilensis cayennensis.jpeg"}, {"id": "AVE-025", "name": "Aves", "sciname": "Aves", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46760118", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Aves de percha.jpeg"}, {"id": "AVE-026", "name": "Passeriformes", "sciname": "Aves de percha", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4629157", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Aves de percha.jpeg"}, {"id": "AVE-027", "name": "Elanus leucurus leucurus", "sciname": "BailarÃ­n", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46293677609", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/29281312/medium.jpeg"}, {"id": "AVE-028", "name": "Asio flammeus bogotensis", "sciname": "BÃºho Campestre de los Andes Ecuatoriales", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46743864429", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/31149636/medium.jpeg"}, {"id": "AVE-029", "name": "BÃºho Cara Blanca", "sciname": "Aves", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • 558468", "loc": "Kr 79 - Cl 10D - 59, BogotÃ¡, Colombia", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Aves de percha.jpeg"}, {"id": "AVE-030", "name": "Bubo virginianus", "sciname": "BÃºho cornudo", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749827603", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/86248675/medium.jpeg"}, {"id": "AVE-031", "name": "Asio flammeus", "sciname": "BÃºho Sabanero", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4676189", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/84548198/medium.jpeg"}, {"id": "AVE-032", "name": "Asio", "sciname": "BÃºhos orejones", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46717629782", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Asio stygius robustus.jpg"}, {"id": "AVE-033", "name": "BÃºhos y tecolotes", "sciname": "Strigidae", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • BÃºhos y tecolotes", "loc": "Cundinamarca, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/452910772/medium.jpeg"}, {"id": "AVE-034", "name": "Strigiformes", "sciname": "BÃºhos, lechuzas y tecolotes", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749827603", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/87058787/medium.jpeg"}, {"id": "AVE-035", "name": "Heliodoxa jacula", "sciname": "Brillante Coroniverde", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46619727593", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Brillante Coroniverde.jpg"}, {"id": "AVE-036", "name": "Contopus fumigatus", "sciname": "Burlisto copetÃ³n", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46577984112", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://static.inaturalist.org/photos/251178470/medium.jpeg"}, {"id": "AVE-037", "name": "Burrito pico rojo", "sciname": "Mustelirallus erythrops", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Burrito pico rojo", "loc": "Transversal 81, BogotÃ¡, DC, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Burrito pico rojo.jpg"}, {"id": "AVE-038", "name": "Buteo platypterus platypterus", "sciname": "Busardo aliancho continental", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46293677609", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Busardo aliancho continental.jpeg"}, {"id": "AVE-039", "name": "Buteonine Hawks, Kites, and allies", "sciname": "Buteoninae", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Busardos, Milanos y Ãguilas menores", "loc": "Calle 6D, BogotÃ¡, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://static.inaturalist.org/photos/285661203/medium.jpg"}, {"id": "AVE-040", "name": "caica de pÃ¡ramo", "sciname": "Gallinago nobilis", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • caica de pÃ¡ramo", "loc": "Cundinamarca, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://static.inaturalist.org/photos/37745697/medium.jpg"}, {"id": "AVE-041", "name": "Icterus galbula", "sciname": "Calandria de Baltimore", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4631371805", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Calandria de Baltimore.jpeg"}, {"id": "AVE-042", "name": "Icterus chrysater", "sciname": "Calandria Dorso Amarillo", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4645174", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Calandria Dorso Amarillo.jpeg"}, {"id": "AVE-043", "name": "Icteridae", "sciname": "Calandrias, tordos, caciques, oropÃ©ndolas, zanates, praderos y parientes", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46769762", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Tordos.jpg"}, {"id": "AVE-044", "name": "Calzadito Cobrizo", "sciname": "Eriocnemis cupreoventris", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Calzadito Cobrizo", "loc": "Cundinamarca, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Calzadito Cobrizo.jpeg"}, {"id": "AVE-045", "name": "Eriocnemis vestita", "sciname": "Calzadito Reluciente", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "Cundinamarca, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Calzadito Reluciente.jpg"}, {"id": "AVE-046", "name": "Sicalis flaveola", "sciname": "Canario coronado", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46280082229", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Canario coronado.jpeg"}, {"id": "AVE-047", "name": "Canarios o Jilgueros", "sciname": "Sicalis", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Canarios o Jilgueros", "loc": "AV. Esperanza - KR 96H, BogotÃ¡, Colombia", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Canarios o Jilgueros.jpeg"}, {"id": "AVE-048", "name": "Tricolored Munia", "sciname": "Lonchura malacca", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Capuchino Tricolor de la India", "loc": "Carrera 83 7D-02, BogotÃ¡, DC, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/41187316/medium.jpg"}, {"id": "AVE-049", "name": "Caracara plancus", "sciname": "Carancho", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46743864429", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Carancho.jpeg"}, {"id": "AVE-050", "name": "Carpintero habado", "sciname": "Melanerpes rubricapillus", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Carpintero habado", "loc": "11011, BogotÃ¡, Colombia", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Carpintero habado.jpg"}, {"id": "AVE-051", "name": "Aramus guarauna", "sciname": "Carrao", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46760118", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Carrao.jpeg"}, {"id": "AVE-052", "name": "Mimus gilvus", "sciname": "Centzontle tropical", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46294653826", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Centzontle tropical.jpeg"}, {"id": "AVE-053", "name": "Centzontles", "sciname": "Mimus", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Centzontles", "loc": "Carrera 72C, BogotÃ¡, BogotÃ¡, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Centzontles.jpg"}, {"id": "AVE-054", "name": "Blue-winged Teal", "sciname": "Spatula discors", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Cerceta Alas Azules", "loc": "Cra. 80f #41b Sur-1 a 41b Sur-37, BogotÃ¡, Colombia", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://static.inaturalist.org/photos/17142991/medium.jpeg"}, {"id": "AVE-055", "name": "Falco sparverius", "sciname": "CernÃ­calo americano", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46766210267", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/112161199/medium.jpeg"}, {"id": "AVE-056", "name": "Synallaxis subpudica", "sciname": "chamicero cundiboyacense", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4640971", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/chamicero cundiboyacense.jpeg"}, {"id": "AVE-057", "name": "Chlidonias niger", "sciname": "CharrÃ¡n negro", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46769762", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/193324778/medium.jpg"}, {"id": "AVE-058", "name": "ChimachimÃ¡", "sciname": "Daptrius chimachima", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • ChimachimÃ¡", "loc": "Cra. 112c #12c-2 a Avenida Carrera 68, 12c, BogotÃ¡, Colombia", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Chimachimá.jpeg"}, {"id": "AVE-059", "name": "Northern Yellow Warbler", "sciname": "Setophaga aestiva", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Chipe Amarillo NorteÃ±o", "loc": "Cra. 80f #41b Sur-2 a 41b Sur-38, BogotÃ¡, Colombia", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://static.inaturalist.org/photos/17141267/medium.jpeg"}, {"id": "AVE-060", "name": "Setophaga striata", "sciname": "Chipe Cabeza Negra", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749827603", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Chipe Cabeza Negra.jpg"}, {"id": "AVE-061", "name": "Setophaga castanea", "sciname": "Chipe castaÃ±o", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749827603", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/104483730/medium.jpg"}, {"id": "AVE-062", "name": "Setophaga cerulea", "sciname": "Chipe Celeste", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46319101388", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Chipe Celeste.jpeg"}, {"id": "AVE-063", "name": "Parkesia noveboracensis", "sciname": "Chipe charquero", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4629157", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Chipe charquero.jpeg"}, {"id": "AVE-064", "name": "Cardellina canadensis", "sciname": "Chipe de collar", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4645174", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Chipe de collar.jpeg"}, {"id": "AVE-065", "name": "Geothlypis philadelphia", "sciname": "Chipe de Pechera", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46271157", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Chipe de Pechera.jpeg"}, {"id": "AVE-066", "name": "Setophaga fusca", "sciname": "Chipe garganta naranja", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46293186343", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Chipe garganta naranja.jpeg"}, {"id": "AVE-067", "name": "Leiothlypis peregrina", "sciname": "Chipe peregrino", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46314281625", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Chipe peregrino.jpeg"}, {"id": "AVE-068", "name": "Setophaga pitiayumi", "sciname": "Chipe Tropical", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749827603", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Chipe Tropical.jpeg"}, {"id": "AVE-069", "name": "Chipes", "sciname": "Setophaga", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Chipes", "loc": "Diagonal 2A, BogotÃ¡, BogotÃ¡, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Chipes.jpg"}, {"id": "AVE-070", "name": "Vireo chivi", "sciname": "ChivÃ­ ChivÃ­", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46316850535", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://static.inaturalist.org/photos/260911087/medium.jpeg"}, {"id": "AVE-071", "name": "Charadrius vociferus", "sciname": "Chorlo tildÃ­o", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4657177983", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/422670709/medium.jpeg"}, {"id": "AVE-072", "name": "Chordeiles", "sciname": "Chotacabras", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46718485195", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Chotacabras.jpg"}, {"id": "AVE-073", "name": "Chotacabras zumbÃ³n", "sciname": "Aves", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • 19577", "loc": "Saturno, FontibÃ³n, BogotÃ¡, Bogota, Colombia", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Aves de percha.jpeg"}, {"id": "AVE-074", "name": "colibrÃ­ aliazul", "sciname": "Aves", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • 6150", "loc": "4618491926", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Aves de percha.jpeg"}, {"id": "AVE-075", "name": "ColibrÃ­ Colilargo Mayor", "sciname": "Aves", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • 6023", "loc": "46799200875", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Aves de percha.jpeg"}, {"id": "AVE-076", "name": "ColibrÃ­ de Mulsant", "sciname": "Chaetocercus mulsant", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • ColibrÃ­ de Mulsant", "loc": "Ciudad Kennedy Occidental, Antonio NariÃ±o, BogotÃ¡, Bogota, Colombia", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://static.inaturalist.org/photos/471468500/medium.jpeg"}, {"id": "AVE-077", "name": "ColibrÃ­ picoespada", "sciname": "Aves", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • 6458", "loc": "46568453771", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Aves de percha.jpeg"}, {"id": "AVE-078", "name": "Colibri coruscans", "sciname": "ColibrÃ­ Rutilante", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46475246359", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://static.inaturalist.org/photos/17113330/medium.jpeg"}, {"id": "AVE-079", "name": "ColibrÃ­es", "sciname": "Trochilidae", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • ColibrÃ­es", "loc": "Carrera 69D, BogotÃ¡, DC, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/70401785/medium.jpg"}, {"id": "AVE-080", "name": "Colibri", "sciname": "ColibrÃ­es oreja violeta", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4675038", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/colibrí aliazul.jpg"}, {"id": "AVE-081", "name": "Grallaria ruficapilla", "sciname": "ComprapÃ¡n", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46719713738", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/142836531/medium.jpeg"}, {"id": "AVE-082", "name": "Coccyzus americanus", "sciname": "Cuclillo pico amarillo", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4641913", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Cuclillo pico amarillo.jpeg"}, {"id": "AVE-083", "name": "Phimosus infuscatus", "sciname": "Cuervillo cara pelada", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46743864429", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Cuervillo cara pelada.jpeg"}, {"id": "AVE-084", "name": "Cranioleuca curtata", "sciname": "curutiÃ© cejigrÃ­s", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "467384688", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/361096496/medium.jpg"}, {"id": "AVE-085", "name": "North American White-tailed Kite", "sciname": "Elanus leucurus majusculus", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Elanio maromero norteamericano", "loc": "Villa Nelly Iii, BogotÃ¡, BogotÃ¡, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/583975065/medium.jpg"}, {"id": "AVE-086", "name": "Falco columbarius columbarius", "sciname": "esmerejÃ³n de la taiga", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46753555243", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://static.inaturalist.org/photos/335767168/medium.jpeg"}, {"id": "AVE-087", "name": "FiofÃ­o silbÃ³n", "sciname": "Elaenia albiceps", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • FiofÃ­o silbÃ³n", "loc": "Mandalay, Antonio NariÃ±o, BogotÃ¡, Bogota, Colombia", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://static.inaturalist.org/photos/380590501/medium.jpeg"}, {"id": "AVE-088", "name": "Fulica americana columbiana", "sciname": "Focha comÃºn", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749827603", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/302944605/medium.jpeg"}, {"id": "AVE-089", "name": "Fulica americana", "sciname": "Gallareta americana", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46292648", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Gallareta americana.jpeg"}, {"id": "AVE-090", "name": "Gallaretas, polluelas y pollas de agua", "sciname": "Rallidae", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Gallaretas, polluelas y pollas de agua", "loc": "Humedal El Burro", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Gallaretas, polluelas y pollas de agua.jpeg"}, {"id": "AVE-091", "name": "Common Gallinule", "sciname": "Gallinula galeata", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Gallineta Frente Roja", "loc": "Santaf? de Bogot?, CO-CU, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://static.inaturalist.org/photos/5186393/medium.jpeg"}, {"id": "AVE-092", "name": "Gallineta morada", "sciname": "Porphyrio martinica", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Gallineta morada", "loc": "Cra. 80f #41b Sur-2 a 41b Sur-38, BogotÃ¡, Colombia", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Gallineta morada.jpeg"}, {"id": "AVE-093", "name": "Gallinetas", "sciname": "Gallinula", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Gallinetas", "loc": "humedal la vaca", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Gallinetas.jpeg"}, {"id": "AVE-094", "name": "Ganso comÃºn", "sciname": "Anser anser", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Ganso comÃºn", "loc": "Carrera 103A, BogotÃ¡, BogotÃ¡, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/569423540/medium.jpg"}, {"id": "AVE-095", "name": "Egretta caerulea", "sciname": "Garceta azul", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749827603", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Garceta azul.jpg"}, {"id": "AVE-096", "name": "Ardea ibis", "sciname": "Garcilla bueyera occidental", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4675038", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Garcilla bueyera occidental.jpeg"}, {"id": "AVE-097", "name": "Green Heron", "sciname": "Butorides virescens", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Garcita Verde", "loc": "Humedal La Vaca, BogotÃ¡, DC, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://static.inaturalist.org/photos/60568039/medium.jpg"}, {"id": "AVE-098", "name": "Striated Heron", "sciname": "Butorides striata", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Garcita verdosa", "loc": "Cra. 80f #41b Sur-2 a 41b Sur-38, BogotÃ¡, Colombia", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://static.inaturalist.org/photos/17119902/medium.jpeg"}, {"id": "AVE-099", "name": "Garrapatero mayor", "sciname": "Aves", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • 1970", "loc": "Sabanagrande, BogotÃ¡, Bogota, Colombia", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Garrapatero mayor.jpeg"}, {"id": "AVE-100", "name": "Garza blanca", "sciname": "Ardea alba", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Garza blanca", "loc": "Carrera 80A 17-75, BogotÃ¡, DC, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Garza blanca.jpg"}, {"id": "AVE-101", "name": "Nycticorax nycticorax", "sciname": "Garza Nocturna Corona Negra", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46760118", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Garza Nocturna Corona Negra.jpeg"}, {"id": "AVE-102", "name": "Garzas", "sciname": "Ardeidae", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Garzas", "loc": "San Bernardino", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Garzas.jpeg"}, {"id": "AVE-103", "name": "Ardeinae", "sciname": "Garzas, garcetas, garcillas y martinetes", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749827603", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Garzas, garcetas, garcillas y martinetes.jpeg"}, {"id": "AVE-104", "name": "Chondrohierax uncinatus", "sciname": "GavilÃ¡n Pico de Gancho", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46591442186", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://static.inaturalist.org/photos/659819383/medium.jpg"}, {"id": "AVE-105", "name": "Progne tapera", "sciname": "Golondrina parda", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749827603", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Golondrina parda.jpeg"}, {"id": "AVE-106", "name": "Orochelidon murina", "sciname": "Golondrina plomiza", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46416767812", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Golondrina plomiza.jpg"}, {"id": "AVE-107", "name": "Riparia riparia", "sciname": "Golondrina ribereÃ±a", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749827603", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/123837685/medium.jpeg"}, {"id": "AVE-108", "name": "Petrochelidon pyrrhonota", "sciname": "Golondrina risquera", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749827603", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Golondrina risquera.jpeg"}, {"id": "AVE-109", "name": "Hirundo rustica", "sciname": "Golondrina tijereta", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749827603", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Golondrina tijereta.jpeg"}, {"id": "AVE-110", "name": "Hirundinidae", "sciname": "Golondrinas", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46754799913", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Golondrinas.jpeg"}, {"id": "AVE-111", "name": "Progne", "sciname": "Golondrinas o martines", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749827603", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Golondrinas o martines.jpeg"}, {"id": "AVE-112", "name": "Zonotrichia capensis", "sciname": "GorriÃ³n Chingolo", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4629265", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Zonotrichia capensis costaricensis.png"}, {"id": "AVE-113", "name": "Zonotrichia", "sciname": "Gorriones y Copetones", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4640971", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Zonotrichia capensis costaricensis.png"}, {"id": "AVE-114", "name": "Grandes garzas", "sciname": "Ardea", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Grandes garzas", "loc": "Carrera 96F, BogotÃ¡, DC, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Grandes garzas.jpg"}, {"id": "AVE-115", "name": "Steatornis caripensis", "sciname": "GuÃ¡charo", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46566293641", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/143620420/medium.jpeg"}, {"id": "AVE-116", "name": "Guacamaya roja", "sciname": "Ara macao", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Guacamaya roja", "loc": "Cundinamarca, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Guacamaya roja.jpg"}, {"id": "AVE-117", "name": "Falco columbarius", "sciname": "HalcÃ³n esmerejÃ³n", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749827603", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/104986527/medium.jpeg"}, {"id": "AVE-118", "name": "Falco deiroleucus", "sciname": "HalcÃ³n Pecho Canela", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46564249455", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/178837882/medium.jpeg"}, {"id": "AVE-119", "name": "Falco peregrinus", "sciname": "HalcÃ³n Peregrino", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46766424129", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/112160847/medium.jpeg"}, {"id": "AVE-120", "name": "Halcones", "sciname": "Falco", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Halcones", "loc": "Cundinamarca, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Halcones.jpg"}, {"id": "AVE-121", "name": "Zenaida Doves", "sciname": "Zenaida", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Huilotas y parientes", "loc": "BogotÃ¡, D.C. , CO-CU, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Zenaida auriculata pentheria.png"}, {"id": "AVE-122", "name": "Threskiornithidae", "sciname": "Ibis y espÃ¡tulas", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46769762", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/193322163/medium.jpg"}, {"id": "AVE-123", "name": "Coeligena prunellei", "sciname": "Inca Negro", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46723190833", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Inca Negro.jpeg"}, {"id": "AVE-124", "name": "Gallito de ciÃ©naga", "sciname": "Jacana jacana", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Jacana", "loc": "San Francisco, Mosquera, Cundinamarca, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Jacana.jpg"}, {"id": "AVE-125", "name": "Spinus psaltria", "sciname": "Jilguerito Dominico", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46433560857", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Jilguerito Dominico.jpeg"}, {"id": "AVE-126", "name": "Spinus psaltria colombianus", "sciname": "Jilguerito Dominico SureÃ±o", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46293677609", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Jilguerito Dominico.jpeg"}, {"id": "AVE-127", "name": "Spinus", "sciname": "Jilgueritos", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4675915838", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Jilgueritos.jpeg"}, {"id": "AVE-128", "name": "Spinus spinescens", "sciname": "Jilguero andino", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46293677609", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Jilguero andino.jpeg"}, {"id": "AVE-129", "name": "Jilguero pechinegro", "sciname": "Spinus xanthogastrus", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Jilguero pechinegro", "loc": "Calle 40C Sur, BogotÃ¡, BogotÃ¡, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Jilguero pechinegro.jpg"}, {"id": "AVE-130", "name": "Tyto furcata", "sciname": "lechuza comÃºn americana", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46753587936", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/76900690/medium.jpg"}, {"id": "AVE-131", "name": "Oxyura ferruginea andina", "sciname": "MalvasÃ­a colombiana", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4640971", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/28647341/medium.jpeg"}, {"id": "AVE-132", "name": "Arremon assimilis", "sciname": "Matorralero de cabeza listada", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "Cundinamarca, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Matorralero de cabeza listada.jpg"}, {"id": "AVE-133", "name": "Metallura tyrianthina", "sciname": "Metalura Tiria", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "Cundinamarca, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Metalura Tiria.jpg"}, {"id": "AVE-134", "name": "Conirostrum rufum", "sciname": "Mielero Rufo", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46417092666", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Mielero Rufo.jpeg"}, {"id": "AVE-135", "name": "Ictinia mississippiensis", "sciname": "Milano de Mississippi", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749827603", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Milano de Mississippi.jpg"}, {"id": "AVE-136", "name": "Elanus", "sciname": "Milanos de alas negras", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749096823", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Milanos de alas negras.jpg"}, {"id": "AVE-137", "name": "Accipitridae", "sciname": "Milanos, aguilillas, gavilanes y Ã¡guilas", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749827603", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/89337841/medium.jpeg"}, {"id": "AVE-138", "name": "Turdus fuscater", "sciname": "Mirla patinaranja", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4641913", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Mirla patinaranja.jpeg"}, {"id": "AVE-139", "name": "Turdus", "sciname": "Mirlos", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46252502784", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Mirlos.jpeg"}, {"id": "AVE-140", "name": "Chrysomus icterocephalus bogotensis", "sciname": "monjita bogotana", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46416767812", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/monjita bogotana.jpg"}, {"id": "AVE-141", "name": "Chrysomus icterocephalus", "sciname": "Monjita Cabeciamarilla", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4641913", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Monjita Cabeciamarilla.jpeg"}, {"id": "AVE-142", "name": "Camptostoma obsoletum", "sciname": "Mosquerito silbador", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "Cundinamarca, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Mosquerito silbador.jpg"}, {"id": "AVE-143", "name": "Mosquero cardenal", "sciname": "Pyrocephalus rubinus", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Mosquero cardenal", "loc": "Cra. 81c #40c Sur-21 a 40c Sur-35, BogotÃ¡, Colombia", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Mosquero cardenal.jpeg"}, {"id": "AVE-144", "name": "Mosquero Elaenia CopetÃ³n", "sciname": "Elaenia flavogaster", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Mosquero Elaenia CopetÃ³n", "loc": "PEDH La Vaca", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/44754102/medium.jpg"}, {"id": "AVE-145", "name": "Mosqueros Elaenia", "sciname": "Aves", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • 16679", "loc": "AV. A. MejÃ­a - CL 15A, Kennedy, BogotÃ¡, Colombia", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Mosqueros Elaenia.jpg"}, {"id": "AVE-146", "name": "Paloma DomÃ©stica", "sciname": "Columba livia domestica", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • paloma domÃ©stica", "loc": "Humedal La Vaca, BogotÃ¡, DC, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://static.inaturalist.org/photos/16019684/medium.jpg"}, {"id": "AVE-147", "name": "Palomas del Viejo Mundo", "sciname": "Columba", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Palomas del Viejo Mundo", "loc": "Transversal 87 Bis A, BogotÃ¡, DC, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Palomas del Viejo Mundo.jpg"}, {"id": "AVE-148", "name": "Columbidae", "sciname": "Palomas, tortolitas y coquitas", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46663450495", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Palomas, tortolitas y coquitas.jpeg"}, {"id": "AVE-149", "name": "Columbiformes", "sciname": "Palomas, tortolitas y coquitas", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46217259516", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Palomas, tortolitas y coquitas.jpeg"}, {"id": "AVE-150", "name": "Zenaida auriculata", "sciname": "Palomita montera", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4629265", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Palomita montera.jpeg"}, {"id": "AVE-151", "name": "Empidonax alnorum", "sciname": "Papamoscas Ailero", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749827603", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Papamoscas Ailero.jpeg"}, {"id": "AVE-152", "name": "Papamoscas Boreal", "sciname": "Contopus cooperi", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Papamoscas Boreal", "loc": "Carrera 106, BogotÃ¡, DC, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Papamoscas Boreal.jpg"}, {"id": "AVE-153", "name": "Papamoscas", "sciname": "Contopus", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Papamoscas Contopus", "loc": "Cra. 80f #41b Sur-2 a 41b Sur-38, BogotÃ¡, Colombia", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Papamoscas Ailero.jpeg"}, {"id": "AVE-154", "name": "Papamoscas del Este", "sciname": "Contopus virens", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Papamoscas del Este", "loc": "Carrera 86 #6d-2 a 6d-82 Bogot?", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Papamoscas del Este.jpeg"}, {"id": "AVE-155", "name": "Western Wood-Pewee", "sciname": "Contopus sordidulus", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Papamoscas del Oeste", "loc": "Carrera 80D, BogotÃ¡, DC, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://static.inaturalist.org/photos/54760519/medium.jpg"}, {"id": "AVE-156", "name": "Empidonax", "sciname": "Papamoscas Empidonax", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749827603", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Papamoscas Empidonax.jpeg"}, {"id": "AVE-157", "name": "Myiarchus", "sciname": "Papamoscas Myiarchus", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749988", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Papamoscas Myiarchus.jpeg"}, {"id": "AVE-158", "name": "Papamoscas negro", "sciname": "Aves", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • 17013", "loc": "Calle 40Bs, BogotÃ¡, DC, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Papamoscas negro.jpg"}, {"id": "AVE-159", "name": "Myiodynastes maculatus", "sciname": "Papamoscas Rayado Cheje", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4666261", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Papamoscas Rayado Cheje.jpeg"}, {"id": "AVE-160", "name": "Myiodynastes luteiventris", "sciname": "Papamoscas Rayado ComÃºn", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46423722699", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/28647894/medium.jpeg"}, {"id": "AVE-161", "name": "Myiodynastes", "sciname": "Papamoscas Rayados", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749827603", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Papamoscas Rayados.jpg"}, {"id": "AVE-162", "name": "Empidonax traillii", "sciname": "Papamoscas Saucero", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749827603", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Papamoscas Saucero.jpeg"}, {"id": "AVE-163", "name": "Contopus bogotensis", "sciname": "Papamoscas Tropical NorteÃ±o", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46431653523", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://static.inaturalist.org/photos/688797191/medium.jpg"}, {"id": "AVE-164", "name": "Empidonax virescens", "sciname": "Papamoscas Verdoso", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46203132095", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Papamoscas Verdoso.jpg"}, {"id": "AVE-165", "name": "Great Crested Flycatcher", "sciname": "Myiarchus crinitus", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Papamoscas viajero", "loc": "Calle 40bisa Sur, BogotÃ¡, DC, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://static.inaturalist.org/photos/101230015/medium.jpg"}, {"id": "AVE-166", "name": "Tringa melanoleuca", "sciname": "Patamarilla mayor", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749827603", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Patamarilla mayor.jpeg"}, {"id": "AVE-167", "name": "Tringa flavipes", "sciname": "Patamarilla menor", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4641913", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Patamarilla menor.jpeg"}, {"id": "AVE-168", "name": "Tringa", "sciname": "Patamarillas y parientes", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749827603", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Patamarillas y parientes.jpeg"}, {"id": "AVE-169", "name": "Pato careto", "sciname": "Dendrocygna viduata", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Pato careto", "loc": "FontibÃ³n, BogotÃ¡, Colombia", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Pato careto.jpeg"}, {"id": "AVE-170", "name": "Nomonyx dominicus", "sciname": "Pato Enmascarado", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46424597512", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Pato Enmascarado.jpeg"}, {"id": "AVE-171", "name": "Anas bahamensis", "sciname": "Pato gargantilla", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46442218169", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Pato gargantilla.jpeg"}, {"id": "AVE-172", "name": "Cairina moschata domestica", "sciname": "Pato real domÃ©stico", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46217137", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/228079443/medium.jpeg"}, {"id": "AVE-173", "name": "Oxyura ferruginea", "sciname": "pato zambullidor grande", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4645174", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/pato zambullidor grande.jpeg"}, {"id": "AVE-174", "name": "Anatidae", "sciname": "Patos, gansos, cisnes y parientes", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46292648", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Patos, gansos, cisnes y parientes.jpeg"}, {"id": "AVE-175", "name": "Penelope montagnii", "sciname": "Pava Andina", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46271156819", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Pava Andina.jpeg"}, {"id": "AVE-176", "name": "Diglossa sittoides", "sciname": "Payador canela", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46476048376", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Payador canela.jpeg"}, {"id": "AVE-177", "name": "Tyrannus melancholicus melancholicus", "sciname": "Pepite", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46391186765", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Pepite.png"}, {"id": "AVE-178", "name": "Forpus conspicillatus", "sciname": "Perico de anteojos", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4675038", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Perico de anteojos.jpeg"}, {"id": "AVE-179", "name": "Diglossa humeralis", "sciname": "Picaflor negro", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "Cundinamarca, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Picaflor negro.jpeg"}, {"id": "AVE-180", "name": "Pheucticus ludovicianus", "sciname": "Picogordo Degollado", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46293677609", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Picogordo Degollado.jpeg"}, {"id": "AVE-181", "name": "Dendrocygna autumnalis", "sciname": "Pijije Alas Blancas", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4641913", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Pijije Alas Blancas.jpeg"}, {"id": "AVE-182", "name": "Dendrocygna bicolor", "sciname": "Pijije canelo", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749827603", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Pijije canelo.jpeg"}, {"id": "AVE-183", "name": "Mecocerculus leucophrys", "sciname": "Piojito gargantilla", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "Cundinamarca, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Piojito gargantilla.jpg"}, {"id": "AVE-184", "name": "Catamenia analis", "sciname": "Piquitodeoro chico", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46416767812", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Piquitodeoro chico.jpg"}, {"id": "AVE-185", "name": "Piranga olivacea", "sciname": "Piranga escarlata", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4641913", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Piranga escarlata.jpeg"}, {"id": "AVE-186", "name": "Piranga rubra", "sciname": "Piranga roja", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4641913", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Piranga roja.jpeg"}, {"id": "AVE-187", "name": "Piranga", "sciname": "Pirangas", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4640971", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Pirangas.jpeg"}, {"id": "AVE-188", "name": "Actitis macularius", "sciname": "Playero alzacolita", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749827603", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Playero alzacolita.jpeg"}, {"id": "AVE-189", "name": "Calidris melanotos", "sciname": "Playero Pectoral", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46750708034", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Playero Pectoral.jpeg"}, {"id": "AVE-190", "name": "Tringa solitaria", "sciname": "Playero Solitario", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4640971", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Playero Solitario.jpeg"}, {"id": "AVE-191", "name": "Scolopacidae", "sciname": "Playeros, zarapitos, picopandos, vuelvepiedras, costureros y falaropos", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46750708034", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Playeros, zarapitos, picopandos, vuelvepiedras, costureros y falaropos.jpeg"}, {"id": "AVE-192", "name": "Polla de agua sabanera", "sciname": "Porphyriops melanops bogotensis", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Polla de agua sabanera", "loc": "Calle 40c Sur #80j-2 a 80j-98 BogotÃ¡", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Polla de agua sabanera.jpg"}, {"id": "AVE-193", "name": "Polluela sora", "sciname": "Porzana carolina", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Polluela Sora", "loc": "BogotÃ¡, DC, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Polluela Sora.jpg"}, {"id": "AVE-194", "name": "Sturnella magna", "sciname": "Pradero Tortillaconchile", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46760118", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Pradero Tortillaconchile.jpg"}, {"id": "AVE-195", "name": "Pardirallus maculatus", "sciname": "RascÃ³n pinto", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4675038", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/61213213/medium.jpg"}, {"id": "AVE-196", "name": "Troglodytes", "sciname": "Ratonas", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4647497902", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Ratonas.jpeg"}, {"id": "AVE-197", "name": "Pheucticus aureoventris", "sciname": "Rey del bosque", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "Cundinamarca, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Rey del bosque.jpeg"}, {"id": "AVE-198", "name": "SaÃ­ra de antifaz", "sciname": "Aves", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • 10711", "loc": "46409061702", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Aves de percha.jpeg"}, {"id": "AVE-199", "name": "Troglodytes musculus", "sciname": "Saltapared ComÃºn SureÃ±o", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4641913", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Troglodytes musculus columbae.png"}, {"id": "AVE-200", "name": "Palm Tanager", "sciname": "Thraupis palmarum", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • TÃ¡ngara palmera", "loc": "Kennedy, BogotÃ¡, Colombia", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/150064441/medium.jpeg"}, {"id": "AVE-201", "name": "Cissopis leverianus", "sciname": "TÃ¡ngara urraca", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46271157", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/88619399/medium.jpeg"}, {"id": "AVE-202", "name": "Tangara azulgris", "sciname": "Thraupis episcopus", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Tangara azulgrÃ­s", "loc": "PEDH LA VACA", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Tangara azulgrís.jpg"}, {"id": "AVE-203", "name": "Thraupidae", "sciname": "Tangaras, mieleros, semilleros y parientes", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749827603", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Tangaras, mieleros, semilleros y parientes.jpg"}, {"id": "AVE-204", "name": "Chuck-will's-widow", "sciname": "Antrostomus carolinensis", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Tapacaminos de Carolina", "loc": "BogotÃ¡, DC, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://static.inaturalist.org/photos/62857404/medium.jpg"}, {"id": "AVE-205", "name": "TapicurÃº", "sciname": "Mesembrinibis cayennensis", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • TapicurÃº", "loc": "Humedal Meandro del Say, BogotÃ¡ FontibÃ³n", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Tapicurú.jpeg"}, {"id": "AVE-206", "name": "Rallus semiplumbeus", "sciname": "Tingua bogotana", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46500205815", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Tingua bogotana.jpg"}, {"id": "AVE-207", "name": "Porphyriops melanops", "sciname": "Tingua moteada", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46742280662", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Tingua moteada.jpeg"}, {"id": "AVE-208", "name": "Tyrannus tyrannus", "sciname": "Tirano dorso negro", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46760118", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Tirano dorso negro.jpg"}, {"id": "AVE-209", "name": "Tyrannus niveigularis", "sciname": "Tirano GolinÃ­veo", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749827603", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/579248653/medium.jpg"}, {"id": "AVE-210", "name": "Tyrannus dominicensis", "sciname": "Tirano gris", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749827603", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Tirano gris.jpeg"}, {"id": "AVE-211", "name": "Tirano PirirÃ­", "sciname": "Tyrannus melancholicus", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Tirano PirirÃ­", "loc": "Cl. 7a Bis #80b-1 a 80b-55, BogotÃ¡, Colombia", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Tirano Pirirí.jpg"}, {"id": "AVE-212", "name": "Tyrannus savana", "sciname": "Tirano Tijereta Gris", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46287087201", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Tirano Tijereta Gris.jpeg"}, {"id": "AVE-213", "name": "Tiranos", "sciname": "Tyrannus", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Tiranos", "loc": "Calle 15, BogotÃ¡, BogotÃ¡, CO", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Tiranos.jpg"}, {"id": "AVE-214", "name": "Tyrannidae", "sciname": "tiranos, papamoscas y parientes", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4641913", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/tiranos, papamoscas y parientes.jpeg"}, {"id": "AVE-215", "name": "Serpophaga cinerea", "sciname": "Tiranuelo saltarroyo", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749827603", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Tiranuelo saltarroyo.jpg"}, {"id": "AVE-216", "name": "Molothrus bonariensis", "sciname": "Tordo Sudamericano", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46292648", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Tordo Sudamericano.jpeg"}, {"id": "AVE-217", "name": "Molothrus", "sciname": "Tordos", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4620294099", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Tordos.jpg"}, {"id": "AVE-218", "name": "Tucancito Esmeralda", "sciname": "Aves", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • 558484", "loc": "46577441951", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Tucancito Esmeralda.jpg"}, {"id": "AVE-219", "name": "Tuquito gris", "sciname": "Empidonomus aurantioatrocristatus", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Tuquito gris", "loc": "Pio XII, Bogota, Colombia", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Tuquito gris.jpeg"}, {"id": "AVE-220", "name": "Empidonomus varius", "sciname": "Tuquito rayado", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46794927514", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Tuquito rayado.jpeg"}, {"id": "AVE-221", "name": "Icterus icterus", "sciname": "Turpial", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46212337903", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Turpial.jpeg"}, {"id": "AVE-222", "name": "Gymnomystax mexicanus", "sciname": "Turpial lagunero", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46292648", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Turpial lagunero.jpeg"}, {"id": "AVE-223", "name": "Vireo olivaceus", "sciname": "Vireo Ojos Rojos", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749988", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Vireo Ojos Rojos.jpg"}, {"id": "AVE-224", "name": "Vireo verdeamarillo", "sciname": "Vireo flavoviridis", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Vireo verdeamarillo", "loc": "Parque Aloha", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Vireo verdeamarillo.jpeg"}, {"id": "AVE-225", "name": "Podilymbus podiceps", "sciname": "Zambullidor pico grueso", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46427512307", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Zambullidor pico grueso.jpeg"}, {"id": "AVE-226", "name": "Quiscalus lugubris", "sciname": "Zanate caribeÃ±o", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4645174", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/28647360/medium.jpeg"}, {"id": "AVE-227", "name": "Quiscalus", "sciname": "Zanates", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46279508814", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Zanates.jpeg"}, {"id": "AVE-228", "name": "Coragyps atratus", "sciname": "Zopilote comÃºn", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46760118", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/37420938/medium.jpeg"}, {"id": "AVE-229", "name": "Cathartes", "sciname": "Zopilotes", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46749827603", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Zopilotes.jpeg"}, {"id": "AVE-230", "name": "Catharus fuscescens", "sciname": "Zorzal Canelo", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4629157", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Zorzal Canelo.jpeg"}, {"id": "AVE-231", "name": "Catharus ustulatus", "sciname": "Zorzal de Anteojos", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "4629265", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Zorzal de Anteojos.jpeg"}, {"id": "AVE-232", "name": "Catharus", "sciname": "Zorzales", "cat": 1, "role": "Avifauna de humedales y dosel de Kennedy • Aves", "loc": "46479286552", "alert": "Registro verificado iNaturalist / Red de Humedales", "img": "./assets/fotos/fotos_aves/Zorzales.jpeg"}, {"id": "MAM-01", "name": "Muroidea", "sciname": "Muroidea", "cat": 2, "role": "Mamíferos / Mastofauna de Kennedy • Mammalia", "loc": "4641913", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "./assets/fotos/fotos_mamiferos/Muroidea.jpg"}, {"id": "MAM-02", "name": "Neogale frenata affinis", "sciname": "Neogale frenata affinis", "cat": 2, "role": "Mamíferos / Mastofauna de Kennedy • Mammalia", "loc": "46559740256", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "./assets/fotos/fotos_mamiferos/Neogale frenata affinis.jpg"}, {"id": "MAM-03", "name": "Sciurus granatensis", "sciname": "Ardilla de cola roja", "cat": 2, "role": "Mamíferos / Mastofauna de Kennedy • Mammalia", "loc": "46286983908", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "./assets/fotos/fotos_mamiferos/Ardilla de cola roja.jpeg"}, {"id": "MAM-04", "name": "Cuis comÃºn", "sciname": "Mammalia", "cat": 2, "role": "Mamíferos / Mastofauna de Kennedy • 43813", "loc": "Ciudadela La Felicidad, ZONA 5, BogotÃ¡, Colombia", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/569033166/medium.jpg"}, {"id": "MAM-05", "name": "Cusumbo andino", "sciname": "Nasua olivacea", "cat": 2, "role": "Mamíferos / Mastofauna de Kennedy • Cusumbo andino", "loc": "Cundinamarca, CO", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "./assets/fotos/fotos_mamiferos/Cusumbo andino.jpg"}, {"id": "MAM-06", "name": "Phyllostomus hastatus", "sciname": "MurciÃ©lago nariz de lanza mayor", "cat": 2, "role": "Mamíferos / Mastofauna de Kennedy • Mammalia", "loc": "46272695569", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/222049195/medium.jpeg"}, {"id": "MAM-07", "name": "Canis familiaris", "sciname": "Perro DomÃ©stico", "cat": 2, "role": "Mamíferos / Mastofauna de Kennedy • Mammalia", "loc": "46612657261", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/262586406/medium.jpeg"}, {"id": "MAM-08", "name": "Rata gris asiÃ¡tica", "sciname": "Rattus norvegicus", "cat": 2, "role": "Mamíferos / Mastofauna de Kennedy • Rata gris asiÃ¡tica", "loc": "Br. San Pedro, FontibÃ³n, BogotÃ¡, Colombia", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/744390733/medium.jpg"}, {"id": "MAM-09", "name": "Rattus rattus", "sciname": "Rata negra", "cat": 2, "role": "Mamíferos / Mastofauna de Kennedy • Mammalia", "loc": "46624666667", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "./assets/fotos/fotos_mamiferos/Rata negra.jpeg"}, {"id": "MAM-10", "name": "Mus musculus", "sciname": "RatÃ³n casero eurasiÃ¡tico", "cat": 2, "role": "Mamíferos / Mastofauna de Kennedy • Mammalia", "loc": "46604305585", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/413985905/medium.jpeg"}, {"id": "MAM-11", "name": "Rattini", "sciname": "Ratas", "cat": 2, "role": "Mamíferos / Mastofauna de Kennedy • Mammalia", "loc": "46423112244", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "./assets/fotos/fotos_mamiferos/Ratas.jpg"}, {"id": "MAM-12", "name": "Ratas del viejo mundo", "sciname": "Rattus", "cat": 2, "role": "Mamíferos / Mastofauna de Kennedy • Ratas del viejo mundo", "loc": "Villa Alsacia, Ciudad Kennedy, BogotÃ¡, Bogota, Colombia", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "./assets/fotos/fotos_mamiferos/Ratas del viejo mundo.jpeg"}, {"id": "MAM-13", "name": "Ratas y ratones del viejo mundo", "sciname": "Muridae", "cat": 2, "role": "Mamíferos / Mastofauna de Kennedy • Ratas y ratones del viejo mundo", "loc": "Kennedy, BogotÃ¡, Colombia", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "./assets/fotos/fotos_mamiferos/Ratas y ratones del viejo mundo.jpeg"}, {"id": "MAM-14", "name": "Mus", "sciname": "Ratones", "cat": 2, "role": "Mamíferos / Mastofauna de Kennedy • Mammalia", "loc": "4640971", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "./assets/fotos/fotos_mamiferos/Ratones.jpg"}, {"id": "MAM-15", "name": "Rodentia", "sciname": "Roedores", "cat": 2, "role": "Mamíferos / Mastofauna de Kennedy • Mammalia", "loc": "46424597512", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "./assets/fotos/fotos_mamiferos/Roedores.jpeg"}, {"id": "MOL-01", "name": "Euthyneura", "sciname": "Euthyneura", "cat": 3, "role": "Moluscos / Gasterópodos de Kennedy • GasterÃ³podos eutineuros", "loc": "Dindalito Bella Vista Park", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "https://static.inaturalist.org/photos/337373950/medium.jpeg"}, {"id": "MOL-02", "name": "Caracoles, babosas y parientes", "sciname": "Gastropoda", "cat": 3, "role": "Moluscos / Gasterópodos de Kennedy • Caracoles, babosas y parientes", "loc": "La Igualdad, Antonio NariÃ±o, BogotÃ¡, Colombia", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "./assets/fotos/fotos_moluscos/Caracoles, babosas y parientes.jpg"}, {"id": "MOL-03", "name": "Caracol europeo de jardÃ­n", "sciname": "Cornu aspersum", "cat": 3, "role": "Moluscos / Gasterópodos de Kennedy • Caracol europeo de jardÃ­n", "loc": "Br. El Vergel Occidental, Kennedy, BogotÃ¡, Colombia", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/717211012/medium.jpg"}, {"id": "MOL-04", "name": "Eupulmonata", "sciname": "Babosas y caracoles de tierra", "cat": 3, "role": "Moluscos / Gasterópodos de Kennedy • Mollusca", "loc": "46205276", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "./assets/fotos/fotos_moluscos/Babosas y caracoles de tierra.jpeg"}, {"id": "MOL-05", "name": "Limacus", "sciname": "Babosas europeas", "cat": 3, "role": "Moluscos / Gasterópodos de Kennedy • Mollusca", "loc": "46239431592", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "./assets/fotos/fotos_moluscos/Babosas europeas.jpg"}, {"id": "MOL-06", "name": "Gastropods", "sciname": "Ambigolimax", "cat": 3, "role": "Moluscos / Gasterópodos de Kennedy • Babosas de tres bandas", "loc": "Carrera 91, BogotÃ¡, CO", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/216663801/medium.jpg"}, {"id": "MOL-07", "name": "Babosa gris de jardÃ­n", "sciname": "Mollusca", "cat": 3, "role": "Moluscos / Gasterópodos de Kennedy • 124432", "loc": "Nuevo Techo, Kennedy, BogotÃ¡, Colombia", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/522237350/medium.jpg"}, {"id": "MOL-08", "name": "Babosa europea tigre", "sciname": "Limax maximus", "cat": 3, "role": "Moluscos / Gasterópodos de Kennedy • Babosa europea tigre", "loc": "AC 8 - Kr 84, Kennedy, BogotÃ¡, Colombia", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "./assets/fotos/fotos_moluscos/Babosa europea tigre.jpg"}, {"id": "MOL-09", "name": "Milax gagates", "sciname": "Babosa europea de invernadero", "cat": 3, "role": "Moluscos / Gasterópodos de Kennedy • Mollusca", "loc": "46347585499", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "./assets/fotos/fotos_moluscos/Babosa europea de invernadero.jpg"}, {"id": "MOL-10", "name": "Mollusca", "sciname": "322417", "cat": 3, "role": "Moluscos / Gasterópodos de Kennedy • 322417", "loc": "46624116897", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/168429939/medium.jpg"}, {"id": "MOL-11", "name": "Oxychilus", "sciname": "Oxychilus", "cat": 3, "role": "Moluscos / Gasterópodos de Kennedy • Oxychilus", "loc": "AK 68 - AC 3, BogotÃ¡, Colombia", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "./assets/fotos/fotos_moluscos/Oxychilus.jpeg"}, {"id": "MOL-12", "name": "Planorbinae", "sciname": "Planorbinae", "cat": 3, "role": "Moluscos / Gasterópodos de Kennedy • Planorbinae", "loc": "Ciudad Hayuelos, BogotÃ¡, CO", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "./assets/fotos/fotos_moluscos/Planorbinae.jpg"}, {"id": "MOL-13", "name": "Limacinae", "sciname": "Limacinae", "cat": 3, "role": "Moluscos / Gasterópodos de Kennedy • Mollusca", "loc": "46622867735", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "./assets/fotos/fotos_moluscos/Limacinae.jpg"}, {"id": "MOL-14", "name": "512198", "sciname": "Mollusca", "cat": 3, "role": "Moluscos / Gasterópodos de Kennedy • 512198", "loc": "AV. A. MejÃ­a - CL 38 Sur, Kennedy, BogotÃ¡, Colombia", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/584015464/medium.jpg"}, {"id": "ANF-01", "name": "Pristimantis elegans", "sciname": "Pristimantis elegans", "cat": 4, "role": "Anfibios / Bioindicadores hídricos • Amphibia", "loc": "46339265041", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "./assets/fotos/fotos_anfibios/Pristimantis elegans.jpeg"}, {"id": "ANF-02", "name": "Bolitoglossa adspersa", "sciname": "Bolitoglossa adspersa", "cat": 4, "role": "Anfibios / Bioindicadores hídricos • Amphibia", "loc": "46459848201", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "./assets/fotos/fotos_anfibios/Bolitoglossa adspersa.jpg"}, {"id": "ANF-03", "name": "Ranas y sapos", "sciname": "Dendropsophus molitor", "cat": 4, "role": "Anfibios / Bioindicadores hídricos • Rana sabanera", "loc": "Calle 51 Sur, BogotÃ¡, BogotÃ¡, CO", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "./assets/fotos/fotos_anfibios/Ranas y sapos.jpeg"}, {"id": "ANF-04", "name": "Frogs and Toads", "sciname": "Anura", "cat": 4, "role": "Anfibios / Bioindicadores hídricos • Ranas y sapos", "loc": "BogotÃ¡, D.C. , CO-CU, CO", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/174417754/medium.jpeg"}, {"id": "ANF-05", "name": "Dendropsophus molitor", "sciname": "Dendropsophus molitor", "cat": 4, "role": "Anfibios / Bioindicadores hídricos • Rana sabanera", "loc": "AV. C. Cali - CL 6D, BogotÃ¡, Colombia", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": ""}, {"id": "ANF-06", "name": "Giant Toad", "sciname": "Rhinella horribilis", "cat": 4, "role": "Anfibios / Bioindicadores hídricos • Sapo gigante", "loc": "KR 94 Bis - CL 6A Br. Ciudad Tintal II, BogotÃ¡, Colombia", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "https://static.inaturalist.org/photos/461501407/medium.jpeg"}, {"id": "ANF-07", "name": "Hyloxalus subpunctatus", "sciname": "Hyloxalus subpunctatus", "cat": 4, "role": "Anfibios / Bioindicadores hídricos • Amphibia", "loc": "46606089157", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": ""}, {"id": "ANF-08", "name": "Hylidae", "sciname": "Ranas arborÃ­colas tÃ­picas", "cat": 4, "role": "Anfibios / Bioindicadores hídricos • Amphibia", "loc": "46617370644", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": ""}, {"id": "ANF-09", "name": "Rana sabanera", "sciname": "Dendropsophus molitor", "cat": 4, "role": "Anfibios / Bioindicadores hídricos • Rana sabanera", "loc": "CL 26 Sur - KR 97F Br. Tierra Buena, Kennedy, BogotÃ¡, Colombia", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "./assets/fotos/fotos_anfibios/Rana sabanera.jpg"}, {"id": "REP-01", "name": "Serpiente sabanera", "sciname": "Atractus crassicaudatus", "cat": 5, "role": "Reptiles / Sauros y Ofidios • Serpiente sabanera", "loc": "Urb. Los Condominios, Kennedy, BogotÃ¡, Colombia", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "./assets/fotos/fotos_reptiles/Serpiente sabanera.jpg"}, {"id": "REP-02", "name": "DumÃ©ril's Whorltail Iguana", "sciname": "Stenocercus trachycephalus", "cat": 5, "role": "Reptiles / Sauros y Ofidios • Lagarto Collarejo", "loc": "Cundinamarca, CO", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "https://static.inaturalist.org/photos/730577939/medium.jpg"}, {"id": "REP-03", "name": "Striped Lightbulb Lizard", "sciname": "Riama striata", "cat": 5, "role": "Reptiles / Sauros y Ofidios • Lagartija bombillo estriada", "loc": "AV. A. MejÃ­a - CL 38 Sur, BogotÃ¡, Colombia", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "https://static.inaturalist.org/photos/390811940/medium.jpeg"}, {"id": "REP-04", "name": "South American slider", "sciname": "Trachemys callirostris", "cat": 5, "role": "Reptiles / Sauros y Ofidios • Jicotea Sudamericana", "loc": "Cundinamarca, CO", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/740090302/medium.jpg"}, {"id": "REP-05", "name": "Iguana verde", "sciname": "Iguana iguana", "cat": 5, "role": "Reptiles / Sauros y Ofidios • Iguana verde", "loc": "AV. Alsacia - KR 71B, Kennedy, BogotÃ¡, Colombia", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "./assets/fotos/fotos_reptiles/Iguana verde.jpg"}, {"id": "REP-06", "name": "Hicotea", "sciname": "Trachemys callirostris callirostris", "cat": 5, "role": "Reptiles / Sauros y Ofidios • Hicotea", "loc": "Cundinamarca, CO", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "./assets/fotos/fotos_reptiles/Hicotea.jpeg"}, {"id": "REP-07", "name": "Culebras y parientes", "sciname": "Reptilia", "cat": 5, "role": "Reptiles / Sauros y Ofidios • 26504", "loc": "Tintala, Ciudad Kennedy, BogotÃ¡, Colombia", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "./assets/fotos/fotos_reptiles/Culebras y parientes.jpeg"}, {"id": "REP-08", "name": "BogotÃ¡ Anadia", "sciname": "Anadia bogotensis", "cat": 5, "role": "Reptiles / Sauros y Ofidios • charchala", "loc": "Cundinamarca, CO", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "https://static.inaturalist.org/photos/497045671/medium.jpeg"}, {"id": "REP-09", "name": "Asian House Gecko", "sciname": "Hemidactylus frenatus", "cat": 5, "role": "Reptiles / Sauros y Ofidios • Besucona asiÃ¡tica", "loc": "Kennedy", "alert": "Registro verificado iNaturalist / Humedales de Kennedy", "img": "https://static.inaturalist.org/photos/577489030/medium.jpg"}];

  const rawTaxa = FULL_DATASET;
  const rawNodes = [];
  const nodeSprites = [];
  const networkGroup = new THREE.Group();
  sceneRoot.add(networkGroup);

  const SPHERE_RADIUS = 34.0;

  // Texturas circulares con imagen real iNaturalist / SIGAU y fallback SVG inmediato
  function createCircularTexture(imgUrl, taxonId, speciesName, cat) {
    const cvs = document.createElement("canvas");
    cvs.width = 128; cvs.height = 128;
    const ctx = cvs.getContext("2d");

    const catColor = palette.catColors[cat] || '#84a48b';
    const tex = new THREE.CanvasTexture(cvs);

    const drawFallback = () => {
      ctx.clearRect(0, 0, 128, 128);
      ctx.beginPath();
      ctx.arc(64, 64, 58, 0, Math.PI * 2);
      ctx.fillStyle = catColor;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(64, 64, 52, 0, Math.PI * 2);
      ctx.fillStyle = "#0a0a0c";
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 15px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(taxonId, 64, 54);
      ctx.font = "bold 11px sans-serif";
      ctx.fillStyle = catColor;
      ctx.fillText((speciesName || '').substring(0, 9), 64, 74);
      tex.needsUpdate = true;
    };

    drawFallback();

    if (imgUrl) {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = imgUrl;
      img.onload = () => {
        try {
          ctx.clearRect(0, 0, 128, 128);
          ctx.save();
          ctx.beginPath();
          ctx.arc(64, 64, 56, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(img, 0, 0, 128, 128);
          ctx.restore();

          ctx.beginPath();
          ctx.arc(64, 64, 56, 0, Math.PI * 2);
          ctx.strokeStyle = catColor;
          ctx.lineWidth = 6;
          ctx.stroke();

          tex.needsUpdate = true;
        } catch(e) { drawFallback(); }
      };
      img.onerror = drawFallback;
    }

    return tex;
  }

  // Generación de Nodos 3D en esfera
  rawTaxa.forEach((tData, idx) => {
    const phi = Math.acos(1 - 2 * ((idx + 0.5) / rawTaxa.length));
    const theta = Math.PI * (1 + Math.sqrt(5)) * idx;
    const rad = SPHERE_RADIUS + ((idx * 7) % 10) - 5;

    const nx = rad * Math.sin(phi) * Math.cos(theta);
    const ny = rad * Math.sin(phi) * Math.sin(theta);
    const nz = rad * Math.cos(phi);

    const tex = createCircularTexture(tData.img, tData.id, tData.name, tData.cat);
    const spriteMat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(3.4, 3.4, 1.0);
    sprite.position.set(nx, ny, nz);
    sprite.userData = { id: idx, taxaId: tData.id, taxon: tData };
    networkGroup.add(sprite);
    nodeSprites.push(sprite);

    rawNodes.push({
      id: idx,
      taxaId: tData.id,
      label: tData.name,
      sciname: tData.sciname,
      cat: tData.cat,
      role: tData.role,
      loc: tData.loc,
      alert: tData.alert,
      photoUrl: tData.img || generateSpeciesSvgDataUri(tData.id, tData.name, tData.cat),
      x: nx, y: ny, z: nz,
      ox: nx, oy: ny, oz: nz,
      baseX: nx, baseY: ny, baseZ: nz,
      active: true,
      hiddenByUser: false,
      neighbors: [],
      degree: 0,
      sprite: sprite
    });
  });

  // =====================================================================
  // 2. GENERADOR DE RELACIONES BIÓTICAS Y ENLACES
  // =====================================================================
  const rawEdges = [];
  const edgeDetailsMap = {};

  const INTER_TYPES = {
    PREDATION:    { id: 0, name: 'Depredación', color: '#C96349' },
    HERBIVORY:    { id: 1, name: 'Herbivoría', color: '#84A48B' },
    DISPERSAL:    { id: 2, name: 'Dispersión de Semillas', color: '#E69888' },
    MUTUALISM:    { id: 3, name: 'Mutualismo', color: '#E7C878' },
    NESTING:      { id: 4, name: 'Nidificación & Refugio', color: '#F79E70' },
    POLLINATION:  { id: 5, name: 'Visita Floral / Polinización', color: '#A386A9' },
    NEST_SITE:    { id: 6, name: 'Anidamiento de Dosel', color: '#D1A996' },
    PARASITISM:   { id: 7, name: 'Parasitismo de Nido', color: '#C6B3CA' },
    ALLELOPATHY:  { id: 8, name: 'Competencia / Biofiltro', color: '#6B9080' }
  };

  function addConscientiousEdge(sourceNode, targetNode, interType, rationale) {
    if (!sourceNode || !targetNode || sourceNode.id === targetNode.id) return;
    const key = sourceNode.id < targetNode.id ? `${sourceNode.id}_${targetNode.id}` : `${targetNode.id}_${sourceNode.id}`;
    if (edgeDetailsMap[key]) return;

    rawEdges.push({ source: sourceNode.id, target: targetNode.id });
    edgeDetailsMap[key] = { source: sourceNode.id, target: targetNode.id, type: interType, rationale: rationale || '' };
    
    if (!sourceNode.neighbors.includes(targetNode)) {
      sourceNode.neighbors.push(targetNode);
    }
    if (!targetNode.neighbors.includes(sourceNode)) {
      targetNode.neighbors.push(sourceNode);
    }
  }

  function getInteractionInfo(nodeA, nodeB) {
    if (!nodeA || !nodeB) return INTER_TYPES.MUTUALISM;
    const key = nodeA.id < nodeB.id ? `${nodeA.id}_${nodeB.id}` : `${nodeB.id}_${nodeA.id}`;
    if (edgeDetailsMap[key]) {
      return edgeDetailsMap[key].type;
    }
    if ((nodeA.cat === 1 || nodeA.cat === 2) && nodeB.cat === 3) return INTER_TYPES.PREDATION;
    if (nodeA.cat === 1 && nodeB.cat === 4) return INTER_TYPES.PREDATION;
    if (nodeA.cat === 1 && nodeB.cat === 2) return INTER_TYPES.PREDATION;
    if (nodeA.cat === 5 && (nodeB.cat === 3 || nodeB.cat === 4)) return INTER_TYPES.PREDATION;
    if (nodeA.cat === 1 && nodeB.cat === 0) return INTER_TYPES.DISPERSAL;
    if (nodeA.cat === 3 && nodeB.cat === 0) return INTER_TYPES.HERBIVORY;
    if (nodeA.cat === 2 && nodeB.cat === 0) return INTER_TYPES.HERBIVORY;
    return INTER_TYPES.MUTUALISM;
  }

  function buildConscientiousBioticNetwork() {
    const floraNodes = rawNodes.filter(n => n.cat === 0);
    const aveNodes = rawNodes.filter(n => n.cat === 1);
    const mamNodes = rawNodes.filter(n => n.cat === 2);
    const molNodes = rawNodes.filter(n => n.cat === 3);
    const anfNodes = rawNodes.filter(n => n.cat === 4);
    const repNodes = rawNodes.filter(n => n.cat === 5);

    // Flora estructural
    const saucoNodes = floraNodes.filter(n => n.label.toLowerCase().includes('sauco') || n.sciname.toLowerCase().includes('sambucus'));
    const capuliNodes = floraNodes.filter(n => n.label.toLowerCase().includes('capul') || n.sciname.toLowerCase().includes('prunus') || n.label.toLowerCase().includes('cerezo'));
    const alisoNodes = floraNodes.filter(n => n.label.toLowerCase().includes('aliso') || n.sciname.toLowerCase().includes('alnus'));
    const chilcoNodes = floraNodes.filter(n => n.label.toLowerCase().includes('chilc') || n.sciname.toLowerCase().includes('baccharis'));
    const juncoNodes = floraNodes.filter(n => n.label.toLowerCase().includes('junco') || n.sciname.toLowerCase().includes('schoenoplectus'));
    const eneaNodes = floraNodes.filter(n => n.label.toLowerCase().includes('enea') || n.label.toLowerCase().includes('totora') || n.sciname.toLowerCase().includes('typha'));
    const sauceNodes = floraNodes.filter(n => n.label.toLowerCase().includes('sauce') || n.sciname.toLowerCase().includes('salix'));
    const raqueNodes = floraNodes.filter(n => n.label.toLowerCase().includes('raque') || n.sciname.toLowerCase().includes('vallea'));
    const farolitoNodes = floraNodes.filter(n => n.label.toLowerCase().includes('farolito') || n.label.toLowerCase().includes('abutilon'));

    // Polinización
    const colibriList = aveNodes.filter(a => a.label.toLowerCase().includes('colibr') || a.sciname.toLowerCase().includes('colibri') || a.label.toLowerCase().includes('calzadito') || a.label.toLowerCase().includes('brillante'));
    colibriList.forEach(col => {
      [...saucoNodes, ...chilcoNodes, ...raqueNodes, ...farolitoNodes, ...floraNodes.slice(0, 10)].slice(0, 5).forEach(fl => {
        addConscientiousEdge(col, fl, INTER_TYPES.POLLINATION, 'Polinización cruzada y forrajeo de néctar floral');
      });
    });

    // Frugivoría y dispersión
    const frugivores = aveNodes.filter(a => a.label.toLowerCase().includes('mirla') || a.label.toLowerCase().includes('tangara') || a.label.toLowerCase().includes('tángara') || a.label.toLowerCase().includes('calandria') || a.label.toLowerCase().includes('centzontle'));
    frugivores.forEach(fr => {
      [...capuliNodes, ...saucoNodes, ...floraNodes.slice(5, 20)].slice(0, 4).forEach(tr => {
        addConscientiousEdge(fr, tr, INTER_TYPES.DISPERSAL, 'Consumo de frutos y dispersión zoócora de semillas');
      });
    });

    // Mamíferos dispersores
    mamNodes.forEach(mam => {
      floraNodes.slice(0, 8).forEach(tr => {
        addConscientiousEdge(mam, tr, INTER_TYPES.DISPERSAL, 'Forrajeo y dispersión en estrato arbóreo y suelo');
      });
    });

    // Nidificación en juncales
    const marshNesters = aveNodes.filter(a => a.label.toLowerCase().includes('tingua') || a.label.toLowerCase().includes('monjita') || a.label.toLowerCase().includes('burrito') || a.label.toLowerCase().includes('focha') || a.label.toLowerCase().includes('gallineta') || a.label.toLowerCase().includes('pato') || a.label.toLowerCase().includes('rascón'));
    marshNesters.forEach(mn => {
      [...juncoNodes, ...eneaNodes, ...floraNodes.slice(10, 18)].slice(0, 4).forEach(pl => {
        addConscientiousEdge(mn, pl, INTER_TYPES.NESTING, 'Anclaje de nidos flotantes y camuflaje entre juncales');
      });
    });

    // Percha y anidamiento de rapaces y garzas
    const treePerchers = aveNodes.filter(a => a.label.toLowerCase().includes('garza') || a.label.toLowerCase().includes('garceta') || a.label.toLowerCase().includes('búho') || a.label.toLowerCase().includes('gavil') || a.label.toLowerCase().includes('águila') || a.label.toLowerCase().includes('halc') || a.label.toLowerCase().includes('lechuza'));
    treePerchers.forEach(tp => {
      [...sauceNodes, ...alisoNodes, ...floraNodes.slice(2, 12)].slice(0, 4).forEach(tr => {
        addConscientiousEdge(tp, tr, INTER_TYPES.NEST_SITE, 'Percha de avistamiento y nidificación en ramas altas');
      });
    });

    // Depredación malacófaga (Aves <--> Moluscos)
    aveNodes.slice(0, 30).forEach(av => {
      molNodes.forEach(mol => {
        addConscientiousEdge(av, mol, INTER_TYPES.PREDATION, 'Depredación directa de caracoles y babosas');
      });
    });

    // Depredación de anfibios (Garzas / Aves acuáticas <--> Anfibios)
    const garzas = aveNodes.filter(a => a.label.toLowerCase().includes('garza') || a.label.toLowerCase().includes('garceta') || a.label.toLowerCase().includes('guaco'));
    garzas.forEach(gz => {
      anfNodes.forEach(anf => {
        addConscientiousEdge(gz, anf, INTER_TYPES.PREDATION, 'Captura de ranas y renacuajos en orillas');
      });
    });

    // Depredación de roedores por rapaces
    treePerchers.forEach(rap => {
      mamNodes.forEach(rod => {
        addConscientiousEdge(rap, rod, INTER_TYPES.PREDATION, 'Control biológico de micromamíferos');
      });
    });

    // Depredación reptiliana
    repNodes.forEach(rep => {
      molNodes.forEach(mol => addConscientiousEdge(rep, mol, INTER_TYPES.PREDATION, 'Consumo de invertebrados de suelo'));
      anfNodes.forEach(anf => addConscientiousEdge(rep, anf, INTER_TYPES.PREDATION, 'Forrajeo de anfibios en ecotono'));
    });

    // Enlaces de cohesión ecológica general para asegurar que toda especie esté integrada
    rawNodes.forEach(n => {
      if (n.neighbors.length === 0) {
        const partner = (n.cat === 0) ? aveNodes[n.id % aveNodes.length] : floraNodes[n.id % floraNodes.length];
        if (partner) {
          addConscientiousEdge(n, partner, INTER_TYPES.MUTUALISM, 'Soporte de hábitat y flujo biótico en Kennedy');
        }
      }
    });
  }

  buildConscientiousBioticNetwork();

  // Mesh de Líneas de Interacciones
  const edgeGeo = new THREE.BufferGeometry();
  const edgeMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const edgeLinesMesh = new THREE.LineSegments(edgeGeo, edgeMat);
  networkGroup.add(edgeLinesMesh);

  function updateEdgeLinesGeometry() {
    const activeEdgesList = [];
    const interCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };

    rawEdges.forEach(e => {
      const na = rawNodes[e.source];
      const nb = rawNodes[e.target];
      if (!na || !nb) return;

      const key = na.id < nb.id ? `${na.id}_${nb.id}` : `${nb.id}_${na.id}`;
      const inter = edgeDetailsMap[key]?.type || getInteractionInfo(na, nb);
      const typeId = inter.id;

      if (interCounts[typeId] !== undefined) interCounts[typeId]++;

      const isInterActive = opts.interactions[typeId] !== false;
      const isNodesActive = na.active && nb.active;

      if (isInterActive && isNodesActive) {
        activeEdgesList.push({ na, nb, inter });
      }
    });

    for (let i = 0; i <= 8; i++) {
      const badge = document.getElementById(`badgeInter${i}`);
      if (badge) badge.innerText = interCounts[i];
    }

    const count = activeEdgesList.length;
    const posArr = new Float32Array(count * 6);
    const colArr = new Float32Array(count * 6);

    for (let i = 0; i < count; i++) {
      const { na, nb, inter } = activeEdgesList[i];
      const ptr = i * 6;

      const posA = na.sprite ? na.sprite.position : na;
      const posB = nb.sprite ? nb.sprite.position : nb;

      posArr[ptr]     = posA.x; posArr[ptr + 1] = posA.y; posArr[ptr + 2] = posA.z;
      posArr[ptr + 3] = posB.x; posArr[ptr + 4] = posB.y; posArr[ptr + 5] = posB.z;

      const interColor = new THREE.Color(inter.color || palette.catColors[na.cat] || "#84A48B");
      const ca = new THREE.Color(palette.hexColors[na.cat] || 0x84A48B).lerp(interColor, 0.45);
      const cb = new THREE.Color(palette.hexColors[nb.cat] || 0x84A48B).lerp(interColor, 0.45);

      colArr[ptr]     = ca.r * 0.85; colArr[ptr + 1] = ca.g * 0.85; colArr[ptr + 2] = ca.b * 0.85;
      colArr[ptr + 3] = cb.r * 0.85; colArr[ptr + 4] = cb.g * 0.85; colArr[ptr + 5] = cb.b * 0.85;
    }

    edgeGeo.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
    edgeGeo.setAttribute("color", new THREE.BufferAttribute(colArr, 3));
    edgeGeo.attributes.position.needsUpdate = true;
    edgeGeo.attributes.color.needsUpdate = true;

    const lblActiveEdges = document.getElementById("lblActiveEdges");
    if (lblActiveEdges) lblActiveEdges.innerText = count;
  }

  function recalculateDegreesAndSizes() {
    let activeNodesCount = 0;
    let hiddenCount = 0;
    const catCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    rawNodes.forEach(n => {
      n.active = (opts.cats[n.cat] === true) && !n.hiddenByUser;
      if (n.hiddenByUser) hiddenCount++;

      n.degree = n.neighbors.filter(nb => {
        if (!nb.active) return false;
        const key = n.id < nb.id ? `${n.id}_${nb.id}` : `${nb.id}_${n.id}`;
        const inter = edgeDetailsMap[key]?.type || getInteractionInfo(n, nb);
        return opts.interactions[inter.id] !== false;
      }).length;

      n.sprite.visible = n.active && (currentMorph < 0.35);

      if (n.active) {
        activeNodesCount++;
        if (catCounts[n.cat] !== undefined) catCounts[n.cat]++;
        const sc = Math.min(5.2, Math.max(2.8, 2.6 + Math.sqrt(n.degree) * 0.45));
        n.sprite.scale.set(sc, sc, 1.0);
      }
    });

    for (let c = 0; c <= 5; c++) {
      const el = document.getElementById(`badgeCat${c}`);
      if (el) el.innerText = catCounts[c];
    }

    if (territoryBeaconsGroup) {
      territoryBeaconsGroup.children.forEach(bg => {
        const t = bg.userData.taxonData;
        if (t) {
          const cIdx = (typeof t.cat === 'number') ? t.cat : (TAXONOMIC_CONVENTIONS[t.cat]?.catIdx ?? 0);
          bg.visible = (opts.cats[cIdx] !== false);
        }
      });
    }

    const lblActive = document.getElementById("lblActiveNodes");
    if (lblActive) lblActive.innerText = activeNodesCount;
    const lblHidden = document.getElementById("lblHiddenCount");
    if (lblHidden) lblHidden.innerText = hiddenCount;
    const lblStatusHidden = document.getElementById("lblStatusHidden");
    if (lblStatusHidden) lblStatusHidden.innerText = hiddenCount;

    updateEdgeLinesGeometry();
  }

  recalculateDegreesAndSizes();

  // =====================================================================
  // 3. GLSL SHADER DE TERRITORIO CON VÓRTICE & TRANSFORMACIÓN CUÁNTICA
  // =====================================================================
  const vertexShader = `
    uniform float uMorphProgress;
    uniform float uPerspectiveMode;
    uniform float uTime;
    uniform float uPixelRatio;
    uniform vec3 uRipplePos;
    uniform float uRippleTime;
    
    attribute vec3 aSwarmPos;
    attribute vec3 aColor;
    attribute float aSize;
    attribute float aPhase;
    attribute float aCategory;
    
    varying vec3 vColor;
    varying float vCategory;
    varying float vAlpha;
    varying float vRippleBoost;
    varying float vDistToCam;
    
    void main() {
      vColor = aColor;
      vCategory = aCategory;
      
      float ease = smoothstep(0.0, 1.0, uMorphProgress);
      float explosionIntensity = sin(uMorphProgress * 3.14159265);
      
      vec3 swarmOrbit = aSwarmPos;
      float rotAngle = uTime * 0.12 + aPhase;
      float ox = swarmOrbit.x * cos(rotAngle) - swarmOrbit.z * sin(rotAngle);
      float oz = swarmOrbit.x * sin(rotAngle) + swarmOrbit.z * cos(rotAngle);
      swarmOrbit.x = ox;
      swarmOrbit.z = oz;
      
      float distToOrigin = length(position.xz);
      float vortexAngle = (1.0 - ease) * (distToOrigin * 0.015 + sin(uTime * 0.8 + aPhase) * 0.5);
      float vx = position.x * cos(vortexAngle) - position.z * sin(vortexAngle);
      float vz = position.x * sin(vortexAngle) + position.z * cos(vortexAngle);
      vec3 curlVortex = vec3(vx - position.x, sin(uTime * 2.0 + aPhase) * 0.8 * (1.0 - ease), vz - position.z);
      
      vec3 blastDir = normalize(aSwarmPos + vec3(0.001));
      float blastOffset = explosionIntensity * (15.0 + sin(aPhase * 3.0) * 8.0);
      swarmOrbit += blastDir * blastOffset;
      
      float ripDist = length(position - uRipplePos);
      float ripTime = max(0.0, uTime - uRippleTime);
      float waveFront = ripTime * 85.0;
      float rippleWave = 0.0;
      if (ripTime < 2.5 && abs(ripDist - waveFront) < 14.0) {
        float falloff = max(0.0, 1.0 - ripTime / 2.5);
        rippleWave = sin((ripDist - waveFront) * 0.45) * 2.8 * falloff;
        vRippleBoost = falloff;
      } else {
        vRippleBoost = 0.0;
      }
      
      vec3 territorialIdle = vec3(
        sin(uTime * 0.5 + aPhase) * 0.25,
        rippleWave + (aCategory < 0.5 ? sin(uTime * 1.5 + aPhase) * 0.35 : 0.0),
        cos(uTime * 0.5 + aPhase) * 0.25
      );
      
      vec3 targetPos = position + territorialIdle;
      vec3 currentPos = mix(swarmOrbit, targetPos, ease) + curlVortex;
      
      vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      float camDist = -mvPosition.z;
      vDistToCam = camDist;
      
      float sizeAttenuation = clamp(260.0 / max(1.0, camDist), 0.2, 1.6);
      if (uPerspectiveMode > 0.05) {
        if (aCategory > 1.8) {
          sizeAttenuation *= mix(1.0, clamp(70.0 / max(10.0, camDist), 0.35, 1.0), uPerspectiveMode);
        }
      }
      
      gl_PointSize = (aSize + rippleWave * 1.0 + explosionIntensity * 0.7) * uPixelRatio * sizeAttenuation;
      
      float alphaBase = smoothstep(0.04, 0.8, ease) * 0.95 + explosionIntensity * 0.35;
      if (uPerspectiveMode > 0.05 && aCategory > 1.8) {
        alphaBase *= mix(1.0, clamp(140.0 / max(20.0, camDist), 0.25, 0.9), uPerspectiveMode);
      }
      vAlpha = alphaBase;
    }
  `;

  const fragmentShader = `
    varying vec3 vColor;
    varying float vCategory;
    varying float vAlpha;
    varying float vRippleBoost;
    varying float vDistToCam;
    uniform float uPerspectiveMode;
    
    void main() {
      if (vAlpha < 0.01) discard;
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord);
      if (dist > 0.5) discard;
      
      float edgeAlpha = smoothstep(0.5, 0.08, dist);
      vec3 col = vColor;
      
      if (vRippleBoost > 0.05) {
        col = mix(col, vec3(0.0, 0.7, 0.85), vRippleBoost * 0.65);
      }
      
      if (uPerspectiveMode > 0.05) {
        if (vCategory < 0.5) {
          col = mix(col, vec3(0.0, 0.75, 0.95), uPerspectiveMode * 0.35);
        } else if (vCategory < 1.5) {
          col = mix(col, vec3(0.2, 0.65, 0.38), uPerspectiveMode * 0.25);
        } else if (vCategory > 1.8) {
          col = mix(col, vec3(0.25, 0.24, 0.23), uPerspectiveMode * 0.45);
        }
      }
      
      col = col / (1.0 + col * 0.35);
      
      gl_FragColor = vec4(col, edgeAlpha * vAlpha);
    }
  `;

  const particleUniforms = {
    uMorphProgress: { value: 0.0 },
    uPerspectiveMode: { value: 0.0 },
    uTime: { value: 0.0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    uRipplePos: { value: new THREE.Vector3(0, 0, 0) },
    uRippleTime: { value: 99.0 }
  };

  const particleMat = new THREE.ShaderMaterial({
    uniforms: particleUniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  // =====================================================================
  // 4. CARGA DE CAPAS GEOGRÁFICAS (PIEDRA ARQUITECTÓNICA & AGUA VIBRANTE)
  // =====================================================================
  const pTarget = [];
  const pSwarm = [];
  const pColor = [];
  const pSize = [];
  const pPhase = [];
  const pCat = [];

  let particlePoints = null;
  let currentParticleIndex = 0;

  function randomSwarmCluster(idx) {
    if (typeof rawNodes !== "undefined" && rawNodes.length > 0) {
      const node = rawNodes[idx % rawNodes.length];
      return {
        x: node.ox + (Math.random() - 0.5) * 2.0,
        y: node.oy + (Math.random() - 0.5) * 2.0,
        z: node.oz + (Math.random() - 0.5) * 2.0
      };
    }
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = 28.0 + (Math.random() - 0.5) * 4.0;
    return {
      x: radius * Math.sin(phi) * Math.cos(theta),
      y: radius * Math.sin(phi) * Math.sin(theta),
      z: radius * Math.cos(phi)
    };
  }

  function rebuildTerritoryParticles() {
    if (particlePoints) {
      sceneRoot.remove(particlePoints);
      particlePoints.geometry.dispose();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pTarget, 3));
    geo.setAttribute("aSwarmPos", new THREE.Float32BufferAttribute(pSwarm, 3));
    geo.setAttribute("aColor", new THREE.Float32BufferAttribute(pColor, 3));
    geo.setAttribute("aSize", new THREE.Float32BufferAttribute(pSize, 1));
    geo.setAttribute("aPhase", new THREE.Float32BufferAttribute(pPhase, 1));
    geo.setAttribute("aCategory", new THREE.Float32BufferAttribute(pCat, 1));

    particlePoints = new THREE.Points(geo, particleMat);
    sceneRoot.add(particlePoints);
  }

  function loadWater() {
    return fetch(WATER_URL)
      .then(r => r.json())
      .then(waterBodies => {
        const colWaterMain = new THREE.Color(0x00B4D8);
        const colWaterDeep = new THREE.Color(0x0077B6);
        const list = Array.isArray(waterBodies) ? waterBodies : (waterBodies.waterBodies || []);

        list.forEach(w => {
          const pts = w.pts;
          if (!pts || pts.length < 3) return;

          const sPts = pts.map(p => toScene(p[0], p[1]));
          const pts2d = sPts.map(p => new THREE.Vector2(p.x, p.z));

          let tris = [];
          try { tris = THREE.ShapeUtils.triangulateShape(pts2d, []); } catch(e) { tris = []; }

          tris.forEach(([ia, ib, ic]) => {
            const pa = sPts[ia], pb = sPts[ib], pc = sPts[ic];

            for (let s = 0; s < 3; s++) {
              const r1 = Math.random(), r2 = Math.random();
              const sq1 = Math.sqrt(r1);
              const wx = (1 - sq1) * pa.x + sq1 * (1 - r2) * pb.x + sq1 * r2 * pc.x;
              const wz = (1 - sq1) * pa.z + sq1 * (1 - r2) * pb.z + sq1 * r2 * pc.z;
              const wy = 0.28 + Math.random() * 0.2;

              const sw = randomSwarmCluster(currentParticleIndex++);
              pTarget.push(wx, wy, wz);
              pSwarm.push(sw.x, sw.y, sw.z);
              
              const c = (s % 2 === 0) ? colWaterMain : colWaterDeep;
              pColor.push(c.r, c.g, c.b);
              pSize.push(1.65);
              pPhase.push(Math.random() * 10);
              pCat.push(0.0);
            }
          });

          for (let i = 0; i < sPts.length; i++) {
            const p = sPts[i];
            const sw = randomSwarmCluster(currentParticleIndex++);
            pTarget.push(p.x, 0.32, p.z);
            pSwarm.push(sw.x, sw.y, sw.z);
            pColor.push(colWaterMain.r, colWaterMain.g, colWaterMain.b);
            pSize.push(1.75);
            pPhase.push(i * 0.3);
            pCat.push(0.0);
          }
        });

        rebuildTerritoryParticles();
      })
      .catch(err => console.warn("Error agua:", err));
  }

  // Base de datos de árboles georreferenciados agrupados por especie
  const treeSpeciesClusters = {
    chicala: [],
    jazmin: [],
    sauco: [],
    falso_pimiento: [],
    eugenia: [],
    palma_yuca: [],
    urapan: [],
    caucho: [],
    cipres: [],
    acacia: [],
    capulin: [],
    aliso: []
  };

  function matchSpeciesKey(speciesName) {
    if (!speciesName) return "sauco";
    const s = speciesName.toLowerCase();
    if (s.includes("chicala") || s.includes("chirlobirlo") || s.includes("amarillo")) return "chicala";
    if (s.includes("jazmin") || s.includes("huesito")) return "jazmin";
    if (s.includes("sauco")) return "sauco";
    if (s.includes("pimiento")) return "falso_pimiento";
    if (s.includes("eugenia")) return "eugenia";
    if (s.includes("palma") || s.includes("yuca") || s.includes("palmiche")) return "palma_yuca";
    if (s.includes("urapan") || s.includes("fresno")) return "urapan";
    if (s.includes("caucho")) return "caucho";
    if (s.includes("cipres") || s.includes("pino")) return "cipres";
    if (s.includes("acacia")) return "acacia";
    if (s.includes("cerezo") || s.includes("capuli")) return "capulin";
    if (s.includes("aliso")) return "aliso";
    return null;
  }

  function loadTrees() {
    return fetch(TREES_URL)
      .then(r => r.json())
      .then(trees => {
        const colTreeLush = new THREE.Color(0x2E8B57);
        const colTreeBright = new THREE.Color(0x48BB78);
        const colTrunk = new THREE.Color(0x161D26);
        const list = Array.isArray(trees) ? trees : (trees.trees || []);

        list.forEach((t, i) => {
          const [x, y, hMeters, specName] = t;
          const p = toScene(x, y);
          const h = Math.max(0.7, (hMeters || 8) * SCALE);

          const sKey = matchSpeciesKey(specName);
          if (sKey && treeSpeciesClusters[sKey]) {
            treeSpeciesClusters[sKey].push({ x: p.x, y: h * 0.85, z: p.z, height: h });
          }

          const folCol = (i % 2 === 0) ? colTreeLush : colTreeBright;
          const crownY = h * 0.85;
          const swCrown = randomSwarmCluster(currentParticleIndex++);
          pTarget.push(p.x, crownY, p.z);
          pSwarm.push(swCrown.x, swCrown.y, swCrown.z);
          pColor.push(folCol.r, folCol.g, folCol.b);
          pSize.push(1.6);
          pPhase.push(i * 0.25);
          pCat.push(1.0);

          if (i % 2 === 0) {
            const subNodes = 2;
            for (let sn = 0; sn < subNodes; sn++) {
              const ang = (sn / subNodes) * Math.PI * 2 + (i * 0.5);
              const sx = p.x + Math.cos(ang) * 0.6;
              const sz = p.z + Math.sin(ang) * 0.6;
              const sy = crownY + Math.sin(sn * 2.0) * 0.3;
              const swSub = randomSwarmCluster(currentParticleIndex++);
              pTarget.push(sx, sy, sz);
              pSwarm.push(swSub.x, swSub.y, swSub.z);
              pColor.push(colTreeBright.r, colTreeBright.g, colTreeBright.b);
              pSize.push(1.3);
              pPhase.push(i * 0.1 + sn);
              pCat.push(1.0);
            }
          }

          if (i % 3 === 0) {
            const swBase = randomSwarmCluster(currentParticleIndex++);
            pTarget.push(p.x, 0.2, p.z);
            pSwarm.push(swBase.x, swBase.y, swBase.z);
            pColor.push(colTrunk.r, colTrunk.g, colTrunk.b);
            pSize.push(1.1);
            pPhase.push(i * 0.05);
            pCat.push(1.0);
          }
        });

        rebuildTerritoryParticles();
      })
      .catch(err => console.warn("Error árboles:", err));
  }

  function loadRoads() {
    return fetch(NET_URL)
      .then(r => r.json())
      .then(net => {
        const colRoad = new THREE.Color(0x334155);
        const colMajor = new THREE.Color(0x475569);
        const edgeList = Array.isArray(net) ? net : (net.edges || []);

        edgeList.forEach((e, i) => {
          const isMajor = e.hierarchy === "major" || (e.weight && e.weight > 2.0);
          const c = isMajor ? colMajor : colRoad;

          if (e.pts && e.pts.length >= 2) {
            for (let j = 0; j < e.pts.length - 1; j++) {
              const a = toScene(e.pts[j][0], e.pts[j][1]);
              const b = toScene(e.pts[j + 1][0], e.pts[j + 1][1]);
              const steps = Math.max(1, Math.floor(Math.hypot(b.x - a.x, b.z - a.z) / 4.0));

              for (let s = 0; s <= steps; s++) {
                const t = s / steps;
                const rx = a.x + (b.x - a.x) * t;
                const rz = a.z + (b.z - a.z) * t;
                const sw = randomSwarmCluster(currentParticleIndex++);
                pTarget.push(rx, 0.12, rz);
                pSwarm.push(sw.x, sw.y, sw.z);
                pColor.push(c.r, c.g, c.b);
                pSize.push(isMajor ? 1.4 : 1.1);
                pPhase.push(i * 0.1 + s * 0.2);
                pCat.push(2.0);
              }
            }
          }
        });

        rebuildTerritoryParticles();
      })
      .catch(err => console.warn("Error vías:", err));
  }

  function loadBuildings() {
    return fetch(BUILDINGS_URL)
      .then(r => r.json())
      .then(bldgs => {
        const colBldgPrimary = new THREE.Color(0xCBD5E1);
        const colBldgSecondary = new THREE.Color(0x94A3B8);
        const colRoofHighlight = new THREE.Color(0x84A48B);
        const colBaseGround = new THREE.Color(0x06090F);
        const bldList = Array.isArray(bldgs) ? bldgs : (bldgs.buildings || []);

        bldList.forEach((b, i) => {
          const pts = b.pts || [];
          if (pts.length < 3) return;

          const hMeters = b.height || b.h || 12.0;
          const h = Math.max(0.9, hMeters * SCALE);
          const sPts = pts.map(p => toScene(p[0], p[1]));

          const bldgCol = (i % 7 === 0) ? colRoofHighlight : ((i % 2 === 0) ? colBldgPrimary : colBldgSecondary);

          for (let j = 0; j < sPts.length; j++) {
            const p = sPts[j];
            const steps = Math.max(2, Math.floor(h / 1.6));

            for (let s = 0; s <= steps; s++) {
              const y = (s / steps) * h;
              const sw = randomSwarmCluster(currentParticleIndex++);
              pTarget.push(p.x, y, p.z);
              pSwarm.push(sw.x, sw.y, sw.z);

              const isRoof = (s === steps);
              const c = isRoof ? bldgCol : bldgCol.clone().multiplyScalar(0.7 + (s / steps) * 0.3);
              pColor.push(c.r, c.g, c.b);
              pSize.push(isRoof ? 1.5 : 1.15);
              pPhase.push(i * 0.08 + s * 0.3);
              pCat.push(3.0);
            }
          }

          if (sPts.length >= 3 && i % 3 === 0) {
            let cx = 0, cz = 0;
            sPts.forEach(p => { cx += p.x; cz += p.z; });
            cx /= sPts.length;
            cz /= sPts.length;

            const swRoof = randomSwarmCluster(currentParticleIndex++);
            pTarget.push(cx, h, cz);
            pSwarm.push(swRoof.x, swRoof.y, swRoof.z);
            pColor.push(bldgCol.r * 1.1, bldgCol.g * 1.1, bldgCol.b * 1.1);
            pSize.push(1.6);
            pPhase.push(i * 0.05);
            pCat.push(3.0);
          }
        });

        rebuildTerritoryParticles();
      })
      .catch(err => console.warn("Error edificios:", err));
  }

  // Cargar las 4 capas del territorio
  Promise.all([loadWater(), loadTrees(), loadRoads(), loadBuildings()])
    .then(() => console.log("Capas de territorio cargadas exitosamente."))
    .catch(e => console.warn("Aviso carga territorio:", e));

  // =====================================================================
  // 5. CONSTELACIONES BOTÁNICAS Y RECORRIDOS
  // =====================================================================
  const speciesConstellationGroup = new THREE.Group();
  speciesConstellationGroup.visible = false;
  sceneRoot.add(speciesConstellationGroup);

  let activeConstellationPoints = null;
  let activeConstellationLines = null;

  const activeTreeIndicatorGroup = new THREE.Group();
  sceneRoot.add(activeTreeIndicatorGroup);

  const focusDotGeo = new THREE.CircleGeometry(0.8, 16);
  const focusDotMat = new THREE.MeshBasicMaterial({ color: 0x84A48B, side: THREE.DoubleSide, transparent: true, opacity: 0.0, depthWrite: false });
  const focusDotMesh = new THREE.Mesh(focusDotGeo, focusDotMat);
  focusDotMesh.rotation.x = -Math.PI / 2;
  activeTreeIndicatorGroup.add(focusDotMesh);

  const focusRingGeo = new THREE.RingGeometry(1.4, 2.2, 24);
  const focusRingMat = new THREE.MeshBasicMaterial({ color: 0x84A48B, side: THREE.DoubleSide, transparent: true, opacity: 0.0, depthWrite: false });
  const focusRingMesh = new THREE.Mesh(focusRingGeo, focusRingMat);
  focusRingMesh.rotation.x = -Math.PI / 2;
  activeTreeIndicatorGroup.add(focusRingMesh);

  function renderTreeConstellation(specId, colHex) {
    speciesConstellationGroup.clear();
    const cluster = treeSpeciesClusters[specId] || [];
    if (cluster.length === 0) return;

    const sampleSize = Math.min(cluster.length, 750);
    const step = Math.max(1, Math.floor(cluster.length / sampleSize));
    const sampled = [];
    for (let i = 0; i < cluster.length && sampled.length < sampleSize; i += step) {
      sampled.push(cluster[i]);
    }

    const pos = new Float32Array(sampled.length * 3);
    const cols = new Float32Array(sampled.length * 3);
    const colObj = new THREE.Color(colHex);

    for (let i = 0; i < sampled.length; i++) {
      const t = sampled[i];
      pos[i * 3]     = t.x;
      pos[i * 3 + 1] = t.y + 0.2;
      pos[i * 3 + 2] = t.z;
      cols[i * 3]     = colObj.r;
      cols[i * 3 + 1] = colObj.g;
      cols[i * 3 + 2] = colObj.b;
    }

    const cGeo = new THREE.BufferGeometry();
    cGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    cGeo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    const cMat = new THREE.PointsMaterial({ size: 2.8, vertexColors: true, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending });
    activeConstellationPoints = new THREE.Points(cGeo, cMat);
    speciesConstellationGroup.add(activeConstellationPoints);

    const linePairs = [];
    for (let i = 0; i < sampled.length; i++) {
      const a = sampled[i];
      for (let j = i + 1; j < sampled.length; j++) {
        const b = sampled[j];
        const distSq = (a.x - b.x)**2 + (a.z - b.z)**2;
        if (distSq < 180 && linePairs.length < 350) {
          linePairs.push(a.x, a.y + 0.2, a.z, b.x, b.y + 0.2, b.z);
        }
      }
    }

    if (linePairs.length > 0) {
      const lGeo = new THREE.BufferGeometry();
      lGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePairs, 3));
      const lMat = new THREE.LineBasicMaterial({ color: colObj, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending });
      activeConstellationLines = new THREE.LineSegments(lGeo, lMat);
      speciesConstellationGroup.add(activeConstellationLines);
    }

    speciesConstellationGroup.visible = true;

    if (window.gsap) {
      gsap.to(cMat, { opacity: 0.85, duration: 1.2, ease: "power2.out" });
      if (activeConstellationLines) {
        gsap.to(activeConstellationLines.material, { opacity: 0.35, duration: 1.2, ease: "power2.out" });
      }
    }
  }

  let tourActive = false;
  let tourIndex = 0;
  let tourTimer = null;
  const btnTourSpecies = document.getElementById("btnTourSpecies");

  const SPECIES_GEO_NODES = [
    { id: "chicala", name: "Chicalá / Flor Amarillo", sci: "Tecoma stans", count: "6,884 árboles", avgHeight: "2.6 m", img: "./assets/fotos/fotos_flora/Chicala%2C%20chirlobirlo%2C%20flor%20amarillo.jpg", pos: { x: 210.4, y: 13.0, z: 96.0 }, camPos: { x: 210.4, y: 48, z: 155 }, camTarget: { x: 210.4, y: 0, z: 96.0 }, color: 0xE7C878 },
    { id: "jazmin", name: "Jazmín del Cabo", sci: "Pittosporum undulatum", count: "5,650 árboles", avgHeight: "3.2 m", img: "./assets/fotos/fotos_flora/Jazmin%20del%20cabo%2C%20laurel%20huesito.jpg", pos: { x: 234.8, y: 13.5, z: 102.9 }, camPos: { x: 234.8, y: 50, z: 162 }, camTarget: { x: 234.8, y: 0, z: 102.9 }, color: 0x48BB78 },
    { id: "sauco", name: "Sauco del Humedal", sci: "Sambucus nigra", count: "5,553 árboles", avgHeight: "3.1 m", img: "./assets/fotos/fotos_flora/Sauco.jpg", pos: { x: 221.0, y: 13.0, z: 124.7 }, camPos: { x: 221.0, y: 48, z: 182 }, camTarget: { x: 221.0, y: 0, z: 124.7 }, color: 0x84A48B },
    { id: "falso_pimiento", name: "Falso Pimiento", sci: "Schinus molle", count: "4,548 árboles", avgHeight: "3.6 m", img: "./assets/fotos/fotos_flora/Falso%20pimiento.jpg", pos: { x: 192.2, y: 14.0, z: 88.6 }, camPos: { x: 192.2, y: 52, z: 148 }, camTarget: { x: 192.2, y: 0, z: 88.6 }, color: 0x2E8B57 },
    { id: "eugenia", name: "Eugenia", sci: "Eugenia myrtifolia", count: "4,370 árboles", avgHeight: "3.5 m", img: "./assets/fotos/fotos_flora/Eugenia.jpg", pos: { x: 209.7, y: 13.5, z: 78.8 }, camPos: { x: 209.7, y: 50, z: 138 }, camTarget: { x: 209.7, y: 0, z: 78.8 }, color: 0x48BB78 },
    { id: "palma_yuca", name: "Palma Yuca", sci: "Yucca gigantea", count: "4,356 árboles", avgHeight: "2.9 m", img: "./assets/fotos/fotos_flora/Palma%20yuca%2C%20palmiche.jpg", pos: { x: 188.7, y: 12.5, z: 180.1 }, camPos: { x: 188.7, y: 48, z: 240 }, camTarget: { x: 188.7, y: 0, z: 180.1 }, color: 0x84A48B },
    { id: "urapan", name: "Urapán", sci: "Fraxinus chinensis", count: "3,113 árboles", avgHeight: "8.5 m", img: "./assets/fotos/fotos_flora/Urapan%2C%20fresno.jpg", pos: { x: 251.2, y: 19.0, z: 142.5 }, camPos: { x: 251.2, y: 68, z: 205 }, camTarget: { x: 251.2, y: 0, z: 142.5 }, color: 0x2E8B57 },
    { id: "caucho", name: "Caucho Sabanero", sci: "Ficus soatensis", count: "2,860 árboles", avgHeight: "6.3 m", img: "./assets/fotos/fotos_flora/Caucho%20sabanero.jpg", pos: { x: 172.3, y: 16.0, z: 138.1 }, camPos: { x: 172.3, y: 58, z: 198 }, camTarget: { x: 172.3, y: 0, z: 138.1 }, color: 0x84A48B },
    { id: "cipres", name: "Ciprés / Pino", sci: "Cupressus lusitanica", count: "2,828 árboles", avgHeight: "4.9 m", img: "./assets/fotos/fotos_flora/Cipres%2C%20pino%20cipres%2C%20pino.jpg", pos: { x: 277.8, y: 15.0, z: 124.1 }, camPos: { x: 277.8, y: 55, z: 184 }, camTarget: { x: 277.8, y: 0, z: 124.1 }, color: 0x48BB78 },
    { id: "acacia", name: "Acacia Sabanera", sci: "Acacia melanoxylon", count: "2,160 árboles", avgHeight: "3.9 m", img: "./assets/fotos/fotos_flora/Acacia%20baracatinga%2C%20acacia%20sabanera%2C%20acacia%20nigra.jpeg", pos: { x: 166.1, y: 14.0, z: 93.1 }, camPos: { x: 166.1, y: 52, z: 153 }, camTarget: { x: 166.1, y: 0, z: 93.1 }, color: 0x2E8B57 },
    { id: "capulin", name: "Capulí / Cerezo", sci: "Prunus serotina", count: "1,901 árboles", avgHeight: "3.7 m", img: "./assets/fotos/fotos_flora/Cerezo.jpg", pos: { x: 208.9, y: 14.5, z: 141.0 }, camPos: { x: 208.9, y: 52, z: 200 }, camTarget: { x: 208.9, y: 0, z: 141.0 }, color: 0x48BB78 },
    { id: "aliso", name: "Aliso Sabanero", sci: "Alnus acuminata", count: "1,058 árboles", avgHeight: "2.7 m", img: "./assets/fotos/fotos_flora/Aliso%2C%20fresno%2C%20chaquiro.jpg", pos: { x: 203.4, y: 13.5, z: -102.2 }, camPos: { x: 203.4, y: 50, z: -42 }, camTarget: { x: 203.4, y: 0, z: -102.2 }, color: 0x48BB78 }
  ];

  function focusTreeSpecies(idx) {
    if (idx < 0 || idx >= SPECIES_GEO_NODES.length) return;
    tourIndex = idx;
    const spec = SPECIES_GEO_NODES[idx];

    if (currentMorph < 0.45) {
      animateToStage(1.0);
    }

    if (activeTreeImg) activeTreeImg.src = spec.img;
    if (activeTreeName) activeTreeName.textContent = spec.name.split('/')[0].trim();
    if (activeTreeChip) activeTreeChip.classList.add("show");

    if (window.gsap) {
      gsap.to(camera.position, { x: spec.camPos.x, y: spec.camPos.y, z: spec.camPos.z, duration: 2.5, ease: "power2.inOut" });
      gsap.to(controls.target, { x: spec.camTarget.x, y: spec.camTarget.y, z: spec.camTarget.z, duration: 2.5, ease: "power2.inOut" });
    }

    focusDotMesh.position.set(spec.pos.x, 0.22, spec.pos.z);
    focusRingMesh.position.set(spec.pos.x, 0.24, spec.pos.z);
    const colObj = new THREE.Color(spec.color);
    focusDotMat.color = colObj;
    focusRingMat.color = colObj;

    if (window.gsap) {
      gsap.to(focusDotMat, { opacity: 0.95, duration: 0.4 });
      gsap.to(focusRingMat, { opacity: 0.8, duration: 0.4 });
    }

    renderTreeConstellation(spec.id, spec.color);
  }

  function startSpeciesTour() {
    tourActive = true;
    if (btnTourSpecies) btnTourSpecies.classList.add("active");
    focusTreeSpecies(tourIndex);
    clearInterval(tourTimer);
    tourTimer = setInterval(() => {
      if (!tourActive) return;
      tourIndex = (tourIndex + 1) % SPECIES_GEO_NODES.length;
      focusTreeSpecies(tourIndex);
    }, 7000);
  }

  function stopSpeciesTour() {
    tourActive = false;
    clearInterval(tourTimer);
    if (btnTourSpecies) btnTourSpecies.classList.remove("active");
    if (window.gsap) {
      gsap.to(focusDotMat, { opacity: 0.0, duration: 0.4 });
      gsap.to(focusRingMat, { opacity: 0.0, duration: 0.4 });
      if (activeConstellationPoints) gsap.to(activeConstellationPoints.material, { opacity: 0.0, duration: 0.5 });
      if (activeConstellationLines) gsap.to(activeConstellationLines.material, { opacity: 0.0, duration: 0.5 });
    }
  }

  if (btnTourSpecies) {
    btnTourSpecies.addEventListener("click", () => {
      if (tourActive) stopSpeciesTour();
      else startSpeciesTour();
    });
  }

  // =====================================================================
  // 6. BALIZAS Y MARCADORES DE ESPECIES EN EL TERRITORIO 3D DE KENNEDY
  // =====================================================================
  function calculateTerritoryCoordinate(t, idx, total) {
    const cat = t.cat;

    if (cat === "Anfibios" || cat === 4) {
      const waterHubs = [
        { x: 209.56, z: -10.93, name: "Humedal El Burro — Espejo Central" },
        { x: 67.66, z: 118.17, name: "Humedal La Vaca — Sector Norte" },
        { x: 291.67, z: -79.30, name: "Humedal de Techo — Espejo de Agua" },
        { x: 166.64, z: 348.81, name: "Lago Parque Timiza" },
        { x: 58.92, z: -417.76, name: "Humedal Meandro del Say" },
        { x: 220.0, z: 15.0, name: "Humedal El Burro — Ribera Oriental" }
      ];
      const hub = waterHubs[idx % waterHubs.length];
      const ang = (idx * 2.3) % (Math.PI * 2);
      const rad = 5.0 + (idx % 4) * 3.5;
      return { x: hub.x + Math.cos(ang) * rad, y: 1.2, z: hub.z + Math.sin(ang) * rad, locName: hub.name };
    } else if (cat === "Moluscos" || cat === 3) {
      const hubs = [
        { x: 205.0, z: -15.0, name: "Humedal El Burro — Juncal de Ribera" },
        { x: 72.0, z: 112.0, name: "Humedal La Vaca — Fango Húmedo" },
        { x: 285.0, z: -75.0, name: "Humedal de Techo — Borde Vegetado" }
      ];
      const hub = hubs[idx % hubs.length];
      const ang = (idx * 1.7) % (Math.PI * 2);
      const rad = 6.0 + (idx % 3) * 4.0;
      return { x: hub.x + Math.cos(ang) * rad, y: 0.9, z: hub.z + Math.sin(ang) * rad, locName: hub.name };
    } else if (cat === "Reptiles" || cat === 5) {
      const hubs = [
        { x: 230.0, z: 5.0, name: "Humedal El Burro — Talud Soleado" },
        { x: 275.0, z: -65.0, name: "Humedal de Techo — Matorral Pedregoso" },
        { x: 55.0, z: 135.0, name: "Humedal La Vaca — Pastizal de Ronda" },
        { x: 180.0, z: 330.0, name: "Parque Timiza — Pedregal Ripario" }
      ];
      const hub = hubs[idx % hubs.length];
      const ang = (idx * 2.1) % (Math.PI * 2);
      const rad = 10.0 + (idx % 4) * 5.0;
      return { x: hub.x + Math.cos(ang) * rad, y: 1.4, z: hub.z + Math.sin(ang) * rad, locName: hub.name };
    } else if (cat === "Mamíferos" || cat === 2) {
      const hubs = [
        { x: 195.0, z: -25.0, name: "Humedal El Burro — Matorral Denso" },
        { x: 225.0, z: 30.0, name: "Humedal El Burro — Franja Protectora" },
        { x: 80.0, z: 105.0, name: "Humedal La Vaca — Bosque de Borde" },
        { x: 155.0, z: 325.0, name: "Ronda Río Fucha — Madriguera" }
      ];
      const hub = hubs[idx % hubs.length];
      const ang = (idx * 1.9) % (Math.PI * 2);
      const rad = 12.0 + (idx % 5) * 5.0;
      return { x: hub.x + Math.cos(ang) * rad, y: 1.8, z: hub.z + Math.sin(ang) * rad, locName: hub.name };
    } else if (cat === "Aves" || cat === 1) {
      const hubs = [
        { x: 209.56, z: -10.93, h: 4.5, name: "Humedal El Burro — Espejo de Agua" },
        { x: 67.66, z: 118.17, h: 3.8, name: "Humedal La Vaca — Totoral" },
        { x: 291.67, z: -79.30, h: 4.0, name: "Humedal de Techo — Espejo" },
        { x: 166.64, z: 348.81, h: 5.0, name: "Lago Parque Timiza — Dosel" },
        { x: 234.8, z: 102.9, h: 7.5, name: "Castilla / Ronda Fucha" },
        { x: 188.7, z: 180.1, h: 6.2, name: "Corredor Tintal — Arbolado" },
        { x: 251.2, z: 142.5, h: 8.0, name: "Kennedy Central — Dosel Urbano" },
        { x: 172.3, z: 138.1, h: 7.0, name: "Bosque Urbano Timiza" }
      ];
      const hub = hubs[idx % hubs.length];
      const ang = (idx * 1.4) % (Math.PI * 2);
      const rad = 8.0 + (idx % 7) * 6.0;
      return { x: hub.x + Math.cos(ang) * rad, y: hub.h || 4.5, z: hub.z + Math.sin(ang) * rad, locName: hub.name };
    } else {
      const sKey = matchSpeciesKey(t.name);
      if (sKey && treeSpeciesClusters[sKey] && treeSpeciesClusters[sKey].length > 0) {
        const cluster = treeSpeciesClusters[sKey];
        const treeSample = cluster[idx % cluster.length];
        return { x: treeSample.x, y: (treeSample.y || 3.0) + 1.2, z: treeSample.z, locName: `Censo SIGAU Kennedy · ${sKey.toUpperCase()}` };
      }
      const ang = (idx / total) * Math.PI * 2;
      const rad = 25.0 + ((idx * 19) % 210);
      return { x: Math.cos(ang) * rad + 140.0, y: 3.2, z: Math.sin(ang) * rad + 40.0, locName: "Arbolado Urbano de Kennedy" };
    }
  }

  // Generar las Balizas Interactivas de las Especies en el Territorio 3D
  rawTaxa.forEach((t, idx) => {
    const geoPos = calculateTerritoryCoordinate(t, idx, rawTaxa.length);
    t.territoryPos = geoPos;

    const tex = createCircularTexture(t.img, t.id, t.name, t.cat);
    const spriteMat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      opacity: 0.95
    });

    const sprite = new THREE.Sprite(spriteMat);
    const baseScale = (t.cat === 4 || t.cat === 'Anfibios') ? 4.6 : ((t.cat === 5 || t.cat === 'Reptiles') ? 4.4 : ((t.cat === 2 || t.cat === 'Mamíferos') ? 4.2 : 3.8));
    sprite.scale.set(baseScale, baseScale, 1.0);
    sprite.position.set(geoPos.x, geoPos.y, geoPos.z);
    sprite.userData = { isTerritoryBeacon: true, taxonIndex: idx, taxonData: t, baseScale: baseScale };

    const catHex = (TAXONOMIC_CONVENTIONS[t.cat]?.color) || "#84A48B";
    const ringGeo = new THREE.RingGeometry(0.8, 1.8, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(catHex),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(geoPos.x, 0.22, geoPos.z);

    const beaconGroup = new THREE.Group();
    beaconGroup.add(sprite);
    beaconGroup.add(ringMesh);
    beaconGroup.userData = { taxonIndex: idx, taxonData: t, sprite: sprite, ring: ringMesh };

    territoryBeaconsGroup.add(beaconGroup);
    territoryBeacons.push(sprite);
  });

  // Elementos DOM del Tooltip y Pop-up de Territorio
  const territoryTooltip = document.getElementById("territorySpeciesTooltip");
  const ttImg = document.getElementById("ttSpeciesImg");
  const ttBadge = document.getElementById("ttSpeciesBadge");
  const ttName = document.getElementById("ttSpeciesName");
  const ttSci = document.getElementById("ttSpeciesSci");
  const ttLoc = document.getElementById("ttSpeciesLoc");
  const ttRole = document.getElementById("ttSpeciesRole");

  const territoryModal = document.getElementById("territorySpeciesModal");
  const modalImg = document.getElementById("modalSpeciesImg");
  const modalBadge = document.getElementById("modalSpeciesBadge");
  const modalName = document.getElementById("modalSpeciesName");
  const modalSci = document.getElementById("modalSpeciesSci");
  const modalLoc = document.getElementById("modalSpeciesLoc");
  const modalRole = document.getElementById("modalSpeciesRole");
  const modalDesc = document.getElementById("modalSpeciesDesc");
  const modalLinks = document.getElementById("modalSpeciesLinks");
  const btnCloseModal = document.getElementById("btnCloseTerritoryModal");
  const btnFlyToSpecies = document.getElementById("btnFlyToSpecies");

  if (btnCloseModal) {
    btnCloseModal.addEventListener("click", () => {
      if (territoryModal) territoryModal.style.display = "none";
    });
  }

  function openTerritorySpeciesModal(t) {
    if (!t || !territoryModal) return;
    activeTerritoryTaxon = t;

    const catHex = (TAXONOMIC_CONVENTIONS[t.cat]?.color) || "#84A48B";
    territoryModal.style.setProperty("--cat-color", catHex);

    if (modalImg) modalImg.src = t.img || generateSpeciesSvgDataUri(t.id, t.name, t.cat);
    if (modalBadge) {
      modalBadge.textContent = TAXONOMIC_CONVENTIONS[t.cat]?.badge || t.cat;
      modalBadge.style.color = catHex;
      modalBadge.style.borderColor = catHex;
    }
    if (modalName) modalName.textContent = t.name;
    if (modalSci) modalSci.textContent = t.sciname;
    if (modalLoc) modalLoc.textContent = t.territoryPos.locName || t.loc || "Kennedy";
    if (modalRole) modalRole.textContent = t.role || "Eslabón ecológico del territorio";
    if (modalDesc) modalDesc.textContent = `${t.desc || 'Especie registrada en el sistema socioecológico de Kennedy.'} Taxón ID: ${t.id}. Registrado en censo SIGAU e iNaturalist.`;

    if (modalLinks) {
      modalLinks.innerHTML = "";
      const node = rawNodes.find(n => n.taxaId === t.id);
      if (node && node.neighbors && node.neighbors.length > 0) {
        node.neighbors.slice(0, 6).forEach(nb => {
          if (!nb) return;
          const linkDiv = document.createElement("div");
          linkDiv.style.display = "flex";
          linkDiv.style.alignItems = "center";
          linkDiv.style.justifyContent = "space-between";
          linkDiv.style.padding = "4px 8px";
          linkDiv.style.background = "rgba(255,255,255,0.04)";
          linkDiv.style.borderRadius = "4px";
          linkDiv.style.fontSize = "10.5px";
          linkDiv.style.cursor = "pointer";
          linkDiv.innerHTML = `<span><b>${nb.label}</b> (<i>${nb.sciname}</i>)</span> <span style="color:${palette.catColors[nb.cat]}; font-weight:700;">${palette.catNames[nb.cat]}</span>`;
          linkDiv.addEventListener("click", () => {
            const nbTaxon = rawTaxa.find(tx => tx.id === nb.taxaId);
            if (nbTaxon) openTerritorySpeciesModal(nbTaxon);
          });
          modalLinks.appendChild(linkDiv);
        });
      } else {
        modalLinks.innerHTML = '<div style="color:#94a3b8; font-size:10.5px; font-style:italic;">Conectado a la matriz ecológica de humedales y arbolado de Kennedy.</div>';
      }
    }

    if (btnFlyToSpecies) {
      btnFlyToSpecies.style.background = catHex;
      btnFlyToSpecies.onclick = () => {
        if (t.territoryPos && window.gsap) {
          gsap.to(camera.position, {
            x: t.territoryPos.x + 18,
            y: t.territoryPos.y + 24,
            z: t.territoryPos.z + 36,
            duration: 2.2,
            ease: "power2.inOut"
          });
          gsap.to(controls.target, {
            x: t.territoryPos.x,
            y: t.territoryPos.y,
            z: t.territoryPos.z,
            duration: 2.2,
            ease: "power2.inOut"
          });
        }
      };
    }

    territoryModal.style.display = "flex";
  }

  // Pointermove para Tooltip en Territorio
  window.addEventListener("pointermove", (e) => {
    if (currentMorph < 0.35) {
      if (territoryTooltip) territoryTooltip.style.display = "none";
      return;
    }

    mouseVec.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseVec.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouseVec, camera);

    const intersects = raycaster.intersectObjects(territoryBeacons, false);
    if (intersects.length > 0) {
      const hitSprite = intersects[0].object;
      const t = hitSprite.userData.taxonData;
      if (!t) return;

      canvas.style.cursor = "pointer";

      if (hoveredTerritoryBeacon && hoveredTerritoryBeacon !== hitSprite) {
        const base = hoveredTerritoryBeacon.userData.baseScale || 3.8;
        hoveredTerritoryBeacon.scale.set(base, base, 1.0);
      }
      hoveredTerritoryBeacon = hitSprite;
      const targetScale = (hitSprite.userData.baseScale || 3.8) * 1.35;
      hitSprite.scale.set(targetScale, targetScale, 1.0);

      if (territoryTooltip) {
        const catHex = (TAXONOMIC_CONVENTIONS[t.cat]?.color) || "#84A48B";
        territoryTooltip.style.setProperty("--cat-color", catHex);

        if (ttImg) ttImg.src = t.img || generateSpeciesSvgDataUri(t.id, t.name, t.cat);
        if (ttBadge) {
          ttBadge.textContent = TAXONOMIC_CONVENTIONS[t.cat]?.badge || t.cat;
          ttBadge.style.color = catHex;
        }
        if (ttName) ttName.textContent = t.name;
        if (ttSci) ttSci.textContent = t.sciname;
        if (ttLoc) ttLoc.textContent = `📍 ${t.territoryPos.locName || t.loc || 'Kennedy'}`;
        if (ttRole) ttRole.textContent = t.role || "Eslabón ecológico";

        let posX = e.clientX + 16;
        let posY = e.clientY;
        if (posX + 300 > window.innerWidth) posX = e.clientX - 310;
        if (posY + 120 > window.innerHeight) posY = window.innerHeight - 130;
        if (posY < 100) posY = 100;

        territoryTooltip.style.left = `${posX}px`;
        territoryTooltip.style.top = `${posY}px`;
        territoryTooltip.style.display = "block";
      }
    } else {
      if (hoveredTerritoryBeacon) {
        const base = hoveredTerritoryBeacon.userData.baseScale || 3.8;
        hoveredTerritoryBeacon.scale.set(base, base, 1.0);
        hoveredTerritoryBeacon = null;
      }
      canvas.style.cursor = "crosshair";
      if (territoryTooltip) territoryTooltip.style.display = "none";
    }
  });

  // Pointerdown para Clic en Baliza de Territorio
  window.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".glass-panel") || e.target.closest("#territorySpeciesModal") || e.target.closest(".welcome-modal") || e.target.closest(".bottom-experience-bar") || e.target.closest(".waypoints-bar") || e.target.closest("#activeTreeChip")) return;

    if (currentMorph > 0.35) {
      mouseVec.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseVec.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouseVec, camera);

      const intersects = raycaster.intersectObjects(territoryBeacons, false);
      if (intersects.length > 0) {
        const hitSprite = intersects[0].object;
        const t = hitSprite.userData.taxonData;
        if (t) {
          openTerritorySpeciesModal(t);
        }
      }
    }
  });

  // =====================================================================
  // 7. FUNCIONES DE CONTROL DE INTERFAZ, FILTROS Y EVENTOS
  // =====================================================================
  window.openWelcomeModal = () => {
    const modal = document.getElementById("welcomeModalOverlay");
    if (modal) modal.style.display = "flex";
  };

  window.closeWelcomeModal = () => {
    const modal = document.getElementById("welcomeModalOverlay");
    if (modal) modal.style.display = "none";
  };

  window.toggleSideDrawer = () => {
    if (sideDrawer) sideDrawer.classList.toggle("collapsed");
  };

  window.toggleCat = (catIdx) => {
    opts.cats[catIdx] = !opts.cats[catIdx];
    const toggleEl = document.getElementById(`toggleCat${catIdx}`);
    const cardEl = document.getElementById(`catCard${catIdx}`);
    if (toggleEl) toggleEl.classList.toggle("checked", opts.cats[catIdx]);
    if (cardEl) cardEl.classList.toggle("inactive", !opts.cats[catIdx]);
    recalculateDegreesAndSizes();
  };

  window.toggleAllCats = (state) => {
    for (let c = 0; c <= 5; c++) {
      opts.cats[c] = state;
      const toggleEl = document.getElementById(`toggleCat${c}`);
      const cardEl = document.getElementById(`catCard${c}`);
      if (toggleEl) toggleEl.classList.toggle("checked", state);
      if (cardEl) cardEl.classList.toggle("inactive", !state);
    }
    recalculateDegreesAndSizes();
  };

  window.toggleInteraction = (interIdx) => {
    opts.interactions[interIdx] = !opts.interactions[interIdx];
    const itemEl = document.getElementById(`interItem${interIdx}`);
    const isActive = opts.interactions[interIdx];
    if (itemEl) {
      itemEl.classList.toggle("active", isActive);
      itemEl.classList.toggle("inactive", !isActive);
    }
    recalculateDegreesAndSizes();
  };

  window.toggleAllInteractions = (state) => {
    for (let i = 0; i <= 8; i++) {
      opts.interactions[i] = state;
      const itemEl = document.getElementById(`interItem${i}`);
      if (itemEl) {
        itemEl.classList.toggle("active", state);
        itemEl.classList.toggle("inactive", !state);
      }
    }
    recalculateDegreesAndSizes();
  };

  window.restoreHiddenNodes = () => {
    rawNodes.forEach(n => n.hiddenByUser = false);
    recalculateDegreesAndSizes();
  };

  // Disposiciones Espaciales 3D
  window.setLayout = (type) => {
    opts.layout = type;
    document.querySelectorAll(".top-header .btn-flat").forEach(b => {
      if (b.id && b.id.startsWith("btnLayout")) b.classList.remove("active");
    });
    if (type === 'hyperbolic') document.getElementById("btnLayoutHyp")?.classList.add("active");
    if (type === 'clustered') document.getElementById("btnLayoutClust")?.classList.add("active");
    if (type === 'concentric') document.getElementById("btnLayoutConc")?.classList.add("active");

    rawNodes.forEach((n, idx) => {
      let tx = n.ox, ty = n.oy, tz = n.oz;

      if (type === 'clustered') {
        const centers = {
          0: { x: -26, y: 0, z: -14 },
          1: { x: 26, y: 12, z: 14 },
          2: { x: 18, y: -22, z: -16 },
          3: { x: -22, y: -20, z: 20 },
          4: { x: -16, y: 24, z: -20 },
          5: { x: 22, y: 20, z: -22 }
        };
        const c = centers[n.cat] || centers[0];
        const r = 16.0 * Math.cbrt((idx % 45) / 45);
        const theta = (idx * 2.4);
        const phi = ((idx % 19) / 19) * Math.PI;
        tx = c.x + r * Math.sin(phi) * Math.cos(theta);
        ty = c.y + r * Math.sin(phi) * Math.sin(theta);
        tz = c.z + r * Math.cos(phi);
      } else if (type === 'concentric') {
        const ringIdx = n.cat;
        const r = 14.0 + ringIdx * 8.5;
        const posInRing = idx % 80;
        const angle = (posInRing / 80) * Math.PI * 2;
        tx = r * Math.cos(angle);
        ty = ((idx % 9) - 4) * 3.2;
        tz = r * Math.sin(angle);
      }

      if (window.gsap) {
        gsap.to(n.sprite.position, {
          x: tx, y: ty, z: tz,
          duration: 1.6,
          ease: "power2.inOut",
          onUpdate: () => {
            n.x = n.sprite.position.x;
            n.y = n.sprite.position.y;
            n.z = n.sprite.position.z;
            updateEdgeLinesGeometry();
          }
        });
      } else {
        n.sprite.position.set(tx, ty, tz);
        n.x = tx; n.y = ty; n.z = tz;
      }
    });
  };

  window.searchNode = (query) => {
    if (!query || !query.trim()) return;
    const q = query.toLowerCase().trim();
    const found = rawNodes.find(n => n.label.toLowerCase().includes(q) || n.sciname.toLowerCase().includes(q) || n.taxaId.toLowerCase().includes(q));
    if (found) {
      openInspector(found);
      focusNode(found);
    }
  };

  function openInspector(n) {
    selectedNode = n;
    if (!nodeInspector) return;

    document.getElementById("mNodeTitle").innerText = n.label;
    document.getElementById("mNodeSciName").innerText = n.sciname;
    document.getElementById("mDegreeVal").innerText = n.degree;
    document.getElementById("mTaxaCode").innerText = n.taxaId;
    document.getElementById("mRoleBox").innerText = n.role || "Eslabón ecológico";
    document.getElementById("mLocBox").innerText = n.loc || "Kennedy";
    document.getElementById("mAlertBox").innerText = n.alert || "Monitoreo permanente";

    const imgEl = document.getElementById("mNodeImg");
    if (imgEl) {
      imgEl.style.display = "block";
      imgEl.src = n.photoUrl;
      imgEl.onerror = () => { imgEl.style.display = "none"; };
    }

    const listEl = document.getElementById("mNeighborList");
    if (listEl) {
      listEl.innerHTML = "";
      const activeNeighbors = n.neighbors.filter(nb => nb.active);
      if (activeNeighbors.length === 0) {
        listEl.innerHTML = '<div style="padding:8px 10px; color:#64748b; font-size:10px;">Sin interacciones activas con los filtros actuales.</div>';
      } else {
        activeNeighbors.forEach(nb => {
          const key = n.id < nb.id ? `${n.id}_${nb.id}` : `${nb.id}_${n.id}`;
          const inter = edgeDetailsMap[key]?.type || getInteractionInfo(n, nb);
          const item = document.createElement("div");
          item.className = "neighbor-row";
          item.innerHTML = `
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="width:6px; height:6px; border-radius:50%; background:${inter.color};"></span>
              <span style="font-weight:600; font-size:10.5px;">${nb.label}</span>
            </div>
            <span style="font-size:9.5px; color:${inter.color}; font-weight:700;">${inter.name}</span>
          `;
          item.onclick = () => {
            openInspector(nb);
            focusNode(nb);
          };
          listEl.appendChild(item);
        });
      }
    }

    nodeInspector.style.display = "block";
  }

  window.closeInspector = () => {
    selectedNode = null;
    if (nodeInspector) nodeInspector.style.display = "none";
  };

  function focusNode(n) {
    if (!n) return;
    const target = n.sprite.position;
    if (window.gsap) {
      gsap.to(controls.target, { x: target.x, y: target.y, z: target.z, duration: 1.4, ease: "power2.out" });
      const dir = new THREE.Vector3().subVectors(camera.position, target).normalize().multiplyScalar(24.0);
      gsap.to(camera.position, { x: target.x + dir.x, y: target.y + dir.y, z: target.z + dir.z, duration: 1.4, ease: "power2.out" });
    }
  }

  window.focusSelectedNode = () => { if (selectedNode) focusNode(selectedNode); };

  window.hideCurrentNode = () => {
    if (selectedNode) {
      selectedNode.hiddenByUser = true;
      closeInspector();
      recalculateDegreesAndSizes();
      if (toastNotify) {
        toastNotify.style.display = "block";
        setTimeout(() => { toastNotify.style.display = "none"; }, 2400);
      }
    }
  };

  window.resetCamera = () => {
    if (window.gsap) {
      gsap.to(camera.position, { x: swarmCamPos.x, y: swarmCamPos.y, z: swarmCamPos.z, duration: 1.4, ease: "power2.out" });
      gsap.to(controls.target, { x: swarmTarget.x, y: swarmTarget.y, z: swarmTarget.z, duration: 1.4, ease: "power2.out" });
    }
  };

  // Sub-Red 2D Modal
  let subCanvasAnim = null;
  const subOpts = { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true };

  window.openSubNetworkModal = () => {
    if (!selectedNode || !subnetworkModal) return;
    document.getElementById("subModalTitle").innerText = `Sub-Red de ${selectedNode.label}`;
    document.getElementById("subModalCode").innerText = `[${selectedNode.taxaId}]`;
    subnetworkModal.style.display = "flex";
    initSubNetworkCanvas();
  };

  window.closeSubNetworkModal = () => {
    if (subnetworkModal) subnetworkModal.style.display = "none";
    if (subCanvasAnim) cancelAnimationFrame(subCanvasAnim);
  };

  window.toggleSubInteraction = (interIdx) => {
    subOpts[interIdx] = !subOpts[interIdx];
    const btn = document.getElementById(`subInterToggle${interIdx}`);
    if (btn) btn.classList.toggle("active", subOpts[interIdx]);
  };

  function initSubNetworkCanvas() {
    const subCanvas = document.getElementById("subCanvas");
    const wrap = subCanvas.parentElement;
    subCanvas.width = wrap.clientWidth;
    subCanvas.height = wrap.clientHeight;
    const sctx = subCanvas.getContext("2d");

    const centerNode = selectedNode;
    let angle = 0;

    function renderSub() {
      sctx.clearRect(0, 0, subCanvas.width, subCanvas.height);
      const cx = subCanvas.width / 2;
      const cy = subCanvas.height / 2;

      const activeNeighbors = centerNode.neighbors.filter(nb => {
        if (!nb.active) return false;
        const key = centerNode.id < nb.id ? `${centerNode.id}_${nb.id}` : `${nb.id}_${centerNode.id}`;
        const inter = edgeDetailsMap[key]?.type || getInteractionInfo(centerNode, nb);
        return subOpts[inter.id] !== false;
      });

      const total = activeNeighbors.length;
      angle += 0.006;

      activeNeighbors.forEach((nb, i) => {
        const th = (i / total) * Math.PI * 2 + angle;
        const dist = Math.min(cx, cy) * 0.68;
        const nx = cx + Math.cos(th) * dist;
        const ny = cy + Math.sin(th) * dist;

        const key = centerNode.id < nb.id ? `${centerNode.id}_${nb.id}` : `${nb.id}_${centerNode.id}`;
        const inter = edgeDetailsMap[key]?.type || getInteractionInfo(centerNode, nb);

        sctx.beginPath();
        sctx.moveTo(cx, cy);
        sctx.lineTo(nx, ny);
        sctx.strokeStyle = inter.color || "#84a48b";
        sctx.lineWidth = 1.8;
        sctx.stroke();

        sctx.beginPath();
        sctx.arc(nx, ny, 16, 0, Math.PI * 2);
        sctx.fillStyle = palette.catColors[nb.cat] || "#84a48b";
        sctx.fill();
        sctx.strokeStyle = "#ffffff";
        sctx.lineWidth = 2;
        sctx.stroke();

        sctx.fillStyle = "#ffffff";
        sctx.font = "bold 9.5px sans-serif";
        sctx.textAlign = "center";
        sctx.fillText(nb.label.substring(0, 12), nx, ny + 26);
      });

      // Nodo Central
      sctx.beginPath();
      sctx.arc(cx, cy, 24, 0, Math.PI * 2);
      sctx.fillStyle = palette.catColors[centerNode.cat] || "#84a48b";
      sctx.fill();
      sctx.strokeStyle = "#ffffff";
      sctx.lineWidth = 3;
      sctx.stroke();

      sctx.fillStyle = "#ffffff";
      sctx.font = "bold 11px sans-serif";
      sctx.textAlign = "center";
      sctx.fillText(centerNode.taxaId, cx, cy + 4);

      subCanvasAnim = requestAnimationFrame(renderSub);
    }

    renderSub();
  }

  // FAQ Chat Assistant
  window.toggleFaqChat = () => {
    if (faqChatModal) faqChatModal.style.display = (faqChatModal.style.display === "none") ? "flex" : "none";
  };

  window.askFaq = (idx) => {
    const chatBody = document.getElementById("chatBody");
    let userMsg = "", botMsg = "";
    if (idx === 1) {
      userMsg = "¿Qué significan las conexiones y evidencia entre especies?";
      botMsg = "Cada enlace modela un intercambio ecológico real: visitas florales, dispersión zoócora de semillas, depredación, o nidificación en juncales respaldados por el censo SIGAU e iNaturalist.";
    } else if (idx === 2) {
      userMsg = "¿Por qué existen relaciones entre vegetación y fauna?";
      botMsg = "La flora nativa (Saúco, Capulí, Aliso, Juncos) provee alimento, percha y material de anidación indispensable para la supervivencia de las aves y fauna de los humedales.";
    } else if (idx === 3) {
      userMsg = "¿Qué observaciones son datos vs hipótesis?";
      botMsg = "Los registros botánicos y faunísticos georreferenciados corresponden a censos empíricos comprobados. Las relaciones tróficas se fundamentan en literatura ecológica y redes bióticas de la sabana.";
    } else if (idx === 4) {
      userMsg = "¿Qué dependencias amenazan la sostenibilidad?";
      botMsg = "La fragmentación de pastos y tala de arbolado nativo interrumpe los corredores biológicos entre los humedales El Burro, La Vaca y Techo.";
    }

    chatBody.innerHTML += `<div class="msg-bubble msg-user">${userMsg}</div>`;
    chatBody.innerHTML += `<div class="msg-bubble msg-bot">${botMsg}</div>`;
    chatBody.scrollTop = chatBody.scrollHeight;
  };

  window.sendCustomChatMessage = () => {
    const input = document.getElementById("chatInput");
    const text = input.value.trim();
    if (!text) return;
    input.value = "";

    const chatBody = document.getElementById("chatBody");
    chatBody.innerHTML += `<div class="msg-bubble msg-user">${text}</div>`;

    const query = text.toLowerCase();
    const found = rawNodes.find(n => n.label.toLowerCase().includes(query) || n.sciname.toLowerCase().includes(query));
    let botMsg = "";

    if (found) {
      botMsg = `<b>${found.label}</b> (<i>${found.sciname}</i>): ${found.role}. Ubicación: ${found.loc}. Posee ${found.neighbors.length} interacciones activas.`;
    } else {
      botMsg = `He analizado la base de 568 taxones de Kennedy. Puedes consultar cualquier especie o explorar sus interacciones en la red 3D.`;
    }

    chatBody.innerHTML += `<div class="msg-bubble msg-bot">${botMsg}</div>`;
    chatBody.scrollTop = chatBody.scrollHeight;
  };

  // Detección de doble clic para ocultar nodo en Red 3D
  let clickTime = 0;
  window.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".glass-panel") || e.target.closest("#territorySpeciesModal") || e.target.closest(".welcome-modal") || e.target.closest(".bottom-experience-bar") || e.target.closest(".waypoints-bar") || e.target.closest("#activeTreeChip")) return;

    if (currentMorph < 0.35) {
      mouseVec.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseVec.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouseVec, camera);

      const intersects = raycaster.intersectObjects(nodeSprites, false);
      if (intersects.length > 0) {
        const sp = intersects[0].object;
        const nodeObj = rawNodes[sp.userData.id];
        const now = Date.now();

        if (now - clickTime < 320) {
          // Doble clic: ocultar nodo
          if (nodeObj) {
            nodeObj.hiddenByUser = true;
            closeInspector();
            recalculateDegreesAndSizes();
            if (toastNotify) {
              toastNotify.style.display = "block";
              setTimeout(() => { toastNotify.style.display = "none"; }, 2400);
            }
          }
        } else {
          // Un clic: abrir inspector
          if (nodeObj) openInspector(nodeObj);
        }
        clickTime = now;
      }
    }
  });

  // =====================================================================
  // 8. CONTROLADOR DE TRANSICIÓN AL TERRITORIO 3D DE KENNEDY
  // =====================================================================
  const slider = document.getElementById("experienceSlider");
  const btnToggle = document.getElementById("btnPlayTransition");
  const btnActionText = document.getElementById("btnActionText");
  const labelSwarm = document.getElementById("labelSwarm");
  const labelTerritory = document.getElementById("labelTerritory");

  function animateToStage(target) {
    targetMorph = target;
    isTerritory = target > 0.5;

    if (window.gsap) {
      gsap.to(particleUniforms.uMorphProgress, {
        value: target,
        duration: 2.8,
        ease: "power2.inOut",
        onUpdate: () => {
          currentMorph = particleUniforms.uMorphProgress.value;
          if (slider) slider.value = currentMorph * 100;
          updateStageVisibility();
        }
      });

      const endPos = isTerritory ? territoryCamPos : swarmCamPos;
      const endTarget = isTerritory ? territoryTarget : swarmTarget;

      gsap.to(camera.position, { x: endPos.x, y: endPos.y, z: endPos.z, duration: 2.8, ease: "power2.inOut" });
      gsap.to(controls.target, { x: endTarget.x, y: endTarget.y, z: endTarget.z, duration: 2.8, ease: "power2.inOut" });
    }
  }

  function updateStageVisibility() {
    const showTerritory = currentMorph > 0.35;

    if (labelSwarm) labelSwarm.classList.toggle("active", !showTerritory);
    if (labelTerritory) labelTerritory.classList.toggle("active", showTerritory);
    if (btnActionText) btnActionText.textContent = showTerritory ? "VOLVER A RED" : "MATERIALIZAR";
    if (waypointsBar) waypointsBar.classList.toggle("show", showTerritory);

    if (territoryBeaconsGroup) territoryBeaconsGroup.visible = showTerritory;

    networkGroup.children.forEach(c => {
      if (c.isSprite) c.visible = !showTerritory && rawNodes[c.userData.id]?.active;
    });
    if (edgeLinesMesh) edgeLinesMesh.visible = !showTerritory;
  }

  if (slider) {
    slider.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value) / 100.0;
      currentMorph = val;
      particleUniforms.uMorphProgress.value = val;
      updateStageVisibility();
    });
  }

  if (btnToggle) {
    btnToggle.addEventListener("click", () => {
      const next = currentMorph > 0.5 ? 0.0 : 1.0;
      animateToStage(next);
    });
  }

  if (labelSwarm) labelSwarm.addEventListener("click", () => animateToStage(0.0));
  if (labelTerritory) labelTerritory.addEventListener("click", () => animateToStage(1.0));

  // Waypoints de Territorio
  document.querySelectorAll(".waypoint-pill").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const wpKey = btn.getAttribute("data-waypoint");
      if (!wpKey || !waypoints[wpKey]) return;

      document.querySelectorAll(".waypoint-pill").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const wp = waypoints[wpKey];
      if (currentMorph < 0.45) animateToStage(1.0);

      if (window.gsap) {
        gsap.to(camera.position, { x: wp.pos.x, y: wp.pos.y, z: wp.pos.z, duration: 2.4, ease: "power2.inOut" });
        gsap.to(controls.target, { x: wp.target.x, y: wp.target.y, z: wp.target.z, duration: 2.4, ease: "power2.inOut" });
      }
    });
  });

  // Botón para Guardar Vista de Cámara
  if (btnSaveCameraView) {
    btnSaveCameraView.addEventListener("click", () => {
      const saved = {
        pos: { x: Math.round(camera.position.x), y: Math.round(camera.position.y), z: Math.round(camera.position.z) },
        target: { x: Math.round(controls.target.x), y: Math.round(controls.target.y), z: Math.round(controls.target.z) }
      };
      localStorage.setItem("saved_territory_cam", JSON.stringify(saved));
      if (camToast) {
        camToast.style.opacity = "1";
        setTimeout(() => { camToast.style.opacity = "0"; }, 2500);
      }
    });
  }

  if (btnCloseCamInspector) {
    btnCloseCamInspector.addEventListener("click", () => {
      if (camInspectorBox) camInspectorBox.classList.add("hidden");
      localStorage.setItem("hide_cam_helper", "true");
    });
  }

  // Sonido Sintetizado
  let audioCtx = null;
  let soundActive = false;
  const soundBtn = document.getElementById("soundToggle");

  if (soundBtn) {
    soundBtn.addEventListener("click", () => {
      soundActive = !soundActive;
      soundBtn.classList.toggle("active", soundActive);
      soundBtn.innerHTML = soundActive ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
      if (soundActive && !audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
    });
  }

  // =====================================================================
  // 9. LOOP PRINCIPAL DE RENDERIZADO
  // =====================================================================
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    particleUniforms.uTime.value = elapsedTime;

    if (opts.autoRotate && currentMorph < 0.35) {
      networkGroup.rotation.y += delta * 0.12;
    } else {
      networkGroup.rotation.y = 0;
    }

    controls.update();

    if (camCoordPos && camCoordTarget) {
      camCoordPos.innerText = `${Math.round(camera.position.x)}, ${Math.round(camera.position.y)}, ${Math.round(camera.position.z)}`;
      camCoordTarget.innerText = `${Math.round(controls.target.x)}, ${Math.round(controls.target.y)}, ${Math.round(controls.target.z)}`;
    }

    // Pulsación de balizas en territorio
    if (territoryBeaconsGroup && territoryBeaconsGroup.visible) {
      territoryBeaconsGroup.children.forEach((bg, idx) => {
        if (bg.userData.ring) {
          const sc = 1.0 + Math.sin(elapsedTime * 2.5 + idx) * 0.15;
          bg.userData.ring.scale.set(sc, sc, sc);
        }
      });
    }

    renderer.render(scene, camera);
  }

  animate();

  // Resize Handler
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    particleUniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
  });
})();
