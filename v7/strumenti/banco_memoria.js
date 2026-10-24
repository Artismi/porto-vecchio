// [leggera] IL BANCO DELLA MEMORIA: quanto pesa il gioco vero in memoria, e chi la tiene.
//   node strumenti/banco_memoria.js [--profilo=telefono|computer] [--query=&nomemoria] [--giro=borgo,marina,citta] [--out=file.json] [--attesa=6]
//   (da v7/; --profilo=telefono è il predefinito: 390×844, DPR 3, tocco, ?cittanuova&leggera; computer: 1280×720, ?cittanuova)
//   --vecchia: l'isola di prima (?vecchia) come riferimento.
// Chromium senza testa con SwiftShader. I disegni sono a vuoto (come in banco_peso.js: la memoria non cambia, il tempo sì), le
// allocazioni della scheda video sono contate alla fonte: ogni chiamata WebGL che riserva memoria (texImage2D/3D, texStorage2D/3D,
// compressedTexImage, generateMipmap, bufferData, renderbufferStorage[Multisample]) per oggetto GL, tolta a deleteTexture/Buffer/
// Renderbuffer; più la tela (colore + profondità, campioni se c'è l'antialias). Il proprietario:
//   - una texture di three (agganciata a `needsUpdate`: chi l'ha creata, la pila delle chiamate) attraverso renderer.properties;
//   - un buffer: l'array dell'attributo → la geometria (agganciata a setAttribute/setIndex: chi l'ha creata);
//   - le altre texture (bersagli di disegno, mappe d'ombra) e i renderbuffer: chi li ha allocati (la pila al momento).
// La pila si legge su index.html: riga → modulo src/*.js (come build.py) e funzione. Le categorie (atlanti, pavimenti, riva, persone…)
// sono regole su «modulo:funzione» (CAT qui sotto). Il cuore JS: performance.memory (dopo una raccolta), Runtime.getHeapUsage
// (array buffer fuori heap), e la stima delle copie nel processore (array degli attributi, dati delle DataTexture, tele 2D).
// Il processo: RSS e PSS del processo della pagina e di quello della scheda video (/proc), per controllo.
// Esce una tabella (stdout) e, con --out, il JSON.
const path = require('path'), http = require('http'), fs = require('fs'), { execSync } = require('child_process');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');
const root = path.resolve(__dirname, '..');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const has = k => process.argv.includes('--' + k);
const NUDO = has('nudo'), PROF = arg('profilo', 'telefono'), TEL = PROF === 'telefono', VEC = has('vecchia');
const Q = (VEC ? '?vecchia' : '?cittanuova' + (TEL ? '&leggera' : '')) + arg('query', '');
const GIRO = arg('giro', 'borgo,marina,citta,mercato,borgo').split(',').filter(Boolean), ATT = +arg('attesa', 6), OUTF = arg('out', null);
const POSTI = { borgo: { x: 1424, y: 322, zoom: .75 }, marina: { x: 1372, y: 388, zoom: .95 }, citta: { x: 1420, y: 340, zoom: 2.5 }, mercato: { x: 1278, y: 340, zoom: .85 }, vittoria: { x: 1410, y: 343, zoom: .95 }, rocca: { x: 1560, y: 344, zoom: 1.2 } };
// le righe di index.html → modulo (come build.py: index.src.html con i /*nome.js*/ sostituiti, studio.js e i moduli in pausa fuori)
const src = fs.readFileSync(path.join(root, 'src/index.src.html'), 'utf8'), spans = [];
{ let out = '', last = 0; const re = /\/\*([a-z0-9_.]+\.js)\*\//g; let m; const SKIP = new Set(['studio.js', 'skate.js']);
  while ((m = re.exec(src))) { out += src.slice(last, m.index); last = m.index + m[0].length; if (SKIP.has(m[1])) continue; const s = fs.readFileSync(path.join(root, 'src', m[1]), 'utf8'); const l0 = out.split('\n').length; out += s; spans.push([l0, out.split('\n').length, m[1]]); } }
