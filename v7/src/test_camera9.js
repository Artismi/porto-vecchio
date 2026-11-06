// [camera9] le prove della camera bassa (src/camera7.js passo9, K9): node src/test_camera9.js
// La vista (il braccio a 20°, la vista ~15° giù, l'orizzonte nel terzo alto, il busto al 60%), i vicoli (prima la spalla, poi il braccio
// corto col campo più largo, la salita solo come ultima risorsa e mai oltre 40°), le scale (la camera sale col suolo, liscia, senza tuffi),
// il ricentro e lo yaw uguali a camera7 (i comandi8 non cambiano), il flag (?camera9 / ?nocamera9).
const C = require('./camera7.js'), K9 = C.K9, D = Math.PI / 180;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const Q = (o) => Object.assign({ px: 0, py: 0, fy: 0, vx: 0, vy: 0, aspect: 16 / 9, init: { yaw: C.dietro(1, 0) } }, o);
const corri = (sec, q0, dt, upd, f) => { const S = C.create(); let r, t = 0; const tr = []; for (; t < sec - 1e-9; t += dt) { r = (f || C.passo9)(S, Q(Object.assign({}, q0, upd ? upd(t, S) : {})), dt); tr.push([t, r]); } return { S, r, tr }; };
// dove cade sullo schermo (0 in alto, 1 in basso) un punto visto dalla camera r (la vista verso r.aim, o r.look per camera7)
const schermoY = (r, x, y, z) => { const A = r.aim || r.look, f = [A.x - r.pos.x, A.y - r.pos.y, A.z - r.pos.z], fl = Math.hypot(...f), F = f.map(a => a / fl), Rr = [-F[2], 0, F[0]], rl = Math.hypot(...Rr), R = Rr.map(a => a / rl);
  const U = [R[1] * F[2] - R[2] * F[1], R[2] * F[0] - R[0] * F[2], R[0] * F[1] - R[1] * F[0]], d = [x - r.pos.x, y - r.pos.y, z - r.pos.z], zc = d[0] * F[0] + d[1] * F[1] + d[2] * F[2], yc = d[0] * U[0] + d[1] * U[1] + d[2] * U[2];
  return .5 - (yc / zc) * (U[1] > 0 ? 1 : -1) / Math.tan(r.fov * D / 2) / 2; };
const oriz = r => .5 - .5 * Math.tan(r.vista) / Math.tan(r.fov * D / 2);
// 0. il flag: in Node (niente location) spento; camera7 resta com'era (test_camera7.js)
ok(C.C9 && C.C9.on === false && typeof C.passo9 === 'function', 'senza ?camera9 la camera bassa è spenta (Camera7.C9.on false), camera7 è quella di difetto');
// 1. la vista in aperto: il braccio a 20°, la vista più su; l'orizzonte nel terzo alto del quadro, il busto al 60%, i piedi sopra il bordo
{ const { r } = corri(1, {}, 1 / 30), feet = schermoY(r, 0, 0, 0), busto = schermoY(r, r.look.x, r.look.y, r.look.z), testa = schermoY(r, 0, 1.75, 0);
  ok(Math.abs(r.pitch / D - 20) < .01 && Math.abs(r.arm - K9.arm) < .01 && r.fov === 50, `il braccio: ${(r.pitch / D).toFixed(1)}° giù, ${r.arm.toFixed(1)} m, campo ${r.fov}° (camera7: 34°, 10 m, 46°)`);
  ok(r.vista / D > 12 && r.vista / D < 22, `la vista guarda ${(r.vista / D).toFixed(1)}° giù (camera7 34°)`);
  ok(oriz(r) > .15 && oriz(r) < .3, `l'orizzonte a ${(oriz(r) * 100).toFixed(0)}% dello schermo dall'alto (camera7: ${(.5 - .5 * Math.tan(34 * D) / Math.tan(23 * D)) * 100 | 0}%, fuori dal quadro)`);
  ok(Math.abs(busto - K9.compY) < .01 && feet < .85 && testa > .45, `il personaggio: testa ${(testa * 100).toFixed(0)}%, busto ${(busto * 100).toFixed(0)}%, piedi ${(feet * 100).toFixed(0)}% dall'alto`);
  ok(r.pos.y > 3.2 && r.pos.y < 4.2, `la camera sta a ${r.pos.y.toFixed(2)} m sopra la strada (camera7 6,7)`); }
// 2. camminando e correndo il personaggio resta nel terzo di mezzo-basso, l'orizzonte resta nel quadro
{ const R = [3.6, 6.4].map(v => { const { r } = corri(3, { vx: v }, 1 / 30); return { v, mid: schermoY(r, 0, .9, 0), feet: schermoY(r, 0, 0, 0), o: oriz(r) }; });
  ok(R.every(q => q.mid > .55 && q.mid < .74 && q.feet < .9 && q.o > .12), `in cammino: il personaggio a ${R.map(q => (q.mid * 100).toFixed(0) + '%').join(' / ')} (piedi ${R.map(q => (q.feet * 100).toFixed(0) + '%').join(' / ')}), l'orizzonte a ${R.map(q => (q.o * 100).toFixed(0) + '%').join(' / ')}`); }
