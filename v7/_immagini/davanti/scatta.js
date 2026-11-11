// [davanti] le foto e le sonde di ANALISI_CAMERA_DAVANTI.md: node _immagini/davanti/scatta.js --gb --mobile --vista=383x680 [--q=davanti] --out=prefisso --posti=_immagini/davanti/posti.json [--eval=_immagini/davanti/griglia.js|cammina.js]
// --gb: la pagina normale con lo schermo pulito del Game Boy (#app.console); --console: dentro un iframe che manda {pvc:ciao} (lì la tela del banco resta disegnata solo in un angolo: per le foto usare --gb)
// node scatta.js --q=camera9 --vista=383x680 --dpr=2.625 --out=prefix [--console] [--sec=6] [--posti=json]
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require('playwright');
const A = {}; for (const a of process.argv.slice(2)) { const m = /^--([a-z]+)(?:=(.*))?$/.exec(a); if (m) A[m[1]] = m[2] === undefined ? true : m[2]; }
const root = path.resolve(__dirname, '../..'), Q = A.q || '', [VW, VH] = (A.vista || '383x680').split('x').map(Number), DPR = +(A.dpr || 1), OUT = A.out || 'shot', SEC = +(A.sec || 6);
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.gz': 'application/gzip', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm' };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u === '/host.html') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(`<!doctype html><html><body style="margin:0;background:#000"><iframe id=f src="/${A.pagina || "index.html"}?${Q}" style="border:0;width:${VW}px;height:${VH}px;display:block;position:absolute;left:${A.fx || 0}px;top:${A.fy || 0}px" allow="fullscreen; gamepad; autoplay" onload="this.contentWindow.postMessage({pvc:'ciao'},'*');setInterval(()=>this.contentWindow.postMessage({pvc:'ciao'},'*'),3000)"></iframe></body></html>`); return; }
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    const [PW, PH] = (A.pagvista || (VW + 'x' + VH)).split('x').map(Number);
    const ctx = await b.newContext({ viewport: { width: PW, height: PH }, deviceScaleFactor: DPR, isMobile: !!A.mobile, hasTouch: !!A.mobile });
    const pg = await ctx.newPage(); pg.setDefaultTimeout(0);
    pg.on('pageerror', e => log('[errore]', e.message)); pg.on('console', m => { if (m.type() === 'error' && !/404|Failed to load/.test(m.text())) log('[console]', m.text().slice(0, 200)); if (/\[camera/.test(m.text())) log('[log]', m.text().slice(0, 300)); });
    const port = srv.address().port;
    let F;
    if (A.console) { await pg.goto(`http://localhost:${port}/host.html`, { waitUntil: 'domcontentloaded', timeout: 0 }); await pg.waitForTimeout(2000); F = pg.frames().find(f => f !== pg.mainFrame()); }
    else { await pg.goto(`http://localhost:${port}/index.html?${Q}`, { waitUntil: 'domcontentloaded', timeout: 0 }); F = pg.mainFrame(); }
    await F.waitForFunction(() => window.__tl && window.__tl.gioco, null, { timeout: 1800000, polling: 1000 });
    log('in gioco');
    if (A.gb) await F.evaluate(() => { document.getElementById('app').classList.add('console'); document.body.classList.add('pv-console'); });
    if (A.console) { await pg.evaluate(w => { const f = document.getElementById('f'); f.style.width = (w - 1) + 'px'; }, VW); await pg.waitForTimeout(1500); await pg.evaluate(w => { const f = document.getElementById('f'); f.style.width = w + 'px'; }, VW); await pg.waitForTimeout(1500); log('R', JSON.stringify(await F.evaluate(() => { const a = document.getElementById('app'); const r0 = { res: window.__pv.R.res, hd: window.__pv.R.hdStato && window.__pv.R.hdStato() }; window.__pv.R.resize(a.clientWidth, a.clientHeight, Math.min(2, devicePixelRatio || 1)); return { r0, aw: a.clientWidth, ah: a.clientHeight, res: window.__pv.R.res }; }))); }
    await F.waitForFunction(() => !window.__pv.ui.intro, null, { timeout: 120000 }).catch(() => log('intro'));
    const stato = () => F.evaluate(() => { const pv = window.__pv, R = pv.R, p = pv.st.player, c = R.getCamera(), C7 = R.__cam7, u = C7 && C7.ultimo, V = R.__vis5 || null;
      const fy = R.groundH(p.x, p.y), o = { x: p.x, y: fy + 1.15, z: p.y }, d = { x: c.position.x - o.x, y: c.position.y - o.y, z: c.position.z - o.z }, L = Math.hypot(d.x, d.y, d.z);
      const hit = R.cast7(o, { x: d.x / L, y: d.y / L, z: d.z / L }, L, 0.05);
      return { p: [+p.x.toFixed(1), +p.y.toFixed(1)], cam: [c.position.x, c.position.y, c.position.z].map(v => +v.toFixed(2)), dist: +L.toFixed(2), arm: u ? +u.arm.toFixed(2) : null, pitch: u ? +(u.pitch * 57.3).toFixed(1) : null, fov: +c.fov.toFixed(1), colpo: hit === null ? null : +hit.toFixed(2), c9: !!(window.Camera7 && Camera7.C9.on), attivo: C7 && C7.attivo, ob: (document.querySelector('#obj, .obj, #objective') || {}).textContent || '' }; });
    for (let i = 0; i < SEC; i++) { await pg.waitForTimeout(1000); }
    log('tela', JSON.stringify(await F.evaluate(() => { const c = document.querySelector('canvas'); return { w: c.width, h: c.height, cw: c.clientWidth, ch: c.clientHeight, iw: innerWidth, ih: innerHeight, dpr: devicePixelRatio, st: c.style.cssText }; })));
    if (A.eval) { const src = fs.readFileSync(A.eval, 'utf8'); const r = await F.evaluate(src); log('eval', JSON.stringify(r)); fs.writeFileSync(OUT + '_eval.json', JSON.stringify(r, null, 1)); }
    log(JSON.stringify(await stato()));
    await pg.screenshot({ path: `${OUT}_avvio.png`, clip: { x: +(A.fx || 0), y: +(A.fy || 0), width: VW, height: VH } });
    if (A.posti) {
      const P = JSON.parse(fs.readFileSync(A.posti, 'utf8'));
      for (const q of P) {
        await F.evaluate(q => { const pv = window.__pv, p = pv.st.player, W = pv.G.MAP.world;
          if (q.via) { const r = (W.roads || []).find(r => r.id === q.via); if (r) { let best = null; for (let i = 1; i < r.pts.length; i++) { const a = r.pts[i - 1], b = r.pts[i], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((q.x - a[0]) * dx + (q.y - a[1]) * dy) / L2)), x = a[0] + dx * t, y = a[1] + dy * t, d = Math.hypot(q.x - x, q.y - y); if (!best || d < best.d) best = { d, x, y, h: Math.atan2(dy, dx) }; }
            const h = best.h + (q.verso < 0 ? Math.PI : 0); q.x = best.x; q.y = best.y; q.face = h; q.yaw = Math.atan2(-Math.cos(h), -Math.sin(h)); } }
          p.x = q.x; p.y = q.y; p.path = []; p.face = q.face || 0; if (pv.R.camReset) pv.R.camReset(); const C7 = pv.R.__cam7; C7.yaw0 = q.yaw; C7.S = null; C7.ppx = undefined; }, q);
        await pg.waitForTimeout(+(A.attesa || 5000));
        log(q.nome, JSON.stringify(await stato()));
        await pg.screenshot({ path: `${OUT}_${q.nome}.png`, clip: { x: +(A.fx || 0), y: +(A.fy || 0), width: VW, height: VH } });
      }
    }
    if (A.tieni) await pg.waitForTimeout(+A.tieni);
  } catch (e) { log('errore', e.stack || e); }
  await b.close(); srv.close();
});
