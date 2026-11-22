// [texture] LE VISTE DEL SUOLO NEL GAME BOY, prima e dopo il lavoro sulle superfici a terra, nella stessa partita: il personaggio portato
// lì, la camera del gioco (lo zoom di partenza), l'attesa che la città vicina e i blocchi del terreno siano fatti, la foto con la manopola
// del suolo a 0 (prima: il suolo di oggi) e a 1 (dopo), i disegni per fotogramma nei due casi e la misura della densità sullo schermo
// (metri per pixel della scena al centro, al bordo basso e al bordo alto).
//   node strumenti/texture_tavola.js <cartella>      (da v7; VISTE='nome,x,y,dir;...' dir in gradi: 0 est, 90 sud; ORA=10.5)
// Poi: python3 strumenti/texture_tavola.py <cartella> <uscita.jpg>
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium, devices } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');
const V7 = process.env.V7DIR || path.resolve(__dirname, '..'), ING = path.resolve(__dirname, '../../android/app/src/main/ingresso');
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const VISTE = (process.env.VISTE || 'vicolo,1348,366,90;vittoria,1338,346,0;lungomare,1420,401,0;ghiaia,1310,286,180;sterrata,1203,340,90').split(';').map(s => { const a = s.split(','); return [a[0], ...a.slice(1).map(Number)]; });
const ORA = +(process.env.ORA || 10.5), Q_GIOCO = process.env.Q_GIOCO || '';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.bin': 'application/octet-stream', '.glb': 'model/gltf-binary', '.gz': 'application/gzip', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/gioco/api/') || u.startsWith('/api/')) { res.writeHead(503); res.end(); return; }
  const f = u.startsWith('/gioco/') ? path.join(V7, u.slice(7)) : path.join(ING, u);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; }
    if (Q_GIOCO && u === '/gioco/index.html') d = Buffer.from(String(d).replace('<head>', `<head><script>history.replaceState(null, '', location.pathname + '?' + ${JSON.stringify(Q_GIOCO)});</script>`));
    if (process.env.IMPRONTA && u === '/gioco/index.html') d = Buffer.from(String(d).replace(/PV_IMPRONTA_TASS = '[0-9a-f]+'/, `PV_IMPRONTA_TASS = '${process.env.IMPRONTA}'`));   // solo per le prove: i tasselli cotti prima (i marciapiedi cotti restano quelli di allora)
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1, userAgent: devices['Pixel 7'].userAgent });
  const pg = await ctx.newPage(); const err = [];
  pg.on('pageerror', e => { err.push(e.message); log('[errore]', e.message.slice(0, 200)); });
  pg.on('console', m => { const t = m.text(); if (/\[texture\]|shader|ERROR|errore/i.test(t)) log('[console]', t.slice(0, 300)); });
  await pg.addInitScript(() => { let a = 4242; Math.random = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
  await pg.goto(`http://localhost:${srv.address().port}/`, { timeout: 240000, waitUntil: 'commit' });
  const gioco = async () => { for (;;) { const f = pg.frames().find(q => /\/gioco\/index\.html/.test(q.url())); if (f) return f; await pg.waitForTimeout(2000); } };
  const G = await gioco(); log('frame del gioco');
  await G.waitForFunction(() => window.__pv && window.__pv.st && window.__pv.R, null, { timeout: 1500000, polling: 2000 });
  log('pronto'); await pg.waitForTimeout(5000);
  const tasto = (k, giu) => pg.evaluate(([k, giu]) => { const f = [...document.querySelectorAll('iframe')].find(q => q.contentWindow && /gioco/.test(q.contentWindow.location.href)); if (f) f.contentWindow.postMessage({ pvc: 'tasto', k, giu }, '*'); }, [k, giu]);
  for (let i = 0; i < 3; i++) { await tasto('a', true); await pg.waitForTimeout(300); await tasto('a', false); await pg.waitForTimeout(3000); if (await G.evaluate(() => !window.__pv.ui.intro)) break; }
  await G.waitForFunction(() => !window.__pv.ui.intro, null, { timeout: 240000, polling: 1000 }).catch(() => log('ancora nella schermata iniziale'));
  await G.evaluate(() => { const pv = window.__pv, st = pv.st; st.deadline = 1e12; window.__meteo = 'sereno'; if (window.PV_ATTESA) window.PV_ATTESA.on = () => true;
    setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.desat = false; u.letterbox = false; u.dialog = null; st.over = null; st.chase = false; st.player.hp = 100; }, 50); });
  const info0 = await G.evaluate(() => ({ zoom: window.__pv.ui.zoom, tasselli: window.__tasselli ? { on: !!window.__tasselli.on } : null, pav: window.__PAV ? window.__PAV.qualita() : null, tex: window.__TEX ? window.__TEX.stato() : null, look: window.PV_LOOK_DIR, x: window.__pv.st.player.x, y: window.__pv.st.player.y, face: window.__pv.st.player.face }));
  log('in gioco', JSON.stringify(info0));
  const mis = { _info: info0 };
  const TUTTE = (process.env.NOPARTENZA ? [] : [['partenza', 0, 0, 0, true]]).concat(VISTE);
  for (const [nome, x, y, dir, fermo] of TUTTE) { const s = { x, y, h: dir * Math.PI / 180, ora: ORA, fermo: !!fermo, zoom: info0.zoom };
    if (!s.fermo) await G.evaluate(s => { const pv = window.__pv, R = pv.R, st = pv.st, p = st.player; p.vehicle = null; p.indoor = null; p.lv = null; p.path = []; p.x = s.x; p.y = s.y; p.vx = p.vy = 0;
      st.t = Math.floor(st.t / 1440) * 1440 + s.ora * 60; if (R.camReset) R.camReset(); R.snap(st); R.cam.ppx = undefined;
      R.cam.uy = Math.atan2(-Math.cos(s.h), -Math.sin(s.h)) - R.YAW; p.face = s.h; pv.ui.zoom = s.zoom; pv.ui.tilt = 0; pv.ui.focus = null; window.__texH = s.h; }, s);
    else await G.evaluate(s => { const st = window.__pv.st; st.t = Math.floor(st.t / 1440) * 1440 + s.ora * 60; window.__texH = st.player.face; }, s);
    const P = await G.evaluate(() => [window.__pv.st.player.x, window.__pv.st.player.y]);
    await G.evaluate(P => { const pv = window.__pv, R = pv.R, c = R.cam; for (const [a, b] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) { c.x = P[0] + a * 48; c.y = P[1] + b * 48; try { R.preparaArrivo(); } catch (e) { } } R.snap(pv.st); }, P).catch(() => {});
    for (let quiet = 0, tb = Date.now(); Date.now() - tb < 150000 && quiet < 3;) { await pg.waitForTimeout(2500);
      quiet = (await G.evaluate(P => { const I = window.__pv.R.ISO, Wc = I.CH * 2; if (I.job) return false; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) if (!I.chunks.has(Math.floor((P[0] + a * 30) / Wc) + ',' + Math.floor((P[1] + b * 20) / Wc))) return false; return true; }, P).catch(() => false)) ? quiet + 1 : 0; }
    await pg.waitForTimeout(6000);
    await G.evaluate(() => { const pv = window.__pv, R = pv.R, st = pv.st; if (window.Pieno && Pieno.tutto) Pieno.tutto(st, st.player.x - 45, st.player.y - 45, st.player.x + 45, st.player.y + 45);
      const ui = { focus: null, zoom: pv.ui.zoom, time: 0, stick: null, lead: null, tilt: 0, rot: 0, drag: 0, edge: 0, puntatore: false, reale: 1e-3, mira: null };
      for (let i = 0; i < 30; i++) { st.player.face = window.__texH; R.frame(st, .05, ui); }
      if (window.__ERBACCE && __ERBACCE.subito) __ERBACCE.subito(st); }).catch(e => log('assetto', String(e)));
    const shot = async (on) => {
      const r = await G.evaluate(async on => { const pv = window.__pv, R = pv.R, rd = R.__models.renderer, cam = R.getCamera(); if (window.__TEX && __TEX.imposta) __TEX.imposta(on);
        const ui = { focus: pv.ui.focus, zoom: pv.ui.zoom, time: pv.ui.time || 0, stick: null, lead: null, tilt: 0, rot: 0, drag: 0, edge: 0, puntatore: false, reale: 1e-3, mira: null };
        for (let i = 0; i < 3; i++) R.frame(pv.st, 1e-4, ui);
        const r0 = rd.render; let calls = 0, tri = 0; rd.render = function () { const o = r0.apply(this, arguments); calls += rd.info.render.calls; tri += rd.info.render.triangles; return o; };
        try { R.frame(pv.st, 1e-4, ui); } finally { rd.render = r0; }
        // la densità: metri del suolo per pixel della scena (la tela di rendering vera, R.__rt se c'è), al centro e ai bordi
        const rt = R.__rt, W = rt && rt.width ? rt.width : rd.domElement.width, H = rt && rt.height ? rt.height : rd.domElement.height, out = {};
        const V = cam.position.constructor, ray = new (window.THREE.Raycaster)(), gh = (x, z) => R.groundH(x, z);
        for (const [k, ny] of [['alto', .7], ['centro', 0], ['basso', -.7]]) { ray.setFromCamera({ x: 0, y: ny }, cam); const o = ray.ray.origin, d = ray.ray.direction; let t = 0; for (let i = 0; i < 400; i++) { const q = o.clone().addScaledVector(d, t); if (q.y < gh(q.x, q.z)) break; t += .5; }
          const q = o.clone().addScaledVector(d, t), a = q.clone().project(cam), q2 = q.clone(); q2.x += .5; const a2 = q2.clone().project(cam), q3 = q.clone(); q3.z += .5; const a3 = q3.clone().project(cam);
          const px = Math.max(Math.hypot((a2.x - a.x) * W / 2, (a2.y - a.y) * H / 2), Math.hypot((a3.x - a.x) * W / 2, (a3.y - a.y) * H / 2));
          out[k] = { d: +t.toFixed(1), mpp: +(.5 / Math.max(px, 1e-6)).toFixed(4) }; }
        return { calls, tri, W, H, fov: cam.fov, dens: out, pav: window.__PAV ? window.__PAV.sonda(pv.st.player.x, pv.st.player.y) : null, tex: window.__TEX ? window.__TEX.stato() : null }; }, on).catch(e => ({ errore: String(e) }));
      await pg.waitForTimeout(1500);
      const f = path.join(OUT, nome + (on ? '_dopo' : '_prima') + '.png'); try { await pg.screenshot({ path: f, timeout: 240000 }); } catch (e) { log('foto mancata', f); }
      return r; };
    // i disegni per fotogramma con la manopola a 0 e a 1, alternati nello stesso stato della scena (0, 1, 0, 1): la differenza è il costo vero
    const dc = await G.evaluate(() => { const pv = window.__pv, R = pv.R, rd = R.__models.renderer, out = { k0: [], k1: [] };
      const ui = { focus: pv.ui.focus, zoom: pv.ui.zoom, time: pv.ui.time || 0, stick: null, lead: null, tilt: 0, rot: 0, drag: 0, edge: 0, puntatore: false, reale: 1e-3, mira: null };
      for (const on of [0, 1, 0, 1]) { if (window.__TEX) __TEX.imposta(on); R.frame(pv.st, 1e-4, ui); const r0 = rd.render; let calls = 0; rd.render = function () { const o = r0.apply(this, arguments); calls += rd.info.render.calls; return o; };
        try { R.frame(pv.st, 1e-4, ui); } finally { rd.render = r0; } out['k' + on].push(calls); }
      return out; }).catch(e => ({ errore: String(e) }));
    const a = await shot(false), d = await shot(true);
    mis[nome] = { P, disegni: dc, prima: a, dopo: d }; log(nome, JSON.stringify(mis[nome]).slice(0, 900));
    fs.writeFileSync(path.join(OUT, 'misure.json'), JSON.stringify({ mis, errori: err.slice(0, 20) }, null, 1));
  }
  fs.writeFileSync(path.join(OUT, 'misure.json'), JSON.stringify({ mis, errori: err.slice(0, 20) }, null, 1));
  await b.close(); srv.close(); log('fine');
});
