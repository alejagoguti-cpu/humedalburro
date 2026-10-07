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
    const taxa = [];

    // 1. AVES (57 Taxones reales con fotos iNaturalist)
    const aveData = [
      ['AVE-01', 'Mirla patinaranja', 'Turdus fuscater gigas', 'Frugívora / Hub dispersor de semillas en Kennedy', 'PEDH La Vaca y Humedal El Burro', 'Residente abundante. Clave en regeneración vegetal.', './assets/fotos/fotos_aves/Mirla patinaranja.jpeg'],
      ['AVE-02', 'Torcaza / Palomita montera', 'Zenaida auriculata pentheria', 'Granívora / Semillero de pastizales urbanos', 'Nuevo Techo / Humedales de Kennedy', 'Residente sinantrópica común.', './assets/fotos/fotos_aves/Palomita montera.jpeg'],
      ['AVE-03', 'Tángara palmera', 'Thraupis palmarum atripennis', 'Frugívora / Insectívora de palmas y dosel', 'Kennedy Central / Ronda Fucha', 'Residente arbórea activa.', './assets/fotos/fotos_aves/Tángara palmera.png'],
      ['AVE-04', 'Gorrión copetón', 'Zonotrichia capensis costaricensis', 'Granívoro e insectívoro terrestre', 'Nuevo Techo / Ronda ZMPA', 'Residente urbano de alta adaptabilidad.', './assets/fotos/fotos_aves/Zonotrichia capensis costaricensis.png'],
      ['AVE-05', 'Cucarachero común', 'Troglodytes musculus columbae', 'Insectívoro de matorral y sotobosque', 'Kennedy / Humedal El Burro', 'Controlador biológico de artrópodos.', './assets/fotos/fotos_aves/Troglodytes musculus columbae.png'],
      ['AVE-06', 'Canario sabanero', 'Sicalis luteola bogotensis', 'Granívoro de juncales y gramíneas', 'Humedal Capellanía y El Burro', 'Sensible a fragmentación de pastizales nativos.', './assets/fotos/fotos_aves/Sicalis luteola bogotensis.jpeg'],
      ['AVE-07', 'Golondrina alirrasposa', 'Stelgidopteryx ruficollis uropygialis', 'Insectívora aérea de espejos de agua', 'Humedal Capellanía y La Vaca', 'Cazador sobre láminas hídricas.', './assets/fotos/fotos_aves/Stelgidopteryx ruficollis uropygialis.jpg'],
      ['AVE-08', 'Alcaraván / Avefría tero', 'Vanellus chilensis cayennensis', 'Centinela de pradera e invertebrados', 'Bosa Porvenir / El Burro', 'Nidifica en suelo abierto de ronda.', './assets/fotos/fotos_aves/Avefría Tero.jpeg'],
      ['AVE-09', 'Búho orejudo', 'Asio stygius robustus', 'Rapaz nocturna de dosel / Control de roedores', 'Dosel de Kennedy / Eucaliptos', 'Sensible a tala de árboles añosos.', './assets/fotos/fotos_aves/Asio stygius robustus.jpg'],
      ['AVE-10', 'Águila mora', 'Geranoaetus melanoleucus australis', 'Gran depredador aéreo de la sabana', 'Urb. La Estancia / Fontibón - Kennedy', 'Rapaz de alta jerarquía trófica.', './assets/fotos/fotos_aves/Águila mora.jpg'],
      ['AVE-11', 'Agachona norteamericana', 'Gallinago delicata', 'Limícola migratoria de fango y ciénaga', 'Humedal Capellanía / El Burro', 'Migratorio boreal dependiente de lodos limpios.', './assets/fotos/fotos_aves/Agachona Norteamericana.jpeg'],
      ['AVE-12', 'Aguililla alas anchas', 'Buteo platypterus', 'Rapaz migratoria de bosque de galería', 'PEDH La Vaca', 'Migratorio neotropical de paso estacional.', './assets/fotos/fotos_aves/Aguililla Alas Anchas.jpeg'],
      ['AVE-13', 'Aguililla caminera', 'Rupornis magnirostris', 'Cazador oportunista de borde de humedal', 'Kennedy / Humedal El Burro', 'Residente común en ecotonos.', './assets/fotos/fotos_aves/Aguililla caminera.jpeg'],
      ['AVE-14', 'Atajacaminos ñañarca', 'Systellura longirostris', 'Insectívoro crepuscular y nocturno', 'Sabana / Humedales de Kennedy', 'Mimetismo en suelo y hojarasca.', './assets/fotos/fotos_aves/Atajacaminos ñañarca.jpg'],
      ['AVE-15', 'Currucutú / Autillo común', 'Megascops choliba', 'Rapaz nocturna pequeña / Depredador de artrópodos', 'Meandro del Say / El Burro', 'Residente de saucales y arbolado denso.', './assets/fotos/fotos_aves/Autillo común.jpeg'],
      ['AVE-16', 'Gavilán bailarín / Elanio maromero', 'Elanus leucurus', 'Rapaz especialista en micromamíferos', 'PEDH La Vaca / El Burro', 'Caza cerniéndose en el aire sobre praderas.', './assets/fotos/fotos_aves/Elanio maromero norteamericano.jpg'],
      ['AVE-17', 'Búho sabanero / Campestre', 'Asio flammeus bogotensis', 'Rapaz de pastizales y juncales (Subesp. endémica)', 'Meandro del Say / El Burro', 'Vulnerable por pérdida de juncales densos.', './assets/fotos/fotos_aves/Búho Sabanero.jpeg'],
      ['AVE-18', 'Búho cara blanca', 'Asio clamator', 'Rapaz nocturna de matorrales y saucales', 'Kennedy Central', 'Controlador biológico de roedores.', './assets/fotos/fotos_aves/Búho Cara Blanca.jpeg'],
      ['AVE-19', 'Búho cornudo', 'Bubo virginianus', 'Gran rapaz nocturna de bosque altoandino', 'Humedal Capellanía', 'Tope trófico nocturno en relictos.', './assets/fotos/fotos_aves/Búho cornudo.jpeg'],
      ['AVE-20', 'Burrito pico rojo', 'Mustelirallus erythrops', 'Rálido de vegetación densa inundada', 'Transversal 81 / El Burro', 'Críptico en eneas y totoras.', './assets/fotos/fotos_aves/Burrito pico rojo.jpg'],
      ['AVE-21', 'Calandria dorso amarillo', 'Icterus chrysater', 'Frugívora e insectívora de dosel', 'Humedal El Burro', 'Residente de arbolado nativo.', './assets/fotos/fotos_aves/Calandria Dorso Amarillo.jpeg'],
      ['AVE-22', 'Calzadito cobrizo', 'Eriocnemis cupreoventris', 'Colibrí de páramo y borde de humedal', 'Corredor ambiental Kennedy', 'Polinizador de Ericáceas y flores tubulares.', './assets/fotos/fotos_aves/Calzadito Cobrizo.jpeg'],
      ['AVE-23', 'Canario coronado', 'Sicalis flaveola', 'Granívoro sinantrópico de áreas abiertas', 'PEDH La Vaca', 'Frecuente en bordes de pastos.', './assets/fotos/fotos_aves/Canario coronado.jpeg'],
      ['AVE-24', 'Carancho / Guarracuco', 'Caracara plancus', 'Carroñero y cazador oportunista', 'Meandro del Say / El Burro', 'Limpieza y reciclaje de materia orgánica.', './assets/fotos/fotos_aves/Carancho.jpeg'],
      ['AVE-25', 'Carpintero habado', 'Melanerpes rubricapillus', 'Insectívoro perforador de troncos y frutos', 'Kennedy Occidental', 'Crea cavidades útiles para otras especies.', './assets/fotos/fotos_aves/Carpintero habado.jpg'],
      ['AVE-26', 'Carrao', 'Aramus guarauna', 'Especialista en caracoles y moluscos acuáticos', 'Fontibón / Humedales de Kennedy', 'Regulador de poblaciones de gasterópodos.', './assets/fotos/fotos_aves/Carrao.jpeg'],
      ['AVE-27', 'Centzontle tropical', 'Mimus gilvus', 'Frugívoro / Canoro de matorral', 'PEDH La Vaca', 'Dispersor de semillas de arbustos nativos.', './assets/fotos/fotos_aves/Centzontle tropical.jpeg'],
      ['AVE-28', 'Cerceta alas azules', 'Spatula discors', 'Pato migratorio boreal filtrador', 'Cra 80F / Espejos de agua', 'Llega en invierno boreal a humedales.', './assets/fotos/fotos_aves/Cerceta Alas Azules.jpeg'],
      ['AVE-29', 'Cernícalo americano', 'Falco sparverius', 'Pequeño halcón cazador de insectos y roedores', 'Fontibón / El Burro', 'Residente de postes y cables en la ZMPA.', './assets/fotos/fotos_aves/Cernícalo americano.jpeg'],
      ['AVE-30', 'Chamicero cundiboyacense', 'Synallaxis subpudica', 'Endémico de la sabana / Insectívoro de matorral', 'Humedal El Burro', 'Especie focal de conservación en la sabana.', './assets/fotos/fotos_aves/chamicero cundiboyacense.jpeg'],
      ['AVE-31', 'Chipe castaño', 'Setophaga castanea', 'Migratorio boreal de dosel arbóreo', 'Humedal Capellanía', 'Insectívoro de follaje en temporada migratoria.', './assets/fotos/fotos_aves/Chipe castaño.jpg'],
      ['AVE-32', 'Chipe de collar / Reinita canadiense', 'Cardellina canadensis', 'Migratorio vulnerable / Insectívoro de sotobosque', 'Humedal El Burro', 'Sensible a fragmentación del arbolado de ronda.', './assets/fotos/fotos_aves/Chipe de collar.jpeg'],
      ['AVE-33', 'Chipe garganta naranja', 'Setophaga fusca', 'Migratorio de copas altas en Saúcos y Alisos', 'Kennedy ZMPA', 'Consume orugas y pequeños artrópodos.', './assets/fotos/fotos_aves/Chipe garganta naranja.jpeg'],
      ['AVE-34', 'Chorlo tildío', 'Charadrius vociferus', 'Limícola de orillas y playas de humedal', 'Ciudadela La Felicidad / Humedal', 'Nidifica en gravilla de bordes hídricos.', './assets/fotos/fotos_aves/Chorlo tildío.jpeg'],
      ['AVE-35', 'Colibrí rutilante / Chillón', 'Colibri coruscans', 'Polinizador clave de flora nativa y urbana', 'Humedal de Techo / Bosconia', 'Territorial en árboles florecidos como Saúco y Farolito.', './assets/fotos/fotos_aves/Colibrí Rutilante.jpeg'],
      ['AVE-36', 'Cuervillo cara pelada / Coquito', 'Phimosus infuscatus', 'Sondeador de fango e invertebrados bentónicos', 'Meandro del Say / El Burro', 'Flocula sedimentos y controla larvas acuáticas.', './assets/fotos/fotos_aves/Cuervillo cara pelada.jpeg'],
      ['AVE-37', 'Focha común / Gallareta', 'Fulica americana columbiana', 'Acuática herbívora / Consumidora de macrófitas', 'Humedal Capellanía / La Vaca', 'Bioindicador de vegetación flotante estructurada.', './assets/fotos/fotos_aves/Focha común.jpeg'],
      ['AVE-38', 'Gallineta frente roja / Polla de agua', 'Gallinula galeata', 'Omnívora acuática de juncal', 'Humedal El Burro', 'Nidificante común entre juncos y totoras.', './assets/fotos/fotos_aves/Gallineta Frente Roja.jpeg'],
      ['AVE-39', 'Tingua azul / Gallineta morada', 'Porphyrio martinica', 'Rálido de hojas flotantes y flores acuáticas', 'Cra 80F / La Vaca', 'Migratorio y residente local muy llamativo.', './assets/fotos/fotos_aves/Gallineta morada.jpeg'],
      ['AVE-40', 'Garceta azul / Garza azul', 'Egretta caerulea', 'Ictiófaga de aguas someras', 'Humedal Capellanía', 'Cazadora paciente en bordes de agua.', './assets/fotos/fotos_aves/Garceta azul.jpg'],
      ['AVE-41', 'Garza blanca mayor', 'Ardea alba', 'Depredador piscívoro y de anfibios', 'Humedal El Burro / La Vaca', 'Tope trófico de láminas de agua abiertas.', './assets/fotos/fotos_aves/Garza blanca.jpg'],
      ['AVE-42', 'Garza dedos dorados / Real', 'Egretta thula', 'Ictiófaga activa con patas amarillas', 'Kennedy / El Burro', 'Remueve fango para espantar pececillos.', './assets/fotos/fotos_aves/Garza dedos dorados.jpeg'],
      ['AVE-43', 'Garza nocturna / Guaco', 'Nycticorax nycticorax', 'Piscívoro nocturno de saucales', 'Fontibón / El Burro', 'Percha diurna en sauces llorones.', './assets/fotos/fotos_aves/Garza Nocturna Corona Negra.jpeg'],
      ['AVE-44', 'Golondrina albiazul', 'Pygochelidon cyanoleuca', 'Insectívora aérea urbana y de humedal', 'Kennedy / La Vaca', 'Controladora de dípteros y zancudos.', './assets/fotos/fotos_aves/Golondrina Albiazul.jpeg'],
      ['AVE-45', 'Halcón peregrino', 'Falco peregrinus', 'Depredador aéreo de aves en vuelo', 'Fontibón / Corredor Fucha', 'Migratorio de invierno boreal.', './assets/fotos/fotos_aves/Halcón Peregrino.jpeg'],
      ['AVE-46', 'Jacana / Gallito de ciénaga', 'Jacana jacana', 'Caminador de vegetación flotante', 'Humedales de Kennedy', 'Dedos alargados para caminar sobre hojas.', './assets/fotos/fotos_aves/Jacana.jpg'],
      ['AVE-47', 'Lechuza común americana', 'Tyto furcata', 'Controlador nocturno de roedores sinantrópicos', 'Humedal Capellanía / Techo', 'Esencial en salud pública y balance biológico.', './assets/fotos/fotos_aves/lechuza común americana.jpg'],
      ['AVE-48', 'Pato andino / Malvasía', 'Oxyura ferruginea andina', 'Buceador de fondo / Consumidor de invertebrados', 'Humedal El Burro', 'Subespecie andina en categoría Vulnerable.', './assets/fotos/fotos_aves/Malvasía colombiana.jpeg'],
      ['AVE-49', 'Monjita bogotana', 'Chrysomus icterocephalus bogotensis', 'Endémica de juncal / Consumidora de insectos', 'PEDH El Burro', 'Nidifica exclusivamente en juncos californianos.', './assets/fotos/fotos_aves/monjita bogotana.jpg'],
      ['AVE-50', 'Mosquero cardenal / Titiribí', 'Pyrocephalus rubinus', 'Insectívoro de percha baja en humedales', 'Cra 81C / Humedales', 'Macho de plumaje escarlata brillante.', './assets/fotos/fotos_aves/Mosquero cardenal.jpeg'],
      ['AVE-51', 'Tingua bogotana', 'Rallus semiplumbeus', 'EN PELIGRO (EN) - Endémica de la Cordillera Oriental', 'Humedal El Burro y La Vaca', 'Especie sombrilla prioritaria del humedal.', './assets/fotos/fotos_aves/Tingua bogotana.jpg'],
      ['AVE-52', 'Tingua moteada / Polla sabanera', 'Porphyriops melanops bogotensis', 'EN PELIGRO CRÍTICO (CR) - Rálido sabanero', 'Humedal La Vaca', 'Población relictual en recuperación.', './assets/fotos/fotos_aves/Tingua moteada.jpeg'],
      ['AVE-53', 'Chirlobirlo / Pradero', 'Sturnella magna', 'Cantor de praderas y pastos húmedos', 'Fontibón / El Burro', 'Pecho amarillo brillante con collar negro.', './assets/fotos/fotos_aves/Calandrias, tordos, caciques, oropéndolas, zanates, praderos y parientes.jpg'],
      ['AVE-54', 'Rascón pinto', 'Pardirallus maculatus', 'Rálido moteado de fango espeso', 'Humedal El Burro / La Vaca', 'Registro biológico valioso en Kennedy.', './assets/fotos/fotos_aves/Rascón pinto.jpg'],
      ['AVE-55', 'Tangara azulgrís', 'Thraupis episcopus', 'Frugívora de arbolado urbano y bordes', 'PEDH La Vaca', 'Dispersora de semillas de frutales.', './assets/fotos/fotos_aves/Tangara azulgrís.jpg'],
      ['AVE-56', 'Zambullidor pico grueso', 'Podilymbus podiceps', 'Buceador piscívoro y de macroinvertebrados', 'Kennedy / El Burro', 'Nido flotante anclado a juncos.', './assets/fotos/fotos_aves/Zambullidor pico grueso.jpeg'],
      ['AVE-57', 'Zopilote común / Chulo', 'Coragyps atratus', 'Carroñero de saneamiento ambiental', 'Fontibón / Corabastos', 'Elimina focos de descomposición animal.', './assets/fotos/fotos_aves/Zopilote común.jpeg']
    ];
    aveData.forEach(a => taxa.push({ id: a[0], name: a[1], sciname: a[2], cat: 1, role: a[3], loc: a[4], alert: a[5], img: a[6] }));

    // 2. MAMÍFEROS (10 Taxones reales)
    const mamData = [
      ['MAM-01', 'Ardilla de cola roja', 'Sciurus granatensis', 'Frugívora y dispersora de semillas de dosel', 'Kennedy / Saucales El Burro', 'Clave en la regeneración de árboles altos.', './assets/fotos/fotos_mamiferos/Ardilla de cola roja.jpeg'],
      ['MAM-02', 'Comadreja andina / Chucurí', 'Neogale frenata affinis', 'Depredador carnívoro de ronda / Control de roedores', 'Matorrales densos Kennedy / El Burro', 'Tope carnívoro terrestre del humedal.', './assets/fotos/fotos_mamiferos/Neogale frenata affinis.jpg'],
      ['MAM-03', 'Cuis común / Curí de sabana', 'Cavia aperea', 'Herbívoro de praderas y juncales', 'Baldíos y ronda La Felicidad / El Burro', 'Base presa para rapaces y búhos.', './assets/fotos/fotos_mamiferos/Cuis común.jpg'],
      ['MAM-04', 'Cusumbo andino', 'Nasua olivacea', 'Omnívoro de borde de bosque y humedal', 'Corredor ecológico Kennedy', 'Remueve suelo en busca de invertebrados.', './assets/fotos/fotos_mamiferos/Muroidea.jpg'],
      ['MAM-05', 'Murciélago nariz de lanza mayor', 'Phyllostomus hastatus', 'Insectívoro y dispersor nocturno de dosel', 'PEDH La Vaca Norte / Dosel', 'Controlador biológico de plagas nocturnas.', './assets/fotos/fotos_mamiferos/Murciélago nariz de lanza mayor.jpeg'],
      ['MAM-06', 'Perro doméstico sinantrópico', 'Canis familiaris', 'Depredador invasor de fauna nativa', 'Canal Boyacá / San Francisco', 'Amenaza constante sobre nidos de tinguas.', './assets/fotos/fotos_mamiferos/Perro Doméstico.jpeg'],
      ['MAM-07', 'Rata gris asiática', 'Rattus norvegicus', 'Roedor sinantrópico de bordes urbanos', 'San Pedro Fontibón / Bordes hídricos', 'Vector de patógenos y presa de lechuzas.', './assets/fotos/fotos_mamiferos/Rata gris asiática.jpg'],
      ['MAM-08', 'Rata negra de tejado', 'Rattus rattus', 'Roedor trepador sinantrópico', 'Canal Boyacá / Kennedy', 'Impacto en nidadas de aves de dosel.', './assets/fotos/fotos_mamiferos/Rata negra.jpeg'],
      ['MAM-09', 'Ratón casero eurasiático', 'Mus musculus', 'Pequeño roedor omnívoro sinantrópico', 'Canal San Francisco / El Burro', 'Presa frecuente de cernícalos y búhos.', './assets/fotos/fotos_mamiferos/Ratón casero eurasiático.jpeg'],
      ['MAM-10', 'Roedores silvestres de humedal', 'Muroidea', 'Consumidores primarios de raíces y semillas', 'Humedal El Burro', 'Eslabón clave en la red trófica de carnívoros.', './assets/fotos/fotos_mamiferos/Roedores.jpeg']
    ];
    mamData.forEach(m => taxa.push({ id: m[0], name: m[1], sciname: m[2], cat: 2, role: m[3], loc: m[4], alert: m[5], img: m[6] }));

    // 3. MOLUSCOS (10 Taxones reales)
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