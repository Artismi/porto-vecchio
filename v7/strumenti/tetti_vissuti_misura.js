// [vissuti] La misura dei tetti vissuti nel gioco vero (Chromium senza testa con SwiftShader, ?cittanuova): i disegni e i triangoli della
// scena per fotogramma (render.js GPUT.info: la scena con le sue ombre, senza il post) nel borgo, sulla Vittoria e sulla città dall'alto
// (zoom 4,2), e le mesh accese in tutta la scena (il tetto di tutti i disegni possibili); il conto dei pezzi (window.__vissuti), le
// compenetrazioni dei pezzi misurate sul modello vero (window.__tetti3, come strumenti/compenetrazioni.js) e le foto di controllo.
//   node strumenti/tetti_vissuti_misura.js <cartella> [--prima]      --prima: ?novissuti (tutto spento, lo stesso codice)
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const root = path.resolve(__dirname, '..'), args = process.argv.slice(2), prima = args.includes('--prima'), out = args.find(a => !a.startsWith('--')) || path.join(root, 'reports', 'vissuti');
const VISTE = [{ nome: 'borgo', x: 1400, y: 312, zoom: 1 }, { nome: 'vittoria', x: 1360, y: 334, zoom: 1 }, { nome: 'citta', x: 1100, y: 380, zoom: 4.2 }];
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };
fs.mkdirSync(out, { recursive: true });
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const t0 = Date.now(), b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 960, height: 600 } }), errori = [];
  pg.on('pageerror', e => { errori.push(e.message); console.log('[errore]', e.message, (e.stack || '').split('\n').slice(0, 3).join(' | ')); });
  pg.on('console', m => { if (m.type() === 'error' || /vissuti|leggero/.test(m.text())) console.log('[console]', m.text().slice(0, 300)); });
  await pg.addInitScript(() => { window.__pulita = true; });
  await pg.goto(`http://localhost:${srv.address().port}/index.html?cittanuova${prima ? '&novissuti' : ''}`);
  await pg.waitForFunction(() => window.__pv && window.__pv.st, null, { timeout: 900000, polling: 2000 });
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(1500);
  await pg.evaluate(() => { const pv = window.__pv, st = pv.st; st.deadline = 1e12; pv.R.gpuTiming(true); setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.desat = false; u.dialog = null; st.over = null; st.chase = false; st.player.hp = 100; }, 50); });
  console.log('caricato in', Math.round((Date.now() - t0) / 1000), 's');
  const R = { prima, viste: {}, errori };
  for (const v of VISTE) {
    await pg.evaluate(v => { const pv = window.__pv, st = pv.st, p = st.player; p.vehicle = null; p.indoor = null; p.lv = null; p.x = v.x; p.y = v.y; p.path = [];
      st.t = Math.floor(st.t / 1440) * 1440 + 1440 + 720; window.__meteo = 'sereno'; pv.ui.focus = { x: v.x, y: v.y }; pv.ui.zoom = v.zoom; const c = pv.R.cam; c.x = c.tx = v.x; c.y = c.ty = v.y; c.zoom = c.tz = v.zoom; }, v);
    for (let k = 0, quiet = 0, tb = Date.now(); Date.now() - tb < 60000 && quiet < 2; k++) { await pg.waitForTimeout(1000); quiet = (await pg.evaluate(() => !(window.__pv.R.ISO && window.__pv.R.ISO.job))) ? quiet + 1 : 0; }
    await pg.waitForTimeout(3000);
    const m = await pg.evaluate(() => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(() => { const R = window.__pv.R, i = R.gpuTimes.info || {}; res({ calls: i.calls, tris: i.tris, progs: i.progs }); }))));
    const buf = await pg.evaluate(() => new Promise(res => requestAnimationFrame(() => res(document.getElementById('cv').toDataURL('image/png')))));
    fs.writeFileSync(path.join(out, (prima ? 'prima_' : 'dopo_') + v.nome + '.png'), Buffer.from(buf.split(',')[1], 'base64'));
    // i disegni dei tetti vissuti nella stessa scena: si spengono le mesh col marchio (le fuse per settore col materiale dei pezzi, le
    // istanze vicine) e le loro sagome d'ombra, si misura il fotogramma dopo, si riaccendono: la differenza è il loro costo esatto
    if (!prima) { const d = await pg.evaluate(() => new Promise(res => { const S = window.__pv.R.__models.scene, mie = [], pos = new Set();
      S.traverse(o => { if (o.isMesh && o.visible && o.material && o.material.userData && o.material.userData.vissuti) { mie.push(o); if (o.geometry.attributes.position) pos.add(o.geometry.attributes.position); } });
      S.traverse(o => { if (o.isMesh && o.visible && o.userData.ombra1 && pos.has(o.geometry.attributes.position)) mie.push(o); });
      requestAnimationFrame(() => requestAnimationFrame(() => { const a = Object.assign({}, window.__pv.R.gpuTimes.info); mie.forEach(o => o.visible = false);
        requestAnimationFrame(() => requestAnimationFrame(() => { const b = Object.assign({}, window.__pv.R.gpuTimes.info); mie.forEach(o => o.visible = true); res({ mesh: mie.length, conTutto: a.calls, senza: b.calls, disegni: a.calls - b.calls, triangoli: a.tris - b.tris }); })); })); }));
      m.vissuti = d; }
    R.viste[v.nome] = m; console.log(v.nome, JSON.stringify(m));
  }
  R.scena = await pg.evaluate(() => { const S = window.__pv.R.__models.scene; let mesh = 0, vis = 0, ist = 0; S.traverse(o => { if (o.isMesh) { mesh++; if (o.visible) { vis++; if (o.isInstancedMesh) ist++; } } }); return { mesh, accese: vis, istanze: ist }; });
  R.vissuti = await pg.evaluate(() => window.__vissuti || null);
  R.tetti3 = await pg.evaluate(() => { const T = window.__tetti3 ? window.__tetti3() : null; return T ? { urti: T.urti, vissuti: T.vissuti, verifica: T.verifica } : null; });
  R.fusione = await pg.evaluate(() => window.__fusione1 || null);
  console.log('scena', JSON.stringify(R.scena), '\nvissuti', JSON.stringify(R.vissuti), '\nfusione', JSON.stringify(R.fusione));
  if (R.tetti3) { const ut = {}; R.tetti3.urti.forEach(u => ut[u[2]] = (ut[u[2]] || 0) + 1); console.log('compenetrazioni sui tetti', R.tetti3.urti.length, JSON.stringify(ut)); R.tetti3.urti.slice(0, 30).forEach(u => console.log('  ' + u.join('  '))); console.log('conto', JSON.stringify(R.tetti3.vissuti)); }
  fs.writeFileSync(path.join(out, (prima ? 'prima' : 'dopo') + '.json'), JSON.stringify(R, null, 1));
  await b.close(); srv.close();
});
