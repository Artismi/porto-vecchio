// [camera7] le prove della vista unica a mezza altezza (src/camera7.js) e del passo a piedi (game.js muovi7, scivola7): node src/test_camera7.js
const C = require('./camera7.js'), K = C.K, D = Math.PI / 180;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
// la camera ferma o in cammino lungo +x per `sec` secondi; cast: il raggio a sfera finto
const corri = (sec, q0, dt, upd) => { const S = C.create(); let r, t = 0; const tr = []; for (; t < sec - 1e-9; t += dt) { const q = Object.assign({ px: 0, py: 0, fy: 0, vx: 0, vy: 0, aspect: 16 / 9, init: { yaw: C.dietro(1, 0) } }, q0, upd ? upd(t, S) : {}); r = C.passo(S, q, dt); tr.push([t, r]); } return { S, r, tr }; };
// dove cade sullo schermo (0 in alto, 1 in basso) un punto (x, y, z) visto dalla camera r
const schermoY = (r, x, y, z) => { const f = [r.look.x - r.pos.x, r.look.y - r.pos.y, r.look.z - r.pos.z], fl = Math.hypot(...f), F = f.map(a => a / fl), Rr = [-F[2], 0, F[0]], rl = Math.hypot(...Rr), R = Rr.map(a => a / rl);
  const U = [R[1] * F[2] - R[2] * F[1], R[2] * F[0] - R[0] * F[2], R[0] * F[1] - R[1] * F[0]], d = [x - r.pos.x, y - r.pos.y, z - r.pos.z], zc = d[0] * F[0] + d[1] * F[1] + d[2] * F[2], yc = d[0] * U[0] + d[1] * U[1] + d[2] * U[2];
  return .5 - Math.abs(yc / zc) * Math.sign(yc * (U[1] > 0 ? 1 : -1)) / Math.tan(r.fov * D / 2) / 2; };
// 1. la vista: la variante C (34°, 10 m, campo 46°), il campo orizzontale almeno 62°, il verticale al più 80°
{ const { r } = corri(1, {}, 1 / 30), hf = a => 2 * Math.atan(Math.tan(C.vfov(a) * D / 2) * a) / D;
  ok(Math.abs(r.pitch / D - 34) < .01 && Math.abs(r.arm - 10) < .01 && r.fov === 46, `la vista: ${(r.pitch / D).toFixed(1)}° giù, braccio ${r.arm.toFixed(1)} m, campo ${r.fov}° (16:9)`);
  ok(r.pos.y > 6.3 && r.pos.y < 7.2, `la camera sta a ${r.pos.y.toFixed(2)} m sopra la strada (~6,8)`);
  ok(hf(4 / 3) >= 62 - 1e-6 && hf(300 / 534) >= 50 && C.vfov(300 / 534) <= 80 && C.vfov(16 / 9) === 46, `il campo orizzontale: 16:9 ${hf(16 / 9).toFixed(0)}°, 4:3 ${hf(4 / 3).toFixed(0)}°, telefono in verticale ${hf(300 / 534).toFixed(0)}° (prima 25,6°; verticale ${C.vfov(300 / 534).toFixed(0)}°, al più 80)`);
  ok(r.near === .25, 'il piano vicino a 25 cm'); }
// 2. l'inquadratura: il personaggio a ~62% dell'altezza camminando e correndo, la strada davanti si legge per più di 20 m
{ const R = [0, 3.6, 6.4].map(v => { const { r } = corri(3, { vx: v, px: 0 }, 1 / 30); const mid = schermoY(r, 0, .9, 0), top = r.pitch - r.fov * D / 2, av = r.pos.y / Math.tan(top) - Math.hypot(r.pos.x, r.pos.z); return { v, mid, av }; });
  ok(R[1].mid > .56 && R[1].mid < .68 && R[2].mid > .56 && R[2].mid < .7, `il personaggio sullo schermo: fermo ${(R[0].mid * 100).toFixed(0)}%, al passo ${(R[1].mid * 100).toFixed(0)}%, di corsa ${(R[2].mid * 100).toFixed(0)}% dall'alto`);
  ok(R.every(q => q.av > 20), `il suolo davanti al personaggio: ${R.map(q => q.av.toFixed(0)).join(' / ')} m (prima 5-8)`); }
