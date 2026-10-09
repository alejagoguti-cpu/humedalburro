/* Línea de tiempo de la historia de Kennedy (Bogotá) y del humedal El Burro.
   Cada hito lleva su fuente. Los textos resumen lo que dicen esas fuentes; nada está escrito de memoria.
   La barra es proporcional al tiempo real (1930 a 2025) y se sincroniza con las cinco épocas del modelo 3D. */
(function () {
  "use strict";
  const T0 = 1930, T1 = 2025;
  const TEMAS = {
    aeropuerto: { nombre: "Aeropuerto de Techo", color: "#8aa3b2" },
    ciudad: { nombre: "Ciudad Kennedy", color: "#c6a65f" },
    central: { nombre: "Corabastos", color: "#bf7a63" },
    humedal: { nombre: "Humedal El Burro", color: "#86a98f" }
  };
  const ALCALDIA = { t: "Alcaldía de Bogotá, «Historia del poblamiento de Kennedy»", u: "https://bogota.gov.co/mi-ciudad/localidades/kennedy/historia-del-poblamiento-de-kennedy" };
  const WQ = { t: "Wilson Quarterly, «Living on the New Frontier»", u: "https://www.wilsonquarterly.com/quarterly/looking-back-moving-forward/living-on-the-new-frontier" };
  const ET = { t: "El Tiempo, «El humedal que casi agoniza bajo las urbanizaciones»", u: "https://www.eltiempo.com/bogota/historia-del-humedal-el-burro-en-kennedy-bogota-436578" };
  const EE = { t: "El Espectador, «El humedal El Burro perdió el 89 % de su ecosistema»", u: "https://www.elespectador.com/bogota/el-humedal-el-burro-perdio-el-89-de-su-ecosistema-por-la-urbanizacion-de-bogota-article-891072/" };
  // etapa: la época del modelo 3D con la que se asocia el hito (1950, 1956, 1972, 1988 o 2024 = Actualidad)
  const EVENTOS = [
    { id: "techo-1930", anio: 1930, fecha: "7 de agosto de 1930", tema: "aeropuerto", etapa: 1950,
      titulo: "Se inaugura el aeródromo de Techo",
      texto: "Fue el primer aeropuerto de Bogotá y funcionó hasta 1959.",
      fuentes: [{ t: "Wikipedia, «Techo International Airport (Colombia)»", u: "https://en.wikipedia.org/wiki/Techo_International_Airport_(Colombia)" }] },
    { id: "panamericana-1948", anio: 1948, fecha: "abril de 1948", tema: "aeropuerto", etapa: 1950,
      titulo: "Conferencia Panamericana",
      texto: "Los delegados llegaron por el aeropuerto de Techo, al occidente de la ciudad y muy cerca de lo que luego sería Ciudad Kennedy. El 9 de abril fue asesinado Jorge Eliécer Gaitán y la conferencia se trasladó al Gimnasio Moderno.",
      fuentes: [ALCALDIA] },
    { id: "dorado-1959", anio: 1959, fecha: "10 de diciembre de 1959", tema: "aeropuerto", etapa: 1956,
      titulo: "El Dorado reemplaza a Techo",
      texto: "El aeropuerto El Dorado se inauguró tras cuatro años de construcción y reemplazó al aeropuerto de Techo, el primer aeródromo de la capital.",
      fuentes: [{ t: "Portafolio, «Con retos en su ampliación, aeropuerto El Dorado cumplió 60 años»", u: "https://www.portafolio.co/economia/infraestructura/con-retos-en-su-ampliacion-aeropuerto-el-dorado-cumplio-60-anos-536408" }] },
    { id: "piedra-1961", anio: 1961, fecha: "17 de diciembre de 1961", tema: "ciudad", etapa: 1956,
      titulo: "Primera piedra de Ciudad Techo",
      texto: "El presidente estadounidense John F. Kennedy y el colombiano Alberto Lleras Camargo lanzaron el programa de vivienda de Techo, con el auspicio de la Alianza para el Progreso. Según Wilson Quarterly, se construyó desde cero en el sitio de un aeropuerto desmantelado y lo planeó el Instituto de Crédito Territorial.",
      fuentes: [ALCALDIA, WQ] },
    { id: "nombre-1963", anio: 1963, fecha: "1963", tema: "ciudad", etapa: 1956,
      titulo: "Nace el nombre Ciudad Kennedy",
      texto: "Tras el asesinato del presidente Kennedy, los propios habitantes del barrio de Techo decidieron llamarlo Ciudad Kennedy.",
      fuentes: [ALCALDIA] },
    { id: "concejo-1967", anio: 1967, fecha: "1967", tema: "ciudad", etapa: 1972,
      titulo: "El Concejo ratifica el nombre",
      texto: "El Concejo de Bogotá ratificó el cambio de nombre. A partir de este proyecto se inició el proceso de urbanización de la localidad.",
      fuentes: [ALCALDIA] },
    { id: "buses-1969", anio: 1969, fecha: "1969", tema: "ciudad", etapa: 1972,
      titulo: "Barrios aislados hasta los buses soviéticos",
      texto: "Según Levinson y De Onís, citados por Wilson Quarterly, unos 200.000 residentes de Ciudad Kennedy estuvieron en gran medida aislados hasta 1969, cuando el alcalde de Bogotá adquirió una flota de buses soviéticos.",
      fuentes: [WQ] },
    { id: "corabastos-1972", anio: 1972, fecha: "20 de julio de 1972", tema: "central", etapa: 1972,
      titulo: "Se inaugura Corabastos",
      texto: "La central de abastos, de unos 420.000 m², se inauguró en Kennedy. Según la Alcaldía, dinamizó el poblamiento de Patio Bonito y de los barrios El Amparo y Nuestra Señora de La Paz.",
      fuentes: [{ t: "Visit Bogotá, «Central Corabastos» (fecha de inauguración)", u: "https://files.visitbogota.co/drpl/en/node/4590" }, { t: "Bogotá.gov.co, corredor turístico Corabastos (área)", u: "https://bogota.gov.co/internacional/turismo-en-bogota-visita-corabastos-y-disfruta-de-sabores-y-tradicion" }, ALCALDIA] },
    { id: "burro-1985", anio: 1985, fecha: "1985", tema: "humedal", etapa: 1988,
      titulo: "El Burro se reduce a 27,14 hectáreas",
      texto: "Según una investigación de la Universidad Nacional, el humedal tenía 171 hectáreas en los años 50 y 27,14 en 1985. Entre las causas, la prensa cita la urbanización, la construcción de vías (la avenida de las Américas fue la primera gran obra que lo partió) y una planta de transferencia de desechos que lo convirtió casi en basurero.",
      nota: "Las cifras no coinciden entre notas: El Espectador reporta 71,54 hectáreas para 1950 y El Tiempo, 171. Con 171 hectáreas, lo que queda hoy (18,8) equivale a una pérdida del 89 %, el porcentaje que ambas citan.",
      fuentes: [ET, EE] },
    { id: "cali-1990s", anio: 1990, rotulo: "1990s", fecha: "d\u00e9cada de 1990", tema: "humedal", etapa: 1995,
      titulo: "La avenida Ciudad de Cali parte el humedal",
      texto: "Seg\u00fan El Tiempo, sobre la investigaci\u00f3n de la Universidad Nacional, la primera gran obra que parti\u00f3 El Burro fue la avenida de las Am\u00e9ricas y, a\u00f1os m\u00e1s tarde, en la d\u00e9cada de los 90, tambi\u00e9n lo hizo la avenida Ciudad de Cali. Las fuentes consultadas no dan el a\u00f1o exacto.",
      fuentes: [ET, EE] },
    { id: "cabildo-1993", anio: 1993, fecha: "1993 a 1994", tema: "ciudad", etapa: 1995,
      titulo: "El único cabildo juvenil de Bogotá",
      texto: "Se organizó en Kennedy entre 1993 y 1994 y forma parte de la historia organizativa de la localidad.",
      fuentes: [ALCALDIA] },
    { id: "paro-1995", anio: 1995, fecha: "finales de 1995", tema: "central", etapa: 1995,
      titulo: "Paro de Patio Bonito y Tintal Central",
      texto: "Los habitantes bloquearon el acceso a Corabastos para reclamar servicios públicos domiciliarios, ser tenidos en cuenta en el plan de desarrollo local y mejores vías de acceso.",
      fuentes: [ALCALDIA] },
    { id: "decreto-2004", anio: 2004, fecha: "2004", tema: "humedal", etapa: 2024,
      titulo: "El Burro, parque ecológico distrital",
      texto: "El Decreto 190 de 2004 (POT) declaró a El Burro como Parque Ecológico Distrital de Humedal.",
      fuentes: [{ t: "Secretaría Distrital de Ambiente, Plan de Manejo Ambiental del humedal El Burro", u: "https://www.ambientebogota.gov.co/documents/10184/804589/PMA+EL+BURRO.pdf/807c4e0b-1839-450b-a7a6-2777a8b0fdbf" }] },
    { id: "estudio-2019", anio: 2019, fecha: "noviembre de 2019", tema: "humedal", etapa: 2024,
      titulo: "Estudio de la Universidad Nacional",
      texto: "La investigación concluye que en unos 70 años El Burro perdió cerca del 89 % de su área por la urbanización. Hoy le quedan 18,8 hectáreas.",
      fuentes: [ET, EE] },
    { id: "tinguas-2021", anio: 2021, fecha: "2 de febrero de 2021", tema: "humedal", etapa: 2024,
      titulo: "Limpieza y liberación de tinguas",
      texto: "En el Día Mundial de los Humedales, la Secretaría de Ambiente hizo una jornada de limpieza en El Burro y liberó 16 tinguas que habían sido rescatadas.",
      fuentes: [{ t: "Bogotá.gov.co, Misión para la Gestión Integral de los Humedales", u: "https://bogota.gov.co/en/node/37503" }] }
  ];
  const ETAPA_NOMBRE = { 1950: "1950", 1956: "1956", 1972: "1972", 1988: "1988", 1995: "A\u00f1os 90", 2024: "Actualidad" };

  function h(tag, attrs) {
    const e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(k => { if (k === "text") e.textContent = attrs[k]; else if (k === "class") e.className = attrs[k]; else e.setAttribute(k, attrs[k]); });
    for (let i = 2; i < arguments.length; i++) { const c = arguments[i]; if (c != null) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); }
    return e;
  }

  function iniciar() {
    const raiz = document.getElementById("kennedyTimeline");
    if (!raiz) return;
    const filtros = new Set(Object.keys(TEMAS)); // temas visibles
    let sel = EVENTOS[0].id, desdeLinea = false; // la tarjeta empieza cerrada
    const porId = {}; EVENTOS.forEach(e => { porId[e.id] = e; });
    const ordenados = EVENTOS.slice().sort((a, b) => a.anio - b.anio);

    // ---- cabecera con filtros por tema
    const chips = h("div", { class: "kt-filtros", role: "group", "aria-label": "Temas" });
    Object.keys(TEMAS).forEach(k => {
      const n = EVENTOS.filter(e => e.tema === k).length;
      const b = h("button", { type: "button", class: "kt-chip", "aria-pressed": "true", "data-tema": k }, h("i", { style: "background:" + TEMAS[k].color }), TEMAS[k].nombre + " (" + n + ")");
      b.addEventListener("click", () => {
        if (filtros.has(k)) { if (filtros.size > 1) filtros.delete(k); } else filtros.add(k);
        chips.querySelectorAll(".kt-chip").forEach(c => c.setAttribute("aria-pressed", filtros.has(c.dataset.tema) ? "true" : "false"));
        if (!filtros.has(porId[sel].tema)) sel = ordenados.find(e => filtros.has(e.tema)).id;
        pintarEje(); pintarFicha();
      });
      chips.appendChild(b);
    });
    const pista = h("p", { class: "kt-pista", text: EVENTOS.length + " hitos, de 1930 a 2021. Elige uno para ver su detalle y su fuente." });
    raiz.appendChild(h("div", { class: "kt-cab" }, h("h2", { text: "Historia de Kennedy" }), pista));

    // ---- eje proporcional al tiempo
    const eje = h("div", { class: "kt-eje", role: "group", "aria-label": "Eje del tiempo, de 1930 a 2025" });
    raiz.appendChild(eje);
    raiz.appendChild(chips);
    // el detalle del hito aparece como una tarjeta sobre la barra, para no tapar el modelo 3D
    const ficha = h("article", { class: "kt-ficha", role: "dialog", "aria-label": "Detalle del hito", "aria-live": "polite" });
    raiz.appendChild(ficha);
    function cerrarFicha() { raiz.classList.remove("abierta"); pista.hidden = false; const b = eje.querySelector(".kt-hito.sel"); if (b) b.classList.remove("sel"); }
    document.addEventListener("keydown", ev => { if (ev.key === "Escape" && raiz.classList.contains("abierta")) cerrarFicha(); });

    function pintarEje() {
      eje.innerHTML = "";
      eje.appendChild(h("div", { class: "kt-linea" }));
      for (let y = 1930; y <= 2020; y += 10) {
        const x = (y - T0) / (T1 - T0) * 100;
        eje.appendChild(h("span", { class: "kt-marca", style: "left:" + x + "%" }));
        eje.appendChild(h("span", { class: "kt-decada", style: "left:" + x + "%", text: String(y) }));
      }
      const W = eje.clientWidth || 600, ancho = 36;
      // cuatro posiciones de etiqueta (dos arriba y dos abajo) para que los años cercanos no se pisen
      const niveles = [{ lado: "arriba", n: 1, ult: -1e9 }, { lado: "abajo", n: 1, ult: -1e9 }, { lado: "arriba", n: 2, ult: -1e9 }, { lado: "abajo", n: 2, ult: -1e9 }];
      ordenados.filter(e => filtros.has(e.tema)).forEach(e => {
        const x = (e.anio - T0) / (T1 - T0) * W;
        let niv = niveles.find(n => n.ult < x - ancho / 2 - 2) || niveles.reduce((a, b) => (a.ult < b.ult ? a : b));
        niv.ult = x + ancho / 2;
        const b = h("button", { type: "button", class: "kt-hito" + (e.id === sel && raiz.classList.contains("abierta") ? " sel" : ""), "data-id": e.id, "data-etapa": String(e.etapa),
          style: "left:" + (x / W * 100) + "%; --c:" + TEMAS[e.tema].color,
          "aria-label": e.anio + ": " + e.titulo, "aria-current": e.id === sel && raiz.classList.contains("abierta") ? "true" : "false", title: e.anio + ": " + e.titulo },
          h("span", { class: "kt-punto" }),
          h("span", { class: "kt-anio kt-" + niv.lado + niv.n, text: String(e.rotulo || e.anio) }));
        b.addEventListener("click", () => seleccionar(e.id, true));
        b.addEventListener("keydown", ev => { if (ev.key === "ArrowRight") { ev.preventDefault(); mover(1, true, e.id); } if (ev.key === "ArrowLeft") { ev.preventDefault(); mover(-1, true, e.id); } });
        eje.appendChild(b);
      });
      marcarEtapa();
    }

    function visibles() { return ordenados.filter(e => filtros.has(e.tema)); }
    function mover(d, enfocar, desde) {
      const v = visibles(), i = Math.max(0, v.findIndex(e => e.id === (desde || sel))), n = v[(i + d + v.length) % v.length];
      seleccionar(n.id, true);
      if (enfocar) { const b = eje.querySelector('[data-id="' + n.id + '"]'); if (b) b.focus(); }
    }

    function pintarFicha() {
      const e = porId[sel], t = TEMAS[e.tema];
      ficha.innerHTML = "";
      ficha.style.setProperty("--c", t.color);
      const izq = h("div", { class: "kt-fecha" }, h("div", { class: "kt-gran", text: String(e.rotulo || e.anio) }), h("div", { class: "kt-fecha-txt", text: e.fecha }));
      const fuentes = h("ul", { class: "kt-fuentes" });
      e.fuentes.forEach(f => fuentes.appendChild(h("li", null, f.u ? h("a", { href: f.u, target: "_blank", rel: "noopener", text: f.t }) : f.t)));
      const nav = h("div", { class: "kt-nav" },
        h("button", { type: "button", class: "kt-btn", text: "Anterior" }),
        h("button", { type: "button", class: "kt-btn", text: "Siguiente" }));
      nav.children[0].addEventListener("click", () => mover(-1, false));
      nav.children[1].addEventListener("click", () => mover(1, false));
      const cerrar = h("button", { type: "button", class: "kt-btn", text: "Cerrar" });
      cerrar.addEventListener("click", cerrarFicha);
      nav.appendChild(cerrar);
      const der = h("div", { class: "kt-cuerpo" },
        h("div", { class: "kt-fila" }, h("div", { class: "kt-tema" }, h("i", { style: "background:" + t.color }), t.nombre), nav),
        h("h3", { text: e.titulo }),
        h("p", { class: "kt-texto", text: e.texto }),
        e.nota ? h("p", { class: "kt-nota", text: e.nota }) : null,
        h("div", { class: "kt-pie" }, h("span", { class: "kt-lbl", text: "Fuentes" }), fuentes),
        h("div", { class: "kt-pie" }, h("span", { class: "kt-lbl", text: "Modelo 3D" }), h("span", { text: "Muestra la época " + ETAPA_NOMBRE[e.etapa] + ", la más cercana disponible." })));
      ficha.appendChild(izq); ficha.appendChild(der);
    }

    // ---- sincronización con el modelo 3D
    function etapaActiva() { const a = document.querySelector(".year-btn.active"); return a ? Number(a.dataset.year) : null; }
    function marcarEtapa() {
      const et = etapaActiva();
      eje.querySelectorAll(".kt-hito").forEach(b => b.classList.toggle("en-etapa", et !== null && Number(b.dataset.etapa) === et));
    }
    function irAEtapa(et) {
      const btn = document.querySelector('.year-btn[data-year="' + et + '"]');
      if (btn && !btn.classList.contains("active")) { desdeLinea = true; btn.click(); setTimeout(() => { desdeLinea = false; }, 400); }
    }
    function seleccionar(id, moverModelo) {
      sel = id; raiz.classList.add("abierta"); pista.hidden = true;
      eje.querySelectorAll(".kt-hito").forEach(b => { const s = b.dataset.id === id; b.classList.toggle("sel", s); b.setAttribute("aria-current", s ? "true" : "false"); });
      pintarFicha();
      if (moverModelo) irAEtapa(porId[id].etapa);
    }
    // si cambian la época con los botones de abajo o con el reproductor, la línea sigue al modelo
    document.querySelectorAll(".year-btn").forEach(b => new MutationObserver(() => {
      marcarEtapa();
      if (desdeLinea) return;
      const et = etapaActiva();
      if (raiz.classList.contains("abierta") && et !== null && porId[sel].etapa !== et) { const e = visibles().find(x => x.etapa === et); if (e) seleccionar(e.id, false); }
    }).observe(b, { attributes: true, attributeFilter: ["class"] }));

    pintarEje(); pintarFicha();
    if (window.ResizeObserver) new ResizeObserver(pintarEje).observe(eje); else window.addEventListener("resize", pintarEje);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
