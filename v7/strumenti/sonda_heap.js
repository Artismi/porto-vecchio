// [telefono] CHI TIENE L'HEAP: profilo di allocazione campionato (CDP HeapProfiler.startSampling, 32 KB) acceso prima del caricamento e
// letto dopo il garbage collector: gli oggetti vivi per funzione (file:riga di index.html) e per antenati. Non vede i buffer tipizzati (sono
// fuori dall'heap di V8): per quelli c'è sonda_telefono.js. È così che si è visto che renderer.compile clonava ~170 MB di uniform per i
// materiali dei pezzi invisibili.   node strumenti/sonda_heap.js <out.json>
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium, devices } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');
const root = path.resolve(__dirname, '..');
const OUT = process.argv[2] || '/tmp/sonda_heap.json';
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary' };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info'] });
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, userAgent: devices['iPhone 13'].userAgent });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => log('[errore]', e.message));
  await pg.addInitScript(() => { window.__pulita = true; window.__nodraw = true;
    for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) { if (!C) continue; const P = C.prototype;
      for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements']) { const f = P[k]; if (!f) continue; P[k] = function () { if (window.__nodraw) return; return f.apply(this, arguments); }; } } });
  const cdp = await ctx.newCDPSession(pg);
  await cdp.send('HeapProfiler.enable'); await cdp.send('HeapProfiler.startSampling', { samplingInterval: 32768, includeObjectsCollectedByMajorGC: false, includeObjectsCollectedByMinorGC: false });
  await pg.goto(`http://localhost:${srv.address().port}/index.html?cittanuova`, { timeout: 900000 });
  await pg.waitForFunction(() => window.__pv && window.__pv.st && window.__pv.R && window.__pv.R.__models.renderer, null, { timeout: 1200000, polling: 1000 });
  log('caricato'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(8000);
  await cdp.send('HeapProfiler.collectGarbage'); await pg.waitForTimeout(1000); await cdp.send('HeapProfiler.collectGarbage');
  const heap = await pg.evaluate(() => Math.round(performance.memory.usedJSHeapSize / 1e6));
  const { profile } = await cdp.send('HeapProfiler.stopSampling');
  // l'albero: selfSize per nodo; si aggregano per funzione e per antenati
  const self = new Map(), total = new Map();
  const walk = (n, anc) => { const cf = n.callFrame, k = cf.functionName + ' @' + (cf.url || '').split('/').pop().split('?')[0] + ':' + (cf.lineNumber + 1);
    self.set(k, (self.get(k) || 0) + n.selfSize);
    const a2 = anc.concat([cf.functionName + ':' + (cf.lineNumber + 1)]); const seen = new Set(); for (const q of a2) { if (seen.has(q)) continue; seen.add(q); total.set(q, (total.get(q) || 0) + n.selfSize); }
    (n.children || []).forEach(c => walk(c, a2)); };
  walk(profile.head, []);
  const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => [k, +(v / 1e6).toFixed(1)]);
  const out = { heap_mb: heap, campione_mb: +([...self.values()].reduce((a, b) => a + b, 0) / 1e6).toFixed(0), self: top(self, 70), total: top(total, 90) };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
  await b.close(); srv.close();
});
