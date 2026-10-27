// [audit] IL BANCO DELL'AUDIT: una sessione di gioco sul profilo telefono (390×844, DPR 3, tocco, ?cittanuova&leggera), sempre uguale
// (seme fisso, passo fisso di 1/60 s, le rotte di banco_scatti.js), e per ogni giro (cammina, corsa, auto):
//   - per fotogramma, contate alla fonte (WebGL): disegni (anche le ombre e il post), istanze, triangoli, cambi di programma,
//     bindTexture, uniform, byte caricati alla scheda video (texImage/texSubImage/bufferData/bufferSubData) e texture nuove;
//   - le texture grandi (≥ 512 di lato) create o ricaricate durante il gioco, con chi le ha chieste (la pila → modulo:funzione);
//   - il processore: profilo a campioni (Profiler), tempo proprio per modulo e per funzione, ms per fotogramma;
//   - le allocazioni: profilo a campioni dell'heap (HeapProfiler.startSampling), MB allocati per modulo:funzione;
//   - la raccolta della memoria: Tracing (devtools.timeline, v8.gc) → raccolte minori/maggiori per minuto e ms;
//   - a fine giro, l'inventario: programmi, texture e geometrie di three, MB sulla scheda (texture, buffer, renderbuffer, contati alla fonte),
//     le luci con l'ombra e la misura delle loro mappe, mesh visibili, materiali diversi, istanze.
//   node strumenti/banco_audit.js [cartella] [--giro=cammina,corsa,auto] [--nf=900] [--query=&...] [--seme=12345] [--computer]
// Esce audit.json e la sintesi a schermo. Sotto SwiftShader i disegni vanno a vuoto (i conti restano veri, il tempo è del processore).
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');
const root = path.resolve(__dirname, '..');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const has = k => process.argv.includes('--' + k);
const OUT = process.argv.slice(2).find(a => !a.startsWith('--')) || path.join(root, 'reports', 'banco_audit');
const TEL = !has('computer');
const Q = '?cittanuova' + (TEL ? '&leggera' : '') + arg('query', ''), NF = +arg('nf', 900), SEME = +arg('seme', 12345);
const GIRI = arg('giro', 'cammina,corsa,auto').split(',');
const ROTTE = {
  cammina: { ora: 660, corre: false, mete: [[1424, 322], [1410, 343], [1372, 388], [1300, 330], [1278, 340], [1360, 334], [1424, 322]] },
  corsa: { ora: 660, corre: true, mete: [[1424, 322], [1410, 343], [1372, 388], [1300, 330], [1278, 340], [1360, 334], [1424, 322], [1520, 352]] },
  auto: { ora: 900, mete: [[1300, 330], [1360, 334], [1410, 343], [1520, 352], [1560, 344], [1420, 340], [1300, 330]] },
};
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.gz': 'application/gzip' };
fs.mkdirSync(OUT, { recursive: true });
// righe di index.html → modulo (come build.py)
const src = fs.readFileSync(path.join(root, 'src/index.src.html'), 'utf8'), spans = [];
{ let out = '', last = 0; const re = /\/\*([a-z0-9_.]+\.js)\*\//g; let m; const SKIP = new Set(['studio.js', 'skate.js']);
  while ((m = re.exec(src))) { out += src.slice(last, m.index); last = m.index + m[0].length; if (SKIP.has(m[1])) continue; const s = fs.readFileSync(path.join(root, 'src', m[1]), 'utf8'); const l0 = out.split('\n').length; out += s; spans.push([l0, out.split('\n').length, m[1]]); } }
const modOf = ln => { for (const s of spans) if (ln >= s[0] && ln < s[1]) return s[2]; return 'pagina'; };
const linea = (url, ln) => { if (/index\.html/.test(url || '')) { const m = modOf(ln); const s = spans.find(q => q[2] === m); return [m, s ? ln - s[0] + 1 : ln]; } return [url ? url.split('/').pop() || '(interno)' : '(interno)', ln]; };

