// Scorcio 3: la Costiera di Mezzogiorno sulla scogliera bassa: la curva col guardrail sul mare, la casa cantoniera ANAS
// in rosso pompeiano nella sua piazzola, il cippo, i fichi d'india e le agavi sul ciglio, la caletta sotto
(function () {
  const R = K.rnd, T = THREE;
  const riva = K.spline([[-90, 6], [-60, 10], [-42, 4], [-30, 13], [-14, 18], [0, 14], [10, 6], [18, 3], [28, 9], [44, 15], [62, 12], [90, 18]], .5);
  const strada = K.spline([[-95, -4], [-60, -2], [-35, -3], [-12, 2], [6, 0], [24, -4], [45, -1], [70, 2], [95, 4]], .4);
  const HS = s => 4.6 + Math.sin(s / 40) * .6;   // la quota della strada
  const SW = 7;
  const cal = (x, z) => Math.max(0, 1 - Math.hypot((x - 16) / 9, (z - 6) / 6));   // la caletta di sabbia
  const hf = (x, z) => { const sd = K.sdist(riva, x, z), n = K.near(strada, x, z), hr = HS(n.s);
    if (sd < 0) return -.45 - Math.min(6, -sd * .35) + (K.fbm(x * .4, z * .4) - .5) * .8;
    let h = Math.min(hr - .3, .4 + sd * .75) + (K.fbm(x * .35, z * .35) - .5) * 2.2 * Math.min(1, sd / 3);   // il ciglio di roccia
    if (sd > 7) h = hr - .3 + (sd - 7) * .02 + (K.fbm(x * .1, z * .1) - .5) * 1.4;
    const c = cal(x, z); if (c > 0) h = h * (1 - c) + (sd * .12) * c;
    if (n.d < SW / 2 + 2.5) { const k = Math.min(1, Math.max(0, (n.d - SW / 2 - .3) / 2.2)); h = hr * (1 - k) + h * k; }
    if (z < -12) h += (-12 - z) * .25 * (K.fbm(x * .05, z * .05) + .3);   // la collina dietro
    return h; };
  const cf = (x, z, h) => { const sd = K.sdist(riva, x, z), n = K.near(strada, x, z);
    if (cal(x, z) > .25 && h < 2) return '#e6d2a4'; if (sd < 0) return '#8f8676'; if (n.d < SW / 2 + .6) return '#8c8678';
    if (sd < 6 || h < 5.5) return K.noise(x * .6, z * .6) > .55 ? '#b4aa98' : '#a39a88';
    const q = K.fbm(x * .15, z * .15); return q > .55 ? '#7a8f4a' : q > .42 ? '#9aa05a' : '#b8ac74'; };
  K.terrain(-100, 100, -75, 50, .5, hf, cf); K.sea(-100, 100, -20, 50, (x, z) => -.45 - hf(x, z));
  K.strada(strada, SW, HS);
  // il guardrail sul lato del mare dove il ciglio è vicino; il muretto a secco altrove
  const lato = s => { const p = K.at(strada, s), x = p.x - p.tz * (SW / 2 + 1.2), z = p.z + p.tx * (SW / 2 + 1.2); return K.sdist(riva, x, z); };
  let s0 = null; for (let s = 0; s <= strada.L; s += 1) { const vicino = lato(s) < 9; if (vicino && s0 === null) s0 = s; if ((!vicino || s >= strada.L - 1) && s0 !== null) { if (s - s0 > 6) K.guardrail(strada, SW / 2 + .5, s0, s, (x, z) => HS(K.near(strada, x, z).s)); s0 = null; } }
  K.muretto(strada, -(SW / 2 + .9), 2, 70, .8, '#b4a68e');
  K.muretto(strada, -(SW / 2 + .9), 112, strada.L - 2, .8, '#b4a68e');
  // la casa cantoniera: nella sua piazzola sul lato monte, in rosso pompeiano con la scritta, il pergolato e l'orto
  const pc = K.at(strada, 92), cx = pc.x - pc.tz * -11, cz = pc.z + pc.tx * -11 - 1, ry = -Math.atan2(pc.tz, pc.tx);
  const hc = HS(92);
  K.ribbon(K.spline([[cx - 12, cz + 6], [cx + 12, cz + 6.5]], .5), 6, hc + .04, '#b8ae9c', 0);
  K.cantoniera(cx, hc, cz, ry, 'S.S. 125   km 44,2');
  K.box(5, .08, 3.2, '#7a5a3a', cx + 7.6, hc + 2.6, cz + 2); for (const [a, b] of [[5.2, .6], [10, .6], [5.2, 3.4], [10, 3.4]]) K.box(.12, 2.6, .12, '#6a4a30', cx + a, hc, cz + b);
  for (let k = 0; k < 14; k++) K.sph(.5, k % 2 ? '#5f8a3a' : '#6f9a44', cx + 5.4 + R() * 4.6, hc + 2.75, cz + .6 + R() * 2.8, 1, .4, 1);
  for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) K.sph(.28, '#5a8a3c', cx - 9 + k * 1.1, hc + .2, cz - 3 + r * 1.2, 1, .7, 1, 0);
  K.pino(cx - 9, hc, cz + 3, 11, 1.8); K.pino(cx + 12, hc, cz - 4, 9.5, 1.2); K.cespuglio(cx + 6, hc, cz - 6, 1.5, '#4f7a3e');
  K.auto(cx + 7.5, hc + .05, cz + 7.5, ry + Math.PI / 2, '#8a8070'); K.persona(cx + 2, hc, cz + 5, '#3e4a5a', 1.75);
  K.cippo(pc.x - pc.tz * (-SW / 2 - .5), hc, pc.z + pc.tx * (-SW / 2 - .5), ry, '44');
  { const p = K.at(strada, 60); K.cartello('PORTO VECCHIO  6', p.x - p.tz * -(SW / 2 + .6), HS(60), p.z + p.tx * -(SW / 2 + .6), ry, 2.2, .55, '#fff', '#2a5a9a'); }
  // il ciglio: fichi d'india, agavi (una in fiore), lentisco; la caletta con la barca tirata su
  for (let k = 0; k < 26; k++) { const s = R() * strada.L, p = K.at(strada, s), o = SW / 2 + 2 + R() * 4, x = p.x - p.tz * o, z = p.z + p.tx * o; if (K.sdist(riva, x, z) < 2.5 || cal(x, z) > 0) continue; const h = K.H(x, z); R() < .45 ? K.ficodindia(x, h, z, .9 + R() * .5) : R() < .6 ? K.agave(x, h, z, .9 + R() * .4, R() < .2) : K.cespuglio(x, h, z, .7 + R() * .5, '#5f7f44'); }
  for (let k = 0; k < 30; k++) { const s = R() * strada.L, p = K.at(strada, s), o = -(SW / 2 + 2.5 + R() * 14), x = p.x - p.tz * o, z = p.z + p.tx * o; if (Math.hypot(x - cx, z - cz) < 13) continue; const h = K.H(x, z); R() < .3 ? K.ficodindia(x, h, z, 1 + R() * .4) : K.cespuglio(x, h, z, .9 + R() * .8, R() < .5 ? '#5a7a40' : '#6a8a48'); }
  for (let k = 0; k < 60; k++) { const a = R() * 6.28, d = R(); const p = K.at(riva, R() * riva.L), x = p.x - p.tz * (1 - d * 4), z = p.z + p.tx * (1 - d * 4); if (cal(x, z) > 0) continue; K.roccia(x, K.H(x, z) + .1, z, .5 + R() * 1.2, R() < .5 ? '#a89e8e' : '#9a9080'); }
  K.barca(15, K.H(15, 8.5) + .05, 8.5, 1.3, 4.6, '#f2ead8', '#c8402e', .1); K.rete(18, K.H(18, 6.5), 6.5, 1.1, '#5a6a5a'); K.persona(18.5, K.H(18, 7.5), 7.5, '#4a5040', 1.6, true);
  { const p = K.at(strada, 40), x = p.x, z = p.z - 1.6, h = HS(40); K.box(2.4, 1.2, 6.5, '#5a5a50', x, h + .5, z, Math.PI / 2 - .1); K.box(2.4, 1.8, 2, '#c8a030', x + 3.8, h + .5, z, Math.PI / 2 - .1); K.box(2.2, .6, 6, '#2a2826', x, h + 1.7, z, Math.PI / 2 - .1); }   // il camion del carbone della miniera
  { const p = K.at(strada, 128); K.cartellone('LA STRADA È UN DONO\nGUIDA CON RISPETTO', p.x - p.tz * -(SW / 2 + 3.5), HS(128), p.z + p.tx * -(SW / 2 + 3.5), -Math.atan2(p.tz, p.tx), 6, 2.2, '#7a2a26', '#efe4cc'); }
  for (let k = 0; k < 40; k++) { const x = -90 + R() * 180, z = -20 - R() * 50; if (Math.hypot(x - cx, z - cz) < 14) continue; const h = K.H(x, z); R() < .35 ? (K.cyl(.15, .2, 1.6, '#6a5a48', x, h, z, 5), K.sph(1.4, '#7f9a6a', x, h + 2.2, z, 1.2, .8, 1.2)) : K.cespuglio(x, h, z, 1 + R(), R() < .5 ? '#5a7a40' : '#6f8a4a'); }
  K.finisci(cx - 8, cz + 16, 185, { az: 2.75, el: .3, ly: 3 });
})();
