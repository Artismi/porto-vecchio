/* Porto Vecchio — [pavimenti] Le superfici a terra della città nuova.
   Prima: il suolo era una tela a 8 px per metro (un texel = 12,5 cm), coi motivi che si ripetevano ogni 16 m; da vicino sfocato e a
   scalini, i giunti dei basoli larghi come un dito. Qui la tela resta per il COLORE (la tinta di fondo, le macchie larghe, i segni
   dipinti: tombini, gesso, olio), ma i suoi motivi si sfumano (piatto) e il disegno delle pietre lo fa lo shader del suolo, al pixel
   vero e a scala mondo:
   1. una MAPPA per blocco (64 m), a mezzo metro: che materiale c'è (della via e del suolo sotto), e per le vie le coordinate lungo e
      attraverso la via (s, v), la direzione e la mezza larghezza. Nel frammento il punto si ricava dal texel più vicino più lo
      spostamento ruotato: le file dei basoli seguono la via anche in curva, senza cuciture;
   2. una seconda mappa a 25 cm, filtrata: quanto il punto è vicino a un muro (sporco, muschio nei giunti), l'umido della riva e
      l'OMBRA DI CONTATTO degli oggetti posati (panchine, banchi, fioriere, casse: la macchia morbida sotto, fusa nel suolo);
   3. i materiali: basoli del borgo, travertino, porfido, asfalto, banchina, terra battuta, sabbia, lastre del marciapiede col cordolo
      di granito. Stessa scala di dettaglio (giunto 1-1,5 cm, smusso 4-6 cm), la stessa tavolozza calda; i giunti e gli smussi piegano
      la normale (la luce radente li fa leggere), da lontano il disegno sfuma nel suo valore medio (niente sfarfallio).
   Nessuna mesh in più: cambia solo il materiale del suolo e dei marciapiedi (stesse draw call). ?nopavimenti: com'era. */
