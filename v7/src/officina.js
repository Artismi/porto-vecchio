/* Porto Vecchio — l'Officina dei modelli: le modifiche ai modelli fatte nello Studio (editor.html) valgono anche nel gioco.
   Ogni modello ha una chiave:  mobile:<id> (mobili e oggetti degli interni) · kit:<nome> (pezzi degli edifici)
   strada:<impronta> (arredo di strada: lampioni, panchine… riconosciuti dalla forma) · bottino:<tipo> · pezzi:<nome> (covi)
   ogg:<id> (oggetti in mano, dove mancava il modello) · glb:<file> (modelli caricati).
   In ritocchi.json → "modelli": { chiave: { file?, fit?, parti: { i: { p, r, s, c, togli } }, nuove: [ { t|da, p, r, s, c } ] } }
     i = posizione della mesh nell'ordine di visita del modello originale (o del .glb che lo sostituisce);
     t = forma aggiunta (box, cilindro, sfera, cono, in metri: s è la misura); da = copia di un pezzo.
   "vestiti": { id: { col, sp, parti, modello: { file, osso, p, r, s } } } cambia i capi del Guardaroba. */
var Officina = (function () {
  'use strict';
  const STUDIO = !!window.PV_STUDIO;
  const RIT = () => (window.Editor && Editor.ritocchi) || {};
  const MOD = () => RIT().modelli || {};
  const GLB = {};               // file → scena caricata
  const ORIG = new WeakMap();   // Studio: oggetto di strada → copia com'era nato (prima delle modifiche)
  const BYPASS = new Set();     // chiavi da costruire senza modifiche (lo Studio le vuole grezze)
  let loader = null;

  const rng = s => () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const meshes = g => { const a = []; g.traverse(o => { if (o.isMesh) a.push(o); }); return a; };
  const r2 = v => Math.round(v * 100) / 100;
  // impronta della forma: tipo e misure delle geometrie, posizione dei pezzi, colori. Uguale per tutti gli oggetti nati uguali.
  function sig(g) {
    let h = 0x811c9dc5; const add = s => { for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); };
    g.updateMatrixWorld(true); const inv = g.matrixWorld.clone().invert(), m = new THREE.Matrix4(), p = new THREE.Vector3();
    meshes(g).forEach(o => {
      const geo = o.geometry; add(geo.type + JSON.stringify(geo.parameters || (geo.attributes.position ? geo.attributes.position.count : 0)));
      m.multiplyMatrices(inv, o.matrixWorld); p.setFromMatrixPosition(m); add(r2(p.x) + ',' + r2(p.y) + ',' + r2(p.z));
      const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(x => add(x && x.color ? x.color.getHexString() : '-'));
    });
    return (h >>> 0).toString(16).padStart(8, '0');
  }
  // materiali ricolorati: uno solo per (materiale, colore), così la geometria statica resta fusa
  const TINT = new Map();
  function tint(mat, c) {
    if (Array.isArray(mat)) return mat.map(x => tint(x, c));
    const k = mat.uuid + c; let t = TINT.get(k); if (!t) { t = mat.clone(); if (t.color) t.color.set(c); if (t.map && /^#/.test(c)) { /* resta la trama, cambia la tinta */ } TINT.set(k, t); } return t;
  }
  const PM = {};
  const pmat = c => PM[c] || (PM[c] = new THREE.MeshStandardMaterial({ color: c, roughness: .8, metalness: 0 }));
  const PGEO = { box: () => new THREE.BoxGeometry(1, 1, 1), cilindro: () => new THREE.CylinderGeometry(.5, .5, 1, 16), sfera: () => new THREE.SphereGeometry(.5, 16, 12), cono: () => new THREE.ConeGeometry(.5, 1, 16) };
  const GC = {}; const pgeo = t => GC[t] || (GC[t] = (PGEO[t] || PGEO.box)());
  function glbClone(file) { const s = GLB[file]; if (!s) return null; const g = s.clone(true); g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g; }

  // applica le modifiche salvate a un modello appena costruito (una volta sola per oggetto)
  function apply(key, g, entry) {
    if (!g || (!entry && (g.userData.__mod || BYPASS.has(key)))) return g;
    const e = entry || MOD()[key]; if (!entry) g.userData.__mod = key; if (!e) return g;
    g.updateMatrixWorld(true);
    if (e.file && GLB[e.file]) {   // sostituito: via i pezzi, dentro il .glb (adattato all'ingombro di prima se fit)
      const bb0 = new THREE.Box3().setFromObject(g), gi = g.matrixWorld.clone().invert(); bb0.applyMatrix4(gi);
      [...g.children].forEach(c => g.remove(c));
      const r = glbClone(e.file), wrap = new THREE.Group(); wrap.add(r);
      if (e.fit !== false && !bb0.isEmpty()) { const bb = new THREE.Box3().setFromObject(r), s0 = bb0.getSize(new THREE.Vector3()), s1 = bb.getSize(new THREE.Vector3()), k = Math.min(s0.x / (s1.x || 1), s0.y / (s1.y || 1), s0.z / (s1.z || 1)) || 1;
        r.scale.multiplyScalar(k); const bb2 = new THREE.Box3().setFromObject(r), c2 = bb2.getCenter(new THREE.Vector3()), c0 = bb0.getCenter(new THREE.Vector3()); r.position.x += c0.x - c2.x; r.position.z += c0.z - c2.z; r.position.y += bb0.min.y - bb2.min.y; }
      g.add(wrap);
    }
    const list = meshes(g); list.forEach((m, i) => { m.userData.__i = i; });   // lo Studio riconosce i pezzi da qui
    Object.keys(e.parti || {}).forEach(i => { const P = e.parti[i], m = list[+i]; if (!m) return;
      if (P.togli) { if (m.parent) m.parent.remove(m); return; }
      if (P.p) m.position.fromArray(P.p); if (P.r) m.rotation.set(P.r[0], P.r[1], P.r[2]); if (P.s) m.scale.fromArray(P.s); if (P.c) m.material = tint(m.material, P.c); });
    (e.nuove || []).forEach((n, j) => {
      let m; if (n.da !== undefined) { const src = list[n.da]; if (!src) return; m = src.clone(); if (n.c) m.material = tint(src.material, n.c); }
      else { m = new THREE.Mesh(pgeo(n.t), pmat(n.c || '#b8b0a0')); m.castShadow = true; m.receiveShadow = true; }
      if (n.p) m.position.fromArray(n.p); if (n.r) m.rotation.set(n.r[0], n.r[1], n.r[2]); if (n.s) m.scale.fromArray(n.s);
      m.userData.__nuova = j; g.add(m);
    });
    return g;
  }

  // ---------------- AGGANCI ----------------
  // Studio: ogni gruppo ricorda chi l'ha costruito (oAC → condizionatore…), per dare un nome ai dettagli
  const FN = { oAC: 'condizionatore', oAntenna: 'antenna', oCrate: 'cassa', oDish: 'parabola', oDrum: 'fusto', oGas: 'bombola', oLantern: 'lanterna', oPCrate: 'cassetta', oPlanter: 'fioriera', oPot: 'vaso', oShrub: 'cespuglio', oShutterLeaf: 'persiana', oTank: 'cisterna', oTree: 'albero', streetLamp: 'lampione', smallThing: 'oggetto', bigThing: 'oggetto grande', buildWallsAlive: 'manifesto / murale / bandiera', oggetti35: 'cosa trovata per terra', lampada1: 'lampada', banco: 'banco', tent: 'tenda', netFence1: 'rete', buildGuardrail1: 'guardrail', buildWinter: 'dettaglio d\'inverno', buildFountain1: 'fontana' };
  if (STUDIO && THREE.Group) { const G0 = THREE.Group, SKIP = /^(G0|add|ad|put|mkA|Group|apply|clone|copy|Object|new|eval|anonymous|flush|one|kp|forEach|map|get|[A-Z])$/;
    THREE.Group = class extends G0 { constructor() { super(); const fr = (new Error().stack || '').split('\n'); for (let i = 2; i < fr.length; i++) { const m = /at (?:new |Object\.)?([A-Za-z_$][\w$]*) /.exec(fr[i]); if (m && !SKIP.test(m[1])) { this.userData.__fn = m[1]; break; } } } }; }
  const nameOf = (c, obj) => { if (c.userData.__kitName) return 'pezzo ' + c.userData.__kitName.split('/').pop().replace(/[-_]/g, ' '); const f = c.userData.__fn; if (f) return FN[f] || f; if (c.isMesh) { const ms = Array.isArray(c.material) ? c.material[0] : c.material; return ms && ms.map ? 'cartello / insegna' : 'pezzo'; } return obj.userData.__nome || 'dettaglio'; };
  // ---------------- I DETTAGLI DELLE CASE ----------------
  // Condizionatori, parabole, antenne, cisterne, insegne, scale, tubi… sono gruppi dentro il modello della casa, fusi con lei.
  // Qui si riconoscono (i gruppi piccoli dentro un oggetto grande) e si ricorda dove finiscono le loro mesh nella geometria fusa:
  // così lo Studio li prende uno per uno, e i loro ritocchi (chiave "d:x,y,z") valgono anche nel gioco.
  const PART = new WeakMap(), DET = [], DORIG = new WeakMap(); let wantParts = STUDIO;
  const _bb = new THREE.Box3(), _sz = new THREE.Vector3();
  const BPARTS = new Map(), STATICS = [];   // per ogni secchio della geometria fusa: quali mesh ci sono finite (per risalire dal punto colpito al pezzo)
  // le case: render.js le fonde per materiale in un gruppo loro (mergeGroup); stessi conti, con secchi finti { mesh, offs }
  const GP = new Map(), GTOP = new Set();
  function onGroupPart(grp, mesh, gi, n) { let M = GP.get(grp); if (!M) { M = new Map(); GP.set(grp, M); } let e = M.get(mesh.material); if (!e) { e = { b: { mesh: null, offs: [] }, tot: 0 }; M.set(mesh.material, e); }
    e.b.offs[gi] = e.tot; e.tot += n; onPart(mesh, e.b, gi, n); if (!GTOP.has(grp)) { GTOP.add(grp); STATICS.push(grp); } }
  function onGroupMerged(grp, mat, M) { const e = GP.get(grp) && GP.get(grp).get(mat); if (e) e.b.mesh = M; }
  function onPart(mesh, b, gi, n) { let a = PART.get(mesh); if (!a) { a = []; PART.set(mesh, a); } a.push({ b, gi, n }); let L = BPARTS.get(b); if (!L) { L = []; BPARTS.set(b, L); } L.push({ gi, n, mesh }); }
  function findDetails(obj) {
    const walk = n => n.children.forEach(c => {
      if (c.isLight || c.isSprite || c.isPoints || c.isLine || c.userData.__kit) return;   // i pezzi di muro del kit non sono dettagli
      let has = false; c.traverse(o => { if (o.isMesh) has = true; }); if (!has) return;
      _bb.setFromObject(c); if (_bb.isEmpty()) return; _bb.getSize(_sz); const m = Math.max(_sz.x, _sz.y, _sz.z);
      if (m <= 4.5) DET.push({ node: c, nome: nameOf(c, obj) }); else walk(c);
    });
    walk(obj);
  }
  // i record dei dettagli, come quelli degli oggetti di strada (render.js, DZ.props): tag nella geometria fusa, copia in coordinate di mondo
  let DREC = null, dn = 0; const DRMAP = new Map(), DKEYS = new Set();
  const sizeOf = n => { _bb.setFromObject(n); if (_bb.isEmpty()) return 1e9; _bb.getSize(_sz); return Math.max(_sz.x, _sz.y, _sz.z); };
  // un dettaglio diventa un record come gli oggetti di strada (render.js, DZ.props): tag nella geometria fusa, copia in coordinate di mondo
  function makeDetail(E, node, nome) {
    if (DRMAP.has(node)) return DRMAP.get(node);
    const parts = []; node.traverse(o => { if (o.isMesh) (PART.get(o) || []).forEach(p => parts.push({ b: p.b, gi: p.gi, n: p.n, obj: node })); });
    if (!parts.length || parts.some(p => !p.b.mesh)) return null;
    node.updateMatrixWorld(true); const px = node.clone(true); node.matrixWorld.decompose(px.position, px.quaternion, px.scale); px.rotation.setFromQuaternion(px.quaternion); px.updateMatrixWorld(true);
    const tag = 'd' + (++dn); E.TAGS.set(tag, { parts, objs: [] });
    const bb = new THREE.Box3().setFromObject(px), c = bb.getCenter(new THREE.Vector3()), he = bb.getSize(new THREE.Vector3()).multiplyScalar(.5);
    px.userData.__nome = nome || nameOf(node, node); const o0 = DORIG.get(node); if (o0) ORIG.set(px, o0.clone(true)); else if (STUDIO) ORIG.set(px, node.clone(true));
    const q = px.position; let k = 'd:' + q.x.toFixed(2) + ',' + q.y.toFixed(2) + ',' + q.z.toFixed(2); if (DKEYS.has(k)) { let n = 2; while (DKEYS.has(k + '#' + n)) n++; k += '#' + n; } DKEYS.add(k);
    const rec = { tag, obj: px, c, c0: c.clone(), he, base: bb.min.y, state: 0, detail: true, mass: 1, cls: 'static', edKey: k, node };
    DRMAP.set(node, rec); if (DREC) DREC.push(rec); return rec;
  }
  // il pezzo più alto (sotto l'oggetto intero) che sta in 4,5 m e contiene questa mesh: è "il dettaglio" che si prende
  function detailNode(m) { let top = m; while (top.parent) top = top.parent; if (sizeOf(top) <= 4.5) return top; let best = null; for (let n = m; n && n !== top; n = n.parent) if (sizeOf(n) <= 4.5) best = n; return best; }
  function detailRecs(E) {
    if (DREC) return DREC; DREC = []; const props = new Set(E.DZ.props.map(r => r.obj));
    DET.forEach(d => { if (d.solo && props.has(d.node)) return; makeDetail(E, d.node, d.nome); });   // gli oggetti di strada hanno già il loro record
    // nel gioco: i dettagli ritoccati che lo Studio ha preso al volo (pezzi del kit, muri…) si ritrovano dalla posizione
    const want = new Set(Object.keys(RIT().fuori || {}).filter(k => /^d:/.test(k) && !DKEYS.has(k)).map(k => k.replace(/#\d+$/, '')));
    if (want.size) STATICS.forEach(top => top.traverse(n => { if (n === top || !want.size) return; if (sizeOf(n) > 4.5 || (n.parent !== top && sizeOf(n.parent) <= 4.5)) return;
      n.updateMatrixWorld(true); const p = new THREE.Vector3().setFromMatrixPosition(n.matrixWorld), k = 'd:' + p.x.toFixed(2) + ',' + p.y.toFixed(2) + ',' + p.z.toFixed(2); if (want.has(k)) { want.delete(k); makeDetail(E, n); } }));
    return DREC;
  }
  // il raggio sulla città vera: il primo pezzo colpito (oggetto di strada, dettaglio, o muro che fa da schermo)
  let MESHB = null;
  function pickStatic(rc, E, extra) {
    if (!MESHB) { MESHB = new Map(); BPARTS.forEach((L, b) => { if (b.mesh) { L.sort((a, c) => a.gi - c.gi); MESHB.set(b.mesh, { b, L }); } }); }
    const list = []; MESHB.forEach((v, m) => { if (m.parent && m.visible) list.push(m); }); (extra || []).forEach(m => list.push(m));
    const h = rc.intersectObjects(list, false)[0]; if (!h) return null;
    const B = MESHB.get(h.object); if (!B || !h.face) return { occ: true, dist: h.distance, object: h.object };
    const v = h.face.a, offs = B.b.offs, L = B.L; let lo = 0, hi = L.length - 1, f = null;
    while (lo <= hi) { const mid = (lo + hi) >> 1, st = offs[L[mid].gi]; if (v < st) hi = mid - 1; else if (v >= st + L[mid].n) lo = mid + 1; else { f = L[mid]; break; } }
    if (!f) return { occ: true, dist: h.distance };
    let top = f.mesh; while (top.parent) top = top.parent;
    const prop = E.DZ.props.find(r => r.obj === top); if (prop) return prop.state === 0 ? { rec: prop, dist: h.distance } : { occ: true, dist: h.distance };
    const node = detailNode(f.mesh); if (!node) return { occ: true, dist: h.distance };   // il corpo della casa
    const rec = makeDetail(E, node); return rec && rec.state === 0 ? { rec, dist: h.distance, nuovo: true } : { occ: true, dist: h.distance };
  }
  // ---------------- LA VEGETAZIONE (alberi e cespugli disegnati in serie nei blocchi del terreno) ----------------
  // Un albero è più pezzi (tronco, chioma, rami) in serie diverse: si prende il mucchio di pezzi attorno al punto (raggio VR).
  // Ritocchi in "verde": { "x,z": { d: [dx, dy, dz], ry, s } | { togli } }, rimessi ogni volta che il blocco si ricostruisce.
  const VR = 1.6, CHUNKS = new Set(); let gHf = null;
  const VERDE = () => RIT().verde || {};
  function vegMeshes(grp, all) { const a = []; grp.traverse(o => { if (!o.isInstancedMesh || !o.count) return; if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); const h = o.geometry.boundingBox.max.y - o.geometry.boundingBox.min.y; if (all || h >= .35) a.push(o); }); return a; }
  const m0of = im => im.userData.__m0 || (im.userData.__m0 = im.instanceMatrix.array.slice());
  function cluster(grp, x, z) { const out = []; vegMeshes(grp).forEach(im => { const m0 = m0of(im); for (let i = 0; i < im.count; i++) { const dx = m0[i * 16 + 12] - x, dz = m0[i * 16 + 14] - z; if (dx * dx + dz * dz < VR * VR) out.push({ im, i }); } }); return out; }
  const _M = new THREE.Matrix4(), _A = new THREE.Matrix4(), _B = new THREE.Matrix4();
  function vegSet(grp, x, z, e) {
    const mem = cluster(grp, x, z); if (!mem.length) return 0; const y = gHf ? gHf(x, z) : 0;
    if (e && !e.togli) { const d = e.d || [0, 0, 0]; _A.makeTranslation(x + d[0], y + d[1], z + d[2]).multiply(_B.makeRotationY(e.ry || 0)).multiply(_M.makeScale(e.s || 1, e.s || 1, e.s || 1)).multiply(_B.makeTranslation(-x, -y, -z)); }
    const ims = new Set();
    mem.forEach(({ im, i }) => { const m0 = m0of(im); _M.fromArray(m0, i * 16); if (!e) {} else if (e.togli) _M.makeScale(0, 0, 0); else _M.premultiply(_A); _M.toArray(im.instanceMatrix.array, i * 16); ims.add(im); });
    ims.forEach(im => { im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; }); return mem.length;
  }
  function applyVerde(grp) {
    vegMeshes(grp, true).forEach(im => { if (im.userData.__m0) { im.instanceMatrix.array.set(im.userData.__m0); im.instanceMatrix.needsUpdate = true; } });
    const V = VERDE(); Object.keys(V).forEach(k => { const [x, z] = k.split(',').map(Number); vegSet(grp, x, z, V[k]); });
  }
  function onChunk(grp, groundH) { if (groundH) gHf = groundH; CHUNKS.add(grp); for (const g of CHUNKS) if (!g.parent) CHUNKS.delete(g); if (Object.keys(VERDE()).length) applyVerde(grp); }
  function reapplyVerde() { for (const g of CHUNKS) { if (!g.parent) { CHUNKS.delete(g); continue; } applyVerde(g); } }
  // lo Studio: cosa c'è di verde sotto il raggio (il centro del mucchio e il blocco)
  function pickVeg(rc) {   // ogni pezzo di pianta è un cilindro verticale: vince il più vicino lungo il raggio
    const ray = rc.ray, a = new THREE.Vector3(), b = new THREE.Vector3(), q = new THREE.Vector3(), M = new THREE.Matrix4(); let best = null;
    for (const g of CHUNKS) { if (!g.parent) continue; vegMeshes(g).forEach(im => {
      for (let o = im; o; o = o.parent) if (!o.visible) return;
      const bb = im.geometry.boundingBox, h0 = bb.max.y - bb.min.y, r0 = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) / 2, arr = im.instanceMatrix.array;
      for (let i = 0; i < im.count; i++) { M.fromArray(arr, i * 16).premultiply(im.matrixWorld); const sx = Math.hypot(M.elements[0], M.elements[1], M.elements[2]), sy = Math.hypot(M.elements[4], M.elements[5], M.elements[6]); if (sy < 1e-4) continue;
        a.set(0, bb.min.y, 0).applyMatrix4(M); b.set(0, bb.max.y, 0).applyMatrix4(M); const r = Math.max(.35, r0 * sx * .8);
        if (ray.distanceSqToSegment(a, b, q) < r * r) { const d = q.distanceTo(ray.origin); if (!best || d < best.dist) { const m0 = m0of(im); best = { x: Math.round(m0[i * 16 + 12] * 100) / 100, z: Math.round(m0[i * 16 + 14] * 100) / 100, grp: g, dist: d }; } } } }); }
    return best; }
  function vegBox(grp, x, z, box) { box.makeEmpty(); const v = new THREE.Vector3(); cluster(grp, x, z).forEach(({ im, i }) => { _M.fromArray(im.instanceMatrix.array, i * 16); v.setFromMatrixPosition(_M); box.expandByPoint(v); }); box.expandByVector(v.set(.6, .6, .6)); if (gHf && !box.isEmpty()) box.min.y = Math.min(box.min.y, gHf(x, z)); return box; }
  // render.js, addStatic: ogni oggetto statico passa di qui prima di essere fuso
  let anyStrada = false;
  function onStatic(obj) {
    if (STUDIO && !ORIG.has(obj)) {
      let n = 0; obj.traverse(o => { if (o.isMesh) n++; });
      if (n <= 80) { ORIG.set(obj, obj.clone(true));
        const fr = (new Error().stack || '').split('\n'); for (const l of fr) { const m = /at (?:Object\.)?([A-Za-z_$][\w$]*) /.exec(l); if (m && !/^(onStatic|addStatic|place|regProp|Error|apply)$/.test(m[1])) { obj.userData.__nome = m[1]; break; } } }
    }
    if (wantParts && !obj.userData.__det) { obj.userData.__det = 1; STATICS.push(obj); obj.updateMatrixWorld(true); _bb.setFromObject(obj); _bb.getSize(_sz);
      const n0 = DET.length;
      if (Math.max(_sz.x, _sz.y, _sz.z) <= 4.5) { if (_sz.y > .06) DET.push({ node: obj, nome: nameOf(obj, obj), solo: true }); }   // un oggetto piccolo messo da solo (sui tetti, sui muri); non le macchie piatte per terra
      else findDetails(obj);
      {
        for (let i = n0; i < DET.length; i++) { const nd = DET[i].node; if (STUDIO) DORIG.set(nd, nd.clone(true)); if (anyStrada) { const k = 'strada:' + sig(nd); if (MOD()[k]) apply(k, nd); } } } }
    if (anyStrada && !obj.userData.__mod) { const k = 'strada:' + sig(obj); if (MOD()[k]) apply(k, obj); }
  }
  // vestiti: dopo che Vesti3D ha vestito una persona
  const _v = new THREE.Vector3(), _q = new THREE.Quaternion();
  function onDress(g, outfit) {
    const V = RIT().vestiti || {};
    (outfit || []).forEach(c => { const m = V[c.id] && V[c.id].modello; if (!m || !GLB[m.file]) return;
      let bone = null; g.traverse(o => { if (!bone && o.isBone && o.name === (m.osso || 'Chest')) bone = o; }); if (!bone) return;
      const r = glbClone(m.file), w = new THREE.Group(); w.add(r); if (m.p) r.position.fromArray(m.p); if (m.r) r.rotation.set(m.r[0], m.r[1], m.r[2]); if (m.s) r.scale.setScalar(m.s);
      bone.getWorldScale(_v); w.scale.setScalar(1 / (_v.x || 1)); w.userData.vesti = true; w.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true; } }); bone.add(w); });
  }
  // gli oggetti in mano: dove c'è un modello (ogg:<id>) si usa quello
  function held(id) { const k = 'ogg:' + id, e = MOD()[k]; if (!e || !e.file || !GLB[e.file]) return null; return apply(k, new THREE.Group()); }
  function patchCapi() {
    const V = RIT().vestiti || {}; if (typeof Guardaroba === 'undefined') return;
    Object.keys(Guardaroba.CAPO).forEach(id => { const C = Guardaroba.CAPO[id], v = V[id]; if (!v && !C.__orig) return; if (!C.__orig) C.__orig = { col: C.col, sp: C.sp, parti: C.parti.slice() };
      C.col = (v && v.col) || C.__orig.col; C.sp = v && v.sp != null ? v.sp : C.__orig.sp; C.parti = (v && v.parti) || C.__orig.parti.slice(); });
  }
  function wrapAll() {
    if (window.Kit && !Kit.__off) { const g0 = Kit.get; Kit.get = name => { const g = apply('kit:' + name, g0(name)); g.userData.__kit = 1; g.userData.__kitName = name; return g; }; Kit.__off = g0; }
    if (window.Models && Models.furniture && !Models.furniture.__off) { const f0 = Models.furniture; const f = name => {
        if (/^(glb|kit|pezzi|bottino):/.test(name)) return build(name);   // modelli posati dentro come mobili
        return f0(name).then(g => apply('mobile:' + name, g)); }; f.__off = f0; Models.furniture = f; }
    if (window.Pezzi && !Pezzi.__off) { Pezzi.__off = {}; Object.keys(Pezzi).forEach(k => { const f0 = Pezzi[k]; if (typeof f0 !== 'function' || k === 'mat' || k === '__off') return; Pezzi.__off[k] = f0;
        Pezzi[k] = function (g, ...a) { if (!g || !g.isObject3D) return f0.call(this, g, ...a); const sub = new THREE.Group(), r = f0.call(this, sub, ...a); apply('pezzi:' + k, sub); g.add(sub); return r === sub ? g : r; }; }); }
    if (window.Bottino && Bottino.MODEL && !Bottino.MODEL.__off) { Bottino.MODEL.__off = true; Object.keys(Bottino.MODEL).forEach(k => { const f0 = Bottino.MODEL[k]; if (typeof f0 !== 'function') return; Bottino.MODEL[k] = (g, L) => { const r = f0(g, L); apply('bottino:' + k, g); return r; }; }); }
  }
  async function loadGlb(file) {
    if (GLB[file]) return GLB[file]; loader = loader || new THREE.GLTFLoader();
    // si legge in binario e si passa al parser (il caricatore di kit.js legge gli indirizzi come testo JSON)
    try { const r = await fetch(file + '?v=' + Date.now()); if (!r.ok) throw new Error(r.status); return await parseGlb(file, await r.arrayBuffer()); } catch (e) { console.warn('[officina] manca', file, e && e.message); return null; }
  }
  function parseGlb(file, buf) { loader = loader || new THREE.GLTFLoader(); return new Promise((res, rej) => loader.parse(buf, '', gl => { GLB[file] = gl.scene; res(gl.scene); }, rej)); }
  // all'avvio, prima che nasca la città (Editor.load)
  async function load() {
    const R = RIT(), files = new Set((R.files || []).map(f => f.file));
    Object.values(R.modelli || {}).forEach(e => { if (e.file) files.add(e.file); });
    Object.values(R.vestiti || {}).forEach(v => { if (v.modello && v.modello.file) files.add(v.modello.file); });
    await Promise.all([...files].map(loadGlb));
    anyStrada = Object.keys(R.modelli || {}).some(k => /^strada:/.test(k));
    wantParts = STUDIO || Object.keys(R.fuori || {}).some(k => /^d:/.test(k)) || anyStrada;   // nel gioco i dettagli servono solo se ce ne sono di ritoccati
    wrapAll(); patchCapi();
  }
  // costruisce un modello dalla chiave (per lo Studio e per i modelli posati): Promise<gruppo>
  async function build(key, raw) {
    if (raw) BYPASS.add(key);
    try {
      const [t, id] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
      let g = null;
      if (t === 'mobile') g = /^(ia_|st_stufa$)/.test(id) && window.InterniArte ? InterniArte.prop(id, rng(1234)) : await Models.furniture(id);
      else if (t === 'kit') g = Kit.get(id);
      else if (t === 'glb') { g = new THREE.Group(); const r = glbClone(id); if (r) g.add(r); }
      else if (t === 'bottino') { g = new THREE.Group(); try { Bottino.MODEL[id](g, { kind: id, ref: 'studio', x: 0, y: 0, items: [], label: id }); } catch (e) { console.warn('[officina] bottino', id, e.message); } }
      else if (t === 'pezzi') { g = new THREE.Group(); (Pezzi.__off && Pezzi.__off[id] || Pezzi[id])(g); }
      else if (t === 'ogg') g = new THREE.Group();
      if (g && (t === 'mobile' || t === 'glb' || t === 'pezzi' || t === 'bottino' || t === 'ogg')) { if (raw) { g.userData.__mod = null; } else apply(key, g); }
      return g;
    } finally { if (raw) BYPASS.delete(key); }
  }
  const orig = obj => ORIG.get(obj) || null;
  return { onGroupPart, onGroupMerged, pickStatic, onChunk, reapplyVerde, pickVeg, vegSet, vegBox, onPart, detailRecs, get wantParts() { return wantParts; }, apply, sig, onStatic, onDress, held, load, build, loadGlb, parseGlb, patchCapi, wrapAll, orig, meshes, GLB, setStrada: v => { anyStrada = v; }, get STUDIO() { return STUDIO; } };
})();
