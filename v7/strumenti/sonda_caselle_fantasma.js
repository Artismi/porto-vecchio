// [mondo_fix] LE CASELLE PIENE SENZA NIENTE SOPRA (MONDO_FIX.md). Il committente, sull'APK, accanto alla Porta di Terra: «una striscia nera
// per terra, non ci passo, ci giro attorno come un muro mai caricato». Un pezzo urbano (pezzi_citta.js) si riserva le caselle piene sotto i
// suoi volumi (world_cittanuova.js pzRis 'B': si urta, game.js walkT) e sotto una casella piena non si lastrica (suolo scuro). Qui, per
// ogni pezzo con caselle 'B', si costruisce il pezzo come nel gioco e si tira un raggio dall'alto sul centro di ogni casella riservata
// che non è di una casa: se il raggio non tocca il pezzo (né una casa) la casella è un muro invisibile.
// Uso (da v7/): node strumenti/sonda_caselle_fantasma.js   → elenco per pezzo, ed esce con 1 se ce n'è
'use strict';
const path = require('path'), src = path.join(__dirname, '..', 'src');
const log = console.log; console.log = () => {}; console.warn = () => {};
global.THREE = require(path.join(src, 'three.min.js'));
global.World = require(path.join(src, 'world_cittanuova.js'));
const PZ = require(process.env.PV_PEZZI || path.join(src, 'pezzi_citta.js'));   // PV_PEZZI=<file>: un'altra libreria (il prima)
console.log = log;
const W = World, TS = W.TS, GW = W.GW, T = W.T;
const mk = PZ.make || PZ.crea || PZ.costruisci;
let tot = 0;
const ray = new THREE.Raycaster();
for (const p of W.pezzi) {
  const R = (p.imp || []).filter(r => r[0] === 'B'); if (!R.length) continue;
  let g; try { g = mk(p.tipo, p.opz); } catch (e) { log('     non si costruisce', p.tipo, e.message); continue; }
  if (!g) continue; g.position.set(p.x, 0, p.y); g.rotation.y = p.rot; g.updateMatrixWorld(true);
  const c = Math.cos(p.rot), s = Math.sin(p.rot), toW = (lx, lz) => [p.x + lx * c + lz * s, p.y - lx * s + lz * c], toL = (wx, wy) => { const dx = wx - p.x, dy = wy - p.y; return [dx * c - dy * s, dx * s + dy * c]; };
  const viste = new Set(), vuote = [];
  for (const [, x0, x1, z0, z1] of R) {
    const C = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([a, b]) => toW(a, b)), xs = C.map(q => q[0]), ys = C.map(q => q[1]);
    for (let ty = Math.floor(Math.min(...ys) / TS); ty <= Math.floor(Math.max(...ys) / TS); ty++) for (let tx = Math.floor(Math.min(...xs) / TS); tx <= Math.floor(Math.max(...xs) / TS); tx++) {
      const i = ty * GW + tx; if (viste.has(i)) continue; const [lx, lz] = toL(tx * TS + 1, ty * TS + 1); if (lx < x0 || lx > x1 || lz < z0 || lz > z1) continue; viste.add(i);
      if (W.grid[i] !== T.BLD || W.bIndex[i] >= 0) continue;   // la casella che è andata a una casa (o non è piena) non è del pezzo
      // il centro della casella e i quattro punti a mezzo metro: basta che uno tocchi il pezzo
      let tocca = false; for (const [ox, oy] of [[0, 0], [-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]]) { ray.set(new THREE.Vector3(tx * TS + 1 + ox, 80, ty * TS + 1 + oy), new THREE.Vector3(0, -1, 0)); if (ray.intersectObject(g, true).length) { tocca = true; break; } }
      if (!tocca) vuote.push([tx, ty]);
    }
  }
  if (vuote.length) { tot += vuote.length; log(`NO   ${p.tipo} «${p.nome || ''}» @${p.x.toFixed(0)},${p.y.toFixed(0)}: ${vuote.length} caselle piene senza niente sopra ${vuote.slice(0, 12).map(q => q.join(',')).join(' ')}`); }
  else log(`ok   ${p.tipo} «${p.nome || ''}» @${p.x.toFixed(0)},${p.y.toFixed(0)}: ${viste.size} caselle, tutte sotto il pezzo o una casa`);
}
log(tot ? `caselle fantasma: ${tot}` : 'nessuna casella fantasma');
process.exit(tot ? 1 : 0);
