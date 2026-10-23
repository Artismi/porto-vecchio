// [visuale4] LA STRISCIA DEL MOVIMENTO del prototipo A (?visuale=camera): cinque fotogrammi camminando dalla Via della Vittoria dentro il
// Vico dei Bottai e di nuovo fuori, per far vedere come la camera sale nel vicolo e torna giù sulla via (lo smorzamento e l'isteresi).
// Sotto SwiftShader un fotogramma dura minuti: il cammino si simula nella pagina a 30 fps con le stesse regole del gioco (Visuale.misura,
// Visuale.camPasso: la stessa VIS4.C che usa render.js), si scelgono cinque istanti (sulla via, appena dopo l'entrata, in fondo, appena
// dopo l'uscita, a regime sulla via) e per ognuno si mette lo stato della camera di quell'istante (VIS4.fermo: il gioco non lo muove) e si scatta.
//   node strumenti/striscia_visuale4.js <cartella delle foto grezze>     (GALLERIA_CARICO in ms, come galleria.js)
// Esce: f1..f5.png e striscia.json (posizione, pendenza, zoom, stato di ogni fotogramma); il foglio lo compone strumenti/fogli_visuale4.py.
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const outDir = process.argv[2]; if (!outDir) { console.log('uso: node strumenti/striscia_visuale4.js <cartella>'); process.exit(1); }
const root = path.resolve(__dirname, '..'), TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };
// il cammino: dalla Vittoria alla bocca del Vico dei Bottai, dentro fino a metà, e fuori di nuovo
const CAMMINO = [[1384, 343.5], [1392.6, 342], [1393.6, 336], [1395.4, 324], [1395.8, 320.5], [1394.8, 328], [1393.4, 338], [1394.5, 343.5], [1404, 344]];
fs.mkdirSync(outDir, { recursive: true });
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const port = srv.address().port, t0 = Date.now();
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 1280, height: 800 } });
  pg.on('pageerror', e => console.log('[errore]', e.message, (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  await pg.addInitScript(() => { window.__pulita = true; });
  await pg.goto(`http://localhost:${port}/index.html?cittanuova&visuale=camera`);
  await pg.waitForFunction(() => window.__pv && window.__pv.st, null, { timeout: +(process.env.GALLERIA_CARICO || 900000) });
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(1500);
  await pg.addStyleTag({ content: '#app > *:not(#cv) { visibility: hidden !important; } #bubbles, #hover, #moment, #xhair, #ring, #touch { display: none !important; }' });
  console.log('caricato in', ((Date.now() - t0) / 1000).toFixed(0), 's');
  // 1) il cammino simulato a 30 fps, coi cinque istanti
  const F = await pg.evaluate(C => {
    const pv = window.__pv, st = pv.st, R = pv.R, V = window.Visuale, K = V.CAMERA4, M = V.mappa(pv.G.MAP.world), YAW = R.YAW, dt = 1 / 30;
    st.deadline = 1e12; setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.desat = false; u.letterbox = false; u.dialog = null; st.over = null; st.chase = false; st.player.hp = 100; }, 50);
    const S = {}, T = []; let t = 0;
    for (let k = 1; k < C.length; k++) { const [ax, az] = C[k - 1], [bx, bz] = C[k], l = Math.hypot(bx - ax, bz - az);
      for (let s = 0; s < l; s += 1.4 * dt) { const x = ax + (bx - ax) * s / l, z = az + (bz - az) * s / l, m = V.misura(M, x, z, R.groundH(x, z), Math.sin(YAW), Math.cos(YAW), K);
        const c0 = S.cambi || 0; V.camPasso(S, m, dt, K, YAW); t += dt; T.push({ t, x, z, face: Math.atan2(bz - az, bx - ax), p: S.p, zoom: S.z, on: S.on, s: m.s, larg: m.larg, cambio: (S.cambi || 0) > c0 }); } }
    const ci = T.map((q, i) => q.cambio ? i : -1).filter(i => i >= 0), at = tt => T.reduce((a, q) => Math.abs(q.t - tt) < Math.abs(a.t - tt) ? q : a, T[0]);
    const tin = ci.length ? T[ci[0]].t : T[T.length >> 2].t, tout = ci.length > 1 ? T[ci[1]].t : T[(T.length * 3) >> 2].t, deep = T.reduce((a, q) => q.z < a.z ? q : a, T[0]);
    const pick = [['sulla Vittoria', at(Math.max(0, tin - 2.5))], ['nel vicolo da 0,35 s', at(tin + .35)], ['in fondo al vicolo', deep], ['fuori da 0,35 s', at(tout + .35)], ['sulla via, a regime', at(Math.min(T[T.length - 1].t, tout + 2.2))]];
    return { durata: t, cambi: ci.map(i => +T[i].t.toFixed(2)), foto: pick.map(([nome, q]) => Object.assign({ nome }, q)) };
  }, CAMMINO);
  console.log('cammino', F.durata.toFixed(1), 's, cambi a', F.cambi.join(', '));
  // 2) i cinque fotogrammi
  for (let i = 0; i < F.foto.length; i++) { const f = F.foto[i];
    await pg.evaluate(f => { const pv = window.__pv, st = pv.st, p = st.player, R = pv.R, ui = pv.ui;
      p.vehicle = null; p.indoor = null; p.lv = null; p.x = f.x; p.y = f.z; p.path = []; p.face = f.face; let tt = Math.floor(st.t / 1440) * 1440 + 660; if (tt < st.t - 1) tt += 1440; st.t = tt; window.__meteo = 'sereno';
      ui.focus = null; ui.zoom = .4; R.cam.x = R.cam.tx = f.x; R.cam.y = R.cam.ty = f.z; R.cam.zoom = R.cam.tz = .4; R.cam.uy = 0;
      R.setVisuale('camera', true); const V4 = R.__vis4; V4.fermo = true; Object.assign(V4.C, { on: f.on, p: f.p, pT: f.p, z: f.zoom, g: 0 });
      const ld = setInterval(() => { try { Render.ISO.rush = true; R.updateChunks(R.cam.x, R.cam.y); } finally { Render.ISO.rush = false; } }, 150); setTimeout(() => clearInterval(ld), 30000); }, f);
    for (let k = 0, quiet = 0, tb = Date.now(); Date.now() - tb < 40000 && quiet < 2; k++) { await pg.waitForTimeout(1000); quiet = (await pg.evaluate(() => !(window.__pv.R.ISO && window.__pv.R.ISO.job))) ? quiet + 1 : 0; }
    await pg.waitForTimeout(i ? 6000 : 15000);
    const url = await pg.evaluate(() => new Promise(res => requestAnimationFrame(() => res(document.getElementById('cv').toDataURL('image/png')))));
    fs.writeFileSync(path.join(outDir, `f${i + 1}.png`), Buffer.from(url.split(',')[1], 'base64'));
    console.log('foto', i + 1, f.nome, `pendenza ${f.p.toFixed(2)} zoom ${f.zoom.toFixed(2)} stretta ${f.on}`); }
  fs.writeFileSync(path.join(outDir, 'striscia.json'), JSON.stringify(F, null, 1));
  console.log('fatto in', ((Date.now() - t0) / 60000).toFixed(1), 'min'); await b.close(); srv.close();
});