// 3. il braccio: si accorcia in 0,1 s contro il muro, non lo passa, torna fuori in ~0,6 s; sotto 6,5 m la pendenza sale (fino a 50° a 3,5 m)
{ let muro = true; const cast = (o, d, L) => muro ? 4 : null;
  const S = C.create(); let r; for (let i = 0; i < 30; i++) r = C.passo(S, { px: 0, py: 0, fy: 0, aspect: 16 / 9, init: { yaw: 0 }, cast: () => null }, 1 / 60);
  const want = S.armT; let tIn = null, oltre = 0; for (let i = 1; i <= 60; i++) { r = C.passo(S, { px: 0, py: 0, fy: 0, aspect: 16 / 9, cast }, 1 / 60); oltre = Math.max(oltre, r.arm - S.armT); if (tIn === null && r.arm - S.armT < (want - S.armT) * .05) tIn = i / 60; }
  ok(tIn !== null && tIn <= .1 + 1e-9 && oltre <= K.armSlip + 1e-9, `contro il muro il braccio si accorcia in ${tIn && tIn.toFixed(2)} s (al più 0,1), mai oltre il colpo più di ${K.armSlip} m (${oltre.toFixed(2)})`);
  const corto = r.arm; ok(r.pitch > K.pitch + 5 * D, `col braccio corto (${corto.toFixed(1)} m) la camera sale invece di entrare addosso: ${(r.pitch / D).toFixed(0)}°`);
  muro = false; let tOut = null; for (let i = 1; i <= 120; i++) { r = C.passo(S, { px: 0, py: 0, fy: 0, aspect: 16 / 9, cast }, 1 / 60); if (tOut === null && K.arm - r.arm < (K.arm - corto) * .05) tOut = i / 60; }
  ok(tOut !== null && tOut > .4 && tOut <= .65, `libero, il braccio torna fuori in ${tOut && tOut.toFixed(2)} s (0,6)`);
  ok(Math.abs(C.pitchFor(3.5, 0) / D - 50) < .01 && Math.abs(C.pitchFor(6.5, 0) - K.pitch) < 1e-9 && C.pitchFor(5, 0) > K.pitch, `la pendenza dal braccio: 10 m ${(C.pitchFor(10, 0) / D).toFixed(0)}°, 6,5 m ${(C.pitchFor(6.5, 0) / D).toFixed(0)}°, 5 m ${(C.pitchFor(5, 0) / D).toFixed(0)}°, 3,5 m ${(C.pitchFor(3.5, 0) / D).toFixed(0)}°`); }
// 4. il ricentro: solo in cammino, solo dopo 2 s senza toccare, al più 90°/s, mai andando verso la camera; il giocatore lo azzera
{ const y0 = C.dietro(1, 0) + 1.2;   // la camera girata di ~70° rispetto al dietro della marcia (lungo +x)
  const A = corri(6, { vx: 3.6, init: { yaw: y0 } }, 1 / 30); const tr = A.tr, at = t => tr.find(q => q[0] >= t - 1e-9)[1].yaw;
  let vmax = 0; for (let i = 1; i < tr.length; i++) vmax = Math.max(vmax, Math.abs(C.ang(tr[i][1].yaw - tr[i - 1][1].yaw)) * 30);
  ok(Math.abs(C.ang(at(1.9) - y0)) < 1e-6, `camminando, per 2 s la camera resta dove l'hai messa (scarto ${Math.abs(C.ang(at(1.9) - y0)).toFixed(4)} rad)`);
  ok(Math.abs(C.ang(at(5.9) - C.dietro(1, 0))) < .1, `poi torna dietro la marcia: a 6 s ${(Math.abs(C.ang(at(5.9) - C.dietro(1, 0))) / D).toFixed(1)}° dal dietro`);
  ok(vmax <= 90 * D + 1e-6, `al più 90°/s (${(vmax / D).toFixed(0)}°/s)`);
  const F = corri(6, { vx: 0, init: { yaw: y0 } }, 1 / 30); ok(Math.abs(C.ang(F.r.yaw - y0)) < 1e-6, 'da fermo niente ricentro');
  const V = corri(6, { vx: -3.6, init: { yaw: C.dietro(1, 0) } }, 1 / 30); ok(Math.abs(C.ang(V.r.yaw - C.dietro(1, 0))) < 1e-6, 'andando verso la camera niente mezzo giro');
  const T = corri(6, { vx: 3.6, init: { yaw: y0 } }, 1 / 30, t => ({ tocca: t > 1 && t < 4.5 })); ok(Math.abs(C.ang(T.r.yaw - y0)) < 1e-6, `toccando la camera il ricentro aspetta di nuovo 2 s (scarto a 6 s: ${Math.abs(C.ang(T.r.yaw - y0)).toFixed(4)})`);
  const G2 = corri(6, { vx: 3.6, init: { yaw: y0 } }, 1 / 20), G6 = corri(6, { vx: 3.6, init: { yaw: y0 } }, 1 / 60);
  ok(Math.abs(C.ang(G2.r.yaw - G6.r.yaw)) < .06, `uguale a 20 e a 60 fps (scarto ${(Math.abs(C.ang(G2.r.yaw - G6.r.yaw)) / D).toFixed(1)}°)`); }
