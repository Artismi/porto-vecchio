// [fusi] LA PROVA «STESSA IMMAGINE» dei settori, delle ombre fuse e delle matrici rifatte solo se cambiano: il gioco vero (profilo telefono
// in piccolo, ?cittanuova&leggera), fermo su un fotogramma, la scena disegnata con tutto acceso (A) e poi con peso_fusi.js spento e le
// matrici di three com'erano (B, window.__pesoAB.fusi e .matrici): stessa camera, stesse ombre (le mappe si ricuociono in tutte e due fino a
// restare ferme), pixel per pixel. B viene dopo A: se una matrice non si fosse rifatta in A, in B la rifà three e la differenza si vede.
//   node strumenti/sonda_uguale_fusi.js [cartella delle foto]   POSTI=nome:x:y,…  ORE=11,22  VW=390 VH=640  INDICE=<altro index.html>
// Esce con 1 se un pixel cambia più di SOGLIA (predefinita 0).
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');
const root = path.resolve(__dirname, '..'), OUT = process.argv[2] || null;
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.gz': 'application/gzip' };
const PLACES = (process.env.POSTI || 'borgo:1424:322,vittoria:1372:388').split(',').map(s => s.split(':')).map(([n, x, y]) => [n, +x, +y]);
const ORE = (process.env.ORE || '11,22').split(',').map(Number), SOGLIA = +(process.env.SOGLIA || 0), VW = +(process.env.VW || 390), VH = +(process.env.VH || 640);
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = u === '/index.html' && process.env.INDICE ? path.resolve(process.env.INDICE) : path.join(root, u);
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const port = srv.address().port, T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  let fail = 0;
  const pg = await ctx.newPage();
  pg.on('pageerror', e => console.log('[errore]', e.message));
  await pg.addInitScript(() => { window.__pulita = true; let a = 12345; Math.random = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
  await pg.goto(`http://localhost:${port}/index.html?cittanuova&leggera${process.env.PV_QUERY || ''}`, { timeout: 900000 });
  await pg.waitForFunction(() => window.__pv && window.__pv.st && window.__pv.R && window.__pv.R.__models && window.__pv.R.__models.renderer, null, { timeout: 1500000, polling: 1000 });
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(2500);
  await pg.waitForFunction(() => !window.__pv.ui.intro, null, { timeout: 300000 }).catch(() => log('ancora intro'));
  await pg.evaluate(() => { if (window.Anelli && Anelli.ON) Anelli.finisci(); const pv = window.__pv; pv.st.deadline = 1e12; setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.dialog = null; u.menu = false; pv.st.over = null; pv.st.player.hp = 100; }, 50); });
  for (const [nome, x, y] of PLACES) for (const ora of ORE) {
    await pg.evaluate(([x, y, h]) => { const pv = window.__pv, st = pv.st, p = st.player; p.x = x; p.y = y; p.indoor = null; p.vehicle = null; p.lv = null; p.path = []; st.t = Math.floor(st.t / 1440) * 1440 + 1440 + h * 60; window.__meteo = 'sereno'; pv.ui.zoom = 1; pv.R.cam.x = pv.R.cam.tx = x; pv.R.cam.y = pv.R.cam.ty = y;
      if (window.__pesoAB.fusi) window.__pesoAB.fusi(true); if (window.__pesoAB.matrici) window.__pesoAB.matrici(true); }, [x, y, ora]);
    for (let k = 0, quiet = 0, tb = Date.now(); Date.now() - tb < 180000 && quiet < 3; k++) { await pg.waitForTimeout(1000); quiet = (await pg.evaluate(() => !(window.__pv.R.ISO && window.__pv.R.ISO.job))) ? quiet + 1 : 0; }
    await pg.waitForTimeout(+(process.env.ATTESA || 15000));   // i rami fermi si congelano (10 s), le ombre fuse si fanno (1,5 s di osservazione)
    const r = await pg.evaluate(() => new Promise(res => {
      const raf0 = window.__raf0 || (window.__raf0 = window.requestAnimationFrame); window.requestAnimationFrame = () => 0;
      setTimeout(() => {
        const R = window.__pv.R, rd = R.__models.renderer, S = R.__models.scene, cam = R.getCamera(), W = rd.domElement.width, H = rd.domElement.height;
        const T = new THREE.WebGLRenderTarget(W, H, { depthBuffer: true }), auto = rd.shadowMap.autoUpdate; rd.shadowMap.autoUpdate = true;
        const px = () => { const a = new Uint8Array(W * H * 4); rd.setRenderTarget(T); rd.render(S, cam); rd.readRenderTargetPixels(T, 0, 0, W, H, a); rd.setRenderTarget(null); return a; };
        const fermo = () => { let a = null, n = 0; for (let i = 0; i < 400; i++) { const q = px(); n++; if (a && i > 30) { let d = 0; for (let k = 0; k < q.length; k++) if (q[k] !== a[k]) { d = 1; break; } if (!d) { a = q; break; } } a = q; } return { a, n }; };   // finché le ombre in cache non smettono di cambiare
        const fz = window.PesoFusi ? PesoFusi.conto() : null;
        const A = fermo(), tA = (() => { const t = performance.now(); for (let i = 0; i < 4; i++) px(); return (performance.now() - t) / 4; })();
        if (window.__pesoAB.fusi) window.__pesoAB.fusi(false); if (window.__pesoAB.matrici) window.__pesoAB.matrici(false);
        const B = fermo(), tB = (() => { const t = performance.now(); for (let i = 0; i < 4; i++) px(); return (performance.now() - t) / 4; })();
        if (window.__pesoAB.fusi) window.__pesoAB.fusi(true); if (window.__pesoAB.matrici) window.__pesoAB.matrici(true);
        rd.shadowMap.autoUpdate = auto; T.dispose();
        let diff = 0, max = 0, pxd = 0; for (let i = 0; i < A.a.length; i += 4) { let dd = 0; for (let c = 0; c < 3; c++) { const d = Math.abs(A.a[i + c] - B.a[i + c]); if (d) { diff++; dd = 1; if (d > max) max = d; } } pxd += dd; }
        const toB64 = a => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), im = x.createImageData(W, H); for (let yy = 0; yy < H; yy++) im.data.set(a.subarray((H - 1 - yy) * W * 4, (H - yy) * W * 4), yy * W * 4); for (let i = 3; i < im.data.length; i += 4) im.data[i] = 255; x.putImageData(im, 0, 0); return c.toDataURL('image/png').split(',')[1]; };
        window.requestAnimationFrame = raf0;
        res({ W, H, fusi: fz, rifatteA: A.n, rifatteB: B.n, ms_A: +tA.toFixed(1), ms_B: +tB.toFixed(1), canali_diversi: diff, pixel_diversi: pxd, scarto_max: max, pngA: toB64(A.a), pngB: toB64(B.a) });
      }, 300); }));
    if (OUT) { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, `${nome}_${ora}_A.png`), Buffer.from(r.pngA, 'base64')); fs.writeFileSync(path.join(OUT, `${nome}_${ora}_B.png`), Buffer.from(r.pngB, 'base64')); }
    delete r.pngA; delete r.pngB;
    const ok = r.scarto_max <= SOGLIA; if (!ok) fail++;
    log(nome, ora + ':00', ok ? 'UGUALE' : 'DIVERSA', JSON.stringify(r));
  }
  await b.close(); srv.close(); process.exit(fail ? 1 : 0);
});
