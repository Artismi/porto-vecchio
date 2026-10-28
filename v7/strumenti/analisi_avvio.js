// [analisi] L'AVVIO E I PRIMI SECONDI, MISURATI: dalla pagina aperta al gioco che risponde, poi 15 s di gioco.
//   node strumenti/analisi_avvio.js [cartella con index.html] [--nome=x] [--query=&leggera] [--telefono] [--secondi=15]
// Scrive <tmp>/analisi_<nome>.json e stampa: i tempi delle tappe (__tl), i byte scaricati per tipo (anche compressi gzip: quelli
// che manda Vercel), i compiti lunghi del processore, le funzioni che costano di più nel caricamento (profilo CPU), la memoria e
// i fotogrammi dei primi secondi di gioco. In SwiftShader il disegno è lento: contano i rapporti e il tempo di processore.
const path = require('path'), http = require('http'), fs = require('fs'), zlib = require('zlib');
const { chromium } = require(process.env.PW || 'playwright');
const ARG = {}, POS = [];
for (const a of process.argv.slice(2)) { const m = /^--([a-z]+)(?:=(.*))?$/.exec(a); if (m) ARG[m[1]] = m[2] === undefined ? true : m[2]; else POS.push(a); }
const root = path.resolve(POS[0] || path.join(__dirname, '..')), NOME = ARG.nome || 'avvio', SEC = +(ARG.secondi || 15);
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.woff2': 'font/woff2', '.gz': 'application/gzip' };
const GZ = new Map(); const gz = (p, d) => { if (!GZ.has(p)) GZ.set(p, /\.(html|js|json|txt|css)$/.test(p) ? zlib.gzipSync(d, { level: 6 }).length : d.length); return GZ.get(p); };
const servito = [];
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } servito.push({ u, b: d.length, gz: gz(p, d), t: Date.now() }); res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info'] });
  const out = { nome: NOME, root, query: ARG.query || '', telefono: !!ARG.telefono };
  try {
    const ctx = await b.newContext(ARG.telefono ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 720 } });
    const pg = await ctx.newPage(), cdp = await ctx.newCDPSession(pg);
    const errori = []; pg.on('pageerror', e => errori.push(e.message));
    await pg.addInitScript(() => { window.__lt = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ type: 'longtask', buffered: true }); } catch (e) { } });
    await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 1000 }); await cdp.send('Profiler.start');
    const t0 = Date.now();
    await pg.goto(`http://localhost:${srv.address().port}/index.html?${(ARG.query || '').replace(/^&/, '')}`, { waitUntil: 'domcontentloaded', timeout: 0 });
    out.dcl = Date.now() - t0;
    await pg.waitForFunction(() => window.__tl && window.__tl.gioco, null, { timeout: 1800000, polling: 1000 });
    out.gioco_s = +((Date.now() - t0) / 1000).toFixed(1);
    const { profile } = await cdp.send('Profiler.stop');
    out.tl = await pg.evaluate(() => Object.assign({}, window.__tl)); out.fasi = await pg.evaluate(() => Object.fromEntries(Object.entries(window.__rt || {}).filter(([k, v]) => typeof v === 'number').sort((a, b) => b[1] - a[1]).slice(0, 25)));
    out.nav = await pg.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return n ? { dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd), risposta: Math.round(n.responseEnd) } : null; });
    out.lunghi = await pg.evaluate(() => { const L = window.__lt || []; return { n: L.length, ms: L.reduce((a, b) => a + b[1], 0), piu: L.slice().sort((a, b) => b[1] - a[1]).slice(0, 12) }; });
    out.mem = await pg.evaluate(() => performance.memory ? { heapMB: Math.round(performance.memory.usedJSHeapSize / 1048576) } : null);
    out.tasselli = await pg.evaluate(() => window.Tasselli ? { on: !!(Tasselli.on || Tasselli.attivi), info: (() => { try { return JSON.stringify(Tasselli.stato ? Tasselli.stato() : {}).slice(0, 300); } catch (e) { return ''; } })() } : null);
    // il profilo: tempo proprio per funzione (url:riga), e per «sezione» di index.html (il commento /*nome.js*/ più vicino sopra la riga)
    const self = new Map(), dt = profile.timeDeltas, byId = new Map(profile.nodes.map(n => [n.id, n])), cnt = new Map();
    profile.samples.forEach((id, i) => cnt.set(id, (cnt.get(id) || 0) + (dt[i] || 0)));
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').split('\n'), sezioni = []; html.forEach((l, i) => { const m = /<script data-m="([^"]+)"/.exec(l); if (m) sezioni.push([i, m[1]]); });
    const sezOf = (url, ln) => { if (!/index\.html/.test(url)) return url.replace(/^.*\//, '') || '(nativo)'; let s = '(pagina)'; for (const [i, n] of sezioni) { if (i <= ln) s = n; else break; } return s; };
    const perSez = new Map();
    cnt.forEach((us, id) => { const n = byId.get(id), f = n.callFrame, k = `${f.functionName || '(anonima)'} ${sezOf(f.url, f.lineNumber)}:${f.lineNumber + 1}`; self.set(k, (self.get(k) || 0) + us); const s = f.url ? sezOf(f.url, f.lineNumber) : f.functionName || '(nativo)'; perSez.set(s, (perSez.get(s) || 0) + us); });
    out.cpu = { totale_s: +([...cnt.values()].reduce((a, b) => a + b, 0) / 1e6).toFixed(1), funzioni: [...self].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, us]) => [k, Math.round(us / 1000)]), sezioni: [...perSez].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, us]) => [k, Math.round(us / 1000)]) };
    // i byte: per cartella/tipo, i più grossi
    const per = {}; let tot = 0, totgz = 0; servito.forEach(s => { const k = s.u.split('/').slice(0, 3).join('/').replace(/\/[^/]*\.[a-z0-9]+$/, '') + (/\.\w+$/.exec(s.u) || [''])[0]; per[k] = per[k] || { n: 0, MB: 0, gzMB: 0 }; per[k].n++; per[k].MB += s.b / 1048576; per[k].gzMB += s.gz / 1048576; tot += s.b; totgz += s.gz; });
    out.rete = { file: servito.length, MB: +(tot / 1048576).toFixed(1), gzMB: +(totgz / 1048576).toFixed(1), per: Object.fromEntries(Object.entries(per).sort((a, b) => b[1].MB - a[1].MB).map(([k, v]) => [k, { n: v.n, MB: +v.MB.toFixed(1), gzMB: +v.gzMB.toFixed(1) }])), grossi: servito.slice().sort((a, b) => b.b - a.b).slice(0, 12).map(s => [s.u, +(s.b / 1048576).toFixed(2), +(s.gz / 1048576).toFixed(2)]) };
    // i primi secondi di gioco: i fotogrammi
    out.fotogrammi = await pg.evaluate(SEC => new Promise(res => { const D = []; let l = performance.now(); const t0 = l; (function f(t) { D.push(t - l); l = t; if (t - t0 < SEC * 1000) requestAnimationFrame(f); else { D.sort((a, b) => a - b); const q = k => Math.round(D[Math.min(D.length - 1, Math.floor(D.length * k))]); res({ n: D.length, fps: +(D.length / SEC).toFixed(1), mediana: q(.5), p95: q(.95), max: Math.round(D[D.length - 1]), oltre100: D.filter(x => x > 100).length }); } })(l); }), SEC);
    out.memDopo = await pg.evaluate(() => performance.memory ? { heapMB: Math.round(performance.memory.usedJSHeapSize / 1048576) } : null);
    out.errori = errori.slice(0, 5);
  } catch (e) { out.errore = String(e); console.error(e); }
  const f = path.join(require('os').tmpdir(), `analisi_${NOME}.json`); fs.writeFileSync(f, JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1).slice(0, 9000)); console.log('scritto', f);
  await b.close(); srv.close(); process.exit(0);
});