const modOf = ln => { for (const s of spans) if (ln >= s[0] && ln < s[1]) return s[2]; return 'pagina'; };
const NOGAME = new Set(['three.min.js', 'mesh_bvh.js', 'gltf_loader.js', 'pagina', 'misura.js', 'file_shim.js']);
// la pila → «modulo:funzione» del primo chiamante del gioco (fuori da three e dal banco)
const chi = st => { if (!st) return '?'; const fr = st.split('\n').slice(1); let first = null;
  for (const l of fr) { const m = l.match(/at (?:new |async )?(?:([^\s(]+) \()?.*index\.html[^:]*:(\d+):\d+\)?$/); if (!m) continue; const mod = modOf(+m[2]); if (NOGAME.has(mod)) continue;
    let fn = (m[1] || '').replace(/^Object\./, ''); if (mod === 'editor.js' && /^THREE\./.test(fn)) continue;   // editor.js avvolge i costruttori di three: conta chi li chiama
    if (!fn || /^(Array\.)?(forEach|map)$|^<anonymous>$/.test(fn)) { if (!first) first = mod.replace(/\.js$/, '') + ':' + (fn || 'anonima'); continue; }
    return first ? first + '<' + fn : mod.replace(/\.js$/, '') + ':' + fn; }
  return first || '(three)'; };
// le categorie: la prima regola che combacia (su «modulo:funzione», o sull'etichetta che il banco ha dato a un oggetto)
const CAT = [
  [/^ombra:/, "mappe d'ombra"], [/^peso_ombre:/, "mappe d'ombra"], [/^tela$/, 'tela (schermo)'], [/^post:|^bersaglio:/, 'bersagli del post'],
  [/^pavimenti:/, 'pavimenti'], [/^riva:/, 'riva'], [/^vegetazione:/, 'vegetazione'], [/^personaggi:|^models:|^guardaroba:|^peso_gente:|^animazioni:|^anim_/, 'persone'],
  [/^roba3d:|^arredo3d:|^oggetti3d:|^pezzi_citta:|^modella:|^officina:|^veicoli3d:/, 'modelli (roba3d, arredo3d, pezzi)'], [/^kit:|^scaricati:|^superfici:/, 'modelli glTF/GLB (kit)'],
  [/^regia:|^interiors:|^interni_arte:/, 'interni (regia)'], [/^scorci|^tetti_vissuti:|^tetti:/, 'scorci, tetti'], [/^segnaletica:|^ordine_arte:|^vievive_arte:|^scontri_arte:/, 'segnaletica, arredo vie'],
  [/^peso_vetro:|^peso_bagliori:|^peso_lontano:|^peso_pronti:|^peso_schermo:/, 'peso_* (tavolozze, aloni)'], [/^leggera_/, 'leggera_*'],
  [/^render:(atlas|FA|CA|fAt|atl|pal|stack|lay|pila)/i, 'atlanti e pile (render)'], [/^render:/, 'città (render.js)'], [/^world/, 'dati del mondo'], [/^paesaggio:|^sottosuolo:|^livelli:/, 'paesaggio, sottosuolo'],
  [/^graffiti:|^writer|^writing:|^creativita:/, 'graffiti'], [/^menu_ui:|^main:|^audio:/, 'menu, audio'], [/./, 'altro']];
const cat = k => { for (const [re, c] of CAT) if (re.test(k)) return c; return 'altro'; };
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.webp': 'image/webp' };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const T0 = Date.now(), log = (...a) => console.error(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ executablePath: process.env.PW_CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info'] });
  const ctx = await b.newContext(TEL ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 720 } });
  const pg = await ctx.newPage(), errori = [];
  pg.on('pageerror', e => { errori.push(e.message); log('[errore]', e.message, (e.stack || '').split('\n').slice(1, 3).join(' | ')); });
  pg.on('console', m => { if (m.type() === 'error' && !/404|Failed to load/.test(m.text())) log('[console]', m.text().slice(0, 300)); if (/\[leggera\]/.test(m.text())) log('[pagina]', m.text().slice(0, 300)); });
  await pg.addInitScript(NUDO => { window.__pulita = true; window.__nodraw = true;
    if (NUDO) { for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) { const P = C.prototype; for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements']) { const f = P[k]; if (f) P[k] = function () { if (window.__nodraw) return; return f.apply(this, arguments); }; } } return; }   // --nudo: solo il cuore JS, senza i ganci (per controllare che il banco non pesi)
    const MM = window.__mem = { tex: new Map(), buf: new Map(), rb: new Map(), stk: new Map(), stkL: [], texRefs: [], geoRefs: [], geoArr: new WeakMap(), now: 0, max: 0, fb: 0 };
    const pila = () => { const L = Error.stackTraceLimit; Error.stackTraceLimit = 14; const s = new Error().stack; Error.stackTraceLimit = L; let id = MM.stk.get(s); if (id === undefined) { id = MM.stkL.length; MM.stkL.push(s); MM.stk.set(s, id); } return id; };
    MM.pila = pila;
    const tot = d => { MM.now += d; if (MM.now > MM.max) MM.max = MM.now; };
    // i byte per texel dei formati (WebGL2 con dimensione, e i vecchi senza dimensione col tipo)
    const G = WebGL2RenderingContext, BPP = { [G.RGBA8]: 4, [G.SRGB8_ALPHA8]: 4, [G.RGB8]: 4, [G.RGBA16F]: 8, [G.RGBA32F]: 16, [G.RGB16F]: 8, [G.RGB32F]: 16, [G.R8]: 1, [G.RG8]: 2, [G.R16F]: 2, [G.R32F]: 4, [G.RG16F]: 4, [G.RG32F]: 8,
      [G.R8UI]: 1, [G.R16UI]: 2, [G.R32UI]: 4, [G.RGBA8UI]: 4, [G.RGBA32UI]: 16, [G.R32I]: 4, [G.RGBA32I]: 16, [G.DEPTH_COMPONENT16]: 2, [G.DEPTH_COMPONENT24]: 4, [G.DEPTH_COMPONENT32F]: 4, [G.DEPTH24_STENCIL8]: 4, [G.DEPTH32F_STENCIL8]: 8, [G.RGB565]: 2, [G.RGBA4]: 2, [G.RGB5_A1]: 2, [G.R11F_G11F_B10F]: 4, [G.RGB10_A2]: 4, [G.STENCIL_INDEX8]: 1, [G.DEPTH_STENCIL]: 4, [G.DEPTH_COMPONENT]: 4 };
    const unsized = (f, t) => { const c = f === G.RGBA ? 4 : f === G.RGB ? 4 : f === G.LUMINANCE_ALPHA ? 2 : f === G.RED || f === G.ALPHA || f === G.LUMINANCE ? 1 : f === G.RG ? 2 : f === G.DEPTH_COMPONENT ? 1 : f === G.DEPTH_STENCIL ? 1 : 4; const s = t === G.FLOAT ? 4 : t === G.HALF_FLOAT ? 2 : t === G.UNSIGNED_SHORT || t === G.UNSIGNED_SHORT_5_6_5 || t === G.UNSIGNED_SHORT_4_4_4_4 ? 2 : t === G.UNSIGNED_INT || t === G.UNSIGNED_INT_24_8 ? 4 : 1; return f === G.DEPTH_STENCIL ? 4 : c * s; };
    const bpp = (ifmt, f, t) => BPP[ifmt] || unsized(ifmt, t);
    const dims = s => s ? [s.videoWidth || s.naturalWidth || s.displayWidth || s.width || 0, s.videoHeight || s.naturalHeight || s.displayHeight || s.height || 0] : [0, 0];
    for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) { if (!C) continue; const P = C.prototype;
      for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements']) { const f = P[k]; if (!f) continue; P[k] = function () { if (window.__nodraw) return; return f.apply(this, arguments); }; }
      const S = gl => gl.__ms || (gl.__ms = { unit: 0, tex: {}, buf: {}, vao: null, elem: new Map(), rb: null });
      const wrap = (k, fn) => { const f = P[k]; if (!f) return; P[k] = function () { const r = f.apply(this, arguments); try { fn.call(this, arguments, r); } catch (e) { } return r; }; };
      wrap('activeTexture', function (a) { S(this).unit = a[0]; });
      wrap('bindTexture', function (a) { S(this).tex[S(this).unit + ':' + a[0]] = a[1]; });
      const boundTex = (gl, target) => { const t = (target >= G.TEXTURE_CUBE_MAP_POSITIVE_X && target <= G.TEXTURE_CUBE_MAP_NEGATIVE_Z) ? G.TEXTURE_CUBE_MAP : target; return S(gl).tex[S(gl).unit + ':' + t]; };
      const setLev = (tx, key, by) => { let r = MM.tex.get(tx); if (!r) { r = { lev: {}, b: 0, st: pila(), mip: 0 }; MM.tex.set(tx, r); } const o = r.lev[key] || 0; r.lev[key] = by; r.b += by - o; tot(by - o); return r; };
      wrap('texImage2D', function (a) { const tx = boundTex(this, a[0]); if (!tx) return; let w, h, by;
        if (a.length >= 8 && typeof a[3] === 'number') { w = a[3]; h = a[4]; by = w * h * bpp(a[2], a[6], a[7]); } else { [w, h] = dims(a[5]); by = w * h * bpp(a[2], a[3], a[4]); }
        const r = setLev(tx, a[0] + ':' + a[1], by); r.w = r.w || w; r.h = r.h || h; r.f = r.f || a[2]; });
      wrap('texImage3D', function (a) { const tx = boundTex(this, a[0]); if (!tx) return; const r = setLev(tx, a[0] + ':' + a[1], a[3] * a[4] * a[5] * bpp(a[2], a[7], a[8])); r.w = r.w || a[3]; r.h = r.h || a[4]; r.d = a[5]; r.f = r.f || a[2]; });
      wrap('texStorage2D', function (a) { const tx = boundTex(this, a[0]); if (!tx) return; let by = 0, w = a[3], h = a[4]; const faces = a[0] === G.TEXTURE_CUBE_MAP ? 6 : 1; for (let l = 0; l < a[1]; l++) { by += Math.max(1, w >> l) * Math.max(1, h >> l) * bpp(a[2]) * faces; } const r = setLev(tx, 'st', by); r.w = w; r.h = h; r.f = a[2]; r.lv = a[1]; });
      wrap('texStorage3D', function (a) { const tx = boundTex(this, a[0]); if (!tx) return; let by = 0; for (let l = 0; l < a[1]; l++) by += Math.max(1, a[3] >> l) * Math.max(1, a[4] >> l) * (a[0] === G.TEXTURE_3D ? Math.max(1, a[5] >> l) : a[5]) * bpp(a[2]); const r = setLev(tx, 'st', by); r.w = a[3]; r.h = a[4]; r.d = a[5]; r.f = a[2]; r.lv = a[1]; });
      wrap('compressedTexImage2D', function (a) { const tx = boundTex(this, a[0]); if (!tx) return; const d = a[6]; const r = setLev(tx, a[0] + ':' + a[1], d && d.byteLength || 0); r.w = r.w || a[3]; r.h = r.h || a[4]; r.f = a[2]; });
      wrap('generateMipmap', function (a) { const tx = boundTex(this, a[0]); const r = tx && MM.tex.get(tx); if (!r || r.lev.st !== undefined) return; let b0 = 0; for (const k in r.lev) if (/:0$/.test(k)) b0 += r.lev[k]; setLev(tx, 'mip', Math.round(b0 / 3)); r.mip = 1; });
      wrap('deleteTexture', function (a) { const r = MM.tex.get(a[0]); if (r) { tot(-r.b); MM.tex.delete(a[0]); } });
      wrap('bindVertexArray', function (a) { S(this).vao = a[0]; });
      wrap('bindBuffer', function (a) { if (a[0] === G.ELEMENT_ARRAY_BUFFER) S(this).elem.set(S(this).vao, a[1]); else S(this).buf[a[0]] = a[1]; });
      wrap('bufferData', function (a) { const bf = a[0] === G.ELEMENT_ARRAY_BUFFER ? S(this).elem.get(S(this).vao) : S(this).buf[a[0]]; if (!bf) return; const d = a[1]; let by = typeof d === 'number' ? d : d ? (a[4] ? a[4] * (d.BYTES_PER_ELEMENT || 1) : d.byteLength) : 0;
        const o = MM.buf.get(bf); if (o) tot(-o.b); const r = { b: by, arr: d && typeof d === 'object' && d.buffer ? new WeakRef(d) : null, st: null }; if (!r.arr) r.st = pila(); MM.buf.set(bf, r); tot(by); });
      wrap('deleteBuffer', function (a) { const r = MM.buf.get(a[0]); if (r) { tot(-r.b); MM.buf.delete(a[0]); } });
      wrap('bindRenderbuffer', function (a) { S(this).rb = a[1]; });
      const rbs = (gl, w, h, f, n) => { const rb = S(gl).rb; if (!rb) return; const o = MM.rb.get(rb); if (o) tot(-o.b); const by = w * h * bpp(f) * Math.max(1, n); MM.rb.set(rb, { b: by, w, h, f, n, st: pila() }); tot(by); };
      wrap('renderbufferStorage', function (a) { rbs(this, a[2], a[3], a[1], 1); });
      wrap('renderbufferStorageMultisample', function (a) { rbs(this, a[3], a[4], a[2], a[1]); });
      wrap('deleteRenderbuffer', function (a) { const r = MM.rb.get(a[0]); if (r) { tot(-r.b); MM.rb.delete(a[0]); } });
    }
    // three: chi crea le texture (needsUpdate) e le geometrie (setAttribute/setIndex)
    const patch = T => {
      const tp = T.Texture && T.Texture.prototype, d = tp && Object.getOwnPropertyDescriptor(tp, 'needsUpdate');
      if (d && !tp.__mp) { tp.__mp = 1; Object.defineProperty(tp, 'needsUpdate', { configurable: true, set(v) { if (v && this.__mst === undefined) { this.__mst = pila(); MM.texRefs.push(new WeakRef(this)); } d.set.call(this, v); } }); }
      const gp = T.BufferGeometry && T.BufferGeometry.prototype;
      if (gp && !gp.__mp) { gp.__mp = 1; const sa = gp.setAttribute, si = gp.setIndex;
        const reg = (g, at) => { if (!at) return; if (g.__mst === undefined) { g.__mst = pila(); MM.geoRefs.push(new WeakRef(g)); } const arr = at.isInterleavedBufferAttribute ? at.data.array : at.array; if (arr && typeof arr === 'object') MM.geoArr.set(arr, g); };
        gp.setAttribute = function (n, at) { try { reg(this, at); } catch (e) { } return sa.apply(this, arguments); };
        gp.setIndex = function (ix) { const r = si.apply(this, arguments); try { reg(this, this.index); } catch (e) { } return r; }; } };
    let TH; Object.defineProperty(window, 'THREE', { configurable: true, get() { return TH; }, set(v) { TH = v;
      // three r149 riempie l'oggetto alla fine: Texture e BufferGeometry si agganciano quando arrivano
      for (const k of ['Texture', 'BufferGeometry']) { let val; Object.defineProperty(v, k, { configurable: true, enumerable: true, get() { return val; }, set(x) { val = x; patch(v); } }); } } });
  }, NUDO);
  const cdp = await ctx.newCDPSession(pg);
  const CAMP = has('campiona'); if (CAMP) { await cdp.send('HeapProfiler.enable'); await cdp.send('HeapProfiler.startSampling', { samplingInterval: 32768 }); }   // --campiona: chi tiene il cuore JS (allocazioni ancora vive, per modulo:funzione)
  await pg.goto(`http://localhost:${srv.address().port}/index.html${Q}`, { timeout: 900000 });
  await pg.waitForFunction(() => window.__pv && window.__pv.st && window.__pv.R && window.__pv.R.__models && window.__pv.R.__models.renderer, null, { timeout: 1200000, polling: 1000 });
  log('caricato', Q, PROF);
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(2000);
  await pg.evaluate(() => { const pv = window.__pv, st = pv.st; st.deadline = 1e12; if (pv.R.setRes) pv.R.setRes(1); pv.R.setRes = null; pv.R.lowQuality = () => { }; if (window.PesoSchermo && PesoSchermo.blocca) PesoSchermo.blocca();
    setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.desat = false; u.letterbox = false; u.dialog = null; u.book = false; u.menu = false; st.over = null; st.chase = false; st.player.hp = 100; }, 50); });
  // i processi (pagina e scheda video): RSS e PSS
  const procs = () => { try { const pid = b.process ? null : null; const out = execSync("ps -eo pid,args | grep -E 'chromium.*--type=(renderer|gpu-process)' | grep -v grep", { encoding: 'utf8' }); const r = {};
    out.trim().split('\n').forEach(l => { const m = l.trim().match(/^(\d+)\s.*--type=(renderer|gpu-process)/); if (!m) return; let pss = 0, rss = 0; try { const s = fs.readFileSync(`/proc/${m[1]}/smaps_rollup`, 'utf8'); pss = +(s.match(/^Pss:\s+(\d+)/m) || [0, 0])[1]; rss = +(s.match(/^Rss:\s+(\d+)/m) || [0, 0])[1]; } catch (e) { } const k = m[2] === 'renderer' ? 'pagina' : 'scheda'; if (!r[k] || rss > r[k].rss) r[k] = { rss: Math.round(rss / 1024), pss: Math.round(pss / 1024) }; }); return r; } catch (e) { return {}; } };
  const misura = async (nome) => {
    await cdp.send('HeapProfiler.collectGarbage'); await pg.waitForTimeout(400); await cdp.send('HeapProfiler.collectGarbage');
    const hu = await cdp.send('Runtime.getHeapUsage').catch(() => ({}));
    if (NUDO) { const m = await pg.evaluate(() => { const rd = window.__pv.R.__models.renderer, inf = rd.info.memory; return { heap: Math.round(performance.memory.usedJSHeapSize / 1048576), geometrie: inf.geometries, texture: inf.textures }; }); m.nome = nome; m.ab = Math.round((hu.backingStorageSize || 0) / 1048576); m.proc = procs(); m.gpu = 0; m.picco = 0; console.log('[nudo]', JSON.stringify(m)); return m; }
    const m = await pg.evaluate(() => {
      const MM = window.__mem, R = window.__pv.R, rd = R.__models.renderer, S = R.__models.scene, P = rd.properties, gl = rd.getContext();
      // a chi appartiene ogni oggetto GL: texture di three, bersagli e ombre, buffer → geometria
      const own = new Map(), lab = new Map(), pk = id => id === undefined || id === null ? null : MM.stkL[id];
      MM.texRefs.forEach(w => { const t = w.deref(); if (!t) return; const p = P.get(t), g = p && p.__webglTexture; if (g && MM.tex.has(g)) { own.set(g, { st: pk(t.__mst), nome: t.name || '', tipo: t.isDataArrayTexture ? 'pila' : t.isDataTexture ? 'dati' : t.isCanvasTexture || (t.image && t.image.getContext) ? 'tela' : t.isCompressedTexture ? 'compressa' : 'immagine' }); } });
      const lab1 = (rt, k) => { if (!rt) return; const p = P.get(rt.texture || rt); if (p && p.__webglTexture) lab.set(p.__webglTexture, k); const q = P.get(rt); if (q && q.__webglDepthbuffer) lab.set(q.__webglDepthbuffer, k); if (rt.depthTexture) { const d = P.get(rt.depthTexture); if (d && d.__webglTexture) lab.set(d.__webglTexture, k); } };
      S.traverse(o => { if (o.isLight && o.shadow && o.shadow.map) lab1(o.shadow.map, 'ombra:' + (o.isDirectionalLight ? 'sole' : o.isSpotLight ? 'faretti' : 'punti')); });
      const rows = [], key = (st) => st;
      MM.tex.forEach((r, g) => { const o = own.get(g); rows.push({ k: 't', b: r.b, lab: lab.get(g) || null, st: o ? o.st : MM.stkL[r.st], tipo: o ? o.tipo : (lab.get(g) ? 'ombra' : 'bersaglio'), nome: o ? o.nome : '', dim: r.w + '×' + r.h + (r.d ? '×' + r.d : ''), f: r.f, mip: r.mip || r.lv > 1 ? 1 : 0 }); });
      MM.rb.forEach((r, g) => rows.push({ k: 'r', b: r.b, lab: lab.get(g) || null, st: MM.stkL[r.st], tipo: 'renderbuffer', dim: r.w + '×' + r.h + (r.n > 1 ? ' ×' + r.n : ''), f: r.f }));
      // gli array delle istanze e altri senza setAttribute: dalla scena
      const inst = new WeakMap(); S.traverse(o => { if (o.isInstancedMesh) { inst.set(o.instanceMatrix.array, o); if (o.instanceColor) inst.set(o.instanceColor.array, o); } });
      let senza = 0;
      MM.buf.forEach(r => { const a = r.arr && r.arr.deref(); const g = a && MM.geoArr.get(a); if (g) rows.push({ k: 'b', b: r.b, st: pk(g.__mst), tipo: 'geometria' }); else if (a && inst.get(a)) rows.push({ k: 'b', b: r.b, st: null, lab: 'istanze:' + (inst.get(a).name || inst.get(a).parent && inst.get(a).parent.name || '?'), tipo: 'istanze' }); else { senza += r.b; rows.push({ k: 'b', b: r.b, st: r.st !== null ? pk(r.st) : null, lab: a ? null : 'buffer:array già liberato', tipo: 'buffer' }); } });
      // la tela: colore + profondità/stencil, con l'antialias i campioni (più il risolto)
      const cv = rd.domElement, ca = gl.getContextAttributes(), px = cv.width * cv.height, smp = ca.antialias ? 4 : 0; const fb = px * (4 + (ca.depth || ca.stencil ? 4 : 0)) * (smp ? smp + 1 : 1) + (ca.preserveDrawingBuffer ? px * 4 : 0);
      rows.push({ k: 'f', b: fb, lab: 'tela', tipo: 'tela', dim: cv.width + '×' + cv.height + (smp ? ' msaa' : '') });
      // le copie nel processore: array delle geometrie vive, dati delle DataTexture, tele 2D delle texture
      let cpuGeo = 0, cpuTex = 0, cpuCv = 0, nG = 0, nT = 0; const seenA = new Set(), seenI = new Set(), cpuBy = {};
      const up = new Set(); MM.buf.forEach(r => { const a = r.arr && r.arr.deref(); if (a) up.add(a); }); let cpuSu = 0;
      MM.geoRefs.forEach(w => { const g = w.deref(); if (!g) return; nG++; let by = 0, su = false; const add = a => { const arr = a && (a.isInterleavedBufferAttribute ? a.data.array : a.array); if (arr && up.has(arr)) su = true; if (arr && !seenA.has(arr)) { seenA.add(arr); by += arr.byteLength || 0; } }; for (const k in g.attributes) add(g.attributes[k]); add(g.index); for (const k in g.morphAttributes) (g.morphAttributes[k] || []).forEach(add); cpuGeo += by; if (su) cpuSu += by; const s = (su ? 'S' : 'N') + pk(g.__mst); cpuBy[s] = (cpuBy[s] || 0) + by; });
      MM.texRefs.forEach(w => { const t = w.deref(); if (!t) return; nT++; const im = t.image; if (!im || seenI.has(im)) return; seenI.add(im); if (im.data && im.data.byteLength) { cpuTex += im.data.byteLength; const s = pk(t.__mst); cpuBy['T' + s] = (cpuBy['T' + s] || 0) + im.data.byteLength; } else if (im.getContext || (typeof OffscreenCanvas !== 'undefined' && im instanceof OffscreenCanvas)) { const by = im.width * im.height * 4; cpuCv += by; const s = pk(t.__mst); cpuBy['C' + s] = (cpuBy['C' + s] || 0) + by; } });
      const inf = rd.info.memory;
      return { rows, senza, cpu: { geo: cpuGeo, geo_su_scheda: cpuSu, dati: cpuTex, tele: cpuCv, by: cpuBy, geometrie_vive: nG, texture_vive: nT }, gpu: MM.now, picco: MM.max, info: { geometrie: inf.geometries, texture: inf.textures, programmi: rd.info.programs ? rd.info.programs.length : 0 },
        heap: Math.round(performance.memory.usedJSHeapSize / 1048576), heapTot: Math.round(performance.memory.totalJSHeapSize / 1048576), tela: cv.width + '×' + cv.height, dpr: rd.getPixelRatio(), phone: !!(R.__lowq ? R.__lowq.phone : (window.__pv.R.LOWQ || {}).phone), stack: MM.stkL.length };
    });
    m.nome = nome; m.ab = Math.round((hu.backingStorageSize || 0) / 1048576); m.proc = procs();
    // per categoria e per «modulo:funzione»
    const by = {}, byK = {}, byT = {};
    m.rows.forEach(r => { const k = r.lab || chi(r.st); const c = cat(k); const kk = k + ' [' + r.tipo + ']'; by[c] = (by[c] || 0) + r.b; byK[kk] = byK[kk] || { b: 0, n: 0, c, dims: {} }; byK[kk].b += r.b; byK[kk].n++; if (r.dim) { const dk = r.dim + (r.f ? ' f' + r.f : '') + (r.mip ? ' mip' : ''); byK[kk].dims[dk] = (byK[kk].dims[dk] || 0) + 1; } const t = { t: 'texture', r: 'renderbuffer', b: 'buffer', f: 'tela' }[r.k]; byT[t] = (byT[t] || 0) + r.b; });
    const cpuK = {}, cpuF = {}; Object.entries(m.cpu.by).forEach(([s, v]) => { const pre = s[0], w = chi(s.slice(1)); const k = (pre === 'T' ? 'dati ' : pre === 'C' ? 'tele ' : pre === 'S' ? 'geometrie caricate ' : 'geometrie mai caricate ') + cat(w); cpuK[k] = (cpuK[k] || 0) + v; const kf = { T: 'dati', C: 'tele', S: 'geo su', N: 'geo mai' }[pre] + ' ' + w; cpuF[kf] = (cpuF[kf] || 0) + v; });
    m.cpuF = cpuF;
    m.per = by; m.perK = byK; m.perTipo = byT; m.cpuPer = cpuK; delete m.rows; delete m.cpu.by; return m;
  };
  const MB = v => (v / 1048576).toFixed(1);
  const stampa = m => { if (NUDO) return;
    console.log(`\n== ${m.nome}  (${Q}, ${PROF}${m.phone ? ', telefono' : ''}; tela ${m.tela} dpr ${m.dpr})`);
    const gpu = m.gpu, cpu = m.cpu.geo + m.cpu.dati + m.cpu.tele;
    console.log(`heap JS ${m.heap} MB (riservato ${m.heapTot}) · array buffer fuori heap ${m.ab} MB · scheda video ${MB(gpu)} MB (picco ${MB(m.picco)}) · TOTALE heap+scheda ${(m.heap + gpu / 1048576).toFixed(0)} MB`);
    console.log(`  copie nel processore: geometrie ${MB(m.cpu.geo)} MB (${m.cpu.geometrie_vive} vive, ${MB(m.cpu.geo_su_scheda)} MB anche sulla scheda) · dati delle texture ${MB(m.cpu.dati)} · tele 2D ${MB(m.cpu.tele)} (${m.cpu.texture_vive} texture vive) = ${MB(cpu)} MB`);
    console.log(`  three: ${m.info.geometrie} geometrie, ${m.info.texture} texture, ${m.info.programmi} programmi · processi: ${JSON.stringify(m.proc)}`);
    console.log('  scheda per tipo: ' + Object.entries(m.perTipo).map(([k, v]) => k + ' ' + MB(v)).join(' · '));
    console.log('  scheda per proprietario:'); Object.entries(m.per).sort((a, c) => c[1] - a[1]).forEach(([k, v]) => console.log('   ' + MB(v).padStart(7) + ' MB  ' + k));
    console.log('  copie nel processore per proprietario:'); Object.entries(m.cpuPer).sort((a, c) => c[1] - a[1]).slice(0, 14).forEach(([k, v]) => console.log('   ' + MB(v).padStart(7) + ' MB  ' + k));
    console.log('  copie nel processore, le più grosse:'); Object.entries(m.cpuF).sort((a, c) => c[1] - a[1]).slice(0, +arg('top', 40)).forEach(([k, v]) => console.log('   ' + MB(v).padStart(7) + ' MB  ' + k));
    console.log('  i più grossi (modulo:funzione [tipo]):'); Object.entries(m.perK).sort((a, c) => c[1].b - a[1].b).slice(0, +arg('top', 40)).forEach(([k, v]) => console.log('   ' + MB(v.b).padStart(7) + ' MB ' + String(v.n).padStart(5) + ' × ' + k + '  ' + Object.entries(v.dims).sort((a, c) => c[1] - a[1]).slice(0, 4).map(([d, n]) => n + '×' + d).join(', ')));
  };
  const out = { query: Q, profilo: PROF, misure: [], errori };
  await pg.waitForTimeout(ATT * 1000);
  if (CAMP) { await cdp.send('HeapProfiler.collectGarbage'); const { profile } = await cdp.send('HeapProfiler.stopSampling'); const byM = {}, byF = {};
    const walk = (n, up) => { const cf = n.callFrame, self = n.selfSize || 0; const isP = /index\.html/.test(cf.url); const mod = isP ? modOf(cf.lineNumber + 1) : (cf.url ? cf.url.split('/').pop() : '(interno)'); const fn = (cf.functionName || '(anonima)') + ' ' + mod.replace(/\.js$/, '');
      const me = NOGAME.has(mod) && up ? up : fn; if (self) { const mm = me.split(' ').pop(); byM[mm] = (byM[mm] || 0) + self; byF[me] = (byF[me] || 0) + self; } (n.children || []).forEach(c => walk(c, NOGAME.has(mod) ? up : fn)); };
    walk(profile.head, null); const tot = Object.values(byM).reduce((a, c) => a + c, 0);
    console.log('\ncuore JS campionato (vivo): ' + MB(tot) + ' MB; per modulo:'); Object.entries(byM).sort((a, c) => c[1] - a[1]).slice(0, 20).forEach(([k, v]) => console.log('   ' + MB(v).padStart(7) + ' MB  ' + k));
    console.log('per funzione (three e simili attribuiti a chi li chiama):'); Object.entries(byF).sort((a, c) => c[1] - a[1]).slice(0, +arg('topf', 45)).forEach(([k, v]) => console.log('   ' + MB(v).padStart(7) + ' MB  ' + k));
    out.campione = { per_modulo: byM, per_funzione: Object.fromEntries(Object.entries(byF).sort((a, c) => c[1] - a[1]).slice(0, 200)) }; }
  const m0 = await misura('dopo il caricamento'); stampa(m0); out.misure.push(m0);
  for (const nome of GIRO) { const s = POSTI[nome]; if (!s) continue;
    await pg.evaluate(s => { const pv = window.__pv, st = pv.st, p = st.player, R = pv.R, ui = pv.ui; p.vehicle = null; p.indoor = null; p.lv = null; p.x = s.x; p.y = s.y; p.path = []; ui.focus = { x: s.x, y: s.y }; ui.zoom = s.zoom; R.cam.x = R.cam.tx = s.x; R.cam.y = R.cam.ty = s.y; R.cam.zoom = R.cam.tz = s.zoom; R.cam.uy = 0; }, s);
    await pg.waitForTimeout(2500);
    for (let k = 0, quiet = 0, tb = Date.now(); Date.now() - tb < 60000 && quiet < 2; k++) { await pg.waitForTimeout(1000); quiet = (await pg.evaluate(() => !(window.__pv.R.ISO && window.__pv.R.ISO.job))) ? quiet + 1 : 0; }
    await pg.waitForTimeout(ATT * 1000);
    await pg.evaluate(() => { window.__pv.ui.focus = null; });
    const m = await misura(nome); out.misure.push(m);
    console.log(`-- ${nome}: heap ${m.heap} MB · scheda ${MB(m.gpu)} MB (picco ${MB(m.picco)}) · totale ${(m.heap + m.gpu / 1048576).toFixed(0)} MB · processi ${JSON.stringify(m.proc)}`); }
  if (GIRO.length) stampa(out.misure[out.misure.length - 1]);
  // i tempi del fotogramma (con i disegni a vuoto: il lavoro del processore) e i disegni
  out.fotogramma = await pg.evaluate(n => new Promise(res => { const pv = window.__pv, R = pv.R, rd = R.__models.renderer, r0 = rd.render; let tot = 0, fr = 0; const f0 = R.frame; R.frame = function () { const a = performance.now(); try { return f0.apply(this, arguments); } finally { fr += performance.now() - a; } };
    rd.render = function () { const r = r0.apply(this, arguments); tot += rd.info.render.calls; return r; }; const A = [], F = []; let k = 0;
    const f = () => { if (k > 0) { A.push(tot); F.push(fr); } tot = 0; fr = 0; if (++k <= n) requestAnimationFrame(f); else { rd.render = r0; R.frame = f0; const md = a => a.slice().sort((x, y) => x - y)[a.length >> 1]; res({ disegni: md(A), frame_ms: +md(F).toFixed(1) }); } }; requestAnimationFrame(f); }), 10);
  console.log('\nfotogramma (disegni a vuoto):', JSON.stringify(out.fotogramma), '· errori della pagina:', errori.length);
  const ms = out.misure; out.massimo = { heap: Math.max(...ms.map(m => m.heap)), gpu_mb: +(Math.max(...ms.map(m => m.picco)) / 1048576).toFixed(1), totale_mb: Math.max(...ms.map(m => Math.round(m.heap + m.gpu / 1048576))) };
  console.log('massimo:', JSON.stringify(out.massimo));
  if (OUTF) fs.writeFileSync(OUTF, JSON.stringify(out, null, 1));
  await b.close(); srv.close(); process.exit(errori.length ? 1 : 0);
});
