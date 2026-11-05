// [ritmo8] perché cast7 costa: per ogni mesh candidata, i triangoli provati e il tempo dei cinque raggi del braccio
const { avvia } = require('./lib.js'); const fs = require('fs'), path = require('path');
const L = JSON.parse(fs.readFileSync('/tmp/claude-0/-home-user/b7133111-ab7a-5dc5-8f88-7c780cd73e51/scratchpad/50motivi/camera/luoghi.json'));
(async () => {
  const H = await avvia({ q: process.argv[2] || '' }); const { pg, log } = H; const out = {};
  try {
    await pg.evaluate(() => { window.__R8.muto = true; const st = window.__pv.st; st.t = Math.floor(st.t / 1440) * 1440 + 15 * 60; });
    const posti = { spawn: L.spawn, vicolo: L.vic_pescatori.pts[10], piazza: L.piazza, lungomare: L.lungomare };
    for (const [nome, q] of Object.entries(posti)) {
      await pg.evaluate(q => { const pv = window.__pv, st = pv.st, p = st.player, G = pv.G, R = pv.R; let a = q; if (!G.walkM(q[0], q[1])) { outer: for (let r = .5; r < 8; r += .5) for (let k = 0; k < 6.28; k += .4) { const z = [q[0] + Math.cos(k) * r, q[1] + Math.sin(k) * r]; if (G.walkM(z[0], z[1])) { a = z; break outer; } } }
        p.x = a[0]; p.y = a[1]; p.path = []; R.snap(st); }, q);
      const g0 = await pg.evaluate(() => window.__pv.ui.time); for (let i = 0; i < 200; i++) { await pg.waitForTimeout(500); if (await pg.evaluate(g0 => window.__pv.ui.time - g0 > 4, g0)) break; }
      const r = await pg.evaluate(() => {
        const pv = window.__pv, R = pv.R, C = window.__CAM7, U = C.ultimo; if (!U) return { err: 'niente ultimo' };
        const K = Camera7.K, o = { x: U.look.x, y: U.look.y, z: U.look.z }, dx = U.pos.x - o.x, dy = U.pos.y - o.y, dz = U.pos.z - o.z, Ln = Math.hypot(dx, dy, dz), dir = { x: dx / Ln, y: dy / Ln, z: dz / Ln };
        // il conteggio dei triangoli
        const RI = THREE.Ray.prototype.intersectTriangle; let nT = 0; THREE.Ray.prototype.intersectTriangle = function () { nT++; return RI.apply(this, arguments); };
        let t0 = performance.now(); const h = R.cast7(o, dir, Ln, K.r); const msTot = performance.now() - t0, nTot = nT;
        // per mesh
        const cands = R.__bmb.bmbCands(o.x, o.z).filter(m => { if (m.userData.ghost5 || m.userData.velo || m.userData.vievive || m.isPoints || m.isLine) return false; const bs = m.geometry.boundingSphere, e = m.matrixWorld.elements; return !bs || bs.radius * Math.hypot(e[0], e[1], e[2]) >= 3.5; });
        const rc = new THREE.Raycaster(), D = new THREE.Vector3(dir.x, dir.y, dir.z), rl = Math.hypot(dir.z, dir.x) || 1, rx = dir.z / rl, rz = -dir.x / rl, ux = dir.y * rz, uy = dir.z * rx - dir.x * rz, uz = -dir.y * rx, r = K.r;
        const per = cands.map(m => { nT = 0; const a = performance.now(); let hits = 0;
          for (const [A, B] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { rc.set(new THREE.Vector3(o.x + (rx * A + ux * B) * r, o.y + uy * B * r, o.z + (rz * A + uz * B) * r), D); rc.near = 0; rc.far = Ln + r; const hh = []; m.raycast(rc, hh); hits += hh.length; }
          const g = m.geometry, bt = g.boundsTree; let foglie = 0, maxF = 0; if (bt && bt._roots) { try { bt.traverse((d, leaf, bb, off, cnt) => { if (leaf) { foglie++; if (cnt > maxF) maxF = cnt; } }); } catch (e) { } }
          return { ms: +(performance.now() - a).toFixed(2), tri: nT, hits, n: g.index ? g.index.count / 3 : g.attributes.position ? g.attributes.position.count / 3 : 0, bvh: !!bt, bvhNo: !!g.__bvhNo, tas: m.userData.tassello !== undefined, nome: m.name, ud: Object.keys(m.userData).slice(0, 6).join(','), r: g.boundingSphere ? +g.boundingSphere.radius.toFixed(1) : null, foglie, maxF, miss: g.__bvhMiss || 0, ras: m.raycast === THREE.Mesh.prototype.raycast ? 'proto' : (m.raycast.name || 'own') };
        }).sort((a, b) => b.tri - a.tri);
        THREE.Ray.prototype.intersectTriangle = RI;
        return { cast: h, msTot: +msTot.toFixed(1), triTot: nTot, Ln: +Ln.toFixed(2), nCand: cands.length, top: per.slice(0, 12), sumTri: per.reduce((a, b) => a + b.tri, 0) };
      });
      out[nome] = r; log(nome, JSON.stringify(r).slice(0, 2500));
    }
  } catch (e) { log('ERR', e.stack); }
  fs.writeFileSync(path.join(__dirname, 'sonda_cast_' + (process.argv[3] || 'a') + '.json'), JSON.stringify(out, null, 1));
  await H.close();
})();
