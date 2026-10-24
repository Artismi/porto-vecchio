// [tetti4] Le passerelle contro i tetti SUL MODELLO VERO, da sola (senza il resto di compenetrazioni.js): carica il gioco in Chromium
// senza testa (?cittanuova), aspetta la città costruita e chiede window.__passerelle4 (tetti.js): per ogni passerella con urti il punto
// peggiore (x, y, quota del fondo, s lungo la passerella, t di traverso, la quota del solido colpito e l'oggetto). Esce con errore se ce ne sono.
//   node strumenti/passerelle4_vero.js [uscita.json]     (PV_PAGINA=altra.html per un'altra build)
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const root = path.resolve(__dirname, '..'), out = process.argv[2];
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const t0 = Date.now(), b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 480, height: 300 } });
  pg.on('pageerror', e => console.log('[errore]', e.message));
  await pg.goto(`http://localhost:${srv.address().port}/${process.env.PV_PAGINA || 'index.html'}?cittanuova`);
  await pg.waitForFunction(() => window.__pv && window.__pv.R && window.__pv.R.__buildings && window.__pv.R.__buildings.some(r => r.roofDone) && window.__passerelle4, null, { timeout: 2400000, polling: 3000 });
  await pg.waitForTimeout(20000);
  const R = await pg.evaluate(() => window.__passerelle4());
  console.log(`[tetti4] passerelle ${R.passerelle}, con urti ${R.urti.length} (${Math.round((Date.now() - t0) / 1000)} s)`);
  R.urti.sort((a, c) => c.cm - a.cm).forEach(u => console.log('  ' + JSON.stringify(u)));
  if (out) fs.writeFileSync(out, JSON.stringify(R, null, 1));
  process.exitCode = R.urti.length ? 1 : 0; await b.close(); srv.close();
});
