/* Porto Vecchio — il mondo: una lingua di terra d'inverno, da ovest a est.
   Prateria dei beduini → foresta coi villaggi → periferia ovest con la sua collina → centro (tutta la larghezza)
   → periferia est con la collina → il Muro → la Base della Tutela → il porto cargo e militare.
   Genera (sempre uguale, da un seme fisso) costa, quote, zone, strade, isolati, edifici con nome,
   luoghi, vegetazione e punti di partenza dei veicoli. Nessuna grafica: la usano motore e render.
   Coordinate in metri: x verso est, y verso sud. Una casella = 2 m. */
var World = (function () {
  'use strict';
  const TS = 2, SX = 680, SY = 280, SIZE = SX, GW = SX / TS, GH = SY / TS, CX = 340, CY = 140;
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
  const districtAt = x => { let d = DISTR[0][1]; for (const [a, n] of DISTR) if (x >= a) d = n; return d; };
  const WALLX = 556;                                   // il Muro: tutta la larghezza dell'isola, un solo varco
  // le due colline delle periferie: boscose, coi bivacchi; finiscono nella periferia, non toccano la foresta né il centro
  // la dorsale: come l'Appennino taglia l'Italia, corre lungo la mezzeria tra le due costiere.
  // Nasce dalla foresta, si abbassa e si apre nel centro, risale nella periferia est fino al Muro.
  // a, b: dove comincia e finisce; up, dn: quanto è lunga la salita e la discesa; w: mezza larghezza in cima
  const HILLS = [{ id: 'o', a: 214, b: 386, up: 46, dn: 46, w: 40 }, { id: 'e', a: 436, b: 562, up: 36, dn: 4, w: 40 }];
  const ridgeT = (h, x) => x <= h.a || x >= h.b ? 0 : Math.min(sstep(h.a, h.a + h.up, x), 1 - sstep(h.b - h.dn, h.b, x));
  const hillQ = (x, y) => { let q = 9; for (const h of HILLS) { const t = ridgeT(h, x); if (t <= .02) continue; const hw2 = h.w * (.35 + .65 * t); const v = ((y - yc(x) - 6 * Math.sin(x / 23)) / hw2) ** 2 + (fbm(x / 26, y / 26, 31, 3) - .5) * .9 + (1 - t) * .6; q = Math.min(q, v); } return q; };
  const ridgeH = x => { let m = 0; for (const h of HILLS) m = Math.max(m, ridgeT(h, x)); return m; };

  // ---------------- ZONE ----------------
  function zoneAt(x, y) {
    if (!onLand(x, y)) return Z.MARE;
    const d = districtAt(x);
    if (d === 'prateria') return Z.DESERTO;
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
  const CREST = [[146, 0], [156, 2], [163, 9], [168, 15.5], [184, 16], [212, 16.6], [226, 21], [238, 27], [248, 30], [258, 26.5], [270, 19], [281, 14.2], [294, 18.5], [306, 21], [318, 17.5], [334, 9], [350, 3.5], [364, .4]];
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
  function monte0(x, y) {
    let f = 0;
    if (x < 140 || x > 380 || !onLand(x, y)) return { h: .4, f };
    const cy = crestY(x), dy = y - cy, side = dy < 0 ? -1 : 1;
    const shore = side < 0 ? northY(x) : southY(x), room = Math.abs(shore - cy) - 9;   // spazio fino alla riva
    const t = clamp(Math.abs(dy) / Math.max(10, room), 0, 1.2);
    const Hc = interp(CREST, x);
    // profilo trasversale: fianchi pieni in alto, ripidi verso il mare
    let prof = t >= 1 ? 0 : 1 - Math.pow(t, 1.9);
    // l'altopiano: tavolato piatto che finisce con un ciglio netto
    const qa = inAlto(x, y), alto = 1 - sstep(.86, 1.02, qa);
    // valloni e speroni sui fianchi (scendono verso il mare, cioè lungo y)
    const mid = t * (1 - t) * 4;
    // valloni: uno ogni 30-40 m lungo la cresta, scendono serpeggiando verso il mare, profondi a caso
    const ph = x / 33 + (fbm(x / 40, y / 22, 301, 2) - .5) * 1.6 + side * .37, vi = Math.floor(ph + .5), rv = Math.abs(ph - vi) * 2;
    const vallone = (1 - sstep(0, .3, rv)) * mid * (2 + hash2(vi, side, 302) * 4.5);
    const sperone = (fbm(x / 26, y / 26, 303, 3) - .5) * 6 * mid;
    const crag = (fbm(x / 12, y / 12, 304, 2) - .5) * .7 * sstep(.3, .9, prof);
    const hs = Hc * prof;
    let h = hs + sperone - vallone + crag;
    // [inverno] creste e costoloni che serpeggiano (rumore a creste con la mappa deformata): il fianco non è più una pendenza liscia uguale ovunque
    { const mm = sstep(3, 12, h) * (1 - alto * .85), wx = x + (fbm(x / 46, y / 46, 321, 2) - .5) * 30, wy = y + (fbm(x / 46 + 7, y / 46 + 3, 322, 2) - .5) * 30;
      const rid = 1 - Math.abs(fbm(wx / 34, wy / 24, 323, 3) * 2 - 1), rid2 = 1 - Math.abs(fbm(wx / 15, wy / 11, 324, 2) * 2 - 1);
      h += ((Math.pow(rid, 2.2) - .32) * 6.5 + (Math.pow(rid2, 2) - .35) * 1.6) * mm * sstep(.12, .6, prof); }
    if (alto > 0) { const top = 16 + (fbm(x / 18, y / 18, 305, 2) - .5) * 1.4; h = lerp(h, Math.max(h, top), alto); if (alto > .5) f |= MF.ALTO; }
    // la scarpata ovest dell'altopiano: un gradino di roccia sopra la prateria
    // il Pizzo: una cupola rocciosa
    const dp = dist(x, y, PIZZO[0], PIZZO[1]); if (dp < 16) { h = Math.max(h, 30 - dp * dp * .035); if (dp < 6) f |= MF.CIMA; }
    // sulla riva la montagna si tuffa: resta una striscia bassa per la costiera
    const inl = inland(x, y); h = .4 + (h - .4) * sstep(7, 26, inl);
    // calanchi: argilla grigia a creste fitte, tra l'altopiano e la prateria a nord-ovest
    const cal = sstep(0, 1, 1 - Math.hypot((x - 163) / 17, (y - 86) / 26)) * sstep(6, 14, inl);
    if (cal > 0) { const ph = (x * .62 + y * .78) / 2.3 + fbm(x / 11, y / 11, 306, 2) * 5, cr = 1 - Math.abs(Math.sin(ph)); h = Math.max(h, .4 + cal * (2 + 4.2 * Math.pow(cr, 3) + fbm(x / 9, y / 9, 307, 2) * 2)); if (cal > .25) f |= MF.CAL; }
    // la gola: pareti a picco, fondo stretto che scende a salti
    const g = near(GOLA, x, y, 14);
    if (g) {
      const s = g.s, floor = s < gHead ? 22 : .4 + 11.4 * Math.pow(1 - (s - gHead) / (1 - gHead), 1.35), wf = 2.4 + 2 * s;
      const cut = floor + Math.max(0, g.d - wf) * 7;
      if (cut < h) { h = cut; if (g.d < wf + .6 && s >= gHead) f |= MF.GOLA; }
    }
    // la fiumara: letto di ghiaia largo e piatto, sponde ripide
    const fm = near(FIUM, x, y, 30);
    if (fm) {
      const s = fm.s, bed = .5 + 13 * Math.pow(1 - s, 1.7), w = 2.5 + 11 * Math.pow(s, .8), bank = bed + Math.max(0, fm.d - w) * 1.25;
      if (bank < h) { h = bank; if (fm.d < w + .5) f |= MF.FIUM; }
      if (fm.d < w) h = bed + (fbm(x / 5, y / 5, 308, 2) - .5) * .35;
    }
    // terrazze: il fianco tagliato a gradini da muri a secco
    for (const q of TERRAZZE) {
      if (x < q.x0 - 6 || x > q.x1 + 6 || (q.y0 && (y < q.y0 - 6 || y > q.y1 + 6)) || side !== q.side || (f & (MF.FIUM | MF.GOLA))) continue;
      const k = sstep(q.x0 - 6, q.x0, x) * (1 - sstep(q.x1, q.x1 + 6, x)) * (q.y0 ? sstep(q.y0 - 6, q.y0, y) * (1 - sstep(q.y1, q.y1 + 6, y)) : 1);
      if (k < .5 || h < q.h0 || h > q.h1) continue;
      const step = 2, hq = Math.floor((hs * .7 + h * .3 - q.h0) / step) * step + q.h0 + .15 + (fbm(x / 6, y / 6, 310, 2) - .5) * .3; h = lerp(h, hq, k); f |= MF.TERR;
    }
    // borghi arroccati: un ripiano sullo sperone, il bordo cade a picco
    for (const id in BORGHI) { const [bx, by, br0, bh] = BORGHI[id], br = br0 * (.8 + fbm(Math.atan2(y - by, x - bx) * 1.3 + 9, br0, 311, 2) * .45), d = dist(x, y, bx, by); if (d < br + 4) { const k = 1 - sstep(br, br + 4, d); h = lerp(h, bh, k); if (d < br) f |= MF.BORGO; } }
    // le Cinque Dita: guglie di arenaria rossa
    for (const [gx, gy, gr, gh] of DITA) { const d = dist(x, y, gx, gy); if (d < gr) { const k = 1 - sstep(gr * .45, gr, d); h = Math.max(h, h + gh * k * (1 + (fbm(x / 2, y / 2, 309, 2) - .5) * .3)); f |= MF.DITA; } }
    return { h: Math.max(.4, h), f };
  }

  function rawElev(x, y) {
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
    // prateria: le stazioni di estrazione e la Punta
    ['miniera', 'Stazione di estrazione Nord', 6, 4, 2, 11, [86, 82], { warehouse: true, station: true }],
    ['stazione2', 'Stazione di estrazione Sud', 6, 4, 2, 11, [100, 202], { warehouse: true, station: true }],
    ['salinaio', 'Casa del salinaio', 4, 4, 2, 4, [66, 196], {}],
    ['faro', 'Faro di Punta Scogli', 3, 3, 7, 9, [24, 144], { lighthouse: true }],
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
      const inl = inland(x, y);
      let v = T.GRASS;
      if (z === Z.DESERTO) v = fbm(x / 30, y / 30, 71, 2) > .62 ? T.SHRUB : fbm(x / 60, y / 60, 72, 2) > .58 ? T.FIELD : T.GRASS;
      else if (z === Z.MONTE) v = fbm(x / 16, y / 16, 52, 2) > .68 ? T.ROCK : fbm(x / 14, y / 14, 51, 2) > .4 ? T.TREE : T.SHRUB;
      else if (z === Z.MACCHIA) v = fbm(x / 14, y / 14, 61, 3) > .36 ? T.TREE : T.SHRUB;
      else if (z === Z.CAMPAGNA) v = fbm(x / 40, y / 40, 71, 2) > .5 ? T.FIELD : T.GRASS;
      else if (z === Z.CITTA) v = T.COB;
      // riva: sabbia o scogli
      // il Monte Scuro: il bosco cambia con la quota (ulivi e lecci in basso, castagni e faggi spogli a mezza costa, pini larici sull'altopiano, roccia in cima)
      if (x > 140 && x < 380 && z !== Z.CITTA) {
        const M = monte(x, y), f = M.f, e = elev[i], h1 = hash2(tx, ty, 41); feat[i] = f;
        if (f & MF.FIUM) v = T.GRAVEL;
        else if (f & MF.GOLA) v = T.GRAVEL;
        else if (f & (MF.CIMA | MF.DITA)) v = T.ROCK;
        else if (f & MF.CAL) v = fbm(x / 9, y / 9, 62, 2) > .7 ? T.SHRUB : T.DIRT;
        else if (f & MF.BORGO) v = fbm(x / 12, y / 12, 63, 2) > .55 ? T.FIELD : T.GRASS;
        else if (f & MF.TERR) v = h1 < .26 ? T.TREE : h1 < .4 ? T.SHRUB : T.GRASS;
        else if (f & MF.ALTO) v = fbm(x / 13, y / 13, 64, 3) > .5 && h1 < .7 ? T.TREE : fbm(x / 20, y / 20, 65, 2) > .5 ? T.GRASS : T.SHRUB;
        else if (e > 25) v = fbm(x / 8, y / 8, 66, 2) > .58 ? T.ROCK : h1 < .12 ? T.TREE : T.GRASS;
        else if (e > 2) v = fbm(x / 15, y / 15, 67, 3) > .62 ? T.ROCK : fbm(x / 13, y / 13, 68, 3) > .46 && h1 < .72 ? T.TREE : h1 < .5 ? T.SHRUB : T.GRASS;
      }
      // ogni albero è una casella d'albero (si può abbattere): qualche albero isolato nei campi e in prateria
      if ((z === Z.CAMPAGNA && v === T.GRASS && hash2(tx, ty, 43) < .03) || (z === Z.DESERTO && v === T.GRASS && hash2(tx, ty, 44) < .012)) v = T.TREE;
      if (inl < 6) { const rocky = fbm(x / 20, y / 20, 81, 2) > .55 || z === Z.MONTE; v = rocky ? T.ROCK : T.SAND; if (!rocky && z !== Z.CITTA) zone[i] = Z.SPIAGGIA; }
      grid[i] = v;
    }
    // le pareti dei canyon sono roccia
    for (let ty = 1; ty < GH - 1; ty++) for (let tx = 1; tx < 80; tx++) { const i = ty * GW + tx; if (zone[i] !== Z.DESERTO || grid[i] === T.WATER) continue;
      let sl = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) sl = Math.max(sl, Math.abs(elev[i] - elev[(ty + dy) * GW + tx + dx])); if (sl > 1.1) grid[i] = T.ROCK; }
    // saline e lago
    const blob = (cx, cy, rx, ry, f) => { for (let ty = Math.floor((cy - ry) / TS); ty <= Math.ceil((cy + ry) / TS); ty++) for (let tx = Math.floor((cx - rx) / TS); tx <= Math.ceil((cx + rx) / TS); tx++) { if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) continue; const x = tx * TS + 1, y = ty * TS + 1, q = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + (fbm(x / 9, y / 9, 91, 2) - .5) * .6; if (q < 1) f(ty * GW + tx, q); } };
    blob(58, 214, 16, 9, i => { if (grid[i] !== T.WATER) grid[i] = T.SALT; });
    const LAKE = { x: 186, y: 150, rx: 13, ry: 9, h: 15.6 };    // il lago gelato dell'altopiano
    blob(LAKE.x, LAKE.y, LAKE.rx, LAKE.ry, (i, q) => { grid[i] = q < .8 ? T.WATER : T.GRASS; elev[i] = q < .8 ? LAKE.h - 1.4 : Math.max(elev[i], LAKE.h + .2); });
    // strade
    const roads = [];
    const CITY = cityPlan(r);
    // le due costiere: dalla foresta al Muro, una per riva; si chiudono ai due capi
    const cn = coastal(-1, 156, 550), cs = coastal(1, 156, 550);
    roads.push({ id: 'nord', name: 'Costiera Nord', w: 8, kind: 'litoranea', pts: rounded(cn, 14, false) });
    roads.push({ id: 'litoranea', name: 'Costiera Sud', w: 8, kind: 'litoranea', pts: rounded(cs, 14, false) });
    roads.push({ id: 'raccordo_o', name: 'Raccordo di Ponente', w: 7, kind: 'strada', pts: rounded([cn[0], [150, 110], [148, yc(148)], [150, 190], cs[0]], 10, false) });
    roads.push({ id: 'raccordo_e', name: 'Raccordo del Muro', w: 8, kind: 'strada', pts: rounded([cn[cn.length - 1], [550, yc(550)], cs[cs.length - 1]], 10, false) });
    CITY.roads.forEach(rd => roads.push(rd));
    // viali diagonali che convergono sulla piazza: rompono la scacchiera
    [['diag_so', 'Viale della Stella', [[353, 178], [372, 152], [391, 127]]], ['diag_se', 'Viale del Faro', [[461, 178], [444, 152], [427, 127]]], ['diag_no', 'Viale dei Tigli', [[353, 92], [368, 100], [386, 110]]], ['diag_ne', 'Viale delle Gru', [[461, 92], [446, 100], [432, 110]]]].forEach(([id, name, pts]) => roads.push({ id, name, w: 7, kind: 'citta', pts: rounded(pts, 8, false) }));
    ROADS0.forEach(([id, name, w, kind, cp]) => roads.push({ id, name, w, kind, pts: rounded(rel(cp), w > 5 ? 16 : 8, false) }));
    // strade di montagna: le quote disegnate (quando ci sono) si interpolano lungo il percorso
    MONTI.forEach(([id, name, w, kind, cp]) => {
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
      const inl = inland(x, y);
      if (inl < 7 && x > 352 && x < 460 && y > yc(x)) { grid[i] = T.QUAY; elev[i] = .4; zone[i] = Z.CITTA; }
      if (inl < 7 && x > 590) { grid[i] = T.QUAY; elev[i] = .9; zone[i] = Z.CITTA; }
    }
    const sY = southY;
    pier(386, sY(386) - 2, 386, sY(386) + 20, 3); pier(404, sY(404) - 2, 404, sY(404) + 24, 3); pier(422, sY(422) - 2, 422, sY(422) + 20, 3);
    pier(370, sY(370) - 2, 374, sY(370) + 22, 5); pier(440, sY(440) - 2, 436, sY(440) + 22, 5);
    // porto cargo: due grandi moli verso est e una banchina lunga
    [606, 632].forEach(px => { pier(px, northY(px) + 2, px, northY(px) - 34, 9, .9); pier(px + 8, southY(px + 8) - 2, px + 8, southY(px + 8) + 34, 9, .9); }); pier(668, 140, 684, 140, 12, .9);
    // piazza San Rocco e fontana
    { const q = CITY.piazza; for (let ty = T2i(q[1]); ty < T2i(q[3]); ty++) for (let tx = T2i(q[0]); tx < T2i(q[2]); tx++) { const i = ty * GW + tx; if (grid[i] !== T.VIA && grid[i] !== T.WATER) { grid[i] = T.PIAZZA; roadW[i] = 0; } } }
    blob(409, 117, 3, 3, i => { grid[i] = T.FOUNT; });
    blob(205, 108, 7, 5, i => { if (grid[i] !== T.VIA) grid[i] = T.PIAZZA; });            // piazzetta di San Giacomo
    blob(598, 142, 10, 6, i => { if (grid[i] !== T.VIA) grid[i] = T.PIAZZA; });          // piazzale d'armi della Rocca
    blob(632, 134, 6, 6, i => { if (grid[i] !== T.VIA) grid[i] = T.PIAZZA; });       // eliporto
    blob(532, 152, 9, 7, i => { if (grid[i] !== T.VIA && grid[i] !== T.DIRT) grid[i] = T.ROCK; });   // la cava
    blob(548, 184, 8, 5, i => { if (grid[i] !== T.VIA) grid[i] = T.DIRT; });              // discarica
    blob(164, 102, 7, 5, i => { if (grid[i] !== T.VIA && grid[i] !== T.DIRT) grid[i] = T.GRASS; });   // radura dell'ovile
    blob(170, 130, 6, 5, i => { if (grid[i] === T.TREE) grid[i] = T.GRASS; });           // radura del pastore
    blob(588, 166, 12, 6, i => { if (grid[i] !== T.VIA) grid[i] = T.DIRT; });            // poligono della Base
    blob(86, 74, 9, 6, i => { if (grid[i] !== T.VIA) grid[i] = T.DIRT; });               // piazzale della Stazione Nord
    blob(100, 210, 9, 6, i => { if (grid[i] !== T.VIA) grid[i] = T.DIRT; });             // piazzale della Stazione Sud
    blob(58, 126, 14, 10, i => { if (grid[i] === T.SHRUB || grid[i] === T.FIELD) grid[i] = T.GRASS; }); // accampamento dei beduini
    // radure sulle colline: bivacchi, monolite, spiazzi da campeggio (alberi tolti, si vede chi c'è)
    [[284, 132, 5], [322, 142, 5], [260, 146, 4], [486, 138, 5], [528, 128, 4], [518, 134, 3], [544, 140, 3], [262, 154, 4], [300, 110, 5], [336, 168, 4], [496, 108, 4], [512, 160, 5], [470, 150, 3], [240, 128, 4]].forEach(([x, y, rr]) => blob(x, y, rr, rr, i => { if (grid[i] === T.TREE || grid[i] === T.SHRUB) grid[i] = T.GRASS; }));
    // ---- il Muro: dalla riva nord alla riva sud, un solo varco sul Viale della Tutela ----
    const WALL = { x: WALLX, tx: Math.floor(WALLX / TS), gate: [yc(WALLX) - 6, yc(WALLX) + 6], y0: northY(WALLX), y1: southY(WALLX), towers: [] };
    for (let ty = 0; ty < GH; ty++) {
      const y = ty * TS + 1; if (y < WALL.y0 - 2 || y > WALL.y1 + 2) continue;
      if (y > WALL.gate[0] && y < WALL.gate[1]) continue;
      for (const tx of [WALL.tx]) { const i = ty * GW + tx; if (grid[i] === T.WATER && zone[i] === Z.MARE) continue; grid[i] = T.BLD; roadW[i] = 0; reserved[i] = 1; }
    }
    for (let y = WALL.y0 + 8; y < WALL.y1 - 4; y += 26) if (Math.abs(y - yc(WALLX)) > 12) WALL.towers.push([WALLX, y]);
    WALL.towers.push([WALLX, WALL.gate[0] - 3], [WALLX, WALL.gate[1] + 3]);
    // ---- pareti di roccia e muri a secco: dove il terreno cade di colpo non si passa (le strade restano) ----
    for (let ty = 1; ty < GH - 1; ty++) for (let tx = 70; tx < 190; tx++) {
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
    const townPt = ([x, y]) => x > 348 && x < 464 && onLand(x, y);
    NAMED.forEach(([id, name, w, h, fl, style, at, ex]) => {
      let s = null;
      if (townPt(at) && !ex.kiosk && !ex.lighthouse && id !== 'cantiere') {
        let bd = 30;
        cityRoads.forEach(rd => [-1, 1].forEach(side => [[w, h], [h, w]].forEach(([a, c]) => frontage(rd, side, a, c).forEach(([x, y, ww, hh]) => {
          const d = dist((x + ww / 2) * TS, (y + hh / 2) * TS, at[0], at[1]); if (d < bd && free(x, y, ww, hh, 0)) { bd = d; s = [x, y, ww, hh]; }
        }))));
      }
      if (!s) { const q = site(at[0], at[1], w, h, 1); if (q) s = [q[0], q[1], w, h]; }
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
        for (let w = Math.min(len - u, 3 + Math.floor(r() * 4)); w >= 3 && !placed; w--) {
          const x = horiz ? q[0] + u : side < 0 ? fx - h + 1 : fx, y = horiz ? (side < 0 ? fy - h + 1 : fy) : q[1] + u;
          const bw = horiz ? w : h, bh = horiz ? h : w;
          if (!free(x, y, bw, bh, 0)) continue;
          stamp({ id: 'casa_' + (nH++), x, y, w: bw, h: bh, fl: dist(x, y, 204, 58) < 28 ? 4 + Math.floor(r() * 4) : 2 + Math.floor(r() * 4), style: CSTY[Math.floor(r() * CSTY.length)], house: true });
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
    const walkFront = (pts, rdw, extra0, side, wMin, wMax, hMin, hMax, rowGap, dens) => {
      const chunks = []; let cur = [];
      for (let k = 0; k < pts.length; k++) { if (cur.length && dist(cur[cur.length - 1][0], cur[cur.length - 1][1], pts[k][0], pts[k][1]) > 14) { chunks.push(cur); cur = []; } cur.push(pts[k]); }
      if (cur.length) chunks.push(cur);
      chunks.forEach(ch => {
        const P = []; for (let k = 0; k < ch.length - 1; k++) { const L = dist(ch[k][0], ch[k][1], ch[k + 1][0], ch[k + 1][1]); for (let u = 0; u < L; u += TS) P.push([ch[k][0] + (ch[k + 1][0] - ch[k][0]) * u / L, ch[k][1] + (ch[k + 1][1] - ch[k][1]) * u / L]); }
        let i = 2, lastEnd = -1e9, left = 2 + Math.floor(r() * 5), cOff = r() < .5 ? 0 : 2 * (1 + Math.floor(r() * 2));
        while (i < P.length - 3) {
          let w = wMin + Math.floor(r() * (wMax - wMin + 1)); const h = hMin + Math.floor(r() * (hMax - hMin + 1)), extra = extra0 + cOff + (r() < .2 ? 2 : 0);
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
            stamp({ id: 'casa_' + (nH++), x, y, w: bw, h: bh, fl: 2 + Math.floor(r() * 2), style: CSTY[Math.floor(r() * CSTY.length)], house: true });
            const gap = r() < rowGap ? 1 + Math.floor(r() * 2) : 0; lastEnd = (horiz ? x + bw : y + bh) + gap; placed = true; i += w + gap;
          }
          if (placed && --left <= 0) { const gp = 3 + Math.floor(r() * 7); lastEnd += gp; i += gp; left = 2 + Math.floor(r() * 5); cOff = r() < .5 ? 0 : 2 * (1 + Math.floor(r() * 2)); }
          if (!placed) i++;
        }
      });
    };
    roads.filter(rd => rd.id === 'nord' || rd.id === 'litoranea').forEach(rd => {
      const keep = rd.pts.filter(([x]) => (x > 250 && x < 346) || (x > 466 && x < 548)), ex0 = rd.kind === 'litoranea' ? 2 : 0;
      [-1, 1].forEach(side => { walkFront(keep, rd.w, ex0, side, 3, 6, 3, 6, .15, 1); walkFront(keep, rd.w, ex0 + 13, side, 3, 5, 3, 5, .3, .5); });
    });
    roads.filter(rd => /^diag_/.test(rd.id)).forEach(rd => [-1, 1].forEach(side => walkFront(rd.pts, rd.w, 0, side, 3, 5, 3, 5, .25, .8)));
    // grandi blocchi d'abitazione (chruščëvka) nelle periferie: 4 piani, cortile a U aperto verso la strada
    roads.filter(rd => rd.id === 'nord' || rd.id === 'litoranea').forEach(rd => {
      for (let k = 6; k < rd.pts.length - 6; k += 9) {
        const [ax, ay] = rd.pts[k]; if (!((ax > 254 && ax < 344) || (ax > 468 && ax < 546))) continue;
        const [bx, by] = rd.pts[k + 1], L = dist(ax, ay, bx, by) || 1, nx = -(by - ay) / L, ny = (bx - ax) / L;
        for (const side of [-1, 1]) {
          const w = 12, h = 5, off = rd.w / 2 + 4.5 + h * TS / 2, px = ax + nx * side * off, py = ay + ny * side * off;
          if (zone[Math.floor(py / TS) * GW + Math.floor(px / TS)] !== Z.CITTA) continue;
          const x = Math.floor(px / TS - w / 2), y = Math.floor(py / TS - h / 2);
          if (!free(x, y, w, h, 1)) continue;
          stamp({ id: 'casa_' + (nH++), x, y, w, h, fl: 4, style: 2, house: true, block: 'khrush' });
        }
      }
    });
    // villaggi della foresta e case sparse
    roads.filter(rd => rd.id === 'paese' || rd.id === 'villaggio').forEach(rd => along(rd, 3, 4, 6, 1, 2, [4, 5, 8], z => z === Z.CAMPAGNA || z === Z.MACCHIA));
    roads.filter(rd => rd.id === 'macchia').forEach(rd => along(rd, 12, 4, 5, 1, 2, [4, 5, 8], z => z === Z.CAMPAGNA));
    // casette di legno e capanni sparsi nella foresta e ai margini della prateria
    for (let k = 0; k < 22; k++) {
      const x = 40 + r() * 216, y = 50 + r() * 190; const z = zoneAt(x, y); if (z !== Z.CAMPAGNA && z !== Z.MACCHIA && z !== Z.DESERTO) continue;
      if (z === Z.DESERTO && x < 120) continue;          // la prateria è dei beduini: niente case
      const s = site(x, y, 4, 4, 2); if (!s || !flatOK(s[0], s[1], 4, 4, 1.4)) continue; stamp({ id: 'casa_' + (nH++), x: s[0], y: s[1], w: 4, h: 4, fl: 1, style: [4, 5, 8][k % 3], house: true, farm: true, wood: true });
    }
    // la Base: baracche in fila
    for (let k = 0; k < 6; k++) { const s = site(580 + (k % 3) * 13, 164 - (k > 2 ? 48 : 0), 6, 3, 1); if (s) stamp({ id: 'casa_' + (nH++), x: s[0], y: s[1], w: 6, h: 3, fl: 1, style: 10, military: true, barrack: true }); }
    // ---------------- ALTEZZE: un paese basso ----------------
    // quasi tutto a uno o due piani; poche eccezioni che si vedono da lontano
    const ALTI = { chiesa: 3, rocca: 5, faro: 7, miramare: 3, oceano: 4, stella: 3, santuario: 3, cultura: 3 };
    B.forEach(b => { b.fl = ALTI[b.id] || (b.block ? 4 : 0) || (b.warehouse || b.kiosk || b.farm ? 1 : Math.min(b.fl, hash2(b.x, b.y, 3) < .3 ? 1 : 2)); });

    // ---------------- A CHE SERVE OGNI EDIFICIO ----------------
    // ogni porta porta da qualche parte: case con il nome di chi ci abita, botteghe, uffici, palestre, il teatro, fabbriche
    const COGNOMI = ['Esposito', 'Russo', 'Ferrara', 'Greco', 'Marino', 'Rizzo', 'Lombardi', 'Gallo', 'Costa', 'Fontana', 'Conti', 'De Luca', 'Mancini', 'Caruso', 'Serra', 'Pinna', 'Sanna', 'Melis', 'Deiana', 'Murru', 'Piras', 'Loi', 'Cocco', 'Porcu', 'Fadda', 'Atzori', 'Mura', 'Lai', 'Usai', 'Carta'];
    const NOMI = ['Bruno', 'Tina', 'Gavino', 'Nello', 'Pina', 'Efisio', 'Rosaria', 'Totò', 'Lella', 'Mario'];
    const city = B.filter(b => !b.name && !b.military && !b.block && b.door && zone[b.y * GW + b.x] === Z.CITTA && b.x * TS > 262 && b.x * TS < 550).sort((a, c) => hash2(a.x, a.y, 11) - hash2(c.x, c.y, 11));
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


    // ---------------- LUOGHI ----------------
    const PLACES = {};
    const tileOf = (x, y) => [Math.floor(x / TS), Math.floor(y / TS)];
    const walkable = (tx, ty) => { const v = grid[ty * GW + tx]; return v !== T.BLD && v !== T.WATER && v !== T.FOUNT && v !== T.TREE && v !== T.CLIFF; };
    const nearWalk = (x, y) => { const [tx, ty] = tileOf(x, y); for (let rr = 0; rr < 12; rr++) for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === rr && walkable(tx + dx, ty + dy)) return [tx + dx, ty + dy]; return [tx, ty]; };
    B.forEach(b => { if (b.name && b.door && !b.barrack) PLACES[b.id] = { id: b.id, name: b.name, tx: b.door[0], ty: b.door[1] }; });
    const P = (id, name, x, y, ex) => { const [tx, ty] = nearWalk(x, y); PLACES[id] = Object.assign({ id, name, tx, ty, want: [x, y] }, ex || {}); };
    // centro
    P('piazza', 'Piazza San Rocco', 400, 117); P('fontana', 'Fontana di San Rocco', 413, 117); P('vico', 'Vicolo dei Lanternini', 382, 118);
    P('fiori', 'Banco dei fiori', 420, 122); P('piazzetta', 'Vico del Campo', 446, 130); P('caruggio', 'Caruggio dei Pescatori', 372, 152);
    P('calata', 'Calata del porto', 404, 186); P('molo', 'Molo dei pescatori', 386, sY(386) + 14); P('pontile', 'Pontile Est', 422, sY(422) + 14);
    P('marina', 'Marina del porto vecchio', 372, 190); P('lungomare', 'Via al Mare', 466, 184);
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
    P('deserto', 'Prateria', 110, 140); P('beduini', 'Accampamento dei beduini', 58, 126, { camp: 'beduini' }); P('saline', 'Saline', 58, 206);
    P('punta', 'Punta Scogli', 30, 144); P('stazione_n', 'Stazione Nord: piazzale', 86, 74); P('stazione_s', 'Stazione Sud: piazzale', 100, 210);
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

    // [inverno] il fianco della montagna si leviga e le strade corrono su un piano di posa: profilo dolce con pendenza massima,
    // sezione in piano con una scarpata morbida (più larga dove il dislivello è grande). Restano fermi pareti, muri a secco, edifici, acqua e moli.
    {
      const NV = VW * (GH + 1), hardV = new Uint8Array(NV), touched = new Uint8Array(NV);
      for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) {
        const v = grid[ty * GW + tx]; if (!(v === T.CLIFF || v === T.BLD || v === T.WATER || v === T.PIER || v === T.SAND || v === T.FOUNT || v === T.QUAY)) continue;
        for (let cy = 0; cy < 2; cy++) for (let cx = 0; cx < 2; cx++) hardV[(ty + cy) * VW + tx + cx] = 1;
      }
      // a) la roccia si addolcisce: poche passate di media pesata sui vertici liberi di quota (non sulla costa)
      for (let it = 0; it < 5; it++) { const H1 = vh.slice(); for (let j = 1; j < GH; j++) for (let i = 1; i < GW; i++) { const k = j * VW + i; if (hardV[k] || H1[k] < 2.5) continue; let sum = 0; for (let b2 = -1; b2 <= 1; b2++) for (let q = -1; q <= 1; q++) if (b2 || q) sum += H1[(j + b2) * VW + i + q]; vh[k] = H1[k] + (sum / 8 - H1[k]) * .55; } }
      // b) piano di posa delle strade (non quelle a griglia della città: lì pensa il blocco qui sotto)
      const sampleVH = (x, y) => { const fx = Math.max(0, Math.min(GW - .001, x / TS)), fy = Math.max(0, Math.min(GH - .001, y / TS)), i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j; return (vh[j * VW + i] * (1 - u) + vh[j * VW + i + 1] * u) * (1 - v) + (vh[(j + 1) * VW + i] * (1 - u) + vh[(j + 1) * VW + i + 1] * u) * v; };
      roads.forEach(rd => {
        if (rd.rect || !rd.pts || rd.pts.length < 5) return;
        const n = rd.pts.length, seg = [0]; for (let k = 1; k < n; k++) seg.push(Math.max(.5, dist(rd.pts[k - 1][0], rd.pts[k - 1][1], rd.pts[k][0], rd.pts[k][1])));
        let P = rd.prof ? rd.prof.slice() : rd.pts.map(([x, y]) => sampleVH(x, y));
        const blur = (A, r) => A.map((_, k) => { let sm = 0, c = 0; for (let q = -r; q <= r; q++) { sm += A[clamp(k + q, 0, n - 1)]; c++; } return sm / c; });
        for (let pass = 0; pass < 3; pass++) P = blur(P, rd.monte ? 5 : 4);
        const G = rd.kind === 'sterrato' ? .2 : .15;
        for (let it = 0; it < 14; it++) { for (let k = 1; k < n; k++) { const m = G * seg[k]; P[k] = Math.max(P[k - 1] - m, Math.min(P[k - 1] + m, P[k])); } for (let k = n - 2; k >= 0; k--) { const m = G * seg[k + 1]; P[k] = Math.max(P[k + 1] - m, Math.min(P[k + 1] + m, P[k])); } }
        rd.h = P.map(h => Math.max(.4, h));
        const flat = rd.w / 2 + .6, R = flat + 9, best = new Map();
        for (let k = 0; k < n - 1; k++) {
          const [ax, ay] = rd.pts[k], [bx, by] = rd.pts[k + 1], L2 = (bx - ax) * (bx - ax) + (by - ay) * (by - ay) || 1;
          for (let j = Math.max(0, Math.floor((Math.min(ay, by) - R) / TS)); j <= Math.min(GH, Math.ceil((Math.max(ay, by) + R) / TS)); j++) for (let i = Math.max(0, Math.floor((Math.min(ax, bx) - R) / TS)); i <= Math.min(GW, Math.ceil((Math.max(ax, bx) + R) / TS)); i++) {
            const q = j * VW + i; if (hardV[q]) continue; const x = i * TS, y = j * TS, t = clamp(((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / L2, 0, 1), d = Math.hypot(x - ax - (bx - ax) * t, y - ay - (by - ay) * t);
            if (d > R) continue; const o = best.get(q); if (!o || d < o.d) best.set(q, { d, h: P[k] + (P[k + 1] - P[k]) * t });
          }
        }
        best.forEach((o, q) => { const dh = Math.abs(vh[q] - o.h), emb = clamp(4 + dh * 3.2, 5, 14), b = o.d <= flat ? 1 : 1 - sstep(flat, flat + emb, o.d); if (b > 0) { vh[q] += (o.h - vh[q]) * b; touched[q] = 1; } });
      });
      for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) { const i = ty * GW + tx, v = grid[i]; if (v === T.BLD || v === T.WATER || v === T.PIER || v === T.SAND || v === T.CLIFF || v === T.QUAY || v === T.FOUNT) continue; const k = ty * VW + tx; if (!(touched[k] || touched[k + 1] || touched[k + VW] || touched[k + VW + 1])) continue; elev[i] = (vh[k] + vh[k + 1] + vh[k + VW] + vh[k + VW + 1]) / 4; }
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
      const al = new Float32Array(NV); for (let k = 0; k < NV; k++) al[k] = hold[k] ? 0 : Math.max(0, 1 - dd[k] / 7);
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
    const BRIDGES = [{ id: 'ponte_diavolo', name: 'Ponte del Diavolo', a: [220.5, 97.2], b: [240.5, 97.6], w: 1.6 }];
    BRIDGES.forEach(B => { const ta = [Math.floor(B.a[0] / TS), Math.floor(B.a[1] / TS)], tb = [Math.floor(B.b[0] / TS), Math.floor(B.b[1] / TS)]; B.h0 = elev[ta[1] * GW + ta[0]]; B.h1 = elev[tb[1] * GW + tb[0]]; });
    const CAVES = [
      // la Grotta del Romito: si entra dal fondo della gola, sale sotto il ciglio e sbuca in un pozzo vicino al sentiero; dentro, il toro inciso
      { id: 'romito', name: 'Grotta del Romito', mouth: 'imbocco', exit: 'pozzo', path: [[235.5, 105], [238.5, 104.5], [240.5, 101.5], [242.5, 98], [243, 94.5]], rooms: [[240, 102, 2.6, 2.4, 'toro']] },
      // l'Eremo del Romito: dalla cengia sulla scarpata si entra nella roccia; una scala nel pozzo porta sull'altopiano
      { id: 'eremo', name: 'Eremo del Romito', mouth: 'imbocco', exit: 'pozzo', path: [[162.5, 158.5], [165.5, 158.5], [168.5, 156.5], [171.5, 154], [174.5, 152.5]], rooms: [[166.5, 159, 2.6, 2.4, 'eremo']] },
    ];
    return { monte, MF, feat, BRIDGES, CAVES, WALL, HILLS, VILLAGES, districtAt, yc, northY, southY, onLand, LAKE, TS, GW, GH, SIZE, SX, SY, T, Z, ZNAME, grid, zone, elev, velev, vh, VW, reach, bIndex, roadW, roads, lanes, BUILDINGS: B, PLACES, zoneAt, rawElev, CX, CY };
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
