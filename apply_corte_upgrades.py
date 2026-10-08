import re

# 1. Update modulo-10-corte.js
with open(r"C:\Users\ACER\.gemini\antigravity\scratch\humedalburro\modulo-10-corte.js", "r", encoding="utf-8") as f:
    js = f.read()

# Make sure rain and ripples are built and active by default
# Find buildLluvia and enhance it with water ripples
old_lluvia = """  let lluviaGroup = null, lluviaVel = null, lluviaActiva = false, lluviaVisible = true;
  const LLUVIA_COUNT = 4400, LLUVIA_ALTO = 90;
  let lluviaHalfW = 560, lluviaHalfH = 560;
  function buildLluvia() {
    if (lluviaGroup) return;"""

new_lluvia = """  let lluviaGroup = null, lluviaVel = null, lluviaActiva = true, lluviaVisible = true;
  const LLUVIA_COUNT = 4800, LLUVIA_ALTO = 90;
  let lluviaHalfW = 560, lluviaHalfH = 560;
  let waterRipplesGroup = null, ripplesData = [];
  const RIPPLES_COUNT = 180;

  function buildWaterRipples() {
    if (waterRipplesGroup) return;
    const ringGeo = new THREE.RingGeometry(0.25, 0.55, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: true
    });
    waterRipplesGroup = new THREE.InstancedMesh(ringGeo, ringMat, RIPPLES_COUNT);
    waterRipplesGroup.renderOrder = 998;
    waterRipplesGroup.frustumCulled = false;

    ripplesData = [];
    const dummy = new THREE.Object3D();
    for (let i = 0; i < RIPPLES_COUNT; i++) {
      // Coordenadas en el Humedal El Burro y cuerpos de agua
      const rx = 145 + Math.random() * 105;
      const rz = -45 + Math.random() * 85;
      const r = Math.random() * 3.5;
      const maxR = 2.0 + Math.random() * 2.8;
      const speed = 1.4 + Math.random() * 1.6;
      ripplesData.push({ x: rx, z: rz, y: 0.14, r, maxR, speed, alpha: 0.8 });
      dummy.position.set(rx, 0.14, rz);
      dummy.scale.set(r, r, r);
      dummy.updateMatrix();
      waterRipplesGroup.setMatrixAt(i, dummy.matrix);
    }
    waterRipplesGroup.instanceMatrix.needsUpdate = true;
    sceneRoot.add(waterRipplesGroup);
  }

  function buildLluvia() {
    if (lluviaGroup) return;
    buildWaterRipples();"""

if old_lluvia in js:
    js = js.replace(old_lluvia, new_lluvia)
else:
    print("WARNING: old_lluvia not found exactly, applying regex replacement")
    js = re.sub(r"let lluviaGroup = null, lluviaVel = null, lluviaActiva = false.*?(?=function buildLluvia\(\) \{)", new_lluvia, js, flags=re.DOTALL)

# Update updateLluvia to animate rain drops and water ripples
old_update_lluvia = """  function updateLluvia(dt) {
    // La lluvia 3D es SOLO de la axonometria principal; dentro de las escalas
    // (donde el corte tambien se renderiza desde esta misma escena) se apaga:
    // alli la lluvia la dibujan los lienzos 2D, y solo en la capa 1 y en la
    // vista con todas las capas naturales.
    if (lluviaGroup) { const vis = lluviaActiva && lluviaVisible && !explodeOverlayOpen(); if (lluviaGroup.visible !== vis) lluviaGroup.visible = vis; }
    if (!lluviaActiva || !lluviaGroup || !lluviaGroup.visible) return;
    for (let i = 0; i < lluviaVel.length; i++) {
      lluviaGroup.getMatrixAt(i, lluviaDummy.matrix);
      lluviaDummy.matrix.decompose(lluviaDummy.position, lluviaDummy.quaternion, lluviaDummy.scale);
      lluviaDummy.position.y -= lluviaVel[i] * dt;
      if (lluviaDummy.position.y < 0) {
        lluviaDummy.position.y = LLUVIA_ALTO - Math.random() * 10;
        lluviaDummy.position.x = (Math.random() - 0.5) * lluviaHalfW * 2;
        lluviaDummy.position.z = (Math.random() - 0.5) * lluviaHalfH * 2;
      }
      lluviaDummy.rotation.set(0.12, 0, 0.07);
      lluviaDummy.updateMatrix();
      lluviaGroup.setMatrixAt(i, lluviaDummy.matrix);
    }
    lluviaGroup.instanceMatrix.needsUpdate = true;
  }"""