var Pavimenti = (function () {
  'use strict';
  const ON = !/[?&]nopavimenti\b/.test(typeof location !== 'undefined' ? location.search : '');
  const STRADE = ON && !/[?&]vecchiastrada\b/.test(typeof location !== 'undefined' ? location.search : '');   // [strade] l'asfalto vissuto, le finiture, la vernice; ?vecchiastrada per confrontare
  // i materiali (numero nella mappa); 0 = nessun disegno (prato, roccia, acqua: restano come sono)
  const FAM = { basoli: 1, travertino: 2, porfido: 3, asfalto: 4, banchina: 5, terra: 6, sabbia: 7, spianata: 8, lastre: 9, piazza: 2 };
  let A = null;                               // le funzioni di render.js (init)
  const RID = 4, RMK = 8;                     // texel per casella (2 m): mappa dei materiali a 50 cm, maschere a 25 cm
  const BLK = new Map();                      // blocco 'ci,cj' -> { id, mk, box, res }
  const OMB = new Map();                      // ombre di contatto per blocco: [x, z, rx, rz, forza]
  const MIS = [];                             // la misura dei piedi: [nome, x, z, piede - suolo]
  let dirtyT = null; const DIRTY = new Set();

  function init(api) { A = api; if (api.phone && !/[?&]pavalta\b/.test(typeof location !== 'undefined' ? location.search : '')) QUAL.v = 'leggera'; }   // sul telefono parte leggera
  const attivo = () => ON && !!A && A.cn1();
  const strade = () => STRADE && attivo();

  // ---------------- 1. LA TELA SFUMATA: il motivo dipinto diventa tinta (resta il colore, le macchie larghe) ----------------
  // sfocatura a scatola, tre passate, periodica sul lato della tela (le tele sono motivi che si ripetono)
  const PIA = new Map();
  const ASF = { value: new THREE.Vector3(.17, .165, .16) };   // la tinta comune dell'asfalto (la media della sua tela): tutte le vie la stessa
  function piatto(c, ppm, metri, kind) {
    if (!ON) return c; const k = c; if (PIA.has(k)) return PIA.get(k);
    const W = c.width, H = c.height, x = c.getContext('2d'), id = x.getImageData(0, 0, W, H), d = id.data, r = Math.max(1, Math.round((metri || .5) * ppm));
    const a = new Float32Array(W * H * 3); for (let i = 0; i < W * H; i++) { a[i * 3] = d[i * 4]; a[i * 3 + 1] = d[i * 4 + 1]; a[i * 3 + 2] = d[i * 4 + 2]; }
    const b = new Float32Array(a.length), n = 2 * r + 1;
    const pass = (src, dst, horiz) => { const L = horiz ? W : H, M = horiz ? H : W;
      for (let m = 0; m < M; m++) for (let ch = 0; ch < 3; ch++) { const at = l => ((horiz ? m * W + ((l % W) + W) % W : (((l % H) + H) % H) * W + m) * 3 + ch); let s = 0; for (let l = -r; l <= r; l++) s += src[at(l)];
        for (let l = 0; l < L; l++) { dst[at(l)] = s / n; s += src[at(l + r + 1)] - src[at(l - r)]; } } };
    for (let it = 0; it < 3; it++) { pass(a, b, true); pass(b, a, false); }
    // le macchie larghe della tela (sporco, olio, pozze asciutte) a metà forza: la variazione la danno i rumori lenti dello shader
    const mu = [0, 0, 0]; for (let i = 0; i < W * H; i++) for (let c = 0; c < 3; c++) mu[c] += a[i * 3 + c] / (W * H);
    for (let i = 0; i < W * H; i++) for (let c = 0; c < 3; c++) a[i * 3 + c] = mu[c] + (a[i * 3 + c] - mu[c]) * .5;
    if (kind === 'asfalto') ASF.value.set(mu[0] / 255, mu[1] / 255, mu[2] / 255);
    const o = document.createElement('canvas'); o.width = W; o.height = H; const ox = o.getContext('2d'), od = ox.createImageData(W, H);
    for (let i = 0; i < W * H; i++) { od.data[i * 4] = a[i * 3]; od.data[i * 4 + 1] = a[i * 3 + 1]; od.data[i * 4 + 2] = a[i * 3 + 2]; od.data[i * 4 + 3] = 255; }
    ox.putImageData(od, 0, 0); PIA.set(k, o); return o;
  }

  // ---------------- 2. LE MAPPE DEL BLOCCO ----------------
  function famSuolo(tx, ty, px, pz) {
    const G = A.G, T = G.T, v = A.gT(tx, ty), z = A.zoneT(tx, ty);
    if (z === A.ZN.CITTA && v === T.COB && vicinoSabbia(tx, ty)) return FAM.lastre;   // il terrapieno davanti alle case sulla spiaggia (costa): il lungomare di lastre
    if (z === A.ZN.CITTA && (v === T.COB || v === T.PIAZZA || v === T.DIRT || v === T.VIA || v === T.WALK)) { const k = (px !== undefined && A.suoloW && A.suoloK(tx, ty) ? A.suoloW(px, pz) : null) || A.suoloK(tx, ty); if (k) return FAM[k] || 0; }   // il punto, col confine organico come sulla tela
    if (v === T.QUAY) return FAM.banchina; if (v === T.SAND) return FAM.sabbia; if (v === T.PIAZZA) return FAM.piazza;
    if (v === T.DIRT || v === T.GRAVEL) return FAM.terra; if (v === T.VIA || v === T.COB) return FAM.asfalto;
    return 0;
  }
  // una casella di città entro tre caselle dalla sabbia (in memoria per casella)
  const VS = new Map();
  function vicinoSabbia(tx, ty) { const k = tx * 8192 + ty; if (VS.has(k)) return VS.get(k); const T = A.G.T; let r = false; for (let b = -3; b <= 3 && !r; b++) for (let a = -3; a <= 3; a++) if (A.gT(tx + a, ty + b) === T.SAND) { r = true; break; } VS.set(k, r); return r; }
  // [pavimenti] le vie che si interrompono: due capi di via di città vicini (entro 30 m), quasi allineati, con fra loro solo suolo
  // fatto (selciato, banchina, strada: niente case né acqua), si cuciono con un tratto finto, solo per il disegno del suolo
  let VIE = null; const CUCITE = [];
  function vieTutte(B) {   // B: { roads, gT, TS, T, geo1 } quando la chiede render.js prima di init (i marciapiedi)
    if (VIE) return VIE; B = B || { roads: A.M.roads, gT: A.gT, TS: A.TS, T: A.G.T, geo1: A.geo1 };
    const R = (B.roads || []).filter(rd => rd.pts && rd.pts.length > 1), T = B.T, TS = B.TS, out = R.slice(), gT = B.gT;
    const capi = []; R.forEach(rd => { if (rd.kind === 'vicolo' || rd.kind === 'sterrato') return; const P = rd.pts, n = P.length;
      [[0, 1], [n - 1, n - 2]].forEach(([a, b]) => { const dx = P[a][0] - P[b][0], dz = P[a][1] - P[b][1], L = Math.hypot(dx, dz) || 1; capi.push({ rd, x: P[a][0], z: P[a][1], ux: dx / L, uz: dz / L, fine: a > 0 }); }); });
    const toccata = c => R.some(o => o !== c.rd && o.pts.some(q => Math.hypot(q[0] - c.x, q[1] - c.z) < o.w / 2 + 1));   // il capo entra già in un'altra via
    const usati = new Set();
    capi.forEach(a => { if (usati.has(a) || toccata(a)) return; let best = null, bd = 30;
      capi.forEach(b => { if (b === a || b.rd === a.rd || usati.has(b)) return;   /* l'altro capo può stare in un incrocio */ const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz); if (d < 2 || d >= bd) return;
        if ((dx * a.ux + dz * a.uz) / d < .85 || (-dx * b.ux - dz * b.uz) / d < .85) return;   // l'uno davanti all'altro
        for (let t = .5; t < d; t += .5) { const v = gT(Math.floor((a.x + dx * t / d) / TS), Math.floor((a.z + dz * t / d) / TS)); if (v === T.BLD || v === T.WATER) return; }
        best = b; bd = d; });
      if (!best) return; usati.add(a); usati.add(best);
      const g0 = B.geo1(a.rd), s0 = a.fine ? g0.s[g0.n - 1] : -bd, w = Math.min(a.rd.w, best.rd.w), pts = a.fine ? [[a.x, a.z], [best.x, best.z]] : [[best.x, best.z], [a.x, a.z]];
      const cu = { id: 'cucita_' + a.rd.id + '_' + best.rd.id, kind: a.rd.kind, era: a.rd.era, w, pts, __g: { s: [s0, s0 + bd], n: 2 } }; out.push(cu); CUCITE.push([cu.id, Math.round(bd), pts.map(q => q.map(Math.round))]); });
    return (VIE = out);
  }
  let FIN = null; const finit = () => FIN || (FIN = A.finiture());   // la lista delle finiture (render.js segniList1), una volta sola
  const famVia = rd => rd.kind === 'vicolo' ? FAM.basoli : rd.kind === 'sterrato' ? FAM.terra : rd.era === 'E3' ? FAM.porfido : rd.era === 'E4' ? FAM.travertino : FAM.asfalto;
  function mappe(tx0, ty0, n, m) {
    const TS = A.TS, X0 = tx0 * TS, Z0 = ty0 * TS, NI = n * RID, MJ = m * RID, q = TS / RID, G = A.G, T = G.T;
    const I = new Float32Array(NI * MJ * 4), I2 = new Float32Array(NI * MJ * 4), K1 = new Float32Array(NI * MJ).fill(1e9), K2 = new Float32Array(NI * MJ).fill(1e9), S2 = new Float32Array(NI * MJ).fill(9), R1 = new Int32Array(NI * MJ).fill(-1), R2 = new Int32Array(NI * MJ).fill(-1);
    // le vie: per ogni tratto i texel entro la mezza larghezza più il marciapiede. Ogni texel ricorda due vie (agli incroci): la prima è
    // quella dipinta sopra se il texel ci sta dentro (asfalto > travertino > porfido > basoli > terra, come strade1Era), se no la più vicina
    // la sabbia vicina (0-15): entro 4 m da una casella di sabbia, per la sabbia portata dal vento sull'asfalto
    const sab = (px, pz) => { const tx = Math.floor(px / TS), ty = Math.floor(pz / TS); if (A.zoneT(tx, ty) !== A.ZN.CITTA) return 0; let d = 9;   // fuori città le lingue di sabbia sulle costiere le fa la costa (riva.js)
      for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) { if (A.gT(tx + a, ty + b) !== T.SAND) continue; const x0 = (tx + a) * TS, z0 = (ty + b) * TS; d = Math.min(d, Math.hypot(Math.max(x0 - px, 0, px - x0 - TS), Math.max(z0 - pz, 0, pz - z0 - TS))); } return d >= 4 ? 0 : Math.round(15 * (1 - d / 4)); };
    const PR = { 4: 5, 2: 4, 3: 3, 1: 2, 6: 1 }, put = (A4, kk, s0, v, th, f, hw) => { A4[kk * 4] = s0; A4[kk * 4 + 1] = v; A4[kk * 4 + 2] = th; A4[kk * 4 + 3] = f + 256 * Math.min(127, Math.round(hw * 8)); };
    vieTutte().forEach((rd, ri) => { const P = rd.pts; if (!P || P.length < 2) return; const hw = rd.w / 2, ext = hw + 2.8, g = rd.__g || A.geo1(rd), f = famVia(rd), pr = PR[f] || 1;
      for (let k = 0; k < P.length - 1; k++) { const [ax, az] = P[k], [bx, bz] = P[k + 1], L = Math.hypot(bx - ax, bz - az); if (L < 1e-4) continue;
        if (Math.max(ax, bx) < X0 - ext || Math.min(ax, bx) > X0 + n * TS + ext || Math.max(az, bz) < Z0 - ext || Math.min(az, bz) > Z0 + m * TS + ext) continue;
        const ux = (bx - ax) / L, uz = (bz - az) / L, th = Math.atan2(uz, ux);
        const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - ext - X0) / q)), i1 = Math.min(NI - 1, Math.ceil((Math.max(ax, bx) + ext - X0) / q));
        const j0 = Math.max(0, Math.floor((Math.min(az, bz) - ext - Z0) / q)), j1 = Math.min(MJ - 1, Math.ceil((Math.max(az, bz) + ext - Z0) / q));
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const px = X0 + (i + .5) * q, pz = Z0 + (j + .5) * q, dx = px - ax, dz = pz - az, t = dx * ux + dz * uz;
          if (t < -.6 || t > L + .6) continue; const v = ux * dz - uz * dx, sc = Math.abs(v) - hw; if (Math.abs(v) > ext) continue;
          const kk = j * NI + i, key = sc < 0 ? sc - pr * 100 : sc, s0 = g.s[k] + t;
          if (R1[kk] === ri) { if (key < K1[kk]) { K1[kk] = key; put(I, kk, s0, v, th, f, hw); } continue; }
          if (R2[kk] === ri) { if (key < K2[kk]) { K2[kk] = key; S2[kk] = sc; put(I2, kk, s0, v, th, f, hw); } }
          else if (key < K1[kk]) { if (R1[kk] >= 0) { K2[kk] = K1[kk]; R2[kk] = R1[kk]; S2[kk] = 0; I2.set(I.subarray(kk * 4, kk * 4 + 4), kk * 4); const o = I2[kk * 4 + 3] % 256; S2[kk] = Math.abs(I2[kk * 4 + 1]) - Math.floor(I2[kk * 4 + 3] / 256) / 8; }
            K1[kk] = key; R1[kk] = ri; put(I, kk, s0, v, th, f, hw); continue; }
          else if (key < K2[kk]) { K2[kk] = key; R2[kk] = ri; S2[kk] = sc; put(I2, kk, s0, v, th, f, hw); continue; }
          if (K2[kk] < K1[kk]) { const a = I.slice(kk * 4, kk * 4 + 4); I.set(I2.subarray(kk * 4, kk * 4 + 4), kk * 4); I2.set(a, kk * 4); [K1[kk], K2[kk]] = [K2[kk], K1[kk]]; [R1[kk], R2[kk]] = [R2[kk], R1[kk]]; S2[kk] = Math.abs(I2[kk * 4 + 1]) - Math.floor(I2[kk * 4 + 3] / 256) / 8; } } } });
    for (let j = 0; j < MJ; j++) for (let i = 0; i < NI; i++) { const kk = j * NI + i, tx = tx0 + Math.floor(i / RID), ty = ty0 + Math.floor(j / RID), two = R2[kk] >= 0 && S2[kk] < .9;
      if (R1[kk] < 0) I[kk * 4 + 3] = 0; if (!two) I2.fill(0, kk * 4, kk * 4 + 4);
      I[kk * 4 + 3] += 16 * famSuolo(tx, ty, X0 + (i + .5) * q, Z0 + (j + .5) * q) + (two ? 32768 : 0) + 65536 * sab(X0 + (i + .5) * q, Z0 + (j + .5) * q); }
    const tex = A4 => { const t = new THREE.DataTexture(A4, NI, MJ, THREE.RGBAFormat, THREE.FloatType); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; return t; };
    const id = tex(I), id2 = tex(I2);
    // [strade] le finiture: per ogni texel la cosa più importante che lo tocca (tombino, chiusino, caditoia, pozzetto, rattoppo, olio,
    // gomma), col centro, l'angolo e le misure: lo shader le disegna nitide al pixel, senza geometria
    const FI = new Float32Array(NI * MJ * 4), FP = new Uint8Array(NI * MJ);
    if (strade() && A.finiture) { const RAG = { 1: .5, 2: .5, 3: .56, 4: .42, 5: 1.3, 7: 6.5 }, PRI = { 1: 9, 2: 9, 3: 8, 4: 7, 6: 5, 5: 3, 7: 2 };
      finit().forEach(([x, z, a, t, sd, len, wid]) => { const r = t === 6 ? Math.hypot(len, wid) / 2 + .2 : RAG[t]; if (x < X0 - r || x > X0 + n * TS + r || z < Z0 - r || z > Z0 + m * TS + r) return;
        const i0 = Math.max(0, Math.floor((x - r - X0) / q)), i1 = Math.min(NI - 1, Math.floor((x + r - X0) / q)), j0 = Math.max(0, Math.floor((z - r - Z0) / q)), j1 = Math.min(MJ - 1, Math.floor((z + r - Z0) / q));
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const kk = j * NI + i, px = X0 + (i + .5) * q, pz = Z0 + (j + .5) * q; if (Math.hypot(px - x, pz - z) > r + .36) continue; if (FP[kk] > PRI[t]) continue;
          FP[kk] = PRI[t]; FI[kk * 4] = x; FI[kk * 4 + 1] = z; FI[kk * 4 + 2] = a; FI[kk * 4 + 3] = t + 16 * Math.min(255, Math.round((len || 0) * 10)) + 4096 * Math.min(255, Math.round((wid || 0) * 10)); } }); }
    const fi = tex(FI);
    // le maschere: R muro vicino, G umido della riva, B ombra di contatto, A il raccordo al piede del muro
    const NI2 = n * RMK, MJ2 = m * RMK, q2 = TS / RMK, K = new Uint8Array(NI2 * MJ2 * 4), BLD = (tx, ty) => tx >= 0 && ty >= 0 && tx < G.GW && ty < G.GH && A.gT(tx, ty) === T.BLD;
    const NB = n + 4, near = new Uint8Array(NB * (m + 4)); for (let ty = -2; ty <= m + 1; ty++) for (let tx = -2; tx <= n + 1; tx++) near[(ty + 2) * NB + tx + 2] = BLD(tx0 + tx, ty0 + ty) ? 1 : 0;
    const wetT = new Float32Array(n * 2 * m * 2);   // l'umido a 1 m: la distanza dalla riva costa
    for (let j = 0; j < m * 2; j++) for (let i = 0; i < n * 2; i++) { const tx = tx0 + (i >> 1), ty = ty0 + (j >> 1), v = A.gT(tx, ty); wetT[j * n * 2 + i] = v === T.SAND || v === T.QUAY || v === T.PIER || v === T.ROCK ? A.coastIn(X0 + i + .5, Z0 + j + .5) : 99; }
    for (let j = 0; j < MJ2; j++) for (let i = 0; i < NI2; i++) { const px = X0 + (i + .5) * q2, pz = Z0 + (j + .5) * q2, lx = Math.floor(i / RMK), ly = Math.floor(j / RMK), o = (j * NI2 + i) * 4;
      let dw = 9; for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) { if (!near[(ly + b + 2) * NB + lx + a + 2]) continue; const x0 = (tx0 + lx + a) * TS, z0 = (ty0 + ly + b) * TS, ddx = Math.max(x0 - px, 0, px - x0 - TS), ddz = Math.max(z0 - pz, 0, pz - z0 - TS); dw = Math.min(dw, Math.hypot(ddx, ddz)); }
      const w2 = Math.max(0, 1 - dw / .32); K[o] = Math.round(255 * Math.max(0, 1 - dw / 3.5));   // R: la distanza dal muro (0-3,5 m) K[o + 3] = Math.round(255 * w2 * w2);   // A: il raccordo, la riga scura proprio al piede
      const ci = wetT[(j >> 2) * n * 2 + (i >> 2)], wr = A.gT(tx0 + lx, ty0 + ly) === T.SAND ? 4 : 1.3; K[o + 1] = ci < wr ? Math.round(255 * Math.max(0, Math.min(1, 1 - ci / wr))) : 0; }   // la sabbia bagnata larga, la banchina solo sul ciglio
    (OMB.get(tx0 / 32 + ',' + ty0 / 32) || []).forEach(([cx, cz, rx, rz, f]) => {   // le ombre di contatto: un ovale sfumato più largo dell'impronta
      const ex = rx * 1.18 + .16, ez = rz * 1.18 + .16, i0 = Math.max(0, Math.floor((cx - ex - X0) / q2)), i1 = Math.min(NI2 - 1, Math.ceil((cx + ex - X0) / q2)), j0 = Math.max(0, Math.floor((cz - ez - Z0) / q2)), j1 = Math.min(MJ2 - 1, Math.ceil((cz + ez - Z0) / q2));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const dx = (X0 + (i + .5) * q2 - cx) / ex, dz = (Z0 + (j + .5) * q2 - cz) / ez, r = Math.hypot(dx, dz); if (r >= 1) continue;
        const o = (j * NI2 + i) * 4 + 2, t = 1 - r, v = Math.round(255 * f * t * t * (3 - 2 * t)); if (v > K[o]) K[o] = v; } });
    const mk = new THREE.DataTexture(K, NI2, MJ2, THREE.RGBAFormat, THREE.UnsignedByteType); mk.magFilter = mk.minFilter = THREE.LinearFilter; mk.generateMipmaps = false; mk.needsUpdate = true;
    return { id, id2, fi, mk, box: new THREE.Vector4(X0, Z0, n * TS, m * TS), res: new THREE.Vector2(NI, MJ) };
  }

  // ---------------- 3. LO SHADER ----------------
  const GLSL_FN = `
    uniform sampler2D pvNz;
    float pvH(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    vec2 pvH2(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
    float pvN(vec2 p){ return texture2D(pvNz, p * (1. / 256.)).r; }   // il rumore di valore da una lettura (256 celle a caso, filtrate, ripetute ogni 256): non quattro hash
    float pvLum(vec3 c){ return dot(c, vec3(.3, .59, .11)); }
    float pvG(float x){ return exp(-x * x); }
    // file di pietre: q.x lungo la fila, q.y attraverso; rw la fila, l0-l1 la lunghezza (per fila), i giunti sfalsati a caso.
    // x: distanza dal giunto più vicino, y: la pietra (0-1), zw: verso il giunto più vicino (spazio q)
    float pvJ(float c, float row, float L, float sd){ return c * L + (pvH(vec2(c, row * 1.37 + sd)) - .5) * L * .6; }
    vec4 pvFile(vec2 q, float rw, float l0, float l1, float sd){
      float row = floor(q.y / rw), fy = q.y - row * rw, L = mix(l0, l1, pvH(vec2(row, sd)));
      float u = q.x + pvH(vec2(row, sd + 7.)) * L * 3., c = floor(u / L), a = pvJ(c, row, L, sd), b = pvJ(c + 1., row, L, sd);
      if (u < a) { b = a; c -= 1.; a = pvJ(c, row, L, sd); } else if (u > b) { a = b; c += 1.; b = pvJ(c + 1., row, L, sd); }
      float ex = min(u - a, b - u), ey = min(fy, rw - fy);
      vec2 dir = ex < ey ? vec2(u - a < b - u ? -1. : 1., 0.) : vec2(0., fy < rw - fy ? -1. : 1.);
      return vec4(min(ex, ey), pvH(vec2(c, row) + sd * 3.1), dir);
    }
    // sassi (porfido, ciottoli, ghiaia): x = distanza dal giunto (circa, in celle), y = il sasso, zw = dal centro del sasso
    vec4 pvSassi(vec2 p, float jit){
      vec2 i = floor(p), f = fract(p); float d1 = 8., d2 = 8.; vec2 c1 = vec2(0.), id = vec2(0.);
      for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)), o = g + .5 + (pvH2(i + g) - .5) * jit, r = o - f; float d = dot(r, r);
        if (d < d1) { d2 = d1; d1 = d; c1 = r; id = i + g; } else if (d < d2) d2 = d; }
      return vec4((sqrt(d2) - sqrt(d1)) * .5, pvH(id), -c1);
    }
    vec2 pvRot(vec2 p, float a){ float c = cos(a), s = sin(a); return vec2(c * p.x + s * p.y, -s * p.x + c * p.y); }
    // [strade] le crepe a ragnatela (pelle di coccodrillo): i bordi di celle da 22 cm, sottili; a scala mondo (la vernice le legge uguali)
    float pvRagno(vec2 p, float mpp){ vec4 S = pvSassi(p / .22, .9); return 1. - smoothstep(.0035, .0035 + mpp * 1.1, S.x * .22); }
`;
  const GLSL = GLSL_FN + `
    uniform sampler2D pvId; uniform sampler2D pvId2; uniform sampler2D pvFi; uniform float pvStr; uniform float pvDbg; uniform sampler2D pvMk; uniform vec4 pvBox; uniform vec2 pvRes; uniform float pvHas; uniform float pvForza; uniform float pvForce; uniform vec3 pvAsf;
    varying vec3 vPw;
    #ifdef PV_LITE
    #define PV_K 1
    #else
    #define PV_K 8
    #endif
    vec2 pvTilt; float pvWet; float pvPol; float pvSab;
    // il disegno: rende il colore, riempie pvTilt (la normale piegata, nel piano xz del mondo), pvWet, pvPol
    vec3 pvDett(vec3 base, vec2 p, vec3 blur){
      pvTilt = vec2(0.); pvWet = 0.; pvPol = 0.; pvSab = 0.;
      vec2 fw = fwidth(p); float mpp = max(max(fw.x, fw.y), 1e-4);                   // metri per pixel
      #ifdef PV_LITE
      float lod = 1. - smoothstep(.04, .12, mpp), fin = 0., aa = mpp * 1.2;   // leggera: si spegne prima, niente grana fine
      #else
      float lod = 1. - smoothstep(.07, .2, mpp), fin = 1. - smoothstep(.01, .035, mpp),   // pieno fino allo zoom del gioco (5-6 cm a pixel), sfuma solo dalla città intera in su
            aa = mpp * 1.2;
      #endif   // giunti morbidi: il quadro non ha antialiasing e il post affila
      if (lod <= 0.) return base * (.95 + pvN(p * .045) * .08);
      vec2 uv = (p - pvBox.xy) / pvBox.zw; vec4 I = vec4(0.), K = vec4(0.);
      float rf = 0., hw = 0., s = 0., v = 0., best = 1e9, scA = 9., sec = 9., gW = 0., gfN = 0., gB = 0.; vec2 du = vec2(1., 0.);   // sec: quanto si è fuori dall'altra via (incroci); gW: il suolo del texel vicino, interpolato
      if (pvHas > .5) { I = texture2D(pvId, uv); K = texture2D(pvMk, uv); gfN = mod(floor(I.a / 16.), 16.); gB = gfN;
        // la via: fra i quattro texel attorno, misurata nel punto (confine liscio, non a gradini). Se il punto sta dentro più vie vince
        // quella che sulla tela è dipinta sopra (l'asfalto sul travertino sul porfido sui basoli dei vicoli, come strade1Era), fuori la più vicina
        #ifdef PV_LITE
        vec2 tb = floor(uv * pvRes - .5) + step(.5, fract(uv * pvRes - .5)), fb = vec2(0.); bool due = false;   // leggera: il texel più vicino, una lettura sola
        #else
        vec2 tb = floor(uv * pvRes - .5), fb = fract(uv * pvRes - .5); bool due = false;
        #endif
        for (int k = 0; k < PV_K; k++) { if (k == 4 && !due) break;   // leggera: solo la prima via di ogni texel
          vec2 tc = (tb + vec2(float(k - (k / 2) * 2 - (k / 4) * 2), float(k / 2 - (k / 4) * 2)) + .5) / pvRes;
          vec4 J = k < 4 ? texture2D(pvId, tc) : texture2D(pvId2, tc); if (k < 4 && mod(floor(J.a / 32768.), 2.) > .5) due = true;
          if (k < 4) pvSab += floor(J.a / 65536.) / 15. * (k - (k / 2) * 2 == 1 ? fb.x : 1. - fb.x) * (k / 2 == 1 ? fb.y : 1. - fb.y);   /* la sabbia vicina, interpolata */
          if (k < 4) { float g0 = mod(floor(J.a / 16.), 16.), wk = PV_K == 1 ? 1. : (k - (k / 2) * 2 == 1 ? fb.x : 1. - fb.x) * (k / 2 == 1 ? fb.y : 1. - fb.y); if (abs(g0 - gfN) < .5) gW += wk; else gB = g0; }
          float r0 = mod(J.a, 16.); if (r0 < .5) continue;
          float h0 = mod(floor(J.a / 256.), 128.) / 8.; vec2 dd = p - (pvBox.xy + tc * pvBox.zw), u0 = vec2(cos(J.b), sin(J.b)); float v0 = J.g + (u0.x * dd.y - u0.y * dd.x), sc = abs(v0) - h0;
          float pr = r0 > 3.5 && r0 < 4.5 ? 5. : r0 > 1.5 && r0 < 2.5 ? 4. : r0 > 2.5 && r0 < 3.5 ? 3. : r0 < 1.5 ? 2. : 1.; sc = sc < 0. ? sc - pr * 100. : sc;
          if (k >= 4) sec = min(sec, abs(v0) - h0);   // l'altra via: dentro (negativo) o quanto fuori
          if (r0 > 3.5 && r0 < 4.5) scA = min(scA, abs(v0) - h0);   // [strade] quanto si è fuori dall'asfalto più vicino
          if (sc < best) { best = sc; s = J.r + dot(dd, u0); v = v0; du = u0; rf = r0; hw = h0; } } }
      // il suolo sotto: cambia dove la vicinanza interpolata passa la metà (la linea, non il texel) e lì corre una fila di cubetti scuri
      float gf = gW >= .5 || pvHas < .5 ? gfN : gB, av = abs(v), bord = abs(gB - gfN) > .5 && gfN > .5 && gB > .5 ? 1. - smoothstep(.24, .32 + aa * 2., abs(gW - .5)) : 0.;
      float jf = smoothstep(-.3, 1.2, sec);   // agli incroci le corsie, l'olio e la canaletta sfumano invece di tagliarsi
      bool via = rf > 0. && av < hw;
      float fam = pvForce > 0. ? pvForce : via ? rf : gf;
      if (fam < .5) return base;
      // coordinate del disegno: lungo e attraverso la via, o il mondo ruotato
      bool lungo = rf > 0. && (av < hw || (pvForce > 0. && av < hw + 3.));   // le coordinate della via solo sulla carreggiata (e sul marciapiede): fuori il mondo, niente cuciture a 3 m
      vec2 q = lungo ? vec2(s, v + hw) : pvRot(p, .6 + fam * .37), ux = lungo ? du : vec2(cos(.6 + fam * .37), sin(.6 + fam * .37)), uy = vec2(-ux.y, ux.x);
      vec3 col = base; float jt = 0., bv = 0., jw = .012; vec2 tq = vec2(0.); float tone = 1., mean = 1.;
      if (fam < 1.5 || (fam > 1.5 && fam < 2.5) || (fam > 4.5 && fam < 5.5) || fam > 8.5) {   // pietre a file: basoli, travertino, banchina, lastre
        float rw = fam < 1.5 ? .52 : fam < 2.5 ? .9 : fam < 5.5 ? 1.2 : .5, l0 = fam < 1.5 ? .6 : fam < 2.5 ? 1.1 : fam < 5.5 ? 1.6 : .45, l1 = fam < 1.5 ? 1.05 : fam < 2.5 ? 1.8 : fam < 5.5 ? 2.6 : .8;
        float bev = fam < 1.5 ? .06 : fam < 2.5 ? .035 : fam < 5.5 ? .07 : .025, wob = fam < 1.5 ? .05 : .012;
        vec2 qq = q; bool cord = fam > 8.5 && lungo && pvForce > 0. && v + hw > hw * 2. - .02 && v + hw < hw * 2. + .3;   // il cordolo di granito sul ciglio del marciapiede
        if (cord) { rw = .3; l0 = .8; l1 = 1.4; bev = .03; qq.y -= hw * 2.; qq.y = clamp(qq.y, .001, .299); }
        else if (fam > 8.5 && lungo) qq.y -= hw * 2. + .3;
        #ifndef PV_LITE
        qq += (vec2(pvN(q * 2.3), pvN(q * 2.3 + 9.)) - .5) * wob;
        #endif
        vec4 F = pvFile(qq, rw, l0, l1, fam * 11. + (cord ? 5. : 0.));
        jw = fam > 4.5 && fam < 5.5 ? .016 : fam > 8.5 ? .008 : .012;
        float jwE = max(jw, mpp * .5); jt = (1. - smoothstep(jwE - aa, jwE + aa, F.x)) * sqrt(jw / jwE); bv = 1. - smoothstep(jw, jw + bev, F.x); tq = F.zw * bv;
        float h = F.y;
        if (pvStr > .5 && fam < 1.5 && lungo && rf < 1.5 && av < .2) {   // [strade] la cunetta di pietra in mezzo al vicolo: due file di pietre più scure e lisce, l'acqua che ci corre
          vec4 Fc = pvFile(vec2(s, v + .2), .2, .25, .45, 61.); F = Fc; bv = 1. - smoothstep(jw, jw + .02, F.x); tq = F.zw * bv * .5; jt = 1. - smoothstep(jw - aa, jw + aa, F.x); h = F.y * .5;
          pvWet = max(pvWet, .35 * (1. - smoothstep(.0, .2, av))); col *= .86; }
        if (fam < 1.5) { float lava = step(.94, h); tone = mix(.86 + h * .26, .7, lava); col *= mix(vec3(1.03, 1., .95), vec3(.9, .86, .84), lava); }   // calcare caldo, qualche basolo di lava
        else if (fam < 2.5) { tone = .9 + h * .19;
          #ifndef PV_LITE
          float pore = smoothstep(.78, .86, pvN(p * vec2(34., 9.) + h * 40.)) * fin; tone -= pore * .18;
          #endif
          if (!lungo) {   // le piazze di travertino: le fasce di pietra scura ogni 6 m, il disegno del regime (allineate alle file)
            vec2 g6 = abs(fract(q / 6. + .5) - .5) * 6.; float fa = 1. - smoothstep(.3 - aa, .3 + aa, min(g6.x, g6.y));
            tone = mix(tone, .7 + h * .08, fa); col = mix(col, col * vec3(.94, .95, 1.), fa);
            float fj = 1. - smoothstep(.012 - aa, .012 + aa, abs(min(g6.x, g6.y) - .3)); jt = max(jt, fj); } }
        else if (fam < 5.5) { tone = .86 + h * .2; tone += (pvH(floor(p * 70.)) - .5) * .16 * fin; }
        else { tone = cord ? 1.16 + h * .08 : .93 + h * .1; if (cord) col *= vec3(.97, .99, 1.03); }
        tone += (pvN(p * 7.) - .5) * .08;
        #ifndef PV_LITE
        tone += (pvN(p * 23.) - .5) * .06 * fin;
        #endif
        mean = 1. - (jw * 2. / rw) * .5;
      } else if (fam < 3.5) {   // porfido a coda di pavone: cubetti di 11 cm su file ad arco (archi di 1,6 m), rosso-viola e grigio
        float A = 1.6, u = fract(q.x / A) - .5; vec2 qa = vec2(q.x, q.y + u * u * A * .7);
        #ifndef PV_LITE
        qa += (vec2(pvN(q * 9.), pvN(q * 9. + 4.)) - .5) * .012;
        #endif
        vec4 F = pvFile(qa, .11, .09, .13, 31.); float jwE = max(.009, mpp * .5);
        jt = (1. - smoothstep(jwE - aa, jwE + aa, F.x)) * sqrt(.009 / jwE); bv = 1. - smoothstep(.009, .032, F.x); tq = F.zw * bv;
        float h = F.y; tone = .82 + h * .32; col *= h < .3 ? vec3(1.07, .94, .94) : h < .6 ? vec3(.95, .96, 1.05) : h < .8 ? vec3(1.03, 1., .96) : vec3(.92);
        mean = .9;
        #ifndef PV_LITE
        tone += (pvN(p * 19.) - .5) * .08 * fin;
        #endif
        // da lontano i cubetti (2 pixel) farebbero grana: sfumano, e resta il ventaglio, gli archi e le file più scure ogni 55 cm
        float pc = 1. - smoothstep(.02, .05, mpp); jt *= pc; tq *= pc; tone = mix(.92 + (pvN(qa * vec2(.8, 3.)) - .5) * .1, tone, pc);
        float ar = min(abs(fract(qa.y / .55) - .5) * .55, abs(u) > .47 ? 0. : 9.), al = (1. - smoothstep(.012, .012 + mpp * 1.2, ar)) * (1. - pc * .6);
        tone *= 1. - al * .22; jt = max(jt, al * .5);
      } else if (fam < 4.5) {   // asfalto: la grana degli inerti, le chiazze, le crepe, le ruote sulle corsie, la canaletta
        // una tinta sola per tutte le vie e i piazzali (la tela dipingeva ogni via con la sua usura: cambi netti agli incroci); della tela
        // restano i segni, cioè quello che si stacca dalla tela sfocata (strisce, tombini, rattoppi, olio), con le chiazze lente del mondo
        col = (pvStr > .5 ? pvAsf * 1.55 + vec3(.012, .008, 0.) : pvAsf) * (.88 + pvN(p * .06 + 31.) * .24) + clamp(base - blur, vec3(-.05), vec3(.6));   // [strade] un grigio consumato e caldo, non il nero: i segni dell'uso si leggono
        #ifdef PV_LITE
        float pt = pvN(p * .5),
        #else
        float pt = pvN(p * .37) * .6 + pvN(p * 1.3) * .4,
        #endif
              mid = 1. - smoothstep(.04, .1, mpp), gr = step(.9, pvH(floor(p * 24.) + 7.)) - step(pvH(floor(p * 24.) + 3.), .07);   // gli inerti grossi (4 cm): chiari e scuri, leggibili allo zoom del gioco
        tone = .92 + (pt - .5) * .26 + gr * .1 * mid + (pvN(p * 4.7) - .5) * .08 * mid;   // le chiazze, gli inerti grossi, la grana media: a 5 cm per pixel l'asfalto ha una pelle
        #ifndef PV_LITE
        float g1 = pvN(p * 38.), sp = step(.94, pvH(floor(p * 85.))), ag = pvN(p * 9.) * .6 + pvN(p * 17.) * .4;
        tone += (ag - .5) * .14 * lod + ((g1 - .5) * .12 + sp * .22) * fin;
        // le crepe: la curva di livello di un rumore, larga uguale ovunque (distanza in metri dalla curva), solo dove l'asfalto è vecchio
        vec2 qc = lungo ? q : p; float cn = pvN(qc * vec2(.16, 1.9) + 3.) * .85 + pvN(qc * vec2(.6, 3.)) * .15, cdist = abs(cn - .5) * mpp / max(fwidth(cn), 1e-5), cz = smoothstep(.74, .86, pvN(p * .11 + 17.)) * (lungo ? 1. : .4);
        float crack = (1. - smoothstep(.004, .004 + mpp * .8, cdist)) * cz; tone -= crack * .2 * lod;
        #endif
        if (via) { float lane = abs(av - hw * .5), tr = pvG((lane - .8) / .3) * jf, oil = pvG(lane / .35) * step(2.6, hw) * jf;
          tone *= 1. + tr * .07 - oil * .1; pvPol = tr * .6;
          float gut = smoothstep(hw - .5, hw - .05, av) * jf; tone *= 1. - gut * .14; pvWet = max(pvWet, gut * .35);
          float sk = pvSab * jf;   // la sabbia portata dal vento: lingue dal ciglio verso il centro, a chiazze
          if (sk > 0.) { float dr = sk * sk * smoothstep(.62, .8, pvN(vec2(s * .4, v * 1.6) + 3.) * .6 + pvN(p * 2.2) * .25 + (av / hw - .6) * .8);   // solo lingue rade sul ciglio
            col = mix(col, vec3(.6, .5, .34) * (.9 + pvN(p * 9.) * .2), clamp(dr, 0., .6)); tone = mix(tone, 1., dr); pvPol = 0.; } }
        if (pvStr > .5 && mod(pvDbg, 2.) < .5) {   // [strade] l'asfalto vissuto
          if (lungo && via) {
            // i giunti di ripresa: quello lungo in mezzeria (la stesa in due passate) e quelli di traverso ogni 30-50 m
            float cs = floor(s / 41.), sj = cs * 41. + pvH(vec2(cs, 5.)) * 12., gl = (1. - smoothstep(.005, .005 + aa, abs(v))) * step(2.6, hw), gt = 1. - smoothstep(.005, .005 + aa, abs(s - sj));
            float sea = max(gl * smoothstep(.35, .55, pvN(vec2(s * .08, 3.))), gt) * jf * lod; tone *= 1. - sea * .09; jt = max(jt, sea * .22);   // sottili e a tratti: sigillati, non tagli
            // le toppe: rettangoli di asfalto più nuovo, scuro e liscio, col bordo netto e il filo di bitume che li sigilla
            float cp = floor(s / 13.), hp = pvH(vec2(cp, hw * 7. + 3.));
            if (hp < .46) { float L = 1.6 + pvH(vec2(cp, 9.)) * 4.4, Wd = .8 + pvH(vec2(cp, 11.)) * min(2., hw), s0 = cp * 13. + 1. + pvH(vec2(cp, 13.)) * (11. - L), v0 = (pvH(vec2(cp, 17.)) * 2. - 1.) * max(0., hw - Wd * .5 - .3);
              vec2 dq = vec2(abs(s - s0 - L * .5) - L * .5, abs(v - v0) - Wd * .5); float ed = max(dq.x, dq.y), inP = 1. - smoothstep(-aa, aa, ed), rim = 1. - smoothstep(.01, .01 + aa * 1.5, abs(ed));
              tone = mix(tone, (hp < .2 ? .68 : 1.08) + (pvN(p * 3.) - .5) * .05, inP * jf); pvPol = mix(pvPol, .35, inP); tone *= 1. - rim * .4 * jf; jt = max(jt, rim * .6 * jf); } }   // le toppe nuove scure e quelle vecchie sbiadite, il filo di bitume
          // le crepe a ragnatela nei punti stanchi: sulle ruote e dove l'asfalto è vecchio
          float tired = smoothstep(.55, .72, pvN(p * .23 + 41.)) * (via ? .35 + .65 * pvG((abs(av - hw * .5) - .8) / .6) : .5);
          #ifndef PV_LITE
          if (tired > .02) { float rg = pvRagno(p, mpp) * smoothstep(.0, .25, tired - .08); tone -= rg * .3 * lod; jt = max(jt, rg * .5); }
          #endif
          if (via) {
            float dip = smoothstep(.74, .84, pvN(p * .38 + 23.)) * pvG((abs(av - hw * .5) - .8) / .45) * jf; pvWet = max(pvWet, dip * .45); tone *= 1. - dip * .1;   // gli avvallamenti sulle ruote tengono l'acqua
            float gh = smoothstep(hw - .45, hw - .1, av), sp2 = pvH(floor(p * 33.) + 51.); tone += (step(.72, sp2) * .16 - step(sp2, .14) * .1) * gh * mid;   // il ghiaino sul ciglio
          }
        }
      } else if (fam < 6.5 || fam > 7.5) {   // terra battuta e spianata: polvere a chiazze, sassolini, le carreggiate delle sterrate
        #ifdef PV_LITE
        vec4 S = vec4(0., 0., 1., 0.); float peb = 0.;
        #else
        vec4 S = pvSassi(p / .09, .9); float peb = (1. - smoothstep(.22, .36, length(S.zw))) * step(.7, S.y) * fin;
        #endif
        tone = .9 + (pvN(p * .9) - .5) * .18 + (pvN(p * 4.) - .5) * .1 + peb * .14; tq = normalize(S.zw + 1e-5) * peb * .7;
        float mid = 1. - smoothstep(.05, .12, mpp), gv = pvH(floor(p * 22.) + 11.), bat = smoothstep(.55, .7, pvN(p * .5 + 4.));   // la ghiaia da 4 cm, chiara e scura; la terra battuta più liscia e chiara a chiazze
        tone += ((step(.88, gv) * .16 - step(gv, .1) * .14) * (1. - bat * .7)) * mid + bat * .05;
        #ifndef PV_LITE
        float pass = smoothstep(.62, .7, pvN(p * vec2(.25, .9) + 9.)) * smoothstep(.4, .6, pvN(p * .12));   // le tracce dei passi, più lisce e scure
        tone *= 1. - pass * .07; pvPol = max(pvPol, pass * .3);
        #endif
        if (via) { float rut = pvG((av - .75) / .22); tone *= 1. - rut * .12; pvPol = rut * .3; }
      } else {   // sabbia: le increspature del vento, la grana, più scura e liscia dove è bagnata
        float ph = dot(p, vec2(.8, .6)) * 11. + pvN(p * .7) * 7.;
        tone = .96 + sin(ph) * .035 * lod + (pvH(floor(p * 120.)) - .5) * .1 * fin + (pvN(p * .3) - .5) * .08;
        tq = vec2(.8, .6) * cos(ph) * .12 * lod;
      }
      // il disegno da lontano si fonde nel suo valore medio (niente moiré)
      tone = mix(mean, tone / mean, lod) ;
      col *= tone * (1. - jt * .34 * lod) * (1. - bv * bv * .16 * lod);   // il bordo a cuscino: la pietra si arrotonda verso il giunto, uguale da ogni lato
      vec2 tw = (ux * tq.x + uy * tq.y) * .22 * lod;   // (sotto: il selciato attorno alle case vi aggiunge la sua luce)   // la luce radente sullo smusso, leggera
      // [strade] le finiture: tombini, chiusini, caditoie, pozzetti, rattoppi, olio e gomma, nitidi (la lista di render.js, nella mappa)
      if (pvStr > .5 && pvHas > .5 && mod(floor(pvDbg / 2.), 2.) < .5) { vec4 Fi = texture2D(pvFi, uv); float ft = mod(Fi.a, 16.);
        if (ft > .5) { vec2 d0 = pvRot(p - Fi.xy, Fi.z); float rr = length(d0), sh = pvH(floor(Fi.xy * 3.) + 7.);
          if (ft < 1.5) {   // il tombino tondo di ghisa: la cornice, il disco a bugne, la scritta circolare, l'alone
            float rim = 1. - smoothstep(.36 - aa, .36 + aa, rr), dk = 1. - smoothstep(.3 - aa, .3 + aa, rr); vec2 gq = abs(fract(d0 / .045) - .5);
            float bug = step(.28, min(gq.x, gq.y)) * fin, an = (1. - smoothstep(.006, .006 + aa, abs(rr - .22))) * dk;
            vec3 gh = vec3(.19, .18, .17) * (.88 + bug * .28 + pvN(p * 21.) * .12) * (1. - an * .35), cr = vec3(.27, .25, .23) * (.9 + pvN(p * 13.) * .15);
            col = mix(col, mix(cr, gh, dk), rim * lod); col *= 1. - (1. - smoothstep(.36, .5, rr)) * (1. - rim) * .22; jt = max(jt, (1. - smoothstep(.0, .01 + aa, abs(rr - .3))) * rim); pvWet *= 1. - rim * .6; pvPol = max(pvPol, dk * .5); }
          else if (ft < 2.5) {   // il chiusino quadro: il telaio di pietra, la piastra di ghisa a rombi
            vec2 a = abs(d0); float e = max(a.x, a.y), inS = 1. - smoothstep(.36 - aa, .36 + aa, e), inG = 1. - smoothstep(.29 - aa, .29 + aa, e);
            vec2 dm = abs(fract(vec2(d0.x + d0.y, d0.x - d0.y) / .06) - .5); float rom = step(.32, min(dm.x, dm.y)) * fin;
            col = mix(col, mix(vec3(.42, .4, .37) * (.9 + pvN(p * 9.) * .2), vec3(.2, .19, .18) * (.9 + rom * .3), inG), inS * lod); jt = max(jt, (1. - smoothstep(.0, .01 + aa, abs(e - .29))) * inS); pvWet *= 1. - inS * .5; }
          else if (ft < 3.5) {   // la caditoia sul ciglio: la griglia con le sbarre, il buio sotto, il telaio
            vec2 a = abs(d0); float inC = (1. - smoothstep(.45 - aa, .45 + aa, a.x)) * (1. - smoothstep(.18 - aa, .18 + aa, a.y)), inB = (1. - smoothstep(.41 - aa, .41 + aa, a.x)) * (1. - smoothstep(.14 - aa, .14 + aa, a.y));
            float bar = 1. - smoothstep(.018, .018 + aa, abs(fract(d0.x / .07) - .5) * .07);
            col = mix(col, mix(vec3(.24, .23, .21), mix(vec3(.03, .03, .035), vec3(.23, .22, .2), bar), inB), inC * lod); col *= 1. - (1. - smoothstep(.18, .6, a.y)) * (1. - smoothstep(.45, .9, a.x)) * (1. - inC) * .2; pvWet = max(pvWet, (1. - smoothstep(.45, 1., rr)) * .5); }
          else if (ft < 4.5) {   // il pozzetto della rete: il coperchio di cemento a righe, la cornice di ferro
            vec2 a = abs(d0); float e = max(a.x, a.y), inS = 1. - smoothstep(.31 - aa, .31 + aa, e), rib = 1. - smoothstep(.008, .008 + aa, abs(fract(d0.y / .06) - .5) * .06);
            col = mix(col, mix(vec3(.46, .44, .41), vec3(.3, .29, .27), step(.27, e)) * (1. - rib * .2 * fin), inS * lod); jt = max(jt, (1. - smoothstep(.0, .01 + aa, abs(e - .27))) * inS); }
          else if (ft < 5.5) {   // l'olio dove le auto stanno ferme: la macchia scura irregolare e l'alone che luccica
            float r2 = length(d0 * vec2(1., 1.7)) + (pvN(p * 3.1 + sh * 9.) - .5) * .6, o = 1. - smoothstep(.35, 1.05, r2);
            col = mix(col, col * vec3(.5, .49, .56), o * .7); col += vec3(.012, .004, .02) * (1. - smoothstep(.0, .12, abs(r2 - .9))) * lod; pvPol = max(pvPol, o); }
          else if (ft < 6.5) {   // il rattoppo di bitume nuovo (quelli della lista del boom)
            float L = mod(floor(Fi.a / 16.), 256.) / 10., Wd = floor(Fi.a / 4096.) / 10.; vec2 dq = abs(d0) - vec2(L, Wd) * .5; float ed = max(dq.x, dq.y), inP = 1. - smoothstep(-aa, aa, ed), rim = 1. - smoothstep(.01, .01 + aa * 1.5, abs(ed));
            col = mix(col, col * (.72 + (pvN(p * 3.) - .5) * .05), inP); col *= 1. - rim * .25; jt = max(jt, rim * .5); pvPol = mix(pvPol, .35, inP); }
          else {   // la gomma dove si frena (le fermate, gli STOP): strisciate scure lungo la corsia
            float al = 1. - smoothstep(2.5, 6.5, abs(d0.x)), tk = pvG((abs(abs(d0.y) - .8)) / .16) + pvG((abs(abs(d0.y) - .8) - .0) / .3) * .3;
            col *= 1. - al * tk * (.22 + pvN(vec2(d0.x * 1.7, d0.y * 9.)) * .2) * lod; pvPol = max(pvPol, al * tk * .5); }
        } }
      // la scala del mondo: due rumori lenti sopra la tinta della tela (niente ripetizione a 16 m)
      #ifdef PV_LITE
      col *= .95 + pvN(p * .07) * .09;
      #else
      col *= .95 + pvN(p * .045) * .08 + (pvN(p * .21) - .5) * .06;
      #endif
      // la fila di confine: fra due suoli (sulla linea interpolata) e sul ciglio della via verso il suolo fuori (dove il disegno passa
      // dalle coordinate della via a quelle del mondo): cubetti da 12 cm allineati, poco più scuri dei vicini, come una guida a raso
      bool ciglio = rf > 0. && pvForce < .5 && av >= hw && av < hw + .5 && gf > .5;
      if (pvStr > .5 && via && rf > .5 && (rf < 3.5 || rf > 4.5) && scA > 0. && scA < .45 && pvForce < .5) {   // [strade] dove l'asfalto incontra una via di pietra: la fascia di cubetti, mai il taglio
        vec4 Fb = pvFile(vec2(s, scA), .15, .12, .18, 43.); float bj = 1. - smoothstep(.008 - aa, .008 + aa, Fb.x), bw = 1. - smoothstep(.36, .4 + aa, scA);
        col = mix(col, blur * vec3(.86, .85, .84) * (.84 + Fb.y * .22) * (1. - bj * .35), bw * lod); jt = max(jt, bj * bw); }
      if ((bord > 0. || ciglio) && !via) {
        vec2 qb = ciglio ? vec2(s, av - hw) : pvRot(p, .785); float bw = ciglio ? 1. - smoothstep(.36, .4 + aa, av - hw) : bord;
        vec4 Fb = pvFile(qb, .12, .1, .14, 41.); float bj = 1. - smoothstep(.008 - aa, .008 + aa, Fb.x);
        vec3 bs = blur * vec3(.9, .89, .88) * (.86 + Fb.y * .2) * (1. - bj * .3);
        col = mix(col, bs, bw * lod); jt = max(jt, bj * bw);
      }
      // il selciato attorno alle case che stanno su sabbia o terra: ciottoli fitti per un metro circa, il bordo irregolare, qualche sasso
      // che scappa oltre; così la casa non è una scatola posata sullo spiazzo
      float dw = (1. - K.r) * 3.5, wall = pow(max(0., 1. - dw / 1.4), 2.);   // la distanza dal muro più vicino e la sua vicinanza
      #ifdef PV_LITE
      if (fam > 5.5 && fam < 8.5 && dw < 2.8) { float ed = fam > 6.5 && fam < 7.5 ? 2.6 : .8, inL = (1. - smoothstep(ed - .1, ed + .1, dw)) * lod;   // leggera: la fascia di pietra, senza disegno
        col = mix(col, mix(base * vec3(.8, .78, .74), vec3(pvLum(base)) * vec3(.98, .93, .86) * .78, .55), inL); }
      #else
      if (fam > 6.5 && fam < 7.5 && dw < 3.4) {   // il lungomare: davanti alle case che stanno sulla sabbia, lastre a correre, la cordonata, la sabbia che ci soffia sopra
        float ed = 2.6 + (pvN(p * .35) - .5) * .25, inL = 1. - smoothstep(ed - aa * 2., ed + aa * 2., dw);
        vec2 ql = pvRot(p, .785); vec4 F = pvFile(ql + (vec2(pvN(ql * 2.), pvN(ql * 2. + 5.)) - .5) * .015, .45, .5, .85, 77.);
        float cb = smoothstep(ed - .34, ed - .3, dw) * inL, lj = 1. - smoothstep(.01 - aa, .01 + aa, cb > .5 ? abs(fract(dot(ql, vec2(1., 0.)) / 1.1) - .5) * 1.1 : F.x);
        vec3 lst = mix(base * vec3(.8, .78, .74), vec3(pvLum(base)) * vec3(.98, .93, .86) * .78, .55) * (.84 + F.y * .24) * (cb > .5 ? 1.18 : 1.);   // pietra calda, più grigia della sabbia
        float drift = smoothstep(.55, .75, pvN(p * 1.1 + 8.)) * smoothstep(ed - 1.4, ed, dw);   // la sabbia portata dal vento sul bordo
        lst = mix(lst * (1. - lj * .4) * (1. - (1. - smoothstep(.01, .04, F.x)) * .12), base, drift * .8);
        col = mix(col, lst, inL * lod); tw += F.zw * (1. - smoothstep(.01, .04, F.x)) * .15 * inL * (1. - drift);
        col *= 1. - (1. - smoothstep(0., .12, abs(dw - ed - .06))) * .3 * lod;   // la riga in ombra dove la cordonata finisce nella sabbia
        jt = max(jt, lj * inL);
      }
      if (fam > 5.5 && fam < 8.5 && fam != 7. && dw < 1.6) {
        float edge = .8 + (pvN(p * 1.3) - .5) * .35, inA = 1. - smoothstep(edge - .06, edge + .06, dw);
        #ifdef PV_LITE
        vec4 C = vec4(.1, pvN(p * 4.), 1., 0.);   // leggera: la fascia di pietra senza i ciottoli
        #else
        vec4 C = pvSassi(p / .2, .8);
        #endif
        float ce = C.x * .2, cj = 1. - smoothstep(.014 - aa, .014 + aa, ce);
        float stray = (1. - smoothstep(.2, .34, length(C.zw))) * step(.62, C.y) * (1. - smoothstep(edge, edge + .5, dw)) * (1. - inA);
        vec3 stone = base * vec3(.86, .84, .82) * (.78 + C.y * .3);   // la pietra del posto: la tinta del suolo, più scura e grigia
        float k = max(inA, stray) * lod;
        col = mix(col, stone * (1. - cj * .45) * (1. - (1. - smoothstep(.012, .045, ce)) * .14), k);
        tw += normalize(C.zw + 1e-5) * (1. - smoothstep(.012, .045, ce)) * .18 * k;
        jt = max(jt, cj * inA);
      }
      #endif
      // sporco e umido nei punti giusti
      float dirt = wall * (.18 + jt * .3);
      col = mix(col, col * vec3(1.05, .97, .84), wall * .35); col *= 1. - dirt;
      if (fam < 3.5 || fam > 8.5) col = mix(col, vec3(.2, .26, .13) * (pvLum(base) * 2.2 + .1), jt * wall * .5 * lod);   // muschio nei giunti al piede dei muri
      #ifdef PV_LITE
      float pud = 0.;
      #else
      float pud = smoothstep(.76, .81, pvN(p * .42 + 5.)) * smoothstep(.45, .6, pvN(p * .09 + 2.)) * step(fam, 5.5);   // pozze rade (e piccole) nei punti bassi
      #endif
      pvWet = max(max(pvWet, K.g * .9), pud * .4 + jt * .25 * wall);
      if (fam > 6.5 && fam < 7.5) pvWet = K.g;
      col *= 1. - pvWet * .26;
      col = mix(col, col * vec3(.42, .38, .36), K.b * pvForza);   // l'ombra di contatto, calda
      col = mix(col, col * vec3(.62, .56, .5), K.a * .55);   // il raccordo muro-terreno: la riga calda e scura dove il muro tocca terra
      pvTilt = tw * pvForza;
      return mix(base, col, pvForza);
    }`;
  // aggiunge il disegno a un materiale (suolo: MeshStandardMaterial; marciapiede: MeshLambertMaterial)
  const DUMMY = { id: null, mk: null };
  function dummy() { if (DUMMY.id) return DUMMY; DUMMY.id = new THREE.DataTexture(new Float32Array(4), 1, 1, THREE.RGBAFormat, THREE.FloatType); DUMMY.id.needsUpdate = true; DUMMY.mk = new THREE.DataTexture(new Uint8Array(4), 1, 1); DUMMY.mk.needsUpdate = true; return DUMMY; }
  function patch(mat, U, chiave) {
    const prev = mat.onBeforeCompile, pk = mat.customProgramCacheKey;
    mat.onBeforeCompile = function (sh, r) {
      if (prev) prev.call(this, sh, r); STAT.comp++; STAT.ok = sh.fragmentShader.includes('#include <map_fragment>');
      Object.assign(sh.uniforms, U); if (QUAL.v === 'leggera') sh.fragmentShader = '#define PV_LITE\n' + sh.fragmentShader;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vPw;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvPw = (modelMatrix * vec4(transformed, 1.)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + GLSL)
        .replace('#include <map_fragment>', '#include <map_fragment>\n #ifdef USE_MAP\n diffuseColor.rgb = pvDett(diffuseColor.rgb, vPw.xz, diffuse * texture2D(map, vUv, 4.).rgb);\n #else\n diffuseColor.rgb = pvDett(diffuseColor.rgb, vPw.xz, diffuseColor.rgb);\n #endif')
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, .32, pvWet * pvForza); roughnessFactor = mix(roughnessFactor, roughnessFactor * .75, pvPol * pvForza);')
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n #ifndef PV_LITE\n normal = normalize(normal + (viewMatrix * vec4(pvTilt.x, 0., pvTilt.y, 0.)).xyz);\n #endif');
    };
    mat.customProgramCacheKey = () => (pk ? pk.call(mat) : '') + '|' + chiave + '|' + QUAL.v;
    mat.needsUpdate = true; MATS.add(mat); return mat;
  }
  // [pavimenti] la qualità: 'alta' (il disegno pieno) o 'leggera' (telefoni e qualità bassa: una via per texel, niente grana fine,
  // niente celle di ciottoli, il disegno si spegne prima). In automatico all'avvio; il livello di qualità del gioco la pilota con qualita()
  const QUAL = { v: /[?&]pavleggero\b/.test(typeof location !== 'undefined' ? location.search : '') ? 'leggera' : 'alta' }, MATS = new Set();
  function qualita(q) { if (q === undefined) return QUAL.v; if (q !== 'alta' && q !== 'leggera') return QUAL.v; if (q === QUAL.v) return q; QUAL.v = q; MATS.forEach(m => { m.needsUpdate = true; }); return q; }
  const FORZA = { value: 1 }, STRU = { value: STRADE ? 1 : 0 }, DBG = { value: 0 };   // DBG: 1 spegne l'asfalto vissuto, 2 le finiture (per le prove)   // window.__PAV.forza.value = 0 per confrontare dal vivo
  let NZ = null;   // la tessitura di rumore della variante leggera: valori a caso per cella, filtrata, ripetuta
  function nz() { if (NZ) return NZ; const N = 256, a = new Uint8Array(N * N * 4); let sd = 7; for (let i = 0; i < a.length; i++) { sd = (sd * 16807) % 2147483647; a[i] = sd & 255; }
    NZ = new THREE.DataTexture(a, N, N, THREE.RGBAFormat); NZ.wrapS = NZ.wrapT = THREE.RepeatWrapping; NZ.magFilter = NZ.minFilter = THREE.LinearFilter; NZ.generateMipmaps = false; NZ.needsUpdate = true; return NZ; }
  function uniforms(b, force) { const d = dummy(); return { pvNz: { value: nz() }, pvAsf: ASF, pvStr: STRU, pvDbg: DBG, pvId: { value: b ? b.id : d.id }, pvId2: { value: b ? b.id2 : d.id }, pvFi: { value: b ? b.fi : d.id }, pvMk: { value: b ? b.mk : d.mk }, pvBox: { value: b ? b.box : new THREE.Vector4(0, 0, 1, 1) }, pvRes: { value: b ? b.res : new THREE.Vector2(1, 1) }, pvHas: { value: b ? 1 : 0 }, pvForza: FORZA, pvForce: { value: force || 0 } }; }

  // il suolo di un blocco: le mappe e il materiale (chiamato da buildChunkGen)
  function suolo(mat, tx0, ty0, n, m) {
    if (!attivo()) return mat; const key = tx0 / 32 + ',' + ty0 / 32, b = mappe(tx0, ty0, n, m); BLK.set(key, b); mat.userData.pav = key; mat.userData.pavB = b;
    return patch(mat, uniforms(b, 0), 'pav1');
  }
  function via(mat) { const key = mat && mat.userData.pav, b = mat && mat.userData.pavB; if (!b) return; MATS.delete(mat); b.id.dispose(); b.id2.dispose(); b.fi.dispose(); b.mk.dispose(); if (BLK.get(key) === b) BLK.delete(key); }   // il blocco rifatto ha già messo la sua
  // il marciapiede di un riquadro da 64 m: la stessa mappa del blocco sotto (le file seguono la via, il cordolo sul ciglio)
  function marciapiede(mesh, i, j) {
    if (!attivo()) return; if (i === undefined) { const g = mesh.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); const C = A.TS * 32; i = Math.floor(g.boundingSphere.center.x / C); j = Math.floor(g.boundingSphere.center.z / C); }
    const key = i + ',' + j, U = uniforms(null, FAM.lastre), mat = patch(mesh.material.clone(), U, 'pav1m'); mesh.material = mat;
    mesh.onBeforeRender = () => { const b = BLK.get(key); if (b) { U.pvId.value = b.id; U.pvId2.value = b.id2; U.pvFi.value = b.fi; U.pvMk.value = b.mk; U.pvBox.value = b.box; U.pvRes.value = b.res; U.pvHas.value = 1; } else U.pvHas.value = 0; };
  }

  // ---------------- 4. L'APPOGGIO: chi è posato a terra lascia l'ombra di contatto nel suolo; e la misura del piede ----------------
  const _b = typeof THREE !== 'undefined' ? new THREE.Box3() : null, _s = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
  // posa: se vero e l'oggetto è piccolo e libero, rende quanto abbassarlo (galleggia di 2,5-12 cm: tocca terra nel punto più basso) o
  // alzarlo (negativo: sepolto di 10-35 cm anche lì); render.js lo sposta prima di fonderlo. I pezzi fissi (porte, gradini, reti) no
  const POSA = { giu: 0, su: 0 };
  function oggetto(obj, nome, posa) {
    if (!attivo() || !obj) return 0; _b.setFromObject(obj); if (_b.isEmpty()) return 0; _b.getSize(_s);
    const cx = (_b.min.x + _b.max.x) / 2, cz = (_b.min.z + _b.max.z) / 2, gh = A.groundH(cx, cz), dy = _b.min.y - gh;
    if (_s.y < .25 || _s.x * _s.z < .06 || Math.max(_s.x, _s.z) > 9 || dy > .35 || dy < -.5) return 0;
    // il suolo sotto l'impronta: il punto più basso e il più alto (al centro e ai quattro angoli, appena dentro)
    let g0 = gh, g1 = gh; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, c]) => { const h = A.groundH(cx + a * _s.x * .45, cz + c * _s.z * .45); if (h < g0) g0 = h; if (h > g1) g1 = h; });
    let su = _b.min.y - g0;   // > 3 cm: c'è luce sotto anche nel punto più basso; < -10 cm: sepolto anche lì
    let mv = 0; if (posa && Math.max(_s.x, _s.z) < 3.5) { if (su > .025 && su <= .12) { mv = su - .005; POSA.giu++; } else if (su < -.1 && su > -.35) { mv = su + .02; POSA.su++; } }
    if (MIS.length < 60000) { const flag = su > .03 || su < -.1; MIS.push([nome || obj.name || (flag ? chi() : ''), +cx.toFixed(2), +cz.toFixed(2), +(su - mv).toFixed(3), +_s.y.toFixed(2), +(g1 - g0).toFixed(3), +su.toFixed(3)]); }   // [.., dopo la posa, altezza, pendenza sotto, prima della posa]
    su -= mv; if (su > .12 || Math.max(_s.x, _s.z) > 3.2 || _s.y > 3.5) return mv;   // sospeso (su un davanzale, un tavolo), o grande e aperto (gru, tettoie): niente ombra a terra
    const f = Math.min(.7, .4 + _s.y * .1) * (Math.max(_s.x, _s.z) > 1.6 ? .7 : 1);   // più alto, più ombra; i lunghi (panche, banchi) più leggera
    ombra(cx, cz, _s.x / 2, _s.z / 2, f);
    return mv;
  }
  // chi l'ha messo: la prima funzione di render.js sopra addStatic (solo per i casi segnati: costa)
  function chi() { const st = (new Error().stack || '').split('\n').map(l => (l.match(/at (?:Object\.)?([\w$]+) /) || [])[1]).filter(Boolean); const i = st.findIndex(f => f === 'addStatic'); return (i >= 0 ? st.slice(i + 1).find(f => !/^(place|at1|put|G0|add)$/.test(f)) : st[3]) || '?'; }
  function ombra(cx, cz, rx, rz, f) {
    if (!attivo()) return; const C = A.TS * 32, ks = new Set(); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => ks.add(Math.floor((cx + a * (rx * 1.18 + .2)) / C) + ',' + Math.floor((cz + b * (rz * 1.18 + .2)) / C)));
    ks.forEach(k => { (OMB.get(k) || OMB.set(k, []).get(k)).push([cx, cz, rx, rz, f]); if (BLK.has(k)) { DIRTY.add(k); if (!dirtyT) dirtyT = setTimeout(() => { dirtyT = null; DIRTY.forEach(k2 => { const [i, j] = k2.split(',').map(Number); A.dirtyAt((i + .5) * C, (j + .5) * C); }); DIRTY.clear(); }, 400); } });
  }
  // la misura: chi galleggia e chi affonda (rispetto al punto più basso di groundH sotto l'impronta); i gradini scendono apposta sotto terra (la fondazione)
  function misura(soglia) {
    const s = soglia || .03, su = MIS.filter(q => q[3] > s && q[3] <= .12), giu = MIS.filter(q => q[3] < -.1 && q[0] !== 'gradino'), per = L => { const o = {}; L.forEach(q => { const k = q[0] || '?'; o[k] = (o[k] || 0) + 1; }); return Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 25); };
    const su0 = MIS.filter(q => q[6] > s && q[6] <= .12).length, giu0 = MIS.filter(q => q[6] < -.1 && q[0] !== 'gradino').length;
    return { primaDellaPosa: { galleggiano: su0, affondano: giu0 }, posati: POSA, oggetti: MIS.length, galleggiano: su.length, affondano: giu.length, perNomeSu: per(su), perNomeGiu: per(giu), esempiSu: su.slice(0, 20), esempiGiu: giu.slice(0, 20), tutti: MIS };
  }
  // [strade] LE RUOTE: quanto un punto sta sulle traiettorie delle ruote (0-1), per consumare la vernice dove si passa
  let RH = null;
  function ruote(x, z) {
    if (!strade()) return 0; if (!RH) { RH = new Map(); vieTutte().forEach(rd => { if (rd.kind === 'vicolo' || rd.kind === 'sterrato') return; const P = rd.pts;
      for (let k = 0; k < P.length - 1; k++) { const kx = Math.floor((P[k][0] + P[k + 1][0]) / 16), kz = Math.floor((P[k][1] + P[k + 1][1]) / 16), key = kx * 4096 + kz; (RH.get(key) || RH.set(key, []).get(key)).push([P[k][0], P[k][1], P[k + 1][0], P[k + 1][1], rd.w / 2]); } }); }
    let best = 9, hw = 0; const kx = Math.floor(x / 8), kz = Math.floor(z / 8);
    for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) (RH.get((kx + a) * 4096 + kz + b) || []).forEach(([ax, az, bx, bz, h]) => { const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)), d = Math.hypot(x - ax - dx * t, z - az - dz * t); if (d - h < best - hw) { best = d; hw = h; } });
    if (best > hw) return 0; const lane = Math.abs(best - hw * .5), g = u => Math.exp(-u * u);
    return Math.min(1, g((lane - .8) / .28) + (hw < 2.6 ? g(best / .3) : 0));
  }
  // [strade] LA VERNICE: il materiale delle strisce (segnaletica.js) legge la grana dell'asfalto e le crepe a ragnatela sotto, si scrostata
  // a chiazze; da lontano resta piena. Stessa scala mondo dello shader del suolo
  function vernice(mat) {
    if (!STRADE) return mat; const prev = mat.onBeforeCompile, pk = mat.customProgramCacheKey;
    mat.onBeforeCompile = function (sh, r) { if (prev) prev.call(this, sh, r); sh.uniforms.pvNz = { value: nz() };
      if (QUAL.v === 'leggera') sh.fragmentShader = '#define PV_LITE\n' + sh.fragmentShader;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vPw;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvPw = (modelMatrix * vec4(transformed, 1.)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vPw;\n' + GLSL_FN)
        .replace('#include <color_fragment>', `#include <color_fragment>
          { vec2 p = vPw.xz; vec2 fw = fwidth(p); float mpp = max(max(fw.x, fw.y), 1e-4), lod = 1. - smoothstep(.05, .16, mpp);
            float pg = pvN(p * 9.) * .6 + pvN(p * 17.) * .4, gr = step(.9, pvH(floor(p * 24.) + 7.)) - step(pvH(floor(p * 24.) + 3.), .07);
            diffuseColor.rgb *= mix(1., .86 + pg * .2 - gr * .12, lod);   // la grana sotto la vernice
            float sc = smoothstep(.58, .78, pvN(p * 1.6 + 3.) * .7 + pvN(p * 7.) * .3), fresca = step(.86, pvH(floor(p / 6.)));
            #ifndef PV_LITE
            float rg = pvRagno(p, mpp) * smoothstep(.62, .8, pvN(p * .23 + 41.));
            #else
            float rg = 0.;
            #endif
            diffuseColor.a *= mix(1., (1. - sc * .75 * (1. - fresca)) * (1. - rg * .9), lod); diffuseColor.rgb *= 1. + fresca * .06; }`);
    };
    mat.customProgramCacheKey = () => (pk ? pk.call(mat) : '') + '|vern1|' + QUAL.v; mat.needsUpdate = true; MATS.add(mat); return mat;
  }
  // la sonda: cosa dice la mappa in (x, z)
  const STAT = { comp: 0, ok: null };
  function sonda(x, z) { const C = A.TS * 32, key = Math.floor(x / C) + ',' + Math.floor(z / C), b = BLK.get(key); if (!b) return { key, blocco: false, blocchi: BLK.size, STAT };
    const i = Math.floor((x - b.box.x) / b.box.z * b.res.x), j = Math.floor((z - b.box.y) / b.box.w * b.res.y), d = b.id.image.data, o = (j * b.res.x + i) * 4, pk = d[o + 3];
    return { key, s: d[o], v: d[o + 1], th: d[o + 2], rf: pk % 16, gf: Math.floor(pk / 16) % 16, hw: Math.floor(pk / 256) / 8, blocchi: BLK.size, STAT }; }
  const API = { STRU, DBG, strade, ruote, quota: (x, z) => A && A.quota ? A.quota(x, z) : null, vernice, cucite: () => (vieTutte(), CUCITE), vie: B => ON ? vieTutte(B) : B.roads, qualita, sonda, STAT, __mappe: mappe, __patch: patch, __uniforms: uniforms, get on() { return ON; }, init, attivo, piatto, suolo, via, marciapiede, oggetto, ombra, misura, FAM, forza: FORZA, blocchi: BLK };
  if (typeof window !== 'undefined') window.__PAV = API;
  return API;
})();
if (typeof window !== 'undefined') window.Pavimenti = Pavimenti;
