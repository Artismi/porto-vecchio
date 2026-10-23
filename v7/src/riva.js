/* Porto Vecchio — [riva] LA RIVA FINE: la forma, il suolo e gli scogli della costa naturale, a mezzo metro invece che a due.
   Il committente: «concentrati sulla strada, la geomorfologia, la sabbia, le texture della terra, della roccia, del suolo, leggere ma
   dettagliate e pulite… dettagli e pienezza, esplorabilità: deve essere un piacere anche camminare lungo la spiaggia, non un litorale
   fake che sembra di plastica».
   Prima la riva era il terreno a caselle di 2 m, ammorbidito verso il mare: una rampa liscia e dipinta. Ora, nella fascia della riva
   naturale (non dove c'è la città: case, strade, banchine), la quota si ricalcola a 50 cm secondo il tipo di riva:
   - SABBIA (spiaggia, duna, foce, cala, reef): la battigia che sale concava, le cuspidi ogni 10-12 m, la berma (il gradino della
     mareggiata), la retrospiaggia quasi piana, sulla duna il cordone con le gobbe e le conche del vento; in mare la barra di sabbia;
   - SCOGLI: la piattaforma di calcare a gradoni (strati di ~32 cm), le fratture, le pozze di scogliera;
   - FALESIA: lo stesso calcare a gradoni alti, ripido, che sale fino al ciglio.
   Sopra la quota ci sono gli SCOGLI VERI (data: posizione, raggio, altezza, forma): il loro piano si somma alla quota, quindi ci si
   cammina sopra; la grafica li disegna con la stessa forma. Poi i CIOTTOLI, solo da vedere, e i PESI DEL SUOLO per il disegno al pixel
   (sabbia, roccia, bagnato, ciottoli, la distanza dal mare).
   Tutto deterministico (hash della posizione), lazy per blocco di 32 caselle (lo stesso dei blocchi del terreno), e gira anche in Node
   (le prove: src/test_riva.js). ?vecchiacosta spegne tutto (la riva di prima). La grafica è in fondo (Riva.blocco), la chiama render.js. */
