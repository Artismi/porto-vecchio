// [fluido] IL BANCO DEL TELEFONO (v7/FLUIDO.md). Il gioco come lo apre l'APK: la pagina d'ingresso del Game Boy (android/app/src/main/ingresso)
// col gioco nell'iframe /gioco/index.html, {pvc:'ciao'} (modalità console), un telefono Android tipico di traverso (873×393 CSS, DPR 2,75,
// tocco: il profilo leggero lo sceglie il gioco da solo). Seme fisso, passo fisso di 1/60 s, le prove di disegno a vuoto (SwiftShader: i ms
// sono del processore, il disegno si conta alla fonte WebGL). Per ogni posto (inizio, porto, piazza) fermo in strada alle 11 col sereno:
//   - ms di JS per fotogramma con il processore rallentato (CDP, --cpu=4): simulazione (G.step), grafica (R.frame: three e i passi), altro
//     (il resto dei giri del browser: main.js, HUD, regolatori, moduli con un requestAnimationFrame loro);
//   - per fotogramma: disegni (scena, ombre, passi a tutta tela), triangoli, cambi di programma, texture legate, bersagli, pixel dei passi a
//     tutta tela; i programmi, le texture e i bersagli vivi; la tela, la risoluzione interna, MSAA; le mappe d'ombra e chi fa ombra;
//   - il profilo del processore (tempo proprio e incluso per modulo:riga), le allocazioni (KB per fotogramma per funzione), le raccolte;
//   - una foto per posto (disegno vero, senza rallentamento) se c'è --foto=<cartella>.
//   node strumenti/banco_fluido.js <out.json> [--indice=<un altro index.html>] [--cpu=4] [--nf=180] [--posti=inizio,porto,piazza]
//        [--foto=<cartella>] [--query=&...] [--diretto] (senza il Game Boy: il gioco solo, a tutta finestra)
// I regolatori (peso_ritmo, fluido_tel) restano al gradino di partenza: si misura quello che il telefono ha all'avvio.
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');
const root = path.resolve(__dirname, '..'), ingr = path.resolve(root, '../android/app/src/main/ingresso');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const has = k => process.argv.includes('--' + k);
const OUT = process.argv.slice(2).find(a => !a.startsWith('--')) || '/tmp/banco_fluido.json';
const NF = +arg('nf', 180), CPU = +arg('cpu', 4), SEME = 12345, FOTO = arg('foto', null), DIRETTO = has('diretto');
const POSTI = arg('posti', 'inizio,porto,piazza').split(',');
const Q = arg('query', '');
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.gz': 'application/gzip', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
// righe di index.html → modulo (come build.py)
const src = fs.readFileSync(path.join(root, 'src/index.src.html'), 'utf8'), spans = [];
{ let out = '', last = 0; const re = /\/\*([a-z0-9_.]+\.js)\*\//g; let m; const SKIP = new Set(['studio.js', 'skate.js']);
  while ((m = re.exec(src))) { out += src.slice(last, m.index); last = m.index + m[0].length; if (SKIP.has(m[1])) continue; const s = fs.readFileSync(path.join(root, 'src', m[1]), 'utf8'); const l0 = out.split('\n').length; out += s; spans.push([l0, out.split('\n').length, m[1]]); } }
const INDICE = arg('indice', null);
const modOf = ln => { for (const s of spans) if (ln >= s[0] && ln < s[1]) return s; return null; };
const linea = (url, ln) => { if (/index\.html/.test(url || '') && !INDICE) { const s = modOf(ln); return s ? [s[2], ln - s[0] + 1] : ['pagina', ln]; } if (/index\.html/.test(url || '')) return ['index.html', ln]; return [url ? url.split('/').pop() || '(interno)' : '(interno)', ln]; };

