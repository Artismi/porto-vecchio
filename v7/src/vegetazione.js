/* Porto Vecchio — [vegetazione] IL VERDE DELL'ISOLA, PENSATO COME LA CITTÀ (v7, città nuova).
   «La vegetazione va costruita come la città: gerarchie, strati, esplorabilità, radure e zone fitte, verdi scuri e chiari.»
   Un piano urbanistico del verde, come dato (gira anche in Node, sempre uguale: nessun Math.random, solo hash del posto):
   - LE FORMAZIONI (le grandi masse): pineta di pini domestici, pineta di pini marittimi sulla collina, lecceta scura sui versanti a
     tramontana, macchia alta, gariga sul calcare e sul vento, prato secco e radure, uliveto a terrazze, agrumeto e orti nelle conche,
     il verde dei torrenti (oleandri, tamerici, canne, fichi), l'eucalipteto del rimboschimento, i giardini pubblici, il verde di città.
     La riva (duna, canneto della foce, costiere coi fichi d'India e le agavi) è della chat della costa: qui resta COSTA e non si tocca.
   - GLI STRATI: alberi alti, alberi medi, arbusti, copertura bassa. Ogni formazione dice quali specie, a che passo e quanto fitte.
   - IL CONTRASTO: dentro ogni massa un campo di fittezza (rumore largo) fa le macchie scure e chiuse e le chiarie luminose; ai bordi
     il margine (arbusti bassi, fiori, erba alta), mai una linea.
   - L'ESPLORABILITÀ: i sentieri hanno un varco libero e leggibile (niente tronchi nel corridoio, arbusti bassi ai lati); i luoghi di
     campagna (il casale, la sorgente, il monolite, il bivacco, la carbonaia, l'eremo...) sono RADURE: punti di arrivo chiari, col loro
     albero-fulcro. La vegetazione guida lo sguardo e il cammino.
   - LE REGOLE: mai su strade, marciapiedi, porte, scale, percorsi dei tetti e davanti alle insegne (Chiarezza.davanti); in città solo
     dove il piano lo dice (viali, piazze-fulcro, giardini, cortili, muri).
   Vegetazione.piano(W) fa il piano; Vegetazione.pianta(W) lo scrive nella griglia (le caselle TREE sono i tronchi: si urtano e si
   abbattono). Il kit delle specie (geometrie a colori nei vertici, varianti per seme) e la posa a livelli (vicino il modello, a media
   distanza la chioma semplice, lontano la sagoma fusa in una sola geometria; l'erba solo vicino; il vento nel vertex shader) stanno
   più sotto e servono solo nel browser. ?vecchioverde: il verde di prima, per il confronto. */
