// [lontano9] OGNI DISEGNO DELLA VISTA con camera9 (lontano9 in misura: prova tutto, non taglia niente): il genere, il raggio, la distanza
// (bordo della sfera), i triangoli, e cosa direbbe lontano9 (occ: nascosto dalle case, pic: piccolo lontano). Per scegliere le soglie.
//   node sonda_analisi9.js [query] [uscita.json] [posti: 0,3,4,5]
const path = require('path'), fs = require('fs');
const { avvia } = require('../../controlli8/sonde/lib.js'), { posa } = require('../../camera9/sonde/passo9.js');
const Q = process.argv[2] || 'leggera&tassellivecchi', OUTF = process.argv[3] || '/tmp/claude-0/-home-user/b7133111-ab7a-5dc5-8f88-7c780cd73e51/scratchpad/lontano9/analisi.json';
const SOLO = (process.argv[4] || '0,3,4,5').split(',').map(Number);
const POSTI = { 0: [[1343.49, 320.61], [1342.67, 324.79]], 1: [[1414, 367], [1414, 380]], 2: [[1375, 304], [1393, 302]], 3: [[1372.1, 296.5], [1373, 310.6]], 4: [[1415, 399], [1441, 399]], 5: [[1288.84, 342.9], [1288.84, 347.4]], 9: [[1388, 360], [1396, 360]] };
(async () => {
  const { pg, log, close } = await avvia({ query: Q, vp: { width: 800, height: 450 } });
  const R = {};
  try {
    for (const ip of SOLO) { const [at, verso] = POSTI[ip];
      await pg.evaluate(() => { Lontano9.attivo = true; Lontano9.MIS.on = true; });
      await posa(pg, { at, verso, c9: true, assesta: 2.5, foto: false });
      // i tasselli chiesti dalla vista arrivano (come in sonda_lontano9.js)
      let fermo = 0, prima = -1; for (let k = 0; k < 120 && fermo < 7; k++) { const t = await pg.evaluate(() => { const pv = window.__pv, Rr = pv.R, DT = 1 / 30, ui = { zoom: .5, time: pv.ui.time, stick: null, lead: null, tilt: 0, rot: 0, drag: 0, edge: 0, puntatore: false, reale: DT, mira: null };
          for (let i = 0; i < 3; i++) { ui.time += DT; pv.ui.time = ui.time; pv.G.step(pv.st, DT, { x: 0, y: 0 }); Rr.frame(pv.st, DT, ui); } const T = window.__tasselli; return T && T.on ? { v: (T.inVolo || 0) + (T.inApertura || 0), m: T.mesh } : { v: 0, m: 0 }; });
        if (t.v === 0 && t.m === prima) fermo++; else fermo = 0; prima = t.m; await pg.waitForTimeout(150); }
      R['p' + ip] = await pg.evaluate(() => { const pv = window.__pv, Rr = pv.R, rd = Rr.__models.renderer, cam = Rr.getCamera(), gl = rd.getContext(), DT = 1 / 30;
        if (gl.__vero) for (const k in gl.__vero) gl[k] = gl.__vero[k];
        const ui = { zoom: .5, time: pv.ui.time + DT, stick: null, lead: null, tilt: 0, rot: 0, drag: 0, edge: 0, puntatore: false, reale: DT, mira: null };
        const L = [], v = new THREE.Vector3(), rb = rd.renderBufferDirect;
        rd.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
          if (camera === cam) { const bs = geometry.boundingSphere; let r = 0; if (bs) { v.copy(bs.center).applyMatrix4(object.matrixWorld); r = bs.radius * object.matrixWorld.getMaxScaleOnAxis(); } else object.getWorldPosition(v);
            const u = object.userData || {}, k = u.fusione1 ? 'fusione1' : u.statico1 ? 'statico1' : u.tassello !== undefined ? 'tassello' : object.isInstancedMesh ? 'inst' : object.isSkinnedMesh ? 'pers' : object.isSprite ? 'sprite' : u.keep ? 'keep' : 'altro';
            const tri = geometry.index ? geometry.index.count / 3 : geometry.attributes.position ? geometry.attributes.position.count / 3 : 0;
            const pp = Lontano9.perche(object); let dd = Math.max(0, v.distanceTo(cam.position) - r); if (pp && typeof pp === 'object') { r = pp.r; dd = pp.d; }
            L.push([k, material.type.replace(/Mesh|Material/g, ''), +r.toFixed(2), +Math.max(0, dd).toFixed(1), Math.round(tri * (object.isInstancedMesh ? object.count : 1)), object.__l9w === undefined ? '-' : object.__l9w, !!material.transparent, (object.name || (object.parent && object.parent.name ? '^' + object.parent.name : '')).slice(0, 16), Object.keys(u).slice(0, 3).join('+'), pp && typeof pp === 'object' ? pp.taglio : -1, pp && typeof pp === 'object' ? pp.dScatola : null, u.tassello !== undefined ? u.tassello : null]); }
          return rb.apply(this, arguments); };
        pv.G.step(pv.st, DT, { x: 0, y: 0 }); Rr.frame(pv.st, DT, ui); rd.renderBufferDirect = rb;
        if (gl.__vero) for (const k in gl.__vero) gl[k] = function () { };
        return L; });
      log('posto', ip, R['p' + ip].length);
    }
    await pg.evaluate(() => { Lontano9.MIS.on = false; });
  } catch (e) { log('ERRORE', e.message, e.stack); }
  fs.writeFileSync(OUTF, JSON.stringify(R)); log('FINE'); await close();
})();