new_update_lluvia = """  function updateLluvia(dt) {
    if (lluviaGroup) { const vis = lluviaActiva && lluviaVisible && !explodeOverlayOpen(); if (lluviaGroup.visible !== vis) lluviaGroup.visible = vis; }
    if (waterRipplesGroup) { const vis = lluviaActiva && lluviaVisible && !explodeOverlayOpen(); if (waterRipplesGroup.visible !== vis) waterRipplesGroup.visible = vis; }
    if (!lluviaActiva || !lluviaGroup || !lluviaGroup.visible) return;
    
    // Gotas de lluvia
    for (let i = 0; i < lluviaVel.length; i++) {
      lluviaGroup.getMatrixAt(i, lluviaDummy.matrix);
      lluviaDummy.matrix.decompose(lluviaDummy.position, lluviaDummy.quaternion, lluviaDummy.scale);
      lluviaDummy.position.y -= lluviaVel[i] * dt;
      if (lluviaDummy.position.y < 0) {
        lluviaDummy.position.y = LLUVIA_ALTO - Math.random() * 8;
        lluviaDummy.position.x = (Math.random() - 0.5) * lluviaHalfW * 2;
        lluviaDummy.position.z = (Math.random() - 0.5) * lluviaHalfH * 2;
      }
      lluviaDummy.rotation.set(0.12, 0, 0.07);
      lluviaDummy.updateMatrix();
      lluviaGroup.setMatrixAt(i, lluviaDummy.matrix);
    }
    lluviaGroup.instanceMatrix.needsUpdate = true;

    // Animación de ondas expansivas de agua (Water Ripples)
    if (waterRipplesGroup && ripplesData.length) {
      const ripDummy = new THREE.Object3D();
      for (let i = 0; i < ripplesData.length; i++) {
        const rp = ripplesData[i];
        rp.r += rp.speed * dt;
        if (rp.r >= rp.maxR) {
          rp.r = 0.2;
          rp.x = 145 + Math.random() * 105;
          rp.z = -45 + Math.random() * 85;
          rp.maxR = 2.0 + Math.random() * 2.8;
          rp.speed = 1.4 + Math.random() * 1.6;
        }
        const s = rp.r;
        ripDummy.position.set(rp.x, rp.y, rp.z);
        ripDummy.scale.set(s, s, s);
        ripDummy.updateMatrix();
        waterRipplesGroup.setMatrixAt(i, ripDummy.matrix);
      }
      waterRipplesGroup.instanceMatrix.needsUpdate = true;
    }
  }"""

if old_update_lluvia in js:
    js = js.replace(old_update_lluvia, new_update_lluvia)

# Enhance Noise Mesh to guarantee it renders on top of roads and terrain
old_noise_mesh = """    noiseTexture = new THREE.CanvasTexture(noiseBufCanvas);
    const mat = new THREE.MeshBasicMaterial({
      map: noiseTexture,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
      clippingPlanes: sectionClipPlanesArr,
      clipShadows: true,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set((c0.x + c1.x) / 2, 0.06, (c0.z + c1.z) / 2);
    mesh.visible = noiseOn; // antes quedaba oculto aunque el ruido estuviera activado
    sceneRoot.add(mesh);
    noiseMesh = mesh;"""

new_noise_mesh = """    noiseTexture = new THREE.CanvasTexture(noiseBufCanvas);
    const mat = new THREE.MeshBasicMaterial({
      map: noiseTexture,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      clippingPlanes: sectionClipPlanesArr,
      clipShadows: true,
      depthWrite: false,
      depthTest: true,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set((c0.x + c1.x) / 2, 0.24, (c0.z + c1.z) / 2);
    mesh.renderOrder = 90;
    mesh.visible = true;
    sceneRoot.add(mesh);
    noiseMesh = mesh;"""

if old_noise_mesh in js:
    js = js.replace(old_noise_mesh, new_noise_mesh)

# Enhance tree colors
old_tree_colors = """    const colorAlimento1 = new THREE.Color(0xff5fa8); // Cerezo
    const colorAlimento2 = new THREE.Color(0xb06bff); // Sauco
    const colorDescanso = new THREE.Color(0x25d0a0);  // Urapan
    const colorNormal = new THREE.Color(0xffffff);"""

