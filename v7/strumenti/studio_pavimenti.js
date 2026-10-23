// [pavimenti] fotografa lo studio dei suoli: node strumenti/studio_pavimenti.js uscita.png "?z=0.5" [larghezza altezza]
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const [out, q, W, H] = process.argv.slice(2), root = path.resolve(__dirname, '..');
const srv = http.createServer((req, res) => { const p = path.join(root, decodeURIComponent(req.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html' : 'application/javascript' }); res.end(d); }); }).listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: +(W || 1280), height: +(H || 800) } });
  pg.on('pageerror', e => console.log('[errore]', e.message)); pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.text().slice(0, 3000)); });
  await pg.goto(`http://localhost:${srv.address().port}/strumenti/studio_pavimenti.html${q || ''}`); await pg.waitForFunction(() => window.__done, null, { timeout: 120000 });
  if (/bench/.test(q || '')) console.log('ms', await pg.evaluate(() => window.__ms));
  await pg.screenshot({ path: out }); await b.close(); srv.close(); console.log('ok', out);
});
