// [percorsi] controllo nel gioco vero (Chromium senza testa, ?cittanuova): la rete è legata, le lanterne e le soglie sono posate,
// le briciole dei tetti (traccia, lanterne, bucato, corde, casse) sono disegnate, nessun errore. Facoltativo: una foto da vicino.
//   node strumenti/percorsi_check.js [foto.png x y zoom ora]
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const [foto, fx, fy, fz, fo] = process.argv.slice(2), root = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };
const srv = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html'; if (u.startsWith('/api/')) { res.writeHead(200); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); }).listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 1280, height: 800 } }); const err = [];
  pg.on('pageerror', e => err.push(e.message)); pg.on('console', m => { if (m.type() === 'error' || /percorsi|Tetti/.test(m.text())) err.push(m.text().slice(0, 200)); });
  await pg.addInitScript(() => { window.__pulita = true; });
  await pg.goto(`http://localhost:${srv.address().port}/index.html?cittanuova`); await pg.waitForFunction(() => window.__pv && window.__pv.st, null, { timeout: 400000 });
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(1500);
  if (foto) await pg.evaluate(s => { const pv = window.__pv, st = pv.st, p = st.player; p.x = s.x; p.y = s.y; st.deadline = 1e12; let t = Math.floor(st.t / 1440) * 1440 + s.ora; if (t < st.t) t += 1440; st.t = t; pv.ui.focus = { x: s.x, y: s.y }; pv.ui.zoom = s.z; },
    { x: +fx, y: +fy, z: +(fz || .6), ora: +(fo || 660) });
  await pg.waitForTimeout(60000);
  const r = await pg.evaluate(() => { const D = window.Percorsi && Percorsi.dati, G = window.Tetti && Tetti._.GFX;
    return { legato: D && D.legato, circuiti: D && D.circuiti.length, posate: window.__percorsi, mesh: G && G.meshes ? G.meshes.map(m => m.count) : null, camm: Tetti.CAMM.length }; });
  console.log(JSON.stringify(r)); console.log('errori', err.length ? err.slice(0, 8).join(' | ') : 'nessuno');
  if (foto) { const shot = await pg.evaluate(() => new Promise(res => requestAnimationFrame(() => res(document.getElementById('cv').toDataURL('image/png'))))); fs.writeFileSync(foto, Buffer.from(shot.split(',')[1], 'base64')); console.log('foto', foto); }
  await b.close(); srv.close();
});
