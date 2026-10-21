// [visuale3] LA PROVA DEL TAGLIO NEL GIOCO VERO (Chromium senza testa con SwiftShader, come strumenti/galleria.js), con ?visuale=taglio:
//   1. in dieci punti dei vicoli del borgo (gli stessi di src/test_visuale3.js) la scatola del personaggio (gli 8 spigoli e 3 punti sull'asse,
//      da 0,1 a 1,7 m) non è coperta: per ogni punto si legge la quota della superficie che la camera vede in quel pixel (R.profQuote, dalla
//      profondità dello stesso fotogramma): se è più alta del punto di oltre 35 cm, qualcosa sta fra la camera e il punto (la camera guarda
//      dall'alto: chi copre sta più in alto). Si misura anche senza taglio (ellisse spenta, case piene) per il confronto;
//   2. sul tetto non si taglia niente;
//   3. camminando due secondi (tempo del gioco) lungo un vicolo, a passo d'uomo, nessuna casa si riapre e il taglio acceso/spento cambia al più una volta;
//   4. il costo: i programmi della scheda video e le draw call nel modo taglio e dopo aver acceso l'ellisse.
//   node strumenti/visuale3_check.js [uscita.json]   (GALLERIA_CARICO: ms per caricare)
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const root = path.resolve(__dirname, '..'), OUT = process.argv[2] || path.join(root, '_immagini', 'visuale3', 'prova_taglio.json');
global.World = require(path.join(root, 'src', 'world_cittanuova.js'));
const W = World, TS = W.TS || 2, GW = W.GW, GH = W.GH;
// gli stessi dieci punti della prova in Node
const tile = (tx, ty) => tx < 0 || ty < 0 || tx >= GW || ty >= GH ? -1 : W.grid[ty * GW + tx];
const pieno = (x, z) => tile(Math.floor(x / TS), Math.floor(z / TS)) === W.T.BLD;
const era = (x, z) => { for (let r = 1; r < 6; r++) for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r]]) { const tx = Math.floor((x + dx * TS) / TS), ty = Math.floor((z + dz * TS) / TS); if (tile(tx, ty) === W.T.BLD) { const b = W.BUILDINGS.find(b => tx >= b.x && tx < b.x + b.w && ty >= b.y && ty < b.y + b.h); if (b) return b.era; } } return null; };
const muri = (x, z) => [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => { for (let s = 1; s <= 2.6; s += .4) if (pieno(x + dx * s, z + dz * s)) return true; return false; }).length;
const posti = [];
W.roads.filter(r => r.w <= 3.5).forEach(r => r.pts.forEach((p, i) => { if (i % 4) return; const [x, z] = p; if (pieno(x, z) || era(x, z) !== 'E0' || muri(x, z) < 2) return; if (posti.some(q => Math.hypot(q[0] - x, q[1] - z) < 25)) return; posti.push([x, z, r.name]); }));
const DIECI = posti.slice(0, 10);
// il vicolo per la camminata: il primo dei dieci, lungo il suo tracciato
const vic = W.roads.find(r => r.name === DIECI[0][2]); let dir = [1, 0];
if (vic) { const i = vic.pts.findIndex(p => Math.hypot(p[0] - DIECI[0][0], p[1] - DIECI[0][1]) < .01), a = vic.pts[Math.max(0, i - 1)], b = vic.pts[Math.min(vic.pts.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; dir = [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; }
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const port = srv.address().port, t0 = Date.now(), log = m => console.log(m, ((Date.now() - t0) / 1000).toFixed(0) + ' s');
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 640, height: 400 } });
  pg.on('pageerror', e => console.log('[errore]', e.message));
  await pg.addInitScript(() => { window.__pulita = true; });
  await pg.goto(`http://localhost:${port}/index.html?cittanuova&visuale=taglio`);
  await pg.waitForFunction(() => window.__pv && window.__pv.st, null, { timeout: +(process.env.GALLERIA_CARICO || 900000) });
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(1500);
  await pg.evaluate(() => { const pv = window.__pv, st = pv.st; st.deadline = 1e12; if (pv.R.gpuTiming) pv.R.gpuTiming(true);
    setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.desat = false; u.letterbox = false; u.dialog = null; u.book = false; u.menu = false; st.over = null; st.chase = false; st.player.hp = 100; }, 50); });
  log('caricato');
  const frames = n => pg.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const vai = async (x, z, extra) => {
    await pg.evaluate(([x, z, extra]) => { const pv = window.__pv, st = pv.st, p = st.player, R = pv.R, ui = pv.ui;
      p.vehicle = null; p.indoor = null; p.lv = null; p.x = x; p.y = z; p.path = []; ui.focus = null; ui.zoom = .4; ui.lead = null;
      let t = Math.floor(st.t / 1440) * 1440 + 660; if (t < st.t - 1) t += 1440; st.t = t;
      R.cam.x = x; R.cam.y = z; R.cam.zoom = .4; R.cam.uy = 0;
      if (extra) (new Function('pv', 'st', extra))(pv, st);
      try { Render.ISO.rush = true; R.updateChunks(x, z); } finally { Render.ISO.rush = false; } }, [x, z, extra || '']);
    for (let k = 0, quiet = 0, tb = Date.now(); Date.now() - tb < 30000 && quiet < 2; k++) { await pg.waitForTimeout(800); quiet = (await pg.evaluate(() => !(window.__pv.R.ISO && window.__pv.R.ISO.job))) ? quiet + 1 : 0; }
    await frames(3);
  };
  // la misura: la scatola del personaggio contro la quota vista in ogni pixel (nel fotogramma appena disegnato)
  const misura = () => pg.evaluate(() => new Promise(res => requestAnimationFrame(() => {
    const pv = window.__pv, R = pv.R, p = pv.st.player, cam = R.getCamera(), cv = document.getElementById('cv'), Wc = cv.width, Hc = cv.height;
    const Q = R.profQuote(Wc, Hc), gY = R.cam.h || 0, fy = R.groundH(p.x, p.y), v = new THREE.Vector3(), P = [];
    for (const [dx, dz] of [[-.3, -.3], [.3, -.3], [-.3, .3], [.3, .3]]) for (const h of [.1, 1.7]) P.push([p.x + dx, fy + h, p.y + dz]);
    for (const h of [.3, .9, 1.5]) P.push([p.x, fy + h, p.y]);
    let lib = 0, tot = 0; const det = [];
    P.forEach(([x, y, z]) => { v.set(x, y, z).project(cam); const px = Math.round((v.x + 1) / 2 * Wc), py = Math.round((1 - v.y) / 2 * Hc); if (px < 1 || py < 1 || px >= Wc - 1 || py >= Hc - 1) return;
      const k = ((Hc - 1 - py) * Wc + px) * 4; if (!Q[k + 3]) return; const hq = (Q[k] * 256 + Q[k + 1]) / 100 - 50 + gY; tot++; const free = hq <= y + .35; if (free) lib++; det.push(+(hq - y).toFixed(2)); });
    const V = R.__vis3; res({ liberi: lib, punti: tot, tagliate: V ? V.vivi.size : 0, quote: V ? [...V.S.values()].map(s => +(s.y - fy).toFixed(2)) : [], scarti: det });
  })));
  const out = { punti: [], tetto: null, camminata: null, costo: {} };
  // 1. dieci punti, col taglio e senza (taglio spento: le case piene)
  await pg.evaluate(() => window.__pv.R.setVisuale('taglio', true));
  for (const [x, z, nome] of DIECI) {
    await vai(x, z);
    const con = await misura();
    await pg.evaluate(() => { const V = window.__pv.R.__vis3; V.on = false; }); await frames(2);
    const senza = await misura();
    await pg.evaluate(() => { const V = window.__pv.R.__vis3; V.on = true; }); await frames(2);
    out.punti.push({ nome, x: +x.toFixed(1), z: +z.toFixed(1), con, senza }); log(`${nome}: col taglio ${con.liberi}/${con.punti} liberi (${con.tagliate} case, quote ${con.quote.join(' ')}), senza ${senza.liberi}/${senza.punti}`);
  }
  // 2. sul tetto: la prima casa del borgo vicino al primo punto con un tetto misurato
  out.tetto = await pg.evaluate(([x, z]) => new Promise(res => { const pv = window.__pv, p = pv.st.player, T = window.Tetti;
    let q = null, qx = 0, qz = 0; for (let r = 2; r < 16 && !q; r += 1) for (let a = 0; a < 6.28 && !q; a += .4) { const c = T && T.roofAt(x + Math.cos(a) * r, z + Math.sin(a) * r); if (c) { q = c; qx = x + Math.cos(a) * r; qz = z + Math.sin(a) * r; } }
    if (!q) { res({ ok: null, nota: 'nessun tetto misurato vicino' }); return; }
    p.x = qx; p.y = qz; p.lv = { k: 'tetto', b: q.bi, h: q.h }; let k = 0; const f = () => { if (++k < 6) { requestAnimationFrame(f); return; } const V = pv.R.__vis3; res({ ok: V.vivi.size === 0, tagliate: V.vivi.size, h: q.h }); p.lv = null; }; requestAnimationFrame(f); }), DIECI[0]);
  log('tetto ' + JSON.stringify(out.tetto));
  // 3. due secondi di cammino lungo il vicolo (tempo del gioco), con le transizioni vere
  await vai(DIECI[0][0], DIECI[0][1]);
  await pg.evaluate(() => window.__pv.R.setVisuale('taglio', false));
  out.camminata = await pg.evaluate(([x0, z0, dx, dz]) => new Promise(res => { const pv = window.__pv, p = pv.st.player, ui = pv.ui, V = pv.R.__vis3, t0 = ui.time;
    const prima = new Map(), aperture = new Map(); let glob = 0, any = null, n = 0;
    const f = () => { const t = ui.time - t0; p.x = x0 + dx * 1.4 * t; p.y = z0 + dz * 1.4 * t; n++;
      V.S.forEach((s, B) => { if (s.on && !prima.get(B)) aperture.set(B, (aperture.get(B) || 0) + 1); });
      prima.clear(); V.S.forEach((s, B) => prima.set(B, s.on)); const a = [...V.S.values()].some(s => s.on); if (any !== null && a !== any) glob++; any = a;
      if (t < 2) requestAnimationFrame(f); else res({ fotogrammi: n, secondi: +t.toFixed(2), accesoSpento: glob, maxAperture: Math.max(0, ...aperture.values()), case: aperture.size, cambi: V.cambi }); };
    requestAnimationFrame(f); }), [DIECI[0][0], DIECI[0][1], dir[0], dir[1]]);
  log('camminata ' + JSON.stringify(out.camminata));
  // 4. il costo: programmi e draw call col taglio, poi con l'ellisse accesa (i materiali entrano nel varco)
  const conta = () => pg.evaluate(() => new Promise(r => requestAnimationFrame(() => { const R = window.__pv.R, i = R.gpuTimes && R.gpuTimes.info; r({ programmi: R.__models.renderer.info.programs.length, drawCall: i ? i.calls : null }); })));
  await vai(DIECI[0][0], DIECI[0][1]); await pg.evaluate(() => window.__pv.R.setVisuale('taglio', true)); await frames(3); out.costo.taglio = await conta();
  await pg.evaluate(() => window.__pv.R.setVisuale('ellisse', true)); await frames(4); out.costo.ellisse = await conta();
  await pg.evaluate(() => window.__pv.R.setVisuale('sezione', true)); await frames(4); out.costo.sezione = await conta();
  log('costo ' + JSON.stringify(out.costo));
  const okP = out.punti.every(q => q.con.punti && q.con.liberi >= q.con.punti - 1), okT = out.tetto.ok !== false, okC = out.camminata.maxAperture <= 1 && out.camminata.accesoSpento <= 1;
  out.esito = { punti: okP, tetto: okT, camminata: okC };
  fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.log((okP ? 'ok   ' : 'NO   ') + `la scatola del personaggio si vede nei dieci punti (${out.punti.map(q => q.con.liberi + '/' + q.con.punti).join(' ')}; senza taglio ${out.punti.map(q => q.senza.liberi + '/' + q.senza.punti).join(' ')})`);
  console.log((okT ? 'ok   ' : 'NO   ') + `sul tetto niente taglio (${JSON.stringify(out.tetto)})`);
  console.log((okC ? 'ok   ' : 'NO   ') + `due secondi lungo il vicolo: acceso/spento ${out.camminata.accesoSpento}, al più ${out.camminata.maxAperture} apertura per casa (${out.camminata.fotogrammi} fotogrammi)`);
  console.log('scritto', OUT, 'in', ((Date.now() - t0) / 60000).toFixed(1), 'min');
  await b.close(); srv.close(); process.exit(okP && okT && okC ? 0 : 1);
});
