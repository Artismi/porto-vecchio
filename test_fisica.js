// fisica dei mezzi: tamponamenti, derapate, muri
const G = require('./game.js');
const run = (st, n, inp) => { for (let i = 0; i < n; i++) G.step(st, 1 / 30, typeof inp === 'function' ? inp(i) : inp); };
function setup(kind) {
  const st = G.create(7), p = st.player;
  st.vehicles.forEach(v => { if (v.traffic) { v.x = -50; v.hidden = true; } });
  const v = st.vehicles.find(v => v.kind === kind && !v.traffic && !v.police); v.rider = 'player'; v.hp = 999; p.vehicle = v.id;
  return { st, p, v };
}
// 1. tamponare un'auto parcheggiata: si sposta e gira
{ const { st, v } = setup('giulia');
  const o = st.vehicles.find(k => k !== v && !k.traffic && k.kind !== 'vespa' && !k.police); o.hidden = false; o.traffic = false; o.rider = null;
  o.x = 150; o.y = 142; o.ang = Math.PI / 2; o.speed = 0; o.hp = 999;
  v.x = 135; v.y = 142.5; v.ang = 0; v.speed = 16; v.hidden = false;
  run(st, 45, { x: 1, y: 0 });
  console.log('parcheggiata colpita: spostata di', Math.hypot(o.x - 150, o.y - 142).toFixed(2), 'm, ruotata di', (o.ang - Math.PI / 2).toFixed(2), 'rad, giulia v', v.speed.toFixed(1), 'fx', st.fx.filter(e => e.k === 'carhit').length);
}
// 2. traffico: la macchina colpita si sposta davvero
{ const { st, v } = setup('giulia');
  const t = st.vehicles.find(k => k.traffic); t.hidden = false; t.x = 150; t.y = 144.6; t.ang = 0; t.dir = 1; t.speed = 4; t.road = 'litoranea'; t.s = G.nearestOnRoad(G.MAP.roads[0], 150, 142).s;
  v.x = 150; v.y = 140; v.ang = Math.PI / 2; v.speed = 15;
  let maxLat = 0; run(st, 40, i => { maxLat = Math.max(maxLat, Math.abs(t.y - 144.6)); return { x: 0, y: 1 }; });
  console.log('traffico di fianco: spostamento laterale max', maxLat.toFixed(2), 'loose', t.looseUntil > st.clock, 'stallo', !!t.stalled, 'w', (t.w || 0).toFixed(2));
}
// 3. freno a mano: derapa
{ const { st, v } = setup('giulia');
  v.x = 110; v.y = 142; v.ang = 0; v.speed = 15;
  let maxSlip = 0, maxSkid = 0; const a0 = v.ang;
  run(st, 25, i => { maxSlip = Math.max(maxSlip, Math.abs(v.slip || 0)); maxSkid = Math.max(maxSkid, v.skid || 0); return { x: 0, y: 1, brake: true }; });
  console.log('freno a mano: derapata max', maxSlip.toFixed(2), 'm/s, skid', maxSkid.toFixed(2), 'girata', (v.ang - a0).toFixed(2), 'v dir', Math.atan2(v.vy, v.vx).toFixed(2));
}
// 4. curva secca a tutta: la coda allarga
{ const { st, v } = setup('giulia');
  v.x = 100; v.y = 142; v.ang = 0; v.speed = 17;
  let maxSlip = 0; run(st, 30, i => { maxSlip = Math.max(maxSlip, Math.abs(v.slip || 0)); return { x: 0, y: 1, sprint: true }; });
  console.log('curva a tutta senza freno a mano: slip max', maxSlip.toFixed(2));
}
// 5. muro preso di striscio: non si inchioda
{ const { st, v } = setup('giulia');
  v.x = 120; v.y = 143; v.ang = -Math.PI / 2 + .35; v.speed = 14; let minSp = 99, hits = 0;
  run(st, 50, i => { minSp = Math.min(minSp, Math.hypot(v.vx || 0, v.vy || 0)); return { x: Math.cos(v.ang), y: Math.sin(v.ang) }; });
  console.log('striscio: velocità minima', minSp.toFixed(1), 'pos', v.x.toFixed(1), v.y.toFixed(1), 'hp', v.hp.toFixed(0));
}
