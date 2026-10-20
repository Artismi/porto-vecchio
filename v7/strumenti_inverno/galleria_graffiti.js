// node strumenti_inverno/galleria_graffiti.js out.png "pezzo:block,pezzo:wild,throw,tag" [cols] [ppm] [stub]
// Fotografa la galleria dei lavori dei writer (galleria_graffiti.html): ogni voce è stile:fam:pal:seme:W:H:parole ('-' per saltare un campo).
const path = require('path'), http = require('http'), fs = require('fs'), { chromium } = require('/opt/node22/lib/node_modules/playwright');
const [out, ps, cols, ppm, stub] = process.argv.slice(2), root = path.resolve(__dirname, '..');   // stub: 1 = senza Graffiti.F, 2 = dentro un Worker come nel gioco
const srv = http.createServer((q, s) => { const p = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200); s.end(d); }); }).listen(0, async () => {
  const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: 1400, height: 900 } });
  pg.on('pageerror', e => console.log('[errore pagina]', e.message)); pg.on('console', m => { if (/errore/.test(m.text())) console.log(m.text()); });
  await pg.goto(`http://localhost:${srv.address().port}/strumenti_inverno/galleria_graffiti.html?s=${encodeURIComponent(ps)}&cols=${cols || 4}&ppm=${ppm || 60}${stub === '1' ? '&stub=1' : stub === '2' ? '&worker=1' : ''}`);
  await pg.waitForFunction(() => document.title === 'pronto', null, { timeout: 180000 }); await pg.screenshot({ path: out, fullPage: true }); await b.close(); srv.close(); console.log('ok', out);
});
