/* Porto Vecchio — il mondo: un'isola d'inverno, da ovest a est.
   [isola] La testa di bosco quasi tonda col Tavolato in mezzo (si sale solo a piedi) e la Spiaggia Lunga a sud
   → il collo di foresta che si stringe come una tromba → il Monte Scuro coi villaggi → periferia ovest con la sua collina
   → il quartiere del governo → centro (tutta la larghezza) → periferia est con la collina → il Muro → la Base della Tutela → il porto cargo e militare.
   Genera (sempre uguale, da un seme fisso) costa, quote, zone, strade, isolati, edifici con nome,
   luoghi, vegetazione e punti di partenza dei veicoli. Nessuna grafica: la usano motore e render.
   Coordinate in metri: x verso est, y verso sud. Una casella = 2 m. */
var World = (function () {
  'use strict';
  const TS = 2, SX = 1300, SY = 400, SIZE = SX, GW = SX / TS, GH = SY / TS, CX = 650, CY = 200;
  const T = { COB: 0, VIA: 1, BLD: 2, PIAZZA: 3, WATER: 4, QUAY: 5, FOUNT: 6, PIER: 7, SAND: 8, GRASS: 9, STAIRS: 10, WALK: 11, ROCK: 12, TREE: 13, DIRT: 14, FIELD: 15, DESERT: 16, SALT: 17, SHRUB: 18, CLIFF: 19, GRAVEL: 20 };
  // le costanti restano quelle di prima (le usano gli altri moduli): cambiano i nomi
  const Z = { MARE: 0, CITTA: 1, CAMPAGNA: 2, MACCHIA: 3, DESERTO: 4, MONTE: 5, SPIAGGIA: 6 };
  const ZNAME = ['mare', 'città', 'radura', 'foresta', 'prateria', 'collina', 'riva'];

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
  // la mezzeria dell'isola ondeggia appena; la larghezza cambia da quartiere a quartiere
  const yc = x => 140 + 10 * Math.sin(x / 90);
  const HW = [[0, 0], [10, 55], [30, 98], [70, 114], [130, 112], [165, 100], [215, 90], [258, 84], [300, 82], [345, 70], [405, 62], [462, 70], [500, 82], [540, 82], [556, 76], [574, 46], [598, 38], [650, 37], [666, 26], [676, 0]];
  function hw(x) {
    if (x <= HW[0][0] || x >= HW[HW.length - 1][0]) return 0;
    for (let k = 0; k < HW.length - 1; k++) { const [a, ha] = HW[k], [b, hb] = HW[k + 1]; if (x >= a && x < b) { const t = (x - a) / (b - a), s = t * t * (3 - 2 * t); return ha + (hb - ha) * s; } }
    return 0;
  }
  // frastagliatura delle due rive (nord e sud), con qualche caletta
  const cove = (x, c, w, d) => d * Math.exp(-((x - c) / w) * ((x - c) / w));
  const nN = x => 7 * (fbm(x / 34, 3.1, 5, 3) - .5) * 2 + cove(x, 120, 14, 9) + cove(x, 348, 10, 6);
  const nS = x => 7 * (fbm(x / 34, 8.7, 6, 3) - .5) * 2 + cove(x, 214, 12, 10) + cove(x, 470, 9, 5);
  const southY0 = x => yc(x) + hw(x) - nS(x);
  // il porto vecchio: una banchina dritta lungo la riva sud del centro (si raccorda con la costa ai due capi)
  const PORT = [352, 462, 192], portK = x => sstep(PORT[0] - 14, PORT[0], x) * (1 - sstep(PORT[1], PORT[1] + 14, x));
  const northY = x => yc(x) - hw(x) + nN(x), southY = x => { const k = portK(x); return southY0(x) * (1 - k) + PORT[2] * k; };
  const onLand = (x, y) => y > northY(x) && y < southY(x);
  const inland = (x, y) => Math.min(y - northY(x), southY(x) - y, (x < 40 ? x - 6 : 1e9), (x > 640 ? 672 - x : 1e9));
  // quartieri da ovest a est
  const DISTR = [[0, 'prateria'], [150, 'foresta'], [258, 'perif_o'], [348, 'centro'], [464, 'perif_e'], [556, 'base'], [622, 'porto']];
  const districtO = x => { let d = DISTR[0][1]; for (const [a, n] of DISTR) if (x >= a) d = n; return d; };
  const WALLX = 556;                                   // il Muro: tutta la larghezza dell'isola, un solo varco
  // le due colline delle periferie: boscose, coi bivacchi; finiscono nella periferia, non toccano la foresta né il centro
  // la dorsale: come l'Appennino taglia l'Italia, corre lungo la mezzeria tra le due costiere.
  // Nasce dalla foresta, si abbassa e si apre nel centro, risale nella periferia est fino al Muro.
  // a, b: dove comincia e finisce; up, dn: quanto è lunga la salita e la discesa; w: mezza larghezza in cima
  const HILLS = [{ id: 'o', a: 214, b: 386, up: 46, dn: 46, w: 40 }, { id: 'e', a: 436, b: 562, up: 36, dn: 4, w: 40 }];
  const ridgeT = (h, x) => x <= h.a || x >= h.b ? 0 : Math.min(sstep(h.a, h.a + h.up, x), 1 - sstep(h.b - h.dn, h.b, x));
  const hillQ = (x, y) => { let q = 9; for (const h of HILLS) { const t = ridgeT(h, x); if (t <= .02) continue; const hw2 = h.w * (.35 + .65 * t); const v = ((y - yc(x) - 6 * Math.sin(x / 23)) / hw2) ** 2 + (fbm(x / 26, y / 26, 31, 3) - .5) * .9 + (1 - t) * .6; q = Math.min(q, v); } return q; };
  const ridgeH = x => { let m = 0; for (const h of HILLS) m = Math.max(m, ridgeT(h, x)); return m; };

  // ================= [isola] LA FORMA NUOVA =================
  // Le funzioni qui sopra (yc, northY, southY, onLand, inland, monte, zoneO, rawElevO, districtO) restano in COORDINATE VECCHIE.
  // Foresta, Monte Scuro e periferia ovest (vecchie x 146..348) stanno 532 m più a est; centro e oltre (vecchie x ≥ 348) 612 m più a est.
  // In mezzo, 80 m nuovi per il quartiere del governo. A ovest di x 678 tutto è nuovo: la testa di bosco e il collo di foresta.
  // Le y non cambiano: la testa sta più a sud, il collo piega verso sud come una tromba.
  const DXF = 532, DXC = 612, XF = 146 + DXF, XG = 348 + DXF, XC = 348 + DXC, XE = 550 + DXC;
  const xn = a => a < 348 ? a + DXF : a + DXC;                      // vecchia x → nuova
  const xo = x => x < XG ? x - DXF : x < XC ? 348 : x - DXC;         // nuova x → vecchia (nel quartiere del governo vale 348)
  const HEAD = { x: 200, y: 214, r: 166 };
  const nH = (x, sd) => 4.5 * (fbm(x / 26, sd, 9 + sd, 3) - .5) * 2;
  const gapK = x => sstep(XG - 6, XG + 10, x) * (1 - sstep(XC - 10, XC + 6, x));
  const headHalf = x => Math.sqrt(Math.max(0, HEAD.r * HEAD.r - (x - HEAD.x) * (x - HEAD.x)));
  // la testa è un cerchio vero; il collo è una fascia che si allarga verso il Monte Scuro; dove si incontrano, una curva morbida (la vita)
  const smin = (a, b, k) => { const h = clamp(.5 + .5 * (b - a) / k, 0, 1); return b + (a - b) * h - k * h * (1 - h); };
  const neckN = x => { const t = sstep(360, XF, x); return 112 + (northY(146) - 112) * t; };
  const neckS = x => { const t = sstep(360, XF, x); return 288 + (southY(146) - 288) * t; };
  function NorthY(x) {
    if (x >= XF) return northY(xo(x)) + gapK(x) * nH(x, 2.1);
    const c = Math.abs(x - HEAD.x) < HEAD.r ? HEAD.y - headHalf(x) : 1e4;
    return smin(c, x < 250 ? 1e4 : neckN(x), 34) + nH(x, 2.1) * (1 - sstep(XF - 60, XF, x)) + cove(x, 300, 11, 7) + cove(x, 520, 9, 5);
  }
  function SouthY(x) {
    if (x >= XF) return southY(xo(x)) - gapK(x) * nH(x, 5.3);
    const c = Math.abs(x - HEAD.x) < HEAD.r ? HEAD.y + headHalf(x) : -1e4;
    return -smin(-c, x < 250 ? 1e4 : -neckS(x), 46) - nH(x, 5.3) * .45 * (1 - sstep(XF - 60, XF, x));   // la Spiaggia Lunga: riva liscia
  }
  const OnLand = (x, y) => y > NorthY(x) && y < SouthY(x);
  const Yc = x => (NorthY(x) + SouthY(x)) / 2;
  const Inland = (x, y) => Math.min(y - NorthY(x), SouthY(x) - y, x < HEAD.x - 70 ? HEAD.r - Math.hypot(x - HEAD.x, y - HEAD.y) + 2 : 1e9, x > XE + 90 ? 1284 - x : 1e9);
  const DistrictAt = x => x < 380 ? 'prateria' : x < XF ? 'foresta' : x < XG ? districtO(x - DXF) : x < XC ? 'perif_o' : districtO(x - DXC);
  // [costa] che riva c'è, tratto per tratto (non a caso): la punta del faro è di scogli; la costa di tramontana è alta e rocciosa,
  // con due cale dove si tirano su le barche; la riva sud della testa e del collo è la Spiaggia Lunga; sotto il Monte scogli,
  // la caletta della fiumara e la spiaggetta della Pensione Gabbiano; il centro ha il porto vecchio a sud e la scogliera
  // del lungomare a nord; la periferia est ha la spiaggia del Lido; oltre la Base il porto cargo.
  // spiaggia: sabbia larga, fondale che scende piano (si fa il bagno); cala: spiaggetta tra gli scogli; scogli: roccia bassa
  // che si cammina (si pesca), fondale medio; falesia: roccia alta, mare subito fondo; porto: banchine, fondale dragato.
  const COSTA = {
    N: [[0, 'scogli'], [118, 'falesia'], [286, 'cala'], [314, 'falesia'], [404, 'scogli'], [546, 'cala'], [586, 'scogli'], [696, 'falesia'], [726, 'cala'], [752, 'falesia'], [884, 'scogli'], [1204, 'porto']],
    S: [[0, 'scogli'], [84, 'spiaggia'], [642, 'scogli'], [736, 'cala'], [760, 'scogli'], [796, 'spiaggia'], [834, 'scogli'], [950, 'porto'], [1082, 'scogli'], [1094, 'spiaggia'], [1152, 'scogli'], [1204, 'porto']],
  };
  const costaSide = (x, y) => y < Yc(x) ? 'N' : 'S';
  function coastKind(x, y) { const L = COSTA[costaSide(x, y)]; let k = L[0][1]; for (const [a, n] of L) if (x >= a) k = n; return k; }
  // il quartiere del governo: torri degli uffici sopra la baraccopoli (box in metri)
  const GOV = { x0: XG - 18, x1: XC + 4, piazza: [904, 136, 934, 156] };

  // ---------------- [isola] LA TESTA DI BOSCO, IL COLLO DI FORESTA, IL TAVOLATO ----------------
  // Il Tavolato è un tepui: pianoro a 42 m con pareti verticali e il ghiaione sotto, sopra il bosco che sta a ~13 m.
  // Si sale solo a piedi, da due canaloni intagliati nella parete (levante, dove finisce la Via della Memoria; ponente, verso il faro).
  const TAV = { x: 168, y: 190, r: 58, h: 42 };
  const BF = { TOP: 1, WALL: 2, TALUS: 4, CANALE: 8, RADURA: 16, RIVA: 32 };
  const CANALI = [{ id: 'levante', a: .16 }, { id: 'ponente', a: Math.PI + .42 }];
  // [ambienti] gli ambienti del verde (vedi generate)
  const ECO = { NONE: 0, FARO: 1, DUNA: 2, PINETA: 3, SALINA: 4, PASCOLO: 5, GHIAIONE: 6, ABETAIA: 7, FAGGETA: 8, VALLONE: 9, MACCHIA: 10, RUDERALE: 11, RADURA: 12, RIPARIALE: 13, BETULLE: 14, VIGNE: 15, ULIVETO: 16, PINIMONTE: 17 };
  const tavR = a => TAV.r * (.95 + .1 * fbm(Math.cos(a) * 1.05 + 4, Math.sin(a) * 1.05 + 4, 401, 2));   // [isola] pochi lobi larghi: un tavolato, non un bordo frastagliato
  CANALI.forEach(c => { c.R = tavR(c.a); c.u = [Math.cos(c.a), Math.sin(c.a)]; });
  // radure del bosco [x, y, raggio]: stazioni, saline, faro, campo partigiano, borghi dei pescatori
  const RADURE = [[232, 82, 15], [262, 318, 15], [100, 312, 19], [44, 213, 12], [98, 128, 8], [470, 264, 18], [566, 92, 14], [152, 352, 12]];
  // il sottobosco sale verso l'interno della testa e lungo la mezzeria del collo (lì corre la strada centrale); valloni scendono al mare
  function boscoFloor(x, y, inl) {
    const hm = .6 + 12.4 * (1 - sstep(330, XF - 6, x)), prof = sstep(3, 48, inl);
    const und = (fbm(x / 60, y / 60, 411, 2) - .5) * 4 * sstep(.3, 1, prof) * sstep(1.5, 5, hm);   // [isola] il sottobosco ondula largo
    const ph = x / 44 + (fbm(x / 50, y / 30, 412, 2) - .5) * 1.4, vi = Math.floor(ph + .5), rv = Math.abs(ph - vi) * 2;
    const vall = (1 - sstep(0, .35, rv)) * prof * (1 - prof) * 4 * (1.5 + hash2(vi, y > Yc(x) ? 1 : 0, 413) * 3) * sstep(2, 6, hm);
    return .4 + (hm - .4) * prof + und - vall;
  }
  // il fondo di un canalone a distanza `al` dal ciglio (negativo: dentro il pianoro)
  const CAN0 = -14, CAN1 = 30;
  function canFloor(c, al) { if (!c.foot) { const fx = TAV.x + c.u[0] * (c.R + CAN1), fy = TAV.y + c.u[1] * (c.R + CAN1); c.foot = boscoFloor(fx, fy, Inland(fx, fy)) + 1.2; } return TAV.h - 1 + (c.foot - TAV.h + 1) * clamp((al - CAN0) / (CAN1 - CAN0), 0, 1); }
  const canHalf = al => 11 + Math.max(0, al) * .16;
  const BCACHE = new Map();
  function bosco(x, y) {
    const key = Math.round(x * 4) * 100000 + Math.round(y * 4), c0 = BCACHE.get(key); if (c0) return c0;
    const r = bosco0(x, y); if (BCACHE.size < 600000) BCACHE.set(key, r); return r;
  }
  function bosco0(x, y) {
    let f = 0; const inl = Inland(x, y);
    let h = boscoFloor(x, y, inl);
    // la Spiaggia Lunga: la riva sud della testa e del collo è sabbia larga e bassa, poi una duna morbida
    if (y > Yc(x) && x > 70 && x < XF - 40) {
      const bw = 9 + 9 * sstep(90, 210, x) * (1 - sstep(520, XF - 40, x));
      if (inl < bw) { h = .45 + inl * .03; f |= BF.RIVA; } else h = Math.min(h, .45 + bw * .03 + (inl - bw) * .45);
    }
    // il Tavolato
    const dx = x - TAV.x, dy = y - TAV.y, d = Math.hypot(dx, dy);
    if (d < TAV.r * 1.75) {
      const a = Math.atan2(dy, dx), R = tavR(a), e = d - R, foot = h;
      const top = TAV.h + (fbm(x / 26, y / 26, 402, 2) - .5) * 1.6 - sstep(-10, 0, e) * .6;
      const talTop = foot + 11 + (fbm(Math.cos(a) * 1.6, Math.sin(a) * 1.6, 403, 2) - .5) * 3;
      let ht = h;
      // il bordo del terreno scende un po' dentro la parete vera (la grafica la disegna liscia sulla curva tavR e la copre col ciglio)
      if (e < -6) { ht = top; f |= BF.TOP; }
      else if (e < 1) { ht = top + (talTop - top) * sstep(-6, 1, e); f |= e < -1.5 ? BF.TOP : BF.WALL; }
      else if (e < 28) { const t = (e - 1) / 27; ht = foot + (talTop - foot) * Math.pow(1 - t, 1.7) + (fbm(x / 11, y / 11, 404, 2) - .5) * .8 * (1 - t); f |= e < 2.4 ? BF.WALL : BF.TALUS; }
      // i canaloni
      for (const c of CANALI) {
        const al = dx * c.u[0] + dy * c.u[1] - c.R, lat = Math.abs(dx * c.u[1] - dy * c.u[0]);
        if (al < CAN0 - 10 || al > CAN1 + 6) continue;
        const hw2 = canHalf(al); if (lat > hw2 + 12) continue;
        const hc = canFloor(c, al) + (fbm(x / 5, y / 5, 405, 2) - .5) * .5, wall = hc + Math.pow(Math.max(0, lat - hw2 + 6) / 6, 1.6) * 9 + Math.max(0, CAN0 - al) * 2.2;   // fianchi a V larga: niente scalini sulla griglia
        if (wall < ht) { ht = wall; f &= ~(BF.TOP | BF.WALL); if (lat < hw2 - 1 && al >= CAN0) f |= BF.CANALE; }
      }
      h = ht;
    }
    for (const [rx, ry, rr] of RADURE) if (dist(x, y, rx, ry) < rr) f |= BF.RADURA;
    return { h: Math.max(.4, h), f };
  }
  function rawElev(x, y) {
    if (!OnLand(x, y)) return -2;
    if (x < XF) return bosco(x, y).h;
    if (x < XG) return Math.max(.4, monte(x - DXF, y).h, x < XF + 16 ? boscoFloor(x, y, Inland(x, y)) * (1 - sstep(XF, XF + 16, x)) : 0);
    if (x < XC) return Math.max(.4, monte(347.9, y).h);
    return rawElevO(x - DXC, y);
  }
  function zoneAt(x, y) {
    if (!OnLand(x, y)) return Z.MARE;
    if (x < XF) { const f = bosco(x, y).f; return f & BF.TOP ? Z.DESERTO : f & BF.RIVA ? Z.SPIAGGIA : f & BF.RADURA ? Z.CAMPAGNA : Z.MACCHIA; }
    if (x < XG) return zoneO(x - DXF, y);
    if (x < XC) return Z.CITTA;
    return zoneO(x - DXC, y);
  }

  // ---------------- ZONE ----------------
  function zoneO(x, y) {
    if (!onLand(x, y)) return Z.MARE;
    const d = districtO(x);
    if (d === 'prateria') return Z.MACCHIA;   // [isola] la vecchia prateria non c'è più: resta la foresta
    if (d === 'foresta') { const v = VILLAGES.some(([vx, vy, r]) => dist(x, y, vx, vy) < r); return v ? Z.CAMPAGNA : Z.MACCHIA; }
    if (d === 'perif_o' && x < 380 && monte(x, y).h > 2.2) return Z.MONTE;
    if (d === 'perif_e' && hillQ(x, y) < 1) return Z.MONTE;
    return Z.CITTA;
  }
  // radure dei villaggi nella foresta e dei campi in prateria
  const VILLAGES = [[205, 103, 17], [184, 191, 16]];

  // ---------------- QUOTE ----------------
  // pianura a 40 cm, colline dolci fino a 6 m, mare sotto
  // canyon della prateria: altopiani (mesa) tagliati da gole sinuose; piatto attorno a stazioni, accampamento e strada
  const FLAT = [[86, 82, 28], [100, 202, 28], [58, 126, 30], [24, 144, 24], [66, 196, 18], [58, 214, 24], [150, 140, 22]];
  function canyonH(x, y) {
    let m = 1; for (const [fx, fy, fr] of FLAT) m = Math.min(m, sstep(fr * .6, fr, dist(x, y, fx, fy)));
    m = Math.min(m, sstep(7, 17, Math.abs(y - (yc(x) - 3))));
    m *= sstep(10, 28, inland(x, y)) * (1 - sstep(118, 150, x)); if (m <= .01) return null;
    const mesa = sstep(.5, .545, fbm(x / 58, y / 58, 92, 3));
    const w = fbm(x / 70 + fbm(y / 40, x / 40, 94, 2) * .9, y / 70, 93, 3), d = Math.abs(w - .5), cut = 1 - sstep(.016, .07, d);
    return .4 + (4.8 + (fbm(x / 9, y / 9, 95, 2) - .5) * .9 - .4) * mesa * (1 - cut) * m;
  }
  // ---------------- L'ENTROTERRA: IL MONTE SCURO (come la Calabria) ----------------
  // Un massiccio che si gira attorno: altopiano col lago a ovest (la Sila), il Pizzo a 30 m, la sella e il Monte dei Pini a est.
  // Fianchi scavati da valloni, una gola stretta che scende al mare a nord, una fiumara di ghiaia larga a sud,
  // terrazze di ulivi coi muri a secco, borghi arroccati sugli speroni, le Cinque Dita di roccia, i calanchi di argilla.
  // monte(x, y) -> { h: quota, f: segni del terreno }. f: 1 terrazza, 2 calanchi, 4 fondo della gola, 8 letto della fiumara,
  // 16 altopiano, 32 guglia, 64 cima, 128 borgo arroccato.
  const MF = { TERR: 1, CAL: 2, GOLA: 4, FIUM: 8, ALTO: 16, DITA: 32, CIMA: 64, BORGO: 128 };
  // polilinea campionata fitta (Catmull-Rom), con ascissa curvilinea
  function track(pts) {
    const P = (i) => pts[clamp(i, 0, pts.length - 1)], out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2), k = Math.max(2, Math.ceil(dist(p1[0], p1[1], p2[0], p2[1]) / 2));
      for (let j = 0; j < k; j++) { const t = j / k, t2 = t * t, t3 = t2 * t; out.push([.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3), .5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]); }
    }
    out.push(pts[pts.length - 1].slice());
    const cum = [0]; for (let i = 1; i < out.length; i++) cum.push(cum[i - 1] + dist(out[i - 1][0], out[i - 1][1], out[i][0], out[i][1]));
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; out.forEach(([a, b]) => { x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b); });
    return { pts: out, cum, L: cum[cum.length - 1], box: [x0, y0, x1, y1] };
  }
  // distanza da una traccia e posizione lungo (0..1); pad: oltre questa distanza non serve sapere
  function near(tr, x, y, pad) {
    const b = tr.box; if (x < b[0] - pad || x > b[2] + pad || y < b[1] - pad || y > b[3] + pad) return null;
    let bd = 1e9, bs = 0; const p = tr.pts;
    for (let i = 0; i < p.length - 1; i++) {
      const ax = p[i][0], ay = p[i][1], dx = p[i + 1][0] - ax, dy = p[i + 1][1] - ay, L2 = dx * dx + dy * dy || 1, t = clamp(((x - ax) * dx + (y - ay) * dy) / L2, 0, 1);
      const d = Math.hypot(x - ax - dx * t, y - ay - dy * t); if (d < bd) { bd = d; bs = tr.cum[i] + t * Math.sqrt(L2); }
    }
    return bd > pad ? null : { d: bd, s: bs / tr.L };
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  const interp = (tab, x) => { if (x <= tab[0][0]) return tab[0][1]; for (let k = 0; k < tab.length - 1; k++) { const [a, ha] = tab[k], [b, hb] = tab[k + 1]; if (x < b) { const t = (x - a) / (b - a), s2 = t * t * (3 - 2 * t); return ha + (hb - ha) * s2; } } return tab[tab.length - 1][1]; };
  // la cresta: quota e posizione lungo x (da ovest: scarpata della Sila, altopiano, il Pizzo, la sella, il Monte dei Pini, giù verso il centro)
  const CREST = [[146, 0], [172, 4], [202, 12], [230, 19], [250, 23], [272, 19.5], [290, 17], [312, 18], [338, 10], [358, 3], [370, .4]];   // [isola] una cima e una sella larga
  const crestY = x => yc(x) + 5 * Math.sin(x / 41) - 2;
  const ALTO = { x: 190, y: 150, rx: 27, ry: 30 };                     // l'altopiano del lago
  const PIZZO = [248, crestY(248)];
  // la gola: dalla cascata gelata sotto il Pizzo giù fino al mare, a nord
  const GOLA = track([[238, 118], [234, 106], [229, 94], [226, 82], [222, 70], [219, 52], [218, 40]]);
  const gHead = .06;   // fin qui sopra la cascata
  // la fiumara: dalla sorgente sotto il Pizzo, larga di ghiaia, fino alla caletta a sud
  const FIUM = track([[244, 160], [238, 172], [230, 186], [222, 199], [217, 214], [215, 232], [215, 250]]);
  // i borghi arroccati sugli speroni: [x, y, raggio, quota]
  const BORGHI = { sangiacomo: [205, 103, 13, 10], carbonai: [184, 191, 12, 11], vecchio: [298, 173, 9, 11] };
  // le Cinque Dita: guglie di roccia [x, y, raggio, altezza sopra il suolo]
  const DITA = [[282, 188, 2.7, 15], [286.5, 185, 2.5, 20], [291, 187, 2.4, 17], [288.5, 191.5, 2.3, 12], [283, 193, 2.1, 9.5]];
  // terrazze: fianco sud-est del Pizzo (ulivi) e la costa nord sotto San Giacomo (vigne)
  const TERRAZZE = [{ x0: 232, x1: 302, side: 1, h0: 2.5, h1: 21 }, { x0: 196, x1: 222, side: -1, h0: 2, h1: 9.6, y0: 72, y1: 92 }];
  const inAlto = (x, y) => Math.hypot((x - ALTO.x) / ALTO.rx, (y - ALTO.y) / ALTO.ry);
  const MCACHE = new Map();
  function monte(x, y) {
    const key = Math.round(x * 4) * 100000 + Math.round(y * 4); const c0 = MCACHE.get(key); if (c0) return c0;
    const r = monte0(x, y); if (MCACHE.size < 400000) MCACHE.set(key, r); return r;
  }
  function monte0(x, y) {   // [isola] il Monte Scuro è un'unica cresta liscia: fianchi pieni e arrotondati, una cima e una sella, niente gole né guglie
    let f = 0;
    if (x < 140 || x > 380 || !onLand(x, y)) return { h: .4, f };
    const cy = crestY(x), dy = y - cy, side = dy < 0 ? -1 : 1;
    const shore = side < 0 ? northY(x) : southY(x), room = Math.abs(shore - cy) - 9;
    const t = clamp(Math.abs(dy) / Math.max(10, room), 0, 1);
    const Hc = crestH(x), prof = Math.pow(.5 + .5 * Math.cos(Math.PI * t), .8);
    let h = Hc * prof + (fbm(x / 110, y / 110, 301, 2) - .5) * 1.4 * prof;
    const inl = inland(x, y); h = .4 + (h - .4) * sstep(7, 26, inl);
    // i borghi stanno su un ripiano
    for (const id in BORGHI) { const [bx, by, br0, bh] = BORGHI[id], d = dist(x, y, bx, by); if (d < br0 + 6) { const k = 1 - sstep(br0, br0 + 6, d); h = lerp(h, Math.min(bh, h + 1.5), k); if (k > .5) f |= MF.BORGO; } }
    if (Hc * prof > 13) f |= MF.ALTO;
    return { h: Math.max(.4, h), f };
  }
  // la quota del crinale: interpolazione morbida (coseno) dei punti di CREST, poi una media larga: niente spigoli
  function crestH(x) { let s = 0, c = 0; for (let q = -12; q <= 12; q += 3) { const u = x + q; let k = 0; while (k < CREST.length - 2 && u > CREST[k + 1][0]) k++; const [x0, h0] = CREST[k], [x1, h1] = CREST[k + 1], tt = clamp((u - x0) / ((x1 - x0) || 1), 0, 1), e = .5 - .5 * Math.cos(Math.PI * tt); s += h0 + (h1 - h0) * e; c++; } return s / c; }

  function rawElevO(x, y) {
    if (!onLand(x, y)) return -2;
    let h = .4;
    if (x < 152) { const c = canyonH(x, y); if (c !== null) h = c; }
    if (x > 380) { const q = hillQ(x, y); if (q < 1.2) { const crag = (fbm(x / 14, y / 14, 77, 3) - .5) * 3; h = .4 + ridgeH(x) * (9 * sstep(1.2, .05, q) + crag * sstep(1, .3, q)); } }
    if (x > 140 && x < 380) h = Math.max(h, monte(x, y).h);
    return h;
  }

  // ---------------- STRADE ----------------
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
  // curva liscia che passa vicino ai punti: ogni giro taglia gli angoli a un quarto (B-spline quadratica); gli estremi restano fermi. Campionata ogni ~2 m
  function chaikin(pts, it) {
    let P = pts.map(p => [p[0], p[1]]);
    for (let n = 0; n < it; n++) { const Q = [P[0]]; for (let k = 0; k < P.length - 1; k++) { const a = P[k], b = P[k + 1]; Q.push([.75 * a[0] + .25 * b[0], .75 * a[1] + .25 * b[1]], [.25 * a[0] + .75 * b[0], .25 * a[1] + .75 * b[1]]); } Q.push(P[P.length - 1]); P = Q; }
    const out = []; for (let k = 0; k < P.length - 1; k++) { const L = Math.hypot(P[k + 1][0] - P[k][0], P[k + 1][1] - P[k][1]), m = Math.max(1, Math.ceil(L / 2)); for (let j = 0; j < m; j++) out.push([P[k][0] + (P[k + 1][0] - P[k][0]) * j / m, P[k][1] + (P[k + 1][1] - P[k][1]) * j / m]); }
    out.push(P[P.length - 1].slice()); return out;
  }
  // le due strade costiere: seguono le curve della riva. A tratti le case stanno tra la strada e il mare,
  // a tratti la strada corre sul mare e le case stanno dalla parte della collina.
  const onSea = (x, s) => fbm(x / 46, s * 7.3, 41, 2) > .52;
  const coastOff = (x, s) => onSea(x, s) ? 6.5 : 17;
  function coastal(side, x0, x1) {
    const pts = [];
    for (let x = x0; x <= x1; x += 6) { const off = coastOff(x, side); pts.push(side < 0 ? [x, northY(x) + off] : [x, southY(x) - off]); }
    // media mobile: la strada non segue ogni sasso
    return pts.map((p, k) => { let s = 0, c = 0; for (let q = -2; q <= 2; q++) { const o = pts[clamp(k + q, 0, pts.length - 1)]; s += o[1]; c++; } return [p[0], s / c]; });
  }
  const ROADS0 = [
    // id, nome, larghezza (m), tipo, vertici
    // la strada della foresta: dal centro, tra le due periferie a nord della collina ovest, fino alla prateria
    ['deserto', 'Strada della Prateria', 6, 'strada', [[150, 0], [118, -6], [80, -2], [44, 0]]],
    // la strada che attraversa la collina est, nord-sud
    // il crinale: dalla foresta al centro e dal centro al Muro, la via alternativa alle costiere
    ['crinale_e', 'Sentiero di crinale della Collina Nera', 3, 'sterrato', [[460, 6], [478, 2], [498, -3], [518, 3], [538, -2], [550, 1]]],
    // la strada che scavalca la dorsale, nord-sud, una per lato
    ['monte', 'Strada della Collina Nera', 6, 'strada', [[505, -60], [498, -20], [512, 18], [505, 60]]],
    // sentieri che salgono dalle costiere al crinale
    ['sent_o1', 'Sentiero dei Pini', 3, 'sterrato', [[276, -34], [284, -14], [282, -2]]],
    ['sent_o2', 'Sentiero del Monolite', 3, 'sterrato', [[334, 34], [326, 14], [326, -3]]],
    ['sent_e1', 'Sentiero dei Bivacchi', 3, 'sterrato', [[474, -34], [480, -14], [478, 2]]],
    ['sent_e2', 'Sentiero della Cava', 3, 'sterrato', [[532, 34], [532, 14], [538, -2]]],
    // la dorsale si esplora: anelli di sentieri sui due versanti, mulattiere, tracce di carbonai
    ['anello_on', 'Sentiero alto dei Pini', 3, 'sterrato', [[232, -14], [252, -26], [276, -34], [300, -30], [326, -24], [344, -14]]],
    ['anello_os', 'Sentiero dei Carbonai', 3, 'sterrato', [[236, 16], [258, 26], [284, 32], [308, 30], [334, 34], [348, 18]]],
    ['mulattiera_o', 'Mulattiera della Sorgente', 3, 'sterrato', [[262, 4], [270, 18], [258, 26]]],
    ['anello_en', 'Sentiero alto della Collina Nera', 3, 'sterrato', [[466, -16], [486, -30], [512, -32], [534, -26], [548, -12]]],
    ['anello_es', 'Sentiero dei Ruderi', 3, 'sterrato', [[466, 18], [488, 30], [512, 30], [532, 34], [550, 20]]],
    ['mulattiera_e', 'Traccia del Covo', 2, 'sterrato', [[538, -2], [546, -10], [548, -12]]],
    // foresta: i villaggi, il lago, l'ovile, la caletta
    // prateria: le stazioni di estrazione, le saline, la punta
    ['miniera', 'Pista della Stazione Nord', 5, 'sterrato', [[96, -4], [90, -36], [84, -58]]],
    ['stazione2', 'Pista della Stazione Sud', 5, 'sterrato', [[104, -4], [104, 36], [100, 60]]],
    ['saline', 'Pista delle saline', 3, 'sterrato', [[100, 40], [76, 52], [62, 58]]],
    ['faro', 'Pista della Punta', 3, 'sterrato', [[44, 0], [26, 2]]],
    // oltre il Muro: dalla porta alla Base e al porto cargo
    ['porto', 'Viale della Tutela', 10, 'strada', [[548, 0], [600, 0], [652, 0]]],
  ];
  // ---- le strade e i sentieri del Monte Scuro: coordinate assolute, la terza cifra è la quota voluta (tornanti, cenge) ----
  const MONTI = [
    // la Strada del Valico: dalla prateria sale a tornanti sulla scarpata, attraversa l'altopiano e scende a San Giacomo
    ['macchia', 'Strada del Valico', 6, 'strada', [[148, 150, .6], [153, 136, 2.5], [157, 122, 5.5], [163, 126, 8], [164, 146, 11.5], [170, 152, 13.5], [172, 136, 16], [184, 125, 16], [196, 121, 16], [186, 113, 13.5], [198, 107, 11], [205, 104, 10]]],
    ['paese', 'Strada di San Giacomo', 5, 'strada', [[205, 100, 10], [201, 88, 7.5], [210, 75, 3.5], [206, 60, .6]]],
    ['lago', 'Sterrato del lago', 3, 'sterrato', [[184, 125, 16], [182, 137, 16]]],
    ['ovile', 'Sterrato dell\'ovile', 3, 'sterrato', [[172, 132, 16], [176, 122, 15.5]]],
    // il Borgo dei Carbonai: dalla costiera sud e, a tornanti, su all'altopiano
    ['villaggio', 'Strada del Borgo dei Carbonai', 5, 'strada', [[182, 232, .6], [190, 216, 5], [181, 206, 8.5], [184, 196, 11]]],
    ['carbonai_alto', 'Tornanti del Borgo', 3, 'sterrato', [[186, 186, 11], [175, 181, 12.8], [190, 175, 14.6], [187, 166, 16]]],
    ['caletta', 'Sterrato della fiumara', 3, 'sterrato', [[191, 197, 11], [200, 207, 6.5], [208, 216, 2.5], [214, 223, 1.2]]],
    // la Mulattiera dei Tornanti: dalla costiera sud, tra le terrazze degli ulivi, fino al Pizzo
    ['cantina', 'Mulattiera dei Tornanti', 3, 'sterrato', [[257, 210, .6], [273, 201, 6], [253, 193, 10.5], [275, 186, 13.5], [252, 177, 18], [269, 168, 20], [251, 160, 24], [247, 151, 27], [248, 143, 30]]],
    // il crinale: dal Pizzo verso est, la sella del Passo dei Pini, il Monte dei Pini, giù fino al centro
    ['crinale_o', 'Sentiero di crinale', 3, 'sterrato', [[249, 141], [262, 137], [281, 133], [296, 136], [306, 133], [322, 135], [340, 130], [352, 127]]],
    ['collina_o', 'Strada del Passo dei Pini', 5, 'sterrato', [[284, 76, .6], [280, 98], [282, 118], [281, 134], [284, 152], [279, 176], [276, 200, .6]]],
    // la gola: il sentiero sul fondo fino alla cascata, il sentiero sul ciglio, il passaggio al Ponte del Diavolo
    ['gola', 'Sentiero della Gola', 2, 'sterrato', [[219, 50, .6], [220, 64], [223, 76], [227, 88], [231, 100], [235, 112, 10.4]]],
    ['ciglio', 'Sentiero del Ciglio', 2, 'sterrato', [[243, 60, .6], [243, 74], [245, 86], [240, 97], [246, 110], [244, 122], [247, 134], [248, 141, 30]]],
    ['ponte_o', 'Mulattiera del Ponte', 2, 'sterrato', [[214, 99, 10], [221, 97, 13]]],
    // la cengia del Romito: una mensola scavata nella scarpata, dalla prateria all'eremo
    ['cengia', 'Cengia del Romito', 2, 'sterrato', [[150, 178, .6], [155, 171, 3.5], [159, 164, 6.6], [162, 158.5, 8]]],
    // i calanchi
    ['calanchi', 'Traccia dei Calanchi', 2, 'sterrato', [[150, 98, .6], [158, 90], [166, 84], [174, 80]]],
    // le Cinque Dita e il Paese Vecchio
    ['vecchio', 'Mulattiera del Paese Vecchio', 3, 'sterrato', [[279, 176], [290, 174], [298, 174, 11]]],
  ];
  // vertici relativi alla mezzeria (y: scarto da yc(x))
  const rel = pts => pts.map(([x, d]) => [x, yc(x) + d]);

  // ---------------- EDIFICI CON NOME ----------------
  // id, nome, w, h (caselle), piani, stile, punto preferito (metri), extra. Insegne in cirillico e coreano.
  const NAMED = [
    // centro
    ['chiesa', 'Chiesa di San Rocco', 8, 6, 5, 9, [369, 117], { church: true, home: true }],
    ['bar', 'Bar Da Gino', 5, 6, 5, 1, [392, 134], { sign: { t: 'БАР ДЖИНО', c: '#ff4fa3' }, shop: true }],
    ['wu', 'Alimentari Wu', 5, 5, 4, 7, [424, 134], { sign: { t: '吳 식료품', c: '#ff3b3b' }, shop: true, lanterns: true }],
    ['biblioteca', 'Biblioteca civica', 7, 5, 4, 2, [420, 142], {}],
    ['ambulatorio', 'Ambulatorio', 5, 6, 3, 8, [394, 96], { sign: { t: '✚ АМБУЛАТОРИЯ', c: '#4dff9a' } }],
    ['cultura', 'Palazzo della Cultura', 9, 7, 3, 2, [446, 117], { sign: { t: 'ДВОРЕЦ КУЛЬТУРЫ', c: '#ff3b3b' }, landmark: 'cultura' }],
    ['flipper', 'Sala giochi Flipper', 5, 6, 3, 3, [450, 142], { sign: { t: '플리퍼', c: '#35e6ff' } }],
    ['stella', 'Condominio Stella', 6, 7, 7, 2, [364, 144], { home: true }],
    ['aurora', 'Condominio Aurora', 6, 7, 6, 4, [450, 160], { home: true }],
    ['commissariato', 'Caserma della Guardia', 9, 6, 3, 10, [386, 160], { sign: { t: 'ГВАРДИЯ', c: '#5a8aff' } }],
    ['cinema', 'Cinema Astor', 7, 5, 4, 13, [400, 144], { sign: { t: 'КИНО АСТОР', c: '#ffd23b' }, deco: true }],
    ['video', 'Videoteca Stella', 4, 5, 3, 27, [426, 96], { sign: { t: 'ВИДЕО 2000', c: '#ff5a5a' }, deco: true }],
    // il porto vecchio dei pescatori, sulla riva sud del centro
    ['osteria', 'Osteria del Porto', 7, 4, 4, 5, [394, 168], { sign: { t: 'ТРАКТИР', c: '#ffb35c' } }],
    ['miramare', 'Hotel Miramare', 6, 5, 7, 6, [426, 168], { sign: { t: 'МИРАМАРЕ', c: '#ff7ad9' }, deco: true }],
    ['sirena', 'Bar Sirena', 5, 4, 3, 17, [374, 178], { sign: { t: '사이렌 БАР', c: '#35ffc0' }, shop: true, deco: true }],
    ['magazzino', 'Magazzino Neri', 9, 5, 3, 11, [446, 180], { sign: { t: 'СКЛАД НЕРИ', c: '#ff6a3b' }, warehouse: true }],
    ['cantiere', 'Cantiere navale', 8, 4, 3, 11, [356, 184], { warehouse: true, sign: { t: 'ВЕРФЬ', c: '#ff8a3b' } }],
    // periferia ovest
    ['disco', 'Discoteca Luna', 9, 5, 3, 12, [330, 88], { sign: { t: 'ЛУНА 클럽', c: '#c05cff' }, deco: true }],
    ['benzina', 'Distributore', 4, 3, 1, 16, [350, 96], { sign: { t: 'БЕНЗИН', c: '#ffd23b' }, kiosk: true }],
    ['officina', 'Officina di Dorino', 6, 5, 2, 3, [300, 184], { sign: { t: 'МОТО 정비', c: '#ffd23b' } }],
    ['gabbiano', 'Pensione Gabbiano', 6, 6, 4, 15, [278, 188], { sign: { t: 'ПАНСИОН', c: '#35e6ff' } }],
    // periferia est
    ['mare', 'Condominio Mare', 6, 6, 6, 0, [470, 92], { home: true }],
    ['santuario', 'Santuario del Mare', 8, 4, 4, 9, [526, 90], { church: true }],
    ['car_2', 'Trattoria da Nina', 6, 4, 4, 0, [478, 178], { sign: { t: '식당 НИНА', c: '#ffb35c' }, shop: true }],
    ['gelateria', 'Gelateria Polo Nord', 4, 5, 2, 25, [462, 182], { sign: { t: 'МОРОЖЕНОЕ', c: '#8affd0' }, deco: true, shop: true }],
    ['flamingo', 'Hotel Flamingo', 7, 7, 5, 23, [498, 186], { sign: { t: 'ФЛАМИНГО', c: '#ff4fa3' }, deco: true }],
    ['paradiso', 'Hotel Paradiso', 7, 7, 6, 24, [520, 182], { sign: { t: 'ПАРАДИЗО', c: '#35e6ff' }, deco: true }],
    ['oceano', 'Hotel Oceano', 7, 7, 7, 26, [490, 92], { sign: { t: 'ОКЕАН', c: '#b28cff' }, deco: true }],
    ['chiosco', 'Banja del Lido', 4, 2, 1, 28, [540, 192], { sign: { t: 'БАНЯ', c: '#ff9a3c' }, kiosk: true }],
    ['casotto', 'Casotto della cava', 4, 3, 1, 11, [530, 150], { warehouse: true }],
    // [isola] il quartiere del governo: torri di cemento sopra la baraccopoli (coordinate nuove)
    ['pietra', 'La Pietra dell\'Onda', 5, 5, 3, 2, [887, 116], { gov: true, sign: { t: 'ОПЕКА', c: '#b84a3c' }, nuovo: true }],
    ['governo', 'Palazzo del Governo', 9, 5, 3, 10, [921, 115], { gov: true, sign: { t: 'ДОМ ПРАВИТЕЛЬСТВА', c: '#b84a3c' }, landmark: 'governo', nuovo: true }],
    ['ministero', 'Ministero dell\'Ordine', 6, 5, 3, 2, [954, 115], { gov: true, nuovo: true }],
    ['garante', 'Uffici del Garante', 5, 5, 3, 2, [953, 152], { gov: true, sign: { t: 'ГАРАНТ 보호', c: '#b84a3c' }, nuovo: true }],
    ['archivio', 'Archivio di Stato', 8, 6, 5, 10, [887, 155], { gov: true, nuovo: true }],
    // la Base della Tutela, oltre il Muro
    ['rocca', 'Rocca della Tutela', 14, 10, 5, 10, [618, 122], { sign: { t: 'ОПЕКА 보호', c: '#ff3b3b' }, military: true }],
    ['caserma_p', 'Caserma della Tutela', 10, 5, 2, 10, [584, 112], { military: true }],
    ['hangar1', 'Hangar degli elicotteri', 9, 8, 3, 11, [640, 166], { warehouse: true, military: true }],
    ['hangar2', 'Deposito della Base', 8, 6, 2, 11, [652, 124], { warehouse: true, military: true }],
    ['deposito_n', 'Magazzino del porto cargo', 9, 6, 2, 11, [638, 106], { warehouse: true, military: true }],
    ['deposito_s', 'Dogana del porto cargo', 9, 6, 2, 11, [638, 176], { warehouse: true, military: true }],
    // foresta: San Giacomo e il Borgo dei Carbonai
    ['chiesa_sg', 'Chiesa di San Giacomo', 6, 5, 4, 9, [199, 97], { church: true }],
    ['osteria_sg', 'Osteria di San Giacomo', 5, 4, 3, 5, [211, 106], { sign: { t: 'ТРАКТИР', c: '#ffb35c' }, shop: true }],
    ['masseria', 'Masseria Sant\'Elia', 8, 6, 2, 4, [178, 196], {}],
    ['cantina', 'Cantina delle terrazze', 7, 5, 2, 7, [262, 202], {}],
    ['ovile_b', 'Ovile abbandonato', 5, 4, 1, 9, [178, 116], {}],
    // [isola] testa di bosco: le stazioni di estrazione, le saline e la Punta (coordinate nuove)
    ['miniera', 'Stazione di estrazione Nord', 6, 4, 2, 11, [228, 88], { warehouse: true, station: true, nuovo: true }],
    ['stazione2', 'Stazione di estrazione Sud', 6, 4, 2, 11, [270, 314], { warehouse: true, station: true, nuovo: true }],
    ['salinaio', 'Casa del salinaio', 4, 4, 2, 4, [118, 302], { nuovo: true }],
    ['faro', 'Faro di Punta Scogli', 3, 3, 7, 9, [42, 214], { lighthouse: true, nuovo: true }],
  ];

  // ---------------- IL CENTRO ----------------
  // Isolati regolari: quattro vie est-ovest e le traverse nord-sud, il corso che si apre sulla piazza.
  function cityPlan(r) {
    const X0 = 350, X1 = 462;
    const inTown = (x, y) => onLand(x, y) && inland(x, y) > 9 && x > X0 && x < X1;
    const roads = [], T2 = v => Math.round(v / TS);
    const street = (id, name, w, kind, horiz, c, a, b) => {
      const n = w / TS, t0 = Math.round(c / TS - n / 2), ta = T2(Math.min(a, b)), tb = T2(Math.max(a, b)) - 1;
      if (tb - ta < 2) return null;
      const rect = horiz ? [ta, t0, tb, t0 + n - 1] : [t0, ta, t0 + n - 1, tb];
      const cm = (t0 + n / 2) * TS, pts = [];
      const L = (tb + 1 - ta) * TS, k = Math.max(1, Math.round(L / 3));
      for (let q = 0; q <= k; q++) { const u = ta * TS + L * q / k; pts.push(horiz ? [u, cm] : [cm, u]); }
      const rd = { id, name, w, kind, rect, pts, horiz }; roads.push(rd); return rd;
    };
    const H = [[104, 6, 'Via Alta'], [130, 8, 'Via del Porto'], [154, 6, 'Via dei Cordai']];
    const hs = [];
    H.forEach(([y, w, name], j) => { const rd = street('h' + j + '_0', name, w, 'citta', true, y, X0 - 2, X1 + 2); if (rd) hs.push({ rd, y, a: X0, b: X1, j }); });
    const V = [[356, 'Via di Ponente', 6, 1], [382, 'Vicolo dei Lanternini', 4], [408, 'Corso della Vittoria', 8, 1], [434, 'Via dei Caruggi', 6, 1], [458, 'Via del Lido', 6, 1], [369, 'Vicolo dei Chiodi', 4], [446, 'Vicolo delle Lampade', 4]];
    V.forEach(([x, name, w, main], vi) => {
      // dalla costiera nord alla costiera sud: le traverse principali attraversano tutto il centro
      const segs = [[northY(x) + 12, H[0][0]]].concat(H.slice(0, -1).map((h, j) => [h[0], H[j + 1][0]])).concat([[H[H.length - 1][0], southY(x) - 12]]);
      segs.forEach(([y0, y1], j) => {
        if (x === 408 && j === 1) return;                                   // il corso si apre nella piazza
        if (!main && r() < .25) return;
        street('v' + vi + '_' + j, name, w, w <= 4 ? 'vicolo' : 'citta', false, x, y0 + 3, y1 - 3);
      });
    });
    return { roads, piazza: [390, 108, 428, 126] };
  }

  // ---------------- GENERAZIONE ----------------
  function generate() {
    const N = GW * GH;
    const grid = new Uint8Array(N).fill(T.WATER), zone = new Uint8Array(N), elev = new Float32Array(N), bIndex = new Int16Array(N).fill(-1);
    const VW = GW + 1, velev = new Float32Array(VW * (GH + 1));
    const roadW = new Float32Array(N);
    const reserved = new Uint8Array(N);
    const feat = new Uint16Array(N);   // segni del Monte Scuro (MF), + 256 scaletta tra le terrazze, 512 muro a secco
    const r = rng(1986), T2i = v => Math.round(v / TS);
    for (let j = 0; j <= GH; j++) for (let i = 0; i <= GW; i++) velev[j * VW + i] = rawElev(i * TS, j * TS);
    for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) {
      const i = ty * GW + tx, x = tx * TS + 1, y = ty * TS + 1, z = zoneAt(x, y);
      zone[i] = z;
      elev[i] = (velev[ty * VW + tx] + velev[ty * VW + tx + 1] + velev[(ty + 1) * VW + tx] + velev[(ty + 1) * VW + tx + 1]) / 4;
      if (z === Z.MARE) continue;
      const inl = Inland(x, y);
      let v = T.GRASS;
      if (z === Z.DESERTO) v = fbm(x / 30, y / 30, 71, 2) > .62 ? T.SHRUB : fbm(x / 60, y / 60, 72, 2) > .58 ? T.FIELD : T.GRASS;
      else if (z === Z.MONTE) v = fbm(x / 16, y / 16, 52, 2) > .68 ? T.ROCK : fbm(x / 14, y / 14, 51, 2) > .4 ? T.TREE : T.SHRUB;
      else if (z === Z.MACCHIA) v = fbm(x / 14, y / 14, 61, 3) > .36 ? T.TREE : T.SHRUB;
      else if (z === Z.CAMPAGNA) v = fbm(x / 40, y / 40, 71, 2) > .5 ? T.FIELD : T.GRASS;
      else if (z === Z.CITTA) v = T.COB;
      // riva: sabbia o scogli
      // il Monte Scuro: il bosco cambia con la quota (ulivi e lecci in basso, castagni e faggi spogli a mezza costa, pini larici sull'altopiano, roccia in cima)
      const xm = x >= XF && x < XG ? x - DXF : x >= XC && x < XC + 32 ? x - DXC : -1;   // [isola] il Monte Scuro è in coordinate vecchie
      if (xm > 140 && xm < 380 && z !== Z.CITTA) {
        const M = monte(xm, y), f = M.f, e = elev[i], h1 = hash2(tx, ty, 41); feat[i] = f;
        if (f & MF.FIUM) v = T.GRAVEL;
        else if (f & MF.GOLA) v = T.GRAVEL;
        else if (f & (MF.CIMA | MF.DITA)) v = T.ROCK;
        else if (f & MF.CAL) v = fbm(x / 9, y / 9, 62, 2) > .7 ? T.SHRUB : T.DIRT;
        else if (f & MF.BORGO) v = fbm(x / 12, y / 12, 63, 2) > .55 ? T.FIELD : T.GRASS;
        else if (f & MF.TERR) v = h1 < .26 ? T.TREE : h1 < .4 ? T.SHRUB : T.GRASS;
        // [isola] il monte è tutto bosco fitto, come la testa: qualche macchia più rada, le radure le aprono i sentieri
        else if (e > 2) { const gl = fbm(x / 34, y / 34, 64, 2); v = gl < .22 ? (h1 < .4 ? T.SHRUB : T.GRASS) : fbm(x / 13, y / 13, 68, 3) > .3 ? T.TREE : h1 < .6 ? T.SHRUB : T.GRASS; }
      }
      // [isola] la testa di bosco e il collo di foresta: bosco fitto, radure, la Spiaggia Lunga, il Tavolato (pareti, ghiaione, canaloni, pianoro)
      if (x < XF && z !== Z.MARE) {
        const Bq = bosco(x, y), f = Bq.f, h1 = hash2(tx, ty, 47);
        if (f & BF.WALL) { v = T.CLIFF; feat[i] |= 4096; }
        else if (f & BF.CANALE) { v = h1 < .72 ? T.GRAVEL : T.ROCK; feat[i] |= 8192; }
        else if (f & BF.TALUS) { const dd = dist(x, y, TAV.x, TAV.y) - tavR(Math.atan2(y - TAV.y, x - TAV.x)), t = clamp((dd - 2.4) / 25.6, 0, 1);
          v = t < .38 + (fbm(x / 14, y / 14, 406, 2) - .5) * .3 ? (fbm(x / 6, y / 6, 407, 2) > .42 ? T.GRAVEL : T.ROCK) : fbm(x / 10, y / 10, 48, 2) > .45 - t * .25 ? T.TREE : T.SHRUB; feat[i] |= 8192; }   // [isola] il ghiaione a fascia continua, poi il bosco che ci risale
        else if (f & BF.TOP) { v = fbm(x / 11, y / 11, 49, 2) > .72 ? T.ROCK : fbm(x / 15, y / 15, 50, 2) > .52 ? T.SHRUB : h1 < .025 ? T.TREE : T.GRASS; feat[i] |= 2048; }
        else if (f & BF.RIVA) v = T.SAND;
        else if (f & BF.RADURA) v = h1 < .05 ? T.TREE : fbm(x / 12, y / 12, 51, 2) > .55 ? T.SHRUB : T.GRASS;
        else { const gl = fbm(x / 34, y / 34, 52, 2); v = gl < .24 ? (h1 < .3 ? T.SHRUB : T.GRASS) : fbm(x / 13, y / 13, 53, 3) > .33 ? T.TREE : h1 < .6 ? T.SHRUB : T.GRASS; }
      }
      // ogni albero è una casella d'albero (si può abbattere): qualche albero isolato nei campi e in prateria
      if ((z === Z.CAMPAGNA && v === T.GRASS && hash2(tx, ty, 43) < .03) || (z === Z.DESERTO && v === T.GRASS && hash2(tx, ty, 44) < .012)) v = T.TREE;
      // [costa] la riva secondo il suo tipo (vedi COSTA): una fascia di sabbia o di roccia larga quanto serve, coi bordi mossi appena
      if (!(x < XF && z === Z.SPIAGGIA)) {
        const ck = coastKind(x, y), wob = (fbm(x / 9, y / 9, 81, 2) - .5) * 2.4;
        const band = ck === 'spiaggia' ? 9 + wob : ck === 'cala' ? 6 + wob : ck === 'falesia' ? 7 + wob : ck === 'scogli' ? 4.2 + wob : 6;
        if (inl < band) {
          const sandy = ck === 'spiaggia' || ck === 'cala' || (ck === 'scogli' && fbm(x / 16, y / 16, 82, 2) > .7);   // fra gli scogli, ogni tanto una tasca di sabbia
          v = sandy ? T.SAND : T.ROCK; if (sandy && z !== Z.CITTA) zone[i] = Z.SPIAGGIA;
        }
      }
      grid[i] = v;
    }
    // ---------------- [ambienti] IL VERDE PENSATO ZONA PER ZONA ----------------
    // Ogni casella naturale appartiene a un ambiente (eco) con un senso nel paesaggio: la punta ventosa del faro, la duna e la pineta
    // dietro la Spiaggia Lunga, la macchia bassa sulla costa di tramontana, le saline, l'abetaia vecchia attorno al Tavolato e sui
    // versanti al nord, la faggeta sui versanti al sole, i valloni umidi che scendono al mare, il pascolo dei beduini sul pianoro,
    // il ghiaione, le radure delle stazioni e dei borghi; sul Monte il lago coi giunchi, la valle delle betulle, le pinete
    // dell'altopiano e della Collina dei Pini, gli uliveti delle terrazze, le vigne e gli orti di San Giacomo.
    // La forma (dove stanno gli alberi) la decide l'ambiente: fitta nell'abetaia, alberi a distanza nella pineta, chiome larghe e
    // sottobosco aperto nella faggeta, alberi soli nei pascoli. Niente più rumore uguale dappertutto.
    const E = ECO;
    const eco = new Uint8Array(N);
    // la Forra: un torrente umido che scende dal canalone di levante del Tavolato fino al mare, al Borgo dei pescatori
    const FORRA = [[262, 214], [292, 228], [326, 236], [362, 244], [398, 252], [432, 258], [466, 266]];
    const segD = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy))); return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t); };
    const valloneK = (x, y, inl) => { const prof = sstep(3, 48, inl), ph = x / 44 + (fbm(x / 50, y / 30, 412, 2) - .5) * 1.4, vi = Math.floor(ph + .5), rv = Math.abs(ph - vi) * 2; return (1 - sstep(0, .5, rv)) * prof * (1 - prof) * 4; };
    // un albero per cella di lato C, in un punto a caso della cella: alberi a distanza, come piantati o cresciuti da soli
    const cellTree = (tx, ty, C, p, s) => { const x0 = tx * TS, y0 = ty * TS, ci = Math.floor((x0 + 1) / C), cj = Math.floor((y0 + 1) / C), px = (ci + .15 + .7 * hash2(ci, cj, 151 + s)) * C, py = (cj + .15 + .7 * hash2(ci, cj, 152 + s)) * C; return px >= x0 && px < x0 + TS && py >= y0 && py < y0 + TS && hash2(ci, cj, 153 + s) < p; };
    const ecoAt = (x, y, i) => {
      const z = zone[i]; if (z === Z.MARE || z === Z.CITTA || x >= XG) return E.NONE;
      const inl = Inland(x, y), wob = (fbm(x / 40, y / 40, 160, 2) - .5) * 16;
      if (x < XF) {
        const f = bosco(x, y).f;
        if (f & BF.TOP) return E.PASCOLO;
        if (f & (BF.TALUS | BF.CANALE | BF.WALL)) return E.GHIAIONE;
        if (dist(x, y, 100, 314) < 28) return E.SALINA;
        if (f & BF.RIVA) return E.DUNA;
        if (dist(x, y, 41, 212) < 62 && inl < 34 + wob) return E.FARO;
        const south = y > Yc(x);
        if (south && inl < 44 + wob) return x < 75 ? E.FARO : E.PINETA;
        if (!south && inl < 26 + wob) return E.MACCHIA;
        for (const [rx, ry, rr] of RADURE) if (dist(x, y, rx, ry) < rr * 1.5 + wob * .3) return [232, 262].includes(rx) ? E.RUDERALE : E.RADURA;
        if (valloneK(x, y, inl) > .12) return E.VALLONE;
        if (FORRA.some((q, k) => k && segD(x, y, FORRA[k - 1], q) < 19 + wob * .8)) return E.VALLONE;   // la Forra: dal canalone di levante al Borgo dei pescatori
        const dT = dist(x, y, TAV.x, TAV.y) - tavR(Math.atan2(y - TAV.y, x - TAV.x));
        if (dT < 80 + wob * 2) return E.ABETAIA;   // l'abetaia vecchia attorno al tepui (il Bosco Antico)
        return y < Yc(x) - 6 + wob ? E.ABETAIA : E.FAGGETA;   // al nord gli abeti, al sole i faggi e le querce
      }
      // il Monte Scuro
      const xm = x - DXF, mf = monte(xm, y).f, e = elev[i], lx = xn(186), ly = 150;
      if (Math.hypot((x - lx) / 13, (y - ly) / 9) < 2.3) return E.RIPARIALE;
      if (mf & MF.TERR) return E.ULIVETO;
      if (mf & MF.BORGO || z === Z.CAMPAGNA || dist(x, y, 739, 83) < 30) return E.VIGNE;
      if (dist(x, y, 725, 179) < 32 + wob) return E.BETULLE;
      if (mf & MF.ALTO || dist(x, y, 733, 139) < 30 || dist(x, y, 837, 141) < 42 + wob || dist(x, y, 857, 159) < 30) return E.PINIMONTE;
      return e > 14 ? E.ABETAIA : E.FAGGETA;
    };
    for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) {
      const i = ty * GW + tx, x = tx * TS + 1, y = ty * TS + 1; eco[i] = ecoAt(x, y, i);
    }
    // gli ambienti si fondono: la forma di ogni casella la decide l'ambiente di un punto spostato di qualche metro (rumore largo
    // più un po' di grana), così ai confini le due trame si compenetrano a lingue e a isole, senza linea
    for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) {
      const i = ty * GW + tx, x = tx * TS + 1, y = ty * TS + 1; if (!eco[i]) continue;
      const v = grid[i]; if (v !== T.TREE && v !== T.SHRUB && v !== T.GRASS) continue;
      const wx = x + (fbm(x / 30, y / 30, 171, 2) - .5) * 26 + (hash2(tx, ty, 172) - .5) * 9, wy = y + (fbm(x / 30 + 9, y / 30 + 4, 173, 2) - .5) * 26 + (hash2(tx, ty, 174) - .5) * 9;
      const wi = Math.max(0, Math.min(GH - 1, Math.floor(wy / TS))) * GW + Math.max(0, Math.min(GW - 1, Math.floor(wx / TS))), e0 = eco[wi] || eco[i];
      const h1 = hash2(tx, ty, 141), n1 = fbm(x / 9, y / 9, 142, 2), gap = fbm(x / 40, y / 40, 144, 2);
      const under = th => n1 > th ? T.SHRUB : T.GRASS;
      let nv = v;
      switch (e0) {
        case E.ABETAIA: nv = gap < .3 ? (h1 < .12 ? T.SHRUB : T.GRASS) : h1 < .66 ? T.TREE : T.SHRUB; break;                       // fitta, con qualche radura di luce
        case E.FAGGETA: nv = cellTree(tx, ty, 4.6, .9, 0) || cellTree(tx, ty, 7, .5, 3) ? T.TREE : under(.56); break;           // chiome larghe, sotto aperto
        case E.VALLONE: nv = cellTree(tx, ty, 5.5, .8, 6) ? T.TREE : under(.36); break;                                              // umido, pieno di sottobosco
        case E.PINETA: nv = cellTree(tx, ty, 7.5, .8, 9) ? T.TREE : under(.64); break;                                               // pini a distanza, suolo d'aghi
        case E.MACCHIA: nv = cellTree(tx, ty, 11, .45, 12) ? T.TREE : under(.33); break;                                             // cespugli fitti, pochi alberi storti
        case E.FARO: nv = cellTree(tx, ty, 17, .4, 15) ? T.TREE : under(.6); break;                                                  // la punta ventosa: erba, cuscini, pochi pini piegati
        case E.PASCOLO: { const dT = dist(x, y, TAV.x, TAV.y) - tavR(Math.atan2(y - TAV.y, x - TAV.x)); nv = dT > -20 && cellTree(tx, ty, 24, .45, 18) ? T.TREE : v === T.SHRUB && n1 > .6 ? T.SHRUB : T.GRASS; break; }   // alberi soli sul ciglio
        case E.SALINA: case E.RUDERALE: nv = under(.64); break;
        case E.RADURA: nv = cellTree(tx, ty, 14, .35, 21) ? T.TREE : under(.62); break;                                             // radura: qualche albero grande da solo
        case E.RIPARIALE: { const q = Math.hypot((x - xn(186)) / 13, (y - 150) / 9); nv = q > 1.1 && cellTree(tx, ty, 6, .55, 24) ? T.TREE : under(.45); break; }
        case E.BETULLE: nv = cellTree(tx, ty, 4.2, .75, 27) ? T.TREE : under(.7); break;                                             // bosco chiaro di betulle e erba
        case E.PINIMONTE: nv = cellTree(tx, ty, 4.4, .85, 30) ? T.TREE : under(.55); break;
        default: break;   // uliveti, vigne, ghiaione, duna: restano come li fa il monte o il Tavolato
      }
      grid[i] = nv;
    }
    // le pareti dei canyon sono roccia
    for (let ty = 1; ty < GH - 1; ty++) for (let tx = 1; tx < 1; tx++) { const i = ty * GW + tx; if (zone[i] !== Z.DESERTO || grid[i] === T.WATER) continue;
      let sl = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) sl = Math.max(sl, Math.abs(elev[i] - elev[(ty + dy) * GW + tx + dx])); if (sl > 1.1) grid[i] = T.ROCK; }
    // saline e lago
    const blob = (cx, cy, rx, ry, f) => { for (let ty = Math.floor((cy - ry) / TS); ty <= Math.ceil((cy + ry) / TS); ty++) for (let tx = Math.floor((cx - rx) / TS); tx <= Math.ceil((cx + rx) / TS); tx++) { if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) continue; const x = tx * TS + 1, y = ty * TS + 1, q = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + (fbm(x / 9, y / 9, 91, 2) - .5) * .6; if (q < 1) f(ty * GW + tx, q); } };
    blob(100, 314, 15, 9, i => { if (grid[i] !== T.WATER) grid[i] = T.SALT; });   // [isola] le saline, dietro la Spiaggia Lunga
    const LAKE = { x: xn(186), y: 150, rx: 13, ry: 9, h: Math.max(2, rawElev(xn(186), 150)) + .4 };   // [isola] il lago sta alla quota del monte nuovo    // il lago gelato dell'altopiano
    blob(LAKE.x, LAKE.y, LAKE.rx, LAKE.ry, (i, q) => { grid[i] = q < .8 ? T.WATER : T.GRASS; elev[i] = q < .8 ? LAKE.h - 1.4 : Math.max(elev[i], LAKE.h + .2); });
    // strade
    const roads = [], TUNNELS = []; let CARR = null;   // CARR: vertici delle carreggiate già spianate
    const CITY = { roads: [], piazza: [390 + DXC, 108, 428 + DXC, 126] };   // [isola] la pianta organica si disegna più sotto, dopo le costiere
    // [isola] la costiera fa il giro intero: dal Muro lungo la riva nord, attorno alla testa di bosco, e indietro lungo la riva sud.
    // Una sola linea liscia, divisa in due nomi sulla punta ovest (lì le due metà si toccano con la stessa tangente e la stessa quota).
    const RING = (() => {
      const pts = [];
      const offN = x => x >= XF ? coastOff(xo(x), -1) : 12 + 5 * sstep(420, XF, x);
      const offS = x => x >= XF ? coastOff(xo(x), 1) : 24 - 7 * sstep(560, XF, x);
      for (let x = XE; x > HEAD.x; x -= 6) pts.push([x, NorthY(x) + offN(x)]);
      for (let a = -Math.PI / 2; a > -1.5 * Math.PI; a -= .034) {
        const ux = Math.cos(a), uy = Math.sin(a); let rc = HEAD.r * .55; while (rc < HEAD.r + 40 && OnLand(HEAD.x + ux * rc, HEAD.y + uy * rc)) rc += .5;
        const off = uy < 0 ? 12 + 10 * sstep(.6, .98, -ux) : 22 + 2 * uy;
        pts.push([HEAD.x + ux * (rc - off), HEAD.y + uy * (rc - off)]);
      }
      for (let x = HEAD.x; x <= XE; x += 6) pts.push([x, SouthY(x) - offS(x)]);
      let P0 = pts; for (let it = 0; it < 3; it++) P0 = P0.map((q, k) => { if (k < 2 || k > P0.length - 3) return q; let sx = 0, sy = 0; for (let o = -2; o <= 2; o++) { sx += P0[k + o][0]; sy += P0[k + o][1]; } return [sx / 5, sy / 5]; });
      return P0;
    })();
    const iW = RING.reduce((b, q, k) => q[0] < RING[b][0] ? k : b, 0);
    const ringNear = (x, y) => { let b = RING[0], bd = 1e9; RING.forEach(q => { const d = dist(q[0], q[1], x, y); if (d < bd) { bd = d; b = q; } }); return b.slice(); };
    roads.push({ id: 'nord', name: 'Costiera Nord', w: 8, kind: 'litoranea', pts: rounded(RING.slice(0, iW + 1), 14, false) });
    roads.push({ id: 'litoranea', name: 'Costiera Sud', w: 8, kind: 'litoranea', pts: rounded(RING.slice(iW), 14, false) });
    roads.push({ id: 'raccordo_o', name: 'Raccordo del Valico', w: 7, kind: 'strada', pts: rounded([ringNear(684, 50), [682, 110], [680, 150], [682, 190], ringNear(684, 250)], 10, false) });
    roads.push({ id: 'raccordo_e', name: 'Raccordo del Muro', w: 8, kind: 'strada', pts: rounded([RING[0], [xn(550), yc(550)], RING[RING.length - 1]], 10, false) });
    // [isola] LA CITTÀ ORGANICA: poche strade larghe e una rete di vicoli stretti e storti, con piazzette e vicoli ciechi da esplorare.
    // Niente isolati a griglia: i nodi stanno su un reticolo sghembo di ~13 m, i lati sono vicoli di 2-3 m che serpeggiano, qualcuno manca.
    {
      // gli edifici con nome della città hanno il loro posto: i vicoli ci girano attorno
      const HOLD = NAMED.filter(q => !q[7].kiosk && !q[7].lighthouse && (q[7].nuovo ? q[6][0] : xn(q[6][0])) >= XG - 64).map(q => { const x = q[7].nuovo ? q[6][0] : xn(q[6][0]); return [x, q[6][1], Math.max(q[2], q[3]) * TS / 2 + 3]; });
      const cityOK0 = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) return false; return zone[ty * GW + tx] === Z.CITTA && Inland(x, y) > 8; };
      const cityOK = (x, y) => cityOK0(x, y) && !HOLD.some(([hx, hy, hr]) => dist(x, y, hx, hy) < hr);
      const X0c = XG - 64, X1c = xn(552) - 8;
      [['corso', 'Corso della Vittoria', 8, [ringNear(XG - 40, SouthY(XG - 40)), [XG - 14, 150], [XG + 20, 132], [XC + 24, 131], [xn(392), 128], [xn(430), 130], [xn(470), 137], [xn(512), 131], [xn(548), yc(548)]]],
       ['via_porto', 'Via del Porto', 7, [[xn(404), 129], [xn(399), 152], [xn(406), 180]]],
       ['via_alta', 'Via Alta', 7, [[xn(440), 130], [xn(435), 108], [xn(441), 88], ringNear(xn(440), northY(440))]],
       ['via_governo', 'Via del Governo', 7, [ringNear(XG + 20, NorthY(XG + 20)), [XG + 22, 104], [XG + 18, 131], [XG + 26, 160], ringNear(XG + 28, SouthY(XG + 28))]]]
        .forEach(([id, name, w, cp]) => CITY.roads.push({ id, name, w, kind: 'citta', pts: chaikin(cp, 3), main: true }));
      const VIC = ['Vicolo dei Lanternini', 'Vicolo dei Chiodi', 'Vicolo delle Lampade', 'Caruggio dei Pescatori', 'Vicolo Storto', 'Vico dei Cordai', 'Salita dei Gatti', 'Vico Lungo', 'Vico del Pozzo', 'Vicolo delle Reti', 'Vico della Fame', 'Vicolo del Fango', 'Vico delle Lamiere', 'Vicolo Cieco'];
      const SP = 13, nodes = [], NM = new Map(), key = (a, b) => a * 1000 + b;
      for (let j = 0, y = 56; y < 250; y += SP, j++) for (let i = 0, x = X0c; x < X1c; x += SP, i++) {
        const jx = x + (hash2(i, j, 801) - .5) * SP * .75, jy = y + (hash2(i, j, 802) - .5) * SP * .75;
        if (!cityOK(jx, jy) || dist(jx, jy, xn(409), 117) < 16) continue; const n = { x: jx, y: jy, i, j, deg: 0 }; nodes.push(n); NM.set(key(i, j), n);
      }
      // [isola] la rete dei vicoli: prima i lati candidati, poi gli attacchi alle strade larghe; si tengono solo i pezzi
      // che portano da qualche parte (collegati a una strada) e si potano i monconi ciechi che non sbucano da nessuna parte
      const E = [];
      nodes.forEach(n => [[1, 0], [0, 1], [1, 1], [1, -1]].forEach(([di, dj], q) => {
        const m = NM.get(key(n.i + di, n.j + dj)); if (!m) return; const h = hash2(n.i * 7 + di * 3, n.j * 13 + dj * 5, 803 + q);
        if (q >= 2 ? h > .14 : h > .76) return;   // un lato su quattro manca, poche diagonali
        const mx = (n.x + m.x) / 2 + (hash2(n.i, n.j, 804 + q) - .5) * 6, my = (n.y + m.y) / 2 + (hash2(n.j, n.i, 805 + q) - .5) * 6;
        if (!cityOK(mx, my)) return;
        E.push({ a: n, b: m, mx, my, w: hash2(n.i, n.j, 806 + q) < .22 ? 3 : 2 });
      }));
      const MAINP = []; CITY.roads.forEach(rd => rd.pts.forEach(q => MAINP.push([q[0], q[1], rd.w]))); RING.forEach(q => MAINP.push([q[0], q[1], 9]));
      nodes.forEach(n => { let b = null, bd = 1e9; MAINP.forEach(q => { const d = dist(q[0], q[1], n.x, n.y) - q[2] / 2; if (d < bd) { bd = d; b = q; } });
        if (b && bd < SP * .8) { const ux = (n.x - b[0]) / (dist(n.x, n.y, b[0], b[1]) || 1), uy = (n.y - b[1]) / (dist(n.x, n.y, b[0], b[1]) || 1); n.att = [b[0] + ux * (b[2] / 2 - .5), b[1] + uy * (b[2] / 2 - .5)]; if (!cityOK0((n.x + n.att[0]) / 2, (n.y + n.att[1]) / 2)) n.att = null; } });
      const deg = n => E.filter(e => !e.cut && (e.a === n || e.b === n)).length;
      for (let it = 0; it < 6; it++) E.forEach(e => { if (e.cut) return; if ((deg(e.a) === 1 && !e.a.att) || (deg(e.b) === 1 && !e.b.att)) e.cut = true; });   // i monconi
      const comp = new Map(), find = n => { while (comp.get(n) !== n) n = comp.get(n); return n; };
      nodes.forEach(n => comp.set(n, n)); E.forEach(e => { if (!e.cut) comp.set(find(e.a), find(e.b)); });
      const live = new Set(); nodes.forEach(n => { if (n.att && deg(n) > 0) live.add(find(n)); });
      let na = 0;
      const vic = (pts, w, seed) => { CITY.roads.push({ id: 'vic_' + na, name: VIC[na % VIC.length], w, kind: 'vicolo', pts }); na++; };
      E.forEach(e => { if (e.cut || !live.has(find(e.a))) return; e.a.deg++; e.b.deg++; vic(chaikin([[e.a.x, e.a.y], [e.mx, e.my], [e.b.x, e.b.y]], 2), e.w); });
      // dove un vicolo arriva vicino a una strada larga, ci sbuca
      nodes.forEach(n => { if (!n.att || !n.deg || hash2(n.i, n.j, 809) > .8) return; const mx = (n.x + n.att[0]) / 2 + (hash2(n.i, n.j, 810) - .5) * 2, my = (n.y + n.att[1]) / 2 + (hash2(n.j, n.i, 811) - .5) * 2; n.deg++; vic(chaikin([[n.x, n.y], [mx, my], n.att], 2), 2 + (hash2(n.i, n.j, 812) < .3 ? 1 : 0)); });
      // le piazzette: dove si incrociano tre o più vicoli, una su quattro
      CITY.piazzette = nodes.filter(n => n.deg >= 3 && hash2(n.i, n.j, 807) < .22).map(n => [n.x, n.y, 4 + hash2(n.i, n.j, 808) * 3]);
    }
    CITY.roads.forEach(rd => roads.push(rd));
    ROADS0.filter(q => !['deserto', 'miniera', 'stazione2', 'saline', 'faro', 'crinale_e', 'sent_o1', 'sent_o2', 'sent_e1', 'sent_e2', 'anello_on', 'anello_os', 'mulattiera_o', 'anello_en', 'anello_es', 'mulattiera_e'].includes(q[0])).forEach(([id, name, w, kind, cp]) => roads.push({ id, name, w, kind, pts: rounded(rel(cp).map(q => [xn(q[0]), q[1]]), w > 5 ? 16 : 8, false) }));
    // [isola] le strade della testa di bosco e del collo, in coordinate nuove. La strada centrale sale col terreno e diventa mulattiera.
    const canTrail = c => { const N = 7, v = [-c.u[1], c.u[0]], out = []; for (let k = 0; k <= N; k++) { const al = CAN1 + 1 - (CAN1 + 1 - (CAN0 + 3)) * k / N, lat = k === 0 || k === N ? 0 : (k % 2 ? 1 : -1) * (canHalf(al) - 3.6); out.push([TAV.x + c.u[0] * (c.R + al) + v[0] * lat, TAV.y + c.u[1] * (c.R + al) + v[1] * lat, canFloor(c, al)]); } return out; };
    const CE = canTrail(CANALI[0]), CO = canTrail(CANALI[1]), footE = CE[0], footO = CO[0];
    const aroundTav = []; for (let a = .02; a > -2.62; a -= .1) { const R = tavR(a) + 34 + 4 * Math.sin(a * 3); aroundTav.push([TAV.x + Math.cos(a) * R, TAV.y + Math.sin(a) * R]); }
    const NEWR = [
      ['deserto', 'Strada del Bosco', 6, 'strada', [[680, 150], [646, 151], [612, 154], [578, 160], [548, 166], [522, 172]]],
      ['memoria', 'Via della Memoria', 3, 'sterrato', [[522, 172], [492, 178], [460, 186], [428, 192], [396, 198], [364, 203], [332, 205], [304, 203], [282, 200], [footE[0] + 6, footE[1] + 1], footE.slice(0, 2)]],
      ['canale_e', 'Sentiero del Canalone di levante', 2, 'sterrato', CE, true],
      ['canale_o', 'Sentiero del Canalone di ponente', 2, 'sterrato', CO, true],
      ['tav_top', 'Traccia del Tavolato', 2, 'sterrato', [CE[CE.length - 1].slice(0, 2), [196, 188], [176, 184], [156, 178], CO[CO.length - 1].slice(0, 2)]],
      ['bosco_antico', 'Sentiero del Bosco Antico', 2, 'sterrato', [footE.slice(0, 2)].concat(aroundTav, [footO.slice(0, 2)])],
      ['sent_faro', 'Sentiero del faro', 2, 'sterrato', [footO.slice(0, 2), [70, 168], [56, 190], [48, 206]]],
      ['miniera', 'Pista della Stazione Nord', 5, 'sterrato', [ringNear(252, 52), [244, 66], [234, 80]]],
      ['stazione2', 'Pista della Stazione Sud', 5, 'sterrato', [ringNear(270, 360), [266, 340], [262, 322]]],
      ['saline', 'Pista delle saline', 3, 'sterrato', [ringNear(112, 340), [104, 324], [100, 314]]],
      ['faro', 'Pista della Punta', 3, 'sterrato', [ringNear(62, 214), [50, 213]]],
      ['campo_p', 'Traccia del campo', 2, 'sterrato', [ringNear(92, 72), [96, 100], [98, 126]]],
    ];
    NEWR.forEach(([id, name, w, kind, cp, hq]) => {
      const pts = hq ? chaikin(cp.map(q => [q[0], q[1]]), 2) : chaikin(cp, 3), rd = { id, name, w, kind, pts, monte: true };
      if (hq) { const cum = [0]; for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + dist(pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1])); const at = cp.map(q => { let bk = 0, bd = 1e9; pts.forEach((u, k) => { const d = dist(u[0], u[1], q[0], q[1]); if (d < bd) { bd = d; bk = k; } }); return cum[bk]; });
        rd.prof = cum.map(c => { let k = 0; while (k < at.length - 2 && c > at[k + 1]) k++; const t = clamp((c - at[k]) / ((at[k + 1] - at[k]) || 1), 0, 1); return cp[k][2] + (cp[k + 1][2] - cp[k][2]) * t; }); rd.trail = true; }
      roads.push(rd);
    });
    // strade di montagna: le quote disegnate (quando ci sono) si interpolano lungo il percorso
    MONTI.filter(q => !['cantina', 'crinale_o', 'ciglio', 'gola', 'ponte_o', 'cengia', 'calanchi', 'caletta', 'vecchio', 'collina_o'].includes(q[0])).forEach(([id, name, w, kind, cp0]) => {
      const cp = cp0.map(q => [xn(q[0]), q[1]]);   // [isola] in coordinate nuove; le quote vengono dal terreno nuovo
      const pts = chaikin(cp.map(p => [p[0], p[1]]), 3), rd = { id, name, w, kind, pts, monte: true };
      if (cp.some(p => p.length > 2)) {
        const near0 = ([x, y]) => { let bk = 0, bd = 1e9; cp.forEach((p, k) => { const d = dist(x, y, p[0], p[1]); if (d < bd) { bd = d; bk = k; } }); return bk; };
        // quota dei vertici: quelli dati, gli altri dal terreno
        const H = cp.map(p => p.length > 2 ? p[2] : null); H.forEach((h, k) => { if (h === null) H[k] = rawElev(cp[k][0], cp[k][1]); });
        const cum = [0]; for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + dist(pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1]));
        const at = cp.map(p => { let bk = 0, bd = 1e9; pts.forEach((q, k) => { const d = dist(q[0], q[1], p[0], p[1]); if (d < bd) { bd = d; bk = k; } }); return cum[bk]; });
        rd.prof = cum.map(c => { let k = 0; while (k < at.length - 2 && c > at[k + 1]) k++; const t = clamp((c - at[k]) / ((at[k + 1] - at[k]) || 1), 0, 1); return H[k] + (H[k + 1] - H[k]) * t; });
      }
      roads.push(rd);
    });
    // [isola] i sentieri della montagna si tracciano sul terreno: dalla meta (una cima, un passo, una sorgente, un rudere) fino alla
    // strada più comoda, col costo che cresce con la pendenza (segue le curve di livello, sale a tornanti solo dove è ripido),
    // evita acqua e pareti e preferisce i sentieri già fatti (si uniscono invece di correre paralleli). Poi si arrotonda.
    {
      const CS = TS, cellOf = (x, y) => [Math.floor(x / CS), Math.floor(y / CS)], ck = (i, j) => i * 4096 + j;
      const RN = new Set(), mark = rd => rd.pts.forEach(([x, y]) => { const [i, j] = cellOf(x, y); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) RN.add(ck(i + a, j + b)); });
      roads.forEach(rd => { if (rd.kind !== 'vicolo') mark(rd); });
      const hC = new Map(), hAt = (i, j) => { const k = ck(i, j); let h = hC.get(k); if (h === undefined) { h = OnLand(i * CS + 1, j * CS + 1) ? rawElev(i * CS + 1, j * CS + 1) : -99; hC.set(k, h); } return h; };
      const blocked = (i, j) => { if (i < 1 || j < 1 || i >= GW - 1 || j >= GH - 1) return true; const v = grid[j * GW + i]; return v === T.WATER || v === T.CLIFF || hAt(i, j) < .2; };
      const trace = (from, to, R) => {   // to: [x, y] oppure null = la strada più vicina
        const [si, sj] = cellOf(from[0], from[1]), goal = to ? cellOf(to[0], to[1]) : null, D = new Map(), PR = new Map(), Q = [[0, si, sj]];
        D.set(ck(si, sj), 0); let end = null;
        while (Q.length) {
          let bi = 0; for (let q = 1; q < Q.length; q++) if (Q[q][0] < Q[bi][0]) bi = q; const [d, i, j] = Q[bi]; Q[bi] = Q[Q.length - 1]; Q.pop();
          if (d > D.get(ck(i, j))) continue;
          if (goal ? (Math.abs(i - goal[0]) <= 1 && Math.abs(j - goal[1]) <= 1) : (RN.has(ck(i, j)) && d > 6)) { end = [i, j]; break; }
          for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
            const ni = i + a, nj = j + b; if (Math.abs(ni - si) * CS > R || Math.abs(nj - sj) * CS > R || blocked(ni, nj)) continue;
            const L = Math.hypot(a, b) * CS, sl = Math.abs(hAt(ni, nj) - hAt(i, j)) / L; if (sl > .3) continue;
            const mea = .8 + .4 * fbm(ni / 7, nj / 7, 420, 2), c = d + L * (1 + Math.pow(sl / .1, 2) * 3) * mea * (RN.has(ck(ni, nj)) ? .4 : 1), k = ck(ni, nj);   // sale a tornanti, serpeggia
            if (c < (D.has(k) ? D.get(k) : 1e18)) { D.set(k, c); PR.set(k, ck(i, j)); Q.push([c, ni, nj]); }
          }
        }
        if (!end) return null;
        const out = []; let k = ck(end[0], end[1]); while (k !== undefined) { const i = Math.floor(k / 4096), j = k - i * 4096; out.push([i * CS + 1, j * CS + 1]); k = PR.get(k); }
        out.reverse();   // dalla strada (o dalla meta d'arrivo) alla meta di partenza
        const thin = out.filter((q, n) => n % 3 === 0 || n === out.length - 1); if (thin.length < 2) return null;
        return chaikin(thin, 2);
      };
      const T1 = [   // id, nome, partenza (la meta), arrivo (null = la strada), raggio di ricerca
        ['sent_pizzo', 'Mulattiera del Pizzo', [781, 143], null, 140], ['sent_neviera', 'Sentiero della Neviera', [773, 135], [781, 143], 60],
        ['crinale_o', 'Sentiero di crinale', [781, 143], [813, 137], 90], ['crinale_mono', 'Crinale del Monolite', [813, 137], [855, 143], 90],
        ['sent_sorgente', 'Sentiero della Sorgente', [775, 159], null, 120], ['sent_rudere', 'Sentiero del Casale', [833, 111], null, 120],
        ['sent_spiazzo', 'Sentiero dello Spiazzo', [795, 139], null, 120], ['sent_carbonaia', 'Sentiero dei Carbonai', [869, 169], null, 100],
        ['sent_monolite', 'Sentiero del Monolite', [855, 143], null, 100], ['ciglio', 'Sentiero del Ciglio', [767, 113], null, 100],
        ['sent_salita', 'Salita della Collina Nera', [1083, 129], null, 90], ['sent_grotta', 'Sentiero della Grotta', [1083, 151], null, 90],
        ['crinale_e', 'Crinale della Collina Nera', [1083, 129], [1157, 141], 120], ['sent_cava', 'Sentiero della Cava', [1143, 151], null, 90],
        ['sent_ruderi', 'Sentiero dei Ruderi', [1125, 161], null, 90], ['sent_covo', 'Traccia del Covo', [1157, 141], null, 90]];
      // la sterrata principale corre sul crinale, da un capo all'altro del monte
      { const cp = []; for (let xo0 = 166; xo0 <= 350; xo0 += 6) cp.push([xn(xo0), crestY(xo0)]);
        const vg = CITY.roads.find(r => r.id === 'via_governo'); if (vg) { let b = vg.pts[0], bd = 1e9; vg.pts.forEach(q => { const d = dist(q[0], q[1], cp[cp.length - 1][0], cp[cp.length - 1][1]); if (d < bd) { bd = d; b = q; } }); cp.push(b.slice()); }
        const rd = { id: 'cresta', name: 'Sterrata di cresta', w: 4, kind: 'sterrato', pts: chaikin(cp, 3), monte: true }; roads.push(rd); mark(rd); }
      const CLR = [];
      T1.forEach(([id, name, from, to, R]) => { const pts = trace(from, to, R); if (!pts) return; const rd = { id, name, w: 1.4, kind: 'sterrato', pts, monte: true, traccia: true }; roads.push(rd); mark(rd);
        let acc = 0; for (let k = 1; k < pts.length; k++) { acc += dist(pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1]); if (acc > 38 && hash2(Math.round(pts[k][0]), Math.round(pts[k][1]), 421) < .55) { acc = 0; const a = hash2(k, id.length, 422) * 6.28; CLR.push([pts[k][0] + Math.cos(a) * 4, pts[k][1] + Math.sin(a) * 4, 5 + hash2(k, 3, 423) * 4]); } } });
      // le radure lungo i sentieri: il bosco si apre, erba e qualche cespuglio
      CLR.forEach(([cx, cy, rr]) => { for (let j = Math.floor((cy - rr) / TS); j <= Math.ceil((cy + rr) / TS); j++) for (let i = Math.floor((cx - rr) / TS); i <= Math.ceil((cx + rr) / TS); i++) { if (i < 0 || j < 0 || i >= GW || j >= GH) continue; const q = ((i * TS + 1 - cx) ** 2 + (j * TS + 1 - cy) ** 2) / (rr * rr) + (fbm(i / 3, j / 3, 424, 2) - .5) * .5; const k = j * GW + i; if (q < 1 && (grid[k] === T.TREE || grid[k] === T.SHRUB)) grid[k] = hash2(i, j, 425) < .12 ? T.SHRUB : T.GRASS; } });
    }
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
            if (grid[i] === T.WATER) { grid[i] = T.PIER; continue; }
            if (v === T.VIA || roadW[i] === 0) { grid[i] = v; roadW[i] = Math.max(roadW[i], rd.w); }
          } else if (walk && d <= half + walk && roadW[i] === 0 && grid[i] !== T.WATER) grid[i] = zone[i] === Z.CITTA ? T.WALK : grid[i] === T.TREE ? T.SHRUB : grid[i];
          else if (d <= half + 1.5 && grid[i] === T.TREE) grid[i] = T.SHRUB;
        }
      }
    };
    roads.forEach(paint);
    roads.forEach(rd => {
      const hs = rd.pts.map(([x, y]) => rawElev(x, y)), sm = rd.prof ? rd.prof.map(h => Math.max(.4, h)) : hs.map((h, k) => { let s = 0, c = 0; for (let q = -6; q <= 6; q++) { const v = hs[clamp(k + q, 0, hs.length - 1)]; s += v; c++; } return Math.max(.4, s / c); });
      rd.h = sm;
      const half = rd.w / 2 + (rd.kind === 'citta' || rd.kind === 'litoranea' ? 2 : 0);
      rd.pts.forEach(([x, y], k) => { for (let ty = Math.floor((y - half) / TS); ty <= Math.floor((y + half) / TS); ty++) for (let tx = Math.floor((x - half) / TS); tx <= Math.floor((x + half) / TS); tx++) { if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) continue; if (dist(x, y, tx * TS + 1, ty * TS + 1) > half) continue; elev[ty * GW + tx] = sm[k]; } });
    });
    // i porti: il porto vecchio dei pescatori (riva sud del centro) e il porto cargo e militare (oltre la Base)
    const pier = (x0, y0, x1, y1, w, h) => { const L = dist(x0, y0, x1, y1); for (let s = 0; s <= L; s += 1) { const x = x0 + (x1 - x0) * s / L, y = y0 + (y1 - y0) * s / L; for (let o = -w / 2; o <= w / 2; o += 1) { const px = x + (y1 - y0) / L * o, py = y - (x1 - x0) / L * o, tx = Math.floor(px / TS), ty = Math.floor(py / TS); if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) continue; const i = ty * GW + tx; if (grid[i] === T.WATER) { grid[i] = T.PIER; elev[i] = h || .9; } } } };
    for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) {
      const i = ty * GW + tx, x = tx * TS + 1, y = ty * TS + 1;
      if (grid[i] === T.WATER || grid[i] === T.VIA) continue;
      const inl = Inland(x, y), q = x >= XC ? x - DXC : -1;
      if (inl < 7 && q > 352 && q < 460 && y > yc(q)) { grid[i] = T.QUAY; elev[i] = .4; zone[i] = Z.CITTA; }
      if (inl < 7 && q > 590) { grid[i] = T.QUAY; elev[i] = .9; zone[i] = Z.CITTA; }
    }
    const sY = southY;
    // ---------------- [costa] IL MARE COSTRUITO: porti, moli, pontili, posti barca ----------------
    // Ogni opera è un record in SEA.structs (la grafica la costruisce da qui, non dalle caselle):
    //   molo: muro di pietra pieno col piano lastricato (QUAY), i massi sul lato del mare aperto (ROCK), il muro paraonde, la lanterna in testa;
    //   pontile: tavolato di legno su pali (PIER), con le bitte, le scalette, le colonnine e i lampioncini;
    //   scalo: lo scivolo di cemento del cantiere. Le barche hanno il loro posto (SEA.moorings), orientate come si ormeggia davvero:
    //   di poppa ai pontili, di fianco alle banchine e ai moli, tirate in secca sulla sabbia nei borghi.
    const SEA = { structs: [], moorings: [], fishing: [], swim: [], rocks: [], lights: [], basins: [], routes: {} };
    const paintLine = (pts, w, tile, h, zn) => {
      for (let k = 0; k < pts.length - 1; k++) {
        const [x0, y0] = pts[k], [x1, y1] = pts[k + 1], L = dist(x0, y0, x1, y1) || 1;
        for (let s = 0; s <= L + .01; s += .5) { const x = x0 + (x1 - x0) * s / L, y = y0 + (y1 - y0) * s / L;
          for (let o = -w / 2; o <= w / 2 + .01; o += .5) { const px = x + (y1 - y0) / L * o, py = y - (x1 - x0) / L * o, tx = Math.floor(px / TS), ty = Math.floor(py / TS); if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) continue;
            const i = ty * GW + tx; if (grid[i] !== T.WATER && grid[i] !== T.SAND && grid[i] !== T.ROCK && !(tile === T.QUAY && grid[i] === T.PIER)) continue; grid[i] = tile; elev[i] = h; roadW[i] = 0; if (zn !== undefined) zone[i] = zn; } }
      }
    };
    // molo: pts dalla radice alla testa; sea: +1 i massi stanno a destra del verso di marcia (y verso sud), -1 a sinistra, 0 niente massi
    const molo = (id, name, pts, w, h, sea, light) => {
      const rk = [];
      for (let k = 0; k < pts.length; k++) { const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)], L = dist(a[0], a[1], b[0], b[1]) || 1, nx = -(b[1] - a[1]) / L * sea, ny = (b[0] - a[0]) / L * sea; rk.push([pts[k][0] + nx * (w / 2 + 2), pts[k][1] + ny * (w / 2 + 2)]); }
      if (sea) paintLine(rk, 4, T.ROCK, .5, Z.CITTA);
      paintLine(pts, w, T.QUAY, h, Z.CITTA);
      const S = { type: 'molo', id, name, pts, w, h, sea, rocks: sea ? rk : null }; SEA.structs.push(S);
      if (light) { const e = pts[pts.length - 1]; SEA.lights.push({ x: e[0], y: e[1], col: light, h }); S.light = light; }
      return S;
    };
    const pontile = (id, name, pts, w, h, head) => { paintLine(pts, w, T.PIER, h); if (head) paintLine(head, w, T.PIER, h); const S = { type: 'pontile', id, name, pts, w, h, head: head || null }; SEA.structs.push(S); return S; };
    // posti barca lungo un pontile: le barche stanno di poppa, perpendicolari, a passo `step`, sui due lati
    const fingers = (S, from, step, kinds, r0, sides) => {
      const [a, b] = [S.pts[0], S.pts[S.pts.length - 1]], L = dist(a[0], a[1], b[0], b[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
      (sides || [1, -1]).forEach(sg => { for (let s = from; s < L - 1.5; s += step) { if (r0() < .18) continue; const kind = kinds[Math.floor(r0() * kinds.length)], len = BOATLEN[kind], off = S.w / 2 + .5 + len / 2, nx = -uy * sg, ny = ux * sg;
        SEA.moorings.push({ kind, x: a[0] + ux * s + nx * off, y: a[1] + uy * s + ny * off, ang: Math.atan2(-ny, -nx), len, at: S.id }); } });
    };
    const BOATLEN = { gozzo: 5, lancia: 6, barca_vela: 8, motoscafo: 7, peschereccio: 11, motovedetta: 13, nave: 44, rimorchiatore: 14, pedalo: 2.6, secca: 4.6 };
    const rs = rng(4242);
    // -- il porto vecchio, sotto il centro: la banchina dritta (la Calata), il Molo Vecchio che fa da diga (gomito verso levante,
    //    lanterna rossa), il Molo di Levante più corto (lanterna verde), tre pontili per le barche, lo scalo del cantiere.
    const PV = { qy: 192, x0: 958, x1: 1078 };
    const mVecchio = molo('molo_vecchio', 'Molo Vecchio', [[PV.x0, 186], [PV.x0, 226], [966, 236], [978, 240], [1042, 241]], 5, 1.3, 1, 'rosso');
    const mLevante = molo('molo_levante', 'Molo di Levante', [[1080, 186], [1078, 210], [1072, 220], [1064, 227]], 4.5, 1.3, -1, 'verde');
    SEA.basins.push({ id: 'porto_vecchio', name: 'Porto vecchio', poly: [[PV.x0 + 3, PV.qy], [1077, PV.qy], [1075, 210], [1063, 224], [1042, 237], [978, 237], [962, 230], [PV.x0 + 3, 220]], depth: 4.5, mouth: [1053, 233] });
    const PONTI = [['pontile_ovest', 'Pontile dei gozzi', 990], ['pontile_centro', 'Pontile della Marina', 1013], ['pontile', 'Pontile Est', 1037]];
    PONTI.forEach(([id, name, px], k) => { const S = pontile(id, name, [[px, PV.qy - 1], [px, PV.qy + 25]], 2.5, .75, [[px - 4, PV.qy + 25], [px + 4, PV.qy + 25]]);
      fingers(S, 4, 4.2, k === 0 ? ['gozzo', 'gozzo', 'lancia'] : k === 1 ? ['barca_vela', 'motoscafo', 'barca_vela', 'lancia'] : ['motoscafo', 'lancia', 'gozzo'], rs); });
    // i pescherecci all'interno del Molo Vecchio, di fianco
    [990, 1004.5, 1019].forEach((x, k) => SEA.moorings.push({ kind: 'peschereccio', x, y: 241 - 2.5 - 2.6, ang: k % 2 ? 0 : Math.PI, len: BOATLEN.peschereccio, at: 'molo_vecchio' }));
    // il rimorchiatore e una motovedetta della Guardia alla Calata, verso il Molo di Levante
    SEA.moorings.push({ kind: 'motovedetta', x: 1061, y: PV.qy + 3.2, ang: Math.PI, len: BOATLEN.motovedetta, at: 'calata' });
    // lo scalo del cantiere: scivolo di cemento con le rotaie, una barca in secca sul carrello in cima
    SEA.structs.push({ type: 'scalo', id: 'scalo_cantiere', name: 'Scalo del cantiere', pts: [[970, PV.qy - 4], [970, PV.qy + 12]], w: 6 });
    // -- il porto cargo e militare, oltre la Base: moli di pietra larghi, la nave dell'Impero di fianco al molo nord, le motovedette
    const mc1 = molo('molo_cargo_n1', 'Molo cargo nord', [[1218, northY(606) + 4], [1218, northY(606) - 34]], 9, 1.4, 0, 'rosso');
    const mc2 = molo('molo_cargo_n2', 'Molo dell\'Impero', [[1244, northY(632) + 4], [1244, northY(632) - 34]], 9, 1.4, 0, 'verde');
    molo('molo_cargo_s1', 'Molo militare', [[1226, southY(614) - 4], [1226, southY(614) + 34]], 9, 1.4, 0, 'rosso');
    molo('molo_cargo_s2', 'Molo dei rimorchiatori', [[1252, southY(640) - 4], [1252, southY(640) + 34]], 9, 1.4, 0, 'verde');
    molo('molo_testa', 'Testata del porto cargo', [[1276, 140], [1297, 140]], 12, 1.4, 0);
    SEA.moorings.push({ kind: 'nave', x: 1244 + 4.5 + 6.5, y: northY(632) - 14, ang: -Math.PI / 2, len: BOATLEN.nave, at: 'molo_cargo_n2' });
    [0, 1].forEach(k => SEA.moorings.push({ kind: 'motovedetta', x: 1226 - 4.5 - 2.4, y: southY(614) + 9 + k * 15, ang: Math.PI / 2, len: BOATLEN.motovedetta, at: 'molo_cargo_s1' }));
    SEA.moorings.push({ kind: 'rimorchiatore', x: 1252 + 4.5 + 2.8, y: southY(640) + 16, ang: Math.PI / 2, len: BOATLEN.rimorchiatore, at: 'molo_cargo_s2' });
    SEA.moorings.push({ kind: 'peschereccio', x: 1218 - 4.5 - 2.6, y: northY(606) - 16, ang: -Math.PI / 2, len: BOATLEN.peschereccio, at: 'molo_cargo_n1' });
    // -- il Lido: un pontiletto per i pedalò e le barche a remi del bagnino
    { const lx = 1124, ly = SouthY(1124); pontile('pontile_lido', 'Pontile del Lido', [[lx, ly - 3], [lx, ly + 12]], 1.8, .6);
      [-1, 1].forEach(sg => [4, 7.5].forEach(s => SEA.moorings.push({ kind: 'pedalo', x: lx + sg * 2.6, y: ly + s, ang: sg > 0 ? Math.PI : 0, len: BOATLEN.pedalo, at: 'pontile_lido' }))); }
    void mVecchio; void mLevante; void mc1; void mc2;
    // piazza San Rocco e fontana
    { const q = CITY.piazza; for (let ty = T2i(q[1]); ty < T2i(q[3]); ty++) for (let tx = T2i(q[0]); tx < T2i(q[2]); tx++) { const i = ty * GW + tx; if (grid[i] !== T.VIA && grid[i] !== T.WATER) { grid[i] = T.PIAZZA; roadW[i] = 0; } } }
    blob(xn(409), 117, 3, 3, i => { grid[i] = T.FOUNT; });
    (CITY.piazzette || []).forEach(([x, y, rr]) => blob(x, y, rr, rr * .8, i => { if (grid[i] !== T.VIA && grid[i] !== T.WATER && grid[i] !== T.BLD) { grid[i] = T.PIAZZA; roadW[i] = 0; } }));   // [isola] le piazzette dei vicoli
    { const q = GOV.piazza; for (let ty = T2i(q[1]); ty < T2i(q[3]); ty++) for (let tx = T2i(q[0]); tx < T2i(q[2]); tx++) { const i = ty * GW + tx; if (grid[i] !== T.VIA && grid[i] !== T.WATER) { grid[i] = T.PIAZZA; roadW[i] = 0; } } }   // [isola] Piazza del Governo
    blob(xn(205), 108, 7, 5, i => { if (grid[i] !== T.VIA) grid[i] = T.PIAZZA; });            // piazzetta di San Giacomo
    blob(xn(598), 142, 10, 6, i => { if (grid[i] !== T.VIA) grid[i] = T.PIAZZA; });          // piazzale d'armi della Rocca
    blob(xn(632), 134, 6, 6, i => { if (grid[i] !== T.VIA) grid[i] = T.PIAZZA; });       // eliporto
    blob(xn(532), 152, 9, 7, i => { if (grid[i] !== T.VIA && grid[i] !== T.DIRT) grid[i] = T.ROCK; });   // la cava
    blob(xn(548), 184, 8, 5, i => { if (grid[i] !== T.VIA) grid[i] = T.DIRT; });              // discarica
    blob(xn(164), 102, 7, 5, i => { if (grid[i] !== T.VIA && grid[i] !== T.DIRT) grid[i] = T.GRASS; });   // radura dell'ovile
    blob(xn(170), 130, 6, 5, i => { if (grid[i] === T.TREE) grid[i] = T.GRASS; });           // radura del pastore
    blob(xn(588), 166, 12, 6, i => { if (grid[i] !== T.VIA) grid[i] = T.DIRT; });            // poligono della Base
    blob(234, 78, 9, 6, i => { if (grid[i] !== T.VIA) grid[i] = T.DIRT; });              // piazzale della Stazione Nord
    blob(262, 324, 9, 6, i => { if (grid[i] !== T.VIA) grid[i] = T.DIRT; });             // piazzale della Stazione Sud
    blob(148, 176, 14, 10, i => { if (grid[i] === T.SHRUB || grid[i] === T.FIELD || grid[i] === T.TREE) grid[i] = T.GRASS; }); // accampamento dei beduini, in cima al Tavolato
    // radure sulle colline: bivacchi, monolite, spiazzi da campeggio (alberi tolti, si vede chi c'è)
    [[284, 132, 5], [322, 142, 5], [260, 146, 4], [486, 138, 5], [528, 128, 4], [518, 134, 3], [544, 140, 3], [262, 154, 4], [300, 110, 5], [336, 168, 4], [496, 108, 4], [512, 160, 5], [470, 150, 3], [240, 128, 4]].forEach(([x, y, rr]) => blob(xn(x), y, rr, rr, i => { if (grid[i] === T.TREE || grid[i] === T.SHRUB) grid[i] = T.GRASS; }));
    // ---- il Muro: dalla riva nord alla riva sud, un solo varco sul Viale della Tutela ----
    const WALL = { x: xn(WALLX), tx: Math.floor(xn(WALLX) / TS), gate: [yc(WALLX) - 6, yc(WALLX) + 6], y0: northY(WALLX), y1: southY(WALLX), towers: [] };
    for (let ty = 0; ty < GH; ty++) {
      const y = ty * TS + 1; if (y < WALL.y0 - 2 || y > WALL.y1 + 2) continue;
      if (y > WALL.gate[0] && y < WALL.gate[1]) continue;
      for (const tx of [WALL.tx]) { const i = ty * GW + tx; if (grid[i] === T.WATER && zone[i] === Z.MARE) continue; grid[i] = T.BLD; roadW[i] = 0; reserved[i] = 1; }
    }
    for (let y = WALL.y0 + 8; y < WALL.y1 - 4; y += 26) if (Math.abs(y - yc(WALLX)) > 12) WALL.towers.push([WALL.x, y]);
    WALL.towers.push([WALL.x, WALL.gate[0] - 3], [WALL.x, WALL.gate[1] + 3]);
    // ---- pareti di roccia e muri a secco: dove il terreno cade di colpo non si passa (le strade restano) ----
    for (let ty = 1; ty < GH - 1; ty++) for (let tx = 2; tx < XG / TS; tx++) {   // [isola] tutta la testa, il collo e il Monte Scuro
      const i = ty * GW + tx, v = grid[i]; if (v === T.WATER || v === T.BLD || v === T.PIER || v === T.QUAY || roadW[i] > 0 || zone[i] === Z.CITTA) continue;
      let drop = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = (ty + dy) * GW + tx + dx; if (grid[n] === T.WATER) continue; drop = Math.max(drop, elev[i] - elev[n]); }
      if (feat[i] & MF.TERR) { if (drop > 1.2) { if (hash2(tx, ty, 77) < .12) feat[i] |= 256; else { grid[i] = T.CLIFF; feat[i] |= 512; } } }
      else if (drop > 1.9) grid[i] = T.CLIFF;
    }
    // ---------------- EDIFICI ----------------
    const B = [];
    const flatOK = (x, y, w, h, m) => { let a = 1e9, b = -1e9; for (let ty = y; ty < y + h; ty++) for (let tx = x; tx < x + w; tx++) { if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) return false; const e = elev[ty * GW + tx]; a = Math.min(a, e); b = Math.max(b, e); } return b - a <= m; };
    const free = (x, y, w, h, gap) => {
      for (let ty = y - gap; ty < y + h + gap; ty++) for (let tx = x - gap; tx < x + w + gap; tx++) {
        if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) return false;
        const i = ty * GW + tx, v = grid[i];
        if (bIndex[i] >= 0 || (reserved[i] && tx >= x && tx < x + w && ty >= y && ty < y + h)) return false;
        const inner = tx >= x && tx < x + w && ty >= y && ty < y + h;
        if (inner && (v === T.WATER || v === T.CLIFF || v === T.GRAVEL || v === T.VIA || v === T.PIER || v === T.QUAY || v === T.FOUNT || v === T.PIAZZA || v === T.DIRT || v === T.WALK || roadW[i] > 0)) return false;
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
    const townPt = ([x, y]) => x >= XC && x - DXC > 348 && x - DXC < 464 && OnLand(x, y);
    NAMED.forEach(([id, name, w, h, fl, style, at0, ex]) => {
      const at = ex.nuovo ? at0 : [xn(at0[0]), at0[1]];   // [isola]
      let s = null;
      if (townPt(at) && !ex.kiosk && !ex.lighthouse && id !== 'cantiere') {
        let bd = 30;
        cityRoads.forEach(rd => [-1, 1].forEach(side => [[w, h], [h, w]].forEach(([a, c]) => frontage(rd, side, a, c).forEach(([x, y, ww, hh]) => {
          const d = dist((x + ww / 2) * TS, (y + hh / 2) * TS, at[0], at[1]); if (d < bd && free(x, y, ww, hh, 0)) { bd = d; s = [x, y, ww, hh]; }
        }))));
      }
      if (!s) { const q = site(at[0], at[1], w, h, 1); if (q) s = [q[0], q[1], w, h]; }
      if (!s) { const q = site(at[0], at[1], w, h, 0) || site(at[0], at[1], h, w, 0); if (q) s = [q[0], q[1], w, h]; }   // [isola] in città lo spazio è poco
      if (!s) { if (typeof console !== 'undefined') console.warn('[world] niente posto per', id); return; }
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
          if (zone[y * GW + x] !== Z.CITTA && !flatOK(x, y, w, h, 1.6)) continue;
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
        // [isola] niente file uguali: larghezze da 2 a 7, ogni tanto una casa arretrata o meno profonda
        const sb = r() < .2 ? 1 : 0, hh = Math.max(2, h - sb - (r() < .3 ? 1 : 0));
        for (let w = Math.min(len - u, 2 + Math.floor(r() * 6)); w >= 2 && !placed; w--) {
          const x = horiz ? q[0] + u : side < 0 ? fx - hh + 1 - sb : fx + sb, y = horiz ? (side < 0 ? fy - hh + 1 - sb : fy + sb) : q[1] + u;
          const bw = horiz ? w : hh, bh = horiz ? hh : w;
          if (!free(x, y, bw, bh, 0)) continue;
          stamp({ id: 'casa_' + (nH++), x, y, w: bw, h: bh, fl: dist(x, y, 204 + DXC / TS, 58) < 28 ? 4 + Math.floor(r() * 4) : 2 + Math.floor(r() * 4), style: CSTY[Math.floor(r() * CSTY.length)], house: true });
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
    // periferie: le costiere, con le case tra la strada e il mare o dalla parte della collina
    const perif = z => z === Z.CITTA;
    // [inverno] agglomerati come nei paesi: gruppi di case attaccate, la cui facciata segue la strada su una linea sola (scatta di una casella solo
    // dove la strada si sposta davvero), una casa ogni tanto arretrata a fare uno spiazzo, poi spazio aperto; dietro, una seconda fila a macchie.
    const walkFront = (pts, rdw, extra0, side, wMin, wMax, hMin, hMax, rowGap, dens, o) => {   // o: { cont: fronte continuo, flat: filo dritto, jog: dentini, rk: rango della via }
      const chunks = []; let cur = [];
      for (let k = 0; k < pts.length; k++) { if (cur.length && dist(cur[cur.length - 1][0], cur[cur.length - 1][1], pts[k][0], pts[k][1]) > 14) { chunks.push(cur); cur = []; } cur.push(pts[k]); }
      if (cur.length) chunks.push(cur);
      chunks.forEach(ch => {
        const P = []; for (let k = 0; k < ch.length - 1; k++) { const L = dist(ch[k][0], ch[k][1], ch[k + 1][0], ch[k + 1][1]); for (let u = 0; u < L; u += TS) P.push([ch[k][0] + (ch[k + 1][0] - ch[k][0]) * u / L, ch[k][1] + (ch[k + 1][1] - ch[k][1]) * u / L]); }
        let i = 2, lastEnd = -1e9, left = 2 + Math.floor(r() * 5), cOff = o && o.flat ? 0 : r() < .5 ? 0 : 2 * (1 + Math.floor(r() * 2));
        while (i < P.length - 3) {
          let w = wMin + Math.floor(r() * (wMax - wMin + 1)); const h = hMin + Math.floor(r() * (hMax - hMin + 1)), extra = extra0 + cOff + (r() < (o ? o.jog : .2) ? 2 : 0);
          let placed = false;
          if (dens < 1 && r() > dens) { i += 2 + Math.floor(r() * 3); continue; }
          for (; w >= wMin && !placed; w--) {
            const mid = Math.min(P.length - 2, i + Math.floor(w / 2)), dx = P[mid + 1][0] - P[mid - 1][0], dy = P[mid + 1][1] - P[mid - 1][1], L = Math.hypot(dx, dy) || 1, nx = -dy / L * side, ny = dx / L * side;
            const off = rdw / 2 + 2.5 + extra, nex = P[mid][0] + nx * off, ney = P[mid][1] + ny * off, horiz = Math.abs(dx) >= Math.abs(dy);
            let x, y, bw, bh;
            if (horiz) { x = Math.max(Math.floor(P[i][0] / TS), lastEnd); bw = w; bh = h; y = ny > 0 ? Math.round(ney / TS) : Math.round(ney / TS) - h; }
            else { y = Math.max(Math.floor(P[i][1] / TS), lastEnd); bw = h; bh = w; x = nx > 0 ? Math.round(nex / TS) : Math.round(nex / TS) - h; }
            if (!perif(zone[Math.max(0, Math.min(GH - 1, y)) * GW + Math.max(0, Math.min(GW - 1, x))])) continue;
            if (!free(x, y, bw, bh, 0)) continue;
            stamp({ id: 'casa_' + (nH++), x, y, w: bw, h: bh, fl: 2 + Math.floor(r() * 2), style: CSTY[Math.floor(r() * CSTY.length)], house: true, rk: o ? o.rk : 0 });
            const gap = r() < rowGap ? 1 + Math.floor(r() * 2) : 0; lastEnd = (horiz ? x + bw : y + bh) + gap; placed = true; i += w + gap;
          }
          if (placed && !(o && o.cont) && --left <= 0) { const gp = 3 + Math.floor(r() * 7); lastEnd += gp; i += gp; left = 2 + Math.floor(r() * 5); cOff = r() < .5 ? 0 : 2 * (1 + Math.floor(r() * 2)); }
          if (!placed) i++;
        }
      });
    };
    // [isola] le case della città si affacciano sui vicoli e sulle strade larghe: fronti continui ma storti, larghezze e profondità diverse
    // [isola] il tessuto con una logica: prima il Corso (fronte continuo sul filo, case profonde), poi le vie, poi i vicoli
    // (case strette, qualche dente, un androne ogni tanto); una seconda passata più corta chiude i buchi. Dentro restano i cortili.
    { const RK = rd => rd.id === 'corso' ? 3 : rd.main ? 2 : 1;
      CITY.roads.filter(rd => rd.main).sort((a, b) => RK(b) - RK(a)).forEach(rd => [-1, 1].forEach(side => walkFront(rd.pts, rd.w, 0, side, 3, 5, RK(rd) === 3 ? 5 : 4, RK(rd) === 3 ? 6 : 5, 0, 1, { cont: true, flat: true, jog: 0, rk: RK(rd) })));
      CITY.roads.filter(rd => !rd.main).forEach(rd => [-1, 1].forEach(side => walkFront(rd.pts, rd.w, -2.3, side, 2, 4, 3, 4, .12, 1, { cont: true, flat: false, jog: .15, rk: 1 })));
      CITY.roads.forEach(rd => [-1, 1].forEach(side => walkFront(rd.pts, rd.w, rd.main ? 0 : -2.3, side, 2, 3, 2, 3, .2, 1, { cont: true, flat: !!rd.main, jog: 0, rk: RK(rd) }))); }
    // [isola] la baraccopoli: dentro gli isolati, nel quartiere del governo e nelle periferie le baracche si ammucchiano una addosso all'altra,
    // di misure diverse, con passaggi di una casella che girano storti (ogni baracca tiene libero il suo lato nord e il suo lato ovest).
    const SHSTY = [3, 4, 5, 7, 8, 11, 14, 19];
    let nShack = 0;
    for (let pass = 0; pass < 4 && nShack < 520; pass++) for (let ty = 2; ty < GH - 6; ty++) for (let tx = Math.floor((XG - 70) / TS); tx < Math.floor((xn(556) - 6) / TS); tx++) {
      if (hash2(tx, ty, 61 + pass) > .5 || nShack >= 520) continue;
      const i = ty * GW + tx, v = grid[i]; if (zone[i] !== Z.CITTA || (v !== T.COB && v !== T.GRASS && v !== T.SHRUB && v !== T.TREE) || roadW[i] > 0) continue;
      if (dist(tx * TS, ty * TS, xn(409), 117) < 70) continue;   // [isola] nel centro i cortili restano cortili
      const w = 2 + Math.floor(r() * 3), h = 2 + Math.floor(r() * 2 + r());
      if (!free(tx, ty, w, h, 0)) continue;
      let okN = true, okW = true; for (let k = 0; k < w && okN; k++) { const a = (ty - 1) * GW + tx + k; if (bIndex[a] >= 0 || grid[a] === T.WATER) okN = false; } for (let k = 0; k < h && okW; k++) { const a = (ty + k) * GW + tx - 1; if (bIndex[a] >= 0 || grid[a] === T.WATER) okW = false; }
      if (!(okN || okW) || !flatOK(tx, ty, w, h, 1.8)) continue;
      stamp({ id: 'casa_' + (nH++), x: tx, y: ty, w, h, fl: r() < .72 ? 1 : 2, style: SHSTY[Math.floor(r() * SHSTY.length)], house: true, shack: true });
      if (okN) for (let k = 0; k < w; k++) reserved[(ty - 1) * GW + tx + k] = 1; else for (let k = 0; k < h; k++) reserved[(ty + k) * GW + tx - 1] = 1;
      nShack++;
    }
    roads.filter(rd => rd.id === 'nord' || rd.id === 'litoranea').forEach(rd => {
      const keep = rd.pts.filter(([x]) => { const q = x >= XF ? xo(x) : -1; return (q > 250 && q < 346) || (q > 466 && q < 548); }), ex0 = rd.kind === 'litoranea' ? 2 : 0;
      [-1, 1].forEach(side => { walkFront(keep, rd.w, ex0, side, 3, 6, 3, 6, .15, 1); walkFront(keep, rd.w, ex0 + 13, side, 3, 5, 3, 5, .3, .5); });
    });
    roads.filter(rd => /^diag_/.test(rd.id)).forEach(rd => [-1, 1].forEach(side => walkFront(rd.pts, rd.w, 0, side, 3, 5, 3, 5, .25, .8)));
    // villaggi della foresta e case sparse
    roads.filter(rd => rd.id === 'paese' || rd.id === 'villaggio').forEach(rd => along(rd, 3, 4, 6, 1, 2, [4, 5, 8], z => z === Z.CAMPAGNA || z === Z.MACCHIA));
    roads.filter(rd => rd.id === 'macchia').forEach(rd => along(rd, 12, 4, 5, 1, 2, [4, 5, 8], z => z === Z.CAMPAGNA));
    // casette di legno e capanni sparsi nella foresta e ai margini della prateria
    for (let k = 0; k < 48; k++) {
      const x = 60 + r() * 780, y = 40 + r() * 330;   // [isola] tutta la testa e il collo
      const z = zoneAt(x, y); if (z !== Z.CAMPAGNA && z !== Z.MACCHIA && z !== Z.DESERTO) continue;
      if (z === Z.DESERTO) continue;          // il Tavolato è dei beduini: niente case
      const s = site(x, y, 4, 4, 2); if (!s || !flatOK(s[0], s[1], 4, 4, 1.4)) continue; stamp({ id: 'casa_' + (nH++), x: s[0], y: s[1], w: 4, h: 4, fl: 1, style: [4, 5, 8][k % 3], house: true, farm: true, wood: true });
    }
    // [isola] i borghi dei pescatori: casette basse sulla riva, sparse e storte, col pontile di legno e lo scalo
    const FISHP = [];
    [['pescatori_s', 'Borgo dei pescatori', 470, 266, 1], ['pescatori_n', 'Case della Tramontana', 566, 88, -1], ['pescatori_t', 'Capanni della Punta', 152, 358, 1]].forEach(([id, name, cx, cy, sd]) => {
      let n = 0; for (let k = 0; k < 90 && n < 8; k++) {
        const a = r() * 6.283, d = 3 + r() * 22, x = cx + Math.cos(a) * d * 1.3, y = cy + Math.sin(a) * d * .6, w = 2 + Math.floor(r() * 3), h = 2 + Math.floor(r() * 2);
        const tx = Math.floor(x / TS - w / 2), ty = Math.floor(y / TS - h / 2);
        if (!OnLand(x, y) || !free(tx, ty, w, h, 1) || !flatOK(tx, ty, w, h, 1.3)) continue;
        stamp({ id: 'casa_' + (nH++), x: tx, y: ty, w, h, fl: r() < .8 ? 1 : 2, style: [4, 5, 8][n % 3], house: true, fisher: true }); n++;
      }
      // [costa] il pontile di legno con la testata a T, due gozzi ormeggiati, le barche tirate in secca sulla sabbia accanto
      const sy = sd > 0 ? SouthY(cx) : NorthY(cx), hy = sy + sd * 17, S = pontile('pontile_' + id, { pescatori_s: 'Pontile del Borgo', pescatori_n: 'Pontile della Tramontana', pescatori_t: 'Pontile dei Capanni' }[id], [[cx, sy - sd * 3], [cx + 2, hy]], 2, .7, [[cx - 2, hy], [cx + 6, hy]]);
      fingers(S, 7, 4.5, ['gozzo', 'gozzo', 'lancia'], rs, [1]);
      for (let k = 0, m = 0; k < 40 && m < 4; k++) { const x = cx + (k % 2 ? 1 : -1) * (6 + Math.floor(k / 2) * 1.7), y = (sd > 0 ? SouthY(x) : NorthY(x)) - sd * (3 + rs() * 1.5), tx = Math.floor(x / TS), ty = Math.floor(y / TS);
        if (Math.abs(x - cx) < 5 || grid[ty * GW + tx] !== T.SAND || SEA.moorings.some(q => q.kind === 'secca' && dist(q.x, q.y, x, y) < 3.4)) continue;
        SEA.moorings.push({ kind: 'secca', x, y, ang: sd > 0 ? -Math.PI / 2 + (rs() - .5) * .5 : Math.PI / 2 + (rs() - .5) * .5, len: BOATLEN.secca, at: id }); m++; }
      FISHP.push([id, name, cx, cy]);
    });
    // la Base: baracche in fila
    for (let k = 0; k < 6; k++) { const s = site(xn(580) + (k % 3) * 13, 164 - (k > 2 ? 48 : 0), 6, 3, 1); if (s) stamp({ id: 'casa_' + (nH++), x: s[0], y: s[1], w: 6, h: 3, fl: 1, style: 10, military: true, barrack: true }); }
    // ---------------- ALTEZZE: un paese basso ----------------
    // quasi tutto a uno o due piani; poche eccezioni che si vedono da lontano
    const ALTI = { chiesa: 3, rocca: 5, faro: 7, miramare: 3, oceano: 4, stella: 3, santuario: 3, cultura: 3, pietra: 3, governo: 3, ministero: 3, garante: 3, archivio: 2 };
    B.forEach(b => {
      if (ALTI[b.id]) { b.fl = ALTI[b.id]; return; } if (b.block) { b.fl = 4; return; } if (b.shack) return;
      if (b.warehouse || b.kiosk || b.farm || b.fisher) { b.fl = Math.min(b.fl, b.fisher && hash2(b.x, b.y, 4) < .2 ? 2 : 1); return; }
      if (zone[b.y * GW + b.x] !== Z.CITTA) { b.fl = Math.min(b.fl, hash2(b.x, b.y, 3) < .3 ? 1 : 2); return; }
      // [isola] la città sale e scende: case basse e palazzine alte una accanto all'altra, più alte verso il quartiere del governo
      // [isola] la città è bassa: si vede tutto, le case salgono e scendono di uno o due piani
      // [isola] l'altezza viene dalla via (Corso 3, vie 2, vicoli 1-2), dalla piazza vicina, dagli angoli fra due strade;
      // le palazzine vicine si somigliano (rumore a blocchi di 12 m) e salgono e scendono di un piano
      const cx = (b.x + b.w / 2) * TS, cy = (b.y + b.h / 2) * TS, rk = b.rk || 1;
      let f = rk === 3 ? 3 + (hash2(b.x, b.y, 3) < .3 ? 1 : 0) : rk === 2 ? 3 : 2;
      if (dist(cx, cy, xn(409), 117) < 48) f++;
      let sides = 0; [[0, -1, b.w, 1], [0, b.h, b.w, 1], [-1, 0, 1, b.h], [b.w, 0, 1, b.h]].forEach(([ox, oy, w, h]) => { let rd = false; for (let k = 0; k < Math.max(w, h) && !rd; k++) { const tx = b.x + ox + (w > 1 ? k : 0), ty = b.y + oy + (h > 1 ? k : 0); if (tx >= 0 && ty >= 0 && tx < GW && ty < GH && roadW[ty * GW + tx] > 0) rd = true; } if (rd) sides++; });
      if (sides >= 2 && rk >= 2) f++;
      const nb = hash2(Math.floor(cx / 12), Math.floor(cy / 12), 33); f += nb < .3 ? -1 : nb > .82 ? 1 : 0; if (hash2(b.x, b.y, 34) < .12) f--;   // qualche casetta bassa in mezzo
      b.fl = Math.max(1, Math.min(4, f));
      if (b.w * b.h < 9) b.fl = Math.min(b.fl, 2);
    });
    // [isola] i palazzi crescono per aggiunte: sopra il corpo pieno, un volume più piccolo e spostato (il terrazzo resta davanti, sulla strada),
    // e ogni tanto una stanzetta in cima. b.tiers: [{ x, y, w, h (caselle), f0 (piano da cui parte), fl }]; b.fl resta il numero di piani del corpo intero.
    B.forEach(b => {
      if (!b.house || b.shack || b.block || b.fisher || b.farm || b.fl < 3 || b.w < 3 || b.h < 3 || zone[b.y * GW + b.x] !== Z.CITTA) return;
      const q = k => hash2(b.x * 7 + k, b.y * 13 + k, 71); if (q(0) > .72) return;
      const f0 = 1 + Math.floor(q(1) * (b.fl - 1)), face = !b.door ? 'S' : b.door[1] === b.y + b.h ? 'S' : b.door[0] === b.x + b.w ? 'E' : b.door[1] === b.y - 1 ? 'N' : 'W';
      const ins = { S: 0, N: 0, E: 0, W: 0 }; ins[face] = 1 + (b[face === 'S' || face === 'N' ? 'h' : 'w'] >= 5 && q(2) < .4 ? 1 : 0);
      const other = ['S', 'N', 'E', 'W'].filter(f => f !== face)[Math.floor(q(3) * 3)]; if (q(4) < .6) ins[other] += 1;
      const t = { x: b.x + ins.W, y: b.y + ins.N, w: b.w - ins.W - ins.E, h: b.h - ins.N - ins.S, f0, fl: b.fl - f0 };
      if (t.w < 2 || t.h < 2) return;
      b.tiers = [t];
      if (t.w >= 3 && t.h >= 3 && q(5) < .38) { const rw = 2, rh = 2, rx = q(6) < .5 ? t.x : t.x + t.w - rw, ry = q(7) < .5 ? t.y : t.y + t.h - rh; b.tiers.push({ x: rx, y: ry, w: rw, h: rh, f0: b.fl, fl: 1, room: true }); }
    });

    // ---------------- A CHE SERVE OGNI EDIFICIO ----------------
    // ogni porta porta da qualche parte: case con il nome di chi ci abita, botteghe, uffici, palestre, il teatro, fabbriche
    const COGNOMI = ['Esposito', 'Russo', 'Ferrara', 'Greco', 'Marino', 'Rizzo', 'Lombardi', 'Gallo', 'Costa', 'Fontana', 'Conti', 'De Luca', 'Mancini', 'Caruso', 'Serra', 'Pinna', 'Sanna', 'Melis', 'Deiana', 'Murru', 'Piras', 'Loi', 'Cocco', 'Porcu', 'Fadda', 'Atzori', 'Mura', 'Lai', 'Usai', 'Carta'];
    const NOMI = ['Bruno', 'Tina', 'Gavino', 'Nello', 'Pina', 'Efisio', 'Rosaria', 'Totò', 'Lella', 'Mario'];
    const city = B.filter(b => !b.name && !b.military && !b.block && b.door && zone[b.y * GW + b.x] === Z.CITTA && (q => q > 262 && q < 550)(b.x * TS >= XF ? xo(b.x * TS) : 0)).sort((a, c) => hash2(a.x, a.y, 11) - hash2(c.x, c.y, 11));
    const big = city.slice().sort((a, c) => c.w * c.h - a.w * a.h);
    const USES = [
      // uso, insegna, colore neon, quante
      ['teatro', 'ТЕАТР ОДЕОН', '#ffd23b', 1, 'Teatro Odeon'], ['palestra', 'СПОРТЗАЛ', '#ff4fa3', 2], ['ferramenta', 'ХОЗТОВАРЫ', '#ff8a3b', 2], ['ufficio', 'КОНТОРА', '#7ab8ff', 3],
      ['barbiere', '이발 ЦИРЮЛЬНЯ', '#35e6ff', 2], ['tabacchi', 'ТАБАК', '#5aff9a', 2], ['panetteria', 'ХЛЕБ 빵', '#ffb35c', 2], ['farmacia', '✚ АПТЕКА 약국', '#4dff9a', 1], ['lavanderia', 'ПРАЧЕЧНАЯ', '#8affd0', 1],
      ['tipografia', 'ТИПОГРАФИЯ', '#e8e0d0', 1], ['circolo', 'КЛУБ', '#ff6a3b', 1, 'Circolo dei Lavoratori'], ['scuola', 'ШКОЛА', '#ffffff', 1, 'Scuola elementare'], ['sartoria', 'АТЕЛЬЕ', '#ff7ad9', 1], ['pescheria', 'РЫБА 생선', '#35e6ff', 1],
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
    const rural = B.filter(b => !b.name && !b.military && b.door && zone[b.y * GW + b.x] !== Z.CITTA).sort((a, c) => c.w * c.h - a.w * a.h);
    [['fabbrica', 'Conservificio Sanna'], ['fabbrica', 'Mattonificio Piras']].forEach(([use, label], i) => { const b = rural[i]; if (b) { b.use = use; b.name = label; b.sign = { t: i ? 'КИРПИЧ' : 'КОНСЕРВЫ', c: '#ff8a3b' }; } });
    B.forEach((b, i) => { if (b.barrack) { b.use = 'baracca'; b.name = 'Baracca della Tutela'; } if (!b.use) b.use = b.name ? null : b.farm ? 'cascina' : 'casa'; if (!b.name) b.label = (b.farm ? 'Cascina ' : 'Casa ') + COGNOMI[Math.floor(hash2(b.x, b.y, 21) * COGNOMI.length)]; else b.label = b.name; });


    // ---------------- [costa] SCOGLI IN MARE, FONDALE, PESCA, BAGNI, ROTTE ----------------
    // i faraglioni davanti a Punta Scogli e lo Scoglio della Sirena sotto la costa di tramontana: roccia vera (le barche ci sbattono)
    const ISLETS = [[14, 204, 4.2, 'faraglione_grande'], [6, 226, 3, 'faraglione_piccolo'], [24, 244, 2.4, 'scoglio_basso'], [346, 32, 3.2, 'scoglio_sirena'], [784, 34, 2.6, 'scoglio_monaco']];
    ISLETS.forEach(([cx, cy, rr, id]) => { blob(cx, cy, rr, rr * .85, i => { if (grid[i] === T.WATER && zone[i] === Z.MARE) { grid[i] = T.ROCK; elev[i] = .9; zone[i] = Z.SPIAGGIA; } }); SEA.rocks.push({ x: cx, y: cy, r: rr, big: true, id }); });
    // fondale: distanza dalla riva (trasformata di distanza a smusso 3-4) e tipo della riva più vicina
    const isSea = i => grid[i] === T.WATER && zone[i] === Z.MARE;
    const dq = new Float32Array(N).fill(1e9), src = new Int32Array(N).fill(-1);
    for (let i = 0; i < N; i++) if (!isSea(i)) { dq[i] = 0; src[i] = i; }
    const relax = (i, j, w) => { if (dq[j] + w < dq[i]) { dq[i] = dq[j] + w; src[i] = src[j]; } };
    for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) { const i = ty * GW + tx; if (!dq[i]) continue; if (tx > 0) relax(i, i - 1, 2); if (ty > 0) { relax(i, i - GW, 2); if (tx > 0) relax(i, i - GW - 1, 2.83); if (tx < GW - 1) relax(i, i - GW + 1, 2.83); } }
    for (let ty = GH - 1; ty >= 0; ty--) for (let tx = GW - 1; tx >= 0; tx--) { const i = ty * GW + tx; if (!dq[i]) continue; if (tx < GW - 1) relax(i, i + 1, 2); if (ty < GH - 1) { relax(i, i + GW, 2); if (tx < GW - 1) relax(i, i + GW + 1, 2.83); if (tx > 0) relax(i, i + GW - 1, 2.83); } }
    const kindOf = new Map(), kindAt = j => { let k = kindOf.get(j); if (k) return k; const v = grid[j], x = (j % GW) * TS + 1, y = ((j / GW) | 0) * TS + 1; k = v === T.QUAY || v === T.PIER ? 'porto' : zone[j] === Z.CITTA && v === T.ROCK ? 'falesia' : coastKind(x, y); kindOf.set(j, k); return k; };
    const SLOPE = { spiaggia: [.3, .055], cala: [.4, .08], scogli: [.9, .2], falesia: [2.6, .42], porto: [3.6, .1] };
    const inPoly = (x, y, P) => { let c = false; for (let a = 0, b = P.length - 1; a < P.length; b = a++) { if ((P[a][1] > y) !== (P[b][1] > y) && x < (P[b][0] - P[a][0]) * (y - P[a][1]) / (P[b][1] - P[a][1]) + P[a][0]) c = !c; } return c; };
    const depth = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      if (!isSea(i)) continue; const d = dq[i] - 1, k = src[i] >= 0 ? kindAt(src[i]) : 'falesia', [a, s] = SLOPE[k] || SLOPE.scogli, x = (i % GW) * TS + 1, y = ((i / GW) | 0) * TS + 1;
      let h = Math.min(a + Math.max(0, d) * s, 16) + Math.max(0, d - 60) * .15;
      for (const B of SEA.basins) { if (inPoly(x, y, B.poly)) h = B.depth; else if (dist(x, y, B.mouth[0], B.mouth[1]) < 40) h = Math.max(h, B.depth + 1); }
      depth[i] = Math.min(40, h);
    }
    for (let it = 0; it < 2; it++) { const D0 = depth.slice(); for (let ty = 1; ty < GH - 1; ty++) for (let tx = 1; tx < GW - 1; tx++) { const i = ty * GW + tx; if (!isSea(i)) continue; let s2 = 0, c = 0; for (let b2 = -1; b2 <= 1; b2++) for (let a = -1; a <= 1; a++) { const j = i + b2 * GW + a; if (isSea(j)) { s2 += D0[j]; c++; } } depth[i] = s2 / c; } }
    // sotto i pontili (pali piantati nel fondale) serve sapere quanto è fondo: la media del mare attorno
    for (let i = 0; i < N; i++) if (grid[i] === T.PIER) { let s2 = 0, c = 0; for (let b2 = -2; b2 <= 2; b2++) for (let a = -2; a <= 2; a++) { const j = i + b2 * GW + a; if (j >= 0 && j < N && isSea(j)) { s2 += depth[j]; c++; } } depth[i] = c ? s2 / c : 1.5; }
    SEA.depth = depth;
    // scogli che affiorano lungo le coste di roccia (solo grafica: sassi a pelo d'acqua fra 1 e 7 m dalla riva)
    for (let ty = 2; ty < GH - 2; ty++) for (let tx = 2; tx < GW - 2; tx++) { const i = ty * GW + tx; if (!isSea(i) || dq[i] > 8) continue; const k = kindAt(src[i]); if (k !== 'scogli' && k !== 'falesia') continue;
      const h1 = hash2(tx, ty, 515); if (h1 > (k === 'falesia' ? .2 : .13)) continue; SEA.rocks.push({ x: tx * TS + .4 + hash2(tx, ty, 516) * 1.2, y: ty * TS + .4 + hash2(tx, ty, 517) * 1.2, r: .5 + hash2(tx, ty, 518) * (k === 'falesia' ? 1.6 : 1), big: false }); }
    // dove si pesca: le teste dei moli e dei pontili, gli scogli. ang: dove si guarda (verso il mare)
    const shoreOut = (x, y) => { const sd = y < Yc(x) ? -1 : 1; return sd < 0 ? -Math.PI / 2 : Math.PI / 2; };
    SEA.structs.forEach(S => { if (S.type === 'scalo' || S.id === 'molo_testa') return; const e = S.pts[S.pts.length - 1], b = S.pts[S.pts.length - 2]; SEA.fishing.push({ id: 'pesca_' + S.id, name: (S.type === 'molo' ? 'In punta al ' : 'In fondo al ') + S.name, x: e[0], y: e[1], ang: Math.atan2(e[1] - b[1], e[0] - b[0]), kind: S.type, struct: S.id }); });
    const scogliNome = (x, sd) => x < 100 ? 'Scogli della Punta' : sd === 'N' ? (x < 680 ? 'Scogli di tramontana' : x < 960 ? 'Scogli sotto il Monte' : x < 1080 ? 'Scogliera del Lungomare' : 'Scogli di Levante') : x < 950 ? 'Scogli della fiumara' : 'Scogli del Lido';
    const ROMANI = ['', ' II', ' III', ' IV', ' V', ' VI'], nUso = {};
    let nsc = 0;
    ['N', 'S'].forEach(sd => { for (let x = 50; x < 1200; x += 70) { if (coastKind(x, sd === 'N' ? 0 : 1e4) !== 'scogli' && !(sd === 'N' && coastKind(x, 0) === 'falesia' && x % 140 < 70)) continue;
      const y = sd === 'N' ? NorthY(x) + 2.2 : SouthY(x) - 2.2, tx = Math.floor(x / TS), ty = Math.floor(y / TS); if (!OnLand(x, y) || grid[ty * GW + tx] !== T.ROCK) continue;
      SEA.fishing.push({ id: 'scogli_' + (++nsc), name: (n0 => n0 + (ROMANI[nUso[n0] = (nUso[n0] || 0) + 1, nUso[n0] - 1] || ''))(scogliNome(x, sd)), x, y, ang: sd === 'N' ? -Math.PI / 2 : Math.PI / 2, kind: 'scogli' }); } });
    // dove si fa il bagno: spiagge e cale (il fondale scende piano)
    [['Spiaggia Lunga', 140, 'S'], ['Spiaggia Lunga', 260, 'S'], ['Spiaggia Lunga', 400, 'S'], ['Spiaggia Lunga', 560, 'S'], ['Cala di tramontana', 300, 'N'], ['Cala delle Case della Tramontana', 566, 'N'],
      ['Cala di San Giacomo', 739, 'N'], ['Caletta della fiumara', 748, 'S'], ['Spiaggetta del Gabbiano', 815, 'S'], ['Spiaggia del Lido', 1112, 'S'], ['Spiaggia del Lido', 1138, 'S']].forEach(([name, x, sd], k) => {
      const y = sd === 'N' ? NorthY(x) : SouthY(x); SEA.swim.push({ id: 'bagno_' + k, name, x, y: y + (sd === 'N' ? -10 : 10), shore: [x, y + (sd === 'N' ? 3 : -3)], r: 14 }); });
    // rotte (per le barche che vanno e vengono): il giro dell'isola al largo, l'uscita dei pescherecci, l'arrivo della nave dell'Impero
    { const off = 46, g = [];
      for (let x = 1296; x > HEAD.x; x -= 16) g.push([x, NorthY(x) - off]);
      for (let a = -Math.PI / 2; a > -1.5 * Math.PI; a -= .12) g.push([HEAD.x + Math.cos(a) * (HEAD.r + off), HEAD.y + Math.sin(a) * (HEAD.r + off)]);
      for (let x = HEAD.x; x <= 1296; x += 16) g.push([x, SouthY(x) + off]);
      let P0 = g; for (let it = 0; it < 4; it++) P0 = P0.map((q, k) => { const a = P0[(k - 1 + P0.length) % P0.length], c = P0[(k + 1) % P0.length]; return [(a[0] + 2 * q[0] + c[0]) / 4, (a[1] + 2 * q[1] + c[1]) / 4]; });
      SEA.routes.giro = P0; }
    SEA.routes.pesca = [[1020, 228], [1053, 233], [1066, 252], [1040, 290], [960, 330], [860, 352], [760, 340], [700, 320]];
    SEA.routes.nave = [[1700, -120], [1420, 20], [1300, 60], [1262, 70], [1255, northY(632) - 14]];
    // ---------------- LUOGHI ----------------
    const PLACES = {};
    const tileOf = (x, y) => [Math.floor(x / TS), Math.floor(y / TS)];
    const walkable = (tx, ty) => { const v = grid[ty * GW + tx]; return v !== T.BLD && v !== T.WATER && v !== T.FOUNT && v !== T.TREE && v !== T.CLIFF; };
    const nearWalk = (x, y) => { const [tx, ty] = tileOf(x, y); for (let rr = 0; rr < 12; rr++) for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === rr && walkable(tx + dx, ty + dy)) return [tx + dx, ty + dy]; return [tx, ty]; };
    B.forEach(b => { if (b.name && b.door && !b.barrack) PLACES[b.id] = { id: b.id, name: b.name, tx: b.door[0], ty: b.door[1] }; });
    const PN = (id, name, x, y, ex) => { const [tx, ty] = nearWalk(x, y); PLACES[id] = Object.assign({ id, name, tx, ty, want: [x, y] }, ex || {}); };
    const P = (id, name, x, y, ex) => PN(id, name, xn(x), y, ex);   // [isola] i luoghi di prima sono in coordinate vecchie
    // centro
    P('piazza', 'Piazza San Rocco', 400, 117); P('fontana', 'Fontana di San Rocco', 413, 117); P('vico', 'Vicolo dei Lanternini', 382, 118);
    P('fiori', 'Banco dei fiori', 420, 122); P('piazzetta', 'Vico del Campo', 446, 130); P('caruggio', 'Caruggio dei Pescatori', 372, 152);
    P('calata', 'Calata del porto', 404, 186);
    // [costa] il porto vecchio rifatto: il molo dei pescatori è il Molo Vecchio (i pescherecci ci stanno di fianco), il Pontile Est è quello dei Marsigliesi
    PN('molo', 'Molo dei pescatori', 1004, 241); PN('pontile', 'Pontile Est', 1037, 214); PN('marina', 'Marina del porto vecchio', 1013, 197);
    PN('lanterna', 'Lanterna del Molo Vecchio', 1040, 241); PN('molo_levante', 'Molo di Levante', 1068, 222); PN('scalo', 'Scalo del cantiere', 966, 190);
    SEA.fishing.forEach(f => { if (!PLACES[f.id]) PN(f.id, f.name, f.x, f.y, { pesca: true }); f.place = f.id; });
    SEA.swim.forEach(b => { PN(b.id, b.name, b.shore[0], b.shore[1], { bagno: true }); b.place = b.id; }); P('lungomare', 'Via al Mare', 466, 184);
    // periferia ovest e la sua collina
    P('giardini', 'Giardini di Ponente', 344, 140); P('pineta', 'Pineta della Collina dei Pini', 322, 156); P('collina_o', 'Collina dei Pini', 304, 140);
    P('bivacco_o', 'Bivacco dei Pini', 284, 132, { camp: 'bivacco' }); P('monolite', 'Il Monolite', 322, 142, { camp: 'monolite' }); P('campeggio_o', 'Spiazzo della collina', 262, 138, { camp: 'tende' }); P('sorgente', 'Sorgente gelata', 244, 157, { camp: 'sorgente', scoperta: true }); P('rudere_o', 'Casale diroccato dei Pini', 300, 110, { camp: 'rudere' }); P('carbonaia', 'Carbonaia', 336, 168, { camp: 'carbonaia' }); P('pozzo_o', 'Spiazzo dei taglialegna', 214, 132, { camp: 'legna' });
    // periferia est e la Collina Nera
    P('salita', 'Salita della Collina Nera', 470, 128); P('monte', 'Collina Nera', 504, 132); P('vetta', 'Cima della Collina Nera', 518, 134);
    P('belvedere', 'Belvedere', 494, 120); P('bivacco_e', 'Bivacco della Collina Nera', 486, 138, { camp: 'bivacco' }); P('campeggio_e', 'Spiazzo della Collina Nera', 528, 128, { camp: 'tende' });
    P('covo', 'Il covo sulla Collina Nera', 544, 140, { hidden: true }); P('ruderi', 'Ruderi della Collina Nera', 512, 160, { camp: 'rudere' }); P('osservatorio', 'Vecchia vedetta', 496, 108, { camp: 'vedetta' }); P('grotta', 'La grotta', 470, 150, { camp: 'grotta', hidden: true }); P('cava', 'Cava della Collina Nera', 530, 150);
    P('spiaggia', 'Spiaggia gelata', 512, 198); P('passeggiata', 'Passeggiata a mare', 492, 194); P('discarica', 'Discarica di levante', 548, 184);
    // il Muro e la Base
    P('muro', 'Il Muro', 548, yc(548), { gate: true }); P('varco', 'Varco del Muro', 562, yc(562));
    P('poligono', 'Poligono della Base', 588, 166); P('eliporto', 'Eliporto della Base', 632, 134); P('molo_cargo', 'Porto cargo', 664, 140);
    // la foresta
    P('macchia', 'Pineta dell\'altopiano', 200, 138); P('sentiero', 'Sentiero dei carbonai', 214, 156); P('radura', 'Radura del pastore', 176, 142);
    P('sugheri', 'Valle delle betulle', 202, 168); P('ovile', 'Ovile abbandonato', 176, 124); P('lago', 'Lago gelato', 182, 138);
    P('sangiacomo', 'San Giacomo', 205, 104); P('vigne', 'Vigne di San Giacomo', 208, 84); P('villaggio', 'Borgo dei Carbonai', 184, 190);
    P('oliveto', 'Uliveto delle terrazze', 262, 186); P('caletta', 'Caletta della fiumara', 215, 224);
    // il Monte Scuro: posti da scoprire girando attorno alla montagna (scoperta: compare la prima volta che ci arrivi)
    const SC = { scoperta: true };
    P('pizzo', 'Pizzo del Monte Scuro', 248, 143, { camp: 'croce', scoperta: true }); P('neviera', 'La neviera', 241, 135, { camp: 'neviera', scoperta: true });
    P('cascata', 'Cascata gelata', 235, 115, { camp: 'cascata', scoperta: true }); P('gola', 'Gola del Lupo', 225, 82, SC); P('ponte_diavolo', 'Ponte del Diavolo', 221, 97, SC);
    P('fiumara', 'Fiumara dei Carbonai', 224, 196, { camp: 'fiumara', scoperta: true }); P('dita', 'Le Cinque Dita', 279, 182, SC);
    P('paese_vecchio', 'Paese Vecchio', 298, 173, { camp: 'rudere', scoperta: true }); P('vecchio_2', 'Case crollate del Paese Vecchio', 302, 168, { camp: 'rudere' }); P('vecchio_3', 'La chiesa senza tetto', 294, 178, { camp: 'rudere' });
    P('calanchi', 'I Calanchi', 168, 82, SC); P('eremo', 'Eremo del Romito', 162, 160, { camp: 'eremo', scoperta: true, hidden: true });
    P('romito', 'Grotta del Romito', 234, 105, { scoperta: true, hidden: true }); P('altopiano', 'Altopiano del Lago', 196, 128, SC); P('passo', 'Passo dei Pini', 281, 136, SC);
    // la prateria
    // [isola] la testa di bosco e il Tavolato (coordinate nuove)
    PN('deserto', 'Prateria del Tavolato', 178, 196); PN('beduini', 'Accampamento dei beduini', 148, 176, { camp: 'beduini' }); PN('saline', 'Saline', 100, 314);
    PN('punta', 'Punta Scogli', 38, 222); PN('stazione_n', 'Stazione Nord: piazzale', 234, 76); PN('stazione_s', 'Stazione Sud: piazzale', 262, 328);
    PN('tavolato', 'Il Tavolato', 172, 186, SC); PN('canalone_e', 'Canalone di levante', footE[0], footE[1], SC); PN('canalone_o', 'Canalone di ponente', footO[0], footO[1], SC);
    PN('bosco_antico', 'Bosco Antico', 290, 150, { camp: 'legna', scoperta: true }); PN('campo_p', 'Campo partigiano', 98, 128, { camp: 'bivacco', hidden: true });
    FISHP.forEach(([id, name, x, y]) => PN(id, name, x, y)); PN('piazza_gov', 'Piazza del Governo', 919, 146);
    PN('spiaggia_lunga', 'Spiaggia Lunga', 330, SouthY(330) - 5); PN('memoria', 'Via della Memoria', 420, 194);
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
    B.forEach(b => { if (b.name && b.door && !b.barrack && !PLACES[b.id]) PLACES[b.id] = { id: b.id, name: b.name, tx: b.door[0], ty: b.door[1] }; });   // [isola] chi ha avuto la porta dopo
    B.forEach(b => { if (b.name && b.door && PLACES[b.id]) { PLACES[b.id].tx = b.door[0]; PLACES[b.id].ty = b.door[1]; } });
    Object.values(PLACES).forEach(p => { p.x = p.tx * TS + TS / 2; p.y = p.ty * TS + TS / 2; });
    // quote ai vertici dalle caselle (strade e edifici spianati): il terreno che si vede
    const vh = new Float32Array(VW * (GH + 1));
    for (let j = 0; j <= GH; j++) for (let i = 0; i <= GW; i++) {
      let s2 = 0, c = 0, wet = false, lk = false, made = false;
      for (const [a, b2] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]) { if (a < 0 || b2 < 0 || a >= GW || b2 >= GH) { wet = true; continue; } const k = b2 * GW + a; if (grid[k] === T.WATER) { if (zone[k] === Z.MARE) wet = true; else lk = true; continue; } if (grid[k] === T.QUAY || grid[k] === T.PIER) made = true; s2 += elev[k]; c++; }
      vh[j * VW + i] = lk ? (c ? Math.min(s2 / c, LAKE.h - .3) : LAKE.h - 1.8) : c ? (wet && !made ? Math.min(s2 / c, .5) : s2 / c) : -2.2;   // [costa] banchine e moli restano a filo fino al bordo (il muro lo fa la grafica)
    }

    // [inverno] il fianco della montagna si leviga e le strade corrono su un piano di posa: profilo dolce con pendenza massima,
    // sezione in piano con una scarpata morbida (più larga dove il dislivello è grande). Restano fermi pareti, muri a secco, edifici, acqua e moli.
    {
      const NV = VW * (GH + 1), hardV = new Uint8Array(NV), wetV = new Uint8Array(NV), touched = new Uint8Array(NV);
      for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) {
        const v = grid[ty * GW + tx]; if (!(v === T.CLIFF || v === T.BLD || v === T.WATER || v === T.PIER || v === T.SAND || v === T.FOUNT || v === T.QUAY)) continue;
        const wt = v === T.BLD || v === T.WATER || v === T.PIER || v === T.FOUNT || v === T.QUAY;
        for (let cy = 0; cy < 2; cy++) for (let cx = 0; cx < 2; cx++) { hardV[(ty + cy) * VW + tx + cx] = 1; if (wt) wetV[(ty + cy) * VW + tx + cx] = 1; }
      }
      // a) la roccia si addolcisce: poche passate di media pesata sui vertici liberi di quota (non sulla costa)
      for (let it = 0; it < 5; it++) { const H1 = vh.slice(); for (let j = 1; j < GH; j++) for (let i = 1; i < GW; i++) { const k = j * VW + i; if (hardV[k] || H1[k] < 2.5) continue; let sum = 0; for (let b2 = -1; b2 <= 1; b2++) for (let q = -1; q <= 1; q++) if (b2 || q) sum += H1[(j + b2) * VW + i + q]; vh[k] = H1[k] + (sum / 8 - H1[k]) * .55; } }
      // b) piano di posa delle strade (non quelle a griglia della città: lì pensa il blocco qui sotto)
      const sample0 = (x, y) => { const fx = Math.max(0, Math.min(GW - .001, x / TS)), fy = Math.max(0, Math.min(GH - .001, y / TS)), i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j; return (vh0[j * VW + i] * (1 - u) + vh0[j * VW + i + 1] * u) * (1 - v) + (vh0[(j + 1) * VW + i] * (1 - u) + vh0[(j + 1) * VW + i + 1] * u) * v; };
      const sampleVH = (x, y) => { const fx = Math.max(0, Math.min(GW - .001, x / TS)), fy = Math.max(0, Math.min(GH - .001, y / TS)), i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j; return (vh[j * VW + i] * (1 - u) + vh[j * VW + i + 1] * u) * (1 - v) + (vh[(j + 1) * VW + i] * (1 - u) + vh[(j + 1) * VW + i + 1] * u) * v; };
      // [isola] le strade sono opere: profilo con pendenza massima, quote uguali agli incroci (prima le costiere, poi le strade, poi i sentieri),
      // carreggiata in piano; a monte la roccia tagliata quasi a picco, a valle un muro di sostegno (o una scarpata bassa sugli sterrati);
      // dove lo scavo è profondo da tutte e due le parti, una galleria artificiale. Tagli e muri sono segnati in feat (1024 taglio, 16384 muro di sostegno).
      const PRI = rd => rd.kind === 'litoranea' ? 0 : rd.kind === 'strada' ? 1 : rd.kind === 'citta' ? 2 : 3;
      const RD = roads.filter(rd => !rd.rect && rd.pts && rd.pts.length >= 5).map((rd, k) => [rd, k]).sort((a, c) => PRI(a[0]) - PRI(c[0]) || a[1] - c[1]).map(q => q[0]);
      const vh0 = vh.slice();
      RD.forEach(rd => {
        const n = rd.pts.length, seg = [0]; for (let k = 1; k < n; k++) seg.push(Math.max(.5, dist(rd.pts[k - 1][0], rd.pts[k - 1][1], rd.pts[k][0], rd.pts[k][1])));
        let P = rd.prof ? rd.prof.slice() : rd.pts.map(([x, y]) => sampleVH(x, y));
        const blur = (A, r) => A.map((_, k) => { let sm = 0, c = 0; for (let q = -r; q <= r; q++) { sm += A[clamp(k + q, 0, n - 1)]; c++; } return sm / c; });
        for (let pass = 0; pass < 3; pass++) P = blur(P, rd.monte ? 5 : 4);
        rd._seg = seg; rd._P = P; rd._G = rd.traccia ? .2 : rd.kind === 'sterrato' ? (rd.trail ? .26 : rd.w <= 2 ? .42 : rd.w <= 3 ? .3 : .2) : .15;   // i sentieri a piedi possono essere ripidi (gradini), le piste no
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; rd.pts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }); rd._box = [x0, y0, x1, y1];
      });
      const done = [];
      RD.forEach(rd => {
        const n = rd.pts.length, P = rd._P, seg = rd._seg, pins = [], cross = [];
        // dove tocca una strada già sistemata (estremi e attraversamenti) prende la sua quota
        done.forEach(o => {
          const b = o._box, half = o.w / 2 + 2.5; if (rd._box[0] > b[2] + half || rd._box[2] < b[0] - half || rd._box[1] > b[3] + half || rd._box[3] < b[1] - half) return;
          // solo gli estremi e gli attraversamenti veri; se la quota è troppo diversa le due strade non si toccano (una passa sopra l'altra)
          const near0 = (x, y) => { let bd = half, bh = null; for (let j = 0; j < o.pts.length; j++) { const d = dist(o.pts[j][0], o.pts[j][1], x, y); if (d < bd) { bd = d; bh = o.h[j]; } } return bh; };
          [0, n - 1].forEach(k => { const bh = near0(rd.pts[k][0], rd.pts[k][1]); if (bh !== null) pins.push([k, bh]); });
          for (let k = 1; k < n - 2; k++) { const [ax, ay] = rd.pts[k], [bx, by] = rd.pts[k + 1]; if (Math.max(ax, bx) < b[0] || Math.min(ax, bx) > b[2] || Math.max(ay, by) < b[1] || Math.min(ay, by) > b[3]) continue;
            for (let j = 0; j < o.pts.length - 1; j++) { const [cx, cy] = o.pts[j], [ex, ey] = o.pts[j + 1], d1x = bx - ax, d1y = by - ay, d2x = ex - cx, d2y = ey - cy, den = d1x * d2y - d1y * d2x; if (Math.abs(den) < 1e-6) continue;
              const t = ((cx - ax) * d2y - (cy - ay) * d2x) / den, u = ((cx - ax) * d1y - (cy - ay) * d1x) / den; if (t < 0 || t > 1 || u < 0 || u > 1) continue;
              const bh = o.h[j] + (o.h[j + 1] - o.h[j]) * u; cross.push([k, bh]); } }
        });
        const G = rd._G, limit = (pin) => { for (let it = 0; it < 18; it++) {
          for (let k = 1; k < n; k++) { const m = G * seg[k]; P[k] = Math.max(P[k - 1] - m, Math.min(P[k - 1] + m, P[k])); }
          for (let k = n - 2; k >= 0; k--) { const m = G * seg[k + 1]; P[k] = Math.max(P[k + 1] - m, Math.min(P[k + 1] + m, P[k])); }
          for (let k = 0; k < n; k++) if (pin[k] === pin[k]) P[k] = pin[k]; } };
        { const p0 = new Float32Array(n).fill(NaN); pins.forEach(([k, h]) => { p0[k] = h; }); const keep = P.slice(); limit(p0);
          // un attraversamento vale solo se le due strade stanno davvero alla stessa quota (altrimenti una passa sopra l'altra)
          cross.forEach(([k, h]) => { if (Math.abs(h - P[k]) < 2.2) pins.push([k, h], [Math.min(n - 1, k + 1), h]); }); for (let k = 0; k < n; k++) P[k] = keep[k]; }
        const pin = new Float32Array(n).fill(NaN); pins.forEach(([k, h]) => { pin[k] = h; });
        // le quote fissate si raccordano: ogni punto fissato tira i vicini per 30 m
        if (pins.length) { const D = new Float32Array(n).fill(0), W = new Float32Array(n).fill(0);
          pins.forEach(([k0, h]) => { const dh = h - P[k0]; for (const sg of [-1, 1]) { let acc = 0; for (let k = k0; k >= 0 && k < n; k += sg) { if (k !== k0) acc += seg[sg > 0 ? k : k + 1]; const w = 1 - sstep(0, 30, acc); if (w <= 0) break; if (w > W[k]) { W[k] = w; D[k] = dh; } } } });
          for (let k = 0; k < n; k++) P[k] += D[k] * W[k]; }
        const ends = new Set([0, n - 1]);
        for (let round = 0; round < 4; round++) {
          const keep = P.slice(); limit(pin); let bad = false;
          for (let k = 1; k < n - 1; k++) if (pin[k] === pin[k] && !ends.has(k) && (Math.abs(P[k] - P[k - 1]) > G * seg[k] * 1.3 || Math.abs(P[k + 1] - P[k]) > G * seg[k + 1] * 1.3)) { pin[k] = NaN; bad = true; }
          if (!bad) break; for (let k = 0; k < n; k++) P[k] = keep[k];
        }
        rd.h = P.map(h => Math.max(.4, h)); done.push(rd);
      });
      const cutV = new Uint8Array(NV), wallV = new Uint8Array(NV), carrV = new Uint8Array(NV), carrN = [], TUN = []; CARR = carrV;
      RD.forEach(rd => {
        const n = rd.pts.length, P = rd.h, side = rd.kind === 'citta' || rd.kind === 'litoranea' ? 2 : 0, flat = rd.w / 2 + side + (rd.traccia ? .25 : .6), R = flat + (rd.traccia ? 6 : 12), best = new Map(), asph = rd.kind !== 'sterrato';
        for (let k = 0; k < n - 1; k++) {
          const [ax, ay] = rd.pts[k], [bx, by] = rd.pts[k + 1], L2 = (bx - ax) * (bx - ax) + (by - ay) * (by - ay) || 1;
          for (let j = Math.max(0, Math.floor((Math.min(ay, by) - R) / TS)); j <= Math.min(GH, Math.ceil((Math.max(ay, by) + R) / TS)); j++) for (let i = Math.max(0, Math.floor((Math.min(ax, bx) - R) / TS)); i <= Math.min(GW, Math.ceil((Math.max(ax, bx) + R) / TS)); i++) {
            const q = j * VW + i; if (wetV[q]) continue; const x = i * TS, y = j * TS, t = clamp(((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / L2, 0, 1), d = Math.hypot(x - ax - (bx - ax) * t, y - ay - (by - ay) * t);
            if (d > R || (hardV[q] && d > flat)) continue; const o = best.get(q); if (!o || d < o.d) best.set(q, { d, h: P[k] + (P[k + 1] - P[k]) * t });
          }
        }
        best.forEach((o, q) => {
          if (carrV[q]) return;   // la carreggiata di una strada più importante non si tocca più
          const dh = vh[q] - o.h; let b;
          if (o.d <= flat) { b = 1; carrN.push(q); }
          else if (dh > 0) { const run = .5 + dh * (asph ? .42 : .7); b = 1 - sstep(flat, flat + run, o.d); if (dh > 1.4 && o.d < flat + run + 1.5 && !rd.traccia) cutV[q] = 1; }       // scavo: roccia tagliata
          else { const fill = -dh; if (fill > 1.3 && asph) { b = o.d <= flat + .7 ? 1 : 0; if (o.d <= flat + 2.6) wallV[q] = 1; }                                       // rilevato alto: muro di sostegno
            else { const run = 1 + fill * 1.7; b = 1 - sstep(flat, flat + run, o.d); } }
          if (b > 0) { vh[q] += (o.h - vh[q]) * b; touched[q] = 1; }
        });
        carrN.forEach(q => { carrV[q] = 1; }); carrN.length = 0;
        // gallerie artificiali: dove il terreno di prima sta alto più di 6,5 m sopra la strada da tutte e due le parti per almeno 14 m
        if (asph) { let run = []; const flush = () => { if (run.length >= 7) TUN.push({ id: rd.id + '_g' + TUN.length, road: rd.id, name: 'Galleria ' + (rd.name.replace(/^(Strada|Via|Costiera|Raccordo) (del |della |dei |delle |di )?/, '') || rd.name), w: rd.w, pts: run.map(k => [rd.pts[k][0], rd.pts[k][1], P[k]]) }); run = []; };
          for (let k = 1; k < n - 1; k++) { const [ax, ay] = rd.pts[k - 1], [bx, by] = rd.pts[k + 1], L = dist(ax, ay, bx, by) || 1, nx = -(by - ay) / L, ny = (bx - ax) / L, [x, y] = rd.pts[k], dd = flat + 2.5;
            const hL = sample0(x + nx * dd, y + ny * dd), hR = sample0(x - nx * dd, y - ny * dd);
            if (Math.min(hL, hR) - P[k] > 6.5) run.push(k); else flush(); } flush(); }
      });
      // i bordi delle strade, per la grafica: 1 roccia tagliata, 2 salto (guardrail), 3 mare. Due valori per punto (sinistra, destra).
      RD.forEach(rd => {
        const n = rd.pts.length, side = rd.kind === 'citta' || rd.kind === 'litoranea' ? 2 : 0, dd = rd.w / 2 + side + 1.6; rd.edge = new Int8Array(n * 2);
        for (let k = 0; k < n; k++) { const a = rd.pts[Math.max(0, k - 1)], c = rd.pts[Math.min(n - 1, k + 1)], L = dist(a[0], a[1], c[0], c[1]) || 1, nx = -(c[1] - a[1]) / L, ny = (c[0] - a[0]) / L;
          [1, -1].forEach((sg, si) => { const x = rd.pts[k][0] + nx * dd * sg, y = rd.pts[k][1] + ny * dd * sg, tx = Math.floor(x / TS), ty = Math.floor(y / TS), x2 = rd.pts[k][0] + nx * (dd + 3) * sg, y2 = rd.pts[k][1] + ny * (dd + 3) * sg;
            const wet = (u, v) => { const i2 = Math.floor(v / TS) * GW + Math.floor(u / TS); return i2 >= 0 && i2 < N && grid[i2] === T.WATER && zone[i2] === Z.MARE; };
            const dh = sampleVH(x, y) - rd.h[k]; rd.edge[k * 2 + si] = wet(x, y) || wet(x2, y2) ? 3 : dh > 1.2 ? 1 : dh < -1.2 ? 2 : 0; }); }
      });
      TUNNELS.push(...TUN);
      // tagli e muri sulle caselle (solo grafica: la logica non cambia)
      for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) {
        const i = ty * GW + tx, k = ty * VW + tx, v = grid[i]; if (roadW[i] > 0 || v === T.BLD || v === T.WATER || v === T.PIER || v === T.QUAY) continue;
        const hs = [vh[k], vh[k + 1], vh[k + VW], vh[k + VW + 1]], rg = Math.max(...hs) - Math.min(...hs);
        if ((wallV[k] || wallV[k + 1] || wallV[k + VW] || wallV[k + VW + 1]) && rg > 1.1) feat[i] |= 16384;
        else if ((cutV[k] || cutV[k + 1] || cutV[k + VW] || cutV[k + VW + 1]) && rg > 1.2) feat[i] |= 1024;
      }
      for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) { const i = ty * GW + tx, v = grid[i]; if (v === T.BLD || v === T.WATER || v === T.PIER || v === T.SAND || v === T.CLIFF || v === T.QUAY || v === T.FOUNT) continue; const k = ty * VW + tx; if (!(touched[k] || touched[k + 1] || touched[k + VW] || touched[k + VW + 1])) continue; elev[i] = (vh[k] + vh[k + 1] + vh[k + VW] + vh[k + VW + 1]) / 4; }
    }

    // [strade1] incroci alla stessa quota e carreggiate davvero in piano. Le strade minori che finiscono su una maggiore prendono la
    // sua quota e si raccordano in 24 m (pendenza limitata); poi, dalla più importante alla meno, i vertici sotto la carreggiata (e sotto
    // il marciapiede delle vie di città) vanno alla quota della strada: niente buche di terreno né carreggiate che scendono in mare.
    // Chi è già stato spianato da una strada più importante non si tocca. La levigatura della città qui sotto rispetta questi vertici.
    {
      const NV = VW * (GH + 1), PRI = rd => rd.kind === 'litoranea' ? 0 : rd.kind === 'strada' ? 1 : rd.kind === 'citta' ? 2 : rd.kind === 'vicolo' ? 3 : 4;
      const RDS = roads.filter(rd => rd.h && rd.pts && rd.pts.length >= 2 && !rd.traccia && !(rd.kind === 'sterrato' && rd.w < 3)).sort((a, c) => PRI(a) - PRI(c));
      const near = (o, x, y) => { let bd = 1e9, bh = 0; for (let j = 0; j < o.pts.length - 1; j++) { const [ax, ay] = o.pts[j], [bx, by] = o.pts[j + 1], L2 = (bx - ax) ** 2 + (by - ay) ** 2 || 1, t = clamp(((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / L2, 0, 1), d = Math.hypot(ax + (bx - ax) * t - x, ay + (by - ay) * t - y); if (d < bd) { bd = d; bh = o.h[j] + (o.h[j + 1] - o.h[j]) * t; } } return [bd, bh]; };
      // 1) gli estremi delle minori sulla quota della maggiore
      RDS.forEach(rd => { const n = rd.pts.length;
        [0, n - 1].forEach(e => { const [x, y] = rd.pts[e]; let best = null;
          RDS.forEach(o => { if (o === rd || PRI(o) > PRI(rd)) return; const [d, h] = near(o, x, y); if (d < o.w / 2 + 1.5 && Math.abs(h - rd.h[e]) < 3 && (!best || PRI(o) < PRI(best[0]))) best = [o, h]; });
          if (!best) return; const o = best[0], oflat = o.w / 2 + (o.kind === 'citta' || o.kind === 'litoranea' ? 2 : 0) + .4, sg = e === 0 ? 1 : -1;
          // dentro la carreggiata (e il marciapiede) della maggiore: la sua quota, in piano
          let k = e, dh = 0; for (; k >= 0 && k < n; k += sg) { const [d, h] = near(o, rd.pts[k][0], rd.pts[k][1]); if (d > oflat) break; dh = h - rd.h[k]; rd.h[k] = h; }
          // poi ci si raccorda in 24 m, senza superare la pendenza della strada
          if (k === e) return; let acc = 0; const k0 = k;
          for (; k >= 0 && k < n; k += sg) { acc += Math.hypot(rd.pts[k][0] - rd.pts[k - sg][0], rd.pts[k][1] - rd.pts[k - sg][1]); const w = 1 - sstep(0, 24, acc); if (w <= 0) break; rd.h[k] += dh * w; }
          const Gm = rd.kind === 'vicolo' || rd.kind === 'sterrato' ? .22 : .13;
          for (k = k0; k >= 0 && k < n; k += sg) { const L = Math.hypot(rd.pts[k][0] - rd.pts[k - sg][0], rd.pts[k][1] - rd.pts[k - sg][1]), a = rd.h[k - sg], h = clamp(rd.h[k], a - Gm * L, a + Gm * L); if (Math.abs(h - rd.h[k]) < .005 && acc > 30) break; rd.h[k] = h; } }); });
      // 2) carreggiate (e marciapiedi delle vie di città) in piano, la più importante vince
      const own = new Int8Array(NV).fill(-1), setH = new Float32Array(NV), dmin = new Float32Array(NV).fill(1e9);
      const fixed = new Uint8Array(NV); for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) { const v = grid[ty * GW + tx]; if (v === T.BLD || v === T.PIER || v === T.FOUNT || v === T.CLIFF) for (let cy = 0; cy < 2; cy++) for (let cx = 0; cx < 2; cx++) fixed[(ty + cy) * VW + tx + cx] = 1; }
      RDS.forEach(rd => { const p = PRI(rd), side = rd.kind === 'citta' || rd.kind === 'litoranea' ? 2 : 0, flat = rd.w / 2 + side + .2, P = rd.pts, n = P.length;
        for (let k = 0; k < n - 1; k++) { const [ax, ay] = P[k], [bx, by] = P[k + 1], L2 = (bx - ax) ** 2 + (by - ay) ** 2 || 1;
          for (let j = Math.max(0, Math.floor((Math.min(ay, by) - flat) / TS)); j <= Math.min(GH, Math.ceil((Math.max(ay, by) + flat) / TS)); j++) for (let i = Math.max(0, Math.floor((Math.min(ax, bx) - flat) / TS)); i <= Math.min(GW, Math.ceil((Math.max(ax, bx) + flat) / TS)); i++) {
            const q = j * VW + i; if (fixed[q]) continue; const x = i * TS, y = j * TS, t = clamp(((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / L2, 0, 1), d = Math.hypot(x - ax - (bx - ax) * t, y - ay - (by - ay) * t);
            if (d > flat || (own[q] >= 0 && own[q] < p) || (own[q] === p && d >= dmin[q])) continue;
            own[q] = p; dmin[q] = d; setH[q] = rd.h[k] + (rd.h[k + 1] - rd.h[k]) * t; } } });
      let moved = 0; for (let q = 0; q < NV; q++) if (own[q] >= 0) { if (Math.abs(vh[q] - setH[q]) > .05) moved++; vh[q] = setH[q]; if (CARR) CARR[q] = 1; }
      for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) { const k = ty * VW + tx; if (own[k] < 0 && own[k + 1] < 0 && own[k + VW] < 0 && own[k + VW + 1] < 0) continue; const i = ty * GW + tx; if (grid[i] === T.BLD) continue; elev[i] = (vh[k] + vh[k + 1] + vh[k + VW] + vh[k + VW + 1]) / 4; }
      if (typeof process !== 'undefined' && process.env && process.env.STRADE_DBG) console.log('[strade1] vertici rimessi in piano', moved);
    }

    // [inverno] il terreno della città si livella: dove strade e marciapiedi salgono non ci sono più gradoni a spigolo vivo.
    // Si sfumano le quote dei vertici attorno alle caselle urbane (più forte vicino, sempre meno lontano) e si limita la pendenza;
    // restano fermi i vertici di edifici, acqua, moli e sabbia. Poi le quote delle caselle si riallineano ai vertici.
    {
      const NV = VW * (GH + 1), urb = new Uint8Array(NV), hold = new Uint8Array(NV), dd = new Uint8Array(NV).fill(99);
      const isU = v => v === T.VIA || v === T.WALK || v === T.COB || v === T.PIAZZA || v === T.QUAY || v === T.STAIRS;
      for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) {
        const v = grid[ty * GW + tx], u = isU(v) && zone[ty * GW + tx] === Z.CITTA, h = v === T.BLD || v === T.WATER || v === T.PIER || v === T.SAND || v === T.FOUNT;
        if (!u && !h) continue;
        for (let cy = 0; cy < 2; cy++) for (let cx = 0; cx < 2; cx++) { const k = (ty + cy) * VW + tx + cx; if (u) urb[k] = 1; if (h) hold[k] = 1; }
      }
      let fr = []; for (let k = 0; k < NV; k++) if (urb[k]) { dd[k] = 0; fr.push(k); }
      for (let step = 1; step <= 7 && fr.length; step++) { const nx = []; fr.forEach(k => { const i = k % VW, j = (k / VW) | 0; for (let b2 = -1; b2 <= 1; b2++) for (let a = -1; a <= 1; a++) { const ii = i + a, jj = j + b2; if (ii < 0 || jj < 0 || ii >= VW || jj > GH) continue; const q = jj * VW + ii; if (dd[q] > step) { dd[q] = step; nx.push(q); } } }); fr = nx; }
      const al = new Float32Array(NV); for (let k = 0; k < NV; k++) al[k] = hold[k] || (CARR && CARR[k]) ? 0 : Math.max(0, 1 - dd[k] / 7);   // [isola] le carreggiate restano in piano
      const H0 = vh.slice();
      for (let it = 0; it < 50; it++) for (let j = 1; j < GH; j++) for (let i = 1; i < GW; i++) {
        const k = j * VW + i, a = al[k]; if (!a) continue;
        let sum = 0; for (let b2 = -1; b2 <= 1; b2++) for (let q = -1; q <= 1; q++) if (b2 || q) sum += vh[(j + b2) * VW + i + q];
        vh[k] += (sum / 8 - vh[k]) * a * .6;
      }
      const S = .5;   // pendenza massima (m di salita per m di percorso): circa 26°
      for (let it = 0; it < 30; it++) for (let j = 1; j < GH; j++) for (let i = 1; i < GW; i++) {
        const k = j * VW + i; if (al[k] < .25) continue;
        let lo = -1e9, hi = 1e9;
        for (let b2 = -1; b2 <= 1; b2++) for (let q = -1; q <= 1; q++) { if (!b2 && !q) continue; const d = (b2 && q ? 1.414 : 1) * TS, h = vh[(j + b2) * VW + i + q]; lo = Math.max(lo, h - S * d); hi = Math.min(hi, h + S * d); }
        if (lo <= hi) vh[k] = Math.min(hi, Math.max(lo, vh[k]));
      }
      for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) { const i = ty * GW + tx, v = grid[i]; if (v === T.BLD || v === T.WATER || v === T.PIER || v === T.SAND) continue; if (!(urb[ty * VW + tx] || urb[ty * VW + tx + 1] || urb[(ty + 1) * VW + tx] || urb[(ty + 1) * VW + tx + 1] || dd[ty * VW + tx] < 7)) continue; elev[i] = (vh[ty * VW + tx] + vh[ty * VW + tx + 1] + vh[(ty + 1) * VW + tx] + vh[(ty + 1) * VW + tx + 1]) / 4; }
    }

    // ---------------- PARTENZE DEI VEICOLI E CORSIE ----------------
    const lanes = roads.filter(rd => rd.kind !== 'sterrato' && rd.kind !== 'vicolo').map(rd => ({ id: rd.id, w: rd.w, pts: rd.pts, closed: false }));
    // ponti sospesi (si camminano sopra, sotto si passa) e grotte naturali che attraversano la montagna (sottosuolo)
    const BRIDGES = [];   // [isola] la gola non c'è più
    BRIDGES.forEach(B => { const ta = [Math.floor(B.a[0] / TS), Math.floor(B.a[1] / TS)], tb = [Math.floor(B.b[0] / TS), Math.floor(B.b[1] / TS)]; B.h0 = elev[ta[1] * GW + ta[0]]; B.h1 = elev[tb[1] * GW + tb[0]]; });
    const CAVES0 = [
      // la Grotta del Romito: si entra dal fondo della gola, sale sotto il ciglio e sbuca in un pozzo vicino al sentiero; dentro, il toro inciso
      { id: 'romito', name: 'Grotta del Romito', mouth: 'imbocco', exit: 'pozzo', path: [[235.5, 105], [238.5, 104.5], [240.5, 101.5], [242.5, 98], [243, 94.5]], rooms: [[240, 102, 2.6, 2.4, 'toro']] },
      // l'Eremo del Romito: dalla cengia sulla scarpata si entra nella roccia; una scala nel pozzo porta sull'altopiano
      { id: 'eremo', name: 'Eremo del Romito', mouth: 'imbocco', exit: 'pozzo', path: [[162.5, 158.5], [165.5, 158.5], [168.5, 156.5], [171.5, 154], [174.5, 152.5]], rooms: [[166.5, 159, 2.6, 2.4, 'eremo']] },
    ];
    const CAVES = CAVES0.map(c => Object.assign({}, c, { path: c.path.map(q => [xn(q[0]), q[1]]), rooms: c.rooms.map(q => [xn(q[0])].concat(q.slice(1))) }));
    return { eco, ECO, monte, MF, feat, BRIDGES, CAVES, WALL, HILLS, VILLAGES: VILLAGES.map(q => [xn(q[0])].concat(q.slice(1))), districtAt: DistrictAt, yc: Yc, northY: NorthY, southY: SouthY, onLand: OnLand, inland: Inland, LAKE,
      DXF, DXC, XF, XG, XC, XE, xo, xn, SEA, COSTA, coastKind, HEAD, TAV, CANALI, GOV, BF, bosco, RING, TUNNELS, tavR, canHalf, CAN0, CAN1, canFloor, TS, GW, GH, SIZE, SX, SY, T, Z, ZNAME, grid, zone, elev, velev, vh, VW, reach, bIndex, roadW, roads, lanes, BUILDINGS: B, PLACES, zoneAt, rawElev, CX, CY };
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
  W.hash2 = hash2; W.fbm = fbm; W.rng = rng; W.monte = monte; W.MF = MF;
  return W;
})();
if (typeof module !== 'undefined') module.exports = World;
