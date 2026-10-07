// =====================================================================
// El Jardín de las Aguas — Red Biótica Esférica & Territorio de Kennedy 3D
// Digital Experience using the official graphic color palette & accurate GIS waypoints
// =====================================================================

(() => {
  const NET_URL = "./assets/kennedy_net.json";
  const BUILDINGS_URL = "./assets/kennedy_buildings.json";
  const TREES_URL = "./assets/kennedy_trees_real.json";
  const WATER_URL = "./assets/kennedy_water_bodies.json";
  const SCALE = 1 / 10;

  // Centro de proyección de Kennedy
  const netCenter = { x: 5341.33, y: 3161.9 };
  function toScene(x, y) {
    return { x: (x - netCenter.x) * SCALE, z: -(y - netCenter.y) * SCALE };
  }

  // ---- Setup de Escena, Cámara y Renderizador WebGL ----
  const canvas = document.getElementById("sceneCanvas");
  const loadingVeil = document.getElementById("loadingVeil");
  const swarmIntroBox = document.getElementById("swarmIntroBox");
  const waypointsBar = document.getElementById("waypointsBar");
  const stageLabel = document.getElementById("stageLabel");
  const speciesCard = document.getElementById("speciesCard");

  // Elementos de la Ficha de Especies
  const cardIcon = document.getElementById("cardIcon");
  const cardCommonName = document.getElementById("cardCommonName");
  const cardScientificName = document.getElementById("cardScientificName");
  const cardTaxon = document.getElementById("cardTaxon");
  const cardHabitat = document.getElementById("cardHabitat");
  const cardDiet = document.getElementById("cardDiet");
  const cardRelations = document.getElementById("cardRelations");

  // Elementos del Inspector de Cámara
  const camInspectorBox = document.getElementById("camInspectorBox");
  const camCoordPos = document.getElementById("camCoordPos");
  const camCoordTarget = document.getElementById("camCoordTarget");
  const btnSaveCameraView = document.getElementById("btnSaveCameraView");
  const btnCloseCamInspector = document.getElementById("btnCloseCamInspector");
  const camToast = document.getElementById("camToast");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1D1D1B); // MUTED BLACK
  scene.fog = new THREE.FogExp2(0x1D1D1B, 0.0006);

  const sceneRoot = new THREE.Group();
  scene.add(sceneRoot);

  const fov = 44;
  const aspect = window.innerWidth / window.innerHeight;
  const camera = new THREE.PerspectiveCamera(fov, aspect, 1, 9500);
  
  // Posición inicial: perfectamente centrada en la esfera
  const swarmCamPos = new THREE.Vector3(0, 0, 75);
  const swarmTarget = new THREE.Vector3(0, 0, 0);

  // Vista territorial por defecto (o cargada desde localStorage si el usuario ya la guardó)
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

  // Waypoints con coordenadas EXACTAS y verificadas con el shapefile GIS
  const waypoints = {
    overview:    { pos: territoryCamPos, target: territoryTarget },
    burro:       { pos: new THREE.Vector3(210, 85, 95),  target: new THREE.Vector3(210, 0, -10) },   // Humedal El Burro (W[14])
    vaca:        { pos: new THREE.Vector3(65, 80, 215),  target: new THREE.Vector3(65, 0, 125) },    // Humedal La Vaca (W[16] junto a Corabastos)
    techo:       { pos: new THREE.Vector3(292, 80, 10),  target: new THREE.Vector3(292, 0, -80) },   // Humedal de Techo (W[18] adyacente a El Burro)
    perspective: { pos: new THREE.Vector3(204, 2.6, -14), target: new THREE.Vector3(216, 2.2, 42) } // Modo Perspectiva a nivel de agua/suelo
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
  renderer.toneMappingExposure = 1.35;

  // OrbitControls: Zoom profundo y rotación 360° sin restricciones
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.screenSpacePanning = true;
  controls.maxDistance = 3500;
  controls.minDistance = 2.0;
  controls.maxPolarAngle = Math.PI;
  controls.target.copy(swarmTarget);

  // Auto-fade del título al interactuar con el mouse, scroll o tocar
  let userHasInteracted = false;
  function triggerTitleFadeOut() {
    if (!userHasInteracted) {
      userHasInteracted = true;
      if (swarmIntroBox) swarmIntroBox.classList.add("fade-out");
    }
  }

  controls.addEventListener("start", triggerTitleFadeOut);
  window.addEventListener("wheel", triggerTitleFadeOut, { passive: true });
  window.addEventListener("touchmove", triggerTitleFadeOut, { passive: true });

  // Resize handler
  window.addEventListener("resize", () => {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if (particleMat) {
      particleMat.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
    }
  });

  // Base Paisajística del Territorio (Oculta en la fase de red inicial)
  const sceneBaseGroup = new THREE.Group();
  sceneBaseGroup.visible = false;
  sceneRoot.add(sceneBaseGroup);

  function createExpansiveBase() {
    const discGeo = new THREE.RingGeometry(5, 1700, 80);
    const discMat = new THREE.MeshBasicMaterial({
      color: 0x141412,
      transparent: true,
      opacity: 0.94,
      side: THREE.DoubleSide
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = -0.6;
    sceneBaseGroup.add(disc);

    const grid = new THREE.GridHelper(2800, 100, 0x245E55, 0x1D1D1B);
    grid.position.y = -0.55;
    grid.material.opacity = 0.35;
    grid.material.transparent = true;
    sceneBaseGroup.add(grid);
  }
  createExpansiveBase();

  // =====================================================================
  // 1. PALETA OFICIAL & BASE DE DATOS DE ESPECIES
  // =====================================================================
  // Paleta oficial:
  // TEA = 0x245E55, MUSTARD = 0xEAC119, LAVENDER = 0x808BC5, PINK_QUARTZ = 0xEAA7C7,
  // TANGERINE = 0xED773C, SKY = 0x9ED6DF, RED_PASSION = 0xC63F3E, MUTED_BLACK = 0x1D1D1B

  const SPECIES_CATALOG = [
    // Flora: VERDE FRESCO BOTÁNICO (Restaurado como le gustó)
    { common: "Sauco del Humedal", scientific: "Sambucus nigra", taxon: "Plantae", icon: "fa-leaf", habitat: "Bosque ripario y orillas de El Burro", diet: "Fotosíntesis y nutrientes del humedal", relations: ["Frutos para aves migratorias", "Fijación de taludes", "Sombra y microclima"], color: 0x2E8B57 },
    { common: "Junco de Agua", scientific: "Schoenoplectus californicus", taxon: "Plantae", icon: "fa-spa", habitat: "Zonas de inundación permanente", diet: "Filtración hídrica fitorremediadora", relations: ["Filtro de metales pesados", "Nidación de Tingua Bogotana", "Refugio de alevines"], color: 0x48BB78 },
    { common: "Lenteja de Agua", scientific: "Lemna minor", taxon: "Plantae", icon: "fa-seedling", habitat: "Espejos de agua lénticos", diet: "Absorción de nitrógeno y fósforo", relations: ["Alimento de aves acuáticas", "Oxigenación", "Control de algas"], color: 0x52B788 },
    { common: "Urapán", scientific: "Fraxinus chinensis", taxon: "Plantae", icon: "fa-tree", habitat: "Dosel urbano y rondas de canal", diet: "Nutrición edáfica y fotosíntesis", relations: ["Percha de rapaces", "Hábitat de murciélagos", "Captura de CO2"], color: 0x2E8B57 },
    { common: "Capulí", scientific: "Prunus serotina", taxon: "Plantae", icon: "fa-tree", habitat: "Borde de quebradas y reservas", diet: "Nutrientes de suelo aluvial", relations: ["Alimento de cusumbos", "Polinización por abejas", "Corredor biológico"], color: 0x48BB78 },
    { common: "Aliso Sabanero", scientific: "Alnus acuminata", taxon: "Plantae", icon: "fa-tree", habitat: "Ronda hidráulica Río Bogotá", diet: "Fijación biológica de nitrógeno", relations: ["Fijación de suelo", "Refugio de curíes", "Aporte de materia orgánica"], color: 0x2E8B57 },

    // Invertebrados / Polinizadores: CREMITA ARQUITECTÓNICO CÁLIDO
    { common: "Abejorro Sabanero", scientific: "Bombus rubicundus", taxon: "Insecta", icon: "fa-clover", habitat: "Flores de Sauco, Tingua y Jardines", diet: "Néctar y polen silvestre", relations: ["Polinizador clave", "Zumbido de alta vibración", "Mutualismo floral"], color: 0xE2D9CC },
    { common: "Murciélago Mastín", scientific: "Molossus molossus", taxon: "Mammalia", icon: "fa-bat", habitat: "Huecos de árboles y cielo nocturno", diet: "Insectos voladores nocturnos y polillas", relations: ["Control biológico de plagas", "Bioacústica ultrasónica", "Polinización nocturna"], color: 0xD0C4AF },
    { common: "Libélula Azul", scientific: "Rhionaeschna marchali", taxon: "Insecta", icon: "fa-bug", habitat: "Ronda hidráulica y espejos de agua", diet: "Mosquitos adultos y moscas", relations: ["Depredador aéreo de plagas", "Fase larvaria bentónica", "Presa de aves"], color: 0x00B4D8 },
    { common: "Mariposa Espejito", scientific: "Dione vanillae", taxon: "Insecta", icon: "fa-worm", habitat: "Jardines y enredaderas de pasiflora", diet: "Néctar floral y hojas nutricias", relations: ["Polinizadora diurna", "Metamorfosis en orillas", "Alimento de aves"], color: 0xE2D9CC },
    { common: "Hongo Micorrícico", scientific: "Glomus intraradices", taxon: "Fungi", icon: "fa-cube", habitat: "Suelo rizosférico del humedal", diet: "Azúcares de raíces de sauce y junco", relations: ["Red de transporte de fósforo", "Biofiltro del suelo", "Conexión simbiótica"], color: 0xD0C4AF },

    // Avifauna: AZUL HUMEDAL VIBRANTE
    { common: "Tingua Azul", scientific: "Porphyrio martinica", taxon: "Aves", icon: "fa-feather", habitat: "Lámina de agua y vegetación flotante", diet: "Lenteja de agua, semillas y moluscos", relations: ["Ave migratoria", "Nidificación en juncales", "Dispersora de macrófitas"], color: 0x00B4D8 },
    { common: "Tingua Bogotana", scientific: "Rallus semiplumbeus", taxon: "Aves", icon: "fa-dove", habitat: "Densos juncales del Humedal El Burro", diet: "Invertebrados acuáticos y brotes tiernos", relations: ["Especie endémica en peligro", "Bioindicador de conservación", "Nidos flotantes"], color: 0x00B4D8 },
    { common: "Garza Real", scientific: "Ardea alba", taxon: "Aves", icon: "fa-dove", habitat: "Orillas abiertas del Humedal El Burro", diet: "Ranas sabaneras, peces y coleópteros", relations: ["Depredador acuático tope", "Indicador de calidad hídrica", "Vuelo en bandadas"], color: 0x00B4D8 },
    { common: "Pato Turrio", scientific: "Oxyura jamaicensis", taxon: "Aves", icon: "fa-water", habitat: "Lagunas profundas de Kennedy", diet: "Larvas de quironómidos y plantas sumergidas", relations: ["Buceo profundo", "Oxigenación de sedimentos", "Comensalismo con tinguas"], color: 0x00B4D8 },
    { common: "Alcaraván Sabanero", scientific: "Vanellus chilensis", taxon: "Aves", icon: "fa-dove", habitat: "Campos abiertos y riberas secas", diet: "Gusanos, escarabajos y pequeños moluscos", relations: ["Guardián del territorio", "Alarma sonora comunitaria", "Nidos en suelo"], color: 0x00B4D8 },

    // Fauna / Mamíferos / Herpetos: CREMITA & VERDE
    { common: "Rana Sabanera", scientific: "Dendropsophus molitor", taxon: "Amphibia", icon: "fa-frog", habitat: "Espejos de agua y juncales de El Burro", diet: "Insectos acuáticos, larvas y dípteros", relations: ["Control de mosquitos", "Alimento de Garza Real", "Refugio en Juncos"], color: 0x00B4D8 },
    { common: "Serpiente Sabanera", scientific: "Atractus crassicaudatus", taxon: "Reptilia", icon: "fa-staff-snake", habitat: "Suelo húmedo y pastizales de ribera", diet: "Lombrices de tierra y babosas", relations: ["Control de babosas", "Caza bajo hojarasca", "Presa de Gavilanes"], color: 0x2E8B57 },
    { common: "Cusumbo Andino", scientific: "Nasua olivacea", taxon: "Mammalia", icon: "fa-paw", habitat: "Reserva Umbral Horizontes / El Burro", diet: "Frutos de Sauco, semillas e invertebrados", relations: ["Dispersión de semillas", "Forrajeo en dosel", "Polinización indirecta"], color: 0xE2D9CC },
    { common: "Comadreja Andina", scientific: "Neogale frenata", taxon: "Mammalia", icon: "fa-paw", habitat: "Ribera del Río Bogotá y canales", diet: "Pequeños roedores y anfibios", relations: ["Depredador tope", "Control poblacional", "Madrigueras en taludes"], color: 0xD0C4AF },
    { common: "Hicotea del Humedal", scientific: "Trachemys callirostris", taxon: "Reptilia", icon: "fa-shield-halved", habitat: "Zonas de remanso y asoleaderos de agua", diet: "Vegetación sumergida y detritos acuáticos", relations: ["Limpieza de detritos", "Asoleo en troncos", "Nidación en ribera"], color: 0x00B4D8 },
    { common: "Curí Sabanero", scientific: "Cavia aperea", taxon: "Mammalia", icon: "fa-paw", habitat: "Pastizales inundables y rondas", diet: "Gramíneas, pasto kikuyo y hojas", relations: ["Herbívoro primario", "Presa clave", "Túneles ecológicos"], color: 0x2E8B57 }
  ];

  // Catálogo Georreferenciado Exacto de Especies y Árboles en Kennedy (Censo Forestal Real & Humedales)
  const SPECIES_GEO_NODES = [
    {
      id: "sauco",
      name: "Sauco del Humedal",
      sci: "Sambucus nigra",
      type: "Flora / Árbol Nativo",
      count: "5,553 árboles",
      avgHeight: "3.1 m (hasta 8 m)",
      img: "./assets/inat_sauco.png",
      pos: { x: 221, y: 14, z: 125 },
      camPos: { x: 221, y: 55, z: 185 },
      camTarget: { x: 221, y: 0, z: 125 },
      habitat: "Bosque ripario y orillas de El Burro",
      role: "Fitorremediación de taludes, néctar para polinizadores y alimento primario de aves acuáticas y migratorias.",
      color: 0x2E8B57
    },
    {
      id: "capulin",
      name: "Capulí / Cerezo",
      sci: "Prunus serotina",
      type: "Flora / Árbol Frutal Silvestre",
      count: "1,901 árboles",
      avgHeight: "3.7 m (hasta 12 m)",
      img: "./assets/inat_capulin.png",
      pos: { x: 209, y: 15, z: 141 },
      camPos: { x: 209, y: 60, z: 200 },
      camTarget: { x: 209, y: 0, z: 141 },
      habitat: "Borde de quebradas, rondas hidráulicas y reservas",
      role: "Frutos dulces esenciales para aves frugívoras y murciélagos, atracción de abejas nativas y enriquecimiento del suelo.",
      color: 0x48BB78
    },
    {
      id: "urapan",
      name: "Urapán / Fresno",
      sci: "Fraxinus chinensis",
      type: "Flora / Árbol de Dosel Alto",
      count: "3,113 árboles",
      avgHeight: "8.5 m (hasta 20 m)",
      img: "./assets/cx_urapan.png",
      pos: { x: 251, y: 22, z: 142 },
      camPos: { x: 251, y: 75, z: 205 },
      camTarget: { x: 251, y: 0, z: 142 },
      habitat: "Dosel urbano, parques y corredores biológicos de Kennedy",
      role: "Árbol de gran porte que conforma el estrato alto, percha preferida de gavilanes y rapaces, y capturador masivo de CO2.",
      color: 0x2E8B57
    },
    {
      id: "chicala",
      name: "Chicalá / Flor Amarillo",
      sci: "Tecoma stans",
      type: "Flora / Árbol Melífero",
      count: "6,884 árboles",
      avgHeight: "2.6 m (hasta 6 m)",
      img: "./assets/inat_timboco.png",
      pos: { x: 210, y: 14, z: 96 },
      camPos: { x: 210, y: 55, z: 155 },
      camTarget: { x: 210, y: 0, z: 96 },
      habitat: "Parques zonales, separadores y bordes de humedal",
      role: "Floración dorada continua que nutre colibríes y abejorros sabaneros a lo largo de todo el año.",
      color: 0xEAC119
    },
    {
      id: "caucho",
      name: "Caucho Sabanero",
      sci: "Ficus soatensis",
      type: "Flora / Árbol Nativo Emblemático",
      count: "2,860 árboles",
      avgHeight: "6.3 m (hasta 15 m)",
      img: "./assets/inat_espino.png",
      pos: { x: 172, y: 18, z: 138 },
      camPos: { x: 172, y: 65, z: 198 },
      camTarget: { x: 172, y: 0, z: 138 },
      habitat: "Borde de lagunas y rondas de conservación",
      role: "Copas densas perennes que regulan la temperatura microclimática y ofrecen refugio a colonias de aves.",
      color: 0x2E8B57
    },
    {
      id: "aliso",
      name: "Aliso Sabanero",
      sci: "Alnus acuminata",
      type: "Flora / Árbol Fijador de Nitrógeno",
      count: "1,058 árboles",
      avgHeight: "2.7 m (hasta 12 m)",
      img: "./assets/inat_chilca.png",
      pos: { x: 203, y: 15, z: -102 },
      camPos: { x: 203, y: 55, z: -45 },
      camTarget: { x: 203, y: 0, z: -102 },
      habitat: "Rondas inundables y riberas del Río Bogotá",
      role: "Fijación simbiótica de nitrógeno que recupera suelos degradados y previene la erosión hídrica.",
      color: 0x48BB78
    },
    {
      id: "junco",
      name: "Junco de Agua",
      sci: "Schoenoplectus californicus",
      type: "Macrófita Emergente",
      count: "14,200 matas",
      avgHeight: "2.2 m",
      img: "./assets/inat_juncal.png",
      pos: { x: 210, y: 9, z: -10 },
      camPos: { x: 210, y: 45, z: 45 },
      camTarget: { x: 210, y: 0, z: -10 },
      habitat: "Espejos de agua y lámina permanente de El Burro",
      role: "Biofiltro natural de metales pesados y sitio exclusivo de nidación de la amenazada Tingua Bogotana.",
      color: 0x00B4D8
    },
    {
      id: "tingua",
      name: "Tingua Bogotana",
      sci: "Rallus semiplumbeus",
      type: "Fauna / Ave Acuática Endémica",
      count: "320 individuos",
      avgHeight: "28 cm de longitud",
      img: "./assets/tingua.png",
      pos: { x: 216, y: 8, z: 5 },
      camPos: { x: 216, y: 40, z: 55 },
      camTarget: { x: 216, y: 0, z: 5 },
      habitat: "Juncales densos de El Burro y La Vaca",
      role: "Especie paraguas del altiplano cundiboyacense en peligro de extinción, bioindicador de aguas limpias.",
      color: 0x00B4D8
    },
    {
      id: "garza",
      name: "Garza Real",
      sci: "Ardea alba",
      type: "Fauna / Ave Pescadora",
      count: "180 individuos",
      avgHeight: "90 cm de envergadura",
      img: "./assets/inat_garza.png",
      pos: { x: 228, y: 11, z: -25 },
      camPos: { x: 228, y: 45, z: 30 },
      camTarget: { x: 228, y: 0, z: -25 },
      habitat: "Orillas lodosas y aguas someras de El Burro",
      role: "Control poblacional de peces invasores (guppy) y anfibios en las lagunas de Kennedy.",
      color: 0x00B4D8
    },
    {
      id: "rana",
      name: "Rana Sabanera",
      sci: "Dendropsophus molitor",
      type: "Fauna / Anfibio Silvestre",
      count: "8,500 individuos",
      avgHeight: "4.5 cm",
      img: "./assets/inat_rana.png",
      pos: { x: 195, y: 7, z: -18 },
      camPos: { x: 195, y: 35, z: 30 },
      camTarget: { x: 195, y: 0, z: -18 },
      habitat: "Espejos de agua lénticos y hojarasca húmeda",
      role: "Control biológico masivo de zancudos y larvas, y presa esencial para la avifauna del humedal.",
      color: 0x48BB78
    },
    {
      id: "pato",
      name: "Pato Turrio",
      sci: "Oxyura jamaicensis",
      type: "Fauna / Ave Buceadora",
      count: "240 individuos",
      avgHeight: "43 cm",
      img: "./assets/inat_oxyura.png",
      pos: { x: 65, y: 10, z: 125 },
      camPos: { x: 65, y: 45, z: 180 },
      camTarget: { x: 65, y: 0, z: 125 },
      habitat: "Laguna profunda del Humedal La Vaca",
      role: "Buceador que remueve sedimentos del fondo, oxigenando el lecho lacustre y consumiendo larvas bentónicas.",
      color: 0x00B4D8
    },
    {
      id: "mariposa",
      name: "Mariposa Espejito / Polinizadores",
      sci: "Dione vanillae",
      type: "Fauna / Insecto Polinizador",
      count: "9,800 individuos",
      avgHeight: "7 cm de envergadura",
      img: "./assets/inat_mariposa.png",
      pos: { x: 235, y: 13, z: -60 },
      camPos: { x: 235, y: 50, z: -10 },
      camTarget: { x: 235, y: 0, z: -60 },
      habitat: "Jardines florales, pasifloras y copas de Saucos",
      role: "Polinizadora diurna indispensable que mantiene la diversidad genética de las plantas con flor de Kennedy.",
      color: 0xE2D9CC
    }
  ];

  // =====================================================================
  // 2. RED BIÓTICA: ATRACTOR GENERATIVO FLUIDO (TOUCHDESIGNER VORTEX CLOUD)
  // =====================================================================
  const SWARM_COUNT = 850;
  const swarmGroup = new THREE.Group();
  sceneRoot.add(swarmGroup);

  // Textura suave y etérea con núcleo luminoso tipo TouchDesigner
  function createNodeGlowTexture() {
    const cvs = document.createElement("canvas");
    cvs.width = 64; cvs.height = 64;
    const ctx = cvs.getContext("2d");

    const radGlow = ctx.createRadialGradient(32, 32, 1, 32, 32, 30);
    radGlow.addColorStop(0, "rgba(255, 255, 255, 1.0)");
    radGlow.addColorStop(0.2, "rgba(245, 158, 11, 0.95)");
    radGlow.addColorStop(0.55, "rgba(217, 119, 6, 0.4)");
    radGlow.addColorStop(1, "rgba(20, 20, 22, 0)");
    ctx.fillStyle = radGlow;
    ctx.fillRect(0, 0, 64, 64);

    return new THREE.CanvasTexture(cvs);
  }

  const nodeGlowTex = createNodeGlowTexture();

  const nodeMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uMorph: { value: 0.0 },
      uTexture: { value: nodeGlowTex }
    },
    vertexShader: `
      attribute vec3 aNodeColor;
      attribute float aNodeScale;
      varying vec3 vColor;
      varying float vAlpha;
      uniform float uMorph;
      uniform float uTime;
      
      void main() {
        vColor = aNodeColor;
        vAlpha = max(0.0, 1.0 - uMorph * 3.0);
        
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPos;
        gl_PointSize = aNodeScale * (400.0 / -mvPos.z) * vAlpha;
      }
    `,
    fragmentShader: `
      uniform sampler2D uTexture;
      varying vec3 vColor;
      varying float vAlpha;
      
      void main() {
        if (vAlpha < 0.01) discard;
        vec4 texCol = texture2D(uTexture, gl_PointCoord);
        if (texCol.a < 0.04) discard;
        gl_FragColor = vec4(vColor * texCol.rgb, texCol.a * vAlpha * 0.95);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const swarmNodes = [];
  const nodePositions = new Float32Array(SWARM_COUNT * 3);
  const nodeColors = new Float32Array(SWARM_COUNT * 3);
  const nodeScales = new Float32Array(SWARM_COUNT);

  // Generación tipo Atractor Toroidal / Curl-Noise Nebula (TouchDesigner aesthetic)
  for (let i = 0; i < SWARM_COUNT; i++) {
    const species = SPECIES_CATALOG[i % SPECIES_CATALOG.length];

    const u = (i / SWARM_COUNT) * Math.PI * 2 * 3.0;
    const v = ((i % 31) / 31.0) * Math.PI * 2;
    const R = 25.0 + 7.0 * Math.sin(i * 0.35);
    const r = 10.5 + 4.5 * Math.cos(i * 0.45);
    
    // Nube orgánica toroidal con torsión espacial
    const x = (R + r * Math.cos(v)) * Math.cos(u);
    const z = (R + r * Math.cos(v)) * Math.sin(u);
    const y = r * Math.sin(v) * 0.85 + Math.sin(u * 2.0) * 6.0;

    const col = new THREE.Color(species.color);

    nodePositions[i * 3]     = x;
    nodePositions[i * 3 + 1] = y;
    nodePositions[i * 3 + 2] = z;

    nodeColors[i * 3]     = col.r;
    nodeColors[i * 3 + 1] = col.g;
    nodeColors[i * 3 + 2] = col.b;

    nodeScales[i] = 1.35 + (i % 3 === 0 ? 0.45 : 0.0);

    swarmNodes.push({
      id: i,
      species: species,
      baseX: x, baseY: y, baseZ: z,
      x: x, y: y, z: z,
      phase: Math.random() * Math.PI * 2,
      orbitSpeed: 0.25 + Math.random() * 0.35,
      radius: Math.sqrt(x * x + z * z),
      baseAngle: Math.atan2(z, x),
      ampY: 2.0 + Math.random() * 3.5,
      scale: nodeScales[i],
      color: col,
      neighbors: [],
      highlighted: false
    });
  }

  const nodeGeo = new THREE.BufferGeometry();
  nodeGeo.setAttribute("position", new THREE.BufferAttribute(nodePositions, 3));
  nodeGeo.setAttribute("aNodeColor", new THREE.BufferAttribute(nodeColors, 3));
  nodeGeo.setAttribute("aNodeScale", new THREE.BufferAttribute(nodeScales, 1));

  const nodePoints = new THREE.Points(nodeGeo, nodeMat);
  swarmGroup.add(nodePoints);

  const MAX_LINKS_PER_NODE = 4;
  const linkList = [];

  for (let i = 0; i < SWARM_COUNT; i++) {
    const ni = swarmNodes[i];
    const dists = [];
    for (let j = 0; j < SWARM_COUNT; j++) {
      if (i === j) continue;
      const nj = swarmNodes[j];
      const dSq = (ni.baseX - nj.baseX)**2 + (ni.baseY - nj.baseY)**2 + (ni.baseZ - nj.baseZ)**2;
      dists.push({ id: j, dSq: dSq });
    }
    dists.sort((a, b) => a.dSq - b.dSq);

    for (let k = 0; k < MAX_LINKS_PER_NODE; k++) {
      const neighbor = dists[k];
      if (neighbor && neighbor.dSq < 200) {
        if (!ni.neighbors.includes(neighbor.id)) {
          ni.neighbors.push(neighbor.id);
          if (i < neighbor.id) {
            linkList.push([i, neighbor.id]);
          }
        }
      }
    }
  }

  const totalLinks = linkList.length;
  const linkPos = new Float32Array(totalLinks * 2 * 3);
  const linkCol = new Float32Array(totalLinks * 2 * 3);

  for (let l = 0; l < totalLinks; l++) {
    const [i, j] = linkList[l];
    const ni = swarmNodes[i];
    const nj = swarmNodes[j];
    const ptr = l * 6;

    linkPos[ptr]     = ni.baseX; linkPos[ptr + 1] = ni.baseY; linkPos[ptr + 2] = ni.baseZ;
    linkPos[ptr + 3] = nj.baseX; linkPos[ptr + 4] = nj.baseY; linkPos[ptr + 5] = nj.baseZ;

    const c1 = ni.color;
    const c2 = nj.color;
    linkCol[ptr]     = c1.r * 0.85; linkCol[ptr + 1] = c1.g * 0.85; linkCol[ptr + 2] = c1.b * 0.85;
    linkCol[ptr + 3] = c2.r * 0.85; linkCol[ptr + 4] = c2.g * 0.85; linkCol[ptr + 5] = c2.b * 0.85;
  }

  const linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute("position", new THREE.BufferAttribute(linkPos, 3));
  linkGeo.setAttribute("color", new THREE.BufferAttribute(linkCol, 3));

  const linkMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending
  });
  const linkLines = new THREE.LineSegments(linkGeo, linkMat);
  swarmGroup.add(linkLines);

  function updateNetworkSwarm(time, morphProgress) {
    if (morphProgress > 0.28) {
      swarmGroup.visible = false;
      return;
    }
    swarmGroup.visible = true;

    swarmGroup.rotation.y = time * 0.035;
    swarmGroup.rotation.x = Math.sin(time * 0.02) * 0.03;

    nodeMat.uniforms.uTime.value = time;
    nodeMat.uniforms.uMorph.value = morphProgress;
    linkMat.opacity = Math.max(0.0, (1.0 - morphProgress * 3.2) * 0.35);

    const posArr = nodeGeo.attributes.position.array;
    const lPosArr = linkGeo.attributes.position.array;

    for (let i = 0; i < SWARM_COUNT; i++) {
      const d = swarmNodes[i];
      // Flujo de rotación toroidal continuo tipo TouchDesigner
      const curAngle = d.baseAngle + time * d.orbitSpeed * 0.4;
      const waveRadial = Math.sin(time * 1.1 + d.phase) * 2.5;
      const r = d.radius + waveRadial;

      const curX = Math.cos(curAngle) * r;
      const curZ = Math.sin(curAngle) * r;
      const curY = d.baseY + Math.sin(time * 1.3 + d.phase) * d.ampY + Math.cos(curAngle * 2.0) * 2.0;

      d.x = curX; d.y = curY; d.z = curZ;

      posArr[i * 3]     = curX;
      posArr[i * 3 + 1] = curY;
      posArr[i * 3 + 2] = curZ;
    }

    for (let l = 0; l < totalLinks; l++) {
      const [i, j] = linkList[l];
      const ni = swarmNodes[i];
      const nj = swarmNodes[j];
      const ptr = l * 6;

      lPosArr[ptr]     = ni.x; lPosArr[ptr + 1] = ni.y; lPosArr[ptr + 2] = ni.z;
      lPosArr[ptr + 3] = nj.x; lPosArr[ptr + 4] = nj.y; lPosArr[ptr + 5] = nj.z;
    }

    nodeGeo.attributes.position.needsUpdate = true;
    linkGeo.attributes.position.needsUpdate = true;
  }

  // =====================================================================
  // 3. GLSL SHADER DE EXPLOSIÓN EN VÓRTICE & SIMULACIÓN TOUCHDESIGNER
  // =====================================================================
  const vertexShader = `
    uniform float uMorphProgress;
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
    
    void main() {
      vColor = aColor;
      vCategory = aCategory;
      
      float t = uMorphProgress;
      float ease = smoothstep(0.0, 1.0, t);
      
      // Simulación generativa de fluidos tipo TouchDesigner (Vórtice advectivo)
      float explosionIntensity = sin(ease * 3.14159);
      vec3 curlVortex = vec3(
        sin(uTime * 1.6 + position.y * 0.08 + aPhase * 2.0) * 46.0 * explosionIntensity + cos(uTime * 1.1 + position.z * 0.05) * 28.0 * explosionIntensity,
        cos(uTime * 1.3 + position.x * 0.08 + aPhase * 2.0) * 38.0 * explosionIntensity + sin(uTime * 1.7 + position.z * 0.06) * 24.0 * explosionIntensity,
        sin(uTime * 1.5 + position.x * 0.08 + aPhase * 3.0) * 46.0 * explosionIntensity + cos(uTime * 0.9 + position.y * 0.05) * 28.0 * explosionIntensity
      );
      
      vec3 territorialIdle = vec3(0.0);
      if (aCategory < 0.5) {
        territorialIdle.y = sin(uTime * 2.8 + position.x * 0.18 + position.z * 0.18) * 0.45 * ease;
      } else if (aCategory < 1.5) {
        territorialIdle.x = sin(uTime * 1.9 + aPhase * 4.0) * 0.3 * ease;
        territorialIdle.z = cos(uTime * 1.6 + aPhase * 4.0) * 0.3 * ease;
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
      
      float distFactor = clamp(260.0 / -mvPosition.z, 0.35, 1.7);
      gl_PointSize = (aSize + rippleWave * 1.0 + explosionIntensity * 0.7) * uPixelRatio * distFactor;
      
      vAlpha = smoothstep(0.04, 0.8, ease) * 0.95 + explosionIntensity * 0.35;
    }
  `;

  const fragmentShader = `
    varying vec3 vColor;
    varying float vCategory;
    varying float vAlpha;
    varying float vRippleBoost;
    
    void main() {
      if (vAlpha < 0.01) discard;
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord);
      if (dist > 0.5) discard;
      
      float edgeAlpha = smoothstep(0.5, 0.06, dist);
      
      vec3 col = vColor;
      if (vRippleBoost > 0.05) {
        col = mix(col, vec3(0.0, 0.66, 0.8), vRippleBoost * 0.65);
      }
      
      gl_FragColor = vec4(col, edgeAlpha * vAlpha);
    }
  `;

  const particleUniforms = {
    uMorphProgress: { value: 0.0 },
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

  const pTarget = [];
  const pSwarm = [];
  const pColor = [];
  const pSize = [];
  const pPhase = [];
  const pCat = [];

  let particlePoints = null;
  let currentParticleIndex = 0;

  function randomSwarmCluster(idx) {
    const node = swarmNodes[idx % SWARM_COUNT];
    return {
      x: node.baseX + (Math.random() - 0.5) * 2.0,
      y: node.baseY + (Math.random() - 0.5) * 2.0,
      z: node.baseZ + (Math.random() - 0.5) * 2.0
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

  // =====================================================================
  // 4. CARGA DE CAPAS GEOGRÁFICAS (PALETA RESTAURADA & CREMITA SUAVE)
  // =====================================================================
  function loadWater() {
    return fetch(WATER_URL)
      .then(r => r.json())
      .then(waterBodies => {
        // Cuerpos de Agua: Azul Nítido y Luminoso (#00B4D8 & #0077B6)
        const colWaterMain = new THREE.Color(0x00B4D8); // Azul Humedal Brillante (#00B4D8)
        const colWaterDeep = new THREE.Color(0x0077B6); // Azul Profundo (#0077B6)

        waterBodies.forEach(w => {
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
              pSize.push(1.6);
              pPhase.push(Math.random() * 10);
              pCat.push(0.0); // 0 = agua
            }
          });

          for (let i = 0; i < sPts.length; i++) {
            const p = sPts[i];
            const sw = randomSwarmCluster(currentParticleIndex++);
            pTarget.push(p.x, 0.32, p.z);
            pSwarm.push(sw.x, sw.y, sw.z);
            pColor.push(colWaterMain.r, colWaterMain.g, colWaterMain.b);
            pSize.push(1.7);
            pPhase.push(i * 0.3);
            pCat.push(0.0);
          }
        });

        rebuildTerritoryParticles();
      })
      .catch(err => console.warn("Error agua:", err));
  }

  function loadTrees() {
    return fetch(TREES_URL)
      .then(r => r.json())
      .then(trees => {
        // Vegetación en VERDE FRESCO BOTÁNICO VIBRANTE (#2E8B57 & #48BB78)
        const colTreeLush = new THREE.Color(0x2E8B57);    // Verde Esmeralda / Bosque (#2E8B57)
        const colTreeBright = new THREE.Color(0x48BB78);  // Verde Hoja Fresco (#48BB78)
        const colTrunk = new THREE.Color(0x1A202C);       // Tronco oscuro (#1A202C)

        trees.forEach((t, i) => {
          const [x, y, hMeters] = t;
          const p = toScene(x, y);
          const h = Math.max(0.7, (hMeters || 8) * SCALE);

          const folCol = (i % 2 === 0) ? colTreeLush : colTreeBright;

          const crownY = h * 0.85;
          const swCrown = randomSwarmCluster(currentParticleIndex++);
          pTarget.push(p.x, crownY, p.z);
          pSwarm.push(swCrown.x, swCrown.y, swCrown.z);
          pColor.push(folCol.r, folCol.g, folCol.b);
          pSize.push(1.6);
          pPhase.push(i * 0.25);
          pCat.push(1.0); // 1 = arbol

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
        const colRoad = new THREE.Color(0x27272A);        // Asfalto Grafito Muted
        const colMajor = new THREE.Color(0x38BDF8);       // Vías Principales Sky Blue

        edges.forEach(([kind, pts], edgeIdx) => {
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
            pCat.push(3.0); // 3 = via
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
        // Paleta Arquitectónica: Cremita Suave / Lino Cálido (No blanco, no morado, no ámbar)
        const colBldgCream = new THREE.Color(0xE2D9CC);   // Cremita Suave (#E2D9CC)
        const colBldgSand  = new THREE.Color(0xD0C4AF);   // Arena Suave (#D0C4AF)
        const colRoofHighlight = new THREE.Color(0xEDE6DB); // Remate superior crema claro
        const colBaseGround = new THREE.Color(0x161618);  // Fondo negro grafito

        buildings.forEach((b, bIdx) => {
          const pts = b.pts;
          if (!pts || pts.length < 3) return;

          const sPts = pts.map(p => toScene(p[0], p[1]));
          const h = (b.height || 10) * SCALE;
          
          // Estructura volumétrica arquitectónica homogénea en crema
          const bldgCol = (bIdx % 2 === 0) ? colBldgCream : colBldgSand;

          for (let i = 0; i < sPts.length; i++) {
            const p = sPts[i];
            const steps = Math.max(3, Math.floor(h / 1.1));
            for (let step = 0; step <= steps; step++) {
              const y = (step / steps) * h;
              const sw = randomSwarmCluster(currentParticleIndex++);
              pTarget.push(p.x, y, p.z);
              pSwarm.push(sw.x, sw.y, sw.z);
              
              // Remates superiores nítidos
              const isRoof = (step === steps);
              const c = isRoof ? colRoofHighlight : bldgCol;
              pColor.push(c.r, c.g, c.b);
              pSize.push(isRoof ? 1.35 : 1.15);
              pPhase.push(bIdx + step);
              pCat.push(2.0); // 2 = edificio
            }
          }
        });

        // Suelo de relleno territorial en negro profundo y matices sutiles
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
          pSize.push(0.95);
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

  // =====================================================================
  // 5.1 BALIZAS Y ORBES 3D FLOTANTES DE ESPECIES Y CENSO FORESTAL
  // =====================================================================
  const speciesBeaconsGroup = new THREE.Group();
  speciesBeaconsGroup.visible = false;
  sceneRoot.add(speciesBeaconsGroup);

  const beaconInstances = [];

  function createCircularSpriteTexture(imgSrc, colorHex) {
    const cvs = document.createElement("canvas");
    cvs.width = 128;
    cvs.height = 128;
    const ctx = cvs.getContext("2d");

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imgSrc;
    
    const tex = new THREE.CanvasTexture(cvs);
    
    img.onload = () => {
      ctx.clearRect(0, 0, 128, 128);
      ctx.save();
      
      // Fondo y resplandor circular exterior
      ctx.beginPath();
      ctx.arc(64, 64, 60, 0, Math.PI * 2);
      ctx.strokeStyle = colorHex;
      ctx.lineWidth = 8;
      ctx.shadowColor = colorHex;
      ctx.shadowBlur = 14;
      ctx.stroke();

      // Recorte circular nítido de la fotografía
      ctx.beginPath();
      ctx.arc(64, 64, 54, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      
      ctx.drawImage(img, 10, 10, 108, 108);
      ctx.restore();
      
      tex.needsUpdate = true;
    };
    
    return tex;
  }

  function buildSpecies3DBeacons() {
    speciesBeaconsGroup.clear();
    beaconInstances.length = 0;

    SPECIES_GEO_NODES.forEach((spec, idx) => {
      const group = new THREE.Group();
      group.position.set(spec.pos.x, spec.pos.y, spec.pos.z);

      const col = new THREE.Color(spec.color);
      const hexStr = '#' + col.getHexString();

      // 1. Orbe Fotográfico Flotante (Sprite Billboard)
      const spriteMat = new THREE.SpriteMaterial({
        map: createCircularSpriteTexture(spec.img, hexStr),
        transparent: true,
        depthWrite: false
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(13.5, 13.5, 1);
      sprite.position.set(0, 0, 0);
      sprite.userData = { specIndex: idx, species: spec };
      group.add(sprite);

      // 2. Anillo de Luz Halógena Concéntrico
      const ringGeo = new THREE.RingGeometry(6.6, 7.8, 36);
      const ringMat = new THREE.MeshBasicMaterial({
        color: col,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      group.add(ringMesh);

      // 3. Haz de Luz Vertical / Rayo Láser Conector al Suelo
      const stemHeight = spec.pos.y;
      const stemGeo = new THREE.CylinderGeometry(0.18, 0.28, stemHeight, 8);
      const stemMat = new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending
      });
      const stemMesh = new THREE.Mesh(stemGeo, stemMat);
      stemMesh.position.set(0, -stemHeight / 2, 0);
      group.add(stemMesh);

      // 4. Baliza Pulsante en el Suelo del Bosque / Humedal
      const groundRingGeo = new THREE.RingGeometry(1.6, 4.8, 36);
      const groundRingMat = new THREE.MeshBasicMaterial({
        color: col,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
      });
      const groundRing = new THREE.Mesh(groundRingGeo, groundRingMat);
      groundRing.rotation.x = -Math.PI / 2;
      groundRing.position.set(0, -stemHeight + 0.15, 0);
      group.add(groundRing);

      speciesBeaconsGroup.add(group);

      beaconInstances.push({
        group,
        sprite,
        ringMesh,
        groundRing,
        spec,
        baseY: spec.pos.y,
        phase: idx * 0.75,
        baseScale: 13.5
      });
    });
  }

  buildSpecies3DBeacons();

  // =====================================================================
  // 5.2 CONTROLADOR DEL RECORRIDO BOTÁNICO Y FAUNÍSTICO (TOUR MODE)
  // =====================================================================
  let tourActive = false;
  let tourIndex = 0;
  let tourPlaying = true;
  let tourTimer = null;

  const speciesTourHUD = document.getElementById("speciesTourHUD");
  const tourImg = document.getElementById("tourImg");
  const tourTitle = document.getElementById("tourTitle");
  const tourSci = document.getElementById("tourSci");
  const tourType = document.getElementById("tourType");
  const tourCount = document.getElementById("tourCount");
  const tourHeight = document.getElementById("tourHeight");
  const tourDesc = document.getElementById("tourDesc");
  const tourStepInfo = document.getElementById("tourStepInfo");
  const btnTourPrev = document.getElementById("btnTourPrev");
  const btnTourNext = document.getElementById("btnTourNext");
  const btnTourPlayPause = document.getElementById("btnTourPlayPause");
  const btnTourClose = document.getElementById("btnTourClose");
  const btnTourSpecies = document.getElementById("btnTourSpecies");
  const speciesTray = document.getElementById("speciesTray");

  function populateSpeciesTray() {
    if (!speciesTray) return;
    speciesTray.innerHTML = "";
    SPECIES_GEO_NODES.forEach((spec, idx) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "species-chip";
      chip.innerHTML = `<img src="${spec.img}" alt="${spec.name}"> <span>${spec.name.split('/')[0].trim()}</span>`;
      chip.addEventListener("click", () => {
        focusSpecies(idx, false);
      });
      speciesTray.appendChild(chip);
    });
  }

  populateSpeciesTray();

  function focusSpecies(idx, autoTour = false) {
    if (idx < 0 || idx >= SPECIES_GEO_NODES.length) return;
    tourIndex = idx;
    const spec = SPECIES_GEO_NODES[idx];

    // Si aún estamos en la red inicial, materializar territorio automáticamente
    if (currentMorph < 0.45) {
      animateToStage(1.0);
    }

    // Actualizar ficha HUD
    if (tourImg) tourImg.src = spec.img;
    if (tourTitle) tourTitle.textContent = spec.name;
    if (tourSci) tourSci.textContent = spec.sci;
    if (tourType) tourType.textContent = spec.type;
    if (tourCount) tourCount.textContent = spec.count;
    if (tourHeight) tourHeight.textContent = spec.avgHeight;
    if (tourDesc) tourDesc.innerHTML = `<span>Rol Ecológico:</span> ${spec.role}`;
    if (tourStepInfo) tourStepInfo.textContent = `${idx + 1} / ${SPECIES_GEO_NODES.length}`;

    if (speciesTourHUD) speciesTourHUD.classList.add("show");

    // Resaltar chip activo en la bandeja inferior
    if (speciesTray) {
      const chips = speciesTray.querySelectorAll(".species-chip");
      chips.forEach((c, i) => c.classList.toggle("active", i === idx));
      if (chips[idx]) chips[idx].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }

    // Transición suave de cámara hacia el conglomerado de la especie
    if (window.gsap) {
      gsap.to(camera.position, {
        x: spec.camPos.x,
        y: spec.camPos.y,
        z: spec.camPos.z,
        duration: 2.4,
        ease: "power2.inOut"
      });
      gsap.to(controls.target, {
        x: spec.camTarget.x,
        y: spec.camTarget.y,
        z: spec.camTarget.z,
        duration: 2.4,
        ease: "power2.inOut"
      });
    }

    // Resaltar la baliza 3D activa (escala y brillo)
    beaconInstances.forEach((b, i) => {
      const isCur = (i === idx);
      if (window.gsap) {
        gsap.to(b.sprite.scale, {
          x: isCur ? 21 : 13.5,
          y: isCur ? 21 : 13.5,
          duration: 0.6,
          ease: "back.out(1.8)"
        });
      }
      b.ringMesh.material.opacity = isCur ? 1.0 : 0.35;
    });

    if (soundActive && typeof triggerHarmonicChime === "function") {
      triggerHarmonicChime(0.5 + (idx / SPECIES_GEO_NODES.length) * 0.5);
    }
  }

  function startSpeciesTour() {
    tourActive = true;
    tourPlaying = true;
    if (btnTourPlayPause) btnTourPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i> Pausar';
    if (btnTourSpecies) btnTourSpecies.classList.add("active");
    focusSpecies(tourIndex, true);

    clearInterval(tourTimer);
    tourTimer = setInterval(() => {
      if (!tourPlaying) return;
      tourIndex = (tourIndex + 1) % SPECIES_GEO_NODES.length;
      focusSpecies(tourIndex, true);
    }, 7000);
  }

  function stopSpeciesTour() {
    tourActive = false;
    clearInterval(tourTimer);
    if (speciesTourHUD) speciesTourHUD.classList.remove("show");
    if (btnTourSpecies) btnTourSpecies.classList.remove("active");
    beaconInstances.forEach(b => {
      if (window.gsap) gsap.to(b.sprite.scale, { x: 13.5, y: 13.5, duration: 0.4 });
      b.ringMesh.material.opacity = 0.85;
    });
  }

  if (btnTourSpecies) {
    btnTourSpecies.addEventListener("click", () => {
      if (tourActive && tourPlaying) {
        stopSpeciesTour();
      } else {
        startSpeciesTour();
      }
    });
  }

  if (btnTourPlayPause) {
    btnTourPlayPause.addEventListener("click", () => {
      tourPlaying = !tourPlaying;
      btnTourPlayPause.innerHTML = tourPlaying ? '<i class="fa-solid fa-pause"></i> Pausar' : '<i class="fa-solid fa-play"></i> Reanudar';
    });
  }

  if (btnTourNext) {
    btnTourNext.addEventListener("click", () => {
      tourIndex = (tourIndex + 1) % SPECIES_GEO_NODES.length;
      focusSpecies(tourIndex, false);
    });
  }

  if (btnTourPrev) {
    btnTourPrev.addEventListener("click", () => {
      tourIndex = (tourIndex - 1 + SPECIES_GEO_NODES.length) % SPECIES_GEO_NODES.length;
      focusSpecies(tourIndex, false);
    });
  }

  if (btnTourClose) {
    btnTourClose.addEventListener("click", () => {
      stopSpeciesTour();
    });
  }

  // =====================================================================
  // 5.3 INSPECCIÓN INTERACTIVA DE ESPECIES Y RED TRÓFICA (RAYCASTING)
  // =====================================================================
  const raycaster = new THREE.Raycaster();
  raycaster.params.Points.threshold = 2.4;
  const mouseVec = new THREE.Vector2();
  let hoveredNodeId = -1;

  function checkSwarmHover(event) {
    if (currentMorph > 0.35) return;

    mouseVec.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouseVec.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouseVec, camera);
    const intersection = raycaster.intersectObject(nodePoints);

    if (intersection && intersection.length > 0) {
      const index = intersection[0].index;
      if (index !== undefined && index < swarmNodes.length) {
        showSpeciesInfo(index);
        return;
      }
    }
  }

  function checkBeaconClick(event) {
    if (currentMorph < 0.45) return;
    mouseVec.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouseVec.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouseVec, camera);
    const sprites = beaconInstances.map(b => b.sprite);
    const intersects = raycaster.intersectObjects(sprites, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      if (hit.userData && hit.userData.specIndex !== undefined) {
        focusSpecies(hit.userData.specIndex, false);
      }
    }
  }

  function showSpeciesInfo(nodeId) {
    if (hoveredNodeId === nodeId) return;
    hoveredNodeId = nodeId;

    const node = swarmNodes[nodeId];
    if (!node || !node.species) return;

    const sp = node.species;
    if (cardCommonName) cardCommonName.textContent = sp.common;
    if (cardScientificName) cardScientificName.textContent = sp.scientific;
    if (cardTaxon) cardTaxon.textContent = sp.taxon;
    if (cardHabitat) cardHabitat.textContent = sp.habitat;
    if (cardDiet) cardDiet.textContent = sp.diet;
    if (cardIcon) cardIcon.innerHTML = `<i class="fa-solid ${sp.icon}"></i>`;

    const connectedSpeciesNames = node.neighbors
      .slice(0, 4)
      .map(nid => swarmNodes[nid].species.common);

    const allRelations = [...sp.relations, ...connectedSpeciesNames.map(name => `Interacción con ${name}`)];

    if (cardRelations) {
      cardRelations.innerHTML = allRelations.slice(0, 5).map(r => `<span class="relation-tag">${r}</span>`).join("");
    }

    if (speciesCard) speciesCard.classList.add("show");

    if (soundActive && typeof triggerHarmonicChime === "function") {
      triggerHarmonicChime(0.4);
    }
  }

  window.addEventListener("pointermove", (e) => {
    checkSwarmHover(e);
  });

  window.addEventListener("pointerdown", (e) => {
    if (!e.target.closest("#speciesCard") && !e.target.closest("#speciesTourHUD") && !e.target.closest("#speciesTray") && !e.target.closest(".top-bar") && !e.target.closest(".bottom-experience-bar")) {
      checkSwarmHover(e);
      checkBeaconClick(e);
    }
  });

  // =====================================================================
  // 6. METAMORFOSIS ANIMADA: EXPLOSIÓN CUÁNTICA & GSAP TRANSITION
  // =====================================================================
  let targetMorph = 0.0;
  let currentMorph = 0.0;
  let isTerritory = false;

  const slider = document.getElementById("experienceSlider");
  const btnToggle = document.getElementById("btnPlayTransition");
  const btnTriggerMorph = document.getElementById("btnTriggerMorph");
  const btnActionText = document.getElementById("btnActionText");
  const labelSwarm = document.getElementById("labelSwarm");
  const labelTerritory = document.getElementById("labelTerritory");

  function setMorphValue(val, updateSlider = true) {
    targetMorph = Math.max(0, Math.min(1, val));
    if (updateSlider && slider) {
      slider.value = Math.round(targetMorph * 100);
    }
    isTerritory = targetMorph > 0.45;

    // Mostrar el plano base únicamente en modo territorio
    sceneBaseGroup.visible = targetMorph > 0.15;

    if (btnActionText) {
      btnActionText.textContent = isTerritory ? "DISPERSAR A RED BIÓTICA" : "MATERIALIZAR";
    }
    if (labelSwarm) labelSwarm.classList.toggle("active", targetMorph < 0.2);
    if (labelTerritory) labelTerritory.classList.toggle("active", targetMorph > 0.8);

    if (stageLabel) {
      stageLabel.textContent = isTerritory ? "Territorio 3D de Kennedy" : "Red Biótica · 850 Especies y Conexiones";
    }

    if (swarmIntroBox) {
      swarmIntroBox.classList.toggle("fade-out", targetMorph > 0.1 || userHasInteracted);
    }
    if (speciesCard) {
      speciesCard.classList.toggle("show", targetMorph < 0.15 && hoveredNodeId !== -1);
    }
    if (waypointsBar) {
      waypointsBar.classList.toggle("show", targetMorph > 0.65);
    }
    if (speciesTray) {
      speciesTray.classList.toggle("show", targetMorph > 0.45);
    }
    speciesBeaconsGroup.visible = targetMorph > 0.35;
    if (targetMorph < 0.25 && tourActive) {
      stopSpeciesTour();
    }

    if (soundActive && typeof triggerHarmonicChime === "function") {
      triggerHarmonicChime(targetMorph);
    }
  }

  function animateToStage(dest) {
    triggerTitleFadeOut();
    if (!window.gsap) {
      setMorphValue(dest);
      return;
    }

    const endPos = (dest === 1.0) ? territoryCamPos : swarmCamPos;
    const endTarget = (dest === 1.0) ? territoryTarget : swarmTarget;

    particleUniforms.uRipplePos.value.set(0, 0, 0);
    particleUniforms.uRippleTime.value = 0.0;

    gsap.killTweensOf(particleUniforms.uRippleTime);
    gsap.to(particleUniforms.uRippleTime, {
      value: 1.8,
      duration: 3.2,
      ease: "power2.out"
    });

    const morphObj = { val: currentMorph };
    gsap.to(morphObj, {
      val: dest,
      duration: 3.2,
      ease: "power3.inOut",
      onUpdate: () => setMorphValue(morphObj.val, true)
    });

    gsap.to(camera.position, {
      x: endPos.x,
      y: endPos.y,
      z: endPos.z,
      duration: 3.2,
      ease: "power3.inOut"
    });

    gsap.to(controls.target, {
      x: endTarget.x,
      y: endTarget.y,
      z: endTarget.z,
      duration: 3.2,
      ease: "power3.inOut"
    });
  }

  if (slider) {
    slider.addEventListener("input", (e) => {
      triggerTitleFadeOut();
      setMorphValue(parseFloat(e.target.value) / 100, false);
    });
  }

  if (btnToggle) {
    btnToggle.addEventListener("click", () => {
      const next = isTerritory ? 0.0 : 1.0;
      animateToStage(next);
    });
  }

  if (btnTriggerMorph) {
    btnTriggerMorph.addEventListener("click", () => {
      animateToStage(1.0);
    });
  }

  if (labelSwarm) labelSwarm.addEventListener("click", () => animateToStage(0.0));
  if (labelTerritory) labelTerritory.addEventListener("click", () => animateToStage(1.0));

  // Waypoints con las coordenadas EXACTAS del archivo GIS
  document.querySelectorAll(".waypoint-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".waypoint-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      const wpKey = pill.getAttribute("data-waypoint");
      const wp = waypoints[wpKey];
      if (wp && window.gsap) {
        gsap.to(camera.position, { x: wp.pos.x, y: wp.pos.y, z: wp.pos.z, duration: 2.2, ease: "power2.inOut" });
        gsap.to(controls.target, { x: wp.target.x, y: wp.target.y, z: wp.target.z, duration: 2.2, ease: "power2.inOut" });
      }
    });
  });

  // Modo Video / Cinema Tour
  let cinemaRunning = false;
  let cinemaAngle = 0.0;
  const btnCinema = document.getElementById("btnCinemaTour");
  const cinemaText = document.getElementById("cinemaText");

  if (btnCinema) {
    btnCinema.addEventListener("click", () => {
      triggerTitleFadeOut();
      cinemaRunning = !cinemaRunning;
      btnCinema.classList.toggle("active", cinemaRunning);
      if (cinemaText) cinemaText.textContent = cinemaRunning ? "Pausar Video" : "Modo Video";
      if (cinemaRunning && currentMorph < 0.8) {
        animateToStage(1.0);
      }
    });
  }

  // =====================================================================
  // 7. INSPECTOR DE CÁMARA & HERRAMIENTA "SUBIR ESTA VISTA AL EDITOR"
  // =====================================================================
  function updateCamInspectorDisplay() {
    if (!camInspectorBox || camInspectorBox.classList.contains("hidden")) return;
    if (camCoordPos) {
      camCoordPos.textContent = `X:${camera.position.x.toFixed(1)}, Y:${camera.position.y.toFixed(1)}, Z:${camera.position.z.toFixed(1)}`;
    }
    if (camCoordTarget) {
      camCoordTarget.textContent = `X:${controls.target.x.toFixed(1)}, Y:${controls.target.y.toFixed(1)}, Z:${controls.target.z.toFixed(1)}`;
    }
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

      // Actualizar la vista territorial en memoria
      territoryCamPos.set(savedState.pos.x, savedState.pos.y, savedState.pos.z);
      territoryTarget.set(savedState.target.x, savedState.target.y, savedState.target.z);
      waypoints.overview.pos = territoryCamPos;
      waypoints.overview.target = territoryTarget;

      // Copiar código al portapapeles para el editor
      const snippet = `const territoryCamPos = new THREE.Vector3(${savedState.pos.x}, ${savedState.pos.y}, ${savedState.pos.z});\nconst territoryTarget = new THREE.Vector3(${savedState.target.x}, ${savedState.target.y}, ${savedState.target.z});`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(snippet).catch(() => {});
      }

      // Mostrar toast de éxito y ocultar panel de coordenadas para siempre
      if (camToast) {
        camToast.classList.add("show");
        setTimeout(() => camToast.classList.remove("show"), 4000);
      }
      if (camInspectorBox) {
        camInspectorBox.classList.add("hidden");
      }
    });
  }

  if (btnCloseCamInspector) {
    btnCloseCamInspector.addEventListener("click", () => {
      if (camInspectorBox) camInspectorBox.classList.add("hidden");
      try { localStorage.setItem("hide_cam_helper", "true"); } catch(e){}
    });
  }

  // =====================================================================
  // 8. SÍNTESIS DE AUDIO WEB (ECOSISTEMA & PAISAJE SONORO)
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
      masterGain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      masterGain.connect(audioCtx.destination);
    } catch(e) { console.warn("Audio no disponible:", e); }
  }

  function triggerHarmonicChime(freqMultiplier = 0.5) {
    if (!audioCtx || !soundActive) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      const baseFreq = 260 + freqMultiplier * 480;
      osc.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, audioCtx.currentTime + 1.2);

      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.8);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();
      osc.stop(audioCtx.currentTime + 1.8);
    } catch(e){}
  }

  const soundToggle = document.getElementById("soundToggle");
  if (soundToggle) {
    soundToggle.addEventListener("click", () => {
      initBioAudio();
      soundActive = !soundActive;
      soundToggle.classList.toggle("active", soundActive);
      soundToggle.innerHTML = soundActive ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
      if (soundActive && audioCtx.state === "suspended") audioCtx.resume();
      if (soundActive) triggerHarmonicChime(0.6);
    });
  }

  // =====================================================================
  // 9. BUCLE PRINCIPAL DE ANIMACIÓN
  // =====================================================================
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    currentMorph += (targetMorph - currentMorph) * (1.0 - Math.exp(-delta * 5.0));
    particleUniforms.uMorphProgress.value = currentMorph;
    particleUniforms.uTime.value = time;

    updateNetworkSwarm(time, currentMorph);

    // Actualizar animación flotante de balizas y orbes 3D de especies
    if (speciesBeaconsGroup && speciesBeaconsGroup.visible) {
      for (let i = 0; i < beaconInstances.length; i++) {
        const b = beaconInstances[i];
        const bob = Math.sin(time * 2.2 + b.phase) * 0.75;
        b.sprite.position.y = bob;
        b.ringMesh.position.y = bob;
        b.ringMesh.rotation.z = time * 0.5 + b.phase;
        b.groundRing.rotation.z = -time * 0.35;
        const groundScale = 1.0 + Math.sin(time * 3.0 + b.phase) * 0.15;
        b.groundRing.scale.set(groundScale, groundScale, 1.0);
      }
    }

    if (cinemaRunning && isTerritory) {
      cinemaAngle += delta * 0.18;
      const camRad = 320;
      const cx = 35 + Math.cos(cinemaAngle) * camRad;
      const cz = 10 + Math.sin(cinemaAngle) * camRad;
      const cy = 180 + Math.sin(time * 0.4) * 45;
      camera.position.set(cx, cy, cz);
      controls.target.set(35, 0, 10);
    }

    controls.update();
    updateCamInspectorDisplay();
    renderer.render(scene, camera);
  }

  animate();
})();
