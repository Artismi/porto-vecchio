// [verde] LE QUATTRO VISTE DEL VERDE DI CITTÀ nel gioco vero (Chromium senza testa, SwiftShader, profilo telefono): una via, una piazza,
// il lungomare, la Villa a mare. Per ogni vista: il personaggio portato lì, l'attesa che i blocchi vicini siano fatti, la foto, e i disegni
// per fotogramma (renderer.info.render.calls, media di 3 fotogrammi) e i triangoli.
//   node strumenti/verde_tavola.js <cartella> [V7DIR=un'altra build da servire: la «prima»]
// Poi: python3 strumenti/verde_tavola.py <cartella prima> <cartella dopo> <uscita.jpg>
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');
const ROOT = process.env.V7DIR || path.resolve(__dirname, '..'), OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const VISTE = [['via', 1292, 297, 1292, 279, .5], ['piazza', 1279, 347, 1266, 342, .25], ['lungomare', 1441, 413, 1426, 399, .25], ['villa', 1192, 397, 1176, 393, .25]].filter(v => !process.env.SOLO || process.env.SOLO.split(',').includes(v[0])), ZOOM = +(process.env.ZOOM || 0);   // [nome, x, y, verso x, verso y, zoom (.25 vicina, .5 media, .85 alta)]; SOLO=via,villa: solo quelle
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.gz': 'application/gzip', '.bin': 'application/octet-stream', '.webp': 'image/webp' };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(ROOT, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 720, height: 405 } }); const err = [];
  pg.on('pageerror', e => { err.push(e.message); log('[errore]', e.message.slice(0, 200)); });
  pg.on('console', m => { if (/\[verde\]/.test(m.text()) || m.type() === 'error' && !/404/.test(m.text())) log('[console]', m.text().slice(0, 200)); });
  await pg.addInitScript(() => { let a = 4242; Math.random = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; window.__pulita = true; });
  await pg.goto(`http://localhost:${srv.address().port}/index.html?cittanuova`, { timeout: 240000, waitUntil: 'commit' });
  await pg.waitForFunction(() => window.__tl && window.__tl.gioco, null, { timeout: 1800000, polling: 2000 });
  log('caricato');
  await pg.keyboard.press('Enter').catch(() => {}); await pg.waitForTimeout(3000);
  await pg.waitForFunction(() => !window.__pv.ui.intro, null, { timeout: 240000, polling: 1000 }).catch(() => log('ancora nella schermata iniziale'));
  await pg.addStyleTag({ content: '#app > *:not(#cv) { visibility: hidden !important; } body > div:not(#app) { visibility: hidden !important; }' });
  await pg.evaluate(() => { const pv = window.__pv, st = pv.st; st.deadline = 1e12; window.__meteo = 'sereno'; if (window.PV_ATTESA) window.PV_ATTESA.on = () => true;
    setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.desat = false; u.letterbox = false; u.dialog = null; st.over = null; st.chase = false; st.player.hp = 100; }, 50); });
  const mis = {};
  for (const [nome, x, y, vx, vy, zm] of VISTE) { const s = { x, y, verso: [vx, vy], zoom: ZOOM || zm, ora: 10.5 };
    await pg.evaluate(s => { const pv = window.__pv, R = pv.R, st = pv.st, p = st.player; p.vehicle = null; p.indoor = null; p.lv = null; p.path = []; p.x = s.x; p.y = s.y; p.vx = p.vy = 0;
      st.t = Math.floor(st.t / 1440) * 1440 + s.ora * 60; if (R.camReset) R.camReset(); R.snap(st); R.cam.ppx = undefined;
      const h = Math.atan2(s.verso[1] - p.y, s.verso[0] - p.x); R.cam.uy = Math.atan2(-Math.cos(h), -Math.sin(h)) - R.YAW; p.face = h; pv.ui.zoom = s.zoom; pv.ui.tilt = 0; pv.ui.focus = null; }, s);
    log(nome, 'blocchi', await pg.evaluate(s => { const pv = window.__pv, R = pv.R, c = R.cam, n0 = R.ISO.chunks.size;
      for (const [a, b] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) { c.x = s.x + a * 48; c.y = s.y + b * 48; try { R.preparaArrivo(); } catch (e) { } }
      R.snap(pv.st); return [n0, R.ISO.chunks.size]; }, s).catch(e => String(e)));
    await pg.waitForTimeout(3000);
    for (let quiet = 0, tb = Date.now(); Date.now() - tb < 120000 && quiet < 3;) { await pg.waitForTimeout(2000);
      quiet = (await pg.evaluate(s => { const I = window.__pv.R.ISO, Wc = I.CH * 2; if (I.job) return false; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) if (!I.chunks.has(Math.floor((s.x + a * 30) / Wc) + ',' + Math.floor((s.y + b * 20) / Wc))) return false; return true; }, s).catch(() => false)) ? quiet + 1 : 0; }
    await pg.waitForTimeout(6000);
    const r = await pg.evaluate(async () => { const pv = window.__pv, R = pv.R, rd = R.__models.renderer, gl = rd.getContext(), cv = rd.domElement;
      const ui = { focus: pv.ui.focus, zoom: pv.ui.zoom, time: pv.ui.time || 0, stick: null, lead: null, tilt: 0, rot: 0, drag: 0, edge: 0, puntatore: false, reale: 1e-3, mira: null };
      for (let i = 0; i < 3; i++) R.frame(pv.st, 1e-4, ui);
      const r0 = rd.render; let calls = 0, tri = 0; rd.render = function () { const o = r0.apply(this, arguments); calls += rd.info.render.calls; tri += rd.info.render.triangles; return o; };
      try { R.frame(pv.st, 1e-4, ui); } finally { rd.render = r0; } gl.finish();
      return { calls, tri, img: cv.toDataURL('image/png') }; }).catch(e => ({ errore: String(e) }));
    if (r.img) fs.writeFileSync(path.join(OUT, nome + '.png'), Buffer.from(r.img.split(',')[1], 'base64'));
    mis[nome] = { calls: r.calls, tri: r.tri, errore: r.errore }; log(nome, JSON.stringify(mis[nome]));
  }
  { const f = path.join(OUT, 'misure.json'); let old = {}; try { old = JSON.parse(fs.readFileSync(f, 'utf8')).mis || {}; } catch (e) { } fs.writeFileSync(f, JSON.stringify({ mis: Object.assign(old, mis), errori: err.slice(0, 20) }, null, 1)); }
  await b.close(); srv.close(); log('fine');
});
