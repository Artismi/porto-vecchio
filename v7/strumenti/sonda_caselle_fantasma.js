// [mondo_fix] Le caselle fantasma: cd v7 && node strumenti/sonda_caselle_fantasma.js [tipo] [-v]
// Un pezzo della città (world_cittanuova.js) riserva le sue caselle piene con pzRis(p, 'B', x0, x1, z0, z1): diventano T.BLD, il
// giocatore ci urta (walkT in game.js) e render.js ci stende sotto il suolo scuro non lastricato. Se la mesh del pezzo (pezzi_citta.js)
// non copre il rettangolo riservato, si vede una striscia scura e si sbatte contro un muro invisibile.
// Per ogni casella T.BLD che non è di un edificio del gioco (bIndex < 0) e che cade in un rettangolo 'B' di un pezzo, la sonda guarda
// 13×13 punti della casella (ogni 15 cm) all'altezza del corpo (fra 0,3 e 1,8 m sopra la posa): un punto è coperto se sta dentro la scatola locale di
// una mesh di quel pezzo o di un pezzo vicino (per le mesh che non sono scatole, anche un raggio verticale deve toccarle).
//   fantasma: nessun punto coperto (si urta il vuoto)   ·   orlo: coperta solo in parte (il muro passa nella casella, non al centro)
// Esce con 1 se c'è almeno una casella fantasma.
const path = require('path'), src = path.join(__dirname, '..', 'src');
global.THREE = require(path.join(src, 'three.min.js'));
const log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {};
const W = require(path.join(src, 'world_cittanuova.js'));
console.log = log; console.warn = warn;
const PC = require(path.join(src, 'pezzi_citta.js'));
const solo = process.argv.slice(2).find(a => !a.startsWith('-')), verbose = process.argv.includes('-v');
const { TS, GW, GH, T } = W, Y0 = .3, Y1 = 1.8, NS = 13, OFF = Array.from({ length: NS }, (_, k) => (k + .5) * TS / NS), NP = NS * NS;   // 15 cm: un muro di 20 cm non passa fra due punti

// la mesh di ogni pezzo con caselle piene, nel mondo (come posaPezzi1 in render.js, a quota 0)
const PZ = (W.pezzi || []).filter(p => (p.imp || []).some(r => r[0] === 'B'));
const ray = new THREE.Raycaster(), V = new THREE.Vector3(), DN = new THREE.Vector3(0, -1, 0);
PZ.forEach(p => {
  let g = null; try { g = PC.make(p.tipo, Object.assign({}, p.opz)); } catch (e) { warn('[sonda]', p.tipo, e.message); }
  p._M = []; if (!g) return;
  const root = new THREE.Group(); root.position.set(p.x, 0, p.y); root.rotation.y = p.rot || 0; root.add(g); root.updateMatrixWorld(true);
  root.traverse(o => { if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return; o.geometry.computeBoundingBox();
    const wb = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld); if (wb.max.y < Y0 || wb.min.y > Y1) return;
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.side = THREE.DoubleSide; });
    p._M.push({ o, wb, inv: o.matrixWorld.clone().invert(), box: o.geometry.type === 'BoxGeometry' }); });
});
const coperto = (M, x, z) => {
  for (const m of M) { if (x < m.wb.min.x || x > m.wb.max.x || z < m.wb.min.z || z > m.wb.max.z) continue;
    const lb = m.o.geometry.boundingBox; let dentro = false;
    for (const y of [Y0, (Y0 + Y1) / 2, Y1]) { V.set(x, y, z).applyMatrix4(m.inv); if (V.x >= lb.min.x && V.x <= lb.max.x && V.y >= lb.min.y && V.y <= lb.max.y && V.z >= lb.min.z && V.z <= lb.max.z) { dentro = true; break; } }
    if (!dentro) continue; if (m.box) return true;
    ray.set(V.set(x, 200, z), DN); if (ray.intersectObject(m.o, false).length) return true; }
  return false;
};
const pzL = (p, wx, wy) => { const c = Math.cos(p.rot), s = Math.sin(p.rot), dx = wx - p.x, dy = wy - p.y; return [dx * c - dy * s, dx * s + dy * c]; };
const pzW = (p, lx, lz) => { const c = Math.cos(p.rot), s = Math.sin(p.rot); return [p.x + lx * c + lz * s, p.y - lx * s + lz * c]; };
const pzCellsW = (p, x0, x1, z0, z1, f) => { const C = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([a, b]) => pzW(p, a, b)), xs = C.map(c => c[0]), ys = C.map(c => c[1]);
  for (let ty = Math.max(0, Math.floor(Math.min(...ys) / TS)); ty <= Math.min(GH - 1, Math.floor(Math.max(...ys) / TS)); ty++)
    for (let tx = Math.max(0, Math.floor(Math.min(...xs) / TS)); tx <= Math.min(GW - 1, Math.floor(Math.max(...xs) / TS)); tx++) {
      const [lx, lz] = pzL(p, tx * TS + 1, ty * TS + 1); if (lx >= x0 && lx <= x1 && lz >= z0 && lz <= z1) f(ty * GW + tx, tx, ty, lx, lz); } };   // la stessa prova di pzCells

