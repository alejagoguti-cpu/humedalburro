// Convierte datos/red-pot-kennedy-visor.xlsx -> assets/red-data.js
// Uso:  npm i exceljs  &&  node tools/build-red.js [libro.xlsx] [pagina.html]
// Por defecto: datos/red-pot-kennedy-visor.xlsx -> index.html. Los datos quedan EMBEBIDOS en la pagina
// (entre <!--RED_DATA_START--> y <!--RED_DATA_END-->), asi no dependen de ningun otro archivo.
// Mismo formato que usa el visor: categorias (CAT_META), interacciones (INTER_TYPES),
// nodos (rawTaxa), aristas y metricas de analisis (GEPHI: comunidad, intermediacion, layout 3D).
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const XLSX_PATH = path.resolve(process.argv[2] || path.join(ROOT, 'datos', 'red-pot-kennedy-visor.xlsx'));
const HTML_PATH = path.resolve(process.argv[3] || path.join(ROOT, 'index.html'));

const txt = c => {
  let x = c && c.value;
  if (x && typeof x === 'object') x = 'result' in x ? x.result : (x.richText ? x.richText.map(t => t.text).join('') : x.text);
  return x == null ? '' : String(x).trim();
};
function rows(ws, firstCol, lastCol) {
  const out = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = [];
    for (let c = firstCol; c <= lastCol; c++) row.push(txt(ws.getCell(r, c)));
    if (row[0]) out.push(row);
  }
  return out;
}

// Generador pseudoaleatorio determinista (mismo Excel -> mismos datos)
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function brandes(n, adj) {
  const bc = new Array(n).fill(0);
  for (let s = 0; s < n; s++) {
    const st = [], pred = Array.from({ length: n }, () => []), sigma = new Array(n).fill(0), dist = new Array(n).fill(-1), q = [s];
    sigma[s] = 1; dist[s] = 0;
    while (q.length) {
      const v = q.shift(); st.push(v);
      for (const w of adj[v]) {
        if (dist[w] < 0) { dist[w] = dist[v] + 1; q.push(w); }
        if (dist[w] === dist[v] + 1) { sigma[w] += sigma[v]; pred[w].push(v); }
      }
    }
    const delta = new Array(n).fill(0);
    while (st.length) { const w = st.pop(); for (const v of pred[w]) delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]); if (w !== s) bc[w] += delta[w]; }
  }
  const mx = Math.max(...bc, 1e-9);
  return bc.map(b => +(b / mx).toFixed(4));
}

// Louvain (fase 1 + agregacion) sobre grafo no dirigido ponderado
function louvain(n, edges) {
  let nodeComm = Array.from({ length: n }, (_, i) => i);
  let g = { n, w: Array.from({ length: n }, () => new Map()) };
  edges.forEach(([a, b, w]) => { g.w[a].set(b, (g.w[a].get(b) || 0) + w); g.w[b].set(a, (g.w[b].get(a) || 0) + w); });
  const m2 = edges.reduce((s, e) => s + 2 * e[2], 0);
  let mapping = Array.from({ length: n }, (_, i) => i);
  for (let level = 0; level < 10; level++) {
    const k = g.w.map(m => [...m.values()].reduce((s, x) => s + x, 0));
    const comm = Array.from({ length: g.n }, (_, i) => i), tot = k.slice();
    let moved = true, guard = 0;
    while (moved && guard++ < 50) {
      moved = false;
      for (let i = 0; i < g.n; i++) {
        const ci = comm[i], links = new Map();
        for (const [j, w] of g.w[i]) if (j !== i) links.set(comm[j], (links.get(comm[j]) || 0) + w);
        tot[ci] -= k[i];
        let best = ci, bestGain = (links.get(ci) || 0) - tot[ci] * k[i] / m2;
        for (const [c, w] of links) { const gain = w - tot[c] * k[i] / m2; if (gain > bestGain + 1e-12) { best = c; bestGain = gain; } }
        tot[best] += k[i];
        if (best !== ci) { comm[i] = best; moved = true; }
      }
    }
    const ids = [...new Set(comm)], remap = new Map(ids.map((c, i) => [c, i]));
    if (ids.length === g.n) break;
    mapping = mapping.map(x => remap.get(comm[x]));
    const ng = { n: ids.length, w: Array.from({ length: ids.length }, () => new Map()) };
    for (let i = 0; i < g.n; i++) for (const [j, w] of g.w[i]) { const a = remap.get(comm[i]), b = remap.get(comm[j]); ng.w[a].set(b, (ng.w[a].get(b) || 0) + w); }
    g = ng;
  }
  // Modularidad
  const deg = new Array(n).fill(0); edges.forEach(([a, b, w]) => { deg[a] += w; deg[b] += w; });
  let Q = 0; const sumIn = {}, sumTot = {};
  edges.forEach(([a, b, w]) => { if (mapping[a] === mapping[b]) sumIn[mapping[a]] = (sumIn[mapping[a]] || 0) + 2 * w; });
  deg.forEach((d, i) => { sumTot[mapping[i]] = (sumTot[mapping[i]] || 0) + d; });
  Object.keys(sumTot).forEach(c => { Q += (sumIn[c] || 0) / m2 - Math.pow(sumTot[c] / m2, 2); });
  // Renumerar por tamano descendente
  const size = {}; mapping.forEach(c => size[c] = (size[c] || 0) + 1);
  const order = Object.keys(size).sort((a, b) => size[b] - size[a]), fin = new Map(order.map((c, i) => [+c, i]));
  return { comm: mapping.map(c => fin.get(c)), Q: +Q.toFixed(2) };
}

