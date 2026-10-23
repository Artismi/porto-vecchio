// [vegetazione] Le foto della tavola: apre strumenti/vegetazione_tavola.html?scena=… in Chromium senza testa (SwiftShader) e salva una
// foto per scena, più le misure (piante, triangoli, chiamate di disegno; per il campionario i triangoli di ogni specie).
//   node strumenti/vegetazione_tavola.js <cartella> [scena,scena…] [larghezza altezza]
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const [outDir, lista, W0, H0] = process.argv.slice(2);
const SCENE = (lista || 'pineta,uliveto,viale,giardino,macchia,canneto,cortile,pergola,fonte,rudere,specie').split(',');
const root = path.resolve(__dirname, '..'), TYPES = { '.html': 'text/html', '.js': 'application/javascript' };
fs.mkdirSync(outDir, { recursive: true });
const srv = http.createServer((req, res) => { const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); }).listen(0, async () => {
  const port = srv.address().port, W = +(W0 || 1200), H = +(H0 || 760);
  const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const mis = {};
  for (const s of SCENE) {
    const pg = await b.newPage({ viewport: { width: W, height: H } }); const t = Date.now();
    pg.on('pageerror', e => console.log('[errore]', s, e.message)); pg.on('console', m => { if (m.type() === 'error') console.log('[console]', s, m.text().slice(0, 200)); });
    await pg.goto(`http://localhost:${port}/strumenti/vegetazione_tavola.html?scena=${s}&w=${W}&h=${H}`);
    await pg.waitForFunction(() => window.__pronto, null, { timeout: 600000 });
    mis[s] = await pg.evaluate(() => Object.assign({}, window.__misure, window.__tri ? { triSpecie: window.__tri } : {}));
    await pg.screenshot({ path: path.join(outDir, s + '.png') });
    console.log(s, JSON.stringify(mis[s]), ((Date.now() - t) / 1000).toFixed(0) + ' s'); await pg.close();
  }
  fs.writeFileSync(path.join(outDir, 'misure.json'), JSON.stringify(mis, null, 1));
  await b.close(); srv.close();
});
