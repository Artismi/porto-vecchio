// Scorcio 6: la Costiera di Tramontana sotto la Punta del Corvo: la strada esce da una galleria corta nella roccia, il bar
// sulla curva col pergolato sul mare, il distributore anni 70 con la pensilina, la torre costiera sullo sperone
(function () {
  const R = K.rnd, T = THREE;
  // la riva va da est a ovest: la terra è a sud (verso la camera), il mare in fondo
  const riva = K.spline([[110, -20], [70, -24], [40, -18], [22, -26], [4, -30], [-14, -40], [-30, -44], [-44, -34], [-62, -26], [-110, -22]], .5);
  const strada = K.spline([[110, 6], [70, 2], [40, 4], [18, -2], [0, -10], [-22, -12], [-44, -6], [-70, 0], [-110, 4]], .4);
  const HS = s => 5.5 + (s - 120) * .012;
  const SW = 6.5;
  const sperone = (x, z) => Math.max(0, 1 - Math.hypot((x + 24) / 21, (z + 20) / 24));
  const gal = s => s > 112 && s < 138;   // la galleria
  const hf = (x, z) => { const sd = K.sdist(riva, x, z), n = K.near(strada, x, z), hr = HS(n.s), sp = sperone(x, z);
    if (sd < 0) return -.45 - Math.min(7, -sd * .4) + (K.fbm(x * .3, z * .3) - .5);
    let h = Math.min(.5 + sd * 1.1, hr - .2 + (K.fbm(x * .1, z * .1) - .5) * 1.5) + (K.fbm(x * .5, z * .5) - .5) * Math.min(1.4, sd * .3);
    if (z > 12) h = Math.max(h, hr + (z - 12) * .35 + (K.fbm(x * .07, z * .07) - .5) * 3);
    h = Math.max(h, sp * sp * 17 + (K.fbm(x * .3, z * .3) - .5) * 3 * sp);
    if (n.d < SW / 2 + 3 && !gal(n.s)) { const k = Math.min(1, Math.max(0, (n.d - SW / 2 - .3) / 2.7)); h = hr * (1 - k) + h * k; }
    const bt = Math.hypot((x - 18) / 9, (z + 13) / 5); if (bt < 1.2) { const k = Math.min(1, Math.max(0, (bt - 1) / .2)); h = (HS(80) + .1) * (1 - k) + h * k; }   // la terrazza del bar
    const ds = Math.hypot((x - 32) / 10, (z - 13) / 6); if (ds < 1.25) { const k = Math.min(1, Math.max(0, (ds - 1) / .25)); h = (HS(60) + .05) * (1 - k) + h * k; }   // il piazzale del distributore
    return h; };
  const cf = (x, z, h) => { const sd = K.sdist(riva, x, z), n = K.near(strada, x, z), sp = sperone(x, z);
    if (sd < 0) return '#8a8072'; if (n.d < SW / 2 + .6 && !gal(n.s)) return '#8c8678';
    if (Math.hypot((x - 18) / 9, (z + 13) / 5) < 1) return '#d4c6ac'; if (Math.hypot((x - 32) / 10, (z - 13) / 6) < 1) return '#9a968c';
    if (sp > .25) return K.noise(x * .4, z * .4) > .58 ? '#7a8a4a' : '#a49a8a'; if (sd < 5) return '#a8a090';
    const q = K.fbm(x * .18, z * .18); return q > .55 ? '#6a8842' : q > .43 ? '#8f964e' : '#b0a472'; };
  K.terrain(-115, 115, -75, 70, .5, hf, cf); K.sea(-115, 115, -75, -5, (x, z) => -.45 - hf(x, z));
  // la strada fuori della galleria; dentro non si vede
  const fuori = strada.filter(p => !gal(p.s)); const est = strada.filter(p => p.s <= 113), ovest = strada.filter(p => p.s >= 137); est.L = 113; ovest.L = strada.L;
  K.strada(est, SW, HS); const ov2 = ovest.map(p => Object.assign({}, p, { s: p.s - 137 })); ov2.L = strada.L - 137; K.strada(ov2, SW, s => HS(s + 137));
  // i portali della galleria: l'arco in pietra, il buio dentro
  for (const s of [113, 137]) { const p = K.at(strada, s), ry = -Math.atan2(p.tz, p.tx) + Math.PI / 2, g = new T.Group();
    const sh = new T.Shape(); sh.moveTo(-6, 0); sh.lineTo(-6, 7.5); sh.lineTo(6, 7.5); sh.lineTo(6, 0); sh.lineTo(3.8, 0); sh.lineTo(3.8, 3); sh.absarc(0, 3, 3.8, 0, Math.PI, false); sh.lineTo(-3.8, 0); sh.lineTo(-6, 0);
    const m = new T.Mesh(new T.ExtrudeGeometry(sh, { depth: 1.2, bevelEnabled: false }), K.mat('#c0b49c')); m.position.set(0, HS(s), -.6); m.castShadow = m.receiveShadow = true; g.add(m);
    const d = new T.Mesh(new T.CylinderGeometry(3.7, 3.7, 3, 16, 1, false, -Math.PI / 2, Math.PI), K.mat('#16181c')); d.rotation.x = Math.PI / 2; d.scale.set(1, .3, 1); d.position.set(0, HS(s) + 3, 0); g.add(d); const d2 = new T.Mesh(new T.BoxGeometry(7.5, 3, .9), K.mat('#16181c')); d2.position.set(0, HS(s) + 1.5, 0); g.add(d2);
    g.position.set(p.x, 0, p.z); g.rotation.y = ry; K.scene.add(g); }
  // il guardrail sul mare, il muretto sul monte; i paracarri e la freccia della curva
  K.guardrail(strada, SW / 2 + .5, 4, 108, (x, z) => HS(K.near(strada, x, z).s)); K.guardrail(strada, SW / 2 + .5, 142, strada.L - 4, (x, z) => HS(K.near(strada, x, z).s));
  K.muretto(strada, -(SW / 2 + .9), 3, 40, .8, '#b4a68e'); K.muretto(strada, -(SW / 2 + .9), 82, 108, .8, '#b4a68e'); K.muretto(strada, -(SW / 2 + .9), 142, strada.L - 3, .8, '#b4a68e');
  { const p = K.at(strada, 96); for (let k = 0; k < 3; k++) { const q = K.at(strada, 92 + k * 3.5); K.scritta('>>', .9, .6, '#111', '#f2c81a', q.x - q.tz * (SW / 2 + 1.3), HS(92) + 1.3, q.z + q.tx * (SW / 2 + 1.3), -Math.atan2(q.tz, q.tx) + Math.PI); } }
  // il bar sulla curva: la casetta bianca, la terrazza col pergolato e le sedie, l'insegna, la Vespa
  { const bx = 18, bz = -13, hb = HS(80) + .1; K.casa(bx + 4, hb, bz + 1.2, 6, 5, 3.3, '#f4eee2', .45, { piatto: true, fascia: '#3f8aa8', persiane: '#3f8aa8', porta: 0 }); K.scritta('BAR  LA CURVA', 4.2, .7, '#c8402e', '#fff8e8', bx + 4 + 1.0, hb + 2.85, bz + 3.85, .45);
    K.box(9, .1, 5.6, '#7a5a3a', bx - 3.4, hb + 2.7, bz - 1, .45); for (const [a, b] of [[-7, -3.5], [0, -3.5], [-7, 1.6], [0, 1.6]]) K.box(.14, 2.7, .14, '#6a4a30', bx + a * .9 + b * .4, hb, bz - 1 + b * .9 - a * .4);
    for (let k = 0; k < 22; k++) K.sph(.55, k % 3 ? '#5f8a3a' : '#7aa048', bx - 3.4 + (R() - .5) * 8, hb + 2.9, bz - 1 + (R() - .5) * 5, 1, .35, 1);
    for (let k = 0; k < 4; k++) { const tx = bx - 6 + k * 2.2, tz = bz - 1.5 + (k % 2) * 1.4; K.cyl(.4, .4, .05, '#f4f0e8', tx, hb + .75, tz, 10); K.cyl(.04, .04, .75, '#555', tx, hb, tz, 5); for (const sx of [-.6, .6]) K.box(.4, .45, .4, '#c8402e', tx + sx, hb, tz); }
    K.persona(bx - 5.4, hb, bz - 1, '#3f6fa0', 1.7, true); K.persona(bx - 1.3, hb, bz - .1, '#f2c040', 1.7, true); K.persona(bx + .9, hb, bz + 1.3, '#f4f0ea');
    const vp = new T.Group(); const c1 = new T.Mesh(new T.CapsuleGeometry(.3, .9, 2, 8), K.mat('#a8d0c4')); c1.rotation.x = Math.PI / 2; c1.position.y = .55; vp.add(c1); vp.position.set(bx + 6.5, hb, bz + 5.5); vp.rotation.y = .3; K.scene.add(vp);
    K.balaustra(K.spline([[bx - 9, bz - 4], [bx - 2, bz - 6.4], [bx + 5, bz - 5]], .3), 0, hb, 0, 15, '#f2ece0'); }
  // il distributore anni 70: la pensilina sottile su due pilastri, due colonnine, il palo con l'insegna, il gabbiotto
  { const dx = 32, dz = 13, hd = HS(60) + .05; K.box(10, .35, 5, '#f4f0e6', dx, hd + 4.2, dz, .1); K.box(10.1, .25, 5.1, '#d8402e', dx, hd + 4.05, dz, .1); for (const a of [-3, 3]) K.box(.4, 4.1, .4, '#f4f0e6', dx + a, hd, dz - .3 * a / 3);
    for (const a of [-1.6, 1.6]) { K.box(.6, 1.7, .5, '#d8402e', dx + a, hd, dz, .1); K.box(.62, .5, .52, '#f4f0e6', dx + a, hd + 1.3, dz, .1); }
    K.casa(dx + 1, hd, dz + 5.5, 5, 3, 2.8, '#f4f0e6', .1, { piatto: true, fascia: '#d8402e', persiane: '#2f5a7a', porta: 2 }); K.cyl(.12, .12, 7, '#d0d0d0', dx - 6.5, hd, dz - 1.5, 6); K.cyl(1.2, 1.2, .3, '#f4f0e6', dx - 6.5, hd + 6.6, dz - 1.5, 20).rotation.x = Math.PI / 2;
    K.scritta('BANCO', 1.8, .7, '#d8402e', null, dx - 6.5, hd + 6.95, dz - 1.32, 0); K.auto(dx - 1.6, hd, dz + 1.6, 1.6, '#3a7a5a'); K.persona(dx + .5, hd, dz + 1.2, '#e8e0d0'); }
  // la torre costiera sullo sperone: tonda, la base a scarpa, i beccatelli
  { const tx = -24, tz = -24, ht = K.H(tx, tz) - .5; K.cyl(4.2, 5.2, 4, '#c8b896', tx, ht, tz, 20); K.cyl(3.8, 3.9, 6, '#d2c4a4', tx, ht + 4, tz, 20); K.cyl(4.2, 4.2, 1, '#c8b896', tx, ht + 10, tz, 20); for (let k = 0; k < 16; k++) { const a = k / 16 * 6.28; K.box(.9, .8, .6, '#c8b896', tx + Math.cos(a) * 4, ht + 11, tz + Math.sin(a) * 4, -a); } K.box(.8, 1.4, .1, '#2a2a2a', tx + 1.5, ht + 6, tz + 3.55, -.4); }
  // la macchia: oleandri sul bordo, agavi e fichi d'india sui sassi, pini sul monte, lecci
  for (let k = 0; k < 60; k++) { const x = -100 + R() * 200, z = -30 + R() * 90, sd = K.sdist(riva, x, z), n = K.near(strada, x, z); if (sd < 3 || n.d < SW / 2 + 2 || Math.hypot((x - 18) / 10, (z + 13) / 6) < 1 || Math.hypot((x - 32) / 11, (z - 13) / 7) < 1 || Math.hypot(x + 24, z + 24) < 7) continue;
    const h = K.H(x, z), q = R(); if (z > 14 && q < .35) K.pino(x, h, z, 8 + R() * 3); else if (q < .55) K.ficodindia(x, h, z, 1.2 + R() * .5); else if (q < .7) K.agave(x, h, z, 1.1 + R() * .4, R() < .3); else if (q < .85) K.oleandro(x, h, z, 1 + R() * .4); else K.cespuglio(x, h, z, 1 + R() * .7, '#567a3e'); }
  for (let k = 0; k < 90; k++) { const p = K.at(riva, R() * riva.L), d = R() * 4.5, x = p.x - p.tz * (1.5 - d), z = p.z + p.tx * (1.5 - d); K.roccia(x, K.H(x, z) + .1, z, .6 + R() * 1.4, R() < .5 ? '#aaa08e' : '#9a9080'); }
  K.auto(60, HS(K.near(strada, 60, 2).s), 4, Math.PI / 2, '#6a6a60'); { const p = K.at(strada, 150); for (const o of [-1, 1]) K.box(.8, .9, .3, o < 0 ? '#c8c0b0' : '#7a2a26', p.x - p.tz * o * 2, HS(150), p.z + p.tx * o * 2, -Math.atan2(p.tz, p.tx)); K.persona(p.x - p.tz * -4.6, HS(150), p.z + p.tx * -4.6, '#2e3a4a', 1.8); K.persona(p.x - p.tz * -5.4, HS(150), p.z + p.tx * -5.4, '#2e3a4a', 1.8); }   // il posto di blocco della Tutela all'uscita della galleria
  K.barca(-60, -.45, -50, 1.1, 5.5, '#f2ead8', '#c8402e');
  K.finisci(-2, -12, 235, { az: 2.75, el: .3, ly: 4 });
})();
