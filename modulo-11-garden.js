// =====================================================================
// El Jardín de las Aguas — Red Biótica & Territorio de Kennedy 3D
// Digital Experience inspired by Penderecki's Garden (pendereckisgarden.pl)
// 500 Biotic Spheres Swarm -> Morph to 3D Kennedy Micro-Point Cloud
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

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04080d);
  scene.fog = new THREE.FogExp2(0x04080d, 0.0009);

  const sceneRoot = new THREE.Group();
  scene.add(sceneRoot);

  const fov = 44;
  const aspect = window.innerWidth / window.innerHeight;
  const camera = new THREE.PerspectiveCamera(fov, aspect, 1, 9000);
  
  // Posiciones de Cámara:
  // Estado 1: Enjambre celestial (vista cercana al enjambre flotante)
  const swarmCamPos = new THREE.Vector3(0, 35, 140);
  const swarmTarget = new THREE.Vector3(0, 0, 0);

  // Estado 2: Territorio de Kennedy (encuadre perfecto que cubre toda la pantalla)
  const territoryCamPos = new THREE.Vector3(190, 290, 340);
  const territoryTarget = new THREE.Vector3(30, 0, 10);

  // Waypoints de detalle dentro del territorio
  const waypoints = {
    overview: { pos: territoryCamPos, target: territoryTarget },
    burro:    { pos: new THREE.Vector3(180, 110, 120), target: new THREE.Vector3(210, 0, -10) },
    canopy:   { pos: new THREE.Vector3(90, 70, 90),    target: new THREE.Vector3(80, 5, 40) },
    cali:     { pos: new THREE.Vector3(290, 125, -40), target: new THREE.Vector3(200, 0, -20) }
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
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = true;
  controls.maxDistance = 3000;
  controls.minDistance = 15;
  controls.maxPolarAngle = Math.PI / 2 + 0.04;
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

  // ---- Luces y Atmósfera ----
  const ambientLight = new THREE.AmbientLight(0xd5e6f0, 0.85);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0x7dd3fc, 1.3);
  keyLight.position.set(300, 600, 400);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x10b981, 0.9);
  rimLight.position.set(-400, 300, -300);
  scene.add(rimLight);

  // Base Paisajística Amplia (Cubre toda la pantalla para evitar fondos vacíos)
  function createExpansiveLandscapeBase() {
    const discGeo = new THREE.RingGeometry(10, 1400, 80);
    const discMat = new THREE.MeshBasicMaterial({
      color: 0x08131d,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = -0.6;
    sceneRoot.add(disc);

    // Rejilla sutil en coordenadas del territorio
    const grid = new THREE.GridHelper(2200, 88, 0x1f3b4d, 0x07111a);
    grid.position.y = -0.55;
    grid.material.opacity = 0.35;
    grid.material.transparent = true;
    sceneRoot.add(grid);
  }
  createExpansiveLandscapeBase();

  // =====================================================================
  // 1. EL ENJAMBRE DE 500 ESFERAS BIÓTICAS (Relaciones Ecológicas 3D)
  // =====================================================================
  const SWARM_COUNT = 500;
  const swarmGroup = new THREE.Group();
  sceneRoot.add(swarmGroup);

  const sphereGeo = new THREE.SphereGeometry(1.1, 14, 14);
  const sphereMat = new THREE.MeshStandardMaterial({
    roughness: 0.2,
    metalness: 0.3,
    vertexColors: true,
    transparent: true,
    opacity: 0.95
  });

  const swarmMesh = new THREE.InstancedMesh(sphereGeo, sphereMat, SWARM_COUNT);
  swarmMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(SWARM_COUNT * 3), 3);
  swarmGroup.add(swarmMesh);

  // Líneas sinápticas de relación biótica entre esferas
  const MAX_LINKS = 900;
  const linkPos = new Float32Array(MAX_LINKS * 2 * 3);
  const linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute("position", new THREE.BufferAttribute(linkPos, 3));
  const linkMat = new THREE.LineBasicMaterial({
    color: 0x2dd4bf,
    transparent: true,
    opacity: 0.35
  });
  const linkLines = new THREE.LineSegments(linkGeo, linkMat);
  swarmGroup.add(linkLines);

  const swarmData = [];
  const dummyObj = new THREE.Object3D();

  // Colores bióticos por familia ecológica
  const bioColors = [
    new THREE.Color(0x2dd4bf), // Bio-cian (Humedal y anfibios)
    new THREE.Color(0x10b981), // Esmeralda (Flora arbórea)
    new THREE.Color(0x84cc16), // Lima (Microflora y líquenes)
    new THREE.Color(0xa855f7), // Sauco / Orquídea (Polinizadores)
    new THREE.Color(0xf59e0b), // Ámbar solar (Avifauna y aves migratorias)
    new THREE.Color(0xec4899)  // Flor de capulí (Semillas y frutos)
  ];

  for (let i = 0; i < SWARM_COUNT; i++) {
    // Distribución en esfera orgánica flotante
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = 18 + Math.cbrt(Math.random()) * 42;

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = 8 + (r * Math.sin(phi) * Math.sin(theta)) * 0.7;
    const z = r * Math.cos(phi);

    const col = bioColors[i % bioColors.length];
    swarmMesh.setColorAt(i, col);

    swarmData.push({
      baseX: x, baseY: y, baseZ: z,
      x: x, y: y, z: z,
      vx: (Math.random() - 0.5) * 0.1,
      vy: (Math.random() - 0.5) * 0.1,
      vz: (Math.random() - 0.5) * 0.1,
      phase: Math.random() * Math.PI * 2,
      scale: 0.7 + Math.random() * 0.6,
      color: col
    });
  }
  swarmMesh.instanceColor.needsUpdate = true;

  // Actualiza la posición y los filamentos de la red de 500 esferas
  function updateBioticSwarm(time, morphProgress) {
    if (morphProgress > 0.98) {
      swarmGroup.visible = false;
      return;
    }
    swarmGroup.visible = true;

    // Disolución elástica de las esferas durante el morphing
    const swarmFade = Math.max(0.0, 1.0 - morphProgress * 1.5);
    sphereMat.opacity = 0.95 * swarmFade;
    linkMat.opacity = 0.35 * swarmFade;

    let linkIdx = 0;
    const posArr = linkGeo.attributes.position.array;

    for (let i = 0; i < SWARM_COUNT; i++) {
      const d = swarmData[i];
      // Movimiento orgánico en suspensión
      const waveY = Math.sin(time * 1.2 + d.phase) * 1.8;
      const waveX = Math.cos(time * 0.9 + d.phase) * 1.2;
      const waveZ = Math.sin(time * 1.0 + d.phase * 1.5) * 1.2;

      d.x = d.baseX + waveX;
      d.y = d.baseY + waveY;
      d.z = d.baseZ + waveZ;

      // Si está en transición, las esferas se elevan y disuelven
      const morphScatter = morphProgress * 120.0;
      const curX = d.x + (d.baseX > 0 ? 1 : -1) * morphScatter * 0.8;
      const curY = d.y + morphScatter * 0.6;
      const curZ = d.z + (d.baseZ > 0 ? 1 : -1) * morphScatter * 0.8;

      const s = d.scale * swarmFade;
      dummyObj.position.set(curX, curY, curZ);
      dummyObj.scale.set(s, s, s);
      dummyObj.updateMatrix();
      swarmMesh.setMatrixAt(i, dummyObj.matrix);

      // Calcular enlaces a vecinos cercanos
      if (linkIdx < MAX_LINKS && i % 2 === 0 && swarmFade > 0.3) {
        for (let j = i + 1; j < Math.min(i + 14, SWARM_COUNT); j++) {
          const dj = swarmData[j];
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

    // Limpiar restos de líneas no usadas
    for (let k = linkIdx * 6; k < MAX_LINKS * 6; k++) {
      posArr[k] = 0;
    }

    swarmMesh.instanceMatrix.needsUpdate = true;
    linkGeo.attributes.position.needsUpdate = true;
  }

  // =====================================================================
  // 2. GLSL SHADER DE METAMORFOSIS: ENJAMBRE -> TERRITORIO DE KENNEDY
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
      
      // Interpolación curva suave del morph
      float t = uMorphProgress;
      float ease = smoothstep(0.0, 1.0, t);
      
      // Vórtice helicoidal durante la lluvia / metamorfosis
      vec3 vortex = vec3(
        sin(uTime * 0.8 + aPhase * 3.14) * 16.0 * (1.0 - ease) * ease * 4.0,
        cos(uTime * 0.7 + aPhase * 2.0) * 24.0 * (1.0 - ease) * ease * 4.0 + (1.0 - ease) * 45.0,
        sin(uTime * 0.9 + aPhase * 4.2) * 16.0 * (1.0 - ease) * ease * 4.0
      );
      
      // Movimiento orgánico natural cuando el territorio está ensamblado
      vec3 territorialIdle = vec3(0.0);
      if (aCategory < 0.5) {
        // Ondulación del agua del humedal
        territorialIdle.y = sin(uTime * 2.6 + position.x * 0.16 + position.z * 0.16) * 0.5 * ease;
      } else if (aCategory < 1.5) {
        // Brisa en las copas de los árboles
        territorialIdle.x = sin(uTime * 1.8 + aPhase * 4.0) * 0.35 * ease;
        territorialIdle.z = cos(uTime * 1.5 + aPhase * 4.0) * 0.35 * ease;
      }
      
      // Onda interactiva expansiva al hacer clic
      float distToRipple = length(position.xz - uRipplePos.xz);
      float rippleRadius = uRippleTime * 120.0;
      float rippleDist = abs(distToRipple - rippleRadius);
      float rippleWave = smoothstep(22.0, 0.0, rippleDist) * max(0.0, 1.0 - uRippleTime * 0.7) * ease;
      territorialIdle.y += sin(rippleDist * 0.25 - uTime * 3.5) * rippleWave * 2.8;
      vRippleBoost = rippleWave;
      
      // Posición interpolada entre Enjambre y Territorio
      vec3 targetPos = position + territorialIdle;
      vec3 startPos = aSwarmPos + vec3(sin(uTime + aPhase) * 4.0, cos(uTime * 0.8 + aPhase) * 4.0, sin(uTime * 0.9 + aPhase) * 4.0);
      
      vec3 currentPos = mix(startPos, targetPos, ease) + vortex;
      
      vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      // Tamaño adaptativo según la cercanía a la cámara
      float distFactor = clamp(260.0 / -mvPosition.z, 0.35, 1.85);
      gl_PointSize = (aSize + rippleWave * 0.8) * uPixelRatio * distFactor;
      
      // Las partículas del territorio son transparentes en el estado 0 y opacas en estado 1
      vAlpha = mix(0.08, 0.94, ease);
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
      
      // Micro-disco mate natural
      float edgeAlpha = smoothstep(0.5, 0.2, dist);
      
      vec3 col = vColor;
      if (vRippleBoost > 0.05) {
        col = mix(col, vec3(0.3, 0.85, 0.7), vRippleBoost * 0.6);
      }
      
      gl_FragColor = vec4(col, edgeAlpha * vAlpha);
    }
  `;

  const particleUniforms = {
    uMorphProgress: { value: 0.0 }, // 0.0 = Enjambre Biótico, 1.0 = Territorio Completo
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

  // Buffers del modelo territorial de Kennedy
  const pTarget = [];
  const pSwarm = [];
  const pColor = [];
  const pSize = [];
  const pPhase = [];
  const pCat = [];

  let territoryPoints = null;

  function randomSwarmOrigin(targetX, targetY, targetZ) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 18 + Math.random() * 45;
    return {
      x: r * Math.sin(phi) * Math.cos(theta),
      y: 12 + r * Math.sin(phi) * Math.sin(theta) * 0.7 + Math.random() * 10,
      z: r * Math.cos(phi)
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
  // 3. CARGA DE CAPAS TERRITORIALES DE KENNEDY
  // =====================================================================
  function loadWater() {
    return fetch(WATER_URL)
      .then(r => r.json())
      .then(waterBodies => {
        const colLagoon = new THREE.Color(0x214d5e);
        const colDeep = new THREE.Color(0x183a48);
        const colShore = new THREE.Color(0x2b5e68);

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

              const sw = randomSwarmOrigin(wx, wy, wz);
              pTarget.push(wx, wy, wz);
              pSwarm.push(sw.x, sw.y, sw.z);
              
              const c = (s % 2 === 0) ? colLagoon : colDeep;
              pColor.push(c.r, c.g, c.b);
              pSize.push(1.6);
              pPhase.push(Math.random() * 10);
              pCat.push(0.0); // 0 = agua
            }
          });

          for (let i = 0; i < sPts.length; i++) {
            const p = sPts[i];
            const sw = randomSwarmOrigin(p.x, 0.3, p.z);
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
        const colForest = new THREE.Color(0x234d34);
        const colMoss = new THREE.Color(0x3b5a3e);
        const colOlive = new THREE.Color(0x52795d);
        const colSauco = new THREE.Color(0x6c5870);
        const colCapuli = new THREE.Color(0x7e5a6a);
        const colTrunk = new THREE.Color(0x4a3b32);

        trees.forEach((t, i) => {
          const [x, y, hMeters, especieStr] = t;
          const p = toScene(x, y);
          const h = Math.max(0.7, (hMeters || 8) * SCALE);

          let folCol = colForest;
          if (especieStr && especieStr.includes("Sauco")) folCol = colSauco;
          else if (especieStr && especieStr.includes("capuli")) folCol = colCapuli;
          else if (i % 3 === 0) folCol = colMoss;
          else if (i % 3 === 1) folCol = colOlive;

          const crownY = h * 0.85;
          const swCrown = randomSwarmOrigin(p.x, crownY, p.z);
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

            const swSub = randomSwarmOrigin(sx, sy, sz);
            pTarget.push(sx, sy, sz);
            pSwarm.push(swSub.x, swSub.y, swSub.z);
            pColor.push(folCol.r * 1.05, folCol.g * 1.05, folCol.b * 1.05);
            pSize.push(1.5);
            pPhase.push(i + k * 1.5);
            pCat.push(1.0);
          }

          const swBase = randomSwarmOrigin(p.x, 0.1, p.z);
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
        const colAsphalt = new THREE.Color(0x32373c);
        const colAvenue = new THREE.Color(0x4a555c);

        edges.forEach(([kind, pts], edgeIdx) => {
          const isMajor = (edgeIdx % 4 === 0);
          const c = isMajor ? colAvenue : colAsphalt;

          for (let i = 0; i < pts.length - 1; i++) {
            const a = toScene(pts[i][0], pts[i][1]);
            const sw = randomSwarmOrigin(a.x, 0.08, a.z);
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
        const colStone = new THREE.Color(0xa89f8c);
        const colTerracotta = new THREE.Color(0x7a4d3b);
        const colSlate = new THREE.Color(0x4a525a);

        buildings.forEach((b, idx) => {
          const pts = b.pts.map(p => toScene(p[0], p[1]));
          const h = Math.max(1.4, (b.h || 6) * SCALE);
          if (pts.length < 4) return;

          const bldgCol = (idx % 3 === 0) ? colStone : (idx % 3 === 1 ? colTerracotta : colSlate);

          for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i];
            
            // Techo
            const swTop = randomSwarmOrigin(a.x, h, a.z);
            pTarget.push(a.x, h, a.z);
            pSwarm.push(swTop.x, swTop.y, swTop.z);
            pColor.push(bldgCol.r * 1.1, bldgCol.g * 1.1, bldgCol.b * 1.1);
            pSize.push(1.6);
            pPhase.push(idx * 0.2);
            pCat.push(2.0);

            // Altura media
            if (h > 2.2) {
              const midH = h * 0.5;
              const swMid = randomSwarmOrigin(a.x, midH, a.z);
              pTarget.push(a.x, midH, a.z);
              pSwarm.push(swMid.x, swMid.y, swMid.z);
              pColor.push(bldgCol.r, bldgCol.g, bldgCol.b);
              pSize.push(1.3);
              pPhase.push(idx * 0.3);
              pCat.push(2.0);
            }

            // Base
            const swBase = randomSwarmOrigin(a.x, 0.05, a.z);
            pTarget.push(a.x, 0.05, a.z);
            pSwarm.push(swBase.x, swBase.y, swBase.z);
            pColor.push(bldgCol.r * 0.85, bldgCol.g * 0.85, bldgCol.b * 0.85);
            pSize.push(1.1);
            pPhase.push(idx * 0.1);
            pCat.push(2.0);
          }
        });

        // 3,500 partículas de fondo periférico para llenar la pantalla completa sin bordes negros
        const colTerrain = new THREE.Color(0x1a2e24);
        for (let s = 0; s < 3500; s++) {
          const rad = 250 + Math.random() * 850;
          const ang = Math.random() * Math.PI * 2;
          const gx = Math.cos(ang) * rad;
          const gz = Math.sin(ang) * rad;
          const gy = 0.02 + Math.random() * 0.2;

          const sw = randomSwarmOrigin(gx, gy, gz);
          pTarget.push(gx, gy, gz);
          pSwarm.push(sw.x, sw.y, sw.z);
          pColor.push(colTerrain.r, colTerrain.g, colTerrain.b);
          pSize.push(1.1);
          pPhase.push(s * 0.5);
          pCat.push(4.0);
        }

        rebuildTerritoryParticles();
      })
      .catch(err => console.warn("Error edificios:", err));
  }

  // Inicialización de datos
  Promise.all([loadWater(), loadTrees(), loadRoads()]).then(() => {
    loadBuildings();
    setTimeout(() => {
      if (loadingVeil) loadingVeil.classList.add("hide");
    }, 300);
  });

  // =====================================================================
  // 4. METAMORFOSIS ANIMADA: ENJAMBRE <-> TERRITORIO (GSAP)
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
      btnActionText.textContent = isTerritory ? "RECONSTRUIR ENJAMBRE" : "MATERIALIZAR";
    }
    if (labelSwarm) labelSwarm.classList.toggle("active", targetMorph < 0.2);
    if (labelTerritory) labelTerritory.classList.toggle("active", targetMorph > 0.8);

    if (stageLabel) {
      stageLabel.textContent = isTerritory ? "Territorio 3D de Kennedy" : "Enjambre de 500 Nodos Bióticos";
    }

    if (swarmIntroBox) {
      swarmIntroBox.classList.toggle("fade-out", targetMorph > 0.15);
    }
    if (waypointsBar) {
      waypointsBar.classList.toggle("show", targetMorph > 0.6);
    }

    if (soundActive && typeof triggerHarmonicChime === "function") {
      triggerHarmonicChime(targetMorph);
    }
  }

  // Transición Cinemática hacia Territorio o hacia Enjambre
  function animateToStage(dest) {
    if (!window.gsap) {
      setMorphValue(dest);
      return;
    }

    const startPos = camera.position.clone();
    const endPos = (dest === 1.0) ? territoryCamPos : swarmCamPos;
    const endTarget = (dest === 1.0) ? territoryTarget : swarmTarget;

    gsap.to({ val: currentMorph }, {
      val: dest,
      duration: 3.2,
      ease: "power3.inOut",
      onUpdate: function() {
        setMorphValue(this.targets()[0].val, true);
      }
    });

    gsap.to(camera.position, {
      x: endPos.x, y: endPos.y, z: endPos.z,
      duration: 3.2,
      ease: "power3.inOut"
    });

    gsap.to(controls.target, {
      x: endTarget.x, y: endTarget.y, z: endTarget.z,
      duration: 3.2,
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
  // 5. VUELO CINEMATOGRÁFICO & WAYPOINTS
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
      triggerHarmonicChime(0.6);
    }
  }

  document.querySelectorAll("[data-waypoint]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-waypoint]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      flyToWaypoint(btn.dataset.waypoint);
    });
  });

  // Onda interactiva expansiva al hacer clic
  const raycaster = new THREE.Raycaster();
  const mouseVec = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  window.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".top-bar") || e.target.closest(".bottom-experience-bar") || e.target.closest(".waypoints-bar") || e.target.closest("#swarmIntroBox")) return;

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
  // 6. PAISAJE SONORO GENERATIVO (Web Audio API)
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
  // 7. LOOP DE RENDERIZADO GPU (60-120 FPS FLUIDO)
  // =====================================================================
  const clock = new THREE.Clock();

  function render() {
    requestAnimationFrame(render);

    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    particleUniforms.uRippleTime.value += delta;

    // Suavizado lerp de morphing
    currentMorph += (targetMorph - currentMorph) * (delta * 3.8);
    particleUniforms.uMorphProgress.value = currentMorph;
    particleUniforms.uTime.value = elapsed;

    // Actualización de la física del enjambre de 500 esferas
    updateBioticSwarm(elapsed, currentMorph);

    // Cinemática de Vuelo Continuo ("Modo Video")
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
      sceneRoot.rotation.y = mouseX * 0.03;
      sceneRoot.rotation.x = mouseY * 0.015;
    }

    controls.update();
    renderer.render(scene, camera);
  }

  render();
})();
