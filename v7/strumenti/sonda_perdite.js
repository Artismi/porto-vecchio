// [audit] LA SONDA DELLE PERDITE: geometrie e tessiture caricate sulla scheda video che restano vive dopo i viaggi. Dopo il caricamento si
// agganciano (BufferGeometry.setAttribute / Texture.needsUpdate: chi le ha fatte, la pila → modulo:funzione; addEventListener('dispose'):
// three le ha caricate; dispose(): liberate). Poi viaggi fra i due posti più lontani dell'isola e un terzo, tornando ogni volta alla
// partenza: a ogni ritorno, per chi le ha fatte, quante caricate sono ancora vive, quante di queste sono in scena e quanti MB.
//   node strumenti/sonda_perdite.js [--telefono] [--giri=3] [--attesa=40] [--query=&...] [--out=file.json] [--indice=<altro index.html>]
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');
const root = path.resolve(__dirname, '..');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const has = k => process.argv.includes('--' + k);
const TEL = has('telefono'), Q = '?cittanuova' + (TEL ? '&leggera' : '') + arg('query', ''), GIRI = +arg('giri', 3), ATT = +arg('attesa', 40), OUTF = arg('out', null);
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.gz': 'application/gzip' };
const src = fs.readFileSync(path.join(root, 'src/index.src.html'), 'utf8'), spans = [];
{ let out = '', last = 0; const re = /\/\*([a-z0-9_.]+\.js)\*\//g; let m; const SKIP = new Set(['studio.js', 'skate.js']);
  while ((m = re.exec(src))) { out += src.slice(last, m.index); last = m.index + m[0].length; if (SKIP.has(m[1])) continue; const s = fs.readFileSync(path.join(root, 'src', m[1]), 'utf8'); const l0 = out.split('\n').length; out += s; spans.push([l0, out.split('\n').length, m[1]]); } }
