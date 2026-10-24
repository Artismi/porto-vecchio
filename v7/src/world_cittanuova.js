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
  const C2SCOGLI = [[906, 2, 5], [921, 4, 4], [940, 2, 6.5], [961, 5, 3.5], [983, 1.5, 6], [1004, 4, 4.5], [1027, 1, 7], [1051, 5, 3.8], [1072, 2, 5.5], [1096, 1.5, 6.5], [1119, 4, 4], [1140, 1, 6], [1163, 3, 5]];   // non oltre 1170: lì comincia il canale della Rocca   // [x, quanto fuori, raggio]: gli scogli sotto le mura
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
  const c2Liscio = x => 1 - .8 * sstep(150, 175, x) * (1 - sstep(320, 336, x)) - .85 * sstep(356, 380, x) * (1 - sstep(640, 656, x));   // lungo le spiagge la riva è liscia
  function c2Rumore(x, sd) {   // sd 2.1 nord, 5.3 sud
    const wx = x + 34 * (fbm(x / 95, sd, 700, 2) - .5), N = sd < 4, a = N ? 1 - .75 * sstep(C2STRADA[0][0], C2STRADA[0][0] + 16, x) * (1 - sstep(C2STRADA[0][1] - 16, C2STRADA[0][1], x)) : c2Liscio(x);   // sotto la strada sul mare la riva è un ciglio quasi dritto
    return ((N ? 5.5 : 3.2) * (fbm(wx / 52, sd * 3.7, 701, 3) - .5) * 2 + (N ? 2.8 : .9) * a * (fbm(wx / 14, sd * 5.1, 702, 2) - .5) * 2 + (N ? 1.1 : .2) * a * (fbm(wx / 4.6, sd, 703, 2) - .5) * 2);
  }
  // la Punta di Ponente: uno sperone verso ovest attorno a y 218, che si salda alla testa con un minimo morbido
  const PUNTA = { x0: 26, x1: 80, y: 220 };   // la punta finisce a x 26: i faraglioni (x 6-24) restano in mare, subito fuori
  const puntaHW = x => x <= PUNTA.x0 ? 0 : 19 * Math.sqrt(clamp((x - PUNTA.x0) / (PUNTA.x1 - PUNTA.x0), 0, 1)) * (1 + .25 * (fbm(x / 7, 3, 704, 2) - .5));
  const c2Out = (x, N) => (N ? c2B(x, C2N) + c2Rumore(x, 2.1) : c2B(x, C2S) + c2Rumore(x, 5.3)) * c2Taper(x);   // quanto la riva esce verso il mare
  function NorthY(x) {
    if (x >= XF) { const y0 = northY(xo(x)) + gapK(x) * nH(x, 2.1); return x >= C2X1 ? y0 : y0 - c2Out(x, true); }
    const c = Math.abs(x - HEAD.x) < HEAD.r ? HEAD.y - headHalf(x) : 1e4;
    let y = smin(c, x < 250 ? 1e4 : neckN(x), 34) + nH(x, 2.1) * (1 - sstep(XF - 60, XF, x)) + cove(x, 300, 11, 7) + cove(x, 520, 9, 5) - c2Out(x, true);
    if (x > PUNTA.x0 && x < PUNTA.x1 + 30) y = smin(y, PUNTA.y - puntaHW(x), 8);
    return y;
  }
  function SouthY(x) {
    if (x >= XF) { const y0 = southY(xo(x)) - gapK(x) * nH(x, 5.3); return x >= C2X1 ? y0 : y0 + c2Out(x, false); }
    const c = Math.abs(x - HEAD.x) < HEAD.r ? HEAD.y + headHalf(x) : -1e4;
    let y = -smin(-c, x < 250 ? 1e4 : -neckS(x), 46) - nH(x, 5.3) * .45 * (1 - sstep(XF - 60, XF, x)) + c2Out(x, false);   // la Spiaggia Lunga: riva liscia
    if (x > PUNTA.x0 && x < PUNTA.x1 + 30) y = -smin(-y, -(PUNTA.y + puntaHW(x)), 8);
    return y;
  }
  // [costa2] la distanza vera dalla riva (non più quella in verticale): la riva nord e la sud campionate ogni metro, e per ogni punto
  // vicino alla riva la distanza dalla polilinea più vicina. Serve al terreno (la grafica ammorbidisce la riva con questa distanza: se
  // la distanza è sbagliata il terreno scende sotto il mare dentro la terra o resta alto in acqua) e alle fasce di sabbia e di roccia.
  const C2T = { x0: -40, x1: 1000, N: null, S: null };
  function c2Tab() { if (C2T.N) return; const n = C2T.x1 - C2T.x0 + 1; C2T.N = new Float32Array(n); C2T.S = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = C2T.x0 + i; C2T.N[i] = NorthY(x); C2T.S[i] = SouthY(x); } }
  function c2Dist(x, y, cap) {   // distanza (positiva) dalla riva più vicina, fino a cap
    c2Tab(); let best = cap * cap; const i0 = Math.max(0, Math.floor(x - cap - C2T.x0)), i1 = Math.min(C2T.N.length - 2, Math.ceil(x + cap - C2T.x0));
    for (let i = i0; i <= i1; i++) {
      const xa = C2T.x0 + i, dx = x - xa; if (dx * dx >= best && xa < x) continue;
      for (const A of [C2T.N, C2T.S]) { const ya = A[i], yb = A[i + 1]; if (ya > 5e3 || yb > 5e3 || ya < -5e3 || yb < -5e3) continue;
        const ex = 1, ey = yb - ya, L2 = 1 + ey * ey, t = clamp((dx * ex + (y - ya) * ey) / L2, 0, 1), qx = dx - t, qy = y - ya - ey * t, d2 = qx * qx + qy * qy; if (d2 < best) best = d2; }
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
  const Inland0 = (x, y) => {
    if (x >= C2X1 - 4 || x < C2T.x0 + 2) return Inland00(x, y);
    const v = Math.min(y - NorthY(x), SouthY(x) - y); if (v > 64 || v < -64) return v;
    const d = c2Dist(x, y, 64), on = y > NorthY(x) && y < SouthY(x); return on ? Math.min(d, v) : -d;
  };
  const Inland = (x, y) => Math.max(Inland0(x, y), isleIn(x, y));   // [arcipelago] la riva più vicina, isole comprese
  const DistrictAt = (x, y) => y !== undefined && isleIn(x, y) > Inland0(x, y) - 18 ? 'isole' : DistrictAt0(x);   // [arcipelago] con y: le isole e il mare attorno
  const DistrictAt0 = x => x < 380 ? 'prateria' : x < XF ? 'foresta' : x < XG ? districtO(x - DXF) : x < XC ? 'perif_o' : districtO(x - DXC);
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
  const C2BASE = { duna: 'spiaggia', foce: 'spiaggia', frangiflutti: 'scogli' };
  const COSTA = { N: COSTA2.N.map(([a, k]) => [a, C2BASE[k] || k]), S: COSTA2.S.map(([a, k]) => [a, C2BASE[k] || k]) };
  const costaSide = (x, y) => y < Yc(x) ? 'N' : 'S';
  function coastKind2(x, y) { const b = isleAt(x, y); if (b && b.q.d > Inland0(x, y)) return isleKind(b.I, b.q.a);   // [arcipelago] la riva di un'isola
    const L = COSTA2[costaSide(x, y)]; let k = L[0][1]; for (const [a, n] of L) if (x >= a) k = n; return k; }
  function coastKind(x, y) { const k = coastKind2(x, y); return C2BASE[k] || k; }
  // il quartiere del governo: torri degli uffici sopra la baraccopoli (box in metri)
  const GOV = { x0: XG - 18, x1: XC + 4, piazza: [904, 136, 934, 156] };

  // ---------------- [isola] LA TESTA DI BOSCO, IL COLLO DI FORESTA, IL TAVOLATO ----------------
  // Il Tavolato è un tepui: pianoro a 42 m con pareti verticali e il ghiaione sotto, sopra il bosco che sta a ~13 m.
  // Si sale solo a piedi, da due canaloni intagliati nella parete (levante, dove finisce la Via della Memoria; ponente, verso il faro).
  const TAV = { x: 168, y: 190, r: 58, h: 42 };
  const BF = { TOP: 1, WALL: 2, TALUS: 4, CANALE: 8, RADURA: 16, RIVA: 32 };
  const CANALI = [{ id: 'levante', a: .16 }, { id: 'ponente', a: Math.PI + .42 }];
  // [ambienti] gli ambienti del verde (vedi generate)
  const ECO = { NONE: 0, FARO: 1, DUNA: 2, PINETA: 3, SALINA: 4, PASCOLO: 5, GHIAIONE: 6, ABETAIA: 7, FAGGETA: 8, VALLONE: 9, MACCHIA: 10, RUDERALE: 11, RADURA: 12, RIPARIALE: 13, BETULLE: 14, VIGNE: 15, ULIVETO: 16, PINIMONTE: 17, ISOLA: 18, PALMETO: 19, GIUNGLA: 20, NUDA: 21, CANNETO: 22, COSTA: 23 };   // [costa2] CANNETO: le canne alla foce e nelle conche dietro le dune; COSTA: le macchie verdi sulla riva di roccia (fichi d'india, agavi, pini)
  const tavR = a => TAV.r * (.95 + .1 * fbm(Math.cos(a) * 1.05 + 4, Math.sin(a) * 1.05 + 4, 401, 2));   // [isola] pochi lobi larghi: un tavolato, non un bordo frastagliato
  CANALI.forEach(c => { c.R = tavR(c.a); c.u = [Math.cos(c.a), Math.sin(c.a)]; });
  // radure del bosco [x, y, raggio]: stazioni, saline, faro, campo partigiano, borghi dei pescatori
  const RADURE = [[232, 82, 15], [262, 318, 15], [100, 312, 19], [44, 213, 12], [98, 128, 8], [470, SouthY(470) - 23, 18], [566, NorthY(566) + 21, 14], [152, SouthY(152) - 24, 12]];   // [costa2] i borghi dei pescatori stanno a filo della riva nuova
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
    // [costa2] la sabbia la decide il tipo di riva (spiaggia, cala, foce; la duna col suo cordone); la quota la fa c2Quota
    if (inl < 48) { const k = coastKind2(x, y), n1 = fbm(x / 23, y / 23, 710, 2);
      if (C2BW[k] && inl < C2BW[k] + 4 * n1 + (k === 'duna' ? C2DUNA + 8 * n1 - 2 : 0)) f |= BF.RIVA; }
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
    const FORRA = [[262, 214], [292, 228], [326, 236], [362, 244], [398, 252], [432, 258], [466, 266]];
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
      const v = grid[i]; if (v !== T.TREE && v !== T.SHRUB && v !== T.GRASS && !(v === T.SAND && eco[i] === E.PALMETO)) continue;   // [arcipelago] le palme crescono anche sulla sabbia
      const wx = x + (fbm(x / 30, y / 30, 171, 2) - .5) * 26 + (hash2(tx, ty, 172) - .5) * 9, wy = y + (fbm(x / 30 + 9, y / 30 + 4, 173, 2) - .5) * 26 + (hash2(tx, ty, 174) - .5) * 9;
      const wi = Math.max(0, Math.min(GH - 1, Math.floor(wy / TS))) * GW + Math.max(0, Math.min(GW - 1, Math.floor(wx / TS))), e0 = v === T.SAND ? eco[i] : eco[wi] || eco[i];
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
    blob(100, 314, 15, 9, i => { if (grid[i] !== T.WATER) grid[i] = T.SALT; });   // [isola] le saline, dietro la Spiaggia Lunga
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
      const offN = x => { const o = x >= XF ? coastOff(xo(x), -1) : 12 + 5 * sstep(420, XF, x), k = sulMare(x, -1); return o + (7 - o) * k; };
      const offS0 = x => x >= XF ? coastOff(xo(x), 1) : 24 - 7 * sstep(560, XF, x);
      // [costa2] la costiera passa dietro il cordone di dune del golfo (non sopra), e non scende nelle calette: segue l'inviluppo della
      // riva (la riva più interna nei 16 m attorno), non ogni rientranza
      const offS = x => { const o = offS0(x) + 30 * sstep(356, 392, x) * (1 - sstep(612, 648, x)), k = sulMare(x, 1); return o + (7 - o) * k; };
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
      for (let x = HEAD.x; x <= XE; x += 6) pts.push([x, envS(x) - offS(x)]);
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
      nodoR('Piazzale della Stazione', ...CITY.pzStaz); nodoR('Scalo', 958, 180, 998, 193); CITY.nodi.push({ nome: 'Piazza della Rocca', poly: [[1154, 116], [1184, 116], [1184, 130.5], [1171, 130.5], [1171, 139.5], [1154, 139.5]] });   /* [pianta] la spianata non è più un nodo vuoto: ci sono le case del glacis e la piazza del mercato */ nodoR('Giardini di Ponente', 902, 88, 930, 192); nodoC('Lotto del fuoco', 966, 71, 5);
      // la Costiera Nord passa i binari al passaggio a livello e si ferma sul piazzale (resta l'id via_alta: la leggono posti, popolo, percorsi)
      const N0 = nordP[0], STAZ = chaikin([N0.slice(), [N0[0] - 4, N0[1] + 8], [922, 94], [928, 103], [936, 108]], 2); CITY.staz = STAZ;
      add('via_alta', 'Via della Stazione', 7, 'citta', STAZ, { era: 'E3', nudo: true });
      // la Costiera Sud corre sulla riva fino allo Scalo (l'id via_porto resta)
      const L0 = litP[litP.length - 1], LUNGO = chaikin([L0.slice(), [L0[0] + 10, 187], [944, 186], [956, 186], [966, 186.5], [978, 186.9], [990, 187]], 2);   // [pianta] fino all'incrocio col Corso e la Marina: la strada non si interrompe sullo Scalo
      add('via_porto', 'Via del Porto', 7, 'citta', LUNGO, { era: 'E6', nudo: true });
      // E3 il Corso: dove c'erano le mura di terra, ad arco dal piazzale della stazione allo Scalo (7 m, un filare)
      add('corso', 'Corso Garibaldi', 7, 'citta', chaikin([[970, 109], [982, 118], [982, 128], [979, 143], [981, 158], [986, 174], [990, 187]], 2), { alberi: 'tigli', era: 'E3', alberiLato: -1 });
      // E3 il sottopasso Cavour: dal piazzale scende a scalini, passa sotto il rilevato e sbuca sul lotto del fuoco fra le baracche
      CITY.cavS = { x: 972, y0: 71, y1: 105 };
      add('cavour_sotto', 'Sottopasso Cavour', 3, 'vicolo', [[972, 105]].concat(vline(972, 78, 102).reverse(), [[969, 74.5], [967, 72]]), { era: 'E3', sottopasso: true });
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
      add('passeggiata', 'Viale della Spianata', 7, 'citta', vline(1147.5, ry(1141) - 16, 139.5), { era: 'E1', passeggio: true, alberi: 'lecci', alberiLato: -1, alberiOff: 5, capi: [{ tipo: 'affaccio', perche: 'il belvedere sulla punta di scogli di tramontana, oltre il respingente dei binari' }, null] });
      add('riva_rocca', 'Riva della Rocca', 5, 'vicolo', CITY.glacis.rivaPts, { era: 'E1' });
      { const R = CITY.glacis.rivaPts; let xv = 1178; for (let k = 0; k < R.length - 1; k++) if ((R[k][1] - 90) * (R[k + 1][1] - 90) <= 0 && R[k][1] !== R[k + 1][1]) xv = R[k][0] + (R[k + 1][0] - R[k][0]) * (90 - R[k][1]) / (R[k + 1][1] - R[k][1]);
        add('vic_glacis', 'Vico del Glacis', 3, 'vicolo', [[1151.25, 90], [(1151.25 + xv) / 2, 90.6], [xv, 90]], { era: 'E1' }); }
      add('passeggiata_sud', 'Via del Lido', 7, 'citta', vline(1147.5, 146.5, 213), { era: 'E1', capi: [null, { tipo: 'affaccio', perche: 'scende alla spiaggia del Lido, accanto al muro del Recinto' }] });   // [pianta] la Via del Lido: l'anello sul mare passa la Vittoria a croce col Viale della Spianata
      add('vic_mura', 'Via delle Mura', 2.5, 'vicolo', MV, { era: 'E0', capi: [{ tipo: 'scala', perche: 'la scala di ferro delle mura: sale sul camminamento di tramontana' }, null] });
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
      add('vic_forno', 'Scalinata del Forno', 2.5, 'vicolo', [[1033, 166], [1033.5, 176], [1034, yOn(MAR, 1034)]], { era: 'E0' });
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
    CITY.roads.forEach(rd => roads.push(rd));
    ROADS0.filter(q => !['porto', 'monte', 'deserto', 'miniera', 'stazione2', 'saline', 'faro', 'crinale_e', 'sent_o1', 'sent_o2', 'sent_e1', 'sent_e2', 'anello_on', 'anello_os', 'mulattiera_o', 'anello_en', 'anello_es', 'mulattiera_e'].includes(q[0])).forEach(([id, name, w, kind, cp]) => roads.push({ id, name, w, kind, pts: rounded(rel(cp).map(q => [xn(q[0]), q[1]]), w > 5 ? 16 : 8, false) }));
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
    const BOATLEN = { gozzo: 5, lancia: 6, barca_vela: 8, motoscafo: 7, peschereccio: 11, motovedetta: 13, nave: 44, rimorchiatore: 14, pedalo: 2.6, secca: 4.6 };
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
      [-1, 1].forEach(sg => [4, 7.5].forEach(s => SEA.moorings.push({ kind: 'pedalo', x: lx + sg * 2.6, y: ly + s, ang: sg > 0 ? Math.PI : 0, len: BOATLEN.pedalo, at: 'pontile_lido' }))); }
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
    blob(234, 78, 9, 6, i => { if (grid[i] !== T.VIA) grid[i] = T.DIRT; });              // piazzale della Stazione Nord
    blob(262, 324, 9, 6, i => { if (grid[i] !== T.VIA) grid[i] = T.DIRT; });             // piazzale della Stazione Sud
    blob(148, 176, 14, 10, i => { if (grid[i] === T.SHRUB || grid[i] === T.FIELD || grid[i] === T.TREE) grid[i] = T.GRASS; }); // accampamento dei beduini, in cima al Tavolato
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
        for (let k = 0; k < 8; k++) { const a = (k + .5) * Math.PI / 4, i = T2i(oy + Math.sin(a) * (orr - 4.5)) * GW + T2i(ox + Math.cos(a) * (orr - 4.5)); if (grid[i] === T.PIAZZA && roadW[i] === 0) grid[i] = T.TREE; } }
      // E3 la stazione in testa alla griglia: il fabbricato fra il binario e la Via della Stazione, il marciapiede col binario di corsa
      // (quello del treno: il pezzo non ne disegna un altro), il piazzale fino alla via; sul lato del mare il tronchino merci col
      // suo rilevato, la locomotiva da manovra e un carro fermi
      { const S = POSA.staz = { x0: 932, L: 30 };   /* [mappa_compatta] la stazione è la porta ovest della città */ S.xc = S.x0 + S.L / 2; S.ry = ryP(S.xc);
        const p = PZ('stazione', S.x0, S.ry + 13.25, 0, { L: S.L, piani: 2, binari: 0, piazzale: false, pensilina: true, orologio: true, nome: 'PORTO VECCHIO' }, { nome: 'Stazione' }); S.p = p;
        pzRis(p, 'B', -3, S.L + 3, -11.6, 6.4);
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
      // E1/E0 le mura di tramontana sugli scogli del borgo, a tratti di 20 m che seguono la costa; la scala di ronda dal lato della città
      { const xs = []; for (let x = 1128; x > 1040; x -= 12) xs.push(x);
        let scala = 3; xs.forEach((xe, k) => { const xw = Math.max(1040, xe - 12); if (xe - xw < 6) return; const P0 = [xe, ryP(xe) + 5.5], P1 = [xw, ryP(xw) + 5.5], L = dist(P0[0], P0[1], P1[0], P1[1]);
          const p = PZ('mura_tramontana', P0[0], P0[1], Math.atan2(-(P1[1] - P0[1]), P1[0] - P0[0]), { L, h: 7, merli: true, scala: false }, { nome: 'Mura di tramontana' });
          let free = k >= scala; if (free) pzCells(p, 0, L, -2.8, -1.2, i => { if (roadW[i] > 0) free = false; }); if (free && scala < 99) { p.opz.scala = true; scala = 99; }
          pzRis(p, 'B', 0, L, p.opz.scala ? -2.7 : -1.2, 2); }); }
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
        const yW = riva(xw) + 1.5, nW = Math.max(1, Math.ceil((yW - yN) / 28)), sW = (yW - yN) / nW;
        for (let k = 0; k < nW; k++) muro(xw, yN + k * sW, -Math.PI / 2, sW, { settore: 'SETTORE 1-' + 'EFGH'[k % 4] });
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
      { const [fx, fy] = CITY.piazzette[1]; PZ('fontana', fx, fy, 0, { r: 1.8, h: 2.4, lati: 8, cannelle: 2 }, { nome: 'Fontana del Forno' }); blob(fx, fy, 2.3, 2.3, i => { if (grid[i] !== T.BLD && roadW[i] === 0) grid[i] = T.FOUNT; }); }
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
          const A = lungo(Q, 2.6 / L), B2 = lungo(Q, 12.6 / L), dd = eAt(B2.x, B2.y) - eAt(A.x, A.y); cand.push({ rd, A, B2, dd }); });
        cand.sort((a, b) => b.dd - a.dd); POSA.scal = [];
        cand.forEach(c => { if (POSA.scal.length >= 3 || POSA.scal.some(o => Math.abs(o.A.x - c.A.x) < 14)) return;
          const ux = c.B2.x - c.A.x, uy = c.B2.y - c.A.y, l = Math.hypot(ux, uy) || 1, t = { x: c.A.x, y: c.A.y, rot: Math.atan2(-uy / l, ux / l) }; let ok = true;
          pzCells(t, -1.4, 11, -2.9, 2.9, i => { if (bIndex[i] >= 0 || grid[i] === T.PIAZZA || grid[i] === T.WATER || grid[i] === T.QUAY || (reserved[i] && roadW[i] === 0)) ok = false; }); if (!ok) return;
          const p = PZ('scalinata', c.A.x, c.A.y, Math.atan2(-uy / l, ux / l), { w: 2.4, dislivello: 2, pianerottoli: 0, lampada: true }, { nome: 'Scalinata di ' + c.rd.name, vicolo: c.rd.id, marina: true });
          p.B2 = [c.B2.x, c.B2.y]; pzRis(p, 'B', -1.4, 11, -2.9, 2.9); pzRis(p, 'C', -1.4, 11, -1.3, 1.3); POSA.scal.push(Object.assign(c, { p })); }); }
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
      [['caserma_p', 'caserma', 0, { piani: 2 }], ['hangar2', 'corpo_rocca', 0, { h: 17, merli: true, finestre: 1 }], ['deposito_n', 'corpo_rocca', 0, { h: 10, erba: true, finestre: 1 }],
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
        { const yT = mi ? (mi.y + mi.h / 2) * TS : R.yS - 9.5, p = PZ('torre_littoria', R.xe - .5, yT, Math.PI, { h: 28, scritta: 'ORDINE', orologio: true, balcone: true, antenna: true }, { nome: 'Torre littoria', recinto: true }); pzRis(p, 'B', -.3, 8.3, -5.2, 4.3); R.torreL = p; } }
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
      const x = 60 + r() * 780, y = 40 + r() * 330;   // [isola] tutta la testa e il collo
      const z = zoneAt(x, y); if (z !== Z.CAMPAGNA && z !== Z.MACCHIA && z !== Z.DESERTO) continue;
      if (z === Z.DESERTO || !OnLand0(x, y)) continue;   // [arcipelago] le isole sono disabitate          // il Tavolato è dei beduini: niente case
      const s = site(x, y, 4, 4, 2); if (!s || !flatOK(s[0], s[1], 4, 4, 1.4)) continue; stamp({ id: 'casa_' + (nH++), x: s[0], y: s[1], w: 4, h: 4, fl: 1, style: [4, 5, 8][k % 3], house: true, farm: true, wood: true });
    }
    // [isola] i borghi dei pescatori: casette basse sulla riva, sparse e storte, col pontile di legno e lo scalo
    const FISHP = [];
    [['pescatori_s', 'Borgo dei pescatori', 470, SouthY(470) - 21, 1], ['pescatori_n', 'Case della Tramontana', 566, NorthY(566) + 21, -1], ['pescatori_t', 'Capanni della Punta', 152, SouthY(152) - 21, 1]].forEach(([id, name, cx, cy, sd]) => {
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
    const ISLETS = [[14, 204, 4.2, 'faraglione_grande'], [6, 226, 3, 'faraglione_piccolo'], [24, 244, 2.4, 'scoglio_basso'], [346, 32, 3.2, 'scoglio_sirena'], [784, 34, 2.6, 'scoglio_monaco']];
    // [costa2] gli scogli sotto le mura di tramontana: una frangia di roccia che affiora a pochi metri dalla riva della città (la città non si
    // tocca, la riva sì: niente più bordo dritto). Le dice MAPPA_COMPATTA: «Baracche → Covo: gli scogli sotto le mura, con la bassa marea».
    C2SCOGLI.forEach(([x, dy, rr], k) => ISLETS.push([x, NorthY(x) - dy, rr, 'scoglio_mura_' + k]));
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
      bivacco_e: [1136, 206], campeggio_e: [1150, 212], covo: [1124, 98], ruderi: [1118, 170], grotta: [1100, 168], cava: [1150, 168],
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
    P('bivacco_o', 'Bivacco dei Pini', 284, 132, { camp: 'bivacco' }); P('monolite', 'Il Monolite', 322, 142, { camp: 'monolite' }); P('campeggio_o', 'Spiazzo della collina', 262, 138, { camp: 'tende' }); P('sorgente', 'Sorgente gelata', 244, 157, { camp: 'sorgente', scoperta: true }); P('rudere_o', 'Casale diroccato dei Pini', 300, 110, { camp: 'rudere' }); P('carbonaia', 'Carbonaia', 336, 168, { camp: 'carbonaia' }); P('pozzo_o', 'Spiazzo dei taglialegna', 214, 132, { camp: 'legna' });
    // periferia est e la Collina Nera
    P('salita', 'Salita della Collina Nera', 470, 128); P('monte', 'Collina Nera', 504, 132); P('vetta', 'Cima della Collina Nera', 518, 134);
    P('belvedere', 'Belvedere', 494, 120); P('bivacco_e', 'Bivacco della Collina Nera', 486, 138, { camp: 'bivacco' }); P('campeggio_e', 'Spiazzo della Collina Nera', 528, 128, { camp: 'tende' });
    P('covo', 'Il covo nel bunker delle mura', 506, 80, { hidden: true });   // [mappa_compatta] L6: sotto la vecchia vedetta, sulle mura di tramontana P('ruderi', 'Ruderi della Collina Nera', 512, 160, { camp: 'rudere' }); P('osservatorio', 'Vecchia vedetta', 496, 108, { camp: 'vedetta' }); P('grotta', 'La grotta', 470, 150, { camp: 'grotta', hidden: true }); P('cava', 'Cava della Collina Nera', 530, 150);
    P('spiaggia', 'Spiaggia gelata', 512, 198); P('passeggiata', 'Passeggiata a mare', 492, 194); P('discarica', 'Discarica di levante', 548, 184);
    // il Muro e la Base
    P('muro', 'Il Muro', 548, yc(548), { gate: true }); P('varco', 'Varco del Muro', 562, yc(562));
    P('poligono', 'Poligono della Base', 560, 178); P('eliporto', 'Eliporto della Base', 632, 134); P('molo_cargo', 'Porto cargo', 640, 200);
    // [cucitura] il Muro, il varco e il piazzale dei mezzi stanno nel Recinto del Garante (prima erano punti sulla spianata, con le file di jersey attorno)
    if (POSA.recinto) { const R = POSA.recinto; PN('muro', 'Il Muro', R.xw - 2, R.yN + 14, { gate: true }); PN('varco', 'Varco del Muro', R.gx - 3, 143); PN('poligono', 'Piazzale del Recinto', R.xe - 13, R.yN + 34); }   // [rocca2] il porto cargo sul molo a sud dello scoglio
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
    FISHP.forEach(([id, name, x, y]) => PN(id, name, x, y)); PN('piazza_gov', 'Piazza Grande', 919, 146);   // [cucitura] l'ex piazza d'adunata (l'id resta: skate, sottosuolo, missioni)
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
            const q = j * VW + i; if (fixed[q]) continue; const x = i * TS, y = j * TS, t = clamp(((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / L2, 0, 1), d = Math.hypot(x - ax - (bx - ax) * t, y - ay - (by - ay) * t);
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
      const S = .5;   // pendenza massima (m di salita per m di percorso): circa 26°
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
      eachV(740, 0, CITY.spian0, GH * TS, (i, j, x, y) => { const d = Math.abs(y - ry(x)); if (d > 2.3 || Math.abs(x - C.x) < 2.2) return; const h = Rf(x) - .45; if (h > vh[j * VW + i]) setV(i, j, h); });
      for (let ty = 0; ty < GH; ty++) for (let tx = T2i(740); tx < T2i(CITY.spian0); tx++) { const x = tx * TS + 1, y = ty * TS + 1; if (Math.abs(y - ry(x)) > 2.6 || Math.abs(x - C.x) < 2.2) continue; const i = ty * GW + tx; if (grid[i] === T.WATER) continue; elev[i] = Math.max(elev[i], Rf(x) - .35); }
      // 2) la Via Cavour: a terra fino al sottopasso, poi la scalinata fino al piano della Via della Stazione
      const Htop = vAt(C.x, C.y1), yTop = C.y1 - 3.5, d = Math.max(1, Htop - Lr), nPi = d > 2.6 ? 1 : 0, len = Math.round(d / .17) * .36 + nPi * 1.6 + .3;
      C.ps.y = Math.max(ry(C.x) + 7.5, yTop - len); C.ps.opz.dislivello = +d.toFixed(2); C.ps.opz.pianerottoli = nPi; C.ps.q = Lr;
      C.p.q = Lr; C.p.opz.hRilevato = +(Rf(C.x) - Lr - .25).toFixed(2);
      eachV(C.x - 2.1, C.y0, C.x + 2.1, C.y1 - 3.4, (i, j, x, y) => setV(i, j, y <= C.ps.y ? Lr : y >= C.ps.y + len ? Htop : Lr + (Htop - Lr) * (y - C.ps.y) / len));
      // 3) il piano della stazione: il marciapiede mezzo metro sopra il ferro; il piazzale scende o sale fino alla via
      if (S) { const Sq = Rf(S.xc) - .35; S.p.q = Sq; eachVL(S.p, -3, S.L + 3, -11.6, 6.4, (i, j) => setV(i, j, Sq));
        const yr = S.yRoad; eachVL(S.p, -4, S.L + 4, 6.4, yr - S.p.y + .9, (i, j, lx, lz) => { const hr = vAt(S.p.x + lx, yr + 1.5), t = Math.min(1, (lz - 6.4) / Math.max(1, yr - S.p.y - 6.4)); setV(i, j, Sq + (hr - Sq) * t); });
        const t = S.tr; let gq = 1e9; for (let lx = 0; lx <= 32; lx += 4) gq = Math.min(gq, vAt(...pzW(t, lx, 2))); t.q = gq; t.opz.hRilevato = +Math.max(.9, Rf(S.xc) - gq - .6).toFixed(2);
        [S.loco, S.carro].forEach(p => { p.q = Rf(p.x); }); }
      // 4) il fossato della Rocca: 5 m sotto la spianata, il ponte resta in quota
      // [rocca2] il canale è mare: il ponte e la porta stanno alla quota della spianata; il pezzo del canale scende sotto il pelo dell'acqua
      const F = FORT.posa; if (F) { const Sp = vAt(F.XF - F.CW - 3, F.gy); F.Sp = Sp;
        eachV(F.XF - F.CW, F.gy - 46, F.XF, F.gy + 46, (i, j, x, y) => { if (Math.abs(y - F.gy) <= 2.6) return; setV(i, j, -2); });
        PEZZI.forEach(p => { if (p.rocca === 'spianata') p.q = Sp; else if (p.rocca === 'canale') { p.q = Sp; p.opz.prof = Math.round((Sp + 1.8) * 100) / 100; p.opz.pelo = Math.round(Sp * 100) / 100; } }); }
      // 4b) la Piazza del Mercato: l'ottagono scende di 3 m da ponente a levante; il basolato della tettoia sta in piano (alla quota di mezzo)
      // e attorno, sui lati dove la piazza resta più alta, un muro di sostegno; dove resta più bassa, il gradone con la scala per salirci
      { const tt = PEZZI.find(p => p.tipo === 'tettoia_mercato'); if (tt && CITY.octa) { const [ox, oy, orr] = CITY.octa, ap = orr - 1.7, oct = (x, y) => { const dx = Math.abs(x - ox), dy = Math.abs(y - oy); return Math.max(dx, dy, (dx + dy) / Math.SQRT2); };
        const hs = []; eachV(ox - ap, oy - ap, ox + ap, oy + ap, (i, j, x, y) => { if (oct(x, y) <= ap) hs.push(vh[j * VW + i]); }); hs.sort((a, b) => a - b); const qm = hs[Math.floor(hs.length / 2)];
        const ring = []; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ring.push(vAt(ox + Math.cos(a) * (orr - .5), oy + Math.sin(a) * (orr - .5))); }
        const lato = (x, y) => ((Math.round(Math.atan2(y - oy, x - ox) / (Math.PI / 4)) % 8) + 8) % 8, giu = k => ring[k] < qm - .5, aw = k => giu(k) ? ap - .5 : ap + .1;   // dove la piazza scende il muro sta mezzo metro dentro (la scala ci sta davanti)
        eachV(ox - ap - 1, oy - ap - 1, ox + ap + 1, oy + ap + 1, (i, j, x, y) => { if (oct(x, y) <= aw(lato(x, y)) + .01) setV(i, j, qm); }); tt.q = qm;
        for (let k = 0; k < 8; k++) { const d = ring[k] - qm; if (Math.abs(d) < .5) continue; const a = k * Math.PI / 4, nx = Math.cos(a), ny = Math.sin(a), fx = d > 0 ? -nx : nx, fy = d > 0 ? -ny : ny, L = 2 * aw(k) * Math.tan(Math.PI / 8) - .3;
          const g = pzAt('gradone', ox + nx * aw(k), oy + ny * aw(k), Math.atan2(fx, fy), L / 2, 0, { L: +L.toFixed(2), h: +Math.abs(d).toFixed(2), P: d > 0 ? .8 : 2.4, rampa: false, scala: d < 0 && k % 2 === 0, ringhiera: d < 0 }, { nome: d > 0 ? 'Muro di sostegno del Mercato' : 'Gradone del Mercato' });
          g.q = +Math.min(qm, ring[k]).toFixed(2); } } }
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
      (POSA.scal || []).forEach(c => { const p = c.p, d0 = vAt(p.x, p.y), dd = Math.max(.6, vAt(...p.B2) - d0); p.q = d0; p.opz.dislivello = +dd.toFixed(2); p.opz.pianerottoli = dd > 3.2 ? 1 : 0; delete p.B2; });
      // 8) la quota di posa degli altri: il punto più basso dell'impronta (niente pezzi sospesi; dove il terreno sale, il pezzo ci entra)
      const QR = { campanile: [0, 4.4, -2.2, 2.2], facciata_chiesa: [0, 10, .4, 1.6], torre_littoria: [0, 8, -4, 4], tettoia_mercato: [8, 20, -6, 6], edicola_votiva: [-.4, .4, -.3, .3], pozzo: [-1, 1, -1, 1], fontana: [-2, 2, -2, 2],
        arco_sottopasso: [3, 4.4, -4.5, 4.5], arco_contrasto: [1.7, 2.7, -.4, .4], porta_terra: [5.6, 8.6, -3, 6], muro_garante: [0, 24, -.5, .5], palo_riflettori: [-.4, .4, -.4, .4], caserma: [0, 0, -3.5, 3.5], polveriera: [0, 0, -2.5, 2.5], torrione: [3, 13, -5, 5], passaggio_livello: [9, 13, -1, 1] };
      PEZZI.forEach(p => { if (p.q !== undefined) return; let r = p.tipo === 'portico' ? [0, p.opz.campate * p.opz.campata, 1.5, 2.1] : p.tipo === 'caserma' || p.tipo === 'polveriera' ? [0, p.opz.L, QR[p.tipo][2], QR[p.tipo][3]] : QR[p.tipo] || (p.imp && p.imp[0].slice(1)) || [-.5, .5, -.5, .5];
        const pts = [[r[0], r[2]], [r[1], r[2]], [r[1], r[3]], [r[0], r[3]], [(r[0] + r[1]) / 2, (r[2] + r[3]) / 2]]; p.q = Math.min(...pts.map(([a, b]) => vAt(...pzW(p, a, b))));
        if (p.tipo === 'passaggio_livello') p.q = Rf(pzW(p, 11, 0)[0]) - .45; });
      PEZZI.forEach(p => { p.q = Math.round(p.q * 100) / 100; });
      if (typeof process !== 'undefined' && process.env && process.env.PV_DBG) { const c = {}; PEZZI.forEach(p => { c[p.tipo] = (c[p.tipo] || 0) + 1; }); console.log('[posa] pezzi', PEZZI.length, JSON.stringify(c), 'rilevato al sottopasso', Rtop.toFixed(2), 'strada', Lr.toFixed(2)); }
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
    return { pezzi: PEZZI, recinto: POSA.recinto || null, glacis: CITY.glacis || null, railCity: CITY.rail, sets: CITY.sets, nodi: CITY.nodi, eco, ECO, monte, MF, feat, BRIDGES, CAVES, WALL, FORT, HILLS, VILLAGES: VILLAGES.map(q => [xn(q[0])].concat(q.slice(1))), districtAt: DistrictAt, yc: Yc, northY: NorthY, southY: SouthY, onLand: OnLand, inland: Inland, LAKE,
      DXF, DXC, XF, XG, XC, XE, xo, xn, SEA, COSTA, COSTA2, coastKind, coastKind2, ISOLE, LAGUNE, isleAt, isleIn, HEAD, TAV, CANALI, GOV, BF, bosco, RING, TUNNELS, tavR, canHalf, CAN0, CAN1, canFloor, TS, GW, GH, SIZE, SX, SY, T, Z, ZNAME, grid, zone, elev, velev, vh, VW, reach, bIndex, roadW, roads, lanes, BUILDINGS: B, PLACES, zoneAt, rawElev, CX, CY };
  }

  // ================= [arcipelago] LA MAPPA GRANDE =================
  // L'isola grande nasce come prima (generate, coordinate «di progetto» 0..1300 × 0..400), poi viene incollata al centro di
  // una mappa più grande: OX metri di mare a ovest, OY a nord, e altro mare a est e a sud. Tutto quello che il mondo espone
  // (caselle, quote, luoghi, strade, edifici, porto, mura, grotte, funzioni della riva) viene spostato di (OX, OY): gli altri
  // moduli vedono solo la mappa grande e non sanno niente dello spostamento. Le isole dell'arcipelago (coordinate di progetto,
  // anche negative) si generano qui sopra la mappa grande, poi si rifà il fondale di tutto il mare.
  const OX = 320, OY = 200, SX2 = SX + OX + 360, SY2 = SY + OY + 240, GW2 = SX2 / TS, GH2 = SY2 / TS, OTX = OX / TS, OTY = OY / TS;
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
    W.BUILDINGS.forEach(b => { b.x += OTX; b.y += OTY; if (b.door && !seen.has(b.door)) { seen.add(b.door); b.door[0] += OTX; b.door[1] += OTY; } (b.tiers || []).forEach(t => { t.x += OTX; t.y += OTY; });
      const S = b.shopFront; if (S) [S.door].concat(S.span || []).forEach(q => { if (q && !seen.has(q)) { seen.add(q); q[0] += OTX; q[1] += OTY; } }); });   // [botteghe]
    Object.values(W.PLACES).forEach(p => { p.tx += OTX; p.ty += OTY; p.x += OX; p.y += OY; if (p.want) p.want = [p.want[0] + OX, p.want[1] + OY]; });
    if (W.FORT) { const F0 = W.FORT, sh = P => P.map(([x, y]) => [x + OX, y + OY]);   // [città2]
      W.FORT = { bastions: F0.bastions.map(sh), ravelin: F0.ravelin.map(sh), walls: F0.walls.map(sh), gates: F0.gates.map(g => Object.assign({}, g, { x: g.x + OX, y: g.y + OY })),
        ditch: [F0.ditch[0] + OX, F0.ditch[1] + OY, F0.ditch[2] + OX, F0.ditch[3] + OY], x: F0.x + OX, y: F0.y + OY, tip: F0.tip + OX }; }
    const WL0 = W.WALL; W.WALL = Object.assign({}, WL0, { x: WL0.x + OX, tx: WL0.tx + OTX, gate: [WL0.gate[0] + OY, WL0.gate[1] + OY], y0: WL0.y0 + OY, y1: WL0.y1 + OY, towers: WL0.towers.map(q => [q[0] + OX, q[1] + OY]) });
    W.CAVES = W.CAVES.map(c => Object.assign({}, c, { path: c.path.map(q => [q[0] + OX, q[1] + OY]), rooms: c.rooms.map(q => [q[0] + OX, q[1] + OY].concat(q.slice(2))) }));
    W.VILLAGES = W.VILLAGES.map(q => [q[0] + OX, q[1] + OY].concat(q.slice(2)));
    W.LAKE = Object.assign({}, W.LAKE, { x: W.LAKE.x + OX, y: W.LAKE.y + OY });
    W.HEAD = { x: HEAD.x + OX, y: HEAD.y + OY, r: HEAD.r }; W.TAV = Object.assign({}, TAV, { x: TAV.x + OX, y: TAV.y + OY });
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
    Object.assign(W, {
      districtAt: (x, y) => y !== undefined && isleIn(x - OX, y - OY) > Inland0(x - OX, y - OY) - 18 ? 'isole' : DistrictAt0(x - OX),
      yc: x => Yc(x - OX) + OY, northY: x => NorthY(x - OX) + OY, southY: x => SouthY(x - OX) + OY,
      onLand: (x, y) => OnLand(x - OX, y - OY), inland: (x, y) => Inland(x - OX, y - OY),
      zoneAt: (x, y) => zoneAt(x - OX, y - OY), rawElev: (x, y) => rawElev(x - OX, y - OY), coastKind: (x, y) => coastKind(x - OX, y - OY), coastKind2: (x, y) => coastKind2(x - OX, y - OY),
      xo: x => xo(x - OX), xn: a => xn(a) + OX, bosco: (x, y) => bosco(x - OX, y - OY),
      isleAt: (x, y) => isleAt(x - OX, y - OY), isleIn: (x, y) => isleIn(x - OX, y - OY),
      DXF: DXF + OX, DXC: DXC + OX, XF: XF + OX, XG: XG + OX, XC: XC + OX, XE: XE + OX, CX: CX + OX, CY: CY + OY, OX, OY,
      GW: GW2, GH: GH2, VW: VW2, SX: SX2, SY: SY2, SIZE: SX2, grid, zone, elev, bIndex, roadW, feat, eco, reach, vh, velev,
    });
    void d2x; void d2y;
    // ---- le isole sulla mappa grande ----
    const ix = (tx, ty) => ty * GW2 + tx, toD = (tx, ty) => [tx * TS + 1 - OX, ty * TS + 1 - OY];
    const cellT = (tx, ty, C, p, sd) => { const x0 = tx * TS, y0 = ty * TS, ci = Math.floor((x0 + 1) / C), cj = Math.floor((y0 + 1) / C), px = (ci + .15 + .7 * hash2(ci, cj, 151 + sd)) * C, py = (cj + .15 + .7 * hash2(ci, cj, 152 + sd)) * C; return px >= x0 && px < x0 + TS && py >= y0 && py < y0 + TS && hash2(ci, cj, 153 + sd) < p; };
    const isl = new Uint8Array(N2);   // 1: casella di un'isola
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
    const vfix = (tx0, ty0, tx1, ty1) => { for (let j = Math.max(0, ty0); j <= Math.min(GH2, ty1); j++) for (let i2 = Math.max(0, tx0); i2 <= Math.min(GW2, tx1); i2++) {
      let s2 = 0, c = 0, wet = false, made = false, any = false;
      for (const [a, b2] of [[i2 - 1, j - 1], [i2, j - 1], [i2 - 1, j], [i2, j]]) { if (a < 0 || b2 < 0 || a >= GW2 || b2 >= GH2) { wet = true; continue; } const k = b2 * GW2 + a; if (isl[k]) any = true; if (grid[k] === T_.WATER) { wet = true; continue; } if (grid[k] === T_.QUAY || grid[k] === T_.PIER) made = true; s2 += elev[k]; c++; }
      if (!any) continue; vh[j * VW2 + i2] = velev[j * VW2 + i2] = c ? (wet && !made ? Math.min(s2 / c, .5) : s2 / c) : -2.2; } };
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
    const WL_SECCO = -.45 + .2, FATTO = new Set([T_.BLD, T_.VIA, T_.COB, T_.PIAZZA, T_.WALK, T_.STAIRS, T_.FOUNT, T_.QUAY, T_.PIER]);
    const fatto = (i, j) => { for (const [a, b] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]) { if (a < 0 || b < 0 || a >= GW2 || b >= GH2) continue; if (FATTO.has(grid[b * GW2 + a])) return true; } return false; };
    for (let j = 0; j <= GH2; j++) for (let i = 0; i <= GW2; i++) { const k = j * VW2 + i; if (vh[k] < WL_SECCO && fatto(i, j)) vh[k] = WL_SECCO; }
    for (let ty = 0; ty < GH2; ty++) for (let tx = 0; tx < GW2; tx++) { const i = ty * GW2 + tx; if (FATTO.has(grid[i])) { const k = ty * VW2 + tx; elev[i] = Math.max(elev[i], (vh[k] + vh[k + 1] + vh[k + VW2] + vh[k + VW2 + 1]) / 4); } }
    W.WL = -.45; W.WL_SECCO = WL_SECCO;
    W.quotaRiva = (i, j) => {   // la quota del terreno che si vede al vertice (i, j): quella del mondo, con la riva ammorbidita dove è naturale
      const ii = Math.max(0, Math.min(GW2, i)), jj = Math.max(0, Math.min(GH2, j)); let h = vh[jj * VW2 + ii];
      if (fatto(i, j)) return Math.max(h, WL_SECCO);
      const x = i * TS, y = j * TS, L = W.LAKE, lq = L ? Math.hypot((x - L.x) / L.rx, (y - L.y) / L.ry) : 9, lk = lq < 1.6;
      const ci = lq < 1.6 ? (lq - .9) * Math.min(L.rx, L.ry) : W.inland(x, y), b0 = lk ? L.h - 1.9 : -1.6;
      if (ci < 4) { const land = Math.max(lk ? L.h + .25 : .4, h > b0 + .6 ? h : .4), k = Math.max(0, Math.min(1, (ci + 1.2) / 5.2)); h = b0 + (land - b0) * k * k * (3 - 2 * k); }
      return h;
    };
    if (W.sets) W.luoghi = luoghi(W);
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
        if (k2 === 'frangiflutti') { if (h(11) < .55) A.tetrapodi.push({ x, y, r: h(12) * 6.28, t: h(13) * 6.28, s: .9 + h(14) * .25 }); continue; }
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
    [420, 505, 590].forEach(gx => { if (!lit) return; const X = gx + OX; let q0 = null, bd = 1e9; lit.pts.forEach(q => { const d = Math.abs(q[0] - X) + (q[1] < W.yc(q[0]) ? 1e4 : 0); if (d < bd) { bd = d; q0 = q; } }); if (!q0) return;
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
  const W = costa2Arredo(terrapieni(expand(generate())));
  W.preview = s => preview(W, s);
  // [botteghe] una bottega aperta a partita iniziata (economia, ordine, fazioni) sta anch'essa sotto casa se il fronte lo permette;
  // il portone resta dov'è. Torna true se la bottega ha il suo fronte.
  W.apriBottega = (b, piano) => { if (!b || !b.door || b.shopFront || (b.fl || 1) < 2 || W.zone[b.y * W.GW + b.x] !== W.Z.CITTA) return false;
    b.shopFront = { use: b.use, name: b.name, sign: b.sign, era: b.era || 'E3', piano: piano || 0 }; b.abitato = true;
    if (!shopGeom(b, W.grid, W.reach, W.GW, W.GH, true, null)) { delete b.shopFront; delete b.abitato; return false; } return true; };
  W.shopGeom = shopGeom;
  W.hash2 = hash2; W.fbm = fbm; W.rng = rng; W.monte = monte; W.MF = MF;
  return W;
})();
if (typeof module !== 'undefined') module.exports = World;
