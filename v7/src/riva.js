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
  const BANDA = { 1: [-9, 16], 2: [-6, 12], 3: [-5, 9] };   // da quanto in mare a quanto in terra (m dalla riva) si ridisegna
  const SUB = 4, ST = 2 / SUB;   // 4 campioni per casella: mezzo metro
  const R = { on: !SPENTA, W: null, TS: 2, stat: { blocchi: 0, tri: 0, scogli: 0, ciottoli: 0 } };
  let W, GW, GH, VW, TS, T, WL, vD, vQ, vN, tF, tK, dF, cel = new Map();

  function init(w) {
    if (R.W === w) return true; if (!w || !w.inland || !w.quotaRiva || !w.coastKind2) { R.on = false; return false; }
    W = R.W = w; GW = w.GW; GH = w.GH; VW = GW + 1; TS = R.TS = w.TS; T = w.T; WL = w.WL !== undefined ? w.WL : -.45; R.WL = WL;
    vD = new Float32Array(VW * (GH + 1)).fill(NaN); vQ = new Float32Array(VW * (GH + 1)).fill(NaN); vN = new Float32Array(VW * (GH + 1)).fill(-1);
    tF = new Int8Array(GW * GH).fill(-1); tK = new Array(GW * GH); cel = new Map(); vK = null; vS = null;
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
  function nV(i, j) { const k = VI(i, j); let v = vN[k]; if (v < 0) { let m = 8; for (const [a, b] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]) if (a >= 0 && b >= 0 && a < GW && b < GH) m = Math.min(m, dF[b * GW + a]); v = vN[k] = sstep(1.5, 5, m); } return v; }   // 0 accanto alla città, 1 a 10 m
  function famT(tx, ty) { const i = ty * GW + tx; let f = tF[i]; if (f < 0) { const k = W.coastKind2(tx * TS + 1, ty * TS + 1); tK[i] = k; f = tF[i] = FAM[k] || 0; } return f; }
  const kindT = (tx, ty) => (famT(tx, ty), tK[ty * GW + tx]);
  // i tipi ai vertici (2 m), da interpolare: così fra una casella di sabbia e una di scogli la forma passa piano, senza gradino
  // [sabbia, scogli, falesia, duna, cala]
  let vK = null;
  function kV(i, j) { if (!vK) vK = new Float32Array(VW * (GH + 1) * 5).fill(NaN); const k = VI(i, j) * 5; if (vK[k] !== vK[k]) { const kk = W.coastKind2(i * TS, j * TS), f = FAM[kk] || 0;
      vK[k] = f === 1 ? 1 : 0; vK[k + 1] = f === 2 ? 1 : 0; vK[k + 2] = f === 3 ? 1 : 0; vK[k + 3] = kk === 'duna' ? 1 : 0; vK[k + 4] = kk === 'cala' ? 1 : 0; } return k; }
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
      h += .07 * Math.sin(al * 6.2832 / 11 + 6 * n1) * Math.exp(-(((d - 1.7) / 1.5) ** 2));   // le cuspidi
      h += .15 * Math.exp(-(((d - bD) / 1.3) ** 2)) + Math.max(0, d - bD) * .012;           // la berma, poi la retrospiaggia
      if (du > 0) { const A = 1.1 + 1.5 * fbm(x / 40, y / 40, 303, 2), dz = d - (15 + 4 * n1); let dn = A * Math.exp(-dz * dz / (20 + 12 * n1)) * (.5 + .95 * fbm(x / 7, y / 7, 304, 3)); if (fbm(x / 26, y / 26, 306, 2) > .63) dn *= .3; h += dn * du; }   // il cordone, le gobbe, le conche del vento
      h += (fbm(x / 3.1, y / 3.1, 302, 2) - .5) * .05;
      if (q > h + .3) { const L = LAND(1, du, ca), t = Math.max(0, Math.min(1, (d - bD) / Math.max(2, L - bD))); h += (q - h) * t; }   // dietro la spiaggia il terreno sale (la scarpata), piano: dalla berma al bordo della fascia
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
      float n1 = rf9(p * .3), n2 = rf9(p * 1.6 + 3.), g1 = rh9(floor(p * 23.)), g2 = rh9(floor(p * 57.) + 5.);
      vec3 sab = mix(vec3(.63, .57, .46), vec3(.75, .69, .56), n1) * (.95 + (n2 - .5) * .14);
      float an = .55 + (rf9(p * .07) - .5) * 1.4; vec2 dr = vec2(cos(an), sin(an));
      float rip = sin(dot(p, dr) * 48. + rf9(p * .8) * 7.) * (1. - wet) + sin(dot(p, vec2(dr.y, -dr.x)) * 30. + rf9(p * .6 + 9.) * 5.) * wet * .8;
      float sw = 0.; for (int k = 0; k < 3; k++) { float c = .9 + float(k) * .85 + (rn9(p * .13 + float(k) * 7.) - .5) * 1.3; sw = max(sw, 1. - smoothstep(0., .05 + .03 * float(k), abs(d - c))); }
      float wr = smoothstep(.56, .74, rf9(p * 1.9 + 11.)) * (1. - smoothstep(.9, 2.2, abs(d - 5.4 - (rn9(p * .09) - .5) * 3.4)));
      float gu = step(.988, g1) * aaF, gh = smoothstep(.93, 1., g2) * aaF;
      sab *= 1. + (g2 - .5) * .09 * aaF + rip * .03 * aaM;
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
      pr = mix(pr, pr * vec3(.56, .58, .6), wet * .85); pr = mix(pr, pr * .78, sw * wet * aaM * (1. - vRS9.y));
      diffuseColor.rgb = mix(diffuseColor.rgb, pr, rW9);
      rWet9 = wet * rW9;
      rB9 = (rip * .006 * aaM * (1. - vRS9.y) - crk * .05 * vRS9.y - pit * .02 * vRS9.y + (.04 - giu * .05) * vRS9.w * aaL) * rW9;
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
  function formaScoglio(v, f) {
    const key = f + ':' + v; if (FORME[key]) return FORME[key]; const THREE = window.THREE, r = (k) => h2(v * 31 + f, k, 777), parts = [];
    if (f === 3 && v % 2) {   // il masso tondo
      const g = new THREE.IcosahedronGeometry(1, 2), P = g.attributes.position; for (let i = 0; i < P.count; i++) { let x = P.getX(i), y = P.getY(i), z = P.getZ(i); const n = .78 + .38 * fbm(x * 1.3 + v, z * 1.3, 780 + v, 3); x *= n; z *= n * .9; y = y < 0 ? y * .35 : y * .85 * n; P.setXYZ(i, x * .9, (y + .35) / 1.2, z * .9); }
      g.computeVertexNormals(); parts.push(g.toNonIndexed());
    } else {
      const ns = 2 + Math.floor(r(1) * 3); let y0 = 0; const H = [];
      for (let L = 0; L < ns; L++) H.push(.6 + r(10 + L) * .8); const HT = H.reduce((a, b) => a + b, 0);
      for (let L = 0; L < ns; L++) { const th = H[L] / HT, rad = 1 - L * (.12 + r(20 + L) * .14), sh = new THREE.Shape(), N = 9, cx = (r(30 + L) - .5) * .2, cz = (r(40 + L) - .5) * .2;
        for (let k = 0; k < N; k++) { const a = k / N * 6.2832, q = rad * (.78 + .32 * r(50 + L * 10 + k)), px = cx + Math.cos(a) * q, pz = cz + Math.sin(a) * q; k ? sh.lineTo(px, pz) : sh.moveTo(px, pz); }
        const g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(.05, th - .08), bevelEnabled: true, bevelThickness: .04, bevelSize: .07, bevelSegments: 1, curveSegments: 1 });
        g.rotateX(-Math.PI / 2); g.translate(0, y0 + .04, 0); y0 += th; parts.push(g.index ? g.toNonIndexed() : g); }
    }
    // i colori ai vertici: il sopra chiaro, i fianchi scuri, il fondo umido; una macchia per lastra
    const out = parts.map(g => { const P = g.attributes.position, N = g.attributes.normal, c = new Float32Array(P.count * 3); for (let i = 0; i < P.count; i++) { const ny = N.getY(i), y = P.getY(i), t = Math.max(0, ny), m = .84 + .2 * fbm(P.getX(i) * 2.2 + v, P.getZ(i) * 2.2 + y * 3, 790, 2);
        const top = [.72, .69, .63], fia = [.55, .53, .49]; for (let k = 0; k < 3; k++) c[i * 3 + k] = (fia[k] + (top[k] - fia[k]) * t) * m * (.82 + .18 * Math.min(1, y * 2.5)); } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.deleteAttribute('uv'); return g; });
    return (FORME[key] = out);
  }
  let MATR = null, MATC = null;
  function matRoccia() {   // gli scogli: colori ai vertici; sotto il pelo dell'acqua bagnati e verdi, sopra la fascia nera degli spruzzi
    if (MATR) return MATR; const THREE = window.THREE; MATR = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .88, metalness: 0 }); MATR.customProgramCacheKey = () => 'riva9r';
    MATR.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRW9;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvRW9 = (modelMatrix * instanceMatrix0(transformed)).xyz;'.replace('instanceMatrix0(transformed)', 'vec4(transformed, 1.)'));
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vRW9;\nfloat rh9(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\nfloat rn9(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f); return mix(mix(rh9(i), rh9(i + vec2(1., 0.)), f.x), mix(rh9(i + vec2(0., 1.)), rh9(i + 1.), f.x), f.y); }')
        .replace('#include <color_fragment>', `#include <color_fragment>
        { float ab = vRW9.y + .45, n = rn9(vRW9.xz * 2.3 + vRW9.y * 3.) * .6 + rn9(vRW9.xz * 7.1) * .4;
          diffuseColor.rgb *= .9 + n * .2;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.78, .55, .24), smoothstep(.66, .76, rn9(vRW9.xz * 1.1 + 21.) * .7 + n * .3) * smoothstep(1., 1.6, ab) * .5);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.15, .15, .14), (1. - smoothstep(.45, 1., ab)) * smoothstep(.0, .2, ab) * (.5 + .5 * n) * .8);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(.45, .55, .4), 1. - smoothstep(-.1, .1, ab)); }`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(.32, roughnessFactor, smoothstep(.0, .5, vRW9.y + .45));'); };
    return MATR;
  }
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
    if (B.scogli.length) { const P = [], N2 = [], C = [], M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), SC = new THREE.Vector3(), nm = new THREE.Matrix3(), vv = new THREE.Vector3();
      B.scogli.forEach(s => { const F = formaScoglio(s.v, s.f), tl = (h2(Math.round(s.x * 7), Math.round(s.y * 7), 811) - .5) * .12; E.set(tl, s.ry, tl * .6, 'YXZ'); Q.setFromEuler(E); V.set(s.x, s.z, s.y); SC.set(s.r * 1.15, s.h, s.r * .85); M4.compose(V, Q, SC); nm.getNormalMatrix(M4);
        const tint = .9 + h2(Math.round(s.x * 3), Math.round(s.y * 3), 812) * .2;
        F.forEach(g => { const pa = g.attributes.position, na = g.attributes.normal, ca = g.attributes.color; for (let i = 0; i < pa.count; i++) { vv.set(pa.getX(i), pa.getY(i), pa.getZ(i)).applyMatrix4(M4); P.push(vv.x, vv.y, vv.z); vv.set(na.getX(i), na.getY(i), na.getZ(i)).applyMatrix3(nm).normalize(); N2.push(vv.x, vv.y, vv.z); C.push(ca.getX(i) * tint, ca.getY(i) * tint, ca.getZ(i) * tint * .98); } }); });
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N2, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.computeBoundingSphere();
      const ms = new THREE.Mesh(g, matRoccia()); ms.castShadow = ms.receiveShadow = true; ms.name = 'riva9s'; grp.add(ms); tri += P.length / 9; }
    // i ciottoli: un'istanza per sasso, appoggiati sul suolo fine
    if (B.ciottoli.length) { if (!MATC) { MATC = new THREE.MeshStandardMaterial({ roughness: .8, metalness: 0 }); }
      const g = new THREE.IcosahedronGeometry(1, 0), im = new THREE.InstancedMesh(g, MATC, B.ciottoli.length), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), SC = new THREE.Vector3(), Cc = new THREE.Color();
      B.ciottoli.forEach((c, i) => { const h = quota(c.x, c.y); E.set(0, c.ry, 0); Q.setFromEuler(E); V.set(c.x, (h === null ? 0 : h) + c.s * .22, c.y); SC.set(c.s * 1.2, c.s * .5, c.s); M4.compose(V, Q, SC); im.setMatrixAt(i, M4);
        const t = c.t; Cc.setRGB(t < .7 ? .5 + t * .4 : .66, t < .7 ? .48 + t * .38 : .57, t < .7 ? .45 + t * .34 : .45); im.setColorAt(i, Cc); });
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.computeBoundingSphere && im.computeBoundingSphere(); im.receiveShadow = true; im.castShadow = false; im.name = 'riva9c'; grp.add(im); }
    R.stat.blocchi++; R.stat.tri += tri; R.stat.scogli += B.scogli.length; R.stat.ciottoli += B.ciottoli.length; if (typeof window !== 'undefined') window.__riva9 = R.stat;
    return { grp, mat, tri, scogli: B.scogli.length, ciottoli: B.ciottoli.length, dispose() { grp.traverse(o => { if (o.geometry && o.name !== 'riva9c') o.geometry.dispose(); if (o.isInstancedMesh) { o.geometry.dispose(); o.dispose && o.dispose(); } }); mat.dispose(); } };
  }
  Object.assign(R, { init, inBanda, costruisci, tipi, quota, blocco: (ci, cj) => blocco(ci, cj), quotaNuda, suolo, famT, kindT, CH, SUB, fbm, h2 });
  if (typeof module !== 'undefined') module.exports = R;
  return R;
})();
