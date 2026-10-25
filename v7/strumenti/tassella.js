// [tasselli] L'ESPORTATORE DELLA CITTÀ A TASSELLI. La città si costruisce una volta sola, qui (il gioco vero in Chromium senza testa, seme
// fisso, ?tutto: tutto nel caricamento), poi si taglia in tasselli di 48 m (i settori di anelli/fusione1) e si scrive in v7/tasselli/:
//   indice.json        l'impronta, i tasselli (dove, quanto pesano), i materiali (con gli shader già trasformati), le tessiture, le luci
//   t_<i>_<j>.bin      un tassello: le mesh ferme della città in quel settore, vettori quantizzati e compressi con meshopt
//   sagoma.bin         le case come volumi, tutta l'isola (il lontano, dove il tassello non è ancora arrivato)
//   tex/<n>.webp       le tessiture (i pixel letti dalla scheda video del gioco); tex/tel/<n>.webp lo scalino del telefono (≤ 512 px)
//   tex/<n>.bin        le tessiture di dati (tavolozze a virgola mobile, FD1)
// La chiama build.py quando l'impronta (TASS_FONTI, la stessa che build.py scrive in index.html come PV_IMPRONTA_TASS) cambia. Se
// l'impronta non torna il gioco costruisce la città come prima (src/tasselli.js).
//   node strumenti/tassella.js --impronta=<hex>        tutto: cottura nel browser + compressione
//   node strumenti/tassella.js --da=<cartella grezzi>  solo la compressione, da un giro precedente (--grezzi=<cartella> --tieni: dove metterli e lasciarli)
'use strict';
const fs = require('fs'), path = require('path'), http = require('http'), crypto = require('crypto'), zlib = require('zlib');
const V7 = path.join(__dirname, '..'), OUT = path.join(V7, 'tasselli');
const arg = (k, d) => { const a = process.argv.find(q => q.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const NM = path.join(__dirname, 'node_modules');
const req = n => { try { return require(path.join(NM, n)); } catch (e) { try { return require(n); } catch (e2) { return null; } } };
const MO = req('meshoptimizer'), sharp = req('sharp');
const TEL_MAX = +arg('tel', 512), Q_TEL = 82;

// ---------------- la cottura nel browser ----------------
async function cuoci(GREZZI, imp) {
  const pw = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core'), exe = process.env.PW_CHROME || '/opt/pw-browsers/chromium';
  const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.glb': 'model/gltf-binary', '.webp': 'image/webp' };
  fs.rmSync(GREZZI, { recursive: true, force: true }); fs.mkdirSync(GREZZI, { recursive: true });
  const srv = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html';
    if (q.method === 'POST' && u.startsWith('/__up/')) { const ch = []; q.on('data', d => ch.push(d)); q.on('end', () => { const f = path.join(GREZZI, u.slice(6)); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, Buffer.concat(ch)); res.writeHead(200); res.end('ok'); }); return; }
    if (u.startsWith('/api/') || u.startsWith('/tasselli/')) { res.writeHead(404); res.end(); return; }
    const p = path.join(V7, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });
  await new Promise(r => srv.listen(0, r));
  const b = await pw.chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const T0 = Date.now(), log = (...a) => console.log(`[tasselli ${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  try {
    const pg = await b.newPage({ viewport: { width: 640, height: 400 } });
    pg.on('pageerror', e => log('[errore della pagina]', e.message));
    // i disegni a vuoto (SwiftShader: la città si costruisce, non serve vederla) e il caso col seme fisso (come src/seme.js)
    await pg.addInitScript(() => { window.__pulita = true; window.__nodraw = true;
      const P = WebGL2RenderingContext.prototype; for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements']) { const f = P[k]; P[k] = function () { if (window.__nodraw) return; return f.apply(this, arguments); }; } });
    await pg.addInitScript(seme => { let a = seme >>> 0 || 1; Math.random = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }, +arg('seme', 12345));
    await pg.goto(`http://localhost:${srv.address().port}/index.html?tutto&noanimus`, { timeout: 0 });
    await pg.waitForFunction(() => window.__pv && window.__pv.st && window.__pv.R && window.__pv.R.__models.renderer, null, { timeout: 1800000, polling: 1000 });
    log('città costruita');
    await pg.waitForTimeout(3000);
    await pg.addScriptTag({ content: fs.readFileSync(path.join(__dirname, 'tassella_pagina.js'), 'utf8') });
    const info = await pg.evaluate(() => window.__tassella({}));
    log('esportata', JSON.stringify(info));
  } finally { await b.close(); srv.close(); }
}

