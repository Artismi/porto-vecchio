// [telefono] CHI: chi crea le tele grandi (lo stack di createElement('canvas')), chi mette in scena le mesh sciolte (lo stack di scene.add,
// la mesh di testa, i suoi userData), e dove va il tempo del processore durante il caricamento (CDP Profiler: tempo proprio per funzione e
// tempo totale per antenati). Profilo telefono come sonda_telefono.js. Le righe sono di index.html: strumenti/mappa_righe.py le riporta ai
// sorgenti.   node strumenti/sonda_chi.js <out.json> [--query=&x]
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium, devices } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');
const root = path.resolve(__dirname, '..');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const OUT = process.argv.slice(2).find(a => !a.startsWith('--')) || '/tmp/sonda_chi.json';
const Q = '?cittanuova' + arg('query', ''), W = 844, H = 390, SEME = 12345;
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary' };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, userAgent: devices['iPhone 13'].userAgent });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => log('[errore]', e.message));
  await pg.addInitScript(() => { window.__pulita = true; window.__nodraw = true;
    for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) { if (!C) continue; const P = C.prototype;
      for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements']) { const f = P[k]; if (!f) continue; P[k] = function () { if (window.__nodraw) return; return f.apply(this, arguments); }; } }
    // le tele: chi le crea (le prime 6 righe dello stack con nome di funzione), e la misura al momento del primo getContext
    window.__tele = []; const ce = document.createElement.bind(document);
    const chi = () => (new Error().stack || '').split('\n').slice(3, 9).map(l => (l.match(/at (?:new )?([\w$.<>]+) \(/) || [])[1]).filter(Boolean).join('<');
    document.createElement = function (t, o) { const el = ce(t, o); if (String(t).toLowerCase() === 'canvas') window.__tele.push({ r: new WeakRef(el), chi: chi() }); return el; };
    const tag = () => { if (!window.THREE) { setTimeout(tag, 5); return; } const a0 = THREE.Object3D.prototype.add; THREE.Object3D.prototype.add = function (...objs) { if (this.isScene) { const st = chi(); objs.forEach(o => { if (o && !o.__src) o.__src = st; }); } return a0.apply(this, objs); }; }; tag();
  });
  await pg.addInitScript(seme => { let a = seme >>> 0 || 1; Math.random = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }, SEME);
  const cdp = await ctx.newCDPSession(pg);
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 2000 }); await cdp.send('Profiler.start');
  await pg.goto(`http://localhost:${srv.address().port}/index.html${Q}`, { timeout: 900000 });
  await pg.waitForFunction(() => window.__pv && window.__pv.st && window.__pv.R && window.__pv.R.__models.renderer, null, { timeout: 1200000, polling: 1000 });
  const { profile } = await cdp.send('Profiler.stop'); log('caricato');
  // il profilo: tempo proprio per funzione (nome + riga nel file), e il tempo totale per i grandi antenati noti
  const nodes = new Map(profile.nodes.map(n => [n.id, n])), self = new Map(), dtByNode = new Map();
  for (let i = 0; i < profile.samples.length; i++) { const id = profile.samples[i], dt = profile.timeDeltas[i] || 0; dtByNode.set(id, (dtByNode.get(id) || 0) + dt); }
  const parent = new Map(); profile.nodes.forEach(n => (n.children || []).forEach(c => parent.set(c, n.id)));
  const total = new Map();
  dtByNode.forEach((dt, id) => { const n = nodes.get(id), cf = n.callFrame, k = cf.functionName + ' @' + (cf.url || '').split('/').pop() + ':' + (cf.lineNumber + 1); self.set(k, (self.get(k) || 0) + dt);
    const seen = new Set(); for (let q = id; q !== undefined; q = parent.get(q)) { const m = nodes.get(q).callFrame, kk = m.functionName + ':' + (m.lineNumber + 1); if (seen.has(kk)) continue; seen.add(kk); total.set(kk, (total.get(kk) || 0) + dt); } });
  const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => [k, +(v / 1e6).toFixed(2)]);
  const out = { carico_s: +((Date.now() - T0) / 1000).toFixed(0), avvio: await pg.evaluate(() => window.__rt), cpu_self_s: top(self, 60), cpu_total_s: top(total, 80) };
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(3000);
  out.tele = await pg.evaluate(() => { const by = {}; (window.__tele || []).forEach(e => { const c = e.r.deref(); if (!c || !c.width) return; const k = e.chi + ' ' + c.width + '×' + c.height; const q = by[k] || (by[k] = { n: 0, mb: 0 }); q.n++; q.mb += c.width * c.height * 4 / 1e6; });
    return Object.entries(by).map(([k, v]) => [k, v.n, +v.mb.toFixed(1)]).sort((a, b) => b[2] - a[2]).slice(0, 40); });
  out.mesh = await pg.evaluate(() => { const S = window.__pv.R.__models.scene, by = {}, geos = new Set();
    const top = o => { let q = o; while (q.parent && q.parent !== S) q = q.parent; return q; };
    S.traverse(o => { if (!o.isMesh || !o.geometry) return; const u = o.userData; if (u.fusione1 || u.ombra1 || u.statico1 || o.isInstancedMesh || o.isSkinnedMesh) return;
      const t = top(o), ks = Object.keys(t.userData).filter(k => t.userData[k]).slice(0, 4).join(','), src = (t.__src || '?').split('<').slice(0, 4).join('<');
      const k = src + ' | ' + (t.name || t.type) + ' | ' + ks + (o.userData.lazy1 ? ' | lazy1' : ''); const q = by[k] || (by[k] = { n: 0, mb: 0, vis: 0 });
      q.n++; if (o.visible) q.vis++; const g = o.geometry; if (!geos.has(g)) { geos.add(g); for (const a in g.attributes) q.mb += g.attributes[a].array.byteLength / 1e6; if (g.index) q.mb += g.index.array.byteLength / 1e6; } });
    return Object.entries(by).map(([k, v]) => [k, v.n, v.vis, +v.mb.toFixed(1)]).sort((a, b) => b[3] - a[3]).slice(0, 45); });
  out.materiali = await pg.evaluate(() => { const S = window.__pv.R.__models.scene, ms = new Set(), tx = new Set(); let n = 0; S.traverse(o => { if (!o.material) return; (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (!m) return; ms.add(m); for (const k in m) { const t = m[k]; if (t && t.isTexture) tx.add(t); } }); n++; }); return { oggetti_con_materiale: n, materiali: ms.size, tessiture: tx.size }; });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
  await b.close(); srv.close();
});
