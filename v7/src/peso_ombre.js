/* Porto Vecchio — [peso] le ombre in cache (v7).
   Il banco del peso (strumenti/banco_peso.js) dice che nel borgo un fotogramma è per più di metà ombre: l'ombra del sole ridisegna a ogni
   fotogramma ~1.100 pezzi (tutta la città nel suo riquadro), e ogni faretto dei lampioni che si aggiorna (fino a tre per fotogramma) altri
   ~1.000-1.300. Ma quasi tutto quello che fa ombra sta fermo: case, muri, tetti, arredo. Qui ogni luce con l'ombra tiene due mappe:
     - la mappa delle cose ferme, disegnata una volta (la «cottura») e copiata da parte (blitFramebuffer: colore e profondità);
     - a ogni fotogramma in cui serve, la mappa vera riparte da quella copia (un blit) e ci si disegnano sopra solo le cose che si muovono
       (persone, mezzi, porte, panni, barche: chi ha cambiato matrice negli ultimi 90 fotogrammi, gli scheletri sempre).
   Si ricuoce quando cambia la camera dell'ombra o l'insieme delle cose ferme nel suo riquadro (una cosa che appare, sparisce, cambia
   geometria, si ferma dopo essersi mossa). Il risultato è la stessa mappa di prima, pixel per pixel: stesse cose, stessa profondità.
   Il sole: il suo riquadro seguiva la camera a ogni fotogramma (quindi andava ricotto sempre). Ora il centro si aggancia alla griglia dei
   texel dell'ombra (l'ombra non «nuota» più camminando) e resta fermo finché la camera non se ne allontana di P.M metri; il riquadro è più
   largo di P.M per lato e la mappa più grande nella stessa proporzione (stessa grandezza del texel: la stessa ombra). La direzione del sole
   si aggiorna a scatti di P.ang radianti (0,15°: un'ora di gioco ne fa ~7). I faretti: la mappa si ricuoce quando il faretto passa a un
   altro lampione; le riprese che il gioco chiedeva (qualcuno si muove sotto la luce, ogni mezzo secondo) diventano copia + chi si muove.
   ?nopesoombre spegne tutto (come prima).                                                                                              */
