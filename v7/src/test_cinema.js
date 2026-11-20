// [cinema] LA REGIA (src/cinema.js; v7/DA_FUORI.md): il tempo pieno, la tensione, la camera calma e d'azione, e nel motore lo scorrere
// attorno agli ostacoli (le giunte fra caselle, il varco di lato, le scale, la BMX che gira contro il muro), il pugno che arriva.
// node test_cinema.js   (da v7/src)
'use strict';
const SV = require('../strumenti/sonda_vita.js'); SV.carica();
const Cinema = global.Cinema = require('./cinema.js');
const G = global.Game;
let male = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) male++; };
// 1. IL TEMPO: un fotogramma lungo in passi da 50 ms
{ const a = Cinema.passi(1 / 30), b = Cinema.passi(.12), c = Cinema.passi(.4);
  ok(a.n === 1 && Math.abs(a.dt - 1 / 30) < 1e-9, `a 30 fps un passo da ${(a.dt * 1000).toFixed(1)} ms`);
  const b1 = Cinema.passi(.09); ok(b1.n === 2 && Math.abs(b1.n * b1.dt - .09) < 1e-9, `a 11 fps due passi da ${(b1.dt * 1000).toFixed(0)} ms: il mondo va col tempo vero (prima 50 ms su 90: il 55%)`);
  ok(b.n === 2 && Math.abs(b.n * b.dt - .1) < 1e-9, `a 8 fps al più due passi (100 ms su 120): un passo in più costava fotogrammi`);
  ok(c.n === 2 && Math.abs(c.n * c.dt - .1) < 1e-9, `uno scatto da 400 ms: al più 100 ms di gioco (niente salti nei muri)`);
  for (let i = 0; i < 30; i++) Cinema.costo(30); const d = Cinema.passi(.12); for (let i = 0; i < 60; i++) Cinema.costo(1);
  ok(d.n === 1, `col motore caro (30 ms a passo) un passo solo: ${d.n}`); }
// 2. LA TENSIONE: sale svelta, tiene, scende piano
{ const st = { player: { x: 0, y: 0, hp: 100, vx: 0, vy: 0 }, npcs: [], clock: 0, chase: true, shake: 0 };
  let t = 0; const giri = (s, f) => { for (let i = 0; i < s * 30; i++) { st.clock += 1 / 30; Cinema.tick(st, 1 / 30, null); if (f) f(); } };
  giri(1); const su = Cinema.S.v; ok(su > .7, `la polizia ti insegue: la tensione in 1 s arriva a ${su.toFixed(2)}`);
  st.chase = false; giri(2); const tiene = Cinema.S.v; giri(10); const giu = Cinema.S.v;
  ok(tiene > .6 && giu < .1, `poi tiene (${tiene.toFixed(2)} dopo 2 s) e torna la pace (${giu.toFixed(2)} dopo 12 s)`);
  st.player.hp = 70; giri(.1); ok(Cinema.S.trauma > .3 && Cinema.S.v > .2, `una ferita da 30: trauma ${Cinema.S.trauma.toFixed(2)}, la tensione sale (${Cinema.S.v.toFixed(2)})`); }
{ const st = { player: { x: 0, y: 0, hp: 100 }, npcs: [{ x: 12, y: 0, action: { name: 'combatte' } }], clock: 0, shake: 0 };
  for (let i = 0; i < 60; i++) { st.clock += 1 / 30; Cinema.tick(st, 1 / 30, null); } const o = Cinema.fuoco();
  ok(o.x > 2 && o.x <= 3 && Math.abs(o.y) < 1e-6, `uno che ti combatte a 12 m: l'inquadratura si sposta di ${o.x.toFixed(1)} m verso di lui`);
  st.npcs.length = 0; for (let i = 0; i < 150; i++) { st.clock += 1 / 30; Cinema.tick(st, 1 / 30, null); } }
