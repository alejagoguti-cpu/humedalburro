import re

with open('template_garden.html', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. NEW COMPREHENSIVE BIOTIC NETWORK BUILDER
new_network_builder = """  function buildConscientiousBioticNetwork() {
    const floraNodes = rawNodes.filter(n => n.cat === 0);
    const aveNodes = rawNodes.filter(n => n.cat === 1);
    const mamNodes = rawNodes.filter(n => n.cat === 2);
    const molNodes = rawNodes.filter(n => n.cat === 3);
    const anfNodes = rawNodes.filter(n => n.cat === 4);
    const repNodes = rawNodes.filter(n => n.cat === 5);

    function matches(n, keywords) {
      const text = (n.label + ' ' + n.sciname).toLowerCase();
      return keywords.some(k => text.includes(k.toLowerCase()));
    }

    // Subgrupos funcionales de Flora (JBB & Sabana de Bogotá)
    const pollination_flora = floraNodes.filter(n => matches(n, ['sauco', 'sambucus', 'chilco', 'baccharis', 'raque', 'vallea', 'farolito', 'abutilon', 'chicala', 'tecoma', 'tibar', 'escallonia', 'fucsia', 'fuchsia', 'siete cueros', 'tibouchina', 'salvia', 'drago', 'croton', 'arboloco', 'smallanthus', 'mortiño', 'hesperomeles', 'cayeno', 'abelia', 'corono', 'hayuelo', 'verben', 'lantana', 'borracho']));
    const berry_flora = floraNodes.filter(n => matches(n, ['sauco', 'sambucus', 'capuli', 'capulí', 'cerezo', 'prunus', 'caucho', 'ficus', 'eugenia', 'arrayan', 'arrayán', 'myrcianthes', 'pimiento', 'schinus', 'espino', 'duranta', 'palma', 'yucca', 'guayacan', 'guayacán', 'passiflora', 'curuba', 'jazmin', 'jazmín', 'laurel', 'durazno', 'mora', 'rubus', 'chicala']));
    const marsh_flora = floraNodes.filter(n => matches(n, ['sauce', 'salix', 'aliso', 'alnus', 'barbasco', 'caucho', 'ficus', 'arrayan', 'myrcianthes', 'sangregado', 'croton', 'espino', 'duranta', 'palma', 'tibar', 'chilco', 'sauco', 'fresno', 'urapan', 'junco', 'enea', 'totora', 'typha', 'botoncillo', 'lenteja', 'buchon']));
    const canopy_flora = floraNodes.filter(n => matches(n, ['sauce', 'salix', 'aliso', 'alnus', 'eucalipto', 'eucalyptus', 'cipres', 'ciprés', 'pino', 'cupressus', 'urapan', 'urapán', 'fresno', 'fraxinus', 'acacia', 'nogal', 'juglans', 'cedro', 'cedrela', 'araucaria', 'roble', 'quercus', 'caucho', 'ficus']));

    // Subgrupos funcionales de Aves (iNaturalist Humedales de Kennedy)
    const colibries = aveNodes.filter(n => matches(n, ['colibr', 'eriocnemis', 'lesbia', 'diglossa', 'metallura', 'chaetocercus', 'coeligena', 'aglaeactis', 'phaethornis', 'calzadito', 'chillón', 'cometa', 'picaflor', 'brillante']));
    const frugivores = aveNodes.filter(n => matches(n, ['turdus', 'thraupis', 'zonotrichia', 'icterus', 'mimus', 'pheucticus', 'euphonia', 'piranga', 'tangara', 'tángara', 'mirla', 'copetón', 'calandria', 'centzontle', 'eufonia', 'semillero', 'cacique', 'oropéndola', 'frutero', 'cardenal', 'chara', 'cyanocorax']));
    const marsh_birds = aveNodes.filter(n => matches(n, ['rallus', 'chrysomus', 'porphyrio', 'porphyriops', 'gallinula', 'fulica', 'mustelirallus', 'oxyura', 'pardirallus', 'sicalis', 'tingua', 'monjita', 'polla', 'focha', 'burrito', 'pato', 'rascón', 'canario', 'cerceta', 'anade', 'pisingo', 'garcita', 'ixobrychus']));
    const raptors = aveNodes.filter(n => matches(n, ['asio', 'megascops', 'tyto', 'bubo', 'elanus', 'rupornis', 'falco', 'geranoaetus', 'buteo', 'caracara', 'búho', 'autillo', 'lechuza', 'gavilán', 'aguililla', 'halcón', 'águila', 'elanio', 'carancho', 'cernícalo', 'guaco', 'pandion']));
    const herons = aveNodes.filter(n => matches(n, ['ardea', 'egretta', 'nycticorax', 'podilymbus', 'phimosus', 'garza', 'garceta', 'guaco', 'zambullidor', 'cuervillo', 'coquito', 'ibis', 'alcaraván', 'avefría', 'vanellus', 'bubulcus']));
    const chamon = aveNodes.filter(n => matches(n, ['molothrus', 'chamón', 'tordo']));
    const insectivores = aveNodes.filter(n => matches(n, ['troglodytes', 'cucarachero', 'tyrannus', 'sirirí', 'elaenia', 'pitangus', 'bienteveo', 'sayornis', 'myiarchus', 'pyrocephalus', 'atrapamoscas', 'mosquero', 'basileuterus', 'myioborus', 'setophaga', 'cardellina', 'chipe', 'reinita']));

    // A. POLINIZACIÓN & VISITA FLORAL
    (colibries.length > 0 ? colibries : aveNodes.slice(0, 20)).forEach(col => {
      (pollination_flora.slice(0, 10).length > 0 ? pollination_flora.slice(0, 10) : floraNodes.slice(0, 10)).forEach(fl => {
        addConscientiousEdge(col, fl, INTER_TYPES.POLLINATION, `Visita floral melífera de ${col.label} libando néctar en flores de ${fl.label}`);
      });
    });

    (insectivores.slice(0, 30).length > 0 ? insectivores.slice(0, 30) : aveNodes.slice(20, 50)).forEach(ins => {
      (pollination_flora.slice(5, 15).length > 0 ? pollination_flora.slice(5, 15) : floraNodes.slice(10, 20)).forEach(fl => {
        addConscientiousEdge(ins, fl, INTER_TYPES.POLLINATION, `Forrajeo floral e intercambio de polen por ${ins.label} en ${fl.label}`);
      });
    });

    // B. DISPERSIÓN DE SEMILLAS & ZOOCORÍA
    (frugivores.length > 0 ? frugivores : aveNodes.slice(10, 40)).forEach(fr => {
      (berry_flora.slice(0, 12).length > 0 ? berry_flora.slice(0, 12) : floraNodes.slice(0, 12)).forEach(tr => {
        addConscientiousEdge(fr, tr, INTER_TYPES.DISPERSAL, `Frugivoría y dispersión endozoócora de semillas de ${tr.label} por ${fr.label}`);
      });
    });

    mamNodes.forEach(mam => {
      (berry_flora.slice(0, 8).length > 0 ? berry_flora.slice(0, 8) : floraNodes.slice(0, 8)).forEach(tr => {
        addConscientiousEdge(mam, tr, INTER_TYPES.DISPERSAL, `Transporte y diseminación zoócora de semillas de ${tr.label} por ${mam.label}`);
      });
    });

    // C. NIDIFICACIÓN & REFUGIO EN JUNCALES Y VEGETACIÓN RIBEREÑA
    (marsh_birds.length > 0 ? marsh_birds : aveNodes.slice(30, 60)).forEach(mb => {
      (marsh_flora.slice(0, 10).length > 0 ? marsh_flora.slice(0, 10) : floraNodes.slice(20, 30)).forEach(mf => {
        addConscientiousEdge(mb, mf, INTER_TYPES.NESTING, `Anclaje de plataformas de nidificación y resguardo de polluelos de ${mb.label} en ${mf.label}`);
      });
    });

    // D. HERBIVORÍA Y FITOFAGIA
    (marsh_birds.slice(0, 15).length > 0 ? marsh_birds.slice(0, 15) : aveNodes.slice(0, 15)).forEach(mb => {
      (marsh_flora.slice(0, 8).length > 0 ? marsh_flora.slice(0, 8) : floraNodes.slice(0, 8)).forEach(mf => {
        addConscientiousEdge(mb, mf, INTER_TYPES.HERBIVORY, `Herbivoría directa de tejidos blandos y macrófitas de ${mf.label} por ${mb.label}`);
      });
    });

    molNodes.forEach(mol => {
      (marsh_flora.slice(0, 6).concat(berry_flora.slice(0, 6))).forEach(fl => {
        addConscientiousEdge(mol, fl, INTER_TYPES.HERBIVORY, `Raspado fitófago con rádula de hojas y plántulas tiernas de ${fl.label} por ${mol.label}`);
      });
    });

    mamNodes.filter(m => matches(m, ['cavia', 'curi', 'curí', 'rat', 'mus', 'muroidea', 'roedor'])).forEach(mam => {
      marsh_flora.slice(0, 8).forEach(fl => {
        addConscientiousEdge(mam, fl, INTER_TYPES.HERBIVORY, `Forrajeo de pastos, brotes y rizomas de ${fl.label} por ${mam.label}`);
      });
    });

    // E. ANIDAMIENTO DE DOSEL & PERCHA
    (raptors.length > 0 ? raptors : aveNodes.slice(0, 12)).forEach(rap => {
      (canopy_flora.slice(0, 10).length > 0 ? canopy_flora.slice(0, 10) : floraNodes.slice(0, 10)).forEach(tr => {
        addConscientiousEdge(rap, tr, INTER_TYPES.NEST_SITE, `Atalaya de caza y anidamiento en el dosel superior de ${tr.label} por ${rap.label}`);
      });
    });

    (herons.length > 0 ? herons : aveNodes.slice(5, 20)).forEach(hr => {
      (canopy_flora.filter(t => matches(t, ['sauce', 'salix', 'aliso', 'alnus', 'urapan'])).slice(0, 6) || canopy_flora.slice(0, 6)).forEach(tr => {
        addConscientiousEdge(hr, tr, INTER_TYPES.NEST_SITE, `Dormidero colonial y posadero de descanso de ${hr.label} en ramas ribereñas de ${tr.label}`);
      });
    });

    aveNodes.filter(a => matches(a, ['zenaida', 'torcaza', 'paloma', 'columba', 'patagioenas'])).forEach(torc => {
      canopy_flora.slice(0, 8).forEach(tr => {
        addConscientiousEdge(torc, tr, INTER_TYPES.NEST_SITE, `Nidificación en bifurcaciones de ramas y horquetas de ${tr.label} por ${torc.label}`);
      });
    });

    // F. DEPREDACIÓN CARNÍVORA & CONTROL BIOLÓGICO
    (raptors.length > 0 ? raptors : aveNodes.slice(0, 12)).forEach(rap => {
      mamNodes.filter(m => matches(m, ['rattus', 'mus', 'cavia', 'muroidea', 'roedor', 'rata', 'ratón', 'ardilla'])).forEach(mam => {
        addConscientiousEdge(rap, mam, INTER_TYPES.PREDATION, `Depredación carnívora y regulación poblacional de ${mam.label} por ${rap.label}`);
      });
      repNodes.forEach(rep => {
        addConscientiousEdge(rap, rep, INTER_TYPES.PREDATION, `Captura de reptiles de pastizal (${rep.label}) por ${rap.label}`);
      });
      anfNodes.slice(0, 5).forEach(anf => {
        addConscientiousEdge(rap, anf, INTER_TYPES.PREDATION, `Caza oportunista de ${anf.label} en márgenes hídricos por ${rap.label}`);
      });
    });

    // G. DEPREDACIÓN ICTIÓFAGA & DE ANFIBIOS
    (herons.length > 0 ? herons : aveNodes.slice(0, 15)).forEach(hr => {
      anfNodes.forEach(anf => {
        addConscientiousEdge(hr, anf, INTER_TYPES.PREDATION, `Pesca y captura subacuática con pico de ${anf.label} por ${hr.label}`);
      });
    });

    // H. DEPREDACIÓN MALACÓFAGA
    const malacophages = aveNodes.filter(a => matches(a, ['aramus', 'carrao', 'rallus', 'tingua', 'porphyrio', 'gallinula', 'oxyura', 'pato', 'garza'])).slice(0, 10);
    (malacophages.length > 0 ? malacophages : aveNodes.slice(0, 10)).forEach(mala => {
      molNodes.forEach(mol => {
        addConscientiousEdge(mala, mol, INTER_TYPES.PREDATION, `Forrajeo y consumo de caracoles acuáticos (${mol.label}) por ${mala.label}`);
      });
    });

    repNodes.filter(r => matches(r, ['atractus', 'serpiente', 'culebra'])).forEach(rep => {
      molNodes.forEach(mol => {
        addConscientiousEdge(rep, mol, INTER_TYPES.PREDATION, `Depredación especializada de moluscos y babosas (${mol.label}) por ${rep.label}`);
      });
    });

    // I. DEPREDACIÓN MAMÍFERA
    mamNodes.filter(m => matches(m, ['neogale', 'mustela', 'comadreja', 'chucurí'])).forEach(comadreja => {
      mamNodes.filter(m => matches(m, ['rattus', 'mus', 'cavia', 'muroidea', 'roedor'])).forEach(rod => {
        addConscientiousEdge(comadreja, rod, INTER_TYPES.PREDATION, `Depredación en madrigueras subterráneas de ${rod.label} por ${comadreja.label}`);
      });
      anfNodes.slice(0, 4).forEach(anf => {
        addConscientiousEdge(comadreja, anf, INTER_TYPES.PREDATION, `Caza ribereña de ${anf.label} por ${comadreja.label}`);
      });
    });

    // J. PARASITISMO DE NIDO
    (chamon.length > 0 ? chamon : aveNodes.filter(a => matches(a, ['cham', 'molothrus']))).forEach(ch => {
      aveNodes.filter(a => matches(a, ['zonotrichia', 'copetón', 'turdus', 'mirla', 'troglodytes', 'cucarachero', 'sturnella', 'chirlobirlo', 'icterus', 'thraupis'])).forEach(host => {
        addConscientiousEdge(ch, host, INTER_TYPES.PARASITISM, `Parasitismo obligado de cría de ${ch.label} depositando huevos en nido de ${host.label}`);
      });
    });

    // K. MUTUALISMO & BIOFILTRO
    floraNodes.filter(n => matches(n, ['aliso', 'alnus'])).forEach(aliso => {
      floraNodes.slice(0, 12).forEach(neighbor_fl => {
        addConscientiousEdge(aliso, neighbor_fl, INTER_TYPES.MUTUALISM, `Fijación simbiótica de nitrógeno por actinomicetos en raíces de ${aliso.label} enriqueciendo a ${neighbor_fl.label}`);
      });
    });

    marsh_flora.slice(0, 12).forEach(junc => {
      (marsh_birds.length > 0 ? marsh_birds : aveNodes.slice(0, 10)).forEach(wb => {
        addConscientiousEdge(junc, wb, INTER_TYPES.ALLELOPATHY, `Biofiltración fitoquímica de metales pesados en ${junc.label} purificando el agua para ${wb.label}`);
      });
    });

    (insectivores.slice(0, 15).length > 0 ? insectivores.slice(0, 15) : aveNodes.slice(0, 15)).forEach(chipe => {
      (frugivores.slice(0, 6).length > 0 ? frugivores.slice(0, 6) : aveNodes.slice(0, 6)).forEach(res => {
        addConscientiousEdge(chipe, res, INTER_TYPES.MUTUALISM, `Asociación en bandadas mixtas de forrajeo y alerta auditiva entre ${chipe.label} y ${res.label}`);
      });
    });

    // L. COHESIÓN COMPLETA: Conectar toda especie restante
    rawNodes.forEach(n => {
      if (n.neighbors.length < 2) {
        if (n.cat === 0) {
          const target_ave = aveNodes[n.id % aveNodes.length];
          if (target_ave) addConscientiousEdge(n, target_ave, INTER_TYPES.DISPERSAL, `Percha y transporte ornitócoro de frutos en ${n.label}`);
          const target_col = colibries.length > 0 ? colibries[n.id % colibries.length] : aveNodes[(n.id + 3) % aveNodes.length];
          if (target_col) addConscientiousEdge(n, target_col, INTER_TYPES.POLLINATION, `Visita floral y forrajeo de néctar en ${n.label}`);
        } else if (n.cat === 1) {
          const target_flora1 = floraNodes[n.id % floraNodes.length];
          if (target_flora1) addConscientiousEdge(n, target_flora1, INTER_TYPES.POLLINATION, `Atracción floral y forrajeo en estrato arbustivo de ${target_flora1.label}`);
          const target_flora2 = berry_flora.length > 0 ? berry_flora[n.id % berry_flora.length] : floraNodes[(n.id + 5) % floraNodes.length];
          if (target_flora2) addConscientiousEdge(n, target_flora2, INTER_TYPES.DISPERSAL, `Consumo y dispersión de semillas de ${target_flora2.label}`);
        } else if ([2, 3, 4, 5].includes(n.cat)) {
          const target_fl = floraNodes[n.id % floraNodes.length];
          if (target_fl) addConscientiousEdge(n, target_fl, INTER_TYPES.HERBIVORY, `Microhábitat de suelo y forrajeo vegetal en ${target_fl.label}`);
          const target_rap = raptors.length > 0 ? raptors[n.id % raptors.length] : aveNodes[n.id % aveNodes.length];
          if (target_rap) addConscientiousEdge(n, target_rap, INTER_TYPES.PREDATION, `Eslabón de presa en la red trófica frente a ${target_rap.label}`);
        }
      }
    });
  }"""

# Replace buildConscientiousBioticNetwork
code = re.sub(
    r'function buildConscientiousBioticNetwork\(\)\s*\{[\s\S]*?\n  \}\n\n  buildConscientiousBioticNetwork\(\);',
    new_network_builder + '\n\n  buildConscientiousBioticNetwork();',
    code
)

# 2. PURE INTERACTION COLORS IN LINES
new_update_lines = """  function updateEdgeLinesGeometry() {
    const activeEdgesList = [];
    const interCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };

    rawEdges.forEach(e => {
      const na = rawNodes[e.source];
      const nb = rawNodes[e.target];
      if (!na || !nb) return;

      const key = na.id < nb.id ? `${na.id}_${nb.id}` : `${nb.id}_${na.id}`;
      const inter = edgeDetailsMap[key]?.type || getInteractionInfo(na, nb);
      const typeId = inter.id;

      if (interCounts[typeId] !== undefined) interCounts[typeId]++;

      const isInterActive = opts.interactions[typeId] !== false;
      const isNodesActive = na.active && nb.active;

      if (isInterActive && isNodesActive) {
        activeEdgesList.push({ na, nb, inter });
      }
    });

    for (let i = 0; i <= 8; i++) {
      const badge = document.getElementById(`badgeInter${i}`);
      if (badge) badge.innerText = interCounts[i];
    }

    const count = activeEdgesList.length;
    const posArr = new Float32Array(count * 6);
    const colArr = new Float32Array(count * 6);

    for (let i = 0; i < count; i++) {
      const { na, nb, inter } = activeEdgesList[i];
      const ptr = i * 6;

      const posA = na.sprite ? na.sprite.position : na;
      const posB = nb.sprite ? nb.sprite.position : nb;

      posArr[ptr]     = posA.x; posArr[ptr + 1] = posA.y; posArr[ptr + 2] = posA.z;
      posArr[ptr + 3] = posB.x; posArr[ptr + 4] = posB.y; posArr[ptr + 5] = posB.z;

      // Color 100% puro de la interacción ecológica correspondiente
      const ic = new THREE.Color(inter.color || "#84A48B");
      colArr[ptr]     = ic.r; colArr[ptr + 1] = ic.g; colArr[ptr + 2] = ic.b;
      colArr[ptr + 3] = ic.r; colArr[ptr + 4] = ic.g; colArr[ptr + 5] = ic.b;
    }

    edgeGeo.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
    edgeGeo.setAttribute("color", new THREE.BufferAttribute(colArr, 3));
    edgeGeo.attributes.position.needsUpdate = true;
    edgeGeo.attributes.color.needsUpdate = true;

    const lblActiveEdges = document.getElementById("lblActiveEdges");
    if (lblActiveEdges) lblActiveEdges.innerText = count;
  }"""

code = re.sub(
    r'function updateEdgeLinesGeometry\(\)\s*\{[\s\S]*?\n    if \(lblActiveEdges\) lblActiveEdges\.innerText = count;\n  \}',
    new_update_lines,
    code
)

# 3. SUBNETWORK 2D MODAL WITH PHOTOS, PURE COLORED EDGES, RATIONALE PANEL AND CLICKABLE NEIGHBORS
new_subnetwork_js = """  // Sub-Red 2D Modal con Fotografías Reales, Relaciones Bióticas y Enlaces Puros
  let subCanvasAnim = null;
  const subOpts = { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true };
  const subImgCache = {};

  function getSubNodeImage(node) {
    if (!node) return null;
    if (subImgCache[node.id]) return subImgCache[node.id];
    const src = node.photoUrl || (rawTaxa[node.id] && rawTaxa[node.id].img);
    if (src) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = src;
      subImgCache[node.id] = img;
      return img;
    }
    return null;
  }

  window.openSubNetworkModal = () => {
    if (!selectedNode || !subnetworkModal) return;
    document.getElementById("subModalTitle").innerText = `Sub-Red de ${selectedNode.label}`;
    document.getElementById("subModalCode").innerText = `[${selectedNode.taxaId}]`;
    subnetworkModal.style.display = "flex";
    initSubNetworkCanvas();
  };

  window.closeSubNetworkModal = () => {
    if (subnetworkModal) subnetworkModal.style.display = "none";
    if (subCanvasAnim) cancelAnimationFrame(subCanvasAnim);
  };

  window.toggleSubInteraction = (interIdx) => {
    subOpts[interIdx] = !subOpts[interIdx];
    const btn = document.getElementById(`subInterToggle${interIdx}`);
    if (btn) btn.classList.toggle("active", subOpts[interIdx]);
  };

  function initSubNetworkCanvas() {
    const subCanvas = document.getElementById("subCanvas");
    if (!subCanvas) return;
    const wrap = subCanvas.parentElement;
    subCanvas.width = wrap.clientWidth || 800;
    subCanvas.height = wrap.clientHeight || 450;
    const sctx = subCanvas.getContext("2d");

    let angle = 0;
    let hoveredNeighbor = null;
    let neighborHitboxes = [];

    // Pointer events on 2D subCanvas
    subCanvas.onpointermove = (e) => {
      const rect = subCanvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      
      let found = null;
      for (const hb of neighborHitboxes) {
        const dx = mx - hb.x;
        const dy = my - hb.y;
        if (Math.hypot(dx, dy) <= hb.r + 6) {
          found = hb;
          break;
        }
      }

      hoveredNeighbor = found;
      subCanvas.style.cursor = found ? "pointer" : "default";

      const rBox = document.getElementById("subHoverRationale");
      if (rBox) {
        if (found) {
          const catCol = palette.catColors[found.node.cat] || "#84A48B";
          rBox.innerHTML = `<img src="${found.node.photoUrl || ''}" onerror="this.style.display='none'" style="width:26px; height:26px; border-radius:50%; border:1.5px solid ${catCol}; flex-shrink:0;"> <span><b>${found.node.label}</b> (<i>${found.node.sciname}</i>) · <b style="color:${found.inter.color};">[${found.inter.name}]</b>: ${found.rationale}</span>`;
        } else {
          rBox.innerHTML = `<span style="color:#84a48b; font-weight:700;">💡 Pasa el cursor o haz clic sobre un nodo vecino para explorar su relación biótica en detalle.</span>`;
        }
      }
    };

    subCanvas.onpointerdown = (e) => {
      if (hoveredNeighbor && hoveredNeighbor.node) {
        selectedNode = hoveredNeighbor.node;
        document.getElementById("subModalTitle").innerText = `Sub-Red de ${selectedNode.label}`;
        document.getElementById("subModalCode").innerText = `[${selectedNode.taxaId}]`;
        initSubNetworkCanvas();
      }
    };

    function renderSub() {
      sctx.clearRect(0, 0, subCanvas.width, subCanvas.height);
      const cx = subCanvas.width / 2;
      const cy = subCanvas.height / 2;
      const centerNode = selectedNode;
      if (!centerNode) return;

      const activeNeighbors = centerNode.neighbors.filter(nb => {
        if (!nb.active) return false;
        const key = centerNode.id < nb.id ? `${centerNode.id}_${nb.id}` : `${nb.id}_${centerNode.id}`;
        const inter = edgeDetailsMap[key]?.type || getInteractionInfo(centerNode, nb);
        return subOpts[inter.id] !== false;
      });

      const total = activeNeighbors.length;
      angle += 0.004;
      neighborHitboxes = [];

      // 1. Dibujar enlaces con colores puros
      activeNeighbors.forEach((nb, i) => {
        const th = (i / total) * Math.PI * 2 + angle;
        const dist = Math.min(cx, cy) * 0.70;
        const nx = cx + Math.cos(th) * dist;
        const ny = cy + Math.sin(th) * dist;

        const key = centerNode.id < nb.id ? `${centerNode.id}_${nb.id}` : `${nb.id}_${centerNode.id}`;
        const inter = edgeDetailsMap[key]?.type || getInteractionInfo(centerNode, nb);
        const rationale = edgeDetailsMap[key]?.rationale || `${inter.name} entre especies`;

        neighborHitboxes.push({ x: nx, y: ny, r: 18, node: nb, inter: inter, rationale: rationale });

        // Línea de interacción con color puro
        sctx.beginPath();
        sctx.moveTo(cx, cy);
        sctx.lineTo(nx, ny);
        sctx.strokeStyle = inter.color || "#84a48b";
        sctx.lineWidth = (hoveredNeighbor && hoveredNeighbor.node === nb) ? 3.5 : 2.0;
        sctx.stroke();

        // Badge en el punto medio
        const mx = (cx + nx) / 2;
        const my = (cy + ny) / 2;
        sctx.save();
        sctx.fillStyle = "rgba(10, 15, 26, 0.85)";
        sctx.strokeStyle = inter.color || "#84a48b";
        sctx.lineWidth = 1;
        sctx.beginPath();
        sctx.roundRect ? sctx.roundRect(mx - 28, my - 8, 56, 16, 4) : sctx.rect(mx - 28, my - 8, 56, 16);
        sctx.fill();
        sctx.stroke();

        sctx.fillStyle = "#ffffff";
        sctx.font = "bold 8px sans-serif";
        sctx.textAlign = "center";
        sctx.textBaseline = "middle";
        sctx.fillText((inter.name || '').substring(0, 10), mx, my);
        sctx.restore();
      });

      // 2. Dibujar nodos vecinos con fotos
      activeNeighbors.forEach((nb, i) => {
        const hb = neighborHitboxes[i];
        const nx = hb.x;
        const ny = hb.y;
        const isHover = hoveredNeighbor && hoveredNeighbor.node === nb;
        const r = isHover ? 22 : 18;

        const img = getSubNodeImage(nb);
        const catCol = palette.catColors[nb.cat] || "#84a48b";

        sctx.save();
        sctx.beginPath();
        sctx.arc(nx, ny, r, 0, Math.PI * 2);
        sctx.closePath();

        if (img && img.complete && img.naturalWidth > 0) {
          sctx.clip();
          sctx.drawImage(img, nx - r, ny - r, r * 2, r * 2);
        } else {
          sctx.fillStyle = catCol;
          sctx.fill();
          sctx.fillStyle = "#ffffff";
          sctx.font = "bold 9px sans-serif";
          sctx.textAlign = "center";
          sctx.textBaseline = "middle";
          sctx.fillText(nb.taxaId.substring(0, 7), nx, ny);
        }
        sctx.restore();

        // Borde de categoría
        sctx.beginPath();
        sctx.arc(nx, ny, r, 0, Math.PI * 2);
        sctx.strokeStyle = isHover ? "#ffffff" : catCol;
        sctx.lineWidth = isHover ? 3 : 2;
        sctx.stroke();

        // Etiqueta del vecino
        sctx.fillStyle = isHover ? "#ffffff" : "#cbd5e1";
        sctx.font = isHover ? "bold 10px sans-serif" : "9px sans-serif";
        sctx.textAlign = "center";
        sctx.fillText(nb.label.substring(0, 14), nx, ny + r + 12);
      });

      // 3. Nodo Central con Foto y Anillo Brillante
      const cr = 28;
      const cImg = getSubNodeImage(centerNode);
      const cCatCol = palette.catColors[centerNode.cat] || "#84a48b";

      sctx.save();
      sctx.beginPath();
      sctx.arc(cx, cy, cr, 0, Math.PI * 2);
      sctx.closePath();

      if (cImg && cImg.complete && cImg.naturalWidth > 0) {
        sctx.clip();
        sctx.drawImage(cImg, cx - cr, cy - cr, cr * 2, cr * 2);
      } else {
        sctx.fillStyle = cCatCol;
        sctx.fill();
        sctx.fillStyle = "#ffffff";
        sctx.font = "bold 11px sans-serif";
        sctx.textAlign = "center";
        sctx.textBaseline = "middle";
        sctx.fillText(centerNode.taxaId, cx, cy);
      }
      sctx.restore();

      sctx.beginPath();
      sctx.arc(cx, cy, cr, 0, Math.PI * 2);
      sctx.strokeStyle = cCatCol;
      sctx.lineWidth = 4;
      sctx.stroke();

      sctx.fillStyle = "#ffffff";
      sctx.font = "bold 12px sans-serif";
      sctx.textAlign = "center";
      sctx.fillText(centerNode.label, cx, cy + cr + 16);

      subCanvasAnim = requestAnimationFrame(renderSub);
    }

    renderSub();
  }"""

code = re.sub(
    r'  // Sub-Red 2D Modal[\s\S]*?subCanvasAnim = requestAnimationFrame\(renderSub\);\s*\}\s*renderSub\(\);\s*\}',
    new_subnetwork_js,
    code
)

# 4. HUBS (ESPECIES CLAVE) MODAL LOGIC AND 3D FOCUS
hubs_logic_js = """  // =====================================================================
  // HUBS (ESPECIES CLAVE) MODAL Y ENFOQUE 3D
  // =====================================================================
  let activeHubFilter = 'all';

  window.openHubsModal = () => {
    const modal = document.getElementById("hubsModal");
    if (modal) {
      modal.style.display = "flex";
      renderHubs();
    }
  };

  window.closeHubsModal = () => {
    const modal = document.getElementById("hubsModal");
    if (modal) modal.style.display = "none";
  };

  window.filterHubs = (cat) => {
    activeHubFilter = cat;
    ['all', 0, 1, 2, 3, 4, 5].forEach(k => {
      const btnId = k === 'all' ? 'hubFilterAll' : (k === 0 ? 'hubFilterFlora' : (k === 1 ? 'hubFilterAves' : (k === 2 ? 'hubFilterMam' : (k === 3 ? 'hubFilterMol' : (k === 4 ? 'hubFilterAnf' : 'hubFilterRep')))));
      const btn = document.getElementById(btnId);
      if (btn) btn.classList.toggle('active', activeHubFilter === k);
    });
    renderHubs();
  };

  window.renderHubs = () => {
    const list = document.getElementById("hubsList");
    if (!list) return;

    let nodes = rawNodes.slice();
    if (activeHubFilter !== 'all') {
      nodes = nodes.filter(n => n.cat === activeHubFilter);
    }

    // Ordenar de mayor a menor conectividad / degree
    nodes.sort((a, b) => (b.neighbors?.length || 0) - (a.neighbors?.length || 0));

    let html = '';
    nodes.slice(0, 40).forEach((n, idx) => {
      const rank = idx + 1;
      const rankClass = rank === 1 ? 'rank-1' : (rank === 2 ? 'rank-2' : (rank === 3 ? 'rank-3' : ''));
      const catHex = palette.catColors[n.cat] || '#84A48B';
      const catName = palette.catNames[n.cat] || 'Especie';

      // Calcular desglose de interacciones por tipo
      const typeBreakdown = {};
      (n.neighbors || []).forEach(nb => {
        const key = n.id < nb.id ? `${n.id}_${nb.id}` : `${nb.id}_${n.id}`;
        const inter = edgeDetailsMap[key]?.type || getInteractionInfo(n, nb);
        typeBreakdown[inter.name] = (typeBreakdown[inter.name] || 0) + 1;
      });

      const chipsHtml = Object.entries(typeBreakdown).slice(0, 4).map(([tName, tCount]) => {
        return `<span class="hub-chip">${tName}: <b>${tCount}</b></span>`;
      }).join(' ');

      html += `
        <div class="hub-card" style="--cat-color:${catHex};">
          <div class="hub-rank ${rankClass}">#${rank}</div>
          <img class="hub-img" src="${n.photoUrl || ''}" onerror="this.src='./assets/inat_sauco.png'" alt="${n.label}">
          <div class="hub-info">
            <div class="hub-title">${n.label} <span style="font-size:9.5px; color:${catHex}; font-weight:700;">[${n.taxaId}]</span></div>
            <div class="hub-sci">${n.sciname} · <span style="color:${catHex}; font-weight:600;">${catName}</span></div>
            <div class="hub-chips">${chipsHtml}</div>
          </div>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
            <div style="font-size:11px; font-weight:800; color:#E7C878;">${n.neighbors?.length || 0} Conexiones</div>
            <button class="hub-btn" onclick="focusTaxon3D('${n.taxaId}')">
              <i class="fa-solid fa-crosshairs"></i> Enfocar en 3D
            </button>
          </div>
        </div>
      `;
    });

    list.innerHTML = html;
  };

  window.focusTaxon3D = (taxaId) => {
    closeHubsModal();
    const node = rawNodes.find(n => n.taxaId === taxaId);
    if (!node) return;

    selectedNode = node;
    openInspector(node);

    if (currentMorph < 0.35) {
      if (node.sprite && window.gsap) {
        gsap.to(camera.position, {
          x: node.x * 1.8 + 8,
          y: node.y * 1.8 + 6,
          z: node.z * 1.8 + 14,
          duration: 2.0,
          ease: "power2.inOut"
        });
        gsap.to(controls.target, {
          x: node.x,
          y: node.y,
          z: node.z,
          duration: 2.0,
          ease: "power2.inOut"
        });
      }
    } else {
      const taxon = rawTaxa.find(t => t.id === taxaId);
      if (taxon && taxon.territoryPos && window.gsap) {
        gsap.to(camera.position, {
          x: taxon.territoryPos.x + 18,
          y: taxon.territoryPos.y + 24,
          z: taxon.territoryPos.z + 36,
          duration: 2.2,
          ease: "power2.inOut"
        });
        gsap.to(controls.target, {
          x: taxon.territoryPos.x,
          y: taxon.territoryPos.y,
          z: taxon.territoryPos.z,
          duration: 2.2,
          ease: "power2.inOut"
        });
      }
    }
  };
"""

if 'window.openHubsModal =' not in code:
    code = code.replace(
        '  // FAQ Chat Assistant',
        hubs_logic_js + '\n  // FAQ Chat Assistant'
    )

with open('template_garden.html', 'w', encoding='utf-8') as f:
    f.write(code)

print("Applied Javascript logic updates to template_garden.html successfully!")
