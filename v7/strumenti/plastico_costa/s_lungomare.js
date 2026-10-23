// Scorcio 1: la Passeggiata a mare di Levante (fra il Molo di Levante e la Rocca): la baia a mezzaluna, la passeggiata curva
// con la balaustra, la rotonda sul mare, il chiosco delle granite, le cabine, i pedalò, le barche in secco, il pontile del Lido
(function () {
  const R = K.rnd, T = THREE;
  const riva = K.spline([[-80, 24], [-55, 17], [-32, 11.5], [-10, 9], [10, 9.5], [27, 12.5], [38, 17], [44, 24], [50, 31], [58, 31], [68, 26], [85, 22]], .5);
  const pass = K.spline([[-80, 7], [-50, 2.5], [-25, -.8], [0, -2], [22, -.8], [34, 2.5], [41, 8]], .4);
  const PH = 1.7;   // la quota della passeggiata
  const punta = (x, z) => Math.max(0, 1 - Math.hypot((x - 50) / 13, (z - 20) / 15));
  const hf = (x, z) => { const s = K.sdist(riva, x, z), dp = K.sdist(pass, x, z); const pk = punta(x, z);
    if (s < 0) return -.45 - Math.min(5.5, -s * .16) + pk * 1.2 * Math.max(0, 1 + s / 4);
    if (pk > .05) return Math.max(-.2, s * .09) + pk * pk * 6 + (K.fbm(x * .5, z * .5) - .5) * 1.4 * pk;
    if (dp < .6) return Math.min(PH - .7, s * .085) + (K.fbm(x * .3, z * .3) - .5) * .12;   // la spiaggia
    return PH; };
  const cf = (x, z, h) => { const s = K.sdist(riva, x, z), dp = K.sdist(pass, x, z), pk = punta(x, z);
    if (pk > .12 && h > .2) return h > 3 && K.noise(x * .7, z * .7) > .45 ? '#6b8a48' : '#a89c88';
    if (s < .6) return '#a89878'; if (dp < .6) return s < 2.2 ? '#b8a882' : (K.noise(x * .4, z * .4) > .6 ? '#c4b48e' : '#d2c4a0');
    if (dp < 6.8) return K.noise(x * .5, z * .5) > .7 ? '#b8b0a0' : '#c8bfae'; if (dp < 9.6) return K.noise(x * .6, z * .6) > .5 ? '#8a8a58' : '#6f7f48'; if (dp < 16) return '#5a5c60'; if (dp < 17.6) return '#c8c0b0'; return '#d6ccb8'; };
  K.terrain(-110, 100, -70, 60, .5, hf, cf); K.sea(-90, 90, -10, 60, (x, z) => -.45 - hf(x, z));
  // la passeggiata: il lastricato a correre (fasce), il muro sulla spiaggia, la balaustra
  K.ribbon(pass, 6.6, PH + .02, '#cdc3b0', -3.3);
  { const B = []; for (let t = 0; t < riva.L; t += .45) { const p = K.at(riva, t); for (const o of [-2.4, -4.2]) { if (K.noise(t * .09, o) < .48) continue; const x = p.x - p.tz * (o + (R() - .5) * .8), z = p.z + p.tx * (o + (R() - .5) * .8); B.push([x, K.H(x, z) + .01, z, R() * 6, 0, 0, .25 + R() * .3, 1.6, .06, .7]); } } K.inst(new THREE.DodecahedronGeometry(1, 0), '#6a5a42', B); }   // la posidonia spiaggiata a mucchi   // la posidonia spiaggiata, le strisce scure dell'inverno
  for (let k = 0; k < 9; k++) K.ribbon(pass.filter(p => p.s % 1.6 < 0.8), .08, PH + .03, '#c8bca6', -(.6 + k * .7));
  K.wall(pass, .1, .8, -.3, PH + .05, '#c9b998');
  K.balaustra(pass, -.25, PH, 2, 74.5); K.balaustra(pass, -.25, PH, 85.5, pass.L - 4);
  // la rotonda sul mare: una mezzaluna che sporge sulla spiaggia, con la balaustra in tondo e i lampioni a pastorale
  const rc = K.at(pass, 80), rx = rc.x, rz = rc.z;
  K.cyl(5.6, 5.6, PH + .5, '#c9b998', rx, -.5, rz, 28); K.cyl(5.4, 5.4, .05, '#e4dac8', rx, PH + .0, rz, 28);
  const rond = K.spline(Array.from({ length: 17 }, (_, i) => { const a = Math.PI * .08 + i / 16 * Math.PI * .84; return [rx + Math.cos(a) * 5.3, rz + Math.sin(a) * 5.3]; }), .3);
  K.balaustra(rond, 0, PH, 0, rond.L);
  for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; K.box(.5, .02, .25, '#c8a870', rx + Math.cos(a) * 3.2, PH + .06, rz + Math.sin(a) * 3.2, a); }
  K.lampione2(rx, PH, rz, .2);
  // il chiosco delle granite fuori stagione: la serranda giù a metà con la tag, il tendone sbiadito arrotolato, le sedie impilate
  { const cx = rx + 9, cz = rz - 4.6; K.cyl(1.7, 1.7, 2.6, '#d8cfbc', cx, PH, cz, 6); K.cyl(1.75, 1.75, .9, '#4f6f80', cx, PH, cz, 6); K.add(new T.ConeGeometry(2.2, .8, 6), '#8a5a48', cx, PH + 2.95, cz);
    K.scritta('GRANITE', 2.2, .45, '#8a3a2a', '#e8dcc4', cx + 1.2, PH + 2.3, cz + 1.75, .5); K.scritta('ATOMO', 1.2, .5, K.fluo(), null, cx + 1.25, PH + 1.1, cz + 1.78, .5);
    for (let k = 0; k < 5; k++) K.box(.45, .08, .45, '#6a6a68', cx - 2.4, PH + .45 + k * .09, cz + .5); K.cassette(cx - 2.2, PH, cz - 1.6, 3); }
  // il cartellone del Garante sul lato della strada, il busto del podestà sulla rotonda
  K.cartellone('LAVORA · CONSUMA · PAGA LA RATA\nIL GARANTE VEGLIA', -8, PH, -15.5, 0, 7, 2.6, '#7a2a26', '#efe4cc');
  K.cyl(.45, .55, 1.4, '#a8a090', rx - 2.6, PH, rz - 2.2, 8); K.sph(.4, '#8a8478', rx - 2.6, PH + 1.75, rz - 2.2, 1, 1.2, 1);
  // panchine verso il mare (qualcuna senza una doga), lampioni d'epoca (uno storto e spento), palme sfrangiate dal vento, aiuole incolte
  for (let s = 8; s < pass.L - 6; s += 9) { const p = K.at(pass, s); if (Math.abs(s - 80) < 9) continue; K.panchina(p.x - p.tz * -1.6, PH, p.z + p.tx * -1.6, Math.atan2(p.tz, -p.tx)); }
  for (let s = 4; s < pass.L - 4; s += 13.5) { const p = K.at(pass, s); K.lampione(p.x - p.tz * -.9, PH, p.z + p.tx * -.9); }
  for (let s = 6; s < pass.L - 4; s += 13.5) { const p = K.at(pass, s), x = p.x - p.tz * -8.2, z = p.z + p.tx * -8.2; if (R() < .25) { K.cyl(.22, .26, 5, '#7a6a54', x, PH, z, 7); continue; } K.palma(x, PH, z, 7.5 + R() * 2.5, .9); }
  for (let s = 12.7; s < pass.L - 4; s += 13.5) { const p = K.at(pass, s), x = p.x - p.tz * -8.2, z = p.z + p.tx * -8.2; K.aiuola(x, PH, z, 3.2, 1.1, 0); }
  [[-76, 1], [-70, -3], [-64, 2], [44, 14], [52, 19], [47, 24]].forEach(([x, z], i) => K.pino(x, K.H(x, z), z, 9 + R() * 3, 2));
  // le case della passeggiata: intonaci di Procida stinti dal salmastro, persiane chiuse, i tetti piani coi bidoni dell'acqua
  const pal = ['#c8a070', '#b87a60', '#d4c4a0', '#8aa0a0', '#c09080', '#d8ccb0', '#a8aa80', '#b88a60'];
  for (let x = -78, k = 0; x < 38; k++) { const w = 6 + R() * 3, z0 = -22 - (x > 20 ? (x - 20) * .3 : 0) + (x < -40 ? (-40 - x) * .2 : 0); const pi = 2 + (R() < .4 ? 1 : 0); const pia = R() < .55;
    K.casa(x + w / 2, PH, z0, w - .3, 10, pi * 3.1, pal[k % pal.length], 0, { piani: pi, fascia: '#d8d0c0', piatto: pia, persiane: R() < .5 ? '#4a5e48' : '#3e5466', cornici: '#d8d0c0', porta: 0, tetto: '#9a5a40', alto: 1.3 });
    if (pia) K.cyl(.5, .5, 1, '#6a6a6a', x + w / 2 + 1.5, PH + pi * 3.1 + .35, z0 - 2, 8); x += w; }
  // la spiaggia d'inverno: le cabine scrostate chiuse, i pedalò capovolti e incatenati, le barche dei pescatori tirate in secco
  // con le reti stese e le cassette, il capanno di tavole, la casamatta della guerra mezza sepolta nella sabbia, il pontile
  const cc = ['#6a8a9a', '#a86a5a', '#b8a060', '#6a8a70', '#8a7a9a'];
  for (let k = 0; k < 5; k++) { const s = 112 + k * 2.4, p = K.at(pass, s), x = p.x - p.tz * 2.4, z = p.z + p.tx * 2.4; K.cabina(x, K.H(x, z), z, -Math.atan2(p.tz, p.tx), cc[k]); }
  [[-6, 9.6, .25, '#9a8a60'], [-6.2, 9.7, .25, '#8a5a4a']].forEach(([x, z, r, c], i) => { const g = K.pedalo(x, K.H(x, z) + .1 + i * .7, z, r, c); });
  [[-58, 16, .45, '#e2dccc', '#3a5a7a', .12], [-53, 14.5, .3, '#c8d0d0', '#8a3a2a', -.1], [-47, 13, .2, '#e2dccc', '#3f6a50', .08], [-40, 11.4, .1, '#b8a888', '#2a4a5a', .14]].forEach(([x, z, r, c, f, t]) => K.barca(x, K.H(x, z) - .05, z - 1.5, r, 5.2, c, f, t));
  [[-55, 8.5, 1.6, '#5a6a5a'], [-48, 7.5, 1.3, '#7a5a3a'], [-44, 8.8, 1, '#4a5a6a']].forEach(([x, z, r, c]) => K.rete(x, K.H(x, z), z, r, c)); K.cassette(-51, K.H(-51, 10), 10, 6, .3); K.cassette(-43, K.H(-43, 12), 12, 4, -.2);
  { const x = -64, z = 6.5, h = K.H(x, z); K.box(4, 2.4, 3, '#7a6a54', x, h, z, .3); K.add(new T.BoxGeometry(4.6, .12, 3.6), '#5a5a5a', x, h + 2.6, z, .3).rotation.z = .12; K.scritta('VIETATO', 1, .35, '#eee', '#7a2a26', x + .55, h + 1.6, z + 1.52, .3); }
  K.bunker(-22, K.H(-22, 8) - .9, 8, .4);
  K.pontile(16, 7.5, Math.PI, 26, 2.2);
  // le scalette dal muro alla spiaggia
  [30, 140].forEach(s => { const p = K.at(pass, s); for (let k = 0; k < 6; k++) { const o = .3 + k * .38; K.box(1.6, PH - k * .3, .4, '#c8bca6', p.x - p.tz * o, -.3, p.z + p.tx * o, -Math.atan2(p.tz, p.tx)); } });
  // la Rocca in fondo: lo scoglio col faro
  K.cyl(1.3, 1.6, 9, '#d8d0c0', 56, 6, 22, 12); K.cyl(1.0, 1.0, 1.4, '#8a3a32', 56, 15, 22, 12); K.cyl(.9, .9, .9, '#c8d8d8', 56, 16.4, 22, 10); K.add(new T.ConeGeometry(1.1, .9, 12), '#8a3a32', 56, 17.7, 22);
  for (let k = 0; k < 40; k++) { const a = R() * 6.28, r = 9 + R() * 9; K.roccia(50 + Math.cos(a) * r, -.2, 22 + Math.sin(a) * r * 1.1, .6 + R() * 1.1); }
  // la gente: i vecchi sulle panchine coi cappotti, chi porta a spasso il cane, i ragazzi del Disgelo con gli skate sulla balaustra,
  // i pescatori che rammendano le reti, la pattuglia della Tutela in due, un pescatore con la canna in fondo al pontile
  for (let s = 12; s < pass.L - 6; s += 18) { const p = K.at(pass, s); if (R() < .5) K.persona(p.x - p.tz * -1.6, PH + .05, p.z + p.tx * -1.6, K.cappotto(), 1.7, true); }
  for (let k = 0; k < 9; k++) { const s = 6 + R() * (pass.L - 12), p = K.at(pass, s), o = -(2 + R() * 4); K.persona(p.x - p.tz * o, PH, p.z + p.tx * o); }
  for (let k = 0; k < 5; k++) { const s = 36 + k * 3.2, p = K.at(pass, s), o = -(1 + (k % 2) * 1.8); K.skater(p.x - p.tz * o, PH, p.z + p.tx * o, Math.atan2(p.tx, p.tz) + (R() - .5)); }
  [[-53, 9], [-50, 8.2], [-46, 9.6]].forEach(([x, z]) => K.persona(x, K.H(x, z), z, K.cappotto(), 1.6, true));
  for (const o of [-3.2, -4]) { const p = K.at(pass, 150); K.persona(p.x - p.tz * o, PH, p.z + p.tx * o, '#2e3a4a', 1.8); K.sph(.17, '#1e2a3a', p.x - p.tz * o, PH + 1.68, p.z + p.tx * o, 1.2, .45, 1.2); }
  K.persona(16, .1, 33, '#5a4a3a', 1.6, true); K.cyl(.015, .02, 4, '#333', 16.6, 1, 34.5, 4);
  K.finisci(-4, 0, 205, { az: 2.75, el: .3 });
})();
