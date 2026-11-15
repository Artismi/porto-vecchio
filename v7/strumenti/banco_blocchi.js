// [fluido2] IL BANCO DEI BLOCCHI (v7/FLUIDO2.md). Il gioco come lo apre l'APK (come banco_fluido.js: il Game Boy, il telefono di traverso,
// il profilo leggero), poi una passeggiata scritta: dall'inizio al porto e alla Piazza Grande a passo d'uomo, poi in BMX veloce verso i
// luoghi lontani (la città che entra camminando e correndo). Processore NON rallentato (si cercano i colpi, non la media). Il profilo del
// processore (1 ms) resta acceso per tutto il giro: ogni fila di campioni senza pause più lunga di --soglia ms è un «blocco», e per ogni
// blocco si dice chi l'ha fatto (le funzioni incluse più pesanti, per modulo:riga). In più i longtask del browser e i fotogrammi oltre soglia.
//   node strumenti/banco_blocchi.js <out.json> [--soglia=50] [--piedi=40] [--bici=45] [--query=&...] [--diretto]
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');
const root = path.resolve(__dirname, '..'), ingr = path.resolve(root, '../android/app/src/main/ingresso');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const has = k => process.argv.includes('--' + k);
const OUT = process.argv.slice(2).find(a => !a.startsWith('--')) || '/tmp/banco_blocchi.json';
const SOGLIA = +arg('soglia', 50), PIEDI = +arg('piedi', 40), BICI = +arg('bici', 45), DIRETTO = has('diretto'), Q = arg('query', '');
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.gz': 'application/gzip', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const src = fs.readFileSync(path.join(root, 'src/index.src.html'), 'utf8'), spans = [];
{ let out = '', last = 0; const re = /\/\*([a-z0-9_.]+\.js)\*\//g; let m; const SKIP = new Set(['studio.js', 'skate.js']);
  while ((m = re.exec(src))) { out += src.slice(last, m.index); last = m.index + m[0].length; if (SKIP.has(m[1])) continue; const s = fs.readFileSync(path.join(root, 'src', m[1]), 'utf8'); const l0 = out.split('\n').length; out += s; spans.push([l0, out.split('\n').length, m[1]]); } }
const modOf = ln => { for (const s of spans) if (ln >= s[0] && ln < s[1]) return s; return null; };
const linea = (url, ln) => { if (/index\.html/.test(url || '')) { const s = modOf(ln); return s ? s[2] + ':' + (ln - s[0] + 1) : 'pagina:' + ln; } return (url ? url.split('/').pop() || '(interno)' : '(interno)') + ':' + ln; };

