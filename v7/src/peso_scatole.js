/* Porto Vecchio — [ottimizza-gpu] il frustum a scatole e i pezzi troppo lunghi (ANALISI_OTTIMIZZAZIONE_GPU.md §2) (v7).
   Due lavori, tutti e due a parità d'immagine (si scarta solo quello che non ha pixel):

   1. LE SCATOLE. three r149 prova il frustum con la sfera della geometria. La camera di gioco è alta e inclinata: oltre ~80 m il bordo alto
      dello schermo è già sopra le case, ma la sfera di un settore di tasselli di 48 m sporge 35 m in alto e passa. In tre punti della città
      0,3-0,6 M triangoli a fotogramma erano disegnati senza un pixel (strumenti/sonda_gpu.js). Qui, a chi passa la prova della sfera e ha un
      raggio di almeno P.rMin metri, si fa anche quella della scatola di mondo (la scatola della geometria portata nel mondo, allargata di P.pad
      per i vertici che lo shader muove: vento, stoffe). Per le istanze la scatola si fa dalle matrici delle istanze (se la pagina le ha ancora).
      La scatola contiene tutti i triangoli: se è fuori, nessun triangolo è dentro. Vale anche per le camere delle ombre.
   2. LA FERROVIA intera (writing.js track: due mesh da 39.200 triangoli col raggio di 339 m, sempre «in vista», anche nell'ombra) si taglia in
      settori di P.cella metri: un pezzo per settore con lo stesso materiale, gli stessi attributi (condivisi: niente memoria in più sulla
      scheda video) e un indice suo. L'originale resta per i raggi (visible = false: non si disegna, i raggi lo vedono lo stesso).
   window.__gpuScatole = false (o ?noscatole) spegne tutti e due dal vivo (le sonde: strumenti/sonda_uguale_gpu.js).                     */
