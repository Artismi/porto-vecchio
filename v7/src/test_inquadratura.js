// [inquadratura] prova dell'inquadratura in strada (src/inquadratura.js) sulla città nuova:
//   1. la rete: in un vicolo l'asse è quello del vicolo (in un incrocio vince la via più stretta), fuori dalle vie niente;
//   2. l'asse: camminando lungo un vicolo la visuale si gira sull'asse nel verso più vicino a dietro il personaggio, mai oltre 100°, e lo
//      sbocco di un vicolo di lato non la fa girare; nelle piazze resta dov'è; mentre il giocatore tiene la camera spostata non si muove;
//   3. il ricentro sul computer va dietro al personaggio (non all'orientamento dell'isola), col τ di Visuale.MANO (0,22 s);
//   4. sul tetto (ok = false) la pendenza torna quella di sempre e non si taglia niente;
//   5. il taglio mirato: solo case sul lato camera che coprono la via, a una linea di solaio (muretto, 3,4 m, poi ogni piano, o la gronda);
//   6. la misura (strumenti/inquadratura.js) lungo i percorsi, la variante del gioco contro la camera di [visuale5]: nei vicoli la via attorno
//      al personaggio e il corpo si vedono molto di più; il costo del taglio per fotogramma resta piccolo.
// cd v7/src && node test_inquadratura.js
const path = require('path');
const log = console.log; console.log = () => {};
const IM = require(path.join(__dirname, '..', 'strumenti', 'inquadratura.js'));
console.log = log;
const IQ = require('./inquadratura.js'), V = require('./visuale.js'), W = World, K = IQ.K;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const ang = a => Math.atan2(Math.sin(a), Math.cos(a)), deg = a => Math.round(a * 180 / Math.PI), YAW = Math.PI / 4;
const R = IQ.rete(W), M = V.mappa(W);

// ---------------- 1. la rete ----------------
const vic = W.roads.find(r => r.id === 'vic_monache'), [a0, a1] = [vic.pts[0], vic.pts[1]], mx = (a0[0] + a1[0]) / 2, mz = (a0[1] + a1[1]) / 2;
const A = R.asse(mx, mz), ax = Math.atan2(a1[1] - a0[1], a1[0] - a0[0]);
ok(A && A.id === 'vic_monache' && Math.abs(Math.sin(A.a - ax)) < .02, `nel Vico delle Monache l'asse è quello del vicolo (${A && A.id}, ${A && deg(A.a)}°)`);
const rua = W.roads.find(r => r.id === 'rua'), ru = R.asse(rua.pts[3][0], rua.pts[3][1]);
ok(ru && ru.w <= 5, `sulla Rua la via è larga ${ru && ru.w} m`);
ok(R.asse(1272, 343) === null || R.asse(1272, 343).w > 3, 'sotto la tettoia del mercato nessun vicolo');

// ---------------- 2. l'asse ----------------
const passi = (S, pts, v, extra) => { const out = []; for (let k = 1; k < pts.length; k++) { const [px, pz] = pts[k - 1], [qx, qz] = pts[k], L = Math.hypot(qx - px, qz - pz), dir = Math.atan2(qz - pz, qx - px);
  for (let s = 0; s < L; s += .1) { const x = px + (qx - px) * s / L, z = pz + (qz - pz) * s / L, fy = IM.pieno(x, z).h;
    out.push(Object.assign(IQ.camera(S, Object.assign({ x, z, fy, dir, vel: 1.4, yaw0: YAW, base: .78, rete: R, mappa: M, V, v, ok: true }, extra || {}), .1 / 1.4), { x, z, dir, dyT: S.dyT })); } } return out; };