// [F2] il dialogo: dietro chi ascolta, poi il taglio sull'altro; alla guida: la tensione e la curva
{ const a = { x: 0, y: 0 }, b = { id: 'n1', x: 4, y: 0 }, D0 = Cinema.dialogo(a, b, 0), D1 = Cinema.dialogo(a, b, 2), D2 = Cinema.dialogo(a, b, 5);
  const cx = y => -Math.sin(y), dir = D0.yaw;   // la camera sta in (sin yaw, cos yaw) dal punto guardato: per guardare verso +x deve stare a −x
  ok(D0.primo && !D1.taglio && D2.taglio && D2.lato === 1 && Math.sin(D0.yaw) < -.8 && Math.sin(D2.yaw) > .8, `il dialogo: prima dietro di te (la camera a ${(Math.sin(D0.yaw) * 4).toFixed(1)} m), dopo ${Cinema.K.battuta} s il taglio dietro di lui (${(Math.sin(D2.yaw) * 4).toFixed(1)} m)`);
  Cinema.dialogo(null, null, 6);
  Cinema.S.v = 0; const I0 = Cinema.mezzo({ d: 9, p: .37, fov: 50 }, { vx: 15, vy: 0, w: 0 }, 1 / 30); Cinema.S.v = 1; const I1 = Cinema.mezzo({ d: 9, p: .37, fov: 50 }, { vx: 15, vy: 0, w: 0 }, 1 / 30); Cinema.S.v = 0;
  const c = Cinema.curva({ vx: 15, vy: 0, w: .8 });
  ok(I0.d > I1.d && I0.p > I1.p && I1.fov > I0.fov && c > .1 && c <= .16 + 1e-9, `alla guida: in pace ${I0.d.toFixed(1)} m e ${(I0.p * 57.3).toFixed(0)}°, in azione ${I1.d.toFixed(1)} m, ${(I1.p * 57.3).toFixed(0)}° e lente +${(I1.fov - 50).toFixed(0)}°; in curva si guarda ${(c * 57.3).toFixed(0)}° avanti`); }
// 3. LA CAMERA A PIEDI: calma ↔ azione
{ const K = { arm: 10, pitch: .6, vfov: 46, recentAfter: 2, recentMax: 1.5, yawT: .12, ahead: 1.9 }, K8 = { ahead: 1.5 };
  Cinema.S.v = 0; const c = Object.assign({}, Cinema.k7(K, K8)); Cinema.S.v = 1; const a = Object.assign({}, Cinema.k7(K, K8)); const a8 = K8.ahead; Cinema.S.v = 0; Cinema.k7(K, K8);
  ok(c.arm > a.arm + 1.5 && c.pitch > a.pitch && c.vfov < a.vfov && c.recentMax < a.recentMax, `calma: braccio ${c.arm.toFixed(1)} m, ${(c.pitch * 180 / Math.PI).toFixed(0)}°, lente ${c.vfov}°; azione: ${a.arm.toFixed(1)} m, ${(a.pitch * 180 / Math.PI).toFixed(0)}°, ${a.vfov}°`);
  ok(a8 > 2.3 && K8.ahead === 1.5, `lo sguardo avanti di controlli8 si allunga nell'azione (${a8.toFixed(1)} m) e torna (${K8.ahead})`); }
