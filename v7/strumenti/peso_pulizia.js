// [pulizia] Il peso della scena intera, per il prima e dopo della passata del rumore: mesh (≈ chiamate di disegno possibili), triangoli,
// vertici scartati alla fusione (window.__scartate) e le chiamate e i triangoli disegnati da una camera fissa (renderer.info).
//   node strumenti/peso_pulizia.js [pagina.html] [query]      es.: node strumenti/peso_pulizia.js index.html '?cittanuova&norumore'
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const root = path.resolve(__dirname, '..'), [pagina = 'index.html', query = '?cittanuova'] = process.argv.slice(2);
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };
const srv = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html'; if (u.startsWith('/api/')) { res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); }).listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 1280, height: 800 } }); const err = [];
  pg.on('pageerror', e => err.push(e.message));
  await pg.goto(`http://localhost:${srv.address().port}/${pagina}${query}`);
  await pg.waitForFunction(() => window.__pv && window.__pv.st && window.__pv.R, null, { timeout: 600000, polling: 2000 });
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(3000);
  const R = await pg.evaluate(async () => {
    const pv = window.__pv, R = pv.R, scene = typeof R.scene === 'function' ? R.scene() : R.scene, rend = typeof R.renderer === 'function' ? R.renderer() : R.renderer; 
    const S = { mesh: 0, tri: 0, statiche: 0, triStatiche: 0 };
    const sn = scene || window.__scene; if (sn) sn.traverse(o => { if (!o.isMesh || !o.geometry) return; const g = o.geometry, n = (g.index ? g.index.count : (g.attributes.position ? g.attributes.position.count : 0)) / 3 * (o.isInstancedMesh ? o.count : 1); S.mesh++; S.tri += n; if (o.matrixAutoUpdate === false && !o.isInstancedMesh) { S.statiche++; S.triStatiche += n; } });
    pv.ui.focus = { x: 1380, y: 343 }; pv.ui.zoom = .72; if (R.cam) { R.cam.x = R.cam.tx = 1380; R.cam.y = R.cam.ty = 343; R.cam.zoom = R.cam.tz = .72; }
    await new Promise(r => setTimeout(r, 15000));
    const inf = rend ? rend.info.render : null;
    return { S, scartate: window.__scartate || null, vista: inf ? { draw: inf.calls, tri: inf.triangles } : null, rumore: window.__rumore ? window.__rumore.numeri : null };
  });
  console.log(JSON.stringify({ pagina, query, ...R, errori: err }));
  await b.close(); srv.close();
});
