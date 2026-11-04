// [stile] chi c'è sotto un punto dello schermo: materiale, tipo, mappa, programma (per sapere dove agire)
const { avvia, OUT } = require('./lib'); const { corsa } = require('./passo7'); const fs = require('fs'), path = require('path');
const VP = { width: 960, height: 540 };
(async () => {
  const H = await avvia({ vp: VP, query: 'leggera&tassellivecchi&stile=A' });
  const L = JSON.parse(fs.readFileSync(path.join(OUT, 'luoghi.json'))); const V = L.vic_pescatori.pts;
  await corsa(H.pg, { ora: 11, start: V[0], verso: V[3], foto: 0, segs: [{ sec: 5, percorso: V, mag: .5 }, { sec: .6 }], varianti: [null] });
  const out = await H.pg.evaluate(() => { const R = window.__pv.R, cam = R.getCamera(), sc = R.__models.scene, rd = R.__models.renderer, res = [];
    const pts = [[.12, .3], [.2, .7], [.85, .3], [.75, .6], [.95, .9], [.5, .8], [.62, .1], [.4, .3], [.66, .45]];
    for (const [u, v] of pts) { const rc = new THREE.Raycaster(); rc.setFromCamera(new THREE.Vector2(u * 2 - 1, 1 - v * 2), cam); const hs = [];
      sc.traverseVisible(o => { if (o.isMesh) try { rc.intersectObject(o, false, hs); } catch (e) { } }); hs.sort((a, b) => a.distance - b.distance); const okm = q => { const m = Array.isArray(q.object.material) ? q.object.material[q.face ? q.face.materialIndex : 0] : q.object.material; return m && /^Mesh/.test(m.type) && m.visible !== false && m.colorWrite !== false && !m.transparent; }; const h = hs.find(okm); if (!h) { res.push({ u, v, none: 1 }); continue; }
      const m = Array.isArray(h.object.material) ? h.object.material[h.face ? h.face.materialIndex : 0] : h.object.material;
      const pr = rd.properties.get(m), pg = pr && pr.currentProgram; let fsrc = ''; try { fsrc = pg ? rd.getContext().getShaderSource(pg.fragmentShader) || '' : ''; } catch (e) { }
      res.push({ u, v, d: +h.distance.toFixed(1), obj: h.object.name, otype: h.object.type, inst: !!h.object.isInstancedMesh, mt: m.type, mname: m.name, ud: JSON.stringify(m.userData).slice(0, 120), map: m.map ? [m.map.image && m.map.image.width, m.map.image && m.map.image.height, m.map.repeat.x.toFixed(2), m.map.repeat.y.toFixed(2), m.map.magFilter, m.map.minFilter] : null, key: m.customProgramCacheKey ? String(m.customProgramCacheKey()).slice(0, 50) : '', vc: !!m.vertexColors, p10: fsrc.indexOf('sgP10') >= 0, tv: fsrc.indexOf('vTvP') >= 0, n: (fsrc.match(/sgN3\(/g) || []).length, len: fsrc.length, defs: JSON.stringify(m.defines || {}).slice(0, 80), y: +h.point.y.toFixed(1), nrm: h.face ? [h.face.normal.x, h.face.normal.y, h.face.normal.z].map(x => +x.toFixed(2)) : null }); }
    return res; });
  out.forEach(o => console.log(JSON.stringify(o)));
  await H.close();
})();
