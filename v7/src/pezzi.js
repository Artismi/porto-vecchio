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

  // ---------------- BASI ----------------
  function pallet(g, x, y, z, ry) { const s = sub(g, x, y, z, ry); for (let i = 0; i < 5; i++) bx(s, 1.2, .025, .14, '#a88a5e', 0, .13, -.36 + i * .18); for (const zz of [-.36, 0, .36]) bx(s, 1.2, .09, .1, '#8a6e48', 0, .07, zz); for (let i = 0; i < 5; i++) bx(s, 1.2, .025, .14, '#9a7e52', 0, .012, -.36 + i * .18); return s; }
  function sacchi(g, x, y, z, ry, file, righe) { const s = sub(g, x, y, z, ry); for (let r = 0; r < (righe || 3); r++) for (let i = 0; i < (file || 3); i++) { const b = sp(s, .22, r % 2 ? '#8a8c84' : '#9a9a90', (i - (file || 3) / 2 + .5) * .52 + (r % 2) * .1, .11 + r * .2, 0, {}, 1.25, .5, .85); b.rotation.y = (R() - .5) * .3; } return s; }
  function cassaMil(g, w, h, d, c, x, y, z, ry) { const s = sub(g, x, y, z, ry); bx(s, w, h, d, c, 0, h / 2, 0); bx(s, w + .02, .05, d + .02, '#1e2420', 0, h - .03, 0); for (const xx of [-w / 3, w / 3]) bx(s, .06, h + .01, d + .015, '#2a302a', xx, h / 2, 0); for (const xx of [-w / 3, w / 3]) bx(s, .1, .05, .02, '#3a3a3a', xx, h * .7, d / 2 + .01, MET); bx(s, w * .3, .06, .01, '#c8b040', 0, h * .45, d / 2 + .006); return s; }
  function cassaLegno(g, w, h, d, x, y, z, ry) { const s = sub(g, x, y, z, ry); bx(s, w, h, d, '#9a7a4e', 0, h / 2, 0); for (const yy of [.15, .5, .85]) bx(s, w + .01, .05, d + .01, '#7a5a34', 0, h * yy, 0); bx(s, .3, .08, .005, '#2a2a2a', 0, h * .7, d / 2 + .006); return s; }
  function cavalletti(g, w, x, y, z) { const s = sub(g, x, y, z); for (const xx of [-w / 2 + .2, w / 2 - .2]) { for (const zz of [-.25, .25]) { const l = bx(s, .05, .8, .05, '#6a5a44', xx, .4, zz * .8); l.rotation.x = zz > 0 ? -.25 : .25; } bx(s, .05, .05, .6, '#6a5a44', xx, .78, 0); } return s; }

  // ---------------- PIANI E PANNELLI ----------------
  function piano(g, w, d, y, c, x, z) { bx(g, w, .05, d, c || '#b08a5a', x || 0, y, z || 0); bx(g, w + .01, .012, d * .2, '#7a5a3a', x || 0, y + .03, (z || 0) + d * .3); }
  function telo(g, w, d, y, x, z) { const t = bx(g, w * .6, .015, d + .02, '#8a8a70', x || 0, y + .02, z || 0); const h = bx(g, w * .6, .4, .015, '#7a7a62', x || 0, y - .18, (z || 0) + d / 2 + .01); h.rotation.x = .08; return t; }
  // pannello forato con gli attrezzi appesi
  function pannello(g, w, h, x, y, z) {
    const s = sub(g, x, y, z); bx(s, w, h, .03, '#b8a07a', 0, h / 2, 0);
    for (let j = 0; j < 6; j++) for (let i = 0; i < 10; i++) bx(s, .012, .012, .005, '#5a4a34', -w / 2 + .1 + i * (w - .2) / 9, .12 + j * (h - .24) / 5, .017);
    const T = [['#c83a2a', .32], ['#2a5ac8', .24], ['#e8c040', .28], ['#c8c8d0', .3], ['#3a3a3a', .26], ['#c83a2a', .22]];
    T.forEach(([c, l], i) => { const xx = -w / 2 + .18 + i * (w - .36) / 5; bx(s, .03, l * .55, .025, c, xx, h * .62 - l * .3, .04); bx(s, .02, l * .45, .02, '#a8acb4', xx, h * .62 + l * .2, .04, MET); });
    bx(s, .22, .3, .005, '#f0ece0', w / 2 - .25, h * .55, .02); bx(s, .16, .02, .006, '#3a3a3a', w / 2 - .25, h * .6, .024); bx(s, .18, .1, .006, '#5a7ab0', w / 2 - .25, h * .48, .024);
    const rot = cy(s, .1, .1, .03, '#3a3a3a', -w / 2 + .3, h * .2, .05, {}, Math.PI / 2); rot.scale.set(1, 1, 1);
    return s;
  }
  // ---------------- ATTREZZI SUL BANCO ----------------
  function morsa(g, x, y, z, ry) { const s = sub(g, x, y, z, ry); bx(s, .14, .05, .16, '#3a5a8a', 0, .025, 0, MET); named(bx(s, .1, .12, .06, '#3a5a8a', 0, .1, .05, MET), 'morsa'); bx(s, .1, .12, .06, '#3a5a8a', 0, .1, -.04, MET); cy(s, .012, .012, .22, '#c8ccd4', 0, .09, .14, MET, Math.PI / 2); return s; }
  function cassetta(g, x, y, z, ry, c) { const s = sub(g, x, y, z, ry); bx(s, .5, .2, .22, c || '#b8302a', 0, .1, 0, { roughness: .5, metalness: .2 }); bx(s, .52, .03, .23, c ? c : '#a02824', 0, .21, 0); bx(s, .2, .04, .03, '#2a2a2a', 0, .25, 0); bx(s, .04, .03, .005, '#c8c8c8', 0, .17, .11, MET); return s; }
  function lampada(g, x, y, z, ry) { const s = sub(g, x, y, z, ry); cy(s, .07, .08, .03, '#2a2a2e', 0, .015, 0); const a = bx(s, .02, .35, .02, '#2a2a2e', 0, .19, 0, {}, 0, 0, .25); const b = bx(s, .02, .3, .02, '#2a2a2e', .12, .4, 0, {}, 0, 0, -.9); cy(s, .03, .08, .12, '#2a2a2e', .26, .43, 0, {}, 0, -.6); named(sp(s, .035, '#fff0c0', .29, .39, 0, GLOW('#ffd890')), 'luce'); return s; }
  function crt(g, x, y, z, ry, c) { const s = sub(g, x, y, z, ry); bx(s, .42, .36, .36, c || '#d8d0b8', 0, .18, 0); named(bx(s, .32, .25, .01, '#2a3a3a', 0, .2, .181, GLOW('#3a6a5a')), 'schermo'); bx(s, .3, .04, .02, '#a8a090', 0, .03, .17); return s; }
  function tv(g, x, y, z, ry) { const s = sub(g, x, y, z, ry); bx(s, .55, .42, .4, '#5a3a24', 0, .21, 0); named(bx(s, .36, .3, .01, '#202828', -.05, .22, .201, GLOW('#405858')), 'schermo'); for (let i = 0; i < 2; i++) cy(s, .025, .025, .02, '#c8c8c8', .2, .3 - i * .1, .205, MET, Math.PI / 2); cy(s, .005, .005, .5, '#c8c8d0', -.1, .6, 0, MET, 0, .4); cy(s, .005, .005, .5, '#c8c8d0', .1, .6, 0, MET, 0, -.4); return s; }
  function radio(g, x, y, z, ry) { const s = sub(g, x, y, z, ry); bx(s, .5, .22, .3, '#4a5240', 0, .11, 0); bx(s, .2, .12, .01, '#c8b880', -.1, .12, .151, GLOW('#806838')); for (let i = 0; i < 3; i++) cy(s, .02, .02, .03, '#1a1a1a', .08 + i * .06, .12, .155, {}, Math.PI / 2); named(bx(s, .03, .03, .01, '#30ff60', .2, .18, .152, GLOW('#30ff60')), 'led'); const cf = cy(s, .05, .05, .03, '#1a1a1a', -.3, .04, .1, {}, 0, Math.PI / 2); cy(s, .005, .005, .9, '#c8c8d0', .2, .65, -.1, MET, 0, .15); return s; }
  function cassettiera(g, x, y, z, ry) { const s = sub(g, x, y, z, ry); bx(s, .45, .6, .5, '#b08a5a', 0, .32, 0); for (let i = 0; i < 3; i++) { bx(s, .4, .16, .01, '#a07a4a', 0, .14 + i * .19, .251); bx(s, .1, .02, .02, '#3a3a3a', 0, .17 + i * .19, .26, MET); } for (const xx of [-.18, .18]) for (const zz of [-.2, .2]) cy(s, .025, .025, .04, '#1a1a1a', xx, .02, zz); return s; }
  function sgabello(g, x, y, z) { const s = sub(g, x, y, z); cy(s, .18, .18, .05, '#b08a5a', 0, .55, 0); cy(s, .025, .025, .5, '#6a5a44', 0, .3, 0); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, l = bx(s, .3, .025, .04, '#6a5a44', Math.cos(a) * .15, .05, Math.sin(a) * .15, {}, -a); } return s; }
  function vasetti(g, x, y, z) { const s = sub(g, x, y, z); [['#8a6a3a', .1], ['#5a7a5a', .08], ['#c8a03a', .12], ['#3a5a8a', .07]].forEach(([c, h], i) => cy(s, .035, .035, h, c, i * .09, h / 2, (i % 2) * .05, { roughness: .3 })); return s; }
  function bottiglie(g, x, y, z) { const s = sub(g, x, y, z); ['#3a5a2a', '#6a3a1a', '#c8c8b0'].forEach((c, i) => { cy(s, .035, .035, .2, c, i * .08, .1, 0, { roughness: .15, transparent: true, opacity: .85 }); cy(s, .012, .012, .07, c, i * .08, .23, 0); }); return s; }
  function attrezziSparsi(g, w, y, z) { const s = sub(g, 0, y, z); for (let i = 0; i < 5; i++) { const xx = (R() - .5) * w * .7, zz = (R() - .5) * .25; bx(s, .18 + R() * .1, .015, .025, ['#a8acb4', '#c83a2a', '#3a3a3a'][i % 3], xx, .01, zz, MET, R() * 3); } return s; }
  // ---------------- PER TERRA E CONTRO IL MURO ----------------
  function tanica(g, x, y, z, ry, c) { const s = sub(g, x, y, z, ry); bx(s, .34, .44, .17, c || '#c83a2a', 0, .22, 0, { roughness: .5 }); bx(s, .2, .06, .05, c || '#c83a2a', -.02, .47, 0); cy(s, .03, .03, .07, '#2a2a2a', .12, .48, 0); bx(s, .3, .38, .005, '#e8e0c8', 0, .22, .088); return s; }
  function estintore(g, x, y, z) { const s = sub(g, x, y, z); cy(s, .08, .08, .55, '#c82a24', 0, .28, 0, { roughness: .4, metalness: .2 }); sp(s, .08, '#c82a24', 0, .55, 0); bx(s, .1, .04, .05, '#2a2a2a', 0, .64, 0); cy(s, .015, .015, .3, '#1a1a1a', .1, .5, 0, {}, 0, .5); return s; }
  function bobina(g, x, y, z, ry) {   // [oggetti] rocchetto di legno coi fori, spire di cavo arancione, il capo che pende
    const s = sub(g, x, y, z, ry); for (const zz of [-.13, .13]) { cy(s, .26, .26, .025, '#b08a5a', 0, .26, zz, {}, Math.PI / 2, 0, 18); cy(s, .05, .05, .03, '#4a3a28', 0, .26, zz, {}, Math.PI / 2, 0, 10); }
    for (let k = 0; k < 5; k++) { const t = new THREE.Mesh(new THREE.TorusGeometry(.17, .022, 6, 18), mat('#d8682a')); t.position.set(0, .26, -.1 + k * .05); t.castShadow = true; s.add(t); }
    const tail = new THREE.Mesh(new THREE.TorusGeometry(.12, .02, 6, 14, Math.PI * 1.3), mat('#d8682a')); tail.position.set(.24, .1, .05); tail.rotation.set(Math.PI / 2, 0, 1.2); s.add(tail); return s; }
  function fari(g, x, y, z) { const s = sub(g, x, y, z); for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2, l = bx(s, .025, .9, .025, '#e8c030', Math.cos(a) * .18, .42, Math.sin(a) * .18, {}, 0, Math.sin(a) * .2, -Math.cos(a) * .2); } bx(s, .03, 1, .03, '#e8c030', 0, 1.2, 0); bx(s, .7, .04, .04, '#e8c030', 0, 1.7, 0); for (const xx of [-.22, .22]) { bx(s, .26, .2, .12, '#2a2a2e', xx, 1.82, 0); named(bx(s, .22, .16, .01, '#fff8e0', xx, 1.82, .061, GLOW('#fff0c0')), 'luce'); } return s; }
  function generatore(g, x, y, z, ry) { const s = sub(g, x, y, z, ry); bx(s, .7, .45, .45, '#d8b040', 0, .35, 0, { roughness: .6 }); for (const yy of [.1, .6]) for (const xx of [-.35, .35]) for (const zz of [-.23, .23]) {} const fr = [[-.36, 0], [.36, 0]]; fr.forEach(([xx]) => { bx(s, .03, .62, .03, '#2a2a2e', xx, .31, -.24); bx(s, .03, .62, .03, '#2a2a2e', xx, .31, .24); }); bx(s, .78, .03, .03, '#2a2a2e', 0, .62, -.24); bx(s, .78, .03, .03, '#2a2a2e', 0, .62, .24); for (const xx of [-.3, .3]) cy(s, .1, .1, .06, '#1a1a1a', xx, .1, .27, {}, Math.PI / 2); named(cy(s, .1, .1, .02, '#3a3a3a', .2, .4, .23, {}, Math.PI / 2), 'ventola'); bx(s, .15, .1, .01, '#2a2a2a', -.15, .45, .226); return s; }
  function armadietti(g, x, y, z, ry, c) { const s = sub(g, x, y, z, ry); for (let i = 0; i < 3; i++) { const xx = (i - 1) * .4; bx(s, .38, 1.8, .45, c || '#d8782a', xx, .9, 0, { roughness: .6, metalness: .25 }); for (let j = 0; j < 4; j++) bx(s, .2, .015, .01, '#3a2a1a', xx, 1.6 - j * .04, .23); bx(s, .02, .1, .02, '#c8c8c8', xx + .14, .95, .235, MET); bx(s, .12, .08, .005, '#f0ece0', xx, 1.35, .228); } return s; }
  function castello(g, x, y, z, ry) { const s = sub(g, x, y, z, ry); for (const xx of [-.95, .95]) for (const zz of [-.42, .42]) bx(s, .05, 1.7, .05, '#3a3a40', xx, .85, zz, MET); for (const yy of [.35, 1.25]) { bx(s, 1.95, .05, .9, '#3a3a40', 0, yy, 0, MET); bx(s, 1.85, .14, .82, '#5a5e6a', 0, yy + .09, 0); bx(s, .4, .1, .6, '#d8d4c8', -.65, yy + .2, 0); const c = bx(s, 1.1, .05, .84, '#6a6e7a', .3, yy + .17, 0); c.rotation.z = .02; } for (let i = 0; i < 4; i++) bx(s, .03, .03, .9, '#3a3a40', .95, .55 + i * .25, 0, MET); return s; }
  function scaffaleMet(g, x, y, z, ry) { const s = sub(g, x, y, z, ry); for (const xx of [-.55, .55]) for (const zz of [-.22, .22]) bx(s, .04, 1.9, .04, '#4a4c52', xx, .95, zz, MET); for (let j = 0; j < 4; j++) { const yy = .25 + j * .5; bx(s, 1.14, .03, .46, '#5a5c62', 0, yy, 0, MET); for (let i = 0; i < 3; i++) { const k = R(); if (k < .35) bx(s, .3, .22, .3, '#a8885a', -.35 + i * .35, yy + .12, 0); else if (k < .6) cassetta(s, -.35 + i * .35, yy + .015, 0, 0, ['#3a5a8a', '#b8302a', '#3a3a3a'][i]); else if (k < .8) cy(s, .1, .1, .2, '#8a8e96', -.35 + i * .35, yy + .1, 0, MET); else bobina(s, -.35 + i * .35, yy, 0, 0); } } return s; }
  function cassaMetallo(g, x, y, z, ry) { const s = sub(g, x, y, z, ry); bx(s, .6, .4, .4, '#8a8e96', 0, .2, 0, MET); bx(s, .62, .03, .42, '#6a6e76', 0, .4, 0, MET); bx(s, .14, .03, .01, '#2a2a2a', 0, .32, .201); return s; }
  function cartone(g, x, y, z, ry, k) { const s = sub(g, x, y, z, ry); const w = .4 * (k || 1); bx(s, w, w * .8, w, '#b8925e', 0, w * .4, 0); bx(s, w + .005, .03, .08, '#d8c8a0', 0, w * .8, 0); return s; }
  function lumeOlio(g, x, y, z) { const s = sub(g, x, y, z); cy(s, .06, .07, .05, '#8a6a3a', 0, .025, 0, MET); named(cy(s, .045, .05, .12, '#fff0c0', 0, .11, 0, Object.assign({ transparent: true, opacity: .85 }, GLOW('#ffc860'))), 'luce'); cy(s, .03, .05, .04, '#8a6a3a', 0, .19, 0, MET); return s; }
  function mappa(g, w, h, x, y, z) { const s = sub(g, x, y, z); bx(s, w, h, .01, '#d8ccaa', 0, 0, 0); for (let i = 0; i < 6; i++) bx(s, w * (.15 + R() * .3), h * (.1 + R() * .2), .012, ['#7a9a6a', '#a8b880', '#8ab0c8'][i % 3], (R() - .5) * w * .6, (R() - .5) * h * .6, .002); for (let i = 0; i < 4; i++) sp(s, .015, '#c83a2a', (R() - .5) * w * .8, (R() - .5) * h * .8, .01); return s; }
  function manifestino(g, x, y, z, c) { bx(g, .4, .55, .01, '#e8e0cc', x, y, z); bx(g, .3, .25, .012, c || '#c83a2a', x, y + .08, z + .002); }

  // ---------------- LE POSTAZIONI COMPOSTE ----------------
  // il banco delle armi: improvvisato su sacchi e pallet, telo, pannello con gli attrezzi, morsa, cassetta rossa, lampada
  function bancoArmi(g) { pallet(g, -.6, 0, 0); pallet(g, .6, 0, 0); sacchi(g, -.6, .15, 0, 0, 2, 3); sacchi(g, .6, .15, 0, 0, 2, 3); piano(g, 2.4, .9, .82, '#a88a5e'); telo(g, 2.4, .9, .84, -.5, 0);
    pannello(g, 2.2, 1.1, 0, .86, -.42); morsa(g, .95, .86, .2, 0); cassetta(g, .45, .86, .05, -.2); lampada(g, -1, .86, -.25, .6); bottiglie(g, -.9, .86, .1); attrezziSparsi(g, 2.2, .865, .1);
    const fucile = new THREE.Group(); bx(fucile, .75, .05, .07, '#2a2a2e', 0, 0, 0, MET); bx(fucile, .3, .07, .06, '#5a3a20', -.42, -.01, 0); fucile.position.set(-.1, .88, .15); fucile.rotation.y = .3; g.add(fucile); tanica(g, 1.4, 0, .3, -.4); }
  // il banco da lavoro: ferro verde con le mensole, cassette dei pezzi, monitor, lampada, cassettiera e sgabello
  function bancoLavoro(g) { const c = '#5a7a6a'; for (const xx of [-.9, .9]) for (const zz of [-.35, .35]) bx(g, .05, zz < 0 ? 1.7 : .85, .05, c, xx, zz < 0 ? .85 : .42, zz, MET); piano(g, 1.9, .8, .87, '#b08a5a'); bx(g, 1.85, .03, .7, '#a08050', 0, .2, 0);
    for (const yy of [1.25, 1.6]) { bx(g, 1.85, .03, .3, '#b08a5a', 0, yy, -.25); for (let i = 0; i < 5; i++) bx(g, .2, .1, .22, ['#3a5a8a', '#8a3a2a', '#3a3a3a'][i % 3], -.75 + i * .36, yy + .065, -.25); }
    morsa(g, -.8, .89, .2, -.2); crt(g, -.2, .89, -.05, .15); lampada(g, .6, .89, -.1, -.4); vasetti(g, .2, .89, .1); radio(g, .5, 1.62, -.25, 0); cassettiera(g, .55, 0, .1, 0); sgabello(g, -.5, 0, .75); attrezziSparsi(g, 1.6, .895, .2); }
  // la cucina del covo: casse, fornello da campo, pentola, taniche d'acqua, barattoli
  function cucina(g) { cassaMil(g, 1, .55, .5, '#4a5a3a', -.55, 0, 0); cassaMil(g, 1, .55, .5, '#4a5a3a', .55, 0, 0); piano(g, 2.2, .6, .58, '#8a7a5a');
    cy(g, .2, .22, .08, '#3a3a3a', -.5, .65, 0, MET); named(cy(g, .14, .14, .02, '#3080ff', -.5, .7, 0, GLOW('#2060ff')), 'fiamma'); cy(g, .16, .14, .2, '#8a8e96', -.5, .8, 0, MET); named(sp(g, .06, '#e8e8e8', -.5, .98, 0, { transparent: true, opacity: .5 }), 'vapore');
    cy(g, .1, .12, .16, '#2a2a2e', -.05, .69, .05, MET); vasetti(g, .25, .61, -.1); bottiglie(g, .7, .61, -.05); tanica(g, 1.25, 0, 0, -.3, '#3a6aa0'); tanica(g, 1.25, 0, .35, .2, '#3a6aa0'); cartone(g, -1.3, 0, .1, .3); bx(g, .4, .03, .25, '#c8b080', .35, .615, .15); }
  // il focolare: pietre in cerchio, ceppi, treppiede col paiolo
  function focolare(g) { for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; const p = new THREE.Mesh(new THREE.DodecahedronGeometry(.16), mat('#6a6a68', { roughness: 1 })); p.position.set(Math.cos(a) * .55, .1, Math.sin(a) * .55); p.scale.y = .7; p.castShadow = true; g.add(p); }
    // [oggetti] braci, ciocchi a capanna anneriti in punta, tre lingue di fuoco a goccia (si animano per nome: fiamma, fiamma2)
    cy(g, .32, .36, .05, '#3a1a10', 0, .03, 0, GLOW('#a02a08'));
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, l = new THREE.Group(); l.position.set(Math.cos(a) * .2, .2, Math.sin(a) * .2); l.rotation.set(0, -a, .55); g.add(l);
      cy(l, .05, .055, .55, '#5a3a20', 0, 0, 0, {}, 0, 0, 8); cy(l, .052, .05, .14, '#1a1210', 0, .24, 0, {}, 0, 0, 8); }
    const tongue = (h, r) => new THREE.LatheGeometry([[0, 0], [r * .7, h * .08], [r, h * .25], [r * .8, h * .5], [r * .4, h * .78], [r * .12, h * .92], [0, h]].map(([a, b]) => new THREE.Vector2(a, b)), 10);
    const fl = (geo, c, e, x, z, ry, n) => { const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: c, emissive: e, emissiveIntensity: 1.2, transparent: true, opacity: .82, depthWrite: false, roughness: 1 })); m.position.set(x, .1, z); m.rotation.y = ry; m.name = n; g.add(m); return m; };
    fl(tongue(.75, .26), '#ff7a1a', '#ff5a10', 0, 0, 0, 'fiamma'); fl(tongue(.55, .14), '#ff9a30', '#ff6a18', .1, .06, 1, 'fiamma'); fl(tongue(.48, .15), '#ffd860', '#ffb030', -.04, -.03, 2, 'fiamma2');
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; const l = bx(g, .03, 1.4, .03, '#2a2a2e', Math.cos(a) * .45, .65, Math.sin(a) * .45, MET, 0, Math.sin(a) * .3, -Math.cos(a) * .3); } cy(g, .18, .14, .22, '#2a2a2e', 0, 1.05, 0, MET); cy(g, .005, .005, .35, '#3a3a3a', 0, 1.3, 0);
    for (let i = 0; i < 4; i++) cy(g, .08, .08, .45, '#6a4a2a', 1.1, .08 + (i % 2) * .15, -.3 + i * .17, {}, 0, Math.PI / 2); }
  // il laboratorio tessile: tavolo su cavalletti, macchina da cucire, rotoli di stoffa, manichino, filo
  function tessile(g, macchina) { cavalletti(g, 1.8, 0, 0, 0); piano(g, 1.8, .8, .8, '#b8a07a'); if (macchina) { macchina.position.set(-.3, .07, 0); g.add(macchina); }
    [['#7a2e2a', 0], ['#2e4a6a', .22], ['#c8b88a', .44]].forEach(([c, zz]) => cy(g, .08, .08, .7, c, .55, .9, -.25 + zz, {}, 0, Math.PI / 2)); bx(g, .5, .01, .4, '#5a7a5a', .1, .83, .15);
    const mn = sub(g, 1.3, 0, -.3); cy(mn, .02, .02, 1, '#3a3a3a', 0, .5, 0); sp(mn, .2, '#d8c8a8', 0, 1.2, 0, {}, 1, 1.3, .7); cy(mn, .15, .02, .1, '#3a3a3a', 0, .04, 0); named(bx(g, .015, .12, .015, '#c8c8d0', -.13, .97, 0, MET), 'ago'); }
  // la stamperia: ciclostile su una cassa, risme di carta, latte d'inchiostro, fogli stesi ad asciugare
  function stamperia(g, cic) { cassaLegno(g, 1, .6, .7, 0, 0, 0); if (cic) { cic.position.set(0, .6, 0); cic.scale.setScalar(.8); g.add(cic); } else bx(g, .7, .4, .5, '#3a3a3a', 0, .8, 0);
    named(cy(g, .07, .07, .55, '#2a2a2a', 0, 1.05, .2, MET, 0, Math.PI / 2), 'rullo');
    for (let i = 0; i < 3; i++) bx(g, .32, .1, .45, '#f0ece2', -1, .05 + i * .1, 0, {}, R() * .2); cy(g, .1, .1, .18, '#1a1a2a', .9, .09, .2, MET); cy(g, .1, .1, .18, '#1a1a2a', .9, .09, -.1, MET);
    for (const xx of [-1.3, 1.3]) bx(g, .04, 1.9, .04, '#6a5a44', xx, .95, -.6); cy(g, .005, .005, 2.6, '#c8c8c8', 0, 1.85, -.6, {}, 0, Math.PI / 2); for (let i = 0; i < 6; i++) { bx(g, .3, .42, .005, '#f0ece2', -1 + i * .4, 1.6, -.6); bx(g, .2, .08, .006, '#c83a2a', -1 + i * .4, 1.7, -.596); } }
  // il banco radio: scrivania, radio impilate, televisore, mappa al muro, sedia, antenna
  function bancoRadio(g) { for (const xx of [-.8, .8]) for (const zz of [-.3, .3]) bx(g, .05, .75, .05, '#6a4a2c', xx, .37, zz); piano(g, 1.8, .75, .76, '#7a5634'); radio(g, -.45, .79, -.1, .1); radio(g, -.45, 1.01, -.15, .05); tv(g, .35, .79, -.1, -.15);
    bx(g, .25, .05, .18, '#2a2a2a', .1, .81, .2); cy(g, .03, .03, .05, '#2a2a2a', .25, .83, .22); mappa(g, 1.2, .8, 0, 1.6, -.4); lumeOlio(g, .75, .79, .15); manifestino(g, -.85, 1.5, -.39, '#2a5a8a');
    const sd = sub(g, 0, 0, .7, Math.PI); bx(sd, .45, .04, .42, '#7a5634', 0, .45, 0); for (const xx of [-.2, .2]) for (const zz of [-.18, .18]) bx(sd, .04, .45, .04, '#5a3a20', xx, .22, zz); bx(sd, .45, .45, .04, '#7a5634', 0, .7, -.2); }
  // l'infermeria: branda, cassetta del pronto, flebo, lampada, catino
  function infermeria(g) { castelloBasso(g); cassaMetallo(g, 1.25, 0, -.2, 0); bx(g, .35, .2, .22, '#f0ece2', 1.25, .5, -.2); bx(g, .06, .14, .01, '#c82a24', 1.25, .5, -.089); bx(g, .14, .05, .01, '#c82a24', 1.25, .5, -.088);
    cy(g, .015, .015, 1.7, '#c8c8d0', -1.2, .85, -.3, MET); bx(g, .3, .015, .015, '#c8c8d0', -1.2, 1.7, -.3, MET); bx(g, .1, .18, .05, '#d8e8f0', -1.08, 1.55, -.3, { transparent: true, opacity: .8 }); lampada(g, 1.1, .6, .1, 2); cy(g, .2, .15, .1, '#c8ccd4', -1.1, .05, .3, MET); }
  function castelloBasso(g) { for (const xx of [-.9, .9]) for (const zz of [-.4, .4]) bx(g, .04, .45, .04, '#3a3a40', xx, .22, zz, MET); bx(g, 1.85, .14, .8, '#d8d4c8', 0, .5, 0); bx(g, .4, .1, .55, '#f0ece2', -.65, .62, 0); }
  // la forgia: il fuoco col mantice, l'incudine sul ceppo, le tenaglie, il secchio del carbone
  function forgiaExtra(g) { cy(g, .25, .3, .55, '#5a3a20', .9, .27, .3); bx(g, .45, .14, .18, '#3a3a40', .9, .62, .3, MET); bx(g, .2, .08, .14, '#3a3a40', 1.17, .64, .3, MET); for (let i = 0; i < 2; i++) bx(g, .45, .02, .03, '#2a2a2e', .9, .7, .25 + i * .06, MET, .3); cy(g, .18, .14, .3, '#3a3a3a', -.9, .15, .4, MET); sp(g, .14, '#1a1a1a', -.9, .3, .4, {}, 1, .4, 1); }

  return { pallet, sacchi, cassaMil, cassaLegno, cavalletti, piano, telo, pannello, morsa, cassetta, lampada, crt, tv, radio, cassettiera, sgabello, vasetti, bottiglie, attrezziSparsi,
    tanica, estintore, bobina, fari, generatore, armadietti, castello, scaffaleMet, cassaMetallo, cartone, lumeOlio, mappa, manifestino,
    bancoArmi, bancoLavoro, cucina, focolare, tessile, stamperia, bancoRadio, infermeria, forgiaExtra, mat };
})();
