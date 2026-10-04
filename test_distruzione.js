// muraglioni: 2 botte in auto, 3 in Vespa; facciate: due botte aprono il piano terra
const G = require('./game.js');
const T = G.T, GW = G.GW;
// un muraglione con davanti almeno 5 caselle libere in linea retta (per prendere la rincorsa)
function wallSpot(skip) {
  const dirs = [[0, 1, -Math.PI / 2], [0, -1, Math.PI / 2], [1, 0, Math.PI], [-1, 0, 0]];
  for (let ty = 2; ty < G.GH - 2; ty++) for (let tx = 2; tx < GW - 2; tx++) {
    if (!G.MAP.wallAt[ty * GW + tx] || (skip && skip.has(ty * GW + tx))) continue;
    for (const [dx, dy, ang] of dirs) {
      let ok = true; for (let k = 1; k <= 6; k++) for (const o of [-1, 0, 1]) { const x = tx + dx * k + (dy ? o : 0), y = ty + dy * k + (dx ? o : 0); if (!G.walkT(x, y) || G.MAP.wallAt[y * GW + x]) ok = false; }
      if (ok) return { tx, ty, x: (tx + dx * 5) * 2 + 1, y: (ty + dy * 5) * 2 + 1, ang };
    }
  }
}
function ram(kind, used) {
  const sp = wallSpot(used); const st = G.create(3), p = st.player;
  const v = st.vehicles.find(v => v.kind === kind && !v.traffic) || st.vehicles.find(v => v.kind === kind);
  let n = 0;
  for (let k = 0; k < 6 && G.tileAt(sp.tx, sp.ty) === T.BLD; k++) {
    v.x = sp.x; v.y = sp.y; v.ang = sp.ang; v.speed = 0; v.vx = 0; v.vy = 0; v.w = 0; v.rider = 'player'; v.traffic = false; p.vehicle = v.id; p.x = v.x; p.y = v.y; v.hp = 999;
    for (let i = 0; i < 70; i++) G.step(st, 1 / 30, { x: 0, y: 0, drive: { thr: 1 } });
    n++;
  }
  const ev = st.fx.filter(e => e.k === 'wallhit' || e.k === 'wallbreak').map(e => e.k + (e.n ? e.n + '/' + e.need : '') + (e.cells ? ' ' + JSON.stringify(e.cells) : ''));
  console.log(kind, 'muro', sp.tx, sp.ty, 'rincorse', n, 'eventi', ev.join(' | '), 'casella ora', G.tileAt(sp.tx, sp.ty));
  used.add(sp.ty * GW + sp.tx);
}
const used = new Set(); ram('giulia', used); ram('vespa', used);
const st = G.create(4); console.log('ripristino', [...used].every(i => G.MAP.wallAt[i] === 1) ? 'ok' : 'NO');
// facciata: il Commissariato visto dalla Via al Mare
{ const st = G.create(5), p = st.player, b = G.BUILDINGS.find(b => b.id === 'commissariato');
  const x = (b.x + 3) * 2, y = (b.y + b.h) * 2 + 7;
  st.vehicles.forEach(v => { if (Math.hypot(v.x - x, v.y - y) < 10 && !v.traffic) { v.x = 20; v.y = 120; } if (v.traffic) { v.hidden = true; v.x = -50; } });
  const v = st.vehicles.find(v => v.kind === 'giulia'); v.traffic = false; v.hidden = false; v.rider = 'player'; v.hp = 999; p.vehicle = v.id;
  for (let r = 0; r < 3; r++) { v.x = x; v.y = y; v.ang = -Math.PI / 2; v.speed = 0; v.vx = 0; v.vy = 0; v.w = 0; for (let i = 0; i < 60; i++) G.step(st, 1 / 30, { x: 0, y: 0, drive: { thr: 1 } }); }
  console.log('facciata', JSON.stringify(st.facadeHits), 'stanze', st.rooms.length, 'y auto', v.y.toFixed(1), 'bordo edificio', (b.y + b.h) * 2); }
