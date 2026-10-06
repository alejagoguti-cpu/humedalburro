// =====================================================================
// El Jardín de las Aguas — Nube de Partículas 3D (Inspirado en Penderecki's Garden)
// Carga los datos reales de SUMO y GeoJSON de Kennedy y los representa
// como un universo cinemático de partículas que se desintegra y ensambla.
// =====================================================================
(() => {
  const NET_URL = "./assets/kennedy_net.json";
  const BUILDINGS_URL = "./assets/kennedy_buildings.json";
  const TREES_URL = "./assets/kennedy_trees_real.json";
  const WATER_URL = "./assets/kennedy_water_bodies.json";
  const MANZANAS_URL = "./assets/kennedy_manzanas.json";
  const SCALE = 1 / 10;

  // ---- Setup de Escena, Cámara y Renderer ----
  const container = document.getElementById("canvasContainer");
  const canvas = document.getElementById("particleCanvas");
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06090e);
  scene.fog = new THREE.FogExp2(0x06090e, 0.00085);

  const sceneRoot = new THREE.Group();
  scene.add(sceneRoot);

  const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 5, 3500);
  const perspCamera = new THREE.PerspectiveCamera(50, 1, 1, 5000);
  let activeCamera = orthoCamera;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(container.clientWidth, container.clientHeight, false);

  const controls = new THREE.OrbitControls(activeCamera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.screenSpacePanning = true;
  controls.minZoom = 0.2;
  controls.maxZoom = 25;
  controls.enableRotate = false; // Por defecto vista axonométrica fija
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.PAN,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.ROTATE
  };

  let netCenter = { x: 5341.33, y: 3161.9 };
  let viewSize = 240;

  function toScene(x, y) {
    return { x: (x - netCenter.x) * SCALE, z: -(y - netCenter.y) * SCALE };
  }

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    if (activeCamera.isOrthographicCamera) {
      activeCamera.left = -viewSize * aspect;
      activeCamera.right = viewSize * aspect;
      activeCamera.top = viewSize;
      activeCamera.bottom = -viewSize;
    } else {
      activeCamera.aspect = aspect;
    }
    activeCamera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);

  // ---- Estructura de Partículas ----
  let particleCount = 0;
  let particleGeometry = null;
  let particleSystem = null;
  let particleMaterial = null;

  // Arreglos maestros de partículas
  const targetPositions = [];    // Posición final axonométrica (x, y, z)
  const explodedPositions = [];  // Posición dispersa en el cosmos (x, y, z)
  const currentPositions = [];   // Posición actual interpolada (x, y, z)
  const particleColors = [];     // Color RGB actual
  const originalColors = [];     // Color RGB base
  const particlePhases = [];     // Fase aleatoria para movimiento armónico
  const particleSpeeds = [];     // Velocidad individual de oscilación
  const particleTypes = [];      // 'water' | 'tree' | 'building' | 'road' | 'spore'

  // Parámetros dinámicos
  let explosionFactor = 1.0;     // 0.0 = Concretado en Axo, 1.0 = Totalmente explotado
  let targetExplosion = 0.0;     // Hacia dónde interpola
  let pointBaseSize = 2.2;
  let windIntensity = 1.0;
  let currentTheme = "penderecki";

  // Textura circular con difuminado suave para los puntos de luz
  function createParticleTexture() {
    const pCanvas = document.createElement("canvas");
    pCanvas.width = 64; pCanvas.height = 64;
    const ctx = pCanvas.getContext("2d");
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
    grad.addColorStop(0.25, "rgba(255, 255, 255, 0.85)");
    grad.addColorStop(0.6, "rgba(255, 255, 255, 0.25)");
    grad.addColorStop(1, "rgba(255, 255, 255, 0.0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(32, 32, 32, 0, Math.PI * 2);
    ctx.fill();
    return new THREE.CanvasTexture(pCanvas);
  }

  const particleTexture = createParticleTexture();

  // Función para registrar una partícula con su dispersión cósmica
  function addParticle(tx, ty, tz, r, g, b, type) {
    targetPositions.push(tx, ty, tz);
    
    // Dispersión radial esférica + remolino vortical tipo Penderecki
    const angle = Math.random() * Math.PI * 2;
    const elevation = (Math.random() - 0.5) * Math.PI;
    const dist = 120 + Math.random() * 320;
    const ex = tx + Math.cos(angle) * Math.cos(elevation) * dist + (Math.random() - 0.5) * 80;
    const ey = ty + Math.sin(elevation) * dist * 0.75 + 60 + Math.random() * 140;
    const ez = tz + Math.sin(angle) * Math.cos(elevation) * dist + (Math.random() - 0.5) * 80;
    
    explodedPositions.push(ex, ey, ez);
    currentPositions.push(ex, ey, ez); // Inicia en posición explotada

    particleColors.push(r, g, b);
    originalColors.push(r, g, b);

    particlePhases.push(Math.random() * Math.PI * 2);
    particleSpeeds.push(0.4 + Math.random() * 0.8);
    particleTypes.push(type);

    particleCount++;
  }

  // ---- Muestreadores de Partículas desde las fuentes de datos ----

  // 1. Muestreo de Cuerpos de Agua (Humedal El Burro, La Vaca, Techo, etc.)
  function sampleWaterBodies(waterBodies) {
    waterBodies.forEach(w => {
      const name = w.nombre || "";
      const isBurro = name.includes("Burro");
      const isVaca = name.includes("Vaca");
      const isTecho = name.includes("Techo");

      const pts = w.pts.map(p => toScene(p[0], p[1]));
      if (pts.length < 3) return;

      const minX = Math.min(...pts.map(p => p.x));
      const maxX = Math.max(...pts.map(p => p.x));
      const minZ = Math.min(...pts.map(p => p.z));
      const maxZ = Math.max(...pts.map(p => p.z));

      const cx = (minX + maxX) / 2;
      const cz = (minZ + maxZ) / 2;
      const maxR = Math.hypot(maxX - minX, maxZ - minZ) / 2 || 1;

      // Densidad de muestreo en grilla
      const step = isBurro ? 1.4 : 2.2;

      function isInsidePoly(px, pz) {
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const xi = pts[i].x, zi = pts[i].z;
          const xj = pts[j].x, zj = pts[j].z;
          const intersect = ((zi > pz) !== (zj > pz)) && (px < (xj - xi) * (pz - zi) / (zj - zi + 1e-9) + xi);
          if (intersect) inside = !inside;
        }
        return inside;
      }

      for (let x = minX; x <= maxX; x += step) {
        for (let z = minZ; z <= maxZ; z += step) {
          const jx = x + (Math.random() - 0.5) * step * 0.65;
          const jz = z + (Math.random() - 0.5) * step * 0.65;
          if (isInsidePoly(jx, jz)) {
            const dist = Math.hypot(jx - cx, jz - cz);
            const t = Math.min(1.0, dist / maxR);
            
            // Gradiente: Centro azul acuático (#00f0ff / #0284c7) -> Orilla verde esmeralda (#10b981 / #064e3b)
            const r = 0.02 + 0.06 * t;
            const g = 0.75 - 0.35 * (1 - t);
            const b = 0.98 - 0.65 * t;

            addParticle(jx, 0.04, jz, r, g, b, "water");
          }
        }
      }

      // Partículas perimetrales densas para la orilla brillante
      for (let i = 0; i < pts.length; i++) {
        const p1 = pts[i], p2 = pts[(i + 1) % pts.length];
        const segLen = Math.hypot(p2.x - p1.x, p2.z - p1.z);
        const subSteps = Math.max(1, Math.round(segLen / 1.0));
        for (let s = 0; s < subSteps; s++) {
          const frac = s / subSteps;
          const px = p1.x + (p2.x - p1.x) * frac;
          const pz = p1.z + (p2.z - p1.z) * frac;
          addParticle(px, 0.05, pz, 0.05, 0.95, 0.92, "water");
        }
      }
    });
  }

  // 2. Muestreo de Árboles (Jardín Botánico de Kennedy)
  function sampleTrees(trees) {
    trees.forEach(t => {
      const p = toScene(t.x, t.y);
      const h = (t.altura || 6.5) * 0.55;
      const canopyR = (t.diametro || 4.5) * 0.45;

      // Tronco vertical
      const trunkPts = 4;
      for (let i = 0; i < trunkPts; i++) {
        const y = (i / trunkPts) * (h * 0.45);
        addParticle(p.x, y, p.z, 0.45, 0.30, 0.18, "tree");
      }

      // Copa esférica / cúpula de partículas botánicas
      const canopyPts = Math.min(28, Math.max(12, Math.round(canopyR * 6)));
      for (let i = 0; i < canopyPts; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 0.5; // hemisferio superior
        const r = canopyR * (0.6 + Math.random() * 0.4);
        const px = p.x + Math.sin(phi) * Math.cos(theta) * r;
        const py = h * 0.45 + Math.cos(phi) * r * 1.1;
        const pz = p.z + Math.sin(phi) * Math.sin(theta) * r;

        // Tono verde botánico variado (verde esmeralda, lima, jade)
        const isHighlight = Math.random() > 0.75;
        const cr = isHighlight ? 0.35 : 0.08;
        const cg = isHighlight ? 0.92 : 0.75;
        const cb = isHighlight ? 0.45 : 0.25;

        addParticle(px, py, pz, cr, cg, cb, "tree");
      }
    });
  }

  // 3. Muestreo de Edificaciones (Volúmenes y Techos)
  function sampleBuildings(buildings) {
    buildings.forEach(b => {
      if (!b.pts || b.pts.length < 3) return;
      const pts = b.pts.map(p => toScene(p[0], p[1]));
      const h = (b.h || 4.5) * 0.42;

      // Color arquitectónico (terracota / cálido / platino)
      const baseR = 0.88, baseG = 0.55, baseB = 0.42;

      // Muestreo de las aristas verticales de la fachada
      pts.forEach(pt => {
        const vSteps = Math.max(2, Math.round(h / 1.8));
        for (let s = 0; s <= vSteps; s++) {
          const y = (s / vSteps) * h;
          addParticle(pt.x, y, pt.z, baseR * 0.85, baseG * 0.85, baseB * 0.85, "building");
        }
      });

      // Muestreo del contorno superior del techo
      for (let i = 0; i < pts.length; i++) {
        const p1 = pts[i], p2 = pts[(i + 1) % pts.length];
        const segLen = Math.hypot(p2.x - p1.x, p2.z - p1.z);
        const subSteps = Math.max(1, Math.round(segLen / 2.2));
        for (let s = 0; s < subSteps; s++) {
          const frac = s / subSteps;
          const px = p1.x + (p2.x - p1.x) * frac;
          const pz = p1.z + (p2.z - p1.z) * frac;
          addParticle(px, h, pz, baseR, baseG, baseB, "building");
        }
      }

      // Punto central en el techo
      const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
      const cz = pts.reduce((s, p) => s + p.z, 0) / pts.length;
      addParticle(cx, h + 0.1, cz, 0.98, 0.88, 0.72, "building");
    });
  }

  // 4. Muestreo de Red Vial (Líneas y Canales de flujo)
  function sampleRoads(edges) {
    edges.forEach(([kind, rawPts]) => {
      if (!rawPts || rawPts.length < 2) return;
      const pts = rawPts.map(p => toScene(p[0], p[1]));
      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i], p2 = pts[i + 1];
        const segLen = Math.hypot(p2.x - p1.x, p2.z - p1.z);
        const subSteps = Math.max(1, Math.round(segLen / 3.5));
        for (let s = 0; s < subSteps; s++) {
          const frac = s / subSteps;
          const px = p1.x + (p2.x - p1.x) * frac;
          const pz = p1.z + (p2.z - p1.z) * frac;
          addParticle(px, 0.02, pz, 0.42, 0.52, 0.65, "road");
        }
      }
    });
  }

  // 5. Esporas y Partículas Ambientales Flotantes
  function sampleAmbientSpores(count = 1600) {
    for (let i = 0; i < count; i++) {
      const tx = (Math.random() - 0.5) * 700 + 160;
      const ty = 5 + Math.random() * 95;
      const tz = (Math.random() - 0.5) * 700 - 20;
      const r = 0.5 + Math.random() * 0.5;
      const g = 0.8 + Math.random() * 0.2;
      const b = 0.7 + Math.random() * 0.3;
      addParticle(tx, ty, tz, r, g, b, "spore");
    }
  }

  // Construcción del BufferGeometry global de Three.js
  function buildParticleMesh() {
    particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.Float32BufferAttribute(currentPositions, 3));
    particleGeometry.setAttribute("color", new THREE.Float32BufferAttribute(particleColors, 3));

    particleMaterial = new THREE.PointsMaterial({
      size: pointBaseSize,
      vertexColors: true,
      map: particleTexture,
      transparent: true,
      opacity: 0.90,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    sceneRoot.add(particleSystem);

    const countLabel = document.getElementById("statParticleCount");
    if (countLabel) countLabel.textContent = particleCount.toLocaleString();

    const loadOverlay = document.getElementById("loadingOverlay");
    if (loadOverlay) loadOverlay.classList.add("hide");

    // Intro cinematográfico: empieza 100% disperso y se ensambla suavemente
    setTimeout(() => {
      targetExplosion = 0.0;
    }, 400);
  }

  // ---- Carga de Datos Asíncrona ----
  const progressText = document.getElementById("loadingProgressText");
  function setProgress(msg) { if (progressText) progressText.textContent = msg; }

  setProgress("Cargando red territorial...");
  fetch(NET_URL)
    .then(r => r.json())
    .then(netData => {
      netCenter = { x: (netData.bbox[0] + netData.bbox[2]) / 2, y: (netData.bbox[1] + netData.bbox[3]) / 2 };
      sampleRoads(netData.edges);

      setProgress("Cargando cuerpos de agua y humedales...");
      return fetch(WATER_URL);
    })
    .then(r => r.json())
    .then(waterData => {
      sampleWaterBodies(waterData);

      setProgress("Cargando arboleda y vegetación...");
      return fetch(TREES_URL);
    })
    .then(r => r.json())
    .then(treesData => {
      sampleTrees(treesData);

      setProgress("Cargando arquitectura de Kennedy...");
      return fetch(BUILDINGS_URL);
    })
    .then(r => r.json())
    .then(buildingsData => {
      sampleBuildings(buildingsData);
      sampleAmbientSpores(1800);

      setProgress("Ensamblando constelación de partículas...");
      buildParticleMesh();
    })
    .catch(err => {
      console.error("Error cargando datos de partículas:", err);
      const loadOverlay = document.getElementById("loadingOverlay");
      if (loadOverlay) loadOverlay.classList.add("hide");
    });

  // ---- Vista Axonométrica y Puntos de Vista ----
  function setAxonometricView() {
    activeCamera = orthoCamera;
    controls.object = activeCamera;
    activeCamera.position.set(17.6, 630.7, 713.9);
    controls.target.set(139.2, -124.7, -31.7);
    activeCamera.zoom = 1.30;
    activeCamera.updateProjectionMatrix();
    controls.enableRotate = false;
    controls.update();
  }

  function setOrbitView() {
    activeCamera = perspCamera;
    controls.object = activeCamera;
    activeCamera.position.set(160, 240, 360);
    controls.target.set(180, 10, -20);
    activeCamera.updateProjectionMatrix();
    controls.enableRotate = true;
    controls.update();
  }

  function setBurroFocusView() {
    activeCamera = orthoCamera;
    controls.object = activeCamera;
    activeCamera.position.set(117.2, 580.0, 520.0);
    controls.target.set(195.0, 0.0, -27.0);
    activeCamera.zoom = 2.40;
    activeCamera.updateProjectionMatrix();
    controls.enableRotate = false;
    controls.update();
  }

  function setGardenFocusView() {
    activeCamera = perspCamera;
    controls.object = activeCamera;
    activeCamera.position.set(120, 80, 140);
    controls.target.set(170, 15, 20);
    activeCamera.updateProjectionMatrix();
    controls.enableRotate = true;
    controls.update();
  }

  setAxonometricView();

  // Event Listeners para botones de vista
  const viewBtns = {
    axo: document.getElementById("viewAxoBtn"),
    orbit: document.getElementById("viewOrbitBtn"),
    burro: document.getElementById("viewBurroBtn"),
    garden: document.getElementById("viewGardenBtn")
  };

  function updateActiveViewBtn(activeBtn) {
    Object.values(viewBtns).forEach(b => { if (b) b.classList.remove("active"); });
    if (activeBtn) activeBtn.classList.add("active");
  }

  if (viewBtns.axo) viewBtns.axo.addEventListener("click", () => { setAxonometricView(); updateActiveViewBtn(viewBtns.axo); });
  if (viewBtns.orbit) viewBtns.orbit.addEventListener("click", () => { setOrbitView(); updateActiveViewBtn(viewBtns.orbit); });
  if (viewBtns.burro) viewBtns.burro.addEventListener("click", () => { setBurroFocusView(); updateActiveViewBtn(viewBtns.burro); });
  if (viewBtns.garden) viewBtns.garden.addEventListener("click", () => { setGardenFocusView(); updateActiveViewBtn(viewBtns.garden); });

  // ---- Cambio de Paletas de Color ----
  document.querySelectorAll(".theme-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".theme-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      applyTheme(btn.dataset.theme);
    });
  });

  function applyTheme(theme) {
    currentTheme = theme;
    if (!particleGeometry) return;
    const colAttr = particleGeometry.attributes.color;
    for (let i = 0; i < particleCount; i++) {
      const type = particleTypes[i];
      const i3 = i * 3;
      let r = originalColors[i3], g = originalColors[i3 + 1], b = originalColors[i3 + 2];

      if (theme === "bioluminescent") {
        if (type === "water") { r = 0.0; g = 0.95; b = 1.0; }
        else if (type === "tree") { r = 0.1; g = 1.0; b = 0.55; }
        else if (type === "building") { r = 0.15; g = 0.45; b = 0.85; }
        else if (type === "road") { r = 0.05; g = 0.75; b = 0.95; }
      } else if (theme === "sunset") {
        if (type === "water") { r = 0.95; g = 0.45; b = 0.65; }
        else if (type === "tree") { r = 0.98; g = 0.72; b = 0.15; }
        else if (type === "building") { r = 0.95; g = 0.35; b = 0.25; }
        else if (type === "road") { r = 0.75; g = 0.45; b = 0.55; }
      } else if (theme === "hologram") {
        if (type === "water") { r = 0.95; g = 0.98; b = 1.0; }
        else if (type === "tree") { r = 0.65; g = 0.85; b = 1.0; }
        else if (type === "building") { r = 0.45; g = 0.75; b = 1.0; }
        else if (type === "road") { r = 0.25; g = 0.55; b = 0.85; }
      }

      colAttr.setXYZ(i, r, g, b);
    }
    colAttr.needsUpdate = true;
  }

  // ---- Controles de Explosión y Partículas ----
  const explosionBtn = document.getElementById("explosionTriggerBtn");
  const explosionBtnLabel = document.getElementById("explosionBtnLabel");
  const explosionSlider = document.getElementById("explosionSlider");
  const explosionValBadge = document.getElementById("explosionValBadge");
  const statAssemblePct = document.getElementById("statAssemblePct");

  if (explosionBtn) {
    explosionBtn.addEventListener("click", () => {
      targetExplosion = targetExplosion > 0.5 ? 0.0 : 1.0;
      updateExplosionUI(targetExplosion);
    });
  }

  if (explosionSlider) {
    explosionSlider.addEventListener("input", () => {
      targetExplosion = parseFloat(explosionSlider.value);
      updateExplosionUI(targetExplosion);
    });
  }

  function updateExplosionUI(val) {
    if (explosionSlider) explosionSlider.value = val;
    const pct = Math.round(val * 100);
    if (explosionValBadge) explosionValBadge.textContent = `${pct}%`;
    if (statAssemblePct) statAssemblePct.textContent = `${100 - pct}%`;
    if (explosionBtnLabel) {
      explosionBtnLabel.textContent = val > 0.5 ? "✨ Ensamblar Axonometría" : "💥 Desintegrar en Cosmos";
    }
  }

  const pointSizeSlider = document.getElementById("pointSizeSlider");
  const pointSizeValBadge = document.getElementById("pointSizeValBadge");
  if (pointSizeSlider) {
    pointSizeSlider.addEventListener("input", () => {
      pointBaseSize = parseFloat(pointSizeSlider.value);
      if (pointSizeValBadge) pointSizeValBadge.textContent = pointBaseSize.toFixed(1);
      if (particleMaterial) particleMaterial.size = pointBaseSize;
    });
  }

  const windWaveSlider = document.getElementById("windWaveSlider");
  const windWaveValBadge = document.getElementById("windWaveValBadge");
  if (windWaveSlider) {
    windWaveSlider.addEventListener("input", () => {
      windIntensity = parseFloat(windWaveSlider.value);
      if (windWaveValBadge) windWaveValBadge.textContent = `${windIntensity.toFixed(1)}x`;
    });
  }

  // ---- Interacción del Cursor (Ondas y Repulsión de Partículas) ----
  const raycaster = new THREE.Raycaster();
  const mouseScreen = new THREE.Vector2(-999, -999);
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  let mouseWorldPos = new THREE.Vector3(9999, 9999, 9999);

  window.addEventListener("mousemove", (e) => {
    mouseScreen.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseScreen.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouseScreen, activeCamera);
    raycaster.ray.intersectPlane(groundPlane, mouseWorldPos);
  });

  // ---- Síntesis de Paisaje Sonoro Generativo (Web Audio API) ----
  let audioCtx = null;
  let isAudioPlaying = false;
  let audioMasterGain = null;
  let soundInterval = null;

  const audioBtn = document.getElementById("audioToggleBtn");
  if (audioBtn) {
    audioBtn.addEventListener("click", () => {
      if (!isAudioPlaying) {
        startSoundscape();
        audioBtn.classList.add("playing");
        audioBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i> Silenciar Paisaje';
      } else {
        stopSoundscape();
        audioBtn.classList.remove("playing");
        audioBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i> Activar Sonido';
      }
    });
  }

  function startSoundscape() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    audioCtx = new AudioContext();

    audioMasterGain = audioCtx.createGain();
    audioMasterGain.gain.setValueAtTime(0.01, audioCtx.currentTime);
    audioMasterGain.gain.exponentialRampToValueAtTime(0.22, audioCtx.currentTime + 2.5);
    audioMasterGain.connect(audioCtx.destination);

    // Drone continuo de fondo inspirado en Penderecki
    const droneFreqs = [55, 110, 164.81, 220];
    droneFreqs.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = idx % 2 === 0 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gain.gain.setValueAtTime(0.04 / (idx + 1), audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioMasterGain);
      osc.start();
    });

    // Campanadas botánicas etéreas aleatorias
    const pentatonicScale = [220, 246.94, 293.66, 329.63, 392.00, 440, 493.88, 587.33, 659.25, 783.99];
    soundInterval = setInterval(() => {
      if (!isAudioPlaying || !audioCtx) return;
      const note = pentatonicScale[Math.floor(Math.random() * pentatonicScale.length)];
      const chimeOsc = audioCtx.createOscillator();
      const chimeGain = audioCtx.createGain();

      chimeOsc.type = "sine";
      chimeOsc.frequency.setValueAtTime(note, audioCtx.currentTime);

      chimeGain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 3.2);

      chimeOsc.connect(chimeGain);
      chimeGain.connect(audioMasterGain);

      chimeOsc.start();
      chimeOsc.stop(audioCtx.currentTime + 3.5);
    }, 1400);

    isAudioPlaying = true;
  }

  function stopSoundscape() {
    if (audioMasterGain && audioCtx) {
      audioMasterGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.8);
      setTimeout(() => {
        if (audioCtx) { audioCtx.close(); audioCtx = null; }
      }, 900);
    }
    if (soundInterval) clearInterval(soundInterval);
    isAudioPlaying = false;
  }

  // ---- Loop Principal de Animación y Física de Partículas ----
  let clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(0.1, clock.getDelta());
    const time = clock.getElapsedTime();

    // Interpolación suave del factor de explosión
    explosionFactor += (targetExplosion - explosionFactor) * 0.055;

    // Actualización de la posición de cada partícula
    if (particleGeometry) {
      const posAttr = particleGeometry.attributes.position;
      const pArr = posAttr.array;

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const tx = targetPositions[i3];
        const ty = targetPositions[i3 + 1];
        const tz = targetPositions[i3 + 2];

        const ex = explodedPositions[i3];
        const ey = explodedPositions[i3 + 1];
        const ez = explodedPositions[i3 + 2];

        const phase = particlePhases[i];
        const speed = particleSpeeds[i];
        const type = particleTypes[i];

        // 1. Interpolación base entre Axo sólida y Cosmos explotado
        let px = tx + (ex - tx) * explosionFactor;
        let py = ty + (ey - ty) * explosionFactor;
        let pz = tz + (ez - tz) * explosionFactor;

        // 2. Ondas y respiración armónica orgánica
        if (type === "water") {
          // Ondas fluidas en el agua
          py += Math.sin(time * 2.2 * speed + phase + px * 0.08) * 0.35 * windIntensity;
        } else if (type === "tree") {
          // Mecido de copas por el viento
          px += Math.sin(time * 1.8 * speed + phase) * 0.25 * windIntensity;
          pz += Math.cos(time * 1.8 * speed + phase) * 0.25 * windIntensity;
        } else if (type === "spore") {
          // Esporas flotantes con movimiento browniano
          px += Math.sin(time * 0.8 * speed + phase) * 4.0 * windIntensity;
          py += Math.cos(time * 1.1 * speed + phase) * 2.5;
          pz += Math.sin(time * 0.9 * speed + phase) * 4.0 * windIntensity;
        }

        // Remolino cósmico adicional en estado explotado
        if (explosionFactor > 0.02) {
          const swirlAngle = time * 0.25 * speed * explosionFactor;
          const cosS = Math.cos(swirlAngle), sinS = Math.sin(swirlAngle);
          const rx = px - 180, rz = pz + 20;
          px = 180 + (rx * cosS - rz * sinS);
          pz = -20 + (rx * sinS + rz * cosS);
          py += Math.sin(time * 1.5 + phase) * 8.0 * explosionFactor;
        }

        // 3. Repulsión interactiva del cursor del mouse
        if (mouseWorldPos.x < 5000) {
          const dx = px - mouseWorldPos.x;
          const dz = pz - mouseWorldPos.z;
          const distMouse = Math.hypot(dx, dz);
          const repulseRadius = 24.0;
          if (distMouse < repulseRadius) {
            const force = (1.0 - distMouse / repulseRadius) * 6.5;
            px += (dx / (distMouse + 0.001)) * force;
            pz += (dz / (distMouse + 0.001)) * force;
            py += force * 0.75;
          }
        }

        pArr[i3] = px;
        pArr[i3 + 1] = py;
        pArr[i3 + 2] = pz;
      }

      posAttr.needsUpdate = true;
    }

    controls.update();
    renderer.render(scene, activeCamera);
  }

  animate();

})();
