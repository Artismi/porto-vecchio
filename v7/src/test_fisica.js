// Prova della fisica dei mezzi: tamponamenti, derapate, muri.
// Portato dalla radice il 7/10/2026 sulla mappa v7 (strade rettilinee del centro/costiera).
// Uso (dalla cartella src): node test_fisica.js [seme]
global.World = require('./world.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js');
const G = Game, seed = +process.argv[2] || 7;
const run = (st, n, inp) => { for (let i = 0; i < n; i++) G.step(st, 1 / 30, typeof inp === 'function' ? inp(i) : inp); };
// una corsia rettilinea ≥ 70 m, tutta percorribile (larghezza della Giulia ai lati)
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
const setup = (kind) => {
  const st = G.create(seed), p = st.player;
  st.vehicles.forEach(v => { if (v.traffic) { v.x = -50; v.hidden = true; } });
  const v = st.vehicles.find(v => v.kind === kind && !v.traffic && !v.police); v.rider = 'player'; v.hp = 999; p.vehicle = v.id;
  return { st, p, v };
};
const reset = (v, x, y, ang, speed) => { v.x = x; v.y = y; v.ang = ang; v.w = 0; v.steer = 0; v.speed = speed || 0; v.vx = Math.cos(ang) * v.speed; v.vy = Math.sin(ang) * v.speed; v._spd = v.speed; v.slip = 0; v.skid = 0; v.hidden = false; };
// 1. tamponare un'auto parcheggiata: si sposta e gira
{ const { st, v } = setup('giulia');
  const o = st.vehicles.find(k => k !== v && !k.traffic && k.kind !== 'vespa' && !k.police); o.hidden = false; o.traffic = false; o.rider = null;
  reset(o, mid.x, mid.y + .5, Math.PI / 2, 0); o.hp = 999;
  reset(v, mid.x - 12, mid.y + .5, R.ang, 16);
  run(st, 45, { x: Math.cos(R.ang), y: Math.sin(R.ang) });
  console.log('parcheggiata colpita: spostata di', Math.hypot(o.x - mid.x, o.y - (mid.y + .5)).toFixed(2), 'm, ruotata di', (o.ang - Math.PI / 2).toFixed(2), 'rad, giulia v', v.speed.toFixed(1), 'fx', st.fx.filter(e => e.k === 'carhit').length);
}
// 2. traffico: la macchina colpita si sposta davvero
{ const { st, v } = setup('giulia');
  const t = st.vehicles.find(k => k.traffic); t.hidden = false; t.x = mid.x + 6; t.y = mid.y + 1.6; t.ang = R.ang; t.speed = 4;
  reset(v, mid.x - 6, mid.y + .5, R.ang, 15);
  let maxLat = 0; run(st, 25, i => { maxLat = Math.max(maxLat, Math.abs(t.y - (mid.y + 1.6))); return { x: Math.cos(R.ang), y: Math.sin(R.ang) }; });
  console.log('traffico di fianco: spostamento laterale max', maxLat.toFixed(2), 'loose', t.looseUntil > st.clock, 'stallo', !!t.stalled, 'w', (t.w || 0).toFixed(2));
}
// 3. freno a mano: derapa
{ const { st, v } = setup('giulia');
  reset(v, mid.x - 20, mid.y + .5, R.ang, 15);
  let maxSlip = 0, maxSkid = 0; const a0 = v.ang;
  run(st, 25, i => { maxSlip = Math.max(maxSlip, Math.abs(v.slip || 0)); maxSkid = Math.max(maxSkid, v.skid || 0); return { x: 0, y: 0, drive: { thr: 0, steer: 1, hb: true } }; });
  console.log('freno a mano: derapata max', maxSlip.toFixed(2), 'm/s, skid', maxSkid.toFixed(2), 'girata', (v.ang - a0).toFixed(2), 'v dir', Math.atan2(v.vy, v.vx).toFixed(2));
}
// 4. curva secca a tutta: la coda allarga
{ const { st, v } = setup('giulia');
  reset(v, mid.x - 20, mid.y + .5, R.ang, 17);
  let maxSlip = 0; run(st, 30, i => { maxSlip = Math.max(maxSlip, Math.abs(v.slip || 0)); return { x: 0, y: 0, drive: { thr: 1, steer: 1, boost: true } }; });
  console.log('curva a tutta senza freno a mano: slip max', maxSlip.toFixed(2));
}
// 5. muro preso di striscio: non si inchioda
{ const { st, v } = setup('giulia');
  // la facciata del commissariato presa in diagonale, di striscio
  const com = G.BUILDINGS.find(b => b.id === 'commissariato');
  const fy = (com.y + com.h) * 2 + 1;
  reset(v, (com.x - 4) * 2, fy, -Math.PI / 2 + .35, 14); let minSp = 99, hits = 0;
  run(st, 50, i => { minSp = Math.min(minSp, Math.hypot(v.vx || 0, v.vy || 0)); hits += st.fx.filter(e => e.k === 'carhit').length; return { x: Math.cos(v.ang), y: Math.sin(v.ang) }; });
  console.log('striscio: velocità minima', minSp.toFixed(1), 'pos', v.x.toFixed(1), v.y.toFixed(1), 'hp', v.hp.toFixed(0), 'carhit', hits);
}
// 6. investito: vola
{ const { st, v } = setup('giulia');
  const n = st.npcs.find(n => !n.cop && !n.faction); n.inside = false; n.wait = 99; n.path = [];
  reset(v, mid.x - 14, mid.y + .5, R.ang, 0);
  n.x = mid.x + 1; n.y = mid.y + .5 + (n.x - v.x) * Math.tan(R.ang);   // sulla traiettoria
  let maxd = 0; const n0 = [n.x, n.y];
  for (let i = 0; i < 130; i++) { G.step(st, 1 / 30, { x: 0, y: 0, drive: { thr: 1 } }); maxd = Math.max(maxd, Math.hypot(n.x - n0[0], n.y - n0[1])); }
  console.log('pedone: volato fino a', maxd.toFixed(1), 'm, altezza volo', (n.airH || 0).toFixed(1), 'm, a terra', n.stun > 0 || n.dead);
}
