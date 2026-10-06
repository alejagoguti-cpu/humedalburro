/* Red de interacciones bioticas sobre el CORTE DINAMICO.
   Cada especie o factor es una bolita con su imagen (sin fondo); las lineas llevan el color del
   tipo de interaccion. Las bolitas se arrastran, y "Copiar posiciones" entrega las coordenadas
   (normalizadas 0-1 sobre la imagen del corte) para dejarlas fijas en POS_FIJAS.
   Fuente de la red: documento de la usuaria (Red de Interacciones Bioticas de Kennedy). */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  // Colores de las LINEAS (codigo de la usuaria)
  const COL = { verde: "#22a447", amarillo: "#d9a406", rojo: "#e03a3e", azul: "#2f6fe0", turquesa: "#0fb5b0" };
  // Colores del TEXTO por categoria
  const TXT = { ave: "#b98a00", dep: "#d62f35", inv: "#c42eb4", anf: "#2a6fd6", flora: "#16883b", micro: "#0a8f9c" };
  const MULT = { urapan: 1.25, capuli: 1.15, sauce: 1.1, enea: 1.05, garza: 1.1, escarabajos: 0.95, mirla: 1.0 };
  const NODOS = [
    { id: "monjita", t: "Monjita cabeciamarilla", s: "Chrysomus icterocephalus", cat: "ave", img: "assets/inat_monjita.png", kind: "circle", w: 240, h: 240, obs: 42, pos: [0.2481, 0.775] },
    { id: "gallineta_roja", t: "Gallineta frente roja", s: "Gallinula galeata", cat: "ave", img: "assets/inat_gallineta_roja.png", kind: "circle", w: 240, h: 240, obs: 33, pos: [0.3571, 0.775] },
    { id: "gallineta_morada", t: "Gallineta morada (tingua azul)", s: "Porphyrio martinica", cat: "ave", img: "assets/inat_gallineta_morada.png", kind: "circle", w: 240, h: 240, obs: 23, pos: [0.6303, 0.33] },
    { id: "gallareta", t: "Gallareta americana", s: "Fulica americana", cat: "ave", img: "assets/inat_gallareta.png", kind: "circle", w: 240, h: 240, obs: 32, pos: [0.5063, 0.33] },
    { id: "oxyura", t: "Pato zambullidor grande", s: "Oxyura ferruginea", cat: "ave", img: "assets/inat_oxyura.png", kind: "circle", w: 240, h: 240, obs: 33, pos: [0.14, 0.775] },
    { id: "mirla", t: "Mirla patinaranja", s: "Turdus fuscater", cat: "ave", img: "assets/inat_mirla.png", kind: "circle", w: 240, h: 240, obs: 18, pos: [0.2883, 0.3326] },
    { id: "chamon", t: "Chamón (tordo sudamericano)", s: "Molothrus bonariensis", cat: "ave", img: "assets/inat_chamon.png", kind: "circle", w: 240, h: 240, obs: 17, pos: [0.215, 0.575] },
    { id: "copeton", t: "Copetón", s: "Zonotrichia capensis", cat: "ave", img: "assets/inat_copeton.png", kind: "circle", w: 240, h: 240, obs: 15, pos: [0.481, 0.775] },
    { id: "milano", t: "Milano cola blanca", s: "Elanus leucurus", cat: "ave", img: "assets/inat_milano.png", kind: "circle", w: 240, h: 240, obs: 18, pos: [0.14, 0.641] },
    { id: "garza", t: "Garza real", s: "Ardea alba", cat: "ave", img: "assets/inat_garza.png", kind: "circle", w: 240, h: 240, obs: 6, pos: [0.7474, 0.775] },
    { id: "colibri", t: "Colibrí chillón", s: "Colibri coruscans", cat: "ave", img: "assets/inat_colibri.png", kind: "circle", w: 240, h: 240, obs: 17, pos: [0.86, 0.775] },
    { id: "sirfidos", t: "Moscas de las flores", s: "Syrphidae · Palpada, Toxomerus", cat: "inv", img: "assets/inat_sirfidos.png", kind: "circle", w: 240, h: 240, obs: 36, pos: [0.5425, 0.4546] },
    { id: "mariposa", t: "Mariposa blanca de la col", s: "Leptophobia aripa", cat: "inv", img: "assets/inat_mariposa.png", kind: "circle", w: 240, h: 240, obs: 15, pos: [0.3895, 0.33] },
    { id: "libelulas", t: "Libélulas y caballitos del diablo", s: "Odonata · Ischnura", cat: "inv", img: "assets/inat_libelulas.png", kind: "circle", w: 240, h: 240, obs: 3, pos: [0.5567, 0.6671] },
    { id: "rata", t: "Rata gris", s: "Rattus norvegicus", cat: "dep", img: "assets/inat_rata.png", kind: "circle", w: 240, h: 240, obs: 9, pos: [0.4182, 0.4461] },
    { id: "rana", t: "Rana sabanera", s: "Dendropsophus molitor", cat: "anf", img: "assets/inat_rana.png", kind: "circle", w: 240, h: 240, obs: 2, pos: [0.6321, 0.5677] },
    { id: "juncal", t: "Juncal: junco y tule", s: "Schoenoplectus californicus · Typha latifolia", cat: "flora", img: "assets/inat_juncal.png", kind: "circle", w: 240, h: 240, obs: 4, pos: [0.4163, 0.6605] },
    { id: "capulin", t: "Capulí", s: "Prunus serotina", cat: "flora", img: "assets/inat_capulin.png", kind: "circle", w: 240, h: 240, obs: 6, pos: [0.2866, 0.4721] },
    { id: "sauco", t: "Saúco", s: "Sambucus nigra", cat: "flora", img: "assets/inat_sauco.png", kind: "circle", w: 240, h: 240, obs: 3, pos: [0.2757, 0.6313] },
    { id: "chilca", t: "Chilca y ciro", s: "Baccharis latifolia · B. macrantha", cat: "flora", img: "assets/inat_chilca.png", kind: "circle", w: 240, h: 240, obs: 3, pos: [0.86, 0.6242] },
    { id: "espino", t: "Espino", s: "Duranta mutisii", cat: "flora", img: "assets/inat_espino.png", kind: "circle", w: 240, h: 240, obs: 9, pos: [0.4957, 0.5624] },
    { id: "mastuerzo", t: "Mastuerzo", s: "Tropaeolum majus", cat: "flora", img: "assets/inat_mastuerzo.png", kind: "circle", w: 240, h: 240, obs: 1, pos: [0.3687, 0.5554] },
    { id: "timboco", t: "Timboco", s: "Tecoma stans", cat: "flora", img: "assets/inat_timboco.png", kind: "circle", w: 240, h: 240, obs: 2, pos: [0.6184, 0.775] },
    { id: "lenteja", t: "Lenteja de agua", s: "Lemna minuta", cat: "flora", img: "assets/inat_lenteja.png", kind: "circle", w: 240, h: 240, obs: 1, pos: [0.6439, 0.4484] },
    { id: "nutrientes", t: "Nutrientes: nitrógeno y fósforo", s: "N y P", cat: "flora", img: "assets/cx_nutrientes.png", kind: "circle", w: 240, h: 240, pos: [0.7637, 0.579] },
    { id: "anoxia", t: "Disminución de oxígeno", s: "anoxia · OD ≈ 0 mg/L", cat: "micro", img: "assets/cx_anoxia.png", kind: "circle", w: 240, h: 240, pos: [0.6934, 0.6715] }
  ];
  const ENLACES = [
    ["mirla", "capulin", "verde", "Frugivoría y dispersión de semillas", "La mirla patinaranja come los frutos del capulí y dispersa sus semillas.", "Red de interacciones del documento", null],
    ["mirla", "sauco", "verde", "Alimentación y refugio", "La mirla patinaranja se alimenta de los frutos del saúco y se refugia en su follaje.", "Red de interacciones del documento", null],
    ["chamon", "mirla", "rojo", "Parasitismo de nido", "El chamón pone sus huevos en el nido de la mirla: la mirla incuba y cría un polluelo que no es suyo.", "Red de interacciones del documento", null],
    ["chamon", "copeton", "rojo", "Parasitismo de nido", "El chamón pone sus huevos en nidos del copetón, su hospedero más estudiado en Bogotá: allí el chamón ha aumentado mientras el copetón ha disminuido.", "Estudio en Bogotá sobre el parasitismo del chamón en el copetón (Universidad Nacional de Colombia)", "https://revistas.unal.edu.co/index.php/cal/article/view/117202"],
    ["monjita", "juncal", "verde", "Nidificación", "La monjita cabeciamarilla anida y se posa en el juncal de junco y tule.", "Red de interacciones del documento", null],
    ["gallineta_morada", "juncal", "verde", "Nidificación y refugio", "La gallineta morada (tingua azul) anida y se refugia en el juncal.", "Red de interacciones del documento", null],
    ["gallineta_roja", "juncal", "verde", "Nidificación", "La gallineta frente roja construye su nido entre la vegetación emergente del juncal.", "Ecología documentada de la especie", null],
    ["oxyura", "juncal", "verde", "Nidificación", "El pato zambullidor grande anida escondido en la vegetación densa del juncal.", "Ecología documentada de la especie", null],
    ["gallareta", "juncal", "verde", "Nidificación", "La gallareta americana construye nidos flotantes anclados a la vegetación del juncal.", "Ecología documentada de la especie", null],
    ["gallareta", "lenteja", "verde", "Alimentación", "La gallareta americana se alimenta de plantas acuáticas y algas, entre ellas la lenteja de agua.", "Ecología documentada de la especie", null],
    ["gallineta_morada", "libelulas", "amarillo", "Depredación", "La gallineta morada (tingua azul) caza libélulas y otros invertebrados.", "Red de interacciones del documento", null],
    ["rata", "gallineta_morada", "rojo", "Depredación exótica", "Las ratas introducidas depredan huevos y polluelos de aves que anidan cerca del agua, como la gallineta morada.", "Ecología documentada de la especie", null],
    ["milano", "rata", "amarillo", "Depredación", "El milano cola blanca caza roedores, como las ratas, en los pastizales y bordes del humedal.", "Ecología documentada de la especie", null],
    ["garza", "rana", "amarillo", "Depredación", "La garza real caza ranas sabaneras en la orilla del humedal.", "Red de interacciones del documento", null],
    ["garza", "libelulas", "amarillo", "Depredación de larvas acuáticas", "La garza real se come las larvas acuáticas de las libélulas.", "Red de interacciones del documento", null],
    ["rana", "libelulas", "azul", "Consumo de insectos", "La rana sabanera se alimenta de insectos, entre ellos las libélulas.", "Red de interacciones del documento", null],
    ["anoxia", "rana", "rojo", "Mortalidad por asfixia", "Cuando el oxígeno disuelto cae casi a cero, la rana sabanera sufre estrés metabólico y muere por asfixia: se pierde biodiversidad acuática.", "Red de interacciones del documento", null],
    ["sirfidos", "chilca", "verde", "Visita floral", "Las moscas de felpa (género Palpada) se posan en las flores del ciro (Baccharis macrantha) y las visitan en busca de polen y néctar.", "Observación de iNaturalist en el humedal El Burro (Kennedy), 2024", "https://www.inaturalist.org/observations/208201772"],
    ["sirfidos", "espino", "verde", "Visita floral", "Las moscas de las flores (sírfidos) se posan en las flores del espino (Duranta mutisii).", "Observación de iNaturalist en el humedal El Burro (Kennedy), 2023", "https://www.inaturalist.org/observations/184402286"],
    ["sirfidos", "sauco", "verde", "Polinización", "Las flores del saúco no tienen néctar: las visitan sobre todo moscas, escarabajos y abejas, que las polinizan.", "Literatura sobre la polinización de Sambucus nigra", null],
    ["mariposa", "mastuerzo", "verde", "Herbivoría y puesta de huevos", "La mariposa blanca de la col pone sus huevos en las hojas del mastuerzo, que alimentan a sus orugas.", "Registro real en Kennedy (Jardín Botánico de Bogotá, 2023)", null],
    ["colibri", "timboco", "verde", "Visita floral y polinización", "El colibrí chillón toma néctar de las flores del timboco y transporta su polen. El timboco está entre los arbustos más visitados por colibríes, y el colibrí chillón fue la especie con más interacciones.", "Estudio de colibríes y sus flores en Cajamarca, Perú (El Hornero, 2025)", "https://elhornero.avesargentinas.org.ar/home/article/download/1522/1497/2374"],
    ["nutrientes", "lenteja", "verde", "Eutrofización", "Cuando el agua recibe demasiado nitrógeno y fósforo (eutrofización), la lenteja de agua y las algas se multiplican.", "Red de interacciones del documento", null],
    ["lenteja", "anoxia", "turquesa", "Cobertura y descomposición", "Un tapete denso de lenteja de agua bloquea la luz y, al descomponerse, gasta el oxígeno del agua.", "Ecología documentada de la especie", null]
  ];

  // Posiciones fijas: aqui se pegan las que mande la usuaria con "Copiar posiciones".
  const POS_FIJAS = {};
  function el(tag, attrs) { const e = document.createElementNS(NS, tag); if (attrs) Object.keys(attrs).forEach(k => e.setAttribute(k, attrs[k])); return e; }
  function wrap(txt, max) {
    const words = txt.split(" "), lines = []; let cur = "";
    words.forEach(w => { if ((cur + " " + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + " " + w).trim(); });
    if (cur) lines.push(cur); return lines;
  }
  window.crearConectografiaCorte = function (cfg) {
    const host = cfg.host;
    if (!host) return null;
    const KEY = "cx_pos_dyn_v1";
    const pos = {};
    NODOS.forEach(n => { pos[n.id] = (POS_FIJAS[n.id] || n.pos).slice(); });
    try { const s = JSON.parse(sessionStorage.getItem(KEY) || "null"); if (s) Object.keys(s).forEach(k => { if (pos[k]) pos[k] = s[k]; }); } catch (e) {}
    if (!document.getElementById("cxEstilos")) {
      const st = document.createElement("style"); st.id = "cxEstilos";
      st.textContent = ".cx-alas{ transform-box: fill-box; transform-origin: 50% 65%; animation: cxAlas .12s ease-in-out infinite alternate; } @keyframes cxAlas { from { transform: scale(1,1); } to { transform: scale(1,.76) skewX(-2deg); } } .cx-txt{ paint-order: stroke; stroke: rgba(255,255,255,.94); stroke-width: 3.2px; stroke-linejoin: round; font-family: 'Segoe UI', sans-serif; font-weight: 700; } .cx-sci{ font-weight: 500; font-style: italic; }";
      document.head.appendChild(st);
    }
    const svg = el("svg", { class: "cx-red" });
    svg.style.cssText = "position:absolute; inset:0; width:100%; height:100%; z-index:10; pointer-events:none; overflow:visible;";
    const defs = el("defs");
    Object.keys(COL).forEach(k => { const m = el("marker", { id: "cxFlecha-" + k, viewBox: "0 0 10 10", refX: "9", refY: "5", markerWidth: "6", markerHeight: "6", orient: "auto" }); m.appendChild(el("path", { d: "M0,1 L10,5 L0,9 z", fill: COL[k] })); defs.appendChild(m); });
    svg.appendChild(defs);
    const gLines = el("g"), gHits = el("g"), gNodes = el("g");
    svg.appendChild(gLines); svg.appendChild(gHits); svg.appendChild(gNodes); host.appendChild(svg);
    const byId = {}; NODOS.forEach(n => { byId[n.id] = n; });
    // ---- enlaces ----
    const lineEls = ENLACES.map(([a, b, c, tipo, frase, fuente, url]) => {
      const ln = el("line", { stroke: COL[c], "stroke-linecap": "round", "marker-end": "url(#cxFlecha-" + c + ")" });
      ln.style.pointerEvents = "none";
      // zona de clic ancha e invisible para poder tocar la linea con facilidad
      const hit = el("line", { class: "cx-hit", stroke: "transparent", "stroke-width": "14", "stroke-linecap": "round" });
      hit.style.cssText = "pointer-events:stroke; cursor:pointer;";
      const t = el("title"); t.textContent = byId[a].t + " \u2192 " + byId[b].t + " (" + tipo + "). Haz clic para ver qu\u00e9 significa."; hit.appendChild(t);
      gLines.appendChild(ln); gHits.appendChild(hit);
      const L = { a, b, c, ln, hit, tipo, frase, fuente, url, recip: ENLACES.some(x => x[0] === b && x[1] === a) };
      hit.addEventListener("click", e => { e.stopPropagation(); sel = L; resalta(); mostrarTarjeta(L, e); });
      return L;
    });
    // ---- nodos ----
    let drag = null, hover = null, sel = null, card = null;
    const nodeEls = {};
    NODOS.forEach(n => {
      const g = el("g"); g.style.cssText = "cursor:grab; pointer-events:all;";
      const t = el("title"); t.textContent = n.t + (n.s ? " (" + n.s + ")" : "") + (n.obs ? " \u00b7 " + n.obs + " observaciones en iNaturalist (humedal El Burro)" : ""); g.appendChild(t);
      const ring = n.kind === "circle" ? el("circle", { fill: "none", stroke: TXT[n.cat], "stroke-width": "2" }) : null;
      if (ring) g.appendChild(ring);
      const im = el("image", { href: n.img, preserveAspectRatio: "xMidYMid meet" });
      if (n.anim === "alas") im.setAttribute("class", "cx-alas");
      g.appendChild(im);
      const txt = el("text", { class: "cx-txt", "text-anchor": "middle", fill: TXT[n.cat] });
      const lines = wrap(n.t, 17); const tsp = [];
      lines.forEach(l => { const ts = el("tspan", { "text-anchor": "middle" }); ts.textContent = l; txt.appendChild(ts); tsp.push(ts); });
      g.appendChild(txt);
      gNodes.appendChild(g);
      nodeEls[n.id] = { g, im, ring, txt, tsp, w: 0, h: 0 };
      g.addEventListener("pointerdown", e => { if (e.button !== 0) return; e.preventDefault(); e.stopPropagation(); cerrarTarjeta(); drag = n.id; g.setPointerCapture(e.pointerId); g.style.cursor = "grabbing"; });
      g.addEventListener("pointermove", e => {
        if (drag !== n.id) return;
        const r = svg.getBoundingClientRect(), b = cfg.getBox();
        pos[n.id] = [Math.min(1, Math.max(0, (e.clientX - r.left - b.l) / b.w)), Math.min(1, Math.max(0, (e.clientY - r.top - b.t) / b.h))];
        place(b);
      });
      const end = e => { if (drag !== n.id) return; drag = null; g.style.cursor = "grab"; try { sessionStorage.setItem(KEY, JSON.stringify(pos)); } catch (er) {} };
      g.addEventListener("pointerup", end); g.addEventListener("pointercancel", end);
      g.addEventListener("pointerenter", () => { hover = n.id; resalta(); });
      g.addEventListener("pointerleave", () => { hover = null; resalta(); });
    });
    function resalta() {
      const foco = sel || hover;
      lineEls.forEach(l => {
        const on = sel ? l === sel : (hover && (l.a === hover || l.b === hover));
        l.ln.style.opacity = foco ? (on ? "1" : "0.12") : "0.85";
        l.ln.setAttribute("stroke-width", on ? String(l.sw * (sel ? 2.3 : 1.7)) : String(l.sw));
      });
      Object.keys(nodeEls).forEach(k => {
        const rel = !foco || (sel ? (k === sel.a || k === sel.b) : (k === hover || lineEls.some(l => (l.a === hover && l.b === k) || (l.b === hover && l.a === k))));
        nodeEls[k].g.style.opacity = rel ? "1" : "0.35";
      });
    }
    // ---- tarjeta que explica la conexion al hacer clic en una linea ----
    function cerrarTarjeta() { if (card) { card.remove(); card = null; } if (sel) { sel = null; resalta(); } }
    function mostrarTarjeta(l, e) {
      if (card) { card.remove(); card = null; }
      const A = byId[l.a], B = byId[l.b], hr = host.getBoundingClientRect();
      card = document.createElement("div");
      card.style.cssText = "position:absolute; z-index:40; width:300px; padding:11px 14px 12px; border-radius:8px; background:#fff; border:1px solid #d5dbe1; border-left:5px solid " + COL[l.c] + "; box-shadow:0 10px 28px rgba(15,23,42,.18); font:500 12px/1.45 'Segoe UI',sans-serif; color:#1e293b;";
      card.innerHTML = '<button type="button" aria-label="Cerrar" style="position:absolute; top:6px; right:8px; border:0; background:none; font:400 18px/1 sans-serif; color:#64748b; cursor:pointer;">\u00d7</button>'
        + '<div style="font:800 10px \'Segoe UI\',sans-serif; letter-spacing:.06em; text-transform:uppercase; color:' + COL[l.c] + '; margin-bottom:3px; padding-right:18px;">' + l.tipo + '</div>'
        + '<div style="font:800 13px \'Segoe UI\',sans-serif; margin-bottom:5px; padding-right:14px;">' + A.t + ' \u2192 ' + B.t + '</div>'
        + '<div style="margin-bottom:7px;">' + l.frase + '</div>'
        + '<div style="font:500 10.5px/1.35 \'Segoe UI\',sans-serif; color:#64748b; border-top:1px solid #e5e9ee; padding-top:6px;">Fuente: ' + l.fuente + (l.url ? ' \u00b7 <a href="' + l.url + '" target="_blank" rel="noopener" style="color:#2f6fe0; text-decoration:underline;">ver la fuente</a>' : '') + '</div>';
      card.addEventListener("pointerdown", ev => ev.stopPropagation());
      card.querySelector("button").addEventListener("click", cerrarTarjeta);
      host.appendChild(card);
      const cw = card.offsetWidth, ch = card.offsetHeight;
      // la tarjeta se coloca junto al clic, pero en el lado donde NO tape ninguna de las dos bolitas de la conexion
      const bx = cfg.getBox(), cx = e.clientX - hr.left, cy = e.clientY - hr.top, rad = 44;
      const pa = [bx.l + pos[l.a][0] * bx.w, bx.t + pos[l.a][1] * bx.h], pb = [bx.l + pos[l.b][0] * bx.w, bx.t + pos[l.b][1] * bx.h];
      const fit = (x, y) => [Math.max(8, Math.min(x, hr.width - cw - 8)), Math.max(8, Math.min(y, hr.height - ch - 8))];
      const tapa = r => [pa, pb].some(p => p[0] > r[0] - rad && p[0] < r[0] + cw + rad && p[1] > r[1] - rad && p[1] < r[1] + ch + rad);
      const cands = [fit(cx + 14, cy + 14), fit(cx - cw - 14, cy + 14), fit(cx + 14, cy - ch - 14), fit(cx - cw - 14, cy - ch - 14), fit(cx - cw / 2, cy + 40), fit(cx - cw / 2, cy - ch - 40)];
      const pick = cands.find(r => !tapa(r)) || cands[0];
      card.style.left = pick[0] + "px"; card.style.top = pick[1] + "px";
    }
    document.addEventListener("pointerdown", e => { if (card && !card.contains(e.target) && !(e.target.getAttribute && e.target.getAttribute("class") === "cx-hit")) cerrarTarjeta(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") cerrarTarjeta(); });
    function size(n, b) {
      const base = b.w * 0.037 * (MULT[n.id] || 1);
      if (n.kind === "circle") return [base * 1.08, base * 1.08];
      const k = base / Math.max(n.w, n.h); return [n.w * k, n.h * k];
    }
    function place(b) {
      if (!b || !b.w) return;
      const fs = Math.max(9, b.w * 0.0062), sw = Math.max(1.4, b.w * 0.0011);
      const P = {};
      NODOS.forEach(n => {
        const [w, h] = size(n, b), e = nodeEls[n.id], x = b.l + pos[n.id][0] * b.w, y = b.t + pos[n.id][1] * b.h;
        P[n.id] = { x, y, r: n.kind === "circle" ? w / 2 : Math.hypot(w, h) * 0.30 + 3 };
        e.g.setAttribute("transform", "translate(" + x.toFixed(1) + "," + y.toFixed(1) + ")");
        if (e.w !== w) {
          e.w = w; e.h = h; e.im.setAttribute("x", (-w / 2).toFixed(1)); e.im.setAttribute("y", (-h / 2).toFixed(1)); e.im.setAttribute("width", w.toFixed(1)); e.im.setAttribute("height", h.toFixed(1));
          if (e.ring) { e.ring.setAttribute("r", (w / 2).toFixed(1)); }
          e.txt.setAttribute("font-size", fs.toFixed(1)); e.txt.setAttribute("y", (h / 2 + fs + 3).toFixed(1));
          e.tsp.forEach((ts, i) => { ts.setAttribute("x", "0"); ts.setAttribute("dy", i ? (fs * 1.12).toFixed(1) : "0"); });
        }
      });
      lineEls.forEach(l => {
        const A = P[l.a], B = P[l.b]; let dx = B.x - A.x, dy = B.y - A.y; const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
        const off = l.recip ? (l.a < l.b ? 5 : -5) : 0, nx = -dy * off, ny = dx * off;
        l.ln.setAttribute("x1", (A.x + dx * A.r + nx).toFixed(1)); l.ln.setAttribute("y1", (A.y + dy * A.r + ny).toFixed(1));
        l.ln.setAttribute("x2", (B.x - dx * (B.r + 3) + nx).toFixed(1)); l.ln.setAttribute("y2", (B.y - dy * (B.r + 3) + ny).toFixed(1));
        ["x1","y1","x2","y2"].forEach(k => l.hit.setAttribute(k, l.ln.getAttribute(k)));
        l.sw = sw; if (!hover && !sel) { l.ln.setAttribute("stroke-width", String(sw)); l.ln.style.opacity = "0.85"; }
      });
    }
    function render() { place(cfg.getBox()); }
    // ---- panel: copiar posiciones / restablecer / convenciones ----
    function texto() {
      const f = x => Number(x).toFixed(4);
      return "// CONECTOGRAFIA_POS (corte din\u00e1mico) -- coordenadas normalizadas 0-1 sobre la imagen del corte\nPOS_FIJAS = {\n" + NODOS.map(n => "  " + n.id + ": [" + f(pos[n.id][0]) + ", " + f(pos[n.id][1]) + "]").join(",\n") + "\n};";
    }
    if (cfg.uiParent) {
      const ui = document.createElement("div");
      ui.style.cssText = "position:absolute; top:78px; left:18px; z-index:20; width:228px; padding:10px 12px; border-radius:8px; background:rgba(255,255,255,.93); border:1px solid #d5dbe1; box-shadow:0 6px 20px rgba(0,0,0,.10); font:500 11px 'Segoe UI',sans-serif; color:#1e293b;";
      const BTN = "padding:5px 9px; border-radius:6px; border:1px solid #c5ccd3; background:#fff; color:#1e293b; font:600 11px 'Segoe UI',sans-serif; cursor:pointer;";
      const leyenda = [["verde", "Soporte, nidificaci\u00f3n, frugivor\u00eda, polinizaci\u00f3n"], ["amarillo", "Depredaci\u00f3n por aves"], ["rojo", "Depredaci\u00f3n ex\u00f3tica, parasitismo, asfixia"], ["azul", "Alimentaci\u00f3n acu\u00e1tica"], ["turquesa", "Procesos microbiol\u00f3gicos, eutrofizaci\u00f3n"]];
      ui.innerHTML = '<div style="font:800 11px \'Segoe UI\',sans-serif; letter-spacing:.05em; text-transform:uppercase; color:#475569; margin-bottom:6px;">Red de interacciones</div>'
        + '<div style="color:#64748b; line-height:1.4; margin-bottom:8px;">Arrastra las bolitas donde quieras y copia las posiciones para dejarlas fijas. Haz clic en una l\u00ednea para ver qu\u00e9 significa esa conexi\u00f3n.</div>'
        + '<div style="display:flex; gap:6px; margin-bottom:9px;"><button type="button" data-a="copiar" style="' + BTN + '">Copiar posiciones</button><button type="button" data-a="reset" style="' + BTN + '">Restablecer</button></div>'
        + '<div style="color:#64748b; margin:0 0 7px; font-size:10.5px;">Especies observadas en iNaturalist en el humedal El Burro.</div>' + leyenda.map(l => '<div style="display:flex; align-items:center; gap:7px; margin-top:4px;"><span style="flex:none; width:20px; height:3px; border-radius:2px; background:' + COL[l[0]] + ';"></span><span style="color:#475569;">' + l[1] + '</span></div>').join("");
      ui.addEventListener("pointerdown", e => e.stopPropagation());
      ui.addEventListener("click", e => {
        const a = e.target.closest("[data-a]"); if (!a) return;
        if (a.dataset.a === "reset") { NODOS.forEach(n => { pos[n.id] = (POS_FIJAS[n.id] || n.pos).slice(); }); try { sessionStorage.removeItem(KEY); } catch (er) {} render(); }
        else {
          const txt = texto(), done = () => { const o = a.textContent; a.textContent = "\u00a1Copiado!"; setTimeout(() => { a.textContent = o; }, 1400); };
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done).catch(done);
          else { const ta = document.createElement("textarea"); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (er) {} ta.remove(); done(); }
        }
      });
      cfg.uiParent.appendChild(ui);
    }
    if (window.ResizeObserver) new ResizeObserver(render).observe(host);
    window.addEventListener("resize", render);
    if (cfg.imgEl) cfg.imgEl.addEventListener("load", render);
    render();
    return { render, texto, pos };
  };
})();
