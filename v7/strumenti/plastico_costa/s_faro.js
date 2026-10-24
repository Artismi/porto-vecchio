// Scorcio 4: Capo della Fiumara: la curva a gomito sulla punta con la piazzola panoramica (muretto a secco, panchina,
// l'edicoletta votiva), il faro sulla punta col sentiero, i fichi d'india e le agavi in fiore
(function () {
  const R = K.rnd, T = THREE;
  const riva = K.spline([[-100, 10], [-60, 9], [-34, 13], [-20, 22], [-12, 34], [-4, 44], [7, 47], [15, 40], [20, 28], [30, 14], [50, 6], [75, 3], [100, 2]], .5);
  const strada = K.spline([[-100, -3], [-60, -1], [-32, 1], [-16, 6], [-4, 10], [8, 8], [16, 0], [30, -12], [55, -24], [100, -34]], .4);
  const HS = s => s < 92 ? 6 + s * .02 : 7.8 + (s - 92) * .09;
  const SW = 6.5;
  const pz0 = { x: -4, z: 17 };   // la piazzola fuori della curva
  const hf = (x, z) => { const sd = K.sdist(riva, x, z), n = K.near(strada, x, z), hr = HS(n.s);
    if (sd < 0) return -.45 - Math.min(7, -sd * .4) + (K.fbm(x * .3, z * .3) - .5);
    const capo = Math.max(0, 1 - Math.hypot((x - 3) / 22, (z - 26) / 26));
    let h = Math.min(.5 + sd * .9, 3 + capo * 7 + (K.fbm(x * .2, z * .2) - .5) * 2) + (K.fbm(x * .5, z * .5) - .5) * Math.min(1.2, sd * .3);
    if (z < -8) h = Math.max(h, 6 + (-8 - z) * .42 + (K.fbm(x * .08, z * .08) - .5) * 3);
    const dp = Math.hypot((x - pz0.x) / 9, (z - pz0.z) / 6); if (dp < 1.3) { const k = Math.min(1, Math.max(0, (dp - 1) / .3)); h = (HS(80) + .05) * (1 - k) + h * k; }
    if (n.d < SW / 2 + 3) { const k = Math.min(1, Math.max(0, (n.d - SW / 2 - .3) / 2.7)); h = hr * (1 - k) + h * k; }
    return h; };
  const cf = (x, z, h) => { const sd = K.sdist(riva, x, z), n = K.near(strada, x, z);
    if (sd < 0) return '#8a8072'; if (Math.hypot((x - pz0.x) / 9, (z - pz0.z) / 6) < 1) return '#c8bca4'; if (n.d < SW / 2 + .6) return '#8c8678';
    if (sd < 4) return K.noise(x * .6, z * .6) > .5 ? '#b8ae9c' : '#a69c8a';
    const q = K.fbm(x * .18, z * .18); return q > .56 ? '#6f8a44' : q > .44 ? '#93984f' : '#b8a874'; };
  K.terrain(-110, 110, -80, 70, .5, hf, cf); K.sea(-110, 110, -10, 70, (x, z) => -.45 - hf(x, z));
  K.strada(strada, SW, HS);
  K.guardrail(strada, SW / 2 + .5, 4, 52, (x, z) => HS(K.near(strada, x, z).s));
  K.guardrail(strada, SW / 2 + .5, 104, 150, (x, z) => HS(K.near(strada, x, z).s));
  K.muretto(strada, -(SW / 2 + .9), 2, strada.L - 2, .9, '#b8aa90');
  // la piazzola: il muretto a secco in tondo sul mare, la panchina, due macchine ferme, l'edicola
  const pzl = K.spline(Array.from({ length: 15 }, (_, i) => { const a = Math.PI * .05 + i / 14 * Math.PI * .9; return [pz0.x + Math.cos(a) * 8.6, pz0.z + Math.sin(a) * 5.6]; }), .4);
  K.muretto(pzl, 0, 0, pzl.L, .75, '#c0b296', () => HS(80) + .05);
  K.panchina(pz0.x - 2, HS(80) + .05, pz0.z + 3.6, Math.PI); K.panchina(pz0.x + 2.5, HS(80) + .05, pz0.z + 3.4, Math.PI);
  K.auto(pz0.x - 5, HS(80) + .05, pz0.z, 1.4, '#7a3a32'); K.bunker(14, K.H(14, 28) - 1, 28, -.8);
  K.persona(pz0.x - 1, HS(80) + .05, pz0.z + 3.6, K.cappotto(), 1.7, true); K.persona(pz0.x + 4.5, HS(80) + .05, pz0.z + 1.5, K.cappotto()); K.skater(pz0.x + 1, HS(80) + .05, pz0.z - 1, .4); K.skater(pz0.x + 2.4, HS(80) + .05, pz0.z - .2, .9);
  { const p = K.at(strada, 62); K.edicola(p.x - p.tz * -(SW / 2 + 1.6), HS(62), p.z + p.tx * -(SW / 2 + 1.6), -Math.atan2(p.tz, p.tx)); }
  // il faro sulla punta: torre bianca a fasce, la lanterna, la casa del guardiano; il sentiero dalla piazzola
  const fx = 4, fz = 38, fh = K.H(fx, fz);
  K.cyl(2.1, 2.5, 1.2, '#e6dccb', fx, fh - .2, fz, 16); K.cyl(1.5, 1.9, 11, '#f4efe4', fx, fh + 1, fz, 16); for (const y of [4, 8]) K.cyl(1.72 - y * .03, 1.8 - y * .03, 1.2, '#c8402e', fx, fh + y, fz, 16);
  K.cyl(1.9, 1.9, .3, '#3a3a3a', fx, fh + 12, fz, 16); K.cyl(1.05, 1.05, 1.6, K.mat('#d8f0f4', { emissive: '#fff0b0', emissiveIntensity: .4 }), fx, fh + 12.3, fz, 12); K.add(new T.ConeGeometry(1.3, 1.1, 12), '#c8402e', fx, fh + 14.4, fz);
  K.casa(fx - 7.5, K.H(fx - 7.5, fz - 6) - .1, fz - 6, 6, 5, 3.2, '#f2ece0', .2, { piatto: true, fascia: '#e8e0d0', persiane: '#2f5a7a', porta: 0 });
  const sent = K.spline([[pz0.x + 1, pz0.z + 5.5], [0, 26], [3, 32], [fx - 1, fz - 2.5]], .4); K.ribbon(sent, 1.3, .06, '#d8c8a4', 0, (x, z) => K.H(x, z));
  // il capo: fichi d'india, agavi in fiore, cuscini di lentisco, la roccia sul mare
  for (let k = 0; k < 70; k++) { const x = -40 + R() * 80, z = -6 + R() * 50, sd = K.sdist(riva, x, z), n = K.near(strada, x, z); if (sd < 3 || n.d < SW / 2 + 2 || Math.hypot((x - pz0.x) / 10, (z - pz0.z) / 7) < 1 || Math.hypot(x - fx, z - fz) < 4 || K.near(sent, x, z).d < 1.5) continue;
    const h = K.H(x, z), q = R(); q < .3 ? K.ficodindia(x, h, z, 1.4 + R() * .6) : q < .5 ? K.agave(x, h, z, 1.3 + R() * .5, R() < .3) : K.cespuglio(x, h, z, .7 + R() * .6, R() < .5 ? '#5a7a40' : '#6f8a4a'); }
  for (let k = 0; k < 90; k++) { const p = K.at(riva, R() * riva.L), d = R() * 4.5, x = p.x - p.tz * (1.5 - d), z = p.z + p.tx * (1.5 - d); K.roccia(x, K.H(x, z) + .1, z, .5 + R() * 1.3, R() < .5 ? '#aaa08e' : '#9a9080'); }
  for (let k = 0; k < 24; k++) { const x = -100 + R() * 200, z = -22 - R() * 50; const h = K.H(x, z); if (K.near(strada, x, z).d < 6) continue; R() < .4 ? K.pino(x, h, z, 8 + R() * 3) : K.cespuglio(x, h, z, 1.2 + R(), '#5a7a40'); }
  K.barca(-30, -.45, 34, .9, 5, '#f2ead8', '#2b5a8a'); [[-14, 6], [18, 14], [-22, 12]].forEach(([x, z]) => K.pino(x, K.H(x, z), z, 8 + R() * 2));
  K.finisci(-2, 18, 215, { az: 2.75, el: .3, ly: 4 });
})();