const VA = IQ.VARIANTI.asse;
{ const S = {}, P = passi(S, vic.pts, VA), fine = P[P.length - 1], dietro = IQ.yawDa(fine.dir);
  const sulVic = P.filter(p => p.asse === 'vic_monache'), allin = sulVic.filter(p => { const a = R.asse(p.x, p.z); return a && Math.abs(Math.sin(IQ.yawDa(a.a) - p.yaw)) < .2; }).length / Math.max(1, sulVic.length);
  ok(sulVic.length > 20 && allin > .7, `lungo il Vico delle Monache la visuale sta sull'asse per il ${Math.round(allin * 100)}% del tratto`);
  ok(Math.abs(ang(fine.yaw - dietro)) <= K.asseMax + .05, `in fondo al vicolo la visuale è a ${deg(Math.abs(ang(fine.yaw - dietro)))}° da dietro il personaggio (al più ${deg(K.asseMax)}°)`); }
{ // lungo tutta la Rua (con gli sbocchi dei vicoli di lato): i bersagli cambiano poco
  const S = {}; let cambi = 0, prima = null; passi(S, rua.pts, VA).forEach(p => { if (prima !== null && Math.abs(ang(p.dyT - prima)) > .01) cambi++; prima = p.dyT; });
  const L = rua.pts.reduce((a, q, k) => k ? a + Math.hypot(q[0] - rua.pts[k - 1][0], q[1] - rua.pts[k - 1][1]) : 0, 0);
  ok(cambi >= 1 && cambi <= L / 25, `lungo la Rua (${L.toFixed(0)} m) la visuale cambia bersaglio ${cambi} volte (al più una ogni 25 m)`); }
{ const S = {}; passi(S, vic.pts, VA); const y0 = S.dy; IQ.camera(S, { x: 1272, z: 343, fy: IM.pieno(1272, 343).h, dir: 0, vel: 1.4, yaw0: YAW, base: .78, rete: R, mappa: M, V, v: VA, ok: true }, 2);
  ok(Math.abs(ang(S.dy - y0)) < .3, `nella piazza del mercato la visuale resta dov'era (scarto ${deg(Math.abs(ang(S.dy - y0)))}°)`); }
{ const S = {}; const P = passi(S, vic.pts, VA, { tieni: true }); ok(P.every(p => Math.abs(p.dy) < 1e-9), 'mentre il giocatore tiene la camera spostata il giro non si muove'); }

// ---------------- 3. il ricentro sul computer ----------------
{ const S = {}, v = IQ.VARIANTI.oggi, q = { x: 1272, z: 343, fy: 4.3, dir: Math.PI / 2, vel: 1.4, yaw0: YAW, base: .78, rete: R, mappa: M, V, v, ok: true };
  IQ.camera(S, Object.assign({}, q, { ricentro: true, assorbi: .5 }), .016); const d0 = Math.abs(ang(IQ.yawDa(q.dir) - YAW - .5)); let t = .016, t95 = null;
  while (t < 2) { const r = IQ.camera(S, q, .016); t += .016; if (t95 === null && Math.abs(ang(IQ.yawDa(q.dir) - r.yaw)) < d0 * .05) t95 = t; }
  ok(Math.abs(ang(YAW + S.dy - IQ.yawDa(q.dir))) < .01, `il ricentro va dietro al personaggio (${deg(IQ.yawDa(q.dir))}°), non all'orientamento dell'isola (${deg(YAW)}°)`);
  ok(t95 !== null && Math.abs(t95 - 3 * V.MANO.tau) < .12, `col τ del ricentro: al 95% in ${t95 && t95.toFixed(2)} s (3τ = ${(3 * V.MANO.tau).toFixed(2)} s)`); }

// ---------------- 4. sul tetto ----------------
{ const S = {}; passi(S, vic.pts, IQ.VARIANTI.asse_taglio); let r; for (let k = 0; k < 60; k++) r = IQ.camera(S, { x: mx, z: mz, fy: 10, vel: 0, yaw0: YAW, base: .78, rete: R, mappa: M, V, v: IQ.VARIANTI.asse_taglio, ok: false }, .05);
  ok(Math.abs(r.pitch - .78) < .02, `sul tetto la pendenza torna quella di sempre (${r.pitch.toFixed(2)})`);
  ok(IQ.tagli(mx, mz, 10, { x: mx + 30, y: 50, z: mz + 30 }, [], V, false).size === 0, 'sul tetto non si taglia niente'); }

