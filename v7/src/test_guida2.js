// [guida2] la guida che si capisce: node test_guida2.js (NOFIXGUIDA2=1: com'era, le prove si saltano)
global.World = require('./world.js'); global.Interior = require('./interiors.js');
const G = require('./game.js');
let ok = true; const check = (c, msg) => { console.log((c ? 'ok   ' : 'NO   ') + msg); if (!c) ok = false; };
if (!G.GUIDA2) { console.log('?nofixguida2: niente da provare'); process.exit(0); }
const dt = 1 / 30, ang = a => Math.atan2(Math.sin(a), Math.cos(a));
const st = G.create(7); st.npcs.forEach(n => n.inside = true); st.vehicles.forEach(v => { if (v.traffic) v.hidden = true; });
const p = st.player;
// un punto largo e libero per le prove
let open = null; for (let x = 1200; x < 1500 && !open; x += 2) for (let y = 300; y < 420 && !open; y += 2) { let f = true; for (let a = 0; a < 6.28 && f; a += .3) for (const r of [2, 5, 9, 14]) if (!G.driveM(x + Math.cos(a) * r, y + Math.sin(a) * r)) { f = false; break; } if (f && !st.vehicles.some(v => Math.hypot(v.x - x, v.y - y) < 18)) open = [x, y]; }
check(!!open, `c'è una piazza libera per le prove (${open})`);
const auto = (kind, x, y, a) => { st.vehicles = st.vehicles.filter(v => v.id !== 'P'); const v = G.makeVehicle(st, { id: 'P', kind, x, y, ang: a || 0, color: '#fff', mine: true, rider: 'player' }); st.vehicles.push(v); p.vehicle = 'P'; p.stun = 0; return v; };
// 1. W da solo va dritto (nessuno sterzo verso il puntatore: il comando che arriva da main.js è thr 1, steer 0)
let v = auto('giulia', open[0], open[1], 0); for (let i = 0; i < 45; i++) G.step(st, dt, { x: 0, y: 0, drive: { thr: 1, steer: 0 } });
check(Math.abs(ang(v.ang)) < .02 && v.x - open[0] > 8, `W da solo: dritto (${(v.x - open[0]).toFixed(1)} m, girato di ${(ang(v.ang) * 57.3).toFixed(1)}°)`);
// 2. più veloce di prima: la Giulia a 17 × 1,3 m/s
check(Math.abs(G.VK.giulia.max - 17 * 1.3) < .01 && Math.abs(G.VK.bmx.max - 9 * 1.1) < .01, `velocità massime: Giulia ${(G.VK.giulia.max * 3.6).toFixed(0)} km/h, BMX ${(G.VK.bmx.max * 3.6).toFixed(0)} km/h`);
// 3. lo sterzo dei tasti entra in 0,25 s
v = auto('giulia', open[0], open[1], 0); for (let i = 0; i < 30; i++) G.step(st, dt, { x: 0, y: 0, drive: { thr: 1, steer: 0 } });
G.step(st, dt, { x: 0, y: 0, drive: { thr: 1, steer: 1 } }); const s1 = v.steer; for (let i = 0; i < 9; i++) G.step(st, dt, { x: 0, y: 0, drive: { thr: 1, steer: 1 } });
check(s1 < .2 && v.steer > .95, `sterzo morbido: dopo un fotogramma ${s1.toFixed(2)}, dopo 0,33 s ${v.steer.toFixed(2)}`);
// 4. il raggio minimo: a ~8 m/s con lo sterzo pieno il cerchio è largo almeno 4,5 m
v = auto('giulia', open[0], open[1], 0); for (let i = 0; i < 24; i++) G.step(st, dt, { x: 0, y: 0, drive: { thr: .4, steer: 0 } });
let wMax = 0, sp = 0; for (let i = 0; i < 30; i++) { G.step(st, dt, { x: 0, y: 0, drive: { thr: .4, steer: 1 } }); if (i > 15) { wMax = Math.max(wMax, Math.abs(v.w)); sp = Math.hypot(v.vx, v.vy); } }
check(sp / wMax >= 4.4, `raggio di sterzata a ${sp.toFixed(1)} m/s: ${(sp / wMax).toFixed(1)} m (prima ~1,7 m)`);
// 5. la frenata: ~9,5 m/s²
v = auto('giulia', open[0] - 12, open[1], 0); v.vx = 15; v.vy = 0; v.speed = 15; G.step(st, dt, { x: 0, y: 0, drive: { thr: -1, steer: 0 } }); const v0 = Math.hypot(v.vx, v.vy); for (let i = 0; i < 15; i++) G.step(st, dt, { x: 0, y: 0, drive: { thr: -1, steer: 0 } });
const dec = (v0 - Math.hypot(v.vx, v.vy)) / (15 * dt); check(dec > 8 && dec < 11.5, `frenata con S: ${dec.toFixed(1)} m/s²`);
// 6. incastrato col muso nel muro e W tenuto: fa manovra da solo
let wall = null; for (let x = open[0]; x < open[0] + 200 && !wall; x += .5) if (!G.driveM(x, open[1])) wall = x;
v = auto('giulia', wall - 2.3, open[1], 0); let back = 0; for (let i = 0; i < 75; i++) { G.step(st, dt, { x: 0, y: 0, drive: { thr: 1, steer: 0 } }); if (G.fwd ? 0 : (v.vx < -1)) back++; }
check(v.sb && v.sb.n >= 1 && back > 0, `muso nel muro con W: retromarcia automatica (${v.sb ? v.sb.n : 0} manovre)`);
// 7. il muro costa meno: un urto a 13 m/s
v = auto("giulia", wall - 6, open[1], 0); v.vx = 13; v.vy = 0; v.speed = 13; const hp0 = v.hp; for (let i = 0; i < 30; i++) G.step(st, dt, { x: 0, y: 0, drive: { thr: 0, steer: 0 } });
check(hp0 - v.hp < 10 && hp0 - v.hp > 0, `urto contro il muro a 47 km/h: −${(hp0 - v.hp).toFixed(0)} (prima −21)`);
// 8. brucia: 5 s, l'avviso, e ti butti fuori prima dello scoppio
v = auto('giulia', open[0], open[1], 0); st.feed.length = 0; G.damageVehicle(st, v, 999, 'npc');
check(v.burning === 5 && st.feed.some(f => /Brucia! F per scendere/.test(f.text)), `brucia: ${v.burning} s e «${(st.feed[0] || {}).text}»`);
for (let i = 0; i < 160 && p.vehicle; i++) G.step(st, dt, { x: 0, y: 0, drive: { thr: 0, steer: 0 } });
check(!p.vehicle && v.burning > 0, `fuori prima dello scoppio (mancavano ${v.burning.toFixed(1)} s)`);
for (let i = 0; i < 40; i++) G.step(st, dt, { x: 0, y: 0 }); p.hp = 100; p.stun = 0;
// 9. F sceglie il mezzo che guardi; rubare è un furto da confermare (main.js)
p.vehicle = null; st.vehicles = st.vehicles.filter(k => !['P', 'A1', 'A2'].includes(k.id)); p.x = open[0]; p.y = open[1];
const a1 = G.makeVehicle(st, { id: 'A1', kind: 'vespa', x: open[0] + 1.6, y: open[1], ang: Math.PI / 2, color: '#fff', owner: 'beppe' }), a2 = G.makeVehicle(st, { id: 'A2', kind: 'polizia', x: open[0] - 1.9, y: open[1], ang: Math.PI / 2, color: '#fff' }); a2.police = true; st.vehicles.push(a1, a2);
p.face = 0; check(G.nearestVehicle(st, 1.8) === a1, 'guardando la Vespa, F prende la Vespa (non la volante più vicina)');
p.face = Math.PI; check(G.nearestVehicle(st, 1.8) === a2, 'girato verso la volante, F prende la volante');
check(G.isTheft(a1) && G.isTheft(a2) && !G.isTheft(Object.assign({}, a1, { lent: true })), 'la Vespa di un altro e la volante sono furti; quella prestata no');
check(G.context(st).some(c => c.key === 'F' && /^Tieni: /.test(c.label)), `il suggerimento dice di tenere F: «${(G.context(st).find(c => c.key === 'F') || {}).label}»`);
st.vehicles = st.vehicles.filter(k => !['A1', 'A2'].includes(k.id));
// 10. il pilota del clic porta l'auto a una meta a 40 m
v = auto('giulia', open[0], open[1], 0); let goal = null; for (let a = 0; a < 6.28 && !goal; a += .4) { const x = open[0] + Math.cos(a) * 40, y = open[1] + Math.sin(a) * 40; if (G.driveM(x, y)) { const pp = G.findPath(v.x, v.y, x, y, .6, true, G.pathR(v)); if (pp.length) goal = { x, y, pp }; } }
let arr = false; for (let i = 0; i < 900 && goal; i++) { while (goal.pp.length > 1 && Math.hypot(goal.pp[0].x - v.x, goal.pp[0].y - v.y) < 3) goal.pp.shift(); const left = Math.hypot(goal.x - v.x, goal.y - v.y); if (left < 3.2) { arr = true; break; } const d = G.pilota(st, v, goal.pp[0], left, goal.pp[1], dt); G.step(st, dt, { x: 0, y: 0, drive: d }); }
check(arr, `clic in auto: arrivata alla meta a 40 m`);
// 11. il percorso dell'auto (clr) evita i passaggi di una casella
check(G.pathR(v) > .9 && G.pathR({ kind: 'bmx' }) === 0, `raggio del percorso: auto ${G.pathR(v).toFixed(2)} m, BMX 0`);
// 12. i pedoni si scansano
p.vehicle = null; st.vehicles = st.vehicles.filter(k => k.id !== 'P');
const n = st.npcs.find(q => !q.dead); n.inside = false; n.stun = 0; n.diveT = -9; n.x = open[0] + 9; n.y = open[1] + .3;
v = auto("giulia", open[0], open[1], 0); v.vx = 10; v.vy = 0; v.speed = 10; const nb = Object.keys(n).length; G.step(st, dt, { x: 0, y: 0, drive: { thr: 1, steer: 0 } });
check(n.diveT === st.clock && Math.abs(n.kby) > 3 && n.bark, `un pedone a 9 m davanti a 36 km/h si butta di lato e grida «${n.bark && n.bark.text}»`);
n.inside = true;
// 13. BMX: arrivare col clic dietro: si gira sul posto
p.vehicle = null; st.vehicles = st.vehicles.filter(k => k.id !== 'P'); p.x = open[0]; p.y = open[1]; p.face = 0; G.bmx(st); const b = st.vehicles.find(k => k.kind === 'bmx');
for (let i = 0; i < 24; i++) G.step(st, dt, { x: -1, y: 0, pace: 2, left: 10 });
check(Math.abs(ang(b.ang - Math.PI)) < 1 && Math.hypot(b.x - open[0], b.y - open[1]) < 1.5, `BMX, meta dietro: girata sul posto in 0,8 s (${(ang(b.ang) * 57.3).toFixed(0)}°)`);
// 14. BMX: l'impennata in equilibrio vale punti; il 180 in aria; l'atterraggio storto fa cadere
for (let i = 0; i < 40; i++) G.step(st, dt, { x: 0, y: 0, drive: { thr: 1, steer: 0 } });
for (let i = 0; i < 30; i++) G.step(st, dt, { x: 0, y: 0, drive: { thr: 1, steer: 0 }, trick: { wheelie: true, peg: 0, lean: b.man && b.man.b > .2 ? -1 : b.man && b.man.b < -.2 ? 1 : 0 } });
const manT = b.man ? b.man.t : 0; for (let i = 0; i < 3; i++) G.step(st, dt, { x: 0, y: 0, drive: { thr: 1, steer: 0 }, trick: { wheelie: false, peg: 0 } });
check(manT > .9 && st.bmxT && st.bmxT.line && /Impennata/.test(st.bmxT.line.tricks.join()), `impennata tenuta ${manT.toFixed(1)} s: «${st.bmxT && st.bmxT.line && st.bmxT.line.tricks.join(' + ')}»`);
const hop = steer => { G.jumpHold(st, true); for (let i = 0; i < 18; i++) G.step(st, dt, { x: 0, y: 0, drive: { thr: 1, steer: 0 } }); G.jumpHold(st, false); let k = 0; while ((p.jz > 0 || k < 2) && k < 90) { G.step(st, dt, { x: 0, y: 0, drive: { thr: 1, steer } }); k++; } for (let i = 0; i < 3; i++) G.step(st, dt, { x: 0, y: 0, drive: { thr: 1, steer: 0 } }); };
p.stun = 0; hop(1);
const L = st.bmxT.line ? st.bmxT.line.tricks.join(' + ') : '', last = st.bmxT.last;
check(/180|360|Bunny/.test(L) || (last && !last.ok), `bunny hop girando in aria: «${L || (last && last.why)}»`);
p.stun = 0; for (let i = 0; i < 100; i++) G.step(st, dt, { x: 0, y: 0, drive: { thr: 0, steer: 0 } });
check(st.bmxT.last && st.bmxT.last.t > 0 && !st.bmxT.line, `la linea si chiude da sola: ${st.bmxT.last.ok ? '+' + st.bmxT.last.tot + ' punti' : st.bmxT.last.why}, totale ${st.bmxT.total}`);
console.log(ok ? '\nTUTTO OK' : '\nQUALCOSA NON VA'); process.exit(ok ? 0 : 1);
