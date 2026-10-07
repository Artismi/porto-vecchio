/* Porto Vecchio — l'editor dello Studio (editor.html, F2). Nel gioco (index.html) non si apre: carica e applica i ritocchi.
   Il mondo nasce sempre uguale dal codice: l'editor non tocca il codice, tiene un elenco di RITOCCHI (ritocchi.json)
   che il gioco rimette sopra a ogni avvio.
   - Sposta: oggetti di strada (quelli fusi nella geometria statica, registrati per la distruzione), loro copie,
     mobili degli interni (nei dati di Interior.layout: collisioni e bottino seguono). Togli, duplica, ruota, alza, scala.
   - Pittura: pennello a colore, timbro (prende da qualunque texture, anche da un'altra) e gomma, sulle texture che il
     codice disegna su canvas (facciate, murales, insegne, pareti e pavimenti degli interni, terreno).
     Ogni texture dipinta si salva intera in ritocchi/<impronta>.png; al caricamento la si riconosce dall'impronta
     dei pixel che il codice ha appena disegnato e la si sostituisce.
   Con AVVIA.bat (server.js o server.ps1) salva da solo sui file; senza server si scaricano a mano. */
var Editor = (function () {
  'use strict';
  const V3 = () => new THREE.Vector3();

  // =====================================================================================================
  // REGISTRO DELLE TEXTURE DISEGNATE DAL CODICE: va messo prima che render.js ne crei una
  // =====================================================================================================
  const CANV = new WeakMap();          // canvas → texture che lo usano
  const SAVED = { imgs: {}, sizes: new Set() };   // pitture salvate: impronta → immagine
  const canvasOf = t => { const im = t && t.image; return im && im.getContext ? im : null; };
  function keyOf(c) {
    try {
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, n = d.length >> 2, step = Math.max(1, Math.floor(n / 60000));
      let h = 0x811c9dc5 ^ c.width ^ (c.height << 12);
      for (let i = 0; i < n; i += step) { const o = i << 2; h = Math.imul(h ^ d[o], 16777619); h = Math.imul(h ^ d[o + 1], 16777619); h = Math.imul(h ^ d[o + 2], 16777619); h = Math.imul(h ^ d[o + 3], 16777619); }
      return c.width + 'x' + c.height + '_' + (h >>> 0).toString(16).padStart(8, '0');
    } catch (e) { return null; }
  }
  function copyCanvas(c) { const k = document.createElement('canvas'); k.width = c.width; k.height = c.height; k.getContext('2d').drawImage(c, 0, 0); return k; }
  function touchTex(c) { const s = CANV.get(c); if (s) s.forEach(t => { t.needsUpdate = true; }); }
  // la prima volta che una texture va alla scheda video il suo canvas è come l'ha disegnato il codice: è il momento di riconoscerlo
  function firstUpload(t) {
    const c = canvasOf(t); if (!c) return;
    let s = CANV.get(c); if (s) { s.add(t); return; }
    s = new Set([t]); CANV.set(c, s);
    if (!SAVED.sizes.has(c.width + 'x' + c.height)) return;
    const k = keyOf(c); if (!k) return; c.__pvKey = k;
    const im = SAVED.imgs[k]; if (!im) return;
    c.__pvOrig = copyCanvas(c);   // la gomma riporta a com'era
    const x = c.getContext('2d'); x.save(); x.globalCompositeOperation = 'copy'; x.drawImage(im, 0, 0); x.restore();
    t.needsUpdate = true;
  }
  if (typeof THREE !== 'undefined' && THREE.CanvasTexture) {
    const Orig = THREE.CanvasTexture;
    THREE.CanvasTexture = class extends Orig {
      constructor(...a) {
        super(...a); let done = false;
        this.onUpdate = t => { if (done) return; done = true; firstUpload(t || this); };
        this.addEventListener('dispose', () => { const c = canvasOf(this), s = c && CANV.get(c); if (s) s.delete(this); });
      }
    };
  }

  // =====================================================================================================
  // STATO
  // =====================================================================================================
  let RIT = norm({}), SERVER = false, ctx = null, E = null, on = false;
  const KEYS = new Map(), TOUCHED = new Set(), TOUCHED_B = new Set(), BK = new Map();
  let COPIES = [], DETR = [];
  const undo = [], redo = [];
  let sel = null, hover = null, drag = null, tool = 'sposta', stroke = null;
  const brush = { size: .35, hard: .55, opac: .85, color: '#b84a3c' };
  let src = null, anchor = null, srcRect = null; const SRCS = [];   // timbro: punto di partenza, allineamento, campionario, riquadro scelto
  let mat = null, MATS = null; const MYMATS = [];   // materiale: quello in mano, la libreria del gioco, quelli presi dal mondo
  const held = {}, mouse = { nx: .5, ny: .5, inside: false, moved: true };
  let focus = { x: 0, y: 0 }, dirty = false, saving = false, saveAgain = false, saveT = null, lastErr = '', lastSaved = 0;
  const DIRTYC = new Set(), PAINTED = new Set(), WHERE = new WeakMap();
  let panel = null, over = null, paintHover = null, needTex = new Set();
  const RC = new THREE.Raycaster(), V2 = new THREE.Vector2(), BOX = new THREE.Box3(), VA = V3(), VB = V3(), VC = V3();
  const D4 = new THREE.Matrix4(), N3 = new THREE.Matrix3(), IDM = new THREE.Matrix4(), DQ = new THREE.Matrix4(), NQ = new THREE.Matrix3();

  function norm(j) { j = j && typeof j === 'object' ? j : {}; return { versione: 1, fuori: j.fuori || {}, copie: j.copie || [], interni: j.interni || {}, pittura: j.pittura || {}, modelli: j.modelli || {}, verde: j.verde || {}, vestiti: j.vestiti || {}, files: j.files || [] }; }
  const r3 = v => Math.round(v * 1000) / 1000;
  const gH = (x, z) => E.groundH(x, z);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const toast = (m, k) => ctx && ctx.toast && ctx.toast(m, k);

  // =====================================================================================================
  // CARICAMENTO
  // =====================================================================================================
  async function load() {
    let has = true;
    try { const r = await fetch('api/ritocchi', { cache: 'no-store' }); if (r.ok) { const j = await r.json(); SERVER = !!j.ok; has = !SERVER || !!j.file; } } catch (e) { }
    if (has) try { const r = await fetch('ritocchi.json', { cache: 'no-store' }); if (r.ok) RIT = norm(await r.json()); } catch (e) { }
    const ps = Object.keys(RIT.pittura).map(k => new Promise(res => {
      const e = RIT.pittura[k], im = new Image();
      im.onload = () => { SAVED.imgs[k] = im; SAVED.sizes.add(k.split('_')[0]); res(); }; im.onerror = () => { console.warn('[editor] manca', e.file); res(); };
      im.src = e.file + '?v=' + (e.v || 0);
    }));
    await Promise.race([Promise.all(ps), new Promise(r => setTimeout(r, 10000))]);
    if (window.Officina) try { await Officina.load(); } catch (e) { console.warn('[editor] officina', e); }   // modelli modificati e .glb caricati, prima che nasca la città
  }

  // =====================================================================================================
  // OGGETTI DI STRADA: sono fusi nelle mesh statiche; si spostano riscrivendo i loro vertici
  // =====================================================================================================
  function edInit(rec) {
    if (rec.ed) return rec.ed;
    const t = E.TAGS.get(rec.tag); if (!t || !rec.obj) return null;
    const o = rec.obj; o.updateMatrixWorld(true);
    const parts = t.parts.filter(p => p.b.mesh).map(p => { const g = p.b.mesh.geometry, s = p.b.offs[p.gi] * 3, n = p.n * 3; return { p, s, P: p.bak ? p.bak.slice() : g.attributes.position.array.slice(s, s + n), N: g.attributes.normal.array.slice(s, s + n) }; });
    rec.ed = { inv0: o.matrixWorld.clone().invert(), pos0: o.position.clone(), rot0: o.rotation.clone(), s0: o.scale.clone(), parts, L0: rec.light ? [rec.light.x, rec.light.y, rec.light.z] : null, G0: rec.glowS ? rec.glowS.position.clone() : null, off: false };
    return rec.ed;
  }
  function rewrite(rec, sphere) {   // sphere: true = ricalcola ora; un Set = raccoglie le mesh da ricalcolare dopo
    const o = rec.obj, ed = rec.ed; o.updateMatrix(); o.updateMatrixWorld(true);
    D4.multiplyMatrices(o.matrixWorld, ed.inv0); N3.getNormalMatrix(D4);
    const meshes = new Set();
    ed.parts.forEach(q => {
      const a = q.p.b.mesh.geometry.attributes, P = a.position.array, N = a.normal.array, mw = q.p.b.mesh.matrixWorld;
      let Dq = D4, Nq = N3; if (!mw.equals(IDM)) { Dq = DQ.copy(mw).invert().multiply(D4).multiply(mw); Nq = NQ.getNormalMatrix(Dq); }   // case: vertici nel riferimento del loro gruppo
      for (let i = 0; i < q.P.length; i += 3) {
        VA.set(q.P[i], q.P[i + 1], q.P[i + 2]).applyMatrix4(Dq); P[q.s + i] = VA.x; P[q.s + i + 1] = VA.y; P[q.s + i + 2] = VA.z;
        VA.set(q.N[i], q.N[i + 1], q.N[i + 2]).applyMatrix3(Nq).normalize(); N[q.s + i] = VA.x; N[q.s + i + 1] = VA.y; N[q.s + i + 2] = VA.z;
      }
      a.position.needsUpdate = true; a.normal.needsUpdate = true; meshes.add(q.p.b.mesh);
    });
    if (sphere instanceof Set) meshes.forEach(m => sphere.add(m)); else if (sphere) meshes.forEach(m => m.geometry.computeBoundingSphere());
    BOX.setFromObject(o); BOX.getCenter(rec.c); BOX.getSize(rec.he).multiplyScalar(.5); rec.base = BOX.min.y; if (!rec.detail) E.hashPut(rec, rec.c.x, rec.c.z);
    if (ed.L0) { VA.fromArray(ed.L0).applyMatrix4(D4); rec.light.x = VA.x; rec.light.y = VA.y; rec.light.z = VA.z; }
    if (ed.G0) rec.glowS.position.copy(ed.G0).applyMatrix4(D4);
  }
  // T: null = com'era; { togli } ; { pos, ry, s }
  function setRec(rec, T, spheres) {
    if (!rec) return; const ed = edInit(rec); if (!ed) return;
    if (rec.state !== 0 && !ed.off) return;   // rotto giocando: resta com'è
    if (T && T.togli) { if (!ed.off) { const t = E.TAGS.get(rec.tag); t.parts.forEach(p => { p.bak = null; }); E.hideTag(rec.tag); rec.state = 2; ed.off = true; } return; }
    if (ed.off) { E.showTag(rec.tag); rec.state = 0; ed.off = false; }
    const o = rec.obj;
    if (T) { o.position.fromArray(T.pos); o.rotation.set(ed.rot0.x, T.ry, ed.rot0.z); o.scale.copy(ed.s0).multiplyScalar(T.s || 1); }
    else { o.position.copy(ed.pos0); o.rotation.copy(ed.rot0); o.scale.copy(ed.s0); }
    rewrite(rec, spheres || true);
  }
  // copia: di un oggetto di strada (da) o di un modello qualsiasi posato dove vuoi (mod: mobile:…, kit:…, glb:…)
  function makeCopy(e) {
    if (e.mod) {
      const c = { e, g: new THREE.Group() }; c.g.position.fromArray(e.pos); c.g.rotation.y = e.ry || 0; c.g.scale.setScalar(e.s || 1); E.scene.add(c.g);
      if (window.Officina) Officina.build(e.mod).then(m => { if (!m || !COPIES.includes(c)) return; m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); c.g.add(m); });
      return c;
    }
    const rec = KEYS.get(e.da); if (!rec || !edInit(rec)) return null;
    const ed = rec.ed, g = rec.obj.clone(true);
    g.position.fromArray(e.pos); g.rotation.set(ed.rot0.x, e.ry || 0, ed.rot0.z); g.scale.copy(ed.s0).multiplyScalar(e.s || 1);
    g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    E.scene.add(g); return { e, g };
  }

  // =====================================================================================================
  // INTERNI: si cambia la lista dei mobili del piano (Interior.layout), il disegno segue
  // =====================================================================================================
  const bkey = b => b.x + ',' + b.y;
  function solidOf(o) {
    const sz = ctx.G.INT.szOf(o.id); if (!sz[2] || o.h) return null;
    const s = o.s || 1, sw = Math.abs(Math.sin(o.ry || 0)) > .5, hw = (sw ? sz[1] : sz[0]) / 2 * s, hd = (sw ? sz[0] : sz[1]) / 2 * s;
    return [o.x - hw, o.y - hd, hw * 2, hd * 2];
  }
  function floorRit(bk, f, make) {
    let B = RIT.interni[bk]; if (!B) { if (!make) return null; const b = ctx.G.BUILDINGS[BK.get(bk)]; B = RIT.interni[bk] = { nome: (b && (b.name || b.use)) || '', piani: {} }; }
    let P = B.piani[f]; if (!P) { if (!make) return null; P = B.piani[f] = { mobili: {}, nuovi: [] }; }
    P.mobili = P.mobili || {}; P.nuovi = P.nuovi || []; return P;
  }
  function applyInterior(L, bk) {
    if (!L.__ed) L.__ed = L.floors.map(F => { const seen = {}; return F.furn.map(o => { let k = o.id + '@' + o.x.toFixed(2) + ',' + o.y.toFixed(2); if (seen[k]) k += '#' + (++seen[k]); else seen[k] = 1; o.__k = k; o.__o = { x: o.x, y: o.y, h: o.h, ry: o.ry, solid: o.solid ? o.solid.slice() : null }; return o; }); });
    L.floors.forEach((F, f) => {
      const P = floorRit(bk, f, false), mob = (P && P.mobili) || {}, out = [];
      L.__ed[f].forEach(o => {
        Object.assign(o, o.__o); o.solid = o.__o.solid ? o.__o.solid.slice() : null; delete o.s;
        const e = mob[o.__k]; if (e && e.togli) return;
        if (e) { o.x = e.x; o.y = e.y; o.h = e.h || 0; o.ry = e.ry || 0; if (e.s && e.s !== 1) o.s = e.s; if (o.__o.solid) o.solid = solidOf(o); }
        out.push(o);
      });
      ((P && P.nuovi) || []).forEach(e => {
        const o = { id: e.id, x: e.x, y: e.y, ry: e.ry || 0, h: e.h || 0, room: Math.max(0, F.rooms.findIndex(q => e.x >= q.x && e.x <= q.x + q.w && e.y >= q.y && e.y <= q.y + q.h)), __add: e };
        if (e.s && e.s !== 1) o.s = e.s; o.solid = solidOf(o); out.push(o);
      });
      F.furn.length = 0; out.forEach(o => F.furn.push(o));
    });
  }

  // tutti i ritocchi rimessi sul mondo (all'avvio, dopo annulla/rifai)
  function applyAll() {
    const G = ctx.G;
    const sph = new Set();
    TOUCHED.forEach(k => { if (!RIT.fuori[k]) { setRec(KEYS.get(k), null, sph); TOUCHED.delete(k); } });
    Object.keys(RIT.fuori).forEach(k => { const rec = KEYS.get(k); if (rec) { setRec(rec, RIT.fuori[k], sph); TOUCHED.add(k); } });
    sph.forEach(m => m.geometry.computeBoundingSphere());
    COPIES.forEach(c => E.scene.remove(c.g)); COPIES = RIT.copie.map(makeCopy).filter(Boolean);
    if (window.Officina) Officina.reapplyVerde();
    let inHere = false; const p = ctx.st.player, here = p.indoor ? bkey(G.BUILDINGS[p.indoor.b]) : null;
    new Set([...TOUCHED_B, ...Object.keys(RIT.interni)]).forEach(bk => { const bi = BK.get(bk); if (bi === undefined) return; applyInterior(G.INT.layout(G.BUILDINGS[bi]), bk); TOUCHED_B.add(bk); if (bk === here) inHere = true; });
    if (inHere) E.rebuildIndoor();
  }

  // dopo che il gioco ha rimesso a posto gli oggetti rotti (nuova partita): i ritocchi tornano sopra
  function reapply() { if (!E) return; KEYS.forEach(rec => { if (rec.ed) rec.ed.off = false; }); try { applyAll(); } catch (e) { console.error('[editor] ritocchi', e); } }
  function attach(c) {
    ctx = c; E = c.R.__ed; if (!E) { console.warn('[editor] render senza __ed'); return; }
    E.DZ.props.forEach(rec => { if (!rec.obj) return; const q = rec.obj.position; let k = q.x.toFixed(2) + ',' + q.y.toFixed(2) + ',' + q.z.toFixed(2); if (KEYS.has(k)) { let n = 2; while (KEYS.has(k + '#' + n)) n++; k += '#' + n; } rec.edKey = k; KEYS.set(k, rec); });
    c.G.BUILDINGS.forEach((b, i) => BK.set(bkey(b), i));
    if (window.Officina && Officina.wantParts) { DETR = Officina.detailRecs(E); DETR.forEach(rec => KEYS.set(rec.edKey, rec)); }   // i dettagli delle case, presi uno per uno
    try { applyAll(); } catch (e) { console.error('[editor] ritocchi', e); }
    const n = Object.keys(RIT.fuori).length + RIT.copie.length + Object.keys(RIT.interni).length + Object.keys(RIT.pittura).length;
    if (n) console.log('[editor] ritocchi rimessi:', n);
  }

  // =====================================================================================================
  // SELEZIONE: tre tipi con la stessa faccia (x, z, altezza da terra, rotazione, scala)
  // =====================================================================================================
  const indoorNow = () => { const p = ctx.st.player; return p.indoor ? { b: ctx.G.BUILDINGS[p.indoor.b], f: p.indoor.f } : null; };
  const floorY = () => (window.InterniArte && InterniArte.floorY() != null ? InterniArte.floorY() : .4);
  // un edificio mai toccato: i suoi mobili prendono la chiave d'origine al primo contatto
  function inInit(b) { const bk = bkey(b); if (!TOUCHED_B.has(bk)) { applyInterior(ctx.G.INT.layout(b), bk); TOUCHED_B.add(bk); } return bk; }
  function furnOf(s) {
    const b = ctx.G.BUILDINGS[BK.get(s.bk)]; if (b) inInit(b); const F = b && ctx.G.INT.layout(b).floors[s.f]; if (!F) return null;
    return F.furn.find(o => s.entry ? o.__add === s.entry : o.__k === s.key) || null;
  }
  function meshOf(o) { const g = E.INDOOR.grp; if (!g || !o) return null; return g.children.find(m => m.userData.furn === o) || null; }
  const AD = {
    fuori: {
      ok: s => s.rec.state === 0 && !!edInit(s.rec),
      get: s => { const o = s.rec.obj; return { x: o.position.x, z: o.position.z, h: o.position.y - gH(o.position.x, o.position.z), ry: o.rotation.y, s: o.scale.x / s.rec.ed.s0.x }; },
      set: (s, T, fin) => { const o = s.rec.obj, ed = s.rec.ed; o.position.set(T.x, gH(T.x, T.z) + T.h, T.z); o.rotation.set(ed.rot0.x, T.ry, ed.rot0.z); o.scale.copy(ed.s0).multiplyScalar(T.s); rewrite(s.rec, fin); },
      commit: s => { const o = s.rec.obj, ed = s.rec.ed, k = s.rec.edKey; if (o.position.distanceTo(ed.pos0) < .001 && Math.abs(o.rotation.y - ed.rot0.y) < .0001 && Math.abs(o.scale.x / ed.s0.x - 1) < .0001) delete RIT.fuori[k]; else RIT.fuori[k] = { pos: o.position.toArray().map(r3), ry: r3(o.rotation.y), s: r3(o.scale.x / ed.s0.x) }; TOUCHED.add(k); },
      box: s => BOX.setFromObject(s.rec.obj), name: s => s.rec.detail ? (s.rec.obj.userData.__nome || 'dettaglio della casa') : 'oggetto di strada',
    },
    copia: {
      ok: s => COPIES.includes(s.c),
      get: s => { const g = s.c.g; return { x: g.position.x, z: g.position.z, h: g.position.y - gH(g.position.x, g.position.z), ry: g.rotation.y, s: s.c.e.s || 1 }; },
      set: (s, T) => { const g = s.c.g, ed = s.c.e.da ? KEYS.get(s.c.e.da).ed : null; g.position.set(T.x, gH(T.x, T.z) + T.h, T.z); g.rotation.y = T.ry; if (ed) g.scale.copy(ed.s0).multiplyScalar(T.s); else g.scale.setScalar(T.s); s.c.e.s = T.s; },
      commit: s => { const g = s.c.g; s.c.e.pos = g.position.toArray().map(r3); s.c.e.ry = r3(g.rotation.y); s.c.e.s = r3(s.c.e.s || 1); },
      box: s => BOX.setFromObject(s.c.g), name: s => s.c.e.mod ? 'modello posato · ' + s.c.e.mod : 'copia di un oggetto di strada',
    },
    verde: {
      ok: s => !!(s.grp && s.grp.parent),
      get: s => { const e = s.cur || {}, d = e.d || [0, 0, 0]; return { x: s.x + d[0], z: s.z + d[2], h: d[1], ry: e.ry || 0, s: e.s || 1 }; },
      set: (s, T) => { s.cur = { d: [T.x - s.x, T.h, T.z - s.z].map(r3), ry: r3(T.ry), s: r3(T.s) }; Officina.vegSet(s.grp, s.x, s.z, s.cur); },
      commit: s => { const e = s.cur; if (!e) return; if (Math.hypot(e.d[0], e.d[1], e.d[2]) < .001 && Math.abs(e.ry) < .0001 && Math.abs(e.s - 1) < .0001) delete RIT.verde[s.key]; else RIT.verde[s.key] = e; },
      box: s => Officina.vegBox(s.grp, s.x, s.z, BOX), name: () => 'albero / cespuglio',
    },
    mobile: {
      ok: s => { const i = indoorNow(); return !!(i && bkey(i.b) === s.bk && i.f === s.f && furnOf(s)); },
      get: s => { const o = furnOf(s); return { x: o.x, z: o.y, h: o.h || 0, ry: o.ry || 0, s: o.s || 1 }; },
      set: (s, T) => {
        const o = furnOf(s), m = meshOf(o); if (m && m.userData.s0 === undefined) m.userData.s0 = m.scale.x / (o.s || 1); o.x = T.x; o.y = T.z; o.h = Math.max(0, T.h); o.ry = T.ry; if (T.s !== 1) o.s = T.s; else delete o.s;
        if (o.__add || (o.__o && o.__o.solid)) o.solid = solidOf(o);
        if (m) { m.position.set(o.x, floorY() + o.h, o.y); m.rotation.y = o.ry; m.scale.setScalar(m.userData.s0 * (o.s || 1)); }
      },
      commit: s => {
        const o = furnOf(s); if (!o) return; const v = { x: r3(o.x), y: r3(o.y), h: r3(o.h || 0), ry: r3(o.ry || 0), s: r3(o.s || 1) };
        if (o.__add) { Object.assign(o.__add, v); return; }
        const P = floorRit(s.bk, s.f, true), O = o.__o;
        if (Math.abs(O.x - o.x) < .001 && Math.abs(O.y - o.y) < .001 && Math.abs((O.h || 0) - (o.h || 0)) < .001 && Math.abs((O.ry || 0) - (o.ry || 0)) < .0001 && !o.s) delete P.mobili[o.__k]; else P.mobili[o.__k] = v;
      },
      box: s => { const m = meshOf(furnOf(s)); return m ? BOX.setFromObject(m) : BOX.makeEmpty(); },
      name: s => { const o = furnOf(s), F = ctx.G.INT.FNAME || {}; return o ? (F[o.id] || o.id) : ''; },
    },
  };
  const okSel = s => !!s && AD[s.t].ok(s);

  // raggio dalla camera attraverso il punto dello schermo
  function aim(nx, ny) { RC.setFromCamera(V2.set(nx * 2 - 1, 1 - ny * 2), E.camera); return RC.ray; }
  function pick(nx, ny) {
    const ray = aim(nx, ny), I = indoorNow();
    if (I) {
      inInit(I.b); const g = E.INDOOR.grp; if (!g) return null; const ms = []; g.traverse(m => { if (m.isMesh) ms.push(m); });
      for (const h of RC.intersectObjects(ms, false)) { let o = h.object; while (o && !o.userData.furn) o = o.parent; if (o) { const f = o.userData.furn; return f.__add ? { t: 'mobile', bk: bkey(I.b), f: I.f, entry: f.__add } : { t: 'mobile', bk: bkey(I.b), f: I.f, key: f.__k }; } }
      return null;
    }
    // il raggio sulla città vera: il primo pezzo toccato vince; muri e terreno fanno da schermo
    const terr = []; if (ctx.R.ISO) for (const ch of ctx.R.ISO.chunks.values()) if (ch.grp.children[0]) terr.push(ch.grp.children[0]);
    let best = null, bd = 1e9;
    const st = window.Officina && Officina.pickStatic ? Officina.pickStatic(RC, E, terr) : null;
    if (st) { bd = st.dist; if (st.rec) { if (!KEYS.has(st.rec.edKey)) { KEYS.set(st.rec.edKey, st.rec); DETR.push(st.rec); } best = { t: 'fuori', rec: st.rec }; } }
    COPIES.forEach(c => { c.g.updateMatrixWorld(true); const x = RC.intersectObject(c.g, true)[0]; if (x && x.distance < bd) { bd = x.distance; best = { t: 'copia', c }; } });
    const veg = window.Officina ? Officina.pickVeg(RC) : null;
    if (veg && veg.dist < bd - .05) best = { t: 'verde', key: veg.x + ',' + veg.z, x: veg.x, z: veg.z, grp: veg.grp };   // l'albero solo se sta davanti
    return best;
  }
  function select(s) {
    if (s && s.t === 'verde') { const e = RIT.verde[s.key]; s.cur = e && !e.togli ? JSON.parse(JSON.stringify(e)) : null; }
    sel = s; if (s && s.t === 'fuori') edInit(s.rec);
    if (s && s.t === 'mobile') { const m = meshOf(furnOf(s)), o = furnOf(s); if (m && m.userData.s0 === undefined) m.userData.s0 = m.scale.x / ((o && o.s) || 1); }
    renderPanel();
  }

  // =====================================================================================================
  // MODIFICHE, ANNULLA, SALVATAGGIO
  // =====================================================================================================
  function snap() { return JSON.stringify(RIT); }
  function pushUndo(u) { undo.push(u); if (undo.length > 60) undo.shift(); redo.length = 0; }
  function changed() { dirty = true; scheduleSave(); renderPanel(); }
  function commitSel(before) { if (!okSel(sel)) return; AD[sel.t].commit(sel); const now = snap(); if (now !== before) { pushUndo({ rit: before }); changed(); } }
  function edit(fn) { const before = snap(); fn(); if (snap() !== before) { pushUndo({ rit: before }); applyAll(); changed(); } }
  function undoRedo(from, to) {
    const u = from.pop(); if (!u) return;
    if (u.rit !== undefined) { to.push({ rit: snap() }); RIT = norm(JSON.parse(u.rit)); applyAll(); if (sel && !okSel(sel)) sel = null; changed(); }
    else if (u.paint) { to.push({ paint: u.paint.map(([c]) => [c, copyCanvas(c)]) }); u.paint.forEach(([c, k]) => { const x = c.getContext('2d'); x.save(); x.globalCompositeOperation = 'copy'; x.drawImage(k, 0, 0); x.restore(); touchTex(c); DIRTYC.add(c); }); changed(); }
  }
  function scheduleSave() { clearTimeout(saveT); saveT = setTimeout(save, 700); status(); }
  const toBlob = c => new Promise(r => c.toBlob(r, 'image/png'));
  async function save() {
    if (!SERVER) { status(); return; }
    if (saving) { saveAgain = true; return; }
    saving = true; saveT = null; status();
    try {
      for (const c of [...DIRTYC]) {
        const k = c.__pvKey, b = await toBlob(c), r = await fetch('api/ritocchi/png?nome=' + encodeURIComponent(k + '.png'), { method: 'POST', body: b });
        if (!r.ok) throw new Error('pittura non salvata (' + r.status + ')');
        const w = WHERE.get(c); RIT.pittura[k] = Object.assign(RIT.pittura[k] || {}, { file: 'ritocchi/' + k + '.png', v: Date.now() }, w ? { dove: w.map(r3) } : {});
        DIRTYC.delete(c);
      }
      const r = await fetch('api/ritocchi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(RIT) });
      if (!r.ok) throw new Error('ritocchi.json non salvato (' + r.status + ')');
      dirty = DIRTYC.size > 0; lastErr = ''; lastSaved = Date.now();
    } catch (e) { lastErr = e.message; console.warn('[editor]', e); }
    saving = false; status(); if (saveAgain) { saveAgain = false; save(); }
  }
  // senza server: si scarica tutto, da mettere nella cartella v7 (le pitture in v7/ritocchi)
  async function download() {
    const a = document.createElement('a'), get = (blob, name) => { a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
    for (const c of PAINTED) { const k = c.__pvKey, w = WHERE.get(c); RIT.pittura[k] = Object.assign(RIT.pittura[k] || {}, { file: 'ritocchi/' + k + '.png', v: Date.now() }, w ? { dove: w.map(r3) } : {}); get(await toBlob(c), k + '.png'); await new Promise(r => setTimeout(r, 250)); }
    get(new Blob([JSON.stringify(RIT, null, 1)], { type: 'application/json' }), 'ritocchi.json');
    toast('Scaricati: ritocchi.json nella cartella v7, i .png in v7/ritocchi.');
  }

  // =====================================================================================================
  // AZIONI SULLA SELEZIONE
  // =====================================================================================================
  function nudge(fn) { if (!okSel(sel)) return; const before = snap(), T = AD[sel.t].get(sel); fn(T); AD[sel.t].set(sel, T, true); commitSel(before); }
  function remove() {
    if (!okSel(sel)) return; const s = sel; sel = null;
    edit(() => {
      if (s.t === 'fuori') RIT.fuori[s.rec.edKey] = { togli: true };
      else if (s.t === 'verde') RIT.verde[s.key] = { togli: true };
      else if (s.t === 'copia') RIT.copie.splice(RIT.copie.indexOf(s.c.e), 1);
      else { const P = floorRit(s.bk, s.f, true), o = furnOf(s); if (s.entry) P.nuovi.splice(P.nuovi.indexOf(s.entry), 1); else if (o) P.mobili[o.__k] = { togli: true }; }
    });
  }
  function duplicate() {
    if (!okSel(sel)) return; const s = sel, T = AD[s.t].get(s); let made = null;
    if (s.t === 'verde') { toast('Gli alberi non si duplicano: si spostano, si girano, si scalano o si tolgono.', 'bad'); return; }
    edit(() => {
      if (s.t === 'fuori' || s.t === 'copia') { const da = s.t === 'fuori' ? s.rec.edKey : s.c.e.da, x = T.x + .8, z = T.z + .8; made = Object.assign(s.t === 'copia' && s.c.e.mod ? { mod: s.c.e.mod } : { da }, { pos: [r3(x), r3(gH(x, z) + T.h), r3(z)], ry: r3(T.ry), s: r3(T.s) }); RIT.copie.push(made); }
      else { const o = furnOf(s); made = { id: o.id, x: r3(o.x + .5), y: r3(o.y + .5), h: r3(o.h || 0), ry: r3(o.ry || 0), s: r3(o.s || 1) }; floorRit(s.bk, s.f, true).nuovi.push(made); }
    });
    if (s.t === 'mobile') select({ t: 'mobile', bk: s.bk, f: s.f, entry: made });
    else { const c = COPIES.find(k => k.e === made); select(c ? { t: 'copia', c } : null); }
  }
  function revert() {
    if (!okSel(sel)) return; const s = sel;
    edit(() => { if (s.t === 'verde') delete RIT.verde[s.key]; if (s.t === 'fuori') delete RIT.fuori[s.rec.edKey]; else if (s.t === 'mobile' && s.key) { const P = floorRit(s.bk, s.f, false); if (P) delete P.mobili[s.key]; } });
    renderPanel();
  }
  function addFurn(id) {
    const I = indoorNow(); if (!I) return; const bk = bkey(I.b); let made = null;
    const L = ctx.G.INT.layout(I.b), [X0, Y0, W, H] = L.box; let q = { x: Math.max(X0 + .6, Math.min(X0 + W - .6, focus.x)), y: Math.max(Y0 + .6, Math.min(Y0 + H - .6, focus.y)) };
    if (ctx.G.INT.nearFree) { const f = ctx.G.INT.nearFree(L, I.f, q.x, q.y); if (f) q = f; }   // sul pavimento libero più vicino
    edit(() => { made = { id, x: r3(q.x), y: r3(q.y), h: 0, ry: 0, s: 1 }; floorRit(bk, I.f, true).nuovi.push(made); });
    select({ t: 'mobile', bk, f: I.f, entry: made }); toast('Aggiunto: trascinalo dove vuoi.');
  }
  function furnIds() {
    const I = ctx.G.INT, ids = new Set([...Object.keys(I.SZ || {}), ...Object.keys(I.DECOR || {}), ...Object.keys(I.SMALL || {}), ...Object.keys((I.EXTRA && I.EXTRA.sz) || {})]);
    const i = indoorNow(); if (i) ctx.G.INT.layout(i.b).floors.forEach(F => F.furn.forEach(o => ids.add(o.id)));
    (RIT.files || []).forEach(f => ids.add('glb:' + f.file));
    return [...ids].sort();
  }

  // =====================================================================================================
  // PITTURA: pennello, timbro, gomma
  // =====================================================================================================
  let CANDS = null, candT = 0;
  function paintCands() {
    const now = performance.now(); if (CANDS && now - candT < 800) return CANDS; candT = now; CANDS = [];
    E.scene.traverseVisible(o => { if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || !o.geometry || !o.geometry.attributes.uv) return; const ms = Array.isArray(o.material) ? o.material : [o.material]; if (ms.some(m => m && m.map && m.map.image && m.visible !== false)) CANDS.push(o); });
    return CANDS;
  }
  // cosa c'è sotto il puntatore: canvas, pixel, densità (pixel per metro della superficie)
  function surfaceAt(nx, ny, anyImage) {
    aim(nx, ny);
    for (const h of RC.intersectObjects(paintCands(), false)) {
      if (!h.uv || !h.face) continue;
      let m = h.object.material; if (Array.isArray(m)) m = m[h.face.materialIndex]; if (!m || m.visible === false) continue;
      if (m.transparent && m.opacity < .3) continue;   // edifici resi trasparenti davanti alla camera
      const t = m.map; if (!t || !t.image) return null;
      const c = canvasOf(t); if (!c && !anyImage) return { blocked: true };
      const img = t.image, W = img.width, H = img.height; if (!W || !H) return null;
      if (t.matrixAutoUpdate) t.updateMatrix();
      const uv = h.uv.clone(); t.transformUv(uv);
      // densità: area in pixel della faccia contro la sua area in metri
      const g = h.object.geometry, U = g.attributes.uv, P = g.attributes.position, ids = [h.face.a, h.face.b, h.face.c];
      const uvs = ids.map(i => new THREE.Vector2(U.getX(i), U.getY(i)).applyMatrix3(t.matrix)), ps = ids.map(i => V3().fromBufferAttribute(P, i).applyMatrix4(h.object.matrixWorld));
      const ua = Math.abs((uvs[1].x - uvs[0].x) * (uvs[2].y - uvs[0].y) - (uvs[2].x - uvs[0].x) * (uvs[1].y - uvs[0].y)) * W * H / 2;
      const wa = VA.subVectors(ps[1], ps[0]).cross(VB.subVectors(ps[2], ps[0])).length() / 2;
      const dens = wa > 1e-6 && ua > 1e-6 ? Math.sqrt(ua / wa) : 16;
      // per il materiale: pixel (non avvolti) dei tre vertici, e di quanto il punto colpito è stato avvolto nella texture
      const fl = t.flipY, Q = uvs.map(u => new THREE.Vector2(u.x * W, fl ? (1 - u.y) * H : u.y * H)), hu = h.uv.clone().applyMatrix3(t.matrix);
      const aff = { Q, P: ps, n: V3().subVectors(ps[1], ps[0]).cross(VB.subVectors(ps[2], ps[0])).normalize(), off: [hu.x * W - uv.x * W, (fl ? (1 - hu.y) * H : hu.y * H) - uv.y * H] };
      return { c, img, t, x: uv.x * W, y: uv.y * H, dens, point: h.point.clone(), aff };
    }
    return null;
  }
  // materiale agganciato al mondo: pixel della texture → punto del mondo (piano della faccia) → coordinate del materiale.
  // Pavimenti e terreno: assi x/z del mondo; muri: lungo il muro e in altezza. Così le piastrelle tornano pari fra un tratto e l'altro e fra texture diverse.
  function matMap(S, M, o) {
    const [Q0, Q1, Q2] = S.aff.Q, [P0, P1, P2] = S.aff.P, n = S.aff.n;
    const e1x = Q1.x - Q0.x, e1y = Q1.y - Q0.y, e2x = Q2.x - Q0.x, e2y = Q2.y - Q0.y, det = e1x * e2y - e2x * e1y; if (Math.abs(det) < 1e-9) return null;
    const i00 = e2y / det, i01 = -e2x / det, i10 = -e1y / det, i11 = e1x / det;
    let ax, ay; if (Math.abs(n.y) > .7) { ax = V3().set(1, 0, 0); ay = V3().set(0, 0, 1); } else { ax = V3().set(n.z, 0, -n.x).normalize(); ay = V3().set(0, -1, 0); }
    if (M.rot) { const t = ax; ax = ay; ay = t.clone().negate(); }
    const k = M.ppm * (M.sc || 1), W1 = V3().subVectors(P1, P0), W2 = V3().subVectors(P2, P0);
    const ax1 = k * ax.dot(W1), ax2 = k * ax.dot(W2), ay1 = k * ay.dot(W1), ay2 = k * ay.dot(W2);
    const L00 = ax1 * i00 + ax2 * i10, L01 = ax1 * i01 + ax2 * i11, L10 = ay1 * i00 + ay2 * i10, L11 = ay1 * i01 + ay2 * i11;
    const ox = o ? o[0] : M.ox || 0, oy = o ? o[1] : M.oy || 0;
    return { L00, L01, L10, L11, c0: k * ax.dot(P0) + ox - (L00 * Q0.x + L01 * Q0.y), c1: k * ay.dot(P0) + oy - (L10 * Q0.x + L11 * Q0.y) };
  }
  // Alt+clic col materiale: l'angolo della piastrella va proprio lì
  function alignMat(nx, ny) {
    const S = surfaceAt(nx, ny, false); if (!S || S.blocked || !mat) { toast('Qui non si può allineare.', 'bad'); return; }
    const A = matMap(S, mat, [0, 0]); if (!A) return; const qx = S.x + S.aff.off[0], qy = S.y + S.aff.off[1], W = mat.c.width, H = mat.c.height;
    mat.ox = (((-(A.L00 * qx + A.L01 * qy + A.c0)) % W) + W) % W; mat.oy = (((-(A.L10 * qx + A.L11 * qy + A.c1)) % H) + H) % H; toast('Materiale allineato qui.');
  }
  function matFromSource() {
    if (!src) return; const im = src.img, q = srcRect || { x: 0, y: 0, w: im.width, h: im.height }, c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(q.w)); c.height = Math.max(1, Math.round(q.h)); c.getContext('2d').drawImage(im, q.x, q.y, q.w, q.h, 0, 0, c.width, c.height);
    mat = { nome: 'preso dal mondo ' + (MYMATS.length + 1), gruppo: 'Presi dal mondo', c, ppm: src.dens, sc: 1, ox: 0, oy: 0, rot: 0 }; MYMATS.unshift(mat); if (MYMATS.length > 16) MYMATS.pop();
    setTool('materiale'); toast('Nuovo materiale: Alt+clic dove deve cominciare la piastrella, poi dipingi.');
  }
  function library() {
    if (!MATS) { MATS = []; try { if (E.materiali) MATS.push(...E.materiali()); } catch (e) { console.warn('[editor] materiali strade', e); } try { if (window.InterniArte && InterniArte.materiali) MATS.push(...InterniArte.materiali()); } catch (e) { console.warn('[editor] materiali interni', e); } MATS.forEach(m => Object.assign(m, { sc: 1, ox: 0, oy: 0, rot: 0 })); }
    return MYMATS.concat(MATS);
  }
  const TMP = document.createElement('canvas');
  function dab(S, mode) {
    const c = S.c, r = Math.max(.75, Math.min(600, brush.size * S.dens)), d = Math.ceil(r * 2) + 2, x = TMP.getContext('2d');
    if (TMP.width < d || TMP.height < d) { TMP.width = Math.max(TMP.width, d); TMP.height = Math.max(TMP.height, d); }
    x.clearRect(0, 0, TMP.width, TMP.height); x.globalCompositeOperation = 'source-over';
    if (mode === 'pennello') { x.fillStyle = brush.color; x.fillRect(0, 0, d, d); }
    else if (mode === 'materiale') {
      if (!mat || !S.aff) return; const A = matMap(S, mat); if (!A) return;
      const t0 = S.x - d / 2 + S.aff.off[0], t1 = S.y - d / 2 + S.aff.off[1], T0 = A.L00 * t0 + A.L01 * t1 + A.c0, T1 = A.L10 * t0 + A.L11 * t1 + A.c1, dl = A.L00 * A.L11 - A.L01 * A.L10; if (Math.abs(dl) < 1e-12) return;
      const a = A.L11 / dl, b = -A.L10 / dl, c2 = -A.L01 / dl, d2 = A.L00 / dl, pat = x.createPattern(mat.c, 'repeat');
      try { pat.setTransform(new DOMMatrix([a, b, c2, d2, -(a * T0 + c2 * T1), -(b * T0 + d2 * T1)])); } catch (e) { return; }
      x.imageSmoothingEnabled = false; x.fillStyle = pat; x.fillRect(0, 0, d, d);
    }
    else if (mode === 'gomma') { if (!c.__pvOrig) return; x.drawImage(c.__pvOrig, S.x - d / 2, S.y - d / 2, d, d, 0, 0, d, d); }
    else {
      if (!src) return;
      if (!anchor || anchor.c !== c) anchor = { c, x: S.x, y: S.y, sx: src.x, sy: src.y, p: S.point.clone() };
      const k = src.dens / S.dens, SW = src.img.width, SH = src.img.height;
      let sx = anchor.sx + (S.x - anchor.x) * k, sy = anchor.sy + (S.y - anchor.y) * k; sx = ((sx % SW) + SW) % SW; sy = ((sy % SH) + SH) % SH;
      const rs = d / 2 * k; x.drawImage(src.img, sx - rs, sy - rs, rs * 2, rs * 2, 0, 0, d, d);
    }
    x.globalCompositeOperation = 'destination-in';
    const gr = x.createRadialGradient(d / 2, d / 2, r * Math.min(.98, brush.hard), d / 2, d / 2, r); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.fillRect(0, 0, d, d); x.globalCompositeOperation = 'source-over';
    const cx = c.getContext('2d'); cx.save(); cx.globalAlpha = brush.opac; cx.drawImage(TMP, 0, 0, d, d, S.x - d / 2, S.y - d / 2, d, d); cx.restore();
    needTex.add(c);
  }
  function paintAt(nx, ny) {
    const S = surfaceAt(nx, ny, false); if (!S || S.blocked) return;
    const c = S.c;
    if (!stroke.snaps.has(c)) {
      if (!c.__pvKey) c.__pvKey = keyOf(c); if (!c.__pvKey) return;
      stroke.snaps.set(c, copyCanvas(c)); if (!c.__pvOrig) c.__pvOrig = copyCanvas(c);
      if (!WHERE.has(c)) WHERE.set(c, S.point.toArray()); PAINTED.add(c);
    }
    const L = stroke.last;
    if (L && L.c === c) { const dx = S.x - L.x, dy = S.y - L.y, n = Math.min(60, Math.floor(Math.hypot(dx, dy) / Math.max(1, brush.size * S.dens * .3))); for (let i = 1; i <= n; i++) dab(Object.assign({}, S, { x: L.x + dx * i / (n + 1), y: L.y + dy * i / (n + 1) }), tool); }
    dab(S, tool); stroke.last = S; DIRTYC.add(c);
  }
  function takeSource(nx, ny) {
    const S = surfaceAt(nx, ny, true); if (!S || S.blocked) { toast('Qui sotto non c\'è una texture da prendere.', 'bad'); return; }
    src = { img: S.c || S.img, x: S.x, y: S.y, dens: S.dens, p: S.point }; anchor = null; srcRect = null;
    const i = SRCS.findIndex(q => q.img === src.img); if (i >= 0) SRCS.splice(i, 1); SRCS.unshift({ img: src.img, dens: src.dens }); if (SRCS.length > 12) SRCS.pop();
    renderPanel(); toast('Timbro: preso. Ora dipingi dove vuoi.');
  }

  // =====================================================================================================
  // INPUT
  // =====================================================================================================
  function inPanel(t) { return !!(panel && t instanceof Node && panel.contains(t)); }
  function toggle(force) {
    const v = force === undefined ? !on : force; if (v === on || (!v && STUDIO)) return;
    if (v && (!E || ctx.ui.intro)) return;
    on = v; sel = null; hover = null; drag = null; stroke = null;
    if (on) { const p = ctx.st.player; focus = p.indoor ? { x: p.x, y: p.y } : { x: ctx.R.cam.x, y: ctx.R.cam.y }; buildUI(); panel.hidden = false; over.hidden = false; renderPanel(); toast(SERVER ? 'Editor: le modifiche si salvano da sole in ritocchi.json.' : 'Editor: senza server (AVVIA.bat) le modifiche vanno scaricate a mano.'); }
    else { if (panel) panel.hidden = true; if (over) over.hidden = true; if (dirty) save(); ctx.cv.focus(); }
  }
  function onKey(e) {
    const k = e.key.toLowerCase();
    if (e.key === 'F2') { if (!window.PV_STUDIO) return; e.preventDefault(); e.stopImmediatePropagation(); toggle(); return; }   // lo Studio sta fuori dal gioco (editor.html): nel gioco solo i ritocchi
    if (!on) return;
    if (inPanel(e.target) && /input|select|textarea/i.test(e.target.tagName)) { e.stopPropagation(); if (k === 'escape') e.target.blur(); return; }
    e.preventDefault(); e.stopImmediatePropagation(); held[k] = true;
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && k === 'z') { undoRedo(e.shiftKey ? redo : undo, e.shiftKey ? undo : redo); return; }
    if (ctrl && k === 'y') { undoRedo(redo, undo); return; }
    if (ctrl && k === 's') { if (SERVER) save(); else download(); return; }
    if (ctrl && k === 'd') { duplicate(); return; }
    if (e.repeat && !['r', 'pageup', 'pagedown', '+', '-', '[', ']'].includes(k)) return;
    if (k === 'escape') { if (sel) select(null); else if (hooks.esc) hooks.esc(); else toggle(false); return; }
    if (['1', '2', '3', '4', '5'].includes(k)) { setTool(['sposta', 'pennello', 'materiale', 'timbro', 'gomma'][+k - 1]); return; }
    if (k === '[' || k === ']') { brush.size = Math.max(.02, Math.min(4, brush.size * (k === ']' ? 1.15 : 1 / 1.15))); renderPanel(); return; }
    if (tool !== 'sposta' || !sel) return;
    const step = e.altKey ? Math.PI / 180 : Math.PI / 12;
    if (k === 'r') nudge(T => { T.ry += e.shiftKey ? -step : step; });
    else if (k === 'pageup') nudge(T => { T.h += e.shiftKey ? .5 : .05; });
    else if (k === 'pagedown') nudge(T => { T.h -= e.shiftKey ? .5 : .05; });
    else if (k === '+' || k === '=') nudge(T => { T.s *= 1.05; });
    else if (k === '-') nudge(T => { T.s /= 1.05; });
    else if (k === 'delete' || k === 'backspace') remove();
  }
  function setTool(t) { tool = t; anchor = null; renderPanel(); }
  function readMouse(e) { const r = ctx.cv.getBoundingClientRect(); mouse.nx = (e.clientX - r.left) / r.width; mouse.ny = (e.clientY - r.top) / r.height; mouse.inside = e.target === ctx.cv; mouse.moved = true; }
  function onDown(e) {
    if (!on || e.target !== ctx.cv || e.button === 1) return;
    e.stopPropagation(); e.preventDefault(); readMouse(e); ctx.cv.setPointerCapture && ctx.cv.setPointerCapture(e.pointerId);
    const startPan = () => { const I = indoorNow(), y = I ? floorY() : gH(focus.x, focus.y), pl = new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), h = aim(mouse.nx, mouse.ny).intersectPlane(pl, V3()); if (h) drag = { pan: true, pl, at: h }; };
    if (e.button === 2) { startPan(); return; }
    if (e.button !== 0) return;
    if (tool === 'sposta') {
      const s = pick(mouse.nx, mouse.ny);
      if (e.detail >= 2 && hooks.dbl) { drag = null; hooks.dbl(s, mouse.nx, mouse.ny); return; }   // doppio clic: lo Studio apre la vista isolata (o entra nell'edificio)
      select(s); if (!s) { startPan(); return; }   // sul vuoto: si afferra la vista
      const T = AD[s.t].get(s), y = s.t === 'mobile' ? floorY() + T.h : gH(T.x, T.z) + T.h, pl = new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), hit = aim(mouse.nx, mouse.ny).intersectPlane(pl, V3());
      if (hit) drag = { pl, dx: T.x - hit.x, dz: T.z - hit.z, before: snap(), moved: false };
      return;
    }
    if (tool === 'timbro' && e.altKey) { takeSource(mouse.nx, mouse.ny); return; }
    if (tool === 'materiale' && e.altKey) { alignMat(mouse.nx, mouse.ny); return; }
    if (tool === 'materiale' && !mat) { toast('Materiale: prima scegline uno nel pannello.', 'bad'); return; }
    if (tool === 'timbro' && !src) { toast('Timbro: prima Alt+clic sul punto da copiare (anche su un\'altra texture).', 'bad'); return; }
    stroke = { snaps: new Map(), last: null }; paintAt(mouse.nx, mouse.ny);
  }
  function onMove(e) {
    if (!on) return; readMouse(e);
    if (drag && drag.pan) {   // la vista segue il punto afferrato
      const h = aim(mouse.nx, mouse.ny).intersectPlane(drag.pl, V3()); if (!h) return;
      const dx = drag.at.x - h.x, dz = drag.at.z - h.z; focus.x += dx; focus.y += dz; ctx.R.cam.x += dx; ctx.R.cam.y += dz; return;
    }
    if (drag && okSel(sel)) {
      const hit = aim(mouse.nx, mouse.ny).intersectPlane(drag.pl, V3()); if (!hit) return;
      const T = AD[sel.t].get(sel); let x = hit.x + drag.dx, z = hit.z + drag.dz;
      if (e.ctrlKey) { x = Math.round(x * 4) / 4; z = Math.round(z * 4) / 4; }   // Ctrl: a passi di 25 cm
      T.x = x; T.z = z; AD[sel.t].set(sel, T, false); drag.moved = true; renderPanel(true);
    }
  }
  function onUp(e) {
    if (!on) return;
    if (drag) { const d = drag; drag = null; if (!d.pan && d.moved && okSel(sel)) { const T = AD[sel.t].get(sel); AD[sel.t].set(sel, T, true); commitSel(d.before); } }
    if (stroke) { const s = stroke; stroke = null; anchor = anchor && tool === 'timbro' ? anchor : null; if (s.snaps.size) { pushUndo({ paint: [...s.snaps] }); changed(); } }
  }
  function onWheel(e) {
    if (!on || e.target !== ctx.cv || !(e.ctrlKey || e.altKey)) return;
    e.preventDefault(); e.stopPropagation(); brush.size = Math.max(.02, Math.min(4, brush.size * (e.deltaY > 0 ? 1 / 1.12 : 1.12))); renderPanel();
  }
  function cursor() { return drag && drag.pan ? 'grabbing' : tool !== 'sposta' ? 'crosshair' : drag ? 'grabbing' : hover ? 'pointer' : 'grab'; }

  // a ogni fotogramma (main.js): la camera dell'editor
  function view(dt) {
    let f = 0, s = 0; const B = ctx.R.camBasis(), sp = 16 * (ctx.ui.zoom || 1) * (held.shift ? 3 : 1) * dt;
    if (held.w || held.arrowup) f += 1; if (held.s || held.arrowdown) f -= 1; if (held.d || held.arrowright) s += 1; if (held.a || held.arrowleft) s -= 1;
    focus.x += (B.rx * s + B.fx * f) * sp; focus.y += (B.rz * s + B.fz * f) * sp;
    const I = indoorNow(); if (I) { const x0 = I.b.x * 2, y0 = I.b.y * 2; focus.x = Math.max(x0 - 4, Math.min(x0 + I.b.w * 2 + 4, focus.x)); focus.y = Math.max(y0 - 4, Math.min(y0 + I.b.h * 2 + 4, focus.y)); }
    // pittura: un passo per fotogramma, al più
    if (stroke && mouse.moved) paintAt(mouse.nx, mouse.ny);
    const tNow = performance.now(); if (mouse.moved && !drag && !stroke && tNow - (view.th || 0) > 100) { view.th = tNow; if (tool === 'sposta') hover = pick(mouse.nx, mouse.ny); else { const S = surfaceAt(mouse.nx, mouse.ny, tool === 'timbro' && held.alt); paintHover = S && !S.blocked ? S : null; } }
    if (tNow - (view.th || 0) <= 100 && mouse.moved && !drag && !stroke) {} else mouse.moved = false;
    needTex.forEach(touchTex); needTex.clear();
    queueMicrotask(drawOverlay);   // dopo R.frame: la camera è quella di questo fotogramma
    return { focus, rot: (held.e ? 1 : 0) - (held.q ? 1 : 0) };
  }

  // =====================================================================================================
  // DISEGNO SOPRA LA SCENA: scatole della selezione, cerchio del pennello
  // =====================================================================================================
  function drawOverlay() {
    if (!on || !over) return;
    const r = ctx.cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    if (over.width !== Math.round(r.width * dpr) || over.height !== Math.round(r.height * dpr)) { over.width = Math.round(r.width * dpr); over.height = Math.round(r.height * dpr); }
    Object.assign(over.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    const x = over.getContext('2d'), W = over.width, H = over.height, cam = E.camera; x.clearRect(0, 0, W, H);
    const P = v => { VC.copy(v).project(cam); return [(VC.x + 1) / 2 * W, (1 - VC.y) / 2 * H, VC.z < 1]; };
    const box = (s, col, lw) => {
      if (!okSel(s)) return; const b = AD[s.t].box(s); if (b.isEmpty()) return; const mn = b.min, mx = b.max, C = [];
      for (let i = 0; i < 8; i++) C.push(P(VA.set(i & 1 ? mx.x : mn.x, i & 2 ? mx.y : mn.y, i & 4 ? mx.z : mn.z)));
      if (C.some(c => !c[2])) return;
      x.strokeStyle = col; x.lineWidth = lw * dpr; x.beginPath();
      [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([a, b2]) => { x.moveTo(C[a][0], C[a][1]); x.lineTo(C[b2][0], C[b2][1]); }); x.stroke();
      return C;
    };
    if (tool === 'sposta') {
      if (hover && (!sel || !same(hover, sel))) box(hover, 'rgba(240,230,208,.55)', 1);
      const C = sel && box(sel, '#ffb35c', 2);
      if (C) { const top = C.reduce((a, c) => c[1] < a[1] ? c : a, C[0]); x.font = (11 * dpr) + 'px Silkscreen, monospace'; x.fillStyle = '#ffb35c'; x.fillText(AD[sel.t].name(sel), top[0] + 6 * dpr, top[1] - 6 * dpr); }
    } else if (paintHover) {
      const S = paintHover, cr = VB.setFromMatrixColumn(cam.matrixWorld, 0).normalize().multiplyScalar(brush.size).add(S.point);
      const a = P(S.point), b = P(cr), rad = Math.hypot(b[0] - a[0], b[1] - a[1]);
      x.lineWidth = 1.5 * dpr; x.strokeStyle = tool === 'gomma' ? '#8fb0ff' : tool === 'timbro' ? '#35e6ff' : tool === 'materiale' ? '#ffd23b' : brush.color;
      x.beginPath(); x.arc(a[0], a[1], rad, 0, 6.2832); x.stroke(); x.strokeStyle = 'rgba(0,0,0,.6)'; x.beginPath(); x.arc(a[0], a[1], rad + dpr, 0, 6.2832); x.stroke();
      if (tool === 'timbro' && src && src.p) {   // dove pesca il timbro (se la superficie è la stessa, è esatto)
        const q = anchor && anchor.p ? VA.copy(src.p).add(VB.subVectors(S.point, anchor.p)) : src.p, s2 = P(q);
        if (s2[2]) { x.strokeStyle = '#35e6ff'; x.lineWidth = 1.5 * dpr; x.beginPath(); x.moveTo(s2[0] - 7 * dpr, s2[1]); x.lineTo(s2[0] + 7 * dpr, s2[1]); x.moveTo(s2[0], s2[1] - 7 * dpr); x.lineTo(s2[0], s2[1] + 7 * dpr); x.stroke(); }
      }
    }
  }
  const same = (a, b) => a.t === b.t && (a.t === 'verde' ? a.key === b.key : a.t === 'fuori' ? a.rec === b.rec : a.t === 'copia' ? a.c === b.c : a.bk === b.bk && a.f === b.f && a.key === b.key && a.entry === b.entry);

  // =====================================================================================================
  // PANNELLO
  // =====================================================================================================
  const CSS = `#edp{position:fixed;right:10px;top:var(--edtop,10px);width:300px;max-height:calc(100vh - var(--edtop,10px) - 10px);overflow:auto;z-index:60;background:var(--panel-solid,#15112a);border:1px solid var(--line,#3b3252);color:var(--fg,#f0e6d0);font:13px/1.35 var(--f-pix,system-ui);padding:10px 12px;box-shadow:0 6px 24px rgba(0,0,0,.5);user-select:none}
#edp h4{margin:0 0 6px;font:11px var(--f-label,monospace);letter-spacing:.06em;text-transform:uppercase;color:var(--amber,#ffb35c);display:flex;justify-content:space-between;gap:6px}
#edp .st{font-size:11px;color:var(--muted,#a89fbd);margin-bottom:8px}#edp .st.bad{color:var(--blood,#ff5a5a)}#edp .st.ok{color:var(--good,#7ee0a0)}
#edp .tools{display:grid;grid-template-columns:repeat(5,1fr);gap:3px;margin-bottom:10px}#edp .tools button{padding:4px 2px;font-size:11px}#edp .mats{display:flex;flex-wrap:wrap;gap:3px;margin:3px 0 6px}#edp .mats canvas{width:34px;height:34px;border:1px solid var(--line,#3b3252);cursor:pointer;image-rendering:pixelated}#edp .mats canvas.on{border-color:#ffd23b;outline:1px solid #ffd23b}#edp .grp{font:10px var(--f-label,monospace);color:var(--muted,#a89fbd);text-transform:uppercase;margin-top:4px}
#edp button{font:inherit;font-size:12px;color:inherit;background:#221b38;border:1px solid var(--line,#3b3252);padding:4px 6px;cursor:pointer}#edp button:hover{border-color:var(--amber,#ffb35c)}#edp button.on{background:var(--amber,#ffb35c);color:#1a1226;border-color:var(--amber,#ffb35c)}
#edp .row{display:grid;grid-template-columns:78px 1fr;gap:6px;align-items:center;margin:3px 0}#edp label{font-size:12px;color:var(--muted,#a89fbd)}
#edp input[type=number],#edp input[type=search]{width:100%;box-sizing:border-box;font:inherit;font-size:12px;background:#0d0b1a;color:inherit;border:1px solid var(--line,#3b3252);padding:3px 5px}
#edp input[type=range]{width:100%}#edp .btns{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0}
#edp .sec{border-top:1px solid var(--line,#3b3252);padding-top:8px;margin-top:8px}#edp .hint{font-size:11px;color:var(--muted,#a89fbd);margin:4px 0}
#edp .list{max-height:150px;overflow:auto;border:1px solid var(--line,#3b3252);margin-top:4px}#edp .list div{padding:2px 6px;cursor:pointer;font-size:12px}#edp .list div:hover{background:#2c2346}
#edp .srcs{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}#edp .srcs canvas{width:40px;height:40px;border:1px solid var(--line,#3b3252);cursor:pointer;image-rendering:pixelated}#edp .srcs canvas.on{border-color:#35e6ff}
#edp .big{width:100%;border:1px solid var(--line,#3b3252);cursor:crosshair;image-rendering:pixelated;background:#000}
#edp kbd{font:10px var(--f-label,monospace);border:1px solid var(--line,#3b3252);padding:0 3px}#edov{position:fixed;pointer-events:none;z-index:55}`;
  function buildUI() {
    if (panel) return;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    panel = document.createElement('div'); panel.id = 'edp'; panel.hidden = true; document.body.appendChild(panel);
    over = document.createElement('canvas'); over.id = 'edov'; over.hidden = true; document.body.appendChild(over);
    panel.addEventListener('pointerdown', e => e.stopPropagation());
  }
  function status() {
    if (!panel) return; const el = panel.querySelector('.st'); if (!el) return;
    let t, k = '';
    if (!SERVER) { t = 'Niente server: le modifiche restano qui finché non le scarichi (Ctrl+S). Con AVVIA.bat si salvano da sole.'; k = 'bad'; }
    else if (lastErr) { t = 'Errore nel salvare: ' + lastErr; k = 'bad'; }
    else if (saving || (dirty && saveT)) t = 'Salvo…';
    else if (lastSaved) { t = 'Salvato in ritocchi.json ✓'; k = 'ok'; }
    else t = 'Si salva da solo in ritocchi.json.';
    el.textContent = t; el.className = 'st ' + k;
  }
  let lastPanel = 0;
  function renderPanel(light) {
    if (!panel || panel.hidden) return;
    if (light) { const n = performance.now(); if (n - lastPanel < 120) return; lastPanel = n; }
    const I = indoorNow(), n = Object.keys(RIT.fuori).length + RIT.copie.length + Object.values(RIT.interni).reduce((a, B) => a + Object.values(B.piani || {}).reduce((q, P) => q + Object.keys(P.mobili || {}).length + (P.nuovi || []).length, 0), 0);
    const where = I ? `Dentro: ${esc(I.b.name || I.b.use || 'edificio')} · ${esc(ctx.G.INT.floorLabel ? ctx.G.INT.floorLabel(I.f) : 'piano ' + I.f)}` : 'Fuori';
    let h = `<h4><span>${STUDIO ? 'Strumenti' : 'Editor · F2'}</span><span>${where}</span></h4><div class="st"></div>
      <div class="tools">${[['sposta', 'Sposta', 1], ['pennello', 'Colore', 2], ['materiale', 'Materiale', 3], ['timbro', 'Timbro', 4], ['gomma', 'Gomma', 5]].map(([k, l, i]) => `<button data-tool="${k}" class="${tool === k ? 'on' : ''}" title="${i}">${l}</button>`).join('')}</div>`;
    if (tool === 'sposta') {
      if (okSel(sel)) {
        const T = AD[sel.t].get(sel), f = (k, l, v, st) => `<div class="row"><label>${l}</label><input type="number" data-f="${k}" step="${st}" value="${v}"></div>`;
        h += `<div><b>${esc(AD[sel.t].name(sel))}</b></div>` + f('x', 'X (m)', T.x.toFixed(2), .1) + f('z', 'Y (m)', T.z.toFixed(2), .1) + f('h', 'Altezza', T.h.toFixed(2), .05) + f('ry', 'Rotazione °', (T.ry * 180 / Math.PI).toFixed(1), 15) + f('s', 'Scala', T.s.toFixed(2), .05);
        h += `<div class="btns"><button data-a="dup">Duplica <kbd>Ctrl+D</kbd></button><button data-a="del">Togli <kbd>Canc</kbd></button>${(sel.t === 'fuori' || sel.t === 'verde' || (sel.t === 'mobile' && sel.key)) ? '<button data-a="rev">Com\'era</button>' : ''}</div>
          <div class="hint">Trascina per spostare (Ctrl: a passi di 25 cm) · <kbd>R</kbd> ruota 15° (Maiusc al contrario, Alt 1°) · <kbd>PagSu</kbd>/<kbd>PagGiù</kbd> altezza · <kbd>+</kbd>/<kbd>−</kbd> scala</div>`;
        if (sel.t === 'fuori') h += `<div class="hint">Si muove solo il disegno: chi cammina sbatte ancora dove l'oggetto era nato (se era un ingombro).</div>`;
      } else h += `<div class="hint">Clic su un oggetto per prenderlo. ${I ? 'Qui dentro: i mobili.' : 'Fuori: arredo di strada, alberi e cespugli, e i dettagli delle case uno per uno (condizionatori, antenne, cisterne, insegne, manifesti, scatole…). Per i mobili entra in un edificio.'}</div>`;
      if (I) h += `<div class="sec"><h4>Aggiungi un mobile</h4><input type="search" id="edq" placeholder="cerca (letto, sedia, ia_…)"><div class="list" id="edl"></div><div class="hint">Compare al centro della vista.</div></div>`;
      if ((RIT.files || []).length) h += `<div class="sec"><h4>Posa un modello caricato</h4><div class="list">${RIT.files.map(f => `<div data-posa="glb:${esc(f.file)}">${esc(f.nome || f.file)}</div>`).join('')}</div><div class="hint">Compare al centro della vista${I ? ', sul pavimento' : ''}.</div></div>`;
    } else {
      h += `<div class="row"><label>Grandezza</label><input type="range" data-b="size" min="0.02" max="3" step="0.01" value="${brush.size}"></div>
        <div class="row"><label>Durezza</label><input type="range" data-b="hard" min="0" max="1" step="0.01" value="${brush.hard}"></div>
        <div class="row"><label>Opacità</label><input type="range" data-b="opac" min="0.02" max="1" step="0.01" value="${brush.opac}"></div>`;
      if (tool === 'pennello') h += `<div class="row"><label>Colore</label><input type="color" data-b="color" value="${brush.color}"></div>`;
      if (tool === 'materiale') {
        h += `<div class="hint">Il materiale si ripete agganciato al mondo: le piastrelle restano in fila fra un tratto e l'altro. <kbd>Alt</kbd>+clic: l'angolo di una piastrella va lì.</div>`;
        if (mat) h += `<div class="row"><label>Scala</label><input type="range" data-m="sc" min="0.25" max="4" step="0.05" value="${mat.sc || 1}"></div>
          <div class="btns"><button data-mm="rot" class="${mat.rot ? 'on' : ''}">Ruota 90°</button><button data-mm="l">◀</button><button data-mm="r">▶</button><button data-mm="u">▲</button><button data-mm="d">▼</button><button data-mm="0">Scala 1</button></div>`;
        let g0 = ''; h += '<div id="edmats">'; library().forEach((m, i) => { if (m.gruppo !== g0) { if (g0) h += '</div>'; g0 = m.gruppo; h += `<div class="grp">${esc(g0)}</div><div class="mats">`; } h += `<canvas data-mat="${i}" title="${esc(m.nome)}" class="${m === mat ? 'on' : ''}"></canvas>`; }); h += '</div></div>';
        h += `<div class="hint">Per farne uno da una texture del mondo: Timbro, Alt+clic sulla texture, trascina un riquadro nell'anteprima, poi «Usa come materiale».</div>`;
      }
      if (tool === 'timbro') {
        h += `<div class="hint"><kbd>Alt</kbd>+clic dove prendere (anche su un'altra texture, anche dentro e fuori), poi dipingi: copia seguendo il pennello, alla stessa scala in metri.</div>`;
        if (src) h += `<canvas class="big" id="edbig" title="clic: sposta il punto da cui prende · trascina: scegli un riquadro"></canvas><div class="btns"><button data-a="mat">Usa come materiale${srcRect ? ' (riquadro)' : ''}</button>${srcRect ? '<button data-a="norect">Tutta la texture</button>' : ''}</div>`;
        if (SRCS.length) h += `<div class="hint">Campionario (clic per riprendere):</div><div class="srcs" id="edsrcs"></div>`;
      }
      if (tool === 'gomma') h += `<div class="hint">Riporta la texture a come l'aveva disegnata il gioco.</div>`;
      h += `<div class="hint"><kbd>[</kbd> <kbd>]</kbd> o Ctrl+rotella: grandezza · si dipinge solo sulle texture disegnate dal gioco (non sui modelli del kit) · una texture usata da più oggetti cambia dappertutto.</div>`;
    }
    h += `<div class="sec btns"><button data-a="undo">Annulla <kbd>Ctrl+Z</kbd></button><button data-a="redo">Rifai</button><button data-a="save">${SERVER ? 'Salva ora' : 'Scarica'} <kbd>Ctrl+S</kbd></button></div>
      <div class="hint">${n} ritocchi agli oggetti · ${Object.keys(RIT.pittura).length + [...DIRTYC].filter(c => !RIT.pittura[c.__pvKey]).length} texture dipinte</div>
      <div class="hint"><kbd>WASD</kbd> o trascina col tasto destro (o col sinistro sul vuoto): muovi la vista (Maiusc veloce) · <kbd>Q</kbd>/<kbd>E</kbd> gira · rotella zoom · <kbd>Esc</kbd> lascia${STUDIO ? ' · doppio clic: il modello da solo (sull\'edificio: entri)' : ' · <kbd>F2</kbd> esci'}</div>`;
    panel.innerHTML = h; status();
    panel.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => setTool(b.dataset.tool));
    panel.querySelectorAll('[data-posa]').forEach(d => d.onclick = () => posa(d.dataset.posa));
    panel.querySelectorAll('[data-a]').forEach(b => b.onclick = () => ({ dup: duplicate, del: remove, rev: revert, undo: () => undoRedo(undo, redo), redo: () => undoRedo(redo, undo), save: () => SERVER ? save() : download(), mat: matFromSource, norect: () => { srcRect = null; renderPanel(); } })[b.dataset.a]());
    panel.querySelectorAll('[data-f]').forEach(inp => inp.onchange = () => { if (!okSel(sel)) return; const v = parseFloat(inp.value); if (!isFinite(v)) return; const before = snap(), T = AD[sel.t].get(sel), k = inp.dataset.f; T[k] = k === 'ry' ? v * Math.PI / 180 : k === 's' ? Math.max(.05, v) : v; AD[sel.t].set(sel, T, true); commitSel(before); });
    panel.querySelectorAll('[data-b]').forEach(inp => inp.oninput = () => { brush[inp.dataset.b] = inp.type === 'color' ? inp.value : parseFloat(inp.value); });
    const q = panel.querySelector('#edq');
    if (q) { const list = panel.querySelector('#edl'), F = ctx.G.INT.FNAME || {}, all = furnIds(); const fill = () => { const s = q.value.trim().toLowerCase(); list.innerHTML = all.filter(id => !s || id.toLowerCase().includes(s) || (F[id] || '').toLowerCase().includes(s)).slice(0, 120).map(id => `<div data-id="${esc(id)}">${esc(F[id] ? F[id] + ' · ' + id : id)}</div>`).join(''); list.querySelectorAll('div').forEach(d => d.onclick = () => addFurn(d.dataset.id)); }; q.oninput = fill; fill(); }
    const big = panel.querySelector('#edbig');
    if (big && src) {
      const im = src.img, s = Math.min(1, 512 / Math.max(im.width, im.height)); big.width = Math.max(1, Math.round(im.width * s)); big.height = Math.max(1, Math.round(im.height * s));
      const bx = big.getContext('2d'); bx.imageSmoothingEnabled = false; bx.drawImage(im, 0, 0, big.width, big.height);
      bx.strokeStyle = '#35e6ff'; bx.lineWidth = 2; bx.beginPath(); bx.arc(src.x * s, src.y * s, Math.max(3, brush.size * src.dens * s), 0, 6.2832); bx.stroke();
      if (srcRect) { bx.strokeStyle = '#ffd23b'; bx.lineWidth = 1; bx.strokeRect(srcRect.x * s + .5, srcRect.y * s + .5, srcRect.w * s, srcRect.h * s); }
      const at = e => { const r = big.getBoundingClientRect(); return [Math.max(0, Math.min(im.width, Math.round((e.clientX - r.left) / r.width * im.width))), Math.max(0, Math.min(im.height, Math.round((e.clientY - r.top) / r.height * im.height)))]; };
      let d0 = null;
      big.onpointerdown = e => { d0 = at(e); big.setPointerCapture(e.pointerId); };
      big.onpointermove = e => { if (!d0) return; const p = at(e); if (Math.abs(p[0] - d0[0]) + Math.abs(p[1] - d0[1]) < 2) return; const q = { x: Math.min(d0[0], p[0]), y: Math.min(d0[1], p[1]), w: Math.abs(p[0] - d0[0]), h: Math.abs(p[1] - d0[1]) };
        bx.drawImage(im, 0, 0, big.width, big.height); bx.strokeStyle = '#ffd23b'; bx.lineWidth = 1; bx.strokeRect(q.x * s + .5, q.y * s + .5, q.w * s, q.h * s); big._q = q; };
      big.onpointerup = e => { const p = at(e); if (big._q && big._q.w >= 2 && big._q.h >= 2) { srcRect = big._q; big._q = null; } else if (d0) { src.x = p[0]; src.y = p[1]; src.p = null; anchor = null; } d0 = null; renderPanel(); };
    }
    const ml = panel.querySelector('#edmats');
    if (ml) { const L = library(); ml.querySelectorAll('canvas').forEach(cv => { const m = L[+cv.dataset.mat]; cv.width = cv.height = 34; const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; const z = Math.min(m.c.width, m.c.height, 64); g.drawImage(m.c, 0, 0, z, z, 0, 0, 34, 34); cv.onclick = () => { mat = m; renderPanel(); }; }); }
    panel.querySelectorAll('[data-m]').forEach(inp => inp.oninput = () => { if (mat) mat[inp.dataset.m] = parseFloat(inp.value); });
    panel.querySelectorAll('[data-mm]').forEach(b => b.onclick = () => { if (!mat) return; const k = b.dataset.mm; if (k === 'rot') mat.rot = mat.rot ? 0 : 1; else if (k === '0') mat.sc = 1; else { mat.ox = (mat.ox || 0) + (k === 'l' ? 1 : k === 'r' ? -1 : 0); mat.oy = (mat.oy || 0) + (k === 'u' ? 1 : k === 'd' ? -1 : 0); } renderPanel(); });
    const ss = panel.querySelector('#edsrcs');
    if (ss) SRCS.forEach(S0 => { const c = document.createElement('canvas'); c.width = c.height = 40; c.getContext('2d').drawImage(S0.img, 0, 0, 40, 40); if (src && src.img === S0.img) c.className = 'on'; c.onclick = () => { src = { img: S0.img, x: S0.img.width / 2, y: S0.img.height / 2, dens: S0.dens, p: null }; anchor = null; srcRect = null; renderPanel(); }; ss.appendChild(c); });
  }

  // i tasti e il mouse dell'editor passano per primi: registrati qui, prima dei pannelli del gioco (zaino, tasche, cantiere…) che usano gli stessi tasti
  addEventListener('keydown', e => { if (ctx) onKey(e); }, true); addEventListener('keyup', e => { held[e.key.toLowerCase()] = false; }, true);
  addEventListener('pointerdown', e => { if (ctx) onDown(e); }, true); addEventListener('pointermove', e => { if (ctx) onMove(e); }, true); addEventListener('pointerup', e => { if (ctx) onUp(e); }, true);
  addEventListener('wheel', e => { if (ctx) onWheel(e); }, { capture: true, passive: false });
  addEventListener('blur', () => { for (const k in held) held[k] = false; });
  addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  // ---------------- per lo Studio (editor.html) ----------------
  const STUDIO = !!window.PV_STUDIO, hooks = {};
  // posa un modello dove guarda la vista: fuori diventa una copia, dentro un mobile nuovo
  function posa(key) {
    const I = indoorNow(), id = /^mobile:/.test(key) ? key.slice(7) : key;
    if (I) { addFurn(id); return; }
    let made = null; edit(() => { made = { mod: key, pos: [r3(focus.x), r3(gH(focus.x, focus.y)), r3(focus.y)], ry: 0, s: 1 }; RIT.copie.push(made); });
    const c = COPIES.find(k => k.e === made); if (c) select({ t: 'copia', c }); toast('Posato: trascinalo dove vuoi.');
  }
  function setModel(key, entry) { edit(() => { if (entry) RIT.modelli[key] = entry; else delete RIT.modelli[key]; }); if (/^strada:/.test(key) && window.Officina) Officina.setStrada(true); if (indoorNow()) E.rebuildIndoor(); }
  function setVestito(id, v) { edit(() => { if (v) RIT.vestiti[id] = v; else delete RIT.vestiti[id]; }); if (window.Officina) Officina.patchCapi(); }
  function addFile(f) { edit(() => { RIT.files = (RIT.files || []).filter(x => x.file !== f.file); RIT.files.push(f); }); }
  function setFocus(x, y) { focus = { x, y }; }
  // lo Studio mette in pausa l'editor quando si è nell'hangar
  function suspend(v) { on = !v; sel = null; hover = null; drag = null; stroke = null; if (panel) panel.hidden = v; if (over) over.hidden = v; if (!v) renderPanel(); }
  // la chiave del modello di quello che è selezionato (per la vista isolata)
  function modelKey(s) {
    if (!s) return null; const strada = rec => { const o = window.Officina && Officina.orig(rec.obj); return o ? 'strada:' + Officina.sig(o) : null; };
    if (s.t === 'verde') return null;
    if (s.t === 'fuori') return strada(s.rec);
    if (s.t === 'copia') return s.c.e.mod || (KEYS.get(s.c.e.da) ? strada(KEYS.get(s.c.e.da)) : null);
    const o = furnOf(s); return o ? (/^(glb|kit|pezzi|bottino):/.test(o.id) ? o.id : 'mobile:' + o.id) : null;
  }
  return { suspend, modelKey, annulla: () => undoRedo(undo, redo), rifai: () => undoRedo(redo, undo), posa, setModel, setVestito, addFile, setFocus, hooks, get focus() { return focus; }, get server() { return SERVER; }, get selection() { return sel; }, deselect: () => select(null), render: () => renderPanel(),
    load, attach, reapply, active: () => on, view, cursor, toggle, get ritocchi() { return RIT; }, _t: { pick, select, AD, KEYS, surfaceAt, paintAt, setTool, applyAll, keyOf, save, get sel() { return sel; }, get stroke() { return stroke; }, set stroke(v) { stroke = v; }, set src(v) { src = v; }, brush, library, matMap, inInit, get undo() { return undo; }, get redo() { return redo; }, set mat(v) { mat = v; }, get mat() { return mat; } } };
})();
