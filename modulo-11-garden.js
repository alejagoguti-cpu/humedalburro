// =====================================================================
// Axonometría Molecular 3D — Kennedy & Humedal El Burro
// GPU-Accelerated Molecular Point Cloud & Holographic Architecture
// Inspired by Penderecki's Garden (pendereckisgarden.pl)
// =====================================================================

(() => {
  const NET_URL = "./assets/kennedy_net.json";
  const BUILDINGS_URL = "./assets/kennedy_buildings.json";
  const TREES_URL = "./assets/kennedy_trees_real.json";
  const WATER_URL = "./assets/kennedy_water_bodies.json";
  const SCALE = 1 / 10; // Coordenadas del JSON escaladas para Three.js

  // Centro de proyección de Kennedy
  const netCenter = { x: 5341.33, y: 3161.9 };
  function toScene(x, y) {
    return { x: (x - netCenter.x) * SCALE, z: -(y - netCenter.y) * SCALE };
  }

  // ---- Setup de Escena, Cámara y Renderizador WebGL ----
  const canvas = document.getElementById("sceneCanvas");
  const container = document.getElementById("canvasContainer");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04070d);
  scene.fog = new THREE.FogExp2(0x04070d, 0.0018);

  const sceneRoot = new THREE.Group();
  scene.add(sceneRoot);

  const fov = 45;
  const aspect = window.innerWidth / window.innerHeight;
  const camera = new THREE.PerspectiveCamera(fov, aspect, 1, 6000);
  
  // Posición inicial axonométrica pura
  const initialCamPos = new THREE.Vector3(260, 480, 520);
  const initialTarget = new THREE.Vector3(0, 0, 0);
  camera.position.copy(initialCamPos);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.screenSpacePanning = true;
  controls.maxDistance = 2500;
  controls.minDistance = 30;
  controls.maxPolarAngle = Math.PI / 2 + 0.05;
  controls.target.copy(initialTarget);

  // Resize handler
  window.addEventListener("resize", () => {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if (particleShaderMat) {
      particleShaderMat.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
    }
  });

  // ---- Luces Cinematográficas ----
  const ambientLight = new THREE.AmbientLight(0xdcf4ff, 0.65);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0x00f0ff, 1.2);
  sunLight.position.set(300, 600, 400);
  scene.add(sunLight);

  const rimLight = new THREE.DirectionalLight(0x10b981, 0.85);
  rimLight.position.set(-400, 300, -300);
  scene.add(rimLight);

  // ---- Base Plate / Grid Molecular Holográfico ----
  function createHolographicGrid() {
    const gridHelper = new THREE.GridHelper(1200, 80, 0x00f0ff, 0x112233);
    gridHelper.position.y = -0.5;
    gridHelper.material.opacity = 0.25;
    gridHelper.material.transparent = true;
    sceneRoot.add(gridHelper);

    // Disco difuso de luz de fondo
    const discGeo = new THREE.RingGeometry(20, 620, 64);
    const discMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.04,
      side: THREE.DoubleSide
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = -0.6;
    sceneRoot.add(disc);
  }
  createHolographicGrid();

  // =====================================================================
  // GPU GLSL SHADER DE PARTÍCULAS MOLECULARES (Cero CPU overhead, 60-120 FPS)
  // =====================================================================
  const vertexShader = `
    uniform float uExplosion;
    uniform float uTime;
    uniform float uPixelRatio;
    uniform float uSizeMultiplier;
    
    attribute vec3 aExplodePos;
    attribute vec3 aColor;
    attribute float aSize;
    attribute float aPhase;
    attribute float aCategory; // 0=water, 1=tree, 2=bldg, 3=road
    
    varying vec3 vColor;
    varying float vCategory;
    varying float vAlpha;
    varying float vDist;
    
    void main() {
      vColor = aColor;
      vCategory = aCategory;
      
      float t = uExplosion;
      // Curva cúbica suave para la dispersión
      float ease = t * t * (3.0 - 2.0 * t);
      
      // Vórtice armónico de dispersión en el espacio 3D
      vec3 swirl = vec3(
        sin(uTime * 0.8 + aPhase * 3.14) * 12.0 * t,
        cos(uTime * 0.7 + aPhase * 2.0) * 16.0 * t + sin(uTime + position.x * 0.05) * 8.0 * t,
        sin(uTime * 0.9 + aPhase * 4.2) * 12.0 * t
      );
      
      // Ondulación idle en estado ensamblado
      vec3 idleWave = vec3(0.0);
      if (aCategory < 0.5) {
        // Ondas fluidas en el agua del humedal
        idleWave.y = sin(uTime * 3.0 + position.x * 0.2 + position.z * 0.2) * 0.65 * (1.0 - t);
      } else if (aCategory < 1.5) {
        // Movimiento de brisa en el dosel de los árboles
        idleWave.x = sin(uTime * 2.0 + aPhase * 6.0) * 0.45 * (1.0 - t);
        idleWave.z = cos(uTime * 1.8 + aPhase * 6.0) * 0.45 * (1.0 - t);
      }
      
      vec3 finalPos = mix(position + idleWave, aExplodePos + swirl, ease);
      
      vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      // Tamaño dinámico con atenuación por distancia de cámara
      float distFactor = clamp(400.0 / -mvPosition.z, 0.4, 3.5);
      gl_PointSize = aSize * uSizeMultiplier * uPixelRatio * distFactor;
      
      vDist = -mvPosition.z;
      vAlpha = mix(0.92, 0.60, ease);
    }
  `;

  const fragmentShader = `
    uniform vec3 uPaletteTint;
    varying vec3 vColor;
    varying float vCategory;
    varying float vAlpha;
    varying float vDist;
    
    void main() {
      // Cálculo de punto circular suave con núcleo brillante y halo molecular
      vec2 p = gl_PointCoord - vec2(0.5);
      float r = length(p);
      if (r > 0.5) discard;
      
      // Núcleo de átomo concentrado + brillo exterior
      float core = smoothstep(0.5, 0.05, r);
      float rim = smoothstep(0.48, 0.35, r) * smoothstep(0.18, 0.36, r);
      float glow = pow(core, 2.0);
      
      vec3 baseCol = vColor * uPaletteTint;
      // Añadir brillo blanco en el centro exacto del átomo
      vec3 finalColor = mix(baseCol, vec3(1.0, 1.0, 1.0), pow(core, 4.5) * 0.7) + vec3(rim * 0.25);
      
      gl_FragColor = vec4(finalColor, (glow + rim * 0.4) * vAlpha);
    }
  `;

  const particleUniforms = {
    uExplosion: { value: 0.0 },
    uTime: { value: 0.0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    uSizeMultiplier: { value: 1.0 },
    uPaletteTint: { value: new THREE.Color(1.0, 1.0, 1.0) }
  };

  const particleShaderMat = new THREE.ShaderMaterial({
    uniforms: particleUniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  // Arrays para construir el gran BufferGeometry unificado de partículas
  const pTargetPositions = [];
  const pExplodePositions = [];
  const pColors = [];
  const pSizes = [];
  const pPhases = [];
  const pCategories = [];

  // Mallas sólidas holográficas arquitectónicas (para complementar los átomos)
  const holoBuildingsGroup = new THREE.Group();
  sceneRoot.add(holoBuildingsGroup);

  const holoWaterGroup = new THREE.Group();
  sceneRoot.add(holoWaterGroup);

  const holoRoadsGroup = new THREE.Group();
  sceneRoot.add(holoRoadsGroup);

  let buildingHoloMat = null;
  let waterHoloMat = null;
  let roadHoloMat = null;

  // Helper para generar posición de dispersión en esfera/elipsoide 3D
  function randomExplosionVector(bx, by, bz, radiusMin = 180, radiusMax = 480) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = radiusMin + Math.pow(Math.random(), 0.6) * (radiusMax - radiusMin);
    
    // Elevación cósmica hacia arriba y vórtice
    const ex = bx * 0.2 + r * Math.sin(phi) * Math.cos(theta);
    const ey = Math.max(20, by * 0.2 + r * Math.abs(Math.cos(phi)) * 0.85 + Math.random() * 120);
    const ez = bz * 0.2 + r * Math.sin(phi) * Math.sin(theta);
    return { x: ex, y: ey, z: ez };
  }

  // =====================================================================
  // 1. CARGA Y CONSTRUCCIÓN DE EDIFICIOS 3D (Volumetría + Átomos)
  // =====================================================================
  function processBuildings(buildings) {
    const bldgPositions = [];
    const bldgNormals = [];
    const bldgColors = [];
    const bldgEdgePos = [];

    const colGlass = new THREE.Color(0x1a334d);
    const colRoof = new THREE.Color(0x2d5573);
    const colNodeBldg = new THREE.Color(0x38bdf8);
    const colNodeRoof = new THREE.Color(0x00f0ff);

    buildings.forEach((b, idx) => {
      const pts = b.pts.map(p => toScene(p[0], p[1]));
      const h = Math.max(1.2, (b.h || 6) * SCALE);
      if (pts.length < 4) return;

      // Paredes 3D
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], cSeg = pts[i + 1];
        const dx = cSeg.x - a.x, dz = cSeg.z - a.z;
        const len = Math.hypot(dx, dz) || 0.001;
        const nx = dz / len, nz = -dx / len;

        // Triángulos de pared para el holograma
        bldgPositions.push(
          a.x, 0, a.z,  cSeg.x, 0, cSeg.z,  cSeg.x, h, cSeg.z,
          a.x, 0, a.z,  cSeg.x, h, cSeg.z,  a.x, h, a.z
        );
        for (let k = 0; k < 6; k++) {
          bldgNormals.push(nx, 0, nz);
          bldgColors.push(colGlass.r, colGlass.g, colGlass.b);
        }

        // Líneas de aristas superiores
        bldgEdgePos.push(a.x, h, a.z, cSeg.x, h, cSeg.z);

        // Átomos moleculares en vértices de fachada y techos
        const exA = randomExplosionVector(a.x, h, a.z);
        pTargetPositions.push(a.x, h, a.z);
        pExplodePositions.push(exA.x, exA.y, exA.z);
        pColors.push(colNodeRoof.r, colNodeRoof.g, colNodeRoof.b);
        pSizes.push(3.6);
        pPhases.push(Math.random() * 10);
        pCategories.push(2.0); // 2 = edificio

        // Átomos intermedios en edificios altos (> 12m)
        if (h > 2.0 && idx % 2 === 0) {
          const midH = h * 0.5;
          const exMid = randomExplosionVector(a.x, midH, a.z);
          pTargetPositions.push(a.x, midH, a.z);
          pExplodePositions.push(exMid.x, exMid.y, exMid.z);
          pColors.push(colNodeBldg.r, colNodeBldg.g, colNodeBldg.b);
          pSizes.push(2.8);
          pPhases.push(Math.random() * 10);
          pCategories.push(2.0);
        }
      }

      // Techo 3D (Triangulación)
      const pts2d = pts.map(p => new THREE.Vector2(p.x, p.z));
      let tris = [];
      try { tris = THREE.ShapeUtils.triangulateShape(pts2d, []); } catch (e) { tris = []; }

      tris.forEach(([ia, ib, ic]) => {
        bldgPositions.push(
          pts[ia].x, h, pts[ia].z,
          pts[ib].x, h, pts[ib].z,
          pts[ic].x, h, pts[ic].z
        );
        for (let k = 0; k < 3; k++) {
          bldgNormals.push(0, 1, 0);
          bldgColors.push(colRoof.r, colRoof.g, colRoof.b);
        }
      });
    });

    // Malla de arquitectura holográfica con sombreado especular
    const bldgGeo = new THREE.BufferGeometry();
    bldgGeo.setAttribute("position", new THREE.Float32BufferAttribute(bldgPositions, 3));
    bldgGeo.setAttribute("normal", new THREE.Float32BufferAttribute(bldgNormals, 3));
    bldgGeo.setAttribute("color", new THREE.Float32BufferAttribute(bldgColors, 3));

    buildingHoloMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.3,
      metalness: 0.8,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide
    });

    const bldgMesh = new THREE.Mesh(bldgGeo, buildingHoloMat);
    holoBuildingsGroup.add(bldgMesh);

    // Aristas brillantes
    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute("position", new THREE.Float32BufferAttribute(bldgEdgePos, 3));
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45
    });
    const edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);
    holoBuildingsGroup.add(edgeLines);
  }

  // =====================================================================
  // 2. CARGA Y CONSTRUCCIÓN DEL HUMEDAL EL BURRO (Bio-Fluido + Moléculas)
  // =====================================================================
  function processWater(waterBodies) {
    const waterPositions = [];
    const waterNormals = [];
    const colWaterAtom = new THREE.Color(0x00f0ff);
    const colWaterDeep = new THREE.Color(0x0284c7);

    waterBodies.forEach(w => {
      const pts = w.pts;
      if (!pts || pts.length < 3) return;

      const scenePts = pts.map(p => toScene(p[0], p[1]));
      const pts2d = scenePts.map(p => new THREE.Vector2(p.x, p.z));

      let tris = [];
      try { tris = THREE.ShapeUtils.triangulateShape(pts2d, []); } catch(e) { tris = []; }

      tris.forEach(([ia, ib, ic]) => {
        const pa = scenePts[ia], pb = scenePts[ib], pc = scenePts[ic];
        waterPositions.push(
          pa.x, 0.25, pa.z,
          pb.x, 0.25, pb.z,
          pc.x, 0.25, pc.z
        );
        for (let k = 0; k < 3; k++) waterNormals.push(0, 1, 0);

        // Muestreo denso de átomos de agua sobre la superficie del humedal
        const r1 = Math.random(), r2 = Math.random();
        const sq1 = Math.sqrt(r1);
        const wx = (1 - sq1) * pa.x + sq1 * (1 - r2) * pb.x + sq1 * r2 * pc.x;
        const wz = (1 - sq1) * pa.z + sq1 * (1 - r2) * pb.z + sq1 * r2 * pc.z;
        const wy = 0.35 + Math.random() * 0.4;

        const ex = randomExplosionVector(wx, wy, wz, 120, 360);
        pTargetPositions.push(wx, wy, wz);
        pExplodePositions.push(ex.x, ex.y, ex.z);
        pColors.push(colWaterAtom.r, colWaterAtom.g, colWaterAtom.b);
        pSizes.push(4.2);
        pPhases.push(Math.random() * 10);
        pCategories.push(0.0); // 0 = agua
      });

      // Borde perimetral del humedal con átomos
      for (let i = 0; i < scenePts.length; i++) {
        const p = scenePts[i];
        const ex = randomExplosionVector(p.x, 0.3, p.z, 140, 380);
        pTargetPositions.push(p.x, 0.3, p.z);
        pExplodePositions.push(ex.x, ex.y, ex.z);
        pColors.push(0.0, 1.0, 0.85);
        pSizes.push(4.6);
        pPhases.push(i * 0.4);
        pCategories.push(0.0);
      }
    });

    const waterGeo = new THREE.BufferGeometry();
    waterGeo.setAttribute("position", new THREE.Float32BufferAttribute(waterPositions, 3));
    waterGeo.setAttribute("normal", new THREE.Float32BufferAttribute(waterNormals, 3));

    waterHoloMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x083344,
      roughness: 0.1,
      metalness: 0.4,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterHoloMat);
    holoWaterGroup.add(waterMesh);
  }

  // =====================================================================
  // 3. CARGA Y CONSTRUCCIÓN DE ÁRBOLES (Moléculas Botánicas / Clústeres)
  // =====================================================================
  function processTrees(trees) {
    const colTrunk = new THREE.Color(0x78350f);
    const colSauco = new THREE.Color(0xa855f7);   // Sauco (Violeta cuántico)
    const colCapuli = new THREE.Color(0xec4899);  // Capulí (Magenta)
    const colUrapan = new THREE.Color(0x10b981);  // Urapán (Esmeralda)
    const colNormal = new THREE.Color(0x22c55e);  // Verde natural

    trees.forEach((t, i) => {
      const [x, y, hMeters, especieStr] = t;
      const p = toScene(x, y);
      const h = Math.max(0.6, (hMeters || 8) * SCALE);

      let folCol = colNormal;
      if (especieStr && especieStr.includes("Sauco")) folCol = colSauco;
      else if (especieStr && especieStr.includes("capuli")) folCol = colCapuli;
      else if (especieStr && (especieStr.includes("Urap") || especieStr.includes("Fresno"))) folCol = colUrapan;

      // Átomo central de copa
      const crownY = h * 0.85;
      const exCrown = randomExplosionVector(p.x, crownY, p.z, 150, 420);
      pTargetPositions.push(p.x, crownY, p.z);
      pExplodePositions.push(exCrown.x, exCrown.y, exCrown.z);
      pColors.push(folCol.r, folCol.g, folCol.b);
      pSizes.push(5.2);
      pPhases.push(i * 0.2);
      pCategories.push(1.0); // 1 = árbol

      // Átomos orbitales de follaje (3-4 nodos satélite por copa)
      const subNodes = 3;
      const rad = h * 0.45;
      for (let k = 0; k < subNodes; k++) {
        const ang = (k / subNodes) * Math.PI * 2 + (i % 5);
        const sx = p.x + Math.cos(ang) * rad;
        const sz = p.z + Math.sin(ang) * rad;
        const sy = crownY + (k % 2 === 0 ? 0.3 : -0.2);

        const exSub = randomExplosionVector(sx, sy, sz, 160, 450);
        pTargetPositions.push(sx, sy, sz);
        pExplodePositions.push(exSub.x, exSub.y, exSub.z);
        pColors.push(folCol.r * 1.1, folCol.g * 1.1, folCol.b * 1.1);
        pSizes.push(3.8);
        pPhases.push(i + k * 1.5);
        pCategories.push(1.0);
      }

      // Átomo de tronco base
      const exBase = randomExplosionVector(p.x, 0.1, p.z, 100, 300);
      pTargetPositions.push(p.x, 0.1, p.z);
      pExplodePositions.push(exBase.x, exBase.y, exBase.z);
      pColors.push(colTrunk.r, colTrunk.g, colTrunk.b);
      pSizes.push(2.5);
      pPhases.push(i * 0.1);
      pCategories.push(1.0);
    });
  }

  // =====================================================================
  // 4. CARGA Y CONSTRUCCIÓN DE RED VIAL (Líneas + Nodos Viales)
  // =====================================================================
  function processRoads(edges) {
    const roadLinePos = [];
    const colRoadNode = new THREE.Color(0xf59e0b);

    edges.forEach(([kind, pts], edgeIdx) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const a = toScene(pts[i][0], pts[i][1]);
        const b = toScene(pts[i + 1][0], pts[i + 1][1]);
        roadLinePos.push(a.x, 0.05, a.z, b.x, 0.05, b.z);

        // Átomos en intersecciones viales
        if (i === 0 && edgeIdx % 3 === 0) {
          const ex = randomExplosionVector(a.x, 0.08, a.z, 120, 350);
          pTargetPositions.push(a.x, 0.08, a.z);
          pExplodePositions.push(ex.x, ex.y, ex.z);
          pColors.push(colRoadNode.r, colRoadNode.g, colRoadNode.b);
          pSizes.push(3.0);
          pPhases.push(edgeIdx * 0.5);
          pCategories.push(3.0); // 3 = vial
        }
      }
    });

    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute("position", new THREE.Float32BufferAttribute(roadLinePos, 3));
    roadHoloMat = new THREE.LineBasicMaterial({
      color: 0x334155,
      transparent: true,
      opacity: 0.65
    });
    const roadLines = new THREE.LineSegments(roadGeo, roadHoloMat);
    holoRoadsGroup.add(roadLines);
  }

  // =====================================================================
  // CARGA INTEGRADA DE ASSETS & CONSTRUCCIÓN FINAL
  // =====================================================================
  const progressEl = document.getElementById("loadingProgress");
  const loadingScreen = document.getElementById("loadingScreen");
  const statNodesEl = document.getElementById("statNodes");

  Promise.all([
    fetch(BUILDINGS_URL).then(r => r.json()).then(d => { if (progressEl) progressEl.textContent = "Edificios procesados... Cargando agua..."; return d; }),
    fetch(WATER_URL).then(r => r.json()).then(d => { if (progressEl) progressEl.textContent = "Humedal procesado... Cargando arbolado..."; return d; }),
    fetch(TREES_URL).then(r => r.json()).then(d => { if (progressEl) progressEl.textContent = "Árboles procesados... Cargando red vial..."; return d; }),
    fetch(NET_URL).then(r => r.json()).then(d => { if (progressEl) progressEl.textContent = "Construyendo red cuántica de partículas..."; return d; })
  ]).then(([buildings, water, trees, net]) => {
    processBuildings(buildings);
    processWater(water);
    processTrees(trees);
    processRoads(net);

    // Construcción del BufferGeometry de Partículas
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.Float32BufferAttribute(pTargetPositions, 3));
    particleGeo.setAttribute("aExplodePos", new THREE.Float32BufferAttribute(pExplodePositions, 3));
    particleGeo.setAttribute("aColor", new THREE.Float32BufferAttribute(pColors, 3));
    particleGeo.setAttribute("aSize", new THREE.Float32BufferAttribute(pSizes, 1));
    particleGeo.setAttribute("aPhase", new THREE.Float32BufferAttribute(pPhases, 1));
    particleGeo.setAttribute("aCategory", new THREE.Float32BufferAttribute(pCategories, 1));

    const particleSystem = new THREE.Points(particleGeo, particleShaderMat);
    sceneRoot.add(particleSystem);

    if (statNodesEl) statNodesEl.textContent = (pTargetPositions.length / 3).toLocaleString();

    // Animación de entrada inicial: Comienza ensamblado en la axo real
    setTimeout(() => {
      if (loadingScreen) loadingScreen.classList.add("hide");
    }, 600);

  }).catch(err => {
    console.error("Error cargando cartografía de Kennedy:", err);
    if (progressEl) progressEl.textContent = "Error al cargar datos. Reintentando...";
  });

  // =====================================================================
  // CONTROL DE EXPLOSIÓN Y DINÁMICAS INTERACTIVAS
  // =====================================================================
  let isExploded = false;
  let explosionTarget = 0.0;
  let currentExplosion = 0.0;

  const btnExplode = document.getElementById("btnExplodeToggle");
  const explodeText = document.getElementById("explodeBtnText");
  const sliderExplosion = document.getElementById("sliderExplosion");
  const labelExplosion = document.getElementById("labelExplosion");

  function setExplosion(val, updateSlider = true) {
    explosionTarget = Math.max(0, Math.min(1, val));
    if (updateSlider && sliderExplosion) {
      sliderExplosion.value = Math.round(explosionTarget * 100);
      if (labelExplosion) labelExplosion.textContent = `${sliderExplosion.value}%`;
    }
    isExploded = explosionTarget > 0.45;
    if (explodeText) {
      explodeText.textContent = isExploded ? "ENSAMBLAR AXONOMETRÍA" : "DESINTEGRAR EN MOLÉCULAS";
    }
    if (soundEnabled && typeof triggerChime === "function") triggerChime(explosionTarget);
  }

  if (btnExplode) {
    btnExplode.addEventListener("click", () => {
      setExplosion(isExploded ? 0.0 : 1.0);
    });
  }

  if (sliderExplosion) {
    sliderExplosion.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value) / 100;
      if (labelExplosion) labelExplosion.textContent = `${e.target.value}%`;
      setExplosion(val, false);
    });
  }

  // Toggles de Mallas Holográficas
  const btnWireVol = document.getElementById("btnWireVol");
  if (btnWireVol) {
    btnWireVol.addEventListener("click", () => {
      btnWireVol.classList.toggle("active");
      holoBuildingsGroup.visible = btnWireVol.classList.contains("active");
    });
  }

  const btnWaterGlow = document.getElementById("btnWaterGlow");
  if (btnWaterGlow) {
    btnWaterGlow.addEventListener("click", () => {
      btnWaterGlow.classList.toggle("active");
      holoWaterGroup.visible = btnWaterGlow.classList.contains("active");
    });
  }

  // =====================================================================
  // PALETAS DE COLOR CINEMATOGRÁFICAS
  // =====================================================================
  const palettes = {
    penderecki: new THREE.Color(1.0, 1.0, 1.0),
    biocyan: new THREE.Color(0.2, 1.3, 1.4),
    sabana: new THREE.Color(1.3, 1.1, 0.7),
    quantum: new THREE.Color(1.4, 0.9, 0.3)
  };

  document.querySelectorAll("[data-palette]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-palette]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const pKey = btn.dataset.palette;
      if (palettes[pKey]) {
        particleShaderMat.uniforms.uPaletteTint.value.copy(palettes[pKey]);
      }
    });
  });

  // =====================================================================
  // PRESETS DE CÁMARA
  // =====================================================================
  function animateCameraTo(targetPos, targetLookAt, duration = 1800) {
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const startTime = performance.now();

    function updateCam(now) {
      const elapsed = (now - startTime) / duration;
      if (elapsed < 1.0) {
        const ease = 0.5 - 0.5 * Math.cos(elapsed * Math.PI);
        camera.position.lerpVectors(startPos, targetPos, ease);
        controls.target.lerpVectors(startTarget, targetLookAt, ease);
        controls.update();
        requestAnimationFrame(updateCam);
      } else {
        camera.position.copy(targetPos);
        controls.target.copy(targetLookAt);
        controls.update();
      }
    }
    requestAnimationFrame(updateCam);
  }

  document.querySelectorAll("[data-view]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-view]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const v = btn.dataset.view;
      if (v === "axo") {
        animateCameraTo(new THREE.Vector3(260, 480, 520), new THREE.Vector3(0, 0, 0));
      } else if (v === "burro") {
        animateCameraTo(new THREE.Vector3(210, 180, 140), new THREE.Vector3(210, 0, -10));
      } else if (v === "orbit") {
        animateCameraTo(new THREE.Vector3(450, 220, -320), new THREE.Vector3(0, 20, 0));
      }
    });
  });

  // =====================================================================
  // AUDIO GENERATIVO (Web Audio Synthesizer inspired by Penderecki)
  // =====================================================================
  let audioCtx = null, soundEnabled = false, masterGain = null;
  const btnSound = document.getElementById("btnSound");

  function initAudio() {
    if (audioCtx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      masterGain.connect(audioCtx.destination);

      // Drone armónico de fondo (Frecuencia de la Tierra 136.1 Hz)
      const droneOsc = audioCtx.createOscillator();
      const droneFilter = audioCtx.createBiquadFilter();
      droneOsc.type = "sine";
      droneOsc.frequency.setValueAtTime(68.05, audioCtx.currentTime);

      droneFilter.type = "lowpass";
      droneFilter.frequency.setValueAtTime(320, audioCtx.currentTime);

      droneOsc.connect(droneFilter);
      droneFilter.connect(masterGain);
      droneOsc.start();
    } catch(e) {
      console.warn("Web Audio no disponible:", e);
    }
  }

  function triggerChime(intensity = 1.0) {
    if (!audioCtx || !soundEnabled) return;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // Escala pentatónica
    const freq = notes[Math.floor(Math.random() * notes.length)] * (1 + intensity * 0.5);

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25 * intensity, audioCtx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 2.2);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(audioCtx.currentTime + 2.4);
  }

  if (btnSound) {
    btnSound.addEventListener("click", () => {
      soundEnabled = !soundEnabled;
      btnSound.classList.toggle("active", soundEnabled);
      btnSound.innerHTML = soundEnabled ? '<i class="fa-solid fa-volume-high"></i> Audio Activo' : '<i class="fa-solid fa-volume-xmark"></i> Audio Generativo';
      if (soundEnabled) {
        initAudio();
        if (audioCtx.state === "suspended") audioCtx.resume();
      }
    });
  }

  // =====================================================================
  // LOOP DE RENDERIZADO GPU (60-120 FPS Buttery Smooth)
  // =====================================================================
  const clock = new THREE.Clock();
  let frameCount = 0, lastFpsTime = performance.now();
  const fpsCounterEl = document.getElementById("fpsCounter");

  function renderLoop() {
    requestAnimationFrame(renderLoop);

    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    // Suavizado elástico de la transición de explosión (lerp continuo)
    currentExplosion += (explosionTarget - currentExplosion) * (delta * 4.5);
    particleShaderMat.uniforms.uExplosion.value = currentExplosion;
    particleShaderMat.uniforms.uTime.value = elapsed;

    // Atenuar o disolver las mallas sólidas con la explosión
    const solidOpacity = Math.max(0.0, 1.0 - currentExplosion * 1.4);
    if (buildingHoloMat) buildingHoloMat.opacity = 0.72 * solidOpacity;
    if (waterHoloMat) waterHoloMat.opacity = 0.78 * solidOpacity;
    if (roadHoloMat) roadHoloMat.opacity = 0.65 * solidOpacity;

    controls.update();
    renderer.render(scene, camera);

    // Medición de FPS
    frameCount++;
    const now = performance.now();
    if (now - lastFpsTime >= 1000) {
      if (fpsCounterEl) fpsCounterEl.textContent = `${frameCount} FPS`;
      frameCount = 0;
      lastFpsTime = now;
    }
  }

  renderLoop();
})();
