// [pieno] LE QUATTRO VISTE DI STRADA NEL GAME BOY, prima e dopo lo strato del pieno, nella stessa partita: il personaggio portato lì,
// l'attesa che la città vicina, i graffiti e la pianta del pieno siano fatti, la foto con lo strato spento (prima) e acceso (dopo), e i
// disegni per fotogramma (renderer.info.render.calls sommato su tutti i passaggi di un fotogramma) nei due casi.
//   node strumenti/pieno_tavola.js <cartella>      (da v7; VISTE='nome,x,y,vx,vy;...' per altre viste; ZOOM=.35)
// Poi: python3 strumenti/pieno_tavola.py <cartella> <uscita.jpg>
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium, devices } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');
const V7 = process.env.V7DIR || path.resolve(__dirname, '..'), ING = path.resolve(__dirname, '../../android/app/src/main/ingresso');
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
// una vista: il muro (x, z) con la sua normale (nx, nz); il personaggio sta a «fuori» metri dal muro e «indietro» metri prima lungo il muro
// (sg: da che parte), e guarda il muro di sbieco (come quando ci si cammina accanto): la camera alle sue spalle
const VISTE = (process.env.VISTE || 'ottagono,1343.89,330.86,-1,0,1,2,4.5;serranda,1291,330.12,0,1,1,1,3.5;marina,1336.95,361.93,0,-1,1,2,4.5;stazione,1298.27,265.89,0,-1,1,2,4.5').split(';').map(s => { const a = s.split(','); return [a[0], ...a.slice(1).map(Number)]; });
const ZOOM = +(process.env.ZOOM || .5), ORA = +(process.env.ORA || 10.5);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.gz': 'application/gzip', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/gioco/api/') || u.startsWith('/api/')) { res.writeHead(503); res.end(); return; }
  const f = u.startsWith('/gioco/') ? path.join(V7, u.slice(7)) : path.join(ING, u);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1, userAgent: devices['Pixel 7'].userAgent });
  const pg = await ctx.newPage(); const err = [];
  pg.on('pageerror', e => { err.push(e.message); log('[errore]', e.message.slice(0, 200)); });
  await pg.addInitScript(() => { let a = 4242; Math.random = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
  await pg.goto(`http://localhost:${srv.address().port}/`, { timeout: 240000, waitUntil: 'commit' });
  const gioco = async () => { for (;;) { const f = pg.frames().find(q => /\/gioco\/index\.html/.test(q.url())); if (f) return f; await pg.waitForTimeout(2000); } };
  const G = await gioco(); log('frame del gioco');
  G.on && G.on('console', () => {});
  pg.on('console', m => { if (/\[pieno\]|pieno/.test(m.text())) log('[console]', m.text().slice(0, 200)); });
  await G.waitForFunction(() => window.__pv && window.__pv.st && window.__pv.R, null, { timeout: 1500000, polling: 2000 });
  log('pronto'); await pg.waitForTimeout(5000);
  const tasto = (k, giu) => pg.evaluate(([k, giu]) => { const f = [...document.querySelectorAll('iframe')].find(q => q.contentWindow && /gioco/.test(q.contentWindow.location.href)); if (f) f.contentWindow.postMessage({ pvc: 'tasto', k, giu }, '*'); }, [k, giu]);
  for (let i = 0; i < 3; i++) { await tasto('a', true); await pg.waitForTimeout(300); await tasto('a', false); await pg.waitForTimeout(3000); if (await G.evaluate(() => !window.__pv.ui.intro)) break; }
  await G.waitForFunction(() => !window.__pv.ui.intro, null, { timeout: 240000, polling: 1000 }).catch(() => log('ancora nella schermata iniziale'));
  await G.evaluate(() => { const pv = window.__pv, st = pv.st; st.deadline = 1e12; window.__meteo = 'sereno'; if (window.PV_ATTESA) window.PV_ATTESA.on = () => true;
    setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.desat = false; u.letterbox = false; u.dialog = null; st.over = null; st.chase = false; st.player.hp = 100; }, 50); });
  log('in gioco', JSON.stringify(await G.evaluate(() => ({ pieno: window.__PIENO, lavori: (window.__pv.st.wr && window.__pv.st.wr.works || []).length }))));
  const mis = {};
  for (const [nome, wx, wz, nx, nz, sg, back, out] of VISTE) { const s = { wx, wz, nx, nz, sg, back, out, zoom: ZOOM, ora: ORA }; const x = wx + nx * out + nz * sg * back, y = wz + nz * out - nx * sg * back; s.x = x; s.y = y;
    await G.evaluate(s => { const pv = window.__pv, R = pv.R, st = pv.st, p = st.player, ux = -s.nz * s.sg, uz = s.nx * s.sg; p.vehicle = null; p.indoor = null; p.lv = null; p.path = []; p.x = s.x; p.y = s.y; p.vx = p.vy = 0;
      st.t = Math.floor(st.t / 1440) * 1440 + s.ora * 60; const h = Math.atan2(uz * .55 - s.nz * .8, ux * .55 - s.nx * .8); if (R.camReset) R.camReset(); R.snap(st); R.cam.ppx = undefined;
      R.cam.uy = Math.atan2(-Math.cos(h), -Math.sin(h)) - R.YAW; p.face = h; pv.ui.zoom = s.zoom; pv.ui.tilt = 0; pv.ui.focus = null; window.__pienoH = h; }, s);
    await G.evaluate(s => { const pv = window.__pv, R = pv.R, c = R.cam; for (const [a, b] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) { c.x = s.x + a * 48; c.y = s.y + b * 48; try { R.preparaArrivo(); } catch (e) { } } R.snap(pv.st); }, s).catch(() => {});
    // la città vicina, i graffiti vicini (scanNear forzato) e la pianta del pieno
    for (let quiet = 0, tb = Date.now(); Date.now() - tb < 150000 && quiet < 3;) { await pg.waitForTimeout(2500);
      quiet = (await G.evaluate(s => { const pv = window.__pv, I = pv.R.ISO, Wc = I.CH * 2; try { const WR = window.Writing; if (WR && WR._ && WR._.scanNear) { } } catch (e) { }
        if (I.job) return false; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) if (!I.chunks.has(Math.floor((s.x + a * 30) / Wc) + ',' + Math.floor((s.y + b * 20) / Wc))) return false; return true; }, s).catch(() => false)) ? quiet + 1 : 0; }
    await pg.waitForTimeout(8000);
    // la camera si mette (30 passi), e lo strato del pieno pianifica subito la zona (nel gioco lo fa a celle, pochi ms a fotogramma)
    await G.evaluate(s => { const pv = window.__pv, R = pv.R, st = pv.st; if (window.Pieno && Pieno.tutto) Pieno.tutto(st, s.x - 45, s.y - 45, s.x + 45, s.y + 45);
      const ui = { focus: null, zoom: pv.ui.zoom, time: 0, stick: null, lead: null, tilt: 0, rot: 0, drag: 0, edge: 0, puntatore: false, reale: 1e-3, mira: null };
      for (let i = 0; i < 30; i++) { st.player.face = window.__pienoH; R.frame(st, .05, ui); } }, s).catch(e => log('assetto', String(e)));
    const shot = async (on) => {
      const r = await G.evaluate(async on => { const pv = window.__pv, R = pv.R, rd = R.__models.renderer; if (window.Pieno && Pieno.imposta) Pieno.imposta(on);
        const ui = { focus: pv.ui.focus, zoom: pv.ui.zoom, time: pv.ui.time || 0, stick: null, lead: null, tilt: 0, rot: 0, drag: 0, edge: 0, puntatore: false, reale: 1e-3, mira: null };
        for (let i = 0; i < 2; i++) R.frame(pv.st, 1e-4, ui);
        const r0 = rd.render; let calls = 0, tri = 0; rd.render = function () { const o = r0.apply(this, arguments); calls += rd.info.render.calls; tri += rd.info.render.triangles; return o; };
        try { R.frame(pv.st, 1e-4, ui); } finally { rd.render = r0; }
        return { calls, tri, pieno: window.__PIENO ? Object.assign({}, window.__PIENO) : null, disegniPieno: window.Pieno && Pieno.disegni ? Pieno.disegni() : null }; }, on).catch(e => ({ errore: String(e) }));
      await pg.waitForTimeout(1500);
      const f = path.join(OUT, nome + (on ? '_dopo' : '_prima') + '.png'); try { await pg.screenshot({ path: f, timeout: 240000 }); } catch (e) { log('foto mancata', f); }
      return r; };
    const a = await shot(false), d = await shot(true);
    mis[nome] = { prima: { calls: a.calls, tri: a.tri }, dopo: { calls: d.calls, tri: d.tri }, pieno: d.pieno, disegniPieno: d.disegniPieno, errore: a.errore || d.errore }; log(nome, JSON.stringify(mis[nome]));
  }
  fs.writeFileSync(path.join(OUT, 'misure.json'), JSON.stringify({ mis, errori: err.slice(0, 20) }, null, 1));
  await b.close(); srv.close(); log('fine');
});
