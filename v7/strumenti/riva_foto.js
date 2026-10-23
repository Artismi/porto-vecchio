// [riva] Le foto ravvicinate della riva fine nel gioco vero: node strumenti/riva_foto.js <cartella> <scene.json> [larghezza altezza]
// scene.json: { "query": "?cittanuova", "scene": [{ "nome", "x", "y", "zoom", "ora" }] }. Con RIVA_PRIMA=1 rifà le stesse scene con
// ?vecchiacosta in una seconda pagina (prima e dopo affiancati: <nome>_prima.png). Stampa le misure della riva (window.__riva9) e le
// chiamate di disegno. Chromium senza testa con SwiftShader (lento: ~1-2 minuti a foto).
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const [outDir, sceneFile, W0, H0] = process.argv.slice(2), CFG = JSON.parse(fs.readFileSync(sceneFile, 'utf8')), root = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };
fs.mkdirSync(outDir, { recursive: true });
const srv = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html'; if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); }).listen(0, async () => {
  const port = srv.address().port, W = +(W0 || 1280), H = +(H0 || 800);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const giri = [['', CFG.query || '?cittanuova']]; if (process.env.RIVA_PRIMA) giri.push(['_prima', (CFG.query || '?cittanuova') + '&vecchiacosta']);
  for (const [suf, q] of giri) {
    const pg = await b.newPage({ viewport: { width: W, height: H } }); const t0 = Date.now();
    pg.on('pageerror', e => console.log('[errore]', e.message)); pg.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) console.log('[console]', m.text().slice(0, 300)); });
    await pg.addInitScript(() => { window.__pulita = true; });
    await pg.goto(`http://localhost:${port}/index.html${q}`); await pg.waitForFunction(() => window.__pv && window.__pv.st, null, { timeout: 900000 });
    await pg.keyboard.press('Enter'); await pg.waitForTimeout(1500);
    await pg.addStyleTag({ content: '#app > *:not(#cv) { visibility: hidden !important; }' });
    await pg.evaluate(() => { const pv = window.__pv, st = pv.st; st.deadline = 1e12; setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.desat = false; u.letterbox = false; u.dialog = null; st.over = null; st.player.hp = 100; }, 50); });
    console.log(q, 'caricato in', ((Date.now() - t0) / 1000).toFixed(0), 's');
    for (const s of CFG.scene) {
      const ts = Date.now();
      await pg.evaluate(s => { const pv = window.__pv, st = pv.st, p = st.player; p.vehicle = null; p.x = s.x + (s.px || 0); p.y = s.y + (s.py || 0); p.path = []; if (s.ora !== undefined) { let t = Math.floor(st.t / 1440) * 1440 + s.ora; if (t < st.t - 1) t += 1440; st.t = t; } window.__meteo = s.meteo || 'sereno'; pv.ui.focus = { x: s.x, y: s.y }; pv.ui.zoom = s.zoom || 1; }, s);
      await pg.waitForTimeout(4000);
      for (let quiet = 0, tb = Date.now(); Date.now() - tb < 240000 && quiet < 3;) { await pg.waitForTimeout(1500); quiet = (await pg.evaluate(s => { const I = window.__pv.R.ISO, W = I.CH * 2; if (I.job) return false; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) if (!I.chunks.has(Math.floor((s.x + a * 30) / W) + ',' + Math.floor((s.y + b * 20) / W))) return false; return true; }, s)) ? quiet + 1 : 0; }   // i blocchi attorno al punto inquadrato tutti costruiti
      await pg.waitForTimeout(+(process.env.RIVA_ATTESA || 6000));
      await pg.screenshot({ path: path.join(outDir, s.nome + suf + '.png'), timeout: 600000 });
      const mis = await pg.evaluate(() => new Promise(res => { const ren = window.__pv.R.__models.renderer, t = []; let last = performance.now(), k = 0;
        const step = () => { const n = performance.now(); t.push(n - last); last = n; if (++k < 6) requestAnimationFrame(step); else { const i = ren.info.render; t.shift(); t.sort((a, b) => a - b); res({ riva: window.__riva9 || null, dc: i.calls, tri: i.triangles, ms: Math.round(t[Math.floor(t.length / 2)]) }); } };
        requestAnimationFrame(step); }));
      console.log(s.nome + suf, JSON.stringify(mis), ((Date.now() - ts) / 1000).toFixed(0) + ' s');
    }
    await pg.close();
  }
  await b.close(); srv.close();
});
