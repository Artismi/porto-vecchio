// Scorcio 5: il Golfo delle Dune alla Foce della Fiumara: la spiaggia lunga, il cordone di dune con lo sparto e i gigli,
// il canneto dietro, la passerella di tavole, il ponticello di pietra sul torrente, la strada fra oleandri e pini
(function () {
  const R = K.rnd, T = THREE;
  const riva = K.spline([[-110, 14], [-60, 18], [-20, 20], [10, 21], [24, 24], [34, 22], [60, 18], [110, 12]], .6);
  const fiume = K.spline([[30, -70], [26, -40], [18, -22], [24, -8], [30, 4], [27, 14], [29, 26]], .4);
  const strada = K.spline([[-110, -26], [-60, -28], [-20, -27], [20, -25], [50, -22], [110, -18]], .4);
  const HS = s => 2.6;
  const SW = 6.5;
  const hf = (x, z) => { const sd = K.sdist(riva, x, z), nf = K.near(fiume, x, z), ns = K.near(strada, x, z);
    if (sd < 0) return -.45 - Math.min(4.5, -sd * .09);
    let h = sd * .06;
    const dz = sd - 22, duna = Math.exp(-dz * dz / 40) * (2.6 + 1.4 * K.fbm(x * .06, 3)) + (K.fbm(x * .2, z * .2) - .5) * .9 * Math.exp(-dz * dz / 60);
    h += duna; if (sd > 28) h = Math.max(h, .3 + (K.fbm(x * .1, z * .1) - .5) * .4);
    const fw = 2.2 + Math.max(0, nf.s - 70) * .1; if (nf.d < fw + 6) { const k = Math.min(1, Math.max(0, (nf.d - fw) / 6)); h = (-.7) * (1 - k * k) + h * k * k; }
    if (ns.d < SW / 2 + 3) { const k = Math.min(1, Math.max(0, (ns.d - SW / 2 - .4) / 2.6)); h = HS(0) * (1 - k) + h * k; }
    if (z < -32) h += (-32 - z) * .18;
    return h; };
  const cf = (x, z, h) => { const sd = K.sdist(riva, x, z), nf = K.near(fiume, x, z), ns = K.near(strada, x, z);
    if (ns.d < SW / 2 + .5) return '#8c8678'; if (sd < 0) return '#c8b088'; if (nf.d < 3.2 && h < 0) return '#9a8a68';
    if (sd < 3) return '#d8c294'; if (sd < 16) return K.noise(x * .3, z * .3) > .6 ? '#cbbd98' : '#d8caa4'; if (sd < 28) return K.noise(x * .5, z * .5) > .5 ? '#e2d0a0' : '#c9bf86';
    if (nf.d < 16 && sd < 46) return '#8e9a56'; const q = K.fbm(x * .15, z * .15); return q > .52 ? '#76904a' : '#a2a060'; };
  K.terrain(-120, 120, -80, 55, .5, hf, cf); K.sea(-120, 120, -45, 55, (x, z) => -.45 - hf(x, z));
  K.strada(strada, SW, HS);
  // il ponticello di pietra a schiena d'asino sul torrente
  { const p = K.near(strada, 22, -24), q = K.at(strada, p.s), bx = q.x, bz = q.z; const g = new T.Group();
    for (const sd of [-1, 1]) { const sh = new T.Shape(); sh.moveTo(-6, 0); sh.lineTo(-6, 3.2); sh.quadraticCurveTo(0, 3.9, 6, 3.2); sh.lineTo(6, 0); sh.lineTo(3.4, 0); sh.absarc(0, 0, 3.4, 0, Math.PI, false); sh.lineTo(-6, 0);
      const m = new T.Mesh(new T.ExtrudeGeometry(sh, { depth: .5, bevelEnabled: false }), K.mat('#c8b89a')); m.position.set(0, -1.2, sd * (SW / 2 + .2) - .25); m.castShadow = m.receiveShadow = true; g.add(m);
      const c = new T.Mesh(new T.BoxGeometry(12.4, .25, .62), K.mat('#e0d4bc')); c.position.set(0, 2.85, sd * (SW / 2 + .2)); g.add(c); }
    const v = new T.Mesh(new T.CylinderGeometry(3.4, 3.4, SW + .4, 16, 1, true, -Math.PI / 2, Math.PI), K.mat('#b8a888', { side: T.DoubleSide })); v.rotation.x = Math.PI / 2; v.position.set(0, -1.2, 0); g.add(v);
    g.position.set(bx, 0, bz); g.rotation.y = -Math.atan2(q.tz, q.tx); K.scene.add(g); }
  // l'acqua del torrente: un nastro che si allarga verso la foce
  K.ribbon(fiume, 4.2, -.5, '#4a9aa8', 0, () => 0);
  // il canneto lungo il torrente e nelle conche dietro le dune
  for (let k = 0; k < 42; k++) { const p = K.at(fiume, R() * (fiume.L - 14)), sd = R() < .5 ? -1 : 1, o = sd * (3 + R() * 6); K.canne(p.x - p.tz * o, 0, p.z + p.tx * o, 1.6, 22); }
  for (let k = 0; k < 18; k++) { const x = -100 + R() * 110, z = -14 + R() * 6; K.canne(x, 0, z, 2, 20); }
  // le dune: sparto, gigli di mare, ginepri; la passerella di tavole con la staccionata di pali e corda
  for (let k = 0; k < 120; k++) { const p = K.at(riva, R() * riva.L), o = -(16 + R() * 14), x = p.x - p.tz * o, z = p.z + p.tx * o; if (K.near(fiume, x, z).d < 5) continue; K.sparto(x, z, 4, 1.2); if (R() < .15) K.cespuglio(x + 1, K.H(x + 1, z), z, .9, '#4a6a3a'); if (R() < .1) for (let j = 0; j < 3; j++) K.sph(.12, '#fbf6ea', x + R(), K.H(x, z) + .35, z + R(), 1, .6, 1, 0); }
  const pas = K.spline([[-30, -22], [-31, -14], [-28, -6], [-30, 2], [-29, 8]], .32); const tav = []; for (let s = 0; s < pas.L; s += .3) { const p = K.at(pas, s); tav.push([p.x, K.H(p.x, p.z) + .25, p.z, Math.atan2(p.tx, p.tz), 0, 0, 1, 1.5, .06, .24]); }
  K.inst(new T.BoxGeometry(1, 1, 1), '#a88a62', tav); const pal = []; for (let s = 0; s < pas.L; s += 2) { const p = K.at(pas, s); for (const sd of [-1, 1]) { const x = p.x - p.tz * sd * 1.05, z = p.z + p.tx * sd * 1.05; pal.push([x, K.H(x, z) + .5, z, 0, 0, 0, 1, .08, 1, .08]); } } K.inst(new T.BoxGeometry(1, 1, 1), '#7a6448', pal);
  // la strada: oleandri e pini domestici sul lato monte, le auto in sosta sulla banchina, il cartello della spiaggia
  for (let x = -105; x < 110; x += 7 + R() * 5) { const p = K.near(strada, x, -32), q = K.at(strada, p.s), xx = q.x - q.tz * -(SW / 2 + 2), zz = q.z + q.tx * -(SW / 2 + 2); if (Math.abs(xx - 22) < 9) continue; K.oleandro(xx, K.H(xx, zz), zz, .9 + R() * .4); }
  for (let x = -100; x < 110; x += 14 + R() * 8) { const zz = -36 - R() * 10; if (Math.abs(x - 26) < 10) continue; K.pino(x, K.H(x, zz), zz, 10 + R() * 3); }
  K.auto(-34, HS(0), -21.5, Math.PI / 2 + .05, '#8a8a70'); K.cartellone('LA SPIAGGIA È DEL POPOLO\nIL MARE È DELL\'IMPERO', 4, HS(0), -33, 0, 6.5, 2.4, '#7a2a26', '#efe4cc'); K.cartello('SPIAGGIA DELLE DUNE', -26, HS(0), -21.8, 0, 2.6, .5, '#fff', '#8a5a2a');
  // la spiaggia d'inverno: il pescatore con la canna lunga sulla battigia, chi cammina col cane, la casamatta sulla duna,
  // il chiosco di tavole inchiodato per l'inverno, la posidonia a mucchi, il cartello della zona vietata ai bagni
  K.persona(-40, K.H(-40, 18.5), 18.5, '#4a5040', 1.7); K.cyl(.015, .025, 5, '#333', -40, K.H(-40, 18.5) + 1, 20.5, 4);
  K.persona(-12, K.H(-12, 15), 15, '#6a2e2a', 1.7); K.sph(.25, '#5a4a3a', -11, K.H(-11, 15.6) + .3, 15.6, 1.6, .8, 1, 1);
  K.persona(-58, K.H(-58, 12), 12, K.cappotto(), 1.6); K.persona(-57, K.H(-57, 12.4), 12.4, K.cappotto(), 1.7);
  K.bunker(-6, K.H(-6, -1) - 1.2, -1, .2);
  { const x = -46, z = -4, h = K.H(x, z); K.box(4.5, 2.6, 3.4, '#8a7458', x, h, z, .05); K.box(5, .15, 4, '#6a6a68', x, h + 2.7, z, .05); for (let k = 0; k < 6; k++) K.box(4.2, .14, .05, '#6a5a44', x, h + .5 + k * .35, z + 1.73, .05); K.scritta('CHIUSO', 1.6, .4, '#eee', '#7a2a26', x, h + 2.2, z + 1.78, .05); }
  { const B = []; for (let t = 0; t < riva.L; t += .5) { const p = K.at(riva, t); if (K.noise(t * .07, 3) < .5) continue; const o = -3 - R() * 2, x = p.x - p.tz * o, z = p.z + p.tx * o; B.push([x, K.H(x, z) + .01, z, R() * 6, 0, 0, .25 + R() * .3, 1.6, .06, .7]); } K.inst(new THREE.DodecahedronGeometry(1, 0), '#6a5a42', B); }
  K.cartello('BALNEAZIONE VIETATA', -20, K.H(-20, 4), 4, 0, 2.6, .5, '#fff', '#7a2a26');
  K.barca(40, K.H(40, 16) - .05, 16, .4, 4.8, '#f2ead8', '#2f7a5a', .1);
  K.finisci(8, -8, 215, { az: 2.75, el: .3 });
})();
