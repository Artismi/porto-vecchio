// [fumetto2] i ms della scheda video, A contro E, nel gioco vero (render.js gpuTiming: EXT_disjoint_timer_query_webgl2).
//   Q='leggera&tassellivecchi&stile=E' node gpums.js      senza l'estensione (swiftshader): lo dice e misura i ms per fotogramma con gl.finish
const { avvia } = require('./lib');
const Q = process.env.Q || 'leggera&tassellivecchi&stile=E';
(async () => {
  const H = await avvia({ vp: { width: +(process.env.W || 960), height: +(process.env.H || 540) }, query: Q }); await H.gioca(3);
  const ext = await H.S(() => !!(window.__pv.R.gpuTiming && window.__pv.R.gpuTiming(true))); H.log('timer_query', ext);
  const out = {};
  for (const v of ['A', 'E', 'A', 'E']) {
    await H.S(v => window.__pv.R.stile && window.__pv.R.stile(v), v); await H.pg.waitForTimeout(3000);
    const r = await H.S(async () => { const R = window.__pv.R, g = R.gpuTimes, gl = R.__models.renderer.getContext(), st = window.__pv.st, ui = window.__pv.ui;
      const t0 = performance.now(); for (let i = 0; i < 6; i++) { R.frame(st, 1e-3, ui); } gl.finish(); const fin = (performance.now() - t0) / 6;
      return { gpu: g && g.ok ? JSON.parse(JSON.stringify(g.ms)) : null, finishMs: +fin.toFixed(1) }; });
    (out[v] = out[v] || []).push(r); H.log(v, JSON.stringify(r));
  }
  console.log('RIS ' + JSON.stringify({ ext, out })); await H.close();
})().catch(e => { console.log('ERR', e.message); process.exit(1); });
