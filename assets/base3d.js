// Base 3D real de Kennedy (edificios con techos y fachadas, vías, manzanas, parques, agua y árboles).
// Mismas coordenadas del mapa del visor: escena = ((x_raw - 5341.33) / 10, -(y_raw - 3161.9) / 10).
// Se carga una sola vez, la primera vez que se entra al Territorio 3D.
(function () {
  const SCALE = 1 / 10, CX = 5341.33, CY = 3161.9;
  const A = './assets/';
  const toScene = (x, y) => ({ x: (x - CX) * SCALE, z: -(y - CY) * SCALE });
  const get = u => fetch(u).then(r => { if (!r.ok) throw new Error(u); return r.json(); });
  const tex = (url, rep) => { const t = new THREE.TextureLoader().load(url); if (rep !== false) { t.wrapS = t.wrapT = THREE.RepeatWrapping; } return t; };
  const tri = (pts, fn) => { const p2 = pts.map(p => new THREE.Vector2(p.x, p.z)); let t = []; try { t = THREE.ShapeUtils.triangulateShape(p2, []); } catch (e) { } t.forEach(fn); };

  const state = { group: null, status: 'idle', treeMesh: null, treeData: null, waterTex: null, bumpTex: null, mats: {} };
  const dummy = new THREE.Object3D();

  function ground(g) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(10682.66 * SCALE * 1.4, 6323.8 * SCALE * 1.4), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 }));
    m.rotation.x = -Math.PI / 2; m.position.y = -0.4; m.receiveShadow = true; g.add(m);
  }

  function roads(g, edges) {
    const pos = [];
    edges.forEach(([, pts]) => { for (let i = 0; i < pts.length - 1; i++) { const a = toScene(pts[i][0], pts[i][1]), b = toScene(pts[i + 1][0], pts[i + 1][1]); pos.push(a.x, 0, a.z, b.x, 0, b.z); } });
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x4a545e, transparent: true, opacity: 0.85 })));
    const rp = [], ru = [], HW = 0.9, UVS = 0.06;
    edges.forEach(([, pts], ei) => {
      const n = pts.length; if (n < 2) return;
      const yj = 0.03 + ((ei * 2654435761) % 1000) / 1000 * 0.0006, sp = pts.map(p => toScene(p[0], p[1]));
      const sn = (p, q) => { const dx = q.x - p.x, dz = q.z - p.z, l = Math.hypot(dx, dz) || 0.001; return { x: -dz / l, z: dx / l }; };
      const vn = new Array(n);
      for (let i = 0; i < n; i++) {
        if (i === 0) { vn[i] = sn(sp[0], sp[1]); continue; } if (i === n - 1) { vn[i] = sn(sp[n - 2], sp[n - 1]); continue; }
        const n1 = sn(sp[i - 1], sp[i]), n2 = sn(sp[i], sp[i + 1]); let ax = n1.x + n2.x, az = n1.z + n2.z; const al = Math.hypot(ax, az);
        if (al < 0.05) { vn[i] = n1; continue; } ax /= al; az /= al; const ch = Math.max(ax * n1.x + az * n1.z, 0.25); vn[i] = { x: ax / ch, z: az / ch };
      }
      for (let i = 0; i < n - 1; i++) {
        const a = sp[i], b = sp[i + 1], na = vn[i], nb = vn[i + 1], ax = na.x * HW, az = na.z * HW, bx = nb.x * HW, bz = nb.z * HW;
        const q = [[a.x - ax, a.z - az], [a.x + ax, a.z + az], [b.x + bx, b.z + bz], [a.x - ax, a.z - az], [b.x + bx, b.z + bz], [b.x - bx, b.z - bz]];
        q.forEach(([x, z]) => { rp.push(x, yj, z); ru.push(x * UVS, z * UVS); });
      }
    });
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); rg.setAttribute('uv', new THREE.Float32BufferAttribute(ru, 2)); rg.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ map: tex(A + 'textura_via.jpg'), color: 0xb7babd, roughness: 0.85, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
    const mesh = new THREE.Mesh(rg, mat); mesh.receiveShadow = true; g.add(mesh);
  }

  function buildings(g, list) {
    const pos = [], nor = [], ed = [];
    list.forEach(b => {
      const pts = b.pts.map(p => toScene(p[0], p[1])), h = b.h * SCALE; if (pts.length < 4) return;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], c = pts[i + 1], dx = c.x - a.x, dz = c.z - a.z, l = Math.hypot(dx, dz) || 0.001, nx = dz / l, nz = -dx / l;
        pos.push(a.x, 0, a.z, c.x, 0, c.z, c.x, h, c.z, a.x, 0, a.z, c.x, h, c.z, a.x, h, a.z);
        for (let k = 0; k < 6; k++) nor.push(nx, 0, nz);
        ed.push(a.x, h, a.z, c.x, h, c.z, a.x, 0, a.z, c.x, 0, c.z, a.x, 0, a.z, a.x, h, a.z);
      }
      tri(pts, ([ia, ib, ic]) => { pos.push(pts[ia].x, h, pts[ia].z, pts[ib].x, h, pts[ib].z, pts[ic].x, h, pts[ic].z); for (let k = 0; k < 3; k++) nor.push(0, 1, 0); });
    });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.03, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 }));
    mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh);
    const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.Float32BufferAttribute(ed, 3));
    g.add(new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: 0x2b2e33, transparent: true, opacity: 0.08 })));
  }

  const hash2 = s => { let h = 0; for (const c of (s || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  function trees(g, list) {
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0], 3));
    pg.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], 2)); pg.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ map: tex(A + 'arbol_real4.png', false), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.95 });
    const mesh = new THREE.InstancedMesh(pg, mat, list.length); mesh.frustumCulled = false;
    state.treeData = list.map(t => { const p = toScene(t[0], t[1]), h = Math.max(0.3, t[2] * SCALE), w = h * (1.1 + (hash2(t[4]) % 20) / 100 - 0.1); return { x: p.x, z: p.z, w, h }; });
    state.treeMesh = mesh; state.treeList = list; g.add(mesh);
  }

  function water(g, list) {
    const pos = [], uv = [];
    list.forEach(w => { const pts = w.pts.map(p => toScene(p[0], p[1])); if (pts.length < 3) return; tri(pts, t => t.forEach(i => { pos.push(pts[i].x, 0.022, pts[i].z); uv.push(pts[i].x * 0.08, pts[i].z * 0.08); })); });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.computeVertexNormals();
    state.waterTex = tex(A + 'textura_agua2.jpg'); state.bumpTex = tex(A + 'textura_agua2.jpg'); state.bumpTex.repeat.set(2.3, 2.3);
    g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: state.waterTex, bumpMap: state.bumpTex, bumpScale: 0.12, color: 0x97a5af, roughness: 0.18, metalness: 0.15, transparent: true, opacity: 0.82, side: THREE.DoubleSide })));
  }

  function blocks(g, list) {
    const pos = []; list.forEach(m => { const pts = m.pts.map(p => toScene(p[0], p[1])); for (let i = 0; i < pts.length - 1; i++) pos.push(pts[i].x, 0.006, pts[i].z, pts[i + 1].x, 0.006, pts[i + 1].z); });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x8a8f96, transparent: true, opacity: 0.5 })));
  }

  function parks(g, list) {
    const pos = [], uv = [];
    list.forEach(p => { const pts = p.pts.map(q => toScene(q[0], q[1])); if (pts.length < 3) return; tri(pts, t => t.forEach(i => { pos.push(pts[i].x, 0.02, pts[i].z); uv.push(pts[i].x * 0.006, pts[i].z * 0.006); })); });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex(A + 'textura_pasto.jpg'), color: 0xadaa90, roughness: 0.95, transparent: true, opacity: 0.6, side: THREE.DoubleSide })); m.receiveShadow = true; g.add(m);
  }

  function triMesh(g, data, color, extra) {
    const sp = data.verts.map(v => { const p = toScene(v[0], v[1]); return { x: p.x, y: v[2] * SCALE, z: p.z }; }), pos = [];
    data.tris.forEach(([a, b, c]) => { const pa = sp[a], pb = sp[b], pc = sp[c]; if (pa && pb && pc) pos.push(pa.x, pa.y, pa.z, pb.x, pb.y, pb.z, pc.x, pc.y, pc.z); });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.75, metalness: 0.02, side: THREE.DoubleSide }, extra || {}))); m.castShadow = true; m.receiveShadow = true; g.add(m);
  }

  const step = fn => new Promise(res => setTimeout(() => { try { fn(); } catch (e) { console.warn('Base 3D:', e); } res(); }, 30));

  window.Base3D = {
    state,
    // parent: grupo de la escena; renderer: para activar sombras
    load(parent, renderer, onProgress) {
      if (state.status !== 'idle') return;
      state.status = 'loading';
      const g = new THREE.Group(); g.visible = false; parent.add(g); state.group = g;
      if (renderer) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.BasicShadowMap; }
      g.add(new THREE.AmbientLight(0xffffff, 0.95));
      const sun = new THREE.DirectionalLight(0xffffff, 0.65);
      sun.position.set(900 * Math.cos(Math.PI / 4) * Math.sin(2.27), 900 * Math.sin(Math.PI / 4), 900 * Math.cos(Math.PI / 4) * Math.cos(2.27));
      sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.near = 10; sun.shadow.camera.far = 2600; sun.shadow.bias = -0.00015; sun.shadow.normalBias = 0.35;
      Object.assign(sun.shadow.camera, { left: -750, right: 750, top: 750, bottom: -750 }); g.add(sun); g.add(sun.target);
      const rim = new THREE.DirectionalLight(0xdce8ff, 0.25); rim.position.set(-400, 200, -300); g.add(rim);
      ground(g);
      const jobs = [['kennedy_net.json', d => roads(g, d.edges)], ['kennedy_parques.json', d => parks(g, d)], ['kennedy_water_bodies.json', d => water(g, d)], ['kennedy_manzanas.json', d => blocks(g, d)],
        ['kennedy_buildings.json', d => buildings(g, d)], ['kennedy_roofs_flat.json', d => triMesh(g, d, 0xffffff)],
        ['kennedy_facades.json', d => triMesh(g, d, 0xa05a41)], ['kennedy_trees_real.json', d => trees(g, d)]];
      let chain = Promise.resolve(), done = 0;
      jobs.forEach(([f, fn]) => {
        const p = get(A + f).catch(e => { console.warn('Base 3D: no cargó ' + f); return null; });
        chain = chain.then(() => p).then(d => d ? step(() => fn(d)) : null).then(() => { done++; if (onProgress) onProgress(done / jobs.length); });
      });
      chain.then(() => { state.status = 'ready'; if (onProgress) onProgress(1, true); });
    },
    faceTrees(camera, controls) {
      const m = state.treeMesh, d = state.treeData; if (!m || !d || !state.group || !state.group.visible) return;
      const ang = Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z);
      for (let i = 0; i < d.length; i++) { dummy.position.set(d[i].x, 0, d[i].z); dummy.scale.set(d[i].w, d[i].h, d[i].w); dummy.rotation.set(0, ang, 0); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); }
      m.instanceMatrix.needsUpdate = true;
    },
    tick(t) { if (state.waterTex) { state.waterTex.offset.x = t * 0.004; state.waterTex.offset.y = t * 0.0025; } if (state.bumpTex) { state.bumpTex.offset.x = -t * 0.007; state.bumpTex.offset.y = t * 0.0045; } }
  };
})();
