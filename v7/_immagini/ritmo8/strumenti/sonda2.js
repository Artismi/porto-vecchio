// [ritmo8] sonda 2: le geometrie senza posizioni nelle liste dei raggi, i doppioni, lo stato del disegnatore dei graffiti, gli indici degeneri
const { avvia } = require('./lib.js'); const fs = require('fs'), path = require('path');
const L = JSON.parse(fs.readFileSync('/tmp/claude-0/-home-user/b7133111-ab7a-5dc5-8f88-7c780cd73e51/scratchpad/50motivi/camera/luoghi.json'));
(async () => {
  const H = await avvia({ q: process.argv[2] || '' }); const { pg, log } = H;
  try {
    await pg.evaluate(() => { window.__R8.muto = true; });
    const g0 = await pg.evaluate(() => window.__pv.ui.time); for (let i = 0; i < 200; i++) { await pg.waitForTimeout(500); if (await pg.evaluate(g0 => window.__pv.ui.time - g0 > 6, g0)) break; }
    const r = await pg.evaluate(() => {
      const pv = window.__pv, R = pv.R, sc = R.__models.scene, C = window.__CAM7, U = C.ultimo, o = U ? U.look : { x: pv.st.player.x, z: pv.st.player.y };
      const cands = R.__bmb.bmbCands(o.x, o.z); const ids = new Map(); cands.forEach(m => ids.set(m, (ids.get(m) || 0) + 1));
      const dup = [...ids].filter(([m, n]) => n > 1).length, geoDup = new Map(); cands.forEach(m => geoDup.set(m.geometry, (geoDup.get(m.geometry) || 0) + 1));
      const vuote = cands.filter(m => { const p = m.geometry.attributes.position; return p && p.array && p.array.length < 9; }).map(m => ({ nome: m.name, n: m.geometry.index ? m.geometry.index.count / 3 : 0, bvh: !!m.geometry.boundsTree, pf: !!m.geometry.attributes.position.__pf, q: !!m.geometry.attributes.position.__q }));
      // tutte le geometrie con indice spaziale: quelle degeneri (una foglia grande) e senza posizioni
      const deg = []; let nb = 0; sc.traverse(m => { const g = m.geometry; if (!g || !g.boundsTree) return; nb++; let fo = 0, mx = 0; try { g.boundsTree.traverse((d, leaf, bb, off, cnt) => { if (leaf) { fo++; if (cnt > mx) mx = cnt; } }); } catch (e) { }
        if (mx > 64) deg.push({ nome: m.name, ud: Object.keys(m.userData).slice(0, 5).join(','), n: g.index ? g.index.count / 3 : 0, fo, mx, len: g.attributes.position.array.length, vis: m.visible }); });
      const W = window.Writing, A = W && (W.ARTW || (W._ && W._.ARTW));
      return { nCand: cands.length, dupMesh: dup, geoCondivise: [...geoDup].filter(([g, n]) => n > 1).length, vuote, nBvh: nb, degeneri: deg.slice(0, 20), nDeg: deg.length,
        artw: A ? { ok: A.ok, morto: A.morto, q: A.q.length, wq: A.wq.length, fly: A.fly, lastOk: A.lastOk, seq: A.seq } : 'non esposto', hw: navigator.hardwareConcurrency };
    });
    log(JSON.stringify(r, null, 1));
    fs.writeFileSync(path.join(__dirname, 'sonda2.json'), JSON.stringify(r, null, 1));
  } catch (e) { log('ERR', e.stack); }
  await H.close();
})();
