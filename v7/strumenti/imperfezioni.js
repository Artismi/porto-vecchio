// [pulizia] LE IMPERFEZIONI DELLA PIANTA della città nuova, misurate sui dati del mondo (world_cittanuova.js, in node: pochi secondi):
//   storta      una casa non allineata alla via che ha davanti (entro 4 m dalla facciata): l'angolo fra il suo verso e l'asse, fra 2° e 43°
//   scalino     due case accanto sulla stessa via con la facciata arretrata di poco l'una rispetto all'altra (fra 15 cm e 1,6 m)
//   spigolo     un vertice di una via di città dove la direzione gira di più di 25° in meno di una larghezza di via (l'angolo vivo)
//   zigzag      un sentiero o un vicolo che gira a destra e a sinistra di più di 20° in pochi metri (la scaletta delle caselle)
//   salto       due vertici vicini del suolo calpestabile (vie, piazze, marciapiedi, terra) con più di 0,7 m di differenza, senza scala né banchina
//   gradino_via lungo l'asse di una via la quota cambia pendenza di colpo (più di 12% fra due tratti di 2 m)
// Stampa i conti, i peggiori casi con le coordinate e salva reports/imperfezioni.json.   node strumenti/imperfezioni.js [uscita.json]
const path = require('path'), fs = require('fs');
const log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {};
global.World = require(path.join(__dirname, '..', 'src', 'world_cittanuova.js'));
console.log = log; console.warn = warn;
const W = World, T = W.T, TS = W.TS, GW = W.GW, GH = W.GH, B = W.BUILDINGS, R = (W.roads || []).filter(r => r && r.pts && r.pts.length > 1);
const out = path.resolve(process.argv[2] || path.join(__dirname, '..', 'reports', 'imperfezioni.json'));
const CORNICE = [1202, 230, 1630, 472], inC = (x, y) => x >= CORNICE[0] && x <= CORNICE[2] && y >= CORNICE[1] && y <= CORNICE[3];
const deg = a => a * 180 / Math.PI, w90 = a => { a = ((a % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2); return a > Math.PI / 4 ? a - Math.PI / 2 : a; };
const CITTA = new Set(['citta', 'vicolo']), SENT = new Set(['sentiero', 'sterrato', 'vicolo']);
const P = { storta: [], scalino: [], spigolo: [], zigzag: [], salto: [], gradino_via: [] };
const seg = (rd, x, y) => { let best = null; const Q = rd.pts; for (let k = 0; k < Q.length - 1; k++) { const [ax, ay] = Q[k], [bx, by] = Q[k + 1], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)), d = Math.hypot(ax + dx * t - x, ay + dy * t - y); if (!best || d < best.d) best = { d, a: Math.atan2(dy, dx), k, px: ax + dx * t, py: ay + dy * t }; } return best; };
// ---- 1. le case storte e gli scalini sul fronte ----
const fronte = new Map();
B.forEach((b, i) => { if (b.pezzo || b.military) return; const cx = (b.x + b.w / 2) * TS, cy = (b.y + b.h / 2) * TS; if (!inC(cx, cy)) return;
  let best = null; for (const rd of R) { if (!CITTA.has(rd.kind)) continue; const s = seg(rd, cx, cy); if (!s) continue; const half = Math.max(b.w, b.h) * TS / 2; if (s.d - rd.w / 2 - half > 4) continue; if (!best || s.d < best.s.d) best = { rd, s }; }
  if (!best) return; const a = (b.rot || 0), dev = deg(w90(a - best.s.a));   // la casa gira di b.rot (in senso del mondo), la via ha la sua direzione
  if (Math.abs(dev) > 2 && Math.abs(dev) < 43) P.storta.push([Math.round(cx), Math.round(cy), b.id || i, best.rd.id, +dev.toFixed(1)]);
  // il fronte: la distanza del filo della casa dall'asse della via, per lato
  const nx = -Math.sin(best.s.a), ny = Math.cos(best.s.a), side = Math.sign((cx - best.s.px) * nx + (cy - best.s.py) * ny) || 1;
  const hx = b.w * TS / 2, hy = b.h * TS / 2, reach = Math.abs(nx) * hx + Math.abs(ny) * hy, d = Math.abs((cx - best.s.px) * nx + (cy - best.s.py) * ny) - reach;
  const key = best.rd.id + (side > 0 ? '+' : '-'); let L = fronte.get(key); if (!L) fronte.set(key, L = []); L.push({ b, i, t: (cx - best.s.px) * Math.cos(best.s.a) + (cy - best.s.py) * Math.sin(best.s.a) + best.s.k * 1e4, d, cx, cy, ext: Math.abs(Math.cos(best.s.a)) * hx + Math.abs(Math.sin(best.s.a)) * hy, rd: best.rd.id }); });
