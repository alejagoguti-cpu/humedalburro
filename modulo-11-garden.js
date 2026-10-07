// =====================================================================
// El Jardín de las Aguas — Red Biótica & Territorio de Kennedy 3D
// Digital Experience inspired by Penderecki's Garden (pendereckisgarden.pl)
// 500 Luminous Biotic Nodes -> Vortex Explosion -> 3D Territory
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

  const fov = 44;
  const aspect = window.innerWidth / window.innerHeight;
  const camera = new THREE.PerspectiveCamera(fov, aspect, 1, 9500);
  
  // Posiciones de Cámara
  const swarmCamPos = new THREE.Vector3(0, 24, 125);
  const swarmTarget = new THREE.Vector3(0, 0, 0);

  const territoryCamPos = new THREE.Vector3(180, 260, 310);
  const territoryTarget = new THREE.Vector3(35, 0, 10);

  const waypoints = {
    overview: { pos: territoryCamPos, target: territoryTarget },
    burro:    { pos: new THREE.Vector3(180, 95, 110),  target: new THREE.Vector3(210, 0, -10) },
    canopy:   { pos: new THREE.Vector3(90, 60, 80),    target: new THREE.Vector3(80, 5, 40) },
    cali:     { pos: new THREE.Vector3(285, 110, -30), target: new THREE.Vector3(200, 0, -20) }
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
  renderer.toneMappingExposure = 1.3;

  // OrbitControls suave y totalmente interactivo
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.screenSpacePanning = true;
  controls.maxDistance = 3500;
  controls.minDistance = 8;
  controls.maxPolarAngle = Math.PI / 2 + 0.08;
  controls.target.copy(swarmTarget);

  // Auto-fade del título inicial al interactuar con el mouse, scroll o tocar
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

  // ---- Luces Cinematográficas ----
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0x10b981, 1.8);
  keyLight.position.set(340, 640, 440);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x00f0ff, 1.4);
  rimLight.position.set(-440, 340, -340);
  scene.add(rimLight);

  // Base Paisajística Amplia
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
    sceneRoot.add(disc);

    const grid = new THREE.GridHelper(2800, 100, 0x0d9488, 0x041a24);
    grid.position.y = -0.55;
    grid.material.opacity = 0.22;
    grid.material.transparent = true;
    sceneRoot.add(grid);
  }
  createExpansiveBase();

  // =====================================================================
  // 1. BASE DE DATOS DE ESPECIES REALES DE KENNEDY (iNaturalist & Humedal)
  // =====================================================================
  const SPECIES_CATALOG = [
    {
      common: "Rana Sabanera", scientific: "Dendropsophus molitor", taxon: "Amphibia", icon: "fa-frog",
      habitat: "Espejos de agua y juncales de El Burro", diet: "Insectos acuáticos, larvas y dípteros",
      relations: ["Control de mosquitos", "Alimento de Garza Real", "Refugio en Juncos"], color: 0x10b981
    },
    {
      common: "Serpiente Sabanera", scientific: "Atractus crassicaudatus", taxon: "Reptilia", icon: "fa-staff-snake",
      habitat: "Suelo húmedo y pastizales de ribera", diet: "Lombrices de tierra y babosas",
      relations: ["Control de babosas", "Caza bajo hojarasca", "Presa de Gavilanes"], color: 0x22c55e
    },
    {
      common: "Cusumbo Andino", scientific: "Nasua olivacea", taxon: "Mammalia", icon: "fa-paw",
      habitat: "Reserva Umbral Horizontes / El Burro", diet: "Frutos de Sauco, semillas e invertebrados",
      relations: ["Dispersión de semillas", "Forrajeo en dosel", "Polinización indirecta"], color: 0xf59e0b
    },
    {
      common: "Comadreja Andina", scientific: "Neogale frenata", taxon: "Mammalia", icon: "fa-paw",
      habitat: "Ribera del Río Bogotá y canales", diet: "Pequeños roedores y anfibios",
      relations: ["Depredador tope", "Control poblacional", "Madrigueras en taludes"], color: 0xfbbf24
    },
    {
      common: "Tingua Azul", scientific: "Porphyrio martinica", taxon: "Aves", icon: "fa-feather",
      habitat: "Lámina de agua y vegetación flotante", diet: "Lenteja de agua, semillas y moluscos",
      relations: ["Ave migratoria", "Nidificación en juncales", "Dispersora de macrófitas"], color: 0x00f0ff
    },
    {
      common: "Garza Real", scientific: "Ardea alba", taxon: "Aves", icon: "fa-dove",
      habitat: "Orillas abiertas del Humedal El Burro", diet: "Ranas sabaneras, peces y coleópteros",
      relations: ["Depredador acuático", "Indicador de calidad hídrica", "Vuelo en bandadas"], color: 0x38bdf8
    },
    {
      common: "Lagartija Bombillo", scientific: "Riama striata", taxon: "Reptilia", icon: "fa-worm",
      habitat: "Corteza de árboles y troncos caídos", diet: "Artrópodos y pequeñas arañas",
      relations: ["Controlador de plagas", "Termorregulación en rocas", "Presa de aves"], color: 0x4ade80
    },
    {
      common: "Hicotea del Humedal", scientific: "Trachemys callirostris", taxon: "Reptilia", icon: "fa-shield-halved",
      habitat: "Zonas de remanso y asoleaderos de agua", diet: "Vegetación sumergida y detritos acuáticos",
      relations: ["Limpieza de detritos", "Asoleo en troncos", "Nidación en ribera"], color: 0x2dd4bf
    },
    {
      common: "Murciélago Mastín", scientific: "Molossus molossus", taxon: "Mammalia", icon: "fa-bat",
      habitat: "Huecos de urapanes y cielo nocturno", diet: "Insectos voladores nocturnos y polillas",
      relations: ["Control nocturno de plagas", "Bioacústica ultrasónica", "Polinización"], color: 0xc084fc
    },
    {
      common: "Ardilla de Cola Roja", scientific: "Sciurus granatensis", taxon: "Mammalia", icon: "fa-tree",
      habitat: "Copas de Sauco, Capulí y Urapán", diet: "Semillas, conos y brotes tiernos",
      relations: ["Dispersión de coníferas", "Almacén en raíces", "Vocalizaciones de alerta"], color: 0xf97316
    },
    {
      common: "Tingua Bogotana", scientific: "Rallus semiplumbeus", taxon: "Aves", icon: "fa-dove",
      habitat: "Densos juncales del Humedal El Burro", diet: "Invertebrados acuáticos y brotes tiernos",
      relations: ["Especie endémica en peligro", "Bioindicador de conservación", "Nidos flotantes"], color: 0x06b6d4
    },
    {
      common: "Pato Turrio", scientific: "Oxyura jamaicensis", taxon: "Aves", icon: "fa-water",
      habitat: "Lagunas profundas de Kennedy", diet: "Larvas de quironómidos y plantas sumergidas",
      relations: ["Buceo profundo", "Oxigenación de sedimentos", "Comensalismo con tinguas"], color: 0x0ea5e9
    },
    {
      common: "Libélula Azul", scientific: "Rhionaeschna marchali", taxon: "Insecta", icon: "fa-bug",
      habitat: "Ronda hidráulica y espejos de agua", diet: "Mosquitos adultos y moscas",
      relations: ["Depredador aéreo de plagas", "Fase larvaria bentónica", "Presa de aves"], color: 0x38bdf8
    },
    {
      common: "Abejorro Sabanero", scientific: "Bombus rubicundus", taxon: "Insecta", icon: "fa-clover",
      habitat: "Flores de Sauco, Tingua y Jardines", diet: "Néctar y polen silvestre",
      relations: ["Polinizador clave", "Zumbido de alta vibración", "Mutualismo floral"], color: 0xfbbf24
    },
    {
      common: "Sauco del Humedal", scientific: "Sambucus nigra", taxon: "Plantae", icon: "fa-leaf",
      habitat: "Bosque ripario y orillas del canal", diet: "Fotosíntesis y nutrientes del humedal",
      relations: ["Frutos para aves migratorias", "Fijación de taludes", "Sombra térmica"], color: 0x10b981
    },
    {
      common: "Junco de Agua", scientific: "Schoenoplectus californicus", taxon: "Plantae", icon: "fa-spa",
      habitat: "Zonas de inundación permanente", diet: "Filtración hídrica fitorremediadora",
      relations: ["Filtro de metales pesados", "Nidación de Tingua", "Refugio de alevines"], color: 0x34d399
    },
    {
      common: "Curí Sabanero", scientific: "Cavia aperea", taxon: "Mammalia", icon: "fa-paw",
      habitat: "Pastizales densos y bordes de humedal", diet: "Gramíneas, pasto kikuyo y hojas tiernas",
      relations: ["Herbívoro primario", "Presa de gavilanes", "Túneles en vegetación"], color: 0xd97706
    },
    {
      common: "Alcaraván Sabanero", scientific: "Vanellus chilensis", taxon: "Aves", icon: "fa-dove",
      habitat: "Campos abiertos y riberas secas", diet: "Gusanos, escarabajos y pequeños moluscos",
      relations: ["Guardián del territorio", "Alarma sonora comunitaria", "Nidos en suelo"], color: 0xa7f3d0
    },
    {
      common: "Búho Rayado", scientific: "Asio clamator", taxon: "Aves", icon: "fa-feather",
      habitat: "Arbolados altos de Kennedy", diet: "Roedores nocturnos y pequeños reptiles",
      relations: ["Controlador nocturno de roedores", "Caza silenciosa", "Nidación en copas"], color: 0xe879f9
    },
    {
      common: "Colibrí Paramuno", scientific: "Aglaeactis cupripennis", taxon: "Aves", icon: "fa-feather",
      habitat: "Jardines florales y arbustos nativos", diet: "Néctar floral e insectos al vuelo",
      relations: ["Polinización cruzada", "Vuelo estacionario", "Alta tasa metabólica"], color: 0xf43f5e
    }
  ];

  // =====================================================================
  // 2. RED ENJAMBRE BIÓTICA LUMINOSA (500 PARTÍCULAS LUMINOSAS + HALOS)
  // =====================================================================
  const SWARM_COUNT = 500;
  const swarmGroup = new THREE.Group();
  sceneRoot.add(swarmGroup);

  // Material LUMINOSO (MeshBasicMaterial unlit para que NUNCA sea negro ni oscuro)
  const sphereGeo = new THREE.SphereGeometry(0.48, 14, 14);
  const sphereMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.95
  });

  const swarmMesh = new THREE.InstancedMesh(sphereGeo, sphereMat, SWARM_COUNT);
  swarmMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(SWARM_COUNT * 3), 3);
  swarmGroup.add(swarmMesh);

  // Halo brillante exterior para cada partícula biótica
  const haloCanvas = document.createElement("canvas");
  haloCanvas.width = 64; haloCanvas.height = 64;
  const hCtx = haloCanvas.getContext("2d");
  const grad = hCtx.createRadialGradient(32, 32, 0, 32, 32, 30);
  grad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
  grad.addColorStop(0.25, "rgba(16, 185, 129, 0.85)");
  grad.addColorStop(0.65, "rgba(0, 240, 255, 0.3)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  hCtx.fillStyle = grad;
  hCtx.fillRect(0, 0, 64, 64);
  const haloTexture = new THREE.CanvasTexture(haloCanvas);

  const haloGeo = new THREE.PlaneGeometry(1.6, 1.6);
  const haloMat = new THREE.MeshBasicMaterial({
    map: haloTexture,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const haloMesh = new THREE.InstancedMesh(haloGeo, haloMat, SWARM_COUNT);
  swarmGroup.add(haloMesh);

  // Filamentos de conexión inter-especie
  const MAX_LINKS = 1200;
  const linkPos = new Float32Array(MAX_LINKS * 2 * 3);
  const linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute("position", new THREE.BufferAttribute(linkPos, 3));
  const linkMat = new THREE.LineBasicMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending
  });
  const linkLines = new THREE.LineSegments(linkGeo, linkMat);
  swarmGroup.add(linkLines);

  const swarmNodes = [];
  const dummyObj = new THREE.Object3D();
  const dummyHalo = new THREE.Object3D();

  for (let i = 0; i < SWARM_COUNT; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    // Forma orgánica helicoidal elipsoidal
    const r = 12 + Math.cbrt(Math.random()) * 36;

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = 6 + (r * Math.sin(phi) * Math.sin(theta)) * 0.75;
    const z = r * Math.cos(phi);

    const species = SPECIES_CATALOG[i % SPECIES_CATALOG.length];
    const col = new THREE.Color(species.color);
    swarmMesh.setColorAt(i, col);

    swarmNodes.push({
      id: i,
      species: species,
      baseX: x, baseY: y, baseZ: z,
      x: x, y: y, z: z,
      phase: Math.random() * Math.PI * 2,
      scale: 0.85 + Math.random() * 0.5,
      color: col,
      highlighted: false
    });
  }
  swarmMesh.instanceColor.needsUpdate = true;

  // Actualización dinámica del enjambre biótico
  function updateBioticSwarm(time, morphProgress) {
    if (morphProgress > 0.98) {
      swarmGroup.visible = false;
      return;
    }
    swarmGroup.visible = true;

    // Rotación continua del enjambre 3D
    swarmGroup.rotation.y = time * 0.08;
    swarmGroup.rotation.x = Math.sin(time * 0.05) * 0.06;

    const swarmFade = Math.max(0.0, 1.0 - morphProgress * 1.5);
    sphereMat.opacity = 0.95 * swarmFade;
    haloMat.opacity = 0.7 * swarmFade;
    linkMat.opacity = 0.45 * swarmFade;

    let linkIdx = 0;
    const posArr = linkGeo.attributes.position.array;

    for (let i = 0; i < SWARM_COUNT; i++) {
      const d = swarmNodes[i];
      const waveY = Math.sin(time * 1.4 + d.phase) * 1.6;
      const waveX = Math.cos(time * 1.1 + d.phase) * 1.2;
      const waveZ = Math.sin(time * 1.2 + d.phase * 1.5) * 1.2;

      d.x = d.baseX + waveX;
      d.y = d.baseY + waveY;
      d.z = d.baseZ + waveZ;

      // Durante la explosión, las partículas se dispersan en espiral
      const morphScatter = morphProgress * 150.0;
      const curX = d.x + (d.baseX > 0 ? 1 : -1) * morphScatter * 0.9;
      const curY = d.y + morphScatter * 0.75;
      const curZ = d.z + (d.baseZ > 0 ? 1 : -1) * morphScatter * 0.9;

      const s = d.scale * (d.highlighted ? 1.8 : 1.0) * swarmFade;
      dummyObj.position.set(curX, curY, curZ);
      dummyObj.scale.set(s, s, s);
      dummyObj.updateMatrix();
      swarmMesh.setMatrixAt(i, dummyObj.matrix);

      // Halo siempre orientado a la cámara
      dummyHalo.position.set(curX, curY, curZ);
      dummyHalo.scale.set(s * 1.6, s * 1.6, s * 1.6);
      dummyHalo.quaternion.copy(camera.quaternion);
      dummyHalo.updateMatrix();
      haloMesh.setMatrixAt(i, dummyHalo.matrix);

      // Conexiones de proximidad
      if (linkIdx < MAX_LINKS && i % 2 === 0 && swarmFade > 0.2) {
        for (let j = i + 1; j < Math.min(i + 14, SWARM_COUNT); j++) {
          const dj = swarmNodes[j];
          const distSq = (d.x - dj.x)**2 + (d.y - dj.y)**2 + (d.z - dj.z)**2;
          if (distSq < 220 && linkIdx < MAX_LINKS) {
            const ptr = linkIdx * 6;
            posArr[ptr]     = curX; posArr[ptr + 1] = curY; posArr[ptr + 2] = curZ;
            posArr[ptr + 3] = dj.x; posArr[ptr + 4] = dj.y; posArr[ptr + 5] = dj.z;
            linkIdx++;
          }
        }
      }
    }

    for (let k = linkIdx * 6; k < MAX_LINKS * 6; k++) posArr[k] = 0;

    swarmMesh.instanceMatrix.needsUpdate = true;
    haloMesh.instanceMatrix.needsUpdate = true;
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
      
      // Vórtice de Explosión Cuántica (Curl-Noise Spiral)
      float explosionIntensity = sin(ease * 3.14159);
      vec3 spiralVortex = vec3(
        sin(uTime * 1.3 + aPhase * 3.14) * 42.0 * explosionIntensity + cos(uTime * 0.9 + position.z * 0.04) * 30.0 * explosionIntensity,
        cos(uTime * 1.1 + aPhase * 2.0) * 54.0 * explosionIntensity + sin(uTime * 1.5 + position.x * 0.05) * 36.0 * explosionIntensity + (1.0 - ease) * 58.0,
        sin(uTime * 1.4 + aPhase * 4.2) * 42.0 * explosionIntensity + cos(uTime * 1.0 + position.y * 0.06) * 30.0 * explosionIntensity
      );
      
      // Movimiento orgánico territorial en estado ensamblado
      vec3 territorialIdle = vec3(0.0);
      if (aCategory < 0.5) {
        // Ondulación acuática en el Humedal El Burro
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
        sin(uTime * 0.9 + aPhase) * 3.0,
        cos(uTime * 0.75 + aPhase) * 3.0,
        sin(uTime * 0.85 + aPhase * 1.5) * 3.0
      );
      
      vec3 targetPos = position + territorialIdle;
      vec3 currentPos = mix(swarmOrbit, targetPos, ease) + spiralVortex;
      
      vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      // Tamaño calibrado para nitidez absoluta
      float distFactor = clamp(260.0 / -mvPosition.z, 0.4, 1.9);
      gl_PointSize = (aSize + rippleWave * 1.2 + explosionIntensity * 0.9) * uPixelRatio * distFactor;
      
      vAlpha = mix(0.12, 0.96, ease) + explosionIntensity * 0.4;
    }
  `;

  const fragmentShader = `
    varying vec3 vColor;
    varying float vCategory;
    varying float vAlpha;
    varying float vRippleBoost;
    
    void main() {
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

  // Buffers de Datos de Partículas
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
    const offsetRad = Math.random() * 2.5;
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
  // 4. CARGA DE CAPAS GEOGRÁFICAS (AGUA, ÁRBOLES, VÍAS, EDIFICIOS)
  // =====================================================================
  function loadWater() {
    return fetch(WATER_URL)
      .then(r => r.json())
      .then(waterBodies => {
        // Paleta Acuática Luminosa
        const colTurquoise = new THREE.Color(0x00f0ff); // Turquesa cristalino
        const colLagoon = new THREE.Color(0x06b6d4);    // Laguna profunda
        const colTealMint = new THREE.Color(0x2dd4bf);  // Menta orilla

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
              
              const c = (s % 2 === 0) ? colTurquoise : colLagoon;
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
            pColor.push(colTealMint.r, colTealMint.g, colTealMint.b);
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
        // Paleta Verde Botánica Exquisita & Viva
        const colEmerald = new THREE.Color(0x10b981);   // Esmeralda botánica vibrante
        const colSpringLeaf = new THREE.Color(0x22c55e); // Verde primavera radiante
        const colBrightMint = new THREE.Color(0x4ade80); // Menta brillante reflejo solar
        const colDeepForest = new THREE.Color(0x047857); // Verde bosque profundo
        const colTrunk = new THREE.Color(0x334155);      // Base neutra pizarra

        trees.forEach((t, i) => {
          const [x, y, hMeters] = t;
          const p = toScene(x, y);
          const h = Math.max(0.7, (hMeters || 8) * SCALE);

          let folCol = colEmerald;
          if (i % 4 === 0) folCol = colBrightMint;
          else if (i % 4 === 1) folCol = colSpringLeaf;
          else if (i % 4 === 2) folCol = colDeepForest;

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
        const colRoad = new THREE.Color(0x475569);  // Pizarra asfáltica
        const colMajor = new THREE.Color(0x38bdf8); // Vías arteriales en zafiro luminoso

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
        const colSlate = new THREE.Color(0x334155);  // Pizarra arquitectónica sofisticada
        const colGlass = new THREE.Color(0x38bdf8);  // Destellos de cristal
        const colSavanna = new THREE.Color(0x1e293b);

        buildings.forEach((b, bIdx) => {
          const pts = b.pts;
          if (!pts || pts.length < 3) return;

          const sPts = pts.map(p => toScene(p[0], p[1]));
          const h = (b.height || 10) * SCALE;
          const isGlass = (bIdx % 6 === 0);
          const c = isGlass ? colGlass : colSlate;

          for (let i = 0; i < sPts.length; i++) {
            const p = sPts[i];
            const steps = Math.max(2, Math.floor(h / 1.5));
            for (let step = 0; step <= steps; step++) {
              const y = (step / steps) * h;
              const sw = randomSwarmCluster(currentParticleIndex++);
              pTarget.push(p.x, y, p.z);
              pSwarm.push(sw.x, sw.y, sw.z);
              pColor.push(c.r, c.g, c.b);
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
  // 5. INSPECCIÓN INTERACTIVA DE ESPECIES (RAYCASTING EN EL ENJAMBRE)
  // =====================================================================
  const raycaster = new THREE.Raycaster();
  const mouseVec = new THREE.Vector2();
  let hoveredNodeId = -1;

  function checkSwarmHover(event) {
    if (currentMorph > 0.35) return; // Solo activo en modo Enjambre

    mouseVec.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouseVec.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouseVec, camera);
    const intersection = raycaster.intersectObject(swarmMesh);

    if (intersection && intersection.length > 0) {
      const instanceId = intersection[0].instanceId;
      if (instanceId !== undefined && instanceId < swarmNodes.length) {
        showSpeciesInfo(instanceId);
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

    // Resaltar el nodo en el enjambre
    swarmNodes.forEach((n, idx) => {
      n.highlighted = (idx === nodeId);
    });

    if (soundActive && typeof triggerHarmonicChime === "function") {
      triggerHarmonicChime(0.4);
    }
  }

  window.addEventListener("pointermove", (e) => {
    checkSwarmHover(e);
  });

  window.addEventListener("pointerdown", (e) => {
    // Si toca fuera de las tarjetas, ocultar ficha si está lejos
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

    if (btnActionText) {
      btnActionText.textContent = isTerritory ? "DISPERSAR A RED BIÓTICA" : "MATERIALIZAR";
    }
    if (labelSwarm) labelSwarm.classList.toggle("active", targetMorph < 0.2);
    if (labelTerritory) labelTerritory.classList.toggle("active", targetMorph > 0.8);

    if (stageLabel) {
      stageLabel.textContent = isTerritory ? "Territorio 3D de Kennedy" : "Red Biótica · 500 Especies y Conexiones";
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

    // Disparar onda de choque en el centro
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

  // Waypoints en Modo Territorio
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

    // Lerp ultra fluido de metamorfosis
    currentMorph += (targetMorph - currentMorph) * (1.0 - Math.exp(-delta * 5.0));
    particleUniforms.uMorphProgress.value = currentMorph;
    particleUniforms.uTime.value = time;

    // Actualizar física del enjambre biótico
    updateBioticSwarm(time, currentMorph);

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