// ---------------- la compressione ----------------
const TA = { Float32Array, Uint8Array, Int8Array, Uint16Array, Int16Array, Uint32Array, Int32Array, Float64Array, Uint8ClampedArray };
function leggiGrezzo(file) {
  const buf = fs.readFileSync(file), n = buf.readUInt32LE(0), testa = JSON.parse(buf.slice(4, 4 + n).toString('utf8')), h = (4 + n + 7) & ~7;
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return { testa, view: (r, T) => new T(ab, h + r.off, r.len / T.BYTES_PER_ELEMENT) };
}
// un vettore in un blocco: padding del passo a 4 byte (meshopt lo vuole), poi meshopt (vertici o indici) o grezzo
function blocco(arr, s, opzi) {
  const T = arr.constructor, bpe = T.BYTES_PER_ELEMENT, n = arr.length / s, st0 = s * bpe, st = (st0 + 3) & ~3;
  let u8 = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
  if (opzi.idx) { if (MO && n % 3 === 0 && n > 0) return { enc: 'i', st: bpe, dati: MO.MeshoptEncoder.encodeIndexBuffer(u8, n, bpe) }; return { enc: 'raw', st: bpe, dati: u8 }; }
  if (st !== st0) { const p = new Uint8Array(n * st); for (let i = 0; i < n; i++) p.set(u8.subarray(i * st0, i * st0 + st0), i * st); u8 = p; }
  if (MO && n > 0 && st <= 256) return { enc: 'v', st, st0, dati: MO.MeshoptEncoder.encodeVertexBuffer(u8, n, st) };
  return { enc: 'raw', st, st0, dati: u8 };
}
function scriviContenitore(file, testa, blocchi) {
  let off = 0; const L = blocchi.map(b => { const r = { off, len: b.byteLength }; off += (b.byteLength + 7) & ~7; return r; });
  testa.blocchi = L; const tj = Buffer.from(JSON.stringify(testa)), h = (8 + tj.length + 7) & ~7, out = Buffer.alloc(h + off);
  out.write('PVT1', 0, 'ascii'); out.writeUInt32LE(tj.length, 4); tj.copy(out, 8); blocchi.forEach((b, i) => Buffer.from(b.buffer, b.byteOffset, b.byteLength).copy(out, h + L[i].off));
  const z = zlib.gzipSync(out, { level: 9 }); fs.writeFileSync(file, z); return z.length;   // tutto in gzip: il lavoratore lo apre con DecompressionStream (va con qualunque server)
}
// quantizza un attributo: posizione → Uint16 sulla sua scatola (se il passo resta sotto i 2 mm), normale → Int8, colore → Uint8 se in 0..1
function quantizza(nome, arr, s, norm) {
  if (!(arr instanceof Float32Array)) return { arr, norm };
  const n = arr.length / s;
  if (nome === 'position' && n) {
    const mn = new Array(s).fill(Infinity), mx = new Array(s).fill(-Infinity);
    for (let i = 0; i < arr.length; i++) { const c = i % s, v = arr[i]; if (v < mn[c]) mn[c] = v; if (v > mx[c]) mx[c] = v; }
    const ext = Math.max(...mx.map((v, c) => v - mn[c]));
    if (ext / 65535 <= .002 && isFinite(ext)) { const q = new Uint16Array(arr.length), k = mx.map((v, c) => v > mn[c] ? 65535 / (v - mn[c]) : 0);
      for (let i = 0; i < arr.length; i++) { const c = i % s; q[i] = Math.round((arr[i] - mn[c]) * k[c]); }
      return { arr: q, norm: false, q: { min: mn, max: mx } }; }
    return { arr, norm };
  }
  if (nome === 'normal') { const q = new Int8Array(arr.length); for (let i = 0; i < arr.length; i++) q[i] = Math.max(-127, Math.min(127, Math.round(arr[i] * 127))); return { arr: q, norm: true }; }
  if (nome === 'color') { let ok = true; for (let i = 0; i < arr.length; i++) if (arr[i] < 0 || arr[i] > 1) { ok = false; break; }
    if (ok) { const q = new Uint8Array(arr.length); for (let i = 0; i < arr.length; i++) q[i] = Math.round(arr[i] * 255); return { arr: q, norm: true }; } }
  return { arr, norm };
}
// le zuppe di triangoli (le case fuse non hanno indice) diventano vertici unici più un indice: i vertici uguali in tutto (dopo la
// quantizzazione) si contano una volta. Chi condivide la posizione (la sagoma d'ombra della fusa) prende lo stesso indice. L'ordine dei
// triangoli resta quello di prima (gruppi, drawRange e l'ordine delle decalcomanie non cambiano)
function indicizza(T, A) {
  const uso = new Map();   // attributo → geometrie che lo usano
  const geos = T.mesh.map((m, mi) => ({ mi, g: m.g, ids: Object.values(m.g.at), inst: !!m.inst }));
  geos.forEach(G => G.ids.concat(G.g.ix !== null ? [G.g.ix] : []).forEach(a => { if (!uso.has(a)) uso.set(a, new Set()); uso.get(a).add(G); }));
  const perPos = new Map(); geos.forEach(G => { if (G.g.ix !== null || G.inst) return; const p = G.g.at.position; if (!perPos.has(p)) perPos.set(p, []); perPos.get(p).push(G); });
  let prima = 0, dopo = 0;
  perPos.forEach(L => {
    const M = L.reduce((a, b) => b.ids.length > a.ids.length ? b : a), set = new Set(M.ids), grp = new Set(L);
    if (!L.every(G => G.ids.every(a => set.has(a)))) return;
    if (M.ids.some(a => [...uso.get(a)].some(G => !grp.has(G)))) return;
    const n = A[M.g.at.position].n;
    if (M.ids.some(a => A[a].n !== n)) return;
    const viste = M.ids.map(a => { const x = A[a]; return new Uint8Array(x.arr.buffer, x.arr.byteOffset, x.arr.byteLength); }), passi = M.ids.map(a => A[a].s * A[a].arr.constructor.BYTES_PER_ELEMENT);
    const mappa = new Map(), rimap = new Uint32Array(n), primo = []; let u = 0;
    for (let v = 0; v < n; v++) { let k = ''; for (let q = 0; q < viste.length; q++) { const st = passi[q], o = v * st; for (let b = 0; b < st; b++) k += String.fromCharCode(viste[q][o + b]); }
      let id = mappa.get(k); if (id === undefined) { id = u++; mappa.set(k, id); primo.push(v); } rimap[v] = id; }
    if (u > n * .92) return;
    M.ids.forEach(a => { const x = A[a], s = x.s, nu = new x.arr.constructor(u * s); for (let q = 0; q < u; q++) for (let c = 0; c < s; c++) nu[q * s + c] = x.arr[primo[q] * s + c]; x.arr = nu; x.n = u; });
    const ix = u < 65536 ? new Uint16Array(n) : new Uint32Array(n); ix.set(rimap);
    const id = A.length; A.push({ nome: 'index', arr: ix, s: 1, n, norm: false, idx: true, q: null });
    L.forEach(G => { G.g.ix = id; });
    prima += n; dopo += u;
  });
  return { prima, dopo };
}
// [tasselli] meno disegni: nel tassello le mesh con lo stesso materiale e le stesse impostazioni diventano una (i vettori uno dopo
// l'altro, l'indice spostato). Solo le opache, non istanziate, senza gruppi né drawRange, che non dividono i vettori con altre (la sagoma
// d'ombra delle case fuse divide la posizione con la fusa); una matrice non identità si cuoce nei vertici solo se il materiale non ha uno
// shader suo (lo shader potrebbe leggere la posizione dell'oggetto)
function unisci(T, A, mats) {
  const uso = new Map(), conta = i => uso.set(i, (uso.get(i) || 0) + 1);
  T.mesh.forEach(r => { Object.values(r.g.at).forEach(conta); if (r.g.ix !== null) conta(r.g.ix); if (r.inst) { conta(r.inst.m); if (r.inst.c !== null) conta(r.inst.c); } });
  const G = new Map();
  T.mesh.forEach((r, mi) => {
    if (r.inst || Array.isArray(r.m) || r.g.dr || (r.g.gr && r.g.gr.length > 1)) return;
    const M = mats[r.m]; if (!M || M.transparent || M.type === 'ShaderMaterial' || M.type === 'RawShaderMaterial') return;
    const ids = Object.values(r.g.at).concat(r.g.ix !== null ? [r.g.ix] : []); if (ids.some(i => uso.get(i) !== 1)) return;
    if (r.mx && (M.cvs !== undefined || !(A[r.g.at.position].arr instanceof Float32Array))) return;
    const sig = Object.keys(r.g.at).sort().map(k => k + ':' + A[r.g.at[k]].arr.constructor.name + A[r.g.at[k]].s + A[r.g.at[k]].norm).join(',');
    const key = [r.m, r.cs, r.rs, r.ro, r.ly, r.fc, r.cdm, r.cdi, sig].join('|');
    if (!G.has(key)) G.set(key, []); G.get(key).push(mi);
  });
  const via = new Set(); let prima = 0, dopo = 0;
  G.forEach(L => {
    if (L.length < 2) return;
    const R0 = T.mesh[L[0]], nomi = Object.keys(R0.g.at);
    let nv = 0, ni = 0; L.forEach(mi => { const r = T.mesh[mi], n = A[r.g.at.position].n; nv += n; ni += r.g.ix !== null ? A[r.g.ix].n : n; });
    const out = {}; nomi.forEach(k => { const a = A[R0.g.at[k]]; out[k] = { nome: k, arr: new a.arr.constructor(nv * a.s), s: a.s, n: nv, norm: a.norm, idx: false, q: null }; });
    const ix = nv < 65536 ? new Uint16Array(ni) : new Uint32Array(ni);
    let ov = 0, oi = 0; const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    L.forEach(mi => { const r = T.mesh[mi], n = A[r.g.at.position].n, e = r.mx;
      nomi.forEach(k => { const a = A[r.g.at[k]], o = out[k], s = a.s; o.arr.set(a.arr, ov * s);
        if (e && k === 'position') for (let v = 0; v < n; v++) { const q = (ov + v) * s, x = a.arr[v * s], y = a.arr[v * s + 1], z = a.arr[v * s + 2];
          o.arr[q] = e[0] * x + e[4] * y + e[8] * z + e[12]; o.arr[q + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]; o.arr[q + 2] = e[2] * x + e[6] * y + e[10] * z + e[14]; }
        if (e && k === 'normal') { // la matrice delle normali: l'inversa trasposta del 3×3
          const a00 = e[0], a01 = e[1], a02 = e[2], a10 = e[4], a11 = e[5], a12 = e[6], a20 = e[8], a21 = e[9], a22 = e[10], b01 = a22 * a11 - a12 * a21, b11 = -a22 * a10 + a12 * a20, b21 = a21 * a10 - a11 * a20, det = a00 * b01 + a01 * b11 + a02 * b21 || 1;
          const N = [b01 / det, (-a22 * a01 + a02 * a21) / det, (a12 * a01 - a02 * a11) / det, b11 / det, (a22 * a00 - a02 * a20) / det, (-a12 * a00 + a02 * a10) / det, b21 / det, (-a21 * a00 + a01 * a20) / det, (a11 * a00 - a01 * a10) / det];
          const sc = a.norm ? (a.arr instanceof Int8Array ? 127 : a.arr instanceof Int16Array ? 32767 : 1) : 1;
          for (let v = 0; v < n; v++) { const q = (ov + v) * s, x = a.arr[v * s] / sc, y = a.arr[v * s + 1] / sc, z = a.arr[v * s + 2] / sc;
            let X = N[0] * x + N[3] * y + N[6] * z, Y = N[1] * x + N[4] * y + N[7] * z, Z = N[2] * x + N[5] * y + N[8] * z; const l = Math.hypot(X, Y, Z) || 1; X /= l; Y /= l; Z /= l;
            o.arr[q] = sc === 1 ? X : Math.round(X * sc); o.arr[q + 1] = sc === 1 ? Y : Math.round(Y * sc); o.arr[q + 2] = sc === 1 ? Z : Math.round(Z * sc); } } });
      const P = out.position.arr; for (let v = ov; v < ov + n; v++) for (let c = 0; c < 3; c++) { const w = P[v * 3 + c]; if (w < mn[c]) mn[c] = w; if (w > mx[c]) mx[c] = w; }
      if (r.g.ix !== null) { const I = A[r.g.ix].arr; for (let q = 0; q < I.length; q++) ix[oi + q] = I[q] + ov; oi += I.length; } else { for (let q = 0; q < n; q++) ix[oi + q] = ov + q; oi += n; }
      ov += n; via.add(mi); });
    const at = {}; nomi.forEach(k => { at[k] = A.length; A.push(out[k]); });
    const ii = A.length; A.push({ nome: 'index', arr: ix, s: 1, n: ni, norm: false, idx: true, q: null });
    const c = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2], rad = Math.hypot(mx[0] - c[0], mx[1] - c[1], mx[2] - c[2]);
    T.mesh.push(Object.assign({}, R0, { g: { at, ix: ii, gr: null, dr: null }, mx: null, bb: [mn[0], mn[1], mn[2], mx[0], mx[1], mx[2]], bs: [c[0], c[1], c[2], rad], unite: L.length }));
    prima += L.length; dopo++;
  });
  // via le mesh unite e i vettori che non usa più nessuno (i numeri dei vettori si rifanno)
  T.mesh = T.mesh.filter((r, mi) => !via.has(mi));
  const usati = new Set(); T.mesh.forEach(r => { Object.values(r.g.at).forEach(i => usati.add(i)); if (r.g.ix !== null) usati.add(r.g.ix); if (r.inst) { usati.add(r.inst.m); if (r.inst.c !== null) usati.add(r.inst.c); } });
  const nuovo = new Map(), B = []; A.forEach((a, i) => { if (usati.has(i)) { nuovo.set(i, B.length); B.push(a); } });
  T.mesh.forEach(r => { for (const k in r.g.at) r.g.at[k] = nuovo.get(r.g.at[k]); if (r.g.ix !== null) r.g.ix = nuovo.get(r.g.ix); if (r.inst) { r.inst.m = nuovo.get(r.inst.m); if (r.inst.c !== null) r.inst.c = nuovo.get(r.inst.c); } });
  A.length = 0; B.forEach(a => A.push(a));
  return { prima, dopo };
}
function tassello(file, dest, mats) {
  const G = leggiGrezzo(file), T = G.testa, nomi = {};
  T.mesh.forEach(m => { for (const k in m.g.at) nomi[m.g.at[k]] = nomi[m.g.at[k]] || k; if (m.g.ix !== null) nomi[m.g.ix] = 'index'; if (m.inst) { nomi[m.inst.m] = 'instanceMatrix'; if (m.inst.c !== null) nomi[m.inst.c] = 'instanceColor'; } });
  const A = T.attr.map((a, i) => ({ nome: nomi[i] || '?', arr: G.view(T.bufs[a.b], TA[a.tipo]), s: a.s, n: a.n, norm: a.norm, idx: a.idx, q: null }));
  const uni = mats ? unisci(T, A, mats) : { prima: 0, dopo: 0 };
  A.forEach(x => { if (x.idx) return; const q = quantizza(x.nome, x.arr, x.s, x.norm); x.arr = q.arr; x.norm = q.norm; x.q = q.q || null; });
  const ind = indicizza(T, A);
  const blocchi = [], attr = []; let vert = 0, tri = 0;
  A.forEach(x => { const b = blocco(x.arr, x.s, { idx: x.idx });
    attr.push({ nome: x.nome, tipo: x.arr.constructor.name, s: x.s, n: x.n, norm: x.norm, idx: x.idx, enc: b.enc, st: b.st, st0: b.st0, q: x.q, b: blocchi.length }); blocchi.push(b.dati);
    if (x.nome === 'position') vert += x.n; });
  T.mesh.forEach(m => { tri += (m.g.ix !== null ? A[m.g.ix].n : A[m.g.at.position].n) / 3 * (m.inst ? m.inst.n : 1); });
  const testa = { k: T.k, cella: T.cella, bb: T.bb, mesh: T.mesh, attr };
  return { byte: scriviContenitore(dest, testa, blocchi), vert, tri, mesh: T.mesh.length, ind, uni };
}
async function tessitura(r, raw, dir) {
  const out = { i: r.i };
  if (r.dati !== 'Uint8Array' || r.k === '3d' || r.format !== 1023) {   // non RGBA a 8 bit: i dati come sono, in gzip
    raw = zlib.gzipSync(raw, { level: 9 }); fs.writeFileSync(path.join(dir, r.i + '.bin'), raw); out.file = r.i + '.bin'; out.byte = raw.length; return out; }
  const W = r.w, H = r.h, D = r.d || 1;
  // la pila (DataArrayTexture) diventa una griglia di strati in un'immagine sola (colonne × righe)
  const col = D > 1 ? Math.ceil(Math.sqrt(D)) : 1, row = Math.ceil(D / col), GW = W * col, GH = H * row;
  let px = raw;
  if (D > 1) { px = Buffer.alloc(GW * GH * 4); for (let l = 0; l < D; l++) { const cx = (l % col) * W, cy = Math.floor(l / col) * H; for (let y = 0; y < H; y++) raw.copy(px, ((cy + y) * GW + cx) * 4, (l * H * W + y * W) * 4, (l * H * W + y * W + W) * 4); } }
  out.griglia = D > 1 ? [col, row] : null;
  if (!sharp || GW > 16383 || GH > 16383) { fs.writeFileSync(path.join(dir, r.i + '.bin'), px); out.file = r.i + '.bin'; out.byte = px.length; return out; }
  const img = () => sharp(px, { raw: { width: GW, height: GH, channels: 4 } });
  const a = await img().webp({ lossless: true, effort: 4, exact: true }).toBuffer(); fs.writeFileSync(path.join(dir, r.i + '.webp'), a); out.file = r.i + '.webp'; out.byte = a.length;
  // lo scalino del telefono, con le regole di [leggera] (leggera_memoria.js): le pile a metà lato e non oltre 256 se non si ripetono;
  // le tele grandi (≥ 1024) a metà lato; poi il lato lungo a TEL_MAX al più (la griglia scala con lo strato)
  let f = 1;
  if (D > 1) { if (W * H >= 65536) { f = .5; const rip = r.wrapS === 1000 || r.wrapT === 1000; while (!rip && Math.max(W, H) * f > 256) f /= 2; } }
  else if (Math.max(W, H) >= 1024) f = .5;
  f = Math.min(f, TEL_MAX / Math.max(W, H));
  if (f < 1) { const tw = Math.max(1, Math.round(W * f)), th = Math.max(1, Math.round(H * f));
    const b = await img().resize(tw * col, th * row, { kernel: 'lanczos3' }).webp({ quality: Q_TEL, alphaQuality: 100, effort: 4 }).toBuffer();
    fs.writeFileSync(path.join(dir, 'tel', r.i + '.webp'), b); out.tel = { file: 'tel/' + r.i + '.webp', w: tw, h: th, byte: b.length }; }
  return out;
}
async function comprimi(GREZZI, imp) {
  if (MO) await MO.MeshoptEncoder.ready;
  const tav = JSON.parse(fs.readFileSync(path.join(GREZZI, 'grezzi', 'tavole.json'), 'utf8'));
  fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(path.join(OUT, 'tex', 'tel'), { recursive: true });
  // FD1 (lo stato delle case): nessun taglio, nessuna sfumatura (i canali g, b, a a zero)
  const fd1 = tav.uni['FD1.u'] && tav.uni['FD1.u'].t;
  // le tessiture uguali (stessi pixel e stesse impostazioni) diventano una
  const H = new Map(), alias = {}, tex = [];
  for (const r of tav.tessiture) {
    const f = path.join(GREZZI, 'tex', r.i + '.raw'); if (!fs.existsSync(f)) { tex.push(Object.assign({}, r, { manca: true })); continue; }
    const raw = fs.readFileSync(f);
    if (r.i === fd1 && r.dati === 'Uint8Array') for (let q = 0; q < raw.length; q += 4) { raw[q + 1] = 0; raw[q + 2] = 0; raw[q + 3] = 0; }
    const meta = Object.assign({}, r); delete meta.i;
    const h = crypto.createHash('sha1').update(raw).update(JSON.stringify(meta)).digest('hex');
    if (H.has(h)) { alias[r.i] = H.get(h); continue; }
    H.set(h, r.i); const o = await tessitura(r, raw, path.join(OUT, 'tex')); tex.push(Object.assign(meta, o));
  }
  const tid = i => i === null || i === undefined ? i : alias[i] !== undefined ? alias[i] : i;
  const fixV = v => { if (!v || typeof v !== 'object') return v; if ('t' in v) return { t: tid(v.t) }; if (v.a) return { a: v.a.map(fixV) }; if (v.o) { const o = {}; for (const k in v.o) o[k] = fixV(v.o[k]); return { o }; } return v; };
  const fixU = u => u && Object.assign({}, u, { val: fixV(u.val) });
  // i materiali uguali (stessa firma, con le tessiture già unite) diventano uno
  const MS = new Map(), malias = [], mats = [];
  tav.materiali.forEach((m, i) => { const c = Object.assign({}, m); if (c.type === 'MeshDepthMaterial' && c.depthPacking === undefined) c.depthPacking = 3201; if (!c.notte && c.key && /\|fd1\|/.test(c.key) && c.emissiveMap !== undefined) c.notte = 'fd1';   /* i grezzi di prima di depthPacking: le ombre (lampDepth1) sono RGBA */ ['map', 'emissiveMap', 'bumpMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'aoMap', 'lightMap', 'envMap', 'specularMap', 'displacementMap'].forEach(k => { if (k in c) c[k] = tid(c[k]); });
    ['uni', 'cuni'].forEach(k => { if (c[k]) { const o = {}; for (const q in c[k]) o[q] = fixU(c[k][q]); c[k] = o; } });
    const s = JSON.stringify(c); let j = MS.get(s); if (j === undefined) { j = mats.length; MS.set(s, j); mats.push(c); } malias[i] = j; });
  // i tasselli
  const tasselli = []; let tot = 0, vt = 0, ip = 0, id = 0, up = 0, ud = 0;
  for (const t of tav.tasselli) {
    const f = path.join(GREZZI, 'grezzi', 't_' + t.k + '.bin'), G = leggiGrezzo(f);
    G.testa.mesh.forEach(m => { m.m = Array.isArray(m.m) ? m.m.map(i => malias[i]) : malias[m.m]; if (m.cdm !== null) m.cdm = malias[m.cdm]; if (m.cdi !== null) m.cdi = malias[m.cdi]; });
    // riscrive il grezzo coi materiali uniti (poi lo comprime)
    const tmp = f + '.m'; { const buf = fs.readFileSync(f), n = buf.readUInt32LE(0), h = (4 + n + 7) & ~7, tj = Buffer.from(JSON.stringify(G.testa)), h2 = (4 + tj.length + 7) & ~7, o = Buffer.alloc(h2 + buf.length - h); o.writeUInt32LE(tj.length, 0); tj.copy(o, 4); buf.copy(o, h2, h); fs.writeFileSync(tmp, o); }
    const [i, j] = t.k.split('_').map(Number), nome = 't_' + t.k + '.bin', r = tassello(tmp, path.join(OUT, nome), mats); fs.unlinkSync(tmp);
    tasselli.push({ k: t.k, i, j, file: nome, byte: r.byte, mesh: r.mesh, vert: r.vert, tri: Math.round(r.tri), bb: t.bb.map(v => +v.toFixed(2)) }); tot += r.byte; vt += r.vert; ip += r.ind.prima; id += r.ind.dopo; up += r.uni.prima; ud += r.uni.dopo;
  }
  // la sagoma: ogni casa (30 vertici, 5 facce) col numero del suo tassello
  let sag = null;
  const fs_ = path.join(GREZZI, 'grezzi', 'sagoma.bin');
  if (fs.existsSync(fs_)) { const G = leggiGrezzo(fs_), n = G.testa.n, P = G.view(G.testa.bufs[0], Float32Array), N = G.view(G.testa.bufs[1], Float32Array), C = G.view(G.testa.bufs[2], Float32Array);
    const idx = new Map(tasselli.map((t, q) => [t.k, q])), tas = new Uint16Array(n), cel = tav.cella;
    for (let v = 0; v < n; v += 30) { let x = 0, z = 0; for (let q = v; q < v + 30 && q < n; q++) { x += P[q * 3]; z += P[q * 3 + 2]; } const m = Math.min(30, n - v), k = Math.floor(x / m / cel) + '_' + Math.floor(z / m / cel), ti = idx.has(k) ? idx.get(k) : 65535; tas.fill(ti, v, v + m); }
    const at = [['position', P, 3], ['normal', N, 3], ['color', C, 3], ['tas', tas, 1]], blocchi = [], attr = [];
    at.forEach(([nome, arr, s]) => { const q = quantizza(nome, arr, s, false), b = blocco(q.arr, s, {}); attr.push({ nome, tipo: q.arr.constructor.name, s, n, norm: q.norm, enc: b.enc, st: b.st, st0: b.st0, q: q.q || null, b: blocchi.length }); blocchi.push(b.dati); });
    sag = { file: 'sagoma.bin', byte: scriviContenitore(path.join(OUT, 'sagoma.bin'), { n, attr }, blocchi), vert: n }; }
  const uni = {}; for (const k in tav.uni) uni[k] = fixV(tav.uni[k]);
  const indice = { versione: 1, impronta: imp, cella: tav.cella, quando: new Date().toISOString(), tasselli, sagoma: sag, materiali: mats, stringhe: tav.stringhe, tessiture: tex, luci: tav.luci, pozze: tav.pozze, uni, info: tav.info };
  fs.writeFileSync(path.join(OUT, 'indice.json'), JSON.stringify(indice));
  const texB = tex.reduce((a, t) => a + (t.byte || 0), 0), texT = tex.reduce((a, t) => a + (t.tel ? t.tel.byte : t.byte || 0), 0);
  console.log(`[tasselli] ${tasselli.length} tasselli, ${(tot / 1048576).toFixed(1)} MB (${(vt / 1e6).toFixed(2)} M vertici; zuppe indicizzate ${(ip / 1e6).toFixed(2)} → ${(id / 1e6).toFixed(2)} M; mesh unite ${up} → ${ud}, ${tasselli.reduce((a, t) => a + t.mesh, 0)} mesh in tutto); sagoma ${sag ? (sag.byte / 1024).toFixed(0) + ' KB' : 'no'}; ${mats.length} materiali (da ${tav.materiali.length}); ${tex.length} tessiture ${(texB / 1048576).toFixed(1)} MB, telefono ${(texT / 1048576).toFixed(1)} MB; indice ${(fs.statSync(path.join(OUT, 'indice.json')).size / 1024).toFixed(0)} KB`);
  if (!MO) console.log('[tasselli] meshoptimizer non trovato (npm install in strumenti/): vettori senza compressione');
  if (!sharp) console.log('[tasselli] sharp non trovato (npm install in strumenti/): tessiture grezze');
}

if (require.main === module) (async () => {
  const imp = arg('impronta', 'sconosciuta'), da = arg('da', null), GREZZI = da || arg('grezzi', path.join(require('os').tmpdir(), 'pv_tasselli_grezzi'));
  try {
    if (!da) await cuoci(GREZZI, imp);
    await comprimi(GREZZI, imp);
    if (!da && !process.argv.includes('--tieni')) fs.rmSync(GREZZI, { recursive: true, force: true });
  } catch (e) { console.error('[tasselli] non cotti:', e && e.stack || e); process.exit(1); }
})();
module.exports = { comprimi, leggiGrezzo };
