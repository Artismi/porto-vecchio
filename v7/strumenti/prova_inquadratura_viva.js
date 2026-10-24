// [inquadratura] LA PROVA DAL VIVO: il gioco vero (?cittanuova, o PV_QUERY) senza testa; il personaggio cammina lungo un vicolo (lo si sposta a
// ogni fotogramma, a 1,4 m/s) e si guarda che la camera faccia quello che dice src/inquadratura.js: nessun errore, la visuale sull'asse del
// vicolo, le case che coprono la via tagliate; sul tetto niente taglio. Con ?visuale=muretto o ?vecchiacamera controlla solo che non ci siano errori.
//   node strumenti/prova_inquadratura_viva.js [vicolo] [foto.png]     PV_QUERY='?cittanuova&visuale=muretto'
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const [VIC0, FOTO] = process.argv.slice(2), VIC = VIC0 || 'vic_monache', root = path.resolve(__dirname, '..'), Q = process.env.PV_QUERY !== undefined ? process.env.PV_QUERY : '?cittanuova';
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const port = srv.address().port, t0 = Date.now();
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 640, height: 400 } });
  const errori = [], avvisi = []; pg.on('pageerror', e => errori.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  pg.on('console', m => { const t = m.text(); if (/\[inquadratura\]|\[visuale\d?\]/.test(t)) avvisi.push(t.slice(0, 300)); if (m.type() === 'error' && !/Failed to load resource/.test(t)) errori.push(t.slice(0, 300)); });
  await pg.goto(`http://localhost:${port}/index.html${Q}`);
  await pg.waitForFunction(() => window.__pv && window.__pv.st, null, { timeout: 900000 });
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(1500);
  await pg.evaluate(() => setInterval(() => { const u = window.__pv.ui; u.flash = 0; u.fade = 0; u.intro = false; u.letterbox = false; u.dialog = null; }, 50));
  console.log('caricato in', ((Date.now() - t0) / 1000).toFixed(0), 's; variante', await pg.evaluate(() => window.__pv.R.__iq5 && window.__pv.R.__iq5.nome), '; visuale', await pg.evaluate(() => window.__pv.R.setVisuale()));
  // il cammino: lungo il vicolo, un passo per fotogramma secondo il tempo vero del fotogramma (lo sposta un requestAnimationFrame)
  const r = await pg.evaluate(VIC => new Promise(res => { const pv = window.__pv, st = pv.st, p = st.player, R = pv.R, rd = pv.G.MAP.world.roads.find(q => q.id === VIC);
    if (!rd) { res({ errore: 'nessun vicolo ' + VIC }); return; }
    const P = rd.pts; let k = 1, s = 0, last = performance.now(), n = 0; const vis = [], tg = [];
    p.vehicle = null; p.indoor = null; p.lv = null; p.x = P[0][0]; p.y = P[0][1]; R.cam.x = p.x; R.cam.y = p.y; R.snap && R.snap(st);
    const passo = () => { const now = performance.now(), dt = Math.min(.25, (now - last) / 1000); last = now; n++;
      let d = 1.4 * Math.max(dt, .05); while (k < P.length && d > 0) { const [ax, az] = P[k - 1], [bx, bz] = P[k], L = Math.hypot(bx - ax, bz - az); if (s + d < L) { s += d; d = 0; } else { d -= L - s; s = 0; k++; } }
      if (k >= P.length) { fine(); return; }
      const [ax, az] = P[k - 1], [bx, bz] = P[k], L = Math.hypot(bx - ax, bz - az) || 1; p.x = ax + (bx - ax) * s / L; p.y = az + (bz - az) * s / L; p.face = Math.atan2(bz - az, bx - ax); p.path = [];
      const I = R.__iq5; vis.push({ via: I && I.via, dy: I ? I.dy : 0, yaw: R.cam.yaw, pitch: I ? I.p : 0 }); tg.push(R.__vis3.vivi.size);
      if (n > 400) { fine(); return; } requestAnimationFrame(passo); };
    const fine = () => res({ n, vis, tg, x: p.x, y: p.y, asse: Math.atan2(P[P.length - 1][1] - P[0][1], P[P.length - 1][0] - P[0][0]) });
    requestAnimationFrame(passo); }), VIC);
  if (r.errore) { console.log(r.errore); process.exit(1); }
  const sulVic = r.vis.filter(v => v.via === VIC).length, maxTagli = Math.max(0, ...r.tg), ultimo = r.vis[r.vis.length - 1] || {};
  console.log(`fotogrammi ${r.n}; sul vicolo (per la camera) ${sulVic}; case tagliate al più ${maxTagli}; l'ultimo yaw ${ultimo.yaw && (ultimo.yaw * 180 / Math.PI).toFixed(0)}°, giro ${(ultimo.dy * 180 / Math.PI).toFixed(0)}°, pendenza ${ultimo.pitch && ultimo.pitch.toFixed(2)}`);
  if (FOTO) { const u = await pg.evaluate(() => new Promise(res => requestAnimationFrame(() => res(document.getElementById('cv').toDataURL('image/png'))))); fs.writeFileSync(FOTO, Buffer.from(u.split(',')[1], 'base64')); }
  // sul tetto: niente taglio (si sale sul tetto della casa più vicina)
  const tetto = await pg.evaluate(() => new Promise(res => { const pv = window.__pv, st = pv.st, p = st.player, R = pv.R, B = pv.G.BUILDINGS, TS = pv.G.TS;
    let bi = -1, bd = 1e9; B.forEach((b, i) => { const d = Math.hypot((b.x + b.w / 2) * TS - p.x, (b.y + b.h / 2) * TS - p.y); if (d < bd && !b.pezzo) { bd = d; bi = i; } });
    const b = B[bi]; p.x = (b.x + b.w / 2) * TS; p.y = (b.y + b.h / 2) * TS; p.lv = { k: 'tetto', b: bi, h: Tetti.roofRule(b) };
    let n = 0; const giu = () => { if (++n < 40) { requestAnimationFrame(giu); return; } res({ tagli: [...R.__vis3.S.values()].filter(s => s.on).length, pitch: R.__iq5 ? R.__iq5.p : null }); }; requestAnimationFrame(giu); }));
  console.log(`sul tetto: case ancora giù ${tetto.tagli}, pendenza ${tetto.pitch && tetto.pitch.toFixed(2)}`);
  console.log('errori', errori.length, errori.slice(0, 5).join('\n'), '\navvisi', avvisi.length, avvisi.slice(0, 5).join('\n'));
  const iq = Q.indexOf('vecchiacamera') < 0 && Q.indexOf('muretto') < 0;
  const ok = !errori.length && !avvisi.length && (!iq || (sulVic > r.n * .3 && tetto.tagli === 0));
  console.log(ok ? 'PROVA OK' : 'PROVA NO', 'in', ((Date.now() - t0) / 1000).toFixed(0), 's');
  await b.close(); srv.close(); process.exit(ok ? 0 : 1);
});