// 5. il giocatore: lo yaw gira subito, l'inclinazione dentro ±12°; niente zoom (il braccio non cambia)
{ const S = C.create(); C.passo(S, { px: 0, py: 0, fy: 0, aspect: 16 / 9, init: { yaw: 0 } }, 1 / 30); const r = C.passo(S, { px: 0, py: 0, fy: 0, aspect: 16 / 9, dyaw: .5, pu: 1 }, 1 / 30);
  ok(Math.abs(r.yaw - .5) < 1e-9, `lo yaw del giocatore arriva nello stesso fotogramma (${r.yaw.toFixed(3)})`);
  ok(Math.abs(r.pitch - (K.pitch + K.orbit)) < 1e-9 && Math.abs(r.arm - K.arm) < 1e-6, `l'inclinazione si ferma a ±12° (${(r.pitch / D).toFixed(0)}°), il braccio resta ${r.arm.toFixed(1)} m`); }
// 6. la mira: sopra la spalla destra, più vicini, senza salire
{ const A = corri(1, { mira: true }, 1 / 30); ok(A.r.side > .6 && Math.abs(A.r.arm - K.aimArm) < .05 && Math.abs(A.r.pitch - K.pitch) < 1e-6, `mirando la camera va ${A.r.side.toFixed(2)} m a destra, il braccio a ${A.r.arm.toFixed(1)} m, la pendenza resta ${(A.r.pitch / D).toFixed(0)}°`); }
// 7. l'avvio: la via libera davanti, il braccio libero dietro
{ const muro = (x, y, ux, uy, max) => ux < -.5 ? 3 : max;   // a ovest (dietro, se guardi a est) un muro a 3 m
  const b = C.avvio(0, 0, muro); ok(Math.abs(C.ang(b.face - Math.PI)) > 1.2 && b.dietro >= K.arm * Math.cos(K.pitch), `all'avvio il personaggio non dà le spalle al muro alla camera (guarda ${(b.face / D).toFixed(0)}°, dietro ${b.dietro} m liberi)`); }