new_tree_colors = """    const colorAlimento1 = new THREE.Color(0xf472b6); // Cerezo / Capulí (Rosa vivo)
    const colorAlimento2 = new THREE.Color(0xc084fc); // Saúco (Morado brillante)
    const colorDescanso = new THREE.Color(0x34d399);  // Urapán / Fresno (Verde esmeralda)
    const colorNormal = new THREE.Color(0xdce5dd);"""

if old_tree_colors in js:
    js = js.replace(old_tree_colors, new_tree_colors)

# Enhance Bird agent simulation to navigate explicitly between colored trees and flee from noise
old_bird_agent = """  function makeBirdAgent(origen) {
    const b0 = currentBoxRealBounds;
    let x, y;
    const refugeX = b0.xMin + (b0.xMax - b0.xMin) * 0.12, refugeY = b0.yMin + (b0.yMax - b0.yMin) * 0.88, refugeR = Math.min(b0.xMax - b0.xMin, b0.yMax - b0.yMin) * 0.12;
    let landedTree = null;
    if (origen === "refugio") {
      const a = Math.random() * Math.PI * 2, r = Math.random() * refugeR;
      x = refugeX + Math.cos(a) * r; y = refugeY + Math.sin(a) * r;
    } else if (origen === "humedal" && humedalTreesList.length > 0) {
      // Salen directamente de los árboles del humedal / cuerpo de agua
      const t = humedalTreesList[Math.floor(Math.random() * humedalTreesList.length)];
      x = t.x + (Math.random() - 0.5) * 6;
      y = t.y + (Math.random() - 0.5) * 6;
      landedTree = { x: t.x, y: t.y };
    } else {
      x = b0.xMax - Math.random() * 20; y = b0.yMin + Math.random() * (b0.yMax - b0.yMin);
    }
    const residente = origen === "refugio";
    const esHumedal = origen === "humedal";
    const birdObj = {
      x, y,
      vx: residente ? (Math.random() - 0.5) * 2.2 : (esHumedal ? (Math.random() - 0.7) * 2.0 : -(2.6 + Math.random() * 2.6)),
      vy: (Math.random() - 0.5) * (residente ? 2.2 : 1.4),
      rest: esHumedal ? (3 + Math.random() * 4) : 0,
      cooldown: 0,
      residente,
      esHumedal,
      origen,
      estresada: false,
      phase: Math.random() * 6.28,
      sprite: null,
      refugeX, refugeY, refugeR,
      landedAt: landedTree
    };
    return birdObj;
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
      // Se ancla al arbol donde aterrizo: sin esto, aunque vuele mas
      // lento durante el descanso, se sigue desplazando poco a poco y
      // termina alejandose del arbol en vez de quedarse posada ahi.
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
      const d = Math.hypot(b.x - b.refugeX, b.y - b.refugeY);
      if (d > b.refugeR) {
        const ux = (b.refugeX - b.x) / d, uy = (b.refugeY - b.y) / d;
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
          // Se quedan mas tiempo posadas en Sauco (la especie que predomina
          // junto al humedal) que en las otras, para que se note mas
          // presencia ahi en particular.
          const esSauco2 = arbol.meta.key === "sauco";
          b.rest = esSauco2 ? (5 + Math.random() * 3) : (2.5 + Math.random());
          b.cooldown = esSauco2 ? 3 : 7;
          b.landedAt = { x: arbol.x, y: arbol.y };
        }
      }
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > BIRD_MAX_SPEED) { b.vx = (b.vx / sp) * BIRD_MAX_SPEED; b.vy = (b.vy / sp) * BIRD_MAX_SPEED; }
    }
    // Umbral critico de 60 dB(A): igual que en la simulacion 2D de
    // referencia, se evalua el ruido en la posicion actual Y un poco por
    // delante del rumbo de vuelo (el sonido se "oye" antes de llegar), no
    // solo en el punto exacto donde esta el ave - asi la reaccion de
    // huida empieza a la distancia correcta, no solo cuando ya esta
    // encima del ruido.
    let exceso = Math.max(0, noiseDbAt(b.x, b.y) - BIRD_NOISE_DB);
    let rx = b.x, ry = b.y;
    const rapidez = Math.hypot(b.vx, b.vy) || 1;
    for (let k = 1; k <= 3; k++) {
      const ax = b.x + (b.vx / rapidez) * k * 30, ay = b.y + (b.vy / rapidez) * k * 30;
      const e = Math.max(0, noiseDbAt(ax, ay) - BIRD_NOISE_DB) * (1 - k * 0.15);
      if (e > exceso) { exceso = e; rx = ax; ry = ay; }
    }
    b.estresada = exceso > 0;
    if (exceso > 0) {
      const u = noiseEscapeDir(rx, ry);
      if (u) { b.vx += BIRD_K_REP * exceso * u[0] * dt; b.vy += BIRD_K_REP * exceso * u[1] * dt; }
      if (b.rest > 0) { b.rest = 0; b.cooldown = Math.max(b.cooldown, 3); }
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > BIRD_MAX_SPEED * 1.35) { b.vx = (b.vx / sp) * BIRD_MAX_SPEED * 1.35; b.vy = (b.vy / sp) * BIRD_MAX_SPEED * 1.35; }
    }
    b.x += b.vx * dt * 10;
    b.y += b.vy * dt * 10;
    const b0 = currentBoxRealBounds;
    if (b.x < b0.xMin) Object.assign(b, makeBirdAgent(b.origen || (b.residente ? "refugio" : "oriente")), { sprite: b.sprite });
  }"""

