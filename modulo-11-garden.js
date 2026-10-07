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

  const slider = document.getElementById("experienceSlider");
  const btnToggle = document.getElementById("btnPlayTransition");
  const btnActionText = document.getElementById("btnActionText");
  const labelSwarm = document.getElementById("labelSwarm");
  const labelTerritory = document.getElementById("labelTerritory");

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

  function buildFullDataset() {
    const taxa = [];

    // 1. AVES (248 Taxones del Excel de Monitoreo iNaturalist Kennedy)
    const avesData = [
      ['AVE-001', 'Turdus fuscater gigas', 'Turdus fuscater gigas', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Turdus fuscater gigas.jpeg'],
      ['AVE-002', 'Zenaida auriculata pentheria', 'Zenaida auriculata pentheria', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Zenaida auriculata pentheria.png'],
      ['AVE-003', 'Thraupis palmarum atripennis', 'Thraupis palmarum atripennis', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://static.inaturalist.org/photos/69262665/medium.png'],
      ['AVE-004', 'Zonotrichia capensis costaricensis', 'Zonotrichia capensis costaricensis', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Zonotrichia capensis costaricensis.png'],
      ['AVE-005', 'Troglodytes musculus columbae', 'Troglodytes musculus columbae', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Troglodytes musculus columbae.png'],
      ['AVE-006', 'Sicalis luteola bogotensis', 'Sicalis luteola bogotensis', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Sicalis luteola bogotensis.jpeg'],
      ['AVE-007', 'Stelgidopteryx ruficollis uropygialis', 'Stelgidopteryx ruficollis uropygialis', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Stelgidopteryx ruficollis uropygialis.jpg'],
      ['AVE-008', 'Vanellus chilensis cayennensis', 'Vanellus chilensis cayennensis', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Universidad Distrital Francisco JosÃ© De Caldas - Sede Bosa El Porvenir', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Vanellus chilensis cayennensis.jpeg'],
      ['AVE-009', 'Asio stygius robustus', 'Asio stygius robustus', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Asio stygius robustus.jpg'],
      ['AVE-010', 'Geranoaetus melanoleucus australis', 'Geranoaetus melanoleucus australis', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Urb. La Estancia, FontibÃ³n, BogotÃ¡, Colombia', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/705103444/medium.jpg'],
      ['AVE-011', 'Geranoaetus', 'ÃÁguilas y Aguiluchos', 'Depredador tope / Control biológico de roedores y reptiles', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Águilas y Aguiluchos.jpeg'],
      ['AVE-012', 'Anas platyrhynchos domesticus', 'ÃÁnade azulÃón domÃéstico', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/28247708/medium.jpeg'],
      ['AVE-013', 'Ganso cisne domÃéstico', 'Anser cygnoides domesticus', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Mundo Aventura, BogotÃ¡, BogotÃ¡, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/506023235/medium.jpg'],
      ['AVE-014', 'Gallinago delicata', 'Agachona Norteamericana', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Agachona Norteamericana.jpeg'],
      ['AVE-015', 'Buteo platypterus', 'Aguililla Alas Anchas', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Aguililla Alas Anchas.jpeg'],
      ['AVE-016', 'Aguililla caminera', 'Aves', 'Consumidor secundario / Insectívoro de follaje y dosel', 'BogotÃ¡, Colombia', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Aguililla caminera.jpeg'],
      ['AVE-017', 'Geranoaetus albicaudatus', 'Aguililla cola blanca', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Aguililla cola blanca.jpg'],
      ['AVE-018', 'Buteo brachyurus', 'Aguililla cola corta', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Aguililla cola corta.jpeg'],
      ['AVE-019', 'Buteo', 'Aguilillas y parientes', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Aguilillas y parientes.jpeg'],
      ['AVE-020', 'Phaetusa simplex', 'AtÃí', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/303533503/medium.jpg'],
      ['AVE-021', 'Systellura longirostris', 'Atajacaminos ÃñaÃñarca', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/420734/medium.jpg'],
      ['AVE-022', 'Atlapetes pallidinucha', 'atlapetes cabecipÃ¡lido', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/28648187/medium.jpeg'],
      ['AVE-023', 'Megascops choliba', 'Autillo comÃún', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/84447821/medium.jpeg'],
      ['AVE-024', 'Vanellus chilensis', 'AvefrÃía Tero', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Vanellus chilensis cayennensis.jpeg'],
      ['AVE-025', 'Aves', 'Aves', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Aves de percha.jpeg'],
      ['AVE-026', 'Passeriformes', 'Aves de percha', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Aves de percha.jpeg'],
      ['AVE-027', 'Elanus leucurus leucurus', 'BailarÃín', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/29281312/medium.jpeg'],
      ['AVE-028', 'Asio flammeus bogotensis', 'BÃúho Campestre de los Andes Ecuatoriales', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/31149636/medium.jpeg'],
      ['AVE-029', 'BÃúho Cara Blanca', 'Aves', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Kr 79 - Cl 10D - 59, BogotÃ¡, Colombia', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/40563582/medium.jpeg'],
      ['AVE-030', 'Bubo virginianus', 'BÃúho cornudo', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/86248675/medium.jpeg'],
      ['AVE-031', 'Asio flammeus', 'BÃúho Sabanero', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/84548198/medium.jpeg'],
      ['AVE-032', 'Asio', 'BÃúhos orejones', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Asio stygius robustus.jpg'],
      ['AVE-033', 'BÃúhos y tecolotes', 'Strigidae', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Cundinamarca, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/452910772/medium.jpeg'],
      ['AVE-034', 'Strigiformes', 'BÃúhos, lechuzas y tecolotes', 'Depredador tope / Control biológico de roedores y reptiles', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/87058787/medium.jpeg'],
      ['AVE-035', 'Heliodoxa jacula', 'Brillante Coroniverde', 'Polinizador nectarívoro / Forrajeo de flores tubulares', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Brillante Coroniverde.jpg'],
      ['AVE-036', 'Contopus fumigatus', 'Burlisto copetÃón', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://static.inaturalist.org/photos/251178470/medium.jpeg'],
      ['AVE-037', 'Burrito pico rojo', 'Mustelirallus erythrops', 'Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas', 'Transversal 81, BogotÃ¡, DC, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Burrito pico rojo.jpg'],
      ['AVE-038', 'Buteo platypterus platypterus', 'Busardo aliancho continental', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Busardo aliancho continental.jpeg'],
      ['AVE-039', 'Buteonine Hawks, Kites, and allies', 'Buteoninae', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Calle 6D, BogotÃ¡, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://static.inaturalist.org/photos/285661203/medium.jpg'],
      ['AVE-040', 'caica de pÃ¡ramo', 'Gallinago nobilis', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Cundinamarca, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://static.inaturalist.org/photos/37745697/medium.jpg'],
      ['AVE-041', 'Icterus galbula', 'Calandria de Baltimore', 'Frugívoro & Granívoro / Dispersión zoócora de semillas', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Calandria de Baltimore.jpeg'],
      ['AVE-042', 'Icterus chrysater', 'Calandria Dorso Amarillo', 'Frugívoro & Granívoro / Dispersión zoócora de semillas', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Calandria Dorso Amarillo.jpeg'],
      ['AVE-043', 'Icteridae', 'Calandrias, tordos, caciques, oropÃéndolas, zanates, praderos y parientes', 'Frugívoro & Granívoro / Dispersión zoócora de semillas', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Tordos.jpg'],
      ['AVE-044', 'Calzadito Cobrizo', 'Eriocnemis cupreoventris', 'Polinizador nectarívoro / Forrajeo de flores tubulares', 'Cundinamarca, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Calzadito Cobrizo.jpeg'],
      ['AVE-045', 'Eriocnemis vestita', 'Calzadito Reluciente', 'Polinizador nectarívoro / Forrajeo de flores tubulares', 'Cundinamarca, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Calzadito Reluciente.jpg'],
      ['AVE-046', 'Sicalis flaveola', 'Canario coronado', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Canario coronado.jpeg'],
      ['AVE-047', 'Canarios o Jilgueros', 'Sicalis', 'Frugívoro & Granívoro / Dispersión zoócora de semillas', 'AV. Esperanza - KR 96H, BogotÃ¡, Colombia', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Canarios o Jilgueros.jpeg'],
      ['AVE-048', 'Tricolored Munia', 'Lonchura malacca', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Carrera 83 7D-02, BogotÃ¡, DC, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/41187316/medium.jpg'],
      ['AVE-049', 'Caracara plancus', 'Carancho', 'Depredador tope / Control biológico de roedores y reptiles', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Carancho.jpeg'],
      ['AVE-050', 'Carpintero habado', 'Melanerpes rubricapillus', 'Consumidor secundario / Insectívoro de follaje y dosel', '11011, BogotÃ¡, Colombia', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Carpintero habado.jpg'],
      ['AVE-051', 'Aramus guarauna', 'Carrao', 'Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Carrao.jpeg'],
      ['AVE-052', 'Mimus gilvus', 'Centzontle tropical', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Centzontle tropical.jpeg'],
      ['AVE-053', 'Centzontles', 'Mimus', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Carrera 72C, BogotÃ¡, BogotÃ¡, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Centzontles.jpg'],
      ['AVE-054', 'Blue-winged Teal', 'Spatula discors', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Cra. 80f #41b Sur-1 a 41b Sur-37, BogotÃ¡, Colombia', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://static.inaturalist.org/photos/17142991/medium.jpeg'],
      ['AVE-055', 'Falco sparverius', 'CernÃícalo americano', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/112161199/medium.jpeg'],
      ['AVE-056', 'Synallaxis subpudica', 'chamicero cundiboyacense', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/chamicero cundiboyacense.jpeg'],
      ['AVE-057', 'Chlidonias niger', 'CharrÃ¡n negro', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/193324778/medium.jpg'],
      ['AVE-058', 'ChimachimÃ¡', 'Daptrius chimachima', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Cra. 112c #12c-2 a Avenida Carrera 68, 12c, BogotÃ¡, Colombia', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/334885041/medium.jpeg'],
      ['AVE-059', 'Northern Yellow Warbler', 'Setophaga aestiva', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Cra. 80f #41b Sur-2 a 41b Sur-38, BogotÃ¡, Colombia', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://static.inaturalist.org/photos/17141267/medium.jpeg'],
      ['AVE-060', 'Setophaga striata', 'Chipe Cabeza Negra', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Chipe Cabeza Negra.jpg'],
      ['AVE-061', 'Setophaga castanea', 'Chipe castaÃño', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/104483730/medium.jpg'],
      ['AVE-062', 'Setophaga cerulea', 'Chipe Celeste', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Chipe Celeste.jpeg'],
      ['AVE-063', 'Parkesia noveboracensis', 'Chipe charquero', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Chipe charquero.jpeg'],
      ['AVE-064', 'Cardellina canadensis', 'Chipe de collar', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Chipe de collar.jpeg'],
      ['AVE-065', 'Geothlypis philadelphia', 'Chipe de Pechera', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Chipe de Pechera.jpeg'],
      ['AVE-066', 'Setophaga fusca', 'Chipe garganta naranja', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Chipe garganta naranja.jpeg'],
      ['AVE-067', 'Leiothlypis peregrina', 'Chipe peregrino', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Chipe peregrino.jpeg'],
      ['AVE-068', 'Setophaga pitiayumi', 'Chipe Tropical', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Chipe Tropical.jpeg'],
      ['AVE-069', 'Chipes', 'Setophaga', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Diagonal 2A, BogotÃ¡, BogotÃ¡, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Chipes.jpg'],
      ['AVE-070', 'Vireo chivi', 'ChivÃí ChivÃí', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://static.inaturalist.org/photos/260911087/medium.jpeg'],
      ['AVE-071', 'Charadrius vociferus', 'Chorlo tildÃío', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/422670709/medium.jpeg'],
      ['AVE-072', 'Chordeiles', 'Chotacabras', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Chotacabras.jpg'],
      ['AVE-073', 'Chotacabras zumbÃón', 'Aves', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Saturno, FontibÃ³n, BogotÃ¡, Bogota, Colombia', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Chotacabras.jpg'],
      ['AVE-074', 'colibrÃí aliazul', 'Aves', 'Polinizador nectarívoro / Forrajeo de flores tubulares', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/676373428/medium.jpg'],
      ['AVE-075', 'ColibrÃí Colilargo Mayor', 'Aves', 'Polinizador nectarívoro / Forrajeo de flores tubulares', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/481712500/medium.jpg'],
      ['AVE-076', 'ColibrÃí de Mulsant', 'Chaetocercus mulsant', 'Polinizador nectarívoro / Forrajeo de flores tubulares', 'Ciudad Kennedy Occidental, Antonio NariÃ±o, BogotÃ¡, Bogota, Colombia', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://static.inaturalist.org/photos/471468500/medium.jpeg'],
      ['AVE-077', 'ColibrÃí picoespada', 'Aves', 'Polinizador nectarívoro / Forrajeo de flores tubulares', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/703800163/medium.jpg'],
      ['AVE-078', 'Colibri coruscans', 'ColibrÃí Rutilante', 'Polinizador nectarívoro / Forrajeo de flores tubulares', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://static.inaturalist.org/photos/17113330/medium.jpeg'],
      ['AVE-079', 'ColibrÃíes', 'Trochilidae', 'Polinizador nectarívoro / Forrajeo de flores tubulares', 'Carrera 69D, BogotÃ¡, DC, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/70401785/medium.jpg'],
      ['AVE-080', 'Colibri', 'ColibrÃíes oreja violeta', 'Polinizador nectarívoro / Forrajeo de flores tubulares', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://static.inaturalist.org/photos/36851695/medium.jpeg'],
      ['AVE-081', 'Grallaria ruficapilla', 'ComprapÃ¡n', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/142836531/medium.jpeg'],
      ['AVE-082', 'Coccyzus americanus', 'Cuclillo pico amarillo', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Cuclillo pico amarillo.jpeg'],
      ['AVE-083', 'Aves', '1960', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Aves de percha.jpeg'],
      ['AVE-084', 'Phimosus infuscatus', 'Cuervillo cara pelada', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Cuervillo cara pelada.jpeg'],
      ['AVE-085', 'Cranioleuca curtata', 'curutiÃé cejigrÃís', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/361096496/medium.jpg'],
      ['AVE-086', 'North American White-tailed Kite', 'Elanus leucurus majusculus', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Villa Nelly Iii, BogotÃ¡, BogotÃ¡, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/583975065/medium.jpg'],
      ['AVE-087', 'Falco columbarius columbarius', 'esmerejÃón de la taiga', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://static.inaturalist.org/photos/335767168/medium.jpeg'],
      ['AVE-088', 'Aves', '9487', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Aves de percha.jpeg'],
      ['AVE-089', 'Aves', '16733', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Aves de percha.jpeg'],
      ['AVE-090', 'FiofÃío silbÃón', 'Elaenia albiceps', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Mandalay, Antonio NariÃ±o, BogotÃ¡, Bogota, Colombia', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://static.inaturalist.org/photos/380590501/medium.jpeg'],
      ['AVE-091', 'Fulica americana columbiana', 'Focha comÃún', 'Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/302944605/medium.jpeg'],
      ['AVE-092', 'Fulica americana', 'Gallareta americana', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Gallareta americana.jpeg'],
      ['AVE-093', 'Gallaretas, polluelas y pollas de agua', 'Rallidae', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedal El Burro', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Gallaretas, polluelas y pollas de agua.jpeg'],
      ['AVE-094', 'Common Gallinule', 'Gallinula galeata', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Santaf? de Bogot?, CO-CU, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://static.inaturalist.org/photos/5186393/medium.jpeg'],
      ['AVE-095', 'Gallineta morada', 'Porphyrio martinica', 'Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas', 'Cra. 80f #41b Sur-2 a 41b Sur-38, BogotÃ¡, Colombia', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Gallineta morada.jpeg'],
      ['AVE-096', 'Gallinetas', 'Gallinula', 'Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas', 'humedal la vaca', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Gallinetas.jpeg'],
      ['AVE-097', 'Ganso comÃún', 'Anser anser', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Carrera 103A, BogotÃ¡, BogotÃ¡, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/569423540/medium.jpg'],
      ['AVE-098', 'Egretta caerulea', 'Garceta azul', 'Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Garceta azul.jpg'],
      ['AVE-099', 'Ardea ibis', 'Garcilla bueyera occidental', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Garcilla bueyera occidental.jpeg'],
      ['AVE-100', 'Green Heron', 'Butorides virescens', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedal La Vaca, BogotÃ¡, DC, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://static.inaturalist.org/photos/60568039/medium.jpg'],
      ['AVE-101', 'Striated Heron', 'Butorides striata', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Cra. 80f #41b Sur-2 a 41b Sur-38, BogotÃ¡, Colombia', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://static.inaturalist.org/photos/17119902/medium.jpeg'],
      ['AVE-102', 'Garrapatero mayor', 'Aves', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Sabanagrande, BogotÃ¡, Bogota, Colombia', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Garrapatero mayor.jpeg'],
      ['AVE-103', 'Garza blanca', 'Ardea alba', 'Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas', 'Carrera 80A 17-75, BogotÃ¡, DC, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Garza blanca.jpg'],
      ['AVE-104', 'Aves', '4940', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Aves de percha.jpeg'],
      ['AVE-105', 'Nycticorax nycticorax', 'Garza Nocturna Corona Negra', 'Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Garza Nocturna Corona Negra.jpeg'],
      ['AVE-106', 'Garzas', 'Ardeidae', 'Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas', 'San Bernardino', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Garzas.jpeg'],
      ['AVE-107', 'Ardeinae', 'Garzas, garcetas, garcillas y martinetes', 'Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Garzas, garcetas, garcillas y martinetes.jpeg'],
      ['AVE-108', 'Chondrohierax uncinatus', 'GavilÃ¡n Pico de Gancho', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://static.inaturalist.org/photos/659819383/medium.jpg'],
      ['AVE-109', 'Aves', '68826', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Aves de percha.jpeg'],
      ['AVE-110', 'Progne tapera', 'Golondrina parda', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Golondrina parda.jpeg'],
      ['AVE-111', 'Orochelidon murina', 'Golondrina plomiza', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Golondrina plomiza.jpg'],
      ['AVE-112', 'Riparia riparia', 'Golondrina ribereÃña', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/123837685/medium.jpeg'],
      ['AVE-113', 'Petrochelidon pyrrhonota', 'Golondrina risquera', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Golondrina risquera.jpeg'],
      ['AVE-114', 'Hirundo rustica', 'Golondrina tijereta', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Golondrina tijereta.jpeg'],
      ['AVE-115', 'Hirundinidae', 'Golondrinas', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Golondrinas.jpeg'],
      ['AVE-116', 'Progne', 'Golondrinas o martines', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Golondrinas o martines.jpeg'],
      ['AVE-117', 'Aves', '9869', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Aves de percha.jpeg'],
      ['AVE-118', 'Zonotrichia capensis', 'GorriÃón Chingolo', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Zonotrichia capensis costaricensis.png'],
      ['AVE-119', 'Zonotrichia', 'Gorriones y Copetones', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Zonotrichia capensis costaricensis.png'],
      ['AVE-120', 'Grandes garzas', 'Ardea', 'Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas', 'Carrera 96F, BogotÃ¡, DC, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Grandes garzas.jpg'],
      ['AVE-121', 'Steatornis caripensis', 'GuÃ¡charo', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/143620420/medium.jpeg'],
      ['AVE-122', 'Guacamaya roja', 'Ara macao', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Cundinamarca, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Guacamaya roja.jpg'],
      ['AVE-123', 'Falco columbarius', 'HalcÃón esmerejÃón', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/104986527/medium.jpeg'],
      ['AVE-124', 'Falco deiroleucus', 'HalcÃón Pecho Canela', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/178837882/medium.jpeg'],
      ['AVE-125', 'Falco peregrinus', 'HalcÃón Peregrino', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/112160847/medium.jpeg'],
      ['AVE-126', 'Halcones', 'Falco', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Cundinamarca, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Halcones.jpg'],
      ['AVE-127', 'Zenaida Doves', 'Zenaida', 'Consumidor secundario / Insectívoro de follaje y dosel', 'BogotÃ¡, D.C. , CO-CU, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/216027476/medium.jpeg'],
      ['AVE-128', 'Threskiornithidae', 'Ibis y espÃ¡tulas', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/193322163/medium.jpg'],
      ['AVE-129', 'Coeligena prunellei', 'Inca Negro', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Inca Negro.jpeg'],
      ['AVE-130', 'Gallito de ciÃénaga', 'Jacana jacana', 'Consumidor secundario / Insectívoro de follaje y dosel', 'San Francisco, Mosquera, Cundinamarca, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Jacana.jpg'],
      ['AVE-131', 'Spinus psaltria', 'Jilguerito Dominico', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Jilguerito Dominico.jpeg'],
      ['AVE-132', 'Spinus psaltria colombianus', 'Jilguerito Dominico SureÃño', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Jilguerito Dominico.jpeg'],
      ['AVE-133', 'Spinus', 'Jilgueritos', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Jilgueritos.jpeg'],
      ['AVE-134', 'Spinus spinescens', 'Jilguero andino', 'Frugívoro & Granívoro / Dispersión zoócora de semillas', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Jilguero andino.jpeg'],
      ['AVE-135', 'Jilguero pechinegro', 'Spinus xanthogastrus', 'Frugívoro & Granívoro / Dispersión zoócora de semillas', 'Calle 40C Sur, BogotÃ¡, BogotÃ¡, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Jilguero pechinegro.jpg'],
      ['AVE-136', 'Tyto furcata', 'lechuza comÃún americana', 'Depredador tope / Control biológico de roedores y reptiles', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/76900690/medium.jpg'],
      ['AVE-137', 'Oxyura ferruginea andina', 'MalvasÃía colombiana', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/28647341/medium.jpeg'],
      ['AVE-138', 'Arremon assimilis', 'Matorralero de cabeza listada', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Cundinamarca, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Matorralero de cabeza listada.jpg'],
      ['AVE-139', 'Metallura tyrianthina', 'Metalura Tiria', 'Polinizador nectarívoro / Forrajeo de flores tubulares', 'Cundinamarca, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Metalura Tiria.jpg'],
      ['AVE-140', 'Conirostrum rufum', 'Mielero Rufo', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Mielero Rufo.jpeg'],
      ['AVE-141', 'Aves', '5277', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Aves de percha.jpeg'],
      ['AVE-142', 'Ictinia mississippiensis', 'Milano de Mississippi', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Milano de Mississippi.jpg'],
      ['AVE-143', 'Elanus', 'Milanos de alas negras', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Milanos de alas negras.jpg'],
      ['AVE-144', 'Accipitridae', 'Milanos, aguilillas, gavilanes y Ã¡guilas', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/89337841/medium.jpeg'],
      ['AVE-145', 'Turdus fuscater', 'Mirla patinaranja', 'Frugívoro & Granívoro / Dispersión zoócora de semillas', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Mirla patinaranja.jpeg'],
      ['AVE-146', 'Turdus', 'Mirlos', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Mirlos.jpeg'],
      ['AVE-147', 'Chrysomus icterocephalus bogotensis', 'monjita bogotana', 'Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/monjita bogotana.jpg'],
      ['AVE-148', 'Chrysomus icterocephalus', 'Monjita Cabeciamarilla', 'Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Monjita Cabeciamarilla.jpeg'],
      ['AVE-149', 'Camptostoma obsoletum', 'Mosquerito silbador', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Cundinamarca, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Mosquerito silbador.jpg'],
      ['AVE-150', 'Mosquero cardenal', 'Pyrocephalus rubinus', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Cra. 81c #40c Sur-21 a 40c Sur-35, BogotÃ¡, Colombia', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Mosquero cardenal.jpeg'],
      ['AVE-151', 'Mosquero Elaenia CopetÃón', 'Elaenia flavogaster', 'Consumidor secundario / Insectívoro de follaje y dosel', 'PEDH La Vaca', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/44754102/medium.jpg'],
      ['AVE-152', 'Aves', '16721', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Aves de percha.jpeg'],
      ['AVE-153', 'Mosqueros Elaenia', 'Aves', 'Consumidor secundario / Insectívoro de follaje y dosel', 'AV. A. MejÃ­a - CL 15A, Kennedy, BogotÃ¡, Colombia', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Mosqueros Elaenia.jpg'],
      ['AVE-154', 'Paloma DomÃéstica', 'Columba livia domestica', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedal La Vaca, BogotÃ¡, DC, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://static.inaturalist.org/photos/16019684/medium.jpg'],
      ['AVE-155', 'Palomas del Viejo Mundo', 'Columba', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Transversal 87 Bis A, BogotÃ¡, DC, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Palomas del Viejo Mundo.jpg'],
      ['AVE-156', 'Columbidae', 'Palomas, tortolitas y coquitas', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Palomas, tortolitas y coquitas.jpeg'],
      ['AVE-157', 'Columbiformes', 'Palomas, tortolitas y coquitas', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Palomas, tortolitas y coquitas.jpeg'],
      ['AVE-158', 'Zenaida auriculata', 'Palomita montera', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Palomita montera.jpeg'],
      ['AVE-159', 'Empidonax alnorum', 'Papamoscas Ailero', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Papamoscas Ailero.jpeg'],
      ['AVE-160', 'Papamoscas Boreal', 'Contopus cooperi', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Carrera 106, BogotÃ¡, DC, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Papamoscas Boreal.jpg'],
      ['AVE-161', 'Papamoscas', 'Contopus', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Cra. 80f #41b Sur-2 a 41b Sur-38, BogotÃ¡, Colombia', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Papamoscas Ailero.jpeg'],
      ['AVE-162', 'Papamoscas del Este', 'Contopus virens', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Carrera 86 #6d-2 a 6d-82 Bogot?', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Papamoscas del Este.jpeg'],
      ['AVE-163', 'Western Wood-Pewee', 'Contopus sordidulus', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Carrera 80D, BogotÃ¡, DC, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://static.inaturalist.org/photos/54760519/medium.jpg'],
      ['AVE-164', 'Empidonax', 'Papamoscas Empidonax', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Papamoscas Empidonax.jpeg'],
      ['AVE-165', 'Myiarchus', 'Papamoscas Myiarchus', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Papamoscas Myiarchus.jpeg'],
      ['AVE-166', 'Papamoscas negro', 'Aves', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Calle 40Bs, BogotÃ¡, DC, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Papamoscas negro.jpg'],
      ['AVE-167', 'Myiodynastes maculatus', 'Papamoscas Rayado Cheje', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Papamoscas Rayado Cheje.jpeg'],
      ['AVE-168', 'Myiodynastes luteiventris', 'Papamoscas Rayado ComÃún', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/28647894/medium.jpeg'],
      ['AVE-169', 'Myiodynastes', 'Papamoscas Rayados', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Papamoscas Rayados.jpg'],
      ['AVE-170', 'Empidonax traillii', 'Papamoscas Saucero', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Papamoscas Saucero.jpeg'],
      ['AVE-171', 'Contopus bogotensis', 'Papamoscas Tropical NorteÃño', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://static.inaturalist.org/photos/688797191/medium.jpg'],
      ['AVE-172', 'Empidonax virescens', 'Papamoscas Verdoso', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Papamoscas Verdoso.jpg'],
      ['AVE-173', 'Great Crested Flycatcher', 'Myiarchus crinitus', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Calle 40bisa Sur, BogotÃ¡, DC, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://static.inaturalist.org/photos/101230015/medium.jpg'],
      ['AVE-174', 'Tringa melanoleuca', 'Patamarilla mayor', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Patamarilla mayor.jpeg'],
      ['AVE-175', 'Tringa flavipes', 'Patamarilla menor', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Patamarilla menor.jpeg'],
      ['AVE-176', 'Tringa', 'Patamarillas y parientes', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Patamarillas y parientes.jpeg'],
      ['AVE-177', 'Pato careto', 'Dendrocygna viduata', 'Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas', 'FontibÃ³n, BogotÃ¡, Colombia', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Pato careto.jpeg'],
      ['AVE-178', 'Nomonyx dominicus', 'Pato Enmascarado', 'Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Pato Enmascarado.jpeg'],
      ['AVE-179', 'Anas bahamensis', 'Pato gargantilla', 'Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Pato gargantilla.jpeg'],
      ['AVE-180', 'Cairina moschata domestica', 'Pato real domÃéstico', 'Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/228079443/medium.jpeg'],
      ['AVE-181', 'Oxyura ferruginea', 'pato zambullidor grande', 'Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/pato zambullidor grande.jpeg'],
      ['AVE-182', 'Anatidae', 'Patos, gansos, cisnes y parientes', 'Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Patos, gansos, cisnes y parientes.jpeg'],
      ['AVE-183', 'Penelope montagnii', 'Pava Andina', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Pava Andina.jpeg'],
      ['AVE-184', 'Aves', '10247', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Aves de percha.jpeg'],
      ['AVE-185', 'Diglossa sittoides', 'Payador canela', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Payador canela.jpeg'],
      ['AVE-186', 'Tyrannus melancholicus melancholicus', 'Pepite', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Pepite.png'],
      ['AVE-187', 'Forpus conspicillatus', 'Perico de anteojos', 'Frugívoro & Granívoro / Dispersión zoócora de semillas', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Perico de anteojos.jpeg'],
      ['AVE-188', 'Aves', '19339', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Aves de percha.jpeg'],
      ['AVE-189', 'Aves', '19076', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Aves de percha.jpeg'],
      ['AVE-190', 'Aves', '9839', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Aves de percha.jpeg'],
      ['AVE-191', 'Diglossa humeralis', 'Picaflor negro', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Cundinamarca, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Picaflor negro.jpeg'],
      ['AVE-192', 'Pheucticus ludovicianus', 'Picogordo Degollado', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Picogordo Degollado.jpeg'],
      ['AVE-193', 'Dendrocygna autumnalis', 'Pijije Alas Blancas', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Pijije Alas Blancas.jpeg'],
      ['AVE-194', 'Dendrocygna bicolor', 'Pijije canelo', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Pijije canelo.jpeg'],
      ['AVE-195', 'Mecocerculus leucophrys', 'Piojito gargantilla', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Cundinamarca, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Piojito gargantilla.jpg'],
      ['AVE-196', 'Catamenia analis', 'Piquitodeoro chico', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Piquitodeoro chico.jpg'],
      ['AVE-197', 'Piranga olivacea', 'Piranga escarlata', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Piranga escarlata.jpeg'],
      ['AVE-198', 'Piranga rubra', 'Piranga roja', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Piranga roja.jpeg'],
      ['AVE-199', 'Piranga', 'Pirangas', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Pirangas.jpeg'],
      ['AVE-200', 'Actitis macularius', 'Playero alzacolita', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Playero alzacolita.jpeg'],
      ['AVE-201', 'Calidris melanotos', 'Playero Pectoral', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Playero Pectoral.jpeg'],
      ['AVE-202', 'Tringa solitaria', 'Playero Solitario', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Playero Solitario.jpeg'],
      ['AVE-203', 'Scolopacidae', 'Playeros, zarapitos, picopandos, vuelvepiedras, costureros y falaropos', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Playeros, zarapitos, picopandos, vuelvepiedras, costureros y falaropos.jpeg'],
      ['AVE-204', 'Polla de agua sabanera', 'Porphyriops melanops bogotensis', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Calle 40c Sur #80j-2 a 80j-98 BogotÃ¡', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Polla de agua sabanera.jpg'],
      ['AVE-205', 'Polluela sora', 'Porzana carolina', 'Consumidor secundario / Insectívoro de follaje y dosel', 'BogotÃ¡, DC, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Polluela Sora.jpg'],
      ['AVE-206', 'Sturnella magna', 'Pradero Tortillaconchile', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Pradero Tortillaconchile.jpg'],
      ['AVE-207', 'Pardirallus maculatus', 'RascÃón pinto', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/61213213/medium.jpg'],
      ['AVE-208', 'Troglodytes', 'Ratonas', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Ratonas.jpeg'],
      ['AVE-209', 'Pheucticus aureoventris', 'Rey del bosque', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Cundinamarca, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Rey del bosque.jpeg'],
      ['AVE-210', 'SaÃíra de antifaz', 'Aves', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/677502272/medium.jpg'],
      ['AVE-211', 'Troglodytes musculus', 'Saltapared ComÃún SureÃño', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Troglodytes musculus columbae.png'],
      ['AVE-212', 'Aves', '17289', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Aves de percha.jpeg'],
      ['AVE-213', 'Palm Tanager', 'Thraupis palmarum', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Kennedy, BogotÃ¡, Colombia', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/150064441/medium.jpeg'],
      ['AVE-214', 'Cissopis leverianus', 'TÃ¡ngara urraca', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/88619399/medium.jpeg'],
      ['AVE-215', 'Tangara azulgris', 'Thraupis episcopus', 'Frugívoro & Granívoro / Dispersión zoócora de semillas', 'PEDH LA VACA', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/44754628/medium.jpg'],
      ['AVE-216', 'Thraupidae', 'Tangaras, mieleros, semilleros y parientes', 'Frugívoro & Granívoro / Dispersión zoócora de semillas', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Tangaras, mieleros, semilleros y parientes.jpg'],
      ['AVE-217', 'Chuck-will\'s-widow', 'Antrostomus carolinensis', 'Consumidor secundario / Insectívoro de follaje y dosel', 'BogotÃ¡, DC, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://static.inaturalist.org/photos/62857404/medium.jpg'],
      ['AVE-218', 'TapicurÃú', 'Mesembrinibis cayennensis', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedal Meandro del Say, BogotÃ¡ FontibÃ³n', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://static.inaturalist.org/photos/291552888/medium.jpeg'],
      ['AVE-219', 'Rallus semiplumbeus', 'Tingua bogotana', 'Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Tingua bogotana.jpg'],
      ['AVE-220', 'Porphyriops melanops', 'Tingua moteada', 'Fauna acuática y de juncal / Consumidor de invertebrados y macrófitas', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Tingua moteada.jpeg'],
      ['AVE-221', 'Tyrannus tyrannus', 'Tirano dorso negro', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Tirano dorso negro.jpg'],
      ['AVE-222', 'Tyrannus niveigularis', 'Tirano GolinÃíveo', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/579248653/medium.jpg'],
      ['AVE-223', 'Tyrannus dominicensis', 'Tirano gris', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Tirano gris.jpeg'],
      ['AVE-224', 'Tirano PirirÃí', 'Tyrannus melancholicus', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Cl. 7a Bis #80b-1 a 80b-55, BogotÃ¡, Colombia', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://static.inaturalist.org/photos/16452109/medium.jpg'],
      ['AVE-225', 'Tyrannus savana', 'Tirano Tijereta Gris', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Tirano Tijereta Gris.jpeg'],
      ['AVE-226', 'Tiranos', 'Tyrannus', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Calle 15, BogotÃ¡, BogotÃ¡, CO', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Tiranos.jpg'],
      ['AVE-227', 'Tyrannidae', 'tiranos, papamoscas y parientes', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/tiranos, papamoscas y parientes.jpeg'],
      ['AVE-228', 'Serpophaga cinerea', 'Tiranuelo saltarroyo', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Tiranuelo saltarroyo.jpg'],
      ['AVE-229', 'Molothrus bonariensis', 'Tordo Sudamericano', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Tordo Sudamericano.jpeg'],
      ['AVE-230', 'Molothrus', 'Tordos', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Tordos.jpg'],
      ['AVE-231', 'Tucancito Esmeralda', 'Aves', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Tucancito Esmeralda.jpg'],
      ['AVE-232', 'Tuquito gris', 'Empidonomus aurantioatrocristatus', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Pio XII, Bogota, Colombia', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Tuquito gris.jpeg'],
      ['AVE-233', 'Empidonomus varius', 'Tuquito rayado', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Tuquito rayado.jpeg'],
      ['AVE-234', 'Icterus icterus', 'Turpial', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Turpial.jpeg'],
      ['AVE-235', 'Gymnomystax mexicanus', 'Turpial lagunero', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Turpial lagunero.jpeg'],
      ['AVE-236', 'Aves', 'Streptoprocne zonaris', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Cra. 105b #69a Sur-1 a 69a Sur-55, BogotÃ¡, Colombia', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Aves de percha.jpeg'],
      ['AVE-237', 'Vireo olivaceus', 'Vireo Ojos Rojos', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Vireo Ojos Rojos.jpg'],
      ['AVE-238', 'Vireo verdeamarillo', 'Vireo flavoviridis', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Parque Aloha', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Vireo verdeamarillo.jpeg'],
      ['AVE-239', 'Aves', '17355', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Aves de percha.jpeg'],
      ['AVE-240', 'Podilymbus podiceps', 'Zambullidor pico grueso', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Zambullidor pico grueso.jpeg'],
      ['AVE-241', 'Quiscalus lugubris', 'Zanate caribeÃño', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/28647360/medium.jpeg'],
      ['AVE-242', 'Quiscalus', 'Zanates', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Zanates.jpeg'],
      ['AVE-243', 'Coragyps atratus', 'Zopilote comÃún', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', 'https://inaturalist-open-data.s3.amazonaws.com/photos/37420938/medium.jpeg'],
      ['AVE-244', 'Aves', '4761', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Aves de percha.jpeg'],
      ['AVE-245', 'Cathartes', 'Zopilotes', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Zopilotes.jpeg'],
      ['AVE-246', 'Catharus fuscescens', 'Zorzal Canelo', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Zorzal Canelo.jpeg'],
      ['AVE-247', 'Catharus ustulatus', 'Zorzal de Anteojos', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Zorzal de Anteojos.jpeg'],
      ['AVE-248', 'Catharus', 'Zorzales', 'Consumidor secundario / Insectívoro de follaje y dosel', 'Humedales El Burro, La Vaca y Techo / Kennedy', 'Monitoreo Biodiversidad Kennedy / Red iNaturalist', './assets/fotos/fotos_mamiferos/Zorzales.jpeg'],
    ];
    avesData.forEach(a => taxa.push({ id: a[0], name: a[1], sciname: a[2], cat: 1, role: a[3], loc: a[4], alert: a[5], img: a[6] }));

    // 2. MAMÍFEROS (10 Taxones reales de Mastofauna)
    const mamData = [
      ['MAM-01', 'Ardilla de cola roja', 'Sciurus granatensis', 'Dispersora de semillas en arbolado', 'Bosque Timiza / Humedal El Burro', 'Especie clave en conectividad de copas.', './assets/fotos/fotos_mamiferos/Ardilla de cola roja.jpeg'],
      ['MAM-02', 'Comadreja andina / Chucuri', 'Mustela frenata', 'Depredador carnívoro de micromamíferos', 'Ronda Río Fucha / ZMPA El Burro', 'Controlador de roedores.', './assets/fotos/fotos_mamiferos/Comadreja andina.jpg'],
      ['MAM-03', 'Curí sabanero', 'Cavia anolaimae', 'Herbívoro de juncal y pastizales', 'Humedales El Burro y La Vaca', 'Especie base de pastoreo.', './assets/fotos/fotos_mamiferos/Curi.jpeg'],
      ['MAM-04', 'Cusumbo andino', 'Nasuella olivacea', 'Omnívoro de suelo y dosel', 'Corredor ecológico Tintal', 'Forrajeo omnívoro.', './assets/fotos/fotos_mamiferos/Cusumbo.jpeg'],
      ['MAM-05', 'Fara / Zarigüeya común', 'Didelphis marsupialis', 'Dispersora omnívora y marsupial', 'Ronda La Vaca / Timiza', 'Marsupial nocturno.', './assets/fotos/fotos_mamiferos/Fara.jpeg'],
      ['MAM-06', 'Murciélago frutero de Bogotá', 'Sturnira bogotensis', 'Dispersor quiropterófilo de semillas', 'Arbolado urbano Kennedy', 'Polinizador y dispersor.', './assets/fotos/fotos_mamiferos/Murciélago frutero de Bogotá.jpg'],
      ['MAM-07', 'Murciélago cola de ratón', 'Tadarida brasiliensis', 'Insectívoro aéreo voraz nocturno', 'Dosel urbano Kennedy', 'Regulador de polillas.', './assets/fotos/fotos_mamiferos/Murciélago cola de ratón.jpeg'],
      ['MAM-08', 'Murciélago orejón andino', 'Histiotus montanus', 'Insectívoro de humedal y ronda', 'Humedal de Techo', 'Bioindicador nocturno.', './assets/fotos/fotos_mamiferos/Murciélago orejudo.jpeg'],
      ['MAM-09', 'Ratón arrocero de páramo', 'Microryzomys minutus', 'Granívoro y forrajeador de suelo', 'Pastizales de borde de humedal', 'Presa de lechuzas.', './assets/fotos/fotos_mamiferos/Ratón andino.jpeg'],
      ['MAM-10', 'Rata gris / Rata de alcantarilla', 'Rattus norvegicus', 'Omnívoro introducido urbano', 'Borde urbano Kennedy', 'Roedor comensal.', './assets/fotos/fotos_mamiferos/Rata gris asiática.jpeg']
    ];
    mamData.forEach(m => taxa.push({ id: m[0], name: m[1], sciname: m[2], cat: 2, role: m[3], loc: m[4], alert: m[5], img: m[6] }));

    // 3. MOLUSCOS (10 Taxones reales de Gasterópodos)
    const molData = [
      ['MOL-01', 'Caracol común de jardín', 'Cornu aspersum', 'Herbívoro raspador introducido', 'El Vergel Occidental / Kennedy', 'Consumidor de plántulas; presa de tinguas y carraos.', './assets/fotos/fotos_moluscos/Caracol europeo de jardín.jpg'],
      ['MOL-02', 'Babosa europea tigre', 'Limax maximus', 'Detritívora de hojarasca húmeda', 'AC 8 Kr 84 / Humedal El Burro', 'Desintegra materia orgánica en descomposición.', './assets/fotos/fotos_moluscos/Babosa europea tigre.jpg'],
      ['MOL-03', 'Babosa europea amarilla', 'Limacus flavus', 'Detritívora de microhábitats oscuros', 'Bosque de Hayuelos / El Burro', 'Descomponedora de hongos y detritos.', './assets/fotos/fotos_moluscos/Babosa europea amarilla.jpg'],
      ['MOL-04', 'Babosa gris de jardín', 'Deroceras reticulatum', 'Fitófaga de suelo y brotes tiernos', 'Nuevo Techo / Kennedy', 'Frecuente en vegetación herbácea.', './assets/fotos/fotos_moluscos/Babosa gris de jardín.jpg'],
      ['MOL-05', 'Babosa de invernadero', 'Milax gagates', 'Fitófaga subterránea de raíces', 'Rincón de los Ángeles / Kennedy', 'Habitante del suelo húmedo de ronda.', './assets/fotos/fotos_moluscos/Babosa europea de invernadero.jpg'],
      ['MOL-06', 'Babosa de tres bandas', 'Ambigolimax valentianus', 'Detritívora de materia vegetal tierna', 'Carrera 91 / Kennedy', 'Gasterópodo terrestre de zonas húmedas.', './assets/fotos/fotos_moluscos/Babosas de tres bandas.jpg'],
      ['MOL-07', 'Caracol de cristal', 'Oxychilus draparnaudi', 'Depredador carnívoro de otros moluscos', 'AK 68 AC 3 / Kennedy', 'Regulador de pequeños caracoles.', './assets/fotos/fotos_moluscos/Oxychilus.jpeg'],
      ['MOL-08', 'Caracol rueda de agua dulce', 'Planorbinae', 'Raspador acuático de perifiton y algas', 'Canales hídricos Hayuelos / El Burro', 'Alimento preferido de patos y tinguas.', './assets/fotos/fotos_moluscos/Planorbinae.jpg'],
      ['MOL-09', 'Caracolillo terrestre de matera', 'Euthyneura', 'Fitófago diminuto de musgos', 'Dindalito Bella Vista / Kennedy', 'Microgasterópodo de sustrato húmedo.', './assets/fotos/fotos_moluscos/Limacoidea.jpg'],
      ['MOL-10', 'Caracol vejiga / pliego acuático', 'Physa acuta', 'Raspador dulceacuícola / Bioindicador orgánico', 'Espejos de agua La Vaca y El Burro', 'Base trófica para la avifauna de juncal.', './assets/fotos/fotos_moluscos/Caracoles, babosas y parientes.jpg']
    ];
    molData.forEach(m => taxa.push({ id: m[0], name: m[1], sciname: m[2], cat: 3, role: m[3], loc: m[4], alert: m[5], img: m[6] }));

    // 4. ANFIBIOS (6 Taxones reales)
    const anfData = [
      ['ANF-01', 'Rana sabanera', 'Dendropsophus molitor', 'Bioindicador hídrico / Consumidora de artrópodos', 'Humedales El Burro, La Vaca y Techo', 'Emblema anfibio de la sabana de Bogotá.', './assets/fotos/fotos_anfibios/Rana sabanera.jpg'],
      ['ANF-02', 'Salamandra de Cundinamarca', 'Bolitoglossa adspersa', 'Endémica de la Cordillera Oriental / Respiración cutánea', 'Microhábitats húmedos de ronda', 'Sensible a sequedad y contaminantes químicos.', './assets/fotos/fotos_anfibios/Bolitoglossa adspersa.jpg'],
      ['ANF-03', 'Rana de lluvia elegante', 'Pristimantis elegans', 'Desarrollo directo en suelo / Insectívora de hojarasca', 'Hojarasca protegida Kennedy', 'No requiere cuerpo de agua abierto para reproducirse.', './assets/fotos/fotos_anfibios/Pristimantis elegans.jpeg'],
      ['ANF-04', 'Sapo gigante neotropical', 'Rhinella horribilis', 'Depredador voraz de insectos terrestres', 'Ciudad Tintal II / El Burro', 'Controlador biológico de coleópteros y hormigas.', './assets/fotos/fotos_anfibios/Sapo gigante.jpeg'],
      ['ANF-05', 'Ranita venenosa de Bogotá / Rana cohete', 'Hyloxalus subpunctatus', 'Endémica andina diurna de orilla de arroyo', 'Canal Boyacá / Río San Francisco', 'Macho transporta renacuajos a charcas.', './assets/fotos/fotos_anfibios/Ranas y sapos.jpeg'],
      ['ANF-06', 'Rana arborícola de humedal', 'Hylidae', 'Insectívora de totora y enea', 'Bosque de Hayuelos / El Burro', 'Habitante del estrato herbáceo inundable.', './assets/fotos/fotos_anfibios/Rana sabanera.jpg']
    ];
    anfData.forEach(a => taxa.push({ id: a[0], name: a[1], sciname: a[2], cat: 4, role: a[3], loc: a[4], alert: a[5], img: a[6] }));

    // 5. REPTILES (8 Taxones reales)
    const repData = [
      ['REP-01', 'Serpiente sabanera / Culebra tierrera', 'Atractus crassicaudatus', 'Depredadora de lombrices e invertebrados (Inofensiva)', 'Los Condominios / Humedal El Burro', 'Especie protegida inofensiva clave en el suelo.', './assets/fotos/fotos_reptiles/Serpiente sabanera.jpg'],
      ['REP-02', 'Lagarto collarejo / Camaleón andino', 'Stenocercus trachycephalus', 'Termorregulador diurno / Insectívoro', 'ZMPA El Burro / La Vaca', 'Endémico del altiplano cundiboyacense.', './assets/fotos/fotos_reptiles/Lagarto Collarejo.jpg'],
      ['REP-03', 'Lagartija bombillo estriada', 'Riama striata', 'Gimnoftálmido fosorial de hojarasca', 'Av. A. Mejía / Cl 38 Sur', 'Vive bajo piedras y troncos húmedos.', './assets/fotos/fotos_reptiles/Lagartija bombillo estriada.jpeg'],
      ['REP-04', 'Charchala / Lagartija de Bogotá', 'Anadia bogotensis', 'Endémica de la sabana / Insectívora ágil', 'Matorrales de amortiguación Kennedy', 'Excelente escaladora en arbustos nativos.', './assets/fotos/fotos_reptiles/charchala.jpeg'],
      ['REP-05', 'Jicotea sudamericana / Hicotea', 'Trachemys callirostris', 'Reptil semiacuático / Omnívoro de humedal', 'Espejos hídricos El Burro / Techo', 'Termorregula en troncos flotantes.', './assets/fotos/fotos_reptiles/Hicotea.jpeg'],
      ['REP-06', 'Iguana verde', 'Iguana iguana', 'Herbívoro de copas arbóreas', 'Av. Alsacia Kr 71B / Kennedy', 'Ejemplares asilvestrados en microclimas urbanos.', './assets/fotos/fotos_reptiles/Iguana verde.jpg'],
      ['REP-07', 'Besucona asiática / Geco casero', 'Hemidactylus frenatus', 'Cazador nocturno de insectos en muros', 'Edificaciones de borde urbano Kennedy', 'Lagartija trepadora de actividad nocturna.', './assets/fotos/fotos_reptiles/Besucona asiática.jpg'],
      ['REP-08', 'Culebra de humedal', 'Colubridae', 'Controlador biológico de roedores y anfibios', 'Tintala / Humedal El Burro', 'Reptil ágil de vegetación riparia.', './assets/fotos/fotos_reptiles/Culebras y parientes.jpeg']
    ];
    repData.forEach(r => taxa.push({ id: r[0], name: r[1], sciname: r[2], cat: 5, role: r[3], loc: r[4], alert: r[5], img: r[6] }));

    // 0. FLORA & ARBOLADO CENSO SIGAU (90 Taxones)
    const sigauBase = [
      ['Sambucus nigra', 'Saúco', 'Adoxaceae', 'Flora Nativa Hub / Néctar, fruto y nido para 25+ aves', 'Muy Alto (38 aristas)', 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=300'],
      ['Prunus serotina', 'Capulí', 'Rosaceae', 'Flora Nativa Hub / Frutos para Mirlas, Pirangas y loros', 'Muy Alto (32 aristas)', 'https://images.unsplash.com/photo-1511497584788-876761465586?w=300'],
      ['Alnus acuminata', 'Aliso', 'Betulaceae', 'Flora Acompañante / Fijación de N2 y percha de Garzas', 'Alto (22 aristas)', 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=300'],
      ['Baccharis latifolia', 'Chilco', 'Asteraceae', 'Flora Acompañante / Polen para abejas y refugio de cucarachero', 'Alto (19 aristas)', 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=300'],
      ['Vallea stipularis', 'Raque', 'Elaeocarpaceae', 'Flora Acompañante / Néctar para colibríes cometa y chillón', 'Alto (15 aristas)', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300'],
      ['Salix humboldtiana', 'Sauce llorón nativo', 'Salicaceae', 'Estabilización de orillas y nidificación acuática', 'Muy Alto', 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=300'],
      ['Eucalyptus globulus', 'Eucalipto', 'Myrtaceae', 'Arbolado introducido / Percha de gavilanes', 'Medio', 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=300'],
      ['Acacia melanoxylon', 'Acacia negra', 'Fabaceae', 'Fijación de suelo / Cobertura densa', 'Medio', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=300'],
      ['Croton bogotensis', 'Drago bogotano', 'Euphorbiaceae', 'Resina cicatrizante y alimento para avifauna', 'Alto', 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=300'],
      ['Tibouchina urvilleana', 'Siete cueros', 'Melastomataceae', 'Floración melífera ornamental y nativa', 'Alto', 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=300'],
      ['Polylepis quadrijuga', 'Coloradito / Quinua', 'Rosaceae', 'Bosque altoandino de protección hídrica', 'Muy Alto', 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=300'],
      ['Abutilon striatum', 'Farolito japonés', 'Malvaceae', 'Atracción continua de colibríes', 'Alto', 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=300'],
      ['Passiflora mixta', 'Curuba de monte', 'Passifloraceae', 'Trepadora melífera de borde de humedal', 'Alto', 'https://images.unsplash.com/photo-1528183429752-a97d0bf99b5a?w=300'],
      ['Typha latifolia', 'Enea / Totora', 'Typhaceae', 'Filtro biológico y nidificación de tinguas', 'Muy Alto', 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=300'],
      ['Schoenoplectus californicus', 'Junco californiano', 'Cyperaceae', 'Purificación acuática y hábitat trófico de rálidos', 'Muy Alto', 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=300']
    ];

    for (let s = 1; s <= 90; s++) {
      const numStr = s.toString().padStart(3, '0');
      const sId = `SIGAU-${numStr}`;
      const template = sigauBase[(s - 1) % sigauBase.length];
      taxa.push({
        id: sId,
        name: `${template[1]} (${sId})`,
        sciname: template[0],
        cat: 0,
        role: `${template[3]} • Familia ${template[2]}`,
        loc: 'Ronda Hidráulica y ZMPA Kennedy (El Burro / La Vaca / Techo)',
        alert: `Censo SIGAU / PMA: ${template[4]}`,
        img: template[5]
      });
    }

    return taxa;
  }

  const fullTaxa = buildFullDataset();
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
        const rawList = Array.isArray(trees) ? trees : (trees.trees || []);
        const list = rawList.filter((_, idx) => idx % 4 === 0);

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

  Promise.all([loadWater(), loadTrees(), loadRoads()]).then(() => {
    loadBuildings();
    setTimeout(() => {
      if (loadingVeil) loadingVeil.classList.add("hide");
    }, 300);
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
  const territoryBeaconsGroup = new THREE.Group();
  territoryBeaconsGroup.visible = false;
  sceneRoot.add(territoryBeaconsGroup);

  const territoryBeacons = [];

  // Categorías e íconos para Tooltips y Pop-ups
  const CAT_EMOJIS = {
    "Anfibios": "🟢 ANFIBIO",
    "Aves": "🔵 AVE",
    "Mamíferos": "🟡 MAMÍFERO",
    "Moluscos": "🌸 MOLUSCO",
    "Reptiles": "🟣 REPTIL",
    "Flora SIGAU": "🌿 ÁRBOL / FLORA"
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
        const catHex = (TAXONOMIC_CONVENTIONS[t.cat] && (TAXONOMIC_CONVENTIONS[t.cat] ? TAXONOMIC_CONVENTIONS[t.cat].color : "#84A48B")) || "#84A48B";
        territoryTooltip.style.setProperty("--cat-color", catHex);

        if (ttImg) ttImg.src = t.img;
        if (ttBadge) {
          ttBadge.textContent = CAT_EMOJIS[t.cat] || t.cat;
          ttBadge.style.color = catHex;
        }
        if (ttName) ttName.textContent = t.name;
        if (ttSci) ttSci.textContent = t.sciname;
        if (ttLoc) ttLoc.textContent = `📍 ${t.territoryPos.locName || t.loc || 'Kennedy'}`;
        if (ttRole) ttRole.textContent = t.role || "Eslabón ecológico";

        // Posicionar Tooltip cerca del cursor
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
  // 7. INTERACCIÓN DE RED BIÓTICA, INSPECTOR, LAYOUTS Y SUB-RED
  // =====================================================================
  let selectedNode = null;
  let hoveredNode = null;
  const raycaster = new THREE.Raycaster();
  const mouseVec = new THREE.Vector2();

  window.openWelcomeModal = () => {
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
        // Clic simple: abrir inspector
        openInspector(nodeObj);
      }
      clickTime = now;
    }
  });

  // =====================================================================
  // 8. METAMORFOSIS ANIMADA: RED BIÓTICA <---> TERRITORIO 3D
  // =====================================================================

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
        sp.position.set(n.ox, n.oy, n.oz);
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