// 8. il passo a piedi (game.js): cammina, corre, accelera e frena, scivola lungo il muro, niente corsa sul posto, il salto quando premi
{ global.World = require('./world.js'); global.Interior = require('./interiors.js'); const G = require('./game.js'), st = G.create(7), p = st.player, T = G.T, TS = G.TS;
  const passo = (sec, inp, dt = 1 / 30) => { const L = []; for (let t = 0; t < sec - 1e-9; t += dt) { const x0 = p.x, y0 = p.y; G.step(st, dt, typeof inp === 'function' ? inp(t) : inp); L.push({ d: Math.hypot(p.x - x0, p.y - y0) / dt, s: Math.abs(p.speed || 0) }); } return L; };
  const calma = () => { p.stun = 0; p.hp = 100; st.police = []; st.heat = 0; p.vx = p.vy = 0; p.speed = 0; p.jz = 0; p.jvz = 0; p.kbx = p.kby = 0; };
  // un tratto di muro lungo x: caselle libere (y) con sopra caselle piene (y - 1), per 6 caselle
  let W = null; for (let ty = 5; ty < G.MAP.world.GH - 5 && !W; ty++) for (let tx = 5; tx < G.MAP.world.GW - 12 && !W; tx++) { let k = true; for (let i = 0; i < 6 && k; i++) k = G.walkT(tx + i, ty) && G.walkT(tx + i, ty + 1) && G.walkT(tx + i, ty + 2) && !G.walkT(tx + i, ty - 1) && G.tileAt(tx + i, ty - 1) === T.BLD && !G.taglia((tx + i) * TS, (ty + 1) * TS, (tx + i + 1) * TS, (ty + 1) * TS); if (k) W = [tx, ty]; }
  ok(!!W, 'trovato un muro dritto per le prove' + (W ? ` (casella ${W})` : ''));
  if (W) { const x0 = W[0] * TS + 1, y0 = W[1] * TS + 2.5, metti = () => { p.x = x0; p.y = y0; calma(); };
    metti(); passo(1, { x: 1, y: 0 }); passo(1, { x: 1, y: 0 }); const vW = Math.hypot(p.vx, p.vy); ok(Math.abs(vW - 3.6) < .05, `coi tasti si cammina: ${vW.toFixed(2)} m/s (prima 6,4 sempre)`);
    metti(); const R = passo(1, { x: 1, y: 0, sprint: true }); const vR = Math.hypot(p.vx, p.vy), t64 = R.findIndex(q => q.d > 6.3) / 30; ok(Math.abs(vR - 6.4) < .05 && t64 > .25 && t64 < .42, `con Maiusc si corre: ${vR.toFixed(2)} m/s, ci si arriva in ${t64.toFixed(2)} s (20 m/s²)`);
    const xa = p.x; const B = passo(.6, { x: 0, y: 0 }); const tb = B.findIndex(q => q.d < .05) / 30; ok(tb > .15 && tb < .3 && p.x - xa < 1, `lasciando si frena in ${tb.toFixed(2)} s, ${(p.x - xa).toFixed(2)} m (30 m/s²)`);
    metti(); passo(.2, { x: .5, y: .5, mag: .45 }); const vm = Math.hypot(p.vx, p.vy); passo(1, { x: .5, y: .5, mag: .45 }); ok(Math.abs(Math.hypot(p.vx, p.vy) - (1.3 + 5.1 * .45)) < .1, `con la levetta la velocità la dà quanto la spingi: ${Math.hypot(p.vx, p.vy).toFixed(2)} m/s a metà`);
    metti(); const yW = W[1] * TS + .35, D = passo(1.5, { x: Math.SQRT1_2, y: -Math.SQRT1_2, sprint: true }); const dx = p.x - x0;
    ok(Math.abs(p.y - yW) < .06 && dx > 3.5, `di sbieco contro il muro si scivola lungo il muro: ${dx.toFixed(1)} m lungo, a ${(p.y - W[1] * TS).toFixed(2)} m dal muro`);
    metti(); const Q = passo(2, { x: 0, y: -1, sprint: true }); const sulPosto = Q.filter(q => q.s > .5 && q.d < .2).length; ok(sulPosto === 0 && Math.abs(p.speed) < .05, `dritto contro il muro: ${sulPosto} fotogrammi di corsa sul posto (p.speed ${Math.abs(p.speed).toFixed(2)})`);
    metti(); G.jumpHold(st, true); let hmax = 0; for (let i = 0; i < 30; i++) { G.step(st, 1 / 60, { x: 0, y: 0 }); hmax = Math.max(hmax, p.jz || 0); } G.jumpHold(st, false); ok(Math.abs(hmax - .5) < .03, `il salto parte quando premi: ${hmax.toFixed(2)} m al colmo`); } }
console.log(fail ? `\n${fail} NO` : '\ntutto ok'); process.exit(fail ? 1 : 0);
