// node strumenti_inverno/pezzo4.js kit "pezzo,pezzo" out.png
const path = require('path'), http = require('http'), fs = require('fs'), { chromium } = require('/opt/node22/lib/node_modules/playwright');
const [kit, ps, out] = process.argv.slice(2), root = path.resolve(__dirname, '..'), n = ps.split(',').length;
const srv = http.createServer((q, s) => { const p = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200); s.end(d); }); }).listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }), pg = await b.newPage({ viewport: { width: 880, height: 220 * n } });
  pg.on('pageerror', e => console.log('[errore]', e.message)); await pg.goto(`http://localhost:${srv.address().port}/strumenti_inverno/pezzo4.html?kit=${kit}&p=${ps}`);
  await pg.waitForFunction(() => document.title === 'pronto', null, { timeout: 120000 }); await pg.screenshot({ path: out }); await b.close(); srv.close(); console.log('ok'); });
