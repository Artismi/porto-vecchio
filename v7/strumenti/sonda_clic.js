// [audit] LA SONDA DEL CLIC (INP): quanto dura il gestore del pointerdown / pointerup / click sulla tela del gioco (canvas#cv), e dentro
// chi: G.findPath, la scelta (pickAt: persone, Bottino, porte), R.project, Oggetti.lootables, l'audio. Ogni ascoltatore della tela è
// cronometrato (EventTarget.addEventListener avvolto), e il lavoro rimandato al fotogramma dopo (click.q) a parte.
//   node strumenti/sonda_clic.js [--telefono] [--query=&...] [--n=16] [--out=file.json]
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');
const root = path.resolve(__dirname, '..');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const has = k => process.argv.includes('--' + k);
const TEL = has('telefono'), Q = '?cittanuova' + (TEL ? '&leggera' : '') + arg('query', ''), N = +arg('n', 16), OUTF = arg('out', null);
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.gz': 'application/gzip' };
function initPage() {
  window.__pulita = true; window.__nodraw = true;
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) { if (!C) continue; const P = C.prototype;
    for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements']) { const f = P[k]; P[k] = function () { if (window.__nodraw) return; return f.apply(this, arguments); }; } }
  const K = window.__clic = { ev: [], sub: {}, depth: 0 };
  const ael = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, o) {
    if (typeof fn === 'function' && /^(pointerdown|pointerup|click|mousedown|mouseup|touchstart|touchend)$/.test(type)) {
      const tgt = this, lab = type + ' ' + (tgt.id ? '#' + tgt.id : tgt === window ? 'window' : tgt.nodeName || '?') + ' ' + String(fn).slice(0, 70).replace(/\s+/g, ' ');
      const w = function (e) { const t = performance.now(); K.depth++; const s0 = Object.assign({}, K.cur || {}); K.cur = {}; try { return fn.apply(this, arguments); } finally { K.depth--; const d = performance.now() - t; if (d > 0.3) K.ev.push({ lab, ms: +d.toFixed(2), sub: K.cur, cv: e && e.target && e.target.id === 'cv' }); K.cur = s0; } };
      return ael.call(this, type, w, o);
    }
    return ael.apply(this, arguments);
  };
  K.wrap = (obj, k, lab) => { const f = obj && obj[k]; if (typeof f !== 'function' || f.__cl) return; const w = function () { const t = performance.now(); try { return f.apply(this, arguments); } finally { const d = performance.now() - t; if (K.depth && K.cur) { const q = K.cur[lab] || (K.cur[lab] = { n: 0, ms: 0 }); q.n++; q.ms = +(q.ms + d).toFixed(2); } const s = K.sub[lab] || (K.sub[lab] = { n: 0, ms: 0, max: 0 }); s.n++; s.ms += d; if (d > s.max) s.max = d; } }; w.__cl = 1; obj[k] = w; };
}
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info'] });
  const ctx = await b.newContext(TEL ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 720 } });
  const pg = await ctx.newPage();
  pg.on('crash', () => { log('[pagina morta]'); process.exit(2); });
  pg.on('pageerror', e => log('[errore]', e.message));
  await pg.addInitScript(initPage);
  await pg.goto(`http://localhost:${srv.address().port}/index.html${Q}`, { timeout: 900000 });
  await pg.waitForFunction(() => window.__pv && window.__pv.st && window.__pv.R && window.__pv.R.__models && window.__pv.R.__models.renderer, null, { timeout: 1500000, polling: 1000 });
  log('caricato', Q);
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(2000);
  await pg.waitForFunction(() => !window.__pv.ui.intro, null, { timeout: 300000, polling: 500 }).catch(() => log('ancora nella schermata iniziale'));
  await pg.evaluate(() => { if (window.Anelli && Anelli.ON) Anelli.finisci(); const pv = window.__pv, st = pv.st; st.deadline = 1e12; const p = st.player; p.x = 1424; p.y = 322; pv.R.cam.x = pv.R.cam.tx = p.x; pv.R.cam.y = pv.R.cam.ty = p.y;
    setInterval(() => { const u = pv.ui; u.dialog = null; u.book = false; u.menu = false; st.over = null; st.player.hp = 100; }, 50);
    const K = window.__clic, G = pv.G, R = pv.R; K.wrap(G, 'findPath', 'G.findPath'); K.wrap(pv, 'pickAt', 'pickAt'); K.wrap(R, 'project', 'R.project'); K.wrap(R, 'screenToGround', 'R.screenToGround');
    if (window.Oggetti) K.wrap(Oggetti, 'lootables', 'Oggetti.lootables'); if (window.Bottino) K.wrap(Bottino, 'pick', 'Bottino.pick'); if (window.Sottosuolo) K.wrap(Sottosuolo, 'pick', 'Sottosuolo.pick'); if (window.Cantiere) K.wrap(Cantiere, 'pick', 'Cantiere.pick');
    if (window.Audio8) K.wrap(Audio8, 'init', 'Audio8.init'); });
  for (let k = 0, quiet = 0, tb = Date.now(); Date.now() - tb < 120000 && quiet < 2; k++) { await pg.waitForTimeout(1000); quiet = (await pg.evaluate(() => !(window.__pv.R.ISO && window.__pv.R.ISO.job))) ? quiet + 1 : 0; }
  const W = TEL ? 390 : 1280, H = TEL ? 844 : 720;
  // i punti: vicini, lontani, ai bordi; ognuno cliccato due volte (il primo clic paga anche l'audio)
  const pts = []; for (let i = 0; i < N; i++) { const a = i * 2.39996, r = .1 + .38 * ((i * 7) % N) / N; pts.push([Math.round(W * (.5 + Math.cos(a) * r)), Math.round(H * (.5 + Math.sin(a) * r * .9))]); }
  const cdp = await ctx.newCDPSession(pg); await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start');
  const out = [];
  // fase 2 (zoom indietro, 4,2: la vista dove il committente clicca lontano), da tre partenze; fase 1 a zoom 1
  const fasi = [[1, 1424, 322, pts]]; for (const [px, py] of [[1424, 322], [1278, 340], [1520, 352]]) fasi.push([4.2, px, py, pts.slice(0, Math.ceil(N / 2))]);
  for (const [zoom, px, py, P] of fasi) { await pg.evaluate(([z, px, py]) => { const pv = window.__pv, p = pv.st.player; p.x = px; p.y = py; p.path = []; pv.ui.zoom = z; pv.R.cam.x = pv.R.cam.tx = px; pv.R.cam.y = pv.R.cam.ty = py; }, [zoom, px, py]); await pg.waitForTimeout(3000);
  for (const [x, y] of P) {
    await pg.evaluate(([px, py]) => { window.__clic.ev = []; const p = window.__pv.st.player; p.x = px; p.y = py; }, [px, py]);
    if (TEL) await pg.touchscreen.tap(x, y); else await pg.mouse.click(x, y);
    await pg.waitForTimeout(700);
    const r = await pg.evaluate(() => { const K = window.__clic, e = K.ev; const tot = e.reduce((s, q) => s + q.ms, 0); const mx = e.reduce((m, q) => q.ms > m.ms ? q : m, { ms: 0 }); const p = window.__pv.st.player; return { gestori_ms: +tot.toFixed(1), peggiore: mx.lab ? mx.lab.slice(0, 60) + ' ' + mx.ms : '', sub: e.map(q => q.sub).reduce((a, s) => { for (const k in s) { a[k] = a[k] || { n: 0, ms: 0 }; a[k].n += s[k].n; a[k].ms = +(a[k].ms + s[k].ms).toFixed(1); } return a; }, {}), tutti: K.ev.map(q => q.lab.slice(0, 40) + ' ' + q.ms), meta: window.__pv.ui.mark ? [Math.round(window.__pv.ui.mark.x), Math.round(window.__pv.ui.mark.y)] : null, da: [Math.round(p.x), Math.round(p.y)] }; });
    r.punto = [x, y]; r.zoom = zoom; out.push(r); log(zoom, r.gestori_ms, JSON.stringify(r.sub), r.da, '→', r.meta);
  } }
  // il percorso da solo: 40 coppie di caselle camminabili a caso (anche lontane), il tempo di G.findPath
  const fp = await pg.evaluate(() => { const G = window.__pv.G; let a = 7; const rnd = () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; const P = [];
    while (P.length < 80) { const x = 1150 + rnd() * 500, y = 250 + rnd() * 180; if (G.walkM(x, y)) P.push([x, y]); }
    const t = []; for (let i = 0; i < 80; i += 2) { const t0 = performance.now(); const r = G.findPath(P[i][0], P[i][1], P[i + 1][0], P[i + 1][1], 1.4, false); t.push({ ms: +(performance.now() - t0).toFixed(1), m: Math.round(Math.hypot(P[i][0] - P[i + 1][0], P[i][1] - P[i + 1][1])), ok: r.length > 0 }); }
    return t.sort((x, y) => y.ms - x.ms); });
  console.log('findPath da solo (i 8 peggiori):', JSON.stringify(fp.slice(0, 8)), 'mediana', fp[fp.length >> 1].ms);
  const { profile } = await cdp.send('Profiler.stop');
  const sub = await pg.evaluate(() => window.__clic.sub);
  const ms = out.map(r => r.gestori_ms).sort((a, b) => a - b);
  const S = { query: Q, telefono: TEL, clic: out.length, mediana_ms: ms[ms.length >> 1], p90_ms: ms[Math.floor(ms.length * .9)], max_ms: ms[ms.length - 1], sotto16: ms.filter(v => v < 16).length, sottofunzioni: sub, findPath_solo: fp, clicks: out };
  console.log(JSON.stringify({ mediana_ms: S.mediana_ms, p90_ms: S.p90_ms, max_ms: S.max_ms, sotto16: S.sotto16 + '/' + out.length, sub }, null, 1));
  // le funzioni più pesanti (tempo proprio) in tutto il giro dei clic
  const byId = new Map(profile.nodes.map(n => [n.id, n])), self = {}; profile.samples.forEach((id, k) => { const cf = byId.get(id).callFrame; const key = `${cf.functionName || '(anon)'}:${cf.lineNumber + 1}`; self[key] = (self[key] || 0) + (profile.timeDeltas[k] || 0); });
  S.profilo = Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => `${(v / 1000).toFixed(0)} ms ${k}`);
  console.log(S.profilo.slice(0, 15).join('\n'));
  if (OUTF) fs.writeFileSync(OUTF, JSON.stringify(S, null, 1));
  await b.close(); srv.close(); process.exit(0);
});