const modOf = ln => { for (const s of spans) if (ln >= s[0] && ln < s[1]) return [s[2], ln - s[0] + 1]; return ['pagina', ln]; };
const chi = st => (st || '').split(' < ').map(q => { const m = q.match(/^(.*)@(\d+)$/); if (!m) return q; const [f, l] = modOf(+m[2]); return f === 'pagina' ? '' : `${f.replace(/\.js$/, '')}:${m[1]}`; }).filter(Boolean).slice(0, 3).join(' < ') || '(three)';
function aggancia() {
  const T = window.THREE, P = window.__pp = { geo: new Set(), tex: new Set(), n: 0 };
  const pila = () => (new Error().stack || '').split('\n').slice(3, 14).filter(l => /index\.html/.test(l)).map(l => { const m = l.match(/at (?:new )?([\w$.<>]+)? ?\(?.*?:(\d+):\d+\)?$/); return m ? (m[1] || '?') + '@' + m[2] : ''; }).filter(Boolean).slice(0, 6).join(' < ');
  const gp = T.BufferGeometry.prototype, sa = gp.setAttribute, si = gp.setIndex, ael = T.EventDispatcher.prototype.addEventListener;
  gp.setAttribute = function () { if (this.__pk === undefined) this.__pk = pila(); return sa.apply(this, arguments); };
  gp.setIndex = function () { if (this.__pk === undefined) this.__pk = pila(); return si.apply(this, arguments); };
  // three aggancia 'dispose' quando la carica sulla scheda video (WebGLGeometries.get, WebGLTextures.initTexture)
  const on = function (type, fn) { if (type === 'dispose') { if (this.isBufferGeometry) { if (!this.__pu) { this.__pu = 1; P.geo.add(this); if (this.__pk === undefined) this.__pk = pila(); } } else if (this.isTexture && !this.__pu) { this.__pu = 1; P.tex.add(this); if (this.__pk === undefined) this.__pk = pila(); } } return ael.apply(this, arguments); };
  gp.addEventListener = on; T.Texture.prototype.addEventListener = on;
  const gd = gp.dispose; gp.dispose = function () { P.geo.delete(this); this.__pu = 0; return gd.apply(this, arguments); };
  const td = T.Texture.prototype.dispose; T.Texture.prototype.dispose = function () { P.tex.delete(this); this.__pu = 0; return td.apply(this, arguments); };
  const d = Object.getOwnPropertyDescriptor(T.Texture.prototype, 'needsUpdate'); if (d && d.set) Object.defineProperty(T.Texture.prototype, 'needsUpdate', { configurable: true, get: d.get, set(v) { if (v && this.__pk === undefined) this.__pk = pila(); d.set.call(this, v); } });
}
function conta() {
  const P = window.__pp, R = window.__pv.R, rd = R.__models.renderer, S = R.__models.scene, inS = new Set(), tS = new Set();
  S.traverse(o => { if (o.geometry) inS.add(o.geometry); const mm = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; mm.forEach(m => { for (const k in m) { const v = m[k]; if (v && v.isTexture) tS.add(v); } if (m.uniforms) for (const k in m.uniforms) { const v = m.uniforms[k] && m.uniforms[k].value; if (v && v.isTexture) tS.add(v); } }); });
  const by = {}, add = (k, scena, b, t) => { const q = by[k] || (by[k] = { n: 0, scena: 0, mb: 0, fuori_mb: 0, tipo: t }); q.n++; if (scena) q.scena++; q.mb += b / 1048576; if (!scena) q.fuori_mb += b / 1048576; };
  const gb = g => { let b = 0; for (const k in g.attributes) { const a = g.attributes[k]; b += (a.count || 0) * (a.itemSize || 1) * (a.array && a.array.BYTES_PER_ELEMENT || 4); } if (g.index) b += g.index.count * (g.index.array && g.index.array.BYTES_PER_ELEMENT || 2); return b; };
  P.geo.forEach(g => add('G ' + (g.__pk || ''), inS.has(g), gb(g), 'geo'));
  P.tex.forEach(t => { const im = t.image || {}; add('T ' + (t.__pk || (t.constructor.name + ' ' + (im.width || 0) + '×' + (im.height || 0) + (t.name ? ' ' + t.name : ''))), tS.has(t), (im.width || 0) * (im.height || 0) * (im.depth || 1) * 4, 'tex'); });
  const inf = rd.info.memory;
  let gpuGeo = 0; P.geo.forEach(g => { gpuGeo += gb(g); });
  return { geometrie: inf.geometries, texture: inf.textures, nuoveGeo: P.geo.size, nuoveTex: P.tex.size, mbGeoNuove: Math.round(gpuGeo / 1048576), by, heap: Math.round(performance.memory.usedJSHeapSize / 1048576), scena: inS.size, rilascio: window.__rilascio };
}
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = u === '/index.html' && arg('indice', null) ? path.resolve(arg('indice')) : path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
  const ctx = await b.newContext(TEL ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 720 } });
  const pg = await ctx.newPage();
  pg.on('crash', () => { log('[pagina morta]'); process.exit(2); });
  pg.on('pageerror', e => log('[errore]', e.message));
  await pg.addInitScript(() => { window.__pulita = true; window.__nodraw = true; for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) { if (!C) continue; const P = C.prototype; for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements']) { const f = P[k]; P[k] = function () { if (window.__nodraw) return; return f.apply(this, arguments); }; } } });
  await pg.goto(`http://localhost:${srv.address().port}/index.html${Q}`, { timeout: 900000 });
  await pg.waitForFunction(() => window.__pv && window.__pv.st && window.__pv.R && window.__pv.R.__models && window.__pv.R.__models.renderer, null, { timeout: 1500000, polling: 1000 });
  log('caricato', Q);
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(2000);
  const posti = await pg.evaluate(() => { if (window.Anelli && Anelli.ON) Anelli.finisci(); const pv = window.__pv, st = pv.st, G = pv.G; st.deadline = 1e12;
    setInterval(() => { const u = pv.ui; u.dialog = null; u.book = false; u.menu = false; st.over = null; st.player.hp = 100; }, 50);
    const P = Object.values(G.PLACES).filter(q => q && q.x !== undefined && G.walkM(q.x, q.y)); let a = null, b = null, bd = 0; for (const p of P) for (const q of P) { const d = Math.hypot(p.x - q.x, p.y - q.y); if (d > bd) { bd = d; a = p; b = q; } }
    const m = P.find(q => q.id === 'mercato') || P[0]; return { partenza: [st.player.x, st.player.y], a: [a.x, a.y, a.id], b: [b.x, b.y, b.id], c: [m.x, m.y, m.id] }; });
  log(JSON.stringify(posti));
  const quiete = async (ms) => { for (let quiet = 0, tb = Date.now(); Date.now() - tb < ms * 1000 && quiet < 3;) { await pg.waitForTimeout(1500); quiet = (await pg.evaluate(() => !(window.__pv.R.ISO && window.__pv.R.ISO.job))) ? quiet + 1 : 0; } };
  const vai = async (x, y) => { await pg.evaluate(([x, y]) => { const pv = window.__pv, p = pv.st.player; p.vehicle = null; p.indoor = null; p.lv = null; p.path = []; p.x = x; p.y = y; pv.R.cam.x = pv.R.cam.tx = x; pv.R.cam.y = pv.R.cam.ty = y; }, [x, y]); await quiete(ATT); };
  await quiete(60); await pg.evaluate(() => window.gc && window.gc());
  await pg.evaluate(aggancia);
  const [x0, y0] = posti.partenza, campioni = [];
  const misura = async (nome) => { await pg.evaluate(() => window.gc && window.gc()); await pg.waitForTimeout(500); const m = await pg.evaluate(conta); m.nome = nome; campioni.push(m);
    const top = Object.entries(m.by).sort((a, b) => b[1].n - a[1].n).slice(0, 8).map(([k, v]) => `${v.n} (${v.scena} in scena, ${v.mb.toFixed(1)} MB, fuori ${v.fuori_mb.toFixed(1)}) ${chi(k.slice(2)).slice(0, 110)} [${v.tipo}]`);
    log(`== ${nome}: three geometrie ${m.geometrie}, texture ${m.texture}; caricate dopo l'aggancio e vive: geo ${m.nuoveGeo}, tex ${m.nuoveTex}; heap ${m.heap} MB\n    ` + top.join('\n    ')); };
  await misura('partenza');
  for (let g = 0; g < GIRI; g++) { await vai(posti.a[0], posti.a[1]); await vai(posti.b[0], posti.b[1]); await vai(posti.c[0], posti.c[1]); await vai(x0, y0); await misura('ritorno ' + (g + 1)); }
  const fin = campioni[campioni.length - 1];
  const S = { query: Q, telefono: TEL, posti, campioni: campioni.map(c => ({ nome: c.nome, geometrie: c.geometrie, texture: c.texture, nuoveGeo: c.nuoveGeo, nuoveTex: c.nuoveTex, mbGeoNuove: c.mbGeoNuove, heap: c.heap, rilascio: c.rilascio })),
    perChi: Object.entries(fin.by).sort((a, b) => b[1].n - a[1].n).slice(0, 40).map(([k, v]) => ({ chi: chi(k.slice(2)), pila: k.slice(2), ...v })) };
  if (OUTF) fs.writeFileSync(OUTF, JSON.stringify(S, null, 1));
  console.log(JSON.stringify(S.campioni));
  await b.close(); srv.close(); process.exit(0);
});
