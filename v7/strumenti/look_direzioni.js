// [look] LA TAVOLA DELLE DIREZIONI DEL LOOK (squadra/look): nel Game Boy rosa in verticale (profilo Pixel 7, seme fisso), una sessione sola,
// tre scene (la partenza di giorno, la marina al tramonto, la notte dei Lanternini con la gente e la pioggia) e in ogni scena le quattro
// direzioni dal vivo nello stesso istante (R.direzione: '0' com'è oggi, 'a', 'b', 'c'). Il gioco gira con ?look=a (il ramo del passo acceso).
// Uso (da v7/): node strumenti/look_direzioni.js <cartella> [scene, es. 1,2,3]   poi: python3 strumenti/look_direzioni.py <cartella> <uscita.jpg>
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium, devices } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');
const V7 = process.env.V7DIR || path.resolve(__dirname, '..'), ING = path.resolve(__dirname, '../../android/app/src/main/ingresso');
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const SCELTE = (process.argv[3] || '1,2,3').split(',').map(Number), DIR = (process.env.DIREZIONI || '0,a,b,c,0').split(',');   // '0' due volte: vale l'ultima (la prima foto può arrivare prima che il posto finisca di caricarsi)
const SCENE = [
  { n: 1, nome: 'partenza_giorno', ora: 11 * 60, meteo: 'sereno' },                                   // dove si parte, la mattina
  { n: 2, nome: 'marina_tramonto', x: 1395, y: 380, face: -Math.PI / 2, ora: 19 * 60 + 25, meteo: 'sereno' },   // la marina (scorci 05), il sole basso
  { n: 3, nome: 'vittoria_notte', x: 1395, y: 343, ora: 23 * 60, meteo: 'pioggia', gente: true } ];   // la Via della Vittoria (scorci 19), la notte, la pioggia, la gente
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.gz': 'application/gzip', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/gioco/api/') || u.startsWith('/api/')) { res.writeHead(503); res.end(); return; }
  const f = u.startsWith('/gioco/') ? path.join(V7, u.slice(7)) : path.join(ING, u);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; }
    if (u === '/gioco/index.html') d = Buffer.from(d.toString('utf8').replace('<head>', '<head><script>history.replaceState(null,"",location.pathname+(location.search?location.search+"&":"?")+"look=a'+(process.env.EXTRAQ||'')+'")</script>'));
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1, userAgent: devices['Pixel 7'].userAgent });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => log('[errore]', e.message.slice(0, 300)));
  const visti = new Set(); pg.on('console', m => { const t = m.text(); if (visti.has(t.slice(0, 80))) return; visti.add(t.slice(0, 80)); if (/error|errore|shader|program/i.test(t) && m.type() !== 'log') log('[console]', t.slice(0, 400)); });
  await pg.addInitScript(() => { let a = 4242; Math.random = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
  await pg.goto(`http://localhost:${srv.address().port}/`, { timeout: 900000, waitUntil: 'commit' });
  const shot = async nome => { const f = path.join(OUT, nome + '.png'); try { await pg.screenshot({ path: f, timeout: 240000 }); log('foto', f); } catch (e) { log('foto mancata', nome, e.message.slice(0, 100)); } };
  await pg.waitForTimeout(6000);
  const gioco = async () => { for (;;) { const f = pg.frames().find(q => /\/gioco\/index\.html/.test(q.url())); if (f) return f; await pg.waitForTimeout(2000); } };
  const G = await gioco(); log('frame del gioco', G.url());
  await G.waitForFunction(() => window.__pv && window.__pv.st && window.__pv.R, null, { timeout: 1500000, polling: 2000 });
  log('pronto'); await pg.waitForTimeout(8000);
  const tasto = (k, giu) => pg.evaluate(([k, giu]) => { const f = [...document.querySelectorAll('iframe')].find(q => /gioco/.test(q.src) || (q.contentWindow && /gioco/.test(q.contentWindow.location.href))); if (f) f.contentWindow.postMessage({ pvc: 'tasto', k, giu }, '*'); }, [k, giu]);
  for (let i = 0; i < 3; i++) { await tasto('a', true); await pg.waitForTimeout(300); await tasto('a', false); await pg.waitForTimeout(3000); if (await G.evaluate(() => !window.__pv.ui.intro)) break; }
  await pg.waitForTimeout(6000);
  log(JSON.stringify(await G.evaluate(() => ({ intro: window.__pv.ui.intro, x: window.__pv.st.player.x, y: window.__pv.st.player.y, dir: window.__pv.R.direzione && window.__pv.R.direzione(), lkd: !!window.__LKD && window.__LKD.on }))));
  await G.evaluate(() => { const pv = window.__pv, st = pv.st; st.deadline = 1e12; if (pv.R.gpuTiming) pv.R.gpuTiming(true);
    setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.desat = false; u.letterbox = false; st.over = null; st.chase = false; st.player.hp = 100; }, 50); });
  const info = [];
  for (const S of SCENE.filter(s => SCELTE.includes(s.n))) {
    await G.evaluate(S => { const pv = window.__pv, st = pv.st, p = st.player, ui = pv.ui;
      if (S.x !== undefined) { p.vehicle = null; p.indoor = null; p.lv = null; p.x = S.x; p.y = S.y; p.path = []; if (S.face !== undefined) p.face = S.face; }
      let t = Math.floor(st.t / 1440) * 1440 + S.ora; if (t < st.t - 1) t += 1440; st.t = t; window.__meteo = S.meteo; ui.focus = null; }, S);
    await pg.waitForTimeout(4000);
    if (S.gente) log('gente', await G.evaluate(() => { const st = window.__pv.st; if (typeof Popolo === 'undefined' || !Popolo.fillStep) return -1;
      const t0 = performance.now(); for (let k = 0; k < 30 && performance.now() - t0 < 4000; k++) { if (st.pop) st.pop.fillAt = 0; try { Popolo.fillStep(st, 0); } catch (e) { break; } }
      let n = 0; st.npcs.forEach(m => { const q = m.__posto; if (!q) return; n++; if (q.arrived || q.tetto) return; m.x = q.slot.x; m.y = q.slot.y; m.inside = false; m.path = []; m.speedNow = 0; m.face = q.slot.face; q.arrived = true; }); return n; }));
    for (let k = 0, quiet = 0, tb = Date.now(); Date.now() - tb < 60000 && quiet < 2; k++) { await pg.waitForTimeout(3000); quiet = (await G.evaluate(() => !(window.__pv.R.ISO && window.__pv.R.ISO.job))) ? quiet + 1 : 0; }
    await pg.waitForTimeout(30000);
    for (const d of DIR) {
      await G.evaluate(d => window.__pv.R.direzione(d), d); await pg.waitForTimeout(9000);
      const m = await G.evaluate(() => { const R = window.__pv.R, I = (R.gpuTimes && R.gpuTimes.info) || {}, st = window.__pv.st; return { calls: I.calls, tri: I.tris, prog: I.progs, ora: +(st.t / 60 % 24).toFixed(2), x: +st.player.x.toFixed(1), y: +st.player.y.toFixed(1), dir: R.direzione() }; });
      log(S.nome, d, JSON.stringify(m)); info.push({ scena: S.nome, d, ...m });
      await shot(`${S.n}_${S.nome}_${d}`);
    }
  }
  fs.writeFileSync(path.join(OUT, 'misure.json'), JSON.stringify(info, null, 1));
  await b.close(); srv.close(); log('fine');
});
