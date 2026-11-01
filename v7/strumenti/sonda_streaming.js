// [caricamento] L'AVVIO, LO STREAMING E LA MEMORIA, MISURATI INSIEME (ANALISI_OTTIMIZZAZIONE_CARICAMENTO.md).
// Il gioco vero (index.html) in Chromium senza testa con SwiftShader: i millisecondi assoluti non valgono, valgono i rapporti, i conteggi
// e i byte (uguali su qualunque macchina). Non tocca il gioco: la pagina servita ha in più solo dei performance.mark prima di ogni modulo.
//   node strumenti/sonda_streaming.js [--query=&leggera&perf&tassellivecchi] [--vista=640x360] [--passo=1] [--tratto=120] [--nome=x]
//        [--solo-avvio] [--attesa=90] [--fasi=andata,ritorno,giro,zoom] [--giro=36] [--zoomfot=45] [--profilo]
//   (--profilo: il profilo del processore della pagina per ogni fase; le prove dell'analisi: --vista=400x225 --tratto=48 --attesa=45)
// Misura:
//   1. l'avvio: i byte (anche in gzip e brotli), il tempo di ogni <script data-m> (lettura + compilazione + esecuzione: dal suo mark al
//      prossimo), la richiesta sincrona del mondo cotto, le tappe di window.__tl, i compiti lunghi, la memoria;
//   2. l'arrivo dopo «Gioca»: quando i tasselli vicini, i blocchi del terreno (pavimenti, piante) e il verde sono in scena (il pop-in);
//   3. il cammino: andata e ritorno (--tratto m a --passo m per fotogramma, come un portatile a 5-6 fps che corre), poi la camera
//      che gira su sé stessa, poi lo zoom avanti e indietro. Per ogni fase: i byte inviati alla scheda video per fotogramma
//      (texImage*, texSubImage*, bufferData, bufferSubData), le compilazioni, i blocchi rifatti, i tasselli riscaricati e riaperti, le
//      ricotture delle ombre, la spazzatura (--trace-gc di V8), i fotogrammi.
// Scrive <tmp>/streaming_<nome>.json e stampa un riassunto.
'use strict';
const path = require('path'), http = require('http'), fs = require('fs'), zlib = require('zlib'), os = require('os');
process.env.DEBUG = (process.env.DEBUG ? process.env.DEBUG + ',' : '') + 'pw:browser';   // l'uscita del navigatore: le righe di --trace-gc
const { chromium } = require(process.env.PW || 'playwright');
const ARG = {}; for (const a of process.argv.slice(2)) { const m = /^--([a-z-]+)(?:=(.*))?$/.exec(a); if (m) ARG[m[1]] = m[2] === undefined ? true : m[2]; }
const root = path.join(__dirname, '..'), NOME = ARG.nome || 'streaming', VISTA = (ARG.vista || '640x360').split('x').map(Number);
const QUERY = 'cittanuova' + (ARG.query === undefined ? '&leggera&perf&tassellivecchi' : ARG.query);
const PASSO = +(ARG.passo || 1), TRATTO = +(ARG.tratto || 120), ATTESA = +(ARG.attesa || 90) * 1000;
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.gz': 'application/gzip' };

// la pagina con i mark: prima di ogni <script data-m="x"> e della richiesta sincrona del mondo cotto, e in fondo
const HTML = (() => {
  let h = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  h = h.replace(/^<script data-m="([^"]+)">/gm, (s, n) => `<script>performance.mark('pv>${n}')</script>${s}`);
  const i = h.indexOf("x.open('GET', 'mondo_cotto.js', false)"); if (i > 0) { const j = h.lastIndexOf('<script>', i); h = h.slice(0, j) + "<script>performance.mark('pv>mondo_cotto(xhr)')</script>" + h.slice(j); }
  const k = h.lastIndexOf('</body>'); h = h.slice(0, k) + "<script>performance.mark('pv>fine')</script>" + h.slice(k);
  return h;
})();
// le righe della pagina → il modulo (<script data-m>): chi ha chiesto un invio alla scheda video
const RIGHE = (() => { const L = []; HTML.split('\n').forEach((l, i) => { const re = /^(?:<script>performance\.mark\([^)]*\)<\/script>)?<script data-m="([^"]+)">/g; let m; while ((m = re.exec(l))) L.push([i + 1, m[1]]); }); return L; })();
const servito = [];
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  if (u === '/index.html') { servito.push({ u, b: Buffer.byteLength(HTML), t: Date.now() }); res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(HTML); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } servito.push({ u, b: d.length, t: Date.now() }); res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
});

