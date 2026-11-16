#!/usr/bin/env node
/* Porto Vecchio — banco/costruire_pw.js: le foto di «costruire in città», fase 1 (src/unico_costruire.js, dietro ?commedia).
   Serve v7/ con un server http locale (non file://), apre index.html?commedia&cantiere=… in Chromium (Playwright, SwiftShader),
   mette Nino in una via (o sul corso), apre il cantiere della tappa vicino a lui e lascia lavorare la mente a passi di gioco veri.
     node banco/costruire_pw.js            le due foto (deviceScaleFactor 2):
       _immagini/commedia/costruire_1.jpg  la barricata coi costruttori al lavoro (1280×720)
       _immagini/commedia/costruire_2.jpg  la baracca finita sul corso col suo gruppo (Pixel 7)
   Opzioni: --solo 1|2  --seme N (3)  --headed */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
let PW; try { PW = require('playwright'); } catch (e) { PW = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright')); }
const { chromium, devices } = PW;
const argv = process.argv.slice(2), opt = {};
for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (a.startsWith('--')) { const k = a.slice(2), v = argv[i + 1]; if (v == null || v.startsWith('--')) opt[k] = true; else { opt[k] = v; i++; } } }
const ROOT = path.resolve(__dirname, '..'), FOTOD = path.join(ROOT, '_immagini', 'commedia'), SEME = +(opt.seme || 3);
const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
function server() {
  return new Promise(ok => {
    const s = http.createServer((q, r) => {
      let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html';
      if (u.startsWith('/api/')) { r.writeHead(200, { 'Content-Type': 'application/json' }); r.end('{"ok":false}'); return; }
      const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { r.writeHead(403); r.end(); return; }
      fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); r.end(b); });
    });
    s.listen(0, '127.0.0.1', () => ok(s));
  });
}
function initPage(o) {
  let a = o.seme >>> 0 || 1; Math.random = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  // il disegno a vuoto fra uno scatto e l'altro (SwiftShader costa secondi a fotogramma): window.__disegna = true lo rimette vero (come molo_pw.js)
  window.__disegna = false;
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) { if (!C) continue; const P = C.prototype;
    for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements']) { const f = P[k]; if (f) P[k] = function () { if (window.__disegna) return f.apply(this, arguments); }; } }
}

