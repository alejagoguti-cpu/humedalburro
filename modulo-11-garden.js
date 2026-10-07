// =====================================================================
// El Jardín de las Aguas — Kennedy en Micro-Partículas 3D
// Digital Experience inspired by Penderecki's Garden (pendereckisgarden.pl)
// WebGL GLSL Micro-Point Cloud · 60-120 FPS GPU Engine · Cinematic Flight
// =====================================================================

(() => {
  const NET_URL = "./assets/kennedy_net.json";
  const BUILDINGS_URL = "./assets/kennedy_buildings.json";
  const TREES_URL = "./assets/kennedy_trees_real.json";
  const WATER_URL = "./assets/kennedy_water_bodies.json";
  const SCALE = 1 / 10;

  // Centro de proyección del modelo de Kennedy
  const netCenter = { x: 5341.33, y: 3161.9 };
  function toScene(x, y) {
    return { x: (x - netCenter.x) * SCALE, z: -(y - netCenter.y) * SCALE };
  }

  // ---- Setup de Escena, Cámara y Renderizador WebGL ----
  const canvas = document.getElementById("sceneCanvas");
  const loadingVeil = document.getElementById("loadingVeil");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020407);
  scene.fog = new THREE.FogExp2(0x020407, 0.0012);

  const sceneRoot = new THREE.Group();
  scene.add(sceneRoot);

  const fov = 40;
  const aspect = window.innerWidth / window.innerHeight;
  const camera = new THREE.PerspectiveCamera(fov, aspect, 1, 9000);
  
  // Posiciones de Waypoints Cinematográficos
  const waypoints = {
    overview: { pos: new THREE.Vector3(230, 410, 460), target: new THREE.Vector3(0, 0, 0) },
    burro:    { pos: new THREE.Vector3(180, 110, 110), target: new THREE.Vector3(210, 0, -10) },
    canopy:   { pos: new THREE.Vector3(90, 65, 80),    target: new THREE.Vector3(80, 5, 40) },
    cali:     { pos: new THREE.Vector3(310, 120, -50), target: new THREE.Vector3(200, 0, -20) }
  };

  // Posición de inicio en el cielo para la intro cinematográfica
  camera.position.set(380, 680, 720);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = true;
  controls.maxDistance = 3500;
  controls.minDistance = 15;
  controls.maxPolarAngle = Math.PI / 2 + 0.04;
  controls.target.copy(waypoints.overview.target);

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
  const ambientLight = new THREE.AmbientLight(0xdff0ff, 0.75);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0x00f0ff, 1.6);
  keyLight.position.set(400, 700, 500);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x10b981, 1.2);
  rimLight.position.set(-500, 400, -400);
  scene.add(rimLight);

  // Base Grid y Disco de Horizonte
  function createEcosystemBase() {
    const discGeo = new THREE.RingGeometry(30, 900, 80);
    const discMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.025,
      side: THREE.DoubleSide
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = -0.6;
    sceneRoot.add(disc);

    const grid = new THREE.GridHelper(1600, 64, 0x00f0ff, 0x0b1724);
    grid.position.y = -0.55;
    grid.material.opacity = 0.18;
    grid.material.transparent = true;
    sceneRoot.add(grid);
  }
  createEcosystemBase();

  // =====================================================================
  // GLSL SHADER DE MICRO-PARTÍCULAS CON ONDAS Y DISPERSIÓN CUÁNTICA
  // =====================================================================
  const vertexShader = `
    uniform float uExplosion;
    uniform float uTime;
    uniform float uPixelRatio;
    uniform vec3 uRipplePos;
    uniform float uRippleTime;
    
    attribute vec3 aExplodePos;
    attribute vec3 aColor;
    attribute float aSize;
    attribute float aPhase;
    attribute float aCategory; // 0=agua, 1=arbol, 2=edificio, 3=via, 4=espora
    
    varying vec3 vColor;
    varying float vCategory;
    varying float vAlpha;
    varying float vRippleBoost;
    
    void main() {
      vColor = aColor;
      vCategory = aCategory;
      
      float t = uExplosion;
      float ease = smoothstep(0.0, 1.0, t);
      
      // Vórtice orbital espiral gravitacional
      vec3 swirl = vec3(
        sin(uTime * 0.75 + aPhase * 3.14) * 16.0 * t + cos(uTime * 0.5 + position.z * 0.03) * 12.0 * t,
        cos(uTime * 0.65 + aPhase * 2.0) * 22.0 * t + sin(uTime * 0.8 + position.x * 0.04) * 14.0 * t,
        sin(uTime * 0.85 + aPhase * 4.2) * 16.0 * t + cos(uTime * 0.4 + position.y * 0.05) * 12.0 * t
      );
      
      // Movimiento orgánico en estado ensamblado
      vec3 idleMotion = vec3(0.0);
      if (aCategory < 0.5) {
        // Ondas fluidas en el agua del humedal
        idleMotion.y = sin(uTime * 3.0 + position.x * 0.2 + position.z * 0.2) * 0.65 * (1.0 - t);
      } else if (aCategory < 1.5) {
        // Oscilación del follaje con el viento
        idleMotion.x = sin(uTime * 2.1 + aPhase * 5.0) * 0.45 * (1.0 - t);
        idleMotion.z = cos(uTime * 1.8 + aPhase * 5.0) * 0.45 * (1.0 - t);
      } else if (aCategory > 3.5) {
        // Esporas y polvo atmosférico en suspensión perpetua
        idleMotion.x = sin(uTime * 0.5 + aPhase) * 16.0;
        idleMotion.y = cos(uTime * 0.4 + aPhase * 1.5) * 12.0;
        idleMotion.z = sin(uTime * 0.6 + aPhase * 2.0) * 16.0;
      }
      
      // Onda interactiva expansiva (Ripple al hacer clic o arrastrar)
      float distToRipple = length(position.xz - uRipplePos.xz);
      float rippleRadius = uRippleTime * 120.0;
      float rippleDist = abs(distToRipple - rippleRadius);
      float rippleWave = smoothstep(24.0, 0.0, rippleDist) * max(0.0, 1.0 - uRippleTime * 0.7);
      idleMotion.y += sin(rippleDist * 0.3 - uTime * 4.0) * rippleWave * 3.5;
      vRippleBoost = rippleWave;
      
      vec3 currentPos = mix(position + idleMotion, aExplodePos + swirl, ease);
      
      vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      // Micro-partículas nítidas y pequeñas (PCD density)
      float distFactor = clamp(420.0 / -mvPosition.z, 0.4, 2.6);
      gl_PointSize = (aSize + rippleWave * 1.5) * uPixelRatio * distFactor;
      
      vAlpha = mix(0.96, 0.70, ease);
    }
  `;

  const fragmentShader = `
    varying vec3 vColor;
    varying float vCategory;
    varying float vAlpha;
    varying float vRippleBoost;
    
    void main() {
      vec2 coord = gl_PointCoord - vec2(0.5);
      float r = length(coord);
      if (r > 0.5) discard;
      
      // Perfil gaussiano de fotogrametría nítido
      float core = smoothstep(0.5, 0.04, r);
      float glow = pow(core, 2.0);
      float ring = smoothstep(0.48, 0.34, r) * smoothstep(0.18, 0.36, r);
      
      vec3 baseCol = vColor;
      if (vRippleBoost > 0.05) {
        baseCol = mix(baseCol, vec3(0.0, 1.0, 1.0), vRippleBoost * 0.8);
      }
      
      vec3 hotCore = mix(baseCol, vec3(1.0, 1.0, 1.0), pow(core, 4.0) * 0.8);
      vec3 finalCol = hotCore + vec3(ring * 0.35);
      
      gl_FragColor = vec4(finalCol, (glow + ring * 0.4) * vAlpha);
    }
  `;

  const particleUniforms = {
    uExplosion: { value: 0.0 },
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
    blending: THREE.AdditiveBlending
  });

  // Buffers de partículas
  const pTarget = [];
  const pExplode = [];
  const pColor = [];
  const pSize = [];
  const pPhase = [];
  const pCat = [];

  let particlePoints = null;

  function randomExplode(bx, by, bz, rMin = 160, rMax = 500) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = rMin + Math.pow(Math.random(), 0.55) * (rMax - rMin);
    
    const ex = bx * 0.15 + r * Math.sin(phi) * Math.cos(theta);
    const ey = Math.max(16, by * 0.15 + r * Math.abs(Math.cos(phi)) * 0.95 + Math.random() * 140);
    const ez = bz * 0.15 + r * Math.sin(phi) * Math.sin(theta);
    return { x: ex, y: ey, z: ez };
  }

  function rebuildParticles() {
    if (particlePoints) {
      sceneRoot.remove(particlePoints);
      if (particlePoints.geometry) particlePoints.geometry.dispose();
    }

    const total = pTarget.length / 3;
    if (total === 0) return;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pTarget, 3));
    geo.setAttribute("aExplodePos", new THREE.Float32BufferAttribute(pExplode, 3));
    geo.setAttribute("aColor", new THREE.Float32BufferAttribute(pColor, 3));
    geo.setAttribute("aSize", new THREE.Float32BufferAttribute(pSize, 1));
    geo.setAttribute("aPhase", new THREE.Float32BufferAttribute(pPhase, 1));
    geo.setAttribute("aCategory", new THREE.Float32BufferAttribute(pCat, 1));

    particlePoints = new THREE.Points(geo, particleMat);
    sceneRoot.add(particlePoints);
  }

  // =====================================================================
  // 1. CARGA DE AGUA (Humedal El Burro — Turquesa Bioluminiscente)
  // =====================================================================
  function loadWater() {
    return fetch(WATER_URL)
      .then(r => r.json())
      .then(waterBodies => {
        const colCyan = new THREE.Color(0x00f0ff);
        const colTeal = new THREE.Color(0x0284c7);
        const colEmerald = new THREE.Color(0x10b981);

        waterBodies.forEach(w => {
          const pts = w.pts;
          if (!pts || pts.length < 3) return;

          const sPts = pts.map(p => toScene(p[0], p[1]));
          const pts2d = sPts.map(p => new THREE.Vector2(p.x, p.z));

          let tris = [];
          try { tris = THREE.ShapeUtils.triangulateShape(pts2d, []); } catch(e) { tris = []; }

          tris.forEach(([ia, ib, ic]) => {
            const pa = sPts[ia], pb = sPts[ib], pc = sPts[ic];

            // Malla de micro-partículas en superficie
            const subSamples = 3;
            for (let s = 0; s < subSamples; s++) {
              const r1 = Math.random(), r2 = Math.random();
              const sq1 = Math.sqrt(r1);
              const wx = (1 - sq1) * pa.x + sq1 * (1 - r2) * pb.x + sq1 * r2 * pc.x;
              const wz = (1 - sq1) * pa.z + sq1 * (1 - r2) * pb.z + sq1 * r2 * pc.z;
              const wy = 0.25 + Math.random() * 0.35;

              const ex = randomExplode(wx, wy, wz, 130, 360);
              pTarget.push(wx, wy, wz);
              pExplode.push(ex.x, ex.y, ex.z);
              
              const c = (s % 2 === 0) ? colCyan : colTeal;
              pColor.push(c.r, c.g, c.b);
              pSize.push(2.2); // Tamaño micro
              pPhase.push(Math.random() * 10);
              pCat.push(0.0);
            }
          });

          // Borde perimetral
          for (let i = 0; i < sPts.length; i++) {
            const p = sPts[i];
            const ex = randomExplode(p.x, 0.35, p.z, 140, 380);
            pTarget.push(p.x, 0.35, p.z);
            pExplode.push(ex.x, ex.y, ex.z);
            pColor.push(colEmerald.r, colEmerald.g, colEmerald.b);
            pSize.push(2.6);
            pPhase.push(i * 0.3);
            pCat.push(0.0);
          }
        });

        rebuildParticles();
      })
      .catch(err => console.warn("Error agua:", err));
  }

  // =====================================================================
  // 2. CARGA DE ÁRBOLES (Jardín Botánico)
  // =====================================================================
  function loadTrees() {
    return fetch(TREES_URL)
      .then(r => r.json())
      .then(trees => {
        const colTrunk = new THREE.Color(0xb45309);
        const colSauco = new THREE.Color(0xa855f7);
        const colCapuli = new THREE.Color(0xf43f5e);
        const colUrapan = new THREE.Color(0x10b981);
        const colLime = new THREE.Color(0x84cc16);

        trees.forEach((t, i) => {
          const [x, y, hMeters, especieStr] = t;
          const p = toScene(x, y);
          const h = Math.max(0.7, (hMeters || 8) * SCALE);

          let folCol = colUrapan;
          if (especieStr && especieStr.includes("Sauco")) folCol = colSauco;
          else if (especieStr && especieStr.includes("capuli")) folCol = colCapuli;
          else if (i % 3 === 0) folCol = colLime;

          const crownY = h * 0.85;
          const exCrown = randomExplode(p.x, crownY, p.z, 150, 420);
          pTarget.push(p.x, crownY, p.z);
          pExplode.push(exCrown.x, exCrown.y, exCrown.z);
          pColor.push(folCol.r, folCol.g, folCol.b);
          pSize.push(2.8);
          pPhase.push(i * 0.25);
          pCat.push(1.0);

          // Micro-nodos de follaje
          const subNodes = 4;
          const rad = h * 0.45;
          for (let k = 0; k < subNodes; k++) {
            const ang = (k / subNodes) * Math.PI * 2 + (i % 7);
            const sx = p.x + Math.cos(ang) * rad;
            const sz = p.z + Math.sin(ang) * rad;
            const sy = crownY + (k % 2 === 0 ? 0.3 : -0.2);

            const exSub = randomExplode(sx, sy, sz, 160, 440);
            pTarget.push(sx, sy, sz);
            pExplode.push(exSub.x, exSub.y, exSub.z);
            pColor.push(folCol.r * 1.15, folCol.g * 1.15, folCol.b * 1.15);
            pSize.push(2.0);
            pPhase.push(i + k * 1.5);
            pCat.push(1.0);
          }

          const exBase = randomExplode(p.x, 0.1, p.z, 110, 300);
          pTarget.push(p.x, 0.1, p.z);
          pExplode.push(exBase.x, exBase.y, exBase.z);
          pColor.push(colTrunk.r, colTrunk.g, colTrunk.b);
          pSize.push(1.6);
          pPhase.push(i * 0.1);
          pCat.push(1.0);
        });

        rebuildParticles();
      })
      .catch(err => console.warn("Error árboles:", err));
  }

  // =====================================================================
  // 3. CARGA DE RED VIAL
  // =====================================================================
  function loadRoads() {
    return fetch(NET_URL)
      .then(r => r.json())
      .then(edges => {
        const colRoad = new THREE.Color(0xf59e0b);
        const colCali = new THREE.Color(0x38bdf8);

        edges.forEach(([kind, pts], edgeIdx) => {
          const isMajor = (edgeIdx % 4 === 0);
          const c = isMajor ? colCali : colRoad;

          for (let i = 0; i < pts.length - 1; i++) {
            const a = toScene(pts[i][0], pts[i][1]);
            const ex = randomExplode(a.x, 0.08, a.z, 120, 340);
            pTarget.push(a.x, 0.08, a.z);
            pExplode.push(ex.x, ex.y, ex.z);
            pColor.push(c.r, c.g, c.b);
            pSize.push(isMajor ? 1.8 : 1.4);
            pPhase.push(edgeIdx * 0.35);
            pCat.push(3.0);
          }
        });

        rebuildParticles();
      })
      .catch(err => console.warn("Error vías:", err));
  }

  // =====================================================================
  // 4. CARGA DE EDIFICIOS 3D (Volumetría en Micro-Puntos)
  // =====================================================================
  function loadBuildings() {
    return fetch(BUILDINGS_URL)
      .then(r => r.json())
      .then(buildings => {
        const colGlass = new THREE.Color(0x38bdf8);
        const colRoof = new THREE.Color(0xf59e0b);
        const colFacade = new THREE.Color(0xdbeafe);

        buildings.forEach((b, idx) => {
          const pts = b.pts.map(p => toScene(p[0], p[1]));
          const h = Math.max(1.4, (b.h || 6) * SCALE);
          if (pts.length < 4) return;

          for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i];
            
            // Techo
            const exTop = randomExplode(a.x, h, a.z, 170, 460);
            pTarget.push(a.x, h, a.z);
            pExplode.push(exTop.x, exTop.y, exTop.z);
            pColor.push(colRoof.r, colRoof.g, colRoof.b);
            pSize.push(2.2);
            pPhase.push(idx * 0.2);
            pCat.push(2.0);

            // Altura media
            if (h > 2.2) {
              const midH = h * 0.5;
              const exMid = randomExplode(a.x, midH, a.z, 150, 400);
              pTarget.push(a.x, midH, a.z);
              pExplode.push(exMid.x, exMid.y, exMid.z);
              pColor.push(colGlass.r, colGlass.g, colGlass.b);
              pSize.push(1.8);
              pPhase.push(idx * 0.3);
              pCat.push(2.0);
            }

            // Base
            const exBase = randomExplode(a.x, 0.05, a.z, 110, 300);
            pTarget.push(a.x, 0.05, a.z);
            pExplode.push(exBase.x, exBase.y, exBase.z);
            pColor.push(colFacade.r, colFacade.g, colFacade.b);
            pSize.push(1.5);
            pPhase.push(idx * 0.1);
            pCat.push(2.0);
          }
        });

        // 3,000 micro-esporas flotantes (efecto de polvo cósmico cinematográfico)
        const colSpore = new THREE.Color(0x00f0ff);
        for (let s = 0; s < 3000; s++) {
          const sx = (Math.random() - 0.5) * 850;
          const sy = 8 + Math.random() * 220;
          const sz = (Math.random() - 0.5) * 850;
          const ex = randomExplode(sx, sy, sz, 180, 560);

          pTarget.push(sx, sy, sz);
          pExplode.push(ex.x, ex.y, ex.z);
          pColor.push(colSpore.r, colSpore.g, colSpore.b);
          pSize.push(1.2 + Math.random() * 1.4);
          pPhase.push(Math.random() * 20);
          pCat.push(4.0);
        }

        rebuildParticles();
      })
      .catch(err => console.warn("Error edificios:", err));
  }

  // =====================================================================
  // INICIALIZACIÓN PROGRESIVA & INTRO DE CÁMARA
  // =====================================================================
  Promise.all([loadWater(), loadTrees(), loadRoads()]).then(() => {
    loadBuildings();

    setTimeout(() => {
      if (loadingVeil) loadingVeil.classList.add("hide");

      // Transición de cámara cinematográfica de apertura
      if (window.gsap) {
        gsap.to(camera.position, {
          x: waypoints.overview.pos.x,
          y: waypoints.overview.pos.y,
          z: waypoints.overview.pos.z,
          duration: 3.4,
          ease: "power3.out"
        });
      }
    }, 300);
  });

  // =====================================================================
  // VUELO CINEMATOGRÁFICO CONTINUO (Modo Video / Película)
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
    });
  }

  // Waypoints interactivos (Zoom in / Zoom out)
  function flyToWaypoint(wpKey) {
    const wp = waypoints[wpKey];
    if (!wp || !window.gsap) return;

    // Desactivar vuelo automático si el usuario elige un destino específico
    if (isCinemaTour) {
      isCinemaTour = false;
      btnCinemaTour.classList.remove("active");
      if (cinemaText) cinemaText.textContent = "Modo Video";
      btnCinemaTour.querySelector("i").className = "fa-solid fa-play";
    }

    gsap.to(camera.position, {
      x: wp.pos.x,
      y: wp.pos.y,
      z: wp.pos.z,
      duration: 2.6,
      ease: "power2.inOut"
    });

    gsap.to(controls.target, {
      x: wp.target.x,
      y: wp.target.y,
      z: wp.target.z,
      duration: 2.6,
      ease: "power2.inOut"
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

  // =====================================================================
  // INTERACCIÓN: ONDA EXPANSIVA AL HACER CLIC (Quantum Ripple)
  // =====================================================================
  const raycaster = new THREE.Raycaster();
  const mouseVec = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  window.addEventListener("pointerdown", (e) => {
    // Si hace clic en la barra UI, no disparar onda en el mapa
    if (e.target.closest(".top-bar") || e.target.closest(".bottom-experience-bar") || e.target.closest(".waypoints-bar")) return;

    mouseVec.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseVec.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouseVec, camera);
    const hitPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
      particleUniforms.uRipplePos.value.copy(hitPoint);
      particleUniforms.uRippleTime.value = 0.0;
      if (soundActive && typeof triggerHarmonicChime === "function") {
        triggerHarmonicChime(0.85);
      }
    }
  });

  // =====================================================================
  // CONTROL DE EXPLOSIÓN Y NEBULOSA
  // =====================================================================
  let targetExplosion = 0.0;
  let currentExplosion = 0.0;
  let isExploded = false;

  const slider = document.getElementById("experienceSlider");
  const btnToggle = document.getElementById("btnPlayTransition");
  const btnActionText = document.getElementById("btnActionText");
  const labelAssemble = document.getElementById("labelAssemble");
  const labelNebula = document.getElementById("labelNebula");

  function setExplosionValue(val, updateInput = true) {
    targetExplosion = Math.max(0, Math.min(1, val));
    if (updateInput && slider) {
      slider.value = Math.round(targetExplosion * 100);
    }
    isExploded = targetExplosion > 0.45;
    if (btnActionText) {
      btnActionText.textContent = isExploded ? "ENSAMBLAR" : "DESINTEGRAR";
    }
    if (labelAssemble) labelAssemble.classList.toggle("active", targetExplosion < 0.2);
    if (labelNebula) labelNebula.classList.toggle("active", targetExplosion > 0.8);

    if (soundActive && typeof triggerHarmonicChime === "function") {
      triggerHarmonicChime(targetExplosion);
    }
  }

  if (slider) {
    slider.addEventListener("input", (e) => {
      setExplosionValue(parseFloat(e.target.value) / 100, false);
    });
  }

  if (btnToggle) {
    btnToggle.addEventListener("click", () => {
      if (window.gsap) {
        const dest = isExploded ? 0.0 : 1.0;
        gsap.to({ val: currentExplosion }, {
          val: dest,
          duration: 2.4,
          ease: "power2.inOut",
          onUpdate: function() {
            setExplosionValue(this.targets()[0].val, true);
          }
        });
      } else {
        setExplosionValue(isExploded ? 0.0 : 1.0);
      }
    });
  }

  if (labelAssemble) labelAssemble.addEventListener("click", () => setExplosionValue(0.0));
  if (labelNebula) labelNebula.addEventListener("click", () => setExplosionValue(1.0));

  // Paralaje de ratón inmersivo
  let mouseX = 0, mouseY = 0;
  window.addEventListener("mousemove", (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  // =====================================================================
  // PAISAJE SONORO GENERATIVO (Penderecki Inspired)
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
    gain.gain.exponentialRampToValueAtTime(0.22 * Math.max(0.3, intensity), audioCtx.currentTime + 0.08);
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
  // LOOP DE RENDERIZADO GPU (60-120 FPS FLUIDO & MODO VIDEO)
  // =====================================================================
  const clock = new THREE.Clock();

  function render() {
    requestAnimationFrame(render);

    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    // Actualización de onda expansiva interactiva
    particleUniforms.uRippleTime.value += delta;

    // Dispersión suave lerp
    currentExplosion += (targetExplosion - currentExplosion) * (delta * 4.2);
    particleMat.uniforms.uExplosion.value = currentExplosion;
    particleMat.uniforms.uTime.value = elapsed;

    // Cinemática de Vuelo Continuo ("Modo Video")
    if (isCinemaTour) {
      cinemaAngle += delta * 0.22;
      const radius = 340 + Math.sin(cinemaAngle * 0.7) * 90; // Se acerca y se aleja dinámicamente
      const camY = 180 + Math.sin(cinemaAngle * 0.5) * 110;   // Sube y baja como dron

      camera.position.x = Math.cos(cinemaAngle) * radius + 80;
      camera.position.z = Math.sin(cinemaAngle) * radius + 40;
      camera.position.y = camY;

      // El objetivo de cámara se desplaza suavemente por los humedales
      controls.target.x = Math.sin(cinemaAngle * 0.4) * 50 + 60;
      controls.target.z = Math.cos(cinemaAngle * 0.4) * 40;
      controls.target.y = 10;
    } else {
      // Paralaje sutil con el cursor
      sceneRoot.rotation.y = mouseX * 0.035;
      sceneRoot.rotation.x = mouseY * 0.018;
    }

    controls.update();
    renderer.render(scene, camera);
  }

  render();
})();
