// [camera9] DOVE VA IL TEMPO DEL PROCESSORE allo sbocco dei Lanternini (dove camera9 fa i fotogrammi più lenti): il profilo di 20
// fotogrammi a passi (G.step + R.frame, i disegni spenti come nelle sonde), oggi e camera9. node sonda_cpu9.js → ../cpu9.json
const path = require('path'), fs = require('fs');
const { avvia } = require('../../controlli8/sonde/lib.js'), { posa } = require('./passo9.js');
const OUT = path.resolve(__dirname, '..');
(async () => {
  const { pg, log, close } = await avvia({ query: process.argv[2] || 'leggera&tassellivecchi', vp: { width: 640, height: 360 } });
  const cdp = await pg.context().newCDPSession(pg); await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
  const R = {};
  try {
    for (const [nome, at, verso] of [['sbocco', [1376.1, 308.7], [1390, 300]], ['lungomare', [1415, 399], [1440, 399]]]) for (const c9 of [false, true]) {
      await posa(pg, { at, verso, c9, assesta: 1, foto: false });
      await cdp.send('Profiler.start');
      const ms = await pg.evaluate(() => { const pv = window.__pv, Rr = pv.R, ui = { zoom: .5, time: pv.ui.time, stick: null, lead: null, tilt: 0, rot: 0, drag: 0, edge: 0, puntatore: false, reale: 1 / 15, mira: null }, t = [];
        for (let i = 0; i < 20; i++) { ui.time += 1 / 15; const a = performance.now(); pv.G.step(pv.st, 1 / 15, { x: 0, y: 0 }); Rr.frame(pv.st, 1 / 15, ui); t.push(performance.now() - a); } t.sort((a, b) => a - b); return { med: +t[10].toFixed(1), max: +t[19].toFixed(1) }; });
      const { profile } = await cdp.send('Profiler.stop');
      const self = {}, byId = new Map(profile.nodes.map(n => [n.id, n])), dt = {}; for (let i = 0; i < profile.samples.length; i++) dt[profile.samples[i]] = (dt[profile.samples[i]] || 0) + (profile.timeDeltas[i] || 0);
      for (const n of profile.nodes) { const f = n.callFrame, k = `${f.functionName || '(anon)'}:${f.lineNumber}`; self[k] = (self[k] || 0) + (dt[n.id] || 0) / 1000; }
      // il tempo totale (con i figli) di alcune funzioni note
      const tot = {}; const figli = n => (dt[n.id] || 0) / 1000 + (n.children || []).reduce((s, c) => s + figli(byId.get(c)), 0);
      for (const n of profile.nodes) { const f = n.callFrame.functionName; if (/^(camera7Frame|passo9|passo|cast7|cast7v|cose7|updateChunks|anelliTick1|render|projectObject|frame|step|posaTick1|vis3Tick|vis4Sagome|sguPasso|ombre1)$/.test(f)) tot[f] = (tot[f] || 0) + figli(n); }
      R[`${nome}_${c9 ? 'c9' : 'oggi'}`] = { ms, self: Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 18).map(([k, v]) => [k, +v.toFixed(1)]), totale: Object.fromEntries(Object.entries(tot).map(([k, v]) => [k, +v.toFixed(1)])) };
      log(nome, c9, JSON.stringify(ms), JSON.stringify(R[`${nome}_${c9 ? 'c9' : 'oggi'}`].totale));
    }
  } catch (e) { log('ERRORE', e.message, e.stack); }
  fs.writeFileSync(path.join(OUT, 'cpu9.json'), JSON.stringify(R, null, 1));
  await close();
})();