// 4. IL MOTORE: lungo il muro di più caselle si scivola (le giunte), contro il corrimano si va sopra o sotto
let ST, ST0;
{ const st = ST = G.create(1), p = st.player; ST0 = st.npcs.slice(); st.npcs.length = 0; st.vehicles.length = 0;
  const spingi = (x, y, deg, s) => { const a = deg * Math.PI / 180; p.x = x; p.y = y; p.vx = p.vy = 0; p.vehicle = null; p.lv = null; p.indoor = null; p.path = []; p.__muro = 0; p.__muroLato = 0;
    for (let i = 0; i < s / .05; i++) { G.step(st, .05, { x: Math.cos(a), y: Math.sin(a), mag: .75 }); if (st.over) st.over = null; } return Math.hypot(p.x - x, p.y - y); };
  Cinema.F.scivola = false; const prima = spingi(1364.2, 347.7, 112.5, 1.5); Cinema.F.scivola = true; const dopo = spingi(1364.2, 347.7, 112.5, 1.5);
  ok(prima < .3 && dopo > 1.5, `di sbieco (22°) contro il muro della Vittoria: prima ${prima.toFixed(2)} m in 1,5 s (le giunte fra le caselle ti fermavano), ora ${dopo.toFixed(2)} m`);
  const W = global.World, S = (W.passaggi || []).filter(q => q.salita && isFinite(q.x0))[0];
  if (S) { const c = Math.cos(S.rot), sn = Math.sin(S.rot), pw = (lx, lz) => [S.x + lx * c + lz * sn, S.y - lx * sn + lz * c], [x, y] = pw(S.x0 + (S.x1 - S.x0) * .5, S.z0 + (S.z1 - S.z0) * .15);
    const lato = Math.atan2(-c, -sn) * 180 / Math.PI;   // verso il corrimano (−z locale, di traverso alla scala)
    Cinema.F.scivola = false; const d0 = spingi(x, y, lato, 1.5); Cinema.F.scivola = true; const d1 = spingi(x, y, lato, 1.5);
    ok(d1 > .8, `sulla scala, di traverso contro il corrimano: prima ${d0.toFixed(2)} m, ora ${d1.toFixed(2)} m lungo i gradini`); }
  // la BMX col muso contro il muro: la levetta indietro la gira sul posto
  st.player.x = 1364.2; st.player.y = 346; const r = G.bmx(st), v = st.vehicles.find(q => q.kind === 'bmx');
  if (r.ok && v) { v.x = 1364.2; v.y = 346.9; v.ang = Math.PI / 2; v.vx = v.vy = 0; v.speed = 0; v.w = 0; p.x = v.x; p.y = v.y;
    for (let i = 0; i < 10; i++) G.step(st, .05, { x: 0, y: 0, drive: { thr: 1, steer: 0, want: Math.PI / 2 } });   // contro il muro
    for (let i = 0; i < 20; i++) { const w = -Math.PI / 2, d = Math.atan2(Math.sin(w - v.ang), Math.cos(w - v.ang)); G.step(st, .05, { x: 0, y: 0, drive: { thr: 1, steer: Math.max(-1, Math.min(1, d * 1.8)), want: w } }); }   // la levetta indietro (lo sterzo come main.js: verso dove spingi)
    const e = Math.abs(Math.atan2(Math.sin(v.ang + Math.PI / 2), Math.cos(v.ang + Math.PI / 2)));
    ok(e < .5 && v.y < 346.6, `la BMX contro il muro, levetta indietro: girata (scarto ${(e * 180 / Math.PI).toFixed(0)}°) e ripartita (${(346.9 - v.y).toFixed(1)} m)`); }
  else ok(false, 'la BMX non esce di tasca: ' + (r && r.msg)); }
// 5. IL PUGNO CHE ARRIVA: il colpo fermo, la scossa, lo spintone
{ const st = ST, p = st.player; if (p.vehicle) G.bmx(st); const n = (st.npcs.length ? st.npcs : ST0).find(q => !q.dead && !q.inside && !q.cop); if (n && !st.npcs.includes(n)) st.npcs.push(n);
  if (n) { p.vehicle = null; p.x = n.x - 1.2; p.y = n.y; p.face = 0; p.cur = 'pugni'; p.cool = 0; st.hitstop = 0; st.shake = 0; G.fire(st, 0, { x: n.x, y: n.y }, true);
    ok(st.hitstop >= .05 && st.shake >= .3 && Math.hypot(n.kbx || 0, n.kby || 0) > 3, `il pugno: fermo ${(st.hitstop * 1000).toFixed(0)} ms, scossa ${st.shake.toFixed(2)}, spintone ${Math.hypot(n.kbx || 0, n.kby || 0).toFixed(1)} m/s`); } }
console.log(male ? `cinema: ${male} prove NO` : 'cinema: tutto ok');
process.exit(male ? 1 : 0);
