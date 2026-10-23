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
  // i materiali (numero nella mappa); 0 = nessun disegno (prato, roccia, acqua: restano come sono)
  const FAM = { basoli: 1, travertino: 2, porfido: 3, asfalto: 4, banchina: 5, terra: 6, sabbia: 7, spianata: 8, lastre: 9, piazza: 2 };
  let A = null;                               // le funzioni di render.js (init)
  const RID = 4, RMK = 8;                     // texel per casella (2 m): mappa dei materiali a 50 cm, maschere a 25 cm
  const BLK = new Map();                      // blocco 'ci,cj' -> { id, mk, box, res }
  const OMB = new Map();                      // ombre di contatto per blocco: [x, z, rx, rz, forza]
  const MIS = [];                             // la misura dei piedi: [nome, x, z, piede - suolo]
  let dirtyT = null; const DIRTY = new Set();

  function init(api) { A = api; }
  const attivo = () => ON && !!A && A.cn1();

  // ---------------- 1. LA TELA SFUMATA: il motivo dipinto diventa tinta (resta il colore, le macchie larghe) ----------------
  // sfocatura a scatola, tre passate, periodica sul lato della tela (le tele sono motivi che si ripetono)
  const PIA = new Map();
  function piatto(c, ppm, metri) {
    if (!ON) return c; const k = c; if (PIA.has(k)) return PIA.get(k);
    const W = c.width, H = c.height, x = c.getContext('2d'), id = x.getImageData(0, 0, W, H), d = id.data, r = Math.max(1, Math.round((metri || .5) * ppm));
    const a = new Float32Array(W * H * 3); for (let i = 0; i < W * H; i++) { a[i * 3] = d[i * 4]; a[i * 3 + 1] = d[i * 4 + 1]; a[i * 3 + 2] = d[i * 4 + 2]; }
    const b = new Float32Array(a.length), n = 2 * r + 1;
    const pass = (src, dst, horiz) => { const L = horiz ? W : H, M = horiz ? H : W;
      for (let m = 0; m < M; m++) for (let ch = 0; ch < 3; ch++) { const at = l => ((horiz ? m * W + ((l % W) + W) % W : (((l % H) + H) % H) * W + m) * 3 + ch); let s = 0; for (let l = -r; l <= r; l++) s += src[at(l)];
        for (let l = 0; l < L; l++) { dst[at(l)] = s / n; s += src[at(l + r + 1)] - src[at(l - r)]; } } };
    for (let it = 0; it < 3; it++) { pass(a, b, true); pass(b, a, false); }
    const o = document.createElement('canvas'); o.width = W; o.height = H; const ox = o.getContext('2d'), od = ox.createImageData(W, H);
    for (let i = 0; i < W * H; i++) { od.data[i * 4] = a[i * 3]; od.data[i * 4 + 1] = a[i * 3 + 1]; od.data[i * 4 + 2] = a[i * 3 + 2]; od.data[i * 4 + 3] = 255; }
    ox.putImageData(od, 0, 0); PIA.set(k, o); return o;
  }

  // ---------------- 2. LE MAPPE DEL BLOCCO ----------------
  function famSuolo(tx, ty, px, pz) {
    const G = A.G, T = G.T, v = A.gT(tx, ty), z = A.zoneT(tx, ty);
    if (z === A.ZN.CITTA && (v === T.COB || v === T.PIAZZA || v === T.DIRT || v === T.VIA || v === T.WALK)) { const k = (px !== undefined && A.suoloW && A.suoloK(tx, ty) ? A.suoloW(px, pz) : null) || A.suoloK(tx, ty); if (k) return FAM[k] || 0; }   // il punto, col confine organico come sulla tela
    if (v === T.QUAY) return FAM.banchina; if (v === T.SAND) return FAM.sabbia; if (v === T.PIAZZA) return FAM.piazza;
    if (v === T.DIRT || v === T.GRAVEL) return FAM.terra; if (v === T.VIA || v === T.COB) return FAM.asfalto;
    return 0;
  }
  const famVia = rd => rd.kind === 'vicolo' ? FAM.basoli : rd.kind === 'sterrato' ? FAM.terra : rd.era === 'E3' ? FAM.porfido : rd.era === 'E4' ? FAM.travertino : FAM.asfalto;
  function mappe(tx0, ty0, n, m) {
    const TS = A.TS, X0 = tx0 * TS, Z0 = ty0 * TS, NI = n * RID, MJ = m * RID, q = TS / RID, G = A.G, T = G.T;
    const I = new Float32Array(NI * MJ * 4), I2 = new Float32Array(NI * MJ * 4), K1 = new Float32Array(NI * MJ).fill(1e9), K2 = new Float32Array(NI * MJ).fill(1e9), S2 = new Float32Array(NI * MJ).fill(9), R1 = new Int32Array(NI * MJ).fill(-1), R2 = new Int32Array(NI * MJ).fill(-1);
    // le vie: per ogni tratto i texel entro la mezza larghezza più il marciapiede. Ogni texel ricorda due vie (agli incroci): la prima è
    // quella dipinta sopra se il texel ci sta dentro (asfalto > travertino > porfido > basoli > terra, come strade1Era), se no la più vicina
    // la sabbia vicina (0-15): entro 4 m da una casella di sabbia, per la sabbia portata dal vento sull'asfalto
    const sab = (px, pz) => { const tx = Math.floor(px / TS), ty = Math.floor(pz / TS); let d = 9; for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) { if (A.gT(tx + a, ty + b) !== T.SAND) continue; const x0 = (tx + a) * TS, z0 = (ty + b) * TS; d = Math.min(d, Math.hypot(Math.max(x0 - px, 0, px - x0 - TS), Math.max(z0 - pz, 0, pz - z0 - TS))); } return d >= 4 ? 0 : Math.round(15 * (1 - d / 4)); };
    const PR = { 4: 5, 2: 4, 3: 3, 1: 2, 6: 1 }, put = (A4, kk, s0, v, th, f, hw) => { A4[kk * 4] = s0; A4[kk * 4 + 1] = v; A4[kk * 4 + 2] = th; A4[kk * 4 + 3] = f + 256 * Math.min(127, Math.round(hw * 8)); };
    (A.M.roads || []).forEach((rd, ri) => { const P = rd.pts; if (!P || P.length < 2) return; const hw = rd.w / 2, ext = hw + 2.8, g = A.geo1(rd), f = famVia(rd), pr = PR[f] || 1;
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
    return { id, id2, mk, box: new THREE.Vector4(X0, Z0, n * TS, m * TS), res: new THREE.Vector2(NI, MJ) };
  }

  // ---------------- 3. LO SHADER ----------------
  const GLSL = `
    uniform sampler2D pvId; uniform sampler2D pvId2; uniform sampler2D pvMk; uniform vec4 pvBox; uniform vec2 pvRes; uniform float pvHas; uniform float pvForza; uniform float pvForce;
    varying vec3 vPw;
    vec2 pvTilt; float pvWet; float pvPol; float pvSab;
    float pvH(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    vec2 pvH2(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
    float pvN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f); return mix(mix(pvH(i), pvH(i + vec2(1., 0.)), f.x), mix(pvH(i + vec2(0., 1.)), pvH(i + 1.), f.x), f.y); }
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
    // il disegno: rende il colore, riempie pvTilt (la normale piegata, nel piano xz del mondo), pvWet, pvPol
    vec3 pvDett(vec3 base, vec2 p){
      pvTilt = vec2(0.); pvWet = 0.; pvPol = 0.; pvSab = 0.;
      vec2 fw = fwidth(p); float mpp = max(max(fw.x, fw.y), 1e-4);                   // metri per pixel
      float lod = 1. - smoothstep(.07, .2, mpp), fin = 1. - smoothstep(.01, .035, mpp),   // pieno fino allo zoom del gioco (5-6 cm a pixel), sfuma solo dalla città intera in su
            aa = mpp * 1.2;   // giunti morbidi: il quadro non ha antialiasing e il post affila
      if (lod <= 0.) return base * (.95 + pvN(p * .045) * .08);
      vec2 uv = (p - pvBox.xy) / pvBox.zw; vec4 I = vec4(0.), K = vec4(0.);
      float rf = 0., hw = 0., s = 0., v = 0., best = 1e9; vec2 du = vec2(1., 0.);
      if (pvHas > .5) { I = texture2D(pvId, uv); K = texture2D(pvMk, uv);
        // la via: fra i quattro texel attorno, misurata nel punto (confine liscio, non a gradini). Se il punto sta dentro più vie vince
        // quella che sulla tela è dipinta sopra (l'asfalto sul travertino sul porfido sui basoli dei vicoli, come strade1Era), fuori la più vicina
        vec2 tb = floor(uv * pvRes - .5), fb = fract(uv * pvRes - .5); bool due = false;
        for (int k = 0; k < 8; k++) { if (k == 4 && !due) break; vec2 tc = (tb + vec2(float(k - (k / 2) * 2 - (k / 4) * 2), float(k / 2 - (k / 4) * 2)) + .5) / pvRes;
          vec4 J = k < 4 ? texture2D(pvId, tc) : texture2D(pvId2, tc); if (k < 4 && mod(floor(J.a / 32768.), 2.) > .5) due = true;
          if (k < 4) pvSab += floor(J.a / 65536.) / 15. * (k - (k / 2) * 2 == 1 ? fb.x : 1. - fb.x) * (k / 2 == 1 ? fb.y : 1. - fb.y);   /* la sabbia vicina, interpolata */ float r0 = mod(J.a, 16.); if (r0 < .5) continue;
          float h0 = mod(floor(J.a / 256.), 128.) / 8.; vec2 dd = p - (pvBox.xy + tc * pvBox.zw), u0 = vec2(cos(J.b), sin(J.b)); float v0 = J.g + (u0.x * dd.y - u0.y * dd.x), sc = abs(v0) - h0;
          float pr = r0 > 3.5 && r0 < 4.5 ? 5. : r0 > 1.5 && r0 < 2.5 ? 4. : r0 > 2.5 && r0 < 3.5 ? 3. : r0 < 1.5 ? 2. : 1.; sc = sc < 0. ? sc - pr * 100. : sc;
          if (sc < best) { best = sc; s = J.r + dot(dd, u0); v = v0; du = u0; rf = r0; hw = h0; } } }
      float gf = mod(floor(I.a / 16.), 16.), av = abs(v);   // il suolo sotto, dal texel più vicino
      bool via = rf > 0. && av < hw;
      float fam = pvForce > 0. ? pvForce : via ? rf : gf;
      if (fam < .5) return base;
      // coordinate del disegno: lungo e attraverso la via, o il mondo ruotato
      bool lungo = rf > 0. && av < hw + 3.;
      vec2 q = lungo ? vec2(s, v + hw) : pvRot(p, .6 + fam * .37), ux = lungo ? du : vec2(cos(.6 + fam * .37), sin(.6 + fam * .37)), uy = vec2(-ux.y, ux.x);
      vec3 col = base; float jt = 0., bv = 0., jw = .012; vec2 tq = vec2(0.); float tone = 1., mean = 1.;
      if (fam < 1.5 || (fam > 1.5 && fam < 2.5) || (fam > 4.5 && fam < 5.5) || fam > 8.5) {   // pietre a file: basoli, travertino, banchina, lastre
        float rw = fam < 1.5 ? .52 : fam < 2.5 ? .9 : fam < 5.5 ? 1.2 : .5, l0 = fam < 1.5 ? .6 : fam < 2.5 ? 1.1 : fam < 5.5 ? 1.6 : .45, l1 = fam < 1.5 ? 1.05 : fam < 2.5 ? 1.8 : fam < 5.5 ? 2.6 : .8;
        float bev = fam < 1.5 ? .06 : fam < 2.5 ? .035 : fam < 5.5 ? .07 : .025, wob = fam < 1.5 ? .05 : .012;
        vec2 qq = q; bool cord = fam > 8.5 && lungo && pvForce > 0. && v + hw > hw * 2. - .02 && v + hw < hw * 2. + .3;   // il cordolo di granito sul ciglio del marciapiede
        if (cord) { rw = .3; l0 = .8; l1 = 1.4; bev = .03; qq.y -= hw * 2.; qq.y = clamp(qq.y, .001, .299); }
        else if (fam > 8.5 && lungo) qq.y -= hw * 2. + .3;
        qq += (vec2(pvN(q * 2.3), pvN(q * 2.3 + 9.)) - .5) * wob;
        vec4 F = pvFile(qq, rw, l0, l1, fam * 11. + (cord ? 5. : 0.));
        jw = fam > 4.5 && fam < 5.5 ? .016 : fam > 8.5 ? .008 : .012;
        float jwE = max(jw, mpp * .5); jt = (1. - smoothstep(jwE - aa, jwE + aa, F.x)) * sqrt(jw / jwE); bv = 1. - smoothstep(jw, jw + bev, F.x); tq = F.zw * bv;
        float h = F.y;
        if (fam < 1.5) { float lava = step(.94, h); tone = mix(.86 + h * .26, .7, lava); col *= mix(vec3(1.03, 1., .95), vec3(.9, .86, .84), lava); }   // calcare caldo, qualche basolo di lava
        else if (fam < 2.5) { tone = .9 + h * .19; float pore = smoothstep(.78, .86, pvN(p * vec2(34., 9.) + h * 40.)) * fin; tone -= pore * .18;
          if (!lungo) {   // le piazze di travertino: le fasce di pietra scura ogni 6 m, il disegno del regime (allineate alle file)
            vec2 g6 = abs(fract(q / 6. + .5) - .5) * 6.; float fa = 1. - smoothstep(.3 - aa, .3 + aa, min(g6.x, g6.y));
            tone = mix(tone, .7 + h * .08, fa); col = mix(col, col * vec3(.94, .95, 1.), fa);
            float fj = 1. - smoothstep(.012 - aa, .012 + aa, abs(min(g6.x, g6.y) - .3)); jt = max(jt, fj); } }
        else if (fam < 5.5) { tone = .86 + h * .2; tone += (pvH(floor(p * 70.)) - .5) * .16 * fin; }
        else { tone = cord ? 1.16 + h * .08 : .93 + h * .1; if (cord) col *= vec3(.97, .99, 1.03); }
        tone += (pvN(p * 7.) - .5) * .08 + (pvN(p * 23.) - .5) * .06 * fin;
        mean = 1. - (jw * 2. / rw) * .5;
      } else if (fam < 3.5) {   // porfido a coda di pavone: cubetti di 11 cm su file ad arco (archi di 1,6 m), rosso-viola e grigio
        float A = 1.6, u = fract(q.x / A) - .5; vec2 qa = vec2(q.x, q.y + u * u * A * .7);
        qa += (vec2(pvN(q * 9.), pvN(q * 9. + 4.)) - .5) * .012;
        vec4 F = pvFile(qa, .11, .09, .13, 31.); float jwE = max(.009, mpp * .5);
        jt = (1. - smoothstep(jwE - aa, jwE + aa, F.x)) * sqrt(.009 / jwE); bv = 1. - smoothstep(.009, .032, F.x); tq = F.zw * bv;
        float h = F.y; tone = .82 + h * .32; col *= h < .3 ? vec3(1.07, .94, .94) : h < .6 ? vec3(.95, .96, 1.05) : h < .8 ? vec3(1.03, 1., .96) : vec3(.92);
        tone += (pvN(p * 19.) - .5) * .08 * fin; mean = .9;
      } else if (fam < 4.5) {   // asfalto: la grana degli inerti, le chiazze, le crepe, le ruote sulle corsie, la canaletta
        float g1 = pvN(p * 38.), sp = step(.94, pvH(floor(p * 85.))), pt = pvN(p * .37) * .6 + pvN(p * 1.3) * .4, ag = pvN(p * 9.) * .6 + pvN(p * 17.) * .4;
        float mid = 1. - smoothstep(.04, .1, mpp), gr = step(.9, pvH(floor(p * 24.) + 7.)) - step(pvH(floor(p * 24.) + 3.), .07);   // gli inerti grossi (4 cm): chiari e scuri, leggibili allo zoom del gioco
        tone = .92 + (pt - .5) * .2 + (ag - .5) * .14 * lod + gr * .07 * mid + ((g1 - .5) * .12 + sp * .22) * fin;
        // le crepe: la curva di livello di un rumore, larga uguale ovunque (distanza in metri dalla curva), solo dove l'asfalto è vecchio
        vec2 qc = lungo ? q : p; float cn = pvN(qc * vec2(.22, 1.7) + 3.) * .75 + pvN(qc * 2.6) * .25, cdist = abs(cn - .5) * mpp / max(fwidth(cn), 1e-5), cz = smoothstep(.62, .8, pvN(p * .11 + 17.));   // corrono lungo la via
        float crack = (1. - smoothstep(.005, .005 + mpp, cdist)) * cz; tone -= crack * .3 * lod;
        if (via) { float lane = abs(av - hw * .5), tr = pvG((lane - .8) / .3), oil = pvG(lane / .35) * step(2.6, hw);
          tone *= 1. + tr * .07 - oil * .1; pvPol = tr * .6;
          float gut = smoothstep(hw - .5, hw - .05, av); tone *= 1. - gut * .14; pvWet = max(pvWet, gut * .35);
          float sk = pvSab;   // la sabbia portata dal vento: lingue dal ciglio verso il centro, a chiazze
          if (sk > 0.) { float dr = sk * smoothstep(.35, .7, pvN(vec2(s * .35, v * 1.4) + 3.) * .7 + pvN(p * 2.2) * .3 + (av / hw - .55)) ;
            col = mix(col, vec3(.6, .5, .34) * (.9 + pvN(p * 9.) * .2), clamp(dr, 0., .85)); tone = mix(tone, 1., dr); pvPol = 0.; } }
      } else if (fam < 6.5 || fam > 7.5) {   // terra battuta e spianata: polvere a chiazze, sassolini, le carreggiate delle sterrate
        vec4 S = pvSassi(p / .09, .9); float peb = (1. - smoothstep(.22, .36, length(S.zw))) * step(.7, S.y) * fin;
        tone = .9 + (pvN(p * .9) - .5) * .18 + (pvN(p * 4.) - .5) * .1 + peb * .14; tq = normalize(S.zw + 1e-5) * peb * .7;
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
      // la scala del mondo: due rumori lenti sopra la tinta della tela (niente ripetizione a 16 m)
      col *= .95 + pvN(p * .045) * .08 + (pvN(p * .21) - .5) * .06;
      // il selciato attorno alle case che stanno su sabbia o terra: ciottoli fitti per un metro circa, il bordo irregolare, qualche sasso
      // che scappa oltre; così la casa non è una scatola posata sullo spiazzo
      float dw = (1. - K.r) * 3.5, wall = pow(max(0., 1. - dw / 1.4), 2.);   // la distanza dal muro più vicino e la sua vicinanza
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
        vec4 C = pvSassi(p / .2, .8); float ce = C.x * .2, cj = 1. - smoothstep(.014 - aa, .014 + aa, ce);
        float stray = (1. - smoothstep(.2, .34, length(C.zw))) * step(.62, C.y) * (1. - smoothstep(edge, edge + .5, dw)) * (1. - inA);
        vec3 stone = base * vec3(.86, .84, .82) * (.78 + C.y * .3);   // la pietra del posto: la tinta del suolo, più scura e grigia
        float k = max(inA, stray) * lod;
        col = mix(col, stone * (1. - cj * .45) * (1. - (1. - smoothstep(.012, .045, ce)) * .14), k);
        tw += normalize(C.zw + 1e-5) * (1. - smoothstep(.012, .045, ce)) * .18 * k;
        jt = max(jt, cj * inA);
      }
      // sporco e umido nei punti giusti
      float dirt = wall * (.18 + jt * .3);
      col = mix(col, col * vec3(1.05, .97, .84), wall * .35); col *= 1. - dirt;
      if (fam < 3.5 || fam > 8.5) col = mix(col, vec3(.2, .26, .13) * (pvLum(base) * 2.2 + .1), jt * wall * .5 * lod);   // muschio nei giunti al piede dei muri
      float pud = smoothstep(.76, .81, pvN(p * .42 + 5.)) * smoothstep(.45, .6, pvN(p * .09 + 2.)) * step(fam, 5.5);   // pozze rade (e piccole) nei punti bassi
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
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vPw;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvPw = (modelMatrix * vec4(transformed, 1.)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + GLSL)
        .replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb = pvDett(diffuseColor.rgb, vPw.xz);')
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, .32, pvWet * pvForza); roughnessFactor = mix(roughnessFactor, roughnessFactor * .75, pvPol * pvForza);')
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n normal = normalize(normal + (viewMatrix * vec4(pvTilt.x, 0., pvTilt.y, 0.)).xyz);');
    };
    mat.customProgramCacheKey = () => (pk ? pk.call(mat) : '') + '|' + chiave;
    mat.needsUpdate = true; return mat;
  }
  const FORZA = { value: 1 };   // window.__PAV.forza.value = 0 per confrontare dal vivo
  function uniforms(b, force) { const d = dummy(); return { pvId: { value: b ? b.id : d.id }, pvId2: { value: b ? b.id2 : d.id }, pvMk: { value: b ? b.mk : d.mk }, pvBox: { value: b ? b.box : new THREE.Vector4(0, 0, 1, 1) }, pvRes: { value: b ? b.res : new THREE.Vector2(1, 1) }, pvHas: { value: b ? 1 : 0 }, pvForza: FORZA, pvForce: { value: force || 0 } }; }

  // il suolo di un blocco: le mappe e il materiale (chiamato da buildChunkGen)
  function suolo(mat, tx0, ty0, n, m) {
    if (!attivo()) return mat; const key = tx0 / 32 + ',' + ty0 / 32, b = mappe(tx0, ty0, n, m); BLK.set(key, b); mat.userData.pav = key; mat.userData.pavB = b;
    return patch(mat, uniforms(b, 0), 'pav1');
  }
  function via(mat) { const key = mat && mat.userData.pav, b = mat && mat.userData.pavB; if (!b) return; b.id.dispose(); b.id2.dispose(); b.mk.dispose(); if (BLK.get(key) === b) BLK.delete(key); }   // il blocco rifatto ha già messo la sua
  // il marciapiede di un riquadro da 64 m: la stessa mappa del blocco sotto (le file seguono la via, il cordolo sul ciglio)
  function marciapiede(mesh, i, j) {
    if (!attivo()) return; if (i === undefined) { const g = mesh.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); const C = A.TS * 32; i = Math.floor(g.boundingSphere.center.x / C); j = Math.floor(g.boundingSphere.center.z / C); }
    const key = i + ',' + j, U = uniforms(null, FAM.lastre), mat = patch(mesh.material.clone(), U, 'pav1m'); mesh.material = mat;
    mesh.onBeforeRender = () => { const b = BLK.get(key); if (b) { U.pvId.value = b.id; U.pvId2.value = b.id2; U.pvMk.value = b.mk; U.pvBox.value = b.box; U.pvRes.value = b.res; U.pvHas.value = 1; } else U.pvHas.value = 0; };
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
  // la sonda: cosa dice la mappa in (x, z)
  const STAT = { comp: 0, ok: null };
  function sonda(x, z) { const C = A.TS * 32, key = Math.floor(x / C) + ',' + Math.floor(z / C), b = BLK.get(key); if (!b) return { key, blocco: false, blocchi: BLK.size, STAT };
    const i = Math.floor((x - b.box.x) / b.box.z * b.res.x), j = Math.floor((z - b.box.y) / b.box.w * b.res.y), d = b.id.image.data, o = (j * b.res.x + i) * 4, pk = d[o + 3];
    return { key, s: d[o], v: d[o + 1], th: d[o + 2], rf: pk % 16, gf: Math.floor(pk / 16) % 16, hw: Math.floor(pk / 256) / 8, blocchi: BLK.size, STAT }; }
  const API = { sonda, STAT, __mappe: mappe, __patch: patch, __uniforms: uniforms, get on() { return ON; }, init, attivo, piatto, suolo, via, marciapiede, oggetto, ombra, misura, FAM, forza: FORZA, blocchi: BLK };
  if (typeof window !== 'undefined') window.__PAV = API;
  return API;
})();
if (typeof window !== 'undefined') window.Pavimenti = Pavimenti;
