// [regia] le prove della camera che tende allo scorcio migliore (src/regia.js): node test_regia.js
const R = require('./regia.js');
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const YAW = Math.PI / 4, DIST = 9, PITCH = .5;
// la camera per una visuale (uy): come render.js (cam.yaw = YAW + uy; la camera sta in direzione (sin yaw, cos yaw) dal punto guardato)
const camDi = (x, z, fy) => uy => { const y = YAW + uy; return { x: x + Math.sin(y) * Math.cos(PITCH) * DIST, y: fy + 1.5 + Math.sin(PITCH) * DIST, z: z + Math.cos(y) * Math.cos(PITCH) * DIST }; };
const copreDi = case_ => (o, c) => case_.reduce((n, b) => n + (R.taglia(o, c, b) ? 1 : 0), 0);
function corri(q0, sec, dt, upd) { const S = {}; let uy = q0.uy, t = 0, mosse = 0, prima = uy; const tr = [];
  for (; t < sec; t += dt) { const q = Object.assign({}, q0, upd ? upd(t) : {}, { uy }); const n = R.passo(S, q, dt); if (Math.abs(n - uy) > 1e-4) mosse++; uy = n; tr.push(uy); }
  return { uy, S, mosse, tr, prima }; }
const base = { YAW, vel: 1.4, mano: false, mezzo: false, x: 0, z: 0, fy: 0 };
// 1. strada libera, cammino verso est (hd = 0): la camera va dietro, di tre quarti (non dritto), e ci arriva piano
{ const q = Object.assign({}, base, { uy: 0, hd: 0, copre: copreDi([]), cam: camDi(0, 0, 0) });
  const r = corri(q, 8, 1 / 60), die = R.dietro(0, YAW), off = Math.abs(R.ang(r.uy - die));
  ok(off > .3 && off < .5, `a piedi in strada libera la camera sta di tre quarti dietro la marcia (scarto ${off.toFixed(2)} rad)`);
  const v = r.tr.slice(1).map((u, i) => Math.abs(R.ang(u - r.tr[i])) * 60); ok(Math.max(...v) <= R.K.vmax + 1e-6, `non gira più veloce di ${R.K.vmax} rad/s (${Math.max(...v).toFixed(2)})`);
  ok(r.S.n === 1, `una scelta sola camminando dritto (${r.S.n})`); }
// 2. una casa copre il tre quarti a destra: sceglie l'altro lato
{ const die = R.dietro(0, YAW), C = camDi(0, 0, 0)(die + .4), mx = C.x / 2, mz = C.z / 2;
  const casa = { min: { x: mx - 2, y: 0, z: mz - 2 }, max: { x: mx + 2, y: 12, z: mz + 2 } };
  const q = Object.assign({}, base, { uy: 0, hd: 0, copre: copreDi([casa]), cam: camDi(0, 0, 0) });
  const r = corri(q, 8, 1 / 60), off = R.ang(r.uy - die);
  ok(off < -.2, `la casa copre il tre quarti di un lato: la camera va dall'altro (scarto ${off.toFixed(2)})`); }
// 3. da fermo, o mentre il giocatore tocca la visuale, o per 3 s dopo: la camera non si muove
{ const q = Object.assign({}, base, { uy: 1.2, hd: 0, vel: 0, copre: copreDi([]), cam: camDi(0, 0, 0) });
  ok(corri(q, 5, 1 / 60).mosse === 0, 'da fermo la camera resta dove l\'hai messa');
  const r = corri(Object.assign({}, q, { vel: 1.4 }), 4, 1 / 60, t => ({ mano: t < 1 }));
  const fermo = r.tr.slice(0, Math.round((1 + R.K.mano) * 60) - 2).every(u => Math.abs(u - 1.2) < 1e-6);
  ok(fermo, `mentre tocchi la visuale e per ${R.K.mano} s dopo la regia aspetta`); }
// 4. zig-zag rapido (svolte di 0,6 s): la camera non insegue ogni svolta
{ const q = Object.assign({}, base, { uy: R.dietro(0, YAW) + .4, copre: copreDi([]), cam: camDi(0, 0, 0) });
  const r = corri(q, 10, 1 / 60, t => ({ hd: Math.floor(t / .6) % 2 ? .9 : -.9 }));
  ok(r.S.n === 0, `con svolte più brevi di ${R.K.stabile} s nessuna scelta nuova (${r.S.n})`); }
// 5. una svolta vera (90° tenuti): una scelta, poi ferma
{ const q = Object.assign({}, base, { uy: R.dietro(0, YAW) + .4, copre: copreDi([]), cam: camDi(0, 0, 0) });
  const r = corri(q, 12, 1 / 60, t => ({ hd: t < 3 ? 0 : Math.PI / 2 }));
  const off = Math.abs(R.ang(r.uy - R.dietro(Math.PI / 2, YAW)));
  ok(off < .5 && r.S.n <= 2, `dopo una svolta tenuta la camera torna dietro (scarto ${off.toFixed(2)}, scelte ${r.S.n})`);
  const ult = r.tr.slice(-120); ok(Math.max(...ult) - Math.min(...ult) < .01, 'arrivata, sta ferma (niente ritocchi)'); }
// 6. su un mezzo: quasi dietro
{ const q = Object.assign({}, base, { uy: 0, hd: 0, vel: 6, mezzo: true, copre: copreDi([]), cam: camDi(0, 0, 0) });
  const r = corri(q, 10, 1 / 60), off = Math.abs(R.ang(r.uy - R.dietro(0, YAW)));
  ok(off <= .25, `alla guida la camera sta quasi dietro (scarto ${off.toFixed(2)})`); }
console.log(fail ? `\n${fail} prove non passano` : '\ntutto a posto');
process.exit(fail ? 1 : 0);
