// [personaggi] Sonda della gente: apre la città nuova coi personaggi nuovi e con ?vecchiagente, va nei posti affollati e misura
// fotogramma (mediana, SwiftShader: contano i rapporti), disegni, triangoli, e quanto pesano le persone (disegni e triangoli delle sole figure).
//   node strumenti/sonda_gente.js [uscita.json]   POSTI=nome:x:y,…  ORA=11  NF=40  ATTESA=20000  FOTO=cartella
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require('/opt/node-tools/node_modules/playwright-core');
const root = path.resolve(__dirname, '..'), OUT = process.argv[2];
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary' };
const PLACES = (process.env.POSTI || 'mercato:1275:343,borgo:1400:312').split(',').map(s => s.split(':')).map(([n, x, y]) => [n, +x, +y]);
const ORA = +(process.env.ORA || 11), N = +(process.env.NF || 40);
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const port = srv.address().port, T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a), out = {};
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info'] });
  for (const modo of (process.env.MODI || 'nuova,vecchia').split(',')) {
    const pg = await b.newPage({ viewport: { width: +(process.env.VW || 960), height: +(process.env.VH || 600) } }), errori = [];
    pg.on('pageerror', e => { errori.push(e.message); console.log('[errore]', e.message); });
    pg.on('console', m => { if (m.type() === 'error') { errori.push(m.text().slice(0, 300)); console.log('[console]', m.text().slice(0, 300)); } });
    await pg.goto(`http://localhost:${port}/index.html?cittanuova${modo === 'vecchia' ? '&vecchiagente' : ''}`);
    await pg.waitForFunction(() => window.__pv && window.__pv.st && window.__pv.R && window.__pv.R.__models.renderer, null, { timeout: 900000 });
    log(modo, 'pronto'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(2500);
    await pg.waitForFunction(() => !window.__pv.ui.intro, null, { timeout: 120000 }).catch(() => log('ancora intro'));
    await pg.evaluate(() => setInterval(() => { const u = window.__pv.ui; u.flash = 0; u.fade = 0; u.desat = false; }, 50));
    out[modo] = { errori };
    for (const [nome, x, y] of PLACES) {
      await pg.evaluate(([x, y, h]) => { const pv = window.__pv, st = pv.st, p = st.player; p.x = x; p.y = y; p.indoor = null; p.vehicle = null; st.t = Math.floor(st.t / 1440) * 1440 + h * 60; pv.ui.zoom = 1; pv.R.cam.x = x; pv.R.cam.y = y; }, [x, y, ORA]);
      await pg.waitForTimeout(+(process.env.ATTESA || 20000));
      const r = await pg.evaluate(n => new Promise(res => { const rd = window.__pv.R.__models.renderer, S = window.__pv.R.__models.scene; const dts = [], calls = [], tris = []; let last = performance.now(), k = 0, c = 0, t = 0;
        const r0 = rd.render; rd.render = function () { const q = r0.apply(this, arguments); c += rd.info.render.calls; t += rd.info.render.triangles; return q; };
        const f = () => { const now = performance.now(); if (k > 0) { dts.push(now - last); calls.push(c); tris.push(t); } c = 0; t = 0; last = now; if (++k <= n) requestAnimationFrame(f); else { rd.render = r0; const md = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
          // le persone: figure col mixer in scena e in vista, i loro disegni e triangoli (una passata, senza ombre)
          const cam = window.__pv.R.getCamera(), fr = new THREE.Frustum(), M = new THREE.Matrix4(); cam.updateMatrixWorld(); M.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); fr.setFromProjectionMatrix(M);
          let pers = 0, vis = 0, pd = 0, pt = 0, nuove = 0; S.children.forEach(q => { if (!q.userData || !q.userData.mixer || !q.visible) return; pers++; const p = new THREE.Vector3(); q.getWorldPosition(p); if (!fr.containsPoint(p)) return; vis++; if (q.userData.pelle) nuove++;
            q.traverseVisible(o => { if (!o.isMesh || !o.geometry) return; const nm = Array.isArray(o.material) ? o.material.length : 1; pd += nm; const g = o.geometry; pt += (g.index ? g.index.count : g.attributes.position.count) / 3; }); });
          res({ ms: +md(dts).toFixed(1), p95: +dts.slice().sort((x, y) => x - y)[Math.floor(dts.length * .95)].toFixed(1), disegni: md(calls), tri_k: Math.round(md(tris) / 1000), persone: pers, persone_in_vista: vis, figure_nuove: nuove, disegni_persone: pd, tri_persone_k: Math.round(pt / 1000), disegni_per_persona: vis ? +(pd / vis).toFixed(1) : 0, tri_per_persona: vis ? Math.round(pt / vis) : 0,
            mem_mb: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0, geometrie: rd.info.memory.geometries, costruzione: window.Personaggi ? { n: Personaggi.STAT.n, ms_media: +(Personaggi.STAT.ms / Math.max(1, Personaggi.STAT.n)).toFixed(1) } : null }); } };
        requestAnimationFrame(f); }), N);
      out[modo][nome] = r; log(modo, nome, JSON.stringify(r));
      if (process.env.FOTO) { fs.mkdirSync(process.env.FOTO, { recursive: true }); const cdp = await pg.context().newCDPSession(pg), { data } = await cdp.send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(process.env.FOTO, `${modo}_${nome}.png`), Buffer.from(data, 'base64')); }   // senza aspettare i font (in rete non arrivano)
    }
    await pg.close();
  }
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  await b.close(); srv.close();
});
