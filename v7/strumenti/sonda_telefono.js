// [telefono] LA SONDA DEL TELEFONO: carica index.html come un iPhone 13 (touch, 844×390, dpr 2 → il profilo PHONE di render.js), Chromium
// senza scheda video (SwiftShader, disegni a vuoto fuori dalle misure), città nuova, seme fisso; porta il giocatore in un'inquadratura del
// banco e misura: i tempi delle fasi dell'avvio (window.__rt), heap JS dopo il garbage collector, byte della geometria per categoria
// (fusione1, ombra1, statico1, pezzi lazy1 rifatti, mesh sciolte…), le tele vive (createElement('canvas') intercettato) con le misure più
// pesanti, le tessiture, lo streaming, disegni e triangoli, ms di R.frame e G.step, i file scaricati. Senza scheda video i ms valgono per i
// rapporti; heap, tele, disegni e fasi dell'avvio valgono ovunque. Due giri si confrontano a occhio (prima/dopo).
//   node strumenti/sonda_telefono.js <out.json> [--query=&nopeso] [--vw=844] [--vh=390] [--scatto=borgo|notte|citta|vittoria] [--nostart]
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium, devices } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');
const root = path.resolve(__dirname, '..');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const has = k => process.argv.includes('--' + k);
const OUT = process.argv.slice(2).find(a => !a.startsWith('--')) || '/tmp/sonda_telefono.json';
const Q = '?cittanuova' + arg('query', ''), W = +arg('vw', 844), H = +arg('vh', 390), SEME = 12345;
const SCATTI = { borgo: { x: 1424, y: 322, zoom: .75, ora: 660 }, notte: { x: 1424, y: 322, zoom: .75, ora: 1320 }, citta: { x: 1420, y: 340, zoom: 4, ora: 840 }, vittoria: { x: 1410, y: 343, zoom: .95, ora: 720 } };
const SC = SCATTI[arg('scatto', 'borgo')];
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };
const RETE = { n: 0, byte: 0, file: {} };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } RETE.n++; RETE.byte += d.length; RETE.file[u] = d.length; res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, userAgent: devices['iPhone 13'].userAgent });
  const pg = await ctx.newPage(), errori = [], console_err = [];
  pg.on('pageerror', e => { errori.push(e.message); log('[errore]', e.message); });
  pg.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/404|Failed to load/.test(t)) { console_err.push(t.slice(0, 300)); log('[console]', t.slice(0, 300)); } if (/\[peso\]|\[memoria\]|\[telefono\]/.test(t)) log('[pagina]', t.slice(0, 400)); });
  await pg.addInitScript(() => { window.__pulita = true; window.__nodraw = true;
    for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) { if (!C) continue; const P = C.prototype;
      for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements']) { const f = P[k]; if (!f) continue; P[k] = function () { if (window.__nodraw) return; return f.apply(this, arguments); }; } }
    // tutte le tele create: per contare i byte (width × height × 4)
    window.__tele = []; const ce = document.createElement.bind(document);
    document.createElement = function (t, o) { const el = ce(t, o); if (String(t).toLowerCase() === 'canvas') window.__tele.push(new WeakRef(el)); return el; };
    if (window.OffscreenCanvas) { const OC = window.OffscreenCanvas; window.OffscreenCanvas = function (w, h) { const c = new OC(w, h); window.__tele.push(new WeakRef(c)); return c; }; window.OffscreenCanvas.prototype = OC.prototype; }
  });
  await pg.addInitScript(seme => { let a = seme >>> 0 || 1; Math.random = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }, SEME);
  const cdp = await ctx.newCDPSession(pg);
  await pg.goto(`http://localhost:${srv.address().port}/index.html${Q}`, { timeout: 900000 });
  await pg.waitForFunction(() => window.__pv && window.__pv.st && window.__pv.R && window.__pv.R.__models.renderer, null, { timeout: 1200000, polling: 1000 });
  const carico = +((Date.now() - T0) / 1000).toFixed(0); log('caricato', Q, 'telefono =', await pg.evaluate(() => window.PV_TELEFONO), 'nuova =', await pg.evaluate(() => window.PV_NUOVA));
  const tempi_avvio = await pg.evaluate(() => window.__rt || null);
  if (!has('nostart')) { await pg.keyboard.press('Enter'); await pg.waitForTimeout(2000); }
  await pg.evaluate(() => { const R = window.__pv.R; if (R.setRes) R.setRes(1); R.setRes = null; R.lowQuality = () => { }; if (window.PesoSchermo) PesoSchermo.blocca(); });
  await pg.evaluate(() => { const pv = window.__pv, st = pv.st; st.deadline = 1e12; setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.dialog = null; u.book = false; u.menu = false; st.over = null; st.chase = false; st.player.hp = 100; }, 50); });
  await pg.evaluate(s => { const pv = window.__pv, st = pv.st, p = st.player, R = pv.R, ui = pv.ui;
    p.vehicle = null; p.indoor = null; p.lv = null; p.x = s.x; p.y = s.y; p.path = []; if (p.vx !== undefined) { p.vx = 0; p.vy = 0; }
    st.t = (Math.floor(st.t / 1440) + 1) * 1440 + s.ora; window.__meteo = 'sereno';
    ui.focus = { x: s.x, y: s.y }; ui.zoom = s.zoom; R.cam.x = R.cam.tx = s.x; R.cam.y = R.cam.ty = s.y; R.cam.zoom = R.cam.tz = s.zoom; R.cam.uy = 0; }, SC);
  for (let k = 0, quiet = 0, tb = Date.now(); Date.now() - tb < 90000 && quiet < 2; k++) { await pg.waitForTimeout(1000); quiet = (await pg.evaluate(() => !(window.__pv.R.ISO && window.__pv.R.ISO.job))) ? quiet + 1 : 0; }
  await pg.waitForTimeout(4000);
  await pg.evaluate(() => window.PesoGente && PesoGente.completa ? PesoGente.completa() : null);
  // i tempi: 8 fotogrammi veri
  const tempi = await pg.evaluate(n => new Promise(res => { const pv = window.__pv, R = pv.R, G = pv.G, f0 = R.frame, s0 = G.step, rd = R.__models.renderer, r0 = rd.render; let fr = 0, sp = 0, tot = 0, tt = 0;
    R.frame = function () { const a = performance.now(); try { return f0.apply(this, arguments); } finally { fr += performance.now() - a; } };
    G.step = function () { const a = performance.now(); try { return s0.apply(this, arguments); } finally { sp += performance.now() - a; } };
    rd.render = function () { const r = r0.apply(this, arguments); tot += rd.info.render.calls; tt += rd.info.render.triangles; return r; };
    const A = { dt: [], fr: [], sp: [], tot: [], tri: [] }; let last = performance.now(), k = 0;
    const f = () => { const now = performance.now(); if (k > 0) { A.dt.push(now - last); A.fr.push(fr); A.sp.push(sp); A.tot.push(tot); A.tri.push(tt); } fr = 0; sp = 0; tot = 0; tt = 0; last = now;
      if (++k <= n) requestAnimationFrame(f); else { R.frame = f0; G.step = s0; rd.render = r0; const md = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
        res({ intervallo_ms: +md(A.dt).toFixed(1), frame_ms: +md(A.fr).toFixed(1), logica_ms: +md(A.sp).toFixed(2), disegni: md(A.tot), triangoli_k: Math.round(md(A.tri) / 1000) }); } };
    requestAnimationFrame(f); }), 8);
  // la memoria, dopo il raccoglitore
  await cdp.send('HeapProfiler.collectGarbage'); await pg.waitForTimeout(1500); await cdp.send('HeapProfiler.collectGarbage');
  const mem = await pg.evaluate(() => {
    const pv = window.__pv, R = pv.R, S = R.__models.scene, rd = R.__models.renderer, m = performance.memory;
    const cat = {}, add = (k, b, n) => { const c = cat[k] || (cat[k] = { mesh: 0, mb: 0, vert: 0 }); c.mesh++; c.mb += b / 1e6; c.vert += n; };
    const geos = new Set(); let gDup = 0;
    S.traverse(o => { if (!o.geometry) return; const g = o.geometry; if (geos.has(g)) { gDup++; return; } geos.add(g);
      let b = 0; for (const k in g.attributes) b += g.attributes[k].array.byteLength; if (g.index) b += g.index.array.byteLength;
      const n = g.attributes.position ? g.attributes.position.count : 0;
      const k = o.userData.fusione1 ? 'fusione1' : o.userData.ombra1 ? 'ombra1' : o.userData.statico1 ? 'statico1' : o.isInstancedMesh ? 'istanze' : o.isSkinnedMesh ? 'pelle' : o.userData.leggero ? 'leggero' : o.userData.iso || o.userData.chunk ? 'terreno' : 'altro:' + (o.name || o.type).slice(0, 16);
      add(k, b, n); if (o.isInstancedMesh && o.instanceMatrix) add('istanze_matrici', o.instanceMatrix.array.byteLength, 0); });
    // le mesh originali spente delle case (lazy1): contano se hanno geometria viva
    let lazyMb = 0, lazyN = 0; S.traverse(o => { if (o.userData && o.userData.lazy1 && o.geometry && o.geometry.attributes.position) { lazyN++; for (const k in o.geometry.attributes) lazyMb += o.geometry.attributes[k].array.byteLength / 1e6; } });
    const tele = []; let teleMb = 0, teleN = 0, teleViva = 0; (window.__tele || []).forEach(r => { const c = r.deref(); if (!c) return; teleViva++; const b = c.width * c.height * 4; if (c.width && c.height) { teleN++; teleMb += b / 1e6; tele.push([c.width, c.height]); } });
    const grandi = {}; tele.forEach(([w, h]) => { const k = w + '×' + h; grandi[k] = (grandi[k] || 0) + 1; });
    const top = Object.entries(grandi).map(([k, n]) => [k, n, +(n * k.split('×').reduce((a, b) => a * b, 1) * 4 / 1e6).toFixed(0)]).sort((a, b) => b[2] - a[2]).slice(0, 12);
    // le tessiture della scheda video (renderer.info) e le tessiture con immagine tela
    let texN = 0, texMb = 0; const seen = new Set(); S.traverse(o => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; ms.forEach(mt => { if (!mt) return; for (const k in mt) { const t = mt[k]; if (t && t.isTexture && !seen.has(t)) { seen.add(t); texN++; const im = t.image; if (im && im.width) texMb += im.width * im.height * 4 / 1e6; } } }); });
    const npc = pv.st.npcs ? pv.st.npcs.length : 0;
    return { heap_mb: Math.round(m.usedJSHeapSize / 1e6), heap_tot_mb: Math.round(m.totalJSHeapSize / 1e6), info: { geometrie: rd.info.memory.geometries, tessiture: rd.info.memory.textures, programmi: rd.info.programs.length }, geometrie_dup: gDup,
      cat: Object.fromEntries(Object.entries(cat).map(([k, v]) => [k, { mesh: v.mesh, mb: +v.mb.toFixed(0), vert_k: Math.round(v.vert / 1000) }]).sort((a, b) => b[1].mb - a[1].mb)), lazy1: { n: lazyN, mb: +lazyMb.toFixed(0) },
      tele: { create: (window.__tele || []).length, vive: teleViva, conPixel: teleN, mb: +teleMb.toFixed(0), top }, tessiture: { n: texN, mb_img: +texMb.toFixed(0) }, stream: window.__stream ? { n: window.__stream.n, mb: window.__stream.mb, off: window.__stream.off } : null,
      fusione: window.__fusione1 || null, npc, luci: window.__luci || null, livello: window.__pesoLivello || null, res: R.res, px: R.gpuTimes && R.gpuTimes.info ? R.gpuTimes.info.px : null };
  });
  const out = { query: Q, vw: W, vh: H, carico_s: carico, tempi_avvio, tempi, mem, rete: { file: RETE.n, mb: +(RETE.byte / 1e6).toFixed(1), grandi: Object.entries(RETE.file).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([f, b]) => [f, +(b / 1e6).toFixed(2)]) }, errori, console_err };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
  await b.close(); srv.close();
});
