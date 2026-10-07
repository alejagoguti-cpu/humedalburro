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
    // Flora: TEA & MUSTARD
    { common: "Sauco del Humedal", scientific: "Sambucus nigra", taxon: "Plantae", icon: "fa-leaf", habitat: "Bosque ripario y orillas de El Burro", diet: "Fotosíntesis y nutrientes del humedal", relations: ["Frutos para aves migratorias", "Fijación de taludes", "Sombra y microclima"], color: 0x245E55 },
    { common: "Junco de Agua", scientific: "Schoenoplectus californicus", taxon: "Plantae", icon: "fa-spa", habitat: "Zonas de inundación permanente", diet: "Filtración hídrica fitorremediadora", relations: ["Filtro de metales pesados", "Nidación de Tingua Bogotana", "Refugio de alevines"], color: 0x245E55 },
    { common: "Lenteja de Agua", scientific: "Lemna minor", taxon: "Plantae", icon: "fa-seedling", habitat: "Espejos de agua lénticos", diet: "Absorción de nitrógeno y fósforo", relations: ["Alimento de aves acuáticas", "Oxigenación", "Control de algas"], color: 0xEAC119 },
    { common: "Urapán", scientific: "Fraxinus chinensis", taxon: "Plantae", icon: "fa-tree", habitat: "Dosel urbano y rondas de canal", diet: "Nutrición edáfica y fotosíntesis", relations: ["Percha de rapaces", "Hábitat de murciélagos", "Captura de CO2"], color: 0x245E55 },
    { common: "Capulí", scientific: "Prunus serotina", taxon: "Plantae", icon: "fa-tree", habitat: "Borde de quebradas y reservas", diet: "Nutrientes de suelo aluvial", relations: ["Alimento de cusumbos", "Polinización por abejas", "Corredor biológico"], color: 0xEAC119 },
    { common: "Aliso Sabanero", scientific: "Alnus acuminata", taxon: "Plantae", icon: "fa-tree", habitat: "Ronda hidráulica Río Bogotá", diet: "Fijación biológica de nitrógeno", relations: ["Fijación de suelo", "Refugio de curíes", "Aporte de materia orgánica"], color: 0x245E55 },

    // Invertebrados / Polinizadores: LAVENDER & PINK QUARTZ
    { common: "Abejorro Sabanero", scientific: "Bombus rubicundus", taxon: "Insecta", icon: "fa-clover", habitat: "Flores de Sauco, Tingua y Jardines", diet: "Néctar y polen silvestre", relations: ["Polinizador clave", "Zumbido de alta vibración", "Mutualismo floral"], color: 0x808BC5 },
    { common: "Murciélago Mastín", scientific: "Molossus molossus", taxon: "Mammalia", icon: "fa-bat", habitat: "Huecos de árboles y cielo nocturno", diet: "Insectos voladores nocturnos y polillas", relations: ["Control biológico de plagas", "Bioacústica ultrasónica", "Polinización nocturna"], color: 0x808BC5 },
    { common: "Libélula Azul", scientific: "Rhionaeschna marchali", taxon: "Insecta", icon: "fa-bug", habitat: "Ronda hidráulica y espejos de agua", diet: "Mosquitos adultos y moscas", relations: ["Depredador aéreo de plagas", "Fase larvaria bentónica", "Presa de aves"], color: 0x9ED6DF },
    { common: "Mariposa Espejito", scientific: "Dione vanillae", taxon: "Insecta", icon: "fa-worm", habitat: "Jardines y enredaderas de pasiflora", diet: "Néctar floral y hojas nutricias", relations: ["Polinizadora diurna", "Metamorfosis en orillas", "Alimento de aves"], color: 0xEAA7C7 },
    { common: "Hongo Micorrícico", scientific: "Glomus intraradices", taxon: "Fungi", icon: "fa-cube", habitat: "Suelo rizosférico del humedal", diet: "Azúcares de raíces de sauce y junco", relations: ["Red de transporte de fósforo", "Biofiltro del suelo", "Conexión simbiótica"], color: 0x808BC5 },

    // Avifauna: SKY & LAVENDER
    { common: "Tingua Azul", scientific: "Porphyrio martinica", taxon: "Aves", icon: "fa-feather", habitat: "Lámina de agua y vegetación flotante", diet: "Lenteja de agua, semillas y moluscos", relations: ["Ave migratoria", "Nidificación en juncales", "Dispersora de macrófitas"], color: 0x9ED6DF },
    { common: "Tingua Bogotana", scientific: "Rallus semiplumbeus", taxon: "Aves", icon: "fa-dove", habitat: "Densos juncales del Humedal El Burro", diet: "Invertebrados acuáticos y brotes tiernos", relations: ["Especie endémica en peligro", "Bioindicador de conservación", "Nidos flotantes"], color: 0x9ED6DF },
    { common: "Garza Real", scientific: "Ardea alba", taxon: "Aves", icon: "fa-dove", habitat: "Orillas abiertas del Humedal El Burro", diet: "Ranas sabaneras, peces y coleópteros", relations: ["Depredador acuático tope", "Indicador de calidad hídrica", "Vuelo en bandadas"], color: 0x9ED6DF },
    { common: "Pato Turrio", scientific: "Oxyura jamaicensis", taxon: "Aves", icon: "fa-water", habitat: "Lagunas profundas de Kennedy", diet: "Larvas de quironómidos y plantas sumergidas", relations: ["Buceo profundo", "Oxigenación de sedimentos", "Comensalismo con tinguas"], color: 0x808BC5 },
    { common: "Alcaraván Sabanero", scientific: "Vanellus chilensis", taxon: "Aves", icon: "fa-dove", habitat: "Campos abiertos y riberas secas", diet: "Gusanos, escarabajos y pequeños moluscos", relations: ["Guardián del territorio", "Alarma sonora comunitaria", "Nidos en suelo"], color: 0x9ED6DF },

    // Fauna / Mamíferos / Herpetos: TANGERINE, MUSTARD, RED PASSION
    { common: "Rana Sabanera", scientific: "Dendropsophus molitor", taxon: "Amphibia", icon: "fa-frog", habitat: "Espejos de agua y juncales de El Burro", diet: "Insectos acuáticos, larvas y dípteros", relations: ["Control de mosquitos", "Alimento de Garza Real", "Refugio en Juncos"], color: 0xC63F3E },
    { common: "Serpiente Sabanera", scientific: "Atractus crassicaudatus", taxon: "Reptilia", icon: "fa-staff-snake", habitat: "Suelo húmedo y pastizales de ribera", diet: "Lombrices de tierra y babosas", relations: ["Control de babosas", "Caza bajo hojarasca", "Presa de Gavilanes"], color: 0xC63F3E },
    { common: "Cusumbo Andino", scientific: "Nasua olivacea", taxon: "Mammalia", icon: "fa-paw", habitat: "Reserva Umbral Horizontes / El Burro", diet: "Frutos de Sauco, semillas e invertebrados", relations: ["Dispersión de semillas", "Forrajeo en dosel", "Polinización indirecta"], color: 0xED773C },
    { common: "Comadreja Andina", scientific: "Neogale frenata", taxon: "Mammalia", icon: "fa-paw", habitat: "Ribera del Río Bogotá y canales", diet: "Pequeños roedores y anfibios", relations: ["Depredador tope", "Control poblacional", "Madrigueras en taludes"], color: 0xED773C },
    { common: "Hicotea del Humedal", scientific: "Trachemys callirostris", taxon: "Reptilia", icon: "fa-shield-halved", habitat: "Zonas de remanso y asoleaderos de agua", diet: "Vegetación sumergida y detritos acuáticos", relations: ["Limpieza de detritos", "Asoleo en troncos", "Nidación en ribera"], color: 0xC63F3E },
    { common: "Curí Sabanero", scientific: "Cavia aperea", taxon: "Mammalia", icon: "fa-paw", habitat: "Pastizales inundables y rondas", diet: "Gramíneas, pasto kikuyo y hojas", relations: ["Herbívoro primario", "Presa clave", "Túneles ecológicos"], color: 0xEAC119 }
  ];

  // =====================================================================
  // 2. RED BIÓTICA ESFÉRICA 3D COMPLETA
  // =====================================================================
  const SWARM_COUNT = 850;
  const swarmGroup = new THREE.Group();
  sceneRoot.add(swarmGroup);

  function createNodeBadgeTexture() {
    const cvs = document.createElement("canvas");
    cvs.width = 64; cvs.height = 64;
    const ctx = cvs.getContext("2d");

    const radGlow = ctx.createRadialGradient(32, 32, 10, 32, 32, 30);
    radGlow.addColorStop(0, "rgba(234, 228, 218, 1.0)");
    radGlow.addColorStop(0.35, "rgba(234, 193, 25, 0.6)");
    radGlow.addColorStop(1, "rgba(29, 29, 27, 0)");
    ctx.fillStyle = radGlow;
    ctx.fillRect(0, 0, 64, 64);

    ctx.beginPath();
    ctx.arc(32, 32, 16, 0, Math.PI * 2);
    ctx.fillStyle = "#EAE4DA";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#1D1D1B";
    ctx.stroke();

    return new THREE.CanvasTexture(cvs);
  }

  const nodeBadgeTex = createNodeBadgeTexture();

  const nodeMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uMorph: { value: 0.0 },
      uTexture: { value: nodeBadgeTex }
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
        vAlpha = max(0.0, 1.0 - uMorph * 3.5);
        
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
        if (texCol.a < 0.1) discard;
        gl_FragColor = vec4(vColor * texCol.rgb, texCol.a * vAlpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending
  });

  const SPHERE_RADIUS = 34.0;
  const swarmNodes = [];
  const nodePositions = new Float32Array(SWARM_COUNT * 3);
  const nodeColors = new Float32Array(SWARM_COUNT * 3);
  const nodeScales = new Float32Array(SWARM_COUNT);

  for (let i = 0; i < SWARM_COUNT; i++) {
    const species = SPECIES_CATALOG[i % SPECIES_CATALOG.length];

    const phi = Math.acos(1.0 - 2.0 * (i + 0.5) / SWARM_COUNT);
    const theta = Math.PI * (1.0 + Math.sqrt(5.0)) * i;
    const r = SPHERE_RADIUS * (0.6 + 0.4 * Math.pow((i % 17) / 16.0, 0.5));

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    const col = new THREE.Color(species.color);

    nodePositions[i * 3]     = x;
    nodePositions[i * 3 + 1] = y;
    nodePositions[i * 3 + 2] = z;

    nodeColors[i * 3]     = col.r;
    nodeColors[i * 3 + 1] = col.g;
    nodeColors[i * 3 + 2] = col.b;

    nodeScales[i] = 1.25 + (i % 5 === 0 ? 0.35 : 0.0);

    swarmNodes.push({
      id: i,
      species: species,
      baseX: x, baseY: y, baseZ: z,
      x: x, y: y, z: z,
      phase: Math.random() * Math.PI * 2,
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

  const MAX_LINKS_PER_NODE = 5;
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
      if (neighbor.dSq < 240) {
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
    linkCol[ptr]     = c1.r * 0.9; linkCol[ptr + 1] = c1.g * 0.9; linkCol[ptr + 2] = c1.b * 0.9;
    linkCol[ptr + 3] = c2.r * 0.9; linkCol[ptr + 4] = c2.g * 0.9; linkCol[ptr + 5] = c2.b * 0.9;
  }

  const linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute("position", new THREE.BufferAttribute(linkPos, 3));
  linkGeo.setAttribute("color", new THREE.BufferAttribute(linkCol, 3));

  const linkMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.45,
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

    swarmGroup.rotation.y = time * 0.055;
    swarmGroup.rotation.x = Math.sin(time * 0.04) * 0.04;

    nodeMat.uniforms.uTime.value = time;
    nodeMat.uniforms.uMorph.value = morphProgress;
    linkMat.opacity = Math.max(0.0, (1.0 - morphProgress * 3.5) * 0.45);

    const posArr = nodeGeo.attributes.position.array;
    const lPosArr = linkGeo.attributes.position.array;

    for (let i = 0; i < SWARM_COUNT; i++) {
      const d = swarmNodes[i];
      const waveY = Math.sin(time * 1.1 + d.phase) * 0.45;
      const waveX = Math.cos(time * 0.9 + d.phase) * 0.35;
      const waveZ = Math.sin(time * 1.0 + d.phase * 1.5) * 0.35;

      const curX = d.baseX + waveX;
      const curY = d.baseY + waveY;
      const curZ = d.baseZ + waveZ;

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
  // 3. GLSL SHADER DE EXPLOSIÓN EN VÓRTICE & ENSAMBLAJE DEL TERRITORIO
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
      
      float explosionIntensity = sin(ease * 3.14159);
      vec3 spiralVortex = vec3(
        sin(uTime * 1.3 + aPhase * 3.14) * 36.0 * explosionIntensity + cos(uTime * 0.9 + position.z * 0.04) * 22.0 * explosionIntensity,
        cos(uTime * 1.1 + aPhase * 2.0) * 32.0 * explosionIntensity + sin(uTime * 1.5 + position.x * 0.05) * 22.0 * explosionIntensity,
        sin(uTime * 1.4 + aPhase * 4.2) * 36.0 * explosionIntensity + cos(uTime * 1.0 + position.y * 0.06) * 22.0 * explosionIntensity
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
      vec3 currentPos = mix(swarmOrbit, targetPos, ease) + spiralVortex;
      
      vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      float distFactor = clamp(260.0 / -mvPosition.z, 0.35, 1.7);
      gl_PointSize = (aSize + rippleWave * 1.0 + explosionIntensity * 0.6) * uPixelRatio * distFactor;
      
      vAlpha = smoothstep(0.06, 0.8, ease) * 0.95 + explosionIntensity * 0.3;
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
      
      float edgeAlpha = smoothstep(0.5, 0.18, dist);
      
      vec3 col = vColor;
      if (vRippleBoost > 0.05) {
        col = mix(col, vec3(0.619, 0.839, 0.874), vRippleBoost * 0.65); // SKY boost
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
    blending: THREE.NormalBlending
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
      x: node.baseX + (Math.random() - 0.5) * 1.5,
      y: node.baseY + (Math.random() - 0.5) * 1.5,
      z: node.baseZ + (Math.random() - 0.5) * 1.5
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
  // 4. CARGA DE CAPAS GEOGRÁFICAS CON LA PALETA OFICIAL
  // =====================================================================
  function loadWater() {
    return fetch(WATER_URL)
      .then(r => r.json())
      .then(waterBodies => {
        // Cuerpos de Agua: Sky Aqua (#9ED6DF) puro y cristalino
        const colSky = new THREE.Color(0x9ED6DF);      // SKY Aqua
        const colWaterDeep = new THREE.Color(0x6CB7C6);// Water Deep tint

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
              const wy = 0.25 + Math.random() * 0.2;

              const sw = randomSwarmCluster(currentParticleIndex++);
              pTarget.push(wx, wy, wz);
              pSwarm.push(sw.x, sw.y, sw.z);
              
              const c = (s % 2 === 0) ? colSky : colWaterDeep;
              pColor.push(c.r, c.g, c.b);
              pSize.push(1.4);
              pPhase.push(Math.random() * 10);
              pCat.push(0.0); // 0 = agua
            }
          });

          for (let i = 0; i < sPts.length; i++) {
            const p = sPts[i];
            const sw = randomSwarmCluster(currentParticleIndex++);
            pTarget.push(p.x, 0.3, p.z);
            pSwarm.push(sw.x, sw.y, sw.z);
            pColor.push(colSky.r, colSky.g, colSky.b);
            pSize.push(1.5);
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
        // Vegetación en TEA GREEN (#245E55) con sutiles matices botánicos naturales
        const colTea = new THREE.Color(0x245E55);       // TEA Green
        const colTeaLight = new THREE.Color(0x317A6F);  // Tea Light
        const colTrunk = new THREE.Color(0x1D1D1B);     // MUTED BLACK

        trees.forEach((t, i) => {
          const [x, y, hMeters] = t;
          const p = toScene(x, y);
          const h = Math.max(0.7, (hMeters || 8) * SCALE);

          const folCol = (i % 3 === 0) ? colTeaLight : colTea;

          const crownY = h * 0.85;
          const swCrown = randomSwarmCluster(currentParticleIndex++);
          pTarget.push(p.x, crownY, p.z);
          pSwarm.push(swCrown.x, swCrown.y, swCrown.z);
          pColor.push(folCol.r, folCol.g, folCol.b);
          pSize.push(1.5);
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
            pColor.push(folCol.r, folCol.g, folCol.b);
            pSize.push(1.3);
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
        const colRoad = new THREE.Color(0x1D1D1B);     // MUTED BLACK
        const colMajor = new THREE.Color(0x9ED6DF);    // SKY Accent

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
        // Paleta de Edificios Estricta: Únicamente 2 tonos arquitectónicos elegantes
        // LAVENDER (#808BC5) y PINK QUARTZ (#EAA7C7) — Cero amarillo, cero sobrecarga de color
        const colLavender = new THREE.Color(0x808BC5);   // LAVENDER
        const colPinkQuartz = new THREE.Color(0xEAA7C7); // PINK QUARTZ
        const colBaseGround = new THREE.Color(0x1D1D1B); // MUTED BLACK

        buildings.forEach((b, bIdx) => {
          const pts = b.pts;
          if (!pts || pts.length < 3) return;

          const sPts = pts.map(p => toScene(p[0], p[1]));
          const h = (b.height || 10) * SCALE;
          
          // Estricta alternancia dual-tone (Lavender & Pink Quartz)
          const bldgCol = (bIdx % 2 === 0) ? colLavender : colPinkQuartz;

          for (let i = 0; i < sPts.length; i++) {
            const p = sPts[i];
            const steps = Math.max(3, Math.floor(h / 1.1));
            for (let step = 0; step <= steps; step++) {
              const y = (step / steps) * h;
              const sw = randomSwarmCluster(currentParticleIndex++);
              pTarget.push(p.x, y, p.z);
              pSwarm.push(sw.x, sw.y, sw.z);
              
              // Remate superior sutilmente más luminoso para dar volumen arquitectónico
              const isRoof = (step === steps);
              pColor.push(
                isRoof ? bldgCol.r * 1.08 : bldgCol.r,
                isRoof ? bldgCol.g * 1.08 : bldgCol.g,
                isRoof ? bldgCol.b * 1.08 : bldgCol.b
              );
              pSize.push(isRoof ? 1.4 : 1.2);
              pPhase.push(bIdx + step);
              pCat.push(2.0); // 2 = edificio
            }
          }
        });

        // Suelo de relleno territorial en MUTED BLACK & TEA
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
  // 5. INSPECCIÓN INTERACTIVA DE ESPECIES Y RED TRÓFICA (RAYCASTING)
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

  window.addEventListener("pointermove", (e) => {
    checkSwarmHover(e);
  });

  window.addEventListener("pointerdown", (e) => {
    if (!e.target.closest("#speciesCard") && !e.target.closest(".top-bar") && !e.target.closest(".bottom-experience-bar")) {
      checkSwarmHover(e);
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
