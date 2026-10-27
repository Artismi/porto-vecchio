/* Porto Vecchio — [tasselli] IL LAVORATORE DEI TASSELLI (un Web Worker; src/tasselli.js lo crea dal testo della pagina, insieme a
   meshopt_decoder.js). Scarica, apre il gzip, decodifica meshopt e rifà i vettori come li vuole la scheda video; il filo della pagina
   riceve solo vettori pronti (trasferiti, senza copia) e crea le BufferGeometry.
   Messaggi: { op: 'tassello', id, url } → { id, testa, vettori }   { op: 'img', id, url, griglia, w, h, d, capovolgi } → { id, bmp | px }
             { op: 'bin', id, url } → { id, buf } */
'use strict';
const TA = { Float32Array, Uint8Array, Int8Array, Uint16Array, Int16Array, Uint32Array, Int32Array, Uint8ClampedArray };
async function scarica(url, gz) {
  const r = await fetch(url); if (!r.ok) throw new Error(url + ' ' + r.status);
  if (!gz) return r;
  // i file sono in gzip (tassella.js): se il server ha già tolto la compressione (Content-Encoding) i byte arrivano aperti
  return apri(await r.arrayBuffer());
}
function apri(ab) {
  const u = new Uint8Array(ab);
  if (u[0] !== 0x1f || u[1] !== 0x8b) return Promise.resolve(ab);
  return new Response(new Blob([ab]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}
function blocco(ab, h, B, a) {
  const src = new Uint8Array(ab, h + B.off, B.len), T = TA[a.tipo];
  if (a.enc === 'i') { const out = new T(a.n); MeshoptDecoder.decodeIndexBuffer(new Uint8Array(out.buffer), a.n, T.BYTES_PER_ELEMENT, src); return out; }
  const st = a.st, st0 = a.st0 || st, n = a.idx ? a.n : a.n;
  let u8;
  if (a.enc === 'v') { u8 = new Uint8Array(n * st); MeshoptDecoder.decodeVertexBuffer(u8, n, st, src); } else u8 = src.slice();
  if (!a.idx && st !== st0) { const p = new Uint8Array(n * st0); for (let i = 0; i < n; i++) p.set(u8.subarray(i * st, i * st + st0), i * st0); u8 = p; }
  let arr = new T(u8.buffer, u8.byteOffset, u8.byteLength / T.BYTES_PER_ELEMENT);
  if (a.q) {   // la posizione quantizzata torna a 32 bit (gli shader della città la leggono così)
    const s = a.s, mn = a.q.min, k = a.q.max.map((v, c) => (v - mn[c]) / 65535), f = new Float32Array(arr.length);
    for (let i = 0; i < arr.length; i++) { const c = i % s; f[i] = mn[c] + arr[i] * k[c]; }
    if (blocco.q16) blocco.q16.set(f, arr.byteOffset === 0 && arr.byteLength === arr.buffer.byteLength ? arr : arr.slice());   // [leggera] i 16 bit restano per i raggi
    arr = f;
  }
  return arr;
}
// [leggera] sul telefono gli attributi più compatti per la scheda video (stesso aspetto): il colore a 16 bit (tavolozza) a 8 bit, le uv
// in mezza precisione se stanno in ±2 (un quarto di texel a 512), i numeri interi in virgola mobile (pid…) a 16 bit
const H = new Float32Array(1), HI = new Uint32Array(H.buffer);
function mezza(v) { H[0] = v; const x = HI[0], s = (x >>> 16) & 0x8000, e = ((x >>> 23) & 0xff) - 112, m = x & 0x7fffff;
  if (e <= 0) { if (e < -10) return s; const mm = (m | 0x800000) >> (1 - e); return s | ((mm + 0x1000) >> 13); }
  const r = s | (e << 10) | (m >> 13), q = (m >> 12) & 1; return e >= 31 ? s | 0x7c00 : r + q; }
function compatta(a, v) {
  if (a.idx || a.nome === 'position' || a.nome === 'instanceMatrix' || a.nome === 'instanceColor') return null;
  if (v instanceof Uint16Array && a.norm && a.nome === 'color') { const o = new Uint8Array(v.length); for (let i = 0; i < v.length; i++) o[i] = (v[i] * 255 + 32767) / 65535 | 0; return { v: o, tipo: 'Uint8Array', norm: true }; }
  if (!(v instanceof Float32Array) || a.norm) return null;
  let lo = Infinity, hi = -Infinity, int = true; for (let i = 0; i < v.length; i++) { const x = v[i]; if (x < lo) lo = x; if (x > hi) hi = x; if (int && x !== Math.round(x)) int = false; }
  if (int && lo >= 0 && hi < 65536) return { v: Uint16Array.from(v), tipo: 'Uint16Array', norm: false };
  if (a.nome === 'uv' && lo >= -2 && hi <= 2) { const o = new Uint16Array(v.length); for (let i = 0; i < v.length; i++) o[i] = mezza(v[i]); return { v: o, tipo: 'Uint16Array', norm: false, half: true }; }
  return null;
}
function contenitore(ab, tel) {
  const dv = new DataView(ab); if (dv.getUint32(0, true) !== 0x31545650) throw new Error('non è un tassello');   // 'PVT1'
  const n = dv.getUint32(4, true), testa = JSON.parse(new TextDecoder().decode(new Uint8Array(ab, 8, n))), h = (8 + n + 7) & ~7;
  blocco.q16 = tel ? new Map() : null;
  const vettori = testa.attr.map(a => blocco(ab, h, testa.blocchi[a.b], a)), q16 = [];
  if (tel) { blocco.q16.forEach((u, f) => { const i = vettori.indexOf(f); if (i >= 0) q16[i] = u; }); blocco.q16 = null;
    testa.attr.forEach((a, i) => { const c = compatta(a, vettori[i]); if (!c) return; vettori[i] = c.v; testa.attr[i] = Object.assign({}, a, { tipo: c.tipo, norm: c.norm, half: !!c.half }); }); }
  return { testa, vettori, q16 };
}
self.onmessage = async e => {
  const m = e.data;
  try {
    await MeshoptDecoder.ready;
    if (m.op === 'tassello') {
      const t0 = performance.now(), ab = m.buf ? await apri(m.buf) : await scarica(m.url, true), t1 = performance.now(), { testa, vettori, q16 } = contenitore(ab, !!m.tel);
      const buf = [...new Set(vettori.concat(q16.filter(Boolean)).map(v => v.buffer))].filter(b => b !== ab || !m.buf);
      self.postMessage({ id: m.id, testa, vettori, q16, byte: ab.byteLength, ms: [t1 - t0, performance.now() - t1] }, buf);
    } else if (m.op === 'img') {
      const r = await scarica(m.url, false), bl = await r.blob();
      const bmp = await createImageBitmap(bl, { premultiplyAlpha: 'none', colorSpaceConversion: 'none', imageOrientation: m.capovolgi ? 'flipY' : 'from-image' });
      if (!m.griglia) { self.postMessage({ id: m.id, bmp }, [bmp]); return; }
      // la pila: gli strati dalla griglia (colonne × righe), uno dopo l'altro
      const [col] = m.griglia, W = m.w, H = m.h, D = m.d, cv = new OffscreenCanvas(bmp.width, bmp.height), cx = cv.getContext('2d', { willReadFrequently: true });
      cx.drawImage(bmp, 0, 0); bmp.close();
      const px = new Uint8Array(W * H * 4 * D);
      for (let l = 0; l < D; l++) px.set(cx.getImageData((l % col) * W, Math.floor(l / col) * H, W, H).data, l * W * H * 4);
      self.postMessage({ id: m.id, px }, [px.buffer]);
    } else if (m.op === 'bin') {
      const ab = await scarica(m.url, true); self.postMessage({ id: m.id, buf: ab }, [ab]);
    }
  } catch (err) { self.postMessage({ id: m.id, err: String(err && err.message || err) }); }
};
