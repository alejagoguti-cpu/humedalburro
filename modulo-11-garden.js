// =====================================================================
// El Jardín de las Aguas — Kennedy en Partículas 3D
// Digital Experience inspired by Penderecki's Garden (pendereckisgarden.pl)
// WebGL GLSL Particle Shaders · 60-120 FPS GPU Engine
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
  const container = document.getElementById("canvasContainer");
  const loadingVeil = document.getElementById("loadingVeil");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030508);
  scene.fog = new THREE.FogExp2(0x030508, 0.0014);

  const sceneRoot = new THREE.Group();
  scene.add(sceneRoot);

  const fov = 42;
  const aspect = window.innerWidth / window.innerHeight;
  const camera = new THREE.PerspectiveCamera(fov, aspect, 1, 9000);
  
  // Posición inicial de cámara con encuadre axonométrico cinematográfico
  const defaultCamPos = new THREE.Vector3(240, 420, 480);
  const defaultTarget = new THREE.Vector3(0, 0, 0);
  camera.position.set(380, 680, 750); // Empieza más arriba para la intro

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = true;
  controls.maxDistance = 3500;
  controls.minDistance = 25;
  controls.maxPolarAngle = Math.PI / 2 + 0.04;
  controls.target.copy(defaultTarget);

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
  const ambientLight = new THREE.AmbientLight(0xdff0ff, 0.7);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0x00f0ff, 1.5);
  keyLight.position.set(400, 700, 500);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x10b981, 1.1);
  rimLight.position.set(-500, 400, -400);
  scene.add(rimLight);

  // Suelo / Disco Holográfico Ecosistémico
  function createEcosystemDisc() {
    const discGeo = new THREE.RingGeometry(30, 850, 72);
    const discMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.028,
      side: THREE.DoubleSide
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = -0.6;
    sceneRoot.add(disc);

    // Rejilla sutil en coordenadas métricas
    const grid = new THREE.GridHelper(1500, 60, 0x00f0ff, 0x0c1926);
    grid.position.y = -0.55;
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    sceneRoot.add(grid);
  }
  createEcosystemDisc();

  // =====================================================================
  // GLSL SHADER DE NUBE DE PARTÍCULAS CINEMATOGRÁFICA (Penderecki Style)
  // =====================================================================
  const vertexShader = `
    uniform float uExplosion;
    uniform float uTime;
    uniform float uPixelRatio;
    uniform vec2 uMousePos;
    
    attribute vec3 aExplodePos;
    attribute vec3 aColor;
    attribute float aSize;
    attribute float aPhase;
    attribute float aCategory; // 0=agua, 1=arbol, 2=edificio, 3=via, 4=espora
    
    varying vec3 vColor;
    varying float vCategory;
    varying float vAlpha;
    
    void main() {
      vColor = aColor;
      vCategory = aCategory;
      
      float t = uExplosion;
      // Interpolación armónica suavizada
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
        // Ondas fluidas del espejo de agua de El Burro
        idleMotion.y = sin(uTime * 2.8 + position.x * 0.18 + position.z * 0.18) * 0.75 * (1.0 - t);
      } else if (aCategory < 1.5) {
        // Oscilación del dosel de árboles con la brisa
        idleMotion.x = sin(uTime * 1.9 + aPhase * 5.0) * 0.5 * (1.0 - t);
        idleMotion.z = cos(uTime * 1.6 + aPhase * 5.0) * 0.5 * (1.0 - t);
      } else if (aCategory > 3.5) {
        // Esporas y polvo atmosférico en suspensión perpetua
        idleMotion.x = sin(uTime * 0.5 + aPhase) * 18.0;
        idleMotion.y = cos(uTime * 0.4 + aPhase * 1.5) * 12.0;
        idleMotion.z = sin(uTime * 0.6 + aPhase * 2.0) * 18.0;
      }
      
      vec3 currentPos = mix(position + idleMotion, aExplodePos + swirl, ease);
      
      vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      // Tamaño de partículas dinámico con atenuación y halo
      float distFactor = clamp(480.0 / -mvPosition.z, 0.5, 4.0);
      gl_PointSize = aSize * uPixelRatio * distFactor;
      
      vAlpha = mix(0.96, 0.68, ease);
    }
  `;

  const fragmentShader = `
    varying vec3 vColor;
    varying float vCategory;
    varying float vAlpha;
    
    void main() {
      vec2 coord = gl_PointCoord - vec2(0.5);
      float r = length(coord);
      if (r > 0.5) discard;
      
      // Perfil gaussiano de fotogrametría: núcleo denso brillante + halo de dispersión
      float core = smoothstep(0.5, 0.02, r);
      float glow = pow(core, 2.2);
      float ring = smoothstep(0.48, 0.32, r) * smoothstep(0.16, 0.34, r);
      
      // Mezcla de color cromático
      vec3 baseCol = vColor;
      vec3 hotCore = mix(baseCol, vec3(1.0, 1.0, 1.0), pow(core, 4.2) * 0.85);
      vec3 finalCol = hotCore + vec3(ring * 0.35);
      
      gl_FragColor = vec4(finalCol, (glow + ring * 0.45) * vAlpha);
    }
  `;

  const particleUniforms = {
    uExplosion: { value: 0.0 },
    uTime: { value: 0.0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    uMousePos: { value: new THREE.Vector2(0, 0) }
  };

  const particleMat = new THREE.ShaderMaterial({
    uniforms: particleUniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  // Buffers dinámicos de partículas
  const pTarget = [];
  const pExplode = [];
  const pColor = [];
  const pSize = [];
  const pPhase = [];
  const pCat = [];

  let particlePoints = null;

  function randomExplode(bx, by, bz, rMin = 180, rMax = 520) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = rMin + Math.pow(Math.random(), 0.55) * (rMax - rMin);
    
    const ex = bx * 0.15 + r * Math.sin(phi) * Math.cos(theta);
    const ey = Math.max(18, by * 0.15 + r * Math.abs(Math.cos(phi)) * 0.95 + Math.random() * 150);
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
        const colTeal = new THREE.Color(0x06b6d4);
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

            // Malla densa de partículas de agua en superficie
            const subSamples = 3;
            for (let s = 0; s < subSamples; s++) {
              const r1 = Math.random(), r2 = Math.random();
              const sq1 = Math.sqrt(r1);
              const wx = (1 - sq1) * pa.x + sq1 * (1 - r2) * pb.x + sq1 * r2 * pc.x;
              const wz = (1 - sq1) * pa.z + sq1 * (1 - r2) * pb.z + sq1 * r2 * pc.z;
              const wy = 0.25 + Math.random() * 0.35;

              const ex = randomExplode(wx, wy, wz, 140, 380);
              pTarget.push(wx, wy, wz);
              pExplode.push(ex.x, ex.y, ex.z);
              
              const c = (s % 2 === 0) ? colCyan : colTeal;
              pColor.push(c.r, c.g, c.b);
              pSize.push(4.2);
              pPhase.push(Math.random() * 10);
              pCat.push(0.0); // 0 = agua
            }
          });

          // Anillo perimetral de esmeralda bio-líquida
          for (let i = 0; i < sPts.length; i++) {
            const p = sPts[i];
            const ex = randomExplode(p.x, 0.35, p.z, 150, 400);
            pTarget.push(p.x, 0.35, p.z);
            pExplode.push(ex.x, ex.y, ex.z);
            pColor.push(colEmerald.r, colEmerald.g, colEmerald.b);
            pSize.push(4.8);
            pPhase.push(i * 0.35);
            pCat.push(0.0);
          }
        });

        rebuildParticles();
      })
      .catch(err => console.warn("Error agua:", err));
  }

  // =====================================================================
  // 2. CARGA DE ÁRBOLES (Jardín Botánico — Saucos, Capulíes, Urapanes)
  // =====================================================================
  function loadTrees() {
    return fetch(TREES_URL)
      .then(r => r.json())
      .then(trees => {
        const colTrunk = new THREE.Color(0xb45309);
        const colSauco = new THREE.Color(0xa855f7);   // Violeta orquídea
        const colCapuli = new THREE.Color(0xf43f5e);  // Flor de Capulí magenta
        const colUrapan = new THREE.Color(0x10b981);  // Esmeralda urapán
        const colLime = new THREE.Color(0x84cc16);    // Verde lima vibrante

        trees.forEach((t, i) => {
          const [x, y, hMeters, especieStr] = t;
          const p = toScene(x, y);
          const h = Math.max(0.7, (hMeters || 8) * SCALE);

          let folCol = colUrapan;
          if (especieStr && especieStr.includes("Sauco")) folCol = colSauco;
          else if (especieStr && especieStr.includes("capuli")) folCol = colCapuli;
          else if (i % 3 === 0) folCol = colLime;

          // Copa central
          const crownY = h * 0.85;
          const exCrown = randomExplode(p.x, crownY, p.z, 160, 440);
          pTarget.push(p.x, crownY, p.z);
          pExplode.push(exCrown.x, exCrown.y, exCrown.z);
          pColor.push(folCol.r, folCol.g, folCol.b);
          pSize.push(5.4);
          pPhase.push(i * 0.25);
          pCat.push(1.0); // 1 = arbol

          // Nodos satélite de follaje
          const subNodes = 4;
          const rad = h * 0.5;
          for (let k = 0; k < subNodes; k++) {
            const ang = (k / subNodes) * Math.PI * 2 + (i % 7);
            const sx = p.x + Math.cos(ang) * rad;
            const sz = p.z + Math.sin(ang) * rad;
            const sy = crownY + (k % 2 === 0 ? 0.35 : -0.25);

            const exSub = randomExplode(sx, sy, sz, 180, 460);
            pTarget.push(sx, sy, sz);
            pExplode.push(exSub.x, exSub.y, exSub.z);
            pColor.push(folCol.r * 1.15, folCol.g * 1.15, folCol.b * 1.15);
            pSize.push(3.8);
            pPhase.push(i + k * 1.6);
            pCat.push(1.0);
          }

          // Base de tronco
          const exBase = randomExplode(p.x, 0.1, p.z, 120, 320);
          pTarget.push(p.x, 0.1, p.z);
          pExplode.push(exBase.x, exBase.y, exBase.z);
          pColor.push(colTrunk.r, colTrunk.g, colTrunk.b);
          pSize.push(2.6);
          pPhase.push(i * 0.1);
          pCat.push(1.0);
        });

        rebuildParticles();
      })
      .catch(err => console.warn("Error árboles:", err));
  }

  // =====================================================================
  // 3. CARGA DE RED VIAL (Líneas de Energía Urbana)
  // =====================================================================
  function loadRoads() {
    return fetch(NET_URL)
      .then(r => r.json())
      .then(edges => {
        const colRoad = new THREE.Color(0xf59e0b);   // Ámbar dorado
        const colCali = new THREE.Color(0x38bdf8);   // Azul eléctrico Av Cali

        edges.forEach(([kind, pts], edgeIdx) => {
          const isMajor = (edgeIdx % 4 === 0);
          const c = isMajor ? colCali : colRoad;

          for (let i = 0; i < pts.length - 1; i++) {
            const a = toScene(pts[i][0], pts[i][1]);
            const ex = randomExplode(a.x, 0.08, a.z, 130, 360);
            pTarget.push(a.x, 0.08, a.z);
            pExplode.push(ex.x, ex.y, ex.z);
            pColor.push(c.r, c.g, c.b);
            pSize.push(isMajor ? 3.4 : 2.6);
            pPhase.push(edgeIdx * 0.4);
            pCat.push(3.0); // 3 = via
          }
        });

        rebuildParticles();
      })
      .catch(err => console.warn("Error vías:", err));
  }

  // =====================================================================
  // 4. CARGA DE EDIFICIOS 3D (Volumetría Arquitectónica en Nube de Puntos)
  // =====================================================================
  function loadBuildings() {
    return fetch(BUILDINGS_URL)
      .then(r => r.json())
      .then(buildings => {
        const colGlass = new THREE.Color(0x38bdf8);    // Cristal zafiro
        const colRoof = new THREE.Color(0xf59e0b);     // Techo dorado cálido
        const colFacade = new THREE.Color(0xe2e8f0);   // Fachada nítida

        buildings.forEach((b, idx) => {
          const pts = b.pts.map(p => toScene(p[0], p[1]));
          const h = Math.max(1.4, (b.h || 6) * SCALE);
          if (pts.length < 4) return;

          // Esquinas y contorno del edificio en toda su altura 3D
          for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i];
            
            // Vértice superior (Techo)
            const exTop = randomExplode(a.x, h, a.z, 180, 480);
            pTarget.push(a.x, h, a.z);
            pExplode.push(exTop.x, exTop.y, exTop.z);
            pColor.push(colRoof.r, colRoof.g, colRoof.b);
            pSize.push(3.6);
            pPhase.push(idx * 0.2);
            pCat.push(2.0); // 2 = edificio

            // Vértice intermedio en edificios altos
            if (h > 2.2) {
              const midH = h * 0.5;
              const exMid = randomExplode(a.x, midH, a.z, 160, 420);
              pTarget.push(a.x, midH, a.z);
              pExplode.push(exMid.x, exMid.y, exMid.z);
              pColor.push(colGlass.r, colGlass.g, colGlass.b);
              pSize.push(2.8);
              pPhase.push(idx * 0.3);
              pCat.push(2.0);
            }

            // Vértice base
            const exBase = randomExplode(a.x, 0.05, a.z, 120, 320);
            pTarget.push(a.x, 0.05, a.z);
            pExplode.push(exBase.x, exBase.y, exBase.z);
            pColor.push(colFacade.r, colFacade.g, colFacade.b);
            pSize.push(2.2);
            pPhase.push(idx * 0.1);
            pCat.push(2.0);
          }
        });

        // Añadir 2,500 esporas atmosféricas flotantes (Polvo de jardín)
        const colSpore = new THREE.Color(0x00f0ff);
        for (let s = 0; s < 2500; s++) {
          const sx = (Math.random() - 0.5) * 850;
          const sy = 10 + Math.random() * 220;
          const sz = (Math.random() - 0.5) * 850;
          const ex = randomExplode(sx, sy, sz, 200, 600);

          pTarget.push(sx, sy, sz);
          pExplode.push(ex.x, ex.y, ex.z);
          pColor.push(colSpore.r, colSpore.g, colSpore.b);
          pSize.push(1.8 + Math.random() * 2.2);
          pPhase.push(Math.random() * 20);
          pCat.push(4.0); // 4 = espora
        }

        rebuildParticles();
      })
      .catch(err => console.warn("Error edificios:", err));
  }

  // =====================================================================
  // INICIALIZACIÓN PROGRESIVA & CINEMÁTICA INTRO
  // =====================================================================
  Promise.all([loadWater(), loadTrees(), loadRoads()]).then(() => {
    loadBuildings();

    // Intro cinematográfica con GSAP: La cámara desciende suavemente a la axo
    setTimeout(() => {
      if (loadingVeil) loadingVeil.classList.add("hide");

      if (window.gsap) {
        gsap.to(camera.position, {
          x: defaultCamPos.x,
          y: defaultCamPos.y,
          z: defaultCamPos.z,
          duration: 3.2,
          ease: "power3.out"
        });
      }
    }, 350);
  });

  // =====================================================================
  // EXPERIENCIA INTERACTIVA & CONTROL DE DISPERSIÓN
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
          duration: 2.2,
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

  if (labelAssemble) {
    labelAssemble.addEventListener("click", () => setExplosionValue(0.0));
  }
  if (labelNebula) {
    labelNebula.addEventListener("click", () => setExplosionValue(1.0));
  }

  // =====================================================================
  // PARALAJE DE RATÓN (Sutil movimiento de cámara 3D inmersivo)
  // =====================================================================
  let mouseX = 0, mouseY = 0;
  window.addEventListener("mousemove", (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    particleUniforms.uMousePos.value.set(mouseX, mouseY);
  });

  // =====================================================================
  // PAISAJE SONORO DE PENDERECKI (Web Audio API)
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

      // Drone fundamental bio-acústico
      const osc1 = audioCtx.createOscillator();
      const filter1 = audioCtx.createBiquadFilter();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(68.05, audioCtx.currentTime); // C2

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
    const freq = notes[Math.floor(Math.random() * notes.length)] * (1 + intensity * 0.4);

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.22 * Math.max(0.3, intensity), audioCtx.currentTime + 0.09);
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
  // LOOP DE RENDERIZADO GPU (60-120 FPS FLUIDO)
  // =====================================================================
  const clock = new THREE.Clock();

  function render() {
    requestAnimationFrame(render);

    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    // Transición suave lerp hacia la dispersión objetivo
    currentExplosion += (targetExplosion - currentExplosion) * (delta * 4.2);
    particleMat.uniforms.uExplosion.value = currentExplosion;
    particleMat.uniforms.uTime.value = elapsed;

    // Sutil deriva de paralaje con el ratón
    sceneRoot.rotation.y = mouseX * 0.04;
    sceneRoot.rotation.x = mouseY * 0.02;

    controls.update();
    renderer.render(scene, camera);
  }

  render();
})();
