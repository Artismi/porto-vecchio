// [fumetto2] la prova di fumo di ?stile=E: lo stile per i moduli, i pezzi segnati per la rifinitura (userData.rc), la luce dei muri di E, gli errori.
//   Q='tassellivecchi&stile=E' node smoke_e.js
const { avvia } = require('./lib');
const Q = process.env.Q || 'tassellivecchi&stile=E';
(async () => {
  const errs = []; const t00 = Date.now(); const H = await avvia({ vp: { width: 960, height: 540 }, query: Q });
  H.pg.on('pageerror', e => errs.push(e.message.slice(0, 160))); H.pg.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text().slice(0, 160)); });
  await H.gioca(2);
  const r = await H.S(() => { const R = window.__pv.R, sc = R.__models && R.__models.scene || null, cnt = {}; let n = 0;
    const root = sc || (R.getCamera() && R.getCamera().parent); const seen = new Set();
    const visit = o => { if (!o || seen.has(o)) return; seen.add(o); if (o.isMesh) { n++; const k = o.userData.rc || ([].concat(o.material)[0] || {}).userData && ([].concat(o.material)[0]).userData.rc; if (k) cnt[k] = (cnt[k] || 0) + 1; } (o.children || []).forEach(visit); };
    visit(root); const S = window.__STILE, E = S && S.V && S.V.E;
    const rd = R.__models.renderer, st = window.__pv.st, ui = window.__pv.ui; R.frame(st, 1e-3, ui); const calls = rd.info.render.calls, tri = rd.info.render.triangles;
    return { calls, tri, PV_STILE: window.PV_STILE, stile: S && S.v, e: S && S.e, scena: !!root, mesh: n, rc: cnt, Edir: E && E.DIR, EmuriK: E && E.PFD && E.PFD.muriK, eDst: true }; });
  console.log('RIS ' + JSON.stringify(r) + ' carico_s ' + ((Date.now() - t00) / 1000).toFixed(0)); console.log('ERRORI ' + JSON.stringify(errs.slice(0, 8))); await H.close();
})().catch(e => { console.log('ERR', e.message); process.exit(1); });