function initPage(opt) {
  if (!/\/gioco\/index\.html|^\/index\.html$|^\/$/.test(location.pathname) || (opt.host && !/\/gioco\//.test(location.pathname))) return;
  window.__pulita = true; window.__nodraw = false;
  { let a = opt.seme >>> 0 || 1; Math.random = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const A = window.__fb = { on: false, rec: [], cur: null, ombra: 0, passo: 0, fbos: null, progs: null, texs: new Set(), rbs: 0 };
  const Z = () => ({ draw: 0, drawOmbra: 0, drawPassi: 0, passi: 0, pxPassi: 0, inst: 0, tri: 0, triOmbra: 0, prog: 0, btex: 0, unif: 0, fbo: 0, raf: 0, step: 0, frame: 0, nRaf: 0 });
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) { if (!C) continue; const P = C.prototype;
    const w = (k, fn) => { const f = P[k]; if (!f) return; P[k] = fn(f); };
    const conta = (mode, count, n) => { const d = A.cur && A.cur.d; if (!d) return; const t = mode === 4 ? count / 3 * n : 0; d.draw++; d.tri += t; if (A.ombra) { d.drawOmbra++; d.triOmbra += t; } if (A.passo) d.drawPassi++; if (n > 1) d.inst++; if (A.fbos) A.fbos.add(A.fb || null); if (A.progs) A.progs.add(A.prog); };
    for (const k of ['drawElements', 'drawArrays']) w(k, f => function (mode, count) { conta(mode, count, 1); if (window.__nodraw) return; return f.apply(this, arguments); });
    w('drawRangeElements', f => function (mode, s, e, count) { conta(mode, count, 1); if (window.__nodraw) return; return f.apply(this, arguments); });
    w('drawElementsInstanced', f => function (mode, count, t, o, n) { conta(mode, count, n); if (window.__nodraw) return; return f.apply(this, arguments); });
    w('drawArraysInstanced', f => function (mode, first, count, n) { conta(mode, count, n); if (window.__nodraw) return; return f.apply(this, arguments); });
    w('useProgram', f => function (p) { A.prog = p; if (A.cur) A.cur.d.prog++; return f.apply(this, arguments); });
    w('bindFramebuffer', f => function (t, fb) { A.fb = fb; if (A.cur) A.cur.d.fbo++; return f.apply(this, arguments); });
    w('bindTexture', f => function (t, o) { if (A.cur) A.cur.d.btex++; if (o) A.texs.add(o); return f.apply(this, arguments); });
    w('deleteTexture', f => function (o) { A.texs.delete(o); return f.apply(this, arguments); });
    for (const k of Object.getOwnPropertyNames(P)) if (/^uniform/.test(k) && typeof P[k] === 'function') w(k, f => function () { if (A.cur) A.cur.d.unif++; return f.apply(this, arguments); });
  }
  // i giri del browser: ognuno cronometrato; un giro nuovo (timestamp diverso) chiude il fotogramma di prima se quello ha disegnato (R.frame):
  // i giri saltati dal tetto a 30 (peso_ritmo) si sommano al fotogramma che disegna
  const raf0 = window.requestAnimationFrame.bind(window); let tsCur = -1;
  window.requestAnimationFrame = function (cb) { return raf0(function (ts) {
    if (A.on && ts !== tsCur && !(A.cur && !A.cur.d.frame)) { tsCur = ts; if (A.cur && A.cur.d.nRaf) A.rec.push(A.cur); A.cur = { d: Z() }; A.fbos = new Set(); A.progs = new Set(); A.cur.fbos = A.fbos; A.cur.progs = A.progs; }
    const t = performance.now(); try { return cb(ts); } finally { if (A.on && A.cur) { A.cur.d.raf += performance.now() - t; A.cur.d.nRaf++; } } }); };
  const hook = () => {
    const pv = window.__pv; if (!pv || !pv.G || !pv.R || !pv.R.__models || !pv.R.__models.renderer) { setTimeout(hook, 200); return; }
    const G = pv.G, R = pv.R, rd = R.__models.renderer, s0 = G.step, f0 = R.frame;
    G.step = function (st, dt, inp) { if (!A.on) return s0.apply(this, arguments); const t = performance.now(); try { return s0.call(this, st, 1 / 60, inp); } finally { if (A.cur) A.cur.d.step += performance.now() - t; } };
    R.frame = function (st, dt, ui) { if (!A.on) return f0.apply(this, arguments); const t = performance.now(); try { return f0.call(this, st, 1 / 60, ui); } finally { if (A.cur) A.cur.d.frame += performance.now() - t; } };
    // [gpu] i tempi della scheda (qui SwiftShader: il processore che fa da scheda) con gl.finish prima e dopo: solo con A.gpuOn
    // la sincronia: una lettura di 1 pixel da un bersaglio nostro (gl.finish in Chromium non aspetta SwiftShader), poi il bersaglio di prima
    const gl = rd.getContext(), px1 = new Uint8Array(4); let fb1 = null;
    const fin = () => { const t = performance.now(); try { if (!fb1) { const tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); fb1 = gl.createFramebuffer(); const pf = gl.getParameter(gl.FRAMEBUFFER_BINDING); gl.bindFramebuffer(gl.FRAMEBUFFER, fb1); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tx, 0); gl.bindFramebuffer(gl.FRAMEBUFFER, pf); gl.bindTexture(gl.TEXTURE_2D, null); rd.resetState(); }
      const pr = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING || gl.FRAMEBUFFER_BINDING); gl.bindFramebuffer(gl.READ_FRAMEBUFFER || gl.FRAMEBUFFER, fb1); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px1); gl.bindFramebuffer(gl.READ_FRAMEBUFFER || gl.FRAMEBUFFER, pr); } catch (e) { gl.finish(); } return performance.now() - t; };
    const gpuT = (k, f) => { if (!A.gpuOn || A.gpuDentro) return f(); A.gpuDentro = true; fin(); const t = performance.now(); try { return f(); } finally { fin(); const ms = performance.now() - t; A.gpuDentro = false; const g = A.gpuCur || (A.gpuCur = {}); g[k] = (g[k] || 0) + ms; } };
    A.gpuT = gpuT;
    // [disegni] un fotogramma, chi disegna cosa: per ogni disegno della scena (non ombre, non passi) il ramo (la fase o il nome dell'antenato
    // figlio della scena), i triangoli, le istanze; A.elenco = {} acceso per un fotogramma
    const rbd = rd.renderBufferDirect; rd.renderBufferDirect = function (cam, sc, geo, mat, obj, grp) {
      if (A.elenco && !A.passo && sc === R.__models.scene) { let top = obj; while (top.parent && top.parent !== sc) top = top.parent;
        const ramo = (top.__fase || top.name || top.type) + (top.userData && top.userData.kind ? ':' + top.userData.kind : '');
        const ic = obj.isInstancedMesh ? obj.count : (geo.isInstancedBufferGeometry ? geo.instanceCount : 1), n = geo.index ? geo.index.count : geo.attributes.position ? geo.attributes.position.count : 0;
        const dr = geo.drawRange, cnt = Math.min(n, dr.count === Infinity ? n : dr.count), tri = (grp ? Math.min(cnt, grp.count) : cnt) / 3 * (ic === Infinity ? 1 : ic);
        if (!A.ombra && A.elencoF) { const kf = ramo + ' > ' + (obj.name || obj.type) + (obj.isSkinnedMesh ? '(scheletro)' : '') + ' | ' + (mat.name || mat.type) + ' | ' + (geo.name || (geo.index ? geo.index.count / 3 : 0) + ' tri'); const f = A.elencoF[kf] || (A.elencoF[kf] = { d: 0, t: 0 }); f.d++; f.t += tri; }
        const E = A.ombra ? (A.elencoO || (A.elencoO = {})) : A.elenco, q = E[ramo] || (E[ramo] = { d: 0, t: 0, ist: 0, mat: new Set() }); q.d++; q.t += tri; q.ist += ic > 1 ? ic : 0; q.mat.add(mat.type + (mat.name ? ':' + mat.name : '')); }
      return rbd.apply(this, arguments); };
    const r0 = rd.render; rd.render = function (s, c) { const self = this, args = arguments; const nm = s === R.__models.scene ? 'scena' : (c && c.isOrthographicCamera) ? 'passo:' + ((s.children[0] && s.children[0].material && (s.children[0].material.name || s.children[0].material.type)) || '?') + '@' + (rd.getRenderTarget() ? rd.getRenderTarget().width + 'x' + rd.getRenderTarget().height : 'tela') : 'altro'; return gpuT(nm, () => r1.apply(self, args)); };
    const r1 = function (s, c) { const fs = c && c.isOrthographicCamera && s && s.children.length <= 2; if (fs && A.cur) { A.cur.d.passi++; const t = rd.getRenderTarget(); A.cur.d.pxPassi += t ? t.width * t.height : rd.domElement.width * rd.domElement.height; (A.cur.np = A.cur.np || []).push((s.children[0] && s.children[0].material && (s.children[0].material.name || s.children[0].material.type)) + '@' + (t ? t.width + '×' + t.height : 'tela')); } if (fs) A.passo++; try { return r0.apply(this, arguments); } finally { if (fs) A.passo--; } };
    const sm = rd.shadowMap, sr = sm.render; sm.render = function () { A.ombra++; let t0 = 0; if (A.gpuOn) { fin(); t0 = performance.now(); } try { return sr.apply(this, arguments); } finally { A.ombra--; if (A.gpuOn) { fin(); const g = A.gpuCur || (A.gpuCur = {}); g.ombra = (g.ombra || 0) + performance.now() - t0; } } };
    A.pronto = true;
  };
  hook();
}