function initPage(opt) {
  window.__pulita = true; window.__nodraw = true;
  { let a = opt.seme >>> 0 || 1; Math.random = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const A = window.__au = { on: false, rec: [], cur: null, big: [], tex: new Map(), buf: new Map(), rb: new Map() };
  const Z = () => ({ draw: 0, inst: 0, istanze: 0, prog: 0, btex: 0, unif: 0, upTex: 0, upBuf: 0, texNuove: 0, bufNuovi: 0, fbo: 0, tri: 0 });
  const BPP = { 6408: 4, 6407: 3, 6409: 1, 6410: 2, 6406: 1, 6403: 1, 33319: 2, 32856: 4, 32849: 3, 34842: 8, 34836: 16, 33326: 4, 33328: 8, 33325: 2, 33327: 4, 33321: 1, 33323: 2, 35898: 4, 33189: 2, 33190: 4, 36012: 4, 35056: 4, 36013: 8, 6402: 4 };
  const TYPEB = { 5121: 1, 5126: 4, 5131: 2, 36193: 2, 5123: 2, 5125: 4, 34042: 4 };
  const pila = () => { const s = (new Error().stack || '').split('\n').slice(3, 12).filter(l => /index\.html/.test(l)).slice(0, 4).map(l => { const m = l.match(/at (?:new )?([\w$.<>]+)? ?\(?.*?:(\d+):\d+\)?$/); return m ? (m[1] || '?') + '@' + m[2] : ''; }); return s.join(' < '); };
  const tb = new WeakMap();   // contesto → texture legata (per unità attiva semplice: TEXTURE_2D / 2D_ARRAY / 3D)
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) { if (!C) continue; const P = C.prototype;
    const w = (k, fn) => { const f = P[k]; if (!f) return; P[k] = fn(f); };
    for (const k of ['drawElements', 'drawArrays', 'drawRangeElements']) w(k, f => function (mode, count) { if (A.cur) { A.cur.d.draw++; A.cur.d.tri += (mode === 4 ? (k === 'drawRangeElements' ? arguments[3] : count) / 3 : 0); } if (window.__nodraw) return; return f.apply(this, arguments); });
    for (const k of ['drawElementsInstanced', 'drawArraysInstanced']) w(k, f => function (mode, a1, a2, a3, a4) { const n = k === 'drawElementsInstanced' ? a4 : a3, c = k === 'drawElementsInstanced' ? a1 : a2; if (A.cur) { A.cur.d.draw++; A.cur.d.inst++; A.cur.d.istanze += n; A.cur.d.tri += mode === 4 ? c / 3 * n : 0; } if (window.__nodraw) return; return f.apply(this, arguments); });
    w('useProgram', f => function () { if (A.cur) A.cur.d.prog++; return f.apply(this, arguments); });
    w('bindFramebuffer', f => function () { if (A.cur) A.cur.d.fbo++; return f.apply(this, arguments); });
    w('bindTexture', f => function (t, o) { if (A.cur) A.cur.d.btex++; let m = tb.get(this); if (!m) tb.set(this, m = {}); m[t] = o; return f.apply(this, arguments); });
    for (const k of Object.getOwnPropertyNames(P)) if (/^uniform/.test(k) && typeof P[k] === 'function') w(k, f => function () { if (A.cur) A.cur.d.unif++; return f.apply(this, arguments); });
    const texAlloc = (gl, target, lv, ifmt, wd, ht, dp, type, bytesOverride) => {
      const o = (tb.get(gl) || {})[target === 34069 || (target > 34069 && target < 34075) ? 34067 : target]; if (!o) return;
      let bpp = BPP[ifmt] || 4; if (type && TYPEB[type] && (ifmt === 6408 || ifmt === 6407 || ifmt === 6409 || ifmt === 6410 || ifmt === 6406)) bpp = ({ 6408: 4, 6407: 3, 6409: 1, 6410: 2, 6406: 1 }[ifmt]) * TYPEB[type];
      const b = bytesOverride !== undefined ? bytesOverride : wd * ht * (dp || 1) * bpp * (lv === 0 ? 1 : 0);
      if (lv !== 0) return;
      const r = A.tex.get(o) || { b: 0, w: wd, h: ht, d: dp || 1, st: '' }; const nuova = !A.tex.has(o);
      r.b = Math.max(r.b, b) * (target >= 34069 && target <= 34074 ? 1 : 1); r.w = wd; r.h = ht; r.d = dp || 1; A.tex.set(o, r);
      if (A.cur) { A.cur.d.upTex += b; if (nuova) A.cur.d.texNuove++; }
      if (A.on && Math.max(wd, ht) >= 512) A.big.push({ f: A.rec.length, w: wd, h: ht, d: dp || 1, mb: +(b / 1048576).toFixed(2), nuova, chi: pila() });
    };
    w('texImage2D', f => function (t, lv, ifmt, a3, a4, a5, a6, a7) { try { if (arguments.length >= 8) texAlloc(this, t, lv, ifmt, a3, a4, 1, a7); else { const src = arguments[5]; texAlloc(this, t, lv, ifmt, src.width || src.videoWidth || 0, src.height || src.videoHeight || 0, 1, a4); } } catch (e) { } return f.apply(this, arguments); });
    w('texImage3D', f => function (t, lv, ifmt, wd, ht, dp, b, fmt, type) { try { texAlloc(this, t, lv, ifmt, wd, ht, dp, type); } catch (e) { } return f.apply(this, arguments); });
    w('texStorage2D', f => function (t, lv, ifmt, wd, ht) { try { texAlloc(this, t, 0, ifmt, wd, ht, 1, 0, wd * ht * (BPP[ifmt] || 4) * (lv > 1 ? 4 / 3 : 1)); } catch (e) { } return f.apply(this, arguments); });
    w('texStorage3D', f => function (t, lv, ifmt, wd, ht, dp) { try { texAlloc(this, t, 0, ifmt, wd, ht, dp, 0, wd * ht * dp * (BPP[ifmt] || 4) * (lv > 1 ? 4 / 3 : 1)); } catch (e) { } return f.apply(this, arguments); });
    w('compressedTexImage2D', f => function (t, lv, ifmt, wd, ht, b, data) { try { if (lv === 0) texAlloc(this, t, 0, ifmt, wd, ht, 1, 0, data ? data.byteLength * 4 / 3 : 0); } catch (e) { } return f.apply(this, arguments); });
    for (const k of ['texSubImage2D', 'texSubImage3D']) w(k, f => function () { if (A.cur) { let b = 0; try { const a = arguments; if (k === 'texSubImage2D') b = a.length >= 9 ? a[4] * a[5] * 4 : (a[6].width || 0) * (a[6].height || 0) * 4; else b = a[5] * a[6] * a[7] * 4; } catch (e) { } A.cur.d.upTex += b; } return f.apply(this, arguments); });
    const bb = new WeakMap();
    w('bindBuffer', f => function (t, o) { let m = bb.get(this); if (!m) bb.set(this, m = {}); m[t] = o; return f.apply(this, arguments); });
    w('bufferData', f => function (t, d) { try { const o = (bb.get(this) || {})[t]; const b = typeof d === 'number' ? d : d ? d.byteLength : 0; if (o) { if (!A.buf.has(o) && A.cur) A.cur.d.bufNuovi++; A.buf.set(o, b); } if (A.cur) A.cur.d.upBuf += b; } catch (e) { } return f.apply(this, arguments); });
    w('bufferSubData', f => function (t, off, d) { if (A.cur) A.cur.d.upBuf += d ? d.byteLength : 0; return f.apply(this, arguments); });
    w('renderbufferStorage', f => function (t, ifmt, wd, ht) { A.rb.set(this.getParameter(this.RENDERBUFFER_BINDING), wd * ht * (BPP[ifmt] || 4)); return f.apply(this, arguments); });
    w('renderbufferStorageMultisample', f => function (t, s, ifmt, wd, ht) { A.rb.set(this.getParameter(this.RENDERBUFFER_BINDING), wd * ht * (BPP[ifmt] || 4) * s); return f.apply(this, arguments); });
    w('deleteTexture', f => function (o) { A.tex.delete(o); return f.apply(this, arguments); });
    w('deleteBuffer', f => function (o) { A.buf.delete(o); return f.apply(this, arguments); });
    w('deleteRenderbuffer', f => function (o) { A.rb.delete(o); return f.apply(this, arguments); });
  }
  const hook = () => {
    const pv = window.__pv; if (!pv || !pv.G || !pv.R || !pv.R.__models || !pv.R.__models.renderer) { setTimeout(hook, 200); return; }
    const G = pv.G, R = pv.R, rd = R.__models.renderer, s0 = G.step, f0 = R.frame;
    const ROT = window.__rotta = { on: false, pts: [], i: 0, auto: false, corre: false, bloccato: 0, lx: 0, ly: 0, salti: 0 };
    G.step = function (st, dt, inp) {
      if (A.on) { dt = 1 / 60; const p = st.player;
        if (ROT.on && ROT.pts.length) {
          while (ROT.i < ROT.pts.length && Math.hypot(ROT.pts[ROT.i][0] - p.x, ROT.pts[ROT.i][1] - p.y) < (ROT.auto ? 4 : 1.2)) ROT.i++;
          if (ROT.i >= ROT.pts.length) ROT.i = 0;
          const q = ROT.pts[ROT.i], dx = q[0] - p.x, dy = q[1] - p.y, l = Math.hypot(dx, dy) || 1;
          if (Math.hypot(p.x - ROT.lx, p.y - ROT.ly) < .02) ROT.bloccato++; else ROT.bloccato = 0; ROT.lx = p.x; ROT.ly = p.y;
          if (ROT.bloccato > 60) { if (ROT.auto) { const v = st.vehicles.find(k => k.id === p.vehicle); if (v) { v.x = q[0]; v.y = q[1]; v.speed = 0; } } else { p.x = q[0]; p.y = q[1]; } ROT.bloccato = 0; ROT.salti++; }
          if (ROT.auto) { const v = st.vehicles.find(k => k.id === p.vehicle); const ad = v ? Math.atan2(Math.sin(Math.atan2(dy, dx) - v.ang), Math.cos(Math.atan2(dy, dx) - v.ang)) : 0;
            inp = { x: 0, y: 0, aim: p.face, drive: { thr: Math.abs(ad) > 1.2 ? .4 : 1, steer: Math.max(-1, Math.min(1, ad * 1.8)), hb: false, boost: false } }; }
          else inp = { x: dx / l, y: dy / l, sprint: ROT.corre, brake: false, aim: Math.atan2(dy, dx), mag: 1 };
        }
        if (A.cur) A.rec.push(A.cur);
        A.cur = { t0: performance.now(), step: 0, frame: 0, d: Z(), progs0: rd.info.programs ? rd.info.programs.length : 0 };
        const t = performance.now(); try { return s0.call(this, st, dt, inp); } finally { A.cur.step = performance.now() - t; }
      }
      return s0.apply(this, arguments);
    };
    R.frame = function (st, dt, ui) {
      if (!A.on) return f0.apply(this, arguments);
      const t = performance.now(); try { return f0.call(this, st, 1 / 60, ui); } finally { if (A.cur) { A.cur.frame = performance.now() - t; A.cur.progs = (rd.info.programs ? rd.info.programs.length : 0) - A.cur.progs0; A.cur.trisMain = rd.info.render.triangles; A.cur.callsMain = rd.info.render.calls; } }
    };
    A.pronto = true;
  };
  hook();
}