// Layout 3D tipo fuerza (Fruchterman-Reingold) normalizado
function layout3d(n, edges) {
  const rand = rng(12345), p = Array.from({ length: n }, () => [rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1].map(v => v * 20));
  const k = 14;
  for (let it = 0; it < 500; it++) {
    const t = 3 * (1 - it / 500) + 0.05, f = p.map(() => [0, 0, 0]);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const d = [p[i][0] - p[j][0], p[i][1] - p[j][1], p[i][2] - p[j][2]], l = Math.max(0.01, Math.hypot(...d)), r = k * k / l;
      for (let a = 0; a < 3; a++) { f[i][a] += d[a] / l * r; f[j][a] -= d[a] / l * r; }
    }
    edges.forEach(([i, j, w]) => {
      const d = [p[i][0] - p[j][0], p[i][1] - p[j][1], p[i][2] - p[j][2]], l = Math.max(0.01, Math.hypot(...d)), a1 = l * l / k * (0.6 + 0.2 * w);
      for (let a = 0; a < 3; a++) { f[i][a] -= d[a] / l * a1; f[j][a] += d[a] / l * a1; }
    });
    for (let i = 0; i < n; i++) { const l = Math.max(0.01, Math.hypot(...f[i])); for (let a = 0; a < 3; a++) p[i][a] += f[i][a] / l * Math.min(l, t); }
  }
  const c = [0, 1, 2].map(a => p.reduce((s, q) => s + q[a], 0) / n);
  p.forEach(q => { for (let a = 0; a < 3; a++) q[a] -= c[a]; });
  const R = Math.max(...p.map(q => Math.hypot(...q))), sc = 36 / R;   // radio maximo ~36 (mismo orden de magnitud que el layout actual)
  return p.map(q => q.map(v => +(v * sc).toFixed(2)));
}

