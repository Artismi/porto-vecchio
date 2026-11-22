// [pieno] IL FOTOGRAMMA PIÙ LUNGO DELLO STRATO: il gioco vero (Chromium, profilo telefono), si entra, si cammina lungo un percorso (W.percorsi)
// a passo d'uomo (0,25 m a fotogramma, dt 0,05 s) e si legge __PIENO: msMax (il tick più lungo dello strato fuori dalla schermata iniziale e
// dai primi 4 s), sopra4 (i tick oltre 4 ms), picco (dove: inizio, pianta, lavori, liste), i piazzamenti dei lavori e il loro tempo.
//   node strumenti/pieno_fotogramma.js [--query=&tasselli=0] [--via=Rua Maestra] [--passo=.25]
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium, devices } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');
const ROOT = process.env.V7DIR || path.resolve(__dirname, '..');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const Q = '?cittanuova' + arg('query', ''), VIA = arg('via', 'Rua Maestra'), PASSO = +arg('passo', .25);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.gz': 'application/gzip', '.bin': 'application/octet-stream', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const srv = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html'; if (u.startsWith('/api/')) { res.writeHead(503); res.end(); return; }
  const p = path.join(ROOT, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); }).listen(0, async () => {
  const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 700 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1, userAgent: devices['Pixel 7'].userAgent });
  const pg = await ctx.newPage(); pg.on('pageerror', e => log('[errore]', e.message.slice(0, 200))); pg.on('crash', () => log('[pagina caduta]')); pg.on('console', m => { if (m.type() === 'error' && !/404|503/.test(m.text())) log('[console]', m.text().slice(0, 200)); });
  await pg.addInitScript(() => { let a = 4242; Math.random = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; window.__pulita = true; });
  await pg.goto(`http://localhost:${srv.address().port}/index.html${Q}`, { timeout: 240000, waitUntil: 'commit' });
  await pg.waitForFunction(() => window.__pv && window.__pv.st && window.__pv.R, null, { timeout: 1800000, polling: 2000 });
  await pg.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
  await pg.waitForFunction(() => !window.__pv.ui.intro && window.__pv.st.wr && window.__pv.st.wr.works && window.__pv.st.wr.works.length > 50, null, { timeout: 600000, polling: 2000 }).catch(() => log('la storia dei muri non è arrivata'));
  await pg.waitForTimeout(8000);
  const r = await pg.evaluate(async ([VIA, PASSO]) => { const pv = window.__pv, R = pv.R, st = pv.st, p = st.player; const P = World.percorsi.percorsi.find(q => q.nome === VIA).pts;
    const ui = { focus: null, zoom: .5, time: 0, stick: null, lead: null, tilt: 0, rot: 0, drag: 0, edge: 0, puntatore: false, reale: 1e-3, mira: null }, S = window.__PIENO;
    const a0 = { msMax: S.msMax, picco: S.picco }; S.msMax = 0; S.fot = 0; S.sopra4 = 0; S.picco = null; S.passoMax = 0; S.passoFase = null; const pz0 = S.piazzati || 0, ms0 = S.msPiazza || 0; let n = 0;
    for (let k = 1; k < P.length; k++) { const a = P[k - 1], b = P[k], L = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let t = 0; t < L; t += PASSO) { p.x = a[0] + (b[0] - a[0]) * t / L; p.y = a[1] + (b[1] - a[1]) * t / L; p.face = Math.atan2(b[1] - a[1], b[0] - a[0]); R.frame(st, .05, ui); n++; } }
    const L = st.wr.works; return { passi: n, msMax: S.msMax, picco: S.picco, passoMax: S.passoMax, passoFase: S.passoFase, sopra4: S.sopra4, fot: S.fot, piazzati: (S.piazzati || 0) - pz0, msPiazza: Math.round((S.msPiazza || 0) - ms0), arrivo: a0, sagome: S.lavori, decal: S.decal, cotta: S.cotta, tasselli: !!(window.__tasselli && window.__tasselli.on), lavori: L.length, conRiquadro: L.filter(w => w.gfxRect).length, cotti: L.filter(w => w.cotto).length, err: S.err }; }, [VIA, PASSO]);
  log(JSON.stringify(r)); await b.close(); srv.close();
});
