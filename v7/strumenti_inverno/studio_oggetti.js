// Studio degli oggetti: foto dei modelli di bottino.js e pezzi.js, senza far partire il gioco.
//   node strumenti_inverno/studio_oggetti.js cartella_uscita pose.json [larghezza altezza]
// scene.json: [{ "nome": "bottino", "cols": 5, "sp": 1.6, "ang": 0, "side": .35, "el": .55,
//               "pose": [{ "nome": "cestino", "src": "bottino:cestino" }, { "nome": "pallet", "src": "pezzi:pallet", "args": [...] }] }]
// Ogni voce fa un'immagine <nome>.png con i modelli in fila (src = libreria:funzione; args = argomenti dopo il gruppo).
// Librerie: bottino:, pezzi:, st: (postazioni di oggetti_ui.js), scaricato: (voci di src/scaricati.js), kit:food/fish (nodi dei kit),
//   file:mj/s_Tent con "fit": ["h", 1.2] (un file qualsiasi di assets/, adattato a quella misura).
// "precarica": true carica prima tutti i modelli scaricati (sennò si vedono i modelli fatti a mano di ripiego).
// Nelle voci pezzi:, "st": "st_macchina_cucire" passa quella postazione come argomento (tessile, stamperia).
// "celle": true mette ogni modello nella sua cella, inquadrato da solo, con le misure in metri (e l'avviso se la base non è a terra).
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
  const port = srv.address().port, W = +(W0 || 1200), H = +(H0 || 700);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: W, height: H } });
  pg.on('pageerror', e => console.log('[errore]', e.message));
  pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.text().slice(0, 400)); });
  await pg.goto(`http://localhost:${port}/studio_oggetti.html`);
  await pg.waitForFunction(() => window.studioReady, null, { timeout: 120000 });
  for (const s of shots) {
    await pg.evaluate(s => window.studio.run(s.pose, s), s);
    await pg.screenshot({ path: path.join(outDir, s.nome + '.png') }); console.log('ok', s.nome);
  }
  await b.close(); srv.close();
});
