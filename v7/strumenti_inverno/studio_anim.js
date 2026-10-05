// Studio delle pose: foto dei personaggi veri in posa, senza far partire il gioco.
//   node strumenti_inverno/studio_anim.js cartella_uscita pose.json [larghezza altezza]
// pose.json: [{ "nome": "seduti", "t": 1.5, "cols": 4, "ang": 0.5, "side": 0.25,
//               "pose": [{ "nome": "siede", "anim": { "act": "siede" }, "o": { "speed": 0 }, "who": null, "ang": 0.5 }] }]
// Ogni voce fa un'immagine <nome>.png. "t" = secondi di animazione simulati prima della foto
// (per vedere più momenti della stessa posa, fare più voci con t diversi). "o" = opzioni di animPerson (speed, weapon, held, down, ...).
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
  await pg.goto(`http://localhost:${port}/studio_anim.html`);
  await pg.waitForFunction(() => window.studioReady, null, { timeout: 120000 });
  for (const s of shots) {
    await pg.evaluate(s => window.studio.run(s.pose, s), s);
    await pg.screenshot({ path: path.join(outDir, s.nome + '.png') }); console.log('ok', s.nome);
  }
  await b.close(); srv.close();
});
