// [fumetto2] chi è la forma gialla traslucida davanti al personaggio in cammino (contorno.js «cammina»): un raggio dalla camera, i primi colpi.
const { avvia, OUT } = require('./lib'); const { corsa } = require('./passo7'); const fs = require('fs'), path = require('path');
const L = JSON.parse(fs.readFileSync(path.join(OUT, 'luoghi.json'))); const pz = L.piazza;
(async () => {
  const H = await avvia({ vp: { width: 1920, height: 1080 }, query: 'tassellivecchi&stile=E' });
  await corsa(H.pg, { ora: 13, start: [pz[0] + 10, pz[1]], verso: [pz[0] - 10, pz[1]], foto: 0, segs: [{ sec: 3.2, percorso: [[pz[0] - 14, pz[1]]], mag: .5 }], varianti: ['E'], tempi: 1 });
  const r = await H.S(() => { const R = window.__pv.R, cam = R.getCamera(), sc = R.__models.scene, out = [];
    for (const [nx, ny] of [[.04, -.05], [.02, .02], [.05, -.1], [0, -.05]]) { const rc = new THREE.Raycaster(); rc.setFromCamera(new THREE.Vector2(nx, ny), cam);
      const hits = rc.intersectObjects(sc.children, true).slice(0, 4).map(h => { const o = h.object, m = [].concat(o.material)[0] || {}; const par = []; for (let p = o.parent; p && par.length < 4; p = p.parent) par.push((p.name || p.type) + (p.userData && Object.keys(p.userData).length ? '{' + Object.keys(p.userData).slice(0, 4).join(',') + '}' : ''));
        return { d: +h.distance.toFixed(2), nome: o.name, tipo: o.type, mat: m.type, col: m.color ? '#' + m.color.getHexString() : null, tr: m.transparent, op: m.opacity, dw: m.depthWrite, bl: m.blending, ud: Object.keys(o.userData).slice(0, 6), par }; });
      out.push({ ndc: [nx, ny], hits }); }
    return out; });
  console.log('RIS ' + JSON.stringify(r)); await H.close();
})().catch(e => { console.log('ERR', e.message); process.exit(1); });
