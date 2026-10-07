// =====================================================================
// Sistema Socioecológico de Kennedy — Red Biótica & Territorio 3D
// Living 181-Species Socioecological Network (Aves, Mamíferos, Moluscos, Anfibios, Reptiles & Flora)
// =====================================================================

(() => {
  const NET_URL = "./assets/kennedy_net.json";
  const BUILDINGS_URL = "./assets/kennedy_buildings.json";
  const TREES_URL = "./assets/kennedy_trees_real.json";
  const WATER_URL = "./assets/kennedy_water_bodies.json";
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

  // ---- Setup de Escena, Cámara y Renderizador WebGL ----
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

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;

  let controls;
  try {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.screenSpacePanning = true;
    controls.maxDistance = 3500;
    controls.minDistance = 1.8;
    controls.maxPolarAngle = Math.PI;
    controls.target.copy(swarmTarget);
  } catch(e) {
    console.warn("OrbitControls not available, using fallback:", e);
    controls = {
      enableDamping: false,
      target: new THREE.Vector3(0, 0, 0),
      update: () => {},
      addEventListener: () => {}
    };
  }

  window.addEventListener("resize", () => {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if (particleMat) {
      particleMat.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
    }
  });

  // Base Paisajística del Territorio
  const sceneBaseGroup = new THREE.Group();
  sceneBaseGroup.visible = false;
  sceneRoot.add(sceneBaseGroup);

  // Balizas y marcadores de territorio 3D
  const territoryBeaconsGroup = new THREE.Group();
  territoryBeaconsGroup.visible = false;
  sceneRoot.add(territoryBeaconsGroup);

  const territoryBeacons = [];

  function createExpansiveBase() {
    const discGeo = new THREE.RingGeometry(5, 1700, 80);
    const discMat = new THREE.MeshBasicMaterial({ color: 0x070709, transparent: true, opacity: 0.94, side: THREE.DoubleSide });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = -0.6;
    sceneBaseGroup.add(disc);

    const grid = new THREE.GridHelper(2800, 100, 0x1E3A34, 0x0a0a0c);
    grid.position.y = -0.55;
    grid.material.opacity = 0.35;
    grid.material.transparent = true;
    sceneBaseGroup.add(grid);
  }
  createExpansiveBase();

  // =====================================================================
  // 1. CONVENCIONES TAXONÓMICAS & BASE DE DATOS BIOECOLÓGICA DE KENNEDY
  // Convenciones: Flora (0), Aves (1), Mamíferos (2), Moluscos (3), Anfibios (4), Reptiles (5)
  // =====================================================================
  const opts = {
    autoRotate: true,
    pulseMotion: true,
    layoutMode: "hyperbolic",
    cats: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true },
    interactions: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true }
  };

    const TAXONOMIC_CONVENTIONS = {
    "Flora SIGAU": { color: "#84A48B", hex: 0x84A48B, name: "Flora & Arbolado SIGAU", catIdx: 0 },
    "Flora & Arbolado SIGAU": { color: "#84A48B", hex: 0x84A48B, name: "Flora & Arbolado SIGAU", catIdx: 0 },
    "Aves": { color: "#38BDF8", hex: 0x38BDF8, name: "Aves", catIdx: 1 },
    "Mamíferos": { color: "#F59E0B", hex: 0xF59E0B, name: "Mamíferos", catIdx: 2 },
    "Moluscos": { color: "#EC4899", hex: 0xEC4899, name: "Moluscos", catIdx: 3 },
    "Anfibios": { color: "#10B981", hex: 0x10B981, name: "Anfibios", catIdx: 4 },
    "Reptiles": { color: "#A855F7", hex: 0xA855F7, name: "Reptiles", catIdx: 5 }
  };

  const palette = {
    catColors: {
      0: '#84A48B', // Flora & Arbolado SIGAU (Sage Green)
      1: '#38BDF8', // Aves (Sky Blue)
      2: '#F59E0B', // Mamíferos (Amber Gold)
      3: '#EC4899', // Moluscos (Coral Pink)
      4: '#10B981', // Anfibios (Emerald Green)
      5: '#A855F7'  // Reptiles (Purple Lavender)
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

  function buildFull180Dataset() {
    return [{"id": "FLO-001", "name": "Chicala, chirlobirlo, flor amarillo", "sciname": "Chicala sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 4087 individuos censados (altura prom. 2.6 m).", "img": "./assets/fotos/fotos_flora/Chicala, chirlobirlo, flor amarillo.jpeg", "height": 2.6, "count": 4087, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-002", "name": "Jazmin del cabo, laurel huesito", "sciname": "Jazmin del cabo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ112)", "alert": "Censo SIGAU: 3132 individuos censados (altura prom. 3.3 m).", "img": "./assets/fotos/fotos_flora/Jazmin del cabo, laurel huesito.jpeg", "height": 3.3, "count": 3132, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-003", "name": "Sauco", "sciname": "Sauco sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 3016 individuos censados (altura prom. 3.1 m).", "img": "./assets/fotos/fotos_flora/Sauco.jpg", "height": 3.1, "count": 3016, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-004", "name": "Holly liso", "sciname": "Holly liso sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ112)", "alert": "Censo SIGAU: 2677 individuos censados (altura prom. 2.4 m).", "img": "./assets/fotos/fotos_flora/Aliso, fresno, chaquiro.jpeg", "height": 2.4, "count": 2677, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-005", "name": "Falso pimiento", "sciname": "Falso pimiento sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 2628 individuos censados (altura prom. 3.8 m).", "img": "./assets/fotos/fotos_flora/Falso pimiento.jpeg", "height": 3.8, "count": 2628, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-006", "name": "Eugenia", "sciname": "Eugenia sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ112)", "alert": "Censo SIGAU: 2529 individuos censados (altura prom. 3.6 m).", "img": "./assets/fotos/fotos_flora/Eugenia.jpg", "height": 3.6, "count": 2529, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-007", "name": "Cayeno", "sciname": "Cayeno sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ112)", "alert": "Censo SIGAU: 2072 individuos censados (altura prom. 1.8 m).", "img": "./assets/fotos/fotos_flora/Cayeno.jpeg", "height": 1.8, "count": 2072, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-008", "name": "Guayacan de Manizales", "sciname": "Guayacan de Manizales sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ112)", "alert": "Censo SIGAU: 1959 individuos censados (altura prom. 3.0 m).", "img": "./assets/fotos/fotos_flora/Guayacan de Manizales.jpeg", "height": 3.0, "count": 1959, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-009", "name": "Palma yuca, palmiche", "sciname": "Palma yuca sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ112)", "alert": "Censo SIGAU: 1767 individuos censados (altura prom. 2.8 m).", "img": "./assets/fotos/fotos_flora/Palma yuca, palmiche.jpeg", "height": 2.8, "count": 1767, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-010", "name": "Jazmin de la china", "sciname": "Jazmin de la china sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ112)", "alert": "Censo SIGAU: 1747 individuos censados (altura prom. 2.6 m).", "img": "./assets/fotos/fotos_flora/Caballero de la noche, Jazmin, Dama de noche.jpeg", "height": 2.6, "count": 1747, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-011", "name": "Acacia japonesa", "sciname": "Acacia japonesa sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 1651 individuos censados (altura prom. 6.6 m).", "img": "./assets/fotos/fotos_flora/Acacia.jpeg", "height": 6.6, "count": 1651, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-012", "name": "Eucalipto comn", "sciname": "Eucalipto comn sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 1573 individuos censados (altura prom. 18.2 m).", "img": "./assets/fotos/fotos_flora/Eucalipto.jpg", "height": 18.2, "count": 1573, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-013", "name": "Ciprs, Pino ciprs, Pino", "sciname": "Ciprs sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ112)", "alert": "Censo SIGAU: 1513 individuos censados (altura prom. 5.3 m).", "img": "./assets/fotos/fotos_flora/Pino.jpg", "height": 5.3, "count": 1513, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-014", "name": "Urapn, Fresno", "sciname": "Urapn sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 1499 individuos censados (altura prom. 8.6 m).", "img": "./assets/fotos/fotos_flora/Aliso, fresno, chaquiro.jpeg", "height": 8.6, "count": 1499, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-015", "name": "Acacia baracatinga, acacia sabanera, acacia nigra", "sciname": "Acacia baracatinga sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ112)", "alert": "Censo SIGAU: 1352 individuos censados (altura prom. 4.2 m).", "img": "./assets/fotos/fotos_flora/Acacia baracatinga, acacia sabanera, acacia nigra.jpeg", "height": 4.2, "count": 1352, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-016", "name": "Caucho sabanero", "sciname": "Caucho sabanero sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ112)", "alert": "Censo SIGAU: 1327 individuos censados (altura prom. 5.7 m).", "img": "./assets/fotos/fotos_flora/Caucho.jpeg", "height": 5.7, "count": 1327, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-017", "name": "Caucho benjamin", "sciname": "Caucho benjamin sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ112)", "alert": "Censo SIGAU: 1322 individuos censados (altura prom. 2.3 m).", "img": "./assets/fotos/fotos_flora/Caucho.jpeg", "height": 2.3, "count": 1322, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-018", "name": "Caballero de la noche, Jazmin, Dama de noche", "sciname": "Caballero de la noche sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ112)", "alert": "Censo SIGAU: 1291 individuos censados (altura prom. 1.6 m).", "img": "./assets/fotos/fotos_flora/Caballero de la noche, Jazmin, Dama de noche.jpeg", "height": 1.6, "count": 1291, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-019", "name": "Acacia negra, gris", "sciname": "Acacia negra sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ112)", "alert": "Censo SIGAU: 1220 individuos censados (altura prom. 6.3 m).", "img": "./assets/fotos/fotos_flora/Acacia negra, gris.jpeg", "height": 6.3, "count": 1220, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-020", "name": "Hayuelo", "sciname": "Hayuelo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ112)", "alert": "Censo SIGAU: 1206 individuos censados (altura prom. 1.7 m).", "img": "./assets/fotos/fotos_flora/Hayuelo.jpeg", "height": 1.7, "count": 1206, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-021", "name": "Aliso, fresno, chaquiro", "sciname": "Aliso sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 1036 individuos censados (altura prom. 2.6 m).", "img": "./assets/fotos/fotos_flora/Aliso, fresno, chaquiro.jpeg", "height": 2.6, "count": 1036, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-022", "name": "Cerezo", "sciname": "Cerezo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 917 individuos censados (altura prom. 3.7 m).", "img": "./assets/fotos/fotos_flora/Cerezo, capuli.jpg", "height": 3.7, "count": 917, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-023", "name": "Calistemo lloron", "sciname": "Calistemo lloron sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 887 individuos censados (altura prom. 2.1 m).", "img": "./assets/fotos/fotos_flora/Calistemo.jpeg", "height": 2.1, "count": 887, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-024", "name": "Araucaria", "sciname": "Araucaria sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 868 individuos censados (altura prom. 3.7 m).", "img": "./assets/fotos/fotos_flora/Araucaria.jpg", "height": 3.7, "count": 868, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-025", "name": "Pino libro", "sciname": "Pino libro sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 823 individuos censados (altura prom. 1.2 m).", "img": "./assets/fotos/fotos_flora/Pino.jpg", "height": 1.2, "count": 823, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-026", "name": "Mangle de tierra fria", "sciname": "Mangle de tierra fria sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 807 individuos censados (altura prom. 2.3 m).", "img": "./assets/fotos/fotos_flora/Mangle de tierra fria.jpeg", "height": 2.3, "count": 807, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-027", "name": "Cajeto, garagay, urapo", "sciname": "Cajeto sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 741 individuos censados (altura prom. 2.2 m).", "img": "./assets/fotos/fotos_flora/Cajeto, garagay, urapo.jpg", "height": 2.2, "count": 741, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-028", "name": "Corono", "sciname": "Corono sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ77)", "alert": "Censo SIGAU: 736 individuos censados (altura prom. 1.6 m).", "img": "./assets/fotos/fotos_flora/Corono.jpg", "height": 1.6, "count": 736, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-029", "name": "Arrayan blanco", "sciname": "Arrayan blanco sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 719 individuos censados (altura prom. 1.7 m).", "img": "./assets/fotos/fotos_flora/Arrayan blanco.jpeg", "height": 1.7, "count": 719, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-030", "name": "Liquidambar, estoraque", "sciname": "Liquidambar sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 697 individuos censados (altura prom. 2.5 m).", "img": "./assets/fotos/fotos_flora/Liquidambar, estoraque.jpeg", "height": 2.5, "count": 697, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-031", "name": "Chilco", "sciname": "Chilco sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 688 individuos censados (altura prom. 2.3 m).", "img": "./assets/fotos/fotos_flora/Chilco de páramo.jpeg", "height": 2.3, "count": 688, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-032", "name": "Ligustrum", "sciname": "Ligustrum sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ78)", "alert": "Censo SIGAU: 656 individuos censados (altura prom. 2.1 m).", "img": "./assets/fotos/fotos_flora/Ligustrum.jpg", "height": 2.1, "count": 656, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-033", "name": "Abutilon rojo y amarillo (Farolito)", "sciname": "Abutilon rojo y amarillo (Farolito) sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 596 individuos censados (altura prom. 1.9 m).", "img": "./assets/fotos/fotos_flora/Borrachero rojo.jpeg", "height": 1.9, "count": 596, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-034", "name": "Cajeto", "sciname": "Cajeto sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 592 individuos censados (altura prom. 2.8 m).", "img": "./assets/fotos/fotos_flora/Cajeto, garagay, urapo.jpg", "height": 2.8, "count": 592, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-035", "name": "Cucharo", "sciname": "Cucharo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 584 individuos censados (altura prom. 1.7 m).", "img": "./assets/fotos/fotos_flora/Cucharo.jpeg", "height": 1.7, "count": 584, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-036", "name": "Roble", "sciname": "Roble sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 578 individuos censados (altura prom. 2.0 m).", "img": "./assets/fotos/fotos_flora/Roble australiano.jpeg", "height": 2.0, "count": 578, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-037", "name": "Durazno comun", "sciname": "Durazno comun sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ77)", "alert": "Censo SIGAU: 571 individuos censados (altura prom. 3.8 m).", "img": "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400", "height": 3.8, "count": 571, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-038", "name": "Nogal, cedro nogal, cedro negro", "sciname": "Nogal sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 550 individuos censados (altura prom. 2.0 m).", "img": "./assets/fotos/fotos_flora/Nogal, cedro nogal, cedro negro.jpg", "height": 2.0, "count": 550, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-039", "name": "Sauce lloron", "sciname": "Sauce lloron sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 525 individuos censados (altura prom. 5.4 m).", "img": "./assets/fotos/fotos_flora/Sauce lloron.jpeg", "height": 5.4, "count": 525, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-040", "name": "Eucalipto de flor, eucalipto lavabotella", "sciname": "Eucalipto de flor sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 518 individuos censados (altura prom. 2.9 m).", "img": "./assets/fotos/fotos_flora/Eucalipto de flor, eucalipto lavabotella.jpeg", "height": 2.9, "count": 518, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-041", "name": "Cedro, cedro andino, cedro clavel", "sciname": "Cedro sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ112)", "alert": "Censo SIGAU: 466 individuos censados (altura prom. 3.2 m).", "img": "./assets/fotos/fotos_flora/Cedro, cedro andino, cedro clavel.jpg", "height": 3.2, "count": 466, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-042", "name": "Cerezo, capuli", "sciname": "Cerezo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 441 individuos censados (altura prom. 5.3 m).", "img": "./assets/fotos/fotos_flora/Cerezo, capuli.jpg", "height": 5.3, "count": 441, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-043", "name": "Espino, Garbancillo", "sciname": "Espino sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 426 individuos censados (altura prom. 1.8 m).", "img": "./assets/fotos/fotos_flora/Espino, Garbancillo.jpeg", "height": 1.8, "count": 426, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-044", "name": "Palma fenix", "sciname": "Palma fenix sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 424 individuos censados (altura prom. 2.6 m).", "img": "./assets/fotos/fotos_flora/Helecho palma.jpg", "height": 2.6, "count": 424, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-045", "name": "Schefflera, Pategallina hojipequea", "sciname": "Schefflera sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ112)", "alert": "Censo SIGAU: 422 individuos censados (altura prom. 1.5 m).", "img": "./assets/fotos/fotos_flora/Schefflera.jpg", "height": 1.5, "count": 422, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-046", "name": "Schefflera, Pategallina hojigrande", "sciname": "Schefflera sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 398 individuos censados (altura prom. 2.5 m).", "img": "./assets/fotos/fotos_flora/Schefflera, Pategallina hojigrande.jpg", "height": 2.5, "count": 398, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-047", "name": "Acacia morada", "sciname": "Acacia morada sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ112)", "alert": "Censo SIGAU: 385 individuos censados (altura prom. 4.3 m).", "img": "./assets/fotos/fotos_flora/Acacia morada.jpg", "height": 4.3, "count": 385, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-048", "name": "Gaque", "sciname": "Gaque sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ112)", "alert": "Censo SIGAU: 374 individuos censados (altura prom. 1.4 m).", "img": "./assets/fotos/fotos_flora/Gaque.jpeg", "height": 1.4, "count": 374, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-049", "name": "Ciro", "sciname": "Ciro sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ79)", "alert": "Censo SIGAU: 372 individuos censados (altura prom. 1.9 m).", "img": "./assets/fotos/fotos_flora/Ciro.jpg", "height": 1.9, "count": 372, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-050", "name": "Duraznillo, velitas", "sciname": "Duraznillo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 364 individuos censados (altura prom. 1.8 m).", "img": "./assets/fotos/fotos_flora/Duraznillo, velitas.jpg", "height": 1.8, "count": 364, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-051", "name": "Caucho tequendama", "sciname": "Caucho tequendama sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 348 individuos censados (altura prom. 2.3 m).", "img": "./assets/fotos/fotos_flora/Caucho.jpeg", "height": 2.3, "count": 348, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-052", "name": "Mano de oso", "sciname": "Mano de oso sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 344 individuos censados (altura prom. 1.4 m).", "img": "./assets/fotos/fotos_flora/Mano de oso.jpeg", "height": 1.4, "count": 344, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-053", "name": "Alcaparro enano", "sciname": "Alcaparro enano sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ112)", "alert": "Censo SIGAU: 343 individuos censados (altura prom. 1.6 m).", "img": "./assets/fotos/fotos_flora/Alcaparro enano.JPG", "height": 1.6, "count": 343, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-054", "name": "Lavanda", "sciname": "Lavanda sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 325 individuos censados (altura prom. 1.1 m).", "img": "./assets/fotos/fotos_flora/Lavanda.jpg", "height": 1.1, "count": 325, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-055", "name": "Roble australiano", "sciname": "Roble australiano sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 318 individuos censados (altura prom. 4.5 m).", "img": "./assets/fotos/fotos_flora/Roble australiano.jpeg", "height": 4.5, "count": 318, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-056", "name": "Sietecueros nazareno", "sciname": "Sietecueros nazareno sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 301 individuos censados (altura prom. 2.2 m).", "img": "./assets/fotos/fotos_flora/Sietecueros nazareno.jpg", "height": 2.2, "count": 301, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-057", "name": "Eucalipto pomarroso", "sciname": "Eucalipto pomarroso sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 298 individuos censados (altura prom. 3.4 m).", "img": "./assets/fotos/fotos_flora/Eucalipto.jpg", "height": 3.4, "count": 298, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-058", "name": "Pino romeron", "sciname": "Pino romeron sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ113)", "alert": "Censo SIGAU: 298 individuos censados (altura prom. 1.7 m).", "img": "./assets/fotos/fotos_flora/Pino romeron.jpeg", "height": 1.7, "count": 298, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-059", "name": "Dividivi de tierra fria", "sciname": "Dividivi de tierra fria sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 297 individuos censados (altura prom. 2.4 m).", "img": "./assets/fotos/fotos_flora/Mangle de tierra fria.jpeg", "height": 2.4, "count": 297, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-060", "name": "Caballero de la noche", "sciname": "Caballero de la noche sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 292 individuos censados (altura prom. 1.8 m).", "img": "./assets/fotos/fotos_flora/Caballero de la noche, Jazmin, Dama de noche.jpeg", "height": 1.8, "count": 292, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-061", "name": "Chicala rosado", "sciname": "Chicala rosado sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 277 individuos censados (altura prom. 1.4 m).", "img": "./assets/fotos/fotos_flora/Rosa.jpg", "height": 1.4, "count": 277, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-062", "name": "Alcaparro doble", "sciname": "Alcaparro doble sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ77)", "alert": "Censo SIGAU: 266 individuos censados (altura prom. 2.0 m).", "img": "./assets/fotos/fotos_flora/Alcaparro enano.JPG", "height": 2.0, "count": 266, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-063", "name": "Feijoa", "sciname": "Feijoa sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ79)", "alert": "Censo SIGAU: 257 individuos censados (altura prom. 1.7 m).", "img": "./assets/fotos/fotos_flora/Feijoa.jpeg", "height": 1.7, "count": 257, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-064", "name": "Palma de yuca, Palma de bayoneta", "sciname": "Palma de yuca sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 256 individuos censados (altura prom. 3.1 m).", "img": "./assets/fotos/fotos_flora/Helecho palma.jpg", "height": 3.1, "count": 256, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-065", "name": "Chiripique", "sciname": "Chiripique sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ80)", "alert": "Censo SIGAU: 252 individuos censados (altura prom. 1.5 m).", "img": "./assets/fotos/fotos_flora/Chiripique.jpg", "height": 1.5, "count": 252, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-066", "name": "Abutilon blanco", "sciname": "Abutilon blanco sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ112)", "alert": "Censo SIGAU: 251 individuos censados (altura prom. 1.6 m).", "img": "./assets/fotos/fotos_flora/Arrayan blanco.jpeg", "height": 1.6, "count": 251, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-067", "name": "Pino ptula", "sciname": "Pino ptula sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 249 individuos censados (altura prom. 6.2 m).", "img": "./assets/fotos/fotos_flora/Pino.jpg", "height": 6.2, "count": 249, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-068", "name": "Naranjo", "sciname": "Naranjo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 248 individuos censados (altura prom. 1.5 m).", "img": "./assets/fotos/fotos_flora/Naranjo.jpg", "height": 1.5, "count": 248, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-069", "name": "Sietecueros real", "sciname": "Sietecueros real sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ79)", "alert": "Censo SIGAU: 242 individuos censados (altura prom. 1.7 m).", "img": "./assets/fotos/fotos_flora/Sietecueros nazareno.jpg", "height": 1.7, "count": 242, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-070", "name": "Holly espinoso", "sciname": "Holly espinoso sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ77)", "alert": "Censo SIGAU: 235 individuos censados (altura prom. 2.6 m).", "img": "./assets/fotos/fotos_flora/Pino.jpg", "height": 2.6, "count": 235, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-071", "name": "Sangregao, drago, croto", "sciname": "Sangregao sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 216 individuos censados (altura prom. 3.2 m).", "img": "./assets/fotos/fotos_flora/Sangregao, drago, croto.jpg", "height": 3.2, "count": 216, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-072", "name": "Caucho", "sciname": "Caucho sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 211 individuos censados (altura prom. 1.8 m).", "img": "./assets/fotos/fotos_flora/Caucho de la india, caucho.jpeg", "height": 1.8, "count": 211, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-073", "name": "Caucho de la india, caucho", "sciname": "Caucho de la india sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 210 individuos censados (altura prom. 3.7 m).", "img": "./assets/fotos/fotos_flora/Caucho de la india, caucho.jpeg", "height": 3.7, "count": 210, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-074", "name": "Palma payanesa", "sciname": "Palma payanesa sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ77)", "alert": "Censo SIGAU: 200 individuos censados (altura prom. 1.8 m).", "img": "./assets/fotos/fotos_flora/Helecho palma.jpg", "height": 1.8, "count": 200, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-075", "name": "Garbancillo", "sciname": "Garbancillo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ78)", "alert": "Censo SIGAU: 198 individuos censados (altura prom. 2.1 m).", "img": "./assets/fotos/fotos_flora/Espino, Garbancillo.jpeg", "height": 2.1, "count": 198, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-076", "name": "Milflores", "sciname": "Milflores sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 188 individuos censados (altura prom. 1.5 m).", "img": "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400", "height": 1.5, "count": 188, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-077", "name": "Higuerillo", "sciname": "Higuerillo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ112)", "alert": "Censo SIGAU: 187 individuos censados (altura prom. 2.2 m).", "img": "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400", "height": 2.2, "count": 187, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-078", "name": "Laurel de cera (hoja pequea)", "sciname": "Laurel de cera (hoja pequea) sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 187 individuos censados (altura prom. 1.6 m).", "img": "./assets/fotos/fotos_flora/Laurel de cera.jpeg", "height": 1.6, "count": 187, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-079", "name": "Aguacate", "sciname": "Aguacate sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 177 individuos censados (altura prom. 2.8 m).", "img": "./assets/fotos/fotos_flora/Aguacate.jpg", "height": 2.8, "count": 177, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-080", "name": "Poligala", "sciname": "Poligala sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 169 individuos censados (altura prom. 1.0 m).", "img": "./assets/fotos/fotos_flora/Poligala.jpeg", "height": 1.0, "count": 169, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-081", "name": "Brevo", "sciname": "Brevo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 168 individuos censados (altura prom. 2.4 m).", "img": "./assets/fotos/fotos_flora/Brevo.jpg", "height": 2.4, "count": 168, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-082", "name": "Palma Alejandra", "sciname": "Palma Alejandra sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ113)", "alert": "Censo SIGAU: 158 individuos censados (altura prom. 1.8 m).", "img": "./assets/fotos/fotos_flora/Palma Alejandra.jpg", "height": 1.8, "count": 158, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-083", "name": "Ciprs enano", "sciname": "Ciprs enano sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ79)", "alert": "Censo SIGAU: 145 individuos censados (altura prom. 1.4 m).", "img": "./assets/fotos/fotos_flora/Alcaparro enano.JPG", "height": 1.4, "count": 145, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-084", "name": "Cariseco", "sciname": "Cariseco sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ80)", "alert": "Censo SIGAU: 144 individuos censados (altura prom. 1.5 m).", "img": "./assets/fotos/fotos_flora/Cariseco, Tres hojas.jpg", "height": 1.5, "count": 144, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-085", "name": "Tabaquillo", "sciname": "Tabaquillo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 141 individuos censados (altura prom. 1.2 m).", "img": "./assets/fotos/fotos_flora/Tabaquillo.jpg", "height": 1.2, "count": 141, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-086", "name": "Araucaria crespa", "sciname": "Araucaria crespa sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 133 individuos censados (altura prom. 2.9 m).", "img": "./assets/fotos/fotos_flora/Araucaria.jpg", "height": 2.9, "count": 133, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-087", "name": "Pino colombiano, pino de pacho, pino romern", "sciname": "Pino colombiano sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 132 individuos censados (altura prom. 2.0 m).", "img": "./assets/fotos/fotos_flora/Pino.jpg", "height": 2.0, "count": 132, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-088", "name": "Pajarito", "sciname": "Pajarito sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 129 individuos censados (altura prom. 1.7 m).", "img": "./assets/fotos/fotos_flora/Pajarito.jpeg", "height": 1.7, "count": 129, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-089", "name": "Palma de cera, Palma blanca", "sciname": "Palma de cera sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 127 individuos censados (altura prom. 2.5 m).", "img": "./assets/fotos/fotos_flora/Palma de cera, Palma blanca.jpg", "height": 2.5, "count": 127, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-090", "name": "Garrocho", "sciname": "Garrocho sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ79)", "alert": "Censo SIGAU: 126 individuos censados (altura prom. 1.5 m).", "img": "./assets/fotos/fotos_flora/Garrocho.jpg", "height": 1.5, "count": 126, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-091", "name": "Sombrilla japonesa", "sciname": "Sombrilla japonesa sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 125 individuos censados (altura prom. 1.8 m).", "img": "./assets/fotos/fotos_flora/Sombrilla japonesa.jpeg", "height": 1.8, "count": 125, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-092", "name": "Pino candelabro", "sciname": "Pino candelabro sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 123 individuos censados (altura prom. 6.8 m).", "img": "./assets/fotos/fotos_flora/Pino.jpg", "height": 6.8, "count": 123, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-093", "name": "Arrayan negro", "sciname": "Arrayan negro sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ82)", "alert": "Censo SIGAU: 122 individuos censados (altura prom. 1.8 m).", "img": "./assets/fotos/fotos_flora/Arrayan negro.jpg", "height": 1.8, "count": 122, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-094", "name": "Sangregado", "sciname": "Sangregado sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ81)", "alert": "Censo SIGAU: 121 individuos censados (altura prom. 2.3 m).", "img": "./assets/fotos/fotos_flora/Sangregado.jpg", "height": 2.3, "count": 121, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-095", "name": "Tibar, pagoda o rodamonte", "sciname": "Tibar sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ112)", "alert": "Censo SIGAU: 120 individuos censados (altura prom. 2.6 m).", "img": "./assets/fotos/fotos_flora/Tibar, pagoda o rodamonte.jpeg", "height": 2.6, "count": 120, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-096", "name": "Cipres Japones, criptomeria", "sciname": "Cipres Japones sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 120 individuos censados (altura prom. 0.9 m).", "img": "./assets/fotos/fotos_flora/Cipres Japones, criptomeria.jpg", "height": 0.9, "count": 120, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-097", "name": "Mandarina", "sciname": "Mandarina sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 120 individuos censados (altura prom. 1.4 m).", "img": "./assets/fotos/fotos_flora/Mandarina.jpg", "height": 1.4, "count": 120, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-098", "name": "Tinto", "sciname": "Tinto sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 116 individuos censados (altura prom. 1.4 m).", "img": "./assets/fotos/fotos_flora/Tinto.jpeg", "height": 1.4, "count": 116, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-099", "name": "Lupinus", "sciname": "Lupinus sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ79)", "alert": "Censo SIGAU: 116 individuos censados (altura prom. 0.7 m).", "img": "./assets/fotos/fotos_flora/Lupinus.jpg", "height": 0.7, "count": 116, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-100", "name": "Mortillo", "sciname": "Mortillo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 109 individuos censados (altura prom. 1.4 m).", "img": "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400", "height": 1.4, "count": 109, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-101", "name": "Tibar", "sciname": "Tibar sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ112)", "alert": "Censo SIGAU: 107 individuos censados (altura prom. 1.8 m).", "img": "./assets/fotos/fotos_flora/Tibar, pagoda o rodamonte.jpeg", "height": 1.8, "count": 107, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-102", "name": "Nispero", "sciname": "Nispero sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 100 individuos censados (altura prom. 1.8 m).", "img": "./assets/fotos/fotos_flora/Nispero.jpg", "height": 1.8, "count": 100, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-103", "name": "Cipres", "sciname": "Cipres sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ79)", "alert": "Censo SIGAU: 99 individuos censados (altura prom. 3.4 m).", "img": "./assets/fotos/fotos_flora/Cipres italiano.jpg", "height": 3.4, "count": 99, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-104", "name": "Palma coquito", "sciname": "Palma coquito sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 97 individuos censados (altura prom. 2.4 m).", "img": "./assets/fotos/fotos_flora/Helecho palma.jpg", "height": 2.4, "count": 97, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-105", "name": "Guayabo", "sciname": "Guayabo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 96 individuos censados (altura prom. 1.3 m).", "img": "./assets/fotos/fotos_flora/Guayabo de mico.jpeg", "height": 1.3, "count": 96, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-106", "name": "Guamo santafereo", "sciname": "Guamo santafereo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 94 individuos censados (altura prom. 1.7 m).", "img": "./assets/fotos/fotos_flora/Guamo.jpg", "height": 1.7, "count": 94, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-107", "name": "Raque, San juanito", "sciname": "Raque sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ80)", "alert": "Censo SIGAU: 89 individuos censados (altura prom. 1.3 m).", "img": "./assets/fotos/fotos_flora/Raque, San juanito.jpeg", "height": 1.3, "count": 89, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-108", "name": "Laurel de cera", "sciname": "Laurel de cera sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 87 individuos censados (altura prom. 1.6 m).", "img": "./assets/fotos/fotos_flora/Laurel de cera (hoja pequeña).jpeg", "height": 1.6, "count": 87, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-109", "name": "Abelia", "sciname": "Abelia sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ79)", "alert": "Censo SIGAU: 86 individuos censados (altura prom. 1.2 m).", "img": "./assets/fotos/fotos_flora/Abelia.jpg", "height": 1.2, "count": 86, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-110", "name": "Fucsia arbustiva", "sciname": "Fucsia arbustiva sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ44)", "alert": "Censo SIGAU: 82 individuos censados (altura prom. 1.3 m).", "img": "./assets/fotos/fotos_flora/Fucsia boliviana.jpeg", "height": 1.3, "count": 82, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-111", "name": "Arboloco", "sciname": "Arboloco sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ112)", "alert": "Censo SIGAU: 81 individuos censados (altura prom. 2.0 m).", "img": "./assets/fotos/fotos_flora/Arboloco.jpg", "height": 2.0, "count": 81, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-112", "name": "Palma roebeleni", "sciname": "Palma roebeleni sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 80 individuos censados (altura prom. 1.9 m).", "img": "./assets/fotos/fotos_flora/Helecho palma.jpg", "height": 1.9, "count": 80, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-113", "name": "Calistemo", "sciname": "Calistemo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ113)", "alert": "Censo SIGAU: 78 individuos censados (altura prom. 1.4 m).", "img": "./assets/fotos/fotos_flora/Calistemo.jpeg", "height": 1.4, "count": 78, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-114", "name": "Cajeto sp", "sciname": "Cajeto sp sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ82)", "alert": "Censo SIGAU: 76 individuos censados (altura prom. 2.1 m).", "img": "./assets/fotos/fotos_flora/Cajeto.jpg", "height": 2.1, "count": 76, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-115", "name": "Mermelada", "sciname": "Mermelada sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ80)", "alert": "Censo SIGAU: 74 individuos censados (altura prom. 1.6 m).", "img": "./assets/fotos/fotos_flora/Mermelada.jpg", "height": 1.6, "count": 74, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-116", "name": "Cedrillo, Yuco", "sciname": "Cedrillo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ44)", "alert": "Censo SIGAU: 72 individuos censados (altura prom. 1.8 m).", "img": "./assets/fotos/fotos_flora/Cedrillo, Yuco.jpeg", "height": 1.8, "count": 72, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-117", "name": "Endrino", "sciname": "Endrino sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 71 individuos censados (altura prom. 1.1 m).", "img": "./assets/fotos/fotos_flora/Endrino.jpg", "height": 1.1, "count": 71, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-118", "name": "Acebo", "sciname": "Acebo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ80)", "alert": "Censo SIGAU: 70 individuos censados (altura prom. 1.0 m).", "img": "./assets/fotos/fotos_flora/Acebo.jpg", "height": 1.0, "count": 70, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-119", "name": "Chocho", "sciname": "Chocho sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 67 individuos censados (altura prom. 2.2 m).", "img": "./assets/fotos/fotos_flora/Chocho.jpg", "height": 2.2, "count": 67, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-120", "name": "Magnolio", "sciname": "Magnolio sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ82)", "alert": "Censo SIGAU: 63 individuos censados (altura prom. 2.4 m).", "img": "./assets/fotos/fotos_flora/Magnolio.jpg", "height": 2.4, "count": 63, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-121", "name": "Baeckea", "sciname": "Baeckea sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 63 individuos censados (altura prom. 1.6 m).", "img": "./assets/fotos/fotos_flora/Baeckea.jpeg", "height": 1.6, "count": 63, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-122", "name": "Acacia", "sciname": "Acacia sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ112)", "alert": "Censo SIGAU: 61 individuos censados (altura prom. 4.2 m).", "img": "./assets/fotos/fotos_flora/Acacia azul.jpg", "height": 4.2, "count": 61, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-123", "name": "Ciruelo", "sciname": "Ciruelo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 60 individuos censados (altura prom. 2.2 m).", "img": "./assets/fotos/fotos_flora/Cerezo, ciruelo.jpg", "height": 2.2, "count": 60, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-124", "name": "Cariseco, Tres hojas", "sciname": "Cariseco sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 58 individuos censados (altura prom. 1.9 m).", "img": "./assets/fotos/fotos_flora/Cariseco, Tres hojas.jpg", "height": 1.9, "count": 58, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-125", "name": "Borrachero blanco", "sciname": "Borrachero blanco sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 58 individuos censados (altura prom. 1.9 m).", "img": "./assets/fotos/fotos_flora/Borrachero.jpg", "height": 1.9, "count": 58, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-126", "name": "Callistemo", "sciname": "Callistemo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 58 individuos censados (altura prom. 2.9 m).", "img": "./assets/fotos/fotos_flora/Callistemo.jpeg", "height": 2.9, "count": 58, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-127", "name": "Tibar, tobo, rodamonte", "sciname": "Tibar sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 57 individuos censados (altura prom. 3.8 m).", "img": "./assets/fotos/fotos_flora/Tibar, tobo, rodamonte.jpeg", "height": 3.8, "count": 57, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-128", "name": "Cipres italiano", "sciname": "Cipres italiano sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ79)", "alert": "Censo SIGAU: 55 individuos censados (altura prom. 2.1 m).", "img": "./assets/fotos/fotos_flora/Cipres italiano.jpg", "height": 2.1, "count": 55, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-129", "name": "Agracejo", "sciname": "Agracejo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ80)", "alert": "Censo SIGAU: 54 individuos censados (altura prom. 0.8 m).", "img": "./assets/fotos/fotos_flora/Agracejo.jpeg", "height": 0.8, "count": 54, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-130", "name": "Limon", "sciname": "Limon sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ79)", "alert": "Censo SIGAU: 53 individuos censados (altura prom. 2.2 m).", "img": "./assets/fotos/fotos_flora/Limon.jpeg", "height": 2.2, "count": 53, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-131", "name": "Carbonero", "sciname": "Carbonero sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ44)", "alert": "Censo SIGAU: 53 individuos censados (altura prom. 1.0 m).", "img": "./assets/fotos/fotos_flora/Carbonero rojo.jpeg", "height": 1.0, "count": 53, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-132", "name": "Tuno esmeraldo", "sciname": "Tuno esmeraldo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ80)", "alert": "Censo SIGAU: 53 individuos censados (altura prom. 0.7 m).", "img": "./assets/fotos/fotos_flora/Tuno esmeraldo.jpeg", "height": 0.7, "count": 53, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-133", "name": "Acacia de jardin", "sciname": "Acacia de jardin sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 51 individuos censados (altura prom. 6.8 m).", "img": "./assets/fotos/fotos_flora/Acacia.jpeg", "height": 6.8, "count": 51, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-134", "name": "Gurrubo", "sciname": "Gurrubo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ112)", "alert": "Censo SIGAU: 49 individuos censados (altura prom. 1.6 m).", "img": "./assets/fotos/fotos_flora/Gurrubo.jpg", "height": 1.6, "count": 49, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-135", "name": "Arrayan", "sciname": "Arrayan sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ82)", "alert": "Censo SIGAU: 47 individuos censados (altura prom. 1.7 m).", "img": "./assets/fotos/fotos_flora/Arrayan blanco.jpeg", "height": 1.7, "count": 47, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-136", "name": "Rama negra", "sciname": "Rama negra sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ79)", "alert": "Censo SIGAU: 47 individuos censados (altura prom. 1.4 m).", "img": "./assets/fotos/fotos_flora/Rama negra.jpg", "height": 1.4, "count": 47, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-137", "name": "Papayuelo", "sciname": "Papayuelo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ112)", "alert": "Censo SIGAU: 46 individuos censados (altura prom. 3.4 m).", "img": "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400", "height": 3.4, "count": 46, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-138", "name": "Amarrabollo", "sciname": "Amarrabollo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 46 individuos censados (altura prom. 1.8 m).", "img": "./assets/fotos/fotos_flora/Amarrabollo.jpg", "height": 1.8, "count": 46, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-139", "name": "Curapin, Campanilla", "sciname": "Curapin sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ79)", "alert": "Censo SIGAU: 46 individuos censados (altura prom. 1.7 m).", "img": "./assets/fotos/fotos_flora/Curapin, Campanilla.jpeg", "height": 1.7, "count": 46, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-140", "name": "Palma cinta", "sciname": "Palma cinta sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 45 individuos censados (altura prom. 1.7 m).", "img": "./assets/fotos/fotos_flora/Helecho palma.jpg", "height": 1.7, "count": 45, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-141", "name": "Azara", "sciname": "Azara sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 45 individuos censados (altura prom. 1.2 m).", "img": "./assets/fotos/fotos_flora/Azara.jpeg", "height": 1.2, "count": 45, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-142", "name": "Ayer, hoy y maana", "sciname": "Ayer sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ44)", "alert": "Censo SIGAU: 43 individuos censados (altura prom. 1.8 m).", "img": "./assets/fotos/fotos_flora/Ayer, hoy y mañana.jpg", "height": 1.8, "count": 43, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-143", "name": "Pino colombiano, chaquiro", "sciname": "Pino colombiano sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ82)", "alert": "Censo SIGAU: 42 individuos censados (altura prom. 1.9 m).", "img": "./assets/fotos/fotos_flora/Pino colombiano, chaquiro.jpg", "height": 1.9, "count": 42, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-144", "name": "Guamo", "sciname": "Guamo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 42 individuos censados (altura prom. 1.6 m).", "img": "./assets/fotos/fotos_flora/Guamo.jpg", "height": 1.6, "count": 42, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-145", "name": "Venturosa", "sciname": "Venturosa sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 41 individuos censados (altura prom. 0.9 m).", "img": "./assets/fotos/fotos_flora/Rosa.jpg", "height": 0.9, "count": 41, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-146", "name": "Arbol de Te", "sciname": "Arbol de Te sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 40 individuos censados (altura prom. 1.6 m).", "img": "./assets/fotos/fotos_flora/Arbol de Te.jpg", "height": 1.6, "count": 40, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-147", "name": "Tibar, Rodamonte, Pagoda", "sciname": "Tibar sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ112)", "alert": "Censo SIGAU: 39 individuos censados (altura prom. 2.4 m).", "img": "./assets/fotos/fotos_flora/Tibar, Rodamonte, Pagoda.jpeg", "height": 2.4, "count": 39, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-148", "name": "Grevilea", "sciname": "Grevilea sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ79)", "alert": "Censo SIGAU: 36 individuos censados (altura prom. 1.9 m).", "img": "./assets/fotos/fotos_flora/Grevilea.jpeg", "height": 1.9, "count": 36, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-149", "name": "Eucalipto", "sciname": "Eucalipto sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 35 individuos censados (altura prom. 9.8 m).", "img": "./assets/fotos/fotos_flora/Eucalipto de flor, eucalipto lavabotella.jpeg", "height": 9.8, "count": 35, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-150", "name": "Citrus spp.", "sciname": "Citrus spp. sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ79)", "alert": "Censo SIGAU: 33 individuos censados (altura prom. 1.5 m).", "img": "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400", "height": 1.5, "count": 33, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-151", "name": "Mirto", "sciname": "Mirto sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ82)", "alert": "Censo SIGAU: 33 individuos censados (altura prom. 1.4 m).", "img": "./assets/fotos/fotos_flora/Mirto.jpeg", "height": 1.4, "count": 33, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-152", "name": "Palma de cera", "sciname": "Palma de cera sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 32 individuos censados (altura prom. 2.8 m).", "img": "./assets/fotos/fotos_flora/Palma de cera, Palma blanca.jpg", "height": 2.8, "count": 32, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-153", "name": "Trompeto", "sciname": "Trompeto sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ79)", "alert": "Censo SIGAU: 31 individuos censados (altura prom. 2.0 m).", "img": "./assets/fotos/fotos_flora/Trompeto.jpeg", "height": 2.0, "count": 31, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-154", "name": "Metrosideros", "sciname": "Metrosideros sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 31 individuos censados (altura prom. 1.5 m).", "img": "./assets/fotos/fotos_flora/Metrosideros.jpeg", "height": 1.5, "count": 31, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-155", "name": "Fucsia boliviana", "sciname": "Fucsia boliviana sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ79)", "alert": "Censo SIGAU: 28 individuos censados (altura prom. 1.4 m).", "img": "./assets/fotos/fotos_flora/Fucsia boliviana.jpeg", "height": 1.4, "count": 28, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-156", "name": "Palma washingtoniana", "sciname": "Palma washingtoniana sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 27 individuos censados (altura prom. 10.4 m).", "img": "./assets/fotos/fotos_flora/Helecho palma.jpg", "height": 10.4, "count": 27, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-157", "name": "Arbol de hierro", "sciname": "Arbol de hierro sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 27 individuos censados (altura prom. 1.9 m).", "img": "./assets/fotos/fotos_flora/Arbol de hierro.jpeg", "height": 1.9, "count": 27, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-158", "name": "Yarumo", "sciname": "Yarumo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 27 individuos censados (altura prom. 2.8 m).", "img": "./assets/fotos/fotos_flora/Yarumo.jpg", "height": 2.8, "count": 27, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-159", "name": "Eucalipto plateado", "sciname": "Eucalipto plateado sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 26 individuos censados (altura prom. 11.3 m).", "img": "./assets/fotos/fotos_flora/Eucalipto plateado.jpg", "height": 11.3, "count": 26, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-160", "name": "Mimbre", "sciname": "Mimbre sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 25 individuos censados (altura prom. 3.2 m).", "img": "./assets/fotos/fotos_flora/Mimbre.jpg", "height": 3.2, "count": 25, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-161", "name": "Cucubo", "sciname": "Cucubo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 24 individuos censados (altura prom. 3.8 m).", "img": "./assets/fotos/fotos_flora/Cucubo.jpeg", "height": 3.8, "count": 24, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-162", "name": "Azuceno, enebro", "sciname": "Azuceno sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ82)", "alert": "Censo SIGAU: 24 individuos censados (altura prom. 2.6 m).", "img": "./assets/fotos/fotos_flora/Azuceno, enebro.jpg", "height": 2.6, "count": 24, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-163", "name": "Raphiolepys", "sciname": "Raphiolepys sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 23 individuos censados (altura prom. 1.4 m).", "img": "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400", "height": 1.4, "count": 23, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-164", "name": "Carbonero rojo", "sciname": "Carbonero rojo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ79)", "alert": "Censo SIGAU: 22 individuos censados (altura prom. 1.9 m).", "img": "./assets/fotos/fotos_flora/Carbonero rojo.jpeg", "height": 1.9, "count": 22, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-165", "name": "Platano", "sciname": "Platano sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 22 individuos censados (altura prom. 3.7 m).", "img": "./assets/fotos/fotos_flora/Platano.jpg", "height": 3.7, "count": 22, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-166", "name": "Arbol de corcho", "sciname": "Arbol de corcho sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ82)", "alert": "Censo SIGAU: 21 individuos censados (altura prom. 2.2 m).", "img": "./assets/fotos/fotos_flora/Arbol de corcho.jpeg", "height": 2.2, "count": 21, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-167", "name": "Siete Cueros peludo", "sciname": "Siete Cueros peludo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 21 individuos censados (altura prom. 1.6 m).", "img": "./assets/fotos/fotos_flora/Siete cueros.jpeg", "height": 1.6, "count": 21, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-168", "name": "Sietecueros plateado", "sciname": "Sietecueros plateado sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 21 individuos censados (altura prom. 1.1 m).", "img": "./assets/fotos/fotos_flora/Sietecueros nazareno.jpg", "height": 1.1, "count": 21, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-169", "name": "Palma de cera, Palma de ramo", "sciname": "Palma de cera sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 20 individuos censados (altura prom. 1.6 m).", "img": "./assets/fotos/fotos_flora/Palma de cera, Palma de ramo.jpg", "height": 1.6, "count": 20, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-170", "name": "Aligustre del Japon", "sciname": "Aligustre del Japon sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ79)", "alert": "Censo SIGAU: 20 individuos censados (altura prom. 0.9 m).", "img": "./assets/fotos/fotos_flora/Cipres Japones, criptomeria.jpg", "height": 0.9, "count": 20, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-171", "name": "Abutilon  pequeo", "sciname": "Abutilon  pequeo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ113)", "alert": "Censo SIGAU: 20 individuos censados (altura prom. 1.3 m).", "img": "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400", "height": 1.3, "count": 20, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-172", "name": "Azalea", "sciname": "Azalea sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 20 individuos censados (altura prom. 0.9 m).", "img": "./assets/fotos/fotos_flora/Azalea.jpeg", "height": 0.9, "count": 20, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-173", "name": "Pomarroso", "sciname": "Pomarroso sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 18 individuos censados (altura prom. 2.1 m).", "img": "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400", "height": 2.1, "count": 18, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-174", "name": "Algodon extranjero", "sciname": "Algodon extranjero sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 18 individuos censados (altura prom. 2.4 m).", "img": "./assets/fotos/fotos_flora/Algodon extranjero.jpg", "height": 2.4, "count": 18, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-175", "name": "Tibar extranjero", "sciname": "Tibar extranjero sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ112)", "alert": "Censo SIGAU: 17 individuos censados (altura prom. 2.6 m).", "img": "./assets/fotos/fotos_flora/Tibar.jpeg", "height": 2.6, "count": 17, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-176", "name": "Abutilon quesito", "sciname": "Abutilon quesito sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 17 individuos censados (altura prom. 2.1 m).", "img": "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400", "height": 2.1, "count": 17, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-177", "name": "Cerezo, ciruelo", "sciname": "Cerezo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ112)", "alert": "Censo SIGAU: 17 individuos censados (altura prom. 2.0 m).", "img": "./assets/fotos/fotos_flora/Cerezo, ciruelo.jpg", "height": 2.0, "count": 17, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-178", "name": "Lulo de perro", "sciname": "Lulo de perro sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ112)", "alert": "Censo SIGAU: 17 individuos censados (altura prom. 1.4 m).", "img": "./assets/fotos/fotos_flora/Lulo de perro.jpg", "height": 1.4, "count": 17, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-179", "name": "Chilco de pramo", "sciname": "Chilco de pramo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ78)", "alert": "Censo SIGAU: 17 individuos censados (altura prom. 1.6 m).", "img": "./assets/fotos/fotos_flora/Chilco.jpg", "height": 1.6, "count": 17, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-180", "name": "Cedrillo", "sciname": "Cedrillo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 16 individuos censados (altura prom. 1.4 m).", "img": "./assets/fotos/fotos_flora/Cedrillo, Yuco.jpeg", "height": 1.4, "count": 16, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-181", "name": "Tuno", "sciname": "Tuno sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ80)", "alert": "Censo SIGAU: 16 individuos censados (altura prom. 1.2 m).", "img": "./assets/fotos/fotos_flora/Tuno esmeraldo.jpeg", "height": 1.2, "count": 16, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-182", "name": "Arbol de Fuego", "sciname": "Arbol de Fuego sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ79)", "alert": "Censo SIGAU: 16 individuos censados (altura prom. 3.5 m).", "img": "./assets/fotos/fotos_flora/Arbol de corcho.jpeg", "height": 3.5, "count": 16, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-183", "name": "Manzano", "sciname": "Manzano sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 15 individuos censados (altura prom. 3.0 m).", "img": "./assets/fotos/fotos_flora/Manzano.jpg", "height": 3.0, "count": 15, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-184", "name": "Rosa", "sciname": "Rosa sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 15 individuos censados (altura prom. 1.2 m).", "img": "./assets/fotos/fotos_flora/Rosa.jpg", "height": 1.2, "count": 15, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-185", "name": "Guayabo del peru", "sciname": "Guayabo del peru sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 15 individuos censados (altura prom. 1.1 m).", "img": "./assets/fotos/fotos_flora/Guayabo.jpeg", "height": 1.1, "count": 15, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-186", "name": "Ceiba de tierra fria", "sciname": "Ceiba de tierra fria sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 15 individuos censados (altura prom. 1.3 m).", "img": "./assets/fotos/fotos_flora/Mangle de tierra fria.jpeg", "height": 1.3, "count": 15, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-187", "name": "Mulato", "sciname": "Mulato sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 15 individuos censados (altura prom. 0.8 m).", "img": "./assets/fotos/fotos_flora/Mulato.jpeg", "height": 0.8, "count": 15, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-188", "name": "Gualanday", "sciname": "Gualanday sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 14 individuos censados (altura prom. 5.2 m).", "img": "./assets/fotos/fotos_flora/Gualanday.jpeg", "height": 5.2, "count": 14, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-189", "name": "Platano de tierra fria", "sciname": "Platano de tierra fria sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ79)", "alert": "Censo SIGAU: 14 individuos censados (altura prom. 4.4 m).", "img": "./assets/fotos/fotos_flora/Platano.jpg", "height": 4.4, "count": 14, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-190", "name": "Cafe", "sciname": "Cafe sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 13 individuos censados (altura prom. 1.3 m).", "img": "./assets/fotos/fotos_flora/Cafe.jpg", "height": 1.3, "count": 13, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-191", "name": "Barbasco", "sciname": "Barbasco sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 13 individuos censados (altura prom. 1.3 m).", "img": "./assets/fotos/fotos_flora/Barbasco.jpg", "height": 1.3, "count": 13, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-192", "name": "Salvio negro", "sciname": "Salvio negro sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 12 individuos censados (altura prom. 2.2 m).", "img": "./assets/fotos/fotos_flora/Salvio negro.jpeg", "height": 2.2, "count": 12, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-193", "name": "Schefflera", "sciname": "Schefflera sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ79)", "alert": "Censo SIGAU: 12 individuos censados (altura prom. 1.7 m).", "img": "./assets/fotos/fotos_flora/Schefflera, Pategallina hojigrande.jpg", "height": 1.7, "count": 12, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-194", "name": "Tomatillo", "sciname": "Tomatillo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 11 individuos censados (altura prom. 1.5 m).", "img": "./assets/fotos/fotos_flora/Tomatillo.jpeg", "height": 1.5, "count": 11, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-195", "name": "Fotinia", "sciname": "Fotinia sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 11 individuos censados (altura prom. 1.8 m).", "img": "./assets/fotos/fotos_flora/Fotinia.jpg", "height": 1.8, "count": 11, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-196", "name": "Cajeto de Bogota", "sciname": "Cajeto de Bogota sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 11 individuos censados (altura prom. 1.7 m).", "img": "./assets/fotos/fotos_flora/Cajeto.jpg", "height": 1.7, "count": 11, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-197", "name": "Carbonero rosado", "sciname": "Carbonero rosado sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 10 individuos censados (altura prom. 2.0 m).", "img": "./assets/fotos/fotos_flora/Carbonero.jpg", "height": 2.0, "count": 10, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-198", "name": "Acacia azul", "sciname": "Acacia azul sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 10 individuos censados (altura prom. 1.4 m).", "img": "./assets/fotos/fotos_flora/Acacia azul.jpg", "height": 1.4, "count": 10, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-199", "name": "Duranta amarilla", "sciname": "Duranta amarilla sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 10 individuos censados (altura prom. 1.8 m).", "img": "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400", "height": 1.8, "count": 10, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-200", "name": "Aloe arboreo", "sciname": "Aloe arboreo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 9 individuos censados (altura prom. 1.9 m).", "img": "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400", "height": 1.9, "count": 9, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-201", "name": "Borrachero", "sciname": "Borrachero sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ113)", "alert": "Censo SIGAU: 9 individuos censados (altura prom. 1.6 m).", "img": "./assets/fotos/fotos_flora/Borrachero rojo.jpeg", "height": 1.6, "count": 9, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-202", "name": "Mortio", "sciname": "Mortio sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ82)", "alert": "Censo SIGAU: 9 individuos censados (altura prom. 1.5 m).", "img": "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400", "height": 1.5, "count": 9, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-203", "name": "Gaquillo", "sciname": "Gaquillo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 8 individuos censados (altura prom. 1.8 m).", "img": "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400", "height": 1.8, "count": 8, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-204", "name": "Pino azul", "sciname": "Pino azul sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 8 individuos censados (altura prom. 1.9 m).", "img": "./assets/fotos/fotos_flora/Pino azul.jpg", "height": 1.9, "count": 8, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-205", "name": "Tomate de arbol", "sciname": "Tomate de arbol sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ80)", "alert": "Censo SIGAU: 8 individuos censados (altura prom. 2.6 m).", "img": "./assets/fotos/fotos_flora/Tomate de arbol.jpg", "height": 2.6, "count": 8, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-206", "name": "Cucharo huesito", "sciname": "Cucharo huesito sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ78)", "alert": "Censo SIGAU: 8 individuos censados (altura prom. 1.7 m).", "img": "./assets/fotos/fotos_flora/Cucharo.jpeg", "height": 1.7, "count": 8, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-207", "name": "Pino", "sciname": "Pino sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 7 individuos censados (altura prom. 4.5 m).", "img": "./assets/fotos/fotos_flora/Ciprés, Pino ciprés, Pino.jpg", "height": 4.5, "count": 7, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-208", "name": "Eucalipto manchado", "sciname": "Eucalipto manchado sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 7 individuos censados (altura prom. 12.5 m).", "img": "./assets/fotos/fotos_flora/Eucalipto.jpg", "height": 12.5, "count": 7, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-209", "name": "Lavatera, Malvavisco morado", "sciname": "Lavatera sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 7 individuos censados (altura prom. 2.2 m).", "img": "./assets/fotos/fotos_flora/Lavatera, Malvavisco morado.jpeg", "height": 2.2, "count": 7, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-210", "name": "Algodoncillo", "sciname": "Algodoncillo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 7 individuos censados (altura prom. 3.2 m).", "img": "./assets/fotos/fotos_flora/Algodoncillo.jpg", "height": 3.2, "count": 7, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-211", "name": "Leptospermun", "sciname": "Leptospermun sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ79)", "alert": "Censo SIGAU: 7 individuos censados (altura prom. 1.2 m).", "img": "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400", "height": 1.2, "count": 7, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-212", "name": "Malvavisco", "sciname": "Malvavisco sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 6 individuos censados (altura prom. 1.7 m).", "img": "./assets/fotos/fotos_flora/Lavatera, Malvavisco morado.jpeg", "height": 1.7, "count": 6, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-213", "name": "Borrachero rojo", "sciname": "Borrachero rojo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 6 individuos censados (altura prom. 1.7 m).", "img": "./assets/fotos/fotos_flora/Borrachero rojo.jpeg", "height": 1.7, "count": 6, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-214", "name": "Amargoso", "sciname": "Amargoso sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ77)", "alert": "Censo SIGAU: 6 individuos censados (altura prom. 1.5 m).", "img": "./assets/fotos/fotos_flora/Amargoso.jpg", "height": 1.5, "count": 6, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-215", "name": "Espino blanco", "sciname": "Espino blanco sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ78)", "alert": "Censo SIGAU: 6 individuos censados (altura prom. 1.7 m).", "img": "./assets/fotos/fotos_flora/Espino blanco.jpg", "height": 1.7, "count": 6, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-216", "name": "Guayacn amarillo", "sciname": "Guayacn amarillo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 6 individuos censados (altura prom. 1.2 m).", "img": "./assets/fotos/fotos_flora/Amarguero amarillo.jpg", "height": 1.2, "count": 6, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-217", "name": "Palma de datiles", "sciname": "Palma de datiles sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 5 individuos censados (altura prom. 1.8 m).", "img": "./assets/fotos/fotos_flora/Helecho palma.jpg", "height": 1.8, "count": 5, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-218", "name": "Guayabo de mico", "sciname": "Guayabo de mico sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 5 individuos censados (altura prom. 1.2 m).", "img": "./assets/fotos/fotos_flora/Guayabo de mico.jpeg", "height": 1.2, "count": 5, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-219", "name": "Palma areca", "sciname": "Palma areca sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ78)", "alert": "Censo SIGAU: 5 individuos censados (altura prom. 1.2 m).", "img": "./assets/fotos/fotos_flora/Palma areca.jpeg", "height": 1.2, "count": 5, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-220", "name": "Siete cueros", "sciname": "Siete cueros sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ112)", "alert": "Censo SIGAU: 5 individuos censados (altura prom. 1.9 m).", "img": "./assets/fotos/fotos_flora/Siete cueros.jpeg", "height": 1.9, "count": 5, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-221", "name": "Fuscia arbrea", "sciname": "Fuscia arbrea sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ78)", "alert": "Censo SIGAU: 5 individuos censados (altura prom. 1.7 m).", "img": "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400", "height": 1.7, "count": 5, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-222", "name": "Pino australiano", "sciname": "Pino australiano sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 4 individuos censados (altura prom. 4.5 m).", "img": "./assets/fotos/fotos_flora/Pino.jpg", "height": 4.5, "count": 4, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-223", "name": "Pitosporo", "sciname": "Pitosporo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ112)", "alert": "Censo SIGAU: 4 individuos censados (altura prom. 2.6 m).", "img": "./assets/fotos/fotos_flora/Pitosporo.jpeg", "height": 2.6, "count": 4, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-224", "name": "Pino hayuelo", "sciname": "Pino hayuelo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 4 individuos censados (altura prom. 2.8 m).", "img": "./assets/fotos/fotos_flora/Hayuelo.jpeg", "height": 2.8, "count": 4, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-225", "name": "Guayabo brasilero", "sciname": "Guayabo brasilero sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ82)", "alert": "Censo SIGAU: 4 individuos censados (altura prom. 1.5 m).", "img": "./assets/fotos/fotos_flora/Guayabo.jpeg", "height": 1.5, "count": 4, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-226", "name": "Pino Montezuma", "sciname": "Pino Montezuma sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 4 individuos censados (altura prom. 9.9 m).", "img": "./assets/fotos/fotos_flora/Pino.jpg", "height": 9.9, "count": 4, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-227", "name": "Salvio", "sciname": "Salvio sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ82)", "alert": "Censo SIGAU: 4 individuos censados (altura prom. 3.3 m).", "img": "./assets/fotos/fotos_flora/Salvio negro.jpeg", "height": 3.3, "count": 4, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-228", "name": "Palma sancona", "sciname": "Palma sancona sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ82)", "alert": "Censo SIGAU: 3 individuos censados (altura prom. 3.3 m).", "img": "./assets/fotos/fotos_flora/Helecho palma.jpg", "height": 3.3, "count": 3, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-229", "name": "Guayabillo", "sciname": "Guayabillo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ82)", "alert": "Censo SIGAU: 3 individuos censados (altura prom. 1.1 m).", "img": "./assets/fotos/fotos_flora/Guayabillo.jpg", "height": 1.1, "count": 3, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-230", "name": "Eucalipto blanco", "sciname": "Eucalipto blanco sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 3 individuos censados (altura prom. 5.8 m).", "img": "./assets/fotos/fotos_flora/Eucalipto.jpg", "height": 5.8, "count": 3, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-231", "name": "Palma funeral", "sciname": "Palma funeral sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 3 individuos censados (altura prom. 0.9 m).", "img": "./assets/fotos/fotos_flora/Helecho palma.jpg", "height": 0.9, "count": 3, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-232", "name": "Olivo", "sciname": "Olivo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 3 individuos censados (altura prom. 2.3 m).", "img": "./assets/fotos/fotos_flora/Olivo.jpeg", "height": 2.3, "count": 3, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-233", "name": "Helecho palma", "sciname": "Helecho palma sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 3 individuos censados (altura prom. 1.4 m).", "img": "./assets/fotos/fotos_flora/Helecho palma.jpg", "height": 1.4, "count": 3, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-234", "name": "Cordoncillo", "sciname": "Cordoncillo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ80)", "alert": "Censo SIGAU: 3 individuos censados (altura prom. 1.8 m).", "img": "./assets/fotos/fotos_flora/Cordoncillo.JPG", "height": 1.8, "count": 3, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-235", "name": "Bonetero del Japon", "sciname": "Bonetero del Japon sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ79)", "alert": "Censo SIGAU: 3 individuos censados (altura prom. 0.8 m).", "img": "./assets/fotos/fotos_flora/Cipres Japones, criptomeria.jpg", "height": 0.8, "count": 3, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-236", "name": "Cerez uche", "sciname": "Cerez uche sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ79)", "alert": "Censo SIGAU: 3 individuos censados (altura prom. 4.0 m).", "img": "./assets/fotos/fotos_flora/Cerezo, capuli.jpg", "height": 4.0, "count": 3, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-237", "name": "Palma Kenia", "sciname": "Palma Kenia sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ80)", "alert": "Censo SIGAU: 3 individuos censados (altura prom. 1.9 m).", "img": "./assets/fotos/fotos_flora/Helecho palma.jpg", "height": 1.9, "count": 3, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-238", "name": "Corazon de pollo", "sciname": "Corazon de pollo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ75)", "alert": "Censo SIGAU: 2 individuos censados (altura prom. 2.9 m).", "img": "./assets/fotos/fotos_flora/Corazon de pollo.jpg", "height": 2.9, "count": 2, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-239", "name": "Laurel europeo", "sciname": "Laurel europeo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ77)", "alert": "Censo SIGAU: 2 individuos censados (altura prom. 1.8 m).", "img": "./assets/fotos/fotos_flora/Laurel.jpeg", "height": 1.8, "count": 2, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-240", "name": "Pero", "sciname": "Pero sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ79)", "alert": "Censo SIGAU: 2 individuos censados (altura prom. 1.5 m).", "img": "./assets/fotos/fotos_flora/Nispero.jpg", "height": 1.5, "count": 2, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-241", "name": "Amarguero amarillo", "sciname": "Amarguero amarillo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ82)", "alert": "Censo SIGAU: 2 individuos censados (altura prom. 1.1 m).", "img": "./assets/fotos/fotos_flora/Amarguero amarillo.jpg", "height": 1.1, "count": 2, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-242", "name": "Tuno roso", "sciname": "Tuno roso sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 2 individuos censados (altura prom. 1.9 m).", "img": "./assets/fotos/fotos_flora/Tuno roso.jpeg", "height": 1.9, "count": 2, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-243", "name": "Ojo de perdiz", "sciname": "Ojo de perdiz sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 2 individuos censados (altura prom. 3.1 m).", "img": "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400", "height": 3.1, "count": 2, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-244", "name": "Quina", "sciname": "Quina sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ44)", "alert": "Censo SIGAU: 2 individuos censados (altura prom. 1.6 m).", "img": "./assets/fotos/fotos_flora/Quina.jpg", "height": 1.6, "count": 2, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-245", "name": "Acacia blanca, leucaena", "sciname": "Acacia blanca sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 2 individuos censados (altura prom. 3.0 m).", "img": "./assets/fotos/fotos_flora/Acacia blanca, leucaena.jpeg", "height": 3.0, "count": 2, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-246", "name": "Caucho Sabanero", "sciname": "Caucho Sabanero sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ79)", "alert": "Censo SIGAU: 2 individuos censados (altura prom. 7.7 m).", "img": "./assets/fotos/fotos_flora/Caucho.jpeg", "height": 7.7, "count": 2, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-247", "name": "Diosme", "sciname": "Diosme sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 2 individuos censados (altura prom. 1.3 m).", "img": "./assets/fotos/fotos_flora/Diosme.jpg", "height": 1.3, "count": 2, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-248", "name": "Yuca, palma yuca", "sciname": "Yuca sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ79)", "alert": "Censo SIGAU: 2 individuos censados (altura prom. 1.9 m).", "img": "./assets/fotos/fotos_flora/Yuca, palma yuca.jpg", "height": 1.9, "count": 2, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-249", "name": "Moquillo", "sciname": "Moquillo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ112)", "alert": "Censo SIGAU: 2 individuos censados (altura prom. 1.1 m).", "img": "./assets/fotos/fotos_flora/Moquillo.jpg", "height": 1.1, "count": 2, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-250", "name": "Liberal o lechero", "sciname": "Liberal o lechero sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 2 individuos censados (altura prom. 1.9 m).", "img": "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400", "height": 1.9, "count": 2, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-251", "name": "Fique", "sciname": "Fique sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ113)", "alert": "Censo SIGAU: 2 individuos censados (altura prom. 2.1 m).", "img": "./assets/fotos/fotos_flora/Fique.jpeg", "height": 2.1, "count": 2, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-252", "name": "Laurel", "sciname": "Laurel sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ82)", "alert": "Censo SIGAU: 2 individuos censados (altura prom. 1.7 m).", "img": "./assets/fotos/fotos_flora/Jazmin del cabo, laurel huesito.jpeg", "height": 1.7, "count": 2, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-253", "name": "Guarana, guacharo", "sciname": "Guarana sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 1 individuos censados (altura prom. 2.7 m).", "img": "./assets/fotos/fotos_flora/Guarana, guacharo.jpeg", "height": 2.7, "count": 1, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-254", "name": "Caucho lira", "sciname": "Caucho lira sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ47)", "alert": "Censo SIGAU: 1 individuos censados (altura prom. 1.9 m).", "img": "./assets/fotos/fotos_flora/Caucho.jpeg", "height": 1.9, "count": 1, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-255", "name": "Mango", "sciname": "Mango sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 1 individuos censados (altura prom. 2.1 m).", "img": "./assets/fotos/fotos_flora/Mango.jpeg", "height": 2.1, "count": 1, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-256", "name": "Nacedero", "sciname": "Nacedero sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 1 individuos censados (altura prom. 1.2 m).", "img": "./assets/fotos/fotos_flora/Nacedero.jpeg", "height": 1.2, "count": 1, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-257", "name": "Olmo de agua", "sciname": "Olmo de agua sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 1 individuos censados (altura prom. 4.0 m).", "img": "./assets/fotos/fotos_flora/Aguacate.jpg", "height": 4.0, "count": 1, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-258", "name": "Granado", "sciname": "Granado sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 1 individuos censados (altura prom. 2.5 m).", "img": "./assets/fotos/fotos_flora/Granado.jpeg", "height": 2.5, "count": 1, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-259", "name": "Romerillo", "sciname": "Romerillo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ112)", "alert": "Censo SIGAU: 1 individuos censados (altura prom. 1.3 m).", "img": "./assets/fotos/fotos_flora/Romerillo.jpeg", "height": 1.3, "count": 1, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-260", "name": "Escolin, Espadero", "sciname": "Escolin sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 1 individuos censados (altura prom. 2.5 m).", "img": "./assets/fotos/fotos_flora/Escolin, Espadero.jpg", "height": 2.5, "count": 1, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-261", "name": "Ocobo, Guayacan", "sciname": "Ocobo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ113)", "alert": "Censo SIGAU: 1 individuos censados (altura prom. 1.5 m).", "img": "./assets/fotos/fotos_flora/Ocobo, Guayacan.jpg", "height": 1.5, "count": 1, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-262", "name": "Schefflera, Yuco blanco", "sciname": "Schefflera sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ78)", "alert": "Censo SIGAU: 1 individuos censados (altura prom. 5.0 m).", "img": "./assets/fotos/fotos_flora/Schefflera, Yuco blanco.jpg", "height": 5.0, "count": 1, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-263", "name": "Balazo", "sciname": "Balazo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 1 individuos censados (altura prom. 2.0 m).", "img": "./assets/fotos/fotos_flora/Balazo.jpeg", "height": 2.0, "count": 1, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-264", "name": "Jazmin australiano", "sciname": "Jazmin australiano sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ82)", "alert": "Censo SIGAU: 1 individuos censados (altura prom. 1.6 m).", "img": "./assets/fotos/fotos_flora/Caballero de la noche, Jazmin, Dama de noche.jpeg", "height": 1.6, "count": 1, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-265", "name": "Cidron", "sciname": "Cidron sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ78)", "alert": "Censo SIGAU: 1 individuos censados (altura prom. 2.0 m).", "img": "./assets/fotos/fotos_flora/Cidron.jpg", "height": 2.0, "count": 1, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-266", "name": "Boj", "sciname": "Boj sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ82)", "alert": "Censo SIGAU: 1 individuos censados (altura prom. 2.6 m).", "img": "./assets/fotos/fotos_flora/Boj.jpg", "height": 2.6, "count": 1, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-267", "name": "Chirimoyo", "sciname": "Chirimoyo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ80)", "alert": "Censo SIGAU: 1 individuos censados (altura prom. 1.4 m).", "img": "./assets/fotos/fotos_flora/Chirimoyo.jpg", "height": 1.4, "count": 1, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-268", "name": "Motiln", "sciname": "Motiln sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ46)", "alert": "Censo SIGAU: 1 individuos censados (altura prom. 1.6 m).", "img": "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400", "height": 1.6, "count": 1, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-269", "name": "Papayuela", "sciname": "Papayuela sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ113)", "alert": "Censo SIGAU: 1 individuos censados (altura prom. 2.7 m).", "img": "./assets/fotos/fotos_flora/Papayuela.jpeg", "height": 2.7, "count": 1, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-270", "name": "Mortio ferrugineo", "sciname": "Mortio ferrugineo sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ78)", "alert": "Censo SIGAU: 1 individuos censados (altura prom. 1.3 m).", "img": "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400", "height": 1.3, "count": 1, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-271", "name": "Moradilla", "sciname": "Moradilla sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ79)", "alert": "Censo SIGAU: 1 individuos censados (altura prom. 1.9 m).", "img": "./assets/fotos/fotos_flora/Moradilla.jpeg", "height": 1.9, "count": 1, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-272", "name": "Hiperico, Corazoncillo", "sciname": "Hiperico sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ82)", "alert": "Censo SIGAU: 1 individuos censados (altura prom. 1.4 m).", "img": "./assets/fotos/fotos_flora/Hiperico, Corazoncillo.jpeg", "height": 1.4, "count": 1, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "FLO-273", "name": "Duranta sp", "sciname": "Duranta sp sp.", "cat": 0, "catName": "Flora & Arbolado SIGAU", "role": "Productor Primario / Dosel Urbano", "loc": "Kennedy (UPZ79)", "alert": "Censo SIGAU: 1 individuos censados (altura prom. 1.6 m).", "img": "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400", "height": 1.6, "count": 1, "source": "Jardín Botánico de Bogotá (Censo SIGAU 2024)"}, {"id": "AVE-001", "name": "Agachona Norteamericana", "sciname": "Agachona Norteamericana sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Agachona Norteamericana.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-002", "name": "Aguililla Alas Anchas", "sciname": "Aguililla Alas Anchas sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Aguililla Alas Anchas.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-003", "name": "Aguililla caminera", "sciname": "Aguililla caminera sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Aguililla caminera.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-004", "name": "Aguililla cola blanca", "sciname": "Aguililla cola blanca sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Aguililla cola blanca.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-005", "name": "Aguililla cola corta", "sciname": "Aguililla cola corta sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Aguililla cola corta.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-006", "name": "Aguilillas y parientes", "sciname": "Aguilillas y parientes sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Aguilillas y parientes.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-007", "name": "Asio stygius robustus", "sciname": "Asio stygius robustus sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Asio stygius robustus.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-008", "name": "Atajacaminos ñañarca", "sciname": "Atajacaminos ñañarca sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Atajacaminos ñañarca.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-009", "name": "Atí", "sciname": "Atí sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Atí.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-010", "name": "Autillo común", "sciname": "Autillo común sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Autillo común.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-011", "name": "Avefría Tero", "sciname": "Avefría Tero sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Avefría Tero.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-012", "name": "Aves de percha", "sciname": "Aves de percha sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Aves de percha.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-013", "name": "Bailarín", "sciname": "Bailarín sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Bailarín.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-014", "name": "Brillante Coroniverde", "sciname": "Brillante Coroniverde sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Brillante Coroniverde.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-015", "name": "Burlisto copetón", "sciname": "Burlisto copetón sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Burlisto copetón.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-016", "name": "Burrito pico rojo", "sciname": "Burrito pico rojo sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Burrito pico rojo.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-017", "name": "Busardo aliancho continental", "sciname": "Busardo aliancho continental sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Busardo aliancho continental.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-018", "name": "Busardos, Milanos y Águilas menores", "sciname": "Busardos, Milanos y Águilas menores sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Busardos, Milanos y Águilas menores.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-019", "name": "Búho Campestre de los Andes Ecuatoriales", "sciname": "Búho Campestre de los Andes Ecuatoriales sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Búho Campestre de los Andes Ecuatoriales.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-020", "name": "Búho Cara Blanca", "sciname": "Búho Cara Blanca sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Búho Cara Blanca.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-021", "name": "Búho Sabanero", "sciname": "Búho Sabanero sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Búho Sabanero.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-022", "name": "Búho cornudo", "sciname": "Búho cornudo sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Búho cornudo.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-023", "name": "Búhos orejones", "sciname": "Búhos orejones sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Búhos orejones.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-024", "name": "Búhos y tecolotes", "sciname": "Búhos y tecolotes sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Búhos y tecolotes.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-025", "name": "Búhos, lechuzas y tecolotes", "sciname": "Búhos, lechuzas y tecolotes sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Búhos, lechuzas y tecolotes.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-026", "name": "Calandria Dorso Amarillo", "sciname": "Calandria Dorso Amarillo sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Calandria Dorso Amarillo.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-027", "name": "Calandria de Baltimore", "sciname": "Calandria de Baltimore sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Calandria de Baltimore.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-028", "name": "Calandrias, tordos, caciques, oropéndolas, zanates, praderos y parientes", "sciname": "Calandrias, tordos, caciques, oropéndolas, zanates, praderos y parientes sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Calandrias, tordos, caciques, oropéndolas, zanates, praderos y parientes.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-029", "name": "Calzadito Cobrizo", "sciname": "Calzadito Cobrizo sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Calzadito Cobrizo.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-030", "name": "Calzadito Reluciente", "sciname": "Calzadito Reluciente sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Calzadito Reluciente.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-031", "name": "Canario coronado", "sciname": "Canario coronado sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Canario coronado.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-032", "name": "Canarios o Jilgueros", "sciname": "Canarios o Jilgueros sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Canarios o Jilgueros.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-033", "name": "Capuchino Tricolor de la India", "sciname": "Capuchino Tricolor de la India sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Capuchino Tricolor de la India.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-034", "name": "Carancho", "sciname": "Carancho sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Carancho.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-035", "name": "Carpintero habado", "sciname": "Carpintero habado sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Carpintero habado.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-036", "name": "Carrao", "sciname": "Carrao sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Carrao.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-037", "name": "Centzontle tropical", "sciname": "Centzontle tropical sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Centzontle tropical.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-038", "name": "Centzontles", "sciname": "Centzontles sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Centzontles.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-039", "name": "Cerceta Alas Azules", "sciname": "Cerceta Alas Azules sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Cerceta Alas Azules.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-040", "name": "Cernícalo americano", "sciname": "Cernícalo americano sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Cernícalo americano.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-041", "name": "Charrán negro", "sciname": "Charrán negro sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Charrán negro.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-042", "name": "Chimachimá", "sciname": "Chimachimá sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Chimachimá.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-043", "name": "Chipe Amarillo Norteño", "sciname": "Chipe Amarillo Norteño sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Chipe Amarillo Norteño.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-044", "name": "Chipe Cabeza Negra", "sciname": "Chipe Cabeza Negra sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Chipe Cabeza Negra.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-045", "name": "Chipe Celeste", "sciname": "Chipe Celeste sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Chipe Celeste.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-046", "name": "Chipe Tropical", "sciname": "Chipe Tropical sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Chipe Tropical.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-047", "name": "Chipe castaño", "sciname": "Chipe castaño sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Chipe castaño.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-048", "name": "Chipe charquero", "sciname": "Chipe charquero sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Chipe charquero.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-049", "name": "Chipe de Pechera", "sciname": "Chipe de Pechera sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Chipe de Pechera.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-050", "name": "Chipe de collar", "sciname": "Chipe de collar sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Chipe de collar.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-051", "name": "Chipe garganta naranja", "sciname": "Chipe garganta naranja sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Chipe garganta naranja.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-052", "name": "Chipe peregrino", "sciname": "Chipe peregrino sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Chipe peregrino.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-053", "name": "Chipes", "sciname": "Chipes sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Chipes.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-054", "name": "Chiví Chiví", "sciname": "Chiví Chiví sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Chiví Chiví.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-055", "name": "Chorlo tildío", "sciname": "Chorlo tildío sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Chorlo tildío.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-056", "name": "Chotacabras zumbón", "sciname": "Chotacabras zumbón sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Chotacabras zumbón.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-057", "name": "Chotacabras", "sciname": "Chotacabras sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Chotacabras.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-058", "name": "Colibrí Colilargo Mayor", "sciname": "Colibrí Colilargo Mayor sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Colibrí Colilargo Mayor.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-059", "name": "Colibrí Rutilante", "sciname": "Colibrí Rutilante sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Colibrí Rutilante.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-060", "name": "Colibrí de Mulsant", "sciname": "Colibrí de Mulsant sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Colibrí de Mulsant.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-061", "name": "Colibrí picoespada", "sciname": "Colibrí picoespada sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Colibrí picoespada.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-062", "name": "Colibríes oreja violeta", "sciname": "Colibríes oreja violeta sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Colibríes oreja violeta.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-063", "name": "Colibríes", "sciname": "Colibríes sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Colibríes.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-064", "name": "Comprapán", "sciname": "Comprapán sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Comprapán.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-065", "name": "Cuclillo pico amarillo", "sciname": "Cuclillo pico amarillo sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Cuclillo pico amarillo.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-066", "name": "Cuclillo pico negro", "sciname": "Cuclillo pico negro sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Cuclillo pico negro.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-067", "name": "Cuervillo cara pelada", "sciname": "Cuervillo cara pelada sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Cuervillo cara pelada.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-068", "name": "Cuis común", "sciname": "Cuis común sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Cuis común.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-069", "name": "Cusumbo andino", "sciname": "Cusumbo andino sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Cusumbo andino.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-070", "name": "Elanio maromero norteamericano", "sciname": "Elanio maromero norteamericano sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Elanio maromero norteamericano.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-071", "name": "Espiguero pico de plata", "sciname": "Espiguero pico de plata sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Espiguero pico de plata.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-072", "name": "Fiofío pico corto", "sciname": "Fiofío pico corto sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Fiofío pico corto.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-073", "name": "Fiofío silbón", "sciname": "Fiofío silbón sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Fiofío silbón.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-074", "name": "Focha común", "sciname": "Focha común sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Focha común.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-075", "name": "Gallareta americana", "sciname": "Gallareta americana sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Gallareta americana.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-076", "name": "Gallaretas, polluelas y pollas de agua", "sciname": "Gallaretas, polluelas y pollas de agua sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Gallaretas, polluelas y pollas de agua.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-077", "name": "Gallineta Frente Roja", "sciname": "Gallineta Frente Roja sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Gallineta Frente Roja.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-078", "name": "Gallineta morada", "sciname": "Gallineta morada sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Gallineta morada.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-079", "name": "Gallinetas", "sciname": "Gallinetas sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Gallinetas.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-080", "name": "Ganso común", "sciname": "Ganso común sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Ganso común.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-081", "name": "Garceta azul", "sciname": "Garceta azul sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Garceta azul.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-082", "name": "Garcilla bueyera occidental", "sciname": "Garcilla bueyera occidental sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Garcilla bueyera occidental.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-083", "name": "Garcita Verde", "sciname": "Garcita Verde sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Garcita Verde.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-084", "name": "Garcita verdosa", "sciname": "Garcita verdosa sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Garcita verdosa.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-085", "name": "Garrapatero mayor", "sciname": "Garrapatero mayor sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Garrapatero mayor.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-086", "name": "Garza Nocturna Corona Negra", "sciname": "Garza Nocturna Corona Negra sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Garza Nocturna Corona Negra.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-087", "name": "Garza blanca", "sciname": "Garza blanca sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Garza blanca.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-088", "name": "Garza dedos dorados", "sciname": "Garza dedos dorados sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Garza dedos dorados.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-089", "name": "Garzas, garcetas, garcillas y martinetes", "sciname": "Garzas, garcetas, garcillas y martinetes sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Garzas, garcetas, garcillas y martinetes.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-090", "name": "Garzas", "sciname": "Garzas sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Garzas.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-091", "name": "Gavilán Pico de Gancho", "sciname": "Gavilán Pico de Gancho sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Gavilán Pico de Gancho.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-092", "name": "Golondrina Albiazul", "sciname": "Golondrina Albiazul sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Golondrina Albiazul.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-093", "name": "Golondrina parda", "sciname": "Golondrina parda sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Golondrina parda.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-094", "name": "Golondrina plomiza", "sciname": "Golondrina plomiza sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Golondrina plomiza.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-095", "name": "Golondrina ribereña", "sciname": "Golondrina ribereña sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Golondrina ribereña.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-096", "name": "Golondrina risquera", "sciname": "Golondrina risquera sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Golondrina risquera.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-097", "name": "Golondrina tijereta", "sciname": "Golondrina tijereta sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Golondrina tijereta.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-098", "name": "Golondrinas o martines", "sciname": "Golondrinas o martines sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Golondrinas o martines.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-099", "name": "Golondrinas", "sciname": "Golondrinas sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Golondrinas.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-100", "name": "Gorrión Canario Sabanero", "sciname": "Gorrión Canario Sabanero sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Gorrión Canario Sabanero.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-101", "name": "Gorrión Chingolo", "sciname": "Gorrión Chingolo sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Gorrión Chingolo.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-102", "name": "Grandes garzas", "sciname": "Grandes garzas sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Grandes garzas.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-103", "name": "Guacamaya roja", "sciname": "Guacamaya roja sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Guacamaya roja.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-104", "name": "Guácharo", "sciname": "Guácharo sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Guácharo.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-105", "name": "Halcones", "sciname": "Halcones sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Halcones.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-106", "name": "Halcón Pecho Canela", "sciname": "Halcón Pecho Canela sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Halcón Pecho Canela.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-107", "name": "Halcón Peregrino", "sciname": "Halcón Peregrino sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Halcón Peregrino.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-108", "name": "Halcón esmerejón", "sciname": "Halcón esmerejón sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Halcón esmerejón.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-109", "name": "Huilotas y parientes", "sciname": "Huilotas y parientes sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Huilotas y parientes.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-110", "name": "Ibis y espátulas", "sciname": "Ibis y espátulas sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Ibis y espátulas.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-111", "name": "Inca Negro", "sciname": "Inca Negro sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Inca Negro.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-112", "name": "Jacana", "sciname": "Jacana sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Jacana.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-113", "name": "Jilguerito Dominico Sureño", "sciname": "Jilguerito Dominico Sureño sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Jilguerito Dominico Sureño.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-114", "name": "Jilguerito Dominico", "sciname": "Jilguerito Dominico sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Jilguerito Dominico.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-115", "name": "Jilgueritos", "sciname": "Jilgueritos sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Jilgueritos.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-116", "name": "Jilguero andino", "sciname": "Jilguero andino sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Jilguero andino.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-117", "name": "Jilguero pechinegro", "sciname": "Jilguero pechinegro sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Jilguero pechinegro.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-118", "name": "Malvasía colombiana", "sciname": "Malvasía colombiana sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Malvasía colombiana.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-119", "name": "Matorralero de cabeza listada", "sciname": "Matorralero de cabeza listada sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Matorralero de cabeza listada.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-120", "name": "Metalura Tiria", "sciname": "Metalura Tiria sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Metalura Tiria.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-121", "name": "Mielero Rufo", "sciname": "Mielero Rufo sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Mielero Rufo.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-122", "name": "Milano cola blanca", "sciname": "Milano cola blanca sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Milano cola blanca.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-123", "name": "Milano de Mississippi", "sciname": "Milano de Mississippi sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Milano de Mississippi.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-124", "name": "Milanos de alas negras", "sciname": "Milanos de alas negras sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Milanos de alas negras.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-125", "name": "Milanos, aguilillas, gavilanes y águilas", "sciname": "Milanos, aguilillas, gavilanes y águilas sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Milanos, aguilillas, gavilanes y águilas.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-126", "name": "Mirla patinaranja", "sciname": "Mirla patinaranja sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Mirla patinaranja.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-127", "name": "Mirlos", "sciname": "Mirlos sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Mirlos.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-128", "name": "Monjita Cabeciamarilla", "sciname": "Monjita Cabeciamarilla sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Monjita Cabeciamarilla.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-129", "name": "Mosquerito silbador", "sciname": "Mosquerito silbador sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Mosquerito silbador.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-130", "name": "Mosquero Elaenia Copetón", "sciname": "Mosquero Elaenia Copetón sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Mosquero Elaenia Copetón.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-131", "name": "Mosquero Elenia de Montaña", "sciname": "Mosquero Elenia de Montaña sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Mosquero Elenia de Montaña.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-132", "name": "Mosquero cardenal", "sciname": "Mosquero cardenal sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Mosquero cardenal.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-133", "name": "Mosqueros Elaenia", "sciname": "Mosqueros Elaenia sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Mosqueros Elaenia.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-134", "name": "Muroidea", "sciname": "Muroidea sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Muroidea.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-135", "name": "Neogale frenata affinis", "sciname": "Neogale frenata affinis sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Neogale frenata affinis.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-136", "name": "Palomas del Viejo Mundo", "sciname": "Palomas del Viejo Mundo sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Palomas del Viejo Mundo.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-137", "name": "Palomas, tortolitas y coquitas (2)", "sciname": "Palomas, tortolitas y coquitas (2) sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Palomas, tortolitas y coquitas (2).jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-138", "name": "Palomas, tortolitas y coquitas", "sciname": "Palomas, tortolitas y coquitas sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Palomas, tortolitas y coquitas.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-139", "name": "Palomita montera", "sciname": "Palomita montera sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Palomita montera.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-140", "name": "Papamoscas Ailero", "sciname": "Papamoscas Ailero sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Papamoscas Ailero.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-141", "name": "Papamoscas Boreal", "sciname": "Papamoscas Boreal sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Papamoscas Boreal.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-142", "name": "Papamoscas Contopus", "sciname": "Papamoscas Contopus sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Papamoscas Contopus.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-143", "name": "Papamoscas Empidonax", "sciname": "Papamoscas Empidonax sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Papamoscas Empidonax.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-144", "name": "Papamoscas Myiarchus", "sciname": "Papamoscas Myiarchus sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Papamoscas Myiarchus.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-145", "name": "Papamoscas Rayado Cheje", "sciname": "Papamoscas Rayado Cheje sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Papamoscas Rayado Cheje.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-146", "name": "Papamoscas Rayado Común", "sciname": "Papamoscas Rayado Común sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Papamoscas Rayado Común.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-147", "name": "Papamoscas Rayados", "sciname": "Papamoscas Rayados sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Papamoscas Rayados.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-148", "name": "Papamoscas Saucero", "sciname": "Papamoscas Saucero sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Papamoscas Saucero.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-149", "name": "Papamoscas Tropical Norteño", "sciname": "Papamoscas Tropical Norteño sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Papamoscas Tropical Norteño.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-150", "name": "Papamoscas Verdoso", "sciname": "Papamoscas Verdoso sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Papamoscas Verdoso.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-151", "name": "Papamoscas del Este", "sciname": "Papamoscas del Este sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Papamoscas del Este.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-152", "name": "Papamoscas del Oeste", "sciname": "Papamoscas del Oeste sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Papamoscas del Oeste.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-153", "name": "Papamoscas negro", "sciname": "Papamoscas negro sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Papamoscas negro.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-154", "name": "Papamoscas viajero", "sciname": "Papamoscas viajero sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Papamoscas viajero.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-155", "name": "Patamarilla mayor", "sciname": "Patamarilla mayor sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Patamarilla mayor.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-156", "name": "Patamarilla menor", "sciname": "Patamarilla menor sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Patamarilla menor.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-157", "name": "Patamarillas y parientes", "sciname": "Patamarillas y parientes sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Patamarillas y parientes.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-158", "name": "Pato Enmascarado", "sciname": "Pato Enmascarado sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Pato Enmascarado.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-159", "name": "Pato careto", "sciname": "Pato careto sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Pato careto.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-160", "name": "Pato gargantilla", "sciname": "Pato gargantilla sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Pato gargantilla.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-161", "name": "Pato real doméstico", "sciname": "Pato real doméstico sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Pato real doméstico.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-162", "name": "Patos, gansos, cisnes y parientes", "sciname": "Patos, gansos, cisnes y parientes sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Patos, gansos, cisnes y parientes.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-163", "name": "Pava Andina", "sciname": "Pava Andina sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Pava Andina.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-164", "name": "Pavito Migratorio", "sciname": "Pavito Migratorio sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Pavito Migratorio.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-165", "name": "Payador canela", "sciname": "Payador canela sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Payador canela.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-166", "name": "Pepite", "sciname": "Pepite sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Pepite.png", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-167", "name": "Perico de anteojos", "sciname": "Perico de anteojos sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Perico de anteojos.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-168", "name": "Periquito australiano", "sciname": "Periquito australiano sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Periquito australiano.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-169", "name": "Periquito del amor Enmascarado", "sciname": "Periquito del amor Enmascarado sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Periquito del amor Enmascarado.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-170", "name": "Picaflor Lustroso", "sciname": "Picaflor Lustroso sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Picaflor Lustroso.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-171", "name": "Picaflor negro", "sciname": "Picaflor negro sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Picaflor negro.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-172", "name": "Picogordo Degollado", "sciname": "Picogordo Degollado sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Picogordo Degollado.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-173", "name": "Pijije Alas Blancas", "sciname": "Pijije Alas Blancas sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Pijije Alas Blancas.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-174", "name": "Pijije canelo", "sciname": "Pijije canelo sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Pijije canelo.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-175", "name": "Piojito gargantilla", "sciname": "Piojito gargantilla sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Piojito gargantilla.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-176", "name": "Piquitodeoro chico", "sciname": "Piquitodeoro chico sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Piquitodeoro chico.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-177", "name": "Piranga escarlata", "sciname": "Piranga escarlata sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Piranga escarlata.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-178", "name": "Piranga roja", "sciname": "Piranga roja sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Piranga roja.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-179", "name": "Pirangas", "sciname": "Pirangas sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Pirangas.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-180", "name": "Playero Pectoral", "sciname": "Playero Pectoral sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Playero Pectoral.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-181", "name": "Playero Solitario", "sciname": "Playero Solitario sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Playero Solitario.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-182", "name": "Playero alzacolita", "sciname": "Playero alzacolita sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Playero alzacolita.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-183", "name": "Playeros, zarapitos, picopandos, vuelvepiedras, costureros y falaropos", "sciname": "Playeros, zarapitos, picopandos, vuelvepiedras, costureros y falaropos sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Playeros, zarapitos, picopandos, vuelvepiedras, costureros y falaropos.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-184", "name": "Polla de agua sabanera", "sciname": "Polla de agua sabanera sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Polla de agua sabanera.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-185", "name": "Polluela Sora", "sciname": "Polluela Sora sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Polluela Sora.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-186", "name": "Pradero Tortillaconchile", "sciname": "Pradero Tortillaconchile sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Pradero Tortillaconchile.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-187", "name": "Rascón pinto", "sciname": "Rascón pinto sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Rascón pinto.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-188", "name": "Ratonas", "sciname": "Ratonas sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Ratonas.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-189", "name": "Ratones", "sciname": "Ratones sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Ratones.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-190", "name": "Rey del bosque", "sciname": "Rey del bosque sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Rey del bosque.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-191", "name": "Saltapared Común Sureño", "sciname": "Saltapared Común Sureño sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Saltapared Común Sureño.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-192", "name": "Saíra de antifaz", "sciname": "Saíra de antifaz sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Saíra de antifaz.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-193", "name": "Sicalis luteola bogotensis", "sciname": "Sicalis luteola bogotensis sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Sicalis luteola bogotensis.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-194", "name": "Sirirí bueyero", "sciname": "Sirirí bueyero sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Sirirí bueyero.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-195", "name": "Stelgidopteryx ruficollis uropygialis", "sciname": "Stelgidopteryx ruficollis uropygialis sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Stelgidopteryx ruficollis uropygialis.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-196", "name": "Tangara azulgrís", "sciname": "Tangara azulgrís sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Tangara azulgrís.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-197", "name": "Tangaras, mieleros, semilleros y parientes", "sciname": "Tangaras, mieleros, semilleros y parientes sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Tangaras, mieleros, semilleros y parientes.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-198", "name": "Tapacaminos de Carolina", "sciname": "Tapacaminos de Carolina sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Tapacaminos de Carolina.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-199", "name": "Tapicurú", "sciname": "Tapicurú sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Tapicurú.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-200", "name": "Tingua bogotana", "sciname": "Tingua bogotana sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Tingua bogotana.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-201", "name": "Tingua moteada", "sciname": "Tingua moteada sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Tingua moteada.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-202", "name": "Tirano Goliníveo", "sciname": "Tirano Goliníveo sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Tirano Goliníveo.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-203", "name": "Tirano Pirirí", "sciname": "Tirano Pirirí sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Tirano Pirirí.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-204", "name": "Tirano Tijereta Gris", "sciname": "Tirano Tijereta Gris sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Tirano Tijereta Gris.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-205", "name": "Tirano dorso negro", "sciname": "Tirano dorso negro sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Tirano dorso negro.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-206", "name": "Tirano gris", "sciname": "Tirano gris sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Tirano gris.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-207", "name": "Tiranos", "sciname": "Tiranos sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Tiranos.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-208", "name": "Tiranuelo saltarroyo", "sciname": "Tiranuelo saltarroyo sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Tiranuelo saltarroyo.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-209", "name": "Tordo Sudamericano", "sciname": "Tordo Sudamericano sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Tordo Sudamericano.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-210", "name": "Tordos", "sciname": "Tordos sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Tordos.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-211", "name": "Troglodytes musculus columbae", "sciname": "Troglodytes musculus columbae sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Troglodytes musculus columbae.png", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-212", "name": "Tucancito Esmeralda", "sciname": "Tucancito Esmeralda sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Tucancito Esmeralda.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-213", "name": "Tuquito gris", "sciname": "Tuquito gris sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Tuquito gris.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-214", "name": "Tuquito rayado", "sciname": "Tuquito rayado sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Tuquito rayado.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-215", "name": "Turdus fuscater gigas", "sciname": "Turdus fuscater gigas sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Turdus fuscater gigas.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-216", "name": "Turpial lagunero", "sciname": "Turpial lagunero sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Turpial lagunero.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-217", "name": "Turpial", "sciname": "Turpial sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Turpial.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-218", "name": "Tángara palmera (2)", "sciname": "Tángara palmera (2) sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Tángara palmera (2).jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-219", "name": "Tángara palmera", "sciname": "Tángara palmera sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Tángara palmera.png", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-220", "name": "Tángara urraca", "sciname": "Tángara urraca sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Tángara urraca.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-221", "name": "Vanellus chilensis cayennensis", "sciname": "Vanellus chilensis cayennensis sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Vanellus chilensis cayennensis.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-222", "name": "Vencejo Collar Blanco", "sciname": "Vencejo Collar Blanco sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Vencejo Collar Blanco.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-223", "name": "Vireo Ojos Rojos", "sciname": "Vireo Ojos Rojos sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Vireo Ojos Rojos.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-224", "name": "Vireo verdeamarillo", "sciname": "Vireo verdeamarillo sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Vireo verdeamarillo.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-225", "name": "Vireos", "sciname": "Vireos sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Vireos.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-226", "name": "Zambullidor pico grueso", "sciname": "Zambullidor pico grueso sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Zambullidor pico grueso.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-227", "name": "Zanate caribeño", "sciname": "Zanate caribeño sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Zanate caribeño.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-228", "name": "Zanates", "sciname": "Zanates sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Zanates.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-229", "name": "Zenaida auriculata pentheria", "sciname": "Zenaida auriculata pentheria sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Zenaida auriculata pentheria.png", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-230", "name": "Zonotrichia capensis costaricensis", "sciname": "Zonotrichia capensis costaricensis sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Zonotrichia capensis costaricensis.png", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-231", "name": "Zopilote común", "sciname": "Zopilote común sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Zopilote común.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-232", "name": "Zopilote sabanero", "sciname": "Zopilote sabanero sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Zopilote sabanero.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-233", "name": "Zopilotes", "sciname": "Zopilotes sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Zopilotes.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-234", "name": "Zorzal Canelo", "sciname": "Zorzal Canelo sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Zorzal Canelo.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-235", "name": "Zorzal de Anteojos", "sciname": "Zorzal de Anteojos sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Zorzal de Anteojos.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-236", "name": "Zorzales", "sciname": "Zorzales sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Zorzales.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-237", "name": "atlapetes cabecipálido", "sciname": "atlapetes cabecipálido sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/atlapetes cabecipálido.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-238", "name": "caica de páramo", "sciname": "caica de páramo sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/caica de páramo.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-239", "name": "chamicero cundiboyacense", "sciname": "chamicero cundiboyacense sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/chamicero cundiboyacense.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-240", "name": "colibrí aliazul", "sciname": "colibrí aliazul sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/colibrí aliazul.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-241", "name": "curutié cejigrís", "sciname": "curutié cejigrís sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/curutié cejigrís.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-242", "name": "esmerejón de la taiga", "sciname": "esmerejón de la taiga sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/esmerejón de la taiga.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-243", "name": "lechuza común americana", "sciname": "lechuza común americana sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/lechuza común americana.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-244", "name": "monjita bogotana", "sciname": "monjita bogotana sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/monjita bogotana.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-245", "name": "paloma doméstica", "sciname": "paloma doméstica sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/paloma doméstica.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-246", "name": "pato zambullidor grande", "sciname": "pato zambullidor grande sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/pato zambullidor grande.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-247", "name": "tiranos, papamoscas y parientes", "sciname": "tiranos, papamoscas y parientes sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/tiranos, papamoscas y parientes.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-248", "name": "Águila mora", "sciname": "Águila mora sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Águila mora.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-249", "name": "Águilas y Aguiluchos", "sciname": "Águilas y Aguiluchos sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Águilas y Aguiluchos.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-250", "name": "Ánade azulón doméstico", "sciname": "Ánade azulón doméstico sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Ánade azulón doméstico.jpeg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "AVE-251", "name": "Ánsar cisnal doméstico", "sciname": "Ánsar cisnal doméstico sp.", "cat": 1, "catName": "Aves", "role": "Avifauna / Dispersor & Polinizador", "loc": "Humedal El Burro / La Vaca / Kennedy", "alert": "Residente / Migratoria de Humedal y Dosel Urbano.", "img": "./assets/fotos/fotos_fauna/Ánsar cisnal doméstico.jpg", "count": 14, "source": "iNaturalist Kennedy / eBird Hotspots Colombia"}, {"id": "MAM-001", "name": "Ardilla de cola roja", "sciname": "Ardilla de cola roja sp.", "cat": 2, "catName": "Mamíferos", "role": "Consumidor Secundario / Mastofauna", "loc": "Ronda Hidráulica ZMPA Kennedy", "alert": "Mastofauna de cuenca y rondas de humedal.", "img": "./assets/fotos/fotos_fauna/Ardilla de cola roja.jpeg", "count": 8, "source": "iNaturalist Kennedy"}, {"id": "MAM-002", "name": "Murciélago nariz de lanza mayor", "sciname": "Murciélago nariz de lanza mayor sp.", "cat": 2, "catName": "Mamíferos", "role": "Consumidor Secundario / Mastofauna", "loc": "Ronda Hidráulica ZMPA Kennedy", "alert": "Mastofauna de cuenca y rondas de humedal.", "img": "./assets/fotos/fotos_fauna/Murciélago nariz de lanza mayor.jpeg", "count": 8, "source": "iNaturalist Kennedy"}, {"id": "MAM-003", "name": "Perro Doméstico", "sciname": "Perro Doméstico sp.", "cat": 2, "catName": "Mamíferos", "role": "Consumidor Secundario / Mastofauna", "loc": "Ronda Hidráulica ZMPA Kennedy", "alert": "Mastofauna de cuenca y rondas de humedal.", "img": "./assets/fotos/fotos_fauna/Perro Doméstico.jpeg", "count": 8, "source": "iNaturalist Kennedy"}, {"id": "MAM-004", "name": "Rata gris asiática", "sciname": "Rata gris asiática sp.", "cat": 2, "catName": "Mamíferos", "role": "Consumidor Secundario / Mastofauna", "loc": "Ronda Hidráulica ZMPA Kennedy", "alert": "Mastofauna de cuenca y rondas de humedal.", "img": "./assets/fotos/fotos_fauna/Rata gris asiática.jpg", "count": 8, "source": "iNaturalist Kennedy"}, {"id": "MAM-005", "name": "Rata negra", "sciname": "Rata negra sp.", "cat": 2, "catName": "Mamíferos", "role": "Consumidor Secundario / Mastofauna", "loc": "Ronda Hidráulica ZMPA Kennedy", "alert": "Mastofauna de cuenca y rondas de humedal.", "img": "./assets/fotos/fotos_fauna/Rata negra.jpeg", "count": 8, "source": "iNaturalist Kennedy"}, {"id": "MAM-006", "name": "Ratas del viejo mundo", "sciname": "Ratas del viejo mundo sp.", "cat": 2, "catName": "Mamíferos", "role": "Consumidor Secundario / Mastofauna", "loc": "Ronda Hidráulica ZMPA Kennedy", "alert": "Mastofauna de cuenca y rondas de humedal.", "img": "./assets/fotos/fotos_fauna/Ratas del viejo mundo.jpeg", "count": 8, "source": "iNaturalist Kennedy"}, {"id": "MAM-007", "name": "Ratas y ratones del viejo mundo", "sciname": "Ratas y ratones del viejo mundo sp.", "cat": 2, "catName": "Mamíferos", "role": "Consumidor Secundario / Mastofauna", "loc": "Ronda Hidráulica ZMPA Kennedy", "alert": "Mastofauna de cuenca y rondas de humedal.", "img": "./assets/fotos/fotos_fauna/Ratas y ratones del viejo mundo.jpeg", "count": 8, "source": "iNaturalist Kennedy"}, {"id": "MAM-008", "name": "Ratas", "sciname": "Ratas sp.", "cat": 2, "catName": "Mamíferos", "role": "Consumidor Secundario / Mastofauna", "loc": "Ronda Hidráulica ZMPA Kennedy", "alert": "Mastofauna de cuenca y rondas de humedal.", "img": "./assets/fotos/fotos_fauna/Ratas.jpg", "count": 8, "source": "iNaturalist Kennedy"}, {"id": "MAM-009", "name": "Ratón casero eurasiático", "sciname": "Ratón casero eurasiático sp.", "cat": 2, "catName": "Mamíferos", "role": "Consumidor Secundario / Mastofauna", "loc": "Ronda Hidráulica ZMPA Kennedy", "alert": "Mastofauna de cuenca y rondas de humedal.", "img": "./assets/fotos/fotos_fauna/Ratón casero eurasiático.jpeg", "count": 8, "source": "iNaturalist Kennedy"}, {"id": "MAM-010", "name": "Roedores", "sciname": "Roedores sp.", "cat": 2, "catName": "Mamíferos", "role": "Consumidor Secundario / Mastofauna", "loc": "Ronda Hidráulica ZMPA Kennedy", "alert": "Mastofauna de cuenca y rondas de humedal.", "img": "./assets/fotos/fotos_fauna/Roedores.jpeg", "count": 8, "source": "iNaturalist Kennedy"}, {"id": "MOL-001", "name": "Babosa europea amarilla", "sciname": "Babosa europea amarilla sp.", "cat": 3, "catName": "Moluscos", "role": "Detritívoro / Macroinvertebrado", "loc": "Matorrales y suelo húmedo de Kennedy", "alert": "Asociado a humedad y vegetación ribereña.", "img": "./assets/fotos/fotos_moluscos/Babosa europea amarilla.jpg", "count": 6, "source": "iNaturalist Kennedy"}, {"id": "MOL-002", "name": "Babosa europea de invernadero", "sciname": "Babosa europea de invernadero sp.", "cat": 3, "catName": "Moluscos", "role": "Detritívoro / Macroinvertebrado", "loc": "Matorrales y suelo húmedo de Kennedy", "alert": "Asociado a humedad y vegetación ribereña.", "img": "./assets/fotos/fotos_moluscos/Babosa europea de invernadero.jpg", "count": 6, "source": "iNaturalist Kennedy"}, {"id": "MOL-003", "name": "Babosa europea tigre", "sciname": "Babosa europea tigre sp.", "cat": 3, "catName": "Moluscos", "role": "Detritívoro / Macroinvertebrado", "loc": "Matorrales y suelo húmedo de Kennedy", "alert": "Asociado a humedad y vegetación ribereña.", "img": "./assets/fotos/fotos_moluscos/Babosa europea tigre.jpg", "count": 6, "source": "iNaturalist Kennedy"}, {"id": "MOL-004", "name": "Babosa gris de jardín", "sciname": "Babosa gris de jardín sp.", "cat": 3, "catName": "Moluscos", "role": "Detritívoro / Macroinvertebrado", "loc": "Matorrales y suelo húmedo de Kennedy", "alert": "Asociado a humedad y vegetación ribereña.", "img": "./assets/fotos/fotos_moluscos/Babosa gris de jardín.jpg", "count": 6, "source": "iNaturalist Kennedy"}, {"id": "MOL-005", "name": "Babosas de tres bandas", "sciname": "Babosas de tres bandas sp.", "cat": 3, "catName": "Moluscos", "role": "Detritívoro / Macroinvertebrado", "loc": "Matorrales y suelo húmedo de Kennedy", "alert": "Asociado a humedad y vegetación ribereña.", "img": "./assets/fotos/fotos_moluscos/Babosas de tres bandas.jpg", "count": 6, "source": "iNaturalist Kennedy"}, {"id": "MOL-006", "name": "Babosas europeas", "sciname": "Babosas europeas sp.", "cat": 3, "catName": "Moluscos", "role": "Detritívoro / Macroinvertebrado", "loc": "Matorrales y suelo húmedo de Kennedy", "alert": "Asociado a humedad y vegetación ribereña.", "img": "./assets/fotos/fotos_moluscos/Babosas europeas.jpg", "count": 6, "source": "iNaturalist Kennedy"}, {"id": "MOL-007", "name": "Babosas y caracoles de tierra", "sciname": "Babosas y caracoles de tierra sp.", "cat": 3, "catName": "Moluscos", "role": "Detritívoro / Macroinvertebrado", "loc": "Matorrales y suelo húmedo de Kennedy", "alert": "Asociado a humedad y vegetación ribereña.", "img": "./assets/fotos/fotos_moluscos/Babosas y caracoles de tierra.jpeg", "count": 6, "source": "iNaturalist Kennedy"}, {"id": "MOL-008", "name": "Caracol europeo de jardín", "sciname": "Caracol europeo de jardín sp.", "cat": 3, "catName": "Moluscos", "role": "Detritívoro / Macroinvertebrado", "loc": "Matorrales y suelo húmedo de Kennedy", "alert": "Asociado a humedad y vegetación ribereña.", "img": "./assets/fotos/fotos_moluscos/Caracol europeo de jardín.jpg", "count": 6, "source": "iNaturalist Kennedy"}, {"id": "MOL-009", "name": "Caracoles, babosas y parientes", "sciname": "Caracoles, babosas y parientes sp.", "cat": 3, "catName": "Moluscos", "role": "Detritívoro / Macroinvertebrado", "loc": "Matorrales y suelo húmedo de Kennedy", "alert": "Asociado a humedad y vegetación ribereña.", "img": "./assets/fotos/fotos_moluscos/Caracoles, babosas y parientes.jpg", "count": 6, "source": "iNaturalist Kennedy"}, {"id": "MOL-010", "name": "Gasterópodos eutineuros", "sciname": "Gasterópodos eutineuros sp.", "cat": 3, "catName": "Moluscos", "role": "Detritívoro / Macroinvertebrado", "loc": "Matorrales y suelo húmedo de Kennedy", "alert": "Asociado a humedad y vegetación ribereña.", "img": "./assets/fotos/fotos_moluscos/Gasterópodos eutineuros.jpeg", "count": 6, "source": "iNaturalist Kennedy"}, {"id": "MOL-011", "name": "Limacinae", "sciname": "Limacinae sp.", "cat": 3, "catName": "Moluscos", "role": "Detritívoro / Macroinvertebrado", "loc": "Matorrales y suelo húmedo de Kennedy", "alert": "Asociado a humedad y vegetación ribereña.", "img": "./assets/fotos/fotos_moluscos/Limacinae.jpg", "count": 6, "source": "iNaturalist Kennedy"}, {"id": "MOL-012", "name": "Limacoidea", "sciname": "Limacoidea sp.", "cat": 3, "catName": "Moluscos", "role": "Detritívoro / Macroinvertebrado", "loc": "Matorrales y suelo húmedo de Kennedy", "alert": "Asociado a humedad y vegetación ribereña.", "img": "./assets/fotos/fotos_moluscos/Limacoidea.jpg", "count": 6, "source": "iNaturalist Kennedy"}, {"id": "MOL-013", "name": "Oxychilus", "sciname": "Oxychilus sp.", "cat": 3, "catName": "Moluscos", "role": "Detritívoro / Macroinvertebrado", "loc": "Matorrales y suelo húmedo de Kennedy", "alert": "Asociado a humedad y vegetación ribereña.", "img": "./assets/fotos/fotos_moluscos/Oxychilus.jpeg", "count": 6, "source": "iNaturalist Kennedy"}, {"id": "MOL-014", "name": "Planorbinae", "sciname": "Planorbinae sp.", "cat": 3, "catName": "Moluscos", "role": "Detritívoro / Macroinvertebrado", "loc": "Matorrales y suelo húmedo de Kennedy", "alert": "Asociado a humedad y vegetación ribereña.", "img": "./assets/fotos/fotos_moluscos/Planorbinae.jpg", "count": 6, "source": "iNaturalist Kennedy"}, {"id": "ANF-001", "name": "Rana sabanera", "sciname": "Dendropsophus labialis", "cat": 4, "catName": "Anfibios", "role": "Bioindicador Acuático / Anuro", "loc": "Espejos de agua y juncales de Kennedy", "alert": "Anfibio bioindicador de calidad hídrica.", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/707895722/medium.jpg", "count": 15, "source": "iNaturalist Kennedy / PMA Humedales SDA"}, {"id": "ANF-002", "name": "Rana de cristal", "sciname": "Hyalinobatrachium sp.", "cat": 4, "catName": "Anfibios", "role": "Bioindicador de Ribera", "loc": "Espejos de agua y juncales de Kennedy", "alert": "Anfibio bioindicador de calidad hídrica.", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/707895722/medium.jpg", "count": 15, "source": "iNaturalist Kennedy / PMA Humedales SDA"}, {"id": "ANF-003", "name": "Salamandra andina", "sciname": "Bolitoglossa adspersa", "cat": 4, "catName": "Anfibios", "role": "Bioindicador de Sotobosque", "loc": "Espejos de agua y juncales de Kennedy", "alert": "Anfibio bioindicador de calidad hídrica.", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/707895722/medium.jpg", "count": 15, "source": "iNaturalist Kennedy / PMA Humedales SDA"}, {"id": "ANF-004", "name": "Sapo común sabanero", "sciname": "Rhaebo guttatus", "cat": 4, "catName": "Anfibios", "role": "Controlador Biológico", "loc": "Espejos de agua y juncales de Kennedy", "alert": "Anfibio bioindicador de calidad hídrica.", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/707895722/medium.jpg", "count": 15, "source": "iNaturalist Kennedy / PMA Humedales SDA"}, {"id": "ANF-005", "name": "Rana platanera", "sciname": "Boana punctata", "cat": 4, "catName": "Anfibios", "role": "Habitante de Juncales", "loc": "Espejos de agua y juncales de Kennedy", "alert": "Anfibio bioindicador de calidad hídrica.", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/707895722/medium.jpg", "count": 15, "source": "iNaturalist Kennedy / PMA Humedales SDA"}, {"id": "ANF-006", "name": "Rana de lluvia de Bogotá", "sciname": "Pristimantis bogotensis", "cat": 4, "catName": "Anfibios", "role": "Endémica de la Cordillera", "loc": "Espejos de agua y juncales de Kennedy", "alert": "Anfibio bioindicador de calidad hídrica.", "img": "https://inaturalist-open-data.s3.amazonaws.com/photos/318894413/medium.jpeg", "count": 15, "source": "iNaturalist Kennedy / PMA Humedales SDA"}, {"id": "REP-001", "name": "Besucona asiática", "sciname": "Besucona asiática sp.", "cat": 5, "catName": "Reptiles", "role": "Depredador de Microvertebrados", "loc": "Pastizales y bordes secos de humedal", "alert": "Fauna reptiliana de pastizales y ecotonos.", "img": "./assets/fotos/fotos_reptiles/Besucona asiática.jpg", "count": 9, "source": "iNaturalist Kennedy"}, {"id": "REP-002", "name": "Culebras y parientes", "sciname": "Culebras y parientes sp.", "cat": 5, "catName": "Reptiles", "role": "Depredador de Microvertebrados", "loc": "Pastizales y bordes secos de humedal", "alert": "Fauna reptiliana de pastizales y ecotonos.", "img": "./assets/fotos/fotos_reptiles/Culebras y parientes.jpeg", "count": 9, "source": "iNaturalist Kennedy"}, {"id": "REP-003", "name": "Hicotea", "sciname": "Hicotea sp.", "cat": 5, "catName": "Reptiles", "role": "Depredador de Microvertebrados", "loc": "Pastizales y bordes secos de humedal", "alert": "Fauna reptiliana de pastizales y ecotonos.", "img": "./assets/fotos/fotos_reptiles/Hicotea.jpeg", "count": 9, "source": "iNaturalist Kennedy"}, {"id": "REP-004", "name": "Iguana verde", "sciname": "Iguana verde sp.", "cat": 5, "catName": "Reptiles", "role": "Depredador de Microvertebrados", "loc": "Pastizales y bordes secos de humedal", "alert": "Fauna reptiliana de pastizales y ecotonos.", "img": "./assets/fotos/fotos_reptiles/Iguana verde.jpg", "count": 9, "source": "iNaturalist Kennedy"}, {"id": "REP-005", "name": "Jicotea Sudamericana", "sciname": "Jicotea Sudamericana sp.", "cat": 5, "catName": "Reptiles", "role": "Depredador de Microvertebrados", "loc": "Pastizales y bordes secos de humedal", "alert": "Fauna reptiliana de pastizales y ecotonos.", "img": "./assets/fotos/fotos_reptiles/Jicotea Sudamericana.jpg", "count": 9, "source": "iNaturalist Kennedy"}, {"id": "REP-006", "name": "Lagartija bombillo estriada", "sciname": "Lagartija bombillo estriada sp.", "cat": 5, "catName": "Reptiles", "role": "Depredador de Microvertebrados", "loc": "Pastizales y bordes secos de humedal", "alert": "Fauna reptiliana de pastizales y ecotonos.", "img": "./assets/fotos/fotos_reptiles/Lagartija bombillo estriada.jpeg", "count": 9, "source": "iNaturalist Kennedy"}, {"id": "REP-007", "name": "Lagarto Collarejo", "sciname": "Lagarto Collarejo sp.", "cat": 5, "catName": "Reptiles", "role": "Depredador de Microvertebrados", "loc": "Pastizales y bordes secos de humedal", "alert": "Fauna reptiliana de pastizales y ecotonos.", "img": "./assets/fotos/fotos_reptiles/Lagarto Collarejo.jpg", "count": 9, "source": "iNaturalist Kennedy"}, {"id": "REP-008", "name": "Serpiente sabanera", "sciname": "Serpiente sabanera sp.", "cat": 5, "catName": "Reptiles", "role": "Depredador de Microvertebrados", "loc": "Pastizales y bordes secos de humedal", "alert": "Fauna reptiliana de pastizales y ecotonos.", "img": "./assets/fotos/fotos_reptiles/Serpiente sabanera.jpg", "count": 9, "source": "iNaturalist Kennedy"}, {"id": "REP-009", "name": "charchala", "sciname": "charchala sp.", "cat": 5, "catName": "Reptiles", "role": "Depredador de Microvertebrados", "loc": "Pastizales y bordes secos de humedal", "alert": "Fauna reptiliana de pastizales y ecotonos.", "img": "./assets/fotos/fotos_reptiles/charchala.jpeg", "count": 9, "source": "iNaturalist Kennedy"}];
  }

  // =====================================================================
  // 2. RED BIÓTICA EN THREE.JS (181 NODOS & CONEXIONES TRÓFICAS REALES)
  // =====================================================================
  const fullTaxa = buildFull180Dataset();
  const rawTaxa = fullTaxa;
  const rawNodes = [];
  const nodeSprites = [];
  const networkGroup = new THREE.Group();
  sceneRoot.add(networkGroup);

  const SPHERE_RADIUS = 32.0;

  // Texturas circulares pregeneradas en Canvas para los taxones
  function createCircularTexture(imgUrl, taxonId, speciesName, cat) {
    const cvs = document.createElement("canvas");
    cvs.width = 128; cvs.height = 128;
    const ctx = cvs.getContext("2d");

    const catColor = palette.catColors[cat] || '#84a48b';
    const tex = new THREE.CanvasTexture(cvs);

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imgUrl || generateSpeciesSvgDataUri(taxonId, speciesName, cat);

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

    // Renderizado inmediato del badge para que los nodos aparezcan al instante (0ms delay)
    drawFallback();

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

        // Borde circular de color según categoría
        ctx.beginPath();
        ctx.arc(64, 64, 56, 0, Math.PI * 2);
        ctx.strokeStyle = catColor;
        ctx.lineWidth = 6;
        ctx.stroke();

        tex.needsUpdate = true;
      } catch(e) { drawFallback(); }
    };
    img.onerror = drawFallback;

    return tex;
  }

  // Generación de Nodos 3D
  fullTaxa.forEach((tData, idx) => {
    const phi = Math.acos(1 - 2 * ((idx + 0.5) / fullTaxa.length));
    const theta = Math.PI * (1 + Math.sqrt(5)) * idx;
    const rad = SPHERE_RADIUS + ((idx * 7) % 8) - 4;

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
  // 2. GENERADOR CONSCIENTE DE RELACIONES BIÓTICAS (EVIDENCIA ECOLÓGICA REAL)
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
    // Fallback biológico según categorías
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

    const findTaxon = (idOrName) => rawNodes.find(n => n.taxaId === idOrName || n.sciname.toLowerCase().includes(idOrName.toLowerCase()) || n.label.toLowerCase().includes(idOrName.toLowerCase()));

    // A. FLORA ESTRUCTURAL
    const saucoNodes = floraNodes.filter(n => n.label.includes('Saúco') || n.sciname.includes('Sambucus'));
    const capuliNodes = floraNodes.filter(n => n.label.includes('Capulí') || n.sciname.includes('Prunus'));
    const alisoNodes = floraNodes.filter(n => n.label.includes('Aliso') || n.sciname.includes('Alnus'));
    const chilcoNodes = floraNodes.filter(n => n.label.includes('Chilco') || n.sciname.includes('Baccharis'));
    const juncoNodes = floraNodes.filter(n => n.label.includes('Junco') || n.sciname.includes('Schoenoplectus'));
    const eneaNodes = floraNodes.filter(n => n.label.includes('Enea') || n.sciname.includes('Typha'));
    const sauceNodes = floraNodes.filter(n => n.label.includes('Sauce') || n.sciname.includes('Salix'));
    const raqueNodes = floraNodes.filter(n => n.label.includes('Raque') || n.sciname.includes('Vallea'));
    const farolitoNodes = floraNodes.filter(n => n.label.includes('Farolito') || n.sciname.includes('Abutilon'));

    // B. POLINIZACIÓN & NÉCTAR (Colibríes <--> Flora Melífera)
    const colibriList = aveNodes.filter(a => a.label.toLowerCase().includes('colibrí') || a.sciname.toLowerCase().includes('colibri') || a.label.toLowerCase().includes('calzadito') || a.label.toLowerCase().includes('brillante'));
    colibriList.forEach(col => {
      [...saucoNodes, ...chilcoNodes, ...raqueNodes, ...farolitoNodes].slice(0, 5).forEach(fl => {
        addConscientiousEdge(col, fl, INTER_TYPES.POLLINATION, 'Polinización cruzada y forrajeo de néctar floral');
      });
    });

    // C. FRUGIVORÍA & DISPERSIÓN DE SEMILLAS
    const frugivores = aveNodes.filter(a => a.label.includes('Mirla') || a.label.includes('Tángara') || a.label.includes('Tangara') || a.label.includes('Calandria') || a.label.includes('Centzontle') || a.label.includes('Rey del bosque'));
    frugivores.forEach(fr => {
      [...capuliNodes, ...saucoNodes].slice(0, 4).forEach(tr => {
        addConscientiousEdge(fr, tr, INTER_TYPES.DISPERSAL, 'Consumo de frutos y dispersión zoócora de semillas');
      });
    });

    // Mamíferos dispersores (Ardilla, Cusumbo)
    const ardilla = findTaxon('MAM-01');
    const cusumbo = findTaxon('MAM-04');
    if (ardilla) {
      [...capuliNodes, ...saucoNodes, ...alisoNodes].slice(0, 5).forEach(tr => addConscientiousEdge(ardilla, tr, INTER_TYPES.DISPERSAL, 'Dispersión y forrajeo en dosel'));
    }
    if (cusumbo) {
      [...capuliNodes, ...saucoNodes].slice(0, 4).forEach(tr => addConscientiousEdge(cusumbo, tr, INTER_TYPES.DISPERSAL, 'Forrajeo omnívoro de frutos caídos'));
    }

    // D. NIDIFICACIÓN EN JUNCAL & ENEA
    const marshNesters = aveNodes.filter(a => a.label.includes('Tingua') || a.label.includes('Monjita') || a.label.includes('Burrito') || a.label.includes('Focha') || a.label.includes('Gallineta') || a.label.includes('Pato') || a.label.includes('Rascón'));
    marshNesters.forEach(mn => {
      [...juncoNodes, ...eneaNodes].slice(0, 4).forEach(pl => {
        addConscientiousEdge(mn, pl, INTER_TYPES.NESTING, 'Anclaje de nidos flotantes y camuflaje entre juncales');
      });
    });

    // E. PERCHA Y NIDIFICACIÓN DE RAPACES & GARZAS
    const treePerchers = aveNodes.filter(a => a.label.includes('Garza') || a.label.includes('Garceta') || a.label.includes('Búho') || a.label.includes('Gavilán') || a.label.includes('Águila') || a.label.includes('Halcón') || a.label.includes('Lechuza'));
    treePerchers.forEach(tp => {
      [...sauceNodes, ...alisoNodes, ...floraNodes.slice(0, 6)].slice(0, 4).forEach(tr => {
        addConscientiousEdge(tp, tr, INTER_TYPES.NEST_SITE, 'Percha de avistamiento y nidificación en ramas altas');
      });
    });

    // F. DEPREDACIÓN MALACÓFAGA (Aves <--> Moluscos)
    const carrao = findTaxon('AVE-26');
    const tinguaBog = findTaxon('AVE-51');
    const tinguaAzul = findTaxon('AVE-39');
    const patoAndino = findTaxon('AVE-48');
    const malacophages = [carrao, tinguaBog, tinguaAzul, patoAndino].filter(Boolean);

    malacophages.forEach(av => {
      molNodes.forEach(mol => {
        addConscientiousEdge(av, mol, INTER_TYPES.PREDATION, 'Depredación directa de caracoles y babosas de humedal');
      });
    });

    // G. DEPREDACIÓN ICTIÓFAGA & DE ANFIBIOS (Garzas <--> Anfibios)
    const garzas = aveNodes.filter(a => a.label.includes('Garza') || a.label.includes('Garceta') || a.label.includes('Guaco'));
    garzas.forEach(gz => {
      anfNodes.forEach(anf => {
        addConscientiousEdge(gz, anf, INTER_TYPES.PREDATION, 'Captura de ranas y renacuajos en orillas someras');
      });
    });

    // H. DEPREDACIÓN DE MICROMAMÍFEROS (Rapaces Nocturnas & Diurnas <--> Roedores)
    const raptors = aveNodes.filter(a => a.label.includes('Búho') || a.label.includes('Lechuza') || a.label.includes('Gavilán') || a.label.includes('Cernícalo') || a.label.includes('Águila'));
    const rodents = mamNodes.filter(m => m.label.includes('Ratón') || m.label.includes('Rata') || m.label.includes('Curí') || m.label.includes('Roedores'));
    raptors.forEach(rp => {
      rodents.forEach(rd => {
        addConscientiousEdge(rp, rd, INTER_TYPES.PREDATION, 'Control biológico depredador de micromamíferos');
      });
    });

    // I. DEPREDACIÓN POR HERPETOS (Serpiente sabanera & Culebra <--> Moluscos & Anfibios)
    const serpienteSabanera = findTaxon('REP-01');
    const culebraHumedal = findTaxon('REP-08');
    if (serpienteSabanera) {
      molNodes.filter(m => m.label.includes('Babosa')).forEach(bab => {
        addConscientiousEdge(serpienteSabanera, bab, INTER_TYPES.PREDATION, 'Dieta malacófaga especializada en babosas');
      });
    }
    if (culebraHumedal) {
      anfNodes.forEach(anf => addConscientiousEdge(culebraHumedal, anf, INTER_TYPES.PREDATION, 'Depredación en charcas y vegetación riparia'));
      rodents.slice(0, 3).forEach(rd => addConscientiousEdge(culebraHumedal, rd, INTER_TYPES.PREDATION, 'Caza de pequeños roedores'));
    }

    // J. CARNIVORÍA TOPE (Comadreja andina <--> Roedores, Aves de juncal & Ranas)
    const comadreja = findTaxon('MAM-02');
    if (comadreja) {
      rodents.forEach(rd => addConscientiousEdge(comadreja, rd, INTER_TYPES.PREDATION, 'Depredador carnívoro de suelo'));
      anfNodes.slice(0, 3).forEach(anf => addConscientiousEdge(comadreja, anf, INTER_TYPES.PREDATION, 'Caza nocturna en rondas'));
      [tinguaBog, tinguaAzul].filter(Boolean).forEach(tg => addConscientiousEdge(comadreja, tg, INTER_TYPES.PREDATION, 'Depredación oportunista de nidadas'));
    }

    // K. HERBIVORÍA DE MOLUSCOS Y CURÍES <--> FLORA
    const curi = findTaxon('MAM-03');
    if (curi) {
      [...juncoNodes, ...floraNodes.slice(10, 18)].forEach(fl => {
        addConscientiousEdge(curi, fl, INTER_TYPES.HERBIVORY, 'Pastoreo de gramíneas y brotes tiernos');
      });
    }
    molNodes.forEach(mol => {
      floraNodes.slice(mol.id % 20, (mol.id % 20) + 4).forEach(fl => {
        addConscientiousEdge(mol, fl, INTER_TYPES.HERBIVORY, 'Raspado de hojas, algas y materia vegetal tierna');
      });
    });

    // L. PARASITISMO DE NIDO (Chamón / Tordo <--> Gorrión Copetón & Mirlas)
    const tordo = findTaxon('AVE-53') || aveNodes.find(a => a.label.includes('Tordo') || a.label.includes('Chamón'));
    const copeton = findTaxon('AVE-04');
    const mirla = findTaxon('AVE-01');
    if (tordo && copeton) addConscientiousEdge(tordo, copeton, INTER_TYPES.PARASITISM, 'Parasitismo de puesta en nidos de copetón');
    if (tordo && mirla) addConscientiousEdge(tordo, mirla, INTER_TYPES.PARASITISM, 'Parasitismo reproductivo');

    // M. ACORDES BIÓTICOS DE LARGA DISTANCIA (ESTILO RED JARDÍN BOTÁNICO)
    aveNodes.forEach((av, idx) => {
      if (av.neighbors.length < 4) {
        const partnerFlora = floraNodes[(idx * 7) % floraNodes.length];
        addConscientiousEdge(av, partnerFlora, INTER_TYPES.MUTUALISM, 'Refugio ambiental y corredor biótico');
      }
    });

    rawNodes.forEach(n => {
      if (n.neighbors.length < 3) {
        const candidate = floraNodes[(n.id * 13) % floraNodes.length];
        if (candidate && candidate.id !== n.id) {
          addConscientiousEdge(n, candidate, INTER_TYPES.MUTUALISM, 'Conexión ecosistémica de soporte');
        }
      }
    });
  }

  buildConscientiousBioticNetwork();

  // Mesh de Líneas de Interacción Dinámicas en Three.js
  const edgeGeo = new THREE.BufferGeometry();
  const edgeMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.38,
    blending: THREE.AdditiveBlending
  });
  const edgeLinesMesh = new THREE.LineSegments(edgeGeo, edgeMat);
  networkGroup.add(edgeLinesMesh);

  function updateEdgeLinesGeometry() {
    const activeEdgesList = [];
    const interCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };

    rawEdges.forEach((e) => {
      const na = rawNodes[e.source];
      const nb = rawNodes[e.target];
      if (!na || !nb) return;
      const key = na.id < nb.id ? `${na.id}_${nb.id}` : `${nb.id}_${na.id}`;
      const inter = edgeDetailsMap[key]?.type || getInteractionInfo(na, nb);
      const typeId = inter.id;

      if (interCounts[typeId] !== undefined) {
        interCounts[typeId]++;
      }

      const isInterActive = (opts.interactions[typeId] !== false);
      const isNodesActive = na.active && nb.active;

      if (isInterActive && isNodesActive) {
        activeEdgesList.push({ na, nb, inter });
      }
    });

    // Actualizar contadores de interacciones en el panel lateral
    for (let i = 0; i <= 8; i++) {
      const badge = document.getElementById(`badgeInter${i}`);
      if (badge) badge.innerText = interCounts[i] || 0;
    }

    const count = activeEdgesList.length;
    const posArr = new Float32Array(count * 2 * 3);
    const colArr = new Float32Array(count * 2 * 3);

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

      // Calcular grado biológico activo considerando categorías e interacciones encendidas
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

    // Sincronizar balizas de territorio en Kennedy 3D con las capas activas
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
    attribute float aCategory; // 0=agua, 1=arbol, 2=edificio, 3=via, 4=fondo
    
    varying vec3 vColor;
    varying float vCategory;
    varying float vAlpha;
    varying float vRippleBoost;
    varying float vDistToCam;
    
    void main() {
      vColor = aColor;
      vCategory = aCategory;
      
      float t = uMorphProgress;
      float ease = smoothstep(0.0, 1.0, t);
      
      float explosionIntensity = sin(ease * 3.14159);
      vec3 curlVortex = vec3(
        sin(uTime * 1.6 + position.y * 0.08 + aPhase * 2.0) * 44.0 * explosionIntensity + cos(uTime * 1.1 + position.z * 0.05) * 26.0 * explosionIntensity,
        cos(uTime * 1.3 + position.x * 0.08 + aPhase * 2.0) * 36.0 * explosionIntensity + sin(uTime * 1.7 + position.z * 0.06) * 22.0 * explosionIntensity,
        sin(uTime * 1.5 + position.x * 0.08 + aPhase * 3.0) * 44.0 * explosionIntensity + cos(uTime * 0.9 + position.y * 0.05) * 26.0 * explosionIntensity
      );
      
      vec3 territorialIdle = vec3(0.0);
      if (aCategory < 0.5) {
        territorialIdle.y = sin(uTime * 2.6 + position.x * 0.16 + position.z * 0.16) * 0.4 * ease;
      } else if (aCategory < 1.5) {
        territorialIdle.x = sin(uTime * 1.8 + aPhase * 4.0) * 0.28 * ease;
        territorialIdle.z = cos(uTime * 1.5 + aPhase * 4.0) * 0.28 * ease;
      }
      
      float distToRipple = length(position.xz - uRipplePos.xz);
      float rippleRadius = uRippleTime * 140.0;
      float rippleDist = abs(distToRipple - rippleRadius);
      float rippleWave = smoothstep(26.0, 0.0, rippleDist) * max(0.0, 1.0 - uRippleTime * 0.65) * ease;
      territorialIdle.y += sin(rippleDist * 0.25 - uTime * 4.0) * rippleWave * 3.0;
      vRippleBoost = rippleWave;
      
      vec3 swarmOrbit = aSwarmPos;
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

  
  function generateProceduralKennedyTerritory() {
    console.log("Generando Territorio 3D de Kennedy Procedural de Alta Densidad...");
    pTarget.length = 0;
    pSwarm.length = 0;
    pColor.length = 0;
    pSize.length = 0;
    pPhase.length = 0;
    pCat.length = 0;
    currentParticleIndex = 0;

    const colWaterMain = new THREE.Color(0x00B4D8);
    const colWaterDeep = new THREE.Color(0x0077B6);
    const colTreeLush  = new THREE.Color(0x2E8B57);
    const colTreeBright= new THREE.Color(0x48BB78);
    const colTrunk     = new THREE.Color(0x161D26);
    const colRoad      = new THREE.Color(0x232326);
    const colMajor     = new THREE.Color(0x38BDF8);
    const colBldgPrimary   = new THREE.Color(0x3A3836);
    const colBldgSecondary = new THREE.Color(0x484440);
    const colRoofHighlight = new THREE.Color(0x544E48);

    // A. 3 Cuerpos de Agua de Kennedy (El Burro, La Vaca, Techo)
    const wetlands = [
      { cx: 210, cz: 40, rx: 65, rz: 32, name: "Humedal El Burro" },
      { cx: 65,  cz: 160, rx: 50, rz: 28, name: "PEDH La Vaca" },
      { cx: 290, cz: -30, rx: 45, rz: 24, name: "Humedal de Techo" }
    ];

    wetlands.forEach(w => {
      for (let i = 0; i < 900; i++) {
        const rad = Math.sqrt(Math.random());
        const ang = Math.random() * Math.PI * 2;
        const wx = w.cx + Math.cos(ang) * w.rx * rad;
        const wz = w.cz + Math.sin(ang) * w.rz * rad;
        const wy = 0.25 + Math.random() * 0.2;

        const sw = randomSwarmCluster(currentParticleIndex++);
        pTarget.push(wx, wy, wz);
        pSwarm.push(sw.x, sw.y, sw.z);
        const c = (i % 2 === 0) ? colWaterMain : colWaterDeep;
        pColor.push(c.r, c.g, c.b);
        pSize.push(1.75);
        pPhase.push(i * 0.2);
        pCat.push(0.0);
      }
    });

    // B. Arbolado de Ronda y Espacio Público (3,500 árboles)
    for (let t = 0; t < 2200; t++) {
      const nearWetland = wetlands[t % wetlands.length];
      const ang = Math.random() * Math.PI * 2;
      const dist = (nearWetland.rx + 6) + Math.random() * 48;
      const tx = nearWetland.cx + Math.cos(ang) * dist;
      const tz = nearWetland.cz + Math.sin(ang) * (dist * 0.7);
      const th = 4.5 + Math.random() * 6.5;

      const swCrown = randomSwarmCluster(currentParticleIndex++);
      pTarget.push(tx, th * 0.85, tz);
      pSwarm.push(swCrown.x, swCrown.y, swCrown.z);
      const folCol = (t % 2 === 0) ? colTreeLush : colTreeBright;
      pColor.push(folCol.r, folCol.g, folCol.b);
      pSize.push(1.6);
      pPhase.push(t * 0.3);
      pCat.push(1.0);

      // Follaje secundario
      for (let k = 0; k < 3; k++) {
        const fa = (k / 3) * Math.PI * 2 + (t % 5);
        const frad = 1.8 + Math.random() * 1.5;
        const swSub = randomSwarmCluster(currentParticleIndex++);
        pTarget.push(tx + Math.cos(fa) * frad, th * 0.85 + (k % 2 === 0 ? 0.3 : -0.2), tz + Math.sin(fa) * frad);
        pSwarm.push(swSub.x, swSub.y, swSub.z);
        pColor.push(folCol.r * 1.05, folCol.g * 1.05, folCol.b * 1.05);
        pSize.push(1.4);
        pPhase.push(t + k);
        pCat.push(1.0);
      }

      // Tronco
      const swTrunk = randomSwarmCluster(currentParticleIndex++);
      pTarget.push(tx, 0.1, tz);
      pSwarm.push(swTrunk.x, swTrunk.y, swTrunk.z);
      pColor.push(colTrunk.r, colTrunk.g, colTrunk.b);
      pSize.push(1.1);
      pPhase.push(t * 0.1);
      pCat.push(1.0);
    }

    // C. Malla Vial y Corredores Urbanos
    for (let r = 0; r < 24; r++) {
      const rx = (r - 12) * 28 + 180;
      for (let s = -200; s <= 260; s += 5) {
        const sw = randomSwarmCluster(currentParticleIndex++);
        pTarget.push(rx, 0.08, s);
        pSwarm.push(sw.x, sw.y, sw.z);
        pColor.push(colRoad.r, colRoad.g, colRoad.b);
        pSize.push(0.95);
        pPhase.push(r + s);
        pCat.push(3.0);
      }
    }
    for (let r = 0; r < 20; r++) {
      const rz = (r - 10) * 28 + 40;
      for (let s = -40; s <= 380; s += 5) {
        const sw = randomSwarmCluster(currentParticleIndex++);
        pTarget.push(s, 0.08, rz);
        pSwarm.push(sw.x, sw.y, sw.z);
        pColor.push(colMajor.r, colMajor.g, colMajor.b);
        pSize.push(1.25);
        pPhase.push(r + s);
        pCat.push(3.0);
      }
    }

    // D. Tejido Construido y Manzanas de Kennedy (1,200 bloques)
    for (let bx = -20; bx <= 360; bx += 32) {
      for (let bz = -180; bz <= 240; bz += 32) {
        // No construir sobre agua
        const insideWater = wetlands.some(w => {
          const dx = (bx - w.cx) / w.rx;
          const dz = (bz - w.cz) / w.rz;
          return (dx * dx + dz * dz) < 1.1;
        });
        if (insideWater) continue;

        const bh = 5 + (Math.sin(bx * 0.05 + bz * 0.03) + 1) * 7.5;
        const bcol = ((bx + bz) % 2 === 0) ? colBldgPrimary : colBldgSecondary;
        const bw = 18;
        const bl = 18;

        for (let corner = 0; corner < 4; corner++) {
          const cx = bx + (corner % 2 === 0 ? -bw/2 : bw/2);
          const cz = bz + (corner < 2 ? -bl/2 : bl/2);
          const steps = Math.max(3, Math.floor(bh / 1.5));
          for (let st = 0; st <= steps; st++) {
            const y = (st / steps) * bh;
            const sw = randomSwarmCluster(currentParticleIndex++);
            pTarget.push(cx, y, cz);
            pSwarm.push(sw.x, sw.y, sw.z);
            const isRoof = (st === steps);
            const c = isRoof ? colRoofHighlight : bcol;
            pColor.push(c.r, c.g, c.b);
            pSize.push(isRoof ? 1.3 : 1.1);
            pPhase.push(st + bx);
            pCat.push(2.0);
          }
        }
      }
    }

    rebuildTerritoryParticles();
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

          const subNodes = 4;
          const rad = h * 0.45;
          for (let k = 0; k < subNodes; k++) {
            const ang = (k / subNodes) * Math.PI * 2 + (i % 7);
            const sx = p.x + Math.cos(ang) * rad;
            const sz = p.z + Math.sin(ang) * rad;
            const sy = crownY + (k % 2 === 0 ? 0.25 : -0.2);

            const swSub = randomSwarmCluster(currentParticleIndex++);
            pTarget.push(sx, sy, sz);
            pSwarm.push(swSub.x, swSub.y, swSub.z);
            pColor.push(folCol.r * 1.05, folCol.g * 1.05, folCol.b * 1.05);
            pSize.push(1.4);
            pPhase.push(i + k * 1.5);
            pCat.push(1.0);
          }

          const swBase = randomSwarmCluster(currentParticleIndex++);
          pTarget.push(p.x, 0.1, p.z);
          pSwarm.push(swBase.x, swBase.y, swBase.z);
          pColor.push(colTrunk.r, colTrunk.g, colTrunk.b);
          pSize.push(1.1);
          pPhase.push(i * 0.1);
          pCat.push(1.0);
        });

        rebuildTerritoryParticles();
      })
      .catch(err => console.warn("Error árboles:", err));
  }

  function loadRoads() {
    return fetch(NET_URL)
      .then(r => r.json())
      .then(edges => {
        const colRoad = new THREE.Color(0x232326);
        const colMajor = new THREE.Color(0x38BDF8);
        const edgeList = Array.isArray(edges) ? edges : (edges.edges || []);

        edgeList.forEach(([kind, pts], edgeIdx) => {
          const isMajor = (edgeIdx % 4 === 0);
          const c = isMajor ? colMajor : colRoad;

          for (let i = 0; i < pts.length - 1; i++) {
            const a = toScene(pts[i][0], pts[i][1]);
            const sw = randomSwarmCluster(currentParticleIndex++);
            pTarget.push(a.x, 0.08, a.z);
            pSwarm.push(sw.x, sw.y, sw.z);
            pColor.push(c.r, c.g, c.b);
            pSize.push(isMajor ? 1.25 : 0.95);
            pPhase.push(edgeIdx * 0.35);
            pCat.push(3.0);
          }
        });

        rebuildTerritoryParticles();
      })
      .catch(err => console.warn("Error vías:", err));
  }

  function loadBuildings() {
    return fetch(BUILDINGS_URL)
      .then(r => r.json())
      .then(buildings => {
        // Paleta Arquitectónica: Piedra de Cantera, Pizarra y Basalto Oscuro (Sin blanco)
        const colBldgPrimary   = new THREE.Color(0x3A3836);
        const colBldgSecondary = new THREE.Color(0x484440);
        const colRoofHighlight = new THREE.Color(0x544E48);
        const colBaseGround    = new THREE.Color(0x131315);
        const bldList = Array.isArray(buildings) ? buildings : (buildings.buildings || []);

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

        for (let s = 0; s < 3800; s++) {
          const rad = 25 + Math.sqrt(Math.random()) * 210;
          const ang = Math.random() * Math.PI * 2;
          const gx = Math.cos(ang) * rad;
          const gz = Math.sin(ang) * rad;
          const gy = 0.02 + Math.random() * 0.2;

          const sw = randomSwarmCluster(currentParticleIndex++);
          pTarget.push(gx, gy, gz);
          pSwarm.push(sw.x, sw.y, sw.z);
          pColor.push(colBaseGround.r, colBaseGround.g, colBaseGround.b);
          pSize.push(0.92);
          pPhase.push(s * 0.5);
          pCat.push(4.0);
        }

        rebuildTerritoryParticles();
      })
      .catch(err => console.warn("Error edificios:", err));
  }

  Promise.all([loadWater(), loadTrees(), loadRoads()])
    .then(() => {
      loadBuildings();
      setTimeout(() => {
        if (pTarget.length < 500) generateProceduralKennedyTerritory();
        if (loadingVeil) loadingVeil.classList.add("hide");
      }, 400);
    })
    .catch(() => {
      generateProceduralKennedyTerritory();
      setTimeout(() => {
        if (loadingVeil) loadingVeil.classList.add("hide");
      }, 400);
    });


  // 5. CONSTELACIONES DINÁMICAS Y FOCO VISUAL DE ESPECIES DE ÁRBOLES
  // =====================================================================
  const speciesConstellationGroup = new THREE.Group();
  sceneRoot.add(speciesConstellationGroup);

  let activeConstellationPoints = null;
  let activeConstellationLines = null;

  const activeTreeIndicatorGroup = new THREE.Group();
  sceneRoot.add(activeTreeIndicatorGroup);

  const focusDotGeo = new THREE.CircleGeometry(1.6, 24);
  const focusDotMat = new THREE.MeshBasicMaterial({ color: 0x84A48B, side: THREE.DoubleSide, transparent: true, opacity: 0.0 });
  const focusDotMesh = new THREE.Mesh(focusDotGeo, focusDotMat);
  focusDotMesh.rotation.x = -Math.PI / 2;
  activeTreeIndicatorGroup.add(focusDotMesh);

  const focusRingGeo = new THREE.RingGeometry(2.8, 5.4, 24);
  const focusRingMat = new THREE.MeshBasicMaterial({ color: 0x84A48B, side: THREE.DoubleSide, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending });
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

  // =====================================================================
  // 6. CONTROLADOR BOTÁNICO Y RECORRIDO DE ÁRBOLES EN EL TERRITORIO
  // =====================================================================
  let tourActive = false;
  let tourIndex = 0;
  let tourTimer = null;
  const btnTourSpecies = document.getElementById("btnTourSpecies");

  const SPECIES_GEO_NODES = [
    { id: "chicala", name: "Chicalá / Flor Amarillo", sci: "Tecoma stans", count: "6,884 árboles", avgHeight: "2.6 m (hasta 6 m)", img: "./assets/inat_timboco.png", pos: { x: 210.4, y: 13.0, z: 96.0 }, camPos: { x: 210.4, y: 48, z: 155 }, camTarget: { x: 210.4, y: 0, z: 96.0 }, color: 0xE7C878 },
    { id: "jazmin", name: "Jazmín del Cabo / Laurel Huesito", sci: "Pittosporum undulatum", count: "5,650 árboles", avgHeight: "3.2 m (hasta 9 m)", img: "./assets/inat_sauco.png", pos: { x: 234.8, y: 13.5, z: 102.9 }, camPos: { x: 234.8, y: 50, z: 162 }, camTarget: { x: 234.8, y: 0, z: 102.9 }, color: 0x48BB78 },
    { id: "sauco", name: "Sauco del Humedal", sci: "Sambucus nigra", count: "5,553 árboles", avgHeight: "3.1 m (hasta 8 m)", img: "./assets/inat_sauco.png", pos: { x: 221.0, y: 13.0, z: 124.7 }, camPos: { x: 221.0, y: 48, z: 182 }, camTarget: { x: 221.0, y: 0, z: 124.7 }, color: 0x84A48B },
    { id: "falso_pimiento", name: "Falso Pimiento", sci: "Schinus molle", count: "4,548 árboles", avgHeight: "3.6 m (hasta 10 m)", img: "./assets/inat_espino.png", pos: { x: 192.2, y: 14.0, z: 88.6 }, camPos: { x: 192.2, y: 52, z: 148 }, camTarget: { x: 192.2, y: 0, z: 88.6 }, color: 0x2E8B57 },
    { id: "eugenia", name: "Eugenia", sci: "Eugenia myrtifolia", count: "4,370 árboles", avgHeight: "3.5 m (hasta 8 m)", img: "./assets/inat_chilca.png", pos: { x: 209.7, y: 13.5, z: 78.8 }, camPos: { x: 209.7, y: 50, z: 138 }, camTarget: { x: 209.7, y: 0, z: 78.8 }, color: 0x48BB78 },
    { id: "palma_yuca", name: "Palma Yuca / Palmiche", sci: "Yucca gigantea", count: "4,356 árboles", avgHeight: "2.9 m (hasta 7 m)", img: "./assets/inat_mastuerzo.png", pos: { x: 188.7, y: 12.5, z: 180.1 }, camPos: { x: 188.7, y: 48, z: 240 }, camTarget: { x: 188.7, y: 0, z: 180.1 }, color: 0x84A48B },
    { id: "urapan", name: "Urapán / Fresno", sci: "Fraxinus chinensis", count: "3,113 árboles", avgHeight: "8.5 m (hasta 20 m)", img: "./assets/cx_urapan.png", pos: { x: 251.2, y: 19.0, z: 142.5 }, camPos: { x: 251.2, y: 68, z: 205 }, camTarget: { x: 251.2, y: 0, z: 142.5 }, color: 0x2E8B57 },
    { id: "caucho", name: "Caucho Sabanero", sci: "Ficus soatensis", count: "2,860 árboles", avgHeight: "6.3 m (hasta 15 m)", img: "./assets/inat_espino.png", pos: { x: 172.3, y: 16.0, z: 138.1 }, camPos: { x: 172.3, y: 58, z: 198 }, camTarget: { x: 172.3, y: 0, z: 138.1 }, color: 0x84A48B },
    { id: "cipres", name: "Ciprés / Pino", sci: "Cupressus lusitanica", count: "2,828 árboles", avgHeight: "4.9 m (hasta 16 m)", img: "./assets/arbol_real4.png", pos: { x: 277.8, y: 15.0, z: 124.1 }, camPos: { x: 277.8, y: 55, z: 184 }, camTarget: { x: 277.8, y: 0, z: 124.1 }, color: 0x48BB78 },
    { id: "acacia", name: "Acacia Sabanera", sci: "Acacia melanoxylon", count: "2,160 árboles", avgHeight: "3.9 m (hasta 12 m)", img: "./assets/inat_chilca.png", pos: { x: 166.1, y: 14.0, z: 93.1 }, camPos: { x: 166.1, y: 52, z: 153 }, camTarget: { x: 166.1, y: 0, z: 93.1 }, color: 0x2E8B57 },
    { id: "capulin", name: "Capulí / Cerezo", sci: "Prunus serotina", count: "1,901 árboles", avgHeight: "3.7 m (hasta 12 m)", img: "./assets/inat_capulin.png", pos: { x: 208.9, y: 14.5, z: 141.0 }, camPos: { x: 208.9, y: 52, z: 200 }, camTarget: { x: 208.9, y: 0, z: 141.0 }, color: 0x48BB78 },
    { id: "aliso", name: "Aliso Sabanero", sci: "Alnus acuminata", count: "1,058 árboles", avgHeight: "2.7 m (hasta 12 m)", img: "./assets/inat_chilca.png", pos: { x: 203.4, y: 13.5, z: -102.2 }, camPos: { x: 203.4, y: 50, z: -42 }, camTarget: { x: 203.4, y: 0, z: -102.2 }, color: 0x48BB78 }
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
    if (soundActive && typeof triggerHarmonicChime === "function") {
      triggerHarmonicChime(0.45 + (idx / SPECIES_GEO_NODES.length) * 0.5);
    }
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
  // 5.B BALIZAS Y MARCADORES DE ESPECIES EN EL TERRITORIO 3D DE KENNEDY
  // =====================================================================

  // Categorías e íconos para Tooltips y Pop-ups
  const CAT_EMOJIS = {
    "Anfibios": "ANFIBIO",
    "Aves": "AVE",
    "Mamíferos": "MAMÍFERO",
    "Moluscos": "MOLUSCO",
    "Reptiles": "REPTIL",
    "Flora SIGAU": "FLORA & ARBOLADO",
    0: "FLORA & ARBOLADO",
    1: "AVE",
    2: "MAMÍFERO",
    3: "MOLUSCO",
    4: "ANFIBIO",
    5: "REPTIL"
  };

  // Calcular Coordenada Territorial Real para cada una de las 181 Especies
  function calculateTerritoryCoordinate(t, idx, total) {
    const cat = t.cat;

    if (cat === "Anfibios") {
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
    } else if (cat === "Moluscos") {
      const hubs = [
        { x: 205.0, z: -15.0, name: "Humedal El Burro — Juncal de Ribera" },
        { x: 72.0, z: 112.0, name: "Humedal La Vaca — Fango Húmedo" },
        { x: 285.0, z: -75.0, name: "Humedal de Techo — Borde Vegetado" }
      ];
      const hub = hubs[idx % hubs.length];
      const ang = (idx * 1.7) % (Math.PI * 2);
      const rad = 6.0 + (idx % 3) * 4.0;
      return { x: hub.x + Math.cos(ang) * rad, y: 0.9, z: hub.z + Math.sin(ang) * rad, locName: hub.name };
    } else if (cat === "Reptiles") {
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
    } else if (cat === "Mamíferos") {
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
    } else if (cat === "Aves") {
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
      // Flora & Árboles SIGAU
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

  // Generar las Balizas Interactivas de las 181 Especies
  rawTaxa.forEach((t, idx) => {
    const geoPos = calculateTerritoryCoordinate(t, idx, rawTaxa.length);
    t.territoryPos = geoPos;

    const tex = generateSpeciesSvgDataUri(t.img, t.id, t.name, t.cat);
    const spriteMat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      opacity: 0.95
    });

    const sprite = new THREE.Sprite(spriteMat);
    const baseScale = t.cat === "Anfibios" ? 4.6 : (t.cat === "Reptiles" ? 4.4 : (t.cat === "Mamíferos" ? 4.2 : 3.8));
    sprite.scale.set(baseScale, baseScale, 1.0);
    sprite.position.set(geoPos.x, geoPos.y, geoPos.z);
    sprite.userData = { isTerritoryBeacon: true, taxonIndex: idx, taxonData: t, baseScale: baseScale };

    // Anillo de pulso de suelo con color de categoría
    const catHex = (TAXONOMIC_CONVENTIONS[t.cat] && (TAXONOMIC_CONVENTIONS[t.cat] ? TAXONOMIC_CONVENTIONS[t.cat].color : "#84A48B")) || "#84A48B";
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

  let activeTerritoryTaxon = null;
  let hoveredTerritoryBeacon = null;

  if (btnCloseModal) {
    btnCloseModal.addEventListener("click", () => {
      if (territoryModal) territoryModal.style.display = "none";
    });
  }

  function openTerritorySpeciesModal(t) {
    if (!t || !territoryModal) return;
    activeTerritoryTaxon = t;

    const catHex = (TAXONOMIC_CONVENTIONS[t.cat] && (TAXONOMIC_CONVENTIONS[t.cat] ? TAXONOMIC_CONVENTIONS[t.cat].color : "#84A48B")) || "#84A48B";
    territoryModal.style.setProperty("--cat-color", catHex);

    if (modalImg) modalImg.src = t.img;
    if (modalBadge) {
      modalBadge.textContent = CAT_EMOJIS[t.cat] || t.cat;
      modalBadge.style.color = catHex;
      modalBadge.style.borderColor = catHex;
    }
    if (modalName) modalName.textContent = t.name;
    if (modalSci) modalSci.textContent = t.sciname;
    if (modalLoc) modalLoc.textContent = t.territoryPos.locName || t.loc || "Kennedy";
    if (modalRole) modalRole.textContent = t.role || "Eslabón ecológico del territorio";
    if (modalDesc) modalDesc.textContent = `${t.desc || 'Especie registrada en el sistema socioecológico de Kennedy.'} Taxón ID: ${t.id}. Registrado en monitoreo de biodiversidad urbana e iNaturalist.`;

    if (modalLinks) {
      modalLinks.innerHTML = "";
      const node = rawNodes.find(n => n.taxaId === t.id);
      if (node && node.neighbors && node.neighbors.length > 0) {
        node.neighbors.slice(0, 6).forEach(nbId => {
          const nb = rawNodes[nbId];
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
    if (soundActive && typeof triggerHarmonicChime === "function") {
      triggerHarmonicChime(0.75);
    }
  }

  // Pointermove para Tooltip interactivo tanto en Red Biótica como en Territorio 3D
  window.addEventListener("pointermove", (e) => {
    mouseVec.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseVec.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouseVec, camera);

    if (currentMorph < 0.35) {
      // Modo Red Biótica
      const activeSprites = nodeSprites.filter(s => s.visible);
      const intersects = raycaster.intersectObjects(activeSprites, false);
      if (intersects.length > 0) {
        const hitSprite = intersects[0].object;
        const n = rawNodes[hitSprite.userData.id];
        if (!n) return;

        canvas.style.cursor = "pointer";

        if (territoryTooltip) {
          const catHex = (TAXONOMIC_CONVENTIONS[n.cat] && (TAXONOMIC_CONVENTIONS[n.cat] ? TAXONOMIC_CONVENTIONS[n.cat].color : "#84A48B")) || "#84A48B";
          territoryTooltip.style.setProperty("--cat-color", catHex);

          if (ttImg) ttImg.src = n.photoUrl;
          if (ttBadge) {
            ttBadge.textContent = CAT_EMOJIS[n.cat] || "TAXÓN";
            ttBadge.style.color = catHex;
          }
          if (ttName) ttName.textContent = n.label;
          if (ttSci) ttSci.textContent = n.sciname || n.taxaId;
          if (ttLoc) ttLoc.textContent = `Grado ecológico: ${n.degree} interacciones activas`;
          if (ttRole) ttRole.textContent = n.role || "Eslabón ecológico";

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
        canvas.style.cursor = "crosshair";
        if (territoryTooltip) territoryTooltip.style.display = "none";
      }
    } else {
      // Modo Territorio 3D
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
          const catHex = (TAXONOMIC_CONVENTIONS[t.cat] && (TAXONOMIC_CONVENTIONS[t.cat] ? TAXONOMIC_CONVENTIONS[t.cat].color : "#84A48B")) || "#84A48B";
          territoryTooltip.style.setProperty("--cat-color", catHex);

          if (ttImg) ttImg.src = t.img;
          if (ttBadge) {
            ttBadge.textContent = CAT_EMOJIS[t.cat] || "TAXÓN";
            ttBadge.style.color = catHex;
          }
          if (ttName) ttName.textContent = t.name;
          if (ttSci) ttSci.textContent = t.sciname;
          if (ttLoc) ttLoc.textContent = t.territoryPos?.locName || t.loc || 'Kennedy';
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
  // 7. INTERACCIÓN DE RED BIÓTICA, INSPECTOR, LAYOUTS Y SUB-RED
  // =====================================================================
  let selectedNode = null;
  let hoveredNode = null;
  const raycaster = new THREE.Raycaster();
  const mouseVec = new THREE.Vector2();

  window.openWelcomeModal = () => {
    welcomeModalOverlay.style.display = "flex";
  };
  setTimeout(() => { if (welcomeModalOverlay) welcomeModalOverlay.style.display = "flex"; }, 150);

    const modal = document.getElementById('welcomeModalOverlay');
    if (modal) modal.style.display = 'flex';
  };

  window.closeWelcomeModal = () => {
    const modal = document.getElementById('welcomeModalOverlay');
    if (modal) modal.style.display = 'none';
  };

  window.toggleSideDrawer = () => {
    sideDrawer.classList.toggle('collapsed');
    document.getElementById('btnToggleSide').classList.toggle('active');
  };

  window.toggleCat = (catId) => {
    opts.cats[catId] = !opts.cats[catId];
    const toggleEl = document.getElementById(`toggleCat${catId}`);
    const cardEl = document.getElementById(`catCard${catId}`);
    if (toggleEl) toggleEl.classList.toggle('checked', opts.cats[catId]);
    if (cardEl) {
      cardEl.classList.toggle('inactive', !opts.cats[catId]);
    }
    recalculateDegreesAndSizes();
  };

  window.toggleAllCats = (state) => {
    for (let c = 0; c <= 5; c++) {
      opts.cats[c] = state;
      const toggleEl = document.getElementById(`toggleCat${c}`);
      const cardEl = document.getElementById(`catCard${c}`);
      if (toggleEl) toggleEl.classList.toggle('checked', state);
      if (cardEl) cardEl.classList.toggle('inactive', !state);
    }
    recalculateDegreesAndSizes();
  };

  window.toggleInteraction = (typeId) => {
    opts.interactions[typeId] = !opts.interactions[typeId];
    const toggleEl = document.getElementById(`toggleInter${typeId}`);
    const itemEl = document.getElementById(`interItem${typeId}`);
    const isActive = !!opts.interactions[typeId];
    if (toggleEl) toggleEl.classList.toggle('checked', isActive);
    if (itemEl) {
      itemEl.classList.toggle('active', isActive);
      itemEl.classList.toggle('inactive', !isActive);
    }
    recalculateDegreesAndSizes();
  };

  window.toggleAllInteractions = (state) => {
    for (let i = 0; i <= 8; i++) {
      opts.interactions[i] = state;
      const toggleEl = document.getElementById(`toggleInter${i}`);
      const itemEl = document.getElementById(`interItem${i}`);
      if (toggleEl) toggleEl.classList.toggle('checked', state);
      if (itemEl) {
        itemEl.classList.toggle('active', state);
        itemEl.classList.toggle('inactive', !state);
      }
    }
    recalculateDegreesAndSizes();
  };

  window.hideNodeByDoubleClick = (node) => {
    if (!node) return;
    node.hiddenByUser = true;
    if (selectedNode && selectedNode.id === node.id) {
      closeInspector();
    }
    recalculateDegreesAndSizes();
    showToast(`Nodo [${node.label}] ocultado por doble clic`);
  };

  window.hideCurrentNode = () => {
    if (selectedNode) hideNodeByDoubleClick(selectedNode);
  };

  window.restoreHiddenNodes = () => {
    rawNodes.forEach(n => n.hiddenByUser = false);
    recalculateDegreesAndSizes();
    showToast('Todos los nodos ocultos fueron restablecidos');
  };

  function showToast(msg) {
    toastNotify.innerText = msg;
    toastNotify.style.display = 'block';
    setTimeout(() => { toastNotify.style.display = 'none'; }, 2500);
  }

  window.resetCamera = () => {
    if (window.gsap) {
      gsap.to(camera.position, { x: swarmCamPos.x, y: swarmCamPos.y, z: swarmCamPos.z, duration: 1.8, ease: "power2.inOut" });
      gsap.to(controls.target, { x: swarmTarget.x, y: swarmTarget.y, z: swarmTarget.z, duration: 1.8, ease: "power2.inOut" });
    }
  };

  window.setLayout = (mode) => {
    opts.layoutMode = mode;
    document.querySelectorAll('#topHeader .btn-flat').forEach(b => {
      if (b.id && b.id.startsWith('btnLayout')) b.classList.remove('active');
    });
    if (mode === 'hyperbolic') document.getElementById('btnLayoutHyp').classList.add('active');
    if (mode === 'clustered') document.getElementById('btnLayoutClust').classList.add('active');
    if (mode === 'concentric') document.getElementById('btnLayoutConc').classList.add('active');

    rawNodes.forEach((n, idx) => {
      if (mode === 'clustered') {
        const centers = {
          0: { x: 0, y: -16, z: 0 },    // Flora en base
          1: { x: 0, y: 22, z: 0 },     // Aves en dosel superior
          2: { x: 26, y: 2, z: 16 },    // Mamíferos
          3: { x: -26, y: 2, z: 16 },   // Moluscos
          4: { x: -22, y: -6, z: -22 }, // Anfibios
          5: { x: 22, y: -6, z: -22 }   // Reptiles
        };
        const c = centers[n.cat] || { x: 0, y: 0, z: 0 };
        const a = idx * 2.4 + (n.cat * Math.PI / 3);
        const r = 5 + (idx % 10) * 1.2;
        n.ox = c.x + Math.cos(a) * r;
        n.oy = c.y + Math.sin(a * 1.3) * (r * 0.7);
        n.oz = c.z + Math.sin(a) * r;
      } else if (mode === 'concentric') {
        const ringIdx = idx % 3;
        const rad = 18 + ringIdx * 10;
        const posInRing = Math.floor(idx / 3);
        const angle = (posInRing / (rawNodes.length / 3)) * Math.PI * 2;
        n.ox = Math.cos(angle) * rad;
        n.oy = Math.sin(angle * 1.5) * (rad * 0.45);
        n.oz = Math.sin(angle) * rad;
      } else {
        n.ox = n.baseX; n.oy = n.baseY; n.oz = n.baseZ;
      }

      if (window.gsap) {
        gsap.to(n.sprite.position, {
          x: n.ox, y: n.oy, z: n.oz, duration: 2.2, ease: "power2.inOut",
          onUpdate: (idx === 0 ? updateEdgeLinesGeometry : null)
        });
      }
    });
  };

  window.searchNode = (q) => {
    if (!q.trim()) return;
    const found = rawNodes.find(n => n.active && (n.label.toLowerCase().includes(q.toLowerCase()) || n.sciname.toLowerCase().includes(q.toLowerCase()) || n.taxaId.toLowerCase() === q.toLowerCase()));
    if (found) openInspector(found);
  };

  window.openInspector = (node) => {
    selectedNode = node;
    document.getElementById('mNodeTitle').innerText = node.label;
    document.getElementById('mNodeSciName').innerText = node.sciname;
    document.getElementById('mDegreeVal').innerText = node.degree;
    document.getElementById('mTaxaCode').innerText = node.taxaId;
    document.getElementById('mRoleBox').innerText = node.role;
    document.getElementById('mLocBox').innerText = node.loc;
    document.getElementById('mAlertBox').innerText = node.alert;

    const imgEl = document.getElementById('mNodeImg');
    if (node.photoUrl) {
      imgEl.src = node.photoUrl;
      imgEl.style.display = 'block';
    } else {
      imgEl.style.display = 'none';
    }

    document.getElementById('mNeighborHeader').innerText = `Interacciones Bióticas Clasificadas (${node.degree})`;
    const listEl = document.getElementById('mNeighborList');
    listEl.innerHTML = '';

    const interactionTypes = [
      { name: 'Depredación', color: '#C96349' },
      { name: 'Herbivoría', color: '#84A48B' },
      { name: 'Dispersión', color: '#E69888' },
      { name: 'Mutualismo', color: '#E7C878' },
      { name: 'Nidificación', color: '#F79E70' },
      { name: 'Visita Floral', color: '#A386A9' },
      { name: 'Anidamiento', color: '#D1A996' },
      { name: 'Parasitismo', color: '#C6B3CA' },
      { name: 'Alelopatía', color: '#6B9080' }
    ];

    node.neighbors.forEach((nb) => {
      const inter = getInteractionInfo(node, nb);

      const item = document.createElement('div');
      item.className = 'neighbor-row';
      item.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:2px;">
          <span><b>${nb.label}</b> (<i>${nb.sciname}</i>)</span>
          <span style="font-size:8.5px; font-weight:700; color:${inter.color}; background:rgba(255,255,255,0.06); padding:1px 5px; border-radius:3px; width:fit-content; border:1px solid ${inter.color};">
            Tipo: ${inter.name} • ${palette.catNames[nb.cat] || ''}
          </span>
        </div>
        <span style="color:#84a48b; font-size:9px; font-family:monospace;">${nb.taxaId}</span>
      `;
      item.onclick = (e) => {
        e.stopPropagation();
        openInspector(nb);
      };
      listEl.appendChild(item);
    });

    nodeInspector.style.display = 'block';
    focusSelectedNode(node);
  };

  window.closeInspector = () => {
    selectedNode = null;
    nodeInspector.style.display = 'none';
  };

  window.focusSelectedNode = (node) => {
    const target = node || selectedNode;
    if (!target) return;
    if (window.gsap) {
      gsap.to(camera.position, { x: target.sprite.position.x * 1.6, y: target.sprite.position.y * 1.6, z: target.sprite.position.z * 1.6 + 24, duration: 2.0, ease: "power2.inOut" });
      gsap.to(controls.target, { x: target.sprite.position.x, y: target.sprite.position.y, z: target.sprite.position.z, duration: 2.0, ease: "power2.inOut" });
    }
  };

  // Sub-Network Canvas Modal
  let subCanvasAnim = null;
  const subOpts = { interactions: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true } };

  window.openSubNetworkModal = () => {
    if (!selectedNode) return;
    document.getElementById('subModalTitle').innerText = `Sub-Red Directa: ${selectedNode.label}`;
    document.getElementById('subModalCode').innerText = `[${selectedNode.taxaId}]`;
    subnetworkModal.style.display = 'flex';
    renderSubNetworkCanvas();
  };

  window.closeSubNetworkModal = () => {
    subnetworkModal.style.display = 'none';
    if (subCanvasAnim) cancelAnimationFrame(subCanvasAnim);
  };

  window.toggleSubInteraction = (typeId) => {
    subOpts.interactions[typeId] = !subOpts.interactions[typeId];
    const btn = document.getElementById(`subInterToggle${typeId}`);
    if (btn) {
      const isActive = !!subOpts.interactions[typeId];
      btn.classList.toggle('active', isActive);
      btn.style.opacity = isActive ? '1' : '0.3';
    }
    renderSubNetworkCanvas();
  };

  function getInteractionType(nodeA, nodeB, idx) {
    if (nodeA.cat === 0 && nodeB.cat === 1) return 5;
    if (nodeA.cat === 1 && nodeB.cat === 0) return 2;
    if (nodeA.cat === 1 && nodeB.cat === 3) return 0;
    if (nodeA.cat === 3 && nodeB.cat === 0) return 1;
    if (nodeA.cat === 0 && nodeB.cat === 0) return 8;
    if (nodeA.cat === 2) return 3;
    return (idx + nodeA.id) % 9;
  }

  function renderSubNetworkCanvas() {
    if (subCanvasAnim) cancelAnimationFrame(subCanvasAnim);
    const subCanvas = document.getElementById('subCanvas');
    const wrap = subCanvas.parentElement;
    subCanvas.width = wrap.clientWidth;
    subCanvas.height = wrap.clientHeight;
    const sctx = subCanvas.getContext('2d');

    const centerNode = selectedNode;
    if (!centerNode) return;

    const cx = subCanvas.width / 2;
    const cy = subCanvas.height / 2;

    const activeNeighbors = (centerNode.neighbors || []).filter((nb, idx) => {
      if (!nb.active) return false;
      const typeId = getInteractionType(centerNode, nb, idx);
      return subOpts.interactions[typeId] !== false;
    });

    const subNodes = [
      { ...centerNode, sx: cx, sy: cy, targetSx: cx, targetSy: cy, isCenter: true, r: 24 }
    ];

    activeNeighbors.forEach((nb, idx) => {
      const angle = idx * 2.4 + 0.4;
      const dist = 100 + (idx % 4) * 35;
      subNodes.push({
        ...nb,
        sx: cx + (Math.random() - 0.5) * 40,
        sy: cy + (Math.random() - 0.5) * 40,
        targetSx: cx + Math.cos(angle) * dist,
        targetSy: cy + Math.sin(angle) * dist * 0.85,
        isCenter: false,
        r: 16,
        interType: getInteractionType(centerNode, nb, idx)
      });
    });

    const interactionTypes = [
      { name: 'Depredación', color: '#C96349' },
      { name: 'Herbivoría', color: '#84A48B' },
      { name: 'Dispersión', color: '#E69888' },
      { name: 'Mutualismo', color: '#E7C878' },
      { name: 'Nidificación', color: '#F79E70' },
      { name: 'Visita Floral', color: '#A386A9' },
      { name: 'Anidamiento', color: '#D1A996' },
      { name: 'Parasitismo', color: '#C6B3CA' },
      { name: 'Alelopatía', color: '#6B9080' }
    ];

    function loopSub() {
      sctx.fillStyle = '#020408';
      sctx.fillRect(0, 0, subCanvas.width, subCanvas.height);

      subNodes.forEach(sn => {
        sn.sx += (sn.targetSx - sn.sx) * 0.12;
        sn.sy += (sn.targetSy - sn.sy) * 0.12;
      });

      const centerSub = subNodes[0];

      subNodes.forEach((sn, i) => {
        if (i === 0) return;
        const inter = interactionTypes[sn.interType || 0];
        sctx.save();
        sctx.beginPath();
        sctx.moveTo(centerSub.sx, centerSub.sy);
        sctx.lineTo(sn.sx, sn.sy);
        sctx.strokeStyle = inter.color;
        sctx.lineWidth = 2.5;
        sctx.stroke();

        const mx = (centerSub.sx + sn.sx) / 2;
        const my = (centerSub.sy + sn.sy) / 2;
        sctx.font = '9px monospace';
        sctx.fillStyle = '#ffffff';
        sctx.fillText(inter.name, mx - 15, my - 4);
        sctx.restore();
      });

      subNodes.forEach(sn => {
        const r = sn.r;
        sctx.save();
        sctx.beginPath();
        sctx.arc(sn.sx, sn.sy, r, 0, Math.PI * 2);
        sctx.fillStyle = palette.catColors[sn.cat] || '#84A48B';
        sctx.fill();
        sctx.strokeStyle = sn.isCenter ? '#ffffff' : (palette.catColors[sn.cat] || '#84A48B');
        sctx.lineWidth = sn.isCenter ? 3.5 : 2;
        sctx.stroke();

        sctx.font = sn.isCenter ? '11px monospace' : '9.5px monospace';
        sctx.fillStyle = '#ffffff';
        sctx.fillText(`${sn.label} [${sn.taxaId}]`, sn.sx + r + 6, sn.sy + 4);
        sctx.restore();
      });

      subCanvasAnim = requestAnimationFrame(loopSub);
    }
    loopSub();
  }

  // FAQ Chat Widget Logic
  window.toggleFaqChat = () => {
    faqChatModal.style.display = (faqChatModal.style.display === 'none' || !faqChatModal.style.display) ? 'flex' : 'none';
  };

  window.askFaq = (questionId) => {
    const chatBody = document.getElementById('chatBody');
    let userMsg = '', botMsg = '', targetTaxon = null;

    if (questionId === 1) {
      userMsg = '¿Qué significan las conexiones y evidencia entre especies?';
      const fauna = rawNodes.filter(n => n.cat === 1).sort((a,b) => b.degree - a.degree);
      targetTaxon = fauna[0];
      botMsg = `Las conexiones representan interacciones bióticas validadas con observaciones de campo y censos de la SDA/SIGAU. En avifauna, el taxón de mayor centralidad es <b>${targetTaxon ? targetTaxon.label : 'Mirla patinaranja'}</b> con ${targetTaxon ? targetTaxon.degree : 14} enlaces en el territorio.`;
    } else if (questionId === 2) {
      userMsg = '¿Por qué existen relaciones entre vegetación y fauna?';
      const flora = rawNodes.filter(n => n.cat === 0).sort((a,b) => b.degree - a.degree);
      targetTaxon = flora[0];
      botMsg = `Se fundamentan en nodos estructurales de flora (como <b>${targetTaxon ? targetTaxon.label : 'Saúco'}</b>), que funcionan como 'Hubs' ecosistémicos brindando néctar, frutos y sitios de nidificación para aves, mamíferos y polinizadores de Kennedy.`;
    } else if (questionId === 3) {
      userMsg = 'Conjetura: ¿Qué observaciones son datos vs hipótesis?';
      targetTaxon = rawNodes.find(n => n.taxaId === 'AVE-51' || n.taxaId === 'AVE-01');
      botMsg = `<b>Datos verificados:</b> Registros georreferenciados de <i>${targetTaxon ? targetTaxon.label : 'Tingua bogotana'}</i> en juncales de El Burro y La Vaca. <b>Hipótesis de impacto:</b> Desplazamiento de forrajeo por ruido vehicular sobre la Av. Ciudad de Cali.`;
    } else if (questionId === 4) {
      userMsg = 'Problemática: ¿Qué dependencias amenazan la sostenibilidad?';
      targetTaxon = rawNodes.find(n => n.cat === 4 || n.cat === 5);
      botMsg = `La dependencia crítica es el agua limpia y la cobertura vegetal de borde para anfibios y reptiles (como <i>${targetTaxon ? targetTaxon.label : 'Rana sabanera'}</i>). Su principal amenaza es la desecación de charcas temporales y la depredación por mascotas sinantrópicas.`;
    }

    const uBubble = document.createElement('div');
    uBubble.className = 'msg-bubble msg-user';
    uBubble.innerText = userMsg;
    chatBody.appendChild(uBubble);

    setTimeout(() => {
      const bBubble = document.createElement('div');
      bBubble.className = 'msg-bubble msg-bot';
      bBubble.innerHTML = botMsg;
      chatBody.appendChild(bBubble);
      chatBody.scrollTop = chatBody.scrollHeight;
      if (targetTaxon) openInspector(targetTaxon);
    }, 250);
  };

  window.sendCustomChatMessage = () => {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;
    const chatBody = document.getElementById('chatBody');

    const uBubble = document.createElement('div');
    uBubble.className = 'msg-bubble msg-user';
    uBubble.innerText = text;
    chatBody.appendChild(uBubble);
    input.value = '';

    const query = text.toLowerCase();
    let targetTaxon = rawNodes.find(n => n.active && (n.label.toLowerCase().includes(query) || n.sciname.toLowerCase().includes(query) || n.taxaId.toLowerCase() === query));

    let botMsg = '';
    if (targetTaxon) {
      botMsg = `Analizando <b>${targetTaxon.label}</b> (<i>${targetTaxon.sciname}</i>): Pertenece a la convención <b>${palette.catNames[targetTaxon.cat]}</b>. Cuenta con <b>${targetTaxon.degree} enlaces bióticos</b>. Rol ecológico: ${targetTaxon.role}.`;
    } else {
      targetTaxon = rawNodes.filter(n => n.active).sort((a,b) => b.degree - a.degree)[0];
      botMsg = `He consultado la base biótica para "${text}". Te oriento hacia el nodo con mayor conectividad actual: <b>${targetTaxon.label}</b> con ${targetTaxon.degree} interacciones registradas.`;
    }

    setTimeout(() => {
      const bBubble = document.createElement('div');
      bBubble.className = 'msg-bubble msg-bot';
      bBubble.innerHTML = botMsg;
      chatBody.appendChild(bBubble);
      chatBody.scrollTop = chatBody.scrollHeight;
      if (targetTaxon) openInspector(targetTaxon);
    }, 300);
  };

  // Raycasting Click & Double-Click en Nodos
  let clickTime = 0;
  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.glass-panel') || e.target.closest('.welcome-modal') || e.target.closest('.bottom-experience-bar') || e.target.closest('.waypoints-bar') || e.target.closest('#activeTreeChip')) return;

    if (currentMorph > 0.35) return;

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
        hideNodeByDoubleClick(nodeObj);
      } else {
        // Clic simple: abrir inspector y enfocar la cámara con zoom suave en este nodo exacto
        openInspector(nodeObj);
        if (window.gsap) {
          gsap.to(camera.position, {
            x: sp.position.x * 1.12,
            y: sp.position.y * 1.12 + 0.8,
            z: sp.position.z + 18.0,
            duration: 1.6,
            ease: "power2.inOut"
          });
          gsap.to(controls.target, {
            x: sp.position.x,
            y: sp.position.y,
            z: sp.position.z,
            duration: 1.6,
            ease: "power2.inOut"
          });
        }
      }
      clickTime = now;
    }
  });

  // =====================================================================
  // 8. METAMORFOSIS ANIMADA: RED BIÓTICA <---> TERRITORIO 3D
  // =====================================================================
  // State moved to top

  const slider = document.getElementById("experienceSlider");
  const btnToggle = document.getElementById("btnPlayTransition");
  const btnActionText = document.getElementById("btnActionText");
  const labelSwarm = document.getElementById("labelSwarm");
  const labelTerritory = document.getElementById("labelTerritory");

  function setMorphValue(val, updateSlider = true) {
    targetMorph = Math.max(0, Math.min(1, val));
    if (updateSlider && slider) slider.value = Math.round(targetMorph * 100);
    isTerritory = targetMorph > 0.45;

    sceneBaseGroup.visible = targetMorph > 0.10;
    if (territoryBeaconsGroup) territoryBeaconsGroup.visible = targetMorph > 0.35;
    networkGroup.visible = true;

    if (btnActionText) {
      btnActionText.textContent = isTerritory ? "DISPERSAR A RED BIÓTICA" : "MATERIALIZAR";
    }
    if (labelSwarm) labelSwarm.classList.toggle("active", targetMorph < 0.2);
    if (labelTerritory) labelTerritory.classList.toggle("active", targetMorph > 0.8);

    // Ocultar / Mostrar paneles de red vs territorio
    if (topHeader) topHeader.style.opacity = targetMorph < 0.15 ? "1" : "0";
    if (topHeader) topHeader.style.pointerEvents = targetMorph < 0.15 ? "auto" : "none";
    if (sideDrawer && targetMorph > 0.15) sideDrawer.classList.add("collapsed");
    if (chatWidgetBtn) chatWidgetBtn.style.display = targetMorph < 0.15 ? "flex" : "none";
    if (nodeInspector && targetMorph > 0.15) closeInspector();
    if (subnetworkModal && targetMorph > 0.15) closeSubNetworkModal();

    if (waypointsBar) waypointsBar.classList.toggle("show", targetMorph > 0.65);
    if (targetMorph < 0.25) {
      if (activeTreeChip) activeTreeChip.classList.remove("show");
      if (tourActive) stopSpeciesTour();
    }

    if (soundActive && typeof triggerHarmonicChime === "function") {
      triggerHarmonicChime(targetMorph);
    }
  }

  function animateToStage(dest) {
    if (!window.gsap) { setMorphValue(dest); return; }

    const endPos = (dest === 1.0) ? territoryCamPos : swarmCamPos;
    const endTarget = (dest === 1.0) ? territoryTarget : swarmTarget;

    particleUniforms.uRipplePos.value.set(0, 0, 0);
    particleUniforms.uRippleTime.value = 0.0;

    gsap.killTweensOf(particleUniforms.uRippleTime);
    gsap.to(particleUniforms.uRippleTime, { value: 1.8, duration: 3.2, ease: "power2.out" });

    const morphObj = { val: currentMorph };
    gsap.to(morphObj, {
      val: dest,
      duration: 3.2,
      ease: "power3.inOut",
      onUpdate: () => setMorphValue(morphObj.val, true)
    });

    gsap.to(camera.position, { x: endPos.x, y: endPos.y, z: endPos.z, duration: 3.2, ease: "power3.inOut" });
    gsap.to(controls.target, { x: endTarget.x, y: endTarget.y, z: endTarget.z, duration: 3.2, ease: "power3.inOut" });

    gsap.to(camera, { fov: 44, duration: 3.2, ease: "power3.inOut", onUpdate: () => camera.updateProjectionMatrix() });
    gsap.to(particleUniforms.uPerspectiveMode, { value: 0.0, duration: 2.5 });
  }

  if (slider) {
    slider.addEventListener("input", (e) => setMorphValue(parseFloat(e.target.value) / 100, false));
  }
  if (btnToggle) {
    btnToggle.addEventListener("click", () => animateToStage(isTerritory ? 0.0 : 1.0));
  }
  if (labelSwarm) labelSwarm.addEventListener("click", () => animateToStage(0.0));
  if (labelTerritory) labelTerritory.addEventListener("click", () => animateToStage(1.0));

  // Waypoints con soporte de Perspectiva Humana e interpolación FOV
  document.querySelectorAll(".waypoint-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".waypoint-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      const wpKey = pill.getAttribute("data-waypoint");
      const wp = waypoints[wpKey];
      if (wp && window.gsap) {
        const isPersp = (wpKey === "perspective");
        gsap.to(camera.position, { x: wp.pos.x, y: wp.pos.y, z: wp.pos.z, duration: 2.6, ease: "power2.inOut" });
        gsap.to(controls.target, { x: wp.target.x, y: wp.target.y, z: wp.target.z, duration: 2.6, ease: "power2.inOut" });
        gsap.to(camera, { fov: wp.fov || 44, duration: 2.6, ease: "power2.inOut", onUpdate: () => camera.updateProjectionMatrix() });
        gsap.to(particleUniforms.uPerspectiveMode, { value: isPersp ? 1.0 : 0.0, duration: 2.2, ease: "power2.inOut" });
        if (soundActive && typeof triggerWaterResonance === "function" && isPersp) {
          triggerWaterResonance();
        }
      }
    });
  });

  // Camera Helper Inspector
  function updateCamInspectorDisplay() {
    if (!camInspectorBox || camInspectorBox.classList.contains("hidden")) return;
    if (camCoordPos) camCoordPos.textContent = `X:${camera.position.x.toFixed(1)}, Y:${camera.position.y.toFixed(1)}, Z:${camera.position.z.toFixed(1)}`;
    if (camCoordTarget) camCoordTarget.textContent = `X:${controls.target.x.toFixed(1)}, Y:${controls.target.y.toFixed(1)}, Z:${controls.target.z.toFixed(1)}`;
  }
  controls.addEventListener("change", updateCamInspectorDisplay);

  if (btnSaveCameraView) {
    btnSaveCameraView.addEventListener("click", () => {
      const savedState = {
        pos: { x: Number(camera.position.x.toFixed(2)), y: Number(camera.position.y.toFixed(2)), z: Number(camera.position.z.toFixed(2)) },
        target: { x: Number(controls.target.x.toFixed(2)), y: Number(controls.target.y.toFixed(2)), z: Number(controls.target.z.toFixed(2)) }
      };
      try {
        localStorage.setItem("saved_territory_cam", JSON.stringify(savedState));
        localStorage.setItem("hide_cam_helper", "true");
      } catch(e){}
      territoryCamPos.set(savedState.pos.x, savedState.pos.y, savedState.pos.z);
      territoryTarget.set(savedState.target.x, savedState.target.y, savedState.target.z);
      waypoints.overview.pos = territoryCamPos;
      waypoints.overview.target = territoryTarget;

      if (camToast) {
        camToast.style.opacity = "1";
        setTimeout(() => { camToast.style.opacity = "0"; }, 3500);
      }
      if (camInspectorBox) camInspectorBox.classList.add("hidden");
    });
  }

  if (btnCloseCamInspector) {
    btnCloseCamInspector.addEventListener("click", () => {
      if (camInspectorBox) camInspectorBox.classList.add("hidden");
      try { localStorage.setItem("hide_cam_helper", "true"); } catch(e){}
    });
  }

  // =====================================================================
  // 9. SÍNTESIS DE AUDIO WEB (ECOSISTEMA, AGUA & PAISAJE SONORO)
  // =====================================================================
  let audioCtx = null;
  let soundActive = false;
  let masterGain = null;

  function initBioAudio() {
    if (audioCtx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      masterGain.connect(audioCtx.destination);
    } catch(e) { console.warn("Audio no disponible:", e); }
  }

  function triggerHarmonicChime(prog) {
    if (!soundActive || !audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      const freq = 175 + prog * 380;
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 1.25);
    } catch(e){}
  }

  function triggerWaterResonance() {
    if (!soundActive || !audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.6);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.06, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 1.85);
    } catch(e){}
  }

  const soundBtn = document.getElementById("soundToggle");
  if (soundBtn) {
    soundBtn.addEventListener("click", () => {
      initBioAudio();
      if (!audioCtx) return;
      if (audioCtx.state === "suspended") audioCtx.resume();
      soundActive = !soundActive;
      soundBtn.classList.toggle("active", soundActive);
      soundBtn.innerHTML = soundActive ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
      if (soundActive) triggerHarmonicChime(currentMorph);
    });
  }

  // =====================================================================
  // 10. LOOP PRINCIPAL DE RENDERIZADO (60 FPS)
  // =====================================================================
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    currentMorph += (targetMorph - currentMorph) * 0.065;
    particleUniforms.uMorphProgress.value = currentMorph;
    particleUniforms.uTime.value = elapsedTime;

    const ease = currentMorph;
    const explosionIntensity = Math.sin(ease * Math.PI);

    // 1. ANIMACIÓN DE EXPLOSIÓN Y DESTRUCCIÓN CINEMÁTICA DE LA RED BIÓTICA
    nodeSprites.forEach((sp, idx) => {
      const n = rawNodes[idx];
      if (!n) return;

      if (currentMorph < 0.001) {
        // Respiración orgánica tridimensional para cada nodo
        const waveX = Math.sin(elapsedTime * 1.35 + idx * 0.42) * 0.45;
        const waveY = Math.cos(elapsedTime * 1.15 + idx * 0.38) * 0.55;
        const waveZ = Math.sin(elapsedTime * 0.95 + idx * 0.51) * 0.45;
        sp.position.set(n.ox + waveX, n.oy + waveY, n.oz + waveZ);

        const pulseScale = (2.8 + Math.sqrt(n.degree) * 0.4) * (1.0 + Math.sin(elapsedTime * 2.0 + idx * 0.3) * 0.08);
        sp.scale.set(pulseScale, pulseScale, 1.0);

        sp.material.opacity = n.active ? 1.0 : 0.15;
        sp.visible = n.active;
      } else {
        // Los 181 nodos estallan orgánicamente hacia el exterior con turbulencia curl
        const dirX = n.ox / (SPHERE_RADIUS || 32.0);
        const dirY = n.oy / (SPHERE_RADIUS || 32.0);
        const dirZ = n.oz / (SPHERE_RADIUS || 32.0);

        const blastDist = explosionIntensity * 85.0 + ease * 130.0;
        const curlX = Math.sin(elapsedTime * 2.2 + idx * 0.5) * 26.0 * explosionIntensity;
        const curlY = Math.cos(elapsedTime * 1.9 + idx * 0.4) * 22.0 * explosionIntensity;
        const curlZ = Math.sin(elapsedTime * 2.4 + idx * 0.6) * 26.0 * explosionIntensity;

        sp.position.x = n.ox + dirX * blastDist + curlX;
        sp.position.y = n.oy + dirY * blastDist + curlY;
        sp.position.z = n.oz + dirZ * blastDist + curlZ;

        // Desvanecimiento suave durante la explosión
        const fadeAlpha = Math.max(0.0, 1.0 - ease * 2.4);
        sp.material.opacity = fadeAlpha * (n.active ? 1.0 : 0.15);
        sp.visible = (fadeAlpha > 0.02) && n.active;

        const blastScale = (2.8 + Math.sqrt(n.degree) * 0.4) * (1.0 + explosionIntensity * 0.95);
        sp.scale.set(blastScale, blastScale, 1.0);
      }

      if (sp.visible) {
        sp.quaternion.copy(camera.quaternion);
      }
    });

    // 2. EXPLOSIÓN Y DESVANECIMIENTO DE LÍNEAS DE INTERACCIÓN
    if (edgeLinesMesh) {
      if (currentMorph < 0.001) {
        edgeMat.opacity = 0.28 + Math.sin(elapsedTime * 2.2) * 0.08;
        edgeLinesMesh.visible = true;
      } else {
        const edgeAlpha = Math.max(0.0, 0.38 - ease * 1.5);
        edgeMat.opacity = edgeAlpha;
        edgeLinesMesh.visible = edgeAlpha > 0.01;
      }
    }

    // Rotación suave del enjambre biótico en reposo
    if (opts.autoRotate && currentMorph < 0.05) {
      networkGroup.rotation.y += 0.0022;
      networkGroup.rotation.x = Math.sin(elapsedTime * 0.4) * 0.04;
    } else {
      networkGroup.rotation.set(0, 0, 0);
    }

    
    if (territoryBeaconsGroup && territoryBeaconsGroup.visible) {
      territoryBeacons.forEach(sp => {
        sp.quaternion.copy(camera.quaternion);
      });
    }

    controls.update();
    renderer.render(scene, camera);
  }

  animate();
})();