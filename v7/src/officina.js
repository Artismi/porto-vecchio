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
  // render.js, addStatic: ogni oggetto statico passa di qui prima di essere fuso
  let anyStrada = false;
  function onStatic(obj) {
    if (STUDIO && !ORIG.has(obj)) {
      let n = 0; obj.traverse(o => { if (o.isMesh) n++; });
      if (n <= 80) { ORIG.set(obj, obj.clone(true));
        const fr = (new Error().stack || '').split('\n'); for (const l of fr) { const m = /at (?:Object\.)?([A-Za-z_$][\w$]*) /.exec(l); if (m && !/^(onStatic|addStatic|place|regProp|Error|apply)$/.test(m[1])) { obj.userData.__nome = m[1]; break; } } }
    }
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
    if (window.Kit && !Kit.__off) { const g0 = Kit.get; Kit.get = name => apply('kit:' + name, g0(name)); Kit.__off = g0; }
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
  return { apply, sig, onStatic, onDress, held, load, build, loadGlb, parseGlb, patchCapi, wrapAll, orig, meshes, GLB, setStrada: v => { anyStrada = v; }, get STUDIO() { return STUDIO; } };
})();
