/* Porto Vecchio — [leggera] LA MEMORIA DEL TELEFONO (v7).
   Il telefono chiudeva la pagina della città nuova: troppa memoria (strumenti/banco_memoria.js, src/progetto_citta/PESO.md «Memoria»).
   Qui i tagli, solo sul telefono (lo stesso profilo di render.js: tocco, ?leggera, ?bassa; ?alta lo toglie), con piccoli ganci nei moduli:
   - pile:  le mappe delle case in pila (render.js arrTex1) a metà lato (un quarto dei byte), quando la mappa è almeno 256×256;
   - tele:  le tele 2D che sono finite in una pila scendono alla stessa misura (servono solo alla casa che si dissolve e a chi la ridipinge);
   - pigri: i pezzi originali delle case fuse rifatti per un raggio o una dissolvenza si buttano di nuovo quando nessuno li usa da 20 s;
   - verde: le piante lontane (vegetazione.js) a riquadri, solo quelle attorno alla camera, con attributi compatti;
   - atlanti: gli atlanti grandi che non si ridipingono più a metà lato (acqua, scorci, segnaletica), e la tela in memoria si svuota;
   - ombre: la mappa del sole più piccola.
   ?nomemoria spegne tutto; ?nomemoria<nome> uno per uno (?nomemoriapile, ?nomemoriatele, ...). ?memoria li accende anche sul computer. */
