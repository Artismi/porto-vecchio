const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const [dir, out, q] = process.argv.slice(2);
const srv = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(dir, u), (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': u.endsWith('.html') ? 'text/html' : 'application/javascript' }); res.end(d); }); }).listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 1200, height: 800 } });
  pg.on('pageerror', e => console.log('[errore]', e.message, (e.stack || '').split('\n').slice(0, 3).join(' | '))); pg.on('console', m => console.log('[console]', m.text().slice(0, 300)));
  await pg.goto(`http://localhost:${srv.address().port}/index.html?${q || ''}`); await pg.waitForFunction(() => window.__done, null, { timeout: 120000 }).catch(e => console.log('timeout'));
  await pg.screenshot({ path: out }); await b.close(); srv.close(); console.log('ok');
});
