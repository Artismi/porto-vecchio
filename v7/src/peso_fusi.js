/* Porto Vecchio — [fusi] i settori e le ombre fuse (v7).
   Due lavori, tutti e due fuori dai dati del gioco (nessun oggetto cambia posto, nessuna geometria del gioco cambia):

   1. I SETTORI. three prova il frustum oggetto per oggetto: nel borgo ~8.800 prove a fotogramma nel passaggio principale, su ~10.000 rami
      figli della scena, quasi tutti fermi e quasi tutti fuori dalla camera. Qui i rami congelati (render.js FRZ: fermi da 10 s, le loro
      matrici non si rifanno) si raccolgono in celle di P.cella metri, con la sfera che li contiene tutti. A ogni fotogramma si prova la
      sfera della cella; i rami delle celle fuori dalla camera, nel solo passaggio principale, non si visitano nemmeno (la lista dei figli
      della scena si accorcia per la proiezione e torna intera prima delle ombre, in renderList.finish). Chi è in una cella dentro o a
      cavallo fa la prova di sempre. Stesso disegno: un ramo fuori dalla sfera della sua cella non poteva passare la sua prova.
      Restano fuori dalle celle (prova di sempre) i rami con qualcosa che three disegna sempre (frustumCulled spento), le istanze, i LOD,
      gli scheletri e chi ha una prova sua (peso_gente, instCull). ?nosettori lo spegne.

   2. LE OMBRE FUSE. Nell'ombra si ridisegnano a ogni ripresa le cose che si muovono (peso_ombre.js): il treno della miniera (~530 pezzi
      che fanno ombra), i mezzi (~30-45 pezzi l'uno), le barche. Erano 350-800 disegni d'ombra a fotogramma nel borgo. Ma i pezzi di un
      vagone o di un'auto si muovono insieme: per ogni gruppo rigido (i pezzi che restano fermi rispetto a un genitore comune) e per lato
      dell'ombra si fa una sagoma sola, gli stessi triangoli nelle coordinate del genitore, che fa ombra al posto dei pezzi (castShadow
      spento sui pezzi, la sagoma invisibile alla camera). La mappa d'ombra è la stessa: stessi triangoli, stessa profondità.
      Chi è rigido si scopre guardando: per P.oss fotogrammi si confrontano posizione, rotazione, scala e visibilità di ogni nodo; chi
      cambia (le ruote che girano, i livelli dei LOD, le porte, i carrelli in curva) fa gruppo a sé. E a ogni fotogramma si riguarda ogni
      pezzo fuso: se un nodo della sua catena si muove, cambia visibilità, geometria, materiale o ombra, la sagoma si scioglie subito
      (i pezzi tornano a fare ombra da soli) e si rifà più tardi senza quel nodo. Persone e scheletri non si toccano. ?noombrefuse la spegne.
   ?nofusi spegne tutti e due.                                                                                                           */