new_bird_agent = """  let allAttractorTreesList = [];

  function makeBirdAgent(origen) {
    const b0 = currentBoxRealBounds;
    let target = null;
    if (allAttractorTreesList.length > 0) {
      target = allAttractorTreesList[Math.floor(Math.random() * allAttractorTreesList.length)];
    }
    const x = target ? target.x + (Math.random() - 0.5) * 8 : (b0.xMax - Math.random() * 30);
    const y = target ? target.y + (Math.random() - 0.5) * 8 : (b0.yMin + Math.random() * (b0.yMax - b0.yMin));
    
    return {
      x, y,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      state: "perching", // Comienzan posadas en los árboles de colores
      perchTimer: 2.0 + Math.random() * 4.0,
      targetTree: target,
      lastTree: target,
      phase: Math.random() * 6.28,
      sprite: null
    };
  }

  function pickNextQuietTree(b) {
    if (!allAttractorTreesList || allAttractorTreesList.length === 0) return null;
    // Buscar árboles atractores cercanos en zonas tranquilas (ruido < 56 dB)
    const candidates = allAttractorTreesList.filter(t => {
      const dx = t.x - b.x, dy = t.y - b.y;
      const d = Math.hypot(dx, dy);
      return d > 8 && d < 220 && noiseDbAt(t.x, t.y) < 56 && (!b.lastTree || t !== b.lastTree);
    });
    if (candidates.length > 0) {
      // Priorizar Saúco (morado) y Capulí (rosado)
      candidates.sort((a, bTree) => (bTree.meta ? bTree.meta.weight : 0.5) - (a.meta ? a.meta.weight : 0.5));
      return candidates[Math.floor(Math.random() * Math.min(4, candidates.length))];
    }
    return allAttractorTreesList[Math.floor(Math.random() * allAttractorTreesList.length)];
  }

  function updateBirdAgent(b, dt) {
    b.phase += dt * 8;

    if (b.state === "perching") {
      b.perchTimer -= dt;
      // Mantenerse posada sobre la copa del árbol
      if (b.targetTree) {
        b.x += (b.targetTree.x - b.x) * 4.0 * dt;
        b.y += (b.targetTree.y - b.y) * 4.0 * dt;
      }
      b.vx = 0; b.vy = 0;
      if (b.perchTimer <= 0) {
        b.lastTree = b.targetTree;
        b.targetTree = pickNextQuietTree(b);
        b.state = "flying";
      }
    } else {
      // Volando hacia el árbol atractor objetivo
      if (!b.targetTree) b.targetTree = pickNextQuietTree(b);
      
      const dx = b.targetTree.x - b.x;
      const dy = b.targetTree.y - b.y;
      const dist = Math.hypot(dx, dy) || 1;

      // Dirección deseada hacia el árbol
      const dirX = dx / dist;
      const dirY = dy / dist;

      // Evaluar si el ave se aproxima a una zona ruidosa (vías / tráfico)
      const lookAheadDist = 35;
      const probeX = b.x + dirX * lookAheadDist;
      const probeY = b.y + dirY * lookAheadDist;
      const noiseAhead = noiseDbAt(probeX, probeY);
      const noiseCurrent = noiseDbAt(b.x, b.y);

      if (noiseAhead >= 58 || noiseCurrent >= 58) {
        // ZONA DE RUIDO DETECTADA: Huir inmediatamente en sentido contrario
        const esc = noiseEscapeDir(probeX, probeY) || [-dirX, -dirY];
        b.vx += esc[0] * 18.0 * dt;
        b.vy += esc[1] * 18.0 * dt;
        // Reorientar objetivo hacia el árbol seguro más cercano
        b.targetTree = pickNextQuietTree(b);
      } else {
        // Vuelo natural hacia el árbol con aleteo suave
        const targetSpeed = 2.8;
        b.vx += (dirX * targetSpeed - b.vx) * 3.5 * dt;
        b.vy += (dirY * targetSpeed - b.vy) * 3.5 * dt;
        b.vy += Math.sin(b.phase * 0.4) * 0.6 * dt;
      }

      // Limitar velocidad
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > 3.6) { b.vx = (b.vx / sp) * 3.6; b.vy = (b.vy / sp) * 3.6; }

      b.x += b.vx * dt * 10;
      b.y += b.vy * dt * 10;

      // Si llega al árbol objetivo (< 2.8m), aterrizar y posarse
      if (dist < 3.2 && b.targetTree) {
        b.state = "perching";
        // Tiempo de reposo en el árbol: 3.5 a 6 segundos
        b.perchTimer = 3.5 + Math.random() * 2.8;
      }
    }

    // Mantener dentro del área del humedal
    const b0 = currentBoxRealBounds;
    if (b0 && (b.x < b0.xMin || b.x > b0.xMax || b.y < b0.yMin || b.y > b0.yMax)) {
      b.targetTree = pickNextQuietTree(b);
      if (b.targetTree) { b.x = b.targetTree.x; b.y = b.targetTree.y; b.state = "perching"; b.perchTimer = 3; }
    }
  }"""

