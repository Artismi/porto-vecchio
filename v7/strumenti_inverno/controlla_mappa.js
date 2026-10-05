// Controlli sulla mappa (world.js): strade (pendenze, incroci, sezione in piano), edifici (compenetrazioni), raggiungibilità.
// node strumenti_inverno/controlla_mappa.js  (dalla cartella v7)
const W = require('../src/world.js'), T = W.T, TS = W.TS, GW = W.GW, GH = W.GH;
const out = [], warn = m => out.push(m);
const vhAt = (x, y) => { const fx = Math.max(0, Math.min(GW - .001, x / TS)), fy = Math.max(0, Math.min(GH - .001, y / TS)), i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j, V = (a, b) => W.vh[b * W.VW + a]; return (V(i, j) * (1 - u) + V(i + 1, j) * u) * (1 - v) + (V(i, j + 1) * (1 - u) + V(i + 1, j + 1) * u) * v; };
// --- strade ---
let worstG = [], worstJ = [], worstX = [];
W.roads.forEach(rd => {
  if (!rd.h || rd.rect) return;
  let g = 0, gk = 0; for (let k = 1; k < rd.pts.length; k++) { let j = k - 1, L = 0; while (j > 0 && (L = Math.hypot(rd.pts[k][0] - rd.pts[j][0], rd.pts[k][1] - rd.pts[j][1])) < 4) j--; L = Math.max(L, Math.hypot(rd.pts[k][0] - rd.pts[j][0], rd.pts[k][1] - rd.pts[j][1])); if (L < 3) continue; const s = Math.abs(rd.h[k] - rd.h[j]) / L; if (s > g) { g = s; gk = k; } }
  worstG.push([g, rd.id, rd.kind, rd.pts[gk].map(Math.round)]);
  // sezione: la quota del terreno a destra e a sinistra della mezzeria, dentro la carreggiata, deve essere quella della strada
  let xs = 0, xk = 0; for (let k = 2; k < rd.pts.length - 2; k += 3) { const a = rd.pts[k - 1], c = rd.pts[k + 1], L = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1, nx = -(c[1] - a[1]) / L, ny = (c[0] - a[0]) / L, o = rd.w / 2 - .6;
    const d = Math.abs(vhAt(rd.pts[k][0] + nx * o, rd.pts[k][1] + ny * o) - vhAt(rd.pts[k][0] - nx * o, rd.pts[k][1] - ny * o)); if (d > xs) { xs = d; xk = k; } }
  worstX.push([xs, rd.id, rd.kind, rd.pts[xk].map(Math.round)]);
  // estremi: se toccano un'altra strada, stessa quota
  [0, rd.pts.length - 1].forEach(e => { const [x, y] = rd.pts[e]; W.roads.forEach(o => { if (o === rd || !o.h) return; for (let j = 0; j < o.pts.length; j++) if (Math.hypot(o.pts[j][0] - x, o.pts[j][1] - y) < o.w / 2 + 1) { worstJ.push([Math.abs(o.h[j] - rd.h[e]), rd.id + '→' + o.id, [Math.round(x), Math.round(y)]]); return; } }); });
});
worstG.sort((a, b) => b[0] - a[0]); worstJ.sort((a, b) => b[0] - a[0]); worstX.sort((a, b) => b[0] - a[0]);
console.log('pendenze massime:', worstG.slice(0, 8).map(q => `${q[1]}(${q[2]}) ${(q[0] * 100).toFixed(0)}% @${q[3]}`).join(' | '));
console.log('incroci, salto di quota:', worstJ.slice(0, 8).map(q => `${q[1]} ${q[0].toFixed(2)} m @${q[2]}`).join(' | '));
console.log('sezione non in piano (m):', worstX.slice(0, 6).map(q => `${q[1]} ${q[0].toFixed(2)} @${q[3]}`).join(' | '));
let cut = 0, wall = 0; for (let i = 0; i < W.feat.length; i++) { if (W.feat[i] & 1024) cut++; if (W.feat[i] & 16384) wall++; }
console.log('caselle di roccia tagliata', cut, '· di muro di sostegno', wall, '· gallerie', (W.TUNNELS || []).length, (W.TUNNELS || []).map(t => t.name + ' ' + (t.pts.length * 2) + ' m').join(', '));
// --- edifici ---
const B = W.BUILDINGS; let over = 0, onRoad = 0, steep = 0;
const own = new Int32Array(GW * GH).fill(-1);
B.forEach((b, k) => { for (let ty = b.y; ty < b.y + b.h; ty++) for (let tx = b.x; tx < b.x + b.w; tx++) { const i = ty * GW + tx; if (own[i] >= 0 && own[i] !== k) over++; own[i] = k; if (W.roadW[i] > 0) onRoad++; } });
B.forEach(b => { let a = 1e9, c = -1e9; for (let j = b.y; j <= b.y + b.h; j++) for (let i = b.x; i <= b.x + b.w; i++) { const h = W.vh[j * W.VW + i]; a = Math.min(a, h); c = Math.max(c, h); } if (c - a > 3) steep++; });
console.log('edifici', B.length, '· sovrapposti (caselle)', over, '· su strada', onRoad, '· su terreno con più di 3 m di dislivello', steep);
// --- raggiungibilità ---
let un = 0; Object.values(W.PLACES).forEach(p => { if (!W.reach[p.ty * GW + p.tx]) { un++; warn('luogo irraggiungibile: ' + p.id); } });
let nd = 0; B.forEach(b => { if (!b.door) nd++; });
console.log('luoghi', Object.keys(W.PLACES).length, '· irraggiungibili', un, '· edifici senza porta', nd);
out.slice(0, 20).forEach(m => console.log('  ' + m));