var Vegetazione = (function () {
  'use strict';
  const QS = typeof location !== 'undefined' && location.search ? location.search : '';
  const SPENTO = /[?&]vecchioverde\b/.test(QS) || (typeof process !== 'undefined' && process.env && process.env.PV_VECCHIOVERDE === '1');

  // ================= LE MISURE =================
  function hash2(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  function vnoise(x, y, s) {
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = hash2(x0, y0, s), b = hash2(x0 + 1, y0, s), c = hash2(x0, y0 + 1, s), d = hash2(x0 + 1, y0 + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  const fbm = (x, y, s, o) => { let t = 0, a = .5, f = 1; for (let i = 0; i < (o || 3); i++) { t += a * vnoise(x * f, y * f, s + i * 17); a *= .5; f *= 2.03; } return t / (1 - Math.pow(.5, o || 3)); };
  const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const segD = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2)); return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t); };

  // ================= LA TAVOLOZZA: dal verde scuro bluastro all'oliva argento al giallo paglia =================
  // Voluta, non a caso: le masse chiuse stanno nei verdi freddi e scuri, gli alberi coltivati negli argenti, le radure nei gialli.
  const PAL = {
    // le masse scure (lecceta, pineta, macchia fitta)
    leccio: ['#24382f', '#2f4a3c', '#3d5c48'],          // il più scuro, bluastro, opaco
    pino: ['#2c4436', '#3a5642', '#4c6a4c'],            // ombrello verde scuro freddo
    pinoM: ['#33493a', '#43604a', '#587457'],           // marittimo e d'Aleppo: più chiaro e rado
    cipresso: ['#1f3328', '#2c4434', '#3a5640'],
    carrubo: ['#2e4630', '#3f5c3a', '#56744a'],         // lucido, caldo
    lentisco: ['#2d4632', '#3c5a3c', '#4f6e46'],
    mirto: ['#34502f', '#466638', '#5b7c44'],
    // i verdi medi e brillanti (coltivi, acqua)
    agrume: ['#2b4a26', '#3a6230', '#4f7c3a'],
    fico: ['#40602c', '#557a34', '#6c9040'],
    oleandro: ['#3e5c34', '#506e3e', '#62824a'],
    canna: ['#7a8a4a', '#94a258', '#b4b878'],
    edera: ['#22402a', '#2e5434', '#3e6a40'],
    // gli argenti (ulivo, eucalipto, rosmarino, agave, tamerice)
    ulivo: ['#5f6a52', '#7d8a6c', '#9caa88'],
    eucalipto: ['#5e6e5c', '#7c8c78', '#a2b09a'],
    rosmarino: ['#56644e', '#6e7e64', '#8c9a7c'],
    agave: ['#5e7a74', '#7a9890', '#9ab4aa'],
    tamerice: ['#6e7a62', '#8c967a', '#aab092'],
    ficodindia: ['#4e6a34', '#668440', '#80a050'],
    // i chiari (erba giovane, mandorlo, ginestra) e i gialli paglia
    mandorlo: ['#7c8e52', '#98aa64', '#b8c482'],
    ginestra: ['#4c6430', '#5e7836', '#748c40'],
    erbaVerde: ['#6c8a3a', '#86a448', '#a2bc5a'],
    erbaSecca: ['#a8945a', '#c4ac6c', '#dcc690'],
    finocchietto: ['#8c9640', '#a8ae4c', '#c8c45a'],
    // i suoli delle formazioni (la tinta a terra sotto le piante)
    aghi: '#8a6a48', lettiera: '#5a4e3a', paglia: '#c8b27a', terra: '#9a7a58',
    // i tronchi
    tPino: '#7a4632', tLeccio: '#3e3630', tUlivo: '#6a6456', tEuca: '#d6ccb8', tPalma: '#8a7656', tFico: '#9a948a', tCarrubo: '#4a3e34', tAgrume: '#5a4a3a', tMandorlo: '#4a3a32',
    // gli accenti, pochi e saturi
    fiorGinestra: '#ecc22c', fiorOleandro: '#ec8aa8', fiorOleandroB: '#f4ecdc', bouganville: '#c8287a', papavero: '#d83a24', arancia: '#f0962a', limone: '#f0d23a', mandorloFiore: '#f2dce0', rosmarinoFiore: '#8a9ad8', cappero: '#f0e6f0', finocchiettoFiore: '#d8c430',
  };

  // ================= LE SPECIE =================
  // strato: A alberi alti, M alberi medi, B arbusti, C copertura bassa. h: altezza [min, max] in m. tronco: il tronco fa casella TREE.
  // forma: la sagoma del kit. chioma: raggio della chioma (m) per la distanza minima fra gli alberi e la sagoma lontana. sag: la classe
  // della sagoma semplice (media distanza e lontano): ombrello, tondo, colonna, palma, cespo, rado
  const SP = {
    pino:        { nome: 'pino domestico', strato: 'A', h: [10, 14], chioma: 4.6, tronco: true, forma: 'ombrello', sag: 'ombrello', pal: 'pino', legno: 'tPino' },
    pinoM:       { nome: "pino marittimo e d'Aleppo", strato: 'A', h: [8, 12], chioma: 3.2, tronco: true, forma: 'aleppo', sag: 'rado', pal: 'pinoM', legno: 'tPino' },
    leccio:      { nome: 'leccio', strato: 'A', h: [7, 10], chioma: 3.4, tronco: true, forma: 'tondo', sag: 'tondo', pal: 'leccio', legno: 'tLeccio' },
    carrubo:     { nome: 'carrubo', strato: 'A', h: [6, 8], chioma: 4, tronco: true, forma: 'cupola', sag: 'tondo', pal: 'carrubo', legno: 'tCarrubo' },
    palma:       { nome: 'palma da datteri', strato: 'A', h: [7, 11], chioma: 3, tronco: true, forma: 'palma', sag: 'palma', pal: 'fico', legno: 'tPalma' },
    washingtonia:{ nome: 'washingtonia', strato: 'A', h: [11, 15], chioma: 1.8, tronco: true, forma: 'washingtonia', sag: 'palma', pal: 'oleandro', legno: 'tPalma' },
    eucalipto:   { nome: 'eucalipto', strato: 'A', h: [13, 18], chioma: 3.4, tronco: true, forma: 'eucalipto', sag: 'rado', pal: 'eucalipto', legno: 'tEuca' },
    cipresso:    { nome: 'cipresso', strato: 'A', h: [9, 13], chioma: 1, tronco: true, forma: 'colonna', sag: 'colonna', pal: 'cipresso', legno: 'tLeccio' },
    ulivo:       { nome: 'ulivo', strato: 'M', h: [4, 6], chioma: 2.8, tronco: true, forma: 'ulivo', sag: 'tondo', pal: 'ulivo', legno: 'tUlivo' },
    fico:        { nome: 'fico', strato: 'M', h: [3.5, 5], chioma: 3, tronco: true, forma: 'fico', sag: 'tondo', pal: 'fico', legno: 'tFico' },
    agrume:      { nome: 'agrume', strato: 'M', h: [3, 4.2], chioma: 1.7, tronco: true, forma: 'agrume', sag: 'tondo', pal: 'agrume', legno: 'tAgrume' },
    mandorlo:    { nome: 'mandorlo', strato: 'M', h: [4, 5.5], chioma: 2.4, tronco: true, forma: 'mandorlo', sag: 'rado', pal: 'mandorlo', legno: 'tMandorlo' },
    tamerice:    { nome: 'tamerice', strato: 'M', h: [3.5, 5], chioma: 2.4, tronco: true, forma: 'tamerice', sag: 'rado', pal: 'tamerice', legno: 'tUlivo' },
    lentisco:    { nome: 'lentisco', strato: 'B', h: [1.2, 2.4], chioma: 1.4, forma: 'cespo', sag: 'cespo', pal: 'lentisco' },
    mirto:       { nome: 'mirto', strato: 'B', h: [.9, 1.6], chioma: 1, forma: 'cespo', sag: 'cespo', pal: 'mirto' },
    ginestra:    { nome: 'ginestra', strato: 'B', h: [1, 1.8], chioma: .9, forma: 'ginestra', sag: 'cespo', pal: 'ginestra' },
    rosmarino:   { nome: 'rosmarino', strato: 'B', h: [.5, .9], chioma: .7, forma: 'cuscino', sag: 'cespo', pal: 'rosmarino' },
    oleandro:    { nome: 'oleandro', strato: 'B', h: [1.8, 3], chioma: 1.3, forma: 'oleandro', sag: 'cespo', pal: 'oleandro' },
    ficodindia:  { nome: "fico d'India", strato: 'B', h: [1.4, 2.4], chioma: 1.1, forma: 'pale', sag: 'cespo', pal: 'ficodindia' },
    agave:       { nome: 'agave', strato: 'B', h: [.8, 1.3], chioma: .9, forma: 'rosetta', sag: 'cespo', pal: 'agave' },
    canna:       { nome: 'canne', strato: 'B', h: [2.5, 3.6], chioma: .8, forma: 'canne', sag: 'cespo', pal: 'canna' },
    bouganville: { nome: 'bouganville', strato: 'B', h: [2.5, 4], chioma: 1.4, forma: 'muro', sag: 'cespo', pal: 'oleandro' },
    edera:       { nome: 'edera', strato: 'C', h: [1.5, 3.5], chioma: 1.2, forma: 'muro', sag: 'cespo', pal: 'edera' },
    erbaSecca:   { nome: 'erba secca', strato: 'C', h: [.35, .7], chioma: .3, forma: 'ciuffo', pal: 'erbaSecca' },
    erbaVerde:   { nome: 'erba verde', strato: 'C', h: [.25, .5], chioma: .3, forma: 'ciuffo', pal: 'erbaVerde' },
    finocchietto:{ nome: 'finocchietto', strato: 'C', h: [.8, 1.4], chioma: .3, forma: 'ombrelle', pal: 'finocchietto' },
    papavero:    { nome: 'papaveri', strato: 'C', h: [.35, .55], chioma: .3, forma: 'fiori', pal: 'erbaVerde' },
    vite:        { nome: 'pergola di vite', strato: 'B', h: [2.4, 2.8], chioma: 2, forma: 'pergola', sag: 'cespo', pal: 'fico' },
    cappero:     { nome: 'cappero', strato: 'C', h: [.4, .7], chioma: .4, forma: 'cuscino', pal: 'agrume' },
  };
  const SPECIE = Object.keys(SP);

  // ================= LE FORMAZIONI =================
  // tono: 0 scuro e chiuso ... 1 chiaro e aperto (per la mappa e per la tinta del suolo). strati: per ogni strato le specie [nome, peso],
  // il passo (m: lato della cella in cui nasce al più una pianta) e la probabilità base. La fittezza locale (campo F) moltiplica la
  // probabilità degli strati alti e divide quella della copertura: dove il bosco si chiude l'erba sparisce, nelle chiarie c'è il prato.
  const F = {};
  const FORM = [
    { id: 'niente', nome: '—', col: '#00000000', tono: .5, strati: [] },
    { id: 'pineta', nome: 'Pineta di pini domestici', col: '#2f5240', tono: .35, suolo: 'aghi',
      strati: [{ sp: [['pino', 1]], passo: 7.5, p: .92 }, { sp: [['lentisco', 4], ['mirto', 2], ['ginestra', 1]], passo: 5, p: .3 }, { sp: [['erbaSecca', 3], ['finocchietto', 1]], passo: 2.6, p: .25, basso: true }] },
    { id: 'pinetaM', nome: 'Pineta di pini marittimi', col: '#4a6a4a', tono: .45, suolo: 'aghi',
      strati: [{ sp: [['pinoM', 1]], passo: 6, p: .85 }, { sp: [['lentisco', 3], ['ginestra', 2], ['rosmarino', 1]], passo: 4, p: .38 }, { sp: [['erbaSecca', 2], ['finocchietto', 1]], passo: 2.5, p: .3, basso: true }] },
    { id: 'lecceta', nome: 'Lecceta (il bosco scuro)', col: '#1f3a2c', tono: .1, suolo: 'lettiera',
      strati: [{ sp: [['leccio', 8], ['carrubo', 1], ['pinoM', 1]], passo: 5.2, p: .9 }, { sp: [['mirto', 3], ['lentisco', 2], ['edera', 1]], passo: 3.4, p: .45 }, { sp: [['erbaVerde', 1]], passo: 3.2, p: .12, basso: true }] },
    { id: 'macchia', nome: 'Macchia alta', col: '#3c5a36', tono: .3, suolo: 'terra',
      strati: [{ sp: [['leccio', 3], ['carrubo', 2], ['pinoM', 2], ['ulivo', 1]], passo: 9, p: .6 }, { sp: [['lentisco', 5], ['mirto', 3], ['ginestra', 2], ['oleandro', .3]], passo: 2.6, p: .78 }, { sp: [['erbaSecca', 2], ['erbaVerde', 1], ['finocchietto', 1]], passo: 2.4, p: .25, basso: true }] },
    { id: 'gariga', nome: 'Gariga sul calcare', col: '#8e9670', tono: .78, suolo: 'paglia',
      strati: [{ sp: [['pinoM', 2], ['carrubo', 1], ['ulivo', 1]], passo: 22, p: .4 }, { sp: [['rosmarino', 5], ['ginestra', 3], ['lentisco', 1.5], ['ficodindia', 1], ['agave', .6]], passo: 2.6, p: .55 }, { sp: [['erbaSecca', 5], ['finocchietto', 2], ['papavero', .4]], passo: 1.8, p: .55, basso: true }] },
    { id: 'prato', nome: 'Prato secco e radure', col: '#cdb87c', tono: .95, suolo: 'paglia',
      strati: [{ sp: [['carrubo', 2], ['ulivo', 2], ['mandorlo', 1], ['pino', 1]], passo: 30, p: .3 }, { sp: [['lentisco', 2], ['ginestra', 2], ['rosmarino', 1]], passo: 7, p: .16 }, { sp: [['erbaSecca', 6], ['finocchietto', 2], ['erbaVerde', 1.5], ['papavero', .8]], passo: 1.4, p: .85, basso: true }] },
    { id: 'uliveto', nome: 'Uliveto a terrazze', col: '#909c78', tono: .7, suolo: 'terra',
      strati: [{ sp: [['ulivo', 1]], passo: 6.5, p: .95, filare: true }, { sp: [['ficodindia', 1], ['mandorlo', 1], ['ginestra', 1]], passo: 16, p: .25 }, { sp: [['erbaVerde', 3], ['erbaSecca', 3], ['papavero', 1.2], ['finocchietto', 1]], passo: 1.6, p: .6, basso: true }] },
    { id: 'agrumeto', nome: 'Agrumeto e orti', col: '#3e6a32', tono: .4, suolo: 'terra',
      strati: [{ sp: [['agrume', 6], ['fico', 1], ['cipresso', .6]], passo: 4.6, p: .9, filare: true }, { sp: [['canna', 1], ['oleandro', 1]], passo: 14, p: .2 }, { sp: [['erbaVerde', 3], ['papavero', .5]], passo: 2, p: .4, basso: true }] },
    { id: 'riparia', nome: 'Il verde dei torrenti', col: '#4c7a46', tono: .45, suolo: 'terra',
      strati: [{ sp: [['tamerice', 3], ['fico', 2], ['eucalipto', 1], ['carrubo', .5]], passo: 8, p: .55 }, { sp: [['oleandro', 4], ['canna', 4], ['mirto', 1]], passo: 2.6, p: .7 }, { sp: [['erbaVerde', 4], ['finocchietto', 1]], passo: 1.8, p: .5, basso: true }] },
    { id: 'eucalipteto', nome: 'Eucalipteto del rimboschimento', col: '#7e9282', tono: .6, suolo: 'lettiera',
      strati: [{ sp: [['eucalipto', 1]], passo: 8, p: .82, filare: true }, { sp: [['lentisco', 1], ['ginestra', 1]], passo: 6, p: .2 }, { sp: [['erbaSecca', 2]], passo: 2.4, p: .3, basso: true }] },
    { id: 'giardino', nome: 'Giardini pubblici', col: '#5a8a4a', tono: .55, suolo: 'terra',
      strati: [{ sp: [['pino', 3], ['palma', 2], ['washingtonia', 1], ['leccio', 1], ['eucalipto', .5]], passo: 11, p: .7 }, { sp: [['oleandro', 3], ['lentisco', 1], ['agave', 1]], passo: 5, p: .4 }, { sp: [['erbaVerde', 3], ['erbaSecca', 1]], passo: 1.8, p: .55, basso: true }] },
    { id: 'urbano', nome: 'Verde di città (viali, piazze, cortili, muri)', col: '#b07a5a', tono: .6, strati: [] },
    { id: 'costa', nome: 'La riva (della chat della costa)', col: '#d8c08a', tono: .8, strati: [] },
  ];
  FORM.forEach((f, i) => { F[f.id] = i; f.i = i; });

  // ================= LA MAPPA DELLE FORMAZIONI =================
  // dall'ambiente (eco) del generatore, che ha già la forma del paesaggio (versanti, valloni, terrazze, pianori), alla formazione
  // mediterranea; poi le regole che fanno la gerarchia: il mosaico dentro le masse, i versanti a tramontana scuri, le radure dei luoghi
  // le masse disegnate (x, y, raggio in m, formazione): i coltivi attorno ai casali e ai borghi del Monte, dove l'acqua e la gente ci sono
  const DISEGNO = [
    [1115, 387, 30, 'uliveto'],    // l'Uliveto delle terrazze, sotto la Cantina
    [1100, 405, 18, 'uliveto'],
    [1033, 399, 22, 'agrumeto'],   // il giardino d'agrumi della Masseria Sant'Elia, nella conca
    [1059, 283, 16, 'agrumeto'],   // gli orti e i limoni di San Giacomo
    [1046, 300, 14, 'uliveto'],
    [1055, 369, 20, 'eucalipteto'],// la valle del rimboschimento
    [1077, 397, 10, 'riparia'],    // la Fiumara dei Carbonai
  ];
  function formazioni(W) {
    const GW = W.GW, GH = W.GH, TS = W.TS, T = W.T, E = W.ECO || {}, Z = W.Z, N = GW * GH;
    const form = new Uint8Array(N), grid = W.grid, zone = W.zone, eco = W.eco || new Uint8Array(N), elev = W.elev, feat = W.feat || new Uint16Array(N);
    const nat = v => v === T.TREE || v === T.SHRUB || v === T.GRASS || v === T.DIRT || v === T.FIELD || v === T.ROCK || v === T.GRAVEL || v === T.SAND;
    // i Giardini di Ponente e la fascia fra la collina e la stazione (eco NONE fuori città): giardino e pineta della scarpata
    const giard = (W.nodi || []).find(n => /Giardini/.test(n.nome));
    const gbox = giard && giard.poly ? giard.poly.reduce((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)], [1e9, 1e9, -1e9, -1e9]) : null;
    for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) {
      const i = ty * GW + tx, v = grid[i], z = zone[i], x = tx * TS + 1, y = ty * TS + 1;
      if (z === Z.MARE && v === T.WATER) continue;
      if (z === Z.CITTA) { form[i] = F.urbano; continue; }
      if (!nat(v)) continue;
      const e = eco[i], m = fbm(x / 46, y / 46, 7101, 3), m2 = fbm(x / 22, y / 22, 7102, 2);
      let f = 0;
      if (e === E.COSTA || e === E.CANNETO || e === E.DUNA || e === E.PALMETO) f = F.costa;
      else if (e === E.ABETAIA) f = m < .3 ? F.macchia : m > .7 && m2 > .55 ? F.pinetaM : F.lecceta;          // il bosco scuro, con le chiarie di macchia
      else if (e === E.FAGGETA) f = m > .64 ? F.lecceta : m < .3 ? F.prato : m2 > .62 ? F.pinetaM : F.macchia;  // il versante al sole: macchia a mosaico
      else if (e === E.VALLONE || e === E.RIPARIALE) f = F.riparia;
      else if (e === E.PINETA) f = m < .26 ? F.prato : F.pineta;
      else if (e === E.MACCHIA) f = m < .34 ? F.gariga : F.macchia;
      else if (e === E.FARO || e === E.GHIAIONE) f = m > .7 ? F.macchia : F.gariga;
      else if (e === E.PASCOLO || e === E.RADURA || e === E.RUDERALE || e === E.SALINA) f = F.prato;
      else if (e === E.BETULLE) f = F.eucalipteto;
      else if (e === E.ULIVETO) f = F.uliveto;
      else if (e === E.VIGNE) f = elev[i] < 9 && m2 > .45 ? F.agrumeto : m < .4 ? F.prato : F.uliveto;
      else if (e === E.PINIMONTE) f = m < .28 ? F.prato : F.pinetaM;
      else if (e === E.ISOLA || e === E.GIUNGLA) f = m > .62 ? F.lecceta : m < .3 ? F.gariga : F.macchia;
      else if (e === E.NONE || !e) f = gbox && x >= gbox[0] - 4 && x <= gbox[2] + 4 && y >= gbox[1] - 4 && y <= gbox[3] + 4 ? F.giardino : F.pineta;
      else f = F.macchia;
      if (feat[i] & ((W.MF && W.MF.TERR) || 0) && f !== F.costa && f !== F.riparia) f = F.uliveto;   // le terrazze del Monte: l'uliveto
      for (const [zx, zy, zr, zf] of DISEGNO) if (f !== F.costa && Math.hypot(x - zx, y - zy) < zr * (.85 + .3 * m2)) f = F[zf];   // le masse disegnate a mano
      form[i] = f;
    }
    return form;
  }

  // ================= I LUOGHI: RADURE, FULCRI, SENTIERI =================
  // i luoghi di campagna che diventano radure (punti di arrivo): raggio, e l'albero-fulcro che le fa riconoscere da lontano
  const RADURE = {
    rudere_o: [16, 'ulivo'], sorgente: [12, 'fico'], monolite: [14, null], bivacco_o: [12, 'pino'], campeggio_o: [16, 'pino'], carbonaia: [12, null],
    pozzo_o: [12, 'carrubo'], radura: [18, 'carrubo'], ovile: [14, 'carrubo'], ovile_b: [12, 'carrubo'], eremo: [12, 'cipresso'], campo_p: [14, 'leccio'],
    bosco_antico: [16, 'leccio'], vecchio_3: [12, 'cipresso'], paese_vecchio: [14, 'fico'], passo: [12, 'pinoM'], neviera: [10, null], altopiano: [20, 'mandorlo'],
    beduini: [16, 'carrubo'], tavolato: [22, 'carrubo'], pizzo: [10, null], masseria: [16, 'carrubo'], cantina: [12, 'fico'], sangiacomo: [14, 'cipresso'],
    salinaio: [12, 'tamerice'], miniera: [14, 'eucalipto'], stazione2: [14, 'eucalipto'], stazione_n: [14, 'eucalipto'], stazione_s: [14, 'eucalipto'],
  };
  function luoghi(W) {
    const P = W.PLACES || {}, out = [];
    Object.keys(RADURE).forEach(k => { const p = P[k]; if (!p) return; const [r, ful] = RADURE[k]; out.push({ id: k, nome: p.name, x: p.x, y: p.y, r, fulcro: ful }); });
    return out;
  }
  // i sentieri e le strade fuori città: il corridoio libero (mezza larghezza in m) per gli alberi e per gli arbusti
  function sentieri(W) {
    return (W.roads || []).filter(rd => rd.pts && rd.pts.length > 1 && rd.kind !== 'citta' && rd.kind !== 'vicolo').map(rd => {
      const w = rd.w || 3, sent = w <= 3;
      return { id: rd.id, nome: rd.name, pts: rd.pts, w, sent, libA: w / 2 + (sent ? 1.8 : 2.6), libB: w / 2 + (sent ? .55 : 1.2), margine: w / 2 + (sent ? 3.5 : 4.5) };
    });
  }

  // ================= IL PIANO =================
  // Ritorna { form, piante: [{sp, x, y, h, rot, v (variante), t (tinta 0..1), f (formazione), fulcro?}], radure, sentieri, conti }.
  // Le piante della copertura bassa (strato C) non si elencano: nascono vicino alla camera dalla stessa regola (copertura()).
  let PIANO = null;
  function piano(W, opz) {
    opz = opz || {};
    if (PIANO && PIANO.W === W && !opz.rifai) return PIANO;
    const GW = W.GW, GH = W.GH, TS = W.TS, T = W.T, grid = W.grid, roadW = W.roadW, bIndex = W.bIndex;
    const form = formazioni(W), rad = luoghi(W), sen = sentieri(W);
    // griglie di aiuto: distanza dal sentiero più vicino (per casella), radura vicina
    const dSen = new Float32Array(GW * GH).fill(99), senOf = new Int16Array(GW * GH).fill(-1);
    sen.forEach((s, si) => { for (let k = 1; k < s.pts.length; k++) { const a = s.pts[k - 1], b = s.pts[k], pad = s.margine + 2;
      const x0 = Math.floor((Math.min(a[0], b[0]) - pad) / TS), x1 = Math.ceil((Math.max(a[0], b[0]) + pad) / TS), y0 = Math.floor((Math.min(a[1], b[1]) - pad) / TS), y1 = Math.ceil((Math.max(a[1], b[1]) + pad) / TS);
      for (let ty = Math.max(0, y0); ty <= Math.min(GH - 1, y1); ty++) for (let tx = Math.max(0, x0); tx <= Math.min(GW - 1, x1); tx++) { const i = ty * GW + tx, d = segD(tx * TS + 1, ty * TS + 1, a, b) - s.w / 2; if (d < dSen[i]) { dSen[i] = d; senOf[i] = si; } } } });
    const radAt = (x, y) => { let best = null, bd = 1e9; for (const r of rad) { const d = Math.hypot(x - r.x, y - r.y) / r.r; if (d < bd) { bd = d; best = r; } } return bd < 1.6 ? { r: best, q: bd } : null; };
    const tI = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return tx < 0 || ty < 0 || tx >= GW || ty >= GH ? -1 : ty * GW + tx; };
    // le porte di campagna (case, stazioni, casali): niente davanti
    const porte = []; (W.BUILDINGS || []).forEach(b => { if (b.door) porte.push([(b.door[0] + .5) * TS, (b.door[1] + .5) * TS]); });
    const PH = new Map(); porte.forEach(p => { const k = Math.floor(p[0] / 16) * 4096 + Math.floor(p[1] / 16); (PH.get(k) || PH.set(k, []).get(k)).push(p); });
    const vicinoPorta = (x, y, r) => { const i0 = Math.floor(x / 16), j0 = Math.floor(y / 16); for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) for (const p of PH.get(i * 4096 + j) || []) if (Math.hypot(x - p[0], y - p[1]) < r) return true; return false; };
    // il suolo che regge una pianta: per gli alberi terra naturale lontana da case e strade; per gli arbusti anche roccia e ghiaia (gariga)
    const suoloOk = (x, y, strato, raggio) => {
      const tx = Math.floor(x / TS), ty = Math.floor(y / TS); if (tx < 1 || ty < 1 || tx >= GW - 1 || ty >= GH - 1) return false;
      const rr = Math.ceil(raggio / TS);
      for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) { const j = (ty + dy) * GW + tx + dx, v = grid[j];
        if (v === T.BLD || v === T.WATER || v === T.CLIFF || v === T.FOUNT || v === T.PIER || v === T.QUAY || v === T.STAIRS || v === T.VIA || v === T.WALK || v === T.PIAZZA || v === T.COB) return false;
        if (roadW && roadW[j] > 0) return false; if (bIndex && bIndex[j] >= 0) return false; }
      const v = grid[ty * GW + tx];
      if (strato === 'A' || strato === 'M') return v === T.TREE || v === T.SHRUB || v === T.GRASS || v === T.DIRT || v === T.FIELD;
      return v !== T.SALT;
    };
    // la fittezza: il campo che fa le macchie fitte e scure e le chiarie (0 aperto ... 1 chiuso), più chiaro vicino ai sentieri
    const fitto = (x, y) => { const a = fbm(x / 38, y / 38, 7201, 3), b = fbm(x / 13, y / 13, 7202, 2); return sstep(.22, .78, a * .78 + b * .22); };
    const piante = [], conti = { A: 0, M: 0, B: 0, perForma: {}, perSpecie: {} };
    const occ = new Map(), OC = 4;   // gli alberi già posti, per la distanza fra le chiome
    const libero = (x, y, r) => { const i0 = Math.floor(x / OC), j0 = Math.floor(y / OC), R = Math.ceil(r / OC) + 2; for (let i = i0 - R; i <= i0 + R; i++) for (let j = j0 - R; j <= j0 + R; j++) for (const q of occ.get(i * 8192 + j) || []) if (Math.hypot(x - q[0], y - q[1]) < (r + q[2]) * .62) return false; return true; };
    const occupa = (x, y, r) => { const k = Math.floor(x / OC) * 8192 + Math.floor(y / OC); (occ.get(k) || occ.set(k, []).get(k)).push([x, y, r]); };
    const scegli = (L, u) => { let s = 0; L.forEach(q => s += q[1]); let a = u * s; for (const q of L) { a -= q[1]; if (a <= 0) return q[0]; } return L[L.length - 1][0]; };
    const posa = (sp, x, y, fi, extra) => { const S = SP[sp], k = hash2(Math.round(x * 7), Math.round(y * 7), 7301), hh = S.h[0] + (S.h[1] - S.h[0]) * hash2(Math.round(x * 5), Math.round(y * 5), 7302);
      const p = Object.assign({ sp, x, y, h: +hh.toFixed(2), rot: +(k * 6.2832).toFixed(3), v: Math.floor(hash2(Math.round(x * 3), Math.round(y * 3), 7303) * 4), t: +hash2(Math.round(x * 11), Math.round(y * 11), 7304).toFixed(3), f: fi }, extra || {});
      piante.push(p); conti[S.strato] = (conti[S.strato] || 0) + 1; conti.perSpecie[sp] = (conti.perSpecie[sp] || 0) + 1; conti.perForma[FORM[fi].id] = (conti.perForma[FORM[fi].id] || 0) + 1;
      if (S.strato === 'A' || S.strato === 'M') occupa(x, y, S.chioma); return p; };
    // 1) i fulcri delle radure: un albero grande, un po' di lato (non sul punto di arrivo), che si vede da lontano
    rad.forEach(r => { if (!r.fulcro) return; const a = hash2(Math.round(r.x), Math.round(r.y), 7401) * 6.2832;
      for (let t = 0; t < 6; t++) { const d = r.r * (.45 + t * .06), x = r.x + Math.cos(a + t * 1.1) * d, y = r.y + Math.sin(a + t * 1.1) * d, i = tI(x, y);
        if (i >= 0 && dSen[i] > 2.5 && suoloOk(x, y, 'A', 1) && !vicinoPorta(x, y, 4) && form[i] !== F.costa && form[i] !== F.urbano) { posa(r.fulcro, x, y, form[i] || F.prato, { fulcro: r.id, h: SP[r.fulcro].h[1] * 1.12 }); break; } } });
    // 2) gli strati delle formazioni (prima gli alberi, che fanno le chiome; poi gli arbusti nei vuoti)
    const STR = ['A', 'B'];
    STR.forEach(st => {
      FORM.forEach((fo, fi) => fo.strati.forEach((S, si) => {
        if (S.basso) return; const strato = SP[S.sp[0][0]].strato; if ((st === 'A') !== (strato === 'A' || strato === 'M')) return;
        const C = S.passo, n0 = Math.floor(0 / C), cx1 = Math.ceil(GW * TS / C), cy1 = Math.ceil(GH * TS / C), seed = 7500 + fi * 31 + si * 7;
        for (let cj = n0; cj < cy1; cj++) for (let ci = n0; ci < cx1; ci++) {
          // il punto della cella: a filare (uliveti, agrumeti, eucalipteti: un po' scomposto) o a caso
          const jx = S.filare ? .5 + (hash2(ci, cj, seed) - .5) * .22 : .12 + .76 * hash2(ci, cj, seed), jy = S.filare ? .5 + (hash2(ci, cj, seed + 1) - .5) * .22 : .12 + .76 * hash2(ci, cj, seed + 1);
          const x = (ci + jx) * C, y = (cj + jy) * C, i = tI(x, y); if (i < 0 || form[i] !== fi) continue;
          const fit = fitto(x, y), u = hash2(ci, cj, seed + 2);
          let p = S.p * (strato === 'B' ? .55 + .7 * fit : .35 + .9 * fit);
          // le radure: dentro niente alberi e pochi cespugli; sul margine arbusti bassi
          const R = radAt(x, y); if (R) { if (R.q < 1) p *= strato === 'B' ? .12 : 0; else if (R.q < 1.35 && strato !== 'B') p *= .3; }
          // i sentieri: il varco libero e leggibile; lungo il margine il bosco si dirada un poco (si vede dove si va)
          const ds = dSen[i], s = senOf[i] >= 0 ? sen[senOf[i]] : null;
          if (s) { if (strato === 'B' ? ds < s.libB - s.w / 2 : ds < s.libA - s.w / 2) continue; if (ds < s.margine - s.w / 2) p *= strato === 'B' ? .7 : .45; }
          if (u >= p) continue;
          const sp = scegli(S.sp, hash2(ci, cj, seed + 3)), SS = SP[sp];
          if (!suoloOk(x, y, SS.strato, SS.strato === 'B' ? 0 : 1)) continue;
          if (vicinoPorta(x, y, SS.strato === 'B' ? 2.5 : 4.5)) continue;
          if ((SS.strato === 'A' || SS.strato === 'M') && !libero(x, y, SS.chioma * (fi === F.lecceta ? .8 : 1))) continue;
          if (SS.strato === 'B' && !libero(x, y, .2)) continue;   // non dentro un tronco
          posa(sp, x, y, fi);
        }
      }));
    });
    PIANO = { W, form, piante, radure: rad, sentieri: sen, dSen, conti, fitto };
    return PIANO;
  }

  // ================= LA GRIGLIA: i tronchi sono caselle TREE =================
  // Fuori dalla città e dalla riva le caselle d'albero di prima diventano macchia o prato; sono TREE solo quelle dei tronchi del piano.
  // (Così si urta e si abbatte quello che si vede.) Non tocca strade, case, acqua, riva, città.
  function pianta(W) {
    if (SPENTO || !W || !W.grid || !W.eco) return null;
    const P = piano(W), GW = W.GW, TS = W.TS, T = W.T, grid = W.grid, form = P.form, cambi = { via: 0, nuovi: 0 };
    for (let i = 0; i < grid.length; i++) { const f = form[i]; if (!f || f === F.costa || f === F.urbano) continue;
      if (grid[i] === T.TREE) { const x = (i % GW) * TS + 1, y = Math.floor(i / GW) * TS + 1; grid[i] = fbm(x / 9, y / 9, 7601, 2) > .52 && f !== F.prato && f !== F.uliveto ? T.SHRUB : T.GRASS; cambi.via++; } }
    P.piante.forEach(p => { const S = SP[p.sp]; if (!S.tronco) return; const tx = Math.floor(p.x / TS), ty = Math.floor(p.y / TS), i = ty * GW + tx;
      if (grid[i] === T.SHRUB || grid[i] === T.GRASS || grid[i] === T.DIRT || grid[i] === T.FIELD) { grid[i] = T.TREE; cambi.nuovi++; } p.tile = i; });
    P.cambi = cambi; W.vegetazione = P;
    return P;
  }
  // la casella è del verde nuovo? (render.js: lì gli alberi vecchi non si disegnano). La riva e la città restano a chi le fa.
  function mia(W, i) { const P = W && W.vegetazione; if (!P) return false; const f = P.form[i]; return !!f && f !== F.costa && f !== F.urbano; }

  // la copertura bassa vicino alla camera: per ogni cella di ~1,2 m, se nasce qualcosa e che cosa (sempre uguale per il posto)
  function copertura(P, x, y) {
    const W = P.W, TS = W.TS, GW = W.GW, tx = Math.floor(x / TS), ty = Math.floor(y / TS); if (tx < 0 || ty < 0 || tx >= GW || ty >= W.GH) return null;
    const i = ty * GW + tx, fi = P.form[i]; if (!fi || fi === F.costa || fi === F.urbano) return null;
    const v = W.grid[i], T = W.T; if (v !== T.GRASS && v !== T.SHRUB && v !== T.DIRT && v !== T.TREE && v !== T.FIELD && v !== T.GRAVEL) return null;
    if (W.roadW && W.roadW[i] > 0) return null;
    const S = FORM[fi].strati.find(s => s.basso); if (!S) return null;
    const fit = P.fitto(x, y), ds = P.dSen[i];
    let p = S.p * (1.25 - fit * .9); if (ds < 1.2) p *= .25; else if (ds < 3) p *= 1.3;   // il bordo del sentiero è fiorito, il fondo pestato
    const u = hash2(Math.floor(x * 1.7), Math.floor(y * 1.7), 7701); if (u >= p) return null;
    let L = S.sp; if (fi === F.lecceta || fit > .8) L = [['erbaVerde', 1]];
    return { sp: (L.length === 1 ? L[0][0] : ((u2) => { let s = 0; L.forEach(q => s += q[1]); let a = u2 * s; for (const q of L) { a -= q[1]; if (a <= 0) return q[0]; } return L[0][0]; })(hash2(Math.floor(x * 1.7), Math.floor(y * 1.7), 7702))), t: hash2(Math.floor(x * 3), Math.floor(y * 3), 7703) };
  }

  // la misura del piano per la prova e per il foglio: densità per formazione (piante per ettaro), coperture, contrasto
  function misura(P) {
    const W = P.W, TS = W.TS, area = {}, out = {};
    for (let i = 0; i < P.form.length; i++) { const f = P.form[i]; if (f) area[f] = (area[f] || 0) + TS * TS; }
    FORM.forEach((fo, fi) => { if (!area[fi]) return; const n = { A: 0, B: 0 }; P.piante.forEach(p => { if (p.f === fi) n[SP[p.sp].strato === 'B' ? 'B' : 'A']++; });
      out[fo.id] = { ettari: +(area[fi] / 1e4).toFixed(2), alberiHa: +(n.A / (area[fi] / 1e4)).toFixed(1), arbustiHa: +(n.B / (area[fi] / 1e4)).toFixed(1) }; });
    return out;
  }


  // ================= IL KIT DELLE SPECIE (solo con THREE) =================
  // Geometrie a colori nei vertici, un solo materiale per livello: la chioma è fatta di masse (icosaedri deformati) con la normale
  // tonda (si leggono come volumi morbidi, non come sfaccettature), il tronco è un tubo a cinque lati. Il colore scende dalla luce
  // in cima (tinta chiara della specie) all'ombra sotto (tinta scura): l'occlusione è dipinta, non calcolata. L'attributo flex (0 alla
  // base, 1 in punta) dice quanto si piega col vento. Ogni specie ha 4 varianti (seme), più la sagoma semplice della sua classe.
  const KIT = typeof THREE === 'undefined' ? null : (function () {
    const TAU = Math.PI * 2;
    const rngK = s => { let a = (s >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
    const hx = h => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
    const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
    const pal3 = k => PAL[k].map(hx);
    function Acc() {
      const P = [], N = [], C = [], X = [];
      const v = (p, n, c, f) => { P.push(p[0], p[1], p[2]); N.push(n[0], n[1], n[2]); C.push(c[0], c[1], c[2]); X.push(f); };
      return {
        v,
        // triangolo con la sua normale piana
        tri(a, b, c, ca, cb, cc, fa, fb, fc) { const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], wx = c[0] - a[0], wy = c[1] - a[1], wz = c[2] - a[2];
          let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l; const n = [nx, ny, nz];
          v(a, n, ca, fa); v(b, n, cb || ca, fb === undefined ? fa : fb); v(c, n, cc || ca, fc === undefined ? fa : fc); },
        n: () => P.length / 3,
        build() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
          g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setAttribute('flex', new THREE.Float32BufferAttribute(X, 1)); g.computeBoundingSphere(); g.computeBoundingBox(); return g; },
      };
    }
    // le sfere di base (non indicizzate) per livello di dettaglio
    const ICO = [0, 1, 2].map(d => { const g = new THREE.IcosahedronGeometry(1, d).toNonIndexed(); return g.attributes.position.array.slice(); });
    // una massa di chioma: c centro, r raggi [x,y,z], tinte [scura, media, chiara], det dettaglio, jit irregolarità, H altezza dell'albero
    function massa(A, c, r, pal, det, jit, H, seed, opz) {
      opz = opz || {}; const p = ICO[det], key = (x, y, z) => Math.round(x * 97) * 7919 + Math.round(y * 97) * 131 + Math.round(z * 97), cache = new Map();
      const sq = opz.schiaccia || 0, tono = opz.tono || 0, lumi = opz.lumi === undefined ? 1 : opz.lumi;
      for (let i = 0; i < p.length; i += 9) {
        const tri = [];
        for (let k = 0; k < 3; k++) { const x = p[i + k * 3], y = p[i + k * 3 + 1], z = p[i + k * 3 + 2], kk = key(x, y, z);
          let d = cache.get(kk); if (d === undefined) { d = 1 + (hash2(kk & 0xffff, kk >> 16, seed) - .5) * 2 * jit; cache.set(kk, d); }
          let yy = y; if (sq && y < 0) yy = y * (1 - sq);   // il fondo piatto (ombrello, cuscino)
          const P = [c[0] + x * r[0] * d, c[1] + yy * r[1] * d, c[2] + z * r[2] * d];
          // la luce dipinta: in alto e verso sud-ovest (il sole del gioco) più chiaro, sotto scuro
          const t = Math.max(0, Math.min(1, .5 + y * .42 + (x * .35 - z * .25) * .25 + tono + (hash2(kk & 0xffff, 3, seed + 1) - .5) * .18));
          const col = mul(t < .5 ? mix(pal[0], pal[1], t * 2) : mix(pal[1], pal[2], (t - .5) * 2), lumi);
          tri.push([P, [x, y * (sq && y < 0 ? .6 : 1), z], col, Math.min(1, Math.max(0, P[1] / H)) ** 1.3]);
        }
        tri.forEach(([P, n, col, f]) => { const l = Math.hypot(n[0], n[1], n[2]) || 1; A.v(P, [n[0] / l, n[1] / l, n[2] / l], col, f * (opz.flex === undefined ? 1 : opz.flex)); });
      }
    }
    // la chioma vera: un nucleo scuro (riempie i buchi) e tante ciocche piccole sulla superficie dell'involucro, ognuna col suo tono
    // (in alto e al sole chiare, sotto e dentro scure): la chioma si legge come fogliame, non come una palla. n ciocche da 20 facce.
    function chioma(A, c, r, pal, H, seed, n, opz) {
      opz = opz || {}; const rr = rngK(seed * 7 + 1), fondo = opz.fondo || 0, cs = opz.ciocca || .34, fl = opz.flex === undefined ? 1 : opz.flex;
      massa(A, c, [r[0] * .82, r[1] * .8, r[2] * .82], pal, 1, .12, H, seed, { tono: -.22 + (opz.tono || 0), schiaccia: fondo, flex: fl });
      for (let k = 0; k < n; k++) {
        const u = (k + .5) / n, yy = 1 - 2 * Math.pow(u, opz.alto || .8), rad = Math.sqrt(Math.max(0, 1 - yy * yy)), th = k * 2.39996 + rr() * .6;
        let dx = Math.cos(th) * rad, dy = yy, dz = Math.sin(th) * rad; if (fondo && dy < -.3) dy = -.3 - (dy + .3) * (1 - fondo) * .3;
        const d = .78 + rr() * .2, cc = [c[0] + dx * r[0] * d, c[1] + dy * r[1] * d, c[2] + dz * r[2] * d], sz = cs * (.75 + rr() * .5);
        const t = dy * .32 + (dx * .5 - dz * .35) * .18 + (rr() - .5) * .16 + (opz.tono || 0);
        const m0 = Math.min(r[0], r[2]) * sz; massa(A, cc, [m0, Math.min(r[1] * sz * 1.8, m0) * (opz.allunga || 1), m0], pal, 0, .18, H, seed * 31 + k, { tono: t, flex: fl });
      }
    }
    // il tronco: tubo lungo una spezzata, a 5 lati (4 da lontano), raggi per punto; colore con l'ombra alla base
    function tubo(A, pts, rr, col, H, lati, opz) {
      lati = lati || 5; opz = opz || {}; const c0 = hx(col), cD = mul(c0, .62), anelli = opz.anelli;
      const ring = (k) => { const p = pts[k], q = pts[Math.min(pts.length - 1, k + 1)], o = pts[Math.max(0, k - 1)]; let dx = q[0] - o[0], dy = q[1] - o[1], dz = q[2] - o[2]; const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
        let ax = 1, ay = 0, az = 0; if (Math.abs(dx) > .9) { ax = 0; az = 1; } let ux = dy * az - dz * ay, uy = dz * ax - dx * az, uz = dx * ay - dy * ax; const ul = Math.hypot(ux, uy, uz) || 1; ux /= ul; uy /= ul; uz /= ul;
        const wx = dy * uz - dz * uy, wy = dz * ux - dx * uz, wz = dx * uy - dy * ux, R = []; for (let s = 0; s < lati; s++) { const a = s / lati * TAU, cs = Math.cos(a), sn = Math.sin(a); R.push([p[0] + (ux * cs + wx * sn) * rr[k], p[1] + (uy * cs + wy * sn) * rr[k], p[2] + (uz * cs + wz * sn) * rr[k], ux * cs + wx * sn, uy * cs + wy * sn, uz * cs + wz * sn]); } return R; };
      const RS = pts.map((_, k) => ring(k));
      for (let k = 0; k < pts.length - 1; k++) for (let s = 0; s < lati; s++) { const a = RS[k][s], b = RS[k][(s + 1) % lati], c = RS[k + 1][(s + 1) % lati], d = RS[k + 1][s];
        const ka = anelli ? (k % 2 ? .82 : 1) : 1, tA = Math.min(1, pts[k][1] / 2.2), tB = Math.min(1, pts[k + 1][1] / 2.2), side = .86 + .14 * Math.cos(s / lati * TAU - .8);
        const cA = mul(mix(cD, c0, tA), side * ka), cB = mul(mix(cD, c0, tB), side * ka), fA = (pts[k][1] / H) ** 2 * .35, fB = (pts[k + 1][1] / H) ** 2 * .35;
        A.v(a.slice(0, 3), a.slice(3), cA, fA); A.v(b.slice(0, 3), b.slice(3), cA, fA); A.v(c.slice(0, 3), c.slice(3), cB, fB);
        A.v(a.slice(0, 3), a.slice(3), cA, fA); A.v(c.slice(0, 3), c.slice(3), cB, fB); A.v(d.slice(0, 3), d.slice(3), cB, fB); }
    }
    // i puntini (fiori, frutti): un piccolo ottaedro
    function punto(A, p, s, col, f) { const c = hx(col), O = [[s, 0, 0], [-s, 0, 0], [0, s, 0], [0, -s, 0], [0, 0, s], [0, 0, -s]], F8 = [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]];
      F8.forEach(([a, b, d]) => A.tri([p[0] + O[a][0], p[1] + O[a][1], p[2] + O[a][2]], [p[0] + O[b][0], p[1] + O[b][1], p[2] + O[b][2]], [p[0] + O[d][0], p[1] + O[d][1], p[2] + O[d][2]], mul(c, O[d][1] > 0 || O[a][1] > 0 ? 1.08 : .8), null, null, f)); }
    // una lama (foglia lunga, fronda, canna, filo d'erba): striscia che si piega, larga w alla base, appuntita in cima
    function lama(A, base, dir, L, w, cad, col0, col1, H, seg, opz) {
      seg = seg || 4; opz = opz || {}; const c0 = hx(col0), c1 = hx(col1); const side = [-dir[2], 0, dir[0]]; const sl = Math.hypot(side[0], side[2]) || 1; side[0] /= sl; side[2] /= sl;
      const P = [], W = []; for (let k = 0; k <= seg; k++) { const t = k / seg, y = base[1] + dir[1] * L * t - cad * L * t * t; P.push([base[0] + dir[0] * L * t, y, base[2] + dir[2] * L * t]); W.push(w * (opz.foglia ? Math.sin(Math.PI * Math.min(1, t * 1.15 + .08)) : (1 - t * .92))); }
      for (let k = 0; k < seg; k++) { const a = P[k], b = P[k + 1], wa = W[k], wb = W[k + 1], ca = mix(c0, c1, k / seg), cb = mix(c0, c1, (k + 1) / seg), fa = Math.min(1, a[1] / H) * (opz.flex || 1), fb = Math.min(1, b[1] / H) * (opz.flex || 1);
        const al = [a[0] - side[0] * wa, a[1], a[2] - side[2] * wa], ar = [a[0] + side[0] * wa, a[1], a[2] + side[2] * wa], bl = [b[0] - side[0] * wb, b[1], b[2] - side[2] * wb], br = [b[0] + side[0] * wb, b[1], b[2] + side[2] * wb];
        if (opz.v) { al[1] += wa * .35; ar[1] += wa * .35; bl[1] += wb * .35; br[1] += wb * .35; const am = a.slice(), bm = b.slice(); A.tri(al, am, bm, ca, ca, cb, fa, fa, fb); A.tri(al, bm, bl, ca, cb, cb, fa, fb, fb); A.tri(am, ar, br, ca, ca, cb, fa, fa, fb); A.tri(am, br, bm, ca, cb, cb, fa, fb, fb); }
        else { A.tri(al, ar, br, ca, ca, cb, fa, fa, fb); A.tri(al, br, bl, ca, cb, cb, fa, fb, fb); } }
    }
    // le forme delle specie: (A, H, r, sp) con H l'altezza di riferimento (le istanze si scalano su h/H)
    const FORME = {
      ombrello(A, H, r, S, v) { const p = pal3(S.pal), lean = (.05 + r() * .08) * H, a = r() * TAU, lx = Math.cos(a) * lean, lz = Math.sin(a) * lean, tT = H * .74;
        const pts = [0, .2, .45, .7, .9, 1].map(t => [lx * t ** 1.7 + Math.sin(t * 6 + v) * .12, tT * t, lz * t ** 1.7 + Math.cos(t * 5 + v) * .08]);
        tubo(A, pts, [.034, .028, .025, .022, .02, .017].map(k => k * H), PAL[S.legno], H);
        const top = pts[5], R = SP.pino.chioma * (H / 12) * (.92 + r() * .16), cy = H * .87, NB = 5 + (v % 2);
        for (let k = 0; k < NB; k++) { const b = k / NB * TAU + r() * .5, e = [top[0] + Math.cos(b) * R * .6, cy - H * .01, top[2] + Math.sin(b) * R * .6]; tubo(A, [top, [(top[0] + e[0]) / 2, top[1] + (e[1] - top[1]) * .75, (top[2] + e[2]) / 2], e], [.013 * H, .009 * H, .005 * H], PAL[S.legno], H, 4); }
        chioma(A, [top[0], cy + H * .02, top[2]], [R, H * .085, R], p, H, v * 11 + 1, 44, { fondo: .85, ciocca: .26, tono: .02 });
        for (let k = 0; k < 3; k++) { const b = r() * TAU, d = R * .45; chioma(A, [top[0] + Math.cos(b) * d, cy + H * .07, top[2] + Math.sin(b) * d], [R * .42, H * .05, R * .42], p, H, v * 11 + 5 + k, 7, { fondo: .9, ciocca: .4, tono: .12 }); } },
      aleppo(A, H, r, S, v) { const p = pal3(S.pal), a = r() * TAU, lean = (.1 + r() * .12) * H, lx = Math.cos(a) * lean, lz = Math.sin(a) * lean;
        const pts = [0, .25, .5, .75, 1].map(t => [lx * t ** 1.4 + Math.sin(t * 7 + v) * .25, H * .82 * t, lz * t ** 1.4 + Math.cos(t * 6 + v) * .2]);
        tubo(A, pts, [.03, .025, .02, .016, .012].map(k => k * H), PAL[S.legno], H);
        const NC = 4 + (v % 3);
        for (let k = 0; k < NC; k++) { const t = .45 + k / NC * .5, q = pts[Math.min(4, Math.round(t * 4))], b = r() * TAU, d = (.8 + r() * 1.3) * (1.1 - t * .4), e = [q[0] + Math.cos(b) * d, H * (.5 + t * .4), q[2] + Math.sin(b) * d];
          tubo(A, [q, e], [.01 * H, .006 * H], PAL[S.legno], H, 4); chioma(A, e, [1 + r() * .6, .5 + r() * .25, 1 + r() * .6], p, H, v * 13 + k, 9, { fondo: .7, ciocca: .38 }); }
        chioma(A, [pts[4][0], H * .9, pts[4][2]], [1.4, .7, 1.4], p, H, v * 13 + 9, 10, { fondo: .6, ciocca: .38, tono: .08 }); },
      tondo(A, H, r, S, v) { const p = pal3(S.pal), F = H * (.3 + r() * .06), bx = (r() - .5) * .3, bz = (r() - .5) * .3, R = S.chioma * .95;
        tubo(A, [[0, 0, 0], [bx * .3, F * .5, bz * .3], [bx, F, bz], [bx, F + 1.2, bz]], [.22, .18, .15, .1], PAL[S.legno], H);
        for (let k = 0; k < 3; k++) { const b = k / 3 * TAU + r(); tubo(A, [[bx, F - .2, bz], [bx + Math.cos(b) * R * .5, F + 1.4, bz + Math.sin(b) * R * .5]], [.1, .05], PAL[S.legno], H, 4); }
        const cy = F + (H - F) * .52, ry = (H - F) * .52;
        chioma(A, [bx, cy, bz], [R, ry, R], p, H, v * 17 + 1, 46, { ciocca: .3, fondo: .25 });
        for (let k = 0; k < 3; k++) { const b = k / 3 * TAU + r() * .7, d = R * .55; chioma(A, [bx + Math.cos(b) * d, cy - ry * .3, bz + Math.sin(b) * d], [R * .5, ry * .45, R * .5], p, H, v * 17 + k + 2, 6, { ciocca: .45, fondo: .3, tono: -.04 }); } },
      cupola(A, H, r, S, v) { const p = pal3(S.pal), R = S.chioma * (.9 + r() * .2), F = H * .3;
        tubo(A, [[0, 0, 0], [.1, F * .6, 0], [.05, F, .05]], [.32, .26, .22], PAL[S.legno], H);
        for (let k = 0; k < 3; k++) { const b = k / 3 * TAU + r(); tubo(A, [[.05, F, .05], [Math.cos(b) * R * .45, F + H * .22, Math.sin(b) * R * .45]], [.16, .08], PAL[S.legno], H, 4); }
        chioma(A, [0, H * .62, 0], [R, H * .36, R], p, H, v * 19 + 1, 48, { ciocca: .27, fondo: .55, alto: .7 }); },
      palma(A, H, r, S, v) { const p = pal3(S.pal), a = r() * TAU, lean = (.04 + r() * .1) * H, lx = Math.cos(a) * lean, lz = Math.sin(a) * lean;
        const NS = 8, pts = []; for (let k = 0; k <= NS; k++) { const t = k / NS; pts.push([lx * t * t, H * .86 * t, lz * t * t]); }
        tubo(A, pts, pts.map((_, k) => .34 - k * .012), PAL[S.legno], H, 6, { anelli: true });
        const top = pts[NS]; massa(A, [top[0], top[1] + .1, top[2]], [.55, .5, .55], [hx('#5a4a2e'), hx('#7a6a40'), hx('#8a8a48')], 1, .2, H, v + 3);
        const NF = 16; for (let k = 0; k < NF; k++) { const b = k / NF * TAU + r() * .3, up = k % 2 ? .55 : .2 + r() * .15, L = 3.2 + r() * .8, dir = [Math.cos(b) * .85, up, Math.sin(b) * .85];
          lama(A, [top[0], top[1] + .35, top[2]], dir, L, .42, .55 + (1 - up) * .35, '#4e6a30', k % 3 ? '#7a9a44' : '#8aa24a', H, 5, { foglia: true, v: true }); }
        if (v % 2) for (let k = 0; k < 4; k++) { const b = k / 4 * TAU + .4; punto(A, [top[0] + Math.cos(b) * .6, top[1] - .2, top[2] + Math.sin(b) * .6], .22, '#e09a2a', .9); } },
      washingtonia(A, H, r, S, v) { const lean = (.02 + r() * .05) * H, a = r() * TAU, NS = 8, pts = []; for (let k = 0; k <= NS; k++) { const t = k / NS; pts.push([Math.cos(a) * lean * t, H * .9 * t, Math.sin(a) * lean * t]); }
        tubo(A, pts, pts.map((_, k) => .26 - k * .014), PAL[S.legno], H, 5, { anelli: true });
        const top = pts[NS]; massa(A, [top[0], top[1] - .7, top[2]], [.75, 1.1, .75], [hx('#4a3a28'), hx('#6a5438'), hx('#8a7048')], 1, .15, H, v + 5);   // la gonna di foglie secche
        for (let k = 0; k < 14; k++) { const b = k / 14 * TAU, up = .25 + (k % 3) * .2, dir = [Math.cos(b), up, Math.sin(b)];
          lama(A, [top[0], top[1] + .1, top[2]], dir, 1.7, .55, .25, '#4a6a3a', '#7a9a52', H, 3, { foglia: true }); } },
      eucalipto(A, H, r, S, v) { const p = pal3(S.pal), pts = [0, .3, .6, .85, 1].map((t, k) => [Math.sin(t * 4 + v) * .35, H * .9 * t, Math.cos(t * 3 + v) * .25]);
        tubo(A, pts, [.32, .22, .16, .1, .06], PAL[S.legno], H);
        const NC = 6; for (let k = 0; k < NC; k++) { const t = .45 + k / NC * .5, b = r() * TAU, d = 1.2 + r() * 1.4, q = pts[Math.min(4, Math.round(t * 4))], e = [q[0] + Math.cos(b) * d, H * t, q[2] + Math.sin(b) * d];
          tubo(A, [q, e], [.08, .04], PAL[S.legno], H, 4); chioma(A, [e[0], e[1] - .4, e[2]], [1 + r() * .4, 1.6 + r() * .6, 1 + r() * .4], p, H, v * 23 + k, 8, { ciocca: .42, allunga: 1.5 }); }
        chioma(A, [pts[4][0], H * .95, pts[4][2]], [1.2, 1.4, 1.2], p, H, v * 23 + 9, 8, { ciocca: .42, tono: .08 }); },
      colonna(A, H, r, S, v) { const p = pal3(S.pal); tubo(A, [[0, 0, 0], [0, .9, 0]], [.2, .16], PAL[S.legno], H);
        chioma(A, [0, H * .5, 0], [.95, H * .5, .95], p, H, v * 29 + 1, 56, { ciocca: .5, allunga: .35, tono: -.04 });
        massa(A, [0, H * .95, 0], [.28, H * .08, .28], p, 0, .1, H, v * 29 + 9, { tono: .12 }); },
      ulivo(A, H, r, S, v) { const p = pal3(S.pal), N2 = 2 + (v % 2);
        massa(A, [0, .25, 0], [.45, .35, .45], [hx('#4e4a40'), hx('#6a6456'), hx('#7a7466')], 1, .25, H, v + 41, { flex: 0 });   // il ceppo gonfio
        const tips = []; for (let k = 0; k < N2; k++) { const b = k / N2 * TAU + r(), d = .9 + r() * .7, e = [Math.cos(b) * d, H * (.45 + r() * .12), Math.sin(b) * d];
          tubo(A, [[Math.cos(b) * .12, 0, Math.sin(b) * .12], [Math.cos(b + .8) * .35, H * .2, Math.sin(b + .8) * .3], [e[0] * .7, e[1] * .8, e[2] * .7], e], [.2, .16, .12, .08], PAL[S.legno], H); tips.push(e); }
        const NC = 5; for (let k = 0; k < NC; k++) { const t = tips[k % tips.length], b = r() * TAU, d = .5 + r() * 1.1;
          chioma(A, [t[0] + Math.cos(b) * d, H * (.64 + r() * .24), t[2] + Math.sin(b) * d], [1.05 + r() * .4, .55 + r() * .25, 1.05 + r() * .4], p, H, v * 31 + k, 10, { fondo: .5, ciocca: .36 }); } },
      fico(A, H, r, S, v) { const p = pal3(S.pal), R = S.chioma;
        for (let k = 0; k < 4; k++) { const b = k / 4 * TAU + r() * .6, e = [Math.cos(b) * R * .55, H * .55, Math.sin(b) * R * .55]; tubo(A, [[0, 0, 0], [Math.cos(b) * .3, H * .22, Math.sin(b) * .3], e], [.16, .12, .07], PAL[S.legno], H, 5); }
        chioma(A, [0, H * .66, 0], [R, H * .33, R], p, H, v * 37 + 1, 34, { fondo: .6, ciocca: .36, tono: .04 }); },
      agrume(A, H, r, S, v) { const p = pal3(S.pal), R = S.chioma; tubo(A, [[0, 0, 0], [0, H * .3, 0]], [.1, .08], PAL[S.legno], H);
        chioma(A, [0, H * .6, 0], [R, H * .42, R], p, H, v * 43 + 1, 30, { ciocca: .32 });
        const fr = v % 2 ? PAL.limone : PAL.arancia, rr = rngK(v * 991 + 7); for (let k = 0; k < 22; k++) { const b = rr() * TAU, e = rr() * 1.2 - .5, c = Math.cos(e); punto(A, [Math.cos(b) * c * R * 1.02, H * .6 + Math.sin(e) * H * .42, Math.sin(b) * c * R * 1.02], .11, fr, .8); } },
      mandorlo(A, H, r, S, v) { const fiore = v === 3, p = fiore ? [hx('#b8989c'), hx('#e0c4c8'), hx(PAL.mandorloFiore)] : pal3(S.pal);
        const tips = []; for (let k = 0; k < 4; k++) { const b = k / 4 * TAU + r() * .5, e = [Math.cos(b) * 1.4, H * .72, Math.sin(b) * 1.4]; tubo(A, [[0, 0, 0], [0, H * .3, 0], [e[0] * .5, H * .5, e[2] * .5], e], [.13, .1, .06, .03], PAL[S.legno], H, 4); tips.push(e); }
        tips.forEach((t, k) => chioma(A, [t[0], t[1] + .2, t[2]], [1.05, .7, 1.05], p, H, v * 47 + k, 7, { ciocca: .38, tono: .06 })); chioma(A, [0, H * .84, 0], [.9, .6, .9], p, H, v * 47 + 9, 6, { ciocca: .4, tono: .1 }); },
      tamerice(A, H, r, S, v) { const p = v === 2 ? [hx('#9a7a7a'), hx('#c09aa0'), hx('#dcbcc0')] : pal3(S.pal);
        for (let k = 0; k < 3; k++) { const b = k / 3 * TAU + r(), e = [Math.cos(b) * 1.1, H * .62, Math.sin(b) * 1.1]; tubo(A, [[0, 0, 0], [Math.cos(b) * .4, H * .3, Math.sin(b) * .4], e], [.12, .08, .04], PAL[S.legno], H, 4);
          chioma(A, [e[0], e[1] + .1, e[2]], [1, 1.3, 1], p, H, v * 53 + k, 9, { ciocca: .4, allunga: 1.4, tono: .04 }); } },
      cespo(A, H, r, S, v) { const p = pal3(S.pal), R = S.chioma * (.9 + r() * .2);
        chioma(A, [0, H * .48, 0], [R, H * .5, R], p, H, v * 59 + 1, 16 + (v % 2) * 4, { fondo: .7, ciocca: .42, flex: .5 });
        if (S === SP.mirto && v === 1) { const rr = rngK(v + 77); for (let k = 0; k < 10; k++) { const b = rr() * TAU; punto(A, [Math.cos(b) * R * .8, H * (.5 + rr() * .45), Math.sin(b) * R * .8], .05, '#f4f0e8', .5); } } },
      ginestra(A, H, r, S, v) { const n = 22; for (let k = 0; k < n; k++) { const b = r() * TAU, s = r() * .55, dir = [Math.cos(b) * (.15 + s * .5), 1, Math.sin(b) * (.15 + s * .5)], L = H * (.7 + r() * .35);
          lama(A, [Math.cos(b) * s * .4, 0, Math.sin(b) * s * .4], dir, L, .05, .1, PAL.ginestra[1] || '#5e7836', '#748c40', H, 3, { flex: .8 });
          if (v !== 2) for (let j = 0; j < 3; j++) punto(A, [Math.cos(b) * s * .4 + dir[0] * L * (.6 + j * .14), L * (.6 + j * .14) - .1 * (.6 + j * .14) ** 2 * L, Math.sin(b) * s * .4 + dir[2] * L * (.6 + j * .14)], .09, PAL.fiorGinestra, .8); }
        massa(A, [0, H * .35, 0], [S.chioma * .6, H * .35, S.chioma * .6], pal3('ginestra'), 0, .2, H, v + 61, { flex: .4 }); },
      cuscino(A, H, r, S, v) { const p = pal3(S.pal), R = S.chioma; massa(A, [0, H * .45, 0], [R, H * .55, R], p, 1, .22, H, v * 67 + 1, { schiaccia: .7, flex: .3 });
        massa(A, [R * .4, H * .35, -R * .3], [R * .6, H * .45, R * .6], p, 0, .2, H, v * 67 + 2, { schiaccia: .7, flex: .3 });
        const fc = S === SP.cappero ? PAL.cappero : PAL.rosmarinoFiore, rr = rngK(v * 7 + 3); if (v % 2 === 0) for (let k = 0; k < 14; k++) { const b = rr() * TAU, d = rr() * R * .8; punto(A, [Math.cos(b) * d, H * (.6 + rr() * .35), Math.sin(b) * d], .05, fc, .4); } },
      oleandro(A, H, r, S, v) { const p = pal3(S.pal), R = S.chioma, fc = v === 1 ? PAL.fiorOleandroB : v === 2 ? '#d84a6a' : PAL.fiorOleandro;
        for (let k = 0; k < 5; k++) { const b = k / 5 * TAU + r(); tubo(A, [[0, 0, 0], [Math.cos(b) * R * .4, H * .55, Math.sin(b) * R * .4]], [.04, .025], '#6a5a44', H, 3); }
        chioma(A, [0, H * .55, 0], [R, H * .48, R], p, H, v * 71 + 1, 20, { ciocca: .4, allunga: 1.2, fondo: .4, flex: .7 });
        const rr = rngK(v * 13 + 1); for (let k = 0; k < 40; k++) { const b = rr() * TAU, e = rr() * 1.3 - .2, c = Math.cos(e); punto(A, [Math.cos(b) * c * R * .95, H * (.55 + Math.sin(e) * .46), Math.sin(b) * c * R * .95], .1, fc, .8); } },
      pale(A, H, r, S, v) { const p = pal3(S.pal), rr = rngK(v * 17 + 5);
        const pala = (c, a, t, s, liv) => { massa(A, c, [.42 * s, .55 * s, .1 * s], p, 0, .08, H, Math.floor(c[0] * 100 + c[2] * 37 + liv), { flex: .15 });
          if (liv < 2) for (let k = 0; k < 2; k++) { const b = a + (k ? .7 : -.7) + (rr() - .5) * .4, nc = [c[0] + Math.cos(b) * .45 * s, c[1] + .6 * s, c[2] + Math.sin(b) * .45 * s * .4]; if (rr() < .85) pala(nc, b, t, s * .92, liv + 1); }
          else if (rr() < .7) for (let k = 0; k < 3; k++) punto(A, [c[0] + (k - 1) * .18 * s, c[1] + .55 * s, c[2]], .07, k % 2 ? '#d8603a' : '#e0b03a', .2); };
        for (let k = 0; k < 3; k++) { const b = k / 3 * TAU + rr(); pala([Math.cos(b) * .4, .5, Math.sin(b) * .4], Math.PI / 2, 0, 1 + rr() * .2, 0); } },
      rosetta(A, H, r, S, v) { const n = 18; for (let k = 0; k < n; k++) { const b = k / n * TAU * 2.3 + r() * .2, up = .55 + (k % 3) * .25, L = H * (1 + r() * .3) * (k < 6 ? .7 : 1);
          lama(A, [0, .05, 0], [Math.cos(b) * (1 - up * .5), up, Math.sin(b) * (1 - up * .5)], L, .14, .3 * (1 - up), PAL.agave[0], PAL.agave[2], H, 3, { v: true, flex: .1 }); }
        if (v === 3) { tubo(A, [[0, .3, 0], [.1, 2.5, 0], [.2, 4.8, .05]], [.08, .06, .04], '#7a7a48', 5, 4); for (let k = 0; k < 6; k++) { const y = 3 + k * .32, b = k * 2.1; massa(A, [.15 + Math.cos(b) * .35, y, Math.sin(b) * .35], [.3, .12, .3], [hx('#8a8a38'), hx('#b8a840'), hx('#e0c850')], 0, .1, 5, k + 3); } } },
      canne(A, H, r, S, v) { for (let k = 0; k < 26; k++) { const b = r() * TAU, s = r() * .7, L = H * (.7 + r() * .35), dir = [Math.cos(b) * s * .25, 1, Math.sin(b) * s * .25];
          lama(A, [Math.cos(b) * s * .5, 0, Math.sin(b) * s * .5], dir, L, .035, .05, '#8a9a58', '#b8b878', H, 3, { flex: 1 });
          if (k % 2) lama(A, [Math.cos(b) * s * .5, L * .5, Math.sin(b) * s * .5], [Math.cos(b + 1.5), .3, Math.sin(b + 1.5)], .8, .07, .5, PAL.canna[0], PAL.canna[2], H, 3, { foglia: true, flex: 1 });
          if (k % 4 === 0) punto(A, [dir[0] * L, L + .1, dir[2] * L], .12, '#c8b890', 1); } },
      muro(A, H, r, S, v) { const p = pal3(S.pal), boug = S === SP.bouganville, R = S.chioma;   // contro un muro: la faccia piatta a z=0, verso +z
        for (let k = 0; k < 5; k++) { const x = (k - 2) * R * .38 + (r() - .5) * .3, y = H * (.35 + r() * .55); massa(A, [x, y, .2], [R * .55, H * .32, .45], p, 1, .2, H, v * 73 + k, { flex: .5 }); }
        if (boug) { const rr = rngK(v * 3 + 9); for (let k = 0; k < 70; k++) punto(A, [(rr() - .5) * R * 2, H * (.2 + rr() * .8), .35 + rr() * .3], .11 + rr() * .05, k % 5 ? PAL.bouganville : '#e05aa0', .6); }
        tubo(A, [[0, 0, .15], [.1, H * .4, .2]], [.08, .06], '#5a4a3a', H, 4); },
      pergola(A, H, r, S, v) { const p = pal3(S.pal), L = 3.2, D = 2.6;   // la vite sul telaio: quattro pali, le travi, il tetto di foglie, i grappoli
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([i, j]) => tubo(A, [[i * L / 2, 0, j * D / 2], [i * L / 2, H, j * D / 2]], [.06, .05], '#6a5440', H, 4));
        for (let k = 0; k < 4; k++) { const z = -D / 2 + k * D / 3; tubo(A, [[-L / 2 - .2, H, z], [L / 2 + .2, H, z]], [.04, .04], '#7a6248', H, 4); }
        tubo(A, [[-L / 2, 0, -D / 2], [-L / 2 + .1, H * .5, -D / 2 + .1], [-L / 4, H + .1, 0]], [.07, .05, .03], '#5a4432', H, 4);   // il ceppo della vite che sale
        for (let k = 0; k < 9; k++) { const x = -L / 2 + (k % 3 + .5) * L / 3 + (r() - .5) * .4, z = -D / 2 + (Math.floor(k / 3) + .5) * D / 3 + (r() - .5) * .3;
          massa(A, [x, H + .18, z], [.75 + r() * .2, .22, .62 + r() * .2], p, 1, .25, H, v * 83 + k, { schiaccia: .6, flex: .3, tono: .05 }); }
        const rr = rngK(v * 7 + 11); for (let k = 0; k < 6; k++) { const x = (rr() - .5) * L * .8, z = (rr() - .5) * D * .8; for (let j = 0; j < 4; j++) punto(A, [x + (j % 2) * .07, H - .15 - j * .07, z + (j > 1 ? .06 : 0)], .06, v % 2 ? '#4a2a4a' : '#a8b050', .3); } },
      ciuffo(A, H, r, S, v) { const c0 = PAL[S.pal][0], c1 = PAL[S.pal][2], n = 7; for (let k = 0; k < n; k++) { const b = k / n * TAU + r() * .5, s = .2 + r() * .5;
          lama(A, [Math.cos(b) * .05, 0, Math.sin(b) * .05], [Math.cos(b) * s, 1, Math.sin(b) * s], H * (.7 + r() * .4), .045, .25, c0, c1, H, 2, { flex: 1 }); } },
      ombrelle(A, H, r, S, v) { for (let k = 0; k < 4; k++) { const b = k / 4 * TAU + r(), s = .12 + r() * .15, L = H * (.75 + r() * .3), tip = [Math.cos(b) * s * L, L, Math.sin(b) * s * L];
          lama(A, [0, 0, 0], [Math.cos(b) * s, 1, Math.sin(b) * s], L, .025, .02, '#7a8a40', '#a0a848', H, 2, { flex: 1 });
          massa(A, tip, [.16, .04, .16], [hx('#a8a030'), hx(PAL.finocchiettoFiore), hx('#e8d850')], 0, .1, H, v * 5 + k, { flex: 1 }); }
        FORME.ciuffo(A, H * .4, r, SP.erbaVerde, v); },
      fiori(A, H, r, S, v) { FORME.ciuffo(A, H * .7, r, SP.erbaVerde, v); for (let k = 0; k < 4; k++) { const b = r() * TAU, s = r() * .25, L = H * (.8 + r() * .3);
          lama(A, [0, 0, 0], [Math.cos(b) * s, 1, Math.sin(b) * s], L, .015, .02, '#6a8a3a', '#7a9a44', H, 2, { flex: 1 }); punto(A, [Math.cos(b) * s * L, L, Math.sin(b) * s * L], .07, PAL.papavero, 1); } },
    };
    // la sagoma semplice (media distanza, lontano): poche facce, colore in scala di grigi (la tinta della specie la mette l'istanza)
    const GRIGIO = [[.42, .42, .42], [.72, .72, .72], [1, 1, 1]], LEGNO = [.45, .36, .3];
    function sagoma(cls, H, det, conTronco) {
      const A = Acc(), sfera = (c, r, opz) => massa(A, c, r, GRIGIO, det, .12, H, 5, opz);
      const tr = (h, r) => { if (conTronco) tubo(A, [[0, 0, 0], [0, h, 0]], [r, r * .7], '#6a5a4a', H, 4); };
      if (cls === 'ombrello') { tr(H * .78, .03 * H); sfera([0, H * .86, 0], [H * .36, H * .1, H * .36], { schiaccia: .5 }); }
      else if (cls === 'tondo') { tr(H * .4, .2); sfera([0, H * .64, 0], [H * .36, H * .36, H * .36]); }
      else if (cls === 'colonna') { sfera([0, H * .5, 0], [H * .1, H * .52, H * .1]); }
      else if (cls === 'palma') { tr(H * .86, .25); for (let k = 0; k < 6; k++) { const b = k / 6 * TAU; lama(A, [0, H * .88, 0], [Math.cos(b), .25, Math.sin(b)], H * .32, H * .05, .5, '#9a9a9a', '#ffffff', H, 2, { foglia: true }); } }
      else if (cls === 'rado') { tr(H * .7, .03 * H); sfera([0, H * .8, 0], [H * .22, H * .2, H * .22]); sfera([H * .15, H * .6, H * .05], [H * .14, H * .14, H * .14]); }
      else { sfera([0, H * .45, 0], [H * .62, H * .5, H * .62], { schiaccia: .5 }); }
      // il legno della sagoma resta scuro: la parte bassa del colore la tinge appena
      return A.build();
    }
    // la cache dei modelli: specie × variante (vicino), classe (media distanza)
    const CACHE = {}, HREF = {};
    function modello(sp, v) { const k = sp + v; if (CACHE[k]) return CACHE[k]; const S = SP[sp], H = (S.h[0] + S.h[1]) / 2, A = Acc(); HREF[sp] = H;
      FORME[S.forma](A, H, rngK(hash2(sp.length * 31, v, 911) * 1e9), S, v); return (CACHE[k] = A.build()); }
    function sempl(cls) { const k = '§' + cls; return CACHE[k] || (CACHE[k] = sagoma(cls, 10, 0, true)); }
    const H0 = sp => { const S = SP[sp]; return (S.h[0] + S.h[1]) / 2; };
    // la tinta media della specie (per le sagome): la tinta media della tavolozza
    const tinta = sp => { const p = PAL[SP[sp].pal]; return hx(p[1]); };
    return { Acc, massa, tubo, lama, punto, FORME, modello, sempl, sagoma, H0, tinta, hx, mix };
  })();

  // ================= IL MATERIALE: vento, livelli, dissolvenza =================
  // Un MeshLambertMaterial coi colori nei vertici; il vertex shader legge il centro dell'istanza (o l'attributo centro, per la geometria
  // fusa da lontano), calcola la distanza dalla camera e il peso k della fascia del livello (uBand: entra fra x e y, esce fra z e w);
  // il fragment shader dissolve a retino (niente trasparenze da ordinare). Sotto k ≈ 0 la pianta si chiude in un punto: niente disegno.
  const U = typeof THREE === 'undefined' ? null : { uT: { value: 0 }, uCam: { value: new THREE.Vector3() }, uWind: { value: .06 } };
  function materiale(band, opz) {
    opz = opz || {};
    const m = new THREE.MeshLambertMaterial({ vertexColors: true, side: opz.dueFacce === false ? THREE.FrontSide : THREE.DoubleSide });
    const uBand = { value: new THREE.Vector4(band[0], band[1], band[2], band[3]) }; m.userData.uBand = uBand;
    m.onBeforeCompile = sh => {
      sh.uniforms.uT = U.uT; sh.uniforms.uCam = U.uCam; sh.uniforms.uWind = U.uWind; sh.uniforms.uBand = uBand;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
uniform float uT; uniform vec3 uCam; uniform vec4 uBand; uniform float uWind; attribute float flex; varying float vK;
#ifdef VEG_CENTRO
attribute vec3 centro;
#endif`).replace('#include <begin_vertex>', `#include <begin_vertex>
vec3 vc;
#ifdef USE_INSTANCING
vc = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
#elif defined(VEG_CENTRO)
vc = (modelMatrix * vec4(centro, 1.0)).xyz;
#else
vc = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
#endif
float vgD = distance(vc.xz, uCam.xz);
vK = smoothstep(uBand.x, uBand.y, vgD) * (1.0 - smoothstep(uBand.z, uBand.w, vgD));
float vgP = vc.x * .21 + vc.z * .17;
transformed.x += (sin(uT * 1.7 + vgP) + .4 * sin(uT * 3.9 + vgP * 2.3)) * flex * uWind;
transformed.z += cos(uT * 1.3 + vgP * 1.3) * flex * uWind * .6;
#ifdef VEG_CENTRO
if (vK < .003) transformed = centro;
#else
if (vK < .003) transformed = vec3(0.0);
#endif`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vK;').replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
if (vK < .999) { float vgN = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715)))); if (vK < vgN) discard; }`);
    };
    if (opz.centro) m.defines = { VEG_CENTRO: '' };
    m.customProgramCacheKey = () => 'veg' + (opz.centro ? 'C' : '') + (opz.dueFacce === false ? 'F' : 'D');
    return m;
  }

  const api = { SP, SPECIE, PAL, FORM, F, RADURE, SPENTO, piano, pianta, mia, copertura, misura, formazioni, hash2, fbm, KIT, U, materiale };
  return api;
})();
if (typeof module !== 'undefined') module.exports = Vegetazione;
