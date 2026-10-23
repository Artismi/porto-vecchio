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
  const ON = !/[?&]nopesoombre\b/.test(Q);
  const P = { M: 8, ang: .0026, ferma: 90, giro: 8 };
  const MOT = { chiave: 0, firma: 0, misura: 0 }, DIAG = { on: false, mob: new Map(), firma: new Map() };
  const ST = { cotture: 0, riprese: 0, dinamici: 0, fermi: 0, lanciatori: 0, luci: 0, ms: 0, fotogrammi: 0 };
  const REC = new Map();
  const EMPTY = [], A = { half: 0, halfSet: NaN, base: 0, d: null, T: null, D: 0 };
  let K = null, frame = 0, root = null, T3 = null, sfera = null, vtmp = null, pm = null, noop = () => { };
  const CAST = [], TOPS = [];

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
    if (!u) { u = o.__po = { e: new Float64Array(7), dyn: -1e9, v: -1, c: new T3.Vector3(), r: 0, f: -1, sk: -1, sin: false, top: null }; u.e[0] = e[0]; u.e[1] = e[1]; u.e[2] = e[2]; u.e[3] = e[6]; u.e[4] = e[12]; u.e[5] = e[13]; u.e[6] = e[14]; u.v = o.isInstancedMesh ? o.instanceMatrix.version : 0; }
    else if (u.e[4] !== e[12] || u.e[5] !== e[13] || u.e[6] !== e[14] || u.e[0] !== e[0] || u.e[1] !== e[1] || u.e[2] !== e[2] || u.e[3] !== e[6]) {
      u.e[0] = e[0]; u.e[1] = e[1]; u.e[2] = e[2]; u.e[3] = e[6]; u.e[4] = e[12]; u.e[5] = e[13]; u.e[6] = e[14]; u.dyn = frame; u.f = -1; }
    if (o.isInstancedMesh && o.instanceMatrix.version !== u.v) { u.v = o.instanceMatrix.version; u.dyn = frame; u.f = -1; }
    return u;
  }
  const mobile = (o, u) => o.isSkinnedMesh || frame - u.dyn < P.ferma || (u.top && u.top.__poPers);
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
  // il sole: il centro agganciato alla griglia dei texel, fermo finché la camera resta entro P.M metri; la direzione a scatti
  function sole() {
    const m = K.moon, sc = m.shadow.camera, T = m.target.position, Pp = m.position;
    if (!A.base) A.base = m.shadow.mapSize.x;
    if (sc.right !== A.halfSet) A.half = sc.right;   // il gioco ha cambiato il riquadro (profSole lo tocca solo quando cambia)
    const tex = 2 * A.half / A.base, ms = Math.ceil(2 * (A.half + P.M) / tex), halfE = ms * tex / 2;
    if (m.shadow.mapSize.x !== ms) { m.shadow.mapSize.set(ms, ms); if (m.shadow.map) { m.shadow.map.dispose(); m.shadow.map = null; } }
    if (sc.right !== halfE) { sc.left = -halfE; sc.right = halfE; sc.top = halfE; sc.bottom = -halfE; sc.updateProjectionMatrix(); } A.halfSet = halfE;
    let dx = T.x - Pp.x, dy = T.y - Pp.y, dz = T.z - Pp.z; const D = Math.hypot(dx, dy, dz) || 1; dx /= D; dy /= D; dz /= D;
    let nuova = !A.d || Math.abs(D - A.D) > 1;   // la distanza del sole cambia appena con l'ora: conta solo per il piano vicino e il lontano
    if (!nuova) { const c = dx * A.d.x + dy * A.d.y + dz * A.d.z; if (Math.acos(Math.min(1, c)) > P.ang) nuova = true; }
    if (nuova) { A.d = new T3.Vector3(dx, dy, dz); A.D = D;
      const z = A.d.clone().negate(), x = new T3.Vector3(0, 1, 0).cross(z); if (x.lengthSq() < 1e-12) x.set(1, 0, 0); x.normalize(); A.x = x; A.y = z.clone().cross(x); A.T = null; }
    const a = T.x * A.x.x + T.y * A.x.y + T.z * A.x.z, b = T.x * A.y.x + T.y * A.y.y + T.z * A.y.z;
    vtmp.copy(T).addScaledVector(A.x, Math.round(a / tex) * tex - a).addScaledVector(A.y, Math.round(b / tex) * tex - b);
    if (A.T) { const ex = (vtmp.x - A.T.x) * A.x.x + (vtmp.y - A.T.y) * A.x.y + (vtmp.z - A.T.z) * A.x.z, ey = (vtmp.x - A.T.x) * A.y.x + (vtmp.y - A.T.y) * A.y.y + (vtmp.z - A.T.z) * A.y.z;
      if (Math.abs(ex) > P.M - tex || Math.abs(ey) > P.M - tex || A.tex !== tex) A.T = null; }
    if (!A.T) { A.T = vtmp.clone(); A.tex = tex; }
    T.copy(A.T); Pp.copy(A.T).addScaledVector(A.d, -A.D); m.updateMatrixWorld(); m.target.updateMatrixWorld();
  }
  function luce(light, tutti) {
    const sh = light.shadow; sh.updateMatrices(light); const cam = sh.camera, fz = sh.getFrustum();
    pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    let r = REC.get(light); if (!r) REC.set(light, r = { cache: null, key: new Float64Array(16), sig: -1, n: -1, dyn: 0, ver: 0, ids: null });
    const e = pm.elements; let chiave = false; for (let k = 0; k < 16; k++) if (e[k] !== r.key[k]) { chiave = true; break; }
    if (chiave && tutti) r.ver++;   // il sole: la risposta «dentro il riquadro» di ogni cosa ferma vale finché la camera dell'ombra non cambia
    const fermi = [], mob = [], lp = light.position, R2 = tutti ? 0 : (light.distance || 30) + 1; let sig = 0;
    for (let i = 0; i < CAST.length; i++) { const o = CAST[i], u = o.__po; if (!u.ok) continue; const mv = mobile(o, u);
      if (o.frustumCulled) {
        if (!tutti) { sferaDi(o, u); const rr = R2 + u.r, ddx = u.c.x - lp.x, ddy = u.c.y - lp.y, ddz = u.c.z - lp.z; if (ddx * ddx + ddy * ddy + ddz * ddz > rr * rr) continue; if (!fz.intersectsObject(o)) continue; }
        else if (!mv && u.sk === r.ver && u.dynS === u.dyn) { if (!u.sin) continue; }
        else { u.sin = fz.intersectsObject(o); u.sk = r.ver; u.dynS = u.dyn; if (!u.sin) continue; } }
      if (mv) mob.push(o); else { fermi.push(o); sig += o.id * 7919 + (o.geometry ? o.geometry.id : 0) * 104729 + (o.material ? o.material.id : 0); } }
    const map = sh.map, cotta = !map || !r.cache || r.cache.width !== map.width || r.cache.height !== map.height || chiave || sig !== r.sig || fermi.length !== r.n;
    if (cotta) { if (!map || !r.cache || r.cache.width !== map.width) MOT.misura++; else if (chiave) MOT.chiave++; else { MOT.firma++;
        if (DIAG.on && r.ids) { const now = new Set(fermi.map(o => o.id)), nome = o => { let q = o; while (q.parent && q.parent !== K.scene) q = q.parent; return (q.name || q.type) + (Object.keys(q.userData || {}).length ? ' {' + Object.keys(q.userData).slice(0, 3).join(',') + '}' : '') + ' > ' + (o.name || o.type); };
          fermi.forEach(o => { if (!r.ids.has(o.id)) { const k = '+ ' + nome(o); DIAG.firma.set(k, (DIAG.firma.get(k) || 0) + 1); } }); r.idsObj.forEach(o => { if (!now.has(o.id)) { const k = '- ' + nome(o) + (o.visible ? '' : ' (spento)') + (o.castShadow ? '' : ' (senza ombra)') + (mobile(o, o.__po) ? ' (mobile)' : ''); DIAG.firma.set(k, (DIAG.firma.get(k) || 0) + 1); } }); } }
      if (DIAG.on) { r.ids = new Set(fermi.map(o => o.id)); r.idsObj = fermi.slice(); }
      disegna(light, fermi, true); const m2 = sh.map;
      if (!r.cache || r.cache.width !== m2.width || r.cache.height !== m2.height) { if (r.cache) r.cache.dispose(); r.cache = new T3.WebGLRenderTarget(m2.width, m2.height, { minFilter: T3.NearestFilter, magFilter: T3.NearestFilter }); }
      copia(m2, r.cache); r.key.set(e); r.sig = sig; r.n = fermi.length; ST.cotture++;
      if (mob.length) disegna(light, mob, false);
    } else if (mob.length || r.dyn) { copia(r.cache, map); if (mob.length) disegna(light, mob, false); ST.riprese++; }
    if (DIAG.on) mob.forEach(o => { let q = o; while (q.parent && q.parent !== K.scene) q = q.parent; const u = o.__po, k = (o.isSkinnedMesh ? 'scheletro' : o.isInstancedMesh ? 'istanze' : 'mosso') + ' ' + (q.name || q.type) + (Object.keys(q.userData || {}).length ? ' {' + Object.keys(q.userData).slice(0, 3).join(',') + '}' : '') + ' > ' + (o.name || o.type); DIAG.mob.set(k, (DIAG.mob.get(k) || 0) + 1); });
    r.dyn = mob.length; ST.dinamici += mob.length; ST.fermi += fermi.length; ST.luci++;
    sh.autoUpdate = false; sh.needsUpdate = false;
  }
  // prima del disegno della scena: il sole agganciato (prima che three calcoli le luci); poi, dentro il disegno della scena, al posto della
  // passata d'ombra di three per le luci gestite qui: le mappe pronte (lì lo stato del disegno è valido e le matrici sono già aggiornate)
  let sh0 = null, attivo = true, giro = -1e9;
  function prima(kit) {
    if (!ON) return; K = kit; if (!T3) { T3 = window.THREE; root = new T3.Object3D(); sfera = new T3.Sphere(); vtmp = new T3.Vector3(); pm = new T3.Matrix4(); }
    const rd = K.renderer; if (!rd.shadowMap.enabled || !rd.capabilities.isWebGL2 || !attivo) return;
    if (!sh0) { const sm = rd.shadowMap; sh0 = sm.render; sm.render = function (lights, scene, camera) { if (attivo && K && scene === K.scene) passata(); return sh0.apply(this, arguments); }; }
    const moon = K.moon; if (moon && moon.castShadow && moon.visible) sole();
  }
  function passata() {
    const rd = K.renderer, S = K.scene, t0 = performance.now(); frame++;
    const moon = K.moon, sun = moon && moon.castShadow && moon.visible;
    const lst = []; if (sun) lst.push(moon);
    (K.spots || []).forEach(l => { if (l.castShadow && l.visible && (l.shadow.needsUpdate || l.shadow.autoUpdate)) lst.push(l); });
    if (lst.length) {
      const cur = rd.getRenderTarget(), cf = rd.getActiveCubeFace(), ml = rd.getActiveMipmapLevel();
      const cl = K.camera().layers;
      if (!CAST.length || frame - giro >= P.giro) { giro = frame; CAST.length = 0; TOPS.length = 0; raccogli(S, cl, null); for (let i = 0; i < CAST.length; i++) { const u = guarda(CAST[i]); u.top = TOPS[i]; u.ok = true; } }
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
    if (K && K.moon && A.base) { const m = K.moon, sc = m.shadow.camera; sc.left = -A.half; sc.right = A.half; sc.top = A.half; sc.bottom = -A.half; sc.updateProjectionMatrix(); A.halfSet = NaN; A.T = null; A.d = null;
      if (m.shadow.mapSize.x !== A.base) { m.shadow.mapSize.set(A.base, A.base); if (m.shadow.map) { m.shadow.map.dispose(); m.shadow.map = null; } } }
  }
  function conto() { const n = ST.fotogrammi || 1; return { on: ON, cotture: ST.cotture, riprese: ST.riprese, fotogrammi: ST.fotogrammi, dinamici_fot: +(ST.dinamici / n).toFixed(1), fermi_fot: +(ST.fermi / n).toFixed(0), lanciatori: ST.lanciatori, ms_fot: +(ST.ms / n).toFixed(2), mappa_sole: K && K.moon ? K.moon.shadow.mapSize.x : 0 }; }
  function azzera() { for (const k in ST) ST[k] = 0; for (const k in MOT) MOT[k] = 0; DIAG.mob.clear(); DIAG.firma.clear(); }
  function diag(on) { DIAG.on = on !== false; return { motivi: Object.assign({}, MOT), mobili: [...DIAG.mob.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25), firma: [...DIAG.firma.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25) }; }
  return { ON, P, prima, dopo, conto, azzera, diag, get attivo() { return attivo; }, set attivo(v) { attivo = !!v; if (!attivo) spegni(); } };
})();
if (typeof window !== 'undefined') { window.PesoOmbre = PesoOmbre; (window.__pesoAB = window.__pesoAB || {}).ombre = v => { PesoOmbre.attivo = v; }; }
