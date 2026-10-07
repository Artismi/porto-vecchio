// Prova della guida arcade: accelera, curva, derapa, urta un'auto ferma (che deve spostarsi e girare), investe un pedone (che vola).
// Portato dalla radice il 7/10/2026 sulla mappa v7 (corsia rettilinea della costiera).
// Uso (dalla cartella src): node test_guida.js [seme]
global.World = require('./world.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js');
const G = Game, seed = +process.argv[2] || 7;
const st = G.create(seed), p = st.player;
st.vehicles.forEach(v => { if (v.traffic) { v.x = -50; v.hidden = true; } });
// corsia rettilinea ≥ 70 m, tutta percorribile
function straight() {
  let best = null;
  for (const rd of G.MAP.roads) {
    if (!rd.pts || rd.pts.length < 2 || rd.w < 6) continue;
    for (let i = 0; i < rd.pts.length - 1; i++) for (let j = rd.pts.length - 1; j > i; j--) {
      const a = rd.pts[i], b = rd.pts[j], ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      let ok = true;
      for (let k = i; k <= j && ok; k++) { const q = rd.pts[k]; if (Math.abs((q[0] - a[0]) * Math.sin(ang) - (q[1] - a[1]) * Math.cos(ang)) > .8) ok = false; }
      if (!ok) continue;
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 70) continue;
      for (let s = 0; s <= L && ok; s += 2) { const x = a[0] + Math.cos(ang) * s, y = a[1] + Math.sin(ang) * s; if (!G.walkM(x - Math.sin(ang) * 1.4, y + Math.cos(ang) * 1.4) || !G.walkM(x + Math.sin(ang) * 1.4, y - Math.cos(ang) * 1.4)) ok = false; }
      if (ok && (!best || L > best.L)) best = { id: rd.id, a, b, ang, L };
    }
  }
  return best;
}
const R = straight(); console.log('corsia', R.id, R.L.toFixed(0) + ' m');
const mid = { x: (R.a[0] + R.b[0]) / 2, y: (R.a[1] + R.b[1]) / 2 };
const car = st.vehicles.find(v => v.kind === 'giulia' && !v.traffic); car.rider = 'player'; car.traffic = false; car.hp = 999; p.vehicle = car.id;
const reset = (v, x, y, ang, speed) => { v.x = x; v.y = y; v.ang = ang; v.w = 0; v.steer = 0; v.speed = speed || 0; v.vx = Math.cos(ang) * v.speed; v.vy = Math.sin(ang) * v.speed; v._spd = v.speed; v.slip = 0; v.skid = 0; v.hidden = false; };
reset(car, mid.x - 20, mid.y + .5, R.ang, 0);
const run = (n, d) => { for (let i = 0; i < n; i++) G.step(st, 1 / 30, { x: 0, y: 0, drive: d }); };
run(45, { thr: 1 }); console.log('1,5 s di gas: v', car.speed.toFixed(1), 'x', car.x.toFixed(1));
run(20, { thr: 1, steer: -1 }); console.log('curva a sinistra: ang', car.ang.toFixed(2), 'slip', (car.slip || 0).toFixed(2));
run(15, { thr: 1, steer: 1, hb: true }); console.log('freno a mano: ang', car.ang.toFixed(2), 'slip', (car.slip || 0).toFixed(2), 'v', car.speed.toFixed(1));
run(30, { thr: -1 }); console.log('freno: v', car.speed.toFixed(1));
// tamponamento
const tgt = st.vehicles.find(v => v.kind === 'cinquecento' && !v.traffic); tgt.traffic = false; tgt.hidden = false;
reset(tgt, mid.x + 4, mid.y + .5, Math.PI / 2, 0); tgt.rider = null;
reset(car, mid.x - 6, tgt.y + .6, R.ang, 0);
const t0 = [tgt.x, tgt.y, tgt.ang];
run(60, { thr: 1 });
console.log('500 urtata: spostata di', Math.hypot(tgt.x - t0[0], tgt.y - t0[1]).toFixed(1), 'm, girata di', (tgt.ang - t0[2]).toFixed(2), 'rad, hp', tgt.hp.toFixed(0), '| giulia v', car.speed.toFixed(1));
// pedone (fermo sul posto: il gioco lo farà scappare, l'auto lo prende in pieno)
const n = st.npcs.find(n => !n.cop && !n.faction); n.inside = false; n.wait = 99; n.path = [];
reset(car, mid.x - 14, mid.y + .5, R.ang, 0);
n.x = mid.x + 1; n.y = mid.y + .5 + (n.x - car.x) * Math.tan(R.ang);   // sulla traiettoria dell'auto
let maxd = 0; const n0 = [n.x, n.y];
for (let i = 0; i < 130; i++) { G.step(st, 1 / 30, { x: 0, y: 0, drive: { thr: 1 } }); maxd = Math.max(maxd, Math.hypot(n.x - n0[0], n.y - n0[1])); }
console.log('pedone: volato fino a', maxd.toFixed(1), 'm, altezza volo', (n.airH || 0).toFixed(1), 'm, a terra', n.stun > 0 || n.dead);
console.log('NaN', st.npcs.some(k => !isFinite(k.x)) || !isFinite(car.x));
