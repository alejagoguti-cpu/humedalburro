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
    { id: "mirla", t: "Mirla común", s: "Turdus fuscater", cat: "ave", img: "assets/cx_mirla.png", kind: "cut", w: 240, h: 214, pos: [0.1654, 0.5242] },
    { id: "chamon", t: "Chamón", s: "Molothrus bonariensis", cat: "ave", img: "assets/cx_chamon.png", kind: "cut", w: 233, h: 240, pos: [0.2882, 0.3979] },
    { id: "tingua_azul", t: "Tingua azul", s: "Porphyrio martinica", cat: "ave", img: "assets/tingua.png", kind: "cut", w: 166, h: 200, pos: [0.2841, 0.6614] },
    { id: "tingua_bogotana", t: "Tingua bogotana", s: "Rallus semiplumbeus", cat: "ave", img: "assets/cx_tingua_bogotana.png", kind: "cut", w: 260, h: 165, pos: [0.4303, 0.6781] },
    { id: "monjita", t: "Monjita", s: "Chrysomus icterocephalus", cat: "ave", img: "assets/cx_monjita.png", kind: "cut", w: 195, h: 260, pos: [0.7635, 0.5753] },
    { id: "cucarachero", t: "Cucarachero de pantano", s: "Cistothorus apolinari", cat: "ave", img: "assets/cx_cucarachero.png", kind: "cut", w: 170, h: 240, pos: [0.545, 0.4464] },
    { id: "garza", t: "Garza real", s: "Ardea alba", cat: "ave", img: "assets/cx_garza.png", kind: "cut", w: 148, h: 240, pos: [0.379, 0.33] },
    { id: "perros_gatos", t: "Perros y gatos asilvestrados", s: "", cat: "dep", img: "assets/cx_perro.png", kind: "cut", w: 130, h: 260, pos: [0.2417, 0.775] },
    { id: "libelulas", t: "Libélulas", s: "Odonata", cat: "inv", img: "assets/cx_libelula.png", kind: "cut", w: 240, h: 216, pos: [0.4907, 0.775], anim: "alas" },
    { id: "mariposas", t: "Mariposas", s: "Lepidoptera", cat: "inv", img: "assets/cx_mariposa.png", kind: "cut", w: 219, h: 260, pos: [0.3568, 0.775] },
    { id: "escarabajos", t: "Escarabajos coprófagos", s: "descomponedores", cat: "inv", img: "assets/cx_escarabajo.png", kind: "cut", w: 260, h: 190, pos: [0.6839, 0.6571] },
    { id: "rana", t: "Rana sabanera", s: "Dendropsophus labialis", cat: "anf", img: "assets/cx_rana.png", kind: "cut", w: 240, h: 153, pos: [0.4984, 0.5543] },
    { id: "enea", t: "Enea / Junco", s: "Typha latifolia", cat: "flora", img: "assets/cx_enea.png", kind: "cut", w: 215, h: 240, pos: [0.6045, 0.775] },
    { id: "capuli", t: "Capulí", s: "Prunus serotina", cat: "flora", img: "assets/cx_capuli.png", kind: "cut", w: 214, h: 240, pos: [0.4105, 0.45] },
    { id: "sauco", t: "Saúco", s: "Sambucus nigra", cat: "flora", img: "assets/cx_sauco.png", kind: "cut", w: 240, h: 234, pos: [0.14, 0.647] },
    { id: "urapan", t: "Urapán", s: "Fraxinus chinensis", cat: "flora", img: "assets/cx_urapan.png", kind: "cut", w: 240, h: 217, pos: [0.5017, 0.33] },
    { id: "sauce", t: "Sauce llorón", s: "Salix humboldtiana", cat: "flora", img: "assets/cx_sauce.png", kind: "cut", w: 150, h: 260, pos: [0.14, 0.775] },
    { id: "chilco", t: "Chilco", s: "Baccharis bogotensis", cat: "flora", img: "assets/cx_chilco.png", kind: "cut", w: 240, h: 156, pos: [0.2761, 0.5309] },
    { id: "buchon", t: "Buchón de agua", s: "Eichhornia crassipes", cat: "flora", img: "assets/cx_buchon.png", kind: "circle", w: 240, h: 240, pos: [0.6419, 0.5105] },
    { id: "nutrientes", t: "Nutrientes: nitrógeno y fósforo", s: "N y P", cat: "flora", img: "assets/cx_nutrientes.png", kind: "circle", w: 240, h: 240, pos: [0.6447, 0.3523] },
    { id: "fitoplancton", t: "Fitoplancton y lenteja de agua", s: "Lemna gibba", cat: "micro", img: "assets/cx_fitoplancton.png", kind: "circle", w: 240, h: 240, pos: [0.7354, 0.775] },
    { id: "lixiviados", t: "Lixiviados y materia orgánica", s: "DQO / DBO", cat: "micro", img: "assets/cx_lixiviados.png", kind: "circle", w: 240, h: 240, pos: [0.86, 0.6152] },
    { id: "anoxia", t: "Disminución de oxígeno", s: "anoxia · OD ≈ 0 mg/L", cat: "micro", img: "assets/cx_anoxia.png", kind: "circle", w: 240, h: 240, pos: [0.5659, 0.6433] },
    { id: "bacterias", t: "Bacterias anaerobias", s: "ácido sulfhídrico (H₂S)", cat: "micro", img: "assets/cx_bacterias.png", kind: "circle", w: 240, h: 240, pos: [0.3795, 0.573] },
    { id: "hongos", t: "Hongos y materia orgánica del suelo", s: "", cat: "micro", img: "assets/cx_hongos.png", kind: "circle", w: 240, h: 240, pos: [0.86, 0.775] },
    { id: "colibries", t: "Colibríes", s: "Colibri coruscans · Trochilidae", cat: "inv", img: "assets/cx_colibri.png", kind: "cut", w: 260, h: 191, pos: [0.7795, 0.6803] },
    { id: "hibisco", t: "Hibisco", s: "Hibiscus rosa-sinensis", cat: "flora", img: "assets/cx_hibisco.png", kind: "cut", w: 260, h: 224, pos: [0.6308, 0.5905] },
    { id: "tritoma", t: "Tritoma", s: "Kniphofia uvaria", cat: "flora", img: "assets/cx_tritoma.png", kind: "cut", w: 90, h: 260, pos: [0.62, 0.6951] }
  ];
  const ENLACES = [
    ["mirla", "urapan", "verde", "Nidificación", "La mirla común anida en la copa alta del urapán.", "Red de interacciones del documento"],
    ["mirla", "capuli", "verde", "Frugivoría y dispersión de semillas", "La mirla común come los frutos del capulí y dispersa sus semillas.", "Red de interacciones del documento"],
    ["mirla", "sauco", "verde", "Alimentación y refugio", "La mirla común se alimenta de los frutos del saúco y se refugia en su follaje.", "Red de interacciones del documento"],
    ["chamon", "mirla", "rojo", "Parasitismo de nido", "El chamón pone sus huevos en el nido de la mirla común: la mirla incuba y cría un polluelo que no es suyo.", "Red de interacciones del documento"],
    ["tingua_azul", "enea", "verde", "Nidificación y refugio", "La tingua azul anida y se refugia en el juncal de enea.", "Red de interacciones del documento"],
    ["tingua_azul", "libelulas", "amarillo", "Depredación", "La tingua azul caza libélulas y otros invertebrados.", "Red de interacciones del documento"],
    ["perros_gatos", "tingua_azul", "rojo", "Depredación exótica", "Los perros y gatos asilvestrados depredan los nidos y los huevos de la tingua azul, que están en el suelo del juncal.", "Red de interacciones del documento"],
    ["tingua_bogotana", "enea", "verde", "Nidificación exclusiva", "La tingua bogotana (endémica y en peligro) anida únicamente en juncales densos de enea.", "Red de interacciones del documento"],
    ["perros_gatos", "tingua_bogotana", "rojo", "Depredación exótica", "Los perros y gatos asilvestrados depredan los nidos y los huevos de la tingua bogotana, que están en el suelo del juncal.", "Red de interacciones del documento"],
    ["monjita", "enea", "verde", "Nidificación y posadero", "La monjita anida y se posa en la enea.", "Red de interacciones del documento"],
    ["cucarachero", "enea", "verde", "Refugio y hábitat exclusivo", "El cucarachero de pantano (endémico) usa el juncal de enea como refugio y como hábitat exclusivo.", "Red de interacciones del documento"],
    ["chamon", "cucarachero", "rojo", "Parasitismo de nido", "El chamón pone sus huevos en el nido del cucarachero de pantano: el cucarachero cría un polluelo que no es suyo.", "Red de interacciones del documento"],
    ["garza", "rana", "amarillo", "Depredación", "La garza real caza ranas sabaneras en la orilla del humedal.", "Red de interacciones del documento"],
    ["garza", "libelulas", "amarillo", "Depredación de larvas acuáticas", "La garza real se come las larvas acuáticas de las libélulas.", "Red de interacciones del documento"],
    ["libelulas", "fitoplancton", "azul", "Alimentación en fase acuática", "En su fase acuática, las ninfas de libélula se alimentan de pequeños organismos del agua (larvas y zooplancton) que a su vez viven del fitoplancton.", "Red de interacciones del documento"],
    ["mariposas", "chilco", "verde", "Polinización y visita floral", "Las mariposas toman néctar de las flores del chilco (Baccharis), una de las plantas más visitadas por mariposas, y transportan su polen.", "Literatura: el género Baccharis es fuente de néctar para muchas mariposas"],
    ["mariposas", "sauce", "verde", "Herbivoría", "Las orugas de los cargapalitos (polillas del género Oiketicus, orden Lepidoptera) se alimentan de las hojas del sauce.", "Registro real en Kennedy (Jardín Botánico de Bogotá, 2023)"],
    ["colibries", "hibisco", "verde", "Visita floral", "El colibrí chillón toma el néctar de las flores del hibisco y, al hacerlo, transporta su polen. Registrado en el Corredor La Magdalena.", "Registro real en Kennedy (Jardín Botánico de Bogotá, 2023)"],
    ["colibries", "tritoma", "verde", "Visita floral", "El colibrí chillón toma el néctar de las flores de la tritoma (Kniphofia uvaria) y transporta su polen.", "Registro real en Kennedy (Jardín Botánico de Bogotá, 2023)"],
    ["escarabajos", "hongos", "turquesa", "Descomposición", "Los escarabajos cobrófagos desmenuzan el estiércol y la materia orgánica y la dejan lista para los hongos y microorganismos del suelo, que completan la descomposición.", "Red de interacciones del documento"],
    ["rana", "libelulas", "azul", "Consumo de insectos", "La rana sabanera se alimenta de insectos, entre ellos las libélulas.", "Red de interacciones del documento"],
    ["anoxia", "rana", "rojo", "Mortalidad por asfixia", "Cuando el oxígeno disuelto cae casi a cero, la rana sabanera sufre estrés metabólico y muere por asfixia: se pierde biodiversidad acuática.", "Red de interacciones del documento"],
    ["buchon", "nutrientes", "turquesa", "Absorción y proliferación", "El buchón de agua absorbe grandes cantidades de nitrógeno y fósforo y se multiplica de forma masiva.", "Red de interacciones del documento"],
    ["buchon", "anoxia", "turquesa", "Bloqueo de luz y descomposición", "El tapete de buchón bloquea la luz y, al morir, se descompone en el fondo gastando el oxígeno del agua.", "Red de interacciones del documento"],
    ["nutrientes", "buchon", "verde", "Eutrofización", "Cuando el agua recibe demasiado nitrógeno y fósforo (eutrofización), el buchón de agua crece sin control.", "Red de interacciones del documento"],
    ["nutrientes", "fitoplancton", "verde", "Eutrofización", "El nitrógeno y el fósforo alimentan el crecimiento masivo del fitoplancton y de la lenteja de agua.", "Red de interacciones del documento"],
    ["lixiviados", "nutrientes", "turquesa", "Enriquecimiento orgánico", "Los lixiviados y la materia orgánica (alta DQO y DBO) aportan nutrientes al agua.", "Red de interacciones del documento"],
    ["anoxia", "bacterias", "turquesa", "Putrefacción", "Sin oxígeno proliferan las bacterias anaerobias, que producen ácido sulfhídrico (H₂S): mal olor y putrefacción del fondo.", "Red de interacciones del documento"]
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
    const lineEls = ENLACES.map(([a, b, c, tipo, frase, fuente]) => {
      const ln = el("line", { stroke: COL[c], "stroke-linecap": "round", "marker-end": "url(#cxFlecha-" + c + ")" });
      ln.style.pointerEvents = "none";
      // zona de clic ancha e invisible para poder tocar la linea con facilidad
      const hit = el("line", { class: "cx-hit", stroke: "transparent", "stroke-width": "14", "stroke-linecap": "round" });
      hit.style.cssText = "pointer-events:stroke; cursor:pointer;";
      const t = el("title"); t.textContent = byId[a].t + " \u2192 " + byId[b].t + " (" + tipo + "). Haz clic para ver qu\u00e9 significa."; hit.appendChild(t);
      gLines.appendChild(ln); gHits.appendChild(hit);
      const L = { a, b, c, ln, hit, tipo, frase, fuente, recip: ENLACES.some(x => x[0] === b && x[1] === a) };
      hit.addEventListener("click", e => { e.stopPropagation(); sel = L; resalta(); mostrarTarjeta(L, e); });
      return L;
    });
    // ---- nodos ----
    let drag = null, hover = null, sel = null, card = null;
    const nodeEls = {};
    NODOS.forEach(n => {
      const g = el("g"); g.style.cssText = "cursor:grab; pointer-events:all;";
      const t = el("title"); t.textContent = n.t + (n.s ? " (" + n.s + ")" : ""); g.appendChild(t);
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
        + '<div style="font:500 10.5px/1.35 \'Segoe UI\',sans-serif; color:#64748b; border-top:1px solid #e5e9ee; padding-top:6px;">Fuente: ' + l.fuente + '</div>';
      card.addEventListener("pointerdown", ev => ev.stopPropagation());
      card.querySelector("button").addEventListener("click", cerrarTarjeta);
      host.appendChild(card);
      const cw = card.offsetWidth, ch = card.offsetHeight;
      card.style.left = Math.max(8, Math.min(e.clientX - hr.left + 14, hr.width - cw - 8)) + "px";
      card.style.top = Math.max(8, Math.min(e.clientY - hr.top + 14, hr.height - ch - 8)) + "px";
    }
    document.addEventListener("pointerdown", e => { if (card && !card.contains(e.target) && !(e.target.getAttribute && e.target.getAttribute("class") === "cx-hit")) cerrarTarjeta(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") cerrarTarjeta(); });
    function size(n, b) {
      const base = b.w * 0.037 * (MULT[n.id] || 1);
      if (n.kind === "circle") return [base * 0.95, base * 0.95];
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
        + leyenda.map(l => '<div style="display:flex; align-items:center; gap:7px; margin-top:4px;"><span style="flex:none; width:20px; height:3px; border-radius:2px; background:' + COL[l[0]] + ';"></span><span style="color:#475569;">' + l[1] + '</span></div>').join("");
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
