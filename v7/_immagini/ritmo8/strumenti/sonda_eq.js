// [ritmo8] uguaglianza: cast7 (memo + primo colpo per mesh + rayTas col primo colpo) contro l'algoritmo di prima, raggio per raggio
const { avvia } = require('./lib.js'); const fs = require('fs'), path = require('path');
const L = JSON.parse(fs.readFileSync('/tmp/claude-0/-home-user/b7133111-ab7a-5dc5-8f88-7c780cd73e51/scratchpad/50motivi/camera/luoghi.json'));
(async () => {
  const H = await avvia({ q: process.argv[2] || '' }); const { pg, log } = H; const RIS = [];
  try {
    await pg.evaluate(() => { window.__R8.muto = true; });
    const V = L.vic_pescatori.pts, posti = [L.spawn, V[2], V[10], V[18], L.piazza, [L.piazza[0] + 8, L.piazza[1] + 5], L.lungomare, [L.lungomare[0] + 20, L.lungomare[1]]];
    for (const q of posti) {
      await pg.evaluate(q => { const pv = window.__pv, st = pv.st, p = st.player, G = pv.G, R = pv.R; let a = q; if (!G.walkM(q[0], q[1])) { outer: for (let r = .5; r < 8; r += .5) for (let k = 0; k < 6.28; k += .4) { const z = [q[0] + Math.cos(k) * r, q[1] + Math.sin(k) * r]; if (G.walkM(z[0], z[1])) { a = z; break outer; } } }
        p.x = a[0]; p.y = a[1]; p.path = []; R.snap(st); window.PV_ATTESA.on = () => false; }, q);
      const g0 = await pg.evaluate(() => window.__pv.ui.time); for (let i = 0; i < 200; i++) { await pg.waitForTimeout(400); if (await pg.evaluate(g0 => window.__pv.ui.time - g0 > 2.5, g0)) break; }
      await pg.evaluate(() => { window.PV_ATTESA.on = () => true; }); await pg.waitForTimeout(400);
      const r = await pg.evaluate(() => {
        const pv = window.__pv, R = pv.R, C = window.__CAM7, U = C.ultimo, K = Camera7.K; if (!U) return { err: 'niente' };
        const BM = R.__bmb, piccola = null; // la stessa lista di cast7 (il filtro di render.js)
        const lista = () => BM.bmbCands(U.look.x, U.look.z).filter(m => { if (m.userData.ghost5 || m.userData.velo || m.userData.vievive || m.isPoints || m.isLine) return false; const bs = m.geometry.boundingSphere, e = m.matrixWorld.elements; return !bs || bs.radius * Math.hypot(e[0], e[1], e[2]) >= 3.5; });
        const out = { n: 0, uguali: 0, diversi: [], msNuovo: 0, msVecchio: 0 };
        const rc = new THREE.Raycaster();
        const vecchio = (o, dir, len, r, Lst) => {   // l'algoritmo di prima, senza piccola7 (vedi sotto: lo si confronta sui colpi, con la stessa funzione)
          const D = new THREE.Vector3(dir.x, dir.y, dir.z), rl = Math.hypot(dir.z, dir.x) || 1, rx = dir.z / rl, rz = -dir.x / rl, ux = dir.y * rz, uy = dir.z * rx - dir.x * rz, uz = -dir.y * rx; let best = Infinity;
          for (const [a, b] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { rc.set(new THREE.Vector3(o.x + (rx * a + ux * b) * r, o.y + uy * b * r, o.z + (rz * a + uz * b) * r), D); rc.near = 0; rc.far = Math.min(best, len + r); rc.firstHitOnly = false;
            for (const h of rc.intersectObjects(Lst, false)) { if (!h.face) continue; let m = h.object.material; if (Array.isArray(m)) m = m[h.face.materialIndex];
              if (!m || m.visible === false || (m.transparent && (m.opacity < .3 || m.depthWrite === false)) || window.__piccola7(h.point)) continue; const t = a || b ? h.distance : h.distance - r; if (t < best) best = t; } }
          return best === Infinity ? null : Math.max(0, best); };
        const Lst = lista();
        for (let i = 0; i < 40; i++) {
          const pp = K.pitch + (i % 8) * .09 - .1, yaw = U.yaw + (Math.floor(i / 8) - 2) * .35, len = 3 + (i % 5) * 2.2, o = { x: U.look.x, y: U.look.y, z: U.look.z };
          const dir = { x: Math.sin(yaw) * Math.cos(pp), y: Math.sin(pp), z: Math.cos(yaw) * Math.cos(pp) };
          let a = performance.now(); const vN = R.cast7(o, dir, len, K.r); out.msNuovo += performance.now() - a;
          a = performance.now(); const vV = vecchio(o, dir, len, K.r, Lst); out.msVecchio += performance.now() - a;
          out.n++; if (vN === vV || (vN !== null && vV !== null && Math.abs(vN - vV) < 1e-9)) out.uguali++; else out.diversi.push([vN, vV, len]);
        }
        { const RI = THREE.Ray.prototype.intersectTriangle; let nT = 0; THREE.Ray.prototype.intersectTriangle = function () { nT++; return RI.apply(this, arguments); };
          const giro = nuovo => { nT = 0; for (let i = 0; i < 40; i++) { const pp = K.pitch + (i % 8) * .09 - .1, yaw = U.yaw + (Math.floor(i / 8) - 2) * .35, len = 3 + (i % 5) * 2.2 + (nuovo ? 3e-7 : 0), o = { x: U.look.x, y: U.look.y, z: U.look.z }, d = { x: Math.sin(yaw) * Math.cos(pp), y: Math.sin(pp), z: Math.cos(yaw) * Math.cos(pp) };
            if (nuovo) R.cast7(o, d, len, K.r); else vecchio(o, d, len, K.r, Lst); } return nT; };
          out.triNuovo = giro(true); out.triVecchio = giro(false); THREE.Ray.prototype.intersectTriangle = RI; }
        out.nLista = Lst.length; out.msNuovo = +out.msNuovo.toFixed(1); out.msVecchio = +out.msVecchio.toFixed(1); return out;
      });
      RIS.push(r); log(JSON.stringify(q), JSON.stringify(r).slice(0, 600));
    }
  } catch (e) { log('ERR', e.stack); }
  fs.writeFileSync(path.join(__dirname, 'sonda_eq.json'), JSON.stringify(RIS, null, 1));
  await H.close();
})();
