// Scorcio 2: la Villa Comunale a mare di Ponente: la fontana a secco coi ragazzi dello skate, la cassa armonica, il monumento ai caduti,
// la vecchia altalena, l'edicola dei giornali, le palme e i pini, il belvedere sulla scogliera bassa
(function () {
  const R = K.rnd, T = THREE;
  const riva = K.spline([[-100, 22], [-60, 18], [-36, 21], [-16, 16], [0, 19], [16, 15], [36, 18], [60, 12], [100, 14]], .5);
  const bordo = K.spline([[-100, 12], [-60, 10], [-36, 12], [-16, 9], [0, 11.5], [16, 8.5], [36, 10], [60, 6], [100, 8]], .4);
  const PH = 2.2;
  const hf = (x, z) => { const sd = K.sdist(riva, x, z), db = K.sdist(bordo, x, z);
    if (sd < 0) return -.45 - Math.min(5, -sd * .3) + (K.fbm(x * .3, z * .3) - .5) * .6;
    if (db < .5) return Math.min(PH - .6, .3 + sd * .45) + (K.fbm(x * .6, z * .6) - .5) * 1.2;   // gli scogli sotto il parapetto
    return PH; };
  const ring = (x, z) => Math.hypot(x / 15, (z + 6) / 9.5);
  const cf = (x, z, h) => { const sd = K.sdist(riva, x, z), db = K.sdist(bordo, x, z);
    if (sd < 0) return '#8a8072'; if (db < .5) return K.noise(x * .7, z * .7) > .5 ? '#aca292' : '#9c9282'; if (db < 4) return '#d8ccb4';
    if (z < -27) return z < -29 ? '#56585e' : '#c8c0b0'; const r = ring(x, z); if (Math.abs(r - 1) < .1 || r < .42) return '#c4b494';
    if (Math.abs(x - z * .9 - 5) < 1.4 && z > -26 && r > 1) return '#c4b494'; if (Math.abs(x + z * 1.1 + 6) < 1.4 && z > -26 && r > 1) return '#c4b494';
    return K.noise(x * .3, z * .3) > .55 ? '#7a8650' : '#8a9058'; };
  K.terrain(-110, 110, -60, 60, .5, hf, cf); K.sea(-110, 110, 0, 60, (x, z) => -.45 - hf(x, z));
  K.wall(bordo, .2, .5, -.2, PH + .03, '#c4b494'); K.balaustra(bordo, -.3, PH, 2, 92); K.balaustra(bordo, -.3, PH, 108, bordo.L - 2);
  // il belvedere: una lunetta che sporge sugli scogli
  { const c = K.at(bordo, 100); K.cyl(5.2, 5.6, PH + .6, '#c4b494', c.x, -.6, c.z + 1, 24); K.cyl(5.1, 5.1, .04, '#e4d8c2', c.x, PH, c.z + 1, 24); const L = K.spline(Array.from({ length: 15 }, (_, i) => { const a = Math.PI * .08 + i / 14 * Math.PI * .84; return [c.x + Math.cos(a) * 5, c.z + 1 + Math.sin(a) * 5]; }), .3); K.balaustra(L, 0, PH, 0, L.L); K.lampione2(c.x, PH, c.z + 1, 0); K.panchina(c.x - 2.5, PH, c.z + 3, Math.PI * .85); K.panchina(c.x + 2.5, PH, c.z + 3, Math.PI * 1.15); }
  // la fontana del Ventennio a secco: la vasca vuota con le foglie, il fusto con la tazza; i ragazzi dello skate ci girano dentro
  { K.cyl(4.6, 4.6, .55, '#c8bca6', 0, PH, -6, 32); K.cyl(4.2, 4.2, .05, '#8a8270', 0, PH + .12, -6, 32); K.cyl(.5, .7, 1.8, '#c8bca6', 0, PH, -6, 12); K.cyl(1.6, .9, .4, '#c8bca6', 0, PH + 1.8, -6, 16); K.sph(.5, '#a8a090', 0, PH + 2.6, -6, 1, 1.4, 1);
    for (let k = 0; k < 40; k++) { const a = R() * 6.28, r = 1 + R() * 3; K.sph(.12, R() < .5 ? '#8a6a3a' : '#a07a40', Math.cos(a) * r, PH + .2, -6 + Math.sin(a) * r, 1, .2, 1, 0); }
    for (let k = 0; k < 3; k++) { const a = k * 2.1; K.skater(Math.cos(a) * 2.8, PH + .1, -6 + Math.sin(a) * 2.8, a); } K.scritta('DISGELO', 2.4, .6, '#ff4fa0', null, 0, PH + .3, -1.36, 0); }
  // la cassa armonica: il palco tondo con la balaustra di ghisa e il tetto a cupola, dove la banda suonava le feste del Garante
  { const bx = -30, bz = -8; K.cyl(4.2, 4.4, 1.3, '#d0c4ac', bx, PH, bz, 12); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; K.cyl(.1, .1, 3.2, '#3a4a48', bx + Math.cos(a) * 3.8, PH + 1.3, bz + Math.sin(a) * 3.8, 6); } K.add(new T.ConeGeometry(4.8, 1.8, 8), '#5a6a68', bx, PH + 5.4, bz); K.sph(.3, '#3a4a48', bx, PH + 6.4, bz);
    const bl = K.spline(Array.from({ length: 17 }, (_, i) => { const a = i / 16 * 6.28 + .3; return [bx + Math.cos(a) * 3.9, bz + Math.sin(a) * 3.9]; }), .3); K.balaustra(bl, 0, PH + 1.3, 0, bl.L - 2.5, '#3a4a48'); }
  // il monumento ai caduti della Battuta, i lumini; la vecchia altalena con una sola seduta
  { K.box(2.4, 1, 2.4, '#b8b0a0', 30, PH, -10); K.box(1.2, 4.2, 1.2, '#c8c0b0', 30, PH + 1, -10); K.box(.9, .2, .9, '#a8a090', 30, PH + 5.2, -10); for (let k = 0; k < 6; k++) K.cyl(.06, .06, .12, '#c83a2a', 29 + k * .4, PH + 1, -8.7, 6); K.scritta('1950', 1, .4, '#4a4a48', null, 30, PH + 3, -9.38, 0); }
  { const ax = 32, az = 4; for (const sx of [-1.6, 1.6]) { const m = K.add(new T.CylinderGeometry(.06, .06, 3), '#6a4a3a', ax + sx, PH + 1.4, az); } K.box(3.4, .12, .12, '#6a4a3a', ax, PH + 2.8, az); K.box(.03, 2, .03, '#777', ax - .25, PH + .8, az); K.box(.03, 2, .03, '#777', ax + .25, PH + .8, az); K.box(.6, .06, .3, '#7a5a3a', ax, PH + .75, az); }
  // le aiuole a bosso, i lampioni sull'anello (qualcuno senza il globo), le panchine, le palme e i pini
  for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28 + .39; const x = Math.cos(a) * 9.4, z = -6 + Math.sin(a) * 5.9; K.aiuola(x, PH, z, 2.4, 1.2, 0); }
  for (let k = 0; k < 10; k++) { const a = k / 10 * 6.28; K.lampione(Math.cos(a) * 16.2, PH, -6 + Math.sin(a) * 10.4); }
  for (let k = 0; k < 12; k++) { const a = k / 12 * 6.28 + .26; const x = Math.cos(a) * 13.6, z = -6 + Math.sin(a) * 8.6; K.panchina(x, PH, z, -a - Math.PI / 2); if (R() < .4) K.persona(x, PH + .05, z, K.cappotto(), 1.7, true); }
  for (let k = 0; k < 14; k++) { const a = k / 14 * 6.28 + .2; if (k % 3 === 0) K.pino(Math.cos(a) * 19, PH, -6 + Math.sin(a) * 12.5, 10 + R() * 3); else K.palma(Math.cos(a) * 18.5, PH, -6 + Math.sin(a) * 12, 7 + R() * 3, .9); }
  // il chiosco delle bibite all'ingresso, le siepi, i pini alle due teste, la strada e le case dietro
  { const cx = 12, cz = -22; K.cyl(1.5, 1.5, 2.4, '#c8c0aa', cx, PH, cz, 8); K.add(new T.ConeGeometry(2.4, 1, 8), '#4a6a5a', cx, PH + 2.9, cz); K.scritta('GIORNALI', 1.8, .45, '#eee', '#4a6a5a', cx, PH + 2.05, cz + 1.45, 0); K.persona(cx + 1, PH, cz + 2.2); }
  K.cartellone('LA VILLA COMUNALE\nDONO DEL GARANTE', -12, PH, -27.2, 0, 6, 2.2, '#7a2a26', '#efe4cc');
  for (const [x0, x1] of [[-48, -20], [20, 50]]) for (let x = x0; x < x1; x += 1.2) K.box(1.25, .9, 1, '#4a6e38', x, PH, -25.5);
  [[-50, -14], [-46, 0], [-54, -4], [46, -10], [52, -2], [44, 4], [-60, 4], [60, -14]].forEach(([x, z]) => K.pino(x, PH, z, 10 + R() * 3));
  const pal = ['#c8a070', '#b87a60', '#d4c4a0', '#8aa0a0', '#c09080', '#d8ccb0', '#a8aa80'];
  for (let x = -90, k = 0; x < 90; k++) { const w = 7 + R() * 4, pi = 2 + (R() < .5 ? 1 : 0); K.casa(x + w / 2, PH, -38, w - .4, 10, pi * 3.1, pal[k % pal.length], 0, { piani: pi, fascia: '#f6efe2', piatto: R() < .5, persiane: R() < .5 ? '#3f6e4a' : '#2f5a7a', cornici: '#f6efe2', porta: 0, alto: 1.3 }); x += w; }
  K.auto(-12, PH, -30.5, Math.PI / 2, '#d8402e'); K.auto(30, PH, -30.2, -Math.PI / 2, '#f2e8c8');
  for (let k = 0; k < 10; k++) { const a = R() * 6.28, r = .95 + R() * .1, x = Math.cos(a) * 15 * r, z = -6 + Math.sin(a) * 9.5 * r; K.persona(x, PH, z); }
  for (let k = 0; k < 8; k++) { const p = K.at(bordo, 30 + R() * 140); K.persona(p.x - p.tz * -1.5, PH, p.z + p.tx * -1.5, K.cappotto(), R() < .3 ? 1.6 : 1.7, R() < .3); }
  for (const dx of [0, .8]) { K.persona(-6 + dx, PH, -18, '#2e3a4a', 1.8); K.sph(.17, '#1e2a3a', -6 + dx, PH + 1.68, -18, 1.2, .45, 1.2); }   // la pattuglia della Tutela
  K.barca(-20, -.45, 32, .8, 5, '#f2ead8', '#2b5a8a'); K.barca(26, -.45, 36, 2.4, 4.5, '#d8e4ea', '#c8402e');
  K.finisci(0, -4, 215, { az: 2.75, el: .3 });
})();
