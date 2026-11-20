// [cinema] LE FOTO NEL GAME BOY, COME NELL'APK (DA_FUORI.md): la pagina d'ingresso del Game Boy rosa (android/app/src/main/ingresso) e dentro
// il gioco di v7/ in /gioco/, Chromium col profilo di un telefono (Pixel 7, tocco), seme fisso. Fa: l'ingresso, si entra (A), la
// passeggiata (la levetta in avanti), l'azione (una pistola, tre colpi, la polizia che insegue), la guida (il mezzo più vicino).
// Uso (da v7/): node strumenti/gameboy_foto.js <cartella> [prima] [--orizzontale]
//   prima: il gioco con ?nocinema; V7DIR=<cartella>: un'altra build da servire in /gioco/ (es. quella di un commit vecchio)
// Poi: python3 strumenti/tavola_da_fuori.py <cartella prima> <cartella dopo> <uscita.jpg>
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium, devices } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');
const V7 = process.env.V7DIR || path.resolve(__dirname, '..'), ING = path.resolve(__dirname, '../../android/app/src/main/ingresso');
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const PRIMA = process.argv[3] === 'prima', ORIZ = process.argv.includes('--orizzontale');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.gz': 'application/gzip', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/gioco/api/') || u.startsWith('/api/')) { res.writeHead(503); res.end(); return; }
  const f = u.startsWith('/gioco/') ? path.join(V7, u.slice(7)) : path.join(ING, u);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; }
    if (PRIMA && u === '/gioco/index.html') d = Buffer.from(d.toString('utf8').replace('<head>', '<head><script>history.replaceState(null,"",location.pathname+(location.search?location.search+"&":"?")+"nocinema")</script>'));
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const vp = ORIZ ? { width: 844, height: 390 } : { width: 390, height: 844 };
  const ctx = await b.newContext({ viewport: vp, hasTouch: true, isMobile: true, deviceScaleFactor: 1, userAgent: devices['Pixel 7'].userAgent });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => log('[errore]', e.message.slice(0, 200)));
  await pg.addInitScript(() => { let a = 4242; Math.random = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
  await pg.goto(`http://localhost:${srv.address().port}/`, { timeout: 900000, waitUntil: 'commit' });
  let n = 0; const shot = async nome => { const f = path.join(OUT, String(++n).padStart(2, '0') + '_' + nome + '.png'); try { await pg.screenshot({ path: f, timeout: 240000 }); log('foto', f); } catch (e) { log('foto mancata', nome); } };
  await pg.waitForTimeout(6000); await shot('ingresso');
  // il gioco: il frame /gioco/index.html
  const gioco = async () => { for (;;) { const f = pg.frames().find(q => /\/gioco\/index\.html/.test(q.url())); if (f) return f; await pg.waitForTimeout(2000); } };
  const G = await gioco(); log('frame del gioco', G.url());
  await G.waitForFunction(() => window.__pv && window.__pv.st && window.__pv.R, null, { timeout: 1500000, polling: 2000 });
  log('pronto'); await pg.waitForTimeout(8000); await shot('pronto');
  // si entra (A sul Game Boy: dall'ingresso parte 'tasto a'); poi «Premi per entrare» del gioco
  const tasto = (k, giu) => pg.evaluate(([k, giu]) => { const f = [...document.querySelectorAll('iframe')].find(q => /gioco/.test(q.src) || (q.contentWindow && /gioco/.test(q.contentWindow.location.href))); if (f) f.contentWindow.postMessage({ pvc: 'tasto', k, giu }, '*'); }, [k, giu]);
  const lev = (x, y) => pg.evaluate(([x, y]) => { const f = [...document.querySelectorAll('iframe')].find(q => q.contentWindow && /gioco/.test(q.contentWindow.location.href)); if (f) f.contentWindow.postMessage({ pvc: 'levetta', x, y }, '*'); }, [x, y]);
  for (let i = 0; i < 3; i++) { await tasto('a', true); await pg.waitForTimeout(300); await tasto('a', false); await pg.waitForTimeout(3000); if (await G.evaluate(() => !window.__pv.ui.intro)) break; }
  await G.evaluate(() => { const pv = window.__pv; if (pv.ui.intro && pv.ui.pronto !== undefined) { try { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); } catch (e) { } } });
  await pg.waitForTimeout(6000); log(JSON.stringify(await G.evaluate(() => ({ intro: window.__pv.ui.intro, console: window.__pv.console, x: window.__pv.st.player.x, y: window.__pv.st.player.y, cinema: window.__cinema || null }))));
  await shot('in_gioco');
  // una passeggiata: la levetta in avanti per qualche fotogramma
  await lev(0, -1); for (let i = 0; i < 2; i++) { await pg.waitForTimeout(20000); await shot('cammina_' + i); } await lev(0, 0);
  // l'azione: una pistola in mano e qualche colpo (la tensione sale; il gioco a 0,3 fps: si spara a mano col motore)
  await G.evaluate(() => { const pv = window.__pv, st = pv.st, p = st.player; p.arms.pistola = { mag: 15, reserve: 60 }; p.cur = 'pistola'; st.chase = true; for (let i = 0; i < 3; i++) { p.cool = 0; pv.G.fire(st, p.face, null, true); } });
  await pg.waitForTimeout(25000); await shot('azione'); log(JSON.stringify(await G.evaluate(() => window.__cinema || null)));
  // la guida: sul mezzo più vicino
  await G.evaluate(() => { const pv = window.__pv, st = pv.st, p = st.player; st.chase = false; let best = null, bd = 1e9; for (const v of st.vehicles) { if (v.driver || v.dead || v.wreck || v.kind === 'bus') continue; const d = Math.hypot(v.x - p.x, v.y - p.y); if (d < bd) { bd = d; best = v; } } if (best) { p.x = best.x + 1.6; p.y = best.y; pv.act('veicolo'); } });
  await pg.waitForTimeout(25000); await shot('guida');
  await b.close(); srv.close(); log('fine');
});
