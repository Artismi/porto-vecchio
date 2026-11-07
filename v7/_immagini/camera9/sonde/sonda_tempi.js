// [camera9] quanto costa ogni pezzo della sonda (per non far morire la pagina): node sonda_tempi.js
const { avvia } = require('../../controlli8/sonde/lib.js'), { corsa } = require('./passo9.js');
(async () => {
  const { pg, log, close } = await avvia({ query: 'leggera&tassellivecchi', vp: { width: 640, height: 360 } });
  const mem = () => pg.evaluate(() => Math.round(performance.memory.usedJSHeapSize / 1e6));
  try {
    const P = [[1346, 305.93], [1345.07, 310.63], [1344.19, 316.42]];
    for (const [nome, o] of [['nudo', { foto: 0, ogniSfondo: 99 }], ['sfondo', { foto: 0, ogniSfondo: .5 }], ['foto', { foto: 1, ogniSfondo: 99 }], ['c9', { foto: 0, ogniSfondo: 99, c9: true }]]) {
      const t0 = Date.now(); const r = await corsa(pg, Object.assign({ start: P[0], verso: P[2], dt: 1 / 15, segs: [{ sec: 2, percorso: P }] }, o));
      log(nome, ((Date.now() - t0) / 1000).toFixed(1) + 's', r.log.length + ' fot', 'heap', await mem(), JSON.stringify(r.log.at(-1)));
    }
  } catch (e) { log('ERRORE', e.message); }
  await close();
})();
