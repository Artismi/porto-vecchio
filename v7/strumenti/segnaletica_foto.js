// [segnaletica] Le foto e le misure della segnaletica (città nuova): per ogni scena la stessa inquadratura col filone acceso e spento
// (Segnaletica.mostra), le chiamate di disegno e i triangoli dello stesso fotogramma (R.gpuTiming: renderer.info della passata della
// scena). Stesso motore di strumenti/galleria.js (Chromium senza testa con SwiftShader, il gioco vero servito da qui).
//   node strumenti/segnaletica_foto.js <cartella> [scene.json] [larghezza altezza]
//   scene.json: [{ "nome", "x", "y", "zoom", "ora", "meteo" }]; senza: le scene qui sotto. SOLO=a,b: solo quelle.
// Esce: <nome>_dopo.png, <nome>_prima.png e misure.json ({ nome: { dopo: {calls, tris}, prima: {...}, segnaletica: {...} } }).
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const [outDir, sceneFile, W0, H0] = process.argv.slice(2);
if (!outDir) { console.log('uso: node strumenti/segnaletica_foto.js <cartella> [scene.json] [larghezza altezza]'); process.exit(1); }
const SCENE0 = [
  { nome: 'vittoria', titolo: 'La Via della Vittoria: mezzeria, margini, zebre, il divieto di sosta, le lunette sotto i portici', x: 1404, y: 343, zoom: .95, ora: 720 },
  { nome: 'borgo', titolo: 'Il borgo: le bandiere dei mestieri sulla Rua, l\'area pedonale', x: 1430, y: 318, zoom: .72, ora: 660 },
  { nome: 'corso', titolo: 'Il Corso al Mercato: le frecce verso Stazione, Scalo, Porto; zebre, BUS, STOP', x: 1300, y: 350, zoom: .8, ora: 600 },
  { nome: 'marina', titolo: 'La marina: pescheria, osterie, la freccia per il Lido e la Rocca', x: 1405, y: 386, zoom: .8, ora: 540 },
  { nome: 'notte', titolo: 'Di notte: si accendono farmacia, bar, tabacchi, trattorie', x: 1430, y: 318, zoom: .72, ora: 1290 },
  { nome: 'citta', titolo: 'La città intera (per contare le chiamate di disegno)', x: 1420, y: 340, zoom: 4, ora: 840 },
];
const SCENE = (sceneFile ? JSON.parse(fs.readFileSync(sceneFile, 'utf8')) : SCENE0).filter(s => !process.env.SOLO || process.env.SOLO.split(',').includes(s.nome));
const root = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };
fs.mkdirSync(outDir, { recursive: true });
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const port = srv.address().port, W = +(W0 || 1280), H = +(H0 || 800), t0 = Date.now();
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: W, height: H } });
  pg.on('pageerror', e => console.log('[errore]', e.message, (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  pg.on('console', m => { if (m.type() === 'error' || /\[segnaletica\]/.test(m.text())) console.log('[console]', m.text().slice(0, 400)); });
  await pg.addInitScript(() => { window.__pulita = true; window.__sgdbg = true; });
  await pg.goto(`http://localhost:${port}/index.html?cittanuova`);
  await pg.waitForFunction(() => window.__pv && window.__pv.st, null, { timeout: 900000 });
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(1500);
  await pg.addStyleTag({ content: '#app > *:not(#cv) { visibility: hidden !important; } #bubbles, #hover, #moment, #xhair, #ring, #touch { display: none !important; }' });
  await pg.evaluate(() => { const pv = window.__pv, st = pv.st; st.deadline = 1e12; if (pv.R.gpuTiming) pv.R.gpuTiming(true);
    setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.desat = false; u.letterbox = false; u.dialog = null; u.book = false; u.menu = false; st.over = null; st.chase = false; st.player.hp = 100; }, 50); });
  console.log('caricato in', ((Date.now() - t0) / 1000).toFixed(0), 's');
  const misure = fs.existsSync(path.join(outDir, 'misure.json')) ? JSON.parse(fs.readFileSync(path.join(outDir, 'misure.json'), 'utf8')) : {};
  const scatta = async (file) => { const r = await pg.evaluate(() => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(() => { const cv = document.getElementById('cv'), i = window.__pv.R.gpuTimes && window.__pv.R.gpuTimes.info; res({ url: cv.toDataURL('image/png'), info: i ? { calls: i.calls, tris: i.tris } : null }); }))));
    fs.writeFileSync(file, Buffer.from(r.url.split(',')[1], 'base64')); return r.info; };
  for (const s of SCENE) {
    const ts = Date.now();
    await pg.evaluate(s => { const pv = window.__pv, st = pv.st, p = st.player, R = pv.R, ui = pv.ui;
      p.vehicle = null; p.indoor = null; p.lv = null; p.x = s.x; p.y = s.y; p.path = [];
      if (s.ora !== undefined) { let t = Math.floor(st.t / 1440) * 1440 + s.ora; if (t < st.t - 1) t += 1440; st.t = t; }
      window.__meteo = s.meteo || 'sereno'; ui.focus = { x: s.x, y: s.y }; ui.zoom = s.zoom || 1;
      if (R && R.cam) { R.cam.x = R.cam.tx = s.x; R.cam.y = R.cam.ty = s.y; R.cam.zoom = R.cam.tz = ui.zoom; } }, s);
    await pg.waitForTimeout(2500);
    for (let k = 0, quiet = 0, tb = Date.now(); Date.now() - tb < 60000 && quiet < 2; k++) { await pg.waitForTimeout(1000); quiet = (await pg.evaluate(() => !(window.__pv.R.ISO && window.__pv.R.ISO.job) && !!window.__segnaletica)) ? quiet + 1 : 0; }
    await pg.waitForTimeout(s.attesa || 3000);
    const dopo = await scatta(path.join(outDir, s.nome + '_dopo.png'));
    await pg.evaluate(() => window.Segnaletica && Segnaletica.mostra(false));
    const prima = await scatta(path.join(outDir, s.nome + '_prima.png'));
    await pg.evaluate(() => window.Segnaletica && Segnaletica.mostra(true));
    // le chiamate in più, esatte: le mesh del filone dentro la piramide della camera (ognuna è una chiamata; non fanno ombra)
    const campo = await pg.evaluate(() => { const R = window.__pv.R, cam = R.getCamera(); cam.updateMatrixWorld(); const fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
      const M = window.Segnaletica ? Segnaletica.mesh : [], dentro = M.filter(m => fr.intersectsObject(m)); return { inCampo: dentro.length, totale: M.length, perMateriale: dentro.reduce((o, m) => (o[m.userData.segnaletica] = (o[m.userData.segnaletica] || 0) + 1, o), {}) }; });
    const sg = await pg.evaluate(() => window.__segnaletica || null);
    misure[s.nome] = { titolo: s.titolo || s.nome, dopo, prima, piu: dopo && prima ? dopo.calls - prima.calls : null, campo, segnaletica: sg };
    fs.writeFileSync(path.join(outDir, 'misure.json'), JSON.stringify(misure, null, 1));
    console.log('ok', s.nome, 'chiamate', prima && prima.calls, '→', dopo && dopo.calls, 'mesh del filone in campo', campo.inCampo + '/' + campo.totale, ((Date.now() - ts) / 1000).toFixed(0) + ' s');
  }
  await b.close(); srv.close(); console.log('fatto in', ((Date.now() - t0) / 1000).toFixed(0), 's');
});
