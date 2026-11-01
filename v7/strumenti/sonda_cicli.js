// [cpu] LA SONDA DEI CICLI: chi prende il filo della pagina, callback per callback, anche fuori dal ciclo di main.js.
// misura.js (?perf) attribuisce il tempo per modulo solo se il ciclo nasce dentro un <script data-m>: i cicli avviati da DOMContentLoaded,
// da una promessa o da un setTimeout sciolto finivano in «altro:ciclo». Qui, prima di ogni script della pagina, si avvolgono
// requestAnimationFrame, setTimeout, setInterval, requestIdleCallback, i messaggi dei Worker e gli eventi: ogni callback prende il nome
// «funzione@riga» della riga di index.html che l'ha chiesta (la sonda la traduce nel modulo: writing, bottino, tasselli…). Per ognuna:
// quante volte, il totale, la media, il massimo, quante sopra 16/50/100 ms; per ogni fotogramma chi ha preso di più. In più le chiamate
// della scheda video e delle tele 2D che possono far aspettare (getProgramParameter, readPixels, getImageData, drawImage, texImage2D…),
// attribuite alla callback in cui avvengono, i Long Animation Frame del navigatore e, per fase, il profilo del processore (.cpuprofile).
//   node strumenti/sonda_cicli.js [--query=&leggera&tassellivecchi] [--fasi=fermo:30,cammina:45,fermo2:25] [--vw=480] [--vh=270]
//                                 [--nodraw] [--out=reports/sonda_cicli]
// --nodraw: i disegni vanno a vuoto (come banco_peso.js): SwiftShader non rasterizza e i fotogrammi corrono alla velocità del processore.
// Senza, in SwiftShader un fotogramma dura 1-5 s e il filo della pagina è fermo per lo più ad aspettare la scheda video finta.
// Esce <out>.json (callback, chiamate, fotogrammi lenti, LoAF) e <out>_<fase>.cpuprofile; a schermo la tabella. Un Chromium solo, chiuso alla fine.
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || 'playwright');
const root = path.resolve(__dirname, '..');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const has = k => process.argv.includes('--' + k);
const Q = '?cittanuova' + arg('query', '&leggera&tassellivecchi'), OUT = arg('out', path.join(root, 'reports', 'sonda_cicli'));
const FASI = arg('fasi', 'fermo:30,cammina:45,fermo2:25').split(',').map(s => s.split(':'));
const VW = +arg('vw', 480), VH = +arg('vh', 270), NODRAW = has('nodraw');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.bin': 'application/octet-stream', '.webp': 'image/webp', '.gz': 'application/gzip', '.glb': 'model/gltf-binary', '.png': 'image/png' };
// le righe di index.html → il modulo (<script data-m="…">)
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').split('\n'), MODS = [];
html.forEach((l, i) => { const m = /<script data-m="([^"]+)"/.exec(l); if (m) MODS.push([i + 1, m[1]]); });
const modOf = ln => { let r = '?'; for (const [s, n] of MODS) { if (s <= ln) r = n; else break; } return r; };
const ann = k => k.replace(/@(\d+)/g, (a, l) => '@' + l + '(' + modOf(+l) + ')');

