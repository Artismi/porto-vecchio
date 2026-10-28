/* Porto Vecchio — [calcolo] I CONTI DEL LAVORATORE: funzioni pure (numeri dentro, vettori tipizzati fuori) che il filo della pagina
   manda a un Web Worker (src/calcolo.js lo crea dal testo di <script id="calcolo-lavoratore">) mentre si gioca. Lo stesso file è anche
   nella pagina (CalcoloF): senza lavoratore, o se il lavoratore si guasta, gli stessi conti si fanno qui, uguali.
   Le funzioni copiano alla lettera il codice di prima (stesso ordine delle operazioni: lo stesso risultato al bit).
   - luce: la luce cotta di un blocco di terreno (render.js bakeLight): le pozze di luce con le ombre delle case, già in pixel RGBA;
   - ruvido: la scabrosità del terreno dipinto (render.js buildChunkGen): dalla luminosità dei pixel;
   - strade: la distanza dalle strade attorno a un blocco (render.js vdRoadField, per il verde): le strade stanno nel lavoratore (metti);
   - vie: le mappe delle vie e delle finiture di un blocco (pavimenti.js mappeG, la parte che legge solo le vie e le finiture). */
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
  // a: { X0, Y0, NX, NY, S, k }; mem[k]: le strade impacchettate (per strada: hw, R, quanti punti, poi x, y di ogni punto)
  function strade(a, mem) {
    const S = a.S, X0 = a.X0, Y0 = a.Y0, NX = a.NX, NY = a.NY, f = new Float32Array(NX * NY).fill(99), P = mem[a.k];
    for (let q = 0; q < P.length;) { const hw = P[q], R = P[q + 1], np = P[q + 2]; q += 3;
      for (let e = q + np * 2; q < e; q += 2) { const ax = P[q], ay = P[q + 1]; if (ax < X0 - R || ay < Y0 - R || ax > X0 + NX * S + R || ay > Y0 + NY * S + R) continue;
        const i0 = Math.max(0, Math.floor((ax - R - X0) / S)), i1 = Math.min(NX - 1, Math.ceil((ax + R - X0) / S)), j0 = Math.max(0, Math.floor((ay - R - Y0) / S)), j1 = Math.min(NY - 1, Math.ceil((ay + R - Y0) / S));
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const d = Math.hypot(X0 + (i + .5) * S - ax, Y0 + (j + .5) * S - ay) - hw, k = j * NX + i; if (d < f[k]) f[k] = d; } } }
    return f;
  }
  // a: { X0, Z0, n, m, TS, NI, MJ, q, kv, su, sx0, sy0, kf, fin }; mem[kv]: le vie (per via: np, hw, ext, f, pr, lat, nt, poi np × (x, z),
  // poi np − 1 s, poi nt × (s0, s1) i tagli); [suolo] su: i ranghi delle caselle del blocco ((n + 2) × (m + 2) da sx0, sy0; null: niente gerarchia);
  // la via salta il punto a s metri dentro un taglio, o (lat > 0, i vicoli e i sentieri) su una casella di rango più alto di lat − 1 (suolo.js via);
  // mem[kf]: le finiture (7 numeri l'una: x, z, a, t, sd, len, wid; NaN dove mancano). → { I, I2, R1, R2, S2, FI }
  function vie(a, mem) {
    const TS = a.TS, X0 = a.X0, Z0 = a.Z0, n = a.n, m = a.m, NI = a.NI, MJ = a.MJ, q = a.q, V = mem[a.kv], SM = a.su, sx0 = a.sx0, sy0 = a.sy0, sw = n + 2;
    const I = new Float32Array(NI * MJ * 4), I2 = new Float32Array(NI * MJ * 4), K1 = new Float32Array(NI * MJ).fill(1e9), K2 = new Float32Array(NI * MJ).fill(1e9), S2 = new Float32Array(NI * MJ).fill(9), R1 = new Int32Array(NI * MJ).fill(-1), R2 = new Int32Array(NI * MJ).fill(-1);
    const put = (A4, kk, s0, v, th, f, hw) => { A4[kk * 4] = s0; A4[kk * 4 + 1] = v; A4[kk * 4 + 2] = th; A4[kk * 4 + 3] = f + 256 * Math.min(127, Math.round(hw * 8)); };
    for (let ri = 0, o = 0; o < V.length; ri++) { const np = V[o], hw = V[o + 1], ext = V[o + 2], f = V[o + 3], pr = V[o + 4], lat = SM ? V[o + 5] : 0, nt = V[o + 6], oP = o + 7, oS = oP + np * 2, oT = oS + Math.max(0, np - 1); o = oT + nt * 2; if (np < 2) continue;
      for (let k = 0; k < np - 1; k++) { const ax = V[oP + k * 2], az = V[oP + k * 2 + 1], bx = V[oP + k * 2 + 2], bz = V[oP + k * 2 + 3], L = Math.hypot(bx - ax, bz - az); if (L < 1e-4) continue;
        if (Math.max(ax, bx) < X0 - ext || Math.min(ax, bx) > X0 + n * TS + ext || Math.max(az, bz) < Z0 - ext || Math.min(az, bz) > Z0 + m * TS + ext) continue;
        const ux = (bx - ax) / L, uz = (bz - az) / L, th = Math.atan2(uz, ux);
        const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - ext - X0) / q)), i1 = Math.min(NI - 1, Math.ceil((Math.max(ax, bx) + ext - X0) / q));
        const j0 = Math.max(0, Math.floor((Math.min(az, bz) - ext - Z0) / q)), j1 = Math.min(MJ - 1, Math.ceil((Math.max(az, bz) + ext - Z0) / q));
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const px = X0 + (i + .5) * q, pz = Z0 + (j + .5) * q, dx = px - ax, dz = pz - az, t = dx * ux + dz * uz;
          if (t < -.6 || t > L + .6) continue; const v = ux * dz - uz * dx, sc = Math.abs(v) - hw; if (Math.abs(v) > ext) continue;
          if (nt) { const s = V[oS + k] - V[oS] + Math.max(0, Math.min(L, t)); let cut = false; for (let c = 0; c < nt; c++) if (s >= V[oT + c * 2] && s < V[oT + c * 2 + 1]) { cut = true; break; } if (cut) continue; }   // [suolo] il tratto tagliato
          if (lat && SM[(Math.floor(pz / TS) - sy0) * sw + Math.floor(px / TS) - sx0] > lat - 1) continue;   // [suolo] il vicolo contro la piazza
          const kk = j * NI + i, key = sc < 0 ? sc - pr * 100 : sc, s0 = V[oS + k] + t;
          if (R1[kk] === ri) { if (key < K1[kk]) { K1[kk] = key; put(I, kk, s0, v, th, f, hw); } continue; }
          if (R2[kk] === ri) { if (key < K2[kk]) { K2[kk] = key; S2[kk] = sc; put(I2, kk, s0, v, th, f, hw); } }
          else if (key < K1[kk]) { if (R1[kk] >= 0) { K2[kk] = K1[kk]; R2[kk] = R1[kk]; S2[kk] = 0; I2.set(I.subarray(kk * 4, kk * 4 + 4), kk * 4); S2[kk] = Math.abs(I2[kk * 4 + 1]) - Math.floor(I2[kk * 4 + 3] / 256) / 8; }
            K1[kk] = key; R1[kk] = ri; put(I, kk, s0, v, th, f, hw); continue; }
          else if (key < K2[kk]) { K2[kk] = key; R2[kk] = ri; S2[kk] = sc; put(I2, kk, s0, v, th, f, hw); continue; }
          if (K2[kk] < K1[kk]) { const a4 = I.slice(kk * 4, kk * 4 + 4); I.set(I2.subarray(kk * 4, kk * 4 + 4), kk * 4); I2.set(a4, kk * 4); [K1[kk], K2[kk]] = [K2[kk], K1[kk]]; [R1[kk], R2[kk]] = [R2[kk], R1[kk]]; S2[kk] = Math.abs(I2[kk * 4 + 1]) - Math.floor(I2[kk * 4 + 3] / 256) / 8; } } } }
    // [strade] le finiture: per ogni texel la cosa più importante che lo tocca
    const FI = new Float32Array(NI * MJ * 4), FP = new Uint8Array(NI * MJ);
    if (a.fin) { const RAG = { 1: .5, 2: .5, 3: .56, 4: .42, 5: 1.3, 7: 6.5 }, PRI = { 1: 9, 2: 9, 3: 8, 4: 7, 6: 5, 5: 3, 7: 2 }, FL = mem[a.kf], nl = n => (n !== n ? undefined : n);
      for (let fo = 0; fo < FL.length; fo += 7) { const x = FL[fo], z = FL[fo + 1], an = FL[fo + 2], t = FL[fo + 3], len = nl(FL[fo + 5]), wid = nl(FL[fo + 6]); const r = t === 6 ? Math.hypot(len, wid) / 2 + .2 : RAG[t]; if (x < X0 - r || x > X0 + n * TS + r || z < Z0 - r || z > Z0 + m * TS + r) continue;
        const i0 = Math.max(0, Math.floor((x - r - X0) / q)), i1 = Math.min(NI - 1, Math.floor((x + r - X0) / q)), j0 = Math.max(0, Math.floor((z - r - Z0) / q)), j1 = Math.min(MJ - 1, Math.floor((z + r - Z0) / q));
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const kk = j * NI + i, px = X0 + (i + .5) * q, pz = Z0 + (j + .5) * q; if (Math.hypot(px - x, pz - z) > r + .36) continue; if (FP[kk] > PRI[t]) continue;
          FP[kk] = PRI[t]; FI[kk * 4] = x; FI[kk * 4 + 1] = z; FI[kk * 4 + 2] = an; FI[kk * 4 + 3] = t + 16 * Math.min(255, Math.round((len || 0) * 10)) + 4096 * Math.min(255, Math.round((wid || 0) * 10)); } } }
    return { I, I2, R1, R2, S2, FI };
  }
  return { LK, luce, ruvido, strade, vie };
})();
// nel lavoratore: { op: 'metti', k, v } tiene un dato; { id, op, a } → { id, val } (il vettore del risultato trasferito, senza copia) o { id, err }
if (typeof window === 'undefined' && typeof self !== 'undefined' && typeof importScripts === 'function') {
  const MEM = {};   // i dati che restano (metti): le strade...
  self.onmessage = e => {
    const m = e.data;
    if (m.op === 'metti') { MEM[m.k] = m.v; return; }
    try { const f = CalcoloF[m.op]; if (typeof f !== 'function') throw new Error('conto sconosciuto ' + m.op);
      const t0 = performance.now(), val = f(m.a, MEM); self.postMessage({ id: m.id, val, ms: performance.now() - t0 }, val && val.buffer ? [val.buffer] : val && typeof val === 'object' ? Object.values(val).filter(v => v && v.buffer).map(v => v.buffer) : []); }
    catch (err) { self.postMessage({ id: m.id, err: String(err && err.message || err) }); }
  };
}
