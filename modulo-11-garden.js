// =====================================================================
// El Jardín de las Aguas — Red Biótica Esférica & Territorio de Kennedy 3D
// Digital Experience inspired by Biological Network Spheres & Graphs
// 3D Spherical Swarm -> High-Energy Explosion -> 3D Territory
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

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020409);
  scene.fog = new THREE.FogExp2(0x020409, 0.0006);

  const sceneRoot = new THREE.Group();
  scene.add(sceneRoot);

  const fov = 42;
  const aspect = window.innerWidth / window.innerHeight;
  const camera = new THREE.PerspectiveCamera(fov, aspect, 1, 9500);
  
  // Posiciones de Cámara
  const swarmCamPos = new THREE.Vector3(0, 0, 118);
  const swarmTarget = new THREE.Vector3(0, 0, 0);

  const territoryCamPos = new THREE.Vector3(180, 270, 310);
  const territoryTarget = new THREE.Vector3(35, 0, 10);

  // Waypoints solicitados: Axonometría Total, Humedal El Burro, Humedal La Vaca, Humedal El Techo
  const waypoints = {
    overview: { pos: territoryCamPos, target: territoryTarget },
    burro:    { pos: new THREE.Vector3(180, 95, 110),  target: new THREE.Vector3(210, 0, -10) },
    vaca:     { pos: new THREE.Vector3(-50, 100, 150), target: new THREE.Vector3(-30, 0, 90) },
    techo:    { pos: new THREE.Vector3(110, 100, -110),target: new THREE.Vector3(130, 0, -130) }
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

  // OrbitControls 360° completo y libre (sin restricciones de polar angle para poder ver la esfera completa desde cualquier ángulo)
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.screenSpacePanning = true;
  controls.maxDistance = 3500;
  controls.minDistance = 6;
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

  // Base Paisajística del Territorio (Visible ÚNICAMENTE en Modo Territorio, nunca corta la esfera)
  const sceneBaseGroup = new THREE.Group();
  sceneBaseGroup.visible = false;
  sceneRoot.add(sceneBaseGroup);

  function createExpansiveBase() {
    const discGeo = new THREE.RingGeometry(5, 1700, 80);
    const discMat = new THREE.MeshBasicMaterial({
      color: 0x020710,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = -0.6;
    sceneBaseGroup.add(disc);

    const grid = new THREE.GridHelper(2800, 100, 0x10b981, 0x05131b);
    grid.position.y = -0.55;
    grid.material.opacity = 0.24;
    grid.material.transparent = true;
    sceneBaseGroup.add(grid);
  }
  createExpansiveBase();

  // =====================================================================
  // 1. BASE DE DATOS DE ESPECIES REALES DE KENNEDY (iNaturalist & Humedal)
  // =====================================================================
  const SPECIES_CATALOG = [
    // Cluster Flora & Vegetación del Humedal
    { common: "Sauco del Humedal", scientific: "Sambucus nigra", taxon: "Plantae", cluster: "flora", icon: "fa-leaf", habitat: "Bosque ripario y orillas de El Burro", diet: "Fotosíntesis y nutrientes del humedal", relations: ["Frutos para aves migratorias", "Fijación de taludes", "Sombra y microclima"], color: 0x22c55e },
    { common: "Junco de Agua", scientific: "Schoenoplectus californicus", taxon: "Plantae", cluster: "flora", icon: "fa-spa", habitat: "Zonas de inundación permanente", diet: "Filtración hídrica fitorremediadora", relations: ["Filtro de metales pesados", "Nidación de Tingua Bogotana", "Refugio de alevines"], color: 0x10b981 },
    { common: "Lenteja de Agua", scientific: "Lemna minor", taxon: "Plantae", cluster: "flora", icon: "fa-seedling", habitat: "Espejos de agua lénticos", diet: "Absorción de nitrógeno y fósforo", relations: ["Alimento de aves acuáticas", "Oxigenación", "Control de algas"], color: 0x4ade80 },
    { common: "Urapán", scientific: "Fraxinus chinensis", taxon: "Plantae", cluster: "flora", icon: "fa-tree", habitat: "Dosel urbano y rondas de canal", diet: "Nutrición edáfica y fotosíntesis", relations: ["Percha de rapaces", "Hábitat de murciélagos", "Captura de CO2"], color: 0x16a34a },
    { common: "Capulí", scientific: "Prunus serotina", taxon: "Plantae", cluster: "flora", icon: "fa-tree", habitat: "Borde de quebradas y reservas", diet: "Nutrientes de suelo aluvial", relations: ["Alimento de cusumbos", "Polinización por abejas", "Corredor biológico"], color: 0x84cc16 },

    // Cluster Polinizadores, Invertebrados, Murciélagos y Hongos
    { common: "Abejorro Sabanero", scientific: "Bombus rubicundus", taxon: "Insecta", cluster: "pollinators", icon: "fa-clover", habitat: "Flores de Sauco, Tingua y Jardines", diet: "Néctar y polen silvestre", relations: ["Polinizador clave", "Zumbido de alta vibración", "Mutualismo floral"], color: 0xa855f7 },
    { common: "Murciélago Mastín", scientific: "Molossus molossus", taxon: "Mammalia", cluster: "pollinators", icon: "fa-bat", habitat: "Huecos de árboles y cielo nocturno", diet: "Insectos voladores nocturnos y polillas", relations: ["Control biológico de plagas", "Bioacústica ultrasónica", "Polinización nocturna"], color: 0xc084fc },
    { common: "Libélula Azul", scientific: "Rhionaeschna marchali", taxon: "Insecta", cluster: "pollinators", icon: "fa-bug", habitat: "Ronda hidráulica y espejos de agua", diet: "Mosquitos adultos y moscas", relations: ["Depredador aéreo de plagas", "Fase larvaria bentónica", "Presa de aves"], color: 0xd946ef },
    { common: "Mariposa Espejito", scientific: "Dione vanillae", taxon: "Insecta", cluster: "pollinators", icon: "fa-worm", habitat: "Jardines y enredaderas de pasiflora", diet: "Néctar floral y hojas nutricias", relations: ["Polinizadora diurna", "Metamorfosis en orillas", "Alimento de aves"], color: 0xe879f9 },
    { common: "Hongo Micorrícico", scientific: "Glomus intraradices", taxon: "Fungi", cluster: "pollinators", icon: "fa-cube", habitat: "Suelo rizosférico del humedal", diet: "Azúcares de raíces de sauce y junco", relations: ["Red de transporte de fósforo", "Biofiltro del suelo", "Conexión simbiótica"], color: 0x9333ea },

    // Cluster Avifauna Acuática & Migratoria
    { common: "Tingua Azul", scientific: "Porphyrio martinica", taxon: "Aves", cluster: "avifauna", icon: "fa-feather", habitat: "Lámina de agua y vegetación flotante", diet: "Lenteja de agua, semillas y moluscos", relations: ["Ave migratoria", "Nidificación en juncales", "Dispersora de macrófitas"], color: 0x00f0ff },
    { common: "Tingua Bogotana", scientific: "Rallus semiplumbeus", taxon: "Aves", cluster: "avifauna", icon: "fa-dove", habitat: "Densos juncales del Humedal El Burro", diet: "Invertebrados acuáticos y brotes tiernos", relations: ["Especie endémica en peligro", "Bioindicador de conservación", "Nidos flotantes"], color: 0x06b6d4 },
    { common: "Garza Real", scientific: "Ardea alba", taxon: "Aves", cluster: "avifauna", icon: "fa-dove", habitat: "Orillas abiertas del Humedal El Burro", diet: "Ranas sabaneras, peces y coleópteros", relations: ["Depredador acuático tope", "Indicador de calidad hídrica", "Vuelo en bandadas"], color: 0x38bdf8 },
    { common: "Pato Turrio", scientific: "Oxyura jamaicensis", taxon: "Aves", cluster: "avifauna", icon: "fa-water", habitat: "Lagunas profundas de Kennedy", diet: "Larvas de quironómidos y plantas sumergidas", relations: ["Buceo profundo", "Oxigenación de sedimentos", "Comensalismo con tinguas"], color: 0x0ea5e9 },
    { common: "Alcaraván Sabanero", scientific: "Vanellus chilensis", taxon: "Aves", cluster: "avifauna", icon: "fa-dove", habitat: "Campos abiertos y riberas secas", diet: "Gusanos, escarabajos y pequeños moluscos", relations: ["Guardián del territorio", "Alarma sonora comunitaria", "Nidos en suelo"], color: 0x67e8f9 },

    // Cluster Fauna Terrestre, Anfibios, Reptiles y Mamíferos
    { common: "Rana Sabanera", scientific: "Dendropsophus molitor", taxon: "Amphibia", cluster: "fauna", icon: "fa-frog", habitat: "Espejos de agua y juncales de El Burro", diet: "Insectos acuáticos, larvas y dípteros", relations: ["Control de mosquitos", "Alimento de Garza Real", "Refugio en Juncos"], color: 0xf43f5e },
    { common: "Serpiente Sabanera", scientific: "Atractus crassicaudatus", taxon: "Reptilia", cluster: "fauna", icon: "fa-staff-snake", habitat: "Suelo húmedo y pastizales de ribera", diet: "Lombrices de tierra y babosas", relations: ["Control de babosas", "Caza bajo hojarasca", "Presa de Gavilanes"], color: 0xfb7185 },
    { common: "Cusumbo Andino", scientific: "Nasua olivacea", taxon: "Mammalia", cluster: "fauna", icon: "fa-paw", habitat: "Reserva Umbral Horizontes / El Burro", diet: "Frutos de Sauco, semillas e invertebrados", relations: ["Dispersión de semillas", "Forrajeo en dosel", "Polinización indirecta"], color: 0xf59e0b },
    { common: "Comadreja Andina", scientific: "Neogale frenata", taxon: "Mammalia", cluster: "fauna", icon: "fa-paw", habitat: "Ribera del Río Bogotá y canales", diet: "Pequeños roedores y anfibios", relations: ["Depredador tope", "Control poblacional", "Madrigueras en taludes"], color: 0xfbbf24 },
    { common: "Hicotea del Humedal", scientific: "Trachemys callirostris", taxon: "Reptilia", cluster: "fauna", icon: "fa-shield-halved", habitat: "Zonas de remanso y asoleaderos de agua", diet: "Vegetación sumergida y detritos acuáticos", relations: ["Limpieza de detritos", "Asoleo en troncos", "Nidación en ribera"], color: 0xf43f5e }
  ];

  // =====================================================================
  // 2. RED BIÓTICA ESFÉRICA 3D PURA (BOLA COMPLETA 360° PERFECTAMENTE CENTRADA)
  // =====================================================================
  const SWARM_COUNT = 1000;
  const swarmGroup = new THREE.Group();
  sceneRoot.add(swarmGroup);

  // Textura de nodo tipo "badge / disc con borde nítido"
  function createNodeBadgeTexture() {
    const cvs = document.createElement("canvas");
    cvs.width = 64; cvs.height = 64;
    const ctx = cvs.getContext("2d");

    // Glow suave
    const radGlow = ctx.createRadialGradient(32, 32, 8, 32, 32, 30);
    radGlow.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    radGlow.addColorStop(0.35, "rgba(255, 255, 255, 0.5)");
    radGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = radGlow;
    ctx.fillRect(0, 0, 64, 64);

    // Círculo central con borde nítido
    ctx.beginPath();
    ctx.arc(32, 32, 16, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
    ctx.stroke();

    return new THREE.CanvasTexture(cvs);
  }

  const nodeBadgeTex = createNodeBadgeTexture();

  // Material de Nodos de la Red Biótica
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
        vAlpha = max(0.0, 1.0 - uMorph * 1.5);
        
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPos;
        gl_PointSize = aNodeScale * (380.0 / -mvPos.z) * vAlpha;
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

  // Generación en ESFERA 3D COMPLETA Y EQUILIBRADA (Radio = 35 unidades)
  const SPHERE_RADIUS = 35.0;
  const swarmNodes = [];
  const nodePositions = new Float32Array(SWARM_COUNT * 3);
  const nodeColors = new Float32Array(SWARM_COUNT * 3);
  const nodeScales = new Float32Array(SWARM_COUNT);

  for (let i = 0; i < SWARM_COUNT; i++) {
    const species = SPECIES_CATALOG[i % SPECIES_CATALOG.length];

    // Distribución esférica uniforme Fibonacci / 3D volume
    const phi = Math.acos(1.0 - 2.0 * (i + 0.5) / SWARM_COUNT);
    const theta = Math.PI * (1.0 + Math.sqrt(5.0)) * i;
    
    // Variación radial suave para dar volumen y profundidad a la bola
    const r = SPHERE_RADIUS * (0.45 + 0.55 * Math.pow(Math.random(), 0.5));

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

    nodeScales[i] = 1.0 + Math.random() * 0.5;

    swarmNodes.push({
      id: i,
      species: species,
      baseX: x, baseY: y, baseZ: z,
      x: x, y: y, z: z,
      phase: Math.random() * Math.PI * 2,
      scale: nodeScales[i],
      color: col,
      cluster: species.cluster,
      highlighted: false
    });
  }

  const nodeGeo = new THREE.BufferGeometry();
  nodeGeo.setAttribute("position", new THREE.BufferAttribute(nodePositions, 3));
  nodeGeo.setAttribute("aNodeColor", new THREE.BufferAttribute(nodeColors, 3));
  nodeGeo.setAttribute("aNodeScale", new THREE.BufferAttribute(nodeScales, 1));

  const nodePoints = new THREE.Points(nodeGeo, nodeMat);
  swarmGroup.add(nodePoints);

  // Filamentos de Red Inter-Especies (Conexiones 3D a través de toda la esfera)
  const MAX_LINKS = 4500;
  const linkPos = new Float32Array(MAX_LINKS * 2 * 3);
  const linkCol = new Float32Array(MAX_LINKS * 2 * 3);
  const linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute("position", new THREE.BufferAttribute(linkPos, 3));
  linkGeo.setAttribute("color", new THREE.BufferAttribute(linkCol, 3));

  const linkMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending
  });
  const linkLines = new THREE.LineSegments(linkGeo, linkMat);
  swarmGroup.add(linkLines);

  // Inicializar conexiones inter-nodos en la esfera completa
  let totalLinks = 0;
  for (let i = 0; i < SWARM_COUNT && totalLinks < MAX_LINKS; i++) {
    const ni = swarmNodes[i];
    for (let j = i + 1; j < SWARM_COUNT && totalLinks < MAX_LINKS; j++) {
      const nj = swarmNodes[j];
      const distSq = (ni.baseX - nj.baseX)**2 + (ni.baseY - nj.baseY)**2 + (ni.baseZ - nj.baseZ)**2;

      // Conexiones de proximidad y relaciones tróficas cruzadas (flora <-> fauna, aves <-> árboles)
      if (distSq < 135 && Math.random() < 0.6) {
        const ptr = totalLinks * 6;
        linkPos[ptr]     = ni.baseX; linkPos[ptr + 1] = ni.baseY; linkPos[ptr + 2] = ni.baseZ;
        linkPos[ptr + 3] = nj.baseX; linkPos[ptr + 4] = nj.baseY; linkPos[ptr + 5] = nj.baseZ;

        const c1 = ni.color;
        const c2 = nj.color;
        linkCol[ptr]     = c1.r * 0.85; linkCol[ptr + 1] = c1.g * 0.85; linkCol[ptr + 2] = c1.b * 0.85;
        linkCol[ptr + 3] = c2.r * 0.85; linkCol[ptr + 4] = c2.g * 0.85; linkCol[ptr + 5] = c2.b * 0.85;

        totalLinks++;
      }
    }
  }
  linkGeo.setDrawRange(0, totalLinks * 2);
  linkGeo.attributes.position.needsUpdate = true;
  linkGeo.attributes.color.needsUpdate = true;

  // Actualización fluida de la física y rotación de la esfera
  function updateNetworkSwarm(time, morphProgress) {
    if (morphProgress > 0.98) {
      swarmGroup.visible = false;
      return;
    }
    swarmGroup.visible = true;

    // Rotación orbital continua de la esfera completa en 3D
    swarmGroup.rotation.y = time * 0.055;
    swarmGroup.rotation.x = Math.sin(time * 0.04) * 0.04;

    nodeMat.uniforms.uTime.value = time;
    nodeMat.uniforms.uMorph.value = morphProgress;
    linkMat.opacity = Math.max(0.0, (1.0 - morphProgress * 1.5) * 0.42);

    const posArr = nodeGeo.attributes.position.array;

    for (let i = 0; i < SWARM_COUNT; i++) {
      const d = swarmNodes[i];
      const waveY = Math.sin(time * 1.2 + d.phase) * 0.7;
      const waveX = Math.cos(time * 0.9 + d.phase) * 0.5;
      const waveZ = Math.sin(time * 1.0 + d.phase * 1.5) * 0.5;

      // Dispersión en explosión
      const morphScatter = morphProgress * 150.0;
      const curX = d.baseX + waveX + (d.baseX > 0 ? 1 : -1) * morphScatter * 0.8;
      const curY = d.baseY + waveY + (d.baseY > 0 ? 1 : -1) * morphScatter * 0.7;
      const curZ = d.baseZ + waveZ + (d.baseZ > 0 ? 1 : -1) * morphScatter * 0.8;

      d.x = curX; d.y = curY; d.z = curZ;

      posArr[i * 3]     = curX;
      posArr[i * 3 + 1] = curY;
      posArr[i * 3 + 2] = curZ;
    }
    nodeGeo.attributes.position.needsUpdate = true;
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
      
      // Vórtice de Explosión Espectacular (Curl-Noise Spiral)
      float explosionIntensity = sin(ease * 3.14159);
      vec3 spiralVortex = vec3(
        sin(uTime * 1.3 + aPhase * 3.14) * 44.0 * explosionIntensity + cos(uTime * 0.9 + position.z * 0.04) * 32.0 * explosionIntensity,
        cos(uTime * 1.1 + aPhase * 2.0) * 56.0 * explosionIntensity + sin(uTime * 1.5 + position.x * 0.05) * 38.0 * explosionIntensity + (1.0 - ease) * 60.0,
        sin(uTime * 1.4 + aPhase * 4.2) * 44.0 * explosionIntensity + cos(uTime * 1.0 + position.y * 0.06) * 32.0 * explosionIntensity
      );
      
      // Movimiento orgánico territorial en estado ensamblado
      vec3 territorialIdle = vec3(0.0);
      if (aCategory < 0.5) {
        // Ondulación fluida en el agua de los humedales
        territorialIdle.y = sin(uTime * 2.8 + position.x * 0.18 + position.z * 0.18) * 0.55 * ease;
      } else if (aCategory < 1.5) {
        // Brisa en el dosel de los árboles nativos
        territorialIdle.x = sin(uTime * 1.9 + aPhase * 4.0) * 0.4 * ease;
        territorialIdle.z = cos(uTime * 1.6 + aPhase * 4.0) * 0.4 * ease;
      }
      
      // Onda interactiva expansiva
      float distToRipple = length(position.xz - uRipplePos.xz);
      float rippleRadius = uRippleTime * 140.0;
      float rippleDist = abs(distToRipple - rippleRadius);
      float rippleWave = smoothstep(26.0, 0.0, rippleDist) * max(0.0, 1.0 - uRippleTime * 0.65) * ease;
      territorialIdle.y += sin(rippleDist * 0.25 - uTime * 4.0) * rippleWave * 3.4;
      vRippleBoost = rippleWave;
      
      // Posición orbital del enjambre
      vec3 swarmOrbit = aSwarmPos + vec3(
        sin(uTime * 0.9 + aPhase) * 2.5,
        cos(uTime * 0.75 + aPhase) * 2.5,
        sin(uTime * 0.85 + aPhase * 1.5) * 2.5
      );
      
      vec3 targetPos = position + territorialIdle;
      vec3 currentPos = mix(swarmOrbit, targetPos, ease) + spiralVortex;
      
      vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      // Tamaño calibrado
      float distFactor = clamp(260.0 / -mvPosition.z, 0.4, 1.9);
      gl_PointSize = (aSize + rippleWave * 1.2 + explosionIntensity * 0.9) * uPixelRatio * distFactor;
      
      // En Stage 1 las partículas del territorio son 0% invisibles.
      // Aparecen y descienden limpiamente al explotar.
      vAlpha = smoothstep(0.05, 0.85, ease) * 0.95 + explosionIntensity * 0.35;
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
        col = mix(col, vec3(0.0, 1.0, 0.85), vRippleBoost * 0.65);
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

  // Buffers de Datos de Partículas del Territorio
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
    const offsetRad = Math.random() * 2.2;
    const ang1 = Math.random() * Math.PI * 2;
    const ang2 = Math.random() * Math.PI;
    return {
      x: node.baseX + offsetRad * Math.sin(ang2) * Math.cos(ang1),
      y: node.baseY + offsetRad * Math.sin(ang2) * Math.sin(ang1),
      z: node.baseZ + offsetRad * Math.cos(ang2)
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
  // 4. CARGA DE CAPAS GEOGRÁFICAS (AGUA AZUL LAGOON, EDIFICIOS BLANCO ALABASTRO)
  // =====================================================================
  function loadWater() {
    return fetch(WATER_URL)
      .then(r => r.json())
      .then(waterBodies => {
        // Cuerpos de agua en Azul Laguna Brillante
        const colSkyBlue = new THREE.Color(0x0ea5e9);  // Azul cielo acuático
        const colAzure = new THREE.Color(0x0284c7);    // Azul lago profundo
        const colCyanGlow = new THREE.Color(0x38bdf8); // Destello cian

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
              const wy = 0.25 + Math.random() * 0.25;

              const sw = randomSwarmCluster(currentParticleIndex++);
              pTarget.push(wx, wy, wz);
              pSwarm.push(sw.x, sw.y, sw.z);
              
              const c = (s % 2 === 0) ? colSkyBlue : colAzure;
              pColor.push(c.r, c.g, c.b);
              pSize.push(1.6);
              pPhase.push(Math.random() * 10);
              pCat.push(0.0); // 0 = agua
            }
          });

          for (let i = 0; i < sPts.length; i++) {
            const p = sPts[i];
            const sw = randomSwarmCluster(currentParticleIndex++);
            pTarget.push(p.x, 0.3, p.z);
            pSwarm.push(sw.x, sw.y, sw.z);
            pColor.push(colCyanGlow.r, colCyanGlow.g, colCyanGlow.b);
            pSize.push(1.8);
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
        // Paleta Verde Botánica Viva y Natural
        const colForest = new THREE.Color(0x10b981);  // Esmeralda pura vibrante
        const colDeep = new THREE.Color(0x059669);    // Bosque profundo
        const colMint = new THREE.Color(0x34d399);    // Menta luminosa
        const colMoss = new THREE.Color(0x047857);    // Verde musgo
        const colTrunk = new THREE.Color(0x3f3f46);   // Tronco leñoso neutro

        trees.forEach((t, i) => {
          const [x, y, hMeters] = t;
          const p = toScene(x, y);
          const h = Math.max(0.7, (hMeters || 8) * SCALE);

          let folCol = colForest;
          if (i % 4 === 0) folCol = colMint;
          else if (i % 4 === 1) folCol = colDeep;
          else if (i % 4 === 2) folCol = colMoss;

          const crownY = h * 0.85;
          const swCrown = randomSwarmCluster(currentParticleIndex++);
          pTarget.push(p.x, crownY, p.z);
          pSwarm.push(swCrown.x, swCrown.y, swCrown.z);
          pColor.push(folCol.r, folCol.g, folCol.b);
          pSize.push(1.9);
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
            pSize.push(1.5);
            pPhase.push(i + k * 1.5);
            pCat.push(1.0);
          }

          const swBase = randomSwarmCluster(currentParticleIndex++);
          pTarget.push(p.x, 0.1, p.z);
          pSwarm.push(swBase.x, swBase.y, swBase.z);
          pColor.push(colTrunk.r, colTrunk.g, colTrunk.b);
          pSize.push(1.3);
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
        const colRoad = new THREE.Color(0x3f3f46);  // Grafito asfalto sobrio
        const colMajor = new THREE.Color(0x94a3b8); // Vías principales plata nítida

        edges.forEach(([kind, pts], edgeIdx) => {
          const isMajor = (edgeIdx % 4 === 0);
          const c = isMajor ? colMajor : colRoad;

          for (let i = 0; i < pts.length - 1; i++) {
            const a = toScene(pts[i][0], pts[i][1]);
            const sw = randomSwarmCluster(currentParticleIndex++);
            pTarget.push(a.x, 0.08, a.z);
            pSwarm.push(sw.x, sw.y, sw.z);
            pColor.push(c.r, c.g, c.b);
            pSize.push(isMajor ? 1.4 : 1.1);
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
        // Paleta de Edificios Blanco Alabastro & Cálido (Sin azul ni grisáceo apagado)
        const colPorcelain = new THREE.Color(0xf8fafc); // Blanco porcelana limpio
        const colAlabaster = new THREE.Color(0xe2e8f0); // Alabastro arquitectónico
        const colWarmRoof = new THREE.Color(0xf59e0b);  // Remate ámbar cálido
        const colSavanna = new THREE.Color(0x064e3b);   // Base verde sabana profunda

        buildings.forEach((b, bIdx) => {
          const pts = b.pts;
          if (!pts || pts.length < 3) return;

          const sPts = pts.map(p => toScene(p[0], p[1]));
          const h = (b.height || 10) * SCALE;
          
          const bldgCol = (bIdx % 5 === 0) ? colWarmRoof : ((bIdx % 2 === 0) ? colPorcelain : colAlabaster);

          for (let i = 0; i < sPts.length; i++) {
            const p = sPts[i];
            const steps = Math.max(2, Math.floor(h / 1.5));
            for (let step = 0; step <= steps; step++) {
              const y = (step / steps) * h;
              const sw = randomSwarmCluster(currentParticleIndex++);
              pTarget.push(p.x, y, p.z);
              pSwarm.push(sw.x, sw.y, sw.z);
              pColor.push(bldgCol.r, bldgCol.g, bldgCol.b);
              pSize.push(1.3);
              pPhase.push(bIdx + step);
              pCat.push(2.0); // 2 = edificio
            }
          }
        });

        // Suelo de relleno territorial
        for (let s = 0; s < 4200; s++) {
          const rad = 25 + Math.sqrt(Math.random()) * 210;
          const ang = Math.random() * Math.PI * 2;
          const gx = Math.cos(ang) * rad;
          const gz = Math.sin(ang) * rad;
          const gy = 0.02 + Math.random() * 0.2;

          const sw = randomSwarmCluster(currentParticleIndex++);
          pTarget.push(gx, gy, gz);
          pSwarm.push(sw.x, sw.y, sw.z);
          pColor.push(colSavanna.r, colSavanna.g, colSavanna.b);
          pSize.push(1.1);
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
  // 5. INSPECCIÓN INTERACTIVA DE ESPECIES (RAYCASTING EN LOS NODOS DE LA RED)
  // =====================================================================
  const raycaster = new THREE.Raycaster();
  raycaster.params.Points.threshold = 1.8;
  const mouseVec = new THREE.Vector2();
  let hoveredNodeId = -1;

  function checkSwarmHover(event) {
    if (currentMorph > 0.35) return; // Solo activo en modo Red Biótica

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

    if (cardRelations) {
      cardRelations.innerHTML = sp.relations.map(r => `<span class="relation-tag">${r}</span>`).join("");
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

    // Mostrar el plano base solo al materializar
    sceneBaseGroup.visible = targetMorph > 0.05;

    if (btnActionText) {
      btnActionText.textContent = isTerritory ? "DISPERSAR A RED BIÓTICA" : "MATERIALIZAR";
    }
    if (labelSwarm) labelSwarm.classList.toggle("active", targetMorph < 0.2);
    if (labelTerritory) labelTerritory.classList.toggle("active", targetMorph > 0.8);

    if (stageLabel) {
      stageLabel.textContent = isTerritory ? "Territorio 3D de Kennedy" : "Red Biótica · 1000 Especies y Conexiones";
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

  // Transición de Gran Impacto Visual (Explosión en Vórtice)
  function animateToStage(dest) {
    triggerTitleFadeOut();
    if (!window.gsap) {
      setMorphValue(dest);
      return;
    }

    const endPos = (dest === 1.0) ? territoryCamPos : swarmCamPos;
    const endTarget = (dest === 1.0) ? territoryTarget : swarmTarget;

    // Disparar onda de choque
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

  // Waypoints en Modo Territorio (Axonometría Total, El Burro, La Vaca, El Techo)
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
  // 7. SÍNTESIS DE AUDIO WEB (ECOSISTEMA & PAISAJE SONORO)
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
  // 8. BUCLE PRINCIPAL DE ANIMACIÓN
  // =====================================================================
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    // Transición fluida de metamorfosis
    currentMorph += (targetMorph - currentMorph) * (1.0 - Math.exp(-delta * 5.0));
    particleUniforms.uMorphProgress.value = currentMorph;
    particleUniforms.uTime.value = time;

    // Actualizar física de la esfera biótica única
    updateNetworkSwarm(time, currentMorph);

    // Vuelo de cámara en Modo Video
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
    renderer.render(scene, camera);
  }

  animate();
})();
