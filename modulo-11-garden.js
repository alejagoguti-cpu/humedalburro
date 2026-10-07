// =====================================================================
// El Jardín de las Aguas — Red Biótica Dinámica & Territorio de Kennedy 3D
// Living Biotic Network, Organic Chords, Dynamic Constellation & Perspective View
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
  const btnCloseSpeciesCard = document.getElementById("btnCloseSpeciesCard");

  // Elementos del Inspector de Cámara
  const camInspectorBox = document.getElementById("camInspectorBox");
  const camCoordPos = document.getElementById("camCoordPos");
  const camCoordTarget = document.getElementById("camCoordTarget");
  const btnSaveCameraView = document.getElementById("btnSaveCameraView");
  const btnCloseCamInspector = document.getElementById("btnCloseCamInspector");
  const camToast = document.getElementById("camToast");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111113); // DEEP GRAPHITE
  scene.fog = new THREE.FogExp2(0x111113, 0.00075);

  const sceneRoot = new THREE.Group();
  scene.add(sceneRoot);

  let currentFov = 44;
  const aspect = window.innerWidth / window.innerHeight;
  const camera = new THREE.PerspectiveCamera(currentFov, aspect, 0.8, 9500);
  
  // Posición inicial: perfectamente centrada en la esfera viva
  const swarmCamPos = new THREE.Vector3(0, 0, 75);
  const swarmTarget = new THREE.Vector3(0, 0, 0);

  // Vista territorial por defecto
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

  // Waypoints con coordenadas verificadas y FOV específico
  const waypoints = {
    overview:    { pos: territoryCamPos, target: territoryTarget, fov: 44 },
    burro:       { pos: new THREE.Vector3(210, 85, 95),  target: new THREE.Vector3(210, 0, -10), fov: 46 },
    vaca:        { pos: new THREE.Vector3(65, 80, 215),  target: new THREE.Vector3(65, 0, 125), fov: 46 },
    techo:       { pos: new THREE.Vector3(292, 80, 10),  target: new THREE.Vector3(292, 0, -80), fov: 46 },
    // Perspectiva humana a nivel de orilla del humedal con visión panorámica inmersiva
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

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.screenSpacePanning = true;
  controls.maxDistance = 3500;
  controls.minDistance = 1.8;
  controls.maxPolarAngle = Math.PI;
  controls.target.copy(swarmTarget);

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
    const discMat = new THREE.MeshBasicMaterial({
      color: 0x111113,
      transparent: true,
      opacity: 0.94,
      side: THREE.DoubleSide
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = -0.6;
    sceneBaseGroup.add(disc);

    const grid = new THREE.GridHelper(2800, 100, 0x1E3A34, 0x111113);
    grid.position.y = -0.55;
    grid.material.opacity = 0.35;
    grid.material.transparent = true;
    sceneBaseGroup.add(grid);
  }
  createExpansiveBase();

  // =====================================================================
  // 1. BASE DE DATOS DE ESPECIES Y RED TRÓFICA (PALETA EQUILIBRADA Y ORGÁNICA)
  // =====================================================================
  const SPECIES_CATALOG = [
    // Flora: VERDE BOTÁNICO FRESCO
    { id: "sauco", common: "Sauco del Humedal", scientific: "Sambucus nigra", guild: "producer", icon: "fa-leaf", habitat: "Bosque ripario y orillas de El Burro", diet: "Fotosíntesis y nutrientes del humedal", relations: ["Frutos para aves migratorias", "Fijación de taludes", "Refugio de insectos"], color: 0x2E8B57 },
    { id: "junco", common: "Junco de Agua", scientific: "Schoenoplectus californicus", guild: "producer", icon: "fa-spa", habitat: "Zonas de inundación permanente", diet: "Filtración hídrica fitorremediadora", relations: ["Filtro de metales pesados", "Nidación de Tingua Bogotana", "Refugio de alevines"], color: 0x48BB78 },
    { id: "lenteja", common: "Lenteja de Agua", scientific: "Lemna minor", guild: "producer", icon: "fa-seedling", habitat: "Espejos de agua lénticos", diet: "Absorción de nitrógeno y fósforo", relations: ["Alimento de patos y tinguas", "Oxigenación acuática", "Control de algas"], color: 0x52B788 },
    { id: "urapan", common: "Urapán", scientific: "Fraxinus chinensis", guild: "producer", icon: "fa-tree", habitat: "Dosel urbano y rondas de canal", diet: "Nutrición edáfica y fotosíntesis", relations: ["Percha de rapaces", "Hábitat de murciélagos", "Captura de CO2"], color: 0x2E8B57 },
    { id: "capuli", common: "Capulí", scientific: "Prunus serotina", guild: "producer", icon: "fa-tree", habitat: "Borde de quebradas y reservas", diet: "Nutrientes de suelo aluvial", relations: ["Alimento de cusumbos", "Polinización por abejas", "Corredor biológico"], color: 0x48BB78 },
    { id: "aliso", common: "Aliso Sabanero", scientific: "Alnus acuminata", guild: "producer", icon: "fa-tree", habitat: "Ronda hidráulica Río Bogotá", diet: "Fijación biológica de nitrógeno", relations: ["Fijación de suelo", "Refugio de curíes", "Aporte de materia orgánica"], color: 0x2E8B57 },

    // Invertebrados / Polinizadores: OCRE CÁLIDO / MIEL SUAVE (NO AMARILLO CHILLÓN)
    { id: "abejorro", common: "Abejorro Sabanero", scientific: "Bombus rubicundus", guild: "pollinator", icon: "fa-clover", habitat: "Flores de Sauco, Tingua y Jardines", diet: "Néctar y polen silvestre", relations: ["Polinizador clave", "Zumbido de alta vibración", "Mutualismo floral"], color: 0xD4AF37 },
    { id: "murcielago", common: "Murciélago Mastín", scientific: "Molossus molossus", guild: "predator", icon: "fa-bat", habitat: "Huecos de árboles y cielo nocturno", diet: "Insectos voladores nocturnos y polillas", relations: ["Control biológico de plagas", "Bioacústica ultrasónica", "Polinización nocturna"], color: 0x8C8275 },
    { id: "libelula", common: "Libélula Azul", scientific: "Rhionaeschna marchali", guild: "predator", icon: "fa-bug", habitat: "Ronda hidráulica y espejos de agua", diet: "Mosquitos adultos y moscas", relations: ["Depredador aéreo de plagas", "Fase larvaria bentónica", "Presa de aves"], color: 0x00B4D8 },
    { id: "mariposa", common: "Mariposa Espejito", scientific: "Dione vanillae", guild: "pollinator", icon: "fa-worm", habitat: "Jardines y enredaderas de pasiflora", diet: "Néctar floral y hojas nutricias", relations: ["Polinizadora diurna", "Metamorfosis en orillas", "Alimento de aves"], color: 0xD97736 },
    { id: "hongo", common: "Hongo Micorrícico", scientific: "Glomus intraradices", guild: "decomposer", icon: "fa-cube", habitat: "Suelo rizosférico del humedal", diet: "Azúcares de raíces de sauce y junco", relations: ["Red de transporte de fósforo", "Biofiltro del suelo", "Conexión simbiótica"], color: 0x7E766C },

    // Avifauna: AZUL HUMEDAL LUMINOSO
    { id: "tingua_azul", common: "Tingua Azul", scientific: "Porphyrio martinica", guild: "bird", icon: "fa-feather", habitat: "Lámina de agua y vegetación flotante", diet: "Lenteja de agua, semillas y moluscos", relations: ["Ave migratoria", "Nidificación en juncales", "Dispersora de macrófitas"], color: 0x00B4D8 },
    { id: "tingua_bog", common: "Tingua Bogotana", scientific: "Rallus semiplumbeus", guild: "bird", icon: "fa-dove", habitat: "Densos juncales del Humedal El Burro", diet: "Invertebrados acuáticos y brotes tiernos", relations: ["Especie endémica en peligro", "Bioindicador de conservación", "Nidos flotantes"], color: 0x00B4D8 },
    { id: "garza", common: "Garza Real", scientific: "Ardea alba", guild: "bird", icon: "fa-dove", habitat: "Orillas abiertas del Humedal El Burro", diet: "Ranas sabaneras, peces y coleópteros", relations: ["Depredador acuático tope", "Indicador de calidad hídrica", "Vuelo en bandadas"], color: 0x0096C7 },
    { id: "pato", common: "Pato Turrio", scientific: "Oxyura jamaicensis", guild: "bird", icon: "fa-water", habitat: "Lagunas profundas de Kennedy", diet: "Larvas de quironómidos y plantas sumergidas", relations: ["Buceo profundo", "Oxigenación de sedimentos", "Comensalismo con tinguas"], color: 0x00B4D8 },
    { id: "alcaravan", common: "Alcaraván Sabanero", scientific: "Vanellus chilensis", guild: "bird", icon: "fa-dove", habitat: "Campos abiertos y riberas secas", diet: "Gusanos, escarabajos y pequeños moluscos", relations: ["Guardián del territorio", "Alarma sonora comunitaria", "Nidos en suelo"], color: 0x00B4D8 },

    // Fauna / Anfibios / Mamíferos
    { id: "rana", common: "Rana Sabanera", scientific: "Dendropsophus molitor", guild: "amphibian", icon: "fa-frog", habitat: "Espejos de agua y juncales de El Burro", diet: "Insectos acuáticos, larvas y dípteros", relations: ["Control de mosquitos", "Alimento de Garza Real", "Refugio en Juncos"], color: 0x48BB78 },
    { id: "serpiente", common: "Serpiente Sabanera", scientific: "Atractus crassicaudatus", guild: "predator", icon: "fa-staff-snake", habitat: "Suelo húmedo y pastizales de ribera", diet: "Lombrices de tierra y babosas", relations: ["Control de babosas", "Caza bajo hojarasca", "Presa de Gavilanes"], color: 0x2E8B57 },
    { id: "cusumbo", common: "Cusumbo Andino", scientific: "Nasua olivacea", guild: "mammal", icon: "fa-paw", habitat: "Reserva Umbral Horizontes / El Burro", diet: "Frutos de Sauco, semillas e invertebrados", relations: ["Dispersión de semillas", "Forrajeo en dosel", "Polinización indirecta"], color: 0xA3988C },
    { id: "comadreja", common: "Comadreja Andina", scientific: "Neogale frenata", guild: "mammal", icon: "fa-paw", habitat: "Ribera del Río Bogotá y canales", diet: "Pequeños roedores y anfibios", relations: ["Depredador tope", "Control poblacional", "Madrigueras en taludes"], color: 0x7E766C },
    { id: "hicotea", common: "Hicotea del Humedal", scientific: "Trachemys callirostris", guild: "reptile", icon: "fa-shield-halved", habitat: "Zonas de remanso y asoleaderos de agua", diet: "Vegetación sumergida y detritos acuáticos", relations: ["Limpieza de detritos", "Asoleo en troncos", "Nidación en ribera"], color: 0x00B4D8 },
    { id: "curi", common: "Curí Sabanero", scientific: "Cavia aperea", guild: "mammal", icon: "fa-paw", habitat: "Pastizales inundables y rondas", diet: "Gramíneas, pasto kikuyo y hojas", relations: ["Herbívoro primario", "Presa clave", "Túneles ecológicos"], color: 0x2E8B57 }
  ];

  // Catálogo de ÁRBOLES en Kennedy (Censo Forestal Real Georreferenciado)
  const SPECIES_GEO_NODES = [
    {
      id: "chicala",
      name: "Chicalá / Flor Amarillo",
      sci: "Tecoma stans",
      type: "Árbol Urbano Melífero",
      count: "6,884 árboles",
      avgHeight: "2.6 m (hasta 6 m)",
      img: "./assets/inat_timboco.png",
      pos: { x: 210.4, y: 13.0, z: 96.0 },
      camPos: { x: 210.4, y: 48, z: 155 },
      camTarget: { x: 210.4, y: 0, z: 96.0 },
      habitat: "Parques zonales, separadores viales y bordes del humedal",
      role: "Especie arbórea más abundante de Kennedy. Floración dorada que nutre colibríes y abejas nativas.",
      color: 0xD4AF37
    },
    {
      id: "jazmin",
      name: "Jazmín del Cabo / Laurel Huesito",
      sci: "Pittosporum undulatum",
      type: "Árbol de Sombra y Seto",
      count: "5,650 árboles",
      avgHeight: "3.2 m (hasta 9 m)",
      img: "./assets/inat_sauco.png",
      pos: { x: 234.8, y: 13.5, z: 102.9 },
      camPos: { x: 234.8, y: 50, z: 162 },
      camTarget: { x: 234.8, y: 0, z: 102.9 },
      habitat: "Andenes anchos, plazoletas y micro-bosques urbanos",
      role: "Follaje denso perenne que absorbe partículas contaminantes y provee sombra protectora en corredores.",
      color: 0x48BB78
    },
    {
      id: "sauco",
      name: "Sauco del Humedal",
      sci: "Sambucus nigra",
      type: "Árbol Nativo Ripario",
      count: "5,553 árboles",
      avgHeight: "3.1 m (hasta 8 m)",
      img: "./assets/inat_sauco.png",
      pos: { x: 221.0, y: 13.0, z: 124.7 },
      camPos: { x: 221.0, y: 48, z: 182 },
      camTarget: { x: 221.0, y: 0, z: 124.7 },
      habitat: "Bosque ripario y orillas del Humedal El Burro",
      role: "Fitorremediación de taludes hídricos, bayas nutritivas esenciales para aves acuáticas y migratorias.",
      color: 0x2E8B57
    },
    {
      id: "falso_pimiento",
      name: "Falso Pimiento",
      sci: "Schinus molle",
      type: "Árbol Protector de Suelo",
      count: "4,548 árboles",
      avgHeight: "3.6 m (hasta 10 m)",
      img: "./assets/inat_espino.png",
      pos: { x: 192.2, y: 14.0, z: 88.6 },
      camPos: { x: 192.2, y: 52, z: 148 },
      camTarget: { x: 192.2, y: 0, z: 88.6 },
      habitat: "Zonas verdes comunales y rondas de canal",
      role: "Raíces profundas que fijan terrenos blandos y hojas aromáticas que repelen plagas naturalmente.",
      color: 0x2E8B57
    },
    {
      id: "eugenia",
      name: "Eugenia",
      sci: "Eugenia myrtifolia",
      type: "Árbol / Arbusto Estructural",
      count: "4,370 árboles",
      avgHeight: "3.5 m (hasta 8 m)",
      img: "./assets/inat_chilca.png",
      pos: { x: 209.7, y: 13.5, z: 78.8 },
      camPos: { x: 209.7, y: 50, z: 138 },
      camTarget: { x: 209.7, y: 0, z: 78.8 },
      habitat: "Barreras vivas y separadores ambientales",
      role: "Conformación de cercas vivas densas que amortiguan el ruido urbano hacia el humedal.",
      color: 0x48BB78
    },
    {
      id: "palma_yuca",
      name: "Palma Yuca / Palmiche",
      sci: "Yucca gigantea",
      type: "Palma Arborescente",
      count: "4,356 árboles",
      avgHeight: "2.9 m (hasta 7 m)",
      img: "./assets/inat_mastuerzo.png",
      pos: { x: 188.7, y: 12.5, z: 180.1 },
      camPos: { x: 188.7, y: 48, z: 240 },
      camTarget: { x: 188.7, y: 0, z: 180.1 },
      habitat: "Sectores residenciales de Kennedy Central",
      role: "Especie xerofítica de bajo consumo hídrico y refugio para nidos de aves urbanas.",
      color: 0x2E8B57
    },
    {
      id: "urapan",
      name: "Urapán / Fresno",
      sci: "Fraxinus chinensis",
      type: "Árbol de Gran Porte / Dosel Alto",
      count: "3,113 árboles",
      avgHeight: "8.5 m (hasta 20 m)",
      img: "./assets/cx_urapan.png",
      pos: { x: 251.2, y: 19.0, z: 142.5 },
      camPos: { x: 251.2, y: 68, z: 205 },
      camTarget: { x: 251.2, y: 0, z: 142.5 },
      habitat: "Parques metropolitanos y dosel superior de Kennedy",
      role: "Árbol de mayor porte en la localidad, percha principal de aves rapaces y capturador masivo de CO2.",
      color: 0x2E8B57
    },
    {
      id: "caucho",
      name: "Caucho Sabanero",
      sci: "Ficus soatensis",
      type: "Árbol Nativo Emblemático",
      count: "2,860 árboles",
      avgHeight: "6.3 m (hasta 15 m)",
      img: "./assets/inat_espino.png",
      pos: { x: 172.3, y: 16.0, z: 138.1 },
      camPos: { x: 172.3, y: 58, z: 198 },
      camTarget: { x: 172.3, y: 0, z: 138.1 },
      habitat: "Rondas de humedales y reservas ecológicas",
      role: "Copa perenne amplia que amortigua lluvias torrenciales y crea microclimas frescos.",
      color: 0x2E8B57
    },
    {
      id: "cipres",
      name: "Ciprés / Pino",
      sci: "Cupressus lusitanica",
      type: "Conífera de Protección",
      count: "2,828 árboles",
      avgHeight: "4.9 m (hasta 16 m)",
      img: "./assets/arbol_real4.png",
      pos: { x: 277.8, y: 15.0, z: 124.1 },
      camPos: { x: 277.8, y: 55, z: 184 },
      camTarget: { x: 277.8, y: 0, z: 124.1 },
      habitat: "Barreras de viento y bordes perimetrales",
      role: "Barrera cortaviento que protege las láminas de agua del humedal de la desecación eólica.",
      color: 0x48BB78
    },
    {
      id: "acacia",
      name: "Acacia Sabanera",
      sci: "Acacia melanoxylon",
      type: "Árbol Forestal Urbano",
      count: "2,160 árboles",
      avgHeight: "3.9 m (hasta 12 m)",
      img: "./assets/inat_chilca.png",
      pos: { x: 166.1, y: 14.0, z: 93.1 },
      camPos: { x: 166.1, y: 52, z: 153 },
      camTarget: { x: 166.1, y: 0, z: 93.1 },
      habitat: "Taludes, vías arterias y separadores",
      role: "Crecimiento vigoroso y aporte de biomasa orgánica a los suelos del territorio.",
      color: 0x2E8B57
    },
    {
      id: "capulin",
      name: "Capulí / Cerezo",
      sci: "Prunus serotina",
      type: "Árbol Frutal Silvestre",
      count: "1,901 árboles",
      avgHeight: "3.7 m (hasta 12 m)",
      img: "./assets/inat_capulin.png",
      pos: { x: 208.9, y: 14.5, z: 141.0 },
      camPos: { x: 208.9, y: 52, z: 200 },
      camTarget: { x: 208.9, y: 0, z: 141.0 },
      habitat: "Rondas hidráulicas y borde de humedales",
      role: "Frutos dulces que alimentan aves frugívoras, murciélagos y enriquecen la fauna local.",
      color: 0x48BB78
    },
    {
      id: "aliso",
      name: "Aliso Sabanero",
      sci: "Alnus acuminata",
      type: "Árbol Ripario Fijador de Nitrógeno",
      count: "1,058 árboles",
      avgHeight: "2.7 m (hasta 12 m)",
      img: "./assets/inat_chilca.png",
      pos: { x: 203.4, y: 13.5, z: -102.2 },
      camPos: { x: 203.4, y: 50, z: -42 },
      camTarget: { x: 203.4, y: 0, z: -102.2 },
      habitat: "Zonas inundables y riberas del Río Bogotá",
      role: "Fijación de nitrógeno en raíces y regeneración natural de suelos húmedos.",
      color: 0x48BB78
    }
  ];

  // =====================================================================
  // 2. RED BIÓTICA DINÁMICA: CONEXIONES TRÓFICAS COMPLEJAS & CHORDS
  // =====================================================================
  const SWARM_COUNT = 850;
  const swarmGroup = new THREE.Group();
  sceneRoot.add(swarmGroup);

  function createNodeGlowTexture() {
    const cvs = document.createElement("canvas");
    cvs.width = 64; cvs.height = 64;
    const ctx = cvs.getContext("2d");

    const radGlow = ctx.createRadialGradient(32, 32, 1, 32, 32, 30);
    radGlow.addColorStop(0, "rgba(255, 255, 255, 1.0)");
    radGlow.addColorStop(0.22, "rgba(212, 175, 55, 0.95)");
    radGlow.addColorStop(0.55, "rgba(46, 139, 87, 0.45)");
    radGlow.addColorStop(1, "rgba(17, 17, 19, 0)");
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
        gl_PointSize = aNodeScale * (420.0 / -mvPos.z) * vAlpha;
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

  const SPHERE_RADIUS = 31.0;
  const goldenAngle = Math.PI * (3.0 - Math.sqrt(5.0));

  for (let i = 0; i < SWARM_COUNT; i++) {
    const species = SPECIES_CATALOG[i % SPECIES_CATALOG.length];

    const y = 1.0 - (i / (SWARM_COUNT - 1.0)) * 2.0;
    const radiusAtY = Math.sqrt(Math.max(0.0, 1.0 - y * y));
    const theta = goldenAngle * i;

    const x = Math.cos(theta) * radiusAtY * SPHERE_RADIUS;
    const z = Math.sin(theta) * radiusAtY * SPHERE_RADIUS;
    const sy = y * SPHERE_RADIUS;

    const col = new THREE.Color(species.color);

    nodePositions[i * 3]     = x;
    nodePositions[i * 3 + 1] = sy;
    nodePositions[i * 3 + 2] = z;

    nodeColors[i * 3]     = col.r;
    nodeColors[i * 3 + 1] = col.g;
    nodeColors[i * 3 + 2] = col.b;

    nodeScales[i] = 1.35 + (i % 5 === 0 ? 0.45 : 0.0);

    swarmNodes.push({
      id: i,
      species: species,
      baseX: x, baseY: sy, baseZ: z,
      x: x, y: sy, z: z,
      phase: Math.random() * Math.PI * 2,
      scale: nodeScales[i],
      color: col,
      neighbors: []
    });
  }

  const nodeGeo = new THREE.BufferGeometry();
  nodeGeo.setAttribute("position", new THREE.BufferAttribute(nodePositions, 3));
  nodeGeo.setAttribute("aNodeColor", new THREE.BufferAttribute(nodeColors, 3));
  nodeGeo.setAttribute("aNodeScale", new THREE.BufferAttribute(nodeScales, 1));

  const nodePoints = new THREE.Points(nodeGeo, nodeMat);
  swarmGroup.add(nodePoints);

  // Generación de conexiones tróficas auténticas: 35% locales + 65% acordes biológicos cruzados de larga distancia
  const linkList = [];
  const addedLinks = new Set();

  function addLink(a, b, isLongRange = false) {
    if (a === b) return;
    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
    if (addedLinks.has(key)) return;
    addedLinks.add(key);
    linkList.push({ a, b, isLongRange, phase: Math.random() * Math.PI * 2 });
    if (!swarmNodes[a].neighbors.includes(b)) swarmNodes[a].neighbors.push(b);
    if (!swarmNodes[b].neighbors.includes(a)) swarmNodes[b].neighbors.push(a);
  }

  // 1. Enlaces locales (microhábitat)
  for (let i = 0; i < SWARM_COUNT; i++) {
    const ni = swarmNodes[i];
    const dists = [];
    for (let j = 0; j < SWARM_COUNT; j++) {
      if (i === j) continue;
      const nj = swarmNodes[j];
      const dSq = (ni.baseX - nj.baseX)**2 + (ni.baseY - nj.baseY)**2 + (ni.baseZ - nj.baseZ)**2;
      dists.push({ id: j, dSq });
    }
    dists.sort((a, b) => a.dSq - b.dSq);

    // Conectar con 1 o 2 vecinos cercanos
    for (let k = 0; k < 2; k++) {
      if (dists[k] && dists[k].dSq < 240) {
        addLink(i, dists[k].id, false);
      }
    }
  }

  // 2. Acordes ecológicos de larga distancia (Interacciones biológicas cruzadas)
  // Conectores clave: Polinizadores <-> Plantas, Aves <-> Macrófitas acuáticas, Fungi <-> Raíces, Depredadores <-> Presas
  for (let i = 0; i < SWARM_COUNT; i++) {
    const spI = swarmNodes[i].species;
    // Buscar compañeros funcionales a través de la esfera
    for (let tries = 0; tries < 3; tries++) {
      const targetIdx = Math.floor(Math.random() * SWARM_COUNT);
      const spJ = swarmNodes[targetIdx].species;

      let isEcologicallyCompatible = false;
      if (spI.guild === "producer" && (spJ.guild === "pollinator" || spJ.guild === "bird" || spJ.guild === "decomposer")) isEcologicallyCompatible = true;
      if (spI.guild === "pollinator" && spJ.guild === "producer") isEcologicallyCompatible = true;
      if (spI.guild === "bird" && (spJ.guild === "producer" || spJ.guild === "amphibian" || spJ.guild === "mammal")) isEcologicallyCompatible = true;
      if (spI.guild === "amphibian" && (spJ.guild === "predator" || spJ.guild === "producer")) isEcologicallyCompatible = true;
      if (spI.guild === "decomposer" && spJ.guild === "producer") isEcologicallyCompatible = true;

      if (isEcologicallyCompatible) {
        addLink(i, targetIdx, true);
        break;
      }
    }
  }

  const totalLinks = linkList.length;
  const linkPos = new Float32Array(totalLinks * 2 * 3);
  const linkCol = new Float32Array(totalLinks * 2 * 3);

  for (let l = 0; l < totalLinks; l++) {
    const { a, b, isLongRange } = linkList[l];
    const na = swarmNodes[a];
    const nb = swarmNodes[b];
    const ptr = l * 6;

    linkPos[ptr]     = na.baseX; linkPos[ptr + 1] = na.baseY; linkPos[ptr + 2] = na.baseZ;
    linkPos[ptr + 3] = nb.baseX; linkPos[ptr + 4] = nb.baseY; linkPos[ptr + 5] = nb.baseZ;

    const ca = na.color;
    const cb = nb.color;
    const dim = isLongRange ? 0.7 : 0.85;
    linkCol[ptr]     = ca.r * dim; linkCol[ptr + 1] = ca.g * dim; linkCol[ptr + 2] = ca.b * dim;
    linkCol[ptr + 3] = cb.r * dim; linkCol[ptr + 4] = cb.g * dim; linkCol[ptr + 5] = cb.b * dim;
  }

  const linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute("position", new THREE.BufferAttribute(linkPos, 3));
  linkGeo.setAttribute("color", new THREE.BufferAttribute(linkCol, 3));

  const linkMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.38,
    blending: THREE.AdditiveBlending
  });
  const linkLines = new THREE.LineSegments(linkGeo, linkMat);
  swarmGroup.add(linkLines);

  // Impulsos luminosos que viajan a través de los acordes biológicos (Potenciales de acción bióticos)
  const SIGNAL_PULSES_COUNT = 140;
  const pulsePos = new Float32Array(SIGNAL_PULSES_COUNT * 3);
  const pulseCol = new Float32Array(SIGNAL_PULSES_COUNT * 3);
  const pulseLinks = [];

  for (let p = 0; p < SIGNAL_PULSES_COUNT; p++) {
    const randLink = linkList[Math.floor(Math.random() * linkList.length)];
    pulseLinks.push({
      link: randLink,
      progress: Math.random(),
      speed: 0.25 + Math.random() * 0.4
    });
    pulseCol[p * 3]     = 0.95;
    pulseCol[p * 3 + 1] = 0.85;
    pulseCol[p * 3 + 2] = 0.4;
  }

  const pulseGeo = new THREE.BufferGeometry();
  pulseGeo.setAttribute("position", new THREE.BufferAttribute(pulsePos, 3));
  pulseGeo.setAttribute("color", new THREE.BufferAttribute(pulseCol, 3));

  const pulseMat = new THREE.PointsMaterial({
    size: 2.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending
  });
  const pulsePoints = new THREE.Points(pulseGeo, pulseMat);
  swarmGroup.add(pulsePoints);

  function updateNetworkSwarm(time, morphProgress) {
    if (morphProgress > 0.28) {
      swarmGroup.visible = false;
      return;
    }
    swarmGroup.visible = true;

    // Rotación suave del ecosistema esférico
    swarmGroup.rotation.y = time * 0.04;
    swarmGroup.rotation.x = Math.sin(time * 0.025) * 0.035;

    nodeMat.uniforms.uTime.value = time;
    nodeMat.uniforms.uMorph.value = morphProgress;
    const fade = Math.max(0.0, (1.0 - morphProgress * 3.2));
    linkMat.opacity = fade * 0.38;
    pulseMat.opacity = fade * 0.85;

    const posArr = nodeGeo.attributes.position.array;
    const lPosArr = linkGeo.attributes.position.array;
    const pPosArr = pulseGeo.attributes.position.array;

    // Ondulación orgánica y respiración biótica de la esfera
    for (let i = 0; i < SWARM_COUNT; i++) {
      const d = swarmNodes[i];
      const harmonicPulse = 1.0 + Math.sin(time * 1.8 + d.phase) * 0.035 + Math.cos(time * 0.85 + d.baseY * 0.07) * 0.025;
      const curX = d.baseX * harmonicPulse;
      const curY = d.baseY * harmonicPulse;
      const curZ = d.baseZ * harmonicPulse;

      d.x = curX; d.y = curY; d.z = curZ;

      posArr[i * 3]     = curX;
      posArr[i * 3 + 1] = curY;
      posArr[i * 3 + 2] = curZ;
    }

    for (let l = 0; l < totalLinks; l++) {
      const { a, b } = linkList[l];
      const na = swarmNodes[a];
      const nb = swarmNodes[b];
      const ptr = l * 6;

      lPosArr[ptr]     = na.x; lPosArr[ptr + 1] = na.y; lPosArr[ptr + 2] = na.z;
      lPosArr[ptr + 3] = nb.x; lPosArr[ptr + 4] = nb.y; lPosArr[ptr + 5] = nb.z;
    }

    // Actualizar impulsos bio-eléctricos viajando por los acordes
    for (let p = 0; p < SIGNAL_PULSES_COUNT; p++) {
      const item = pulseLinks[p];
      item.progress += 0.006 * item.speed;
      if (item.progress > 1.0) {
        item.progress = 0.0;
        item.link = linkList[Math.floor(Math.random() * linkList.length)];
      }

      const na = swarmNodes[item.link.a];
      const nb = swarmNodes[item.link.b];
      const px = THREE.MathUtils.lerp(na.x, nb.x, item.progress);
      const py = THREE.MathUtils.lerp(na.y, nb.y, item.progress);
      const pz = THREE.MathUtils.lerp(na.z, nb.z, item.progress);

      pPosArr[p * 3]     = px;
      pPosArr[p * 3 + 1] = py;
      pPosArr[p * 3 + 2] = pz;
    }

    nodeGeo.attributes.position.needsUpdate = true;
    linkGeo.attributes.position.needsUpdate = true;
    pulseGeo.attributes.position.needsUpdate = true;
  }

  // =====================================================================
  // 3. GLSL SHADER DE TERRITORIO CON PERSPECTIVA SUAVE Y SIN SOBREEXPOSICIÓN
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
      
      // En modo perspectiva, atenuar tamaño según distancia para evitar quemaduras blancas
      float sizeAttenuation = clamp(260.0 / max(1.0, camDist), 0.2, 1.6);
      if (uPerspectiveMode > 0.05) {
        if (aCategory > 1.8) {
          // Edificios lejanos atenuados en perspectiva
          sizeAttenuation *= mix(1.0, clamp(70.0 / max(10.0, camDist), 0.35, 1.0), uPerspectiveMode);
        }
      }
      
      gl_PointSize = (aSize + rippleWave * 1.0 + explosionIntensity * 0.7) * uPixelRatio * sizeAttenuation;
      
      // Control de transparencia progresiva
      float alphaBase = smoothstep(0.04, 0.8, ease) * 0.95 + explosionIntensity * 0.35;
      if (uPerspectiveMode > 0.05 && aCategory > 1.8) {
        // Suavizar fondo urbano en perspectiva para destacar el humedal
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
      
      // Definición mejorada en Perspectiva Humedal:
      if (uPerspectiveMode > 0.05) {
        if (vCategory < 0.5) {
          // Agua del humedal: brillo azul profundo nítido
          col = mix(col, vec3(0.0, 0.75, 0.95), uPerspectiveMode * 0.35);
        } else if (vCategory < 1.5) {
          // Árboles ribereños: verde botánico rico
          col = mix(col, vec3(0.2, 0.65, 0.38), uPerspectiveMode * 0.25);
        } else if (vCategory > 1.8) {
          // Edificios lejanos: tono arquitectónico piedra/basalto sin quemar
          col = mix(col, vec3(0.25, 0.24, 0.23), uPerspectiveMode * 0.45);
        }
      }
      
      // Mapeo tonal suave para evitar quemaduras blancas por acumulación aditiva
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
  // 4. CARGA DE CAPAS GEOGRÁFICAS (PIEDRA ARQUITECTÓNICA & AGUA VIBRANTE)
  // =====================================================================
  function loadWater() {
    return fetch(WATER_URL)
      .then(r => r.json())
      .then(waterBodies => {
        const colWaterMain = new THREE.Color(0x00B4D8);
        const colWaterDeep = new THREE.Color(0x0077B6);

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

        trees.forEach((t, i) => {
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

        buildings.forEach((b, bIdx) => {
          const pts = b.pts;
          if (!pts || pts.length < 3) return;

          const sPts = pts.map(p => toScene(p[0], p[1]));
          const h = (b.height || 10) * SCALE;
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

  // =====================================================================
  // 5. CONSTELACIÓN GEORREFERENCIADA DE ÁRBOLES EN EL TERRITORIO (LEVE & SUAVE)
  // =====================================================================
  const speciesConstellationGroup = new THREE.Group();
  speciesConstellationGroup.visible = false;
  sceneRoot.add(speciesConstellationGroup);

  let activeConstellationPoints = null;
  let activeConstellationLines = null;
  const activeTreeIndicatorGroup = new THREE.Group();
  sceneRoot.add(activeTreeIndicatorGroup);

  // Anillo de pulso sutil en el árbol principal
  const focusDotGeo = new THREE.CircleGeometry(2.4, 24);
  const focusDotMat = new THREE.MeshBasicMaterial({ color: 0x48BB78, side: THREE.DoubleSide, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending });
  const focusDotMesh = new THREE.Mesh(focusDotGeo, focusDotMat);
  focusDotMesh.rotation.x = -Math.PI / 2;
  activeTreeIndicatorGroup.add(focusDotMesh);

  const focusRingGeo = new THREE.RingGeometry(2.8, 5.4, 24);
  const focusRingMat = new THREE.MeshBasicMaterial({ color: 0x48BB78, side: THREE.DoubleSide, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending });
  const focusRingMesh = new THREE.Mesh(focusRingGeo, focusRingMat);
  focusRingMesh.rotation.x = -Math.PI / 2;
  activeTreeIndicatorGroup.add(focusRingMesh);

  function renderTreeConstellation(specId, colHex) {
    speciesConstellationGroup.clear();

    const cluster = treeSpeciesClusters[specId] || [];
    if (cluster.length === 0) return;

    // Tomar una muestra representativa elegante para renderizar sin sobrecargar (hasta 800 árboles)
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

    const cMat = new THREE.PointsMaterial({
      size: 2.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending
    });
    activeConstellationPoints = new THREE.Points(cGeo, cMat);
    speciesConstellationGroup.add(activeConstellationPoints);

    // Filamentos de conexión suave entre árboles vecinos de la misma especie
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
      const lMat = new THREE.LineBasicMaterial({
        color: colObj,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending
      });
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
  // 6. CONTROLADOR BOTÁNICO & CHIP FLOTANTE MINIMALISTA
  // =====================================================================
  let tourActive = false;
  let tourIndex = 0;
  let tourTimer = null;

  const btnTourSpecies = document.getElementById("btnTourSpecies");
  const activeTreeChip = document.getElementById("activeTreeChip");
  const activeTreeImg = document.getElementById("activeTreeImg");
  const activeTreeName = document.getElementById("activeTreeName");

  if (btnCloseSpeciesCard) {
    btnCloseSpeciesCard.addEventListener("click", () => {
      if (speciesCard) speciesCard.classList.remove("show");
    });
  }

  if (activeTreeChip) {
    activeTreeChip.addEventListener("click", () => {
      if (speciesCard) speciesCard.classList.toggle("show");
    });
  }

  function focusSpecies(idx, autoTour = false) {
    if (idx < 0 || idx >= SPECIES_GEO_NODES.length) return;
    tourIndex = idx;
    const spec = SPECIES_GEO_NODES[idx];

    if (currentMorph < 0.45) {
      animateToStage(1.0);
    }

    if (activeTreeImg) activeTreeImg.src = spec.img;
    if (activeTreeName) activeTreeName.textContent = spec.name.split('/')[0].trim();
    if (activeTreeChip) activeTreeChip.classList.add("show");

    if (cardCommonName) cardCommonName.textContent = spec.name;
    if (cardScientificName) cardScientificName.textContent = spec.sci;
    if (cardTaxon) cardTaxon.textContent = "Flora / Censo";
    const cardCountEl = document.getElementById("cardCount");
    if (cardCountEl) cardCountEl.textContent = spec.count;
    const cardHeightEl = document.getElementById("cardHeight");
    if (cardHeightEl) cardHeightEl.textContent = spec.avgHeight;
    if (cardHabitat) cardHabitat.textContent = spec.habitat;
    if (cardDiet) cardDiet.textContent = spec.role;
    if (cardRelations) {
      cardRelations.innerHTML = `
        <span class="relation-tag">${spec.type}</span>
        <span class="relation-tag">Censo: ${spec.count}</span>
        <span class="relation-tag">Porte: ${spec.avgHeight}</span>
      `;
    }

    // Transición fluida de cámara hacia el conglomerado georreferenciado
    if (window.gsap) {
      gsap.to(camera.position, {
        x: spec.camPos.x,
        y: spec.camPos.y,
        z: spec.camPos.z,
        duration: 2.5,
        ease: "power2.inOut"
      });
      gsap.to(controls.target, {
        x: spec.camTarget.x,
        y: spec.camTarget.y,
        z: spec.camTarget.z,
        duration: 2.5,
        ease: "power2.inOut"
      });
    }

    // Actualizar anillo indicador focal
    focusDotMesh.position.set(spec.pos.x, 0.22, spec.pos.z);
    focusRingMesh.position.set(spec.pos.x, 0.24, spec.pos.z);
    const colObj = new THREE.Color(spec.color);
    focusDotMat.color = colObj;
    focusRingMat.color = colObj;

    if (window.gsap) {
      gsap.to(focusDotMat, { opacity: 0.95, duration: 0.4 });
      gsap.to(focusRingMat, { opacity: 0.8, duration: 0.4 });
    }

    // Desplegar constelación completa de árboles de esta especie en todo Kennedy
    renderTreeConstellation(spec.id, spec.color);

    if (soundActive && typeof triggerHarmonicChime === "function") {
      triggerHarmonicChime(0.45 + (idx / SPECIES_GEO_NODES.length) * 0.5);
    }
  }

  function startSpeciesTour() {
    tourActive = true;
    if (btnTourSpecies) btnTourSpecies.classList.add("active");
    focusSpecies(tourIndex, true);

    clearInterval(tourTimer);
    tourTimer = setInterval(() => {
      if (!tourActive) return;
      tourIndex = (tourIndex + 1) % SPECIES_GEO_NODES.length;
      focusSpecies(tourIndex, true);
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
      if (tourActive) {
        stopSpeciesTour();
      } else {
        startSpeciesTour();
      }
    });
  }

  // =====================================================================
  // 7. INSPECCIÓN INTERACTIVA EN ESFERA (RAYCASTING)
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

  window.addEventListener("pointermove", checkSwarmHover);
  window.addEventListener("pointerdown", (e) => {
    if (!e.target.closest("#speciesCard") && !e.target.closest("#activeTreeChip") && !e.target.closest(".top-bar") && !e.target.closest(".bottom-experience-bar") && !e.target.closest(".waypoints-bar")) {
      checkSwarmHover(e);
    }
  });

  // =====================================================================
  // 8. METAMORFOSIS ANIMADA: VÓRTICE ADVECTION & GSAP TRANSITION
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
      swarmIntroBox.classList.toggle("fade-out", targetMorph > 0.08 || userHasInteracted);
    }
    if (speciesCard) {
      speciesCard.classList.toggle("show", targetMorph < 0.15 && hoveredNodeId !== -1);
    }
    if (waypointsBar) {
      waypointsBar.classList.toggle("show", targetMorph > 0.65);
    }
    if (targetMorph < 0.25) {
      if (activeTreeChip) activeTreeChip.classList.remove("show");
      if (speciesCard && hoveredNodeId === -1) speciesCard.classList.remove("show");
      if (tourActive) stopSpeciesTour();
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

    // Resetear FOV a 44 al volver a la esfera o vista general
    gsap.to(camera, {
      fov: 44,
      duration: 3.2,
      ease: "power3.inOut",
      onUpdate: () => camera.updateProjectionMatrix()
    });
    gsap.to(particleUniforms.uPerspectiveMode, {
      value: 0.0,
      duration: 2.5
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
      animateToStage(isTerritory ? 0.0 : 1.0);
    });
  }

  if (btnTriggerMorph) {
    btnTriggerMorph.addEventListener("click", () => animateToStage(1.0));
  }

  if (labelSwarm) labelSwarm.addEventListener("click", () => animateToStage(0.0));
  if (labelTerritory) labelTerritory.addEventListener("click", () => animateToStage(1.0));

  // Waypoints con soporte nativo de Perspectiva Humana e interpolación FOV
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
        
        // Transición de FOV (68° para perspectiva humana inmersiva, 44° para axonometría)
        gsap.to(camera, {
          fov: wp.fov || 44,
          duration: 2.6,
          ease: "power2.inOut",
          onUpdate: () => camera.updateProjectionMatrix()
        });

        gsap.to(particleUniforms.uPerspectiveMode, {
          value: isPersp ? 1.0 : 0.0,
          duration: 2.2,
          ease: "power2.inOut"
        });

        if (soundActive && typeof triggerWaterResonance === "function" && isPersp) {
          triggerWaterResonance();
        }
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
  // 9. INSPECTOR DE CÁMARA & HERRAMIENTA DE GUARDADO
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

      territoryCamPos.set(savedState.pos.x, savedState.pos.y, savedState.pos.z);
      territoryTarget.set(savedState.target.x, savedState.target.y, savedState.target.z);
      waypoints.overview.pos = territoryCamPos;
      waypoints.overview.target = territoryTarget;

      const snippet = `const territoryCamPos = new THREE.Vector3(${savedState.pos.x}, ${savedState.pos.y}, ${savedState.pos.z});\nconst territoryTarget = new THREE.Vector3(${savedState.target.x}, ${savedState.target.y}, ${savedState.target.z});`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(snippet).catch(() => {});
      }

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
  // 10. SÍNTESIS DE AUDIO WEB (ECOSISTEMA, AGUA & RESONANCIA ARMÓNICA)
  // =====================================================================
  let audioCtx = null;
  let soundActive = false;
  let masterGain = null;
  let natureDroneOsc1 = null;
  let natureDroneOsc2 = null;
  let natureDroneGain = null;

  function initBioAudio() {
    if (audioCtx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      masterGain.connect(audioCtx.destination);

      // Drone armónico biótico de fondo
      natureDroneGain = audioCtx.createGain();
      natureDroneGain.gain.setValueAtTime(0.015, audioCtx.currentTime);
      natureDroneGain.connect(masterGain);

      natureDroneOsc1 = audioCtx.createOscillator();
      natureDroneOsc1.type = "sine";
      natureDroneOsc1.frequency.setValueAtTime(108, audioCtx.currentTime); // Nota La baja profunda
      natureDroneOsc1.connect(natureDroneGain);
      natureDroneOsc1.start();

      natureDroneOsc2 = audioCtx.createOscillator();
      natureDroneOsc2.type = "triangle";
      natureDroneOsc2.frequency.setValueAtTime(162, audioCtx.currentTime); // Quinta armónica Mi
      natureDroneOsc2.connect(natureDroneGain);
      natureDroneOsc2.start();
    } catch(e) { console.warn("Audio no disponible:", e); }
  }

  function triggerHarmonicChime(freqMultiplier = 0.5) {
    if (!audioCtx || !soundActive) return;
    try {
      const osc = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc2.type = "triangle";
      const baseFreq = 240 + freqMultiplier * 460;
      osc.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, audioCtx.currentTime + 1.4);

      osc2.frequency.setValueAtTime(baseFreq * 2.0, audioCtx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(baseFreq * 2.5, audioCtx.currentTime + 1.2);

      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.8);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(masterGain);

      osc.start(); osc2.start();
      osc.stop(audioCtx.currentTime + 1.8);
      osc2.stop(audioCtx.currentTime + 1.8);
    } catch(e){}
  }

  function triggerWaterResonance() {
    if (!audioCtx || !soundActive) return;
    try {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          if (!audioCtx) return;
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = "sine";
          const f = 520 + Math.random() * 380;
          osc.frequency.setValueAtTime(f, audioCtx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(f * 0.7, audioCtx.currentTime + 0.35);

          gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);

          osc.connect(gain);
          gain.connect(masterGain);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.35);
        }, i * 140);
      }
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
  // 11. BUCLE PRINCIPAL DE ANIMACIÓN CON GRAVEDAD & TOUCHDESIGNER VIBES
  // =====================================================================
  const clock = new THREE.Clock();
  let idleTime = 0.0;

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    currentMorph += (targetMorph - currentMorph) * (1.0 - Math.exp(-delta * 5.0));
    particleUniforms.uMorphProgress.value = currentMorph;
    particleUniforms.uTime.value = time;

    updateNetworkSwarm(time, currentMorph);

    // Animación sutil del pulso del árbol activo
    if (focusRingMat.opacity > 0.05) {
      focusRingMesh.rotation.z = -time * 0.45;
      const groundScale = 1.0 + Math.sin(time * 3.2) * 0.15;
      focusRingMesh.scale.set(groundScale, groundScale, 1.0);
    }

    // Suave oscilación de la constelación de árboles activos
    if (activeConstellationPoints && activeConstellationPoints.material.opacity > 0.05) {
      activeConstellationPoints.material.size = 2.8 + Math.sin(time * 2.5) * 0.45;
    }

    // Dinámica viva al inicio (leve respiración de cámara cuando está inactivo)
    if (!userHasInteracted && currentMorph < 0.05) {
      idleTime += delta * 0.25;
      const camHoverX = Math.sin(idleTime) * 3.5;
      const camHoverY = Math.cos(idleTime * 0.8) * 2.2;
      camera.position.x = swarmCamPos.x + camHoverX;
      camera.position.y = swarmCamPos.y + camHoverY;
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
