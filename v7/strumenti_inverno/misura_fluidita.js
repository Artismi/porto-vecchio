// Misura dove va il tempo di ogni fotogramma: node strumenti_inverno/misura_fluidita.js [luogo] [secondi] [radice]
// Tempo per ciclo requestAnimationFrame (per nome della funzione), logica (G.step) e disegno (R.frame),
// chiamate di disegno, triangoli, luci vere della scena. Chromium senza testa con SwiftShader: i tempi assoluti
// sono lenti, contano i rapporti e il confronto fra due versioni.
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const [luogo = 'piazza', secs = '8', root0] = process.argv.slice(2);
const root = path.resolve(root0 || path.join(__dirname, '..'));
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 1280, height: 800 } });
  pg.on('pageerror', e => console.log('[errore]', e.message));
  await pg.addInitScript(() => {
    const T = window.__mis = { raf: {}, on: false };
    const raf0 = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = fn => raf0(t => { if (!T.on) return fn(t); const a = performance.now(); try { fn(t); } finally { const k = fn.name || 'anonima', r = T.raf[k] || (T.raf[k] = { n: 0, ms: 0, max: 0 }), d = performance.now() - a; r.n++; r.ms += d; r.max = Math.max(r.max, d); } });
  });
  await pg.goto(`http://localhost:${port}/index.html`);
  await pg.waitForFunction(() => window.__pv && window.__pv.st, null, { timeout: 300000 });
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(1500);
  await pg.evaluate(() => setInterval(() => { const u = window.__pv.ui; u.flash = 0; u.fade = 0; u.desat = false; }, 50));
  await pg.evaluate(l => { const pv = window.__pv, st = pv.st, P = pv.G.PLACES && pv.G.PLACES[l]; if (P) { st.player.x = P.x; st.player.y = P.y; } st.t = Math.floor(st.t / 1440) * 1440 + 780; pv.ui.dialog = null; pv.ui.menu = false; pv.ui.book = false; }, luogo);
  await pg.waitForTimeout(4000);
  const res = await pg.evaluate(async secs => {
    const pv = window.__pv, T = window.__mis, R = pv.R, G = pv.G, M = { step: { n: 0, ms: 0 }, frame: { n: 0, ms: 0 } };
    const wrap = (o, k, m) => { const f = o[k]; if (typeof f !== 'function') return () => {}; o[k] = function () { const a = performance.now(); try { return f.apply(this, arguments); } finally { m.n++; m.ms += performance.now() - a; } }; return () => { o[k] = f; }; };
    const u1 = wrap(G, 'step', M.step), u2 = wrap(R, 'frame', M.frame);
    T.raf = {}; T.on = true; const t0 = performance.now();
    await new Promise(r => setTimeout(r, secs * 1000));
    T.on = false; u1(); u2(); const el = performance.now() - t0;
    const rd = R.__models && R.__models.renderer, sc = R.__models && R.__models.scene, info = rd ? rd.info : null;
    let lights = 0, shadowL = 0, meshes = 0, vis = 0, cast = 0; if (sc) sc.traverse(o => { if (o.isLight && !o.isAmbientLight && !o.isHemisphereLight) { lights++; if (o.castShadow) shadowL++; } if (o.isMesh || o.isInstancedMesh) { meshes++; let v = true, q = o; while (q) { if (!q.visible) { v = false; break; } q = q.parent; } if (v) { vis++; if (o.castShadow) cast++; } } });
    const raf = Object.entries(T.raf).map(([k, v]) => ({ ciclo: k, chiamate: v.n, ms_medio: +(v.ms / v.n).toFixed(2), ms_max: +v.max.toFixed(1), quota: +(v.ms / el * 100).toFixed(1) + '%' })).sort((a, b) => parseFloat(b.quota) - parseFloat(a.quota));
    return { secondi: +(el / 1000).toFixed(1), fps: +(M.frame.n / (el / 1000)).toFixed(1), logica_ms: +(M.step.ms / Math.max(1, M.step.n)).toFixed(2), logica_chiamate: M.step.n, disegno_ms: +(M.frame.ms / Math.max(1, M.frame.n)).toFixed(2),
      draw_calls: info && info.render.calls, triangoli: info && info.render.triangles, programmi: info && info.programs && info.programs.length, geometrie: info && info.memory.geometries, texture: info && info.memory.textures,
      luci_vere: lights, luci_con_ombra: shadowL, mesh: meshes, mesh_visibili: vis, mesh_che_fanno_ombra: cast, raf };
  }, +secs);
  console.log(JSON.stringify(res, null, 1));
  await b.close(); srv.close();
});
