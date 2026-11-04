// [camera7] il telefono in verticale (tocco, 300x534): vecchio e nuovo, vicolo e lungomare
const { avvia, provino, OUT } = require('./lib'); const { corsa } = require('./passo7'); const fs = require('fs'), path = require('path');
(async () => { const F = [], R = {};
  for (const modo of ['vecchio', 'nuovo']) {
    const H = await avvia({ vp: { width: 300, height: 534 }, touch: true, query: (modo === 'vecchio' ? 'nofixcamera7&' : '') + 'tassellivecchi' }); const log = H.log;
    const L = JSON.parse(fs.readFileSync(OUT + '/luoghi.json')); const V = L.vic_pescatori.pts, lm = L.lungomare;
    try { R[modo] = await H.pg.evaluate(() => { const c = window.__pv.R.getCamera(); return { fov: c.fov, aspect: c.aspect, hfov: 2 * Math.atan(Math.tan(c.fov * Math.PI / 360) * c.aspect) * 180 / Math.PI }; });
      for (const [posto, piano] of [['vicolo', { start: V[2], verso: V[5], foto: 2, segs: [{ sec: 2.01, percorso: V, mag: .5 }] }], ['lungomare', { start: [lm[0] - 15, lm[1]], verso: [lm[0], lm[1]], foto: 2, segs: [{ sec: 2.01, percorso: [[lm[0] + 25, lm[1]]], mag: .5 }] }]]) {
        const r = await corsa(H.pg, piano); const s = r.log.at(-1);
        r.fotos.forEach(([t, url, q], i) => { const f = path.join(OUT, 'f', `tel_${modo}_${posto}_${i}.jpg`); fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64')); F.push([f, `${modo} ${posto} ${t}s ${q.pitch}° fov${q.fov} av${q.davanti}`]); });
        R[modo + '_' + posto] = { fov: s.fov, pitch: s.pitch, davanti: s.davanti, hfov: await H.pg.evaluate(() => { const c = window.__pv.R.getCamera(); return 2 * Math.atan(Math.tan(c.fov * Math.PI / 360) * c.aspect) * 180 / Math.PI; }) }; log(modo, posto, JSON.stringify(R[modo + '_' + posto])); } }
    catch (e) { log('ERR', e.stack); }
    await H.close(); }
  fs.writeFileSync(path.join(OUT, 'telefono7.json'), JSON.stringify(R, null, 1));
  provino(F, path.join(OUT, 'telefono7.jpg'), '[camera7] telefono in verticale: sopra la camera di prima, sotto la vista unica', 4, 225, 400);
})();
