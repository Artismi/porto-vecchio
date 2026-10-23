// [pavimenti] LA MISURA DEI PIEDI: chi galleggia e chi affonda. Carica la città nuova (Chromium senza testa), e per ogni oggetto fermo
// posato in città (quelli che passano da addStatic: arredo, panchine, banchi, casse, fioriere, lampioni esclusi) confronta il fondo
// del suo ingombro con groundH al centro dell'impronta (pavimenti.js, Pavimenti.misura). Galleggia: fondo 3-12 cm sopra il suolo;
// affonda: più di 6 cm sotto. Stampa i conteggi per tipo e qualche esempio; con un file d'uscita scrive tutto in JSON.
//   node strumenti/piedi.js [uscita.json] [soglia in m, 0.03]
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const [out, soglia] = process.argv.slice(2), root = path.resolve(__dirname, '..');
const T = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.glb': 'model/gltf-binary' };
const srv = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html'; if (u.startsWith('/api/')) { res.end('{"ok":false}'); return; }
  fs.readFile(path.join(root, u), (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': T[path.extname(u)] || 'application/octet-stream' }); res.end(d); }); }).listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 640, height: 400 } });
  pg.on('pageerror', e => console.log('[errore]', e.message));
  await pg.goto(`http://localhost:${srv.address().port}/index.html${process.env.PV_QUERY || '?cittanuova'}`);
  await pg.waitForFunction(() => window.__pv && window.__pv.st && window.Pavimenti, null, { timeout: 400000 });
  const M = await pg.evaluate(s => Pavimenti.misura(s), +(soglia || .03));
  console.log('oggetti misurati', M.oggetti, '· galleggiano', M.galleggiano, '· affondano', M.affondano);
  console.log('galleggiano, per tipo:', M.perNomeSu.map(([k, n]) => k + ' ' + n).join(', '));
  console.log('affondano, per tipo:', M.perNomeGiu.map(([k, n]) => k + ' ' + n).join(', '));
  console.log('esempi (tipo, x, z, piede - suolo, altezza):'); M.esempiSu.concat(M.esempiGiu).forEach(q => console.log('  ', JSON.stringify(q)));
  if (out) fs.writeFileSync(out, JSON.stringify(M, null, 1));
  await b.close(); srv.close();
});
