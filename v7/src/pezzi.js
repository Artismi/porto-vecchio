/* Porto Vecchio — I pezzi: la roba di cui sono fatti i covi (sui riferimenti: The Last of Us II, 60 Nights, i banchi d'officina).
   Pallet, sacchi di sabbia, casse militari, cassette degli attrezzi, morse, pannelli forati con gli attrezzi appesi, lampade da banco,
   fari da cantiere, taniche, estintori, radio, televisori, armadietti, letti a castello, generatori, bobine di cavo, teli…
   Ogni funzione aggiunge al gruppo g, in metri, col davanti verso +z. Le postazioni del Cantiere sono composte con questi.
   Nomi delle parti animate: fiamma, luce, led, rullo, ago, morsa, schermo, ventola. */
var Pezzi = (function () {
  'use strict';
  const M = {};
  const mat = (c, o) => { const k = c + JSON.stringify(o || {}); return M[k] || (M[k] = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .82, metalness: 0 }, o || {}))); };
  const MET = { metalness: .3, roughness: .45 }, GLOW = c => ({ emissive: c, emissiveIntensity: 1 });
  function bx(g, w, h, d, c, x, y, z, o, ry, rx, rz) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, o)); m.position.set(x || 0, y || 0, z || 0); m.rotation.set(rx || 0, ry || 0, rz || 0); m.castShadow = m.receiveShadow = true; g.add(m); return m; }
  function cy(g, r0, r1, h, c, x, y, z, o, rx, rz, n) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, n || 14), mat(c, o)); m.position.set(x || 0, y || 0, z || 0); m.rotation.set(rx || 0, 0, rz || 0); m.castShadow = m.receiveShadow = true; g.add(m); return m; }
  function sp(g, r, c, x, y, z, o, sx, sy, sz) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), mat(c, o)); m.position.set(x || 0, y || 0, z || 0); m.scale.set(sx || 1, sy || 1, sz || 1); m.castShadow = true; g.add(m); return m; }
  const named = (m, n) => { m.name = n; m.material = m.material.clone(); return m; };
  const sub = (g, x, y, z, ry) => { const s = new THREE.Group(); s.position.set(x || 0, y || 0, z || 0); s.rotation.y = ry || 0; g.add(s); return s; };
  const R = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(7);
  // [modelli] aste e tubi da un punto all'altro: gambe, bracci, tubi e cavi finiscono dove devono, niente pezzi staccati
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z); let UPV = null;
  function lungo(m, a, b) { const d = b.clone().sub(a), l = d.length(); m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(UPV || (UPV = V3(0, 1, 0)), d.normalize()); m.scale.y = l; return m; }
  function asta(g, a, b, s, c, o) { const m = new THREE.Mesh(new THREE.BoxGeometry(s, 1, s), mat(c, o)); m.castShadow = m.receiveShadow = true; g.add(m); return lungo(m, V3(...a), V3(...b)); }
  function tubo(g, a, b, r, c, o, n) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, n || 8), mat(c, o)); m.castShadow = true; g.add(m); return lungo(m, V3(...a), V3(...b)); }
  // un tubo flessibile che passa per più punti (cavi, tubi di gomma)
  function cavo(g, pts, r, c) { const cur = new THREE.CatmullRomCurve3(pts.map(p => V3(...p))); const m = new THREE.Mesh(new THREE.TubeGeometry(cur, pts.length * 6, r, 6), mat(c)); m.castShadow = true; g.add(m); return m; }
  // un modello scaricato (scaricati.js) al posto di quello fatto a mano, con le misure date; null se non c'è (ancora)
  function dl(g, id, x, y, z, ry, sx, sy, sz) { if (typeof Scaricati === 'undefined') return null; const o = Scaricati.get(id); if (!o) return null; o.position.set(x || 0, y || 0, z || 0); o.rotation.y = ry || 0; if (sx) o.scale.set(sx, sy || sx, sz || sx); g.add(o); return o; }

  function pallet(g, x, y, z, ry) { const s = sub(g, x, y, z, ry); if (dl(s, 'pallet', 0, 0, 0, 0, 1, 1, .86 / 1.03)) return s; for (let i = 0; i < 5; i++) bx(s, 1.2, .025, .14, '#a88a5e', 0, .13, -.36 + i * .18); for (const zz of [-.36, 0, .36]) bx(s, 1.2, .09, .1, '#8a6e48', 0, .07, zz); for (let i = 0; i < 5; i++) bx(s, 1.2, .025, .14, '#9a7e52', 0, .012, -.36 + i * .18); return s; }
  // [modelli] sacchi di sabbia: quelli del Toon Shooter; a mano, cuscini di juta a capsula sfalsati come mattoni, col capo legato
  function sacchi(g, x, y, z, ry, file, righe) {
    const s = sub(g, x, y, z, ry), F = file || 3, Rr = righe || 3, W = F * .52 + .08, H = Rr * .2;
    if (dl(s, 'sacchi', 0, 0, 0, 0, W / 1.6, H / .65, .45 / .59)) return s;
    for (let r = 0; r < Rr; r++) for (let i = 0; i < F - (r % 2); i++) {
      const xx = (i - (F - (r % 2)) / 2 + .5) * .52, c = ['#8a7d5a', '#7d7150', '#94875f'][(i + r) % 3];
      const b = new THREE.Mesh(new THREE.CapsuleGeometry(.12, .26, 3, 10), mat(c, { roughness: 1 })); b.rotation.z = Math.PI / 2; b.scale.set(.85, 1, 1.6); b.position.set(xx, .1 + r * .19, (R() - .5) * .03); b.castShadow = b.receiveShadow = true; s.add(b);
      cy(s, .03, .045, .06, c, xx + .27, .1 + r * .19, 0, {}, 0, Math.PI / 2, 6);
    }
    return s;
  }
  // [modelli] cassa militare di legno verniciato: doghe, cornici di rinforzo, angolari di ferro, maniglie di corda nei loro supporti, chiusure, stampigliatura
  function cassaMil(g, w, h, d, c, x, y, z, ry) {
    const s = sub(g, x, y, z, ry), Mo = Modella, o = { roughness: .7 };
    Mo.guscio(s, w, h, d, c, o, .012, .008); for (let i = 1; i < 4; i++) Mo.guscio(s, w * .995, .004, d + .004, '#2a3022', {}, .01, .001, 0, h * i / 4, 0);
    Mo.guscio(s, w + .02, .05, d + .02, c, o, .012, .01, 0, h - .05, 0); Mo.guscio(s, w + .02, .04, d + .02, c, o, .012, .01, 0, 0, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const a = sub(s, sx * (w / 2 - .02), 0, sz * (d / 2 - .02)); Mo.guscio(a, .05, h + .01, .05, '#3a3c3a', Mo.MET, .01, .004); }
    for (const sx of [-1, 1]) { const f = sub(s, sx * w / 2, h * .6, 0); f.rotation.y = sx * Math.PI / 2; Mo.lastra(f, .14, .05, .015, '#2a2e2a', Mo.MET, .01, 0, 0, 0); Mo.tuboPiegato(f, [[-.05, 0, .02], [-.04, -.05, .04], [.04, -.05, .04], [.05, 0, .02]], .007, '#b8a878', { roughness: 1 }, .02); }
    for (const xx of [-w / 3, w / 3]) { Mo.guscio(s, .07, .05, .015, '#3a3a3a', Mo.MET, .008, .004, xx, h - .09, d / 2 + .005); }
    Mo.targa(s, 'MUNIZ. 7,62\nLOTTO 84-11', w * .45, h * .3, 0, h * .45, d / 2 + .006, 0, c, '#e0d080');
    return s;
  }
  function cassaLegno(g, w, h, d, x, y, z, ry) { const s = sub(g, x, y, z, ry); if (dl(s, 'cassa', 0, 0, 0, 0, w / .6, h / .6, d / .6)) return s; bx(s, w, h, d, '#9a7a4e', 0, h / 2, 0); for (const yy of [.15, .5, .85]) bx(s, w + .01, .05, d + .01, '#7a5a34', 0, h * yy, 0); for (const a of [-1, 1]) for (const b of [-1, 1]) bx(s, .05, h, .05, '#6a4c2c', a * (w / 2 - .02), h / 2, b * (d / 2 - .02)); return s; }
  // [modelli] cavalletti ad A: trave in testa, quattro gambe aperte che toccano terra, traversa a metà
  function cavalletti(g, w, x, y, z) {
    const s = sub(g, x, y, z), C = '#6a5a44', H = .78;
    for (const xx of [-w / 2 + .2, w / 2 - .2]) {
      bx(s, .07, .06, .64, C, xx, H - .03, 0);
      for (const zz of [-.26, .26]) for (const sx of [-1, 1]) asta(s, [xx + sx * .02, H - .05, zz], [xx + sx * .13, 0, zz * 1.25], .045, C);
      for (const zz of [-.3, .3]) asta(s, [xx - .09, .3, zz * 1.05], [xx + .09, .3, zz * 1.05], .03, C);
    }
    return s;
  }

  // ---------------- PIANI E PANNELLI ----------------
  function piano(g, w, d, y, c, x, z) { bx(g, w, .05, d, c || '#b08a5a', x || 0, y, z || 0); bx(g, w + .01, .012, d * .2, '#7a5a3a', x || 0, y + .03, (z || 0) + d * .3); }
  function telo(g, w, d, y, x, z) { const t = bx(g, w * .6, .015, d + .02, '#8a8a70', x || 0, y + .02, z || 0); const h = bx(g, w * .6, .4, .015, '#7a7a62', x || 0, y - .18, (z || 0) + d / 2 + .01); h.rotation.x = .08; return t; }
  // pannello forato con gli attrezzi appesi ai ganci, il foglio delle misure, il rotolo di nastro sul suo chiodo
  function pannello(g, w, h, x, y, z) {
    const s = sub(g, x, y, z); bx(s, w, h, .03, '#b8a07a', 0, h / 2, 0); bx(s, w + .04, .04, .05, '#8a7050', 0, h, 0); bx(s, w + .04, .04, .05, '#8a7050', 0, 0, 0);
    for (let j = 0; j < 6; j++) for (let i = 0; i < 10; i++) bx(s, .012, .012, .005, '#5a4a34', -w / 2 + .1 + i * (w - .2) / 9, .12 + j * (h - .24) / 5, .017);
    const T = [['#c83a2a', .32], ['#2a5ac8', .24], ['#e8c040', .28], ['#c8c8d0', .3], ['#3a3a3a', .26], ['#c83a2a', .22]];
    T.forEach(([c, l], i) => { const xx = -w / 2 + .18 + i * (w - .45) / 5, top = h * .78; bx(s, .012, .012, .05, '#3a3a3a', xx, top, .04, MET); bx(s, .02, l * .45, .012, '#a8acb4', xx, top - .02 - l * .225, .06, MET); bx(s, .034, l * .5, .028, c, xx, top - .02 - l * .45 - l * .25, .06); });
    bx(s, .22, .3, .005, '#f0ece0', w / 2 - .2, h * .5, .02); bx(s, .16, .02, .006, '#3a3a3a', w / 2 - .2, h * .58, .024); bx(s, .18, .1, .006, '#5a7ab0', w / 2 - .2, h * .44, .024);
    bx(s, .012, .012, .07, '#3a3a3a', -w / 2 + .3, h * .3, .05, MET); const rot = cy(s, .07, .07, .05, '#d8c890', -w / 2 + .3, h * .3 - .06, .08, {}, Math.PI / 2); cy(s, .035, .035, .052, '#8a7050', -w / 2 + .3, h * .3 - .06, .08, {}, Math.PI / 2);
    return s;
  }
  // [modelli] morsa da banco: base girevole coi bulloni, corpo, ganascia fissa e mobile ('morsa') con le piastrine zigrinate, vite e leva coi pomelli
  function morsa(g, x, y, z, ry) {
    const s = sub(g, x, y, z, ry), Mo = Modella, C = '#2e4f7a', o = { metalness: .35, roughness: .5 };
    Mo.tornito(s, [[0, 0], [.08, 0], [.08, .02], [.06, .03], [0, .03]], C, o, 0, 0, -.02, 18); Mo.bulloni(s, [-.06, .02, -.06], [.06, .02, .02], 2, 'y', .008);
    Mo.guscio(s, .1, .07, .2, C, o, .015, .008, 0, .03, 0);
    Mo.guscio(s, .14, .07, .05, C, o, .01, .008, 0, .09, -.07); Mo.guscio(s, .13, .03, .006, '#6a6c70', Mo.MET, .003, .002, 0, .12, -.043);
    const mb = new THREE.Group(); mb.name = 'morsa'; mb.position.set(0, 0, .02); s.add(mb);
    Mo.guscio(mb, .14, .07, .05, C, o, .01, .008, 0, .09, 0); Mo.guscio(mb, .13, .03, .006, '#6a6c70', Mo.MET, .003, .002, 0, .12, -.028);
    Mo.asta(s, [0, .1, .04], [0, .1, .12], .011, '#c8ccd4', Mo.MET); Mo.asta(s, [-.08, .1, .12], [.08, .1, .12], .006, '#c8ccd4', Mo.MET);
    for (const xx of [-.085, .085]) Mo.put(s, new THREE.SphereGeometry(.012, 8, 6), '#c8ccd4', Mo.MET, xx, .1, .12);
    return s;
  }
  // [modelli] cassetta degli attrezzi in lamiera: corpo, coperchio a due falde con la maniglia, chiusure a leva con l'occhiello del lucchetto, cerniere, nervature, adesivo
  function cassetta(g, x, y, z, ry, c) {
    const s = sub(g, x, y, z, ry), Mo = Modella, C = c || '#b02a22', o = { roughness: .45, metalness: .2 };
    Mo.guscio(s, .5, .17, .22, C, o, .02, .008); for (const yy of [.05, .11]) Mo.guscio(s, .505, .008, .225, C, o, .02, .003, 0, yy, 0);
    Mo.guscio(s, .51, .03, .23, C, o, .02, .006, 0, .17, 0); const t1 = Mo.guscio(s, .5, .02, .12, C, o, .02, .005, 0, .2, -.045); t1.rotation.x = -.18; const t2 = Mo.guscio(s, .5, .02, .12, C, o, .02, .005, 0, .2, .045); t2.rotation.x = .18;
    Mo.maniglia(s, [-.1, .225, 0], [.1, .225, 0], .045, .01, '#1a1a1a');
    for (const xx of [-.18, .18]) { Mo.guscio(s, .04, .06, .015, '#9a9ea6', Mo.MET, .005, .003, xx, .13, .112); Mo.tuboPiegato(s, [[xx - .01, .19, .118], [xx - .01, .205, .124], [xx + .01, .205, .124], [xx + .01, .19, .118]], .003, '#9a9ea6', Mo.MET, .004); }
    for (const xx of [-.15, .15]) Mo.cerniera(s, xx, .185, -.112, .03);
    Mo.targa(s, 'BETA', .08, .03, -.06, .085, .112, 0, '#e8e0c8', '#b02a22');
    return s;
  }
  // [modelli] lampada da banco snodata: base, braccio in due pezzi con le molle, paralume conico con la lampadina dentro
  function lampada(g, x, y, z, ry) {
    const s = sub(g, x, y, z, ry), C = '#2a2a2e'; cy(s, .08, .09, .03, C, 0, .015, 0); cy(s, .02, .02, .04, C, 0, .05, 0);
    const a = [0, .06, 0], b = [.07, .33, 0], c = [.25, .4, 0]; asta(s, a, b, .02, C); asta(s, b, c, .02, C); sp(s, .022, '#5a5a60', ...b, MET);
    asta(s, [.01, .1, .02], [.06, .28, .02], .006, '#a8acb4', MET); asta(s, [.1, .34, .02], [.22, .39, .02], .006, '#a8acb4', MET);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(.025, .085, .12, 14, 1, true), mat('#3a5a8a', { side: THREE.DoubleSide })); sh.position.set(.28, .37, 0); sh.rotation.z = .5; sh.castShadow = true; s.add(sh);
    named(sp(s, .035, '#fff0c0', .3, .34, 0, GLOW('#ffd890')), 'luce'); return s;
  }
  // [modelli] terminale anni '80: guscio color avorio rastremato con le feritoie, cornice arrotondata, schermo bombato verde, piedistallo, tastiera coi tasti a gradini, cavo a spirale
  function crt(g, x, y, z, ry, c) {
    const s = sub(g, x, y, z, ry), Mo = Modella, C = c || '#d8d0b8', o = { roughness: .6 };
    Mo.guscio(s, .3, .03, .26, C, o, .03, .01, 0, 0, .02); Mo.tornito(s, [[0, 0], [.05, 0], [.04, .05], [0, .05]], C, o, 0, .03, .02);
    const t = sub(s, 0, .08, 0); t.rotation.x = -.06;
    Mo.guscio(t, .42, .34, .2, C, o, .04, .02, 0, 0, .08); Mo.guscio(t, .34, .28, .16, C, o, .05, .02, 0, .03, -.08); Mo.guscio(t, .26, .2, .1, '#c8c0a8', o, .04, .015, 0, .07, -.2);
    Mo.griglia(t, .2, .06, 3, 8, 0, .2, -.15, '#4a463c').rotation.y = Math.PI; for (const sx of [-1, 1]) { const f = Mo.griglia(t, .1, .1, 4, 3, sx * .2, .18, .0, '#4a463c'); f.rotation.y = sx * Math.PI / 2; }
    Mo.lastra(t, .36, .28, .012, '#b8b098', o, .03, 0, .17, .18); const sc = Mo.schermo(t, .29, .22, .02, '#2a3a3a', 0, .17, .19); named(sc, 'schermo'); sc.material.emissive = new THREE.Color('#2a5a48'); sc.material.emissiveIntensity = .8;
    Mo.targa(t, 'OLIVETTI-ish', .001, .001, 0, 0, 0); t.remove(t.children[t.children.length - 1]); Mo.targa(t, 'TELE-80', .06, .015, -.12, .03, .186, 0, '#b8b098', '#5a5448');
    Mo.levetta(t, .14, .03, .186, .01);
    const k = sub(s, 0, 0, .3); k.rotation.x = .08; Mo.guscio(k, .42, .03, .15, C, o, .015, .008);
    for (let r = 0; r < 4; r++) for (let i = 0; i < 13 - (r === 3 ? 4 : 0); i++) Mo.guscio(k, r === 3 ? .12 : .024, .014, .024, r === 0 ? '#8a8270' : '#e8e2d0', o, .004, .003, r === 3 ? 0 : -.17 + i * .028 + r * .006, .03, -.05 + r * .03);
    Mo.cavo(s, [[0, .03, .24], [.05, .02, .26], [-.03, .02, .28], [.04, .02, .3], [0, .02, .3]], .004, '#2a2a2a');
    return s;
  }
  // [modelli] televisore anni '70 in mobile di legno: cassa coi bordi arrotondati, tubo bombato con la cornice, griglia dell'altoparlante, manopole e tasti dei canali, piedini, antenna a V col suo pomello
  function tv(g, x, y, z, ry) {
    const s = sub(g, x, y, z, ry), Mo = Modella, W = '#6a4024';
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) Mo.tornito(s, [[0, 0], [.015, 0], [.012, .03], [0, .03]], '#1a1a1a', {}, sx * .22, 0, sz * .14, 8);
    Mo.guscio(s, .56, .4, .38, W, {}, .04, .02, 0, .03, 0); Mo.guscio(s, .4, .28, .14, '#3a2a1e', {}, .06, .02, 0, .09, -.22);
    Mo.lastra(s, .4, .33, .02, '#2a2420', {}, .04, -.06, .23, .19); const sc = Mo.schermo(s, .33, .26, .025, '#202828', -.06, .23, .21); named(sc, 'schermo'); sc.material.emissive = new THREE.Color('#304848'); sc.material.emissiveIntensity = .8;
    Mo.lastra(s, .1, .33, .015, '#c8b890', {}, .01, .21, .23, .19); Mo.griglia(s, .08, .1, 6, 1, .21, .32, .206, '#3a2a1e');
    Mo.manopola(s, .21, .2, .205, .02); Mo.manopola(s, .21, .14, .205, .016); for (let i = 0; i < 4; i++) Mo.guscio(s, .016, .01, .012, '#e8e0c8', {}, .003, .002, .18 + i * .02, .07, .205);
    Mo.targa(s, 'Vocsor', .06, .015, -.06, .055, .202, 0, '#2a2420', '#c8a860');
    Mo.tornito(s, [[0, 0], [.04, 0], [.035, .03], [0, .035]], '#1a1a1a', {}, .05, .43, -.05);
    for (const a of [-.45, .45]) asta(s, [.05, .46, -.05], [.05 + Math.sin(a) * .5, .46 + Math.cos(a) * .5 * .9, -.05], .004, '#c8c8d0', MET);
    return s;
  }
  // radio: la radiolina del Survival Pack; a mano, la ricetrasmittente militare
  function radio(g, x, y, z, ry) { const s = sub(g, x, y, z, ry); if (dl(s, 'radio', 0, 0, 0, 0)) { named(bx(s, .025, .025, .01, '#30ff60', .14, .3, .075, GLOW('#30ff60')), 'led'); return s; } ricetrasmittente(s); return s; }
  // [modelli] cassettiera da officina: fianchi coi bordi, tre cassetti con le maniglie a conchiglia e i portaetichette, zoccolo, piano in multistrato, ruote piroettanti
  function cassettiera(g, x, y, z, ry) {
    const s = sub(g, x, y, z, ry), Mo = Modella, C = '#b08a5a';
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const r = sub(s, sx * .18, 0, sz * .2); Mo.tornito(r, [[0, 0], [.022, 0], [.022, .015], [0, .015]], '#1a1a1a', {}, 0, .02, 0, 10); Mo.guscio(r, .03, .02, .03, '#5a5a5a', Mo.MET, .005, .003, 0, .04, 0); Mo.ruota(r, .022, .016, 0, .022, 0); }
    Mo.guscio(s, .45, .58, .5, C, {}, .015, .008, 0, .06, 0); Mo.guscio(s, .47, .03, .52, '#c8a070', {}, .01, .006, 0, .64, 0);
    for (let i = 0; i < 3; i++) { const yy = .14 + i * .17; Mo.lastra(s, .41, .155, .014, '#a07a4a', {}, .008, 0, yy, .25); Mo.maniglia(s, [-.06, yy + .02, .266], [.06, yy + .02, .266], .018, .006, '#3a3a3a', [0, 0, 1]); Mo.lastra(s, .06, .025, .004, '#c8c8c8', Mo.MET, .003, -.13, yy + .04, .266); Mo.targa(s, ['VITI', 'CHIAVI', 'CAVI'][i], .05, .018, -.13, yy + .04, .271, 0, '#f0ead8', '#1a1a1a'); }
    return s;
  }
  // [modelli] sgabello da officina a vite: seduta imbottita col bordo, vite di regolazione, colonna, crociera a cinque razze in ghisa coi piedini
  function sgabello(g, x, y, z) {
    const s = sub(g, x, y, z), Mo = Modella;
    Mo.tornito(s, [[0, 0], [.17, 0], [.18, .02], [.175, .06], [.15, .075], [0, .08]], '#5a3a2a', { roughness: .7 }, 0, .52, 0, 24); Mo.tornito(s, [[0, 0], [.14, 0], [.14, .02], [0, .025]], '#2a2a2a', Mo.MET, 0, .5, 0, 18);
    Mo.asta(s, [0, .3, 0], [0, .5, 0], .02, '#9a9ea6', Mo.MET); for (let i = 0; i < 10; i++) Mo.put(s, new THREE.TorusGeometry(.021, .003, 4, 10), '#7a7e86', Mo.MET, 0, .32 + i * .016, 0).rotation.x = Math.PI / 2;
    Mo.tornito(s, [[0, 0], [.04, 0], [.035, .26], [.025, .3], [0, .3]], '#2a2a2e', Mo.MET, 0, .02, 0, 14);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a); Mo.tuboPiegato(s, [[ca * .03, .1, sa * .03], [ca * .2, .05, sa * .2], [ca * .27, .035, sa * .27]], .016, '#2a2a2e', Mo.MET, .05); Mo.tornito(s, [[0, 0], [.025, 0], [.02, .025], [0, .03]], '#111', { roughness: 1 }, ca * .27, 0, sa * .27, 10); }
    return s;
  }
  // [modelli] barattoli e latte: latta di vernice col coperchio a pressione e il manico, barattolo di vetro coi bulloni dentro, latta di olio, scatoletta
  function vasetti(g, x, y, z) {
    const s = sub(g, x, y, z), Mo = Modella;
    Mo.tornito(s, [[0, 0], [.045, 0], [.046, .006], [.046, .085], [.048, .09], [.044, .095], [0, .095]], '#c8a03a', { metalness: .25, roughness: .4 }, 0, 0, 0, 18); Mo.targa(s, 'VERNICE', .06, .04, 0, .045, .047, 0, '#e8e0c8', '#2a4a7a'); Mo.tuboPiegato(s, [[-.046, .07, 0], [-.03, .13, 0], [.03, .13, 0], [.046, .07, 0]], .002, '#9a9ea6', Mo.MET, .03);
    const v = Mo.tornito(s, [[0, 0], [.03, 0], [.033, .01], [.033, .07], [.028, .08], [.028, .09], [0, .09]], new THREE.MeshStandardMaterial({ color: '#c8d8d0', transparent: true, opacity: .5, roughness: .1 }), null, .1, 0, .04, 16);
    Mo.tornito(s, [[0, 0], [.03, 0], [.03, .015], [0, .015]], '#c83a2a', {}, .1, .085, .04, 14); for (let i = 0; i < 6; i++) Mo.bullone(s, .09 + (i % 3) * .012, .01 + Math.floor(i / 3) * .015, .035 + (i % 2) * .01, 'y', .006);
    Mo.guscio(s, .07, .12, .045, '#3a6a3a', { metalness: .25, roughness: .45 }, .01, .005, .2, 0, -.02); Mo.tornito(s, [[0, 0], [.01, 0], [.008, .03], [0, .03]], '#2a2a2a', {}, .22, .12, -.02); Mo.targa(s, 'OLIO', .05, .05, .2, .06, .003, 0, '#e8c830', '#1a1a1a');
    Mo.tornito(s, [[0, 0], [.035, 0], [.035, .035], [0, .035]], '#9a9ea6', Mo.MET, .3, 0, .05, 16); Mo.targa(s, 'TONNO', .05, .025, .3, .017, .0855, 0, '#c82a1e', '#f0e0a0');
    return s;
  }
  // [modelli] bottiglie: vino col fiasco impagliato, birra verde col tappo a corona, bottiglia di grappa trasparente con l'etichetta
  function bottiglie(g, x, y, z) {
    const s = sub(g, x, y, z), Mo = Modella, vetro = (c, op) => new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: op || .8, roughness: .1 });
    Mo.tornito(s, [[0, 0], [.07, .01], [.08, .06], [.07, .12], [.03, .17], [.014, .2], [.014, .26], [.017, .265], [0, .27]], vetro('#3a5a2a', .85), null, 0, 0, 0, 18);
    const pg = Mo.tornito(s, [[0, 0], [.072, .005], [.082, .06], [.074, .11], [0, .11]], '#c8a860', { roughness: 1 }, 0, 0, 0, 18); pg.material.userData.sup = 'tessuto'; Mo.tornito(s, [[.015, 0], [.018, .01], [.018, .02], [.015, .022]], '#7a2a2a', {}, 0, .25, 0, 10);
    Mo.tornito(s, [[0, 0], [.03, 0], [.032, .1], [.025, .14], [.012, .17], [.012, .21], [0, .21]], vetro('#2e5a2a'), null, .12, 0, .02, 14); Mo.tornito(s, [[0, 0], [.014, 0], [.014, .008], [0, .01]], '#c8b040', Mo.MET, .12, .21, .02, 10); Mo.targa(s, 'BIRRA ADRIA', .05, .04, .12, .06, .0525, 0, '#f0e8d0', '#c82a1e');
    Mo.tornito(s, [[0, 0], [.028, 0], [.028, .14], [.02, .17], [.01, .2], [.01, .24], [0, .24]], vetro('#e8eee8', .45), null, .2, 0, -.02, 14); Mo.tornito(s, [[0, 0], [.012, 0], [.012, .02], [0, .02]], '#2a2a2a', {}, .2, .24, -.02, 10); Mo.targa(s, 'GRAPPA', .04, .05, .2, .07, .009, 0, '#f0ead8', '#1a1a1a');
    return s;
  }
  function attrezziSparsi(g, w, y, z) { const s = sub(g, 0, y, z); for (let i = 0; i < 5; i++) { const xx = (R() - .5) * w * .7, zz = (R() - .5) * .25; bx(s, .18 + R() * .1, .015, .025, ['#a8acb4', '#c83a2a', '#3a3a3a'][i % 3], xx, .01, zz, MET, R() * 3); } return s; }
  // [modelli] tanica militare: corpo con gli spigoli arrotondati, la X in rilievo sulle due facce, la cordonatura della saldatura, tre maniglie unite, beccuccio col tappo a leva
  function tanica(g, x, y, z, ry, c) {
    const s = sub(g, x, y, z, ry), Mo = Modella, C = c || '#a8302a', o = { roughness: .55 };
    Mo.guscio(s, .34, .42, .165, C, o, .03, .02);
    Mo.guscio(s, .345, .012, .17, C, o, .03, .004, 0, .2, 0);                                                    // cordone della saldatura a metà
    for (const zz of [-1, 1]) { const f = sub(s, 0, .21, zz * .083); f.rotation.y = zz > 0 ? 0 : Math.PI;
      Mo.lastra(f, .28, .34, .008, C, o, .03, 0, 0, 0);                                                         // riquadro incassato (bordo in rilievo)
      for (const a of [-1, 1]) { const b = Mo.lastra(f, .42, .028, .01, C, o, .012, 0, 0, .004); b.rotation.z = a * .88; } }
    for (const xx of [-.1, 0, .1]) Mo.tuboPiegato(s, [[xx, .41, -.03], [xx, .47, -.03], [xx, .47, .03], [xx, .41, .03]], .011, C, o, .02);
    Mo.asta(s, [-.12, .47, 0], [.12, .47, 0], .012, C, o);
    const b = sub(s, .13, .42, .0); b.rotation.z = -.5; Mo.tornito(b, [[0, 0], [.03, 0], [.03, .04], [.025, .045], [0, .045]], '#3a3c40', Mo.MET);
    Mo.guscio(b, .07, .015, .05, '#6a6c70', Mo.MET, .015, .004, 0, .045, 0); Mo.asta(b, [-.035, .055, 0], [-.06, .03, 0], .006, '#6a6c70', Mo.MET);
    Mo.targa(s, 'BENZINA', .1, .03, 0, .36, .088, 0, C, '#e8e0c8');
    return s;
  }
  // [modelli] estintore a polvere: bombola tornita con fondo e calotta, valvola d'ottone con la leva e la spina di sicurezza, manometro, tubo di gomma fino alla lancia nel gancio, etichetta
  function estintore(g, x, y, z) {
    const s = sub(g, x, y, z), Mo = Modella, C = '#b8221c', o = { roughness: .38, metalness: .15 };
    Mo.tornito(s, [[0, 0], [.07, 0], [.08, .015], [.08, .46], [.072, .52], [.05, .55], [.022, .56], [0, .56]], C, o, 0, 0, 0, 24);
    Mo.tornito(s, [[.082, 0], [.083, .02], [.0, .02]], '#2a2a2a', {}, 0, 0, 0, 24);                            // il piede di plastica
    Mo.tornito(s, [[0, 0], [.022, 0], [.024, .03], [.02, .06], [0, .06]], '#b89a4a', Mo.MET, 0, .56, 0);        // valvola d'ottone
    const lv = sub(s, 0, .61, 0); Mo.guscio(lv, .14, .012, .03, '#2a2a2a', Mo.MET, .01, .003, .05, .025, 0).rotation.z = -.18; Mo.guscio(lv, .12, .01, .028, '#2a2a2a', Mo.MET, .01, .003, .045, 0, 0);
    Mo.asta(s, [-.01, .625, -.02], [-.01, .625, .03], .004, '#c8c8c8', Mo.MET); Mo.tuboPiegato(s, [[-.01, .625, .03], [-.03, .62, .04], [-.04, .6, .03]], .002, '#e8c830', {}, .005);
    Mo.quadrante(s, -.03, .59, .012, .014, ''); s.children[s.children.length - 1].rotation.y = -1.2;
    Mo.cavo(s, [[.03, .6, .01], [.08, .58, .03], [.1, .45, .06], [.098, .26, .085]], .011, '#151515');
    Mo.tornito(s, [[.01, 0], [.016, .01], [.014, .07], [.008, .09]], '#151515', { roughness: .8 }, .098, .17, .085);
    Mo.guscio(s, .03, .02, .02, '#3a3a3a', Mo.MET, .005, .003, .088, .3, .075);
    const et = sub(s, 0, .3, 0); for (let i = 0; i < 1; i++) { const m = Mo.put(et, new THREE.CylinderGeometry(.0805, .0805, .2, 20, 1, true, -.7, 1.4), Mo.targaMat('POLVERE\nABC 6 kg', '#e8e2cc', '#1a1a1a', 'targa'), null, 0, 0, 0); m.userData.noVeste = true; }
    return s;
  }
  // [modelli] bobina di cavo: due flange di legno con le assi e i fori, il mozzo, le spire di cavo arancione che si vedono avvolte, il capo che pende
  function bobina(g, x, y, z, ry) {
    const s = sub(g, x, y, z, ry), Mo = Modella, R = .26;
    for (const zz of [-.135, .135]) { const f = sub(s, 0, R, zz); f.rotation.x = Math.PI / 2;
      Mo.tornito(f, [[.05, -.012], [R, -.012], [R, .012], [.05, .012]], '#b08a5a', {}, 0, 0, 0, 24);
      for (const a of [0, Math.PI / 2]) { const sp = Mo.put(f, new THREE.BoxGeometry(R * 2 - .02, .004, .012), '#7a5a34', {}, 0, zz > 0 ? .013 : -.013, 0); sp.rotation.y = a; }
      for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + .78; Mo.put(f, new THREE.CylinderGeometry(.025, .025, .026, 10), '#2a1e14', {}, Math.cos(a) * .16, 0, Math.sin(a) * .16); }
      Mo.bulloni(f, [-.06, zz > 0 ? .013 : -.013, -.06], [.06, zz > 0 ? .013 : -.013, .06], 2, 'y', .008); }
    const m = sub(s, 0, R, 0); m.rotation.x = Math.PI / 2; Mo.tornito(m, [[.05, -.125], [.075, -.125], [.075, .125], [.05, .125]], '#8a6a44', {}, 0, 0, 0, 18);
    for (let k = 0; k < 9; k++) { const t = new THREE.Mesh(new THREE.TorusGeometry(.17 + (k % 3) * .006, .02, 8, 28), Modella.mat('#d8682a', { roughness: .6 })); t.position.set(0, R, -.105 + k * .026); t.castShadow = true; s.add(t); }
    Mo.cavo(s, [[.17, R + .03, .1], [.23, .2, .12], [.25, .05, .14], [.32, .015, .2], [.45, .015, .18]], .016, '#d8682a');
    Mo.tornito(s, [[0, 0], [.03, 0], [.032, .05], [.02, .06], [0, .06]], '#2a2a2a', {}, .48, .03, .18).rotation.z = Math.PI / 2;
    return s;
  }
  // [modelli] fari da cantiere: treppiede con le gambe a sezione quadra che si aprono da un collare, asta telescopica col pomello, barra a T, due proiettori alettati orientabili, la scatola dei cavi
  function fari(g, x, y, z) {
    const s = sub(g, x, y, z), Mo = Modella, Y = '#e0b52a';
    Mo.tornito(s, [[0, 0], [.04, 0], [.04, .08], [0, .08]], '#2a2a2e', Mo.MET, 0, .66, 0, 12);
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + .3, ca = Math.cos(a), sa = Math.sin(a);
      asta(s, [ca * .04, .7, sa * .04], [ca * .44, .015, sa * .44], .028, Y); Mo.tornito(s, [[0, 0], [.025, 0], [.02, .02], [0, .02]], '#111', { roughness: 1 }, ca * .44, 0, sa * .44, 8);
      asta(s, [ca * .02, .42, sa * .02], [ca * .26, .26, sa * .26], .012, '#2a2a2e', MET); }
    Mo.tornito(s, [[0, 0], [.035, 0], [.035, .03], [0, .03]], '#2a2a2e', Mo.MET, 0, .41, 0, 12);
    Mo.asta(s, [0, .74, 0], [0, 1.3, 0], .024, Y); Mo.asta(s, [0, 1.3, 0], [0, 1.78, 0], .017, '#b8bcc4', Mo.MET); Mo.tornito(s, [[0, 0], [.03, 0], [.03, .04], [0, .04]], '#2a2a2e', Mo.MET, 0, 1.28, 0, 10);
    Mo.asta(s, [.03, 1.3, 0], [.07, 1.3, 0], .008, '#2a2a2e', Mo.MET); Mo.tornito(s, [[0, 0], [.018, 0], [.018, .02], [0, .02]], '#c82a1e', {}, .07, 1.3, 0).rotation.z = Math.PI / 2;
    Mo.guscio(s, .74, .035, .04, Y, {}, .01, .006, 0, 1.78, 0);
    for (const xx of [-.26, .26]) { Mo.guscio(s, .03, .1, .03, '#2a2a2e', Mo.MET, .006, .004, xx, 1.7, .03);
      const L = sub(s, xx, 1.66, .07); L.rotation.x = .3;
      Mo.guscio(L, .28, .22, .1, '#2a2a2e', Mo.MET, .02, .01, 0, -.11, -.05); Mo.alette(L, 6, .26, .02, .03, '#3a3a3e', 0, -.09, -.105);
      Mo.lastra(L, .27, .21, .015, '#3a3a3e', Mo.MET, .02, 0, 0, .0); for (let i = 0; i < 3; i++) Mo.asta(L, [-.12, -.06 + i * .06, .02], [.12, -.06 + i * .06, .02], .003, '#c8c8c8', Mo.MET);
      named(bx(L, .23, .17, .008, '#fff8e0', 0, 0, .012, GLOW('#fff0c0')), 'luce'); }
    Mo.guscio(s, .1, .07, .05, '#1a1a1a', {}, .01, .006, 0, 1.0, -.05);
    Mo.cavo(s, [[-.24, 1.62, -.04], [-.05, 1.55, -.04], [0, 1.07, -.06]], .008, '#1a1a1a'); Mo.cavo(s, [[.24, 1.62, -.04], [.05, 1.55, -.04], [0, 1.07, -.06]], .008, '#1a1a1a');
    Mo.cavo(s, [[0, 1.0, -.06], [.02, .6, -.06], [.1, .2, -.1], [.32, .015, -.3], [.65, .012, -.38]], .01, '#1a1a1a');
    return s;
  }
  // [modelli] generatore elettrogeno a telaio aperto (anni '80): telaio di tubo piegato, motore a scoppio col cilindro alettato, avviamento a strappo,
  // filtro dell'aria, marmitta con lo scudo forato, alternatore con le feritoie, quadro con prese e voltmetro, serbatoio arrotondato col tappo
  function generatore(g, x, y, z, ry) {
    const s = sub(g, x, y, z, ry), Mo = Modella, NERO = '#1e1f22', GIALLO = '#d9a62a', GRIGIO = '#55585e', ALL = '#a8acb2';
    // telaio: due anelli laterali di tubo con gli angoli piegati, traversi sotto e in alto, maniglie
    for (const sx of [-.36, .36]) Mo.tuboPiegato(s, [[sx, .03, -.2], [sx, .03, .2], [sx, .5, .2], [sx, .5, -.2], [sx, .03, -.2]], .016, NERO, Mo.MET, .06);
    for (const zz of [-.2, .2]) { Mo.asta(s, [-.36, .03, zz], [.36, .03, zz], .016, NERO, Mo.MET); Mo.asta(s, [-.36, .5, zz], [.36, .5, zz], .014, NERO, Mo.MET); }
    for (const sx of [-.36, .36]) for (const zz of [-.2, .2]) { const f = Mo.tornito(s, [[0, 0], [.022, 0], [.022, .012], [.018, .02], [0, .02]], '#111', { roughness: 1 }, sx, -.0, zz, 10); f.position.y = 0; }   // piedini di gomma
    for (const xx of [-.14, .14]) Mo.asta(s, [xx, .035, -.2], [xx, .035, .2], .012, NERO, Mo.MET);   // le slitte su cui poggia il blocco
    // supporti antivibranti
    for (const [xx, zz] of [[-.24, -.1], [-.24, .1], [.2, -.08], [.2, .08]]) Mo.tornito(s, [[0, 0], [.025, 0], [.03, .015], [.025, .03], [0, .03]], '#222', { roughness: 1 }, xx, .045, zz, 10);
    // ---- motore (a sinistra, x < 0)
    const mot = sub(s, -.18, .075, 0);
    Mo.guscio(mot, .26, .17, .24, '#3a3c40', Mo.MET, .04, .015);                                                         // carter
    Mo.bulloni(mot, [-.1, .17, .11], [.1, .17, .11], 4, 'y', .008); Mo.bulloni(mot, [-.1, .17, -.11], [.1, .17, -.11], 4, 'y', .008);
    const cil = sub(mot, .02, .17, -.02); cil.rotation.z = .35;                                                            // cilindro inclinato con le alette
    Mo.tornito(cil, [[.05, 0], [.05, .02], [.045, .02], [.045, .13]], '#4a4c50', Mo.MET); Mo.alette(cil, 9, .13, .12, .012, '#5a5c60', 0, .02, 0);
    Mo.guscio(cil, .14, .035, .13, '#2a2b2e', Mo.MET, .03, .01, 0, .13, 0);                                                  // testata
    Mo.tornito(cil, [[.008, 0], [.01, .01], [.012, .03], [.008, .05]], '#d8d4c8', {}, .04, .165, .03);                   // candela col cappuccio
    Mo.tornito(cil, [[.014, 0], [.016, .02], [.012, .045], [0, .05]], '#111', { roughness: .9 }, .04, .19, .03);
    Mo.cavo(s, [[-.13, .38, .03], [-.08, .4, .1], [-.02, .3, .14], [.0, .2, .12]], .005, '#111');
    // avviamento a strappo sul davanti: coperchio a cupola, griglia, maniglia a T con la corda
    const av = sub(mot, -.04, .09, .12); av.rotation.x = Math.PI / 2;
    Mo.tornito(av, [[0, 0], [.1, 0], [.105, .01], [.1, .04], [.07, .065], [0, .07]], GRIGIO, Mo.MET, 0, 0, 0, 24);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, b = Mo.put(av, new THREE.BoxGeometry(.012, .01, .06), '#141414', {}, Math.cos(a) * .065, .043, Math.sin(a) * .065); b.rotation.y = -a; }
    Mo.cavo(s, [[-.22, .165, .19], [-.2, .2, .23], [-.18, .25, .24]], .003, '#c8c0a8'); Mo.asta(s, [-.22, .25, .245], [-.14, .25, .245], .011, '#c82a1e', {}, 8);
    // ventola del volano dietro la griglia (gira: rotation.y del gruppo 'ventola', asse lungo z)
    const vo = sub(mot, -.04, .09, .125); vo.rotation.x = Math.PI / 2; const ven = new THREE.Group(); ven.name = 'ventola'; vo.add(ven);
    for (let i = 0; i < 7; i++) { const b = Mo.put(ven, new THREE.BoxGeometry(.075, .006, .02), '#3a3a3a', Mo.MET, .04, 0, 0); b.parent.remove(b); const h = new THREE.Group(); h.rotation.y = i / 7 * Math.PI * 2; h.add(b); b.position.set(.045, 0, 0); b.rotation.x = .5; ven.add(h); }
    // filtro dell'aria: scatola nera col coperchio a pomello, sul fianco alto del motore
    Mo.guscio(mot, .1, .1, .07, NERO, { roughness: .7 }, .03, .012, -.1, .2, .1); Mo.tornito(mot, [[0, 0], [.012, 0], [.012, .015], [0, .02]], '#888', Mo.MET, -.1, .25, .14).rotation.x = Math.PI / 2;
    // marmitta dietro: cilindro con lo scudo di lamiera forata, terminale piegato
    const mar = sub(mot, .0, .2, -.17); Mo.tornito(mar, [[0, 0], [.045, 0], [.05, .02], [.05, .18], [.045, .2], [0, .2]], '#3a2e28', { metalness: .5, roughness: .6 }, 0, 0, 0).rotation.z = Math.PI / 2;
    Mo.lastra(mar, .2, .09, .006, '#6a6c70', Mo.MET, .02, -.1, .0, -.06); Mo.griglia(mar, .17, .06, 3, 9, -.1, 0, -.052, '#202020');
    Mo.tuboPiegato(s, [[-.08, .275, -.17], [-.04, .275, -.17], [-.04, .23, -.2]], .012, '#2a2420', { metalness: .5, roughness: .7 }, .02);
    // ---- alternatore (a destra): campana gialla con le feritoie, il coperchio posteriore, il quadro sul davanti
    const alt = sub(s, .17, .17, 0); const camp = Mo.tornito(alt, [[0, -.12], [.1, -.12], [.115, -.1], [.115, .1], [.1, .12], [.04, .13], [0, .13]], GIALLO, { roughness: .55 }, 0, 0, 0, 24); camp.rotation.z = -Math.PI / 2;
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, f = Mo.put(alt, new THREE.BoxGeometry(.012, .05, .006), '#141414', {}, .1, Math.cos(a) * .1, Math.sin(a) * .1); f.rotation.x = -a; }
    Mo.tornito(alt, [[0, 0], [.07, 0], [.075, .015], [0, .02]], '#3a3c40', Mo.MET, .135, 0, 0).rotation.z = -Math.PI / 2;
    // quadro: scatola gialla sul davanti con prese, voltmetro, interruttore, targhetta
    const q = sub(s, .2, .2, .135); Mo.guscio(q, .26, .2, .07, GIALLO, { roughness: .55 }, .015, .008, 0, -.1, -.035);
    Mo.lastra(q, .23, .17, .006, '#2a2b2e', { roughness: .5 }, .01, 0, 0, .035);
    Mo.presa(q, -.06, -.035, .041, .032); Mo.presa(q, .05, -.035, .041, .032); Mo.quadrante(q, -.06, .045, .041, .028, 'V'); Mo.levetta(q, .03, .045, .041, .016);
    Mo.targa(q, 'ELETTROGENO\n2,5 kVA 220 V', .07, .035, .075, .055, .042, 0, '#e8e2cc', '#1a1a1a'); Mo.bulloni(q, [-.105, .075, .041], [.105, .075, .041], 2, 'z', .006); Mo.bulloni(q, [-.105, -.075, .041], [.105, -.075, .041], 2, 'z', .006);
    // ---- serbatoio arrotondato in alto, appoggiato sui traversi, col tappo a vite, lo sfiato, l'indicatore e la fascia nera
    const sb = sub(s, 0, .42, 0); Mo.serbatoio(sb, .56, .12, .36, GIALLO, { roughness: .5 }, 0, .0, 0);
    Mo.tornito(sb, [[0, 0], [.04, 0], [.042, .01], [.04, .03], [.03, .035], [0, .036]], NERO, { roughness: .6 }, -.15, .06, .02);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; Mo.put(sb, new THREE.BoxGeometry(.008, .025, .006), NERO, {}, -.15 + Math.cos(a) * .041, .08, .02 + Math.sin(a) * .041).rotation.y = -a; }
    Mo.tornito(sb, [[0, 0], [.025, 0], [.025, .006], [0, .008]], '#c8c8c8', Mo.MET, .12, .06, -.02); Mo.put(sb, new THREE.CircleGeometry(.018, 14), '#e8e0c0', {}, .12, .069, -.02).rotation.x = -Math.PI / 2;
    Mo.targa(sb, '', .42, .03, 0, .01, .181, 0, '#1a1a1a', '#e8b828', 'strisce'); Mo.targa(sb, '!', .05, .045, .2, .02, .182, 0, '#e8c830', '#1a1a1a', 'pericolo');
    for (const xx of [-.24, .24]) Mo.guscio(s, .04, .02, .36, '#2a2a2a', { roughness: 1 }, .005, .004, xx, .48 - .07, 0);   // le staffe di gomma sotto il serbatoio
    return s;
  }
  // [modelli] armadietti dello spogliatoio: tre ante in lamiera con le feritoie, le maniglie a leva col lucchetto, il portanome, lo zoccolo, il cappello inclinato
  function armadietti(g, x, y, z, ry, c) {
    const s = sub(g, x, y, z, ry), Mo = Modella, C = c || '#c86a26', o = { roughness: .5, metalness: .2 };
    Mo.guscio(s, 1.2, .08, .46, '#3a3a3a', {}, .01, .006); Mo.guscio(s, 1.2, 1.72, .46, C, o, .01, .008, 0, .08, 0); const cap = Mo.guscio(s, 1.22, .04, .48, C, o, .01, .008, 0, 1.8, 0);
    for (let i = 0; i < 3; i++) { const xx = (i - 1) * .4; Mo.lastra(s, .37, 1.62, .015, C, o, .01, xx, .9, .23);
      for (let j = 0; j < 5; j++) { Mo.lastra(s, .2, .012, .006, '#2a1e14', {}, .004, xx, 1.58 - j * .028, .245); Mo.lastra(s, .2, .012, .006, '#2a1e14', {}, .004, xx, .3 - j * .028, .245); }
      Mo.lastra(s, .12, .04, .006, '#c8c8c8', Mo.MET, .004, xx, 1.38, .246); Mo.targa(s, ['NINO', 'LUPO', ''][i] || '—', .1, .03, xx, 1.38, .25, 0, '#f0ead8', '#1a1a1a');
      Mo.lastra(s, .04, .14, .01, '#3a3a3a', Mo.MET, .008, xx + .14, .95, .246); Mo.guscio(s, .03, .1, .02, '#9a9ea6', Mo.MET, .006, .003, xx + .14, .86, .255);
      if (i !== 1) { Mo.guscio(s, .04, .045, .015, '#b8902a', Mo.MET, .006, .004, xx + .14, .8, .265); Mo.tuboPiegato(s, [[xx + .128, .845, .265], [xx + .128, .865, .265], [xx + .152, .865, .265], [xx + .152, .845, .265]], .003, '#c8c8c8', Mo.MET, .008); }
      for (const yy of [.3, 1.5]) Mo.cerniera(s, xx - .18, yy, .24, .08); }
    return s;
  }
  // [modelli] letto a castello militare: montanti tubolari con i tappi, reti a molle, materassi a righe con le cuciture, cuscini, coperte piegate, scaletta
  function castello(g, x, y, z, ry) {
    const s = sub(g, x, y, z, ry), Mo = Modella, T = '#3a3c42';
    for (const xx of [-.95, .95]) { Mo.tuboPiegato(s, [[xx, 0, -.42], [xx, 1.72, -.42], [xx, 1.72, .42], [xx, 0, .42]], .022, T, Mo.MET, .07); for (const yy of [.32, 1.22]) Mo.asta(s, [xx, yy + .08, -.42], [xx, yy + .08, .42], .016, T, Mo.MET); }
    for (const yy of [.32, 1.22]) { for (const zz of [-.42, .42]) Mo.asta(s, [-.95, yy, zz], [.95, yy, zz], .02, T, Mo.MET);
      for (let i = 0; i < 12; i++) Mo.asta(s, [-.9 + i * .164, yy, -.4], [-.9 + i * .164, yy, .4], .004, '#7a7e86', Mo.MET);
      Mo.guscio(s, 1.86, .13, .8, '#7a8090', { roughness: 1 }, .04, .04, 0, yy + .01, 0); for (let i = 0; i < 6; i++) Mo.guscio(s, 1.865, .132, .02, '#5a6070', { roughness: 1 }, .01, .005, 0, yy + .01, -.33 + i * .13);
      Mo.guscio(s, .4, .1, .56, '#e8e4d8', { roughness: 1 }, .05, .04, -.66, yy + .13, 0); Mo.guscio(s, .5, .08, .74, '#4a5a3a', { roughness: 1 }, .03, .02, .55, yy + .14, 0); }
    for (let i = 0; i < 5; i++) Mo.asta(s, [.95, .5 + i * .24, .3], [.95, .5 + i * .24, .42], .012, T, Mo.MET);
    return s;
  }
  // [modelli] scaffale di metallo a montanti forati: angolari coi fori, ripiani piegati, crociere dietro, piedini; sopra cassette, barattoli, una bobina, scatole
  function scaffaleMet(g, x, y, z, ry) {
    const s = sub(g, x, y, z, ry), Mo = Modella, C = '#5a5c62';
    for (const xx of [-.56, .56]) for (const zz of [-.22, .22]) { Mo.guscio(s, .04, 1.9, .04, C, Mo.MET, .004, .003, xx, 0, zz); for (let k = 0; k < 18; k++) Mo.lastra(s, .012, .03, .003, '#1a1a1a', {}, .004, xx, .1 + k * .1, zz + (zz > 0 ? .021 : -.021)).rotation.y = zz > 0 ? 0 : Math.PI; Mo.guscio(s, .06, .01, .06, '#2a2a2a', {}, .005, .003, xx, 0, zz); }
    for (const zz of [-.22]) { asta(s, [-.56, .2, zz], [.56, 1.7, zz], .01, C, MET); asta(s, [.56, .2, zz], [-.56, 1.7, zz], .01, C, MET); }
    for (let j = 0; j < 4; j++) { const yy = .2 + j * .5; Mo.guscio(s, 1.14, .025, .46, '#6a6c72', Mo.MET, .005, .006, 0, yy, 0); Mo.lastra(s, 1.14, .04, .004, '#5a5c62', Mo.MET, .003, 0, yy, .23);
      for (let i = 0; i < 3; i++) { const k = R(), xx = -.35 + i * .35; if (k < .35) cartone(s, xx, yy + .025, 0, (R() - .5) * .3, .75); else if (k < .6) cassetta(s, xx, yy + .025, 0, 0, ['#3a5a8a', '#b02a22', '#3a3a3a'][i]); else if (k < .8) { for (let q = 0; q < 3; q++) Mo.tornito(s, [[0, 0], [.045, 0], [.045, .12], [.04, .13], [0, .13]], ['#8a8e96', '#b8902a', '#5a7a5a'][q], { roughness: .4 }, xx - .08 + q * .08, yy + .025, (q % 2) * .06, 14); } else bobina(s, xx, yy + .025, 0, 0); } }
    return s;
  }
  // [modelli] cassa di metallo (zincata): spigoli piegati, nervature a croce, maniglie a scomparsa ai fianchi, chiusure a farfalla, coperchio con la guarnizione
  function cassaMetallo(g, x, y, z, ry) {
    const s = sub(g, x, y, z, ry), Mo = Modella, C = '#8a8e96';
    Mo.guscio(s, .6, .32, .4, C, Mo.MET, .02, .01); Mo.guscio(s, .61, .02, .41, '#2a2a2a', { roughness: 1 }, .02, .004, 0, .32, 0); Mo.guscio(s, .62, .07, .42, C, Mo.MET, .02, .012, 0, .335, 0);
    for (const zz of [-1, 1]) { Mo.lastra(s, .5, .02, .006, '#7a7e86', Mo.MET, .006, 0, .1, zz * .2).rotation.y = zz < 0 ? Math.PI : 0; Mo.lastra(s, .5, .02, .006, '#7a7e86', Mo.MET, .006, 0, .22, zz * .2).rotation.y = zz < 0 ? Math.PI : 0; }
    for (const xx of [-.18, .18]) { Mo.guscio(s, .06, .07, .02, '#4a4c52', Mo.MET, .01, .004, xx, .26, .2); Mo.asta(s, [xx - .015, .31, .214], [xx + .015, .31, .214], .005, '#c8c8c8', Mo.MET); }
    for (const sx of [-1, 1]) { const f = sub(s, sx * .3, .25, 0); f.rotation.y = sx * Math.PI / 2; Mo.lastra(f, .16, .05, .01, '#4a4c52', Mo.MET, .02, 0, 0, 0); Mo.maniglia(f, [-.05, .0, .012], [.05, .0, .012], .02, .006, '#2a2a2a', [0, 0, 1]); }
    Mo.bulloni(s, [-.28, .355, .21], [.28, .355, .21], 6, 'z', .005);
    return s;
  }
  // [modelli] scatolone: quello del Toon Shooter; a mano, cartone con le falde chiuse dal nastro e gli spigoli più scuri
  function cartone(g, x, y, z, ry, k) { const s = sub(g, x, y, z, ry); const w = .4 * (k || 1); if (dl(s, 'scatole', 0, 0, 0, 0, w / .7, w * .8 / .37, w / .52)) return s; bx(s, w, w * .8, w, '#b8925e', 0, w * .4, 0); bx(s, w * .02, w * .8, w, '#a07e4e', 0, w * .4, 0); bx(s, w + .005, .005, .08, '#d8c8a0', 0, w * .8, 0); bx(s, .08, w * .3, w + .005, '#d8c8a0', 0, w * .65, 0); return s; }
  // [modelli] lume a petrolio: serbatoio tornito d'ottone, la ghiera, il vetro a bulbo con la fiamma ('luce'), la gabbia di filo, il cappello forato e il manico ad arco
  function lumeOlio(g, x, y, z) {
    const s = sub(g, x, y, z), Mo = Modella, O = '#9a7a3a';
    Mo.tornito(s, [[0, 0], [.065, 0], [.07, .01], [.068, .045], [.05, .06], [.03, .065], [0, .065]], O, Mo.MET);
    Mo.tornito(s, [[.028, 0], [.035, .005], [.035, .02], [.028, .022]], '#5a4a2a', Mo.MET, 0, .065, 0); Mo.manopola(s, .04, .075, 0, .008, '#5a4a2a');
    const v = Mo.tornito(s, [[.025, 0], [.042, .03], [.045, .06], [.035, .1], [.022, .13]], new THREE.MeshStandardMaterial({ color: '#fff0c8', transparent: true, opacity: .45, roughness: .1 }), null, 0, .085, 0);
    named(Mo.tornito(s, [[0, 0], [.008, .01], [.006, .03], [0, .045]], new THREE.MeshStandardMaterial({ color: '#ffd080', emissive: '#ffb040', emissiveIntensity: 1.5 }), null, 0, .1, 0), 'luce');
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; Mo.asta(s, [Math.cos(a) * .036, .087, Math.sin(a) * .036], [Math.cos(a) * .046, .15, Math.sin(a) * .046], .0025, O, Mo.MET); Mo.asta(s, [Math.cos(a) * .046, .15, Math.sin(a) * .046], [Math.cos(a) * .028, .215, Math.sin(a) * .028], .0025, O, Mo.MET); }
    Mo.tornito(s, [[.02, 0], [.034, .005], [.03, .025], [.012, .035], [0, .036]], O, Mo.MET, 0, .215, 0); Mo.tuboPiegato(s, [[-.03, .24, 0], [-.04, .29, 0], [.04, .29, 0], [.03, .24, 0]], .003, O, Mo.MET, .02);
    return s;
  }
  function mappa(g, w, h, x, y, z) { const s = sub(g, x, y, z); bx(s, w, h, .01, '#d8ccaa', 0, 0, 0); for (let i = 0; i < 6; i++) bx(s, w * (.15 + R() * .3), h * (.1 + R() * .2), .012, ['#7a9a6a', '#a8b880', '#8ab0c8'][i % 3], (R() - .5) * w * .6, (R() - .5) * h * .6, .002); for (let i = 0; i < 4; i++) sp(s, .015, '#c83a2a', (R() - .5) * w * .8, (R() - .5) * h * .8, .01); return s; }
  function manifestino(g, x, y, z, c) { bx(g, .4, .55, .01, '#e8e0cc', x, y, z); bx(g, .3, .25, .012, c || '#c83a2a', x, y + .08, z + .002); }

  // ---------------- LE POSTAZIONI COMPOSTE ----------------
  // il banco delle armi: improvvisato su sacchi e pallet, telo, pannello con gli attrezzi, morsa, cassetta rossa, lampada
  function bancoArmi(g) { pallet(g, -.6, 0, 0); pallet(g, .6, 0, 0); sacchi(g, -.6, .14, 0, 0, 2, 3); sacchi(g, .6, .14, 0, 0, 2, 3); piano(g, 2.4, .9, .8, '#a88a5e'); telo(g, 2.4, .9, .82, -.5, 0);
    pannello(g, 2.2, 1.1, 0, .83, -.42); morsa(g, .95, .83, .2, 0); cassetta(g, .45, .83, .05, -.2); lampada(g, -1, .83, -.25, .6); bottiglie(g, -.9, .83, .1); attrezziSparsi(g, 2.2, .835, .1);
    fucile(g, -.15, .87, .18, .3); tanica(g, 1.45, 0, .45, -.4); }
  // il banco da lavoro: ferro verde con le mensole, cassette dei pezzi, monitor, lampada, cassettiera e sgabello
  function bancoLavoro(g) { const c = '#5a7a6a'; for (const xx of [-.9, .9]) for (const zz of [-.35, .35]) bx(g, .05, zz < 0 ? 1.7 : .85, .05, c, xx, zz < 0 ? .85 : .42, zz, MET); piano(g, 1.9, .8, .87, '#b08a5a'); bx(g, 1.85, .03, .7, '#a08050', 0, .2, 0);
    for (const yy of [1.25, 1.6]) { bx(g, 1.85, .03, .3, '#b08a5a', 0, yy, -.25); for (let i = 0; i < 5; i++) bx(g, .2, .1, .22, ['#3a5a8a', '#8a3a2a', '#3a3a3a'][i % 3], -.75 + i * .36, yy + .065, -.25); }
    morsa(g, -.8, .89, .2, -.2); crt(g, -.2, .89, -.05, .15); lampada(g, .6, .89, -.1, -.4); vasetti(g, .2, .89, .1); radio(g, .5, 1.62, -.25, 0); cassettiera(g, .55, 0, .1, 0); sgabello(g, -.5, 0, .75); attrezziSparsi(g, 1.6, .895, .2); }
  // [modelli] la cucina del covo: due casse militari col piano, fornello da campo a due fuochi con la bombola, pentola coi manici e il coperchio, caffettiera, taniche d'acqua, barattoli, tagliere
  function cucina(g) { const Mo = Modella; cassaMil(g, 1, .55, .5, '#4a5a3a', -.55, 0, 0); cassaMil(g, 1, .55, .5, '#4a5a3a', .55, 0, 0); Mo.guscio(g, 2.2, .04, .6, '#8a7a5a', {}, .01, .006, 0, .58, 0);
    const f = sub(g, -.5, .62, 0); Mo.guscio(f, .5, .08, .3, '#3a3c40', Mo.MET, .02, .008); for (const x of [-.12, .12]) { Mo.tornito(f, [[0, 0], [.07, 0], [.07, .01], [.05, .02], [0, .02]], '#1a1a1a', Mo.MET, x, .08, 0, 16); for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; Mo.asta(f, [x, .1, 0], [x + Math.cos(a) * .08, .1, Math.sin(a) * .08], .004, '#1a1a1a', Mo.MET); } }
    named(Mo.tornito(f, [[.03, 0], [.06, 0], [.06, .006], [.03, .006]], new THREE.MeshStandardMaterial({ color: '#3080ff', emissive: '#2060ff', emissiveIntensity: 1.2 }), null, .12, .095, 0, 14), 'fiamma'); for (const x of [-.12, .12]) Mo.manopola(f, x, .04, .15, .012);
    Mo.cavo(g, [[-.75, .64, -.1], [-.85, .5, -.2], [-.9, .3, -.3], [-1.0, .02, -.35]], .006, '#c83a2a'); Mo.tornito(g, [[0, 0], [.1, 0], [.11, .02], [.11, .28], [.07, .34], [.02, .36], [0, .36]], '#c84a2a', { roughness: .45 }, -1.05, 0, -.38, 16);
    Mo.tornito(g, [[0, 0], [.12, 0], [.13, .01], [.13, .17], [.135, .18], [0, .18]], '#8a8e96', { metalness: .3, roughness: .35 }, -.62, .72, 0, 20); for (const sx of [-1, 1]) Mo.tuboPiegato(g, [[-.62 + sx * .13, .86, -.03], [-.62 + sx * .17, .87, -.03], [-.62 + sx * .17, .87, .03], [-.62 + sx * .13, .86, .03]], .006, '#2a2a2a', {}, .01);
    Mo.tornito(g, [[0, 0], [.135, 0], [.12, .02], [.03, .03], [.02, .045], [0, .05]], '#9a9ea6', { metalness: .3, roughness: .35 }, -.62, .9, 0, 20); named(Mo.tornito(g, [[0, 0], [.04, .03], [.02, .08], [0, .1]], new THREE.MeshStandardMaterial({ color: '#e8e8e8', transparent: true, opacity: .4 }), null, -.62, .95, 0, 8), 'vapore');
    const caf = sub(g, -.3, .73, .05); Mo.tornito(caf, [[0, 0], [.04, 0], [.045, .06], [.03, .075], [.045, .09], [.04, .15], [.025, .165], [0, .17]], '#b8bcc4', Mo.MET, 0, 0, 0, 8); Mo.tuboPiegato(caf, [[-.04, .14, 0], [-.07, .13, 0], [-.07, .1, 0], [-.04, .1, 0]], .006, '#1a1a1a', {}, .01);
    vasetti(g, .25, .6, -.1); bottiglie(g, .7, .6, -.05); tanica(g, 1.25, 0, 0, -.3, '#3a6aa0'); tanica(g, 1.25, 0, .35, .2, '#3a6aa0'); cartone(g, -1.5, 0, .2, .3); Mo.guscio(g, .38, .025, .24, '#c8a070', {}, .01, .006, .35, .6, .15); }
  // il focolare: pietre in cerchio, ceppi, treppiede col paiolo
  function focolare(g) { for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; const p = new THREE.Mesh(new THREE.DodecahedronGeometry(.16), mat('#6a6a68', { roughness: 1 })); p.position.set(Math.cos(a) * .55, .1, Math.sin(a) * .55); p.scale.y = .7; p.rotation.y = a * 2; p.castShadow = true; g.add(p); }
    // [oggetti] braci, ciocchi a capanna anneriti in punta, tre lingue di fuoco a goccia (si animano per nome: fiamma, fiamma2)
    cy(g, .32, .36, .05, '#3a1a10', 0, .025, 0, GLOW('#a02a08'));
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; tubo(g, [Math.cos(a) * .38, .03, Math.sin(a) * .38], [Math.cos(a) * .06, .42, Math.sin(a) * .06], .05, '#5a3a20'); tubo(g, [Math.cos(a) * .12, .34, Math.sin(a) * .12], [Math.cos(a) * .05, .44, Math.sin(a) * .05], .052, '#1a1210'); }
    const tongue = (h, r) => new THREE.LatheGeometry([[0, 0], [r * .7, h * .08], [r, h * .25], [r * .8, h * .5], [r * .4, h * .78], [r * .12, h * .92], [0, h]].map(([a, b]) => new THREE.Vector2(a, b)), 10);
    const fl = (geo, c, e, x, z, ry, n) => { const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: c, emissive: e, emissiveIntensity: 1.2, transparent: true, opacity: .82, depthWrite: false, roughness: 1 })); m.position.set(x, .1, z); m.rotation.y = ry; m.name = n; g.add(m); return m; };
    fl(tongue(.75, .26), '#ff7a1a', '#ff5a10', 0, 0, 0, 'fiamma'); fl(tongue(.55, .14), '#ff9a30', '#ff6a18', .1, .06, 1, 'fiamma'); fl(tongue(.48, .15), '#ffd860', '#ffb030', -.04, -.03, 2, 'fiamma2');
    const top = [0, 1.45, 0]; for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + .5; asta(g, [Math.cos(a) * .8, 0, Math.sin(a) * .8], [Math.cos(a) * .03, 1.5, Math.sin(a) * .03], .035, '#2a2a2e', MET); }
    cy(g, .05, .05, .06, '#2a2a2e', ...top, MET); for (let i = 0; i < 5; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(.018, .005, 4, 8), mat('#3a3a3a', MET)); t.position.set(0, 1.4 - i * .033, 0); t.rotation.y = i * Math.PI / 2; g.add(t); }
    tubo(g, [-.16, 1.25, 0], [0, 1.24, 0], .005, '#3a3a3a', MET); tubo(g, [.16, 1.25, 0], [0, 1.24, 0], .005, '#3a3a3a', MET); cy(g, .18, .14, .24, '#2a2a2e', 0, 1.1, 0, MET); cy(g, .185, .185, .02, '#1a1a1a', 0, 1.22, 0, MET);
    for (let i = 0; i < 4; i++) cy(g, .08, .08, .45, '#6a4a2a', 1.15, .08 + (i > 1 ? .15 : 0), -.2 + (i % 2) * .17 + (i > 1 ? .085 : 0), {}, 0, Math.PI / 2); }
  // il laboratorio tessile: tavolo su cavalletti, macchina da cucire, rotoli di stoffa, manichino, filo
  function tessile(g, macchina) { cavalletti(g, 1.8, 0, 0, 0); piano(g, 1.8, .8, .8, '#b8a07a'); if (macchina) { const k = .8; macchina.scale.setScalar(k); macchina.position.set(-.3, .825 - (macchina.userData.piano || 0) * k, 0); { const gm = macchina.getObjectByName('gambe'); if (gm) gm.parent.remove(gm); } g.add(macchina); }
    [['#7a2e2a', 0], ['#2e4a6a', .2], ['#c8b88a', .4]].forEach(([c, zz]) => { cy(g, .075, .075, .7, c, .55, .9, -.25 + zz, {}, 0, Math.PI / 2); cy(g, .02, .02, .72, '#c8b090', .55, .9, -.25 + zz, {}, 0, Math.PI / 2); }); bx(g, .5, .01, .4, '#5a7a5a', .1, .83, .15);
    const mn = sub(g, 1.3, 0, -.3); cy(mn, .16, .2, .04, '#3a3a3a', 0, .02, 0); cy(mn, .018, .018, 1, '#3a3a3a', 0, .5, 0, MET);
    const busto = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [.13, .02], [.15, .12], [.12, .28], [.15, .42], [.17, .5], [.08, .56], [.05, .6], [0, .62]].map(([a, b]) => new THREE.Vector2(a, b)), 16), mat('#d8c8a8')); busto.position.y = .98; busto.scale.z = .7; busto.castShadow = true; mn.add(busto); sp(mn, .03, '#5a4a34', 0, 1.62, 0);
    if (!macchina) named(bx(g, .015, .12, .015, '#c8c8d0', -.13, .97, 0, MET), 'ago'); }
  // la stamperia: ciclostile su una cassa, risme di carta, latte d'inchiostro, fogli stesi ad asciugare
  function stamperia(g, cic) { cassaLegno(g, 1, .6, .7, 0, 0, 0); if (cic) { const k = .9; cic.scale.setScalar(k); cic.position.set(0, .6 - (cic.userData.piano || 0) * k, 0); { const gm = cic.getObjectByName('gambe'); if (gm) gm.parent.remove(gm); } g.add(cic); } else { bx(g, .7, .4, .5, '#3a3a3a', 0, .8, 0); named(cy(g, .07, .07, .55, '#2a2a2a', 0, 1.05, .2, MET, 0, Math.PI / 2), 'rullo'); }
    for (let i = 0; i < 3; i++) bx(g, .32, .1, .45, '#f0ece2', -1, .05 + i * .1, 0, {}, R() * .2); for (const zz of [.2, -.1]) { cy(g, .1, .1, .18, '#1a1a2a', .9, .09, zz, MET); cy(g, .1, .1, .01, '#5a5a6a', .9, .185, zz, MET); }
    for (const xx of [-1.3, 1.3]) { bx(g, .04, 1.9, .04, '#6a5a44', xx, .95, -.6); asta(g, [xx, 1.2, -.6], [xx * .88, 0, -.85], .03, '#6a5a44'); } cy(g, .005, .005, 2.6, '#c8c8c8', 0, 1.85, -.6, {}, 0, Math.PI / 2);
    for (let i = 0; i < 6; i++) { bx(g, .3, .42, .005, '#f0ece2', -1 + i * .4, 1.63, -.6); bx(g, .2, .08, .006, '#c83a2a', -1 + i * .4, 1.73, -.596); bx(g, .04, .03, .012, '#c8a060', -1 + i * .4, 1.845, -.6); } }
  // il banco radio: scrivania, ricetrasmittenti impilate, radiolina, televisore, mappa al muro, sedia, antenna
  function bancoRadio(g) { for (const xx of [-.8, .8]) for (const zz of [-.3, .3]) bx(g, .05, .75, .05, '#6a4a2c', xx, .37, zz); bx(g, 1.6, .1, .03, '#5a3a20', 0, .66, -.3); piano(g, 1.8, .75, .76, '#7a5634');
    ricetrasmittente(g, -.45, .785, -.12, .1); ricetrasmittente(g, -.45, 1.02, -.15, .05); tv(g, .35, .785, -.1, -.15); dl(g, 'radio', -.05, .785, .12, .3, .8);
    bx(g, .25, .05, .18, '#2a2a2a', .1, .81, .22); mappa(g, 1.2, .8, 0, 1.6, -.4); lumeOlio(g, .75, .785, .15); manifestino(g, -.85, 1.5, -.39, '#2a5a8a');
    const sd = sub(g, 0, 0, .7, Math.PI); bx(sd, .45, .04, .42, '#7a5634', 0, .45, 0); for (const xx of [-.2, .2]) for (const zz of [-.18, .18]) bx(sd, .04, zz < 0 ? .9 : .45, .04, '#5a3a20', xx, zz < 0 ? .45 : .22, zz); bx(sd, .45, .3, .03, '#7a5634', 0, .75, -.18); }
  // l'infermeria: branda, cassetta del pronto, flebo sul suo treppiede, lampada, catino
  function infermeria(g) { castelloBasso(g); cassaMetallo(g, 1.3, 0, -.2, 0); const k = sub(g, 1.18, .45, -.2); bx(k, .3, .18, .2, '#f0ece2', 0, .09, 0); bx(k, .32, .02, .22, '#d8d4c8', 0, .185, 0); bx(k, .05, .12, .01, '#c82a24', 0, .09, .102); bx(k, .12, .04, .01, '#c82a24', 0, .09, .103); bx(k, .1, .02, .02, '#5a5a5a', 0, .2, 0);
    cy(g, .012, .012, 1.75, '#c8c8d0', -1.2, .9, -.3, MET); for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; asta(g, [-1.2, .12, -.3], [-1.2 + Math.cos(a) * .25, .01, -.3 + Math.sin(a) * .25], .015, '#c8c8d0', MET); }
    bx(g, .3, .015, .015, '#c8c8d0', -1.2, 1.76, -.3, MET); bx(g, .1, .18, .05, '#d8e8f0', -1.08, 1.6, -.3, { transparent: true, opacity: .8 }); cavo(g, [[-1.08, 1.5, -.3], [-1.05, 1.1, -.25], [-.95, .75, -.1], [-.85, .6, 0]], .004, '#e8eef0');
    lampada(g, 1.45, .43, -.25, 2.4); cy(g, .2, .15, .1, '#c8ccd4', -1.1, .05, .3, MET); }
  // [modelli] branda militare: telo di tela teso fra due stanghe, gambe a X incernierate, cuscino, coperta piegata a righe
  function castelloBasso(g) { const Mo = Modella, T = '#3a3c42';
    for (const zz of [-.36, .36]) Mo.asta(g, [-.95, .45, zz], [.95, .45, zz], .018, '#6a5a3a', {});
    for (const xx of [-.8, 0, .8]) { Mo.asta(g, [xx - .12, 0, -.36], [xx + .12, .45, .36], .014, T, Mo.MET); Mo.asta(g, [xx - .12, 0, .36], [xx + .12, .45, -.36], .014, T, Mo.MET); Mo.asta(g, [xx - .12, .01, -.38], [xx - .12, .01, .38], .012, T, Mo.MET); }
    const geo = new THREE.PlaneGeometry(1.88, .72, 8, 4); const P = geo.attributes.position; for (let i = 0; i < P.count; i++) P.setZ(i, -.04 * (1 - Math.pow(P.getY(i) / .36, 2))); geo.computeVertexNormals(); const tl = new THREE.Mesh(geo, Modella.mat('#6a7a5a', { roughness: 1, side: THREE.DoubleSide })); tl.rotation.x = -Math.PI / 2; tl.position.y = .46; tl.castShadow = tl.receiveShadow = true; g.add(tl);
    Mo.guscio(g, .38, .1, .55, '#f0ece2', { roughness: 1 }, .05, .04, -.68, .44, 0); Mo.guscio(g, .5, .07, .66, '#8a3a2a', { roughness: 1 }, .02, .015, .45, .44, 0); for (let i = 0; i < 3; i++) Mo.guscio(g, .505, .071, .03, '#e8d8b0', { roughness: 1 }, .005, .003, .45, .44, -.2 + i * .2); }
  // [modelli] la forgia: incudine vera (corno, tavola, vita, base) sul ceppo cerchiato, tenaglie appoggiate, secchio del carbone col carbone
  function forgiaExtra(g) { cy(g, .25, .29, .5, '#5a3a20', .9, .25, .3); for (const yy of [.08, .42]) cy(g, .275 - yy * .06, .28 - yy * .06, .03, '#3a3a40', .9, yy, .3, MET); cy(g, .25, .25, .005, '#a07a4e', .9, .503, .3);
    const a = sub(g, .9, .5, .3, .3), I = '#3a3a40'; bx(a, .2, .06, .14, I, 0, .03, 0, MET); bx(a, .12, .08, .09, I, 0, .1, 0, MET); bx(a, .32, .07, .13, I, -.02, .175, 0, MET); const h = new THREE.Mesh(new THREE.ConeGeometry(.06, .2, 8), mat(I, MET)); h.rotation.z = -Math.PI / 2; h.position.set(.24, .18, 0); h.scale.z = .9; h.castShadow = true; a.add(h); bx(a, .06, .07, .13, I, -.2, .175, 0, MET);
    for (let i = 0; i < 2; i++) asta(g, [.62, .51, .14 + i * .03], [.6 + .4 * Math.cos(.3), .52, .4 + i * .02], .018, '#2a2a2e', MET);
    cy(g, .17, .14, .3, '#3a3a3a', -.9, .15, .4, MET); const t = new THREE.Mesh(new THREE.TorusGeometry(.17, .008, 4, 14, Math.PI), mat('#2a2a2a', MET)); t.position.set(-.9, .3, .4); g.add(t);
    for (let i = 0; i < 9; i++) { const p = new THREE.Mesh(new THREE.DodecahedronGeometry(.045), mat('#1a1a1a', { roughness: .6 })); p.position.set(-.9 + (R() - .5) * .2, .29 + R() * .03, .4 + (R() - .5) * .2); g.add(p); } }

  // [modelli] ricetrasmittente militare: cassa con le maniglie, quadrante, manopole, cornetta appesa col cavo a spirale, antenna a stilo sul suo attacco
  function ricetrasmittente(g, x, y, z, ry) {
    const s = sub(g, x, y, z, ry), C = '#4a5240'; bx(s, .5, .22, .3, C, 0, .11, 0); bx(s, .52, .03, .32, '#3a4232', 0, .225, 0); for (const xx of [-.27, .27]) { bx(s, .02, .1, .02, '#2a2a2a', xx, .13, .08); bx(s, .02, .1, .02, '#2a2a2a', xx, .13, -.08); bx(s, .02, .02, .18, '#2a2a2a', xx, .18, 0); }
    bx(s, .2, .1, .01, '#c8b880', -.1, .13, .151, GLOW('#806838')); bx(s, .005, .08, .012, '#c83a2a', -.08, .13, .155); for (let i = 0; i < 3; i++) cy(s, .02, .02, .03, '#1a1a1a', .08 + i * .06, .12, .162, {}, Math.PI / 2);
    named(bx(s, .03, .03, .01, '#30ff60', .2, .18, .152, GLOW('#30ff60')), 'led');
    bx(s, .05, .12, .04, '#1a1a1a', .29, .1, .12); cavo(s, [[.29, .05, .12], [.24, .02, .17], [.18, .03, .155], [.15, .06, .152]], .006, '#1a1a1a');
    cy(s, .015, .02, .03, '#2a2a2a', .2, .24, -.1); tubo(s, [.2, .25, -.1], [.25, .95, -.15], .004, '#c8c8d0', MET); return s;
  }
  // [modelli] fucile appoggiato sul banco: calcio sagomato, guardia, otturatore, canna e caricatore
  function fucile(g, x, y, z, ry) { const s = sub(g, x, y, z, ry); bx(s, .3, .05, .045, '#5a3a20', -.36, .005, 0); bx(s, .12, .085, .045, '#5a3a20', -.48, -.005, 0); bx(s, .2, .045, .05, '#2a2a2e', -.12, .015, 0, MET); bx(s, .08, .06, .04, '#5a3a20', -.03, .0, 0); cy(s, .012, .012, .46, '#2a2a2e', .23, .02, 0, MET, 0, Math.PI / 2); bx(s, .04, .09, .03, '#2a2a2e', -.1, -.05, 0, MET, 0, 0, .2); bx(s, .03, .02, .02, '#2a2a2e', -.06, .045, .03, MET); return s; }
  return { pallet, sacchi, cassaMil, cassaLegno, cavalletti, piano, telo, pannello, morsa, cassetta, lampada, crt, tv, radio, cassettiera, sgabello, vasetti, bottiglie, attrezziSparsi,
    tanica, estintore, bobina, fari, generatore, armadietti, castello, scaffaleMet, cassaMetallo, cartone, lumeOlio, mappa, manifestino,
    bancoArmi, bancoLavoro, cucina, focolare, tessile, stamperia, bancoRadio, infermeria, forgiaExtra, mat,
    ricetrasmittente, fucile, asta, tubo, cavo, dl };
})();
