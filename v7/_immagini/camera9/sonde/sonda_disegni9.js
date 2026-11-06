// [camera9] DA DOVE VENGONO I DISEGNI IN PIÙ: negli stessi posti, oggi e camera9, ogni disegno (renderBufferDirect di three) con la distanza
// dell'oggetto dalla camera e il suo genere. node sonda_disegni9.js [query] [file] → ../disegni9.json
const path = require('path'), fs = require('fs');
const { avvia } = require('../../controlli8/sonde/lib.js'), { posa } = require('./passo9.js');
const OUT = path.resolve(__dirname, '..');
(async () => {
  const { pg, log, close } = await avvia({ query: process.argv[2] || 'leggera&tassellivecchi', vp: { width: 640, height: 360 } });
  const R = {};
  try {
    const POSTI = { vicolo: [[1343.49, 320.61], [1342.67, 324.79]], sbocco: [[1372.1, 296.5], [1373, 310.6]], piazza: [[1393, 297], [1372, 306]], lungomare: [[1415, 399], [1440, 399]] };
    for (const [nome, [at, verso]] of Object.entries(POSTI)) for (const [c9, lontano, nebbia] of [[false, 10, 1], [true, 0, 1], [true, 10, 1], [true, 10, .75], [true, 10, .6]]) {
      await posa(pg, { at, verso, c9, assesta: 1.5, foto: false, lontano, nebbia });
      const r = await pg.evaluate(([lontano, nebbia]) => { const pv = window.__pv, Rr = pv.R, rd = Rr.__models.renderer, cam = Rr.getCamera(), gl = rd.getContext();
        if (gl.__vero) for (const k in gl.__vero) gl[k] = gl.__vero[k];
        const k9 = Camera7.K9.lontano, n9 = Camera7.K9.nebbia; Camera7.K9.lontano = lontano; Camera7.K9.nebbia = nebbia;
        const rb = rd.renderBufferDirect, v = new THREE.Vector3(), B = {}, G = {}; let n = 0, tri = 0;
        rd.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
          if (camera === cam || (camera && camera.isPerspectiveCamera && camera.fov === cam.fov)) { const bs = geometry.boundingSphere; if (bs) v.copy(bs.center).applyMatrix4(object.matrixWorld); else object.getWorldPosition(v); let d = v.distanceTo(cam.position); if (bs) d = Math.max(0, d - bs.radius * object.matrixWorld.getMaxScaleOnAxis());
            const b = d < 30 ? '0-30' : d < 80 ? '30-80' : d < 150 ? '80-150' : '150+', ud = Object.keys(object.userData || {}).slice(0, 2).join('+'), g = (object.isInstancedMesh ? 'inst:' : object.isSkinnedMesh ? 'pers:' : '') + (material.type || '') + (ud ? '|' + ud : '') + (object.name ? '|' + object.name.slice(0, 18) : '');
            B[b] = (B[b] || 0) + 1; G[g] = (G[g] || 0) + 1; n++; }
          return rb.apply(this, arguments); };
        const ui = { zoom: .5, time: pv.ui.time + 1 / 30, stick: null, lead: null, tilt: 0, rot: 0, drag: 0, edge: 0, puntatore: false, reale: 1 / 30, mira: null };
        rd.info.autoReset = false; rd.info.reset(); pv.G.step(pv.st, 1 / 30, { x: 0, y: 0 }); Rr.frame(pv.st, 1 / 30, ui); tri = rd.info.render.triangles; const calls = rd.info.render.calls; rd.info.autoReset = true;
        rd.renderBufferDirect = rb; const ms = []; for (let i = 0; i < 5; i++) { ui.time += 1 / 30; const a = performance.now(); pv.G.step(pv.st, 1 / 30, { x: 0, y: 0 }); Rr.frame(pv.st, 1 / 30, ui); gl.finish(); ms.push(performance.now() - a); } ms.sort((a, b) => a - b);
        Camera7.K9.lontano = k9; Camera7.K9.nebbia = n9; if (gl.__vero) for (const k in gl.__vero) gl[k] = function () { };
        return { principali: n, tutti: calls, triangoli: tri, ms: +ms[2].toFixed(1), far: +cam.far.toFixed(0), nebbia: nebbia, perDistanza: B, generi: Object.entries(G).sort((a, b) => b[1] - a[1]).slice(0, 14) }; }, [lontano, nebbia]);
      R[`${nome}_${c9 ? 'c9' + (lontano ? '' : '_senzaTetto') + (nebbia !== 1 ? '_nebbia' + nebbia : '') : 'oggi'}`] = r; log(nome, c9, lontano, nebbia, JSON.stringify({ n: r.principali, tutti: r.tutti, tri: r.triangoli, ms: r.ms, far: r.far, B: r.perDistanza }));
    }
  } catch (e) { log('ERRORE', e.message, e.stack); }
  fs.writeFileSync(path.join(OUT, process.argv[3] || 'disegni9.json'), JSON.stringify(R, null, 1));
  await close();
})();
