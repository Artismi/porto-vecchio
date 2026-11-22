// [texture] la sonda del suolo: chi c'è sotto un punto dello schermo (la mesh, il materiale, se ha il disegno del suolo), e cosa dice la
// mappa del blocco lì. Profilo del telefono come nel Game Boy, senza la pagina d'ingresso.
//   node strumenti/texture_sonda.js x y dir [ny...]   (da v7; IMPRONTA=<hex> per provare coi tasselli di prima)
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium, devices } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');
const V7 = path.resolve(__dirname, '..'); const [X, Y, DIR] = process.argv.slice(2, 5).map(Number); const NYS = process.argv.slice(5).map(Number);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.bin': 'application/octet-stream', '.glb': 'model/gltf-binary', '.gz': 'application/gzip' };
const srv = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html'; if (u.startsWith('/api/')) { res.writeHead(503); res.end(); return; }
  const f = path.join(V7, u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; }
    if (process.env.IMPRONTA && u === '/index.html') d = Buffer.from(String(d).replace(/PV_IMPRONTA_TASS = '[0-9a-f]+'/, `PV_IMPRONTA_TASS = '${process.env.IMPRONTA}'`));
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(d); }); }).listen(0, async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 362, height: 692 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1, userAgent: devices['Pixel 7'].userAgent });
  const pg = await ctx.newPage(); await pg.addInitScript(() => { window.__PAV_TIENI = true; }); pg.on('pageerror', e => console.log('[errore]', e.message.slice(0, 200)));
  await pg.goto(`http://localhost:${srv.address().port}/index.html`, { timeout: 240000, waitUntil: 'commit' });
  await pg.waitForFunction(() => window.__pv && window.__pv.st && window.__pv.R, null, { timeout: 900000, polling: 2000 });
  await pg.evaluate(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); const pv = window.__pv; pv.ui.intro = false; });
  await pg.waitForTimeout(4000);
  await pg.evaluate(([x, y, d]) => { const pv = window.__pv, R = pv.R, st = pv.st, p = st.player, h = d * Math.PI / 180; p.x = x; p.y = y; p.face = h; R.snap(st); R.cam.uy = Math.atan2(-Math.cos(h), -Math.sin(h)) - R.YAW; const c = R.cam; for (const [a, bb] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) { c.x = x + a * 48; c.y = y + bb * 48; try { R.preparaArrivo(); } catch (e) { } } R.snap(st); }, [X, Y, DIR]);
  for (let i = 0; i < 40; i++) { await pg.waitForTimeout(3000); const ok = await pg.evaluate(([x, y]) => { const I = window.__pv.R.ISO, Wc = I.CH * 2; return !I.job && I.chunks.has(Math.floor(x / Wc) + ',' + Math.floor(y / Wc)); }, [X, Y]); if (ok) break; }
  await pg.evaluate(() => { const pv = window.__pv; const ui = { focus: null, zoom: pv.ui.zoom, time: 0, stick: null, lead: null, tilt: 0, rot: 0, drag: 0, edge: 0, puntatore: false, reale: 1e-3, mira: null }; for (let i = 0; i < 10; i++) pv.R.frame(pv.st, .05, ui); });
  const r = await pg.evaluate(NYS => { const pv = window.__pv, R = pv.R, cam = R.getCamera(), sc = R.__models.scene, ray = new THREE.Raycaster(), out = [];
    for (const ny of (NYS.length ? NYS : [-.2, -.5])) { ray.setFromCamera({ x: 0, y: ny }, cam); const hits = ray.intersectObjects(sc.children, true).filter(h => { const m = Array.isArray(h.object.material) ? h.object.material[0] : h.object.material; return h.object.visible && h.object.isMesh && m && !m.isShaderMaterial && h.object.name !== 'pesoPiane' && !m.transparent; }).slice(0, 3);
      out.push({ ny, hits: hits.map(h => { const m = Array.isArray(h.object.material) ? h.object.material[h.face ? h.face.materialIndex : 0] : h.object.material; return { d: +h.distance.toFixed(2), p: [+h.point.x.toFixed(2), +h.point.y.toFixed(2), +h.point.z.toFixed(2)], nome: h.object.name, tipo: m && m.type, tassello: !!(m && m.userData && m.userData.tassello), pav: !!(m && m.userData && (m.userData.pav || m.userData.pavB)), chiave: m && m.customProgramCacheKey ? String(m.customProgramCacheKey()).slice(0, 80) : '', sonda: window.__PAV ? window.__PAV.sonda(h.point.x, h.point.z) : null }; }) }); }
    return out; }, NYS);
  const g = await pg.evaluate(([x, y]) => { const P = window.__PAV, T = window.__pv.G.T, inv = {}; for (const k in T) inv[T[k]] = k; const rows = [];
    for (let dz = -8; dz <= 8; dz += 2) { const row = []; for (let dx = -8; dx <= 8; dx += 2) { const q = P.sonda(x + dx, y + dz); row.push(q.blocco === false || q.liberata ? '?' : q.rf + '/' + q.gf + (q.hw ? '·' + q.hw : '')); } rows.push((y + dz) + ': ' + row.join(' ')); }
    return rows; }, [X, Y]);
  console.log(JSON.stringify(r, null, 1)); console.log(g.join('\n')); await b.close(); srv.close();
});
