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
  scene.background = new THREE.Color(0xf3f4f5);
  scene.fog = new THREE.Fog(0xf3f4f5, 900, 3200);
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
  let modernRoadLines = null;
  let modernRoadMesh = null;
  let modernManzanasMesh = null;
  let camAnim = null;

  const cowsGroup = new THREE.Group();
  sceneRoot.add(cowsGroup);

  const historicalWetlandsGroup = new THREE.Group();
  sceneRoot.add(historicalWetlandsGroup);

  const americasRoadGroup = new THREE.Group();
  sceneRoot.add(americasRoadGroup);

  const aeropuertoTechoGroup = new THREE.Group();
  sceneRoot.add(aeropuertoTechoGroup);


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
  canvas.addEventListener("contextmenu", (e) => e.preventDefault()); // sin esto, el navegador abre su menu contextual con el clic derecho en vez de dejarlo mover (panear) la vista
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  // Antes el angulo de camara quedaba fijo en 45 grados (solo se podia
  // orbitar en horizontal). Ahora se puede inclinar la vista libremente,
  // para poder ver el corte de la caja de seccion desde el angulo que se
  // quiera, no solo desde arriba.
  controls.minPolarAngle = Math.PI / 12;   // casi cenital
  controls.maxPolarAngle = Math.PI / 2.05; // casi al ras del horizonte
  controls.minZoom = 0.15;
  controls.maxZoom = 30;
  controls.enablePan = true;

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
    perspToggleBtn.textContent = usingPersp ? "📏 Ver en axonométrica" : "📐 Ver en perspectiva";
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
  let waterTexRef = null, waterBumpRef = null; // texturas de agua, animadas en el loop de render
  let buildingEdgeMat = null; // referencia para ajustar su opacidad segun el zoom
  let groundMesh = null;

  function buildGround(bbox) {
    const w = (bbox[2] - bbox[0]) * SCALE * 1.4;
    const h = (bbox[3] - bbox[1]) * SCALE * 1.4;
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.MeshStandardMaterial({ color: 0xeceeef, roughness: 1, metalness: 0 });
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

    buildings.forEach((b, idx) => {
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
    sceneRoot.add(new THREE.LineSegments(edgeGeo, edgeMat));
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
    const colorAlimento1 = new THREE.Color(0xff5fa8); // Cerezo
    const colorAlimento2 = new THREE.Color(0xb06bff); // Sauco
    const colorDescanso = new THREE.Color(0x25d0a0);  // Urapan
    const colorNormal = new THREE.Color(0xffffff);
    
    trees.forEach((t, i) => {
      const [x, y, hMeters, especieStr, code] = t;
      const p = toScene(x, y);
      const h = Math.max(0.3, hMeters * SCALE);
      const w = h * (1.1 + (hash2(code) % 20) / 100 - 0.1);
      treeInstanceData[i] = { x: p.x, z: p.z, w, h };
      
      let c = colorNormal;
      if (especieStr.includes("Sauco")) c = colorAlimento2;
      else if (especieStr.includes("capuli")) c = colorAlimento1;
      else if (especieStr.includes("Fresno") || especieStr.includes("Urap")) c = colorDescanso;
      
      mesh.setColorAt(i, c);
    });
    mesh.instanceColor.needsUpdate = true;
    sceneRoot.add(mesh);
    treeMeshes = [{ mesh, data: trees }];
    updateTreeBillboards();
  }
  // Recalcula la rotacion de TODAS las tarjetas para que miren hacia la
  // camara actual. Con camara ortografica la direccion hacia la camara es
  // la misma sin importar la posicion en el suelo, asi que un solo angulo
  // (el acimut actual de la camara) sirve para todas las instancias.
  const dummyT = new THREE.Object3D();
  function updateTreeBillboards() {
    if (!treeMesh || !treeInstanceData) return;
    const dx = camera.position.x - controls.target.x, dz = camera.position.z - controls.target.z;
    const faceAngle = Math.atan2(dx, dz);
    for (let i = 0; i < treeInstanceData.length; i++) {
      const d = treeInstanceData[i];
      dummyT.position.set(d.x, 0, d.z);
      dummyT.scale.set(d.w, d.h, d.w);
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
    "Sauco": { key: "sauco", color: 0xb06bff, weight: 1.0, base: 260 },
    "Cerezo, capuli": { key: "capuli", color: 0xff5fa8, weight: 0.76, base: 200 },
    "Urapán, Fresno": { key: "urapan", color: 0x25d0a0, weight: 0.52, base: 220 },
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
      b.sprite.material.color.set(b.estresada ? 0xff6b4d : 0xffffff);
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
    const waterTex = new THREE.TextureLoader().load("./assets/textura_agua2.jpg");
    waterTex.wrapS = THREE.RepeatWrapping;
    waterTex.wrapT = THREE.RepeatWrapping;
    waterTexRef = waterTex;
    // Segunda copia de la misma textura, usada como relieve (bump map) en
    // vez de color: le da micro-relieve a la superficie para que capte
    // la luz de forma irregular (brillos/reflejos que cambian segun el
    // angulo), como agua real — una superficie perfectamente lisa se ve
    // "plana"/pintada, no renderizada. Se anima a otra velocidad/escala
    // que la capa de color, simulando dos capas de oleaje superpuestas.
    const bumpTex = new THREE.TextureLoader().load("./assets/textura_agua2.jpg");
    bumpTex.wrapS = THREE.RepeatWrapping;
    bumpTex.wrapT = THREE.RepeatWrapping;
    bumpTex.repeat.set(2.3, 2.3);
    waterBumpRef = bumpTex;
    const mat = new THREE.MeshStandardMaterial({
      map: waterTex, bumpMap: bumpTex, bumpScale: 0.12,
      color: 0x97a5af, roughness: 0.18, metalness: 0.15,
      transparent: true, opacity: 0.82, side: THREE.DoubleSide,
    });
    waterMat = mat;
    const waterMesh = new THREE.Mesh(geo, mat);
    waterMesh.receiveShadow = false; // sin sombras encima (se veian como parches/bloques feos sobre el agua)
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
      .then(data => { buildWaterBodies(data); buildHistoricalWetlands(data); setHistoricalYear(1950, false); if (typeof applyHumedalMes === "function") applyHumedalMes(parseInt(humedalMesSlider.value, 10)); })
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
    const pastoTex = new THREE.TextureLoader().load("./assets/textura_pasto.jpg");
    pastoTex.wrapS = THREE.RepeatWrapping;
    pastoTex.wrapT = THREE.RepeatWrapping;
    const mat = new THREE.MeshStandardMaterial({ map: pastoTex, color: 0xadaa90, roughness: 0.95, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    parqueMat = mat;
    const mesh = new THREE.Mesh(geo, mat);
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
    vehInstanced.count = n;
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
      buildAmericasRoad();
      buildAeropuertoTecho();
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
  playBtn.addEventListener("click", () => {
    playing = !playing;
    playBtn.innerHTML = playing ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
    lastFrameAt = null;
  });
  slider.addEventListener("input", () => {
    currentTime = parseFloat(slider.value);
    renderVehiclesAt(currentTime);
    timeLabel.textContent = `${fmtTime(currentTime)} / ${fmtTime(parseFloat(slider.max))}`;
  });
  speedSelect.addEventListener("change", () => { speed = parseFloat(speedSelect.value); });

  // ---- Vista axonometrica fija con las coordenadas de la usuaria ----
  function setAxonometricView(distance) {
    camera.position.set(17.6, 630.7, 713.9);
    controls.target.set(139.2, -124.7, -31.7);
    camera.zoom = 2.39;
    camera.updateProjectionMatrix();
    controls.update();
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
  document.getElementById("treeInfoClose").addEventListener("click", () => treeInfo.classList.remove("show"));

  let downAt = null;
  renderer.domElement.addEventListener("pointerdown", (e) => { downAt = { x: e.clientX, y: e.clientY }; });
  renderer.domElement.addEventListener("pointerup", (e) => {
    if (!downAt) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    downAt = null;
    if (moved > 6) return; // fue un arrastre de camara, no un clic
    if (!treeMeshes.length) return;
    const rect = renderer.domElement.getBoundingClientRect();
    mouseNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouseNdc, camera);
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

    // Animación suave de las vacas pastando
    if (cowsGroup.visible && cowInstances.length) {
      const t = now * 0.001;
      for (let i = 0; i < cowInstances.length; i++) {
        const c = cowInstances[i];
        const bob = Math.sin(t * c.speed + c.phase) * 0.12;
        c.mesh.position.y = 1.8 + bob;
        // desplazamiento lento de pastoreo
        const wx = Math.sin(t * 0.2 + c.phase) * c.wanderR;
        const wz = Math.cos(t * 0.2 + c.phase) * c.wanderR;
        c.mesh.position.x = c.baseX + wx;
        c.mesh.position.z = c.baseZ + wz;
      }
    }
    if (playing && timesteps.length) {
      if (lastFrameAt == null) lastFrameAt = now;
      const dt = (now - lastFrameAt) / 1000;
      lastFrameAt = now;
      currentTime += dt * speed;
      const maxT = parseFloat(slider.max) || 0;
      if (currentTime > maxT) currentTime = 0;
      slider.value = String(Math.round(currentTime));
      timeLabel.textContent = `${fmtTime(currentTime)} / ${fmtTime(maxT)}`;
      renderVehiclesAt(currentTime);
    }
    // Lineas de borde de edificios: opacidad FIJA y baja, no cambia con
    // el zoom (asi no se ven gruesas/densas cuando no se esta haciendo
    // zoom, y no cambian de aspecto al acercar/alejar la camara).
    // Agua con movimiento: se desplaza lentamente la textura de color Y
    // la capa de relieve (bump) a velocidades/escalas DISTINTAS entre si,
    // simulando dos capas de oleaje superpuestas.
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

  resize();
  requestAnimationFrame(animate);

  // =====================================================================
  // SIMULACIÓN HISTÓRICA: 1950 (Sabana & Humedal El Burro) y 1956 (La Vaca, Av. Américas & Aeropuerto de Techo)
  // =====================================================================
  // Grupos históricos ya inicializados en la cabecera

  // 1. Sprites de vacas en pastoreo
  const cowTextures = [];
  const texLoader = new THREE.TextureLoader();
  for (let i = 0; i < 12; i++) {
    cowTextures.push(texLoader.load(`./assets/vaca_${i}.png`));
  }

  const cowInstances = [];
  function createCows() {
    // Distribuir vacas en las zonas de potrero (pastizales de la Sabana)
    // Alrededor de El Burro, La Vaca y Techo
    const cowZones = [
      { cx: 160, cz: -10, rx: 90, rz: 60, count: 28 },  // Alrededor de El Burro
      { cx: 70, cz: 110, rx: 70, rz: 50, count: 24 },   // Alrededor de La Vaca
      { cx: 270, cz: 90, rx: 80, rz: 60, count: 26 },   // Alrededor de Techo / Pasturas
      { cx: 100, cz: -100, rx: 70, rz: 60, count: 18 },  // Zona rural norte
    ];

    cowZones.forEach(zone => {
      for (let i = 0; i < zone.count; i++) {
        const tex = cowTextures[Math.floor(Math.random() * cowTextures.length)];
        const mat = new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          side: THREE.DoubleSide,
          alphaTest: 0.1,
          depthWrite: false
        });
        const geo = new THREE.PlaneGeometry(5.2, 3.8);
        const mesh = new THREE.Mesh(geo, mat);

        // Posición aleatoria dentro de la zona
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.sqrt(Math.random());
        const x = zone.cx + Math.cos(angle) * zone.rx * dist;
        const z = zone.cz + Math.sin(angle) * zone.rz * dist;

        mesh.position.set(x, 1.8, z);
        mesh.rotation.x = -Math.PI / 4.2; // inclinación hacia la vista axonométrica para proyección isométrica perfecta
        mesh.rotation.y = (Math.random() - 0.5) * 0.4;
        mesh.scale.set(Math.random() > 0.5 ? 1 : -1, 1, 1); // variar orientación

        cowsGroup.add(mesh);
        cowInstances.push({
          mesh,
          baseX: x,
          baseZ: z,
          phase: Math.random() * Math.PI * 2,
          speed: 0.3 + Math.random() * 0.4,
          wanderR: 2 + Math.random() * 3
        });
      }
    });
  }
  // createCows() llamado en fetch(NET_URL)

  // 2. Construcción de humedales históricos expandidos (1950: +94% El Burro, +90% La Vaca, +85% Techo)
  function buildHistoricalWetlands(waterBodies) {
    if (!waterBodies || !waterBodies.length) return;
    const positions = [], uvs = [];
    const UV_SCALE = 0.08;

    waterBodies.forEach(w => {
      const name = w.nombre || "";
      let scale = 1.0;
      if (name.includes("Burro")) scale = 1.94; // +94% expansión histórica en 1950
      else if (name.includes("Vaca")) scale = 1.90; // +90% expansión histórica
      else if (name.includes("Techo")) scale = 1.85; // +85% expansión histórica
      else scale = 1.4; // canales y meandros naturales

      // Calcular centro del polígono
      const cx = w.pts.reduce((s, p) => s + p[0], 0) / w.pts.length;
      const cy = w.pts.reduce((s, p) => s + p[1], 0) / w.pts.length;

      const pts = w.pts.map(p => {
        const ex = cx + (p[0] - cx) * scale;
        const ey = cy + (p[1] - cy) * scale;
        return toScene(ex, ey);
      });

      if (pts.length < 3) return;
      const pts2d = pts.map(p => new THREE.Vector2(p.x, p.z));
      let tris = [];
      try { tris = THREE.ShapeUtils.triangulateShape(pts2d, []); } catch (e) {}

      tris.forEach(([a, b, c]) => {
        [a, b, c].forEach(idx => {
          positions.push(pts[idx].x, 0.024, pts[idx].z);
          uvs.push(pts[idx].x * UV_SCALE, pts[idx].z * UV_SCALE);
        });
      });
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.computeVertexNormals();

    const histWaterMat = new THREE.MeshStandardMaterial({
      map: waterTexRef,
      bumpMap: waterBumpRef,
      bumpScale: 0.12,
      color: 0x729baa, // agua natural más cristalina y limpia en la Sabana de 1950
      roughness: 0.15,
      metalness: 0.12,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geo, histWaterMat);
    historicalWetlandsGroup.add(mesh);
  }

  // 3. Avenida de las Américas (1956)
  function buildAmericasRoad() {
    // Traza de la Avenida de las Américas desde el borde oriental directo al Aeropuerto de Techo y cruzando Kennedy
    const pts = [
      toScene(10600, 2000),
      toScene(9500, 2040),
      toScene(8600, 2080),
      toScene(8180.94, 2102.08), // Aeropuerto de Techo / Banderas
      toScene(7200, 2140),
      toScene(6000, 2180),
      toScene(4800, 2220),
      toScene(3500, 2260)
    ];

    const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p.x, 0.016, p.z)));
    const tubeGeo = new THREE.TubeGeometry(curve, 64, 2.4, 4, false);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x3d434a,
      roughness: 0.9,
      metalness: 0.1
    });
    const roadMesh = new THREE.Mesh(tubeGeo, roadMat);
    americasRoadGroup.add(roadMesh);

    // Líneas divisorias blancas de la avenida
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    const lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(80));
    americasRoadGroup.add(new THREE.Line(lineGeo, lineMat));
  }
  // buildAmericasRoad() llamado en fetch(NET_URL)

  // 4. Modelo 3D del Antiguo Aeropuerto de Techo (1930–1959)
  function buildAeropuertoTecho() {
    const pos = toScene(8180.94, 2102.08); // { x: ~283.96, z: ~105.98 }
    const group = new THREE.Group();
    group.position.set(pos.x, 0, pos.z);

    // Material estilo Art Déco / colonial moderno años 30-50
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xe8e4dc,
      roughness: 0.7,
      metalness: 0.1
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0xb5714a, // teja de barro / terracota
      roughness: 0.6
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x3a5a78,
      roughness: 0.2,
      metalness: 0.6,
      transparent: true,
      opacity: 0.8
    });
    const apronMat = new THREE.MeshStandardMaterial({
      color: 0x4a4d52,
      roughness: 0.95
    });

    // Pista de aterrizaje / plataforma de carreteo
    const apronGeo = new THREE.PlaneGeometry(85, 24);
    const apron = new THREE.Mesh(apronGeo, apronMat);
    apron.rotation.x = -Math.PI / 2;
    apron.position.set(0, 0.012, 10);
    group.add(apron);

    // Edificio Terminal principal
    const termGeo = new THREE.BoxGeometry(32, 5.2, 14);
    const term = new THREE.Mesh(termGeo, wallMat);
    term.position.set(0, 2.6, -6);
    term.castShadow = true;
    term.receiveShadow = true;
    group.add(term);

    // Techo terminal
    const roofGeo = new THREE.BoxGeometry(33, 0.6, 15);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 5.5, -6);
    group.add(roof);

    // Torre de Control central
    const towerGeo = new THREE.BoxGeometry(8, 10.5, 8);
    const tower = new THREE.Mesh(towerGeo, wallMat);
    tower.position.set(0, 5.25, -6);
    tower.castShadow = true;
    group.add(tower);

    // Cabina de control acristalada
    const cabGeo = new THREE.BoxGeometry(9.2, 3.2, 9.2);
    const cab = new THREE.Mesh(cabGeo, glassMat);
    cab.position.set(0, 11.2, -6);
    group.add(cab);

    // Techo cúpula de la torre
    const domeGeo = new THREE.BoxGeometry(10, 0.8, 10);
    const dome = new THREE.Mesh(domeGeo, roofMat);
    dome.position.set(0, 13.0, -6);
    group.add(dome);

    // Alas laterales / Hangares auxiliares
    const hangarGeo = new THREE.BoxGeometry(18, 4.0, 16);
    const hangar1 = new THREE.Mesh(hangarGeo, wallMat);
    hangar1.position.set(-28, 2.0, -4);
    hangar1.castShadow = true;
    group.add(hangar1);

    const hangar2 = new THREE.Mesh(hangarGeo, wallMat);
    hangar2.position.set(28, 2.0, -4);
    hangar2.castShadow = true;
    group.add(hangar2);

    aeropuertoTechoGroup.add(group);
  }
  // buildAeropuertoTecho() llamado en fetch(NET_URL)

  // 5. Animación suave de cámara entre épocas
  let camAnim = null;
  function transitionCameraTo(targetPos, targetLookAt, targetZoom, duration = 1800) {
    const startPos = camera.position.clone();
    const startLookAt = controls.target.clone();
    const startZoom = camera.zoom;
    const startTime = performance.now();

    camAnim = {
      update(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        // Easing cúbico suave
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

  // 6. Función de cambio de época histórica
  function setHistoricalYear(year, animateCam = true) {
    currentHistoricalYear = year;

    // Actualizar botones de año y slider
    document.querySelectorAll(".year-btn").forEach(btn => {
      const y = parseInt(btn.dataset.year, 10);
      const isActive = y === year;
      btn.classList.toggle("active", isActive);
      btn.style.borderColor = isActive ? "var(--accent)" : "var(--panel-border)";
      btn.style.background = isActive ? "rgba(36,200,189,.25)" : "rgba(255,255,255,.06)";
      btn.style.color = isActive ? "var(--accent)" : "var(--ink)";
    });
    const slider = document.getElementById("histYearSlider");
    if (slider) slider.value = year;

    const badge = document.getElementById("eraBadge");
    const desc = document.getElementById("eraDesc");

    // Ocultar capas urbanas modernas en 1950 y 1956
    if (currentBuildingMesh) currentBuildingMesh.visible = false;
    if (buildingEdgeMat) buildingEdgeMat.visible = false;
    if (modernRoadLines) modernRoadLines.visible = false;
    if (modernRoadMesh) modernRoadMesh.visible = false;
    if (modernManzanasMesh) modernManzanasMesh.visible = false;
    if (vehInstanced) vehInstanced.visible = false;

    cowsGroup.visible = true;
    historicalWetlandsGroup.visible = true;

    // Cambiar tono del pasto a verde rural fértil de la Sabana
    if (groundMesh && groundMesh.material) {
      groundMesh.material.color.setHex(year === 1950 ? 0x5a8c52 : 0x54844e);
    }

    if (year === 1950) {
      if (badge) badge.textContent = "1950";
      if (desc) desc.textContent = "1950 · Humedal El Burro y Sabana Rural (89% a 98% mayor extensión hídrica, potreros de pastoreo con ganado vacuno, sin vías ni urbanización).";
      americasRoadGroup.visible = false;
      aeropuertoTechoGroup.visible = false;

      if (animateCam) {
        transitionCameraTo(
          new THREE.Vector3(17.6, 630.7, 713.9),
          new THREE.Vector3(139.2, -124.7, -31.7),
          2.39,
          1600
        );
      }
    } else if (year === 1956) {
      if (badge) badge.textContent = "1956";
      if (desc) desc.textContent = "1956 · Avenida de las Américas, Humedal La Vaca (+90% extensión) y Antiguo Aeropuerto de Techo. Potreros circundantes.";
      americasRoadGroup.visible = true;
      aeropuertoTechoGroup.visible = true;

      if (animateCam) {
        transitionCameraTo(
          new THREE.Vector3(190.0, 590.0, 560.0),
          new THREE.Vector3(175.0, -90.0, 70.0),
          2.10,
          1800
        );
      }
    }
  }

  // 7. Event listeners de la línea de tiempo histórica
  document.querySelectorAll(".year-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      setHistoricalYear(parseInt(btn.dataset.year, 10), true);
    });
  });

  const histSlider = document.getElementById("histYearSlider");
  if (histSlider) {
    histSlider.addEventListener("input", () => {
      setHistoricalYear(parseInt(histSlider.value, 10), true);
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
          const next = currentHistoricalYear === 1950 ? 1956 : 1950;
          setHistoricalYear(next, true);
        }, 5500);
      } else {
        clearInterval(histPlayTimer);
      }
    });
  }

})();
