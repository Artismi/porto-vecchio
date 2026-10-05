// node strumenti_inverno/provino_kit.js rurban out.png  → provino del kit e misure (JSON) accanto
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const [kit, out] = process.argv.slice(2), root = path.resolve(__dirname, '..');
const srv = http.createServer((q, s) => { const p = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html' : p.endsWith('.json') ? 'application/json' : 'application/javascript' }); s.end(d); }); }).listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }), pg = await b.newPage({ viewport: { width: 1800, height: 1400 } });
  pg.on('pageerror', e => console.log('[errore]', e.message));
  await pg.goto(`http://localhost:${srv.address().port}/strumenti_inverno/provino_kit.html?kit=${kit}`); await pg.waitForFunction(() => document.title === 'pronto', null, { timeout: 180000 });
  await pg.screenshot({ path: out }); fs.writeFileSync(out.replace(/\.png$/, '.json'), JSON.stringify(await pg.evaluate(() => window.__sizes), null, 0)); await b.close(); srv.close(); console.log('ok');
});
