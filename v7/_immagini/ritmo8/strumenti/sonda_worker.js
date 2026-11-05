// [ritmo8] il disegnatore dei graffiti a parte (worker): perché non risponde
const { avvia } = require('./lib.js');
(async () => {
  const H = await avvia({ q: process.argv[2] || '' }); const { pg, log } = H;
  try {
    await pg.evaluate(() => { window.__R8.muto = true; });
    log('stato', JSON.stringify(await pg.evaluate(() => { const A = Writing.ARTW || Writing._.ARTW; return A ? { ok: A.ok, seq: A.seq, morto: A.morto, lastOk: A.lastOk, t0: A.t0, fly: A.fly, volo: A.volo && A.volo.size } : null; })));
    await pg.evaluate(p => { window.__patch = p; }, !!process.argv[3]);
    const r = await pg.evaluate(async () => {
      const src = document.getElementById('pv-artworker'); if (!src) return 'niente pv-artworker';
      const ARTW_MAIN = `self.addEventListener('unhandledrejection', e => postMessage({ id: -1, err: 'REJ ' + String(e.reason && (e.reason.stack || e.reason.message) || e.reason) }));
onmessage = async e => { const m = e.data; const t0 = performance.now(); postMessage({ id: -2, err: 'ricevuto ' + Object.keys(m).join(',') });
  if (m.fonts) self.GraffitiFonts = { D: m.fonts }; if (m.rec) WriterMano.setRecorded(m.rec); if (!m.w) return; let A;
  try { const f = await WriterArte.fontsReady(); postMessage({ id: -2, err: 'font ' + f + ' ' + (performance.now() - t0).toFixed(0) + ' ms' }); } catch (er) { postMessage({ id: -2, err: 'font err ' + er }); }
  try { A = typeof Pennelli !== 'undefined' ? Pennelli.art(m.w) : WriterArte.art(m.w); } catch (err) { postMessage({ id: m.id, err: 'ART ' + String(err && err.stack || err) }); return; }
  postMessage({ id: m.id, ok: true, ms: performance.now() - t0, n: A.stages.length }); };`;
      const PATCH = "{ const g0 = OffscreenCanvas.prototype.getContext; OffscreenCanvas.prototype.getContext = function (k, o) { return g0.call(this, k, k === '2d' ? Object.assign({ willReadFrequently: true }, o) : o); }; }\n";
      const code = (window.__patch ? PATCH : '') + 'const document = { createElement: () => new OffscreenCanvas(1, 1) };\n' + src.textContent + '\n' + ARTW_MAIN;
      const msgs = []; let w;
      try { w = new Worker(URL.createObjectURL(new Blob([code], { type: 'text/javascript' }))); } catch (e) { return 'new Worker: ' + e.message; }
      w.onmessage = e => msgs.push(e.data); w.onerror = e => msgs.push({ onerror: e.message, line: e.lineno });
      if (typeof GraffitiFonts !== 'undefined') w.postMessage({ fonts: GraffitiFonts.D });
      const W0 = Writing.S(window.__pv.st).works.find(x => !x.erased) || {}; const wj = {}; for (const k in W0) { const v = W0[k]; if (v === null || ['string', 'number', 'boolean'].includes(typeof v) || (typeof v === 'object' && JSON.stringify(v).length < 2000)) wj[k] = v; }
      w.postMessage({ id: 7, w: wj });
      const t0 = performance.now(); while (performance.now() - t0 < 90000 && !msgs.some(m => m.id === 7 || m.onerror)) await new Promise(r => setTimeout(r, 200));
      w.terminate(); const tm = performance.now(); try { Pennelli.art(wj); } catch (e) { } const mainMs = performance.now() - tm; return { mainMs, msgs, ms: performance.now() - t0, gf: typeof GraffitiFonts, chiavi: Object.keys(wj).join(',') };
    });
    log(JSON.stringify(r, null, 1).slice(0, 4000));
  } catch (e) { log('ERR', e.stack); }
  await H.close();
})();
