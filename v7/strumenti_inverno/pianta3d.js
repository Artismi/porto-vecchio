// Istantanee della pianta 3D: node strumenti_inverno/pianta3d.js uscita.png "box=0,0,1300,400&lab=piazza,..." [w] [h]
// Da lanciare dalla cartella v7. Usa il Chromium di Playwright con SwiftShader.
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const [out, q, w, h] = process.argv.slice(2);
const root = path.resolve(__dirname, '..');
const srv = http.createServer((req, res) => { const p = path.join(root, decodeURIComponent(req.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html' : 'application/javascript' }); res.end(d); }); }).listen(0, async () => {
  const port = srv.address().port, W = +(w || 1600), H = +(h || 1000);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: W, height: H } });
  pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[pagina]', m.text()); });
  pg.on('pageerror', e => console.log('[errore]', e.message));
  await pg.goto(`http://localhost:${port}/strumenti_inverno/pianta3d.html?w=${W}&h=${H}&${q || ''}`);
  await pg.waitForFunction(() => document.title === 'pronto', null, { timeout: 180000 });
  await pg.screenshot({ path: out }); await b.close(); srv.close(); console.log('ok', out);
});