(async () => {
  const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(XLSX_PATH);
  const sh = n => { const w = wb.getWorksheet(n); if (!w) throw new Error('Falta la hoja ' + n); return w; };
  const capas = rows(sh('CAPAS'), 1, 6).map(r => ({ code: r[0], name: r[1], desc: r[2], color: r[3].toUpperCase(), icon: r[4], badge: r[5] }));
  const tipos = rows(sh('INTERACCIONES'), 1, 5).map((r, i) => ({ id: i, code: r[0], name: r[1], def: r[2], color: r[3].toUpperCase(), icon: r[4] }));
  const capaIdx = new Map(capas.map((c, i) => [c.name, i]));
  const tipoIdx = new Map(tipos.map(t => [t.name, t.id]));
  const errs = [];
  // Proyeccion lat/lon -> escena (misma calibracion del mapa de Kennedy del visor)
  const toScene = (lat, lon) => ({ x: +(209.56 + (lon + 74.153) * 15700).toFixed(2), z: +(-10.93 + (lat - 4.636) * -11600).toFixed(2) });
  const nodes = rows(sh('NODOS'), 1, 14).map(r => {
    if (!capaIdx.has(r[2])) errs.push(`Nodo ${r[0]}: capa no valida "${r[2]}"`);
    const lat = parseFloat(r[12]), lon = parseFloat(r[13]);
    if (isNaN(lat) || isNaN(lon)) errs.push(`Nodo ${r[0]}: falta latitud/longitud`);
    return { id: r[0], name: r[1], cat: capaIdx.get(r[2]), sciname: r[3], scale: r[4], loc: r[5], role: r[6], alert: r[7], actors: r[8], hypothesis: r[9], source: r[10], img: r[11], geo: { lat, lon, ...toScene(lat, lon) } };
  });
  const idIdx = new Map(nodes.map((n, i) => [n.id, i]));
  if (idIdx.size !== nodes.length) errs.push('IDs de nodo duplicados');
  const edges = rows(sh('ARISTAS'), 1, 12).map(r => {
    if (!idIdx.has(r[1])) errs.push(`Arista ${r[0]}: origen inexistente "${r[1]}"`);
    if (!idIdx.has(r[2])) errs.push(`Arista ${r[0]}: destino inexistente "${r[2]}"`);
    if (!tipoIdx.has(r[3])) errs.push(`Arista ${r[0]}: tipo no valido "${r[3]}"`);
    return { id: r[0], source: idIdx.get(r[1]), target: idIdx.get(r[2]), type: tipoIdx.get(r[3]), detail: r[4], rationale: r[5], tension: r[6], weight: Number(r[7]) || 1, declared: r[8], operative: r[9], hypothesis: r[10], evidence: r[11] };
  });
  if (errs.length) { console.error('ERRORES:\n - ' + errs.join('\n - ')); process.exit(1); }

  const n = nodes.length, adj = Array.from({ length: n }, () => []);
  const we = edges.map(e => { adj[e.source].push(e.target); adj[e.target].push(e.source); return [e.source, e.target, e.weight]; });
  const bc = brandes(n, adj), { comm, Q } = louvain(n, we), pos = layout3d(n, we);
  const gephi = { Q, nodes: {} };
  nodes.forEach((nd, i) => { gephi.nodes[nd.id] = [comm[i], bc[i], ...pos[i]]; });

  // Hoja opcional RED (Clave | Valor): titulo, marca, faq1_pregunta, faq1_respuesta, ...
  const config = { faq: [] };
  const wsR = wb.getWorksheet('RED');
  if (wsR) rows(wsR, 1, 2).forEach(([k, v]) => {
    const m = /^faq(\d+)_(pregunta|respuesta)$/.exec(k);
    if (m) { const i = +m[1] - 1; (config.faq[i] = config.faq[i] || { q: '', a: '' })[m[2] === 'pregunta' ? 'q' : 'a'] = v; }
    else config[k] = v;
  });
  config.faq = config.faq.filter(f => f && f.q);
  const data = { config, categories: capas, interactions: tipos, nodes, edges, gephi };
  let html = fs.readFileSync(HTML_PATH, 'utf8');
  const A = '<!--RED_DATA_START-->', B = '<!--RED_DATA_END-->';
  const ia = html.indexOf(A), ib = html.indexOf(B);
  if (ia < 0 || ib < 0) throw new Error('La pagina no tiene los marcadores ' + A + ' ... ' + B);
  const json = JSON.stringify(data).replace(/</g, "\\u003c"); // evita cerrar el <script> por accidente
  html = html.slice(0, ia) + A + '<script>window.RED_DATA = ' + json + ';</script>' + html.slice(ib);
  fs.writeFileSync(HTML_PATH, html);
  console.log(`OK: ${n} nodos, ${edges.length} aristas, ${capas.length} capas, ${tipos.length} tipos, ${new Set(comm).size} comunidades (Q=${Q}) -> ${path.basename(HTML_PATH)}`);
})().catch(e => { console.error(e); process.exit(1); });
