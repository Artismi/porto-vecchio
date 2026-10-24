// Foto dello Studio della roba (studio_roba.html): le anteprime di tutti gli oggetti del catalogo, un'immagine per gruppo.
//   node strumenti/studio_roba.js cartella_uscita [larghezza] [gruppi separati da virgola] [altri parametri della pagina, es. ids=pane,latte&px=192]
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const [outDir, W0, cats, extra] = process.argv.slice(2), root = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json' };
fs.mkdirSync(outDir, { recursive: true });
const srv = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const port = srv.address().port, W = +(W0 || 1240);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: W, height: 800 } });
  pg.on('pageerror', e => console.log('[errore]', e.message));
  pg.on('console', m => { if (m.type() === 'error') console.log('[console]', m.text().slice(0, 300)); });
  const list = cats && cats !== '-' ? cats.split(',') : null;
  const qs = [list && list[0] !== '-' ? 'cat=' + list.join(',') : '', extra || ''].filter(Boolean).join('&');
  await pg.goto(`http://localhost:${port}/studio_roba.html${qs ? '?' + qs : ''}`);
  await pg.waitForFunction(() => window.studioReady, null, { timeout: 600000 });
  console.log(await pg.title());
  const hs = await pg.$$('h2');
  for (const h of hs) {
    const name = (await h.textContent()).split(' ')[0], grid = await h.evaluateHandle(e => e.nextElementSibling);
    const bh = await h.boundingBox(), bg = await grid.boundingBox();
    await pg.screenshot({ path: path.join(outDir, name + '.png'), fullPage: true, clip: { x: 0, y: bh.y, width: W, height: bg.y + bg.height - bh.y + 8 } });
    console.log('ok', name);
  }
  await b.close(); srv.close();
});
