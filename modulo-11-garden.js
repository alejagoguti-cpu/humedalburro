// =====================================================================
// Axonometría Molecular 3D — Kennedy & Humedal El Burro
// GPU-Accelerated Molecular Point Cloud & 3D Architecture
// Inspired by Penderecki's Garden (pendereckisgarden.pl)
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
  const loadingScreen = document.getElementById("loadingScreen");
  const progressEl = document.getElementById("loadingProgress");
  const statNodesEl = document.getElementById("statNodes");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04070d);
  scene.fog = new THREE.FogExp2(0x04070d, 0.0016);

  const sceneRoot = new THREE.Group();
  scene.add(sceneRoot);

  const fov = 45;
  const aspect = window.innerWidth / window.innerHeight;
  const camera = new THREE.PerspectiveCamera(fov, aspect, 1, 8000);
  
  // Posición axonométrica perfecta
  const initialCamPos = new THREE.Vector3(220, 380, 440);
  const initialTarget = new THREE.Vector3(0, 0, 0);
  camera.position.copy(initialCamPos);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.screenSpacePanning = true;
  controls.maxDistance = 3500;
  controls.minDistance = 20;
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
  const ambientLight = new THREE.AmbientLight(0xdcf4ff, 0.75);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0x00f0ff, 1.4);
  sunLight.position.set(350, 650, 450);
  scene.add(sunLight);

  const rimLight = new THREE.DirectionalLight(0x10b981, 0.9);
  rimLight.position.set(-450, 350, -350);
  scene.add(rimLight);

  // Base Grid Holográfico
  function createHolographicGrid() {
    const gridHelper = new THREE.GridHelper(1400, 70, 0x00f0ff, 0x112233);
    gridHelper.position.y = -0.5;
    gridHelper.material.opacity = 0.28;
    gridHelper.material.transparent = true;
    sceneRoot.add(gridHelper);

    const discGeo = new THREE.RingGeometry(20, 750, 64);
    const discMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.035,
      side: THREE.DoubleSide
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = -0.6;
    sceneRoot.add(disc);
  }
  createHolographicGrid();

  // =====================================================================
  // GPU GLSL SHADER DE PARTÍCULAS MOLECULARES
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
    
    void main() {
      vColor = aColor;
      vCategory = aCategory;
      
      float t = uExplosion;
      float ease = t * t * (3.0 - 2.0 * t);
      
      // Vórtice de explosión en 3D
      vec3 swirl = vec3(
        sin(uTime * 0.8 + aPhase * 3.14) * 14.0 * t,
        cos(uTime * 0.7 + aPhase * 2.0) * 16.0 * t + sin(uTime + position.x * 0.05) * 8.0 * t,
        sin(uTime * 0.9 + aPhase * 4.2) * 14.0 * t
      );
      
      // Ondulación idle en estado ensamblado
      vec3 idleWave = vec3(0.0);
      if (aCategory < 0.5) {
        // Ondas fluidas en el agua
        idleWave.y = sin(uTime * 3.0 + position.x * 0.2 + position.z * 0.2) * 0.65 * (1.0 - t);
      } else if (aCategory < 1.5) {
        // Brisa en copas de árboles
        idleWave.x = sin(uTime * 2.0 + aPhase * 6.0) * 0.45 * (1.0 - t);
        idleWave.z = cos(uTime * 1.8 + aPhase * 6.0) * 0.45 * (1.0 - t);
      }
      
      vec3 finalPos = mix(position + idleWave, aExplodePos + swirl, ease);
      
      vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      // Tamaño de partículas adaptativo
      float distFactor = clamp(450.0 / -mvPosition.z, 0.4, 3.5);
      gl_PointSize = aSize * uSizeMultiplier * uPixelRatio * distFactor;
      
      vAlpha = mix(0.95, 0.65, ease);
    }
  `;

  const fragmentShader = `
    uniform vec3 uPaletteTint;
    varying vec3 vColor;
    varying float vCategory;
    varying float vAlpha;
    
    void main() {
      vec2 p = gl_PointCoord - vec2(0.5);
      float r = length(p);
      if (r > 0.5) discard;
      
      float core = smoothstep(0.5, 0.05, r);
      float rim = smoothstep(0.48, 0.35, r) * smoothstep(0.18, 0.36, r);
      float glow = pow(core, 2.0);
      
      vec3 baseCol = vColor * uPaletteTint;
      vec3 finalColor = mix(baseCol, vec3(1.0, 1.0, 1.0), pow(core, 4.0) * 0.75) + vec3(rim * 0.28);
      
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

  // Buffers dinámicos de partículas
  let allTargetPos = [];
  let allExplodePos = [];
  let allColors = [];
  let allSizes = [];
  let allPhases = [];
  let allCategories = [];

  let particlePointsMesh = null;

  // Grupos holográficos para edificios, agua y vías
  const holoBuildingsGroup = new THREE.Group();
  sceneRoot.add(holoBuildingsGroup);

  const holoWaterGroup = new THREE.Group();
  sceneRoot.add(holoWaterGroup);

  const holoRoadsGroup = new THREE.Group();
  sceneRoot.add(holoRoadsGroup);

  let buildingHoloMat = null;
  let waterHoloMat = null;
  let roadHoloMat = null;

  function randomExplosionVector(bx, by, bz, radiusMin = 160, radiusMax = 460) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = radiusMin + Math.pow(Math.random(), 0.6) * (radiusMax - radiusMin);
    
    const ex = bx * 0.2 + r * Math.sin(phi) * Math.cos(theta);
    const ey = Math.max(15, by * 0.2 + r * Math.abs(Math.cos(phi)) * 0.85 + Math.random() * 120);
    const ez = bz * 0.2 + r * Math.sin(phi) * Math.sin(theta);
    return { x: ex, y: ey, z: ez };
  }

  // Actualiza o crea el sistema de partículas con los datos acumulados
  function rebuildParticleSystem() {
    if (particlePointsMesh) {
      sceneRoot.remove(particlePointsMesh);
      if (particlePointsMesh.geometry) particlePointsMesh.geometry.dispose();
    }

    const count = allTargetPos.length / 3;
    if (count === 0) return;

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.Float32BufferAttribute(allTargetPos, 3));
    particleGeo.setAttribute("aExplodePos", new THREE.Float32BufferAttribute(allExplodePos, 3));
    particleGeo.setAttribute("aColor", new THREE.Float32BufferAttribute(allColors, 3));
    particleGeo.setAttribute("aSize", new THREE.Float32BufferAttribute(allSizes, 1));
    particleGeo.setAttribute("aPhase", new THREE.Float32BufferAttribute(allPhases, 1));
    particleGeo.setAttribute("aCategory", new THREE.Float32BufferAttribute(allCategories, 1));

    particlePointsMesh = new THREE.Points(particleGeo, particleShaderMat);
    sceneRoot.add(particlePointsMesh);

    if (statNodesEl) statNodesEl.textContent = count.toLocaleString();
  }

  // =====================================================================
  // 1. CARGA DE AGUA (Humedal El Burro)
  // =====================================================================
  function loadWater() {
    return fetch(WATER_URL)
      .then(r => r.json())
      .then(waterBodies => {
        const waterPositions = [];
        const waterNormals = [];
        const colWaterAtom = new THREE.Color(0x00f0ff);

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

            // Muestreo de átomos en la superficie del agua
            const r1 = Math.random(), r2 = Math.random();
            const sq1 = Math.sqrt(r1);
            const wx = (1 - sq1) * pa.x + sq1 * (1 - r2) * pb.x + sq1 * r2 * pc.x;
            const wz = (1 - sq1) * pa.z + sq1 * (1 - r2) * pb.z + sq1 * r2 * pc.z;
            const wy = 0.35 + Math.random() * 0.4;

            const ex = randomExplosionVector(wx, wy, wz, 120, 360);
            allTargetPos.push(wx, wy, wz);
            allExplodePos.push(ex.x, ex.y, ex.z);
            allColors.push(colWaterAtom.r, colWaterAtom.g, colWaterAtom.b);
            allSizes.push(4.2);
            allPhases.push(Math.random() * 10);
            allCategories.push(0.0);
          });

          for (let i = 0; i < scenePts.length; i++) {
            const p = scenePts[i];
            const ex = randomExplosionVector(p.x, 0.3, p.z, 140, 380);
            allTargetPos.push(p.x, 0.3, p.z);
            allExplodePos.push(ex.x, ex.y, ex.z);
            allColors.push(0.0, 1.0, 0.85);
            allSizes.push(4.6);
            allPhases.push(i * 0.4);
            allCategories.push(0.0);
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
        rebuildParticleSystem();
      })
      .catch(err => console.warn("Error cargando agua:", err));
  }

  // =====================================================================
  // 2. CARGA DE RED VIAL
  // =====================================================================
  function loadRoads() {
    return fetch(NET_URL)
      .then(r => r.json())
      .then(edges => {
        const roadLinePos = [];
        const colRoadNode = new THREE.Color(0xf59e0b);

        edges.forEach(([kind, pts], edgeIdx) => {
          for (let i = 0; i < pts.length - 1; i++) {
            const a = toScene(pts[i][0], pts[i][1]);
            const b = toScene(pts[i + 1][0], pts[i + 1][1]);
            roadLinePos.push(a.x, 0.05, a.z, b.x, 0.05, b.z);

            if (i === 0 && edgeIdx % 3 === 0) {
              const ex = randomExplosionVector(a.x, 0.08, a.z, 120, 350);
              allTargetPos.push(a.x, 0.08, a.z);
              allExplodePos.push(ex.x, ex.y, ex.z);
              allColors.push(colRoadNode.r, colRoadNode.g, colRoadNode.b);
              allSizes.push(3.0);
              allPhases.push(edgeIdx * 0.5);
              allCategories.push(3.0);
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
        rebuildParticleSystem();
      })
      .catch(err => console.warn("Error cargando vías:", err));
  }

  // =====================================================================
  // 3. CARGA DE ÁRBOLES
  // =====================================================================
  function loadTrees() {
    return fetch(TREES_URL)
      .then(r => r.json())
      .then(trees => {
        const colTrunk = new THREE.Color(0x78350f);
        const colSauco = new THREE.Color(0xa855f7);
        const colCapuli = new THREE.Color(0xec4899);
        const colUrapan = new THREE.Color(0x10b981);
        const colNormal = new THREE.Color(0x22c55e);

        trees.forEach((t, i) => {
          const [x, y, hMeters, especieStr] = t;
          const p = toScene(x, y);
          const h = Math.max(0.6, (hMeters || 8) * SCALE);

          let folCol = colNormal;
          if (especieStr && especieStr.includes("Sauco")) folCol = colSauco;
          else if (especieStr && especieStr.includes("capuli")) folCol = colCapuli;
          else if (especieStr && (especieStr.includes("Urap") || especieStr.includes("Fresno"))) folCol = colUrapan;

          const crownY = h * 0.85;
          const exCrown = randomExplosionVector(p.x, crownY, p.z, 150, 420);
          allTargetPos.push(p.x, crownY, p.z);
          allExplodePos.push(exCrown.x, exCrown.y, exCrown.z);
          allColors.push(folCol.r, folCol.g, folCol.b);
          allSizes.push(5.2);
          allPhases.push(i * 0.2);
          allCategories.push(1.0);

          const subNodes = 3;
          const rad = h * 0.45;
          for (let k = 0; k < subNodes; k++) {
            const ang = (k / subNodes) * Math.PI * 2 + (i % 5);
            const sx = p.x + Math.cos(ang) * rad;
            const sz = p.z + Math.sin(ang) * rad;
            const sy = crownY + (k % 2 === 0 ? 0.3 : -0.2);

            const exSub = randomExplosionVector(sx, sy, sz, 160, 450);
            allTargetPos.push(sx, sy, sz);
            allExplodePos.push(exSub.x, exSub.y, exSub.z);
            allColors.push(folCol.r * 1.1, folCol.g * 1.1, folCol.b * 1.1);
            allSizes.push(3.8);
            allPhases.push(i + k * 1.5);
            allCategories.push(1.0);
          }

          const exBase = randomExplosionVector(p.x, 0.1, p.z, 100, 300);
          allTargetPos.push(p.x, 0.1, p.z);
          allExplodePos.push(exBase.x, exBase.y, exBase.z);
          allColors.push(colTrunk.r, colTrunk.g, colTrunk.b);
          allSizes.push(2.5);
          allPhases.push(i * 0.1);
          allCategories.push(1.0);
        });

        rebuildParticleSystem();
      })
      .catch(err => console.warn("Error cargando árboles:", err));
  }

  // =====================================================================
  // 4. CARGA DE EDIFICIOS 3D (Carga progresiva)
  // =====================================================================
  function loadBuildings() {
    return fetch(BUILDINGS_URL)
      .then(r => r.json())
      .then(buildings => {
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

          for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i], cSeg = pts[i + 1];
            const dx = cSeg.x - a.x, dz = cSeg.z - a.z;
            const len = Math.hypot(dx, dz) || 0.001;
            const nx = dz / len, nz = -dx / len;

            bldgPositions.push(
              a.x, 0, a.z,  cSeg.x, 0, cSeg.z,  cSeg.x, h, cSeg.z,
              a.x, 0, a.z,  cSeg.x, h, cSeg.z,  a.x, h, a.z
            );
            for (let k = 0; k < 6; k++) {
              bldgNormals.push(nx, 0, nz);
              bldgColors.push(colGlass.r, colGlass.g, colGlass.b);
            }

            bldgEdgePos.push(a.x, h, a.z, cSeg.x, h, cSeg.z);

            const exA = randomExplosionVector(a.x, h, a.z);
            allTargetPos.push(a.x, h, a.z);
            allExplodePos.push(exA.x, exA.y, exA.z);
            allColors.push(colNodeRoof.r, colNodeRoof.g, colNodeRoof.b);
            allSizes.push(3.6);
            allPhases.push(Math.random() * 10);
            allCategories.push(2.0);

            if (h > 2.0 && idx % 2 === 0) {
              const midH = h * 0.5;
              const exMid = randomExplosionVector(a.x, midH, a.z);
              allTargetPos.push(a.x, midH, a.z);
              allExplodePos.push(exMid.x, exMid.y, exMid.z);
              allColors.push(colNodeBldg.r, colNodeBldg.g, colNodeBldg.b);
              allSizes.push(2.8);
              allPhases.push(Math.random() * 10);
              allCategories.push(2.0);
            }
          }

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

        const edgeGeo = new THREE.BufferGeometry();
        edgeGeo.setAttribute("position", new THREE.Float32BufferAttribute(bldgEdgePos, 3));
        const edgeMat = new THREE.LineBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.45
        });
        const edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);
        holoBuildingsGroup.add(edgeLines);

        rebuildParticleSystem();
      })
      .catch(err => console.warn("Error cargando edificios:", err));
  }

  // Ejecución progresiva en paralelo (La pantalla carga de inmediato)
  Promise.all([loadWater(), loadRoads(), loadTrees()]).then(() => {
    if (progressEl) progressEl.textContent = "Cargando edificios 3D...";
    setTimeout(() => {
      if (loadingScreen) loadingScreen.classList.add("hide");
    }, 400);
    loadBuildings().then(() => {
      if (progressEl) progressEl.textContent = "Modelo 100% cargado";
    });
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
        animateCameraTo(new THREE.Vector3(220, 380, 440), new THREE.Vector3(0, 0, 0));
      } else if (v === "burro") {
        animateCameraTo(new THREE.Vector3(210, 180, 140), new THREE.Vector3(210, 0, -10));
      } else if (v === "orbit") {
        animateCameraTo(new THREE.Vector3(450, 220, -320), new THREE.Vector3(0, 20, 0));
      }
    });
  });

  // =====================================================================
  // AUDIO GENERATIVO
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
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99];
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
  // LOOP DE RENDERIZADO GPU (60-120 FPS)
  // =====================================================================
  const clock = new THREE.Clock();
  let frameCount = 0, lastFpsTime = performance.now();
  const fpsCounterEl = document.getElementById("fpsCounter");

  function renderLoop() {
    requestAnimationFrame(renderLoop);

    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    currentExplosion += (explosionTarget - currentExplosion) * (delta * 4.5);
    particleShaderMat.uniforms.uExplosion.value = currentExplosion;
    particleShaderMat.uniforms.uTime.value = elapsed;

    const solidOpacity = Math.max(0.0, 1.0 - currentExplosion * 1.4);
    if (buildingHoloMat) buildingHoloMat.opacity = 0.72 * solidOpacity;
    if (waterHoloMat) waterHoloMat.opacity = 0.78 * solidOpacity;
    if (roadHoloMat) roadHoloMat.opacity = 0.65 * solidOpacity;

    controls.update();
    renderer.render(scene, camera);

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
