// [mappa_nuova] LA PROVA D'AVVIO DELLA MAPPA NUOVA: il gioco vero in Chromium senza testa (SwiftShader) con la mappa nuova (di serie; --vecchia: ?mappa=prima), gli errori
// della pagina, qualche foto dall'alto e, con --metro, il viaggio in metropolitana da una stazione all'altra.
//   node strumenti/prova_mappa_nuova.js [--query=&altro] [--foto=cartella] [--vecchia] [--metro]
// Esce con 1 se la pagina ha dato errori.
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');
const root = path.resolve(__dirname, '..');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const has = k => process.argv.includes('--' + k);
const Q = '?cittanuova' + (has('vecchia') ? '&mappa=prima' : '') + arg('query', ''), FOTO = arg('foto', null);
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.webp': 'image/webp', '.gz': 'application/gzip' };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ executablePath: process.env.PW_CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(), errori = [];
  pg.on('pageerror', e => { errori.push(e.message); log('[errore]', e.message, (e.stack || '').split('\n').slice(1, 4).join(' | ')); });
  pg.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/404|Failed to load/.test(t)) { errori.push(t); log('[console]', t.slice(0, 300)); } else if (/\[mappa_nuova\]|\[metro\]|\[cotto\]/.test(t)) log('[pagina]', t.slice(0, 300)); });
  log('apro', Q);
  await pg.goto(`http://localhost:${srv.address().port}/index.html${Q}`, { timeout: 900000 });
  await pg.waitForFunction(() => window.__pv && window.__pv.st && window.__pv.R && window.__pv.R.__models && window.__pv.R.__models.renderer, null, { timeout: 1500000, polling: 1000 });
  log('partito');
  const info = await pg.evaluate(() => { const G = window.__pv, W = G.MAP && G.MAP.world || (window.World || {}); return { mappa: W.MAPPA || '(prima)', GW: W.GW, GH: W.GH, luoghi: Object.keys(W.PLACES || {}).length, case: (W.BUILDINGS || []).length, alias: Object.keys(W.ALIAS || {}).length, metro: window.Sottosuolo && Sottosuolo.TPL && Sottosuolo.TPL.metro.ok ? (Sottosuolo.TPL.metro.stazioni || [Sottosuolo.TPL.metro.A, Sottosuolo.TPL.metro.B]).map(s => s.name) : null }; });
  log('mondo', JSON.stringify(info));
  if (FOTO) { fs.mkdirSync(FOTO, { recursive: true }); await pg.waitForTimeout(8000); await pg.screenshot({ path: path.join(FOTO, 'avvio.png'), timeout: 300000 }).then(() => log('foto', path.join(FOTO, 'avvio.png')), e => log('foto non fatta', e.message.split('\n')[0])); }
  if (has('metro')) {
    const r = await pg.evaluate(async () => { const S = window.Sottosuolo; if (!S || !S.provaViaggio) return 'niente provaViaggio'; return await S.provaViaggio(window.__pv.st); });
    log('metro', JSON.stringify(r));
    if (FOTO) { await pg.waitForTimeout(4000); await pg.screenshot({ path: path.join(FOTO, 'metro.png'), timeout: 300000 }).catch(() => {}); }
  }
  await pg.waitForTimeout(6000);
  log(errori.length ? 'ERRORI: ' + errori.length : 'nessun errore');
  await b.close(); srv.close(); process.exit(errori.length ? 1 : 0);
});