// 3. il vicolo: la via dritta dietro chiusa, quella a destra libera → la spalla a destra, il braccio pieno, la pendenza di base
{ const yaw = C.dietro(1, 0), rz = -Math.sin(yaw), libero = rz > 0 ? 1 : -1;   // il lato con z = +0,8 è libero
  const c2 = (o, d, L) => (Math.abs(o.z - .8 * libero * rz) < .25 ? null : 1.2);
  const { r, S } = corri(2, { cast: c2 }, 1 / 30);
  ok(S.latoW === libero && Math.abs(r.arm - K9.arm) < .05 && Math.abs(r.pitch - K9.pitch) < 1e-6, `la via dritta chiusa: la camera va di lato (${r.side9.toFixed(2)} m), il braccio resta ${r.arm.toFixed(1)} m, la pendenza ${(r.pitch / D).toFixed(0)}° (camera7: sale fino a +16° o accorcia a 50°)`); }
// 3b. il vicolo stretto: il muro a 0,5 m accanto al busto → la spalla si sposta solo quanto c'è posto (mai col busto nel muro)
{ const c3 = (o, d, L) => (d.y === 0 ? (d.z > 0 ? .5 : .4) : o.z > .2 ? null : 1.2), { r, S } = corri(2, { cast: c3 }, 1 / 30);
  ok(S.latoW === 1 && r.side9 > .2 && r.side9 <= .5 - .14 - .05 + 1e-6, `il muro a 0,5 m: la spalla va di ${r.side9.toFixed(2)} m (al più 0,31), il braccio ${r.arm.toFixed(1)} m`); }
// 3c. lo sbocco di un vicolo di traverso: di lato dal busto c'è aria, ma 1 m avanti e indietro c'è lo spigolo → niente spalla (in Vico Lungo,
// all'incrocio col Vico della Corte, la spalla presa lì metteva l'origine del raggio nello spigolo un passo dopo: braccio a 1,6 m)
{ const c4 = (o, d, L) => (d.y === 0 ? (Math.abs(o.x) > .5 ? .3 : null) : o.z > .2 ? null : 3), { r, S } = corri(2, { cast: c4 }, 1 / 30);
  ok(S.latoW === 0 && Math.abs(r.side9) < .05, `lo sbocco di traverso: niente spalla (lato ${r.side9.toFixed(2)} m), il braccio corto ${r.arm.toFixed(1)} m in mezzo`); }
// 4. chiuso da tutte le parti a 2 m: il braccio corto, la pendenza al più 30° (+ la salita se serve: mai oltre 40°), il campo si allarga
{ const { r, tr } = corri(2, { cast: () => 2 }, 1 / 30); let salto = 0; for (let i = 1; i < tr.length; i++) salto = Math.max(salto, Math.abs(tr[i][1].pitch - tr[i - 1][1].pitch));
  ok(r.arm < 2.3 && r.pitch / D <= 40 + 1e-6 && r.fov > 55, `chiuso a 2 m: il braccio ${r.arm.toFixed(1)} m, la pendenza ${(r.pitch / D).toFixed(0)}° (camera7 50°), il campo ${r.fov.toFixed(0)}°`);
  const r7 = corri(2, { cast: () => 2 }, 1 / 30, null, C.passo).r; ok(r.vista < r7.pitch - 15 * D, `la vista ${(r.vista / D).toFixed(0)}° contro ${(r7.pitch / D).toFixed(0)}° di camera7 nello stesso posto`);
  ok(salto < 3 * D, `la pendenza cambia al più ${(salto / D).toFixed(1)}° per fotogramma`); }
// 4b. all'angolo (lo sbocco dei Lanternini): il colpo che va e viene ogni 0,1 s → il braccio non esce e rientra (prima 7,3 → 2,4 m in 0,1 s),
// e la pendenza non passa mai i 34° della camera7 a braccio pieno
{ const { tr } = corri(3, {}, 1 / 30, t => ({ cast: () => (t < .5 || Math.floor(t / .1) % 2 ? 2.5 : null) })), dopo = tr.filter(([t]) => t > .6), amax = Math.max(...dopo.map(q => q[1].arm)), pmax = Math.max(...tr.map(q => q[1].pitch));
  ok(amax < 3.3 && pmax <= 34 * D + 1e-6, `il colpo che va e viene: il braccio resta sotto ${amax.toFixed(2)} m, la pendenza al più ${(pmax / D).toFixed(0)}°`); }