var PesoFusi = (function () {
  'use strict';
  const Q = typeof location !== 'undefined' ? location.search : '';
  const ON = !/[?&]nofusi\b/.test(Q), SETT = ON && !/[?&]nosettori\b/.test(Q), OMB = ON && !/[?&]noombrefuse\b/.test(Q);
  const P = { cella: 32, margine: 2, grande: 48, mezziOgni: 120, giro: 150, oss: 90, passo: 30, vicino: 160, pausa: 120, riprova: 600, scansione: 60, min: 2, sciolte: 6 };
  const ST = { celle: 0, celleFuori: 0, ramiFuori: 0, ramiInCelle: 0, sagome: 0, pezziFusi: 0, sciolte: 0, perche: {}, ms: 0, msSett: 0, msOmb: 0, msTaglia: 0, fotogrammi: 0 };
  let K = null, T3 = null, S = null, frame = 0, attivo = true;
  const noRay = () => { };

  // ------------------------------------------------------------------ i settori
  const CEL = new Map();   // chiave → { x, y, z, r, rami: [], fuori }
  let giroI = 0, giroL = null, orig = null, corti = [], lista = null, fr = null, pm = null;
  const sferaRamo = (() => {   // la sfera nel mondo di un ramo fermo (null se il ramo non può stare in una cella)
    let ok, x0, y0, z0, x1, y1, z1, any; const c = { x: 0, y: 0, z: 0 };
    const grow = (x, y, z, r) => { any = true; if (x - r < x0) x0 = x - r; if (y - r < y0) y0 = y - r; if (z - r < z0) z0 = z - r; if (x + r > x1) x1 = x + r; if (y + r > y1) y1 = y + r; if (z + r > z1) z1 = z + r; };
    const sc = e => Math.sqrt(Math.max(e[0] * e[0] + e[1] * e[1] + e[2] * e[2], e[4] * e[4] + e[5] * e[5] + e[6] * e[6], e[8] * e[8] + e[9] * e[9] + e[10] * e[10]));
    const visita = o => {
      if (!ok) return;
      if (o.isInstancedMesh || o.isLOD || o.isSkinnedMesh || o.isBone || o.isLight || o.__icS || o.__icR || o.__icParts || (o.userData && (o.userData.mixer || o.userData.model))) { ok = false; return; }
      if (o.isSprite) { if (o.frustumCulled === false) { ok = false; return; } const e = o.matrixWorld.elements, ce = o.center; grow(e[12], e[13], e[14], (.7072 + Math.hypot(ce.x - .5, ce.y - .5)) * sc(e)); }
      else if (o.isMesh || o.isLine || o.isPoints) {
        if (o.frustumCulled === false) { ok = false; return; }
        const g = o.geometry; if (!g) { ok = false; return; }
        if (g.boundingSphere === null) { if (!g.attributes || !g.attributes.position) { ok = false; return; } g.computeBoundingSphere(); }
        const s = g.boundingSphere; if (!s || !(s.radius >= 0)) { ok = false; return; }
        const e = o.matrixWorld.elements, p = s.center; c.x = e[0] * p.x + e[4] * p.y + e[8] * p.z + e[12]; c.y = e[1] * p.x + e[5] * p.y + e[9] * p.z + e[13]; c.z = e[2] * p.x + e[6] * p.y + e[10] * p.z + e[14];
        grow(c.x, c.y, c.z, s.radius * sc(e)); }
      const ch = o.children; for (let i = 0; i < ch.length; i++) visita(ch[i]);
    };
    return o => { ok = true; any = false; x0 = y0 = z0 = Infinity; x1 = y1 = z1 = -Infinity; visita(o); if (!ok) return null; if (!any) return { x: 0, y: 0, z: 0, r: -1 };
      const r = Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2; return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: (z0 + z1) / 2, r: isFinite(r) ? r : 1e9 }; };
  })();
  function cellaDi(o) {   // dentro una cella (o fuori dalle celle): la cella si allarga fino a contenerlo
    const s = o.__pfS; if (!s || s.r < 0) return null;
    const k = Math.floor(s.x / P.cella) + ',' + Math.floor(s.z / P.cella);
    let C = CEL.get(k); if (!C) CEL.set(k, C = { k, i: CEL.size + 1, x: s.x, y: s.y, z: s.z, r: s.r, n: 0, fuori: false, gen: CV + 1 });
    const d = Math.hypot(s.x - C.x, s.y - C.y, s.z - C.z); if (d + s.r > C.r) { if (d + C.r <= s.r) { C.x = s.x; C.y = s.y; C.z = s.z; C.r = s.r; } else { const R = (d + C.r + s.r) / 2, t = (R - C.r) / (d || 1); C.x += (s.x - C.x) * t; C.y += (s.y - C.y) * t; C.z += (s.z - C.z) * t; C.r = R; } }
    C.n++; return C;
  }
  // il giro: P.giro rami congelati a fotogramma; ognuno riprende la sua sfera (ferma, ma la geometria può cambiare) e la sua cella.
  // A giro finito le celle si rifanno da zero con le sfere nuove (nessuna cella resta più piccola dei suoi rami)
  function giro() {
    const F = K.frz; if (!F || !F.list) return;
    if (!giroL) { giroL = F.list.slice(); giroI = 0; }
    const end = Math.min(giroL.length, giroI + P.giro);
    for (; giroI < end; giroI++) { const o = giroL[giroI]; if (!o.__frz || !o.__frz.frozen || !(o.parent === S || (o.parent && o.parent.parent === S))) { o.__pfS = null; continue; } o.__pfS = sferaRamo(o); }   // anche i figli congelati di un ramo sciolto (render.js FRZ li riprova uno per uno)
    if (giroI >= giroL.length) {
      CEL.clear(); SPLIT.length = 0; let n = 0;
      for (const o of giroL) { o.__pfC = null; if (o.__frz && o.__frz.frozen && o.parent === S) {
        if (o.__pfS && o.__pfS.r <= P.grande) { const C = cellaDi(o); if (C) { o.__pfC = C; n++; } }
        // un ramo grande (il treno fermo, la ferrovia, un gruppo che attraversa mezza isola) o con dentro qualcosa che non sta in una cella
        // (istanze, un LOD): non in una cella sola, ma ogni figlio nella sua (fino a due livelli sotto)
        else if (o.children.length >= 2 && dividi(o, o, 0)) n++; }
        else if (o.__pfS && o.__frz && o.__frz.frozen && o.parent && o.parent.parent === S && !(o.parent.__frz && o.parent.__frz.frozen)) {   // il figlio fermo di un ramo che si muove dentro: nella sua cella, si toglie da solo
          const C = cellaDi(o); if (C) { o.__pfC = C; n++; if (o.parent.__pfSp2 !== CV + 1) { o.parent.__pfSp2 = CV + 1; o.parent.__pfTop = null; SPLIT.push(o.parent); } } } }
      CEL.forEach(C => { C.r += P.margine; }); ST.celle = CEL.size; ST.ramiInCelle = n; giroL = null; CV++;   // le celle vecchie (gen < CV) restano appese a qualche ramo, ma non contano più
    }
  }
  function dividi(o, top, liv) {   // i figli di o (tutto fermo: il ramo in cima è congelato) ognuno nella sua cella
    let k = 0;
    for (const c of o.children) { c.__pfC = null; const sc = sferaRamo(c); c.__pfS = sc; if (sc && sc.r < 0) continue;
      if (sc && sc.r <= P.grande) { c.__pfC = cellaDi(c); if (c.__pfC) k++; }
      else if (liv < 2 && c.children.length >= 2 && dividi(c, top, liv + 1)) k++; }
    if (k) { o.__pfTop = top; SPLIT.push(o); } return k > 0;
  }
  // prima della proiezione (scene.onBeforeRender, camera di gioco): le celle fuori; i loro rami fermi escono dalla lista per la proiezione
  function taglia(camera) {
    if (!CEL.size) return;
    pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); fr.setFromProjectionMatrix(pm);
    const pl = fr.planes; let cf = 0, h = 0;
    CEL.forEach(C => { let out = false; for (let i = 0; i < 6; i++) { const p = pl[i], n = p.normal; if (n.x * C.x + n.y * C.y + n.z * C.z + p.constant < -C.r) { out = true; break; } } C.fuori = out; if (out) { cf++; h = (Math.imul(h, 31) + C.i) | 0; } });
    // i mezzi (si muovono: la sfera del mezzo, nelle sue coordinate, portata dove sta ora)
    let mf = 0; for (let i = 0; i < VEH.length; i++) { const v = VEH[i], L = v.__pfLS; let out = false; if (!L || v.parent !== S || !v.visible) continue;
      const e = v.matrixWorld.elements, x = e[0] * L.x + e[4] * L.y + e[8] * L.z + e[12], y = e[1] * L.x + e[5] * L.y + e[9] * L.z + e[13], z = e[2] * L.x + e[6] * L.y + e[10] * L.z + e[14];
      const r = L.r * Math.sqrt(Math.max(e[0] * e[0] + e[1] * e[1] + e[2] * e[2], e[4] * e[4] + e[5] * e[5] + e[6] * e[6], e[8] * e[8] + e[9] * e[9] + e[10] * e[10]));
      for (let k = 0; k < 6; k++) { const p = pl[k], n = p.normal; if (n.x * x + n.y * y + n.z * z + p.constant < -r) { out = true; break; } }
      if (out) { v.__pfOutF = frame; mf++; h = (Math.imul(h, 31) + v.id * 7 + 3) | 0; if (v.isLOD && v.autoUpdate) v.update(camera); } }   // il livello del LOD come se three l'avesse visitato (per la sua ombra)
    ST.celleFuori = cf; ST.mezziFuori = mf; if (!cf && !mf) return;
    // i rami grandi a figli: i figli delle celle fuori escono per la proiezione
    for (let i = 0; i < SPLIT.length; i++) { const o = SPLIT[i], T = o.__pfTop || o; if (T.parent !== S) continue; const fo = !!(T.__frz && T.__frz.frozen), k = o.children, f = o.__pfF || (o.__pfF = []); f.length = 0;
      for (let j = 0; j < k.length; j++) { const c = k[j], C = c.__pfC; if (C && C.fuori && C.gen === CV && (fo || (c.__frz && c.__frz.frozen))) continue; f.push(c); }
      if (f.length < k.length) { SPL.push(o, k); o.children = f; } }
    // la lista corta si rifà solo se cambiano le celle fuori, i figli della scena (add, remove) o un ramo si congela o si scioglie
    const ch = S.children, fv = K.frz ? K.frz.ver : 0;
    if (h !== TG.h || cf !== TG.cf || TG.sv !== SV.v || TG.fv !== fv || TG.n !== ch.length || TG.cv !== CV) {
      corti.length = 0; let tolti = 0;
      for (let i = 0, l = ch.length; i < l; i++) { const o = ch[i], C = o.__pfC; if ((C && C.fuori && C.gen === CV && o.__frz && o.__frz.frozen) || o.__pfOutF === frame) { tolti++; continue; } corti.push(o); }
      TG.h = h; TG.cf = cf; TG.sv = SV.v; TG.fv = fv; TG.n = ch.length; TG.cv = CV; TG.tolti = tolti; }
    ST.ramiFuori = TG.tolti; if (!TG.tolti) return;
    orig = ch; S.children = corti;
  }
  function rimetti() { if (orig) { S.children = orig; orig = null; } for (let i = 0; i < SPL.length; i += 2) SPL[i].children = SPL[i + 1]; SPL.length = 0; }
  const SPLIT = [], SPL = [], VEH = [];
  // la sfera di un mezzo nelle sue coordinate (si rifà ogni P.mezziOgni fotogrammi): nessuna se porta qualcuno (chi guida la bici, la Vespa)
  // o un pezzo che three disegna sempre
  let _vi = null, _vm = null, _vs = null;
  function sferaMezzo(v) {
    if (!_vi) { _vi = new T3.Matrix4(); _vm = new T3.Matrix4(); _vs = new T3.Sphere(); }
    v.updateWorldMatrix(true, true); _vi.copy(v.matrixWorld).invert(); let ok = true, x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    v.traverse(o => { if (!ok) return; if (o !== v && persona(o)) { ok = false; return; } if (o.isSprite || o.isLight || o.isInstancedMesh || o.isPoints || o.isLine) { ok = false; return; }
      if (!o.isMesh) return; if (o.frustumCulled === false) { ok = false; return; } const g = o.geometry; if (!g) return; if (g.boundingSphere === null) { if (!g.attributes.position) { ok = false; return; } g.computeBoundingSphere(); }
      _vm.multiplyMatrices(_vi, o.matrixWorld); _vs.copy(g.boundingSphere).applyMatrix4(_vm); const c = _vs.center, r = _vs.radius;
      x0 = Math.min(x0, c.x - r); y0 = Math.min(y0, c.y - r); z0 = Math.min(z0, c.z - r); x1 = Math.max(x1, c.x + r); y1 = Math.max(y1, c.y + r); z1 = Math.max(z1, c.z + r); });
    if (!ok || !isFinite(x0)) return null;
    return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: (z0 + z1) / 2, r: Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2 * 1.2 + .5 };   // largo: le ruote e le porte si muovono dentro
  }
  function mezzi() {
    VEH.length = 0; const V = K.vehicles; if (!V) return;
    for (const id in V) { const v = V[id]; if (!v || v.parent !== S) continue; VEH.push(v); if (!(frame < v.__pfLT)) { v.__pfLT = frame + P.mezziOgni + (v.id % 17); v.__pfLS = sferaMezzo(v); } }
  }
  const TG = { h: 0, cf: -1, sv: -1, fv: -1, n: -1, cv: -1, tolti: 0 }, SV = { v: 0 }; let CV = 0;   // CV: le celle rifatte

  // ------------------------------------------------------------------ le ombre fuse
  const RIG = new Map();   // ramo (figlio della scena) → { stato: 'oss'|'fatto'|'pausa', t, nodi: Map(nodo → istantanea), sagome: [], sciolte }
  let grp = null, scanT = 0, MATS = {}, typeVSM = false, CX = 0, CZ = 0;
  const istante = (o, a) => { const p = o.position, q = o.quaternion, s = o.scale; if (!o.matrixAutoUpdate) { const e = o.matrix.elements; a[0] = e[12]; a[1] = e[13]; a[2] = e[14]; a[3] = e[0]; a[4] = e[1]; a[5] = e[2]; a[6] = e[5]; a[7] = e[6]; a[8] = e[9]; a[9] = e[10]; }
    else { a[0] = p.x; a[1] = p.y; a[2] = p.z; a[3] = q.x; a[4] = q.y; a[5] = q.z; a[6] = q.w; a[7] = s.x; a[8] = s.y; a[9] = s.z; } a[10] = o.visible ? 1 : 0; a[11] = o.matrixAutoUpdate ? 1 : 0; return a; };
  const _t = new Float64Array(12);
  const uguale = (o, a) => { istante(o, _t); for (let k = 0; k < 12; k++) if (_t[k] !== a[k]) return false; return true; };
  const persona = o => o.isSkinnedMesh || o.isBone || (o.userData && (o.userData.mixer || o.userData.model || o.userData.personaggi || o.userData.pesoGente || o.userData.dressing));
  function osserva(root) {   // le istantanee di tutti i nodi del ramo (le persone dentro i mezzi restano fuori)
    const nodi = new Map(), st = [root];
    while (st.length) { const o = st.pop(); if (o !== root && persona(o)) continue; nodi.set(o, istante(o, new Float64Array(12))); const c = o.children; for (let i = 0; i < c.length; i++) st.push(c[i]); }
    return nodi;
  }
  // chi è cambiato: mosso (posizione, rotazione, scala) o acceso e spento (visibilità); tutti e due fanno gruppo a sé
  function confronta(R) { R.nodi.forEach((a, o) => { istante(o, _t); let mv = false, vs = false; for (let k = 0; k < 12; k++) if (_t[k] !== a[k]) { if (k === 10) vs = true; else mv = true; }
    if (mv) o.__pfMov = true; if (mv || vs) o.__pfArt = true; }); }
  const lato = m => { const mt = m.material; if (typeVSM) return mt.shadowSide !== null ? mt.shadowSide : mt.side; return mt.shadowSide !== null ? mt.shadowSide : ({ 0: 1, 1: 0, 2: 2 })[mt.side]; };
  function fusibile(m, cl) {
    if (!m.isMesh || !m.castShadow || m.__pfNoFuse || m.isSkinnedMesh || m.isInstancedMesh || m.customDepthMaterial || m.customDistanceMaterial || (m.userData && (m.userData.lazy1 || m.userData.pfProxy))) return false;
    const mt = m.material, g = m.geometry; if (!mt || Array.isArray(mt) || mt.visible === false || mt.wireframe) return false;
    if ((mt.alphaTest > 0 && (mt.map || mt.alphaMap)) || (mt.displacementMap && mt.displacementScale !== 0) || (mt.clipShadows && mt.clippingPlanes && mt.clippingPlanes.length)) return false;
    if (!g || !g.attributes || !g.attributes.position || (g.morphAttributes && g.morphAttributes.position) || g.drawRange.start !== 0 || g.drawRange.count !== Infinity) return false;
    return m.layers.test(cl);
  }
  function matDi(side) { return MATS[side] || (MATS[side] = Object.assign(new T3.MeshBasicMaterial({ colorWrite: false, depthWrite: false }), { side, shadowSide: side, name: 'ombra_fusa' })); }
  let _mi = null, _mm = null, _v = null;
  function costruisci(root, R) {
    const cl = K.camera().layers; root.updateWorldMatrix(true, true); if (!_mi) { _mi = new T3.Matrix4(); _mm = new T3.Matrix4(); _v = new T3.Vector3(); }
    const gruppi = new Map();
    // solo i gruppi che si muovono nel mondo (un nodo mosso sulla strada dal ramo al loro genitore): quelli fermi la mappa d'ombra li ha già cotti
    const walk = (o, Rt, catena, mov) => { const ch = o.children;
      for (let i = 0; i < ch.length; i++) { const c = ch[i]; if (persona(c) || !c.visible) continue;
        const Rc = c.__pfArt ? c : Rt, cat = c.__pfArt ? [] : catena.concat([c]), mv = mov || !!c.__pfMov;
        if (mv && fusibile(c, cl)) { const k = Rc.id + '|' + lato(c); let G = gruppi.get(k); if (!G) gruppi.set(k, G = { R: Rc, side: lato(c), parti: [] }); G.parti.push({ m: c, catena: cat }); }
        walk(c, Rc, cat, mv); } };
    if (root.visible) walk(root, root, [], !!root.__pfMov);
    R.sagome = [];
    gruppi.forEach(G => {
      if (G.parti.length < P.min) return;
      _mi.copy(G.R.matrixWorld).invert(); let nv = 0, ni = 0; G.parti.forEach(p => { const g = p.m.geometry; nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; });
      const pos = new Float32Array(nv * 3), idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni); let ov = 0, oi = 0;
      G.parti.forEach(p => { const g = p.m.geometry, a = g.attributes.position; _mm.multiplyMatrices(_mi, p.m.matrixWorld);
        for (let i = 0; i < a.count; i++) { _v.set(a.getX(i), a.getY(i), a.getZ(i)).applyMatrix4(_mm); pos[(ov + i) * 3] = _v.x; pos[(ov + i) * 3 + 1] = _v.y; pos[(ov + i) * 3 + 2] = _v.z; }
        const n0 = oi; if (g.index) { const ix = g.index; for (let i = 0; i < ix.count; i++) idx[oi + i] = ix.getX(i) + ov; oi += ix.count; } else { for (let i = 0; i < a.count; i++) idx[oi + i] = ov + i; oi += a.count; }
        if (_mm.determinant() < 0) for (let i = n0; i + 2 < oi; i += 3) { const q = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = q; }   // un pezzo specchiato rispetto al genitore: three gli girava il verso delle facce (frontFace), qui lo fa l'ordine dei vertici
        ov += a.count; });
      const geo = new T3.BufferGeometry(); geo.setAttribute('position', new T3.BufferAttribute(pos, 3)); geo.setIndex(new T3.BufferAttribute(idx, 1)); geo.computeBoundingSphere(); geo.computeBoundingBox();
      const sm = new T3.Mesh(geo, matDi(G.side)); sm.name = 'ombra_fusa'; sm.matrixAutoUpdate = false; sm.matrixWorldAutoUpdate = false; sm.castShadow = true; sm.receiveShadow = false; sm.raycast = noRay; sm.userData.pfProxy = true; sm.userData.keep = true; sm.userData.thin2 = 1;
      sm.matrixWorld.copy(G.R.matrixWorld);
      const parti = G.parti.map(p => { const m = p.m, g = m.geometry, mt = m.material; m.castShadow = false;
        return { m, g, pv: g.attributes.position.version, iv: g.index ? g.index.version : -1, mt, side: mt.side, ss: mt.shadowSide, vis: mt.visible, at: mt.alphaTest, ly: m.layers.mask,
          catena: p.catena.map(n => ({ n, p: n.parent, a: istante(n, new Float64Array(12)) })) }; });
      grp.add(sm); R.sagome.push({ sm, Rn: G.R, parti }); ST.sagome++; ST.pezziFusi += parti.length;
    });
    R.stato = R.sagome.length ? 'fatto' : 'fermo'; R.t = frame + P.riprova; R.rs = istante(root, new Float64Array(12));   // niente da fondere (fermo, o pezzi soli): si riguarda più tardi
  }
  function sciogli(R, s, colpa) {
    s.parti.forEach(p => { if (p.m.castShadow === false) p.m.castShadow = true; });
    if (s.sm.parent) s.sm.parent.remove(s.sm); s.sm.geometry.dispose(); ST.sagome--; ST.pezziFusi -= s.parti.length; ST.sciolte++;
  }
  function sciogliTutto(R) { R.sagome.forEach(s => sciogli(R, s, null)); R.sagome = []; }
  // il controllo di ogni fotogramma: la catena di ogni pezzo fuso è ancora quella, ferma, visibile, con la stessa geometria e lo stesso materiale
  // (chi è cambiato nella geometria, nel materiale o nell'ombra non si fonde più; chi si è mosso o acceso fa gruppo a sé)
  let perche = '';
  function regge(s) {
    for (const p of s.parti) { const m = p.m, g = m.geometry, mt = m.material;
      if (m.castShadow !== false) { perche = 'ombra'; m.__pfNoFuse = true; return m; }
      if (g !== p.g || g.attributes.position.version !== p.pv || (g.index ? g.index.version : -1) !== p.iv) { perche = 'geometria'; m.__pfNoFuse = true; return m; }
      if (mt !== p.mt || mt.side !== p.side || mt.shadowSide !== p.ss || mt.visible !== p.vis || mt.alphaTest !== p.at || m.layers.mask !== p.ly) { perche = 'materiale'; m.__pfNoFuse = true; return m; }
      for (const c of p.catena) { if (c.n.parent !== c.p) { perche = 'genitore'; c.n.__pfArt = c.n.__pfMov = true; return c.n; }
        if (!uguale(c.n, c.a)) { const vs = _t[10] !== c.a[10]; perche = vs ? 'visibile' : 'mosso'; c.n.__pfArt = true; if (!vs) c.n.__pfMov = true; return c.n; } } }
    return null;
  }
  const _vis = n => { for (let q = n; q; q = q.parent) { if (q === S) return true; if (!q.visible) return false; } return false; };
  function ombre() {
    if (!grp) { grp = new T3.Group(); grp.name = 'ombre_fuse'; grp.matrixAutoUpdate = false; grp.matrixWorldAutoUpdate = false; grp.__frzNo = true; grp.userData.keep = true; grp.visible = false; }
    if (grp.parent !== S) S.add(grp);
    typeVSM = K.renderer.shadowMap.type === 3; { const e = K.camera().matrixWorld.elements; CX = e[12]; CZ = e[14]; }
    // i rami nuovi che si muovono (o non ancora congelati) entrano in osservazione; chi esce dalla scena si scioglie
    if (frame >= scanT) { scanT = frame + P.scansione;
      const pers = new Set(); if (K.people) for (const k in K.people) pers.add(K.people[k]);
      for (const o of S.children) { if (o === grp || RIG.has(o) || o.__pfNo || (o.__frz && o.__frz.frozen) || pers.has(o) || persona(o) || o.isLight || o.isCamera || o.isSprite) continue;
        if (o.__pfPoco && frame - o.__pfPoco < 600) continue;
        let n = 0; o.traverse(q => { if (q.isMesh && q.castShadow) n++; }); if (n < P.min) { o.__pfPoco = frame; continue; }
        RIG.set(o, { stato: 'oss', t: frame, nodi: osserva(o), sagome: [], sciolte: 0 }); }
      RIG.forEach((R, o) => { if (o.parent !== S) { sciogliTutto(R); RIG.delete(o); } });
    }
    RIG.forEach((R, o) => {
      if (R.stato === 'oss') { const d = frame - R.t; if (d > 0 && d % P.passo === 0) confronta(R); if (d >= P.oss) { R.nodi = null; costruisci(o, R); } return; }   // tre confronti in P.oss fotogrammi
      if (R.stato === 'fermo' && R.rs && frame % P.passo === 0 && !uguale(o, R.rs)) R.t = frame;   // il ramo fermo si è mosso: si osserva subito
      if (R.stato === 'pausa' || R.stato === 'fermo') { if (frame >= R.t) { R.stato = 'oss'; R.t = frame; R.nodi = osserva(o); } return; }
      for (let i = R.sagome.length - 1; i >= 0; i--) { const s = R.sagome[i];
        { const e = s.Rn.matrixWorld.elements, dx = e[12] - CX, dz = e[14] - CZ, rr = P.vicino + s.sm.geometry.boundingSphere.radius; if (dx * dx + dz * dz > rr * rr && (frame + s.sm.id) % P.passo) continue; }   // lontano dalla camera (fuori da ogni ombra che si vede): un controllo ogni P.passo fotogrammi
        const c = regge(s);
        if (c) { ST.perche[perche] = (ST.perche[perche] || 0) + 1; sciogli(R, s, c); R.sagome.splice(i, 1); R.sciolte++; if (R.sciolte > P.sciolte) { sciogliTutto(R); o.__pfNo = true; RIG.delete(o); return; }
          sciogliTutto(R); R.stato = 'pausa'; R.t = frame + P.pausa; return; } }
    });
  }
  // le sagome seguono il loro genitore (dopo le matrici e dopo la proiezione, che cambia i livelli dei LOD: subito prima delle ombre)
  function segui() {
    RIG.forEach(R => { if (R.stato !== 'fatto') return; for (const s of R.sagome) { const on = _vis(s.Rn); s.sm.visible = on; if (on) s.sm.matrixWorld.copy(s.Rn.matrixWorld); } });
  }

  // ------------------------------------------------------------------ gli agganci
  function aggancia() {
    const rd = K.renderer;
    { const a0 = S.add, r0 = S.remove; S.add = function () { SV.v++; return a0.apply(this, arguments); }; S.remove = function () { SV.v++; return r0.apply(this, arguments); }; }   // chi entra ed esce dalla scena
    S.onBeforeRender = function (r, sc, camera) { if (!attivo || camera !== K.camera()) return; rimetti(); if (grp) grp.visible = false; if (SETT) { const t = performance.now(); taglia(camera); ST.msTaglia += performance.now() - t; } };
    S.onAfterRender = function () { rimetti(); if (grp) grp.visible = false; };
    lista = null;
  }
  function finisci() { rimetti(); if (grp && attivo && grp.parent === S) { segui(); grp.visible = true; } }   // dopo la proiezione, prima delle ombre: la scena intera, le sagome per le ombre
  function prima(kit) {
    if (!ON) return; K = kit; T3 = window.THREE;
    if (!fr) { fr = new T3.Frustum(); pm = new T3.Matrix4(); }
    const t0 = performance.now(); frame++;
    if (S !== K.scene) { S = K.scene; aggancia(); }
    rimetti();
    const L = K.renderer.renderLists.get(S, 0); if (L !== lista) { lista = L; const f0 = L.finish; L.finish = function () { finisci(); return f0.apply(this, arguments); }; }
    if (!attivo) { if (grp) grp.visible = false; ST.ms += performance.now() - t0; return; }
    if (SETT) { giro(); mezzi(); } const t1 = performance.now(); ST.msSett += t1 - t0;
    if (OMB && K.renderer.shadowMap.enabled) try { ombre(); } catch (e) { console.warn('[fusi] ombre', e); spegniOmbre(); } ST.msOmb += performance.now() - t1;
    ST.fotogrammi++; ST.ms += performance.now() - t0;
  }
  function spegniOmbre() { RIG.forEach(R => sciogliTutto(R)); RIG.clear(); if (grp && grp.parent) grp.parent.remove(grp); }
  function conto() { const n = ST.fotogrammi || 1; return { on: ON, settori: SETT, ombre: OMB, celle: ST.celle, celleFuori: ST.celleFuori, ramiInCelle: ST.ramiInCelle, ramiFuori: ST.ramiFuori, mezziFuori: ST.mezziFuori, ramiGrandi: SPLIT.length, rami: RIG.size, sagome: ST.sagome, pezziFusi: ST.pezziFusi, sciolte: ST.sciolte, perche: ST.perche, ms_fot: +(ST.ms / n).toFixed(2), msSettori_fot: +(ST.msSett / n).toFixed(2), msOmbre_fot: +(ST.msOmb / n).toFixed(2), msTaglio_fot: +(ST.msTaglia / n).toFixed(2), stati: (() => { const c = {}; RIG.forEach(R => c[R.stato] = (c[R.stato] || 0) + 1); return c; })() }; }
  function azzera() { ST.ms = ST.msSett = ST.msOmb = ST.msTaglia = 0; ST.fotogrammi = 0; ST.sciolte = 0; ST.perche = {}; }
  return { ON, P, prima, conto, azzera, get attivo() { return attivo; }, set attivo(v) { attivo = !!v; if (!attivo) { rimetti(); spegniOmbre(); CEL.clear(); } } };
})();
if (typeof window !== 'undefined') { window.PesoFusi = PesoFusi; (window.__pesoAB = window.__pesoAB || {}).fusi = v => { PesoFusi.attivo = v; }; }