var PesoOmbre = (function () {
  'use strict';
  const Q = typeof location !== 'undefined' ? location.search : '';
  const ON = !/[?&]nopeso(ombre)?\b/.test(Q);
  const STRETTA = ON && !/[?&]nopesostretta\b/.test(Q);   // il riquadro del sole stretto sulla visuale lungo la direzione del sole (?nopesostretta: quadrato)
  const P = { alto: 70, M: 8, ang: .0026, ferma: 90, fermaLunga: 1800, nuovoMs: 4000, giro: 8, lotto: 250, fine: 1.4, fineTel: typeof LeggeraMem !== 'undefined' && LeggeraMem.on('ombre') ? .8 : 1.25 };   // [leggera] sul telefono la mappa del sole più piccola (leggera_memoria.js)   // fine: il texel del sole più piccolo (computer 2048 → ~2870 di base; la mappa con il margine ~3500)
  const MOT = { chiave: 0, firma: 0, misura: 0, aggancio: 0 }, DIAG = { on: false, mob: new Map(), firma: new Map() };
  const ST = { cotture: 0, sottofondo: 0, lotti: 0, riprese: 0, aggiunte: 0, dinamici: 0, fermi: 0, lanciatori: 0, luci: 0, ms: 0, fotogrammi: 0 };
  const REC = new Map();
  const EMPTY = [], A = { half: 0, halfSet: NaN, base: 0, G: null, next: null };
  let K = null, frame = 0, root = null, T3 = null, sfera = null, vtmp = null, pm = null, noop = () => { };
  const CAST = [], TOPS = []; let ORA = 0;

  // chi fa ombra, come lo trova three (WebGLShadowMap: visibile, sul livello della camera di gioco, mesh linea o punti, castShadow)
  // (la lista si rifà ogni P.giro fotogrammi; in mezzo si controlla solo che ognuno sia ancora acceso e attaccato)
  function raccogli(o, cl, top) {
    if (!o.visible) return;
    if (o.isSkinnedMesh && top) top.__poPers = true;   // un ramo con uno scheletro (una persona): tutto il ramo si muove
    if ((o.isMesh || o.isLine || o.isPoints) && o.castShadow && o.layers.test(cl)) { CAST.push(o); TOPS.push(top); }
    const ch = o.children; for (let i = 0; i < ch.length; i++) raccogli(ch[i], cl, top || ch[i]);
  }
  function attaccato(o) { let q = o; while (q) { if (q === K.scene) return true; if (!q.visible) return false; q = q.parent; } return false; }
  // si è mosso? (la matrice nel mondo, le istanze); la sfera nel mondo per la scelta veloce dei faretti
  function guarda(o) {
    const e = o.matrixWorld.elements; let u = o.__po;
    if (!u) { u = o.__po = { nato: ORA, e: new Float64Array(7), dyn: -1e9, v: -1, c: new T3.Vector3(), r: 0, f: -1, sk: -1, sin: false, top: null }; u.e[0] = e[0]; u.e[1] = e[1]; u.e[2] = e[2]; u.e[3] = e[6]; u.e[4] = e[12]; u.e[5] = e[13]; u.e[6] = e[14]; u.v = o.isInstancedMesh ? o.instanceMatrix.version : 0; }
    else if (u.e[4] !== e[12] || u.e[5] !== e[13] || u.e[6] !== e[14] || u.e[0] !== e[0] || u.e[1] !== e[1] || u.e[2] !== e[2] || u.e[3] !== e[6]) {
      u.e[0] = e[0]; u.e[1] = e[1]; u.e[2] = e[2]; u.e[3] = e[6]; u.e[4] = e[12]; u.e[5] = e[13]; u.e[6] = e[14]; u.dyn = frame; u.f = -1; u.mosse = (u.mosse || 0) + 1; }
    if (o.isInstancedMesh && o.instanceMatrix.version !== u.v) { u.v = o.instanceMatrix.version; u.dyn = frame; u.f = -1; u.mosse = (u.mosse || 0) + 1; }
    return u;
  }
  // chi si è mosso due volte (un'auto che riparte dal semaforo, una barca) resta fra i mobili per P.fermaLunga: ogni passaggio fermo ⇄ mobile
  // costa una cottura intera della mappa del sole
  // e chi è appena nato (le scale dei tetti si rifanno ogni 2,5 s finché si esplora): per i primi P.nuovoMs fra i mobili; se sparisce prima
  // non tocca la mappa cotta, se resta entra con un'aggiunta
  const mobile = (o, u) => o.isSkinnedMesh || ORA - u.nato < P.nuovoMs || frame - u.dyn < (u.mosse > 1 ? P.fermaLunga : P.ferma) || (u.top && u.top.__poPers);
  // l'impronta di una cosa ferma (dove sta, quanti vertici, che materiale): le scale dei tetti rifatte uguali (oggetti nuovi, stessa forma
  // nello stesso posto) non cambiano la firma e non chiedono una cottura nuova
  function impronta(o, u) {
    const g = o.geometry; if (u.fpg === g && u.fpd === u.dyn) return u.fp;
    const e = o.matrixWorld.elements, pa = g && g.attributes && g.attributes.position, mt = o.material, mc = mt && mt.color ? mt.color.getHex() : 0;
    let h = (Math.round(e[12] * 64) | 0) * 73856093 ^ (Math.round(e[13] * 64) | 0) * 19349663 ^ (Math.round(e[14] * 64) | 0) * 83492791 ^ (Math.round(e[0] * 1024) | 0) * 2654435761 ^ (Math.round(e[10] * 1024) | 0) * 40503;
    h = (h ^ ((pa ? pa.count : 0) * 2246822519) ^ ((g && g.index ? g.index.count : 0) * 3266489917) ^ (mc * 668265263) ^ (o.isInstancedMesh ? o.count * 374761393 : 0)) >>> 0;
    u.fp = h; u.fpg = g; u.fpd = u.dyn; return h;
  }
  function sferaDi(o, u) {
    if (u.f === frame || (u.f >= 0 && !mobile(o, u) && u.g === o.geometry)) return;
    const g = o.geometry; if (!g) { u.r = 1e9; return; } if (g.boundingSphere === null) g.computeBoundingSphere();
    sfera.copy(g.boundingSphere).applyMatrix4(o.matrixWorld); u.c.copy(sfera.center); u.r = sfera.radius; u.f = frame; u.g = g;
  }
  // disegna nella mappa della luce solo la lista (i figli non contano: chi serve è già nella lista); senza pulire, se si aggiunge
  function disegna(light, list, pulisci) {
    const rd = K.renderer, sm = rd.shadowMap, st = [];
    for (let i = 0; i < list.length; i++) { const o = list[i]; if (o.children.length) { st.push(o, o.children); o.children = EMPTY; } }
    root.children = list;
    const au = sm.autoUpdate, nu = sm.needsUpdate, clr = rd.clear;
    if (!pulisci) rd.clear = noop;
    try { sm.needsUpdate = true; light.shadow.needsUpdate = true; sh0.call(sm, [light], root, K.camera()); }
    finally { rd.clear = clr; sm.autoUpdate = au; sm.needsUpdate = nu; light.shadow.needsUpdate = false; root.children = EMPTY; for (let i = 0; i < st.length; i += 2) st[i].children = st[i + 1]; }
  }
  function copia(src, dst) {   // colore e profondità, texel per texel
    const rd = K.renderer, gl = rd.getContext(), pr = rd.properties, w = dst.width, h = dst.height;
    rd.setRenderTarget(src); rd.setRenderTarget(dst);   // le due cornici pronte sulla scheda video
    rd.state.setScissorTest(false); rd.state.buffers.color.setMask(true); rd.state.buffers.depth.setMask(true);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, pr.get(src).__webglFramebuffer); rd.state.bindFramebuffer(gl.DRAW_FRAMEBUFFER, pr.get(dst).__webglFramebuffer);
    gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
  }
  // il sole: il centro agganciato alla griglia dei texel, fermo finché la camera resta entro P.M metri; la direzione a scatti.
  // A è l'aggancio in uso (la camera dell'ombra vera), A.next quello verso cui si sta cuocendo in sottofondo (dalla metà del margine):
  // camminando la mappa nuova è già pronta quando serve; solo un salto oltre il margine (un teletrasporto, un'auto velocissima) cuoce subito
  function base(d) { const z = d.clone().negate(), x = new T3.Vector3(0, 1, 0).cross(z); if (x.lengthSq() < 1e-12) x.set(1, 0, 0); x.normalize(); return { x, y: z.clone().cross(x) }; }
  function aggancia(T, B, tex, ty) { ty = ty || tex; const a = T.x * B.x.x + T.y * B.x.y + T.z * B.x.z, b = T.x * B.y.x + T.y * B.y.y + T.z * B.y.z; return T.clone().addScaledVector(B.x, Math.round(a / tex) * tex - a).addScaledVector(B.y, Math.round(b / ty) * ty - b); }
  // [peso] il riquadro stretto: col sole basso un texel della mappa a terra si allunga di 1/sin(altezza) lungo la direzione del sole (i dentini
  // sui bordi delle ombre lunghe, le strisce a sega della piazza d'adunata). Il quadrato del gioco lungo quell'asse copre a terra molto più
  // della visuale: qui l'asse y della camera dell'ombra si stringe a quello che la camera di gioco vede fra terra e P.alto metri (più il
  // margine del cammino), con lo stesso numero di texel: texel più fini proprio dove si allungano. Si rifà a ogni scatto del sole o di zoom.
  const VQ = [];
  function stretto(G, halfE, ms) {
    if (!A.st) return G; const cam = K.camera(); if (!cam || !cam.isCamera) return G; cam.updateMatrixWorld();
    if (!VQ.length) for (let i = 0; i < 4; i++) VQ.push(new T3.Vector3(), new T3.Vector3());
    let lo = 1e9, hi = -1e9; const T = G.T, By = G.y;
    for (let i = 0; i < 4; i++) { const a = VQ[2 * i].set(i & 1 ? 1 : -1, i & 2 ? 1 : -1, -1).unproject(cam), b = VQ[2 * i + 1].set(i & 1 ? 1 : -1, i & 2 ? 1 : -1, 1).unproject(cam);
      for (const h of [0, P.alto]) { const dy = b.y - a.y; let t = Math.abs(dy) < 1e-9 ? 1 : (h - a.y) / dy; t = Math.min(1, Math.max(0, t));
        const v = (a.x + (b.x - a.x) * t - T.x) * By.x + (a.y + dy * t - T.y) * By.y + (a.z + (b.z - a.z) * t - T.z) * By.z; if (v < lo) lo = v; if (v > hi) hi = v; } }
    lo = Math.max(-halfE, Math.floor(lo - P.M - 1)); hi = Math.min(halfE, Math.ceil(hi + P.M + 1));   // a metri interi: il reticolo dei texel non cambia camminando
    if (!(hi > lo) || hi - lo > 2 * halfE * .9) return G;   // poco da guadagnare: il quadrato
    const ty = (hi - lo) / ms; G.ty = ty; G.y0 = lo; G.y1 = hi; G.T = aggancia(G.T, G, G.tex, ty); return G;
  }
  function metti(m, G) { const sc = m.shadow.camera, y0 = G.y0 != null ? G.y0 : -A.halfSet, y1 = G.y1 != null ? G.y1 : A.halfSet;
    if (sc.top !== y1 || sc.bottom !== y0) { sc.top = y1; sc.bottom = y0; sc.updateProjectionMatrix(); }
    m.target.position.copy(G.T); m.position.copy(G.T).addScaledVector(G.d, -G.D); m.updateMatrixWorld(); m.target.updateMatrixWorld(); }
  function sole() {
    const m = K.moon, sc = m.shadow.camera, T = m.target.position, Pp = m.position;
    if (!A.base) { const mt = (K.renderer.capabilities && K.renderer.capabilities.maxTextureSize) || 4096; A.base0 = m.shadow.mapSize.x; A.base = Math.min(Math.floor(A.base0 * (K.phone ? P.fineTel : P.fine)), mt - 512); A.maxT = mt; }
    if (sc.right !== A.halfSet) A.half = sc.right;   // il gioco ha cambiato il riquadro (profSole lo tocca solo quando cambia)
    let tex = 2 * A.half / A.base; const lim = (A.maxT || 4096) - 64; if (Math.ceil(2 * (A.half + P.M) / tex) > lim) tex = 2 * (A.half + P.M) / lim;   // mai oltre la tessitura più grande
    const ms = Math.ceil(2 * (A.half + P.M) / tex), halfE = ms * tex / 2;
    // [peso] il texel più fine (P.fine: le aste e i pali sottili facevano ombre a dentini, a tratti, nelle piazze col sole basso): lo scarto
    // dell'ombra in proporzione al texel nuovo, con le manopole di render.js (PROF.ombraBias, come profSole)
    const PR = window.__PROF; if (PR && PR.ombraVisuale > 0 && PR.ombraBias) { m.shadow.bias = -(PR.ombraBias[0] + PR.ombraBias[1] * tex) / (sc.far - sc.near); m.shadow.normalBias = .015 + tex * .9; }
    if (m.shadow.mapSize.x !== ms) { m.shadow.mapSize.set(ms, ms); if (m.shadow.map) { m.shadow.map.dispose(); m.shadow.map = null; } A.G = null; A.next = null; }
    if (sc.right !== halfE) { sc.left = -halfE; sc.right = halfE; sc.top = halfE; sc.bottom = -halfE; sc.updateProjectionMatrix(); } A.halfSet = halfE;
    const D = Math.hypot(T.x - Pp.x, T.y - Pp.y, T.z - Pp.z) || 1, d = new T3.Vector3(T.x - Pp.x, T.y - Pp.y, T.z - Pp.z).divideScalar(D);
    const st = STRETTA && !window.__nostretta; if (st !== A.st) { A.st = st; A.G = null; }   // window.__nostretta: il confronto nella stessa pagina
    const G = A.G; let want = null, forza = false;
    if (!G || G.tex !== tex || G.half !== halfE) { forza = true; const B = base(d); want = stretto({ d, D, x: B.x, y: B.y, tex, half: halfE, T: aggancia(T, B, tex) }, halfE, ms); }
    else {
      const nuova = Math.abs(D - G.D) > 1 || Math.acos(Math.min(1, d.dot(G.d))) > P.ang;
      const ts = aggancia(T, G, tex, G.ty), ex = (ts.x - G.T.x) * G.x.x + (ts.y - G.T.y) * G.x.y + (ts.z - G.T.z) * G.x.z, ey = (ts.x - G.T.x) * G.y.x + (ts.y - G.T.y) * G.y.y + (ts.z - G.T.z) * G.y.z, deriva = Math.max(Math.abs(ex), Math.abs(ey));
      if (deriva > P.M - tex) forza = true;
      if (nuova || deriva > P.M / 2) { const B = nuova ? base(d) : G; want = stretto({ d: nuova ? d : G.d, D: nuova ? D : G.D, x: B.x, y: B.y, tex, half: halfE, T: aggancia(T, B, tex) }, halfE, ms); }
    }
    if (forza) { A.G = want; A.next = null; A.rifai = true; }   // cottura subito: con la lista di chi fa ombra rifatta ora (dopo un salto la vecchia è di un altro posto)
    else if (want) { const N = A.next; if (!N || N.T.distanceTo(want.T) > P.M / 4 || N.d.dot(want.d) < Math.cos(P.ang)) A.next = want; }
    else A.next = null;
    metti(m, A.G);
  }
  // la camera dell'ombra di una luce (la matrice proiezione × vista) e chi c'è dentro, fermo o mobile
  function contenuto(light, tutti, r) {
    const sh = light.shadow; sh.updateMatrices(light); const cam = sh.camera, fz = sh.getFrustum();
    pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); const e = Float64Array.from(pm.elements);
    let chiave = false; for (let k = 0; k < 16; k++) if (e[k] !== r.key[k]) { chiave = true; break; }
    if (chiave && tutti) r.ver++;   // il sole: la risposta «dentro il riquadro» di ogni cosa ferma vale finché la camera dell'ombra non cambia
    const fermi = [], mob = [], lp = light.position, R2 = tutti ? 0 : (light.distance || 30) + 1; let sig = 0;
    for (let i = 0; i < CAST.length; i++) { const o = CAST[i], u = o.__po; if (!u.ok) continue; const mv = mobile(o, u);
      if (o.frustumCulled) {
        if (!tutti) { sferaDi(o, u); const rr = R2 + u.r, ddx = u.c.x - lp.x, ddy = u.c.y - lp.y, ddz = u.c.z - lp.z; if (ddx * ddx + ddy * ddy + ddz * ddz > rr * rr) continue; if (!fz.intersectsObject(o)) continue; }
        else if (!mv && u.sk === r.ver && u.dynS === u.dyn) { if (!u.sin) continue; }
        else { u.sin = fz.intersectsObject(o); u.sk = r.ver; u.dynS = u.dyn; if (!u.sin) continue; } }
      if (mv) mob.push(o); else { fermi.push(o); sig += impronta(o, u); } }
    return { e, chiave, fermi, mob, sig };
  }
  function impronte(list) { const M = new Map(); for (let i = 0; i < list.length; i++) { const o = list[i], f = impronta(o, o.__po); M.set(f, (M.get(f) || 0) + 1); } return M; }
  function aggiunte(fps, list) {   // le cose in più rispetto alla mappa cotta, o null se ne manca qualcuna
    const rest = new Map(fps), add = [];
    for (let i = 0; i < list.length; i++) { const o = list[i], f = impronta(o, o.__po), k = rest.get(f); if (k) rest.set(f, k - 1); else add.push(o); }
    for (const k of rest.values()) if (k > 0) return null;
    return add; }
  function nuovaRT(w, h) { return new T3.WebGLRenderTarget(w, h, { minFilter: T3.NearestFilter, magFilter: T3.NearestFilter }); }
  // un pezzo della cottura in sottofondo: P.lotto cose ferme nella mappa di riserva, con la camera del lavoro
  function lavora(light, r, tutti) {
    const J = r.job, sh = light.shadow, m0 = sh.map; if (!m0) return false;
    if (!J.rt || J.rt.width !== m0.width || J.rt.height !== m0.height) { if (J.rt) J.rt.dispose(); J.rt = nuovaRT(m0.width, m0.height); J.i = 0; }
    const pos = J.G ? [light.position.clone(), light.target.position.clone()] : null;
    if (J.G) { metti(light, J.G); }
    const n = Math.min(J.list.length, J.i + P.lotto), part = J.list.slice(J.i, n);
    sh.map = J.rt; try { disegna(light, part, J.i === 0); } finally { sh.map = m0; }
    J.i = n; ST.lotti++;
    if (pos) { if (A.G) metti(light, A.G); else { light.position.copy(pos[0]); light.target.position.copy(pos[1]); light.updateMatrixWorld(); light.target.updateMatrixWorld(); } }
    sh.updateMatrices(light);
    return J.i >= J.list.length;
  }
  function luce(light, tutti) {
    const sh = light.shadow;
    let r = REC.get(light); if (!r) REC.set(light, r = { cache: null, key: new Float64Array(16), sig: -1, n: -1, dyn: 0, ver: 0, ids: null, job: null });
    let C = contenuto(light, tutti, r);
    const map = sh.map, misura = !map || !r.cache || r.cache.width !== map.width || r.cache.height !== map.height;
    let vecchia = C.sig !== r.sig || C.fermi.length !== r.n;
    // solo cose ferme in più (le scale dei tetti che crescono, un blocco che arriva): si disegnano sopra la mappa cotta, niente cottura intera
    // (la mappa d'ombra tiene la profondità più vicina: aggiungere chi fa ombra è esatto; togliere no, e allora si ricuoce)
    if (vecchia && !misura && !C.chiave && !r.job && r.fps && r.cache && sh.map && !(tutti && A.next)) {
      const add = aggiunte(r.fps, C.fermi);
      if (add) { copia(r.cache, sh.map); if (add.length) disegna(light, add, false); copia(sh.map, r.cache); r.sig = C.sig; r.n = C.fermi.length; r.fps = impronte(C.fermi); r.objs = C.fermi; vecchia = false; ST.aggiunte++; }
      else if (r.objs) {   // chi è sparito dalla mappa cotta (spento, tolto: le case tagliate dalla camera in strada, le scale rifatte) d'ora in poi
        // è un mobile: se torna e risparisce non chiede un'altra cottura intera (questa sì, per togliere la sua ombra)
        const qui = new Set(C.fermi); for (const o of r.objs) if (!qui.has(o) && o.__po) { o.__po.dyn = frame; o.__po.mosse = 2; } r.objs = null; } }
    if (misura || (C.chiave && tutti)) {   // niente da riusare: si cuoce subito (all'inizio, al cambio di zoom, oltre il margine)
      MOT[misura ? 'misura' : 'chiave']++; r.job = null;
      disegna(light, C.fermi, true); const m2 = sh.map;
      if (!r.cache || r.cache.width !== m2.width || r.cache.height !== m2.height) { if (r.cache) r.cache.dispose(); r.cache = nuovaRT(m2.width, m2.height); }
      copia(m2, r.cache); r.key.set(C.e); r.sig = C.sig; r.n = C.fermi.length; r.fps = impronte(C.fermi); r.objs = C.fermi; ST.cotture++;
      if (C.mob.length) disegna(light, C.mob, false);
    } else {
      if (C.chiave) {   // un faretto passato a un altro lampione: finché la mappa nuova non è pronta, la luce non fa ombra (mappa al fondo)
        disegna(light, EMPTY, true); copia(sh.map, r.cache); r.key.set(C.e); r.sig = -2; r.n = -1; r.fps = null; r.job = null; MOT.chiave++; }
      // il lavoro in sottofondo: verso l'aggancio nuovo del sole, o per le cose ferme cambiate sotto la stessa camera
      const vuole = tutti && A.next ? 'next' : (C.chiave || vecchia) ? 'qui' : null;
      if (vuole && (!r.job || r.job.tipo !== vuole || (vuole === 'next' && r.job.G !== A.next))) {
        let list = C.fermi, e = C.e, sig = C.sig, G = null;
        if (vuole === 'next') { const pos = [light.position.clone(), light.target.position.clone()]; G = A.next; metti(light, G); const C2 = contenuto(light, tutti, { key: new Float64Array(16), ver: -1 }); list = C2.fermi; e = C2.e; sig = C2.sig;
          if (A.G) metti(light, A.G); else { light.position.copy(pos[0]); light.target.position.copy(pos[1]); light.updateMatrixWorld(); light.target.updateMatrixWorld(); } sh.updateMatrices(light); r.ver++; }
        r.job = { tipo: vuole, list, i: 0, e, sig, n: list.length, G, rt: r.job ? r.job.rt : null }; if (vuole === 'qui') MOT.firma++; else MOT.aggancio++;
        if (DIAG.on && vuole === 'qui' && r.ids) { const now = new Set(C.fermi.map(o => o.id)), nome = o => { let q = o; while (q.parent && q.parent !== K.scene) q = q.parent; return (q.name || q.type) + (Object.keys(q.userData || {}).length ? ' {' + Object.keys(q.userData).slice(0, 3).join(',') + '}' : '') + ' > ' + (o.name || o.type); };
          C.fermi.forEach(o => { if (!r.ids.has(o.id)) { const k = '+ ' + nome(o); DIAG.firma.set(k, (DIAG.firma.get(k) || 0) + 1); } }); r.idsObj.forEach(o => { if (!now.has(o.id)) { const k = '- ' + nome(o); DIAG.firma.set(k, (DIAG.firma.get(k) || 0) + 1); } }); }
        if (DIAG.on) { r.ids = new Set(C.fermi.map(o => o.id)); r.idsObj = C.fermi.slice(); } }
      if (r.job && lavora(light, r, tutti)) {   // finita: la mappa di riserva diventa quella in uso
        const J = r.job, old = r.cache; r.cache = J.rt; r.key.set(J.e); r.sig = J.sig; r.n = J.n; r.fps = impronte(J.list); r.objs = J.list; r.job = null; ST.cotture++; ST.sottofondo++;
        if (old) { old.dispose(); }
        if (J.G) { A.G = J.G; if (A.next === J.G) A.next = null; metti(light, J.G); sh.updateMatrices(light); r.ver++; C = contenuto(light, tutti, r); } }
      if (C.mob.length || r.dyn) { copia(r.cache, sh.map); if (C.mob.length) disegna(light, C.mob, false); ST.riprese++; }
    }
    if (DIAG.on) C.mob.forEach(o => { let q = o; while (q.parent && q.parent !== K.scene) q = q.parent; const k = (o.isSkinnedMesh ? 'scheletro' : o.isInstancedMesh ? 'istanze' : 'mosso') + ' ' + (q.name || q.type) + (Object.keys(q.userData || {}).length ? ' {' + Object.keys(q.userData).slice(0, 3).join(',') + '}' : '') + ' > ' + (o.name || o.type); DIAG.mob.set(k, (DIAG.mob.get(k) || 0) + 1); });
    r.dyn = C.mob.length; ST.dinamici += C.mob.length; ST.fermi += C.fermi.length; ST.luci++;
    sh.autoUpdate = false; sh.needsUpdate = false;
  }
  // prima del disegno della scena: il sole agganciato (prima che three calcoli le luci); poi, dentro il disegno della scena, al posto della
  // passata d'ombra di three per le luci gestite qui: le mappe pronte (lì lo stato del disegno è valido e le matrici sono già aggiornate)
  let sh0 = null, attivo = true, giro = -1e9;
  function prima(kit) {
    if (!ON) return; K = kit; if (!T3) { T3 = window.THREE; root = new T3.Object3D(); sfera = new T3.Sphere(); vtmp = new T3.Vector3(); pm = new T3.Matrix4(); }
    const rd = K.renderer; if (!rd.shadowMap.enabled || !rd.capabilities.isWebGL2 || !attivo) return;
    if (!sh0) { const sm = rd.shadowMap; sh0 = sm.render; sm.render = function (lights, scene, camera) { if (attivo && K && scene === K.scene && sm.enabled) passata(); return sh0.apply(this, arguments); }; }
    const moon = K.moon; if (moon && moon.castShadow && moon.visible) sole();
  }
  function passata() {
    const rd = K.renderer, S = K.scene, t0 = performance.now(); frame++; ORA = t0;
    const moon = K.moon, sun = moon && moon.castShadow && moon.visible;
    const lst = []; if (sun) lst.push(moon);
    (K.spots || []).forEach(l => { const r = REC.get(l); if (l.castShadow && l.visible && (l.shadow.needsUpdate || l.shadow.autoUpdate || (r && r.job))) lst.push(l); });   // un faretto con la cottura a metà va avanti anche se il gioco non lo chiede
    if (lst.length) {
      const cur = rd.getRenderTarget(), cf = rd.getActiveCubeFace(), ml = rd.getActiveMipmapLevel();
      const cl = K.camera().layers;
      if (!CAST.length || frame - giro >= P.giro || A.rifai) { A.rifai = false; giro = frame; CAST.length = 0; TOPS.length = 0; raccogli(S, cl, null); for (let i = 0; i < CAST.length; i++) { const u = guarda(CAST[i]); u.top = TOPS[i]; u.ok = true; } }
      else for (let i = 0; i < CAST.length; i++) { const o = CAST[i], u = guarda(o); u.ok = o.visible && o.castShadow && (!mobile(o, u) || attaccato(o)); }
      ST.lanciatori = CAST.length;
      try { lst.forEach(l => luce(l, l === moon)); } catch (e) { console.warn('[peso] ombre', e); attivo = false; REC.forEach((r, l) => { l.shadow.autoUpdate = l === moon; l.shadow.needsUpdate = true; }); }
      rd.setRenderTarget(cur, cf, ml);
    }
    ST.fotogrammi++; ST.ms += performance.now() - t0;
  }
  function dopo() { }
  // spento: le mappe tornano quelle di three (il sole col riquadro e la mappa del gioco, ridisegnato a ogni fotogramma)
  function spegni() {
    REC.forEach((r, l) => { if (K && l === K.moon) l.shadow.autoUpdate = true; l.shadow.needsUpdate = true; r.sig = -1; });
    if (K && K.moon && A.base) { const m = K.moon, sc = m.shadow.camera; sc.left = -A.half; sc.right = A.half; sc.top = A.half; sc.bottom = -A.half; sc.updateProjectionMatrix(); A.halfSet = NaN; A.G = null; A.next = null; A.base = 0;
      if (m.shadow.mapSize.x !== A.base0) { m.shadow.mapSize.set(A.base0, A.base0); if (m.shadow.map) { m.shadow.map.dispose(); m.shadow.map = null; } } }
  }
  function conto() { const n = ST.fotogrammi || 1; return { on: ON, cotture: ST.cotture, sottofondo: ST.sottofondo, lotti: ST.lotti, riprese: ST.riprese, aggiunte: ST.aggiunte, fotogrammi: ST.fotogrammi, dinamici_fot: +(ST.dinamici / n).toFixed(1), fermi_fot: +(ST.fermi / n).toFixed(0), lanciatori: ST.lanciatori, ms_fot: +(ST.ms / n).toFixed(2), mappa_sole: K && K.moon ? K.moon.shadow.mapSize.x : 0 }; }
  function azzera() { for (const k in ST) ST[k] = 0; for (const k in MOT) MOT[k] = 0; DIAG.mob.clear(); DIAG.firma.clear(); }
  function diag(on) { DIAG.on = on !== false; return { motivi: Object.assign({}, MOT), mobili: [...DIAG.mob.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25), firma: [...DIAG.firma.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25) }; }
  return { ON, P, prima, dopo, conto, azzera, diag, get attivo() { return attivo; }, set attivo(v) { attivo = !!v; if (!attivo) spegni(); } };
})();
if (typeof window !== 'undefined') { window.PesoOmbre = PesoOmbre; (window.__pesoAB = window.__pesoAB || {}).ombre = v => { PesoOmbre.attivo = v; }; if (PesoOmbre.ON) window.__pesoAB.stretta = v => { window.__nostretta = !v; }; }