// dentro la pagina, prima di tutto
function sonda() {
  const now = () => performance.now();
  const P = window.__sonda = { cb: {}, gl: {}, frames: [], cur: null, curTs: -1, fr: null, loaf: [], t0: 0 };
  const site = () => { const s = (new Error().stack || '').split('\n'); for (let i = 2; i < s.length; i++) { const m = /index\.html[^:\s]*:(\d+):\d+/.exec(s[i]); if (m) return m[1]; } return '?'; };
  const K = new WeakMap(), keyOf = (fn, pre) => { let k = K.get(fn); if (!k) { k = pre + (fn.name || '?') + '@' + site(); K.set(fn, k); } return k; };
  const rec = (k, dt) => { const c = P.cb[k] || (P.cb[k] = { n: 0, tot: 0, max: 0, h16: 0, h50: 0, h100: 0 }); c.n++; c.tot += dt; if (dt > c.max) c.max = dt; if (dt > 16) c.h16++; if (dt > 50) c.h50++; if (dt > 100) c.h100++; };
  const run = (k, fn, self, args) => { const prev = P.cur; P.cur = k; const a = now(); try { return fn.apply(self, args); } finally { const dt = now() - a; P.cur = prev; rec(k, dt); if (P.fr && dt > .3) P.fr.by[k] = (P.fr.by[k] || 0) + dt; } };
  const raf0 = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = fn => { const k = keyOf(fn, 'R:'); return raf0(ts => { if (ts !== P.curTs) { if (P.fr) P.frames.push(P.fr); if (P.frames.length > 5000) P.frames.shift(); P.curTs = ts; P.fr = { ts, by: {} }; } return run(k, fn, window, [ts]); }); };
  const st0 = window.setTimeout.bind(window), si0 = window.setInterval.bind(window);
  window.setTimeout = (fn, ms, ...a) => typeof fn !== 'function' ? st0(fn, ms, ...a) : st0(function () { return run(keyOf(fn, 'T:'), fn, this, arguments); }, ms, ...a);
  window.setInterval = (fn, ms, ...a) => typeof fn !== 'function' ? si0(fn, ms, ...a) : si0(function () { return run(keyOf(fn, 'I:'), fn, this, arguments); }, ms, ...a);
  if (window.requestIdleCallback) { const ric = window.requestIdleCallback.bind(window); window.requestIdleCallback = (fn, o) => { const k = keyOf(fn, 'IDLE:'); return ric(d => run(k, fn, window, [d]), o); }; }
  const ael = EventTarget.prototype.addEventListener, rel = EventTarget.prototype.removeEventListener, EW = new WeakMap();
  EventTarget.prototype.addEventListener = function (t, f, o) { if (typeof f !== 'function' || /^(pointer|mouse|touch|key|wheel|focus|blur|resize|scroll)/.test(t)) return ael.call(this, t, f, o); const k = (typeof Worker !== 'undefined' && this instanceof Worker ? 'W:' : 'E:') + t + ':' + keyOf(f, ''); let w = EW.get(f); if (!w) { w = function () { return run(k, f, this, arguments); }; EW.set(f, w); } return ael.call(this, t, w, o); };
  EventTarget.prototype.removeEventListener = function (t, f, o) { return rel.call(this, t, EW.get(f) || f, o); };
  if (typeof Worker !== 'undefined') { const d = Object.getOwnPropertyDescriptor(Worker.prototype, 'onmessage'); Object.defineProperty(Worker.prototype, 'onmessage', { configurable: true, get() { return this.__om; }, set(f) { this.__om = f; const k = 'W:onmessage:' + (f ? keyOf(f, '') : ''); d.set.call(this, f ? (ev => run(k, f, this, [ev])) : f); } }); }
  const wrapM = (proto, names, pre) => names.forEach(n => { const o = proto[n]; if (typeof o !== 'function') return; proto[n] = function () { const a = now(); try { return o.apply(this, arguments); } finally { const dt = now() - a; if (dt > .05) { const k = (P.cur || '(fuori)') + ' | ' + pre + n; const g = P.gl[k] || (P.gl[k] = { n: 0, tot: 0, max: 0 }); g.n++; g.tot += dt; if (dt > g.max) g.max = dt; } } }; });
  const GLN = ['readPixels', 'texImage2D', 'texSubImage2D', 'texImage3D', 'texSubImage3D', 'getProgramParameter', 'getShaderParameter', 'getError', 'finish', 'flush', 'getParameter', 'getQueryParameter', 'linkProgram', 'compileShader', 'bufferData', 'bufferSubData', 'getUniformLocation', 'getBufferSubData', 'clientWaitSync', 'generateMipmap', 'blitFramebuffer', 'copyTexSubImage2D', 'checkFramebufferStatus', 'texStorage2D', 'useProgram'];
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) if (C) wrapM(C.prototype, GLN, 'gl.');
  wrapM(CanvasRenderingContext2D.prototype, ['getImageData', 'putImageData', 'drawImage', 'fillText', 'measureText'], '2d.');
  wrapM(HTMLCanvasElement.prototype, ['toDataURL', 'getContext'], 'cv.');
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) { if (e.duration < 120) continue; P.loaf.push({ d: Math.round(e.duration), blocco: Math.round(e.blockingDuration || 0), script: (e.scripts || []).filter(s => s.duration > 8).map(s => `${Math.round(s.duration)}ms ${s.invokerType} ${s.sourceFunctionName || ''}`) }); if (P.loaf.length > 400) P.loaf.shift(); } }).observe({ type: 'long-animation-frame', buffered: false }); } catch (e) { }
}
function nodraw() { for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) { if (!C) continue; const P = C.prototype; for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements']) { const f = P[k]; if (f) P[k] = function () { }; } } }

const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(root, u), (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(u)] || 'application/octet-stream' }); r.end(d); }); }).listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const R = {}; fs.mkdirSync(path.dirname(OUT), { recursive: true });
  try {
    const pg = await b.newPage({ viewport: { width: VW, height: VH } });
    pg.on('pageerror', e => console.log('[errore]', e.message));
    if (NODRAW) await pg.addInitScript(nodraw);
    await pg.addInitScript(sonda);
    const t0 = Date.now();
    await pg.goto(`http://localhost:${srv.address().port}/index.html${Q}`, { timeout: 600000 });
    await pg.waitForFunction(() => window.__tl && window.__tl.gioco, null, { timeout: 900000, polling: 1000 });
    console.log('in gioco dopo', ((Date.now() - t0) / 1000).toFixed(0), 's');
    const cdp = await pg.context().newCDPSession(pg); await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 1000 });
    for (const [nome, sec] of FASI) {
      await pg.evaluate(() => { const P = window.__sonda; P.cb = {}; P.gl = {}; P.frames = []; P.fr = null; P.loaf = []; P.t0 = performance.now(); });
      await cdp.send('Profiler.start');
      const tasti = /^cammina/.test(nome) ? ['w'] : /^corri/.test(nome) ? ['w', 'Shift'] : [];
      for (const k of tasti) await pg.keyboard.down(k);
      await pg.waitForTimeout(+sec * 1000);
      for (const k of tasti) await pg.keyboard.up(k);
      const { profile } = await cdp.send('Profiler.stop'); fs.writeFileSync(OUT + '_' + nome + '.cpuprofile', JSON.stringify(profile));
      R[nome] = await pg.evaluate(() => { const P = window.__sonda, fr = P.frames.slice(), iv = []; for (let i = 1; i < fr.length; i++) iv.push(fr[i].ts - fr[i - 1].ts); iv.sort((a, b) => a - b);
        return { durata: Math.round(performance.now() - P.t0), fotogrammi: fr.length, med: iv[iv.length >> 1], p90: iv[Math.floor(iv.length * .9)],
          cb: Object.entries(P.cb).map(([k, c]) => [k, +c.tot.toFixed(1), c.n, +(c.tot / c.n).toFixed(2), +c.max.toFixed(1), c.h16, c.h50, c.h100]).sort((a, b) => b[1] - a[1]).slice(0, 40),
          gl: Object.entries(P.gl).map(([k, g]) => [k, +g.tot.toFixed(1), g.n, +g.max.toFixed(1)]).sort((a, b) => b[1] - a[1]).slice(0, 30),
          lenti: fr.map((f, i) => ({ dt: i ? f.ts - fr[i - 1].ts : 0, chi: Object.entries(f.by).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => k + '=' + v.toFixed(0)) })).sort((a, b) => b.dt - a.dt).slice(0, 8),
          loaf: P.loaf.slice(-12) }; });
      const r = R[nome];
      console.log(`\n== ${nome}: ${r.durata} ms, ${r.fotogrammi} fotogrammi, intervallo mediano ${r.med && r.med.toFixed(0)} ms, p90 ${r.p90 && r.p90.toFixed(0)} ms`);
      console.log('  callback                                                           tot ms     n   media   max  >16 >50 >100');
      r.cb.slice(0, 20).forEach(c => console.log('  ' + ann(c[0]).padEnd(64), String(c[1]).padStart(8), String(c[2]).padStart(5), String(c[3]).padStart(7), String(c[4]).padStart(6), String(c[5]).padStart(4), String(c[6]).padStart(3), String(c[7]).padStart(4)));
      console.log('  chiamate che aspettano (callback | chiamata: tot ms, n, max)');
      r.gl.slice(0, 10).forEach(c => console.log('   ' + ann(c[0]).padEnd(74), c.slice(1).join('  ')));
      console.log('  fotogrammi più lenti'); r.lenti.slice(0, 5).forEach(s => console.log('   ' + s.dt.toFixed(0).padStart(6) + ' ms  ' + s.chi.map(ann).join(' ; ')));
    }
  } catch (e) { console.log('ERRORE', e.message); }
  fs.writeFileSync(OUT + '.json', JSON.stringify(R, null, 1));
  await b.close(); srv.close(); console.log('\n→', OUT + '.json');
});
