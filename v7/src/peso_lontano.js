/* Porto Vecchio — [peso] le cose piccole lontane (v7).
   Dalla camera alta e dalla città vista dall'alto (zoom 4) migliaia di pezzi piccoli (cartacce, vasi, sassi, insegne, pezzi minori degli
   scorci) stanno sotto il pixel: three li disegna lo stesso, uno per uno. Qui, solo nel passaggio principale della scena (non nelle ombre,
   non per chi chiede «si vede?» per la logica), un oggetto il cui raggio sullo schermo è sotto P.px pixel (di default mezzo: meno di un
   pixel di diametro alla risoluzione interna) non si disegna. Solo oggetti piccoli (raggio sotto P.rMax metri): case, settori fusi,
   gruppi di istanze, persone non si toccano mai. La segnaletica e le insegne nuove ci cadono dentro da sole quando sono lontane.
   ?nopesolontano lo spegne.                                                                                                            */
var PesoLontano = (function () {
  'use strict';
  const Q = typeof location !== 'undefined' ? location.search : '';
  const ON = !/[?&]nopesolontano\b/.test(Q);
  const P = { px: .5, rMax: 2.5 };
  const ST = { tagliati: 0, provati: 0 };
  let K = null, attivo = true, pronto = false, inMain = 0, inShadow = 0, kpx = 0, cx = 0, cy = 0, cz = 0, s = null;
  function installa() {
    const T3 = window.THREE, rd = K.renderer, sm = rd.shadowMap; s = new T3.Sphere();
    const r0 = rd.render; rd.render = function (scene, camera) { const m = scene === K.scene && camera === K.camera(); if (m) inMain++; try { return r0.apply(this, arguments); } finally { if (m) inMain--; } };
    const s0 = sm.render; sm.render = function () { inShadow++; try { return s0.apply(this, arguments); } finally { inShadow--; } };
    const io = T3.Frustum.prototype.intersectsObject;
    T3.Frustum.prototype.intersectsObject = function (o) {
      if (!inMain || inShadow || !attivo || o.__icS || o.__icR || o.isSkinnedMesh || o.isInstancedMesh) return io.call(this, o);
      const g = o.geometry; if (!g || !g.attributes || !g.attributes.position) return io.call(this, o);
      if (g.boundingSphere === null) g.computeBoundingSphere();
      s.copy(g.boundingSphere).applyMatrix4(o.matrixWorld);
      if (s.radius < P.rMax) { ST.provati++; const dx = s.center.x - cx, dy = s.center.y - cy, dz = s.center.z - cz, d = Math.sqrt(dx * dx + dy * dy + dz * dz); if (s.radius * kpx < P.px * d) { ST.tagliati++; return false; } }
      return this.intersectsSphere(s); };
    pronto = true;
  }
  // prima del disegno: la scala dei pixel (alla risoluzione interna) e la posizione della camera
  function prima(kit) {
    if (!ON) return; K = kit; if (!pronto) installa();
    const cam = K.camera(); if (!cam.isPerspectiveCamera) { kpx = 0; return; }
    kpx = (K.H / 2) / Math.tan(cam.fov * Math.PI / 360) * (cam.zoom || 1); const e = cam.matrixWorld.elements; cx = e[12]; cy = e[13]; cz = e[14];
  }
  function conto() { return Object.assign({ on: ON }, ST); }
  function azzera() { ST.tagliati = 0; ST.provati = 0; }
  return { ON, P, prima, conto, azzera, get attivo() { return attivo; }, set attivo(v) { attivo = !!v; } };
})();
if (typeof window !== 'undefined') { window.PesoLontano = PesoLontano; (window.__pesoAB = window.__pesoAB || {}).lontano = v => { PesoLontano.attivo = v; }; }
