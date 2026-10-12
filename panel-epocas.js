/* Panel de epocas e historia de Kennedy (iconos primero, poco texto).
   Arriba: lo que hay en el mapa en la epoca elegida. Abajo: los hitos de la historia de Kennedy, cada uno con su fuente.
   Los resumenes sintetizan lo que dicen esas fuentes; nada esta escrito de memoria. */
(function () {
  "use strict";
  const TEMAS = {
    aeropuerto: { nombre: "Aeropuerto de Techo", color: "#8aa3b2", icono: "fa-plane" },
    ciudad: { nombre: "Ciudad Kennedy", color: "#c6a65f", icono: "fa-house-chimney" },
    central: { nombre: "Corabastos", color: "#bf7a63", icono: "fa-basket-shopping" },
    humedal: { nombre: "Humedal El Burro", color: "#86a98f", icono: "fa-droplet" }
  };
  const F = (c, t, u) => ({ c, t, u });
  const ALCALDIA = F("Alcaldía de Bogotá", "Alcaldía de Bogotá, «Historia del poblamiento de Kennedy»", "https://bogota.gov.co/mi-ciudad/localidades/kennedy/historia-del-poblamiento-de-kennedy");
  const WQ = F("Wilson Quarterly", "Wilson Quarterly, «Living on the New Frontier»", "https://www.wilsonquarterly.com/quarterly/looking-back-moving-forward/living-on-the-new-frontier");
  const ET = F("El Tiempo", "El Tiempo, «El humedal que casi agoniza bajo las urbanizaciones»", "https://www.eltiempo.com/bogota/historia-del-humedal-el-burro-en-kennedy-bogota-436578");
  const EE = F("El Espectador", "El Espectador, «El humedal El Burro perdió el 89 % de su ecosistema»", "https://www.elespectador.com/bogota/el-humedal-el-burro-perdio-el-89-de-su-ecosistema-por-la-urbanizacion-de-bogota-article-891072/");
  // etapa: la epoca del modelo 3D con la que se asocia el hito (1950, 1956, 1972, 1988, 1995 = años 90, 2024 = actualidad)
  const EVENTOS = [
    { id: "techo-1930", anio: 1930, fecha: "7 de agosto de 1930", tema: "aeropuerto", etapa: 1930, icono: "fa-plane",
      titulo: "Se inaugura el aeródromo de Techo",
      resumen: "SCADTA (fundada en 1919) abre una pista en Techo hacia 1928. Es el primer aeropuerto de Bogotá y funciona de 1930 a 1959.",
      fuentes: [F("Wikipedia (es)", "Wikipedia, «Aeropuerto de Techo»", "https://es.wikipedia.org/wiki/Aeropuerto_de_Techo"), F("Wikipedia (en)", "Wikipedia, «Techo International Airport (Colombia)»", "https://en.wikipedia.org/wiki/Techo_International_Airport_(Colombia)")] },
    { id: "panamericana-1948", anio: 1948, fecha: "abril de 1948", tema: "aeropuerto", etapa: 1950, icono: "fa-landmark",
      titulo: "Conferencia Panamericana",
      resumen: "Los delegados llegan por el aeropuerto de Techo. El 9 de abril matan a Gaitán y la conferencia se traslada al Gimnasio Moderno.",
      fuentes: [ALCALDIA] },
    { id: "dorado-1959", anio: 1959, fecha: "10 de diciembre de 1959", tema: "aeropuerto", etapa: 1956, icono: "fa-plane-departure",
      titulo: "El Dorado reemplaza a Techo",
      resumen: "El aeropuerto El Dorado se inaugura tras cuatro años de obras y reemplaza al de Techo.",
      fuentes: [F("Portafolio", "Portafolio, «Con retos en su ampliación, aeropuerto El Dorado cumplió 60 años»", "https://www.portafolio.co/economia/infraestructura/con-retos-en-su-ampliacion-aeropuerto-el-dorado-cumplio-60-anos-536408")] },
    { id: "piedra-1961", anio: 1961, fecha: "17 de diciembre de 1961", tema: "ciudad", etapa: 1956, icono: "fa-house-chimney",
      titulo: "Primera piedra de Ciudad Techo",
      resumen: "Kennedy y Lleras Camargo lanzan el programa de vivienda con la Alianza para el Progreso, en el sitio de un aeropuerto desmantelado.",
      fuentes: [ALCALDIA, WQ] },
    { id: "nombre-1963", anio: 1963, fecha: "1963", tema: "ciudad", etapa: 1956, icono: "fa-flag-usa",
      titulo: "Nace el nombre Ciudad Kennedy",
      resumen: "Tras el asesinato del presidente Kennedy, los habitantes del barrio de Techo lo llaman Ciudad Kennedy.",
      fuentes: [ALCALDIA] },
    { id: "concejo-1967", anio: 1967, fecha: "1967", tema: "ciudad", etapa: 1972, icono: "fa-gavel",
      titulo: "El Concejo ratifica el nombre",
      resumen: "El Concejo de Bogotá ratifica el cambio de nombre y empieza la urbanización de la localidad.",
      fuentes: [ALCALDIA] },
    { id: "buses-1969", anio: 1969, fecha: "1969", tema: "ciudad", etapa: 1972, icono: "fa-bus",
      titulo: "Buses soviéticos",
      resumen: "Unos 200.000 residentes estaban casi aislados hasta que el alcalde compró una flota de buses soviéticos.",
      fuentes: [WQ] },
    { id: "corabastos-1972", anio: 1972, fecha: "20 de julio de 1972", tema: "central", etapa: 1972, icono: "fa-basket-shopping",
      titulo: "Se inaugura Corabastos",
      resumen: "La central de abastos, de unos 420.000 m², dinamiza el poblamiento de Patio Bonito y de barrios vecinos.",
      fuentes: [F("Visit Bogotá", "Visit Bogotá, «Central Corabastos» (fecha de inauguración)", "https://files.visitbogota.co/drpl/en/node/4590"), F("Bogotá.gov.co", "Bogotá.gov.co, corredor turístico Corabastos (área)", "https://bogota.gov.co/internacional/turismo-en-bogota-visita-corabastos-y-disfruta-de-sabores-y-tradicion"), ALCALDIA] },
    { id: "burro-1985", anio: 1985, fecha: "1985", tema: "humedal", etapa: 1988, icono: "fa-droplet-slash",
      titulo: "El Burro baja a 27,14 ha",
      resumen: "Tenía 171 ha en los años 50. Entre las causas: urbanización, vías (las Américas fue la primera gran obra que lo partió) y una planta de desechos.",
      nota: "Las notas difieren en el dato inicial: 71,54 ha (El Espectador) o 171 ha (El Tiempo). Con 171 ha, las 18,8 ha de hoy son el 89 % de pérdida que ambas citan.",
      fuentes: [ET, EE] },
    { id: "cali-1990s", anio: 1990, rotulo: "90s", fecha: "década de 1990", tema: "humedal", etapa: 1995, icono: "fa-route",
      titulo: "La avenida Ciudad de Cali parte el humedal",
      resumen: "Según El Tiempo, la hace años después de las Américas, en la década de los 90.",
      nota: "Las fuentes consultadas no dan el año exacto.",
      fuentes: [ET, EE] },
    { id: "cabildo-1993", anio: 1993, fecha: "1993 a 1994", tema: "ciudad", etapa: 1995, icono: "fa-users",
      titulo: "Cabildo juvenil",
      resumen: "Se organiza en Kennedy el único cabildo juvenil de Bogotá.",
      fuentes: [ALCALDIA] },
    { id: "paro-1995", anio: 1995, fecha: "finales de 1995", tema: "central", etapa: 1995, icono: "fa-bullhorn",
      titulo: "Paro de Patio Bonito y Tintal Central",
      resumen: "Bloquean el acceso a Corabastos para reclamar servicios públicos, plan de desarrollo local y vías.",
      fuentes: [ALCALDIA] },
    { id: "decreto-2004", anio: 2004, fecha: "2004", tema: "humedal", etapa: 2024, icono: "fa-file-signature",
      titulo: "Parque ecológico de humedal",
      resumen: "El Decreto 190 de 2004 (POT) declara a El Burro Parque Ecológico Distrital de Humedal.",
      fuentes: [F("Sec. de Ambiente", "Secretaría Distrital de Ambiente, Plan de Manejo Ambiental del humedal El Burro", "https://www.ambientebogota.gov.co/documents/10184/804589/PMA+EL+BURRO.pdf/807c4e0b-1839-450b-a7a6-2777a8b0fdbf")] },
    { id: "estudio-2019", anio: 2019, fecha: "noviembre de 2019", tema: "humedal", etapa: 2024, icono: "fa-graduation-cap",
      titulo: "Estudio de la U. Nacional",
      resumen: "En unos 70 años, El Burro perdió cerca del 89 % de su área por la urbanización. Hoy quedan 18,8 ha.",
      fuentes: [ET, EE] },
    { id: "tinguas-2021", anio: 2021, fecha: "2 de febrero de 2021", tema: "humedal", etapa: 2024, icono: "fa-dove",
      titulo: "Limpieza y tinguas",
      resumen: "En el Día Mundial de los Humedales limpian El Burro y liberan 16 tinguas rescatadas.",
      fuentes: [F("Bogotá.gov.co", "Bogotá.gov.co, Misión para la Gestión Integral de los Humedales", "https://bogota.gov.co/en/node/37503")] }
  ];
  // lo que se ve en el mapa en cada epoca del modelo
  const ERAS = {
    1900: { nombre: "Antes de Kennedy", anioTxt: "1900", icono: "fa-water", chips: [
      { i: "fa-droplet", v: "El Tintal", t: "Una sola laguna antes del aeropuerto (en los años 30 se fraccionó en cinco humedales, entre ellos La Vaca)" },
      { i: "fa-cow", v: "≈750", t: "Ganado vacuno en pastoreo sobre las zonas verdes, por fuera del agua" },
      { i: "fa-tree", t: "Más árboles: franjas de ribera ampliadas, bosquetes y sabana abierta" }] },
    1905: { nombre: "Decreto 40", anioTxt: "1905", icono: "fa-gavel", chips: [
      { i: "fa-gavel", t: "Decreto 40 de 1905: ordena el secado de lagunas y ciénagas para convertir la tierra en suelo aprovechable" },
      { i: "fa-droplet", v: "Lagunas secadas", t: "Transformación del paisaje hídrico: cuerpos de agua reducidos a suelo secado" },
      { i: "fa-tree", t: "Árboles en zonas verdes recién disponibles" }] },
    1920: { nombre: "Aeródromo de Techo", anioTxt: "1920", icono: "fa-plane-up", chips: [
      { i: "fa-plane-up", t: "Aeródromo de Techo en operación" },
      { i: "fa-droplet", v: "Humedales completos", t: "Laguna El Tintal y cuerpos de agua sin fragmentar aún" },
      { i: "fa-cow", t: "Vacas en pastoreo, zona del aeródromo" },
      { i: "fa-tree", t: "Franjas de árboles junto al agua y bosquetes" }] },
    1946: { nombre: "Avenida de las Américas", anioTxt: "1946", icono: "fa-route", chips: [
      { i: "fa-route", t: "Avenida de las Américas trazada" },
      { i: "fa-droplet", v: "171 ha", t: "Humedal El Burro y La Vaca con extensión completa" },
      { i: "fa-cow", t: "Vacas en pastoreo, actividad mixte" },
      { i: "fa-tree", t: "Franjas de árboles y mayor actividad arbórea" }] },
    1961: { nombre: "Ciudad Techo", anioTxt: "1961", icono: "fa-house-chimney", chips: [
      { i: "fa-house-chimney", t: "Ciudad Techo con 15,000 viviendas" },
      { i: "fa-droplet", v: "Humedales fragmentados", t: "Aeródromo desmantelado, humedales en proceso de fragmentación" },
      { i: "fa-cow", t: "Vacas en zonas residuales" },
      { i: "fa-tree", t: "Árboles en áreas urbanizables" }] },
    1972: { nombre: "Corabastos", anioTxt: "1972", icono: "fa-basket-shopping", chips: [
      { i: "fa-basket-shopping", t: "Central de abastos inaugurada" },
      { i: "fa-droplet", v: "≈80 ha", t: "Humedal El Burro reducido a unas 80 hectáreas" },
      { i: "fa-house", v: "1 piso", t: "Solo edificios de un piso, sin edificios sobre el humedal" },
      { i: "fa-road", t: "Calles reales; todavía sin avenidas principales" }] },
    1972: { nombre: "Corabastos", icono: "fa-basket-shopping", chips: [
      { i: "fa-droplet", v: "La Vaca ampliada", t: "Se muestran los dos sectores cartografiados del Humedal La Vaca, incluido el ámbito que llega hasta Corabastos" },
      { i: "fa-basket-shopping", v: "420.000 m²", t: "Perímetro esquemático del predio de Corabastos, inaugurado en 1972" },
      { i: "fa-house", v: "1 piso", t: "Solo edificios de un piso, sin edificios sobre el humedal" },
      { i: "fa-road", t: "Calles reales; todavía sin avenidas principales" }] },
    1988: { nombre: "Humedal reducido", icono: "fa-droplet-slash", chips: [
      { i: "fa-droplet", v: "≈27 ha", t: "27,14 ha en 1985 (El Tiempo)" },
      { i: "fa-house", v: "1 piso", t: "Solo edificios de un piso, sin edificios sobre el humedal" },
      { i: "fa-road", t: "Calles reales; todavía sin avenidas principales" }] },
    1995: { nombre: "Edificios altos y avenidas", anioTxt: "1990s", icono: "fa-route", chips: [
      { i: "fa-droplet", v: "≈27 ha", t: "27,14 ha en 1985 (El Tiempo)" },
      { i: "fa-house", t: "Casas" },
      { i: "fa-building", t: "Aparecen los edificios en altura" },
      { i: "fa-route", t: "Aparecen las avenidas principales; una cruza el humedal (Av. Ciudad de Cali, década de 1990)" },
      { i: "fa-road", t: "Calles reales" }] },
    2024: { nombre: "Actualidad", anioTxt: "Hoy", icono: "fa-city", chips: [
      { i: "fa-droplet", v: "18,8 ha", t: "Humedal protegido de 18,8 hectáreas (El Tiempo, Universidad Nacional)" },
      { i: "fa-car", t: "Simulación de tráfico y mapa de ruido; se pueden cerrar calles" },
      { i: "fa-house", t: "Casas" },
      { i: "fa-building", t: "Edificios en altura" },
      { i: "fa-route", t: "Avenidas principales" },
      { i: "fa-road", t: "Calles reales" }] }
  };

  function h(tag, attrs) {
    const e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(k => { if (k === "text") e.textContent = attrs[k]; else if (k === "class") e.className = attrs[k]; else e.setAttribute(k, attrs[k]); });
    for (let i = 2; i < arguments.length; i++) { const c = arguments[i]; if (c != null) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); }
    return e;
  }
  const ic = (clase) => h("i", { class: "fa-solid " + clase, "aria-hidden": "true" });

  function iniciar() {
    const raiz = document.getElementById("epPanel");
    if (!raiz) return;
    const filtros = new Set(Object.keys(TEMAS));
    const porId = {}; EVENTOS.forEach(e => { porId[e.id] = e; });
    const ordenados = EVENTOS.slice().sort((a, b) => a.anio - b.anio);
    let sel = null, desdePanel = false;

    const cab = h("header", { class: "ep-cab" }), chips = h("div", { class: "ep-chips", role: "list", "aria-label": "Lo que hay en el mapa" });
    const filtrosEl = h("div", { class: "ep-filtros", role: "group", "aria-label": "Temas de la historia" });
    Object.keys(TEMAS).forEach(k => {
      const b = h("button", { type: "button", class: "ep-filtro", "aria-pressed": "true", "data-tema": k, title: TEMAS[k].nombre, "aria-label": TEMAS[k].nombre, style: "--c:" + TEMAS[k].color }, ic(TEMAS[k].icono));
      b.addEventListener("click", () => {
        if (filtros.has(k)) { if (filtros.size > 1) filtros.delete(k); } else filtros.add(k);
        filtrosEl.querySelectorAll(".ep-filtro").forEach(c => c.setAttribute("aria-pressed", filtros.has(c.dataset.tema) ? "true" : "false"));
        if (sel && !filtros.has(porId[sel].tema)) sel = (ordenados.find(e => filtros.has(e.tema)) || {}).id || null;
        pintarGrilla(); pintarDetalle();
      });
      filtrosEl.appendChild(b);
    });
    const grilla = h("div", { class: "ep-grid", role: "group", "aria-label": "Hitos de la historia de Kennedy, por año" });
    const detalle = h("article", { class: "ep-det", "aria-live": "polite" });
    const pie = h("footer", { class: "ep-pie" }, ic("fa-circle-info"), h("span", { text: "Edificios y vías: aproximación; los datos no traen el año de construcción." }));
    [cab, chips, h("hr", { class: "ep-sep" }), filtrosEl, grilla, detalle, pie].forEach(x => raiz.appendChild(x));

    function etapaActiva() { const a = document.querySelector(".year-btn.active"); return a ? Number(a.dataset.year) : 1900; }
    function pintarEra() {
      const et = etapaActiva(), E = ERAS[et] || ERAS[1900];
      cab.innerHTML = "";
      cab.appendChild(h("div", { class: "ic" }, ic(E.icono)));
      cab.appendChild(h("div", null, h("div", { class: "ep-anio", text: E.anioTxt || String(et) }), h("div", { class: "ep-nombre", text: E.nombre })));
      chips.innerHTML = "";
      E.chips.forEach(c => chips.appendChild(h("span", { class: "ep-chip", role: "listitem", title: c.t, "aria-label": c.t }, ic(c.i), c.v ? h("b", { text: c.v }) : null)));
      marcarEtapa();
    }
    function pintarGrilla() {
      grilla.innerHTML = "";
      ordenados.filter(e => filtros.has(e.tema)).forEach(e => {
        const b = h("button", { type: "button", class: "ep-ev" + (e.id === sel ? " sel" : ""), "data-id": e.id, "data-etapa": String(e.etapa), style: "--c:" + TEMAS[e.tema].color, title: e.anio + ": " + e.titulo, "aria-label": e.anio + ": " + e.titulo, "aria-current": e.id === sel ? "true" : "false" },
          h("span", { class: "ic" }, ic(e.icono)), h("span", { class: "an", text: String(e.rotulo || e.anio) }));
        b.addEventListener("click", () => seleccionar(e.id, true));
        b.addEventListener("keydown", ev => { if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") { ev.preventDefault(); mover(ev.key === "ArrowRight" ? 1 : -1, e.id); } });
        grilla.appendChild(b);
      });
      marcarEtapa();
    }
    function marcarEtapa() { const et = etapaActiva(); grilla.querySelectorAll(".ep-ev").forEach(b => b.classList.toggle("en-etapa", Number(b.dataset.etapa) === et)); }
    function visibles() { return ordenados.filter(e => filtros.has(e.tema)); }
    function mover(d, desde) {
      const v = visibles(), i = Math.max(0, v.findIndex(e => e.id === (desde || sel))), n = v[(i + d + v.length) % v.length];
      seleccionar(n.id, true);
      const b = grilla.querySelector('[data-id="' + n.id + '"]'); if (b) b.focus();
    }
    function pintarDetalle() {
      detalle.innerHTML = "";
      if (!sel) return;
      const e = porId[sel], t = TEMAS[e.tema];
      detalle.style.setProperty("--c", t.color);
      detalle.appendChild(h("div", { class: "ep-det-cab" }, h("span", { class: "ic" }, ic(e.icono)), h("div", null, h("div", { class: "ep-det-anio", text: String(e.rotulo || e.anio) }), (e.fecha !== String(e.anio) ? h("div", { class: "ep-det-fecha", text: e.fecha }) : null))));
      detalle.appendChild(h("h3", { text: e.titulo }));
      detalle.appendChild(h("p", { text: e.resumen }));
      if (e.nota) detalle.appendChild(h("div", { class: "ep-nota" }, ic("fa-circle-info"), h("span", { text: e.nota })));
      const ft = h("div", { class: "ep-ftes" });
      e.fuentes.forEach(f => ft.appendChild(h("a", { class: "ep-fte", href: f.u, target: "_blank", rel: "noopener", title: f.t + " (se abre en otra pestaña)" }, ic("fa-link"), f.c)));
      detalle.appendChild(ft);
    }
    function irAEtapa(et) {
      const btn = document.querySelector('.year-btn[data-year="' + et + '"]');
      if (btn && !btn.classList.contains("active")) { desdePanel = true; btn.click(); setTimeout(() => { desdePanel = false; }, 400); }
    }
    function seleccionar(id, moverModelo) {
      sel = id;
      grilla.querySelectorAll(".ep-ev").forEach(b => { const s = b.dataset.id === id; b.classList.toggle("sel", s); b.setAttribute("aria-current", s ? "true" : "false"); });
      pintarDetalle();
      if (moverModelo) irAEtapa(porId[id].etapa);
    }
    // si cambian la epoca con los botones de abajo o con el reproductor, el panel sigue al modelo
    document.querySelectorAll(".year-btn").forEach(b => new MutationObserver(() => {
      pintarEra();
      if (desdePanel) return;
      const et = etapaActiva(), e = visibles().find(x => x.etapa === et);
      if (e && (!sel || porId[sel].etapa !== et)) seleccionar(e.id, false);
    }).observe(b, { attributes: true, attributeFilter: ["class"] }));

    const et0 = etapaActiva(), primero = visibles().find(x => x.etapa === et0);
    sel = primero ? primero.id : ordenados[0].id;
    pintarEra(); pintarGrilla(); pintarDetalle();

    // ---- iconos sobre el territorio: aparecen a medida que pasan las epocas, en el lugar donde ocurre cada hito ----
    const ORDEN_ERA = [1900, 1930, 1950, 1956, 1972, 1988, 1995, 2024];
    const LUGAR = {
      "techo-1930": ["techo", 0], "panamericana-1948": ["techo", 1], "dorado-1959": ["techo", 2], "piedra-1961": ["techo", 3],
      "nombre-1963": ["techo", 4], "concejo-1967": ["techo", 5], "buses-1969": ["techo", 6], "cabildo-1993": ["techo", 7],
      "corabastos-1972": ["corabastos", 0], "paro-1995": ["corabastos", 1],
      "burro-1985": ["burro", 0], "cali-1990s": ["burro", 1], "decreto-2004": ["burro", 2], "estudio-2019": ["burro", 3], "tinguas-2021": ["burro", 4]
    };
    const RADIO = { techo: 30, burro: 22, corabastos: 14 }, NGRUPO = { techo: 8, burro: 5, corabastos: 2 };
    const capa = h("div", { id: "marcadoresMapa" });
    (document.querySelector(".main") || document.body).appendChild(capa);
    const marcadores = {};
    EVENTOS.forEach(e => {
      const L = LUGAR[e.id];
      const b = h("button", { type: "button", class: "mapa-ev", "data-id": e.id, style: "--c:" + TEMAS[e.tema].color + "; display:none", title: e.anio + ": " + e.titulo, "aria-label": "En el mapa: " + e.anio + ", " + e.titulo },
        h("span", { class: "ic" }, ic(e.icono)), h("span", { class: "an", text: String(e.rotulo || e.anio) }));
      b.addEventListener("click", () => seleccionar(e.id, false));
      capa.appendChild(b); marcadores[e.id] = { el: b, lug: L[0], k: L[1], e };
    });
    function actualizarMarcadores() {
      requestAnimationFrame(actualizarMarcadores);
      if (!window.__proyectarAPantalla || !window.__lugaresMapa) return;
      const et = etapaActiva(), iEra = ORDEN_ERA.indexOf(et), W = window.innerWidth, H = window.innerHeight, lugares = window.__lugaresMapa();
      Object.keys(marcadores).forEach(id => {
        const m = marcadores[id];
        if (ORDEN_ERA.indexOf(m.e.etapa) > iEra) { if (m.el.style.display !== "none") m.el.style.display = "none"; return; }
        const c = lugares[m.lug], a = -Math.PI / 2 + (2 * Math.PI * m.k) / NGRUPO[m.lug];
        const q = window.__proyectarAPantalla(c.x + RADIO[m.lug] * Math.cos(a), 3, c.z + RADIO[m.lug] * Math.sin(a));
        const fuera = q[0] < 335 || q[0] > W - 14 || q[1] < 40 || q[1] > H - 90; // oculto si queda bajo el panel o fuera de la pantalla
        m.el.style.display = fuera ? "none" : "";
        if (!fuera) m.el.style.transform = "translate(" + Math.round(q[0]) + "px," + Math.round(q[1]) + "px) translate(-50%,-50%)";
        m.el.classList.toggle("nuevo", m.e.etapa === et);
        m.el.classList.toggle("sel", id === sel);
      });
    }
    requestAnimationFrame(actualizarMarcadores);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