function initPage(opt) {
  if (!/\/gioco\/index\.html|^\/index\.html$|^\/$/.test(location.pathname) || (opt.host && !/\/gioco\//.test(location.pathname))) return;
  { let a = opt.seme >>> 0 || 1; Math.random = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const B = window.__bl = { lt: [], fr: [], on: false };
  try { new PerformanceObserver(l => { if (B.on) for (const e of l.getEntries()) B.lt.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: false }); } catch (e) { }
  let last = 0; const raf0 = window.requestAnimationFrame.bind(window);
  const tick = t => { if (B.on && last) B.fr.push(Math.round(t - last)); last = t; raf0(tick); }; raf0(tick);
}

const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/') || u.startsWith('/gioco/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = DIRETTO ? path.join(root, u) : u.startsWith('/gioco/') ? path.join(root, u.slice(6)) : path.join(ingr, u);
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info'] });
  const ctx = await b.newContext({ viewport: { width: 873, height: 393 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36 wv' });
  const pg = await ctx.newPage(), errori = [];
  pg.on('crash', () => { log('[pagina morta]'); process.exit(2); });
  pg.on('pageerror', e => { errori.push(e.message); log('[errore]', e.message); });
  await pg.addInitScript(initPage, { seme: 12345, host: !DIRETTO });
  const cdp = await ctx.newCDPSession(pg);
  // il caricamento col profilo acceso: anche i blocchi della schermata iniziale (contano meno: c'è la schermata)
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 1000 });
  await pg.goto(`http://localhost:${srv.address().port}/index.html${Q ? '?' + Q.replace(/^&/, '') : ''}`, { timeout: 900000 });
  let fr = pg.mainFrame();
  if (!DIRETTO) { for (let k = 0; k < 600; k++) { const f = pg.frames().find(f => /\/gioco\/index\.html/.test(f.url())); if (f) { fr = f; break; } await pg.waitForTimeout(1000); } }
  await fr.waitForFunction(() => window.__tl && window.__tl.gioco && window.__pv && window.__pv.st, null, { timeout: 2400000, polling: 1000 });
  log('in gioco', await fr.evaluate(() => JSON.stringify({ tel: window.PV_TELEFONO, tass: window.__tasselli && window.__tasselli.on })));
  await fr.evaluate(() => { const pv = window.__pv, st = pv.st; st.deadline = 1e12; window.__meteo = 'sereno';
    setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.desat = false; u.dialog = null; u.book = false; u.menu = false; st.over = null; st.chase = false; st.player.hp = 100; st.player.stun = 0; }, 50); });
  // aspettare che la città attorno sia montata come farebbe chi gioca (qualche secondo), poi via
  await pg.waitForTimeout(8000);
  await cdp.send('Profiler.start');
  const giro = await fr.evaluate(([PIEDI, BICI]) => new Promise(fine => {
    const pv = window.__pv, G = pv.G, st = pv.st, p = st.player, W = (G.MAP && G.MAP.world) || {};
    const fp = (a, b) => { try { const P = G.findPath(a.x, a.y, b.x, b.y, 1); return (P || []).map(q => Array.isArray(q) ? { x: q[0], y: q[1] } : { x: q.x, y: q.y }); } catch (e) { return []; } };
    const sets = (W.sets || []).map(s => ({ k: s.k, x: s.x0 !== undefined ? (s.x0 + s.x1) / 2 : s.x, y: s.y0 !== undefined ? (s.y0 + s.y1) / 2 : s.y })).filter(s => isFinite(s.x));
    const a0 = { x: p.x, y: p.y };
    const tappe = [{ x: 1290, y: 381 }, { x: 1328, y: 345 }];
    const lont = sets.map(s => [s, Math.hypot(s.x - 1328, s.y - 345)]).filter(q => q[1] > 120 && q[1] < 420).sort((a, b) => a[1] - b[1]);
    const vb = []; for (let k = 0; k < lont.length && vb.length < 3; k += Math.max(1, Math.floor(lont.length / 3))) vb.push(lont[k][0]);
    const linea = (pts) => { const L = []; let c = pts[0]; for (let k = 1; k < pts.length; k++) { const P = fp(c, pts[k]); if (!P.length) continue; L.push(...P); c = P[P.length - 1]; } return L; };
    const piedi = linea([a0, ...tappe]), bici = linea([{ x: 1328, y: 345 }, ...vb, { x: 1328, y: 345 }]);
    const S = { fase: 'piedi', pts: piedi, i: 0, t0: performance.now(), tFase: performance.now(), log: [], tappe: vb.map(s => s.k) };
    // il passo scritto: a ogni giro del browser (G.step il gioco lo chiama dalla sua chiusura, non dalla proprietà) la posizione avanza col tempo vero
    let vel = 3.2, tPrec = performance.now(), via = true;
    const muovi = () => { if (!via) return; requestAnimationFrame(muovi); const now = performance.now(), dt = (now - tPrec) / 1000; tPrec = now;
      const P = S.pts; if (S.i < P.length) { let d = vel * Math.min(dt, .1); while (d > 0 && S.i < P.length) { const q = P[S.i], dx = q.x - p.x, dy = q.y - p.y, h = Math.hypot(dx, dy); if (h <= d) { p.x = q.x; p.y = q.y; d -= h; S.i++; } else { p.x += dx / h * d; p.y += dy / h * d; p.face = Math.atan2(dy, dx); d = 0; } }
        if (p.vehicle) { const v = st.vehicles.find(k => k.id === p.vehicle); if (v) { v.x = p.x; v.y = p.y; v.ang = p.face; v.speed = vel; } } p.speed = vel; } };
    requestAnimationFrame(muovi);
    const tick = () => { const now = performance.now(), el = (now - S.tFase) / 1000;
      if (S.fase === 'piedi' && (el > PIEDI || S.i >= S.pts.length)) { S.log.push(['piedi', +el.toFixed(1), S.i, S.pts.length]); S.fase = 'bici'; S.tFase = now; S.pts = linea([{ x: p.x, y: p.y }, ...vb, { x: 1328, y: 345 }]); S.i = 0; vel = 11; try { pv.bmx(); } catch (e) { } }
      else if (S.fase === 'bici' && (el > BICI || S.i >= S.pts.length)) { S.log.push(['bici', +el.toFixed(1), S.i, S.pts.length, !!p.vehicle]); via = false; fine(S); return; }
      setTimeout(tick, 250); };
    window.__bl.on = true; tick();
  }), [PIEDI, BICI]);
  log('giro', JSON.stringify({ log: giro.log, tappe: giro.tappe }));
  const { profile } = await cdp.send('Profiler.stop');
  const B = await fr.evaluate(() => { const B = window.__bl; B.on = false; return { lt: B.lt, fr: B.fr, heap: Math.round(performance.memory.usedJSHeapSize / 1048576) }; });
  fs.writeFileSync(OUT.replace(/\.json$/, '') + '.cpuprofile', JSON.stringify(profile));
  // i blocchi dal profilo: file di campioni non (idle) più lunghe della soglia
  const byId = new Map(profile.nodes.map(n => [n.id, n])), parent = new Map(); profile.nodes.forEach(n => (n.children || []).forEach(c => parent.set(c, n.id)));
  const nm = id => byId.get(id).callFrame.functionName;
  const runs = []; let cur = null, t = 0;
  profile.samples.forEach((id, k) => { const dt = (profile.timeDeltas[k] || 0) / 1000; t += dt; const idle = nm(id) === '(idle)';
    if (idle) { if (cur) { runs.push(cur); cur = null; } return; }
    if (!cur) cur = { t0: t, ms: 0, s: [] }; cur.ms += dt; cur.s.push([id, dt]); });
  if (cur) runs.push(cur);
  const lunghi = runs.filter(r => r.ms > SOGLIA).map(r => {
    const incl = {}, self = {};
    for (const [id, dt] of r.s) { const cf = byId.get(id).callFrame; const sk = (cf.functionName || '(anon)') + ' ' + (cf.url ? linea(cf.url, cf.lineNumber + 1) : ''); self[sk] = (self[sk] || 0) + dt;
      const seen = new Set(); for (let q = id; q !== undefined; q = parent.get(q)) { const c = byId.get(q).callFrame; if (!c.url) continue; const k = (c.functionName || '(anon)') + ' ' + linea(c.url, c.lineNumber + 1); if (seen.has(k)) continue; seen.add(k); incl[k] = (incl[k] || 0) + dt; } }
    const top = o => Object.entries(o).sort((a, b) => b[1] - a[1]);
    // la causa: la funzione più profonda che tiene almeno il 60% del blocco
    const inc = top(incl); let causa = inc.length ? inc[0][0] : '?';
    { const cand = inc.filter(([k, v]) => v >= r.ms * .6);
      if (cand.length) causa = cand[cand.length - 1][0]; }
    return { t: +(r.t0 / 1000).toFixed(1), ms: Math.round(r.ms), causa, incluso: inc.slice(0, 14).map(([k, v]) => Math.round(v) + ' ' + k), proprio: top(self).slice(0, 6).map(([k, v]) => Math.round(v) + ' ' + k) };
  });
  const fsort = B.fr.slice().sort((a, b) => a - b), q = p => fsort[Math.min(fsort.length - 1, Math.floor(fsort.length * p))];
  const R = { soglia: SOGLIA, giro: giro.log, tappe: giro.tappe, fotogrammi: { n: B.fr.length, mediana: q(.5), p95: q(.95), p99: q(.99), max: fsort[fsort.length - 1], oltre100: B.fr.filter(x => x > 100).length, oltre250: B.fr.filter(x => x > 250).length, oltre500: B.fr.filter(x => x > 500).length },
    longtask: { n: B.lt.length, ms: B.lt.reduce((s, x) => s + x[1], 0), oltre250: B.lt.filter(x => x[1] > 250).length, max: Math.max(0, ...B.lt.map(x => x[1])) },
    blocchi: lunghi.length, blocchiOltre250: lunghi.filter(x => x.ms > 250).length, heapMB: B.heap, errori, elenco: lunghi.sort((a, b) => b.ms - a.ms) };
  // per causa: quante volte e quanti ms
  const pc = {}; for (const l of lunghi) { const k = l.causa; const o = pc[k] || (pc[k] = { n: 0, ms: 0, max: 0 }); o.n++; o.ms += l.ms; o.max = Math.max(o.max, l.ms); }
  R.perCausa = Object.entries(pc).sort((a, b) => b[1].ms - a[1].ms).map(([k, o]) => `${o.n}× · ${o.ms} ms · max ${o.max} · ${k}`);
  fs.writeFileSync(OUT, JSON.stringify(R, null, 1));
  log('fotogrammi', JSON.stringify(R.fotogrammi), 'longtask', JSON.stringify(R.longtask), 'blocchi', R.blocchi, '>250', R.blocchiOltre250);
  console.log('  per causa:\n    ' + R.perCausa.slice(0, 25).join('\n    '));
  console.log('  i più lunghi:'); for (const l of R.elenco.slice(0, 12)) console.log(`    ${l.ms} ms @${l.t}s ${l.causa}\n      ${l.incluso.slice(0, 8).join('\n      ')}`);
  log('fatto', OUT, 'errori', JSON.stringify(errori.slice(0, 5)));
  await b.close(); srv.close(); process.exit(0);
});