var Riva = (function () {
  'use strict';
  const SPENTA = typeof location !== 'undefined' && /[?&]vecchiacosta/.test(location.search);
  const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const h2 = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  const vn = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), a = h2(xi, yi, s), b = h2(xi + 1, yi, s), c = h2(xi, yi + 1, s), d = h2(xi + 1, yi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  const fbm = (x, y, s, o) => { let t = 0, a = .5, f = 1, n = 0; for (let i = 0; i < o; i++) { t += a * vn(x * f, y * f, s + i * 13); n += a; a *= .5; f *= 2.07; } return t / n; };
  function crepa(x, y, s) { const xi = Math.floor(x), yi = Math.floor(y); let d1 = 9, d2 = 9; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { const px = xi + a + h2(xi + a, yi + b, s), py = yi + b + h2(xi + a, yi + b, s + 1), d = Math.hypot(x - px, y - py); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; } return d2 - d1; }   // 0 sulla frattura
  // le famiglie della riva: S sabbia, R scogli, F falesia; il porto e il frangiflutti restano come sono (opere dell'uomo)
  const FAM = { spiaggia: 1, duna: 1, foce: 1, cala: 1, reef: 1, scogli: 2, falesia: 3 };
  const BANDA = { 1: [-14, 16], 2: [-6, 12], 3: [-5, 9] };   // da quanto in mare a quanto in terra (m dalla riva) si ridisegna
  const SUB = 4, ST = 2 / SUB;   // 4 campioni per casella: mezzo metro
  const R = { on: !SPENTA, W: null, TS: 2, stat: { blocchi: 0, tri: 0, scogli: 0, ciottoli: 0 } };
  let W, GW, GH, VW, TS, T, WL, vD, vQ, vN, tF, tK, dF, cel = new Map();

  function init(w) {
    if (R.W === w) return true; if (!w || !w.inland || !w.quotaRiva || !w.coastKind2) { R.on = false; return false; }
    W = R.W = w; GW = w.GW; GH = w.GH; VW = GW + 1; TS = R.TS = w.TS; T = w.T; WL = w.WL !== undefined ? w.WL : -.45; R.WL = WL;
    vD = new Float32Array(VW * (GH + 1)).fill(NaN); vQ = new Float32Array(VW * (GH + 1)).fill(NaN); vN = new Float32Array(VW * (GH + 1)).fill(-1);
    tF = new Int8Array(GW * GH).fill(-1); tK = new Array(GW * GH); cel = new Map(); vK = null; vK0 = null; vS = null;
    // la distanza dalla città (in caselle, fino a 6): case, strade, vicoli, piazze, banchine, pontili, le strade dei veicoli
    const FATTO = new Set([T.BLD, T.VIA, T.COB, T.PIAZZA, T.WALK, T.STAIRS, T.FOUNT, T.QUAY, T.PIER]);
    dF = new Uint8Array(GW * GH); for (let i = 0; i < GW * GH; i++) dF[i] = FATTO.has(w.grid[i]) || (w.roadW && w.roadW[i] > 0) ? 0 : 8;
    for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) { const i = ty * GW + tx; let v = dF[i]; if (tx) v = Math.min(v, dF[i - 1] + 1); if (ty) v = Math.min(v, dF[i - GW] + 1); if (tx && ty) v = Math.min(v, dF[i - GW - 1] + 1); if (ty && tx < GW - 1) v = Math.min(v, dF[i - GW + 1] + 1); dF[i] = v; }
    for (let ty = GH - 1; ty >= 0; ty--) for (let tx = GW - 1; tx >= 0; tx--) { const i = ty * GW + tx; let v = dF[i]; if (tx < GW - 1) v = Math.min(v, dF[i + 1] + 1); if (ty < GH - 1) v = Math.min(v, dF[i + GW] + 1); if (tx < GW - 1 && ty < GH - 1) v = Math.min(v, dF[i + GW + 1] + 1); if (ty < GH - 1 && tx) v = Math.min(v, dF[i + GW - 1] + 1); dF[i] = v; }
    return true;
  }
  // ---- i valori ai vertici delle caselle (2 m), calcolati una volta ----
  const VI = (i, j) => Math.max(0, Math.min(GH, j)) * VW + Math.max(0, Math.min(GW, i));
  function dV(i, j) { const k = VI(i, j); let v = vD[k]; if (v !== v) v = vD[k] = W.inland(i * TS, j * TS); return v; }
  let vS = null;
  function qS(i, j) { if (!vS) vS = new Float32Array(VW * (GH + 1)).fill(NaN); const k = VI(i, j); let v = vS[k]; if (v !== v) { let t = 0; for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) t += qV(i + a, j + b); v = vS[k] = t / 25; } return v; }   // la quota di prima sfocata (4 m): il bersaglio liscio dentro la fascia
  function qV(i, j) { const k = VI(i, j); let v = vQ[k]; if (v !== v) v = vQ[k] = W.quotaRiva(i, j); return v; }
  function nV(i, j) { const k = VI(i, j); let v = vN[k]; if (v < 0) { let m = 8; for (const [a, b] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]) if (a >= 0 && b >= 0 && a < GW && b < GH) m = Math.min(m, dF[b * GW + a]); v = vN[k] = i < 3 || j < 3 || i > GW - 3 || j > GH - 3 ? 0 : sstep(1.5, 5, m); } return v; }   // e spenta sul bordo della mappa   // 0 accanto alla città, 1 a 10 m
  function famT(tx, ty) { const i = ty * GW + tx; let f = tF[i]; if (f < 0) { const k = W.coastKind2(tx * TS + 1, ty * TS + 1); tK[i] = k; f = tF[i] = FAM[k] || 0; } return f; }
  const kindT = (tx, ty) => (famT(tx, ty), tK[ty * GW + tx]);
  // i tipi ai vertici (2 m), da interpolare: così fra una casella di sabbia e una di scogli la forma passa piano, senza gradino
  // [sabbia, scogli, falesia, duna, cala]
  let vK = null;
  let vK0 = null;
  function kV0(i, j) { if (!vK0) vK0 = new Float32Array(VW * (GH + 1) * 5).fill(NaN); const k = VI(i, j) * 5; if (vK0[k] !== vK0[k]) { const kk = W.coastKind2(i * TS, j * TS), f = FAM[kk] || 0;
      vK0[k] = f === 1 ? 1 : 0; vK0[k + 1] = f === 2 ? 1 : 0; vK0[k + 2] = f === 3 ? 1 : 0; vK0[k + 3] = kk === 'duna' ? 1 : 0; vK0[k + 4] = kk === 'cala' ? 1 : 0; } return k; }
  function kV(i, j) { if (!vK) vK = new Float32Array(VW * (GH + 1) * 5).fill(NaN); const k = VI(i, j) * 5; if (vK[k] !== vK[k]) {   // sfumati su 5×5 vertici (10 m): fra sabbia e scogli la forma passa piano
      const t = [0, 0, 0, 0, 0]; let n = 0; for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) { const q = kV0(i + a, j + b); for (let c = 0; c < 5; c++) t[c] += vK0[q + c]; n++; }
      const own = kV0(i, j), fam = vK0[own] + vK0[own + 1] + vK0[own + 2]; for (let c = 0; c < 5; c++) vK[k + c] = fam > 0 || c > 2 ? t[c] / n : 0; } return k; }
  const LAND = (f, du, ca) => f === 1 ? 16 + 14 * du - 4 * ca : BANDA[f][1];
  // la casella entra nella fascia fine? (lontano dalla città, e per una delle famiglie che ha ai vertici la distanza dalla riva entra nella sua fascia)
  function inBanda(tx, ty) {
    if (!R.on || tx < 1 || ty < 1 || tx >= GW - 1 || ty >= GH - 1) return false;
    if (nV(tx, ty) + nV(tx + 1, ty) + nV(tx, ty + 1) + nV(tx + 1, ty + 1) <= 0) return false;
    let lo = 1e9, hi = -1e9; const has = [0, 0, 0, 0], du = [0, 0], ca = [0, 0];
    for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const d = dV(tx + a, ty + b), k = kV(tx + a, ty + b); lo = Math.min(lo, d); hi = Math.max(hi, d); for (let f = 1; f <= 3; f++) if (vK[k + f - 1] > 0) has[f] = 1; if (vK[k + 3] > 0) du[1] = 1; if (vK[k + 4] > 0) ca[1] = 1; }
    for (let f = 1; f <= 3; f++) if (has[f] && hi > BANDA[f][0] && lo < LAND(f, du[1], 0)) return true;
    return false;
  }
  // ---- la forma, secondo la famiglia (x, y in metri; d distanza dalla riva, positiva in terra; q la quota di prima; du, ca quanto è duna, quanto cala) ----
  function forma(f, x, y, d, q, du, ca) {
    if (f === 1) {   // la sabbia
      const n1 = fbm(x / 9, y / 9, 301, 3), al = x + .35 * y;
      if (d < 0) { const bar = .2 * Math.exp(-(((d + 6.5 + 3 * n1) / 2.2) ** 2)); return Math.max(-2.6, WL - .04 + d * (.1 + .05 * n1) + bar + (fbm(x / 2.3, y / 2.3, 305, 2) - .5) * .05); }
      const bD = 5 - 1.8 * ca + 3 * n1, top = WL + .62 - .12 * ca + .25 * n1;
      let h = WL - .04 + (top - WL + .04) * (1 - Math.exp(-d / (bD * .42)));
      h += .13 * Math.sin(al * 6.2832 / 12 + 6 * n1) * Math.exp(-(((d - 1.6) / 1.8) ** 2));   // le cuspidi (ogni 12 m la battigia avanza e rientra di un metro)
      h += .24 * Math.exp(-(((d - bD) / 1.2) ** 2)) + Math.max(0, d - bD) * .012;           // la berma, poi la retrospiaggia
      h += .55 * Math.max(0, fbm(x / 6.5, y / 6.5, 307, 3) - .44) * sstep(bD + .5, bD + 5, d) + (fbm(x / 2.2, y / 2.2, 308, 2) - .5) * .08 * sstep(bD, bD + 3, d);   // le dune embrionali e le gobbe del vento dietro la berma
      if (du > 0) { const A = 1.1 + 1.5 * fbm(x / 40, y / 40, 303, 2), dz = d - (15 + 4 * n1); let dn = A * Math.exp(-dz * dz / (20 + 12 * n1)) * (.5 + .95 * fbm(x / 7, y / 7, 304, 3)); dn *= 1 - .7 * sstep(.58, .68, fbm(x / 26, y / 26, 306, 2)); h += dn * du; }   // il cordone, le gobbe, le conche del vento
      h += (fbm(x / 3.1, y / 3.1, 302, 2) - .5) * .05;
      if (q > h) { const L = LAND(1, du, ca), t = Math.max(0, Math.min(1, (d - bD) / Math.max(2, L - bD))); h += (q - h) * t * sstep(.05, .6, q - h); }   // dietro la spiaggia il terreno sale (la scarpata), piano: dalla berma al bordo della fascia
      return h;
    }
    const n1 = fbm(x / 7, y / 7, 311, 3), off = n1 * .7, F = f === 3, pas = F ? .55 : .32;
    let base = d < 0 ? WL + (F ? .35 : .2) + d * (F ? .8 : .42) : WL + (F ? .35 : .2) + d * (F ? .62 + .3 * n1 : .15 + .12 * n1);
    base = Math.min(base, Math.max(q, WL + .5) + .4);   // non oltre il terreno di prima (il ciglio)
    const qq = (base + off) / pas, fl = Math.floor(qq); let h = base * .22 + ((fl + sstep(.7, 1, qq - fl)) * pas - off) * .78;   // i gradoni
    h -= .13 * (1 - sstep(0, .11, crepa(x / 2.6, y / 2.6, 312)));   // le fratture
    if (d > .8 && d < 5.5) h -= .3 * sstep(.68, .78, fbm(x / 4, y / 4, 313, 2));   // le pozze
    return h + (fbm(x / 1.1, y / 1.1, 314, 2) - .5) * .09;
  }
  // peso della forma nuova: dentro la fascia, lontano dalla città; ai bordi torna la quota di prima (nessuna cucitura)
  function peso(f, d, du, ca) { const B = BANDA[f], L = LAND(f, du, ca); return sstep(B[0], B[0] + 3, d) * (1 - sstep(L - 7, L, d)); }
  const bil = (a, b, c, e, u, v) => a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + e * u * v;
  // i tipi interpolati nel punto: [sabbia, scogli, falesia, duna, cala]
  function tipi(tx, ty, u, v) { const a = kV(tx, ty), b = kV(tx + 1, ty), c = kV(tx, ty + 1), e = kV(tx + 1, ty + 1), o = [0, 0, 0, 0, 0]; for (let q = 0; q < 5; q++) o[q] = bil(vK[a + q], vK[b + q], vK[c + q], vK[e + q], u, v); return o; }
  // la quota nuda (senza gli scogli) in un punto della casella tx, ty
  function quotaNuda(tx, ty, x, y) {
    const u = x / TS - tx, v = y / TS - ty, q = bil(qV(tx, ty), qV(tx + 1, ty), qV(tx, ty + 1), qV(tx + 1, ty + 1), u, v);
    const wn = bil(nV(tx, ty), nV(tx + 1, ty), nV(tx, ty + 1), nV(tx + 1, ty + 1), u, v); if (wn <= 0) return q;
    const d = bil(dV(tx, ty), dV(tx + 1, ty), dV(tx, ty + 1), dV(tx + 1, ty + 1), u, v), K = tipi(tx, ty, u, v), du = K[3] / Math.max(1e-6, K[0]), ca = K[4] / Math.max(1e-6, K[0]); let h = q;
    const qs = bil(qS(tx, ty), qS(tx + 1, ty), qS(tx, ty + 1), qS(tx + 1, ty + 1), u, v);
    for (let f = 1; f <= 3; f++) { const wf = K[f - 1]; if (wf <= 0) continue; const w = wn * wf * peso(f, d, du, ca); if (w > 0) h += (forma(f, x, y, d, qs, du, ca) - q) * w; }
    return h;
  }
  // ---- il blocco (32 caselle): la maschera, la griglia fine delle quote, gli scogli, i ciottoli ----
  const CH = 32;
  function blocco(ci, cj) {
    const key = ci + ',' + cj; let B = cel.get(key); if (B) return B;
    const tx0 = ci * CH, ty0 = cj * CH, n = Math.min(CH, GW - tx0), m = Math.min(CH, GH - ty0), mask = new Uint8Array(n * m); let any = 0;
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) if (inBanda(tx0 + i, ty0 + j)) { mask[j * n + i] = 1; any++; }
    B = { ci, cj, tx0, ty0, n, m, mask, any, NX: n * SUB + 1, NY: m * SUB + 1, h: null, scogli: [], ciottoli: [], idx: null };
    cel.set(key, B); if (!any) return B;
    // la quota nuda ai nodi fini (solo attorno alle caselle della fascia)
    const NX = B.NX, NY = B.NY, H = B.h = new Float32Array(NX * NY).fill(NaN);
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) { if (!mask[j * n + i]) continue; const tx = tx0 + i, ty = ty0 + j;
      for (let b = 0; b <= SUB; b++) for (let a = 0; a <= SUB; a++) { const k = (j * SUB + b) * NX + i * SUB + a; if (H[k] === H[k]) continue; H[k] = quotaNuda(tx, ty, (tx + a / SUB) * TS, (ty + b / SUB) * TS); } }
    // gli scogli: a gruppi (un rumore largo), sulla piattaforma e al piede della falesia; qualcuno sulle spiagge; mai accanto alla città
    const S = B.scogli, idx = B.idx = new Map();
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) { if (!mask[j * n + i]) continue; const tx = tx0 + i, ty = ty0 + j, f = famT(tx, ty), k = tK[ty * GW + tx];
      for (let b = 0; b < 2; b++) for (let a = 0; a < 2; a++) {
        const x = (tx + (a + h2(tx * 2 + a, ty * 2 + b, 401)) / 2) * TS, y = (ty + (b + h2(tx * 2 + a, ty * 2 + b, 402)) / 2) * TS, p = h2(tx * 2 + a, ty * 2 + b, 403);
        const u = x / TS - tx, v = y / TS - ty, d = bil(dV(tx, ty), dV(tx + 1, ty), dV(tx, ty + 1), dV(tx + 1, ty + 1), u, v), wn = bil(nV(tx, ty), nV(tx + 1, ty), nV(tx, ty + 1), nV(tx + 1, ty + 1), u, v);
        if (wn < .8) continue; const gr = fbm(x / 13, y / 13, 404, 2);
        let pr = 0, rr = .5, hh = .4;
        if (f === 2 && d > -3 && d < 4) { pr = .16 * sstep(.38, .62, gr); rr = .55 + h2(tx, ty, 405 + a + b * 2) * 1.5; hh = .35 + h2(tx, ty, 407 + a) * .8; }
        else if (f === 3 && d > -3.5 && d < 2) { pr = .22 * sstep(.3, .6, gr); rr = .8 + h2(tx, ty, 405 + a + b * 2) * 1.8; hh = .6 + h2(tx, ty, 407 + a) * 1.2; }
        else if (f === 1 && k !== 'duna' && d > -1.5 && d < 3) { pr = (k === 'cala' ? .09 : .012) * sstep(.45, .7, gr); rr = .4 + h2(tx, ty, 405) * .8; hh = .25 + h2(tx, ty, 407) * .4; }
        if (p >= pr) continue;
        const z0 = quotaNuda(tx, ty, x, y), s = { x: +x.toFixed(2), y: +y.toFixed(2), r: +rr.toFixed(2), h: +hh.toFixed(2), z: +(z0 - .12 - rr * .06).toFixed(3), ry: +(h2(tx, ty, 409 + a) * 6.283).toFixed(3), v: Math.floor(h2(tx, ty, 410 + b) * 8), f };
        S.push(s); const R0 = Math.ceil(rr / TS); for (let q2 = -R0; q2 <= R0; q2++) for (let p2 = -R0; p2 <= R0; p2++) { const kk = (Math.floor(y / TS) + q2) * GW + Math.floor(x / TS) + p2; let L = idx.get(kk); if (!L) idx.set(kk, L = []); L.push(s); } } }
    // i ciottoli: nelle cale, sulla berma, al piede degli scogli (solo da vedere)
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) { if (!mask[j * n + i]) continue; const tx = tx0 + i, ty = ty0 + j, f = famT(tx, ty), k = tK[ty * GW + tx];
      const dc = dV(tx, ty) * .25 + dV(tx + 1, ty + 1) * .25 + dV(tx + 1, ty) * .25 + dV(tx, ty + 1) * .25, wn = nV(tx, ty) * nV(tx + 1, ty + 1);
      const quanti = wn < .5 || !famT(tx, ty) ? 0 : k === 'cala' ? (dc > -.5 && dc < 5 ? 14 : 0) : f === 2 ? (dc > -1 && dc < 3 ? 6 : 0) : f === 3 ? (dc > -1 && dc < 2 ? 8 : 0) : f === 1 && k !== 'duna' ? (dc > 3.5 && dc < 7 ? 3 : 0) : 0;
      for (let c = 0; c < quanti; c++) { const x = (tx + h2(tx, ty, 420 + c)) * TS, y = (ty + h2(tx, ty, 440 + c)) * TS; if (fbm(x / 5, y / 5, 421, 2) < .42) continue;
        B.ciottoli.push({ x, y, s: .06 + h2(tx, ty, 460 + c) ** 2 * .22, ry: h2(tx, ty, 480 + c) * 6.283, t: h2(tx, ty, 500 + c) }); } }
    // i detriti del mare d'inverno: la posidonia spiaggiata a mucchi lungo la berma (la banquette), il legno portato dalle mareggiate
    B.detriti = [];
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) { if (!mask[j * n + i]) continue; const tx = tx0 + i, ty = ty0 + j; if (famT(tx, ty) !== 1) continue;
      for (let c = 0; c < 3; c++) { const x = (tx + h2(tx, ty, 520 + c)) * TS, y = (ty + h2(tx, ty, 530 + c)) * TS, u = x / TS - tx, v = y / TS - ty, d = bil(dV(tx, ty), dV(tx + 1, ty), dV(tx, ty + 1), dV(tx + 1, ty + 1), u, v), wn = bil(nV(tx, ty), nV(tx + 1, ty), nV(tx, ty + 1), nV(tx + 1, ty + 1), u, v);
        if (wn < .7) continue; const bD = 5 + 3 * fbm(x / 9, y / 9, 301, 3), cl = fbm(x / 11, y / 11, 541, 2), p = h2(tx, ty, 550 + c);
        if (Math.abs(d - bD) < 1.6 && cl > .45 && p < .55) B.detriti.push({ k: 'alga', x, y, s: .5 + h2(tx, ty, 560 + c) * .8, ry: h2(tx, ty, 570 + c) * 6.283, t: h2(tx, ty, 580 + c) });
        else if (d > 1.5 && d < bD + 3 && p < .018) B.detriti.push({ k: 'legno', x, y, s: .6 + h2(tx, ty, 560 + c) * 1.6, ry: h2(tx, ty, 570 + c) * 6.283, t: h2(tx, ty, 580 + c) }); } }
    return B;
  }
  const BL = (tx, ty) => blocco(Math.floor(tx / CH), Math.floor(ty / CH));
  // la cima di uno scoglio nel punto (un piano largo, i fianchi ripidi): ci si cammina sopra
  function sopraScogli(B, x, y) { if (!B.idx) return -1e9; const L = B.idx.get(Math.floor(y / TS) * GW + Math.floor(x / TS)); if (!L) return -1e9; let top = -1e9;
    for (const s of L) { const c = Math.cos(s.ry), sn = Math.sin(s.ry), dx = x - s.x, dy = y - s.y, lx = (dx * c + dy * sn) / (s.r * 1.15), ly = (-dx * sn + dy * c) / (s.r * .85), q = Math.sqrt(lx * lx + ly * ly); if (q >= 1) continue;
      top = Math.max(top, s.z + s.h * (1 - Math.pow(q, 5)) * (s.f === 3 ? 1.05 : 1)); } return top; }
  // la quota fine nel punto (o null fuori dalla fascia): la usano groundH (chi cammina, le cose posate) e la grafica
  function quota(x, y) {
    if (!R.on || !W) return null; const tx = Math.floor(x / TS), ty = Math.floor(y / TS); if (tx < 1 || ty < 1 || tx >= GW - 1 || ty >= GH - 1) return null;
    const B = BL(tx, ty); if (!B.any || !B.mask[(ty - B.ty0) * B.n + tx - B.tx0]) return null;
    const fx = (x / TS - B.tx0) * SUB, fy = (y / TS - B.ty0) * SUB, i = Math.min(B.NX - 2, Math.floor(fx)), j = Math.min(B.NY - 2, Math.floor(fy)), u = fx - i, v = fy - j, H = B.h, k = j * B.NX + i;
    const h = bil(H[k], H[k + 1], H[k + B.NX], H[k + B.NX + 1], u, v);
    return Math.max(h, sopraScogli(B, x, y));
  }
  // i pesi del suolo in un punto: sabbia, roccia, bagnato, ciottoli, la distanza dal mare (per il disegno al pixel)
  function suolo(tx, ty, x, y, h) {
    const u = x / TS - tx, v = y / TS - ty, d = bil(dV(tx, ty), dV(tx + 1, ty), dV(tx, ty + 1), dV(tx + 1, ty + 1), u, v), wn = bil(nV(tx, ty), nV(tx + 1, ty), nV(tx, ty + 1), nV(tx + 1, ty + 1), u, v), K = tipi(tx, ty, u, v);
    const du = K[3] / Math.max(1e-6, K[0]), ca = K[4] / Math.max(1e-6, K[0]), wS = K[0] * wn * peso(1, d, du, ca), wR = K[1] * wn * peso(2, d, 0, 0) + K[2] * wn * peso(3, d, 0, 0);
    const sab = wS + wR * .35 * sstep(.62, .72, fbm(x / 6, y / 6, 432, 2)) * (1 - sstep(2, 4, d)), roc = wR;
    const cio = wS * ca * sstep(.42, .6, fbm(x / 5, y / 5, 421, 2)) * (1 - sstep(4, 7, d)) + wR * .4 * (1 - sstep(-1, 1.5, Math.abs(d - .3)));
    const bag = wS * (1 - sstep(.4, 2.4 + 1.6 * fbm(x / 9, y / 9, 301, 3), d)) + wR * (1 - sstep(.05, .6, h - WL));   // la sabbia bagnata fin dove arriva l'onda; la roccia fin dove arrivano gli spruzzi
    return [Math.min(1, sab), Math.min(1, roc), Math.min(1, bag), Math.min(1, cio), d];
  }
  // ================= I MARGINI DELLE COSTIERE: fra l'asfalto e la campagna =================
  // Lungo le due costiere fuori città (nord, litoranea), ogni mezzo metro e da tutti e due i lati: dov'è il ciglio, da che parte sta il mare,
  // quanta sabbia porta il vento (vicino alle spiagge), quanto sale il monte (la trincea nella roccia), la curva. Da qui la grafica fa
  // la banchina di ghiaia con l'asfalto sbrecciato, la sabbia sulla strada, la parete di roccia tagliata, i paletti e i cippi.
  let MARG = null;
  function margini() {
    if (MARG) return MARG; MARG = []; if (!W || !W.roads) return MARG;
    const SEA = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) return true; const i = ty * GW + tx; return W.grid[i] === T.WATER; };
    const qT = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS), u = x / TS - tx, v = y / TS - ty; return bil(qV(tx, ty), qV(tx + 1, ty), qV(tx, ty + 1), qV(tx + 1, ty + 1), u, v); };
    const cittaX = 1222;   // la città (dalla stazione in là) ha le sue vie: i margini sono delle costiere
    W.roads.filter(r => r.kind === 'litoranea').forEach(rd => {
      const P = rd.pts, w = rd.w, L = []; let acc = 0;
      for (let k = 1; k < P.length; k++) { const [ax, ay] = P[k - 1], [bx, by] = P[k], seg = Math.hypot(bx - ax, by - ay); if (!seg) continue; const tx = (bx - ax) / seg, ty = (by - ay) / seg;
        for (let t = 0; t < seg; t += .5) { const x = ax + tx * t, y = ay + ty * t; if (x > cittaX) continue; L.push({ x, y, tx, ty, s: acc + t }); } acc += seg; }
      for (let k = 1; k < L.length - 1; k++) { const a = L[k - 1], c = L[k + 1], dx = c.x - a.x, dy = c.y - a.y, l = Math.hypot(dx, dy) || 1; L[k].tx = dx / l; L[k].ty = dy / l; }
      [-1, 1].forEach(sd => { const run = [];
        L.forEach(p => { const nx = -p.ty * sd, ny = p.tx * sd, ex = p.x + nx * w / 2, ey = p.y + ny * w / 2;
          let mare = 0; for (let o = 1; o <= 12; o += 1) if (SEA(ex + nx * o, ey + ny * o)) { mare = 1 - (o - 1) / 12; break; }
          const tx = Math.floor(ex / TS), ty = Math.floor(ey / TS), dd = W.inland(ex, ey), k2 = W.coastKind2(ex, ey), sab = (FAM[k2] === 1 ? 1 : 0) * (1 - sstep(10, 40, dd)) * (.4 + .6 * fbm(ex / 22, ey / 22, 601, 2));
          const h0 = qT(ex, ey), h1 = qT(ex + nx * 3, ey + ny * 3), h2 = qT(ex + nx * 6, ey + ny * 6), tg = Math.max(0, Math.max(h1, h2) - h0);
          run.push({ x: +ex.toFixed(2), y: +ey.toFixed(2), nx: +nx.toFixed(4), ny: +ny.toFixed(4), s: p.s, mare: +mare.toFixed(2), sab: +sab.toFixed(2), tg: +tg.toFixed(2), sd }); });
        MARG.push({ id: rd.id, sd, w, pts: run }); });
    });
    return MARG;
  }
  // i paletti segnastrada (bianchi con la fascia nera e il catarifrangente) dove non c'è guardrail né muretto, i cippi ogni 100 m e la pietra del km
  function cippi() {
    const out = []; margini().forEach(M => { let last = -1e9; M.pts.forEach((p, k) => {
      if (M.sd === 1 && p.s - (out.cs || 0) >= 0 && Math.floor(p.s / 100) !== Math.floor((p.s - .5) / 100)) out.push({ k: Math.floor(p.s / 1000) !== Math.floor((p.s - .5) / 1000) ? 'km' : 'etto', x: p.x + p.nx * .9, y: p.y + p.ny * .9, ry: Math.atan2(p.nx, p.ny), n: Math.round(p.s / 100) });
      if (p.s - last >= (p.mare > .4 ? 12 : 25) && p.tg < 1.2) { last = p.s; out.push({ k: 'paletto', x: p.x + p.nx * .7, y: p.y + p.ny * .7, ry: Math.atan2(p.nx, p.ny), sd: M.sd }); } }); });
    return out;
  }
  // ================= LA GRAFICA (solo nella pagina): la mesh fine della riva, il suolo disegnato al pixel, gli scogli, i ciottoli =================
  // Il terreno a caselle salta le caselle della fascia (render.js chiede Riva.inBanda); qui le si ridisegna a mezzo metro con la
  // stessa tela dipinta del blocco sotto (così ai bordi non c'è cucitura né di quota né di colore) e, sopra, la sabbia, la roccia, il
  // bagnato e i ciottoli disegnati nello shader alla scala vera (granelli, increspature, fratture, licheni, la fascia nera degli spruzzi).
  // Una mesh per blocco per il suolo, una per gli scogli (fusi, colori ai vertici), una d'istanze per i ciottoli: 3 disegni a blocco.
  const GLSL_P = `
    varying vec4 vRS9; varying float vRD9; varying vec3 vRW9;
    float rh9(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float rn9(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f); return mix(mix(rh9(i), rh9(i + vec2(1., 0.)), f.x), mix(rh9(i + vec2(0., 1.)), rh9(i + 1.), f.x), f.y); }
    float rf9(vec2 p){ return rn9(p) * .5 + rn9(p * 2.03 + 7.) * .3 + rn9(p * 4.1 + 13.) * .2; }
    vec3 rc9(vec2 p){ vec2 i = floor(p), f = fract(p); float d1 = 8., d2 = 8., id = 0.;
      for (int b = -1; b <= 1; b++) for (int a = -1; a <= 1; a++) { vec2 g = vec2(float(a), float(b)), o = vec2(rh9(i + g), rh9(i + g + 17.3)); float d = length(g + o - f); if (d < d1) { d2 = d1; d1 = d; id = rh9(i + g + 5.1); } else if (d < d2) d2 = d; }
      return vec3(d1, d2 - d1, id); }`;
  const GLSL_A = `
    float rB9 = 0.; float rWet9 = 0., rW9 = clamp(vRS9.x + vRS9.y + vRS9.w, 0., 1.);
    if (rW9 > .002 || vRS9.z > .002) {
      vec2 p = vRW9.xz; float y = vRW9.y, d = vRD9, ab = y + .45;
      vec2 fw = fwidth(p); float mpp = max(fw.x, fw.y), aaF = 1. - smoothstep(.015, .05, mpp), aaM = 1. - smoothstep(.05, .16, mpp), aaL = 1. - smoothstep(.16, .45, mpp);
      float wet = clamp(vRS9.z, 0., 1.);
      // LA SABBIA: due toni larghi, la grana, le increspature del vento (asciutto) e dell'onda (bagnato), le linee della risacca,
      // la linea della posidonia sulla berma, i gusci e la ghiaietta
      float n1 = rf9(p * .3), n2 = rf9(p * 1.6 + 3.), n3 = rf9(p * vec2(.9, 3.2) + 5.), g1 = rh9(floor(p * 11.)), g2 = rh9(floor(p * 23.) + 5.);
      vec3 sab = mix(vec3(.6, .54, .43), vec3(.77, .71, .58), n1) * (.93 + (n2 - .5) * .2) * (.9 + .2 * rf9(p * .06 + 40.));   // i toni larghi: la sabbia asciutta e smossa, la compatta
      sab = mix(sab, sab * vec3(.9, .88, .86), smoothstep(.55, .7, rf9(p * .22 + 17.)) * .6);
      sab = mix(sab, sab * vec3(.82, .8, .78), smoothstep(.6, .75, n3) * (1. - wet) * .7);   // le strisce scure della sabbia pesante, pettinate dal vento
      float an = .55 + (rf9(p * .07) - .5) * 1.4; vec2 dr = vec2(cos(an), sin(an));
      float rip = (rf9(p * 1.3 + 2.) - .5) * 2.;   // la grana larga della sabbia smossa (niente righe: a questa distanza fanno moiré)
      float sw = 0.; for (int k = 0; k < 3; k++) { float c = .9 + float(k) * .75 + (rn9(p * .13 + float(k) * 7.) - .5) * 1.4; sw = max(sw, (1. - smoothstep(0., .06 + .03 * float(k), abs(d - c))) * smoothstep(.35, .65, rn9(p * .45 + float(k) * 3.)) * (1. - float(k) * .3)); }   // le linee della risacca, rotte
      float wr = smoothstep(.56, .74, rf9(p * 1.9 + 11.)) * (1. - smoothstep(.9, 2.2, abs(d - 5.4 - (rn9(p * .09) - .5) * 3.4)));
      float gu = smoothstep(.86, .93, rn9(p * 6.3 + 4.)) * smoothstep(.6, .8, rn9(p * .7 + 2.)) * aaM, gh = smoothstep(.8, .95, rn9(p * 4.1 + 8.)) * aaM * .6;   // conchiglie e ghiaietta, a macchie morbide
      sab *= 1. + (rn9(p * 9.) - .5) * .08 * aaM + rip * .035 * aaL;
      sab = mix(sab, vec3(.92, .89, .82), gu * .85); sab = mix(sab, vec3(.38, .34, .3), gh * .35);
      sab = mix(sab, mix(vec3(.24, .2, .15), vec3(.36, .3, .22), rh9(floor(p * 9.))), wr * .8);
      // LA ROCCIA: il calcare a strati, le fratture grandi e le crepe piccole, i buchi del carsismo, i licheni sopra gli spruzzi,
      // la fascia nera degli spruzzi, le alghe sul pelo dell'acqua
      vec3 c1 = rc9(p * .4), c2 = rc9(p * 1.7 + 5.);
      vec3 roc = mix(vec3(.58, .56, .51), vec3(.71, .68, .62), rf9(p * .55)) * (.93 + sin(y * 19.6 + rf9(p * .45) * 5.) * .05);
      float crk = (1. - smoothstep(0., .06, c1.y)) * .5 + (1. - smoothstep(0., .035, c2.y)) * .28 * aaM;
      float pit = smoothstep(.82, .9, rh9(floor(p * 13.))) * smoothstep(.5, .2, length(fract(p * 13.) - .5)) * aaF;
      roc *= (1. - crk) * (1. - pit * .45);
      roc = mix(roc, vec3(.76, .53, .22), smoothstep(.63, .72, rf9(p * .85 + 21.)) * smoothstep(.9, 1.5, ab) * .55);
      roc = mix(roc, vec3(.83, .83, .79), smoothstep(.6, .7, rf9(p * 1.25 + 31.)) * smoothstep(.6, 1.1, ab) * .35);
      roc = mix(roc, vec3(.16, .16, .15), (1. - smoothstep(.5, 1.05, ab)) * smoothstep(.04, .22, ab) * (.55 + .45 * rf9(p * 2.1)) * .75);
      roc = mix(roc, vec3(.19, .26, .16), (1. - smoothstep(-.05, .14, ab)) * .6);
      // I CIOTTOLI: celle tonde, ognuna col suo grigio o ocra, i giunti scuri di sabbia bagnata
      vec3 cc = rc9(p * 5.2); vec3 cio = mix(mix(vec3(.52, .5, .47), vec3(.8, .77, .71), cc.z), vec3(.66, .58, .46), step(.82, rh9(vec2(cc.z * 91.))));
      float giu = smoothstep(.33, .47, cc.x); cio = mix(cio * (1.04 - cc.x * .3), vec3(.33, .3, .26), giu);
      vec3 pr = mix(sab, roc, clamp(vRS9.y, 0., 1.)); pr = mix(pr, cio, clamp(vRS9.w, 0., 1.) * aaL);
      pr = mix(pr, pr * vec3(.52, .54, .57), wet * .9); pr = mix(pr, vec3(.86, .84, .78), sw * wet * aaM * (1. - vRS9.y) * .45);   // le linee bianche della risacca (schiuma asciugata)
      diffuseColor.rgb = mix(diffuseColor.rgb, pr, rW9);
      rWet9 = wet * rW9;
      rB9 = (rip * .02 * aaL * (1. - vRS9.y) - crk * .05 * vRS9.y - pit * .02 * vRS9.y + (.04 - giu * .05) * vRS9.w * aaL) * rW9;
    }`;
  const GLSL_N = `
    { vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition); float bx = dFdx(rB9), by = dFdy(rB9);
      vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx); float det = dot(dpx, r1); vec3 gr = sign(det) * (bx * r1 + by * r2);
      normal = normalize(abs(det) * normal - gr); }`;
  function materiale(base, prep) {   // il materiale del blocco sotto (la stessa tela, lo stesso prato, la stessa luce di notte) più il suolo della riva
    const m = base.clone(); if (prep) prep(m); const prev = m.onBeforeCompile, pk = m.customProgramCacheKey && m.customProgramCacheKey !== window.THREE.Material.prototype.customProgramCacheKey ? m.customProgramCacheKey() : '';
    m.customProgramCacheKey = () => pk + '|riva9';
    m.onBeforeCompile = (sh, r) => { if (prev) prev.call(m, sh, r);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aRS; attribute float aRD; varying vec4 vRS9; varying float vRD9; varying vec3 vRW9;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRS9 = aRS; vRD9 = aRD; vRW9 = (modelMatrix * vec4(transformed, 1.)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + GLSL_P)
        .replace('#include <color_fragment>', '#include <color_fragment>\n' + GLSL_A)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, .34, rWet9);')
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + GLSL_N);
    };
    return m;
  }
  // ---- gli scogli: calcare a lastre sovrapposte (2-4 strati), spigoli smussati, il sopra chiaro e i fianchi scuri; i massi tondi della falesia ----
  const FORME = {};
  // la forma: una sfera fitta e indicizzata (ombre morbide, niente facce piatte), scavata dal rumore su tre scale, terrazzata a strati
  // (il calcare si rompe in lastre), schiacciata sotto; il masso della falesia è più tondo e meno a strati. Due finezze: 28×18 e 16×10.
  function sasso(seed, strati, fine) {
    const THREE = window.THREE, g = new THREE.SphereGeometry(1, fine ? 28 : 16, fine ? 18 : 10), P = g.attributes.position;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      const n = fbm(x * 1.2 + seed * 7.3, z * 1.2 + y * .9 + seed, 780 + seed, 3) * .55 + fbm(x * 3.1 + seed, z * 3.1 - y * 2, 781, 2) * .18 + fbm(x * 7, z * 7 + y * 5, 782, 2) * .05;
      const r = .72 + n * .62; let X = x * r, Y = y * r, Z = z * r;
      if (strati) { const st = Math.round(Y * strati) / strati; Y += (st - Y) * .55; }   // le lastre
      if (Y < -.15) Y = -.15 + (Y + .15) * .35;   // il fondo schiacciato, che si appoggia
      P.setXYZ(i, X * 1.08, (Y + .3) / 1.25, Z * .92); }
    g.computeVertexNormals();
    const N = g.attributes.normal, c = new Float32Array(P.count * 3), top = [.71, .68, .62], fia = [.54, .52, .48];
    for (let i = 0; i < P.count; i++) { const t = Math.max(0, N.getY(i)), y = P.getY(i), m = .86 + .18 * fbm(P.getX(i) * 2.2 + seed, P.getZ(i) * 2.2 + y * 3, 790, 2);
      for (let k = 0; k < 3; k++) c[i * 3 + k] = (fia[k] + (top[k] - fia[k]) * t * t) * m * (.8 + .2 * Math.min(1, y * 2.2)); }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.deleteAttribute('uv'); return g; }
  function formaScoglio(v, f, fine) {
    const key = f + ':' + v + ':' + (fine ? 1 : 0); if (FORME[key]) return FORME[key];
    return (FORME[key] = [sasso(v + f * 17, f === 3 && v % 2 ? 0 : 3 + (v % 3), fine)]); }
  let MATR = null, MATC = null;
  function matRoccia() {   // gli scogli: colori ai vertici; sotto il pelo dell'acqua bagnati e verdi, sopra la fascia nera degli spruzzi
    if (MATR) return MATR; const THREE = window.THREE; MATR = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .88, metalness: 0 }); MATR.customProgramCacheKey = () => 'riva9r';
    MATR.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRW9;').replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\nvRW9 = (modelMatrix * instanceMatrix * vec4(transformed, 1.)).xyz;\n#else\nvRW9 = (modelMatrix * vec4(transformed, 1.)).xyz;\n#endif');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vRW9;\nfloat rh9(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\nfloat rn9(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f); return mix(mix(rh9(i), rh9(i + vec2(1., 0.)), f.x), mix(rh9(i + vec2(0., 1.)), rh9(i + 1.), f.x), f.y); }')
        .replace('#include <color_fragment>', `#include <color_fragment>
        float rB9 = 0.;
        { vec3 P = vRW9; float ab = P.y + .45, n = rn9(P.xz * 2.3 + P.y * 3.) * .6 + rn9(P.xz * 7.1 + P.y * 5.) * .4;
          vec2 fw = fwidth(P.xz); float aa = 1. - smoothstep(.04, .14, max(fw.x, fw.y));
          float cr = 1. - smoothstep(.0, .07, abs(rn9(vec2(P.x * 1.7 + P.y * 2.3, P.z * 1.7 - P.y * 1.9)) - .5));   // le crepe
          float po = smoothstep(.72, .9, rn9(P.xz * 11. + P.y * 13.)) * aa;   // i pori del calcare
          diffuseColor.rgb *= (.9 + n * .2) * (1. - cr * .32 * aa) * (1. - po * .3);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.7, .58, .36), smoothstep(.7, .8, rn9(P.xz * 1.1 + 21.) * .7 + n * .3) * smoothstep(1.1, 1.8, ab) * .18);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.78, .78, .74), smoothstep(.66, .78, rn9(P.xz * 1.9 + 31.)) * smoothstep(.8, 1.3, ab) * .2);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.17, .17, .16), (1. - smoothstep(.45, 1., ab)) * smoothstep(.0, .2, ab) * (.5 + .5 * n) * .7);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(.5, .58, .46), 1. - smoothstep(-.1, .12, ab));
          rB9 = (n * .03 - cr * .02 - po * .012) * aa; }`)
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + GLSL_N)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(.32, roughnessFactor, smoothstep(.0, .5, vRW9.y + .45));'); };
    return MATR;
  }
  // il masso naturale (gli scogli che affiorano, i faraglioni): un icosaedro suddiviso e scavato dal rumore, schiacciato a strati,
  // il sopra chiaro e i fianchi scuri; per render.js (buildRocks), al posto dell'icosaedro liscio a venti facce
  let GM = null;
  function geoMasso() { if (GM) return GM; return (GM = sasso(41, 3, true)); }
  function costruisci(tx0, ty0, n, m, base, prep) {
    if (!R.on || !W || typeof window === 'undefined' || !window.THREE) return null; const THREE = window.THREE;
    const B = blocco(Math.floor(tx0 / CH), Math.floor(ty0 / CH)); if (!B.any) return null;
    const NX = B.NX, H = B.h, pos = [], uv = [], aS = [], aD = [], idx = [], map = new Int32Array(NX * B.NY).fill(-1);
    const vtx = (gi, gj) => { const k = gj * NX + gi; let q = map[k]; if (q >= 0) return q; q = map[k] = pos.length / 3; const tx = tx0 + Math.min(n - 1, Math.floor(gi / SUB)), ty = ty0 + Math.min(m - 1, Math.floor(gj / SUB)), x = (tx0 + gi / SUB) * TS, y = (ty0 + gj / SUB) * TS, h = H[k];
      pos.push(x, h, y); uv.push(gi / SUB / n, 1 - gj / SUB / m); const s = suolo(tx, ty, x, y, h); aS.push(s[0], s[1], s[2], s[3]); aD.push(s[4]); return q; };
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) { if (!B.mask[j * n + i]) continue;
      for (let b = 0; b < SUB; b++) for (let a = 0; a < SUB; a++) { const gi = i * SUB + a, gj = j * SUB + b, p0 = vtx(gi, gj), p1 = vtx(gi, gj + 1), p2 = vtx(gi + 1, gj + 1), p3 = vtx(gi + 1, gj); idx.push(p0, p1, p2, p0, p2, p3); } }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('aRS', new THREE.Float32BufferAttribute(aS, 4)); geo.setAttribute('aRD', new THREE.Float32BufferAttribute(aD, 1)); geo.setIndex(idx); geo.computeVertexNormals(); geo.computeBoundingSphere();
    const mat = materiale(base, prep), mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = true; mesh.name = 'riva9';
    const grp = new THREE.Group(); grp.add(mesh); let tri = idx.length / 3;
    // gli scogli del blocco, fusi in una geometria sola
    if (B.scogli.length) { const P = [], N2 = [], C = [], IX = [], M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), SC = new THREE.Vector3(), nm = new THREE.Matrix3(), vv = new THREE.Vector3();
      B.scogli.forEach(s => { const F = formaScoglio(s.v, s.f, s.r > .9), tl = (h2(Math.round(s.x * 7), Math.round(s.y * 7), 811) - .5) * .12; E.set(tl, s.ry, tl * .6, 'YXZ'); Q.setFromEuler(E); V.set(s.x, s.z, s.y); SC.set(s.r * 1.15, s.h, s.r * .85); M4.compose(V, Q, SC); nm.getNormalMatrix(M4);
        const tint = .9 + h2(Math.round(s.x * 3), Math.round(s.y * 3), 812) * .2;
        F.forEach(g => { const pa = g.attributes.position, na = g.attributes.normal, ca = g.attributes.color, o = P.length / 3; for (let i = 0; i < pa.count; i++) { vv.set(pa.getX(i), pa.getY(i), pa.getZ(i)).applyMatrix4(M4); P.push(vv.x, vv.y, vv.z); vv.set(na.getX(i), na.getY(i), na.getZ(i)).applyMatrix3(nm).normalize(); N2.push(vv.x, vv.y, vv.z); C.push(ca.getX(i) * tint, ca.getY(i) * tint, ca.getZ(i) * tint * .98); }
          const ix = g.index.array; for (let i = 0; i < ix.length; i++) IX.push(ix[i] + o); }); });
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N2, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(IX); g.computeBoundingSphere();
      const ms = new THREE.Mesh(g, matRoccia()); ms.castShadow = ms.receiveShadow = true; ms.name = 'riva9s'; grp.add(ms); tri += IX.length / 3; }
    // i ciottoli: un'istanza per sasso, appoggiati sul suolo fine
    if (B.ciottoli.length) { if (!MATC) { MATC = new THREE.MeshStandardMaterial({ roughness: .8, metalness: 0 }); }
      const g = new THREE.SphereGeometry(1, 9, 6), im = new THREE.InstancedMesh(g, MATC, B.ciottoli.length), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), SC = new THREE.Vector3(), Cc = new THREE.Color();
      B.ciottoli.forEach((c, i) => { const h = quota(c.x, c.y); E.set(0, c.ry, 0); Q.setFromEuler(E); V.set(c.x, (h === null ? 0 : h) + c.s * .22, c.y); SC.set(c.s * 1.2, c.s * .5, c.s); M4.compose(V, Q, SC); im.setMatrixAt(i, M4);
        const t = c.t; Cc.setRGB(t < .7 ? .44 + t * .3 : .58, t < .7 ? .42 + t * .28 : .5, t < .7 ? .39 + t * .26 : .4); im.setColorAt(i, Cc); });
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.computeBoundingSphere && im.computeBoundingSphere(); im.receiveShadow = true; im.castShadow = false; im.name = 'riva9c'; grp.add(im); }
    if (B.detriti && B.detriti.length) { const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), SC = new THREE.Vector3(), Cc = new THREE.Color();
      [['alga', new THREE.SphereGeometry(1, 10, 6), '#ffffff'], ['legno', new THREE.CylinderGeometry(.045, .065, 1, 6).rotateZ(Math.PI / 2), '#ffffff']].forEach(([k, g, c0]) => { const L = B.detriti.filter(q => q.k === k); if (!L.length) return;
        if (k === 'alga') { const P = g.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i), n = .7 + .5 * fbm(x * 2 + 3, z * 2, 590, 2); P.setXYZ(i, x * n, Math.max(-.2, P.getY(i)) * n, z * n); } g.computeVertexNormals(); }
        const im = new THREE.InstancedMesh(g, MATC || (MATC = new THREE.MeshStandardMaterial({ roughness: .8, metalness: 0 })), L.length);
        L.forEach((q, i) => { const h = quota(q.x, q.y); E.set(0, q.ry, k === 'legno' ? (q.t - .5) * .1 : 0); Q.setFromEuler(E); V.set(q.x, (h === null ? 0 : h) + (k === 'alga' ? .01 : .04), q.y);
          if (k === 'alga') SC.set(q.s * 1.5, .035 + q.t * .05, q.s * .8); else SC.set(q.s, 1, 1); M4.compose(V, Q, SC); im.setMatrixAt(i, M4);
          if (k === 'alga') Cc.setRGB(.36 + q.t * .14, .31 + q.t * .1, .24 + q.t * .07); /* la posidonia secca, bruno grigia */ else Cc.setRGB(.66 + q.t * .1, .63 + q.t * .09, .58 + q.t * .07); im.setColorAt(i, Cc); });
        im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.receiveShadow = true; im.castShadow = k === 'legno'; im.name = 'riva9d'; grp.add(im); }); }
    R.stat.blocchi++; R.stat.tri += tri; R.stat.scogli += B.scogli.length; R.stat.ciottoli += B.ciottoli.length; if (typeof window !== 'undefined') window.__riva9 = R.stat;
    return { grp, mat, tri, scogli: B.scogli.length, ciottoli: B.ciottoli.length, dispose() { grp.traverse(o => { if (o.geometry && !o.isInstancedMesh) o.geometry.dispose(); if (o.isInstancedMesh) { o.geometry.dispose(); o.dispose && o.dispose(); } }); mat.dispose(); } };
  }
  // ---- la grafica dei margini: una mesh per settore di 128 m per la banchina, una per la roccia tagliata, le istanze dei paletti ----
  const GLSL_M = `
    varying vec4 vMg9; varying vec3 vRW9;
    float rh9(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float rn9(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f); return mix(mix(rh9(i), rh9(i + vec2(1., 0.)), f.x), mix(rh9(i + vec2(0., 1.)), rh9(i + 1.), f.x), f.y); }
    float rf9(vec2 p){ return rn9(p) * .5 + rn9(p * 2.03 + 7.) * .3 + rn9(p * 4.1 + 13.) * .2; }`;
  const GLSL_MA = `
    { vec2 p = vRW9.xz; float o = vMg9.x, sab = vMg9.y, mare = vMg9.z;
      float g1 = rh9(floor(p * 21.)), g2 = rh9(floor(p * 47.) + 3.), nb = rf9(p * .9), nd = rf9(p * .45 + 9.);
      // la sabbia portata dal vento: lingue irregolari che entrano sull'asfalto (fino a 1,5 m), più fitte dove la spiaggia è vicina
      float sm = sab * smoothstep(.42, .58, rf9(p * vec2(.35, .35) + vec2(o * .5, 0.)) + (o + .3) * .35);
      // l'asfalto sbrecciato: pezzi rotti del bordo fra -30 e +20 cm
      float br = smoothstep(.52, .6, rf9(p * 2.6)) * (1. - smoothstep(.05, .25, abs(o + .05)));
      float ban = smoothstep(.12, .3, o) * (1. - smoothstep(.85 + nd * .4, 1.35, o));   // la banchina di ghiaia
      float a = max(max(sm, br), ban); if (a < .5) discard;
      vec3 gh = mix(vec3(.47, .44, .4), vec3(.62, .58, .51), nb) * (.86 + g1 * .28); gh = mix(gh, vec3(.34, .32, .3), step(.9, g2) * .7);
      gh = mix(gh, gh * .78, (1. - smoothstep(.0, .09, abs(o - .58 - (nd - .5) * .15))) * (1. - mare) * .8);   // il solco delle gomme
      gh = mix(gh, vec3(.55, .43, .3), smoothstep(.55, .75, nd) * .35 * (1. - sab));   // la terra rossa
      vec3 sa = mix(vec3(.68, .62, .5), vec3(.76, .7, .57), nb) * (.94 + g1 * .1);
      vec3 c = mix(gh, sa, clamp(sm * 1.2, 0., 1.)); diffuseColor.rgb = c; }`;
  let MATM = null;
  function matMargine() { if (MATM) return MATM; const THREE = window.THREE; MATM = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .95, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }); MATM.customProgramCacheKey = () => 'riva9m';
    MATM.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aMg; varying vec4 vMg9; varying vec3 vRW9;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvMg9 = aMg; vRW9 = (modelMatrix * vec4(transformed, 1.)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + GLSL_M).replace('#include <color_fragment>', '#include <color_fragment>\n' + GLSL_MA); };
    return MATM; }
  function geoPaletto(km) { const THREE = window.THREE, parts = []; const add = (g, c, y) => { g.translate(0, y, 0); const n = g.attributes.position.count, a = new Float32Array(n * 3), cc = new THREE.Color(c); for (let i = 0; i < n; i++) { a[i * 3] = cc.r; a[i * 3 + 1] = cc.g; a[i * 3 + 2] = cc.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv'); parts.push(g.index ? g.toNonIndexed() : g); };
    if (km === 'paletto') { add(new THREE.BoxGeometry(.1, .72, .12), '#e8e6de', .36); add(new THREE.BoxGeometry(.102, .16, .122), '#1e1e1e', .78); add(new THREE.BoxGeometry(.104, .1, .124), '#e8e6de', .91); add(new THREE.BoxGeometry(.04, .09, .126), '#e88a10', .78); }
    else if (km === 'km') { add(new THREE.BoxGeometry(.42, .62, .16), '#ecebe4', .31); add(new THREE.CylinderGeometry(.21, .21, .16, 10, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), '#b8332a', .62); }
    else { add(new THREE.BoxGeometry(.2, .36, .12), '#ecebe4', .18); add(new THREE.BoxGeometry(.204, .08, .124), '#b8332a', .38); }
    let n = 0; parts.forEach(g => n += g.attributes.position.count); const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3); let o = 0;
    parts.forEach(g => { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); C.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; });
    const G = new THREE.BufferGeometry(); G.setAttribute('position', new THREE.BufferAttribute(P, 3)); G.setAttribute('normal', new THREE.BufferAttribute(N, 3)); G.setAttribute('color', new THREE.BufferAttribute(C, 3)); return G; }
  function costruisciMargini(gH) {
    if (!R.on || !W || typeof window === 'undefined' || !window.THREE) return null; const THREE = window.THREE, grp = new THREE.Group(), SEC = 128, sect = new Map(), OFF = [-1.6, -.75, -.3, .2, .55, .9, 1.4];
    const S = k => { let a = sect.get(k); if (!a) sect.set(k, a = { p: [], m: [], i: [], wp: [], wc: [], wi: [] }); return a; };
    let nTri = 0, nTaglio = 0;
    margini().forEach(M => { const P = M.pts;
      for (let k = 0; k < P.length - 1; k++) { const a = P[k], b = P[k + 1], key = Math.floor(a.x / SEC) + ',' + Math.floor(a.y / SEC), A = S(key);
        // la banchina: una striscia di 7 file trasversali
        const base = A.p.length / 3; for (const q of [a, b]) for (const o of OFF) { const x = q.x + q.nx * o, y = q.y + q.ny * o; A.p.push(x, gH(x, y) + .03, y); A.m.push(o, q.sab, q.mare, q.s); }
        for (let r = 0; r < OFF.length - 1; r++) { const i0 = base + r, i1 = base + r + 1, j0 = base + OFF.length + r, j1 = j0 + 1; A.i.push(i0, j0, i1, i1, j0, j1); nTri += 2; }
        // la roccia tagliata dove il monte sale sopra la strada: la parete a strati, sporgente e frastagliata
        if (a.tg > 1.2 && b.tg > 1.2 && a.mare < .2) { nTaglio++; const wb = A.wp.length / 3, ROWS = 5;
          for (const q of [a, b]) { const h0 = gH(q.x + q.nx * 1.1, q.y + q.ny * 1.1), top = Math.max(gH(q.x + q.nx * 3.6, q.y + q.ny * 3.6), gH(q.x + q.nx * 5.5, q.y + q.ny * 5.5)) + .1;
            for (let r = 0; r < ROWS; r++) { const t = r / (ROWS - 1), jag = (fbm(q.s * .7 + r * 3.1, q.x * .1, 611, 2) - .5) * .5, o = 1.1 + t * 2.4 - (r > 0 && r < ROWS - 1 ? .45 + jag : 0), hh = h0 - .15 + (top - h0 + .15) * t + (r > 0 && r < ROWS - 1 ? .15 : 0);
              A.wp.push(q.x + q.nx * o, hh, q.y + q.ny * o); const st = .5 + .5 * Math.sin(hh * 9.8 + fbm(q.s * .3, r, 612, 2) * 4), m = .82 + .22 * fbm(q.s * 1.3, hh * 2, 613, 2), c0 = [.62, .59, .54], c1 = [.5, .48, .44];
              for (let c = 0; c < 3; c++) A.wc.push((c0[c] * st + c1[c] * (1 - st)) * m * (t > .9 ? .9 : 1)); } }
          for (let r = 0; r < ROWS - 1; r++) { const i0 = wb + r, i1 = wb + r + 1, j0 = wb + ROWS + r, j1 = j0 + 1; A.wi.push(i0, i1, j0, i1, j1, j0); } } } });
    sect.forEach(A => { if (A.i.length) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(A.p, 3)); g.setAttribute('aMg', new THREE.Float32BufferAttribute(A.m, 4)); g.setIndex(A.i); g.computeVertexNormals(); g.computeBoundingSphere(); const ms = new THREE.Mesh(g, matMargine()); ms.receiveShadow = true; ms.name = 'riva9b'; grp.add(ms); }
      if (A.wi.length) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(A.wp, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(A.wc, 3)); g.setIndex(A.wi); g.computeVertexNormals(); g.computeBoundingSphere(); const ms = new THREE.Mesh(g, matRoccia()); ms.castShadow = ms.receiveShadow = true; ms.name = 'riva9t'; grp.add(ms); } });
    // i paletti, gli ettometrici, la pietra del km: tre istanze
    const C = cippi(), mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6 }), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), ONE = new THREE.Vector3(1, 1, 1);
    ['paletto', 'etto', 'km'].forEach(k => { const L = C.filter(c => c.k === k); if (!L.length) return; const im = new THREE.InstancedMesh(geoPaletto(k), mat, L.length);
      L.forEach((c, i) => { E.set((h2(Math.round(c.x * 5), Math.round(c.y * 5), 621) - .5) * .08, c.ry, (h2(Math.round(c.x * 5), 1, 622) - .5) * .08); Q.setFromEuler(E); V.set(c.x, gH(c.x, c.y) - .04, c.y); M4.compose(V, Q, ONE); im.setMatrixAt(i, M4); });
      im.instanceMatrix.needsUpdate = true; im.castShadow = true; im.receiveShadow = true; im.name = 'riva9p'; grp.add(im); });
    R.stat.margini = { tri: nTri, taglio: nTaglio, paletti: C.length }; return grp;
  }
  Object.assign(R, { init, inBanda, costruisci, costruisciMargini, tipi, margini, cippi, geoMasso, matRoccia: () => matRoccia(), quota, blocco: (ci, cj) => blocco(ci, cj), quotaNuda, suolo, famT, kindT, CH, SUB, fbm, h2 });
  if (typeof module !== 'undefined') module.exports = R;
  return R;
})();
