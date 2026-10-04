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
  scene.background = new THREE.Color(0xffffff);
  // antes la niebla llegaba a 3200, pero la camara (OrthographicCamera,
  // far=2000) deja de dibujar todo despues de 2000 -- los objetos se
  // cortaban de golpe ANTES de que la niebla alcanzara a desvanecerlos
  // del todo a blanco, por eso se veia "cortado" en vez de difuminado.
  // Ahora la niebla termina de cerrar a blanco bien antes del limite real
  // de la camara (1900 de 2000), asegurando un desvanecido completo.
  scene.fog = new THREE.Fog(0xffffff, 700, 1900);
  // Todo el contenido del mapa (vias, edificios, arboles, agua, vehiculos)
  // se agrega a este grupo, no directamente a la escena, para poder
  // rotarlo entero en X/Y/Z con los controles manuales de orientacion.
  // El usuario encontro que la orientacion correcta del plano necesita un
  // giro de 180° — se aplica aqui en el eje Y (vertical), no en Z, porque
  // un giro en Z tambien voltea la altura de los edificios boca abajo (Z
  // no es el eje "arriba" de esta escena); un giro en Y reordena el plano
  // igual mientras deja la altura intacta.
  const sceneRoot = new THREE.Group();
  // No se rota el grupo entero — el reacomodo del plano se hace de forma
  // pura dentro de toScene() (ver abajo), sin tocar la altura de nada.
  scene.add(sceneRoot);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 5, 2000);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: true }); // alpha:true agregado para poder capturar fondos transparentes en las subcapas de escala tecnologica (sin afectar la vista principal, que sigue fijando su propio color de fondo opaco)
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;
  renderer.localClippingEnabled = true; // para la caja de seccion (corte del modelo)

  // Los planos de recorte de la caja de seccion se crean y se ACTIVAN
  // (aunque sea con un valor lejano que no corta nada todavia) desde ya,
  // ANTES de construir cualquier edificio/via/etc. En esta version de
  // Three.js, si los materiales compilan su shader con 0 planos de
  // recorte y luego se les agregan planos, el recorte no se aplica hasta
  // recompilar el material — por eso el corte no se veia antes.
  const secPlanes = {
    xMin: new THREE.Plane(new THREE.Vector3(1, 0, 0), 1e6),
    xMax: new THREE.Plane(new THREE.Vector3(-1, 0, 0), 1e6),
    yMin: new THREE.Plane(new THREE.Vector3(0, 1, 0), 1e6),
    yMax: new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e6),
    zMin: new THREE.Plane(new THREE.Vector3(0, 0, 1), 1e6),
    zMax: new THREE.Plane(new THREE.Vector3(0, 0, -1), 1e6),
  };
  const sectionClipPlanesArr = [secPlanes.xMin, secPlanes.xMax, secPlanes.yMin, secPlanes.yMax, secPlanes.zMin, secPlanes.zMax];
  const botPlanes = {
    xMin: new THREE.Plane(new THREE.Vector3(1, 0, 0), 1e6),
    xMax: new THREE.Plane(new THREE.Vector3(-1, 0, 0), 1e6),
    yMin: new THREE.Plane(new THREE.Vector3(0, 1, 0), 1e6),
    yMax: new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e6),
    zMin: new THREE.Plane(new THREE.Vector3(0, 0, 1), 1e6),
    zMax: new THREE.Plane(new THREE.Vector3(0, 0, -1), 1e6)
  };
  const botClipPlanesArr = [botPlanes.xMin, botPlanes.xMax, botPlanes.yMin, botPlanes.yMax, botPlanes.zMin, botPlanes.zMax];

  renderer.clippingPlanes = sectionClipPlanesArr;

  // ---- Corte fijo (segunda vista, franja inferior): un renderer y una
  // camara aparte, mirando de lado, con un solo plano de recorte fijo
  // en la posicion real del Humedal El Burro -- no se mueve con la caja
  // de seccion interactiva de arriba, es su propio corte permanente. ----
  const sectionCanvas2 = document.getElementById("sectionCanvas");
  const sectionCamera = new THREE.PerspectiveCamera(16, 1, 1, 5000);
  let sectionRenderer = null, sectionCutZ = null, sectionControls = null;
  if (sectionCanvas2) {
    sectionRenderer = new THREE.WebGLRenderer({ canvas: sectionCanvas2, antialias: true, alpha: true });
    sectionRenderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    sectionRenderer.localClippingEnabled = false;
    sectionRenderer.setClearColor(0xeef2f5, 1);
  }
  const sectionCutPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 1e6); // se reubica cuando se conoce la posicion real del humedal
  let sectionCutX = 0;
  function placeSectionCutAtHumedal() {
    // Vista exacta que la usuaria dio: camara en perspectiva con estas
    // coordenadas precisas (rotacion 143°, U 26-38%, V 32-50%).
    sectionCutX = 177.0;
    sectionCutZ = -25.6;
    if (sectionRenderer) {
      if (typeof updateBotBox === 'function') updateBotBox();
      sectionRenderer.localClippingEnabled = false;
      sectionRenderer.clippingPlanes = botClipPlanesArr;
      sectionCamera.position.set(150.0, 8.5, -11.5);
      sectionCamera.up.set(0, 1, 0);
      sectionCamera.lookAt(182.4, 4.2, -35.7);
      sectionCamera.fov = 12; // solo se agranda el contenido (mas zoom), el tamaño del panel no se toca
      sectionCamera.zoom = 0.80;
      if (!sectionControls) {
        sectionControls = new THREE.OrbitControls(sectionCamera, sectionCanvas2);
        sectionControls.enableDamping = true;
        sectionControls.dampingFactor = 0.15;
        sectionControls.addEventListener("change", updateBotBox);
      }
      if (sectionControls) sectionControls.target.set(182.4, 4.2, -35.7);
      resizeSectionView();
      sectionCamera.updateProjectionMatrix();
    }
  }
  function resizeSectionView() {
    if (!sectionRenderer || !sectionCanvas2) return;
    const rect = sectionCanvas2.getBoundingClientRect();
    const w = Math.max(1, rect.width), h = Math.max(1, rect.height);
    sectionRenderer.setSize(w, h, false);
    sectionCamera.aspect = w / h; // camara de perspectiva: se ajusta el aspecto, no un frustum ortografico
    sectionCamera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resizeSectionView);

  // ---- Corte dinamico: ilustracion animada del perfil del humedal,
  // en el mismo estilo del corte de referencia (siluetas planas: tierra,
  // agua, arboles, peces, aves, patos, anden, lamparas). Se construye
  // una sola vez, todo en SVG con animaciones CSS por transform. ----
  // ---- Corte dinamico: se usa la imagen REAL que la usuaria subio, tal
  // cual, sin redibujar nada -- solo se le agregan aves, peces y un
  // brillo de agua animados encima, ubicados sobre las mismas zonas
  // donde ya estaban dibujados en la imagen original. ----
  // ---- Corte dinamico: imagen REAL de la usuaria de fondo, con aves y
  // peces animados encima. La animacion se hace con requestAnimationFrame
  // y se escribe el atributo transform directamente en cada cuadro (no
  // se usa CSS @keyframes sobre SVG, que en algunos navegadores no se
  // aplica de forma confiable sobre elementos <g>). ----
  let dynSecRafId = null;
  function buildDynamicSection() {
    const stage = document.getElementById("dynSecStage");
    const img = document.getElementById("dynSecBaseImg");
    if (!stage || !img) return;
    if (dynSecRafId) { cancelAnimationFrame(dynSecRafId); dynSecRafId = null; }
    document.querySelectorAll(".dynSprite").forEach(el => el.remove());

    // Recortes REALES de la imagen subida (pixeles del archivo original,
    // 8000x5654 -- verificados uno por uno). "rest" es el punto de un
    // arbol cercano donde el ave llega y se queda; el vuelo entra desde
    // AFUERA del cuadro, pasa cerca del agua, y termina posado ahi.
    const NATW = 8000, NATH = 5654;
    const birdsDef = [
      { box: [3382,3767,3515,3850], toLeft: true },   // ave rojiza
      { box: [5095,4375,5260,4485], toLeft: false },  // pato volando (grupo)
      { box: [5265,4345,5440,4465], toLeft: false },  // pato volando (grupo)
      { box: [5175,4445,5385,4605], toLeft: false },  // pato volando (grupo)
      { box: [4345,4655,4455,4720], toLeft: false, idle: true }, // pato posado junto al agua -- antes se quedaba quieto
    ];
    const fishDef = [
      { box: [3955,4795,4075,4840] },
      { box: [4665,4800,4730,4838] },
    ];

    function setup() {
      const stageRect = stage.getBoundingClientRect();
      const imgRect = img.getBoundingClientRect();
      const scale = imgRect.width / NATW;
      const imgOffX = imgRect.left - stageRect.left;
      const imgOffY = imgRect.top - stageRect.top;

      function makeSprite(box) {
        const [x0, y0, x1, y1] = box;
        const w = (x1 - x0) * scale, h = (y1 - y0) * scale;
        const el = document.createElement("div");
        el.className = "dynSprite";
        // mix-blend-mode:multiply quita el fondo blanco del recorte
        // rectangular -- asi no se ve un cuadro blanco al pasar sobre
        // los arboles, solo la silueta real del ave.
        el.style.cssText = `position:absolute; width:${w}px; height:${h}px; background-image:url(corte-burro-referencia.png); background-repeat:no-repeat; background-size:${NATW*scale}px ${NATH*scale}px; background-position:-${x0*scale}px -${y0*scale}px; pointer-events:none; will-change:transform; mix-blend-mode:multiply;`;
        const baseX = imgOffX + x0 * scale, baseY = imgOffY + y0 * scale;
        el.style.left = baseX + "px";
        el.style.top = baseY + "px";
        stage.appendChild(el);
        return { el, baseX, baseY, w, h };
      }

      // ---- Garza nueva (ilustracion limpia, no recorte de foto) volando
      // sobre el recuadro superior derecho: mas chica, mas arriba, y con
      // un arco de vuelo suave que baja hacia el agua/peces del recuadro
      // y vuelve a subir y salir -- como si fuera a pescar. ----
      const topCutBox = document.getElementById("dynSecTopCut");
      let herons = [];
      if (topCutBox) {
        const topRect = topCutBox.getBoundingClientRect();
        const w = topRect.width * 0.30; // bastante mas chica que antes
        const h = w * (1697 / 1200);
        const el = document.createElement("div");
        el.className = "dynSprite";
        el.style.cssText = `position:absolute; width:${w}px; height:${h}px; background-image:url(assets/garza_volando.png); background-repeat:no-repeat; background-size:100% 100%; pointer-events:none; will-change:transform; transform-origin:50% 78%; z-index:6;`;
        const baseX = (topRect.left - stageRect.left) + topRect.width * 0.42;
        const baseY = (topRect.top - stageRect.top) - h * 0.65; // un poco mas arriba del recuadro
        el.style.left = baseX + "px";
        el.style.top = baseY + "px";
        stage.appendChild(el);
        herons = [{ el, phase: 0, cyc: 17 }];

        // Tingua -- misma idea (recorte real, entra volando desde afuera),
        // pero camina/anda mas bajo, cerca del agua del recuadro.
        const tw = topRect.width * 0.16;
        const th = tw * (200 / 166);
        const tEl = document.createElement("div");
        tEl.className = "dynSprite";
        tEl.style.cssText = `position:absolute; width:${tw}px; height:${th}px; background-image:url(assets/tingua.png); background-repeat:no-repeat; background-size:100% 100%; pointer-events:none; will-change:transform; z-index:6;`;
        const tBaseX = (topRect.left - stageRect.left) + topRect.width * 0.58;
        const tBaseY = (topRect.top - stageRect.top) + topRect.height * 0.62;
        tEl.style.left = tBaseX + "px";
        tEl.style.top = tBaseY + "px";
        stage.appendChild(tEl);
        herons.push({ el: tEl, phase: 6, cyc: 14, isTingua: true });
      }

      // curva suave (sin saltos de velocidad en los quiebres del recorrido)
      function smooth(k) { return k * k * (3 - 2 * k); }

      const birds = birdsDef.map((b, i) => {
        const spr = makeSprite(b.box);
        const dir = b.toLeft ? -1 : 1;
        // punto de entrada bien afuera del cuadro (arriba y al lado
        // contrario del arbol de destino), pasando cerca del agua antes
        // de subir al arbol
        const enterX = -dir * (420 + i * 60);
        const enterY = -160 - i * 20;
        const nearWaterX = -dir * 40;
        const nearWaterY = 40;
        const treeX = dir * 70;
        const treeY = -60;
        return { ...spr, phase: i * 2.6, cyc: b.idle ? 999999 : (13 + i * 2), enterX, enterY, nearWaterX, nearWaterY, treeX, treeY, idle: !!b.idle };
      });
      const fishes = fishDef.map((f, i) => {
        const spr = makeSprite(f.box);
        return { ...spr, dir: i % 2 === 0 ? 1 : -1, phase: i * 1.6, cyc: 3.8 + i * 0.5 };
      });

      function frame(tSec) {
        birds.forEach(b => {
          if (b.idle) {
            // el pato posado no se va: solo un ligero balanceo, para que
            // "tambien se mueva" sin salir volando de donde esta
            const bob = Math.sin(tSec * 1.6 + b.phase) * 1.6;
            const flap = 1 - Math.abs(Math.sin(tSec * 2.2 + b.phase)) * 0.06;
            b.el.style.transform = `translate(0, ${bob}px) scaleY(${flap})`;
            return;
          }
          const t = ((tSec + b.phase) % b.cyc) / b.cyc;
          // 0-35%: entra desde afuera y baja cerca del agua
          // 35-45%: pasa cerca del agua
          // 45-70%: sube y se posa en el arbol
          // 70-100%: se queda posado (quieto salvo el aleteo/balanceo)
          let x, y;
          if (t < 0.35) {
            const k = smooth(t / 0.35);
            x = b.enterX + (b.nearWaterX - b.enterX) * k;
            y = b.enterY + (b.nearWaterY - b.enterY) * k;
          } else if (t < 0.45) {
            const k = smooth((t - 0.35) / 0.10);
            x = b.nearWaterX + (b.nearWaterX * 0.4 - b.nearWaterX) * k;
            y = b.nearWaterY;
          } else if (t < 0.70) {
            const k = smooth((t - 0.45) / 0.25);
            x = b.nearWaterX * 0.6 + (b.treeX - b.nearWaterX * 0.6) * k;
            y = b.nearWaterY + (b.treeY - b.nearWaterY) * k;
          } else {
            // posado en el arbol -- se queda ahi la mayor parte del ciclo
            x = b.treeX; y = b.treeY;
          }
          // aleteo: solo mientras vuela (no cuando ya esta posado), como
          // una leve compresion vertical ritmica
          const flying = t < 0.70;
          const flap = flying ? (1 - Math.abs(Math.sin(tSec * 10 + b.phase)) * 0.4) : 1;
          b.el.style.transform = `translate(${x}px, ${y}px) scaleY(${flap})`;
        });
        fishes.forEach(f => {
          const t = (tSec + f.phase) / f.cyc;
          // dos ondas superpuestas (distinta frecuencia) para que el nado
          // se sienta organico, no mecanico; un poco de sube-baja tambien
          const dx = Math.sin(t * Math.PI * 2) * 30 * f.dir + Math.sin(t * Math.PI * 5.3) * 6 * f.dir;
          const dy = Math.sin(t * Math.PI * 3.1 + f.phase) * 3;
          f.el.style.transform = `translate(${dx}px, ${dy}px) scaleX(${f.dir})`;
        });
        herons.forEach(h => {
          const t = ((tSec + h.phase) % h.cyc) / h.cyc;
          if (h.isTingua) {
            // La tingua entra caminando/nadando desde afuera, mas bajo y
            // sin el vuelo en arco de la garza -- vaiven horizontal simple.
            const FARW = 420;
            const k2 = smooth(t);
            const xw = FARW * Math.cos(k2 * Math.PI);
            const bob = Math.sin(tSec * 5 + h.phase) * 2.5;
            h.el.style.transform = `translate(${xw}px, ${bob}px) scaleX(${Math.cos(k2 * Math.PI) < 0 ? -1 : 1})`;
            return;
          }
          // un solo arco continuo y suave: entra desde muy afuera,
          // desciende como si fuera a pescar, y vuelve a subir y salir --
          // sin tramos "congelados" para que se sienta vivo todo el rato.
          const FAR = 1300;
          const k = smooth(t); // 0 -> 1 a lo largo de todo el ciclo
          const x = FAR * Math.cos(k * Math.PI); // FAR -> -FAR suavemente
          const dive = Math.sin(k * Math.PI) * 34; // baja en el medio del recorrido
          // Aleteo tipo stop-motion: en vez de interpolar suave entre
          // posiciones, se salta entre POCAS poses fijas (4 por ciclo de
          // aleteo) y se mantiene cada una un instante, como fotogramas --
          // y todo el vuelo va mas lento en general.
          const flapPeriod = 1.1; // segundos por ciclo de aleteo (lento)
          const frameCount = 4;
          const framePhase = Math.floor(((tSec + h.phase) / flapPeriod) * frameCount) % frameCount;
          const flapPoses = [1.0, 0.78, 0.6, 0.78]; // abierta -> a medio cerrar -> mas cerrada -> a medio abrir
          const tiltPoses = [0, -2, 0, 2];
          const flap = flapPoses[framePhase];
          const tilt = tiltPoses[framePhase];
          h.el.style.transform = `translate(${x}px, ${dive}px) rotate(${tilt}deg) scaleY(${flap})`;
        });
      }

      const start = performance.now();
      function loop(now) {
        frame((now - start) / 1000);
        dynSecRafId = requestAnimationFrame(loop);
      }
      dynSecRafId = requestAnimationFrame(loop);
    }

    if (img.complete) setup();
    else img.addEventListener("load", setup, { once: true });
    if (!window.__dynSecResizeBound) {
      window.__dynSecResizeBound = true;
      window.addEventListener("resize", () => { if (img.complete) setup(); });
    }
  }

  const dynamicSectionBtn = document.getElementById("dynamicSectionBtn");
  const dynamicSectionOverlay = document.getElementById("dynamicSectionOverlay");
  const dynamicSectionClose = document.getElementById("dynamicSectionClose");
  if (dynamicSectionBtn) dynamicSectionBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (dynamicSectionOverlay) dynamicSectionOverlay.style.display = "block";
    // Importante: el overlay debe estar visible ANTES de medir el
    // tamaño real de la imagen (antes se media con el overlay aun
    // oculto, dando 0x0 y sprites invisibles). Un frame de margen para
    // que el navegador aplique el layout.
    requestAnimationFrame(() => requestAnimationFrame(buildDynamicSection));
  });
  if (dynamicSectionClose) dynamicSectionClose.addEventListener("click", (e) => {
    e.stopPropagation();
    if (dynamicSectionOverlay) dynamicSectionOverlay.style.display = "none";
  });

  // ---- Editor de la organizacion del panel (convenciones + axonometria
  // + corte): controla el ancho de las convenciones y el alto del corte
  // con sliders, y arma un texto de coordenadas para copiar y reproducir
  // esa misma organizacion despues. ----
  const layoutLegendW = document.getElementById("layoutLegendW");
  const layoutAxoTop = document.getElementById("layoutAxoTop");
  const layoutAxoH = document.getElementById("layoutAxoH");
  const layoutCorteH = document.getElementById("layoutCorteH");
  const layoutLegendWVal = document.getElementById("layoutLegendWVal");
  const layoutAxoTopVal = document.getElementById("layoutAxoTopVal");
  const layoutAxoHVal = document.getElementById("layoutAxoHVal");
  const layoutCorteHVal = document.getElementById("layoutCorteHVal");
  const layoutCoordsOutput = document.getElementById("layoutCoordsOutput");
  // ---- Texto con el numero/titulo de la capa activa, DENTRO de
  // convenciones (a la izquierda de la axonometria) -- movible con
  // flechitas, con coordenadas para copiar. ----
  let labelOffX = 276, labelOffY = -144;
  function applyLabelPosition() {
    // Estas son las etiquetas "CAPA 01/02/03/04" que aparecen a la
    // izquierda de cada capa dentro de la axonometria (una por sub-capa;
    // solo la de la capa activa esta visible). Conservan su centrado
    // vertical propio (translateY(-50%)) y se les suma el desplazamiento
    // de las flechitas encima.
    document.querySelectorAll(".nat-layer-tag").forEach(el => {
      el.style.transform = `translate(${labelOffX}px, calc(-50% + ${labelOffY}px))`;
    });
    const out = document.getElementById("escalaCoordsOutput");
    if (out) out.value = `// === POSICIÓN DEL TÍTULO ===\nconst LABEL_POS = {\n  offsetX: ${Math.round(labelOffX)},\n  offsetY: ${Math.round(labelOffY)}\n};`;
  }
  function syncFloatLabelText() {
    const label = document.getElementById("natEscalaLabel");
    const btnText = document.getElementById("natAssembleBtnText");
    const legendActiveLayerText = document.getElementById("legendActiveLayerText");
    if (label && legendActiveLayerText) legendActiveLayerText.textContent = label.textContent.trim() + (btnText ? " — " + btnText.textContent.trim() : "");
    updateDynamicLegend();
    syncSceneToLayer();
    // El contexto se ve difuminado detras, tal como se veia antes,
    // ajustado al recuadro chico de la axonometria.
    const axoContextFadeEl = document.getElementById("axoContextFade");
    if (axoContextFadeEl) axoContextFadeEl.style.display = "block";
  }
  // ---- El corte comparte la misma escena 3D que la axonometria, asi que
  // para que "se vea lo mismo" alla abajo, se refleja el estado real de
  // cada capa en los objetos reales de la escena (ya asentados en el
  // territorio, sin animacion de explosion -- solo se prenden/apagan). ----
  // ---- Aves reales (garza/tingua/pato) dentro del CORTE PRINCIPAL,
  // sincronizadas con lo que pasa en la axonometria: Capa 3 (tinguas en
  // el centro del humedal, garzas llegan volando desde la izquierda y se
  // posan en el centro, las tinguas se corren al borde) y Capa 4 (se
  // suma el pato, que llega volando desde la derecha -- migracion desde
  // Norteamerica). Tamanos chicos, nada de aves gigantes. ----
  let sectionBirdsBuilt = false, sectionBirdsRaf = null, sectionBirdStep = 0;
  function buildSectionBirds() {
    if (sectionBirdsBuilt) return;
    const stage = document.getElementById("sectionBirdStage");
    if (!stage) return;
    sectionBirdsBuilt = true;
    function sprite(src, wPct, wOverH) {
      const el = document.createElement("div");
      el.className = "sectionBirdSprite";
      // mix-blend-mode:multiply quita el fondo blanco de las fotos.
      el.style.cssText = `position:absolute; width:${wPct}%; height:auto; aspect-ratio:${wOverH}; background-image:url(${src}); background-repeat:no-repeat; background-size:100% 100%; pointer-events:none; display:none; mix-blend-mode:multiply;`;
      stage.appendChild(el);
      return el;
    }
    function smoothS(k) { return k * k * (3 - 2 * k); }

    // Varias tinguas, ya en el centro del humedal desde el principio.
    const tinguas = Array.from({ length: 3 }, (_, i) => {
      const el = sprite("assets/tingua.png", 2.2, 166/200);
      el.style.top = "54%"; el.style.left = (46 + i * 4) + "%";
      return { el, baseLeft: 46 + i * 4, phase: i * 2, toEdge: false };
    });
    // Varias garzas, entran volando desde la izquierda, se posan justo
    // sobre la linea del agua (no debajo).
    const garzas = Array.from({ length: 2 }, (_, i) => {
      const el = sprite("assets/garza.png", 1.8, 79/200);
      el.style.top = "48%"; el.style.left = "50%";
      return { el, phase: i * 3, dur: 9 + i * 1.5, offsetX: i * 6 - 3 };
    });
    // Pato: entra volando desde ARRIBA del corte, aleteando, hasta el
    // centro del humedal (migracion desde Norteamerica).
    const patoEl = sprite("assets/pato.png", 2.6, 1024/767);
    patoEl.style.top = "50%"; patoEl.style.left = "50%";

    const start = performance.now();
    function loop(now) {
      const tSec = (now - start) / 1000;
      const garzasLlegaron = garzas.some(g => {
        const t = (tSec + g.phase) % g.dur;
        return t > g.dur * 0.35; // ya aterrizo
      });
      garzas.forEach(g => {
        if (g.el.style.display === "none") return;
        const t = ((tSec + g.phase) % g.dur) / g.dur;
        const k = smoothS(Math.min(1, t / 0.35));
        const FROM = -200;
        const x = FROM * (1 - k) + g.offsetX;
        const dip = Math.sin(Math.min(1, t / 0.35) * Math.PI) * -6; // llega por arriba y se posa EN la linea
        const flying = t < 0.35;
        const flap = flying ? (1 - Math.abs(Math.sin(tSec * 9 + g.phase)) * 0.3) : 1;
        g.el.style.transform = `translate(${x}px, ${dip}px) scaleY(${flap})`;
      });
      tinguas.forEach(tg => {
        if (tg.el.style.display === "none") return;
        // cuando llegan las garzas, las tinguas se corren a los bordes
        const targetOffset = garzasLlegaron ? (tg.baseLeft < 50 ? -14 : 14) : 0;
        if (tg._cur === undefined) tg._cur = 0;
        tg._cur += (targetOffset - tg._cur) * 0.02; // se corren suave, una sola vez
        const bob = Math.sin(tSec * 2.4 + tg.phase) * 1.2;
        tg.el.style.transform = `translate(${tg._cur}px, ${bob}px)`;
      });
      if (patoEl.style.display !== "none") {
        const cyc = 12, t = (tSec % cyc) / cyc, k = smoothS(Math.min(1, t / 0.4));
        const FROMY = -140; // arriba del corte
        const y = FROMY * (1 - k);
        const flying = t < 0.4;
        const flap = flying ? (1 - Math.abs(Math.sin(tSec * 11)) * 0.35) : 1;
        patoEl.style.transform = `translate(0, ${y}px) scaleY(${flap})`;
      }
      sectionBirdsRaf = requestAnimationFrame(loop);
    }
    sectionBirdsRaf = requestAnimationFrame(loop);
    stage.__tinguas = tinguas; stage.__garzas = garzas; stage.__pato = patoEl;
  }
  function syncSectionBirdsToLayer(step) {
    buildSectionBirds();
    sectionBirdStep = step;
    const stage = document.getElementById("sectionBirdStage");
    if (!stage || !stage.__tinguas) return;
    const capa3 = (step === 5 || step === 6);
    const capa4 = (step === 7 || step === 8);
    const dispBirds = (capa3 || capa4) ? "block" : "none";
    stage.__tinguas.forEach(tg => tg.el.style.display = dispBirds);
    stage.__garzas.forEach(g => g.el.style.display = dispBirds);
    stage.__pato.style.display = capa4 ? "block" : "none";
  }

  function syncSceneToLayer() {
    const step = typeof natExplodeStep !== "undefined" ? natExplodeStep : 0;
    // Las mirlas (birdsGroup) ya estan programadas para ir a los arboles
    // de Sauco/Capuli/Urapan (BIRD_TREE_SPECIES) -- van en la Capa 2
    // (vegetacion), no en la de aves.
    const mirlaStep = (step === 3 || step === 4);
    if (typeof birdsGroup !== "undefined" && birdsGroup) birdsGroup.visible = mirlaStep;
    if (mirlaStep) { if (typeof startNatMirlaAnim === "function") startNatMirlaAnim(); }
    else { if (typeof stopNatMirlaAnim === "function") stopNatMirlaAnim(); }
    // Ninguna de las capas de la escala natural muestra realmente
    // vehiculos ni ruido en su axonometria -- se ocultan siempre aqui,
    // solo se ve lo que efectivamente aparece en cada capa.
    if (typeof vehInstanced !== "undefined" && vehInstanced) vehInstanced.visible = false;
    if (typeof noiseMesh !== "undefined" && noiseMesh) noiseMesh.visible = false;
    syncSectionBirdsToLayer(step);
  }
  // ---- Convenciones dinamicas: cambian segun la capa que se este
  // mostrando -- solo los agentes/elementos que realmente aparecen en
  // esa capa, no una lista generica fija. ----
  function legendRow(iconHTML, label) {
    return `<div style="display:flex; align-items:center; gap:10px;">${iconHTML}<span>${label}</span></div>`;
  }
  function legendImgIcon(src) {
    return `<i style="width:26px; height:26px; border-radius:6px; flex:none; background-image:url(${src}); background-repeat:no-repeat; background-size:contain; background-position:center; background-color:#eef2f5;"></i>`;
  }
  function legendImgIcon2(src, size, pos) {
    return `<i style="width:26px; height:26px; border-radius:6px; flex:none; background-image:url(${src}); background-repeat:no-repeat; background-size:${size}; background-position:${pos}; background-color:#eef2f5;"></i>`;
  }
  function legendDotIcon(color, round) {
    return `<i style="width:16px; height:${round ? 16 : 6}px; border-radius:${round ? "50%" : "3px"}; flex:none; background:${color};"></i>`;
  }
  function updateDynamicLegend() {
    const c = document.getElementById("legendDynamicContent");
    if (!c) return;
    // Antes esta funcion solo conocia natExplodeStep -- las capas Cultural
    // y Tecnologica nunca llenaban el panel de Agentes de la izquierda,
    // aunque sus propios paneles de estadisticas (cultCapa1Panel, etc)
    // si funcionaban bien por separado. Se agrega el mismo tratamiento
    // para esas dos capas, con sus 4 subcapas reales cada una.
    const cultStep = typeof cultExplodeStep !== "undefined" ? cultExplodeStep : 0;
    const techStep = typeof techExplodeStep !== "undefined" ? techExplodeStep : 0;
    const cultOverlayEl = document.getElementById("culturalExplodeOverlay");
    const techOverlayEl = document.getElementById("techExplodeOverlay");
    const cultVisible = cultOverlayEl && cultOverlayEl.style.display && cultOverlayEl.style.display !== "none";
    const techVisible = techOverlayEl && techOverlayEl.style.display && techOverlayEl.style.display !== "none";

    if (cultVisible) {
      let rows = "";
      const idx = cultStep === 0 ? -1 : Math.floor((cultStep - 1) / 2);
      if (idx === 0 || cultStep === 0) rows += legendRow(`<i class="fa-solid fa-clock-rotate-left" style="width:20px; text-align:center; color:#a21caf;"></i>`, "Memoria histórica (1950–2024)");
      if (idx === 1) rows += legendRow(`<i class="fa-solid fa-door-closed" style="width:20px; text-align:center; color:#0284c7;"></i>`, "Cerramiento de borde (EAAB)");
      if (idx === 2) rows += legendRow(`<i class="fa-solid fa-book-open-reader" style="width:20px; text-align:center; color:#15803d;"></i>`, "Recorrido pedagógico");
      if (idx === 3) rows += legendRow(`<i class="fa-solid fa-road" style="width:20px; text-align:center; color:#b45309;"></i>`, "Fricción vial (SOT)");
      if (cultStep >= 9) {
        rows = legendRow(`<i class="fa-solid fa-clock-rotate-left" style="width:20px; text-align:center; color:#a21caf;"></i>`, "Memoria histórica (1950–2024)")
          + legendRow(`<i class="fa-solid fa-door-closed" style="width:20px; text-align:center; color:#0284c7;"></i>`, "Cerramiento de borde (EAAB)")
          + legendRow(`<i class="fa-solid fa-book-open-reader" style="width:20px; text-align:center; color:#15803d;"></i>`, "Recorrido pedagógico")
          + legendRow(`<i class="fa-solid fa-road" style="width:20px; text-align:center; color:#b45309;"></i>`, "Fricción vial (SOT)");
      }
      c.innerHTML = rows;
      return;
    }
    if (techVisible) {
      let rows = "";
      const idx = techStep === 0 ? -1 : Math.floor((techStep - 1) / 2);
      if (idx === 0 || techStep === 0) rows += legendRow(`<i class="fa-solid fa-car" style="width:20px; text-align:center; color:#334155;"></i>`, "Red vial y tráfico");
      if (idx === 1) rows += legendRow(`<i class="fa-solid fa-volume-high" style="width:20px; text-align:center; color:#dc2626;"></i>`, "Simulación de ruido");
      if (idx === 2) rows += legendRow(`<i class="fa-solid fa-water" style="width:20px; text-align:center; color:#0ea5e9;"></i>`, "Inundación y movilidad");
      if (idx === 3) rows += legendRow(`<i class="fa-solid fa-toilets-portable" style="width:20px; text-align:center; color:#475569;"></i>`, "Alcantarillado");
      if (techStep >= 9) {
        rows = legendRow(`<i class="fa-solid fa-car" style="width:20px; text-align:center; color:#334155;"></i>`, "Red vial y tráfico")
          + legendRow(`<i class="fa-solid fa-volume-high" style="width:20px; text-align:center; color:#dc2626;"></i>`, "Simulación de ruido")
          + legendRow(`<i class="fa-solid fa-water" style="width:20px; text-align:center; color:#0ea5e9;"></i>`, "Inundación y movilidad")
          + legendRow(`<i class="fa-solid fa-toilets-portable" style="width:20px; text-align:center; color:#475569;"></i>`, "Alcantarillado");
      }
      c.innerHTML = rows;
      return;
    }

    const step = typeof natExplodeStep !== "undefined" ? natExplodeStep : 0;
    let rows = "";
    if (step === 1 || step === 2) {
      // Capa 1: Sistema Hidrico -- todo lo que hace parte de esa simulacion
      rows += legendRow(legendDotIcon("#0284c7"), "Río Bogotá");
      rows += legendRow(legendDotIcon("#38bdf8"), "Río Fucha");
      rows += legendRow(legendDotIcon("#64748b"), "Canal Castilla");
      rows += legendRow(legendDotIcon("#94a3b8"), "Canal de Los Ángeles");
      rows += legendRow(legendDotIcon("#0ea5e9"), "Río Tunjuelo");
      rows += legendRow(legendDotIcon("#7dd3fc", true), "Humedal El Burro");
      rows += legendRow(legendDotIcon("#7dd3fc", true), "Humedal La Vaca");
    } else if (step === 3 || step === 4) {
      // Capa 2: Cobertura vegetal -- los 3 colores de arboles (sin el
      // nombre del color entre parentesis, ya se ve en el icono)
      rows += legendRow(legendDotIcon("#b06bff", true), "Saúco");
      rows += legendRow(legendDotIcon("#ff5fa8", true), "Capulí");
      rows += legendRow(legendDotIcon("#a3e635", true), "Urapán");
      rows += legendRow(`<i style="width:20px; height:20px; flex:none; display:flex; align-items:center; justify-content:center;"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M2 14 Q8 6 12 12 Q16 6 22 14 Q16 11 12 15 Q8 11 2 14 Z" fill="#1c1c1c"/></svg></i>`, "Mirlas");
      rows += legendRow(legendDotIcon("#f97316", true), "Especies invasoras (Kikuyo, Enea, Junquera)");
    } else if (step === 5 || step === 6) {
      // Capa 3: tingua y garza (el pato va en la Capa 4, es la que llega
      // en epoca de migracion)
      rows += legendRow(legendImgIcon("assets/tingua.png"), "Tingua");
      rows += legendRow(legendImgIcon("assets/garza.png"), "Garza");
    } else if (step === 7 || step === 8) {
      // Capa 4: tingua, garza y pato (migracion desde Norteamerica)
      rows += legendRow(legendImgIcon("assets/tingua.png"), "Tingua");
      rows += legendRow(legendImgIcon("assets/garza.png"), "Garza");
      rows += legendRow(legendImgIcon("assets/pato.png"), "Pato");
    } else {
      // Vista base / sin capa especifica: contexto general
      rows += legendRow(legendDotIcon("#7a838d"), "Vías y malla vial");
      rows += legendRow(legendDotIcon("#c7cdd3"), "Edificios y manzanas");
      rows += legendRow(legendDotIcon("#7dd3fc", true), "Cuerpos de agua / humedal");
      rows += legendRow(legendDotIcon("#6b9e78"), "Cobertura vegetal");
    }
    c.innerHTML = rows;
  }
  const STEP = 12;
  const labelMoveUp = document.getElementById("labelMoveUp");
  const labelMoveDown = document.getElementById("labelMoveDown");
  const labelMoveLeft = document.getElementById("labelMoveLeft");
  const labelMoveRight = document.getElementById("labelMoveRight");
  if (labelMoveUp) labelMoveUp.addEventListener("click", (e) => { e.stopPropagation(); labelOffY -= STEP; applyLabelPosition(); });
  if (labelMoveDown) labelMoveDown.addEventListener("click", (e) => { e.stopPropagation(); labelOffY += STEP; applyLabelPosition(); });
  if (labelMoveLeft) labelMoveLeft.addEventListener("click", (e) => { e.stopPropagation(); labelOffX -= STEP; applyLabelPosition(); });
  if (labelMoveRight) labelMoveRight.addEventListener("click", (e) => { e.stopPropagation(); labelOffX += STEP; applyLabelPosition(); });
  const escalaCoordsCopy = document.getElementById("escalaCoordsCopy");
  if (escalaCoordsCopy) escalaCoordsCopy.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(document.getElementById("escalaCoordsOutput").value); escalaCoordsCopy.textContent = "✅ Copiado"; setTimeout(() => { escalaCoordsCopy.textContent = "📋 Copiar coordenadas"; }, 1600); } catch (err) {}
  });

  function fitEscalaOverlays() {
    const layoutEditorEl = document.getElementById("layoutEditor");
    if (layoutEditorEl) layoutEditorEl.style.display = "block";
    const legendW = 0; // Agentes ya no se muestra, se recupera todo el ancho
    const corteH = 16;
    // A pedido de la usuaria: sin fondo solido, sin cuadro visible --
    // la escala flota libre, sin recuadro detras.
    ["naturalExplodeOverlay", "culturalExplodeOverlay", "techExplodeOverlay"].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.style.left = legendW + "px";
      el.style.top = "0";
      el.style.right = "0";
      el.style.bottom = corteH + "%";
    });
    // Se ocultan el boton "Volver a escalas", el boton de extraer/ensamblar
    // capa y el rotulo "ESCALA NATURAL..." -- ese contenido ahora va
    // dentro de convenciones. El diamante sigue respondiendo al clic para
    // avanzar sus sub-capas (advanceNaturalAssemble), asi que no se pierde
    // la funcionalidad, solo se oculta el boton.
    ["natExplodeBack", "natAssembleBtn", "natEscalaLabel"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });
    // El texto "ESCALA NATURAL / Extraer Capa..." vive dentro de
    // convenciones (a la izquierda de la axonometria), y se puede mover
    // con las flechitas dentro de ese mismo panel.
    const legendActiveLayer = document.getElementById("legendActiveLayer");
    if (legendActiveLayer) legendActiveLayer.style.display = "block";
    syncFloatLabelText();
    applyLabelPosition();
    const escalaZoomPanel = document.getElementById("escalaZoomPanel");
    if (escalaZoomPanel) escalaZoomPanel.style.display = "block";
    if (!window.__labelEscalaObs) {
      const btnTextEl = document.getElementById("natAssembleBtnText");
      if (btnTextEl && window.MutationObserver) {
        window.__labelEscalaObs = new MutationObserver(syncFloatLabelText);
        window.__labelEscalaObs.observe(btnTextEl, { childList: true, characterData: true, subtree: true });
      }
    }
  }

  function applyLayoutOrganization() {
    if (!layoutLegendW) return;
    const legendW = parseInt(layoutLegendW.value, 10);
    const axoTop = parseInt(layoutAxoTop.value, 10);
    const axoH = parseInt(layoutAxoH.value, 10);
    const corteH = parseInt(layoutCorteH.value, 10);
    layoutLegendWVal.textContent = legendW + "px";
    layoutAxoTopVal.textContent = axoTop + "px";
    layoutAxoHVal.textContent = axoH + "%";
    layoutCorteHVal.textContent = corteH + "%";
    const legendPanelEl2 = document.getElementById("legendPanel");
    const sectionWrapEl3 = document.getElementById("sectionWrap");
    const wrapEl = document.getElementById("sceneWrap");
    if (legendPanelEl2) legendPanelEl2.style.width = legendW + "px";
    if (sectionWrapEl3) { sectionWrapEl3.style.left = legendW + "px"; sectionWrapEl3.style.height = corteH + "%"; }
    if (wrapEl) {
      // La axonometria ya no depende del alto del corte: tiene su propia
      // posicion vertical (puede moverse hacia arriba, incluso a valores
      // negativos, para que no la tape nada al explotar una capa) y su
      // propio alto, independientes del corte de abajo.
      wrapEl.style.left = legendW + "px";
      wrapEl.style.right = "0";
      wrapEl.style.top = axoTop + "px";
      wrapEl.style.height = axoH + "%";
      wrapEl.style.bottom = "";
    }
    resize();
    resizeSectionView();
    if (layoutCoordsOutput) {
      layoutCoordsOutput.value =
        `// === ORGANIZACION DEL PANEL ===\nconst LAYOUT = {\n  legendWidthPx: ${legendW},\n  axoTopPx: ${axoTop},\n  axoHeightPct: ${axoH},\n  corteHeightPct: ${corteH}\n};`;
    }
  }
  if (layoutLegendW) {
    layoutLegendW.addEventListener("input", applyLayoutOrganization);
    layoutAxoTop.addEventListener("input", applyLayoutOrganization);
    layoutAxoH.addEventListener("input", applyLayoutOrganization);
    layoutCorteH.addEventListener("input", applyLayoutOrganization);
    const layoutCoordsCopy = document.getElementById("layoutCoordsCopy");
    if (layoutCoordsCopy) layoutCoordsCopy.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(layoutCoordsOutput.value); layoutCoordsCopy.textContent = "✅ Copiado"; setTimeout(() => { layoutCoordsCopy.textContent = "📋 Copiar coordenadas"; }, 1600); } catch (e) {}
    });
  }

  // Pantalla completa para la franja del corte: se agranda a cubrir casi
  // toda la pantalla para poder acomodarla con comodidad (rotarla, mover
  // la camara), sin tocar la axonometria de arriba ni las capas.
  const sectionWrapEl2 = document.getElementById("sectionWrap");
  const sectionFullscreenBtn = document.getElementById("sectionFullscreenBtn");
  let sectionIsFullscreen = false;
  if (sectionFullscreenBtn && sectionWrapEl2) {
    sectionFullscreenBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      sectionIsFullscreen = !sectionIsFullscreen;
      if (sectionIsFullscreen) {
        sectionWrapEl2.style.left = "18px";
        sectionWrapEl2.style.top = "18px";
        sectionWrapEl2.style.right = "18px";
        sectionWrapEl2.style.bottom = "18px";
        sectionWrapEl2.style.height = "auto";
        sectionWrapEl2.style.zIndex = "500";
        sectionWrapEl2.style.borderRadius = "12px";
        sectionWrapEl2.style.boxShadow = "0 20px 60px rgba(0,0,0,.35)";
        sectionFullscreenBtn.textContent = "✕ Cerrar pantalla completa";
      } else {
        sectionWrapEl2.style.left = "200px";
        sectionWrapEl2.style.top = "";
        sectionWrapEl2.style.right = "0";
        sectionWrapEl2.style.bottom = "0";
        sectionWrapEl2.style.height = "20%";
        sectionWrapEl2.style.zIndex = "150";
        sectionWrapEl2.style.borderRadius = "0";
        sectionWrapEl2.style.boxShadow = "none";
        sectionFullscreenBtn.textContent = "⛶ Pantalla completa";
      }
      resizeSectionView();
    });
  }

  // Descargar el corte como imagen PNG en alta resolucion: se renderiza
  // un cuadro extra a un tamano mucho mas grande que el canvas visible
  // (para que se vea nitido incluso impreso), se exporta y se vuelve a
  // dejar el canvas en su tamano normal de pantalla.
  const sectionDownloadBtn = document.getElementById("sectionDownloadBtn");
  if (sectionDownloadBtn) {
    sectionDownloadBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!sectionRenderer || !sectionCanvas2) return;
      const rect = sectionCanvas2.getBoundingClientRect();
      const scaleUp = 4; // resolucion final: 4x el tamano visible en pantalla
      const hdW = Math.round(rect.width * scaleUp), hdH = Math.round(rect.height * scaleUp);
      const prevAspect = sectionCamera.aspect;
      sectionRenderer.setPixelRatio(1);
      sectionRenderer.setSize(hdW, hdH, false);
      sectionCamera.aspect = hdW / hdH;
      sectionCamera.updateProjectionMatrix();
      sectionRenderer.render(scene, sectionCamera);
      const dataUrl = sectionCanvas2.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "corte-humedal-el-burro-HD.png";
      a.click();
      // volver el canvas a su tamano normal en pantalla
      sectionRenderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      sectionCamera.aspect = prevAspect;
      resizeSectionView();
    });
  }

  // Tamano visible (mitad de la altura del encuadre, en unidades de la
  // escena) para la proyeccion ortogonal — se ajusta al cargar la red.
  let viewSize = 260;
  function resize() {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.left = -viewSize * aspect;
    camera.right = viewSize * aspect;
    camera.top = viewSize;
    camera.bottom = -viewSize;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  canvas.addEventListener("contextmenu", (e) => e.preventDefault()); // sin esto, el navegador abre su menu contextual con el clic derecho en vez de dejarlo mover (panear) la vista
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  // Antes el angulo quedaba fijo en 35 grados. Ahora se puede inclinar
  // la vista libremente (solo girar alrededor y hacer zoom quedaba antes).
  controls.minPolarAngle = Math.PI / 12;
  controls.maxPolarAngle = Math.PI / 2.15;
  controls.minZoom = 0.15;
  controls.maxZoom = 30;
  controls.enablePan = true;

  // ---- Luces (con sombras, tipo render arquitectonico) ----
  const ambient = new THREE.AmbientLight(0xffffff, 0.95);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffffff, 0.65);
  scene.add(sun);
  scene.add(sun.target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 2600;
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.6; // reduce el parpadeo/artefactos de sombra (shadow acne) - subido para mas margen
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
  let currentBoxRealBounds = null; // rango real (X/Y) de la caja de seccion actual, para que ruido/mirlas trabajen solo ahi
  function sceneToReal(x, z) { return [x / SCALE + netCenter.x, -z / SCALE + netCenter.y]; }
  let sceneExtentW = 100, sceneExtentH = 100; // ancho/alto de la escena en unidades (para la caja de seccion)
  let roadMat = null, waterMat = null, parqueMat = null; // referencias para los selectores de color en vivo
  let buildingEdgeMat = null; // referencia para ajustar su opacidad segun el zoom
  let groundMesh = null;

  function buildGround(bbox) {
    const w = (bbox[2] - bbox[0]) * SCALE * 1.4;
    const h = (bbox[3] - bbox[1]) * SCALE * 1.4;
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.MeshStandardMaterial({ clippingPlanes: sectionClipPlanesArr, color: 0xeceeef, roughness: 1, metalness: 0 });
    groundMesh = new THREE.Mesh(geo, mat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.set(0, -0.4, 0);
    groundMesh.receiveShadow = true;
    sceneRoot.add(groundMesh);
    buildAxoBorder(-w / 2, w / 2, -h / 2, h / 2);
  }

  // ---- Marco/borde negro grueso alrededor del area VISIBLE actual (como
  // en los diagramas explotados de referencia: cada plano/capa lleva un
  // contorno negro solido bien marcado) — sigue los limites de la caja de
  // seccion cuando esta activa (que es lo que en verdad se ve), no todo
  // el terreno completo (que quedaria muy lejos del recorte y no se
  // notaria). Se hace con geometria 3D real (no una linea, que WebGL
  // ignora el grosor) para que el grosor se vea bien sin importar el
  // angulo o el zoom. ----
  let axoBorderMesh = null;
  function buildAxoBorder(xMin, xMax, zMin, zMax) {
    if (axoBorderMesh) { sceneRoot.remove(axoBorderMesh); axoBorderMesh.geometry.dispose(); }
    const w = xMax - xMin, h = zMax - zMin;
    const DEPTH = Math.max(w, h) * 0.08; // bastante mas profundo que antes (0.018 era casi invisible desde el angulo axonometrico de 35°, que acorta mucho lo vertical)
    const Y_TOP = 0; // nivel del suelo real
    const Y_BOTTOM = -DEPTH;
    const corners = [
      [xMin, zMin], [xMax, zMin], [xMax, zMax], [xMin, zMax],
    ];
    const positions = [];
    for (let i = 0; i < 4; i++) {
      const a = corners[i], b = corners[(i + 1) % 4];
      // Pared vertical entre cada par de esquinas: 2 triangulos, desde el
      // nivel del suelo hasta DEPTH unidades hacia abajo.
      positions.push(
        a[0], Y_TOP, a[1], b[0], Y_TOP, b[1], b[0], Y_BOTTOM, b[1],
        a[0], Y_TOP, a[1], b[0], Y_BOTTOM, b[1], a[0], Y_BOTTOM, a[1]
      );
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.MeshBasicMaterial({ color: 0x0a0a0a, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    sceneRoot.add(mesh);
    axoBorderMesh = mesh;
  }

  // Convierte una coordenada del JSON (x,y en el plano, x=este, y=norte
  // real en UTM) a posicion 3D (x,z en Three.js, y=altura). El eje Z se
  // invierte (espejo, no rotacion) para que el plano quede orientado
  // correctamente — esto NO toca la altura (Y) de nada, a diferencia de
  // rotar el grupo entero.
  function toScene(x, y) {
    return { x: (x - netCenter.x) * SCALE, z: -(y - netCenter.y) * SCALE };
  }
  function fromScene(sx, sz) {
    return { x: sx / SCALE + netCenter.x, y: netCenter.y - sz / SCALE };
  }
  // Conversion local -> lat/lng (misma calibracion con Humedal La Vaca y
  // Humedal El Burro ya usada en el proyecto), para poder copiar el
  // poligono dibujado como coordenadas reales.
  const CAL_A = 158502.5342667897, CAL_B = 11760483.425451731;
  const CAL_C = 75875.89881636726, CAL_D = -349119.0227795534;
  function localToLng(x) { return (x - CAL_B) / CAL_A; }
  function localToLat(y) { return (y - CAL_D) / CAL_C; }

  // ---- Red vial: una sola geometria de lineas fusionada (19 mil tramos,
  // asi que se combina TODO en un unico BufferGeometry por rendimiento) ----
  let rawEdgesData = null;
  let currentRoadMeshes = []; // [lines, roadMesh] para poder quitarlos y reconstruir
  function buildRoads(edges, boxFilter) {
    currentRoadMeshes.forEach(m => { sceneRoot.remove(m); m.geometry.dispose(); });
    currentRoadMeshes = [];
    if (boxFilter) {
      edges = edges.filter(([kind, pts]) => {
        const mid = pts[Math.floor(pts.length / 2)];
        const p = toScene(mid[0], mid[1]);
        return p.x >= boxFilter.xMin && p.x <= boxFilter.xMax && p.z >= boxFilter.zMin && p.z <= boxFilter.zMax;
      });
    }
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
    sceneRoot.add(lines);
    currentRoadMeshes.push(lines);

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
      const yJitter = 0.03 + ((edgeIdx * 2654435761) % 1000) / 1000 * 0.05;
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
    const ribbonMat = new THREE.MeshStandardMaterial({ clippingPlanes: sectionClipPlanesArr,
      map: viaTex, color: 0x9099a3, roughness: 0.85, side: THREE.DoubleSide,
      transparent: true, opacity: 0.7,
    });
    roadMat = ribbonMat;
    const roadMesh = new THREE.Mesh(ribbonGeo, ribbonMat);
    roadMesh.receiveShadow = true;
    sceneRoot.add(roadMesh);
    currentRoadMeshes.push(roadMesh);
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

  let rawBuildingsData = null;
  let currentBuildingMesh = null, currentBuildingEdgeMesh = null, currentBuildingCornerMesh = null;
  function buildBuildings(buildings, boxFilter) {
    if (currentBuildingMesh) { sceneRoot.remove(currentBuildingMesh); currentBuildingMesh.geometry.dispose(); }
    if (currentBuildingEdgeMesh) { sceneRoot.remove(currentBuildingEdgeMesh); currentBuildingEdgeMesh.geometry.dispose(); }
    if (currentBuildingCornerMesh) { sceneRoot.remove(currentBuildingCornerMesh); currentBuildingCornerMesh.geometry.dispose(); }
    const positions = [];
    const normals = [];
    const edgePositions = []; // solo el perimetro del techo (una linea nativa, se ve bien desde arriba)
    const cornerPositions = []; // esquinas verticales: geometria 3D real (mini-pared delgada), NO una linea nativa - las lineas nativas de WebGL tienen 1px fijo sin importar linewidth, y ademas se pueden "desaparecer" en angulos rasantes por z-fighting; una pared delgada de verdad se ve igual de gruesa siempre, sin importar el angulo
    const CORNER_THICK = 0.035; // grosor fijo de la mini-pared de esquina (muy delgado, pero real en 3D)
    buildings.forEach(b => {
      const pts = b.pts.map(p => toScene(p[0], p[1]));
      let h = b.h * SCALE;
      if (pts.length < 4) return; // huella degenerada
      if (boxFilter) {
        const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
        const cz = pts.reduce((s, p) => s + p.z, 0) / pts.length;
        if (cx < boxFilter.xMin || cx > boxFilter.xMax || cz < boxFilter.zMin || cz > boxFilter.zMax) return;
        if (h < boxFilter.yMin) return; // el edificio no alcanza ni la altura minima de la caja
        h = Math.min(h, boxFilter.yMax); // recorta la altura visible al maximo de la caja
      }
      // Paredes: un rectangulo (2 triangulos) por cada segmento del perimetro
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], c = pts[i + 1];
        const dx = c.x - a.x, dz = c.z - a.z;
        const len = Math.hypot(dx, dz) || 0.001;
        const nx = dz / len, nz = -dx / len; // normal horizontal de la pared (hacia afuera)
        positions.push(
          a.x, 0, a.z, c.x, 0, c.z, c.x, h, c.z,
          a.x, 0, a.z, c.x, h, c.z, a.x, h, a.z
        );
        for (let k = 0; k < 6; k++) normals.push(nx, 0, nz);
        edgePositions.push(a.x, h, a.z, c.x, h, c.z); // perimetro del techo
        // Esquina vertical como una mini-pared delgada real (2 caras
        // perpendiculares en cruz, para que se vea igual de gruesa
        // mirando desde CUALQUIER angulo, no solo una linea plana que
        // puede volverse invisible de canto):
        const t = CORNER_THICK;
        cornerPositions.push(
          a.x - nx * t, 0, a.z - nz * t, a.x + nx * t, 0, a.z + nz * t, a.x + nx * t, h, a.z + nz * t,
          a.x - nx * t, 0, a.z - nz * t, a.x + nx * t, h, a.z + nz * t, a.x - nx * t, h, a.z - nz * t
        );
      }

      // Techo plano simple (sin parapeto sintetico): las mallas REALES de
      // techo del modelo Rhino (techos a dos aguas y techos planos con
      // parapeto ya modelado) se cargan por separado y quedan encima de
      // esta tapa, dandole el detalle real. Tener ademas un parapeto
      // aproximado aqui hacia que ambas geometrias compitieran/se vieran
      // mal superpuestas.
      const pts2d = pts.map(p => new THREE.Vector2(p.x, p.z));
      let tris;
      try { tris = THREE.ShapeUtils.triangulateShape(pts2d, []); }
      catch (e) { tris = []; }
      // Respaldo: si la triangulacion real falla (poligono invalido o
      // auto-intersectado - 131 de los 243538 edificios tienen esto),
      // usar un abanico simple desde el primer vertice, para que el
      // edificio SIEMPRE tenga techo (sin esto quedaba con la parte de
      // arriba abierta, viendose "transparente"/hueco desde la axonometria).
      if (tris.length === 0 && pts2d.length >= 3) {
        for (let i = 1; i < pts2d.length - 1; i++) tris.push([0, i, i + 1]);
      }
      tris.forEach(([ia, ib, ic]) => {
        positions.push(
          pts[ia].x, h, pts[ia].z, pts[ib].x, h, pts[ib].z, pts[ic].x, h, pts[ic].z
        );
        for (let k = 0; k < 3; k++) normals.push(0, 1, 0);
      });
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    const mat = new THREE.MeshStandardMaterial({ clippingPlanes: sectionClipPlanesArr, color: 0xffffff, roughness: 0.6, metalness: 0.03, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    sceneRoot.add(mesh);
    currentBuildingMesh = mesh;

    // Borde oscuro del perimetro del techo (linea nativa, funciona bien
    // vista desde arriba, sin el problema de "desaparecer" en angulos
    // rasantes que si afecta a las verticales).
    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute("position", new THREE.Float32BufferAttribute(edgePositions, 3));
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x2b2e33, transparent: true, opacity: 0.35 });
    buildingEdgeMat = edgeMat;
    const edgeMesh = new THREE.LineSegments(edgeGeo, edgeMat);
    sceneRoot.add(edgeMesh);
    currentBuildingEdgeMesh = edgeMesh;

    // Esquinas verticales: geometria 3D real (no lineas), para que el
    // grosor se vea SIEMPRE igual sin importar el angulo de camara, y
    // nunca desaparezcan.
    const cornerGeo = new THREE.BufferGeometry();
    cornerGeo.setAttribute("position", new THREE.Float32BufferAttribute(cornerPositions, 3));
    cornerGeo.computeVertexNormals();
    const cornerMat = new THREE.MeshBasicMaterial({ color: 0x2b2e33, transparent: true, opacity: 0.55, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    const cornerMesh = new THREE.Mesh(cornerGeo, cornerMat);
    sceneRoot.add(cornerMesh);
    currentBuildingCornerMesh = cornerMesh;
  }

  function loadBuildings() {
    return fetch(BUILDINGS_URL)
      .then(r => { if (!r.ok) throw new Error("no se pudo cargar " + BUILDINGS_URL); return r.json(); })
      .then(data => { rawBuildingsData = data; buildBuildings(rawBuildingsData, null); rebuildFilteredGeometry(); })
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
  let treeMesh = null;
  function buildTrees(trees) {
    const treeTex = new THREE.TextureLoader().load("./assets/arbol_real4.png");
    // Tarjeta plana (billboard) con la foto real completa (ya incluye
    // tronco y copa) — se pidio que se vea igual que la foto, no un
    // volumen 3D armado con esfera+cilindro por separado.
    const planeGeo = makePlaneGeometry();
    const mat = new THREE.MeshStandardMaterial({
      clippingPlanes: sectionClipPlanesArr, map: treeTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.95,
    });
    const mesh = new THREE.InstancedMesh(planeGeo, mat, trees.length);
    mesh.castShadow = false;
    treeMesh = mesh;

    treeInstanceData = new Array(trees.length);
    const colorAlimento1 = new THREE.Color(0xff5fa8); // Cerezo
    const colorAlimento2 = new THREE.Color(0xb06bff); // Sauco
    const colorDescanso = new THREE.Color(0x25d0a0);  // Urapan
    const colorNormal = new THREE.Color(0xffffff);
    
    // InstancedBufferAttribute needed to apply instanceColor
    const colors = new Float32Array(trees.length * 3);
    for (let i = 0; i < trees.length; i++) {
       colors[i*3] = 1; colors[i*3+1] = 1; colors[i*3+2] = 1;
    }
    mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    
    trees.forEach((t, i) => {
      const [x, y, hMeters, especieStr, code] = t;
      const p = toScene(x, y);
      const h = Math.max(0.3, hMeters * SCALE);
      const w = h * (1.1 + (hash2(code) % 20) / 100 - 0.1);
      treeInstanceData[i] = { x: p.x, z: p.z, w, h };
      
      let c = colorNormal;
      if (especieStr) {
        const lower = especieStr.toLowerCase();
        if (lower.includes("fresno") || lower.includes("urapan") || lower.includes("urap")) c = colorDescanso;
        else if (lower.includes("cerezo") || lower.includes("capul")) c = colorAlimento1;
        else if (lower.includes("sauco") || lower.includes("saco") || lower.includes("saúco")) c = colorAlimento2;
      }
      mesh.setColorAt(i, c);
    });
    mesh.instanceColor.needsUpdate = true;
    sceneRoot.add(mesh);
    treeMeshes = [{ mesh, data: trees }];
    rebuildBirds(); // ahora que ya hay datos reales de arboles, se reconstruyen las mirlas con sus atractores correctos
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
      .then(data => { buildTrees(data); })
      .catch(err => console.warn("No se pudieron cargar los árboles:", err));
  }

  // ============================================================
  // MAPA DE RUIDO EN VIVO (igual logica que modulo-08-3d.js, pero
  // acotado SOLO al area de la caja de seccion actual, no toda la
  // ciudad) + MIRLAS (Turdus fuscater), aves que se desplazan de oriente
  // ============================================================
  // MAPA DE RUIDO EN VIVO — IGUAL ESTÉTICA Y LÓGICA QUE modulo-08-3d.js
  // Manchas de intensidad alrededor de cada vehículo acumuladas con
  // "lighter" en un canvas texture y coloreadas suavemente de amarillo
  // a naranja y rojo, con alpha fijo (0.42) sobre la malla del suelo 3D,
  // recortada con la caja de sección (sectionClipPlanesArr).
  // ============================================================
  const NOISE_ALPHA = 0.42;
  const NOISE_BUF_W = 260, NOISE_BUF_H = 180; // misma resolucion que modulo-08-3d: mancha suave y continua
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
  let noiseFieldImg = null;

  function buildNoiseGround(bbox) {
    noiseOriginX = bbox[0]; noiseOriginY = bbox[1];
    noiseGroundW = bbox[2] - bbox[0]; noiseGroundH = bbox[3] - bbox[1];
    const c0 = toScene(bbox[0], bbox[1]), c1 = toScene(bbox[2], bbox[3]);
    const w = Math.abs(c1.x - c0.x), h = Math.abs(c1.z - c0.z);
    const geo = new THREE.PlaneGeometry(w, h);
    noiseTexture = new THREE.CanvasTexture(noiseBufCanvas);
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
    noiseMesh = mesh;
  }

  function rebuildNoiseGround() {
    // Si la caja de seccion cambia o se resetea, los clippingPlanes del renderer
    // ya cortan el plano de ruido de Three.js de forma exacta y automatica
  }

  const NOISE_VEH_RADIUS_M = 55;
  let lastNoiseCompute = 0;
  let noiseOn = true; // ruido visible siempre, sin boton

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

  const NOISE_DB_BASE = 40, NOISE_DB_SPAN = 52;
  function noiseDbAt(x, y) {
    if (!noiseFieldImg || !noiseGroundW) return NOISE_DB_BASE;
    const bx = Math.floor(((x - noiseOriginX) / noiseGroundW) * NOISE_BUF_W);
    const by = Math.floor(NOISE_BUF_H - ((y - noiseOriginY) / noiseGroundH) * NOISE_BUF_H);
    if (bx < 0 || by < 0 || bx >= NOISE_BUF_W || by >= NOISE_BUF_H) return NOISE_DB_BASE;
    const idx = (by * NOISE_BUF_W + bx) * 4;
    const raw = noiseFieldImg.data[idx + 3] / 255;
    const bright = (noiseFieldImg.data[idx] + noiseFieldImg.data[idx + 1] + noiseFieldImg.data[idx + 2]) / (3 * 255);
    if (raw < 0.01) return NOISE_DB_BASE;
    const t = 1 - bright;
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

  // ---- MIRLAS: adaptadas para volar SOLO dentro del area de la caja de
  // seccion actual (entran por el borde este del area visible, salen por
  // el oeste, refugio en la esquina noroeste del area visible) ----
  const BIRD_TREE_SPECIES = {
    "Sauco": { key: "sauco", color: 0xb06bff, weight: 1.0, base: 260 },
    "Cerezo, capuli": { key: "capuli", color: 0xff5fa8, weight: 0.76, base: 200 },
    "Urapán, Fresno": { key: "urapan", color: 0x25d0a0, weight: 0.52, base: 220 },
  };
  const BIRD_VISION = 14, BIRD_ARRIVE = 1.4, BIRD_WIND = 0.8, BIRD_MAX_SPEED = 2.4; // aun mas lento (antes 1.5/4.2)
  const BIRD_REST_SPEED = 1.0, BIRD_NOISE_DB = 60, BIRD_K_REP = 4.2, BIRD_COUNT = 50;
  let birds = [], birdTreesGrid = null, birdsGroup = null, birdOn = true;
  function sampleAttractorTrees(trees) {
    const porEspecie = {};
    trees.forEach(t => {
      let meta = null;
      if (t[3]) {
          const lower = t[3].toLowerCase();
          if (lower.includes("fresno") || lower.includes("urapan") || lower.includes("urap")) meta = BIRD_TREE_SPECIES["Urapán, Fresno"] || { key: "urapan", color: 0x25d0a0, weight: 0.52, base: 220 };
          else if (lower.includes("cerezo") || lower.includes("capul")) meta = BIRD_TREE_SPECIES["Cerezo, capuli"] || { key: "capuli", color: 0xff5fa8, weight: 0.76, base: 200 };
          else if (lower.includes("sauco") || lower.includes("saco") || lower.includes("saúco")) meta = BIRD_TREE_SPECIES["Sauco"] || { key: "sauco", color: 0xb06bff, weight: 1.0, base: 260 };
      }
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
  const BIRD_CELL = 25;
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
    const r = BIRD_VISION * 10;
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
    // sin trazos claros ni fondo): cuerpo pequeño en el centro y 2 alas
    // que suben o bajan segun "wingUp", para dar sensacion de aleteo.
    ctx.fillStyle = "#1a1c22";
    const wingY = wingUp ? -9 : 6; // punta del ala arriba o abajo
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
  let humedalTreesList = [];
  function makeBirdAgent(origen) {
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
  }
  let birdTexUp = null, birdTexDown = null; // 2 cuadros de aleteo (alas arriba/abajo), compartidos por todas las mirlas
  function rebuildBirds() {
    if (!currentBoxRealBounds) return;
    if (birdsGroup) { sceneRoot.remove(birdsGroup); birds = []; }
    const attractors = treeMeshes && treeMeshes[0] ? sampleAttractorTrees(treeMeshes[0].data) : [];
    birdTreesGrid = buildBirdTreeGrid(attractors);

    // Identificar árboles dentro o adyacentes al Humedal El Burro y su cuerpo de agua
    if (treeMeshes && treeMeshes[0]) {
      humedalTreesList = treeMeshes[0].data
        .filter(t => t[0] >= 6900 && t[0] <= 7800 && t[1] >= 2900 && t[1] <= 4050)
        .map(t => ({ x: t[0], y: t[1] }));
      if (humedalTreesList.length === 0) {
        humedalTreesList = attractors.filter(t => t.x >= 6900 && t.x <= 7800 && t.y >= 2900 && t.y <= 4050);
      }
    }

    birdsGroup = new THREE.Group();
    birdsGroup.visible = birdOn;
    birdTexUp = makeBirdSprite(true);
    birdTexDown = makeBirdSprite(false);
    const spriteMat = new THREE.SpriteMaterial({ map: birdTexUp, transparent: true, alphaTest: 0.15, depthWrite: false, depthTest: false }); // depthTest:false para que SIEMPRE se vean por encima de edificios/arboles, sin importar que tan "detras" quede en la profundidad real
    
    // Distribución: mirlas que nacen en árboles del humedal + mirlas del refugio + mirlas que entran desde oriente
    const humedalCount = Math.round(BIRD_COUNT * 0.40); // 40% en árboles del humedal
    const refugeCount = Math.round(BIRD_COUNT * 0.18);  // 18% refugio
    for (let i = 0; i < BIRD_COUNT; i++) {
      let origen = "oriente";
      if (i < humedalCount) origen = "humedal";
      else if (i < humedalCount + refugeCount) origen = "refugio";

      const b = makeBirdAgent(origen);
      const sprite = new THREE.Sprite(spriteMat.clone());
      sprite.scale.set(3.2, 3.2, 1);
      sprite.renderOrder = 999; // se dibuja al final, despues de todo lo demas, para que nunca quede tapado
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
      // Aleteo: se alterna entre las 2 texturas (alas arriba/abajo) segun
      // la fase de vuelo de cada ave, para que se vea que mueve las alas.
      const nuevaTex = Math.sin(b.phase) > 0 ? birdTexUp : birdTexDown;
      if (b.sprite.material.map !== nuevaTex) { b.sprite.material.map = nuevaTex; b.sprite.material.needsUpdate = true; }
    });
  }

  // ---- Cuerpos de agua: poligonos planos (fan de triangulos) apenas
  // levantados del suelo, con un material azul semi-transparente. ----
  let waterTexRef = null; // referencia para animar el desplazamiento de la textura (efecto de agua en movimiento)
  let waterBumpRef = null; // capa de relieve (bump), animada a otra velocidad para el efecto de oleaje

  function buildWaterBodies(bodies) {
    const positions = [];
    const uvs = [];
    const UV_SCALE = 0.08; // repite la textura cada ~12.5 unidades de escena
    bodies.forEach(w => {
      if (!(w.nombre || "").includes("Burro")) return; // USER REQUEST: Remove dark blue patches (other water bodies)
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
    // "plana"/pintada, no renderizada. Se anima a una velocidad y escala
    // DISTINTA a la capa de color, para que el patron no se repita igual
    // y parezca mas organico (dos capas de oleaje superpuestas).
    const bumpTex = new THREE.TextureLoader().load("./assets/textura_agua2.jpg");
    bumpTex.wrapS = THREE.RepeatWrapping;
    bumpTex.wrapT = THREE.RepeatWrapping;
    bumpTex.repeat.set(2.3, 2.3);
    waterBumpRef = bumpTex;
    // Agua con la textura real que subio el usuario, SIN tinte de color
    // dominando encima (blanco = la textura se ve tal cual es), solo con
    // brillo bajo para que capte reflejos de luz como agua real.
    const mat = new THREE.MeshStandardMaterial({ clippingPlanes: sectionClipPlanesArr,
      map: waterTex, bumpMap: bumpTex, bumpScale: 0.12,
      color: 0x8f9498, roughness: 0.18, metalness: 0.15,
      transparent: true, opacity: 0.82, side: THREE.DoubleSide,
    });
    waterMat = mat;
    const waterMesh = new THREE.Mesh(geo, mat);
    waterMesh.receiveShadow = false; // sin sombras encima (se veian como parches/bloques feos sobre el agua)
    sceneRoot.add(waterMesh);
  }

  let rawWaterData = null;
  function loadWaterBodies() {
    return fetch(WATER_URL)
      .then(r => { if (!r.ok) throw new Error("no se pudo cargar " + WATER_URL); return r.json(); })
      .then(data => { rawWaterData = data; buildWaterBodies(data); placeSectionCutAtHumedal(); resizeSectionView(); })
      .catch(err => console.warn("No se pudieron cargar los cuerpos de agua:", err));
  }

  // ---- Manzanas: solo el CONTORNO (LineSegments), no un poligono relleno.
  // Se dibuja como lineas delgadas, igual que la capa base de la red vial,
  // para evitar por completo el riesgo de parpadeo (z-fighting) que si
  // tendria una superficie rellena compitiendo con vias/agua a alturas
  // parecidas. Altura propia (0.006) distinta de todo lo demas. ----
  let manzanasMesh = null;
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
    manzanasMesh = new THREE.LineSegments(geo, mat);
    sceneRoot.add(manzanasMesh);
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
  let rawParquesData = null;
  function buildParques(parques) {
    rawParquesData = parques;
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
    const mat = new THREE.MeshStandardMaterial({ clippingPlanes: sectionClipPlanesArr, map: pastoTex, color: 0xadaa90, roughness: 0.95, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    parqueMat = mat;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    sceneRoot.add(mesh);
  }

  function loadParques() {
    return fetch(PARQUES_URL)
      .then(r => { if (!r.ok) throw new Error("no se pudo cargar " + PARQUES_URL); return r.json(); })
      .then(data => { rawParquesData = data; buildParques(data); })
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
    const poleMat = new THREE.MeshStandardMaterial({ clippingPlanes: sectionClipPlanesArr, color: 0x33383d, roughness: 0.6 });
    const headGeo = new THREE.BoxGeometry(0.16, 0.42, 0.16);
    const headMat = new THREE.MeshStandardMaterial({ clippingPlanes: sectionClipPlanesArr, color: 0x1c1f22, roughness: 0.5 });
    const lightGeo = new THREE.CircleGeometry(0.06, 10);
    const lightColors = [0xe14b3f, 0xe8b93f, 0x4bb35a];

    let poleCount = 0;
    intersections.forEach(inter => (poleCount += Math.min(inter.dirs.length, 4)));
    const poleMesh = new THREE.InstancedMesh(poleGeo, poleMat, poleCount);
    const headMesh = new THREE.InstancedMesh(headGeo, headMat, poleCount);
    poleMesh.castShadow = true; headMesh.castShadow = true;
    const lightMeshes = lightColors.map(color =>
      new THREE.InstancedMesh(lightGeo, new THREE.MeshBasicMaterial({ clippingPlanes: sectionClipPlanesArr, color }), poleCount)
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
    const crossMat = new THREE.MeshBasicMaterial({ clippingPlanes: sectionClipPlanesArr, color: 0xffffff, side: THREE.DoubleSide });
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
    const mat = new THREE.MeshStandardMaterial({ clippingPlanes: sectionClipPlanesArr, color, roughness: 0.75, metalness: 0.02, side: THREE.DoubleSide, ...opts });
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
  const vehMat = new THREE.MeshStandardMaterial({ clippingPlanes: sectionClipPlanesArr, color: 0xe2635a, roughness: 0.5, metalness: 0.15 });
  const vehGeo = new THREE.BoxGeometry(0.18, 0.15, 0.45);
  const vehInstanced = new THREE.InstancedMesh(vehGeo, vehMat, VEH_POOL_SIZE);
  vehInstanced.count = 0;
  vehInstanced.castShadow = true;
  sceneRoot.add(vehInstanced);
  const dummy = new THREE.Object3D();

  let timesteps = [];
  let playing = true; // la simulacion corre sola desde que abre el modulo
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
  }

  function finishLoadingTimesteps() {
    const totalTime = timesteps.length ? timesteps[timesteps.length - 1].time : 0;
    slider.max = String(Math.round(totalTime));
    slider.disabled = false;
    playBtn.disabled = false;
    setStatus("", false);
    timeLabel.textContent = `00:00 / ${fmtTime(totalTime)}`;
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
        console.warn(err);
        setStatus("Red vial cargada. No se encontraron las trayectorias de vehículos (assets/kennedy_vehiculos.json).", true);
      });
  }

  fetch(NET_URL)
    .then(r => { if (!r.ok) throw new Error("no se pudo cargar " + NET_URL); return r.json(); })
    .then(data => {
      netCenter = { x: (data.bbox[0] + data.bbox[2]) / 2, y: (data.bbox[1] + data.bbox[3]) / 2 };
      buildGround(data.bbox);
      buildNoiseGround(data.bbox);
      rawEdgesData = data.edges;
      buildRoads(rawEdgesData, null);
      const w = (data.bbox[2] - data.bbox[0]) * SCALE;
      const h = (data.bbox[3] - data.bbox[1]) * SCALE;
      sceneExtentW = w; sceneExtentH = h;
      if (typeof updateSectionBox === "function") updateSectionBox();
      rebuildFilteredGeometry();
      viewSize = Math.max(w, h) * 0.135; // restaurado al valor original
      resize();
      setAxonometricView(w);
      setStatus("Red cargada. Cargando edificios y trayectorias de vehículos…");
      loadBuildings();
      loadTrees();
      loadWaterBodies();
      loadManzanas();
      loadParques();
      // loadIntersections(); // quitado: semaforos/cruces peatonales, a pedido del usuario
      loadTriMesh("./assets/kennedy_roofs_flat.json", 0xffffff);    // techos planos con parapeto ya modelado
      loadTriMesh("./assets/kennedy_facades.json", 0xa05a41);       // fachadas verificadas con StreetView
      // loadTerrain(); // quitado a pedido del usuario, vuelve al plano liso
      return loadVehicles();
    })
    .catch(err => {
      console.error(err);
      setStatus("No se pudo cargar la red vial (assets/kennedy_net.json). Revisa que el archivo esté disponible.");
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

  // ---- Vista axonometrica fija: 45 grados de elevacion (bloqueado en
  // los controles) y 45 grados de acimut, proyeccion en paralelo (sin
  // fuga de perspectiva). ----
  function setAxonometricView(distance) {
    // Vista inicial fija que el usuario dejo lista (mismo objetivo, azimut
    // y distancia que su vista anterior a 45°, pero recalculada a 35° de
    // elevacion, que es el angulo que pidio para este modulo).
    camera.position.set(-389.40, 559.68, 542.58);
    controls.target.set(218.76, -53.06, -86.62);
    camera.zoom = 1.9;
    camera.updateProjectionMatrix();
    // Centrar en el area de estudio (caja de seccion) con el mismo angulo,
    // y ajustar el zoom para que el rombo completo quepa sin cortarse.
    try {
      const halfW = sceneExtentW / 2 * 1.4, halfH = sceneExtentH / 2 * 1.4;
      const x0 = -halfW + (parseFloat(secXMin.value) / 100) * (2 * halfW), x1 = -halfW + (parseFloat(secXMax.value) / 100) * (2 * halfW);
      const z0 = -halfH + (parseFloat(secZMin.value) / 100) * (2 * halfH), z1 = -halfH + (parseFloat(secZMax.value) / 100) * (2 * halfH);
      if (isFinite(x0) && isFinite(z0) && x1 > x0 && z1 > z0) {
        const off = camera.position.clone().sub(controls.target);
        controls.target.set((x0 + x1) / 2, controls.target.y, (z0 + z1) / 2);
        camera.position.copy(controls.target).add(off);
        camera.lookAt(controls.target);
        camera.zoom = 1.9; // tamaño original
        camera.updateProjectionMatrix(); camera.updateMatrixWorld();
        const v = new THREE.Vector3(); let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9;
        [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].forEach(([x, z]) => [-6, 0, 8].forEach(yy => { v.set(x, yy, z).project(camera); mnx = Math.min(mnx, v.x); mxx = Math.max(mxx, v.x); mny = Math.min(mny, v.y); mxy = Math.max(mxy, v.y); }));
        const ncx = (mnx + mxx) / 2, ncy = (mny + mxy) / 2;
        const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
        const shift = right.multiplyScalar(ncx * (camera.right - camera.left) / 2 / camera.zoom).add(up.multiplyScalar(ncy * (camera.top - camera.bottom) / 2 / camera.zoom));
        camera.position.add(shift); controls.target.add(shift);
        // si aun no cabe verticalmente, se reduce apenas el zoom (sin volverla diminuta)
        const span = Math.max((mxx - mnx) / 2, (mxy - mny) / 2);
        if (span > 0.94) camera.zoom = 2.6 * 0.94 / span;
        camera.updateProjectionMatrix();
      }
    } catch (e) { console.warn("No se pudo centrar la vista:", e); }
  }

  // ---- Botones de vista ----
  const viewResetBtn = document.getElementById("viewReset");
  if (viewResetBtn) viewResetBtn.addEventListener("click", () => setAxonometricView(400));
  document.getElementById("noiseToggleBtn").addEventListener("click", (e) => {
    noiseOn = !noiseOn;
    if (noiseMesh) noiseMesh.visible = noiseOn;
    e.target.classList.toggle("active", noiseOn);
    e.target.textContent = noiseOn ? "🔊 Ocultar ruido" : "🔊 Mostrar ruido";
  });
  document.getElementById("birdToggleBtn").addEventListener("click", (e) => {
    birdOn = !birdOn;
    if (birdsGroup) birdsGroup.visible = birdOn;
    e.target.textContent = birdOn ? "🐦 Ocultar mirlas" : "🐦 Mostrar mirlas";
  });

  // ---- Control del sol (mover las sombras) ----
  const sunAzInput = document.getElementById("sunAz"), sunElInput = document.getElementById("sunEl");
  const sunAzVal = document.getElementById("sunAzVal"), sunElVal = document.getElementById("sunElVal");
  function onSunChange() {
    sunAzimuth = parseFloat(sunAzInput.value);
    sunElevation = parseFloat(sunElInput.value);
    sunAzVal.textContent = sunAzimuth + "°";
    sunElVal.textContent = sunElevation + "°";
    updateSunPosition();
  }
  sunAzInput.addEventListener("input", onSunChange);
  sunElInput.addEventListener("input", onSunChange);

  // ---- Selectores de color en vivo (agua, vias, verde) ----
  const colorAgua = document.getElementById("colorAgua");
  const colorVia = document.getElementById("colorVia");
  const colorVerde = document.getElementById("colorVerde");
  const colorOutput = document.getElementById("colorOutput");
  function updateColorOutput() {
    colorOutput.value =
      `Agua:  ${colorAgua.value}\nVías:  ${colorVia.value}\nVerde: ${colorVerde.value}`;
  }
  colorAgua.addEventListener("input", () => {
    if (waterMat) waterMat.color.set(colorAgua.value);
    updateColorOutput();
  });
  colorVia.addEventListener("input", () => {
    if (roadMat) roadMat.color.set(colorVia.value);
    updateColorOutput();
  });
  colorVerde.addEventListener("input", () => {
    if (parqueMat) parqueMat.color.set(colorVerde.value);
    updateColorOutput();
  });
  updateColorOutput();

  // ---- Clic en un arbol: muestra su informacion (especie, altura) ----
  const raycaster = new THREE.Raycaster();
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
    } else {
      treeInfo.classList.remove("show");
    }
  });

  // ---- Loop de animacion ----

  // ---- Crecimiento del Humedal El Burro mes a mes (igual que en la
  // simulacion 3D), corriendo solo en la vista principal. Ahora con
  // controles reales: reproducir/pausar y arrastrar al mes que sea. ----
  let mainBurroMesh = null, mainBurroMes = 0, mainBurroLast = 0, mainBurroPlaying = true;
  const MESES_TXT = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const mainBurroPanel = document.createElement("div");
  mainBurroPanel.style.cssText = "position:absolute; bottom:18px; right:18px; z-index:12; width:230px; font-family:'Segoe UI',sans-serif; color:#0f172a; background:rgba(255,255,255,.94); backdrop-filter:blur(8px); border:1px solid rgba(0,0,0,.1); border-radius:10px; padding:10px 12px; box-shadow:0 8px 24px rgba(0,0,0,.12);";
  mainBurroPanel.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
      <span style="font:700 11px 'Segoe UI',sans-serif;">Humedal El Burro</span>
      <span id="mainBurroMesLbl" style="font:600 10.5px 'Segoe UI',sans-serif; color:#64748b;">—</span>
    </div>
    <input type="range" id="mainBurroSlider" min="1" max="12" value="1" step="1" style="width:100%; accent-color:#0369a1; margin:2px 0 7px; cursor:pointer;">
    <div style="display:flex; gap:10px; align-items:center;">
      <div style="flex:1;">
        <div style="display:flex; justify-content:space-between; font-size:9px; color:#64748b; margin-bottom:2px;">
          <span>Espejo de agua</span><span id="mainBurroPctLbl">—</span>
        </div>
        <div style="height:5px; border-radius:3px; background:#e2e8f0; overflow:hidden;">
          <div id="mainBurroBar" style="height:100%; width:0%; border-radius:3px; background:linear-gradient(90deg,#38bdf8,#0369a1); transition:width .3s cubic-bezier(.22,1,.36,1);"></div>
        </div>
      </div>
      <div style="text-align:right; flex:none;">
        <div id="mainBurroHaLbl" style="font-size:14px; font-weight:800;">—</div>
        <div style="font-size:8px; color:#64748b;">hectáreas</div>
      </div>
    </div>
    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:7px;">
      <span id="mainBurroSeasonLbl" style="font-size:9.5px; color:#475569;">—</span>
      <button type="button" id="mainBurroPlayBtn" style="font-size:10px; font-weight:700; color:#0369a1; background:#eaf4fb; border:1px solid rgba(3,105,161,.25); border-radius:6px; padding:3px 8px; cursor:pointer;">⏸ Pausar</button>
    </div>
  `;
  (document.getElementById("sceneWrap") || document.body).appendChild(mainBurroPanel);
  const mainBurroSlider = mainBurroPanel.querySelector("#mainBurroSlider");
  const mainBurroPlayBtn = mainBurroPanel.querySelector("#mainBurroPlayBtn");
  const mainBurroMesLbl = mainBurroPanel.querySelector("#mainBurroMesLbl");
  const mainBurroSeasonLbl = mainBurroPanel.querySelector("#mainBurroSeasonLbl");
  const mainBurroPctLbl = mainBurroPanel.querySelector("#mainBurroPctLbl");
  const mainBurroBar = mainBurroPanel.querySelector("#mainBurroBar");
  const mainBurroHaLbl = mainBurroPanel.querySelector("#mainBurroHaLbl");
  function applyMainBurroMes(mes) {
    if (!rawWaterData || !waterMat) return;
    mainBurroMes = mes;
    const b = rawWaterData.find(w => (w.nombre || "").includes("Burro")); if (!b || !b.pts) return;
    const d = HUMEDAL_CICLO[mainBurroMes - 1]; if (!d) return;
    const cx = b.pts.reduce((s, p) => s + p[0], 0) / b.pts.length, cy = b.pts.reduce((s, p) => s + p[1], 0) / b.pts.length;
    const realOffsetPts = offsetPoly(b.pts, d.expansion_pct * 0.9); // borde real (metros) segun la epoca
    const pts = realOffsetPts.map(p => toScene(p[0], p[1]));
    let tris = []; try { tris = THREE.ShapeUtils.triangulateShape(pts.map(p => new THREE.Vector2(p.x, p.z)), []); } catch (e) {}
    const pos = [], uv = [];
    tris.forEach(t => t.forEach(i => { pos.push(pts[i].x, 0.03, pts[i].z); uv.push(pts[i].x * 0.08, pts[i].z * 0.08); }));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); geo.computeVertexNormals();
    if (mainBurroMesh) { sceneRoot.remove(mainBurroMesh); mainBurroMesh.geometry.dispose(); }
    mainBurroMesh = new THREE.Mesh(geo, waterMat); sceneRoot.add(mainBurroMesh);
    const lluvia = [3, 4, 5, 10, 11].includes(mainBurroMes);
    setLluviaActiva(lluvia); // la deteccion de temporada ya existia, pero nunca se habia conectado a un efecto visual real -- se conecta aqui mismo, en la MISMA funcion que ya anima la expansion del humedal, para que lluvia y expansion corran siempre juntas, nunca una despues de la otra
    // area real (hectareas) del borde ya calculado arriba, en coordenadas reales (metros)
    let area2 = 0;
    for (let i = 0; i < realOffsetPts.length; i++) {
      const [x1, y1] = realOffsetPts[i], [x2, y2] = realOffsetPts[(i + 1) % realOffsetPts.length];
      area2 += x1 * y2 - x2 * y1;
    }
    const areaHa = Math.abs(area2) / 2 / 10000;
    mainBurroMesLbl.textContent = MESES_TXT[mainBurroMes - 1];
    mainBurroSeasonLbl.textContent = lluvia ? "Temporada de lluvias" : "Temporada seca";
    mainBurroPctLbl.textContent = `+${d.expansion_pct.toFixed(1)}%`;
    mainBurroBar.style.width = Math.min(100, d.expansion_pct / 50 * 100) + "%";
    mainBurroHaLbl.textContent = areaHa.toFixed(2);
    if (mainBurroSlider.value != mainBurroMes) mainBurroSlider.value = String(mainBurroMes);
  }
  mainBurroSlider.addEventListener("input", () => {
    mainBurroPlaying = false;
    mainBurroPlayBtn.textContent = "▶ Reproducir";
    applyMainBurroMes(parseInt(mainBurroSlider.value, 10));
  });
  mainBurroPlayBtn.addEventListener("click", () => {
    mainBurroPlaying = !mainBurroPlaying;
    mainBurroPlayBtn.textContent = mainBurroPlaying ? "⏸ Pausar" : "▶ Reproducir";
    if (mainBurroPlaying) mainBurroLast = 0;
  });
  // ---- Lluvia real: se activa automaticamente en los meses de temporada
  // de lluvias reales de Bogota (bimodal: marzo-mayo y octubre-noviembre),
  // la MISMA logica que ya decidia el texto "Temporada de lluvias" --
  // ahora tambien dispara una animacion de lluvia de verdad. Gotas como
  // rayas alargadas (no puntos redondos, que se ven raros/artificiales),
  // cayendo a distintas velocidades para dar sensacion de profundidad,
  // visible tanto en la axonometria base como en la capa natural (ambas
  // vistas renderizan el mismo "scene", asi que un solo sistema alcanza
  // para las dos). ----
  let lluviaGroup = null, lluviaVel = null, lluviaActiva = false, lluviaVisible = true;
  function buildLluvia() {
    if (lluviaGroup) return;
    // Calibrado a la escala REAL de la escena (SCALE=0.1, ciudad de unos
    // ~1070 unidades de ancho) -- la primera version uso un radio y un
    // area de spawn pensados para una escena mucho mas grande, asi que
    // las gotas eran casi invisibles (demasiado chicas y demasiado
    // dispersas respecto a lo que la camara realmente encuadra).
    const COUNT = 1200;
    const RADIO = 320; // acotado al area que la camara de la axonometria realmente encuadra (antes 650, caia fuera de cuadro)
    const ALTO_MAX = 70, ALTO_MIN = 4; // igual, acotado -- antes 15-180 quedaba por encima de lo visible en esta vista
    const geo = new THREE.CylinderGeometry(0.4, 0.4, 7, 5, 1);
    const mat = new THREE.MeshBasicMaterial({ color: 0xbfe0f2, transparent: true, opacity: 0.6, depthWrite: false, depthTest: false });
    lluviaGroup = new THREE.InstancedMesh(geo, mat, COUNT);
    lluviaGroup.renderOrder = 997; // para que no quede tapada por el terreno/edificios ya dibujados
    lluviaVel = new Float32Array(COUNT);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < COUNT; i++) {
      dummy.position.set((Math.random() - 0.5) * RADIO * 2, Math.random() * (ALTO_MAX - ALTO_MIN) + ALTO_MIN, (Math.random() - 0.5) * RADIO * 2);
      dummy.rotation.set(0.12, 0, 0.07); // ligera inclinacion, como viento leve -- cayendo perfectamente recto se ve artificial
      dummy.updateMatrix();
      lluviaGroup.setMatrixAt(i, dummy.matrix);
      lluviaVel[i] = 55 + Math.random() * 40;
    }
    lluviaGroup.visible = false;
    sceneRoot.add(lluviaGroup);
  }
  function setLluviaActiva(activa) {
    lluviaActiva = activa;
    if (activa) buildLluvia();
    if (lluviaGroup) lluviaGroup.visible = activa && lluviaVisible;
  }
  const lluviaDummy = new THREE.Object3D();
  function updateLluvia(dt) {
    if (!lluviaActiva || !lluviaGroup || !lluviaGroup.visible) return;
    for (let i = 0; i < lluviaVel.length; i++) {
      lluviaGroup.getMatrixAt(i, lluviaDummy.matrix);
      lluviaDummy.matrix.decompose(lluviaDummy.position, lluviaDummy.quaternion, lluviaDummy.scale);
      lluviaDummy.position.y -= lluviaVel[i] * dt;
      if (lluviaDummy.position.y < 4) {
        lluviaDummy.position.y = 65 + Math.random() * 5; // igual al nuevo ALTO_MAX de buildLluvia
        lluviaDummy.position.x = (Math.random() - 0.5) * 640; // igual al nuevo RADIO*2
        lluviaDummy.position.z = (Math.random() - 0.5) * 640;
      }
      lluviaDummy.rotation.set(0.12, 0, 0.07);
      lluviaDummy.updateMatrix();
      lluviaGroup.setMatrixAt(i, lluviaDummy.matrix);
    }
    lluviaGroup.instanceMatrix.needsUpdate = true;
  }
  let lluviaLastT = 0;

  function updateMainBurro(now) {
    if (!mainBurroPlaying) return;
    if (mainBurroLast && now - mainBurroLast < 2600) return;
    mainBurroLast = now;
    applyMainBurroMes((mainBurroMes % 12) + 1);
  }

  // ---- Pantalla de las 3 escalas: simulaciones corriendo en vivo y suaves
  // (carros, ruido, mirlas y el agua del humedal) encima de cada
  // axonometria, sin repetir edificios ni terreno. ----
  let liveEscalasLast = 0;
  function updateLiveEscalas(now) {
    const ov = document.getElementById("explodeOverlay");
    if (!ov || ov.style.display === "none" || ov.style.display === "") return;
    const busy = ["naturalExplodeOverlay", "culturalExplodeOverlay", "techExplodeOverlay"].some(id => { const e = document.getElementById(id); return e && e.style.display && e.style.display !== "none"; });
    if (busy || now - liveEscalasLast < 110) return;
    liveEscalasLast = now;
    const hide = [currentBuildingMesh, currentBuildingEdgeMesh, currentBuildingCornerMesh, manzanasMesh, terrainMesh, axoBorderMesh, treeMeshes && treeMeshes[0] ? treeMeshes[0].mesh : null, ...currentRoadMeshes].filter(o => o && o.visible !== undefined);
    const prev = hide.map(o => o.visible); hide.forEach(o => { o.visible = false; });
    const pq = parqueMat ? parqueMat.opacity : null; if (parqueMat) parqueMat.opacity = 0;
    const bg = scene.background; scene.background = null; renderer.setClearColor(0x000000, 0);
    if (noiseMesh) noiseMesh.visible = true; if (birdsGroup) birdsGroup.visible = true;
    renderer.render(scene, camera);
    const src = renderer.domElement;
    document.querySelectorAll(".explode-clip").forEach(clip => {
      let cv = clip.querySelector("canvas.explode-live");
      if (!cv) { cv = document.createElement("canvas"); cv.className = "explode-live"; cv.style.cssText = "position:absolute; inset:0; width:100%; height:100%; pointer-events:none; z-index:4; opacity:.55;"; clip.appendChild(cv); }
      const r = clip.getBoundingClientRect(); if (!r.width) return;
      if (cv.width !== Math.round(r.width) || cv.height !== Math.round(r.height)) { cv.width = Math.round(r.width); cv.height = Math.round(r.height); }
      const c = cv.getContext("2d"); c.clearRect(0, 0, cv.width, cv.height);
      const s = Math.min(cv.width / src.width, cv.height / src.height), dw = src.width * s, dh = src.height * s; // igual que object-fit: contain de la foto
      c.drawImage(src, (cv.width - dw) / 2, (cv.height - dh) / 2, dw, dh);
    });
    hide.forEach((o, i) => { o.visible = prev[i]; }); if (parqueMat && pq !== null) parqueMat.opacity = pq;
    scene.background = bg; renderer.setClearColor(0x000000, 1);
    if (noiseMesh) noiseMesh.visible = noiseOn; if (birdsGroup) birdsGroup.visible = birdOn;
  }
  function animate(now) {
    requestAnimationFrame(animate);
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
    if ((noiseOn || birdOn) && timesteps.length) computeLiveNoiseField(vehiclesAtTime(currentTime), now); // fuera del "if playing": el ruido se sigue viendo aunque este en pausa
    if (birdOn) updateBirds(now);
    updateMainBurro(now); // crecimiento del humedal, siempre corriendo
    const lluviaDt = lluviaLastT ? Math.min(0.05, (now - lluviaLastT) / 1000) : 0;
    lluviaLastT = now;
    updateLluvia(lluviaDt);
    // Lineas de borde de edificios: opacidad FIJA, no cambia con el zoom
    // (se pidio que no aparezcan/desaparezcan ni cambien de grosor al
    // acercar o alejar la camara).
    // Agua con movimiento: se desplaza lentamente la textura de color Y
    // la capa de relieve (bump) a velocidades/escalas DISTINTAS entre si,
    // simulando dos capas de oleaje superpuestas (asi el brillo/reflejo
    // cambia con el tiempo de forma organica, no un desfile en linea recta).
    if (waterTexRef) {
      waterTexRef.offset.x = (now * 0.000018) % 1;
      waterTexRef.offset.y = (now * 0.000012) % 1;
    }
    if (waterBumpRef) {
      waterBumpRef.offset.x = (now * -0.000027) % 1;
      waterBumpRef.offset.y = (now * 0.000021) % 1;
    }
    controls.update();
    if (sectionControls) sectionControls.update();
    renderer.render(scene, camera);
    if (sectionRenderer && sectionWrapEl2 && sectionWrapEl2.style.display !== "none") {
      // Lineas de edificios mas delgadas/livianas solo en el corte de
      // abajo (antes se habian pedido mas gruesas; ahora al reves),
      // sin afectar la axonometria de arriba.
      const prevEdgeOpacity = buildingEdgeMat ? buildingEdgeMat.opacity : null;
      if (buildingEdgeMat) buildingEdgeMat.opacity = 0.15;
      sectionRenderer.render(scene, sectionCamera);
      if (buildingEdgeMat && prevEdgeOpacity !== null) buildingEdgeMat.opacity = prevEdgeOpacity;
    }
    updateTechLiveMirror(); // si el panel de escala tecnologica esta abierto, "espeja" los carros y el ruido en vivo dentro de sus 2 subcapas (en vez de una foto fija)
  }
  // ---- Caja de seccion: 6 planos de recorte (X min/max, Y min/max, Z
  // min/max) para cortar el modelo y ver el interior, como una caja de
  // seccion de Rhino/Revit. Los planos se aplican de forma GLOBAL
  // (renderer.clippingPlanes), asi que afectan a todos los materiales sin
  // tener que tocar cada uno por separado. Los planos (secPlanes) ya se
  // crearon y activaron arriba, junto al renderer. ----
  const SECTION_Y_MAX = 10; // altura maxima considerada (unidades de escena)
  let sectionBoxActive = true; // activo desde el inicio: con los limites en 0-100% no corta nada visible, pero asi no hace falta darle clic a un boton aparte antes de mover los deslizadores
  const secXMin = document.getElementById("secXMin"), secXMax = document.getElementById("secXMax");
  const secYMin = document.getElementById("secYMin"), secYMax = document.getElementById("secYMax");
  const secZMin = document.getElementById("secZMin"), secZMax = document.getElementById("secZMax");
  const secXMinVal = document.getElementById("secXMinVal"), secXMaxVal = document.getElementById("secXMaxVal");
  const secYMinVal = document.getElementById("secYMinVal"), secYMaxVal = document.getElementById("secYMaxVal");
  const secZMinVal = document.getElementById("secZMinVal"), secZMaxVal = document.getElementById("secZMaxVal");
  const sectionBoxOutput = document.getElementById("sectionBoxOutput");
  
  const botRot = document.getElementById("botRot"), botRotVal = document.getElementById("botRotVal");
  const botXMin = document.getElementById("botXMin"), botXMinVal = document.getElementById("botXMinVal");
  const botXMax = document.getElementById("botXMax"), botXMaxVal = document.getElementById("botXMaxVal");
  const botYMin = document.getElementById("botYMin"), botYMinVal = document.getElementById("botYMinVal");
  const botYMax = document.getElementById("botYMax"), botYMaxVal = document.getElementById("botYMaxVal");
  const botZMin = document.getElementById("botZMin"), botZMinVal = document.getElementById("botZMinVal");
  const botZMax = document.getElementById("botZMax"), botZMaxVal = document.getElementById("botZMaxVal");
  const botBoxOutput = document.getElementById("botBoxOutput");

  function updateBotBox() {
    if(!botXMin) return;
    const halfW = sceneExtentW / 2 * 1.4, halfH = sceneExtentH / 2 * 1.4;
    const xMin = -halfW + (parseFloat(botXMin.value) / 100) * (2 * halfW);
    const xMax = -halfW + (parseFloat(botXMax.value) / 100) * (2 * halfW);
    const zMin = -halfH + (parseFloat(botZMin.value) / 100) * (2 * halfH);
    const zMax = -halfH + (parseFloat(botZMax.value) / 100) * (2 * halfH);
    const yMin = (parseFloat(botYMin.value) / 100) * SECTION_Y_MAX;
    const yMax = (parseFloat(botYMax.value) / 100) * SECTION_Y_MAX;
    const rot = botRot ? parseFloat(botRot.value) : 0;
    const rad = rot * Math.PI / 180;
    const ux = Math.cos(rad), uz = Math.sin(rad);
    const vx = -Math.sin(rad), vz = Math.cos(rad);
    
    if(botRotVal) botRotVal.textContent = rot + "°";
    botPlanes.xMin.normal.set(ux, 0, uz); botPlanes.xMin.constant = -xMin;
    botPlanes.xMax.normal.set(-ux, 0, -uz); botPlanes.xMax.constant = xMax;
    botPlanes.yMin.constant = -yMin;
    botPlanes.yMax.constant = yMax;
    botPlanes.zMin.normal.set(vx, 0, vz); botPlanes.zMin.constant = -zMin;
    botPlanes.zMax.normal.set(-vx, 0, -vz); botPlanes.zMax.constant = zMax;
    
    if(botXMinVal) botXMinVal.textContent = botXMin.value + "%"; 
    if(botXMaxVal) botXMaxVal.textContent = botXMax.value + "%";
    if(botYMinVal) botYMinVal.textContent = botYMin.value + "%"; 
    if(botYMaxVal) botYMaxVal.textContent = botYMax.value + "%";
    if(botZMinVal) botZMinVal.textContent = botZMin.value + "%"; 
    if(botZMaxVal) botZMaxVal.textContent = botZMax.value + "%";

    if (botBoxOutput && typeof sceneToReal === "function") {
      const r0 = sceneToReal(xMin, zMin), r1 = sceneToReal(xMax, zMax);
      let camStr = "";
      if (sectionCamera && sectionControls) {
        camStr = `\n--- Cámara Inferior ---\n` +
                 `Posición: ${sectionCamera.position.x.toFixed(1)}, ${sectionCamera.position.y.toFixed(1)}, ${sectionCamera.position.z.toFixed(1)}\n` +
                 `Mira hacia: ${sectionControls.target.x.toFixed(1)}, ${sectionControls.target.y.toFixed(1)}, ${sectionControls.target.z.toFixed(1)}\n` +
                 `Zoom: ${sectionCamera.zoom.toFixed(2)}`;
      }
      botBoxOutput.value =
        `Rotación: ${rot}°\n` +
        `U (a lo largo del giro): ${botXMin.value}% a ${botXMax.value}%\n` +
        `Y (altura, m): ${(yMin / SCALE).toFixed(1)} a ${(yMax / SCALE).toFixed(1)}\n` +
        `V (perpendicular): ${botZMin.value}% a ${botZMax.value}%\n` +
        `(referencia sin girar — real ${Math.round(Math.min(r0[0], r1[0]))} a ${Math.round(Math.max(r0[0], r1[0]))} / ${Math.round(Math.min(r0[1], r1[1]))} a ${Math.round(Math.max(r0[1], r1[1]))})` + camStr;
    }
  }

  [botRot, botXMin, botXMax, botYMin, botYMax, botZMin, botZMax].forEach(el => {
    if(el) el.addEventListener("input", () => { updateBotBox(); });
  });

  const botBoxCopy = document.getElementById("botBoxCopy");
  if (botBoxCopy && botBoxOutput) {
    botBoxCopy.addEventListener("click", () => {
      botBoxOutput.select();
      document.execCommand("copy");
      const old = botBoxCopy.innerHTML;
      botBoxCopy.innerHTML = "¡Copiado!";
      setTimeout(() => botBoxCopy.innerHTML = old, 1500);
    });
  }

const secRot = document.getElementById("secRot"), secRotVal = document.getElementById("secRotVal");
  function updateSectionBox() {
    const halfW = sceneExtentW / 2 * 1.4, halfH = sceneExtentH / 2 * 1.4; // mismo margen que el suelo (*1.4)
    const xMin = -halfW + (parseFloat(secXMin.value) / 100) * (2 * halfW);
    const xMax = -halfW + (parseFloat(secXMax.value) / 100) * (2 * halfW);
    const zMin = -halfH + (parseFloat(secZMin.value) / 100) * (2 * halfH);
    const zMax = -halfH + (parseFloat(secZMax.value) / 100) * (2 * halfH);
    const yMin = (parseFloat(secYMin.value) / 100) * SECTION_Y_MAX;
    const yMax = (parseFloat(secYMax.value) / 100) * SECTION_Y_MAX;
    // Rotacion de la caja: los 4 planos horizontales giran junto con un
    // angulo elegido, para poder alinear el corte con cualquier calle o
    // eje diagonal (no solo horizontal/vertical). El filtro geometrico
    // (mas abajo) se desactiva mientras haya rotacion -- el recorte por
    // shader (esto de aqui) sigue mostrando el corte real igual.
    const rot = secRot ? parseFloat(secRot.value) : 0;
    const rad = rot * Math.PI / 180;
    const ux = Math.cos(rad), uz = Math.sin(rad);
    const vx = -Math.sin(rad), vz = Math.cos(rad);
    if (secRotVal) secRotVal.textContent = rot + "°";
    if (sectionBoxActive) {
      secPlanes.xMin.normal.set(ux, 0, uz); secPlanes.xMin.constant = -xMin;
      secPlanes.xMax.normal.set(-ux, 0, -uz); secPlanes.xMax.constant = xMax;
      secPlanes.yMin.constant = -yMin;
      secPlanes.yMax.constant = yMax;
      secPlanes.zMin.normal.set(vx, 0, vz); secPlanes.zMin.constant = -zMin;
      secPlanes.zMax.normal.set(-vx, 0, -vz); secPlanes.zMax.constant = zMax;
    } else {
      // "Desactivar" no quita los planos del renderer (cambiar la
      // CANTIDAD de planos obliga a recompilar los materiales y el corte
      // deja de aplicarse hasta recargar) — en vez de eso, se alejan
      // muchisimo para que no corten nada visible, mantiendo siempre los
      // mismos 6 planos activos en el renderer.
      Object.values(secPlanes).forEach(p => (p.constant = 1e6));
    }
    secXMinVal.textContent = secXMin.value + "%"; secXMaxVal.textContent = secXMax.value + "%";
    secYMinVal.textContent = secYMin.value + "%"; secYMaxVal.textContent = secYMax.value + "%";
    secZMinVal.textContent = secZMin.value + "%"; secZMaxVal.textContent = secZMax.value + "%";
    // Coordenadas reales (mismo sistema que los archivos de datos), para
    // poder copiar y pegar la caja de seccion exacta.
    const r0 = sceneToReal(xMin, zMin), r1 = sceneToReal(xMax, zMax);
    currentBoxRealBounds = { // rango REAL (mismo sistema que los datos) de la caja actual, para que el ruido y las mirlas trabajen solo dentro de esta area, no en toda la ciudad
      xMin: Math.min(r0[0], r1[0]), xMax: Math.max(r0[0], r1[0]),
      yMin: Math.min(r0[1], r1[1]), yMax: Math.max(r0[1], r1[1]),
    };
    sectionBoxOutput.value =
      `Rotación: ${rot}°\n` +
      `X: ${secXMin.value}% a ${secXMax.value}%  (real ${Math.round(Math.min(r0[0],r1[0]))} a ${Math.round(Math.max(r0[0],r1[0]))})\n` +
      `Y (altura, m): ${(yMin / SCALE).toFixed(1)} a ${(yMax / SCALE).toFixed(1)}\n` +
      `Z: ${secZMin.value}% a ${secZMax.value}%  (real ${Math.round(Math.min(r0[1],r1[1]))} a ${Math.round(Math.max(r0[1],r1[1]))})\n` +
      `--- Cámara ---\n` +
      `Posición: ${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)}\n` +
      `Mira hacia: ${controls.target.x.toFixed(1)}, ${controls.target.y.toFixed(1)}, ${controls.target.z.toFixed(1)}\n` +
      `Zoom: ${camera.zoom.toFixed(2)}`;
    rebuildNoiseGround();
    rebuildBirds();
  }
  let lastRebuildAt = 0;
  [secXMin, secXMax, secYMin, secYMax, secZMin, secZMax, secRot].forEach(el => {
    if (!el) return;
    el.addEventListener("input", () => {
      updateSectionBox();
      const now = performance.now();
      if (now - lastRebuildAt > 150) { lastRebuildAt = now; rebuildFilteredGeometry(); }
    });
    el.addEventListener("change", () => { rebuildFilteredGeometry(); });
  });
  // Reconstruye de verdad la geometria de edificios y vias, dejando solo
  // lo que cae dentro de la caja de seccion (filtro geometrico real sobre
  // los datos originales) — esto se hace al SOLTAR el deslizador (evento
  // change), no en cada arrastre, porque reconstruir 143 mil edificios es
  // pesado. El recorte por planos de shader (arriba) tambien se deja
  // puesto por si acaso, pero este filtro geometrico es el que de verdad
  // garantiza el corte.
  function rebuildFilteredGeometry() {
    const halfW = sceneExtentW / 2 * 1.4, halfH = sceneExtentH / 2 * 1.4;
    const xMin = -halfW + (parseFloat(secXMin.value) / 100) * (2 * halfW);
    const xMax = -halfW + (parseFloat(secXMax.value) / 100) * (2 * halfW);
    const zMin = -halfH + (parseFloat(secZMin.value) / 100) * (2 * halfH);
    const zMax = -halfH + (parseFloat(secZMax.value) / 100) * (2 * halfH);
    const yMin = (parseFloat(secYMin.value) / 100) * SECTION_Y_MAX;
    const yMax = (parseFloat(secYMax.value) / 100) * SECTION_Y_MAX;
    const isFullRange = secXMin.value == 0 && secXMax.value == 100 && secYMin.value == 0 && secYMax.value == 100 && secZMin.value == 0 && secZMax.value == 100;
    const isRotated = secRot && parseFloat(secRot.value) !== 0;
    // Con rotacion distinta de 0, el filtro geometrico (axis-aligned) no
    // sirve para una caja girada -- se deja toda la geometria cargada y
    // el recorte por shader (arriba) es el que de verdad muestra el
    // corte girado.
    const mainBoxFilter = (sectionBoxActive && !isFullRange && !isRotated) ? { xMin, xMax, zMin, zMax, yMin, yMax } : null;
    if (mainBoxFilter) buildAxoBorder(xMin, xMax, zMin, zMax);
    else buildAxoBorder(-halfW, halfW, -halfH, halfH);
  }
  document.getElementById("sectionBoxToggle").addEventListener("click", (e) => {
    sectionBoxActive = !sectionBoxActive;
    e.target.classList.toggle("active", sectionBoxActive);
    e.target.textContent = sectionBoxActive ? "✂️ Desactivar caja de sección" : "✂️ Activar caja de sección";
    updateSectionBox();
    rebuildFilteredGeometry();
  });
  document.getElementById("sectionBoxReset").addEventListener("click", () => {
    secXMin.value = 58; secXMax.value = 67; secYMin.value = 0; secYMax.value = 100; secZMin.value = 39; secZMax.value = 54;
    if (secRot) secRot.value = 0;
    updateSectionBox();
    rebuildFilteredGeometry();
  });
  document.getElementById("sectionBoxCopy").addEventListener("click", async () => {
    updateSectionBox();
    try { await navigator.clipboard.writeText(sectionBoxOutput.value); } catch (err) {}
    sectionBoxOutput.select();
  });
  updateSectionBox();

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
  // quiera y copiar la vista completa (corte + camara).
  let lastCamOutputUpdate = 0;
  controls.addEventListener("change", () => {
    const now = performance.now();
    if (now - lastCamOutputUpdate < 100) return;
    lastCamOutputUpdate = now;
    updateSectionBox();
  });

  resize();
  resizeSectionView();
  requestAnimationFrame(animate);

  // ---- Explosion en 3 fotos identicas de la base: se captura el canvas
  // tal como se ve en ese momento (misma vista, mismos colores, sin
  // ningun cambio) y se muestra 3 veces apiladas en un overlay aparte,
  // sin tocar el layout de la base (para no repetir los problemas de
  // alineacion/zoom de intentos anteriores). ----
  const explodeOverlay = document.getElementById("explodeOverlay");
  const explodeImgs = [document.getElementById("explodeImg1"), document.getElementById("explodeImg2"), document.getElementById("explodeImg3")];
  const explodeLayers = document.querySelectorAll("#explodeStack .explode-layer");
  const explodeHint = document.getElementById("explodeHint");

  // ---- Herramienta de pluma: dibujar un poligono haciendo clic para ir
  // agregando vertices en la PANTALLA (dibujo 2D con SVG, no sobre el
  // terreno 3D), para poder dibujar libremente afuera del rombo tambien
  // - se sigue calculando lat/lng de cada punto (proyectando contra el
  // suelo) solo para el dato, no para la posicion visual del dibujo.
  let penActive = false;
  const penPoints = []; // {sx,sy} pixeles de pantalla + {x,y} coordenadas RAW calculadas
  const penSvg = document.getElementById("penSvgOverlay");
  const SVGNS = "http://www.w3.org/2000/svg";
  const penRaycaster = new THREE.Raycaster();
  const penNdc = new THREE.Vector2();
  const penCoordsOutput = document.getElementById("penCoordsOutput");

  // ---- Poligono fijo dado por el usuario (coordenadas reales exactas),
  // se dibuja en negro sobre el mapa y se recalcula su posicion en
  // pantalla cada vez que la camara se mueve, para que quede pegado al
  // lugar real que representa. ----
  const FIXED_POLYGON = [
    { x: 6543.2, y: 4141.8 },
    { x: 6533.1, y: 2808.1 },
    { x: 7888.4, y: 2808.6 },
    { x: 7858.7, y: 2775.8 },
    { x: 6497.1, y: 2773.1 },
    { x: 6508.8, y: 4106.2 },
  ];
  const fixedPolySvg = document.createElementNS(SVGNS, "polygon");
  fixedPolySvg.setAttribute("fill", "#0a0a0a");
  fixedPolySvg.setAttribute("stroke", "#0a0a0a");
  fixedPolySvg.setAttribute("stroke-width", "2.5");
  document.getElementById("fixedPolySvgOverlay").appendChild(fixedPolySvg);
  const fixedProjVec = new THREE.Vector3();
  function updateFixedPolygon() {
    const svgRect = document.getElementById("fixedPolySvgOverlay").getBoundingClientRect();
    const pts = FIXED_POLYGON.map(p => {
      const s = toScene(p.x, p.y);
      fixedProjVec.set(s.x, 0, s.z);
      fixedProjVec.project(camera);
      return `${(fixedProjVec.x * 0.5 + 0.5) * svgRect.width},${(-fixedProjVec.y * 0.5 + 0.5) * svgRect.height}`;
    }).join(" ");
    fixedPolySvg.setAttribute("points", pts);
  }
  controls.addEventListener("change", updateFixedPolygon);
  window.addEventListener("resize", updateFixedPolygon);

  // ---- Dibuja el mismo polígono de la axo principal proyectado sobre las 3 capas explotadas y ajusta el recorte ----
  function updateExplodePolygons() {
    const polySvgs = document.querySelectorAll(".explode-poly-svg");
    const origW = wrap.clientWidth;
    const origH = wrap.clientHeight;
    const pts = FIXED_POLYGON.map(p => {
      const s = toScene(p.x, p.y);
      fixedProjVec.set(s.x, 0, s.z);
      fixedProjVec.project(camera);
      return {
        x: (fixedProjVec.x * 0.5 + 0.5) * origW,
        y: (-fixedProjVec.y * 0.5 + 0.5) * origH
      };
    });

    const ptsAttr = pts.map(pt => `${pt.x.toFixed(2)},${pt.y.toFixed(2)}`).join(" ");

    polySvgs.forEach(svg => {
      // Usar exactamente la resolución capturada para que coincida con object-fit
      svg.setAttribute("viewBox", `0 0 ${origW} ${origH}`);
      // Y preserveAspectRatio debe ser xMidYMid meet (igual que object-fit: contain)
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      svg.innerHTML = "";
      const poly = document.createElementNS(SVGNS, "polygon");
      poly.setAttribute("points", ptsAttr);
      poly.setAttribute("fill", "none");
      poly.setAttribute("stroke", "#0a0a0a");
      poly.setAttribute("stroke-width", "3");
      svg.appendChild(poly);
    });
  }

  function screenToGround(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    penNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    penNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    penRaycaster.setFromCamera(penNdc, camera);
    const dir = penRaycaster.ray.direction, origin = penRaycaster.ray.origin;
    const t = (0 - origin.y) / dir.y; // interseccion con el plano Y=0 (nivel del suelo), solo para el dato de coordenadas
    const hit = origin.clone().add(dir.clone().multiplyScalar(t));
    return fromScene(hit.x, hit.z);
  }
  function redrawPenSvg() {
    penSvg.innerHTML = "";
    if (penPoints.length === 0) return;
    if (penPoints.length >= 2) {
      const pts = penPoints.map(p => `${p.sx},${p.sy}`).join(" ");
      const poly = document.createElementNS(SVGNS, "polygon"); // "polygon" (no "polyline") cierra la forma sola y permite rellenarla, como una herramienta de pluma normal
      poly.setAttribute("points", pts);
      poly.setAttribute("fill", "rgba(10,10,10,0.35)"); // forma rellena mientras se dibuja, como en Illustrator
      poly.setAttribute("stroke", "#0a0a0a");
      poly.setAttribute("stroke-width", "2.5");
      penSvg.appendChild(poly);
    }
    // Puntos visibles (circulos), para que se vea cada vertice aunque el
    // trazo entre 2 puntos sea corto - van DESPUES del poligono en el
    // DOM para quedar por encima y poder arrastrarlos. Cada uno se puede
    // arrastrar para reubicarlo despues de dibujado, por si quedo
    // desfigurado.
    penPoints.forEach((p, idx) => {
      const c = document.createElementNS(SVGNS, "circle");
      c.setAttribute("cx", p.sx); c.setAttribute("cy", p.sy); c.setAttribute("r", "6");
      c.setAttribute("fill", "#0a0a0a");
      c.style.pointerEvents = "auto";
      c.style.cursor = "move";
      c.addEventListener("pointerdown", (ev) => {
        ev.stopPropagation();
        draggingPenIdx = idx;
      });
      penSvg.appendChild(c);
    });
  }
  let draggingPenIdx = null;
  window.addEventListener("pointermove", (e) => {
    if (draggingPenIdx === null) return;
    const svgRect = penSvg.getBoundingClientRect();
    const sx = e.clientX - svgRect.left, sy = e.clientY - svgRect.top;
    const pt3d = screenToGround(e.clientX, e.clientY);
    penPoints[draggingPenIdx] = { sx, sy, x: pt3d.x, y: pt3d.y };
    redrawPenSvg();
    updatePenOutput();
  });
  function updatePenOutput() {
    if (penPoints.length === 0) { penCoordsOutput.style.display = "none"; return; }
    penCoordsOutput.style.display = "block";
    penCoordsOutput.value = penPoints.map((p, i) =>
      `Punto ${i + 1}: lat ${localToLat(p.y).toFixed(6)}, lng ${localToLng(p.x).toFixed(6)}  (local x:${p.x.toFixed(1)} y:${p.y.toFixed(1)})`
    ).join("\n");
  }
  document.getElementById("penToolBtn").addEventListener("click", () => {
    penActive = !penActive;
    const btn = document.getElementById("penToolBtn");
    btn.textContent = penActive ? "✏️ Dibujando… (clic para terminar)" : "✏️ Dibujar polígono";
    btn.style.background = penActive ? "rgba(255,45,85,.85)" : "rgba(10,12,14,.85)";
    penSvg.style.display = penActive ? "block" : "none";
    controls.enabled = !penActive; // mientras se dibuja, se desactiva rotar/zoom/mover la camara, para que el clic solo ponga puntos
    if (!penActive) { penPoints.length = 0; redrawPenSvg(); penCoordsOutput.style.display = "none"; }
  });
  let justDraggedPen = false;
  window.addEventListener("pointerup", () => {
    if (draggingPenIdx !== null) justDraggedPen = true;
    draggingPenIdx = null;
  });
  window.addEventListener("click", (e) => {
    if (!penActive) return;
    if (justDraggedPen) { justDraggedPen = false; return; } // si el clic fue el final de arrastrar un punto existente, no agregar uno nuevo
    const pt3d = screenToGround(e.clientX, e.clientY);
    const svgRect = penSvg.getBoundingClientRect(); // el SVG esta dentro de .main (corrido por el menu lateral), asi que hay que restar su propio origen, no usar las coordenadas de toda la ventana directamente
    penPoints.push({ sx: e.clientX - svgRect.left, sy: e.clientY - svgRect.top, x: pt3d.x, y: pt3d.y });
    redrawPenSvg();
    updatePenOutput();
  });
  // ---- Panel del corte: rotacion y coordenadas en vivo ----
  const sectionRot = document.getElementById("sectionRot");
  const sectionRotVal = document.getElementById("sectionRotVal");
  const sectionStraightenBtn = document.getElementById("sectionStraightenBtn");
  const sectionCoordsOutput = document.getElementById("sectionCoordsOutput");
  let sectionRotAngle = 54; // rotacion inicial del corte

  function updateSectionCutRotation() {
    if (!sectionRenderer || sectionCutZ == null) return;
    const rad = sectionRotAngle * Math.PI / 180;
    const nx = Math.cos(rad), nz = Math.sin(rad);
    sectionCutPlane.normal.set(nx, 0, nz);
    sectionCutPlane.constant = -(nx * sectionCutX + nz * sectionCutZ);
    
    // Removemos el reseteo de camara indeseado aqui
    // Actualizar coordenadas mostradas
    if (sectionCoordsOutput) {
      sectionCoordsOutput.value =
        `Rotación: ${sectionRotAngle}°\n` +
        `U (a lo largo): 46% a 63%\n` +
        `Y (altura, m): 0.0 a 100.0\n` +
        `V (perpendicular): 12% a 30%\n` +
        `--- Cámara ---\n` +
        `Posición: ${sectionCamera.position.x.toFixed(1)}, ${sectionCamera.position.y.toFixed(1)}, ${sectionCamera.position.z.toFixed(1)}\n` +
        `Mira hacia: ${sectionCutX.toFixed(1)}, 5.5, ${sectionCutZ.toFixed(1)}\n` +
        `Zoom: ${(sectionCamera.zoom || 1).toFixed(2)}`;
    }
  }
  if (sectionRot) {
    sectionRot.addEventListener("input", () => {
      sectionRotAngle = parseFloat(sectionRot.value);
      if (sectionRotVal) sectionRotVal.textContent = sectionRotAngle + "°";
      updateSectionCutRotation();
    });
  }
  if (sectionStraightenBtn) {
    sectionStraightenBtn.addEventListener("click", () => {
      sectionRotAngle = 0;
      if (sectionRot) sectionRot.value = 0;
      if (sectionRotVal) sectionRotVal.textContent = "0°";
      updateSectionCutRotation();
    });
  }

  const EXPLODE_LAYERS = [
    { name: "Sistema Hídrico", live: true },
    { name: "Vegetación", live: false },
    { name: "Aves / Fauna", live: true },
    { name: "Conectividad vial", live: true },
    { name: "Memoria histórica", live: false },
    { name: "Cerramiento de borde", live: false },
    { name: "Recorrido pedagógico", live: false },
    { name: "Fricción vial (SOT)", live: true },
    { name: "Red vial y tráfico", live: true },
    { name: "Simulación de ruido", live: true },
    { name: "Inundación y movilidad", live: true },
    { name: "Alcantarillado", live: false },
  ];
  let explodeStep = 0; // 1..12 = cada una de las 12 capas, sin agrupar por escala ni pantalla intermedia
  const explodeLabelEl = document.createElement("div");
  explodeLabelEl.id = "explodeStepLabel";
  explodeLabelEl.style.cssText = "position:absolute; top:18px; left:50%; transform:translateX(-50%); z-index:9; font:600 11.5px 'Segoe UI',sans-serif; color:#fff; background:rgba(17,20,24,.82); padding:6px 14px; border-radius:999px; pointer-events:none; display:none;";
  wrap.appendChild(explodeLabelEl);
  // Animacion generica de "sube y se asienta": el objeto aparece elevado
  // sobre el territorio y baja hasta su posicion real, igual que las
  // capas explotadas de antes (pero ahora en vivo, sobre la escena real).
  function riseAndSettle(obj, liftHeight, duration) {
    if (!obj) return;
    liftHeight = liftHeight || 22; duration = duration || 900;
    obj.visible = true;
    const restY = obj.userData.__restY != null ? obj.userData.__restY : obj.position.y;
    obj.userData.__restY = restY;
    const start = performance.now();
    obj.position.y = restY + liftHeight;
    (function step(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubico
      obj.position.y = restY + liftHeight * (1 - eased);
      if (t < 1) requestAnimationFrame(step);
      else obj.position.y = restY;
    })(start);
  }
  function applyExplodeStep() {
    if (vehInstanced) vehInstanced.visible = false;
    if (noiseMesh) noiseMesh.visible = false;
    if (birdsGroup) birdsGroup.visible = false;
    if (roadMat) roadMat.color.set(0xb7babd);
    const layer = EXPLODE_LAYERS[explodeStep - 1];
    explodeLabelEl.style.display = "block";
    explodeLabelEl.textContent = `${explodeStep}/12 · ${layer.name}` + (layer.live ? "" : " (en construcción)");
    const legendActiveLayer = document.getElementById("legendActiveLayer");
    const legendActiveLayerText = document.getElementById("legendActiveLayerText");
    if (legendActiveLayer && legendActiveLayerText) {
      legendActiveLayer.style.display = "block";
      const txt = `${explodeStep}/12 \u2014 ${layer.name}` + (layer.live ? "" : " (en construcción)");
      legendActiveLayerText.textContent = txt;
      if (typeof updateAgentsLegend === "function") updateAgentsLegend(txt);
      else if (window.updateAgentsLegend) window.updateAgentsLegend(txt);
    }
    if (explodeStep === 1) { if (mainBurroMesh) riseAndSettle(mainBurroMesh, 18); }
    else if (explodeStep === 3) { if (birdsGroup) riseAndSettle(birdsGroup, 26); }
    else if (explodeStep === 4) { if (roadMat) roadMat.color.set(0x24c8bd); }
    else if (explodeStep === 8) { if (roadMat) roadMat.color.set(0xe11d48); }
    else if (explodeStep === 9) { if (vehInstanced) riseAndSettle(vehInstanced, 20); }
    else if (explodeStep === 10) { if (noiseMesh) riseAndSettle(noiseMesh, 14); }
    else if (explodeStep === 11) { if (vehInstanced) riseAndSettle(vehInstanced, 20); if (noiseMesh) riseAndSettle(noiseMesh, 14, 1100); }
    // El contexto se ve difuminado detras, tal como se veia antes en las
    // escalas, pero ahora ajustado al recuadro chico de la axonometria
    // (no a pantalla completa).
    const axoContextFadeEl = document.getElementById("axoContextFade");
    if (axoContextFadeEl) axoContextFadeEl.style.display = "block";
  }
  canvas.addEventListener("click", (e) => {
    // Clic en la axonometria principal: abre la escala natural exactamente
    // igual que siempre (agua creciendo por años, tinguas, garzas -- nada
    // de su contenido interno cambia), pero encajada dentro del panel:
    // convenciones a la izquierda, corte abajo, y la escala ocupando
    // arriba a la derecha, mas chica, en vez de pantalla completa.
    if (penActive) return; // mientras se dibuja el poligono, no se dispara la explosion
    const sectionWrapEl = document.getElementById("sectionWrap");
    // A pedido de la usuaria: el panel de Agentes/Convenciones ya no se
    // muestra (ocupaba demasiado espacio en pantalla).
    if (sectionWrapEl) sectionWrapEl.style.display = "block";
    fitEscalaOverlays();
    resizeSectionView();
    placeSectionCutAtHumedal();
    updateSectionCutRotation();
    openNaturalExplode();
    return;

    // Guardar estado y fondo original
    const origRoadColor = roadMat ? roadMat.color.getHex() : null;
    const origNoiseVis = noiseMesh ? noiseMesh.visible : false;
    const origBirdsVis = birdsGroup ? birdsGroup.visible : false;
    const origVehVis = vehInstanced ? vehInstanced.visible : false;
    const origBg = scene.background;

    // Fondo TRANSPARENTE fuera del rombo: solo el terreno y los edificios
    // se ven blancos; lo que queda afuera ya no tapa el texto/fondo.
    scene.background = null;
    renderer.setClearColor(0x000000, 0);

    // 1. Escala Natural: base arquitectónica 100% limpia, CERO carros, CERO ruido, CERO mirlas
    if (noiseMesh) noiseMesh.visible = false;
    if (birdsGroup) birdsGroup.visible = false;
    if (vehInstanced) { vehInstanced.visible = false; vehInstanced.count = 0; }
    if (roadMat) roadMat.color.set(0x9099a3);
    renderer.render(scene, camera);
    const fotoNatural = renderer.domElement.toDataURL("image/png");

    // 2. Escala Cultural: con vehículos y dinámicas urbanas
    if (vehInstanced) {
      vehInstanced.visible = true;
      vehInstanced.count = vehiclesAtTime(currentTime).length || 120;
      renderVehiclesAt(currentTime);
    }
    if (roadMat) roadMat.color.set(0x7a838d);
    renderer.render(scene, camera);
    const fotoCultural = renderer.domElement.toDataURL("image/png");

    // 3. Escala Tecnológica: vista analítica de la red
    if (vehInstanced) vehInstanced.visible = true;
    if (roadMat) roadMat.color.set(0x9099a3);
    renderer.render(scene, camera);
    const fotoTecno = renderer.domElement.toDataURL("image/png");

    // Restaurar fondo original y estado de la escena base
    scene.background = origBg;
    renderer.setClearColor(0x000000, 1);
    if (roadMat && origRoadColor !== null) roadMat.color.set(origRoadColor);
    if (noiseMesh) noiseMesh.visible = origNoiseVis;
    if (birdsGroup) birdsGroup.visible = origBirdsVis;
    if (vehInstanced) {
      vehInstanced.visible = origVehVis;
      vehInstanced.count = origVehVis ? (vehiclesAtTime(currentTime).length || 0) : 0;
    }

    // Asignar fotos a cada imagen según su escala
    const imgNatural = document.getElementById("explodeImg1");
    const imgCultural = document.getElementById("explodeImg2");
    const imgTecno = document.getElementById("explodeImg3");
    if (imgNatural) imgNatural.src = fotoNatural;
    if (imgCultural) imgCultural.src = fotoCultural;
    if (imgTecno) imgTecno.src = fotoTecno;

    document.getElementById("sceneWrap").style.display = "none";
    openNaturalExplode(); // Skips the 3 scales overview screen
    void explodeOverlay.offsetWidth;
    explodeLayers.forEach(el => { el.style.opacity = "1"; el.style.transform = "scale(1)"; });

    setTimeout(() => {
      updateExplodePolygons();
      document.querySelectorAll(".explode-text").forEach(t => initTextDistort(t, t.dataset.layer));
    }, 60);
  });
  document.getElementById("explodeClose").addEventListener("click", () => {
    explodeOverlay.style.display = "none";
    // document.getElementById("sceneWrap").style.display = "block";
    explodeLayers.forEach(el => { el.style.opacity = "0"; el.style.transform = "scale(.05)"; });
    hideAllHandles();
  });
  setTimeout(updateFixedPolygon, 500);

  // ============================================================
  // Distorsion de 4 esquinas para los textos de cada capa (tipo
  // Photoshop "deformar/perspectiva"): cada texto tiene 4 manijas en las
  // esquinas que se pueden arrastrar libremente; se calcula la homografia
  // exacta que lleva el rectangulo original a esas 4 esquinas y se aplica
  // como matrix3d con transform-origin: 0 0.
  // ============================================================
  function solveHomography(w, h, dst) {
    const src = [[0, 0], [w, 0], [w, h], [0, h]];
    const A = [];
    const bvec = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = src[i], X = dst[i].x, Y = dst[i].y;
      A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]); bvec.push(X);
      A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]); bvec.push(Y);
    }
    for (let col = 0; col < 8; col++) {
      let piv = col;
      for (let r = col + 1; r < 8; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
      [A[col], A[piv]] = [A[piv], A[col]]; [bvec[col], bvec[piv]] = [bvec[piv], bvec[col]];
      for (let r = 0; r < 8; r++) {
        if (r === col) continue;
        const f = A[r][col] / A[col][col];
        for (let c = col; c < 8; c++) A[r][c] -= f * A[col][c];
        bvec[r] -= f * bvec[col];
      }
    }
    const h_ = bvec.map((v, i) => v / A[i][i]);
    return [h_[0], h_[1], h_[2], h_[3], h_[4], h_[5], h_[6], h_[7], 1];
  }
  function homographyToMatrix3d(H) {
    const m = H;
    return `matrix3d(${m[0]},${m[3]},0,${m[6]}, ${m[1]},${m[4]},0,${m[7]}, 0,0,1,0, ${m[2]},${m[5]},0,${m[8]})`;
  }
  const textStates = {}; // layerNum -> {corners:[{x,y}x4], w, h, originLeft, originTop}
  function initTextDistort(textEl, layerNum) {
    textEl.style.transform = "none";
    textEl.style.transformOrigin = "0 0";
    textEl.style.background = "transparent";
    textEl.style.border = "none";
    textEl.style.padding = "0";
    textEl.style.fontSize = "12px";
    const w = textEl.offsetWidth || 130;
    const h = textEl.offsetHeight || 20;
    const originLeft = textEl.offsetLeft;
    const originTop = textEl.offsetTop;
    // Coordenadas exactas entregadas por la usuaria
    textStates[layerNum] = {
      w, h, originLeft, originTop,
      corners: [{ x: 28, y: 94 }, { x: 192, y: 5 }, { x: 190, y: 29 }, { x: 28, y: 117 }]
    };
    buildHandles(textEl, layerNum);
    applyDistort(textEl, layerNum);
  }
  function applyDistort(textEl, layerNum) {
    const st = textStates[layerNum];
    if (!st) return;
    const H = solveHomography(st.w, st.h, st.corners);
    textEl.style.transformOrigin = "0 0";
    textEl.style.transform = homographyToMatrix3d(H);
    updateTextCoordsOutput();
  }
  let handlesLayer = null;
  function buildHandles(textEl, layerNum) {
    if (!handlesLayer) {
      handlesLayer = document.createElement("div");
      handlesLayer.id = "textHandlesLayer";
      handlesLayer.style.cssText = "position:fixed; inset:0; z-index:400; pointer-events:none;";
      document.body.appendChild(handlesLayer);
    }
    const st = textStates[layerNum];
    if (st.handleEls) st.handleEls.forEach(h => h.remove());
    st.handleEls = st.corners.map((c, idx) => {
      const h = document.createElement("div");
      h.style.cssText = "position:absolute; width:14px; height:14px; border-radius:50%; background:#fff; border:2px solid #0a0a0a; cursor:grab; pointer-events:auto; display:none; box-shadow:0 2px 6px rgba(0,0,0,0.5);";
      h.dataset.layer = layerNum; h.dataset.corner = idx;
      handlesLayer.appendChild(h);
      return h;
    });
  }
  function positionHandles(textEl, layerNum) {
    const st = textStates[layerNum];
    if (!st || !st.handleEls) return;
    const parentRect = textEl.parentElement.getBoundingClientRect();
    const baseScreenX = parentRect.left + st.originLeft;
    const baseScreenY = parentRect.top + st.originTop;
    st.corners.forEach((c, idx) => {
      const cx = baseScreenX + c.x;
      const cy = baseScreenY + c.y;
      st.handleEls[idx].style.left = (cx - 7) + "px";
      st.handleEls[idx].style.top = (cy - 7) + "px";
    });
  }
  function showHandlesFor(layerNum) {
    Object.keys(textStates).forEach(k => {
      if (textStates[k].handleEls) {
        textStates[k].handleEls.forEach(h => { h.style.display = (k == layerNum) ? "block" : "none"; });
      }
    });
    positionHandles(document.querySelector(`.explode-text[data-layer="${layerNum}"]`), layerNum);
  }
  function hideAllHandles() {
    Object.keys(textStates).forEach(k => {
      if (textStates[k].handleEls) {
        textStates[k].handleEls.forEach(h => h.style.display = "none");
      }
    });
  }
  let draggingHandle = null;
  document.addEventListener("pointerdown", (e) => {
    if (e.target.closest && e.target.closest("#textHandlesLayer") && e.target.dataset.corner !== undefined) {
      draggingHandle = { layer: e.target.dataset.layer, corner: parseInt(e.target.dataset.corner) };
      e.preventDefault();
    }
  });
  document.addEventListener("pointermove", (e) => {
    if (!draggingHandle) return;
    const layerNum = draggingHandle.layer;
    const textEl = document.querySelector(`.explode-text[data-layer="${layerNum}"]`);
    const st = textStates[layerNum];
    if (!st || !textEl) return;
    const parentRect = textEl.parentElement.getBoundingClientRect();
    const baseScreenX = parentRect.left + st.originLeft;
    const baseScreenY = parentRect.top + st.originTop;
    st.corners[draggingHandle.corner] = { x: e.clientX - baseScreenX, y: e.clientY - baseScreenY };
    applyDistort(textEl, layerNum);
    positionHandles(textEl, layerNum);
  });
  document.addEventListener("pointerup", () => { draggingHandle = null; });

  // ---- Toolbar flotante (tamaño, color) para el texto activo ----
  const textToolbar = document.createElement("div");
  textToolbar.style.cssText = "display:none; position:absolute; z-index:401; background:rgba(10,12,14,.92); border:1px solid rgba(255,255,255,.2); border-radius:8px; padding:6px 10px; gap:8px; align-items:center; top:20px; left:50%; transform:translateX(-50%);";
  textToolbar.innerHTML = `
    <label style="color:#fff; font-size:11px;">Tamaño <input type="range" id="txtSizeSlider" min="10" max="60" value="22" style="vertical-align:middle;"></label>
    <label style="color:#fff; font-size:11px;">Color <input type="color" id="txtColorPicker" value="#ffffff"></label>
  `;
  document.body.appendChild(textToolbar);
  let activeTextEl = null;
  document.querySelectorAll(".explode-text").forEach(t => {
    const layerNum = t.dataset.layer;
    t.addEventListener("focus", () => {
      activeTextEl = t;
      textToolbar.style.display = "flex";
      document.getElementById("txtSizeSlider").value = parseInt(t.style.fontSize) || 22;
      document.getElementById("txtColorPicker").value = rgbToHex(t.style.color) || "#ffffff";
      showHandlesFor(layerNum);
    });
  });
  function rgbToHex(rgb) {
    if (!rgb) return null;
    if (rgb.startsWith("#")) return rgb;
    const m = rgb.match(/\d+/g);
    if (!m) return null;
    return "#" + m.slice(0, 3).map(n => parseInt(n).toString(16).padStart(2, "0")).join("");
  }
  document.getElementById("txtSizeSlider").addEventListener("input", (e) => {
    if (activeTextEl) { activeTextEl.style.fontSize = e.target.value + "px"; updateTextCoordsOutput(); }
  });
  document.getElementById("txtColorPicker").addEventListener("input", (e) => {
    if (activeTextEl) { activeTextEl.style.color = e.target.value; updateTextCoordsOutput(); }
  });

  // ---- Zoom individual al hacer clic en cada capa: la que se toca se enfoca
  // suavemente sin agrandar desproporcionadamente el rombo, las otras se desvanecen.
  // Y al hacer clic por SEGUNDA VEZ sobre la capa que ya tiene zoom, se abre la sub-explosión temática. ----
  let zoomedLayer = null;
  function unzoomAll() {
    document.querySelectorAll(".explode-layer").forEach(l => {
      l.style.transition = "transform 2.2s cubic-bezier(.2,.85,.25,1), width 2.2s cubic-bezier(.2,.85,.25,1), opacity 1.6s ease";
      l.style.transform = "scale(1)"; l.style.opacity = "1"; l.style.visibility = "visible"; l.style.zIndex = "1"; l.style.position = "relative"; l.style.top = ""; l.style.left = ""; l.style.width = "";
    });
    zoomedLayer = null;
    const p = document.getElementById("escalaZoomPanel");
    if (p) p.style.display = "none";
    const l = document.getElementById("legendActiveLayer");
    if (l) l.style.display = "none";
    const lp = document.getElementById("legendPanel");
    if (lp) lp.style.display = "none";
  }
  document.querySelectorAll(".explode-layer").forEach((layerEl) => {
    const clip = layerEl.querySelector(".explode-clip");
    if (!clip) return;
    clip.addEventListener("click", (e) => {
      e.stopPropagation();
      const layerNum = parseInt(layerEl.dataset.layer, 10);
      
      // Si la capa YA está en zoom y el usuario le vuelve a hacer clic:
      if (zoomedLayer === layerNum) {
        if (layerNum === 1) {
          openNaturalExplode();
        } else if (layerNum === 2) {
          openCulturalExplode();
        } else if (layerNum === 3) {
          openTechExplode();
        } else {
          unzoomAll();
        }
        return;
      }

      // PRIMER CLIC: enfoque y suave centrado sin distorsionar el tamaño del rombo
      zoomedLayer = layerNum;
      const allLayers = document.querySelectorAll(".explode-layer");
      allLayers.forEach((l) => {
        const lNum = parseInt(l.dataset.layer, 10);
        if (lNum === layerNum) {
          // Agrandar la axonometría al tocarla para que se vea mucho más grande
          l.style.transition = "transform 2.4s cubic-bezier(.2,.85,.25,1), opacity 1.8s ease, width 2.4s cubic-bezier(.2,.85,.25,1)";
          l.style.position = "fixed";
          l.style.top = "50%"; l.style.left = "50%";
          l.style.width = "min(78vw, 840px)";
          l.style.maxWidth = "840px";
          l.style.transform = "translate(-50%,-50%) scale(1.35)";
          l.style.zIndex = "60";
          l.style.opacity = "1"; l.style.visibility = "visible";
        } else {
          // Las otras se desvanecen lentamente
          l.style.transition = "opacity 1.2s ease, transform 1.2s ease";
          l.style.opacity = "0";
          l.style.visibility = "hidden";
        }
      });
    });
  });
  // Clic afuera de las axonometrias (en el fondo del overlay) vuelve a
  // mostrar las 3 apiladas normalmente.
  explodeOverlay.addEventListener("click", (e) => {
    if (zoomedLayer !== null && e.target === explodeOverlay) unzoomAll();
  });

  // ---- Clic en Escala Natural (Capa 1): abre la sub-explosión de 4 capas arquitectónicas ----
  const natOverlay = document.getElementById("naturalExplodeOverlay");
  // Delegacion de eventos para el boton de volver: si el contenido del
  // overlay se regenera en algun momento y el listener directo del boton
  // se pierde, este de aqui sigue funcionando porque esta en el
  // contenedor estable (natOverlay), no en el boton mismo.
  if (natOverlay) natOverlay.addEventListener("click", (e) => {
    if (e.target && (e.target.id === "natExplodeBack" || e.target.closest("#natExplodeBack"))) {
      closeNaturalExplode();
    }
  });
  const natBackBtn = document.getElementById("natExplodeBack");
  const natAssembleBtn = document.getElementById("natAssembleBtn");
  const natAssembleBtnText = document.getElementById("natAssembleBtnText");
  const natBaseImg = document.getElementById("natBaseImg");
  const natContextImg = document.getElementById("natContextImg");
  const natLayerContext = document.getElementById("natLayerContext");
  const natWaterCanvas = document.getElementById("natWaterCanvas");
  const natWaterSvg = document.getElementById("natWaterSvg");
  const natVegCanvas = document.getElementById("natVegCanvas");
  const natVegSvg = document.getElementById("natVegSvg");
  const natBirdCanvas = document.getElementById("natBirdCanvas");
  const natBirdSvg = document.getElementById("natBirdSvg");
  const natMacroCanvas = document.getElementById("natMacroCanvas");
  const natMacroSvg = document.getElementById("natMacroSvg");
  const natGuideSvg = document.getElementById("natGuideSvg");
  const natMesSlider = document.getElementById("natMesSlider");
  const natMesLabel = document.getElementById("natMesLabel");
  const natFloodStats = document.getElementById("natFloodStats");
  const natPlayYearBtn = document.getElementById("natPlayYearBtn");

  const MESES_NAT = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const HUMEDAL_CICLO = [
    { mes: 1, expansion_pct: 41.7, profundidad_m: 1.32, temporada: "Temporada seca / intermedia" },
    { mes: 2, expansion_pct: 42.6, profundidad_m: 1.39, temporada: "Temporada seca / intermedia" },
    { mes: 3, expansion_pct: 46.7, profundidad_m: 1.73, temporada: "Inicio de temporada de lluvias" },
    { mes: 4, expansion_pct: 50.0, profundidad_m: 2.00, temporada: "Pico de lluvias (máxima cota)" },
    { mes: 5, expansion_pct: 47.4, profundidad_m: 1.78, temporada: "Temporada de lluvias" },
    { mes: 6, expansion_pct: 41.5, profundidad_m: 1.30, temporada: "Temporada de estiaje" },
    { mes: 7, expansion_pct: 37.7, profundidad_m: 0.99, temporada: "Temporada seca (estiaje)" },
    { mes: 8, expansion_pct: 34.1, profundidad_m: 0.69, temporada: "Estiaje pronunciado" },
    { mes: 9, expansion_pct: 33.0, profundidad_m: 0.60, temporada: "Mínimo anual de cota (estiaje)" },
    { mes: 10, expansion_pct: 38.6, profundidad_m: 1.06, temporada: "Segunda temporada de lluvias" },
    { mes: 11, expansion_pct: 43.8, profundidad_m: 1.49, temporada: "Pico de segunda temporada de lluvias" },
    { mes: 12, expansion_pct: 43.3, profundidad_m: 1.45, temporada: "Descenso hacia temporada seca" },
  ];

  let natYearPlaying = false, natYearTimer = null;
  let natWaterAnimFrame = null;
  let natWaterTime = 0;
  let natIsAssembled = false; // Estado: true si las capas bajaron y se colocaron sobre la base axo

  let canonicalCamera = null;
  function updateCanonicalCamera() {
    if (!camera) return;
    canonicalCamera = camera.clone();
    canonicalCamera.matrixWorldInverse.copy(camera.matrixWorldInverse);
    // BUG REAL encontrado: la camara principal tiene la proporcion de
    // ANCHO/ALTO de la ventana completa (.main, que no es 16:9), pero
    // las subcapas se dibujan en un lienzo que SI es 16:9 - al copiar
    // tal cual la matriz de proyeccion de la camara principal y usarla
    // para proyectar puntos sobre un lienzo con OTRA proporcion, todo se
    // estira/deforma (por eso el humedal no coincidia con su forma real).
    // Se recalculan aqui los limites (left/right) de esta camara
    // ortografica clonada para que su proporcion sea EXACTAMENTE 16:9,
    // manteniendo el mismo alto (top/bottom = mismo zoom vertical) que
    // la camara principal, para que el contenido se vea del mismo
    // tamaño real, sin deformarse.
    const alto = camera.top - camera.bottom;
    const anchoDeseado = alto * (16 / 9);
    const centroX = (camera.left + camera.right) / 2;
    canonicalCamera.left = centroX - anchoDeseado / 2;
    canonicalCamera.right = centroX + anchoDeseado / 2;
    canonicalCamera.top = camera.top;
    canonicalCamera.bottom = camera.bottom;
    canonicalCamera.updateProjectionMatrix();
  }

  // Matriz de proyección canónica para el viewport 16:9 de las subcapas
  function projectPointToLayer(rx, ry, elevation, w, h) {
    const sp = toScene(rx, ry);
    const el = (typeof elevation === "number") ? elevation : 0.0;
    const p = new THREE.Vector3(sp.x, el, sp.z);
    const cam = canonicalCamera || camera;
    p.project(cam);
    return {
      x: (p.x * 0.5 + 0.5) * w,
      y: (-p.y * 0.5 + 0.5) * h,
      inFront: p.z <= 1
    };
  }

  // Dibuja el marco rojo técnico del sector de estudio (Humedal El Burro) en la subcapa
  function drawFocusSiteBoundingBox(ctx, projectPoint) {
    const minX = 7050, maxX = 7950, minY = 2800, maxY = 3500;
    const p1 = projectPoint(minX, minY, 0.0);
    const p2 = projectPoint(maxX, minY, 0.0);
    const p3 = projectPoint(maxX, maxY, 0.0);
    const p4 = projectPoint(minX, maxY, 0.0);

    if (!p1.inFront || !p2.inFront || !p3.inFront || !p4.inFront) return;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.closePath();

    ctx.strokeStyle = "rgba(225, 29, 72, 0.95)";
    ctx.lineWidth = 2.2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();

    const corners = [p1, p2, p3, p4];
    corners.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#e11d48";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
    ctx.restore();
  }


  // ============================================================
  // Base con CONTEXTO (como el referente): toda la ciudad alrededor en
  // 3D muy clarita + el area de estudio (caja de seccion) nitida encima +
  // un borde leve marcando el area. Usa la MISMA camara que las subcapas,
  // asi que todo encaja pixel por pixel. Se quita el "cubo negro" (borde
  // extruido de la caja) en esta captura.
  // ============================================================
  function captureBaseWithContext(renderFocusSetup) {
    const burroVisPrev = mainBurroMesh ? mainBurroMesh.visible : false;
    if (mainBurroMesh) mainBurroMesh.visible = false; // la base usa la forma real del humedal
    const W = renderer.domElement.width, H = renderer.domElement.height;
    const off = document.createElement("canvas"); off.width = W; off.height = H;
    const c = off.getContext("2d");
    c.fillStyle = "#ffffff"; c.fillRect(0, 0, W, H);
    const halfW = sceneExtentW / 2 * 1.4, halfH = sceneExtentH / 2 * 1.4;
    const bx0 = -halfW + (parseFloat(secXMin.value) / 100) * (2 * halfW);
    const bx1 = -halfW + (parseFloat(secXMax.value) / 100) * (2 * halfW);
    const bz0 = -halfH + (parseFloat(secZMin.value) / 100) * (2 * halfH);
    const bz1 = -halfH + (parseFloat(secZMax.value) / 100) * (2 * halfH);
    const cx = (bx0 + bx1) / 2, cz = (bz0 + bz1) / 2, K = 3.2;
    const bw = (bx1 - bx0) * K / 2, bh = (bz1 - bz0) * K / 2;
    const origBg = scene.background;
    const borderVis = axoBorderMesh ? axoBorderMesh.visible : false;
    if (axoBorderMesh) axoBorderMesh.visible = false;
    if (renderFocusSetup) renderFocusSetup();
    // 1) Contexto: sin recorte, con edificios y vias alrededor
    const savedConst = Object.values(secPlanes).map(p => p.constant);
    Object.values(secPlanes).forEach(p => (p.constant = 1e6));
    const origClip = renderer.clippingPlanes; renderer.clippingPlanes = [];
    if (rawBuildingsData) buildBuildings(rawBuildingsData, { xMin: cx - bw, xMax: cx + bw, zMin: cz - bh, zMax: cz + bh, yMin: 0, yMax: 1e6 });
    if (rawEdgesData) buildRoads(rawEdgesData, { xMin: cx - bw, xMax: cx + bw, zMin: cz - bh, zMax: cz + bh, yMin: 0, yMax: 1e6 });
    if (axoBorderMesh) axoBorderMesh.visible = false;
    scene.background = new THREE.Color(0xffffff);
    renderer.render(scene, camera);
    { // contexto solo "un poquito" alrededor: se desvanece con la distancia al area de estudio
      const tmp = document.createElement("canvas"); tmp.width = W; tmp.height = H; const t = tmp.getContext("2d");
      t.drawImage(renderer.domElement, 0, 0);
      const vv = new THREE.Vector3(); const cs = [[bx0, bz0], [bx1, bz0], [bx1, bz1], [bx0, bz1]].map(([x, z]) => { vv.set(x, 0, z).project(camera); return [(vv.x * .5 + .5) * W, (-vv.y * .5 + .5) * H]; });
      const ccx = cs.reduce((s, p) => s + p[0], 0) / 4, ccy = cs.reduce((s, p) => s + p[1], 0) / 4;
      const rad = Math.max(...cs.map(p => Math.hypot(p[0] - ccx, p[1] - ccy)));
      const radY = Math.max(...cs.map(p => Math.abs(p[1] - ccy)));
      const sy = Math.min(1, (radY * 1.25) / rad, (H / 2 - 2) / (rad * 1.25)); // elipse que se desvanece ANTES del borde del cuadro
      t.globalCompositeOperation = "destination-in";
      t.save(); t.translate(ccx, ccy); t.scale(1, sy);
      const g = t.createRadialGradient(0, 0, rad * 0.4, 0, 0, rad * 2.8);
      g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
      t.fillStyle = g; t.fillRect(-W, -H / sy, W * 2, (H / sy) * 2); t.restore();
      c.globalAlpha = 0.48; c.drawImage(tmp, 0, 0);
    }
    // 2) Area de estudio nitida (con su recorte normal), fondo transparente
    Object.values(secPlanes).forEach((p, i) => (p.constant = savedConst[i]));
    renderer.clippingPlanes = origClip;
    rebuildFilteredGeometry();
    if (axoBorderMesh) axoBorderMesh.visible = false;
    scene.background = null; renderer.setClearColor(0x000000, 0);
    renderer.render(scene, camera);
    c.globalAlpha = 1; c.drawImage(renderer.domElement, 0, 0);
    renderer.setClearColor(0x000000, 1);
    // 3) Borde leve del area de estudio
    const v = new THREE.Vector3();
    const pts = [[bx0, bz0], [bx1, bz0], [bx1, bz1], [bx0, bz1]].map(([x, z]) => {
      v.set(x, 0, z); v.project(camera);
      return [(v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * H];
    });
    c.strokeStyle = "rgba(20,24,30,.55)"; c.lineWidth = Math.max(1, W / 900);
    c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.stroke();
    scene.background = origBg;
    if (axoBorderMesh) axoBorderMesh.visible = borderVis;
    if (mainBurroMesh) mainBurroMesh.visible = burroVisPrev;
    // Restore full city geometry for the main live view
    if (rawBuildingsData) buildBuildings(rawBuildingsData, null);
    if (rawEdgesData) buildRoads(rawEdgesData, null);
    rebuildFilteredGeometry(); // Re-apply section box if active
    return off.toDataURL("image/png");
  }

  // ---- OFFSET real de un poligono: el borde se desplaza hacia afuera
  // (d > 0) la MISMA distancia en todos lados, en metros. Asi el agua
  // crece como una cota de inundacion, sin correrse ni deformarse. ----

  function offsetPoly(pts, d) {
    const n = pts.length; if (n < 3 || !d) return pts.map(p => [p[0], p[1]]);
    let area = 0; for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
    const sgn = area > 0 ? 1 : -1; // antihorario: la normal hacia afuera es (dy, -dx)
    const out = [];
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
      let e1x = p1[0] - p0[0], e1y = p1[1] - p0[1], e2x = p2[0] - p1[0], e2y = p2[1] - p1[1];
      const l1 = Math.hypot(e1x, e1y) || 1, l2 = Math.hypot(e2x, e2y) || 1;
      const n1x = sgn * e1y / l1, n1y = -sgn * e1x / l1, n2x = sgn * e2y / l2, n2y = -sgn * e2x / l2;
      let mx = n1x + n2x, my = n1y + n2y; const ml = Math.hypot(mx, my);
      if (ml < 1e-6) { mx = n1x; my = n1y; } else { mx /= ml; my /= ml; }
      const cosH = Math.max(0.35, mx * n1x + my * n1y); // limita picos en esquinas agudas
      out.push([p1[0] + mx * d / cosH, p1[1] + my * d / cosH]);
    }
    return out;
  }
  function openNaturalExplode() {
    const lp = document.getElementById("legendPanel");
    if (lp) lp.style.display = "block";
    const cp = document.getElementById("natClimatePanel");
    if (cp) cp.style.display = "block";
    const c1 = document.getElementById("cultCapa1Panel");
    if (c1) c1.style.display = "none";
    const t4 = document.getElementById("techCapa4Panel");
    if (t4) t4.style.display = "none";
    const sw = document.getElementById("sceneWrap");
    if (sw) sw.style.display = "none";
    if (!natOverlay) return;

    // Sincronizar dimensiones exactas del lienzo de capa
    const targetW = 960;
    const targetH = 540; // Relación fija 16:9 exacta

    // Guardar estado original de la cámara y renderer
    const origW = wrap.clientWidth;
    const origH = wrap.clientHeight;

    // Configurar cámara y renderer temporalmente a 16:9 exacto para la captura de la base
    const layerAspect = targetW / targetH; // 16/9 = 1.7777777777777777
    camera.left = -viewSize * layerAspect;
    camera.right = viewSize * layerAspect;
    camera.top = viewSize;
    camera.bottom = -viewSize;
    camera.updateProjectionMatrix();
    renderer.setSize(targetW, targetH, false);
    updateCanonicalCamera();

    // Captura fotográfica de la base limpia con fondo transparente (cero carros, cero ruido, cero mirlas)
    const origRoadColor = roadMat ? roadMat.color.getHex() : null;
    const origNoiseVis = noiseMesh ? noiseMesh.visible : false;
    const origBirdsVis = birdsGroup ? birdsGroup.visible : false;
    const origVehVis = vehInstanced ? vehInstanced.visible : false;
    const origVehCount = vehInstanced ? vehInstanced.count : 0;
    const origBg = scene.background;

    if (noiseMesh) noiseMesh.visible = false;
    if (birdsGroup) birdsGroup.visible = false;
    if (vehInstanced) { vehInstanced.visible = false; vehInstanced.count = 0; }
    if (roadMat) roadMat.color.set(0x9099a3);

    const fotoBase = captureBaseWithContext(); // contexto clarito + area de estudio nitida + borde leve

    // Captura ADICIONAL de contexto: la misma vista pero con la camara
    // alejada (viewSize mas grande), mostrando mucho mas alrededor del
    // sector cortado - esta se muestra de fondo, mas grande y con
    // opacidad baja, para dar sensacion de "aqui esta ubicado dentro de
    // todo Kennedy" (igual al referente de Pinterest). Se restaura el
    // viewSize original justo despues, para no afectar nada mas.
    if (natContextImg) {
      const contextZoomOut = 3.2; // cuanto se aleja la camara para el contexto
      camera.left = -viewSize * contextZoomOut * layerAspect;
      camera.right = viewSize * contextZoomOut * layerAspect;
      camera.top = viewSize * contextZoomOut;
      camera.bottom = -viewSize * contextZoomOut;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      natContextImg.src = renderer.domElement.toDataURL("image/png");
      // natLayerContext ya no se activa: ahora la Capa Base ES la
      // axonometria completa sin recorte, asi que mostrar OTRO contexto
      // de fondo detras seria redundante.
      // se restaura el encuadre normal (el mismo que usa fotoBase) para
      // que el resto del flujo (subcapas, etc.) siga igual que antes
      camera.left = -viewSize * layerAspect;
      camera.right = viewSize * layerAspect;
      camera.top = viewSize;
      camera.bottom = -viewSize;
      camera.updateProjectionMatrix();
    }
    scene.background = origBg;

    // Captura FOTOGRAFICA (no vectorial) de SOLO el agua, con la MISMA
    // camara exacta usada para fotoBase - al ser literalmente la misma
    // foto/camara, el humedal aqui SIEMPRE encaja pixel por pixel con la
    // base, sin depender de que una proyeccion vectorial por separado
    // calce bien (que es donde venian los problemas de desajuste).
    if (natWaterImg) {
      const toHide = [currentBuildingMesh, currentBuildingEdgeMesh, currentBuildingCornerMesh, manzanasMesh, ...currentRoadMeshes, treeMeshes && treeMeshes[0] ? treeMeshes[0].mesh : null].filter(o => o && o.visible !== undefined);
      if (mainBurroMesh) toHide.push(mainBurroMesh); // la foto del agua tambien con la forma REAL, sin la crecida mensual
      const prevVis = toHide.map(o => o.visible);
      toHide.forEach(o => { o.visible = false; });
      scene.background = new THREE.Color(0xffffff);
      renderer.render(scene, camera);
      natWaterImg.src = renderer.domElement.toDataURL("image/png");
      natWaterImg.style.display = "block";
      natWaterImg.style.objectFit = "fill";
      toHide.forEach((o, i) => { o.visible = prevVis[i]; });
      scene.background = origBg;
    }
    if (roadMat && origRoadColor !== null) roadMat.color.set(origRoadColor);
    if (noiseMesh) noiseMesh.visible = origNoiseVis;
    if (birdsGroup) birdsGroup.visible = origBirdsVis;
    if (vehInstanced) {
      vehInstanced.visible = origVehVis;
      vehInstanced.count = origVehCount;
    }

    if (natBaseImg) {
      natBaseImg.src = fotoBase;
      natBaseImg.style.objectFit = "fill";
    }
    // Subcapas flotantes limpias (planos diagramáticos sobre fondo blanco/transparente)
    const setNatSubImg = (id) => {
      const el = document.getElementById(id);
      if (el) { el.src = ""; el.style.display = "none"; }
    };
    setNatSubImg("natWaterImg");
    setNatSubImg("natVegImg");
    setNatSubImg("natBirdImg");
    setNatSubImg("natMacroImg");

    natOverlay.style.display = "flex";
    void natOverlay.offsetWidth;

    // Iniciar con solo la base axonométrica limpia (Paso 0)
    natExplodeStep = 0;
    updateNaturalLayersStep(false);
    renderAllNaturalSublayers();

    // Iniciar loop continuo de agua viva fluida y oleaje
    startNatWaterAnimation();
    // Arranca solo el ciclo del año (agua creciendo, aves llegando, epoca)
    // apenas se abre la escala natural, sin tener que darle play.
    setTimeout(() => { if (natPlayYearBtn && !natYearPlaying) natPlayYearBtn.click(); }, 900);
  }

  function renderAllNaturalSublayers() {
    const mes = parseInt(natMesSlider.value, 10);
    renderNaturalWaterLayer(mes);
    renderNaturalVegLayer(mes);
    renderNaturalBirdLayer(mes);
    renderNaturalMacroLayer(mes);
    drawNaturalGuideLines();
    // Lluvia tambien aqui: este slider (natMesSlider) es DISTINTO al de
    // la vista principal (mainBurroMes) -- antes solo se conectaba la
    // lluvia a ese, dejando esta capa (donde se ve crecer el espejo de
    // agua) sin lluvia nunca, sin importar el mes. Se activa cuando el
    // mes es de temporada de lluvias Y la subcapa de Agua esta siendo
    // mostrada (pasos 0 a 2: base, Agua extraida, Agua asentada -- el
    // crecimiento del agua es visible en todos esos momentos).
    if (typeof setLluviaActiva === "function") {
      const esLluvia = [3, 4, 5, 10, 11].includes(mes);
      const aguaVisible = typeof natExplodeStep === "undefined" || natExplodeStep <= 2;
      setLluviaActiva(esLluvia && aguaVisible);
    }
  }

  let natExplodeStep = 0;
  // Secuencia de pasos interactivos:
  // 0: Base limpia
  // 1: Capa 1 (Agua) extraída arriba
  // 2: Capa 1 asentada en la base (simulación en territorio)
  // 3: Capa 2 (Vegetación) extraída arriba
  // 4: Capa 2 asentada en la base
  // 5: Capa 3 (Aves) extraída arriba
  // 6: Capa 3 asentada en la base
  // 7: Capa 4 (Conectividad) extraída arriba
  // 8: Capa 4 asentada en la base
  // 9: Vista explotada completa (todas las capas flotando apiladas)
  // 10: Integración total (todas las capas asentadas en la base simulando en conjunto)

  function updateNaturalLayersStep(animated = true) {
    if (typeof syncFloatLabelText === "function") syncFloatLabelText();
    const sublayers = [
      document.getElementById("natLayerWater"),
      document.getElementById("natLayer2"),
      document.getElementById("natLayer3"),
      document.getElementById("natLayer4")
    ];
    const baseEl = document.getElementById("natLayerBase");
    const tags = natOverlay.querySelectorAll(".nat-layer-tag");

    // Limpiar o aplicar planos diagramáticos sobre los rombos
    const allDiamonds = natOverlay.querySelectorAll(".sublayer-diamond");
    allDiamonds.forEach(d => {
      const isBase = d.parentElement && d.parentElement.id === "natLayerBase";
      if (isBase) {
        d.style.background = "transparent";
        d.style.boxShadow = "none";
        d.style.borderColor = "transparent";
      } else {
        d.style.background = "rgba(255, 255, 255, 0.92)";
        d.style.border = "1.5px solid rgba(15, 23, 42, 0.35)";
        d.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.08)";
      }
    });

    if (natExplodeStep === 0) {
      // Paso 0: Únicamente la base limpia visible en el centro de la pantalla
      if (baseEl) { baseEl.style.top = "50%"; baseEl.style.opacity = "1"; baseEl.style.transform = "translate(-50%, -40%)"; }
      sublayers.forEach(l => { if (l) { l.style.opacity = "0"; l.style.top = "50%"; l.style.transform = "translate(-50%, -40%)"; } });
      tags.forEach(t => { t.style.opacity = "0"; });
      if (natGuideSvg) natGuideSvg.style.opacity = "0";
      if (natAssembleBtnText) natAssembleBtnText.textContent = "Extraer Capa 1: Sistema Hídrico";
      return;
    }

    // Pasos impares (1, 3, 5, 7): Capa i extraída flotando arriba; base centrada abajo en la mitad de la pantalla
    if (natExplodeStep % 2 === 1 && natExplodeStep <= 7) {
      const activeIdx = Math.floor(natExplodeStep / 2);

      if (baseEl) { baseEl.style.top = "60%"; baseEl.style.opacity = "1"; baseEl.style.transform = "translate(-50%, -40%)"; }
      sublayers.forEach((l, index) => {
        if (!l) return;
        if (index === activeIdx) {
          // Capa activa flotando arriba
          const expTop = "-4%"; // todas las capas extraidas a la misma altura, mas arriba (no interfieren con la base)
          l.style.top = expTop;
          l.style.transform = "translate(-50%, 0)";
          l.style.opacity = "1";
          const tag = l.querySelector(".nat-layer-tag");
          if (tag) tag.style.opacity = "1";
        } else {
          // Ocultas sobre la base
          l.style.top = "60%";
          l.style.transform = "translate(-50%, -40%)";
          l.style.opacity = "0";
          const tag = l.querySelector(".nat-layer-tag");
          if (tag) tag.style.opacity = "0";
        }
      });

      if (natGuideSvg) natGuideSvg.style.opacity = "1";
      drawNaturalGuideLines();
      if (natAssembleBtnText) natAssembleBtnText.textContent = `Asentar Capa ${activeIdx + 1} en el Territorio`;
      return;
    }

    // Pasos pares (2, 4, 6, 8): Capa i asentada en el territorio simulando en el centro de la pantalla
    if (natExplodeStep % 2 === 0 && natExplodeStep <= 8) {
      natOverlay.querySelectorAll(".sublayer-diamond").forEach(dd => { dd.style.background = "transparent"; dd.style.boxShadow = "none"; dd.style.borderColor = "transparent"; });
      const settledIdx = (natExplodeStep / 2) - 1;
      const nextNames = ["Capa 2: Vegetación", "Capa 3: Aves/Fauna", "Capa 4: Conectividad", "Ver Apilamiento Explotado Completo"];

      if (baseEl) { baseEl.style.top = "50%"; baseEl.style.opacity = "1"; baseEl.style.transform = "translate(-50%, -40%)"; }
      sublayers.forEach((l, index) => {
        if (!l) return;
        if (index === settledIdx) {
          l.style.top = "50%";
          l.style.transform = "translate(-50%, -40%)";
          l.style.opacity = "1";
          // al asentarse, el plano blanco de la capa se vuelve transparente
          // para que la capa quede ENCIMA del territorio, encajada.
          const dd = l.querySelector(".sublayer-diamond");
          if (dd) { dd.style.background = "transparent"; dd.style.boxShadow = "none"; dd.style.borderColor = "transparent"; }
          const tag = l.querySelector(".nat-layer-tag");
          if (tag) tag.style.opacity = "1";
        } else {
          l.style.top = "50%";
          l.style.transform = "translate(-50%, -40%)";
          l.style.opacity = "0";
          const tag = l.querySelector(".nat-layer-tag");
          if (tag) tag.style.opacity = "0";
        }
      });

      if (natGuideSvg) natGuideSvg.style.opacity = "0";
      if (natAssembleBtnText) natAssembleBtnText.textContent = `Extraer ${nextNames[settledIdx]}`;
      return;
    }

    if (natExplodeStep === 9) {
      // Paso 9: Apilamiento explotado completo (las 4 capas flotando apiladas)
      if (baseEl) { baseEl.style.top = "70%"; baseEl.style.opacity = "1"; baseEl.style.transform = "translate(-50%, 0)"; }
      sublayers.forEach((l) => {
        if (!l) return;
        const expTop = l.dataset.explodedTop || "54%";
        l.style.top = expTop;
        l.style.transform = "translate(-50%, 0)";
        l.style.opacity = "1";
        const tag = l.querySelector(".nat-layer-tag");
        if (tag) tag.style.opacity = "1";
      });
      tags.forEach(t => { t.style.opacity = "1"; });
      if (natGuideSvg) natGuideSvg.style.opacity = "1";
      drawNaturalGuideLines();
      if (natAssembleBtnText) natAssembleBtnText.textContent = "Integrar TODAS las capas en el Territorio";
      return;
    }

    if (natExplodeStep === 10) {
      natOverlay.querySelectorAll(".sublayer-diamond").forEach(dd => { dd.style.background = "transparent"; dd.style.boxShadow = "none"; dd.style.borderColor = "transparent"; });
      // Paso 10: Integración Total (todas las 4 capas asentadas abajo simulando simultáneamente)
      if (baseEl) { baseEl.style.top = "50%"; baseEl.style.opacity = "1"; baseEl.style.transform = "translate(-50%, -40%)"; }
      sublayers.forEach((l) => {
        if (!l) return;
        l.style.top = "50%";
        l.style.transform = "translate(-50%, -40%)";
        l.style.opacity = "1";
        const tag = l.querySelector(".nat-layer-tag");
        if (tag) tag.style.opacity = "0";
      });
      if (natGuideSvg) natGuideSvg.style.opacity = "0";
      if (natAssembleBtnText) natAssembleBtnText.textContent = "Reiniciar Recorrido en Base";
      return;
    }
  }

  function advanceNaturalAssemble() {
    natExplodeStep++;
    if (natExplodeStep > 10) {
      natExplodeStep = 0;
      updateNaturalLayersStep(false);
      closeNaturalExplode();
      openCulturalExplode();
      return;
    }
    updateNaturalLayersStep(true);
  }

  if (natAssembleBtn) natAssembleBtn.addEventListener("click", advanceNaturalAssemble);

  // Al hacer clic en el contenedor de las subcapas, avanza al siguiente paso de extracción
  const natStageEl = document.getElementById("natExplodeStage");
  if (natStageEl) {
    natStageEl.addEventListener("click", (e) => {
      advanceNaturalAssemble();
    });
  }

  function startNatWaterAnimation() {
    if (natWaterAnimFrame) cancelAnimationFrame(natWaterAnimFrame);
    function loopWater() {
      if (natOverlay.style.display !== "none") {
        natWaterTime += 0.035;
        const m = parseInt(natMesSlider.value, 10);
        renderNaturalWaterLayer(m);
        renderNaturalBirdLayer(m);
        renderNaturalMacroLayer(m);
        natWaterAnimFrame = requestAnimationFrame(loopWater);
      }
    }
    natWaterAnimFrame = requestAnimationFrame(loopWater);
  }

  function closeNaturalExplode() {
    const p = document.getElementById("escalaZoomPanel");
    if (p) p.style.display = "none";
    const l = document.getElementById("legendActiveLayer");
    if (l) l.style.display = "none";
    if (!natOverlay) return;
    const sceneWrapRestore = document.getElementById("sceneWrap");
    // if (sceneWrapRestore) sceneWrapRestore.style.display = "block"; // volver a la vista 3D en vivo (antes solo lo hacia openTechExplode, por eso Natural y Cultural se quedaban en blanco)
    if (natWaterAnimFrame) { cancelAnimationFrame(natWaterAnimFrame); natWaterAnimFrame = null; }
    const sublayers = natOverlay.querySelectorAll(".nat-sublayer");
    sublayers.forEach(l => {
      l.style.opacity = "0";
      l.style.transform = "translate(-50%, -20px)";
    });
    if (natLayerContext) natLayerContext.style.opacity = "0";
    if (natYearPlaying) stopNatPlayYear();

    // Restaurar inmediatamente el viewport del 3D general
    const origW = wrap.clientWidth, origH = wrap.clientHeight;
    renderer.setSize(origW, origH, false);
    const restoreAspect = origW / origH;
    camera.left = -viewSize * restoreAspect;
    camera.right = viewSize * restoreAspect;
    camera.top = viewSize;
    camera.bottom = -viewSize;
    camera.updateProjectionMatrix();

    setTimeout(() => {
      natOverlay.style.display = "none";
      unzoomAll();
    }, 400);
  }

  if (natBackBtn) natBackBtn.addEventListener("click", closeNaturalExplode);

  // ============================================================
  // LÓGICA PARA ESCALA TECNOLÓGICA (Vías + Carros | Mapa de Ruido)
  // ============================================================
  const techOverlay = document.getElementById("techExplodeOverlay");
  const techRoadsVehCanvas = document.getElementById("techRoadsVehCanvas");
  const techNoiseCanvas = document.getElementById("techNoiseCanvas");
  let techLiveViewSize = null; // se fija cuando se abre el panel, para poder "espejar" con el mismo encuadre 16:9 exacto
  let techTrafficGrid = null, techFloodCars = null, techSewerNet = null;
  function updateTechLiveMirror() {
    if (!techOverlay || techOverlay.style.display === "none" || techLiveViewSize == null) return;
    const targetW = 960, targetH = 540, layerAspect = targetW / targetH;
    const origRoadColor = roadMat ? roadMat.color.getHex() : null;
    const origNoiseVis = noiseMesh ? noiseMesh.visible : false;
    const origVehVis = vehInstanced ? vehInstanced.visible : false;
    const origVehCount = vehInstanced ? vehInstanced.count : 0;
    const origBg = scene.background;
    const origCamL = camera.left, origCamR = camera.right, origCamT = camera.top, origCamB = camera.bottom;
    // Todo lo que NUNCA debe verse en ninguna de las 2 subcapas: edificios,
    // sus bordes/esquinas, arboles y PARQUES/zonas verdes (esto ultimo era
    // lo que se veia como "cosas verdes" - parqueMat es una malla aparte
    // que no se estaba ocultando antes).
    const toHideCommon = [currentBuildingMesh, currentBuildingEdgeMesh, currentBuildingCornerMesh, manzanasMesh, treeMeshes && treeMeshes[0] ? treeMeshes[0].mesh : null].filter(o => o && o.visible !== undefined);
    const prevVisCommon = toHideCommon.map(o => o.visible);
    toHideCommon.forEach(o => { o.visible = false; });
    const waterOpacityPrev = waterMat ? waterMat.opacity : null;
    if (waterMat) waterMat.opacity = 0;
    const parqueOpacityPrev = parqueMat ? parqueMat.opacity : null;
    if (parqueMat) parqueMat.opacity = 0;

    camera.left = -techLiveViewSize * layerAspect; camera.right = techLiveViewSize * layerAspect;
    camera.top = techLiveViewSize; camera.bottom = -techLiveViewSize;
    camera.updateProjectionMatrix();

    // Capa 1: SOLO las vias sobre fondo transparente, coloreadas por
    // trafico real (negro = mas trafico -> amarillo = menos), y los carros
    // andando encima. Se dibuja en 2D, asi no aparece nada mas (ni verde,
    // ni edificios, ni terreno).
    if (techRoadsVehCanvas && rawEdgesData) {
      if (techTrafficGrid && techTrafficGrid.size === 0 && timesteps.length) techTrafficGrid = null; // se habia calculado antes de cargar los vehiculos
      if (!techTrafficGrid && timesteps.length) {
        techTrafficGrid = new Map(); let maxC = 1;
        for (let k = 0; k < timesteps.length; k += 8) timesteps[k].vehicles.forEach(v => {
          const key = Math.floor(v.x / 40) + "," + Math.floor(v.y / 40);
          const c = (techTrafficGrid.get(key) || 0) + 1; techTrafficGrid.set(key, c); if (c > maxC) maxC = c;
        });
        techTrafficGrid.maxC = maxC;
      }
      const { ctx, w, h, P } = prepCultCanvas(techRoadsVehCanvas);
      if (!techTrafficGrid) return; // aun cargando vehiculos
      const g = techTrafficGrid;
      const colorFor = t => { // t 0..1 : amarillo (poco) -> naranja -> negro (mucho)
        const stops = [[250, 204, 21], [234, 88, 12], [120, 30, 20], [15, 15, 18]];
        const f = t * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(f)), r = f - i;
        return `rgb(${stops[i].map((c, k) => Math.round(c + (stops[i + 1][k] - c) * r)).join(",")})`;
      };
      if (!techTrafficGrid.inBox) { // trafico por via, normalizado dentro del area de estudio (mas contraste)
        const list = []; let mxBox = 1;
        rawEdgesData.forEach(([kind, pts]) => {
          const m = pts[Math.floor(pts.length / 2)]; if (!inBox(m[0], m[1])) return;
          let c = 0; pts.forEach(p => { c += g.get(Math.floor(p[0] / 40) + "," + Math.floor(p[1] / 40)) || 0; });
          c /= pts.length; list.push([pts, c]); if (c > mxBox) mxBox = c;
        });
        techTrafficGrid.inBox = list.map(([pts, c]) => [pts, Math.log(1 + c) / Math.log(1 + mxBox)]); // escala logaritmica: degradado real de amarillo a negro
      }
      techTrafficGrid.inBox.forEach(([pts, t]) => {
        ctx.strokeStyle = colorFor(t); ctx.lineWidth = 0.8 + t * 2.2; ctx.lineCap = "round";
        ctx.beginPath(); pts.forEach((p, j) => { const s = P(p[0], p[1]); j ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); }); ctx.stroke();
      });
      ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#111418"; ctx.lineWidth = 0.6;
      vehiclesAtTime(currentTime).forEach(v => { if (!inBox(v.x, v.y)) return; const s = P(v.x, v.y, 0.2); ctx.beginPath(); ctx.arc(s.x, s.y, 1.6, 0, 7); ctx.fill(); ctx.stroke(); });
      smallLabel(ctx, "Tráfico: amarillo = bajo · negro = alto", 10, 16);
    }

    // Capa 2: fondo TRANSPARENTE, sin vias visibles tampoco - solo los
    // carros andando y la mancha de ruido (amarillo/naranja/rojo) que
    // generan al pasar, tal como pidio el usuario.
    if (techNoiseCanvas) {
      scene.background = null; // transparente
      renderer.setClearColor(0x000000, 0);
      const roadVisPrev = currentRoadMeshes.map(m => m ? m.visible : null);
      currentRoadMeshes.forEach(m => { if (m) m.visible = false; });
      if (vehInstanced) { vehInstanced.visible = true; renderVehiclesAt(currentTime); }
      if (noiseMesh) noiseMesh.visible = true;
      computeLiveNoiseField(vehiclesAtTime(currentTime), performance.now()); // se fuerza el calculo aqui (no depende de que el boton "Mostrar ruido" de la vista principal este activado)
      renderer.render(scene, camera);
      const rect2 = techNoiseCanvas.getBoundingClientRect();
      if (techNoiseCanvas.width !== Math.round(rect2.width) || techNoiseCanvas.height !== Math.round(rect2.height)) {
        techNoiseCanvas.width = Math.round(rect2.width); techNoiseCanvas.height = Math.round(rect2.height);
      }
      const ctx2 = techNoiseCanvas.getContext("2d");
      ctx2.clearRect(0, 0, techNoiseCanvas.width, techNoiseCanvas.height);
      ctx2.drawImage(renderer.domElement, 0, 0, techNoiseCanvas.width, techNoiseCanvas.height);
      currentRoadMeshes.forEach((m, i) => { if (m) m.visible = roadVisPrev[i]; });
      renderer.setClearColor(0x000000, 1);
    }

    // Capa 3: INUNDACION Y COLAPSO DE MOVILIDAD (ciclo de ~18 s)
    if (techFloodCanvas && rawWaterData) {
      const { ctx, w, h, P } = prepCultCanvas(techFloodCanvas);
      const bp = burroPts();
      if (bp) {
        const AV_CALI = [[7640, 4090], [7337, 3821], [7040, 3552], [6859, 3412], [6560, 3180]]; // Av. Ciudad de Cali (via mayor al noroccidente del humedal)
        const T = (performance.now() % 18000) / 18000;
        const nivel = T < 0.6 ? T / 0.6 : T < 0.85 ? 1 : 1 - (T - 0.85) / 0.15; // sube, se mantiene, baja
        const avance = 30 + nivel * 520; // metros de offset del borde (la ronda hidraulica es 30 m)
        // buffer real: el humedal relleno + un trazo redondeado de 2*avance de ancho
        // (nunca se enreda, a diferencia del offset por vertices con avances grandes)
        const c0 = P(bp[0][0], bp[0][1]), c1 = P(bp[0][0] + 100, bp[0][1]), c2 = P(bp[0][0], bp[0][1] + 100);
        const pxPorM = (Math.hypot(c1.x - c0.x, c1.y - c0.y) + Math.hypot(c2.x - c0.x, c2.y - c0.y)) / 200;
        const distAlHumedal = (x, y) => { if (ptInPoly(x, y, bp)) return 0; let m = 1e9; for (let i = 0; i < bp.length; i++) { const a = bp[i], b = bp[(i + 1) % bp.length], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2)); m = Math.min(m, Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy)); } return m; };
        const inund = { has: (x, y) => distAlHumedal(x, y) <= avance };
        const cubreVia = AV_CALI.some(p => inund.has(p[0], p[1]));
        ctx.save(); polyPath(ctx, bp, P); ctx.lineJoin = "round"; ctx.lineWidth = 2 * avance * pxPorM; ctx.strokeStyle = "rgba(59,130,246,.30)"; ctx.stroke(); ctx.fillStyle = "rgba(59,130,246,.30)"; ctx.fill(); ctx.restore();
        polyPath(ctx, offsetPoly(bp, 30), P); ctx.setLineDash([4, 3]); ctx.strokeStyle = "#0f172a"; ctx.stroke(); ctx.setLineDash([]);
        polyPath(ctx, bp, P); ctx.fillStyle = "rgba(30,64,120,.55)"; ctx.fill();
        // la avenida y sus carros: rapidos si esta seca, casi quietos y en rojo si esta inundada
        ctx.strokeStyle = "#111418"; ctx.lineWidth = 3; ctx.beginPath(); AV_CALI.forEach((p, i) => { const s = P(p[0], p[1]); i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); }); ctx.stroke();
        techFloodCars = techFloodCars || Array.from({ length: 26 }, (_, i) => ({ u: i / 26 }));
        let L = 0; const seg = []; for (let i = 0; i < AV_CALI.length - 1; i++) { const d = Math.hypot(AV_CALI[i + 1][0] - AV_CALI[i][0], AV_CALI[i + 1][1] - AV_CALI[i][1]); seg.push(d); L += d; }
        techFloodCars.forEach(c => {
          let x, y, dd = c.u * L, i = 0; while (i < seg.length - 1 && dd > seg[i]) { dd -= seg[i]; i++; }
          const r = Math.min(1, dd / seg[i]); x = AV_CALI[i][0] + (AV_CALI[i + 1][0] - AV_CALI[i][0]) * r; y = AV_CALI[i][1] + (AV_CALI[i + 1][1] - AV_CALI[i][1]) * r;
          const mojado = inund.has(x, y);
          c.u = (c.u + (mojado ? 0.00008 : 0.0016)) % 1; // < 10 km/h dentro del agua
          const s = P(x, y, 0.2); ctx.fillStyle = mojado ? "#dc2626" : "#ffffff"; ctx.strokeStyle = "#111418"; ctx.lineWidth = 0.7;
          ctx.beginPath(); ctx.arc(s.x, s.y, 2.2, 0, 7); ctx.fill(); ctx.stroke();
        });
        smallLabel(ctx, cubreVia ? "Lámina de agua sobre la Av. Ciudad de Cali · velocidad < 10 km/h · TAD +2 h" : "Lluvias: la lámina de agua crece sobre la Ronda Hidráulica (30 m)", 10, 16);
        smallLabel(ctx, "UPZ Castilla y Calandaima afectadas", 10, 30);
      }
    }

    // Capa 4: ALCANTARILLADO Y CONEXIONES ERRADAS (EACEH)
    if (techSewerCanvas && rawWaterData && rawEdgesData) {
      const { ctx, w, h, P } = prepCultCanvas(techSewerCanvas);
      const bp = burroPts();
      if (bp) {
        polyPath(ctx, bp, P); ctx.fillStyle = "rgba(30,64,120,.45)"; ctx.fill();
        // red de colectores bajo la malla vial del area (pluvial azul / sanitaria cafe)
        if (!techSewerNet) { techSewerNet = []; rawEdgesData.forEach(([k, pts], i) => { const m = pts[Math.floor(pts.length / 2)]; if (k !== "local" && inBox(m[0], m[1])) techSewerNet.push({ pts, san: i % 2 === 0 }); }); }
        ctx.lineWidth = 1.1;
        techSewerNet.forEach(s => { ctx.strokeStyle = s.san ? "rgba(146,64,14,.55)" : "rgba(37,99,235,.5)"; ctx.setLineDash(s.san ? [] : [3, 2]); ctx.beginPath(); s.pts.forEach((p, j) => { const q = P(p[0], p[1], -0.2); j ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }); ctx.stroke(); });
        ctx.setLineDash([]);
        // canales que llegan al humedal y aguas residuales clandestinas bajando por ellos
        const canales = rawWaterData.filter(b => /Castilla|Ángeles|Angeles/i.test(b.nombre || ""));
        const t = performance.now() / 1000;
        canales.forEach(cn => {
          polyPath(ctx, cn.pts, P); ctx.fillStyle = "rgba(120,72,20,.35)"; ctx.fill();
          const n = cn.pts.length;
          for (let k = 0; k < 14; k++) { const f = ((t * 0.08 + k / 14) % 1), i = Math.floor(f * (n - 1)), p = cn.pts[i], q = P(p[0], p[1], 0.1); ctx.fillStyle = "#78350f"; ctx.beginPath(); ctx.arc(q.x, q.y, 1.8, 0, 7); ctx.fill(); }
          const c0 = P(cn.pts[0][0], cn.pts[0][1]); smallLabel(ctx, cn.nombre, c0.x + 6, c0.y);
        });
        smallLabel(ctx, "EACEH · conexiones erradas vierten aguas residuales al humedal", 10, 16);
        smallLabel(ctx, "Pluvial (azul punteado) · Sanitaria (café)", 10, 30);
      }
    }

    // Restaurar todo para no afectar la vista principal
    toHideCommon.forEach((o, i) => { o.visible = prevVisCommon[i]; });
    if (waterMat && waterOpacityPrev !== null) waterMat.opacity = waterOpacityPrev;
    if (parqueMat && parqueOpacityPrev !== null) parqueMat.opacity = parqueOpacityPrev;
    scene.background = origBg;
    if (roadMat && origRoadColor !== null) roadMat.color.set(origRoadColor);
    if (noiseMesh) noiseMesh.visible = origNoiseVis;
    if (vehInstanced) { vehInstanced.visible = origVehVis; vehInstanced.count = origVehCount; }
    camera.left = origCamL; camera.right = origCamR; camera.top = origCamT; camera.bottom = origCamB;
    camera.updateProjectionMatrix();
  }
  const techBackBtn = document.getElementById("techExplodeBack");
  const techAssembleBtn = document.getElementById("techAssembleBtn");
  const techAssembleBtnText = document.getElementById("techAssembleBtnText");
  const techGuideSvg = document.getElementById("techGuideSvg");
  const techStageEl = document.getElementById("techExplodeStage");
  const techLayer1 = document.getElementById("techLayer1");
  const techLayer2 = document.getElementById("techLayer2");
  const techLayer3 = document.getElementById("techLayer3");
  const techLayer4 = document.getElementById("techLayer4");
  const techFloodCanvas = document.getElementById("techFloodCanvas");
  const techSewerCanvas = document.getElementById("techSewerCanvas");
  const techLayerBase = document.getElementById("techLayerBase");

  let techExplodeStep = 0;
  let techAnimFrame = null;
  let techTime = 0;
  
  function openTechExplode() {
    const lp = document.getElementById("legendPanel");
    if (lp) lp.style.display = "block";
    const cp = document.getElementById("natClimatePanel");
    if (cp) cp.style.display = "none";
    const c1 = document.getElementById("cultCapa1Panel");
    if (c1) c1.style.display = "none";
    const t4 = document.getElementById("techCapa4Panel");
    if (t4) t4.style.display = "block";
    const sw = document.getElementById("sceneWrap");
    if (sw) sw.style.display = "none";
    if (!techOverlay) return;
    if (!noiseMesh && typeof rebuildNoiseGround === "function") rebuildNoiseGround(); // se asegura que el mapa de ruido exista, por si el usuario nunca movio la caja de seccion ni toco "Mostrar ruido" antes de entrar aqui

    const targetW = 960, targetH = 540;
    const layerAspect = targetW / targetH;
    
    camera.left = -viewSize * layerAspect;
    camera.right = viewSize * layerAspect;
    camera.top = viewSize;
    camera.bottom = -viewSize;
    camera.updateProjectionMatrix();
    renderer.setSize(targetW, targetH, false);
    updateCanonicalCamera();

    // Guardar estado original
    const origRoadColor = roadMat ? roadMat.color.getHex() : null;
    const origNoiseVis = noiseMesh ? noiseMesh.visible : false;
    const origBirdsVis = birdsGroup ? birdsGroup.visible : false;
    const origVehVis = vehInstanced ? vehInstanced.visible : false;
    const origVehCount = vehInstanced ? vehInstanced.count : 0;

    const origBg = scene.background;
    scene.background = new THREE.Color(0xffffff);

    // 1. CAPA BASE (Sin ruido, sin carros)
    if (noiseMesh) noiseMesh.visible = false;
    if (birdsGroup) birdsGroup.visible = false;
    if (vehInstanced) { vehInstanced.visible = false; vehInstanced.count = 0; }
    if (roadMat) roadMat.color.set(0x9099a3);

    renderer.render(scene, camera);
    const fotoBase = captureBaseWithContext(); // mismo contexto clarito + area de estudio que en Natural

    // Captura de CONTEXTO (camara alejada), igual que en Escala natural,
    // para que se vea el contexto de Kennedy difuminado detras del corte.
    const techContextImg = document.getElementById("techContextImg");
    const techLayerContext = document.getElementById("techLayerContext");
    if (techContextImg) {
      const contextZoomOut = 3.2;
      camera.left = -viewSize * contextZoomOut * layerAspect;
      camera.right = viewSize * contextZoomOut * layerAspect;
      camera.top = viewSize * contextZoomOut;
      camera.bottom = -viewSize * contextZoomOut;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      techContextImg.src = renderer.domElement.toDataURL("image/png");
      /* techLayerContext ya no se usa: el contexto va integrado en la base */
      camera.left = -viewSize * layerAspect;
      camera.right = viewSize * layerAspect;
      camera.top = viewSize;
      camera.bottom = -viewSize;
      camera.updateProjectionMatrix();
    }

    // 2. CAPA 1 y CAPA 2 (vias+carros, ruido): ya NO se capturan como foto
    // fija aqui - se dejan animando EN VIVO via updateTechLiveMirror(),
    // que corre en cada cuadro del bucle principal mientras este panel
    // este abierto (carros en bucle real, ruido con sus colores en vivo,
    // igual que en la axonometria principal).
    techLiveViewSize = viewSize;

    // Restaurar estado original de la escena
    scene.background = origBg;
    if (roadMat && origRoadColor !== null) roadMat.color.set(origRoadColor);
    if (noiseMesh) noiseMesh.visible = origNoiseVis;
    if (birdsGroup) birdsGroup.visible = origBirdsVis;
    if (vehInstanced) {
      vehInstanced.visible = origVehVis;
      vehInstanced.count = origVehCount;
    }

    const tBase = document.getElementById("techBaseImg"); if (tBase) tBase.src = fotoBase;
    const tRoads = document.getElementById("techRoadsVehImg"); if (tRoads) { tRoads.src = ""; tRoads.style.display = "none"; }
    const tNoise = document.getElementById("techNoiseImg"); if (tNoise) { tNoise.src = ""; tNoise.style.display = "none"; }

    techOverlay.style.display = "flex";
    void techOverlay.offsetWidth;

    techExplodeStep = 0;
    updateTechLayersStep(false);
    startTechAnimation();
  }

  function updateTechLayersStep(animated = true) {
    updateDynamicLegend();
    const sublayers = [techLayer1, techLayer2, techLayer3, techLayer4];
    const tags = techOverlay.querySelectorAll(".tech-layer-tag");

    const allDiamonds = techOverlay.querySelectorAll(".sublayer-diamond");
    allDiamonds.forEach(d => {
      const isBase = d.parentElement && d.parentElement.id === "techLayerBase";
      if (isBase) {
        d.style.background = "transparent";
        d.style.boxShadow = "none";
        d.style.borderColor = "transparent";
      } else {
        d.style.background = "rgba(255, 255, 255, 0.92)";
        d.style.border = "1.5px solid rgba(15, 23, 42, 0.35)";
        d.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.08)";
      }
    });

    if (techExplodeStep === 0) {
      if (techLayerBase) { techLayerBase.style.top = "50%"; techLayerBase.style.opacity = "1"; techLayerBase.style.transform = "translate(-50%, -40%)"; }
      sublayers.forEach(l => { if (l) { l.style.opacity = "0"; l.style.top = "50%"; l.style.transform = "translate(-50%, -40%)"; } });
      tags.forEach(t => { t.style.opacity = "0"; });
      if (techGuideSvg) techGuideSvg.style.opacity = "0";
      if (techAssembleBtnText) techAssembleBtnText.textContent = "Extraer Capa 1: Red Vial y Tráfico";
      return;
    }

    if (techExplodeStep % 2 === 1 && techExplodeStep <= 7) {
      const activeIdx = Math.floor(techExplodeStep / 2);
      if (techLayerBase) { techLayerBase.style.top = "60%"; techLayerBase.style.opacity = "1"; techLayerBase.style.transform = "translate(-50%, -40%)"; }
      sublayers.forEach((l, index) => {
        if (!l) return;
        if (index === activeIdx) {
          const expTop = "-4%"; // capa extraida siempre ARRIBA
          l.style.top = expTop;
          l.style.transform = "translate(-50%, 0)";
          l.style.opacity = "1";
          const tag = l.querySelector(".tech-layer-tag");
          if (tag) tag.style.opacity = "1";
        } else {
          l.style.top = "60%";
          l.style.transform = "translate(-50%, -40%)";
          l.style.opacity = "0";
          const tag = l.querySelector(".tech-layer-tag");
          if (tag) tag.style.opacity = "0";
        }
      });
      if (techGuideSvg) techGuideSvg.style.opacity = "1";
      drawTechGuideLines();
      if (techAssembleBtnText) techAssembleBtnText.textContent = `Asentar Capa ${activeIdx + 1} en el Territorio`;
      return;
    }

    if (techExplodeStep % 2 === 0 && techExplodeStep <= 8) {
      techOverlay.querySelectorAll(".sublayer-diamond").forEach(dd => { dd.style.background = "transparent"; dd.style.boxShadow = "none"; dd.style.borderColor = "transparent"; });
      const settledIdx = (techExplodeStep / 2) - 1;
      const nextNames = ["Capa 2: Simulación de Ruido", "Capa 3: Inundación y Movilidad", "Capa 4: Alcantarillado", "Ver Apilamiento Explotado Completo"];

      if (techLayerBase) { techLayerBase.style.top = "50%"; techLayerBase.style.opacity = "1"; techLayerBase.style.transform = "translate(-50%, -40%)"; }
      sublayers.forEach((l, index) => {
        if (!l) return;
        if (index === settledIdx) {
          l.style.top = "50%";
          l.style.transform = "translate(-50%, -40%)";
          l.style.opacity = "1";
          const tag = l.querySelector(".tech-layer-tag");
          if (tag) tag.style.opacity = "1";
        } else {
          l.style.top = "50%";
          l.style.transform = "translate(-50%, -40%)";
          l.style.opacity = "0";
          const tag = l.querySelector(".tech-layer-tag");
          if (tag) tag.style.opacity = "0";
        }
      });
      if (techGuideSvg) techGuideSvg.style.opacity = "0";
      if (techAssembleBtnText) techAssembleBtnText.textContent = `Extraer ${nextNames[settledIdx]}`;
      return;
    }

    if (techExplodeStep === 9) {
      if (techLayerBase) { techLayerBase.style.top = "72%"; techLayerBase.style.opacity = "1"; techLayerBase.style.transform = "translate(-50%, 0)"; }
      sublayers.forEach((l) => {
        if (!l) return;
        const expTop = l.dataset.explodedTop || "52%";
        l.style.top = expTop;
        l.style.transform = "translate(-50%, 0)";
        l.style.opacity = "1";
        const tag = l.querySelector(".tech-layer-tag");
        if (tag) tag.style.opacity = "1";
      });
      tags.forEach(t => { t.style.opacity = "1"; });
      if (techGuideSvg) techGuideSvg.style.opacity = "1";
      drawTechGuideLines();
      if (techAssembleBtnText) techAssembleBtnText.textContent = "Integrar TODAS las capas en el Territorio";
      return;
    }

    if (techExplodeStep === 10) {
      techOverlay.querySelectorAll(".sublayer-diamond").forEach(dd => { dd.style.background = "transparent"; dd.style.boxShadow = "none"; dd.style.borderColor = "transparent"; });
      if (techLayerBase) { techLayerBase.style.top = "50%"; techLayerBase.style.opacity = "1"; techLayerBase.style.transform = "translate(-50%, -40%)"; }
      sublayers.forEach((l) => {
        if (!l) return;
        l.style.top = "50%";
        l.style.transform = "translate(-50%, -40%)";
        l.style.opacity = "1";
        const tag = l.querySelector(".tech-layer-tag");
        if (tag) tag.style.opacity = "0";
      });
      if (techGuideSvg) techGuideSvg.style.opacity = "0";
      if (techAssembleBtnText) techAssembleBtnText.textContent = "Reiniciar Recorrido en Base";
      return;
    }
  }

  function advanceTechAssemble() {
    techExplodeStep++;
    if (techExplodeStep > 10) {
      techExplodeStep = 0;
      updateTechLayersStep(false);
      closeTechExplode();
      // document.getElementById("sceneWrap").style.display = "block"; // Return to live 3D
      return;
    }
    updateTechLayersStep(true);
  }

  if (techAssembleBtn) techAssembleBtn.addEventListener("click", advanceTechAssemble);
  if (techStageEl) techStageEl.addEventListener("click", () => { advanceTechAssemble(); });

  function drawTechGuideLines() {
    if (!techGuideSvg || !techOverlay) return;
    techGuideSvg.innerHTML = "";
    const SVGNS = "http://www.w3.org/2000/svg";
    const layerBase = techLayerBase;
    if (!layerBase) return;

    const sublayers = [techLayer1, techLayer2];
    let layerTop = sublayers.find(l => l && parseFloat(l.style.opacity || "0") > 0.1 && (l.getBoundingClientRect().top < layerBase.getBoundingClientRect().top - 15));
    if (!layerTop) layerTop = techLayer1;

    const rTop = layerTop.getBoundingClientRect();
    const rBase = layerBase.getBoundingClientRect();
    const rStage = techGuideSvg.getBoundingClientRect();
    if (Math.abs(rTop.top - rBase.top) < 15) return;

    const cornersRel = [
      { rx: 0.5, ry: 0.0 },
      { rx: 1.0, ry: 0.5 },
      { rx: 0.5, ry: 1.0 },
      { rx: 0.0, ry: 0.5 },
    ];

    cornersRel.forEach(c => {
      const x1 = rTop.left + rTop.width * c.rx - rStage.left;
      const y1 = rTop.top + rTop.height * c.ry - rStage.top;
      const x2 = rBase.left + rBase.width * c.rx - rStage.left;
      const y2 = rBase.top + rBase.height * c.ry - rStage.top;

      const line = document.createElementNS(SVGNS, "line");
      line.setAttribute("x1", String(x1)); line.setAttribute("y1", String(y1));
      line.setAttribute("x2", String(x2)); line.setAttribute("y2", String(y2));
      line.setAttribute("stroke", "rgba(225, 29, 72, 0.35)");
      line.setAttribute("stroke-width", "1.3");
      line.setAttribute("stroke-dasharray", "4 4");
      techGuideSvg.appendChild(line);

      const dot1 = document.createElementNS(SVGNS, "circle");
      dot1.setAttribute("cx", String(x1)); dot1.setAttribute("cy", String(y1)); dot1.setAttribute("r", "2.5");
      dot1.setAttribute("fill", "rgba(225, 29, 72, 0.5)");
      techGuideSvg.appendChild(dot1);

      const dot2 = document.createElementNS(SVGNS, "circle");
      dot2.setAttribute("cx", String(x2)); dot2.setAttribute("cy", String(y2)); dot2.setAttribute("r", "2.5");
      dot2.setAttribute("fill", "rgba(225, 29, 72, 0.5)");
      techGuideSvg.appendChild(dot2);
    });
  }

  function startTechAnimation() {
    if (techAnimFrame) cancelAnimationFrame(techAnimFrame);
  }

  function closeTechExplode() {
    const p = document.getElementById("escalaZoomPanel");
    if (p) p.style.display = "none";
    const l = document.getElementById("legendActiveLayer");
    if (l) l.style.display = "none";
    if (!techOverlay) return;
    const sceneWrapRestore2 = document.getElementById("sceneWrap");
    // if (sceneWrapRestore2) sceneWrapRestore2.style.display = "block";
    if (techAnimFrame) { cancelAnimationFrame(techAnimFrame); techAnimFrame = null; }
    techLiveViewSize = null; // apaga el espejo en vivo de carros/ruido

    const sublayers = techOverlay.querySelectorAll(".tech-sublayer");
    sublayers.forEach(l => {
      l.style.opacity = "0";
      l.style.transform = "translate(-50%, -20px)";
    });
    const techLayerContext2 = document.getElementById("techLayerContext");
    if (techLayerContext2) techLayerContext2.style.opacity = "0";

    const origW = wrap.clientWidth, origH = wrap.clientHeight;
    renderer.setSize(origW, origH, false);
    const restoreAspect = origW / origH;
    camera.left = -viewSize * restoreAspect;
    camera.right = viewSize * restoreAspect;
    camera.top = viewSize;
    camera.bottom = -viewSize;
    camera.updateProjectionMatrix();

    setTimeout(() => {
      techOverlay.style.display = "none";
      unzoomAll();
    }, 400);
  }

  if (techBackBtn) techBackBtn.addEventListener("click", closeTechExplode);

  // ============================================================
  // CAPA 1: Sistema Inerte y Límite Físico-Hidrológico
  // Fluctuación 0,2 ha a 6,69 ha, espejo hídrico realista pizarra/turquesa profundo, nodo más hondo, Ronda Hidráulica 30m, ZMPA y escorrentías
  // ============================================================

  // ============================================================
  // AVES (capa 3) y INTERCAMBIO GENETICO (capa 4) - Escala natural
  // ============================================================
  const LLANOS_REAL = { x: -16094, y: -2029 }; // coordenada dada por el usuario (4.5744, -74.2990)
  const NORTE_REAL = { x: 7400, y: 20000 };    // entrada de migratorias boreales (patos) desde el norte
  const garzaImg = new Image(); garzaImg.src = "./assets/garza.png";
  const tinguaImg = new Image(); tinguaImg.src = "./assets/tingua.png";
  function ptInPoly(x, y, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }
  function randomPointIn(pts, shrink) {
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const sp = pts.map(p => [cx + (p[0] - cx) * shrink, cy + (p[1] - cy) * shrink]);
    const xs = sp.map(p => p[0]), ys = sp.map(p => p[1]);
    for (let k = 0; k < 60; k++) {
      const x = Math.min(...xs) + Math.random() * (Math.max(...xs) - Math.min(...xs));
      const y = Math.min(...ys) + Math.random() * (Math.max(...ys) - Math.min(...ys));
      if (ptInPoly(x, y, sp)) return [x, y];
    }
    return [cx, cy];
  }
  function edgePointOf(pts) { // punto sobre la orilla del humedal
    const i = Math.floor(Math.random() * pts.length), j = (i + 1) % pts.length, t = Math.random();
    return [pts[i][0] + (pts[j][0] - pts[i][0]) * t, pts[i][1] + (pts[j][1] - pts[i][1]) * t];
  }
  function drawFlyingBird(ctx, x, y, s, color, flap) {
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = color; ctx.strokeStyle = "rgba(15,23,42,.7)"; ctx.lineWidth = 0.8;
    const wy = flap ? -s : s * 0.55;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-s * 0.5, wy * 0.4, -s, wy); ctx.quadraticCurveTo(-s * 0.5, s * 0.1, 0, s * 0.15);
    ctx.quadraticCurveTo(s * 0.5, s * 0.1, s, wy); ctx.quadraticCurveTo(s * 0.5, wy * 0.4, 0, 0);
    ctx.fill(); ctx.stroke(); ctx.restore();
  }
  function drawSprite(ctx, img, x, y, hPx) {
    if (!img.complete || !img.naturalWidth) return;
    const wPx = hPx * img.naturalWidth / img.naturalHeight;
    ctx.drawImage(img, x - wPx / 2, y - hPx, wPx, hPx);
  }
  function smallLabel(ctx, text, x, y) {
    ctx.font = "600 9px 'Segoe UI',sans-serif";
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = "rgba(255,255,255,.88)"; ctx.fillRect(x - 3, y - 9, tw + 6, 12);
    ctx.fillStyle = "#0f172a"; ctx.fillText(text, x, y);
  }

  // Capa 3: bandadas que entran volando desde su lugar de origen (segun
  // la epoca) y se reparten por TODO el humedal, no a un solo punto.
  let natFlocks = [], natFlockMonth = null;
  function drawNatFlocks(ctx, projectPoint, burro, mes) {
    const garzasLlaneras = [1, 2, 3, 6, 7, 8, 12].includes(mes); // temporada seca: llegan garzas desde el origen indicado
    const borealesPatos = [9, 10, 11].includes(mes);          // migratorias boreales (patos) desde el norte
    if (natFlockMonth !== mes) {
      natFlockMonth = mes;
      natFlocks = [];
      const add = (n, from, kind) => {
        for (let i = 0; i < n; i++) {
          const tgt = randomPointIn(burro.pts, 0.95);
          const dx = from.x - tgt[0], dy = from.y - tgt[1], L = Math.hypot(dx, dy);
          const start = [tgt[0] + dx / L * 1100, tgt[1] + dy / L * 1100]; // aparecen ya volando por el territorio, en esa direccion
          natFlocks.push({ kind, start, tgt, t: -Math.random() * 0.8, speed: 0.0009 + Math.random() * 0.0006, ph: Math.random() * 6 });
        }
      };
      if (garzasLlaneras) add(22, LLANOS_REAL, "garza");
      if (borealesPatos) add(18, NORTE_REAL, "pato");
      for (let i = 0; i < 10; i++) { const e = edgePointOf(burro.pts); natFlocks.push({ kind: "tingua", start: e, tgt: e, t: 1, speed: 0, ph: Math.random() * 6 }); }
    }
    natFlocks.forEach(b => {
      b.t = Math.min(1, b.t + b.speed); b.ph += 0.25;
      if (b.t < 0) return;
      const e = b.t < 1 ? 1 - Math.pow(1 - b.t, 2) : 1;
      const x = b.start[0] + (b.tgt[0] - b.start[0]) * e, y = b.start[1] + (b.tgt[1] - b.start[1]) * e;
      const p = projectPoint(x, y, b.t < 1 ? 0.6 : 0.05);
      if (b.kind === "tingua") { drawSprite(ctx, tinguaImg, p.x + Math.sin(b.ph * 0.2) * 1.5, p.y, 17); return; }
      if (b.t < 1) drawFlyingBird(ctx, p.x, p.y, 7, b.kind === "garza" ? "#ffffff" : "#6b4f33", Math.sin(b.ph) > 0);
      else if (b.kind === "garza") drawSprite(ctx, garzaImg, p.x, p.y, 21);
      else drawFlyingBird(ctx, p.x, p.y, 5, "#6b4f33", false);
    });
    const firstIn = natFlocks.find(b => b.kind !== "tingua" && b.t > 0 && b.t < 0.5);
    if (firstIn) {
      const p = projectPoint(firstIn.start[0] + (firstIn.tgt[0] - firstIn.start[0]) * 0.3, firstIn.start[1] + (firstIn.tgt[1] - firstIn.start[1]) * 0.3, 0.6);
      smallLabel(ctx, garzasLlaneras ? "Garzas: llegada desde los Llanos" : "Patos migratorios boreales", p.x + 8, p.y - 6);
    }
  }

  // Capa 4: INTERCAMBIO GENETICO, narrado en 4 fases que se repiten.
  let natGenAgents = null, natGenStart = 0;
  function renderNaturalMacroLayer(mesNum) {
    if (!natMacroCanvas || !rawWaterData) return;
    const rect = natMacroCanvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = rect.width || 720, h = rect.height || 405;
    if (natMacroCanvas.width !== Math.round(w * dpr) || natMacroCanvas.height !== Math.round(h * dpr)) { natMacroCanvas.width = Math.round(w * dpr); natMacroCanvas.height = Math.round(h * dpr); }
    const ctx = natMacroCanvas.getContext("2d");
    ctx.resetTransform(); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h);
    const projectPoint = (rx, ry, el = 0.05) => projectPointToLayer(rx, ry, el, w, h);
    const burro = rawWaterData.find(b => (b.nombre || "").includes("Burro"));
    if (!burro || !burro.pts || burro.pts.length < 4) return;
    // humedal de fondo
    const sp = burro.pts.map(p => projectPoint(p[0], p[1]));
    ctx.beginPath(); sp.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath();
    ctx.fillStyle = "rgba(96,140,170,.35)"; ctx.fill(); ctx.strokeStyle = "rgba(51,65,85,.6)"; ctx.lineWidth = 1; ctx.stroke();

    const now = performance.now();
    if (!natGenAgents) {
      natGenStart = now;
      const dx = LLANOS_REAL.x - 7300, dy = LLANOS_REAL.y - 3300, L = Math.hypot(dx, dy);
      natGenAgents = {
        garzas: Array.from({ length: 14 }, () => { const t = randomPointIn(burro.pts, 0.55); return { tgt: t, start: [t[0] + dx / L * 1100, t[1] + dy / L * 1100], d: Math.random() * 0.25, ph: Math.random() * 6 }; }),
        tinguas: Array.from({ length: 12 }, () => ({ from: randomPointIn(burro.pts, 0.4), to: edgePointOf(burro.pts), ph: Math.random() * 6 })),
        plantas: Array.from({ length: 18 }, () => ({ p: randomPointIn(burro.pts, 0.8), d: Math.random() * 0.8 })),
      };
    }
    const CYCLE = 28000, T = ((now - natGenStart) % CYCLE) / CYCLE; // 0..1
    const phase = T < 0.25 ? 0 : T < 0.5 ? 1 : T < 0.75 ? 2 : 3;
    const local = (T % 0.25) / 0.25;
    const ease = x => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);

    // Plantas nuevas (fase 4) - crecen desde las semillas que traen las garzas
    if (phase === 3) natGenAgents.plantas.forEach(pl => {
      const g = ease((local - pl.d * 0.6) / 0.4); if (g <= 0) return;
      const p = projectPoint(pl.p[0], pl.p[1]);
      ctx.fillStyle = "#3f7d3a";
      for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.ellipse(p.x + k * 1.6 * g, p.y - 3 * g, 1.2 * g, 3.4 * g, k * 0.5, 0, Math.PI * 2); ctx.fill(); }
    });
    // Tinguas: en el centro al inicio, se van a las orillas (fase 2 en adelante)
    natGenAgents.tinguas.forEach(tg => {
      const e = phase === 0 ? 0 : phase === 1 ? ease(local) : 1;
      const x = tg.from[0] + (tg.to[0] - tg.from[0]) * e, y = tg.from[1] + (tg.to[1] - tg.from[1]) * e;
      const p = projectPoint(x, y); tg.ph += 0.1;
      drawSprite(ctx, tinguaImg, p.x, p.y + Math.sin(tg.ph) * 0.4, 17);
    });
    // Garzas: llegan volando (fase 1), ocupan el espejo central, se alimentan
    natGenAgents.garzas.forEach(gz => {
      gz.ph += 0.22;
      const e = phase === 0 ? ease((local - gz.d) / (1 - gz.d)) : 1;
      if (e <= 0) return;
      const x = gz.start[0] + (gz.tgt[0] - gz.start[0]) * e, y = gz.start[1] + (gz.tgt[1] - gz.start[1]) * e;
      const p = projectPoint(x, y, e < 1 ? 0.6 : 0.05);
      if (e < 1) drawFlyingBird(ctx, p.x, p.y, 7, "#ffffff", Math.sin(gz.ph) > 0);
      else {
        const peck = phase >= 2 ? Math.max(0, Math.sin(gz.ph * 0.6)) * 2 : 0; // se agachan a comer
        drawSprite(ctx, garzaImg, p.x, p.y + peck, 22);
        if (phase === 3 && Math.sin(gz.ph * 0.3) > 0.9) { ctx.fillStyle = "#8a6a3a"; ctx.beginPath(); ctx.arc(p.x + 3, p.y + 1, 0.9, 0, 7); ctx.fill(); } // semillas
      }
    });
    const cxp = projectPoint(burro.pts.reduce((s, p) => s + p[0], 0) / burro.pts.length, Math.max(...burro.pts.map(p => p[1])));
    const texts = ["Intercambio genético: llegada de garzas migratorias", "Redistribución de fauna: las tinguas se desplazan a las orillas", "Garzas alimentándose en el espejo de agua central", "Dispersión de semillas: crecen nuevas plantas en el humedal"];
    smallLabel(ctx, texts[phase], cxp.x - 90, cxp.y - 14);
  }

  let natBurroBaseHa = null;
  function renderNaturalWaterLayer(mesNum) {
    if (!natWaterCanvas || !rawWaterData) return;
    const info = HUMEDAL_CICLO[mesNum - 1] || HUMEDAL_CICLO[3];
    natMesLabel.textContent = MESES_NAT[mesNum - 1];
    natFloodStats.innerHTML = `<span style="color:#475569;">${info.temporada}</span> · Nivel freático: <strong style="color:#0369a1">${info.profundidad_m.toFixed(2)} m</strong>`;
    const natExpansionFactor = 1 + (info.expansion_pct / 100) * 0.55;
    if (natBurroBaseHa === null) {
      const burroArea = rawWaterData.find(b => (b.nombre || "").includes("Burro"));
      if (burroArea && burroArea.pts && burroArea.pts.length > 2) {
        let area2 = 0;
        for (let i = 0; i < burroArea.pts.length; i++) {
          const [x1, y1] = burroArea.pts[i];
          const [x2, y2] = burroArea.pts[(i + 1) % burroArea.pts.length];
          area2 += x1 * y2 - x2 * y1;
        }
        natBurroBaseHa = Math.abs(area2) / 2 / 10000;
      }
    }
    const natPctLabelEl = document.getElementById("natPctLabel");
    const natFloodBarEl = document.getElementById("natFloodBar");
    const natHaEl = document.getElementById("natHa");
    if (natPctLabelEl) natPctLabelEl.textContent = `+${info.expansion_pct.toFixed(1)}%`;
    if (natFloodBarEl) natFloodBarEl.style.width = Math.min(100, info.expansion_pct / 50 * 100) + "%";
    if (natHaEl) natHaEl.textContent = natBurroBaseHa != null ? (natBurroBaseHa * natExpansionFactor * natExpansionFactor).toFixed(2) : "—";

    const rect = natWaterCanvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = rect.width, h = rect.height;
    if (natWaterCanvas.width !== Math.round(w * dpr) || natWaterCanvas.height !== Math.round(h * dpr)) {
      natWaterCanvas.width = Math.round(w * dpr);
      natWaterCanvas.height = Math.round(h * dpr);
    }
    const ctx = natWaterCanvas.getContext("2d");
    ctx.resetTransform();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const projectPoint = (rx, ry, el = 0.05) => projectPointToLayer(rx, ry, el, w, h);

    const burro = rawWaterData.find(b => (b.nombre || "").includes("Burro"));
    const expansionFactor = 1 + (info.expansion_pct / 100) * 0.55;

    // 1. ZMPA y Ronda Hidráulica (RH 30m) - Dibujo técnico arquitectónico
    if (burro && burro.pts && burro.pts.length > 3) {
      const cx = burro.pts.reduce((s, p) => s + p[0], 0) / burro.pts.length;
      const cy = burro.pts.reduce((s, p) => s + p[1], 0) / burro.pts.length;

      // ZMPA (Zona de Manejo y Preservación Ambiental) - Trama sutil gris azulado
      const zmpaPts = burro.pts.map(p => [cx + (p[0] - cx) * 1.52, cy + (p[1] - cy) * 1.52]);
      const scrZmpa = zmpaPts.map(p => projectPoint(p[0], p[1]));
      ctx.beginPath();
      ctx.moveTo(scrZmpa[0].x, scrZmpa[0].y);
      for (let i = 1; i < scrZmpa.length; i++) ctx.lineTo(scrZmpa[i].x, scrZmpa[i].y);
      ctx.closePath();
      ctx.fillStyle = "rgba(224, 231, 239, 0.40)";
      ctx.fill();
      ctx.lineWidth = 1.0;
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = "rgba(71, 85, 105, 0.45)";
      ctx.stroke();
      ctx.setLineDash([]);

      // Ronda Hidráulica RH 30m - Trazo continuo sobrio
      const rhPts = offsetPoly(burro.pts, 30); // ronda hidraulica real: 30 m alrededor
      const scrRh = rhPts.map(p => projectPoint(p[0], p[1]));
      ctx.beginPath();
      ctx.moveTo(scrRh[0].x, scrRh[0].y);
      for (let i = 1; i < scrRh.length; i++) ctx.lineTo(scrRh[i].x, scrRh[i].y);
      ctx.closePath();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = "rgba(51, 65, 85, 0.65)";
      ctx.stroke();
    }

    // 2. Cuerpos de agua (Humedal y afluentes) - Azul pizarra / mineral realista con reflejos tenues
    rawWaterData.forEach(body => {
      const isBurro = body === burro;
      if (!isBurro) return; // USER REQUEST: Remove dark blue patches that aren't the humedal
      let pts = body.pts;
      if (isBurro) {
        // Forma REAL exacta (asi calza con el humedal de la base al bajar).
        // La crecida del mes se dibuja aparte como halo translucido.
        const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
        const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
        const halo = offsetPoly(pts, info.expansion_pct * 0.9).map(p => projectPoint(p[0], p[1])); // cota de inundacion por offset
        ctx.beginPath(); halo.forEach((s, i) => i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y)); ctx.closePath();
        ctx.fillStyle = `rgba(96,150,190,${0.18 + 0.06 * Math.sin(natWaterTime * 2)})`; ctx.fill();
        ctx.setLineDash([3, 3]); ctx.strokeStyle = "rgba(30,64,96,.55)"; ctx.lineWidth = 0.9; ctx.stroke(); ctx.setLineDash([]);
      }

      const scrPts = pts.map(p => projectPoint(p[0], p[1]));
      if (scrPts.length < 3) return;

      ctx.beginPath();
      ctx.moveTo(scrPts[0].x, scrPts[0].y);
      for (let i = 1; i < scrPts.length; i++) ctx.lineTo(scrPts[i].x, scrPts[i].y);
      ctx.closePath();

      if (isBurro) {
        // Degradado de espejo de agua profundo realista (azul pizarra grisáceo a azul cerúleo profundo)
        const waveX = Math.sin(natWaterTime * 0.5) * 20;
        const waveY = Math.cos(natWaterTime * 0.4) * 15;
        const grad = ctx.createLinearGradient(waveX, waveY, w * 0.8 + waveX, h * 0.8 + waveY);
        // Velo translucido en movimiento (oleaje) encima de la FOTO real del
        // agua, que es el mismo render de la base: asi calza exacto al bajar.
        grad.addColorStop(0, "rgba(56, 120, 170, 0.18)");
        grad.addColorStop(0.5, "rgba(120, 180, 220, 0.34)");
        grad.addColorStop(1, "rgba(40, 90, 140, 0.18)");
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = "rgba(15, 23, 42, 0.85)";
        ctx.stroke();

        // Ondas de superficie sutiles con tono agua sedosa
        for (let ring = 1; ring <= 3; ring++) {
          const rOffset = ((natWaterTime * 10 + ring * 22) % 80);
          const rAlpha = Math.max(0, 1 - rOffset / 80) * 0.25;
          const centerSO = projectPoint(7518.49, 3137.57);
          if (centerSO.inFront) {
            ctx.beginPath();
            ctx.ellipse(centerSO.x, centerSO.y, rOffset * 1.5, rOffset * 0.8, -0.32, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(186, 230, 253, ${rAlpha})`;
            ctx.lineWidth = 1.8;
            ctx.stroke();
          }
        }
      } else {
        ctx.fillStyle = "rgba(71, 85, 105, 0.7)";
        ctx.fill();
        ctx.lineWidth = 1.0;
      }
    });

    // Punto más hondo: [7518.49, 3137.57]
    const hondoPt = projectPoint(7518.49, 3137.57);

    // SVG: Anotaciones de Capa 1 y Escorrentías subterráneas hacia Humedal La Vaca
    if (natWaterSvg) {
      natWaterSvg.innerHTML = "";
      const SVGNS = "http://www.w3.org/2000/svg";

      // Nodo cota más profunda
      if (hondoPt.inFront) {
        const g = document.createElementNS(SVGNS, "g");
        g.setAttribute("transform", `translate(${hondoPt.x}, ${hondoPt.y})`);

        const ring = document.createElementNS(SVGNS, "circle");
        ring.setAttribute("r", (10 + Math.sin(natWaterTime * 2.5) * 2.5).toFixed(1));
        ring.setAttribute("fill", "none");
        ring.setAttribute("stroke", "#334155");
        ring.setAttribute("stroke-width", "1.2");
        ring.setAttribute("stroke-dasharray", "2 2");
        g.appendChild(ring);

        const dot = document.createElementNS(SVGNS, "circle");
        dot.setAttribute("r", "4");
        dot.setAttribute("fill", "#0f172a");
        dot.setAttribute("stroke", "#ffffff");
        dot.setAttribute("stroke-width", "1.5");
        g.appendChild(dot);

        // Directriz técnica fina
        const line = document.createElementNS(SVGNS, "polyline");
        line.setAttribute("points", "0,0 18,-18 105,-18");
        line.setAttribute("fill", "none");
        line.setAttribute("stroke", "#475569");
        line.setAttribute("stroke-width", "1.1");
        g.appendChild(line);

        // Tarjeta técnica arquitectónica sobria
        const bg = document.createElementNS(SVGNS, "rect");
        bg.setAttribute("x", "18"); bg.setAttribute("y", "-32");
        bg.setAttribute("width", "160"); bg.setAttribute("height", "26");
        bg.setAttribute("rx", "3"); bg.setAttribute("fill", "rgba(255,255,255,0.96)");
        bg.setAttribute("stroke", "#cbd5e1"); bg.setAttribute("stroke-width", "1");
        g.appendChild(bg);

        const txt = document.createElementNS(SVGNS, "text");
        txt.setAttribute("x", "24"); txt.setAttribute("y", "-20");
        txt.setAttribute("font-family", "'Segoe UI', sans-serif");
        txt.setAttribute("font-size", "9.5px"); txt.setAttribute("font-weight", "700");
        txt.setAttribute("fill", "#0f172a");
        txt.textContent = "Nodo Central de Depresión Hídrica";
        g.appendChild(txt);

        const sub = document.createElementNS(SVGNS, "text");
        sub.setAttribute("x", "24"); sub.setAttribute("y", "-10");
        sub.setAttribute("font-family", "'Segoe UI', sans-serif");
        sub.setAttribute("font-size", "8px"); sub.setAttribute("font-weight", "600");
        sub.setAttribute("fill", "#475569");
        sub.textContent = `Sector Suroriental · Prof. ${info.profundidad_m.toFixed(2)} m`;
        g.appendChild(sub);

        natWaterSvg.appendChild(g);
      }

      // 3. Escorrentía subterránea hacia Humedal La Vaca (infiltración y flujo freático)
      // Corregido: La Vaca esta al SUROESTE del Burro (centro real 6018,1980),
      // no al noroeste como estaba antes. Sale del borde sur del Burro.
      const subFlujoPts = [
        [7080, 3020],
        [6780, 2700],
        [6480, 2400],
        [6230, 2160] // Hacia Humedal La Vaca (borde noreste)
      ];
      const scrSub = subFlujoPts.map(p => projectPoint(p[0], p[1]));
      if (scrSub.length >= 3 && scrSub[0].inFront) {
        let d = `M ${scrSub[0].x} ${scrSub[0].y}`;
        for (let i = 1; i < scrSub.length; i++) d += ` L ${scrSub[i].x} ${scrSub[i].y}`;

        const subPath = document.createElementNS(SVGNS, "path");
        subPath.setAttribute("d", d);
        subPath.setAttribute("fill", "none");
        subPath.setAttribute("stroke", "#475569");
        subPath.setAttribute("stroke-width", "1.6");
        subPath.setAttribute("stroke-dasharray", "3 4");
        subPath.setAttribute("stroke-dashoffset", String((-natWaterTime * 12) % 18));
        natWaterSvg.appendChild(subPath);

        const subLbl = document.createElementNS(SVGNS, "text");
        subLbl.setAttribute("x", String((scrSub[1].x + scrSub[2].x) / 2));
        subLbl.setAttribute("y", String((scrSub[1].y + scrSub[2].y) / 2 - 6));
        subLbl.setAttribute("font-family", "'Segoe UI', sans-serif");
        subLbl.setAttribute("font-size", "8.5px");
        subLbl.setAttribute("font-weight", "700");
        subLbl.setAttribute("fill", "#334155");
        subLbl.textContent = "Gradiente freático → H. La Vaca";
        natWaterSvg.appendChild(subLbl);
      }

      // 4. SUBCUENCA EL TINTAL: Afluentes y canales
      const flowCorridors = [
        {
          name: "Río Fucha → C. Los Ángeles de Castilla",
          pts: [
            [8308.3, 2562.3],
            [8180.0, 2589.2],
            [7978.3, 2669.2],
            [7833.3, 2778.2],
            [7738.4, 2839.9],
            [7598.2, 2966.1],
            [7588.3, 2974.2]
          ],
          color: "#334155"
        },
        {
          name: "Cuenca Río Fucha → Canal Castilla",
          pts: [
            [6367.3, 4677.7],
            [6390.1, 4631.6],
            [6505.9, 4446.9],
            [6604.7, 4286.1],
            [6733.5, 4076.6],
            [6820.7, 3942.2],
            [6983.1, 3865.5],
            [7080.0, 3750.0]
          ],
          color: "#475569"
        },
        {
          name: "Río Tunjuelo & Río Bogotá → Canal Américas",
          pts: [
            [5497.5, 4670.4],
            [5556.4, 4581.7],
            [5737.0, 4386.5],
            [6104.6, 3975.6],
            [6419.8, 3631.9],
            [6572.5, 3453.6],
            [6658.1, 3306.9],
            [7020.0, 3360.0]
          ],
          color: "#334155"
        }
      ];

      flowCorridors.forEach(corr => {
        const screenPts = corr.pts.map(p => projectPoint(p[0], p[1]));
        if (screenPts.length >= 3 && screenPts[0].inFront && screenPts[screenPts.length - 1].inFront) {
          const flowG = document.createElementNS(SVGNS, "g");
          let pathD = `M ${screenPts[0].x} ${screenPts[0].y}`;
          for (let pi = 1; pi < screenPts.length; pi++) pathD += ` L ${screenPts[pi].x} ${screenPts[pi].y}`;

          const flowBg = document.createElementNS(SVGNS, "path");
          flowBg.setAttribute("d", pathD);
          flowBg.setAttribute("fill", "none");
          flowBg.setAttribute("stroke", "rgba(255,255,255,0.85)");
          flowBg.setAttribute("stroke-width", "3.6");
          flowG.appendChild(flowBg);

          const flowPath = document.createElementNS(SVGNS, "path");
          flowPath.setAttribute("d", pathD);
          flowPath.setAttribute("fill", "none");
          flowPath.setAttribute("stroke", corr.color);
          flowPath.setAttribute("stroke-width", "2.0");
          flowPath.setAttribute("stroke-dasharray", "6 4");
          const dashOffset = (natWaterTime * 18) % 20;
          flowPath.setAttribute("stroke-dashoffset", (-dashOffset).toFixed(1));
          flowG.appendChild(flowPath);

          const pStart = screenPts[0];
          const startDot = document.createElementNS(SVGNS, "circle");
          startDot.setAttribute("cx", String(pStart.x));
          startDot.setAttribute("cy", String(pStart.y));
          startDot.setAttribute("r", "3.5");
          startDot.setAttribute("fill", corr.color);
          startDot.setAttribute("stroke", "#ffffff");
          startDot.setAttribute("stroke-width", "1.5");
          flowG.appendChild(startDot);

          const pEnd = screenPts[screenPts.length - 1], pPrev = screenPts[screenPts.length - 2];
          const angle = Math.atan2(pEnd.y - pPrev.y, pEnd.x - pPrev.x);
          const arrowLen = 9;
          const x1 = pEnd.x - arrowLen * Math.cos(angle - Math.PI / 6);
          const y1 = pEnd.y - arrowLen * Math.sin(angle - Math.PI / 6);
          const x2 = pEnd.x - arrowLen * Math.cos(angle + Math.PI / 6);
          const y2 = pEnd.y - arrowLen * Math.sin(angle + Math.PI / 6);
          const arrow = document.createElementNS(SVGNS, "polygon");
          arrow.setAttribute("points", `${pEnd.x},${pEnd.y} ${x1},${y1} ${x2},${y2}`);
          arrow.setAttribute("fill", corr.color);
          flowG.appendChild(arrow);

          const midIdx = Math.floor(screenPts.length / 2);
          const pLabel = screenPts[midIdx] || screenPts[0];
          const labelG = document.createElementNS(SVGNS, "g");
          const offsetX = pLabel.x > w * 0.5 ? -145 : 10;
          const offsetY = pLabel.y < 50 ? 20 : -10;
          labelG.setAttribute("transform", `translate(${pLabel.x + offsetX}, ${pLabel.y + offsetY})`);

          const textWidth = corr.name.length * 5.8 + 14;
          const rectBg = document.createElementNS(SVGNS, "rect");
          rectBg.setAttribute("x", "-3");
          rectBg.setAttribute("y", "-12");
          rectBg.setAttribute("width", String(textWidth));
          rectBg.setAttribute("height", "16");
          rectBg.setAttribute("rx", "3");
          rectBg.setAttribute("fill", "rgba(255,255,255,0.95)");
          rectBg.setAttribute("stroke", "#cbd5e1");
          rectBg.setAttribute("stroke-width", "1");
          labelG.appendChild(rectBg);

          const label = document.createElementNS(SVGNS, "text");
          label.setAttribute("x", "4");
          label.setAttribute("y", "0");
          label.setAttribute("font-family", "'Segoe UI', sans-serif");
          label.setAttribute("font-size", "9px");
          label.setAttribute("font-weight", "700");
          label.setAttribute("fill", "#1e293b");
          label.textContent = corr.name;
          labelG.appendChild(label);

          flowG.appendChild(labelG);
          natWaterSvg.appendChild(flowG);
        }
      });
    }
  }

  // ============================================================
  // CAPA 2: Estratificación Vegetal y Cobertura Florística
  // Tonos realistas: Verde salvia, verde oliva desaturado, ocre terroso para Typha y copas de árboles con volumen sombreado
  // ============================================================
  // ---- Mirlas dibujadas EN LA PROPIA AXONOMETRIA de la Capa 2 (antes
  // solo se veian en el corte 3D) -- vuelan entre los arboles de color
  // (Sauco/Capuli/Urapan) que ya se identifican al dibujar la capa. ----
  let natMirlaTreePts = [];
  let natMirlaBirds = null, natMirlaRaf = null;
  function startNatMirlaAnim() {
    const canvas = document.getElementById("natMirlaCanvas");
    if (!canvas) return;
    if (natMirlaRaf) cancelAnimationFrame(natMirlaRaf);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    function resize() {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.round((r.width || 720) * dpr);
      canvas.height = Math.round((r.height || 405) * dpr);
    }
    resize();
    const ctx = canvas.getContext("2d");
    if (!natMirlaBirds || natMirlaBirds.length === 0) {
      natMirlaBirds = Array.from({ length: 5 }, (_, i) => ({ dur: 5 + Math.random() * 2, phase: Math.random() * 6 }));
    }
    const start = performance.now();
    function smoothK(k) { return k * k * (3 - 2 * k); }
    function loop(now) {
      const tSec = (now - start) / 1000;
      ctx.resetTransform(); ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (natMirlaTreePts.length >= 2) {
        natMirlaBirds.forEach((b, i) => {
          const t = ((tSec + b.phase) % b.dur) / b.dur;
          // Llega al arbol (0-30%), se queda posada (30-70%), sale (70-100%)
          const cycleIdx = Math.floor((tSec + b.phase) / b.dur);
          if (b._cycleIdx !== cycleIdx || !b.fromPt) {
            b._cycleIdx = cycleIdx;
            b.fromPt = natMirlaTreePts[Math.floor(Math.random() * natMirlaTreePts.length)];
            b.toPt = natMirlaTreePts[Math.floor(Math.random() * natMirlaTreePts.length)];
          }
          let x, y, flapping;
          if (t < 0.3) {
            const k = smoothK(t / 0.3);
            x = b.fromPt.x + (b.toPt.x - b.fromPt.x) * k;
            y = b.fromPt.y + (b.toPt.y - b.fromPt.y) * k - Math.sin(k * Math.PI) * 10;
            flapping = true;
          } else if (t < 0.7) {
            x = b.toPt.x; y = b.toPt.y; flapping = false; // posada quieta
          } else {
            const k = smoothK((t - 0.7) / 0.3);
            x = b.toPt.x; y = b.toPt.y - k * 12; // se eleva y desaparece
            flapping = true;
          }
          const s = flapping ? (1 - Math.abs(Math.sin(tSec * 10 + i)) * 0.3) : 1;
          ctx.beginPath();
          ctx.moveTo(x - 3.2, y);
          ctx.quadraticCurveTo(x, y - 2.6 * s, x + 3.2, y);
          ctx.quadraticCurveTo(x, y - 0.8 * s, x - 3.2, y);
          ctx.fillStyle = "#1c1c1c";
          ctx.fill();
        });
      }
      natMirlaRaf = requestAnimationFrame(loop);
    }
    natMirlaRaf = requestAnimationFrame(loop);
  }
  function stopNatMirlaAnim() {
    if (natMirlaRaf) cancelAnimationFrame(natMirlaRaf);
    natMirlaRaf = null;
    const canvas = document.getElementById("natMirlaCanvas");
    if (canvas) { const ctx = canvas.getContext("2d"); ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }
  function renderNaturalVegLayer(mesNum) {
    natMirlaTreePts = [];
    if (!natVegCanvas) return;
    const rect = natVegCanvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = rect.width || 720, h = rect.height || 405;
    if (natVegCanvas.width !== Math.round(w * dpr) || natVegCanvas.height !== Math.round(h * dpr)) {
      natVegCanvas.width = Math.round(w * dpr);
      natVegCanvas.height = Math.round(h * dpr);
    }
    const ctx = natVegCanvas.getContext("2d");
    ctx.resetTransform();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const projectPoint = (rx, ry, el = 0.05) => projectPointToLayer(rx, ry, el, w, h);
    const info = HUMEDAL_CICLO[(mesNum || 4) - 1] || HUMEDAL_CICLO[3];
    const isDrySeason = info.profundidad_m < 1.1;
    const typhaAdvance = isDrySeason ? 0.88 : 1.08;

    // 1. Zonas verdes y parques generales - Verde oliva salvia suave
    if (rawParquesData && rawParquesData.length) {
      rawParquesData.forEach(p => {
        if (!p.pts || p.pts.length < 3) return;
        const scrPts = p.pts.map(pt => projectPoint(pt[0], pt[1]));
        if (scrPts.every(pt => !pt.inFront)) return;

        ctx.beginPath();
        ctx.moveTo(scrPts[0].x, scrPts[0].y);
        for (let i = 1; i < scrPts.length; i++) ctx.lineTo(scrPts[i].x, scrPts[i].y);
        ctx.closePath();
        ctx.fillStyle = "rgba(164, 180, 148, 0.40)"; // Verde salvia suave desaturado
        ctx.fill();
        ctx.lineWidth = 1.0;
        ctx.strokeStyle = "rgba(110, 130, 95, 0.50)";
        ctx.stroke();
      });
    }

    // 2. Zonificación florística alrededor del Humedal El Burro
    if (rawWaterData) {
      const burro = rawWaterData.find(b => (b.nombre || "").includes("Burro"));
      if (burro && burro.pts && burro.pts.length > 3) {
        const cx = burro.pts.reduce((s, p) => s + p[0], 0) / burro.pts.length;
        const cy = burro.pts.reduce((s, p) => s + p[1], 0) / burro.pts.length;

        // Franja terrestre ZMPA 12,14 ha: chilco, tinto, alisos - Verde bosque agrisado
        const zmpaVegPts = burro.pts.map(p => [cx + (p[0] - cx) * 1.45, cy + (p[1] - cy) * 1.45]);
        const scrZmpa = zmpaVegPts.map(p => projectPoint(p[0], p[1]));
        ctx.beginPath();
        ctx.moveTo(scrZmpa[0].x, scrZmpa[0].y);
        for (let i = 1; i < scrZmpa.length; i++) ctx.lineTo(scrZmpa[i].x, scrZmpa[i].y);
        ctx.closePath();
        ctx.fillStyle = "rgba(128, 148, 114, 0.35)";
        ctx.fill();
        ctx.lineWidth = 1.1;
        ctx.strokeStyle = "rgba(82, 102, 70, 0.55)";
        ctx.stroke();

        // Franja invasiva de Typha angustifolia (Eneas) y gramíneas - Ocre pajizo / verde junco
        const typhaPts = burro.pts.map(p => [cx + (p[0] - cx) * typhaAdvance, cy + (p[1] - cy) * typhaAdvance]);
        const scrTypha = typhaPts.map(p => projectPoint(p[0], p[1]));
        ctx.beginPath();
        ctx.moveTo(scrTypha[0].x, scrTypha[0].y);
        for (let i = 1; i < scrTypha.length; i++) ctx.lineTo(scrTypha[i].x, scrTypha[i].y);
        ctx.closePath();
        // Color realista: en estiaje ocre terroso apagado, en lluvia verde caña junco
        ctx.fillStyle = isDrySeason ? "rgba(175, 143, 90, 0.40)" : "rgba(138, 154, 106, 0.35)";
        ctx.fill();
        ctx.lineWidth = 1.1;
        ctx.strokeStyle = isDrySeason ? "rgba(140, 110, 65, 0.65)" : "rgba(95, 115, 75, 0.65)";
        ctx.stroke();

        // Especies invasoras (Kikuyo, Enea, Junquera) -- puntitos naranjas
        // chiquitos, DENTRO del vector real del humedal (no de la franja
        // ampliada).
        let seed = 7;
        function rndInv() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
        for (let i = 0; i < 22; i++) {
          const ang = rndInv() * Math.PI * 2, rad = rndInv() * 0.78;
          const idx = Math.floor(rndInv() * burro.pts.length);
          const refP = burro.pts[idx];
          const px = cx + Math.cos(ang) * rad * (refP[0] - cx);
          const py = cy + Math.sin(ang) * rad * (refP[1] - cy);
          const ptInv = projectPoint(px, py);
          if (!ptInv.inFront) continue;
          ctx.beginPath();
          ctx.arc(ptInv.x, ptInv.y, 1.0, 0, Math.PI * 2);
          ctx.fillStyle = "#f97316";
          ctx.fill();
        }
      }
    }

    // 3. Árboles georreferenciados - Copas con sombreado de copa realista (no bolas fluorescentes)
    if (treeMeshes && treeMeshes[0] && treeMeshes[0].data) {
      const trees = treeMeshes[0].data;
      const localTrees = trees.filter(t => t[0] >= 6700 && t[0] <= 8100 && t[1] >= 2600 && t[1] <= 4250);
      localTrees.forEach(t => {
        const [x, y, hMeters, especie] = t;
        const pt = projectPoint(x, y);
        if (!pt.inFront || pt.x < -20 || pt.x > w + 20 || pt.y < -20 || pt.y > h + 20) return;
        const r = Math.max(2.5, Math.min(5.5, (hMeters || 6) * 0.45));
        const esp = especie || "";

        // Sombra arrojada tenue
        ctx.beginPath();
        ctx.ellipse(pt.x + 1.2, pt.y + 1.2, r * 1.1, r * 0.7, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
        ctx.fill();

        // Copa del árbol coloreada por especie (para ubicarlos en el
        // mapa): Saúco morado, Capulí rosa, Urapán verde lima -- mismos
        // colores que en Agentes, para que se puedan ubicar en la capa.
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        const espLower = esp.toLowerCase();
        if (espLower.includes("sauco") || espLower.includes("saúco")) {
          ctx.fillStyle = "#b06bff"; // Saúco -- morado
        } else if (espLower.includes("cerezo") || espLower.includes("capul")) {
          ctx.fillStyle = "#ff5fa8"; // Capulí -- rosa
        } else if (espLower.includes("urapan") || espLower.includes("urapán") || espLower.includes("fresno")) {
          ctx.fillStyle = "#a3e635"; // Urapán -- verde lima
        } else if (esp.includes("Chilco") || esp.includes("Tinto")) {
          ctx.fillStyle = "#4a684b"; // Matorral nativo sobrio (otras especies)
        } else {
          ctx.fillStyle = "#5d7356"; // Arbóreo estándar (otras especies)
        }
        ctx.fill();
        ctx.lineWidth = 0.6;
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.stroke();
        // Se guarda la posicion en pantalla para que las mirlas (abajo)
        // sepan a que arboles volar, igual que en el corte 3D.
        if (espLower.includes("sauco") || espLower.includes("saúco") || espLower.includes("cerezo") || espLower.includes("capul") || espLower.includes("urapan") || espLower.includes("urapán") || espLower.includes("fresno")) {
          natMirlaTreePts.push({ x: pt.x, y: pt.y });
        }
      });
    }

    // Anotación en SVG técnica
    if (natVegSvg) {
      natVegSvg.innerHTML = "";
      const SVGNS = "http://www.w3.org/2000/svg";
      const tagPt = projectPoint(7420, 3350);
      if (tagPt.inFront) {
        const g = document.createElementNS(SVGNS, "g");
        g.setAttribute("transform", `translate(${tagPt.x}, ${tagPt.y})`);

        const line = document.createElementNS(SVGNS, "polyline");
        line.setAttribute("points", "0,0 18,-18 115,-18");
        line.setAttribute("fill", "none");
        line.setAttribute("stroke", "#475569");
        line.setAttribute("stroke-width", "1.1");
        g.appendChild(line);

        const bg = document.createElementNS(SVGNS, "rect");
        bg.setAttribute("x", "18"); bg.setAttribute("y", "-32");
        bg.setAttribute("width", "175"); bg.setAttribute("height", "26");
        bg.setAttribute("rx", "3"); bg.setAttribute("fill", "rgba(255,255,255,0.96)");
        bg.setAttribute("stroke", "#cbd5e1"); bg.setAttribute("stroke-width", "1");
        g.appendChild(bg);

        const txt = document.createElementNS(SVGNS, "text");
        txt.setAttribute("x", "24"); txt.setAttribute("y", "-20");
        txt.setAttribute("font-family", "'Segoe UI', sans-serif");
        txt.setAttribute("font-size", "9.5px"); txt.setAttribute("font-weight", "700");
        txt.setAttribute("fill", "#1e293b");
        txt.textContent = isDrySeason ? "Avance de Especies Invasoras" : "Inundación Frena Invasión";
        g.appendChild(txt);

        const sub = document.createElementNS(SVGNS, "text");
        sub.setAttribute("x", "24"); sub.setAttribute("y", "-10");
        sub.setAttribute("font-family", "'Segoe UI', sans-serif");
        sub.setAttribute("font-size", "8px"); sub.setAttribute("font-weight", "600");
        sub.setAttribute("fill", "#64748b");
        sub.textContent = isDrySeason ? "Najas y pasto Kikuyo ocupan el lecho seco" : "El nivel hídrico cubre temporalmente el avance";
        g.appendChild(sub);

        natVegSvg.appendChild(g);
      }
    }
  }

  // ============================================================
  // CAPA 3: Nichos Ecológicos & Dinámicas Estacionales de Aves (Comunidades Bióticas)
  // Explica con claridad cartográfica cómo el nivel del agua define los hábitats
  // ============================================================
  
  // Variables para sprites de aves
  const birdSprites = {
    duck: new Image(),
    heron: new Image(),
    duckReady: false,
    heronReady: false
  };

  function processBirdImage(img, key) {
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const x = c.getContext("2d");
    x.drawImage(img, 0, 0);
    const idata = x.getImageData(0, 0, c.width, c.height);
    const d = idata.data;
    for (let i = 0; i < d.length; i += 4) {
      // Remove white/light background
      if (d[i] > 230 && d[i+1] > 230 && d[i+2] > 230) {
        d[i+3] = 0; // Transparent
      }
    }
    x.putImageData(idata, 0, 0);
    birdSprites[key] = c;
    birdSprites[key + 'Ready'] = true;
  }

  birdSprites.duck.onload = () => processBirdImage(birdSprites.duck, 'duckProcessed');
  birdSprites.duck.src = "assets/pato.png";
  
  birdSprites.heron.onload = () => processBirdImage(birdSprites.heron, 'heronProcessed');
  birdSprites.heron.src = "assets/garza.png";

  function renderNaturalBirdLayer(mesNum) {
    if (!natBirdCanvas || !rawWaterData) return;
    const rect = natBirdCanvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = rect.width || 720, h = rect.height || 405;
    if (natBirdCanvas.width !== Math.round(w * dpr) || natBirdCanvas.height !== Math.round(h * dpr)) {
      natBirdCanvas.width = Math.round(w * dpr);
      natBirdCanvas.height = Math.round(h * dpr);
    }
    const ctx = natBirdCanvas.getContext("2d");
    ctx.resetTransform();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const projectPoint = (rx, ry, el = 0.05) => projectPointToLayer(rx, ry, el, w, h);
    const realMesNum = mesNum || 4;
    const info = HUMEDAL_CICLO[realMesNum - 1] || HUMEDAL_CICLO[3];
    
    // Meses de lluvia: 3, 4, 5, 10, 11
    const isRainy = [3, 4, 5, 10, 11].includes(realMesNum);
    // Meses boreales: 9, 10
    const isBoreal = [9, 10].includes(realMesNum);
    // Meses secos: 1, 2, 3, 6, 7, 8
    const isDry = !isRainy;

    const burro = rawWaterData.find(b => (b.nombre || "").includes("Burro"));
    if (!burro || !burro.pts || burro.pts.length < 4) return;

    const cx = burro.pts.reduce((s, p) => s + p[0], 0) / burro.pts.length;
    const cy = burro.pts.reduce((s, p) => s + p[1], 0) / burro.pts.length;

    // 1. DIBUJAR LAS ZONAS DE HÁBITAT (Zonificación de fondo clara)
    // A) Franja litoral / Juncal de anidación perimetral
    const juncosPts = burro.pts.map(p => [cx + (p[0] - cx) * 1.32, cy + (p[1] - cy) * 1.32]);
    const scrJuncos = juncosPts.map(p => projectPoint(p[0], p[1]));
    ctx.beginPath();
    ctx.moveTo(scrJuncos[0].x, scrJuncos[0].y);
    for (let i = 1; i < scrJuncos.length; i++) ctx.lineTo(scrJuncos[i].x, scrJuncos[i].y);
    ctx.closePath();
    ctx.fillStyle = "rgba(180, 195, 165, 0.35)"; // Franja vegetal litoral
    ctx.fill();
    ctx.lineWidth = 1.0;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "#64748b";
    ctx.stroke();
    ctx.setLineDash([]);

    // B) Espejo de agua central / Playón estacional según temporada
    const expFactor = isRainy ? 1.15 : 0.82;
    const waterPts = offsetPoly(burro.pts, isRainy ? 25 : -30);
    const scrWater = waterPts.map(p => projectPoint(p[0], p[1]));
    ctx.beginPath();
    ctx.moveTo(scrWater[0].x, scrWater[0].y);
    for (let i = 1; i < scrWater.length; i++) ctx.lineTo(scrWater[i].x, scrWater[i].y);
    ctx.closePath();
    if (isRainy) {
      ctx.fillStyle = "rgba(64, 100, 126, 0.45)"; // Lámina profunda de agua
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = "#334155";
      ctx.stroke();
    } else {
      // En verano: playón limoso expuesto alrededor del agua remanente
      ctx.fillStyle = "rgba(188, 160, 120, 0.45)"; // Playón de barro/limo
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = "#92683b";
      ctx.stroke();

      // Espejo interior reducido
      const innerPts = burro.pts.map(p => [cx + (p[0] - cx) * 0.45, cy + (p[1] - cy) * 0.45]);
      const scrInner = innerPts.map(p => projectPoint(p[0], p[1]));
      ctx.beginPath();
      ctx.moveTo(scrInner[0].x, scrInner[0].y);
      for (let i = 1; i < scrInner.length; i++) ctx.lineTo(scrInner[i].x, scrInner[i].y);
      ctx.closePath();
      ctx.fillStyle = "rgba(64, 100, 126, 0.55)";
      ctx.fill();
      ctx.lineWidth = 1.0;
      ctx.strokeStyle = "#334155";
      ctx.stroke();
    }

    if (false) { // aves viejas (iban a un solo punto) reemplazadas por drawNatFlocks()
    // 2. AGENTES Y SILUETAS BIOLÓGICAS CLARAMENTE DISTINGUIBLES
    const centerSO = projectPoint(7518.49, 3137.57);
    // Función auxiliar para dibujar un sprite de pájaro
    function drawBirdSprite(spriteKey, x, y, width, height, isFlipped = false) {
      if (birdSprites[spriteKey + 'Ready']) {
        ctx.save();
        ctx.translate(x, y);
        if (isFlipped) ctx.scale(-1, 1);
        ctx.drawImage(birdSprites[spriteKey], -width/2, -height/2, width, height);
        ctx.restore();
      }
    }

    if (isRainy) {
      // --- LLUVIAS (Garzas) ---
      // Entran volando desde el Oriente (derecha) hacia el centro
      for (let g = 0; g < 6; g++) {
        const flightProg = ((natWaterTime * 0.2 + g * 0.3) % 1.0);
        const startX = w + 50 + g * 20;
        const startY = centerSO.y - 100 + g * 15;
        const ang = (g / 6) * Math.PI * 2;
        const rad = 25;
        const destX = centerSO.x + Math.cos(ang) * rad;
        const destY = centerSO.y + Math.sin(ang) * rad * 0.5;

        let bx, by;
        if (flightProg < 0.4) {
          const t = flightProg / 0.4;
          bx = startX + (destX - startX) * t;
          by = startY + (destY - startY) * t;
          by += Math.sin(natWaterTime * 15 + g) * 5;
        } else {
          bx = destX + Math.cos(natWaterTime * 0.5 + g) * 5;
          by = destY + Math.sin(natWaterTime * 0.5 + g) * 3;
          ctx.beginPath();
          ctx.ellipse(bx, by + 12, 6, 2, 0, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(0,0,0,0.2)";
          ctx.fill();
        }
        drawBirdSprite('heronProcessed', bx, by, 35, 35, bx > centerSO.x);
      }
      
      // Tinguas residentes desplazadas a la orilla (refugiadas)
      for (let t = 0; t < 5; t++) {
        const ang = (t / 5) * Math.PI * 2;
        const tx = centerSO.x + Math.cos(ang) * 65;
        const ty = centerSO.y + Math.sin(ang) * 45;
        ctx.beginPath();
        ctx.arc(tx, ty, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = "#1e3a8a";
        ctx.fill();
      }
    } else {
      // --- SECO (Patos) ---
      for (let p = 0; p < 8; p++) {
        const ang = (p / 8) * Math.PI * 2 + natWaterTime * 0.05;
        const rad = 45 + Math.sin(natWaterTime * 0.8 + p) * 15;
        const px = centerSO.x + Math.cos(ang) * rad;
        const py = centerSO.y + Math.sin(ang) * rad * 0.6;
        ctx.beginPath();
        ctx.ellipse(px, py + 8, 5, 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.fill();
        drawBirdSprite('duckProcessed', px, py, 22, 22, (Math.cos(ang) > 0));
      }
      for (let t = 0; t < 5; t++) {
        const ang = (t / 5) * Math.PI * 2 + natWaterTime * -0.1;
        const tx = centerSO.x + Math.cos(ang) * 20;
        const ty = centerSO.y + Math.sin(ang) * 15;
        ctx.beginPath();
        ctx.arc(tx, ty, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = "#1e3a8a";
        ctx.fill();
      }
    }

    if (isBoreal) {
      for (let b = 0; b < 10; b++) {
        const prog = ((natWaterTime * 0.4 + b * 0.1) % 1.0);
        const startX = centerSO.x - 100 + b * 30;
        const startY = -50;
        const ang = (b / 10) * Math.PI * 2;
        const destX = centerSO.x + Math.cos(ang) * 35;
        const destY = centerSO.y + Math.sin(ang) * 25;
        let bx, by;
        if (prog < 0.3) {
          const t = prog / 0.3;
          bx = startX + (destX - startX) * t;
          by = startY + (destY - startY) * t;
          by += Math.sin(natWaterTime * 20 + b) * 8;
        } else {
          bx = destX + Math.cos(natWaterTime * 0.8 + b) * 10;
          by = destY + Math.sin(natWaterTime * 0.8 + b) * 5;
        }
        ctx.beginPath();
        ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#78716c";
        ctx.fill();
      }
    }

    } // fin de las aves viejas desactivadas
    // 3. CARTOGRAFÍA Y LEYENDA TÉCNICA VISIBLE DIRECTAMENTE EN LA CAPA
    if (natBirdSvg) {
      natBirdSvg.innerHTML = "";
      const SVGNS = "http://www.w3.org/2000/svg";

      const legG = document.createElementNS(SVGNS, "g");
      legG.setAttribute("transform", "translate(16, 16)");

      const legBg = document.createElementNS(SVGNS, "rect");
      legBg.setAttribute("x", "0"); legBg.setAttribute("y", "0");
      legBg.setAttribute("width", "300"); legBg.setAttribute("height", "58");
      legBg.setAttribute("rx", "4"); legBg.setAttribute("fill", "rgba(255,255,255,0.96)");
      legBg.setAttribute("stroke", "#cbd5e1"); legBg.setAttribute("stroke-width", "1");
      legG.appendChild(legBg);

      const t1 = document.createElementNS(SVGNS, "text");
      t1.setAttribute("x", "10"); t1.setAttribute("y", "15");
      t1.setAttribute("font-family", "'Segoe UI', sans-serif");
      t1.setAttribute("font-size", "10px"); t1.setAttribute("font-weight", "800");
      t1.setAttribute("fill", "#0f172a");
      let title = "DINÁMICA ESTIAJE (VERANO)";
      if (isRainy) title = "DINÁMICA AGUAS ALTAS (LLUVIAS)";
      if (isBoreal) title = "MIGRACIÓN BOREAL (SEP - OCT)";
      t1.textContent = title;
      legG.appendChild(t1);

      // Fila 1 leyenda
      const ic1 = document.createElementNS(SVGNS, "circle");
      ic1.setAttribute("cx", "16"); ic1.setAttribute("cy", "29"); ic1.setAttribute("r", "4");
      ic1.setAttribute("fill", isRainy ? "#ffffff" : (isBoreal ? "#78716c" : "#855835"));
      ic1.setAttribute("stroke", isRainy ? "#0f172a" : "#fef3c7");
      ic1.setAttribute("stroke-width", "1");
      legG.appendChild(ic1);

      const tx1 = document.createElementNS(SVGNS, "text");
      tx1.setAttribute("x", "26"); tx1.setAttribute("y", "32");
      tx1.setAttribute("font-family", "'Segoe UI', sans-serif");
      tx1.setAttribute("font-size", "8.5px"); tx1.setAttribute("font-weight", "600");
      tx1.setAttribute("fill", "#334155");
      let desc1 = "Patos y Zambullidores en lodo expuesto";
      if (isRainy) desc1 = "Garzas Reales llegan desde Llanos Orientales";
      if (isBoreal) desc1 = "Chorlos y Reinitas migran desde el Norte";
      tx1.textContent = desc1;
      legG.appendChild(tx1);

      // Fila 2 leyenda
      const ic2 = document.createElementNS(SVGNS, "circle");
      ic2.setAttribute("cx", "16"); ic2.setAttribute("cy", "46"); ic2.setAttribute("r", "4");
      ic2.setAttribute("fill", "#1e3a8a");
      ic2.setAttribute("stroke", "#ffffff");
      ic2.setAttribute("stroke-width", "1.5");
      legG.appendChild(ic2);

      const tx2 = document.createElementNS(SVGNS, "text");
      tx2.setAttribute("x", "26"); tx2.setAttribute("y", "49");
      tx2.setAttribute("font-family", "'Segoe UI', sans-serif");
      tx2.setAttribute("font-size", "8.5px"); tx2.setAttribute("font-weight", "600");
      tx2.setAttribute("fill", "#334155");
      tx2.textContent = isRainy ? "Tinguas desplazadas a la orilla" : "Tinguas residentes en zona hídrica";
      legG.appendChild(tx2);

      natBirdSvg.appendChild(legG);
    }
    drawNatFlocks(ctx, projectPoint, burro, realMesNum); // bandadas desde su origen, repartidas por todo el humedal
  }

  // ============================================================
  // CAPA 4: Corredores de Conectividad Regional e Intercambio Genético
  // Explica con exactitud geográfica el papel del Humedal El Burro como nodo de la EEP:
  // - Corredor 1: Vuelo biológico desde los Cerros Orientales / Páramo de Cruz Verde siguiendo la cuenca del Río Fucha hacia El Burro.
  // - Corredor 2: Conexión con la ronda del Río Bogotá hacia el Humedal La Conejera y Sabana Norte.
  // - Corredor 3: Vínculo freático y biológico de proximidad hacia el Humedal La Vaca y Humedal El Tintal.
  // ============================================================
  function renderNaturalMacroLayerOld(mesNum) {
    if (!natMacroCanvas) return;
    const rect = natMacroCanvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = rect.width || 720, h = rect.height || 405;
    if (natMacroCanvas.width !== Math.round(w * dpr) || natMacroCanvas.height !== Math.round(h * dpr)) {
      natMacroCanvas.width = Math.round(w * dpr);
      natMacroCanvas.height = Math.round(h * dpr);
    }
    const ctx = natMacroCanvas.getContext("2d");
    ctx.resetTransform();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const projectPoint = (rx, ry, el = 0.05) => projectPointToLayer(rx, ry, el, w, h);
    const burroCenter = projectPoint(7518.49, 3137.57);

    // 1. TRAMA CARTOGRÁFICA DEL NODO CENTRAL (El Burro como HUB de intercambio genético)
    if (burroCenter.inFront) {
      // Área de amortiguación biológica regional
      ctx.beginPath();
      ctx.ellipse(burroCenter.x, burroCenter.y, 75, 42, -0.3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(226, 232, 240, 0.40)";
      ctx.fill();
      ctx.lineWidth = 1.0;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "#64748b";
      ctx.stroke();
      ctx.setLineDash([]);

      // Ondas concéntricas de dispersión de semillas y fauna
      for (let r = 1; r <= 3; r++) {
        const rad = (natWaterTime * 12 + r * 28) % 95;
        const alpha = Math.max(0, 1 - rad / 95) * 0.35;
        ctx.beginPath();
        ctx.ellipse(burroCenter.x, burroCenter.y, rad * 1.5, rad * 0.8, -0.3, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(51, 65, 85, ${alpha})`;
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }
    }

    // 2. CORREDORES ECOLÓGICOS REGIONALES CON POLILÍNEAS DETALLADAS E HITOS
    if (natMacroSvg) {
      natMacroSvg.innerHTML = "";
      const SVGNS = "http://www.w3.org/2000/svg";

      const macroRoutes = [
        {
          name: "Cerros Orientales (Cruz Verde) → Cuenca Río Fucha → El Burro",
          desc: "Corredor aviar este-oeste (2.600 msnm a 2.540 msnm)",
          hitorigen: "Cerros Orientales",
          pts: [
            [8600, 2200],
            [8200, 2600],
            [7850, 2900],
            [7518, 3137]
          ],
          color: "#334155"
        },
        {
          name: "Río Bogotá & Sabana Norte → Conexión Humedales",
          desc: "Ruta migratoria longitudinal del altiplano cundiboyacense",
          hitorigen: "Río Bogotá / Sabana Norte",
          pts: [
            [6100, 4600],
            [6600, 4100],
            [7050, 3600],
            [7518, 3137]
          ],
          color: "#475569"
        },
        {
          name: "Intercambio Local Tintal: El Burro ↔ Humedal La Vaca",
          desc: "Paso de baja altura para dispersión de flora y aves residentes",
          hitorigen: "H. La Vaca",
          pts: [
            [6750, 3750],
            [7100, 3450],
            [7518, 3137]
          ],
          color: "#0f766e"
        }
      ];

      macroRoutes.forEach(r => {
        const scr = r.pts.map(p => projectPoint(p[0], p[1]));
        if (scr.length < 2 || !scr[scr.length - 1].inFront) return;

        const pathG = document.createElementNS(SVGNS, "g");

        // Trayectoria de fondo para destacar
        let d = `M ${scr[0].x} ${scr[0].y}`;
        for (let i = 1; i < scr.length; i++) d += ` L ${scr[i].x} ${scr[i].y}`;

        const bgLine = document.createElementNS(SVGNS, "path");
        bgLine.setAttribute("d", d);
        bgLine.setAttribute("fill", "none");
        bgLine.setAttribute("stroke", "rgba(255,255,255,0.85)");
        bgLine.setAttribute("stroke-width", "4");
        pathG.appendChild(bgLine);

        // Línea animada punteada
        const flowLine = document.createElementNS(SVGNS, "path");
        flowLine.setAttribute("d", d);
        flowLine.setAttribute("fill", "none");
        flowLine.setAttribute("stroke", r.color);
        flowLine.setAttribute("stroke-width", "2.2");
        flowLine.setAttribute("stroke-dasharray", "6 4");
        const dashOffset = (natWaterTime * 18) % 20;
        flowLine.setAttribute("stroke-dashoffset", (-dashOffset).toFixed(1));
        pathG.appendChild(flowLine);

        // Marcador del hito de origen
        const pStart = scr[0];
        const dotStart = document.createElementNS(SVGNS, "circle");
        dotStart.setAttribute("cx", String(pStart.x)); dotStart.setAttribute("cy", String(pStart.y));
        dotStart.setAttribute("r", "4.5");
        dotStart.setAttribute("fill", r.color);
        dotStart.setAttribute("stroke", "#ffffff");
        dotStart.setAttribute("stroke-width", "1.5");
        pathG.appendChild(dotStart);

        // Hito origen texto
        const hitTxt = document.createElementNS(SVGNS, "text");
        hitTxt.setAttribute("x", String(pStart.x + 8)); hitTxt.setAttribute("y", String(pStart.y - 4));
        hitTxt.setAttribute("font-family", "'Segoe UI', sans-serif");
        hitTxt.setAttribute("font-size", "8.5px"); hitTxt.setAttribute("font-weight", "700");
        hitTxt.setAttribute("fill", "#0f172a");
        hitTxt.textContent = r.hitorigen;
        pathG.appendChild(hitTxt);

        // Flecha hacia El Burro
        const pEnd = scr[scr.length - 1], pPrev = scr[scr.length - 2];
        const angle = Math.atan2(pEnd.y - pPrev.y, pEnd.x - pPrev.x);
        const arrowLen = 11;
        const x1 = pEnd.x - arrowLen * Math.cos(angle - Math.PI / 6);
        const y1 = pEnd.y - arrowLen * Math.sin(angle - Math.PI / 6);
        const x2 = pEnd.x - arrowLen * Math.cos(angle + Math.PI / 6);
        const y2 = pEnd.y - arrowLen * Math.sin(angle + Math.PI / 6);
        const arrow = document.createElementNS(SVGNS, "polygon");
        arrow.setAttribute("points", `${pEnd.x},${pEnd.y} ${x1},${y1} ${x2},${y2}`);
        arrow.setAttribute("fill", r.color);
        pathG.appendChild(arrow);

        natMacroSvg.appendChild(pathG);
      });

      // Panel explicativo superior izquierdo con estructura territorial
      const boxG = document.createElementNS(SVGNS, "g");
      boxG.setAttribute("transform", "translate(24, 0)");

      const boxBg = document.createElementNS(SVGNS, "rect");
      boxBg.setAttribute("x", "0"); boxBg.setAttribute("y", "0");
      boxBg.setAttribute("width", "270"); boxBg.setAttribute("height", "54");
      boxBg.setAttribute("rx", "4"); boxBg.setAttribute("fill", "rgba(255,255,255,0.96)");
      boxBg.setAttribute("stroke", "#cbd5e1"); boxBg.setAttribute("stroke-width", "1");
      boxG.appendChild(boxBg);

      const title = document.createElementNS(SVGNS, "text");
      title.setAttribute("x", "10"); title.setAttribute("y", "15");
      title.setAttribute("font-family", "'Segoe UI', sans-serif");
      title.setAttribute("font-size", "10px"); title.setAttribute("font-weight", "800");
      title.setAttribute("fill", "#0f172a");
      title.textContent = "ESTRUCTURA ECOLÓGICA PRINCIPAL (EEP)";
      boxG.appendChild(title);

      const d1 = document.createElementNS(SVGNS, "text");
      d1.setAttribute("x", "10"); d1.setAttribute("y", "29");
      d1.setAttribute("font-family", "'Segoe UI', sans-serif");
      d1.setAttribute("font-size", "8.5px"); d1.setAttribute("font-weight", "600");
      d1.setAttribute("fill", "#334155");
      d1.textContent = "• Conector Biológico: Cerros Orientales ↔ Río Bogotá";
      boxG.appendChild(d1);

      const d2 = document.createElementNS(SVGNS, "text");
      d2.setAttribute("x", "10"); d2.setAttribute("y", "43");
      d2.setAttribute("font-family", "'Segoe UI', sans-serif");
      d2.setAttribute("font-size", "8.5px"); d2.setAttribute("font-weight", "600");
      d2.setAttribute("fill", "#0f766e");
      d2.textContent = "• Nodo Genético Tintal: El Burro ↔ La Vaca ↔ Techo";
      boxG.appendChild(d2);

      natMacroSvg.appendChild(boxG);

      // Nodo central Humedal El Burro destacado
      if (burroCenter.inFront) {
        const hubG = document.createElementNS(SVGNS, "g");
        hubG.setAttribute("transform", `translate(${burroCenter.x}, ${burroCenter.y})`);

        const hubPin = document.createElementNS(SVGNS, "circle");
        hubPin.setAttribute("r", "5"); hubPin.setAttribute("fill", "#0f172a");
        hubPin.setAttribute("stroke", "#ffffff"); hubPin.setAttribute("stroke-width", "2");
        hubG.appendChild(hubPin);

        const hubTxt = document.createElementNS(SVGNS, "text");
        hubTxt.setAttribute("x", "9"); hubTxt.setAttribute("y", "4");
        hubTxt.setAttribute("font-family", "'Segoe UI', sans-serif");
        hubTxt.setAttribute("font-size", "9px"); hubTxt.setAttribute("font-weight", "800");
        hubTxt.setAttribute("fill", "#0f172a");
        hubTxt.textContent = "NODO EL BURRO (EEP)";
        hubG.appendChild(hubTxt);

        natMacroSvg.appendChild(hubG);
      }
    }
  }

  // Líneas guía arquitectónicas punteadas verticales que conectan los vértices de las capas
  function drawNaturalGuideLines() {
    if (!natGuideSvg || !natOverlay) return;
    natGuideSvg.innerHTML = "";
    const SVGNS = "http://www.w3.org/2000/svg";
    const layerBase = document.getElementById("natLayerBase");
    if (!layerBase) return;

    const sublayers = [
      document.getElementById("natLayerWater"),
      document.getElementById("natLayer2"),
      document.getElementById("natLayer3"),
      document.getElementById("natLayer4")
    ];
    let layerTop = sublayers.find(l => l && parseFloat(l.style.opacity || "0") > 0.1 && (l.getBoundingClientRect().top < layerBase.getBoundingClientRect().top - 15));
    if (!layerTop) layerTop = document.getElementById("natLayerWater");

    const rTop = layerTop.getBoundingClientRect();
    const rBase = layerBase.getBoundingClientRect();
    const rStage = natGuideSvg.getBoundingClientRect();
    if (Math.abs(rTop.top - rBase.top) < 15) return;

    // 4 esquinas del rombo (50% 0%, 100% 50%, 50% 100%, 0% 50%)
    const cornersRel = [
      { rx: 0.5, ry: 0.0 }, // norte
      { rx: 1.0, ry: 0.5 }, // este
      { rx: 0.5, ry: 1.0 }, // sur
      { rx: 0.0, ry: 0.5 }, // oeste
    ];

    cornersRel.forEach(c => {
      const x1 = rTop.left + rTop.width * c.rx - rStage.left;
      const y1 = rTop.top + rTop.height * c.ry - rStage.top;
      const x2 = rBase.left + rBase.width * c.rx - rStage.left;
      const y2 = rBase.top + rBase.height * c.ry - rStage.top;

      const line = document.createElementNS(SVGNS, "line");
      line.setAttribute("x1", String(x1));
      line.setAttribute("y1", String(y1));
      line.setAttribute("x2", String(x2));
      line.setAttribute("y2", String(y2));
      line.setAttribute("stroke", "rgba(15, 23, 42, 0.28)");
      line.setAttribute("stroke-width", "1.3");
      line.setAttribute("stroke-dasharray", "4 4");
      natGuideSvg.appendChild(line);

      const dot1 = document.createElementNS(SVGNS, "circle");
      dot1.setAttribute("cx", String(x1)); dot1.setAttribute("cy", String(y1)); dot1.setAttribute("r", "2.5");
      dot1.setAttribute("fill", "rgba(15, 23, 42, 0.4)");
      natGuideSvg.appendChild(dot1);

      const dot2 = document.createElementNS(SVGNS, "circle");
      dot2.setAttribute("cx", String(x2)); dot2.setAttribute("cy", String(y2)); dot2.setAttribute("r", "2.5");
      dot2.setAttribute("fill", "rgba(15, 23, 42, 0.4)");
      natGuideSvg.appendChild(dot2);
    });
  }

  window.addEventListener("resize", () => {
    if (natOverlay && natOverlay.style.display !== "none") {
      renderAllNaturalSublayers();
    }
  });

  if (natMesSlider) {
    natMesSlider.addEventListener("input", () => {
      renderAllNaturalSublayers();
    });
  }

  function stopNatPlayYear() {
    natYearPlaying = false;
    if (natYearTimer) { clearInterval(natYearTimer); natYearTimer = null; }
    if (natPlayYearBtn) natPlayYearBtn.textContent = "▶ Reproducir año completo";
  }

  if (natPlayYearBtn) {
    natPlayYearBtn.addEventListener("click", () => {
      natYearPlaying = !natYearPlaying;
      if (natYearPlaying) {
        natPlayYearBtn.textContent = "⏸ Pausar año";
        natYearTimer = setInterval(() => {
          let m = parseInt(natMesSlider.value, 10) + 1;
          if (m > 12) m = 1;
          natMesSlider.value = String(m);
          renderAllNaturalSublayers();
        }, 3400);
      } else {
        stopNatPlayYear();
      }
    });
  }

  // ---- Caja de coordenadas de los textos (arriba a la izquierda) ----
  const textCoordsBox = document.createElement("textarea");
  textCoordsBox.id = "textCoordsOutput";
  textCoordsBox.style.cssText = "display:none; position:absolute; top:18px; left:18px; z-index:16; width:340px; height:160px; font-size:10px; background:rgba(10,12,14,.92); color:#fff; border:1px solid rgba(255,255,255,.2); border-radius:6px; padding:8px;";
  document.getElementById("explodeOverlay").appendChild(textCoordsBox);
  function updateTextCoordsOutput() {
    let out = "";
    document.querySelectorAll(".explode-text").forEach(t => {
      const layerNum = t.dataset.layer;
      const st = textStates[layerNum];
      out += `Capa ${layerNum} ("${t.textContent}"): tamaño ${t.style.fontSize || "22px"}, color ${t.style.color || "#ffffff"}\n`;
      if (st) out += `  esquinas: ${st.corners.map(c => `(${c.x.toFixed(0)},${c.y.toFixed(0)})`).join(" ")}\n`;
    });
    textCoordsBox.value = out.trim();
    textCoordsBox.style.display = "none"; // ya no se necesita (pedido del usuario)
  }
  document.querySelectorAll(".explode-text").forEach(t => {
    initTextDistort(t, t.dataset.layer);
    t.addEventListener("input", updateTextCoordsOutput);
  });

  // ============================================================
  // ESCALA CULTURAL Y SOCIO-URBANA (4 CAPAS DE SIMULACIÓN)
  // ============================================================
  const cultOverlay = document.getElementById("culturalExplodeOverlay");
  const cultBackBtn = document.getElementById("cultExplodeBack");
  const cultAssembleBtn = document.getElementById("cultAssembleBtn");
  const cultAssembleBtnText = document.getElementById("cultAssembleBtnText");
  const cultBaseImg = document.getElementById("cultBaseImg");
  const cultGuideSvg = document.getElementById("cultGuideSvg");
  const cultStageEl = document.getElementById("culturalExplodeStage");

  // Capas
  const cultLayer1 = document.getElementById("cultLayer1");
  const cultLayer1Canvas = document.getElementById("cultLayer1Canvas");
  const cultLayer1Svg = document.getElementById("cultLayer1Svg");

  const cultLayer2 = document.getElementById("cultLayer2");
  const cultLayer2Canvas = document.getElementById("cultLayer2Canvas");
  const cultLayer2Svg = document.getElementById("cultLayer2Svg");

  const cultLayer3 = document.getElementById("cultLayer3");
  const cultLayer3Canvas = document.getElementById("cultLayer3Canvas");
  const cultLayer3Svg = document.getElementById("cultLayer3Svg");

  const cultLayer4 = document.getElementById("cultLayer4");
  const cultLayer4Canvas = document.getElementById("cultLayer4Canvas");
  const cultLayer4Svg = document.getElementById("cultLayer4Svg");

  const cultLayerBase = document.getElementById("cultLayerBase");

  // Paneles flotantes de control
  const cultCapa1Panel = document.getElementById("cultCapa1Panel");
  const cultYearSlider = document.getElementById("cultYearSlider");
  const cultYearLabel = document.getElementById("cultYearLabel");
  const cultHistoryStats = document.getElementById("cultHistoryStats");
  const cultPlayHistoryBtn = document.getElementById("cultPlayHistoryBtn");

  const cultCapa2Panel = document.getElementById("cultCapa2Panel");
  const cultCapa3Panel = document.getElementById("cultCapa3Panel");

  const cultCapa4Panel = document.getElementById("cultCapa4Panel");
  const cultTadBadge = document.getElementById("cultTadBadge");
  const cultSotToggleBtn = document.getElementById("cultSotToggleBtn");

  let cultExplodeStep = 0;
  let cultAnimFrame = null;
  let cultTime = 0;
  let cultHistPlaying = false;
  let cultHistTimer = null;
  let isSotElevated = false;

  function openCulturalExplode() {
    const lp = document.getElementById("legendPanel");
    if (lp) lp.style.display = "block";
    const cp = document.getElementById("natClimatePanel");
    if (cp) cp.style.display = "none";
    const c1 = document.getElementById("cultCapa1Panel");
    if (c1) c1.style.display = "block";
    const t4 = document.getElementById("techCapa4Panel");
    if (t4) t4.style.display = "none";
    const sw = document.getElementById("sceneWrap");
    if (sw) sw.style.display = "none";
    if (!cultOverlay) return;

    const targetW = 960, targetH = 540;
    const layerAspect = targetW / targetH;

    camera.left = -viewSize * layerAspect;
    camera.right = viewSize * layerAspect;
    camera.top = viewSize;
    camera.bottom = -viewSize;
    camera.updateProjectionMatrix();
    renderer.setSize(targetW, targetH, false);
    updateCanonicalCamera();

    const origRoadColor = roadMat ? roadMat.color.getHex() : null;
    const origNoiseVis = noiseMesh ? noiseMesh.visible : false;
    const origBirdsVis = birdsGroup ? birdsGroup.visible : false;
    const origVehVis = vehInstanced ? vehInstanced.visible : false;
    const origVehCount = vehInstanced ? vehInstanced.count : 0;
    const origBg = scene.background;
    scene.background = new THREE.Color(0xffffff);

    if (noiseMesh) noiseMesh.visible = false;
    if (birdsGroup) birdsGroup.visible = false;
    if (vehInstanced) { vehInstanced.visible = false; vehInstanced.count = 0; }
    if (roadMat) roadMat.color.set(0x9099a3);

    renderer.render(scene, camera);
    const fotoBase = captureBaseWithContext(); // mismo contexto clarito + area de estudio que en Natural

    // Captura de CONTEXTO (camara alejada), igual que en Escala natural.
    const culContextImg = document.getElementById("culContextImg");
    const culLayerContext = document.getElementById("culLayerContext");
    if (culContextImg) {
      const contextZoomOut = 3.2;
      camera.left = -viewSize * contextZoomOut * layerAspect;
      camera.right = viewSize * contextZoomOut * layerAspect;
      camera.top = viewSize * contextZoomOut;
      camera.bottom = -viewSize * contextZoomOut;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      culContextImg.src = renderer.domElement.toDataURL("image/png");
      /* culLayerContext ya no se usa: el contexto va integrado en la base */
      camera.left = -viewSize * layerAspect;
      camera.right = viewSize * layerAspect;
      camera.top = viewSize;
      camera.bottom = -viewSize;
      camera.updateProjectionMatrix();
    }
    scene.background = origBg;

    if (roadMat && origRoadColor !== null) roadMat.color.set(origRoadColor);
    if (noiseMesh) noiseMesh.visible = origNoiseVis;
    if (birdsGroup) birdsGroup.visible = origBirdsVis;
    if (vehInstanced) {
      vehInstanced.visible = origVehVis;
      vehInstanced.count = origVehCount;
    }

    if (cultBaseImg) {
      cultBaseImg.src = fotoBase;
      cultBaseImg.style.objectFit = "fill";
    }
    const setCultSubImg = (id) => {
      const el = document.getElementById(id);
      if (el) { el.src = ""; el.style.display = "none"; }
    };
    setCultSubImg("cultLayer1Img");
    setCultSubImg("cultLayer2Img");
    setCultSubImg("cultLayer3Img");
    setCultSubImg("cultLayer4Img");

    cultOverlay.style.display = "flex";
    void cultOverlay.offsetWidth;

    cultExplodeStep = 0;
    updateCulturalLayersStep(false);
    renderAllCulturalSublayers();
    startCultAnimation();
    // La evolucion historica arranca sola desde 1950, sin darle play.
    cultPeople = null; cultVisitors = null; cult1Cache = { key: null, img: null };
    setTimeout(() => {
      if (cultYearSlider) { cultYearSlider.value = "1950"; if (cultYearLabel) cultYearLabel.textContent = "1950"; }
      if (cultPlayHistoryBtn && !cultHistPlaying) cultPlayHistoryBtn.click();
    }, 900);
  }

  function closeCulturalExplode() {
    const p = document.getElementById("escalaZoomPanel");
    if (p) p.style.display = "none";
    const l = document.getElementById("legendActiveLayer");
    if (l) l.style.display = "none";
    if (!cultOverlay) return;
    const sceneWrapRestore3 = document.getElementById("sceneWrap");
    // if (sceneWrapRestore3) sceneWrapRestore3.style.display = "block";
    if (cultAnimFrame) { cancelAnimationFrame(cultAnimFrame); cultAnimFrame = null; }
    if (cultHistPlaying) stopCultHistory();

    const sublayers = cultOverlay.querySelectorAll(".cult-sublayer");
    sublayers.forEach(l => {
      l.style.opacity = "0";
      l.style.transform = "translate(-50%, -20px)";
    });
    const culLayerContext2 = document.getElementById("culLayerContext");
    if (culLayerContext2) culLayerContext2.style.opacity = "0";

    const origW = wrap.clientWidth, origH = wrap.clientHeight;
    renderer.setSize(origW, origH, false);
    const restoreAspect = origW / origH;
    camera.left = -viewSize * restoreAspect;
    camera.right = viewSize * restoreAspect;
    camera.top = viewSize;
    camera.bottom = -viewSize;
    camera.updateProjectionMatrix();

    setTimeout(() => {
      cultOverlay.style.display = "none";
      unzoomAll();
    }, 400);
  }

  if (cultBackBtn) cultBackBtn.addEventListener("click", closeCulturalExplode);

  function updateCulturalLayersStep(animated = true) {
    if (typeof syncFloatLabelText === "function") syncFloatLabelText();
    const sublayers = [cultLayer1, cultLayer2, cultLayer3, cultLayer4];
    const panels = [cultCapa1Panel, cultCapa2Panel, cultCapa3Panel, cultCapa4Panel];
    const tags = cultOverlay.querySelectorAll(".cult-layer-tag");

    const allDiamonds = cultOverlay.querySelectorAll(".sublayer-diamond");
    allDiamonds.forEach(d => {
      const isBase = d.parentElement && d.parentElement.id === "cultLayerBase";
      if (isBase) {
        d.style.background = "transparent";
        d.style.boxShadow = "none";
        d.style.borderColor = "transparent";
      } else {
        d.style.background = "rgba(255, 255, 255, 0.92)";
        d.style.border = "1.5px solid rgba(15, 23, 42, 0.35)";
        d.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.08)";
      }
    });

    panels.forEach(p => { if (p) p.style.display = "none"; });

    if (cultExplodeStep === 0) {
      if (cultLayerBase) { cultLayerBase.style.top = "50%"; cultLayerBase.style.opacity = "1"; cultLayerBase.style.transform = "translate(-50%, -40%)"; }
      sublayers.forEach(l => { if (l) { l.style.opacity = "0"; l.style.top = "50%"; l.style.transform = "translate(-50%, -40%)"; } });
      tags.forEach(t => { t.style.opacity = "0"; });
      if (cultGuideSvg) cultGuideSvg.style.opacity = "0";
      if (cultAssembleBtnText) cultAssembleBtnText.textContent = "Extraer Capa 1: Memoria Histórica";
      return;
    }

    if (cultExplodeStep % 2 === 1 && cultExplodeStep <= 7) {
      const activeIdx = Math.floor(cultExplodeStep / 2);
      if (cultLayerBase) { cultLayerBase.style.top = "60%"; cultLayerBase.style.opacity = "1"; cultLayerBase.style.transform = "translate(-50%, -40%)"; }
      sublayers.forEach((l, index) => {
        if (!l) return;
        if (index === activeIdx) {
          const expTop = "-4%"; // capa extraida siempre ARRIBA
          l.style.top = expTop;
          l.style.transform = "translate(-50%, 0)";
          l.style.opacity = "1";
          const tag = l.querySelector(".cult-layer-tag");
          if (tag) tag.style.opacity = "1";
        } else {
          l.style.top = "60%";
          l.style.transform = "translate(-50%, -40%)";
          l.style.opacity = "0";
          const tag = l.querySelector(".cult-layer-tag");
          if (tag) tag.style.opacity = "0";
        }
      });
      if (panels[activeIdx]) panels[activeIdx].style.display = "block";
      if (cultGuideSvg) cultGuideSvg.style.opacity = "1";
      drawCulturalGuideLines();
      if (cultAssembleBtnText) cultAssembleBtnText.textContent = `Asentar Capa ${activeIdx + 1} en el Territorio`;
      return;
    }

    if (cultExplodeStep % 2 === 0 && cultExplodeStep <= 8) {
      cultOverlay.querySelectorAll(".sublayer-diamond").forEach(dd => { dd.style.background = "transparent"; dd.style.boxShadow = "none"; dd.style.borderColor = "transparent"; });
      const settledIdx = (cultExplodeStep / 2) - 1;
      const nextNames = ["Capa 2: Cerramiento Borde", "Capa 3: Recorrido Pedagógico", "Capa 4: Fricción Vial SOT", "Ver Apilamiento Explotado Completo"];

      if (cultLayerBase) { cultLayerBase.style.top = "50%"; cultLayerBase.style.opacity = "1"; cultLayerBase.style.transform = "translate(-50%, -40%)"; }
      sublayers.forEach((l, index) => {
        if (!l) return;
        if (index === settledIdx) {
          l.style.top = "50%";
          l.style.transform = "translate(-50%, -40%)";
          l.style.opacity = "1";
          const tag = l.querySelector(".cult-layer-tag");
          if (tag) tag.style.opacity = "1";
        } else {
          l.style.top = "50%";
          l.style.transform = "translate(-50%, -40%)";
          l.style.opacity = "0";
          const tag = l.querySelector(".cult-layer-tag");
          if (tag) tag.style.opacity = "0";
        }
      });
      if (panels[settledIdx]) panels[settledIdx].style.display = "block";
      if (cultGuideSvg) cultGuideSvg.style.opacity = "0";
      if (cultAssembleBtnText) cultAssembleBtnText.textContent = `Extraer ${nextNames[settledIdx]}`;
      return;
    }

    if (cultExplodeStep === 9) {
      if (cultLayerBase) { cultLayerBase.style.top = "70%"; cultLayerBase.style.opacity = "1"; cultLayerBase.style.transform = "translate(-50%, 0)"; }
      sublayers.forEach((l) => {
        if (!l) return;
        const expTop = l.dataset.explodedTop || "54%";
        l.style.top = expTop;
        l.style.transform = "translate(-50%, 0)";
        l.style.opacity = "1";
        const tag = l.querySelector(".cult-layer-tag");
        if (tag) tag.style.opacity = "1";
      });
      tags.forEach(t => { t.style.opacity = "1"; });
      if (cultGuideSvg) cultGuideSvg.style.opacity = "1";
      drawCulturalGuideLines();
      if (cultAssembleBtnText) cultAssembleBtnText.textContent = "Integrar TODAS las capas en el Territorio";
      return;
    }

    if (cultExplodeStep === 10) {
      cultOverlay.querySelectorAll(".sublayer-diamond").forEach(dd => { dd.style.background = "transparent"; dd.style.boxShadow = "none"; dd.style.borderColor = "transparent"; });
      if (cultLayerBase) { cultLayerBase.style.top = "50%"; cultLayerBase.style.opacity = "1"; cultLayerBase.style.transform = "translate(-50%, -40%)"; }
      sublayers.forEach((l) => {
        if (!l) return;
        l.style.top = "50%";
        l.style.transform = "translate(-50%, -40%)";
        l.style.opacity = "1";
        const tag = l.querySelector(".cult-layer-tag");
        if (tag) tag.style.opacity = "0";
      });
      if (cultGuideSvg) cultGuideSvg.style.opacity = "0";
      if (cultAssembleBtnText) cultAssembleBtnText.textContent = "Reiniciar Recorrido en Base";
      return;
    }
  }

  function advanceCulturalAssemble() {
    cultExplodeStep++;
    if (cultExplodeStep > 10) {
      cultExplodeStep = 0;
      updateCulturalLayersStep(false);
      closeCulturalExplode();
      openTechExplode();
      return;
    }
    updateCulturalLayersStep(true);
  }

  if (cultAssembleBtn) cultAssembleBtn.addEventListener("click", advanceCulturalAssemble);
  if (cultStageEl) {
    cultStageEl.addEventListener("click", () => { advanceCulturalAssemble(); });
  }

  function drawCulturalGuideLines() {
    if (!cultGuideSvg || !cultOverlay) return;
    cultGuideSvg.innerHTML = "";
    const SVGNS = "http://www.w3.org/2000/svg";
    const layerBase = cultLayerBase;
    if (!layerBase) return;

    const sublayers = [cultLayer1, cultLayer2, cultLayer3, cultLayer4];
    let layerTop = sublayers.find(l => l && parseFloat(l.style.opacity || "0") > 0.1 && (l.getBoundingClientRect().top < layerBase.getBoundingClientRect().top - 15));
    if (!layerTop) layerTop = cultLayer1;

    const rTop = layerTop.getBoundingClientRect();
    const rBase = layerBase.getBoundingClientRect();
    const rStage = cultGuideSvg.getBoundingClientRect();
    if (Math.abs(rTop.top - rBase.top) < 15) return;

    const cornersRel = [
      { rx: 0.5, ry: 0.0 },
      { rx: 1.0, ry: 0.5 },
      { rx: 0.5, ry: 1.0 },
      { rx: 0.0, ry: 0.5 },
    ];

    cornersRel.forEach(c => {
      const x1 = rTop.left + rTop.width * c.rx - rStage.left;
      const y1 = rTop.top + rTop.height * c.ry - rStage.top;
      const x2 = rBase.left + rBase.width * c.rx - rStage.left;
      const y2 = rBase.top + rBase.height * c.ry - rStage.top;

      const line = document.createElementNS(SVGNS, "line");
      line.setAttribute("x1", String(x1)); line.setAttribute("y1", String(y1));
      line.setAttribute("x2", String(x2)); line.setAttribute("y2", String(y2));
      line.setAttribute("stroke", "rgba(162, 28, 175, 0.35)");
      line.setAttribute("stroke-width", "1.3");
      line.setAttribute("stroke-dasharray", "4 4");
      cultGuideSvg.appendChild(line);

      const dot1 = document.createElementNS(SVGNS, "circle");
      dot1.setAttribute("cx", String(x1)); dot1.setAttribute("cy", String(y1)); dot1.setAttribute("r", "2.5");
      dot1.setAttribute("fill", "rgba(162, 28, 175, 0.5)");
      cultGuideSvg.appendChild(dot1);

      const dot2 = document.createElementNS(SVGNS, "circle");
      dot2.setAttribute("cx", String(x2)); dot2.setAttribute("cy", String(y2)); dot2.setAttribute("r", "2.5");
      dot2.setAttribute("fill", "rgba(162, 28, 175, 0.5)");
      cultGuideSvg.appendChild(dot2);
    });
  }

  function startCultAnimation() {
    if (cultAnimFrame) cancelAnimationFrame(cultAnimFrame);
    function loopCult() {
      if (cultOverlay.style.display !== "none") {
        cultTime += 0.035;
        const year = cultYearSlider ? parseInt(cultYearSlider.value, 10) : 1956;
        renderCulturalCapa1(year);
        renderCulturalCapa2();
        renderCulturalCapa3();
        renderCulturalCapa4(isSotElevated);
        cultAnimFrame = requestAnimationFrame(loopCult);
      }
    }
    cultAnimFrame = requestAnimationFrame(loopCult);
  }

  function renderAllCulturalSublayers() {
    const year = cultYearSlider ? parseInt(cultYearSlider.value, 10) : 1956;
    renderCulturalCapa1(year);
    renderCulturalCapa2();
    renderCulturalCapa3();
    renderCulturalCapa4(isSotElevated);
    drawCulturalGuideLines();
  }

  if (cultYearSlider) {
    cultYearSlider.addEventListener("input", () => {
      const year = parseInt(cultYearSlider.value, 10);
      if (cultYearLabel) cultYearLabel.textContent = String(year);
      renderCulturalCapa1(year);
    });
  }


  // ============================================================
  // ESCALA CULTURAL reescrita (pedido del usuario)
  // ============================================================
  function gpsToLocal(lat, lng) { return [158502.5342667897 * lng + 11760483.425451731, 75875.89881636726 * lat - 349119.0227795534]; }
  function prepCultCanvas(cv) {
    const rect = cv.getBoundingClientRect(); const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = rect.width || 720, h = rect.height || 405;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const ctx = cv.getContext("2d"); ctx.resetTransform(); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h);
    return { ctx, w, h, P: (x, y, el = 0.05) => projectPointToLayer(x, y, el, w, h) };
  }
  function burroPts() { const b = rawWaterData && rawWaterData.find(b => (b.nombre || "").includes("Burro")); return b && b.pts && b.pts.length > 3 ? b.pts : null; }
  function polyPath(ctx, pts, P) { ctx.beginPath(); pts.forEach((p, i) => { const s = P(p[0], p[1]); i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); }); ctx.closePath(); }
  function scaled(pts, k) { const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length; return pts.map(p => [cx + (p[0] - cx) * k, cy + (p[1] - cy) * k]); }
  function inBox(x, y) { const b = currentBoxRealBounds; return !b || (x >= b.xMin && x <= b.xMax && y >= b.yMin && y <= b.yMax); }

  // Capa 1: decrecimiento historico del humedal + urbanizacion.
  // 1950-1979: solo humedal (sin edificios ni vias). Desde 1980 aparecen
  // edificios, solo por fuera del borde que tenia el humedal ese año.
  // Las vias van apareciendo desde 1990 y estan todas en el 2000.
  let cult1Cache = { key: null, img: null };
  function renderCulturalCapa1(year) { return renderCulturalCapaOld1(year); } // la usuaria pidio volver a la version anterior
  function renderCulturalCapa1Nueva(year) {
    if (!cultLayer1Canvas) return;
    const { ctx, w, h, P } = prepCultCanvas(cultLayer1Canvas);
    const bp = burroPts(); if (!bp) return;
    const y = Math.max(1950, Math.min(2024, year || 2024));
    // extension historica: grande en 1950, actual en 2024 - acotada para que NUNCA se salga del cuadro
    let dMax = 420; // metros de borde perdidos desde 1950 (se reduce si no cabe, para no cortarse)
    for (; dMax > 20; dMax -= 20) { const sp = offsetPoly(bp, dMax).map(p => P(p[0], p[1])); if (sp.every(s => s.x > 6 && s.x < w - 6 && s.y > 6 && s.y < h - 6)) break; }
    const wet = offsetPoly(bp, dMax * Math.pow((2024 - y) / 74, 0.8)); // el borde retrocede por offset, sin correrse
    const key = y + "|" + w + "x" + h;
    if (cult1Cache.key !== key) {
      const off = document.createElement("canvas"); off.width = cultLayer1Canvas.width; off.height = cultLayer1Canvas.height;
      const o = off.getContext("2d"); const dpr = off.width / w; o.scale(dpr, dpr);
      if (y >= 1980 && rawBuildingsData) {
        const frac = Math.min(1, (y - 1980) / 40);
        o.fillStyle = "rgba(60,66,76,.75)";
        rawBuildingsData.forEach((b, i) => {
          if ((i % 997) / 997 > frac) return;
          const c = b.pts[0]; if (!inBox(c[0], c[1]) || ptInPoly(c[0], c[1], wet)) return;
          o.beginPath(); b.pts.forEach((p, j) => { const s = P(p[0], p[1]); j ? o.lineTo(s.x, s.y) : o.moveTo(s.x, s.y); }); o.closePath(); o.fill();
        });
      }
      if (y >= 1990 && rawEdgesData) {
        const frac = Math.min(1, (y - 1990) / 10);
        o.strokeStyle = "rgba(120,128,138,.9)"; o.lineWidth = 0.8;
        rawEdgesData.forEach(([kind, pts], i) => {
          if ((i % 613) / 613 > frac) return;
          const m = pts[Math.floor(pts.length / 2)]; if (!inBox(m[0], m[1])) return;
          o.beginPath(); pts.forEach((p, j) => { const s = P(p[0], p[1]); j ? o.lineTo(s.x, s.y) : o.moveTo(s.x, s.y); }); o.stroke();
        });
      }
      cult1Cache = { key, img: off };
    }
    polyPath(ctx, wet, P); ctx.fillStyle = "rgba(70,120,160,.45)"; ctx.fill(); ctx.strokeStyle = "#1e3a5f"; ctx.lineWidth = 1; ctx.stroke();
    ctx.drawImage(cult1Cache.img, 0, 0, w, h);
    polyPath(ctx, bp, P); ctx.strokeStyle = "rgba(15,23,42,.7)"; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
    smallLabel(ctx, `Año ${y} · ${y < 1980 ? "sin urbanización" : y < 1990 ? "llegan los primeros barrios" : y < 2000 ? "se consolida la malla vial" : "ciudad consolidada"}`, 10, 16);
  }

  // Capa 2: reja perimetral de la ZMPA (12,14 ha) con 2 portones y flechas entrando.
  function cultGates(bp) {
    const targets = [gpsToLocal(4.6395, -74.1531), gpsToLocal(4.6470, -74.1545)]; // Biblioteca El Tintal / Alameda El Porvenir (aprox.)
    const fence = scaled(bp, 1.12);
    return targets.map(t => { let best = 0, bd = 1e18; fence.forEach((p, i) => { const d = (p[0] - t[0]) ** 2 + (p[1] - t[1]) ** 2; if (d < bd) { bd = d; best = i; } }); return best; });
  }
  function renderCulturalCapa2() {
    if (!cultLayer2Canvas) return;
    const { ctx, w, h, P } = prepCultCanvas(cultLayer2Canvas);
    const bp = burroPts(); if (!bp) return;
    polyPath(ctx, bp, P); ctx.fillStyle = "rgba(70,120,160,.3)"; ctx.fill();
    const fence = scaled(bp, 1.12), gates = cultGates(bp), n = fence.length;
    const isGate = i => gates.includes(i); // solo el tramo exacto del porton (antes quitaba 3 tramos y dejaba un hueco grande)
    ctx.strokeStyle = "#000000"; ctx.lineWidth = 2.2; ctx.lineCap = "round";
    for (let i = 0; i < n; i++) {
      if (isGate(i)) continue;
      const a = P(fence[i][0], fence[i][1]), b = P(fence[(i + 1) % n][0], fence[(i + 1) % n][1]);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      const up = P(fence[i][0], fence[i][1], 0.9); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(up.x, up.y); ctx.stroke(); // postes
    }
    const t = (performance.now() / 1400) % 1;
    const names = ["Portón Biblioteca El Tintal", "Portón Alameda El Porvenir"];
    const cx = bp.reduce((s, p) => s + p[0], 0) / bp.length, cy = bp.reduce((s, p) => s + p[1], 0) / bp.length;
    gates.forEach((g, gi) => {
      const gp = [(fence[g][0] + fence[(g + 1) % n][0]) / 2, (fence[g][1] + fence[(g + 1) % n][1]) / 2], out = [gp[0] + (gp[0] - cx) * 0.6, gp[1] + (gp[1] - cy) * 0.6];
      for (let k = 0; k < 3; k++) {
        const f = (t + k / 3) % 1, x = out[0] + (gp[0] - out[0]) * f, y = out[1] + (gp[1] - out[1]) * f;
        const s = P(x, y), s2 = P(x + (gp[0] - out[0]) * 0.08, y + (gp[1] - out[1]) * 0.08);
        const ang = Math.atan2(s2.y - s.y, s2.x - s.x);
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(ang); ctx.fillStyle = `rgba(220,38,38,${1 - f * 0.4})`;
        ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-3, -3); ctx.lineTo(-3, 3); ctx.closePath(); ctx.fill(); ctx.restore();
      }
      const ls = P(out[0], out[1]); smallLabel(ctx, names[gi], ls.x + 6, ls.y);
    });
    smallLabel(ctx, "Reja perimetral ZMPA · 12,14 ha", 10, 16);
  }

  // Capa 3: sintaxis espacial - flujos de personas desde los puntos de
  // mayor actividad; pocas personas entran al borde del humedal.
  const CULT_HUBS = [[4.643381946109259, -74.15425856615684, 70], [4.641996817100511, -74.15162276093034, 22], [4.640243427808329, -74.15429866246944, 22], [4.637514552718226, -74.14914507437499, 22], [4.641823947925646, -74.14746024746466, 22]].map(([la, lo, n]) => ({ p: gpsToLocal(la, lo), n }));
  let cultPeople = null, cultStepFrame = 0, cultVisFrame = 0;
  function renderCulturalCapa3() {
    if (!cultLayer3Canvas) return;
    const { ctx, w, h, P } = prepCultCanvas(cultLayer3Canvas);
    const bp = burroPts(); if (!bp) return;
    polyPath(ctx, bp, P); ctx.fillStyle = "rgba(70,120,160,.3)"; ctx.fill();
    const fence = scaled(bp, 1.12), gates = cultGates(bp).map(i => fence[i]);
    if (!cultPeople) {
      cultPeople = [];
      CULT_HUBS.forEach((hub, hi) => {
        for (let i = 0; i < hub.n; i++) {
          const home = [hub.p[0] + (Math.random() - 0.5) * 120, hub.p[1] + (Math.random() - 0.5) * 120];
          const goes = Math.random() < 0.18; // solo una minoria va hacia el humedal
          const gate = gates[Math.floor(Math.random() * gates.length)];
          const edge = edgePointOf(bp);
          cultPeople.push({ home, gate, edge, goes, t: Math.random(), sp: 0.004 + Math.random() * 0.004, j: Math.random() * 6, tick: Math.floor(Math.random() * 14) });
        }
      });
    }
    CULT_HUBS.forEach((hub, hi) => { const s = P(hub.p[0], hub.p[1]); ctx.fillStyle = hi === 0 ? "rgba(234,88,12,.18)" : "rgba(234,88,12,.12)"; ctx.beginPath(); ctx.arc(s.x, s.y, hi === 0 ? 16 : 9, 0, 7); ctx.fill(); });
    cultPeople.forEach(p => {
      p.tick++; const paso = p.tick % 14 === 0; // avanzan a pasos cortos cada ~1/4 s, no se deslizan
      if (paso) p.j += 0.35; let x, y;
      if (!p.goes) { x = p.home[0] + Math.sin(p.j) * 14; y = p.home[1] + Math.cos(p.j * 0.8) * 14; }
      else {
        if (paso) p.t = (p.t + p.sp) % 1;
        if (p.t < 0.6) { const f = p.t / 0.6; x = p.home[0] + (p.gate[0] - p.home[0]) * f; y = p.home[1] + (p.gate[1] - p.home[1]) * f; }
        else { const f = (p.t - 0.6) / 0.4; x = p.gate[0] + (p.edge[0] - p.gate[0]) * f; y = p.gate[1] + (p.edge[1] - p.gate[1]) * f; }
      }
      const s = P(x, y); ctx.fillStyle = p.goes ? "#ea580c" : "#334155"; ctx.beginPath(); ctx.arc(s.x, s.y, 1.4, 0, 7); ctx.fill();
    });
    const main = P(CULT_HUBS[0].p[0], CULT_HUBS[0].p[1]); smallLabel(ctx, "Punto de mayor interacción", main.x + 10, main.y - 8);
    smallLabel(ctx, "Sintaxis espacial · pocas personas entran al borde del humedal", 10, 16);
  }

  // Capa 4: interaccion directa con el humedal - aula ambiental y
  // visitantes de recreacion pasiva recorriendo el borde.
  const AULA = gpsToLocal(4.650011400489513, -74.15271673450786);
  let cultVisitors = null;
  function renderCulturalCapa4(elevated) {
    if (!cultLayer4Canvas) return;
    const { ctx, w, h, P } = prepCultCanvas(cultLayer4Canvas);
    const bp = burroPts(); if (!bp) return;
    polyPath(ctx, bp, P); ctx.fillStyle = "rgba(70,120,160,.35)"; ctx.fill();
    const path = scaled(bp, 1.06);
    if (!cultVisitors) cultVisitors = Array.from({ length: 34 }, () => ({ u: Math.random(), sp: (Math.random() < 0.5 ? 1 : -1) * (0.0012 + Math.random() * 0.0012), stop: Math.random(), tick: Math.floor(Math.random() * 16) }));
    const n = path.length;
    cultVisFrame = (cultVisFrame + 1) % 10;
    cultVisitors.forEach(v => {
      v.tick++; v.stop += 0.004; if (v.tick % 16 === 0 && Math.sin(v.stop * 6) < 0.6) v.u = (v.u + v.sp + 1) % 1; // caminan a pasos cortos y se detienen a contemplar
      const f = v.u * n, i = Math.floor(f) % n, j = (i + 1) % n, r = f - Math.floor(f);
      const s = P(path[i][0] + (path[j][0] - path[i][0]) * r, path[i][1] + (path[j][1] - path[i][1]) * r);
      ctx.fillStyle = "#0f766e"; ctx.beginPath(); ctx.arc(s.x, s.y, 1.6, 0, 7); ctx.fill();
    });
    const a = P(AULA[0], AULA[1]), a2 = P(AULA[0], AULA[1], 1.4);
    ctx.fillStyle = "#111418"; ctx.fillRect(a.x - 4, a2.y, 8, a.y - a2.y); ctx.beginPath(); ctx.arc(a.x, a.y, 2.5, 0, 7); ctx.fill();
    smallLabel(ctx, "Aula ambiental", a.x + 8, a2.y);
    smallLabel(ctx, "Visitantes de recreación pasiva: caminata, avistamiento de fauna", 10, 16);
  }
  function stopCultHistory() {
    cultHistPlaying = false;
    if (cultHistTimer) { clearInterval(cultHistTimer); cultHistTimer = null; }
    if (cultPlayHistoryBtn) cultPlayHistoryBtn.textContent = "▶ Simular evolución histórica (1950 ➔ 2024)";
  }

  if (cultPlayHistoryBtn) {
    cultPlayHistoryBtn.addEventListener("click", () => {
      cultHistPlaying = !cultHistPlaying;
      if (cultHistPlaying) {
        cultPlayHistoryBtn.textContent = "⏸ Pausar evolución histórica";
        cultHistTimer = setInterval(() => {
          let y = parseInt(cultYearSlider.value, 10) + 1;
          if (y > 2024) y = 1950;
          cultYearSlider.value = String(y);
          if (cultYearLabel) cultYearLabel.textContent = String(y);
          renderCulturalCapa1(y);
        }, 650); // mas lento (antes 150ms por año)
      } else {
        stopCultHistory();
      }
    });
  }

  if (cultSotToggleBtn) {
    cultSotToggleBtn.addEventListener("click", () => {
      isSotElevated = !isSotElevated;
      if (isSotElevated) {
        cultSotToggleBtn.textContent = "DESACTIVAR WHAT-IF";
        cultSotToggleBtn.style.background = "#dc2626";
        cultSotToggleBtn.style.borderColor = "#dc2626";
        if (cultTadBadge) {
          cultTadBadge.textContent = "TAD: Normal (Vía Elevada SOT)";
          cultTadBadge.style.background = "#16a34a";
        }
      } else {
        cultSotToggleBtn.textContent = "ACTIVAR WHAT-IF";
        cultSotToggleBtn.style.background = "#16a34a";
        cultSotToggleBtn.style.borderColor = "#16a34a";
        if (cultTadBadge) {
          cultTadBadge.textContent = "TAD: +2 horas";
          cultTadBadge.style.background = "#dc2626";
        }
      }
      renderCulturalCapa4(isSotElevated);
    });
  }

  // ------------------------------------------------------------
  // RENDERIZADORES DE LAS 4 CAPAS CULTURALES
  // ------------------------------------------------------------

  // Capa 1: Memoria Histórica (1950–2024)
  function renderCulturalCapaOld1(year) {
    if (!cultLayer1Canvas) return;
    const rect = cultLayer1Canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = rect.width || 720, h = rect.height || 405;
    if (cultLayer1Canvas.width !== Math.round(w * dpr) || cultLayer1Canvas.height !== Math.round(h * dpr)) {
      cultLayer1Canvas.width = Math.round(w * dpr);
      cultLayer1Canvas.height = Math.round(h * dpr);
    }
    const ctx = cultLayer1Canvas.getContext("2d");
    ctx.resetTransform();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const projectPoint = (rx, ry, el = 0.05) => projectPointToLayer(rx, ry, el, w, h);

    // Reducción del área: 1956 (171.54 ha) -> 2024 (18.84 ha)
    const tNorm = Math.max(0, Math.min(1, (year - 1956) / (2024 - 1956)));
    const areaHa = 171.54 - (171.54 - 18.84) * tNorm;
    const scaleFactor = 1.0 + (1 - tNorm) * 2.1;

    if (cultHistoryStats) {
      const redPct = ((171.54 - areaHa) / 171.54 * 100).toFixed(1);
      const perceptionStr = year < 1990 ? '"Potrero / Pantano a secar"' : (year < 2010 ? '"Ecosistema en recuperación"' : '"Reserva de biodiversidad protegida"');
      const percColor = year < 1990 ? '#e11d48' : (year < 2010 ? '#d97706' : '#16a34a');
      cultHistoryStats.innerHTML = `Año <strong>${year}</strong> · Área: <strong style="color:#9333ea;">${areaHa.toFixed(2)} ha</strong> (-${redPct}%) · Percepción: <strong style="color:${percColor};">${perceptionStr}</strong>`;
    }

    if (rawWaterData) {
      const burro = rawWaterData.find(b => (b.nombre || "").includes("Burro"));
      if (burro && burro.pts && burro.pts.length > 3) {
        const cx = burro.pts.reduce((s, p) => s + p[0], 0) / burro.pts.length;
        const cy = burro.pts.reduce((s, p) => s + p[1], 0) / burro.pts.length;

        const histPts = burro.pts.map(p => [cx + (p[0] - cx) * scaleFactor, cy + (p[1] - cy) * scaleFactor]);
        const scrHist = histPts.map(p => projectPoint(p[0], p[1]));

        ctx.beginPath();
        ctx.moveTo(scrHist[0].x, scrHist[0].y);
        for (let i = 1; i < scrHist.length; i++) ctx.lineTo(scrHist[i].x, scrHist[i].y);
        ctx.closePath();

        if (year < 1990) {
          ctx.fillStyle = "rgba(217, 119, 6, 0.35)";
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = "#b45309";
          ctx.stroke();
        } else {
          ctx.fillStyle = "rgba(147, 51, 234, 0.30)";
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = "#7e22ce";
          ctx.stroke();
        }

        const isCareNode = year >= 2000;
        const numAgents = 14;
        for (let a = 0; a < numAgents; a++) {
          const ang = (a / numAgents) * Math.PI * 2 + cultTime * (isCareNode ? 0.2 : 0.8);
          const radDist = isCareNode ? 45 : (30 + Math.sin(cultTime * 3 + a) * 15);
          const agPt = projectPoint(cx + Math.cos(ang) * radDist * 10, cy + Math.sin(ang) * radDist * 10);

          if (agPt.inFront) {
            ctx.beginPath();
            ctx.arc(agPt.x, agPt.y, isCareNode ? 5 : 4, 0, Math.PI * 2);
            ctx.fillStyle = isCareNode ? "#16a34a" : "#dc2626";
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = "#ffffff";
            ctx.stroke();

            if (!isCareNode) {
              ctx.beginPath();
              ctx.moveTo(agPt.x, agPt.y);
              ctx.lineTo(agPt.x - Math.cos(ang) * 12, agPt.y - Math.sin(ang) * 12);
              ctx.strokeStyle = "#dc2626";
              ctx.lineWidth = 1.5;
              ctx.stroke();
            } else {
              ctx.beginPath();
              ctx.arc(agPt.x, agPt.y, 8 + Math.sin(cultTime * 4 + a) * 3, 0, Math.PI * 2);
              ctx.strokeStyle = "rgba(22, 163, 74, 0.4)";
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
        }
      }
    }

    if (cultLayer1Svg) {
      cultLayer1Svg.innerHTML = "";
      const SVGNS = "http://www.w3.org/2000/svg";
      const centerPt = projectPoint(7518.49, 3137.57);
      if (centerPt.inFront) {
        const g = document.createElementNS(SVGNS, "g");
        g.setAttribute("transform", `translate(${centerPt.x}, ${centerPt.y})`);

        const bg = document.createElementNS(SVGNS, "rect");
        bg.setAttribute("x", "-90"); bg.setAttribute("y", "-34");
        bg.setAttribute("width", "180"); bg.setAttribute("height", "28");
        bg.setAttribute("rx", "6"); bg.setAttribute("fill", "rgba(255,255,255,0.96)");
        bg.setAttribute("stroke", year >= 2000 ? "#16a34a" : "#dc2626");
        bg.setAttribute("stroke-width", "1.5");
        g.appendChild(bg);

        const txt = document.createElementNS(SVGNS, "text");
        txt.setAttribute("x", "0"); txt.setAttribute("y", "-20");
        txt.setAttribute("text-anchor", "middle");
        txt.setAttribute("font-family", "'Segoe UI', sans-serif");
        txt.setAttribute("font-size", "9.5px"); txt.setAttribute("font-weight", "800");
        txt.setAttribute("fill", "#0f172a");
        txt.textContent = year < 2000 ? "⚠️ Vectores de Potrero & Escombros" : "🛡️ Nodos de Cuidado Comunitario";
        g.appendChild(txt);

        const sub = document.createElementNS(SVGNS, "text");
        sub.setAttribute("x", "0"); sub.setAttribute("y", "-10");
        sub.setAttribute("text-anchor", "middle");
        sub.setAttribute("font-family", "'Segoe UI', sans-serif");
        sub.setAttribute("font-size", "8px"); sub.setAttribute("font-weight", "600");
        sub.setAttribute("fill", "#475569");
        sub.textContent = `Área: ${areaHa.toFixed(1)} ha (${year})`;
        g.appendChild(sub);

        cultLayer1Svg.appendChild(g);
      }
    }
  }

  // Capa 2: Cerramiento EAAB & Filtro de Borde Urbano
  function renderCulturalCapaOld2() {
    if (!cultLayer2Canvas) return;
    const rect = cultLayer2Canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = rect.width || 720, h = rect.height || 405;
    if (cultLayer2Canvas.width !== Math.round(w * dpr) || cultLayer2Canvas.height !== Math.round(h * dpr)) {
      cultLayer2Canvas.width = Math.round(w * dpr);
      cultLayer2Canvas.height = Math.round(h * dpr);
    }
    const ctx = cultLayer2Canvas.getContext("2d");
    ctx.resetTransform();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const projectPoint = (rx, ry, el = 0.05) => projectPointToLayer(rx, ry, el, w, h);

    const porvenirPts = [
      [6800, 2400], [7100, 2700], [7400, 3000], [7700, 3300], [8000, 3600]
    ];
    const scrPorvenir = porvenirPts.map(p => projectPoint(p[0], p[1]));
    ctx.beginPath();
    ctx.moveTo(scrPorvenir[0].x, scrPorvenir[0].y);
    for (let i = 1; i < scrPorvenir.length; i++) ctx.lineTo(scrPorvenir[i].x, scrPorvenir[i].y);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = "#e11d48";
    ctx.stroke();

    const gatePt = projectPoint(7400, 3000);

    for (let p = 0; p < 8; p++) {
      const prog = (cultTime * 0.4 + p * 0.125) % 1.0;
      const idx = Math.floor(prog * (scrPorvenir.length - 1));
      const subProg = (prog * (scrPorvenir.length - 1)) - idx;
      const p1 = scrPorvenir[idx], p2 = scrPorvenir[idx + 1] || p1;
      const px = p1.x + (p2.x - p1.x) * subProg;
      const py = p1.y + (p2.y - p1.y) * subProg;

      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#e11d48";
      ctx.fill();
    }

    const zmpaInsidePts = [
      [7420, 3050], [7460, 3100], [7500, 3150], [7530, 3180]
    ];
    const scrZmpaIn = zmpaInsidePts.map(p => projectPoint(p[0], p[1]));

    for (let p = 0; p < 5; p++) {
      const prog = (cultTime * 0.08 + p * 0.2) % 1.0;
      const idx = Math.floor(prog * (scrZmpaIn.length - 1));
      const subProg = (prog * (scrZmpaIn.length - 1)) - idx;
      const p1 = scrZmpaIn[idx], p2 = scrZmpaIn[idx + 1] || p1;
      const px = p1.x + (p2.x - p1.x) * subProg;
      const py = p1.y + (p2.y - p1.y) * subProg;

      ctx.beginPath();
      ctx.arc(px, py, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = "#16a34a";
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
    }

    if (cultLayer2Svg) {
      cultLayer2Svg.innerHTML = "";
      const SVGNS = "http://www.w3.org/2000/svg";

      if (gatePt.inFront) {
        const g = document.createElementNS(SVGNS, "g");
        g.setAttribute("transform", `translate(${gatePt.x}, ${gatePt.y})`);

        const gateCircle = document.createElementNS(SVGNS, "circle");
        gateCircle.setAttribute("r", "7");
        gateCircle.setAttribute("fill", "#0284c7");
        gateCircle.setAttribute("stroke", "#ffffff");
        gateCircle.setAttribute("stroke-width", "2");
        g.appendChild(gateCircle);

        const bg = document.createElementNS(SVGNS, "rect");
        bg.setAttribute("x", "12"); bg.setAttribute("y", "-18");
        bg.setAttribute("width", "185"); bg.setAttribute("height", "32");
        bg.setAttribute("rx", "6"); bg.setAttribute("fill", "rgba(255,255,255,0.96)");
        bg.setAttribute("stroke", "#0284c7"); bg.setAttribute("stroke-width", "1.5");
        g.appendChild(bg);

        const txt = document.createElementNS(SVGNS, "text");
        txt.setAttribute("x", "18"); txt.setAttribute("y", "-5");
        txt.setAttribute("font-family", "'Segoe UI', sans-serif");
        txt.setAttribute("font-size", "9.5px"); txt.setAttribute("font-weight", "800");
        txt.setAttribute("fill", "#0f172a");
        txt.textContent = "🚪 Portón EAAB & Filtro de Borde";
        g.appendChild(txt);

        const sub = document.createElementNS(SVGNS, "text");
        sub.setAttribute("x", "18"); sub.setAttribute("y", "6");
        sub.setAttribute("font-family", "'Segoe UI', sans-serif");
        sub.setAttribute("font-size", "8px"); sub.setAttribute("font-weight", "600");
        sub.setAttribute("fill", "#0284c7");
        sub.textContent = "Filtro: Velocidad 25 km/h ➔ 3 km/h (ZMPA 12.14 ha)";
        g.appendChild(sub);

        cultLayer2Svg.appendChild(g);
      }
    }
  }

  // Capa 3: Recorrido Pedagógico y Experiencia Sensorial
  function renderCulturalCapaOld3() {
    if (!cultLayer3Canvas) return;
    const rect = cultLayer3Canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = rect.width || 720, h = rect.height || 405;
    if (cultLayer3Canvas.width !== Math.round(w * dpr) || cultLayer3Canvas.height !== Math.round(h * dpr)) {
      cultLayer3Canvas.width = Math.round(w * dpr);
      cultLayer3Canvas.height = Math.round(h * dpr);
    }
    const ctx = cultLayer3Canvas.getContext("2d");
    ctx.resetTransform();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const projectPoint = (rx, ry, el = 0.05) => projectPointToLayer(rx, ry, el, w, h);

    const tourPts = [
      [7900, 2700],
      [7700, 2900],
      [7550, 3050],
      [7480, 3140]
    ];
    const scrTour = tourPts.map(p => projectPoint(p[0], p[1]));

    ctx.beginPath();
    ctx.moveTo(scrTour[0].x, scrTour[0].y);
    for (let i = 1; i < scrTour.length; i++) ctx.lineTo(scrTour[i].x, scrTour[i].y);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#15803d";
    ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    const prog = (cultTime * 0.15) % 1.0;
    const idx = Math.floor(prog * (scrTour.length - 1));
    const subProg = (prog * (scrTour.length - 1)) - idx;
    const p1 = scrTour[idx], p2 = scrTour[idx + 1] || p1;
    const stX = p1.x + (p2.x - p1.x) * subProg;
    const stY = p1.y + (p2.y - p1.y) * subProg;

    for (let s = 0; s < 4; s++) {
      ctx.beginPath();
      ctx.arc(stX + (s - 1.5) * 5, stY + (s % 2) * 4, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#16a34a";
      ctx.fill();
    }

    const platformPt = scrTour[3];
    if (platformPt.inFront) {
      const pulseR = 35 + Math.sin(cultTime * 3) * 6;
      ctx.beginPath();
      ctx.ellipse(platformPt.x, platformPt.y, pulseR * 1.5, pulseR * 0.8, -0.3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(22, 163, 74, 0.15)";
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(22, 163, 74, 0.6)";
      ctx.stroke();

      if (idx === 2 || idx === 3) {
        for (let b = 0; b < 6; b++) {
          const bAng = (b / 6) * Math.PI * 2 + cultTime * 0.5;
          const bx = platformPt.x + Math.cos(bAng) * (pulseR + 15);
          const by = platformPt.y + Math.sin(bAng) * (pulseR * 0.5 + 8);
          ctx.beginPath();
          ctx.arc(bx, by, 3, 0, Math.PI * 2);
          ctx.fillStyle = "#0284c7";
          ctx.fill();
        }
      }
    }

    if (cultLayer3Svg) {
      cultLayer3Svg.innerHTML = "";
      const SVGNS = "http://www.w3.org/2000/svg";

      const bibPt = scrTour[0];
      if (bibPt.inFront) {
        const g1 = document.createElementNS(SVGNS, "g");
        g1.setAttribute("transform", `translate(${bibPt.x}, ${bibPt.y})`);
        const dot1 = document.createElementNS(SVGNS, "circle");
        dot1.setAttribute("r", "5"); dot1.setAttribute("fill", "#15803d");
        g1.appendChild(dot1);
        const t1 = document.createElementNS(SVGNS, "text");
        t1.setAttribute("x", "8"); t1.setAttribute("y", "4");
        t1.setAttribute("font-family", "'Segoe UI', sans-serif");
        t1.setAttribute("font-size", "9px"); t1.setAttribute("font-weight", "800");
        t1.setAttribute("fill", "#0f172a");
        t1.textContent = "📚 Biblioteca El Tintal (Inicio)";
        g1.appendChild(t1);
        cultLayer3Svg.appendChild(g1);
      }

      if (platformPt.inFront) {
        const g2 = document.createElementNS(SVGNS, "g");
        g2.setAttribute("transform", `translate(${platformPt.x}, ${platformPt.y})`);

        const bg = document.createElementNS(SVGNS, "rect");
        bg.setAttribute("x", "-85"); bg.setAttribute("y", "-38");
        bg.setAttribute("width", "170"); bg.setAttribute("height", "28");
        bg.setAttribute("rx", "6"); bg.setAttribute("fill", "rgba(255,255,255,0.96)");
        bg.setAttribute("stroke", "#15803d"); bg.setAttribute("stroke-width", "1.5");
        g2.appendChild(bg);

        const txt = document.createElementNS(SVGNS, "text");
        txt.setAttribute("x", "0"); txt.setAttribute("y", "-24");
        txt.setAttribute("text-anchor", "middle");
        txt.setAttribute("font-family", "'Segoe UI', sans-serif");
        txt.setAttribute("font-size", "9.5px"); txt.setAttribute("font-weight", "800");
        txt.setAttribute("fill", "#0f172a");
        txt.textContent = "🤫 Franja de Silencio & Avistamiento";
        g2.appendChild(txt);

        const sub = document.createElementNS(SVGNS, "text");
        sub.setAttribute("x", "0"); sub.setAttribute("y", "-14");
        sub.setAttribute("text-anchor", "middle");
        sub.setAttribute("font-family", "'Segoe UI', sans-serif");
        sub.setAttribute("font-size", "8px"); sub.setAttribute("font-weight", "600");
        sub.setAttribute("fill", "#15803d");
        sub.textContent = "Aves se acercan al espejo de agua";
        g2.appendChild(sub);

        cultLayer3Svg.appendChild(g2);
      }
    }
  }

  // Capa 4: Fricción Vial y Solución Adaptativa SOT
  function renderCulturalCapaOld4(elevated) {
    if (!cultLayer4Canvas) return;
    const rect = cultLayer4Canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = rect.width || 720, h = rect.height || 405;
    if (cultLayer4Canvas.width !== Math.round(w * dpr) || cultLayer4Canvas.height !== Math.round(h * dpr)) {
      cultLayer4Canvas.width = Math.round(w * dpr);
      cultLayer4Canvas.height = Math.round(h * dpr);
    }
    const ctx = cultLayer4Canvas.getContext("2d");
    ctx.resetTransform();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const projectPoint = (rx, ry, el = 0.05) => projectPointToLayer(rx, ry, el, w, h);

    const caliPts = [
      [7100, 3700], [7300, 3400], [7500, 3100], [7700, 2800]
    ];
    const scrCali = caliPts.map(p => projectPoint(p[0], p[1], elevated ? 0.35 : 0.05));

    if (elevated) {
      ctx.beginPath();
      ctx.moveTo(scrCali[0].x, scrCali[0].y);
      for (let i = 1; i < scrCali.length; i++) ctx.lineTo(scrCali[i].x, scrCali[i].y);
      ctx.lineWidth = 7.0;
      ctx.strokeStyle = "#16a34a";
      ctx.stroke();

      ctx.lineWidth = 4.0;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();

      for (let v = 0; v < 6; v++) {
        const prog = (cultTime * 0.5 + v * 0.16) % 1.0;
        const idx = Math.floor(prog * (scrCali.length - 1));
        const subProg = (prog * (scrCali.length - 1)) - idx;
        const p1 = scrCali[idx], p2 = scrCali[idx + 1] || p1;
        const vx = p1.x + (p2.x - p1.x) * subProg;
        const vy = p1.y + (p2.y - p1.y) * subProg;

        ctx.beginPath();
        ctx.arc(vx, vy, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#16a34a";
        ctx.fill();
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(scrCali[0].x, scrCali[0].y);
      for (let i = 1; i < scrCali.length; i++) ctx.lineTo(scrCali[i].x, scrCali[i].y);
      ctx.lineWidth = 5.0;
      ctx.strokeStyle = "#dc2626";
      ctx.stroke();

      ctx.lineWidth = 12.0;
      ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
      ctx.stroke();

      for (let v = 0; v < 8; v++) {
        const p1 = scrCali[1], p2 = scrCali[2];
        const f = v / 7;
        const vx = p1.x + (p2.x - p1.x) * f + (Math.sin(v) * 4);
        const vy = p1.y + (p2.y - p1.y) * f + (Math.cos(v) * 3);

        ctx.beginPath();
        ctx.rect(vx - 5, vy - 3, 10, 6);
        ctx.fillStyle = "#dc2626";
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
      }
    }

    if (cultLayer4Svg) {
      cultLayer4Svg.innerHTML = "";
      const SVGNS = "http://www.w3.org/2000/svg";
      const midPt = scrCali[Math.floor(scrCali.length / 2)];

      if (midPt.inFront) {
        const g = document.createElementNS(SVGNS, "g");
        g.setAttribute("transform", `translate(${midPt.x}, ${midPt.y})`);

        const bg = document.createElementNS(SVGNS, "rect");
        bg.setAttribute("x", "-100"); bg.setAttribute("y", "-42");
        bg.setAttribute("width", "200"); bg.setAttribute("height", "32");
        bg.setAttribute("rx", "6"); bg.setAttribute("fill", "rgba(255,255,255,0.96)");
        bg.setAttribute("stroke", elevated ? "#16a34a" : "#dc2626");
        bg.setAttribute("stroke-width", "1.5");
        g.appendChild(bg);

        const txt = document.createElementNS(SVGNS, "text");
        txt.setAttribute("x", "0"); txt.setAttribute("y", "-28");
        txt.setAttribute("text-anchor", "middle");
        txt.setAttribute("font-family", "'Segoe UI', sans-serif");
        txt.setAttribute("font-size", "9.5px"); txt.setAttribute("font-weight", "800");
        txt.setAttribute("fill", "#0f172a");
        txt.textContent = elevated ? "🌉 Vía Elevada Flotante SOT" : "🚌 Fricción Vial Av. Ciudad de Cali";
        g.appendChild(txt);

        const sub = document.createElementNS(SVGNS, "text");
        sub.setAttribute("x", "0"); sub.setAttribute("y", "-17");
        sub.setAttribute("text-anchor", "middle");
        sub.setAttribute("font-family", "'Segoe UI', sans-serif");
        sub.setAttribute("font-size", "8px"); sub.setAttribute("font-weight", "600");
        sub.setAttribute("fill", elevated ? "#16a34a" : "#dc2626");
        sub.textContent = elevated ? "Conexión hídrica libre bajo puente (4.9 ha ↔ 13.9 ha)" : "Inundación por lluvias · TAD: +2 horas";
        g.appendChild(sub);

        cultLayer4Svg.appendChild(g);
      }
    }
  }

  // ============================================================
  // Etiquetas de escala (natural / cultural / tecnologica): se pueden
  // ARRASTRAR libremente y cambiar su tamaño con un control arriba a la
  // izquierda, que tambien muestra su posicion actual para copiarla.
  // Ya no se distorsionan (pedido del usuario).
  // ============================================================
  (function setupScaleLabels() {
    const overlay = document.getElementById("explodeOverlay");
    if (!overlay) return;
    const panel = document.createElement("div");
    panel.id = "scaleLabelPanel";
    panel.style.cssText = "position:absolute; top:14px; left:14px; z-index:420; background:rgba(255,255,255,.95); border:1px solid rgba(0,0,0,.12); border-radius:8px; padding:8px 10px; font:11px 'Segoe UI',sans-serif; color:#111418; box-shadow:0 4px 14px rgba(0,0,0,.08); width:250px;";
    panel.innerHTML = '<div style="font-weight:700; margin-bottom:6px;">Etiquetas de escala</div>' +
      '<label style="display:flex; align-items:center; gap:6px;">Tamaño <input type="range" id="scaleLabelSize" min="4" max="24" step="0.5" value="7.5" style="flex:1;"><span id="scaleLabelSizeVal">7.5px</span></label>' +
      '<textarea id="scaleLabelCoords" readonly style="margin-top:6px; width:100%; height:62px; font-size:10px; border:1px solid rgba(0,0,0,.12); border-radius:5px; padding:4px; resize:none;"></textarea>';
    overlay.appendChild(panel);
    panel.addEventListener("click", e => e.stopPropagation());
    const sizeInput = panel.querySelector("#scaleLabelSize");
    const sizeVal = panel.querySelector("#scaleLabelSizeVal");
    const coordsOut = panel.querySelector("#scaleLabelCoords");
    const labels = Array.from(document.querySelectorAll(".explode-text"));
    function refresh() {
      coordsOut.value = labels.map(l => `${l.textContent.trim()}: top ${l.style.top}, left ${l.style.left}, ${l.style.fontSize}`).join("\n");
    }
    labels.forEach(l => {
      l.setAttribute("contenteditable", "false");
      l.style.cursor = "move";
      l.style.transform = "none";
      l.style.userSelect = "none";
    });
    sizeInput.addEventListener("input", () => {
      labels.forEach(l => { l.style.fontSize = sizeInput.value + "px"; });
      sizeVal.textContent = sizeInput.value + "px";
      refresh();
    });
    let drag = null;
    labels.forEach(l => {
      l.addEventListener("pointerdown", e => {
        e.stopPropagation(); e.preventDefault();
        const parent = l.parentElement.getBoundingClientRect();
        const r = l.getBoundingClientRect();
        drag = { el: l, parent, dx: e.clientX - r.left, dy: e.clientY - r.top };
      });
      l.addEventListener("click", e => e.stopPropagation()); // que arrastrar no dispare el zoom de la capa
    });
    window.addEventListener("pointermove", e => {
      if (!drag) return;
      const p = drag.parent;
      const x = ((e.clientX - drag.dx - p.left) / p.width) * 100;
      const y = ((e.clientY - drag.dy - p.top) / p.height) * 100;
      drag.el.style.left = x.toFixed(1) + "%";
      drag.el.style.top = y.toFixed(1) + "%";
      refresh();
    });
    window.addEventListener("pointerup", () => { drag = null; });
    refresh();

    // Dibujar poligono encima de las 3 axonometrias (clic = punto, doble
    // clic = cerrar; los puntos se pueden arrastrar). Negro, relleno negro.
    const penBtn = document.createElement("button");
    penBtn.textContent = "Dibujar polígono";
    penBtn.style.cssText = "margin-top:6px; width:100%; padding:5px; font-size:11px; border-radius:5px; border:1px solid rgba(0,0,0,.2); background:#fff; cursor:pointer;";
    panel.appendChild(penBtn);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.cssText = "position:absolute; inset:0; width:100%; height:100%; z-index:410; pointer-events:none;";
    overlay.appendChild(svg);
    const polys = []; let cur = null, drawing = false, dragPt = null;
    function redraw() {
      svg.innerHTML = "";
      polys.concat(cur ? [cur] : []).forEach(pl => {
        const g = document.createElementNS(svg.namespaceURI, pl.closed ? "polygon" : "polyline");
        g.setAttribute("points", pl.pts.map(p => p.join(",")).join(" "));
        g.setAttribute("fill", pl.closed ? "#0a0a0a" : "none"); g.setAttribute("stroke", "#0a0a0a"); g.setAttribute("stroke-width", "1.5");
        svg.appendChild(g);
        if (drawing) pl.pts.forEach((p, i) => {
          const c = document.createElementNS(svg.namespaceURI, "circle");
          c.setAttribute("cx", p[0]); c.setAttribute("cy", p[1]); c.setAttribute("r", "4"); c.setAttribute("fill", "#fff"); c.setAttribute("stroke", "#0a0a0a");
          c.style.pointerEvents = "auto"; c.style.cursor = "move";
          c.addEventListener("pointerdown", e => { e.stopPropagation(); e.preventDefault(); dragPt = { pl, i }; });
          svg.appendChild(c);
        });
      });
    }
    penBtn.addEventListener("click", e => {
      e.stopPropagation(); drawing = !drawing;
      penBtn.textContent = drawing ? "Terminar dibujo (doble clic cierra)" : "Dibujar polígono";
      penBtn.style.background = drawing ? "#111418" : "#fff"; penBtn.style.color = drawing ? "#fff" : "#111418";
      if (!drawing && cur && cur.pts.length > 2) { cur.closed = true; polys.push(cur); cur = null; }
      redraw();
    });
    const localPt = e => { const r = overlay.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    overlay.addEventListener("click", e => {
      if (!drawing || panel.contains(e.target)) return;
      e.stopPropagation(); e.preventDefault();
      if (!cur) cur = { pts: [], closed: false };
      cur.pts.push(localPt(e)); redraw();
    }, true);
    overlay.addEventListener("dblclick", e => {
      if (!drawing || !cur) return; e.stopPropagation();
      cur.pts.pop(); if (cur.pts.length > 2) { cur.closed = true; polys.push(cur); } cur = null; redraw();
    }, true);
    window.addEventListener("pointermove", e => { if (!dragPt) return; dragPt.pl.pts[dragPt.i] = localPt(e); redraw(); });
    window.addEventListener("pointerup", () => { dragPt = null; });
  })();
})();





const btnZoomOutSec = document.getElementById("btnZoomOutSec");
const btnZoomInSec = document.getElementById("btnZoomInSec");

if (btnZoomOutSec && btnZoomInSec && typeof sectionCamera !== 'undefined') {
    btnZoomOutSec.addEventListener("click", () => {
        sectionCamera.fov = Math.min(100, sectionCamera.fov + 2);
        sectionCamera.updateProjectionMatrix();
    });
    btnZoomInSec.addEventListener("click", () => {
        sectionCamera.fov = Math.max(2, sectionCamera.fov - 2);
        sectionCamera.updateProjectionMatrix();
    });
}

const tags = document.querySelectorAll(".tech-layer-tag");
const tagOut = document.getElementById("tagCoordsBox");

function updateTagCoords() {
    if(!tagOut) return;
    tagOut.style.display = "block";
    let out = "<b>COORDENADAS:</b><br>";
    tags.forEach((t, i) => {
        out += `Capa ${i}: left: ${t.style.left}, top: ${t.style.top}<br>`;
    });
    tagOut.innerHTML = out;
}

tags.forEach((t, i) => {
    if(!t.style.left) t.style.left = "240px";
    if(!t.style.top) t.style.top = "50%";
    
    const panel = document.createElement("div");
    panel.style.position = "absolute";
    panel.style.left = "-60px";
    panel.style.top = "0px";
    panel.style.background = "#fff";
    panel.style.border = "1px solid #000";
    panel.style.padding = "2px";
    panel.style.display = "grid";
    panel.style.gridTemplateColumns = "1fr 1fr 1fr";
    panel.style.gap = "2px";
    panel.style.pointerEvents = "auto";
    panel.style.zIndex = "9999";
    
    t.style.pointerEvents = "auto";
    
    const btnUp = document.createElement("button"); btnUp.textContent = "↑";
    const btnDown = document.createElement("button"); btnDown.textContent = "↓";
    const btnLeft = document.createElement("button"); btnLeft.textContent = "←";
    const btnRight = document.createElement("button"); btnRight.textContent = "→";
    
    btnUp.onclick = (e) => { e.stopPropagation(); let top = parseFloat(t.style.top) || 50; t.style.top = (top - 1) + "%"; updateTagCoords(); };
    btnDown.onclick = (e) => { e.stopPropagation(); let top = parseFloat(t.style.top) || 50; t.style.top = (top + 1) + "%"; updateTagCoords(); };
    btnLeft.onclick = (e) => { e.stopPropagation(); let left = parseFloat(t.style.left) || 240; t.style.left = (left - 5) + "px"; updateTagCoords(); };
    btnRight.onclick = (e) => { e.stopPropagation(); let left = parseFloat(t.style.left) || 240; t.style.left = (left + 5) + "px"; updateTagCoords(); };
    
    panel.appendChild(document.createElement("div"));
    panel.appendChild(btnUp);
    panel.appendChild(document.createElement("div"));
    panel.appendChild(btnLeft);
    panel.appendChild(document.createElement("div"));
    panel.appendChild(btnRight);
    panel.appendChild(document.createElement("div"));
    panel.appendChild(btnDown);
    panel.appendChild(document.createElement("div"));
    
    t.appendChild(panel);
});
