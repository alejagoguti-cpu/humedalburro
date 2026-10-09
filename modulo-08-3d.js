// =====================================================================
// Simulacion 3D de transito — Kennedy (fase 1: red vial + vehiculos)
// Reutiliza los mismos datos reales de SUMO que la version 2D
// (assets/kennedy_net.json y assets/kennedy_vehiculos.json).
// =====================================================================
(() => {
  const NET_URL = "./assets/kennedy_net.json";
  const VEHICULOS_JSON_URL = "./assets/kennedy_vehiculos.json";
  const BUILDINGS_URL = "./assets/kennedy_buildings.json";
  const TREES_URL = "./assets/kennedy_trees_real.json";
  const WATER_URL = "./assets/kennedy_water_bodies.json";
  const MANZANAS_URL = "./assets/kennedy_manzanas.json";
  const PARQUES_URL = "./assets/kennedy_parques.json";
  const SCALE = 1 / 10; // las coordenadas del JSON llegan a ~10700 unidades; se escalan para Three.js

  const statusOverlay = document.getElementById("statusOverlay");
  function setStatus(text, show = true) {
    statusOverlay.textContent = text;
    statusOverlay.classList.toggle("hide", !show);
  }

  // ---- Escena, camara, render ----
  const canvas = document.getElementById("sceneCanvas");
  const wrap = document.getElementById("sceneWrap");
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x141416);
  scene.fog = new THREE.Fog(0x141416, 1000, 3600);
  // Todo el contenido del mapa (vias, edificios, arboles, agua, vehiculos)
  // se agrega a este grupo, no directamente a la escena, para poder
  // rotarlo entero en X/Y/Z con los controles manuales de orientacion.
  // El usuario encontro que la orientacion correcta del plano necesita un
  // giro de 180° — se aplica aqui en el eje Y (vertical), no en Z, porque
  // un giro en Z tambien voltea la altura de los edificios boca abajo (Z
  // no es el eje "arriba" de esta escena); un giro en Y reordena el plano
  // igual mientras deja la altura intacta.
  const sceneRoot = new THREE.Group();
  scene.add(sceneRoot);

  // Variables y grupos de la simulación histórica (1950 - 1956)
  let currentHistoricalYear = 1950;
  let rawWaterData = null;
  let modernRoadLines = null;
  let modernRoadMesh = null;
  let modernManzanasMesh = null;
  let modernBuildingEdges = null;
  let modernParquesMesh = null;
  let modernFacadesMesh = null;
  let camAnim = null;

  const cowsGroup = new THREE.Group();
  sceneRoot.add(cowsGroup);

  const historicalWetlandsGroup = new THREE.Group();
  sceneRoot.add(historicalWetlandsGroup);

  const americasRoadGroup = new THREE.Group();
  sceneRoot.add(americasRoadGroup);

  const aeropuertoTechoGroup = new THREE.Group();
  sceneRoot.add(aeropuertoTechoGroup);

  const corabastosGroup = new THREE.Group();
  sceneRoot.add(corabastosGroup);

  const roads1972Group = new THREE.Group();
  sceneRoot.add(roads1972Group);

  const avCaliGroup = new THREE.Group();
  sceneRoot.add(avCaliGroup);

  const protechoGroup = new THREE.Group();
  sceneRoot.add(protechoGroup);

  const historicalTreesGroup = new THREE.Group();
  sceneRoot.add(historicalTreesGroup);

  const userPlantedGroup = new THREE.Group();
  userPlantedGroup.renderOrder = 999;
  sceneRoot.add(userPlantedGroup);
  const userPlantedElements = [];
  let currentActiveTool = null; // 'tree' | 'cow' | 'road' | 'runway' | null

  // Grupo para polígonos personalizados de vía y pista de aterrizaje
  const customPolysGroup = new THREE.Group();
  customPolysGroup.renderOrder = 300;
  sceneRoot.add(customPolysGroup);

  const customRoadPoints = [];
  const customRunwayPoints = [];
  let currentActiveRoadMesh = null;
  let currentActiveRunwayMesh = null;

  const viaTexLoader = new THREE.TextureLoader();
  const roadTexture = viaTexLoader.load("./assets/textura_via.jpg");
  roadTexture.wrapS = THREE.RepeatWrapping;
  roadTexture.wrapT = THREE.RepeatWrapping;

  const customRoadMat = new THREE.MeshStandardMaterial({
    map: roadTexture,
    color: 0x9099a3,
    roughness: 0.85,
    side: THREE.DoubleSide
  });

  const customRunwayMat = new THREE.MeshStandardMaterial({
    map: roadTexture,
    color: 0x727982,
    roughness: 0.85,
    side: THREE.DoubleSide
  });

  let camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 5, 2000);
  const orthoCameraRef = camera; // referencia estable a la ortografica, para poder volver a ella
  const perspCamera = new THREE.PerspectiveCamera(55, 1, 1, 5000);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;
  renderer.localClippingEnabled = true; // para la caja de seccion (corte del modelo)

  // Los planos de recorte de la caja de seccion se crean y se ACTIVAN
  // desde ya (igual que en Corte axonometrico), antes de construir
  // cualquier edificio/via/etc.
  const secPlanes = {
    xMin: new THREE.Plane(new THREE.Vector3(1, 0, 0), 1e6),
    xMax: new THREE.Plane(new THREE.Vector3(-1, 0, 0), 1e6),
    yMin: new THREE.Plane(new THREE.Vector3(0, 1, 0), 1e6),
    yMax: new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e6),
    zMin: new THREE.Plane(new THREE.Vector3(0, 0, 1), 1e6),
    zMax: new THREE.Plane(new THREE.Vector3(0, 0, -1), 1e6),
  };
  renderer.clippingPlanes = [secPlanes.xMin, secPlanes.xMax, secPlanes.yMin, secPlanes.yMax, secPlanes.zMin, secPlanes.zMax];
  let sceneExtentW = 100, sceneExtentH = 100; // ancho/alto de la escena en unidades (para la caja de seccion)

  // Tamano visible (mitad de la altura del encuadre, en unidades de la
  // escena) para la proyeccion ortogonal — se ajusta al cargar la red.
  let viewSize = 260;
  function resize() {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    if (camera.isOrthographicCamera) {
      camera.left = -viewSize * aspect;
      camera.right = viewSize * aspect;
      camera.top = viewSize;
      camera.bottom = -viewSize;
    } else {
      camera.aspect = aspect;
    }
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enableRotate = false; // Vista axonométrica fija: no rota, solo se desplaza y hace zoom
  controls.enablePan = true;
  controls.screenSpacePanning = true;
  controls.enableZoom = true;
  controls.minZoom = 0.15;
  controls.maxZoom = 30;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.PAN,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN
  };

  // ---- Cambiar entre proyeccion ortografica (axonometrica, la de
  // siempre) y perspectiva (con fuga real, como ve un ojo humano). Al
  // cambiar, se copia la posicion y el punto al que mira, para no perder
  // el encuadre que ya se tenia armado. ----
  const perspToggleBtn = document.getElementById("perspToggle");
  let usingPersp = false;
  if (perspToggleBtn) perspToggleBtn.addEventListener("click", () => {
    const target = controls.target.clone();
    const pos = camera.position.clone();
    usingPersp = !usingPersp;
    if (usingPersp) {
      perspCamera.position.copy(pos);
      camera = perspCamera;
    } else {
      camera = orthoCameraRef;
      camera.position.copy(pos);
    }
    controls.object = camera;
    controls.target.copy(target);
    controls.update();
    resize();
    camera.updateProjectionMatrix();
    perspToggleBtn.innerHTML = usingPersp 
      ? '<i class="fa-solid fa-compass"></i> Ver en axonométrica' 
      : '<i class="fa-solid fa-cube"></i> Ver en perspectiva';
    perspToggleBtn.classList.toggle("active", usingPersp);
    if (typeof updateSectionBox === "function") updateSectionBox(); // refrescar el cuadro de coordenadas con la nueva proyeccion
  });

  // ---- Luces (con sombras, tipo render arquitectonico) ----
  const ambient = new THREE.AmbientLight(0xffffff, 0.95);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffffff, 0.65);
  scene.add(sun);
  scene.add(sun.target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 2600;
  sun.shadow.bias = -0.00015;
  sun.shadow.normalBias = 0.35; // reduce el parpadeo/artefactos de sombra (shadow acne)
  const SHADOW_FRUSTUM = 750;
  sun.shadow.camera.left = -SHADOW_FRUSTUM;
  sun.shadow.camera.right = SHADOW_FRUSTUM;
  sun.shadow.camera.top = SHADOW_FRUSTUM;
  sun.shadow.camera.bottom = -SHADOW_FRUSTUM;
  const rim = new THREE.DirectionalLight(0xdce8ff, 0.25);
  rim.position.set(-400, 200, -300);
  scene.add(rim);

  // Posicion del sol controlada por azimut/altura (grados), para poder
  // "mover las sombras" con los deslizadores de la interfaz.
  let sunAzimuth = 130, sunElevation = 45, sunDistance = 900;
  function updateSunPosition() {
    const az = sunAzimuth * Math.PI / 180, el = sunElevation * Math.PI / 180;
    sun.position.set(
      sunDistance * Math.cos(el) * Math.sin(az),
      sunDistance * Math.sin(el),
      sunDistance * Math.cos(el) * Math.cos(az)
    );
    sun.target.position.set(0, 0, 0);
  }
  updateSunPosition();

  // ---- Suelo ----
  let netCenter = { x: 0, y: 0 };
  let roadMat = null, waterMat = null, parqueMat = null; // referencias para los selectores de color en vivo
  let modernWaterMesh = null;
  let waterTexRef = null, waterBumpRef = null; // texturas de agua, animadas en el loop de render
  let buildingEdgeMat = null; // referencia para ajustar su opacidad segun el zoom
  let groundMesh = null;
  const grassTexLoader = new THREE.TextureLoader();
  const histGrassTex = grassTexLoader.load("./assets/textura_pasto_pastel.jpg");
  histGrassTex.wrapS = THREE.RepeatWrapping;
  histGrassTex.wrapT = THREE.RepeatWrapping;
  histGrassTex.anisotropy = 16;
  histGrassTex.minFilter = THREE.LinearMipmapLinearFilter;
  histGrassTex.magFilter = THREE.LinearFilter;

  function buildGround(bbox) {
    const w = (bbox[2] - bbox[0]) * SCALE * 1.4;
    const h = (bbox[3] - bbox[1]) * SCALE * 1.4;
    const geo = new THREE.PlaneGeometry(w, h);
    
    // Repetición suave y amplia para evitar efecto cuadrícula/cuarteado
    histGrassTex.repeat.set(Math.max(10, Math.round(w / 45)), Math.max(10, Math.round(h / 45)));
    
    const mat = new THREE.MeshStandardMaterial({
      map: histGrassTex,
      color: 0xd6d8cf, // textura pastel (verde salvia apagado); el color evita que la luz la deje casi blanca
      roughness: 0.92,
      metalness: 0.0,
      transparent: true,
      opacity: 0.92
    });
    groundMesh = new THREE.Mesh(geo, mat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.set(0, -0.4, 0);
    groundMesh.receiveShadow = true;
    sceneRoot.add(groundMesh);
  }

  // Convierte una coordenada del JSON (x,y en el plano, x=este, y=norte
  // real en UTM) a posicion 3D (x,z en Three.js, y=altura). El eje Z se
  // invierte (espejo, no rotacion) para que el plano quede orientado
  // correctamente — esto NO toca la altura (Y) de nada, a diferencia de
  // rotar el grupo entero.
  function toScene(x, y) {
    return { x: (x - netCenter.x) * SCALE, z: -(y - netCenter.y) * SCALE };
  }

// =====================================================================
  // SIMULACIÓN HISTÓRICA: 1950 (Sabana & Humedal El Burro) y 1956 (La Vaca & Aeropuerto de Techo)
  // =====================================================================

  // Texturas de agua con relieve y movimiento (mismo color y textura que la axonometría)
  const waterTexLoader = new THREE.TextureLoader();
  const waterTex = waterTexLoader.load("./assets/textura_agua2.jpg");
  waterTex.wrapS = THREE.RepeatWrapping;
  waterTex.wrapT = THREE.RepeatWrapping;
  waterTexRef = waterTex;

  const bumpTex = waterTexLoader.load("./assets/textura_agua2.jpg");
  bumpTex.wrapS = THREE.RepeatWrapping;
  bumpTex.wrapT = THREE.RepeatWrapping;
  bumpTex.repeat.set(2.3, 2.3);
  waterBumpRef = bumpTex;

  const sharedWaterMat = new THREE.MeshStandardMaterial({
    vertexColors: false, // sin degradado: el agua se ve por su textura
    color: 0x6f98a6, // mismo color y textura que el agua de la axonometria
    map: waterTex,
    bumpMap: bumpTex,
    bumpScale: 0.12,
    roughness: 0.15,
    metalness: 0.15,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide
  });
  waterMat = sharedWaterMat;

  // 1. Sprites de vacas en pastoreo con sombra negra en el suelo (caminando en el plano sin flotar)
  const cowTextures = [];
  const cowTexLoader = new THREE.TextureLoader();
  for (let i = 0; i < 12; i++) {
    cowTextures.push(cowTexLoader.load(`./assets/vaca_${i}.png`));
  }

  const cowInstances = [];
  // Vacas alrededor de cada humedal: se ubican en un anillo por fuera de la forma del agua de la epoca.
  const COW_FRACTION = { 1950: 1, 1956: 1, 1972: 0.4, 1988: 0.15 }; // el ganado disminuye a medida que crece la ciudad
  const COW_TOTALS = { Burro: 70, Vaca: 70, Techo: 50 };
  const COW_SCALE = 4.2; // grandes, para que se vean a la distancia de la vista axonometrica
  function createCows() { cowsGroup.clear(); cowInstances.length = 0; } // se colocan al construir los humedales
  function pointInPoly(x, z, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if (((a.z > z) !== (b.z > z)) && (x < (b.x - a.x) * (z - a.z) / ((b.z - a.z) || 1e-9) + a.x)) inside = !inside;
    }
    return inside;
  }
  function colocarVacas(outlines, year) {
    createCows();
    const f = COW_FRACTION[year];
    if (!f) return;
    const polys = outlines.map(o => o.pts);
    outlines.forEach(o => {
      const key = o.nombre.includes("Burro") ? "Burro" : (o.nombre.includes("Vaca") ? "Vaca" : "Techo");
      const n = Math.round(COW_TOTALS[key] * f), pts = o.pts;
      let cx = 0, cz = 0;
      pts.forEach(p => { cx += p.x; cz += p.z; });
      cx /= pts.length; cz /= pts.length;
      for (let i = 0; i < n; i++) {
        const p = pts[Math.floor(Math.random() * pts.length)];
        let dx = p.x - cx, dz = p.z - cz;
        const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
        let x, z, tries = 0, r = 3 + Math.random() * 20;
        do { x = p.x + dx * r + (Math.random() - 0.5) * 8; z = p.z + dz * r + (Math.random() - 0.5) * 8; r += 10; tries++; }
        while (tries < 6 && polys.some(poly => pointInPoly(x, z, poly)));
        const tex = cowTextures[Math.floor(Math.random() * cowTextures.length)];
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, alphaTest: 0.35, depthWrite: false });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), mat);
        const shadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.8), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }));
        shadowMesh.rotation.x = -Math.PI / 2;
        shadowMesh.position.set(0, -0.48, 0);
        mesh.add(shadowMesh);
        // se dibujan despues del suelo y del agua (si no, quedan tapadas por ellos)
        shadowMesh.renderOrder = 28; mesh.renderOrder = 30;
        const baseY = 0.55 * COW_SCALE;
        mesh.position.set(x, baseY, z);
        mesh.rotation.x = -Math.PI / 4.2;
        mesh.rotation.y = (Math.random() - 0.5) * 0.3;
        const sc = (0.85 + Math.random() * 0.3) * COW_SCALE;
        mesh.scale.set((Math.random() > 0.5 ? 1 : -1) * sc, sc, sc);
        cowsGroup.add(mesh);
        cowInstances.push({ mesh, baseX: x, baseZ: z, baseY, phase: Math.random() * Math.PI * 2, speed: 0.3 + Math.random() * 0.4, wanderR: 2 + Math.random() * 4 });
      }
    });
  }

  // 2. Construcción de humedales históricos con el área solicitada según la época
  function buildHistoricalWetlands(waterBodies, year = 1950) {
    if (!waterBodies || !waterBodies.length) return;
    historicalWetlandsGroup.clear();
    const positions = [], uvs = [], colors = [], linePositions = [];
    const UV_SCALE = 0.08;
    const wetlandOutlines = []; // contornos del agua de esta epoca, para ubicar las vacas alrededor

    function polyArea(pts) {
      let a = 0;
      for (let i = 0; i < pts.length; i++) {
        const p1 = pts[i], p2 = pts[(i + 1) % pts.length];
        a += p1[0] * p2[1] - p2[0] * p1[1];
      }
      return Math.abs(a) / 2;
    }

    // Suavizado de esquinas curvas (Algoritmo de Chaikin)
    function chaikinSmooth(pts, iterations = 2) {
      let cur = pts;
      for (let iter = 0; iter < iterations; iter++) {
        const n = cur.length;
        const res = [];
        for (let i = 0; i < n; i++) {
          const p0 = cur[i];
          const p1 = cur[(i + 1) % n];
          res.push([0.75 * p0[0] + 0.25 * p1[0], 0.75 * p0[1] + 0.25 * p1[1]]);
          res.push([0.25 * p0[0] + 0.75 * p1[0], 0.25 * p0[1] + 0.75 * p1[1]]);
        }
        cur = res;
      }
      return cur;
    }

    let targetAreaBurro = 1710000;
    let targetAreaVaca = 1810000;
    let targetAreaTecho = 1200000;

    if (year === 1972) {
      targetAreaBurro = 385300;
      targetAreaVaca = 800000;
      targetAreaTecho = 300000;
    } else if (year === 1988) {
      targetAreaBurro = 271400;
      targetAreaVaca = 300000;
      targetAreaTecho = 100000;
    }

    const burroObj = waterBodies.find(w => (w.nombre || "").includes("Burro"));
    let burroCx = 7436.96, burroCy = 3271.17;
    if (burroObj && burroObj.pts && burroObj.pts.length) {
      burroCx = burroObj.pts.reduce((s, p) => s + p[0], 0) / burroObj.pts.length;
      burroCy = burroObj.pts.reduce((s, p) => s + p[1], 0) / burroObj.pts.length;
    }

    waterBodies.forEach((w) => {
      const name = w.nombre || "";
      if (!name.includes("Burro") && !name.includes("Vaca") && !name.includes("Techo")) return;
      if (!w.pts || w.pts.length < 3) return;

      const ptsOriginal = w.pts;
      const baseArea = polyArea(ptsOriginal);
      if (baseArea <= 0) return;
      if (name.includes("Vaca") && baseArea < 20000) return;

      const cx = ptsOriginal.reduce((s, p) => s + p[0], 0) / ptsOriginal.length;
      const cy = ptsOriginal.reduce((s, p) => s + p[1], 0) / ptsOriginal.length;

      let expandedPts = [];
      let yLayer = 0.024;

      if (name.includes("Burro")) {
        yLayer = 0.024;
        const scale = Math.sqrt(targetAreaBurro / baseArea);
        const unscaled = ptsOriginal.map(p => [cx + (p[0] - cx) * scale, cy + (p[1] - cy) * scale]);
        const smoothed = chaikinSmooth(unscaled, 1);
        const sArea = polyArea(smoothed);
        const k = Math.sqrt(targetAreaBurro / (sArea || 1));
        const scx = smoothed.reduce((s, p) => s + p[0], 0) / smoothed.length;
        const scy = smoothed.reduce((s, p) => s + p[1], 0) / smoothed.length;
        expandedPts = smoothed.map(p => [scx + (p[0] - scx) * k, scy + (p[1] - scy) * k]);
      } else if (name.includes("Vaca")) {
        yLayer = 0.025;
        const scaleBase = Math.sqrt(targetAreaVaca / baseArea);
        const dx = burroCx - cx, dy = burroCy - cy;
        const dist = Math.hypot(dx, dy) || 1;
        const ux = dx / dist, uy = dy / dist;

        const transformed = ptsOriginal.map(p => {
          const px = p[0] - cx, py = p[1] - cy;
          const proj = px * ux + py * uy;
          const perp_x = px - proj * ux, perp_y = py - proj * uy;
          const newProj = proj * (scaleBase * 1.30) + dist * 0.25;
          const newPerpX = perp_x * (scaleBase * 0.769);
          const newPerpY = perp_y * (scaleBase * 0.769);
          return [cx + newProj * ux + newPerpX, cy + newProj * uy + newPerpY];
        });

        const smoothed = chaikinSmooth(transformed, 2);
        const sArea = polyArea(smoothed);
        const k = Math.sqrt(targetAreaVaca / (sArea || 1));
        const scx = smoothed.reduce((s, p) => s + p[0], 0) / smoothed.length;
        const scy = smoothed.reduce((s, p) => s + p[1], 0) / smoothed.length;
        expandedPts = smoothed.map(p => [scx + (p[0] - scx) * k, scy + (p[1] - scy) * k]);
      } else if (name.includes("Techo")) {
        yLayer = 0.026;
        const scaleBase = Math.sqrt(targetAreaTecho / baseArea);
        const dx = burroCx - cx, dy = burroCy - cy;
        const dist = Math.hypot(dx, dy) || 1;
        const ux = dx / dist, uy = dy / dist;

        const transformed = ptsOriginal.map(p => {
          const px = p[0] - cx, py = p[1] - cy;
          const proj = px * ux + py * uy;
          const perp_x = px - proj * ux, perp_y = py - proj * uy;
          const newProj = proj * (scaleBase * 1.22) + dist * 0.20;
          const newPerpX = perp_x * (scaleBase * 0.82);
          const newPerpY = perp_y * (scaleBase * 0.82);
          return [cx + newProj * ux + newPerpX, cy + newProj * uy + newPerpY];
        });

        const smoothed = chaikinSmooth(transformed, 1);
        const sArea = polyArea(smoothed);
        const k = Math.sqrt(targetAreaTecho / (sArea || 1));
        const scx = smoothed.reduce((s, p) => s + p[0], 0) / smoothed.length;
        const scy = smoothed.reduce((s, p) => s + p[1], 0) / smoothed.length;
        expandedPts = smoothed.map(p => [scx + (p[0] - scx) * k, scy + (p[1] - scy) * k]);
      }

      const scenePts = expandedPts.map(p => toScene(p[0], p[1]));
      if (scenePts.length < 3) return;
      wetlandOutlines.push({ nombre: name, pts: scenePts });

      const pts2d = scenePts.map(p => new THREE.Vector2(p.x, p.z));
      let tris = [];
      try { tris = THREE.ShapeUtils.triangulateShape(pts2d, []); } catch (e) {}

      const nPts = scenePts.length;
      const polyCentroidX = scenePts.reduce((s, p) => s + p.x, 0) / nPts;
      const polyCentroidZ = scenePts.reduce((s, p) => s + p.z, 0) / nPts;
      
      let maxDist = 0.001;
      for (let i = 0; i < nPts; i++) {
        const d = Math.hypot(scenePts[i].x - polyCentroidX, scenePts[i].z - polyCentroidZ);
        if (d > maxDist) maxDist = d;
      }

      function getWetlandGradientColor(px, pz) {
        // Sin degradado: el lecho del humedal es de un solo color; el agua se ve por su textura.
        return [0.55, 0.66, 0.70];
      }

      // Línea de orilla oscura verdosa
      for (let i = 0; i < nPts; i++) {
        const p1 = scenePts[i];
        const p2 = scenePts[(i + 1) % nPts];
        linePositions.push(p1.x, yLayer + 0.004, p1.z, p2.x, yLayer + 0.004, p2.z);
      }

      tris.forEach(([a, b, c]) => {
        [a, b, c].forEach(idx => {
          const pt = scenePts[idx];
          positions.push(pt.x, yLayer, pt.z);
          uvs.push(pt.x * UV_SCALE, pt.z * UV_SCALE);
          const [cr, cg, cb] = getWetlandGradientColor(pt.x, pt.z);
          colors.push(cr, cg, cb);
        });
      });
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const bedGeo = geo.clone();
    const bedMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
    const bedMesh = new THREE.Mesh(bedGeo, bedMat);
    bedMesh.position.y = -0.004;
    bedMesh.renderOrder = 10;
    historicalWetlandsGroup.add(bedMesh);

    const mesh = new THREE.Mesh(geo, sharedWaterMat);
    mesh.renderOrder = 15;
    mesh.receiveShadow = false;
    historicalWetlandsGroup.add(mesh);

    if (linePositions.length) {
      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
      const lineMat = new THREE.LineBasicMaterial({ color: 0x143422, transparent: true, opacity: 0.65 });
      const lineMesh = new THREE.LineSegments(lineGeo, lineMat);
      lineMesh.renderOrder = 20;
      historicalWetlandsGroup.add(lineMesh);
    }
    colocarVacas(wetlandOutlines, year);
  }
  // ---- Modelos Históricos Documentados ----
  function buildCorabastosModel() {
    corabastosGroup.clear();
    return; // sin volumenes inventados: las bodegas de Corabastos son edificios reales del conjunto de datos
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xc9c1b0, roughness: 0.85, metalness: 0.05 }); // concreto (antes azul gris, se veia de plastico)
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.4 });
    const bodegas = [
      { x: 260, z: 45, w: 28, h: 4.5, d: 14 },
      { x: 260, z: 65, w: 28, h: 4.5, d: 14 },
      { x: 295, z: 45, w: 24, h: 4.5, d: 14 },
      { x: 295, z: 65, w: 24, h: 4.5, d: 14 },
      { x: 275, z: 88, w: 38, h: 5.0, d: 16 }
    ];
    bodegas.forEach(b => {
      const bGeo = new THREE.BoxGeometry(b.w, b.h, b.d);
      const mesh = new THREE.Mesh(bGeo, wallMat);
      mesh.position.set(b.x, b.h / 2 + 0.05, b.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const eGeo = new THREE.EdgesGeometry(bGeo);
      const eMesh = new THREE.LineSegments(eGeo, edgeMat);
      mesh.add(eMesh);
      corabastosGroup.add(mesh);
    });
  }

  function buildRoads1972() {
    roads1972Group.clear();
    const viaTex = new THREE.TextureLoader().load("./assets/textura_via.jpg");
    viaTex.wrapS = THREE.RepeatWrapping; viaTex.wrapT = THREE.RepeatWrapping;
    const avenues = [
      { width: 2.2, pts: [{ x: 460, z: 48 }, { x: 380, z: 66 }, { x: 310, z: 85 }] },
      { width: 1.8, pts: [{ x: 310, z: 15 }, { x: 310, z: 85 }, { x: 280, z: 125 }, { x: 260, z: 160 }] }
    ];
    avenues.forEach(ave => {
      const pts = ave.pts;
      const halfW = ave.width * 0.5;
      const ribbonGeo = new THREE.BufferGeometry();
      const ribbonPos = [], ribbonUv = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const dx = b.x - a.x, dz = b.z - a.z;
        const len = Math.hypot(dx, dz) || 0.001;
        const nx = -dz / len * halfW, nz = dx / len * halfW;
        ribbonPos.push(
          a.x - nx, 0.038, a.z - nz,  a.x + nx, 0.038, a.z + nz,  b.x + nx, 0.038, b.z + nz,
          a.x - nx, 0.038, a.z - nz,  b.x + nx, 0.038, b.z + nz,  b.x - nx, 0.038, b.z - nz
        );
        [
          [a.x - nx, a.z - nz], [a.x + nx, a.z + nz], [b.x + nx, b.z + nz],
          [a.x - nx, a.z - nz], [b.x + nx, b.z + nz], [b.x - nx, b.z - nz]
        ].forEach(([px, pz]) => ribbonUv.push(px * 0.06, pz * 0.06));
      }
      ribbonGeo.setAttribute("position", new THREE.Float32BufferAttribute(ribbonPos, 3));
      ribbonGeo.setAttribute("uv", new THREE.Float32BufferAttribute(ribbonUv, 2));
      ribbonGeo.computeVertexNormals();
      const roadMat = new THREE.MeshStandardMaterial({ map: viaTex, color: 0x94a3b8, roughness: 0.85, side: THREE.DoubleSide });
      const rMesh = new THREE.Mesh(ribbonGeo, roadMat);
      roads1972Group.add(rMesh);
    });
  }

  function buildAvCaliModel() {
    avCaliGroup.clear();
    const viaTex = new THREE.TextureLoader().load("./assets/textura_via.jpg");
    viaTex.wrapS = THREE.RepeatWrapping; viaTex.wrapT = THREE.RepeatWrapping;
    const pts = [
      { x: 226, z: -120 }, { x: 220, z: -55 }, { x: 212, z: -10 }, { x: 206, z: 45 }, { x: 198, z: 120 }
    ];
    const ribbonGeo = new THREE.BufferGeometry();
    const ribbonPos = [], ribbonUv = [];
    const halfW = 1.35;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const dx = b.x - a.x, dz = b.z - a.z;
      const len = Math.hypot(dx, dz) || 0.001;
      const nx = -dz / len * halfW, nz = dx / len * halfW;
      ribbonPos.push(
        a.x - nx, 0.042, a.z - nz,  a.x + nx, 0.042, a.z + nz,  b.x + nx, 0.042, b.z + nz,
        a.x - nx, 0.042, a.z - nz,  b.x + nx, 0.042, b.z + nz,  b.x - nx, 0.042, b.z - nz
      );
      [
        [a.x - nx, a.z - nz], [a.x + nx, a.z + nz], [b.x + nx, b.z + nz],
        [a.x - nx, a.z - nz], [b.x + nx, b.z + nz], [b.x - nx, b.z - nz]
      ].forEach(([px, pz]) => ribbonUv.push(px * 0.06, pz * 0.06));
    }
    ribbonGeo.setAttribute("position", new THREE.Float32BufferAttribute(ribbonPos, 3));
    ribbonGeo.setAttribute("uv", new THREE.Float32BufferAttribute(ribbonUv, 2));
    ribbonGeo.computeVertexNormals();
    const roadMat = new THREE.MeshStandardMaterial({ map: viaTex, color: 0x64748b, roughness: 0.85, side: THREE.DoubleSide });
    const rMesh = new THREE.Mesh(ribbonGeo, roadMat);
    avCaliGroup.add(rMesh);
  }

  function buildProtechoModel() {
    protechoGroup.clear();
    return; // sin volumenes inventados
    const facMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.85 });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x1c1917, transparent: true, opacity: 0.45 });
    const pGeo = new THREE.BoxGeometry(22, 6.5, 16);
    const pMesh = new THREE.Mesh(pGeo, facMat);
    pMesh.position.set(168, 3.3, -38);
    pMesh.castShadow = true;
    pMesh.receiveShadow = true;
    const eGeo = new THREE.EdgesGeometry(pGeo);
    const eMesh = new THREE.LineSegments(eGeo, edgeMat);
    pMesh.add(eMesh);
    protechoGroup.add(pMesh);
  }


  // 3. Modelo del Antiguo Aeropuerto de Techo (1956) con Pista y Vía trazadas en gris claro
  const AEROPUERTO_RUNWAY_PTS = [
    { x: 235.83, z: 96.00 },
    { x: 231.51, z: 98.92 },
    { x: 228.91, z: 103.03 },
    { x: 228.24, z: 107.15 },
    { x: 230.23, z: 112.00 },
    { x: 233.77, z: 116.51 },
    { x: 259.94, z: 144.64 },
    { x: 264.32, z: 146.57 },
    { x: 269.91, z: 145.06 },
    { x: 273.99, z: 143.61 },
    { x: 322.12, z: 120.95 },
    { x: 332.93, z: 113.64 },
    { x: 329.58, z: 107.96 },
    { x: 328.33, z: 103.83 },
    { x: 324.59, z: 103.22 },
    { x: 234.95, z: 96.15 }
  ];

  const AEROPUERTO_ROAD_PTS = [
    { x: 393.48, z: 107.81 },
    { x: 235.46, z: 95.63 }
  ];

  function isPointInRunway(px, pz) {
    let inside = false;
    const n = AEROPUERTO_RUNWAY_PTS.length;
    for (let i = 0; i < n; i++) {
      const p1 = AEROPUERTO_RUNWAY_PTS[i], p2 = AEROPUERTO_RUNWAY_PTS[(i + 1) % n];
      if (((p1.z > pz) !== (p2.z > pz)) && (px < (p2.x - p1.x) * (pz - p1.z) / (p2.z - p1.z + 1e-9) + p1.x)) {
        inside = !inside;
      }
    }
    return inside;
  }

  function isPointNearRoad(px, pz, maxDist = 3.8) {
    const a = AEROPUERTO_ROAD_PTS[0], b = AEROPUERTO_ROAD_PTS[1];
    const dx = b.x - a.x, dz = b.z - a.z;
    const l2 = dx * dx + dz * dz;
    if (l2 === 0) return Math.hypot(px - a.x, pz - a.z) < maxDist;
    const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (pz - a.z) * dz) / l2));
    const projX = a.x + t * dx, projZ = a.z + t * dz;
    return Math.hypot(px - projX, pz - projZ) < maxDist;
  }

  function buildAeropuertoTecho() {
    aeropuertoTechoGroup.clear();

    const viaTex = new THREE.TextureLoader().load("./assets/textura_via.jpg");
    viaTex.wrapS = THREE.RepeatWrapping;
    viaTex.wrapT = THREE.RepeatWrapping;

    // A. Pista de Techo (polígono relleno con textura de vía en gris claro)
    const pts2d = AEROPUERTO_RUNWAY_PTS.map(p => new THREE.Vector2(p.x, p.z));
    let tris = [];
    try { tris = THREE.ShapeUtils.triangulateShape(pts2d, []); } catch (e) {}

    const runwayPos = [], runwayUv = [];
    const RUNWAY_UV_SCALE = 0.05;
    tris.forEach(([ia, ib, ic]) => {
      [ia, ib, ic].forEach(idx => {
        const pt = AEROPUERTO_RUNWAY_PTS[idx];
        runwayPos.push(pt.x, 0.032, pt.z);
        runwayUv.push(pt.x * RUNWAY_UV_SCALE, pt.z * RUNWAY_UV_SCALE);
      });
    });

    const runwayGeo = new THREE.BufferGeometry();
    runwayGeo.setAttribute("position", new THREE.Float32BufferAttribute(runwayPos, 3));
    runwayGeo.setAttribute("uv", new THREE.Float32BufferAttribute(runwayUv, 2));
    runwayGeo.computeVertexNormals();

    const runwayMat = new THREE.MeshStandardMaterial({
      map: viaTex,
      color: 0xd2d6da, // Gris más claro
      roughness: 0.85,
      metalness: 0.02,
      side: THREE.DoubleSide
    });

    const runwayMesh = new THREE.Mesh(runwayGeo, runwayMat);
    runwayMesh.receiveShadow = true;
    aeropuertoTechoGroup.add(runwayMesh);

    // B. Vía de conexión (ribbon continuo en gris más claro)
    const roadPos = [], roadUv = [];
    const a = AEROPUERTO_ROAD_PTS[0], b = AEROPUERTO_ROAD_PTS[1];
    const dx = b.x - a.x, dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len, nz = dx / len;
    const halfW = 1.35;
    const ax = nx * halfW, az = nz * halfW;

    roadPos.push(
      a.x - ax, 0.035, a.z - az,  a.x + ax, 0.035, a.z + az,  b.x + ax, 0.035, b.z + az,
      a.x - ax, 0.035, a.z - az,  b.x + ax, 0.035, b.z + az,  b.x - ax, 0.035, b.z - az
    );
    [
      [a.x - ax, a.z - az], [a.x + ax, a.z + az], [b.x + ax, b.z + az],
      [a.x - ax, a.z - az], [b.x + ax, b.z + az], [b.x - ax, b.z - az]
    ].forEach(([px, pz]) => roadUv.push(px * 0.06, pz * 0.06));

    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute("position", new THREE.Float32BufferAttribute(roadPos, 3));
    roadGeo.setAttribute("uv", new THREE.Float32BufferAttribute(roadUv, 2));
    roadGeo.computeVertexNormals();

    const roadMatTecho = new THREE.MeshStandardMaterial({
      map: viaTex,
      color: 0xd2d6da, // Gris más claro idéntico
      roughness: 0.85,
      side: THREE.DoubleSide
    });

    const roadMesh = new THREE.Mesh(roadGeo, roadMatTecho);
    roadMesh.receiveShadow = true;
    aeropuertoTechoGroup.add(roadMesh);

    // C. Edificio Terminal y torre
    const pos = toScene(8180.94, 2102.08); // Coordenadas en Techo
    const group = new THREE.Group();
    group.position.set(pos.x, 0, pos.z);

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xf4f1ea,
      roughness: 0.85,
      metalness: 0.05
    });
    const termGeo = new THREE.BoxGeometry(20, 2.2, 8);
    const term = new THREE.Mesh(termGeo, wallMat);
    term.position.set(0, 1.1, -4);
    group.add(term);

    // Torre de control
    const towerGeo = new THREE.BoxGeometry(4.2, 4.5, 4.2);
    const tower = new THREE.Mesh(towerGeo, wallMat);
    tower.position.set(0, 2.25, -4);
    group.add(tower);

    // Bordes limpios
    const edgeGeo = new THREE.EdgesGeometry(termGeo);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x2c2d30, transparent: true, opacity: 0.35 });
    const termEdges = new THREE.LineSegments(edgeGeo, edgeMat);
    termEdges.position.copy(term.position);
    group.add(termEdges);

    aeropuertoTechoGroup.add(group);
  }

  // 4. Animación suave de cámara entre épocas
  function transitionCameraTo(targetPos, targetLookAt, targetZoom, duration = 2200) {
    const startPos = camera.position.clone();
    const startLookAt = controls.target.clone();
    const startZoom = camera.zoom;
    const startTime = performance.now();

    camAnim = {
      update(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const ease = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        camera.position.lerpVectors(startPos, targetPos, ease);
        controls.target.lerpVectors(startLookAt, targetLookAt, ease);
        camera.zoom = startZoom + (targetZoom - startZoom) * ease;
        camera.updateProjectionMatrix();
        controls.update();

        if (progress >= 1) camAnim = null;
      }
    };
  }

  // 5. Función de cambio de época histórica
  function setHistoricalYear(year, animateCam = true) {
    currentHistoricalYear = year;

    document.querySelectorAll(".year-btn").forEach(btn => {
      const y = parseInt(btn.dataset.year, 10);
      const isActive = y === year;
      btn.classList.toggle("active", isActive);
      btn.style.borderColor = isActive ? "var(--accent)" : "var(--panel-border)";
      btn.style.background = isActive ? "rgba(36,200,189,.25)" : "rgba(255,255,255,.06)";
      btn.style.color = isActive ? "var(--accent)" : "var(--ink)";
    });
    const slider = document.getElementById("histYearSlider");
    if (slider) slider.value = String(Math.max(0, [1950, 1956, 1972, 1988, 2024].indexOf(year >= 2024 ? 2024 : year))); // el deslizador va por posicion (0-4), no por año

    const badge = document.getElementById("eraBadge");
    const desc = document.getElementById("eraDesc");

    // Capas urbanas modernas: las vias, manzanas y fachadas se ocultan; los edificios reales aparecen por tramos
    if (modernRoadLines) modernRoadLines.visible = false;
    if (modernRoadMesh) modernRoadMesh.visible = false;
    if (modernManzanasMesh) modernManzanasMesh.visible = false;
    if (modernFacadesMesh) modernFacadesMesh.visible = false;
    if (elBurroMesh) elBurroMesh.visible = false;
    if (modernWaterMesh) modernWaterMesh.visible = false;
    if (vehInstanced) vehInstanced.visible = false;
    if (intersectionMeshes && intersectionMeshes.length) {
      intersectionMeshes.forEach(m => { if (m) m.visible = false; });
    }

    // Mantener árboles reales y zonas verdes visibles
    if (treeMesh) treeMesh.visible = true;
    if (modernParquesMesh) modernParquesMesh.visible = true;

    cowsGroup.visible = true;
    historicalWetlandsGroup.visible = true;
    userPlantedGroup.visible = true;
    customPolysGroup.visible = true;

    if (groundMesh && groundMesh.material) {
      if (groundMesh.material.map !== histGrassTex) {
        groundMesh.material.map = histGrassTex;
        groundMesh.material.needsUpdate = true;
      }
      groundMesh.material.color.setHex(0xd6d8cf);
      groundMesh.material.opacity = 0.92;
      groundMesh.material.transparent = true;
    }

    if (year === 1950) {
      setBuildingFraction(0); setEraNota("");
      if (badge) badge.textContent = "1950 · Sabana Rural";
      if (desc) desc.textContent = "1950 · Humedal El Burro (171 ha), La Vaca (181 ha) y Sabana Rural con 210 vacas en pastoreo y senderos veredales.";
      cowsGroup.visible = true;
      historicalWetlandsGroup.visible = true;
      aeropuertoTechoGroup.visible = false;
      corabastosGroup.visible = false;
      roads1972Group.visible = false;
      avCaliGroup.visible = false;
      protechoGroup.visible = false;

      if (rawWaterData) buildHistoricalWetlands(rawWaterData, 1950);

      if (animateCam) {
        transitionCameraTo(
          new THREE.Vector3(117.21, 724.68, 628.88),
          new THREE.Vector3(219.64, -56.32, -92.84),
          1.95,
          2000
        );
      }
    } else if (year === 1956) {
      setBuildingFraction(0); setEraNota("");
      if (badge) badge.textContent = "1956 · Aeropuerto Techo";
      if (desc) desc.textContent = "1956 · Humedal La Vaca y Laguna de Techo extendidos hacia El Burro, Antiguo Aeropuerto de Techo con pista y vías de conexión.";
      cowsGroup.visible = true;
      historicalWetlandsGroup.visible = true;
      aeropuertoTechoGroup.visible = true;
      corabastosGroup.visible = false;
      roads1972Group.visible = false;
      avCaliGroup.visible = false;
      protechoGroup.visible = false;

      if (rawWaterData) buildHistoricalWetlands(rawWaterData, 1956);

      if (animateCam) {
        transitionCameraTo(
          new THREE.Vector3(50.39, 695.32, 825.02),
          new THREE.Vector3(171.99, -60.08, 79.42),
          2.23,
          2400
        );
      }
    } else if (year === 1972) {
      setBuildingFraction(BUILDING_FRACTION[1972]); setEraNota(NOTA_EDIFICIOS(12));
      if (badge) badge.textContent = "1972 · Corabastos";
      if (desc) desc.textContent = "1972 · Inauguración de Corabastos en Potrero Alto Negro y acceso por Av. Las Américas. Humedales reducidos a 38,5 ha.";
      cowsGroup.visible = true;
      historicalWetlandsGroup.visible = true;
      aeropuertoTechoGroup.visible = false;
      corabastosGroup.visible = true;
      roads1972Group.visible = true;
      avCaliGroup.visible = false;
      protechoGroup.visible = false;

      if (rawWaterData) buildHistoricalWetlands(rawWaterData, 1972);

      if (animateCam) {
        transitionCameraTo(
          new THREE.Vector3(135.0, 710.0, 690.0),
          new THREE.Vector3(240.0, -30.0, 35.0),
          1.80,
          2200
        );
      }
    } else if (year === 1988) {
      setBuildingFraction(BUILDING_FRACTION[1988]); setEraNota(NOTA_EDIFICIOS(40));
      if (badge) badge.textContent = "1988 · Bisección Av. Cali";
      if (desc) desc.textContent = "1988 · Construcción de Av. Ciudad de Cali que divide el humedal en dos sectores y Planta de basuras Protecho (EDIS).";
      cowsGroup.visible = true;
      historicalWetlandsGroup.visible = true;
      aeropuertoTechoGroup.visible = false;
      corabastosGroup.visible = true;
      roads1972Group.visible = true;
      avCaliGroup.visible = true;
      protechoGroup.visible = true;

      if (rawWaterData) buildHistoricalWetlands(rawWaterData, 1988);

      if (animateCam) {
        transitionCameraTo(
          new THREE.Vector3(155.0, 680.0, 620.0),
          new THREE.Vector3(210.0, -25.0, -10.0),
          1.75,
          2200
        );
      }
    } else if (year >= 2024) {
      setBuildingFraction(1); setEraNota("");
      if (badge) badge.textContent = "Actualidad (2024)";
      if (desc) desc.textContent = "Actualidad · Modelo axonométrico arquitectónico urbano completo de Kennedy con el Humedal El Burro protegido de 18,8 ha.";
      
      if (currentBuildingMesh) currentBuildingMesh.visible = true;
      if (buildingEdgeMat) buildingEdgeMat.visible = true;
      if (modernBuildingEdges) modernBuildingEdges.visible = true;
      if (modernRoadLines) modernRoadLines.visible = true;
      if (modernRoadMesh) modernRoadMesh.visible = true;
      if (modernManzanasMesh) modernManzanasMesh.visible = true;
      if (modernFacadesMesh) modernFacadesMesh.visible = true;
      if (elBurroMesh) elBurroMesh.visible = true;
      if (modernWaterMesh) modernWaterMesh.visible = true;
      if (modernParquesMesh) modernParquesMesh.visible = true;
      if (treeMesh) treeMesh.visible = true;
      if (vehInstanced) vehInstanced.visible = true;

      cowsGroup.visible = false;
      historicalWetlandsGroup.visible = false;
      aeropuertoTechoGroup.visible = false;
      corabastosGroup.visible = false;
      roads1972Group.visible = false;
      avCaliGroup.visible = false;
      protechoGroup.visible = false;

      if (groundMesh && groundMesh.material) {
        groundMesh.material.map = null;
        groundMesh.material.color.setHex(0xebedee);
        groundMesh.material.opacity = 1.0;
        groundMesh.material.transparent = false;
        groundMesh.material.needsUpdate = true;
      }

      if (animateCam) {
        transitionCameraTo(
          new THREE.Vector3(17.6, 630.7, 713.9),
          new THREE.Vector3(139.2, -124.7, -31.7),
          1.30,
          2200
        );
      }
    }
  }

  // Función de vista inicial en Humedal El Burro (1950)
  function setAxonometricView(distance) {
    camera.position.set(117.21, 724.68, 628.88);
    controls.target.set(219.64, -56.32, -92.84);
    camera.zoom = 1.95;
    camera.updateProjectionMatrix();
    controls.update();
    if (typeof updateLiveCameraCoordsUI === "function") updateLiveCameraCoordsUI();
  }

  // Preset Buttons
  function setActivePreset(activeBtn) {
    document.querySelectorAll(".preset-btn").forEach(b => {
      if (b.id !== "perspToggle") b.classList.remove("active");
    });
    if (activeBtn) activeBtn.classList.add("active");
  }

  const btnViewOverview = document.getElementById("btnViewOverview");
  if (btnViewOverview) {
    btnViewOverview.addEventListener("click", () => {
      setActivePreset(btnViewOverview);
      transitionCameraTo(
        new THREE.Vector3(117.21, 724.68, 628.88),
        new THREE.Vector3(219.64, -56.32, -92.84),
        1.35,
        1800
      );
    });
  }

  const btnViewBurro = document.getElementById("btnViewBurro");
  if (btnViewBurro) {
    btnViewBurro.addEventListener("click", () => {
      setActivePreset(btnViewBurro);
      transitionCameraTo(
        new THREE.Vector3(117.21, 724.68, 628.88),
        new THREE.Vector3(219.64, -56.32, -92.84),
        2.25,
        1800
      );
    });
  }

  const btnViewTecho = document.getElementById("btnViewTecho");
  if (btnViewTecho) {
    btnViewTecho.addEventListener("click", () => {
      setActivePreset(btnViewTecho);
      transitionCameraTo(
        new THREE.Vector3(50.39, 695.32, 825.02),
        new THREE.Vector3(171.99, -60.08, 79.42),
        2.23,
        2000
      );
    });
  }

  // 7. Event listeners de la línea de tiempo histórica
  document.querySelectorAll(".year-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      setHistoricalYear(parseInt(btn.dataset.year, 10), true);
    });
  });

  const histYears = [1950, 1956, 1972, 1988, 2024];
  const histSlider = document.getElementById("histYearSlider");
  if (histSlider) {
    histSlider.addEventListener("input", () => {
      const idx = parseInt(histSlider.value, 10);
      const y = histYears[idx] || 1950;
      setHistoricalYear(y, true);
    });
  }

  let histPlaying = false, histPlayTimer = null;
  const histPlayBtn = document.getElementById("histPlayPause");
  if (histPlayBtn) {
    histPlayBtn.addEventListener("click", () => {
      histPlaying = !histPlaying;
      histPlayBtn.innerHTML = histPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
      if (histPlaying) {
        histPlayTimer = setInterval(() => {
          const curIdx = histYears.indexOf(currentHistoricalYear);
          const nextIdx = (curIdx + 1) % histYears.length;
          setHistoricalYear(histYears[nextIdx], true);
        }, 5500);
      } else {
        clearInterval(histPlayTimer);
      }
    });
  }



  

  // ---- Red vial: una sola geometria de lineas fusionada (19 mil tramos,
  // asi que se combina TODO en un unico BufferGeometry por rendimiento) ----
  function buildRoads(edges) {
    const positions = [];
    edges.forEach(([kind, pts]) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const a = toScene(pts[i][0], pts[i][1]);
        const b = toScene(pts[i + 1][0], pts[i + 1][1]);
        positions.push(a.x, 0, a.z, b.x, 0, b.z);
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({ color: 0x4a545e, transparent: true, opacity: 0.85 });
    const lines = new THREE.LineSegments(geo, mat);
    modernRoadLines = lines;
    if (currentHistoricalYear <= 1956) lines.visible = false;
    sceneRoot.add(lines);

    // Segunda capa mas gruesa "de asfalto" usando una tira continua con
    // UNION DE ESQUINA (miter) en cada vertice interior — se promedia la
    // normal de los dos segmentos que se juntan ahi (en vez de tratar cada
    // segmento como un rectangulo independiente), para que las curvas
    // queden con un borde continuo y suave, sin muescas/quiebres.
    const ribbonGeo = new THREE.BufferGeometry();
    const ribbonPos = [];
    const ribbonUv = [];
    const RIBBON_UV_SCALE = 0.06;
    const HALF_W = 0.9;
    edges.forEach(([kind, pts], edgeIdx) => {
      // Desfase de altura MUY pequeno por via (no por segmento, para que
      // cada via quede perfectamente plana a lo largo de si misma), asi
      // las vias que se cruzan en una interseccion no quedan EXACTAMENTE
      // coplanares (evita z-fighting). El rango es minusculo para que no
      // se note como un "escalon" entre una via y la siguiente.
      const yJitter = 0.03 + ((edgeIdx * 2654435761) % 1000) / 1000 * 0.006;
      const n = pts.length;
      if (n < 2) return;
      const scenePts = pts.map(p => toScene(p[0], p[1]));
      const segNormal = (p, q) => {
        const dx = q.x - p.x, dz = q.z - p.z;
        const len = Math.hypot(dx, dz) || 0.001;
        return { x: -dz / len, z: dx / len };
      };
      const vertNormals = new Array(n);
      for (let i = 0; i < n; i++) {
        if (i === 0) { vertNormals[i] = segNormal(scenePts[0], scenePts[1]); continue; }
        if (i === n - 1) { vertNormals[i] = segNormal(scenePts[n - 2], scenePts[n - 1]); continue; }
        const n1 = segNormal(scenePts[i - 1], scenePts[i]);
        const n2 = segNormal(scenePts[i], scenePts[i + 1]);
        let ax = n1.x + n2.x, az = n1.z + n2.z;
        const alen = Math.hypot(ax, az);
        if (alen < 0.05) { vertNormals[i] = n1; continue; } // giro casi en U, evitar division por ~0
        ax /= alen; az /= alen;
        const cosHalf = Math.max(ax * n1.x + az * n1.z, 0.25); // limitar el miter en angulos muy agudos
        vertNormals[i] = { x: ax / cosHalf, z: az / cosHalf };
      }
      for (let i = 0; i < n - 1; i++) {
        const a = scenePts[i], b = scenePts[i + 1];
        const na = vertNormals[i], nb = vertNormals[i + 1];
        const ax = na.x * HALF_W, az = na.z * HALF_W;
        const bx = nb.x * HALF_W, bz = nb.z * HALF_W;
        ribbonPos.push(
          a.x - ax, yJitter, a.z - az, a.x + ax, yJitter, a.z + az, b.x + bx, yJitter, b.z + bz,
          a.x - ax, yJitter, a.z - az, b.x + bx, yJitter, b.z + bz, b.x - bx, yJitter, b.z - bz
        );
        [
          [a.x - ax, a.z - az], [a.x + ax, a.z + az], [b.x + bx, b.z + bz],
          [a.x - ax, a.z - az], [b.x + bx, b.z + bz], [b.x - bx, b.z - bz],
        ].forEach(([px, pz]) => ribbonUv.push(px * RIBBON_UV_SCALE, pz * RIBBON_UV_SCALE));
      }
    });
    ribbonGeo.setAttribute("position", new THREE.Float32BufferAttribute(ribbonPos, 3));
    ribbonGeo.setAttribute("uv", new THREE.Float32BufferAttribute(ribbonUv, 2));
    ribbonGeo.computeVertexNormals();
    const viaTex = new THREE.TextureLoader().load("./assets/textura_via.jpg");
    viaTex.wrapS = THREE.RepeatWrapping;
    viaTex.wrapT = THREE.RepeatWrapping;
    const ribbonMat = new THREE.MeshStandardMaterial({
      map: viaTex, color: 0xb7babd, roughness: 0.85, side: THREE.DoubleSide,
      transparent: true, opacity: 0.7,
    });
    roadMat = ribbonMat;
    const roadMesh = new THREE.Mesh(ribbonGeo, ribbonMat);
    modernRoadMesh = roadMesh;
    if (currentHistoricalYear <= 1956) roadMesh.visible = false;
    roadMesh.receiveShadow = true;
    sceneRoot.add(roadMesh);
  }

  // ---- Edificios: extrusion de cada huella (paredes + techo), TODO
  // fusionado en una sola geometria por rendimiento (143 mil edificios). ----
  // Desplaza cada vertice de un anillo cerrado (poligono con el primer
  // punto repetido al final) hacia ADENTRO una distancia fija, usando el
  // promedio de las normales de los 2 segmentos que se juntan en cada
  // vertice (mismo criterio de "miter" que ya se uso en las vias), para
  // que las esquinas no se deformen. Devuelve un anillo del mismo tamano
  // (tambien cerrado).
  // Area con signo de un anillo cerrado (formula shoelace) - se usa para
  // detectar si el anillo interior (offset) se invirtio por ser el
  // edificio demasiado chico para el offset pedido.
  function signedArea(pts) {
    let a = 0;
    for (let i = 0; i < pts.length - 1; i++) a += pts[i].x * pts[i + 1].z - pts[i + 1].x * pts[i].z;
    return a / 2;
  }

  function insetRing(pts, dist) {
    const m = pts.length - 1;
    if (m < 3) return pts.slice();
    const segNormalIn = (p, q) => {
      const dx = q.x - p.x, dz = q.z - p.z, len = Math.hypot(dx, dz) || 0.001;
      return { x: -dz / len, z: dx / len }; // hacia adentro (opuesta a la de pared)
    };
    const out = new Array(m);
    for (let i = 0; i < m; i++) {
      const prev = (i - 1 + m) % m, next = (i + 1) % m;
      const n1 = segNormalIn(pts[prev], pts[i]);
      const n2 = segNormalIn(pts[i], pts[next]);
      let ax = n1.x + n2.x, az = n1.z + n2.z;
      const alen = Math.hypot(ax, az);
      let nx, nz;
      if (alen < 0.05) { nx = n1.x; nz = n1.z; }
      else {
        ax /= alen; az /= alen;
        const cosHalf = Math.max(ax * n1.x + az * n1.z, 0.25);
        nx = ax / cosHalf; nz = az / cosHalf;
      }
      out[i] = { x: pts[i].x + nx * dist, z: pts[i].z + nz * dist };
    }
    out.push(out[0]);
    return out;
  }

  let currentBuildingMesh = null;
  let buildingRanges = [];
  let buildingStarts = [];
  // Crecimiento de la ciudad: los edificios son los reales del conjunto de datos, ordenados del antiguo
  // aeropuerto de Techo (donde se levanto Ciudad Techo) hacia afuera, y se muestran por tramos segun la epoca.
  // Los datos no traen el anio de construccion de cada edificio: es una aproximacion, no una fecha por edificio.
  let buildingGrowthVert = [], buildingGrowthEdge = [];
  const BUILDING_FRACTION = { 1950: 0, 1956: 0, 1972: 0.12, 1988: 0.40, 2024: 1 };
  function fraccionEdificios(year) { return year >= 2024 ? 1 : (BUILDING_FRACTION[year] || 0); }
  function nucleoCrecimiento() {
    let x = 0, z = 0;
    AEROPUERTO_RUNWAY_PTS.forEach(p => { x += p.x; z += p.z; });
    return { x: x / AEROPUERTO_RUNWAY_PTS.length, z: z / AEROPUERTO_RUNWAY_PTS.length };
  }
  function setBuildingFraction(f) {
    if (!currentBuildingMesh || !buildingGrowthVert.length) return;
    const n = Math.floor(buildingGrowthVert.length * f);
    currentBuildingMesh.visible = n > 0;
    currentBuildingMesh.geometry.setDrawRange(0, n ? buildingGrowthVert[n - 1] : 0);
    if (modernBuildingEdges) {
      modernBuildingEdges.visible = n > 0;
      modernBuildingEdges.geometry.setDrawRange(0, n ? buildingGrowthEdge[n - 1] : 0);
    }
  }
  function setEraNota(t) { const el = document.getElementById("eraNota"); if (el) el.textContent = t || ""; }
  const NOTA_EDIFICIOS = pct => "Edificios reales de Kennedy mostrados de a poco (" + pct + " % de los " + "243.538" + "), ordenados por cercan\u00eda al antiguo aeropuerto de Techo. Los datos no traen el a\u00f1o de construcci\u00f3n de cada edificio: es una aproximaci\u00f3n.";
  window.__estadoHistorico = () => ({
    anio: currentHistoricalYear,
    edificiosVisibles: currentBuildingMesh ? Math.floor(buildingGrowthVert.length * (currentBuildingMesh.visible ? 1 : 0)) : 0,
    edificiosTotales: buildingGrowthVert.length,
    rangoDibujo: currentBuildingMesh ? currentBuildingMesh.geometry.drawRange.count : null,
    mallaVisible: currentBuildingMesh ? currentBuildingMesh.visible : null,
    vacas: cowsGroup.children.length, vacasVisibles: cowsGroup.visible,
    notaEdificios: (document.getElementById("eraNota") || {}).textContent || "",
    volumenesInventados: corabastosGroup.children.length + protechoGroup.children.length
  });
  let selectedBuildingRange = null;
  let customBuildingColorsMap = {};

  function buildBuildings(buildings) {
    const positions = [];
    const normals = [];
    const colors = [];
    const edgePositions = [];
    buildingRanges = [];
    buildingStarts = [];

    let vertexOffset = 0;
    buildingGrowthVert = []; buildingGrowthEdge = [];
    const nuc = nucleoCrecimiento(), dist = new Float64Array(buildings.length);
    buildings.forEach((b, i) => { const q = b.pts[0] ? toScene(b.pts[0][0], b.pts[0][1]) : { x: 0, z: 0 }; dist[i] = Math.hypot(q.x - nuc.x, q.z - nuc.z); });
    const orden = Array.from(buildings.keys()).sort((a, b) => dist[a] - dist[b]);

    orden.forEach((idx) => {
      const b = buildings[idx];
      const pts = b.pts.map(p => toScene(p[0], p[1]));
      const h = b.h * SCALE;
      if (pts.length < 4) return;

      const startV = vertexOffset;
      const bldgId = `bldg_${idx + 1}`;
      const userHex = customBuildingColorsMap[bldgId] || "#ffffff";
      const c = new THREE.Color(userHex);

      let bVertCount = 0;

      // Paredes: 2 triángulos (6 vértices) por cada segmento del perímetro
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], cSeg = pts[i + 1];
        const dx = cSeg.x - a.x, dz = cSeg.z - a.z;
        const len = Math.hypot(dx, dz) || 0.001;
        const nx = dz / len, nz = -dx / len;

        positions.push(
          a.x, 0, a.z,  cSeg.x, 0, cSeg.z,  cSeg.x, h, cSeg.z,
          a.x, 0, a.z,  cSeg.x, h, cSeg.z,  a.x, h, a.z
        );
        for (let k = 0; k < 6; k++) {
          normals.push(nx, 0, nz);
          colors.push(c.r, c.g, c.b);
        }
        bVertCount += 6;
        edgePositions.push(a.x, h, a.z, cSeg.x, h, cSeg.z);
      }

      // Techo: triangulación del polígono superior en la altura h
      const pts2d = pts.map(p => new THREE.Vector2(p.x, p.z));
      let tris;
      try { tris = THREE.ShapeUtils.triangulateShape(pts2d, []); }
      catch (e) { tris = []; }

      tris.forEach(([ia, ib, ic]) => {
        positions.push(
          pts[ia].x, h, pts[ia].z,
          pts[ib].x, h, pts[ib].z,
          pts[ic].x, h, pts[ic].z
        );
        for (let k = 0; k < 3; k++) {
          normals.push(0, 1, 0);
          colors.push(c.r, c.g, c.b);
        }
        bVertCount += 3;
      });

      vertexOffset += bVertCount;
      buildingRanges.push({
        id: bldgId,
        index: idx,
        start: startV,
        count: bVertCount,
        colorHex: userHex,
        hMeters: b.h
      });
      buildingStarts.push(startV);
      buildingGrowthVert.push(vertexOffset);
      buildingGrowthEdge.push(edgePositions.length / 3);
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.6,
      metalness: 0.03,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 2,
      polygonOffsetUnits: 2,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    currentBuildingMesh = mesh;
    sceneRoot.add(mesh);

    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute("position", new THREE.Float32BufferAttribute(edgePositions, 3));
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x2b2e33, transparent: true, opacity: 0.14 });
    buildingEdgeMat = edgeMat;
    const edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);
    modernBuildingEdges = edgeLines;
    sceneRoot.add(edgeLines);
    setBuildingFraction(fraccionEdificios(currentHistoricalYear));
  }

  function findBuildingByVertexIndex(vIdx) {
    if (!buildingStarts.length) return null;
    let lo = 0, hi = buildingStarts.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const st = buildingStarts[mid];
      const count = buildingRanges[mid].count;
      if (vIdx >= st && vIdx < st + count) {
        return buildingRanges[mid];
      }
      if (vIdx < st) hi = mid - 1;
      else lo = mid + 1;
    }
    return null;
  }

  function updateBuildingColorOutput() {
    const outputEl = document.getElementById("buildingColorConfigOutput");
    if (!outputEl) return;
    const keys = Object.keys(customBuildingColorsMap);
    const nl = String.fromCharCode(10);
    if (!keys.length) {
      outputEl.value = "// === CAMBIOS DE COLOR DE EDIFICIOS ===" + nl + "const BUILDING_COLORS = {};";
      return;
    }
    const lines = ["// === CAMBIOS DE COLOR DE EDIFICIOS ===", "const BUILDING_COLORS = {"];
    keys.forEach((k, i) => {
      lines.push('  "' + k + '": "' + customBuildingColorsMap[k] + '"' + (i < keys.length - 1 ? ',' : ''));
    });
    lines.push("};");
    outputEl.value = lines.join(nl);
  }

  function setBuildingColor(range, hexColor) {
    if (!currentBuildingMesh) return;
    const c = new THREE.Color(hexColor);
    const colorAttr = currentBuildingMesh.geometry.attributes.color;
    for (let i = range.start; i < range.start + range.count; i++) {
      colorAttr.setXYZ(i, c.r, c.g, c.b);
    }
    colorAttr.needsUpdate = true;
    range.colorHex = hexColor;
    if (hexColor === "#ffffff") {
      delete customBuildingColorsMap[range.id];
    } else {
      customBuildingColorsMap[range.id] = hexColor;
    }
    updateBuildingColorOutput();
  }

  function showBuildingEditor(range) {
    selectedBuildingRange = range;
    const info = document.getElementById("buildingInfo");
    const title = document.getElementById("buildingInfoTitle");
    const details = document.getElementById("buildingInfoDetails");
    const customPicker = document.getElementById("buildingCustomColorPicker");
    if (!info) return;

    if (title) title.textContent = `Edificio #${range.index + 1}`;
    if (details) details.textContent = `Altura: ${range.hMeters.toFixed(1)} m · ID: ${range.id}`;
    if (customPicker) customPicker.value = range.colorHex;
    updateBuildingColorOutput();
    info.classList.add("show");
  }

  function hideBuildingEditor() {
    selectedBuildingRange = null;
    const info = document.getElementById("buildingInfo");
    if (info) info.classList.remove("show");
  }

  function loadBuildings() {
    return fetch(BUILDINGS_URL)
      .then(r => { if (!r.ok) throw new Error("no se pudo cargar " + BUILDINGS_URL); return r.json(); })
      .then(data => { buildBuildings(data); })
      .catch(err => console.warn("No se pudieron cargar los edificios:", err));
  }

  // ---- Arboles: se dibujan como "billboards cruzados" (2 tarjetas
  // perpendiculares) con una foto real de un arbol (fondo quitado),
  // en vez de una textura dibujada o geometria 3D solida. ----

  // Geometria de una sola tarjeta (plano vertical). Como la camara esta
  // fija a 45° de elevacion (solo gira horizontalmente alrededor), esta
  // tarjeta se reorienta para mirar siempre hacia la camara (billboard
  // real, no un cruce estatico de 2-3 planos que deja ver una "X" desde
  // ciertos angulos).
  function makePlaneGeometry() {
    const geo = new THREE.BufferGeometry();
    const positions = [-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0];
    const uvs = [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1];
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.computeVertexNormals();
    return geo;
  }

  let treeMeshes = [];
  let treeInstanceData = null; // {x,z,w,h} por instancia, para recalcular el billboard al girar la camara
  let treeMesh = null; // la tarjeta con la foto (para el detalle realista)
  function makePlaneGeometry() {
    const geo = new THREE.BufferGeometry();
    const positions = [-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0];
    const uvs = [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1];
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.computeVertexNormals();
    return geo;
  }
  function buildTrees(trees) {
    const treeTex = new THREE.TextureLoader().load("./assets/arbol_real4.png");
    // Tarjeta plana (billboard) con la foto real completa (ya incluye
    // tronco y copa) — se pidio que se vea igual que la foto, no un
    // volumen 3D armado con esfera+cilindro por separado, que se veia
    // raro con esta imagen especifica. La tarjeta se reorienta para
    // mirar siempre hacia la camara (ver updateTreeBillboards), y como
    // la camara es ortografica y esta fija a 45°, un solo angulo sirve
    // para las 120 mil instancias.
    const planeGeo = makePlaneGeometry();
    const mat = new THREE.MeshStandardMaterial({
      map: treeTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.95,
    });
    const mesh = new THREE.InstancedMesh(planeGeo, mat, trees.length);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(trees.length * 3), 3);
    mesh.castShadow = false;
    treeMesh = mesh;

    treeInstanceData = new Array(trees.length);
    const colorAlimento1 = new THREE.Color(0xd08a9e); // Cerezo
    const colorAlimento2 = new THREE.Color(0x9c86b8); // Sauco
    const colorDescanso = new THREE.Color(0x7fb59f);  // Urapan
    const colorNormal = new THREE.Color(0xffffff);
    
    trees.forEach((t, i) => {
      const [x, y, hMeters, especieStr, code] = t;
      const p = toScene(x, y);

      // Quitar árboles que caen sobre la pista o la vía del aeropuerto
      if (typeof isPointInRunway === "function" && (isPointInRunway(p.x, p.z) || isPointNearRoad(p.x, p.z, 3.8))) {
        treeInstanceData[i] = { x: p.x, z: p.z, w: 0, h: 0, baseScale: 0, removed: true };
        mesh.setColorAt(i, new THREE.Color(0x000000));
        return;
      }

      const h = Math.max(0.3, hMeters * SCALE);
      const w = h * (1.1 + (hash2(code) % 20) / 100 - 0.1);
      const baseVar = 0.95 + ((hash2(code + "v") % 25) / 100);
      treeInstanceData[i] = { x: p.x, z: p.z, w, h, baseScale: baseVar, removed: false };
      
      let c = colorNormal;
      if (especieStr.includes("Sauco")) c = colorAlimento2;
      else if (especieStr.includes("capuli")) c = colorAlimento1;
      else if (especieStr.includes("Fresno") || especieStr.includes("Urap")) c = colorDescanso;
      
      mesh.setColorAt(i, c);
    });
    mesh.instanceColor.needsUpdate = true;
    sceneRoot.add(mesh);
    treeMeshes = [{ mesh, data: trees }];
    pickProminentTrees(24);
    updateTreeBillboards();
  }
  // Control de árboles grandes destacados individuales (~24 aleatorios)
  let prominentTreeIndices = new Set();
  let prominentTreeScale = 2.2;

  function pickProminentTrees(count = 24) {
    prominentTreeIndices.clear();
    if (!treeInstanceData || !treeInstanceData.length) return;
    const total = treeInstanceData.length;
    const targetCount = Math.min(count, total);
    while (prominentTreeIndices.size < targetCount) {
      const idx = Math.floor(Math.random() * total);
      if (!treeInstanceData[idx].removed) {
        prominentTreeIndices.add(idx);
      }
    }
    updateTreeBillboards();
  }

  // Recalcula la rotacion y escala individual de las tarjetas de arboles
  const dummyT = new THREE.Object3D();
  function updateTreeBillboards() {
    if (!treeMesh || !treeInstanceData) return;
    const dx = camera.position.x - controls.target.x, dz = camera.position.z - controls.target.z;
    const faceAngle = Math.atan2(dx, dz);
    for (let i = 0; i < treeInstanceData.length; i++) {
      const d = treeInstanceData[i];
      if (d.removed || d.h === 0) {
        dummyT.position.set(0, -9999, 0);
        dummyT.scale.set(0, 0, 0);
        dummyT.updateMatrix();
        treeMesh.setMatrixAt(i, dummyT.matrix);
        continue;
      }
      const isProminent = prominentTreeIndices.has(i);
      const s = isProminent ? prominentTreeScale : (d.baseScale || 1.0);
      dummyT.position.set(d.x, 0, d.z);
      dummyT.scale.set(d.w * s, d.h * s, d.w * s);
      dummyT.rotation.set(0, faceAngle, 0);
      dummyT.updateMatrix();
      treeMesh.setMatrixAt(i, dummyT.matrix);
    }
    treeMesh.instanceMatrix.needsUpdate = true;
  }
  function hash2(str) { let h = 0; for (const c of (str || "")) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }

  function loadTrees() {
    return fetch(TREES_URL)
      .then(r => { if (!r.ok) throw new Error("no se pudo cargar " + TREES_URL); return r.json(); })
      .then(data => {
        buildTrees(data);
        birdTreesGrid = buildBirdTreeGrid(sampleAttractorTrees(data));
      })
      .catch(err => console.warn("No se pudieron cargar los árboles:", err));
  }

  // ---- Mapa de ruido REAL en vivo: igual que en el modulo 8 en 2D
  // (modulo-08-noise.js -> computeNoiseField), se recalcula en cada
  // instante de la simulacion a partir de donde estan los vehiculos DE
  // VERDAD en ese momento (no un valor fijo por via) — manchas de
  // intensidad alrededor de cada carro, acumuladas con "lighter" en un
  // canvas, luego coloreadas amarillo->rojo con el MISMO alpha fijo
  // (0.42) que en 2D, sin importar el nivel. Empieza oculto.
  const NOISE_ALPHA = 0.42;
  const NOISE_BUF_W = 260, NOISE_BUF_H = 180; // resolucion baja a proposito, mancha continua no puntos
  const NOISE_COLOR_STOPS = [
    { t: 0.00, rgb: [255, 247, 179] }, { t: 0.20, rgb: [255, 224, 76] },
    { t: 0.40, rgb: [255, 179, 77] }, { t: 0.60, rgb: [245, 124, 0] },
    { t: 0.80, rgb: [230, 74, 25] }, { t: 1.00, rgb: [211, 47, 47] },
  ];
  function noiseColorAt(t) {
    t = Math.max(0, Math.min(1, t));
    for (let i = 0; i < NOISE_COLOR_STOPS.length - 1; i++) {
      const a = NOISE_COLOR_STOPS[i], b = NOISE_COLOR_STOPS[i + 1];
      if (t >= a.t && t <= b.t) {
        const f = (t - a.t) / (b.t - a.t || 1);
        return [Math.round(a.rgb[0] + (b.rgb[0] - a.rgb[0]) * f), Math.round(a.rgb[1] + (b.rgb[1] - a.rgb[1]) * f), Math.round(a.rgb[2] + (b.rgb[2] - a.rgb[2]) * f)];
      }
    }
    return NOISE_COLOR_STOPS[NOISE_COLOR_STOPS.length - 1].rgb;
  }
  let noiseMesh = null, noiseTexture = null, noiseGroundW = 0, noiseGroundH = 0, noiseOriginX = 0, noiseOriginY = 0;
  const noiseBufCanvas = document.createElement("canvas");
  noiseBufCanvas.width = NOISE_BUF_W; noiseBufCanvas.height = NOISE_BUF_H;
  const noiseBufCtx = noiseBufCanvas.getContext("2d", { willReadFrequently: true });
  let noiseFieldImg = null; // se reusa para que las mirlas lean el mismo campo real
  function buildNoiseGround(bbox) {
    noiseOriginX = bbox[0]; noiseOriginY = bbox[1];
    noiseGroundW = bbox[2] - bbox[0]; noiseGroundH = bbox[3] - bbox[1];
    const c0 = toScene(bbox[0], bbox[1]), c1 = toScene(bbox[2], bbox[3]);
    const w = Math.abs(c1.x - c0.x), h = Math.abs(c1.z - c0.z);
    const geo = new THREE.PlaneGeometry(w, h);
    noiseTexture = new THREE.CanvasTexture(noiseBufCanvas);
    const mat = new THREE.MeshBasicMaterial({ map: noiseTexture, transparent: true, opacity: 1, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set((c0.x + c1.x) / 2, 0.06, (c0.z + c1.z) / 2);
    mesh.visible = false;
    sceneRoot.add(mesh);
    noiseMesh = mesh;
  }
  // Radio de mancha por vehiculo (metros reales) — como no se tiene aqui
  // la clasificacion local/mid/major por cercania a cada vehiculo (si en
  // 2D), se usa un radio intermedio razonable, igual para todos.
  const NOISE_VEH_RADIUS_M = 55;
  let lastNoiseCompute = 0;
  function computeLiveNoiseField(vehicles, now) {
    if (!noiseGroundW || (now - lastNoiseCompute < 140)) return;
    lastNoiseCompute = now;
    noiseBufCtx.clearRect(0, 0, NOISE_BUF_W, NOISE_BUF_H);
    noiseBufCtx.globalCompositeOperation = "lighter";
    const sx = NOISE_BUF_W / noiseGroundW, sy = NOISE_BUF_H / noiseGroundH;
    const blobR = NOISE_VEH_RADIUS_M * sx;
    vehicles.forEach(v => {
      const bx = (v.x - noiseOriginX) * sx, by = NOISE_BUF_H - (v.y - noiseOriginY) * sy;
      const grad = noiseBufCtx.createRadialGradient(bx, by, 0, bx, by, blobR);
      grad.addColorStop(0, "rgba(255,255,255,0.9)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      noiseBufCtx.fillStyle = grad;
      noiseBufCtx.beginPath(); noiseBufCtx.arc(bx, by, blobR, 0, Math.PI * 2); noiseBufCtx.fill();
    });
    noiseBufCtx.globalCompositeOperation = "source-over";
    const img = noiseBufCtx.getImageData(0, 0, NOISE_BUF_W, NOISE_BUF_H);
    const data = img.data;
    for (let i = 0; i < data.length; i += 4) {
      const intensity = data[i + 3] / 255;
      if (intensity < 0.02) { data[i + 3] = 0; continue; }
      const t = Math.min(1, Math.pow(intensity, 2.4));
      const [r, g, b] = noiseColorAt(t);
      data[i] = r; data[i + 1] = g; data[i + 2] = b;
      data[i + 3] = Math.round(NOISE_ALPHA * 255); // alpha SIEMPRE el mismo, solo cambia el color
    }
    noiseFieldImg = img;
    if (noiseMesh && noiseMesh.visible) {
      noiseBufCtx.putImageData(img, 0, 0);
      noiseTexture.needsUpdate = true;
    }
  }
  // Lectura del campo real en un punto del mundo (mismas coordenadas que
  // usan los arboles/mirlas), para que las mirlas huyan del ruido de
  // donde estan los carros DE VERDAD en este instante, no un valor fijo.
  const NOISE_DB_BASE = 40, NOISE_DB_SPAN = 52;
  function noiseDbAt(x, y) {
    if (!noiseFieldImg || !noiseGroundW) return NOISE_DB_BASE;
    const bx = Math.floor(((x - noiseOriginX) / noiseGroundW) * NOISE_BUF_W);
    const by = Math.floor(NOISE_BUF_H - ((y - noiseOriginY) / noiseGroundH) * NOISE_BUF_H);
    if (bx < 0 || by < 0 || bx >= NOISE_BUF_W || by >= NOISE_BUF_H) return NOISE_DB_BASE;
    const idx = (by * NOISE_BUF_W + bx) * 4;
    const raw = noiseFieldImg.data[idx + 3] / 255; // el alpha ya no sirve de intensidad (quedo fijo); se usa el brillo del color en su lugar
    const bright = (noiseFieldImg.data[idx] + noiseFieldImg.data[idx + 1] + noiseFieldImg.data[idx + 2]) / (3 * 255);
    if (raw < 0.01) return NOISE_DB_BASE;
    // mientras mas cerca de rojo (stop final), mas alto: se aproxima con
    // la distancia de color a "amarillo claro" (stop inicial, ruido bajo).
    const t = 1 - bright; // aprox: colores mas oscuros/rojos = mas ruido
    return NOISE_DB_BASE + NOISE_DB_SPAN * Math.max(0, Math.min(1, t * 1.6));
  }
  function noiseEscapeDir(x, y) {
    const paso = (noiseGroundW / NOISE_BUF_W) * 3;
    const gx = noiseDbAt(x + paso, y) - noiseDbAt(x - paso, y);
    const gy = noiseDbAt(x, y + paso) - noiseDbAt(x, y - paso);
    const m = Math.hypot(gx, gy);
    if (m < 1e-4) return null;
    return [-gx / m, -gy / m];
  }

  // ============================================================
  // MIRLAS (Turdus fuscater) — puerto fiel de la simulacion real de
  // agentes que ya existe en 2D (modulo-08-sumo.js): aves que se
  // desplazan de oriente (Cerros Orientales) a occidente (humedales),
  // atraidas por arboles reales de 3 especies (Sauco, Cerezo/capuli,
  // Urapan-Fresno) del Arbolado Urbano real de Kennedy, huyendo de las
  // zonas con mas de 60 dB(A) de ruido (usando el mismo indice real de
  // ruido ya cargado), con un grupo residente en un refugio fijo.
  // ============================================================
  const HUMEDAL_X = 6017.9, HUMEDAL_Y = 1980.2; // centro real del Humedal La Vaca
  const BIRD_TREE_SPECIES = {
    "Sauco": { key: "sauco", color: 0x9c86b8, weight: 1.0, base: 260 },
    "Cerezo, capuli": { key: "capuli", color: 0xd08a9e, weight: 0.76, base: 200 },
    "Urapán, Fresno": { key: "urapan", color: 0x7fb59f, weight: 0.52, base: 220 },
  };
  const BIRD_VISION = 14, BIRD_ARRIVE = 1.4, BIRD_WIND = 1.5, BIRD_MAX_SPEED = 4.2;
  const BIRD_REST_SPEED = 1.0, BIRD_NOISE_DB = 60, BIRD_K_REP = 4.2, BIRD_COUNT = 50;
  const REFUGE_X = 3600, REFUGE_Y = 1000, REFUGE_R = 220; // esquina noroeste real del area de Kennedy
  let birds = [], birdTreesGrid = null, birdOn = false, birdsGroup = null;
  let noiseEdgesRaw = null; // se reusan los mismos datos reales de ruido ya cargados

  function sampleAttractorTrees(trees) {
    const porEspecie = {};
    trees.forEach(t => {
      const meta = BIRD_TREE_SPECIES[t[3]];
      if (meta) (porEspecie[meta.key] || (porEspecie[meta.key] = [])).push({ x: t[0], y: t[1], meta });
    });
    const out = [];
    Object.keys(porEspecie).forEach(k => {
      const lista = porEspecie[k];
      const meta = lista[0].meta;
      const paso = Math.max(1, Math.floor(lista.length / meta.base));
      for (let i = 0; i < lista.length; i += paso) out.push(lista[i]);
    });
    return out;
  }
  const BIRD_CELL = 25; // metros reales por celda de la rejilla de arboles
  function buildBirdTreeGrid(attractors) {
    const grid = new Map();
    attractors.forEach(t => {
      const key = Math.floor(t.x / BIRD_CELL) + "," + Math.floor(t.y / BIRD_CELL);
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(t);
    });
    return grid;
  }
  function bestTreeNear(grid, x, y) {
    const r = BIRD_VISION * 10; // convertir de unidades de escena (SCALE=0.1) a metros reales
    const cx0 = Math.floor((x - r) / BIRD_CELL), cx1 = Math.floor((x + r) / BIRD_CELL);
    const cy0 = Math.floor((y - r) / BIRD_CELL), cy1 = Math.floor((y + r) / BIRD_CELL);
    let best = null, bestScore = 0, bestDist = 0;
    for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) {
      const celda = grid.get(cx + "," + cy);
      if (!celda) continue;
      celda.forEach(t => {
        const dx = t.x - x, dy = t.y - y, d2 = dx * dx + dy * dy;
        if (d2 > r * r) return;
        const d = Math.sqrt(d2) || 0.001;
        const score = t.meta.weight / d;
        if (score > bestScore) { bestScore = score; best = t; bestDist = d; }
      });
    }
    return best ? { arbol: best, dist: bestDist } : null;
  }

  function makeBirdSprite(wingUp) {
    const c = document.createElement("canvas"); c.width = 48; c.height = 48;
    const ctx = c.getContext("2d");
    ctx.translate(24, 24);
    // Icono simple de pajarito volando (silueta de un solo color solido,
    // sin trazos claros ni fondo) - igual diseño que en modulo-10-corte,
    // con 2 alas que suben o bajan segun "wingUp" para dar aleteo.
    ctx.fillStyle = "#1a1c22";
    const wingY = wingUp ? -9 : 6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-8, wingY * 0.4, -16, wingY);
    ctx.quadraticCurveTo(-8, 1, 0, 2);
    ctx.quadraticCurveTo(8, 1, 16, wingY);
    ctx.quadraticCurveTo(8, wingY * 0.4, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 1, 3.4, 2, 0, 0, Math.PI * 2); ctx.fill();
    return new THREE.CanvasTexture(c);
  }
  function makeBirdAgent(origen) {
    let x, y;
    if (origen === "refugio") {
      const a = Math.random() * Math.PI * 2, r = Math.random() * REFUGE_R;
      x = REFUGE_X + Math.cos(a) * r; y = REFUGE_Y + Math.sin(a) * r;
    } else if (origen === "humedal") {
      x = HUMEDAL_X + (Math.random() - 0.5) * 200; y = HUMEDAL_Y + (Math.random() - 0.5) * 200;
    } else { // oriente: borde este real del area de Kennedy
      x = 10500 + Math.random() * 150; y = 500 + Math.random() * 5500;
    }
    const residente = origen === "refugio";
    return {
      x, y, vx: residente ? (Math.random() - 0.5) * 2.2 : -(2.6 + Math.random() * 2.6),
      vy: (Math.random() - 0.5) * (residente ? 2.2 : 1.2),
      rest: 0, cooldown: 0, restColor: null, residente, estresada: false, phase: Math.random() * 6.28,
      sprite: null,
    };
  }
  function updateBirdAgent(b, dt) {
    b.phase += dt * 9;
    if (b.rest > 0) {
      b.rest -= dt;
      b.vx += (Math.random() - 0.5) * 12 * dt; b.vy += (Math.random() - 0.5) * 12 * dt;
      const freno = Math.pow(0.02, dt);
      b.vx *= freno; b.vy *= freno;
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > BIRD_REST_SPEED) { b.vx = (b.vx / sp) * BIRD_REST_SPEED; b.vy = (b.vy / sp) * BIRD_REST_SPEED; }
      if (b.landedAt) {
        const d = Math.hypot(b.x - b.landedAt.x, b.y - b.landedAt.y);
        if (d > 3) {
          const ux = (b.landedAt.x - b.x) / d, uy = (b.landedAt.y - b.y) / d;
          b.vx += ux * 6 * dt; b.vy += uy * 6 * dt;
        }
      }
    } else if (b.residente) {
      if (b.cooldown > 0) b.cooldown -= dt;
      b.vx += (Math.random() - 0.5) * 8 * dt; b.vy += (Math.random() - 0.5) * 8 * dt;
      const d = Math.hypot(b.x - REFUGE_X, b.y - REFUGE_Y);
      if (d > REFUGE_R) {
        const ux = (REFUGE_X - b.x) / d, uy = (REFUGE_Y - b.y) / d;
        b.vx += ux * 11 * dt; b.vy += uy * 11 * dt;
      }
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > 4) { b.vx = (b.vx / sp) * 4; b.vy = (b.vy / sp) * 4; }
    } else {
      if (b.cooldown > 0) b.cooldown -= dt;
      b.vx -= BIRD_WIND * dt;
      b.vy += Math.sin(b.phase * 0.28) * 0.7 * dt;
      const hallazgo = birdTreesGrid ? bestTreeNear(birdTreesGrid, b.x, b.y) : null;
      if (hallazgo && b.cooldown <= 0) {
        const { arbol, dist } = hallazgo;
        const ux = (arbol.x - b.x) / dist, uy = (arbol.y - b.y) / dist;
        const esSauco = arbol.meta.key === "sauco";
        const fuerza = arbol.meta.weight * (esSauco ? 20 : 11);
        b.vx += ux * fuerza * dt; b.vy += uy * fuerza * dt;
        if (dist < BIRD_ARRIVE * 10) {
          b.rest = 2 + Math.random(); b.restColor = arbol.meta.color; b.cooldown = 7; b.landedAt = { x: arbol.x, y: arbol.y };
        }
      }
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > BIRD_MAX_SPEED) { b.vx = (b.vx / sp) * BIRD_MAX_SPEED; b.vy = (b.vy / sp) * BIRD_MAX_SPEED; }
    }
    const db = noiseDbAt(b.x, b.y);
    const exceso = Math.max(0, db - BIRD_NOISE_DB);
    b.estresada = exceso > 0;
    if (exceso > 0) {
      const u = noiseEscapeDir(b.x, b.y);
      if (u) { b.vx += BIRD_K_REP * exceso * u[0] * dt; b.vy += BIRD_K_REP * exceso * u[1] * dt; }
      if (b.rest > 0) { b.rest = 0; b.cooldown = Math.max(b.cooldown, 3); }
    }
    b.x += b.vx * dt * 10; // *10 para pasar de unidades/seg "logicas" a metros/seg reales
    b.y += b.vy * dt * 10;
    // sale por el occidente real (x chico): vuelve a entrar por oriente
    if (b.x < 500) Object.assign(b, makeBirdAgent(b.residente ? "refugio" : "oriente"), { sprite: b.sprite });
  }
  let birdTexUp = null, birdTexDown = null;
  function buildBirds() {
    birdsGroup = new THREE.Group();
    birdsGroup.visible = false;
    birdTexUp = makeBirdSprite(true);
    birdTexDown = makeBirdSprite(false);
    const spriteMat = new THREE.SpriteMaterial({ map: birdTexUp, transparent: true, alphaTest: 0.15, depthWrite: false, depthTest: false });
    const refugeCount = Math.max(4, Math.round(BIRD_COUNT * 0.15));
    for (let i = 0; i < BIRD_COUNT; i++) {
      const origen = i < refugeCount ? "refugio" : (i % 2 ? "humedal" : "oriente");
      const b = makeBirdAgent(origen);
      const sprite = new THREE.Sprite(spriteMat.clone());
      sprite.scale.set(9, 9, 1); // mas grande que en modulo-10-corte (3.2): aqui se ve TODA la ciudad, no un sector acercado, y con el sprite chico no se alcanzaban a ver las mirlas
      sprite.renderOrder = 999;
      birdsGroup.add(sprite);
      b.sprite = sprite;
      birds.push(b);
    }
    sceneRoot.add(birdsGroup);
  }
  let lastBirdUpdate = 0;
  function updateBirds(now) {
    if (!birdsGroup || !birdsGroup.visible) return;
    const dt = lastBirdUpdate ? Math.min(0.05, (now - lastBirdUpdate) / 1000) : 0;
    lastBirdUpdate = now;
    if (dt > 0) birds.forEach(b => updateBirdAgent(b, dt));
    birds.forEach(b => {
      const p = toScene(b.x, b.y);
      const bat = Math.sin(b.phase) * (b.rest > 0 ? 0.15 : 0.3);
      b.sprite.position.set(p.x, 3.2 + bat, p.z);
      b.sprite.material.color.set(b.estresada ? 0xd0745f : 0xffffff);
      const nuevaTex = Math.sin(b.phase) > 0 ? birdTexUp : birdTexDown;
      if (b.sprite.material.map !== nuevaTex) { b.sprite.material.map = nuevaTex; b.sprite.material.needsUpdate = true; }
    });
  }

  // ---- Cuerpos de agua: poligonos planos (fan de triangulos) apenas
  // levantados del suelo, con un material azul semi-transparente. ----
  const EL_BURRO_NOMBRE = "Humedal El Burro";
  let elBurroPts = null, elBurroCentro = null, elBurroMesh = null, elBurroBaseAreaHa = null;
  function buildWaterBodies(bodies) {
    const positions = [];
    const uvs = [];
    const UV_SCALE = 0.08; // repite la textura cada ~12.5 unidades de escena
    bodies.forEach(w => {
      if (w.nombre === EL_BURRO_NOMBRE) {
        // El Burro se separa del resto: se reconstruye aparte cada vez
        // que cambia el mes del reloj climatico anual (se expande o
        // contrae), sin tener que reconstruir TODOS los demas cuerpos
        // de agua cada vez.
        elBurroPts = w.pts;
        elBurroCentro = {
          x: w.pts.reduce((s, p) => s + p[0], 0) / w.pts.length,
          y: w.pts.reduce((s, p) => s + p[1], 0) / w.pts.length,
        };
        // area real del poligono base (formula del zapatero / shoelace),
        // a partir de las mismas coordenadas reales que ya se usan para
        // dibujar el humedal -- no es un dato inventado, es el area real
        // del poligono cargado desde el geojson.
        let area2 = 0;
        for (let i = 0; i < w.pts.length; i++) {
          const [x1, y1] = w.pts[i];
          const [x2, y2] = w.pts[(i + 1) % w.pts.length];
          area2 += x1 * y2 - x2 * y1;
        }
        elBurroBaseAreaHa = Math.abs(area2) / 2 / 10000;
        return;
      }
      const pts = w.pts.map(p => toScene(p[0], p[1]));
      if (pts.length < 3) return;
      // Triangulacion real de poligono (ear-clipping), no un abanico
      // ingenuo desde un solo punto — los canales y rios son formas
      // largas y NO convexas, y un abanico simple genera triangulos que
      // se salen de la forma real (cruzando por fuera del poligono).
      const pts2d = pts.map(p => new THREE.Vector2(p.x, p.z));
      let tris;
      try { tris = THREE.ShapeUtils.triangulateShape(pts2d, []); }
      catch (e) { tris = []; }
      tris.forEach(([a, b, c]) => {
        [a, b, c].forEach(idx => {
          positions.push(pts[idx].x, 0.022, pts[idx].z);
          uvs.push(pts[idx].x * UV_SCALE, pts[idx].z * UV_SCALE);
        });
      });
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.computeVertexNormals();
    // El agua actual no tiene colores por vertice (esos son del degradado historico):
    // con vertexColors activado se veia NEGRA. Material propio, color natural.
    const mat = sharedWaterMat.clone();
    mat.vertexColors = false;
    mat.color = new THREE.Color(0x6f98a6);
    mat.opacity = 0.9;
    waterMat = mat;
    const waterMesh = new THREE.Mesh(geo, mat);
    waterMesh.receiveShadow = false; // sin sombras encima (se veian como parches/bloques feos sobre el agua)
    modernWaterMesh = waterMesh;
    sceneRoot.add(waterMesh);
    elBurroMat = mat; // El Burro comparte la misma textura/material que el resto del agua
    rebuildElBurro(HUMEDAL_CICLO[0].expansion_pct); // arranca en Enero, igual que el valor por defecto del deslizador
  }

  // ---- Reloj climatico anual del Humedal El Burro: expande/contrae el
  // poligono real alrededor de su propio centro segun un modelo de
  // retencion hidrica (el nivel no salta con la lluvia del mes, se va
  // acumulando y liberando gradualmente, como un humedal real), calculado
  // a partir de la precipitacion mensual real de Bogota (climate-data.org,
  // 1991-2021) y calibrado contra los rangos reales publicados por la
  // Secretaria de Ambiente (expansion del espejo de agua 33%-50%,
  // profundidad 0.6m-2.0m entre temporada seca y de lluvias). ----
  let elBurroMat = null;
  const HUMEDAL_CICLO = [
    { mes: 1, expansion_pct: 41.7, profundidad_m: 1.32 },
    { mes: 2, expansion_pct: 42.6, profundidad_m: 1.39 },
    { mes: 3, expansion_pct: 46.7, profundidad_m: 1.73 },
    { mes: 4, expansion_pct: 50.0, profundidad_m: 2.00 },
    { mes: 5, expansion_pct: 47.4, profundidad_m: 1.78 },
    { mes: 6, expansion_pct: 41.5, profundidad_m: 1.30 },
    { mes: 7, expansion_pct: 37.7, profundidad_m: 0.99 },
    { mes: 8, expansion_pct: 34.1, profundidad_m: 0.69 },
    { mes: 9, expansion_pct: 33.0, profundidad_m: 0.60 },
    { mes: 10, expansion_pct: 38.6, profundidad_m: 1.06 },
    { mes: 11, expansion_pct: 43.8, profundidad_m: 1.49 },
    { mes: 12, expansion_pct: 43.3, profundidad_m: 1.45 },
  ];
  function rebuildElBurro(expansionPct) {
    if (!elBurroPts || !elBurroCentro) return;
    if (elBurroMesh) { sceneRoot.remove(elBurroMesh); elBurroMesh.geometry.dispose(); }
    const scale = 1 + expansionPct / 100 * 0.6; // 0.6 de factor visual: al 50% de "expansion" el radio crece ~30%, area ~69% (efecto claramente visible)
    const positions = [], uvs = [];
    const UV_SCALE = 0.08;
    const pts = elBurroPts.map(p => {
      const ex = elBurroCentro.x + (p[0] - elBurroCentro.x) * scale;
      const ey = elBurroCentro.y + (p[1] - elBurroCentro.y) * scale;
      return toScene(ex, ey);
    });
    if (pts.length >= 3) {
      const pts2d = pts.map(p => new THREE.Vector2(p.x, p.z));
      let tris;
      try { tris = THREE.ShapeUtils.triangulateShape(pts2d, []); }
      catch (e) { tris = []; }
      tris.forEach(([a, b, c]) => {
        [a, b, c].forEach(idx => {
          positions.push(pts[idx].x, 0.023, pts[idx].z);
          uvs.push(pts[idx].x * UV_SCALE, pts[idx].z * UV_SCALE);
        });
      });
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, elBurroMat);
    sceneRoot.add(mesh);
    elBurroMesh = mesh;
  }
  function setHumedalMes(mes) {
    const d = HUMEDAL_CICLO[mes - 1];
    if (!d) return;
    rebuildElBurro(d.expansion_pct);
    if (elBurroBaseAreaHa) {
      const scale = 1 + d.expansion_pct / 100 * 0.6;
      d.area_ha = elBurroBaseAreaHa * scale * scale;
    }
    return d;
  }

  function loadWaterBodies() {
    return fetch(WATER_URL)
      .then(r => { if (!r.ok) throw new Error("no se pudo cargar " + WATER_URL); return r.json(); })
      .then(data => {
        rawWaterData = data; // antes nunca se asignaba: el agua no se reconstruia al cambiar de epoca
        buildWaterBodies(data);
        buildHistoricalWetlands(data);
        setHistoricalYear(1950, false);
      })
      .catch(err => console.warn("No se pudieron cargar los cuerpos de agua:", err));
  }

  // ---- Manzanas: solo el CONTORNO (LineSegments), no un poligono relleno.
  // Se dibuja como lineas delgadas, igual que la capa base de la red vial,
  // para evitar por completo el riesgo de parpadeo (z-fighting) que si
  // tendria una superficie rellena compitiendo con vias/agua a alturas
  // parecidas. Altura propia (0.006) distinta de todo lo demas. ----
  function buildManzanas(manzanas) {
    const positions = [];
    manzanas.forEach(m => {
      const pts = m.pts.map(p => toScene(p[0], p[1]));
      for (let i = 0; i < pts.length - 1; i++) {
        positions.push(pts[i].x, 0.006, pts[i].z, pts[i + 1].x, 0.006, pts[i + 1].z);
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({ color: 0x8a8f96, transparent: true, opacity: 0.5 });
    const manMesh = new THREE.LineSegments(geo, mat);
    modernManzanasMesh = manMesh;
    if (currentHistoricalYear <= 1956) manMesh.visible = false;
    sceneRoot.add(manMesh);
  }

  function loadManzanas() {
    return fetch(MANZANAS_URL)
      .then(r => { if (!r.ok) throw new Error("no se pudo cargar " + MANZANAS_URL); return r.json(); })
      .then(data => { buildManzanas(data); })
      .catch(err => console.warn("No se pudieron cargar las manzanas:", err));
  }

  // ---- Parques/zonas verdes: poligonos rellenos, triangulacion real
  // (ear-clipping) igual que agua y edificios, en una altura propia
  // (0.02) que no compite con via/agua/manzanas. ----
  function buildParques(parques) {
    const positions = [];
    const uvs = [];
    const UV_SCALE = 0.006; // la mitad de antes, porque el tile espejado ahora es 2x mas grande (para mantener el mismo tamano de grano)
    parques.forEach(p => {
      const pts = p.pts.map(pt => toScene(pt[0], pt[1]));
      if (pts.length < 3) return;
      const pts2d = pts.map(pt => new THREE.Vector2(pt.x, pt.z));
      let tris;
      try { tris = THREE.ShapeUtils.triangulateShape(pts2d, []); }
      catch (e) { tris = []; }
      tris.forEach(([a, b, c]) => {
        [a, b, c].forEach(idx => {
          positions.push(pts[idx].x, 0.02, pts[idx].z);
          uvs.push(pts[idx].x * UV_SCALE, pts[idx].z * UV_SCALE);
        });
      });
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.computeVertexNormals();
    const pastoTex = new THREE.TextureLoader().load("./assets/textura_pasto_pastel.jpg");
    pastoTex.wrapS = THREE.RepeatWrapping;
    pastoTex.wrapT = THREE.RepeatWrapping;
    const mat = new THREE.MeshStandardMaterial({ map: pastoTex, color: 0xbcc9ae, roughness: 0.95, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    parqueMat = mat;
    const mesh = new THREE.Mesh(geo, mat);
    modernParquesMesh = mesh;
    mesh.visible = true; // Zonas verdes/pastos naturales siempre visibles
    mesh.receiveShadow = true;
    sceneRoot.add(mesh);
  }

  function loadParques() {
    return fetch(PARQUES_URL)
      .then(r => { if (!r.ok) throw new Error("no se pudo cargar " + PARQUES_URL); return r.json(); })
      .then(data => { buildParques(data); })
      .catch(err => console.warn("No se pudieron cargar los parques:", err));
  }

  // ---- Semaforos 3D + cruces peatonales, en un conjunto reducido y bien
  // espaciado de intersecciones reales (287, fusionando nodos cercanos de
  // la red vial) — NO en cada nodo donde se juntan tramos, ya que eso
  // fue un desastre visual antes (SUMO separa carriles en tramos propios,
  // dando miles de "cruces" falsos). ----
  let intersectionsData = null;
  let intersectionMeshes = []; // para poder quitarlas y reconstruir al mover los deslizadores
  let interParams = { setback: 1.3, crossW: 1.0, poleOffset: 1.1 };
  function buildIntersections(intersections) {
    intersectionsData = intersections;
    intersectionMeshes.forEach(m => { sceneRoot.remove(m); m.geometry.dispose(); });
    intersectionMeshes = [];

    const poleGeo = new THREE.CylinderGeometry(0.05, 0.06, 1, 6);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x33383d, roughness: 0.6 });
    const headGeo = new THREE.BoxGeometry(0.16, 0.42, 0.16);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x1c1f22, roughness: 0.5 });
    const lightGeo = new THREE.CircleGeometry(0.06, 10);
    const lightColors = [0xe14b3f, 0xe8b93f, 0x4bb35a];

    let poleCount = 0;
    intersections.forEach(inter => (poleCount += Math.min(inter.dirs.length, 4)));
    const poleMesh = new THREE.InstancedMesh(poleGeo, poleMat, poleCount);
    const headMesh = new THREE.InstancedMesh(headGeo, headMat, poleCount);
    poleMesh.castShadow = true; headMesh.castShadow = true;
    const lightMeshes = lightColors.map(color =>
      new THREE.InstancedMesh(lightGeo, new THREE.MeshBasicMaterial({ color }), poleCount)
    );

    const dummy = new THREE.Object3D();
    const crossPos = []; // posiciones de las rayas de cruce peatonal
    const POLE_H = 4.2 * SCALE;
    const SETBACK = interParams.setback, CROSS_W = interParams.crossW, POLE_OFFSET = interParams.poleOffset;
    let idx = 0;
    intersections.forEach(inter => {
      const center = toScene(inter.x, inter.y);
      inter.dirs.slice(0, 4).forEach(([dx, dy]) => {
        // direccion real -> direccion en la escena (toScene invierte Y)
        const ux = dx, uz = -dy;
        const px = -uz, pz = ux; // perpendicular (ancho de la via)
        // Poste del semaforo, a un lado del acceso, cerca de la esquina.
        const poleX = center.x + ux * (SETBACK - 0.7) + px * POLE_OFFSET;
        const poleZ = center.z + uz * (SETBACK - 0.7) + pz * POLE_OFFSET;
        dummy.position.set(poleX, POLE_H / 2, poleZ);
        dummy.scale.set(1, POLE_H, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        poleMesh.setMatrixAt(idx, dummy.matrix);
        const faceAngle = Math.atan2(-ux, -uz); // el semaforo mira hacia el que se acerca
        dummy.position.set(poleX, POLE_H + 0.14, poleZ);
        dummy.scale.set(1, 1, 1);
        dummy.rotation.set(0, faceAngle, 0);
        dummy.updateMatrix();
        headMesh.setMatrixAt(idx, dummy.matrix);
        const lightYs = [POLE_H + 0.34, POLE_H + 0.21, POLE_H + 0.08];
        lightMeshes.forEach((lm, li) => {
          dummy.position.set(poleX + Math.sin(faceAngle) * 0.05, lightYs[li], poleZ + Math.cos(faceAngle) * 0.05);
          dummy.rotation.set(0, faceAngle, 0);
          dummy.updateMatrix();
          lm.setMatrixAt(idx, dummy.matrix);
        });
        idx++;

        // Cruce peatonal (rayas) atravesando este acceso, antes de llegar
        // al centro de la interseccion. Cada raya es angosta en el
        // sentido transversal a la via (px,pz) y larga en el sentido de
        // avance (ux,uz) — como una cebra real — con huecos claros entre
        // rayas consecutivas.
        const baseX = center.x + ux * SETBACK, baseZ = center.z + uz * SETBACK;
        const CROSSING_LEN = 3.2, STRIPE_W = 0.32, STRIPE_GAP2 = 0.28;
        for (let s = -CROSS_W; s <= CROSS_W; s += STRIPE_W + STRIPE_GAP2) {
          const c0x = baseX + px * s, c0z = baseZ + pz * s;
          const c1x = c0x + ux * CROSSING_LEN, c1z = c0z + uz * CROSSING_LEN;
          const hx = px * (STRIPE_W / 2), hz = pz * (STRIPE_W / 2);
          crossPos.push(
            c0x - hx, 0.034, c0z - hz, c0x + hx, 0.034, c0z + hz, c1x + hx, 0.034, c1z + hz,
            c0x - hx, 0.034, c0z - hz, c1x + hx, 0.034, c1z + hz, c1x - hx, 0.034, c1z - hz
          );
        }
      });
    });
    poleMesh.instanceMatrix.needsUpdate = true;
    headMesh.instanceMatrix.needsUpdate = true;
    lightMeshes.forEach(lm => (lm.instanceMatrix.needsUpdate = true));
    sceneRoot.add(poleMesh, headMesh, ...lightMeshes);
    intersectionMeshes.push(poleMesh, headMesh, ...lightMeshes);

    const crossGeo = new THREE.BufferGeometry();
    crossGeo.setAttribute("position", new THREE.Float32BufferAttribute(crossPos, 3));
    const crossMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const crossMesh = new THREE.Mesh(crossGeo, crossMat);
    sceneRoot.add(crossMesh);
    intersectionMeshes.push(crossMesh);
  }
  function rebuildIntersections() {
    if (intersectionsData) buildIntersections(intersectionsData);
  }

  function loadIntersections() {
    return fetch("./assets/kennedy_intersecciones.json")
      .then(r => { if (!r.ok) throw new Error("no se pudo cargar intersecciones"); return r.json(); })
      .then(data => { buildIntersections(data); })
      .catch(err => console.warn("No se pudieron cargar las intersecciones:", err));
  }

  // ---- Mallas reales exportadas del modelo Rhino (techos a dos aguas,
  // techos planos con parapeto ya modelado, fachadas verificadas, agua) —
  // formato generico {verts:[[x,y,z_metros],...], tris:[[a,b,c],...]}. ----
  function buildTriMesh(data, color, opts) {
    const positions = [];
    const scenePts = data.verts.map(v => {
      const p = toScene(v[0], v[1]);
      return { x: p.x, y: v[2] * SCALE, z: p.z };
    });
    data.tris.forEach(([a, b, c]) => {
      const pa = scenePts[a], pb = scenePts[b], pc = scenePts[c];
      if (!pa || !pb || !pc) return;
      positions.push(pa.x, pa.y, pa.z, pb.x, pb.y, pb.z, pc.x, pc.y, pc.z);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.02, side: THREE.DoubleSide, ...opts });
    const mesh = new THREE.Mesh(geo, mat);
    modernFacadesMesh = mesh;
    if (currentHistoricalYear <= 1956) mesh.visible = false;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    sceneRoot.add(mesh);
    return mesh;
  }
  function loadTriMesh(url, color, opts) {
    return fetch(url)
      .then(r => { if (!r.ok) throw new Error("no se pudo cargar " + url); return r.json(); })
      .then(data => buildTriMesh(data, color, opts))
      .catch(err => { console.warn("No se pudo cargar la malla " + url + ":", err); return null; });
  }

  // ---- Terreno real (relieve, 0-22m de altura) extraido del modelo Rhino,
  // en vez de un plano completamente liso. Se mantiene tambien el plano
  // liso original, un poco mas abajo, como base/respaldo por si el
  // terreno real no cubre alguna zona del borde. ----
  let terrainMesh = null;
  function loadTerrain() {
    return loadTriMesh("./assets/kennedy_terreno.json", 0xe4e6e2, { roughness: 0.95, metalness: 0 })
      .then(mesh => {
        if (!mesh) return;
        mesh.castShadow = false; // el suelo no necesita proyectar sombra sobre si mismo
        mesh.position.y += 0.001; // apenas encima del plano liso de respaldo
        terrainMesh = mesh;
      });
  }

  // ---- Vehiculos: un pool de cajas 3D reutilizables ----
  const VEH_POOL_SIZE = 2800;
  const vehMeshes = [];
  const vehMat = new THREE.MeshStandardMaterial({ color: 0xe2635a, roughness: 0.5, metalness: 0.15 });
  const vehGeo = new THREE.BoxGeometry(0.18, 0.15, 0.45);
  const vehInstanced = new THREE.InstancedMesh(vehGeo, vehMat, VEH_POOL_SIZE);
  vehInstanced.count = 0;
  vehInstanced.castShadow = true;
  sceneRoot.add(vehInstanced);
  const dummy = new THREE.Object3D();

  let timesteps = [];
  let playing = false;
  let currentTime = 0;
  let speed = 2;
  let lastFrameAt = null;

  const playBtn = document.getElementById("playPause");
  const slider = document.getElementById("timeSlider");
  const timeLabel = document.getElementById("timeLabel");
  const speedSelect = document.getElementById("speedSelect");

  function fmtTime(t) {
    const m = Math.floor(t / 60), s = Math.floor(t % 60);
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  let lastAngle = {}; // rumbo persistente por vehiculo, para no perderlo cuando esta detenido
  function vehiclesAtTime(t) {
    if (!timesteps.length) return [];
    if (t <= timesteps[0].time) return timesteps[0].vehicles.map(v => ({ id: v.id, x: v.x, y: v.y }));
    const last = timesteps[timesteps.length - 1];
    if (t >= last.time) return last.vehicles.map(v => ({ id: v.id, x: v.x, y: v.y }));
    let lo = 0, hi = timesteps.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (timesteps[mid].time <= t) lo = mid; else hi = mid;
    }
    const a = timesteps[lo], b = timesteps[hi];
    const frac = (t - a.time) / (b.time - a.time || 1);
    const bMap = {}; b.vehicles.forEach(v => bMap[v.id] = v);
    return a.vehicles.map(v => {
      const bv = bMap[v.id];
      if (!bv) return { id: v.id, x: v.x, y: v.y };
      // El rumbo se calcula con el DESPLAZAMIENTO REAL entre 2 pasos de
      // la simulacion (no entre cuadros de animacion): si el vehiculo esta
      // detenido o casi detenido en una fila (semaforo, trancon), ese
      // vector es casi cero y dar un angulo con eso sale ruidoso/al azar
      // (los carros en diagonal de la captura). Solo se actualiza el
      // angulo cuando el vehiculo se movio una distancia real
      // significativa; si no, se mantiene el ultimo rumbo conocido.
      const pa = toScene(v.x, v.y), pb = toScene(bv.x, bv.y);
      const dx = pb.x - pa.x, dz = pb.z - pa.z;
      if (Math.hypot(dx, dz) > 0.05) lastAngle[v.id] = Math.atan2(dx, dz);
      return { id: v.id, x: v.x + (bv.x - v.x) * frac, y: v.y + (bv.y - v.y) * frac };
    });
  }

  function renderVehiclesAt(t) {
    const vehicles = vehiclesAtTime(t);
    const n = Math.min(vehicles.length, VEH_POOL_SIZE);
    for (let i = 0; i < n; i++) {
      const v = vehicles[i];
      const p = toScene(v.x, v.y);
      const angle = lastAngle[v.id] || 0;
      dummy.position.set(p.x, 0.1, p.z);
      dummy.rotation.set(0, angle, 0);
      dummy.updateMatrix();
      vehInstanced.setMatrixAt(i, dummy.matrix);
    }
    vehInstanced.count = (currentHistoricalYear <= 1956 ? 0 : n);
    if (currentHistoricalYear <= 1956) vehInstanced.visible = false;
    vehInstanced.instanceMatrix.needsUpdate = true;
    computeLiveNoiseField(vehicles, performance.now());
  }

  function finishLoadingTimesteps() {
    const totalTime = timesteps.length ? timesteps[timesteps.length - 1].time : 0;
    if (slider) { slider.max = String(Math.round(totalTime)); slider.disabled = false; }
    if (playBtn) playBtn.disabled = false;
    setStatus("", false);
    if (timeLabel) timeLabel.textContent = `00:00 / ${fmtTime(totalTime)}`;
    renderVehiclesAt(0);
  }

  function loadVehicles() {
    return fetch(VEHICULOS_JSON_URL)
      .then(r => { if (!r.ok) throw new Error("no se pudo cargar " + VEHICULOS_JSON_URL); return r.json(); })
      .then(data => {
        timesteps = data.map(([time, vehicles]) => ({ time, vehicles: vehicles.map(([id, x, y]) => ({ id, x, y })) }));
        finishLoadingTimesteps();
      })
      .catch(err => {
        console.warn("Trayectorias de vehículos omitidas para la simulación histórica.");
        setStatus("", false);
      });
  }

  fetch(NET_URL)
    .then(r => { if (!r.ok) throw new Error("no se pudo cargar " + NET_URL); return r.json(); })
    .then(data => {
      netCenter = { x: (data.bbox[0] + data.bbox[2]) / 2, y: (data.bbox[1] + data.bbox[3]) / 2 };
      buildGround(data.bbox);
      buildNoiseGround(data.bbox);
      buildRoads(data.edges);
      const w = (data.bbox[2] - data.bbox[0]) * SCALE;
      const h = (data.bbox[3] - data.bbox[1]) * SCALE;
      sceneExtentW = w; sceneExtentH = h;
      viewSize = Math.max(w, h) * 0.14;
      resize();
      setAxonometricView(w);
      setStatus("", false); // ocultar overlay de inmediato
      createCows();
      buildAeropuertoTecho();
      buildCorabastosModel();
      buildRoads1972();
      buildAvCaliModel();
      buildProtechoModel();
      loadWaterBodies();
      loadBuildings();
      loadTrees();
      buildBirds();
      loadManzanas();
      loadParques();
      loadTriMesh("./assets/kennedy_facades.json", 0xa05a41);
      return loadVehicles();
    })
    .catch(err => {
      console.error(err);
      setStatus("", false);
    });

  // ---- Controles de reproduccion ----
  if (playBtn) {
    playBtn.addEventListener("click", () => {
      playing = !playing;
      playBtn.innerHTML = playing ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
      lastFrameAt = null;
    });
  }
  if (slider) {
    slider.addEventListener("input", () => {
      currentTime = parseFloat(slider.value);
      renderVehiclesAt(currentTime);
      if (timeLabel) timeLabel.textContent = `${fmtTime(currentTime)} / ${fmtTime(parseFloat(slider.max))}`;
    });
  }
  if (speedSelect) {
    speedSelect.addEventListener("change", () => { speed = parseFloat(speedSelect.value); });
  }

  // ---- Vista axonometrica fija con las coordenadas de la usuaria ----
  function setAxonometricView(distance) {
    camera.position.set(117.21, 724.68, 628.88);
    controls.target.set(219.64, -56.32, -92.84);
    camera.zoom = 1.95;
    camera.updateProjectionMatrix();
    controls.update();
    if (typeof updateLiveCameraCoordsUI === "function") updateLiveCameraCoordsUI();
  }

  // ---- Botones de vista ----
  const viewResetBtn = document.getElementById("viewReset");
  if (viewResetBtn) viewResetBtn.addEventListener("click", () => setAxonometricView(400));

  // ---- Toggles ----
  const noiseToggle = document.getElementById("noiseToggle");
  if (noiseToggle) noiseToggle.addEventListener("click", (e) => {
    if (!noiseMesh) return;
    noiseMesh.visible = !noiseMesh.visible;
    e.target.classList.toggle("active", noiseMesh.visible);
    e.target.textContent = noiseMesh.visible ? "🔇 Ocultar mapa de ruido" : "🔊 Mostrar mapa de ruido";
  });
  const bioToggle = document.getElementById("bioToggle");
  if (bioToggle) bioToggle.addEventListener("click", (e) => {
    if (!birdsGroup) return;
    birdsGroup.visible = !birdsGroup.visible;
    e.target.classList.toggle("active", birdsGroup.visible);
    e.target.textContent = birdsGroup.visible ? "🐦 Ocultar mirlas" : "🐦 Mostrar mirlas";
  });

  // ---- Barra de controles expandible con doble clic ----
  const controlsBarEl = document.getElementById("controlsBar");
  if (controlsBarEl) {
    controlsBarEl.addEventListener("dblclick", (e) => {
      controlsBarEl.classList.toggle("expanded");
    });
  }
  if (playBtn) {
    playBtn.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      if (controlsBarEl) controlsBarEl.classList.toggle("expanded");
    });
  }

  // ---- Reloj climatico anual del Humedal El Burro ----
  const MESES_NOMBRE = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const humedalMesSlider = document.getElementById("humedalMes");
  const humedalMesVal = document.getElementById("humedalMesVal");
  const humedalDatos = document.getElementById("humedalDatos");
  const humedalBar = document.getElementById("humedalBar");
  const humedalPctLabel = document.getElementById("humedalPctLabel");
  const humedalHa = document.getElementById("humedalHa");
  function applyHumedalMes(mes) {
    const d = setHumedalMes(mes);
    if (humedalMesVal) humedalMesVal.textContent = MESES_NOMBRE[mes - 1];
    if (d) {
      if (humedalDatos) humedalDatos.textContent = `Profundidad: ${d.profundidad_m.toFixed(2)} m`;
      if (humedalPctLabel) humedalPctLabel.textContent = `+${d.expansion_pct.toFixed(1)}%`;
      if (humedalBar) humedalBar.style.width = Math.min(100, d.expansion_pct / 50 * 100) + "%";
      if (humedalHa) humedalHa.textContent = d.area_ha != null ? d.area_ha.toFixed(2) : "—";
    }
  }
  if (humedalMesSlider) humedalMesSlider.addEventListener("input", () => applyHumedalMes(parseInt(humedalMesSlider.value, 10)));
  let humedalPlaying = false, humedalPlayTimer = null;
  const humedalPlayBtn = document.getElementById("humedalPlay");
  if (humedalPlayBtn) humedalPlayBtn.addEventListener("click", (e) => {
    humedalPlaying = !humedalPlaying;
    if (humedalPlaying) {
      e.target.textContent = "⏸ Detener";
      humedalPlayTimer = setInterval(() => {
        let mes = parseInt(humedalMesSlider.value, 10) + 1;
        if (mes > 12) mes = 1;
        humedalMesSlider.value = String(mes);
        applyHumedalMes(mes);
      }, 900);
    } else {
      e.target.textContent = "▶ Reproducir año completo";
      clearInterval(humedalPlayTimer);
    }
  });

  // Reorientar las tarjetas de los arboles hacia la camara cuando gira,
  // limitado en frecuencia para no recalcular 120 mil matrices por cuadro.
  let lastTreeBillboardUpdate = 0;
  controls.addEventListener("change", () => {
    const now = performance.now();
    if (now - lastTreeBillboardUpdate < 120) return;
    lastTreeBillboardUpdate = now;
    updateTreeBillboards();
  });
  // La camara (posicion, hacia donde mira, zoom) tambien se refleja en el
  // cuadro de coordenadas, para poder acomodar el angulo y el zoom que se
  // quiera y copiar la vista completa (corte + camara), no solo el corte.
  let lastCamOutputUpdate = 0;
  controls.addEventListener("change", () => {
    const now = performance.now();
    if (now - lastCamOutputUpdate < 100) return;
    lastCamOutputUpdate = now;
    if (typeof updateSectionBox === "function") updateSectionBox();
  });

  // ---- Herramienta de dibujo: clic para ir marcando puntos sobre el
  // mapa (como la pluma de Photoshop), y mostrar las coordenadas REALES
  // (mismo sistema que usan los demas archivos de datos) para copiar y
  // pegar, por ejemplo para trazar una nueva zona verde a mano. ----
  const raycaster = new THREE.Raycaster();
  // ---- Clic en un arbol: muestra su informacion (especie, altura) ----
  const mouseNdc = new THREE.Vector2();
  const treeInfo = document.getElementById("treeInfo");
  const treeInfoName = document.getElementById("treeInfoName");
  const treeInfoDetails = document.getElementById("treeInfoDetails");
  const treeInfoCloseBtn = document.getElementById("treeInfoClose");
  if (treeInfoCloseBtn && treeInfo) treeInfoCloseBtn.addEventListener("click", () => treeInfo.classList.remove("show"));

  let isBrushPainting = false;
  let lastPlantedPoint = null;

  function getRaycastGroundPoint(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouseNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouseNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouseNdc, camera);

    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPt = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(groundPlane, intersectPt)) {
      return intersectPt;
    }
    if (groundMesh) {
      const gh = raycaster.intersectObject(groundMesh);
      if (gh.length > 0) return gh[0].point;
    }
    return null;
  }

  function handleBrushPaint(clientX, clientY, force = false) {
    if (!currentActiveTool) return;
    const pt = getRaycastGroundPoint(clientX, clientY);
    if (!pt) return;

    if (currentActiveTool === "tree") {
      const minDistance = 2.2; // Espaciado ágil para poblar rápidamente
      if (force || !lastPlantedPoint || lastPlantedPoint.distanceTo(pt) >= minDistance) {
        // Plantar cluster denso de 3 a 5 árboles naturales por cada movimiento
        const clusterCount = force ? 4 : 3;
        for (let k = 0; k < clusterCount; k++) {
          const ang = Math.random() * Math.PI * 2;
          const rad = (k === 0 ? 0 : 0.8 + Math.random() * 2.6);
          const h = 3.6 + Math.random() * 5.0;
          plantSingleTree(pt.x + Math.cos(ang) * rad, pt.z + Math.sin(ang) * rad, h);
        }
        lastPlantedPoint = pt.clone();
      }
    } else if (currentActiveTool === "cow") {
      const minDistance = 5.5; // Espaciado para vacas
      if (force || !lastPlantedPoint || lastPlantedPoint.distanceTo(pt) >= minDistance) {
        plantSingleCow(pt.x, pt.z);
        if (Math.random() > 0.4) {
          const ang = Math.random() * Math.PI * 2;
          plantSingleCow(pt.x + Math.cos(ang) * 2.2, pt.z + Math.sin(ang) * 2.2);
        }
        lastPlantedPoint = pt.clone();
      }
    }
  }

  function handlePolyPointAdd(clientX, clientY) {
    const pt = getRaycastGroundPoint(clientX, clientY);
    if (!pt) return;
    if (currentActiveTool === "road") {
      customRoadPoints.push({ x: pt.x, z: pt.z });
      buildRoadRibbon(customRoadPoints, false);
      updatePolyCoordsUI();
    } else if (currentActiveTool === "runway") {
      customRunwayPoints.push({ x: pt.x, z: pt.z });
      if (customRunwayPoints.length >= 3) {
        buildRunwayPolygon(customRunwayPoints, false);
      }
      updatePolyCoordsUI();
    }
  }

  let downAt = null;
  renderer.domElement.addEventListener("pointerdown", (e) => {
    downAt = { x: e.clientX, y: e.clientY };
    if (currentActiveTool === "tree" || currentActiveTool === "cow") {
      isBrushPainting = true;
      lastPlantedPoint = null;
      handleBrushPaint(e.clientX, e.clientY, true);
    } else if (currentActiveTool === "road" || currentActiveTool === "runway") {
      handlePolyPointAdd(e.clientX, e.clientY);
    }
  });

  renderer.domElement.addEventListener("pointermove", (e) => {
    if (isBrushPainting && (currentActiveTool === "tree" || currentActiveTool === "cow")) {
      handleBrushPaint(e.clientX, e.clientY, false);
    }
  });

  window.addEventListener("pointerup", () => {
    isBrushPainting = false;
    lastPlantedPoint = null;
  });

  renderer.domElement.addEventListener("pointerup", (e) => {
    if (!downAt) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    downAt = null;
    if (currentActiveTool) return; // si estaba pintando con la brocha, no abrir tarjeta de árbol
    if (moved > 6) return; // fue un arrastre de camara, no un clic

    if (!treeMeshes.length) return;
    const rect = renderer.domElement.getBoundingClientRect();
    mouseNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouseNdc, camera);

    if (!treeMeshes.length) return;
    let best = null;
    treeMeshes.forEach(tm => {
      const hits = raycaster.intersectObject(tm.mesh);
      if (hits.length && (!best || hits[0].distance < best.distance)) {
        best = { distance: hits[0].distance, data: tm.data[hits[0].instanceId] };
      }
    });
    if (best) {
      const [, , hMeters, nombre] = best.data;
      treeInfoName.textContent = nombre;
      treeInfoDetails.textContent = `Altura aproximada: ${hMeters.toFixed(1)} m`;
      treeInfo.classList.add("show");
      hideBuildingEditor();
    } else {
      treeInfo.classList.remove("show");
      if (currentBuildingMesh) {
        const bHits = raycaster.intersectObject(currentBuildingMesh);
        if (bHits.length > 0) {
          const hitVIdx = bHits[0].faceIndex * 3;
          const bRange = findBuildingByVertexIndex(hitVIdx);
          if (bRange) {
            showBuildingEditor(bRange);
            return;
          }
        }
      }
      hideBuildingEditor();
    }
  });

  // ---- Loop de animacion ----
  // ---- Caja de seccion: 6 planos de recorte, igual que en Corte
  // axonometrico. Recorte por shader (visual, en vivo); para copiar las
  // coordenadas exactas que se estan viendo. ----
  const SECTION_Y_MAX = 10;
  let sectionBoxActive = true;
  function sceneToReal(x, z) { return [x / SCALE + netCenter.x, -z / SCALE + netCenter.y]; }
  const secRot = document.getElementById("secRot"), secRotVal = document.getElementById("secRotVal");
  const secXMin = document.getElementById("secXMin"), secXMax = document.getElementById("secXMax");
  const secYMin = document.getElementById("secYMin"), secYMax = document.getElementById("secYMax");
  const secZMin = document.getElementById("secZMin"), secZMax = document.getElementById("secZMax");
  const secXMinVal = document.getElementById("secXMinVal"), secXMaxVal = document.getElementById("secXMaxVal");
  const secYMinVal = document.getElementById("secYMinVal"), secYMaxVal = document.getElementById("secYMaxVal");
  const secZMinVal = document.getElementById("secZMinVal"), secZMaxVal = document.getElementById("secZMaxVal");
  const sectionBoxOutput = document.getElementById("sectionBoxOutput");
  function updateSectionBox() {
    if (!secXMin) return;
    const halfW = sceneExtentW / 2 * 1.4, halfH = sceneExtentH / 2 * 1.4;
    const xMin = -halfW + (parseFloat(secXMin.value) / 100) * (2 * halfW);
    const xMax = -halfW + (parseFloat(secXMax.value) / 100) * (2 * halfW);
    const zMin = -halfH + (parseFloat(secZMin.value) / 100) * (2 * halfH);
    const zMax = -halfH + (parseFloat(secZMax.value) / 100) * (2 * halfH);
    const yMin = (parseFloat(secYMin.value) / 100) * SECTION_Y_MAX;
    const yMax = (parseFloat(secYMax.value) / 100) * SECTION_Y_MAX;
    // Rotacion de la caja: en vez de cortar siempre alineado a los ejes
    // X/Z del mundo, los 4 planos horizontales giran junto con un angulo
    // elegido, para poder alinear el corte con cualquier calle o eje
    // diagonal (no solo horizontal/vertical).
    const rot = secRot ? parseFloat(secRot.value) : 0;
    const rad = rot * Math.PI / 180;
    const ux = Math.cos(rad), uz = Math.sin(rad); // eje U (el "X" girado)
    const vx = -Math.sin(rad), vz = Math.cos(rad); // eje V (el "Z" girado), perpendicular a U
    if (secRotVal) secRotVal.textContent = rot + "°";
    if (sectionBoxActive) {
      secPlanes.xMin.normal.set(ux, 0, uz); secPlanes.xMin.constant = -xMin;
      secPlanes.xMax.normal.set(-ux, 0, -uz); secPlanes.xMax.constant = xMax;
      secPlanes.yMin.constant = -yMin; secPlanes.yMax.constant = yMax;
      secPlanes.zMin.normal.set(vx, 0, vz); secPlanes.zMin.constant = -zMin;
      secPlanes.zMax.normal.set(-vx, 0, -vz); secPlanes.zMax.constant = zMax;
    } else {
      Object.values(secPlanes).forEach(p => (p.constant = 1e6));
    }
    secXMinVal.textContent = secXMin.value + "%"; secXMaxVal.textContent = secXMax.value + "%";
    secYMinVal.textContent = secYMin.value + "%"; secYMaxVal.textContent = secYMax.value + "%";
    secZMinVal.textContent = secZMin.value + "%"; secZMaxVal.textContent = secZMax.value + "%";
    const r0 = sceneToReal(xMin, zMin), r1 = sceneToReal(xMax, zMax);
    sectionBoxOutput.value =
      `Rotación: ${rot}°\n` +
      `U (a lo largo del giro): ${secXMin.value}% a ${secXMax.value}%\n` +
      `Y (altura, m): ${(yMin / SCALE).toFixed(1)} a ${(yMax / SCALE).toFixed(1)}\n` +
      `V (perpendicular): ${secZMin.value}% a ${secZMax.value}%\n` +
      `(referencia sin girar — real ${Math.round(Math.min(r0[0], r1[0]))} a ${Math.round(Math.max(r0[0], r1[0]))} / ${Math.round(Math.min(r0[1], r1[1]))} a ${Math.round(Math.max(r0[1], r1[1]))})\n` +
      `--- Cámara ---\n` +
      `Proyección: ${camera.isOrthographicCamera ? "ortográfica (axonométrica)" : "perspectiva"}\n` +
      `Posición: ${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)}\n` +
      `Mira hacia: ${controls.target.x.toFixed(1)}, ${controls.target.y.toFixed(1)}, ${controls.target.z.toFixed(1)}\n` +
      (camera.isOrthographicCamera ? `Zoom: ${camera.zoom.toFixed(2)}` : `FOV: ${camera.fov.toFixed(1)}°`);
  }
  if (secXMin) {
    [secXMin, secXMax, secYMin, secYMax, secZMin, secZMax, secRot].forEach(el => {
      if (el) el.addEventListener("input", updateSectionBox);
    });
    const sectionBoxToggle = document.getElementById("sectionBoxToggle");
    if (sectionBoxToggle) sectionBoxToggle.addEventListener("click", () => {
      sectionBoxActive = !sectionBoxActive;
      sectionBoxToggle.classList.toggle("active", sectionBoxActive);
      sectionBoxToggle.textContent = sectionBoxActive ? "✂️ Desactivar caja de sección" : "✂️ Activar caja de sección";
      updateSectionBox();
    });
    const sectionBoxReset = document.getElementById("sectionBoxReset");
    if (sectionBoxReset) sectionBoxReset.addEventListener("click", () => {
      secXMin.value = 0; secXMax.value = 100; secYMin.value = 0; secYMax.value = 100; secZMin.value = 0; secZMax.value = 100;
      if (secRot) secRot.value = 0;
      updateSectionBox();
    });
    const sectionBoxCopy = document.getElementById("sectionBoxCopy");
    if (sectionBoxCopy) sectionBoxCopy.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(sectionBoxOutput.value); sectionBoxCopy.textContent = "✅ Copiado"; setTimeout(() => { sectionBoxCopy.textContent = "📋 Copiar coordenadas"; }, 1600); } catch (e) {}
    });
    updateSectionBox();
  }

  function animate(now) {
    requestAnimationFrame(animate);
    if (camAnim) camAnim.update(now);

    // Animación de las vacas caminando en el terreno sin flotar
    if (cowsGroup.visible && cowInstances.length) {
      const t = now * 0.001;
      for (let i = 0; i < cowInstances.length; i++) {
        const c = cowInstances[i];
        c.mesh.position.y = c.baseY !== undefined ? c.baseY : 0.55; // Firme sobre el terreno
        c.mesh.position.x = c.baseX + Math.sin(t * 0.15 * c.speed + c.phase) * c.wanderR;
        c.mesh.position.z = c.baseZ + Math.cos(t * 0.15 * c.speed + c.phase) * c.wanderR;
      }
    }
    if (playing && timesteps.length && slider) {
      if (lastFrameAt == null) lastFrameAt = now;
      const dt = (now - lastFrameAt) / 1000;
      lastFrameAt = now;
      currentTime += dt * speed;
      const maxT = parseFloat(slider.max) || 0;
      if (currentTime > maxT) currentTime = 0;
      slider.value = String(Math.round(currentTime));
      if (timeLabel) timeLabel.textContent = `${fmtTime(currentTime)} / ${fmtTime(maxT)}`;
      renderVehiclesAt(currentTime);
    }
    // Agua con movimiento: se desplaza lentamente la textura de color Y
    // la capa de relieve (bump) a velocidades/escalas DISTINTAS entre si,
    // simulando dos capas de oleaje superpuestas (exacto a modulo-10-corte.html).
    if (waterTexRef) {
      waterTexRef.offset.x = (now * 0.000018) % 1;
      waterTexRef.offset.y = (now * 0.000012) % 1;
    }
    if (waterBumpRef) {
      waterBumpRef.offset.x = (now * -0.000027) % 1;
      waterBumpRef.offset.y = (now * 0.000021) % 1;
    }
    updateBirds(now);
    controls.update();
    renderer.render(scene, camera);
  }
  // ---- Corte del Humedal: vista en perspectiva con coordenadas fijas ----
  const sectionCanvas = document.getElementById("sectionCanvas");
  const sectionWrap = document.getElementById("sectionWrap");
  const sectionRot = document.getElementById("sectionRot");
  const sectionRotVal = document.getElementById("sectionRotVal");
  const sectionStraightenBtn = document.getElementById("sectionStraightenBtn");
  const sectionCoordsOutput = document.getElementById("sectionCoordsOutput");
  const goCorteBtn = document.getElementById("goCorteBtn");
  const sectionCamera = new THREE.PerspectiveCamera(55, 1, 0.5, 5000);
  let sectionRenderer = null;
  if (sectionCanvas) {
    sectionRenderer = new THREE.WebGLRenderer({ canvas: sectionCanvas, antialias: true, alpha: true });
    sectionRenderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    sectionRenderer.localClippingEnabled = true;
    sectionRenderer.setClearColor(0x0b0c0f, 1);
  }
  // Plano de corte fijo (se actualiza con la rotación)
  const cutPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 1e6);
  let cutRotAngle = 54;
  // Líneas más gruesas solo en la vista del corte
  const origEdgeOpacity = buildingEdgeMat ? buildingEdgeMat.opacity : 0.14;
  if (buildingEdgeMat) buildingEdgeMat.opacity = 0.30; // buildingEdgeMat aun puede ser null aqui (los edificios cargan despues, de forma asincrona); se aplica mas abajo cuando ya existe

  function updateCutView() {
    if (!sectionRenderer) return;
    const rad = cutRotAngle * Math.PI / 180;
    cutPlane.normal.set(Math.cos(rad), 0, Math.sin(rad));
    cutPlane.constant = 0;
    sectionRenderer.clippingPlanes = [cutPlane];
    // Cámara en perspectiva con coordenadas fijas
    sectionCamera.position.set(102.0, 17.7, 38.4);
    sectionCamera.up.set(0, 1, 0);
    sectionCamera.lookAt(249.7, 10.5, -75.6);
    sectionCamera.fov = 55;
    sectionCamera.updateProjectionMatrix();
    // Actualizar coordenadas mostradas
    if (sectionCoordsOutput) {
      sectionCoordsOutput.value =
        `Rotación: ${cutRotAngle}°\n` +
        `U (a lo largo del giro): 48% a 62%\n` +
        `Y (altura, m): 0.0 a 100.0\n` +
        `V (perpendicular): 14% a 30%\n` +
        `(referencia sin girar — real 5042 a 7136 / 4933 a 6349)\n` +
        `--- Cámara ---\n` +
        `Proyección: perspectiva\n` +
        `Posición: ${sectionCamera.position.x.toFixed(1)}, ${sectionCamera.position.y.toFixed(1)}, ${sectionCamera.position.z.toFixed(1)}\n` +
        `Mira hacia: 249.7, 10.5, -75.6\n` +
        `FOV: 55.0°`;
    }
  }
  function resizeCutView() {
    if (!sectionRenderer || !sectionCanvas) return;
    const rect = sectionCanvas.getBoundingClientRect();
    const w = Math.max(1, rect.width), h = Math.max(1, rect.height);
    sectionRenderer.setSize(w, h, false);
    sectionCamera.aspect = w / h;
    sectionCamera.updateProjectionMatrix();
  }
  if (sectionRot) sectionRot.addEventListener("input", () => {
    cutRotAngle = parseFloat(sectionRot.value);
    if (sectionRotVal) sectionRotVal.textContent = cutRotAngle + "°";
    updateCutView();
  });
  if (sectionStraightenBtn) sectionStraightenBtn.addEventListener("click", () => {
    cutRotAngle = 0;
    if (sectionRot) sectionRot.value = 0;
    if (sectionRotVal) sectionRotVal.textContent = "0°";
    updateCutView();
  });
  if (goCorteBtn) goCorteBtn.addEventListener("click", () => {
    if (sectionWrap) {
      const isHidden = sectionWrap.style.display === "none";
      sectionWrap.style.display = isHidden ? "block" : "none";
      goCorteBtn.textContent = isHidden ? "✂️ Ocultar corte" : "✂️ Ver corte del Humedal";
      if (isHidden) {
        resizeCutView();
        updateCutView();
      }
    }
  });

  
  // ---- Controles de edición de color de edificios ----
  const bInfoClose = document.getElementById("buildingInfoClose");
  if (bInfoClose) bInfoClose.addEventListener("click", hideBuildingEditor);

  const colorSwatches = document.querySelectorAll("#buildingColorPalette .color-swatch");
  colorSwatches.forEach(btn => {
    btn.addEventListener("click", () => {
      const hexColor = btn.dataset.color;
      const customPicker = document.getElementById("buildingCustomColorPicker");
      if (customPicker) customPicker.value = hexColor;
      if (selectedBuildingRange) {
        setBuildingColor(selectedBuildingRange, hexColor);
      }
    });
  });

  const customPicker = document.getElementById("buildingCustomColorPicker");
  if (customPicker) {
    customPicker.addEventListener("input", (e) => {
      const hexColor = e.target.value;
      if (selectedBuildingRange) {
        setBuildingColor(selectedBuildingRange, hexColor);
      }
    });
  }

  const copyConfigBtn = document.getElementById("copyBuildingColorConfigBtn");
  if (copyConfigBtn) {
    copyConfigBtn.addEventListener("click", async () => {
      const outputEl = document.getElementById("buildingColorConfigOutput");
      if (!outputEl) return;
      try {
        await navigator.clipboard.writeText(outputEl.value);
        copyConfigBtn.textContent = "✅ Configuración copiada";
        setTimeout(() => { copyConfigBtn.textContent = "📋 Copiar cambios de color"; }, 1600);
      } catch (e) {}
    });
  }

  // =====================================================================
  // HERRAMIENTAS DE COORDENADAS DE CÁMARA Y POBLACIÓN DE ELEMENTOS
  // =====================================================================

  // 1. Panel de Coordenadas de Cámara en Vivo
  function updateLiveCameraCoordsUI() {
    const box = document.getElementById("liveCamCoordsBox");
    if (!box) return;
    const p = camera.position;
    const t = controls.target;
    const z = camera.zoom;
    box.innerHTML = `<b>pos:</b> [${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}]<br>` +
                    `<b>target:</b> [${t.x.toFixed(2)}, ${t.y.toFixed(2)}, ${t.z.toFixed(2)}]<br>` +
                    `<b>zoom:</b> ${z.toFixed(2)}`;
  }

  controls.addEventListener("change", updateLiveCameraCoordsUI);

  const copyCamBtn = document.getElementById("copyCamCoordsBtn");
  if (copyCamBtn) {
    copyCamBtn.addEventListener("click", async () => {
      const p = camera.position;
      const t = controls.target;
      const z = camera.zoom;
      const snippet = `// Coordenadas de Vista seleccionadas:\ncamera.position.set(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)});\ncontrols.target.set(${t.x.toFixed(2)}, ${t.y.toFixed(2)}, ${t.z.toFixed(2)});\ncamera.zoom = ${z.toFixed(2)};\ncamera.updateProjectionMatrix();\ncontrols.update();`;
      try {
        await navigator.clipboard.writeText(snippet);
        copyCamBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copiado';
        setTimeout(() => { copyCamBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Copiar'; }, 1800);
      } catch (e) {}
    });
  }

  const applyCamBtn = document.getElementById("applyCamCoordsBtn");
  const pasteCamInput = document.getElementById("pasteCamCoordsInput");
  if (applyCamBtn && pasteCamInput) {
    applyCamBtn.addEventListener("click", () => {
      const raw = pasteCamInput.value.trim();
      if (!raw) return;
      // Extrae números usando regex
      const matches = raw.match(/[-+]?\d*\.?\d+/g);
      if (matches && matches.length >= 6) {
        const px = parseFloat(matches[0]), py = parseFloat(matches[1]), pz = parseFloat(matches[2]);
        const tx = parseFloat(matches[3]), ty = parseFloat(matches[4]), tz = parseFloat(matches[5]);
        const z = matches.length >= 7 ? parseFloat(matches[6]) : camera.zoom;

        transitionCameraTo(
          new THREE.Vector3(px, py, pz),
          new THREE.Vector3(tx, ty, tz),
          z,
          1200
        );
      }
    });
  }

  // 2. Población de Árboles y Vacas
  function updateUserPlantedUI() {
    const treeCountEl = document.getElementById("plantedTreesCount");
    const cowCountEl = document.getElementById("plantedCowsCount");
    const textarea = document.getElementById("elementsCoordsOutput");

    const trees = userPlantedElements.filter(e => e.type === "arbol");
    const cows = userPlantedElements.filter(e => e.type === "vaca");

    if (treeCountEl) treeCountEl.textContent = `${trees.length} nuevos`;
    if (cowCountEl) cowCountEl.textContent = `${cows.length} nuevas`;

    if (textarea) {
      const formatted = userPlantedElements.map((el, idx) => {
        if (el.type === "arbol") {
          return `{"id": ${idx + 1}, "tipo": "arbol", "x": ${el.x.toFixed(2)}, "z": ${el.z.toFixed(2)}, "altura": ${el.h.toFixed(2)}}`;
        } else {
          return `{"id": ${idx + 1}, "tipo": "vaca", "x": ${el.x.toFixed(2)}, "z": ${el.z.toFixed(2)}}`;
        }
      }).join(",\n");
      textarea.value = formatted ? `[\n${formatted}\n]` : "";
    }
  }

  function plantSingleTree(x, z, hMeters = null) {
    const treeTex = new THREE.TextureLoader().load("./assets/arbol_real4.png");
    const planeGeo = makePlaneGeometry();
    const mat = new THREE.MeshStandardMaterial({
      map: treeTex,
      transparent: true,
      alphaTest: 0.25,
      side: THREE.DoubleSide,
      roughness: 0.95
    });
    const mesh = new THREE.Mesh(planeGeo, mat);
    mesh.renderOrder = 999;
    
    // Altura natural variada individual
    const actualH = hMeters || (4.2 + Math.random() * 5.8);
    const h = Math.max(0.3, actualH * SCALE);
    const w = h * (1.05 + Math.random() * 0.25);
    
    // ~20% de árboles son ejemplares grandes y maduros
    const isBig = Math.random() < 0.22;
    const s = isBig ? (1.8 + Math.random() * 0.6) : (0.9 + Math.random() * 0.35);
    
    mesh.userData = { baseW: w, baseH: h, scale: s };
    mesh.scale.set(w * s, h * s, w * s);
    mesh.position.set(x, 0.05, z);

    const dx = camera.position.x - controls.target.x, dz = camera.position.z - controls.target.z;
    mesh.rotation.y = Math.atan2(dx, dz);

    userPlantedGroup.add(mesh);
    userPlantedElements.push({ type: "arbol", x, z, h: actualH * s, mesh });
    updateUserPlantedUI();
  }

  function plantSingleCow(x, z) {
    const tex = cowTextures[Math.floor(Math.random() * cowTextures.length)];
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      side: THREE.DoubleSide,
      alphaTest: 0.35,
      depthWrite: false
    });
    const geo = new THREE.PlaneGeometry(1.6, 1.1);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 999;

    const shadowGeo = new THREE.PlaneGeometry(1.5, 0.8);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.38,
      depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, -0.63, 0);
    shadowMesh.renderOrder = 998;
    mesh.add(shadowMesh);

    mesh.position.set(x, 0.65, z);
    mesh.rotation.x = -Math.PI / 4.2;
    mesh.rotation.y = (Math.random() - 0.5) * 0.3;
    const s = 0.85 + Math.random() * 0.3;
    mesh.scale.set((Math.random() > 0.5 ? 1 : -1) * s, s, s);

    userPlantedGroup.add(mesh);
    userPlantedElements.push({ type: "vaca", x, z, mesh });
    updateUserPlantedUI();
  }

  const USER_TREES_URL = "./assets/user_planted_trees.json";
  let userTreesInstMesh = null;

  function loadUserPlantedTrees() {
    return fetch(USER_TREES_URL)
      .then(r => { if (!r.ok) throw new Error("no user trees"); return r.json(); })
      .then(items => {
        if (!Array.isArray(items) || !items.length) return;
        const treeTex = new THREE.TextureLoader().load("./assets/arbol_real4.png");
        const planeGeo = makePlaneGeometry();
        const mat = new THREE.MeshStandardMaterial({
          map: treeTex,
          transparent: true,
          alphaTest: 0.25,
          side: THREE.DoubleSide,
          roughness: 0.95
        });

        const instMesh = new THREE.InstancedMesh(planeGeo, mat, items.length);
        instMesh.renderOrder = 999;
        const dummyU = new THREE.Object3D();
        const dx = camera.position.x - controls.target.x, dz = camera.position.z - controls.target.z;
        const faceAngle = Math.atan2(dx, dz);

        items.forEach((item, idx) => {
          const h = Math.max(0.3, (item.altura || 7.0) * SCALE);
          const w = h * 1.15;
          dummyU.position.set(item.x, 0.05, item.z);
          dummyU.scale.set(w, h, w);
          dummyU.rotation.set(0, faceAngle, 0);
          dummyU.updateMatrix();
          instMesh.setMatrixAt(idx, dummyU.matrix);

          userPlantedElements.push({
            type: "arbol",
            x: item.x,
            z: item.z,
            h: item.altura || 7.0,
            mesh: null
          });
        });
        instMesh.instanceMatrix.needsUpdate = true;
        userTreesInstMesh = instMesh;
        userPlantedGroup.add(instMesh);
        updateUserPlantedUI();
      })
      .catch(err => console.warn("No se pudieron cargar árboles pre-plantados:", err));
  }

  function batchPopulateTrees(count = 48) {
    const cx = controls.target.x;
    const cz = controls.target.z;
    const radius = 65;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * radius;
      const x = cx + Math.cos(angle) * dist;
      const z = cz + Math.sin(angle) * dist;
      const h = 3.8 + Math.random() * 5.2;
      plantSingleTree(x, z, h);
    }
  }

  function batchPopulateCows(count = 8) {
    const cx = controls.target.x;
    const cz = controls.target.z;
    const radius = 45;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * radius;
      const x = cx + Math.cos(angle) * dist;
      const z = cz + Math.sin(angle) * dist;
      plantSingleCow(x, z);
    }
  }

  // ---- Trazado de Vías (Ribbon con grosor) y Pistas (Polígono Relleno) ----
  function updatePolyCoordsUI() {
    const roadCountEl = document.getElementById("roadPointsCount");
    const runwayCountEl = document.getElementById("runwayPointsCount");
    const roadOut = document.getElementById("roadCoordsOutput");
    const runwayOut = document.getElementById("runwayCoordsOutput");

    if (roadCountEl) roadCountEl.textContent = `${customRoadPoints.length} pts`;
    if (runwayCountEl) runwayCountEl.textContent = `${customRunwayPoints.length} pts`;

    if (roadOut) {
      if (customRoadPoints.length === 0) roadOut.value = "";
      else {
        roadOut.value = "[\n" + customRoadPoints.map(p => `  {"x": ${p.x.toFixed(2)}, "z": ${p.z.toFixed(2)}}`).join(",\n") + "\n]";
      }
    }

    if (runwayOut) {
      if (customRunwayPoints.length === 0) runwayOut.value = "";
      else {
        runwayOut.value = "[\n" + customRunwayPoints.map(p => `  {"x": ${p.x.toFixed(2)}, "z": ${p.z.toFixed(2)}}`).join(",\n") + "\n]";
      }
    }
  }

  function buildRoadRibbon(pts, isFinal = false) {
    if (currentActiveRoadMesh) {
      customPolysGroup.remove(currentActiveRoadMesh);
      currentActiveRoadMesh.geometry.dispose();
      currentActiveRoadMesh = null;
    }
    if (pts.length < 2) return;

    const positions = [];
    const uvs = [];
    const HALF_W = 1.4; // Ancho natural de vía
    const RIBBON_UV_SCALE = 0.08;

    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const dx = b.x - a.x, dz = b.z - a.z;
      const len = Math.hypot(dx, dz) || 0.001;
      const nx = -dz / len * HALF_W, nz = dx / len * HALF_W;

      const y = 0.045; // Justo sobre el terreno
      positions.push(
        a.x - nx, y, a.z - nz,  a.x + nx, y, a.z + nz,  b.x + nx, y, b.z + nz,
        a.x - nx, y, a.z - nz,  b.x + nx, y, b.z + nz,  b.x - nx, y, b.z - nz
      );

      [
        [a.x - nx, a.z - nz], [a.x + nx, a.z + nz], [b.x + nx, b.z + nz],
        [a.x - nx, a.z - nz], [b.x + nx, b.z + nz], [b.x - nx, b.z - nz]
      ].forEach(([px, pz]) => uvs.push(px * RIBBON_UV_SCALE, pz * RIBBON_UV_SCALE));
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, customRoadMat);
    mesh.renderOrder = 300;
    mesh.receiveShadow = true;
    customPolysGroup.add(mesh);
    if (!isFinal) currentActiveRoadMesh = mesh;
  }

  function buildRunwayPolygon(pts, isFinal = false) {
    if (currentActiveRunwayMesh) {
      customPolysGroup.remove(currentActiveRunwayMesh);
      currentActiveRunwayMesh.geometry.dispose();
      currentActiveRunwayMesh = null;
    }
    if (pts.length < 3) return;

    const pts2d = pts.map(p => new THREE.Vector2(p.x, p.z));
    let tris = [];
    try { tris = THREE.ShapeUtils.triangulateShape(pts2d, []); } catch (e) {}
    if (tris.length === 0 && pts.length >= 3) {
      for (let i = 1; i < pts.length - 1; i++) tris.push([0, i, i + 1]);
    }

    const positions = [], uvs = [];
    const UV_SCALE = 0.06;
    const y = 0.038;
    tris.forEach(([ia, ib, ic]) => {
      [ia, ib, ic].forEach(idx => {
        positions.push(pts[idx].x, y, pts[idx].z);
        uvs.push(pts[idx].x * UV_SCALE, pts[idx].z * UV_SCALE);
      });
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, customRunwayMat);
    mesh.renderOrder = 290;
    mesh.receiveShadow = true;
    customPolysGroup.add(mesh);
    if (!isFinal) currentActiveRunwayMesh = mesh;
  }

  const toolTreeBtn = document.getElementById("toolPlantTreeBtn");
  const toolCowBtn = document.getElementById("toolPlantCowBtn");
  const toolRoadBtn = document.getElementById("toolDrawRoadBtn");
  const toolRunwayBtn = document.getElementById("toolDrawRunwayBtn");

  function setToolMode(mode) {
    currentActiveTool = (currentActiveTool === mode) ? null : mode;
    
    if (toolTreeBtn) toolTreeBtn.classList.toggle("active", currentActiveTool === "tree");
    if (toolCowBtn) toolCowBtn.classList.toggle("cow-active", currentActiveTool === "cow");
    if (toolRoadBtn) toolRoadBtn.classList.toggle("active", currentActiveTool === "road");
    if (toolRunwayBtn) toolRunwayBtn.classList.toggle("active", currentActiveTool === "runway");

    // Desactivar paneo de OrbitControls mientras alguna herramienta esté activa
    controls.enabled = !currentActiveTool;
    renderer.domElement.style.cursor = currentActiveTool ? "crosshair" : "grab";
  }

  if (toolTreeBtn) toolTreeBtn.addEventListener("click", () => setToolMode("tree"));
  if (toolCowBtn) toolCowBtn.addEventListener("click", () => setToolMode("cow"));
  if (toolRoadBtn) toolRoadBtn.addEventListener("click", () => setToolMode("road"));
  if (toolRunwayBtn) toolRunwayBtn.addEventListener("click", () => setToolMode("runway"));

  const finishRoadBtn = document.getElementById("finishRoadBtn");
  if (finishRoadBtn) {
    finishRoadBtn.addEventListener("click", () => {
      buildRoadRibbon(customRoadPoints, true);
      currentActiveRoadMesh = null;
      setToolMode(null);
    });
  }

  const finishRunwayBtn = document.getElementById("finishRunwayBtn");
  if (finishRunwayBtn) {
    finishRunwayBtn.addEventListener("click", () => {
      buildRunwayPolygon(customRunwayPoints, true);
      currentActiveRunwayMesh = null;
      setToolMode(null);
    });
  }

  const copyRoadCoordsBtn = document.getElementById("copyRoadCoordsBtn");
  if (copyRoadCoordsBtn) {
    copyRoadCoordsBtn.addEventListener("click", async () => {
      const el = document.getElementById("roadCoordsOutput");
      if (!el || !el.value) return;
      try {
        await navigator.clipboard.writeText(el.value);
        copyRoadCoordsBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
        setTimeout(() => { copyRoadCoordsBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Copiar'; }, 1600);
      } catch (e) {}
    });
  }

  const copyRunwayCoordsBtn = document.getElementById("copyRunwayCoordsBtn");
  if (copyRunwayCoordsBtn) {
    copyRunwayCoordsBtn.addEventListener("click", async () => {
      const el = document.getElementById("runwayCoordsOutput");
      if (!el || !el.value) return;
      try {
        await navigator.clipboard.writeText(el.value);
        copyRunwayCoordsBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
        setTimeout(() => { copyRunwayCoordsBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Copiar'; }, 1600);
      } catch (e) {}
    });
  }

  const clearPolysBtn = document.getElementById("clearPolysBtn");
  if (clearPolysBtn) {
    clearPolysBtn.addEventListener("click", () => {
      customPolysGroup.clear();
      customRoadPoints.length = 0;
      customRunwayPoints.length = 0;
      currentActiveRoadMesh = null;
      currentActiveRunwayMesh = null;
      updatePolyCoordsUI();
    });
  }

  // Tecla Escape para cancelar cualquier herramienta activa
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && currentActiveTool) {
      setToolMode(null);
    }
  });

  const batchTreesBtn = document.getElementById("batchTreesBtn");
  if (batchTreesBtn) {
    batchTreesBtn.addEventListener("click", () => {
      batchPopulateTrees(24);
    });
  }

  const batchCowsBtn = document.getElementById("batchCowsBtn");
  if (batchCowsBtn) {
    batchCowsBtn.addEventListener("click", () => {
      batchPopulateCows(10);
    });
  }

  const copyElementsBtn = document.getElementById("copyElementsCoordsBtn");
  if (copyElementsBtn) {
    copyElementsBtn.addEventListener("click", async () => {
      const textarea = document.getElementById("elementsCoordsOutput");
      if (!textarea || !textarea.value) return;
      try {
        await navigator.clipboard.writeText(textarea.value);
        copyElementsBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
        setTimeout(() => { copyElementsBtn.innerHTML = '<i class="fa-solid fa-copy"></i>'; }, 1800);
      } catch (e) {}
    });
  }

  const clearElementsBtn = document.getElementById("clearElementsBtn");
  if (clearElementsBtn) {
    clearElementsBtn.addEventListener("click", () => {
      userPlantedGroup.clear();
      userPlantedElements.length = 0;
      updateUserPlantedUI();
    });
  }

  // 3. Controles en vivo del color y opacidad del pasto
  const grassColorPicker = document.getElementById("grassColorPicker");
  const grassColorHex = document.getElementById("grassColorHex");
  const grassOpacitySlider = document.getElementById("grassOpacitySlider");
  const grassOpacityVal = document.getElementById("grassOpacityVal");

  if (grassColorPicker) {
    grassColorPicker.addEventListener("input", (e) => {
      const hex = e.target.value;
      if (grassColorHex) grassColorHex.textContent = hex;
      if (groundMesh && groundMesh.material) {
        groundMesh.material.color.set(hex);
      }
    });
  }

  if (grassOpacitySlider) {
    grassOpacitySlider.addEventListener("input", (e) => {
      const op = parseFloat(e.target.value);
      if (grassOpacityVal) grassOpacityVal.textContent = `${Math.round(op * 100)}%`;
      if (groundMesh && groundMesh.material) {
        groundMesh.material.opacity = op;
        groundMesh.material.transparent = true;
      }
    });
  }

  // 4. Control de tamaño / escala de árboles individuales (24 destacados)
  const treeScaleSlider = document.getElementById("treeScaleSlider");
  const treeScaleVal = document.getElementById("treeScaleVal");
  if (treeScaleSlider) {
    treeScaleSlider.addEventListener("input", (e) => {
      prominentTreeScale = parseFloat(e.target.value);
      if (treeScaleVal) treeScaleVal.textContent = `${prominentTreeScale.toFixed(1)}x`;
      updateTreeBillboards();
    });
  }

  const randomizeTreesBtn = document.getElementById("randomizeTreesBtn");
  if (randomizeTreesBtn) {
    randomizeTreesBtn.addEventListener("click", () => {
      pickProminentTrees(24);
    });
  }

  resize();
  updateLiveCameraCoordsUI();
  updateUserPlantedUI();
  updatePolyCoordsUI();
  loadUserPlantedTrees();
  requestAnimationFrame(animate);

})();
