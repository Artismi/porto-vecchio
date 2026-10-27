/* Porto Vecchio — [calcolo] I CONTI DEL LAVORATORE: funzioni pure (numeri dentro, vettori tipizzati fuori) che il filo della pagina
   manda a un Web Worker (src/calcolo.js lo crea dal testo di <script id="calcolo-lavoratore">) mentre si gioca. Lo stesso file è anche
   nella pagina (CalcoloF): senza lavoratore, o se il lavoratore si guasta, gli stessi conti si fanno qui, uguali.
   Le funzioni copiano alla lettera il codice di prima (stesso ordine delle operazioni: lo stesso risultato al bit).
   - luce: la luce cotta di un blocco di terreno (render.js bakeLight): le pozze di luce con le ombre delle case, già in pixel RGBA;
   - ruvido: la scabrosità del terreno dipinto (render.js buildChunkGen): dalla luminosità dei pixel. */
var CalcoloF = (function () {
  'use strict';
  // a: { W, H, X0, Z0, tq, TS, mx0, mz0, mw, mh, mask (Uint8Array: 1 = casa), L (Float64Array, LK numeri per luce) }
  // per luce: x, z, y, gy, r, g, b, base, flick, spill (0/1), nx, nz, dist, R
  const LK = 14;
  function luce(a) {
    const W = a.W, H = a.H, X0 = a.X0, Z0 = a.Z0, tq = a.tq, TS = a.TS, mx0 = a.mx0, mz0 = a.mz0, mw = a.mw, mh = a.mh, mask = a.mask, Ls = a.L, acc = new Float32Array(W * H * 3);
    const solid = (wx, wz) => { const tx = Math.floor(wx / TS) - mx0, ty = Math.floor(wz / TS) - mz0; return tx >= 0 && ty >= 0 && tx < mw && ty < mh ? mask[ty * mw + tx] === 1 : false; };
    for (let l = 0; l < Ls.length; l += LK) {
      const Lx = Ls[l], Lz = Ls[l + 1], Ly = Ls[l + 2], Lgy = Ls[l + 3], spill = Ls[l + 9] === 1, Lnx = Ls[l + 10], Lnz = Ls[l + 11], R = Ls[l + 13];
      if (solid(Lx, Lz)) continue;
      const h = Math.max(.8, Ly - Lgy), h2 = h * h, cr = Ls[l + 4], cg = Ls[l + 5], cb = Ls[l + 6], I = Ls[l + 7] * (spill ? .55 : .46) * (Ls[l + 8] > .5 ? .7 : 1);   // [luci1]
      const i0 = Math.max(0, Math.floor((Lx - R - X0) / tq)), i1 = Math.min(W - 1, Math.ceil((Lx + R - X0) / tq)), j0 = Math.max(0, Math.floor((Lz - R - Z0) / tq)), j1 = Math.min(H - 1, Math.ceil((Lz + R - Z0) / tq));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const px = X0 + (i + .5) * tq, pz = Z0 + (j + .5) * tq, dx = px - Lx, dz = pz - Lz, d2 = dx * dx + dz * dz; if (d2 > R * R) continue;
        const d = Math.sqrt(d2);
        let f = Math.pow(h2 / (d2 + h2), 1.5) * Math.pow(1 - d / R, 2);
        if (spill) { const dot = (dx * Lnx + dz * Lnz) / (d || 1); if (dot <= .05) continue; f *= Math.pow(dot, .6); }
        if (f < .004) continue;
        if (solid(px, pz)) continue;
        // ombra: dal punto verso la sorgente, a passi di un metro; il primo metro vicino alla sorgente non conta (lampade a muro)
        let lit = true; const st = Math.floor(d / 1); for (let s = 1; s < st; s++) { const t = s / st; if (d * (1 - t) < .9) break; if (solid(px - dx * t, pz - dz * t)) { lit = false; break; } }
        if (!lit) continue;
        const o = (j * W + i) * 3, v = f * I; acc[o] += cr * v; acc[o + 1] += cg * v; acc[o + 2] += cb * v;
      }
    }
    const D = new Uint8ClampedArray(W * H * 4);
    for (let q = 0; q < W * H; q++) { for (let k = 0; k < 3; k++) D[q * 4 + k] = Math.round((1 - Math.exp(-acc[q * 3 + k] * 1.35)) * 255); D[q * 4 + 3] = 255; }
    return D;
  }
  // a: { d (i pixel RGBA del terreno dipinto), W, H } → i pixel RGBA della scabrosità
  function ruvido(a) {
    const W = a.W, H = a.H, d = a.d, o = new Uint8ClampedArray(W * H * 4);
    for (let q = 0; q < W * H; q++) { const lum = d[q * 4] * .3 + d[q * 4 + 1] * .59 + d[q * 4 + 2] * .11, r = Math.max(.9, Math.min(1, .9 + (lum - 40) / 120 * .1)) * 255   /* [plastica2] era .72 sullo scuro: l'asfalto luccicava più dei palazzi */   /* [isola35] */; o[q * 4] = o[q * 4 + 1] = o[q * 4 + 2] = r; o[q * 4 + 3] = 255; }
    return o;
  }
  return { LK, luce, ruvido };
})();
// nel lavoratore: { id, op, a } → { id, val } (il vettore del risultato trasferito, senza copia) o { id, err }
if (typeof window === 'undefined' && typeof self !== 'undefined' && typeof importScripts === 'function') {
  self.onmessage = e => {
    const m = e.data;
    try { const f = CalcoloF[m.op]; if (typeof f !== 'function' || m.op === 'LK') throw new Error('conto sconosciuto ' + m.op);
      const t0 = performance.now(), val = f(m.a); self.postMessage({ id: m.id, val, ms: performance.now() - t0 }, val && val.buffer ? [val.buffer] : []); }
    catch (err) { self.postMessage({ id: m.id, err: String(err && err.message || err) }); }
  };
}