var LeggeraMem = (function () {
  'use strict';
  const Q = typeof location !== 'undefined' ? location.search : '';
  const TEL = (() => { try { if (/[?&]alta\b/.test(Q)) return false; return /[?&](leggera|bassa)\b/.test(Q) || matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } })();
  const ALL = (TEL || /[?&]memoria\b/.test(Q)) && !/[?&]nomemoria\b/.test(Q);
  const on = k => ALL && !new RegExp('[?&]nomemoria' + k + '\\b').test(Q);
  const ST = { pile: 0, pileMB: 0, tele: 0, teleMB: 0, pigri: 0, verde: 0 };
  const scratch = (W, H) => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  // --- pile: la misura dello strato
  function pila(W, H) { if (!on('pile') || W * H < 65536 || (W & 1) || (H & 1)) return [W, H]; return [W >> 1, H >> 1]; }
  // i pixel di una tela alla misura dello strato (la stessa lettura di prima se la misura coincide)
  function pixel(im, W, H) {
    if (im.width === W && im.height === H) return im.getContext('2d').getImageData(0, 0, W, H).data;
    const c = scratch(W, H), x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, W, H); return x.getImageData(0, 0, W, H).data;
  }
  // --- tele: dopo la pila, la tela grande scende alla misura dello strato
  const SMALL = new WeakMap();
  function dopoPila(a) {
    if (!on('tele')) return; a.maps.forEach((t, l) => { const im = t.image; if (!im || !im.getContext || (im.width <= a.W >> 1 && im.height <= a.H >> 1)) return;
      const w = a.W >= 128 && !(a.W & 1) ? a.W >> 1 : a.W, hh = a.H >= 128 && !(a.H & 1) ? a.H >> 1 : a.H;   // un altro mezzo: la tela serve solo alla casa che si dissolve
      let c = SMALL.get(im); if (!c) { c = scratch(w, hh); const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, w, hh); SMALL.set(im, c); ST.tele++; ST.teleMB += (im.width * im.height - w * hh) * 4 / 1048576; }
      t.userData.lm0 = t.userData.lm0 || { width: im.width, height: im.height }; t.image = c; t.needsUpdate = true; a.ver[l] = t.version; });
  }
  // --- pigri: i pezzi rifatti si ributtano
  const PIGRI = new Map(); let pT = 0;
  function pigro(o, drop) { if (!on('pigri')) return; o.userData.lmT = performance.now(); PIGRI.set(o, drop); }
  function tick(now) {
    if (!PIGRI.size || now - pT < 2000) return; pT = now;
    PIGRI.forEach((drop, o) => { if (o.visible || now - (o.userData.lmT || 0) < 20000) return; drop(); PIGRI.delete(o); ST.pigri++; });
  }
  // --- compatta: la mesh fusa di un secchio di case (render.js fusione1), più piccola senza cambiare forma:
  //   la posizione in 16 bit normalizzati dentro la scatola del secchio (la mesh porta centro e scala, uniforme: le normali non
  //   cambiano e gli shader che leggono modelMatrix · posizione vedono gli stessi punti, a meno di 1 mm); le uv in mezza precisione
  //   se stanno in ±2 (un quarto di texel su 256); i vertici uguali una volta sola, con l'indice (il kit era indicizzato: la fusione
  //   li triplicava). Fuori: i materiali che muovono i vertici in coordinate dell'oggetto (bandiere, panni: animMat).
  //   La geometria tiene il modo di rifare i pezzi originali (lmDec), per lazyGeo1.
  const ST2 = { secchi: 0, prima: 0, dopo: 0, ms: 0 };
  function salda(K, W, n) {   // i vertici uguali (le stesse W chiavi): remap[i] = il numero del vertice unico, first[u] = il primo vertice con quel numero
    let cap = 1; while (cap < n * 2) cap <<= 1; const tab = new Int32Array(cap).fill(-1), remap = new Uint32Array(n), first = new Uint32Array(n), mk = cap - 1; let m = 0;
    for (let i = 0; i < n; i++) { const o = i * W; let h = -2128831035; for (let j = 0; j < W; j++) h = Math.imul(h ^ K[o + j], 16777619);
      let sl = (h ^ (h >>> 15)) & mk;
      for (;;) { const u = tab[sl]; if (u < 0) { tab[sl] = m; first[m] = i; remap[i] = m; m++; break; }
        const f = first[u] * W; let j = 0; while (j < W && K[f + j] === K[o + j]) j++;
        if (j === W) { remap[i] = u; break; } sl = (sl + 1) & mk; } }
    return { remap, first, m };
  }
  function prendi(src, s, first, m) { const out = new src.constructor(m * s); for (let u = 0; u < m; u++) { const f = first[u] * s, o = u * s; for (let j = 0; j < s; j++) out[o + j] = src[f + j]; } return out; }
  function decodifica(geo, c, h, half) {   // i pezzi originali (lazyGeo1): dall'intervallo dei vertici di prima, in coordinate di mondo
    const cx = c.x, cy = c.y, cz = c.z;
    return (a, z) => { const idx = geo.index.array, A = geo.attributes, PA = A.position.array, N0 = A.normal, U0 = A.uv, cnt = z - a, pos = new Float32Array(cnt * 3), nor = N0 ? new Float32Array(cnt * 3) : null, uv = U0 ? new Float32Array(cnt * 2) : null, fh = THREE.DataUtils.fromHalfFloat;
      for (let i = 0; i < cnt; i++) { const v = idx[a + i];
        pos[i * 3] = Math.max(PA[v * 3] / 32767, -1) * h + cx; pos[i * 3 + 1] = Math.max(PA[v * 3 + 1] / 32767, -1) * h + cy; pos[i * 3 + 2] = Math.max(PA[v * 3 + 2] / 32767, -1) * h + cz;
        if (nor) for (let j = 0; j < 3; j++) nor[i * 3 + j] = N0.normalized ? Math.max(N0.array[v * 3 + j] / 127, -1) : N0.array[v * 3 + j];
        if (uv) for (let j = 0; j < 2; j++) uv[i * 2 + j] = half ? fh(U0.array[v * 2 + j]) : U0.array[v * 2 + j]; }
      return { pos, nor, uv }; };
  }
  const NOTI = new Set(['position', 'normal', 'uv', 'bId1', 'pal1', 'lay1', 'vt1']);
  function compatta(geo, mesh, mat) {
    if (!on('compatta') || (mat && mat.userData && mat.userData.mondo) || geo.index) return false;
    const A = geo.attributes, P = A.position, N = A.normal, U = A.uv, n = P ? P.count : 0; if (!n || !N || !(N.array instanceof Int8Array) || !(P.array instanceof Float32Array) || (U && !(U.array instanceof Float32Array))) return false;
    for (const nm in A) if (!NOTI.has(nm)) return false;
    const t0 = performance.now(), Z = new Uint8Array(1), I1 = (nm, T) => A[nm] && A[nm].array instanceof T ? A[nm].array : null;
    const bI = I1('bId1', Uint16Array), pl = I1('pal1', Uint16Array), ly = I1('lay1', Uint8Array), vt = I1('vt1', Uint16Array);
    if ((A.bId1 && !bI) || (A.pal1 && !pl) || (A.lay1 && !ly) || (A.vt1 && !vt)) return false;
    const bb = geo.boundingBox || (geo.computeBoundingBox(), geo.boundingBox), c = new THREE.Vector3(), sz = new THREE.Vector3(); bb.getCenter(c); bb.getSize(sz);
    const h = Math.max(.01, sz.x / 2, sz.y / 2, sz.z / 2) * 1.0001, k = 32767 / h, pa = P.array, na = N.array, cx = c.x, cy = c.y, cz = c.z;
    let uvH = null; if (U) { let mx = 0; const ua = U.array; for (let i = 0; i < ua.length; i++) { const v = ua[i] < 0 ? -ua[i] : ua[i]; if (v > mx) mx = v; } if (mx <= 2) { uvH = new Uint16Array(ua.length); const f = THREE.DataUtils.toHalfFloat; for (let i = 0; i < ua.length; i++) uvH[i] = f(ua[i]); } }
    const uI = U && !uvH ? new Int32Array(U.array.buffer, U.array.byteOffset, U.array.length) : null;
    // la chiave di ogni vertice in 5 interi: posizione (16 bit), normale (8), uv (16 o 32), casa, colore, strato, vetro
    const W = 6, K = new Int32Array(n * W), q = new Int16Array(n * 3);
    for (let i = 0; i < n; i++) { const i3 = i * 3, o = i * W;
      const x = Math.round((pa[i3] - cx) * k), y = Math.round((pa[i3 + 1] - cy) * k), z = Math.round((pa[i3 + 2] - cz) * k); q[i3] = x; q[i3 + 1] = y; q[i3 + 2] = z;
      K[o] = (x & 0xffff) | (y << 16); K[o + 1] = (z & 0xffff) | ((na[i3] & 0xff) << 16) | ((na[i3 + 1] & 0xff) << 24);
      K[o + 2] = (na[i3 + 2] & 0xff) | ((bI ? bI[i] : 0) << 8) | ((ly ? ly[i] : 0) << 24);
      K[o + 3] = (pl ? pl[i] : 0) | ((vt ? vt[i] : 0) << 16);
      if (uvH) { K[o + 4] = uvH[i * 2] | (uvH[i * 2 + 1] << 16); K[o + 5] = 0; } else if (uI) { K[o + 4] = uI[i * 2]; K[o + 5] = uI[i * 2 + 1]; } }
    const sd = salda(K, W, n), m = sd.m, first = sd.first;
    const before = Object.values(A).reduce((x, a) => x + a.array.byteLength, 0);
    const ng = {}; ng.position = new THREE.BufferAttribute(prendi(q, 3, first, m), 3, true);
    for (const nm in A) { if (nm === 'position') continue; const a = A[nm]; ng[nm] = nm === 'uv' && uvH ? new THREE.Float16BufferAttribute(prendi(uvH, 2, first, m), 2) : new THREE.BufferAttribute(prendi(a.array, a.itemSize, first, m), a.itemSize, a.normalized); }
    const idx = m < 65536 ? new Uint16Array(n) : new Uint32Array(n); idx.set(sd.remap);
    for (const nm in ng) geo.deleteAttribute(nm); for (const nm in ng) geo.setAttribute(nm, ng[nm]); geo.setIndex(new THREE.BufferAttribute(idx, 1));
    mesh.position.copy(c); mesh.scale.setScalar(h); mesh.updateMatrix(); mesh.updateMatrixWorld(true); geo.userData.lmXf = { c: c.clone(), h };
    geo.computeBoundingBox(); geo.computeBoundingSphere();
    geo.userData.lmDec = decodifica(geo, c.clone(), h, !!uvH);
    for (const nm in geo.attributes) if (nm !== 'position' && nm !== 'normal' && nm !== 'uv') { const at = geo.attributes[nm], E = new at.array.constructor(0); at.onUpload(function () { this.array = E; }); }   // casa, colore, strato, vetro: servono solo alla scheda video
    const after = Object.values(geo.attributes).reduce((x, a) => x + a.array.byteLength, 0) + idx.byteLength;
    ST2.secchi++; ST2.prima += before; ST2.dopo += after; ST2.ms += performance.now() - t0; return true;
  }
  // --- verde: la geometria delle piante lontane (vegetazione.js monta) con attributi compatti, e dopo l'invio alla scheda video la copia
  //   in memoria si svuota (non si ritocca: la geometria è fatta una volta, la mostra lo shader dentro i suoi raggi)
  const VUOTO = new Float32Array(0);
  function libera(g) { for (const nm in g.attributes) { const a = g.attributes[nm]; a.onUpload(function () { this.array = VUOTO; }); } if (g.index) g.index.onUpload(function () { this.array = new Uint16Array(0); }); }
  function rng(a) { let lo = Infinity, hi = -Infinity; for (let i = 0; i < a.length; i++) { const v = a[i]; if (v < lo) lo = v; if (v > hi) hi = v; } return [lo, hi]; }
  function verde(g) {
    if (!on('verde')) return false; const A = g.attributes, prima = Object.values(A).reduce((x, a) => x + a.array.byteLength, 0);
    const toI8 = a => { const o = new Int8Array(a.length); for (let i = 0; i < a.length; i++) o[i] = Math.max(-127, Math.min(127, Math.round(a[i] * 127))); return o; };
    const toU8 = a => { const o = new Uint8Array(a.length); for (let i = 0; i < a.length; i++) o[i] = Math.max(0, Math.min(255, Math.round(a[i] * 255))); return o; };
    const toH = a => { const o = new Uint16Array(a.length), f = THREE.DataUtils.toHalfFloat; for (let i = 0; i < a.length; i++) o[i] = f(a[i]); return o; };
    if (A.normal && A.normal.array instanceof Float32Array) g.setAttribute('normal', new THREE.BufferAttribute(toI8(A.normal.array), 3, true));
    for (const nm of ['color', 'occ', 'flex']) { const a = A[nm]; if (!a || !(a.array instanceof Float32Array)) continue; const [lo, hi] = rng(a.array); if (lo >= 0 && hi <= 1) g.setAttribute(nm, new THREE.BufferAttribute(toU8(a.array), a.itemSize, true)); else if (lo > -60000 && hi < 60000) g.setAttribute(nm, new THREE.Float16BufferAttribute(toH(a.array), a.itemSize)); }
    if (A.uv && A.uv.array instanceof Float32Array) { const [lo, hi] = rng(A.uv.array); if (lo >= -4 && hi <= 4) g.setAttribute('uv', new THREE.Float16BufferAttribute(toH(A.uv.array), 2)); }
    if (!g.boundingSphere) g.computeBoundingSphere(); if (!g.boundingBox) g.computeBoundingBox(); libera(g);
    ST.verde += prima - Object.values(g.attributes).reduce((x, a) => x + a.array.byteLength, 0); return true;
  }
  // --- atlanti: un atlante grande (≥ 1024) va alla scheda video a metà lato. Chi lo disegna continua sulla sua tela grande; a ogni
  //   needsUpdate la copia piccola si rifà da quella (una drawImage). La tela grande resta in t.userData.lmGrande.
  function mezza(t) {
    if (!on('atlanti') || !t || !t.isTexture || t.userData.lmGrande) return t; const big = t.image; if (!big || !big.getContext || Math.max(big.width, big.height) < 1024) return t;
    const small = scratch(big.width >> 1, big.height >> 1), x = small.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    const sync = () => { x.clearRect(0, 0, small.width, small.height); x.drawImage(big, 0, 0, small.width, small.height); };
    sync(); t.userData.lmGrande = big; t.image = small; ST.atlanti = (ST.atlanti || 0) + 1;
    Object.defineProperty(t, 'needsUpdate', { configurable: true, set(v) { if (v === true) sync(); const d = Object.getOwnPropertyDescriptor(THREE.Texture.prototype, 'needsUpdate'); d.set.call(this, v); } });
    t.needsUpdate = true; return t;
  }
  // --- dati: una DataTexture che non si ritocca: dopo l'invio la copia in memoria si svuota
  function datiLiberi(t) { if (!on('dati') || !t) return t; const o = t.onUpdate; t.onUpdate = function () { if (o) o.call(this); if (t.image) t.image = { data: null, width: t.image.width, height: t.image.height, depth: t.image.depth }; t.onUpdate = o || null; }; return t; }
  // --- compila: la compilazione del caricamento (main.js, peso_pronti.js) solo su quello che si vede: three r149 compila anche le
  //   cose spente (i 17.000 pezzi originali delle case fuse, i loro materiali), e i programmi che servono sono gli stessi
  function compila(rd, S, cam) { if (!on('compila')) return rd.compile(S, cam); S.traverse = S.traverseVisible; try { return rd.compile(S, cam); } finally { delete S.traverse; } }
  // --- statiche: le statiche fuse (render.js flushStatic) tengono la posizione (chi nasconde un pezzo la chiude in un punto); normali,
  //   uv, colore e strato dopo l'invio si svuotano
  function statica(g) { if (!on('statiche')) return; for (const nm in g.attributes) { if (nm === 'position') continue; const a = g.attributes[nm], E = new a.array.constructor(0); a.onUpload(function () { this.array = E; }); } }
  // --- verdelontano: le piante lontane a riquadri di 128 m; si costruiscono (uno per volta) quelli entro 210 m dalla camera, si buttano
  //   oltre 290 m. Sul telefono la nebbia chiude a ~165 m: oltre non si vedevano comunque
  function lontano(gruppo, L, build, mat) {
    const C = 128, R_IN = 210, R_OUT = 290, cells = new Map(), live = new Map();
    L.forEach(p => { const k = Math.floor(p.x / C) * 4096 + Math.floor(p.y / C); (cells.get(k) || cells.set(k, []).get(k)).push(p); });
    const dist = (k, cx, cz) => { const i = Math.floor(k / 4096), j = k - i * 4096, x0 = i * C, z0 = j * C; return Math.hypot(Math.max(x0 - cx, 0, cx - x0 - C), Math.max(z0 - cz, 0, cz - z0 - C)); };
    let lx = 1e9, lz = 1e9, todo = [];
    return (cx, cz) => {
      if (Math.hypot(cx - lx, cz - lz) > 12) { lx = cx; lz = cz; todo = [];
        live.forEach((m, k) => { if (dist(k, cx, cz) > R_OUT) { gruppo.remove(m); m.geometry.dispose(); live.delete(k); } });
        cells.forEach((list, k) => { if (!live.has(k) && dist(k, cx, cz) < R_IN) todo.push([dist(k, cx, cz), k]); }); todo.sort((a, b) => a[0] - b[0]); }
      const e = todo.shift(); if (!e) return; const k = e[1]; if (live.has(k)) return;
      const m = new THREE.Mesh(build(cells.get(k)), mat); m.name = 'vegLontano'; m.receiveShadow = true; m.matrixAutoUpdate = false; gruppo.add(m); live.set(k, m); ST.verdeRiquadri = live.size;
    };
  }
  return { tel: TEL, on, pila, verde, compila, statica, lontano, libera, mezza, datiLiberi, pixel, dopoPila, pigro, tick, compatta, conto2: () => ({ secchi: ST2.secchi, primaMB: +(ST2.prima / 1048576).toFixed(1), dopoMB: +(ST2.dopo / 1048576).toFixed(1), ms: Math.round(ST2.ms) }), conto: () => Object.assign({ on: ALL, tel: TEL, attesa: PIGRI.size }, ST), ST };
})();
if (typeof window !== 'undefined') window.LeggeraMem = LeggeraMem;