const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
  const ctx = await b.newContext(TEL ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 720 } });
  const pg = await ctx.newPage(), errori = [];
  pg.on('crash', () => { log('[pagina morta]'); process.exit(2); });
  pg.on('pageerror', e => { errori.push(e.message); log('[errore]', e.message); });
  await pg.addInitScript(initPage, { seme: SEME });
  const cdp = await ctx.newCDPSession(pg);
  await pg.goto(`http://localhost:${srv.address().port}/index.html${Q}`, { timeout: 900000 });
  await pg.waitForFunction(() => window.__pv && window.__pv.st && window.__au && window.__au.pronto, null, { timeout: 1500000, polling: 1000 });
  log('caricato', Q, await pg.evaluate(() => window.__tasselli ? JSON.stringify({ on: window.__tasselli.on, motivo: window.__tasselli.motivo }) : 'tasselli ?'));
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(2000);
  await pg.waitForFunction(() => !window.__pv.ui.intro, null, { timeout: 300000, polling: 500 }).catch(() => log('ancora nella schermata iniziale'));
  await pg.evaluate(() => { if (window.Anelli && Anelli.ON) Anelli.finisci(); });
  await pg.evaluate(() => { const pv = window.__pv, R = pv.R, st = pv.st; if (R.setRes) R.setRes(1); R.setRes = null; R.lowQuality = () => { }; if (window.PesoSchermo && PesoSchermo.blocca) PesoSchermo.blocca(); st.deadline = 1e12;
    setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.desat = false; u.letterbox = false; u.dialog = null; u.book = false; u.menu = false; st.over = null; st.chase = false; st.player.hp = 100; st.player.stun = 0; }, 50); });
  const OUTJ = { query: Q, seme: SEME, nf: NF, telefono: TEL, giri: {}, errori };
  for (const nome of GIRI) {
    const ro = ROTTE[nome]; if (!ro) continue; const auto = nome === 'auto';
    const info = await pg.evaluate(([ro, auto]) => { const pv = window.__pv, st = pv.st, p = st.player, R = pv.R, G = pv.G, ui = pv.ui;
      p.vehicle = null; p.indoor = null; p.lv = null; p.path = []; const [x0, y0] = ro.mete[0]; p.x = x0; p.y = y0;
      window.__t0 = window.__t0 || (Math.floor(st.t / 1440) + 1) * 1440; st.t = window.__t0 + ro.ora; window.__meteo = 'sereno';
      ui.zoom = 1; R.cam.x = R.cam.tx = x0; R.cam.y = R.cam.ty = y0;
      const pts = []; for (let k = 1; k < ro.mete.length; k++) { const a = k === 1 ? [x0, y0] : ro.mete[k - 1], q = ro.mete[k]; const P = G.findPath(a[0], a[1], q[0], q[1], auto ? 1 : undefined, auto) || []; P.forEach(n => pts.push(Array.isArray(n) ? n : [n.x, n.y])); if (!P.length) pts.push(q); }
      if (auto) { const v = st.vehicles.find(v => !v.rider && !v.hidden && !v.wreck && !v.traffic && !G.VK[v.kind].boat && !G.VK[v.kind].pocket && v.kind !== 'vespa' && v.kind !== 'bmx');
        if (v) { v.x = x0; v.y = y0; v.speed = 0; v.ang = Math.atan2(pts[0][1] - y0, pts[0][0] - x0); p.x = x0 + 1.5; p.y = y0; G.act(st, 'F'); if (p.vehicle !== v.id) { p.vehicle = v.id; v.rider = 'player'; } } }
      Object.assign(window.__rotta, { on: false, pts, i: 0, auto, corre: !!ro.corre, salti: 0 });
      return { punti: pts.length }; }, [ro, auto]);
    log(nome, JSON.stringify(info));
    for (let k = 0, quiet = 0, tb = Date.now(); Date.now() - tb < 120000 && quiet < 2; k++) { await pg.waitForTimeout(1000); quiet = (await pg.evaluate(() => !(window.__pv.R.ISO && window.__pv.R.ISO.job))) ? quiet + 1 : 0; }
    await pg.waitForTimeout(3000); await pg.evaluate(() => window.gc && window.gc());
    // il trace (raccolte della memoria), il profilo del processore, quello delle allocazioni
    const evs = []; cdp.on('Tracing.dataCollected', d => { for (const e of d.value) if (/GC|Scavenge|MarkCompact|V8\.GC/i.test(e.name || '')) evs.push({ n: e.name, ts: e.ts, dur: e.dur || 0, ph: e.ph, cat: e.cat }); });
    await cdp.send('Tracing.start', { traceConfig: { includedCategories: ['devtools.timeline', 'v8', 'disabled-by-default-v8.gc'], recordMode: 'recordContinuously' }, transferMode: 'ReportEvents' });
    await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start');
    await cdp.send('HeapProfiler.enable'); await cdp.send('HeapProfiler.startSampling', { samplingInterval: 16384, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
    const tw0 = Date.now();
    await pg.evaluate(() => { const A = window.__au; A.rec = []; A.cur = null; A.big = []; A.on = true; window.__rotta.on = true; window.__tw0 = performance.now(); });
    for (let tb = Date.now(), lt = 0; ;) { await pg.waitForTimeout(2000); const n = await pg.evaluate(() => window.__au.rec.length);
      if (n >= NF) break; if (Date.now() - lt > 30000) { lt = Date.now(); log(nome, 'fotogrammi', n); } if (Date.now() - tb > 2400000) throw new Error('troppo lento'); }
    const pageMs = await pg.evaluate(() => { window.__au.on = false; window.__rotta.on = false; return performance.now() - window.__tw0; });
    const { profile } = await cdp.send('Profiler.stop');
    const { profile: hp } = await cdp.send('HeapProfiler.stopSampling');
    await new Promise(r => { cdp.once('Tracing.tracingComplete', r); cdp.send('Tracing.end'); });
    cdp.removeAllListeners('Tracing.dataCollected');
    const rec = await pg.evaluate(() => window.__au.rec.map(f => ({ step: +f.step.toFixed(2), frame: +f.frame.toFixed(2), progs: f.progs || 0, trisMain: f.trisMain, callsMain: f.callsMain, ...f.d })));
    const big = await pg.evaluate(() => window.__au.big);
    const salti = await pg.evaluate(() => window.__rotta.salti);
    // l'inventario a fine giro
    const inv = await pg.evaluate(() => {
      const A = window.__au, R = window.__pv.R, rd = R.__models.renderer, S = R.__models.scene, cam = R.getCamera();
      let texB = 0, bufB = 0, rbB = 0; A.tex.forEach(r => texB += r.b); A.buf.forEach(b => bufB += b); A.rb.forEach(b => rbB += b);
      const tdim = {}; A.tex.forEach(r => { const k = r.w + '×' + r.h + (r.d > 1 ? '×' + r.d : ''); const q = tdim[k] || (tdim[k] = { n: 0, mb: 0 }); q.n++; q.mb += r.b / 1048576; });
      const lights = []; let mesh = 0, vis = 0, inst = 0, instN = 0, skinned = 0, ombra = 0; const mats = new Set(), geos = new Set(), byType = {};
      const fr = new THREE.Frustum(); cam.updateMatrixWorld(); fr.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
      S.traverseVisible(o => {
        if (o.isLight && o.castShadow && o.shadow) lights.push({ tipo: o.type, map: o.shadow.mapSize.x + '×' + o.shadow.mapSize.y, ha: !!o.shadow.map, auto: o.shadow.autoUpdate });
        if (!o.isMesh && !o.isPoints && !o.isLine && !o.isSprite) return; mesh++;
        if (o.isInstancedMesh) { inst++; instN += o.count; } if (o.isSkinnedMesh) skinned++; if (o.castShadow) ombra++;
        const mm = Array.isArray(o.material) ? o.material : [o.material]; mm.forEach(m => m && mats.add(m)); geos.add(o.geometry);
        if (o.geometry && o.geometry.boundingSphere && o.frustumCulled !== false) { const s = o.geometry.boundingSphere.clone().applyMatrix4(o.matrixWorld); if (fr.intersectsSphere(s)) vis++; } else vis++;
        const k = (mm[0] && mm[0].type) || '?'; byType[k] = (byType[k] || 0) + 1;
      });
      const matKey = new Set(); mats.forEach(m => matKey.add(m.type + '|' + (m.onBeforeCompile ? String(m.onBeforeCompile).length : 0) + '|' + (m.customProgramCacheKey ? m.customProgramCacheKey() : '') + '|' + !!m.map + !!m.transparent));
      const inf = rd.info.memory, rt = rd.getRenderTarget();
      return { programmi: rd.info.programs ? rd.info.programs.length : 0, geometrie3: inf.geometries, texture3: inf.textures, texMB: +(texB / 1048576).toFixed(1), bufMB: +(bufB / 1048576).toFixed(1), rbMB: +(rbB / 1048576).toFixed(1), nTex: A.tex.size, nBuf: A.buf.size,
        texPerMisura: Object.entries(tdim).sort((a, b) => b[1].mb - a[1].mb).slice(0, 14).map(([k, v]) => `${k}: ${v.n}× ${v.mb.toFixed(1)} MB`), luciOmbra: lights, oggetti: mesh, nelCampo: vis, istanziate: inst, istanze: instN, scheletri: skinned, fannoOmbra: ombra, materiali: mats.size, materialiDiversi: matKey.size, geometrie: geos.size, perTipo: byType,
        heap: Math.round(performance.memory.usedJSHeapSize / 1048576), tela: rd.domElement.width + '×' + rd.domElement.height, pixelRatio: rd.getPixelRatio(), npc: window.__pv.st.npcs.length, mezzi: window.__pv.st.vehicles.length };
    });
    // processore: tempo proprio per modulo e per funzione
    const byId = new Map(profile.nodes.map(n => [n.id, n])), self = new Map(); profile.samples.forEach((id, k) => { self.set(id, (self.get(id) || 0) + (profile.timeDeltas[k] || 0)); });
    const perMod = {}, perFn = {}; let totUs = 0;
    self.forEach((us, id) => { const cf = byId.get(id).callFrame; const [m, ln] = linea(cf.url, cf.lineNumber + 1); const mod = cf.url ? m : (cf.functionName ? '(' + cf.functionName + ')' : '(nativo)'); perMod[mod] = (perMod[mod] || 0) + us; const fk = `${cf.functionName || '(anon)'} ${m}:${ln}`; perFn[fk] = (perFn[fk] || 0) + us; totUs += us; });
    // tempo incluso dei sistemi (le radici del fotogramma): G.step e R.frame e i loro figli diretti per modulo
    const parent = new Map(); profile.nodes.forEach(n => (n.children || []).forEach(c => parent.set(c, n.id)));
    const incl = {}; self.forEach((us, id) => { const seen = new Set(); for (let q = id; q !== undefined; q = parent.get(q)) { const cf = byId.get(q).callFrame; if (!cf.url) continue; const [m] = linea(cf.url, cf.lineNumber + 1); const k = m + ' ' + (cf.functionName || '(anon)'); if (seen.has(k)) continue; seen.add(k); incl[k] = (incl[k] || 0) + us; } });
    const nfr = rec.length;
    const msFr = us => +(us / 1000 / nfr).toFixed(2);
    // allocazioni: per modulo:funzione (tempo proprio di chi alloca)
    const allo = {}, alloM = {}; let alloT = 0; const walk = n => { const cf = n.callFrame; const [m, ln] = linea(cf.url, cf.lineNumber + 1); const s = n.selfSize || 0; if (s) { const k = `${cf.functionName || '(anon)'} ${m}:${ln}`; allo[k] = (allo[k] || 0) + s; alloM[m] = (alloM[m] || 0) + s; alloT += s; } (n.children || []).forEach(walk); }; walk(hp.head);
    // raccolte
    const gc = { minori: 0, maggiori: 0, msMinori: 0, msMaggiori: 0 };
    evs.filter(e => e.ph === 'X').forEach(e => { if (/^MinorGC$|Scavenge/.test(e.n) && e.cat.indexOf('devtools') >= 0) { gc.minori++; gc.msMinori += e.dur / 1000; } else if (/^MajorGC$/.test(e.n) && e.cat.indexOf('devtools') >= 0) { gc.maggiori++; gc.msMaggiori += e.dur / 1000; } });
    const min = pageMs / 60000;
    const media = k => +(rec.reduce((s, f) => s + (f[k] || 0), 0) / nfr).toFixed(1), mx = k => Math.max(...rec.map(f => f[k] || 0)), qq = (k, p) => { const a = rec.map(f => f[k] || 0).sort((x, y) => x - y); return a[Math.floor(a.length * p)]; };
    const Gx = { fotogrammi: nfr, salti, minuti_pagina: +min.toFixed(2),
      perFotogramma: { disegni: media('draw'), disegni_p95: qq('draw', .95), disegni_max: mx('draw'), disegniPrincipale: media('callsMain'), istanziati: media('inst'), istanze: media('istanze'), triangoli_k: +(media('tri') / 1000).toFixed(0), triangoliPrincipale_k: +(media('trisMain') / 1000).toFixed(0), cambiProgramma: media('prog'), bindTexture: media('btex'), uniform: media('unif'), bindFramebuffer: media('fbo'), caricatoTexKB: +(media('upTex') / 1024).toFixed(0), caricatoBufKB: +(media('upBuf') / 1024).toFixed(0), texNuove: media('texNuove'), bufNuovi: media('bufNuovi'),
        caricatoTexMB_max: +(mx('upTex') / 1048576).toFixed(1), caricatoBufMB_max: +(mx('upBuf') / 1048576).toFixed(1), shaderNuovi: rec.reduce((s, f) => s + Math.max(0, f.progs), 0), logica_ms: media('step'), grafica_ms: media('frame') },
      gc: { minori: gc.minori, maggiori: gc.maggiori, minoriPerMin: +(gc.minori / min).toFixed(1), maggioriPerMin: +(gc.maggiori / min).toFixed(1), msMinori: +gc.msMinori.toFixed(0), msMaggiori: +gc.msMaggiori.toFixed(0), msGcPerFotogramma: +((gc.msMinori + gc.msMaggiori) / nfr).toFixed(2) },
      allocatoMBperFotogramma: +(alloT / 1048576 / nfr).toFixed(3), allocatoMBperMin: +(alloT / 1048576 / min).toFixed(0),
      allocaPerModulo: Object.entries(alloM).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => `${(v / 1024 / nfr).toFixed(1)} KB/fot ${k}`),
      allocaPerFunzione: Object.entries(allo).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => `${(v / 1024 / nfr).toFixed(1)} KB/fot ${k}`),
      cpuPerModulo: Object.entries(perMod).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => `${msFr(v)} ms/fot ${(v / totUs * 100).toFixed(1)}% ${k}`),
      cpuPerFunzione: Object.entries(perFn).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, v]) => `${msFr(v)} ms/fot ${(v / totUs * 100).toFixed(1)}% ${k}`),
      cpuIncluso: Object.entries(incl).sort((a, b) => b[1] - a[1]).slice(0, 60).map(([k, v]) => `${msFr(v)} ms/fot ${(v / totUs * 100).toFixed(1)}% ${k}`),
      textureGrandiNelGioco: (() => { const m = {}; big.forEach(t => { const k = `${t.w}×${t.h}${t.d > 1 ? '×' + t.d : ''} ${t.chi}`; const q = m[k] || (m[k] = { n: 0, mb: 0, nuove: 0 }); q.n++; q.mb += t.mb; if (t.nuova) q.nuove++; }); return Object.entries(m).sort((a, b) => b[1].mb - a[1].mb).slice(0, 15).map(([k, v]) => `${v.n}× (${v.nuove} nuove) ${v.mb.toFixed(1)} MB  ${k}`); })(),
      inventario: inv };
    OUTJ.giri[nome] = Gx;
    log(`== ${nome}`); console.log(JSON.stringify({ perFotogramma: Gx.perFotogramma, gc: Gx.gc, alloc: Gx.allocatoMBperMin, inv: { ...inv, texPerMisura: undefined, perTipo: undefined } }, null, 1));
    console.log('  cpu per modulo:\n    ' + Gx.cpuPerModulo.slice(0, 15).join('\n    '));
    console.log('  alloca per funzione:\n    ' + Gx.allocaPerFunzione.slice(0, 10).join('\n    '));
    console.log('  texture grandi nel gioco:\n    ' + Gx.textureGrandiNelGioco.slice(0, 8).join('\n    '));
    fs.writeFileSync(path.join(OUT, 'audit.json'), JSON.stringify(OUTJ, null, 1));
  }
  log('fatto', OUT);
  await b.close(); srv.close(); process.exit(0);
});