let nF = 0; const visti = new Set();
PZ.forEach(p => {
  if (solo && p.tipo !== solo) return;
  const R = p.imp.filter(r => r[0] === 'B'), vicini = PZ.filter(q => q === p || Math.hypot(q.x - p.x, q.y - p.y) < 60), F = [], O = [];
  R.forEach(([, x0, x1, z0, z1]) => pzCellsW(p, x0, x1, z0, z1, (i, tx, ty, lx, lz) => {
    if (visti.has(i) || W.grid[i] !== T.BLD || W.bIndex[i] >= 0) return;
    visti.add(i); let n = 0; for (const a of OFF) for (const b of OFF) {
      const x = tx * TS + a, z = ty * TS + b; let ok = false; for (const q of vicini) if (coperto(q._M, x, z)) { ok = true; break; } if (ok) n++; }
    if (n === 0) F.push([tx, ty, lx, lz]); else if (n < NP) O.push([tx, ty, n]); }));
  if (!F.length && !verbose) return;
  nF += F.length;
  const giro = a => a.length ? `${Math.min(...a)}-${Math.max(...a)}` : '';
  log(`${F.length ? '✗' : '✓'} ${p.tipo} «${p.nome || ''}» @${Math.round(p.x)},${Math.round(p.y)}: ${F.length} caselle fantasma` + (F.length ? ` (caselle ${giro(F.map(f => f[0]))} × ${giro(F.map(f => f[1]))}; locale x ${giro(F.map(f => +f[2].toFixed(1)))}, z ${giro(F.map(f => +f[3].toFixed(1)))})` : '') + `, ${O.length} d'orlo`);
  if (verbose && (F.length || O.length)) {   // la pianta delle caselle piene del pezzo: X fantasma, 0-9 i decimi coperti dell'orlo, # piena e coperta
    const tutte = F.map(f => [f[0], f[1], 'X']).concat(O.map(o => [o[0], o[1], String(Math.min(9, Math.floor(o[2] * 10 / NP)))])), K = new Map(tutte.map(t => [t[1] * GW + t[0], t[2]]));
    R.forEach(([, x0, x1, z0, z1]) => pzCellsW(p, x0, x1, z0, z1, (i, tx, ty) => { if (!K.has(i) && W.grid[i] === T.BLD && W.bIndex[i] < 0) K.set(i, '#'); }));
    const xs = [...K.keys()].map(i => i % GW), ys = [...K.keys()].map(i => (i / GW) | 0), ax = Math.min(...xs), bx = Math.max(...xs);
    log('          ' + Array.from({ length: bx - ax + 1 }, (_, k) => (ax + k) % 10).join(''));
    for (let ty = Math.min(...ys); ty <= Math.max(...ys); ty++) { let s = ''; for (let tx = ax; tx <= bx; tx++) s += K.get(ty * GW + tx) || '.'; log(`    ${String(ty).padStart(5)} ${s}`); } }
});
log(`\n${nF} caselle fantasma` + (solo ? ` (${solo})` : ` in ${PZ.length} pezzi`));
process.exit(nF ? 1 : 0);
