// Istantanee del gioco vero (v7/index.html): node strumenti_inverno/shot_gioco.js cartella_uscita scene.json
// scene.json: [{ "nome": "piazza", "x": 400, "y": 117, "ora": 840, "zoom": 1, "attesa": 3000 }]
// "amb": { "luc": 0, ... } cambia le manopole di window.__AMB da questa foto in poi.
// "luogo": id di World.PLACES al posto di x, y. "ora" in minuti dalla mezzanotte. Chromium senza testa con SwiftShader.
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const [outDir, sceneFile, W0, H0] = process.argv.slice(2);
const scenes = JSON.parse(fs.readFileSync(sceneFile, 'utf8')), root = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };
fs.mkdirSync(outDir, { recursive: true });
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const port = srv.address().port, W = +(W0 || 1280), H = +(H0 || 800);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: W, height: H } });
  pg.on('pageerror', e => console.log('[errore]', e.message, (e.stack || '').split('\n').slice(0, 4).join(' | ')));
  pg.on('console', m => { if (m.type() === 'error' || /\[dbg\]|oggetti35/.test(m.text())) console.log('[console]', m.text().slice(0, 300)); });
  await pg.addInitScript(() => { window.__dbg35 = true; });
  await pg.goto(`http://localhost:${port}/index.html`);
  await pg.waitForFunction(() => window.__pv && window.__pv.st, null, { timeout: 240000 });
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(1500);
  console.log('tempi', JSON.stringify(await pg.evaluate(() => window.__rt)));
  await pg.evaluate(() => setInterval(() => { const u = window.__pv.ui; u.flash = 0; u.fade = 0; u.desat = false; }, 50));   // il lampo rosa resta acceso senza testa
  for (const s of scenes) {
    await pg.evaluate(s => {
      const pv = window.__pv, st = pv.st, P = s.luogo && pv.G.PLACES ? pv.G.PLACES[s.luogo] : null;
      const x = P ? P.x : s.x, y = P ? P.y : s.y;
      st.player.x = x; st.player.y = y; if (s.ora !== undefined) st.t = Math.floor(st.t / 1440) * 1440 + s.ora;
      pv.ui.zoom = s.zoom || 1; pv.ui.dialog = null; pv.ui.book = false; pv.ui.menu = false;
      if (pv.R && pv.R.cam) { pv.R.cam.x = pv.R.cam.tx = x; pv.R.cam.y = pv.R.cam.ty = y; pv.R.cam.zoom = pv.R.cam.tz = s.zoom || 1; }
      if (s.amb && window.__AMB) Object.assign(window.__AMB, s.amb);   // manopole dello shader per questa foto (restano per le successive)
    }, s);
    await pg.waitForTimeout(s.attesa || 4000);
    console.log('ora di gioco', await pg.evaluate(() => Math.round(window.__pv.st.t % 1440)), 'night', await pg.evaluate(() => window.__pv.R && window.__pv.R.night));
    await pg.screenshot({ path: path.join(outDir, s.nome + '.png'), timeout: 240000 }); console.log('ok', s.nome);
  }
  await b.close(); srv.close();
});
