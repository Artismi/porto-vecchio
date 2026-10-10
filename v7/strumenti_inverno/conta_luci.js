// Le luci vere della scena e quanto costa un fotogramma: node strumenti_inverno/conta_luci.js [luogo] [radice]
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const [luogo = 'piazza', root0] = process.argv.slice(2);
const root = path.resolve(root0 || path.join(__dirname, '..'));
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 1280, height: 800 } });
  pg.on('pageerror', e => console.log('[errore]', e.message));
  await pg.goto(`http://localhost:${srv.address().port}/index.html`);
  await pg.waitForFunction(() => window.__pv && window.__pv.st, null, { timeout: 300000 });
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(1500);
  await pg.evaluate(l => { const pv = window.__pv, st = pv.st, P = pv.G.PLACES && pv.G.PLACES[l]; if (P) { st.player.x = P.x; st.player.y = P.y; } st.t = Math.floor(st.t / 1440) * 1440 + 780; }, luogo);
  await pg.waitForTimeout(5000);
  const res = await pg.evaluate(async () => {
    const R = window.__pv.R, rd = R.__models.renderer, sc = R.__models.scene;
    const L = []; sc.traverse(o => { if (!o.isLight || o.isAmbientLight || o.isHemisphereLight) return; let v = true, q = o, ch = []; while (q) { if (!q.visible) v = false; if (q.name) ch.push(q.name); q = q.parent; }
      L.push({ tipo: o.type, ombra: !!o.castShadow, mappa: o.shadow && o.shadow.mapSize ? o.shadow.mapSize.x : 0, intens: +(o.intensity || 0).toFixed(2), dist: o.distance || 0, visibile: v, nomi: ch.slice(0, 3).join('<'), pos: o.position.toArray().map(n => Math.round(n)).join(',') }); });
    const tipi = {}; L.forEach(l => { const k = `${l.tipo}${l.ombra ? '+ombra' + l.mappa : ''}${l.visibile ? '' : ' (spenta)'}`; tipi[k] = (tipi[k] || 0) + 1; });
    rd.info.autoReset = false; rd.info.reset(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); const one = { calls: rd.info.render.calls, triangoli: rd.info.render.triangles, punti: rd.info.render.points }; rd.info.autoReset = true;
    return { tipi, ombre_auto: rd.shadowMap.autoUpdate, ombre_tipo: rd.shadowMap.type, pixel_ratio: rd.getPixelRatio(), dimensione: rd.getSize(new (window.THREE.Vector2)()).toArray(), un_fotogramma: one, luci: L.slice(0, 60) };
  });
  console.log(JSON.stringify(res, null, 1));
  await b.close(); srv.close();
});
