// [ritmo8] servitore + browser + pagina del gioco con gli strumenti (una pagina alla volta; si chiude solo il NOSTRO browser)
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { strum } = require('./strum.js');
const WT = '/home/user/porto-vecchio/.claude/worktrees/ritmo8/v7', MAIN = '/home/user/porto-vecchio/v7';
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.gz': 'application/gzip', '.woff2': 'font/woff2', '.css': 'text/css', '.wasm': 'application/wasm' };
function server(root, pagina) {
  return new Promise(res => {
    const srv = http.createServer((req, r) => {
      let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
      if (u.startsWith('/api/')) { r.writeHead(200, { 'Content-Type': 'application/json' }); r.end('{"ok":false}'); return; }
      let p = u === '/index.html' && pagina ? pagina : path.join(root, u);
      if (u.startsWith('/tasselli/') && !fs.existsSync(p)) p = path.join(MAIN, u);   // i tasselli cotti stanno solo nel checkout principale (sola lettura)
      fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); r.end(d); });
    }).listen(0, '127.0.0.1', () => res(srv));
  });
}
const DEV = {
  portatile: { viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1.25 },
  telefono: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
};
async function avvia(o = {}) {
  const srv = await server(o.root || WT, o.pagina);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
  const pid = b.process && b.process() ? b.process().pid : null;
  fs.writeFileSync(path.join(__dirname, 'browser.pid'), String(pid));
  const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)}s]`, ...a);
  log('browser pid', pid);
  const ctx = await b.newContext(DEV[o.disp || 'portatile']); const pg = await ctx.newPage();
  await pg.addInitScript(strum);
  pg.on('pageerror', e => log('[pageerror]', e.message.slice(0, 300)));
  pg.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/404|favicon/.test(t)) log('[console]', t.slice(0, 200)); });
  const q = (o.q0 === undefined ? 'leggera&tassellivecchi' : o.q0) + (o.q ? '&' + o.q : '');
  const url = `http://127.0.0.1:${srv.address().port}/index.html?${q}`; log(url);
  await pg.goto(url, { waitUntil: 'domcontentloaded', timeout: 0 });
  await pg.waitForFunction(() => window.__tl && window.__tl.gioco, null, { timeout: 2400000, polling: 1000 });
  log('caricato', JSON.stringify(await pg.evaluate(() => window.__tl)));
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(1500);
  await pg.waitForFunction(() => !window.__pv.ui.intro, null, { timeout: 120000 }).catch(() => log('ancora intro'));
  const cdp = await ctx.newCDPSession(pg);
  const close = async () => { try { await b.close(); } catch (e) { } srv.close(); };
  return { b, pg, cdp, log, close, pid };
}
module.exports = { avvia, WT, MAIN };
