/* Porto Vecchio — La Sartoria: i vestiti tagliati sul corpo.
   Ogni capo è una superficie a tubo misurata sul corpo vero del modello (tronco, maniche, gambe), con le sezioni
   prese dai vertici del corpo, chiuse a involucro (la stoffa non entra nelle conche) e allargate dello spessore
   degli strati che stanno sotto: gli strati sono annidati per costruzione, niente compenetrazioni tra capi.
   Orli dritti, uv in metri (righe orizzontali vere, quadri allineati), tessuti dipinti con rilievo (bumpMap),
   e le finiture vere: colli, revers, bottoni, tasche, zip, cinture, polsini, cappucci, spalline.
   Tutto è legato allo stesso scheletro (pesi dai vertici del corpo più vicini) e si muove col corpo.
   La misura del corpo si fa una volta per modello; le geometrie si tengono in cache e si condividono.
   Usata da vestiario.js (Vesti3D) per busto, braccia e gambe; testa, collo e accessori usano Sartoria.testa(). */
var Sartoria = (function () {
  'use strict';
  // =====================================================================================
  // NUMERI
  // =====================================================================================
  const hs = (a, b) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const sm = t => t * t * (3 - 2 * t), cl = (x, a, b) => x < a ? a : x > b ? b : x, lerp = (a, b, t) => a + (b - a) * t;
  const hstr = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  // rumore a valori periodico (periodo p celle): le texture si ripetono senza cuciture
  function vn(x, y, p, sd) {
    const xi = Math.floor(x), yi = Math.floor(y), fx = sm(x - xi), fy = sm(y - yi), w = i => ((i % p) + p) % p, h = (i, j) => hs(w(i) + sd * 1013, w(j) + sd * 7919);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  const fbm = (x, y, N, cells, oct, sd) => { let s = 0, a = .5, t = 0; for (let o = 0; o < oct; o++) { const k = cells << o; s += a * vn(x / N * k, y / N * k, k, sd + o); t += a; a *= .5; } return s / t; };
  // celle di Voronoi periodiche: distanza al punto più vicino e al secondo
  function wor(x, y, N, g, sd) {
    const cx = x / N * g, cy = y / N * g, ix = Math.floor(cx), iy = Math.floor(cy); let d1 = 9, d2 = 9, id = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const gx = ix + i, gy = iy + j, wx = ((gx % g) + g) % g, wy = ((gy % g) + g) % g;
      const px = gx + hs(wx + sd, wy * 3 + 1), py = gy + hs(wx * 5 + 2, wy + sd), d = Math.hypot(px - cx, py - cy);
      if (d < d1) { d2 = d1; d1 = d; id = wx * 97 + wy; } else if (d < d2) d2 = d;
    }
    return [d1, d2, id];
  }
  const rgb = c => { const C = new THREE.Color(c); return [C.r, C.g, C.b]; };
  const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const lum = a => a[0] * .3 + a[1] * .59 + a[2] * .11;
  const toward = (a, k) => k >= 0 ? mixc(a, [1, 1, 1], k) : mul(a, 1 + k);   // schiarisci (+) o scurisci (−)

  // =====================================================================================
  // I TESSUTI: ogni tessuto dipinge una piastrella (colori veri) e il suo rilievo.
  // f(x, y, N, A, B, C) → [r, g, b, h]  (A = colore del capo, B e C = secondo e terzo colore)
  // tile: metri coperti da una piastrella; px: lato in pixel; bump: profondità del rilievo
  // =====================================================================================
  const TESS = {
    cotone: { tile: .05, px: 64, bump: .5, f(x, y, N, A) { const w = ((x + y) & 1) ? .62 : .38, n = fbm(x, y, N, 4, 2, 3); return [...mul(A, .93 + w * .08 + (n - .5) * .1), w * .6 + n * .4]; } },
    jersey: { tile: .035, px: 64, bump: .6, f(x, y, N, A) { const cx = (x % 4) / 4, v = Math.abs(cx - .5) * 2, row = ((y + (x >> 1)) % 4) / 4, h = (1 - v) * .7 + (row < .25 ? .1 : .3), n = fbm(x, y, N, 4, 2, 5); return [...mul(A, .88 + h * .14 + (n - .5) * .08), h]; } },
    costine: { tile: .045, px: 64, bump: 1, f(x, y, N, A) { const h = .5 + .5 * Math.sin(x / 8 * Math.PI * 2), k = ((y >> 1) & 1) ? .02 : 0; return [...mul(A, .78 + h * .3 + k), h]; } },
    trecce: { tile: .16, px: 128, bump: 2.2, f(x, y, N, A) {   // maglione a trecce: colonne di trecce tra coste rovesce
      const col = Math.floor(x / 32), cx = col * 32 + 16, ph = (y / 32) * Math.PI * 2, off = 6 * Math.sin(ph);
      const d1 = Math.abs(x - (cx + off)), d2 = Math.abs(x - (cx - off)), over = Math.cos(ph) > 0;
      let h = .25 + .12 * fbm(x, y, N, 16, 1, 7);
      const s1 = d1 < 5 ? 1 - d1 / 5 : 0, s2 = d2 < 5 ? 1 - d2 / 5 : 0;
      h = Math.max(h, over ? Math.max(s1, s2 * .75) : Math.max(s2, s1 * .75));
      if (Math.abs((x % 32) - 2) < 2) h = Math.max(h, .55 + .3 * Math.sin(y / 3));   // costa tra le trecce
      h = h * (.9 + .1 * Math.sin(y * 1.6));
      return [...mul(A, .62 + h * .5), h]; } },
    lana: { tile: .09, px: 64, bump: .8, f(x, y, N, A, B, C) {   // tweed: fili mescolati, puntini di colore
      const n = fbm(x, y, N, 8, 3, 11), t = ((x + y) % 4 < 2) ? .55 : .45, q = hs(x * 7 + 1, y * 13 + 2);
      let c = mul(A, .78 + n * .38 + (t - .5) * .14); if (q < .035) c = mixc(c, B, .75); else if (q > .975) c = mixc(c, C, .7);
      return [...c, n * .6 + t * .4]; } },
    panno: { tile: .06, px: 64, bump: .4, f(x, y, N, A) { const n = fbm(x, y, N, 8, 3, 13), t = ((x + y) % 4 < 2) ? .54 : .46; return [...mul(A, .88 + n * .2 + (t - .5) * .08), n * .5 + t * .5]; } },
    spina: { tile: .07, px: 64, bump: .9, f(x, y, N, A) {   // spina di pesce
      const band = (x >> 3) & 1, d = band ? (x + y) & 3 : ((x - y) % 4 + 4) & 3, w = d < 2 ? .65 : .35, n = fbm(x, y, N, 8, 2, 17);
      const edge = (x & 7) === 0 ? -.06 : 0; return [...mul(A, .84 + w * .22 + (n - .5) * .1 + edge), w]; } },
    denim: { tile: .03, px: 64, bump: .7, f(x, y, N, A) {   // saia: l'ordito blu in diagonale, la trama chiara che affiora; filati irregolari
      const d = (x + y) & 3, warp = d < 3, slub = fbm(x * .3, y * 3, N, 4, 2, 19), fade = fbm(x, y, N, 2, 2, 23);
      const c = warp ? mul(A, .82 + slub * .35) : mixc(A, [.86, .86, .9], .55); return [...toward(c, (fade - .5) * .25), warp ? .6 : .3]; } },
    pelle: { tile: .14, px: 128, bump: 1.4, f(x, y, N, A) {   // grana del cuoio e pieghe larghe
      const [d1, d2] = wor(x, y, N, 18, 29), edge = cl((d2 - d1) * 6, 0, 1), cr = fbm(x, y, N, 3, 3, 31), wear = fbm(x, y, N, 2, 2, 37);
      const h = edge * .55 + cr * .45; return [...toward(mul(A, .78 + edge * .22 + cr * .1), (wear - .55) * .3), h]; } },
    scamosciato: { tile: .12, px: 64, bump: .5, f(x, y, N, A) { const n = fbm(x, y, N, 4, 4, 41); return [...mul(A, .8 + n * .38), n]; } },
    velluto: { tile: .05, px: 64, bump: 1.6, f(x, y, N, A) { const t = (x % 6) / 6, h = Math.pow(Math.sin(Math.PI * t), .7), n = fbm(x, y, N, 8, 2, 43); return [...mul(A, .62 + h * .48 + (n - .5) * .08), h]; } },
    tartan: { tile: .2, px: 128, bump: .6, f(x, y, N, A, B, C) {   // scozzese: fasce scure e righe sottili, incrociate in saia
      const sett = v => { v = ((v % 128) + 128) % 128; if (v < 34) return 1; if (v >= 50 && v < 53) return 2; if (v >= 76 && v < 88) return 1; if (v >= 104 && v < 106) return 2; return 0; };
      const pick = s => s === 1 ? B : s === 2 ? C : A;
      const ch = pick(sett(y)), cv = pick(sett(x)), tw = ((x + y) & 3) < 2, base = tw ? ch : cv, both = sett(x) === 1 && sett(y) === 1;
      const n = fbm(x, y, N, 8, 2, 47); return [...mul(both ? mul(B, .85) : base, .9 + n * .16 + (tw ? .03 : -.03)), tw ? .6 : .4]; } },
    vichy: { tile: .045, px: 64, bump: .4, f(x, y, N, A, B) { const a = (x & 15) < 8, b = (y & 15) < 8, k = a && b ? 1 : a || b ? .5 : 0, w = ((x + y) & 1) ? .03 : -.03; return [...mul(mixc(B, A, k), 1 + w), .5 + w * 4]; } },
    madras: { tile: .14, px: 128, bump: .5, f(x, y, N, A, B, C) {
      const band = v => { v = ((v % 128) + 128) % 128; return v < 20 ? B : v < 26 ? C : v < 54 ? A : v < 60 ? [.95, .93, .86] : v < 84 ? mixc(B, C, .5) : v < 90 ? C : A; };
      const tw = ((x + y) & 3) < 2, c = mixc(band(y), band(x), tw ? .35 : .65); return [...mul(c, .94 + fbm(x, y, N, 8, 2, 53) * .1), tw ? .55 : .45]; } },
    righe: { tile: .045, px: 64, bump: .5, f(x, y, N, A, B) { const s = (y % 64) < 22, j = TESS.jersey.f(x, y, N, s ? A : B); return j; } },
    righe_v: { tile: .1, px: 64, bump: .4, f(x, y, N, A, B) { const s = (x % 64) < 30; return TESS.jersey.f(x, y, N, s ? A : B); } },
    gessato: { tile: .025, px: 64, bump: .4, f(x, y, N, A, B) { const p = TESS.panno.f(x, y, N, A); if ((x % 64) === 0 && ((y >> 1) & 1)) return [...mixc(p, B, .7), .6]; return p; } },
    fiori: { tile: .22, px: 128, bump: .3, f(x, y, N, A, B, C) {   // camicia hawaiana: ibischi, foglie, pistilli
      const F = [[20, 24, 17, 0], [84, 40, 20, 1], [52, 92, 15, 2], [110, 104, 13, 0], [8, 82, 12, 1], [70, 2, 11, 2]];
      let c = A, h = .45;
      for (const [fx0, fy0, R, k] of F) for (const [ox, oy] of [[0, 0], [128, 0], [-128, 0], [0, 128], [0, -128]]) {
        // foglie: due ellissi oblique dietro al fiore
        for (const s of [-1, 1]) { const lx = x - (fx0 + ox + s * R * .95), ly = y - (fy0 + oy + R * .5), a = s * .8, u = lx * Math.cos(a) + ly * Math.sin(a), v = -lx * Math.sin(a) + ly * Math.cos(a);
          if ((u * u) / (R * R * .9) + (v * v) / (R * R * .18) < 1) { c = Math.abs(v) < 1 ? mul(C, .7) : C; h = .55; } }
      }
      for (const [fx0, fy0, R, k] of F) for (const [ox, oy] of [[0, 0], [128, 0], [-128, 0], [0, 128], [0, -128]]) {
        const dx = x - fx0 - ox, dy = y - fy0 - oy, r = Math.hypot(dx, dy), th = Math.atan2(dy, dx) + k;
        const rr = R * (.62 + .38 * Math.abs(Math.cos(2.5 * th)));
        if (r < rr) { const fc = k === 1 ? [.95, .85, .4] : B; c = mul(fc, .78 + .22 * (r / rr)); h = .7; if (r < R * .16) { c = [.75, .2, .15]; h = .9; } }
      }
      return [...c, h]; } },
    liberty: { tile: .07, px: 64, bump: .3, f(x, y, N, A, B, C) {
      let c = A, h = .45;
      for (let i = 0; i < 12; i++) { const fx0 = hs(i, 3) * 64, fy0 = hs(i, 9) * 64, R = 3.5 + hs(i, 4) * 2.5, col = i % 3 === 0 ? C : B;
        for (const [ox, oy] of [[0, 0], [64, 0], [-64, 0], [0, 64], [0, -64], [64, 64], [-64, -64], [64, -64], [-64, 64]]) { const dx = x - fx0 - ox, dy = y - fy0 - oy, r = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
          if (r < R * (.6 + .4 * Math.abs(Math.cos(2.5 * th)))) { c = r < 1.2 ? [.95, .85, .4] : col; h = .7; }
          else if (Math.abs(dy + R * 1.2) < 1 && Math.abs(dx) < R * .8) { c = mixc(C, [.2, .35, .2], .5); } } }
      return [...c, h]; } },
    pois: { tile: .06, px: 64, bump: .3, f(x, y, N, A, B) { const gx = ((x % 32) + 32) % 32 - 16, gy = ((y % 32) + 32) % 32 - 16, gx2 = (((x + 16) % 32) + 32) % 32 - 16, gy2 = (((y + 16) % 32) + 32) % 32 - 16; const d = Math.min(Math.hypot(gx, gy), Math.hypot(gx2, gy2)); const c = TESS.cotone.f(x, y, N, d < 5 ? B : A); return c; } },
    maculato: { tile: .16, px: 128, bump: .9, f(x, y, N, A, B, C) {   // leopardo: rosette spezzate col cuore più scuro
      const [d1, , id] = wor(x, y, N, 8, 59), n = fbm(x, y, N, 16, 2, 61), br = fbm(x, y, N, 32, 1, 67), R = .38 + hs(id, 1) * .1;
      let c = mul(A, .9 + n * .2);
      if (d1 < R * .55) c = mixc(c, C, .7); else if (d1 < R && br > .35) c = B;
      const fur = vn(x * .5, y * 4, 64, 71); return [...mul(c, .9 + fur * .18), fur]; } },
    pelo: { tile: .1, px: 64, bump: 1.6, f(x, y, N, A) { const s = vn(x * .9, y * .12, 58, 73), t = vn(x * .45, y * .06, 29, 79), h = s * .6 + t * .4; return [...toward(mul(A, .66 + h * .5), h > .7 ? (h - .7) * 1.2 : 0), h]; } },
    montone: { tile: .05, px: 64, bump: 1.5, f(x, y, N, A) { const [d1] = wor(x, y, N, 12, 83), n = fbm(x, y, N, 8, 2, 89), h = 1 - cl(d1 * 1.8, 0, 1); return [...mul(A, .78 + h * .25 + n * .08), h * .7 + n * .3]; } },
    piumino: { tile: .2, px: 128, bump: 9, f(x, y, N, A) {   // trapuntato: tubi orizzontali gonfi, cucitura scura, riflesso del nylon
      const t = (y % 32) / 32, h = Math.pow(Math.sin(Math.PI * t), .55), st = t < .045 || t > .955, n = fbm(x, y, N, 4, 2, 97);
      let c = mul(A, .58 + h * .5 + (n - .5) * .06); if (h > .8) c = toward(c, (h - .8) * .5); if (st) c = mul(A, .42);
      return [...c, st ? 0 : h]; } },
    nylon: { tile: .1, px: 64, bump: .3, f(x, y, N, A) { const g = (x & 15) === 0 || (y & 15) === 0, n = fbm(x, y, N, 2, 2, 101); return [...toward(mul(A, g ? .95 : 1), (n - .5) * .16), g ? .7 : .5]; } },
    ripstop: { tile: .06, px: 64, bump: .9, f(x, y, N, A) { const g = (x % 10) === 0 || (y % 10) === 0, w = ((x + y) & 1) ? .03 : -.03, n = fbm(x, y, N, 4, 2, 103); return [...mul(A, (g ? 1.08 : .96) + w + (n - .5) * .08), g ? .9 : .4]; } },
    raso: { tile: .3, px: 64, bump: .2, f(x, y, N, A) { const n = fbm(x * .5, y * 2, N, 2, 3, 107); return [...toward(A, (n - .45) * .5), n * .3]; } },
    pique: { tile: .02, px: 32, bump: .8, f(x, y, N, A) { const gx = (x % 4) - 1.5, gy = (y % 4) - 1.5, h = Math.hypot(gx, gy) < 1.4 ? .2 : .8; return [...mul(A, .9 + h * .12), h]; } },
    feltro: { tile: .05, px: 64, bump: .4, f(x, y, N, A) { const n = fbm(x, y, N, 16, 3, 109); return [...mul(A, .88 + n * .22), n]; } },
    tela: { tile: .03, px: 64, bump: .8, f(x, y, N, A) { const b = (((x >> 1) + (y >> 1)) & 1), w = b ? .62 : .38, n = fbm(x, y, N, 8, 2, 113); return [...mul(A, .88 + w * .18 + (n - .5) * .12), w]; } },
    cordura: { tile: .1, px: 128, bump: 1.5, f(x, y, N, A, B) {   // giubbotto: nylon pesante a cesto e fettucce cucite
      const b = (((x >> 1) + (y >> 1)) & 1), t = (y % 32), web = t < 11, stitch = web && ((x % 32) < 2), n = fbm(x, y, N, 8, 2, 127);
      let c = mul(A, .86 + b * .1 + (n - .5) * .1); let h = b * .4; if (web) { c = mul(B, .9 + ((t === 0 || t === 10) ? -.25 : 0) + ((x >> 2) & 1) * .03); h = .9; } if (stitch) { c = mul(B, .6); h = .5; }
      return [...c, h]; } },
    gomma: { tile: .08, px: 64, bump: .3, f(x, y, N, A) { const n = fbm(x, y, N, 16, 2, 131); return [...mul(A, .92 + n * .12), n]; } },
    spugna: { tile: .02, px: 32, bump: 1.2, f(x, y, N, A) { const n = fbm(x, y, N, 16, 1, 137); return [...mul(A, .8 + n * .3), n]; } },
    etnico: { tile: .3, px: 128, bump: .6, f(x, y, N, A, B, C) {   // poncho: fasce con rombi e greche
      const yy = y % 128, j = TESS.tela.f(x, y, N, [1, 1, 1]), k = lum(j) ;
      let c = A;
      if (yy < 6 || (yy >= 58 && yy < 64)) c = C;
      else if (yy >= 10 && yy < 30) { const d = Math.abs(((x % 20) + 20) % 20 - 10) + Math.abs(yy - 20); c = d < 7 ? B : d < 9 ? C : A; }
      else if (yy >= 34 && yy < 40) c = ((x >> 2) & 1) ? B : C;
      else if (yy >= 80 && yy < 96) { const z = Math.abs(((x % 16) + 16) % 16 - 8); c = Math.abs((yy - 80) - z * 2) < 3 ? B : A; }
      return [...mul(c, .8 + k * .3), k]; } },
    paisley: { tile: .1, px: 64, bump: .3, f(x, y, N, A, B, C) {
      let c = A;
      for (let i = 0; i < 4; i++) { const cx = hs(i, 11) * 64, cy = hs(i, 13) * 64, R = 7 + hs(i, 17) * 3, a = hs(i, 19) * 6;
        for (const [ox, oy] of [[0, 0], [64, 0], [-64, 0], [0, 64], [0, -64]]) { const dx = x - cx - ox, dy = y - cy - oy, u = dx * Math.cos(a) + dy * Math.sin(a), v = -dx * Math.sin(a) + dy * Math.cos(a);
          const r = Math.hypot(u, v * (1 + Math.max(0, u) / R)); if (r < R) c = r < R * .45 ? C : r < R * .6 ? A : B; } }
      if (hs(x * 3, y * 7) < .02) c = C;
      return [...mul(c, .95 + fbm(x, y, N, 8, 1, 151) * .1), .5]; } },
    regimental: { tile: .09, px: 64, bump: .3, f(x, y, N, A, B, C) {   // cravatta a righe diagonali
      const d = ((x + y) % 64 + 64) % 64; let c = A; if (d < 10) c = B; else if (d >= 13 && d < 16) c = C; return [...mul(c, .94 + (((x + y) & 1) ? .05 : 0)), .5]; } },
    galles: { tile: .12, px: 128, bump: .5, f(x, y, N, A, B, C) {   // principe di Galles: quadri a pied-de-poule e righe sottili
      const hx = (x & 63) < 24, hy = (y & 63) < 24, ck = (((x >> 1) + (y >> 1)) & 3) < 2;
      let c = hx && hy ? (ck ? B : A) : hx || hy ? (((x + y) & 3) < 2 ? B : A) : A; if ((x & 63) === 40 || (y & 63) === 40) c = C;
      return [...mul(c, .95 + fbm(x, y, N, 8, 2, 171) * .08), .5]; } },
    pied: { tile: .04, px: 32, bump: .4, f(x, y, N, A, B) {   // pied-de-poule
      const u = x & 15, v = y & 15, ch = (u < 8) === (v < 8), tooth = (u >= 8 && v < 8 && (u - 8) + v < 8) || (u < 8 && v >= 8 && u + (v - 8) > 7);
      return [...((ch !== tooth) ? B : A), .5]; } },
  };
  // la cache delle texture: per tessuto e colori
  const TEX = new Map();
  function texFor(fab, A, B, C) {
    const key = fab + A + B + C; let t = TEX.get(key); if (t) return t;
    const F = TESS[fab] || TESS.cotone, N = F.px, cv = document.createElement('canvas'); cv.width = cv.height = N;
    const bv = document.createElement('canvas'); bv.width = bv.height = N;
    const cx = cv.getContext('2d'), bx = bv.getContext('2d'), id = cx.createImageData(N, N), ib = bx.createImageData(N, N);
    const a = rgb(A), b = rgb(B), c = rgb(C);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const p = F.f(x, y, N, a, b, c), i = (y * N + x) * 4;
      id.data[i] = cl(p[0] * 255, 0, 255); id.data[i + 1] = cl(p[1] * 255, 0, 255); id.data[i + 2] = cl(p[2] * 255, 0, 255); id.data[i + 3] = 255;
      const h = cl(p[3], 0, 1) * 255; ib.data[i] = ib.data[i + 1] = ib.data[i + 2] = h; ib.data[i + 3] = 255;
    }
    cx.putImageData(id, 0, 0); bx.putImageData(ib, 0, 0);
    const mk = c0 => { const T = new THREE.CanvasTexture(c0); T.wrapS = T.wrapT = THREE.RepeatWrapping; T.magFilter = THREE.NearestFilter; T.minFilter = THREE.LinearMipmapLinearFilter; T.anisotropy = 4; T.repeat.set(1 / F.tile, 1 / F.tile); return T; };
    t = { map: mk(cv), bump: mk(bv), F }; TEX.set(key, t); return t;
  }
  const MATS = new Map();
  // materiale di un tessuto: Lambert (come il resto dei personaggi), colori per vertice = ombre cotte (pieghe, orli, contatto)
  function fabMat(fab, A, B, C, opt) {
    opt = opt || {}; const key = [fab, A, B, C, opt.lucido || 0, opt.vc === false ? 0 : 1].join('|'); let m = MATS.get(key); if (m) return m;
    const t = texFor(fab, A, B || A, C || A);
    m = new THREE.MeshLambertMaterial({ map: t.map, bumpMap: t.bump, bumpScale: t.F.bump * .0012, vertexColors: opt.vc !== false, side: THREE.DoubleSide });
    m.emissive = new THREE.Color(A).multiplyScalar(.16 + (opt.lucido || 0) * .1);   // [inverno] i personaggi si staccano dallo sfondo (come models.js)
    m.userData.sartoria = true; MATS.set(key, m); return m;
  }
  // le stampe delle magliette (disegni inventati, niente marchi veri): una tela 128 px, uv 0..1 sulla toppa
  const STAMPE = ['faro', 'onda', 'stella', 'gabbiani', 'cuore', 'teschio', 'ottantasei', 'tramonto'];
  function printMat(kind, base) {
    const key = 'print|' + kind + '|' + base; let m = MATS.get(key); if (m) return m;
    const N = 128, cv = document.createElement('canvas'); cv.width = cv.height = N; const x = cv.getContext('2d');
    x.fillStyle = base; x.fillRect(0, 0, N, N); const dark = lum(rgb(base)) > .5, ink = dark ? '#1e1c22' : '#f0ece0', acc = '#e8583a', acc2 = '#2aa8b8', gold = '#e8c040';
    x.lineJoin = 'round'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const txt = (t, y, sz, c) => { x.font = `bold ${sz}px monospace`; x.fillStyle = c; x.fillText(t, N / 2, y); };
    switch (kind) {
      case 'faro': x.fillStyle = acc2; x.beginPath(); x.arc(64, 60, 40, 0, Math.PI * 2); x.fill(); x.fillStyle = ink; x.beginPath(); x.moveTo(56, 92); x.lineTo(72, 92); x.lineTo(68, 40); x.lineTo(60, 40); x.fill(); x.fillStyle = acc; x.fillRect(58, 52, 12, 6); x.fillRect(57, 70, 14, 6); x.fillStyle = gold; x.fillRect(59, 32, 10, 8); x.beginPath(); x.moveTo(69, 36); x.lineTo(110, 26); x.lineTo(110, 44); x.fill(); txt('PORTO VECCHIO', 112, 13, ink); break;
      case 'onda': x.strokeStyle = acc2; x.lineWidth = 9; for (let k = 0; k < 3; k++) { x.beginPath(); for (let i = 0; i <= 100; i++) { const xx = 14 + i, yy = 50 + k * 16 + Math.sin(i / 100 * Math.PI * 3) * 9; i ? x.lineTo(xx, yy) : x.moveTo(xx, yy); } x.stroke(); } txt('RISACCA', 104, 18, ink); break;
      case 'stella': { x.fillStyle = acc; x.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 18 : 44, a = -Math.PI / 2 + i * Math.PI / 5; x.lineTo(64 + Math.cos(a) * r, 58 + Math.sin(a) * r); } x.fill(); txt('86', 110, 20, ink); break; }
      case 'gabbiani': txt('I GABBIANI', 30, 15, ink); x.fillStyle = gold; x.beginPath(); x.moveTo(70, 44); x.lineTo(50, 76); x.lineTo(64, 76); x.lineTo(56, 104); x.lineTo(82, 66); x.lineTo(68, 66); x.lineTo(76, 44); x.fill(); txt('TOUR 1986', 116, 11, ink); break;
      case 'cuore': x.fillStyle = acc; x.beginPath(); x.moveTo(64, 92); x.bezierCurveTo(10, 56, 36, 20, 64, 44); x.bezierCurveTo(92, 20, 118, 56, 64, 92); x.fill(); txt("AMO L'ISOLA", 112, 13, ink); break;
      case 'teschio': x.fillStyle = ink; x.beginPath(); x.arc(64, 54, 30, 0, Math.PI * 2); x.fill(); x.fillRect(48, 70, 32, 22); x.fillStyle = base; x.beginPath(); x.arc(52, 54, 8, 0, Math.PI * 2); x.arc(76, 54, 8, 0, Math.PI * 2); x.fill(); for (let i = 0; i < 4; i++) x.fillRect(51 + i * 8, 82, 3, 10); txt('ONDA NERA', 112, 13, acc); break;
      case 'ottantasei': x.strokeStyle = ink; x.lineWidth = 3; x.strokeRect(14, 14, 100, 100); txt('86', 62, 58, acc); txt('ATLETICA', 104, 13, ink); break;
      case 'tramonto': { const g = x.createLinearGradient(0, 20, 0, 96); g.addColorStop(0, '#e83a6a'); g.addColorStop(1, '#f0a83a'); x.fillStyle = g; x.beginPath(); x.arc(64, 70, 44, Math.PI, 0); x.fill(); x.fillStyle = base; for (let i = 0; i < 5; i++) x.fillRect(16, 46 + i * 6, 96, 2 + i * .6); x.fillStyle = ink; x.fillRect(84, 34, 4, 38); for (let i = 0; i < 5; i++) { x.beginPath(); x.ellipse(86 + Math.cos(i * 1.3) * 12, 34 + Math.sin(i * 1.3) * 5, 14, 3, i * 1.3, 0, Math.PI * 2); x.fill(); } txt('ESTATE 86', 110, 14, ink); break; }
    }
    // la stampa è un po' consumata: qualche pixel del fondo che riaffiora
    const id = x.getImageData(0, 0, N, N), b = rgb(base); for (let i = 0; i < N * N; i++) if (hs(i, 991) < .08) { id.data[i * 4] = b[0] * 255; id.data[i * 4 + 1] = b[1] * 255; id.data[i * 4 + 2] = b[2] * 255; } x.putImageData(id, 0, 0);
    const T = new THREE.CanvasTexture(cv); T.magFilter = THREE.NearestFilter; T.minFilter = THREE.LinearMipmapLinearFilter;
    m = new THREE.MeshLambertMaterial({ map: T, vertexColors: true, side: THREE.DoubleSide }); m.emissive = new THREE.Color(base).multiplyScalar(.16); MATS.set(key, m); return m;
  }
  function solidMat(col, emi) { const key = 'solid|' + col + '|' + (emi || 0); let m = MATS.get(key); if (m) return m; m = new THREE.MeshLambertMaterial({ color: col, vertexColors: true, side: THREE.DoubleSide }); m.emissive = new THREE.Color(col).multiplyScalar(emi || .22); MATS.set(key, m); return m; }

  // =====================================================================================
  // IL CORPO: misura una volta per modello, nello spazio del personaggio a riposo (y in alto, davanti +z, sinistra +x)
  // =====================================================================================
  const BODY = new Map();
  const BONES = ['Hips', 'Abdomen', 'Torso', 'Chest', 'Neck', 'Head', 'ShoulderL', 'ShoulderR', 'UpperArmL', 'UpperArmR', 'LowerArmL', 'LowerArmR', 'WristL', 'WristR', 'UpperLegL', 'UpperLegR', 'LowerLegL', 'LowerLegR', 'FootL', 'FootR'];
  const SKIP = /^(Eye.*|Eyebrows|Moustache)$/i, HAIR = /^Hair/i;
  function body(g, PARTI) {
    const key = g.userData.model || 'x'; let B = BODY.get(key); if (B) return B;
    g.updateMatrixWorld(true); const gi = new THREE.Matrix4().copy(g.matrixWorld).invert();
    const srcs = []; g.traverse(o => { if (o.isSkinnedMesh && !o.userData.vesti) srcs.push(o); });
    if (!srcs.length) return null;
    const ref = srcs.find(o => /Body/i.test(o.name)) || srcs[0];
    const rel = new THREE.Matrix4().multiplyMatrices(gi, ref.matrixWorld);   // dalla mesh (locale) al personaggio
    const names = ref.skeleton.bones.map(b => b.name), names0 = names.join();
    const P = [], part = [], side = [], wts = [], hair = [], head = [], srcOf = [], idxOf = [];
    const pn = Object.keys(PARTI), v = new THREE.Vector3(), M = new THREE.Matrix4();
    srcs.forEach((src, si) => {
      const geo = src.userData.geo0 || src.geometry, pos = geo.attributes.position, sI = geo.attributes.skinIndex, sW = geo.attributes.skinWeight; if (!pos || !sI) return;
      const ms = Array.isArray(src.material) ? src.material : [src.material], mname = (ms[0] && ms[0].name) || '';
      if (SKIP.test(mname)) return;
      M.multiplyMatrices(gi, src.matrixWorld); const bn = src.skeleton.bones, same = bn.map(b => b.name).join() === names0;
      const isHair = HAIR.test(mname) || (mname === 'Worker_Yellow' && /Head/i.test(src.name)), isHead = /Head/i.test(src.name);
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(M);
        let best = -1, bw = -1; const w = [];
        for (let k = 0; k < 4; k++) { const ix = sI.getComponent ? sI.getComponent(i, k) : [sI.getX(i), sI.getY(i), sI.getZ(i), sI.getW(i)][k], wk = [sW.getX(i), sW.getY(i), sW.getZ(i), sW.getW(i)][k]; const nm = bn[ix] ? bn[ix].name : ''; if (wk > 0) w.push([same ? ix : names.indexOf(nm), wk]); if (wk > bw) { bw = wk; best = ix; } }
        const bnm = bn[best] ? bn[best].name : ''; let pt = pn.find(p => PARTI[p].test(bnm)) || null;
        if (bnm === 'Body') pt = /Legs/i.test(src.name) ? 'bacino' : 'torso';
        if (isHair || mname === 'Worker_Yellow') { hair.push(v.x, v.y, v.z); continue; }
        if (isHead && !pt) { head.push(v.x, v.y, v.z); continue; }
        if (/Head|Neck/.test(bnm) && !pt) { head.push(v.x, v.y, v.z); continue; }
        P.push(v.x, v.y, v.z); part.push(pt); side.push(/L$/.test(bnm) ? 1 : /R$/.test(bnm) ? -1 : 0); wts.push(w); srcOf.push(si); idxOf.push(i);
      }
    });
    // le articolazioni ricavate dai vertici (dove i pesi di un osso e di suo padre si mescolano): coerenti con la geometria
    // (le matrici delle ossa del kit non stanno nello stesso spazio dei vertici)
    const bm = {}, bmat = {}, par = {}, JA = {}, CA = {};
    ref.skeleton.bones.forEach(b => { par[b.name] = b.parent && b.parent.isBone ? b.parent.name : null; bmat[b.name] = new THREE.Matrix4().multiplyMatrices(gi, b.matrixWorld); });
    for (let i = 0; i < wts.length; i++) { const w = wts[i], x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
      w.forEach(([bi, wk]) => { const n = names[bi]; if (!n) return; const c = CA[n] || (CA[n] = [0, 0, 0, 0]); c[0] += x * wk; c[1] += y * wk; c[2] += z * wk; c[3] += wk; });
      for (let a = 0; a < w.length; a++) for (let b = 0; b < w.length; b++) { if (a === b) continue; const na = names[w[a][0]], nb = names[w[b][0]]; if (!na || par[na] !== nb) continue; const k = Math.min(w[a][1], w[b][1]); if (k < .05) continue; const j = JA[na] || (JA[na] = [0, 0, 0, 0]); j[0] += x * k; j[1] += y * k; j[2] += z * k; j[3] += k; } }
    const cen = n => CA[n] && CA[n][3] > 0 ? new THREE.Vector3(CA[n][0] / CA[n][3], CA[n][1] / CA[n][3], CA[n][2] / CA[n][3]) : null;
    BONES.forEach(n => { const j = JA[n]; if (j && j[3] > .3) bm[n] = new THREE.Vector3(j[0] / j[3], j[1] / j[3], j[2] / j[3]); });
    BONES.forEach(n => { if (bm[n]) return; const c = cen(n), pc = par[n] && cen(par[n]); if (c && pc) bm[n] = c.clone().lerp(pc, .5); else if (c) bm[n] = c; });
    // ossa senza vertici propri (in qualche modello la spalla): si ricavano dalle vicine
    for (const sd of ['L', 'R']) { if (!bm['Shoulder' + sd] && bm['UpperArm' + sd]) bm['Shoulder' + sd] = bm['UpperArm' + sd].clone().lerp(bm.Neck || bm.Chest || bm['UpperArm' + sd], .45);
      if (!bm['Wrist' + sd] && bm['LowerArm' + sd] && bm['UpperArm' + sd]) bm['Wrist' + sd] = bm['LowerArm' + sd].clone().multiplyScalar(2).sub(bm['UpperArm' + sd]); }
    // la testa: il punto alla base del cranio; il bacino: il centro tra le anche
    if (bm.UpperLegL && bm.UpperLegR) { const h = bm.UpperLegL.clone().lerp(bm.UpperLegR, .5); h.y += .03; bm.Hips = bm.Hips && Math.abs(bm.Hips.y - h.y) < .15 ? bm.Hips : h; bm.Hips.x = h.x; }
    B = { key, P: new Float32Array(P), part, side, wts, hair: new Float32Array(hair), head: new Float32Array(head), srcOf, idxOf, bones: bm, bmat, names, rel, reli: rel.clone().invert(), tubes: {}, geos: new Map() };
    // misure utili: caviglia, inforcatura, vita, base del collo
    const n = part.length, yOf = i => B.P[i * 3 + 1];
    let ank = {};
    for (const s of ['L', 'R']) { const sg = s === 'L' ? 1 : -1; let sx = 0, sz = 0, c = 0; for (let i = 0; i < n; i++) if (part[i] === 'polpacci' && side[i] === sg && yOf(i) > .085 && yOf(i) < .115) { sx += B.P[i * 3]; sz += B.P[i * 3 + 2]; c++; }
      const ll = bm['LowerLeg' + s]; ank[s] = new THREE.Vector3(c ? sx / c : ll.x, .1, c ? sz / c : ll.z); }
    B.ankle = ank;
    let cy = 9; for (let i = 0; i < n; i++) if (part[i] === 'bacino' && Math.abs(B.P[i * 3] - (bm.Hips ? bm.Hips.x : 0)) < .03) cy = Math.min(cy, yOf(i));
    B.crotch = cy < 9 ? cy : (bm.UpperLegL ? bm.UpperLegL.y - .1 : .8);
    B.waist = bm.Abdomen ? bm.Abdomen.y + .02 : B.crotch + .18;
    B.neck = bm.Neck ? bm.Neck.y - .012 : 1.45;
    BODY.set(key, B); return B;
  }

  // =====================================================================================
  // I TUBI: un asse (spline per le ossa), sezioni misurate sui vertici del corpo
  // =====================================================================================
  const RINGS = 64;   // settori della misura (poi si ricampiona)
  function axisOf(B, kind) {
    const b = B.bones, V = (x, y, z) => new THREE.Vector3(x, y, z);
    if (kind === 'tronco' || kind === 'gonna' || kind === 'bacino') {   // asse dritto, verticale, al centro del busto (in pianta)
      let sx = 0, sz = 0, c = 0; for (let i = 0; i < B.part.length; i++) if (B.part[i] === 'torso' || B.part[i] === 'bacino') { sx += B.P[i * 3]; sz += B.P[i * 3 + 2]; c++; }
      const x = c ? sx / c : b.Hips.x, z = c ? sz / c : b.Hips.z; return [V(x, .02, z), V(x, .8, z), V(x, 1.75, z)]; }
    const s = kind.slice(-1);
    if (/^manica/.test(kind)) { const sh = b['Shoulder' + s], ua = b['UpperArm' + s], la = b['LowerArm' + s], wr = b['Wrist' + s]; const d = wr.clone().sub(la).normalize(); return [sh.clone().lerp(ua, .6), ua, la, wr, wr.clone().addScaledVector(d, .05)]; }
    if (/^gamba/.test(kind)) { const sg = s === 'L' ? 1 : -1, h = b.Hips, ul = b['UpperLeg' + s], ll = b['LowerLeg' + s], an = B.ankle[s]; return [V(h.x + sg * .075, B.waist + .06, h.z), V(ul.x * .7 + h.x * .3, ul.y - .02, ul.z), ll, an, V(an.x, an.y - .03, an.z)]; }
  }
  function inSet(B, i, kind) {
    const p = B.part[i]; if (!p) return false; const y = B.P[i * 3 + 1];
    if (kind === 'tronco') { if (p === 'braccia') { const j = B.bones['UpperArm' + (B.side[i] > 0 ? 'L' : 'R')]; return j && Math.hypot(B.P[i * 3] - j.x, B.P[i * 3 + 1] - j.y, B.P[i * 3 + 2] - j.z) < .055; } return p === 'torso' || p === 'bacino' || p === 'collo'; }
    if (kind === 'bacino') return p === 'bacino' || p === 'torso' && y < B.waist + .1 || ((p === 'cosce') && y > B.crotch - .12);
    if (kind === 'gonna') return p === 'torso' || p === 'bacino' || p === 'collo' || ((p === 'cosce' || p === 'polpacci') && y < B.bones.Hips.y - .04);
    const s = kind.slice(-1) === 'L' ? 1 : -1;
    if (/^manica/.test(kind)) return (p === 'braccia' || p === 'avambracci') && B.side[i] === s;
    if (/^gamba/.test(kind)) { if (p === 'bacino') return (B.P[i * 3] - B.bones.Hips.x) * s > -.012 && y < B.waist + .08; return (p === 'cosce' || p === 'polpacci') && B.side[i] === s; }
    return false;
  }
  // il tubo: campioni dell'asse ogni ~1 cm con riferimenti che non ruotano (trasporto parallelo), raggio R[campione][settore]
  function tube(B, kind) {
    if (B.tubes[kind]) return B.tubes[kind];
    const pts = axisOf(B, kind), curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal'), L = curve.getLength(), ns = Math.max(8, Math.round(L / .01)), S = curve.getSpacedPoints(ns);
    const T = [], F = [], Sd = [];
    for (let i = 0; i <= ns; i++) { const t = (i === ns ? S[i].clone().sub(S[i - 1]) : S[i + 1].clone().sub(S[i])).normalize(); T.push(t); }
    // davanti di riferimento: +z (per il tronco), poi trasporto parallelo
    let f = new THREE.Vector3(0, 0, 1); f.addScaledVector(T[0], -f.dot(T[0])); if (f.lengthSq() < 1e-6) f.set(1, 0, 0); f.normalize();
    for (let i = 0; i <= ns; i++) { if (i) { const q = new THREE.Quaternion().setFromUnitVectors(T[i - 1], T[i]); f = f.clone().applyQuaternion(q); f.addScaledVector(T[i], -f.dot(T[i])).normalize(); } F.push(f); Sd.push(new THREE.Vector3().crossVectors(T[i], f).normalize()); }
    // per le maniche e le gambe il "davanti" segue +z (le cuciture laterali stanno di fianco)
    const R = Array.from({ length: ns + 1 }, () => new Float32Array(RINGS).fill(-1)), seen = [];
    const ds = L / ns, v = new THREE.Vector3(), rv = new THREE.Vector3();
    const proj = p => {   // campione più vicino e coordinate radiali
      let bi = 0, bd = 1e9; for (let i = 0; i <= ns; i += 2) { const d = S[i].distanceToSquared(p); if (d < bd) { bd = d; bi = i; } }
      for (let i = Math.max(0, bi - 2); i <= Math.min(ns, bi + 2); i++) { const d = S[i].distanceToSquared(p); if (d < bd) { bd = d; bi = i; } }
      rv.copy(p).sub(S[bi]); const along = rv.dot(T[bi]); rv.addScaledVector(T[bi], -along);
      const a = Math.atan2(rv.dot(Sd[bi]), rv.dot(F[bi])); return { i: bi, r: rv.length(), a, along };
    };
    const n = B.part.length, onT = new Int16Array(n).fill(-1);
    for (let k = 0; k < n; k++) {
      if (!inSet(B, k, kind)) continue; v.set(B.P[k * 3], B.P[k * 3 + 1], B.P[k * 3 + 2]); const q = proj(v);
      if (Math.abs(q.along) > ds * 1.6 && (q.i === 0 || q.i === ns)) continue;   // oltre le estremità
      const sec = ((Math.round(q.a / (Math.PI * 2) * RINGS) % RINGS) + RINGS) % RINGS; if (q.r > R[q.i][sec]) R[q.i][sec] = q.r; onT[k] = q.i; seen.push(q.i);
    }
    // anelli vuoti e settori vuoti: si riempie (prima lungo il giro, poi lungo l'asse); poi involucro convesso per anello
    const has = R.map(r => r.some(x => x > 0));
    for (const r of R) fillRing(r);
    const first = has.indexOf(true), last = has.lastIndexOf(true);
    for (let i = 0; i <= ns; i++) if (!has[i]) { let a = i - 1; while (a >= 0 && !has[a]) a--; let b = i + 1; while (b <= ns && !has[b]) b++;
      for (let s = 0; s < RINGS; s++) R[i][s] = a < 0 ? R[b][s] : b > ns ? R[a][s] : lerp(R[a][s], R[b][s], (i - a) / (b - a)); }
    // profilo: segue il corpo (spalle, petto, ginocchia), ma senza le valli tra un anello e l'altro.
    // Chiusura morfologica lungo l'asse (massimo su ±2,5 cm, poi minimo): le valli si riempiono, le sporgenze restano nette;
    // poi una lisciatura corta (1 cm) e una leggera lungo il giro; involucro convesso per sezione.
    const w = Math.max(1, Math.round(.025 / ds)), dil = A => A.map((r, i) => { const o = new Float32Array(RINGS); for (let s = 0; s < RINGS; s++) { let m = 0; for (let k = -w; k <= w; k++) m = Math.max(m, A[cl(i + k, 0, ns)][s]); o[s] = m; } return o; });
    const ero = A => A.map((r, i) => { const o = new Float32Array(RINGS); for (let s = 0; s < RINGS; s++) { let m = 9; for (let k = -w; k <= w; k++) m = Math.min(m, A[cl(i + k, 0, ns)][s]); o[s] = m; } return o; });
    let R3 = ero(dil(R));
    const sig = Math.max(1, Math.round(.01 / ds)); R3 = R3.map((r, i) => { const o = new Float32Array(RINGS); for (let s = 0; s < RINGS; s++) { let a = 0, ww = 0; for (let k = -2 * sig; k <= 2 * sig; k++) { const q = Math.exp(-k * k / (2 * sig * sig)); a += R3[cl(i + k, 0, ns)][s] * q; ww += q; } o[s] = Math.max(a / ww, R[i][s] * .99); } return o; });
    R3 = R3.map(r => { const o = new Float32Array(RINGS); for (let s = 0; s < RINGS; s++) o[s] = (r[(s + RINGS - 1) % RINGS] + 2 * r[s] + r[(s + 1) % RINGS]) / 4; return o; });
    for (let i = 0; i <= ns; i++) hull(R3[i]);
    const tb = { kind, S, T, F, Sd, R: R3, ns, L, ds, first, last, onT, proj };
    tb.y = S.map(p => p.y);
    tb.sAtY = y => { let best = 0, bd = 9; for (let i = 0; i <= ns; i++) { const d = Math.abs(S[i].y - y); if (d < bd) { bd = d; best = i; } } return best * ds; };   // per il tronco
    tb.sNear = p => { const q = proj(p); return q.i * ds; };
    B.tubes[kind] = tb; return tb;
  }
  function fillRing(r) {
    const n = r.length, idx = []; for (let i = 0; i < n; i++) if (r[i] > 0) idx.push(i); if (!idx.length) return;
    for (let i = 0; i < n; i++) if (r[i] <= 0) { let a = i, b = i, da = 0, db = 0; while (r[a] <= 0) { a = (a - 1 + n) % n; da++; } while (r[b] <= 0) { b = (b + 1) % n; db++; } r[i] = -lerp(r[a], r[b], da / (da + db)); }
    for (let i = 0; i < n; i++) r[i] = Math.abs(r[i]);
  }
  // involucro convesso della sezione: la stoffa passa sopra le conche (tra le gambe, sotto il seno, lungo la schiena)
  function hull(r) {
    const n = r.length, P = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; P.push([Math.cos(a) * r[i], Math.sin(a) * r[i], i]); }
    const pts = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = []; for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    const H = lo.slice(0, -1).concat(up.slice(0, -1)); if (H.length < 3) return;
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a); let best = r[i];
      for (let k = 0; k < H.length; k++) { const p = H[k], q = H[(k + 1) % H.length], ex = q[0] - p[0], ey = q[1] - p[1], den = dx * ey - dy * ex; if (Math.abs(den) < 1e-9) continue;
        const t = (p[0] * ey - p[1] * ex) / den, u = (p[0] * dy - p[1] * dx) / den; if (t > 0 && u >= -1e-6 && u <= 1 + 1e-6) { best = Math.max(r[i], t); break; } }
      r[i] = best; }
  }
  // raggio interpolato a (s in metri, angolo)
  function radius(tb, s, a) {
    const fi = cl(s / tb.ds, 0, tb.ns), i0 = Math.floor(fi), i1 = Math.min(tb.ns, i0 + 1), ti = fi - i0;
    const fs = ((a / (Math.PI * 2)) * RINGS % RINGS + RINGS) % RINGS, s0 = Math.floor(fs), s1 = (s0 + 1) % RINGS, ts = fs - s0;
    const r0 = lerp(tb.R[i0][s0], tb.R[i0][s1], ts), r1 = lerp(tb.R[i1][s0], tb.R[i1][s1], ts); return lerp(r0, r1, ti);
  }
  function frameAt(tb, s) { const fi = cl(s / tb.ds, 0, tb.ns), i0 = Math.floor(fi), i1 = Math.min(tb.ns, i0 + 1), t = fi - i0;
    return { p: tb.S[i0].clone().lerp(tb.S[i1], t), t: tb.T[i0].clone().lerp(tb.T[i1], t).normalize(), f: tb.F[i0].clone().lerp(tb.F[i1], t).normalize(), sd: tb.Sd[i0].clone().lerp(tb.Sd[i1], t).normalize() }; }
  // il taglio dritto: tra due punti dell'asse la stoffa va in linea retta (non segue polpacci, caviglie, avambracci);
  // dove il corpo sporge oltre la linea, la stoffa passa sopra
  function straight(tb, s, a, sA, sB, kB, body) {
    if (s <= sA) return radius(tb, s, a); const t = cl((s - sA) / Math.max(.01, sB - sA), 0, 1), rl = lerp(radius(tb, sA, a), radius(tb, Math.min(sB, tb.L), a) * kB, t);
    return body === false ? rl : Math.max(rl, radius(tb, s, a) * .985);
  }
  // un tubo "tagliato": stessa linea d'asse, raggi già raddrizzati (così manica, polsino, orlo e bordo usano la stessa misura)
  function cutTube(tb, fn) {
    const v = Object.assign({}, tb); v.R = tb.R.map((r, i) => { const o = new Float32Array(RINGS); for (let k = 0; k < RINGS; k++) o[k] = fn(i * tb.ds, k / RINGS * Math.PI * 2); return o; }); return v;
  }
  // la sezione squadrata: tra la forma del corpo e un rettangolo smussato (superellisse) largo quanto le spalle/fianchi,
  // profondo quanto petto e schiena. k = quanto è "di sartoria" (0 attillato, 1 scatola)
  function boxTube(tb, k) {
    if (k <= 0) return tb; const ext = tb.R.map(r => { let W = 0, Df = 0, Db = 0; for (let q = 0; q < RINGS; q++) { const a = q / RINGS * Math.PI * 2, x = Math.sin(a) * r[q], z = Math.cos(a) * r[q]; W = Math.max(W, Math.abs(x)); if (z > 0) Df = Math.max(Df, z); else Db = Math.max(Db, -z); } return [W, Df, Db]; });
    const n = 3.2;
    return cutTube(tb, (sv, a) => { const i = cl(Math.round(sv / tb.ds), 0, tb.ns), [W, Df, Db] = ext[i], D = Math.cos(a) >= 0 ? Df : Db, r0 = radius(tb, sv, a);
      const rb = 1 / Math.pow(Math.pow(Math.abs(Math.cos(a)) / Math.max(D, .01), n) + Math.pow(Math.abs(Math.sin(a)) / Math.max(W, .01), n), 1 / n); return Math.max(r0, lerp(r0, rb, k)); });
  }
  // punto sulla superficie del capo (off = spessore sopra il corpo)
  function surf(tb, s, a, off, out) {
    const fr = frameAt(tb, s), r = radius(tb, s, a) + off;
    return (out || new THREE.Vector3()).copy(fr.p).addScaledVector(fr.f, Math.cos(a) * r).addScaledVector(fr.sd, Math.sin(a) * r);
  }

  // =====================================================================================
  // PESI: dai vertici del corpo più vicini (dello stesso insieme), mescolati
  // =====================================================================================
  function weightsFor(B, kind) {
    const key = 'W' + kind; if (B[key]) return B[key];
    const n = B.part.length, ids = []; for (let i = 0; i < n; i++) if (inSet(B, i, kind)) ids.push(i);
    const cell = .05, grid = new Map(), kk = (x, y, z) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
    ids.forEach(i => { const k = kk(B.P[i * 3], B.P[i * 3 + 1], B.P[i * 3 + 2]); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(i); });
    const hipsI = B.names.indexOf('Hips');
    const fn = (p, skirt) => {
      const cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell), cz = Math.floor(p.z / cell), best = [];
      for (let rad = 1; rad <= 3 && best.length < 4; rad++) {
        best.length = 0;
        for (let i = -rad; i <= rad; i++) for (let j = -rad; j <= rad; j++) for (let k = -rad; k <= rad; k++) { const a = grid.get(`${cx + i},${cy + j},${cz + k}`); if (!a) continue;
          for (const q of a) { const d = (B.P[q * 3] - p.x) ** 2 + (B.P[q * 3 + 1] - p.y) ** 2 + (B.P[q * 3 + 2] - p.z) ** 2; best.push([d, q]); } }
      }
      if (best.length < 2) for (const q of ids) { const d = (B.P[q * 3] - p.x) ** 2 + (B.P[q * 3 + 1] - p.y) ** 2 + (B.P[q * 3 + 2] - p.z) ** 2; best.push([d, q]); }   // lontano da tutto: si cerca ovunque
      best.sort((a, b) => a[0] - b[0]); const W = new Map();
      best.slice(0, 5).forEach(([d, q]) => { const k = 1 / (Math.sqrt(d) + .01); B.wts[q].forEach(([bi, w]) => W.set(bi, (W.get(bi) || 0) + w * k)); });
      if (skirt > 0 && hipsI >= 0) { let t = 0; W.forEach(w => { t += w; }); W.forEach((w, k) => W.set(k, w * (1 - skirt))); W.set(hipsI, (W.get(hipsI) || 0) + t * skirt); }
      const arr = [...W.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4); let t = 0; arr.forEach(e => { t += e[1]; }); while (arr.length < 4) arr.push([0, 0]);
      return arr.map(e => [e[0], t ? e[1] / t : 0]);
    };
    B[key] = fn; return fn;
  }

  // pesi continui lungo braccia e gambe: il gomito e il ginocchio si piegano come un tubo di stoffa
  // (i pesi del corpo del kit sono a scatti: copiati vertice per vertice, gli anelli della manica si aprono a disco)
  function limbW(B, kind, Ls) {
    const tb = tube(B, kind), s = kind.slice(-1), bi = n => B.names.indexOf(n), ds = tb.ds;
    const W = (list) => { const a = list.filter(e => e[0] >= 0 && e[1] > 1e-4).sort((x, y) => y[1] - x[1]).slice(0, 4); let t = 0; a.forEach(e => { t += e[1]; }); while (a.length < 4) a.push([0, 0]); return a.map(e => [e[0], t ? e[1] / t : 0]); };
    if (/^manica/.test(kind)) {
      const SH = bi('Shoulder' + s), UA = bi('UpperArm' + s), LA = bi('LowerArm' + s), WR = bi('Wrist' + s);
      return p => { const sv = tb.proj(p).i * ds;
        if (sv < Ls.ua) { const t = sm(cl(sv / Math.max(.01, Ls.ua), 0, 1)); return W([[SH, 1 - t], [UA, t]]); }
        const te = sm(cl((sv - (Ls.la - .04)) / .08, 0, 1)), tw = sm(cl((sv - (Ls.wr - .02)) / .04, 0, 1));
        return W([[UA, 1 - te], [LA, te * (1 - tw)], [WR, te * tw]]); };
    }
    const HI = bi('Hips'), UL = bi('UpperLeg' + s), LL = bi('LowerLeg' + s), FT = bi('Foot' + s);
    return p => { const sv = tb.proj(p).i * ds, th = sm(cl(sv / Math.max(.02, Ls.sCr + .04), 0, 1)), tk = sm(cl((sv - (Ls.kn - .05)) / .1, 0, 1)), ta = sm(cl((sv - (Ls.an - .03)) / .06, 0, 1));
      return W([[HI, 1 - th], [UL, th * (1 - tk)], [LL, th * tk * (1 - ta)], [FT, th * tk * ta]]); };
  }

  // =====================================================================================
  // LA COSTRUZIONE: una "pezza" di superficie (griglia s × angolo) → triangoli, normali, uv, ombre
  // =====================================================================================
  function Builder() { return { P: [], N: [], U: [], C: [], SI: [], SW: [], I: [], groups: [], cur: null }; }
  function group(bd, mi) { if (bd.cur && bd.cur.mi === mi) return; bd.cur = { start: bd.I.length, count: 0, mi }; bd.groups.push(bd.cur); }
  function closeGroups(bd) { bd.groups.forEach((g, i) => { g.count = (i + 1 < bd.groups.length ? bd.groups[i + 1].start : bd.I.length) - g.start; }); }
  // griglia: rows × cols punti dati da fn(i, j) → { p, u, v, c, skirt }; wrap = chiusa sul giro
  function grid(bd, rows, cols, fn, wfn, mi, flip) {
    group(bd, mi); const base = bd.P.length / 3, pts = [];
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) { const q = fn(i, j); pts.push(q); bd.P.push(q.p.x, q.p.y, q.p.z); bd.U.push(q.u, q.v); const c = q.c === undefined ? 1 : q.c; bd.C.push(c, c, c);
      const w = wfn(q.p, q.skirt || 0); bd.SI.push(w[0][0], w[1][0], w[2][0], w[3][0]); bd.SW.push(w[0][1], w[1][1], w[2][1], w[3][1]); }
    // normali dalla griglia (differenze centrali), poi orientate verso fuori (q.out)
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      const P = k => pts[k].p, a = P(Math.max(0, i - 1) * cols + j), b = P(Math.min(rows - 1, i + 1) * cols + j), c = P(i * cols + Math.max(0, j - 1)), d = P(i * cols + Math.min(cols - 1, j + 1));
      const n = new THREE.Vector3().crossVectors(b.clone().sub(a), d.clone().sub(c)); if (n.lengthSq() < 1e-14) n.copy(pts[i * cols + j].out || new THREE.Vector3(0, 1, 0)); n.normalize();
      const o = pts[i * cols + j].out; if (o && n.dot(o) < 0) n.negate(); bd.N.push(n.x, n.y, n.z);
    }
    // il verso dei triangoli segue la normale verso fuori (con DoubleSide three gira la normale sul retro)
    let vote = 0; const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), nn = new THREE.Vector3();
    for (let i = 0; i < rows - 1; i++) for (let j = 0; j < cols - 1; j++) { const a = i * cols + j, b = a + 1, c = a + cols; e1.subVectors(pts[c].p, pts[a].p); e2.subVectors(pts[b].p, pts[a].p); nn.crossVectors(e1, e2); const k = base + a; vote += nn.x * bd.N[k * 3] + nn.y * bd.N[k * 3 + 1] + nn.z * bd.N[k * 3 + 2]; }
    const fl = vote < 0;
    for (let i = 0; i < rows - 1; i++) for (let j = 0; j < cols - 1; j++) { const a = base + i * cols + j, b = a + 1, c = a + cols, d = c + 1; if (fl) bd.I.push(a, b, c, b, d, c); else bd.I.push(a, c, b, b, c, d); }
    return pts;
  }
  // un oggetto rigido (bottone, fibbia…) già in coordinate del personaggio, pesato come il punto `at`
  function solid(bd, geo, wfn, at, mi, c) {
    group(bd, mi); const g = geo.index ? geo.toNonIndexed() : geo, pos = g.attributes.position, nor = g.attributes.normal, base = bd.P.length / 3, w = wfn(at, 0);
    for (let i = 0; i < pos.count; i++) { bd.P.push(pos.getX(i), pos.getY(i), pos.getZ(i)); bd.N.push(nor.getX(i), nor.getY(i), nor.getZ(i)); bd.U.push(pos.getX(i) * 9, pos.getY(i) * 9); const k = c === undefined ? 1 : c; bd.C.push(k, k, k);
      bd.SI.push(w[0][0], w[1][0], w[2][0], w[3][0]); bd.SW.push(w[0][1], w[1][1], w[2][1], w[3][1]); bd.I.push(base + i); }
  }
  // orienta e posa una geometria: asse y del pezzo lungo `up`, asse z lungo la normale `n`, in `p`
  function place(geo, p, n, up) {
    const z = n.clone().normalize(), y = up.clone().addScaledVector(z, -up.dot(z)).normalize(), x = new THREE.Vector3().crossVectors(y, z);
    const m = new THREE.Matrix4().makeBasis(x, y, z).setPosition(p); geo.applyMatrix4(m); return geo;
  }
  function toGeometry(bd, B) {
    closeGroups(bd);
    const g = new THREE.BufferGeometry(), n = bd.P.length / 3, P = new Float32Array(bd.P), N = new Float32Array(bd.N), v = new THREE.Vector3();
    const nm = new THREE.Matrix3().getNormalMatrix(B.reli);
    for (let i = 0; i < n; i++) { v.fromArray(P, i * 3).applyMatrix4(B.reli); v.toArray(P, i * 3); v.fromArray(N, i * 3).applyMatrix3(nm).normalize(); v.toArray(N, i * 3); }
    g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(bd.U, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(bd.C, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(bd.SI, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(bd.SW, 4));
    g.setIndex(bd.I); bd.groups.forEach(gr => g.addGroup(gr.start, gr.count, gr.mi)); g.computeBoundingSphere(); g.userData.sartoria = true;
    return g;
  }

  // =====================================================================================
  // I CAPI: il taglio di ogni capo (forma, tessuto, finiture)
  // =====================================================================================
  // cl: classe di strato (0 intimo, 1 base, 2 pantaloni/gonne, 3 maglie, 4 giacche, 5 cappotti, 6 sopra tutto)
  // fab: tessuto; tile: misura della piastrella; c2/c3: colori del motivo; collo: giro|v|camicia|polo|alto|revers|cappuccio|aperto|nessuno
  // fronte: bottoni|doppio|zip|zip_obl|nessuno; tasche: elenco; len (gonne, cappotti): ginocchio|polpaccio|caviglia|coscia
  const D = '#ece8dc';
  const CUT = {
    canotta: { cl: 0, fab: 'costine', collo: 'canotta', smanicato: 1 },
    maglietta: { cl: 1, fab: 'jersey', collo: 'giro' },
    maglietta_righe: { cl: 1, fab: 'righe', c2: D, collo: 'barca' },
    camicia: { cl: 1, fab: 'cotone', collo: 'camicia', fronte: 'bottoni', tasche: ['petto'], polsi: 1 },
    camicia_quadri: { cl: 1, fab: 'tartan', c2: '#1a1a1e', c3: '#d8c890', collo: 'camicia', fronte: 'bottoni', tasche: ['petto2'], polsi: 1 },
    dolcevita: { cl: 1, fab: 'costine', collo: 'alto' },
    maglione: { cl: 3, fab: 'trecce', collo: 'giro', costine: 1, agio: .004 },
    felpa: { cl: 3, fab: 'jersey', collo: 'cappuccio', costine: 1, tasche: ['canguro'], agio: .006 },
    gilet: { cl: 3, fab: 'lana', c2: '#c8b070', c3: '#3a3a30', collo: 'v', fronte: 'bottoni', smanicato: 1, tasche: ['taschini'], orlo: 'punte' },
    grembiule: { cl: 6, fab: 'tela', collo: 'grembiule', davanti: 1, tasche: ['grembiule'], legacci: 1 },
    vestiti: { cl: 1, fab: 'liberty', c2: '#e8d8a0', c3: '#8a3a3a', collo: 'v', gonna: 1, len: 'ginocchio', svasa: .18, cintura: 'stoffa' },
    tuta: { cl: 3, fab: 'tela', collo: 'camicia', fronte: 'zip', tasche: ['petto2', 'fianchi'], cintura: 'stoffa', intera: 1 },
    giacca: { cl: 4, fab: 'spina', collo: 'revers', fronte: 'bottoni', tasche: ['giacca'], orlo: 'giacca', agio: .006 },
    giacca_pelle: { cl: 4, fab: 'pelle', collo: 'revers_pelle', fronte: 'zip_obl', tasche: ['zip'], cintura: 'chiodo', agio: .004, lucido: 1 },
    giubbotto_jeans: { cl: 4, box: .45, fab: 'denim', collo: 'camicia', fronte: 'bottoni_rame', tasche: ['petto2'], polsi: 1, orlo: 'banda', cuciture: '#c8903a', agio: .004 },
    piumino: { cl: 4, fab: 'piumino', collo: 'alto_zip', fronte: 'zip', costine: 1, agio: .012, lucido: 1 },
    cappotto: { cl: 5, fab: 'panno', collo: 'revers', fronte: 'doppio', tasche: ['cappotto'], gonna: 1, len: 'ginocchio', svasa: .18, agio: .008 },
    impermeabile: { cl: 5, fab: 'cotone', collo: 'revers', fronte: 'doppio', tasche: ['cappotto'], gonna: 1, len: 'ginocchio', svasa: .14, cintura: 'trench', spalline: 1, agio: .008 },
    montone: { cl: 5, fab: 'scamosciato', collo: 'montone', fronte: 'bottoni', tasche: ['cappotto'], orlo: 'montone', agio: .01 },
    divisa: { cl: 4, fab: 'panno', collo: 'revers', fronte: 'bottoni_oro', tasche: ['divisa'], cintura: 'cuoio', spalline: 1, agio: .005 },
    giubbotto: { cl: 6, fab: 'cordura', c2: '#2e3826', collo: 'nessuno', smanicato: 1, fronte: 'strappi', agio: .012, corto: 1 },
    scialle: { cl: 6, fab: 'lana', c2: '#c8b070', c3: '#2a2a2a', collo: 'scialle', frange: 1, agio: .01 },
    mutande: { cl: 0, fab: 'jersey', elastico: 1, stretti: 1 },
    calze_nylon: { cl: 0, fab: 'raso', velo: 1, stretti: 1 },
    calzamaglia: { cl: 0, fab: 'costine', stretti: 1 },
    pantaloni: { cl: 2, fab: 'panno', piega: 1, cintura: 'cuoio', tasche: ['oblique'] },
    jeans: { cl: 2, fab: 'denim', risvolto: 1, cintura: 'jeans', tasche: ['jeans'], cuciture: '#c8903a', usura: .35 },
    velluto: { cl: 2, fab: 'velluto', risvolto: 1, cintura: 'cuoio', tasche: ['oblique'] },
    pantaloni_lavoro: { cl: 2, fab: 'tela', risvolto: 1, cintura: 'tela', tasche: ['oblique', 'ginocchio'], usura: .3 },
    pantaloni_grigi: { cl: 2, fab: 'panno', piega: 1, cintura: 'cuoio', banda: '#8a2a2a' },
    gonna: { cl: 2, fab: 'lana', c2: '#c8b070', c3: '#2a2a30', gonna: 1, solo_gonna: 1, len: 'ginocchio', svasa: .12, pieghe: 1 },
    pantaloncini: { cl: 2, fab: 'tela', cintura: 'stoffa' },
    // il guardaroba largo
    polo: { cl: 1, fab: 'pique', collo: 'polo', fronte: 'polo' },
    camicia_hawaii: { cl: 1, fab: 'fiori', c2: D, c3: '#2a5a3a', collo: 'camicia_aperta', fronte: 'bottoni', smaniche: 1 },
    maglia_calcio: { cl: 1, fab: 'righe_v', c2: D, collo: 'polo', numero: 1 },
    felpa_zip: { cl: 3, fab: 'jersey', collo: 'alto_zip', fronte: 'zip', costine: 1, bande: D, tasche: ['fianchi_zip'] },
    giacca_completo: { cl: 4, fab: 'gessato', c2: '#9a9aa4', collo: 'revers', fronte: 'bottoni', tasche: ['giacca', 'pochette'], orlo: 'giacca', agio: .005 },
    pelliccia: { cl: 5, fab: 'maculato', c2: '#2a1a10', c3: '#8a5a2a', collo: 'pelo', gonna: 1, len: 'ginocchio', svasa: .16, agio: .016 },
    pelliccia_volpe: { cl: 5, fab: 'pelo', collo: 'pelo', agio: .02, orlo: 'pelo' },
    poncho: { cl: 6, fab: 'etnico', c2: '#e8c880', c3: '#2a2a30', collo: 'poncho', poncho: 1, frange: 1 },
    vestito_corto: { cl: 1, fab: 'raso', collo: 'v', gonna: 1, len: 'coscia', svasa: .2, lucido: 1, smanicato: 1, spalline_sottili: 1 },
    vestito_lungo: { cl: 1, fab: 'raso', collo: 'barca', gonna: 1, len: 'caviglia', svasa: .25, lucido: 1 },
    vestito_fiori: { cl: 1, fab: 'liberty', c2: '#c83a4a', c3: '#3a6a4a', collo: 'v', gonna: 1, len: 'ginocchio', svasa: .26, smanicato: 1, spalline_sottili: 1, cintura: 'stoffa' },
    tuta_ginnastica: { cl: 3, fab: 'nylon', collo: 'alto_zip', fronte: 'zip', costine: 1, bande: D, intera: 1, lucido: 1 },
    cargo: { cl: 2, fab: 'ripstop', risvolto: 1, cintura: 'tela', tasche: ['oblique', 'cargo'] },
    pantaloni_completo: { cl: 2, fab: 'gessato', c2: '#9a9aa4', piega: 1, cintura: 'cuoio_fine', tasche: ['oblique'] },
    bermuda: { cl: 2, fab: 'madras', c2: '#c83a3a', c3: '#2a4a8a', cintura: 'stoffa', tasche: ['oblique'], risvolto: 1 },
    minigonna: { cl: 2, fab: 'denim', gonna: 1, solo_gonna: 1, len: 'mini', svasa: .05, cuciture: '#c8903a', cintura: 'jeans' },
    leggings: { cl: 0, fab: 'raso', lucido: 1, stretti: 1 },
    // il guardaroba nuovo
    salopette: { cl: 2, fab: 'denim', risvolto: 1, cuciture: '#c8903a', pettorina: 1, tasche: ['jeans'] },
    maglietta_stampa: { cl: 1, fab: 'jersey', collo: 'giro', stampa: 1 },
    giaccone: { cl: 5, fab: 'tela', collo: 'montone', fronte: 'bottoni', tasche: ['cappotto', 'petto2'], polsi: 1, agio: .012 },
    panciotto: { cl: 3, fab: 'gessato', c2: '#9a9aa4', collo: 'v', fronte: 'bottoni', smanicato: 1, tasche: ['taschini'], orlo: 'punte', catenella: 1 },
    pelliccia_lunga: { cl: 5, fab: 'pelo', collo: 'pelo', gonna: 1, len: 'polpaccio', svasa: .12, agio: .02, orlo: 'pelo' },
    camice: { cl: 5, fab: 'cotone', collo: 'revers', fronte: 'bottoni', tasche: ['cappotto', 'petto'], gonna: 1, len: 'ginocchio', svasa: .06, agio: .006 },
    divisa_postino: { cl: 4, fab: 'panno', collo: 'camicia', fronte: 'bottoni_oro', tasche: ['petto2', 'divisa'], cintura: 'cuoio', spalline: 1, agio: .005 },
    giacca_galles: { cl: 4, fab: 'galles', c2: '#5a5a60', c3: '#8a3a3a', collo: 'revers', fronte: 'bottoni', tasche: ['giacca', 'pochette'], orlo: 'giacca', agio: .005 },
    giacca_pied: { cl: 4, fab: 'pied', c2: '#e8e0d0', collo: 'revers', fronte: 'bottoni', tasche: ['giacca'], orlo: 'giacca', agio: .005 },
  };
  // varianti per gli abitanti (lo stesso capo, tagli e motivi diversi): scelte dall'id della persona
  const VARIANTI = {
    maglietta: [{}, { fab: 'righe', c2: D }, { fab: 'righe', c2: '#2a2a30' }, { collo: 'v' }, { fab: 'pique', collo: 'polo', fronte: 'polo' }],
    camicia: [{}, { fab: 'vichy', c2: D }, { fab: 'righe_v', c2: D, tile: .03 }, { fab: 'denim', cuciture: '#c8903a' }, { fab: 'pois', c2: D }],
    camicia_quadri: [{}, { c2: '#1e2a1e', c3: '#c8a83a' }, { fab: 'vichy', c2: '#1a1a1e' }, { fab: 'madras', c2: '#2a3a6a', c3: '#e8c840' }],
    maglione: [{}, { fab: 'costine' }, { fab: 'lana', c2: '#d8c8a0', c3: '#5a3a2a' }, { collo: 'v', fab: 'jersey' }, { fab: 'righe', c2: '#d8d0b8' }, { collo: 'alto' }],
    felpa: [{}, { collo: 'alto_zip', fronte: 'zip', tasche: ['fianchi_zip'] }, { bande: D }],
    giacca: [{}, { fab: 'lana', c2: '#c8b070', c3: '#2a2a30' }, { fab: 'velluto' }, { fab: 'tartan', c2: '#2a2a30', c3: '#c8a050' }, { fronte: 'doppio' }],
    cappotto: [{}, { fab: 'spina' }, { fab: 'lana', c2: '#d8c8a0', c3: '#2a2a2a' }, { fronte: 'bottoni', len: 'polpaccio' }, { collo: 'montone' }],
    pantaloni: [{}, { fab: 'spina' }, { fab: 'gessato', c2: '#8a8a90' }, { fab: 'velluto' }],
    gonna: [{}, { fab: 'tartan', c2: '#1a2a4a', c3: '#c8b070' }, { fab: 'panno' }, { fab: 'velluto', pieghe: 0 }, { len: 'polpaccio' }],
    giubbotto_jeans: [{}, { collo: 'montone' }],
    impermeabile: [{}, { fronte: 'bottoni', cintura: null }],
    jeans: [{}, { usura: .6 }, { usura: .1 }],
    giacca_completo: [{}, { fab: 'panno' }, { fab: 'galles', c2: '#5a5a60', c3: '#7a2a2a' }, { fronte: 'doppio' }, { fab: 'pied', c2: '#d8d0c0' }],
    pantaloni_completo: [{}, { fab: 'panno' }, { fab: 'galles', c2: '#5a5a60', c3: '#7a2a2a' }],
    panciotto: [{}, { fab: 'panno' }, { fab: 'raso' }, { fab: 'galles', c2: '#5a5a60', c3: '#7a2a2a' }],
    polo: [{}, { fab: 'righe', c2: D }, { fab: 'pique', bande: null }],
    salopette: [{}, { fab: 'tela' }, { fab: 'velluto', cuciture: null }],
    giaccone: [{}, { fab: 'lana', c2: '#c8b070', c3: '#2a2a30' }, { fab: 'tartan', c2: '#1a1a1e', c3: '#c83a3a', collo: 'camicia' }, { fab: 'cordura', c2: '#2a2a2a', collo: 'alto_zip', fronte: 'zip' }],
  };

  // la base del collo: dove la sezione del tronco si stringe a quella del collo (non un'altezza fissa)
  function neckY(B) {
    if (B.neckY) return B.neckY; const tb = tube(B, 'tronco'); let rn = 0, c = 0;
    for (let i = 0; i < B.part.length; i++) if (B.part[i] === 'collo') { const q = tb.proj(new THREE.Vector3(B.P[i * 3], B.P[i * 3 + 1], B.P[i * 3 + 2])); rn += q.r; c++; }
    { let sx = 0, sz = 0, k = 0; for (let i = 0; i < B.part.length; i++) if (B.part[i] === 'collo') { sx += B.P[i * 3]; sz += B.P[i * 3 + 2]; k++; } B.neckC = k ? [sx / k, sz / k] : [tb.S[0].x, tb.S[0].z]; }
    rn = c ? rn / c : .06; const mean = i => { let t = 0; for (let k = 0; k < RINGS; k++) t += tb.R[i][k]; return t / RINGS; };
    let y = B.neck; for (let i = tb.ns; i > 0; i--) { if (tb.S[i].y > 1.7 || tb.S[i].y < B.waist + .2) continue; if (mean(i) > rn * 1.35) { y = tb.S[i].y + .012; break; } }
    B.neckR = rn; B.neckY = y; return y;
  }
  // quanto è lungo (s, sull'asse del tubo)
  function lengths(B, tb, kind, C, parti) {
    const b = B.bones, P = new Set(parti);
    if (kind === 'tronco' || kind === 'gonna') {
      const sY = y => tb.sAtY(y);
      let bot = b.Hips.y - .06;
      if (C.corto) bot = B.waist - .02;
      if (P.has('bacino') && !C.gonna) bot = b.Hips.y - (C.cl >= 4 ? .16 : .1);
      if (C.gonna || C.poncho) { const len = C.len || (P.has('polpacci') ? 'polpaccio' : P.has('cosce') ? 'ginocchio' : 'coscia');
        bot = { mini: B.crotch - .08, coscia: B.crotch - .17, ginocchio: b.LowerLegL.y - .04, polpaccio: (b.LowerLegL.y + B.ankle.L.y) / 2 - .02, caviglia: B.ankle.L.y + .07 }[len] || b.LowerLegL.y; }
      if (C.poncho) bot = b.Hips.y - .14;
      let top = neckY(B); if (C.solo_gonna) top = B.waist + .015;
      if (C.infilata && !C.gonna) bot = B.waist - .005;   // infilata nei pantaloni: non scende oltre la cintura
      return { s0: sY(bot), s1: sY(top), yb: bot, yt: top };
    }
    if (/^manica/.test(kind)) {
      const s = kind.slice(-1), ua = tb.sNear(b['UpperArm' + s]), la = tb.sNear(b['LowerArm' + s]), wr = tb.sNear(b['Wrist' + s]);
      let end = wr - .005 + (C.cl <= 1 ? .012 : C.cl >= 4 ? -.012 : 0); if (!P.has('avambracci')) end = ua + (la - ua) * (C.smaniche ? .55 : .5); if (!P.has('braccia') && !P.has('avambracci')) end = 0;
      return { s0: 0, s1: end, ua, la, wr };
    }
    if (/^gamba/.test(kind)) {
      const s = kind.slice(-1), kn = tb.sNear(b['LowerLeg' + s]), an = tb.sNear(B.ankle[s]), cr = tb.sAtY ? 0 : 0;
      const sCr = (() => { let best = 0, bd = 9; for (let i = 0; i <= tb.ns; i++) { const d = Math.abs(tb.S[i].y - (B.crotch - .02)); if (d < bd) { bd = d; best = i; } } return best * tb.ds; })();
      let end = an - .01; if (!P.has('polpacci')) end = P.has('cosce') ? (C.risvolto || /bermuda/.test(C.id || '') ? kn - .01 : sCr + (kn - sCr) * .55) : sCr + .035;
      return { s0: 0, s1: end, kn, an, sCr };
    }
  }

  // il capo: tutte le pezze e le finiture in un'unica geometria a gruppi (materiali: 0 stoffa, 1 secondo colore, 2 metallo, 3 scuro, 4 pelle/cuoio, 5 bianco, 6 costine)
  function cut(B, C, parti, off, seedk) {
    const key = [B.key, C.id, C.var || 0, C.coperto ? 1 : 0, C.infilata ? 1 : 0, C.stretti ? 1 : 0, parti.join(''), Object.keys(off).map(k => k + (off[k] * 1e4 | 0)).join()].join('|');
    let G = B.geos.get(key); if (G) return G;
    const bd = Builder(), P = new Set(parti);
    const agio = C.agio || { 0: .001, 1: .006, 2: .006, 3: .014, 4: .016, 5: .022, 6: .012 }[C.cl] || .004;
    const offAt = (part) => (off[part] || off.torso || .004) + agio;
    // ---------- TRONCO / GONNA ----------
    // i capi che scendono sotto l'inforcatura (giacche, cappotti) si misurano anche sulle gambe, come una gonna
    const longTop = P.has('bacino') && !C.solo_gonna && !C.corto && B.bones.Hips.y - (C.cl >= 4 ? .16 : .1) < B.crotch + .02;
    const trunkKind = C.gonna || C.poncho || longTop ? 'gonna' : 'tronco';
    const wantTrunk = P.has('torso') || P.has('bacino') && (C.gonna || C.solo_gonna);
    let TR = null, Lt = null;
    if (wantTrunk || C.intera && P.has('torso')) {
      const BOX = { 0: 0, 1: .35, 2: .3, 3: .6, 4: .75, 5: .8, 6: .7 }, tb = boxTube(tube(B, trunkKind), C.box !== undefined ? C.box : (BOX[C.cl] || 0)); TR = tb; const Ls = lengths(B, tb, trunkKind, C, parti); Lt = Ls;
      const W = weightsFor(B, trunkKind), hipY = B.bones.Hips.y;
      const cols = 24, front = C.davanti, aRange = front ? [-1.75, 1.75] : [-Math.PI, Math.PI];
      // scollo: la cima di ogni colonna (in s) secondo il collo
      const neckTop = a => {
        const fa = Math.cos(a), c = C.collo; let drop = 0;
        if (c === 'v' || c === 'revers' || c === 'revers_pelle' || c === 'camicia_aperta') { const w = c === 'v' ? .55 : .7, dep = c === 'v' ? .1 : c === 'camicia_aperta' ? .11 : .2; if (Math.abs(a) < w) drop = dep * (1 - Math.abs(a) / w); }
        if (c === 'giro' || c === 'polo' || c === 'camicia' || c === 'alto_zip' || c === 'cappuccio') drop = Math.max(0, fa) * .025;
        if (c === 'barca') drop = Math.max(0, Math.abs(fa)) * .02 - .005;
        if (c === 'canotta' || C.spalline_sottili) { const sideA = Math.abs(Math.abs(a) - Math.PI / 2); drop = sideA < .75 ? 0 : Math.max(0, fa) * .1 + .02; if (sideA >= .75 && fa < 0) drop = .04; }
        if (c === 'grembiule') drop = Math.abs(a) < 1 ? .1 : .25;
        let up = 0; if (c === 'alto') up = .085; if (c === 'alto_zip') up = .05 * (Math.abs(a) < .12 ? .6 : 1);
        if (C.solo_gonna) return Ls.s1;
        return Ls.s1 - drop + up;
      };
      // orlo: punte del gilet, giacca arrotondata davanti, coda della camicia
      const hemBot = a => { let s = Ls.s0; if (C.orlo === 'punte' && Math.abs(a) < .5) s -= .04 * (1 - Math.abs(a) / .5); if (C.orlo === 'giacca' && Math.abs(a) < .35) s += .02 * (1 - Math.abs(a) / .35); return s; };
      const rows = Math.max(10, Math.round((Ls.s1 - Ls.s0) / .022) + 1), seamA = Math.PI;   // cucitura dietro
      // spessore lungo l'altezza: torso sopra, bacino, cosce
      const offY = y => y > hipY + .08 ? offAt('torso') : y > B.crotch ? Math.max(offAt('bacino'), offAt('torso') * .5 + offAt('bacino') * .5) : Math.max(offAt('cosce'), offAt('bacino'));
      const ringC = (() => { let s = 0; for (let k = 0; k < 16; k++) s += radius(tb, (Ls.s0 + Ls.s1) / 2, k / 16 * Math.PI * 2); return s / 16 * Math.PI * 2; })();
      const pts = grid(bd, rows, cols + 1, (i, j) => {
        const a = aRange[0] + (aRange[1] - aRange[0]) * j / cols, s0 = hemBot(a), s1 = neckTop(a), s = lerp(s0, s1, i / (rows - 1));
        const fr = frameAt(tb, s), y = fr.p.y; let o = offY(y);
        if (C.gonna && y < hipY) o += (hipY - y) * (C.svasa || .1);   // la gonna si apre
        if (C.pieghe && y < hipY) o += (.5 + .5 * Math.cos(a * 14)) * .006 * cl((hipY - y) / .25, 0, 1);
        if (C.poncho) o += cl((B.neck - y) / .3, 0, 1) * .1 * (.6 + .4 * Math.abs(Math.sin(a)));   // il poncho scende largo sulle braccia
        const p = surf(tb, s, a, o), out = p.clone().sub(fr.p);
        // ombre cotte: sotto le ascelle, dietro le ginocchia, nelle conche; orlo più scuro
        const c = 1 - .1 * cl(1 - (s - s0) / .03, 0, 1) - .07 * cl(1 - (s1 - s) / .02, 0, 1) - (y > B.waist && y < B.waist + .02 && !C.gonna ? .05 : 0);
        const skirt = (C.gonna || C.poncho || longTop) && y < hipY ? cl((hipY - y) / .25, 0, 1) * (longTop && !C.gonna ? .85 : C.cl >= 5 ? .6 : .3) : 0;
        return { p, out, u: (a - aRange[0]) / (Math.PI * 2) * ringC, v: s, c, skirt };
      }, W, 0);
      // risvolto interno dell'orlo (si vede lo spessore) e lo scollo
      lip(bd, tb, W, aRange, cols, a => hemBot(a), a => { const s = hemBot(a), fr = frameAt(tb, s); let o = offY(fr.p.y); if (C.gonna && fr.p.y < hipY) o += (hipY - fr.p.y) * (C.svasa || .1); if (C.poncho) o += cl((B.neck - fr.p.y) / .3, 0, 1) * .1 * (.6 + .4 * Math.abs(Math.sin(a))); return o; }, -1, C, ringC, hipY);
      lip(bd, tb, W, aRange, cols, a => neckTop(a), a => offY(frameAt(tb, neckTop(a)).p.y), 1, C, ringC, hipY);
      // finiture del tronco
      trunkDetails(bd, B, tb, W, C, Ls, offY, neckTop, hemBot, ringC);
    }
    // ---------- MANICHE ----------
    if (!C.smanicato && !C.solo_gonna && !C.davanti && (P.has('braccia') || P.has('avambracci'))) for (const s of ['L', 'R']) {
      const kind = 'manica' + s, tb0 = tube(B, kind), Ls = lengths(B, tb0, kind, C, parti); if (Ls.s1 <= .02) continue;
      const tb = cutTube(tb0, (sv, a) => sv > Ls.la ? straight(tb0, sv, a, Ls.la, Ls.wr, .78, sv < Ls.wr - .06) : sv > Ls.ua + .03 ? straight(tb0, sv, a, Ls.ua + .03, Ls.la, 1) : radius(tb0, sv, a));
      const W = limbW(B, kind, Ls), cols = 10, rows = Math.max(6, Math.round(Ls.s1 / .025) + 1);
      const ringC = (() => { let t = 0; for (let k = 0; k < 8; k++) t += radius(tb, Ls.s1 * .5, k / 8 * Math.PI * 2); return t / 8 * Math.PI * 2; })();
      const oA0 = s1 => s1 < Ls.ua + (Ls.la - Ls.ua) * .5 ? offAt('braccia') : Math.max(offAt('avambracci'), offAt('braccia') * .6);
      // lo spessore davvero usato (si stringe verso il polso): lo usano anche polsini, bordi e bottoni
      const oA = sv => { const taper = 1 - .55 * cl((sv - Ls.la) / Math.max(.05, Ls.wr - Ls.la), 0, 1); return oA0(sv) * (C.costine || C.polsi ? 1 : .7 + .3 * taper) * taper; };
      grid(bd, rows, cols + 1, (i, j) => {
        const a = -Math.PI + j / cols * Math.PI * 2, sv = Ls.s1 * i / (rows - 1);
        // la cima della manica si chiude a cupola dentro la spalla
        const cap = sv < .015 ? Math.sqrt(1 - Math.pow(1 - sv / .015, 2)) : 1, fr = frameAt(tb, sv);
        let o = oA(sv); if (C.poncho) o += .06;
        const elbow = Math.exp(-Math.pow((sv - Ls.la) / .03, 2)), fold = 0;
        const taper = 1 - .55 * cl((sv - Ls.la) / Math.max(.05, Ls.wr - Ls.la), 0, 1), r = (radius(tb, sv, a) + o + fold) * (.6 + .4 * cap), p = fr.p.clone().addScaledVector(fr.f, Math.cos(a) * r).addScaledVector(fr.sd, Math.sin(a) * r);
        const c = (1 - .12 * cl(1 - (Ls.s1 - sv) / .02, 0, 1)) * (1 - elbow * .08 * Math.max(0, -Math.cos(a))) * (1 - .1 * cl(1 - Math.abs(a - (s === 'L' ? -Math.PI / 2 : Math.PI / 2)) / .9, 0, 1) * cl(1 - sv / .12, 0, 1));   // l'interno della manica sotto l'ascella più scuro
        return { p, out: p.clone().sub(fr.p), u: (a + Math.PI) / (Math.PI * 2) * ringC, v: sv, c };
      }, W, 0);
      sleeveDetails(bd, B, tb, W, C, Ls, oA, s, ringC);
    }
    // ---------- BACINO DEI PANTALONI: un pezzo solo dalla vita all'inforcatura (niente fascia, niente onda) ----------
    const wantLegs = !C.gonna && !C.davanti && P.has('bacino');
    if (wantLegs) {
      const tb = tube(B, 'bacino'), W = weightsFor(B, 'bacino'), cols = 24, ob = offAt('bacino') + .002;
      const sTop = tb.sAtY(B.waist + .035), bot = a => { const side = Math.abs(Math.sin(a)); return tb.sAtY(B.crotch + .005 - .075 * Math.pow(side, 1.5)); };
      const rows = Math.max(6, Math.round((sTop - tb.sAtY(B.crotch - .07)) / .02) + 1), ringC = (() => { let t = 0; for (let k = 0; k < 12; k++) t += radius(tb, tb.sAtY(B.waist - .05), k / 12 * Math.PI * 2); return t / 12 * Math.PI * 2; })();
      grid(bd, rows, cols + 1, (i, j) => { const a = -Math.PI + j / cols * Math.PI * 2, s0 = bot(a), sv = lerp(s0, sTop, i / (rows - 1)), fr = frameAt(tb, sv), p = surf(tb, sv, a, ob);
        const c = 1 - .1 * cl(1 - (sv - s0) / .02, 0, 1) - .1 * Math.pow(Math.max(0, Math.abs(Math.cos(a))), 6) * cl(1 - (sv - s0) / .05, 0, 1);
        return { p, out: p.clone().sub(fr.p), u: (a + Math.PI) / (Math.PI * 2) * ringC, v: sv, c }; }, W, 0);
      pelvisDetails(bd, B, tb, W, C, ob, sTop, bot, ringC);
    }
    // ---------- GAMBE ----------
    if (wantLegs && !(C.intera && !P.has('cosce') && !P.has('bacino'))) for (const s of ['L', 'R']) {
      const kind = 'gamba' + s, tb0 = tube(B, kind), Ls = lengths(B, tb0, kind, C, parti);
      const tb = cutTube(tb0, (sv, a) => { const sK = Ls.kn, sH = Ls.sCr + .03; return sv < sH ? radius(tb0, sv, a) : sv < sK ? straight(tb0, sv, a, sH, sK, C.stretti ? 1 : 1.06) : (sv > Ls.an - .1 ? straight(tb0, sv, a, sK, Ls.an, C.stretti ? .82 : 1.02, false) : straight(tb0, sv, a, sK, Ls.an, C.stretti ? .82 : 1.02)); });
      const W = limbW(B, kind, Ls), cols = 12, rows = Math.max(8, Math.round(Ls.s1 / .028) + 1), sg = s === 'L' ? 1 : -1;
      const ringC = (() => { let t = 0; for (let k = 0; k < 8; k++) t += radius(tb, Ls.s1 * .5, k / 8 * Math.PI * 2); return t / 8 * Math.PI * 2; })();
      const oL = sv => sv < Ls.sCr + .03 ? offAt('bacino') : sv < Ls.kn ? Math.max(offAt('cosce'), offAt('bacino') * .5) : Math.max(offAt('polpacci'), offAt('cosce') * .6);
      const yTop = B.crotch + .035, sTop = a => { let lo = 0, hi = .3; for (let k = 0; k < 18; k++) { const m = (lo + hi) / 2; if (surf(tb, m, a, 0).y > yTop) lo = m; else hi = m; } return lo; };
      const S0 = []; for (let j = 0; j <= cols; j++) S0.push(sTop(-Math.PI + j / cols * Math.PI * 2));
      grid(bd, rows, cols + 1, (i, j) => {
        const a = -Math.PI + j / cols * Math.PI * 2, sv = lerp(S0[j], Ls.s1, i / (rows - 1)), fr = frameAt(tb, sv);
        const knee = Math.exp(-Math.pow((sv - Ls.kn) / .035, 2)), fold = 0;
        const ank = 0;
        const crease = C.piega ? Math.pow(Math.max(0, Math.cos(a)), 40) * .004 : 0;
        const rb = radius(tb, sv, a);
        const r = rb + oL(sv) + fold + ank + crease, p = fr.p.clone().addScaledVector(fr.f, Math.cos(a) * r).addScaledVector(fr.sd, Math.sin(a) * r);
        const inner = cl(1 - Math.abs(a - (-sg * Math.PI / 2)) / .8, 0, 1) * cl(1 - (sv - Ls.sCr) / .15, 0, 1);   // l'interno coscia in ombra
        const c = (1 - .12 * cl(1 - (Ls.s1 - sv) / .02, 0, 1)) * (1 - knee * .08 * Math.max(0, -Math.cos(a))) * (1 - .14 * inner) * (C.usura ? 1 : 1);
        return { p, out: p.clone().sub(fr.p), u: (a + Math.PI) / (Math.PI * 2) * ringC, v: sv, c };
      }, W, 0);
      legDetails(bd, B, tb, W, C, Ls, oL, s, ringC);
    }
    // ---------- PETTORINA E BRETELLE (salopette) ----------
    if (C.pettorina) {
      const T0 = tube(B, 'tronco'), WT = weightsFor(B, 'tronco'), sW = T0.sAtY(B.waist - .01), sC = T0.sAtY(B.bones.Chest.y + .03), ob = offAt('torso') + .002;
      patch(bd, T0, WT, (u) => lerp(-.72, .72, u), (u, v) => lerp(sW, sC, v), () => ob, .0015, 0, { rows: 10, cols: 8, shade: (u, v) => v > .92 || u < .05 || u > .95 ? .78 : 1 });
      patch(bd, T0, WT, (u) => lerp(-.32, .32, u), (u, v) => lerp(sC - .1, sC - .02, v), () => ob, .004, 0, { rows: 4, cols: 5 });   // il taschino della pettorina
      const sT = T0.sAtY(neckY(B) - .03);
      for (const sd of [-1, 1]) {
        const pts = [surf(T0, sC - .005, sd * .6, ob + .003), surf(T0, sT, sd * .75, ob + .004), surf(T0, sT + .01, sd * 1.6, ob + .005), surf(T0, sT - .01, sd * 2.5, ob + .004), surf(T0, T0.sAtY(B.bones.Chest.y - .08), Math.PI - sd * .35, ob + .003), surf(T0, sW + .02, Math.PI - sd * .6, ob + .003)];
        const cu = new THREE.CatmullRomCurve3(pts), g = new THREE.TubeGeometry(cu, 24, .009, 4); g.scale(1, 1, 1); solid(bd, g, WT, pts[2], 0);
        button(bd, T0, WT, sC - .01, sd * .6, ob + .006, .009, 2, 'rame');
      }
    }
    G = toGeometry(bd, B); B.geos.set(key, G); return G;
  }
  // sopra l'inforcatura le gambe dei pantaloni devono stare fuori dal tronco (dove passa la camicia infilata)
  function pushOut(B, p, off, k) {
    if (k <= 0) return; const tb = tube(B, 'tronco'), s = tb.sAtY(p.y), fr = frameAt(tb, s), d = p.clone().sub(fr.p); d.y = 0; const r0 = d.length(); if (r0 < 1e-5) return;
    const a = Math.atan2(d.dot(fr.sd), d.dot(fr.f)), R = radius(tb, s, a) + off; if (r0 < R) p.addScaledVector(d.normalize(), (R - r0) * k);
  }
  // il bordo che si vede (spessore della stoffa): un anello che torna verso il corpo
  function lip(bd, tb, W, aRange, cols, sFn, oFn, dir, C, ringC, hipY) {
    const th = Math.max(.003, (C.agio || .002) * .8);
    grid(bd, 2, cols + 1, (i, j) => {
      const a = aRange[0] + (aRange[1] - aRange[0]) * j / cols, s = sFn(a), o = oFn(a) - th * i, fr = frameAt(tb, s), p = surf(tb, s, a, o);
      return { p, out: fr.t.clone().multiplyScalar(dir), u: (a - aRange[0]) / (Math.PI * 2) * ringC, v: s + i * th, c: .72 - i * .15, skirt: (C.gonna || C.poncho) && fr.p.y < hipY ? cl((hipY - fr.p.y) / .35, 0, 1) * .3 : 0 };
    }, W, 0);
  }
  // una toppa sulla superficie: angoli [a0, a1] (o funzione), s [s0, s1], sollevata di `lift`, materiale mi
  function patch(bd, tb, W, aF, sF, oF, lift, mi, opt) {
    opt = opt || {}; const rows = opt.rows || 6, cols = opt.cols || 6;
    return grid(bd, rows, cols, (i, j) => {
      const u = j / (cols - 1), v = i / (rows - 1), a = aF(u, v), s = sF(u, v), fr = frameAt(tb, s);
      const edge = Math.min(u, 1 - u, v, 1 - v), l = lift * (opt.flat ? 1 : .55 + .45 * cl(edge * 6, 0, 1)) + (opt.liftF ? opt.liftF(u, v) : 0);
      const p = surf(tb, s, a, oF(s, a) + l); if (opt.post) opt.post(p, oF(s, a) + l);
      const c = opt.shade ? opt.shade(u, v) : (edge < .08 && !opt.noEdge ? .78 : 1);
      const uv = opt.uv ? opt.uv(u, v) : null; return { p, out: p.clone().sub(fr.p), u: uv ? uv[0] : a * .2, v: uv ? uv[1] : s, c, skirt: opt.skirt ? opt.skirt(s) : 0 };
    }, W, mi);
  }
  // bottone: dischetto bombato con due fori
  const BTN = {};
  function btnGeo(r, kind) {
    const k = kind + r; if (BTN[k]) return BTN[k].clone();
    let g;
    if (kind === 'rame') { g = new THREE.CylinderGeometry(r, r, r * .7, 10); g.rotateX(Math.PI / 2); }
    else { const pts = [new THREE.Vector2(0, r * .45), new THREE.Vector2(r * .75, r * .42), new THREE.Vector2(r, r * .22), new THREE.Vector2(r, 0), new THREE.Vector2(0, 0)]; g = new THREE.LatheGeometry(pts, 10); g.rotateX(Math.PI / 2); }
    BTN[k] = g; return g.clone();
  }
  function button(bd, tb, W, s, a, o, r, mi, kind) {
    const fr = frameAt(tb, s), p = surf(tb, s, a, o), n = p.clone().sub(fr.p).normalize();
    solid(bd, place(btnGeo(r, kind || 'b'), p, n, fr.t), W, p, mi);
  }
  function box(bd, W, p, n, up, w, h, d, mi, c) { const g = new THREE.BoxGeometry(w, h, d); g.translate(0, 0, d / 2); solid(bd, place(g, p, n, up), W, p, mi, c); }
  // un cordino o una catenella tra punti (tubetto)
  function cord(bd, W, pts, r, mi, c) {
    const curve = new THREE.CatmullRomCurve3(pts), g = new THREE.TubeGeometry(curve, Math.max(4, pts.length * 4), r, 5, false); solid(bd, g, W, pts[Math.floor(pts.length / 2)], mi, c);
  }

  // ---------------- FINITURE DEL TRONCO ----------------
  function trunkDetails(bd, B, tb, W, C, Ls, offY, neckTop, hemBot, ringC) {
    const hipY = B.bones.Hips.y, o = s => offY(frameAt(tb, s).p.y) + ((C.gonna && frameAt(tb, s).p.y < hipY) ? (hipY - frameAt(tb, s).p.y) * (C.svasa || .1) : 0);
    const sTop = neckTop(0), sNeck = Ls.s1, sBot = hemBot(0), yOf = s => frameAt(tb, s).p.y, sAt = y => tb.sAtY(y);
    const sChest = sAt(B.bones.Chest.y - .03), sWaist = sAt(B.waist), sHip = sAt(hipY - .03);
    const front = C.fronte;
    // --- abbottonatura: listino e bottoni; doppio petto; zip ---
    if (front === 'bottoni' || front === 'bottoni_oro' || front === 'bottoni_rame' || front === 'doppio' || front === 'polo') {
      const top = front === 'polo' ? sNeck - .005 : sTop - .01, bot = front === 'polo' ? sNeck - .1 : sBot + .03;
      const dbl = front === 'doppio';
      // il listino (doppio strato di stoffa al centro)
      if (!dbl) patch(bd, tb, W, (u) => lerp(-.07, .07, u), (u, v) => lerp(bot - .01, top + .005, v), (s) => o(s), .0018, 0, { rows: 8, cols: 3, shade: (u) => u < .2 ? .8 : 1 });
      const n = front === 'polo' ? 2 : Math.max(2, Math.round((top - bot) / .085)), mi = front === 'bottoni_oro' ? 2 : front === 'bottoni_rame' ? 2 : 3;
      const r = front === 'polo' ? .006 : C.cl >= 4 ? .011 : .0065;
      for (let k = 0; k < n; k++) { const s = lerp(top - .015, bot + .02, n === 1 ? 0 : k / (n - 1));
        if (dbl) { if (k < 2) continue; if (yOf(s) < B.waist - .05 && C.gonna) continue; button(bd, tb, W, s, -.42, o(s) + .003, r, mi); button(bd, tb, W, s, .42, o(s) + .003, r, mi); }
        else button(bd, tb, W, s, front === 'polo' ? 0 : -.02, o(s) + .0035, r, mi, front === 'bottoni_rame' ? 'rame' : 'b'); }
      if (dbl) patch(bd, tb, W, (u) => lerp(-.04, .62, u), (u, v) => lerp(sBot + .02, sTop - .02, v), (s) => o(s), .0022, 0, { rows: 14, cols: 6, liftF: (u, v) => 0, shade: (u) => u > .9 ? .76 : 1 });   // il lembo del doppio petto che si sovrappone
    }
    if (front === 'zip' || front === 'zip_obl') {
      const obl = front === 'zip_obl', top = sTop + (C.collo === 'alto_zip' ? .04 : 0), bot = sBot + .005;
      patch(bd, tb, W, (u, v) => lerp(-.035, .035, u) + (obl ? lerp(.35, -.05, v) : 0), (u, v) => lerp(bot, top, v), (s) => o(s), .0022, 3, { rows: 18, cols: 3, flat: 1, noEdge: 1, shade: (u) => u === .5 ? .55 : .85 });
      const s = top - .03, fr = frameAt(tb, s), a = obl ? -.08 : 0, p = surf(tb, s, a, o(s) + .005), n = p.clone().sub(fr.p).normalize();
      box(bd, W, p, n, fr.t, .012, .03, .004, 2);   // il cursore della zip
    }
    if (front === 'strappi') {   // giubbotto: fianchi a strappo, piastra davanti
      for (const sd of [-1, 1]) patch(bd, tb, W, (u) => sd * lerp(1.25, 1.9, u), (u, v) => lerp(sWaist - .02, sChest - .06, v), (s) => o(s), .004, 1, { rows: 6, cols: 5 });
      patch(bd, tb, W, (u) => lerp(-.55, .55, u), (u, v) => lerp(sChest - .14, sTop - .03, v), (s) => o(s), .006, 0, { rows: 8, cols: 8 });
    }
    // --- colli ---
    const neckRing = (dy, extra, from, to, n) => { const P = []; for (let k = 0; k <= n; k++) { const a = lerp(from, to, k / n), s = neckTop(a); P.push({ a, s, p: surf(tb, s + dy, a, o(s) + extra) }); } return P; };
    const cc = C.collo;
    // colletto: misurato sul collo vero (centro e raggio), sta in piedi e poi ricade con le punte davanti
    const collar = (opt) => {
      const ny = neckY(B), [nx, nz] = B.neckC, rn = B.neckR + o(sNeck) * .6 + .006, n = 28, gap = opt.gap, h = opt.h, fall = opt.fall, mi = opt.mi || 0;
      grid(bd, 4, n + 1, (i, j) => {
        const a = lerp(gap, Math.PI * 2 - gap, j / n), dx = Math.sin(a), dz = Math.cos(a), front = Math.max(0, dz), tip = Math.pow(front, 5) * opt.punte;
        const R = rn + (opt.v ? front * .02 : 0), y0 = ny - .004 - (opt.v ? Math.pow(front, 3) * opt.v : 0);
        const hh = h * (1 - front * .35), fl = fall + tip;
        const pt = [[R, y0], [R + .002, y0 + hh], [R + .012, y0 + hh - .004], [R + .016 + fl * .45, y0 + hh - fl]][i];
        const p = new THREE.Vector3(nx + dx * pt[0], pt[1], nz + dz * pt[0]);
        return { p, out: new THREE.Vector3(dx, i === 3 ? .3 : 0, dz), u: a * .05, v: i * .015, c: i === 0 ? .8 : i === 3 ? .92 : 1 };
      }, W, mi);
    };
    if (cc === 'camicia' || cc === 'camicia_aperta') collar({ gap: cc === 'camicia_aperta' ? .5 : .14, h: .03, fall: .03, punte: .03, v: cc === 'camicia_aperta' ? .05 : 0 });
    if (cc === 'polo') collar({ gap: .16, h: .026, fall: .026, punte: .015 });
    if (cc === 'alto' || cc === 'alto_zip') {
      // collo alto: si rimbocca (dolcevita) o sale dritto con la zip; costine
      const h = cc === 'alto' ? .02 : 0;
      grid(bd, 3, 33, (i, j) => { const a = -Math.PI + j / 32 * Math.PI * 2, s = neckTop(a) - .02 + i * .012, fr = frameAt(tb, s), p = surf(tb, s, a, o(s) + .004 + (i === 1 ? .002 : 0) - (i === 2 ? .003 : 0)); return { p, out: p.clone().sub(fr.p), u: (a + Math.PI) / (Math.PI * 2) * ringC, v: s, c: i === 2 ? .8 : 1 }; }, W, 6);
    }
    if (cc === 'giro' || cc === 'barca' || cc === 'canotta') {
      // bordo a costine
      grid(bd, 2, 41, (i, j) => { const a = -Math.PI + j / 40 * Math.PI * 2, s = neckTop(a) - .014 + i * .013, fr = frameAt(tb, s), p = surf(tb, s, a, o(s) + .0015 * (1 - i)); return { p, out: p.clone().sub(fr.p), u: (a + Math.PI) / (Math.PI * 2) * ringC, v: s, c: 1 - i * .06 }; }, W, 6);
    }
    if (cc === 'revers' || cc === 'revers_pelle' || cc === 'montone' || cc === 'pelo') {
      // collo dietro + revers: due ali che scendono dalla spalla al primo bottone, con la tacca
      const fur = cc === 'montone' || cc === 'pelo', mi = fur ? 1 : 0;
      collar({ gap: .8, h: fur ? .04 : .026, fall: fur ? .045 : .03, punte: 0, mi });
      for (const sd of [-1, 1]) {
        // il revers: dalla cima dello scollo (a ±.75) giù fino al vertice della V
        const sV = neckTop(0) + .005, w = fur ? .6 : .5;
        patch(bd, tb, W, (u, v) => sd * lerp(.06 + v * .64 * (1 - u * .15), (.06 + v * .64) + w * (.25 + v * .75) * (1 - v * .1), u), (u, v) => lerp(sV, neckTop(sd * .72) - .004, v) - (u > .85 && v > .7 && !fur ? .02 * (v - .7) / .3 : 0), (s) => o(s), fur ? .012 : .004, mi, { rows: 10, cols: 5, shade: (u, v) => u > .9 ? .72 : u < .1 ? .8 : 1 });
      }
    }
    if (cc === 'cappuccio') {
      // cappuccio afflosciato dietro il collo, coulisse coi cordini davanti
      const sN = neckTop(Math.PI);
      grid(bd, 6, 19, (i, j) => {
        const a = lerp(Math.PI * .45, Math.PI * 1.55, j / 18), aa = a > Math.PI ? a - Math.PI * 2 : a, s = neckTop(aa), fr = frameAt(tb, s), base = surf(tb, s, aa, o(s)), out = base.clone().sub(fr.p).normalize();
        const t = i / 5, back = Math.max(0, -Math.cos(aa)), bulge = Math.sin(Math.PI * t) * (.03 + back * .05);
        const p = base.clone().addScaledVector(fr.t, -t * .1 * (.3 + back * .9) + .015 * Math.sin(Math.PI * t)).addScaledVector(out, .006 + bulge);
        return { p, out, u: a * .08, v: t * .2, c: i === 0 || i === 5 ? .75 : 1 - back * t * .12 };
      }, W, 0);
      for (const sd of [-1, 1]) { const s0 = neckTop(sd * .35), p0 = surf(tb, s0, sd * .25, o(s0) + .006), fr = frameAt(tb, s0); cord(bd, W, [p0, p0.clone().addScaledVector(fr.t, -.06).add(new THREE.Vector3(sd * .004, 0, .006)), p0.clone().addScaledVector(fr.t, -.13).add(new THREE.Vector3(sd * .008, 0, .004))], .003, 5); }
    }
    if (cc === 'poncho' || cc === 'scialle') {
      // collo a cappuccio largo / scialle drappeggiato sulle spalle
      grid(bd, 2, 33, (i, j) => { const a = -Math.PI + j / 32 * Math.PI * 2, s = neckTop(a) - .01 + i * .02, fr = frameAt(tb, s), p = surf(tb, s, a, o(s) + .01 - i * .004); return { p, out: p.clone().sub(fr.p), u: (a + Math.PI) / (Math.PI * 2) * ringC, v: s, c: .9 }; }, W, 1);
    }
    if (C.frange) {   // frange sull'orlo
      const n = 60; for (let k = 0; k < n; k++) { if (k % 2) continue; const a = -Math.PI + k / n * Math.PI * 2, s = hemBot(a), fr = frameAt(tb, s), p = surf(tb, s, a, o(s) + .002); cord(bd, W, [p, p.clone().addScaledVector(fr.t, -.05).addScaledVector(p.clone().sub(fr.p).normalize(), .004)], .0025, 1); }
    }
    // --- spalline (impermeabile, divisa) ---
    if (C.spalline) for (const sd of [-1, 1]) {
      const a = sd * Math.PI / 2, sS = sAt(B.bones['Shoulder' + (sd > 0 ? 'L' : 'R')].y + .05);
      patch(bd, tb, W, (u, v) => sd * lerp(1.3, 1.85, v), (u, v) => lerp(sS - .025, sS + .025, u) , (s) => o(s), .004, 0, { rows: 5, cols: 4 });
      const s = sS, p = surf(tb, s, sd * 1.4, o(s) + .006), fr = frameAt(tb, s); button(bd, tb, W, s, sd * 1.4, o(s) + .006, .006, 2);
    }
    // --- spalline sottili (vestito estivo) ---
    if (C.spalline_sottili) for (const sd of [-1, 1]) {
      const aF = sd * .55, aB = sd * (Math.PI - .55), sF = neckTop(aF), sB = neckTop(aB), pF = surf(tb, sF, aF, o(sF) + .001), pB = surf(tb, sB, aB, o(sB) + .001), sh = B.bones['Shoulder' + (sd > 0 ? 'L' : 'R')];
      const top = new THREE.Vector3(sh.x * .8, B.bones.Neck.y - .01, sh.z); cord(bd, W, [pF, top.clone().add(new THREE.Vector3(0, .012, .03)), top.clone().add(new THREE.Vector3(0, .016, -.01)), pB], .004, 0);
    }
    // --- tasche ---
    (C.tasche || []).forEach(t => {
      if (t === 'petto' || t === 'petto2') for (const sd of t === 'petto2' ? [-1, 1] : [1]) {
        const sC = sAt(B.bones.Chest.y - .02); patch(bd, tb, W, (u) => sd * lerp(.32, .72, u), (u, v) => lerp(sC - .06, sC + .02, v), (s) => o(s), .0025, 0, { rows: 5, cols: 5 });
        if (t === 'petto2') { patch(bd, tb, W, (u) => sd * lerp(.3, .74, u), (u, v) => lerp(sC + .01, sC + .03, v), (s) => o(s), .005, 0, { rows: 3, cols: 5, shade: (u, v) => v < .3 ? .7 : 1 }); button(bd, tb, W, sC + .015, sd * .52, o(sC) + .0065, .005, C.fronte === 'bottoni_rame' ? 2 : 3, C.fronte === 'bottoni_rame' ? 'rame' : 'b'); }
      }
      if (t === 'canguro') patch(bd, tb, W, (u, v) => lerp(-.85 + v * .2, .85 - v * .2, u), (u, v) => lerp(sBot + .03, sWaist + .08, v), (s) => o(s), .003, 0, { rows: 6, cols: 9, shade: (u, v) => (u < .12 || u > .88) && v > .2 ? .7 : 1 });
      if (t === 'giacca' || t === 'cappotto' || t === 'divisa') for (const sd of [-1, 1]) {
        const big = t === 'cappotto', sP = sAt(hipY + (big ? -.02 : .03));
        if (t === 'divisa') { patch(bd, tb, W, (u) => sd * lerp(.35, .78, u), (u, v) => lerp(sP - .07, sP + .03, v), (s) => o(s), .003, 0, { rows: 5, cols: 5 }); }
        // patta della tasca
        patch(bd, tb, W, (u) => sd * lerp(.38, big ? .95 : .85, u), (u, v) => lerp(sP, sP + .028, v), (s) => o(s), .0045, 0, { rows: 3, cols: 6, shade: (u, v) => v < .25 ? .65 : 1 });
        if (t === 'divisa') button(bd, tb, W, sP + .01, sd * .56, o(sP) + .006, .005, 2);
      }
      if (t === 'pochette') { const sC = sAt(B.bones.Chest.y - .03); patch(bd, tb, W, (u) => lerp(.4, .66, u), (u, v) => lerp(sC, sC + .012, v), (s) => o(s), .004, 0, { rows: 2, cols: 4, shade: () => .7 }); patch(bd, tb, W, (u) => lerp(.45, .6, u), (u, v) => lerp(sC + .01, sC + .025, v), (s) => o(s), .006, 5, { rows: 2, cols: 3 }); }
      if (t === 'fianchi' || t === 'fianchi_zip') for (const sd of [-1, 1]) patch(bd, tb, W, (u, v) => sd * lerp(.55, 1.05, u), (u, v) => lerp(sBot + .04, sBot + .14, v), (s) => o(s), .0028, t === 'fianchi_zip' ? 3 : 0, { rows: 4, cols: 5, flat: t === 'fianchi_zip' ? 1 : 0, liftF: t === 'fianchi_zip' ? (u, v) => (u > .1 && u < .9 && Math.abs(v - .5) < .2 ? 0 : -.002) : null });
      if (t === 'zip') for (const sd of [-1, 1]) patch(bd, tb, W, (u, v) => sd * lerp(.45, .95, u) + v * sd * .1, (u, v) => lerp(sWaist - .01, sWaist + .005, v) + u * .03, (s) => o(s), .002, 3, { rows: 2, cols: 5, flat: 1, noEdge: 1 });
      if (t === 'grembiule') patch(bd, tb, W, (u) => lerp(-.6, .6, u), (u, v) => lerp(sAt(B.crotch + .02), sAt(hipY - .02), v), (s) => o(s), .0025, 0, { rows: 4, cols: 8, shade: (u, v) => Math.abs(u - .5) < .03 ? .7 : v > .9 ? .8 : 1 });
      if (t === 'taschini') for (const sd of [-1, 1]) patch(bd, tb, W, (u) => sd * lerp(.4, .75, u), (u, v) => lerp(sAt(hipY + .06), sAt(hipY + .075), v), (s) => o(s), .002, 3, { rows: 2, cols: 4, flat: 1, noEdge: 1 });
    });
    // --- la stampa sul petto (materiale 7) ---
    if (C.stampa) { const sC = sAt(B.bones.Chest.y - .02); patch(bd, tb, W, (u) => lerp(-.62, .62, u), (u, v) => lerp(sC - .17, sC + .05, v), (s) => o(s), .0008, 7, { rows: 8, cols: 8, flat: 1, noEdge: 1, uv: (u, v) => [u, v], shade: () => 1 }); }
    // --- la catenella dell'orologio da taschino (panciotto) ---
    if (C.catenella) { const s1 = sAt(hipY + .1), p0 = surf(tb, s1, -.02, o(s1) + .006), p2 = surf(tb, s1 - .015, .7, o(s1) + .005), p1 = surf(tb, s1 - .045, .35, o(s1) + .007); cord(bd, W, [p0, p1, p2], .0022, 2); }
    // --- cinture del tronco ---
    if (C.cintura === 'trench' || C.cintura === 'stoffa' || C.cintura === 'cuoio' || C.cintura === 'chiodo') {
      const sB = sAt(C.gonna ? B.waist + .03 : C.cintura === 'chiodo' ? Lt_bot(tb, hemBot) + .02 : B.waist + .01), h = C.cintura === 'stoffa' ? .022 : .035, mi = C.cintura === 'cuoio' ? 4 : C.cintura === 'chiodo' ? 0 : 0;
      grid(bd, 3, 41, (i, j) => { const a = -Math.PI + j / 40 * Math.PI * 2, s = sB + (i - 1) * h / 2, fr = frameAt(tb, s), p = surf(tb, s, a, o(s) + .004 + (i === 1 ? .0015 : 0)); return { p, out: p.clone().sub(fr.p), u: (a + Math.PI) / (Math.PI * 2) * ringC, v: s * 3, c: i === 1 ? 1 : .8 }; }, W, mi);
      const fr = frameAt(tb, sB), p = surf(tb, sB, C.cintura === 'trench' ? -.15 : 0, o(sB) + .007), n = p.clone().sub(fr.p).normalize();
      if (C.cintura !== 'stoffa') box(bd, W, p, n, fr.t, .045, h + .008, .005, 2);   // fibbia
      if (C.cintura === 'trench') { const p2 = surf(tb, sB - .02, -.25, o(sB) + .006); cord(bd, W, [p2, p2.clone().add(new THREE.Vector3(.01, -.08, .01)), p2.clone().add(new THREE.Vector3(.02, -.15, .006))], .007, 0); }
      if (C.cintura === 'stoffa' && C.gonna) { const p2 = surf(tb, sB, Math.PI, o(sB) + .008); cord(bd, W, [p2, p2.clone().add(new THREE.Vector3(.04, -.1, -.01))], .007, 0); cord(bd, W, [p2, p2.clone().add(new THREE.Vector3(-.04, -.11, -.01))], .007, 0); }
    }
    // --- bordi a costine (maglioni, felpe, piumini) ---
    if (C.costine && !C.gonna) grid(bd, 2, 41, (i, j) => { const a = -Math.PI + j / 40 * Math.PI * 2, s = hemBot(a) + i * .045, fr = frameAt(tb, s), p = surf(tb, s, a, o(s) + .002 * (1 - i)); return { p, out: p.clone().sub(fr.p), u: (a + Math.PI) / (Math.PI * 2) * ringC, v: s, c: 1 - i * .1 }; }, W, 6);
    if (C.orlo === 'banda') grid(bd, 2, 41, (i, j) => { const a = -Math.PI + j / 40 * Math.PI * 2, s = hemBot(a) + i * .04, fr = frameAt(tb, s), p = surf(tb, s, a, o(s) + .003 * (1 - i)); return { p, out: p.clone().sub(fr.p), u: (a + Math.PI) / (Math.PI * 2) * ringC, v: s, c: 1 - i * .12 }; }, W, 0);
    if (C.orlo === 'montone' || C.orlo === 'pelo') grid(bd, 2, 41, (i, j) => { const a = -Math.PI + j / 40 * Math.PI * 2, s = hemBot(a) + i * .05, fr = frameAt(tb, s), p = surf(tb, s, a, o(s) + .01 * (1 - i * .6)); return { p, out: p.clone().sub(fr.p), u: a * .1, v: s, c: 1 }; }, W, 1);
    // --- bande laterali (tute) ---
    if (C.bande) for (const sd of [-1, 1]) patch(bd, tb, W, (u) => sd * (Math.PI / 2 + lerp(-.1, .1, u)), (u, v) => lerp(hemBot(sd * Math.PI / 2) + .01, neckTop(sd * Math.PI / 2) - .04, v), (s) => o(s), .0012, 1, { rows: 16, cols: 2, flat: 1, noEdge: 1 });
    // --- numero sulla maglia da calcio (schiena) ---
    if (C.numero) { const sC = sAt(B.bones.Chest.y - .06); patch(bd, tb, W, (u) => Math.PI + lerp(-.25, .25, u), (u, v) => lerp(sC - .07, sC + .07, v), (s) => o(s), .0012, 5, { rows: 2, cols: 2, flat: 1, noEdge: 1 }); }
    // --- legacci del grembiule ---
    if (C.legacci) { const sW = sAt(B.waist); for (const sd of [-1, 1]) { const p0 = surf(tb, sW, sd * 1.75, o(sW) + .002), p1 = surf(tb, sW, sd * 2.6, o(sW) + .004), p2 = surf(tb, sW, Math.PI, o(sW) + .005); cord(bd, W, [p0, p1, p2], .006, 0); }
      const p2 = surf(tb, sW, Math.PI, o(sW) + .008); cord(bd, W, [p2, p2.clone().add(new THREE.Vector3(.03, -.12, -.01))], .007, 0); cord(bd, W, [p2, p2.clone().add(new THREE.Vector3(-.03, -.11, -.01))], .007, 0);
      const sN = neckTop(.9), pa = surf(tb, sN, .9, o(sN)), pb = surf(tb, sN, -.9, o(sN)); cord(bd, W, [pa, new THREE.Vector3(B.bones.Neck.x + .05, B.bones.Neck.y + .02, B.bones.Neck.z - .04), new THREE.Vector3(B.bones.Neck.x - .05, B.bones.Neck.y + .02, B.bones.Neck.z - .04), pb], .005, 0); }
    // --- cuciture a contrasto (jeans): impunture ai fianchi e alle spalle ---
    if (C.cuciture) for (const sd of [-1, 1]) patch(bd, tb, W, (u) => sd * (Math.PI / 2 + lerp(-.012, .012, u)), (u, v) => lerp(hemBot(sd * Math.PI / 2) + .03, neckTop(sd * Math.PI / 2) - .05, v), (s) => o(s), .0008, 1, { rows: 10, cols: 2, flat: 1, noEdge: 1 });
  }
  function Lt_bot(tb, hemBot) { return hemBot(0); }
  // ---------------- FINITURE DELLE MANICHE ----------------
  function sleeveDetails(bd, B, tb, W, C, Ls, oA, s, ringC) {
    const end = Ls.s1, long = end > Ls.la + .05;
    if (C.polsi && long) {   // polsino col bottone
      grid(bd, 2, 17, (i, j) => { const a = -Math.PI + j / 16 * Math.PI * 2, sv = end - .045 + i * .045, fr = frameAt(tb, sv), p = surf(tb, sv, a, oA(sv) + .002); return { p, out: p.clone().sub(fr.p), u: (a + Math.PI) / (Math.PI * 2) * ringC, v: sv, c: i ? 1 : .8 }; }, W, 0);
      button(bd, tb, W, end - .02, Math.PI / 2 * (s === 'L' ? 1 : -1) + Math.PI * .1, oA(end) + .004, .005, 3);
    }
    if (C.costine && long) grid(bd, 2, 17, (i, j) => { const a = -Math.PI + j / 16 * Math.PI * 2, sv = end - .05 + i * .05, fr = frameAt(tb, sv), p = surf(tb, sv, a, oA(sv) + .0015 * i - .001); return { p, out: p.clone().sub(fr.p), u: (a + Math.PI) / (Math.PI * 2) * ringC, v: sv, c: 1 }; }, W, 6);
    if (C.bande) { const lat = s === 'L' ? Math.PI / 2 : -Math.PI / 2; patch(bd, tb, W, (u) => lat + lerp(-.18, .18, u), (u, v) => lerp(.03, end - (C.costine ? .05 : .01), v), (sv) => oA(sv), .0012, 1, { rows: 14, cols: 2, flat: 1, noEdge: 1 }); }
    if (C.orlo === 'montone' || C.orlo === 'pelo' || C.collo === 'montone' && long) grid(bd, 2, 17, (i, j) => { const a = -Math.PI + j / 16 * Math.PI * 2, sv = end - .04 + i * .04, fr = frameAt(tb, sv), p = surf(tb, sv, a, oA(sv) + .008); return { p, out: p.clone().sub(fr.p), u: a * .1, v: sv, c: 1 }; }, W, 1);
    // risvolto della manica corta
    if (!long && !C.costine) grid(bd, 2, 17, (i, j) => { const a = -Math.PI + j / 16 * Math.PI * 2, sv = end - .022 + i * .022, fr = frameAt(tb, sv), p = surf(tb, sv, a, oA(sv) + .0022); return { p, out: p.clone().sub(fr.p), u: (a + Math.PI) / (Math.PI * 2) * ringC, v: sv, c: i ? .95 : .75 }; }, W, 0);
    // il bordo della manica (spessore)
    grid(bd, 2, 17, (i, j) => { const a = -Math.PI + j / 16 * Math.PI * 2, sv = end, fr = frameAt(tb, sv), p = surf(tb, sv, a, oA(sv) + (C.costine || C.polsi ? .002 : 0) - i * .004); return { p, out: fr.t.clone(), u: (a + Math.PI) / (Math.PI * 2) * ringC, v: sv + i * .004, c: .6 }; }, W, 0);
  }
  // ---------------- FINITURE DELLE GAMBE ----------------
  // ---------------- FINITURE DEL BACINO: cintura coi passanti, patta, tasche davanti e dietro ----------------
  function pelvisDetails(bd, B, tb, W, C, ob, sTop, bot, ringC) {
    const sW = tb.sAtY(B.waist + .012), sC = tb.sAtY(B.crotch + .01), sP = tb.sAtY(B.waist - .03);
    if (C.cintura && !C.coperto) {
      const mi = /cuoio|jeans/.test(C.cintura) ? 4 : 0, h = C.cintura === 'cuoio_fine' ? .024 : .032, o2 = ob + .003;
      grid(bd, 3, 41, (i, j) => { const a = -Math.PI + j / 40 * Math.PI * 2, sv = sW + (i - 1) * h / 2, fr = frameAt(tb, sv), p = surf(tb, sv, a, o2 + (i === 1 ? .0015 : 0)); return { p, out: p.clone().sub(fr.p), u: (a + Math.PI) / (Math.PI * 2) * ringC * 3, v: sv * 3, c: i === 1 ? 1 : .75 }; }, W, mi);
      const fr = frameAt(tb, sW), p = surf(tb, sW, 0, o2 + .004), n = p.clone().sub(fr.p).normalize(); box(bd, W, p, n, fr.t, .045, h + .01, .006, 2); box(bd, W, p.clone().addScaledVector(n, .004), n, fr.t, .03, h - .004, .004, 4);
      for (const a of [-2.6, -1.5, -.6, .6, 1.5, 2.6, Math.PI]) patch(bd, tb, W, (u) => a + lerp(-.05, .05, u), (u, v) => lerp(sW - h * .75, sW + h * .75, v), () => ob, .006, 0, { rows: 3, cols: 2 });
      // la patta: una cucitura a J sul davanti
      patch(bd, tb, W, (u, v) => .16 + u * .025 - Math.pow(1 - v, 6) * .14, (u, v) => lerp(sC + .015, sW - h * .6, v), () => ob, .0008, C.cuciture ? 1 : 3, { rows: 8, cols: 2, flat: 1, noEdge: 1, shade: () => .9 });
    }
    if (C.elastico) grid(bd, 2, 41, (i, j) => { const a = -Math.PI + j / 40 * Math.PI * 2, sv = sTop - .03 + i * .03, fr = frameAt(tb, sv), p = surf(tb, sv, a, ob + .001); return { p, out: p.clone().sub(fr.p), u: (a + Math.PI) / (Math.PI * 2) * ringC, v: sv, c: 1 }; }, W, 6);
    (C.tasche || []).forEach(t => {
      // l'apertura della tasca: una linea sottile in diagonale (non una toppa)
      if (t === 'oblique' || t === 'jeans') for (const sd of [-1, 1]) patch(bd, tb, W, (u, v) => sd * (lerp(.62, 1.25, u) + v * .03), (u, v) => lerp(sW - .025, sP - .05, u) + v * .005, () => ob, .0009, 3, { rows: 2, cols: 6, flat: 1, noEdge: 1, shade: () => .9 });
      if (t === 'jeans') for (const sd of [-1, 1]) { patch(bd, tb, W, (u) => sd * lerp(2.3, 2.85, u), (u, v) => lerp(sP - .1, sP, v), () => ob, .002, 0, { rows: 4, cols: 4, shade: (u, v) => v > .85 || u < .1 || u > .9 ? .72 : 1 });
        const p = surf(tb, sP - .005, sd * 1.2, ob + .002), fr = frameAt(tb, sP); box(bd, W, p, p.clone().sub(fr.p).normalize(), fr.t, .006, .006, .002, 2); }
    });
    if (C.cuciture) for (const sd of [-1, 1]) patch(bd, tb, W, (u) => sd * (Math.PI / 2 + lerp(-.008, .008, u)), (u, v) => lerp(bot(sd * Math.PI / 2) + .01, sW - .02, v), () => ob, .0007, 1, { rows: 6, cols: 2, flat: 1, noEdge: 1 });
  }
  function legDetails(bd, B, tb, W, C, Ls, oL, s, ringC) {
    const sg = s === 'L' ? 1 : -1, end = Ls.s1, outA = sg * Math.PI / 2;   // fuori: verso +x per la sinistra
    const post = {};
    (C.tasche || []).forEach(t => {
      if (t === 'cargo') { const sk = Ls.sCr + (Ls.kn - Ls.sCr) * .45; patch(bd, tb, W, (u) => outA + lerp(-.45, .45, u), (u, v) => lerp(sk - .07, sk + .06, v), (sv) => oL(sv), .012, 0, { rows: 5, cols: 5 });
        patch(bd, tb, W, (u) => outA + lerp(-.5, .5, u), (u, v) => lerp(sk + .04, sk + .07, v), (sv) => oL(sv), .016, 0, { rows: 2, cols: 5, shade: (u, v) => v < .3 ? .7 : 1 }); button(bd, tb, W, sk + .05, outA, oL(sk) + .018, .006, 3); }
      if (t === 'ginocchio') patch(bd, tb, W, (u) => lerp(-.6, .6, u), (u, v) => lerp(Ls.kn - .07, Ls.kn + .06, v), (sv) => oL(sv), .0025, 0, { rows: 5, cols: 5 });
    });
    if (C.banda) patch(bd, tb, W, (u) => outA + lerp(-.07, .07, u), (u, v) => lerp(.09, end - .01, v), (sv) => oL(sv), .0009, 1, { rows: 24, cols: 2, flat: 1, noEdge: 1 });
    if (C.cuciture) patch(bd, tb, W, (u) => outA + lerp(-.012, .012, u), (u, v) => lerp(.1, end - .02, v), (sv) => oL(sv), .0007, 1, { rows: 20, cols: 2, flat: 1, noEdge: 1 });
    if (C.risvolto) grid(bd, 3, 19, (i, j) => { const a = -Math.PI + j / 18 * Math.PI * 2, sv = end - .045 + i * .0225, fr = frameAt(tb, sv), p = surf(tb, sv, a, oL(sv) + .006 + (i === 1 ? .002 : 0)); return { p, out: p.clone().sub(fr.p), u: (a + Math.PI) / (Math.PI * 2) * ringC, v: sv, c: i === 0 ? .7 : i === 1 ? 1 : .9 }; }, W, 0);
    // l'orlo (spessore)
    grid(bd, 2, 19, (i, j) => { const a = -Math.PI + j / 18 * Math.PI * 2, sv = end, fr = frameAt(tb, sv), p = surf(tb, sv, a, oL(sv) + (C.risvolto ? .006 : 0) - i * .004); return { p, out: fr.t.clone(), u: (a + Math.PI) / (Math.PI * 2) * ringC, v: sv + i * .004, c: .6 }; }, W, 0);
  }

  // =====================================================================================
  // VESTIRE: dal guardaroba (outfit) alle mesh. Ritorna l'elenco delle parti coperte (per nascondere la pelle sotto)
  // =====================================================================================
  const CLS = id => (CUT[id] ? CUT[id].cl : 1);
  // i colori: base, secondo, terzo; l'usura scolorisce i jeans
  function looks(C, col, seed) {
    const A = col || '#808080', a = rgb(A), l = lum(a);
    const c2 = C.c2 || (l > .5 ? '#2a2a30' : D), c3 = C.c3 || (l > .5 ? '#5a5a60' : '#a8a090');
    return { A, B: c2, C: c3 };
  }
  // materiali del capo, nell'ordine dei gruppi: 0 stoffa, 1 secondo colore, 2 metallo, 3 scuro, 4 cuoio, 5 bianco, 6 costine
  function mats(C, col) {
    const L = looks(C, col), lus = C.lucido || 0, fab = C.fab;
    const darker = '#' + new THREE.Color(L.A).multiplyScalar(.5).getHexString(), fur2 = C.collo === 'montone' || C.orlo === 'montone' ? '#e8dcc0' : L.A;
    return [
      fabMat(fab, L.A, L.B, L.C, { lucido: lus }),
      C.collo === 'montone' || C.orlo === 'montone' ? fabMat('montone', fur2, fur2, fur2) : C.collo === 'pelo' || C.orlo === 'pelo' ? fabMat('pelo', L.A, L.A, L.A) : C.bande ? fabMat('nylon', C.bande, C.bande, C.bande) : C.cuciture ? solidMat(C.cuciture, .3) : C.banda ? solidMat(C.banda, .25) : fabMat(C.fab === 'etnico' ? 'tela' : 'panno', L.B, L.B, L.B),
      solidMat(C.fronte === 'bottoni_oro' || C.fronte === 'bottoni_rame' || C.fronte === 'doppio' && C.fab === 'panno' ? '#b8903a' : '#a8a8b0', .35),
      solidMat(/^#/.test(L.A) && lum(rgb(L.A)) < .2 ? '#4a4840' : '#1e1c1c', .2),
      fabMat('pelle', C.cintura === 'jeans' ? '#5a3a22' : '#3a2418', '#3a2418', '#3a2418'),
      solidMat('#ece8dc', .25),
      fabMat('costine', C.fab === 'piumino' || C.fab === 'nylon' ? darker : L.A, L.A, L.A),
      C.stampa ? printMat(STAMPE[(C.seed || 0) % STAMPE.length], L.A) : solidMat(L.A),
    ];
  }

  // =====================================================================================
  // LA TESTA: misure per cappelli, occhiali, sciarpe (centro, cima, raggio alla fronte, davanti)
  // =====================================================================================
  function testa(g, PARTI) {
    const B = body(g, PARTI); if (!B) return null; if (B.T) return B.T;
    const H = B.hair.length ? B.hair : B.head, hd = B.head, b = B.bones;
    let top = -9; for (let i = 1; i < H.length; i += 3) top = Math.max(top, H[i]); for (let i = 1; i < hd.length; i += 3) top = Math.max(top, hd[i]);
    // il cranio senza capelli: la cima e il raggio
    let skTop = -9; for (let i = 1; i < hd.length; i += 3) skTop = Math.max(skTop, hd[i]);
    const ring = (arr, y0, y1) => { let sx = 0, sz = 0, c = 0; for (let i = 0; i < arr.length; i += 3) if (arr[i + 1] > y0 && arr[i + 1] < y1) { sx += arr[i]; sz += arr[i + 2]; c++; } const cx = c ? sx / c : b.Head.x, cz = c ? sz / c : b.Head.z; let r = 0, rf = 0, rb = 0; for (let i = 0; i < arr.length; i += 3) if (arr[i + 1] > y0 && arr[i + 1] < y1) { const d = Math.hypot(arr[i] - cx, arr[i + 2] - cz); r = Math.max(r, d); rf = Math.max(rf, arr[i + 2] - cz); rb = Math.max(rb, cz - arr[i + 2]); } return { cx, cz, r, rf, rb }; };
    const brow = skTop - .085, R1 = ring(hd, brow - .02, brow + .02), R2 = H !== hd ? ring(H, brow - .02, brow + .03) : R1;
    const eye = skTop - .115, RE = ring(hd, eye - .015, eye + .015);
    const chin = (() => { let m = 9; for (let i = 1; i < hd.length; i += 3) m = Math.min(m, hd[i]); return m; })();
    B.T = { top, skTop, brow, cx: R1.cx, cz: R1.cz, r: Math.max(R1.r, R2.r * .97), rSkull: R1.r, front: R1.cz + R1.rf, eyeY: eye, eyeZ: RE.cz + RE.rf, chin, hairTop: top };
    return B.T;
  }
  // matrici di riposo delle ossa (spazio del personaggio), per agganciare oggetti rigidi a prescindere dalla posa attuale
  function boneRest(g, PARTI, name) { const B = body(g, PARTI); return B && B.bmat[name] || null; }
  // aggancia `obj` (costruito nello spazio del personaggio a riposo) all'osso, indipendente dalla posa
  // l'oggetto è costruito nello spazio del personaggio nella posa di legame (a T); qui si porta nello spazio dell'osso
  // attraverso la stessa trasformazione dello skinning, quindi vale in qualsiasi posa
  function attach(g, PARTI, boneName, obj) {
    let ref = null; g.traverse(o => { if (!ref && o.isSkinnedMesh && !o.userData.vesti && /Body/i.test(o.name)) ref = o; }); if (!ref) g.traverse(o => { if (!ref && o.isSkinnedMesh && !o.userData.vesti) ref = o; });
    if (!ref) return null; const i = ref.skeleton.bones.findIndex(b => b.name === boneName); if (i < 0) return null; const bone = ref.skeleton.bones[i];
    g.updateMatrixWorld(true);
    const O = new THREE.Matrix4().compose(obj.position, obj.quaternion, obj.scale);
    const L = new THREE.Matrix4().copy(bone.matrixWorld).invert().multiply(ref.matrixWorld).multiply(ref.bindMatrixInverse).multiply(bone.matrixWorld).multiply(ref.skeleton.boneInverses[i]).multiply(ref.bindMatrix)
      .multiply(new THREE.Matrix4().copy(ref.matrixWorld).invert()).multiply(g.matrixWorld).multiply(O);
    L.decompose(obj.position, obj.quaternion, obj.scale); bone.add(obj); obj.userData.vesti = true;
    obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    return obj;
  }

  // il vestito intero: ritorna { meshes, covered: Set di 'srcIndex:vertex' coperti, spessore per parte }
  function dress(g, outfit, PARTI, seedStr) {
    const B = body(g, PARTI); if (!B) return null;
    // ordine degli strati: per classe, ma dentro la stessa zona vale l'ordine scelto dal giocatore
    const L = outfit.filter(c => c.parti && c.parti.length && !/^(piedi|mani)$/.test(c.parti.join()) && !(c.parti.length === 1 && (c.parti[0] === 'piedi' || c.parti[0] === 'mani')));
    let last = {}; const ranked = L.map((c, i) => { const z = c.zona || 'x'; let r = CLS(c.id) * 10 + i * .01; if (last[z] !== undefined && r < last[z]) r = last[z] + .01; last[z] = r; return { c, r }; }).sort((a, b) => a.r - b.r);
    const th = {}, out = [], cover = [], lay = [];
    const seed = hstr(seedStr || '');
    // l'intimo coperto del tutto da un capo sopra non si costruisce (non si vede e non deve sbucare)
    const hiddenUnder = (c, k) => (CUT[c.id] ? CUT[c.id].cl : 1) === 0 && ranked.slice(k + 1).some(o => { const P = o.c.parti || [], C2 = CUT[o.c.id] || {}; return !C2.gonna && !C2.davanti && !C2.smanicato && c.parti.every(p => p === 'piedi' || p === 'mani' || P.includes(p) || (p === 'bacino' && C2.cl === 2)); });
    ranked.forEach(({ c }, k) => {
      if (hiddenUnder(c, k)) { (c.parti || []).forEach(p => { th[p] = Math.max(th[p] || 0, .002); }); return; }
      const base = CUT[c.id] || { cl: 1, fab: c.pat === 'righe' ? 'righe' : c.pat === 'fiori' ? 'fiori' : 'cotone' };
      const vars = VARIANTI[c.id]; let vi = 0; if (vars && seedStr !== undefined && seedStr !== 'player') vi = (seed >>> (k * 3)) % vars.length;
      const C = Object.assign({ id: c.id }, base, vars ? vars[vi] : {}, { var: vi, seed: c.stampa !== undefined ? c.stampa : (seed >>> 5) });
      if (C.cl <= 1 && !C.gonna && !C.intera && ranked.some(o => o.c !== c && CUT[o.c.id] && CUT[o.c.id].cl === 2)) C.infilata = 1;   // camicie e magliette dentro i pantaloni
      // la vita coperta da un capo sopra (maglione, giacca chiusa, cappotto): niente cintura che sbuca
      if (C.cl === 2 && ranked.slice(k + 1).some(o => (CUT[o.c.id] || {}).gonna)) C.stretti = 1;   // sotto un cappotto lungo i pantaloni stanno dritti e stretti (non bucano la falda)
      if (C.cl === 2) C.coperto = ranked.slice(k + 1).some(o => { const C2 = CUT[o.c.id] || {}; return (C2.cl >= 3) && (o.c.parti || []).includes('torso') && !C2.corto && !C2.davanti; });
      if (c.pat === 'righe_v' && !base.fab) C.fab = 'righe_v';
      // spessore: cresce con quello che sta sotto, nelle parti che copre
      const parti = c.parti.filter(p => p !== 'piedi' && p !== 'mani');
      const thick = parti.slice(); if (parti.includes('torso') && !thick.includes('bacino') && !C.corto) thick.push('bacino');   // l'orlo dei capi di sopra scende sotto la vita: chi sta fuori deve passarci sopra
      let b0 = 0; thick.forEach(p => { b0 = Math.max(b0, th[p] || 0); });
      const t = b0 + .0025 + c.sp * .16 + (C.agio || 0) * .5; const off = {};
      ['torso', 'braccia', 'avambracci', 'bacino', 'cosce', 'polpacci', 'collo'].forEach(p => { off[p] = (thick.includes(p) ? b0 : (th[p] || b0)) + .0025 + c.sp * .16; });
      thick.forEach(p => { th[p] = t; });
      try {
        const geo = cut(B, C, parti, off, seed);
        const m = new THREE.SkinnedMesh(geo, mats(C, c.col)); m.userData.vesti = true; m.userData.capo = c.id; m.castShadow = true; m.frustumCulled = false;
        out.push(m); cover.push({ C, parti }); lay.push({ id: c.id, cl: C.cl, t, off, collo: C.collo, parti });
      } catch (e) { console.error('[Sartoria]', c.id, e); }
    });
    return { meshes: out, th, cover, B, lay };
  }
  // quali vertici del corpo sono coperti (per toglierli): per tubo e tratto
  function covered(B, cover) {
    const flag = new Uint8Array(B.part.length);
    cover.forEach(({ C, parti }) => {
      const P = new Set(parti), trunk = C.gonna || C.poncho ? 'gonna' : 'tronco';
      for (let i = 0; i < B.part.length; i++) {
        const p = B.part[i]; if (!p || !P.has(p) && !(C.gonna && (p === 'cosce' || p === 'polpacci'))) continue; const y = B.P[i * 3 + 1];
        if (p === 'torso' || p === 'collo') { if (C.solo_gonna || C.davanti) continue; if (p === 'collo' && C.collo !== 'alto') continue; const ny = neckY(B); if (y < ny - .004 && !(C.collo === 'v' || /revers|aperta|canotta/.test(C.collo || '')) || y < ny - .2) flag[i] = 1; }
        else if (p === 'bacino') { if (!C.davanti) flag[i] = 1; }
        else if (p === 'braccia' || p === 'avambracci') { if (C.smanicato || C.solo_gonna || C.davanti) continue; const tb = tube(B, 'manica' + (B.side[i] > 0 ? 'L' : 'R')), Ls = lengths(B, tb, 'manica' + (B.side[i] > 0 ? 'L' : 'R'), C, parti), on = tb.onT[i] * tb.ds; if (on >= 0 && on < Ls.s1 - .025) flag[i] = 1; }
        else if (p === 'cosce' || p === 'polpacci') {
          if (C.gonna) { const L0 = lengths(B, tube(B, 'gonna'), 'gonna', C, parti); if (y > L0.yb + .05) flag[i] = 1; continue; }
          const s = B.side[i] > 0 ? 'L' : 'R', tb = tube(B, 'gamba' + s), Ls = lengths(B, tb, 'gamba' + s, C, parti), on = tb.onT[i] * tb.ds; if (on >= 0 && on < Ls.s1 - .025) flag[i] = 1; }
      }
    });
    return flag;
  }

  return { STAMPE, printMat, dress, covered, body, testa, attach, boneRest, fabMat, solidMat, texFor, TESS, CUT, VARIANTI, tube, surf, frameAt };
})();
if (typeof module !== 'undefined') module.exports = Sartoria;