fronte.forEach(L => { L.sort((p, q) => p.t - q.t); for (let k = 1; k < L.length; k++) { const p = L[k - 1], q = L[k]; if (Math.hypot(p.cx - q.cx, p.cy - q.cy) > p.ext + q.ext + 1.5) continue; const dd = Math.abs(p.d - q.d); if (dd > .15 && dd < 1.6) P.scalino.push([Math.round((p.cx + q.cx) / 2), Math.round((p.cy + q.cy) / 2), (p.b.id || p.i) + '|' + (q.b.id || q.i), q.rd, +dd.toFixed(2)]); } });
// ---- 2. gli spigoli delle vie e i sentieri a zigzag ----
R.forEach(rd => { const Q = rd.pts; for (let k = 1; k < Q.length - 1; k++) { const [ax, ay] = Q[k - 1], [bx, by] = Q[k], [cx, cy] = Q[k + 1]; if (!inC(bx, by)) continue; const a1 = Math.atan2(by - ay, bx - ax), a2 = Math.atan2(cy - by, cx - bx); let t = a2 - a1; t = Math.atan2(Math.sin(t), Math.cos(t)); const l1 = Math.hypot(bx - ax, by - ay), l2 = Math.hypot(cx - bx, cy - by);
    if (CITTA.has(rd.kind) && Math.abs(deg(t)) > 25 && Math.min(l1, l2) > (rd.w || 4) * .9) P.spigolo.push([Math.round(bx), Math.round(by), rd.id, rd.kind, +deg(t).toFixed(0)]);
    if (SENT.has(rd.kind) && k < Q.length - 2) { const [dx, dy] = Q[k + 2], a3 = Math.atan2(dy - cy, dx - cx); let u = a3 - a2; u = Math.atan2(Math.sin(u), Math.cos(u)); if (Math.abs(deg(t)) > 20 && Math.abs(deg(u)) > 20 && Math.sign(t) !== Math.sign(u) && l2 < 6) P.zigzag.push([Math.round(bx), Math.round(by), rd.id, rd.kind, +deg(t).toFixed(0) + '/' + deg(u).toFixed(0)]); } } });
// ---- 3. i salti del suolo calpestabile ----
const VW = GW + 1, vh = (i, j) => W.quotaRiva ? W.quotaRiva(i, j) : W.vh[j * VW + i];
const SUOLO = new Set([T.VIA, T.COB, T.PIAZZA, T.WALK, T.DIRT, T.GRASS].filter(v => v !== undefined)), SALVA = new Set([T.STAIRS, T.QUAY, T.PIER, T.CLIFF, T.BLD, T.WATER, T.FOUNT].filter(v => v !== undefined));
const tile = (tx, ty) => tx < 0 || ty < 0 || tx >= GW || ty >= GH ? -1 : W.grid[ty * GW + tx];
for (let j = Math.floor(CORNICE[1] / TS); j < CORNICE[3] / TS; j++) for (let i = Math.floor(CORNICE[0] / TS); i < CORNICE[2] / TS; i++) {
  for (const [di, dj] of [[1, 0], [0, 1]]) { const tA = [tile(i - 1 + (dj ? 0 : 1) - 1 + 1, j - 1), tile(i, j)];
    // le due caselle che il lato fra i due vertici divide: tutte e due di suolo, nessuna scala né banchina attorno
    const c1 = dj ? tile(i - 1, j) : tile(i, j - 1), c2 = tile(i, j); if (!SUOLO.has(c1) || !SUOLO.has(c2)) continue;
    let salva = false; for (let a = -1; a <= 1 && !salva; a++) for (let c = -1; c <= 1 && !salva; c++) if (SALVA.has(tile(i + a, j + c))) salva = true; if (salva) continue;
    const dh = Math.abs(vh(i, j) - vh(i + di, j + dj)); if (dh > .7) P.salto.push([i * TS, j * TS, (dj ? 'verso sud' : 'verso est'), +dh.toFixed(2)]); } }
// ---- 4. i gradini lungo le vie ----
const hAt = (x, y) => { const i = x / TS, j = y / TS, i0 = Math.floor(i), j0 = Math.floor(j), fx = i - i0, fy = j - j0; return vh(i0, j0) * (1 - fx) * (1 - fy) + vh(i0 + 1, j0) * fx * (1 - fy) + vh(i0, j0 + 1) * (1 - fx) * fy + vh(i0 + 1, j0 + 1) * fx * fy; };
R.forEach(rd => { if (!CITTA.has(rd.kind) && rd.kind !== 'strada') return; const Q = rd.pts, S = []; for (let k = 0; k < Q.length - 1; k++) { const [ax, ay] = Q[k], [bx, by] = Q[k + 1], L = Math.hypot(bx - ax, by - ay); for (let s = 0; s < L; s += 2) S.push([ax + (bx - ax) * s / L, ay + (by - ay) * s / L]); }
  for (let k = 2; k < S.length; k++) { if (!inC(S[k][0], S[k][1])) continue; const g1 = (hAt(...S[k - 1]) - hAt(...S[k - 2])) / 2, g2 = (hAt(...S[k]) - hAt(...S[k - 1])) / 2; if (Math.abs(g2 - g1) > .12) P.gradino_via.push([Math.round(S[k][0]), Math.round(S[k][1]), rd.id, rd.kind, Math.round((g2 - g1) * 100) + '%']); } });
const conti = {}; Object.keys(P).forEach(k => conti[k] = P[k].length);
console.log('IMPERFEZIONI DELLA PIANTA (cornice della città)', JSON.stringify(conti));
Object.keys(P).forEach(k => { const L = P[k].slice().sort((a, b) => Math.abs(parseFloat(String(b[b.length - 1]))) - Math.abs(parseFloat(String(a[a.length - 1])))); console.log('\n' + k + ' (' + L.length + '), i peggiori:'); L.slice(0, 15).forEach(p => console.log('  ' + p.join('  '))); });
fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify({ quando: new Date().toISOString(), conti, punti: P }, null, 1)); console.log('\nsalvato', out);
