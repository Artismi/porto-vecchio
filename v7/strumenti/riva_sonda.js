// [riva] Dove costa la riva fine: node strumenti/riva_sonda.js x y zoom — nella stessa pagina, fermi sul punto, spegne un pezzo alla
// volta (il suolo fine, gli scogli, i ciottoli e i detriti, i margini, l'acqua trasparente, le ombre) e misura il fotogramma (mediana di 7)
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const [X, Y, Z] = process.argv.slice(2).map(Number), root = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };
const srv = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html'; if (u.startsWith('/api/')) { res.writeHead(200); res.end('{}'); return; } const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); }).listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }), pg = await b.newPage({ viewport: { width: 1280, height: 800 } });
  pg.on('pageerror', e => console.log('[errore]', e.message));
  await pg.addInitScript(() => { window.__pulita = true; }); await pg.goto(`http://localhost:${srv.address().port}/index.html?cittanuova`); await pg.waitForFunction(() => window.__pv && window.__pv.st, null, { timeout: 900000 });
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(1500);
  await pg.evaluate(s => { const pv = window.__pv, st = pv.st; st.deadline = 1e12; pv.R.gpuTiming && pv.R.gpuTiming(true); setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.dialog = null; st.over = null; st.player.hp = 100; }, 50);
    st.player.x = s[0]; st.player.y = s[1]; pv.ui.focus = { x: s[0], y: s[1] }; pv.ui.zoom = s[2]; window.__meteo = 'sereno'; }, [X, Y, Z]);
  for (let quiet = 0, tb = Date.now(); Date.now() - tb < 300000 && quiet < 4;) { await pg.waitForTimeout(2000); quiet = (await pg.evaluate(() => !window.__pv.R.ISO.job)) ? quiet + 1 : 0; }
  await pg.waitForTimeout(8000);
  const misura = () => pg.evaluate(() => new Promise(res => { const t = []; let last = performance.now(), k = 0; const step = () => { const n = performance.now(); t.push(n - last); last = n; if (++k < 9) requestAnimationFrame(step); else { t.shift(); t.sort((a, b) => a - b); const g = window.__pv.R.gpuTimes, i = g && g.info; res({ ms: Math.round(t[Math.floor(t.length / 2)]), dc: i && i.calls, tri: i && i.tris }); } }; requestAnimationFrame(step); }));
  const tocca = (cosa, on) => pg.evaluate(([cosa, on]) => { const sc = window.__pv.R.__models.scene; sc.traverse(o => {
      if (cosa === 'suolo' && o.name === 'riva9') o.visible = on; if (cosa === 'scogli' && o.name === 'riva9s') o.visible = on; if (cosa === 'sassi' && (o.name === 'riva9c' || o.name === 'riva9d')) o.visible = on;
      if (cosa === 'margini' && /^riva9[btp]$/.test(o.name)) o.visible = on; if (cosa === 'acqua' && o.material && o.material.uniforms && o.material.uniforms.RIVA9) { o.material.transparent = !on ? false : true; o.material.needsUpdate = true; }
      if (cosa === 'ombre' && (o.isMesh || o.isInstancedMesh) && /^riva9/.test(o.name)) o.castShadow = on && o.name !== 'riva9' && o.name !== 'riva9c'; }); }, [cosa, on]);
  console.log('tutto acceso', JSON.stringify(await misura()));
  for (const c of ['suolo', 'scogli', 'sassi', 'margini', 'acqua', 'ombre']) { await tocca(c, false); await pg.waitForTimeout(1500); console.log('senza', c.padEnd(8), JSON.stringify(await misura())); await tocca(c, true); await pg.waitForTimeout(1500); }
  await pg.goto('about:blank'); await b.close(); srv.close(); });
