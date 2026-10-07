// =====================================================================
// El Jardín de las Aguas — Red Biótica & Territorio de Kennedy 3D
// Digital Experience inspired by Penderecki's Garden (pendereckisgarden.pl)
// 500 Interactive Species Nodes -> Shockwave Explosion -> 3D Territory
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
  scene.background = new THREE.Color(0x020408);
  scene.fog = new THREE.FogExp2(0x020408, 0.0008);

  const sceneRoot = new THREE.Group();
  scene.add(sceneRoot);

  const fov = 44;
  const aspect = window.innerWidth / window.innerHeight;
  const camera = new THREE.PerspectiveCamera(fov, aspect, 1, 9500);
  
  // Posiciones de Cámara
  const swarmCamPos = new THREE.Vector3(0, 30, 130);
  const swarmTarget = new THREE.Vector3(0, 0, 0);

  const territoryCamPos = new THREE.Vector3(180, 275, 325);
  const territoryTarget = new THREE.Vector3(35, 0, 10);

  const waypoints = {
    overview: { pos: territoryCamPos, target: territoryTarget },
    burro:    { pos: new THREE.Vector3(180, 105, 115), target: new THREE.Vector3(210, 0, -10) },
    canopy:   { pos: new THREE.Vector3(90, 68, 85),    target: new THREE.Vector3(80, 5, 40) },
    cali:     { pos: new THREE.Vector3(285, 120, -35), target: new THREE.Vector3(200, 0, -20) }
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

  // OrbitControls totalmente libre y suave para acomodar la vista al gusto del usuario
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.screenSpacePanning = true;
  controls.maxDistance = 3500;
  controls.minDistance = 10;
  controls.maxPolarAngle = Math.PI / 2 + 0.08;
  controls.target.copy(swarmTarget);

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
  const ambientLight = new THREE.AmbientLight(0xdff5ec, 0.9);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0x10b981, 1.5);
  keyLight.position.set(340, 640, 440);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x00f0ff, 1.1);
  rimLight.position.set(-440, 340, -340);
  scene.add(rimLight);

  // Base Paisajística Amplia
  function createExpansiveBase() {
    const discGeo = new THREE.RingGeometry(10, 1600, 80);
    const discMat = new THREE.MeshBasicMaterial({
      color: 0x041118,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = -0.6;
    sceneRoot.add(disc);

    const grid = new THREE.GridHelper(2600, 96, 0x10b981, 0x05131b);
    grid.position.y = -0.55;
    grid.material.opacity = 0.28;
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
      relations: ["Control de babosas", "Caza bajo hojarasca", "Presa de Gavilanes"], color: 0x059669
    },
    {
      common: "Cusumbo Andino", scientific: "Nasua olivacea", taxon: "Mammalia", icon: "fa-paw",
      habitat: "Reserva Umbral Horizontes / El Burro", diet: "Frutos de Sauco, semillas e invertebrados",
      relations: ["Dispersión de semillas", "Forrajeo en dosel", "Polinización indirecta"], color: 0xf59e0b
    },
    {
      common: "Comadreja Andina", scientific: "Neogale frenata", taxon: "Mammalia", icon: "fa-paw",
      habitat: "Ribera del Río Bogotá y canales", diet: "Pequeños roedores y anfibios",
      relations: ["Depredador tope", "Control poblacional", "Madrigueras en taludes"], color: 0xd97706
    },
    {
      common: "Tingua Azul", scientific: "Porphyrio martinica", taxon: "Aves", icon: "fa-feather",
      habitat: "Lámina de agua y vegetación flotante", diet: "Lenteja de agua, semillas y moluscos",
      relations: ["Ave migratoria", "Nidificación en juncales", "Dispersora de macrófitas"], color: 0x00f0ff
    },
    {
      common: "Garza Real", scientific: "Ardea alba", taxon: "Aves", icon: "fa-dove",
      habitat: "Orillas abiertas del Humedal El Burro", diet: "Ranas sabaneras, peces y coleópteros",
      relations: ["Depredador acuático", "Indicador de calidad hídrica", "Vuelo en bandadas"], color: 0xe0f2fe
    },
    {
      common: "Lagartija Bombillo", scientific: "Riama striata", taxon: "Reptilia", icon: "fa-worm",
      habitat: "Corteza de árboles y troncos caídos", diet: "Artrópodos y pequeñas arañas",
      relations: ["Controlador de plagas", "Termorregulación en rocas", "Presa de aves"], color: 0x84cc16
    },
    {
      common: "Hicotea del Humedal", scientific: "Trachemys callirostris", taxon: "Reptilia", icon: "fa-shield-halved",
      habitat: "Zonas de remanso y asoleaderos de agua", diet: "Vegetación sumergida y carroña acuática",
      relations: ["Limpieza de detritos", "Asoleo en troncos", "Nidación en suelo"], color: 0x34d399
    },
    {
      common: "Murciélago Mastín", scientific: "Molossus molossus", taxon: "Mammalia", icon: "fa-bat",
      habitat: "Huecos de urapanes y cielo nocturno", diet: "Insectos voladores nocturnos y polillas",
      relations: ["Control nocturno de plagas", "Bioacústica ultrasónica", "Polinización"], color: 0xa855f7
    },
    {
      common: "Ardilla de Cola Roja", scientific: "Sciurus granatensis", taxon: "Mammalia", icon: "fa-tree",
      habitat: "Copas de Sauco, Capulí y Urapán", diet: "Semillas, conos y brotes tiernos",
      relations: ["Dispersión de bellotas", "Siembra natural de árboles", "Alimento de búhos"], color: 0xea580c
    },
    {
      common: "Sauco Negro", scientific: "Sambucus nigra", taxon: "Plantae", icon: "fa-seedling",
      habitat: "Bosque ribereño y cercas vivas", diet: "Fotosíntesis y absorción de nutrientes",
      relations: ["Alimento para aves y ardillas", "Flores para polinizadores", "Sombra y humedad"], color: 0x10b981
    },
    {
      common: "Juncal Gigante", scientific: "Schoenoplectus californicus", taxon: "Plantae", icon: "fa-spa",
      habitat: "Franja helófita del humedal", diet: "Fitorremediación y purificación de agua",
      relations: ["Filtro natural de metales", "Refugio de tinguas", "Fijación de sustrato"], color: 0x059669
    },
    {
      common: "Lenteja de Agua", scientific: "Lemna minor", taxon: "Plantae", icon: "fa-leaf",
      habitat: "Superficie de aguas calmas", diet: "Absorción de nitrógeno y fósforo",
      relations: ["Oxigenación del agua", "Alimento de patos", "Sombra contra algas tóxicas"], color: 0x6ee7b7
    },
    {
      common: "Salamandra de Páramo", scientific: "Bolitoglossa adspersa", taxon: "Amphibia", icon: "fa-dragon",
      habitat: "Musgo húmedo y hojarasca de sabana", diet: "Colémbolos y ácaros del suelo",
      relations: ["Bioindicador de humedad", "Respiración cutánea", "Cadena detritívora"], color: 0x14b8a6
    },
    {
      common: "Monjita Bogotana", scientific: "Chrysomus icterocephalus", taxon: "Aves", icon: "fa-feather-pointed",
      habitat: "Enea y juncales densos de El Burro", diet: "Semillas y orugas acuáticas",
      relations: ["Especie emblemática de sabana", "Nidos colgantes", "Canto territorial"], color: 0xfacc15
    },
    {
      common: "Pato Zambullidor", scientific: "Oxyura jamaicensis", taxon: "Aves", icon: "fa-feather",
      habitat: "Cuerpo central del Humedal El Burro", diet: "Larvas de mosquito y vegetación bentónica",
      relations: ["Buceo profundo", "Cortejo acuático", "Indicador de turbidez"], color: 0x38bdf8
    }
  ];

  // =====================================================================
  // 2. ENJAMBRE DE 500 BOLITAS BIÓTICAS & FILAMENTOS INTERACTIVOS
  // =====================================================================
  const SWARM_COUNT = 500;
  const swarmGroup = new THREE.Group();
  sceneRoot.add(swarmGroup);

  const sphereGeo = new THREE.SphereGeometry(1.2, 16, 16);
  const sphereMat = new THREE.MeshStandardMaterial({
    roughness: 0.2,
    metalness: 0.35,
    vertexColors: true,
    transparent: true,
    opacity: 0.95
  });

  const swarmMesh = new THREE.InstancedMesh(sphereGeo, sphereMat, SWARM_COUNT);
  swarmMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(SWARM_COUNT * 3), 3);
  swarmGroup.add(swarmMesh);

  // Filamentos de luz entre las 500 bolitas
  const MAX_LINKS = 1100;
  const linkPos = new Float32Array(MAX_LINKS * 2 * 3);
  const linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute("position", new THREE.BufferAttribute(linkPos, 3));
  const linkMat = new THREE.LineBasicMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0.4
  });
  const linkLines = new THREE.LineSegments(linkGeo, linkMat);
  swarmGroup.add(linkLines);

  const swarmNodes = [];
  const dummyObj = new THREE.Object3D();

  for (let i = 0; i < SWARM_COUNT; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = 16 + Math.cbrt(Math.random()) * 42;

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = 8 + (r * Math.sin(phi) * Math.sin(theta)) * 0.75;
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
      scale: 0.8 + Math.random() * 0.5,
      color: col,
      highlighted: false
    });
  }
  swarmMesh.instanceColor.needsUpdate = true;

  // Actualiza física y filamentos del enjambre
  function updateBioticSwarm(time, morphProgress) {
    if (morphProgress > 0.98) {
      swarmGroup.visible = false;
      return;
    }
    swarmGroup.visible = true;

    const swarmFade = Math.max(0.0, 1.0 - morphProgress * 1.6);
    sphereMat.opacity = 0.95 * swarmFade;
    linkMat.opacity = 0.4 * swarmFade;

    let linkIdx = 0;
    const posArr = linkGeo.attributes.position.array;

    for (let i = 0; i < SWARM_COUNT; i++) {
      const d = swarmNodes[i];
      const waveY = Math.sin(time * 1.3 + d.phase) * 1.8;
      const waveX = Math.cos(time * 1.0 + d.phase) * 1.3;
      const waveZ = Math.sin(time * 1.1 + d.phase * 1.5) * 1.3;

      d.x = d.baseX + waveX;
      d.y = d.baseY + waveY;
      d.z = d.baseZ + waveZ;

      // Durante la explosión las bolitas se dispersan
      const morphScatter = morphProgress * 140.0;
      const curX = d.x + (d.baseX > 0 ? 1 : -1) * morphScatter * 0.85;
      const curY = d.y + morphScatter * 0.7;
      const curZ = d.z + (d.baseZ > 0 ? 1 : -1) * morphScatter * 0.85;

      const s = d.scale * (d.highlighted ? 1.6 : 1.0) * swarmFade;
      dummyObj.position.set(curX, curY, curZ);
      dummyObj.scale.set(s, s, s);
      dummyObj.updateMatrix();
      swarmMesh.setMatrixAt(i, dummyObj.matrix);

      if (linkIdx < MAX_LINKS && i % 2 === 0 && swarmFade > 0.25) {
        for (let j = i + 1; j < Math.min(i + 14, SWARM_COUNT); j++) {
          const dj = swarmNodes[j];
          const distSq = (d.x - dj.x)**2 + (d.y - dj.y)**2 + (d.z - dj.z)**2;
          if (distSq < 240 && linkIdx < MAX_LINKS) {
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
      
      // Vórtice de Explosión Espectacular (Curl-Noise Spiral)
      float explosionIntensity = sin(ease * 3.14159);
      vec3 spiralVortex = vec3(
        sin(uTime * 1.2 + aPhase * 3.14) * 38.0 * explosionIntensity + cos(uTime * 0.8 + position.z * 0.04) * 28.0 * explosionIntensity,
        cos(uTime * 1.0 + aPhase * 2.0) * 48.0 * explosionIntensity + sin(uTime * 1.4 + position.x * 0.05) * 32.0 * explosionIntensity + (1.0 - ease) * 55.0,
        sin(uTime * 1.3 + aPhase * 4.2) * 38.0 * explosionIntensity + cos(uTime * 0.9 + position.y * 0.06) * 28.0 * explosionIntensity
      );
      
      // Movimiento orgánico territorial en estado ensamblado
      vec3 territorialIdle = vec3(0.0);
      if (aCategory < 0.5) {
        // Ondas fluidas en el agua del humedal
        territorialIdle.y = sin(uTime * 2.8 + position.x * 0.18 + position.z * 0.18) * 0.6 * ease;
      } else if (aCategory < 1.5) {
        // Brisa en el dosel de los árboles
        territorialIdle.x = sin(uTime * 1.9 + aPhase * 4.0) * 0.45 * ease;
        territorialIdle.z = cos(uTime * 1.6 + aPhase * 4.0) * 0.45 * ease;
      }
      
      // Onda interactiva expansiva
      float distToRipple = length(position.xz - uRipplePos.xz);
      float rippleRadius = uRippleTime * 130.0;
      float rippleDist = abs(distToRipple - rippleRadius);
      float rippleWave = smoothstep(24.0, 0.0, rippleDist) * max(0.0, 1.0 - uRippleTime * 0.7) * ease;
      territorialIdle.y += sin(rippleDist * 0.25 - uTime * 4.0) * rippleWave * 3.2;
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
      
      // Micro-partículas nítidas
      float distFactor = clamp(260.0 / -mvPosition.z, 0.35, 1.85);
      gl_PointSize = (aSize + rippleWave * 1.0 + explosionIntensity * 0.8) * uPixelRatio * distFactor;
      
      vAlpha = mix(0.12, 0.95, ease) + explosionIntensity * 0.4;
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
      
      float edgeAlpha = smoothstep(0.5, 0.2, dist);
      
      vec3 col = vColor;
      if (vRippleBoost > 0.05) {
        col = mix(col, vec3(0.0, 1.0, 0.8), vRippleBoost * 0.6);
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

  // Buffers del modelo territorial unificado
  const pTarget = [];
  const pSwarm = [];
  const pColor = [];
  const pSize = [];
  const pPhase = [];
  const pCat = [];

  let territoryPoints = null;

  function randomSwarmCluster(hubIdx = 0) {
    const hub = swarmNodes[hubIdx % swarmNodes.length];
    const offsetR = 0.5 + Math.random() * 4.5;
    const ang1 = Math.random() * Math.PI * 2;
    const ang2 = Math.random() * Math.PI;
    return {
      x: hub.baseX + offsetR * Math.sin(ang2) * Math.cos(ang1),
      y: hub.baseY + offsetR * Math.cos(ang2) * 0.8,
      z: hub.baseZ + offsetR * Math.sin(ang2) * Math.sin(ang1)
    };
  }

  function rebuildTerritoryParticles() {
    if (territoryPoints) {
      sceneRoot.remove(territoryPoints);
      if (territoryPoints.geometry) territoryPoints.geometry.dispose();
    }

    const total = pTarget.length / 3;
    if (total === 0) return;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pTarget, 3));
    geo.setAttribute("aSwarmPos", new THREE.Float32BufferAttribute(pSwarm, 3));
    geo.setAttribute("aColor", new THREE.Float32BufferAttribute(pColor, 3));
    geo.setAttribute("aSize", new THREE.Float32BufferAttribute(pSize, 1));
    geo.setAttribute("aPhase", new THREE.Float32BufferAttribute(pPhase, 1));
    geo.setAttribute("aCategory", new THREE.Float32BufferAttribute(pCat, 1));

    territoryPoints = new THREE.Points(geo, particleMat);
    sceneRoot.add(territoryPoints);
  }

  // =====================================================================
  // 4. CARGA DE CAPAS TERRITORIALES (Verdes Botánicos Puros y Naturales)
  // =====================================================================
  let currentParticleIndex = 0;

  function loadWater() {
    return fetch(WATER_URL)
      .then(r => r.json())
      .then(waterBodies => {
        const colLagoon = new THREE.Color(0x00f0ff);  // Azul agua cian luminoso
        const colEmerald = new THREE.Color(0x10b981); // Esmeralda acuática
        const colShore = new THREE.Color(0x34d399);   // Verde menta orilla

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
              
              const c = (s % 2 === 0) ? colLagoon : colEmerald;
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
            pColor.push(colShore.r, colShore.g, colShore.b);
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
        // Paleta verde botánica viva del principio
        const colForest = new THREE.Color(0x10b981);  // Esmeralda pura
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
        const colRoad = new THREE.Color(0x52525b); // Grafito asfalto
        const colMajor = new THREE.Color(0x38bdf8); // Vías principales en zafiro

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
        const colSlate = new THREE.Color(0x475569);  // Pizarra arquitectónica
        const colGlass = new THREE.Color(0x38bdf8);  // Destellos de cristal
        const colBronze = new THREE.Color(0xf59e0b); // Techos ámbar cálido

        buildings.forEach((b, idx) => {
          const pts = b.pts.map(p => toScene(p[0], p[1]));
          const h = Math.max(1.4, (b.h || 6) * SCALE);
          if (pts.length < 4) return;

          const bldgCol = (idx % 4 === 0) ? colBronze : ((idx % 2 === 0) ? colSlate : colGlass);

          for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i];
            
            // Techo
            const swTop = randomSwarmCluster(currentParticleIndex++);
            pTarget.push(a.x, h, a.z);
            pSwarm.push(swTop.x, swTop.y, swTop.z);
            pColor.push(bldgCol.r * 1.1, bldgCol.g * 1.1, bldgCol.b * 1.1);
            pSize.push(1.6);
            pPhase.push(idx * 0.2);
            pCat.push(2.0);

            // Altura media
            if (h > 2.2) {
              const midH = h * 0.5;
              const swMid = randomSwarmCluster(currentParticleIndex++);
              pTarget.push(a.x, midH, a.z);
              pSwarm.push(swMid.x, swMid.y, swMid.z);
              pColor.push(bldgCol.r, bldgCol.g, bldgCol.b);
              pSize.push(1.3);
              pPhase.push(idx * 0.3);
              pCat.push(2.0);
            }

            // Base
            const swBase = randomSwarmCluster(currentParticleIndex++);
            pTarget.push(a.x, 0.05, a.z);
            pSwarm.push(swBase.x, swBase.y, swBase.z);
            pColor.push(bldgCol.r * 0.8, bldgCol.g * 0.8, bldgCol.b * 0.8);
            pSize.push(1.1);
            pPhase.push(idx * 0.1);
            pCat.push(2.0);
          }
        });

        // 3,500 partículas de sabana verde oscura para llenar la pantalla
        const colSavanna = new THREE.Color(0x064e3b);
        for (let s = 0; s < 3500; s++) {
          const rad = 240 + Math.random() * 850;
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
      swarmIntroBox.classList.toggle("fade-out", targetMorph > 0.12);
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
    if (!window.gsap) {
      setMorphValue(dest);
      return;
    }

    const endPos = (dest === 1.0) ? territoryCamPos : swarmCamPos;
    const endTarget = (dest === 1.0) ? territoryTarget : swarmTarget;

    // Disparar onda de choque en el centro
    particleUniforms.uRipplePos.value.set(0, 0, 0);
    particleUniforms.uRippleTime.value = 0.0;

    gsap.to({ val: currentMorph }, {
      val: dest,
      duration: 3.4,
      ease: "power3.inOut",
      onUpdate: function() {
        setMorphValue(this.targets()[0].val, true);
      }
    });

    gsap.to(camera.position, {
      x: endPos.x, y: endPos.y, z: endPos.z,
      duration: 3.4,
      ease: "power3.inOut"
    });

    gsap.to(controls.target, {
      x: endTarget.x, y: endTarget.y, z: endTarget.z,
      duration: 3.4,
      ease: "power3.inOut"
    });
  }

  if (btnTriggerMorph) {
    btnTriggerMorph.addEventListener("click", () => animateToStage(1.0));
  }

  if (btnToggle) {
    btnToggle.addEventListener("click", () => {
      animateToStage(isTerritory ? 0.0 : 1.0);
    });
  }

  if (slider) {
    slider.addEventListener("input", (e) => {
      setMorphValue(parseFloat(e.target.value) / 100, false);
    });
  }

  if (labelSwarm) labelSwarm.addEventListener("click", () => animateToStage(0.0));
  if (labelTerritory) labelTerritory.addEventListener("click", () => animateToStage(1.0));

  // =====================================================================
  // 7. VUELO CINEMATOGRÁFICO & WAYPOINTS
  // =====================================================================
  let isCinemaTour = false;
  let cinemaAngle = 0;
  const btnCinemaTour = document.getElementById("btnCinemaTour");
  const cinemaText = document.getElementById("cinemaText");

  if (btnCinemaTour) {
    btnCinemaTour.addEventListener("click", () => {
      isCinemaTour = !isCinemaTour;
      btnCinemaTour.classList.toggle("active", isCinemaTour);
      if (cinemaText) cinemaText.textContent = isCinemaTour ? "Detener Vuelo" : "Modo Video";
      btnCinemaTour.querySelector("i").className = isCinemaTour ? "fa-solid fa-pause" : "fa-solid fa-play";
      if (isCinemaTour && currentMorph < 0.5) animateToStage(1.0);
    });
  }

  function flyToWaypoint(wpKey) {
    const wp = waypoints[wpKey];
    if (!wp || !window.gsap) return;

    if (isCinemaTour) {
      isCinemaTour = false;
      btnCinemaTour.classList.remove("active");
      if (cinemaText) cinemaText.textContent = "Modo Video";
      btnCinemaTour.querySelector("i").className = "fa-solid fa-play";
    }

    gsap.to(camera.position, {
      x: wp.pos.x, y: wp.pos.y, z: wp.pos.z,
      duration: 2.6, ease: "power2.inOut"
    });

    gsap.to(controls.target, {
      x: wp.target.x, y: wp.target.y, z: wp.target.z,
      duration: 2.6, ease: "power2.inOut"
    });

    if (soundActive && typeof triggerHarmonicChime === "function") {
      triggerHarmonicChime(0.65);
    }
  }

  document.querySelectorAll("[data-waypoint]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-waypoint]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      flyToWaypoint(btn.dataset.waypoint);
    });
  });

  // Onda interactiva al hacer clic en el territorio
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  window.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".top-bar") || e.target.closest(".bottom-experience-bar") || e.target.closest(".waypoints-bar") || e.target.closest("#swarmIntroBox") || e.target.closest("#speciesCard")) return;

    mouseVec.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseVec.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouseVec, camera);
    const hitPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
      particleUniforms.uRipplePos.value.copy(hitPoint);
      particleUniforms.uRippleTime.value = 0.0;
      if (soundActive && typeof triggerHarmonicChime === "function") {
        triggerHarmonicChime(0.75);
      }
    }
  });

  // Paralaje de ratón
  let mouseX = 0, mouseY = 0;
  window.addEventListener("mousemove", (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  // =====================================================================
  // 8. PAISAJE SONORO GENERATIVO (Web Audio API)
  // =====================================================================
  let audioCtx = null, soundActive = false, masterGain = null;
  const soundBtn = document.getElementById("soundToggle");

  function initAudioEngine() {
    if (audioCtx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.18, audioCtx.currentTime);
      masterGain.connect(audioCtx.destination);

      const osc1 = audioCtx.createOscillator();
      const filter1 = audioCtx.createBiquadFilter();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(68.05, audioCtx.currentTime);

      filter1.type = "lowpass";
      filter1.frequency.setValueAtTime(280, audioCtx.currentTime);

      osc1.connect(filter1);
      filter1.connect(masterGain);
      osc1.start();
    } catch(e) {
      console.warn("Audio no disponible:", e);
    }
  }

  function triggerHarmonicChime(intensity = 1.0) {
    if (!audioCtx || !soundActive) return;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
    const freq = notes[Math.floor(Math.random() * notes.length)] * (1 + intensity * 0.35);

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.20 * Math.max(0.3, intensity), audioCtx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 2.8);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(audioCtx.currentTime + 3.0);
  }

  if (soundBtn) {
    soundBtn.addEventListener("click", () => {
      soundActive = !soundActive;
      soundBtn.classList.toggle("active", soundActive);
      soundBtn.innerHTML = soundActive ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
      if (soundActive) {
        initAudioEngine();
        if (audioCtx.state === "suspended") audioCtx.resume();
      }
    });
  }

  // =====================================================================
  // 9. LOOP DE RENDERIZADO GPU (60-120 FPS FLUIDO)
  // =====================================================================
  const clock = new THREE.Clock();

  function render() {
    requestAnimationFrame(render);

    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    particleUniforms.uRippleTime.value += delta;

    currentMorph += (targetMorph - currentMorph) * (delta * 3.8);
    particleUniforms.uMorphProgress.value = currentMorph;
    particleUniforms.uTime.value = elapsed;

    updateBioticSwarm(elapsed, currentMorph);

    if (isCinemaTour) {
      cinemaAngle += delta * 0.22;
      const radius = 320 + Math.sin(cinemaAngle * 0.7) * 80;
      const camY = 170 + Math.sin(cinemaAngle * 0.5) * 90;

      camera.position.x = Math.cos(cinemaAngle) * radius + 50;
      camera.position.z = Math.sin(cinemaAngle) * radius + 20;
      camera.position.y = camY;

      controls.target.x = Math.sin(cinemaAngle * 0.4) * 40 + 40;
      controls.target.z = Math.cos(cinemaAngle * 0.4) * 30;
      controls.target.y = 10;
    } else {
      sceneRoot.rotation.y = mouseX * 0.025;
      sceneRoot.rotation.x = mouseY * 0.012;
    }

    controls.update();
    renderer.render(scene, camera);
  }

  render();
})();