const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = DIRETTO ? '/index.html' : '/index.html';
  if (u.startsWith('/api/') || u.startsWith('/gioco/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  let p;
  if (DIRETTO) p = u === '/index.html' && INDICE ? path.resolve(INDICE) : path.join(root, u);
  else if (u.startsWith('/gioco/')) { const q = u.slice(6); p = q === '/index.html' && INDICE ? path.resolve(INDICE) : path.join(root, q); }
  else p = path.join(ingr, u);
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
  const ctx = await b.newContext({ viewport: { width: 873, height: 393 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36 wv' });
  const pg = await ctx.newPage(), errori = [];
  pg.on('crash', () => { log('[pagina morta]'); process.exit(2); });
  pg.on('pageerror', e => { errori.push(e.message); log('[errore]', e.message); });
  pg.on('console', m => { if (m.type() === 'error' && !/404|Failed to load/.test(m.text())) errori.push(m.text().slice(0, 200)); });
  await pg.addInitScript(initPage, { seme: SEME, host: !DIRETTO });
  const cdp = await ctx.newCDPSession(pg);
  await pg.goto(`http://localhost:${srv.address().port}/${DIRETTO ? 'index.html' : 'index.html'}${Q ? '?' + Q.replace(/^&/, '') : ''}`, { timeout: 900000 });
  let fr = pg.mainFrame();
  if (!DIRETTO) { for (let k = 0; k < 600; k++) { const f = pg.frames().find(f => /\/gioco\/index\.html/.test(f.url())); if (f) { fr = f; break; } await pg.waitForTimeout(1000); } }
  log('cornice', fr.url());
  await fr.waitForFunction(() => window.__tl && window.__tl.gioco && window.__fb && window.__fb.pronto, null, { timeout: 2400000, polling: 1000 });
  log('in gioco', await fr.evaluate(() => JSON.stringify({ console: window.__pv.console, tel: window.PV_TELEFONO, tass: window.__tasselli && window.__tasselli.on })));
  await fr.evaluate(() => { if (window.Anelli && Anelli.ON && Anelli.finisci) Anelli.finisci(); });
  // i regolatori fermi al gradino di partenza: si misura quello che il telefono ha all'avvio
  const avvio = await fr.evaluate(() => { const pv = window.__pv, R = pv.R, st = pv.st; const res0 = R.res; R.setRes = () => res0; R.lowQuality = () => false; st.deadline = 1e12;
    setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.desat = false; u.dialog = null; u.book = false; u.menu = false; st.over = null; st.chase = false; st.player.hp = 100; st.player.stun = 0; }, 50);
    const p = st.player; return { x: p.x, y: p.y, res: res0, ritmo: window.__ritmo ? { i: window.__ritmo.i, tetto: window.__ritmo.tetto } : null, fluidoTel: window.__fluidoTel ? window.__fluidoTel.gradino : null }; });
  log('partenza', JSON.stringify(avvio));
  const dove = await fr.evaluate(() => { const G = window.__pv.G, W = (G.MAP && G.MAP.world) || {}; const sets = (W.sets || []).map(s => ({ k: s.k, x: s.x0 !== undefined ? (s.x0 + s.x1) / 2 : s.x, y: s.y0 !== undefined ? (s.y0 + s.y1) / 2 : s.y })); return { sets: sets.filter(s => /adunata|calata|marina|mercato|scalo/.test(s.k)) }; });
  log('luoghi', JSON.stringify(dove));
  const set = k => dove.sets.find(s => s.k === k);
  const XY = { inizio: [avvio.x, avvio.y], porto: arg('porto', null) ? arg('porto').split(',').map(Number) : [1290, 381], piazza: arg('piazza', null) ? arg('piazza').split(',').map(Number) : set('adunata') ? [set('adunata').x, set('adunata').y] : [1410, 343] };
  const OUTJ = { indice: INDICE || 'questa build', cpu: CPU, nf: NF, avvio, posti: {}, errori };
  for (const nome of POSTI) {
    const [x0, y0] = XY[nome]; log(nome, x0, y0);
    await fr.evaluate(([x0, y0]) => { const pv = window.__pv, st = pv.st, p = st.player, R = pv.R, ui = pv.ui; p.vehicle = null; p.indoor = null; p.lv = null; p.path = [];
      const G = pv.G; let x = x0, y = y0; if (G.findPath) { try { const P = G.findPath(x0 + .5, y0 + .5, x0, y0); if (P && P.length) { const q = P[P.length - 1]; x = Array.isArray(q) ? q[0] : q.x; y = Array.isArray(q) ? q[1] : q.y; } } catch (e) { } }
      p.x = x; p.y = y; window.__t0 = window.__t0 || (Math.floor(st.t / 1440) + 1) * 1440; st.t = window.__t0 + 660; window.__meteo = 'sereno'; if (R.cam) { R.cam.x = R.cam.tx = x; R.cam.y = R.cam.ty = y; } }, [x0, y0]);
    // che la città attorno sia montata (anelli, lavori in sottofondo), poi un po' di fotogrammi per scaldare
    for (let k = 0, quiet = 0, tb = Date.now(); Date.now() - tb < 240000 && quiet < 3; k++) { await pg.waitForTimeout(1500); quiet = (await fr.evaluate(() => !(window.__pv.R.ISO && window.__pv.R.ISO.job) && !(window.Anelli && Anelli.ON && Anelli.occupato && Anelli.occupato()))) ? quiet + 1 : 0; }
    await fr.evaluate(() => { window.__nodraw = true; }); await pg.waitForTimeout(4000);
    if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
    await fr.evaluate(() => { const A = window.__fb; A.rec = []; A.cur = null; A.on = true; });
    // scaldare 30 fotogrammi (JIT, cache), poi la misura col profilo
    for (let tb = Date.now(); ;) { await pg.waitForTimeout(1000); if ((await fr.evaluate(() => window.__fb.rec.length)) >= 30 || Date.now() - tb > 600000) break; }
    await fr.evaluate(() => window.gc && window.gc());
    const evs = []; cdp.on('Tracing.dataCollected', d => { for (const e of d.value) if (/GC|Scavenge|MarkCompact/i.test(e.name || '')) evs.push({ n: e.name, dur: e.dur || 0, ph: e.ph, cat: e.cat }); });
    await cdp.send('Tracing.start', { traceConfig: { includedCategories: ['devtools.timeline', 'v8', 'disabled-by-default-v8.gc'], recordMode: 'recordContinuously' }, transferMode: 'ReportEvents' });
    await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 250 }); await cdp.send('Profiler.start');
    await cdp.send('HeapProfiler.enable'); await cdp.send('HeapProfiler.startSampling', { samplingInterval: 8192, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
    await fr.evaluate(() => { const A = window.__fb; A.rec = []; A.cur = null; window.__fw0 = performance.now(); window.__rlOn = true; window.__rl = {}; window.__rlGeo = new Map(); });
    for (let tb = Date.now(); ;) { await pg.waitForTimeout(2000); const n = await fr.evaluate(() => window.__fb.rec.length); if (n >= NF) break; if (Date.now() - tb > 1800000) { log('troppo lento', n); break; } }
    const pageMs = await fr.evaluate(() => { window.__fb.on = false; window.__rlOn = false; return performance.now() - window.__fw0; });
    const raggiLenti = await fr.evaluate(() => { const n = window.__fb.rec.length || 1, R = {}; for (const k in (window.__rl || {})) R[k] = [+(window.__rl[k][0] / n).toFixed(1), Math.round(window.__rl[k][1] / n)];
      const G = [...(window.__rlGeo || new Map()).values()].sort((a, b) => b.n * b.tri - a.n * a.tri).slice(0, 12).map(r => `${r.k} · ${(r.n / n).toFixed(1)}/fot · ${r.tri} tri · r ${r.r} m · ${r.nome}`); return { perMotivo: R, peggiori: G }; });
    const { profile } = await cdp.send('Profiler.stop');
    try { fs.writeFileSync(OUT.replace(/\.json$/, '') + '_' + nome + '.cpuprofile', JSON.stringify(profile)); } catch (e) { }   // per strumenti/leggi_profilo.js
    const { profile: hp } = await cdp.send('HeapProfiler.stopSampling');
    await new Promise(r => { cdp.once('Tracing.tracingComplete', r); cdp.send('Tracing.end'); });
    cdp.removeAllListeners('Tracing.dataCollected');
    if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const rec = await fr.evaluate(() => window.__fb.rec.map(f => ({ ...f.d, nFbo: f.fbos.size, nProg: f.progs.size, np: f.np || [] })));
    const inv = await fr.evaluate(() => {
      const R = window.__pv.R, rd = R.__models.renderer, S = R.__models.scene, I = rd.info, H = window.__HDR || {};
      const luci = []; let ombra = 0, ombraVis = 0, mesh = 0, skinned = 0; S.traverse(o => { if (o.isLight && o.castShadow && o.shadow) luci.push(o.type + ' ' + o.shadow.mapSize.x + '² ' + (o.shadow.autoUpdate ? 'auto' : 'manuale')); if (o.isMesh) { mesh++; if (o.isSkinnedMesh) skinned++; if (o.castShadow) { ombra++; let v = true; for (let q = o; q; q = q.parent) if (!q.visible) { v = false; break; } if (v) ombraVis++; } } });
      const rt = R.__rt || null;
      return { tela: rd.domElement.width + '×' + rd.domElement.height, css: rd.domElement.clientWidth + '×' + rd.domElement.clientHeight, dpr: devicePixelRatio, interna: (H.L ? (window.__HDR.NW && R.hdStato ? R.hdStato() : '') : ''), hd: R.hdStato ? R.hdStato() : '', res: R.res,
        programmi: I.programs ? I.programs.length : 0, geometrie: I.memory.geometries, texture3: I.memory.textures, textureGL: window.__fb.texs.size, luciOmbra: luci, mesh, scheletri: skinned, fannoOmbra: ombra, fannoOmbraVisibili: ombraVis,
        npc: window.__pv.st.npcs.length, npcVicini: (() => { const p = window.__pv.st.player; return window.__pv.st.npcs.filter(n => Math.hypot(n.x - p.x, n.y - p.y) < 60).length; })(), mezzi: window.__pv.st.vehicles.length, heap: Math.round(performance.memory.usedJSHeapSize / 1048576), fluidoTel: window.__fluidoTel || null,
        // [fluido2] i gradini nuovi del telefono
        nebbia: S.fog ? [Math.round(S.fog.near), Math.round(S.fog.far)] : null, lontanoCamera: Math.round(R.getCamera ? R.getCamera().far : 0), caseLontane: window.__LODT ? { settori: window.__LODT.set.size, lontani: window.__LODT.lontani, scatole: window.__LODT.fatte } : null, genteSpente: window.__GTEL ? window.__GTEL.ultime : null, telq: window.__TELQ || null, braccioRiusati: window.__BRT ? window.__BRT.riusati : null, mezziFermi: window.__MZL ? window.__MZL.n : null, celle: window.PesoFusi ? (c => ({ cella: window.PesoFusi.P.cella, celle: c.celle, fuori: c.celleFuori, ramiFuori: c.ramiFuori }))(window.PesoFusi.conto()) : null,   /* [fluido3] */ gente: window.PesoGente ? (c => ({ lontane: c.lontane, sempl: c.sempl }))(PesoGente.conto()) : null };
    });
    // processore: tempo proprio e incluso per modulo:riga
    const byId = new Map(profile.nodes.map(n => [n.id, n])), self = new Map(); profile.samples.forEach((id, k) => self.set(id, (self.get(id) || 0) + (profile.timeDeltas[k] || 0)));
    const perMod = {}, perFn = {}; let totUs = 0;
    self.forEach((us, id) => { const cf = byId.get(id).callFrame; const [m, ln] = linea(cf.url, cf.lineNumber + 1); const mod = cf.url ? m : '(' + (cf.functionName || 'nativo') + ')'; perMod[mod] = (perMod[mod] || 0) + us; const fk = `${cf.functionName || '(anon)'} ${m}:${ln}`; perFn[fk] = (perFn[fk] || 0) + us; totUs += us; });
    const parent = new Map(); profile.nodes.forEach(n => (n.children || []).forEach(c => parent.set(c, n.id)));
    const incl = {}; self.forEach((us, id) => { const seen = new Set(); for (let q = id; q !== undefined; q = parent.get(q)) { const cf = byId.get(q).callFrame; if (!cf.url) continue; const [m, ln] = linea(cf.url, cf.lineNumber + 1); const k = `${cf.functionName || '(anon)'} ${m}:${ln}`; if (seen.has(k)) continue; seen.add(k); incl[k] = (incl[k] || 0) + us; } });
    const nfr = rec.length, msFr = us => +(us / 1000 / nfr).toFixed(2);
    const allo = {}; let alloT = 0; const walk = n => { const cf = n.callFrame; const [m, ln] = linea(cf.url, cf.lineNumber + 1); const s = n.selfSize || 0; if (s) { const k = `${cf.functionName || '(anon)'} ${m}:${ln}`; allo[k] = (allo[k] || 0) + s; alloT += s; } (n.children || []).forEach(walk); }; walk(hp.head);
    const gc = { minori: 0, maggiori: 0, ms: 0 }; evs.filter(e => e.ph === 'X' && e.cat.indexOf('devtools') >= 0).forEach(e => { if (/^MinorGC$|Scavenge/.test(e.n)) { gc.minori++; gc.ms += e.dur / 1000; } else if (/^MajorGC$/.test(e.n)) { gc.maggiori++; gc.ms += e.dur / 1000; } });
    const med = k => { const a = rec.map(f => f[k] || 0).sort((x, y) => x - y); return +a[Math.floor(a.length / 2)].toFixed(2); }, avg = k => +(rec.reduce((s, f) => s + (f[k] || 0), 0) / nfr).toFixed(2), pq = (k, p) => { const a = rec.map(f => f[k] || 0).sort((x, y) => x - y); return +a[Math.min(a.length - 1, Math.floor(a.length * p))].toFixed(2); };
    rec.forEach(f => { f.altro = f.raf - f.step - f.frame; f.drawScena = f.draw - f.drawOmbra - f.drawPassi; f.triScena = f.tri - f.triOmbra; });
    const passiTipici = (() => { const m = {}; rec.forEach(f => { const k = f.np.join(' > '); m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${v}× ${k}`); })();
    const P = { xy: XY[nome], fotogrammi: nfr, secondi: +(pageMs / 1000).toFixed(1),
      js_ms: { totale: avg('raf'), totale_mediana: med('raf'), totale_p95: pq('raf', .95), simulazione: avg('step'), grafica: avg('frame'), altro: avg('altro'), giriPerFotogramma: avg('nRaf') },
      gl: { disegni: avg('draw'), disegniScena: avg('drawScena'), disegniOmbra: avg('drawOmbra'), disegniPassi: avg('drawPassi'), passiTuttaTela: avg('passi'), MpxPassi: +(avg('pxPassi') / 1e6).toFixed(2), triangoli_k: +(avg('tri') / 1000).toFixed(0), triangoliScena_k: +(avg('triScena') / 1000).toFixed(0), triangoliOmbra_k: +(avg('triOmbra') / 1000).toFixed(0), istanziati: avg('inst'), cambiProgramma: avg('prog'), programmiUsati: avg('nProg'), bindTexture: avg('btex'), uniform: avg('unif'), bersagliUsati: avg('nFbo'), passiTipici },
      gc: { minori: gc.minori, maggiori: gc.maggiori, msPerFotogramma: +(gc.ms / nfr).toFixed(2) }, allocatoKBperFotogramma: +(alloT / 1024 / nfr).toFixed(0),
      allocaPerFunzione: Object.entries(allo).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => `${(v / 1024 / nfr).toFixed(1)} KB/fot ${k}`),
      cpuPerModulo: Object.entries(perMod).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([k, v]) => `${msFr(v)} ms/fot ${(v / totUs * 100).toFixed(1)}% ${k}`),
      cpuProprio: Object.entries(perFn).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, v]) => `${msFr(v)} ms/fot ${(v / totUs * 100).toFixed(1)}% ${k}`),
      cpuIncluso: Object.entries(incl).sort((a, b) => b[1] - a[1]).slice(0, 80).map(([k, v]) => `${msFr(v)} ms/fot ${(v / totUs * 100).toFixed(1)}% ${k}`),
      inventario: inv, raggiLenti };
    OUTJ.posti[nome] = P;
    log(`== ${nome}`, JSON.stringify({ js_ms: P.js_ms, gl: { ...P.gl, passiTipici: undefined }, gc: P.gc, alloc: P.allocatoKBperFotogramma }));
    console.log('  ' + P.gl.passiTipici.join('\n  ')); console.log('  raggi lenti: ' + JSON.stringify(raggiLenti));
    console.log('  incluso:\n    ' + P.cpuIncluso.slice(0, 30).join('\n    '));
    console.log('  proprio:\n    ' + P.cpuProprio.slice(0, 15).join('\n    '));
    console.log('  alloca:\n    ' + P.allocaPerFunzione.slice(0, 6).join('\n    '));
    fs.writeFileSync(OUT, JSON.stringify(OUTJ, null, 1));
    // [gpu] i tempi del disegno vero, fotogramma per fotogramma (senza rallentamento): la mediana di 6 fotogrammi
    await fr.evaluate(() => { window.__nodraw = false; window.__fb.gpuL = []; window.__fb.gpuOn = false; });
    await pg.waitForTimeout(8000);
    const gpu = await fr.evaluate(async () => { const A = window.__fb, L = []; const raf0 = window.requestAnimationFrame;
      for (let k = 0; k < 7; k++) { A.gpuCur = {}; A.gpuOn = true; await new Promise(r => raf0(r)); A.gpuOn = false; if (k) L.push(A.gpuCur); }
      const keys = new Set(); L.forEach(g => Object.keys(g).forEach(k => keys.add(k))); const out = {};
      keys.forEach(k => { const a = L.map(g => g[k] || 0).sort((x, y) => x - y); out[k] = +a[Math.floor(a.length / 2)].toFixed(1); });
      if (out.scena !== undefined && out.ombra !== undefined) out.scenaSenzaOmbra = +(out.scena - out.ombra).toFixed(1); return out; });
    P.gpuSwiftShader_ms = gpu;
    const elenchi = await fr.evaluate(async () => { const A = window.__fb; A.elenco = {}; A.elencoO = {}; A.elencoF = {}; await new Promise(r => requestAnimationFrame(r)); const E = A.elenco, EO = A.elencoO, EF = A.elencoF; A.elenco = null; A.elencoO = null; A.elencoF = null;
      const fa = M => Object.entries(M).sort((a, b) => b[1].t - a[1].t).slice(0, 30).map(([k, q]) => `${(q.t / 1000).toFixed(0)}k tri · ${q.d} disegni${q.ist ? ' · ' + q.ist + ' istanze' : ''} · ${k} · ${[...q.mat].slice(0, 3).join(',')}`);
      return [fa(E), fa(EO), Object.entries(EF).sort((a, b) => b[1].t - a[1].t).slice(0, 40).map(([k, q]) => `${(q.t / 1000).toFixed(1)}k tri · ${q.d} · ${k}`)]; });
    P.disegniPerRamo = elenchi[0]; P.disegniOmbraPerRamo = elenchi[1]; P.disegniFini = elenchi[2];
    log('disegni per ramo:\n    ' + P.disegniPerRamo.slice(0, 20).join('\n    ') + '\n  ombra:\n    ' + P.disegniOmbraPerRamo.slice(0, 10).join('\n    ')); log('gpu (SwiftShader, ms)', JSON.stringify(gpu)); fs.writeFileSync(OUT, JSON.stringify(OUTJ, null, 1));
    if (FOTO) { fs.mkdirSync(FOTO, { recursive: true });
      await pg.waitForTimeout(5000);
      try { const el = DIRETTO ? null : await pg.$('iframe'); await (el || pg).screenshot({ path: path.join(FOTO, nome + '.png'), timeout: 300000 }); log('foto', path.join(FOTO, nome + '.png')); } catch (e) { log('foto non riuscita', e.message.slice(0, 80)); } }
  }
  log('fatto', OUT, 'errori', JSON.stringify(errori.slice(0, 5)));
  await b.close(); srv.close(); process.exit(0);
});