// ---------------- 5. il taglio mirato ----------------
const BOX = IM.CASA.filter(c => !c.b.pezzo).map(c => ({ box3: { min: { x: c.x0, y: c.base, z: c.z0 }, max: { x: c.x1, y: c.gr + 2.5, z: c.z1 } }, geo: { y0: c.base }, gr: c.gr, c }));
{ let n = 0, linee = true, dietro = true, sopra = true; const t0 = process.hrtime.bigint(); let chiamate = 0;
  const pts = IM.campiona(vic.pts).concat(IM.campiona(W.roads.find(r => r.id === 'vic_scuro').pts));
  pts.forEach(s => { const fy = IM.pieno(s.x, s.z).h, d = 59, cam = { x: s.x + Math.sin(YAW) * Math.cos(.95) * d, y: fy + Math.sin(.95) * d, z: s.z + Math.cos(YAW) * Math.cos(.95) * d };
    const vic2 = BOX.filter(o => Math.abs((o.c.x0 + o.c.x1) / 2 - s.x) < 34 && Math.abs((o.c.z0 + o.c.z1) / 2 - s.z) < 34); chiamate++;
    IQ.tagli(s.x, s.z, fy, cam, vic2, V, true).forEach((q, B) => { n++; const base = B.geo.y0, h = q.y - base;
      if (!(Math.abs(h - K.muretto) < 1e-6 || Math.abs(q.y - B.gr) < 1e-6 || Math.abs(((h - K.primo) / K.piano) - Math.round((h - K.primo) / K.piano)) < 1e-6)) linee = false;
      const cx = (B.box3.min.x + B.box3.max.x) / 2 - s.x, cz = (B.box3.min.z + B.box3.max.z) / 2 - s.z; if (cx * Math.sin(YAW) + cz * Math.cos(YAW) < K.davanti - 1e-6) dietro = false;
      if (q.y > B.gr + 1e-6) sopra = false; }); });
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / chiamate;
  ok(n > 0 && linee, `le ${n} case tagliate stanno tutte su una linea di solaio (muretto, ${K.primo} m, ogni ${K.piano} m, o la gronda)`);
  ok(dietro, 'mai una casa dietro il personaggio');
  ok(sopra, 'mai sopra la gronda (al più si toglie il tetto)');
  ok(ms < 1.5, `la scelta costa ${ms.toFixed(2)} ms a fotogramma in Node (le case entro 34 m)`); }

// ---------------- 6. la misura lungo i percorsi ----------------
{ const C = []; IM.PERC.forEach(p => C.push(...IM.campiona(p.pts).map(s => Object.assign({ perc: p.id }, s)))); const stretti = C.filter((s, i) => i % 3 === 0);
  const per = {}; ['oggi', IQ.DIFETTO].forEach(v => { const L = []; IM.PERC.forEach(p => { const cc = IM.campiona(p.pts).filter((s, i) => i % 2 === 0); if (cc.length > 3) L.push(...IM.simula(v, cc, false)); });
    const vv = L.filter(r => r.vic), m = f => vv.reduce((a, r) => a + f(r), 0) / vv.length; per[v] = { intorno: m(r => r.intorno), corpo: m(r => r.corpo), strada: m(r => r.fr.strada), tetto: m(r => r.fr.tetto), n: vv.length }; });
  const o = per.oggi, d = per[IQ.DIFETTO], pc = x => Math.round(x * 100) + '%';
  console.log(`  nei vicoli (${d.n} punti, computer): via attorno ${pc(o.intorno)} → ${pc(d.intorno)}, corpo ${pc(o.corpo)} → ${pc(d.corpo)}, strada a schermo ${pc(o.strada)} → ${pc(d.strada)}, tetti ${pc(o.tetto)} → ${pc(d.tetto)}`);
  ok(d.intorno >= o.intorno + .2 && d.intorno >= .7, `nei vicoli la via attorno al personaggio si vede: ${pc(d.intorno)} (era ${pc(o.intorno)})`);
  ok(d.corpo >= .85, `nei vicoli il corpo si vede senza sagoma: ${pc(d.corpo)} (era ${pc(o.corpo)})`);
  ok(d.strada >= .25 && d.tetto < o.tetto, `nei vicoli la strada è almeno un quarto del quadro (${pc(d.strada)}) e i tetti calano (${pc(o.tetto)} → ${pc(d.tetto)})`); }

console.log(fail ? `\n${fail} NO` : '\ntutto ok'); process.exit(fail ? 1 : 0);