// ---------- dentro la pagina, prima di tutto: i fotogrammi, la scheda video contata alla fonte, le richieste ----------
function strumenti(RIGHE) {
  const S = window.__S = { fr: 0, frames: [], fase: 'avvio', up: {}, live: { tex: 0, buf: 0, rb: 0 }, grandi: [], lt: [], fetch: {}, lav: {}, dup: new Map(), dupB: 0, chi: {} };
  // chi: dalla pila, la prima riga di index.html fuori da three.min (modulo:funzione)
  const modDi = ln => { let lo = 0, hi = RIGHE.length - 1, r = '(pagina)'; while (lo <= hi) { const mi = (lo + hi) >> 1; if (RIGHE[mi][0] <= ln) { r = RIGHE[mi][1]; lo = mi + 1; } else hi = mi - 1; } return r; };
  const chi = () => { const L = (new Error().stack || '').split('\n'); for (let i = 3; i < L.length; i++) { const m = /at (?:(\S+) \()?.*index\.html[^:]*:(\d+):\d+\)?$/.exec(L[i]); if (!m) continue; const mod = modDi(+m[2]); if (mod === 'three.min' || mod === 'misura' || mod === 'mesh_bvh') continue; return mod + ':' + (m[1] || '?').replace(/^Object\./, ''); } return '(?)'; };
  try { new PerformanceObserver(l => l.getEntries().forEach(e => S.lt.push([Math.round(e.startTime), Math.round(e.duration), S.fase]))).observe({ type: 'longtask', buffered: true }); } catch (e) { }
  let cur = { b: 0, ms: 0, comp: 0 }; const raf0 = window.requestAnimationFrame.bind(window); let last = 0;
  function fl(t) { S.fr++; if (last) S.frames.push([Math.round(t), +(t - last).toFixed(1), cur.b, +cur.ms.toFixed(1), cur.comp, S.fase]); cur = { b: 0, ms: 0, comp: 0 }; last = t; if (S.passo) try { S.passo(); } catch (e) { S.errPasso = String(e); } raf0(fl); }
  raf0(fl);
  // i byte: canali per formato, byte per tipo
  const CH = { 0x1908: 4, 0x1907: 3, 0x1903: 1, 0x8227: 2, 0x1909: 1, 0x190A: 2, 0x1906: 1, 0x1902: 1, 0x84F9: 1, 0x8D94: 4, 0x8D98: 3, 0x8D99: 4, 0x8228: 2 };
  const BY = { 0x1401: 1, 0x1400: 1, 0x1403: 2, 0x1402: 2, 0x1405: 4, 0x1404: 4, 0x1406: 4, 0x140B: 2, 0x8D61: 2, 0x8033: 2, 0x8034: 2, 0x8363: 2, 0x84FA: 4, 0x8368: 4 };
  const bpp = (fmt, ty) => (CH[fmt] || 4) * (ty === 0x8033 || ty === 0x8034 || ty === 0x8363 || ty === 0x84FA || ty === 0x8368 ? 1 : (BY[ty] || 1));
  const dimsSrc = s => s ? [s.width || s.videoWidth || s.naturalWidth || 0, s.height || s.videoHeight || s.naturalHeight || 0] : [0, 0];
  const texOf = new WeakMap(), bufOf = new WeakMap(), rbOf = new WeakMap();
  function patch(P) {
    if (!P || P.__sonda) return; P.__sonda = true;
    const bound = new WeakMap();   // per contesto: buffer legati per bersaglio, tessitura legata per unità e bersaglio
    const st = gl => { let s = bound.get(gl); if (!s) bound.set(gl, s = { buf: {}, unit: 0, tex: {}, rb: null }); return s; };
    const w = (name, f) => { const o = P[name]; if (typeof o !== 'function') return; P[name] = function () { const t0 = performance.now(); const r = o.apply(this, arguments); const dt = performance.now() - t0; const u = S.up[name] || (S.up[name] = { n: 0, b: 0, ms: 0 }); u.n++; u.ms += dt; cur.ms += dt; const b = f ? f.call(this, arguments, st(this)) || 0 : 0; u.b += b; if (b >= 16384 && (name === 'bufferData' || name === 'bufferSubData' || name === 'texSubImage2D' || name === 'texSubImage3D' || name === 'texImage2D' || name === 'texImage3D') && !(name.startsWith('texImage') && arguments.length >= 9 && !arguments[arguments.length - 1])) { const M = S.chi[S.fase] || (S.chi[S.fase] = {}), k = name.replace(/^(tex|buffer)/, '') + ' ' + chi(), e = M[k] || (M[k] = [0, 0]); e[0]++; e[1] += b; } if (b) { cur.b += b; if (b >= 1048576) S.grandi.push([Math.round(t0), name, Math.round(b / 1024), S.fase, +dt.toFixed(1)]); } if (name === 'linkProgram') cur.comp++; return r; }; };
    const P0 = { bindBuffer: P.bindBuffer, bindTexture: P.bindTexture, activeTexture: P.activeTexture, bindRenderbuffer: P.bindRenderbuffer };
    P.bindBuffer = function (t, b) { st(this).buf[t] = b; return P0.bindBuffer.apply(this, arguments); };
    P.activeTexture = function (u) { st(this).unit = u; return P0.activeTexture.apply(this, arguments); };
    P.bindTexture = function (t, x) { const s = st(this); s.tex[s.unit + ':' + t] = x; return P0.bindTexture.apply(this, arguments); };
    P.bindRenderbuffer = function (t, x) { st(this).rb = x; return P0.bindRenderbuffer.apply(this, arguments); };
    const texSet = (s, t, level, b) => { const x = s.tex[s.unit + ':' + t] || s.tex[s.unit + ':' + 0x0DE1]; if (!x || level) return; const o = texOf.get(x) || 0; S.live.tex += b - o; texOf.set(x, b); };
    w('texImage2D', function (a, s) { let b; if (a.length >= 9) b = a[3] * a[4] * bpp(a[6], a[7]); else { const [W, H] = dimsSrc(a[5]); b = W * H * 4; } texSet(s, a[0] >= 0x8515 && a[0] <= 0x851A ? 0x8513 : a[0], a[1], b * (a[0] >= 0x8515 && a[0] <= 0x851A ? 6 : 1)); if (a.length >= 9 && !a[8]) { S.alloc = (S.alloc || 0) + b; S.allocN = (S.allocN || 0) + 1; return 0; } return b; });
    w('texImage3D', function (a, s) { const b = a[3] * a[4] * a[5] * bpp(a[7], a[8]); texSet(s, a[0], a[1], b); if (!a[9]) { S.alloc = (S.alloc || 0) + b; return 0; } return b; });
    w('texSubImage2D', function (a) { if (a.length >= 9) return a[4] * a[5] * bpp(a[6], a[7]); const [W, H] = dimsSrc(a[6]); return W * H * 4; });
    w('texSubImage3D', function (a) { if (a.length >= 11) return a[5] * a[6] * a[7] * bpp(a[8], a[9]); return 0; });
    w('texStorage2D', function (a, s) { texSet(s, a[0], 0, a[3] * a[4] * 4 * (a[1] > 1 ? 1.33 : 1)); return 0; });
    w('texStorage3D', function (a, s) { texSet(s, a[0], 0, a[3] * a[4] * a[5] * 4 * (a[1] > 1 ? 1.33 : 1)); return 0; });
    w('compressedTexImage2D', function (a) { const d = a[6]; return d && d.byteLength || 0; });
    w('bufferData', function (a, s) { let b = typeof a[1] === 'number' ? a[1] : a[1] ? (a.length >= 5 && a[4] ? a[4] * (a[1].BYTES_PER_ELEMENT || 1) : a[1].byteLength) : 0; const x = s.buf[a[0]]; if (x) { const o = bufOf.get(x) || 0; S.live.buf += b - o; bufOf.set(x, b); }
      // i doppioni: stessi byte già inviati in un altro buffer vivo (stessa lunghezza e stessi campioni)
      if (typeof a[1] !== 'number' && a[1] && b >= 4096) { try { const v = new Uint32Array(a[1].buffer, a[1].byteOffset, Math.floor(a[1].byteLength / 4)); let h = v.length; for (let i = 0; i < 24; i++) h = (h * 31 + v[Math.floor(i * (v.length - 1) / 23)]) | 0; const k = b + ':' + h, n = S.dup.get(k) || 0; if (n) S.dupB += b; S.dup.set(k, n + 1); } catch (e) { } }
      return b; });
    w('bufferSubData', function (a) { const d = a[2]; return d ? (a.length >= 5 && a[4] ? a[4] * (d.BYTES_PER_ELEMENT || 1) : d.byteLength) : 0; });
    w('renderbufferStorage', function (a, s) { const b = a[2] * a[3] * 4; if (s.rb) { const o = rbOf.get(s.rb) || 0; S.live.rb += b - o; rbOf.set(s.rb, b); } return 0; });
    w('renderbufferStorageMultisample', function (a, s) { const b = a[3] * a[4] * 4 * Math.max(1, a[1]); if (s.rb) { const o = rbOf.get(s.rb) || 0; S.live.rb += b - o; rbOf.set(s.rb, b); } return 0; });
    w('deleteTexture', function (a) { const o = a[0] && texOf.get(a[0]); if (o) { S.live.tex -= o; texOf.delete(a[0]); } return 0; });
    w('deleteBuffer', function (a) { const o = a[0] && bufOf.get(a[0]); if (o) { S.live.buf -= o; bufOf.delete(a[0]); } return 0; });
    w('deleteRenderbuffer', function (a) { const o = a[0] && rbOf.get(a[0]); if (o) { S.live.rb -= o; rbOf.delete(a[0]); } return 0; });
    ['generateMipmap', 'compileShader', 'linkProgram', 'getProgramParameter', 'getShaderParameter', 'readPixels', 'getError', 'blitFramebuffer', 'copyTexSubImage2D', 'deleteProgram', 'finish', 'clientWaitSync'].forEach(n => w(n));
  }
  patch(window.WebGLRenderingContext && WebGLRenderingContext.prototype); patch(window.WebGL2RenderingContext && WebGL2RenderingContext.prototype);
  // i programmi nati dopo la compilazione del caricamento: quando, quale, in che fase
  const tardi = () => { const pv = window.__pv, rd = pv && pv.R && pv.R.__models && pv.R.__models.renderer; if (!rd || !rd.info.programs || !window.__tl || !window.__tl.compilato) { setTimeout(tardi, 200); return; }
    S.tardi = []; const L = rd.info.programs, p0 = L.push; L.push = function () { for (const p of arguments) S.tardi.push([Math.round(performance.now()), p.name, String(p.cacheKey).slice(0, 60), S.fase]); return p0.apply(this, arguments); }; };
  setTimeout(tardi, 200);
  // le richieste della pagina (tasselli, tessiture) e i messaggi ai lavoratori: chi si riscarica e chi si riapre
  const f0 = window.fetch; window.fetch = function (u) { const k = String(u && u.url || u).replace(/^.*\/(tasselli|assets)\//, '$1/').replace(/\?.*$/, ''); const e = S.fetch[k] || (S.fetch[k] = [0, []]); e[0]++; e[1].push(S.fase); return f0.apply(this, arguments); };
  const pm0 = Worker.prototype.postMessage; Worker.prototype.postMessage = function (m) { try { const k = m && m.op ? m.op + (m.url ? ':' + String(m.url).replace(/^.*\/(tasselli|assets)\//, '$1/').replace(/\?.*$/, '') : '') : 'altro'; const e = S.lav[k] || (S.lav[k] = { n: 0, fasi: {} }); e.n++; e.fasi[S.fase] = (e.fasi[S.fase] || 0) + 1; } catch (e) { } return pm0.apply(this, arguments); };
}

// ---------- dentro la pagina: lo stato di adesso ----------
function stato() {
  const pv = window.__pv, R = pv && pv.R, S = window.__S, o = { t: Math.round(performance.now()), fr: S.fr, fase: S.fase, tl: Object.assign({}, window.__tl || {}), heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null, gpuMB: +((S.live.tex + S.live.buf + S.live.rb) / 1048576).toFixed(1), texMB: +(S.live.tex / 1048576).toFixed(1), bufMB: +(S.live.buf / 1048576).toFixed(1) };
  if (!R || !R.ISO) return o;
  const ISO = R.ISO, TS = 2, W = ISO.CH * TS, cx = R.cam.x, cz = R.cam.y; let n = 0, fatti = 0;
  for (let cj = 0; cj < 20; cj++) for (let ci = 0; ci < 40; ci++) { const mx = Math.max(ci * W, Math.min(cx, (ci + 1) * W)), mz = Math.max(cj * W, Math.min(cz, (cj + 1) * W)); if (Math.hypot(mx - cx, mz - cz) >= 70) continue; if (ci * W > 1700 || cj * W > 700) continue; n++; if (ISO.chunks.has(ci + ',' + cj)) fatti++; }
  const T = window.Tasselli && Tasselli.stato ? Tasselli.stato() : null;
  o.cam = [Math.round(cx), Math.round(cz)]; o.blocchi = ISO.chunks.size; o.vicini = [fatti, n]; o.job = ISO.job ? ISO.job.key : null; o.coda = ISO.pompa ? ISO.pompa.coda.length : null;
  if (T) o.tas = { inScena: T.inScena, inVolo: T.inVolo, inApertura: T.inApertura, pronti: T.pronti, vicinoT: T.vicinoT };
  const rd = R.__models && R.__models.renderer; if (rd) { o.prog = rd.info.programs ? rd.info.programs.length : 0; o.geo = rd.info.memory.geometries; o.tex = rd.info.memory.textures; o.calls = rd.info.render.calls; }
  return o;
}
function contatori() {
  const pv = window.__pv, R = pv && pv.R, S = window.__S, T = window.Tasselli && Tasselli.stato ? Tasselli.stato() : {};
  const A = R && R.ISO && R.ISO.arrivo, PO = window.PesoOmbre && PesoOmbre.conto ? PesoOmbre.conto() : {}, PP = window.PesoPronti && PesoPronti.conto ? PesoPronti.conto() : {};
  return { up: JSON.parse(JSON.stringify(S.up)), tas: { byte: T.byte, smontati: T.smontati, buttati: T.buttati, riaperti: T.riaperti || 0, texLiberate: T.texLiberate, matLiberati: T.matLiberati, decodMs: T.decodMs, creaMs: T.creaMs, picco: T.picco, vertici: T.vertici, mesh: T.mesh, raggiVia: T.raggiVia || 0 },
    blocchi: A ? A.blocchi.map(b => [b.k, b.t0, b.t1, b.ms, b.fr, b.att, b.vicino ? 1 : 0]) : [], fasiBlocco: A ? JSON.parse(JSON.stringify(A.fasi)) : {}, pompa: R && R.ISO.pompa ? { passi: R.ISO.pompa.passi, giri: R.ISO.pompa.giri, ms: Math.round(R.ISO.pompa.ms) } : null,
    ombre: { cotture: PO.cotture, aggiunte: PO.aggiunte, lotti: PO.lotti, riprese: PO.riprese, motivi: (() => { try { return PesoOmbre.diag(false).motivi; } catch (e) { return null; } })() }, vivo: PP.vivo ? { saltati: PP.vivo.saltati, pronti: PP.vivo.pronti, lotti: PP.vivo.lotti } : null,
    prog: R && R.__models.renderer.info.programs ? R.__models.renderer.info.programs.length : 0, lt: S.lt.length, allocMB: +((S.alloc || 0) / 1048576).toFixed(1), allocN: S.allocN || 0, dupMB: +(S.dupB / 1048576).toFixed(1) };
}
// i doppioni nella scena: geometrie diverse con gli stessi dati, tessiture diverse con la stessa immagine
function doppioni() {
  const R = window.__pv.R, sc = R.__models.scene, G = new Map(), Tx = new Map(), visti = new Set(), mats = new Set(); let gTot = 0, gDup = 0, tTot = 0, tDup = 0, nGeo = 0, nTex = 0;
  const firmaG = g => { const p = g.attributes && g.attributes.position; if (!p || !p.array || !p.array.length) return null; const a = p.array, L = a.length; let h = L; for (let i = 0; i < 16; i++) h = (h * 31 + Math.round(a[Math.floor(i * (L - 1) / 15)] * 1000)) | 0; return Object.keys(g.attributes).sort().join() + ':' + (g.index ? g.index.count : -1) + ':' + h; };
  const byG = g => { let b = 0; for (const k in g.attributes) { const x = g.attributes[k]; b += x.array ? x.array.byteLength : 0; } if (g.index && g.index.array) b += g.index.array.byteLength; return b; };
  sc.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m && mats.add(m));
    const g = o.geometry; if (!g || visti.has(g)) return; visti.add(g); nGeo++; const f = firmaG(g); if (!f) return; const b = byG(g); gTot += b; if (G.has(f)) { gDup += b; G.get(f).n++; } else G.set(f, { n: 1, b, nome: o.name || o.type }); });
  const vt = new Set(); mats.forEach(m => { for (const k in m) { const t = m[k]; if (!t || !t.isTexture || vt.has(t)) continue; vt.add(t); nTex++; const im = t.image; if (!im) continue; const w = im.width || 0, h = im.height || 0, d = im.depth || 1; const b = w * h * d * 4; tTot += b;
    let key = null; if (im.data && im.data.length) { const a = im.data, L = a.length; let x = L; for (let i = 0; i < 16; i++) x = (x * 31 + a[Math.floor(i * (L - 1) / 15)]) | 0; key = w + 'x' + h + 'x' + d + ':' + x; } else if (im.src) key = im.src; else if (im.toDataURL && w * h <= 512 * 512 && w > 0) { try { const c = im.getContext && im.getContext('2d'); if (c) { const p = c.getImageData(0, 0, w, h).data; let x = p.length; for (let i = 0; i < 32; i++) x = (x * 31 + p[Math.floor(i * (p.length - 1) / 31)]) | 0; key = 'cv' + w + 'x' + h + ':' + x; } } catch (e) { } }
    if (!key) return; if (Tx.has(key)) { tDup += b; Tx.get(key).n++; } else Tx.set(key, { n: 1, b, nome: m.name + '.' + k }); } });
  const top = M => [...M.values()].filter(v => v.n > 1).sort((a, b) => (b.n - 1) * b.b - (a.n - 1) * a.b).slice(0, 8).map(v => [v.nome, v.n, Math.round(v.b / 1024)]);
  return { geometrie: nGeo, geoMB: +(gTot / 1048576).toFixed(1), geoDoppiMB: +(gDup / 1048576).toFixed(1), geoTop: top(G), tessiture: nTex, texMB: +(tTot / 1048576).toFixed(1), texDoppiMB: +(tDup / 1048576).toFixed(1), texTop: top(Tx), materiali: mats.size };
}

const gcRighe = [];
// il profilo del processore di una fase: tempo proprio per funzione (modulo:funzione@riga) e per modulo
function profilo(P) {
  const modDi = ln => { let r = '(pagina)'; for (const [l, n] of RIGHE) { if (l <= ln) r = n; else break; } return r; };
  const byId = new Map(P.nodes.map(n => [n.id, n])), cnt = new Map(), dt = P.timeDeltas; P.samples.forEach((id, i) => cnt.set(id, (cnt.get(id) || 0) + (dt[i] || 0)));
  const F = new Map(), M = new Map(); let tot = 0;
  cnt.forEach((us, id) => { const f = byId.get(id).callFrame, mod = /index\.html/.test(f.url) ? modDi(f.lineNumber + 1) : (f.url ? f.url.replace(/^.*\//, '') : f.functionName || '(nativo)'); const k = mod + ':' + (f.functionName || '(anonima)') + '@' + (f.lineNumber + 1); F.set(k, (F.get(k) || 0) + us); M.set(mod, (M.get(mod) || 0) + us); tot += us; });
  const top = (X, n) => [...X].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, us]) => [k, Math.round(us / 1000), +(100 * us / tot).toFixed(1)]);
  return { totale_ms: Math.round(tot / 1000), funzioni: top(F, 30), moduli: top(M, 20) };
}
const statF = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y), q = p => s[Math.min(s.length - 1, Math.floor(p * s.length))]; return { n: s.length, med: +q(.5).toFixed(1), p95: +q(.95).toFixed(1), max: +s[s.length - 1].toFixed(1), somma: Math.round(s.reduce((x, y) => x + y, 0)) }; };
srv.listen(0, async () => {
  // le righe di --trace-gc arrivano dall'uscita del navigatore (DEBUG=pw:browser): «Scavenge», «Mark-Compact», con la durata in ms
  const ld = process.stderr.write.bind(process.stderr);
  process.stderr.write = (c, ...a) => { const s = String(c); if (/pw:browser/.test(s)) { const m = /(\d+) ms: (Scavenge|Mark-Compact|Minor Mark-Compact|Mark-sweep)[^,]*?([\d.]+) \(([\d.]+)\) -> ([\d.]+) \(([\d.]+)\) MB, (?:pooled: [\d.]+ MB, )?([\d.]+) \/ ([\d.]+) ms(.*)$/m.exec(s); if (m) gcRighe.push({ t: +m[1], tipo: m[2], prima: +m[3], dopo: +m[5], ms: +m[7], perche: (/\((average|testing|.*?)\)/.exec(m[9] || '') || [])[0] || '', fase: FASE.v }); return true; } return ld(c, ...a); };
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--js-flags=--trace-gc --expose-gc'] });
  const out = { nome: NOME, query: QUERY, vista: VISTA, passo: PASSO, tratto: TRATTO, cpu: os.cpus().length, carico: os.loadavg() };
  const FOUT = path.join(os.tmpdir(), 'streaming_' + NOME + '.json'), salva = tappa => { out.tappa = tappa; out.gcRighe = gcRighe.length; try { fs.writeFileSync(FOUT, JSON.stringify(out, null, 1)); } catch (e) { } console.log('[sonda]', tappa, Math.round(process.uptime()) + ' s'); };
  let PG = null;
  // i fotogrammi per fase, i compiti lunghi, le richieste ripetute, i lavoratori, chi carica la scheda video, i programmi tardi, la spazzatura
  async function riassunto() {
    const S = await PG.evaluate(() => { const S = window.__S; return { frames: S.frames, grandi: S.grandi, lt: S.lt, fetch: S.fetch, lav: S.lav, up: S.up, chi: S.chi, tardi: S.tardi || [] }; });
    const perFase = {}; S.frames.forEach(([t, dt, by, ms, comp, f]) => { const p = perFase[f] || (perFase[f] = { dt: [], mb: [], gl: [], comp: 0, mbTot: 0 }); p.dt.push(dt); p.mb.push(by / 1048576); p.gl.push(ms); p.comp += comp; p.mbTot += by / 1048576; });
    out.fotogrammi = Object.fromEntries(Object.entries(perFase).map(([f, p]) => [f, { dt: statF(p.dt), mbFot: statF(p.mb), glMs: statF(p.gl), compilazioni: p.comp, mbTot: +p.mbTot.toFixed(1), fotogrammiOltre1MB: p.mb.filter(x => x >= 1).length }]));
    out.serie = S.frames.filter(f => f[5] !== 'avvio').map(f => [f[1], +(f[2] / 1048576).toFixed(2), f[4], f[5]]);
    out.grandi = S.grandi.slice(-80); out.lunghiPerFase = S.lt.reduce((a, [t, d, f]) => { const x = a[f] || (a[f] = { n: 0, ms: 0, max: 0 }); x.n++; x.ms += d; x.max = Math.max(x.max, d); return a; }, {});
    const rip = Object.entries(S.fetch).filter(([k, v]) => v[0] > 1); out.richieste = { uniche: Object.keys(S.fetch).length, ripetute: rip.length, extra: rip.reduce((a, [k, v]) => a + v[0] - 1, 0), esempi: rip.sort((a, b) => b[1][0] - a[1][0]).slice(0, 12).map(([k, v]) => [k, v[0], [...new Set(v[1])].join('/')]) };
    out.lavoratori = Object.entries(S.lav).reduce((a, [k, v]) => { const op = k.split(':')[0]; const x = a[op] || (a[op] = { n: 0, chiavi: 0, ripetute: 0, fasi: {} }); x.n += v.n; x.chiavi++; if (v.n > 1 && k.includes(':')) x.ripetute += v.n - 1; for (const f in v.fasi) x.fasi[f] = (x.fasi[f] || 0) + v.fasi[f]; return a; }, {});
    out.gl = Object.fromEntries(Object.entries(S.up).map(([k, v]) => [k, { n: v.n, MB: +(v.b / 1048576).toFixed(1), ms: Math.round(v.ms) }]));
    out.chi = Object.fromEntries(Object.entries(S.chi || {}).map(([f, M]) => [f, Object.entries(M).sort((a, b) => b[1][1] - a[1][1]).slice(0, 14).map(([k, v]) => [k, v[0], +(v[1] / 1048576).toFixed(1)])]));
    out.tardi = S.tardi;
    out.gc = Object.entries(gcRighe.reduce((a, g) => { const k = g.fase + ':' + g.tipo; const x = a[k] || (a[k] = { n: 0, ms: 0, max: 0 }); if (/testing/.test(g.perche)) return a; x.n++; x.ms += g.ms; x.max = Math.max(x.max, g.ms); return a; }, {})).map(([k, v]) => [k, v.n, Math.round(v.ms), +v.max.toFixed(1)]);
  }
  try {
    const ctx = await b.newContext({ viewport: { width: VISTA[0], height: VISTA[1] } });
    const pg = await ctx.newPage(), errori = []; PG = pg; const cdp = await ctx.newCDPSession(pg);
    pg.on('pageerror', e => errori.push(e.message.slice(0, 200)));
    await pg.addInitScript(strumenti, RIGHE);
    const t0 = Date.now();
    await pg.goto(`http://localhost:${srv.address().port}/index.html?${QUERY}`, { waitUntil: 'domcontentloaded', timeout: 0 });
    out.dcl_s = (Date.now() - t0) / 1000;
    await pg.waitForFunction(() => window.__tl && window.__tl.gioco, null, { timeout: 1800000, polling: 1000 });
    out.gioco_s = (Date.now() - t0) / 1000;
    // 1. l'avvio
    out.avvio = await pg.evaluate(() => {
      const M = performance.getEntriesByType('mark').filter(m => m.name.startsWith('pv>')).map(m => [m.name.slice(3), m.startTime]);
      const moduli = M.slice(0, -1).map((m, i) => [m[0], Math.round(M[i + 1][1] - m[1])]).sort((a, b) => b[1] - a[1]);
      const nav = performance.getEntriesByType('navigation')[0];
      return { primoModulo: M.length ? Math.round(M[0][1]) : null, fine: M.length ? Math.round(M[M.length - 1][1]) : null, moduli: moduli.slice(0, 30), sommaModuli: moduli.reduce((a, b) => a + b[1], 0),
        nav: nav ? { risposta: Math.round(nav.responseEnd), dcl: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd) } : null, tl: Object.assign({}, window.__tl), rt: Object.fromEntries(Object.entries(window.__rt || {}).filter(([k, v]) => typeof v === 'number').sort((a, b) => b[1] - a[1]).slice(0, 20)),
        lunghi: (() => { const L = window.__S.lt; return { n: L.length, ms: L.reduce((a, b) => a + b[1], 0), piu: L.slice().sort((a, b) => b[1] - a[1]).slice(0, 10) }; })(),
        pronti: window.PesoPronti ? PesoPronti.conto() : null, anelli: window.__anelli ? { tuttoT: window.__anelli.tuttoT, picchi: (window.__anelli.picchi || []).slice ? window.__anelli.picchi.slice(0, 8) : null } : null,
        arrivoPrepara: window.__pv.R.ISO.arrivo.prepara, tasselli: window.Tasselli ? Tasselli.stato() : null };
    });
    out.avvio.contatori = await pg.evaluate(contatori);
    out.avvio.stato = await pg.evaluate(stato); salva('avvio');
    // 2. l'arrivo: ogni 500 ms finché i blocchi vicini e i tasselli dell'anello sono in scena e la coda è vuota (o ATTESA)
    await pg.evaluate(() => { window.__S.fase = 'arrivo'; });
    const AR = []; const tg = Date.now(); let pari = 0;
    while (Date.now() - tg < ATTESA) { const s = await pg.evaluate(stato); AR.push(s); const ok = s.vicini && s.vicini[0] === s.vicini[1] && !s.job && !s.coda && s.tas && s.tas.inVolo === 0 && s.tas.inApertura === 0 && s.tas.pronti === 0 && s.tas.vicinoT; pari = ok ? pari + 1 : 0; if (pari >= 4) break; await new Promise(r => setTimeout(r, 500)); }
    out.arrivo = { s: (Date.now() - tg) / 1000, campioni: AR.filter((x, i) => i % 4 === 0 || i === AR.length - 1), contatori: await pg.evaluate(contatori) };
    out.memoria = { stato: await pg.evaluate(stato), doppioni: await pg.evaluate(doppioni).catch(e => String(e)) }; await riassunto(); salva('arrivo');
    if (!ARG['solo-avvio']) {
      // 3. il cammino: il giocatore spostato di PASSO m a ogni fotogramma lungo x (la camera lo segue da sé), poi indietro; la camera che
      // gira su sé stessa (un giro intero in GIRO fotogrammi); lo zoom indietro e avanti (cambia la nebbia: il raggio dei blocchi e l'impronta)
      const FASI = String(ARG.fasi || 'andata,ritorno,giro,zoom').split(','), N = Math.round(TRATTO / PASSO), GIRO = +(ARG.giro || 36), ZM = +(ARG.zoomfot || 45);
      for (const nome of FASI) {
        FASE.v = nome; await pg.evaluate(() => { try { window.gc(); } catch (e) { } });
        out[nome] = { prima: await pg.evaluate(contatori), fr0: await pg.evaluate(() => window.__S.fr), t0: Date.now() };
        if (ARG.profilo) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 1000 }); await cdp.send('Profiler.start'); }
        await pg.evaluate(([nome, PASSO, N, GIRO, ZM]) => { const S = window.__S, st = window.__pv.st, ui = window.__pv.ui; S.fase = nome; let k = 0; S.fatto = false; const z0 = ui.zoom || 1;
          const fine = () => { S.passo = null; S.fatto = true; };
          if (nome === 'andata' || nome === 'ritorno' || nome === 'andata2') { const dir = nome === 'ritorno' ? -1 : 1; S.passo = () => { if (k++ >= N) return fine(); st.player.x += dir * PASSO; }; }
          else if (nome === 'giro') S.passo = () => { if (k++ >= GIRO) { ui.drag = 0; return fine(); } ui.drag = (ui.drag || 0) + 2 * Math.PI / GIRO; };
          else if (nome === 'zoom') S.passo = () => { k++; const a = ZM / 3; if (k > ZM) { ui.zoom = z0; return fine(); } ui.zoom = k <= a ? z0 + (2 - z0) * k / a : k <= 2 * a ? 2 - 1.5 * (k - a) / a : .5 + (z0 - .5) * (k - 2 * a) / a; };
          else fine(); }, [nome, PASSO, N, GIRO, ZM]);
        await pg.waitForFunction(() => window.__S.fatto, null, { timeout: 1800000, polling: 500 });
        if (ARG.profilo) { const { profile } = await cdp.send('Profiler.stop'); out[nome].profilo = profilo(profile); }
        out[nome].dopo = await pg.evaluate(contatori); out[nome].stato = await pg.evaluate(stato); out[nome].s = (Date.now() - out[nome].t0) / 1000; await riassunto(); salva(nome);
      }
    }
    await riassunto();
    out.errori = errori.slice(0, 10);
  } catch (e) { out.errore = String(e && e.stack || e); }
  finally { await b.close().catch(() => { }); srv.close(); }
  // i byte del primo avvio, come li manderebbe il server (gzip e brotli)
  const comp = f => { try { const d = fs.readFileSync(path.join(root, f)); return { MB: +(d.length / 1048576).toFixed(2), gzMB: +(zlib.gzipSync(d, { level: 9 }).length / 1048576).toFixed(2), brMB: +(zlib.brotliCompressSync(d, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: d.length } }).length / 1048576).toFixed(2) }; } catch (e) { return null; } };
  out.byte = { 'index.html': comp('index.html'), 'mondo_cotto.js': comp('mondo_cotto.js'), servitiMB: +(servito.reduce((a, s) => a + s.b, 0) / 1048576).toFixed(1), perTipo: servito.reduce((a, s) => { const k = s.u.split('/')[1] + (/\.\w+$/.exec(s.u) || [''])[0]; const x = a[k] || (a[k] = { n: 0, MB: 0 }); x.n++; x.MB = +(x.MB + s.b / 1048576).toFixed(2); return a; }, {}) };
  const f = path.join(os.tmpdir(), 'streaming_' + NOME + '.json'); fs.writeFileSync(f, JSON.stringify(out, null, 1));
  const R = (k, o) => { if (!o || !o.prima || !o.dopo) return; const a = o.prima, b = o.dopo, d = (x, y) => (y || 0) - (x || 0);
    const bl = b.blocchi.filter(x => !a.blocchi.some(y => y[0] === x[0] && y[1] === x[1])); const rif = bl.length - new Set(bl.map(x => x[0])).size;
    console.log(`${k}: blocchi ${bl.length} (rifatti ${rif}, ms ${bl.reduce((s, x) => s + x[3], 0)}) · tasselli smontati ${d(a.tas.smontati, b.tas.smontati)} riaperti ${d(a.tas.riaperti, b.tas.riaperti)} tex liberate ${d(a.tas.texLiberate, b.tas.texLiberate)} scaricati ${((d(a.tas.byte, b.tas.byte)) / 1048576).toFixed(1)} MB · ombre cotte ${d(a.ombre.cotture, b.ombre.cotture)} aggiunte ${d(a.ombre.aggiunte, b.ombre.aggiunte)} · programmi +${d(a.prog, b.prog)}`); };
  console.log(JSON.stringify({ gioco_s: out.gioco_s, avvio: out.avvio && { moduli: out.avvio.moduli.slice(0, 12), somma: out.avvio.sommaModuli, tl: out.avvio.tl, lunghi: out.avvio.lunghi && out.avvio.lunghi.ms }, arrivo_s: out.arrivo && out.arrivo.s, memoria: out.memoria, fotogrammi: out.fotogrammi, gc: out.gc, richieste: out.richieste, lavoratori: out.lavoratori, byte: out.byte, errore: out.errore }, null, 1));
  ['andata', 'ritorno', 'andata2', 'giro', 'zoom'].forEach(k => R(k, out[k]));
  console.log('scritto', f);
});
const FASE = { v: 'avvio' };
