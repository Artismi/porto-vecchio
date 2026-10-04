// guida arcade: accelera, curva, derapa, urta un'auto ferma (che deve spostarsi e girare), investe un pedone (che vola)
const G = require('./game.js');
const st = G.create(7), p = st.player;
st.vehicles.forEach(v => { if (Math.abs(v.y - 142) < 5 && v.x > 90 && v.x < 180) { v.x = 10; v.y = 55; } });
const car = st.vehicles.find(v => v.kind === 'giulia'); car.x = 96; car.y = 142; car.ang = 0; car.speed = 0; car.rider = 'player'; car.traffic = false; car.hp = 999; p.vehicle = car.id;
const run = (n, d) => { for (let i = 0; i < n; i++) G.step(st, 1 / 30, { x: 0, y: 0, drive: d }); };
run(45, { thr: 1 }); console.log('1,5 s di gas: v', car.speed.toFixed(1), 'x', car.x.toFixed(1));
run(20, { thr: 1, steer: -1 }); console.log('curva a sinistra: ang', car.ang.toFixed(2), 'slip', car.slip.toFixed(2));
run(15, { thr: 1, steer: 1, hb: true }); console.log('freno a mano: ang', car.ang.toFixed(2), 'slip', car.slip.toFixed(2), 'v', car.speed.toFixed(1));
run(30, { thr: -1 }); console.log('freno: v', car.speed.toFixed(1));
// tamponamento
const tgt = st.vehicles.find(v => v.kind === 'cinquecento'); tgt.x = car.x + 12; tgt.y = car.y; tgt.ang = Math.PI / 2; tgt.speed = 0; tgt.traffic = false; tgt.rider = null; tgt.hidden = false;
car.ang = 0; car.vx = 0; car.vy = 0; car.speed = 0; car.lastSpeed = 0; car.y = tgt.y + .6;
const t0 = [tgt.x, tgt.y, tgt.ang];
run(60, { thr: 1 });
console.log('500 urtata: spostata di', Math.hypot(tgt.x - t0[0], tgt.y - t0[1]).toFixed(1), 'm, girata di', (tgt.ang - t0[2]).toFixed(2), 'rad, hp', tgt.hp.toFixed(0), '| giulia v', car.speed.toFixed(1));
// pedone
const n = st.npcs.find(n => !n.cop && !n.faction); car.x = 96; car.y = 142; car.ang = 0; car.vx = 0; car.vy = 0; car.speed = 0; car.lastSpeed = 0; n.x = 110; n.y = 142; n.inside = false;
let maxd = 0; const n0 = [n.x, n.y];
for (let i = 0; i < 90; i++) { G.step(st, 1 / 30, { x: 0, y: 0, drive: { thr: i < 45 ? 1 : 0 } }); n.x !== undefined && (maxd = Math.max(maxd, Math.hypot(n.x - n0[0], n.y - n0[1]))); }
console.log('pedone: volato fino a', maxd.toFixed(1), 'm, altezza volo', (n.airH || 0).toFixed(1), 'm, a terra', n.stun > 0 || n.dead);
