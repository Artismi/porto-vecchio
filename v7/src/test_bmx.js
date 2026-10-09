// [bmx] la BMX tascabile: node test_bmx.js
global.World = require('./world.js'); global.Interior = require('./interiors.js');
const G = require('./game.js');
const st = G.create(7), p = st.player;
let ok = true; const check = (c, msg) => { console.log((c ? 'ok   ' : 'NO   ') + msg); if (!c) ok = false; };
const n0 = st.vehicles.length;
let r = G.bmx(st); const v = st.vehicles.find(k => k.kind === 'bmx');
check(r.ok && v && p.vehicle === v.id, `P la tira fuori e ci sali: ${r.msg}`);
check(st.vehicles.length === n0 + 1, 'nel mondo c\'è una sola BMX in più');
const x0 = p.x, y0 = p.y;
for (let i = 0; i < 90; i++) G.step(st, 1 / 30, { x: 0, y: 0, drive: { thr: 1 } });
const d = Math.hypot(p.x - x0, p.y - y0), sp = Math.abs(v.speed);
check(d > 1, `pedala: ${d.toFixed(1)} m in 3 s, ${sp.toFixed(1)} m/s`);
check(sp <= G.VK.bmx.max * 1.2 + .1, 'più lenta della Vespa: velocità entro il massimo della bici');
check(G.context(st).some(c => /BMX/.test(c.label)), 'il suggerimento dice «Scendi dalla BMX»');
r = G.bmx(st);
check(r.ok && !p.vehicle && !st.vehicles.some(k => k.kind === 'bmx'), `P di nuovo: scendi e torna in tasca (${r.msg})`);
check(p.hp === undefined || p.hp > 0, 'scendere in corsa non fa male');
G.bmx(st); r = G.act(st, 'veicolo');
check(!p.vehicle && !st.vehicles.some(k => k.kind === 'bmx'), 'anche con F scendi e la BMX torna in tasca');
G.bmx(st); const b = st.vehicles.find(k => k.kind === 'bmx'); G.damageVehicle(st, b, 999, 'npc');
check(!p.vehicle && !st.vehicles.some(k => k.kind === 'bmx') && !st.fires.length, 'colpita forte: ti butta giù, non brucia, torna in tasca');
p.stun = 0; p.swim = true; r = G.bmx(st); check(!r.ok, `a nuoto resta in tasca: ${r.msg}`); p.swim = false;
p.indoor = { b: 0, f: 0 }; r = G.bmx(st); check(!r.ok, `al chiuso resta in tasca: ${r.msg}`); p.indoor = null;
r = G.bmx(st); check(r.ok, 'si può tirare fuori di nuovo, tutte le volte che vuoi');
// [salto] a piedi: tieni premuto e rilascia; più carichi, più in alto
const peak = (hold, bike) => { if (bike && !p.vehicle) G.bmx(st); if (!bike && p.vehicle) G.bmx(st); p.stun = 0; G.jumpHold(st, true); for (let t = 0; t < hold; t += 1 / 30) G.step(st, 1 / 30, { x: 0, y: 0 }); G.jumpHold(st, false); let h = 0, n = 0; while ((p.jz > 0 || n === 0) && n < 200) { G.step(st, 1 / 30, { x: 0, y: 0 }); h = Math.max(h, p.jz); n++; } return h; };
const f0 = peak(0, false), f1 = peak(.8, false);
check(f0 > .15 && f1 > f0 * 1.8 && p.jz === 0, `salto a piedi: tocco ${f0.toFixed(2)} m, carico pieno ${f1.toFixed(2)} m, poi atterra`);
const b0 = peak(0, true), b1 = peak(.8, true), bk = st.vehicles.find(k => k.kind === 'bmx');
check(p.vehicle && b1 > f1 && b1 > b0 * 1.8, `bunny hop in BMX: ${b0.toFixed(2)} → ${b1.toFixed(2)} m, la bici sale col giocatore`);
G.jumpHold(st, true); G.step(st, 1 / 30, { x: 0, y: 0 }); G.step(st, 1 / 30, { x: 0, y: 0 }); G.jumpHold(st, false); G.step(st, 1 / 30, { x: 0, y: 0 });
check(bk.jz > 0 && Math.abs(bk.jz - p.jz) < 1e-9, 'in aria la BMX ha la stessa altezza del giocatore');
for (let i = 0; i < 60; i++) G.step(st, 1 / 30, { x: 0, y: 0 });
// [andatura] più clicchi svelto, più forte pedali: la velocità di punta sale con l'andatura
const hidden = st.npcs.filter(n => !n.inside); hidden.forEach(n => n.inside = true);   // le prove di velocità senza passanti in mezzo
const home = [bk.x, bk.y, bk.ang];
const top = pace => { p.stun = 0; [bk.x, bk.y, bk.ang] = home; bk.vx = bk.vy = 0; bk.w = 0; bk.speed = 0; let m = 0; for (let i = 0; i < 150; i++) { st.npcs.forEach(n => { if (!n.inside) { n.inside = true; hidden.push(n); } }); G.step(st, 1 / 30, { x: Math.cos(bk.ang), y: Math.sin(bk.ang), pace }); m = Math.max(m, Math.abs(bk.speed)); } return m; };
for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) { home[2] = a; if (top(3) > 7) break; }   // una direzione libera per 20 m
const s1 = top(1), s2 = top(2), s3 = top(3);
check(s1 < s2 && s2 < s3, `BMX: pedalata piano ${s1.toFixed(1)}, forte ${s2.toFixed(1)}, a tutta ${s3.toFixed(1)} m/s`);
G.bmx(st); const run = pace => { const x0 = p.x, y0 = p.y; for (let i = 0; i < 30; i++) st.npcs.forEach(n => { if (!n.inside) { n.inside = true; hidden.push(n); } }), G.step(st, 1 / 30, { x: 1, y: 0, pace, sprint: pace >= 2 }); return Math.hypot(p.x - x0, p.y - y0); };
const w1 = run(1), w2 = run(2), w3 = run(3);
check(w1 < w2 && w2 < w3, `a piedi: cammini ${w1.toFixed(1)}, corri ${w2.toFixed(1)}, scatti ${w3.toFixed(1)} m in un secondo`);
hidden.forEach(n => n.inside = false);
// [bmx] trick con le frecce: giù impenna, destra/sinistra il piede sulla pedalina (e lì non si pedala: ruota libera)
if (!p.vehicle) G.bmx(st); const tb = st.vehicles.find(k => k.kind === 'bmx'); p.stun = 0;
for (let i = 0; i < 30; i++) G.step(st, 1 / 30, { x: Math.cos(tb.ang), y: Math.sin(tb.ang), trick: { wheelie: true, peg: 0 } });
check(tb.wheelie > .9 && tb.pedal, `freccia giù: impennata (${tb.wheelie.toFixed(2)}), si continua a pedalare`);
for (let i = 0; i < 30; i++) G.step(st, 1 / 30, { x: Math.cos(tb.ang), y: Math.sin(tb.ang), trick: { wheelie: false, peg: 1 } });
check(tb.wheelie < .05 && tb.peg > .9 && !tb.pedal, `freccia sinistra: piede sulla pedalina sinistra (${tb.peg.toFixed(2)}), a ruota libera`);
for (let i = 0; i < 30; i++) G.step(st, 1 / 30, { x: 0, y: 0, trick: { wheelie: false, peg: -1 } });
check(tb.peg < -.9, `freccia destra: pedalina destra (${tb.peg.toFixed(2)})`);
for (let i = 0; i < 30; i++) G.step(st, 1 / 30, { x: 0, y: 0, trick: { wheelie: false, peg: 0 } });
check(Math.abs(tb.peg) < .05 && tb.wheelie === 0, 'lasciate le frecce, torna seduto sui pedali');
// [bmx] contro un pedone: niente morti, cadi tu; in aria gli passi sopra
const victim = st.npcs.find(n => !n.dead && !n.inside && !n.cop && !n.faction);
const bump = (air, sp) => { sp = sp || 9; if (!p.vehicle) G.bmx(st); const b2 = st.vehicles.find(k => k.kind === 'bmx'); victim.lastHitByCar = -99; victim.stun = 0; victim.hp = victim.maxHp;
  b2.vx = Math.cos(b2.ang) * sp; b2.vy = Math.sin(b2.ang) * sp; b2.speed = sp; victim.x = b2.x + Math.cos(b2.ang) * .3; victim.y = b2.y + Math.sin(b2.ang) * .3; p.jz = air ? .8 : 0;
  G.runOver(st, b2, 'player'); const r = { hp: victim.hp, dead: victim.dead, stun: victim.stun, onBike: !!p.vehicle }; p.jz = 0; return r; };
const hit = bump(false);
check(victim && !hit.dead && hit.hp > victim.maxHp * .7 && hit.stun > 0 && !hit.onBike, `urto a 9 m/s: ${victim.first} resta vivo (${Math.round(hit.hp)}/${victim.maxHp}), stordito; tu cadi`);
p.stun = 0; const over = bump(true);
check(over.hp === victim.maxHp && over.onBike, 'in bunny hop gli passi sopra senza toccarlo');
const soft = bump(false, 4.5); check(soft.onBike && !soft.dead && soft.hp === victim.maxHp && soft.stun > 0, 'pedalata leggera: lo urti di striscio, barcolla, tu resti in sella');
console.log(ok ? '\nTUTTO OK' : '\nQUALCOSA NON VA'); process.exit(ok ? 0 : 1);
