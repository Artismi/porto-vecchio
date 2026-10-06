/* Porto Vecchio — I pezzi: la roba di cui sono fatti i covi (sui riferimenti: The Last of Us II, 60 Nights, i banchi d'officina).
   Pallet, sacchi di sabbia, casse militari, cassette degli attrezzi, morse, pannelli forati con gli attrezzi appesi, lampade da banco,
   fari da cantiere, taniche, estintori, radio, televisori, armadietti, letti a castello, generatori, bobine di cavo, teli…
   Ogni funzione aggiunge al gruppo g, in metri, col davanti verso +z. Le postazioni del Cantiere sono composte con questi.
   Nomi delle parti animate: fiamma, luce, led, rullo, ago, morsa, schermo, ventola. */
var Pezzi = (function () {
  'use strict';
  const M = {};
  const mat = (c, o) => { const k = c + JSON.stringify(o || {}); return M[k] || (M[k] = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .82, metalness: 0 }, o || {}))); };
  const MET = { metalness: .55, roughness: .45 }, GLOW = c => ({ emissive: c, emissiveIntensity: 1 });
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
  function cassaMil(g, w, h, d, c, x, y, z, ry) { const s = sub(g, x, y, z, ry); bx(s, w, h, d, c, 0, h / 2, 0); bx(s, w + .02, .05, d + .02, '#1e2420', 0, h - .03, 0); for (const xx of [-w / 3, w / 3]) bx(s, .06, h + .01, d + .015, '#2a302a', xx, h / 2, 0); for (const xx of [-w / 3, w / 3]) bx(s, .1, .05, .02, '#3a3a3a', xx, h * .7, d / 2 + .01, MET); bx(s, w * .3, .06, .01, '#c8b040', 0, h * .45, d / 2 + .006); return s; }
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
  // ---------------- ATTREZZI SUL BANCO ----------------
  function morsa(g, x, y, z, ry) { const s = sub(g, x, y, z, ry); bx(s, .14, .05, .16, '#3a5a8a', 0, .025, 0, MET); named(bx(s, .1, .12, .06, '#3a5a8a', 0, .1, .05, MET), 'morsa'); bx(s, .1, .12, .06, '#3a5a8a', 0, .1, -.04, MET); cy(s, .012, .012, .22, '#c8ccd4', 0, .09, .14, MET, Math.PI / 2); return s; }
  function cassetta(g, x, y, z, ry, c) { const s = sub(g, x, y, z, ry); bx(s, .5, .2, .22, c || '#b8302a', 0, .1, 0, { roughness: .5, metalness: .2 }); bx(s, .52, .03, .23, c ? c : '#a02824', 0, .21, 0); bx(s, .2, .04, .03, '#2a2a2a', 0, .25, 0); bx(s, .04, .03, .005, '#c8c8c8', 0, .17, .11, MET); return s; }
  // [modelli] lampada da banco snodata: base, braccio in due pezzi con le molle, paralume conico con la lampadina dentro
  function lampada(g, x, y, z, ry) {
    const s = sub(g, x, y, z, ry), C = '#2a2a2e'; cy(s, .08, .09, .03, C, 0, .015, 0); cy(s, .02, .02, .04, C, 0, .05, 0);
    const a = [0, .06, 0], b = [.07, .33, 0], c = [.25, .4, 0]; asta(s, a, b, .02, C); asta(s, b, c, .02, C); sp(s, .022, '#5a5a60', ...b, MET);
    asta(s, [.01, .1, .02], [.06, .28, .02], .006, '#a8acb4', MET); asta(s, [.1, .34, .02], [.22, .39, .02], .006, '#a8acb4', MET);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(.025, .085, .12, 14, 1, true), mat('#3a5a8a', { side: THREE.DoubleSide })); sh.position.set(.28, .37, 0); sh.rotation.z = .5; sh.castShadow = true; s.add(sh);
    named(sp(s, .035, '#fff0c0', .3, .34, 0, GLOW('#ffd890')), 'luce'); return s;
  }
  // [modelli] terminale a tubo catodico: guscio rastremato dietro, cornice, schermo verde, feritoie, tastiera davanti
  function crt(g, x, y, z, ry, c) {
    const s = sub(g, x, y, z, ry), C = c || '#d8d0b8'; bx(s, .42, .36, .2, C, 0, .2, .08); bx(s, .34, .28, .16, C, 0, .2, -.08); bx(s, .28, .22, .1, '#c8c0a8', 0, .2, -.2);
    bx(s, .36, .3, .012, '#b8b098', 0, .21, .184); named(bx(s, .3, .23, .01, '#2a3a3a', 0, .215, .19, GLOW('#3a6a5a')), 'schermo');
    for (let i = 0; i < 5; i++) bx(s, .2, .008, .005, '#8a8270', 0, .25 + i * .02, -.251); bx(s, .3, .025, .2, C, 0, .012, .05);
    const k = sub(s, 0, 0, .34); bx(k, .4, .03, .14, C, 0, .015, 0, {}, 0, -.06); for (let i = 0; i < 12; i++) for (let j = 0; j < 3; j++) bx(k, .022, .012, .022, '#5a5448', -.16 + i * .029, .036, -.03 + j * .03); return s;
  }
  function tv(g, x, y, z, ry) { const s = sub(g, x, y, z, ry); bx(s, .55, .42, .4, '#5a3a24', 0, .21, 0); named(bx(s, .36, .3, .01, '#202828', -.05, .22, .201, GLOW('#405858')), 'schermo'); for (let i = 0; i < 2; i++) cy(s, .025, .025, .02, '#c8c8c8', .2, .3 - i * .1, .205, MET, Math.PI / 2); cy(s, .005, .005, .5, '#c8c8d0', -.1, .6, 0, MET, 0, .4); cy(s, .005, .005, .5, '#c8c8d0', .1, .6, 0, MET, 0, -.4); return s; }
  // radio: la radiolina del Survival Pack; a mano, la ricetrasmittente militare
  function radio(g, x, y, z, ry) { const s = sub(g, x, y, z, ry); if (dl(s, 'radio', 0, 0, 0, 0)) { named(bx(s, .025, .025, .01, '#30ff60', .14, .3, .075, GLOW('#30ff60')), 'led'); return s; } ricetrasmittente(s); return s; }
  function cassettiera(g, x, y, z, ry) { const s = sub(g, x, y, z, ry); bx(s, .45, .6, .5, '#b08a5a', 0, .32, 0); for (let i = 0; i < 3; i++) { bx(s, .4, .16, .01, '#a07a4a', 0, .14 + i * .19, .251); bx(s, .1, .02, .02, '#3a3a3a', 0, .17 + i * .19, .26, MET); } for (const xx of [-.18, .18]) for (const zz of [-.2, .2]) cy(s, .025, .025, .04, '#1a1a1a', xx, .02, zz); return s; }
  // [modelli] sgabello da officina: seduta, colonna, cinque razze a terra con i piedini
  function sgabello(g, x, y, z) { const s = sub(g, x, y, z); cy(s, .18, .18, .05, '#b08a5a', 0, .55, 0); cy(s, .1, .12, .03, '#5a4a34', 0, .515, 0); cy(s, .025, .025, .48, '#6a5a44', 0, .28, 0, MET); cy(s, .05, .05, .04, '#3a3a3a', 0, .06, 0); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; asta(s, [0, .06, 0], [Math.cos(a) * .27, .02, Math.sin(a) * .27], .03, '#3a3a3a', MET); cy(s, .025, .025, .02, '#1a1a1a', Math.cos(a) * .27, .01, Math.sin(a) * .27); } return s; }
  function vasetti(g, x, y, z) { const s = sub(g, x, y, z); [['#8a6a3a', .1], ['#5a7a5a', .08], ['#c8a03a', .12], ['#3a5a8a', .07]].forEach(([c, h], i) => cy(s, .035, .035, h, c, i * .09, h / 2, (i % 2) * .05, { roughness: .3 })); return s; }
  function bottiglie(g, x, y, z) { const s = sub(g, x, y, z); ['#3a5a2a', '#6a3a1a', '#c8c8b0'].forEach((c, i) => { cy(s, .035, .035, .2, c, i * .08, .1, 0, { roughness: .15, transparent: true, opacity: .85 }); cy(s, .012, .012, .07, c, i * .08, .23, 0); }); return s; }
  function attrezziSparsi(g, w, y, z) { const s = sub(g, 0, y, z); for (let i = 0; i < 5; i++) { const xx = (R() - .5) * w * .7, zz = (R() - .5) * .25; bx(s, .18 + R() * .1, .015, .025, ['#a8acb4', '#c83a2a', '#3a3a3a'][i % 3], xx, .01, zz, MET, R() * 3); } return s; }
  // [modelli] tanica: corpo con la X stampata in rilievo, tre maniglie in testa, beccuccio col tappo a leva
  function tanica(g, x, y, z, ry, c) {
    const s = sub(g, x, y, z, ry), C = c || '#c83a2a', o = { roughness: .5 }; bx(s, .34, .4, .17, C, 0, .2, 0, o); bx(s, .3, .03, .15, C, 0, .415, 0, o);
    for (const zz of [-1, 1]) { const f = sub(s, 0, .2, zz * .087); for (const a of [-1, 1]) { const m = bx(f, .44, .03, .012, C, 0, 0, 0, o); m.rotation.z = a * .86; } bx(f, .3, .36, .006, C, 0, 0, -zz * .003, o); }
    for (const xx of [-.1, 0, .1]) { bx(s, .022, .07, .03, C, xx, .46, 0, o); } bx(s, .24, .025, .035, C, 0, .5, 0, o);
    cy(s, .03, .035, .05, '#3a3a3a', .13, .45, 0, MET); bx(s, .06, .015, .04, '#8a8e96', .13, .48, 0, MET); return s;
  }
  // [modelli] estintore: bombola con fondo e testa arrotondati, valvola con la leva, manometro, tubo di gomma che scende fino alla lancia nel suo gancio
  function estintore(g, x, y, z) {
    const s = sub(g, x, y, z), C = '#c82a24', o = { roughness: .4, metalness: .2 }; cy(s, .08, .08, .48, C, 0, .28, 0, o); sp(s, .08, C, 0, .52, 0, o, 1, .6, 1); sp(s, .08, C, 0, .04, 0, o, 1, .4, 1);
    bx(s, .14, .12, .005, '#f0ece0', 0, .3, .08); cy(s, .025, .025, .07, '#2a2a2a', 0, .6, 0, MET); bx(s, .12, .015, .03, '#2a2a2a', .04, .64, 0, MET, 0, 0, -.15); bx(s, .1, .015, .03, '#2a2a2a', .03, .615, 0, MET);
    cy(s, .02, .02, .012, '#e8e8e8', -.04, .6, .015, {}, Math.PI / 2); cavo(s, [[.02, .6, .02], [.08, .58, .04], [.1, .45, .07], [.095, .25, .08]], .012, '#1a1a1a'); cy(s, .016, .01, .07, '#1a1a1a', .095, .2, .08); bx(s, .03, .015, .02, '#3a3a3a', .088, .3, .075, MET); return s;
  }
  function bobina(g, x, y, z, ry) {   // [oggetti] rocchetto di legno coi fori, spire di cavo arancione, il capo che pende
    const s = sub(g, x, y, z, ry); for (const zz of [-.13, .13]) { cy(s, .26, .26, .025, '#b08a5a', 0, .26, zz, {}, Math.PI / 2, 0, 18); cy(s, .05, .05, .03, '#4a3a28', 0, .26, zz, {}, Math.PI / 2, 0, 10); }
    for (let k = 0; k < 5; k++) { const t = new THREE.Mesh(new THREE.TorusGeometry(.17, .022, 6, 18), mat('#d8682a')); t.position.set(0, .26, -.1 + k * .05); t.castShadow = true; s.add(t); }
    const tail = new THREE.Mesh(new THREE.TorusGeometry(.12, .02, 6, 14, Math.PI * 1.3), mat('#d8682a')); tail.position.set(.24, .1, .05); tail.rotation.set(Math.PI / 2, 0, 1.2); s.add(tail); return s; }
  // [modelli] fari da cantiere: treppiede che si apre da un collare, asta telescopica, barra con due proiettori orientabili e il cavo
  function fari(g, x, y, z) {
    const s = sub(g, x, y, z), Y = '#e8c030'; cy(s, .035, .035, .08, '#2a2a2e', 0, .7, 0, MET);
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + .3; asta(s, [Math.cos(a) * .03, .7, Math.sin(a) * .03], [Math.cos(a) * .42, 0, Math.sin(a) * .42], .03, Y); asta(s, [Math.cos(a) * .015, .45, Math.sin(a) * .015], [Math.cos(a) * .24, .3, Math.sin(a) * .24], .015, '#2a2a2e', MET); cy(s, .02, .02, .015, '#1a1a1a', Math.cos(a) * .42, .007, Math.sin(a) * .42); }
    cy(s, .022, .022, 1.15, Y, 0, 1.12, 0); cy(s, .016, .016, .5, '#a8acb4', 0, 1.6, 0, MET); bx(s, .7, .04, .04, Y, 0, 1.84, 0);
    for (const xx of [-.24, .24]) { bx(s, .03, .1, .03, '#2a2a2e', xx, 1.79, .03); const L = sub(s, xx, 1.74, .05); L.rotation.x = .25; bx(L, .26, .2, .12, '#2a2a2e', 0, 0, 0); bx(L, .28, .22, .02, '#3a3a3a', 0, 0, .065); named(bx(L, .22, .16, .01, '#fff8e0', 0, 0, .077, GLOW('#fff0c0')), 'luce'); for (let i = 0; i < 4; i++) bx(L, .24, .008, .02, '#1a1a1a', 0, -.06 + i * .04, -.065); }
    cavo(s, [[0, 1.6, -.03], [.02, 1.0, -.04], [.08, .4, -.08], [.3, .02, -.3], [.6, .01, -.4]], .01, '#1a1a1a'); return s;
  }
  function generatore(g, x, y, z, ry) { const s = sub(g, x, y, z, ry); bx(s, .7, .45, .45, '#d8b040', 0, .35, 0, { roughness: .6 }); for (const yy of [.1, .6]) for (const xx of [-.35, .35]) for (const zz of [-.23, .23]) {} const fr = [[-.36, 0], [.36, 0]]; fr.forEach(([xx]) => { bx(s, .03, .62, .03, '#2a2a2e', xx, .31, -.24); bx(s, .03, .62, .03, '#2a2a2e', xx, .31, .24); }); bx(s, .78, .03, .03, '#2a2a2e', 0, .62, -.24); bx(s, .78, .03, .03, '#2a2a2e', 0, .62, .24); for (const xx of [-.3, .3]) cy(s, .1, .1, .06, '#1a1a1a', xx, .1, .27, {}, Math.PI / 2); named(cy(s, .1, .1, .02, '#3a3a3a', .2, .4, .23, {}, Math.PI / 2), 'ventola'); bx(s, .15, .1, .01, '#2a2a2a', -.15, .45, .226); return s; }
  function armadietti(g, x, y, z, ry, c) { const s = sub(g, x, y, z, ry); for (let i = 0; i < 3; i++) { const xx = (i - 1) * .4; bx(s, .38, 1.8, .45, c || '#d8782a', xx, .9, 0, { roughness: .6, metalness: .25 }); for (let j = 0; j < 4; j++) bx(s, .2, .015, .01, '#3a2a1a', xx, 1.6 - j * .04, .23); bx(s, .02, .1, .02, '#c8c8c8', xx + .14, .95, .235, MET); bx(s, .12, .08, .005, '#f0ece0', xx, 1.35, .228); } return s; }
  function castello(g, x, y, z, ry) { const s = sub(g, x, y, z, ry); for (const xx of [-.95, .95]) for (const zz of [-.42, .42]) bx(s, .05, 1.7, .05, '#3a3a40', xx, .85, zz, MET); for (const yy of [.35, 1.25]) { bx(s, 1.95, .05, .9, '#3a3a40', 0, yy, 0, MET); bx(s, 1.85, .14, .82, '#5a5e6a', 0, yy + .09, 0); bx(s, .4, .1, .6, '#d8d4c8', -.65, yy + .2, 0); const c = bx(s, 1.1, .05, .84, '#6a6e7a', .3, yy + .17, 0); c.rotation.z = .02; } for (let i = 0; i < 4; i++) bx(s, .03, .03, .9, '#3a3a40', .95, .55 + i * .25, 0, MET); return s; }
  function scaffaleMet(g, x, y, z, ry) { const s = sub(g, x, y, z, ry); for (const xx of [-.55, .55]) for (const zz of [-.22, .22]) bx(s, .04, 1.9, .04, '#4a4c52', xx, .95, zz, MET); for (let j = 0; j < 4; j++) { const yy = .25 + j * .5; bx(s, 1.14, .03, .46, '#5a5c62', 0, yy, 0, MET); for (let i = 0; i < 3; i++) { const k = R(); if (k < .35) bx(s, .3, .22, .3, '#a8885a', -.35 + i * .35, yy + .12, 0); else if (k < .6) cassetta(s, -.35 + i * .35, yy + .015, 0, 0, ['#3a5a8a', '#b8302a', '#3a3a3a'][i]); else if (k < .8) cy(s, .1, .1, .2, '#8a8e96', -.35 + i * .35, yy + .1, 0, MET); else bobina(s, -.35 + i * .35, yy, 0, 0); } } return s; }
  // [modelli] cassa di metallo: nervature, maniglie ai fianchi, due chiusure a leva, il coperchio che sporge
  function cassaMetallo(g, x, y, z, ry) { const s = sub(g, x, y, z, ry), C = '#8a8e96'; bx(s, .6, .36, .4, C, 0, .18, 0, MET); bx(s, .62, .06, .42, '#6a6e76', 0, .39, 0, MET); for (const yy of [.08, .28]) bx(s, .61, .02, .41, '#7a7e86', 0, yy, 0, MET);
    for (const xx of [-.18, .18]) { bx(s, .05, .07, .02, '#3a3a3a', xx, .34, .205, MET); bx(s, .03, .03, .015, '#c8c8c8', xx, .37, .212, MET); } for (const xx of [-.31, .31]) { bx(s, .015, .03, .14, '#3a3a3a', xx, .27, 0, MET); bx(s, .03, .015, .12, '#2a2a2a', xx * 1.04, .25, 0, MET); } return s; }
  // [modelli] scatolone: quello del Toon Shooter; a mano, cartone con le falde chiuse dal nastro e gli spigoli più scuri
  function cartone(g, x, y, z, ry, k) { const s = sub(g, x, y, z, ry); const w = .4 * (k || 1); if (dl(s, 'scatole', 0, 0, 0, 0, w / .7, w * .8 / .37, w / .52)) return s; bx(s, w, w * .8, w, '#b8925e', 0, w * .4, 0); bx(s, w * .02, w * .8, w, '#a07e4e', 0, w * .4, 0); bx(s, w + .005, .005, .08, '#d8c8a0', 0, w * .8, 0); bx(s, .08, w * .3, w + .005, '#d8c8a0', 0, w * .65, 0); return s; }
  function lumeOlio(g, x, y, z) { const s = sub(g, x, y, z); cy(s, .06, .07, .05, '#8a6a3a', 0, .025, 0, MET); named(cy(s, .045, .05, .12, '#fff0c0', 0, .11, 0, Object.assign({ transparent: true, opacity: .85 }, GLOW('#ffc860'))), 'luce'); cy(s, .03, .05, .04, '#8a6a3a', 0, .19, 0, MET); return s; }
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
  // la cucina del covo: casse, fornello da campo, pentola, taniche d'acqua, barattoli
  function cucina(g) { cassaMil(g, 1, .55, .5, '#4a5a3a', -.55, 0, 0); cassaMil(g, 1, .55, .5, '#4a5a3a', .55, 0, 0); piano(g, 2.2, .6, .58, '#8a7a5a');
    cy(g, .2, .22, .08, '#3a3a3a', -.5, .65, 0, MET); named(cy(g, .14, .14, .02, '#3080ff', -.5, .7, 0, GLOW('#2060ff')), 'fiamma'); cy(g, .16, .14, .2, '#8a8e96', -.5, .8, 0, MET); named(sp(g, .06, '#e8e8e8', -.5, .98, 0, { transparent: true, opacity: .5 }), 'vapore');
    cy(g, .1, .12, .16, '#2a2a2e', -.05, .69, .05, MET); vasetti(g, .25, .61, -.1); bottiglie(g, .7, .61, -.05); tanica(g, 1.25, 0, 0, -.3, '#3a6aa0'); tanica(g, 1.25, 0, .35, .2, '#3a6aa0'); cartone(g, -1.3, 0, .1, .3); bx(g, .4, .03, .25, '#c8b080', .35, .615, .15); }
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
  function castelloBasso(g) { for (const xx of [-.9, .9]) for (const zz of [-.4, .4]) bx(g, .04, .45, .04, '#3a3a40', xx, .22, zz, MET); for (const zz of [-.4, .4]) bx(g, 1.84, .04, .04, '#3a3a40', 0, .41, zz, MET); bx(g, 1.8, .12, .78, '#d8d4c8', 0, .49, 0); bx(g, .4, .1, .55, '#f0ece2', -.65, .6, 0); bx(g, 1.1, .03, .8, '#6a7a6a', .3, .565, 0); }
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
