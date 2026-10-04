
/* Porto Vecchio — il mondo: un'isola rotonda e piatta di circa 400 m.
   Genera (sempre uguale, da un seme fisso) costa, quote, zone, strade, isolati, edifici con nome,
   luoghi, vegetazione e punti di partenza dei veicoli. Nessuna grafica: la usano motore e render.
   Coordinate in metri: x verso est, y verso sud. Una casella = 2 m. */
var World = (function () {
  'use strict';
  const TS = 2, SIZE = 440, GW = SIZE / TS, GH = SIZE / TS, CX = 220, CY = 220;
  // il disegno originale era su 800 m: K porta quelle coordinate sull'isola piccola
  const KF = .55, K = (x, y) => [CX + (x - 400) * KF, CY + (y - 400) * KF], KI = (x, y) => [400 + (x - CX) / KF, 400 + (y - CY) / KF];
  const T = { COB: 0, VIA: 1, BLD: 2, PIAZZA: 3, WATER: 4, QUAY: 5, FOUNT: 6, PIER: 7, SAND: 8, GRASS: 9, STAIRS: 10, WALK: 11, ROCK: 12, TREE: 13, DIRT: 14, FIELD: 15, DESERT: 16, SALT: 17, SHRUB: 18 };
  const Z = { MARE: 0, CITTA: 1, CAMPAGNA: 2, MACCHIA: 3, DESERTO: 4, MONTE: 5, SPIAGGIA: 6 };
  const ZNAME = ['mare', 'città', 'campagna', 'Macchia', 'deserto', 'Monte Nero', 'spiaggia'];

  // ---------------- RUMORE ----------------
  function hash2(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  function vnoise(x, y, s) {
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = hash2(x0, y0, s), b = hash2(x0 + 1, y0, s), c = hash2(x0, y0 + 1, s), d = hash2(x0 + 1, y0 + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  const fbm = (x, y, s, o) => { let t = 0, a = .5, f = 1; for (let i = 0; i < (o || 4); i++) { t += a * vnoise(x * f, y * f, s + i * 17); a *= .5; f *= 2.03; } return t / (1 - Math.pow(.5, o || 4)); };
  const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b, c, d) => Math.hypot(c - a, d - b);
  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // ---------------- COSTA ----------------
  // raggio della costa per angolo (0 = est, π/2 = sud): il porto è una baia a sud
  function coastR(th) {
    let r = 198 + 7 * Math.sin(3 * th + 1.1) + 4 * Math.sin(7 * th + 2.3) + 10 * (fbm(Math.cos(th) * 2 + 5, Math.sin(th) * 2 + 5, 3, 3) - .5);
    const d = Math.atan2(Math.sin(th - Math.PI / 2), Math.cos(th - Math.PI / 2));
    r -= 40 * Math.exp(-Math.pow(d / .26, 4));                      // la baia del porto, fianchi ripidi
    const dw = Math.atan2(Math.sin(th - 2.55), Math.cos(th - 2.55));
    r += 14 * Math.exp(-(dw / .07) * (dw / .07));                   // Punta Scogli, il capo del faro (sud-ovest)
    const de = Math.atan2(Math.sin(th - .2), Math.cos(th - .2));
    r -= 12 * Math.exp(-(de / .1) * (de / .1));                     // la caletta della Macchia (est)
    return r;
  }
  const polar = (x, y) => ({ d: dist(CX, CY, x, y), th: Math.atan2(y - CY, x - CX) });
  const onLand = (x, y) => { const p = polar(x, y); return p.d < coastR(p.th); };

  // ---------------- ZONE ----------------
  function zoneAt(x, y) {
    const p = polar(x, y), R = coastR(p.th);
    if (p.d >= R) return Z.MARE;
    if (y > 296 + .004 * (x - 220) * (x - 220)) return Z.CITTA;
    const [X, Y] = KI(x, y);
    if (Y < 300 + 30 * (fbm(X / 40, Y / 40, 8, 2) - .5) && Math.abs(X - 405) < 170) return Z.MONTE;
    if (X > 545 + 30 * (fbm(X / 80, Y / 80, 11, 2) - .5)) return Z.MACCHIA;
    if (X < 255 + 30 * (fbm(X / 80, Y / 80, 12, 2) - .5)) return Z.DESERTO;
    return Z.CAMPAGNA;
  }

  // ---------------- QUOTE ----------------
  // isola piatta: terra a 40 cm, mare sotto
  function rawElev(x, y) { const p = polar(x, y); return coastR(p.th) - p.d < 0 ? -2 : .4; }

  // ---------------- STRADE ----------------
  // curve passanti per i punti (Catmull-Rom), campionate ogni ~3 m
  function spline(pts, closed) {
    const out = [], n = pts.length, P = i => closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)];
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2), L = dist(p1[0], p1[1], p2[0], p2[1]), k = Math.max(2, Math.ceil(L / 3));
      for (let j = 0; j < k; j++) {
        const t = j / k, t2 = t * t, t3 = t2 * t;
        out.push([.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          .5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
      }
    }
    if (!closed) out.push(pts[n - 1].slice());
    return out;
  }
  function ringRoad() {
    const pts = [];
    for (let k = 0; k < 72; k++) {
      const th = k / 72 * Math.PI * 2, d = Math.atan2(Math.sin(th - Math.PI / 2), Math.cos(th - Math.PI / 2));
      let off = 20 + 3 * Math.sin(th * 5);
      off -= 12 * Math.exp(-Math.pow(d / .3, 4));            // lungo la baia diventa il lungomare, sulla banchina
      const r = coastR(th) - off;
      pts.push([CX + Math.cos(th) * r, CY + Math.sin(th) * r]);
    }
    return pts;
  }
  // strade fuori città: tratti dritti con curve raccordate (raggio fisso), incroci a T netti. Coordinate in metri.
  const ROADS0 = [
    // id, nome, larghezza (m), tipo, vertici
    ['monte', 'Via del Monte', 8, 'strada', [[220, 299], [220, 230], [226, 190], [220, 150], [220, 124]]],
    ['macchia', 'Strada della Macchia', 7, 'strada', [[220, 256], [300, 256], [340, 240], [394, 240]]],
    ['deserto', 'Strada del Deserto', 7, 'strada', [[220, 256], [140, 256], [100, 244], [48, 244]]],
    ['paese', 'Strada di San Giacomo', 6, 'strada', [[220, 200], [250, 194], [266, 186]]],
    ['lago', 'Sterrato del lago', 4, 'sterrato', [[220, 214], [200, 212]]],
    ['cava', 'Sterrato della cava', 4, 'sterrato', [[330, 244], [338, 190], [348, 156]]],
    ['ovile', 'Sterrato dell\'ovile', 4, 'sterrato', [[372, 240], [376, 198]]],
    ['miniera', 'Sterrato della miniera', 4, 'sterrato', [[104, 246], [96, 210], [80, 184]]],
    ['saline', 'Sterrato delle saline', 4, 'sterrato', [[140, 256], [130, 286]]],
    ['masseria1', 'Sterrato della masseria', 4, 'sterrato', [[220, 226], [170, 226]]],
    ['masseria2', 'Sterrato dei vigneti', 4, 'sterrato', [[262, 256], [262, 276]]],
    ['faro', 'Sterrato del faro', 4, 'sterrato', [[104, 366], [96, 378]]],
  ];
  // polilinea con gli angoli raccordati da archi (raggio r), campionata ogni ~2 m
  function rounded(pts, r, closed) {
    const n = pts.length, out = [], P = i => pts[(i + n) % n];
    const corner = (a, b, c) => {
      const d1 = Math.hypot(b[0] - a[0], b[1] - a[1]), d2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
      const u1 = [(b[0] - a[0]) / d1, (b[1] - a[1]) / d1], u2 = [(c[0] - b[0]) / d2, (c[1] - b[1]) / d2];
      const ang = Math.acos(clamp(u1[0] * u2[0] + u1[1] * u2[1], -1, 1)); if (ang < .05) return [b.slice()];
      const t = Math.min(r * Math.tan(ang / 2), d1 * .45, d2 * .45), p1 = [b[0] - u1[0] * t, b[1] - u1[1] * t], p2 = [b[0] + u2[0] * t, b[1] + u2[1] * t];
      const k = Math.max(3, Math.ceil(ang * 8)), res = [];
      for (let i = 0; i <= k; i++) { const s = i / k, q = [(1 - s) * (1 - s) * p1[0] + 2 * s * (1 - s) * b[0] + s * s * p2[0], (1 - s) * (1 - s) * p1[1] + 2 * s * (1 - s) * b[1] + s * s * p2[1]]; res.push(q); }
      return res;
    };
    const verts = [];
    if (closed) for (let i = 0; i < n; i++) verts.push(...corner(P(i - 1), P(i), P(i + 1)));
    else { verts.push(pts[0].slice()); for (let i = 1; i < n - 1; i++) verts.push(...corner(pts[i - 1], pts[i], pts[i + 1])); verts.push(pts[n - 1].slice()); }
    if (closed) verts.push(verts[0].slice());
    for (let i = 0; i < verts.length - 1; i++) { const [ax, ay] = verts[i], [bx, by] = verts[i + 1], L = Math.hypot(bx - ax, by - ay), k = Math.max(1, Math.ceil(L / 2)); for (let j = 0; j < k; j++) out.push([ax + (bx - ax) * j / k, ay + (by - ay) * j / k]); }
    out.push(verts[verts.length - 1].slice());
    return out;
  }

  // ---------------- EDIFICI CON NOME ----------------
  // id, nome, w, h (caselle), piani, stile, punto preferito (m), extra
  const NAMED = [
    ['chiesa', 'Chiesa di San Rocco', 10, 7, 5, 9, [400, 600], { church: true, home: true }],
    ['bar', 'Bar Da Gino', 5, 6, 5, 1, [380, 616], { sign: { t: 'BAR GINO', c: '#ff4fa3' }, shop: true }],
    ['wu', 'Alimentari Wu', 5, 5, 4, 7, [420, 618], { sign: { t: '吳 ALIMENTARI', c: '#ff3b3b' }, shop: true, lanterns: true }],
    ['biblioteca', 'Biblioteca civica', 7, 6, 4, 2, [436, 600], {}],
    ['ambulatorio', 'Ambulatorio', 5, 6, 3, 8, [366, 598], { sign: { t: '✚ AMBULATORIO', c: '#4dff9a' } }],
    ['flipper', 'Sala giochi Flipper', 5, 6, 3, 3, [444, 622], { sign: { t: 'FLIPPER', c: '#35e6ff' } }],
    ['stella', 'Condominio Stella', 6, 7, 7, 2, [352, 620], { home: true }],
    ['aurora', 'Condominio Aurora', 6, 7, 6, 4, [460, 616], { home: true }],
    ['mare', 'Condominio Mare', 6, 6, 6, 0, [482, 600], { home: true }],
    ['commissariato', 'Caserma della Guardia', 9, 6, 3, 10, [318, 622], { sign: { t: 'GUARDIA', c: '#5a8aff' } }],
    ['officina', 'Officina di Dorino', 6, 5, 2, 3, [300, 596], { sign: { t: 'VESPE', c: '#ffd23b' } }],
    ['osteria', 'Osteria del Porto', 9, 5, 4, 5, [388, 652], { sign: { t: 'OSTERIA', c: '#ffb35c' } }],
    ['miramare', 'Hotel Miramare', 7, 6, 7, 6, [470, 648], { sign: { t: 'MIRAMARE', c: '#ff7ad9' }, deco: true }],
    ['magazzino', 'Magazzino Neri', 9, 5, 3, 11, [440, 662], { sign: { t: 'NERI', c: '#ff6a3b' }, warehouse: true }],
    ['disco', 'Discoteca Luna', 9, 5, 3, 12, [262, 576], { sign: { t: 'LUNA', c: '#c05cff' }, deco: true }],
    ['cinema', 'Cinema Astor', 8, 6, 4, 13, [248, 596], { sign: { t: 'CINEMA ASTOR', c: '#ffd23b' }, deco: true }],
    ['gabbiano', 'Pensione Gabbiano', 6, 6, 4, 15, [274, 628], { sign: { t: 'PENSIONE', c: '#35e6ff' } }],
    ['benzina', 'Distributore', 4, 3, 1, 16, [286, 548], { sign: { t: 'BENZINA', c: '#ffd23b' }, kiosk: true }],
    ['sirena', 'Bar Sirena', 5, 4, 3, 17, [292, 650], { sign: { t: 'BAR SIRENA', c: '#35ffc0' }, shop: true, deco: true }],
    ['cantiere', 'Cantiere navale', 8, 4, 3, 11, [254, 664], { warehouse: true, sign: { t: 'CANTIERE', c: '#ff8a3b' } }],
    ['santuario', 'Santuario del Mare', 8, 4, 4, 9, [528, 600], { church: true }],
    ['car_2', 'Trattoria da Nina', 6, 4, 4, 0, [498, 588], { sign: { t: 'TRATTORIA', c: '#ffb35c' }, shop: true }],
    ['flamingo', 'Hotel Flamingo', 7, 7, 5, 23, [514, 640], { sign: { t: 'FLAMINGO', c: '#ff4fa3' }, deco: true }],
    ['paradiso', 'Hotel Paradiso', 7, 7, 6, 24, [536, 626], { sign: { t: 'PARADISO', c: '#35e6ff' }, deco: true }],
    ['gelateria', 'Gelateria Polo Nord', 4, 5, 2, 25, [494, 646], { sign: { t: 'GELATI', c: '#8affd0' }, deco: true, shop: true }],
    ['oceano', 'Hotel Oceano', 7, 7, 7, 26, [556, 612], { sign: { t: 'OCEANO', c: '#b28cff' }, deco: true }],
    ['video', 'Videoteca Stella', 4, 5, 3, 27, [490, 618], { sign: { t: 'VIDEO 2000', c: '#ff5a5a' }, deco: true }],
    ['chiosco', 'Bagni Lido', 4, 2, 1, 28, [560, 652], { sign: { t: 'BAGNI LIDO', c: '#ff9a3c' }, kiosk: true }],
    ['faro', 'Faro di Punta Scogli', 3, 3, 7, 9, [168, 690], { lighthouse: true }],
    // fuori città
    ['rocca', 'Rocca della Tutela', 14, 10, 5, 10, [400, 192], { sign: { t: 'TUTELA', c: '#ff3b3b' } }],
    ['chiesa_sg', 'Chiesa di San Giacomo', 6, 5, 4, 9, [494, 322], { church: true }],
    ['osteria_sg', 'Osteria di San Giacomo', 5, 4, 3, 5, [478, 318], { sign: { t: 'OSTERIA', c: '#ffb35c' }, shop: true }],
    ['masseria', 'Masseria Sant\'Elia', 8, 6, 2, 4, [292, 404], {}],
    ['cantina', 'Cantina dei vigneti', 7, 5, 2, 7, [508, 492], {}],
    ['casotto', 'Casotto della cava', 4, 3, 1, 11, [640, 256], { warehouse: true }],
    ['ovile_b', 'Ovile abbandonato', 5, 4, 1, 9, [692, 332], {}],
    ['caserma_p', 'Poligono: caserma', 10, 5, 2, 10, [156, 404], { military: true }],
    ['hangar1', 'Poligono: hangar', 9, 8, 3, 11, [136, 446], { warehouse: true, military: true }],
    ['hangar2', 'Poligono: deposito', 8, 6, 2, 11, [112, 432], { warehouse: true, military: true }],
    ['miniera', 'Miniera abbandonata', 6, 4, 2, 11, [124, 304], { warehouse: true }],
    ['salinaio', 'Casa del salinaio', 4, 4, 2, 4, [196, 548], {}],
  ];


  // ---------------- LA CITTÀ ----------------
  // Isolati regolari ma non uguali: vie est-ovest e nord-sud dritte (allineate alla griglia delle caselle),
  // le traverse si sfalsano di qualche metro a ogni incrocio e alcune si interrompono. Niente curve in città.
  function cityPlan(r) {
    const land = (x, y) => { const p = polar(x, y); return coastR(p.th) - p.d > 7; };
    const inTown = (x, y) => land(x, y) && x > 96 && x < 344 && y > 294;
    const roads = [], T2 = v => Math.round(v / TS);
    // strada dritta: centro e larghezza in metri → rettangolo di caselle con esattamente w/2 caselle di carreggiata
    const street = (id, name, w, kind, horiz, c, a, b) => {
      const n = w / TS, t0 = Math.round(c / TS - n / 2), ta = T2(Math.min(a, b)), tb = T2(Math.max(a, b)) - 1;
      if (tb - ta < 2) return null;
      const rect = horiz ? [ta, t0, tb, t0 + n - 1] : [t0, ta, t0 + n - 1, tb];
      const cm = (t0 + n / 2) * TS, pts = [];
      const L = (tb + 1 - ta) * TS, k = Math.max(1, Math.round(L / 3));
      for (let q = 0; q <= k; q++) { const u = ta * TS + L * q / k; pts.push(horiz ? [u, cm] : [cm, u]); }
      const rd = { id, name, w, kind, rect, pts, horiz }; roads.push(rd); return rd;
    };
    // tratto di una via orizzontale: solo dove c'è città (si spezza sulla baia)
    const runs = (y, x0, x1) => { const out = []; let a = null; for (let x = x0; x <= x1; x += 2) { const ok = inTown(x, y - 5) && inTown(x, y + 5); if (ok && a === null) a = x; if ((!ok || x + 2 > x1) && a !== null) { if (x - a >= 20) out.push([a, ok ? x : x - 2]); a = null; } } return out; };
    const H = [[302, 120, 320, 6, 'Via Nuova'], [334, 100, 340, 6, 'Via Alta'], [366, 96, 344, 8, 'Via del Porto'], [398, 96, 344, 6, 'Lungomare']];
    const hs = [];
    H.forEach(([y, x0, x1, w, name], j) => runs(y, x0, x1).forEach(([a, b], q) => { const rd = street('h' + j + '_' + q, name, w, 'citta', true, y, a, b); if (rd) hs.push({ rd, y, a, b, j }); }));
    const V = [[112, 'Via di Ponente', 6, 1], [140, 'Via dei Cordai', 4], [164, 'Viale delle Palme', 6], [192, 'Salita dei Lanternini', 6, 1], [220, 'Corso San Rocco', 8, 1],
      [248, 'Via dei Caruggi', 6, 1], [276, 'Salita del Campo', 6], [300, 'Vico delle Reti', 4], [326, 'Via del Lido', 6, 1]];
    V.forEach(([x, name, w, main], vi) => {
      for (let j = 0; j < H.length - 1; j++) {
        const y0 = H[j][0], y1 = H[j + 1][0];
        if (x === 220 && j === 1) continue;                                  // il corso si apre nella piazza
        if (!main && r() < .16) continue;                                   // isolato più grande: la traversa non c'è
        const jog = main ? 0 : [-2, 0, 0, 2][Math.floor(r() * 4)];
        const xx = x + jog;
        if (!inTown(xx, y0 + 4) || !inTown(xx, y1 - 4)) continue;
        // deve toccare una via orizzontale sopra e sotto
        const top = hs.find(h => h.j === j && xx > h.a + 4 && xx < h.b - 4), bot = hs.find(h => h.j === j + 1 && xx > h.a + 4 && xx < h.b - 4);
        if (!top || !bot) continue;
        street('v' + vi + '_' + j, name, w, w <= 4 ? 'vicolo' : 'citta', false, xx, y0 + H[j][3] / 2, y1 - H[j + 1][3] / 2);
      }
    });
    // le estremità del lungomare, dove arriva la litoranea
    const lung = hs.filter(h => h.j === 3).sort((p, q) => p.a - q.a);
    const ends = { west: lung.length ? [lung[0].a, 398] : [100, 366], east: lung.length ? [lung[lung.length - 1].b, 398] : [340, 366] };
    return { roads, ends, piazza: [196, 338, 244, 362] };
  }

  // ---------------- GENERAZIONE ----------------
  function generate() {
    const N = GW * GH;
    const grid = new Uint8Array(N).fill(T.WATER), zone = new Uint8Array(N), elev = new Float32Array(N), bIndex = new Int16Array(N).fill(-1);
    const VW = GW + 1, velev = new Float32Array(VW * (GH + 1));
    const roadW = new Float32Array(N); // larghezza della strada più larga che passa sulla casella (0 = nessuna)
    const reserved = new Uint8Array(N); // porte e soglie: non ci si costruisce sopra
    const r = rng(1986), T2i = v => Math.round(v / TS);
    // quote ai vertici
    for (let j = 0; j <= GH; j++) for (let i = 0; i <= GW; i++) velev[j * VW + i] = rawElev(i * TS, j * TS);
    // terra, zone, quote delle caselle
    for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) {
      const i = ty * GW + tx, x = tx * TS + 1, y = ty * TS + 1, z = zoneAt(x, y);
      zone[i] = z;
      elev[i] = (velev[ty * VW + tx] + velev[ty * VW + tx + 1] + velev[(ty + 1) * VW + tx] + velev[(ty + 1) * VW + tx + 1]) / 4;
      if (z === Z.MARE) continue;
      const p = polar(x, y), inl = coastR(p.th) - p.d;
      let v = T.GRASS;
      if (z === Z.DESERTO) v = T.DESERT;
      else if (z === Z.MONTE) v = fbm(x / 18, y / 18, 52, 2) > .64 ? T.ROCK : fbm(x / 30, y / 30, 51, 2) > .5 ? T.TREE : T.SHRUB;
      else if (z === Z.MACCHIA) v = fbm(x / 22, y / 22, 61, 3) > .38 ? T.TREE : T.SHRUB;
      else if (z === Z.CAMPAGNA) v = fbm(x / 70, y / 70, 71, 2) > .52 ? T.FIELD : fbm(x / 40, y / 40, 72, 2) > .6 ? T.TREE : T.GRASS;
      else if (z === Z.CITTA) v = T.COB;
      // costa: spiagge e scogliere
      if (inl < 9) { const rocky = fbm(Math.cos(p.th) * 4 + 9, Math.sin(p.th) * 4 + 9, 81, 2) > .55 || z === Z.MONTE || (z === Z.MACCHIA && inl < 6); v = rocky ? T.ROCK : z === Z.DESERTO ? T.DESERT : T.SAND; if (!rocky && z !== Z.CITTA) zone[i] = z === Z.DESERTO ? Z.DESERTO : Z.SPIAGGIA; }
      grid[i] = v;
    }
    // saline e lago
    const blob = (cx, cy, rx, ry, f) => { for (let ty = Math.floor((cy - ry) / TS); ty <= Math.ceil((cy + ry) / TS); ty++) for (let tx = Math.floor((cx - rx) / TS); tx <= Math.ceil((cx + rx) / TS); tx++) { if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) continue; const x = tx * TS + 1, y = ty * TS + 1, q = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + (fbm(x / 9, y / 9, 91, 2) - .5) * .6; if (q < 1) f(ty * GW + tx, q); } };
    blob(...K(205, 560), 34 * KF, 20 * KF, i => { if (grid[i] !== T.WATER) grid[i] = T.SALT; });
    const LAKE = { x: K(328, 350)[0], y: K(328, 350)[1], rx: 30 * KF, ry: 22 * KF, h: .2 };
    blob(LAKE.x, LAKE.y, LAKE.rx, LAKE.ry, (i, q) => { grid[i] = q < .8 ? T.WATER : T.SAND; elev[i] = q < .8 ? -1 : .4; });
    // strade
    const roads = [];
    // ---- la città a isolati: vie dritte, sfalsate agli incroci ----
    const CITY = cityPlan(r);
    // la litoranea: un anello largo che gira intorno all'isola e rientra in città dalle due estremità della Via del Porto
    const lw = CITY.ends.west, le = CITY.ends.east, ring = [lw, [lw[0] - 18, lw[1]]];
    for (let a = 140; a <= 400; a += 26) { const th = a * Math.PI / 180; const rr = coastR(th) - 22; ring.push([CX + Math.cos(th) * rr, CY + Math.sin(th) * rr]); }
    ring.push([le[0] + 18, le[1]], le);
    roads.push({ id: 'litoranea', name: 'Litoranea', w: 9, kind: 'litoranea', pts: rounded(ring, 22, false) });
    CITY.roads.forEach(rd => roads.push(rd));
    ROADS0.forEach(([id, name, w, kind, cp]) => roads.push({ id, name, w, kind, pts: rounded(cp, w > 5 ? 16 : 8, false) }));
    const paint = (rd) => {
      if (rd.rect) {
        const q = rd.rect, v = rd.kind === 'vicolo' ? T.COB : T.VIA;
        for (let ty = q[1] - 1; ty <= q[3] + 1; ty++) for (let tx = q[0] - 1; tx <= q[2] + 1; tx++) {
          if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) continue; const i = ty * GW + tx;
          if (grid[i] === T.WATER) continue;
          const core = tx >= q[0] && tx <= q[2] && ty >= q[1] && ty <= q[3];
          if (core) { if (v === T.VIA || roadW[i] === 0) { grid[i] = v; roadW[i] = Math.max(roadW[i], rd.w); } }
          else if (rd.kind !== 'vicolo' && roadW[i] === 0) grid[i] = T.WALK;
        }
        return;
      }
      const half = rd.w / 2, walk = rd.kind === 'citta' || rd.kind === 'litoranea' ? 2 : 0;
      for (let k = 0; k < rd.pts.length - 1; k++) {
        const [ax, ay] = rd.pts[k], [bx, by] = rd.pts[k + 1], L = dist(ax, ay, bx, by) || 1;
        const minx = Math.floor((Math.min(ax, bx) - half - walk - 2) / TS), maxx = Math.ceil((Math.max(ax, bx) + half + walk + 2) / TS);
        const miny = Math.floor((Math.min(ay, by) - half - walk - 2) / TS), maxy = Math.ceil((Math.max(ay, by) + half + walk + 2) / TS);
        for (let ty = miny; ty <= maxy; ty++) for (let tx = minx; tx <= maxx; tx++) {
          if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) continue;
          const x = tx * TS + 1, y = ty * TS + 1, t = clamp(((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / (L * L), 0, 1);
          const d = dist(x, y, ax + (bx - ax) * t, ay + (by - ay) * t), i = ty * GW + tx;
          if (grid[i] === T.WATER && zone[i] === Z.MARE) continue;
          if (d <= half) {
            const v = rd.kind === 'sterrato' ? T.DIRT : rd.kind === 'vicolo' ? T.COB : T.VIA;
            if (grid[i] === T.WATER) { grid[i] = T.PIER; continue; }   // ponticello sul lago o sulle saline
            if (v === T.VIA || roadW[i] === 0) { grid[i] = v; roadW[i] = Math.max(roadW[i], rd.w); }
          } else if (walk && d <= half + walk && roadW[i] === 0 && grid[i] !== T.WATER) grid[i] = zone[i] === Z.CITTA ? T.WALK : grid[i] === T.TREE ? T.SHRUB : grid[i];
          else if (d <= half + 1.5 && grid[i] === T.TREE) grid[i] = T.SHRUB;    // margini liberi lungo le strade
        }
      }
    };
    roads.forEach(paint);
    // quote lisce lungo le strade: media lungo il tracciato
    roads.forEach(rd => {
      const hs = rd.pts.map(([x, y]) => rawElev(x, y)), sm = hs.map((h, k) => { let s = 0, c = 0; for (let q = -6; q <= 6; q++) { const v = hs[clamp(k + q, 0, hs.length - 1)]; s += v; c++; } return Math.max(.4, s / c); });
      rd.h = sm;
      const half = rd.w / 2 + (rd.kind === 'citta' || rd.kind === 'litoranea' ? 2 : 0);
      rd.pts.forEach(([x, y], k) => { for (let ty = Math.floor((y - half) / TS); ty <= Math.floor((y + half) / TS); ty++) for (let tx = Math.floor((x - half) / TS); tx <= Math.floor((x + half) / TS); tx++) { if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) continue; if (dist(x, y, tx * TS + 1, ty * TS + 1) > half) continue; elev[ty * GW + tx] = sm[k]; } });
    });
    // porto: banchine, moli, pontili
    for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) {
      const i = ty * GW + tx, x = tx * TS + 1, y = ty * TS + 1;
      if (zone[i] !== Z.CITTA && zone[i] !== Z.SPIAGGIA) continue;
      if (grid[i] === T.WATER) continue;
      const p = polar(x, y), inl = coastR(p.th) - p.d;
      if (inl < 9 && x > 160 && x < 280 && grid[i] !== T.VIA) { grid[i] = T.QUAY; elev[i] = .4; }
    }
    const pier = (x0, y0, x1, y1, w) => { const L = dist(x0, y0, x1, y1); for (let s = 0; s <= L; s += 1) { const x = x0 + (x1 - x0) * s / L, y = y0 + (y1 - y0) * s / L; for (let o = -w / 2; o <= w / 2; o += 1) { const px = x + (y1 - y0) / L * o, py = y - (x1 - x0) / L * o, tx = Math.floor(px / TS), ty = Math.floor(py / TS), i = ty * GW + tx; if (grid[i] === T.WATER) { grid[i] = T.PIER; elev[i] = .9; } } } };
    // moli foranei che chiudono il porto, pontili dentro la baia
    const mole = (pts, w) => { for (let k = 0; k < pts.length - 1; k++) pier(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], w); };
    mole([[174, 378], [178, 400], [192, 412], [206, 416]], 5); mole([[266, 378], [262, 400], [248, 412], [234, 416]], 5);
    pier(198, 376, 196, 396, 3); pier(242, 376, 244, 396, 3); pier(220, 376, 220, 400, 3); pier(208, 376, 207, 390, 2); pier(232, 376, 233, 390, 2);
    // piazza San Rocco e fontana
    { const q = CITY.piazza; for (let ty = T2i(q[1]); ty < T2i(q[3]); ty++) for (let tx = T2i(q[0]); tx < T2i(q[2]); tx++) { const i = ty * GW + tx; if (grid[i] !== T.VIA && grid[i] !== T.WATER) { grid[i] = T.PIAZZA; roadW[i] = 0; } } }
    blob(220, 350, 3, 3, i => { grid[i] = T.FOUNT; });
    blob(...K(483, 330), 10 * KF, 8 * KF, i => { if (grid[i] !== T.VIA) grid[i] = T.PIAZZA; });            // piazza di San Giacomo
    blob(...K(400, 205), 14 * KF, 6 * KF, i => { if (grid[i] !== T.VIA) grid[i] = T.PIAZZA; });            // spiazzo della Rocca
    blob(...K(640, 262), 22 * KF, 18 * KF, i => { if (grid[i] !== T.VIA && grid[i] !== T.DIRT) grid[i] = T.ROCK; });   // la cava
    blob(...K(586, 450), 12 * KF, 9 * KF, i => { if (grid[i] !== T.VIA) grid[i] = T.DIRT; });               // discarica
    blob(...K(686, 336), 13 * KF, 10 * KF, i => { if (grid[i] !== T.VIA && grid[i] !== T.DIRT) grid[i] = T.GRASS; });  // radura dell'ovile
    blob(...K(612, 360), 9 * KF, 7 * KF, i => { if (grid[i] === T.TREE) grid[i] = T.GRASS; });            // radura del pastore
    blob(...K(140, 425), 40 * KF, 30 * KF, i => { if (grid[i] !== T.VIA) grid[i] = T.DIRT; });             // il poligono
    blob(...K(124, 304), 12 * KF, 9 * KF, i => { if (grid[i] !== T.VIA) grid[i] = T.ROCK; });             // bocca della miniera

    // ---------------- EDIFICI ----------------
    const B = [];
    const free = (x, y, w, h, gap) => {
      for (let ty = y - gap; ty < y + h + gap; ty++) for (let tx = x - gap; tx < x + w + gap; tx++) {
        if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) return false;
        const i = ty * GW + tx, v = grid[i];
        if (bIndex[i] >= 0 || (reserved[i] && tx >= x && tx < x + w && ty >= y && ty < y + h)) return false;
        const inner = tx >= x && tx < x + w && ty >= y && ty < y + h;
        if (inner && (v === T.WATER || v === T.VIA || v === T.PIER || v === T.QUAY || v === T.FOUNT || v === T.PIAZZA || v === T.DIRT || v === T.WALK || roadW[i] > 0)) return false;
        if (!inner && v === T.WATER && zone[i] === Z.MARE) continue;
      }
      return true;
    };
    const stamp = (b) => {
      const k = B.length; b.i = k; B.push(b);
      let hmin = 1e9; for (let ty = b.y; ty < b.y + b.h; ty++) for (let tx = b.x; tx < b.x + b.w; tx++) hmin = Math.min(hmin, elev[ty * GW + tx]);
      b.base = Math.max(.3, hmin);
      for (let ty = b.y; ty < b.y + b.h; ty++) for (let tx = b.x; tx < b.x + b.w; tx++) { const i = ty * GW + tx; grid[i] = T.BLD; bIndex[i] = k; elev[i] = b.base; }
      // la porta: la casella libera sul lato più vicino a una strada
      let best = null, bd = 1e9;
      for (let ty = b.y - 1; ty <= b.y + b.h; ty++) for (let tx = b.x - 1; tx <= b.x + b.w; tx++) {
        const edge = tx === b.x - 1 || tx === b.x + b.w || ty === b.y - 1 || ty === b.y + b.h, corner = (tx === b.x - 1 || tx === b.x + b.w) && (ty === b.y - 1 || ty === b.y + b.h);
        if (!edge || corner || tx < 0 || ty < 0 || tx >= GW || ty >= GH) continue;
        const v = grid[ty * GW + tx]; if (v === T.BLD || v === T.WATER || v === T.TREE || v === T.FOUNT) continue;
        const roadish = v === T.VIA || v === T.WALK || v === T.PIAZZA || v === T.COB || v === T.QUAY || v === T.DIRT ? 0 : 3;
        const mid = Math.abs((tx + .5) - (b.x + b.w / 2)) + Math.abs((ty + .5) - (b.y + b.h / 2)) * .9;
        const s = roadish + mid * .3 + (v === T.VIA ? 1.2 : 0) + hash2(tx, ty, 5) * .2;
        if (s < bd) { bd = s; best = [tx, ty]; }
      }
      if (best) { b.door = best; reserved[best[1] * GW + best[0]] = 1; const ox = best[0] + (best[0] < b.x ? -1 : best[0] >= b.x + b.w ? 1 : 0), oy = best[1] + (best[1] < b.y ? -1 : best[1] >= b.y + b.h ? 1 : 0); if (ox >= 0 && oy >= 0 && ox < GW && oy < GH) reserved[oy * GW + ox] = 1; }
      return b;
    };
    // posto per un edificio vicino a un punto: cerca a spirale
    const site = (px, py, w, h, gap) => {
      const cx = Math.floor(px / TS - w / 2), cy = Math.floor(py / TS - h / 2);
      for (let rr = 0; rr < 26; rr++) for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== rr) continue;
        if (free(cx + dx, cy + dy, w, h, gap)) return [cx + dx, cy + dy];
      }
      return null;
    };
    // fronte strada: l'edificio si appoggia al marciapiede della via, con la facciata sul filo
    const cityRoads = roads.filter(rd => rd.rect);
    const depthAt = (x, y, dx, dy, max) => { let d = 0; while (d < max) { const tx = x + dx * d, ty = y + dy * d; if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) break; const i = ty * GW + tx, v = grid[i]; if (v !== T.COB || roadW[i] > 0 || bIndex[i] >= 0) break; d++; } return d; };
    // tutte le posizioni a filo strada per un edificio largo w (lungo la via) e profondo h
    const frontage = (rd, side, w, h) => {
      const q = rd.rect, out = [];
      if (rd.horiz) { const fy = side < 0 ? q[1] - 2 : q[3] + 2, y = side < 0 ? fy - h + 1 : fy; for (let x = q[0]; x + w - 1 <= q[2]; x++) out.push([x, y, w, h]); }
      else { const fx = side < 0 ? q[0] - 2 : q[2] + 2, x = side < 0 ? fx - h + 1 : fx; for (let y = q[1]; y + w - 1 <= q[3]; y++) out.push([x, y, h, w]); }
      return out;
    };
    const townPt = ([x, y]) => x > 96 && x < 344 && y > 296;
    NAMED.forEach(([id, name, w, h, fl, style, at0, ex]) => {
      const at = K(at0[0], at0[1]);
      let s = null;
      if (townPt(at) && !ex.kiosk && !ex.lighthouse && id !== 'cantiere') {
        let bd = 70;
        cityRoads.forEach(rd => [-1, 1].forEach(side => [[w, h], [h, w]].forEach(([a, c]) => frontage(rd, side, a, c).forEach(([x, y, ww, hh]) => {
          const d = dist((x + ww / 2) * TS, (y + hh / 2) * TS, at[0], at[1]); if (d < bd && free(x, y, ww, hh, 0)) { bd = d; s = [x, y, ww, hh]; }
        }))));
      }
      if (!s) { const q = site(at[0], at[1], w, h, 1); if (q) s = [q[0], q[1], w, h]; }
      if (!s) return;
      stamp(Object.assign({ id, name, x: s[0], y: s[1], w: s[2], h: s[3], fl, style }, ex));
    });
    // case lungo le strade di città e dei paesi: isolati di forme diverse, affacciati sulla strada
    let nH = 0;
    const along = (rd, step, minS, maxS, fl0, fl1, styles, zoneOk, deep, gap) => {
      for (let k = 0; k < rd.pts.length - 1; k += step) {
        const [ax, ay] = rd.pts[k], [bx, by] = rd.pts[Math.min(rd.pts.length - 1, k + 1)], L = dist(ax, ay, bx, by) || 1, nx = -(by - ay) / L, ny = (bx - ax) / L;
        for (const side of [-1, 1]) {
          const w = minS + Math.floor(r() * (maxS - minS + 1)), h = minS + Math.floor(r() * (maxS - minS + (deep || 1)));
          const off = rd.w / 2 + 2.5 + (rd.kind === 'citta' || rd.kind === 'litoranea' ? 2 : 0) + h * TS / 2 + r() * 2;
          const px = ax + nx * side * off, py = ay + ny * side * off;
          if (!zoneOk(zone[Math.floor(py / TS) * GW + Math.floor(px / TS)])) continue;
          const x = Math.floor(px / TS - w / 2), y = Math.floor(py / TS - h / 2);
          if (!free(x, y, w, h, gap === undefined ? 1 : gap)) continue;
          stamp({ id: 'casa_' + (nH++), x, y, w, h, fl: fl0 + Math.floor(r() * (fl1 - fl0 + 1)), style: styles[Math.floor(r() * styles.length)], house: true });
        }
      }
    };
    const nearCity = z => z === Z.CITTA || z === Z.CAMPAGNA;
    // case a schiera lungo le vie di città: facciate continue, profonde metà dell'isolato
    const CSTY = [0, 1, 2, 3, 4, 5, 6, 7, 8, 14, 15, 18, 19, 20, 21, 22];
    const row = (rd, side) => {
      const q = rd.rect, horiz = rd.horiz, len = horiz ? q[2] - q[0] + 1 : q[3] - q[1] + 1;
      for (let u = 0; u < len;) {
        // profondità disponibile dal filo strada verso l'interno dell'isolato
        const fx = horiz ? q[0] + u : side < 0 ? q[0] - 2 : q[2] + 2, fy = horiz ? (side < 0 ? q[1] - 2 : q[3] + 2) : q[1] + u;
        const D = depthAt(fx, fy, horiz ? 0 : side, horiz ? side : 0, 16);
        if (D < 3) { u++; continue; }
        const h = D >= 9 ? Math.min(7, Math.floor(D / 2)) : D;
        let placed = false;
        for (let w = Math.min(len - u, 3 + Math.floor(r() * 4)); w >= 3 && !placed; w--) {
          const x = horiz ? q[0] + u : side < 0 ? fx - h + 1 : fx, y = horiz ? (side < 0 ? fy - h + 1 : fy) : q[1] + u;
          const bw = horiz ? w : h, bh = horiz ? h : w;
          if (!free(x, y, bw, bh, 0)) continue;
          stamp({ id: 'casa_' + (nH++), x, y, w: bw, h: bh, fl: 2 + Math.floor(r() * 4), style: CSTY[Math.floor(r() * CSTY.length)], house: true });
          u += w; placed = true;
        }
        if (!placed) u++;
      }
    };
    // prima le vie principali, poi i vicoli; due passate per chiudere gli angoli
    for (let pass = 0; pass < 2; pass++) cityRoads.slice().sort((a, b) => (b.kind === 'citta') - (a.kind === 'citta')).forEach(rd => { row(rd, -1); row(rd, 1); });
    // gli angoli degli isolati: case che toccano due vie
    for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) {
      const i = ty * GW + tx; if (zone[i] !== Z.CITTA || grid[i] !== T.COB || roadW[i] > 0 || bIndex[i] >= 0) continue;
      let near = false; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const v = grid[(ty + dy) * GW + tx + dx]; if (v === T.WALK || v === T.PIAZZA) near = true; }
      if (!near) continue;
      for (const [w, h] of [[4, 4], [3, 4], [4, 3], [3, 3]]) { let ok = false; for (const [ox, oy] of [[0, 0], [1 - w, 0], [0, 1 - h], [1 - w, 1 - h]]) if (free(tx + ox, ty + oy, w, h, 0)) { stamp({ id: 'casa_' + (nH++), x: tx + ox, y: ty + oy, w, h, fl: 2 + Math.floor(r() * 3), style: CSTY[Math.floor(r() * CSTY.length)], house: true }); ok = true; break; } if (ok) break; }
    }
    // cortili: quello che resta dentro gli isolati diventa orto o cortile
    for (let i = 0; i < N; i++) if (zone[i] === Z.CITTA && grid[i] === T.COB && roadW[i] === 0) { const tx = i % GW, ty = (i / GW) | 0; let walk = false; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const v = grid[(ty + dy) * GW + tx + dx]; if (v === T.WALK || v === T.PIAZZA || v === T.VIA || v === T.QUAY) walk = true; } if (!walk) grid[i] = T.GRASS; }
    roads.filter(rd => rd.id === 'paese').forEach(rd => along(rd, 3, 4, 6, 2, 3, [0, 4, 5, 8], nearCity));
    roads.filter(rd => rd.id === 'monte' || rd.id === 'deserto' || rd.id === 'macchia').forEach(rd => along(rd, 18, 4, 6, 1, 2, [4, 5, 8], z => z === Z.CAMPAGNA));
    // masserie sparse in campagna
    for (let k = 0; k < 14; k++) {
      const [x, y] = K(260 + r() * 300, 260 + r() * 260); if (zoneAt(x, y) !== Z.CAMPAGNA) continue;
      const s = site(x, y, 5, 4, 2); if (!s) continue; stamp({ id: 'casa_' + (nH++), x: s[0], y: s[1], w: 5, h: 4, fl: 1 + Math.floor(r() * 2), style: [4, 5, 8][k % 3], house: true, farm: true });
    }

    // ---------------- ALTEZZE: un paese basso ----------------
    // quasi tutto a uno o due piani; poche eccezioni che si vedono da lontano
    const ALTI = { chiesa: 3, rocca: 5, faro: 7, miramare: 3, oceano: 4, stella: 3, santuario: 3 };
    B.forEach(b => { b.fl = ALTI[b.id] || (b.warehouse || b.kiosk || b.farm ? 1 : Math.min(b.fl, hash2(b.x, b.y, 3) < .3 ? 1 : 2)); });

    // ---------------- A CHE SERVE OGNI EDIFICIO ----------------
    // ogni porta porta da qualche parte: case con il nome di chi ci abita, botteghe, uffici, palestre, il teatro, fabbriche
    const COGNOMI = ['Esposito', 'Russo', 'Ferrara', 'Greco', 'Marino', 'Rizzo', 'Lombardi', 'Gallo', 'Costa', 'Fontana', 'Conti', 'De Luca', 'Mancini', 'Caruso', 'Serra', 'Pinna', 'Sanna', 'Melis', 'Deiana', 'Murru', 'Piras', 'Loi', 'Cocco', 'Porcu', 'Fadda', 'Atzori', 'Mura', 'Lai', 'Usai', 'Carta'];
    const NOMI = ['Bruno', 'Tina', 'Gavino', 'Nello', 'Pina', 'Efisio', 'Rosaria', 'Totò', 'Lella', 'Mario'];
    const city = B.filter(b => !b.name && b.door && zone[b.y * GW + b.x] === Z.CITTA).sort((a, c) => hash2(a.x, a.y, 11) - hash2(c.x, c.y, 11));
    const big = city.slice().sort((a, c) => c.w * c.h - a.w * a.h);
    const USES = [
      // uso, insegna, colore neon, quante
      ['teatro', 'TEATRO ODEON', '#ffd23b', 1, 'Teatro Odeon'], ['palestra', 'PALESTRA', '#ff4fa3', 2], ['ferramenta', 'FERRAMENTA', '#ff8a3b', 2], ['ufficio', 'UFFICI', '#7ab8ff', 3],
      ['barbiere', 'BARBIERE', '#35e6ff', 2], ['tabacchi', 'TABACCHI', '#5aff9a', 2], ['panetteria', 'PANETTERIA', '#ffb35c', 2], ['farmacia', '✚ FARMACIA', '#4dff9a', 1], ['lavanderia', 'LAVANDERIA', '#8affd0', 1],
      ['tipografia', 'TIPOGRAFIA', '#e8e0d0', 1], ['circolo', 'CIRCOLO', '#ff6a3b', 1, 'Circolo dei Lavoratori'], ['scuola', 'SCUOLA', '#ffffff', 1, 'Scuola elementare'], ['sartoria', 'SARTORIA', '#ff7ad9', 1], ['pescheria', 'PESCHERIA', '#35e6ff', 1],
    ];
    const taken = new Set();
    USES.forEach(([use, sign, col, n, label], k) => {
      for (let i = 0; i < n; i++) {
        const b = (use === 'teatro' ? big : city).find(q => !taken.has(q)); if (!b) return; taken.add(b);
        b.use = use; b.sign = { t: sign, c: col }; b.shop = true;
        b.name = label || (use.charAt(0).toUpperCase() + use.slice(1)) + ' ' + NOMI[(k * 3 + i) % NOMI.length];
      }
    });
    // fuori città: due fabbriche nei capannoni più grandi della campagna, il resto case e cascine
    const rural = B.filter(b => !b.name && b.door && zone[b.y * GW + b.x] !== Z.CITTA).sort((a, c) => c.w * c.h - a.w * a.h);
    [['fabbrica', 'Conservificio Sanna'], ['fabbrica', 'Mattonificio Piras']].forEach(([use, label], i) => { const b = rural[i]; if (b) { b.use = use; b.name = label; b.sign = { t: i ? 'MATTONIFICIO' : 'CONSERVE', c: '#ff8a3b' }; } });
    B.forEach((b, i) => { if (!b.use) b.use = b.name ? null : b.farm ? 'cascina' : 'casa'; if (!b.name) b.label = (b.farm ? 'Cascina ' : 'Casa ') + COGNOMI[Math.floor(hash2(b.x, b.y, 21) * COGNOMI.length)]; else b.label = b.name; });

    // ---------------- LUOGHI ----------------
    const PLACES = {};
    const tileOf = (x, y) => [Math.floor(x / TS), Math.floor(y / TS)];
    const walkable = (tx, ty) => { const v = grid[ty * GW + tx]; return v !== T.BLD && v !== T.WATER && v !== T.FOUNT && v !== T.TREE; };
    const nearWalk = (x, y) => { const [tx, ty] = tileOf(x, y); for (let rr = 0; rr < 12; rr++) for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === rr && walkable(tx + dx, ty + dy)) return [tx + dx, ty + dy]; return [tx, ty]; };
    B.forEach(b => { if (b.name && b.door) PLACES[b.id] = { id: b.id, name: b.name, tx: b.door[0], ty: b.door[1] }; });
    const P = (id, name, x, y) => { const [tx, ty] = nearWalk(x, y); PLACES[id] = { id, name, tx, ty }; };
    P('piazza', 'Piazza San Rocco', ...K(392, 622)); P('fontana', 'Fontana di San Rocco', ...K(406, 620)); P('vico', 'Vico dei Lanternini', ...K(346, 612));
    P('calata', 'Calata del porto', ...K(380, 670)); P('molo', 'Molo dei pescatori', ...K(334, 708)); P('pontile', 'Pontile Est', ...K(466, 708));
    P('fiori', 'Banco dei fiori', ...K(412, 628)); P('lungomare', 'Via al Mare', ...K(430, 650)); P('piazzetta', 'Vico del Campo', ...K(458, 606));
    P('pineta', 'Pineta di Ponente', ...K(238, 560)); P('giardini', 'Giardini delle Palme', ...K(316, 560)); P('marina', 'Marina di Ponente', ...K(290, 672));
    P('punta', 'Punta Scogli', ...K(176, 676)); P('salita', 'Salita San Giacomo', ...K(512, 600)); P('caruggio', 'Caruggio dei Pescatori', ...K(372, 600));
    P('belvedere', 'Belvedere', ...K(540, 586)); P('spiaggia', 'Spiaggia del Lido', ...K(560, 664)); P('passeggiata', 'Passeggiata a mare', ...K(528, 656));
    P('macchia', 'Ingresso della Macchia', ...K(600, 400)); P('sentiero', 'Sentiero dei sugheri', ...K(640, 390)); P('radura', 'Radura del pastore', ...K(612, 360));
    P('sugheri', 'Valle dei sugheri', ...K(660, 440)); P('ovile', 'Ovile abbandonato', ...K(686, 344)); P('cava', 'Cava di Monte Nero', ...K(636, 274));
    P('discarica', 'Discarica della Macchia', ...K(586, 448)); P('caletta', 'Caletta della Macchia', ...K(724, 448));
    P('deserto', 'Deserto delle Saline', ...K(230, 470)); P('saline', 'Saline', ...K(210, 548)); P('poligono', 'Poligono militare', ...K(160, 424));
    P('miniera', 'Miniera abbandonata', ...K(130, 318)); P('monte', 'Monte Nero', ...K(412, 250)); P('rocca', 'Rocca della Tutela', ...K(400, 214));
    P('vetta', 'Vetta di Monte Nero', ...K(432, 150)); P('lago', 'Lago di Sant\'Elia', ...K(350, 352)); P('sangiacomo', 'San Giacomo', ...K(483, 336));
    P('vigne', 'Vigneti', ...K(470, 486)); P('oliveto', 'Oliveto', ...K(340, 430));
    Object.values(PLACES).forEach(p => { p.x = p.tx * TS + TS / 2; p.y = p.ty * TS + TS / 2; });

    // ---------------- TUTTO RAGGIUNGIBILE ----------------
    const reach = new Uint8Array(N);
    const flood = (si) => { const q = [si]; reach[si] = 1; while (q.length) { const c = q.pop(), cx = c % GW, cy = (c / GW) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH || !walkable(nx, ny)) continue; const ni = ny * GW + nx; if (reach[ni]) continue; reach[ni] = 1; q.push(ni); } } };
    flood(PLACES.piazza.ty * GW + PLACES.piazza.tx);
    const nearReach = (tx0, ty0) => { for (let rr = 0; rr < 40; rr++) for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== rr) continue; const tx = tx0 + dx, ty = ty0 + dy; if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) continue; if (reach[ty * GW + tx]) return [tx, ty]; } return null; };
    // porte: un lato raggiungibile; se non c'è, si apre un passaggio fino alla strada più vicina
    B.forEach(b => {
      let best = null, bd = 1e9;
      for (let ty = b.y - 1; ty <= b.y + b.h; ty++) for (let tx = b.x - 1; tx <= b.x + b.w; tx++) {
        const edge = tx === b.x - 1 || tx === b.x + b.w || ty === b.y - 1 || ty === b.y + b.h, corner = (tx === b.x - 1 || tx === b.x + b.w) && (ty === b.y - 1 || ty === b.y + b.h);
        if (!edge || corner || tx < 0 || ty < 0 || tx >= GW || ty >= GH || !reach[ty * GW + tx]) continue;
        const v = grid[ty * GW + tx], sc = (v === T.VIA || v === T.WALK || v === T.PIAZZA || v === T.COB || v === T.QUAY ? 0 : 2) + (b.door && b.door[0] === tx && b.door[1] === ty ? -1 : 0) + hash2(tx, ty, 7) * .3;
        if (sc < bd) { bd = sc; best = [tx, ty]; }
      }
      if (!best && b.name) {
        // androne: dal centro del lato più vicino a una casella raggiungibile, scava finché la trova
        const mid = [Math.floor(b.x + b.w / 2), b.y + b.h], q = nearReach(mid[0], mid[1]);
        if (q) { let x = mid[0], y = mid[1]; for (let k = 0; k < 60 && !reach[y * GW + x]; k++) { const i = y * GW + x; if (grid[i] !== T.BLD) { grid[i] = T.COB; reach[i] = 1; } x += Math.sign(q[0] - x); if (x === q[0]) y += Math.sign(q[1] - y); } best = mid; flood(mid[1] * GW + mid[0]); }
      }
      b.door = best;
    });
    Object.values(PLACES).forEach(p => { if (!reach[p.ty * GW + p.tx]) { const q = nearReach(p.tx, p.ty); if (q) { p.tx = q[0]; p.ty = q[1]; } } });
    B.forEach(b => { if (b.name && b.door && PLACES[b.id]) { PLACES[b.id].tx = b.door[0]; PLACES[b.id].ty = b.door[1]; } });
    Object.values(PLACES).forEach(p => { p.x = p.tx * TS + TS / 2; p.y = p.ty * TS + TS / 2; });
    // quote ai vertici dalle caselle (strade e edifici spianati): il terreno che si vede
    const vh = new Float32Array(VW * (GH + 1));
    for (let j = 0; j <= GH; j++) for (let i = 0; i <= GW; i++) {
      let s2 = 0, c = 0, wet = false, lk = false;
      for (const [a, b2] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]) { if (a < 0 || b2 < 0 || a >= GW || b2 >= GH) { wet = true; continue; } const k = b2 * GW + a; if (grid[k] === T.WATER) { if (zone[k] === Z.MARE) wet = true; else lk = true; continue; } s2 += elev[k]; c++; }
      vh[j * VW + i] = lk ? (c ? Math.min(s2 / c, LAKE.h - .3) : LAKE.h - 1.8) : c ? (wet ? Math.min(s2 / c, .5) : s2 / c) : -2.2;
    }

    // ---------------- PARTENZE DEI VEICOLI E CORSIE ----------------
    const lanes = roads.filter(rd => rd.kind !== 'sterrato' && rd.kind !== 'vicolo').map(rd => ({ id: rd.id, w: rd.w, pts: rd.pts, closed: false }));
    return { LAKE, TS, GW, GH, SIZE, T, Z, ZNAME, grid, zone, elev, velev, vh, VW, reach, bIndex, roadW, roads, lanes, BUILDINGS: B, PLACES, coastR, zoneAt, rawElev, CX, CY };
  }

  // anteprima RGBA dall'alto (per la pianta)
  function preview(W, scale) {
    const s = scale || 2, w = W.GW * s, h = W.GH * s, px = new Uint8ClampedArray(w * h * 4);
    const col = {}; Object.entries({ COB: '#8c8073', VIA: '#3a3640', BLD: '#c8a07a', PIAZZA: '#b8a890', WATER: '#1f4f6e', QUAY: '#7a7068', FOUNT: '#5ab0d0', PIER: '#8a6a4a', SAND: '#e2cfa0', GRASS: '#6a9a50', STAIRS: '#a09080', WALK: '#a09a92', ROCK: '#8a8078', TREE: '#2f5a2a', DIRT: '#a08060', FIELD: '#b8b060', DESERT: '#e6c588', SALT: '#eef0f0', SHRUB: '#5a7a40' }).forEach(([k, v]) => { col[W.T[k]] = [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16)]; });
    for (let ty = 0; ty < W.GH; ty++) for (let tx = 0; tx < W.GW; tx++) {
      const i = ty * W.GW + tx, v = W.grid[i]; let c = col[v] || [255, 0, 255];
      const e = W.elev[i], shade = v === W.T.WATER ? 1 : clamp(.85 + e / 120, .7, 1.35);
      if (v === W.T.BLD) { const b = W.BUILDINGS[W.bIndex[i]]; c = b && b.name ? [230, 110, 140] : b && b.military ? [120, 130, 110] : [200, 160, 120]; }
      for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) { const o = ((ty * s + dy) * w + tx * s + dx) * 4; px[o] = c[0] * shade; px[o + 1] = c[1] * shade; px[o + 2] = c[2] * shade; px[o + 3] = 255; }
    }
    return { w, h, px };
  }

  const W = generate();
  W.preview = s => preview(W, s);
  W.hash2 = hash2; W.fbm = fbm; W.rng = rng;
  return W;
})();
if (typeof module !== 'undefined') module.exports = World;