if old_bird_agent in js:
    js = js.replace(old_bird_agent, new_bird_agent)

# Update rebuildBirds to populate allAttractorTreesList
old_rebuild_birds = """  function rebuildBirds() {
    if (!currentBoxRealBounds) return;
    if (birdsGroup) { sceneRoot.remove(birdsGroup); birds = []; }
    const attractors = treeMeshes && treeMeshes[0] ? sampleAttractorTrees(treeMeshes[0].data) : [];
    birdTreesGrid = buildBirdTreeGrid(attractors);"""

new_rebuild_birds = """  function rebuildBirds() {
    if (!currentBoxRealBounds) return;
    if (birdsGroup) { sceneRoot.remove(birdsGroup); birds = []; }
    const attractors = treeMeshes && treeMeshes[0] ? sampleAttractorTrees(treeMeshes[0].data) : [];
    allAttractorTreesList = attractors;
    birdTreesGrid = buildBirdTreeGrid(attractors);"""

if old_rebuild_birds in js:
    js = js.replace(old_rebuild_birds, new_rebuild_birds)

# Add localStorage persistence support for bot section view
old_init_bot = """      sectionCamera.position.set(150.0, 8.5, -11.5);
      sectionCamera.up.set(0, 1, 0);
      sectionCamera.lookAt(182.4, 4.2, -35.7);
      sectionCamera.fov = 12; // solo se agranda el contenido (mas zoom), el tamaño del panel no se toca
      sectionCamera.zoom = 0.80;"""

new_init_bot = """      const savedBotView = localStorage.getItem('savedBotSectionView');
      let botCamInit = { x: 150.0, y: 8.5, z: -11.5, targetX: 182.4, targetY: 4.2, targetZ: -35.7, zoom: 0.80, fov: 12 };
      if (savedBotView) {
        try { Object.assign(botCamInit, JSON.parse(savedBotView)); } catch(e) {}
      }
      sectionCamera.position.set(botCamInit.x, botCamInit.y, botCamInit.z);
      sectionCamera.up.set(0, 1, 0);
      sectionCamera.lookAt(botCamInit.targetX, botCamInit.targetY, botCamInit.targetZ);
      sectionCamera.fov = botCamInit.fov || 12;
      sectionCamera.zoom = botCamInit.zoom || 0.80;"""

if old_init_bot in js:
    js = js.replace(old_init_bot, new_init_bot)

with open(r"C:\Users\ACER\.gemini\antigravity\scratch\humedalburro\modulo-10-corte.js", "w", encoding="utf-8") as f:
    f.write(js)

print("modulo-10-corte.js updated successfully!")