// 5. la salita è l'ultima risorsa: una tenda a 3 m che copre i raggi bassi (sotto 30°) ma libera sopra → si sale solo se il braccio scenderebbe sotto 3 m
{ const tenda = d => (Math.asin(d.y) < 27 * D ? 2.4 : null), A = corri(2, { cast: (o, d) => tenda(d) }, 1 / 30);
  ok(A.S.liftW > 0 && A.r.arm > 5, `la tenda bassa: si sale di ${(A.S.liftW / D).toFixed(0)}° (il braccio resta ${A.r.arm.toFixed(1)} m invece di ${2.4})`);
  const B = corri(2, { cast: (o, d) => (Math.asin(d.y) < 27 * D ? 4 : null) }, 1 / 30);
  ok(B.S.liftW === 0 && B.r.arm < 4.2, `la tenda a 4 m: niente salita, il braccio a ${B.r.arm.toFixed(1)} m (la pendenza ${(B.r.pitch / D).toFixed(0)}°)`); }
// 6. la scala in discesa: dietro il suolo sale (gradini di 17 cm ogni 30 cm), la camera sale con lui: mai sotto 1 m dal suolo sotto di lei,
// la pendenza cambia liscia, la camera non scende e risale (niente tuffi in cima alla scala)
{ const suolo = (x, z) => (x < 0 ? 0 : -Math.min(14, Math.floor(x / .3)) * .17);   // la scala scende verso +x da x = 0
  const S = C.create(); let r, ym = 99, rise = 0, dip = 0, prevY = null, minClear = 99, maxStep = 0, prevP = null; const dt = 1 / 30;
  for (let t = 0, x = -4; t < 4; t += dt, x += 3.6 * dt) { r = C.passo9(S, Q({ px: x, py: 0, fy: suolo(x, 0), vx: 3.6, suolo }), dt);
    minClear = Math.min(minClear, r.pos.y - suolo(r.pos.x, r.pos.z)); if (prevP !== null) maxStep = Math.max(maxStep, Math.abs(r.pitch - prevP)); prevP = r.pitch;
    if (prevY !== null) { if (r.pos.y < prevY) { dip += prevY - r.pos.y; } } prevY = r.pos.y; }
  const r7 = (() => { const S7 = C.create(); let q; for (let t = 0, x = -4; t < 4; t += dt, x += 3.6 * dt) q = C.passo(S7, Q({ px: x, py: 0, fy: suolo(x, 0), vx: 3.6, suolo }), dt); return q; })();
  ok(minClear > 1, `la scala in discesa: la camera sta almeno ${minClear.toFixed(2)} m sopra il suolo sotto di lei`);
  ok(maxStep < 2 * D, `la pendenza cambia al più ${(maxStep / D).toFixed(2)}° per fotogramma (niente scatti)`);
  ok(r.vista < r7.pitch - 8 * D, `in fondo alla scala la vista ${(r.vista / D).toFixed(0)}° (camera7 ${(r7.pitch / D).toFixed(0)}°)`); }
// 7. il ricentro e lo yaw: gli stessi di camera7 (la testa comune): i comandi8 vedono la stessa camera
{ const up = t => ({ vx: 3.6 * Math.cos(t * .4), vy: 3.6 * Math.sin(t * .4) }), a = corri(8, {}, 1 / 30, up, C.passo), b = corri(8, {}, 1 / 30, up, C.passo9);
  let dmax = 0; for (let i = 0; i < a.tr.length; i++) dmax = Math.max(dmax, Math.abs(C.ang(a.tr[i][1].yaw - b.tr[i][1].yaw)));
  ok(dmax < 1e-9 && b.S.mosse > 0, `il ricentro: lo yaw di camera9 è quello di camera7 (scarto ${dmax.toExponential(1)} rad, ${b.S.mosse} passi di ricentro)`); }
// 8. la spalla non sfarfalla: il muro che chiude e apre ogni 0,4 s → al più un cambio di lato
{ let cambi = 0, prima = 0; corri(6, {}, 1 / 30, t => ({ cast: (o) => (Math.floor(t / .4) % 2 && Math.abs(o.z) < .3 ? 1.5 : null) }), (S, q, dt) => { const r = C.passo9(S, q, dt); if (S.latoW !== prima) { cambi++; prima = S.latoW; } return r; });
  ok(cambi <= 2, `il muro che va e viene: la spalla cambia ${cambi} volte in 6 s`); }
// 9. mirando: sopra la spalla destra, il braccio corto della mira
{ const { r } = corri(1, { mira: true }, 1 / 30); ok(r.side > .6 && Math.abs(r.arm - K9.aimArm) < .05, `mirando la camera va ${r.side.toFixed(2)} m a destra, il braccio a ${r.arm.toFixed(1)} m`); }
console.log(fail ? `\n${fail} NO` : '\ntutto ok'); process.exit(fail ? 1 : 0);
