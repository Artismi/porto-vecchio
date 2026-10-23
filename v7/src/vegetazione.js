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
    aghi: '#8c7a5c', lettiera: '#5a4e3a', paglia: '#c8b27a', terra: '#9a7a58',
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
    erbaSecca:   { nome: 'erba secca', strato: 'C', h: [.35, .7], chioma: .3, forma: 'ciuffo', pal: 'erbaSecca', erbe: ['erbaSecca', 'erbaSecca2', 'prato', 'erbaSecca2'] },
    erbaVerde:   { nome: 'erba verde', strato: 'C', h: [.25, .5], chioma: .3, forma: 'ciuffo', pal: 'erbaVerde', erbe: ['erbaVerde', 'erbaVerde2', 'trifoglio', 'prato'] },
    avena:       { nome: 'avena selvatica', strato: 'C', h: [.6, 1], chioma: .3, forma: 'ciuffoAlto', cella: 'avena', pal: 'erbaSecca' },
    cardo:       { nome: 'cardo', strato: 'C', h: [.7, 1.2], chioma: .4, forma: 'ciuffoAlto', cella: 'cardo', pal: 'rosmarino' },
    asfodelo:    { nome: 'asfodelo', strato: 'C', h: [.7, 1.1], chioma: .3, forma: 'ciuffoAlto', cella: 'asfodelo', pal: 'erbaVerde' },
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
  // Come si fanno piante vere e leggere: la chioma è un NUCLEO scuro (una massa che chiude i buchi, dipinta di foglie in scala di
  // grigi e tinta dalla specie) e attorno tante CARTE di foglie (quadrati con un rametto dipinto nell'atlante, ritagliato dall'alfa):
  // il contorno si sfrangia, la luce passa fra le carte, l'ombra a terra viene a chiazze. Le carte hanno la normale tonda (dal centro
  // della chioma), così la chioma si illumina come un volume e non come cento foglietti; ogni carta ha le due facce (due avvolgimenti,
  // niente lato rovescio scuro). Il colore delle foglie sta nell'atlante (dipinto per specie: aghi, foglioline del leccio, ulivo argento,
  // fico, agrumi coi frutti, palma, pale del fico d'India, erbe); il colore nei vertici dà solo la luce dipinta (in alto caldo e chiaro,
  // dentro e sotto freddo e scuro). Un albero vicino: 250-700 triangoli. Da media distanza la sagoma (nucleo + poche carte grandi), da
  // lontano poche facce fuse in una geometria sola.
  const KIT = typeof THREE === 'undefined' ? null : (function () {
    const TAU = Math.PI * 2;
    const rngK = s => { let a = (s >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
    const hx = h => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
    const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
    const nrm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
    const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

    // ---------------- L'ATLANTE DELLE FOGLIE (8 × 4 celle da 256 px) ----------------
    const CELLE = ['pino', 'pinoM', 'leccio', 'carrubo', 'lentisco', 'ulivo', 'fico', 'agrume',
      'eucalipto', 'cipresso', 'oleandro', 'ginestra', 'rosmarino', 'tamerice', 'mandorlo', 'mandorloFiore',
      'bouganville', 'edera', 'vite', 'palma', 'washingtonia', 'agave', 'pala', 'canna',
      'erbaSecca', 'erbaVerde', 'finocchietto', 'papavero', 'cappero', 'pieno', 'corteccia', 'bianco',
      'erbaSecca2', 'erbaVerde2', 'avena', 'cardo', 'asfodelo', 'trifoglio', 'prato', 'riserva'];
    const CI = {}; CELLE.forEach((n, i) => CI[n] = i);
    const CS = 256, NX = 8, NY = 5, IN = 2 / CS;
    // il rettangolo uv di una cella (la tela ha l'origine in alto, la texture in basso)
    const cellUV = k => { const i = CI[k] !== undefined ? CI[k] : k, cx = i % NX, cy = Math.floor(i / NX); return [cx / NX + IN / NX, 1 - (cy + 1) / NY + IN / NY, (cx + 1) / NX - IN / NX, 1 - cy / NY - IN / NY]; };
    let ATL = null;
    function atlante() {
      if (ATL) return ATL;
      const cv = document.createElement('canvas'); cv.width = CS * NX; cv.height = CS * NY; const g = cv.getContext('2d'), r = rngK(20261023);
      const pick = a => a[Math.floor(r() * a.length)];
      const cella = (nome, fn) => { const i = CI[nome], ox = (i % NX) * CS, oy = Math.floor(i / NX) * CS; g.save(); g.beginPath(); g.rect(ox + 3, oy + 3, CS - 6, CS - 6); g.clip(); g.translate(ox, oy); fn(); g.restore(); };
      const ramo = (x0, y0, x1, y1, w, c) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 + (r() - .5) * 10, (y0 + y1) / 2, x1, y1); g.stroke(); };
      // una foglia: base (x, y), lunghezza L, larghezza W, angolo a; c colore, v venatura
      const foglia = (x, y, L, W, a, c, v, punta) => { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = c; g.beginPath(); g.moveTo(0, 0);
        g.quadraticCurveTo(L * .35, -W, L, 0); g.quadraticCurveTo(L * .35, W, 0, 0); g.fill(); if (v) { g.strokeStyle = v; g.lineWidth = Math.max(.6, W * .14); g.beginPath(); g.moveTo(L * .05, 0); g.lineTo(L * (punta || .9), 0); g.stroke(); } g.restore(); };
      const luce = (x, y, rr, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, `rgba(255,255,230,${a})`); gr.addColorStop(1, 'rgba(255,255,230,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); };
      const fiore5 = (x, y, rr, c, cc) => { g.fillStyle = c; for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; g.beginPath(); g.ellipse(x + Math.cos(a) * rr * .55, y + Math.sin(a) * rr * .55, rr * .55, rr * .38, a, 0, TAU); g.fill(); } g.fillStyle = cc; g.beginPath(); g.arc(x, y, rr * .25, 0, TAU); g.fill(); };
      // i punti dove stanno le foglie di un grappolo tondo che nasce in basso al centro (la carta vista di fronte: un rametto pieno)
      const grappolo = (n, R, fn, cRamo, wRamo) => { const P = []; for (let k = 0; k < n; k++) { const a = r() * TAU, d = Math.sqrt(r()) * R; P.push([128 + Math.cos(a) * d, 122 + Math.sin(a) * d * .9]); }
        if (cRamo) { const J = [[128, 248]]; for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * .42, L = 60 + r() * 50; const e = [128 + Math.cos(a) * L, 200 + Math.sin(a) * L]; ramo(128, 250, e[0], e[1], wRamo, cRamo); J.push(e); }
          P.forEach((p, k) => { if (k % 3) return; const j = J[1 + k % 5]; ramo(j[0], j[1], p[0], p[1], wRamo * .45, cRamo); }); }
        P.sort((a, b) => a[1] - b[1]).forEach((p, k) => fn(p[0], p[1], k)); };
      const COL = (k, d) => { const p = PAL[k].map(hx); return '#' + new THREE.Color().setRGB(...mix(p[0], p[2], d)).getHexString(); };
      // gli aghi: ciuffi a raggiera, punte più chiare
      const aghi = (nome, nT, nA, L0, L1, pal) => cella(nome, () => grappolo(nT, 92, (x, y) => { for (let q = 0; q < nA; q++) { const a = -Math.PI / 2 + (r() - .5) * 3.6, L = L0 + r() * (L1 - L0), t = r();
        g.strokeStyle = COL(pal, .1 + t * .55); g.lineWidth = 2.1; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L * .55, y + Math.sin(a) * L * .55); g.stroke();
        g.strokeStyle = COL(pal, .55 + t * .45); g.lineWidth = 1.6; g.beginPath(); g.moveTo(x + Math.cos(a) * L * .55, y + Math.sin(a) * L * .55); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); } }, null, 0));
      aghi('pino', 13, 46, 22, 36, 'pino'); aghi('pinoM', 10, 38, 30, 48, 'pinoM');
      // foglioline fitte (leccio, lentisco): sopra scure e lucide, qualcuna girata (il rovescio grigio del leccio)
      const fitte = (nome, n, L, W, pal, rov, extra) => cella(nome, () => { grappolo(n, 100, (x, y) => { const a = r() * TAU, t = r(); foglia(x, y, L * (.8 + r() * .4), W * (.8 + r() * .3), a, r() < rov ? '#8a9484' : COL(pal, .1 + t * .9), 'rgba(255,255,220,.25)'); }, PAL.tLeccio, 4); if (extra) extra(); });
      fitte('leccio', 190, 17, 7.5, 'leccio', .1); fitte('lentisco', 170, 13, 6, 'lentisco', .05, () => { for (let k = 0; k < 6; k++) { const x = 60 + r() * 136, y = 60 + r() * 120; for (let q = 0; q < 7; q++) { g.fillStyle = q % 2 ? '#b02a2a' : '#7a1a22'; g.beginPath(); g.arc(x + (r() - .5) * 14, y + (r() - .5) * 14, 3, 0, TAU); g.fill(); } } });
      cella('carrubo', () => grappolo(16, 92, (x, y) => { const a = r() * TAU; ramo(x, y, x + Math.cos(a) * 46, y + Math.sin(a) * 46, 2, '#4a3a2a');
        for (let k = 0; k < 7; k++) { const t = (k + .5) / 7, px = x + Math.cos(a) * 46 * t, py = y + Math.sin(a) * 46 * t, s = k % 2 ? 1 : -1; g.fillStyle = COL('carrubo', .15 + r() * .85); g.beginPath(); g.ellipse(px + Math.cos(a + s * 1.4) * 9, py + Math.sin(a + s * 1.4) * 9, 10, 8, a, 0, TAU); g.fill(); luce(px + Math.cos(a + s * 1.4) * 7, py + Math.sin(a + s * 1.4) * 7 - 2, 6, .35); } }, PAL.tCarrubo, 5));
      cella('ulivo', () => grappolo(150, 104, (x, y) => { const a = -Math.PI / 2 + (r() - .5) * 2.6, rov = r() < .45; foglia(x, y, 26 + r() * 10, 4.6 + r() * 1.4, a, rov ? pick(['#b8c0ac', '#c4c8b4', '#a8b29c']) : COL('ulivo', r() * .7), rov ? null : 'rgba(220,230,200,.3)'); }, PAL.tUlivo, 3));
      cella('fico', () => { ramo(128, 250, 128, 150, 7, '#8a847a'); for (let k = 0; k < 9; k++) { const a = -Math.PI / 2 + (k - 4) * .38, d = 40 + r() * 50, x = 128 + Math.cos(a) * d, y = 140 + Math.sin(a) * d * .8, sc = 30 + r() * 12, c = COL('fico', .2 + r() * .8);
        ramo(128, 160, x, y, 3, '#6a7a4a'); g.fillStyle = c; [[-1, .9], [0, 1.25], [1, .9], [-1.6, .5], [1.6, .5]].forEach(([o, l]) => { g.beginPath(); g.ellipse(x + o * sc * .35, y - l * sc * .45, sc * .32, sc * .55 * l, o * .5, 0, TAU); g.fill(); });
        g.strokeStyle = 'rgba(230,240,180,.45)'; g.lineWidth = 1.4; [-1.6, -1, 0, 1, 1.6].forEach(o => { g.beginPath(); g.moveTo(x, y); g.lineTo(x + o * sc * .4, y - sc * .8 * (1 - Math.abs(o) * .25)); g.stroke(); }); luce(x - 8, y - sc * .5, sc * .5, .22); } });
      cella('agrume', () => { grappolo(120, 100, (x, y) => { const a = r() * TAU; foglia(x, y, 22 + r() * 6, 9 + r() * 2, a, COL('agrume', .1 + r() * .9), 'rgba(220,255,180,.3)'); luce(x + Math.cos(a) * 10, y + Math.sin(a) * 10, 5, .3); }, PAL.tAgrume, 4);
        for (let k = 0; k < 5; k++) { const x = 60 + r() * 136, y = 60 + r() * 130, gr = g.createRadialGradient(x - 4, y - 4, 2, x, y, 14); gr.addColorStop(0, '#ffd890'); gr.addColorStop(.6, '#f09a2a'); gr.addColorStop(1, '#c86a1a'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, 12, 0, TAU); g.fill(); } });
      cella('eucalipto', () => { for (let k = 0; k < 8; k++) { const x0 = 30 + k * 28 + (r() - .5) * 10; ramo(x0, 4, x0 + (r() - .5) * 20, 150, 2, '#a89a80');
          for (let q = 0; q < 8; q++) { const y = 14 + q * 22 + r() * 8; foglia(x0 + (r() - .5) * 8, y, 52 + r() * 18, 7 + r() * 2, Math.PI / 2 + (r() - .5) * .8, pick(['#6e8478', '#7e9488', '#8ea094', '#62786c', '#9aaa98']), 'rgba(230,230,210,.35)', .95); } } });
      cella('cipresso', () => { for (let k = 0; k < 900; k++) { const y = 6 + r() * 244, w = 120 * Math.sin(Math.PI * Math.min(1, (y + 20) / 270)), x = 128 + (r() - .5) * w; foglia(x, y, 10 + r() * 6, 3.5, -Math.PI / 2 + (r() - .5) * 1.6, COL('cipresso', r() * (.4 + (1 - y / 256) * .6))); } });
      cella('oleandro', () => { grappolo(26, 92, (x, y) => { for (let q = 0; q < 5; q++) { const a = q / 5 * TAU + r(); foglia(x, y, 38 + r() * 10, 6.5, a, COL('oleandro', .15 + r() * .85), 'rgba(230,240,200,.4)'); } }, '#6a5a44', 3);
        for (let k = 0; k < 7; k++) { const x = 50 + r() * 156, y = 30 + r() * 120; for (let q = 0; q < 5; q++) fiore5(x + (r() - .5) * 22, y + (r() - .5) * 18, 8, q % 2 ? '#f08aaa' : '#e86a92', '#f8e0e8'); } });
      cella('ginestra', () => { for (let k = 0; k < 46; k++) { const x0 = 128 + (r() - .5) * 60, x1 = 128 + (r() - .5) * 230, y1 = 6 + r() * 70; g.strokeStyle = pick(['#4c6430', '#5e7836', '#6e8a3c']); g.lineWidth = 2; g.beginPath(); g.moveTo(x0, 252); g.quadraticCurveTo((x0 + x1) / 2, 140, x1, y1); g.stroke();
          for (let q = 0; q < 6; q++) { const t = .35 + q * .1, px = x0 + (x1 - x0) * t * t, py = 252 + (y1 - 252) * t; g.fillStyle = q % 2 ? '#f4c82a' : '#e8b020'; g.beginPath(); g.ellipse(px + 3, py, 5, 3.6, .5, 0, TAU); g.fill(); } } });
      cella('rosmarino', () => { grappolo(40, 100, (x, y) => { const a = -Math.PI / 2 + (r() - .5) * 2.4; ramo(x, y + 20, x + Math.cos(a) * 30, y + Math.sin(a) * 30, 1.6, '#6a6050'); for (let q = 0; q < 9; q++) { const t = q / 9, px = x + Math.cos(a) * 30 * t, py = y + 20 + (Math.sin(a) * 30 - 20) * t; foglia(px, py, 11, 2.4, a + (q % 2 ? .9 : -.9), COL('rosmarino', r()), null); } if (r() < .5) { g.fillStyle = '#8a9ad8'; g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill(); } }, null, 0); });
      cella('tamerice', () => { for (let k = 0; k < 22; k++) { const x0 = 20 + r() * 216, y0 = 10 + r() * 60; g.strokeStyle = '#7a6a5a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + 18, y0 + 90, x0 + (r() - .5) * 40, y0 + 170); g.stroke();
          for (let q = 0; q < 40; q++) { const t = q / 40, px = x0 + 18 * 2 * t * (1 - t) + (r() - .5) * 6, py = y0 + 170 * t; g.strokeStyle = r() < .18 ? '#d8a8b4' : COL('tamerice', r()); g.lineWidth = 1.1; g.beginPath(); g.moveTo(px, py); g.lineTo(px + (r() - .5) * 18, py + 6 + r() * 8); g.stroke(); } } });
      cella('mandorlo', () => grappolo(100, 100, (x, y) => foglia(x, y, 20 + r() * 6, 5.5, -Math.PI / 2 + (r() - .5) * 2.8, COL('mandorlo', r()), 'rgba(240,240,210,.35)'), PAL.tMandorlo, 3));
      cella('mandorloFiore', () => grappolo(110, 100, (x, y) => fiore5(x, y, 7 + r() * 3, pick(['#f6e6ea', '#f2d6dc', '#fff4f4']), '#c86a7a'), PAL.tMandorlo, 3));
      cella('bouganville', () => { grappolo(40, 100, (x, y) => foglia(x, y, 18, 9, r() * TAU, COL('oleandro', r()), null), '#5a4a3a', 2); for (let k = 0; k < 110; k++) { const a = r() * TAU, d = Math.sqrt(r()) * 104, x = 128 + Math.cos(a) * d, y = 124 + Math.sin(a) * d * .9; g.fillStyle = pick(['#c8287a', '#d83a8a', '#b01e6a', '#e85aa0']); for (let q = 0; q < 3; q++) { const b = q / 3 * TAU + r(); g.beginPath(); g.ellipse(x + Math.cos(b) * 3.5, y + Math.sin(b) * 3.5, 5, 3.2, b, 0, TAU); g.fill(); } } });
      cella('edera', () => grappolo(36, 104, (x, y) => { const s = 16 + r() * 8, c = COL('edera', r()); g.fillStyle = c; [[0, -1], [-.8, -.3], [.8, -.3], [-.5, .4], [.5, .4]].forEach(([u, v]) => { g.beginPath(); g.ellipse(x + u * s * .55, y + v * s * .55, s * .42, s * .36, 0, 0, TAU); g.fill(); }); g.strokeStyle = 'rgba(210,230,180,.5)'; g.lineWidth = 1; [[0, -1], [-.8, -.3], [.8, -.3]].forEach(([u, v]) => { g.beginPath(); g.moveTo(x, y); g.lineTo(x + u * s * .7, y + v * s * .7); g.stroke(); }); }, '#4a4030', 2));
      cella('vite', () => { grappolo(14, 96, (x, y) => { const s = 30 + r() * 8; g.fillStyle = COL('fico', .25 + r() * .75); [[0, -1.1], [-.9, -.4], [.9, -.4], [-.6, .3], [.6, .3], [0, 0]].forEach(([u, v]) => { g.beginPath(); g.ellipse(x + u * s * .45, y + v * s * .45, s * .34, s * .3, 0, 0, TAU); g.fill(); }); luce(x - 5, y - 8, s * .4, .2); }, '#5a4430', 3);
        for (let k = 0; k < 2; k++) { const x = 80 + k * 90, y = 150; for (let q = 0; q < 22; q++) { const row = Math.floor(Math.sqrt(q * 2)), px = x + (q - row * row / 2) * 5 - row * 3, py = y + row * 9; g.fillStyle = q % 3 ? '#5a2a5a' : '#7a3a6a'; g.beginPath(); g.arc(px, py, 5, 0, TAU); g.fill(); } } });
      // la fronda di palma: la costola dal basso in alto, le foglioline a lisca di pesce (la carta si piega lungo la sua altezza)
      cella('palma', () => { ramo(128, 256, 128, 2, 4, '#8a8a4a'); for (let y = 250; y > 8; y -= 5.2) { const t = (256 - y) / 250, L = 118 * Math.sin(Math.PI * Math.min(1, t * .9 + .1)); [-1, 1].forEach(s => { g.strokeStyle = pick(['#4e6e30', '#5e7e36', '#6e8e3e', '#7a9a44']); g.lineWidth = 3.4 * (1 - t * .5); g.beginPath(); g.moveTo(128, y); g.quadraticCurveTo(128 + s * L * .5, y - 10, 128 + s * L, y - 22 + r() * 8); g.stroke(); }); } });
      cella('washingtonia', () => { for (let k = 0; k < 44; k++) { const a = Math.PI + .1 + k / 43 * (Math.PI - .2), L = 112 + r() * 10; g.strokeStyle = pick(['#4a6a3a', '#5a7a46', '#6a8a52']); g.lineWidth = 6; g.beginPath(); g.moveTo(128, 250); g.lineTo(128 + Math.cos(a) * L * .6, 250 + Math.sin(a) * L * 1.95 * .6); g.stroke(); g.lineWidth = 3; g.beginPath(); g.moveTo(128 + Math.cos(a) * L * .6, 250 + Math.sin(a) * L * 1.17); g.lineTo(128 + Math.cos(a + .03) * L, 250 + Math.sin(a + .03) * L * 2.1); g.stroke(); } });
      cella('agave', () => { const gr = g.createLinearGradient(0, 256, 0, 0); gr.addColorStop(0, '#5e7a74'); gr.addColorStop(1, '#9ab4aa'); g.fillStyle = gr; g.beginPath(); g.moveTo(70, 256); g.quadraticCurveTo(90, 80, 128, 0); g.quadraticCurveTo(166, 80, 186, 256); g.fill();
        g.strokeStyle = '#c8b860'; g.lineWidth = 3; g.beginPath(); g.moveTo(72, 256); g.quadraticCurveTo(91, 80, 128, 2); g.quadraticCurveTo(165, 80, 184, 256); g.stroke(); g.strokeStyle = 'rgba(230,240,230,.35)'; g.lineWidth = 6; g.beginPath(); g.moveTo(110, 256); g.quadraticCurveTo(116, 100, 126, 20); g.stroke(); });
      cella('pala', () => { const gr = g.createRadialGradient(110, 100, 10, 128, 128, 120); gr.addColorStop(0, '#8aac58'); gr.addColorStop(1, '#4e6a34'); g.fillStyle = gr; g.beginPath(); g.ellipse(128, 132, 92, 118, 0, 0, TAU); g.fill();
        g.strokeStyle = '#3e5628'; g.lineWidth = 3; g.stroke(); for (let k = 0; k < 40; k++) { const a = r() * TAU, d = Math.sqrt(r()), x = 128 + Math.cos(a) * d * 80, y = 132 + Math.sin(a) * d * 104; g.fillStyle = '#e8e0b0'; g.beginPath(); g.arc(x, y, 2.2, 0, TAU); g.fill(); g.fillStyle = 'rgba(40,60,20,.4)'; g.beginPath(); g.arc(x + 1, y + 2, 2.4, 0, TAU); g.fill(); } });
      cella('canna', () => { ramo(128, 256, 130, 20, 4, '#9aa262'); for (let k = 0; k < 9; k++) { const y = 230 - k * 22, s = k % 2 ? 1 : -1; g.fillStyle = pick(['#7a8a4a', '#94a258', '#a8b068']); g.beginPath(); g.moveTo(128, y); g.quadraticCurveTo(128 + s * 70, y - 30, 128 + s * 118, y + 20); g.quadraticCurveTo(128 + s * 60, y - 14, 128, y + 8); g.fill(); }
        for (let k = 0; k < 40; k++) { g.strokeStyle = pick(['#c8b890', '#b8a880', '#d8c8a0']); g.lineWidth = 2; g.beginPath(); g.moveTo(130, 30); g.lineTo(130 + (r() - .3) * 50, 4 + r() * 30); g.stroke(); } });
      // le erbe: ciuffi di lame dal basso (la carta sta in piedi)
      const ciuffo = (nome, n, cols, extra) => cella(nome, () => { for (let k = 0; k < n; k++) { const x0 = 128 + (r() - .5) * 150, h = 90 + Math.pow(r(), 1.4) * 160, lean = (r() - .5) * 110, w = 2.2 + r() * 2.6, gr = g.createLinearGradient(0, 256, 0, 256 - h);
          gr.addColorStop(0, cols[0]); gr.addColorStop(.5, pick(cols.slice(1))); gr.addColorStop(1, pick(cols.slice(1))); g.fillStyle = gr; g.beginPath(); g.moveTo(x0 - w, 256); g.quadraticCurveTo(x0 + lean * .3, 256 - h * .6, x0 + lean, 256 - h); g.quadraticCurveTo(x0 + lean * .3 + w * .3, 256 - h * .55, x0 + w, 256); g.fill(); } if (extra) extra(); });
      ciuffo('erbaSecca', 90, ['#6a5a34', '#c4ac6c', '#dcc690', '#b89a5a', '#e4d2a0'], () => { for (let k = 0; k < 14; k++) { const x = 40 + r() * 176, y = 20 + r() * 90; g.strokeStyle = '#a8905a'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y + 30); g.lineTo(x + 3, y); g.stroke(); g.fillStyle = pick(['#d8c088', '#c8a868']); g.beginPath(); g.ellipse(x + 3, y, 3, 9, .1, 0, TAU); g.fill(); } });
      ciuffo('erbaVerde', 110, ['#2e4a1c', '#6c8a3a', '#86a448', '#a2bc5a', '#7a9a40'], () => { for (let k = 0; k < 10; k++) { const x = 30 + r() * 196, y = 60 + r() * 120; for (let q = 0; q < 5; q++) { g.fillStyle = '#f4f0e0'; g.beginPath(); g.arc(x + (r() - .5) * 10, y + (r() - .5) * 8, 2.4, 0, TAU); g.fill(); } } });
      ciuffo('erbaSecca2', 70, ['#7a6a3c', '#d4bc7c', '#e8d6a4', '#c4a464', '#bca46c'], () => { for (let k = 0; k < 22; k++) { const x = 30 + r() * 196, y = 10 + r() * 70; g.strokeStyle = '#b8a070'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y + 60); g.quadraticCurveTo(x + 4, y + 20, x + 8, y); g.stroke(); } });
      ciuffo('erbaVerde2', 80, ['#34501e', '#5a7a30', '#7a9a3c', '#94b04c', '#6a8a34'], () => { for (let k = 0; k < 8; k++) { const x = 30 + r() * 196, y = 40 + r() * 150; g.fillStyle = pick(['#e8d0f0', '#f4f0e0', '#f0e070']); for (let q = 0; q < 6; q++) { g.beginPath(); g.arc(x + (r() - .5) * 9, y + (r() - .5) * 7, 2.2, 0, TAU); g.fill(); } } });
      cella('avena', () => { for (let k = 0; k < 16; k++) { const x0 = 128 + (r() - .5) * 120, x1 = x0 + (r() - .5) * 90, y1 = 8 + r() * 60; g.strokeStyle = pick(['#b8a468', '#a89458', '#c8b478']); g.lineWidth = 1.6; g.beginPath(); g.moveTo(x0, 256); g.quadraticCurveTo(x0, 120, x1, y1); g.stroke();
          for (let q = 0; q < 7; q++) { const t = q / 7, px = x1 + (r() - .5) * 4, py = y1 + q * 9; g.fillStyle = pick(['#d8c890', '#c8b478', '#e4d6a8']); g.beginPath(); g.ellipse(px + (q % 2 ? 6 : -6), py + 4, 3, 7, q % 2 ? .6 : -.6, 0, TAU); g.fill(); } } });
      cella('cardo', () => { g.strokeStyle = '#7a8a7a'; g.lineWidth = 3; for (let k = 0; k < 3; k++) { const x1 = 128 + (k - 1) * 50, y1 = 50 + r() * 30; g.beginPath(); g.moveTo(128, 256); g.quadraticCurveTo(128, 150, x1, y1); g.stroke();
          g.fillStyle = '#8a9a8a'; for (let q = 0; q < 6; q++) { const y = 200 - q * 25, s2 = q % 2 ? 1 : -1; g.beginPath(); g.moveTo(128 + (x1 - 128) * (256 - y) / 206, y); for (let j = 0; j <= 4; j++) g.lineTo(128 + s2 * (12 + j * 9), y - j * 6 + (j % 2 ? -8 : 0)); g.closePath(); g.fill(); }
          g.fillStyle = '#7a8a6a'; g.beginPath(); g.arc(x1, y1 + 10, 13, 0, TAU); g.fill(); g.fillStyle = '#a868c0'; for (let q = 0; q < 26; q++) { const a = -Math.PI / 2 + (r() - .5) * 2.2; g.fillRect(x1 + Math.cos(a) * 10, y1 + 2 + Math.sin(a) * 14, 2, 8); } } });
      cella('asfodelo', () => { for (let k = 0; k < 22; k++) { const x0 = 128 + (r() - .5) * 90; g.fillStyle = pick(['#6a8a4a', '#7a9a54']); g.beginPath(); g.moveTo(x0 - 4, 256); g.quadraticCurveTo(x0 + (r() - .5) * 40, 200, x0 + (r() - .5) * 70, 150 + r() * 40); g.lineTo(x0 + 4, 256); g.fill(); }
        g.strokeStyle = '#8a9a5a'; g.lineWidth = 3; g.beginPath(); g.moveTo(128, 256); g.lineTo(130, 20); g.stroke(); for (let q = 0; q < 30; q++) { const y = 24 + q * 4.5 + r() * 3, sd = q % 2 ? 1 : -1; fiore5(130 + sd * (6 + r() * 6), y, 5.5, '#f6f0ec', '#c8a070'); } });
      cella('trifoglio', () => { for (let k = 0; k < 70; k++) { const x = 20 + r() * 216, y = 140 + r() * 112; g.fillStyle = pick(['#4a7a34', '#5a8a3a', '#3e6a2e']); for (let q = 0; q < 3; q++) { const a = q / 3 * TAU + r(); g.beginPath(); g.ellipse(x + Math.cos(a) * 5, y + Math.sin(a) * 5, 5.5, 4.5, a, 0, TAU); g.fill(); } }
        for (let k = 0; k < 9; k++) { const x = 30 + r() * 196, y = 100 + r() * 70; g.strokeStyle = '#5a7a34'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, 256); g.lineTo(x, y); g.stroke(); g.fillStyle = pick(['#d890b0', '#f0f0f0', '#e0a0c0']); g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fill(); } });
      ciuffo('prato', 160, ['#4a5a2a', '#8a9a48', '#a8a85c', '#c4b474', '#7a8a40']);
      cella('finocchietto', () => { for (let k = 0; k < 7; k++) { const x0 = 128 + (r() - .5) * 60, x1 = 128 + (r() - .5) * 200, y1 = 20 + r() * 60; g.strokeStyle = '#7a8a40'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x0, 256); g.quadraticCurveTo(x0, 150, x1, y1); g.stroke();
          for (let q = 0; q < 14; q++) { const a = -Math.PI / 2 - .8 + q / 13 * 1.6; g.strokeStyle = '#a8b04a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 + Math.cos(a) * 24, y1 + 10 + Math.sin(a) * 14); g.stroke(); g.fillStyle = '#e0cc34'; g.beginPath(); g.arc(x1 + Math.cos(a) * 24, y1 + 10 + Math.sin(a) * 14, 3.2, 0, TAU); g.fill(); }
          for (let q = 0; q < 30; q++) { const t = .2 + r() * .55, px = x0 + (x1 - x0) * t * t, py = 256 + (y1 - 256) * t; g.strokeStyle = 'rgba(150,170,70,.8)'; g.lineWidth = .9; g.beginPath(); g.moveTo(px, py); g.lineTo(px + (r() - .5) * 26, py - 6 - r() * 10); g.stroke(); } } });
      ciuffo('papavero', 60, ['#2e4a1c', '#6c8a3a', '#86a448', '#a2bc5a'], () => { for (let k = 0; k < 6; k++) { const x0 = 60 + r() * 136, y = 30 + r() * 90; g.strokeStyle = '#5a7a34'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0 + (r() - .5) * 20, 256); g.quadraticCurveTo(x0, 160, x0, y); g.stroke();
          g.fillStyle = '#d83a24'; for (let q = 0; q < 4; q++) { const a = q / 4 * TAU + .4; g.beginPath(); g.ellipse(x0 + Math.cos(a) * 7, y + Math.sin(a) * 5, 10, 7, a, 0, TAU); g.fill(); } g.fillStyle = '#2a1a1a'; g.beginPath(); g.arc(x0, y, 4, 0, TAU); g.fill(); luce(x0 - 4, y - 4, 8, .25); } });
      cella('cappero', () => { grappolo(60, 100, (x, y) => { g.fillStyle = COL('agrume', .3 + r() * .7); g.beginPath(); g.arc(x, y, 9 + r() * 4, 0, TAU); g.fill(); }, '#7a5a4a', 2); for (let k = 0; k < 5; k++) { const x = 60 + r() * 136, y = 50 + r() * 140; g.fillStyle = '#f6eef4'; for (let q = 0; q < 4; q++) { const a = q / 4 * TAU; g.beginPath(); g.ellipse(x + Math.cos(a) * 8, y + Math.sin(a) * 8, 9, 7, a, 0, TAU); g.fill(); } g.strokeStyle = '#9a4aa0'; g.lineWidth = 1; for (let q = 0; q < 12; q++) { const a = r() * TAU; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 16, y + Math.sin(a) * 16); g.stroke(); } } });
      // il nucleo (grigi: lo tinge la specie) e la corteccia (grigi), pieni
      cella('pieno', () => { g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, CS, CS); for (let k = 0; k < 700; k++) { const v = 110 + Math.floor(r() * 140); foglia(r() * 256, r() * 256, 12 + r() * 10, 5, r() * TAU, `rgb(${v},${v},${v})`); } });
      cella('corteccia', () => { g.fillStyle = '#a8a8a8'; g.fillRect(0, 0, CS, CS); for (let k = 0; k < 260; k++) { const x = r() * 256, v = 90 + Math.floor(r() * 140); g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = 2 + r() * 5; g.beginPath(); g.moveTo(x, r() * 256); g.lineTo(x + (r() - .5) * 8, r() * 256); g.stroke(); }
        for (let k = 0; k < 60; k++) { const v = 70 + Math.floor(r() * 60); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r() * 256, r() * 256, 10 + r() * 20, 3 + r() * 5); } });
      cella('bianco', () => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, CS, CS); });
      const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
      return (ATL = t);
    }

    // ---------------- L'ACCUMULATORE DELLE FACCE ----------------
    function Acc() {
      const P = [], N = [], C = [], X = [], UV = [];
      const v = (p, n, c, f, uv) => { P.push(p[0], p[1], p[2]); N.push(n[0], n[1], n[2]); C.push(c[0], c[1], c[2]); X.push(f); UV.push(uv[0], uv[1]); };
      return { v, n: () => P.length / 3,
        build() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
          g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setAttribute('flex', new THREE.Float32BufferAttribute(X, 1)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.computeBoundingSphere(); g.computeBoundingBox(); return g; } };
    }
    // la luce dipinta: g 0 (ombra, dentro, sotto) ... 1 (sole, fuori, in alto); in alto caldo, in ombra freddo
    const lumi = (g, k) => { k = k || 1; const w = Math.max(0, Math.min(1.15, g)); return [(.52 + .66 * w) * k, (.55 + .58 * w) * k, (.62 + .42 * w) * k]; };
    const ICO = [0, 1].map(d => new THREE.IcosahedronGeometry(1, d).toNonIndexed().attributes.position.array.slice());
    // il nucleo: una massa deformata, dipinta di foglie in grigio (cella 'pieno') e tinta col colore scuro della specie
    function nucleo(A, c, r, col, H, seed, opz) {
      opz = opz || {}; const p = ICO[opz.det === undefined ? 1 : opz.det], cache = new Map(), U = cellUV('pieno'), base = hx(col), fl = opz.flex === undefined ? 1 : opz.flex, sq = opz.schiaccia || 0;
      for (let i = 0; i < p.length; i += 3) { const x = p[i], y = p[i + 1], z = p[i + 2], kk = Math.round(x * 97) * 7919 + Math.round(y * 97) * 131 + Math.round(z * 97);
        let d = cache.get(kk); if (d === undefined) { d = 1 + (hash2(kk & 0xffff, kk >> 16, seed) - .5) * .36; cache.set(kk, d); }
        const yy = sq && y < 0 ? y * (1 - sq) : y, P = [c[0] + x * r[0] * d, c[1] + yy * r[1] * d, c[2] + z * r[2] * d], gL = .25 + y * .3 + (x * .2 - z * .15);
        const L = lumi(gL, opz.luce || .9); A.v(P, nrm([x, y, z]), [base[0] * L[0] * 1.5, base[1] * L[1] * 1.5, base[2] * L[2] * 1.5], Math.min(1, Math.max(0, P[1] / H)) ** 1.3 * fl,
          [U[0] + (U[2] - U[0]) * (.5 + Math.atan2(z, x) / TAU), U[1] + (U[3] - U[1]) * (.5 + y * .5)]); }
    }
    // una carta: centro p, lato s, normale di posa n (la faccia), normale di luce nl, cella, luce g, flex f, rot r, allungo
    function carta(A, p, s, n, nl, cell, g, f, rot, opz) {
      opz = opz || {}; const U = cellUV(cell), up = Math.abs(n[1]) > .95 ? [1, 0, 0] : [0, 1, 0]; let t = nrm(crs(up, n)), b = crs(n, t); const cs = Math.cos(rot), sn = Math.sin(rot);
      const tt = [t[0] * cs + b[0] * sn, t[1] * cs + b[1] * sn, t[2] * cs + b[2] * sn], bb = [b[0] * cs - t[0] * sn, b[1] * cs - t[1] * sn, b[2] * cs - t[2] * sn], sx = s * (opz.sx || 1), sy = s * (opz.sy || 1), oy = opz.base ? sy : 0;
      const Q = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => [p[0] + tt[0] * u * sx + bb[0] * (v * sy + oy), p[1] + tt[1] * u * sx + bb[1] * (v * sy + oy), p[2] + tt[2] * u * sx + bb[2] * (v * sy + oy)]);
      const UVq = [[U[0], U[1]], [U[2], U[1]], [U[2], U[3]], [U[0], U[3]]], fl = opz.fl || [f, f, f, f];
      const C4 = Q.map(q => opz.col ? opz.col : opz.luceDi ? lumi(opz.luceDi(q)) : lumi(g));   // la luce per angolo: la carta non è una piastrella uniforme
      const ord = [0, 1, 2, 0, 2, 3, 0, 2, 1, 0, 3, 2]; ord.forEach(k => A.v(Q[k], nl, C4[k], fl[k], UVq[k]));
    }
    // la chioma: il nucleo e le carte sull'involucro (spirale di Fibonacci, un po' rimescolata), più fitte in alto
    function chioma(A, c, r, cell, col, H, seed, n, s, opz) {
      opz = opz || {}; const rr = rngK(seed * 7 + 3), fondo = opz.fondo || 0, fl = opz.flex === undefined ? 1 : opz.flex;
      const kn = opz.nucleo || .72; if (!opz.senzaNucleo) nucleo(A, c, [r[0] * kn, r[1] * Math.min(.7, kn * 1.1), r[2] * kn], col, H, seed, { schiaccia: fondo, flex: fl, det: opz.detN });
      for (let k = 0; k < n; k++) {
        const u = (k + .5) / n, yy = 1 - 2 * Math.pow(u, opz.alto || .85), rad = Math.sqrt(Math.max(0, 1 - yy * yy)), th = k * 2.39996 + rr() * .5;
        let dx = Math.cos(th) * rad, dy = yy, dz = Math.sin(th) * rad; if (fondo && dy < 0) dy *= (1 - fondo);
        const d = .62 + rr() * .4, P = [c[0] + dx * r[0] * d, c[1] + dy * r[1] * d, c[2] + dz * r[2] * d], dir = nrm([dx, dy, dz]);
        const nPosa = nrm([dir[0] + (rr() - .5) * .9, dir[1] * .6 + .55 + (rr() - .5) * .5, dir[2] + (rr() - .5) * .9]);
        const g = .38 + dir[1] * .32 + (dir[0] * .22 - dir[2] * .16) + (d - .8) * .5 + (rr() - .5) * .12 + (opz.luce || 0);
        const g0 = (rr() - .5) * .12 + (opz.luce || 0), luceDi = q => { const ux = (q[0] - c[0]) / r[0], uy = (q[1] - c[1]) / r[1], uz = (q[2] - c[2]) / r[2], dd = Math.hypot(ux, uy, uz); return .3 + uy * .3 + (ux * .2 - uz * .15) + (dd - .75) * .55 + g0; };
        carta(A, P, s * (.8 + rr() * .45), nPosa, nrm([dir[0], dir[1] + .35, dir[2]]), cell, g, Math.min(1, Math.max(0, P[1] / H)) ** 1.3 * fl, rr() * TAU, { sx: opz.sx, sy: opz.sy, luceDi });
      }
    }
    // il tronco: tubo a 5 lati con la corteccia (cella in grigio, tinta dal colore), più scuro alla base
    function tubo(A, pts, rr, col, H, lati, opz) {
      lati = lati || 5; opz = opz || {}; const c0 = hx(col), U = cellUV('corteccia'), an = opz.anelli;
      const ring = k => { const p = pts[k], q = pts[Math.min(pts.length - 1, k + 1)], o = pts[Math.max(0, k - 1)]; const d = nrm([q[0] - o[0], q[1] - o[1], q[2] - o[2]]); const a = Math.abs(d[0]) > .9 ? [0, 0, 1] : [1, 0, 0];
        const u = nrm(crs(d, a)), w = crs(d, u), R = []; for (let s = 0; s <= lati; s++) { const an2 = s / lati * TAU, cs = Math.cos(an2), sn = Math.sin(an2), nn = [u[0] * cs + w[0] * sn, u[1] * cs + w[1] * sn, u[2] * cs + w[2] * sn]; R.push([p[0] + nn[0] * rr[k], p[1] + nn[1] * rr[k], p[2] + nn[2] * rr[k], nn]); } return R; };
      const RS = pts.map((_, k) => ring(k)); let vL = 0;
      for (let k = 0; k < pts.length - 1; k++) { const seg = Math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1], pts[k + 1][2] - pts[k][2]), v0 = vL, v1 = vL + seg / 2.2; vL = v1;
        for (let s = 0; s < lati; s++) { const a = RS[k][s], b = RS[k][s + 1], c = RS[k + 1][s + 1], d = RS[k + 1][s], ka = an ? (k % 2 ? .8 : 1.05) : 1;
          const tA = Math.min(1, pts[k][1] / 2.5), tB = Math.min(1, pts[k + 1][1] / 2.5), sd = .82 + .2 * Math.cos(s / lati * TAU - .8);
          const cA = mul(c0, (.62 + .38 * tA) * sd * ka * 1.35), cB = mul(c0, (.62 + .38 * tB) * sd * ka * 1.35), fA = (pts[k][1] / H) ** 2 * .3, fB = (pts[k + 1][1] / H) ** 2 * .3;
          const u0 = U[0] + (U[2] - U[0]) * s / lati, u1 = U[0] + (U[2] - U[0]) * (s + 1) / lati, va = U[1] + (U[3] - U[1]) * .04, vb = U[1] + (U[3] - U[1]) * Math.min(.96, .04 + (v1 - v0));
          A.v(a.slice(0, 3), a[3], cA, fA, [u0, va]); A.v(b.slice(0, 3), b[3], cA, fA, [u1, va]); A.v(c.slice(0, 3), c[3], cB, fB, [u1, vb]);
          A.v(a.slice(0, 3), a[3], cA, fA, [u0, va]); A.v(c.slice(0, 3), c[3], cB, fB, [u1, vb]); A.v(d.slice(0, 3), d[3], cB, fB, [u0, vb]); } }
    }
    // una lama dipinta (fronda di palma, foglia d'agave, canna): striscia che si piega lungo la lunghezza, la cella stesa per lungo
    function lama(A, base, dir, L, w, cad, cell, H, seg, opz) {
      seg = seg || 4; opz = opz || {}; const U = cellUV(cell), side = nrm([-dir[2], 0, dir[0]]); if (!isFinite(side[0])) side[0] = 1;
      const P = []; for (let k = 0; k <= seg; k++) { const t = k / seg; P.push([base[0] + dir[0] * L * t, base[1] + dir[1] * L * t - cad * L * t * t, base[2] + dir[2] * L * t]); }
      for (let k = 0; k < seg; k++) { const a = P[k], b = P[k + 1], ta = k / seg, tb = (k + 1) / seg, fa = Math.min(1, a[1] / H) * (opz.flex || 1), fb = Math.min(1, b[1] / H) * (opz.flex || 1);
        const lift = opz.v ? w * .35 : 0, al = [a[0] - side[0] * w, a[1] + lift, a[2] - side[2] * w], ar = [a[0] + side[0] * w, a[1] + lift, a[2] + side[2] * w], bl = [b[0] - side[0] * w, b[1] + lift, b[2] - side[2] * w], br = [b[0] + side[0] * w, b[1] + lift, b[2] + side[2] * w];
        const n = nrm([0, 1, 0]), ca = lumi(.45 + ta * .45 + (opz.luce || 0)), cb = lumi(.45 + tb * .45 + (opz.luce || 0)), va = U[1] + (U[3] - U[1]) * ta, vb = U[1] + (U[3] - U[1]) * tb;
        [[al, U[0], va, ca, fa], [ar, U[2], va, ca, fa], [br, U[2], vb, cb, fb], [al, U[0], va, ca, fa], [br, U[2], vb, cb, fb], [bl, U[0], vb, cb, fb], [al, U[0], va, ca, fa], [br, U[2], vb, cb, fb], [ar, U[2], va, ca, fa], [al, U[0], va, ca, fa], [bl, U[0], vb, cb, fb], [br, U[2], vb, cb, fb]]
          .forEach(([p, u, v, c, f]) => A.v(p, n, c, f, [u, v])); }
    }
    // l'erba e le piante basse: carte in piedi incrociate, la normale verso l'alto (si illuminano come il prato, non come un muro)
    function ciuffo(A, H, w, cell, n, rr, opz) {
      opz = opz || {}; for (let k = 0; k < n; k++) { const a = k / n * Math.PI + rr() * .4, nd = [Math.cos(a), 0, Math.sin(a)], o = opz.sparso ? [(rr() - .5) * opz.sparso, 0, (rr() - .5) * opz.sparso] : [0, 0, 0], h = H * (.85 + rr() * .3);
        carta(A, [o[0], 0, o[2]], 1, nd, [0, 1, 0], cell, .8, 0, 0, { sx: w * .5, sy: h * .5, base: true, fl: [0, 0, 1, 1], col: lumi(.55 + rr() * .3) }); }
    }
    const punto = (A, p, s, col, f) => { const U = cellUV('bianco'), c = hx(col), u = [(U[0] + U[2]) / 2, (U[1] + U[3]) / 2], O = [[s, 0, 0], [-s, 0, 0], [0, s, 0], [0, -s, 0], [0, 0, s], [0, 0, -s]], F8 = [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]];
      F8.forEach(tr => tr.forEach(k => A.v([p[0] + O[k][0], p[1] + O[k][1], p[2] + O[k][2]], nrm(O[k]), mul(c, O[k][1] >= 0 ? 1.05 : .78), f, u))); };

    // ---------------- LE FORME: (A, H, r, S, v) — H l'altezza di riferimento, r il caso del seme, v la variante ----------------
    const L0 = k => PAL[k][0];   // la tinta scura (nucleo)
    const FORME = {
      ombrello(A, H, r, S, v) { const lean = (.05 + r() * .08) * H, a = r() * TAU, lx = Math.cos(a) * lean, lz = Math.sin(a) * lean, tT = H * .74;
        const pts = [0, .2, .45, .7, .9, 1].map(t => [lx * t ** 1.7 + Math.sin(t * 6 + v) * .12, tT * t, lz * t ** 1.7 + Math.cos(t * 5 + v) * .08]);
        tubo(A, pts, [.036, .029, .025, .022, .02, .017].map(k => k * H), PAL[S.legno], H);
        const top = pts[5], R = SP.pino.chioma * (H / 12) * (.92 + r() * .16), cy = H * .86, NB = 5 + (v % 2), tips = [];
        for (let k = 0; k < NB; k++) { const b = k / NB * TAU + r() * .5, e = [top[0] + Math.cos(b) * R * .62, cy, top[2] + Math.sin(b) * R * .62]; tubo(A, [top, [(top[0] + e[0]) / 2, top[1] + (e[1] - top[1]) * .8, (top[2] + e[2]) / 2], e], [.014 * H, .01 * H, .006 * H], PAL[S.legno], H, 4); tips.push(e); }
        // l'ombrello: tante nuvole piatte di aghi, una per branca e una in mezzo, ciascuna nucleo + carte quasi orizzontali
        tips.concat([[top[0], cy + H * .03, top[2]]]).forEach((e, k) => chioma(A, [e[0], e[1] + H * .02, e[2]], [R * .5, H * .065, R * .5], 'pino', L0('pino'), H, v * 11 + k, 22, 1.15, { fondo: .7, sy: .8, luce: k === NB ? .08 : 0, nucleo: .5 })); },
      aleppo(A, H, r, S, v) { const a = r() * TAU, lean = (.1 + r() * .12) * H, lx = Math.cos(a) * lean, lz = Math.sin(a) * lean;
        const pts = [0, .25, .5, .75, 1].map(t => [lx * t ** 1.4 + Math.sin(t * 7 + v) * .25, H * .82 * t, lz * t ** 1.4 + Math.cos(t * 6 + v) * .2]);
        tubo(A, pts, [.03, .025, .02, .016, .012].map(k => k * H), PAL[S.legno], H);
        const NC = 4 + (v % 3);
        for (let k = 0; k < NC; k++) { const t = .45 + k / NC * .5, q = pts[Math.min(4, Math.round(t * 4))], b = r() * TAU, d = (.8 + r() * 1.3) * (1.1 - t * .4), e = [q[0] + Math.cos(b) * d, H * (.5 + t * .4), q[2] + Math.sin(b) * d];
          tubo(A, [q, e], [.01 * H, .006 * H], PAL[S.legno], H, 4); chioma(A, e, [1.1 + r() * .5, .55 + r() * .2, 1.1 + r() * .5], 'pinoM', L0('pinoM'), H, v * 13 + k, 9, .95, { fondo: .6 }); }
        chioma(A, [pts[4][0], H * .9, pts[4][2]], [1.3, .7, 1.3], 'pinoM', L0('pinoM'), H, v * 13 + 9, 10, 1, { fondo: .5, luce: .06 }); },
      tondo(A, H, r, S, v) { const F = H * (.3 + r() * .06), bx = (r() - .5) * .3, bz = (r() - .5) * .3, R = S.chioma * .95;
        tubo(A, [[0, 0, 0], [bx * .3, F * .5, bz * .3], [bx, F, bz], [bx, F + 1.2, bz]], [.22, .18, .15, .1], PAL[S.legno], H);
        for (let k = 0; k < 3; k++) { const b = k / 3 * TAU + r(); tubo(A, [[bx, F - .2, bz], [bx + Math.cos(b) * R * .5, F + 1.4, bz + Math.sin(b) * R * .5]], [.1, .05], PAL[S.legno], H, 4); }
        const cy = F + (H - F) * .52, ry = (H - F) * .52;
        chioma(A, [bx, cy, bz], [R, ry, R], S.pal === 'leccio' ? 'leccio' : 'carrubo', L0(S.pal), H, v * 17 + 1, 54, 1.05, { fondo: .2 }); },
      cupola(A, H, r, S, v) { const R = S.chioma * (.9 + r() * .2), F = H * .3;
        tubo(A, [[0, 0, 0], [.1, F * .6, 0], [.05, F, .05]], [.32, .26, .22], PAL[S.legno], H);
        for (let k = 0; k < 3; k++) { const b = k / 3 * TAU + r(); tubo(A, [[.05, F, .05], [Math.cos(b) * R * .45, F + H * .22, Math.sin(b) * R * .45]], [.16, .08], PAL[S.legno], H, 4); }
        chioma(A, [0, H * .62, 0], [R, H * .36, R], 'carrubo', L0('carrubo'), H, v * 19 + 1, 60, 1.1, { fondo: .5, alto: .75 }); },
      eucalipto(A, H, r, S, v) { const pts = [0, .3, .6, .85, 1].map(t => [Math.sin(t * 4 + v) * .35, H * .9 * t, Math.cos(t * 3 + v) * .25]);
        tubo(A, pts, [.32, .22, .16, .1, .06], PAL[S.legno], H);
        for (let k = 0; k < 6; k++) { const t = .45 + k / 6 * .5, b = r() * TAU, d = 1.2 + r() * 1.4, q = pts[Math.min(4, Math.round(t * 4))], e = [q[0] + Math.cos(b) * d, H * t, q[2] + Math.sin(b) * d];
          tubo(A, [q, e], [.08, .04], PAL[S.legno], H, 4); chioma(A, [e[0], e[1] - .5, e[2]], [1 + r() * .4, 1.7 + r() * .5, 1 + r() * .4], 'eucalipto', L0('eucalipto'), H, v * 23 + k, 9, 1, { sy: 1.3, detN: 0 }); }
        chioma(A, [pts[4][0], H * .95, pts[4][2]], [1.2, 1.4, 1.2], 'eucalipto', L0('eucalipto'), H, v * 23 + 9, 8, 1, { luce: .08, detN: 0 }); },
      colonna(A, H, r, S, v) { tubo(A, [[0, 0, 0], [0, .9, 0]], [.2, .16], PAL[S.legno], H);
        nucleo(A, [0, H * .48, 0], [.82, H * .48, .82], L0('cipresso'), H, v * 29 + 1, {});
        const rr = rngK(v * 29 + 3); for (let k = 0; k < 26; k++) { const y = H * (.06 + k / 26 * .9), w = Math.sin(Math.PI * Math.min(1, y / H * 1.05 + .04)) * .95, a = k * 2.4 + rr();
          carta(A, [Math.cos(a) * w * .8, y, Math.sin(a) * w * .8], .55 + w * .35, nrm([Math.cos(a), .25, Math.sin(a)]), nrm([Math.cos(a), .4, Math.sin(a)]), 'cipresso', .35 + y / H * .4 + Math.cos(a) * .12, (y / H) ** 1.3, rr() * .4 - .2, { sy: 1.6 }); } },
      ulivo(A, H, r, S, v) { const N2 = 2 + (v % 2);
        nucleo(A, [0, .25, 0], [.45, .35, .45], '#5e584a', H, v + 41, { flex: 0, luce: .7 });   // il ceppo gonfio
        const tips = []; for (let k = 0; k < N2; k++) { const b = k / N2 * TAU + r(), d = .9 + r() * .7, e = [Math.cos(b) * d, H * (.45 + r() * .12), Math.sin(b) * d];
          tubo(A, [[Math.cos(b) * .12, 0, Math.sin(b) * .12], [Math.cos(b + .8) * .35, H * .2, Math.sin(b + .8) * .3], [e[0] * .7, e[1] * .8, e[2] * .7], e], [.2, .16, .12, .08], PAL[S.legno], H); tips.push(e); }
        for (let k = 0; k < 5; k++) { const t = tips[k % tips.length], b = r() * TAU, d = .5 + r() * 1.1;
          chioma(A, [t[0] + Math.cos(b) * d, H * (.64 + r() * .24), t[2] + Math.sin(b) * d], [1.05 + r() * .4, .6 + r() * .25, 1.05 + r() * .4], 'ulivo', L0('ulivo'), H, v * 31 + k, 10, .85, { fondo: .45, detN: 0 }); } },
      fico(A, H, r, S, v) { const R = S.chioma;
        for (let k = 0; k < 4; k++) { const b = k / 4 * TAU + r() * .6, e = [Math.cos(b) * R * .55, H * .55, Math.sin(b) * R * .55]; tubo(A, [[0, 0, 0], [Math.cos(b) * .3, H * .22, Math.sin(b) * .3], e], [.16, .12, .07], PAL[S.legno], H, 5); }
        chioma(A, [0, H * .66, 0], [R, H * .33, R], 'fico', L0('fico'), H, v * 37 + 1, 64, .78, { fondo: .55, luce: .04, nucleo: .62 }); },
      agrume(A, H, r, S, v) { const R = S.chioma; tubo(A, [[0, 0, 0], [0, H * .3, 0]], [.1, .08], PAL[S.legno], H);
        chioma(A, [0, H * .6, 0], [R, H * .42, R], 'agrume', L0('agrume'), H, v * 43 + 1, 30, .8, {});
        const fr = v % 2 ? PAL.limone : PAL.arancia, rr = rngK(v * 991 + 7); for (let k = 0; k < 16; k++) { const b = rr() * TAU, e = rr() * 1.2 - .5, c = Math.cos(e); punto(A, [Math.cos(b) * c * R * 1.0, H * .6 + Math.sin(e) * H * .42, Math.sin(b) * c * R * 1.0], .1, fr, .8); } },
      mandorlo(A, H, r, S, v) { const cell = v === 3 ? 'mandorloFiore' : 'mandorlo', tips = [];
        for (let k = 0; k < 4; k++) { const b = k / 4 * TAU + r() * .5, e = [Math.cos(b) * 1.4, H * .72, Math.sin(b) * 1.4]; tubo(A, [[0, 0, 0], [0, H * .3, 0], [e[0] * .5, H * .5, e[2] * .5], e], [.13, .1, .06, .03], PAL[S.legno], H, 4); tips.push(e); }
        tips.forEach((t, k) => chioma(A, [t[0], t[1] + .2, t[2]], [1.05, .7, 1.05], cell, v === 3 ? '#b8a0a4' : L0('mandorlo'), H, v * 47 + k, 8, .8, { detN: 0, luce: .06 })); },
      tamerice(A, H, r, S, v) { for (let k = 0; k < 3; k++) { const b = k / 3 * TAU + r(), e = [Math.cos(b) * 1.1, H * .62, Math.sin(b) * 1.1]; tubo(A, [[0, 0, 0], [Math.cos(b) * .4, H * .3, Math.sin(b) * .4], e], [.12, .08, .04], PAL[S.legno], H, 4);
          chioma(A, [e[0], e[1] + .1, e[2]], [1, 1.3, 1], 'tamerice', L0('tamerice'), H, v * 53 + k, 10, .95, { sy: 1.3, detN: 0 }); } },
      cespo(A, H, r, S, v) { const R = S.chioma * (.9 + r() * .2), cell = S.pal === 'lentisco' ? 'lentisco' : S.pal === 'mirto' ? 'leccio' : 'lentisco';
        chioma(A, [0, H * .5, 0], [R, H * .5, R], cell, L0(S.pal), H, v * 59 + 1, 18 + (v % 2) * 4, .62, { fondo: .7, flex: .5, detN: 0 }); },
      oleandro(A, H, r, S, v) { const R = S.chioma;
        for (let k = 0; k < 5; k++) { const b = k / 5 * TAU + r(); tubo(A, [[0, 0, 0], [Math.cos(b) * R * .4, H * .55, Math.sin(b) * R * .4]], [.04, .025], '#6a5a44', H, 3); }
        chioma(A, [0, H * .55, 0], [R, H * .48, R], 'oleandro', L0('oleandro'), H, v * 71 + 1, 24, .7, { fondo: .3, flex: .7, detN: 0 }); },
      ginestra(A, H, r, S, v) { nucleo(A, [0, H * .35, 0], [S.chioma * .5, H * .3, S.chioma * .5], L0('ginestra'), H, v + 61, { det: 0, flex: .3 }); ciuffo(A, H, S.chioma * 1.9, 'ginestra', 4, r); },
      cuscino(A, H, r, S, v) { const R = S.chioma; chioma(A, [0, H * .45, 0], [R, H * .5, R], S === SP.cappero ? 'cappero' : 'rosmarino', L0(S.pal), H, v * 67 + 1, 12, .42, { fondo: .8, flex: .3, detN: 0 }); },
      pale(A, H, r, S, v) { const rr = rngK(v * 17 + 5);
        const pala = (c, a, s, liv) => { const n = nrm([Math.cos(a) * .3 + (rr() - .5) * .5, .1, Math.sin(a) * .3 + .8]); carta(A, c, .36 * s, n, n, 'pala', .62 + liv * .08, .1, rr() * .3 - .15, { sy: 1.25 });
          if (liv < 2) for (let k = 0; k < 2; k++) { const b = (k ? .6 : -.6) + (rr() - .5) * .4, nc = [c[0] + Math.sin(b) * .5 * s, c[1] + .62 * s, c[2] + (rr() - .5) * .2]; if (rr() < .85) pala(nc, a + b, s * .92, liv + 1); }
          else if (rr() < .7) for (let k = 0; k < 3; k++) punto(A, [c[0] + (k - 1) * .16 * s, c[1] + .46 * s, c[2]], .06, k % 2 ? '#d8603a' : '#e0b03a', .2); };
        for (let k = 0; k < 3; k++) pala([(k - 1) * .45, .45, (rr() - .5) * .4], k * 2.1, 1 + rr() * .2, 0); },
      rosetta(A, H, r, S, v) { const n = 16; for (let k = 0; k < n; k++) { const b = k / n * TAU * 2.3 + r() * .2, up = .5 + (k % 3) * .22, L = H * (1 + r() * .3) * (k < 5 ? .7 : 1);
          lama(A, [0, .05, 0], [Math.cos(b) * (1 - up * .5), up, Math.sin(b) * (1 - up * .5)], L, .16, .3 * (1 - up), 'agave', H, 3, { flex: .1 }); }
        if (v === 3) { tubo(A, [[0, .3, 0], [.1, 2.5, 0], [.2, 4.8, .05]], [.08, .06, .04], '#7a7a48', 5, 4); for (let k = 0; k < 6; k++) { const y = 3 + k * .32, b = k * 2.1; nucleo(A, [.15 + Math.cos(b) * .35, y, Math.sin(b) * .35], [.3, .12, .3], '#c8b040', 5, k + 3, { det: 0, luce: 1.1 }); } } },
      canne(A, H, r, S, v) { for (let k = 0; k < 11; k++) { const b = r() * TAU, s = r() * .7, Lh = H * (.75 + r() * .3); lama(A, [Math.cos(b) * s * .5, 0, Math.sin(b) * s * .5], [Math.cos(b) * s * .15, 1, Math.sin(b) * s * .15], Lh, .32, .04, 'canna', H, 3, { flex: 1 }); } },
      palma(A, H, r, S, v) { const a = r() * TAU, lean = (.04 + r() * .1) * H, lx = Math.cos(a) * lean, lz = Math.sin(a) * lean, NS = 8, pts = [];
        for (let k = 0; k <= NS; k++) { const t = k / NS; pts.push([lx * t * t, H * .86 * t, lz * t * t]); }
        tubo(A, pts, pts.map((_, k) => .34 - k * .012), PAL[S.legno], H, 6, { anelli: true });
        const top = pts[NS]; nucleo(A, [top[0], top[1] + .1, top[2]], [.6, .55, .6], '#6a5a34', H, v + 3, { det: 0 });
        for (let k = 0; k < 18; k++) { const b = k / 18 * TAU + r() * .3, up = k % 2 ? .6 : .18 + r() * .15, L = 3.4 + r() * .8;
          lama(A, [top[0], top[1] + .35, top[2]], [Math.cos(b) * .85, up, Math.sin(b) * .85], L, .55, .5 + (1 - up) * .35, 'palma', H, 5, { flex: 1, luce: up * .2 }); }
        if (v % 2) for (let k = 0; k < 4; k++) { const b = k / 4 * TAU + .4; punto(A, [top[0] + Math.cos(b) * .6, top[1] - .2, top[2] + Math.sin(b) * .6], .22, '#e09a2a', .9); } },
      washingtonia(A, H, r, S, v) { const lean = (.02 + r() * .05) * H, a = r() * TAU, NS = 8, pts = []; for (let k = 0; k <= NS; k++) { const t = k / NS; pts.push([Math.cos(a) * lean * t, H * .9 * t, Math.sin(a) * lean * t]); }
        tubo(A, pts, pts.map((_, k) => .26 - k * .014), PAL[S.legno], H, 5, { anelli: true });
        const top = pts[NS]; nucleo(A, [top[0], top[1] - .8, top[2]], [.72, 1.15, .72], '#5a4632', H, v + 5, { det: 1, luce: .8 });   // la gonna di foglie secche
        for (let k = 0; k < 14; k++) { const b = k / 14 * TAU, up = .2 + (k % 3) * .22, n = nrm([Math.cos(b), up + .3, Math.sin(b)]); carta(A, [top[0] + Math.cos(b) * .9, top[1] + .3 + up, top[2] + Math.sin(b) * .9], .9, n, nrm([Math.cos(b), .7, Math.sin(b)]), 'washingtonia', .6 + up * .3, 1, -Math.PI / 2 + (b % .3)); } },
      muro(A, H, r, S, v) { const cell = S === SP.bouganville ? 'bouganville' : 'edera', R = S.chioma, rr = rngK(v * 73 + 1);   // contro un muro: la faccia piatta a z=0, verso +z
        nucleo(A, [0, H * .55, .25], [R * .7, H * .38, .3], L0(S.pal), H, v * 73, { flex: .4, det: 1 });
        for (let k = 0; k < 40; k++) { const x = (rr() - .5) * R * 2 * Math.sin(Math.PI * (.2 + .8 * rr())), y = H * (.08 + rr() * .92), n = nrm([(rr() - .5) * .6, .3 + rr() * .4, 1]); carta(A, [x, y, .3 + rr() * .3], .48 + rr() * .2, n, nrm([n[0], .5, 1]), cell, .45 + y / H * .4, .5 * y / H, rr() * TAU); }
        tubo(A, [[0, 0, .15], [.1, H * .4, .2]], [.08, .06], '#5a4a3a', H, 4); },
      pergola(A, H, r, S, v) { const Lx = 3.2, D = 2.6, rr = rngK(v * 7 + 11);
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([i, j]) => tubo(A, [[i * Lx / 2, 0, j * D / 2], [i * Lx / 2, H, j * D / 2]], [.06, .05], '#7a6248', H, 4));
        for (let k = 0; k < 4; k++) { const z = -D / 2 + k * D / 3; tubo(A, [[-Lx / 2 - .2, H, z], [Lx / 2 + .2, H, z]], [.04, .04], '#8a7050', H, 4); }
        tubo(A, [[-Lx / 2, 0, -D / 2], [-Lx / 2 + .1, H * .5, -D / 2 + .1], [-Lx / 4, H + .1, 0]], [.07, .05, .03], '#5a4432', H, 4);
        for (let k = 0; k < 34; k++) { const x = (rr() - .5) * Lx * 1.05, z = (rr() - .5) * D * 1.05, n = nrm([(rr() - .5) * .5, 1, (rr() - .5) * .5]); carta(A, [x, H + .12 + rr() * .15, z], .55 + rr() * .2, n, nrm([n[0], 1, n[2]]), 'vite', .55 + rr() * .3, .3, rr() * TAU); }
        for (let k = 0; k < 6; k++) { const x = (rr() - .5) * Lx * .8, z = (rr() - .5) * D * .8, n = nrm([rr() - .5, 0, rr() - .5]); carta(A, [x, H - .55, z], .4, n, [0, .3, 1], 'vite', .45, .3, Math.PI, { sx: .9, sy: 1.3 }); } },
      ciuffo(A, H, r, S, v) { const L = S.erbe || [S.pal === 'erbaSecca' ? 'erbaSecca' : 'erbaVerde']; ciuffo(A, H, H * .95, L[v % L.length], 3, r); },
      ombrelle(A, H, r, S, v) { ciuffo(A, H, H * .8, 'finocchietto', 2, r); },
      fiori(A, H, r, S, v) { ciuffo(A, H, H * .9, 'papavero', 3, r); },
      ciuffoAlto(A, H, r, S, v) { ciuffo(A, H, H * .7, S.cella, 2, r); },
    };
    // ---------------- LE SAGOME: media distanza (nucleo + carte grandi), lontano (nucleo a 20 facce + 3 carte) ----------------
    function sagomaDi(sp, H, liv) {
      const S = SP[sp], A = Acc(), cellOf = { pino: 'pino', pinoM: 'pinoM', leccio: 'leccio', carrubo: 'carrubo', palma: 'palma', washingtonia: 'washingtonia', eucalipto: 'eucalipto', cipresso: 'cipresso', ulivo: 'ulivo', fico: 'fico', agrume: 'agrume', mandorlo: 'mandorlo', tamerice: 'tamerice', lentisco: 'lentisco', mirto: 'leccio', ginestra: 'ginestra', rosmarino: 'rosmarino', oleandro: 'oleandro', ficodindia: 'pala', agave: 'agave', canna: 'canna', bouganville: 'bouganville', edera: 'edera', vite: 'vite' }[sp] || 'lentisco';
      const R = S.chioma, n = liv === 1 ? 14 : 3, s = liv === 1 ? 1.4 : 2;
      const tr = (h, r) => { if (S.tronco) tubo(A, [[0, 0, 0], [0, h, 0]], [r, r * .7], PAL[S.legno] || '#6a5a4a', H, liv === 1 ? 4 : 3); };
      const cl = S.sag;
      if (cl === 'ombrello') { tr(H * .8, .03 * H); chioma(A, [0, H * .87, 0], [R, H * .08, R], cellOf, L0(S.pal), H, 5, n, s * 1.2, { fondo: .7, detN: 0 }); }
      else if (cl === 'tondo') { tr(H * .42, .2); chioma(A, [0, H * .64, 0], [R, H * .34, R], cellOf, L0(S.pal), H, 5, n, s, { detN: 0 }); }
      else if (cl === 'colonna') { nucleo(A, [0, H * .5, 0], [R * .85, H * .5, R * .85], L0(S.pal), H, 5, { det: 0 }); }
      else if (cl === 'palma') { tr(H * .86, .25); for (let k = 0; k < (liv === 1 ? 8 : 5); k++) { const b = k / (liv === 1 ? 8 : 5) * TAU; lama(A, [0, H * .88, 0], [Math.cos(b) * .85, .25, Math.sin(b) * .85], 3.2, .55, .6, cellOf, H, 2, {}); } }
      else if (cl === 'rado') { tr(H * .7, .03 * H); chioma(A, [0, H * .78, 0], [R, H * .2, R], cellOf, L0(S.pal), H, 5, n, s, { detN: 0 }); }
      else chioma(A, [0, H * .48, 0], [R, H * .5, R], cellOf, L0(S.pal), H, 5, liv === 1 ? 6 : 0, s * .5, { fondo: .6, detN: 0 });
      return A.build();
    }
    const CACHE = {};
    const H0 = sp => { const S = SP[sp]; return (S.h[0] + S.h[1]) / 2; };
    function modello(sp, v) { const k = sp + v; if (CACHE[k]) return CACHE[k]; const S = SP[sp], H = H0(sp), A = Acc(); FORME[S.forma](A, H, rngK(hash2(sp.length * 31 + sp.charCodeAt(0), v, 911) * 1e9), S, v); return (CACHE[k] = A.build()); }
    function sagoma(sp, liv) { const k = '§' + sp + liv; return CACHE[k] || (CACHE[k] = sagomaDi(sp, H0(sp), liv || 1)); }
    return { Acc, nucleo, carta, chioma, tubo, lama, ciuffo, punto, FORME, modello, sagoma, H0, atlante, cellUV, CELLE, hx, mix };
  })();

  // ================= IL MATERIALE: vento, livelli, dissolvenza =================
  // Un MeshLambertMaterial coi colori nei vertici; il vertex shader legge il centro dell'istanza (o l'attributo centro, per la geometria
  // fusa da lontano), calcola la distanza dalla camera e il peso k della fascia del livello (uBand: entra fra x e y, esce fra z e w);
  // il fragment shader dissolve a retino (niente trasparenze da ordinare). Sotto k ≈ 0 la pianta si chiude in un punto: niente disegno.
  const U = typeof THREE === 'undefined' ? null : { uT: { value: 0 }, uCam: { value: new THREE.Vector3() }, uWind: { value: .06 } };
  function materiale(band, opz) {
    opz = opz || {};
    // le carte hanno già le due facce: il materiale guarda solo il davanti (niente rovescio con la luce girata)
    const m = new THREE.MeshLambertMaterial({ vertexColors: true, map: KIT ? KIT.atlante() : null, alphaTest: .5, side: THREE.FrontSide });
    if (opz.senzaProfondita) m.depthWrite = false;   // [vegetazione] il prato di massa: niente profondità, quindi niente contorno del post
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
    m.customProgramCacheKey = () => 'veg' + (opz.centro ? 'C' : '');
    return m;
  }
  // l'ombra delle carte: la profondità ritagliata dall'alfa (le chiazze di luce sotto gli alberi)
  let DEPTH = null;
  function ombra() { return DEPTH || (DEPTH = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: KIT.atlante(), alphaTest: .5 })); }

  const api = { SP, SPECIE, PAL, FORM, F, RADURE, SPENTO, piano, pianta, mia, copertura, misura, formazioni, hash2, fbm, KIT, U, materiale, ombra };
  return api;
})();
if (typeof module !== 'undefined') module.exports = Vegetazione;