var PesoScatole = (function () {
  'use strict';
  const Q = typeof location !== 'undefined' ? location.search : '';
  const ON = !/[?&]noscatole\b/.test(Q);
  const P = { rMin: 6, pad: .5, cella: 48, lungo: 120, nomi: ['ferrovia'] };
  const ST = { prove: 0, scartate: 0, tagliati: 0, pezzi: 0 };
  if (typeof window !== 'undefined') window.__gpuScatole = ON;
  let T3 = null, pronto = false, B = null, V = null, M = null;
  function installa() {
    T3 = window.THREE; B = new T3.Box3(); V = new T3.Vector3(); M = new T3.Matrix4();
    const io = T3.Frustum.prototype.intersectsObject;
    T3.Frustum.prototype.intersectsObject = function (o) { return io.call(this, o) && prova(this, o); };   // (peso_lontano, che fa la sua sfera senza chiamare questa, chiama prova)
    pronto = true;
  }
  // la prova della scatola dopo quella della sfera (true: dentro, o niente scatola)
  function prova(fr, o) {
    if (!window.__gpuScatole || !pronto) return true;
    const wb = scatola(o); if (!wb) return true;
    ST.prove++; if (fr.intersectsBox(wb)) return true; ST.scartate++; return false; }
  const uguale = (a, b) => { for (let i = 0; i < 16; i++) if (a[i] !== b[i]) return false; return true; };
  // la scatola di mondo di un oggetto (in cache finché non cambiano matrice, geometria, istanze); null: niente prova (resta la sfera)
  function scatola(o) {
    const g = o.geometry; if (!g || o.isSkinnedMesh || o.isSprite || (g.morphAttributes && g.morphAttributes.position)) return null;
    const bs = g.boundingSphere; if (!bs || bs.radius < P.rMin) return null;
    const C = o.__gsC, me = o.matrixWorld.elements, im = o.isInstancedMesh ? o.instanceMatrix : null;
    if (C && C.g === g && C.bb === g.boundingBox && (!im || (C.iv === im.version && C.n === o.count)) && uguale(C.m, me)) return C.box;
    let lb = null;
    if (im) {   // le istanze: i centri delle copie ± il raggio della forma per la scala più grande della copia
      const a = im.array, n = o.count; if (!a || a.length < n * 16 || !n) return null;
      if (!g.boundingSphere) return null; const r0 = (o.__gsR0 !== undefined && o.__gsG0 === g) ? o.__gsR0 : null;
      // il raggio della forma: dalla scatola della geometria se c'è (la sfera di queste geometrie è spesso quella di tutto il gruppo)
      let rf = r0; if (rf === null) { const gb = g.boundingBox || (posOk(g) ? (g.computeBoundingBox(), g.boundingBox) : null); if (!gb || gb.isEmpty()) return null; rf = Math.max(gb.min.length(), gb.max.length()); o.__gsR0 = rf; o.__gsG0 = g; }
      lb = new T3.Box3();
      for (let k = 0; k < n; k++) { const j = k * 16, sx = Math.hypot(a[j], a[j + 1], a[j + 2]), sy = Math.hypot(a[j + 4], a[j + 5], a[j + 6]), sz = Math.hypot(a[j + 8], a[j + 9], a[j + 10]), r = rf * Math.max(sx, sy, sz);
        if (!(r > 0)) continue; lb.expandByPoint(V.set(a[j + 12] - r, a[j + 13] - r, a[j + 14] - r)); lb.expandByPoint(V.set(a[j + 12] + r, a[j + 13] + r, a[j + 14] + r)); }
      if (lb.isEmpty()) { lb.set(V.set(0, 0, 0), V.clone()); }   // nessuna copia visibile: un punto (la sfera dirà il resto)
    } else {
      lb = g.boundingBox; if (!lb) { if (!posOk(g)) return null; g.computeBoundingBox(); lb = g.boundingBox; }
      if (!lb || lb.isEmpty()) return null;
    }
    const box = (C && C.box) || new T3.Box3(); box.copy(lb).applyMatrix4(o.matrixWorld).expandByScalar(P.pad);
    o.__gsC = { g, bb: g.boundingBox, iv: im ? im.version : 0, n: o.count, m: Float64Array.from(me), box };
    return box;
  }
  // la posizione è ancora tutta in memoria (dopo l'invio alcune geometrie la svuotano: la scatola verrebbe vuota)
  function posOk(g) { const p = g.attributes && g.attributes.position; return !!(p && p.count && p.array && p.array.length >= p.count * p.itemSize); }

  // 2. i pezzi troppo lunghi, tagliati a settori
  function taglia(o) {
    const g = o.geometry, pos = g.attributes.position; if (!posOk(g)) return 0;
    const idx = g.index ? g.index.array : null, nt = Math.floor((idx ? idx.length : pos.count) / 3); if (nt < 64) return 0;
    o.updateWorldMatrix(true, false); const mw = o.matrixWorld, celle = new Map();
    const vi = k => idx ? idx[k] : k;
    for (let t = 0; t < nt; t++) { let x = 0, z = 0;
      for (let c = 0; c < 3; c++) { V.fromBufferAttribute(pos, vi(t * 3 + c)).applyMatrix4(mw); x += V.x; z += V.z; }
      const key = Math.floor(x / 3 / P.cella) + ',' + Math.floor(z / 3 / P.cella); let L = celle.get(key); if (!L) celle.set(key, L = []); L.push(t); }
    if (celle.size < 2) return 0;
    const par = o.parent; let n = 0;
    celle.forEach(L => {
      const ng = new T3.BufferGeometry(); for (const k in g.attributes) ng.setAttribute(k, g.attributes[k]);   // gli stessi attributi: la scheda video li carica una volta
      const big = pos.count > 65535, I = big ? new Uint32Array(L.length * 3) : new Uint16Array(L.length * 3);
      const bb = new T3.Box3(); L.forEach((t, j) => { for (let c = 0; c < 3; c++) { const v = vi(t * 3 + c); I[j * 3 + c] = v; bb.expandByPoint(V.fromBufferAttribute(pos, v)); } });
      ng.setIndex(new T3.BufferAttribute(I, 1)); ng.boundingBox = bb; ng.boundingSphere = bb.getBoundingSphere(new T3.Sphere());
      const m = new T3.Mesh(ng, o.material); m.name = (o.name || 'pezzo') + '_settore'; m.position.copy(o.position); m.quaternion.copy(o.quaternion); m.scale.copy(o.scale);
      m.castShadow = o.castShadow; m.receiveShadow = o.receiveShadow; m.renderOrder = o.renderOrder; m.layers.mask = o.layers.mask; m.frustumCulled = true;
      m.raycast = () => { }; m.userData.pesoScatole = true; m.matrixAutoUpdate = o.matrixAutoUpdate; m.updateMatrix(); par.add(m); n++; });
    o.userData.pesoScatoleSettori = par.children.slice(-n); o.visible = false; ST.tagliati++; ST.pezzi += n; return n;
  }
  function tagliaLunghi(scene) {
    for (const top of scene.children) { if (!P.nomi.includes(top.name) || top.userData.pesoScatoleFatto) continue; top.userData.pesoScatoleFatto = true;
      const cand = []; top.traverse(o => { if (o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh && o.visible && o.frustumCulled && !o.userData.pesoScatole && o.geometry && !(o.geometry.morphAttributes && o.geometry.morphAttributes.position)) { const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); if (g.boundingSphere && g.boundingSphere.radius > P.lungo) cand.push(o); } });
      cand.forEach(taglia); }
  }
  // dal vivo: spenta, la ferrovia torna intera (e i settori si nascondono)
  let statoTaglio = true;
  function seguiInterruttore(scene) {
    const on = !!window.__gpuScatole; if (on === statoTaglio) return; statoTaglio = on;
    scene.traverse(o => { const S = o.userData && o.userData.pesoScatoleSettori; if (!S) return; o.visible = !on; S.forEach(m => { m.visible = on; }); });
  }
  let fr = 0;
  function prima(K) {
    if (!ON || !K || !K.scene) return; if (!pronto) installa();
    seguiInterruttore(K.scene);
    if ((fr++ % 60) === 0 && window.__gpuScatole) tagliaLunghi(K.scene);   // la ferrovia arriva quando writing.js la costruisce
  }
  if (ON && typeof window !== 'undefined' && window.THREE) installa();
  const conto = () => Object.assign({ on: ON, attivo: typeof window !== 'undefined' && !!window.__gpuScatole }, ST);
  if (typeof window !== 'undefined') window.__pesoScatole = conto;
  return { prima, prova, conto, P, interruttore: seguiInterruttore };
})();