async function foto(browser, port, n) {
  const tipo = n === 1 ? 'barricata' : 'baracca', TEL = n === 2;
  const ctx = await browser.newContext(TEL ? Object.assign({}, devices['Pixel 7']) : { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage(), errori = [];
  page.on('pageerror', e => { errori.push(e.message); log('[errore pagina]', e.message); });
  await page.addInitScript(initPage, { seme: SEME });
  const url = `http://127.0.0.1:${port}/index.html?commedia&cantiere=${tipo}${n === 2 ? '&pronto' : ''}`;
  log('apro', url, TEL ? '(Pixel 7)' : '1280×720');
  await page.goto(url, { timeout: 900000 });
  await page.waitForFunction(() => window.__pv && window.__pv.st && window.Unico && Unico.passo && window.UnicoCostruire, null, { timeout: 900000, polling: 1000 });
  for (let k = 0; k < 6; k++) { const intro = await page.evaluate(() => !!window.__pv.ui.intro); if (!intro) break; await page.keyboard.press('Enter').catch(() => { }); if (TEL) await page.touchscreen.tap(200, 400).catch(() => { }); await page.waitForTimeout(2500); }
  // Nino fuori, in una via di città (o sul corso); il cantiere della tappa si apre lì accanto
  const C = await page.evaluate((tipo) => {
    const pv = window.__pv, st = pv.st, G = pv.G, UC = window.UnicoCostruire, p = st.player; st.deadline = 1e12; window.__meteo = 'sereno';
    window.__guardia = () => { const u = pv.ui; u.flash = 0; u.fade = 0; u.dialog = null; u.menu = false; st.over = null; st.chase = false; p.hp = 100; };
    setInterval(window.__guardia, 50);
    const s = UC.S(st); s.cantieri = s.cantieri.filter(x => false); s.tappa = 'foto';
    let V0;
    if (tipo === 'baracca') { const rd = G.MAP.roads.find(r => r.id === 'corso'), q = rd.pts[Math.floor(rd.pts.length * .55)]; V0 = UC.viaVicina(q[0], q[1], r => r.id === 'corso'); }
    else V0 = UC.viaVicina(p.x, p.y, r => r.id !== 'corso' && r.kind === 'citta' && r.w >= 6 && r.w <= 8.5);
    p.vehicle = null; p.indoor = null; p.lv = null; p.path = []; p.x = V0.x; p.y = V0.y; p.vx = p.vy = 0;
    for (let i = 0; i < 20; i++) G.step(st, .05, { x: 0, y: 0 });
    const C = UC.tappa(st); if (!C) return null;
    // Nino a guardare il cantiere (la camera lo segue da sé)
    const q = tipo === 'barricata' ? { x: C.x + 1.5, y: C.y + 7.5 } : { x: C.x + 2, y: C.y + 8.5 };   // la camera guarda verso nord: Nino a sud del cantiere
    p.x = q.x; p.y = q.y; p.face = Math.atan2(C.y - p.y, C.x - p.x); if (pv.R.snap) pv.R.snap(st);
    return { id: C.id, tipo: C.tipo, tappa: UC.tappa, q: location.search, via: C.via, gruppo: C.gruppo, n: C.piano.length, pezzi: C.pezzi.length };
  }, tipo);
  log('cantiere', JSON.stringify(C));
  if (!C) { await ctx.close(); return { n, errore: 'nessun cantiere' }; }
  // la mente lavora, a passi di gioco veri (senza disegno), finché la barricata è a metà con qualcuno che martella
  const stato = () => page.evaluate((id) => {
    const st = window.__pv.st, C = st.u.costruire.cantieri.find(x => x.id === id), G = window.__pv.G;
    const fanno = C.gruppo.map(i => { const n = G.byId(st, i); return n && n.pop && n.pop.emer ? n.pop.emer.label || '' : ''; });
    return { pezzi: C.pezzi.length, n: C.piano.length, fine: C.fine, fanno, mart: fanno.filter(x => /^Barrica|^Tira su/.test(x)).length };
  }, C.id);
  for (let giro = 0; giro < 400; giro++) {
    const s = await stato();
    if (n === 1 && s.pezzi >= Math.ceil(s.n * .5) && s.mart >= 1) break;
    if (n === 2 && giro >= 6) break;
    if (giro % 10 === 0) log(JSON.stringify(s));
    await page.evaluate(() => { const pv = window.__pv, st = pv.st; for (let i = 0; i < 40; i++) { window.__guardia(); pv.G.step(st, .05, { x: 0, y: 0 }); } });
    await page.waitForTimeout(n === 1 ? 60 : 400);
  }
  // la camera non si tocca: si mette Nino in modo che il cantiere gli stia davanti nel verso in cui la camera guarda
  const proj = await page.evaluate((id) => {
    const pv = window.__pv, st = pv.st, C = st.u.costruire.cantieri.find(x => x.id === id), p = st.player, cam = pv.R.getCamera && pv.R.getCamera();
    if (!cam) return null; const d = new THREE.Vector3(); cam.getWorldDirection(d); const L = Math.hypot(d.x, d.z) || 1, fx = d.x / L, fy = d.z / L;
    const k = C.tipo === "barricata" ? 4.6 : 6; p.x = C.x - fx * k + fy * 1.5; p.y = C.y - fy * k - fx * 1.5; p.vx = p.vy = 0; p.face = Math.atan2(C.y - p.y, C.x - p.x); if (pv.R.snap) pv.R.snap(st);
    return { fx: +fx.toFixed(2), fy: +fy.toFixed(2) };
  }, C.id);
  log('camera', JSON.stringify(proj));
  await page.waitForTimeout(4000);   // i tasselli e le bolle si assestano
  const fine = await stato(); log('scatto', JSON.stringify(fine));
  const f = path.join(FOTOD, `costruire_${n}.jpg`);
  await page.evaluate(() => { window.__fermo = true; window.__disegna = true; });
  for (let k = 0; k < 4; k++) await page.evaluate(() => new Promise(ok => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(ok)))));
  await page.waitForTimeout(3000);
  await page.screenshot({ path: f, type: 'jpeg', quality: 86, timeout: 900000 });
  await page.evaluate(() => { window.__disegna = false; });
  const bolle = await page.evaluate(() => Array.from(document.querySelectorAll('#unico-segni .us-b:not([hidden])')).map(e => e.textContent));
  const fatti = await page.evaluate(() => { const st = window.__pv.st; return Fatto.tutti(st).filter(x => ['rivendica', 'barricata', 'baracca', 'barrica', 'tira_su'].includes(x.v)).slice(-6).map(x => x.v + ':' + x.segno); });
  await ctx.close();
  log('foto', path.relative(ROOT, f), 'bolle', JSON.stringify(bolle), 'fatti', JSON.stringify(fatti), 'errori', errori.length);
  return { n, f: path.relative(ROOT, f), stato: fine, bolle, fatti, errori };
}

(async () => {
  const srv = await server(), port = srv.address().port;
  const browser = await chromium.launch({ headless: !opt.headed, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
  const out = [];
  for (const n of opt.solo ? [+opt.solo] : [1, 2]) out.push(await foto(browser, port, n));
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
