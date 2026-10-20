// [pezzi_citta] Studio dei pezzi della città: foto dei pezzi di src/pezzi_citta.js, senza far partire il gioco (da studio_oggetti.js).
//   node strumenti_inverno/studio_pezzi.js cartella_uscita scene.json [larghezza altezza]
// scene.json: [{ "nome": "borgo", "celle": true, "cols": 3, "pose": [{ "nome": "campanile", "tipo": "campanile", "opzioni": { "h": 28 } }, ...] }]
// Ogni voce fa un'immagine <nome>.png. Senza "celle" i pezzi stanno in fila lungo x con passo "sp" (metri); "side"/"el" girano la camera;
// "ang" gira i pezzi. In modalità "celle" ogni pezzo sta nella sua cella con le misure in metri, i triangoli e l'avviso se la base non è a terra.
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const [outDir, sceneFile, W0, H0] = process.argv.slice(2);
const shots = JSON.parse(fs.readFileSync(sceneFile, 'utf8')), root = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json' };
fs.mkdirSync(outDir, { recursive: true });
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const port = srv.address().port, W = +(W0 || 1280), H = +(H0 || 800);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: W, height: H } });
  pg.on('pageerror', e => console.log('[errore]', e.message));
  pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.text().slice(0, 400)); });
  await pg.goto(`http://localhost:${port}/studio_pezzi.html`);
  await pg.waitForFunction(() => window.studioReady, null, { timeout: 120000 });
  for (const s of shots) {
    await pg.evaluate(s => window.studio.run(s.pose, s), s);
    await pg.screenshot({ path: path.join(outDir, s.nome + '.png') }); console.log('ok', s.nome);
  }
  await b.close(); srv.close();
});
