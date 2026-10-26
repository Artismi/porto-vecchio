/* Porto Vecchio — il mondo: un'isola d'inverno, da ovest a est.
   [isola] La testa di bosco quasi tonda col Tavolato in mezzo (si sale solo a piedi) e la Spiaggia Lunga a sud
   → il collo di foresta che si stringe come una tromba → il Monte Scuro coi villaggi → periferia ovest con la sua collina
   → il quartiere del governo → centro (tutta la larghezza) → periferia est con la collina → il Muro → la Base della Tutela → il porto cargo e militare.
   Genera (sempre uguale, da un seme fisso) costa, quote, zone, strade, isolati, edifici con nome,
   luoghi, vegetazione e punti di partenza dei veicoli. Nessuna grafica: la usano motore e render.
   Coordinate in metri: x verso est, y verso sud. Una casella = 2 m. */
// [città2] LA CITTÀ NUOVA (in prova): stesso modulo di world.js con la nuova urbanistica (scheletro a ventaglio dalla Porta della Rocca,
// borgo sulla collina, metropoli, case che seguono la strada). Il gioco la carica solo con ?cittanuova nell'indirizzo (index.src.html);
// node strumenti/pianta.js la usa con PV_CITTANUOVA=1. Quando è pronta prende il posto di world.js.
// [pianta] I LOTTI ORIENTATI: ogni casa (W.BUILDINGS) porta, oltre all'impronta a caselle (x, y, w, h: griglia, camminabilità, porte,
// PLACES), la sua scatola vera nel riferimento della casa:
//   b.cx, b.cy  il centro in metri, nel mondo finale (dopo expand)        — senza: ((x + w/2)·TS, (y + h/2)·TS)
//   b.lw, b.ld  larghezza (asse x locale, quello di w a rot 0) e profondità (asse locale di h), in metri  — senza: w·TS, h·TS
//   b.rot       la rotazione attorno a (cx, cy), radianti, come rotRec di render.js (makeRotationY(-rot) su x, z)
// b.door resta la casella davanti alla porta. Lungo una via storta i lotti si dividono nel riferimento della via: le facciate stanno sul filo
// senza entrare l'una nell'altra (girate attorno al centro della pianta a caselle si compenetravano, 366 coppie).
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
  // ================= [isola-ridotta] LA CAMPAGNA PIÙ CORTA =================
  // Il committente: «il gioco pesa molto, riduciamo la parte dell'isola con la vegetazione, metà – 2/3». La campagna a ovest del Monte
  // Scuro (la testa di bosco col Tavolato e il collo di foresta) si accorcia lungo l'asse dell'isola, verso la città: la testa diventa
  // più piccola (posti e forme in scala RID.s attorno al suo centro, anche in y), il collo si comprime in x (pendenza RID.k). Da RID.XB
  // in là (72 m prima del Monte, XF) la mappa è quella di prima al metro: il Monte, il governo, la città, il porto, la ferrovia; i 72 m
  // sono la distanza a cui arriva chi guarda la riva (c2Dist, 64 m) o i vicini (la costiera, le chiome), così neanche il bordo del Monte cambia.
  // Le forme e i posti della campagna sono scritti ancora nelle coordinate di prima («di disegno»): Px/Py li portano sulla mappa, Pxi torna
  // indietro (la riva di disegno si legge in Pxi(x) e si porta giù; le soglie in x di disegno si confrontano con Pxi(x)).
  const RID = { XA: 360, XB: XF - 72, s: .7, k: .3, Y0: 214, w0: 70, w1: 40 };   // XA: dove finisce la testa e comincia il collo (disegno); w0, w1: i raccordi delle pendenze
  { // la pendenza dx_mappa/dx_disegno: s nella testa, k nel collo, 1 da XB in là, coi raccordi morbidi (niente spigoli sulla riva)
    const X0 = -80, XB = RID.XB, n = XB - X0 + 1, sl = x => x >= XB ? 1 : x <= RID.XA - RID.w0 / 2 ? RID.s : x < RID.XA + RID.w0 / 2 ? RID.s + (RID.k - RID.s) * sstep(RID.XA - RID.w0 / 2, RID.XA + RID.w0 / 2, x) : x < XB - RID.w1 ? RID.k : RID.k + (1 - RID.k) * sstep(XB - RID.w1, XB, x);
    const T0 = new Float64Array(n); T0[n - 1] = XB; for (let i = n - 2; i >= 0; i--) { const x = X0 + i; T0[i] = T0[i + 1] - (sl(x) + sl(x + 1)) / 2; }
    RID.X0 = X0; RID.T = T0; RID.sl = sl; }
  const Px = x => { if (x >= RID.XB) return x; const u = x - RID.X0; if (u <= 0) return RID.T[0] + u * RID.s; const i = Math.floor(u), f = u - i; return RID.T[i] + (RID.T[i + 1] - RID.T[i]) * f; };
  const Pxi = m => { if (m >= RID.XB) return m; const T0 = RID.T; if (m <= T0[0]) return RID.X0 + (m - T0[0]) / RID.s; let a = 0, b = T0.length - 1; while (b - a > 1) { const c = (a + b) >> 1; if (T0[c] <= m) a = c; else b = c; } return RID.X0 + a + (m - T0[a]) / ((T0[a + 1] - T0[a]) || 1); };
  const sigY = x => x >= RID.XB ? 1 : x <= RID.XA ? RID.s : RID.s + (1 - RID.s) * sstep(RID.XA, RID.XB, x);   // in y la testa si stringe come in x; il collo torna alla larghezza vera
  const Py = (x, y) => RID.Y0 + sigY(x) * (y - RID.Y0);
  const PP = (x, y) => [Px(x), Py(x, y)];                       // un punto di disegno sulla mappa
  const HEADd = { x: 200, y: 214, r: 166 };                       // la testa di disegno (la riva si legge qui)
  const HEAD = { x: Px(200), y: 214, r: 166 * RID.s };            // la testa sulla mappa
  const nH = (x, sd) => 4.5 * (fbm(x / 26, sd, 9 + sd, 3) - .5) * 2;
  const gapK = x => sstep(XG - 6, XG + 10, x) * (1 - sstep(XC - 10, XC + 6, x));
  const headHalf = x => Math.sqrt(Math.max(0, HEADd.r * HEADd.r - (x - HEADd.x) * (x - HEADd.x)));
  // la testa è un cerchio vero; il collo è una fascia che si allarga verso il Monte Scuro; dove si incontrano, una curva morbida (la vita)
  const smin = (a, b, k) => { const h = clamp(.5 + .5 * (b - a) / k, 0, 1); return b + (a - b) * h - k * h * (1 - h); };
  const neckN = x => { const t = sstep(360, XF, x); return 112 + (northY(146) - 112) * t; };
  const neckS = x => { const t = sstep(360, XF, x); return 288 + (southY(146) - 288) * t; };
  // ================= [costa2] LA FORMA VERA DELLA COSTA =================
  // Il committente: «la forma dell'isola è regolare, finta, troppo dritta e simmetrica e rettangolare». La riva di prima era un cerchio
  // (la testa) più due rette (il collo) con un rumore leggero sopra. Ora ogni riva è la somma di tre cose:
  //  1. i SEGNI DISEGNATI (C2N, C2S): capi e golfi con nome, ognuno con centro, larghezza e quanto sporge (+) o rientra (−) in metri;
  //  2. un RUMORE A TRE SCALE con la x deformata (domain warp): baie larghe, punte di decine di metri, la frastagliatura fine;
  //     a tramontana forte e fitto (roccia), a mezzogiorno morbido (sabbia), quasi liscio lungo le spiagge;
  //  3. la PUNTA DI PONENTE: uno sperone di scogli che esce dalla testa verso ovest, coi faraglioni subito fuori.
  // La città (x ≥ 902, finale 1222) non si tocca: tutto si spegne fra 862 e 900.
  const C2X1 = 900;   // da qui a est la riva è quella di prima (la città, la Rocca)
  const C2STRADA = [[372, 488], [796, 886]];   // i tratti di costiera sul mare: [da x, a x] a tramontana e a mezzogiorno
  const C2N = [   // [centro, larghezza, sporgenza, nome] riva nord (tramontana): alta, di roccia, con le calette strette
    [52, 17, 15, 'Punta del Maestrale'], [100, 12, -18, 'Cala dei Gabbiani'], [150, 26, 16, 'Capo del Bosco'], [211, 8, -11, 'Cala Lupara'], [256, 19, 18, 'Capo di Tramontana'],
    [332, 12, -5, ''], [400, 25, 22, 'Punta del Corvo'], [455, 7, -11, 'Caletta del Corvo'], [624, 24, 23, 'Capo Rosso'], [669, 8, -10, 'Caletta Rossa'],
    [710, 17, 11, ''], [739, 9, -7, 'Cala di San Giacomo'], [790, 21, 14, 'Punta di San Giacomo'], [838, 7, -7, 'Caletta del Monaco']];
  const C2S = [   // riva sud (mezzogiorno): bassa, di sabbia, coi golfi larghi
    [66, 16, 20, 'Punta delle Capre'], [102, 9, -15, 'Cala dei Gigli'], [129, 14, 16, 'Punta della Salina'], [245, 58, -20, 'Spiaggia della Salina'], [336, 17, 17, 'Punta del Pino'],
    [505, 112, -40, 'Golfo delle Dune (la Spiaggia Lunga)'], [672, 21, 26, 'Capo della Fiumara'], [747, 6, -9, 'Foce della Fiumara'], [778, 12, 7, ''],
    [815, 11, -10, 'Spiaggetta del Gabbiano'], [856, 24, 30, 'Punta di Ponente (il braccio ovest del porto)']];
  const c2B = (x, L) => { let s = 0; for (const [c, w, a] of L) { const d = (x - c) / w; if (d > -4 && d < 4) s += a * Math.exp(-d * d); } return s; };
  const c2Taper = x => 1 - sstep(C2X1 - 32, C2X1, x);
  // [isola-ridotta] i segni della riva portati sulla mappa: il centro con Px, la larghezza con la scala del posto (nel collo non sotto 0,6:
  // i capi restano capi, non spilli), la sporgenza con la scala in y; i due tratti della costiera sul mare con Px (le spiagge lisce
  // confrontano le loro soglie di disegno con Pxi, in c2Liscio)
  // i segni di prima (C2N0, C2S0) restano per la riva da RID.XB in là: lì la riva è quella di prima al centimetro (le code dei golfi larghi,
  // come quello delle Dune, arrivano fin sotto il Monte); fra XB − 30 e XB le due somme si passano la mano
  const C2N0 = C2N.map(q => q.slice()), C2S0 = C2S.map(q => q.slice());
  { const sc = c => clamp((Px(c + 1) - Px(c - 1)) / 2, .6, 1), r1 = v => Math.round(v * 10) / 10;
    [C2N, C2S].forEach(L => L.forEach(q => { if (q[0] >= RID.XB) return; const k = sc(q[0]), sy = sigY(q[0]); q[0] = r1(Px(q[0])); q[1] = r1(q[1] * k); q[2] = r1(q[2] * sy); }));
    { const [a, b] = C2STRADA[0], c = Px((a + b) / 2), h = Math.max((Px(b) - Px(a)) / 2, 45); C2STRADA[0] = [r1(c - h), r1(c + h)]; } }   // la strada sul mare a tramontana resta lunga almeno 90 m (col muretto e la piazzola), centrata sotto la Punta del Corvo
  const c2Liscio = m => { const x = Pxi(m); return 1 - .8 * sstep(150, 175, x) * (1 - sstep(320, 336, x)) - .85 * sstep(356, 380, x) * (1 - sstep(640, 656, x)); };   // lungo le spiagge la riva è liscia   [isola-ridotta] soglie di disegno
  function c2Rumore(x, sd) {   // sd 2.1 nord, 5.3 sud
    const wx = x + 34 * (fbm(x / 95, sd, 700, 2) - .5), N = sd < 4, a = N ? 1 - .75 * sstep(C2STRADA[0][0], C2STRADA[0][0] + 16, x) * (1 - sstep(C2STRADA[0][1] - 16, C2STRADA[0][1], x)) : c2Liscio(x);   // sotto la strada sul mare la riva è un ciglio quasi dritto
    return ((N ? 5.5 : 3.2) * (fbm(wx / 52, sd * 3.7, 701, 3) - .5) * 2 + (N ? 2.8 : .9) * a * (fbm(wx / 14, sd * 5.1, 702, 2) - .5) * 2 + (N ? 1.1 : .2) * a * (fbm(wx / 4.6, sd, 703, 2) - .5) * 2);
  }
  // la Punta di Ponente: uno sperone verso ovest attorno a y 218, che si salda alla testa con un minimo morbido
  const PUNTA = { x0: 26, x1: 80, y: 220 };   // la punta finisce a x 26: i faraglioni (x 6-24) restano in mare, subito fuori
  const puntaHW = x => x <= PUNTA.x0 ? 0 : 19 * Math.sqrt(clamp((x - PUNTA.x0) / (PUNTA.x1 - PUNTA.x0), 0, 1)) * (1 + .25 * (fbm(x / 7, 3, 704, 2) - .5));
  const c2Bm = (x, L, L0) => x >= RID.XB ? c2B(x, L0) : x <= RID.XB - 30 ? c2B(x, L) : c2B(x, L) + (c2B(x, L0) - c2B(x, L)) * sstep(RID.XB - 30, RID.XB, x);   // [isola-ridotta]
  const c2Out = (x, N) => (N ? c2Bm(x, C2N, C2N0) + c2Rumore(x, 2.1) : c2Bm(x, C2S, C2S0) + c2Rumore(x, 5.3)) * c2Taper(x);   // quanto la riva esce verso il mare
  // [telefono] le due rive valgono per x: chi le chiede più volte nello stesso punto (i vertici, le caselle, la distanza dalla riva)
  // le ritrova senza rifare il rumore. Stessi numeri. La memoria si svuota da sola oltre le 200.000 voci
  const NYM = new Map(), SYM = new Map();
  function NorthY(x) { let v = NYM.get(x); if (v === undefined) { v = NorthY0(x); if (NYM.size > 200000) NYM.clear(); NYM.set(x, v); } return v; }
  function SouthY(x) { let v = SYM.get(x); if (v === undefined) { v = SouthY0(x); if (SYM.size > 200000) SYM.clear(); SYM.set(x, v); } return v; }
  // [isola-ridotta] a ovest del Monte la forma (la testa, il collo, le calette, la Punta) si legge nel disegno in Pxi(x) e si porta sulla
  // mappa con Py; i capi e i golfi con nome (C2N, C2S, già sulla mappa) e i rumori della riva si fanno sulla mappa, alla loro scala
  function NorthY0(m) {
    if (m >= XF) { const x = m, y0 = northY(xo(x)) + gapK(x) * nH(x, 2.1); return x >= C2X1 ? y0 : y0 - c2Out(x, true); }
    const x = Pxi(m), c = Math.abs(x - HEADd.x) < HEADd.r ? HEADd.y - headHalf(x) : 1e4;
    let y = Py(x, smin(c, x < 250 ? 1e4 : neckN(x), 34) + cove(x, 300, 11, 7) + cove(x, 520, 9, 5)) + nH(m, 2.1) * (1 - sstep(XF - 60, XF, m)) - c2Out(m, true);
    if (x > PUNTA.x0 && x < PUNTA.x1 + 30) y = smin(y, Py(x, PUNTA.y - puntaHW(x)), 8);
    return y;
  }
  function SouthY0(m) {
    if (m >= XF) { const x = m, y0 = southY(xo(x)) - gapK(x) * nH(x, 5.3); return x >= C2X1 ? y0 : y0 + c2Out(x, false); }
    const x = Pxi(m), c = Math.abs(x - HEADd.x) < HEADd.r ? HEADd.y + headHalf(x) : -1e4;
    let y = Py(x, -smin(-c, x < 250 ? 1e4 : -neckS(x), 46)) - nH(m, 5.3) * .45 * (1 - sstep(XF - 60, XF, m)) + c2Out(m, false);   // la Spiaggia Lunga: riva liscia
    if (x > PUNTA.x0 && x < PUNTA.x1 + 30) y = -smin(-y, -Py(x, PUNTA.y + puntaHW(x)), 8);
    return y;
  }
  // [costa2] la distanza vera dalla riva (non più quella in verticale): la riva nord e la sud campionate ogni metro, e per ogni punto
  // vicino alla riva la distanza dalla polilinea più vicina. Serve al terreno (la grafica ammorbidisce la riva con questa distanza: se
  // la distanza è sbagliata il terreno scende sotto il mare dentro la terra o resta alto in acqua) e alle fasce di sabbia e di roccia.
  const C2T = { x0: -40, x1: 1000, N: null, S: null };
  function c2Tab() { if (C2T.N) return; const n = C2T.x1 - C2T.x0 + 1; C2T.N = new Float32Array(n); C2T.S = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = C2T.x0 + i; C2T.N[i] = NorthY(x); C2T.S[i] = SouthY(x); } }
  function c2Dist(x, y, cap) {   // distanza (positiva) dalla riva più vicina, fino a cap
    c2Tab(); let best = cap * cap; const N = C2T.N, S = C2T.S, i0 = Math.max(0, Math.floor(x - cap - C2T.x0)), i1 = Math.min(N.length - 2, Math.ceil(x + cap - C2T.x0));
    // [telefono] gli stessi conti, nello stesso ordine (stesso risultato al bit), ma senza il vettore allocato a ogni segmento e senza
    // chiamate: era il primo peso del processore all'avvio (9 s su 110 nel container)
    for (let i = i0; i <= i1; i++) {
      const xa = C2T.x0 + i, dx = x - xa; if (dx * dx >= best && xa < x) continue;
      let ya = N[i], yb = N[i + 1];
      if (!(ya > 5e3 || yb > 5e3 || ya < -5e3 || yb < -5e3)) { const ey = yb - ya, L2 = 1 + ey * ey, t = Math.max(0, Math.min(1, (dx * 1 + (y - ya) * ey) / L2)), qx = dx - t, qy = y - ya - ey * t, d2 = qx * qx + qy * qy; if (d2 < best) best = d2; }
      ya = S[i]; yb = S[i + 1];
      if (!(ya > 5e3 || yb > 5e3 || ya < -5e3 || yb < -5e3)) { const ey = yb - ya, L2 = 1 + ey * ey, t = Math.max(0, Math.min(1, (dx * 1 + (y - ya) * ey) / L2)), qx = dx - t, qy = y - ya - ey * t, d2 = qx * qx + qy * qy; if (d2 < best) best = d2; }
    }
    return Math.sqrt(best);
  }
  // ================= [arcipelago] L'ARCIPELAGO TUTTO ATTORNO =================
  // Le isole stanno in coordinate «di progetto» (quelle dell'isola grande) e possono avere x e y negative: la mappa grande le
  // contiene (vedi expand()). Forme: ellisse (le isole mediterranee), cupola (i panettoni di calcare coperti di giungla, come a
  // Palau: fianchi a picco, un orlo di roccia e l'anello turchese della scogliera attorno), cresta (lunga e stretta), boomerang
  // (un arco; dentro, la baia riparata con la laguna). La riva ha il suo tipo per lato (kinds: [angolo, mezza ampiezza, tipo];
  // angolo 0 = verso l'asse dell'isola, π/2 = dall'altra parte; nei boomerang π/2 è il lato interno). Tipi: spiaggia, cala,
  // scogli, falesia, reef (roccia a picco con la scogliera bassa e turchese attorno).
  // use: 'vuota' (niente), 'baracche' (qualche capanno), 'villaggio' (baracche, pontile, barche), 'base' (la Tutela), 'tribu'.
  // veg: 'giungla' (fitta fino alla riva) o 'macchia' (pini, lentisco, palme sulla riva).
  const ISOLE = [
    // le isole mediterranee davanti al porto vecchio
    { id: 'palme', name: 'Isola delle Palme', x: 905, y: 322, rx: 64, ry: 31, rot: -.12, h: 11, top: [-.35, -.25], amp: .17, bay: [Math.PI / 2 + .35, .28, .28], seed: 1, def: 'scogli', kinds: [[Math.PI / 2, 1.05, 'spiaggia'], [-Math.PI / 2, .85, 'falesia'], [.05, .28, 'cala']], veg: 'macchia', use: 'baracche' },
    { id: 'torre', name: 'Isolotto della Torre', x: 1101, y: 306, rx: 23, ry: 17, rot: .4, h: 9, top: [.05, -.1], amp: .24, bay: [-Math.PI / 2 - .3, .3, .25], seed: 2, def: 'falesia', kinds: [[-Math.PI / 2 - .3, .5, 'cala'], [Math.PI * .75, .6, 'scogli']], veg: 'macchia' },
    { id: 'lunga', name: 'Isola Lunga', x: 1212, y: 357, rx: 60, ry: 12, rot: .22, h: 4.2, top: [.1, 0], amp: .1, seed: 3, def: 'spiaggia', kinds: [[Math.PI / 2 + .3, .45, 'scogli'], [Math.PI, .3, 'scogli']], veg: 'macchia' },
    { id: 'gabbiano', name: 'Scoglio del Gabbiano', x: 788, y: 302, rx: 10, ry: 8, rot: .6, h: 5, top: [0, 0], amp: .25, seed: 4, def: 'falesia', kinds: [], veg: 'macchia' },
    { id: 'fratello1', name: 'I Due Fratelli', x: 832, y: 384, rx: 9, ry: 7, rot: .2, h: 4.5, top: [0, 0], amp: .25, seed: 5, def: 'scogli', kinds: [], veg: 'macchia' },
    { id: 'fratello2', name: 'I Due Fratelli', x: 851, y: 371, rx: 6, ry: 5, rot: -.4, h: 3.5, top: [0, 0], amp: .25, seed: 6, def: 'scogli', kinds: [], veg: 'macchia' },
    { id: 'piatto', name: 'Scoglio Piatto', x: 1017, y: 386, rx: 9, ry: 5, rot: .1, h: 1.2, top: [0, 0], amp: .2, seed: 7, def: 'scogli', kinds: [[Math.PI / 2, .9, 'cala']], veg: 'macchia' },
    { id: 'relitto', name: 'Isola del Relitto', x: 1271, y: 286, rx: 14, ry: 10, rot: -.3, h: 4, top: [.2, 0], amp: .22, seed: 8, def: 'scogli', kinds: [[Math.PI, .9, 'cala']], veg: 'macchia' },
    // l'isola della tribù: la più grande, una montagna di giungla con una spiaggia sola, a sud
    { id: 'grande_sud', name: 'Isola Grande del Sud', x: 1060, y: 545, rx: 125, ry: 66, rot: .1, h: 30, dome: true, amp: .16, bay: [Math.PI / 2 - .5, .22, .16], seed: 21, def: 'reef', kinds: [[Math.PI / 2 + .25, .55, 'spiaggia'], [-Math.PI / 2 - .5, .3, 'cala']], veg: 'giungla', use: 'tribu' },
    // le basi della Tutela: il Presidio a levante, la batteria dei Cannoni a sud, la stazione radar dell'Isola Rossa a nord
    { id: 'presidio', name: 'Isola del Presidio', x: 1405, y: 55, rx: 52, ry: 38, rot: -.2, h: 12, top: [.2, .1], amp: .14, seed: 22, def: 'falesia', kinds: [[Math.PI, .75, 'cala']], veg: 'macchia', use: 'base' },
    { id: 'cannoni', name: 'Isola dei Cannoni', x: 560, y: 488, rx: 46, ry: 32, rot: .15, h: 16, top: [.1, .2], amp: .16, seed: 23, def: 'falesia', kinds: [[-Math.PI / 2, .6, 'cala']], veg: 'macchia', use: 'base' },
    { id: 'rossa', name: 'Isola Rossa', x: 160, y: -122, rx: 33, ry: 25, rot: .3, h: 18, top: [0, -.2], amp: .18, seed: 24, def: 'falesia', kinds: [[Math.PI / 2, .55, 'cala']], veg: 'macchia', use: 'base' },
    // i villaggi
    { id: 'lontani', name: 'Isola dei Pescatori Lontani', x: 1492, y: 332, rx: 46, ry: 28, rot: .3, h: 9, top: [.3, 0], amp: .16, seed: 25, def: 'scogli', kinds: [[Math.PI, .95, 'spiaggia']], veg: 'macchia', use: 'villaggio' },
    { id: 'santa_lucia', name: 'Isola di Santa Lucia', x: -152, y: 252, rx: 44, ry: 30, rot: -.4, h: 10, top: [-.3, 0], amp: .16, seed: 26, def: 'reef', kinds: [[0, .95, 'spiaggia']], veg: 'giungla', use: 'villaggio' },
    // i boomerang: la Falce a tramontana, la Mezzaluna a levante, il Gomito a mezzogiorno, la Vela a maestrale
    { id: 'falce', name: 'La Falce', arc: true, x: 470, y: 22, R: 72, span: 1.0, w: 13, rot: -Math.PI / 2, h: 15, amp: .18, seed: 31, def: 'reef', kinds: [[Math.PI / 2, 1.2, 'cala']], veg: 'giungla' },
    { id: 'mezzaluna', name: 'La Mezzaluna', arc: true, x: 1532, y: 214, R: 62, span: 1.05, w: 12, rot: 0, h: 14, amp: .18, seed: 32, def: 'reef', kinds: [[Math.PI / 2, 1.2, 'spiaggia']], veg: 'giungla' },
    { id: 'gomito', name: 'Il Gomito', arc: true, x: 330, y: 470, R: 56, span: .95, w: 12, rot: Math.PI / 2, h: 13, amp: .2, seed: 33, def: 'reef', kinds: [[Math.PI / 2, 1.2, 'cala']], veg: 'palmeto', tema: 'palmeto' },
    { id: 'vela', name: 'La Vela', arc: true, x: -110, y: -30, R: 82, span: .85, w: 11, rot: -Math.PI * .78, h: 16, amp: .2, seed: 34, def: 'falesia', kinds: [], veg: 'nuda', tema: 'nuda' },
    // le creste
    { id: 'dorsale', name: 'La Dorsale di Ponente', x: -232, y: 102, rx: 95, ry: 15, rot: 1.1, h: 19, dome: true, amp: .14, seed: 41, def: 'reef', kinds: [], veg: 'giungla' },
    { id: 'cresta', name: 'La Cresta', x: 832, y: -104, rx: 86, ry: 14, rot: -.12, h: 17, dome: true, amp: .14, seed: 42, def: 'reef', kinds: [[Math.PI / 2, .4, 'cala']], veg: 'macchia', tema: 'pini', grotta: true },
    { id: 'spina', name: 'La Spina', x: 1262, y: -84, rx: 62, ry: 12, rot: .45, h: 14, dome: true, amp: .14, seed: 43, def: 'falesia', kinds: [], veg: 'nuda', tema: 'uccelli', arco: true },
    { id: 'lama', name: 'La Lama', x: 742, y: 592, rx: 70, ry: 11, rot: -.2, h: 12, dome: true, amp: .14, seed: 44, def: 'reef', kinds: [[-Math.PI / 2, .4, 'spiaggia']], veg: 'palmeto', tema: 'palmeto' },
  ];
  // la laguna dietro l'Isola Lunga e la secca fra l'Isola delle Palme e lo Scoglio Piatto; nei boomerang, la laguna nella baia
  const LAGUNE = [{ x: 1196, y: 330, rx: 62, ry: 17, rot: .22, d: 1.3 }, { x: 990, y: 362, rx: 30, ry: 22, rot: .5, d: 1.8 }];
  // i panettoni sparsi a gruppi (come a Palau): cupole di giungla da 5 a 17 m di raggio, qualcuna con una caletta
  {
    const NOMI = ['il Panettone', 'il Cappello', 'la Tartaruga', 'il Fungo', 'lo Scoglio Verde', 'la Pagnotta', 'il Monaco', 'la Balena', 'il Dente', "l'Uovo", 'la Mitria', 'il Campanile', 'la Testuggine', 'il Pan di Zucchero', 'la Cupola', 'il Barile', 'la Chioccia', 'il Sasso Verde', 'la Lumaca', 'il Riccio', 'la Botte', 'il Cuscino', 'la Bombetta', 'il Ghiro', 'la Zucca', 'il Panciotto', 'la Bussola', 'il Tamburo', 'la Medusa', 'il Moro'];
    const CLU = [[600, -125, 7, 95], [1010, -150, 7, 80], [-205, -110, 7, 90], [-235, 452, 8, 100], [1505, 525, 7, 90], [700, 600, 5, 70], [1610, -80, 5, 60], [300, -165, 6, 80], [110, 540, 6, 80], [1340, 430, 5, 60], [-260, 300, 4, 60], [1640, 380, 3, 40]];
    const r = rng(777); let n = 0;
    const far = (x, y, rr) => { const H0 = 166, hx = 200, hy = 214; if (Math.hypot(x - hx, y - hy) < H0 + rr + 34) return false;
      if (x > 34 && x < 1300) { const nN = NorthY(x), sS = SouthY(x); if (y > nN - rr - 32 && y < sS + rr + 32) return false; }
      for (const [px, py, pr] of [[1053, 233, 95], [1250, 140, 155], [1013, 215, 85]]) if (Math.hypot(x - px, y - py) < pr + rr) return false;
      for (const I of ISOLE) { const R0 = I.arc ? I.R + I.w : Math.max(I.rx, I.ry); if (Math.hypot(x - I.x, y - I.y) < R0 + rr + 14) return false; }
      return x - rr > -305 && x + rr < 1645 && y - rr > -190 && y + rr < 630; };
    CLU.forEach(([cx, cy, k, sp]) => { for (let t = 0; t < k * 12 && k > 0; t++) {
      const a = r() * 6.283, d = Math.sqrt(r()) * sp, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d, rr = 6.5 + Math.pow(r(), 1.6) * 15;
      if (!far(x, y, rr)) continue; const id = 'panettone_' + (++n);
      // ogni panettone ha il suo carattere: giungla, palmeto, pini sul calcare, roccia nuda con le agavi, l'isola degli uccelli
      const tr = r(), tema = tr < .44 ? 'giungla' : tr < .6 ? 'palmeto' : tr < .75 ? 'pini' : tr < .89 ? 'nuda' : 'uccelli';
      ISOLE.push({ id, name: NOMI[(n - 1) % NOMI.length] + (n > NOMI.length ? ' II' : ''), x, y, rx: rr, ry: rr * (.72 + r() * .26), rot: r() * 3.14, h: Math.min(26, rr * (tema === 'nuda' || tema === 'uccelli' ? .8 : 1.15) + 2), dome: true, amp: .2, seed: 100 + n, def: tema === 'palmeto' ? 'cala' : 'reef', kinds: r() < .35 ? [[r() * 6.28 - 3.14, .45, 'cala']] : [], veg: tema === 'pini' ? 'macchia' : tema === 'uccelli' ? 'nuda' : tema, tema, small: rr < 9, arco: rr > 9 && r() < .22, grotta: rr > 10 && r() < .25 });
      k--; } });
  }
  // [isole2] dell'arcipelago restano due isole, le più belle: l'Isola delle Palme (piccola, davanti al porto) e l'Isola Grande
  // del Sud (la montagna di giungla della tribù). Il resto (basi, villaggi, boomerang, creste, panettoni) non si genera più:
  // meno terra da costruire e da disegnare, meno gente da muovere. Le definizioni restano qui sopra.
  { const KEEP = new Set(['palme', 'grande_sud']); const keep = ISOLE.filter(I => KEEP.has(I.id)); ISOLE.length = 0; ISOLE.push(...keep);
    LAGUNE.splice(0, 1); }   // la laguna dietro l'Isola Lunga
  let ISLES_ON = false;   // [arcipelago] durante la generazione dell'isola grande le isole non ci sono: le aggiunge expand() sulla mappa grande
  // [arcipelago] forme organiche: ogni isola è un corpo principale più alcuni lobi che ci si saldano sopra (come colline che si
  // fondono), su cui passa una deformazione a più scale: penisole, golfi, promontori; le creste serpeggiano.
  ISOLE.forEach(I => { if (I.arc) return; const r = rng(9100 + I.seed * 13), nL = I.small ? 1 + Math.floor(r() * 2) : 2 + Math.floor(r() * 3); I.lobes = [];
    for (let k = 0; k < nL; k++) { const a = r() * 6.283, dd = .45 + r() * .4, sc = .3 + r() * .32; I.lobes.push([Math.cos(a) * dd, Math.sin(a) * dd, sc, .6 + r() * .7, r() * 3.14]); }
    I.snake = I.rx > 2.6 * I.ry ? .9 + r() * .9 : 0; I.snakeF = 1 + r() * 1.6; });
  ISOLE.forEach(I => { I.c = Math.cos(I.rot); I.s = Math.sin(I.rot); I.R = I.arc ? I.R0 = I.R + I.w + 6 : Math.max(I.rx, I.ry) * 1.35; if (I.arc) { I.Rb = I.R0 - I.w - 6; LAGUNE.push({ x: I.x + Math.cos(I.rot) * I.Rb * .55, y: I.y + Math.sin(I.rot) * I.Rb * .55, rx: I.Rb * .5, ry: I.Rb * .62, rot: I.rot, d: 1.5 }); } });
  // indice a celle da 120 m: per ogni punto, solo le isole lì vicino
  const ISLE_BK = new Map(), bkK = (i, j) => i * 10007 + j;
  ISOLE.forEach(I => { const R = (I.arc ? I.R0 : I.R) + 60; for (let i = Math.floor((I.x - R) / 120); i <= Math.floor((I.x + R) / 120); i++) for (let j = Math.floor((I.y - R) / 120); j <= Math.floor((I.y + R) / 120); j++) { const k = bkK(i, j); if (!ISLE_BK.has(k)) ISLE_BK.set(k, []); ISLE_BK.get(k).push(I); } });
  // dove sta un punto rispetto a un'isola: d > 0 dentro (metri dalla riva, circa), d < 0 fuori; a: l'angolo che decide il tipo di riva; m: lo spessore
  function isleQ(I, x, y) {
    if (!ISLES_ON) return null;
    const dx = x - I.x, dy = y - I.y, RR = (I.arc ? I.R0 : I.R) * 1.4; if (Math.abs(dx) > RR + 60 || Math.abs(dy) > RR + 60) return null;
    const u = dx * I.c + dy * I.s, v = -dx * I.s + dy * I.c;
    if (I.arc) {   // il boomerang: distanza dall'arco di raggio Rb fra -span e +span, spessore che si assottiglia verso le punte
      const wu = u + (fbm(u / 26 + I.seed, v / 26, 670 + I.seed, 3) - .5) * 14, wv = v + (fbm(u / 26 - I.seed, v / 26 + 5, 671 + I.seed, 3) - .5) * 14;   // l'arco non è un cerchio
      const rho = Math.hypot(wu, wv), th = Math.atan2(wv, wu), tc = clamp(th, -I.span, I.span), Rb = I.Rb * (1 + .1 * Math.sin(tc * 2.3 + I.seed));
      const dd = Math.abs(th) <= I.span ? Math.abs(rho - Rb) : Math.hypot(u - Rb * Math.cos(tc), v - Rb * Math.sin(tc));
      const wob = 1 + I.amp * 1.6 * ((fbm(tc * 3.1 + I.seed * 7, (rho > Rb ? 1 : 0) + I.seed * 3, 600 + I.seed, 3) - .5) * 2.4) + .25 * Math.sin(tc * 5 + I.seed), w = I.w * (1 - .72 * Math.pow(tc / I.span, 2)) * wob;
      return { q: dd / Math.max(1, w), d: w - dd, a: rho < Rb ? Math.PI / 2 : -Math.PI / 2, u, v, m: Math.max(2, w), t: clamp((w - dd) / Math.max(1, w), 0, 1) };
    }
    const a = Math.atan2(v / I.ry, u / I.rx);
    // coordinate normalizzate (l'ellisse diventa il cerchio unitario), piegate (creste che serpeggiano) e deformate a due scale
    let nx = u / I.rx, ny = v / I.ry; if (I.snake) ny -= I.snake * .55 * Math.sin(nx * Math.PI * .55 * I.snakeF + I.seed);
    const W1 = .38, W2 = .15, W3 = .06, ox = (fbm(nx * 1.25 + I.seed * 3.1, ny * 1.25, 672 + I.seed, 3) - .5) * 2 * W1 + (fbm(nx * 3.4 - I.seed, ny * 3.4 + 2, 673 + I.seed, 2) - .5) * 2 * W2,
      oy = (fbm(nx * 1.25 - 7 + I.seed, ny * 1.25 + 3, 674 + I.seed, 3) - .5) * 2 * W1 + (fbm(nx * 3.4 + 5, ny * 3.4 - I.seed, 675 + I.seed, 2) - .5) * 2 * W2;
    const fine = (fbm(u / 5 + I.seed, v / 5, 676 + I.seed, 2) - .5) * 2 * W3 * 12 / Math.max(6, Math.min(I.rx, I.ry));   // la frastagliatura fine della roccia, a scala di metri
    nx += ox + fine; ny += oy - fine * .6;
    // il corpo e i lobi, uniti con un minimo morbido (si saldano senza spigolo)
    let qn = Math.hypot(nx, ny);
    for (const [lx, ly, ls, lst, lr] of I.lobes || []) { const ax = nx - lx, ay = ny - ly, cr = Math.cos(lr), sr = Math.sin(lr), bx = (ax * cr + ay * sr) / ls, by = (-ax * sr + ay * cr) / (ls * lst), ql = Math.hypot(bx, by) * .92 + .08 * ls;
      const kk = .28, hh = clamp(.5 + .5 * (ql - qn) / kk, 0, 1); qn = ql + (qn - ql) * hh - kk * hh * (1 - hh); }
    const wob = 1 + I.amp * ((fbm(Math.cos(a) * 1.6 + I.seed * 7, Math.sin(a) * 1.6 + I.seed * 3, 600 + I.seed, 3) - .5) * 2.4) + I.amp * .7 * ((fbm(Math.cos(a) * 4.2 + I.seed * 5, Math.sin(a) * 4.2 - I.seed, 640 + I.seed, 2) - .5) * 2) - (I.bay ? I.bay[2] * Math.exp(-Math.pow(Math.atan2(Math.sin(a - I.bay[0]), Math.cos(a - I.bay[0])) / I.bay[1], 2)) : 0);   // riva mossa a due scale, più la baia
    const q = qn / wob, m = Math.min(I.rx, I.ry) * wob;
    return { q, d: (1 - q) * m * (q < 1 ? 1 : Math.max(I.rx, I.ry) / Math.min(I.rx, I.ry) * .8), a, u, v, m, t: clamp(1 - q, 0, 1) };
  }
  // l'isola più vicina (o quella in cui si sta)
  function isleAt(x, y) { const L = ISLE_BK.get(bkK(Math.floor(x / 120), Math.floor(y / 120))); if (!L || !ISLES_ON) return null; let best = null, bd = -1e9; for (const I of L) { const q = isleQ(I, x, y); if (q && q.d > bd) { bd = q.d; best = { I, q }; } } return best; }
  const isleIn = (x, y) => { const b = isleAt(x, y); return b ? b.q.d : -1e9; };
  function isleKind(I, a) { let k = I.def, bw = 9; for (const [c, w, n] of I.kinds) { const d = Math.abs(Math.atan2(Math.sin(a - c), Math.cos(a - c))); if (d < w && d < bw) { bw = d; k = n; } } return k; }
  // la quota sull'isola. Ellisse: la riva bassa (larga dove c'è spiaggia), poi su verso la cima. Cupola, cresta e boomerang:
  // l'orlo sale a picco (o piano dalla spiaggia) e poi la cupola si arrotonda verso la cima
  function isleElev(I, q) {
    const k = isleKind(I, q.a), beachK = k === 'spiaggia' || k === 'cala', bump = (fbm(q.u / 13 + I.seed, q.v / 13, 610 + I.seed, 3) - .5) * 1.6 * sstep(2, 10, q.d);
    if (I.dome || I.arc) { const hD = Math.min(I.h, 2 + (I.arc ? I.w : Math.min(I.rx, I.ry)) * .42), t = clamp(q.d / (q.m * .8), 0, 1), rim = beachK ? sstep(3, 12, q.d) : sstep(0, 2.2, q.d), b0 = beachK ? .45 + Math.min(q.d, 10) * .035 : .9;
      return Math.max(.45, b0 + (Math.max(0, hD - b0) * Math.pow(sstep(0, 1, t), .7) + bump) * rim); }
    const m = Math.min(I.rx, I.ry), tu = q.u / I.rx - I.top[0], tv = q.v / I.ry - I.top[1];
    const t = clamp(1 - Math.hypot(tu, tv) / 1.15, 0, 1), rim = k === 'falesia' ? sstep(0, 3.5, q.d) : k === 'scogli' ? sstep(0, 7, q.d) : sstep(3, 16, q.d);
    const beach = beachK ? .45 + Math.min(q.d, 14) * .035 : .7 + Math.min(q.d, 4) * .35;
    return Math.max(.45, beach + (Math.max(0, (I.h - beach)) * Math.pow(t, 1.25) + bump) * rim * (m < 8 ? .8 : 1));
  }
  const OnLand0 = (x, y) => y > NorthY(x) && y < SouthY(x);
  const OnLand = (x, y) => OnLand0(x, y) || isleIn(x, y) > 0;
  const Yc = x => (NorthY(x) + SouthY(x)) / 2;
  const Inland00 = (x, y) => Math.min(y - NorthY(x), SouthY(x) - y, x < HEAD.x - 70 ? HEAD.r - Math.hypot(x - HEAD.x, y - HEAD.y) + 2 : 1e9, x > XE + 90 ? 1284 - x : 1e9);
  // [costa2] fuori dalla città la distanza vera dalla riva (entro 64 m); oltre, e nella città, quella di prima
  const Inland0 = (x, y, cap) => {
    if (x >= C2X1 - 4 || x < C2T.x0 + 2) return Inland00(x, y);
    const ny = NorthY(x), sy = SouthY(x), v = Math.min(y - ny, sy - y); if (v > 64 || v < -64) return v;   // [telefono] le rive una volta sola
    const d = c2Dist(x, y, cap || 64), on = y > ny && y < sy; return on ? Math.min(d, v) : -d;
  };
  // [fluido] chi chiede solo «è entro cap metri dalla riva?» (render.js vdWet, 14 m): stessa risposta dove |distanza| < cap, e oltre
  // resta oltre; la ricerca sulla riva copre ±(cap + 2) metri invece di ±64 (quattro volte meno conti). I due metri in più: un tratto
  // di riva lungo 1 m che comincia a cap metri può passare più vicino (c2Dist salta i tratti dal loro inizio)
  const InlandK = (x, y, cap) => Math.max(Inland0(x, y, Math.min(64, cap + 2)), isleIn(x, y));
  const Inland = (x, y) => Math.max(Inland0(x, y), isleIn(x, y));   // [arcipelago] la riva più vicina, isole comprese
  const PX380 = Px(380);   // [isola-ridotta]
  const DistrictAt = (x, y) => y !== undefined && isleIn(x, y) > Inland0(x, y) - 18 ? 'isole' : DistrictAt0(x);   // [arcipelago] con y: le isole e il mare attorno
  const DistrictAt0 = x => x < PX380 ? 'prateria' : x < XF ? 'foresta' : x < XG ? districtO(x - DXF) : x < XC ? 'perif_o' : districtO(x - DXC);
  // [costa] che riva c'è, tratto per tratto (non a caso): la punta del faro è di scogli; la costa di tramontana è alta e rocciosa,
  // con due cale dove si tirano su le barche; la riva sud della testa e del collo è la Spiaggia Lunga; sotto il Monte scogli,
  // la caletta della fiumara e la spiaggetta della Pensione Gabbiano; il centro ha il porto vecchio a sud e la scogliera
  // del lungomare a nord; la periferia est ha la spiaggia del Lido; oltre la Base il porto cargo.
  // spiaggia: sabbia larga, fondale che scende piano (si fa il bagno); cala: spiaggetta tra gli scogli; scogli: roccia bassa
  // che si cammina (si pesca), fondale medio; falesia: roccia alta, mare subito fondo; porto: banchine, fondale dragato.
  // [costa2] i tipi fini (COSTA2): duna (la spiaggia col cordone di dune dietro), foce (la sabbia e il canneto dove sbocca la fiumara),
  // frangiflutti (la scogliera di massi e tetrapodi messa dall'uomo vicino al porto). Per chi conosce solo i tipi di prima (fondale,
  // pesca, bagni) duna e foce valgono spiaggia, frangiflutti vale scogli. La Rocca ora sta su uno scoglio (prima la riva era «porto»):
  // le banchine restano porto per casella.
  const COSTA2 = {
    N: [[0, 'scogli'], [44, 'falesia'], [92, 'cala'], [108, 'falesia'], [204, 'cala'], [218, 'falesia'], [288, 'cala'], [312, 'falesia'], [380, 'scogli'], [448, 'cala'], [462, 'scogli'],
      [512, 'cala'], [526, 'scogli'], [548, 'cala'], [586, 'falesia'], [662, 'cala'], [676, 'falesia'], [731, 'cala'], [747, 'falesia'], [831, 'cala'], [845, 'scogli'], [1204, 'scogli']],
    S: [[0, 'scogli'], [94, 'cala'], [111, 'scogli'], [143, 'spiaggia'], [322, 'scogli'], [352, 'duna'], [652, 'scogli'], [739, 'foce'], [756, 'scogli'], [802, 'cala'], [828, 'scogli'],
      [902, 'frangiflutti'], [950, 'porto'], [1082, 'scogli'], [1094, 'spiaggia'], [1152, 'scogli'], [1204, 'scogli']],
  };
  [COSTA2.N, COSTA2.S].forEach(L => L.forEach(q => { if (q[0] > 0 && q[0] < XF) q[0] = Math.round(Px(q[0])); }));   // [isola-ridotta] i tratti di riva sulla mappa (lo 0 resta 0: vale tutto il ponente)
  const C2BASE = { duna: 'spiaggia', foce: 'spiaggia', frangiflutti: 'scogli' };
  const COSTA = { N: COSTA2.N.map(([a, k]) => [a, C2BASE[k] || k]), S: COSTA2.S.map(([a, k]) => [a, C2BASE[k] || k]) };
  const costaSide = (x, y) => y < Yc(x) ? 'N' : 'S';
  function coastKind2(x, y) { const b = isleAt(x, y); if (b && b.q.d > Inland0(x, y)) return isleKind(b.I, b.q.a);   // [arcipelago] la riva di un'isola
    const L = COSTA2[costaSide(x, y)]; let k = L[0][1]; for (const [a, n] of L) if (x >= a) k = n; return k; }
  function coastKind(x, y) { const k = coastKind2(x, y); return C2BASE[k] || k; }
  // il quartiere del governo: torri degli uffici sopra la baraccopoli (box in metri)
  const GOV = { x0: XG - 18, x1: XC + 4, piazza: [904, 136, 934, 156] };

  // ---------------- [isola] LA TESTA DI BOSCO, IL COLLO DI FORESTA, IL TAVOLATO ----------------
  // [altopiano] Il Tavolato è un tavolato calcareo (una mesa carsica): banchi di calcare inclinati di qualche grado verso scirocco
  // (sud-est). Dove gli strati si troncano, a maestrale (nord-ovest, verso il mare e il vento), c'è la scarpata: una parete di 20-25 m
  // col ghiaione sotto. Dalla parte opposta i banchi scendono col pendio: il ciglio è basso e si rompe in tre gradoni (i banchi più duri
  // che affiorano), coi ripiani in leggera pendenza e qualche frana che li raccorda. Il contorno segue gli strati: allungato lungo la
  // direzione dei banchi (nord-est / sud-ovest), a lobi e speroni. Il pianoro pende piano verso scirocco (da 44 a 33 m), bucato dalle
  // doline (la più grande tiene la pozza d'inverno), coi campi solcati (karren) e i massi sparsi. Due canaloni lo intaccano: quello di
  // levante, largo, scende fra i gradoni verso la Forra; quello di ponente è una spaccatura stretta nella parete, sopra il faro.
  // Si sale: dalla mulattiera a tornanti sui gradoni di mezzogiorno, dal sentiero ripido del canalone di levante, arrampicando su per
  // la spaccatura di ponente. Il verde segue quota ed esposizione: gariga bassa sul pianoro ventoso, macchia sui gradoni al riparo,
  // lecci nelle doline e nel canalone, roccia nuda sulle pareti.
  const TAV = { x: Px(168), y: Py(168, 190), r: 37, h: 38.5, dip: .78, Rd: 32, Rs: 41, g: .16 };   // dip: la direzione in cui pendono i banchi; Rd, Rs: i semiassi (lungo il pendio, lungo i banchi); g: la pendenza del pianoro
  TAV.ud = [Math.cos(TAV.dip), Math.sin(TAV.dip)];
  const BF = { TOP: 1, WALL: 2, TALUS: 4, CANALE: 8, RADURA: 16, RIVA: 32, TERR: 64, LECCI: 128, POZZA: 256 };   // [altopiano] TERR i gradoni, LECCI doline e canalone (i lecci), POZZA il fondo della dolina
  // i canaloni: a l'angolo dal centro, in/out dove comincia (dentro il pianoro) e dove sbocca, w0 la mezza larghezza del fondo al ciglio, k quanto si allarga
  // fuori, sin l'ampiezza delle anse, f la ripidità dei fianchi, G la pendenza massima del sentiero che ci sale
  const CANALI = [{ id: 'levante', a: .15, in: -20, out: 31, w0: 9, k: .1, sin: 3.5, f: 5, G: .45 }, { id: 'ponente', a: -2.86, tilt: -.5, in: -26, out: 30, w0: 4.4, k: .04, sin: 1.2, f: 2, G: .62 }];
  // [ambienti] gli ambienti del verde (vedi generate)
  const ECO = { NONE: 0, FARO: 1, DUNA: 2, PINETA: 3, SALINA: 4, PASCOLO: 5, GHIAIONE: 6, ABETAIA: 7, FAGGETA: 8, VALLONE: 9, MACCHIA: 10, RUDERALE: 11, RADURA: 12, RIPARIALE: 13, BETULLE: 14, VIGNE: 15, ULIVETO: 16, PINIMONTE: 17, ISOLA: 18, PALMETO: 19, GIUNGLA: 20, NUDA: 21, CANNETO: 22, COSTA: 23, LECCETA: 24 };   // [altopiano] LECCETA: i lecci nelle doline e nel canalone del Tavolato. [costa2] CANNETO: le canne alla foce e nelle conche dietro le dune; COSTA: le macchie verdi sulla riva di roccia (fichi d'india, agavi, pini)
  // [altopiano] il ciglio: un'ellisse lungo i banchi, coi lobi larghi e, dove c'è la parete, gli speroni e le nicchie della frana
  const tavW = a => sstep(-.25, .5, Math.cos(a - TAV.dip - Math.PI));   // 1 la parete (a maestrale), 0 i gradoni (a scirocco)
  const tavR = a => { const c = Math.cos(a - TAV.dip), s = Math.sin(a - TAV.dip), E0 = 1 / Math.sqrt(c * c / (TAV.Rd * TAV.Rd) + s * s / (TAV.Rs * TAV.Rs)), ca = Math.cos(a), sa = Math.sin(a);
    return E0 * (1 + .3 * (fbm(ca * 1.3 + 4, sa * 1.3 + 4, 401, 2) - .5) + (.1 + .12 * tavW(a)) * (fbm(ca * 3.6 + 9, sa * 3.6 + 9, 409, 2) - .5)); };
  const tavUV = (x, y) => { const dx = x - TAV.x, dy = y - TAV.y; return [dx * TAV.ud[0] + dy * TAV.ud[1], -dx * TAV.ud[1] + dy * TAV.ud[0]]; };   // u lungo il pendio (verso scirocco), v lungo i banchi
  const tavP = (u, v) => [TAV.x + u * TAV.ud[0] - v * TAV.ud[1], TAV.y + u * TAV.ud[1] + v * TAV.ud[0]];
  const tavE = (x, y) => Math.hypot(x - TAV.x, y - TAV.y) - tavR(Math.atan2(y - TAV.y, x - TAV.x));   // la distanza dal ciglio (negativa: sul pianoro)
  // le doline [u, v, raggio, profondità]: la prima è la Dolina della Pozza (il fondo d'argilla tiene l'acqua d'inverno)
  const DOLINE = [[7, 7, 12, 5], [-13, -15, 7.5, 3], [-5, 19, 6.5, 2.4], [17, -16, 5.5, 2], [-21, 4, 5, 1.8], [3, -4, 4, 1.3]].map(([u, v, r, d]) => { const [x, y] = tavP(u, v); return { x, y, r, d }; });
  const POZZA = { x: DOLINE[0].x, y: DOLINE[0].y, r: 4.2 };   // la pozza: l'acqua sta 0,7 m sopra il fondo
  // il pianoro: pende verso scirocco, ondula appena; le doline, le conche piccole del carso
  function tavTop(x, y) {
    const [u] = tavUV(x, y); let h = TAV.h - TAV.g * u + 1.8 * (fbm(x / 21, y / 21, 402, 2) - .5);
    for (const D of DOLINE) { const q = Math.hypot(x - D.x, y - D.y) / D.r; if (q < 1) h -= D.d * Math.pow(1 - q * q, 1.6); }
    h -= .8 * sstep(.63, .75, fbm(x / 6.5, y / 6.5, 403, 2));   // le conchette (uvale piccole, vaschette di corrosione)
    return h;
  }
  // i gradoni a scirocco: dove sono rotti (una frana li raccorda) e dove passa la mulattiera (a mezzogiorno, angoli 0,95-1,55) non c'è salto
  const MULA = [.95, 1.55];
  const tavGap = (a, k) => Math.max(sstep(.56, .66, fbm(Math.cos(a) * 2.6 + k * 5.3, Math.sin(a) * 2.6 + k * 2.1, 410, 2)), 1 - sstep(0, .14, Math.max(MULA[0] - a, a - MULA[1])));
  CANALI.forEach(c => { c.R = tavR(c.a); c.p0 = [TAV.x + Math.cos(c.a) * c.R, TAV.y + Math.sin(c.a) * c.R]; c.u = [Math.cos(c.a + (c.tilt || 0)), Math.sin(c.a + (c.tilt || 0))]; c.hw0 = c.w0; });   // p0 dove taglia il ciglio, u l'asse (di sbieco se tilt)
  // radure del bosco [x, y, raggio]: stazioni, saline, faro, campo partigiano, borghi dei pescatori
  const RADURE = [[232, 82, 15], [262, 318, 15], [100, 312, 19], [44, 213, 12], [98, 128, 8]].map(([x, y, r]) => [Px(x), Py(x, y), r * sigY(x)])   // [isola-ridotta] sulla mappa (le stazioni, le saline, il faro, il campo)
    .concat([[Px(470), SouthY(Px(470)) - 23, 18], [Px(566), NorthY(Px(566)) + 21, 14], [Px(152), SouthY(Px(152)) - 24, 12]]);   // [costa2] i borghi dei pescatori stanno a filo della riva nuova
  // [altopiano] dove i gradoni non arrivano: le radure delle due stazioni e il poggio della Casa del salinaio (restano dove erano)
  const TAV_FUORI = [RADURE[0], RADURE[1], [430, 130, 12], [354, 266, 10]];   // (la stazione nord nella sua radura; la casa del salinaio sul poggio a nord delle saline)
  const tavFuori = (x, y) => { let m = 1e9; for (const [kx, ky, kr] of TAV_FUORI) m = Math.min(m, dist(x, y, kx, ky) - kr); return m; };
  // quanto spazio c'è, dal ciglio in quella direzione, per i gradoni: fino a 26 m dal mare (la costiera) e a 6 m dalle radure tenute (un valore per direzione)
  const SPAZIO = new Map(), tavSpazio = a => { const k = Math.round(a * 200); let v = SPAZIO.get(k); if (v === undefined) { const R = tavR(a), x = TAV.x + Math.cos(a) * R, y = TAV.y + Math.sin(a) * R; v = Math.min(Inland(x, y) - 26, tavFuori(x, y) - 6); SPAZIO.set(k, v); } return v; };
  // il sottobosco sale verso l'interno della testa e lungo la mezzeria del collo (lì corre la strada centrale); valloni scendono al mare
  function boscoFloor(x, y, inl) {
    const hm = .6 + 12.4 * (1 - sstep(330, XF - 6, Pxi(x))), prof = sstep(3, 48, inl);
    const und = (fbm(x / 60, y / 60, 411, 2) - .5) * 4 * sstep(.3, 1, prof) * sstep(1.5, 5, hm);   // [isola] il sottobosco ondula largo
    const ph = x / 44 + (fbm(x / 50, y / 30, 412, 2) - .5) * 1.4, vi = Math.floor(ph + .5), rv = Math.abs(ph - vi) * 2;
    const vall = (1 - sstep(0, .35, rv)) * prof * (1 - prof) * 4 * (1.5 + hash2(vi, y > Yc(x) ? 1 : 0, 413) * 3) * sstep(2, 6, hm);
    return .4 + (hm - .4) * prof + und - vall;
  }
  // [altopiano] il fondo di un canalone a distanza `al` dal ciglio (negativo: dentro il pianoro): dalla testata (un metro sotto il pianoro)
  // allo sbocco (un metro sopra il bosco), a pendenza costante; l'asse fa qualche ansa (nessuna al ciglio)
  const CAN0 = -20, CAN1 = 31;   // i valori del canalone di levante (per chi li legge da fuori)
  function canFloor(c, al) {
    if (c.head === undefined) { const [hx, hy] = canPt(c, c.in, 0), [fx, fy] = canPt(c, c.out, 0); c.head = tavTop(hx, hy) - 1.2; c.foot = boscoFloor(fx, fy, Inland(fx, fy)) + 1; }
    return c.head + (c.foot - c.head) * clamp((al - c.in) / (c.out - c.in), 0, 1);
  }
  const canHalf = (al, c) => c ? c.w0 + Math.max(0, al) * c.k : 7 + Math.max(0, al) * .12;
  const canLat0 = (c, al) => c.sin * Math.sin(al / 7);
  function canPt(c, al, lat) { const l = canLat0(c, al) + lat; return [c.p0[0] + c.u[0] * al - c.u[1] * l, c.p0[1] + c.u[1] * al + c.u[0] * l]; }   // un punto del canalone: lungo l'asse, di fianco
  const BCACHE = new Map();
  function bosco(x, y) {
    const key = Math.round(x * 4) * 100000 + Math.round(y * 4), c0 = BCACHE.get(key); if (c0) return c0;
    const r = bosco0(x, y); if (BCACHE.size < 600000) BCACHE.set(key, r); return r;
  }
  function bosco0(x, y) {
    let f = 0; const inl = Inland(x, y);
    let h = boscoFloor(x, y, inl);
    // la Spiaggia Lunga: la riva sud della testa e del collo è sabbia larga e bassa, poi una duna morbida
    // [costa2] la sabbia la decide il tipo di riva (spiaggia, cala, foce; la duna col suo cordone); la quota la fa c2Quota
    if (inl < 48) { const k = coastKind2(x, y), n1 = fbm(x / 23, y / 23, 710, 2);
      if (C2BW[k] && inl < C2BW[k] + 4 * n1 + (k === 'duna' ? C2DUNA + 8 * n1 - 2 : 0)) f |= BF.RIVA; }
    // [altopiano] il Tavolato: la parete col ghiaione a maestrale, i gradoni a scirocco, in mezzo si passano la mano; poi i canaloni
    const dx = x - TAV.x, dy = y - TAV.y, d = Math.hypot(dx, dy);
    if (d < TAV.Rs * 2.4) {
      const a = Math.atan2(dy, dx), R = tavR(a), e = d - R, foot = h, w = tavW(a);
      let ht = h;
      if (e < 60) {
        const top = tavTop(x, y);
        // la parete: il bordo del terreno scende un po' dentro la parete vera (la grafica la disegna liscia sulla curva tavR e la copre col ciglio);
        // la parete è alta w volte il salto pieno (sui fianchi si abbassa e si scioglie nei gradoni); sotto, il ghiaione e i gradoni si passano la mano
        const talTop = foot + 8 + (fbm(Math.cos(a) * 1.6, Math.sin(a) * 1.6, 403, 2) - .5) * 3, Lt = 20 + 6 * fbm(Math.cos(a) * 2 + 3, Math.sin(a) * 2 + 3, 404, 2);
        const hcb = top - w * Math.max(0, top - talTop), e0 = w > .02 ? 1 : 0;   // il piede della parete
        // i gradoni: tre salti di roccia (dove non sono franati) coi ripiani che pendono appena verso valle; finiscono prima della costiera
        const Ll = Math.max(14, Math.min(28 + 12 * fbm(Math.cos(a) * 1.7 + 7, Math.sin(a) * 1.7 + 7, 411, 2) + 12 * (1 - sstep(0, .14, Math.max(MULA[0] - a, a - MULA[1]))), tavSpazio(a))), t = (e - e0) / Ll + .07 * (fbm(x / 13, y / 13, 412, 2) - .5);   // dove sale la mulattiera il pendio è più lungo (una frana vecchia, il cono di detrito)
        let gL = 0; if (t >= 1) gL = 1; else if (t > 0) { const n = 3, k = t < .42 ? 0 : t < .72 ? 1 : 2, fr = (t - [0, .42, .72][k]) / [.42, .3, .28][k], rho = .2 + .74 * tavGap(a, k), st = (k + sstep(1 - rho, 1, fr)) / n; gL = .7 * st + .3 * t; }   // prima il ripiano, poi il salto
        const gW = e < 1 ? 0 : e < 1 + Lt ? 1 - Math.pow(1 - (e - 1) / Lt, 1.3) : 1, gk = w * gW + (1 - w) * gL;   // quanto si è scesi dal piede della parete al bosco (0..1)
        if (e < -3.5) ht = top;
        else if (e < e0) ht = top + (hcb - top) * sstep(-3.5, 1, e);
        else ht = hcb + (foot - hcb) * gk + w * (fbm(x / 11, y / 11, 404, 2) - .5) * .8 * (1 - gW);
        if (w >= .5) { if (e < -1.5) f |= BF.TOP; else if (e < 2.4) f |= BF.WALL; else if (e < 1 + Lt) f |= BF.TALUS; else if (t < 1 && ht > foot + .8) f |= BF.TERR; }
        else { if (e < 0) f |= BF.TOP; else if (t < 1 && ht > foot + .8) f |= BF.TERR; }
        if (f & BF.TOP) for (const D of DOLINE) { const q = Math.hypot(x - D.x, y - D.y) / D.r; if (q < 1.08) f |= BF.LECCI; }   // i lecci sui fianchi e sull'orlo della dolina, al riparo dal vento
        if (Math.hypot(x - POZZA.x, y - POZZA.y) < POZZA.r) f |= BF.POZZA;
      }
      // i canaloni: il fondo piano e i fianchi che si alzano (a U nel canalone di levante, quasi a picco nella spaccatura di ponente, che sale di sbieco)
      for (const c of CANALI) {
        const qx = x - c.p0[0], qy = y - c.p0[1], al = qx * c.u[0] + qy * c.u[1]; if (al < c.in - 12 || al > c.out + 6) continue;
        const lat = Math.abs(-qx * c.u[1] + qy * c.u[0] - canLat0(c, al)), hw2 = canHalf(al, c); if (lat > hw2 + c.f + 14) continue;
        const hc = canFloor(c, al) + (fbm(x / 5, y / 5, 405, 2) - .5) * .4, wall = hc + Math.pow(Math.max(0, lat - hw2 + c.f) / c.f, 1.6) * 9 + Math.max(0, c.in - al) * 2.2;
        if (wall < ht) { ht = wall; f &= ~(BF.TOP | BF.WALL | BF.POZZA); if (lat < (c.id === 'levante' ? Math.max(1.6, (hw2 - c.f) * .45) : hw2 - 1) && al >= c.in) f |= BF.CANALE;   /* nel canalone di levante il letto di ghiaia sta in mezzo, ai lati i lecci */ if (c.id === 'levante') f |= BF.LECCI; else f &= ~BF.LECCI; }
      }
      h = ht;
    }
    for (const [rx, ry, rr] of RADURE) if (dist(x, y, rx, ry) < rr) f |= BF.RADURA;
    return { h: Math.max(.4, h), f };
  }
  // [costa2] il profilo della riva secondo il suo tipo, sopra il terreno di prima (il bosco, il monte), che vicino al mare si spiana:
  // la falesia di tramontana sale quasi a picco a 5-11 m; gli scogli sono lastre basse a gradini; la cala scende a una spiaggetta;
  // la spiaggia è bassa e larga; la duna ha dietro la spiaggia il cordone (due o tre creste parallele alla riva con le conche in mezzo),
  // poi il terreno risale piano verso la pineta; la foce è piatta e bassa. A sud tutto più basso che a nord.
  const C2BW = { duna: 13, foce: 10, spiaggia: 11, cala: 7 };   // la larghezza della sabbia asciutta (più 0-4 m)
  const C2DUNA = 26;                                                // il cordone di dune dietro la spiaggia (più 0-8 m)
  function c2Quota(x, y, h0) {
    const inl = Inland0(x, y); if (inl > 72 || inl < 0) return h0;
    const k = coastKind2(x, y), n1 = fbm(x / 23, y / 23, 710, 2), n2 = fbm(x / 7, y / 7, 711, 2);
    let h = .4 + (h0 - .4) * sstep(3, 34, inl);   // vicino al mare il terreno di prima si spiana
    if (k === 'falesia') { const top = 5 + 6 * n1; h = Math.max(h, top * sstep(.3, 3.4, inl) * (1 - .4 * sstep(12, 55, inl)) + (n2 - .5) * .9 * sstep(1, 4, inl)); }
    else if (k === 'scogli' || k === 'frangiflutti') { const st = .9 + 1.3 * n1 + Math.floor(n2 * 3) * .35; h = Math.max(h, Math.min(st, .5 + inl * .5)); }
    else {
      const bw = (C2BW[k] || 9) + 4 * n1, top = .45 + bw * .03;
      if (inl < bw) return .45 + inl * .03;
      const t = inl - bw;
      if (k === 'duna') {
        const D = C2DUNA + 8 * n1, al = x + y * .3, ph = t / (7 + 2 * fbm(al / 40, 3, 712, 2)) * Math.PI * 2 + fbm(al / 30, 5, 713, 2) * 4;
        const env = sstep(0, 5, t) * (1 - sstep(D - 7, D, t)), cr = .5 + .5 * Math.cos(ph), hd = top + env * (1.2 + 2.8 * cr * (.6 + .8 * fbm(al / 18, 7, 714, 2)));   // creste fino a 4 m
        return t < D ? hd : top + (h - top) * sstep(D, D + 22, t);
      }
      if (k === 'foce') return Math.min(h, top + t * .05);
      h = top + (Math.max(h, top) - top) * sstep(0, 14, t);
    }
    return h;
  }
  // [costa2] l'ambiente del verde vicino al mare: la duna (erbe della sabbia, ginepro, lentisco) sulla spiaggia e sul cordone; il canneto
  // alla Foce della Fiumara e a chiazze nelle conche umide dietro le dune; la costa verde (pini radi, fichi d'india, agavi) a macchie
  // dietro gli scogli e sul ciglio della falesia. Più in là decidono il bosco e il monte.
  const FOCE = { x: 747, r: 30 };
  function c2Eco(x, y) {
    if (x >= C2X1) return 0; const inl = Inland0(x, y); if (inl < 0 || inl > 50) return 0;
    const k = coastKind2(x, y), n1 = fbm(x / 23, y / 23, 710, 2), w = (fbm(x / 13, y / 13, 721, 2) - .5) * 10;
    if (Math.hypot(x - FOCE.x, y - SouthY(FOCE.x)) < FOCE.r + w && y > Yc(x)) return ECO.CANNETO;
    if (C2BW[k]) { const bw = C2BW[k] + 4 * n1, D = k === 'duna' ? C2DUNA + 8 * n1 : 0;
      if (inl < bw + D) return ECO.DUNA;
      if (k === 'duna' && inl < bw + D + 16 && fbm(x / 26, y / 26, 722, 2) > .6) return ECO.CANNETO;   // le conche umide dietro il cordone
      return 0; }
    if ((k === 'scogli' || k === 'falesia' || k === 'frangiflutti') && inl > 4 && inl < 24 + w && fbm(x / 34, y / 34, 720, 2) > .5) return ECO.COSTA;
    return 0;
  }
  function rawElev(x, y) { const h = rawElev0(x, y); return x < C2X1 && h > -1 ? c2Quota(x, y, h) : h; }
  function rawElev0(x, y) {
    { const b = isleAt(x, y); if (b && b.q.d > 0 && !OnLand0(x, y)) return isleElev(b.I, b.q); }   // [arcipelago]
    if (!OnLand(x, y)) return -2;
    if (x < XF) return bosco(x, y).h;
    if (x < XG) return Math.max(.4, monte(x - DXF, y).h, x < XF + 16 ? boscoFloor(x, y, Inland(x, y)) * (1 - sstep(XF, XF + 16, x)) : 0);
    if (x < XC) return Math.max(.4, monte(347.9, y).h);
    // [città2] il borgo sta su una groppa dolce che sale verso la Rocca (niente crepacci: le case si costruiscono in aderenza);
    // al bordo dell'acqua resta in piano (la marina, le mura di tramontana), oltre il fossato torna il colle della Rocca
    if (x >= 985 && x < 1215) { const hb = .4 + 6 * sstep(1000, 1150, x) * sstep(3, 34, Inland0(x, y)); return x < 1190 ? hb : hb + (rawElevO(x - DXC, y) - hb) * sstep(1190, 1215, x); }
    return rawElevO(x - DXC, y);
  }
  const CITY_W0 = 930;   // [mappa_compatta] il bordo ovest della città: la stazione (finale 1250; prima 750)
  function zoneAt(x, y) {
    { const b = isleAt(x, y); if (b && b.q.d > 0 && !OnLand0(x, y)) { const k = isleKind(b.I, b.q.a); return (k === 'spiaggia' || k === 'cala') && b.q.d < 9 ? Z.SPIAGGIA : Z.MACCHIA; } }   // [arcipelago]
    if (!OnLand(x, y)) return Z.MARE;
    if (x < XF) { const f = bosco(x, y).f; return f & BF.TOP ? Z.DESERTO : f & BF.RIVA ? Z.SPIAGGIA : f & BF.RADURA ? Z.CAMPAGNA : Z.MACCHIA; }
    if (x < XG) { const z0 = zoneO(x - DXF, y);
      // [città2] un po' meno bosco: la metropoli si allarga verso ovest fin dove il terreno sale (le alture restano verdi)
      if (x >= CITY_W0 && z0 !== Z.MARE && rawElev(x, y) < 7 + 4 * sstep(CITY_W0, XG, x)) return Z.CITTA;
      return z0 === Z.MARE ? Z.MACCHIA : z0; }   // [costa2] i capi nuovi sotto il Monte (fuori dalla riva vecchia) sono macchia
    if (x < XC) return x >= CITY_W0 ? Z.CITTA : x < CITY_W0 - 28 ? Z.MACCHIA : Z.CAMPAGNA;   // [mappa_compatta] a ovest della stazione l'entroterra: la pineta, poi gli orti e i Giardini
    const z = zoneO(x - DXC, y);
    // [città2] il borgo sale sulla collina sotto la Rocca: dentro la Strada delle Mura il monte è città (case a gradoni e scalinate)
    if (z === Z.MONTE && x < 1158 && dist(x, y, 1156, 140) < 104) return Z.CITTA;
    return z;
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
  const CREST = [[146, 0], [170, 3], [194, 8.5], [216, 11.5], [240, 12.5], [262, 13], [286, 12.5], [310, 12], [334, 7.5], [356, 2.5], [370, .4]];   // [altopiano] un tavolato largo a 12-13 m, come i pianori del Gran Paradiso
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
    // [altopiano] il pianoro resta in quota per un buon tratto, poi scende al mare con un fianco dolce; sopra, dossi morbidi di 1-2 m
    const Hc = crestH(x), prof = 1 - sstep(.22, 1, t), plat = 1 - sstep(.15, .55, t);
    let h = Hc * prof + (fbm(x / 110, y / 110, 301, 2) - .5) * 1.4 * prof + (fbm(x / 34, y / 34, 303, 3) - .5) * 4.5 * plat * sstep(2, 8, Hc);
    const inl = inland(x, y); h = .4 + (h - .4) * sstep(7, 26, inl);
    // i borghi stanno su un ripiano
    for (const id in BORGHI) { const [bx, by, br0, bh] = BORGHI[id], d = dist(x, y, bx, by); if (d < br0 + 6) { const k = 1 - sstep(br0, br0 + 6, d); h = lerp(h, Math.min(bh, h + 1.5), k); if (k > .5) f |= MF.BORGO; } }
    if (Hc * prof > 9) f |= MF.ALTO;
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
    ['porto', 'Viale della Tutela', 10, 'strada', [[548, 0], [600, 0], [640, 0]]],   // [città2] finisce sulla piazza d'armi, davanti al comando
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
  // id, nome, w, h (caselle), piani, stile, punto preferito (metri), extra. Insegne in italiano, leggibili.
  const NAMED = [
    // centro
    ['chiesa', 'Chiesa di San Rocco', 8, 6, 5, 9, [369, 117], { church: true, home: true }],
    ['bar', 'Bar Da Gino', 5, 6, 5, 1, [392, 134], { sign: { t: 'BAR DA GINO', c: '#ff4fa3' }, shop: true }],
    ['wu', 'Alimentari Wu', 5, 5, 4, 7, [424, 134], { sign: { t: 'ALIMENTARI WU', c: '#ff3b3b' }, shop: true, lanterns: true }],
    ['biblioteca', 'Biblioteca civica', 7, 5, 4, 2, [420, 142], {}],
    ['ambulatorio', 'Ambulatorio', 5, 6, 3, 8, [394, 96], { sign: { t: '✚ AMBULATORIO', c: '#4dff9a' } }],
    ['cultura', 'Palazzo della Cultura', 9, 7, 3, 2, [446, 117], { sign: { t: 'PALAZZO DELLA CULTURA', c: '#ff3b3b' }, landmark: 'cultura' }],
    ['flipper', 'Sala giochi Flipper', 5, 6, 3, 3, [450, 142], { sign: { t: 'FLIPPER', c: '#35e6ff' } }],
    ['stella', 'Condominio Stella', 6, 7, 7, 2, [364, 144], { home: true }],
    ['aurora', 'Condominio Aurora', 6, 7, 6, 4, [450, 160], { home: true }],
    ['commissariato', 'Caserma della Guardia', 9, 6, 3, 10, [386, 160], { sign: { t: 'GUARDIA', c: '#5a8aff' } }],
    ['cinema', 'Cinema Astor', 5, 7, 4, 13, [400, 144], { sign: { t: 'CINEMA ASTOR', c: '#ffd23b' }, deco: true }],
    ['video', 'Videoteca Stella', 4, 5, 3, 27, [426, 96], { sign: { t: 'VIDEO STELLA', c: '#ff5a5a' }, deco: true }],
    // il porto vecchio dei pescatori, sulla riva sud del centro
    ['osteria', 'Osteria del Porto', 7, 4, 4, 5, [394, 168], { sign: { t: 'OSTERIA', c: '#ffb35c' } }],
    ['miramare', 'Hotel Miramare', 6, 5, 7, 6, [426, 168], { sign: { t: 'HOTEL MIRAMARE', c: '#ff7ad9' }, deco: true }],
    ['sirena', 'Bar Sirena', 5, 4, 3, 17, [374, 178], { sign: { t: 'BAR SIRENA', c: '#35ffc0' }, shop: true, deco: true }],
    ['magazzino', 'Magazzino Neri', 9, 5, 3, 11, [1040, 186], { sign: { t: 'MAGAZZINO NERI', c: '#ff6a3b' }, warehouse: true, nuovo: true }],   // [città2] sulla calata del porto vecchio
    ['cantiere', 'Cantiere navale', 8, 4, 3, 11, [356, 184], { warehouse: true, sign: { t: 'CANTIERE NAVALE', c: '#ff8a3b' } }],
    // periferia ovest
    ['disco', 'Discoteca Luna', 9, 5, 3, 12, [330, 88], { sign: { t: 'DISCOTECA LUNA', c: '#c05cff' }, deco: true }],
    ['benzina', 'Distributore', 4, 3, 1, 16, [350, 96], { sign: { t: 'BENZINA', c: '#ffd23b' }, kiosk: true }],
    ['officina', 'Officina di Dorino', 6, 5, 2, 3, [300, 184], { sign: { t: 'OFFICINA DORINO', c: '#ffd23b' } }],
    ['gabbiano', 'Pensione Gabbiano', 6, 6, 4, 15, [278, 188], { sign: { t: 'PENSIONE GABBIANO', c: '#35e6ff' } }],
    // periferia est
    ['mare', 'Condominio Mare', 6, 6, 6, 0, [470, 92], { home: true }],
    ['santuario', 'Santuario del Mare', 8, 4, 4, 9, [526, 90], { church: true }],
    ['car_2', 'Trattoria da Nina', 6, 4, 4, 0, [478, 178], { sign: { t: 'TRATTORIA DA NINA', c: '#ffb35c' }, shop: true }],
    ['gelateria', 'Gelateria Polo Nord', 4, 5, 2, 25, [462, 182], { sign: { t: 'GELATERIA POLO NORD', c: '#8affd0' }, deco: true, shop: true }],
    ['flamingo', 'Hotel Flamingo', 7, 7, 5, 23, [498, 186], { sign: { t: 'HOTEL FLAMINGO', c: '#ff4fa3' }, deco: true }],
    ['paradiso', 'Hotel Paradiso', 6, 5, 6, 24, [520, 182], { sign: { t: 'HOTEL PARADISO', c: '#35e6ff' }, deco: true }],
    ['oceano', 'Hotel Oceano', 7, 7, 7, 26, [490, 92], { sign: { t: 'HOTEL OCEANO', c: '#b28cff' }, deco: true }],
    ['chiosco', 'Banja del Lido', 4, 2, 1, 28, [540, 192], { sign: { t: 'BAGNI DEL LIDO', c: '#ff9a3c' }, kiosk: true }],
    ['casotto', 'Casotto della cava', 4, 3, 1, 11, [530, 150], { warehouse: true }],
    // [isola] il quartiere del governo: torri di cemento sopra la baraccopoli (coordinate nuove)
    ['pietra', 'La Pietra dell\'Onda', 5, 5, 3, 2, [887, 116], { gov: true, sign: { t: 'LA TUTELA', c: '#b84a3c' }, nuovo: true }],
    ['governo', 'Palazzo del Governo', 9, 5, 3, 10, [921, 115], { gov: true, sign: { t: 'PALAZZO DEL GOVERNO', c: '#b84a3c' }, landmark: 'governo', nuovo: true }],
    ['ministero', 'Ministero dell\'Ordine', 6, 5, 3, 2, [954, 115], { gov: true, nuovo: true }],
    ['garante', 'Uffici del Garante', 5, 5, 3, 2, [953, 152], { gov: true, sign: { t: 'UFFICI DEL GARANTE', c: '#b84a3c' }, nuovo: true }],
    ['archivio', 'Archivio di Stato', 8, 6, 5, 10, [887, 155], { gov: true, nuovo: true }],
    // la Base della Tutela, oltre il Muro
    ['rocca', 'Rocca della Tutela', 7, 8, 5, 10, [1265, 131], { sign: { t: 'ROCCA DELLA TUTELA', c: '#ff3b3b' }, military: true, nuovo: true }],   // [città2] il comando in fondo sull'asse della porta
    ['caserma_p', 'Caserma della Tutela', 20, 5, 2, 10, [1230, 115], { military: true, nuovo: true }],   // [città2] in fila lungo le mura a nord
    ['hangar1', 'Hangar degli elicotteri', 6, 8, 3, 11, [1266, 148], { warehouse: true, military: true, nuovo: true }],   // [città2] verso la Porta a Mare
    ['hangar2', 'Deposito della Base', 4, 6, 2, 11, [1254, 122], { warehouse: true, military: true, nuovo: true }],   // [città2] a nord, accanto alla caserma
    ['deposito_n', 'Magazzino del porto cargo', 6, 8, 2, 11, [1212, 154], { warehouse: true, military: true, nuovo: true }],   // [città2] a sud lungo le mura
    ['deposito_s', 'Dogana del porto cargo', 6, 4, 2, 11, [1214, 128], { warehouse: true, military: true, nuovo: true }],   // [città2] sulla Porta a Mare
    // foresta: San Giacomo e il Borgo dei Carbonai
    ['chiesa_sg', 'Chiesa di San Giacomo', 6, 5, 4, 9, [199, 97], { church: true }],
    ['osteria_sg', 'Osteria di San Giacomo', 5, 4, 3, 5, [211, 106], { sign: { t: 'OSTERIA', c: '#ffb35c' }, shop: true }],
    ['masseria', 'Masseria Sant\'Elia', 8, 6, 2, 4, [178, 196], {}],
    ['cantina', 'Cantina delle terrazze', 7, 5, 2, 7, [262, 202], {}],
    ['ovile_b', 'Ovile abbandonato', 5, 4, 1, 9, [178, 116], {}],
    // [isola] testa di bosco: le stazioni di estrazione, le saline e la Punta (coordinate nuove)
    ['miniera', 'Stazione di estrazione Nord', 6, 4, 2, 11, [228, 88], { warehouse: true, station: true, nuovo: true }],
    ['stazione2', 'Stazione di estrazione Sud', 6, 4, 2, 11, [270, 314], { warehouse: true, station: true, nuovo: true }],
    ['salinaio', 'Casa del salinaio', 4, 4, 2, 4, [118, 302], { nuovo: true }],
    ['faro', 'Faro di Punta Scogli', 3, 3, 7, 9, [42, 214], { lighthouse: true, nuovo: true }],
  ];
  // [città2] gli edifici con nome al loro posto nella città per epoche (coordinate nuove, centro dell'edificio): la chiesa è la
  // Chiesa Madre sulla Rua Maestra, Ministero e Governo stanno sulla piazza d'adunata, gli alberghi sul lungomare del boom,
  // biblioteca e archivio negli isolati murattiani, la Guardia sulla cortina del Mercato
  { const RELOC = {
      chiesa: [1063, 91], bar: [1098, 121], wu: [1040, 118], ambulatorio: [1028, 96], video: [1090, 96],
      cultura: [1084, 124], flipper: [1062, 160], gelateria: [1096, 160], cinema: [1087, 163], osteria: [1090, 182], car_2: [1110, 190],
      santuario: [1126, 196], garante: [1134, 124], pietra: [1130, 124], casotto: [1136, 198],
      ministero: [1015, 117], governo: [1003, 123], aurora: [962, 113], commissariato: [952, 172], sirena: [966, 166],
      // [mappa_compatta] la città finisce alla stazione: chi stava a ovest entra nella cornice (MAPPA_COMPATTA.md sez. 8.1). Biblioteca e
      // archivio negli isolati a corte fra il piazzale e il Mercato, il Miramare sul piazzale, Oceano e Condominio Mare nella stecca del boom
      // accanto al distributore, Flamingo sul Corso, Paradiso e Gabbiano verso il Lido, la Discoteca Luna (Radio Luna) sul tronchino merci,
      // officina e cantiere sullo Scalo
      biblioteca: [944, 120], archivio: [966, 121], stella: [1016, 93], miramare: [958, 119], benzina: [940, 168],
      oceano: [960, 178], mare: [946, 176], flamingo: [1000, 95], paradiso: [1120, 190], gabbiano: [1104, 187], magazzino: [1008, 177], cantiere: [938, 181],
      disco: [977, 71],   /* [pianta] Radio Luna col fronte sul Lungomare di Tramontana, fra il lotto del fuoco e la torre dell'acqua */ officina: [972, 175] };
    // [cucitura] il regime lascia la Vittoria: il Governo, il Ministero (con la torre littoria), gli Uffici del Garante (il corpo di guardia
    // del varco) e la Pietra dell'Onda (la caserma) stanno nel Recinto del Garante, al porto (il posto lo dà il recinto, non RELOC); il cinema
    // prende il posto del Ministero sulla Piazza Grande, col fronte sulla piazza
    RELOC.cinema = [1015, 121];
    RELOC.cultura = [1124, 178];   // [cucitura] il Palazzo della Cultura lascia il fronte della Vittoria: sta dietro, sulla Via di Mezzo verso la marina
    const RECINTO_N = { governo: [7, 5], ministero: [5, 5], garante: [3, 3], pietra: [4, 16] };
    ['miniera', 'stazione2', 'salinaio', 'faro'].forEach(id => { const q = NAMED.find(n => n[0] === id); q[6] = PP(q[6][0], q[6][1]); });   // [isola-ridotta] la testa sulla mappa
    NAMED.forEach(q => { const p = RELOC[q[0]]; if (p) { q[6] = p; q[7] = Object.assign({}, q[7], { nuovo: true }); } if (q[0] === 'disco') { q[2] = 6; q[7] = Object.assign({}, q[7], { portaS: true }); }   /* il portone verso il tronchino, la vetrina della radio sul lungomare */   // [pianta] il magazzino di Radio Luna: 12 × 10 m sul lungomare
     
      const rc = RECINTO_N[q[0]]; if (rc) { q[2] = rc[0]; q[3] = rc[1]; q[7] = Object.assign({}, q[7], { recinto: true }); } }); }

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

  // [botteghe] IL FRONTE DELLA BOTTEGA ACCANTO AL PORTONE. Sul lato del portone (b.door) la bottega prende fino a quattro caselle
  // dalla parte più lunga, con un pilastro pieno fra portone e bottega se il fronte è largo. Riempie b.shopFront:
  //   face 'S'|'N'|'E'|'W' · door [tx,ty] la casella davanti alla porta della bottega · span [[tx,ty],[tx,ty]] le caselle estreme del fronte
  //   · k0, k1, kd gli indici lungo il lato (da b.x verso est, da b.y verso sud) · portone kd del portone.
  // Se il portone sta in mezzo a un fronte corto, si sposta all'estremità (fixed: no, a partita iniziata le porte non si muovono).
  // Al primo piano (piano 1) la bottega non ha fronte: c'è la targa accanto al portone e ci si sale dall'androne.
  function shopGeom(b, grid, reach, GWx, GHx, fixed, doors) {
    const S = b.shopFront; if (!S || !b.door) return false;
    const [dx, dy] = b.door, face = dy === b.y + b.h ? 'S' : dy === b.y - 1 ? 'N' : dx === b.x + b.w ? 'E' : dx === b.x - 1 ? 'W' : null; if (!face) return false;
    const NS = face === 'S' || face === 'N', n = NS ? b.w : b.h; S.face = face;
    const tileK = k => NS ? [b.x + k, face === 'S' ? b.y + b.h : b.y - 1] : [face === 'E' ? b.x + b.w : b.x - 1, b.y + k];
    const ok = k => { const [tx, ty] = tileK(k); if (tx < 0 || ty < 0 || tx >= GWx || ty >= GHx) return false; const v = grid[ty * GWx + tx]; return v !== T.BLD && v !== T.WATER && v !== T.TREE && v !== T.FOUNT && v !== T.CLIFF; };
    const okR = k => ok(k) && !!reach[tileK(k)[1] * GWx + tileK(k)[0]] && !(doors && doors.has(tileK(k)[1] * GWx + tileK(k)[0]) && k !== dk0) && !(doors && doors.shop && doors.shop.has(tileK(k)[1] * GWx + tileK(k)[0]));   // [botteghe] la porta di una bottega non si divide mai, neanche col portone vecchio del vicino
    const dk0 = NS ? dx - b.x : dy - b.y; let dk = dk0;
    if (S.piano) { S.door = null; S.span = null; S.portone = dk; return n >= 2; }
    if (n < 3) return false;
    const room = k => Math.max(k, n - 1 - k);
    if (room(dk) < 2) { if (fixed) return false; const alt = [0, n - 1].filter(k => okR(k)).sort((a, c) => hash2(b.x, b.y + a, 67) - hash2(b.x, b.y + c, 67))[0]; if (alt === undefined) return false; dk = alt; }
    const right = n - 1 - dk, dir = right > dk || (right === dk && hash2(b.x, b.y, 66) < .5) ? 1 : -1, free = dir > 0 ? right : dk;
    const gap = free >= 4 ? 1 : 0, len = Math.min(4, free - gap), ka = dk + dir * (1 + gap), kb = dk + dir * (gap + len);
    const k0 = Math.min(ka, kb), k1 = Math.max(ka, kb), h = hash2(b.x, b.y, 68);
    const want = len === 1 ? [ka] : len === 2 ? (h < .5 ? [kb, ka] : [ka, kb]) : len === 3 ? [ka + dir, ka, kb] : [ka + dir * (h < .5 ? 1 : 2), ka + dir * (h < .5 ? 2 : 1), ka, kb];   // la porta in mezzo alle vetrine quando ci stanno
    const kd = want.find(k => okR(k)); if (kd === undefined) return false;
    if (dk !== dk0) { if (doors) { doors.delete(dy * GWx + dx); } b.door = tileK(dk); if (doors) doors.add(b.door[1] * GWx + b.door[0]); }
    S.door = tileK(kd); S.span = [tileK(k0), tileK(k1)]; S.k0 = k0; S.k1 = k1; S.kd = kd; S.portone = dk;
    if (doors) { doors.add(S.door[1] * GWx + S.door[0]); if (doors.shop) doors.shop.add(S.door[1] * GWx + S.door[0]); }
    return true;
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
        // [altopiano] la pendenza vera della casella (dai quattro vertici): oltre 0,68 (34°, il ghiaione più ripido) è roccia in piedi, non si sale
        const sv = velev[ty * VW + tx], sv1 = velev[ty * VW + tx + 1], sv2 = velev[(ty + 1) * VW + tx], sv3 = velev[(ty + 1) * VW + tx + 1];
        const ripido = (f & (BF.TOP | BF.TALUS | BF.TERR | BF.LECCI)) && !(f & BF.CANALE) && Math.hypot(sv1 + sv3 - sv - sv2, sv2 + sv3 - sv - sv1) / (2 * TS) > .68;
        if (f & BF.WALL || ripido) { v = T.CLIFF; feat[i] |= 4096; }
        else if (f & BF.CANALE) { v = h1 < (dist(x, y, ...canPt(CANALI[1], 0, 0)) < 40 ? .3 : .72) ? T.GRAVEL : T.ROCK; feat[i] |= 8192; }   // il letto di ghiaia del canalone; nella spaccatura le lastre
        else if (f & BF.POZZA) { v = T.SAND; feat[i] |= 2048; }   // il fondo d'argilla della pozza (l'acqua la mette la grafica)
        else if (f & BF.TALUS) { const dd = tavE(x, y), t = clamp((dd - 2.4) / 22, 0, 1);
          v = t < .38 + (fbm(x / 14, y / 14, 406, 2) - .5) * .3 ? (fbm(x / 6, y / 6, 407, 2) > .42 ? T.GRAVEL : T.ROCK) : fbm(x / 10, y / 10, 48, 2) > .45 - t * .25 ? T.TREE : T.SHRUB; feat[i] |= 8192; }   // [isola] il ghiaione a fascia continua, poi il bosco che ci risale
        else if (f & BF.TERR) {   // i gradoni: al piede dei salti il pietrame caduto, sui ripiani gariga e macchia, la roccia che affiora
          const dn = Math.max(sv, sv1, sv2, sv3) - Math.min(sv, sv1, sv2, sv3);
          v = dn > 1.1 && h1 < .7 ? T.GRAVEL : fbm(x / 8, y / 8, 49, 2) > .7 ? T.ROCK : fbm(x / 12, y / 12, 50, 2) > .45 ? T.SHRUB : T.GRASS; if (v === T.GRAVEL) feat[i] |= 8192; }
        else if (f & BF.TOP) { v = fbm(x / 9, y / 9, 49, 2) > .66 || hash2(tx, ty, 413) < .014 ? T.ROCK : fbm(x / 15, y / 15, 50, 2) > .5 ? T.SHRUB : T.GRASS; feat[i] |= 2048; }   // i campi solcati (karren) a chiazze, i massi sparsi, la gariga
        else if (f & BF.RIVA) v = T.SAND;
        else if (f & BF.RADURA) v = h1 < .05 ? T.TREE : fbm(x / 12, y / 12, 51, 2) > .55 ? T.SHRUB : T.GRASS;
        else { const gl = fbm(x / 34, y / 34, 52, 2); v = gl < .24 ? (h1 < .3 ? T.SHRUB : T.GRASS) : fbm(x / 13, y / 13, 53, 3) > .33 ? T.TREE : h1 < .6 ? T.SHRUB : T.GRASS; }
      }
      // ogni albero è una casella d'albero (si può abbattere): qualche albero isolato nei campi e in prateria
      if ((z === Z.CAMPAGNA && v === T.GRASS && hash2(tx, ty, 43) < .03) || (z === Z.DESERTO && v === T.GRASS && hash2(tx, ty, 44) < .012)) v = T.TREE;
      // [costa] la riva secondo il suo tipo (vedi COSTA): una fascia di sabbia o di roccia larga quanto serve, coi bordi mossi appena
      if (!(x < XF && z === Z.SPIAGGIA)) {
        const k2 = x >= 1204 ? 'porto' : coastKind2(x, y), ck = C2BASE[k2] || k2, wob = (fbm(x / 9, y / 9, 81, 2) - .5) * 2.4, n1 = fbm(x / 23, y / 23, 710, 2);   // [costa2] la Rocca tiene le sue caselle di prima
        const band = x < C2X1 && C2BW[k2] ? C2BW[k2] + 4 * n1 + (k2 === 'duna' ? C2DUNA + 8 * n1 - 2 : 0) + wob * .5 : ck === 'spiaggia' ? 9 + wob : ck === 'cala' ? 6 + wob : ck === 'falesia' ? 7 + wob : ck === 'scogli' ? 4.2 + wob : 6;
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
    const FORRA = [canPt(CANALI[0], CANALI[0].out - 6, 0)].concat([[262, 214], [292, 228], [326, 236], [362, 244], [398, 252], [432, 258], [466, 266]].map(q => PP(q[0], q[1])));   // [isola-ridotta] sulla mappa   [altopiano] comincia allo sbocco del canalone
    const SAL0 = PP(100, 314), FARO0 = PP(41, 212), PX75 = Px(75);   // [isola-ridotta] le saline, la punta del faro
    const segD = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy))); return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t); };
    const valloneK = (x, y, inl) => { const prof = sstep(3, 48, inl), ph = x / 44 + (fbm(x / 50, y / 30, 412, 2) - .5) * 1.4, vi = Math.floor(ph + .5), rv = Math.abs(ph - vi) * 2; return (1 - sstep(0, .5, rv)) * prof * (1 - prof) * 4; };
    // un albero per cella di lato C, in un punto a caso della cella: alberi a distanza, come piantati o cresciuti da soli
    const cellTree = (tx, ty, C, p, s) => { const x0 = tx * TS, y0 = ty * TS, ci = Math.floor((x0 + 1) / C), cj = Math.floor((y0 + 1) / C), px = (ci + .15 + .7 * hash2(ci, cj, 151 + s)) * C, py = (cj + .15 + .7 * hash2(ci, cj, 152 + s)) * C; return px >= x0 && px < x0 + TS && py >= y0 && py < y0 + TS && hash2(ci, cj, 153 + s) < p; };
    const ecoAt = (x, y, i) => {
      const z = zone[i];
      { const b = isleAt(x, y); if (b && b.q.d > 0 && !OnLand0(x, y)) { const k = isleKind(b.I, b.q.a), wob2 = (fbm(x / 20, y / 20, 620, 2) - .5) * 10; return (k === 'spiaggia' || k === 'cala') && b.q.d < 24 + wob2 ? E.PALMETO : E.ISOLA; } }   // [arcipelago] palme sulla riva, macchia e pini dentro
      if (z === Z.MARE || z === Z.CITTA || x >= XG) return E.NONE;
      { const e2 = c2Eco(x, y); if (e2) return e2; }   // [costa2] vicino al mare decide la riva, prima del bosco e del monte
      const inl = Inland(x, y), wob = (fbm(x / 40, y / 40, 160, 2) - .5) * 16;
      if (x < XF) {
        const f = bosco(x, y).f;
        // [altopiano] i lecci al riparo (doline, canalone di levante); il pianoro al vento: gariga a maestrale, macchia bassa verso scirocco;
        // i gradoni al riparo: macchia; pareti, ghiaioni e letti dei canaloni: roccia e pietrame
        if (f & BF.LECCI && !(f & (BF.CANALE | BF.POZZA))) return E.LECCETA;
        if (f & BF.TOP) return tavUV(x, y)[0] < 8 + wob * .4 ? E.FARO : E.MACCHIA;
        if (f & BF.TERR) return E.MACCHIA;
        if (f & (BF.TALUS | BF.CANALE | BF.WALL)) return E.GHIAIONE;
        if (dist(x, y, SAL0[0], SAL0[1]) < 28 * RID.s) return E.SALINA;
        if (f & BF.RIVA) return E.DUNA;
        if (dist(x, y, FARO0[0], FARO0[1]) < 62 * RID.s && inl < 34 + wob) return E.FARO;
        const south = y > Yc(x);
        if (south && inl < 44 + wob) return x < PX75 ? E.FARO : E.PINETA;
        if (!south && inl < 26 + wob) return E.MACCHIA;
        for (let q = 0; q < RADURE.length; q++) { const [rx, ry, rr] = RADURE[q]; if (dist(x, y, rx, ry) < rr * 1.5 + wob * .3) return q < 2 ? E.RUDERALE : E.RADURA; }   // [isola-ridotta] le prime due sono le stazioni
        if (valloneK(x, y, inl) > .12) return E.VALLONE;
        if (FORRA.some((q, k) => k && segD(x, y, FORRA[k - 1], q) < 19 + wob * .8)) return E.VALLONE;   // la Forra: dal canalone di levante al Borgo dei pescatori
        if (tavE(x, y) < 80 * RID.s + wob * 2) return E.ABETAIA;   // l'abetaia vecchia attorno al Tavolato (il Bosco Antico)
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
      const v = grid[i]; if (v !== T.TREE && v !== T.SHRUB && v !== T.GRASS && !(v === T.SAND && eco[i] === E.PALMETO)) continue;   // [arcipelago] le palme crescono anche sulla sabbia
      const wx = x + (fbm(x / 30, y / 30, 171, 2) - .5) * 26 + (hash2(tx, ty, 172) - .5) * 9, wy = y + (fbm(x / 30 + 9, y / 30 + 4, 173, 2) - .5) * 26 + (hash2(tx, ty, 174) - .5) * 9;
      const wi = Math.max(0, Math.min(GH - 1, Math.floor(wy / TS))) * GW + Math.max(0, Math.min(GW - 1, Math.floor(wx / TS)));
      const fermo = x < XF && (bosco(x, y).f & (BF.TOP | BF.TERR | BF.TALUS | BF.WALL | BF.CANALE | BF.LECCI) || eco[wi] === E.LECCETA);   // [altopiano] sul Tavolato il verde segue la roccia (le doline sono piccole): niente lingue
      const e0 = v === T.SAND || fermo ? eco[i] : eco[wi] || eco[i];
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
        case E.LECCETA: nv = cellTree(tx, ty, 4.4, .85, 45) ? T.TREE : under(.42); break;                                           // [altopiano] i lecci fitti nelle doline e nel canalone
        case E.SALINA: case E.RUDERALE: nv = under(.64); break;
        case E.RADURA: nv = cellTree(tx, ty, 14, .35, 21) ? T.TREE : under(.62); break;                                             // radura: qualche albero grande da solo
        case E.RIPARIALE: { const q = Math.hypot((x - xn(186)) / 13, (y - 150) / 9); nv = q > 1.1 && cellTree(tx, ty, 6, .55, 24) ? T.TREE : under(.45); break; }
        case E.BETULLE: nv = cellTree(tx, ty, 4.2, .75, 27) ? T.TREE : under(.7); break;                                             // bosco chiaro di betulle e erba
        case E.PINIMONTE: nv = cellTree(tx, ty, 4.4, .85, 30) ? T.TREE : under(.55); break;
        case E.PALMETO: nv = v === T.SAND ? (Inland(x, y) > 4 && cellTree(tx, ty, 5.5, .55, 33) ? T.TREE : T.SAND) : cellTree(tx, ty, 5, .8, 33) ? T.TREE : under(.5); break;   // [arcipelago] palme a gruppi, anche sulla sabbia
        case E.COSTA: nv = cellTree(tx, ty, 9, .5, 39) ? T.TREE : under(.5); break;   // [costa2] pini radi; i fichi d'india e le agavi li mette la grafica
        case E.CANNETO: nv = v === T.TREE ? T.GRASS : v; break;   // [costa2] il canneto: niente alberi, le canne le mette la grafica
        case E.ISOLA: nv = cellTree(tx, ty, 7, .6, 36) ? T.TREE : under(.42); break;                                                      // macchia fitta, pini d'Aleppo e lentischi radi
        default: break;   // uliveti, vigne, ghiaione, duna: restano come li fa il monte o il Tavolato
      }
      grid[i] = nv;
    }
    // le pareti dei canyon sono roccia
    for (let ty = 1; ty < GH - 1; ty++) for (let tx = 1; tx < 1; tx++) { const i = ty * GW + tx; if (zone[i] !== Z.DESERTO || grid[i] === T.WATER) continue;
      let sl = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) sl = Math.max(sl, Math.abs(elev[i] - elev[(ty + dy) * GW + tx + dx])); if (sl > 1.1) grid[i] = T.ROCK; }
    // saline e lago
    const blob = (cx, cy, rx, ry, f) => { for (let ty = Math.floor((cy - ry) / TS); ty <= Math.ceil((cy + ry) / TS); ty++) for (let tx = Math.floor((cx - rx) / TS); tx <= Math.ceil((cx + rx) / TS); tx++) { if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) continue; const x = tx * TS + 1, y = ty * TS + 1, q = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + (fbm(x / 9, y / 9, 91, 2) - .5) * .6; if (q < 1) f(ty * GW + tx, q); } };
    blob(SAL0[0], SAL0[1], 15 * RID.s, 9 * RID.s, i => { if (grid[i] !== T.WATER) grid[i] = T.SALT; });   // [isola] le saline, dietro la Spiaggia Lunga
    const LAKE = { x: xn(186), y: 150, rx: 13, ry: 9, h: Math.max(2, rawElev(xn(186), 150)) + .4 };   // [isola] il lago sta alla quota del monte nuovo    // il lago gelato dell'altopiano
    blob(LAKE.x, LAKE.y, LAKE.rx, LAKE.ry, (i, q) => { grid[i] = q < .8 ? T.WATER : T.GRASS; elev[i] = q < .8 ? LAKE.h - 1.4 : Math.max(elev[i], LAKE.h + .2); });
    // strade
    const roads = [], TUNNELS = []; let CARR = null;   // CARR: vertici delle carreggiate già spianate
    const CITY = { roads: [], piazza: [1050, 97, 1076, 109], piazzette: [], rects: [], octa: null, park: null };   // [città2] piazza: il sagrato della Chiesa Madre
    // [isola] la costiera fa il giro intero: dal Muro lungo la riva nord, attorno alla testa di bosco, e indietro lungo la riva sud.
    // Una sola linea liscia, divisa in due nomi sulla punta ovest (lì le due metà si toccano con la stessa tangente e la stessa quota).
    const RING = (() => {
      const pts = [];
      // [costa2] due tratti di costiera stanno proprio sul mare (C2STRADA): sotto la Punta del Corvo a tramontana e dalla Spiaggetta del Gabbiano
      // alla Punta di Ponente a mezzogiorno. Lì la grafica mette il guardrail, il muretto, le piazzole e le scalette verso la riva.
      const sulMare = (x, sd) => { const [a, b] = C2STRADA[sd < 0 ? 0 : 1]; return sstep(a, a + 16, x) * (1 - sstep(b - 16, b, x)); };
      const offN = x => { const o = x >= XF ? coastOff(xo(x), -1) : 12 + 5 * sstep(420, XF, Pxi(x)), k = sulMare(x, -1); return o + (7 - o) * k; };
      const offS0 = x => x >= XF ? coastOff(xo(x), 1) : 24 - 7 * sstep(560, XF, Pxi(x));
      // [costa2] la costiera passa dietro il cordone di dune del golfo (non sopra), e non scende nelle calette: segue l'inviluppo della
      // riva (la riva più interna nei 16 m attorno), non ogni rientranza
      const offS = x => { const o = offS0(x) + 30 * sstep(356, 392, Pxi(x)) * (1 - sstep(612, 648, Pxi(x))), k = sulMare(x, 1); return o + (7 - o) * k; };
      const envN = x => { if (x >= C2X1 - 10) return NorthY(x); let m = -1e9; const R = Math.round(4 - 3 * sulMare(x, -1)) * 4; for (let d = -R; d <= R; d += 4) m = Math.max(m, NorthY(x + d)); return m; };
      const envS = x => { if (x >= C2X1 - 10) return SouthY(x); let m = 1e9; const R = Math.round(4 - 3 * sulMare(x, 1)) * 4; for (let d = -R; d <= R; d += 4) m = Math.min(m, SouthY(x + d)); return m; };
      for (let x = XE; x > HEAD.x; x -= 6) pts.push([x, envN(x) + offN(x)]);
      const RC = [];
      for (let a = -Math.PI / 2; a > -1.5 * Math.PI; a -= .034) {
        const ux = Math.cos(a), uy = Math.sin(a); let rc = HEAD.r * .55; while (rc < HEAD.r + 60 && OnLand(HEAD.x + ux * rc, HEAD.y + uy * rc)) rc += .5;
        RC.push([ux, uy, rc]);
      }
      RC.forEach(([ux, uy], k) => { let rc = 1e9; for (let o = -4; o <= 4; o++) { const q = RC[clamp(k + o, 0, RC.length - 1)]; rc = Math.min(rc, q[2]); }   // [costa2] l'inviluppo anche sulla testa
        const off = uy < 0 ? 12 + 10 * sstep(.6, .98, -ux) : 22 + 2 * uy;
        pts.push([HEAD.x + ux * (rc - off), HEAD.y + uy * (rc - off)]); });
      for (let x = 200 + 6 * Math.ceil((HEAD.x - 200) / 6); x <= XE; x += 6) pts.push([x, envS(x) - offS(x)]);   // [isola-ridotta] sulla griglia di 6 m di prima (200 + 6n): verso la città i vertici restano quelli
      let P0 = pts; for (let it = 0; it < 3; it++) P0 = P0.map((q, k) => { if (k < 2 || k > P0.length - 3) return q; let sx = 0, sy = 0; for (let o = -2; o <= 2; o++) { sx += P0[k + o][0]; sy += P0[k + o][1]; } return [sx / 5, sy / 5]; });
      return P0;
    })();
    const iW = RING.reduce((b, q, k) => q[0] < RING[b][0] ? k : b, 0);
    const ringNear = (x, y) => { let b = RING[0], bd = 1e9; RING.forEach(q => { const d = dist(q[0], q[1], x, y); if (d < bd) { bd = d; b = q; } }); return b.slice(); };
    // [città2] le costiere si fermano alle porte della città (x 780): dentro non c'è anello, la costa cambia faccia
    // (la ferrovia e le baracche a nord, il porto, la marina e il lungomare degli alberghi a sud)
    const nordP = rounded(RING.slice(0, iW + 1), 14, false).filter(q => q[0] < CITY_W0), litP = rounded(RING.slice(iW), 14, false).filter(q => q[0] < CITY_W0);   // [mappa_compatta] fino alla stazione
    roads.push({ id: 'nord', name: 'Costiera Nord', w: 8, kind: 'litoranea', pts: nordP });
    roads.push({ id: 'litoranea', name: 'Costiera Sud', w: 8, kind: 'litoranea', pts: litP });
    roads.push({ id: 'raccordo_o', name: 'Raccordo del Valico', w: 7, kind: 'strada', pts: rounded([ringNear(684, 50), [682, 110], [680, 150], [682, 190], ringNear(684, 250)], 10, false) });
    // [mappa_compatta] il Raccordo del Muro non c'è più: la spianata ha la sua pista di pattuglia in terra (palco.js)
    // [città2] LA CITTÀ PER EPOCHE (progetto_citta/PIANO_CITTA.md, tappa 1: l'ossatura). Il generatore scrive la storia in ordine:
    // E0 il borgo a spina di pesce (la Rua Maestra storta e i vicoli a pettine, come a Molfetta) con la marina (E2) sul porto vecchio;
    // E1 la spianata della Rocca che morde il bordo di levante del borgo; E3 l'Ottocento: le mura di terra diventano il Corso ad arco,
    // sulla vecchia porta la piazza del Mercato ottagonale, oltre il Corso la griglia murattiana a filo, la ferrovia sulla costa nord;
    // E4 il regime sventra il borgo con la Via della Vittoria, dritta dal Corso alla Porta della Rocca, e la piazza d'adunata;
    // E6 il boom: il Viale della Tutela ai piedi della collina e il lungomare degli alberghi.
    // Larghezze fisse per epoca: vicolo 2 · Rua e marina 4 · strade dell'Ottocento 7-8 · Corso 10 alberato · Vittoria 12 · viale 12 alberato
    // (misure alla scala del gioco: una strada più larga di così è un piazzale vuoto, non una strada).
    {
      const NMX = x => { let m = -1e9; for (let d = -24; d <= 24; d += 4) m = Math.max(m, NorthY(x + d)); return m; };
      const RAILY = x => NMX(x) + 15 + 12 * (1 - sstep(780, 815, x)) - 10 * sstep(985, 1012, x);
      const smooth = (P, k) => { let Q = P; for (let it = 0; it < k; it++) Q = Q.map((q, i) => i === 0 || i === Q.length - 1 ? q : [(Q[i - 1][0] + 2 * q[0] + Q[i + 1][0]) / 4, (Q[i - 1][1] + 2 * q[1] + Q[i + 1][1]) / 4]); return Q; };
      const yOn = (P, x) => { for (let k = 0; k < P.length - 1; k++) { const a = P[k], b = P[k + 1]; if (a[0] !== b[0] && (x - a[0]) * (x - b[0]) <= 0) return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); } return Math.abs(x - P[0][0]) < Math.abs(x - P[P.length - 1][0]) ? P[0][1] : P[P.length - 1][1]; };
      const line = (x0, x1, y) => { const out = []; for (let x = x0; x <= x1 + .01; x += 3) out.push([x, y]); return out; };
      const vline = (x, y0, y1) => { const out = []; for (let y = y0; y <= y1 + .01; y += 3) out.push([x, y]); if (out[out.length - 1][1] < y1) out.push([x, y1]); return out; };
      const add = (id, name, w, kind, pts, ex) => { const rd = Object.assign({ id, name, w, kind, pts, main: kind === 'citta' }, ex || {}); CITY.roads.push(rd); return rd; };
      // E3 la ferrovia (1880): sulla costa nord su un rilevato 15 m dentro la riva, con le baracche fra i binari e il mare;
      // all'altezza del Corso si accosta all'acqua e corre sugli scogli sotto le mura di tramontana fino al Muro
      const RAIL = []; for (let x = 756; x <= 1142; x += 6)   /* [cucitura] il binario finisce col respingente alla fine delle mura, non più in mezzo alla spianata */ RAIL.push([x, RAILY(x)]);
      CITY.rail = smooth(RAIL, 4); const ry = x => yOn(CITY.rail, x); CITY.railY = ry;
      // [mappa_compatta] LA CITTÀ COMPATTA (progetto_citta/MAPPA_COMPATTA.md, passi 1 e 2): la città finisce alla stazione (gen 930, finale
      // 1250); niente Via Nazionale, Viale della Tutela, Via del Porto lunga, Raccordo del Muro. Un asse (la Vittoria, 10 m), tre vie (Corso 7,
      // Rua e Marina 5), i vicoli, le piazzette come nodi. [incroci] Ogni strada finisce su un'altra, in un nodo o contro una chiusura
      // scritta nei suoi capi (rd.capi): mai un tondo, mai un moncone oltre l'incrocio (strumenti/incroci.js lo controlla).
      CITY.nodi = [];   // i nodi dove le strade finiscono senza chiusura (oltre alle scenografie di CITY.sets): piazzale, Scalo, spianata, Giardini, lotto del fuoco
      const nodoR = (nome, x0, y0, x1, y1) => CITY.nodi.push({ nome, poly: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]] }), nodoC = (nome, x, y, r) => CITY.nodi.push({ nome, x, y, r });
      CITY.pzStaz = [930, 104, 976, 113];   // il piazzale della stazione, fra il fabbricato e gli isolati a corte
      nodoR('Piazzale della Stazione', ...CITY.pzStaz); nodoR('Scalo', 958, 180, 998, 193); CITY.nodi.push({ nome: 'Piazza della Rocca', poly: [[1154, 116], [1184, 116], [1184, 130.5], [1171, 130.5], [1171, 139.5], [1154, 139.5]] });   /* [pianta] la spianata non è più un nodo vuoto: ci sono le case del glacis e la piazza del mercato */ nodoR('Giardini di Ponente', 902, 122, 930, 158);   /* [sporcherie] un giardino davanti al Mercato (28 × 36 m), non un parco di 104 m lungo tutta la città: il resto della fascia torna prato */ nodoC('Lotto del fuoco', 966, 71, 5);
      // la Costiera Nord passa i binari al passaggio a livello e si ferma sul piazzale (resta l'id via_alta: la leggono posti, popolo, percorsi)
      const N0 = nordP[0], STAZ = chaikin([N0.slice(), [N0[0] - 4, N0[1] + 8], [922, 94], [927.5, 104], [936, 109.5]], 2); CITY.staz = STAZ;   /* [pianta] la curva sull'angolo della stazione mezzo metro più larga: la carreggiata non ne tocca lo spigolo */
      add('via_alta', 'Via della Stazione', 7, 'citta', STAZ, { era: 'E3', nudo: true });
      // la Costiera Sud corre sulla riva fino allo Scalo (l'id via_porto resta)
      const L0 = litP[litP.length - 1], LUNGO = chaikin([L0.slice(), [L0[0] + 10, 187], [944, 186], [956, 186], [966, 186.5], [978, 186.9], [990, 187]], 2);   // [pianta] fino all'incrocio col Corso e la Marina: la strada non si interrompe sullo Scalo
      add('via_porto', 'Via del Porto', 7, 'citta', LUNGO, { era: 'E6', nudo: true });
      // E3 il Corso: dove c'erano le mura di terra, ad arco dal piazzale della stazione allo Scalo (7 m, un filare)
      add('corso', 'Corso Garibaldi', 7, 'citta', chaikin([[970, 109], [982, 118], [982, 128], [979, 143], [981, 158], [986, 174], [990, 187]], 2), { alberi: 'tigli', era: 'E3', alberiLato: -1 });
      // E3 il sottopasso Cavour: dal piazzale scende a scalini, passa sotto il rilevato e sbuca sul lotto del fuoco fra le baracche
      CITY.cavS = { x: 972, y0: 71, y1: 105 };
      add('cavour_sotto', 'Sottopasso Cavour', 3, 'vicolo', [[972, 105]].concat(vline(972, 81, 102).reverse(), [[972, 79], [971.5, 77], [970.5, 75.3], [969, 73.7], [967, 72]])   /* [pianta] la curva verso il lungomare, non l'angolo vivo */, { era: 'E3', sottopasso: true });
      // E3 la Galleria del Mercato (coperta) dal piazzale alla tettoia, il Vico delle Carceri dal Mercato allo Scalo, il Vico dei Giardini
      add('galleria', 'Galleria del Mercato', 3, 'vicolo', vline(952, 111, 129), { era: 'E3', galleria: true });
      add('carceri', 'Vico delle Carceri', 3, 'vicolo', chaikin([[952, 157], [952, 176], [962, 185]], 1), { era: 'E3' });
      add('giardini', 'Vico dei Giardini', 3, 'vicolo', [[926, 137], [933, 137.4], [940, 138]], { era: 'E3' });
      // E7 il passo delle baracche: dalla fine della Costiera Nord, fra i binari e gli scogli, al lotto del fuoco
      // [pianta] IL LUNGOMARE DI TRAMONTANA (tavola della viabilità): fra la ferrovia e il mare passa una strada vera. Dalla fine della
      // Costiera Nord (al passaggio a livello) gira sulla riva davanti alle baracche e corre a 10 m dai binari, su una colmata con la
      // scogliera di massi: 7 m a doppio senso, il marciapiede col parapetto sul mare, il guardrail verso la ferrovia. A levante scende
      // sul Viale della Spianata. È l'anello sul mare: Costiera Nord, Lungomare, Viale della Spianata, Vittoria, Via del Lido, Marina.
      { const NA = nordP.reduce((b, q) => Math.abs(q[0] - 921) < Math.abs(b[0] - 921) ? q : b, nordP[0]), LN = [NA.slice(), [922.5, 80], [927, 73.5], [934, 67], [940, 64.5],   /* [pianta] a T sulla Costiera, prima del bivio della stazione */ [946, 63.5], [960, 58.5], [980, 56.5], [1000, 56.5], [1016, 57.5]];
        for (let x = 1028; x <= 1136; x += 8) { const y = ry(x) - 10, w = sstep(1016, 1048, x); LN.push([x, 57.5 + (y - 57.5) * w]); }
        LN.push([1141, ry(1141) - 9.8], [1147.5, ry(1141) - 8.8]);   // a T sul Viale della Spianata, davanti al respingente dei binari
        CITY.lungN = chaikin(LN, 2); }
      add('lung_nord', 'Lungomare di Tramontana', 7, 'citta', CITY.lungN, { era: 'E6', litorale: true, prof: CITY.lungN.map((q, k) => k < 4 ? 1.1 + .1 * k : 1.4) });
      { const P = CITY.lungN; let k = 1; while (k < P.length - 1 && P[k][1] > 73.5) k++; const t = (73.5 - P[k - 1][1]) / ((P[k][1] - P[k - 1][1]) || 1), x0 = P[k - 1][0] + (P[k][0] - P[k - 1][0]) * t;
        add('vic_baracche', 'Passo delle Baracche', 2.5, 'vicolo', [[x0, 73.5], [946, 73], [956, 72.5], [966, 71]], { era: 'E7' }); }   // [pianta] dal lungomare al lotto del fuoco
      // E4 lo sventramento: l'asse dritto dal Mercato alla Porta della Rocca (passa la spianata e il canale sul ponte), col cannocchiale sulla porta.
      // [cucitura] non più un asse di parata vuoto: una via vera di 7 m (6 di carreggiata e i marciapiedi), coi portici di bottega su un lato
      // solo (il nord, il lato lontano dalla camera) e case dell'Ottocento e del borgo di 2-3 piani; niente pennoni (rd.viva)
      add('vittoria', 'Via della Vittoria', 7, 'citta', line(968, 1199, 143), { viva: true, nudo: true, era: 'E4', capi: [null, { tipo: 'porta', perche: 'passa il posto di blocco del Muro, la testa di ponte e il ponte e finisce contro la Porta della Rocca' }] });
      // E0 il borgo: la Rua Maestra storta dal Corso (sotto la Porta di Terra) alla spianata; E2 la marina dallo Scalo al Lido; la Via di Mezzo
      const RUA = chaikin([[972, 109], [995, 106], [1012, 104], [1034, 107], [1050, 111], [1063, 110], [1078, 107], [1094, 111], [1110, 114], [1126, 110], [1147, 113]], 3);
      add('rua', 'Rua Maestra', 5, 'vicolo', RUA, { fogna: true, era: 'E0' });
      const MAR = chaikin([[990, 187], [998, 187.2], [1030, 187.2], [1060, 187.3], [1085, 187.6], [1100, 193.5],   /* [pianta] il lungomare prende la calata, le case della marina restano dove sono */ [1118, 201], [1134, 204.2], [1147.5, 205.6]], 3);
      // [cucitura] la Via della Marina finisce sulla Passeggiata della Spianata (prima correva oltre, dentro quello che ora è il Recinto)
      add('marina', 'Via della Marina', 7, 'citta', MAR, { fogna: true, era: 'E2', litorale: true });   // [pianta] il lungomare del porto e del Lido: 7 m a doppio senso coi marciapiedi (era un vicolo di 5 m fra le case e la calata)
      const MEZ = chaikin([[985, 170.5], [1004, 170], [1020, 170], [1036, 170], [1052, 169], [1070, 172], [1092, 174], [1112, 180], [1128, 191], [1135, yOn(MAR, 1135)]], 2);
      add('mezzo', 'Via di Mezzo', 3, 'vicolo', MEZ, { era: 'E0' });
      // la Via delle Mura: il vicolo dentro la cinta (il pomerio), dalla scala di ronda della mura alla spianata; i pettini del nord ci arrivano
      const MURA_IN = x => ry(x) + 10.5, MV = []; for (let x = 1047; x <= 1147; x += 4) MV.push([x, MURA_IN(x)]);
      // [cucitura] LA PASSEGGIATA DELLA SPIANATA: l'ultimo filo della città, dove le case si girano a guardare la spianata (il glacis della
      // Rocca). Da tramontana, sopra gli scogli, alla Vittoria col filare di lecci dalla parte della spianata; dalla Vittoria alla spiaggia del
      // Lido lungo il muro del Recinto, senza alberi. Ci arrivano la Rua, la Via delle Mura, la Vittoria e la Via della Marina.
      CITY.passeggiata = 1145.5;
      // [pianta] la Passeggiata diventa il VIALE DELLA SPIANATA (tavola della viabilità, _immagini/pianta): 7 m di carreggiata a doppio senso
      // e i marciapiedi (a ponente quello della passeggiata davanti alle case, a levante quello coi lecci); di là dal viale non c'è più il
      // glacis vuoto ma le case basse costruite sulla spianata quando le artiglierie non servirono più, la Piazza della Rocca col mercato
      // all'aperto e la Riva sul canale. L'id resta 'passeggiata' (lo leggono scorci, palco, chiarezza).
      CITY.passeggiata = 1147.5; CITY.glacis = { x0: 1153, x1: 1182, riva: 1179, vico: 90, piazza: [1154, 116, 1184, 130.5, 1171, 139.5] };
      // [pianta] la Riva della Rocca segue la costa: dal viale gira sulla punta di scogli e scende lungo il canale (il quartiere non è un
      // rettangolo: le case riempiono lo spicchio fra il viale e la riva, il fronte sul mare segue la curva)
      CITY.glacis.rivaPts = chaikin([[1147.5, 62], [1154, 62], [1161, 64], [1167, 69], [1171, 75.5], [1174.5, 83], [1177.5, 91], [1179, 100], [1179, 116]], 2);
      add('passeggiata', 'Viale della Spianata', 7, 'citta', vline(1147.5, ry(1141) - 12.5, 139.5), { era: 'E1', passeggio: true, alberi: 'lecci', alberiLato: -1, alberiOff: 5, capi: [{ tipo: 'affaccio', perche: 'il belvedere sulla punta di scogli di tramontana, oltre il respingente dei binari' }, null] });
      add('riva_rocca', 'Riva della Rocca', 5, 'vicolo', CITY.glacis.rivaPts, { era: 'E1' });
      { const R = CITY.glacis.rivaPts; let xv = 1178; for (let k = 0; k < R.length - 1; k++) if ((R[k][1] - 90) * (R[k + 1][1] - 90) <= 0 && R[k][1] !== R[k + 1][1]) xv = R[k][0] + (R[k + 1][0] - R[k][0]) * (90 - R[k][1]) / (R[k + 1][1] - R[k][1]);
        add('vic_glacis', 'Vico del Glacis', 3, 'vicolo', [[1151.25, 90], [(1151.25 + xv) / 2, 90.6], [xv, 90]], { era: 'E1' }); }
      add('passeggiata_sud', 'Via del Lido', 7, 'citta', vline(1147.5, 146.5, 213), { era: 'E1', capi: [null, { tipo: 'affaccio', perche: 'scende alla spiaggia del Lido, accanto al muro del Recinto' }] });   // [pianta] la Via del Lido: l'anello sul mare passa la Vittoria a croce col Viale della Spianata
      add('vic_mura', 'Via delle Mura', 2.5, 'vicolo', MV, { era: 'E0', capi: [{ tipo: 'affaccio', perche: 'si affaccia sui binari, sotto la massicciata' }, null] });
      // i vicoli a pettine (Molfetta): paralleli e storti dalla stessa parte, ognuno da asse ad asse (Rua → mura, Rua → Vittoria,
      // Vittoria → Via di Mezzo); il Vico Lungo dalla Vittoria scende alla marina. Niente monconi: ogni capo sta su un'altra strada.
      const LEAN = .16;
      const pett = (id, nome, xk, A, B, yB) => { const y0 = typeof A === 'number' ? A : yOn(A, xk), X = y => xk + LEAN * (y0 - y); let y = yB !== undefined ? yB : yOn(B, xk);
        for (let it = 0; it < 6; it++) if (yB === undefined) y = yOn(B, X(y)); const ym = (y0 + y) / 2, P = [[xk, y0], [X(ym) + (hash2(xk, 1, 8101) - .5) * 2.4, ym], [X(y), y]];
        return add(id, nome, 3, 'vicolo', chaikin(P, 2), { era: 'E0' }); };
      // a nord della Rua (il lotto della Chiesa Madre fra 1055 e 1071 resta intero)
      pett('vic_lanternini', 'Vicolo dei Lanternini', 1050, RUA, MV);
      pett('vic_arco', 'Vico dell\'Arco', 1086, RUA, MV);
      pett('vic_monache', 'Vico delle Monache', 1100, RUA, MV);
      pett('vic_scuro', 'Vico Scuro', 1122, RUA, MV);
      pett('vic_cordai', 'Vico dei Cordai', 1136, RUA, MV);
      // fra la Rua e la Vittoria (si aprono sotto i portici)
      pett('vic_pescatori', 'Caruggio dei Pescatori', 1026, RUA, null, 139.5);
      pett('vic_gatti', 'Vico dei Gatti', 1056, RUA, null, 139.5);
      pett('vic_bottai', 'Vico dei Bottai', 1078, RUA, null, 139.5);
      pett('vic_pozzo', 'Vico del Pozzo', 1112, RUA, null, 139.5);
      pett('vic_sale', 'Vico del Sale', 1132, RUA, null, 139.5);
      // fra la Vittoria e la Via di Mezzo
      pett('vic_storto', 'Vicolo Storto', 1032, 146.5, MEZ);
      pett('vic_fame', 'Vico della Fame', 1040, 146.5, MEZ);   // dalla Vittoria sbocca dritto sulla fontana del Forno
      pett('vic_reti', 'Vicolo delle Reti', 1066, 146.5, MEZ);
      pett('vic_tonnaroti', 'Vico dei Tonnaroti', 1080, 146.5, MEZ);
      pett('vic_sorelle', 'Vico delle Sorelle', 1120, 146.5, MEZ);
      // il Vico Lungo: dalla Vittoria scende a scalini sul mare, passando la Via di Mezzo; la scalinata del Forno dalla fontana alla marina
      pett('vic_lungo', 'Vico Lungo', 1098, 146.5, MAR);
      add('vic_forno', 'Scalinata del Forno', 2.5, 'vicolo', [[1036.3, 169.9], [1034.4, 173], [1033.5, 176],   /* [pianta] parte dal Vicolo di Mezzo dove sbocca il Vico della Fame (un incrocio, non due capi a tre metri), accanto alla fontana */ [1034, yOn(MAR, 1034)]], { era: 'E0' });
      // le traverse: fra due vicoli vicini, alla stessa quota, da asse ad asse (androni e corti)
      const xOnY = (P, y) => { for (let k = 0; k < P.length - 1; k++) if ((y - P[k][1]) * (y - P[k + 1][1]) <= 0 && P[k][1] !== P[k + 1][1]) return P[k][0] + (P[k + 1][0] - P[k][0]) * (y - P[k][1]) / (P[k + 1][1] - P[k][1]); return null; };
      const trav = (id, nome, a, b, y) => { const A = CITY.roads.find(q => q.id === a), Bq = CITY.roads.find(q => q.id === b), xa = xOnY(A.pts, y), xb = xOnY(Bq.pts, y); if (xa === null || xb === null) return;
        add(id, nome, 2.5, 'vicolo', [[xa, y], [(xa + xb) / 2, y + .8], [xb, y]], { era: 'E0' }); };
      trav('vic_androne', 'Androne del Pozzo Vecchio', 'vic_arco', 'vic_monache', 92);
      trav('vic_lavatoio', 'Vico del Lavatoio', 'vic_gatti', 'vic_bottai', 125);
      trav('vic_corte', 'Corte dei Pescatori', 'vic_reti', 'vic_tonnaroti', 160);
      trav('vic_corte2', 'Vico della Corte', 'vic_lungo', 'vic_sorelle', 162);
      // le piazze: il Pozzo fra la Rua e la Vittoria, il Forno sulla Via di Mezzo, la Piazza della Marina sull'acqua,
      // la piazza d'adunata sull'innesto della Vittoria (oggi Piazza del Governo), il Mercato ottagonale sulla vecchia porta di terra
      CITY.piazzette = [[1108, 124, 6], [1036, 167, 5]];
      CITY.rects = [[1064, 172, 1086, 184]];
      // [volumi2] la piazza d'adunata si stringe dal lato lontano dalla camera (nord): 30 × 33 m invece di 30 × 38; il palco sta contro il
      // bordo nord, la torre littoria ne fa lo spigolo, il resto del fronte è borgo in aderenza (nessuno slargo senza bordo)
      GOV.piazza = [993, 129, 1023, 162];
      CITY.octa = [954, 143, 16];   // [borgo] una piazza, non un piazzale: 32 m da lato a lato
      // le scenografie dei nodi: il rendering le arreda (banchi, tettoia, palco, pennoni, tavolini, bitte, reti), così ogni nodo
      // si riconosce da lontano e la gerarchia si legge dall'arredo
      CITY.sets = [{ k: 'ottagono', x: 954, y: 143, r: 16, nome: 'Piazza dell\'Ottagono' }, { k: 'mercato', x: 1160, y: 126, r: 8, aperto: true, nome: 'Mercato della Rocca' },   /* [pianta] il mercato lascia l'ottagono (piazza alberata) e scende sulla spianata, all'aperto */ { k: 'sagrato', x0: 1050, y0: 97, x1: 1076, y1: 109 }, { k: 'adunata', x0: 993, y0: 129, x1: 1023, y1: 162, civica: true, nome: 'Piazza Grande' },   /* [cucitura] l'ex piazza d'adunata è la piazza della città: il cinema, il caffè, la fontana */
        { k: 'piazzetta', x: 1108, y: 124, r: 6, bar: true }, { k: 'piazzetta', x: 1036, y: 167, r: 5, forno: true }, { k: 'marina', x0: 1064, y0: 172, x1: 1086, y1: 184 },
        { k: 'calata', x0: 1000, x1: 1088 },
        // [mappa_compatta] passo 5: i nodi nuovi della città compatta
        { k: 'stazione', x0: 930, y0: 104, x1: 976, y1: 113 }, { k: 'scalo', x0: 958, y0: 180, x1: 998, y1: 193 }, { k: 'baracche', x: 966, y: 71, r: 5, fuoco: true }, { k: 'armi', x0: 1222, y0: 122, x1: 1250, y1: 145 }];
      CITY.spian0 = 1143;   // E1 la spianata: il bordo di levante del borgo demolito fino a qui
      CITY.muraY = x => ry(x) + 3;   // le mura di tramontana: dal binario al filo interno dei vicoli
      CITY.yOn = yOn; CITY.marina = MAR; CITY.rua = RUA;
      if (typeof process !== 'undefined' && process.env && process.env.PV_DBG) console.log('[città2] ossatura: vicoli', nv, 'Rua', RUA.length, 'stazione', STAZ[0], STAZ[STAZ.length - 1], 'lungomare', LUNGO[0], LUNGO[LUNGO.length - 1]);
    }
    // [pianta] I CAPI ALLINEATI: due vie che finiscono sulla stessa via, una di fronte all'altra a meno di 8 m, si incontrano in un incrocio
    // vero (prima: due capi sfalsati di 4-8 m, come due T che quasi si toccano). Il punto è la proiezione sull'asse della via del mezzo
    // dei due capi; ognuna ci arriva spostando i suoi ultimi metri (lo spostamento si spegne in 24 m), la via di mezzo non si tocca.
    { const R = CITY.roads.filter(rd => rd.kind === 'citta' || rd.kind === 'vicolo'), sul = (rd, x, y) => { let best = null; const Q = rd.pts; for (let k = 0; k < Q.length - 1; k++) { const [ax, ay] = Q[k], [bx, by] = Q[k + 1], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, t = clamp(((x - ax) * dx + (y - ay) * dy) / L2, 0, 1), px = ax + dx * t, py = ay + dy * t, d = dist(x, y, px, py); if (!best || d < best.d) best = { d, px, py, t, k, n: [-dy, dx] }; } return best; };
      const capi = []; R.forEach(rd => [0, rd.pts.length - 1].forEach(e => { const [x, y] = rd.pts[e]; let M = null, q = null; R.forEach(o => { if (o === rd) return; const s0 = sul(o, x, y); if (s0 && s0.d < o.w / 2 + 1.6 && s0.t > .001 && s0.t < .999 || (s0 && s0.d < o.w / 2 + 1.6 && s0.k > 0 && s0.k < o.pts.length - 2)) { if (!q || s0.d < q.d) { q = s0; M = o; } } }); if (M) capi.push({ rd, e, M, x, y, q }); }));
      const fatti = new Set(); let nAl = 0;
      capi.forEach(A => capi.forEach(Bc => { if (A === Bc || A.rd === Bc.rd || A.M !== Bc.M || fatti.has(A) || fatti.has(Bc)) return; const d = dist(A.x, A.y, Bc.x, Bc.y); if (d < .5 || d >= 8) return;
        const sa = Math.sign((A.x - A.q.px) * A.q.n[0] + (A.y - A.q.py) * A.q.n[1]), sb = Math.sign((Bc.x - Bc.q.px) * Bc.q.n[0] + (Bc.y - Bc.q.py) * Bc.q.n[1]); if (sa && sb && sa === sb) return;   // dalla stessa parte: è una forca, non un incrocio sfalsato
        const T0 = sul(A.M, (A.x + Bc.x) / 2, (A.y + Bc.y) / 2), tx = T0.px, ty = T0.py;
        [A, Bc].forEach(C => { const P = C.rd.pts, dx = tx - C.x, dy = ty - C.y, idx = C.e === 0 ? P.map((_, k) => k) : P.map((_, k) => P.length - 1 - k); let acc = 0;
          for (let j = 0; j < idx.length; j++) { const k = idx[j]; if (j) acc += dist(P[k][0], P[k][1], P[idx[j - 1]][0], P[idx[j - 1]][1]); const w = Math.max(0, 1 - acc / 24); if (w <= 0) break; P[k] = [P[k][0] + dx * w, P[k][1] + dy * w]; } });
        fatti.add(A); fatti.add(Bc); nAl++; }));
      CITY.capiAllineati = nAl; }
    CITY.roads.forEach(rd => roads.push(rd));
    ROADS0.filter(q => !['porto', 'monte', 'deserto', 'miniera', 'stazione2', 'saline', 'faro', 'crinale_e', 'sent_o1', 'sent_o2', 'sent_e1', 'sent_e2', 'anello_on', 'anello_os', 'mulattiera_o', 'anello_en', 'anello_es', 'mulattiera_e'].includes(q[0])).forEach(([id, name, w, kind, cp]) => roads.push({ id, name, w, kind, pts: rounded(rel(cp).map(q => [xn(q[0]), q[1]]), w > 5 ? 16 : 8, false) }));
    // [isola] le strade della testa di bosco e del collo, in coordinate nuove. La strada centrale sale col terreno e diventa mulattiera.
    // [altopiano] le vie del Tavolato. Su per i canaloni: dallo sbocco alla testata sul fondo (nel canalone di levante da una sponda
    // all'altra, nella spaccatura di ponente dritti per le lastre), poi fuori sul pianoro. La mulattiera: dalla costiera di mezzogiorno
    // a tornanti sul pendio di frana fra i gradoni, fino all'accampamento. La traccia del pianoro: dal canalone di levante alla pozza e
    // all'accampamento, la prateria, il belvedere sulla prua a maestrale, giù alla spaccatura di ponente.
    const canTrail = (c, N, zig) => { const out = []; for (let k = 0; k <= N; k++) { const al = c.out + 1 - (c.out + 1 - (c.in + 3)) * k / N, lat = k === 0 || k === N ? 0 : (k % 2 ? 1 : -1) * zig * Math.max(0, canHalf(al, c) - c.f - .5); out.push(canPt(c, al, lat).concat([canFloor(c, al)])); }
      const [tx, ty] = canPt(c, c.in - 5, 0); out.push([tx, ty, tavTop(tx, ty)]); return out; };
    const CE = canTrail(CANALI[0], 9, .55), CO = canTrail(CANALI[1], 6, 0), footE = CE[0], footO = CO[0];
    const tavR0 = a => 58 * RID.s * (.95 + .1 * fbm(Math.cos(a) * 1.05 + 4, Math.sin(a) * 1.05 + 4, 401, 2));   // [altopiano] il Sentiero del Bosco Antico resta dov'era (gira largo attorno al Tavolato, fra il ghiaione e la costiera)
    const aroundTav = []; for (let a = .02; a > -2.62; a -= .1) { const R = tavR0(a) + 34 + 4 * Math.sin(a * 3); aroundTav.push([TAV.x + Math.cos(a) * R, TAV.y + Math.sin(a) * R]); }
    const PA = (a, e) => { const R = tavR(a) + e; return [TAV.x + Math.cos(a) * R, TAV.y + Math.sin(a) * R]; };   // un punto a e metri dal ciglio, nella direzione a
    const TAVP = { campo: tavP(19, 18), centro: tavP(-8, -2), prateria: tavP(-18, -8), belvedere: PA(TAV.dip - Math.PI, -5.5) };   // i posti del pianoro
    const MULP = [ringNear(...PA(1.25, 64)), PA(1.5, 52), PA(1.0, 45), PA(1.5, 37), PA(1.0, 29), PA(1.5, 21), PA(1.0, 13), PA(1.5, 5), PA(1.22, -3), tavP(14, 22), TAVP.campo];
    const TOPP = [CE[CE.length - 1].slice(0, 2), tavP(20, 0), TAVP.campo, tavP(2, 20), tavP(-6, 8), TAVP.centro, tavP(-20, -4), TAVP.belvedere, tavP(-22, 9), CO[CO.length - 1].slice(0, 2)];
    const NEWR = [   // [isola-ridotta] i vertici scritti nel disegno, portati sulla mappa (PP); quelli dei canaloni sono già sulla mappa
      ['deserto', 'Strada del Bosco', 6, 'strada', [PP(680, 150), PP(646, 151), PP(612, 154), PP(578, 160), PP(548, 166), PP(522, 172)]],
      ['memoria', 'Via della Memoria', 3, 'sterrato', [PP(522, 172), PP(492, 178), PP(460, 186), PP(428, 192), PP(396, 198), PP(364, 203), PP(332, 205), PP(304, 203), PP(282, 200), [footE[0] + 6, footE[1] + 1], footE.slice(0, 2)]],
      ['canale_e', 'Sentiero del Canalone di levante', 2.6, 'sterrato', CE, true, { G: CANALI[0].G, traccia: true }],
      ['canale_o', 'Sentiero del Canalone di ponente', 2.8, 'sterrato', CO, true, { G: CANALI[1].G, traccia: true }],   // [altopiano] la spaccatura: si sale a gradini, tutta la larghezza del fondo
      ['tav_top', 'Traccia del Tavolato', 2, 'sterrato', TOPP, false, { traccia: true }],
      ['mulattiera_tav', 'Mulattiera del Tavolato', 2.6, 'sterrato', MULP, false, { G: .2, traccia: true }],   // [altopiano] la mulattiera: 2,6 m, a gradini dove tira
      ['bosco_antico', 'Sentiero del Bosco Antico', 2, 'sterrato', [footE.slice(0, 2)].concat(aroundTav, [footO.slice(0, 2)])],
      ['sent_faro', 'Sentiero del faro', 2, 'sterrato', [footO.slice(0, 2), PP(70, 168), PP(56, 190), PP(48, 206)]],
      ['miniera', 'Pista della Stazione Nord', 5, 'sterrato', [ringNear(...PP(252, 52)), PP(244, 66), PP(234, 80)]],
      ['stazione2', 'Pista della Stazione Sud', 5, 'sterrato', [ringNear(...PP(270, 360)), PP(266, 340), PP(262, 322)]],
      ['saline', 'Pista delle saline', 3, 'sterrato', [ringNear(...PP(112, 340)), PP(104, 324), PP(100, 314)]],
      ['faro', 'Pista della Punta', 3, 'sterrato', [ringNear(...PP(62, 214)), PP(50, 213)]],
      ['campo_p', 'Traccia del campo', 2, 'sterrato', [ringNear(...PP(92, 72)), PP(96, 100), PP(98, 126)]],
    ];
    NEWR.forEach(([id, name, w, kind, cp, hq, op]) => {
      const pts = hq ? chaikin(cp.map(q => [q[0], q[1]]), 2) : chaikin(cp, 3), rd = Object.assign({ id, name, w, kind, pts, monte: true }, op || {});   // [altopiano] op.G: la pendenza massima del sentiero (la spaccatura si sale a gradini)
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
      // [città2] la Collina Nera ora è il borgo: i suoi sentieri non ci sono più
      T1.filter(q => q[2][0] < 985).forEach(([id, name, from, to, R]) => { const pts = trace(from, to, R); if (!pts) return; const rd = { id, name, w: 1.4, kind: 'sterrato', pts, monte: true, traccia: true }; roads.push(rd); mark(rd);
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
      const half = rd.w / 2, walk = rd.kind === 'citta' || rd.kind === 'litoranea' ? 2 : 0, cap = rd.capi || [], kL = rd.pts.length - 2;   // [incroci] dove la via ha la sua chiusura il capo è dritto
      for (let k = 0; k < rd.pts.length - 1; k++) {
        const [ax, ay] = rd.pts[k], [bx, by] = rd.pts[k + 1], L = dist(ax, ay, bx, by) || 1;
        const minx = Math.floor((Math.min(ax, bx) - half - walk - 2) / TS), maxx = Math.ceil((Math.max(ax, bx) + half + walk + 2) / TS);
        const miny = Math.floor((Math.min(ay, by) - half - walk - 2) / TS), maxy = Math.ceil((Math.max(ay, by) + half + walk + 2) / TS);
        for (let ty = miny; ty <= maxy; ty++) for (let tx = minx; tx <= maxx; tx++) {
          if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) continue;
          const x = tx * TS + 1, y = ty * TS + 1, t0 = ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / (L * L), t = clamp(t0, 0, 1);
          if ((k === 0 && cap[0] && t0 < 0) || (k === kL && cap[1] && t0 > 1)) continue;
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
    const yOnP0 = (P, x) => { for (let k = 0; k < P.length - 1; k++) { const a = P[k], c = P[k + 1]; if (a[0] !== c[0] && (x - a[0]) * (x - c[0]) <= 0) return a[1] + (c[1] - a[1]) * (x - a[0]) / (c[0] - a[0]); } return null; };
    // [pianta] la colmata del Lungomare di Tramontana: dove il mare mangiava la riva (scogli sparsi, la ferrovia sul ciglio) la terra arriva
    // fino al filo del parapetto; fuori, una banchina di un metro e mezzo (il ciglio della scogliera di massi, che è un pezzo, in acqua)
    if (CITY.lungN) { const P = CITY.lungN, dP = (x, y) => { let m = 1e9; for (let k = 0; k < P.length - 1; k++) { const [ax, ay] = P[k], [bx, by] = P[k + 1], vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy || 1, t = clamp(((x - ax) * vx + (y - ay) * vy) / L2, 0, 1); m = Math.min(m, dist(x, y, ax + vx * t, ay + vy * t)); } return m; };
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; P.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
      for (let ty = T2i(y0 - 16); ty <= T2i(y1 + 9); ty++) for (let tx = T2i(x0 - 9); tx <= T2i(x1 + 9); tx++) { const i = ty * GW + tx, x = tx * TS + 1, y = ty * TS + 1, d = dP(x, y);
        if (d > 7.2) { const yr = yOnP0(P, x); if (d < 16 && yr !== null && y < yr && x < 1144 && grid[i] !== T.WATER) { grid[i] = T.ROCK; reserved[i] = 1; } continue; }   // oltre il parapetto solo scogli: niente case fra il lungomare e il mare
        const sea = grid[i] === T.WATER || grid[i] === T.ROCK || grid[i] === T.SAND;
        if (d <= 5.6) { if (sea || elev[i] < 1) { grid[i] = T.COB; zone[i] = Z.CITTA; elev[i] = 1.4; } const yr = yOnP0(P, x); if (d > 4.4 && yr !== null && y < yr && x < 1144) { grid[i] = T.QUAY; zone[i] = Z.CITTA; elev[i] = Math.max(elev[i], 1.4); reserved[i] = 1; } }   // il ciglio sul mare: il marciapiede lo dipinge la strada, il resto è banchina
        else { const yr = yOnP0(P, x); if (sea || (yr !== null && y < yr && x < 1144)) { grid[i] = T.QUAY; zone[i] = Z.CITTA; elev[i] = Math.max(elev[i], 1.4); reserved[i] = 1; } } }
      // le pozze rimaste fra la colmata e la riva vecchia (davanti alle baracche) si riempiono: niente mare chiuso dietro la strada
      for (let tx = T2i(x0); tx <= T2i(Math.min(x1, 1140)); tx++) { const x = tx * TS + 1, yr = yOnP0(P, x); if (yr === null) continue;
        for (let ty = T2i(yr + 5); ty <= T2i(yr + 18); ty++) { const i = ty * GW + tx, v = grid[i]; if (!(v === T.WATER || v === T.ROCK || v === T.SAND)) { if (v !== T.COB && v !== T.QUAY) break; continue; } grid[i] = T.COB; zone[i] = Z.CITTA; elev[i] = Math.max(elev[i], 1.2); if (!(x > 970 && x < 992 && ty * TS > 64)) reserved[i] = 1; } } }   // [pianta] resta il piazzale delle baracche sul lungomare (niente lamiere fra la strada e Radio Luna)
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
    // posti barca lungo un pontile: le barche stanno di poppa (la prua verso il largo), perpendicolari, a passo `step`, sui due lati
    const fingers = (S, from, step, kinds, r0, sides) => {
      const [a, b] = [S.pts[0], S.pts[S.pts.length - 1]], L = dist(a[0], a[1], b[0], b[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
      (sides || [1, -1]).forEach(sg => { for (let s = from; s < L - 1.5; s += step) { if (r0() < .18) continue; const kind = kinds[Math.floor(r0() * kinds.length)], len = BOATLEN[kind], off = S.w / 2 + .5 + len / 2, nx = -uy * sg, ny = ux * sg;
        SEA.moorings.push({ kind, x: a[0] + ux * s + nx * off, y: a[1] + uy * s + ny * off, ang: Math.atan2(ny, nx), len, at: S.id, drive: kind === 'gozzo' || kind === 'lancia' || kind === 'motoscafo' }); } });   // drive: si può prendere (è un mezzo del motore)
    };
    const BOATLEN = { gozzo: 5, lancia: 6, barca_vela: 8, motoscafo: 7, peschereccio: 11, motovedetta: 13, nave: 44, rimorchiatore: 14, pedalo: 2.6, secca: 4.6, chiatta: 5.2 };
    const rs = rng(4242);
    // -- il porto vecchio, sotto il centro: la banchina dritta (la Calata), il Molo Vecchio che fa da diga (gomito verso levante,
    //    lanterna rossa), il Molo di Levante più corto (lanterna verde), tre pontili per le barche, lo scalo del cantiere.
    const PV = { qy: 192, x0: 958, x1: 1078 };
    const mVecchio = molo('molo_vecchio', 'Molo Vecchio', [[PV.x0, 186], [PV.x0, 226], [966, 236], [978, 240], [1042, 241]], 5, 1.3, 1, 'rosso');
    // [posa] il Molo di Levante è il pezzo «molo a gomito» (pezzi_citta.js): un braccio dritto verso sud e il gomito verso ponente
    const mLevante = molo('molo_levante', 'Molo di Levante', [[1080, 186], [1080, PV.qy + 23.25], [1066, PV.qy + 23.25]], 4.5, 1.3, 0, 'verde');   // [posa] la scogliera la fa il pezzo mLevante.pezzo = 'molo_vecchio';
    // [posa] la darsena davanti alla calata (32 × 29 m con le banchine, la bocca a sud): le tre banchine sono calata (QUAY), dentro resta l'acqua
    const DARS = { x0: 1044, x1: 1076, y0: PV.qy, y1: PV.qy + 29, b: 6 };
    paintLine([[DARS.x0 + 3, DARS.y0], [DARS.x0 + 3, DARS.y1 - 1]], 6, T.QUAY, 1, Z.CITTA); paintLine([[DARS.x1 - 3, DARS.y0], [DARS.x1 - 3, DARS.y1 - 1]], 6, T.QUAY, 1, Z.CITTA);
    paintLine([[DARS.x0, DARS.y0 + 3], [DARS.x1, DARS.y0 + 3]], 6, T.QUAY, 1, Z.CITTA);
    SEA.basins.push({ id: 'porto_vecchio', name: 'Porto vecchio', poly: [[PV.x0 + 3, PV.qy], [1077, PV.qy], [1075, 210], [1063, 224], [1042, 237], [978, 237], [962, 230], [PV.x0 + 3, 220]], depth: 4.5, mouth: [1053, 233] });
    const PONTI = [['pontile_ovest', 'Pontile dei gozzi', 990], ['pontile_centro', 'Pontile della Marina', 1013], ['pontile', 'Pontile Est', 1037]];
    PONTI.forEach(([id, name, px], k) => { const S = pontile(id, name, [[px, PV.qy - 1], [px, PV.qy + 25]], 2.5, .75, [[px - 4, PV.qy + 25], [px + 4, PV.qy + 25]]);
      fingers(S, 4, 4.2, k === 0 ? ['gozzo', 'gozzo', 'lancia'] : k === 1 ? ['barca_vela', 'motoscafo', 'barca_vela', 'lancia'] : ['motoscafo', 'lancia', 'gozzo'], rs); });
    // i pescherecci all'interno del Molo Vecchio, di fianco
    [990, 1004.5, 1019].forEach((x, k) => SEA.moorings.push({ kind: 'peschereccio', x, y: 241 - 2.5 - 2.6, ang: k % 2 ? 0 : Math.PI, len: BOATLEN.peschereccio, at: 'molo_vecchio' }));
    // il rimorchiatore e una motovedetta della Guardia alla Calata, verso il Molo di Levante
    SEA.moorings.push({ kind: 'motovedetta', x: 1060, y: PV.qy + 15, ang: Math.PI / 2, len: BOATLEN.motovedetta, at: 'calata' });   // [posa] dentro la darsena
    // lo scalo del cantiere: scivolo di cemento con le rotaie, una barca in secca sul carrello in cima
    SEA.structs.push({ type: 'scalo', id: 'scalo_cantiere', name: 'Scalo del cantiere', pts: [[970, PV.qy - 4], [970, PV.qy + 12]], w: 6, pezzo: 'scalo_alaggio' });
    // -- il porto cargo e militare, oltre la Base: moli di pietra larghi, la nave dell'Impero di fianco al molo nord, le motovedette
    // [rocca2] lo scoglio della Rocca ha i due moli a sud, ai lati della porta d'acqua della darsena (a nord e in punta il frangiflutti)
    molo('molo_cargo_s1', 'Molo militare', [[1226, southY(614) - 4], [1226, southY(614) + 34]], 9, 1.4, 0, 'rosso');
    molo('molo_cargo_s2', 'Molo dei rimorchiatori', [[1252, southY(640) - 4], [1252, southY(640) + 34]], 9, 1.4, 0, 'verde');
    SEA.moorings.push({ kind: 'nave', x: 1252 + 4.5 + 6.5, y: southY(640) + 24, ang: Math.PI / 2, len: BOATLEN.nave, at: 'molo_cargo_s2' });
    [0, 1].forEach(k => SEA.moorings.push({ kind: 'motovedetta', x: 1226 - 4.5 - 2.4, y: southY(614) + 9 + k * 15, ang: Math.PI / 2, len: BOATLEN.motovedetta, at: 'molo_cargo_s1' }));
    SEA.moorings.push({ kind: 'rimorchiatore', x: 1226 + 4.5 + 2.8, y: southY(614) + 22, ang: Math.PI / 2, len: BOATLEN.rimorchiatore, at: 'molo_cargo_s1' });
    SEA.moorings.push({ kind: 'peschereccio', x: 1252 - 4.5 - 2.6, y: southY(640) + 26, ang: Math.PI / 2, len: BOATLEN.peschereccio, at: 'molo_cargo_s2' });
    // -- il Lido: un pontiletto per i pedalò e le barche a remi del bagnino
    { const lx = 1124, ly = SouthY(1124); pontile('pontile_lido', 'Pontile del Lido', [[lx, ly - 3], [lx, ly + 12]], 1.8, .6);
      [-1, 1].forEach(sg => [4, 7.5].forEach(s => SEA.moorings.push({ kind: 'pedalo', x: lx + sg * 2.6, y: ly + s, ang: sg > 0 ? Math.PI : 0, len: BOATLEN.pedalo, at: 'pontile_lido' })));
      SEA.moorings.push({ kind: 'chiatta', x: lx + 3.4, y: ly + 11.5, ang: Math.PI / 2, len: BOATLEN.chiatta, at: 'pontile_lido', drive: true }); }   // [chiatta] di fianco alla testata, la prua al largo
    void mVecchio; void mLevante;
    SEA.ruins = [];   // [arcipelago] le rovine delle isole le mette expand()
    // piazza San Rocco e fontana
    { const q = CITY.piazza; for (let ty = T2i(q[1]); ty < T2i(q[3]); ty++) for (let tx = T2i(q[0]); tx < T2i(q[2]); tx++) { const i = ty * GW + tx; if (grid[i] !== T.VIA && grid[i] !== T.WATER) { grid[i] = T.PIAZZA; roadW[i] = 0; } } }
    blob(1108, 124, 2.2, 2.2, i => { grid[i] = T.FOUNT; });   // [città2] il pozzo nella sua piazzetta
    // [città2] le piazze messe apposta: la Marina sull'acqua, il Mercato ottagonale (l'ottagono regolare: |dx|, |dy| e |dx|+|dy|/√2 entro il raggio)
    CITY.rects.forEach(q => { for (let ty = T2i(q[1]); ty < T2i(q[3]); ty++) for (let tx = T2i(q[0]); tx < T2i(q[2]); tx++) { const i = ty * GW + tx; if (grid[i] !== T.VIA && grid[i] !== T.WATER) { grid[i] = T.PIAZZA; roadW[i] = 0; } } });
    if (CITY.octa) { const [ox, oy, orr] = CITY.octa; for (let ty = T2i(oy - orr); ty <= T2i(oy + orr); ty++) for (let tx = T2i(ox - orr); tx <= T2i(ox + orr); tx++) {
      const dx = Math.abs(tx * TS + 1 - ox), dy = Math.abs(ty * TS + 1 - oy), i = ty * GW + tx; if (dx > orr || dy > orr || dx + dy > orr * Math.SQRT2 || grid[i] === T.WATER) continue; grid[i] = T.PIAZZA; roadW[i] = 0; reserved[i] = 1; } }
    // [città2] E2 fra la Via della Marina e l'acqua nessuno costruisce: la calata lastricata davanti al porto vecchio, poi la spiaggia del lido
    if (CITY.marina) for (let tx = T2i(1000); tx < T2i(1166); tx++) { const x = tx * TS + 1, ym = CITY.yOn(CITY.marina, x) + 2;
      for (let ty = T2i(ym) + 1; ty < GH; ty++) { const i = ty * GW + tx; if (grid[i] === T.WATER || grid[i] === T.PIER) break; if (roadW[i] > 0) continue; grid[i] = x < 1088 ? T.QUAY : T.SAND; reserved[i] = 1; } }
    // [città2] la ferrovia: la massicciata sul rilevato (nessuno ci costruisce sopra); le mura di tramontana sopra gli scogli del borgo
    if (CITY.rail) {
      CITY.rail.forEach(([x, y]) => { for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) { if (a * a + b * b > 9.5) continue; const tx = Math.floor((x + a) / TS), ty = Math.floor((y + b) / TS); if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) continue; const i = ty * GW + tx; if (grid[i] === T.WATER || roadW[i] > 0) continue; grid[i] = T.GRAVEL; reserved[i] = 1; } });
      // [pianta] fra il marciapiede del Lungomare e la massicciata la striscia del guardrail: niente case schiacciate fra la strada e i binari
      if (CITY.lungN) CITY.lungN.forEach(([x, y]) => { if (x < 1030 || x > 1141) return; const yr = CITY.railY(x); for (let yy = yr - 6; yy <= yr - 2; yy += 1) { const i = T2i(yy) * GW + T2i(x); if (grid[i] === T.WATER || roadW[i] > 0) continue; grid[i] = T.GRAVEL; reserved[i] = 1; } });
      for (let tx = T2i(1000); tx < T2i(CITY.spian0); tx++) { const y0 = CITY.muraY(tx * TS + 1); for (let ty = T2i(y0); ty <= T2i(y0 + 5); ty++) { const i = ty * GW + tx; if (grid[i] === T.WATER || roadW[i] > 0) continue; grid[i] = T.COB; reserved[i] = 1; } }
    }
    // [città2] il parco della metropoli: prato, alberi in filari lungo i bordi e a macchie dentro, due vialetti in croce e uno in diagonale,
    // la vasca in mezzo. Le caselle restano riservate: niente case dentro.
    if (CITY.park) { const q = CITY.park, x0 = T2i(q[0]), y0 = T2i(q[1]), x1 = T2i(q[2]), y1 = T2i(q[3]), cx = (x0 + x1) >> 1, cy = (y0 + y1) >> 1;
      for (let ty = y0; ty < y1; ty++) for (let tx = x0; tx < x1; tx++) { const i = ty * GW + tx; if (grid[i] === T.VIA || grid[i] === T.WATER) continue;
        const edge = tx === x0 || ty === y0 || tx === x1 - 1 || ty === y1 - 1, path = tx === cx || ty === cy || Math.abs((tx - x0) - (ty - y0) * (x1 - x0) / (y1 - y0)) < .7;
        grid[i] = path ? T.WALK : edge ? ((tx + ty) % 3 === 0 ? T.TREE : T.GRASS) : (hash2(tx, ty, 1601) < .14 ? T.TREE : hash2(tx, ty, 1602) < .1 ? T.SHRUB : T.GRASS);
        roadW[i] = 0; reserved[i] = 1; }
      blob((cx + .5) * TS, (cy + .5) * TS, 2.4, 2.4, i => { grid[i] = T.FOUNT; }); }
    (CITY.piazzette || []).forEach(([x, y, rr]) => blob(x, y, rr, rr * .8, i => { if (grid[i] !== T.VIA && grid[i] !== T.WATER && grid[i] !== T.BLD) { grid[i] = T.PIAZZA; roadW[i] = 0; } }));   // [isola] le piazzette dei vicoli
    { const q = GOV.piazza; for (let ty = T2i(q[1]); ty < T2i(q[3]); ty++) for (let tx = T2i(q[0]); tx < T2i(q[2]); tx++) { const i = ty * GW + tx; if (grid[i] !== T.VIA && grid[i] !== T.WATER) { grid[i] = T.PIAZZA; roadW[i] = 0; } } }   // [isola] Piazza del Governo
    blob(xn(205), 108, 7, 5, i => { if (grid[i] !== T.VIA) grid[i] = T.PIAZZA; });            // piazzetta di San Giacomo
    // [città2] la piazza d'armi sta dentro la Rocca (blocco della Rocca, più sotto)
    // [città2] l'eliporto della Base non c'è più: dentro la Rocca non ci sta
    // [città2] la cava e la discarica stavano dove ora c'è la spianata: la discarica va sugli scogli di ponente, accanto ai binari
    blob(770, 64, 7, 4, i => { if (grid[i] !== T.VIA && grid[i] !== T.WATER && grid[i] !== T.GRAVEL) grid[i] = T.DIRT; });              // discarica
    blob(xn(164), 102, 7, 5, i => { if (grid[i] !== T.VIA && grid[i] !== T.DIRT) grid[i] = T.GRASS; });   // radura dell'ovile
    blob(xn(170), 130, 6, 5, i => { if (grid[i] === T.TREE) grid[i] = T.GRASS; });           // radura del pastore
    blob(xn(588), 166, 12, 6, i => { if (grid[i] !== T.VIA) grid[i] = T.DIRT; });            // poligono della Base
    blob(...PP(234, 78), 9, 6, i => { if (grid[i] !== T.VIA) grid[i] = T.DIRT; });              // piazzale della Stazione Nord
    blob(...PP(262, 324), 9, 6, i => { if (grid[i] !== T.VIA) grid[i] = T.DIRT; });             // piazzale della Stazione Sud
    blob(...TAVP.campo, 10, 7, i => { if (grid[i] === T.SHRUB || grid[i] === T.FIELD || grid[i] === T.TREE) grid[i] = T.GRASS; }); // accampamento dei beduini, in cima al Tavolato   [altopiano] al riparo, sull'orlo della Dolina della Pozza (l'acqua)
    // radure sulle colline: bivacchi, monolite, spiazzi da campeggio (alberi tolti, si vede chi c'è)
    [[284, 132, 5], [322, 142, 5], [260, 146, 4], [262, 154, 4], [300, 110, 5], [336, 168, 4], [240, 128, 4]].forEach(([x, y, rr]) => blob(xn(x), y, rr, rr, i => { if (grid[i] === T.TREE || grid[i] === T.SHRUB) grid[i] = T.GRASS; }));
    // ================= [posa] I PEZZI URBANI GRANDI AL LORO POSTO (pezzi_citta.js) =================
    // Ogni pezzo nasce dove la storia lo mette e si prende il suo suolo PRIMA che il tassellatore costruisca: sotto i volumi chiusi le
    // caselle diventano BLD riservate (si urta), sotto le opere aperte PIAZZA, WALK, QUAY o la massicciata; le strade restano strade
    // (sotto i portici, gli archi e i sottopassi si passa). Il pezzo ha la sua origine (x, y), rot = rotation.y (il locale +X corre
    // lungo il pezzo, il fronte guarda +Z), opz = le opzioni di PezziCitta.make; q (la quota di posa) si fissa in fondo, a terreno finito.
    // In expand() tutto si sposta di OX/OY: W.pezzi è in coordinate finali.
    const PEZZI = [], PZ = (tipo, x, y, rot, opz, ex) => { const p = Object.assign({ tipo, x, y, rot: rot || 0, opz: opz || {} }, ex || {}); PEZZI.push(p); return p; };
    const pzW = (p, lx, lz) => { const c = Math.cos(p.rot), s = Math.sin(p.rot); return [p.x + lx * c + lz * s, p.y - lx * s + lz * c]; };
    const pzL = (p, wx, wy) => { const c = Math.cos(p.rot), s = Math.sin(p.rot), dx = wx - p.x, dy = wy - p.y; return [dx * c - dy * s, dx * s + dy * c]; };
    const pzAt = (tipo, wx, wy, rot, lx, lz, opz, ex) => { const p = PZ(tipo, 0, 0, rot, opz, ex), [ax, ay] = pzW(p, lx, lz); p.x = wx - ax; p.y = wy - ay; return p; };   // il punto locale (lx, lz) cade in (wx, wy)
    const pzCells = (p, x0, x1, z0, z1, f) => { const C = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([a, b]) => pzW(p, a, b)); let ax = 1e9, ay = 1e9, bx = -1e9, by = -1e9; C.forEach(([x, y]) => { ax = Math.min(ax, x); ay = Math.min(ay, y); bx = Math.max(bx, x); by = Math.max(by, y); });
      for (let ty = Math.max(0, Math.floor(ay / TS)); ty <= Math.min(GH - 1, Math.floor(by / TS)); ty++) for (let tx = Math.max(0, Math.floor(ax / TS)); tx <= Math.min(GW - 1, Math.floor(bx / TS)); tx++) { const [lx, lz] = pzL(p, tx * TS + 1, ty * TS + 1); if (lx >= x0 && lx <= x1 && lz >= z0 && lz <= z1) f(ty * GW + tx, tx, ty); } };
    const TKP = { B: T.BLD, P: T.PIAZZA, W: T.WALK, Q: T.QUAY, F: T.FOUNT, G: T.GRAVEL, C: T.COB };
    const pzRis = (p, k, x0, x1, z0, z1) => { (p.imp = p.imp || []).push([k, x0, x1, z0, z1]); pzCells(p, x0, x1, z0, z1, i => { if (roadW[i] > 0 || bIndex[i] >= 0 || (grid[i] === T.WATER && k !== 'Q')) return; grid[i] = TKP[k]; reserved[i] = 1; }); };
    const RDp = id => CITY.roads.find(rd => rd.id === id), ryP = CITY.railY, yOnP = CITY.yOn, VY = 143;
    const lungo = (P, f) => { let L = 0; const S = [0]; for (let k = 1; k < P.length; k++) S.push(L += dist(P[k - 1][0], P[k - 1][1], P[k][0], P[k][1]));
      const s = f * L; let k = 1; while (k < P.length - 1 && S[k] < s) k++; const a = P[k - 1], b = P[k], t = (s - S[k - 1]) / ((S[k] - S[k - 1]) || 1), l = dist(a[0], a[1], b[0], b[1]) || 1; return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, ux: (b[0] - a[0]) / l, uy: (b[1] - a[1]) / l, L }; };
    const POSA = { PZ, pzW, pzL, pzAt, pzCells, pzRis };
    if (CITY.rail && CITY.spian0) {
      // E4 la torre littoria sull'angolo della piazza d'adunata dove la Vittoria riparte verso la Rocca; l'arengario guarda l'asse
      // [volumi2] la torre sta nella cortina nord della piazza (ristretta) e ne sporge di un metro con l'arengario: è l'unico alto della Vittoria
      // [cucitura] la torre littoria non sta più sulla piazza: è la torre di guardia del Recinto del Garante, al porto (più sotto)
      // E4 i portici della Vittoria: [cucitura] su un lato solo, il nord (il lato lontano dalla camera): la fascia fra il marciapiede
      // (5 m dall'asse) e le case (9 m) resta libera, il portico la copre; a sud il marciapiede e subito le case (da 5 m)
      POSA.port = { x0: 1024, x1: CITY.spian0 - .5, d0: 5, d1: 9, lati: [0] };   // lati: 0 il nord, 1 il sud
      for (let ty = T2i(VY - 14); ty <= T2i(VY - 1); ty++) for (let tx = T2i(POSA.port.x0); tx < T2i(POSA.port.x1); tx++) { const i = ty * GW + tx, d = Math.abs(ty * TS + 1 - VY);
        if (d <= POSA.port.d0 || d >= POSA.port.d1 || roadW[i] > 0 || grid[i] === T.WATER) continue; grid[i] = T.WALK; reserved[i] = 1; }
      // [cucitura] la fermata del Mercato: con la via stretta, fra la tettoia e il Corso uno slargo di 9 × 8 m a nord della via (la pensilina, nessuna porta davanti)
      for (let ty = T2i(VY - 13); ty < T2i(VY - 5); ty++) for (let tx = T2i(968); tx < T2i(977); tx++) { const i = ty * GW + tx; if (roadW[i] > 0 || grid[i] === T.WATER) continue; grid[i] = T.WALK; reserved[i] = 1; }
      // E3 la Piazza del Mercato: la tettoia in ghisa sull'ottagono (già piazza riservata)
      // [pianta] la tettoia di 28 m pesava sulla vista e prendeva tutta la piazza: il mercato è sceso sulla spianata. L'ottagono resta piazza,
      // alberata (otto lecci sull'anello) con la fontana in mezzo; lo spazio torna alla città (panchine, gente, il passeggio)
      if (CITY.octa) { const [ox, oy, orr] = CITY.octa; PZ('fontana', ox, oy, 0, { r: 2.6, h: 3, lati: 8, cannelle: 4 }, { nome: 'Fontana dell\'Ottagono' }); blob(ox, oy, 3.1, 3.1, i => { if (grid[i] !== T.BLD && roadW[i] === 0) grid[i] = T.FOUNT; });
        for (let k = 0; k < 8; k++) { const a = (k + .5) * Math.PI / 4, i = T2i(oy + Math.sin(a) * (orr - 6)) * GW + T2i(ox + Math.cos(a) * (orr - 6)); if (grid[i] === T.PIAZZA && roadW[i] === 0) grid[i] = T.TREE; } }   // [pedonale] un metro e mezzo più dentro (prima a orr - 4,5): gli angoli restano liberi per le scale dei gradoni che ci arrivano
      // E3 la stazione in testa alla griglia: il fabbricato fra il binario e la Via della Stazione, il marciapiede col binario di corsa
      // (quello del treno: il pezzo non ne disegna un altro), il piazzale fino alla via; sul lato del mare il tronchino merci col
      // suo rilevato, la locomotiva da manovra e un carro fermi
      { const S = POSA.staz = { x0: 934, L: 30 };   /* [mappa_compatta] la stazione è la porta ovest della città ([pianta] 2 m più a levante: la Via Alta le gira attorno senza toccarne l'angolo) */ S.xc = S.x0 + S.L / 2; S.ry = ryP(S.xc);
        const p = PZ('stazione', S.x0, S.ry + 13.25, 0, { L: S.L, piani: 2, binari: 0, piazzale: false, pensilina: true, orologio: true, nome: 'PORTO VECCHIO' }, { nome: 'Stazione' }); S.p = p;
        pzRis(p, 'B', -.5, S.L + 3, -11.6, 6.4);   // [pianta] dal lato della Via Alta il margine è mezzo metro: la via gira sull'angolo del fabbricato, non dentro la sua scatola
        S.yRoad = CITY.pzStaz[3]; pzRis(p, 'P', -2, S.L + 4, 6.4, S.yRoad - p.y);
        const t = PZ('binari', S.x0 + S.L - 2, S.ry - 4.2, Math.PI, { L: 22, binari: 1, rilevato: true, hRilevato: 3, palo: true }, { nome: 'Tronchino merci', tronchino: true }); S.tr = t;
        pzRis(t, 'G', 0, 22, -1.5, 5.4);
        S.loco = PZ('locomotiva', t.x - 3, t.y, Math.PI, { colore: 'castano', numero: 'LM 6031' }, { nome: 'Locomotiva da manovra', suTronchino: 3 });
        S.carro = PZ('carro_merci', t.x - 13.5, t.y, Math.PI, { aperto: true, colore: 'castano' }, { nome: 'Carro merci', suTronchino: 13.5 }); }
      // E3 la Via Cavour passa sotto il rilevato nel sottopasso; dalla Via della Stazione ci si scende per una scalinata fra due muri
      if (CITY.cavS) { const C = CITY.cavS, y = ryP(C.x);
        C.p = PZ('sottopasso', C.x - 7, y, 0, { L: 14, w: 4, h: 3.2, binario: false, hRilevato: 4.8 }, { nome: 'Sottopasso della Via Cavour' }); pzRis(C.p, 'B', -.5, 14.5, -5.5, 4.5);   // [mappa_compatta] un bordo in più verso le baracche: la casa non morde la spalla del fornice
        for (let ty = T2i(y - 9); ty <= T2i(y - 4.5); ty++) for (let tx = T2i(C.x - 7); tx <= T2i(C.x + 7); tx++) { const i = ty * GW + tx; if (grid[i] !== T.WATER && roadW[i] === 0 && !reserved[i]) { grid[i] = T.COB; reserved[i] = 1; } }   /* [mappa_compatta] lo slargo davanti al fornice, verso le baracche: la scala di ferro del rilevato ci posa i piedi */
        C.ps = PZ('scalinata', C.x, y + 7.5, -Math.PI / 2, { w: 3.6, dislivello: 3, pianerottoli: 1, lampada: true }, { nome: 'Scalinata della Stazione' });
        for (let ty = T2i(y + 4.5); ty <= T2i(C.y1 - 3.5); ty++) for (const tx of [T2i(C.x - 3), T2i(C.x + 3) - 1]) { const i = ty * GW + tx; if (roadW[i] > 0 || grid[i] === T.WATER) continue; grid[i] = T.BLD; reserved[i] = 1; } }
      // E3 il passaggio a livello dove la Via della Stazione scavalca i binari: sbarre alzate, il casello del guardiano verso il mare
      { const va = RDp('lung_nord') || RDp('via_alta'); let best = null, bd = 1e9;   /* [pianta] le sbarre dove il lungomare passa i binari */ if (va) va.pts.forEach(q => CITY.rail.forEach((r0, k) => { const d = dist(q[0], q[1], r0[0], r0[1]); if (d < bd) { bd = d; best = k; } }));
        if (best !== null && bd < 6) { const R = CITY.rail, a = R[Math.max(0, best - 2)], b = R[Math.min(R.length - 1, best + 2)], l = dist(a[0], a[1], b[0], b[1]) || 1, ux = (b[0] - a[0]) / l, uy = (b[1] - a[1]) / l, w = 8;
          const p = pzAt('passaggio_livello', R[best][0], R[best][1], Math.atan2(-uy, ux), (w + 14) / 2, 0, { w, aperto: true, casello: true }, { nome: 'Passaggio a livello' });
          pzRis(p, 'B', (w + 14) / 2 + w / 2 + .7, (w + 14) / 2 + w / 2 + 5.5, -8.8, -4); pzRis(p, 'P', 6, 16, -12, 12); pzCells(p, -1, w + 16, -14, 14, i => { if (roadW[i] === 0) reserved[i] = 1; }); } }   /* [mappa_compatta] attorno alle sbarre niente baracche */
      // E2 la marina: i magazzini a volta in fila sulla calata, fra un vicolo e l'altro (8 m l'uno, 10 m di fondo, la volta verso il mare)
      if (CITY.marina) { const MAR = CITY.marina, runs = []; let a = null;
        const okC = (x, y) => { const i = Math.floor(y / TS) * GW + Math.floor(x / TS); return roadW[i] === 0 && !reserved[i] && grid[i] !== T.WATER && grid[i] !== T.PIAZZA && grid[i] !== T.QUAY; };
        for (let x = 1019; x <= 1062; x += 1) { const y0 = yOnP(MAR, x) - 5.7;   /* [pianta] dietro il marciapiede della Marina (7 m) */   /* [mappa_compatta] il primo della fila è il Magazzino Neri (edificio con nome) */ let ok = true; for (let d = 0; d <= 8; d += 1) if (!okC(x, y0 - d)) ok = false; if (ok) { if (a === null) a = x; } else { if (a !== null) runs.push([a, x - 1]); a = null; } }
        if (a !== null) runs.push([a, 1062]);
        runs.forEach(([xa, xb]) => { const n = Math.min(3, Math.floor((xb - xa - .6) / 8)); if (n < 1) return; const xs = (xa + xb) / 2 - n * 4, yf = Math.max(yOnP(MAR, xs), yOnP(MAR, xs + n * 8)) - 4.8;
          const p = PZ('magazzini_volta', xs, yf - 4, 0, { n, w: 8, p: 8, h: 5.2, aperti: [n - 1] }, { nome: 'Magazzini della calata' }); pzRis(p, 'B', -.6, n * 8 + .6, -4.6, 4.8); }); }
      // E2 la darsena, il Molo di Levante a gomito, lo scalo d'alaggio del cantiere
      PZ('darsena', DARS.x0, DARS.y0 + 16, 0, { L: 20, W: 20, banchina: 6, scalette: 2, hq: 1.4 }, { nome: 'Darsena', acqua: true });
      { const p = PZ('molo_vecchio', 1080, PV.qy - .5, -Math.PI / 2, { L1: 26, L2: 14, w: 4.5, hq: 1.75, paraonde: 2.4, lanterna: true }, { nome: 'Molo di Levante', acqua: true }); pzRis(p, 'Q', -2, 4, -8, 8); }   // la radice del molo sulla calata
      PZ('scalo_alaggio', 967, PV.qy, 0, { L: 12, w: 6, hq: 1.4, argano: true }, { nome: 'Scalo del cantiere', acqua: true });
      // [pianta] il Lungomare di Tramontana: il parapetto di pietra con la ringhiera sul mare, la scogliera di massi sotto, il guardrail verso
      // la ferrovia; a tratti di 12 m lungo la strada, solo dove davvero c'è il mare (o i binari) da quella parte
      if (CITY.lungN) { const P = CITY.lungN, S = [0]; for (let k = 1; k < P.length; k++) S.push(S[k - 1] + dist(P[k - 1][0], P[k - 1][1], P[k][0], P[k][1]));
        const at = s0 => { let k = 1; while (k < P.length - 1 && S[k] < s0) k++; const a = P[k - 1], b = P[k], L = (S[k] - S[k - 1]) || 1, t = clamp((s0 - S[k - 1]) / L, 0, 1); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
        const tI = (x, y) => T2i(y) * GW + T2i(x), mareA = (x, y) => { const i = tI(x, y); return grid[i] === T.WATER && zone[i] === Z.MARE; };
        const Lt = S[S.length - 1]; CITY.parapetti = 0;
        for (let s0 = 6; s0 + 12 < Lt - 4; s0 += 12) { const A = at(s0), B = at(s0 + 12), L = dist(A[0], A[1], B[0], B[1]), ux = (B[0] - A[0]) / L, uy = (B[1] - A[1]) / L, nx = uy, ny = -ux, rot = Math.atan2(-uy, ux);   // n: verso il mare (a sinistra di chi va a levante)
          const M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
          if (mareA(M[0] + nx * 9, M[1] + ny * 9) || mareA(M[0] + nx * 8, M[1] + ny * 8)) {
            PZ('parapetto', A[0] + nx * 5.5, A[1] + ny * 5.5, rot, { L: +L.toFixed(2), tipo: 'mare' }, { nome: 'Parapetto del Lungomare' }); CITY.parapetti++;
            PZ('scogliera', A[0] + nx * 9, A[1] + ny * 9, rot, { L: +L.toFixed(2), w: 4, n: Math.max(4, Math.round(L * 1.1)), seme: 300 + Math.round(s0) }, { nome: 'Scogliera del Lungomare', acqua: true }); }
          const yr = A[0] > 1030 && A[0] < 1136 ? CITY.railY(M[0]) : null;
          if (yr !== null && Math.abs(M[1] - nx * 0 + 10 - yr) < 4) PZ('parapetto', A[0] - nx * 5.4, A[1] - ny * 5.4, rot, { L: +L.toFixed(2), tipo: 'guardrail' }, { nome: 'Guardrail della ferrovia' }); } }
      // [pianta] la Via della Marina sul Lido: la ringhiera di pietra e ferro dove sotto c'è la spiaggia (sulla calata no: lì ci sono le bitte);
      // la Riva della Rocca: il parapetto sul canale, davanti al fronte di terra del castello
      { const MARp = CITY.marina, S = [0]; for (let k = 1; k < MARp.length; k++) S.push(S[k - 1] + dist(MARp[k - 1][0], MARp[k - 1][1], MARp[k][0], MARp[k][1]));
        const at = s0 => { let k = 1; while (k < MARp.length - 1 && S[k] < s0) k++; const a = MARp[k - 1], b = MARp[k], t = clamp((s0 - S[k - 1]) / ((S[k] - S[k - 1]) || 1), 0, 1); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
        const sabbia = (x, y) => { const i = T2i(y) * GW + T2i(x); return grid[i] === T.SAND; };
        for (let s0 = 0; s0 + 10 < S[S.length - 1] - 9; s0 += 10) { const A = at(s0), B = at(s0 + 10); if (A[0] < 1092) continue; const L = dist(A[0], A[1], B[0], B[1]), ux = (B[0] - A[0]) / L, uy = (B[1] - A[1]) / L, nx = -uy, ny = ux;   // n: a destra di chi va a levante, verso il mare
          if (sabbia((A[0] + B[0]) / 2 + nx * 7, (A[1] + B[1]) / 2 + ny * 7)) PZ('parapetto', A[0] + nx * 5.5, A[1] + ny * 5.5, Math.atan2(-uy, ux), { L: +L.toFixed(2), tipo: 'mare' }, { nome: 'Ringhiera del Lido' }); }
        if (CITY.glacis) { const R = CITY.glacis.rivaPts, SR = [0]; for (let k = 1; k < R.length; k++) SR.push(SR[k - 1] + dist(R[k - 1][0], R[k - 1][1], R[k][0], R[k][1]));   // il parapetto sul lato del mare, lungo la curva
          const atR = s0 => { let k = 1; while (k < R.length - 1 && SR[k] < s0) k++; const a = R[k - 1], b = R[k], t = clamp((s0 - SR[k - 1]) / ((SR[k] - SR[k - 1]) || 1), 0, 1); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
          const mareR = (x, y) => { const i = T2i(y) * GW + T2i(x); return grid[i] === T.WATER; };
          for (let s0 = 8; s0 + 6 <= SR[SR.length - 1]; s0 += 6) { const A = atR(s0), B = atR(s0 + 6), L = dist(A[0], A[1], B[0], B[1]), ux = (B[0] - A[0]) / L, uy = (B[1] - A[1]) / L, nx = uy, ny = -ux, M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
            if (mareR(M[0] + nx * 5.5, M[1] + ny * 5.5) || mareR(M[0] + nx * 7, M[1] + ny * 7)) PZ('parapetto', A[0] + nx * 3.4, A[1] + ny * 3.4, Math.atan2(-uy, ux), { L: +L.toFixed(2), tipo: 'mare' }, { nome: 'Parapetto della Riva della Rocca' }); } } }
      // [ordine] niente mura di tramontana lungo i binari: col muro a scarpa della massicciata facevano una doppia divisione fra la città e la ferrovia
      // E0 la Porta di Terra della cinta medievale ([pianta] ora sul Mercato vecchio, sulla bocca del Vico dei Giardini; sulla Rua resta lo slargo)
      { const rua = RDp('rua'), co = RDp('corso'); if (rua && co) { const y0 = rua.pts[0][1]; let cx = 990, bd = 1e9; co.pts.forEach(q => { const d = Math.abs(q[1] - y0); if (d < bd) { bd = d; cx = q[0]; } });
        const xF = cx + co.w / 2 + 2.6, yR = yOnP(rua.pts, xF + 4);
          // [pianta] all'imbocco della Rua resta lo slargo dove stava la porta (le torri e il corpo di prima: un lastricato, niente in mezzo alla strada)
          const o = { x: 0, y: 0, rot: -Math.PI / 2 }, [ax, ay] = pzW(o, 11.5, 6.4); o.x = xF - ax; o.y = yR - ay; pzRis(o, 'P', -.9, 23.9, -3.9, 6.9);
          // la Porta di Terra sta sul Mercato vecchio (l'ottagono era la piazza fuori dalla porta): sulla bocca del Vico dei Giardini, che ci passa sotto
          // a piedi; la faccia con le torri guarda la piazza e la camera. Misura di mezzo: 14 m con due torri basse (era 23 m, poi 8 m senza torri)
          const G = RDp('giardini'), OC = CITY.octa; if (G && OC) { const gy = G.pts[G.pts.length - 1][1], O = { w: 4.6, h: 7, torri: true, tw: 2.8 }, Wp = O.w + 4 + 2 * O.tw, xE = OC[0] - OC[2] + 3.2;
            const p = pzAt('porta_terra', xE, gy, Math.PI / 2, Wp / 2, 0, O, { nome: 'Porta di Terra' }); pzRis(p, 'B', -.4, O.tw + 2, -7, 3.2); pzRis(p, 'B', Wp - O.tw - 2, Wp + .4, -7, 3.2);   /* dietro le torri il pieno fino alle case: nessuna porta nascosta dietro l'arco */ pzRis(p, 'B', -.4, O.tw + .4, 3.2, 6.2); pzRis(p, 'B', Wp - O.tw - .4, Wp + .4, 3.2, 6.2); } } }
      // [cucitura] IL RECINTO DEL GARANTE AL PORTO (MAPPA_COMPATTA.md sez. 13). La presenza del regime lascia la Vittoria e si chiude in un
      // recinto solo, sul bordo del porto fortificato, fra la spianata, il canale della Rocca e il mare: il Muro del Garante continuo (lastre a L
      // e camminamento di ronda sul retro), le torri di guardia agli angoli e ai lati del varco, a non più di 28 m l'una dall'altra; il varco col
      // posto di blocco attraverso la Vittoria, che è la sola porta di terra del recinto e della Rocca (la testa di ponte sta dentro); dentro il
      // Palazzo del Governo, la caserma (la Pietra dell'Onda), il deposito, il piazzale dei mezzi, la banchina sul canale e sul mare, e il
      // Ministero con la torre littoria sulla punta della banchina, che guarda il porto. Prima c'erano un Muro da riva a riva in mezzo alla
      // spianata con sette torri, un secondo muretto col posto di blocco e quattro pali in fila: tre segni per la stessa cosa, nessun recinto.
      // Tutto si misura dai dati (la riva, il canale, l'asse): se la costa cambia, il recinto la segue.
      { const XCAN = xn(WALLX) + 30 - 14, gx = XCAN - 12, xw = CITY.spian0 + 10.5, yN = VY + 12, yP = VY - 12;   /* [pianta] 2,5 m più a levante: c'è il marciapiede della Via del Lido */
        const tI = (x, y) => T2i(y) * GW + T2i(x), mareA = (x, y) => { const i = tI(x, y); return grid[i] === T.WATER && zone[i] === Z.MARE; };
        const riva = x => { for (let y = yN; y < yN + 120; y += 1) if (mareA(x, y)) return y; return yN + 120; };
        let yS = 1e9; for (let x = xw; x <= XCAN; x += 2) yS = Math.min(yS, riva(x));
        const R = POSA.recinto = { xw, xe: XCAN, gx, yN, yP, yS, quay: XCAN - 6, torri: [], muri: [], riva };
        const muro = (x, y, rot, L, o, nome) => { const p = PZ('muro_garante', x, y, rot, Object.assign({ L, h: 3.6, posto_blocco: false, riflettore: false, camminamento: true }, o), { nome: nome || 'Muro del Garante', recinto: true });
          if (p.opz.posto_blocco) { pzRis(p, 'B', 0, L / 2 - 3, -.7, .9); pzRis(p, 'B', L / 2 + 3, L, -.7, .9); } else pzRis(p, 'B', 0, L, -.7, .9); R.muri.push(p); return p; };
        const torre = (x, y, nome) => { const p = PZ('torre_guardia', x, y, 0, { h: 11, riflettore: true }, { nome: nome || 'Torre di guardia', recinto: true }); pzRis(p, 'B', -1.4, 1.4, -1.4, 1.4); R.torri.push(p); return p; };
        // il varco: attraverso la Vittoria, fra la spianata e la testa di ponte (il primo muro posato: lo cerca il luogo-missione 11)
        R.varco = muro(gx, yP, -Math.PI / 2, yN - yP, { posto_blocco: true, riflettore: true, settore: 'SETTORE 1-C' }, 'Posto di blocco della Vittoria');
        // la testa di ponte: il muro a tramontana dal varco al canale; il recinto: il muro lungo la spianata e quello verso la città, fino al mare
        muro(XCAN - .6, yP, Math.PI, XCAN - .6 - gx, { settore: 'SETTORE 1-B' });
        muro(gx, yN, Math.PI, gx - xw, { settore: 'SETTORE 1-D' });
        const yW = riva(xw) - .5, nW = Math.max(1, Math.ceil((yW - yN) / 28)), sW = (yW - yN) / nW;
        for (let k = 0; k < nW; k++) muro(xw, yN + k * sW, -Math.PI / 2, sW, { settore: 'SETTORE 1-' + 'EFGH'[k % 4] });   // [sporcherie] il muro verso la città finisce sulla battigia (prima entrava 1,5 m in mare)
        // le torri: ai due lati del varco, agli angoli, lungo il muro verso la città e sulla riva
        torre(gx, yP, 'Torre del varco'); torre(gx, yN, 'Torre del varco'); torre(XCAN - 1.6, yP, 'Torre del canale'); torre(xw, yN, 'Torre di spigolo');
        for (let k = 1; k < nW; k++) torre(xw, yN + k * sW); torre(xw, yW - 2.5, 'Torre della riva');
        // il suolo del recinto: il piazzale lastricato (lo fa piazza la passata della spianata), la banchina lungo il canale e sul mare
        let yM = yS; for (let x = xw; x <= XCAN; x += 2) yM = Math.max(yM, riva(x));
        for (let ty = T2i(yN + 1); ty <= T2i(yM); ty++) for (let tx = T2i(xw + 1); tx < T2i(XCAN); tx++) { const i = ty * GW + tx, x = tx * TS + 1, y = ty * TS + 1;
          if (grid[i] === T.WATER || roadW[i] > 0 || grid[i] === T.BLD) continue;
          if (x >= R.quay || y >= riva(x) - 4) { grid[i] = T.QUAY; reserved[i] = 1; } }
        // il deposito in fondo al piazzale, contro il muro verso la città e a ridosso della riva (la porta verso il piazzale); la caserma gli sta
        // sopra lungo lo stesso muro (la posa il blocco degli edifici con nome); i pali dei riflettori agli angoli del piazzale
        R.yDep = riva(xw + 9) - 9.5; R.yCas = R.yDep - 5.5;
        R.deposito = PZ('polveriera', xw + 15, R.yDep, Math.PI, { L: 12, p: 6.2, cinta: false }, { nome: 'Deposito del porto', recinto: true }); pzRis(R.deposito, 'B', -.4, 12.4, -3.5, 3.5);
        R.pali = [PZ('palo_riflettori', xw + 13, yN + 28, Math.PI / 2, { h: 12, n: 3 }, { nome: 'Palo dei riflettori', recinto: true }), PZ('palo_riflettori', R.quay - 1, yN + 14, -Math.PI / 2, { h: 12, n: 3 }, { nome: 'Palo dei riflettori', recinto: true }),
          PZ('palo_riflettori', XCAN - 3, yN - 3, Math.PI, { h: 12, n: 3 }, { nome: 'Palo dei riflettori della testa di ponte', recinto: true })];   // il terzo illumina la testa di ponte e il ponte
        R.pali.forEach(p => pzRis(p, 'B', -.5, .5, -.5, .5)); }
      // [cucitura] la fontana della Piazza Grande, nella metà a sud della Vittoria (a nord resta libero il sagrato del cinema)
      { const q = GOV.piazza, fx = (q[0] + q[2]) / 2, fy = (VY + 3.5 + q[3]) / 2 + 1; PZ('fontana', fx, fy, 0, { r: 2.2, h: 2.8, lati: 8, cannelle: 4 }, { nome: 'Fontana della Piazza Grande' });
        blob(fx, fy, 2.7, 2.7, i => { if (grid[i] !== T.BLD && roadW[i] === 0) grid[i] = T.FOUNT; }); }
      // le pietre minute delle piazzette: il pozzo (al posto della vasca), la fontana del Forno, il lavatoio sulla Piazza della Marina
      { const [px, py] = CITY.piazzette[0]; blob(px, py, 3, 3, i => { if (grid[i] === T.FOUNT) grid[i] = T.PIAZZA; }); PZ('pozzo', px, py, 0, { r: .8, arco: true }, { nome: 'Pozzo' });
        for (let ty = T2i(py) - 1; ty <= T2i(py); ty++) for (let tx = T2i(px) - 1; tx <= T2i(px); tx++) grid[ty * GW + tx] = T.FOUNT; }
      { const fx = CITY.piazzette[1][0] - 3, fy = CITY.piazzette[1][1] - 2.2; /* [pianta] la fontana in un canto della piazzetta, fuori dagli assi del Vicolo di Mezzo e del Vico della Fame (prima ci stava sopra) */ PZ('fontana', fx, fy, 0, { r: 1.8, h: 2.4, lati: 8, cannelle: 2 }, { nome: 'Fontana del Forno' }); blob(fx, fy, 2.3, 2.3, i => { if (grid[i] !== T.BLD && roadW[i] === 0) grid[i] = T.FOUNT; }); }
      { const q = CITY.rects[0]; const p = PZ('lavatoio', q[2] - 9.6, q[1] + 4.6, 0, { L: 5, tettoia: true }, { nome: 'Lavatoio' }); pzRis(p, 'B', -1, 7.2, -2.5, 2.5); }
      // [mappa_compatta] passo 4, i tre segni nuovi: la torre dell'acqua della ferrovia con l'antenna di Radio Luna (fra i binari e gli scogli),
      // la gru del porto sulla banchina di levante della darsena (il braccio sull'acqua), la grata del vapore sul lotto del fuoco
      { const posto = (cx, cy, hw, hd, R) => { for (let r = 0; r <= R; r += 1) for (let a = 0; a < 16; a++) { const x = cx + Math.cos(a * Math.PI / 8) * r, y = cy + Math.sin(a * Math.PI / 8) * r; let ok = true;
            for (let ty = T2i(y - hd); ty <= T2i(y + hd) && ok; ty++) for (let tx = T2i(x - hw); tx <= T2i(x + hw); tx++) { const i = ty * GW + tx; if (roadW[i] > 0 || reserved[i] || bIndex[i] >= 0 || grid[i] === T.WATER || grid[i] === T.BLD || grid[i] === T.PIAZZA) ok = false; }
            if (ok) return [x, y]; } return null; };
        const ta = posto(1000, 72, 3.2, 3.2, 16); if (ta) { const p = PZ('torre_acqua', ta[0], ta[1], 0, { h: 18, r: 3.2, antenna: true }, { nome: 'Torre dell\'acqua e antenna di Radio Luna' }); pzRis(p, 'B', -3.1, 3.1, -3.1, 3.1); }
        { const p = PZ('gru_porto', DARS.x1 - 3, PV.qy + 16, Math.PI, { h: 22, braccio: 16 }, { nome: 'Gru del porto' }); pzRis(p, 'Q', -2.6, 2.6, -2.6, 2.6); }
        const gv = posto(962, 74, 1.6, 1.4, 10); if (gv) { const p = PZ('grata_vapore', gv[0], gv[1], 0, { w: 2.4 }, { nome: 'Grata del vapore' }); pzRis(p, 'C', -1.5, 1.5, -1.2, 1.2); } }
      // E0 le case traversate da un sottopasso a volta: una ogni due vicoli lunghi verso il mare, a metà strada (le corti e i passaggi)
      // (la casa scavalca solo il suo vicolo: niente altre strade, piazze o acqua sotto la sua impronta)
      { let k = 0, ultimo = -99; CITY.roads.filter(rd => /^vic_/.test(rd.id) && rd.pts.length > 2).forEach(rd => { const P = rd.pts;
        if (lungo(P, .5).L < 15 || k >= 3 || Math.abs(P[0][0] - ultimo) < 24) return;
        for (const f of [.5, .42, .58, .35, .65, .28, .72]) { const A = lungo(P, f), th = Math.atan2(A.ux, A.uy), t = { x: 0, y: 0, rot: th }, [ax, ay] = pzW(t, 3.7, 0); t.x = A.x - ax; t.y = A.y - ay; let ok = true;
          pzCells(t, -1, 8.4, -6, 6, (i, tx, ty) => { const [lx] = pzL(t, tx * TS + 1, ty * TS + 1); if (grid[i] === T.WATER || grid[i] === T.PIAZZA || grid[i] === T.FOUNT || (reserved[i] && roadW[i] === 0) || (roadW[i] > 0 && (roadW[i] !== rd.w || Math.abs(lx - 3.7) > 3))) ok = false; });
          if (!ok) continue; const p = PZ('arco_sottopasso', t.x, t.y, th, { w: 3, h: 3.4, p: 9, piani: 2 }, { nome: 'Sottopasso di ' + rd.name, vicolo: rd.id }); pzRis(p, 'B', -1, 8.4, -6, 6); k++; ultimo = P[0][0]; break; } }); }
      // E2 le tre scalinate dalla marina al borgo: i vicoli che dalla marina salgono di più nei primi metri; il vicolo si allarga per la scala
      // (le spallette di tufo prendono il posto del filo delle case), la quota e i gradini li fissa la passata finale
      if (CITY.marina) { const MAR = CITY.marina, eAt = (x, y) => elev[Math.floor(y / TS) * GW + Math.floor(x / TS)], cand = [];
        CITY.roads.filter(rd => /^vic_/.test(rd.id) && rd.pts.length > 2).forEach(rd => { let P = rd.pts.slice(); if (Math.abs(P[0][1] - yOnP(MAR, P[0][0])) < Math.abs(P[P.length - 1][1] - yOnP(MAR, P[P.length - 1][0]))) P.reverse();
          const e = P[P.length - 1]; if (Math.abs(e[1] - yOnP(MAR, e[0])) > 5) return; const Q = P.slice().reverse(), L = lungo(Q, 0).L; if (L < 16) return;
          const A0 = lungo(Q, 2.6 / L), B0 = lungo(Q, 12.6 / L), dd = eAt(B0.x, B0.y) - eAt(A0.x, A0.y);
          // [pedonale] il primo gradino fuori dalla carreggiata e dal marciapiede della Via della Marina (prima la scala ci entrava di un metro)
          let s0 = 2.6; while (s0 < 7 && Math.abs(lungo(Q, s0 / L).y - yOnP(MAR, lungo(Q, s0 / L).x)) < 7 / 2 + 1.3) s0 += .2;
          cand.push({ rd, A: A0, B2: B0, A1: lungo(Q, s0 / L), B1: lungo(Q, (s0 + 10) / L), dd }); });
        cand.sort((a, b) => b.dd - a.dd); POSA.scal = [];
        cand.forEach(c => { if (POSA.scal.length >= 3 || POSA.scal.some(o => Math.abs(o.A.x - c.A.x) < 14)) return;
          const ux = c.B2.x - c.A.x, uy = c.B2.y - c.A.y, l = Math.hypot(ux, uy) || 1, t = { x: c.A.x, y: c.A.y, rot: Math.atan2(-uy / l, ux / l) }; let ok = true;
          pzCells(t, -1.4, 11, -2.9, 2.9, i => { if (bIndex[i] >= 0 || grid[i] === T.PIAZZA || grid[i] === T.WATER || grid[i] === T.QUAY || (reserved[i] && roadW[i] === 0)) ok = false; }); if (!ok) return;
          const p = PZ('scalinata', c.A.x, c.A.y, Math.atan2(-uy / l, ux / l), { w: 2.4, dislivello: 2, pianerottoli: 0, lampada: true }, { nome: 'Scalinata di ' + c.rd.name, vicolo: c.rd.id, marina: true });
          p.B2 = [c.B2.x, c.B2.y]; pzRis(p, 'B', -1.4, 11, -2.9, 2.9); pzRis(p, 'C', -1.4, 11, -1.3, 1.3);
          { const ux1 = c.B1.x - c.A1.x, uy1 = c.B1.y - c.A1.y, l1 = Math.hypot(ux1, uy1) || 1; p.x = c.A1.x; p.y = c.A1.y; p.rot = Math.atan2(-uy1 / l1, ux1 / l1); p.B2 = [c.B1.x, c.B1.y]; }   // [pedonale] la scala sale dal filo del marciapiede (il vicolo resta quello di prima)
          POSA.scal.push(Object.assign(c, { p })); }); }
    }
    // ---- il Muro: dalla riva nord alla riva sud, un solo varco sul Viale della Tutela ----
    let FORT_X = 0;   // [città2] dentro la Rocca solo edifici militari (lo fissa il blocco della Rocca, lo legge stamp)
    const WALL0X = xn(WALLX);   // dove stava il Muro lungo: da qui si misurano il fronte di terra della Rocca e il canale
    // [cucitura] con il Recinto del Garante il «Muro» che leggono gli altri moduli (palco, posti, render) è il suo varco sulla Vittoria:
    // il tratto di muro fra le due torri del varco; il resto del recinto sta in W.recinto (i muri e le torri sono pezzi)
    const RC = POSA.recinto;
    const WALL = RC ? { x: RC.gx, tx: T2i(RC.gx), gate: [143 - 3.5, 143 + 3.5], y0: RC.yP, y1: RC.yN, towers: [[RC.gx, RC.yP], [RC.gx, RC.yN]], recinto: true }
      : { x: xn(WALLX), tx: Math.floor(xn(WALLX) / TS), gate: [yc(WALLX) - 6, yc(WALLX) + 6], y0: northY(WALLX), y1: southY(WALLX), towers: [] };
    if (!RC) for (let ty = 0; ty < GH; ty++) {
      const y = ty * TS + 1; if (y < WALL.y0 - 2 || y > WALL.y1 + 2) continue;
      if (y > WALL.gate[0] && y < WALL.gate[1]) continue;
      for (const tx of [WALL.tx]) { const i = ty * GW + tx; if (grid[i] === T.WATER && zone[i] === Z.MARE) continue; grid[i] = T.BLD; roadW[i] = 0; reserved[i] = 1; }
    }
    if (!RC) { for (let y = WALL.y0 + 8; y < WALL.y1 - 4; y += 26) if (Math.abs(y - yc(WALLX)) > 12) WALL.towers.push([WALL.x, y]);
      WALL.towers.push([WALL.x, WALL.gate[0] - 3], [WALL.x, WALL.gate[1] + 3]); }
    // [rocca2] LA ROCCA: UN CASTELLO ARAGONESE A MARE (riferimenti del committente in _immagini/riferimenti; MAPPA_COMPATTA.md sez. 11.2).
    // Dalla città verso la punta: il Muro del regime → la SPIANATA vuota → il CANALE di mare che stacca lo scoglio dalla terra, passato dal
    // ponte in muratura col levatoio (la Vittoria ci arriva sopra) → la PORTA della Rocca nel fronte di terra. Lo scoglio basso è cinto dal
    // FRANGIFLUTTI di massi; sopra, masse a gradoni di conci di carparo: il fronte di terra, il rivellino di ponente basso a scarpa con
    // l'erba, la caserma sulla cortina nord, il raccordo, il MASTIO col faro (il comando), il corpo di levante, il rivellino di scirocco
    // (bastione basso), il TORRIONE tondo e tozzo sull'angolo verso la città e il porto. Dentro: la piazza d'armi e la DARSENA allagata col
    // grande ponte ad arco, la banchina coi gradini, il portale con lo stemma e la pensilina; la PORTA D'ACQUA a volta apre la darsena sul
    // mare fra i due moli. Le masse che sono edifici del gioco (comando, caserma, depositi) le posa il blocco dopo gli edifici con nome.
    const FORT = { bastions: [], ravelin: [], walls: [], gates: [], ditch: [], x: 0, y: 0 };
    { const XF = WALL0X + 30, gy = 143, CW = 14;   // il fronte di terra a 30 m da dove stava il Muro; il canale largo 14 m davanti
      let xT = XF; while (xT < XF + 160 && SouthY(xT + 3) - NorthY(xT + 3) > 14) xT += 3;   // la punta
      FORT.x = XF; FORT.y = gy; FORT.tip = xT; FORT_X = WALL0X;
      FORT.ditch = [XF - CW, gy - 46, XF, gy + 46];   // il canale (lo leggono palco, sottosuolo e render per il bordo della spianata)
      FORT.canale = { x0: XF - CW, x1: XF, gy, ponte: 2.4 };
      FORT.posa = { XF, gy, CW };
      const block = i => { if (grid[i] === T.WATER && zone[i] === Z.MARE) return; grid[i] = T.BLD; roadW[i] = 0; reserved[i] = 1; };
      const mare = i => { grid[i] = T.WATER; zone[i] = Z.MARE; roadW[i] = 0; reserved[i] = 1; elev[i] = -2; };
      // il canale: da riva a riva, il mare; resta il ponte (la carreggiata della Vittoria) a quota della spianata
      for (let ty = 0; ty < GH; ty++) for (let tx = T2i(XF - CW); tx < T2i(XF); tx++) { const i = ty * GW + tx; if (grid[i] === T.WATER && zone[i] === Z.MARE) continue; if (zone[i] === Z.MARE) continue;
        if (Math.abs(ty * TS + 1 - gy) < FORT.canale.ponte) { grid[i] = T.PIAZZA; roadW[i] = 0; reserved[i] = 1; continue; } mare(i); }
      FORT.gates.push({ x: XF, y: gy, ang: 0, kind: 'terra' }, { x: 1239, y: 177, ang: Math.PI / 2, kind: 'mare' });
      // il suolo: la spianata in terra battuta fino al canale; sullo scoglio cortili lastricati e, sulla riva, la roccia bassa
      for (let ty = 0; ty < GH; ty++) for (let tx = Math.floor((CITY.spian0 || WALL.x + 2) / TS); tx <= Math.floor((xT + 4) / TS); tx++) { const i = ty * GW + tx, v = grid[i];
        if (tx * TS < XF - CW) { if (roadW[i] === 0 && v !== T.VIA && v !== T.BLD && v !== T.WATER && v !== T.PIER && v !== T.QUAY && v !== T.GRAVEL && v !== T.SAND) grid[i] = T.PIAZZA; }
        else if (tx * TS >= XF && (v === T.GRASS || v === T.SHRUB || v === T.TREE || v === T.DIRT || v === T.FIELD || v === T.VIA)) { grid[i] = T.COB; roadW[i] = 0; } }
      // la banchina del vecchio porto cargo sulla riva dello scoglio torna scoglio (restano le radici dei due moli a sud)
      for (let ty = 1; ty < GH - 1; ty++) for (let tx = T2i(XF); tx <= T2i(xT + 4); tx++) { const i = ty * GW + tx, x = tx * TS + 1, y = ty * TS + 1; if (grid[i] !== T.QUAY || zone[i] !== Z.CITTA) continue;
        if (y > SouthY(x) - 3 && (Math.abs(x - 1226) < 6 || Math.abs(x - 1252) < 6)) continue; grid[i] = T.COB; elev[i] = Math.max(elev[i], 1.2); }
      for (let ty = 1; ty < GH - 1; ty++) for (let tx = T2i(XF); tx <= T2i(xT + 4); tx++) { const i = ty * GW + tx; if (grid[i] === T.WATER || grid[i] === T.QUAY || grid[i] === T.PIER) continue;
        let riva = false; for (let a = -1; a <= 1 && !riva; a++) for (let b = -1; b <= 1; b++) { const j = (ty + b) * GW + tx + a; if (grid[j] === T.WATER && zone[j] === Z.MARE) { riva = true; break; } }
        if (riva) { grid[i] = T.ROCK; reserved[i] = 1; } }
      // la spianata: fra il Muro e il canale nessuno costruisce
      for (let ty = 0; ty < GH; ty++) for (let tx = Math.floor((CITY.spian0 || WALL.x + 2) / TS); tx < Math.floor((XF - CW) / TS); tx++) reserved[ty * GW + tx] = 1;
      // la piazza d'armi lastricata, dalla porta al mastio
      for (let ty = T2i(122); ty < T2i(145); ty++) for (let tx = T2i(1222); tx < T2i(1250); tx++) { const i = ty * GW + tx; if (grid[i] === T.COB || grid[i] === T.ROCK) { grid[i] = T.PIAZZA; roadW[i] = 0; reserved[i] = 1; } }
      // la darsena allagata (30 × 22 m d'acqua fra le banchine, la bocca a sud) e la porta d'acqua che la apre sul mare fra i due moli
      const DS = { x0: 1218, L: 30, B: 6, yc: 161, W: 22 }; FORT.darsena = DS;
      for (let ty = T2i(DS.yc - DS.W / 2); ty < T2i(DS.yc + DS.W / 2); ty++) for (let tx = T2i(DS.x0 + DS.B); tx < T2i(DS.x0 + DS.B + DS.L); tx++) mare(ty * GW + tx);
      for (let ty = T2i(DS.yc + DS.W / 2); ty < T2i(DS.yc + DS.W / 2 + 14); ty++) for (let tx = T2i(1234); tx < T2i(1244); tx++) { const i = ty * GW + tx; if (!(grid[i] === T.WATER && zone[i] === Z.MARE)) mare(i); }   // il canale della porta d'acqua fino al mare
      const qua = (x0, y0, x1, y1) => { for (let ty = T2i(y0); ty < T2i(y1); ty++) for (let tx = T2i(x0); tx < T2i(x1); tx++) { const i = ty * GW + tx; if (grid[i] === T.WATER) continue; grid[i] = T.QUAY; roadW[i] = 0; reserved[i] = 1; } };
      qua(DS.x0, DS.yc - DS.W / 2 - DS.B, DS.x0 + DS.L + 2 * DS.B, DS.yc - DS.W / 2); qua(DS.x0, DS.yc - DS.W / 2, DS.x0 + DS.B, DS.yc + DS.W / 2); qua(DS.x0 + DS.B + DS.L, DS.yc - DS.W / 2, DS.x0 + DS.L + 2 * DS.B, DS.yc + DS.W / 2);
      { const R3 = -Math.PI / 2, F = FORT.posa; F.pz = [];
        // il canale col ponte in muratura e il levatoio (il fossato pieno di mare: niente fondo d'erba, niente rivellino)
        F.fos = PZ('fossato', XF, gy - 44, R3, { L: 88, w: CW, prof: 6, ponte: true, rivellino: false, acqua: true }, { nome: 'Canale e ponte della Rocca', rocca: 'canale', acqua: true });
        // il fronte di terra: due masse a picco ai lati della porta monumentale
        const massa = (x, y, rot, o, ex) => { const p = PZ('corpo_rocca', x, y, rot, o, Object.assign({ nome: 'Rocca' }, ex || {})); pzRis(p, 'B', 0, o.L, -o.P / 2, o.P / 2); F.pz.push(p); return p; };
        massa(XF + 4, 116, R3, { L: 21.5, P: 8, h: 14, merli: true, finestre: 1 }, { nome: 'Fronte di terra' });
        massa(XF + 4, 148.5, R3, { L: 23.5, P: 8, h: 14, merli: true, finestre: 1 }, { nome: 'Fronte di terra' });
        F.porta = PZ('porta_monumentale', XF + 3, gy - 5.5, R3, { w: 11, h: 13, fornice: 4.2, merli: true, scritta: 'ANNO MDCLXXXII' }, { nome: 'Porta della Rocca', rocca: 'spianata' });
        F.porta.imp = [['B', 0, 3.2, -3.3, 2.9], ['B', 7.8, 11, -3.3, 2.9]]; pzRis(F.porta, 'B', 0, 3.3, -3.3, 2.9); pzRis(F.porta, 'B', 7.7, 11, -3.3, 2.9);
        // il rivellino di ponente: basso, a scarpa, l'erba sulla terrazza
        massa(XF + 5, 106, R3, { L: 10, P: 10, h: 6, scarpa: true, erba: true }, { nome: 'Rivellino di ponente' });
        // il torrione tondo e tozzo sull'angolo di libeccio, verso la città e il porto
        { const r = 8, h = 10, rb = r + h * .42 * .18, xt = 1212, yt = 172; F.torr = PZ('torrione', xt - rb, yt, 0, { r, h, lanterna: false }, { nome: 'Torrione di libeccio' });
          for (let ty = T2i(yt - rb) - 1; ty <= T2i(yt + rb); ty++) for (let tx = T2i(xt - rb) - 1; tx <= T2i(xt + rb); tx++) if (dist(tx * TS + 1, ty * TS + 1, xt, yt) < rb + .3) block(ty * GW + tx); }
        // il rivellino di scirocco: il bastione basso a punta verso il mare
        { const p = PZ('bastione', 1264, 174, Math.PI / 2, { faccia: 14, fianco: 4, h: 7, garitta: true }, { nome: 'Rivellino di scirocco' }); F.pz.push(p); pzRis(p, 'B', 0, 16, 0, 15); }
        // la darsena, il ponte ad arco, la porta d'acqua
        PZ('darsena', DS.x0, DS.yc, 0, { L: DS.L, W: DS.W, banchina: DS.B, scalette: 0, rocca: true, gradini: 3 }, { nome: 'Darsena della Rocca', acqua: true });
        PZ('ponte_arco', DS.x0 + DS.B - 1, DS.yc - 2, 0, { L: DS.L + 2, w: 4.6, h: 7, acqua: 1.6 }, { nome: 'Ponte della darsena', acqua: true });
        { const p = PZ('porta_acqua', DS.x0 + DS.B, DS.yc + DS.W / 2 + 2, 0, { L: DS.L, h: 11, fornice: 9, acqua: 1.6, P: 4 }, { nome: 'Porta d\'acqua', acqua: true }); pzRis(p, 'B', 0, 10.5, -2, 2); pzRis(p, 'B', 19.5, DS.L, -2, 2); }
        // il frangiflutti: tratti di massi rotolati lungo la riva dello scoglio, a due metri in mare (non davanti alla porta d'acqua e ai moli)
        { // la riva vera dello scoglio (dalle caselle): dal centro si cammina verso fuori finché si trova il mare; il frangiflutti 2,5 m più in là
          const cx = (XF + xT) / 2 - 6, cy = gy, riva = []; let k = 0;
          for (let d = 0; d < 360; d += 9) { const a = d * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a); let r = 4;
            for (; r < 90; r += .5) { const x = cx + ux * r, y = cy + uy * r, i = T2i(y - 1) * GW + T2i(x - 1); if (grid[i] === T.WATER && zone[i] === Z.MARE && !(x > DS.x0 + DS.B - 1 && x < DS.x0 + DS.B + DS.L + 1 && y > DS.yc - DS.W / 2 - 1 && y < DS.yc + DS.W / 2 + 16)) break; }   // (la darsena e il suo canale non sono la riva)
            const x = cx + ux * (r + 2.5), y = cy + uy * (r + 2.5); riva.push(x < XF + 3 || (y > gy + 20 && x > 1216 && x < 1262) ? null : [x, y]); }
          riva.forEach((q, i) => { const n = riva[(i + 1) % riva.length]; if (!q || !n) return; const L = dist(q[0], q[1], n[0], n[1]); if (L < 2 || L > 16) return;
            PZ('scogliera', q[0], q[1], -Math.atan2(n[1] - q[1], n[0] - q[0]), { L: +L.toFixed(2), w: 4, n: Math.max(4, Math.round(L * 1.2)), seme: ++k }, { nome: 'Frangiflutti della Rocca', acqua: true }); }); }
      }
    }
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
      if (FORT_X && (b.x + b.w) * TS > (CITY.spian0 || FORT_X - 8) && !b.military && !b.lighthouse && !b.kiosk && !b.recinto && !b.glacis) return null;   // [città2] oltre il bordo della spianata niente case
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
        const s = roadish + mid * .3 + (v === T.VIA ? 1.2 : 0) + hash2(tx, ty, 5) * .2 + (b.portaS && ty !== b.y + b.h ? 6 : 0);   // [pianta] portaS: la porta sul lato sud
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
      if ((ex.military || /^(officina|magazzino|disco|cinema)$/.test(id)) && ex.nuovo) { const x = Math.round(at[0] / TS - w / 2), y = Math.round(at[1] / TS - h / 2); if (free(x, y, w, h, 0)) s = [x, y, w, h]; }   // [rocca2] le masse della Rocca stanno dove le mette il progetto
      // [cucitura] nel Recinto del Garante il posto è disegnato (fra i muri e le torri): governo a tramontana contro il muro della spianata, il
      // corpo di guardia nella testa di ponte accanto al varco, la caserma lungo il muro verso la città, il Ministero sulla riva accanto alla torre
      if (ex.recinto && POSA.recinto) { const R = POSA.recinto, xw = T2i(R.xw) + 2, yn = T2i(R.yN) + 1;
        const P = { governo: [xw, yn, w, h], garante: [T2i(R.gx) + 1, T2i(R.yP) + 1, w, h], pietra: [xw, yn + 7, w, Math.max(5, Math.min(h, T2i(R.yCas) - (yn + 7)))],
          ministero: [T2i(R.xe - 9) - w - 1, yn + 7, w, h] }[id];
        if (P) { s = P; for (let ty = P[1]; ty < P[1] + P[3]; ty++) for (let tx = P[0]; tx < P[0] + P[2]; tx++) reserved[ty * GW + tx] = 0; } }
      if (!s) { const q = site(at[0], at[1], w, h, 1); if (q) s = [q[0], q[1], w, h]; }
      if (!s) { const q = site(at[0], at[1], w, h, 0) || site(at[0], at[1], h, w, 0); if (q) s = [q[0], q[1], w, h]; }   // [isola] in città lo spazio è poco
      if (!s && typeof process !== 'undefined' && process.env && process.env.PV_DBG) { const c = {}; const cx = Math.floor(at[0] / TS), cy = Math.floor(at[1] / TS); for (let j = cy - 8; j <= cy + 8; j++) for (let i = cx - 8; i <= cx + 8; i++) { const k = j * GW + i; const why = bIndex[k] >= 0 ? 'casa' : roadW[k] > 0 ? 'strada' : reserved[k] ? 'riserv' : 'g' + grid[k] + 'z' + zone[k]; c[why] = (c[why] || 0) + 1; } console.log('[città2] intorno a', id, at, JSON.stringify(c)); }
      if (!s) { if (typeof console !== 'undefined') console.warn('[world] niente posto per', id); return; }
      // [città2] in città l'edificio con nome si accosta al filo della strada più vicina (la facciata sul marciapiede, non in mezzo all'isolato)
      if (at[0] >= CITY_W0 && !ex.military && !ex.kiosk && !ex.lighthouse && !ex.recinto) {
        const road = (tx, ty) => { if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) return false; const i = ty * GW + tx, v = grid[i]; return v === T.WALK || v === T.VIA || v === T.PIAZZA || v === T.QUAY || roadW[i] > 0; };
        let best = null;
        [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([dx, dy]) => { for (let d = 1; d <= 7; d++) { let hit = false;
          for (let k = 0; k < (dx ? s[3] : s[2]) && !hit; k++) { const tx = dx ? (dx < 0 ? s[0] - d : s[0] + s[2] - 1 + d) : s[0] + k, ty = dy ? (dy < 0 ? s[1] - d : s[1] + s[3] - 1 + d) : s[1] + k; if (road(tx, ty)) hit = true; }
          if (hit) { if (d > 1 && (!best || d < best.d) && free(s[0] + dx * (d - 1), s[1] + dy * (d - 1), s[2], s[3], 0)) best = { d, dx, dy }; break; } } });
        if (best) { s[0] += best.dx * (best.d - 1); s[1] += best.dy * (best.d - 1); }
      }
      stamp(Object.assign({ id, name, x: s[0], y: s[1], w: s[2], h: s[3], fl, style }, ex));
    });
    // [posa] gli edifici con nome che diventano pezzi (l'edificio resta per il gioco, porte e interni; la grafica la fa il pezzo):
    // la Chiesa Madre (facciata a due ordini sul sagrato, navata, campanile a maioliche sull'angolo di levante), e nella Rocca le quattro
    // scatole: due caserme lunghe contro le mura di tramontana, una contro le mura a mare, la polveriera
    if (CITY.spian0) {
      const Bn = id => B.find(b => b.id === id), rect = b => [b.x * TS, b.y * TS, (b.x + b.w) * TS, (b.y + b.h) * TS];
      const ch = Bn('chiesa'); if (ch) { const [x0, y0, x1, y1] = rect(ch); ch.pezzo = 'chiesa';
        PZ('facciata_chiesa', x0 + .6, y1 - .7, 0, { w: x1 - x0 - 6.4, h: 15, spessore: 1.2, corpo: y1 - y0 - 1.3, portale: true, rosone: true, timpano: true, gradini: 3 }, { nome: 'Chiesa Madre', b: ch.i, navata: true });
        PZ('campanile', x1 - 4.85, y1 - 2.9, 0, { lato: 4.4, h: 30, campane: 2, orologio: true, cuspide: true }, { nome: 'Campanile della Chiesa Madre', b: ch.i }); }
      // [rocca2] nella Rocca a mare: il comando è il mastio col faro, la caserma sta sulla cortina nord, il raccordo e il corpo di levante
      // sono masse di carparo; il corpo del ponte ha l'erba in cima e, sulla faccia verso la darsena, il portale con lo stemma e la pensilina
      [['caserma_p', 'caserma', 0, { piani: 2 }], ['hangar2', 'corpo_rocca', 0, { h: 11, merli: true, finestre: 1 }]   /* [sporcherie] il deposito della Rocca a 11 m (prima 17: più alto dell'hangar) */, ['deposito_n', 'corpo_rocca', 0, { h: 10, erba: true, finestre: 1 }],
        ['hangar1', 'corpo_rocca', 0, { h: 13, finestre: 2 }], ['rocca', 'mastio', 0, { h: 24, merli: true, lanterna: true }], ['deposito_s', 'polveriera', Math.PI, { cinta: false }]].forEach(([id, tipo, rot, o]) => {
        const b = Bn(id); if (!b) return; const [x0, y0, x1, y1] = rect(b), yc = (y0 + y1) / 2; b.pezzo = tipo;
        if (tipo === 'caserma') PZ(tipo, rot ? x1 : x0, yc, rot, Object.assign({ L: x1 - x0, p: y1 - y0 - 1 }, o), { nome: b.name, b: b.i });
        else if (tipo === 'corpo_rocca' || tipo === 'mastio') { PZ(tipo, x0, yc, 0, Object.assign({ L: x1 - x0, P: y1 - y0 }, o), { nome: b.name, b: b.i });
          if (id === 'deposito_n') PZ('porta_monumentale', x1, y0 + 11, Math.PI / 2, { w: 9, h: 10, fornice: 3.4, merli: false, scritta: 'CASTRVM MARIS', pensilina: true }, { nome: 'Portale della darsena', b: b.i }); }   // sulla faccia a levante, verso la darsena e la camera
        else PZ(tipo, rot ? x1 - 1 : x0 + 1, yc, rot, Object.assign({ L: x1 - x0 - 2, p: y1 - y0 - 2 }, o), { nome: b.name, b: b.i }); });
      // [cucitura] nel Recinto del Garante: la Pietra dell'Onda è la caserma lunga contro il muro verso la città, col fronte sul piazzale;
      // la torre littoria sta sulla punta della banchina, attaccata al Ministero, con l'arengario verso il piazzale e il ponte
      if (POSA.recinto) { const R = POSA.recinto, pc = Bn('pietra'), mi = Bn('ministero');
        if (pc) { const [x0, y0, x1, y1] = rect(pc); pc.pezzo = 'caserma'; PZ('caserma', (x0 + x1) / 2, y1, Math.PI / 2, { L: y1 - y0, p: x1 - x0 - 1, piani: 2 }, { nome: pc.name, b: pc.i, recinto: true }); }
        { const yT = mi ? (mi.y + mi.h / 2) * TS : R.yS - 9.5, p = PZ('torre_littoria', R.xe - 1.4, yT, Math.PI, { h: 15, lato: 7, scritta: 'ORDINE', orologio: true, balcone: true, antenna: true }, { nome: 'Torre littoria', recinto: true }); pzRis(p, 'B', -.3, 7.3, -5.2, 4.3);   /* [sporcherie] 15 m (non 28) e un metro dentro la banchina: la base non scende più nel mare */ R.torreL = p; } }
    }
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
      const i = ty * GW + tx; if (zone[i] !== Z.CITTA || grid[i] !== T.COB || roadW[i] > 0 || bIndex[i] >= 0 || tx * TS >= CITY_W0) continue;   // [città2] la città per epoche mette le sue case più sotto
      let near = false; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const v = grid[(ty + dy) * GW + tx + dx]; if (v === T.WALK || v === T.PIAZZA) near = true; }
      if (!near) continue;
      for (const [w, h] of [[4, 4], [3, 4], [4, 3], [3, 3]]) { let ok = false; for (const [ox, oy] of [[0, 0], [1 - w, 0], [0, 1 - h], [1 - w, 1 - h]]) if (free(tx + ox, ty + oy, w, h, 0)) { stamp({ id: 'casa_' + (nH++), x: tx + ox, y: ty + oy, w, h, fl: 2 + Math.floor(r() * 3), style: CSTY[Math.floor(r() * CSTY.length)], house: true }); ok = true; break; } if (ok) break; }
    }
    // cortili: quello che resta dentro gli isolati diventa orto o cortile
    // [città2] in città niente prato di risulta: quello che resta dentro gli isolati è corte lastricata
    for (let i = 0; i < N; i++) if (zone[i] === Z.CITTA && grid[i] === T.COB && roadW[i] === 0 && (i % GW) * TS < CITY_W0) { const tx = i % GW, ty = (i / GW) | 0; let walk = false; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const v = grid[(ty + dy) * GW + tx + dx]; if (v === T.WALK || v === T.PIAZZA || v === T.VIA || v === T.QUAY) walk = true; } if (!walk && !(FORT_X && tx * TS > FORT_X)) grid[i] = T.GRASS; }   // [città2] nella Rocca niente giardini
    // periferie: le costiere, con le case tra la strada e il mare o dalla parte della collina
    const perif = z => z === Z.CITTA;
    // [inverno] agglomerati come nei paesi: gruppi di case attaccate, la cui facciata segue la strada su una linea sola (scatta di una casella solo
    // dove la strada si sposta davvero), una casa ogni tanto arretrata a fare uno spiazzo, poi spazio aperto; dietro, una seconda fila a macchie.
    const walkFront = (pts, rdw, extra0, side0, wMin, wMax, hMin, hMax, rowGap, dens, o) => {   // o: { cont: fronte continuo, flat: filo dritto, jog: dentini, rk: rango della via, era, norot: sempre a filo griglia, wLow: la misura più stretta, x0/x1: tratto, fl: [min, max] piani, ex: campi in più }
      o = o || {};
      const chunks = []; let cur = [];
      for (let k = 0; k < pts.length; k++) { if (cur.length && dist(cur[cur.length - 1][0], cur[cur.length - 1][1], pts[k][0], pts[k][1]) > 14) { chunks.push(cur); cur = []; } cur.push(pts[k]); }
      if (cur.length) chunks.push(cur);
      chunks.forEach(ch0 => {
        // [città2] le case si mettono in fila nel verso delle x o delle y crescenti: un tratto che va all'indietro si gira
        // (e il lato si scambia, così le case restano dalla stessa parte della strada)
        const dX = ch0[ch0.length - 1][0] - ch0[0][0], dY = ch0[ch0.length - 1][1] - ch0[0][1], back = Math.abs(dX) >= Math.abs(dY) ? dX < 0 : dY < 0;
        const ch = back ? ch0.slice().reverse() : ch0, side = back ? -side0 : side0;
        const P = []; for (let k = 0; k < ch.length - 1; k++) { const L = dist(ch[k][0], ch[k][1], ch[k + 1][0], ch[k + 1][1]); for (let u = 0; u < L; u += TS) P.push([ch[k][0] + (ch[k + 1][0] - ch[k][0]) * u / L, ch[k][1] + (ch[k + 1][1] - ch[k][1]) * u / L]); }
        let i = 2, lastEnd = -1e9, left = 2 + Math.floor(r() * 5), cOff = o.flat ? 0 : r() < .5 ? 0 : 2 * (1 + Math.floor(r() * 2));
        while (i < P.length - 3) {
          if ((o.x0 !== undefined && P[i][0] < o.x0) || (o.x1 !== undefined && P[i][0] > o.x1)) { i++; continue; }
          let w = wMin + Math.floor(r() * (wMax - wMin + 1));
          const h = hMin + Math.floor(r() * (hMax - hMin + 1)), extra = extra0 + cOff + (r() < (o.jog !== undefined ? o.jog : .2) ? 2 : 0);
          let placed = false;
          if (dens < 1 && r() > dens) { i += 2 + Math.floor(r() * 3); continue; }
          for (; w >= (o.wLow || wMin) && !placed; w--) {
            const mid = Math.min(P.length - 2, i + Math.floor(w / 2)), dx = P[mid + 1][0] - P[mid - 1][0], dy = P[mid + 1][1] - P[mid - 1][1], L = Math.hypot(dx, dy) || 1, nx = -dy / L * side, ny = dx / L * side;
            const off = rdw / 2 + 2.5 + extra, nex = P[mid][0] + nx * off, ney = P[mid][1] + ny * off, horiz = Math.abs(dx) >= Math.abs(dy);
            let x, y, bw, bh, ok = false;
            // [città2] se dietro c'è già qualcosa (un edificio con nome, la casa della via accanto) la casa si fa meno profonda
            for (let hh = h; hh >= (o.hLow || h) && !ok; hh--) {
              if (horiz) { x = Math.max(Math.floor(P[i][0] / TS), lastEnd); bw = w; bh = hh; y = ny > 0 ? Math.round(ney / TS) : Math.round(ney / TS) - hh; }
              else { y = Math.max(Math.floor(P[i][1] / TS), lastEnd); bw = hh; bh = w; x = nx > 0 ? Math.round(nex / TS) : Math.round(nex / TS) - hh; }
              ok = perif(zone[Math.max(0, Math.min(GH - 1, y)) * GW + Math.max(0, Math.min(GW - 1, x))]) && free(x, y, bw, bh, 0); }
            if (!ok) continue;
            // [città2] la casa segue la strada: l'angolo della via rispetto alla griglia (fino a 32°) diventa la rotazione del palazzo;
            // le case in fila hanno il centro sulla linea della strada, così ruotate fanno una cortina continua sul filo della via
            const ang = Math.atan2(dy, dx); let rot = ang - Math.round(ang / (Math.PI / 2)) * (Math.PI / 2); if (Math.abs(rot) < .06 || Math.abs(rot) > .56) rot = 0;
            // ogni tanto la regola si rompe, se no sembra finto: una casa girata di qualche grado per conto suo, una rimasta dritta
            // (non nella griglia murattiana né sotto i portici del regime: lì il filo è legge)
            if (o.norot) rot = 0;
            else { const q = r(); if (q < .12) rot += (r() - .5) * .14; else if (q < .2 && rot) rot = 0; else if (q < .26 && !rot) rot = (r() - .5) * .12; }
            const fl = o.fl ? o.fl[0] + Math.floor(r() * (o.fl[1] - o.fl[0] + 1)) : 2 + Math.floor(r() * 2);
            stamp(Object.assign({ id: 'casa_' + (nH++), x, y, w: bw, h: bh, fl, style: CSTY[Math.floor(r() * CSTY.length)], house: true, rk: o.rk || 0, rot: Math.round(rot * 1000) / 1000 }, o.era ? { era: o.era } : {}, o.fl ? { flFix: true } : {}, o.ex || {}));
            const gap = r() < rowGap ? 1 + (r() < .25 ? 1 : 0) : 0; lastEnd = (horiz ? x + bw : y + bh) + gap; placed = true; i += w + gap;
          }
          if (placed && !o.cont && --left <= 0) { const gp = 3 + Math.floor(r() * 7); lastEnd += gp; i += gp; left = 2 + Math.floor(r() * 5); cOff = r() < .5 ? 0 : 2 * (1 + Math.floor(r() * 2)); }
          if (!placed) i++;
        }
      });
    };
    // [città2] LE CASE PER EPOCA (tappa 1). Ogni epoca col suo lotto, il suo tipo e la sua altezza; b.era dice da quale storia viene la casa
    // (da lì, non da un hash, verranno materiali e segni). Prima chi taglia (i portici della Vittoria, il Corso, la griglia), poi chi è
    // tagliato: il borgo riempie in aderenza quello che resta, le baracche si ammucchiano fra i binari e il mare.
    { const RD = id => roads.find(rd => rd.id === id), BOTH = [-1, 1];
      const WF = (id, ex, o, sd) => { const rd = RD(id); if (rd) (sd ? [sd] : BOTH).forEach(s => walkFront(rd.pts, rd.w, ex, s, o.w[0], o.w[1], o.h[0], o.h[1], o.gap || 0, o.dens || 1, Object.assign({ cont: true, flat: true, jog: 0 }, o))); };
      const WP = (pts, sd, o) => walkFront(pts, 0, -2.5, sd, o.w[0], o.w[1], o.h[0], o.h[1], 0, 1, Object.assign({ cont: true, flat: true, jog: 0 }, o));
      // E4 i portici della Vittoria: cortina continua a filo dell'asse, dritta anche dove il borgo è storto, cinque piani
      // [posa] dietro la fascia del portico (4,5 m): il portico lo fa il pezzo, la casa sta dietro col suo fronte di botteghe sotto le arcate
      // [cucitura] non più la cortina del regime a cinque piani: a nord, dietro il portico di bottega, palazzetti dell'Ottocento di 3 piani a
      // lotti stretti (6-10 m); a sud, sul lato della camera, case del borgo di 2 piani a filo del marciapiede, con le botteghe sotto
      WF('vittoria', POSA.port ? POSA.port.d1 - POSA.port.d0 : 0, { w: [3, 5], wLow: 2, h: [5, 6], hLow: 3, norot: true, era: 'E3', rk: 3, x0: 1024, fl: [3, 3], ex: POSA.port ? { vittoria: true } : { portico: true } }, -1);
      WF('vittoria', -2, { w: [3, 4], wLow: 2, h: [4, 6], hLow: 3, norot: true, era: 'E0', rk: 3, x0: 1024, fl: [2, 2], ex: { vittoriaSud: true } }, 1);
      // E3 il Corso: palazzi dell'Ottocento in cortina che seguono l'arco
      WF('corso', 0, { w: [4, 6], wLow: 3, h: [5, 6], hLow: 3, era: 'E3', rk: 3, fl: [2, 3] });   // [mappa_compatta] 2-3 piani (2 sul lato camera)
      // E6 le sostituzioni del boom sul Viale della Tutela: palazzine coi fianchi ciechi al posto di metà della cortina
      // [volumi2] niente palazzoni in centro: 4-5 piani, arretrate di 4 m dal filo (il giardinetto davanti), così non chiudono il viale
      const MUR = { w: [4, 6], wLow: 2, h: [5, 5], hLow: 3, norot: true, era: 'E3', rk: 2 };   // [borgo] gli isolati murattiani li costruisce PIENO, più sotto
      // E3 fra i binari e la Via della Stazione: magazzini e depositi bassi, con gli orti in mezzo
      // E6 il lungomare a ponente: alberghi e condomini alti uno staccato dall'altro (Miami); dal lato del mare la spiaggia resta libera
      // [volumi2] non più torri da 6-9 piani: 4-5 piani arretrati di 3 m (lo spiazzo dell'albergo), staccati uno dall'altro
      // [borgo] IL COSTRUITO PIENO E SCAVATO (tappe 2 e 4). Non si posano case lungo le strade: ogni isolato si costruisce tutto, a lotti in
      // aderenza col fronte sulla strada e la profondità verso dentro, a filo griglia (una via storta dà da sola i dentini delle facciate);
      // poi si scavano le corti. o: { x0, x1 (metri), inZ(tx, ty), ring (profondità della cortina: oltre è corte; senza, corti a caso nei cuori),
      // f: [fronte min, max], d: [profondità min, max] in caselle, mk(L, tx, ty) → campi della casa, tag }
      const PIENO = o => {
        const X0 = T2i(o.x0), X1 = T2i(o.x1), Y0 = 2, Y1 = GH - 2, open = v => v === T.WALK || v === T.PIAZZA || v === T.VIA || v === T.QUAY || v === T.GRAVEL || v === T.SAND || v === T.PIER;
        const inR = i => { const tx = i % GW, ty = (i / GW) | 0; if (tx < X0 || tx >= X1 || zone[i] !== Z.CITTA || roadW[i] > 0 || bIndex[i] >= 0 || (o.inZ && !o.inZ(tx, ty))) return false; const v = grid[i]; return !(open(v) || v === T.WATER || v === T.CLIFF || v === T.FOUNT || v === T.BLD); };
        const own = new Int32Array(N).fill(-1), D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        // la distanza dalla strada (in caselle): le caselle più lontane sono il cuore dell'isolato, dove si scava la corte
        const dS = new Int16Array(N).fill(99), q = [];
        for (let ty = Y0; ty < Y1; ty++) for (let tx = X0; tx < X1; tx++) { const i = ty * GW + tx; if (!inR(i)) continue;
          if (D4.some(([dx, dy]) => { const j = (ty + dy) * GW + tx + dx; return roadW[j] > 0 || open(grid[j]); })) { dS[i] = 0; q.push(i); } }
        for (let h = 0; h < q.length; h++) { const i = q[h], tx = i % GW, ty = (i / GW) | 0; for (const [dx, dy] of D4) { const j = (ty + dy) * GW + tx + dx; if (dS[j] > dS[i] + 1 && inR(j)) { dS[j] = dS[i] + 1; q.push(j); } } }
        let nCorti = 0;
        if (o.ring) { for (let ty = Y0; ty < Y1; ty++) for (let tx = X0; tx < X1; tx++) { const i = ty * GW + tx; if (dS[i] >= o.ring && dS[i] !== 99) { reserved[i] = 1; grid[i] = T.COB; nCorti++; } } }
        else { const seen = new Uint8Array(N);   // le corti del borgo: i cuori a 4 caselle o più dalla strada, uno su due, ognuno col suo passaggio
          for (let ty = Y0; ty < Y1; ty++) for (let tx = X0; tx < X1; tx++) { const i0 = ty * GW + tx; if (seen[i0] || dS[i0] < 4 || dS[i0] === 99) continue;
            const comp = [i0], st = [i0]; seen[i0] = 1; while (st.length) { const i = st.pop(), x = i % GW, y = (i / GW) | 0; for (const [dx, dy] of D4) { const j = (y + dy) * GW + x + dx; if (!seen[j] && dS[j] >= 3 && dS[j] !== 99) { seen[j] = 1; comp.push(j); st.push(j); } } }
            if (comp.length < 6 || hash2(tx, ty, 1701) > .55) continue;
            comp.forEach(i => { reserved[i] = 1; grid[i] = T.COB; });
            let i = comp.reduce((m, j) => dS[j] < dS[m] ? j : m, comp[0]);   // il passaggio: giù per le distanze fino alla strada
            for (let g = 0; g < 8 && dS[i] > 0; g++) { const x = i % GW, y = (i / GW) | 0; let nx = -1; for (const [dx, dy] of D4) { const j = (y + dy) * GW + x + dx; if (dS[j] < dS[i] && (nx < 0 || dS[j] < dS[nx])) nx = j; } if (nx < 0) break; i = nx; reserved[i] = 1; }
            nCorti++; } }
        // da che parte sta la strada: il fronte del lotto corre lungo la strada, la profondità entra nell'isolato
        const vert = (tx, ty) => { let dv = 99, dh = 99; for (let k = 1; k < 12; k++) { if (dv === 99 && [ty - k, ty + k].some(y => { const j = y * GW + tx; return roadW[j] > 0 || open(grid[j]); })) dv = k; if (dh === 99 && [tx - k, tx + k].some(x => { const j = ty * GW + x; return roadW[j] > 0 || open(grid[j]); })) dh = k; } return dv <= dh; };
        const ok = i => inR(i) && !reserved[i] && own[i] < 0, LOT = [];
        // prima si disegnano tutti i lotti, poi si costruiscono: così ogni porta cade sulla strada e non su un lotto ancora da fare
        for (let ty = Y0; ty < Y1; ty++) for (let tx = X0; tx < X1; tx++) { const i = ty * GW + tx; if (!ok(i)) continue;
          const F = o.f[0] + Math.floor(hash2(tx, ty, 1702) * (o.f[1] - o.f[0] + 1)), Dp = o.d[0] + Math.floor(hash2(tx, ty, 1703) * (o.d[1] - o.d[0] + 1)), hz = vert(tx, ty);
          const WM = hz ? F : Dp, HM = hz ? Dp : F;
          let w = 1; while (w < WM && ok(i + w) && flatOK(tx, ty, w + 1, 1, 1.4)) w++;
          let h = 1; for (; h < HM; h++) { let full = true; for (let k = 0; k < w && full; k++) if (!ok((ty + h) * GW + tx + k)) full = false; if (!full || !flatOK(tx, ty, w, h + 1, 1.4)) break; }
          for (let y = ty; y < ty + h; y++) for (let x = tx; x < tx + w; x++) own[y * GW + x] = LOT.length;
          LOT.push({ x: tx, y: ty, w, h });
        }
        if (o.pre) o.pre(LOT);
        LOT.forEach(L => { for (let y = L.y; y < L.y + L.h; y++) for (let x = L.x; x < L.x + L.w; x++) grid[y * GW + x] = T.BLD; });
        let nOk = 0; LOT.forEach(L => {
          const b = stamp(Object.assign({ id: 'casa_' + (nH++), x: L.x, y: L.y, w: L.w, h: L.h, fl: 2, style: CSTY[Math.floor(r() * CSTY.length)], house: true, rk: 1 }, o.mk(L, L.x, L.y), L.w * L.h < 2 ? { fl: 1, flFix: true, annesso: true } : {}));
          if (b) nOk++; else for (let y = L.y; y < L.y + L.h; y++) for (let x = L.x; x < L.x + L.w; x++) grid[y * GW + x] = T.COB;
        });
        if (typeof process !== 'undefined' && process.env && process.env.PV_DBG) console.log('[borgo]', o.tag, 'lotti', nOk, 'corti', nCorti);
      };
      // E3 la griglia murattiana: cortina continua profonda dieci metri, angoli pieni, la corte in mezzo; palazzi larghi 8-14 m
      PIENO({ tag: 'ottocento', x0: CITY_W0, x1: 998, ring: 4, f: [4, 6], d: [4, 4], inZ: (tx, ty) => ty * TS > CITY.pzStaz[3] + 1,   // [mappa_compatta] dal piazzale in giù
        mk: () => ({ era: 'E3', rk: 2, norot: true }) });
      // E0 il borgo: lotti stretti (fronte 4-6 m, profondi fino a 8 m); sulla marina le case dei pescatori (E2); agli incroci le case-torre
      // [mappa_compatta] le sei case-torre (4 piani), una per incrocio: Porta di Terra, sagrato, Pozzo, Forno, testa del Vico Lungo, mura
      // (MAPPA_COMPATTA.md sez. 2); prima erano a caso. Il lotto stretto (lato 4-6 m) più vicino al punto, entro 8 m.
      const TORRI = [[1008, 96], [1078, 100], [1116, 118], [1028, 166], [1098, 172], [1130, 76]].map(([x, y]) => ({ x, y, d: 12, L: null }));
      PIENO({ tag: 'borgo', x0: 998, x1: CITY.spian0 || 1143, f: [2, 3], d: [2, 4], pre: LOT => { LOT.forEach(L => { if (L.w < 2 || L.h < 2 || L.w > 3 || L.h > 3) return; const cx = (L.x + L.w / 2) * TS, cy = (L.y + L.h / 2) * TS;
          TORRI.forEach(q => { const d = dist(cx, cy, q.x, q.y); if (d < q.d) { q.d = d; q.L = L; } }); }); TORRI.forEach(q => { if (q.L) return; q.d = 18; LOT.forEach(L => { if (Math.min(L.w, L.h) < 2 || Math.max(L.w, L.h) > 4 || TORRI.some(o => o.L === L)) return; const d = dist((L.x + L.w / 2) * TS, (L.y + L.h / 2) * TS, q.x, q.y); if (d < q.d) { q.d = d; q.L = L; } }); }); }, mk: (L, tx, ty) => {
        const mar = CITY.marina && ty * TS > CITY.yOn(CITY.marina, tx * TS) - 14.5, /* [pianta] la Marina ora è larga 7 m coi marciapiedi: la fila sul porto parte 2,5 m più su */ torre = TORRI.some(q => q.L === L);
        // alto (3 piani) il lato nord della Rua (il lotto ci si affaccia) e la fila contro le mura di tramontana; il resto del borgo 2 piani
        const xc = (tx + L.w / 2) * TS, yR = CITY.yOn(CITY.rua, xc), nordRua = (ty + L.h) * TS <= yR && yR - (ty + L.h) * TS < 4.5, mura = ty * TS < CITY.muraY(xc) + 16;
        return Object.assign({ era: mar ? 'E2' : 'E0' }, nordRua || mura ? { alto: true } : {}, torre ? { fl: 4, flFix: true, torre: true } : {}); } });
      // [pianta] LE CASE DEL GLACIS: sulla spianata, fra il Viale e la Riva della Rocca, due isolati bassi (1-2 piani) a lotti stretti come il
      // borgo, tagliati dal Vico del Glacis; la Piazza della Rocca (il mercato all'aperto) resta libera davanti alla testa di ponte.
      // La città arriva al canale: niente più vuoto fra le ultime case e la fortezza.
      if (CITY.glacis) { const Gq = CITY.glacis, R = Gq.rivaPts, dentro = (x, y) => { let bd = 1e9, cr = 1; for (let k = 0; k < R.length - 1; k++) { const [ax, ay] = R[k], [bx, by] = R[k + 1], vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy || 1, t = clamp(((x - ax) * vx + (y - ay) * vy) / L2, 0, 1), d = dist(x, y, ax + vx * t, ay + vy * t); if (d < bd) { bd = d; cr = vx * (y - ay) - vy * (x - ax); } } return cr > 0 && bd > 3.6; };   // dalla parte della terra, oltre la riva
        const inG = (tx, ty) => { const x = tx * TS + 1, y = ty * TS + 1; return x > Gq.x0 && x < Gq.x1 && y > 60 && y < Gq.piazza[1] - 3 && Math.abs(y - Gq.vico) > 2.5 && dentro(x, y); };
        for (let ty = T2i(60); ty < T2i(Gq.piazza[1]); ty++) for (let tx = T2i(Gq.x0); tx < T2i(Gq.x1); tx++) { const i = ty * GW + tx; if (!inG(tx, ty) || grid[i] === T.WATER || roadW[i] > 0) continue; grid[i] = T.COB; reserved[i] = 0; zone[i] = Z.CITTA; }
        PIENO({ tag: 'glacis', x0: Gq.x0, x1: Gq.x1, f: [2, 3], d: [2, 4], inZ: inG, mk: (L, tx, ty) => ({ era: 'E0', glacis: true, fl: hash2(tx, ty, 1801) < .35 || L.w * L.h < 4 ? 1 : 2, flFix: true }) }); }
      // E7 le baracche fra la ferrovia e il mare: lamiera, uno o due piani, una addosso all'altra, passaggi di una casella
      // (ogni baracca tiene libero il suo lato nord o il suo lato ovest)
      const SHSTY = [3, 4, 5, 7, 8, 11, 14, 19]; let nShack = 0;
      for (let pass = 0; pass < 4; pass++) for (let ty = 2; ty < GH - 6; ty++) for (let tx = T2i(902); tx < T2i(1022); tx++) {   // [mappa_compatta] fra i binari e il mare, dalla discarica alle mura
        if (hash2(tx, ty, 61 + pass) > .6) continue;
        const i = ty * GW + tx, v = grid[i]; if ((zone[i] !== Z.CITTA && zone[i] !== Z.CAMPAGNA) || (v !== T.COB && v !== T.GRASS && v !== T.SHRUB && v !== T.TREE && v !== T.DIRT && v !== T.ROCK) || roadW[i] > 0) continue;   // [mappa_compatta] le baracche arrivano alla discarica, fuori dalla città murata
        if (!CITY.railY || ty * TS > CITY.railY(tx * TS) - 6) continue;
        const w = 2 + Math.floor(r() * 2), h = 2 + Math.floor(r() * 2);
        if (!free(tx, ty, w, h, 0) || (ty + h) * TS > CITY.railY(tx * TS) - 3) continue;
        let okN = true, okW = true; for (let k = 0; k < w && okN; k++) { const a = (ty - 1) * GW + tx + k; if (bIndex[a] >= 0) okN = false; } for (let k = 0; k < h && okW; k++) { const a = (ty + k) * GW + tx - 1; if (bIndex[a] >= 0) okW = false; }
        if (!(okN || okW) || !flatOK(tx, ty, w, h, 1.8)) continue;
        stamp({ id: 'casa_' + (nH++), x: tx, y: ty, w, h, fl: r() < .72 ? 1 : 2, style: SHSTY[Math.floor(r() * SHSTY.length)], house: true, shack: true, era: 'E7' });
        if (okN) for (let k = 0; k < w; k++) reserved[(ty - 1) * GW + tx + k] = 1; else for (let k = 0; k < h; k++) reserved[(ty + k) * GW + tx - 1] = 1;
        nShack++;
      }
      // le case girate che toccano una vicina girata diversamente si raddrizzano: due scatole con angoli diversi in aderenza si
      // compenetrano agli spigoli invece di sembrare un muro solo. Le file con lo stesso angolo lungo lo stesso vicolo restano storte
      B.forEach(b => { if (!b.era || !b.rot) return; let touch = false;
        for (let ty = b.y - 1; ty <= b.y + b.h && !touch; ty++) for (let tx = b.x - 1; tx <= b.x + b.w && !touch; tx++) { if (tx >= b.x && tx < b.x + b.w && ty >= b.y && ty < b.y + b.h) continue; const j = ty * GW + tx, c = bIndex[j] >= 0 ? B[bIndex[j]] : null; if (c && c !== b && Math.abs((c.rot || 0) - b.rot) > .03) touch = true; }
        if (touch) b.rot = 0; });
      // [pianta] I LOTTI ORIENTATI lungo le vie storte (vedi in testa): le case che hanno davanti una di queste vie si ridisegnano nel
      // riferimento della via. Per lato, in fila lungo la via: i confini fra una casa e l'altra a metà fra le loro estensioni, il fronte
      // comune sul filo della casa più avanti (mai dentro la carreggiata), il retro dov'era; l'angolo della via. L'impronta a caselle resta
      // (griglia, camminabilità, porte). Una casa il cui lotto entrerebbe in un'altra (più di 5 cm) resta com'era.
      { const qL = typeof location !== 'undefined' && location.search ? /[?&]lotti=([^&]+)/.exec(location.search) : null;   // in prova: ancora nessuna via (la Rua: PV_LOTTI_VIE=rua in node, ?lotti=rua nel gioco)
        CITY.lottiVie = qL ? decodeURIComponent(qL[1]).split(',') : typeof process !== 'undefined' && process.env && process.env.PV_LOTTI_VIE ? process.env.PV_LOTTI_VIE.split(',') : []; }
      { const w90 = a => { a = ((a % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2); return a > Math.PI / 4 ? a - Math.PI / 2 : a; };
        const RDV = CITY.roads.filter(rd => rd.kind === 'citta' || rd.kind === 'vicolo'), VIE = RDV.filter(rd => CITY.lottiVie.includes(rd.id));
        const vicino = (rd, x, y) => { let best = null, acc = 0; const Q = rd.pts; for (let k = 0; k < Q.length - 1; k++) { const [ax, ay] = Q[k], [bx, by] = Q[k + 1], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-6, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (L * L))), px = ax + dx * t, py = ay + dy * t, d = Math.hypot(x - px, y - py);
          if (!best || d < best.d) best = { d, a: Math.atan2(dy, dx), u: acc + t * L, ux: dx / L, uy: dy / L, v: (x - px) * (-dy / L) + (y - py) * (dx / L), px, py }; acc += L; } return best; };
        const poly = (cx, cy, lw, ld, a) => { const c = Math.cos(a), s = Math.sin(a); return [[-lw / 2, -ld / 2], [lw / 2, -ld / 2], [lw / 2, ld / 2], [-lw / 2, ld / 2]].map(([u, v]) => [cx + u * c - v * s, cy + u * s + v * c]); };
        const pen = (P, Q) => { let m = 1e9; for (const R of [P, Q]) for (let i = 0; i < 4; i++) { const [x1, y1] = R[i], [x2, y2] = R[(i + 1) % 4], nx = y2 - y1, ny = x1 - x2, l = Math.hypot(nx, ny) || 1, pr = S => S.map(([x, y]) => (x * nx + y * ny) / l), A = pr(P), C = pr(Q), o = Math.min(Math.max(...A), Math.max(...C)) - Math.max(Math.min(...A), Math.min(...C)); if (o < m) m = o; } return m; };
        const scatola = b => b.cx !== undefined ? poly(b.cx, b.cy, b.lw, b.ld, b.rot || 0) : poly((b.x + b.w / 2) * TS, (b.y + b.h / 2) * TS, b.w * TS, b.h * TS, b.sign || b.shop ? 0 : b.rot || 0);
        let nL = 0; const DBGL = typeof process !== 'undefined' && process.env && process.env.PV_LOTTI ? [] : null;
        VIE.forEach(rd => { const fila = [[], []];
          B.forEach(b => { if (!b.house || b.pezzo || b.military || b.sign || b.shop || b.vittoria || b.sottoPortico || b.tiers || b.__tierOf) return; const cx = (b.x + b.w / 2) * TS, cy = (b.y + b.h / 2) * TS, half = Math.max(b.w, b.h) * TS / 2;
            let best = null, bq = null; for (const o of RDV) { const q = vicino(o, cx, cy); if (!q || q.d - o.w / 2 - half > 4) continue; if (!bq || q.d < bq.d) { bq = q; best = o; } } if (best !== rd) return;
            const hx = b.w * TS / 2, hy = b.h * TS / 2, along = Math.abs(bq.ux) * hx + Math.abs(bq.uy) * hy, across = Math.abs(bq.uy) * hx + Math.abs(bq.ux) * hy;
            fila[bq.v > 0 ? 0 : 1].push({ b, u: bq.u, a0: bq.u - along, a1: bq.u + along, f: Math.abs(bq.v) - across, r: Math.abs(bq.v) + across }); });
          fila.forEach((F, lato) => { F.sort((p, q) => p.u - q.u); if (!F.length) return; const fr = Math.max(rd.w / 2 + .15, Math.min(...F.map(q => q.f)));
            for (let k = 0; k < F.length; k++) { const q = F[k], pr = F[k - 1], nx = F[k + 1];   // i confini: a metà dove le estensioni si toccano o si sovrappongono, il vuoto resta vuoto
              if (pr && pr.a1 > q.a0 - .6) q.a0 = (pr.a1 + q.a0) / 2; if (nx && q.a1 > nx.a0 - .6) q.a1 = (q.a1 + nx.a0) / 2; }
            const inFila = new Set(F.map(q => q.b));
            // il lotto di q, col retro accorciato di dd e i fianchi stretti di d0 (inizio) e d1 (fine): il fronte resta sul filo comune
            const fai = (q, d0, d1, dd) => { const b = q.b, a0 = q.a0 + d0, a1 = q.a1 - d1, lw0 = a1 - a0, dep = q.r - fr - dd; if (lw0 < 2.4 || dep < 2.8) return null; const um = (a0 + a1) / 2, vm = (fr + dep / 2) * (lato === 0 ? 1 : -1);
              const P = vicino(rd, (b.x + b.w / 2) * TS, (b.y + b.h / 2) * TS), ox = P.px + P.ux * (um - P.u), oy = P.py + P.uy * (um - P.u), cx = ox - P.uy * vm, cy = oy + P.ux * vm, rot = w90(P.a);
              const lx = Math.abs(Math.cos(rot) * P.ux + Math.sin(rot) * P.uy) > .7, lw = lx ? lw0 : dep, ld = lx ? dep : lw0;   // la larghezza sta sull'asse locale che corre lungo la via
              return { b, S: poly(cx, cy, lw, ld, rot), L: { cx: +cx.toFixed(3), cy: +cy.toFixed(3), lw: +lw.toFixed(3), ld: +ld.toFixed(3), rot: Math.abs(rot) < .01 ? 0 : +rot.toFixed(4), lotto: rd.id } }; };
            const fuori = (n) => { const b = n.b; for (let ty = b.y - 3; ty <= b.y + b.h + 2; ty++) for (let tx = b.x - 3; tx <= b.x + b.w + 2; tx++) { if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) continue; const k = bIndex[ty * GW + tx]; if (k < 0 || B[k] === b || inFila.has(B[k])) continue; if (pen(n.S, scatola(B[k])) > .05) return true; } return false; };
            const PROVE = []; for (const dd of [0, .3, .6, 1, 1.5, 2.2]) for (const dw of [0, .3, .6, 1]) PROVE.push([dw, dw, dd]);
            const nuovi = F.map(q => { for (const [d0, d1, dd] of PROVE) { const n = fai(q, d0, d1, dd); if (n && !fuori(n)) return Object.assign(n, { q }); } if (DBGL) DBGL.push(['urta fuori', q.b.id]); return null; });
            // fra vicini della fila: chi entra nel lotto accanto si stringe da quel lato (fino a 1 m); se non basta resta com'era
            for (let k = 0; k < nuovi.length; k++) { const n = nuovi[k]; if (!n) continue;
              for (let it = 0; it < 6; it++) { const altri = []; F.forEach((c, j) => { if (j === k) return; altri.push(nuovi[j] ? nuovi[j].S : scatola(c.b)); }); if (!altri.some(Q => pen(n.S, Q) > .05)) break;
                const m = fai(n.q, .2 * (it + 1), .2 * (it + 1), 0); if (!m || fuori(m)) { nuovi[k] = null; break; } nuovi[k] = Object.assign(m, { q: n.q }); if (it === 5) nuovi[k] = null; } }
            const tieni = new Set(nuovi.filter(Boolean)); let cambia = true;
            while (cambia) { cambia = false; for (const n of [...tieni]) { const altri = [...inFila].filter(c => c !== n.b).map(c => { const m = [...tieni].find(o => o.b === c); return m ? m.S : scatola(c); });
              if (altri.some(Q => pen(n.S, Q) > .05)) { tieni.delete(n); cambia = true; if (DBGL) DBGL.push(['urta fila', n.b.id]); } } }
            tieni.forEach(n => { Object.assign(n.b, n.L); nL++; }); }); });
        CITY.nLotti = nL; if (DBGL) console.error('[lotti]', nL, JSON.stringify(DBGL)); }
      // [pianta] L'ISOLATO ORIENTATO (il PIENO lungo una via storta): un isolato intero si ridisegna nel riferimento della via che ha davanti.
      // La fila sul fronte diventa una cortina di lotti in aderenza, col filo comune sulla facciata più arretrata (nessuna casa avanza sul
      // selciato) e i confini a metà fra una casa e l'altra; le case dietro restano dritte e si accorciano dove la cortina ha bisogno di posto
      // (nessuna casa sparisce: botteghe, posti e percorsi restano agganciati). Le caselle che la cortina lascia scoperte sul fronte tornano
      // selciato; quelle che copre diventano sue. CITY.isolatiOrientati: [{ via, x, y }], un punto dentro l'isolato (coordinate del mondo di generazione).
      { const qI = typeof location !== 'undefined' && location.search ? /[?&]isolati=([^&]+)/.exec(location.search) : null, eI = typeof process !== 'undefined' && process.env && process.env.PV_ISOLATI;
        const PRESETS = { rua1: { via: 'rua', x: 1036, y: 113 } };   // la Rua fra il Vico dei Pescatori e il Vico dei Lanternini, a sud
        CITY.isolatiOrientati = (qI ? decodeURIComponent(qI[1]) : eI || '').split(',').filter(k => PRESETS[k]).map(k => Object.assign({ k }, PRESETS[k]));
        const w90 = a => { a = ((a % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2); return a > Math.PI / 4 ? a - Math.PI / 2 : a; };
        const poly = (cx, cy, lw, ld, a) => { const c = Math.cos(a), s = Math.sin(a); return [[-lw / 2, -ld / 2], [lw / 2, -ld / 2], [lw / 2, ld / 2], [-lw / 2, ld / 2]].map(([u, v]) => [cx + u * c - v * s, cy + u * s + v * c]); };
        const pen = (P, Q) => { let m = 1e9; for (const R of [P, Q]) for (let i = 0; i < 4; i++) { const [x1, y1] = R[i], [x2, y2] = R[(i + 1) % 4], nx = y2 - y1, ny = x1 - x2, l = Math.hypot(nx, ny) || 1, pr = S => S.map(([x, y]) => (x * nx + y * ny) / l), A = pr(P), C = pr(Q), o = Math.min(Math.max(...A), Math.max(...C)) - Math.max(Math.min(...A), Math.min(...C)); if (o < m) m = o; } return m; };
        const dentroP = (P, x, y) => { let s0 = 0; for (let i = 0; i < 4; i++) { const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % 4], c = (x2 - x1) * (y - y1) - (y2 - y1) * (x - x1); if (c !== 0) { if (s0 && Math.sign(c) !== s0) return false; s0 = Math.sign(c); } } return true; };
        const LOG = typeof process !== 'undefined' && process.env && process.env.PV_ISOLATI_DBG ? [] : null;
        CITY.isolatiOrientati.forEach(IS => { const rd = CITY.roads.find(r => r.id === IS.via); if (!rd) return;
          // l'isolato: le caselle (case e cortili) raggiungibili dal punto senza passare per una strada
          const t0 = T2i(IS.y) * GW + T2i(IS.x); if (roadW[t0] > 0) return; const isol = new Set([t0]), st = [t0];
          while (st.length) { const i = st.pop(), x = i % GW, y = (i / GW) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = (y + dy) * GW + x + dx; if (isol.has(j) || roadW[j] > 0 || zone[j] !== Z.CITTA) continue; const v = grid[j]; if (v !== T.BLD && v !== T.COB) continue; if (v === T.BLD && (bIndex[j] < 0 || B[bIndex[j]].pezzo || B[bIndex[j]].sign || B[bIndex[j]].shop || B[bIndex[j]].vittoria || B[bIndex[j]].era === 'E3' || !B[bIndex[j]].house)) continue; isol.add(j); st.push(j); if (isol.size > 900) break; } }
          const CASE = [...new Set([...isol].map(i => bIndex[i]).filter(k => k >= 0))].map(k => B[k]);
          // la via davanti: la retta che meglio segue i punti della via lungo l'isolato
          let xs = [...isol].map(i => (i % GW + .5) * TS), uMin = Math.min(...xs) - 4, uMax = Math.max(...xs) + 4, ys = [...isol].map(i => (((i / GW) | 0) + .5) * TS), yC = (Math.min(...ys) + Math.max(...ys)) / 2;
          const Q = rd.pts.filter(([x]) => x >= uMin && x <= uMax); if (Q.length < 2) return; const mx = Q.reduce((s, q) => s + q[0], 0) / Q.length, my = Q.reduce((s, q) => s + q[1], 0) / Q.length;
          let sxx = 0, sxy = 0, syy = 0; Q.forEach(([x, y]) => { sxx += (x - mx) ** 2; sxy += (x - mx) * (y - my); syy += (y - my) ** 2; }); const ang = .5 * Math.atan2(2 * sxy, sxx - syy), ux = Math.cos(ang), uy = Math.sin(ang);
          const sg = Math.sign((yC - my) * ux - 0 * uy - ((Math.min(...xs) + Math.max(...xs)) / 2 - mx) * uy) || 1, nx = -uy * sg, ny = ux * sg;   // la normale verso l'isolato
          const U = (x, y) => (x - mx) * ux + (y - my) * uy, V = (x, y) => (x - mx) * nx + (y - my) * ny, rot = w90(ang);
          const ext = b => { const P = [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]].map(([x, y]) => [x * TS, y * TS]); const us = P.map(p => U(...p)), vs = P.map(p => V(...p)); return { u0: Math.min(...us), u1: Math.max(...us), v0: Math.min(...vs), v1: Math.max(...vs) }; };
          // la griglia ruotata: celle di 2 m nel riferimento della via, dalla riva della carreggiata verso dentro. Ogni cella va alla casa che
          // ha la casella sotto il suo centro; nella prima fila anche il ritaglio fra la scaletta delle facciate e la via va alla casa dietro
          const cs = TS, colMin = new Map(); [...isol].forEach(i => { const x = (i % GW + .5) * TS, y = (((i / GW) | 0) + .5) * TS, c = Math.round(U(x, y) / cs), v = V(x, y) - TS / 2; if (!colMin.has(c) || v < colMin.get(c)) colMin.set(c, v); });
          const cm = [...colMin.values()].sort((p, q) => p - q), v0 = Math.max(rd.w / 2 + .1, cm[Math.floor(cm.length / 2)]);   // il filo: dove la scaletta delle facciate sta a metà, mai dentro la carreggiata vera
          const uS = [...isol].map(i => U((i % GW + .5) * TS, (((i / GW) | 0) + .5) * TS)), vS = [...isol].map(i => V((i % GW + .5) * TS, (((i / GW) | 0) + .5) * TS));
          const iA = Math.floor((Math.min(...uS) - 2) / cs), iB = Math.ceil((Math.max(...uS) + 2) / cs), jB = Math.ceil((Math.max(...vS) + 2 - v0) / cs);
          const W2 = (u, v) => [mx + ux * u + nx * v, my + uy * u + ny * v], tIdx = (x, y) => T2i(y) * GW + T2i(x), CASEset = new Set(CASE);
          const own = new Map(), key = (a, b) => a * 4096 + b, chi = (a, b) => own.get(key(a, b));
          for (let jj = 0; jj < jB; jj++) for (let ii = iA; ii < iB; ii++) { const [x, y] = W2((ii + .5) * cs, v0 + (jj + .5) * cs), t = tIdx(x, y); if (!isol.has(t)) continue; const k = bIndex[t]; own.set(key(ii, jj), k >= 0 && CASEset.has(B[k]) ? B[k] : 0); }
          for (let ii = iA; ii < iB; ii++) { if (own.has(key(ii, 0))) continue; const [x, y] = W2((ii + .5) * cs, v0 + .5 * cs), t = tIdx(x, y), dietro = chi(ii, 1); if (!dietro) continue; const v = grid[t]; if (v === T.WALK || v === T.COB || v === T.PIAZZA || v === T.VIA) own.set(key(ii, 0), dietro); }   // la prima fila: anche il selciato e la vernice oltre la carreggiata vera
          // il lotto di ogni casa: il rettangolo più grande fatto solo di celle sue (si stringe dal lato con più celle d'altri)
          const lotti = []; CASE.forEach(b => { let i0 = 1e9, i1 = -1e9, j0 = 1e9, j1 = -1e9; own.forEach((o, k) => { if (o !== b) return; const a = Math.floor(k / 4096 + .5 * Math.sign(k)), jj = ((k % 4096) + 4096) % 4096, ii = (k - jj) / 4096; i0 = Math.min(i0, ii); i1 = Math.max(i1, ii); j0 = Math.min(j0, jj); j1 = Math.max(j1, jj); });
            if (i0 > i1) return; const altri = (a0, a1, b0, b1) => { let n = 0; for (let ii = a0; ii <= a1; ii++) for (let jj = b0; jj <= b1; jj++) if (chi(ii, jj) !== b) n++; return n; };
            for (let it = 0; it < 40 && i0 <= i1 && j0 <= j1 && altri(i0, i1, j0, j1); it++) { const c = [altri(i0, i0, j0, j1) / (j1 - j0 + 1), altri(i1, i1, j0, j1) / (j1 - j0 + 1), altri(i0, i1, j0, j0) / (i1 - i0 + 1), altri(i0, i1, j1, j1) / (i1 - i0 + 1)], m = c.indexOf(Math.max(...c));
              if (m === 0) i0++; else if (m === 1) i1--; else if (m === 2) j0++; else j1--; }
            if (i0 > i1 || j0 > j1 || (i1 - i0 + 1) * cs < 2 || (j1 - j0 + 1) * cs < 2) return;
            const um = (i0 + i1 + 1) / 2 * cs, vm = v0 + (j0 + j1 + 1) / 2 * cs, [cx, cy] = W2(um, vm), lu = (i1 - i0 + 1) * cs, lv = (j1 - j0 + 1) * cs, lx = Math.abs(Math.cos(rot) * ux + Math.sin(rot) * uy) > .7;
            const lw = lx ? lu : lv, ld = lx ? lv : lu; lotti.push({ b, cx, cy, lw, ld, P: poly(cx, cy, lw, ld, rot), fronte: j0 === 0 }); });
          // le caselle: ognuna della casa il cui lotto copre il suo centro, se no cortile (o selciato sul fronte)
          const tocca = new Set(isol); own.forEach((o, k) => { if (!o) return; const jj = ((k % 4096) + 4096) % 4096, ii = (k - jj) / 4096, [x, y] = W2((ii + .5) * cs, v0 + (jj + .5) * cs); tocca.add(tIdx(x, y)); });
          let nLib = 0, nOcc = 0; const tiles = new Map(); tocca.forEach(i => { const x = (i % GW + .5) * TS, y = (((i / GW) | 0) + .5) * TS, L = lotti.find(L => dentroP(L.P, x, y));
            if (L) { if (grid[i] !== T.BLD || bIndex[i] !== L.b.i) nOcc++; grid[i] = T.BLD; bIndex[i] = L.b.i; elev[i] = L.b.base; roadW[i] = 0; (tiles.get(L.b) || tiles.set(L.b, []).get(L.b)).push(i); }
            else if (grid[i] === T.BLD && bIndex[i] >= 0 && CASEset.has(B[bIndex[i]]) && lotti.some(L => L.b === B[bIndex[i]])) { grid[i] = T.COB; bIndex[i] = -1; reserved[i] = 1; nLib++; } });
          // la casa: la sua scatola, l'impronta a caselle nuova e la porta sul lato della via
          const porte = new Set(B.filter(o => o.door && !CASEset.has(o)).map(o => o.door[1] * GW + o.door[0]));   // una porta per casa: le caselle già prese non si riusano
          lotti.forEach(L => { const b = L.b, T0 = tiles.get(b) || []; if (!T0.length) return; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; T0.forEach(i => { const x = i % GW, y = (i / GW) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
            Object.assign(b, { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, cx: +L.cx.toFixed(3), cy: +L.cy.toFixed(3), lw: L.lw, ld: L.ld, rot: Math.abs(rot) < .01 ? 0 : +rot.toFixed(4), lotto: rd.id, isolato: IS.k });
            const mine = new Set(T0); let best = null, bs = 1e9; T0.forEach(i => { const x = i % GW, y = (i / GW) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const t = (y + dy) * GW + x + dx; if (mine.has(t) || porte.has(t)) continue; const v = grid[t]; if (v === T.BLD || v === T.WATER || v === T.TREE || v === T.FOUNT || v === T.CLIFF) continue;
              const px = (x + dx + .5) * TS, py = (y + dy + .5) * TS, sc = V(px, py) + Math.abs(U(px, py) - U(b.cx, b.cy)) * .3 + (roadW[t] > 0 || v === T.WALK || v === T.VIA ? 0 : 1.5); if (sc < bs) { bs = sc; best = [x + dx, y + dy]; } } });
            if (!best) T0.forEach(i => { const x = i % GW, y = (i / GW) | 0; for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const t = (y + dy) * GW + x + dx; if (mine.has(t) || porte.has(t)) continue; const v = grid[t]; if (v === T.BLD || v === T.WATER || v === T.TREE || v === T.FOUNT || v === T.CLIFF) continue; const sc = V((x + dx + .5) * TS, (y + dy + .5) * TS) + 3; if (sc < bs) { bs = sc; best = [x + dx, y + dy]; } } });
            if (best) { b.door = best; porte.add(best[1] * GW + best[0]); } });
          if (LOG) LOG.push([IS.k, 'case', CASE.length, 'lotti', lotti.length, 'sul fronte', lotti.filter(L => L.fronte).length, 'angolo', +(rot * 180 / Math.PI).toFixed(1), 'caselle libere', nLib, 'coperte', nOcc, 'senza lotto', CASE.filter(b => !lotti.some(L => L.b === b)).map(b => b.id).join(' ')]); });
        if (LOG) console.error('[isolati]', JSON.stringify(LOG)); }
      // il marciapiede arriva fino al muro: i ritagli fra il marciapiede e le facciate arretrate diventano marciapiede (niente terra di nessuno)
      for (let pass = 0; pass < 3; pass++) { const add = [];
        for (let ty = 1; ty < GH - 1; ty++) for (let tx = T2i(CITY_W0); tx < T2i(CITY.spian0 || 1143); tx++) { const i = ty * GW + tx; if (grid[i] !== T.COB || roadW[i] > 0 || reserved[i] || zone[i] !== Z.CITTA) continue;
          if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => grid[(ty + dy) * GW + tx + dx] === T.WALK)) add.push(i); }
        add.forEach(i => { grid[i] = T.WALK; }); }
      // le corti chiuse dentro gli isolati (non toccano strade né vicoli) diventano giardini e orti di casa, coi vasi e le piante:
      // da fuori non si vedono, dai tetti sì; quelle che danno su un vicolo restano slarghi lastricati
      { const seen = new Uint8Array(N), open = v => v === T.WALK || v === T.PIAZZA || v === T.VIA || v === T.QUAY || v === T.GRAVEL || v === T.SAND;
        for (let ty0 = 1; ty0 < GH - 1; ty0++) for (let tx0 = T2i(CITY_W0); tx0 < T2i(CITY.spian0 || 1143); tx0++) { const i0 = ty0 * GW + tx0;
          if (seen[i0] || grid[i0] !== T.COB || roadW[i0] > 0 || zone[i0] !== Z.CITTA || reserved[i0]) continue;
          const comp = [i0], q = [i0]; seen[i0] = 1; let touch = false;
          while (q.length) { const i = q.pop(), tx = i % GW, ty = (i / GW) | 0;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = (ty + dy) * GW + tx + dx, v = grid[j]; if (roadW[j] > 0 || open(v)) { touch = true; continue; }
              if (seen[j] || v !== T.COB || reserved[j]) continue; seen[j] = 1; comp.push(j); q.push(j); } }
          if (touch || comp.length < 2) continue;
          const lastr = hash2(tx0, ty0, 1611) < .3;   // una corte su tre resta lastricata (stendini, biciclette, il pozzo)
          comp.forEach(i => { if (!lastr) grid[i] = hash2(i % GW, (i / GW) | 0, 1612) < .12 && comp.length > 6 ? T.TREE : hash2(i % GW, (i / GW) | 0, 1613) < .2 ? T.SHRUB : T.GRASS; }); } }
      if (typeof process !== 'undefined' && process.env && process.env.PV_DBG) { const c = {}; B.forEach(b => { if (b.era) c[b.era] = (c[b.era] || 0) + 1; }); console.log('[città2] case per epoca', JSON.stringify(c), 'baracche', nShack); }
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
      const x = Px(60) + r() * (840 - Px(60)), y = 40 + r() * 330;   // [isola] tutta la testa e il collo   [isola-ridotta] da dove comincia la testa ora
      const z = zoneAt(x, y); if (z !== Z.CAMPAGNA && z !== Z.MACCHIA && z !== Z.DESERTO) continue;
      if (z === Z.DESERTO || !OnLand0(x, y) || (x < XF && (bosco(x, y).f & (BF.TOP | BF.TERR | BF.TALUS | BF.WALL | BF.CANALE | BF.LECCI)))) continue;   // [arcipelago] le isole sono disabitate          // il Tavolato è dei beduini: niente case   [altopiano] neanche sui gradoni, sui ghiaioni e nei canaloni
      const s = site(x, y, 4, 4, 2); if (!s || !flatOK(s[0], s[1], 4, 4, 1.4)) continue; stamp({ id: 'casa_' + (nH++), x: s[0], y: s[1], w: 4, h: 4, fl: 1, style: [4, 5, 8][k % 3], house: true, farm: true, wood: true });
    }
    // [isola] i borghi dei pescatori: casette basse sulla riva, sparse e storte, col pontile di legno e lo scalo
    const FISHP = [];
    [['pescatori_s', 'Borgo dei pescatori', Px(470), SouthY(Px(470)) - 21, 1], ['pescatori_n', 'Case della Tramontana', Px(566), NorthY(Px(566)) + 21, -1], ['pescatori_t', 'Capanni della Punta', Px(152), SouthY(Px(152)) - 21, 1]].forEach(([id, name, cx, cy, sd]) => {
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
    // [città2] niente baracche sparse: i soldati stanno nella caserma della Rocca
    // ---------------- ALTEZZE: un paese basso ----------------
    // quasi tutto a uno o due piani; poche eccezioni che si vedono da lontano
    const ALTI = { chiesa: 3, rocca: 5, faro: 7, miramare: 3, oceano: 4, stella: 3, santuario: 3, cultura: 3, pietra: 2, governo: 3, ministero: 3, garante: 2, archivio: 2 };   // [cucitura] la Pietra è la caserma (2 piani), il Garante il corpo di guardia
    B.forEach(b => {
      if (ALTI[b.id]) { b.fl = ALTI[b.id]; return; } if (b.block) { b.fl = 4; return; } if (b.shack) return;
      if (b.warehouse || b.kiosk || b.farm || b.fisher) { b.fl = Math.min(b.fl, b.fisher && hash2(b.x, b.y, 4) < .2 ? 2 : 1); return; }
      if (zone[b.y * GW + b.x] !== Z.CITTA) { b.fl = Math.min(b.fl, hash2(b.x, b.y, 3) < .3 ? 1 : 2); return; }
      // [città2] l'altezza viene dall'epoca: borgo 2-4 (più alto sulla Rua, le case vicine si somigliano), marina 3-4, Ottocento 3-4
      // (4 sul Corso e sul Mercato), portici del regime 5; il boom e i magazzini hanno i piani decisi da chi li ha messi
      if (b.era) {
        if (b.flFix) return;
        const q = hash2(b.x, b.y, 36), nb = hash2(Math.floor(b.x / 6), Math.floor(b.y / 6), 37);
        // [mappa_compatta] niente sopra i tre piani: il borgo 2 (3 sul lato nord della Rua e contro le mura), la marina 3 (2 le piccole),
        // l'Ottocento 3; il lato camera delle vie scende a 2 più sotto (TETTO)
        if (b.era === 'E0') { b.fl = b.alto ? (nb < .2 ? 2 : 3) : (nb > .9 ? 3 : 2); if (b.w * b.h < 6) b.fl = Math.min(b.fl, 2); void q; }   // il borgo è basso: dall'alto si vedono i vicoli
        else if (b.era === 'E2') b.fl = b.w * b.h < 6 ? 2 : 3;
        else if (b.era === 'E3') b.fl = 3;
        else if (b.era === 'E4') b.fl = 3;   // [volumi2] dietro i portici tre piani: la cortina la fanno i portici, a corpi con la loro quota
        return;
      }
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
    // [volumi2] ALTEZZE LEGGIBILI (LEGGIBILITA.md sez. 1). La camera sta a sud-est e guarda in diagonale: una casa alta H sul lato sud o est
    // di una strada ne nasconde 0,8 × H metri. Quindi per tipo di via un tetto massimo sul lato camera (vicoli 3 piani, Rua e marina 3,
    // vie dell'Ottocento e Corso 4, Vittoria 3 coi portici), poi i tetti del borgo si raccordano: fra due case attaccate al più un piano
    // (i tetti sono un livello esplorabile, si salta da uno all'altro).
    { const CR = roads.filter(rd => CITY.roads.includes(rd) && rd.pts && rd.pts.length > 1), SG = [];
      CR.forEach(rd => { for (let k = 0; k < rd.pts.length - 1; k++) SG.push([rd.pts[k][0], rd.pts[k][1], rd.pts[k + 1][0], rd.pts[k + 1][1], rd.w / 2, rd.id]); });
      const dSg = (x, y, q) => { const vx = q[2] - q[0], vy = q[3] - q[1], L2 = vx * vx + vy * vy || 1, u = clamp(((x - q[0]) * vx + (y - q[1]) * vy) / L2, 0, 1); return dist(x, y, q[0] + u * vx, q[1] + u * vy); };
      const viaA = (x, y) => { let id = null, bd = 1e9; for (const q of SG) { if (x < Math.min(q[0], q[2]) - 9 || x > Math.max(q[0], q[2]) + 9 || y < Math.min(q[1], q[3]) - 9 || y > Math.max(q[1], q[3]) + 9) continue; const d = dSg(x, y, q) - q[4]; if (d < bd) { bd = d; id = q[5]; } } return bd < 1.2 ? id : null; };
      const TETTO = id => /^vic_/.test(id) || id === 'mezzo' || id === 'cavour_sotto' || id === 'galleria' || id === 'carceri' || id === 'giardini' ? 3 : id === 'rua' || id === 'marina' || id === 'corso' || /^via_/.test(id) || id === 'vittoria' ? 2 : 9;   // [cucitura] anche la Vittoria: 2 piani sul lato camera   // [mappa_compatta] sulle vie il fronte lato camera ha al più 2 piani
      // il lato camera: la strada sta a nord o a ovest della casa (fino a 3 m oltre il filo, dove c'è il marciapiede)
      // sulle vie dell'Ottocento (7-8 m) il fronte verso la camera sta a 3 piani e solo gli angoli (la casa su due strade) salgono a 4: il
      // fronte lontano resta a 3-4, così la via si legge a gradoni (basso davanti, alto dietro) invece che come un canyon
      const capOf = b => { let cap = 9; const ids = new Set(); for (let d = .5; d <= 3.5; d += 1) {
        for (let tx = b.x; tx < b.x + b.w; tx++) { const id = viaA(tx * TS + 1, b.y * TS - d); if (id) { cap = Math.min(cap, TETTO(id)); ids.add(id); } }
        for (let ty = b.y; ty < b.y + b.h; ty++) { const id = viaA(b.x * TS - d, ty * TS + 1); if (id) { cap = Math.min(cap, TETTO(id)); ids.add(id); } } }
        if (b.era === 'E3' && [...ids].some(id => /^via_/.test(id)) && ids.size < 2) cap = Math.min(cap, 3);
        return cap; };
      let nCap = 0; B.forEach(b => { if (!b.house || b.shack || !b.era || b.torre || zone[b.y * GW + b.x] !== Z.CITTA) return; const c = capOf(b); if (b.fl > c) { b.fl = c; nCap++; } });
      // il raccordo dei tetti del borgo: chi sta più su di due piani scende; se è una casa-torre (o una casa già alzata) sale il vicino;
      // un annesso di un piano accanto a una casa di tre diventa il vano scala di due
      const borgo = b => b.house && !b.shack && (b.era === 'E0' || b.era === 'E2'), NB = new Map();
      B.forEach((a, ka) => { if (!borgo(a)) return; const s = new Set();
        for (let ty = a.y; ty < a.y + a.h; ty++) for (let tx = a.x; tx < a.x + a.w; tx++) for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { const j = (ty + dy) * GW + tx + dx, kb = bIndex[j]; if (kb >= 0 && kb !== ka && B[kb] && borgo(B[kb])) s.add(kb); }
        NB.set(ka, [...s]); });
      const alto = new Set(); let nGiu = 0, nSu = 0;
      for (let it = 0; it < 30; it++) { let mosse = 0;
        NB.forEach((nb, ka) => nb.forEach(kb => { const a = B[ka], c = B[kb]; if (a.fl - c.fl <= 1) return;   // a più alta di c di due piani o più
          if (a.torre || alto.has(ka) || c.annesso) { c.fl = a.fl - 1; alto.add(kb); nSu++; } else { a.fl = c.fl + 1; nGiu++; } mosse++; }));
        if (!mosse) break; }
      // [mappa_compatta] il tetto della città: nessuna casa sopra i tre piani tranne le sei case-torre; poi di nuovo il lato camera
      B.forEach(b => { if (b.era && !b.torre && b.fl > 3) b.fl = 3; if (b.house && !b.shack && !b.torre && b.era && zone[b.y * GW + b.x] === Z.CITTA) { const c = capOf(b); if (b.fl > c) b.fl = c; } });
      if (typeof process !== 'undefined' && process.env && process.env.PV_DBG) console.log('[volumi2] tetti al limite del lato camera', nCap, 'raccordi: scese', nGiu, 'salite', nSu);
    }
    // [isola] i palazzi crescono per aggiunte: sopra il corpo pieno, un volume più piccolo e spostato (il terrazzo resta davanti, sulla strada),
    // e ogni tanto una stanzetta in cima. b.tiers: [{ x, y, w, h (caselle), f0 (piano da cui parte), fl }]; b.fl resta il numero di piani del corpo intero.
    B.forEach(b => {
      if (!b.house || b.shack || b.block || b.fisher || b.farm || b.fl < 3 || b.w < 3 || b.h < 3 || zone[b.y * GW + b.x] !== Z.CITTA) return;
      if (b.era === 'E3' || b.era === 'E4' || b.low) return;   // [città2] la cortina dell'Ottocento e i portici hanno il cornicione dritto
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
    // [botteghe] LE BOTTEGHE STANNO SOTTO CASA (PIANO_CITTA.md §10). Un palazzo non è più tutto bottega: la bottega sta al piano terra
    // (raramente al primo) di un palazzo dove si abita, e sulla strada ha il suo fronte accanto al portone di casa. b.door resta il portone
    // (androne, scala, appartamenti); la bottega è
    //   b.shopFront = { use, name, sign: {t, c}, era: 'E0'|'E2'|'E3'|'E4'|'E6'|'E7', piano: 0|1,
    //                   door: [tx,ty] la casella davanti alla porta della bottega, span: [[tx,ty],[tx,ty]] le caselle estreme del fronte,
    //                   face: 'S'|'N'|'E'|'W', k0, k1, kd, portone (indici lungo il lato) }
    // door/span/face li fissa shopGeom quando le porte sono definitive (al primo piano door e span sono null: c'è la targa al portone).
    // b.abitato = true: sopra si abita. b.use/b.shop/b.sign restano quelli della bottega: missioni, mestieri ed economia non cambiano;
    // PLACES[b.id] punta alla porta della bottega. Interni: Interior.layout dà L.ent (portone→androne) e L.ent2 (porta→bottega), L.shop.
    // Esterno: render.js buildModular apre porta e vetrine, fronteBottega mette insegna per epoca, serrande, tenda, citofono.
    // Dove: fitte sulla Rua Maestra, sul Corso, sotto i portici della Vittoria e sulla marina, agli angoli degli isolati murattiani;
    // pescherie e osterie entro 40 m dall'acqua; nei vicoli e fra le baracche poche; molti palazzi restano solo case.
    const segDB = (x, y, a, c) => { const dx = c[0] - a[0], dy = c[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t); };
    const STRADA_B = { rua: 3, corso: 3, vittoria: 3.2, marina: 2.6, via_nazionale: 2, via_cavour: 1.9, via_alta: 1.5, via_porto: 1.6, via_governo: 1.2, mezzo: 1.3 };
    const viaDi = b => { if (!b.door) return null; const x = b.door[0] * TS + 1, y = b.door[1] * TS + 1; let best = null, bd = 1e9;
      CITY.roads.forEach(rd => { if (!rd.pts) return; for (let k = 0; k < rd.pts.length - 1; k++) { const d = segDB(x, y, rd.pts[k], rd.pts[k + 1]) - rd.w / 2; if (d < bd) { bd = d; best = rd; } } }); return bd < 5 ? best : null; };
    const acqua40 = b => { const cx = Math.floor(b.x + b.w / 2), cy = Math.floor(b.y + b.h / 2); for (let r2 = 0; r2 <= 20; r2++) for (let a = -r2; a <= r2; a++) for (const [tx, ty] of [[cx + a, cy - r2], [cx + a, cy + r2], [cx - r2, cy + a], [cx + r2, cy + a]]) { if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) continue; const v = grid[ty * GW + tx]; if ((v === T.WATER && zone[ty * GW + tx] === Z.MARE) || v === T.QUAY || v === T.PIER) return true; } return false; };
    const lati = b => { let s = 0; [[0, -1, b.w, 1], [0, b.h, b.w, 1], [-1, 0, 1, b.h], [b.w, 0, 1, b.h]].forEach(([ox, oy, w, h]) => { let rd = false; for (let k = 0; k < Math.max(w, h) && !rd; k++) { const tx = b.x + ox + (w > 1 ? k : 0), ty = b.y + oy + (h > 1 ? k : 0); if (tx >= 0 && ty >= 0 && tx < GW && ty < GH && roadW[ty * GW + tx] > 0) rd = true; } if (rd) s++; }); return s; };
    const fronte = b => !b.door ? 0 : (b.door[1] === b.y - 1 || b.door[1] === b.y + b.h) ? b.w : b.h;
    const vocB = new Map();   // quanto un palazzo chiama la bottega
    const city = B.filter(b => !b.name && !b.military && !b.block && b.door && zone[b.y * GW + b.x] === Z.CITTA && (q => q > 262 && q < 550)(b.x * TS >= XF ? xo(b.x * TS) : 0));
    city.forEach(b => { const rd = viaDi(b), ang = lati(b), w0 = acqua40(b); b.__via = rd ? rd.id : null; b.__acqua = w0;
      let s = rd ? (STRADA_B[rd.id] || (rd.kind === 'vicolo' ? .35 : .9)) : 0;
      if (ang >= 2) s += b.era === 'E3' ? 1.8 : 1.1;                    // l'angolo dell'isolato: la bottega che guarda due strade
      if (w0) s += .8; if (b.portico) s += .8; if (b.vittoria) s += .9;   // [posa] anche le case dietro il portico (pezzo) if (b.era === 'E7') s -= 2; if (b.shack) s -= 3;
      if (fronte(b) < 3) s -= 1.5; if ((b.fl || 1) < 2) s -= .6;        // sotto una casa di un piano non c'è un palazzo
      vocB.set(b, s + hash2(b.x, b.y, 11) * .9); });
    city.sort((a, c) => vocB.get(c) - vocB.get(a));
    const big = city.slice().sort((a, c) => c.w * c.h - a.w * a.h);
    const USES = [
      // uso, insegna, colore neon, quante
      ['teatro', 'TEATRO ODEON', '#ffd23b', 1, 'Teatro Odeon'], ['palestra', 'PALESTRA', '#ff4fa3', 2], ['ferramenta', 'FERRAMENTA', '#ff8a3b', 2], ['ufficio', 'UFFICI', '#7ab8ff', 3],
      ['barbiere', 'BARBIERE', '#35e6ff', 2], ['tabacchi', 'TABACCHI', '#5aff9a', 2], ['panetteria', 'PANETTERIA', '#ffb35c', 2], ['farmacia', '✚ FARMACIA', '#4dff9a', 1], ['lavanderia', 'LAVANDERIA', '#8affd0', 1],
      ['tipografia', 'TIPOGRAFIA', '#e8e0d0', 1], ['circolo', 'CIRCOLO', '#ff6a3b', 1, 'Circolo dei Lavoratori'], ['scuola', 'SCUOLA', '#ffffff', 1, 'Scuola elementare'], ['sartoria', 'SARTORIA', '#ff7ad9', 1], ['pescheria', 'PESCHERIA', '#35e6ff', 1],
      // [attività] dopo le altre, così le botteghe di prima restano dov'erano
      ['bar', 'CAFFÈ DELLA VITTORIA', '#35e6ff', 1, 'Caffè della Vittoria'], ['farmacia', '✚ FARMACIA', '#4dff9a', 1, 'Farmacia della Vittoria'],   // [cucitura] la via viva: il caffè e la farmacia sotto i portici
      ['autorimessa', 'AUTORIMESSA', '#ffd23b', 1, 'Autorimessa Centrale'], ['armeria', 'ARMERIA', '#ff4a3b', 1, 'Armeria del Cacciatore'], ['abbigliamento', 'ABBIGLIAMENTO', '#ff7ad9', 1, 'Abiti e Confezioni'], ['pub', 'BIRRERIA', '#ffb030', 1, 'Birreria del Porto'],
    ];
    const taken = new Set();
    // [botteghe] chi occupa tutto il palazzo (teatro, scuola, uffici, autorimessa) e chi sta al primo piano (si sale dall'androne: targa al portone)
    const INTERO = { teatro: 1, scuola: 1, ufficio: 1, autorimessa: 1 }, PRIMO = { sartoria: .5, palestra: .5, circolo: .6, tipografia: .3, barbiere: .15 };
    const sottoCasa = (b, use, name, sign) => { if (INTERO[use] || fronte(b) < 3 || (b.fl || 1) < 2) return;
      b.abitato = true; b.shopFront = { use, name, sign, era: b.era || (b.__acqua ? 'E2' : 'E0'), piano: (b.fl || 1) >= 3 && hash2(b.x, b.y, 61) < (PRIMO[use] || 0) ? 1 : 0 }; };
    const sulV = city.filter(q => q.__via === 'vittoria' && (q.vittoria || q.vittoriaSud));   // [cucitura] i fronti della Vittoria
    // [pianta] la pescheria del luogo-missione 4 sta sulla Piazza della Marina (la più vicina col fronte a terra), non a caso dove c'è acqua
    const pesc = () => { const R = CITY.rects && CITY.rects[0]; if (!R) return city.filter(q => q.__acqua).concat(city); const cx = (R[0] + R[2]) / 2, cy = (R[1] + R[3]) / 2, dB = q => dist((q.door[0] + .5) * TS, (q.door[1] + .5) * TS, cx, cy) + (q.door[1] >= q.y + q.h || q.door[0] >= q.x + q.w ? 0 : 25);   // col fronte verso la camera (sud o est)
      return city.filter(q => q.door && q.__acqua && fronte(q) >= 3).sort((a, c) => dB(a) - dB(c)).concat(city); };
    const pref = (use, label) => /Vittoria/.test(label || '') ? sulV.concat(city) : use === 'teatro' || use === 'autorimessa' ? big : use === 'pescheria' ? pesc() : use === 'pub' ? city.filter(q => q.__acqua).concat(city) : use === 'scuola' || use === 'ufficio' ? city.slice().reverse() : city;
    USES.forEach(([use, sign, col, n, label], k) => {
      for (let i = 0; i < n; i++) {
        const b = pref(use, label).find(q => !taken.has(q) && (!/Vittoria/.test(label || '') || (fronte(q) >= 3 && (q.fl || 1) >= 2))); if (!b) return; taken.add(b);
        b.use = use; b.shop = true;
        b.name = label || (use.charAt(0).toUpperCase() + use.slice(1)) + ' ' + NOMI[(k * 3 + i) % NOMI.length];
        b.sign = { t: !label && use !== 'ufficio' && /^[A-Z ]+$/.test(sign) && b.name.length <= 16 ? b.name.toUpperCase() : sign, c: col };   // insegna col nome della bottega quando ci sta: «FERRAMENTA BRUNO»
        sottoCasa(b, use, b.name, b.sign);
      }
    });
    // [botteghe] le botteghe di tutti i giorni, per epoca della strada: il borgo ha drogherie e calzolai, la marina osterie e pescherie,
    // l'Ottocento farmacie, orologiai e caffè, i portici del regime tabacchi e abiti, il boom elettrodomestici e profumerie
    const MINORI = {
      E0: [['drogheria', 'DROGHERIA', 'Drogheria'], ['calzolaio', 'CALZOLAIO', 'Calzolaio'], ['latteria', 'LATTERIA', 'Latteria'], ['merceria', 'MERCERIA', 'Merceria'], ['trattoria', 'VINI E CUCINA', 'Osteria'], ['bar', 'BAR', 'Bar'], ['fruttivendolo', 'FRUTTA E VERDURA', 'Frutta e verdura']],
      E2: [['trattoria', 'OSTERIA', 'Osteria'], ['bar', 'BAR', 'Bar'], ['pescheria', 'PESCHERIA', 'Pescheria'], ['drogheria', 'COLONIALI', 'Coloniali'], ['ferramenta', 'ATTREZZI DA PESCA', 'Attrezzi']],
      E3: [['bar', 'CAFFÈ', 'Caffè'], ['orologiaio', 'OROLOGERIA', 'Orologeria'], ['cartoleria', 'CARTOLERIA', 'Cartoleria'], ['merceria', 'MERCERIA', 'Merceria'], ['profumeria', 'PROFUMERIA', 'Profumeria'], ['drogheria', 'DROGHERIA', 'Drogheria'], ['calzolaio', 'CALZATURE', 'Calzature']],
      E4: [['bar', 'BAR', 'Bar'], ['abbigliamento', 'MODE', 'Mode'], ['tabacchi', 'TABACCHI', 'Tabacchi'], ['calzolaio', 'CALZATURE', 'Calzature'], ['orologiaio', 'GIOIELLERIA', 'Gioielleria'], ['cartoleria', 'LIBRERIA', 'Libreria']],
      E6: [['elettrodomestici', 'ELETTRODOMESTICI', 'Elettrodomestici'], ['bar', 'BAR', 'Bar'], ['profumeria', 'PROFUMERIA', 'Profumeria'], ['mobili', 'MOBILI', 'Mobili'], ['abbigliamento', 'BOUTIQUE', 'Boutique']],
      E7: [['drogheria', 'ALIMENTARI', 'Alimentari'], ['bar', 'BAR', 'Bar']],
    };
    const COLB = { drogheria: '#ffb35c', calzolaio: '#d8a060', latteria: '#e8f0ff', merceria: '#ff7ad9', trattoria: '#ffb35c', bar: '#35e6ff', fruttivendolo: '#8aff6a', pescheria: '#35e6ff', ferramenta: '#ff8a3b', orologiaio: '#ffd23b', cartoleria: '#e8e0d0', profumeria: '#ff9ad0', abbigliamento: '#ff7ad9', tabacchi: '#5aff9a', elettrodomestici: '#7ab8ff', mobili: '#d8a060' };
    let nMin = 0; const contaU = {}, giro = {}, nomiB = new Set(B.filter(b => b.name).map(b => b.name));
    city.forEach(b => {
      if (taken.has(b) || vocB.get(b) < 2.1 || fronte(b) < 3 || (b.fl || 1) < 2 || b.shack) return;
      const e = MINORI[b.era] ? b.era : 'E3', L = MINORI[e], h = hash2(b.x, b.y, 63);
      giro[e] = giro[e] === undefined ? Math.floor(h * L.length) : giro[e] + 1;   // in fila per la strada, mai sei librerie di seguito
      let use, sign, nm;
      for (let t = 0; t < L.length; t++) { [use, sign, nm] = L[(giro[e] + t) % L.length];
        if ((use === 'trattoria' || use === 'pescheria') && !b.__acqua && e !== 'E0') continue;
        if ((contaU[use] || 0) >= 5) continue; giro[e] += t; break; }
      if ((contaU[use] = (contaU[use] || 0) + 1) > 5) return;
      taken.add(b); nMin++;
      const chi = k => (h < .5 ? NOMI : COGNOMI)[(Math.floor(hash2(b.x, b.y, 64) * 40) + k) % (h < .5 ? NOMI : COGNOMI).length];
      b.use = use; b.shop = true;
      let k2 = 0; do { b.name = nm + ' ' + (use === 'trattoria' ? 'da ' : '') + chi(k2++); } while (nomiB.has(b.name) && k2 < 30); nomiB.add(b.name);
      b.sign = { t: b.name.length <= 18 && use !== 'trattoria' ? b.name.toUpperCase() : sign, c: COLB[use] || '#ffd23b' };
      sottoCasa(b, use, b.name, b.sign);
    });
    // i locali con nome dentro un palazzo di due o più piani: il bar, l'alimentari, l'osteria stanno sotto casa anche loro
    B.forEach(b => { if (!b.name || b.military || b.gov || b.deco && !/video|gelateria/.test(b.id) || !/^(bar|wu|osteria|sirena|car_2|gelateria|video)$/.test(b.id)) return;
      if ((b.fl || 1) >= 2 && fronte(b) >= 3) { b.abitato = true; b.shopFront = { use: b.use || b.id, name: b.name, sign: b.sign, era: b.era || (acqua40(b) ? 'E2' : 'E0'), piano: 0 }; } });
    if (typeof process !== 'undefined' && process.env && process.env.PV_DBG) console.log('[botteghe] botteghe minori', nMin, contaU);
    // fuori città: due fabbriche nei capannoni più grandi della campagna, il resto case e cascine
    const rural = B.filter(b => !b.name && !b.military && b.door && zone[b.y * GW + b.x] !== Z.CITTA).sort((a, c) => c.w * c.h - a.w * a.h);
    [['fabbrica', 'Conservificio Sanna'], ['fabbrica', 'Mattonificio Piras']].forEach(([use, label], i) => { const b = rural[i]; if (b) { b.use = use; b.name = label; b.sign = { t: i ? 'MATTONIFICIO PIRAS' : 'CONSERVIFICIO SANNA', c: '#ff8a3b' }; } });
    B.forEach((b, i) => { if (b.barrack) { b.use = 'baracca'; b.name = 'Baracca della Tutela'; } if (!b.use) b.use = b.name ? null : b.farm ? 'cascina' : 'casa'; if (!b.name) b.label = (b.farm ? 'Cascina ' : 'Casa ') + COGNOMI[Math.floor(hash2(b.x, b.y, 21) * COGNOMI.length)]; else b.label = b.name; });
    city.forEach(b => { delete b.__via; delete b.__acqua; });


    // ---------------- [costa] SCOGLI IN MARE, FONDALE, PESCA, BAGNI, ROTTE ----------------
    // i faraglioni davanti a Punta Scogli e lo Scoglio della Sirena sotto la costa di tramontana: roccia vera (le barche ci sbattono)
    const ISLETS = [[14, 204, 4.2, 'faraglione_grande'], [6, 226, 3, 'faraglione_piccolo'], [24, 244, 2.4, 'scoglio_basso'], [346, 32, 3.2, 'scoglio_sirena'], [784, 34, 2.6, 'scoglio_monaco']].map(q => PP(q[0], q[1]).concat(q.slice(2)));   // [isola-ridotta] sulla mappa
    // [costa2] gli scogli sotto le mura di tramontana: una frangia di roccia che affiora a pochi metri dalla riva della città (la città non si
    // tocca, la riva sì: niente più bordo dritto). Le dice MAPPA_COMPATTA: «Baracche → Covo: gli scogli sotto le mura, con la bassa marea».
    // [sporcherie] tolti: i 12 massi grandi (scoglio_mura_*) finivano addosso al parapetto e in strada sul Lungomare di Tramontana; basta la scogliera del lungomare
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
    // che fondo c'è (per la grafica): 0 sabbia, 1 roccia (sotto scogli, falesie e massi), 2 prateria di posidonia (a mezza profondità)
    const bottom = new Uint8Array(N);
    for (let i = 0; i < N; i++) { if (!isSea(i)) continue; const k = src[i] >= 0 ? kindAt(src[i]) : 'falesia', x = (i % GW) * TS + 1, y = ((i / GW) | 0) * TS + 1, d = dq[i];
      const rockK = k === 'falesia' ? 26 : k === 'scogli' ? 14 : grid[src[i]] === T.ROCK ? 7 : 0;
      if (d < rockK * (.6 + fbm(x / 14, y / 14, 521, 2) * .8)) bottom[i] = 1;
      else if (depth[i] > 2.2 && depth[i] < 16 && fbm(x / 30, y / 30, 522, 3) > .5 - Math.min(.12, (depth[i] - 2.2) * .03)) bottom[i] = 2; }
    // nei porti il fondo è fango (codice 3): l'acqua lì è torbida e scura
    for (let i = 0; i < N; i++) { if (!isSea(i)) continue; const x = (i % GW) * TS + 1, y = ((i / GW) | 0) * TS + 1; if (SEA.basins.some(B => inPoly(x, y, B.poly)) || (src[i] >= 0 && kindAt(src[i]) === 'porto' && dq[i] < 30)) bottom[i] = 3; }
    for (let i = 0; i < N; i++) if (bottom[i] === 2 && depth[i] < 2.4) bottom[i] = 0;   // [arcipelago] dove è bassissimo, sabbia
    SEA.bottom = bottom;
    // scogli che affiorano lungo le coste di roccia (solo grafica: sassi a pelo d'acqua fra 1 e 7 m dalla riva)
    for (let ty = 2; ty < GH - 2; ty++) for (let tx = 2; tx < GW - 2; tx++) { const i = ty * GW + tx; if (!isSea(i) || dq[i] > 8) continue; const k = kindAt(src[i]); if (k !== 'scogli' && k !== 'falesia') continue;
      const h1 = hash2(tx, ty, 515); if (h1 > (k === 'falesia' ? .2 : .13)) continue; SEA.rocks.push({ x: tx * TS + .4 + hash2(tx, ty, 516) * 1.2, y: ty * TS + .4 + hash2(tx, ty, 517) * 1.2, r: .5 + hash2(tx, ty, 518) * (k === 'falesia' ? 1.6 : 1), big: false }); }
    // dove si pesca: le teste dei moli e dei pontili, gli scogli. ang: dove si guarda (verso il mare)
    const shoreOut = (x, y) => { const sd = y < Yc(x) ? -1 : 1; return sd < 0 ? -Math.PI / 2 : Math.PI / 2; };
    SEA.structs.forEach(S => { if (S.type === 'scalo' || S.id === 'molo_testa') return; const e = S.pts[S.pts.length - 1], b = S.pts[S.pts.length - 2]; SEA.fishing.push({ id: 'pesca_' + S.id, name: (S.type === 'molo' ? 'In punta al ' : 'In fondo al ') + S.name, x: e[0], y: e[1], ang: Math.atan2(e[1] - b[1], e[0] - b[0]), kind: S.type, struct: S.id }); });
    const scogliNome = (x, sd) => x < Px(100) ? 'Scogli della Punta' : sd === 'N' ? (x < 680 ? 'Scogli di tramontana' : x < 960 ? 'Scogli sotto il Monte' : x < 1080 ? 'Scogliera del Lungomare' : 'Scogli di Levante') : x < 950 ? 'Scogli della fiumara' : 'Scogli del Lido';
    const ROMANI = ['', ' II', ' III', ' IV', ' V', ' VI'], nUso = {};
    let nsc = 0;
    // [isola-ridotta] nella campagna accorciata gli scogli sono quelli di prima (i punti xd del disegno dove la riva era di roccia: SCOGLI0),
    // portati sulla mappa con Px, nello stesso ordine: stessi numeri e stessi nomi. Se la riva più corta non ha la roccia proprio lì, la si
    // cerca accanto (fino a 30 m). Da RID.XB in là si cerca come prima
    const SCOGLI0 = { N: [190, 330, 470, 540], S: [50, 120, 330] };
    const sullaRoccia = (x, sd) => { const y = sd === 'N' ? NorthY(x) + 2.2 : SouthY(x) - 2.2, tx = Math.floor(x / TS), ty = Math.floor(y / TS); return OnLand(x, y) && grid[ty * GW + tx] === T.ROCK ? y : null; };
    ['N', 'S'].forEach(sd => { for (let xd = 50; xd < 1200; xd += 70) { let x = Px(xd), y = null;
      if (xd < RID.XB) { if (!SCOGLI0[sd].includes(xd)) continue; for (let d = 0; y === null && d <= 30; d += 3) for (const x1 of d ? [x + d, x - d] : [x]) { const y1 = sullaRoccia(x1, sd); if (y1 !== null) { x = x1; y = y1; break; } } }
      else { if (coastKind(x, sd === 'N' ? 0 : 1e4) !== 'scogli' && !(sd === 'N' && coastKind(x, 0) === 'falesia' && xd % 140 < 70)) continue; y = sullaRoccia(x, sd); }
      if (y === null) continue;
      SEA.fishing.push({ id: 'scogli_' + (++nsc), name: (n0 => n0 + (ROMANI[nUso[n0] = (nUso[n0] || 0) + 1, nUso[n0] - 1] || ''))(scogliNome(x, sd)), x, y, ang: sd === 'N' ? -Math.PI / 2 : Math.PI / 2, kind: 'scogli' }); } });
    // dove si fa il bagno: spiagge e cale (il fondale scende piano)
    [['Spiaggia Lunga', Px(140), 'S'], ['Spiaggia Lunga', Px(260), 'S'], ['Spiaggia Lunga', Px(400), 'S'], ['Spiaggia Lunga', Px(560), 'S'], ['Cala di tramontana', Px(300), 'N'], ['Cala delle Case della Tramontana', Px(566), 'N'],   // [isola-ridotta] sulla mappa
     
      ['Cala di San Giacomo', 739, 'N'], ['Caletta della fiumara', 748, 'S'], ['Spiaggetta del Gabbiano', 815, 'S'], ['Spiaggia del Lido', 1112, 'S'], ['Spiaggia del Lido', 1138, 'S']].forEach(([name, x, sd], k) => {
      const y = sd === 'N' ? NorthY(x) : SouthY(x); SEA.swim.push({ id: 'bagno_' + k, name, x, y: y + (sd === 'N' ? -10 : 10), shore: [x, y + (sd === 'N' ? 3 : -3)], r: 14 }); });
    // rotte (per le barche che vanno e vengono): il giro dell'isola al largo, l'uscita dei pescherecci, l'arrivo della nave dell'Impero
    { const off = 46, g = [];
      for (let x = 1296; x > HEAD.x; x -= 16) g.push([x, NorthY(x) - off]);
      for (let a = -Math.PI / 2; a > -1.5 * Math.PI; a -= .12) g.push([HEAD.x + Math.cos(a) * (HEAD.r + off), HEAD.y + Math.sin(a) * (HEAD.r + off)]);
      for (let x = 200 + 16 * Math.ceil((HEAD.x - 200) / 16); x <= 1296; x += 16) g.push([x, SouthY(x) + off]);   // [isola-ridotta] la griglia di prima
      let P0 = g; for (let it = 0; it < 4; it++) P0 = P0.map((q, k) => { const a = P0[(k - 1 + P0.length) % P0.length], c = P0[(k + 1) % P0.length]; return [(a[0] + 2 * q[0] + c[0]) / 4, (a[1] + 2 * q[1] + c[1]) / 4]; });
      SEA.routes.giro = P0; }
    SEA.routes.pesca = [[1020, 228], [1053, 233], [1062, 258], [1046, 292], [1030, 335], [1006, 412], [970, 460], [900, 480]];   // [arcipelago] fra l'Isola delle Palme e l'Isolotto della Torre, fino al largo
    SEA.routes.nave = [[1700, -120], [1420, 20], [1300, 60], [1262, 70], [1255, northY(632) - 14]];
    // ---------------- LUOGHI ----------------
    const PLACES = {};
    const tileOf = (x, y) => [Math.floor(x / TS), Math.floor(y / TS)];
    const walkable = (tx, ty) => { const v = grid[ty * GW + tx]; return v !== T.BLD && v !== T.WATER && v !== T.FOUNT && v !== T.TREE && v !== T.CLIFF; };
    const nearWalk = (x, y) => { const [tx, ty] = tileOf(x, y); for (let rr = 0; rr < 12; rr++) for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === rr && walkable(tx + dx, ty + dy)) return [tx + dx, ty + dy]; return [tx, ty]; };
    B.forEach(b => { if (b.name && b.door && !b.barrack) PLACES[b.id] = { id: b.id, name: b.name, tx: b.door[0], ty: b.door[1] }; });
    let PN = (id, name, x, y, ex) => { const [tx, ty] = nearWalk(x, y); PLACES[id] = Object.assign({ id, name, tx, ty, want: [x, y] }, ex || {}); };
    // [città2] i luoghi della città per epoche (coordinate nuove): la Collina Nera è diventata il borgo, i suoi posti stanno nei vicoli,
    // sulle mura di tramontana e sul lido; la discarica sugli scogli di ponente accanto ai binari
    const RELP = { piazza: [1063, 103], fontana: [1108, 124], vico: [1052, 130], fiori: [950, 143], piazzetta: [1046, 167], caruggio: [1085, 95],
      calata: [1030, 190], lungomare: [1100, 198], salita: [1088, 128], monte: [1118, 128], vetta: [1134, 126], belvedere: [1070, 74], osservatorio: [1112, 72],
      covo: [1124, 98], ruderi: [1118, 170], grotta: [1100, 168], cava: [1150, 168],
      spiaggia: [1128, 210], passeggiata: [1104, 198], discarica: [912, 66], piazza_gov: [1008, 143], giardini: [916, 140] };   // [mappa_compatta] la discarica è alle baracche, dietro il rilevato; i Giardini di Ponente davanti al Mercato
    const PN0 = PN; PN = (id, name, x, y, ex) => RELP[id] ? PN0(id, name, RELP[id][0], RELP[id][1], ex) : PN0(id, name, x, y, ex);
    const P = (id, name, x, y, ex) => PN(id, name, xn(x), y, ex);   // [isola] i luoghi di prima sono in coordinate vecchie
    // centro
    P('piazza', 'Piazza San Rocco', 400, 117); P('fontana', 'Fontana di San Rocco', 413, 117); P('vico', 'Vicolo dei Lanternini', 382, 118);
    P('fiori', 'Banco dei fiori', 420, 122); P('piazzetta', 'Vico del Campo', 446, 130); P('caruggio', 'Caruggio dei Pescatori', 372, 152);
    P('calata', 'Calata del porto', 404, 186);
    PN('stazione', 'Stazione', 947, 101);   // [mappa_compatta] il fabbricato della stazione sul piazzale (la stanza murata del regime ci sta sotto)
    // [costa] il porto vecchio rifatto: il molo dei pescatori è il Molo Vecchio (i pescherecci ci stanno di fianco), il Pontile Est è quello dei Marsigliesi
    PN('molo', 'Molo dei pescatori', 1004, 241); PN('pontile', 'Pontile Est', 1037, 214); PN('marina', 'Marina del porto vecchio', 1013, 197);
    PN('lanterna', 'Lanterna del Molo Vecchio', 1040, 241); PN('molo_levante', 'Molo di Levante', 1068, 222); PN('scalo', 'Scalo del cantiere', 966, 190);
    SEA.fishing.forEach(f => { if (!PLACES[f.id]) PN(f.id, f.name, f.x, f.y, { pesca: true, isola: !!f.isola || f.id === 'pesca_approdo_palme' }); f.place = f.id; });
    SEA.swim.forEach(b => { PN(b.id, b.name, b.shore[0], b.shore[1], { bagno: true, isola: !!b.isola }); b.place = b.id; });
    P('lungomare', 'Via al Mare', 466, 184);
    // periferia ovest e la sua collina
    P('giardini', 'Giardini di Ponente', 344, 140); P('pineta', 'Pineta della Collina dei Pini', 322, 156); P('collina_o', 'Collina dei Pini', 304, 140);
    P('bivacco_o', 'Bivacco dei Pini', 284, 132, { camp: 'bivacco' }); P('monolite', 'Il Monolite', 322, 142, { camp: 'monolite' }); P('campeggio_o', 'Spiazzo della collina', 262, 138, { camp: 'tende' }); P('sorgente', 'Sorgente del monte', 244, 157, { camp: 'sorgente', scoperta: true }); P('rudere_o', 'Casale diroccato dei Pini', 300, 110, { camp: 'rudere' }); P('carbonaia', 'Carbonaia', 336, 168, { camp: 'carbonaia' }); P('pozzo_o', 'Spiazzo dei taglialegna', 214, 132, { camp: 'legna' });
    // periferia est e la Collina Nera
    P('salita', 'Salita dei Bottai', 470, 128); P('monte', 'Sopra il Pozzo', 504, 132); P('vetta', 'Cima del Vico del Sale', 518, 134);   // [sporcherie] nella città nuova stanno nei vicoli del borgo: i nomi della Collina Nera (che non c'è più) prendono quelli dei vicoli
    P('belvedere', 'Belvedere', 494, 120);   // [sporcherie] tolti il bivacco e le tende della Collina Nera (bivacco_e, campeggio_e): nella città nuova cadevano in mezzo alla Via della Marina e alla Via del Lido
    P('covo', 'Il covo nel bunker delle mura', 506, 80, { hidden: true });   // [mappa_compatta] L6: sotto la vecchia vedetta, sulle mura di tramontana P('ruderi', 'Ruderi della Collina Nera', 512, 160, { camp: 'rudere' }); P('osservatorio', 'Vecchia vedetta', 496, 108, { camp: 'vedetta' }); P('grotta', 'La grotta', 470, 150, { camp: 'grotta', hidden: true }); P('cava', 'Cava della Collina Nera', 530, 150);
    P('spiaggia', 'Spiaggia del Lido', 512, 198); P('passeggiata', 'Passeggiata a mare', 492, 194); P('discarica', 'Discarica di levante', 548, 184);
    // il Muro e la Base
    P('muro', 'Il Muro', 548, yc(548), { gate: true }); P('varco', 'Varco del Muro', 562, yc(562));
    P('poligono', 'Poligono della Base', 560, 178); P('eliporto', 'Eliporto della Base', 632, 134); P('molo_cargo', 'Porto cargo', 640, 200);
    // [cucitura] il Muro, il varco e il piazzale dei mezzi stanno nel Recinto del Garante (prima erano punti sulla spianata, con le file di jersey attorno)
    if (POSA.recinto) { const R = POSA.recinto; PN('muro', 'Il Muro', R.xw - 2, R.yN + 14, { gate: true }); PN('varco', 'Varco del Muro', R.gx - 3, 143); PN('poligono', 'Piazzale del Recinto', R.xe - 13, R.yN + 34); }   // [rocca2] il porto cargo sul molo a sud dello scoglio
    // la foresta
    P('macchia', 'Pineta dell\'altopiano', 200, 138); P('sentiero', 'Sentiero dei carbonai', 214, 156); P('radura', 'Radura del pastore', 176, 142);
    P('sugheri', 'Valle delle betulle', 202, 168); P('ovile', 'Ovile abbandonato', 176, 124); P('lago', 'Lago del monte', 182, 138);
    P('sangiacomo', 'San Giacomo', 205, 104); P('vigne', 'Vigne di San Giacomo', 208, 84); P('villaggio', 'Borgo dei Carbonai', 184, 190);
    P('oliveto', 'Uliveto delle terrazze', 262, 186); P('caletta', 'Caletta della fiumara', 215, 224);
    // il Monte Scuro: posti da scoprire girando attorno alla montagna (scoperta: compare la prima volta che ci arrivi)
    const SC = { scoperta: true };
    P('pizzo', 'Pizzo del Monte Scuro', 248, 143, { camp: 'croce', scoperta: true }); P('neviera', 'La neviera', 241, 135, { camp: 'neviera', scoperta: true });
    P('cascata', 'Cascata del Pizzo', 235, 115, { camp: 'cascata', scoperta: true }); P('gola', 'Gola del Lupo', 225, 82, SC); P('ponte_diavolo', 'Ponte del Diavolo', 221, 97, SC);
    P('fiumara', 'Fiumara dei Carbonai', 224, 196, { camp: 'fiumara', scoperta: true }); P('dita', 'Le Cinque Dita', 279, 182, SC);
    P('paese_vecchio', 'Paese Vecchio', 298, 173, { camp: 'rudere', scoperta: true }); P('vecchio_2', 'Case crollate del Paese Vecchio', 302, 168, { camp: 'rudere' }); P('vecchio_3', 'La chiesa senza tetto', 294, 178, { camp: 'rudere' });
    P('calanchi', 'I Calanchi', 168, 82, SC); P('eremo', 'Eremo del Romito', 162, 160, { camp: 'eremo', scoperta: true, hidden: true });
    P('romito', 'Grotta del Romito', 234, 105, { scoperta: true, hidden: true }); P('altopiano', 'Altopiano del Lago', 196, 128, SC); P('passo', 'Passo dei Pini', 281, 136, SC);
    // la prateria
    // [isola] la testa di bosco e il Tavolato (coordinate nuove)
    const PD = (id, name, x, y, ex) => PN(id, name, Px(x), Py(x, y), ex);   // [isola-ridotta] i posti della testa e del collo, scritti nel disegno
    PN('deserto', 'Prateria del Tavolato', ...TAVP.prateria); PN('beduini', 'Accampamento dei beduini', ...TAVP.campo, { camp: 'beduini' }); PD('saline', 'Saline', 100, 314);   // [altopiano] la gariga aperta del pianoro; il campo sull'orlo della pozza
    PD('punta', 'Punta Scogli', 38, 222); PD('stazione_n', 'Stazione Nord: piazzale', 234, 76); PD('stazione_s', 'Stazione Sud: piazzale', 262, 328);
    PN('tavolato', 'Il Tavolato', ...TAVP.centro, SC); PN('canalone_e', 'Canalone di levante', footE[0], footE[1], SC); PN('canalone_o', 'Canalone di ponente', footO[0], footO[1], SC);
    PD('bosco_antico', 'Bosco Antico', 290, 150, { camp: 'legna', scoperta: true }); PD('campo_p', 'Campo partigiano', 98, 128, { camp: 'bivacco', hidden: true });
    FISHP.forEach(([id, name, x, y]) => PN(id, name, x, y)); PN('piazza_gov', 'Piazza Grande', 919, 146);   // [cucitura] l'ex piazza d'adunata (l'id resta: skate, sottosuolo, missioni)
    PN('spiaggia_lunga', 'Spiaggia Lunga', Px(330), SouthY(Px(330)) - 5); PD('memoria', 'Via della Memoria', 420, 194);
    // [altopiano] le due cose della roccia che hanno un nome: la dolina con la pozza d'inverno e il belvedere sulla prua della parete, sul mare
    PN('dolina', 'Dolina della Pozza', POZZA.x + 4, POZZA.y - 3, SC); PN('belvedere_tav', 'Belvedere del Tavolato', ...TAVP.belvedere, SC);
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
    // [ordine1] I VIALETTI: ogni casa fuori città che non sta su una strada ha il suo vialetto di terra battuta fino alla strada (o al
    // sentiero) più vicina, tracciato sul terreno come i sentieri (segue le curve di livello, evita acqua, pareti e case); il bosco si apre.
    {
      const isRoad = new Uint8Array(N); roads.forEach(rd => { if (!rd.pts) return; rd.pts.forEach(([x, y]) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const i = (ty + b) * GW + tx + a; if (tx + a >= 0 && ty + b >= 0 && tx + a < GW && ty + b < GH) isRoad[i] = 1; } }); });
      for (let i = 0; i < N; i++) if (roadW[i] > 0) isRoad[i] = 1;
      const hard = v => v === T.WATER || v === T.CLIFF || v === T.BLD || v === T.FOUNT || v === T.PIER;
      let nv = 0;
      B.forEach(b => {
        if (!b.door || b.shack || b.barrack || b.isola) return; const [dx, dy] = b.door, di = dy * GW + dx; if (zone[di] === Z.CITTA) return;
        let near = false; for (let a = -2; a <= 2 && !near; a++) for (let c = -2; c <= 2 && !near; c++) { const tx = dx + a, ty = dy + c; if (tx >= 0 && ty >= 0 && tx < GW && ty < GH && isRoad[ty * GW + tx]) near = true; }
        if (near) return;
        // Dijkstra a 8 vicini, fino a 70 m
        const D = new Map(), PR = new Map(), Q = [[0, dx, dy]], k0 = dy * GW + dx; D.set(k0, 0); let end = -1;
        while (Q.length) { let bi = 0; for (let q = 1; q < Q.length; q++) if (Q[q][0] < Q[bi][0]) bi = q; const [d, i, j] = Q[bi]; Q[bi] = Q[Q.length - 1]; Q.pop(); const k = j * GW + i;
          if (d > D.get(k)) continue; if (isRoad[k] && d > 0) { end = k; break; }
          for (const [a, c] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const ni = i + a, nj = j + c; if (ni < 1 || nj < 1 || ni >= GW - 1 || nj >= GH - 1 || Math.abs(ni - dx) > 35 || Math.abs(nj - dy) > 35) continue;
            const nk = nj * GW + ni, v = grid[nk]; if (hard(v)) continue; if (a && c && (hard(grid[j * GW + ni]) || hard(grid[nj * GW + i]))) continue;
            const L = Math.hypot(a, c) * TS, sl = Math.abs(elev[nk] - elev[k]) / L; if (sl > .35) continue;
            const cc = d + L * (1 + Math.pow(sl / .1, 2) * 2.5) * (v === T.TREE ? 1.6 : 1) * (.85 + .3 * fbm(ni / 6, nj / 6, 433, 2));
            if (cc < (D.has(nk) ? D.get(nk) : 1e18)) { D.set(nk, cc); PR.set(nk, k); Q.push([cc, ni, nj]); } } }
        if (end < 0) return;
        const out = []; let k = end; while (k !== undefined) { out.push([(k % GW) * TS + 1, Math.floor(k / GW) * TS + 1]); k = PR.get(k); }
        if (out.length < 3) return;
        const thin = out.filter((q, n) => n % 2 === 0 || n === out.length - 1), pts = chaikin(thin, 3);
        out.forEach(([x, y]) => { const i = Math.floor(y / TS) * GW + Math.floor(x / TS); if (grid[i] === T.TREE || grid[i] === T.SHRUB || grid[i] === T.ROCK) grid[i] = T.DIRT; isRoad[i] = 1; });
        roads.push({ id: 'vialetto_' + b.id, name: 'Vialetto', w: 2, kind: 'sterrato', pts, traccia: true, vialetto: true, h: pts.map(([x, y]) => rawElev(x, y)) }); nv++;
      });
      if (typeof process !== 'undefined' && process.env && process.env.STRADE_DBG) console.log('[ordine1] vialetti', nv);
    }
    // [pianta] IL VICOLO LARGO QUANTO IL SUO CORRIDOIO: appena posate le case (prima di porte, botteghe e luoghi), la carreggiata disegnata di un vicolo (rd.w) non deve passare sotto i
    // muri. Lungo l'asse si misura il passaggio libero fra le case (a passi di 25 cm, come strade_integre.js); la larghezza del vicolo
    // diventa quella che ci sta (il decimo percentile più 60 cm di spalle, a mezzi metri; nei corridoi di una casella fino a 1,7 m,
    // il minimo percorribile). La Rua resta di 5 m.
    { const RIC = .5; const libero = (x, y, nx, ny, hw) => { let lib = 0; for (const sg of [1, -1]) { let o = 0; for (; o <= hw; o += .25) { const i = T2i(y + ny * o * sg) * GW + T2i(x + nx * o * sg); if (grid[i] === T.BLD && bIndex[i] >= 0 && !B[bIndex[i]].pezzo) break; } lib += Math.min(o, hw); } return lib; };
      // prima l'asse in mezzo al corridoio: ogni punto si sposta (al più 50 cm) verso il centro fra i due muri che ha di fianco
      const muroA = (x, y, nx, ny, mx) => { let o = 0; for (; o <= mx; o += .1) { const i = T2i(y + ny * o) * GW + T2i(x + nx * o); if (grid[i] === T.BLD && bIndex[i] >= 0 && !B[bIndex[i]].pezzo) break; } return o; };
      // (gli spostamenti si lisciano lungo la via, tre passate a 1-2-1: un punto che salta da solo farebbe uno zigzag)
      CITY.roads.filter(rd => rd.kind === 'vicolo' && rd.w <= 3).forEach(rd => { const Q = rd.pts, n = Q.length; if (n < 3) return; const SH = new Array(n).fill(0), NX = [], NY = [];
        for (let k = 0; k < n; k++) { const [ax, ay] = Q[Math.max(0, k - 1)], [bx, by] = Q[Math.min(n - 1, k + 1)], l = Math.hypot(bx - ax, by - ay) || 1; NX[k] = -(by - ay) / l; NY[k] = (bx - ax) / l;
          if (k === 0 || k === n - 1) continue; const [x, y] = Q[k], a = muroA(x, y, NX[k], NY[k], 3), c = muroA(x, y, -NX[k], -NY[k], 3); if (a > 2.9 || c > 2.9 || Math.min(a, c) >= Math.min(rd.w / 2, 1.2)) continue; SH[k] = clamp((a - c) / 2, -RIC, RIC); }   // si sposta solo dove un muro stringe
        for (let r = 0; r < 3; r++) { const S0 = SH.slice(); for (let k = 1; k < n - 1; k++) SH[k] = (S0[k - 1] + 2 * S0[k] + S0[k + 1]) / 4; }
        for (let k = 1; k < n - 1; k++) if (Math.abs(SH[k]) > .03) Q[k] = [Q[k][0] + NX[k] * SH[k], Q[k][1] + NY[k] * SH[k]]; });
      let nStr = 0; CITY.roads.filter(rd => rd.kind === 'vicolo' && rd.w <= 3).forEach(rd => { const hw = rd.w / 2, L = [], Q = rd.pts;
        for (let k = 0; k < Q.length - 1; k++) { const [ax, ay] = Q[k], [bx, by] = Q[k + 1], l = Math.hypot(bx - ax, by - ay); if (l < 1e-3) continue; const ux = (bx - ax) / l, uy = (by - ay) / l; for (let t = 0; t < l; t += 1) L.push(libero(ax + ux * t, ay + uy * t, -uy, ux, hw)); }
        if (L.length < 4) return; L.sort((p, q) => p - q); const p10 = L[Math.floor(L.length * .03)], w = Math.max(1.7, Math.min(rd.w, p10 + .6 >= 2 ? Math.floor((p10 + .6) * 2) / 2 : Math.floor((p10 + .2) * 10) / 10));   // il punto più stretto (il 3° percentile) comanda   /* [pianta] fra due muri a 2 m il vicolo è largo 1,7-1,9 m: il minimo percorribile, nessun muro sul selciato */
        if (w < rd.w) { rd.w0 = rd.w; rd.w = w; nStr++; } });
      CITY.vicoliStretti = nStr; }
    // [pianta] NESSUNA CASA SOPRA LE STRADE: le vie ondeggiano sulla griglia (l'utente le vuole così) e le case a caselle entravano nella
    // carreggiata (e nel marciapiede delle vie di città) di 30-70 cm. Ogni casa si arretra: a passi di 5 cm, dal lato che libera di più
    // (il fronte, o il fianco sull'incrocio), finché carreggiata e 1,25 m di marciapiede (le vie di città) restano liberi (5 cm di aria), al più 2,4 m e mai sotto
    // 1,8 m di lato. La casa prende la sua scatola (cx, cy, lw, ld) e le caselle che restano fuori tornano selciato
    { const MARC = 1.25; const VIE = CITY.roads.filter(rd => rd.kind === 'citta' || rd.kind === 'vicolo' || rd.kind === 'litoranea').map(rd => ({ rd, hw: rd.w / 2 + (rd.kind === 'citta' || rd.kind === 'litoranea' ? MARC : 0) + .05, Q: rd.pts, bb: rd.pts.reduce((m, [x, y]) => [Math.min(m[0], x), Math.min(m[1], y), Math.max(m[2], x), Math.max(m[3], y)], [1e9, 1e9, -1e9, -1e9]) }));
      const aria = (x, y, V) => { let m = 1e9; for (const v of V) { const Q = v.Q; for (let k = 0; k < Q.length - 1; k++) { const [ax, ay] = Q[k], [bx, by] = Q[k + 1], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, t = clamp(((x - ax) * dx + (y - ay) * dy) / L2, 0, 1); m = Math.min(m, dist(x, y, ax + dx * t, ay + dy * t) - v.hw); } } return m; };
      const ariaBox = (x0, y0, x1, y1, V) => { let m = 1e9; const nx = Math.max(2, Math.ceil((x1 - x0) / .25)), ny = Math.max(2, Math.ceil((y1 - y0) / .25)); for (let k = 0; k <= nx; k++) { const x = x0 + (x1 - x0) * k / nx; m = Math.min(m, aria(x, y0, V), aria(x, y1, V)); } for (let k = 0; k <= ny; k++) { const y = y0 + (y1 - y0) * k / ny; m = Math.min(m, aria(x0, y, V), aria(x1, y, V)); }
        for (const v of V) for (const [x, y] of v.Q) if (x > x0 && x < x1 && y > y0 && y < y1) m = Math.min(m, -v.hw); return m; };   // l'asse che passa dentro la scatola
      let nA = 0, nNo = 0, nGr = 0; const NO = [], DEM = new Set();
      B.forEach(b => { if (b.pezzo || b.military || b.__tierOf || b.lotto || b.lighthouse) return; let x0 = b.cx !== undefined ? b.cx - b.lw / 2 : b.x * TS, y0 = b.cy !== undefined ? b.cy - b.ld / 2 : b.y * TS, x1 = x0 + (b.lw !== undefined ? b.lw : b.w * TS), y1 = y0 + (b.ld !== undefined ? b.ld : b.h * TS);
        const V = VIE.filter(v => v.bb[0] - v.hw - 4 < x1 && v.bb[2] + v.hw + 4 > x0 && v.bb[1] - v.hw - 4 < y0 + (y1 - y0) && v.bb[3] + v.hw + 4 > y0); if (!V.length || ariaBox(x0, y0, x1, y1, V) >= 0) return;
        if (b.tiers) { delete b.tiers; nGr++; }   // il palazzo a gradoni sulla via torna un corpo solo: i gradoni stanno sulle caselle, la scatola arretrata no
        const X0 = x0, Y0 = y0, X1 = x1, Y1 = y1; let tolto = 0, stretta = false;
        // i muri in comune con un'altra casa (più di metà del lato) non si toccano: la casa si arretra dal lato della via, e la rete dei tetti resta cucita
        const comune = [[-1, 0], [0, -1], [1, 0], [0, 1]].map(([dx, dy]) => { let n = 0, m = 0; const L = dx ? b.h : b.w; for (let k = 0; k < L; k++) { const tx = dx ? (dx < 0 ? b.x - 1 : b.x + b.w) : b.x + k, ty = dy ? (dy < 0 ? b.y - 1 : b.y + b.h) : b.y + k, o = bIndex[ty * GW + tx]; m++; if (o >= 0 && o !== b.i && B[o] && !B[o].pezzo) n++; } return n * 2 > m; });   // stretta: la casetta di due metri può scendere a 1,2 m prima di levarla
        while (ariaBox(x0, y0, x1, y1, V) < 0 && tolto < 3) { const P0 = [[x0 + .05, y0, x1, y1], [x0, y0 + .05, x1, y1], [x0, y0, x1 - .05, y1], [x0, y0, x1, y1 - .05]], P1 = P0.filter((q, k) => !comune[k]), P = (P1.length ? P1 : P0).filter(q => q[2] - q[0] >= (stretta ? 1.2 : 1.8) && q[3] - q[1] >= (stretta ? 1.2 : 1.8)); if (!P.length) { if (stretta) break; stretta = true; continue; }
          const best = P.reduce((m, q) => { const a = ariaBox(q[0], q[1], q[2], q[3], V); return !m || a > m.a ? { q, a } : m; }, null); [x0, y0, x1, y1] = best.q; tolto += .05; }
        // la casetta di due metri che non si può arretrare senza diventare un muro: si leva, le sue caselle tornano selciato (l'utente: nessuna casa sopra le strade)
        if (ariaBox(x0, y0, x1, y1, V) < 0) { nNo++; NO.push(b.id); if ((!b.name || b.shop) && !b.gov && b.house) DEM.add(b); return; }   // un edificio col nome resta (si segnala); la bottega no, il suo nome è di fantasia
        Object.assign(b, { cx: +((x0 + x1) / 2).toFixed(3), cy: +((y0 + y1) / 2).toFixed(3), lw: +(x1 - x0).toFixed(3), ld: +(y1 - y0).toFixed(3), arretrata: +tolto.toFixed(2) }); nA++;
        for (let ty = b.y; ty < b.y + b.h; ty++) for (let tx = b.x; tx < b.x + b.w; tx++) { const i = ty * GW + tx, px = (tx + .5) * TS, py = (ty + .5) * TS; if (bIndex[i] === b.i && (px < x0 || px > x1 || py < y0 || py > y1)) { grid[i] = T.COB; bIndex[i] = -1; } } });
      // le case levate: fuori dall'elenco (gli indici delle caselle si rifanno), le loro caselle selciato
      if (DEM.size) { const resta = B.filter(b => !DEM.has(b)), nuovo = new Map(); resta.forEach((b, k) => nuovo.set(b.i, k));
        for (let i = 0; i < N; i++) { const k = bIndex[i]; if (k < 0) continue; if (nuovo.has(k)) bIndex[i] = nuovo.get(k); else { bIndex[i] = -1; if (grid[i] === T.BLD) { grid[i] = T.COB; reserved[i] = 1; } } }
        B.length = 0; resta.forEach((b, k) => { b.i = k; B.push(b); }); }
      // [case-fuori-strada] NIENTE FESSURE FRA LE CASE ARRETRATE: arretrando una casa dal filo della via, fra lei e la vicina restava a volte una luce di
      // 10-70 cm (né cortina né vicolo: strade_integre.js la conta «fessura»). Per ogni coppia così (case dritte) si prova, sull'una o sull'altra:
      // riaccostare il muro alla vicina (filo a filo, dentro le sue caselle di prima), o allargare la luce a un passaggio vero (1,25 m). Vale
      // la mossa che toglie la fessura senza crearne altre, senza tornare sulla via (lo stesso ariaBox) e senza scendere sotto 1,2 m di lato
      { const box = b => b.cx !== undefined ? [b.cx - b.lw / 2, b.cy - b.ld / 2, b.cx + b.lw / 2, b.cy + b.ld / 2] : [b.x * TS, b.y * TS, (b.x + b.w) * TS, (b.y + b.h) * TS];
        const rotT = b => b.sign || b.shop ? 0 : b.rot || 0, CASE = B.filter(b => !b.pezzo && !b.military), mobile = b => !b.__tierOf && !b.lotto && !b.lighthouse && !b.shack && !b.tiers && b.house && rotT(b) === 0;
        const BX = new Map(CASE.map(b => [b, box(b)])), IX = new Map(), kk = (i, j) => i * 4096 + j;
        CASE.forEach(b => { const q = BX.get(b), i = Math.floor((q[0] + q[2]) / 32), j = Math.floor((q[1] + q[3]) / 32); const k = kk(i, j); let A = IX.get(k); if (!A) IX.set(k, A = []); A.push(b); });
        const vicine = (b, q) => { const i = Math.floor((q[0] + q[2]) / 32), j = Math.floor((q[1] + q[3]) / 32), R = []; for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) for (const o of IX.get(kk(i + a, j + c)) || []) if (o !== b) R.push(o); return R; };
        const rel = (a, c) => { const ox = Math.min(a[2], c[2]) - Math.max(a[0], c[0]), oy = Math.min(a[3], c[3]) - Math.max(a[1], c[1]); return ox > 0 && oy > 0 ? { pe: Math.min(ox, oy), ox, oy } : { gap: Math.hypot(Math.max(0, -ox), Math.max(0, -oy)), ox, oy }; };
        const pesa = (a, c) => { const r = rel(a, c); if (r.pe !== undefined) return r.pe > .35 ? 30 : 0; if (r.gap <= .05) return 0; if (r.gap < 1.2) return 10; if (r.gap < 2.6 && Math.min(Math.max(a[2] - a[0], a[3] - a[1]), Math.max(c[2] - c[0], c[3] - c[1])) > 3) return 1; return 0; };
        const voto = (b, q) => vicine(b, q).reduce((s, o) => rotT(o) === 0 ? s + pesa(q, BX.get(o)) : s, 0);
        // (fuori dalle sue caselle il muro può uscire di meno di mezza casella: non copre il centro di nessuna casella d'altri)
        const lecita = (b, q) => { if (q[2] - q[0] < 1.2 || q[3] - q[1] < 1.2) return false; const T0 = [b.x * TS - TS / 2 + .01, b.y * TS - TS / 2 + .01, (b.x + b.w) * TS + TS / 2 - .01, (b.y + b.h) * TS + TS / 2 - .01]; if (q[0] < T0[0] || q[1] < T0[1] || q[2] > T0[2] || q[3] > T0[3]) return false;
          const V = VIE.filter(v => v.bb[0] - v.hw - 4 < q[2] && v.bb[2] + v.hw + 4 > q[0] && v.bb[1] - v.hw - 4 < q[3] && v.bb[3] + v.hw + 4 > q[1]); return !V.length || ariaBox(q[0], q[1], q[2], q[3], V) >= 0; };
        const mosse = (b, o) => { const q = BX.get(b), p = BX.get(o), r = rel(q, p), M = [];   // i muri di b verso o: avanti fino al filo, o indietro fino a 1,25 m
          const lato = (ax, d, Q0) => { const Q = (Q0 || q).slice(); if (ax === 0) { if (p[0] >= q[2] - 1e-6) Q[2] += d; else Q[0] -= d; } else { if (p[1] >= q[3] - 1e-6) Q[3] += d; else Q[1] -= d; } return Q; };
          if (r.ox < 0) { M.push(lato(0, -r.ox)); M.push(lato(0, -(1.25 + r.ox))); } if (r.oy < 0) { M.push(lato(1, -r.oy)); M.push(lato(1, -(1.25 + r.oy))); }
          if (r.ox < 0 && r.oy < 0) M.push(lato(1, -r.oy, lato(0, -r.ox)));   // di spigolo: avanti su tutti e due i lati
          return M.map(Q => Q.map(v => +v.toFixed(3))); };
        const MOSSI = new Set();
        for (let giro = 0; giro < 4; giro++) { let n = 0;
          CASE.forEach(a => { if (rotT(a) !== 0) return; vicine(a, BX.get(a)).forEach(o => { if (rotT(o) !== 0 || pesa(BX.get(a), BX.get(o)) !== 10) return;
            let best = null; for (const [b, c] of [[a, o], [o, a]]) { if (!mobile(b)) continue; const q0 = BX.get(b), v0 = voto(b, q0);
              for (const Q of mosse(b, c)) { if (!lecita(b, Q)) continue; const d = voto(b, Q) - v0, m = Math.abs(Q[2] - Q[0] - q0[2] + q0[0]) + Math.abs(Q[3] - Q[1] - q0[3] + q0[1]); if (d < 0 && (!best || d < best.d || (d === best.d && m < best.m))) best = { b, Q, d, m }; } }
            if (!best) return; const { b, Q } = best; BX.set(b, Q); MOSSI.add(b); n++; }); });
          if (!n) break; }
        MOSSI.forEach(b => { const q = BX.get(b); Object.assign(b, { cx: +((q[0] + q[2]) / 2).toFixed(3), cy: +((q[1] + q[3]) / 2).toFixed(3), lw: +(q[2] - q[0]).toFixed(3), ld: +(q[3] - q[1]).toFixed(3), arretrata: b.arretrata !== undefined ? b.arretrata : 0, accostata: 1 });   // (arretrata c'è sempre: la scatola non è più quella delle caselle)
          for (let ty = b.y; ty < b.y + b.h; ty++) for (let tx = b.x; tx < b.x + b.w; tx++) { const i = ty * GW + tx, px = (tx + .5) * TS, py = (ty + .5) * TS, dentro = px > q[0] && px < q[2] && py > q[1] && py < q[3];
            if (dentro && bIndex[i] < 0 && grid[i] === T.COB) { grid[i] = T.BLD; bIndex[i] = b.i; } else if (!dentro && bIndex[i] === b.i) { grid[i] = T.COB; bIndex[i] = -1; } } });
        CITY.caseAccostate = MOSSI.size; if (typeof process !== 'undefined' && process.env && process.env.PV_ARR) console.error('[accostate]', MOSSI.size, [...MOSSI].map(b => b.id).join(' ')); }
      CITY.caseArretrate = nA; CITY.caseSullaVia = NO; CITY.caseLevate = DEM.size; CITY.gradoniTolti = nGr; if (typeof process !== "undefined" && process.env && process.env.PV_ARR) console.error("[arretrate]", nA, "levate", DEM.size, "gradoni", nGr, "non riuscite", nNo, NO.join(" ")); }
    // [botteghe] le porte sono definitive: ogni bottega sotto casa prende il suo fronte accanto al portone (se non ci sta, il palazzo resta bottega intera)
    // [pianta] LE PORTE LIBERE DAI PEZZI GRANDI: i sottopassi a volta, le scalinate e la Porta di Terra si posano prima delle case, e la
    // casa che ci nasce accanto apriva la porta proprio lì (sotto la volta, contro il gradino, dietro l'arco: coperta dalla camera e senza
    // spazio davanti). La porta si sposta sulla casella libera migliore dello stesso fronte o di un altro, fuori dall'ingombro più 1,6 m.
    const INGOMBRI = PEZZI.filter(p => p.imp && /^(arco_sottopasso|scalinata|porta_terra)$/.test(p.tipo));
    const dentroIngombro = (x, y, m) => INGOMBRI.some(p => { const [lx, lz] = pzL(p, x, y); return p.imp.some(([k, x0, x1, z0, z1]) => lx > x0 - m && lx < x1 + m && lz > z0 - m && lz < z1 + m); });
    const rePorta = (b, cattiva) => { let best = null, bd = 1e9;
      for (let ty = b.y - 1; ty <= b.y + b.h; ty++) for (let tx = b.x - 1; tx <= b.x + b.w; tx++) {
        const edge = tx === b.x - 1 || tx === b.x + b.w || ty === b.y - 1 || ty === b.y + b.h, corner = (tx === b.x - 1 || tx === b.x + b.w) && (ty === b.y - 1 || ty === b.y + b.h);
        if (!edge || corner || tx < 0 || ty < 0 || tx >= GW || ty >= GH) continue; const v = grid[ty * GW + tx]; if (v === T.BLD || v === T.WATER || v === T.TREE || v === T.FOUNT || v === T.CLIFF) continue;
        if (cattiva((tx + .5) * TS, (ty + .5) * TS)) continue;
        const roadish = v === T.VIA || v === T.WALK || v === T.PIAZZA || v === T.COB || v === T.QUAY || v === T.DIRT ? 0 : 3, mid = Math.abs((tx + .5) - (b.x + b.w / 2)) + Math.abs((ty + .5) - (b.y + b.h / 2)) * .9;
        const sc = roadish + mid * .3 + (v === T.VIA ? 1.2 : 0) + hash2(tx, ty, 5) * .2; if (sc < bd) { bd = sc; best = [tx, ty]; } }
      if (best) b.door = best; return !!best; };
    // e quella che la camera (da sud-est, alta 45°) vede solo attraverso il pezzo: il raggio dalla soglia verso la camera sale di un metro
    // per metro e non deve passare dentro il volume di un sottopasso, di un portico, della Porta, del carro sul tronchino
    const ALTO = { arco_sottopasso: p => p.opz.h + 1 + (p.opz.piani || 0) * 3.1 + 1, porta_terra: p => p.opz.h + .22 * p.opz.w + 4.4 + (p.opz.torri ? 3.8 : .6), portico: p => p.opz.h + (p.opz.piani || 0) * 3.4 + 1.2, carro_merci: () => 3.9, scalinata: p => (p.opz.dislivello || 2) + 1 };
    const RECT = p => p.tipo === 'portico' ? [[0, 0, p.opz.campate * p.opz.campata, -p.opz.profondita / 2 - .4, p.opz.profondita / 2 + .4]] : p.tipo === 'carro_merci' ? [[0, 0, 10, -1.5, 1.5]] : p.tipo === 'porta_terra' ? [[0, 0, p.opz.w + 4 + 2 * (p.opz.torri ? p.opz.tw || 6.5 : 0), -3, 3]] : p.imp;
    const velata = (x, y) => { for (const h0 of [.5, 1.6]) for (let d = .4; d < 14; d += .35) { const u = x + d * Math.SQRT1_2, v = y + d * Math.SQRT1_2, h = h0 + d * .99;
      const q = PEZZI.find(p => { if (!ALTO[p.tipo] || h > ALTO[p.tipo](p)) return false; const R = RECT(p); if (!R) return false; const [lx, lz] = pzL(p, u, v); return R.some(([k, x0, x1, z0, z1]) => lx > x0 && lx < x1 && lz > z0 && lz < z1); }); if (q) return q; } return null; };
    POSA.velata = velata;
    { let nMosse = 0; B.forEach(b => { if (!b.door || b.pezzo || b.lighthouse) return; const cattiva = (x, y) => dentroIngombro(x, y, 1.6) || velata(x, y); if (cattiva((b.door[0] + .5) * TS, (b.door[1] + .5) * TS) && rePorta(b, cattiva)) nMosse++;
        // la casetta che non ha un lato libero: il sottopasso che la copre perde un piano (la volta resta, la casa sopra è più bassa)
        for (let k = 0; k < 2; k++) { const q = velata((b.door[0] + .5) * TS, (b.door[1] + .5) * TS); if (!q || q.tipo !== 'arco_sottopasso' || q.opz.piani < 2) break; q.opz.piani--; } });
      if (typeof process !== 'undefined' && process.env && process.env.PV_DBG) console.log('[pianta] porte spostate dai pezzi', nMosse); }
    { const doors = new Set(); doors.shop = new Set(); B.forEach(b => { if (b.door) doors.add(b.door[1] * GW + b.door[0]); });
      B.forEach(b => { if (b.shopFront && !shopGeom(b, grid, reach, GW, GH, false, doors)) { delete b.shopFront; delete b.abitato; } }); }
    Object.values(PLACES).forEach(p => { if (p.isola) return; /* [arcipelago] sulle isole si arriva per mare */ if (!reach[p.ty * GW + p.tx]) { const q = nearReach(p.tx, p.ty); if (q) { p.tx = q[0]; p.ty = q[1]; } } });
    B.forEach(b => { if (b.name && b.door && !b.barrack && !PLACES[b.id]) PLACES[b.id] = { id: b.id, name: b.name, tx: b.door[0], ty: b.door[1] }; });   // [isola] chi ha avuto la porta dopo
    B.forEach(b => { if (b.name && b.door && PLACES[b.id]) { PLACES[b.id].tx = b.door[0]; PLACES[b.id].ty = b.door[1]; } });
    B.forEach(b => { const S = b.shopFront; if (S && S.door && PLACES[b.id]) { PLACES[b.id].tx = S.door[0]; PLACES[b.id].ty = S.door[1]; } });   // [botteghe] il luogo è la porta della bottega, non il portone
    Object.values(PLACES).forEach(p => { p.x = p.tx * TS + TS / 2; p.y = p.ty * TS + TS / 2; });
    // [posa] dopo le case: i portici dove la cortina della Vittoria è continua (a tratti di 2-3 campate che seguono la salita), gli archi di
    // contrasto nei vicoli stretti fra due case, le edicole votive sugli spigoli delle piazzette
    if (POSA.port) {
      const P = POSA.port, sides = [[], []], LET = [];   // [cucitura] niente più lettere del regime sui portici   // [volumi2] parole corte: i corpi sono di 8-12 m
      let nl = 0;
      // [volumi2] sotto i portici va anche la casa del borgo che si è presa un tratto del fronte (prima restava senza portico, col lastricato
      // vuoto davanti): ogni casa col lato lungo il bordo della fascia dei portici entra nella cortina, coi suoi tre piani al più
      B.forEach(b => { if (b.vittoria) return; if (!b.house || b.shack || b.pezzo || b.x * TS < P.x0 || (b.x + b.w) * TS > P.x1) return;
        const nord = (b.y + b.h) * TS <= VY, ty = nord ? b.y + b.h : b.y - 1; let nW = 0;
        for (let tx = b.x; tx < b.x + b.w; tx++) { const i = ty * GW + tx, d = Math.abs(ty * TS + 1 - VY); if (grid[i] === T.WALK && d > P.d0 && d < P.d1) nW++; }
        if (nW * 2 >= b.w && b.w >= 2) { b.vittoria = true; b.fl = Math.min(b.fl, 3); } });
      B.forEach(b => { if (b.vittoria) sides[b.y * TS < VY ? 0 : 1].push(b); });
      sides.forEach((L, sd) => { if (P.lati && !P.lati.includes(sd)) return; L.sort((a, b) => a.x - b.x); const runs = []; let cur = null;
        L.forEach(b => { const xa = b.x * TS, xb = (b.x + b.w) * TS; if (cur && xa - cur.xb <= 4.2) { cur.xb = Math.max(cur.xb, xb); cur.bs.push(b); } else runs.push(cur = { xa, xb, bs: [b] }); });
        // [volumi2] non più un blocco unico: il tratto si divide in corpi di 2-3 campate (8-12 m), ognuno col suo cornicione e la sua quota,
        // arcate + 1 o 2 piani (al più tre piani in tutto) che si alternano; sul lato sud (verso la camera) prevalgono i corpi bassi, così
        // la strada si vede; il corpo più lungo del tratto porta le lettere. La torre littoria resta l'unica cosa alta.
        runs.forEach((R, kr) => { const Lr = R.xb - R.xa; if (Lr < 6) return; const nC = Math.max(2, Math.round(Lr / 4)), cw = Lr / nC, corpi = [];
          for (let c = 0; c < nC;) { const left = nC - c, n = left <= 3 ? left : left === 4 ? 2 : hash2(kr * 31 + c, sd, 1990) < .5 ? 2 : 3; corpi.push(n); c += n; }
          const iL = -1, alt0 = hash2(kr, sd, 1991) < .5 ? 0 : 1; let xs = R.xa;
          corpi.forEach((n, k) => { const Ls = n * cw, lt = '', piani = sd ? ((k + alt0) % 3 === 2 ? 2 : 1) : ((k + alt0) % 2 ? 2 : 1);
            // [cucitura] il portico di bottega dell'Ottocento (archi su pilastri, intonaco, persiane), non più il travertino con le lettere del regime
            (R.pz = R.pz || []).push({ xs, Ls, p: PZ('portico', sd ? xs + Ls : xs, sd ? VY + P.d1 - 2.25 : VY - P.d1 + 2.25, sd ? Math.PI : 0, { campate: n, campata: cw, h: 4.4, piani, profondita: 3.6, pilastro: .7, lettere: '', stile: 'ottocento', tinta: ['ocra', 'intonaco', 'intonacoRosso', 'calce'][Math.floor(hash2(kr * 7 + k, sd, 1992) * 4)] }, { nome: 'Portici della Vittoria', lato: sd }) });
            xs += Ls; });
          // [pianta] il portone della casa dietro il portico sta in mezzo a una campata, non dietro un pilastro (la camera lo vede fra gli archi)
          const pil = []; for (let j = 0; j <= nC; j++) pil.push(R.xa + j * cw);
          R.bs.forEach(b => { delete b.portico; b.sottoPortico = true; if (!b.door) return; const ty = sd ? b.y - 1 : b.y + b.h; if (b.door[1] !== ty) return;
            const lib = x => Math.min(...pil.map(q => Math.abs(q - x))); let bx = b.door[0], bl = lib((bx + .5) * TS);
            for (let tx = b.x; tx < b.x + b.w; tx++) { const i = ty * GW + tx, l = lib((tx + .5) * TS); if (grid[i] === T.BLD || grid[i] === T.WATER) continue; if (b.shopFront && b.shopFront.door && (Math.abs(b.shopFront.door[0] - tx) + Math.abs(b.shopFront.door[1] - ty) < 1 || Math.abs(b.shopFront.door[0] - tx) + Math.abs(b.shopFront.door[1] - ty) > 5)) continue; if (l > bl + .3) { bl = l; bx = tx; } }
            if (bx !== b.door[0]) { b.door = [bx, ty]; const P = PLACES[b.id]; if (P && !(b.shopFront && b.shopFront.door)) { P.tx = bx; P.ty = ty; P.x = bx * TS + TS / 2; P.y = ty * TS + TS / 2; } } });
          (POSA.runs = POSA.runs || []).push([R, sd]); }); });
      // [pianta] le porte delle case dietro il portico (nei vicoli fra una casa e l'altra, sui fianchi): dalla camera i piani sopra le arcate
      // le coprono; si spostano dove si vedono (la porta sotto il proprio portico no: il portico è il suo atrio)
      B.forEach(b => { if (!b.door || b.pezzo || b.lighthouse) return; const sd0 = b.sottoPortico && (b.door[1] === b.y + b.h || b.door[1] === b.y - 1); if (sd0 || (b.shopFront && b.shopFront.door)) return;   // col fronte di bottega il portone resta accanto alla bottega
        const sf = b.shopFront && b.shopFront.door, atrio = (x, y) => b.sottoPortico && (Math.floor(y / TS) === b.y + b.h || Math.floor(y / TS) === b.y - 1) && Math.floor(x / TS) >= b.x && Math.floor(x / TS) < b.x + b.w;
        const cattiva = (x, y) => (!atrio(x, y) && POSA.velata(x, y)) || (sf && Math.floor(x / TS) === sf[0] && Math.floor(y / TS) === sf[1]);
        if (!POSA.velata((b.door[0] + .5) * TS, (b.door[1] + .5) * TS)) return; if (rePorta(b, cattiva) && !sf) { const P = PLACES[b.id]; if (P) { P.tx = b.door[0]; P.ty = b.door[1]; P.x = P.tx * TS + TS / 2; P.y = P.ty * TS + TS / 2; } } });
      // [pianta] il fondo del portico si apre davanti a ogni porta della casa (il portone e la bottega): prima il muro con le vetrine finte la chiudeva
      (POSA.runs || []).forEach(([R, sd]) => R.pz.forEach(({ xs, Ls, p }) => { const V = []; R.bs.forEach(b => { const ty = sd ? b.y - 1 : b.y + b.h;
            [b.door, b.shopFront && b.shopFront.door].forEach(d => { if (!d || d[1] !== ty) return; const x = (d[0] + .5) * TS, u = sd ? xs + Ls - x : x - xs; if (u > .2 && u < Ls - .2) V.push(Math.min(Ls - 1.45, Math.max(1.45, u))); }); });
            if (V.length) p.opz.varchi = V.map(v => +v.toFixed(2)); }));
      // gli archi di contrasto: nei vicoli che non hanno già la casa col sottopasso, a metà, dove le due case si guardano
      // il varco del vicolo in un punto: quanto c'è di libero a destra e a sinistra prima del muro di una casa (o di un pezzo chiuso)
      POSA.varco = (x, y, nx, ny) => { const muro = (u, v) => { const i = Math.floor(v / TS) * GW + Math.floor(u / TS); return grid[i] === T.BLD || grid[i] === T.WATER; }; let a = 0, b = 0; while (a < 4 && !muro(x + nx * a, y + ny * a)) a += .1; while (b < 4 && !muro(x - nx * b, y - ny * b)) b += .1; return [a, b]; };
      const varco = POSA.varco;
      const portaVicina = (x, y, r) => B.some(b => (b.door && dist((b.door[0] + .5) * TS, (b.door[1] + .5) * TS, x, y) < r) || (b.shopFront && b.shopFront.door && dist((b.shopFront.door[0] + .5) * TS, (b.shopFront.door[1] + .5) * TS, x, y) < r));   // [pianta] archi ed edicole lontani dalle porte
      const fatti = new Set(PEZZI.filter(p => p.vicolo).map(p => p.vicolo)), casa = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) return false; const i = ty * GW + tx; return bIndex[i] >= 0 && !B[bIndex[i]].pezzo; };
      CITY.roads.filter(rd => /^vic_/.test(rd.id) && rd.id !== 'vic_forno' && rd.pts.length > 2 && !fatti.has(rd.id) &&   /* [mappa_compatta] la scalinata del Forno resta aperta: in fondo si vede il mare */ hash2(rd.pts.length, Math.round(rd.pts[0][0]), 1708) < .55).forEach(rd => {
        for (const f of [.45, .6, .3, .7]) { const A = lungo(rd.pts, f); if (A.L < 12) return; const nx = -A.uy, ny = A.ux, [ga, gb] = varco(A.x, A.y, nx, ny), w = ga + gb;
          if (ga > 3.5 || gb > 3.5 || w < 1.8 || w > 4 || !casa(A.x + nx * (ga + .3), A.y + ny * (ga + .3)) || !casa(A.x - nx * (gb + .3), A.y - ny * (gb + .3)) || portaVicina(A.x, A.y, 3.2)) continue;   // due case che si guardano, a 1,8-4 m
          const B2 = lungo(rd.pts, Math.min(.98, f + 1.2 / A.L)), B0 = lungo(rd.pts, Math.max(.02, f - 1.2 / A.L)); if (Math.abs(varco(B2.x, B2.y, nx, ny).reduce((a, c) => a + c) - w) > .5 || Math.abs(varco(B0.x, B0.y, nx, ny).reduce((a, c) => a + c) - w) > .5) continue;   // le due facciate dritte per lo spessore dell'arco
          pzAt('arco_contrasto', A.x + nx * (ga - gb) / 2, A.y + ny * (ga - gb) / 2, Math.atan2(A.ux, A.uy), w / 2 + .7, 0, { w: +w.toFixed(2), h: 4.2, doppio: hash2(Math.round(A.x), Math.round(A.y), 1709) < .25 }, { nome: 'Arco di ' + rd.name, vicolo: rd.id }); return; } });
      // le edicole votive: sullo spigolo di una casa che dà sulla piazzetta, rivolte al centro
      const PIAZ = [[CITY.piazzette[0][0], CITY.piazzette[0][1], CITY.piazzette[0][2]], [CITY.piazzette[1][0], CITY.piazzette[1][1], CITY.piazzette[1][2]], [(CITY.piazza[0] + CITY.piazza[2]) / 2, (CITY.piazza[1] + CITY.piazza[3]) / 2, 7], [(CITY.rects[0][0] + CITY.rects[0][2]) / 2, (CITY.rects[0][1] + CITY.rects[0][3]) / 2, 6]];
      PIAZ.forEach(([cx, cy, rr], k) => { for (const a of [0, 1.5708, 3.1416, 4.7124].map(v => v + (k % 2) * 1.5708)) { const dx = Math.cos(a), dy = Math.sin(a); let hit = null;
        for (let d = Math.max(2, rr - 2); d < rr + 7; d += .25) { const x = cx + dx * d, y = cy + dy * d, i = Math.floor(y / TS) * GW + Math.floor(x / TS); if (roadW[i] > 0 || grid[i] === T.WATER) break; if (grid[i] === T.BLD) { if (casa(x, y)) hit = [x - dx * .5, y - dy * .5]; break; } }
        if (!hit || portaVicina(hit[0], hit[1], 2.6)) continue; PZ('edicola_votiva', hit[0], hit[1], Math.atan2(-dx, -dy), { h: 2.1, lume: true, tettuccio: true }, { nome: 'Edicola votiva' }); break; } });
    }
    // [pianta] IL MARCIAPIEDE CONTINUO: lungo le vie di città la fascia del marciapiede (da 0,3 a 1,9 m oltre il ciglio) è marciapiede anche
    // dove la massicciata della ferrovia, la banchina o un ritaglio di selciato l'avevano preso (il Lungomare di Tramontana). Non sull'acqua:
    // la casella che tocca il mare resta banchina col suo muro
    { const PRENDE = new Set([T.GRAVEL, T.QUAY, T.COB, T.DIRT, T.GRASS]); let nM = 0;
      const inCarr = (x, y) => CITY.roads.concat(roads).some(rd => { const Q = rd.pts; if (!Q || Q.length < 2) return false; for (let k = 0; k < Q.length - 1; k++) { const [ax, ay] = Q[k], [bx, by] = Q[k + 1]; if (Math.max(ax, bx) + rd.w < x || Math.min(ax, bx) - rd.w > x || Math.max(ay, by) + rd.w < y || Math.min(ay, by) - rd.w > y) continue; const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, t = clamp(((x - ax) * dx + (y - ay) * dy) / L2, 0, 1); if (dist(x, y, ax + dx * t, ay + dy * t) <= rd.w / 2 + .1) return true; } return false; });
      CITY.roads.filter(rd => rd.kind === 'citta').forEach(rd => { const hw = rd.w / 2, Q = rd.pts;
        for (let k = 0; k < Q.length - 1; k++) { const [ax, ay] = Q[k], [bx, by] = Q[k + 1], l = Math.hypot(bx - ax, by - ay); if (l < 1e-3) continue; const ux = (bx - ax) / l, uy = (by - ay) / l;
          for (let t = 0; t < l; t += .25) for (const sg of [1, -1]) for (let o = hw + .35; o < hw + 1.9; o += .25) { const x = ax + ux * t - uy * o * sg, y = ay + uy * t + ux * o * sg, i = T2i(y) * GW + T2i(x);
            const via = grid[i] === T.VIA && roadW[i] > 0 && !inCarr((i % GW + .5) * TS, (((i / GW) | 0) + .5) * TS);   // la casella di via che la pittura a caselle ha messo nel marciapiede
            if (!(via || (PRENDE.has(grid[i]) && roadW[i] === 0)) || bIndex[i] >= 0) continue; if (via) roadW[i] = 0;
            if ([i - 1, i + 1, i - GW, i + GW].some(j => grid[j] === T.WATER)) continue; grid[i] = T.WALK; nM++; } } });
      CITY.marciapiediChiusi = nM; }
    // [pianta] dove la città tocca il mare col selciato alto (la Riva della Rocca, sotto le mura) il bordo è una banchina col suo muro:
    // prima l'ultima casella scendeva da tre metri al pelo dell'acqua come uno scivolo
    { const SEL = new Set([T.PIAZZA, T.COB, T.WALK, T.VIA]), nR = [];
      for (let ty = 1; ty < GH - 1; ty++) for (let tx = 1; tx < GW - 1; tx++) { const i = ty * GW + tx; if (!SEL.has(grid[i]) || zone[i] !== Z.CITTA || elev[i] < 1.1) continue;
        if ([i - 1, i + 1, i - GW, i + GW].some(k => grid[k] === T.WATER && zone[k] === Z.MARE)) nR.push(i); }
      nR.forEach(i => { grid[i] = T.QUAY; }); }
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
        rd._seg = seg; rd._P = P; rd._G = rd.G || (rd.traccia ? .2 : rd.kind === 'sterrato' ? (rd.trail ? .26 : rd.w <= 2 ? .42 : rd.w <= 3 ? .3 : .2) : .15);   // i sentieri a piedi possono essere ripidi (gradini), le piste no; [altopiano] rd.G la decide il sentiero
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
      // 0) [ordine1] il profilo di ogni strada si leviga prima di tutto: media mobile su ±14 m (gli estremi restano fermi), poi la pendenza
      //    massima (asfalto 12%, sterrate 18%) in avanti e all'indietro; niente gradini di 3 m né dossi di 20 cm sotto le ruote
      RDS.forEach(rd => { if (rd.kind === 'vicolo') return; const n = rd.pts.length; if (n < 6) return; const h0 = rd.h.slice(), Gm = rd.kind === 'sterrato' ? .18 : .12;
        const S = [0]; for (let k = 1; k < n; k++) S.push(S[k - 1] + Math.hypot(rd.pts[k][0] - rd.pts[k - 1][0], rd.pts[k][1] - rd.pts[k - 1][1]));
        for (let pass = 0; pass < 3; pass++) { const o = rd.h.slice(); let a = 0, b = 0, sum = 0;
          for (let k = 0; k < n; k++) { while (S[b] - S[k] <= 14 && b < n) { sum += o[b]; b++; } while (S[k] - S[a] > 14) { sum -= o[a]; a++; } rd.h[k] = sum / (b - a); }
          const ed = Math.min(n - 1, 3); for (let k = 0; k < n; k++) { const w = Math.min(1, Math.min(S[k], S[n - 1] - S[k]) / 14); rd.h[k] = h0[k] + (rd.h[k] - h0[k]) * w; } }
        for (let it = 0; it < 2; it++) { for (let k = 1; k < n; k++) { const L = S[k] - S[k - 1]; rd.h[k] = clamp(rd.h[k], rd.h[k - 1] - Gm * L, rd.h[k - 1] + Gm * L); } for (let k = n - 2; k >= 0; k--) { const L = S[k + 1] - S[k]; rd.h[k] = clamp(rd.h[k], rd.h[k + 1] - Gm * L, rd.h[k + 1] + Gm * L); } } });
      // 1) gli estremi delle minori sulla quota della maggiore
      RDS.forEach(rd => { const n = rd.pts.length;
        [0, n - 1].forEach(e => { const [x, y] = rd.pts[e]; let best = null;
          RDS.forEach(o => { if (o === rd || PRI(o) > PRI(rd)) return; const [d, h] = near(o, x, y); if (d < o.w / 2 + 1.5 && Math.abs(h - rd.h[e]) < 6 && (!best || PRI(o) < PRI(best[0]))) best = [o, h];   /* [ordine1] fino a 6 m: la sterrata della cresta scendeva sul Corso con un gradino */ });
          if (!best) return; const o = best[0], oflat = o.w / 2 + (o.kind === 'citta' || o.kind === 'litoranea' ? 2 : 0) + .4, sg = e === 0 ? 1 : -1;
          // dentro la carreggiata (e il marciapiede) della maggiore: la sua quota, in piano
          let k = e, dh = 0; for (; k >= 0 && k < n; k += sg) { const [d, h] = near(o, rd.pts[k][0], rd.pts[k][1]); if (d > oflat) break; dh = h - rd.h[k]; rd.h[k] = h; }
          // poi ci si raccorda in 24 m, senza superare la pendenza della strada
          if (k === e) return; let acc = 0; const k0 = k;
          for (; k >= 0 && k < n; k += sg) { acc += Math.hypot(rd.pts[k][0] - rd.pts[k - sg][0], rd.pts[k][1] - rd.pts[k - sg][1]); const w = 1 - sstep(0, 24, acc); if (w <= 0) break; rd.h[k] += dh * w; }
          const Gm = rd.kind === 'vicolo' || rd.kind === 'sterrato' ? .22 : .13;
          for (k = k0; k >= 0 && k < n; k += sg) { const L = Math.hypot(rd.pts[k][0] - rd.pts[k - sg][0], rd.pts[k][1] - rd.pts[k - sg][1]), a = rd.h[k - sg], h = clamp(rd.h[k], a - Gm * L, a + Gm * L); if (Math.abs(h - rd.h[k]) < .005 && acc > 30) break; rd.h[k] = h; } }); });
      // 1b) [ordine1] gli incroci a metà: dove una minore attraversa una maggiore, dentro la carreggiata della maggiore prende la sua quota
      //     e da lì si raccorda dalle due parti con la sua pendenza massima (prima passava sopra o sotto con un gradino di metri)
      const above = (o, rd) => PRI(o) !== PRI(rd) ? PRI(o) < PRI(rd) : !!o.main !== !!rd.main ? !!o.main : o.w !== rd.w ? o.w > rd.w : o.pts.length !== rd.pts.length ? o.pts.length > rd.pts.length : o.id < rd.id;   // un ordine stretto: chi comanda all'incrocio
      const BB = RDS.map(o => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; o.pts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }); return [x0 - o.w, y0 - o.w, x1 + o.w, y1 + o.w]; });
      RDS.forEach(rd => { if (rd.kind === 'vicolo') return; const n = rd.pts.length, pin = new Uint8Array(n); let any = false;
        RDS.forEach((o, oi) => { if (o === rd || !above(o, rd)) return; const bb = BB[oi];
          for (let k = 0; k < n; k++) { const [x, y] = rd.pts[k]; if (x < bb[0] || x > bb[2] || y < bb[1] || y > bb[3]) continue; const [d, h] = near(o, x, y); if (d < o.w / 2 + .4) { rd.h[k] = h; pin[k] = 1; any = true; } } });
        if (!any) return; const Gm = rd.kind === 'sterrato' ? .18 : .13;
        for (let it = 0; it < 3; it++) { for (let k = 1; k < n; k++) if (!pin[k]) { const L = Math.hypot(rd.pts[k][0] - rd.pts[k - 1][0], rd.pts[k][1] - rd.pts[k - 1][1]); rd.h[k] = clamp(rd.h[k], rd.h[k - 1] - Gm * L, rd.h[k - 1] + Gm * L); }
          for (let k = n - 2; k >= 0; k--) if (!pin[k]) { const L = Math.hypot(rd.pts[k + 1][0] - rd.pts[k][0], rd.pts[k + 1][1] - rd.pts[k][1]); rd.h[k] = clamp(rd.h[k], rd.h[k + 1] - Gm * L, rd.h[k + 1] + Gm * L); } } });
      // 2) carreggiate (e marciapiedi delle vie di città) in piano, la più importante vince
      const own = new Int8Array(NV).fill(-1), setH = new Float32Array(NV), dmin = new Float32Array(NV).fill(1e9);
      const fixed = new Uint8Array(NV); for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) { const v = grid[ty * GW + tx]; if (v === T.BLD || v === T.PIER || v === T.FOUNT || v === T.CLIFF) for (let cy = 0; cy < 2; cy++) for (let cx = 0; cx < 2; cx++) fixed[(ty + cy) * VW + tx + cx] = 1; }
      RDS.forEach(rd => { const p = PRI(rd), side = rd.kind === 'citta' || rd.kind === 'litoranea' ? 2 : 0, flat = rd.w / 2 + side + .2, P = rd.pts, n = P.length;
        for (let k = 0; k < n - 1; k++) { const [ax, ay] = P[k], [bx, by] = P[k + 1], L2 = (bx - ax) ** 2 + (by - ay) ** 2 || 1;
          for (let j = Math.max(0, Math.floor((Math.min(ay, by) - flat) / TS)); j <= Math.min(GH, Math.ceil((Math.max(ay, by) + flat) / TS)); j++) for (let i = Math.max(0, Math.floor((Math.min(ax, bx) - flat) / TS)); i <= Math.min(GW, Math.ceil((Math.max(ax, bx) + flat) / TS)); i++) {
            const q = j * VW + i; if (fixed[q] && !(rd.kind === 'vicolo' && rd.w <= 3)) continue; const x = i * TS, y = j * TS, t = clamp(((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / L2, 0, 1), d = Math.hypot(x - ax - (bx - ax) * t, y - ay - (by - ay) * t);
            if (fixed[q] && d > rd.w / 2 + .3) continue;   // [pianta] il vicolo di una casella fra due case: i suoi vertici toccano tutti un muro, ma il selciato segue il profilo della via (prima restava la quota del terreno, a gradini di un metro)
            if (d > flat || (own[q] >= 0 && own[q] < p) || (own[q] === p && d >= dmin[q])) continue;
            own[q] = p; dmin[q] = d; setH[q] = rd.h[k] + (rd.h[k + 1] - rd.h[k]) * t; } } });
      let moved = 0; for (let q = 0; q < NV; q++) if (own[q] >= 0) { if (Math.abs(vh[q] - setH[q]) > .05) moved++; vh[q] = setH[q]; if (CARR) CARR[q] = 1; }
      // 3) [ordine1] le sponde: oltre il ciglio il terreno si raccorda alla strada in 6 m (sfumato), fuori città, senza toccare edifici, acqua e moli
      { const bh = new Float32Array(NV), bw = new Float32Array(NV);
        RDS.forEach(rd => { if (rd.kind === 'citta' || rd.kind === 'vicolo') return; const flat = rd.w / 2 + .2, P = rd.pts, n = P.length, R2 = flat + 6;
          for (let k = 0; k < n - 1; k += 1) { const [ax, ay] = P[k], [bx, by] = P[k + 1], L2 = (bx - ax) ** 2 + (by - ay) ** 2 || 1;
            for (let j = Math.max(0, Math.floor((Math.min(ay, by) - R2) / TS)); j <= Math.min(GH, Math.ceil((Math.max(ay, by) + R2) / TS)); j++) for (let i = Math.max(0, Math.floor((Math.min(ax, bx) - R2) / TS)); i <= Math.min(GW, Math.ceil((Math.max(ax, bx) + R2) / TS)); i++) {
              const q = j * VW + i; if (own[q] >= 0 || fixed[q]) continue; const x = i * TS, y = j * TS, t = clamp(((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / L2, 0, 1), d = Math.hypot(x - ax - (bx - ax) * t, y - ay - (by - ay) * t);
              if (d <= flat || d > R2) continue; const w = 1 - sstep(0, 1, (d - flat) / 6); if (w > bw[q]) { bw[q] = w; bh[q] = rd.h[k] + (rd.h[k + 1] - rd.h[k]) * t; } } } });
        const wet = q => { const i = q % VW, j = Math.floor(q / VW); for (let b = -1; b <= 0; b++) for (let a = -1; a <= 0; a++) { const tx = i + a, ty = j + b; if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) continue; const v = grid[ty * GW + tx]; if (v === T.WATER || v === T.SAND) return true; } return false; };
        for (let q = 0; q < NV; q++) if (bw[q] > 0 && !wet(q)) vh[q] += (bh[q] - vh[q]) * bw[q] * .85;
        for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) { const k = ty * VW + tx; if (!(bw[k] || bw[k + 1] || bw[k + VW] || bw[k + VW + 1])) continue; const i = ty * GW + tx; if (grid[i] === T.BLD) continue; elev[i] = (vh[k] + vh[k + 1] + vh[k + VW] + vh[k + VW + 1]) / 4; } }
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
      const S = .33;   // pendenza massima (m di salita per m di percorso): circa 18° ([pianta] prima 26°: fra due vertici del selciato saliva fino a un metro)
      for (let it = 0; it < 30; it++) for (let j = 1; j < GH; j++) for (let i = 1; i < GW; i++) {
        const k = j * VW + i; if (al[k] < .25) continue;
        let lo = -1e9, hi = 1e9;
        for (let b2 = -1; b2 <= 1; b2++) for (let q = -1; q <= 1; q++) { if (!b2 && !q) continue; const d = (b2 && q ? 1.414 : 1) * TS, h = vh[(j + b2) * VW + i + q]; lo = Math.max(lo, h - S * d); hi = Math.min(hi, h + S * d); }
        if (lo <= hi) vh[k] = Math.min(hi, Math.max(lo, vh[k]));
      }
      for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) { const i = ty * GW + tx, v = grid[i]; if (v === T.BLD || v === T.WATER || v === T.PIER || v === T.SAND) continue; if (!(urb[ty * VW + tx] || urb[ty * VW + tx + 1] || urb[(ty + 1) * VW + tx] || urb[(ty + 1) * VW + tx + 1] || dd[ty * VW + tx] < 7)) continue; elev[i] = (vh[ty * VW + tx] + vh[ty * VW + tx + 1] + vh[(ty + 1) * VW + tx] + vh[(ty + 1) * VW + tx + 1]) / 4; }
    }

    // [posa] LA PASSATA FINALE DELLE OPERE: le quote che le opere impongono al terreno (il rilevato della ferrovia col sottopasso e la discesa
    // della Via Cavour, il piano della stazione, il fossato della Rocca, le banchine della darsena), poi la quota di posa di ogni pezzo e i pezzi
    // che dipendono dalle quote (le bitte sul ciglio della calata, le tre scalinate dalla marina al borgo). Dopo, nessuno tocca più vh né elev.
    if (PEZZI.length && CITY.rail) {
      const WLp = -.45, vAt = (x, y) => { const fx = Math.max(0, Math.min(GW - .001, x / TS)), fy = Math.max(0, Math.min(GH - .001, y / TS)), i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j; return (vh[j * VW + i] * (1 - u) + vh[j * VW + i + 1] * u) * (1 - v) + (vh[(j + 1) * VW + i] * (1 - u) + vh[(j + 1) * VW + i + 1] * u) * v; };
      const dirty = new Set(), setV = (i, j, h) => { if (i < 0 || j < 0 || i > GW || j > GH) return; vh[j * VW + i] = h; for (let b = -1; b <= 0; b++) for (let a = -1; a <= 0; a++) if (i + a >= 0 && j + b >= 0 && i + a < GW && j + b < GH) dirty.add((j + b) * GW + i + a); };
      const eachV = (x0, y0, x1, y1, f) => { for (let j = Math.max(0, Math.ceil(y0 / TS)); j <= Math.min(GH, Math.floor(y1 / TS)); j++) for (let i = Math.max(0, Math.ceil(x0 / TS)); i <= Math.min(GW, Math.floor(x1 / TS)); i++) f(i, j, i * TS, j * TS); };
      const eachVL = (p, x0, x1, z0, z1, f) => { const C = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([a, b]) => pzW(p, a, b)); eachV(Math.min(...C.map(c => c[0])), Math.min(...C.map(c => c[1])), Math.max(...C.map(c => c[0])), Math.max(...C.map(c => c[1])), (i, j, x, y) => { const [lx, lz] = pzL(p, x, y); if (lx >= x0 - .01 && lx <= x1 + .01 && lz >= z0 - .01 && lz <= z1 + .01) f(i, j, lx, lz); }); };
      const ry = CITY.railY, C = CITY.cavS, S = POSA.staz;
      // 1) il rilevato: la ferrovia sale col 2,4% verso il sottopasso della Via Cavour, dove passa 5 m sopra la strada
      const Lr = Math.max(.5, vAt(C.x, C.y0 + 3)), Rtop = Lr + 4.8 + .25, g0 = {};
      for (let x = 740; x <= CITY.spian0; x += 2) g0[x] = vAt(x, ry(x));
      const Rf = x => { const k = Math.round(x / 2) * 2; return Math.max((g0[k] !== undefined ? g0[k] : vAt(x, ry(x))) + .35, Rtop - .024 * Math.abs(x - C.x)); };
      POSA.Rf = Rf;
      const SUOLO = new Set([T.VIA, T.COB, T.PIAZZA, T.WALK, T.DIRT, T.GRASS]), accanto = (i, j) => { for (let b = -1; b <= 0; b++) for (let a = -1; a <= 0; a++) { const tx = i + a, ty = j + b; if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) continue; if (roadW[ty * GW + tx] > 0 || (SUOLO.has(grid[ty * GW + tx]) && Math.abs((ty + .5) * TS - ry((tx + .5) * TS)) > 2.2)) return true; } return false; };   // e la strada che passa sotto il viadotto resta alla sua quota
      // [pianta] il rilevato sta dentro la massicciata: i vertici del selciato accanto (il vicolo, lo slargo, il prato) restano alla loro quota, il muro a scarpa del binario fa il salto (prima la casella accanto saliva di tre metri in due)
      eachV(740, 0, CITY.spian0, GH * TS, (i, j, x, y) => { const d = Math.abs(y - ry(x)); if (d > 2.3 || Math.abs(x - C.x) < 2.2 || accanto(i, j)) return; const h = Rf(x) - .45; if (h > vh[j * VW + i]) setV(i, j, h); });
      for (let ty = 0; ty < GH; ty++) for (let tx = T2i(740); tx < T2i(CITY.spian0); tx++) { const x = tx * TS + 1, y = ty * TS + 1; if (Math.abs(y - ry(x)) > 2.6 || Math.abs(x - C.x) < 2.2) continue; const i = ty * GW + tx; if (grid[i] === T.WATER) continue; elev[i] = Math.max(elev[i], Rf(x) - .35); }
      // 2) la Via Cavour: a terra fino al sottopasso, poi la scalinata fino al piano della Via della Stazione
      const Htop = vAt(C.x, C.y1), yTop = C.y1 - 3.5, d = Math.max(.34, Htop - Lr), nPi = d > 2.6 ? 1 : 0, len = Math.round(d / .17) * .36 + nPi * 1.6 + .3;
      C.ps.y = Math.max(ry(C.x) + 7.5, yTop - len); C.ps.opz.dislivello = +d.toFixed(2);   // [sporcherie] i gradini salgono quanto sale davvero la via (prima almeno 1 m: in cima uno scalino di 25 cm sul Corso)
      C.ps.opz.pianerottoli = nPi; C.ps.q = Lr;
      C.p.q = Lr; C.p.opz.hRilevato = +(Rf(C.x) - Lr - .25).toFixed(2);
      eachV(C.x - 2.1, C.y0, C.x + 2.1, C.y1 - 3.4, (i, j, x, y) => setV(i, j, y <= C.ps.y ? Lr : y >= C.ps.y + len ? Htop : Lr + (Htop - Lr) * (y - C.ps.y) / len));
      // 3) il piano della stazione: il marciapiede mezzo metro sopra il ferro; il piazzale scende o sale fino alla via
      if (S) { const Sq = Rf(S.xc) - .35; S.p.q = Sq; const suVia = (i, j) => [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]].some(([a, b]) => a >= 0 && b >= 0 && a < GW && b < GH && roadW[b * GW + a] > 0);   /* [pianta] la Via Alta che passa accanto resta sul suo profilo: il marciapiede della stazione le sta sopra col suo muro */
        eachVL(S.p, -.5, S.L + 3, -11.6, 6.4, (i, j) => { if (!suVia(i, j)) setV(i, j, Sq); });   /* [pianta] il marciapiede della stazione finisce col suo rettangolo, mezzo metro oltre il fabbricato */
        const yr = S.yRoad; eachVL(S.p, -4, S.L + 4, 6.4, yr - S.p.y + .9, (i, j, lx, lz) => { if (suVia(i, j)) return; const hr = vAt(S.p.x + lx, yr + 1.5), t = Math.min(1, (lz - 6.4) / Math.max(1, yr - S.p.y - 6.4)); setV(i, j, Sq + (hr - Sq) * t); });
        const t = S.tr; let gq = -1e9; for (let lx = 0; lx <= 22; lx += 2) gq = Math.max(gq, vAt(...pzW(t, lx, 0))); t.q = gq; t.opz.rilevato = false; t.opz.hRilevato = 0;   // [sporcherie] il tronchino sta a terra, sul prato fra la via e il rilevato (prima su un suo rilevato di 4 m: sembrava sospeso sopra la linea)
        [S.loco, S.carro].forEach(p => { p.q = +(gq + .6).toFixed(2); }); }   // sulle rotaie del tronchino (massicciata .3 + traversa .15 + rotaia .15)
      // 4) il fossato della Rocca: 5 m sotto la spianata, il ponte resta in quota
      // [rocca2] il canale è mare: il ponte e la porta stanno alla quota della spianata; il pezzo del canale scende sotto il pelo dell'acqua
      const F = FORT.posa; if (F) { const Sp = vAt(F.XF - F.CW - 3, F.gy); F.Sp = Sp;
        eachV(F.XF - F.CW, F.gy - 46, F.XF, F.gy + 46, (i, j, x, y) => { if (Math.abs(y - F.gy) <= 2.6) return; setV(i, j, -2); });
        PEZZI.forEach(p => { if (p.rocca === 'spianata') p.q = Sp; else if (p.rocca === 'canale') { p.q = Sp; p.opz.prof = Math.round((Sp + 1.8) * 100) / 100; p.opz.pelo = Math.round(Sp * 100) / 100; } }); }
      // 4b) la Piazza del Mercato: l'ottagono scende di 3 m da ponente a levante; il basolato della tettoia sta in piano (alla quota di mezzo)
      // e attorno, sui lati dove la piazza resta più alta, un muro di sostegno; dove resta più bassa, il gradone con la scala per salirci
      { const tt = PEZZI.find(p => p.tipo === 'tettoia_mercato'); if (CITY.octa) {   /* [pianta] anche senza la tettoia (il mercato è sceso sulla spianata): la piazza resta in piano col suo muro e i suoi gradoni */ const [ox, oy, orr] = CITY.octa, ap = orr - 1.7, oct = (x, y) => { const dx = Math.abs(x - ox), dy = Math.abs(y - oy); return Math.max(dx, dy, (dx + dy) / Math.SQRT2); };
        const hs = []; eachV(ox - ap, oy - ap, ox + ap, oy + ap, (i, j, x, y) => { if (oct(x, y) <= ap) hs.push(vh[j * VW + i]); }); hs.sort((a, b) => a - b); const qm = hs[Math.floor(hs.length / 2)];
        const ring = []; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ring.push(vAt(ox + Math.cos(a) * (orr - .5), oy + Math.sin(a) * (orr - .5))); }
        const lato = (x, y) => ((Math.round(Math.atan2(y - oy, x - ox) / (Math.PI / 4)) % 8) + 8) % 8, giu = k => ring[k] < qm - .5, aw = k => giu(k) ? ap - .5 : ap + .1;   // dove la piazza scende il muro sta mezzo metro dentro (la scala ci sta davanti)
        eachV(ox - ap - 1, oy - ap - 1, ox + ap + 1, oy + ap + 1, (i, j, x, y) => { if (oct(x, y) <= aw(lato(x, y)) + .01) setV(i, j, qm); }); if (tt) tt.q = qm;
        // [pedonale] la scala anche sul lato dove sotto il muro c'è una porta (prima ci si arrivava solo saltando giù dal muraglione)
        // [scorcio] LA SCALA DEL GRADONE SI POSA SUL TERRENO VERO, non sulla quota di metà lato: il piede alla quota della via sotto il primo
        // gradino, l'alzata fino alla piazza (qm), nessun punto della via sopra le pedate (il terreno che passava dentro i gradini), nessuna
        // casa dentro la scala, il suo pianerottolo e mezzo metro d'attacco (le scale che entravano nelle case sugli spigoli dell'ottagono).
        // Si prova il pianerottolo dal canto del muro (xl = L) verso il mezzo, di 25 cm in 25 cm, e si tiene il primo posto pulito; sotto il
        // primo gradino il basamento scende fin sotto il terreno più basso (la scala non resta sospesa). Il risultato va nelle opzioni del
        // pezzo (scalaX = [primo gradino, ultimo, fine del pianerottolo], hs l'alzata, yb il piede e fondo il basamento, sopra la quota del
        // muro): lo leggono pezzi_citta.js (la geometria), opere() (le barriere e la quota per game.js) e chiarezza.js (la fascia libera).
        const scalaGradone = (p, qm) => { const o = p.opz, L = o.L, h = o.h, za = h * .12 * .5, zb = za + 1.8, q = p.q || 0, gL = (lx, lz) => { const [x, y] = pzW(p, lx, lz); return vAt(x, y); };
          const casa = (x0, x1, z0, z1) => { const C = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([a, b]) => pzW(p, a, b)), X0 = Math.min(...C.map(c => c[0])), X1 = Math.max(...C.map(c => c[0])), Y0 = Math.min(...C.map(c => c[1])), Y1 = Math.max(...C.map(c => c[1]));
            return B.some(b => { const bx0 = b.x * TS, by0 = b.y * TS, bx1 = bx0 + b.w * TS, by1 = by0 + b.h * TS; if (bx1 <= X0 || bx0 >= X1 || by1 <= Y0 || by0 >= Y1) return false;
              for (let u = x0; u <= x1 + 1e-6; u += .2) for (let v = z0; v <= z1 + 1e-6; v += .2) { const [x, y] = pzW(p, u, v); if (x > bx0 && x < bx1 && y > by0 && y < by1) return true; } return false; }); };
          for (let xl = L; xl >= 3; xl -= .25) { let hs = h, n = 0, pd = .32, xi = 0, yb = 0;
            for (let it = 0; it < 3; it++) { n = Math.max(1, Math.ceil(hs / .17)); pd = Math.min(.32, (xl - 1.6) / n); xi = xl - 1.4 - n * pd; let gf = -1e9; for (let u = xi - .6; u <= xi + .3; u += .15) for (let v = za; v <= zb; v += .3) gf = Math.max(gf, gL(u, v)); yb = gf - q; hs = h - yb; }
            if (xi < .2 || hs < .17) continue; const aa = hs / n; let ok = true, gmin = yb;
            for (let u = xi; u <= xl && ok; u += .1) for (let v = za; v <= zb; v += .3) { const g = gL(u, v) - q, i = Math.min(n, Math.floor((u - xi) / pd)), pa = u >= xi + n * pd ? h : yb + aa * i; if (g > pa - .03) { ok = false; break; } gmin = Math.min(gmin, g); }
            if (!ok || casa(xi - .6, xl, za - .05, zb + .3)) continue;
            o.scalaX = [+xi.toFixed(3), +(xi + n * pd).toFixed(3), +xl.toFixed(3)]; o.n = n; o.pd = +pd.toFixed(4); o.hs = +hs.toFixed(3); o.yb = +yb.toFixed(3); o.fondo = +(Math.min(yb, gmin) - .15).toFixed(3); return; }
          o.scala = false; CITY.scaleTolte = (CITY.scaleTolte || 0) + 1; };   // nessun posto pulito sul lato: niente scala (la ringhiera chiude il ciglio)
        const portaSotto = (k, nx, ny) => B.some(b => { if (!b.door) return false; const dx = (b.door[0] + .5) * TS - ox, dy = (b.door[1] + .5) * TS - oy, v = dx * nx + dy * ny - aw(k), u = Math.abs(-dx * ny + dy * nx); return v > 0 && v < 5 && u < aw(k) * Math.tan(Math.PI / 8) + 1; });
        for (let k = 0; k < 8; k++) { const d = ring[k] - qm; if (Math.abs(d) < .5) continue; const a = k * Math.PI / 4, nx = Math.cos(a), ny = Math.sin(a), fx = d > 0 ? -nx : nx, fy = d > 0 ? -ny : ny, L = 2 * aw(k) * Math.tan(Math.PI / 8) - .3;
          const g = pzAt('gradone', ox + nx * aw(k), oy + ny * aw(k), Math.atan2(fx, fy), L / 2, 0, { L: +L.toFixed(2), h: +Math.abs(d).toFixed(2), P: d > 0 ? .8 : 2.4, rampa: false, scala: d < 0 && (k % 2 === 0 || portaSotto(k, nx, ny)), ringhiera: d < 0 }, { nome: d > 0 ? 'Muro di sostegno del Mercato' : 'Gradone del Mercato' });
          g.q = +Math.min(qm, ring[k]).toFixed(2); if (g.opz.scala) scalaGradone(g, qm); } } }
      // 5) le banchine della darsena alla quota della calata; il molo e lo scalo alla quota del loro piano
      { const qd = Math.max(.6, vAt((DARS.x0 + DARS.x1) / 2, DARS.y0 - 3)); PEZZI.forEach(p => { if (p.tipo === 'darsena' && !p.opz.rocca) { p.q = qd; p.opz.hq = +(qd - WLp).toFixed(2); } });
        eachV(DARS.x0, DARS.y0, DARS.x1, DARS.y1, (i, j, x, y) => { if (x <= DARS.x0 + DARS.b || x >= DARS.x1 - DARS.b || y <= DARS.y0 + DARS.b) setV(i, j, qd); });
        const mo = SEA.structs.find(s => s.id === 'molo_levante'); PEZZI.forEach(p => { if (p.tipo === 'molo_vecchio') { p.q = mo ? mo.h : 1.3; p.opz.hq = +(p.q - WLp).toFixed(2); } if (p.tipo === 'scalo_alaggio') { p.q = Math.max(.6, vAt(p.x + 3, p.y - 2)); p.opz.hq = +(p.q - WLp).toFixed(2); } }); }
      // [rocca2] la Rocca a mare: la darsena, il ponte ad arco e la porta d'acqua alla quota delle banchine (il pelo dell'acqua a WLp);
      // il frangiflutti al pelo del mare; il canale scende dalla spianata fin sotto l'acqua
      { const DS = FORT.darsena; if (DS) { const qr = Math.max(.8, vAt(DS.x0 + 2, DS.yc - DS.W / 2 - 2)), hq = +(qr - WLp).toFixed(2);
          eachV(DS.x0, DS.yc - DS.W / 2 - DS.B, DS.x0 + DS.L + 2 * DS.B, DS.yc + DS.W / 2, (i, j, x, y) => { if (x <= DS.x0 + DS.B || x >= DS.x0 + DS.B + DS.L || y <= DS.yc - DS.W / 2) setV(i, j, qr); });
          PEZZI.forEach(p => { if (p.tipo === 'darsena' && p.opz.rocca) { p.q = qr; p.opz.hq = hq; } else if (p.tipo === 'ponte_arco' || p.tipo === 'porta_acqua') { p.q = qr; p.opz.acqua = hq; } }); }
        // le masse di carparo sullo scoglio: la quota dal loro interno (gli spigoli toccano il canale o la riva, che stanno sotto)
        PEZZI.forEach(p => { if (!/^(corpo_rocca|mastio|caserma|polveriera)$/.test(p.tipo) || p.x < FORT.x - 6 || !p.imp) return; const r = p.imp[0], a = r[1] + 1.5, b = r[2] - 1.5, c = r[3] + 1.5, d = r[4] - 1.5;
          if (b > a && d > c) p.q = Math.min(...[[a, c], [b, c], [b, d], [a, d], [(a + b) / 2, (c + d) / 2]].map(([u, v]) => vAt(...pzW(p, u, v)))); });
        PEZZI.forEach(p => { if (p.tipo === 'scogliera') p.q = +(WLp + .7).toFixed(2); else if (p.rocca === 'canale') { p.opz.prof = +(p.q - WLp + 1.2).toFixed(2); p.opz.pelo = +(p.q - WLp).toFixed(2); } }); }
      dirty.forEach(i => { const tx = i % GW, ty = (i / GW) | 0, k = ty * VW + tx; elev[i] = (vh[k] + vh[k + 1] + vh[k + VW] + vh[k + VW + 1]) / 4; });
      // 6) le bitte sul ciglio della calata, una ogni 12 m (non davanti ai pontili, al molo, alla darsena)
      for (let x = 1002; x <= 1088; x += 8) { if ([990, 1013, 1037, 970].some(px => Math.abs(px - x) < 3.5) || (x > DARS.x0 - 2 && x < DARS.x1 + 2) || Math.abs(x - 1080) < 4) continue;
        let ye = null; for (let y = 180; y < 200; y += .5) { const i = Math.floor(y / TS) * GW + Math.floor(x / TS), i2 = Math.floor((y + 1) / TS) * GW + Math.floor(x / TS); if (grid[i] === T.QUAY && grid[i2] === T.WATER) { ye = Math.floor((y + 1) / TS) * TS; break; } }
        if (ye !== null) { const p = PZ('bitta', x, ye - .7, 0, { h: .6, cima: true }, { nome: 'Bitta' }); p.q = vAt(x, ye - 1.2); } }
      // 7) le tre scalinate dalla marina al borgo: i gradini per il dislivello vero fra il piede e dieci metri più su
      // [scorcio] la scala segue il vicolo: le rampe coprono i dieci metri fino al punto misurato (pedata lunga, la «gradonata» dei vicoli
      // in salita, fino a 90 cm) e il dislivello si misura dove l'ultima rampa arriva davvero. Prima i gradini da 36 cm salivano il
      // dislivello di dieci metri in cinque: la Scalinata di Vico Lungo finiva un metro sopra la via (un salto in cima) e più giù la via
      // passava dentro i gradini
      (POSA.scal || []).forEach(c => { const p = c.p, d0 = vAt(p.x, p.y), Lv = Math.max(3, Math.min(9.6, Math.hypot(p.B2[0] - p.x, p.B2[1] - p.y))); let dd = Math.max(.6, vAt(...p.B2) - d0), pd = .36;
        for (let it = 0; it < 6; it++) { const n = Math.max(1, Math.ceil(dd / .17)), nf = dd > 3.2 ? 2 : 1; pd = Math.max(.36, Math.min(.9, (Lv - (nf - 1) * 1.6) / Math.max(1, n - (nf - 1)))); const X = n * pd + (nf - 1) * (1.6 - pd); dd = Math.max(.34, vAt(...pzW(p, X, 0)) - d0); }
        p.q = d0; p.opz.dislivello = +dd.toFixed(2); p.opz.pianerottoli = dd > 3.2 ? 1 : 0; p.opz.pedata = +pd.toFixed(3); delete p.B2; });
      // [scorcio] 7b) il terreno sotto le scalinate non passa sopra i gradini né sopra l'arrivo: i vertici sotto la scala (e una fila oltre i
      // muri d'ambito, per l'interpolazione) scendono sotto la linea dei nasi (la retta dal piede alla fine dell'ultima rampa, che sta sotto
      // ogni pedata) e sotto il ripiano d'arrivo; dove il terreno era già più basso resta com'è (la massa della scala scende fino a q)
      PEZZI.forEach(p => { if (p.tipo !== 'scalinata' || p.q === undefined) return; const o = p.opz, H = o.dislivello || 8, n = Math.max(1, Math.ceil(H / .17)), pd = o.pedata || .36, nf = Math.max(1, (o.pianerottoli || 0) + 1), Xs = n * pd + (nf - 1) * (1.6 - pd), w = o.w || 4;
        eachVL(p, -2, Xs + 3.3, -w / 2 - 2.4, w / 2 + 2.4, (i, j, lx) => { const e = p.q + (lx >= Xs ? H : Math.max(H / n, H * lx / Xs)) - .04; if (vh[j * VW + i] > e) setV(i, j, e); }); });   // oltre l'arrivo una fila di vertici in più: la via riprende a salire dopo il ripiano
      // 8) la quota di posa degli altri: il punto più basso dell'impronta (niente pezzi sospesi; dove il terreno sale, il pezzo ci entra)
      const QR = { campanile: [0, 4.4, -2.2, 2.2], facciata_chiesa: [0, 10, .4, 1.6], torre_littoria: [0, 7, -3.5, 3.5], tettoia_mercato: [8, 20, -6, 6], edicola_votiva: [-.4, .4, -.3, .3], pozzo: [-1, 1, -1, 1], fontana: [-2, 2, -2, 2],
        arco_sottopasso: [3, 4.4, -4.5, 4.5], arco_contrasto: [1.7, 2.7, -.4, .4], porta_terra: [5.6, 8.6, -3, 6], muro_garante: [0, 24, -.5, .5], palo_riflettori: [-.4, .4, -.4, .4], caserma: [0, 0, -3.5, 3.5], polveriera: [0, 0, -2.5, 2.5], torrione: [3, 13, -5, 5], passaggio_livello: [9, 13, -1, 1] };
      PEZZI.forEach(p => { if (p.q !== undefined) return; let r = p.tipo === 'portico' ? [0, p.opz.campate * p.opz.campata, 1.5, 2.1] : p.tipo === 'caserma' || p.tipo === 'polveriera' || p.tipo === 'muro_garante' ? [0, p.opz.L, QR[p.tipo][2], QR[p.tipo][3]] : QR[p.tipo] || (p.imp && p.imp[0].slice(1)) || [-.5, .5, -.5, .5];
        const pts = [[r[0], r[2]], [r[1], r[2]], [r[1], r[3]], [r[0], r[3]], [(r[0] + r[1]) / 2, (r[2] + r[3]) / 2]]; p.q = Math.min(...pts.map(([a, b]) => vAt(...pzW(p, a, b))));
        if (p.tipo === 'passaggio_livello') p.q = Rf(pzW(p, 11, 0)[0]) - .45;
        if (p.tipo === 'torre_littoria' || (p.tipo === 'torre_guardia' && p.recinto)) p.q = Math.max(p.q, .3); });   // [sporcherie] la torre littoria e le torri di guardia del Recinto (la Torre del canale) posano sulla banchina, non sotto il pelo dell'acqua
      PEZZI.forEach(p => { p.q = Math.round(p.q * 100) / 100; });
      if (typeof process !== 'undefined' && process.env && process.env.PV_DBG) { const c = {}; PEZZI.forEach(p => { c[p.tipo] = (c[p.tipo] || 0) + 1; }); console.log('[posa] pezzi', PEZZI.length, JSON.stringify(c), 'rilevato al sottopasso', Rtop.toFixed(2), 'strada', Lr.toFixed(2)); }
    }
    // ---------------- PARTENZE DEI VEICOLI E CORSIE ----------------
    // [pedonale] LE VIE PEDONALI (rd.pedonale): i vicoli che portano una scalinata, passano sotto una volta o in un sottopasso, o toccano
    // una piazza lastricata, una fontana, la scala di un gradone. Su queste vie non va nessun mezzo: niente corsie (qui), niente Ape e
    // motorini né sosta (vievive.js), niente segni da strada (segnaletica.js), nessuna auto che nasce o parcheggia (game.js usa le corsie)
    { const OPd = opere(PEZZI, CITY.sets).pedonali, vicino = (o, x, y, m) => o.r !== undefined ? Math.hypot(x - o.x, y - o.y) < o.r + m : o.poly.some((q, i) => { const a = o.poly[(i + o.poly.length - 1) % o.poly.length], dx = q[0] - a[0], dy = q[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2)); return Math.hypot(a[0] + dx * t - x, a[1] + dy * t - y) < m; }) || (() => { let c = false; const P = o.poly; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; })();
      // la via dei veicoli che finisce contro un muraglione, una scala o la piazza alta (la Vittoria sotto il gradone dell'Ottagono: le auto
      // uscivano dal muro, la freccia del semaforo finiva sulla piazza): la carreggiata si ferma all'ultimo incrocio con un'altra via dei
      // veicoli e il tratto dopo diventa una via pedonale (stesso nome, stesso suolo; le case e i lotti restano quelli di prima)
      const veic = rd => rd.pts && !rd.pedonale && (rd.kind === 'citta' || rd.kind === 'strada' || rd.kind === 'litoranea'), dSegP = (q, x, y) => { let b = 1e9; for (let k = 0; k < q.length - 1; k++) { const [ax, ay] = q[k], [bx, by] = q[k + 1], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)); b = Math.min(b, Math.hypot(ax + dx * t - x, ay + dy * t - y)); } return b; };
      roads.filter(veic).forEach(rd => { for (const e of [0, 1]) { const P = rd.pts, E = e ? P[P.length - 1] : P[0]; if (!OPd.some(o => (o.muro || o.tipo === 'scala' || o.tipo === 'piazza_alta') && vicino(o, E[0], E[1], 3))) continue;
        const ord = e ? P.map((q, i) => i).reverse() : P.map((q, i) => i); let cut = -1;
        for (let j = 1; j < ord.length / 2 && cut < 0; j++) { const q = P[ord[j]]; if (roads.some(o => o !== rd && veic(o) && dSegP(o.pts, q[0], q[1]) < o.w / 2)) cut = ord[j]; }
        if (cut < 0) continue; const stub = (e ? P.slice(cut) : P.slice(0, cut + 1)).map(q => q.slice());   /* punti suoi: expand() sposta ogni punto una volta */ rd.pts = e ? P.slice(0, cut + 1) : P.slice(cut);
        roads.push({ id: rd.id + '_piede', name: rd.name, w: rd.w, kind: 'vicolo', pts: stub, pedonale: true, era: rd.era }); } });
      roads.forEach(rd => { if (rd.kind !== 'vicolo' || rd.pedonale || !rd.pts) return;
        if (rd.sottopasso || OPd.some(o => o.vicolo === rd.id) || rd.pts.some(([x, y]) => OPd.some(o => o.tipo !== 'muraglione' && vicino(o, x, y, rd.w / 2 + .5)))) rd.pedonale = true; }); }
    // [altopiano] sul Tavolato, a terreno finito (quello che si vede, levigato e scavato dai sentieri): la casella naturale più ripida del
    // ghiaione più ripido (34°) è roccia in piedi, non ci si sale. Così fra due caselle percorribili vicine non c'è mai un salto
    { const MIO = BF.TOP | BF.TALUS | BF.TERR | BF.LECCI, NAT = new Set([T.GRASS, T.SHRUB, T.ROCK, T.GRAVEL, T.TREE, T.SAND]);
      for (let ty = 1; ty < GH - 1; ty++) for (let tx = 1; tx < GW - 1; tx++) { const i = ty * GW + tx, x = tx * TS + 1, y = ty * TS + 1; if (x >= XF || roadW[i] > 0 || roadW[i - 1] > 0 || roadW[i + 1] > 0 || roadW[i - GW] > 0 || roadW[i + GW] > 0 || !NAT.has(grid[i]) || Math.abs(x - TAV.x) > 130 || Math.abs(y - TAV.y) > 130) continue;
        const f = bosco(x, y).f; if (!(f & (MIO | BF.CANALE)) || (f & BF.POZZA) || ((f & BF.CANALE) && dist(x, y, ...CANALI[1].p0) < 44)) continue;   // nella spaccatura di ponente si arrampica
        const k = ty * VW + tx, a = vh[k], b = vh[k + 1], c = vh[k + VW], d = vh[k + VW + 1];
        if (Math.hypot(b + d - a - c, c + d - a - b) / (2 * TS) > .7) { grid[i] = T.CLIFF; feat[i] |= 4096; } } }
    const lanes = roads.filter(rd => rd.kind !== 'sterrato' && rd.kind !== 'vicolo' && !rd.pedonale).map(rd => ({ id: rd.id, w: rd.w, pts: rd.pts, closed: false }));
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
    return { pezzi: PEZZI, recinto: POSA.recinto || null, glacis: CITY.glacis || null, railCity: CITY.rail, sets: CITY.sets, nodi: CITY.nodi, eco, ECO, monte, MF, feat, BRIDGES, CAVES, WALL, FORT, HILLS, VILLAGES: VILLAGES.map(q => [xn(q[0])].concat(q.slice(1))), districtAt: DistrictAt, yc: Yc, northY: NorthY, southY: SouthY, onLand: OnLand, inland: Inland, LAKE,
      DXF, DXC, XF, XG, XC, XE, xo, xn, SEA, COSTA, COSTA2, coastKind, coastKind2, ISOLE, LAGUNE, isleAt, isleIn, HEAD, TAV, CANALI, GOV, BF, bosco, RING, TUNNELS, tavR, tavW, POZZA, canHalf, CAN0, CAN1, canFloor, TS, GW, GH, SIZE, SX, SY, T, Z, ZNAME, grid, zone, elev, velev, vh, VW, reach, bIndex, roadW, roads, lanes, BUILDINGS: B, PLACES, zoneAt, rawElev, CX, CY };
  }

  // ================= [arcipelago] LA MAPPA GRANDE =================
  // L'isola grande nasce come prima (generate, coordinate «di progetto» 0..1300 × 0..400), poi viene incollata al centro di
  // una mappa più grande: OX metri di mare a ovest, OY a nord, e altro mare a est e a sud. Tutto quello che il mondo espone
  // (caselle, quote, luoghi, strade, edifici, porto, mura, grotte, funzioni della riva) viene spostato di (OX, OY): gli altri
  // moduli vedono solo la mappa grande e non sanno niente dello spostamento. Le isole dell'arcipelago (coordinate di progetto,
  // anche negative) si generano qui sopra la mappa grande, poi si rifà il fondale di tutto il mare.
  // [isola-ridotta] a est della città restano 120 m di mare oltre il bordo del progetto (prima 360: ci stavano il Presidio, la Mezzaluna e
  // i Pescatori Lontani, che non si generano più): la mappa grande è 1740 × 840 m invece di 1980 × 840 (870 × 420 caselle, il 12 % in meno
  // di caselle, di tele dell'acqua e di campi grandi quanto la mappa). OX e OY restano: le coordinate finali della città non cambiano.
  // A ovest il mare guadagnato dalla campagna più corta resta dentro la mappa: per toglierlo bisognerebbe spostare l'origine e con lei
  // tutte le coordinate finali della città (la cornice 1222-1610 di MAPPA_COMPATTA, percorsi.js, render.js, gli strumenti).
  const OX = 320, OY = 200, SX2 = SX + OX + 120, SY2 = SY + OY + 240, GW2 = SX2 / TS, GH2 = SY2 / TS, OTX = OX / TS, OTY = OY / TS;
  // [mappa_compatta] I DODICI LUOGHI-MISSIONE (MAPPA_COMPATTA.md sez. 4): lo scheletro della città compatta. Ognuno ha i suoi ruoli
  // (hub, segreto, pericolo, premio), l'icona della mappa, la firma che si vede dalla strada, il landmark del quartiere, gli ingressi e il
  // segreto. La posizione la prende dal gioco (l'edificio, la scenografia, il pezzo), così resta vera se il generatore sposta le cose.
  // Lo leggono percorsi.js (i nodi), posti.js, la mappa del giocatore e le missioni.
  function luoghi(W) {
    const TSx = W.TS, B = W.BUILDINGS, bc = id => { const b = B.find(q => q.id === id); return b ? [(b.x + b.w / 2) * TSx, (b.y + b.h / 2) * TSx] : null; };
    const set = (k, f) => { const q = (W.sets || []).find(s => s.k === k && (!f || f(s))); return q ? (q.x !== undefined ? [q.x, q.y] : [(q.x0 + q.x1) / 2, (q.y0 + q.y1) / 2]) : null; };
    const pz = t => { const p = (W.pezzi || []).find(q => q.tipo === t); return p ? [p.x, p.y] : null; }, pl = id => W.PLACES[id] ? [W.PLACES[id].x, W.PLACES[id].y] : null;
    const L = [
      [1, 'bar', 'Bar Da Gino, Piazzetta del Pozzo', set('piazzetta', q => q.bar), ['hub'], 'tazza', 'gli ombrelloni rossi sulla piazzetta, il campanile alle spalle', 'campanile', ['Rua Maestra', 'Vico del Pozzo'], 'i tetti dal giro della Porta'],
      [2, 'forno', 'Forno di Lella, Piazzetta del Forno', set('piazzetta', q => q.forno), ['hub', 'premio'], 'pane', 'il fumo del comignolo, la bocca del forno di notte', 'gru_porto', ['Via di Mezzo', 'Vico della Fame', 'Scalinata del Forno'], 'la cantina calda del forno, dalla cisterna del Pozzo'],
      [3, 'chiesa', 'San Rocco e la cripta, il sagrato', bc('chiesa'), ['segreto'], 'croce', 'il campanile a maioliche', 'campanile', ['Rua Maestra', 'il sagrato'], 'la cripta e le catacombe verso il rifugio'],
      [4, 'pescheria', 'Pescheria e calata, Piazza della Marina', set('marina'), ['hub', 'premio'], 'pesce', 'la gru, la lanterna del Molo Vecchio', 'gru_porto', ['Via della Marina', 'Vico Lungo'], 'la grata del deposito sotto il Magazzino Neri'],
      [5, 'officina', 'Officina dello Scalo', bc('officina'), ['premio'], 'chiave', 'il portone a volta col pezzo wildstyle, lo scivolo in acqua', 'gru_porto', ['Corso Garibaldi', 'Via della Marina', 'Vico delle Carceri'], 'in gozzo dalla darsena allo scivolo'],
      [6, 'covo', 'Covo nel bunker delle mura', pl('covo'), ['segreto'], 'foglia', 'solo dal mare e dalle mura: una lanterna verde fra i merli', 'campanile', ['Via delle Mura', 'il camminamento delle mura'], 'il cunicolo dal rifugio sotto l\'adunata'],
      [7, 'radio', 'Radio Luna', bc('disco'), ['segreto', 'premio'], 'antenna', 'la torre dell\'acqua con l\'antenna e la lampada bianca', 'torre_acqua', ['Passo delle Baracche', 'Sottopasso Cavour'], 'sopra il rilevato, sui tetti dei carri merci'],
      [8, 'mercato', 'Mercato della Rocca', set('mercato'), ['hub', 'pericolo'], 'otto', 'le tende a strisce dei banchi davanti al canale e alla Rocca', 'mastio', ['Viale della Spianata', 'Via della Vittoria', 'Riva della Rocca', 'Vico del Glacis'], 'i tetti bassi delle case del glacis'],   // [pianta] il mercato è sceso sulla spianata
      [9, 'stazione', 'Stazione e scalo merci', set('stazione'), ['pericolo', 'premio'], 'orologio', 'l\'orologio della stazione', 'stazione', ['Via della Stazione', 'il piazzale', 'Corso Garibaldi'], 'la stanza murata del regime sotto il fabbricato'],
      [10, 'baracche', 'Baracche e grata del vapore', set('baracche'), ['hub', 'segreto'], 'fiamma', 'il pennacchio di vapore, i fuochi di notte', 'torre_acqua', ['Passo delle Baracche', 'Sottopasso Cavour', 'il passaggio a livello'], 'l\'autobus sepolto sotto la discarica'],
      [11, 'posto_blocco', 'Posto di blocco della Vittoria', pz('muro_garante') && [pz('muro_garante')[0], (W.FORT ? W.FORT.y : 343)], ['pericolo'], 'sbarra', 'il riflettore e i pali in fila', 'mastio', ['Via della Vittoria', 'la spianata'], 'i tetti delle case mozzate sul bordo della spianata'],
      [12, 'rocca', 'La Rocca', set('armi'), ['pericolo'], 'torre', 'il mastio col faro rosso', 'mastio', ['il ponte e la Porta della Rocca', 'la porta d\'acqua della darsena'], 'per mare dal Molo Vecchio fino alla porta d\'acqua; il cunicolo di fuga e la cisterna'],
    ];
    return L.filter(q => q[3]).map(([n, id, nome, xy, ruoli, icona, firma, landmark, ingressi, segreto]) => ({ n, id, nome, x: +xy[0].toFixed(1), y: +xy[1].toFixed(1), ruoli, icona, firma, landmark, ingressi, segreto }));
  }
  // [pedonale] LE OPERE PEDONALI dai pezzi e dalle piazze (in qualunque sistema di coordinate: quello dei pezzi e dei sets che riceve).
  // pedonali: le impronte (poly in coordinate del mondo, o x, y, r) delle opere dove i veicoli non passano: i muraglioni dei gradoni
  //   (muro: true) e la piazza alta che reggono, le scale addossate ai gradoni, le scalinate, le fontane, i pozzi e i lavatoi, i sottopassi
  //   pedonali e le case a volta sui vicoli, le piazzette lastricate. src/pedonale.js le confronta con le vie dei veicoli.
  // barriere: i segmenti che non si attraversano a piedi né coi mezzi [x0, y0, x1, y1, tipo]: il ciglio dei muraglioni (la ringhiera o il
  //   salto), il corrimano e la testata delle scale dei gradoni, le spallette delle scalinate, i parapetti e i guardrail. game.js li usa per
  //   urtare (walkM), per tagliare i passi (taglia) e come lati chiusi nella griglia dei percorsi.
  // scale: i soli passaggi fra il piano basso e quello alto: pts = l'attacco in basso, il primo gradino, l'arrivo, l'uscita in cima;
  //   per le scale dei gradoni (salita: true) anche la cornice locale (x, y, rot, x0 primo gradino, x1 ultimo, x2 fine del pianerottolo,
  //   z0..z1 la fascia della scala) con la quota del piede q e il dislivello h: game.js ne fa la quota di chi ci cammina.
  function opere(pezzi, sets) {
    const OP = [], BAR = [], SCALE = [], r2 = v => Math.round(v * 100) / 100;
    const pw = (p, lx, lz) => { const c = Math.cos(p.rot || 0), s = Math.sin(p.rot || 0); return [r2(p.x + lx * c + lz * s), r2(p.y - lx * s + lz * c)]; };
    const rett = (p, x0, x1, z0, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([a, b]) => pw(p, a, b));
    const muro = (p, x0, z0, x1, z1, tipo) => { const a = pw(p, x0, z0), b = pw(p, x1, z1); BAR.push([a[0], a[1], b[0], b[1], tipo]); };
    let n = 0; const nuovo = (tipo, p, o) => { const q = Object.assign({ id: tipo + '_' + (n++), tipo, nome: p && p.nome || tipo }, o); OP.push(q); return q; };
    (pezzi || []).forEach(p => { const o = p.opz || {};
      if (p.tipo === 'gradone') { const L = o.L, h = o.h, k = .12;
        nuovo('muraglione', p, { muro: true, poly: rett(p, -.2, L + .2, -.4, h * k + .1) });
        let gap = null;
        if (o.scala) {   // la scala addossata al fronte (pezzi_citta.js T.gradone): sale lungo +X fino al pianerottolo, poi si passa sul muro
          const nn = Math.ceil(h / .17), pd = Math.min(.32, (L - 1.6) / nn), SX = o.scalaX, xi = SX ? SX[0] : Math.max(0, L - nn * pd - 1.4), xt = SX ? SX[1] : xi + nn * pd, xl = SX ? SX[2] : Math.min(L, xt + 1.4), za = h * k * .5, zb = za + 1.8, zc = (za + zb) / 2, xm = (xt + xl) / 2;   // [scorcio] il posto vero della scala (scalaGradone)
          gap = [xt, xl]; const s = nuovo('scala', p, { nome: 'Scala del ' + (p.nome || 'gradone').replace(/^Gradone del /, ''), poly: rett(p, xi - .1, xl, za - .05, zb + .1) });
          muro(p, xi, zb + .1, xl, zb + .1, 'corrimano'); muro(p, xl, 0, xl, zb + .1, 'testata');
          SCALE.push({ id: s.id, nome: s.nome, salita: true, x: r2(p.x), y: r2(p.y), rot: p.rot || 0, x0: r2(xi), x1: r2(xt), x2: r2(xl), z0: r2(za), z1: r2(zb), q: r2((p.q || 0) + (SX ? o.yb : 0)), h: SX ? o.hs : h, pts: [pw(p, xi - .9, zc), pw(p, xi + .15, zc), pw(p, xm, zc), pw(p, xm, -1.2)] }); }
        // il ciglio del muro (la ringhiera o il salto) da un canto all'altro, aperto solo dove arriva la scala
        const tipo = o.ringhiera ? 'ringhiera' : 'muraglione';
        if (gap) { muro(p, -.2, 0, gap[0], 0, tipo); if (gap[1] < L + .2 - .05) muro(p, gap[1], 0, L + .2, 0, tipo); } else muro(p, -.2, 0, L + .2, 0, tipo);
      } else if (p.tipo === 'scalinata') {   // pezzi_citta.js T.scalinata: sale lungo +X, larga w, i muri d'ambito ai due lati
        const H = o.dislivello || 8, nn = Math.max(1, Math.ceil(H / .17)), pd = o.pedata || .36, nf = Math.max(1, (o.pianerottoli || 0) + 1), w = o.w || 4, X = nn * pd + (nf - 1) * (1.6 - pd) + 1.2;
        const s = nuovo('scalinata', p, { poly: rett(p, 0, X, -w / 2 - .45, w / 2 + .45), vicolo: p.vicolo || null });
        for (const sd of [-1, 1]) muro(p, 0, sd * (w / 2 + .15), X, sd * (w / 2 + .15), 'spalletta');
        SCALE.push({ id: s.id, nome: s.nome, salita: false, pts: [pw(p, -.9, 0), pw(p, .15, 0), pw(p, X - .15, 0), pw(p, X + .9, 0)] });
      } else if (p.tipo === 'fontana' || p.tipo === 'pozzo') nuovo('fontana', p, { x: r2(p.x), y: r2(p.y), r: (o.r || 1) + .4 });
      else if (p.tipo === 'lavatoio' || p.tipo === 'sottopasso' || p.tipo === 'arco_sottopasso') { const B = (p.imp || []).find(r => r[0] === 'B'); if (B) nuovo(p.tipo === 'lavatoio' ? 'fontana' : 'sottopasso', p, { poly: rett(p, B[1], B[2], B[3], B[4]), vicolo: p.vicolo || null }); }
      else if (p.tipo === 'parapetto') muro(p, 0, 0, o.L || 12, 0, 'parapetto'); });
    (sets || []).forEach(q => {
      if (q.k === 'ottagono') { const alta = OP.some(o => o.muro && Math.hypot(o.poly[0][0] - q.x, o.poly[0][1] - q.y) < q.r + 4), ap = q.r - 1.7 - (alta ? .5 : 0), R = ap / Math.cos(Math.PI / 8), P = [];
        for (let k = 0; k < 8; k++) { const a = (k + .5) * Math.PI / 4; P.push([r2(q.x + Math.cos(a) * R), r2(q.y + Math.sin(a) * R)]); }
        nuovo(alta ? 'piazza_alta' : 'piazza', { nome: q.nome }, { poly: P }); }
      else if (q.k === 'piazzetta') nuovo('piazza', { nome: q.nome || 'Piazzetta' }, { x: q.x, y: q.y, r: q.r });
      else if (q.k === 'sagrato' || q.k === 'marina') nuovo('piazza', { nome: q.nome || q.k }, { poly: [[q.x0, q.y0], [q.x1, q.y0], [q.x1, q.y1], [q.x0, q.y1]] }); });
    return { pedonali: OP, barriere: BAR, scale: SCALE };
  }
  // [cotto] le funzioni della mappa grande che leggono i suoi vettori: le fa expand() e, col mondo cotto, le rifà la lettura (stesse funzioni)
  function rivaFunzioni(W, grid, elev, vh, velev, isl) {
    const T_ = T, VW2 = GW2 + 1;
    const ix = (tx, ty) => ty * GW2 + tx, toD = (tx, ty) => [tx * TS + 1 - OX, ty * TS + 1 - OY];
    const vfix = (tx0, ty0, tx1, ty1) => { for (let j = Math.max(0, ty0); j <= Math.min(GH2, ty1); j++) for (let i2 = Math.max(0, tx0); i2 <= Math.min(GW2, tx1); i2++) {
      let s2 = 0, c = 0, wet = false, made = false, any = false;
      for (const [a, b2] of [[i2 - 1, j - 1], [i2, j - 1], [i2 - 1, j], [i2, j]]) { if (a < 0 || b2 < 0 || a >= GW2 || b2 >= GH2) { wet = true; continue; } const k = b2 * GW2 + a; if (isl[k]) any = true; if (grid[k] === T_.WATER) { wet = true; continue; } if (grid[k] === T_.QUAY || grid[k] === T_.PIER) made = true; s2 += elev[k]; c++; }
      if (!any) continue; vh[j * VW2 + i2] = velev[j * VW2 + i2] = c ? (wet && !made ? Math.min(s2 / c, .5) : s2 / c) : -2.2; } };
    const WL_SECCO = -.45 + .2, FATTO = new Set([T_.BLD, T_.VIA, T_.COB, T_.PIAZZA, T_.WALK, T_.STAIRS, T_.FOUNT, T_.QUAY, T_.PIER]);
    const fatto = (i, j) => { for (const [a, b] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]) { if (a < 0 || b < 0 || a >= GW2 || b >= GH2) continue; if (FATTO.has(grid[b * GW2 + a])) return true; } return false; };
    const quotaRiva = (i, j) => {   // la quota del terreno che si vede al vertice (i, j): quella del mondo, con la riva ammorbidita dove è naturale
      const ii = Math.max(0, Math.min(GW2, i)), jj = Math.max(0, Math.min(GH2, j)); let h = vh[jj * VW2 + ii];
      if (fatto(i, j)) return Math.max(h, WL_SECCO);
      const x = i * TS, y = j * TS, L = W.LAKE, lq = L ? Math.hypot((x - L.x) / L.rx, (y - L.y) / L.ry) : 9, lk = lq < 1.6;
      const ci = lq < 1.6 ? (lq - .9) * Math.min(L.rx, L.ry) : W.inland(x, y), b0 = lk ? L.h - 1.9 : -1.6;
      if (ci < 4) { const land = Math.max(lk ? L.h + .25 : .4, h > b0 + .6 ? h : .4), k = Math.max(0, Math.min(1, (ci + 1.2) / 5.2)); h = b0 + (land - b0) * k * k * (3 - 2 * k); }
      return h;
    };
    return { __vfix: vfix, __ix: ix, __toD: toD, quotaRiva, WL_SECCO, FATTO, fatto };
  }
  function rivaGrande() {
    return {
      districtAt: (x, y) => y !== undefined && isleIn(x - OX, y - OY) > Inland0(x - OX, y - OY) - 18 ? 'isole' : DistrictAt0(x - OX),
      yc: x => Yc(x - OX) + OY, northY: x => NorthY(x - OX) + OY, southY: x => SouthY(x - OX) + OY,
      onLand: (x, y) => OnLand(x - OX, y - OY), inland: (x, y) => Inland(x - OX, y - OY), inlandK: (x, y, cap) => InlandK(x - OX, y - OY, cap),   // [fluido] vedi InlandK
      zoneAt: (x, y) => zoneAt(x - OX, y - OY), rawElev: (x, y) => rawElev(x - OX, y - OY), coastKind: (x, y) => coastKind(x - OX, y - OY), coastKind2: (x, y) => coastKind2(x - OX, y - OY),
      xo: x => xo(x - OX), xn: a => xn(a) + OX, bosco: (x, y) => bosco(x - OX, y - OY),
      isleAt: (x, y) => isleAt(x - OX, y - OY), isleIn: (x, y) => isleIn(x - OX, y - OY) };
  }
  function expand(W) {
    const N2 = GW2 * GH2, VW2 = GW2 + 1, T_ = T;
    const big = (src, Ctor, fill) => { const a = new Ctor(N2); if (fill !== undefined) a.fill(fill); for (let ty = 0; ty < GH; ty++) a.set(src.subarray(ty * GW, ty * GW + GW), (ty + OTY) * GW2 + OTX); return a; };
    const grid = big(W.grid, Uint8Array, T_.WATER), zone = big(W.zone, Uint8Array, Z.MARE), elev = big(W.elev, Float32Array, -2), bIndex = big(W.bIndex, Int16Array, -1);
    const roadW = big(W.roadW, Float32Array, 0), feat = big(W.feat, Uint16Array, 0), eco = big(W.eco, Uint8Array, 0), reach = big(W.reach, Uint8Array, 0);
    const bigV = src => { const a = new Float32Array(VW2 * (GH2 + 1)).fill(-2.2); for (let j = 0; j <= GH; j++) a.set(src.subarray(j * W.VW, j * W.VW + W.VW), (j + OTY) * VW2 + OTX); return a; };
    const vh = bigV(W.vh), velev = bigV(W.velev);
    // ---- lo spostamento di tutto quello che ha coordinate ----
    const seen = new Set(), sp = P => { if (!P || seen.has(P)) return; seen.add(P); P.forEach(q => { if (Array.isArray(q) && typeof q[0] === 'number') { q[0] += OX; q[1] += OY; } }); };
    const s1 = q => { if (q && !seen.has(q)) { seen.add(q); q[0] += OX; q[1] += OY; } };
    W.roads.forEach(rd => { sp(rd.pts); if (rd.rect) rd.rect = [rd.rect[0] + OTX, rd.rect[1] + OTY, rd.rect[2] + OTX, rd.rect[3] + OTY]; });
    W.lanes.forEach(l => sp(l.pts));
    (W.TUNNELS || []).forEach(t => sp(t.pts)); sp(W.RING);
    W.BUILDINGS.forEach(b => { b.x += OTX; b.y += OTY; if (b.cx !== undefined) { b.cx += OX; b.cy += OY; }   /* [pianta] il lotto orientato */ if (b.door && !seen.has(b.door)) { seen.add(b.door); b.door[0] += OTX; b.door[1] += OTY; } (b.tiers || []).forEach(t => { t.x += OTX; t.y += OTY; });
      const S = b.shopFront; if (S) [S.door].concat(S.span || []).forEach(q => { if (q && !seen.has(q)) { seen.add(q); q[0] += OTX; q[1] += OTY; } }); });   // [botteghe]
    Object.values(W.PLACES).forEach(p => { p.tx += OTX; p.ty += OTY; p.x += OX; p.y += OY; if (p.want) p.want = [p.want[0] + OX, p.want[1] + OY]; });
    if (W.FORT) { const F0 = W.FORT, sh = P => P.map(([x, y]) => [x + OX, y + OY]);   // [città2]
      W.FORT = { bastions: F0.bastions.map(sh), ravelin: F0.ravelin.map(sh), walls: F0.walls.map(sh), gates: F0.gates.map(g => Object.assign({}, g, { x: g.x + OX, y: g.y + OY })),
        ditch: [F0.ditch[0] + OX, F0.ditch[1] + OY, F0.ditch[2] + OX, F0.ditch[3] + OY], x: F0.x + OX, y: F0.y + OY, tip: F0.tip + OX }; }
    const WL0 = W.WALL; W.WALL = Object.assign({}, WL0, { x: WL0.x + OX, tx: WL0.tx + OTX, gate: [WL0.gate[0] + OY, WL0.gate[1] + OY], y0: WL0.y0 + OY, y1: WL0.y1 + OY, towers: WL0.towers.map(q => [q[0] + OX, q[1] + OY]) });
    W.CAVES = W.CAVES.map(c => Object.assign({}, c, { path: c.path.map(q => [q[0] + OX, q[1] + OY]), rooms: c.rooms.map(q => [q[0] + OX, q[1] + OY].concat(q.slice(2))) }));
    W.VILLAGES = W.VILLAGES.map(q => [q[0] + OX, q[1] + OY].concat(q.slice(2)));
    W.LAKE = Object.assign({}, W.LAKE, { x: W.LAKE.x + OX, y: W.LAKE.y + OY });
    W.HEAD = { x: HEAD.x + OX, y: HEAD.y + OY, r: HEAD.r }; W.TAV = Object.assign({}, TAV, { x: TAV.x + OX, y: TAV.y + OY }); W.POZZA = Object.assign({}, POZZA, { x: POZZA.x + OX, y: POZZA.y + OY });   /* [altopiano] */
    if (W.railCity) W.railCity = W.railCity.map(([x, y]) => [x + OX, y + OY]);
    if (W.pezzi) W.pezzi.forEach(p => { p.x += OX; p.y += OY; });   // [posa] i pezzi in coordinate finali
    if (W.glacis) { const Gq = W.glacis; Gq.x0 += OX; Gq.x1 += OX; Gq.riva += OX; Gq.vico += OY; if (Gq.rivaPts) Gq.rivaPts = Gq.rivaPts.map(q => [q[0] + OX, q[1] + OY]); Gq.piazza = Gq.piazza.map((v, k) => v + (k % 2 ? OY : OX)); }   // [pianta] le case del glacis sulla spianata
    if (W.recinto) { const R = W.recinto; ['xw', 'xe', 'gx', 'quay'].forEach(k => { R[k] += OX; }); ['yN', 'yP', 'yS', 'yDep', 'yCas'].forEach(k => { R[k] += OY; }); delete R.riva; }   // [cucitura] il Recinto del Garante (i suoi pezzi si spostano con W.pezzi)
    if (W.sets) W.sets = W.sets.map(q => { const o = Object.assign({}, q); ['x', 'x0', 'x1'].forEach(k => { if (o[k] !== undefined) o[k] += OX; }); ['y', 'y0', 'y1'].forEach(k => { if (o[k] !== undefined) o[k] += OY; }); return o; });   // [città2] le scenografie dei nodi   // [città2] la ferrovia dentro la città, sulla costa nord
    if (W.nodi) W.nodi = W.nodi.map(n => n.poly ? { nome: n.nome, poly: n.poly.map(([x, y]) => [x + OX, y + OY]) } : { nome: n.nome, x: n.x + OX, y: n.y + OY, r: n.r });   // [incroci] i nodi della rete
    W.GOV = { x0: GOV.x0 + OX, x1: GOV.x1 + OX, piazza: [GOV.piazza[0] + OX, GOV.piazza[1] + OY, GOV.piazza[2] + OX, GOV.piazza[3] + OY] };
    const S = W.SEA;
    S.structs.forEach(st => { sp(st.pts); sp(st.head); sp(st.rocks); });
    [S.moorings, S.fishing, S.swim, S.rocks, S.lights].forEach(L => L.forEach(q => { q.x += OX; q.y += OY; if (q.shore) q.shore = [q.shore[0] + OX, q.shore[1] + OY]; }));
    S.basins.forEach(B => { sp(B.poly); B.mouth = [B.mouth[0] + OX, B.mouth[1] + OY]; });
    Object.values(S.routes).forEach(sp);
    // ---- le funzioni della riva, nelle coordinate grandi (le isole ora ci sono) ----
    ISLES_ON = true;
    const d2x = x => x - OX, d2y = y => y - OY;
    Object.assign(W, rivaGrande(), {
      DXF: DXF + OX, DXC: DXC + OX, XF: XF + OX, XG: XG + OX, XC: XC + OX, XE: XE + OX, CX: CX + OX, CY: CY + OY, OX, OY,
      GW: GW2, GH: GH2, VW: VW2, SX: SX2, SY: SY2, SIZE: SX2, grid, zone, elev, bIndex, roadW, feat, eco, reach, vh, velev,
    });
    void d2x; void d2y;
    // ---- le isole sulla mappa grande ----
    const isl = new Uint8Array(N2);   // 1: casella di un'isola
    const RF = rivaFunzioni(W, grid, elev, vh, velev, isl), ix = RF.__ix, toD = RF.__toD;   // [cotto] le funzioni della mappa grande (le rifà anche il mondo cotto)
    const cellT = (tx, ty, C, p, sd) => { const x0 = tx * TS, y0 = ty * TS, ci = Math.floor((x0 + 1) / C), cj = Math.floor((y0 + 1) / C), px = (ci + .15 + .7 * hash2(ci, cj, 151 + sd)) * C, py = (cj + .15 + .7 * hash2(ci, cj, 152 + sd)) * C; return px >= x0 && px < x0 + TS && py >= y0 && py < y0 + TS && hash2(ci, cj, 153 + sd) < p; };
    ISOLE.forEach(I => {
      const RR = (I.arc ? I.R0 : I.R) + 4, tx0 = Math.max(1, Math.floor((I.x - RR + OX) / TS)), tx1 = Math.min(GW2 - 2, Math.ceil((I.x + RR + OX) / TS)), ty0 = Math.max(1, Math.floor((I.y - RR + OY) / TS)), ty1 = Math.min(GH2 - 2, Math.ceil((I.y + RR + OY) / TS));
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
        const [x, y] = toD(tx, ty), b = isleAt(x, y); if (!b || b.I !== I || b.q.d <= 0 || OnLand0(x, y)) continue;
        const i = ix(tx, ty), q = b.q, k = isleKind(I, q.a), beachK = k === 'spiaggia' || k === 'cala', wob = (fbm(x / 9, y / 9, 81, 2) - .5) * 2.4;
        isl[i] = 1; elev[i] = isleElev(I, q); feat[i] = 0; reach[i] = 0;
        const band = k === 'spiaggia' ? 9 + wob : k === 'cala' ? 6 + wob : k === 'falesia' ? 4 + wob * .6 : k === 'reef' ? 1.6 + wob * .4 : 4.2 + wob;
        const ecoV = (beachK && q.d < 22 + wob * 3) || I.veg === 'palmeto' ? ECO.PALMETO : I.veg === 'giungla' ? ECO.GIUNGLA : I.veg === 'nuda' ? ECO.NUDA : ECO.ISOLA;
        let v, z = Z.MACCHIA;
        if (q.d < band) { v = beachK ? T_.SAND : T_.ROCK; if (beachK) z = Z.SPIAGGIA; }
        else if (ecoV === ECO.GIUNGLA) v = cellT(tx, ty, 3.3, .97, 41) || cellT(tx, ty, 5, .8, 44) ? T_.TREE : hash2(tx, ty, 45) < .7 ? T_.SHRUB : T_.GRASS;          // la giungla: chiome che si toccano
        else if (ecoV === ECO.PALMETO) v = cellT(tx, ty, 5, .75, 33) ? T_.TREE : hash2(tx, ty, 34) < .3 ? T_.SHRUB : beachK && q.d < band + 6 ? T_.SAND : T_.GRASS;   // palme a gruppi
        else if (ecoV === ECO.NUDA) v = fbm(x / 6, y / 6, 143, 2) > .52 ? T_.ROCK : cellT(tx, ty, 13, .25, 37) ? T_.TREE : fbm(x / 7, y / 7, 144, 2) > .55 ? T_.SHRUB : T_.GRASS;   // calcare nudo: roccia, erba secca, qualche cespuglio e un albero storto
        else v = cellT(tx, ty, 7, .6, 36) ? T_.TREE : fbm(x / 9, y / 9, 142, 2) > .42 ? T_.SHRUB : T_.GRASS;                                                         // macchia, pini e lentischi
        if (beachK && q.d < band && ecoV === ECO.PALMETO && q.d > 4 && cellT(tx, ty, 5.5, .5, 35)) v = T_.TREE;   // qualche palma sulla sabbia
        grid[i] = v; zone[i] = z; eco[i] = ecoV; bIndex[i] = -1;
      }
    });
    // ---- la pendenza massima: un'isola si deve poter girare a piedi. Fra due caselle vicine al più SMAX metri di dislivello
    // (circa 22 gradi); si abbassa solo, partendo dalla riva, che resta com'è. Gli edifici, i moli e i pontili non si toccano.
    const SMAX = .8, SMAXD = SMAX * 1.414;
    const relaxS = () => { const fixed = i => grid[i] === T_.BLD || grid[i] === T_.QUAY || grid[i] === T_.PIER;
      const N8 = [[-1, 0, SMAX], [-1, -1, SMAXD], [0, -1, SMAX], [1, -1, SMAXD]];
      for (let it = 0; it < 12; it++) { let ch = 0;
        for (const dir of [1, -1]) for (let k = 0; k < N2; k++) { const i = dir > 0 ? k : N2 - 1 - k; if (!isl[i] || grid[i] === T_.WATER || fixed(i)) continue; const tx = i % GW2, ty = (i - tx) / GW2; if (tx < 1 || ty < 1 || tx >= GW2 - 1 || ty >= GH2 - 1) continue;
          let lim = 1e9; for (const [dx, dy, sm] of N8) { const j = i + dir * (dy * GW2 + dx); if (!isl[j] || grid[j] === T_.WATER) continue; lim = Math.min(lim, elev[j] + sm); }
          if (elev[i] > lim + 1e-3) { elev[i] = lim; ch++; } }
        if (!ch) break; } };
    relaxS();
    // ---- quello che c'è sulle isole: villaggi, baracche, basi della Tutela, la tribù; la torre e il relitto ----
    const B = W.BUILDINGS, PL = W.PLACES; S.camps = []; S.ruins = []; S.decor = [];
    const walkB = (tx, ty) => { if (tx < 0 || ty < 0 || tx >= GW2 || ty >= GH2) return false; const v = grid[ix(tx, ty)]; return v !== T_.BLD && v !== T_.WATER && v !== T_.FOUNT && v !== T_.TREE && v !== T_.CLIFF; };
    const PNb = (id, name, x, y, ex) => { let tx = Math.floor(x / TS), ty = Math.floor(y / TS), best = null;
      for (let rr = 0; rr < 16 && !best; rr++) for (let dy = -rr; dy <= rr && !best; dy++) for (let dx = -rr; dx <= rr; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === rr && walkB(tx + dx, ty + dy)) { best = [tx + dx, ty + dy]; break; }
      if (best) [tx, ty] = best; PL[id] = Object.assign({ id, name, tx, ty, x: tx * TS + TS / 2, y: ty * TS + TS / 2, want: [x, y], isola: true }, ex || {}); return PL[id]; };
    const paintB = (pts, w, tile, h) => { for (let k = 0; k < pts.length - 1; k++) { const [x0, y0] = pts[k], [x1, y1] = pts[k + 1], L = Math.hypot(x1 - x0, y1 - y0) || 1;
      for (let s0 = 0; s0 <= L + .01; s0 += .5) { const x = x0 + (x1 - x0) * s0 / L, y = y0 + (y1 - y0) * s0 / L; for (let o = -w / 2; o <= w / 2 + .01; o += .5) { const px = x + (y1 - y0) / L * o, py = y - (x1 - x0) / L * o, tx = Math.floor(px / TS), ty = Math.floor(py / TS); if (tx < 0 || ty < 0 || tx >= GW2 || ty >= GH2) continue;
        const i = ix(tx, ty); if (tile === T_.DIRT) { if (grid[i] === T_.WATER || grid[i] === T_.BLD || grid[i] === T_.CLIFF || grid[i] === T_.SAND) continue; grid[i] = T_.DIRT; continue; }
        if (grid[i] !== T_.WATER && grid[i] !== T_.SAND && grid[i] !== T_.ROCK && !(tile === T_.QUAY && grid[i] === T_.PIER)) continue; grid[i] = tile; elev[i] = h; isl[i] = 1; zone[i] = tile === T_.QUAY ? Z.CITTA : zone[i]; } } } };
    const pontileB = (id, name, pts, w, h, head) => { paintB(pts, w, T_.PIER, h); if (head) paintB(head, w, T_.PIER, h); const st = { type: 'pontile', id, name, pts, w, h, head: head || null, isola: true }; S.structs.push(st); return st; };
    // il punto di riva di un'isola in una direzione (angolo nel sistema dell'isola; nei boomerang ±π/2 = dentro/fuori), coordinate grandi
    const shoreB = (I, a, inset) => { let cx, cy, dx, dy;
      if (I.arc) { cx = I.x + Math.cos(I.rot) * I.Rb; cy = I.y + Math.sin(I.rot) * I.Rb; const sg = a > 0 ? -1 : 1; dx = Math.cos(I.rot) * sg; dy = Math.sin(I.rot) * sg; }
      else { cx = I.x; cy = I.y; const lx = Math.cos(a) * I.rx, ly = Math.sin(a) * I.ry, L = Math.hypot(lx, ly); dx = (lx * I.c - ly * I.s) / L; dy = (lx * I.s + ly * I.c) / L; }
      let t = 0; while (t < 400) { const q = isleQ(I, cx + dx * t, cy + dy * t); if (!q || q.d <= 0) break; t += .5; }
      t = Math.max(0, t - (inset || 0)); return { x: cx + dx * t + OX, y: cy + dy * t + OY, dx, dy, cx: cx + OX, cy: cy + OY }; };
    const clearB = (cx, cy, r, tile, flat) => { const hc = elev[ix(Math.floor(cx / TS), Math.floor(cy / TS))];
      for (let ty = Math.floor((cy - r) / TS); ty <= Math.ceil((cy + r) / TS); ty++) for (let tx = Math.floor((cx - r) / TS); tx <= Math.ceil((cx + r) / TS); tx++) { if (tx < 0 || ty < 0 || tx >= GW2 || ty >= GH2) continue; const i = ix(tx, ty); if (!isl[i] || grid[i] === T_.WATER || grid[i] === T_.PIER) continue;
        const d = Math.hypot(tx * TS + 1 - cx, ty * TS + 1 - cy), wob = (fbm(tx / 4, ty / 4, 650, 2) - .5) * 4; if (d > r + wob) continue;
        if (grid[i] === T_.TREE || grid[i] === T_.SHRUB || grid[i] === T_.GRASS || grid[i] === T_.ROCK || grid[i] === T_.CLIFF || grid[i] === T_.SAND) grid[i] = tile;
        if (flat) { const k = 1 - sstep(r * .65, r, d); elev[i] += (hc - elev[i]) * k; } } };
    const SHSTY = [3, 4, 5, 7, 8, 11, 14, 19];
    const stampB = b => { let hmin = 1e9; for (let ty = b.y; ty < b.y + b.h; ty++) for (let tx = b.x; tx < b.x + b.w; tx++) { const i = ix(tx, ty); if (!isl[i] || grid[i] === T_.WATER || grid[i] === T_.BLD || grid[i] === T_.PIER) return null; hmin = Math.min(hmin, elev[i]); }
      const k = B.length; b.i = k; b.base = Math.max(.3, hmin); b.isola = true; B.push(b);
      for (let ty = b.y; ty < b.y + b.h; ty++) for (let tx = b.x; tx < b.x + b.w; tx++) { const i = ix(tx, ty); grid[i] = T_.BLD; bIndex[i] = k; elev[i] = b.base; }
      let best = null, bd = 1e9; const [fx, fy] = b.face;
      for (let ty = b.y - 1; ty <= b.y + b.h; ty++) for (let tx = b.x - 1; tx <= b.x + b.w; tx++) { const edge = tx === b.x - 1 || tx === b.x + b.w || ty === b.y - 1 || ty === b.y + b.h, corner = (tx === b.x - 1 || tx === b.x + b.w) && (ty === b.y - 1 || ty === b.y + b.h);
        if (!edge || corner || !walkB(tx, ty)) continue; const sc = Math.hypot(tx * TS - fx, ty * TS - fy); if (sc < bd) { bd = sc; best = [tx, ty]; } }
      b.door = best; delete b.face; return b; };
    const place1 = (I, id, name, x, y, ex) => PNb(id, name, x, y, Object.assign({ scoperta: true }, ex || {}));
    const ring = (cx, cy, n, r0, f) => { for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + hash2(k, n, 661) * .4; f(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, a, k); } };
    const BOATL = { gozzo: 5, lancia: 6, secca: 4.6, motovedetta: 13 };
    ISOLE.forEach(I => {
      const beachA = (I.kinds.find(q => q[2] === 'spiaggia' || q[2] === 'cala') || [I.arc ? Math.PI / 2 : 0])[0];
      if (I.use === 'villaggio' || I.use === 'baracche') {
        const bp = shoreB(I, beachA, 1), vc = [bp.x - bp.dx * (I.use === 'villaggio' ? 17 : 10), bp.y - bp.dy * (I.use === 'villaggio' ? 17 : 10)];
        clearB(vc[0], vc[1], I.use === 'villaggio' ? 15 : 9, T_.GRASS, true);
        if (I.use === 'villaggio') clearB(vc[0], vc[1], 8, T_.DIRT, false);   // la terra battuta in mezzo alle capanne
        let nb = 0; ring(vc[0], vc[1], I.use === 'villaggio' ? 8 : 4, I.use === 'villaggio' ? 10 : 6, (x, y, a, k) => { const w = 2 + (k % 2), h = 2; if (stampB({ id: 'capanno_' + I.id + '_' + k, x: Math.floor(x / TS - w / 2), y: Math.floor(y / TS - h / 2), w, h, fl: 1, style: SHSTY[(k * 3 + I.seed) % SHSTY.length], house: true, shack: true, use: 'capanno', label: I.use === 'villaggio' ? 'Capanno dei pescatori' : 'Baracca abbandonata', face: vc })) nb++; });
        const pid = (I.use === 'villaggio' ? 'villaggio_' : 'baracche_') + I.id, pname = I.use === 'villaggio' ? 'Villaggio ' + I.name.replace(/^Isola (dei |di )?/, (m) => m.replace('Isola ', '')) : 'Baracche dell\'' + I.name.replace(/^Isola /, 'isola ');
        place1(I, pid, pname, vc[0], vc[1]);
        // il pontile in fondo alla spiaggia, le barche
        const pe = [bp.x + bp.dx * 16, bp.y + bp.dy * 16], px0 = [bp.x - bp.dx * 3, bp.y - bp.dy * 3], hd = [[pe[0] - bp.dy * 4, pe[1] + bp.dx * 4], [pe[0] + bp.dy * 4, pe[1] - bp.dx * 4]];
        const stp = pontileB('pontile_' + I.id, I.use === 'villaggio' ? 'Pontile del villaggio' : 'Vecchio approdo', [px0, pe], 1.8, .7, I.use === 'villaggio' ? hd : null); if (I.use !== 'villaggio') stp.old = true;
        if (I.use === 'villaggio') { [-1, 1].forEach(sg => { const mx = bp.x + bp.dx * 9 - bp.dy * sg * 4.4, my = bp.y + bp.dy * 9 + bp.dx * sg * 4.4; S.moorings.push({ kind: 'gozzo', x: mx, y: my, ang: Math.atan2(bp.dx * sg * 1, -bp.dy * sg * 1), len: BOATL.gozzo, at: stp.id, drive: true }); });
          for (let k = 0; k < 3; k++) { const o = (k - 1) * 5 + 8, x = bp.x - bp.dx * 3 - bp.dy * o, y = bp.y - bp.dy * 3 + bp.dx * o; if (grid[ix(Math.floor(x / TS), Math.floor(y / TS))] === T_.SAND) S.moorings.push({ kind: 'secca', x, y, ang: Math.atan2(-bp.dy, -bp.dx) + (k - 1) * .2, len: BOATL.secca, at: I.id }); }
          S.camps.push({ type: 'villaggio', id: I.id, name: pname, x: vc[0], y: vc[1], r: 16, place: pid, faction: null, n: 4, bp: [bp.x, bp.y, bp.dx, bp.dy] }); }
        else S.decor.push({ type: 'baracche', id: I.id, x: vc[0], y: vc[1], r: 9, bp: [bp.x, bp.y, bp.dx, bp.dy] });
      }
      if (I.use === 'base') {
        const lp = shoreB(I, beachA, 1), bc = [I.x + (I.top ? I.top[0] * I.rx * .4 : 0) + OX, I.y + (I.top ? I.top[1] * I.ry * .4 : 0) + OY], R0 = Math.min(I.rx, I.ry) * .78;
        clearB(bc[0], bc[1], R0, T_.DIRT, true); clearB(bc[0], bc[1], R0 * .45, T_.PIAZZA, true);
        paintB([[lp.x - lp.dx * 2, lp.y - lp.dy * 2], [bc[0], bc[1]]], 3, T_.DIRT);                                         // la strada sterrata dal molo alla base
        const me = [lp.x + lp.dx * 18, lp.y + lp.dy * 18]; paintB([[lp.x - lp.dx * 3, lp.y - lp.dy * 3], me], 4, T_.QUAY, 1.1);
        const st = { type: 'molo', id: 'molo_' + I.id, name: 'Molo militare', pts: [[lp.x - lp.dx * 3, lp.y - lp.dy * 3], me], w: 4, h: 1.1, sea: 0, rocks: null, light: 'rosso', isola: true }; S.structs.push(st); S.lights.push({ x: me[0], y: me[1], col: 'rosso', h: 1.1 });
        S.moorings.push({ kind: 'motovedetta', x: (lp.x + me[0]) / 2 - lp.dy * 4.6, y: (lp.y + me[1]) / 2 + lp.dx * 4.6, ang: Math.atan2(lp.dy, lp.dx), len: BOATL.motovedetta, at: st.id });
        const sub = I.id === 'presidio' ? 'presidio' : I.id === 'cannoni' ? 'batteria' : 'radar', nm = { presidio: 'Presidio della Tutela', batteria: 'Batteria dei Cannoni', radar: 'Stazione radar dell\'Isola Rossa' }[sub];
        const bt = [[6, 3, 'caserma', 'Caserma della Tutela'], [4, 3, 'deposito', 'Deposito della Tutela'], [4, 2, 'baracca', 'Baracca della Tutela']];
        bt.forEach(([w, h, u, lab], k) => { const a = k * 2.1 + 1, x = bc[0] + Math.cos(a) * R0 * .62, y = bc[1] + Math.sin(a) * R0 * .62; stampB({ id: 'base_' + I.id + '_' + k, x: Math.floor(x / TS - w / 2), y: Math.floor(y / TS - h / 2), w, h, fl: 1, style: 10, military: true, barrack: u !== 'deposito', warehouse: u === 'deposito', use: 'base_isola', label: lab, face: bc }); });
        const pid = 'base_' + I.id; place1(I, pid, nm, bc[0], bc[1], { base: true }); PNb('molo_' + I.id, 'Molo militare dell\'' + I.name.replace(/^Isola /, 'isola '), me[0] - lp.dx * 2, me[1] - lp.dy * 2);
        S.camps.push({ type: 'base', sub, id: I.id, name: nm, x: bc[0], y: bc[1], r: R0, place: pid, faction: 'isola:' + I.id, n: sub === 'presidio' ? 6 : 4, gate: [lp.x, lp.y], bp: [lp.x, lp.y, lp.dx, lp.dy] });
      }
      if (I.use === 'tribu') {
        const bp = shoreB(I, beachA, 1), vc = [bp.x - bp.dx * 46, bp.y - bp.dy * 46], R0 = 21;
        clearB(vc[0], vc[1], R0 + 3, T_.DIRT, true);
        paintB([[bp.x - bp.dx * 2, bp.y - bp.dy * 2], [vc[0] + bp.dx * R0, vc[1] + bp.dy * R0]], 2.5, T_.DIRT);              // il sentiero dalla spiaggia
        const gateA = Math.atan2(bp.dy, bp.dx), huts = [];
        ring(vc[0], vc[1], 9, 13, (x, y, a, k) => { if (Math.abs(Math.atan2(Math.sin(a - gateA), Math.cos(a - gateA))) < .45) return; const r0 = k % 3 === 0 ? 3 : 2.3; huts.push({ x, y, r: r0, ang: a + Math.PI });
          for (let ty = Math.floor((y - r0) / TS); ty <= Math.floor((y + r0) / TS); ty++) for (let tx = Math.floor((x - r0) / TS); tx <= Math.floor((x + r0) / TS); tx++) if (Math.hypot(tx * TS + 1 - x, ty * TS + 1 - y) < r0) grid[ix(tx, ty)] = T_.CLIFF; });   // la capanna non si attraversa
        huts.push({ x: vc[0] - bp.dx * 4, y: vc[1] - bp.dy * 4, r: 4, ang: gateA, big: true }); { const x = vc[0] - bp.dx * 4, y = vc[1] - bp.dy * 4; for (let ty = Math.floor((y - 4) / TS); ty <= Math.floor((y + 4) / TS); ty++) for (let tx = Math.floor((x - 4) / TS); tx <= Math.floor((x + 4) / TS); tx++) if (Math.hypot(tx * TS + 1 - x, ty * TS + 1 - y) < 3.6) grid[ix(tx, ty)] = T_.CLIFF; }   // la casa grande in fondo
        PNb('villaggio_tribu', 'Il villaggio della tribù', vc[0] + bp.dx * 5, vc[1] + bp.dy * 5, { scoperta: true, hidden: true }); PNb('spiaggia_tribu', 'La spiaggia della tribù', bp.x - bp.dx * 4, bp.y - bp.dy * 4, { scoperta: true });
        S.camps.push({ type: 'tribu', id: I.id, name: 'La tribù dell\'Isola Grande del Sud', x: vc[0], y: vc[1], r: R0, place: 'villaggio_tribu', faction: 'isola:tribu', n: 9, huts, gate: [vc[0] + bp.dx * R0, vc[1] + bp.dy * R0], gateA, bp: [bp.x, bp.y, bp.dx, bp.dy] });
      }
      // i nomi delle isole (le grandi): la prima volta che ci arrivi
      if (!I.small && I.id !== 'fratello2' && !PL['isola_' + I.id]) { const tp = I.arc ? [I.x + Math.cos(I.rot) * I.Rb + OX, I.y + Math.sin(I.rot) * I.Rb + OY] : [I.x + (I.top ? I.top[0] * I.rx * .5 : 0) + OX, I.y + (I.top ? I.top[1] * I.ry * .5 : 0) + OY]; place1(I, 'isola_' + I.id, I.name, tp[0], tp[1]); }
    });
    // gli archi di roccia, le grotte marine, le colonie di uccelli (la grafica li disegna; i piedi dell'arco sono scoglio vero)
    S.features = [];
    const diN = n => { const m = n.match(/^(il |lo |la |l'|i |gli |le )(.*)$/i); if (m) return ({ 'il ': 'del ', 'lo ': 'dello ', 'la ': 'della ', "l'": "dell'", 'i ': 'dei ', 'gli ': 'degli ', 'le ': 'delle ' })[m[1].toLowerCase()] + m[2]; return /^[AEIOU]/.test(n) ? "dell'" + n : 'di ' + n; };
    ISOLE.forEach((I, n) => {
      const hr = k => hash2(n, k, 707);
      if (I.arco) { const a = hr(1) * 6.283, sp0 = shoreB(I, a), w = 7 + hr(2) * 5, ox = -sp0.dy, oy = sp0.dx, cx = sp0.x + sp0.dx * (w * .5 + 2), cy = sp0.y + sp0.dy * (w * .5 + 2);
        const feet = [[cx + ox * w / 2, cy + oy * w / 2], [cx - ox * w / 2, cy - oy * w / 2]];
        feet.forEach(([fx, fy]) => { for (let ty = Math.floor((fy - 2.4) / TS); ty <= Math.floor((fy + 2.4) / TS); ty++) for (let tx = Math.floor((fx - 2.4) / TS); tx <= Math.floor((fx + 2.4) / TS); tx++) { if (tx < 0 || ty < 0 || tx >= GW2 || ty >= GH2) continue; const i = ix(tx, ty); if (Math.hypot(tx * TS + 1 - fx, ty * TS + 1 - fy) < 2.3 && grid[i] === T_.WATER) { grid[i] = T_.ROCK; elev[i] = 1.2; zone[i] = Z.SPIAGGIA; isl[i] = 1; } } });
        S.features.push({ type: 'arco', id: 'arco_' + I.id, x: cx, y: cy, ang: Math.atan2(sp0.dy, sp0.dx), w, h: 6 + hr(3) * 4, feet }); if (!I.small) PNb('arco_' + I.id, 'L\'arco ' + diN(I.name), cx, cy, { scoperta: true }); }
      if (I.grotta) { for (let t = 0; t < 12; t++) { const a = hr(10 + t) * 6.283, k = isleKind(I, a); if (k !== 'reef' && k !== 'falesia') continue; const sp0 = shoreB(I, a, .5); S.features.push({ type: 'grotta', id: 'grotta_' + I.id, x: sp0.x, y: sp0.y, ang: Math.atan2(sp0.dy, sp0.dx), w: 3 + hr(30) * 3 }); break; } }
      if (I.tema === 'uccelli') S.features.push({ type: 'colonia', id: 'colonia_' + I.id, x: I.x + OX, y: I.y + OY, r: Math.max(I.rx, I.ry) });
    });
    // la torre saracena sull'Isolotto della Torre, il relitto del Santa Rosalia sulla secca dell'Isola del Relitto
    if (ISOLE.some(I => I.id === 'torre')) { const IT = ISOLE.find(I => I.id === 'torre'), x = IT.x + IT.top[0] * IT.rx + OX, y = IT.y + IT.top[1] * IT.ry + OY; S.ruins.push({ type: 'torre', id: 'torre_saracena', name: 'Torre saracena', x, y, r: 3.4 });
      for (let ty = Math.floor((y - 3.4) / TS); ty <= Math.floor((y + 3.4) / TS); ty++) for (let tx = Math.floor((x - 3.4) / TS); tx <= Math.floor((x + 3.4) / TS); tx++) if (Math.hypot(tx * TS + 1 - x, ty * TS + 1 - y) < 3.2) grid[ix(tx, ty)] = T_.CLIFF;
      place1(IT, 'torre_saracena', 'Torre saracena', x + 4.5, y + 1); }
    if (ISOLE.some(I => I.id === 'relitto')) { const IR = ISOLE.find(I => I.id === 'relitto'), sp0 = shoreB(IR, Math.PI + .15); S.ruins.push({ type: 'relitto', id: 'relitto', name: 'Il relitto del Santa Rosalia', x: sp0.x - 7, y: sp0.y + 2, ang: -.5 }); place1(IR, 'relitto', 'Il relitto del Santa Rosalia', sp0.x - 1, sp0.y); }
    // si pesca dagli scogli delle isole, si fa il bagno sulle loro spiagge
    ISOLE.forEach((I, n) => { if (I.arc || I.small || (I.dome && !I.use && Math.max(I.rx, I.ry) < 30)) return; let m = 0; const mx = I.use || !I.dome ? 2 : 1; /* solo le isole vere: niente pescate su ogni scoglio */ for (let k = 0; k < 16 && m < mx; k++) { const a = -Math.PI + k / 16 * Math.PI * 2 + n * .3, kd = isleKind(I, a); if (kd !== 'scogli' && kd !== 'falesia' && kd !== 'reef') continue;
      const sp0 = shoreB(I, a, 1.2); if (!walkB(Math.floor(sp0.x / TS), Math.floor(sp0.y / TS)) && !walkB(Math.floor((sp0.x - sp0.dx) / TS), Math.floor((sp0.y - sp0.dy) / TS))) continue;
      const id = 'scogli_isola_' + I.id + (m ? '_2' : ''), nm = /^(Scoglio|I Due|La |Il |L'|Lo )/.test(I.name) || I.small ? 'Scogli: ' + I.name : 'Scogli ' + I.name.replace(/^Isolotto /, "dell'isolotto ").replace(/^Isola /, "dell'isola ");
      S.fishing.push({ id, name: nm, x: sp0.x, y: sp0.y, ang: Math.atan2(sp0.dy, sp0.dx), kind: 'scogli', isola: true }); PNb(id, nm, sp0.x, sp0.y, { pesca: true }); m++; k += 4; } });
    S.structs.filter(q => q.isola && q.type === 'pontile').forEach(q => { const e = q.head ? q.head[1] : q.pts[1]; S.fishing.push({ id: 'pesca_' + q.id, name: 'In fondo al ' + q.name, x: e[0], y: e[1], kind: 'pontile', isola: true }); PNb('pesca_' + q.id, 'In fondo al ' + q.name, e[0], e[1], { pesca: true }); });
    const Iid = id => ISOLE.find(I => I.id === id);
    [['Spiaggia delle Palme', 'palme', Math.PI / 2], ['Spiaggia delle Palme', 'palme', Math.PI / 2 + .45], ['Laguna dell\'Isola Lunga', 'lunga', -Math.PI / 2], ['Cala del Relitto', 'relitto', Math.PI], ['Spiaggia di Santa Lucia', 'santa_lucia', 0], ['Spiaggia dei Pescatori Lontani', 'lontani', Math.PI],
      ['Laguna della Mezzaluna', 'mezzaluna', Math.PI / 2], ['Laguna del Gomito', 'gomito', Math.PI / 2], ['Spiaggia della Lama', 'lama', -Math.PI / 2], ['Spiaggia della tribù', 'grande_sud', Math.PI / 2 + .25]].forEach(([name, id, a], k) => {
      const I = Iid(id); if (!I) return; const sp0 = shoreB(I, a); S.swim.push({ id: 'bagno_isola_' + k, name, x: sp0.x + sp0.dx * 10, y: sp0.y + sp0.dy * 10, shore: [sp0.x - sp0.dx * 3, sp0.y - sp0.dy * 3], r: 14, isola: true }); PNb('bagno_isola_' + k, name, sp0.x - sp0.dx * 3, sp0.y - sp0.dy * 3, { bagno: true }); });
    // i fianchi a picco: dove la quota cade di colpo fra due caselle dell'isola, parete di roccia
    relaxS();   // dopo le radure spianate e gli edifici: ancora niente gradini
    for (let ty = 1; ty < GH2 - 1; ty++) for (let tx = 1; tx < GW2 - 1; tx++) { const i = ix(tx, ty); if (!isl[i] || grid[i] === T_.SAND || grid[i] === T_.BLD) continue; let drop = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = i + dy * GW2 + dx; if (!isl[n]) continue; drop = Math.max(drop, elev[i] - elev[n]); } if (drop > (eco[i] === ECO.GIUNGLA ? 4.2 : 2.6)) grid[i] = T_.CLIFF; }   // sulle cupole la giungla tiene anche il ripido
    // le quote ai vertici attorno alle isole (come nella generazione: sulla riva il terreno scende sotto l'acqua)
    const vfix = RF.__vfix;
    ISOLE.forEach(I => { const RR = (I.arc ? I.R0 : I.R) + 6; vfix(Math.floor((I.x - RR + OX) / TS), Math.floor((I.y - RR + OY) / TS), Math.ceil((I.x + RR + OX) / TS), Math.ceil((I.y + RR + OY) / TS)); });
    // ---- il fondale di tutto il mare (stesse regole di generate, più il «reef»: un anello di sabbia bassa e turchese largo
    //      qualche metro attorno alle cupole, poi il fianco scende a picco nel blu dei canali) ----
    const isSea = i => grid[i] === T_.WATER && zone[i] === Z.MARE;
    const dq = new Float32Array(N2).fill(1e9), src = new Int32Array(N2).fill(-1);
    for (let i = 0; i < N2; i++) if (!isSea(i)) { dq[i] = 0; src[i] = i; }
    const relax = (i, j, w) => { if (dq[j] + w < dq[i]) { dq[i] = dq[j] + w; src[i] = src[j]; } };
    for (let ty = 0; ty < GH2; ty++) for (let tx = 0; tx < GW2; tx++) { const i = ty * GW2 + tx; if (!dq[i]) continue; if (tx > 0) relax(i, i - 1, 2); if (ty > 0) { relax(i, i - GW2, 2); if (tx > 0) relax(i, i - GW2 - 1, 2.83); if (tx < GW2 - 1) relax(i, i - GW2 + 1, 2.83); } }
    for (let ty = GH2 - 1; ty >= 0; ty--) for (let tx = GW2 - 1; tx >= 0; tx--) { const i = ty * GW2 + tx; if (!dq[i]) continue; if (tx < GW2 - 1) relax(i, i + 1, 2); if (ty < GH2 - 1) { relax(i, i + GW2, 2); if (tx < GW2 - 1) relax(i, i + GW2 + 1, 2.83); if (tx > 0) relax(i, i + GW2 - 1, 2.83); } }
    const KC = new Map(), kindAt = j => { let k = KC.get(j); if (k) return k; const v = grid[j], [x, y] = toD(j % GW2, (j / GW2) | 0); k = v === T_.QUAY || v === T_.PIER ? 'porto' : zone[j] === Z.CITTA && v === T_.ROCK ? 'falesia' : coastKind(x, y); KC.set(j, k); return k; };
    const SLOPE = { spiaggia: [.3, .055], cala: [.4, .08], scogli: [.9, .2], falesia: [2.6, .42], porto: [3.6, .1] };
    const inPolyB = (x, y, P) => { let c = false; for (let a = 0, b = P.length - 1; a < P.length; b = a++) { if ((P[a][1] > y) !== (P[b][1] > y) && x < (P[b][0] - P[a][0]) * (y - P[a][1]) / (P[b][1] - P[a][1]) + P[a][0]) c = !c; } return c; };
    const depth = new Float32Array(N2), bottom = new Uint8Array(N2);
    for (let i = 0; i < N2; i++) {
      if (!isSea(i)) continue; const d = dq[i] - 1, k = src[i] >= 0 ? kindAt(src[i]) : 'falesia', x = (i % GW2) * TS + 1, y = ((i / GW2) | 0) * TS + 1;
      let h;
      if (k === 'reef') h = d < 6 ? .35 + Math.max(0, d) * .13 : Math.min(16, 1.13 + (d - 6) * .85);
      else { const [a, s0] = SLOPE[k] || SLOPE.scogli; h = Math.min(a + Math.max(0, d) * s0, 16); }
      h += Math.max(0, d - 60) * .15 + Math.max(0, d - (isl[src[i]] ? 16 : 42)) * .4;   // oltre la fascia di riva il fondo scende: niente ventagli di acqua bassa
      for (const B of S.basins) { if (inPolyB(x, y, B.poly)) h = B.depth; else if (Math.hypot(x - B.mouth[0], y - B.mouth[1]) < 40) h = Math.max(h, B.depth + 1); }
      for (const L of LAGUNE) { const dx = x - OX - L.x, dy = y - OY - L.y, u = dx * Math.cos(L.rot) + dy * Math.sin(L.rot), v = -dx * Math.sin(L.rot) + dy * Math.cos(L.rot), q = Math.hypot(u / L.rx, v / L.ry); if (q < 1.25) h = Math.min(h, L.d * (.45 + .55 * Math.min(1, q)) + (fbm(x / 9, y / 9, 630, 2) - .5) * .5 + Math.max(0, q - 1) * 8); }
      depth[i] = Math.min(40, Math.max(.25, h));
      const rockK = k === 'falesia' ? 26 : k === 'scogli' ? 14 : grid[src[i]] === T_.ROCK && k !== 'reef' ? 7 : 0;
      if (k === 'reef' && d < 6) bottom[i] = 0;
      else if (d < rockK * (.6 + fbm(x / 14, y / 14, 521, 2) * .8)) bottom[i] = 1;
      else if (depth[i] > 2.2 && depth[i] < 16 && fbm(x / 30, y / 30, 522, 3) > .5 - Math.min(.12, (depth[i] - 2.2) * .03)) bottom[i] = 2;
      if (S.basins.some(B => inPolyB(x, y, B.poly)) || (k === 'porto' && d < 30)) bottom[i] = 3;
    }
    for (let it = 0; it < 5; it++) { const D0 = depth.slice(); for (let ty = 1; ty < GH2 - 1; ty++) for (let tx = 1; tx < GW2 - 1; tx++) { const i = ty * GW2 + tx; if (!isSea(i)) continue; let s2 = 0, c = 0; for (let b2 = -1; b2 <= 1; b2++) for (let a = -1; a <= 1; a++) { const j = i + b2 * GW2 + a; if (isSea(j)) { s2 += D0[j]; c++; } } depth[i] = s2 / c; } }
    for (let i = 0; i < N2; i++) if (grid[i] === T_.PIER) { let s2 = 0, c = 0; for (let b2 = -2; b2 <= 2; b2++) for (let a = -2; a <= 2; a++) { const j = i + b2 * GW2 + a; if (j >= 0 && j < N2 && isSea(j)) { s2 += depth[j]; c++; } } depth[i] = c ? s2 / c : 1.5; }
    for (let i = 0; i < N2; i++) if (bottom[i] === 2 && depth[i] < 2.4) bottom[i] = 0;
    S.depth = depth; S.bottom = bottom;
    // scogli che affiorano lungo le coste di roccia (non attorno alle cupole: lì c'è la scogliera liscia)
    S.rocks = S.rocks.filter(q => q.big);
    for (let ty = 2; ty < GH2 - 2; ty++) for (let tx = 2; tx < GW2 - 2; tx++) { const i = ty * GW2 + tx; if (!isSea(i) || dq[i] > 8) continue; const k = kindAt(src[i]); if (k !== 'scogli' && k !== 'falesia') continue;
      const h1 = hash2(tx - OTX, ty - OTY, 515); if (h1 > (k === 'falesia' ? .2 : .13)) continue; S.rocks.push({ x: tx * TS + .4 + hash2(tx, ty, 516) * 1.2, y: ty * TS + .4 + hash2(tx, ty, 517) * 1.2, r: .5 + hash2(tx, ty, 518) * (k === 'falesia' ? 1.6 : 1), big: false }); }
    // il giro al largo: dove passa su un'isola, si sposta fuori
    const outIsle = q => { for (let it = 0; it < 40; it++) { const b = isleAt(q[0] - OX, q[1] - OY); if (!b || b.q.d < -16) return; q[0] += (q[0] - OX - b.I.x) * .06; q[1] += (q[1] - OY - b.I.y) * .06; } };
    (S.routes.giro || []).forEach(outIsle);
    S.routes.pesca = [[1020, 228], [1053, 233], [1062, 258], [1046, 292], [1022, 340], [985, 420], [930, 452], [860, 440]].map(([x, y]) => [x + OX, y + OY]); S.routes.pesca.forEach(outIsle);
    W.__isl = isl; W.__vfix = vfix; W.__ix = ix; W.__toD = toD;
    // [costa2] LA CITTÀ SOTT'ACQUA: la causa e il rimedio. Il mare è un piano a −0,45 m. La grafica ammorbidiva la riva abbassando il
    // terreno verso −1,6 m in tutta la fascia entro 4 m dalla riva «analitica» (W.inland), senza guardare cosa c'era sopra: le
    // baracche fra binari e mare, il piede delle mura, il bordo della spianata sul canale, la marina fra i moli stavano in quella fascia
    // (o oltre la riva analitica, sulla terra fatta dalla città) e affondavano: case, piazze e vicoli col mare sopra. In più alcune quote
    // ai vertici della città sul canale scendevano sotto il pelo dell'acqua già qui.
    // Ora (1) nessun vertice che tocca una casella costruita o calpestabile della città sta sotto WL_SECCO, (2) la riva si ammorbidisce
    // solo dove attorno c'è terra naturale, (3) la quota che si vede la calcola questa funzione sola (render.js e test_costa2.js).
    const WL_SECCO = RF.WL_SECCO, FATTO = RF.FATTO, fatto = RF.fatto;
    for (let j = 0; j <= GH2; j++) for (let i = 0; i <= GW2; i++) { const k = j * VW2 + i; if (vh[k] < WL_SECCO && fatto(i, j)) vh[k] = WL_SECCO; }
    for (let ty = 0; ty < GH2; ty++) for (let tx = 0; tx < GW2; tx++) { const i = ty * GW2 + tx; if (FATTO.has(grid[i])) { const k = ty * VW2 + tx; elev[i] = Math.max(elev[i], (vh[k] + vh[k + 1] + vh[k + VW2] + vh[k + VW2 + 1]) / 4); } }
    W.WL = -.45; W.WL_SECCO = WL_SECCO;
    W.quotaRiva = RF.quotaRiva;
    // [pianta] la scatola di ogni casa nel suo riferimento: chi non l'ha già (un lotto orientato) prende quella della sua pianta a caselle
    W.BUILDINGS.forEach(b => { if (b.cx === undefined) { b.cx = (b.x + b.w / 2) * TS; b.cy = (b.y + b.h / 2) * TS; } if (b.lw === undefined) { b.lw = b.w * TS; b.ld = b.h * TS; } });
    if (W.sets) W.luoghi = luoghi(W);
    { const O = opere(W.pezzi, W.sets); W.pedonali = O.pedonali; W.barriere = O.barriere; W.passaggi = O.scale; }   // [pedonale] le opere pedonali, le barriere e le scale in coordinate finali
    return W;
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

  // [costa2] L'ARREDO DELLA RIVA, come dati (coordinate finali): la grafica lo costruisce in render.js (sezione [costa2]) con le istanze
  // per settore, la prova lo controlla (test_costa2.js). Niente a caso: ogni cosa sta su una casella giusta per lei e lontano dalle strade.
  //  piante: canna (il canneto), fico (fico d'india), agave, giglio (giglio di mare sulla duna)
  //  rocce: lastra (la lastra di calcare sulla riva), masso, pozza (la pozza di scogliera)
  //  tetrapodi: la scogliera artificiale del frangiflutti e il piede del Molo Vecchio verso il largo
  //  passerelle: le passerelle di tavole sulle dune, dalla costiera alla spiaggia, con la staccionata di pali e corda
  //  piazzole, muretti, scale: la strada sul mare (la piazzola di sosta, il muretto basso sul ciglio, la scaletta verso la riva)
  function costa2Arredo(W) {
    const g = W.grid, GWx = W.GW, GHx = W.GH, E = ECO, A = { piante: [], rocce: [], tetrapodi: [], passerelle: [], piazzole: [], muretti: [], scale: [] };
    const at = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return tx < 0 || ty < 0 || tx >= GWx || ty >= GHx ? -1 : ty * GWx + tx; };
    const isSea = i => i < 0 || (g[i] === T.WATER && W.zone[i] === Z.MARE);
    const strada = i => g[i] === T.VIA || W.roadW[i] > 0;
    const libero = (x, y, r) => { for (const [a, b] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) { const i = at(x + a, y + b); if (i < 0 || isSea(i) || strada(i) || g[i] === T.WATER || g[i] === T.BLD || g[i] === T.QUAY || g[i] === T.PIER || g[i] === T.FOUNT || g[i] === T.STAIRS || g[i] === T.TREE) return false; } return true; };
    const isl = W.__isl, X1 = C2X1 + OX + 300;
    for (let ty = 2; ty < GHx - 2; ty++) for (let tx = 2; tx < GWx - 2; tx++) {
      const i = ty * GWx + tx, x0 = tx * TS, y0 = ty * TS, v = g[i]; if (x0 > X1 || (isl && isl[i]) || isSea(i) || v === T.WATER) continue;
      const e = W.eco[i], h = (s) => hash2(tx, ty, 900 + s);
      if (e === E.CANNETO && (v === T.GRASS || v === T.SHRUB || v === T.SAND || v === T.GRAVEL)) { const n = 2 + Math.floor(h(1) * 3); for (let k = 0; k < n; k++) { const x = x0 + .3 + h(10 + k) * 1.4, y = y0 + .3 + h(20 + k) * 1.4; if (libero(x, y, .3)) A.piante.push({ k: 'canna', x, y, s: .8 + h(30 + k) * .6, r: h(40 + k) * 6.28 }); } continue; }
      if (e === E.COSTA && v !== T.TREE && v !== T.ROCK) { const x = x0 + .5 + h(2), y = y0 + .5 + h(3); if (h(4) < .16 && libero(x, y, .9)) A.piante.push({ k: 'fico', x, y, s: .8 + h(5) * .7, r: h(6) * 6.28 }); else if (h(4) < .27 && libero(x, y, .6)) A.piante.push({ k: 'agave', x, y, s: .7 + h(5) * .6, r: h(6) * 6.28 }); continue; }
      if (e === E.DUNA && v === T.SAND && h(7) >= .05) {   // il manto della duna: ciuffi di sparto, cuscini di lentisco e ginepro (oltre la spiaggia nuda)
        const x = x0 + .3 + h(90) * 1.4, y = y0 + .3 + h(91) * 1.4, inl = W.inland(x, y); if (inl < 11 || !libero(x, y, .4)) continue;
        const p = h(92), k = p < .45 ? 'sparto' : p < .52 ? 'lentisco' : p < .58 ? 'ginepro' : null; if (k) A.piante.push({ k, x, y, s: .75 + h(93) * .6, r: h(94) * 6.28 });
        if (p < .3 && libero(x + .7, y - .5, .3)) A.piante.push({ k: 'sparto', x: x + .7, y: y - .5, s: .6 + h(95) * .5, r: h(96) * 6.28 }); continue; }
      if (e === E.DUNA && v === T.SAND && h(7) < .05) { const x = x0 + 1, y = y0 + 1, inl = W.inland(x, y); if (inl > 12 && libero(x, y, .5)) for (let k = 0; k < 3; k++) A.piante.push({ k: 'giglio', x: x + (h(50 + k) - .5) * 1.2, y: y + (h(60 + k) - .5) * 1.2, s: .8 + h(70 + k) * .5, r: h(80 + k) * 6.28 }); continue; }
      if (v === T.ROCK) {
        let mare = false; for (let b = -2; b <= 2 && !mare; b++) for (let a = -2; a <= 2; a++) if (isSea(i + b * GWx + a)) { mare = true; break; }
        if (!mare) continue; const k2 = W.coastKind2(x0 + 1, y0 + 1), x = x0 + .4 + h(8) * 1.2, y = y0 + .4 + h(9) * 1.2;
        if (k2 === 'frangiflutti') { if (h(11) < .55 && ![[0, 0], [2.2, 0], [-2.2, 0], [0, 2.2], [0, -2.2], [1.6, 1.6], [-1.6, 1.6], [1.6, -1.6], [-1.6, -1.6]].some(([a, b]) => { const j = at(x + a, y + b); return j >= 0 && strada(j); })) A.tetrapodi.push({ x, y, r: h(12) * 6.28, t: h(13) * 6.28, s: .9 + h(14) * .25 }); continue; }   // [sporcherie] i tetrapodi a 2 m dalla strada, mai a filo della Costiera
        if (!libero(x, y, .2)) continue;
        if (h(15) < .4) A.rocce.push({ k: 'lastra', x, y, s: 1 + h(16) * 1.4, r: h(17) * 6.28 });
        else if (h(15) < .55) A.rocce.push({ k: 'masso', x, y, s: .5 + h(16) * .9, r: h(17) * 6.28 });
        else if (h(15) < .62) A.rocce.push({ k: 'pozza', x, y, s: .5 + h(16) * .5, r: h(17) * 6.28 });
      }
    }
    // il piede del Molo Vecchio verso il largo: due file di tetrapodi sulla scogliera (dalla curva alla lanterna)
    const mv = W.SEA.structs.find(s => s.id === 'molo_vecchio'), bas = W.SEA.basins.find(B => B.id === 'porto_vecchio');
    const inPolyA = (x, y, Q) => { let c = false; for (let a = 0, b = Q.length - 1; a < Q.length; b = a++) if ((Q[a][1] > y) !== (Q[b][1] > y) && x < (Q[b][0] - Q[a][0]) * (y - Q[a][1]) / (Q[b][1] - Q[a][1]) + Q[a][0]) c = !c; return c; };
    if (mv) { const Pm = mv.pts; for (let k = 1; k < Pm.length; k++) { const a = Pm[k - 1], b = Pm[k], L = dist(a[0], a[1], b[0], b[1]), tx = (b[0] - a[0]) / L, ty = (b[1] - a[1]) / L;
      for (let s = 0; s < L; s += 1.7) for (const sd of [-1, 1]) for (const o of [mv.w / 2 + 4.6, mv.w / 2 + 6.4]) {   // fuori dal muro paraonde
        const j1 = hash2(Math.round((a[0] + tx * s) * 3), Math.round((a[1] + ty * s) * 3), 931 + Math.round(o * 7) + sd); let oo = o, x = 0, y = 0;
        for (let q = 0; q < 12; q++) { x = a[0] + tx * s - ty * sd * oo + (j1 - .5) * .8; y = a[1] + ty * s + tx * sd * oo + (j1 - .5) * .6; const ii = at(x, y); if (ii < 0 || g[ii] !== T.QUAY) break; oo += .9; }   // [costa] oltre la banchina nuova sotto le case
        const i = at(x, y); if (i < 0 || !(isSea(i) || g[i] === T.ROCK) || (bas && inPolyA(x, y, bas.poly))) continue;   // solo verso il largo, mai dentro il bacino né sulla terra
        A.tetrapodi.push({ x, y, r: j1 * 6.28, t: hash2(i, k, 934) * 6.28, s: 1.05, molo: true }); } } }
    // le passerelle sul golfo delle dune: dalla costiera (dietro il cordone) giù fino alla spiaggia, seguendo la discesa della distanza dal mare
    const lit = W.roads.find(r => r.id === 'litoranea');
    [420, 505, 590].map(Px).forEach(gx => { if (!lit) return; const X = gx + OX; let q0 = null, bd = 1e9; lit.pts.forEach(q => { const d = Math.abs(q[0] - X) + (q[1] < W.yc(q[0]) ? 1e4 : 0); if (d < bd) { bd = d; q0 = q; } }); if (!q0) return;
      let x = q0[0], y = q0[1]; const pts = []; for (let k = 0; k < 120; k++) { const d0 = W.inland(x, y), gx2 = W.inland(x + .5, y) - W.inland(x - .5, y), gy2 = W.inland(x, y + .5) - W.inland(x, y - .5), L = Math.hypot(gx2, gy2) || 1;
        x -= gx2 / L * .5; y -= gy2 / L * .5; if (d0 < 3) break; const i = at(x, y); if (g[i] === T.SAND && !strada(i) && (!pts.length || dist(x, y, pts[pts.length - 1][0], pts[pts.length - 1][1]) >= 2)) pts.push([+x.toFixed(2), +y.toFixed(2)]); }
      if (pts.length >= 6) A.passerelle.push({ pts, w: 1.4 }); });
    // la strada sul mare: per ogni punto della costiera dentro C2STRADA, quanto è lontano il mare dal ciglio e da che parte
    W.roads.filter(r => r.kind === 'litoranea' && r.edge).forEach(rd => {
      const P = rd.pts, run = [];
      const flush = () => {
        if (run.length >= 8) {
          const nord = run[0].y < W.yc(run[0].x);
          if (nord) run.forEach(q => { A.muretti.push({ x: q.ex, y: q.ey, nx: q.nx, ny: q.ny }); rd.edge[q.k * 2 + q.si] = 4; });   // a tramontana sul ciglio della falesia: il muretto di pietra (niente guardrail)
          else run.forEach(q => { if (rd.edge[q.k * 2 + q.si] !== 3) rd.edge[q.k * 2 + q.si] = 3; });   // a mezzogiorno il guardrail zincato dove c'è il mare (lo costruisce la grafica dal bordo 3)
          // la piazzola: dove fra il ciglio e il mare c'è terra per 4 m, lunga 14 m
          for (let c = 6; c < run.length - 6; c += 3) { const q = run[c]; if (q.dm < 7.5) continue; const cx = q.ex + q.nx * 2.2, cy = q.ey + q.ny * 2.2; let okP = true;
            for (let s = -7; s <= 7; s += 1) for (const o of [0, 1.6, 3.2]) { const i = at(q.ex + q.tx * s + q.nx * (o + .4), q.ey + q.ty * s + q.ny * (o + .4)); if (i < 0 || isSea(i) || g[i] === T.BLD) okP = false; }
            if (okP && !A.piazzole.some(p => dist(p.x, p.y, cx, cy) < 90)) { A.piazzole.push({ x: cx, y: cy, ang: Math.atan2(q.ty, q.tx), L: 14, w: 3.4, nx: q.nx, ny: q.ny }); for (let s = -7; s <= 7; s += 1.75) A.muretti.push({ x: cx + q.tx * s + q.nx * 1.9, y: cy + q.ty * s + q.ny * 1.9, nx: q.nx, ny: q.ny, piazzola: true }); } }
          // la scaletta: dove sotto il ciglio c'è sabbia (una cala, la spiaggetta), giù dritta fino alla sabbia
          for (let c = 2; c < run.length - 2; c++) { const q = run[c]; let sx = null; for (let d = 1; d < 12; d += .5) { const i = at(q.ex + q.nx * d, q.ey + q.ny * d); if (i < 0 || isSea(i)) break; if ((g[i] === T.SAND || g[i] === T.DIRT || g[i] === T.ROCK) && d >= 1.5) { sx = d; break; } }   /* [costa] anche sul terrapieno delle case e sullo scoglio davanti */
            if (sx !== null && sx >= 1.5 && !A.scale.some(s => dist(s.x0, s.y0, q.ex, q.ey) < 60)) A.scale.push({ x0: q.ex + q.nx * .3, y0: q.ey + q.ny * .3, x1: q.ex + q.nx * (sx + .8), y1: q.ey + q.ny * (sx + .8), w: 1.5 }); }
        }
        run.length = 0;
      };
      for (let k = 2; k < P.length - 2; k++) {
        const gx = P[k][0] - OX, inS = C2STRADA.some(([a, b]) => gx > a && gx < b); if (!inS) { flush(); continue; }
        const a = P[k - 1], c = P[k + 1], L = dist(a[0], a[1], c[0], c[1]) || 1, tx = (c[0] - a[0]) / L, ty = (c[1] - a[1]) / L; let best = null;
        [0, 1].forEach(si => { const nx = (si ? -1 : 1) * -ty, ny = (si ? -1 : 1) * tx, e0 = rd.w / 2 + 2.2; /* lo stesso lato di rd.edge (come in render.js) */ for (let d = e0; d < e0 + 12; d += .5) { if (isSea(at(P[k][0] + nx * d, P[k][1] + ny * d))) { if (!best || d < best.d) best = { d, si, nx, ny }; break; } } });
        if (!best) { flush(); continue; }
        const e0 = rd.w / 2 + 2.2; run.push({ k, si: best.si, x: P[k][0], y: P[k][1], nx: best.nx, ny: best.ny, tx, ty, ex: P[k][0] + best.nx * e0, ey: P[k][1] + best.ny * e0, dm: best.d - e0 + 2.2 });
      }
      flush();
    });
    A.terrapieni = W.SEA.terrapieni || []; W.SEA.costa2 = A;
    W.COSTA2 = { N: COSTA2.N.map(([a, k]) => [a + OX, k]), S: COSTA2.S.map(([a, k]) => [a + OX, k]), nomi: C2N.concat(C2S).filter(q => q[3]).map(([c, w, a, nome]) => { const N = C2N.some(q => q[3] === nome); return { nome, x: c + OX, y: +(N ? NorthY(c) : SouthY(c)).toFixed(1) + OY, lato: N ? 'N' : 'S', capo: a > 0 }; }), strada: C2STRADA.map(([a, b]) => [a + OX, b + OX]) };
    return W;
  }
  // [costa] I TERRAPIENI: nessuna casa in mezzo alla sabbia. Il committente: «non si sono mai viste case in mezzo alla sabbia». Le case
  // dei borghi dei pescatori, del Lido e della marina stanno su un terrapieno: attorno a ogni casa che tocca la sabbia, fino a 3 caselle
  // (6 m), la sabbia diventa terra battuta (fuori città) o acciottolato (in città, dalla stazione in là); verso la spiaggia il muretto
  // di contenimento in pietra (W.SEA.costa2.terrapieni: i lati fra il terrapieno e la sabbia, li costruisce render.js). La spiaggia comincia
  // davanti al muretto. Prima di costa2Arredo: le piante della duna e le passerelle vedono già la terra nuova.
  function terrapieni(W) {
    const g = W.grid, GWx = W.GW, GHx = W.GH, CITTA_X = 1222 / TS, fatti = new Uint8Array(GWx * GHx), lati = [];
    W.BUILDINGS.forEach(b => { if (b.use === 'capanno' && /palme/.test(b.id || '')) return;   // i capanni sulle spiagge delle isole restano sulla sabbia (sono capanni)
      let tocca = false; for (let ty = b.y - 2; ty <= b.y + b.h + 2 && !tocca; ty++) for (let tx = b.x - 2; tx <= b.x + b.w + 2; tx++) { const i = ty * GWx + tx; if (tx >= 0 && ty >= 0 && tx < GWx && ty < GHx && g[i] === T.SAND) { tocca = true; break; } }
      if (!tocca) return; const R = 3;
      for (let ty = b.y - R; ty <= b.y + b.h + R; ty++) for (let tx = b.x - R; tx <= b.x + b.w + R; tx++) { if (tx < 0 || ty < 0 || tx >= GWx || ty >= GHx) continue; const i = ty * GWx + tx; if (g[i] !== T.SAND) continue;
        const dx = Math.max(b.x - tx, 0, tx - (b.x + b.w)), dy = Math.max(b.y - ty, 0, ty - (b.y + b.h)); if (dx * dx + dy * dy > R * R + 1) continue;   // gli angoli smussati
        let mare = false; for (const [a, c] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = (ty + c) * GWx + tx + a; if (g[j] === T.WATER) mare = true; }
        if (mare) { if (dx <= 1 && dy <= 1) g[i] = T.ROCK; continue; }   // sul filo dell'acqua: accanto alla casa lo scoglio (la casa sul mare sta sulla roccia), più in là resta la battigia
        g[i] = tx >= CITTA_X ? T.COB : T.DIRT; fatti[i] = 1; } });
    // [costa] le case sul mare: nessuna casa col mare al piede su più lati (la segnalazione dell'inquadratura: case mezze in acqua sul
    // Molo Vecchio, sulla spianata, alla marina). Sotto ogni casa che ha il mare accanto la banchina si allarga di una casella (2 m,
    // QUAY: il muro di blocchi lo fa render.js dai lati della banchina), alla quota della banchina vicina; mai a meno di 3,5 m da un
    // ormeggio o da un pontile (le barche restano al loro posto)
    { const MOOR = (W.SEA.moorings || []).map(m => [m.x, m.y]).concat((W.SEA.structs || []).filter(st => st.type === 'pontile').flatMap(st => st.pts)), VWx = W.VW, isSeaT = i => g[i] === T.WATER && W.zone[i] === Z.MARE; let nq = 0;
      W.BUILDINGS.forEach(b => { if (b.military || b.use === 'capanno') return; let hq = -9;
        for (let ty = b.y; ty < b.y + b.h; ty++) for (let tx = b.x; tx < b.x + b.w; tx++) hq = Math.max(hq, W.elev[ty * GWx + tx]);
        for (let ty = b.y - 1; ty <= b.y + b.h; ty++) for (let tx = b.x - 1; tx <= b.x + b.w; tx++) { if (tx < 1 || ty < 1 || tx >= GWx - 1 || ty >= GHx - 1) continue; const i = ty * GWx + tx; if (!isSeaT(i)) continue;
          const x = (tx + .5) * TS, y = (ty + .5) * TS; if (MOOR.some(([mx, my]) => Math.hypot(mx - x, my - y) < 3.5)) continue;
          g[i] = T.QUAY; W.zone[i] = Z.CITTA; W.elev[i] = Math.max(W.elev[i], hq > -9 ? Math.min(hq, 1.2) : .8); nq++;
          for (const [a, c] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const k = (ty + c) * VWx + tx + a; W.vh[k] = Math.max(W.vh[k], W.elev[i]); } } });
      W.SEA.calate = nq; }
    // [costa] le case del Molo Vecchio seguono la curva del molo: ognuna gira (al più 32°, come le case delle vie storte, b.rot) secondo il
    // tratto di molo più vicino; se il rettangolo girato urta una vicina l'angolo si dimezza, fino a tre volte, poi resta dritta
    { const mv = (W.SEA.structs || []).find(st => st.id === 'molo_vecchio'); let nr = 0;
      if (mv) { const P = mv.pts, rect = (b, a) => { const cx = (b.x + b.w / 2) * TS, cy = (b.y + b.h / 2) * TS, hw = b.w * TS / 2 - .05, hh = b.h * TS / 2 - .05, c = Math.cos(a), sn = Math.sin(a); return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => [cx + x * c - y * sn, cy + x * sn + y * c]); };
        const sat = (A, B) => { for (const Q of [A, B]) for (let i = 0; i < 4; i++) { const p0 = Q[i], p1 = Q[(i + 1) % 4], nx = p1[1] - p0[1], ny = p0[0] - p1[0]; let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9; A.forEach(p => { const d = p[0] * nx + p[1] * ny; a0 = Math.min(a0, d); a1 = Math.max(a1, d); }); B.forEach(p => { const d = p[0] * nx + p[1] * ny; b0 = Math.min(b0, d); b1 = Math.max(b1, d); }); if (a1 <= b0 || b1 <= a0) return false; } return true; };
        const near = b => { const cx = (b.x + b.w / 2) * TS, cy = (b.y + b.h / 2) * TS; let best = null, bd = 1e9; for (let k = 1; k < P.length; k++) { const [ax, ay] = P[k - 1], [bx, by] = P[k], ex = bx - ax, ey = by - ay, L2 = ex * ex + ey * ey, t = Math.max(0, Math.min(1, ((cx - ax) * ex + (cy - ay) * ey) / L2)), d = Math.hypot(cx - ax - ex * t, cy - ay - ey * t); if (d < bd) { bd = d; best = Math.atan2(ey, ex); } } return [bd, best]; };
        const cand = W.BUILDINGS.filter(b => !b.military && !b.rot && near(b)[0] < 12);
        cand.forEach(b => { let a = near(b)[1]; a = ((a + Math.PI / 4) % (Math.PI / 2) + Math.PI / 2) % (Math.PI / 2) - Math.PI / 4; if (Math.abs(a) < .06) return; a = Math.max(-.56, Math.min(.56, a));
          const vic = W.BUILDINGS.filter(o => o !== b && Math.abs(o.x - b.x) < 10 && Math.abs(o.y - b.y) < 10);
          for (let t = 0; t < 4; t++, a /= 2) { const R0 = rect(b, a); if (!vic.some(o => sat(R0, rect(o, o.rot || 0)))) { b.rot = +a.toFixed(3); delete b.norot; nr++; break; } } }); }
      W.SEA.caseGirate = nr; }
    for (let ty = 1; ty < GHx - 1; ty++) for (let tx = 1; tx < GWx - 1; tx++) { const i = ty * GWx + tx; if (!fatti[i]) continue;
      for (const [a, c, ex, ey, ux, uy] of [[1, 0, 1, 0, 0, 1], [-1, 0, 0, 0, 0, 1], [0, 1, 0, 1, 1, 0], [0, -1, 0, 0, 1, 0]]) { if (g[(ty + c) * GWx + tx + a] !== T.SAND) continue;
        lati.push({ x: (tx + ex) * TS, y: (ty + ey) * TS, ux, uy, L: TS, nx: a, ny: c, citta: tx >= CITTA_X }); } }   // il lato: da (x, y) lungo (ux, uy) per L metri; (nx, ny) verso la sabbia
    W.SEA.terrapieni = lati; W.SEA.terrapieniM = fatti; return W;
  }
  // [costa] GLI SCOGLI FUORI DALLE STRADE: gli scogli grandi sotto le mura (scoglio_mura_*) erano messi sulla riva vecchia (NorthY):
  // nella città nuova lì passano il Lungomare di Tramontana, la passeggiata e le banchine (la segnalazione della pulizia: fino a 9,8 m
  // dentro la carreggiata). Ogni scoglio che tocca una strada (la carreggiata più 2,6 m di marciapiede) o una casella della città
  // scivola verso il largo (contro la pendenza della distanza dalla costa) finché il suo cerchio sta tutto nel mare libero, con mezzo
  // metro di respiro e lontano 2,5 m da ormeggi, posti di pesca e di bagno; se in 60 m non trova posto, sparisce. W.SEA.scogliSpostati: quanti, W.SEA.scogliTolti: quanti tolti
  function scogliFuori(W) {
    const S = W.SEA, g = W.grid, GWx = W.GW, GHx = W.GH, CIT = new Set([T.VIA, T.WALK, T.COB, T.PIAZZA, T.STAIRS, T.QUAY, T.PIER, T.BLD, T.FOUNT]);
    const RD = (W.roads || []).filter(rd => rd.pts && rd.pts.length > 1 && !rd.rect).map(rd => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; rd.pts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }); return { P: rd.pts, m: rd.w / 2 + 2.6, x0, y0, x1, y1 }; });
    const dSeg = (x, y, P) => { let b = 1e9; for (let k = 1; k < P.length; k++) { const [ax, ay] = P[k - 1], [bx, by] = P[k], ex = bx - ax, ey = by - ay, L2 = ex * ex + ey * ey || 1, t = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / L2)); b = Math.min(b, Math.hypot(x - ax - ex * t, y - ay - ey * t)); } return b; };
    const PUNTI = (S.moorings || []).concat(S.fishing || [], S.swim || []).map(m => [m.x, m.y]);   // gli ormeggi, i posti di pesca e di bagno: lo scoglio non ci cade sopra
    const libero = (x, y, r) => { const tx0 = Math.floor((x - r - 1) / TS), tx1 = Math.floor((x + r + 1) / TS), ty0 = Math.floor((y - r - 1) / TS), ty1 = Math.floor((y + r + 1) / TS);
      if (tx0 < 1 || ty0 < 1 || tx1 >= GWx - 1 || ty1 >= GHx - 1) return false;
      const ci = Math.floor(y / TS) * GWx + Math.floor(x / TS); if (g[ci] !== T.WATER) return false;
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) { const i = ty * GWx + tx; if (!CIT.has(g[i]) && !(W.roadW[i] > 0)) continue;
        const qx = Math.max(tx * TS, Math.min(x, (tx + 1) * TS)), qy = Math.max(ty * TS, Math.min(y, (ty + 1) * TS)); if (Math.hypot(qx - x, qy - y) < r + .5) return false; }
      if (PUNTI.some(([px, py]) => Math.hypot(px - x, py - y) < r + 2.5)) return false;
      for (const R of RD) { const m = R.m + r; if (x < R.x0 - m || x > R.x1 + m || y < R.y0 - m || y > R.y1 + m) continue; if (dSeg(x, y, R.P) < m) return false; }
      return true; };
    let sp = 0, via = 0; const tieni = [];
    (S.rocks || []).forEach(q => { if (libero(q.x, q.y, q.r)) { tieni.push(q); return; }
      let x = q.x, y = q.y, ok = false;
      for (let t = 0; t < 120 && !ok; t++) { const e = .5, gx = W.inland(x + e, y) - W.inland(x - e, y), gy = W.inland(x, y + e) - W.inland(x, y - e), L = Math.hypot(gx, gy) || 1; x -= gx / L * .5; y -= gy / L * .5; ok = libero(x, y, q.r); }
      if (ok) { q.x = x; q.y = y; q.spostato = 1; tieni.push(q); sp++; } else via++; });
    S.rocks = tieni; S.scogliSpostati = sp; S.scogliTolti = via; return W;
  }
  // [cotto] il mondo cotto nella build (cotto.js): le radici sono le costanti del modulo che il mondo richiama (le isole, i canali...):
  // così il mondo letto punta agli stessi oggetti di quello calcolato
  const CT = typeof Cotto !== 'undefined' ? Cotto : null;
  const RADICI = { T, Z, ZNAME, HW, PORT, DISTR, HILLS, HEAD, C2STRADA, C2N, C2S, PUNTA, C2T, ISOLE, LAGUNE, ISLE_BK, COSTA2, C2BASE, COSTA, GOV, TAV, BF, CANALI, DOLINE, POZZA, MULA, ECO, RADURE, C2BW, FOCE, VILLAGES, FLAT, MF, CREST, ALTO, PIZZO, GOLA, FIUM, BORGHI, DITA, TERRAZZE, ROADS0, MONTI, NAMED };
  const COT = CT ? CT.apri('mondo', RADICI) : null;
  const rifare = CT ? CT.RIFARE : null;
  const FUNZ = Object.assign({ monte, tavR, tavW, canHalf, canFloor, hash2, fbm, rng, shopGeom, preview: rifare, apriBottega: rifare, __vfix: rifare, __ix: rifare, __toD: rifare, quotaRiva: rifare }, rivaGrande());
  const daCotto = () => { const L = COT && CT.chiudi('mondo', { W: null }, COT, p => p === 'W.vegetazione.fitto' ? rifare : FUNZ[p.slice(2)]), W = L && L.W; if (!W) return null;
    ISLES_ON = true; const RF = rivaFunzioni(W, W.grid, W.elev, W.vh, W.velev, W.__isl); W.__vfix = RF.__vfix; W.__ix = RF.__ix; W.__toD = RF.__toD; W.quotaRiva = RF.quotaRiva; return W; };
  const W0c = daCotto(), COTTO = !!W0c;   // COTTO: il mondo viene dal file cotto
  const W = W0c || scogliFuori(costa2Arredo(terrapieni(expand(generate()))));
  W.preview = s => preview(W, s);
  // [botteghe] una bottega aperta a partita iniziata (economia, ordine, fazioni) sta anch'essa sotto casa se il fronte lo permette;
  // il portone resta dov'è. Torna true se la bottega ha il suo fronte.
  W.apriBottega = (b, piano) => { if (!b || !b.door || b.shopFront || (b.fl || 1) < 2 || W.zone[b.y * W.GW + b.x] !== W.Z.CITTA) return false;
    b.shopFront = { use: b.use, name: b.name, sign: b.sign, era: b.era || 'E3', piano: piano || 0 }; b.abitato = true;
    if (!shopGeom(b, W.grid, W.reach, W.GW, W.GH, true, null)) { delete b.shopFront; delete b.abitato; return false; } return true; };
  W.shopGeom = shopGeom;
  W.hash2 = hash2; W.fbm = fbm; W.rng = rng; W.monte = monte; W.MF = MF;
  { const VG = typeof Vegetazione !== 'undefined' ? Vegetazione : typeof require !== 'undefined' ? (() => { try { return require('./vegetazione.js'); } catch (e) { return null; } })() : null;
    if (COTTO) { if (VG && VG.adotta) VG.adotta(W); } else if (VG && VG.pianta) VG.pianta(W); }   // [vegetazione] il piano del verde: i tronchi sono le caselle TREE (?vecchioverde: com'era)
  if (CT && CT.cuoci) CT.chiudi('mondo', { W }, null);
  return W;
})();
if (typeof module !== 'undefined') module.exports = World;
