// [inquadratura] LE FOTO DEL PRIMA E DOPO: i punti peggiori misurati da strumenti/inquadratura.js, nel gioco vero (?cittanuova), con la
// camera di ogni variante nello stato che la simulazione ha trovato camminando fin lì (yaw, pendenza, zoom; i tagli li rifà il gioco).
//   node strumenti/foto_inquadratura.js <misura.json> <cartella> [quanti] [larghezza altezza]
// Sopra lo stesso motore di strumenti/galleria.js (Chromium senza testa con SwiftShader). 'oggi' è la camera di [visuale5]
// (R.setInquadratura(null), come ?vecchiacamera). VARIANTI=oggi,asse_taglio: solo quelle; FORMATO=tel: i punti del telefono (in verticale).
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const [misura, outDir, N0, W0, H0] = process.argv.slice(2);
if (!outDir) { console.log('uso: node strumenti/foto_inquadratura.js <misura.json> <cartella> [quanti] [larghezza altezza]'); process.exit(1); }
const MIS = JSON.parse(fs.readFileSync(misura, 'utf8')), TEL = process.env.FORMATO === 'tel', PUNTI = (TEL ? MIS.peggioriTel : MIS.peggioriPC).slice(0, +(N0 || 6));
const VAR = (process.env.VARIANTI || MIS.varianti.join(',')).split(','), root = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };
fs.mkdirSync(outDir, { recursive: true });
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const port = srv.address().port, W = +(W0 || (TEL ? 390 : 960)), H = +(H0 || (TEL ? 844 : 540)), t0 = Date.now();
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: W, height: H } });
  const errori = []; pg.on('pageerror', e => { errori.push(e.message); console.log('[errore]', e.message, (e.stack || '').split('\n').slice(0, 3).join(' | ')); });
  pg.on('console', m => { if (m.type() === 'error' || /\[inquadratura\]|\[visuale/.test(m.text())) console.log('[console]', m.text().slice(0, 240)); });
  await pg.addInitScript(() => { window.__pulita = true; });
  await pg.goto(`http://localhost:${port}/index.html${process.env.PV_QUERY !== undefined ? process.env.PV_QUERY : '?cittanuova'}`);
  await pg.waitForFunction(() => window.__pv && window.__pv.st, null, { timeout: 900000 });
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(1500);
  await pg.addStyleTag({ content: '#app > *:not(#cv) { visibility: hidden !important; } #bubbles, #hover, #moment, #xhair, #ring, #touch { display: none !important; }' });
  await pg.evaluate(() => { const pv = window.__pv, st = pv.st; st.deadline = 1e12;
    setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.desat = false; u.letterbox = false; u.dialog = null; u.book = false; u.menu = false; u.intro = false; st.over = null; st.chase = false; st.player.hp = 100; }, 50); });
  console.log('caricato in', ((Date.now() - t0) / 1000).toFixed(0), 's', 'variante del gioco:', await pg.evaluate(() => window.__pv.R.__iq5 && window.__pv.R.__iq5.nome));
  const fatti = [];
  for (let n = 0; n < PUNTI.length; n++) { const P = PUNTI[n], ts = Date.now();
    await pg.evaluate(P => { const pv = window.__pv, st = pv.st, p = st.player, R = pv.R, ui = pv.ui;
      p.vehicle = null; p.indoor = null; p.lv = null; p.x = P.x; p.y = P.z; p.path = []; if (p.vx !== undefined) { p.vx = 0; p.vy = 0; }
      let t = Math.floor(st.t / 1440) * 1440 + 660; if (t < st.t - 1) t += 1440; st.t = t; window.__meteo = 'sereno';
      ui.focus = null; ui.zoom = .72; R.cam.x = P.x; R.cam.y = P.z; R.cam.zoom = .72; R.cam.uy = 0; R.cam.mano = {};
      const ld = setInterval(() => { try { Render.ISO.rush = true; R.updateChunks(R.cam.x, R.cam.y); } finally { Render.ISO.rush = false; } }, 150); setTimeout(() => clearInterval(ld), 40000); }, P);
    for (let k = 0, quiet = 0, tb = Date.now(); Date.now() - tb < 60000 && quiet < 2; k++) { await pg.waitForTimeout(1000); quiet = (await pg.evaluate(() => !(window.__pv.R.ISO && window.__pv.R.ISO.job))) ? quiet + 1 : 0; }
    await pg.waitForTimeout(3000);
    for (const v of VAR) { const q = P.varianti[v]; if (!q) continue;
      await pg.evaluate(({ v, q }) => { const R = window.__pv.R, V4 = R.__vis4, I = R.__iq5; R.setVisuale('camera', true); V4.fermo = true;
        R.setInquadratura(v === 'oggi' ? null : v); R.cam.uy = 0; R.cam.mano = {};
        Object.assign(V4.C, { on: q.pitch > .8, p: q.pitch, pT: q.pitch, z: q.z4, g: 0 });
        if (v !== 'oggi') { I.dy = q.yaw - R.YAW; I.p = q.pitch; I.z = q.z4; I.S.dy = I.S.dyT = I.dy; } }, { v, q });
      // tre fotogrammi: la camera va al suo posto, i tagli scendono (subito), la sagoma
      for (let k = 0; k < 3; k++) await pg.evaluate(() => new Promise(r => requestAnimationFrame(() => r())));
      const shot = await pg.evaluate(() => new Promise(res => requestAnimationFrame(() => { const cv = document.getElementById('cv'); const R = window.__pv.R; res({ url: cv.toDataURL('image/png'), tagli: R.__vis3 ? R.__vis3.vivi.size : 0, sbiaditi: R.__vis4.tvivi.size, yaw: R.cam.yaw }); })));
      const file = path.join(outDir, `${TEL ? 'tel' : 'pc'}_${String(n + 1).padStart(2, '0')}_${v}.png`); fs.writeFileSync(file, Buffer.from(shot.url.split(',')[1], 'base64'));
      fatti.push({ n: n + 1, v, file: path.basename(file), perc: P.perc, x: P.x, z: P.z, misura: q, gioco: { tagli: shot.tagli, sbiaditi: shot.sbiaditi, yaw: shot.yaw } });
      console.log(`ok ${n + 1} ${P.perc} ${v} (tagli ${shot.tagli}, tetti sbiaditi ${shot.sbiaditi}) ${((Date.now() - ts) / 1000).toFixed(0)} s`); }
  }
  fs.writeFileSync(path.join(outDir, `${TEL ? 'tel' : 'pc'}_foto.json`), JSON.stringify({ quando: new Date().toISOString(), W, H, errori, foto: fatti }, null, 1));
  console.log('fatto in', ((Date.now() - t0) / 60000).toFixed(1), 'min; errori', errori.length);
  await b.close(); srv.close();
});
