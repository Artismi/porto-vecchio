// [sblocco] LA PARTENZA NON È UNA TRAPPOLA (MONDO_FIX.md). APK 1.6: il giocatore nasce alla porta di casa accanto alla Porta di Terra
// (1259, 349) e non si muove. Due prove, senza browser:
//  1. il riempimento (BFS) della griglia percorribile dalla casella della partenza: walkT, i lati chiusi delle barriere (G.BLK), niente
//     diagonali che tagliano l'angolo di una casella piena, i passaggi delle scale (G.LINK). Deve arrivare alla Piazza Grande e al Banco
//     dei fiori (Mercato vecchio) e coprire almeno 200 m di raggio (la casella raggiunta più lontana) e 4000 m² (1000 caselle);
//  2. il passo vero (G.step, la levetta) in 8 direzioni per 3 s: in ogni direzione libera per 3 m (walkM) ci si allontana più di 2 m;
//  3. l'avvio della camera (Camera7.avvio come render.js avvio7): il personaggio guarda dove ha almeno 8 m di strada davanti (in 1.6
//     restava alla porta guardando il muro a 1,5 m, e la levetta in avanti spingeva nell'angolo).
// Uso (da v7/): node strumenti/sonda_partenza.js [x y]   (senza: il punto della partenza del browser, 1259 349, e quello di G.create)
//   → stampa ok/NO ed esce con 1 se una prova non va
'use strict';
const path = require('path');
const SV = require('./sonda_vita.js'); SV.carica();
const G = global.Game, W = global.World, TS = W.TS, GW = W.GW, GH = W.GH;
const st = G.create(1), p = st.player;
let C7 = null, VIS = null; try { C7 = require('../src/camera7.js'); VIS = require('../src/visuale.js'); } catch (e) { console.log('     senza camera7/visuale: ' + e.message); }
const PUNTI = process.argv[3] ? [[+process.argv[2], +process.argv[3]]] : [[1259, 349], [p.x, p.y]];
const DX8 = [1, -1, 0, 0, 1, 1, -1, -1], DY8 = [0, 0, 1, -1, 1, -1, 1, -1];
const PL = G.PLACES || {}, METE = ['piazza_gov', 'fiori'].filter(k => PL[k]).map(k => [k, PL[k].name || k, Math.floor(PL[k].x / TS), Math.floor(PL[k].y / TS)]);   // la Piazza Grande e il Banco dei fiori sul Mercato vecchio
let male = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) male++; };
function riempi(sx, sy) {
  const s = Math.floor(sy / TS) * GW + Math.floor(sx / TS), vis = new Uint8Array(GW * GH), Q = [s]; vis[s] = 1; let n = 0, lontano = 0; const prese = new Set();
  while (Q.length) { const c = Q.pop(); n++; const cx = c % GW, cy = (c / GW) | 0, x = cx * TS + TS / 2, y = cy * TS + TS / 2;
    lontano = Math.max(lontano, Math.hypot(x - sx, y - sy)); for (const m of METE) if (Math.abs(cx - m[2]) <= 1 && Math.abs(cy - m[3]) <= 1) prese.add(m[1]);
    for (let k = 0; k < 8; k++) { const nx = cx + DX8[k], ny = cy + DY8[k]; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue; const m = ny * GW + nx;
      if (vis[m] || !G.walkT(nx, ny) || (G.BLK[c] & (1 << k))) continue;
      if (k >= 4 && (!G.walkT(cx + DX8[k], cy) || !G.walkT(cx, cy + DY8[k]))) continue;   // la diagonale non taglia l'angolo pieno
      vis[m] = 1; Q.push(m); }
    const L = G.LINK && G.LINK.get(c); if (L) for (const q of [].concat(L)) { const m = typeof q === 'number' ? q : q && q.to; if (m >= 0 && !vis[m]) { vis[m] = 1; Q.push(m); } } }
  return { n, lontano, prese };
}
for (const [x0, y0] of PUNTI) {
  const R = riempi(x0, y0);
  ok(R.prese.size === METE.length && R.lontano >= 200 && R.n >= 1000, `(${x0.toFixed(1)}, ${y0.toFixed(1)}): dalla partenza si raggiungono ${R.n} caselle (${R.n * TS * TS} m²), la più lontana a ${R.lontano.toFixed(0)} m, mete raggiunte: ${[...R.prese].join(', ') || 'nessuna'} su ${METE.length}`);
  const via = [];
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, ux = Math.cos(a), uy = Math.sin(a);
    let aperta = true; for (let d = .5; d <= 3; d += .25) if (!G.walkM(x0 + ux * d, y0 + uy * d)) aperta = false; if (!aperta) continue;   // chiusa dalla griglia entro 3 m: non conta
    p.x = x0; p.y = y0; p.vehicle = null; p.indoor = null; p.lv = null; p.path = []; p.vx = p.vy = 0;
    for (let i = 0; i < 60; i++) { G.step(st, .05, { x: ux, y: uy }); if (st.over) st.over = null; }
    via.push([k * 45, Math.hypot(p.x - x0, p.y - y0)]); }
  ok(via.length > 0 && via.every(v => v[1] > 2), `(${x0.toFixed(1)}, ${y0.toFixed(1)}): a piedi in ${via.length} direzioni aperte, ci si allontana ${via.map(v => v[0] + '° ' + v[1].toFixed(1) + ' m').join(', ')}`);
  // 3. l'avvio della camera (render.js avvio7 con Camera7.avvio, qui con la quota della casella): si guarda dove c'è strada
  if (C7 && VIS) { const M = VIS.mappa(W), K = C7.K, tp = Math.tan(K.pitch), c0 = Math.floor(y0 / TS) * GW + Math.floor(x0 / TS), fy = G.quotaSuolo(x0, y0) ?? G.MAP.elev[c0];
    const libero = (x, y, ux, uy, max, dietro) => { for (let s = .5; s < max; s += .5) { const h = dietro ? K.chest + s * tp - K.r : 2.2; if (M.alto(x + ux * s, y + uy * s) > fy + h || (!dietro && !G.walkM(x + ux * s, y + uy * s))) return s; } return max; };
    const va = (xa, ya, xb, yb) => { const L = Math.hypot(xb - xa, yb - ya), n = Math.ceil(L / .4); for (let i = 1; i <= n; i++) { const x = xa + (xb - xa) * i / n, y = ya + (yb - ya) * i / n; if (!G.walkM(x, y) || M.alto(x, y) > fy + 1.2) return false; } return !G.taglia(xa, ya, xb, yb) && G.walkM(xb + .4, yb) && G.walkM(xb - .4, yb) && G.walkM(xb, yb + .4) && G.walkM(xb, yb - .4); };
    const b = C7.avvio(x0, y0, libero, K, va);
    ok(b.avanti >= 8, `(${x0.toFixed(1)}, ${y0.toFixed(1)}): l'avvio parte da (${b.x.toFixed(1)}, ${b.y.toFixed(1)}) dopo ${b.passi.toFixed(0)} m, guarda a ${Math.round(b.face * 180 / Math.PI)}° con ${b.avanti} m di strada davanti (almeno 8)`); }
}
console.log(male ? `partenza: ${male} prove NO` : 'partenza: tutto ok');
process.exit(male ? 1 : 0);
