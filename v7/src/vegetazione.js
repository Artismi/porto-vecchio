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
    leccio: ['#183a33', '#2b5a3e', '#4a8048'],          // il più scuro, bluastro, opaco
    pino: ['#1c3a36', '#2e5a44', '#4e7a4a'],            // ombrello verde scuro freddo
    pinoM: ['#28483e', '#3f7050', '#6a9a58'],           // marittimo e d'Aleppo: più chiaro e rado
    cipresso: ['#16342c', '#244c38', '#3a6a44'],
    carrubo: ['#1e4434', '#356a3c', '#5e9448'],         // lucido, caldo
    lentisco: ['#204236', '#376a40', '#5e9050'],
    mirto: ['#2a4c38', '#447a44', '#6a9e50'],
    // i verdi medi e brillanti (coltivi, acqua)
    agrume: ['#1a4430', '#2e6a36', '#58964a'],
    fico: ['#2e5a36', '#5a943a', '#9ac850'],
    oleandro: ['#2a5040', '#4a7e48', '#76a85a'],
    canna: ['#5a7a48', '#8aaa50', '#c0d070'],
    edera: ['#123a30', '#245a3a', '#3e7a44'],
    // gli argenti (ulivo, eucalipto, rosmarino, agave, tamerice)
    ulivo: ['#6e8278', '#a8bca4', '#dce6d0'],
    eucalipto: ['#4a6460', '#7a9890', '#b4ccb8'],
    rosmarino: ['#3e5a52', '#6a8a70', '#9ab894'],
    agave: ['#4a7478', '#7aa0a0', '#a8c8c0'],
    tamerice: ['#5a6e64', '#8a9c80', '#c0c4a0'],
    ficodindia: ['#3a6a3a', '#64943e', '#94c050'],
    // i chiari (erba giovane, mandorlo, ginestra) e i gialli paglia
    mandorlo: ['#5a7a48', '#8eb05a', '#c8dc84'],
    ginestra: ['#365c30', '#5a8a38', '#88b048'],
    erbaVerde: ['#3a5e2e', '#6a9038', '#a8c058'],
    erbaSecca: ['#8a7a48', '#c8b064', '#ecdc98'],
    finocchietto: ['#6a8a38', '#a8b848', '#e0d860'],
    felce: ['#1e4a2e', '#3e7a3a', '#7ab048'],
    aghiCaduti: ['#6a3a22', '#a2643a', '#d09a64'], foglieSecche: ['#3a3428', '#6e5c40', '#9a8460'],
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
    erbaSecca:   { nome: 'erba secca', strato: 'C', h: [.35, .7], chioma: .3, forma: 'ciuffo', pal: 'erbaSecca', erbe: ['erbaSecca', 'erbaDab', 'prato', 'erbaDab2'] },
    erbaVerde:   { nome: 'erba verde', strato: 'C', h: [.35, .7], chioma: .3, forma: 'ciuffo', pal: 'erbaVerde', erbe: ['erbaDab', 'erbaDab2', 'erbaAlta', 'prato'] },
    tappetoAghi: { nome: 'aghi caduti', strato: 'C', h: [.02, .03], chioma: 1.1, forma: 'tappeto', cella: 'lettieraAghi', pal: 'aghiCaduti' },
    tappetoFoglie:{ nome: 'foglie secche', strato: 'C', h: [.02, .03], chioma: .9, forma: 'tappeto', cella: 'lettieraFoglie', pal: 'foglieSecche' },
    pigna:       { nome: 'pigna', strato: 'C', h: [.12, .14], chioma: .1, forma: 'pigna', pal: 'aghiCaduti' },
    rametto:     { nome: 'rametto caduto', strato: 'C', h: [.06, .08], chioma: .6, forma: 'rametto', pal: 'aghiCaduti' },
    felce:       { nome: 'felce', strato: 'B', h: [.5, .9], chioma: .6, forma: 'felce', sag: 'cespo', pal: 'felce' },
    fioriBianchi:{ nome: 'cuscini di fiori bianchi', strato: 'C', h: [.25, .45], chioma: .45, forma: 'fioriBianchi', pal: 'erbaVerde' },
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
    // la lettiera: sotto i pini gli aghi caduti e le pigne, sotto i lecci le foglie secche e le felci (dove l'ombra è fitta)
    { const fid = FORM[fi].id, h0 = hash2(Math.floor(x * 1.3), Math.floor(y * 1.3), 7711), o = P.ombra ? P.ombra[i] : fit;
      if ((fid === 'pineta' || fid === 'pinetaM') && ds > 1.2) { if (h0 < .22 + o * .3) return { sp: 'tappetoAghi', t: h0 * 3 % 1 }; if (h0 > .985) return { sp: 'pigna', t: h0 }; if (h0 > .978) return { sp: 'rametto', t: h0 }; }
      if ((fid === 'lecceta' || fid === 'macchia') && ds > 1.2 && o > .3) { if (h0 < .2 + o * .3) return { sp: 'tappetoFoglie', t: h0 * 3 % 1 }; if (h0 > .95 && fid === 'lecceta') return { sp: 'felce', t: h0 }; } }
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
  // Il modo di dipingerle (riferimenti dell'utente, 23 ottobre: boschi dipinti, la radura col rudere vista dall'alto):
  // - MASSE, NON FOGLIE: la chioma è fatta di pochi LOBI grandi; ogni lobo è un nucleo (massa che chiude) e una corona di CIOCCHE
  //   (carte con un grappolo di pennellate dipinte in grigio, ritagliate dall'alfa) che ne sfrangiano il bordo. La normale di ogni
  //   ciocca viene dal centro del suo lobo (mescolata con quella della chioma): ogni lobo prende la sua luce, la chioma resta un volume.
  // - TRE VALORI: il materiale (più sotto) porta la luce del gioco su una rampa a fasce morbide: ombra fredda (blu-teal), mezzo tono
  //   (la tinta della specie), luce calda (giallo-lime); il controluce accende i bordi delle ciocche; l'occlusione dipinta (attributo
  //   occ: 0 dentro e sotto, 1 fuori e in alto) scurisce il cuore della chioma e la base dei cespugli.
  // - Le pennellate sono in grigio: la tinta la dà la specie (colore nei vertici). Fiori, frutti, fronde, pale e agavi hanno le loro
  //   celle a colori. Un atlante solo per tutte le specie (8 × 5 celle da 256 px).
  const KIT = typeof THREE === 'undefined' ? null : (function () {
    const TAU = Math.PI * 2;
    const rngK = s => { let a = (s >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
    const hx = h => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
    const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
    const nrm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
    const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    // ---------------- L'ATLANTE ----------------
    const CELLE = ['ramoFoglioline', 'ramoOvali', 'ramoAghi', 'ramoAghi2', 'ramoLanceolate', 'ramoLunghe', 'ramoLarghe', 'ramoSquame',
      'erbaDab', 'erbaDab2', 'erbaAlta', 'felce', 'edera', 'pieno', 'corteccia', 'bianco',
      'palma', 'washingtonia', 'agave', 'pala', 'canna', 'vite', 'bouganville', 'oleandroFiori',
      'ginestra', 'mandorloFiore', 'agrumeFrutti', 'erbaSecca', 'finocchietto', 'papavero', 'cardo', 'asfodelo',
      'trifoglio', 'avena', 'cappero', 'fioriBianchi', 'prato', 'lettieraAghi', 'tamericeRamo', 'lettieraFoglie'];
    const CI = {}; CELLE.forEach((n, i) => CI[n] = i);
    // [vegetazione] le celle composte con foglie, aghi e fili d'erba fotografati (strumenti/vegetazione_atlante.py, fonti Poly Haven CC0):
    // il colore sta nella foto, la specie le tinge appena (TINTA_FOTO). La corteccia fotografata resta in grigio (la tinge il legno).
    const FOTO = new Set(['ramoFoglioline', 'ramoOvali', 'ramoAghi', 'ramoAghi2', 'ramoLanceolate', 'ramoLunghe', 'ramoLarghe', 'ramoSquame', 'erbaDab', 'erbaDab2', 'erbaAlta', 'felce', 'edera', 'prato', 'erbaSecca']);
    const TINTA_FOTO = { leccio: [.8, .88, .84], lentisco: [.84, .9, .84], mirto: [.9, .96, .9], carrubo: [.88, .94, .84], agrume: [.86, .96, .82], pino: [.92, 1, .94], pinoM: [1, 1.02, .94], cipresso: [.78, .88, .84],
      ulivo: [1.06, 1.1, 1.08], eucalipto: [1, 1.06, 1.08], oleandro: [.95, 1, .95], mandorlo: [1.02, 1.04, .96], fico: [.74, .9, .7], tamerice: [1, 1, 1], edera: [.8, .9, .85], felce: [.95, 1, .95], erbaVerde: [.95, 1, .92], erbaSecca: [1.04, 1, .94] };
    const tintaF = sp => TINTA_FOTO[sp] || [1, 1, 1];
    // [vegetazione] le foto si accendono solo con ?verdefoto (la strada dipinta è quella scelta: una gamma sola)
    const FOTO_ON = typeof location !== 'undefined' && /[?&]verdefoto\b/.test(location.search || '');
    const colCella = (cell, sp, col) => FOTO.has(cell) ? (FOTO_ON ? tintaF(sp) : col) : GRIGIE.has(cell) ? col : [1, 1, 1];
    const GRIGIE = new Set(['tamericeRamo', 'lettieraAghi', 'lettieraFoglie', 'erbaDab', 'erbaDab2', 'erbaAlta', 'felce', 'edera', 'pieno', 'corteccia', 'prato', 'lettieraAghi']);
    const CS = 256, NX = 8, NY = 5, IN = 3 / CS;
    const cellUV = k => { const i = CI[k], cx = i % NX, cy = Math.floor(i / NX); return [cx / NX + IN / NX, 1 - (cy + 1) / NY + IN / NY, (cx + 1) / NX - IN / NX, 1 - cy / NY - IN / NY]; };
    let ATL = null, CARICATO = null; const BASE = (typeof window !== 'undefined' && window.PV_VEG_BASE) || 'assets/vegetazione/';
    function atlante() {
      if (ATL) return ATL;
      const cv = document.createElement('canvas'); cv.width = CS * NX; cv.height = CS * NY; const g = cv.getContext('2d'), r = rngK(20261023);
      const pick = a => a[Math.floor(r() * a.length)];
      const cella = (nome, fn) => { const i = CI[nome], ox = (i % NX) * CS, oy = Math.floor(i / NX) * CS; g.save(); g.beginPath(); g.rect(ox + 4, oy + 4, CS - 8, CS - 8); g.clip(); g.translate(ox, oy); fn(); g.restore(); };
      const grigio = v => { v = Math.round(clamp(v, 0, 255)); return `rgb(${v},${v},${v})`; };
      // una pennellata: forma f ('tonda', 'aghi', 'lunga', 'larga', 'piccola'), centro, misura, angolo, valore; sotto, spostata in basso, la sua
      // ombra (più scura): ogni pennellata ha il labbro chiaro in alto e il fondo scuro, come nei boschi dipinti
      const dab = (f, x, y, s, a, v) => { const forma = (dx, dy, k) => { g.save(); g.translate(x + dx, y + dy); g.rotate(a); g.beginPath();
          if (f === 'aghi') { for (let q = 0; q < 9; q++) { const b = -Math.PI / 2 + (q - 4) * .32; g.moveTo(0, s * .3); g.lineTo(Math.cos(b) * s * k, Math.sin(b) * s * k); } g.restore(); g.lineCap = 'round'; return 'stroke'; }
          if (f === 'lunga') g.ellipse(0, 0, s * .26 * k, s * .78 * k, 0, 0, TAU);
          else if (f === 'larga') { [[-.35, .1], [.35, .1], [0, -.3], [-.2, -.1], [.2, -.1]].forEach(([u, w]) => { g.moveTo(u * s + s * .42 * k, w * s); g.ellipse(u * s, w * s, s * .42 * k, s * .36 * k, 0, 0, TAU); }); }
          else if (f === 'piccola') g.ellipse(0, 0, s * .4 * k, s * .3 * k, 0, 0, TAU);
          else { g.moveTo(0, -s * .62 * k); g.quadraticCurveTo(s * .62 * k, -s * .35 * k, s * .42 * k, s * .3 * k); g.quadraticCurveTo(0, s * .55 * k, -s * .42 * k, s * .3 * k); g.quadraticCurveTo(-s * .62 * k, -s * .35 * k, 0, -s * .62 * k); }
          g.restore(); return 'fill'; };
        const ombra = forma(s * .06, s * .14, 1.02); if (ombra === 'fill') { g.fillStyle = grigio(v * .55); g.fill(); } else { g.strokeStyle = grigio(v * .55); g.lineWidth = s * .09; g.stroke(); }
        const pieno = forma(0, 0, .96); if (pieno === 'fill') { const gr = g.createLinearGradient(x, y - s * .6, x, y + s * .5); gr.addColorStop(0, grigio(v * 1.18 + 20)); gr.addColorStop(.55, grigio(v)); gr.addColorStop(1, grigio(v * .78)); g.fillStyle = gr; g.fill(); }
        else { g.strokeStyle = grigio(v * 1.1); g.lineWidth = s * .07; g.stroke(); } };
      // la ciocca: un grappolo tondo di pennellate, più chiaro in alto a sinistra (dove batte il sole), coi bordi sfrangiati; il fondo pieno
      // e scuro (le pennellate in basso sono quelle in ombra)
      const ciocca = (nome, f, n, s0, s1) => cella(nome, () => { const P = []; for (let k = 0; k < n; k++) { const a = r() * TAU, d = Math.sqrt(r()) * 96; P.push([128 + Math.cos(a) * d, 130 + Math.sin(a) * d * .86]); }
        P.sort((a, b) => a[1] - b[1]).reverse().forEach(([x, y]) => { const t = clamp(1 - ((y - 40) / 180) * .7 - ((x - 128) / 100) * .15, 0, 1); dab(f, x, y, s0 + r() * (s1 - s0), (r() - .5) * (f === 'lunga' ? 1.6 : 1), 95 + t * 120 + (r() - .5) * 26); }); });
      // i rametti dipinti (in grigio, li tinge la specie): rametti che partono dal centro della cella verso fuori, con le foglie vere della
      // specie lungo i rametti; ogni foglia ha il bordo alto più chiaro e il resto più scuro, e le foglie in alto nella cella (quelle che
      // stanno sopra nella carta) sono più chiare e vengono dipinte per ultime. Il contorno della carta resta frastagliato.
      const fogliaG = (x, y, L, W, a, v, forma) => { const sh = (k, dy) => { g.save(); g.translate(x, y + dy); g.rotate(a); g.beginPath();
          if (forma === 'larga') { [[0, 0, 1], [-.32, -.25, .7], [.32, -.25, .7], [-.38, .22, .62], [.38, .22, .62]].forEach(([u, w2, q]) => { const cx = L * (.5 + u * .2), cy = w2 * L * .6; g.moveTo(cx + L * .28 * q * k, cy); g.ellipse(cx, cy, L * .28 * q * k, L * .22 * q * k, u, 0, TAU); }); }
          else { g.moveTo(0, 0); g.quadraticCurveTo(L * .4, -W * k, L, 0); g.quadraticCurveTo(L * .4, W * k, 0, 0); }
          g.restore(); };
        sh(1, W * .25); g.fillStyle = grigio(v * .62); g.fill(); sh(.78, -W * .12); g.fillStyle = grigio(v * 1.08 + 8); g.fill();
        if (forma !== 'larga' && L > 14) { g.save(); g.translate(x, y); g.rotate(a); g.strokeStyle = grigio(v * 1.25); g.lineWidth = Math.max(.7, W * .12); g.beginPath(); g.moveTo(L * .08, -W * .05); g.lineTo(L * .85, -W * .05); g.stroke(); g.restore(); } };
      const spray = (nome, o) => cella(nome, () => {
        const F = [], R = o.R || 112, NR = o.rami || 7, cx = 128, cy = o.cy || 128;
        for (let k = 0; k < NR; k++) { const a = k / NR * TAU + r() * .6, L = R * (.62 + r() * .38), ex = cx + Math.cos(a) * L, ey = cy + Math.sin(a) * L * (o.schiaccia || .9);
          g.strokeStyle = grigio(70); g.lineWidth = o.legno || 2.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo((cx + ex) / 2 + (r() - .5) * 18, (cy + ey) / 2 + (r() - .5) * 18, ex, ey); g.stroke();
          const tw = [[cx, cy, ex, ey]]; for (let s = 0; s < (o.sotto || 2); s++) { const tt = .35 + s * .3, sx = cx + (ex - cx) * tt, sy = cy + (ey - cy) * tt, b = a + (s % 2 ? .7 : -.7) + (r() - .5) * .3, l2 = L * .45; tw.push([sx, sy, sx + Math.cos(b) * l2, sy + Math.sin(b) * l2]); g.lineWidth = (o.legno || 2.4) * .6; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + Math.cos(b) * l2, sy + Math.sin(b) * l2); g.stroke(); }
          tw.forEach(([x0, y0, x1, y1]) => { const dir = Math.atan2(y1 - y0, x1 - x0), n = o.perRamo || 8; for (let q = 0; q < n; q++) { const tt = .25 + .75 * q / n + r() * .05, px = x0 + (x1 - x0) * tt, py = y0 + (y1 - y0) * tt; F.push([px, py, dir + (q % 2 ? 1 : -1) * (o.apre || .7) + (r() - .5) * .3]); } F.push([x1, y1, dir]); }); }
        F.sort((p, q) => q[1] - p[1]).forEach(([x, y, a]) => { const t2 = clamp(1 - (y - 20) / 230, 0, 1), v = 92 + t2 * 118 + (r() - .5) * 30;
          if (o.forma === 'aghi') { for (let q = 0; q < (o.aghi || 16); q++) { const b = a + (r() - .5) * 2.2, L = (o.L || 30) * (.7 + r() * .5); const gr = g.createLinearGradient(x, y, x + Math.cos(b) * L, y + Math.sin(b) * L); gr.addColorStop(0, grigio(v * .6)); gr.addColorStop(1, grigio(v * 1.15 + 10)); g.strokeStyle = gr; g.lineWidth = o.W || 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(b) * L, y + Math.sin(b) * L); g.stroke(); } }
          else if (o.forma === 'squame') { for (let q = 0; q < 6; q++) { const b = a + (r() - .5) * 1.4; fogliaG(x + (r() - .5) * 6, y + (r() - .5) * 6, 11 + r() * 5, 4.2, b, v, 'squama'); } }
          else fogliaG(x, y, (o.L || 18) * (.8 + r() * .4), (o.W || 6) * (.8 + r() * .3), a + (o.pende ? (Math.PI / 2 - a) * o.pende : 0), v, o.forma); });
      });
      spray('ramoAghi', { forma: 'aghi', rami: 7, perRamo: 4, aghi: 22, L: 34, W: 2.2, apre: .5 });
      spray('ramoAghi2', { forma: 'aghi', rami: 6, perRamo: 3, aghi: 18, L: 42, W: 2, apre: .6 });
      ciocca('ramoFoglioline', 'tonda', 90, 18, 30); ciocca('ramoOvali', 'tonda', 60, 24, 40);
      spray('ramoLanceolate', { forma: 'lancia', rami: 8, perRamo: 7, L: 30, W: 5.2, apre: .55, legno: 1.8 });
      spray('ramoLunghe', { forma: 'lancia', rami: 6, perRamo: 5, L: 52, W: 7, apre: .4, pende: .55, cy: 90, schiaccia: .5 });
      spray('ramoLarghe', { forma: 'larga', rami: 6, perRamo: 2, L: 50, W: 20, apre: .9, sotto: 1 });
      spray('ramoSquame', { forma: 'squame', rami: 9, perRamo: 6, apre: .5, legno: 2 });
      cella('tamericeRamo', () => { for (let k = 0; k < 22; k++) { const x0 = 20 + r() * 216, y0 = 10 + r() * 50; g.strokeStyle = grigio(90); g.lineWidth = 1.4; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + 18, y0 + 90, x0 + (r() - .5) * 40, y0 + 190); g.stroke();
          for (let q = 0; q < 46; q++) { const t2 = q / 46, px = x0 + 36 * t2 * (1 - t2) + (r() - .5) * 6, py = y0 + 190 * t2; g.strokeStyle = grigio(110 + (1 - t2) * 100 + r() * 30); g.lineWidth = 1.2; g.beginPath(); g.moveTo(px, py); g.lineTo(px + (r() - .5) * 20, py + 6 + r() * 9); g.stroke(); } } });
      // le lettiere (si posano piatte a terra, alfa sfumato sul bordo): gli aghi caduti, rossicci e incrociati; le foglie secche del leccio
      const lettiera = (nome, fn) => cella(nome, () => { for (let k = 0; k < 1400; k++) { const a = r() * TAU, d = Math.pow(r(), .7) * 118; if (r() > 1.15 - d / 118) continue; fn(128 + Math.cos(a) * d, 128 + Math.sin(a) * d); } });
      lettiera('lettieraAghi', (x, y) => { const b = r() * TAU, L = 14 + r() * 16, v = 110 + r() * 120; g.strokeStyle = grigio(v); g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(b) * L, y + Math.sin(b) * L); g.stroke(); });
      lettiera('lettieraFoglie', (x, y) => { if (r() < .5) return; fogliaG(x, y, 12 + r() * 6, 5, r() * TAU, 100 + r() * 110, 'ovale'); });
      // le erbe dipinte: ciuffi di lame larghe, chiare in punta (il prato acceso dei riferimenti), scure alla base
      const erba = (nome, n, h0, h1, w0) => cella(nome, () => { for (let k = 0; k < n; k++) { const x0 = 128 + (r() - .5) * 170, h = h0 + Math.pow(r(), 1.3) * (h1 - h0), lean = (r() - .5) * 120, w = w0 * (.7 + r() * .6), gr = g.createLinearGradient(0, 256, 0, 256 - h);
          gr.addColorStop(0, grigio(60)); gr.addColorStop(.45, grigio(150 + r() * 30)); gr.addColorStop(1, grigio(215 + r() * 35)); g.fillStyle = gr; g.beginPath(); g.moveTo(x0 - w, 256); g.quadraticCurveTo(x0 + lean * .3, 256 - h * .6, x0 + lean, 256 - h); g.quadraticCurveTo(x0 + lean * .3 + w * .4, 256 - h * .55, x0 + w, 256); g.fill(); } });
      erba('erbaDab', 90, 90, 220, 3.2); erba('erbaDab2', 70, 120, 250, 4); erba('erbaAlta', 60, 170, 250, 4); erba('prato', 130, 60, 150, 5);
      cella('felce', () => { for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * .38, L = 150 + r() * 70, ex = 128 + Math.cos(a) * L * .8, ey = 250 + Math.sin(a) * L; g.strokeStyle = grigio(110); g.lineWidth = 3; g.beginPath(); g.moveTo(128, 252); g.quadraticCurveTo((128 + ex) / 2, (250 + ey) / 2 - 20, ex, ey); g.stroke();
          for (let q = 1; q < 16; q++) { const t = q / 16, px = 128 + (ex - 128) * t, py = 252 + (ey - 252) * t - Math.sin(t * Math.PI) * 20, w = 22 * Math.sin(Math.PI * Math.min(1, t * 1.1)); [-1, 1].forEach(sd => { g.fillStyle = grigio(120 + t * 110 + (sd < 0 ? 15 : -10)); g.beginPath(); g.ellipse(px + sd * w * .5 * Math.cos(a + 1.57), py + sd * w * .5 * Math.sin(a + 1.57), w * .55, 4.5, a + sd * 1.1, 0, TAU); g.fill(); }); } } });
      cella('edera', () => { for (let k = 0; k < 34; k++) { const x = 30 + r() * 196, y = 30 + r() * 196, s = 18 + r() * 12, v = 110 + (1 - y / 256) * 100; g.fillStyle = grigio(v * .6); [[0, -1], [-.85, -.25], [.85, -.25], [-.5, .5], [.5, .5]].forEach(([u, w]) => { g.beginPath(); g.ellipse(x + u * s * .5 + 2, y + w * s * .5 + 3, s * .4, s * .34, 0, 0, TAU); g.fill(); });
          g.fillStyle = grigio(v); [[0, -1], [-.85, -.25], [.85, -.25], [-.5, .5], [.5, .5]].forEach(([u, w]) => { g.beginPath(); g.ellipse(x + u * s * .5, y + w * s * .5, s * .4, s * .34, 0, 0, TAU); g.fill(); }); g.strokeStyle = grigio(v * 1.3); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y + s * .3); g.lineTo(x, y - s * .5); g.stroke(); } });
      cella('pieno', () => { g.fillStyle = grigio(120); g.fillRect(0, 0, CS, CS); for (let k = 0; k < 260; k++) dab('tonda', r() * 256, r() * 256, 18 + r() * 16, r() - .5, 90 + r() * 90); });
      cella('corteccia', () => { g.fillStyle = grigio(150); g.fillRect(0, 0, CS, CS); for (let k = 0; k < 220; k++) { const x = r() * 256; g.strokeStyle = grigio(100 + r() * 130); g.lineWidth = 2 + r() * 6; g.beginPath(); g.moveTo(x, r() * 256); g.lineTo(x + (r() - .5) * 10, r() * 256); g.stroke(); }
        for (let k = 0; k < 50; k++) { g.fillStyle = grigio(80 + r() * 50); g.fillRect(r() * 256, r() * 256, 10 + r() * 24, 3 + r() * 5); } });
      cella('bianco', () => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, CS, CS); });
      // le celle a colori
      const foglia = (x, y, L, W, a, c) => { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = c; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(L * .35, -W, L, 0); g.quadraticCurveTo(L * .35, W, 0, 0); g.fill(); g.restore(); };
      const fiore5 = (x, y, rr, c, cc) => { g.fillStyle = c; for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; g.beginPath(); g.ellipse(x + Math.cos(a) * rr * .55, y + Math.sin(a) * rr * .55, rr * .55, rr * .38, a, 0, TAU); g.fill(); } g.fillStyle = cc; g.beginPath(); g.arc(x, y, rr * .25, 0, TAU); g.fill(); };
      cella('palma', () => { g.strokeStyle = '#8a9a4a'; g.lineWidth = 5; g.beginPath(); g.moveTo(128, 256); g.lineTo(128, 2); g.stroke(); for (let y = 250; y > 8; y -= 5.2) { const t = (256 - y) / 250, L = 118 * Math.sin(Math.PI * Math.min(1, t * .9 + .1)); [-1, 1].forEach(s => { g.strokeStyle = pick(['#3e6e3a', '#5a8a3a', '#78a844', '#9ac050']); g.lineWidth = 4 * (1 - t * .5); g.beginPath(); g.moveTo(128, y); g.quadraticCurveTo(128 + s * L * .5, y - 10, 128 + s * L, y - 22 + r() * 8); g.stroke(); }); } });
      cella('washingtonia', () => { for (let k = 0; k < 44; k++) { const a = Math.PI + .1 + k / 43 * (Math.PI - .2), L = 112 + r() * 10; g.strokeStyle = pick(['#3e6a44', '#527e4e', '#6a9658']); g.lineWidth = 6; g.beginPath(); g.moveTo(128, 250); g.lineTo(128 + Math.cos(a) * L, 250 + Math.sin(a) * L * 2.1); g.stroke(); } });
      cella('agave', () => { const gr = g.createLinearGradient(0, 256, 0, 0); gr.addColorStop(0, '#3e6a6e'); gr.addColorStop(1, '#a8ccc0'); g.fillStyle = gr; g.beginPath(); g.moveTo(70, 256); g.quadraticCurveTo(90, 80, 128, 0); g.quadraticCurveTo(166, 80, 186, 256); g.fill(); g.strokeStyle = '#d8c868'; g.lineWidth = 3; g.stroke(); });
      cella('pala', () => { g.fillStyle = '#6e8a62'; g.fillRect(0, 0, CS, CS); for (let k = 0; k < 120; k++) { const x = r() * 256, y = r() * 256, rd = 8 + r() * 30, gr2 = g.createRadialGradient(x, y, 0, x, y, rd); gr2.addColorStop(0, r() < .5 ? 'rgba(140,160,110,.35)' : 'rgba(70,96,70,.3)'); gr2.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr2; g.fillRect(x - rd, y - rd, rd * 2, rd * 2); }
        { const gr = g.createRadialGradient(128, 128, 60, 128, 128, 136); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(60,70,40,.5)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }
        for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) { const x = 14 + i * 28 + (j % 2) * 14 + (r() - .5) * 4, y = 14 + j * 28 + (r() - .5) * 4; g.fillStyle = 'rgba(60,60,40,.5)'; g.beginPath(); g.arc(x + 1, y + 1.5, 3.4, 0, TAU); g.fill(); g.fillStyle = '#d8d0a8'; g.beginPath(); g.arc(x, y, 2.2, 0, TAU); g.fill(); } });
      cella('canna', () => { g.strokeStyle = '#a8b468'; g.lineWidth = 4; g.beginPath(); g.moveTo(128, 256); g.lineTo(130, 20); g.stroke(); for (let k = 0; k < 9; k++) { const y = 230 - k * 22, s = k % 2 ? 1 : -1; g.fillStyle = pick(['#6a9a48', '#8ab450', '#a8c860']); g.beginPath(); g.moveTo(128, y); g.quadraticCurveTo(128 + s * 70, y - 30, 128 + s * 118, y + 20); g.quadraticCurveTo(128 + s * 60, y - 14, 128, y + 8); g.fill(); }
        for (let k = 0; k < 40; k++) { g.strokeStyle = pick(['#e0d0a8', '#d0c098', '#f0e4c4']); g.lineWidth = 2; g.beginPath(); g.moveTo(130, 30); g.lineTo(130 + (r() - .3) * 50, 4 + r() * 30); g.stroke(); } });
      const grappoloC = (nome, n, fn) => cella(nome, () => { const P = []; for (let k = 0; k < n; k++) { const a = r() * TAU, d = Math.sqrt(r()) * 98; P.push([128 + Math.cos(a) * d, 128 + Math.sin(a) * d * .9]); } P.sort((a, b) => a[1] - b[1]).forEach(([x, y], k) => fn(x, y, k, 1 - y / 256)); });
      grappoloC('vite', 16, (x, y, k, t) => { const s = 34; g.fillStyle = `hsl(${88 + r() * 20},${45 + t * 15}%,${26 + t * 26}%)`; [[0, -1.1], [-.9, -.4], [.9, -.4], [-.6, .3], [.6, .3], [0, 0]].forEach(([u, w]) => { g.beginPath(); g.ellipse(x + u * s * .45, y + w * s * .45, s * .34, s * .3, 0, 0, TAU); g.fill(); }); });
      grappoloC('bouganville', 120, (x, y, k, t) => { if (k % 4 === 0) foglia(x, y, 20, 10, r() * TAU, `hsl(110,40%,${22 + t * 20}%)`); else { g.fillStyle = `hsl(${325 + r() * 15},${70 + r() * 15}%,${34 + t * 26}%)`; for (let q = 0; q < 3; q++) { const b = q / 3 * TAU + r(); g.beginPath(); g.ellipse(x + Math.cos(b) * 4, y + Math.sin(b) * 4, 6, 4, b, 0, TAU); g.fill(); } } });
      grappoloC('oleandroFiori', 60, (x, y, k, t) => { if (k % 3) foglia(x, y, 34, 6, r() * TAU, `hsl(105,30%,${20 + t * 24}%)`); else fiore5(x, y, 9, `hsl(${340 + r() * 10},${60 + t * 10}%,${62 + t * 14}%)`, '#fbe6ee'); });
      cella('ginestra', () => { for (let k = 0; k < 46; k++) { const x0 = 128 + (r() - .5) * 60, x1 = 128 + (r() - .5) * 230, y1 = 6 + r() * 70; g.strokeStyle = pick(['#3e6a30', '#5a8a38', '#7aa440']); g.lineWidth = 2.4; g.beginPath(); g.moveTo(x0, 252); g.quadraticCurveTo((x0 + x1) / 2, 140, x1, y1); g.stroke();
          for (let q = 0; q < 6; q++) { const t = .35 + q * .1, px = x0 + (x1 - x0) * t * t, py = 252 + (y1 - 252) * t; g.fillStyle = q % 2 ? '#ffd030' : '#f0b820'; g.beginPath(); g.ellipse(px + 3, py, 6, 4, .5, 0, TAU); g.fill(); } } });
      grappoloC('mandorloFiore', 120, (x, y, k, t) => fiore5(x, y, 7 + r() * 3, `hsl(${345 + r() * 10},${50 + r() * 30}%,${84 + t * 10}%)`, '#c86a7a'));
      grappoloC('agrumeFrutti', 70, (x, y, k, t) => { if (k % 9 === 0) { const gr = g.createRadialGradient(x - 4, y - 4, 2, x, y, 13); gr.addColorStop(0, '#ffe0a0'); gr.addColorStop(.6, '#f39a26'); gr.addColorStop(1, '#c86818'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, 12, 0, TAU); g.fill(); } else foglia(x, y, 24, 11, r() * TAU, `hsl(118,${40 + t * 10}%,${16 + t * 24}%)`); });
      const ciuffoC = (nome, n, cols, extra) => cella(nome, () => { for (let k = 0; k < n; k++) { const x0 = 128 + (r() - .5) * 150, h = 90 + Math.pow(r(), 1.4) * 160, lean = (r() - .5) * 110, w = 2.4 + r() * 2.8, gr = g.createLinearGradient(0, 256, 0, 256 - h);
          gr.addColorStop(0, cols[0]); gr.addColorStop(.5, pick(cols.slice(1))); gr.addColorStop(1, pick(cols.slice(1))); g.fillStyle = gr; g.beginPath(); g.moveTo(x0 - w, 256); g.quadraticCurveTo(x0 + lean * .3, 256 - h * .6, x0 + lean, 256 - h); g.quadraticCurveTo(x0 + lean * .3 + w * .3, 256 - h * .55, x0 + w, 256); g.fill(); } if (extra) extra(); });
      ciuffoC('erbaSecca', 90, ['#5a4a2c', '#c8b064', '#e8d698', '#b8984e', '#f0e0a8']);
      cella('finocchietto', () => { for (let k = 0; k < 7; k++) { const x0 = 128 + (r() - .5) * 60, x1 = 128 + (r() - .5) * 200, y1 = 20 + r() * 60; g.strokeStyle = '#6a8a38'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x0, 256); g.quadraticCurveTo(x0, 150, x1, y1); g.stroke();
          for (let q = 0; q < 14; q++) { const a = -Math.PI / 2 - .8 + q / 13 * 1.6; g.strokeStyle = '#a8b84a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 + Math.cos(a) * 24, y1 + 10 + Math.sin(a) * 14); g.stroke(); g.fillStyle = '#f0dc3a'; g.beginPath(); g.arc(x1 + Math.cos(a) * 24, y1 + 10 + Math.sin(a) * 14, 3.4, 0, TAU); g.fill(); } } });
      ciuffoC('papavero', 50, ['#2e5a1c', '#6a9a3a', '#8ab448'], () => { for (let k = 0; k < 6; k++) { const x0 = 60 + r() * 136, y = 30 + r() * 90; g.strokeStyle = '#4a7a2e'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, 256); g.quadraticCurveTo(x0, 160, x0, y); g.stroke(); g.fillStyle = '#e8401e'; for (let q = 0; q < 4; q++) { const a = q / 4 * TAU + .4; g.beginPath(); g.ellipse(x0 + Math.cos(a) * 7, y + Math.sin(a) * 5, 10, 7, a, 0, TAU); g.fill(); } g.fillStyle = '#2a1a1a'; g.beginPath(); g.arc(x0, y, 4, 0, TAU); g.fill(); } });
      cella('cardo', () => { for (let k = 0; k < 3; k++) { const x1 = 128 + (k - 1) * 50, y1 = 50 + r() * 30; g.strokeStyle = '#6a8a7a'; g.lineWidth = 3; g.beginPath(); g.moveTo(128, 256); g.quadraticCurveTo(128, 150, x1, y1); g.stroke(); g.fillStyle = '#6a8a6a'; g.beginPath(); g.arc(x1, y1 + 10, 13, 0, TAU); g.fill(); g.fillStyle = '#b070d0'; for (let q = 0; q < 26; q++) { const a = -Math.PI / 2 + (r() - .5) * 2.2; g.fillRect(x1 + Math.cos(a) * 10, y1 + 2 + Math.sin(a) * 14, 2.4, 8); } } });
      cella('asfodelo', () => { for (let k = 0; k < 22; k++) { const x0 = 128 + (r() - .5) * 90; g.fillStyle = pick(['#4a7a3a', '#6a9a48']); g.beginPath(); g.moveTo(x0 - 4, 256); g.quadraticCurveTo(x0 + (r() - .5) * 40, 200, x0 + (r() - .5) * 70, 150 + r() * 40); g.lineTo(x0 + 4, 256); g.fill(); } g.strokeStyle = '#7a9a4a'; g.lineWidth = 3; g.beginPath(); g.moveTo(128, 256); g.lineTo(130, 20); g.stroke(); for (let q = 0; q < 30; q++) fiore5(130 + (q % 2 ? 1 : -1) * (6 + r() * 6), 24 + q * 4.5, 5.5, '#fbf6f0', '#c8a070'); });
      cella('trifoglio', () => { for (let k = 0; k < 80; k++) { const x = 20 + r() * 216, y = 130 + r() * 122, t = 1 - y / 256; g.fillStyle = `hsl(${100 + r() * 15},45%,${20 + t * 30}%)`; for (let q = 0; q < 3; q++) { const a = q / 3 * TAU + r(); g.beginPath(); g.ellipse(x + Math.cos(a) * 5, y + Math.sin(a) * 5, 6, 5, a, 0, TAU); g.fill(); } }
        for (let k = 0; k < 9; k++) { const x = 30 + r() * 196, y = 90 + r() * 70; g.fillStyle = pick(['#e8a0c0', '#ffffff', '#f0c0d8']); g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fill(); } });
      cella('avena', () => { for (let k = 0; k < 16; k++) { const x0 = 128 + (r() - .5) * 120, x1 = x0 + (r() - .5) * 90, y1 = 8 + r() * 60; g.strokeStyle = pick(['#c8b470', '#b8a460', '#d8c480']); g.lineWidth = 1.8; g.beginPath(); g.moveTo(x0, 256); g.quadraticCurveTo(x0, 120, x1, y1); g.stroke(); for (let q = 0; q < 7; q++) { g.fillStyle = pick(['#e8d898', '#d8c480', '#f4e6b8']); g.beginPath(); g.ellipse(x1 + (q % 2 ? 6 : -6), y1 + q * 9 + 4, 3, 7, q % 2 ? .6 : -.6, 0, TAU); g.fill(); } } });
      grappoloC('cappero', 50, (x, y, k, t) => { if (k % 6 === 0) { g.fillStyle = '#fbf2f8'; for (let q = 0; q < 4; q++) { const a = q / 4 * TAU; g.beginPath(); g.ellipse(x + Math.cos(a) * 8, y + Math.sin(a) * 8, 9, 7, a, 0, TAU); g.fill(); } g.strokeStyle = '#a050b0'; g.lineWidth = 1; for (let q = 0; q < 12; q++) { const a = r() * TAU; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 15, y + Math.sin(a) * 15); g.stroke(); } } else { g.fillStyle = `hsl(110,35%,${24 + t * 26}%)`; g.beginPath(); g.arc(x, y, 9 + r() * 4, 0, TAU); g.fill(); } });
      // i cuscini di fiori bianchi del bordo dell'acqua (il riferimento del ruscello)
      grappoloC('fioriBianchi', 150, (x, y, k, t) => { if (k % 3 === 0) foglia(x, y, 22, 8, r() * TAU, `hsl(105,40%,${22 + t * 26}%)`); else fiore5(x, y, 6 + r() * 3, `hsl(50,30%,${90 + t * 8}%)`, '#e8d070'); });
      const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
      // l'atlante fotografico: quando arriva copre le celle FOTO e la corteccia
      if (!FOTO_ON) CARICATO = Promise.resolve(true); else CARICATO = new Promise(ok => { const img = new Image(); img.onload = () => { [...FOTO, 'corteccia'].forEach(k => { const i = CI[k], x = (i % NX) * CS, y = Math.floor(i / NX) * CS; g.clearRect(x, y, CS, CS); g.drawImage(img, x, y, CS, CS, x, y, CS, CS); }); t.needsUpdate = true; ok(true); };
        img.onerror = () => ok(false); img.src = BASE + 'atlante_foto.png'; });
      return (ATL = t);
    }

    // ---------------- LE FACCE ----------------
    function Acc() {
      const P = [], N = [], C = [], X = [], UV = [], O = [];
      const v = (p, n, c, f, uv, o) => { P.push(p[0], p[1], p[2]); N.push(n[0], n[1], n[2]); C.push(c[0], c[1], c[2]); X.push(f); UV.push(uv[0], uv[1]); O.push(o === undefined ? 1 : o); };
      return { v, n: () => P.length / 3,
        build() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
          g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setAttribute('flex', new THREE.Float32BufferAttribute(X, 1)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setAttribute('occ', new THREE.Float32BufferAttribute(O, 1));
          g.computeBoundingSphere(); g.computeBoundingBox(); return g; } };
    }
    const tinta = (sp, k) => hx(PAL[SP[sp] ? SP[sp].pal : sp][k === undefined ? 1 : k]);
    const ICO = [0, 1].map(d => new THREE.IcosahedronGeometry(1, d).toNonIndexed().attributes.position.array.slice());
    // il nucleo: massa deformata, dipinta di pennellate (cella 'pieno'), tinta della specie; occ basso (sta dentro)
    function nucleo(A, c, r, col, H, seed, opz) {
      opz = opz || {}; const p = ICO[opz.det === undefined ? 1 : opz.det], cache = new Map(), U = cellUV(opz.cella || 'pieno'), fl = opz.flex === undefined ? 1 : opz.flex, sq = opz.schiaccia || 0, nC = opz.nCentro;
      for (let i = 0; i < p.length; i += 3) { const x = p[i], y = p[i + 1], z = p[i + 2], kk = Math.round(x * 97) * 7919 + Math.round(y * 97) * 131 + Math.round(z * 97);
        let d = cache.get(kk); if (d === undefined) { d = 1 + (hash2(kk & 0xffff, kk >> 16, seed) - .5) * .32; cache.set(kk, d); }
        const yy = sq && y < 0 ? y * (1 - sq) : y, P = [c[0] + x * r[0] * d, c[1] + yy * r[1] * d, c[2] + z * r[2] * d];
        const n = nC ? nrm([P[0] - nC[0] + x * .6, P[1] - nC[1] + y * .6, P[2] - nC[2] + z * .6]) : nrm([x, y, z]);
        A.v(P, n, col, Math.min(1, Math.max(0, P[1] / H)) ** 1.3 * fl, [U[0] + (U[2] - U[0]) * (.5 + Math.atan2(z, x) / TAU), U[1] + (U[3] - U[1]) * (.5 + y * .5)], (opz.occ || .35) + Math.max(0, y) * .3); }
    }
    // una carta: centro p, lato s, normale di posa n (la faccia), normale di luce nl, cella, colore, flex, rotazione, occ
    function carta(A, p, s, n, nl, cell, col, f, rot, o, opz) {
      opz = opz || {}; const U = cellUV(cell), up = Math.abs(n[1]) > .95 ? [1, 0, 0] : [0, 1, 0]; const t = nrm(crs(up, n)), b = crs(n, t), cs = Math.cos(rot), sn = Math.sin(rot);
      const tt = [t[0] * cs + b[0] * sn, t[1] * cs + b[1] * sn, t[2] * cs + b[2] * sn], bb = [b[0] * cs - t[0] * sn, b[1] * cs - t[1] * sn, b[2] * cs - t[2] * sn], sx = s * (opz.sx || 1), sy = s * (opz.sy || 1), oy = opz.base ? sy : 0;
      const Q = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => [p[0] + tt[0] * u * sx + bb[0] * (v * sy + oy), p[1] + tt[1] * u * sx + bb[1] * (v * sy + oy), p[2] + tt[2] * u * sx + bb[2] * (v * sy + oy)]);
      const UVq = [[U[0], U[1]], [U[2], U[1]], [U[2], U[3]], [U[0], U[3]]], fl = opz.fl || [f, f, f, f], oo = opz.oo || [o, o, o, o], nn = opz.nn || [nl, nl, nl, nl];
      [0, 1, 2, 0, 2, 3, 0, 2, 1, 0, 3, 2].forEach(k => A.v(Q[k], nn[k], col, fl[k], UVq[k], oo[k]));
    }
    // LA CHIOMA A LOBI: c centro, r raggi dell'involucro; nL lobi sull'involucro (più uno in mezzo); ogni lobo nucleo + corona di ciocche
    // opz: lobi, ciocche (per lobo), s (lato della ciocca), fondo (schiaccia sotto), fiori: [cella, quota] (una ciocca su quota è a colori)
    function chioma(A, c, r, sp, H, seed, opz) {
      opz = opz || {}; const rr = rngK(seed * 7 + 3), S = SP[sp] || {}, cell = opz.cella || CELLA[sp] || 'ramoFoglioline', col = tinta(sp), nL = opz.lobi || 5, nC = opz.ciocche || 10, fl = opz.flex === undefined ? 1 : opz.flex, fondo = opz.fondo || 0;
      const lobi = []; if (!opz.senzaCentro) lobi.push([c[0], c[1] + r[1] * .15, c[2], .62]);
      for (let k = 0; k < nL; k++) { const a = k / nL * TAU + rr() * .8, yy = (rr() - .35) * .9 * (1 - fondo * .6); const rad = Math.sqrt(Math.max(0, 1 - yy * yy));
        lobi.push([c[0] + Math.cos(a) * rad * r[0] * .62, c[1] + yy * r[1] * .55, c[2] + Math.sin(a) * rad * r[2] * .62, .46 + rr() * .14]); }
      lobi.forEach(([lx, ly, lz, kl], li) => { const R = [r[0] * kl, r[1] * kl * (opz.lobiAlti || 1), r[2] * kl], lc = [lx, ly, lz];
        nucleo(A, lc, [R[0] * .74, R[1] * .7, R[2] * .74], mul(col, .82), H, seed * 13 + li, { det: opz.detN === undefined ? 1 : opz.detN, schiaccia: fondo, flex: fl, nCentro: [c[0], c[1] - r[1] * .3, c[2]], occ: .25 });
        for (let k = 0; k < nC; k++) { const u = (k + .5) / nC, yy = 1 - 2 * Math.pow(u, .8), rad = Math.sqrt(Math.max(0, 1 - yy * yy)), th = k * 2.39996 + rr() * .6;
          let dx = Math.cos(th) * rad, dy = yy, dz = Math.sin(th) * rad; if (fondo && dy < 0) dy *= (1 - fondo);
          const d = .72 + rr() * .3, P = [lc[0] + dx * R[0] * d, lc[1] + dy * R[1] * d, lc[2] + dz * R[2] * d];
          const dL = nrm([dx, dy, dz]), dC = nrm([P[0] - c[0], (P[1] - c[1]) * (r[0] / r[1]) * .7, P[2] - c[2]]), nl = nrm([dL[0] * .6 + dC[0] * .4, dL[1] * .6 + dC[1] * .4 + .12, dL[2] * .6 + dC[2] * .4]);
          const nPosa = nrm([dL[0] + (rr() - .5) * .8, dL[1] * .5 + .5 + (rr() - .5) * .5, dL[2] + (rr() - .5) * .8]);
          const occ = clamp(.42 + dL[1] * .25 + (Math.hypot(P[0] - c[0], P[2] - c[2]) / Math.max(r[0], .1)) * .3 + (P[1] - c[1]) / r[1] * .15, .2, 1);
          const fiore = opz.fiori && rr() < opz.fiori[1], cc = fiore ? opz.fiori[0] : cell, cColor = fiore ? [1, 1, 1] : colCella(cc, sp, col);
          carta(A, P, (opz.s || 1) * (.8 + rr() * .4) * Math.max(.55, kl * 1.6) * (R[0] > 1.2 ? 1 : .8), nPosa, nl, cc, cColor, Math.min(1, Math.max(0, P[1] / H)) ** 1.3 * fl, rr() * TAU, occ, { sx: opz.sx, sy: opz.sy }); } });
    }
    // il tronco: tubo con la corteccia (grigia, tinta dal colore), più scuro alla base
    function tubo(A, pts, rr, col, H, lati, opz) {
      lati = lati || 5; opz = opz || {}; const c0 = hx(col), U = cellUV('corteccia'), an = opz.anelli;
      const ring = k => { const p = pts[k], q = pts[Math.min(pts.length - 1, k + 1)], o = pts[Math.max(0, k - 1)]; const d = nrm([q[0] - o[0], q[1] - o[1], q[2] - o[2]]); const a = Math.abs(d[0]) > .9 ? [0, 0, 1] : [1, 0, 0];
        const u = nrm(crs(d, a)), w = crs(d, u), R = []; for (let s = 0; s <= lati; s++) { const an2 = s / lati * TAU, cs = Math.cos(an2), sn = Math.sin(an2), nn = [u[0] * cs + w[0] * sn, u[1] * cs + w[1] * sn, u[2] * cs + w[2] * sn]; R.push([p[0] + nn[0] * rr[k], p[1] + nn[1] * rr[k], p[2] + nn[2] * rr[k], nn]); } return R; };
      const RS = pts.map((_, k) => ring(k)); let vL = 0;
      for (let k = 0; k < pts.length - 1; k++) { const seg = Math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1], pts[k + 1][2] - pts[k][2]), v1 = Math.min(.92, seg / 2.6);
        for (let s = 0; s < lati; s++) { const a = RS[k][s], b = RS[k][s + 1], c = RS[k + 1][s + 1], d = RS[k + 1][s], ka = an ? (k % 2 ? .82 : 1.04) : 1;
          const oA = clamp(.65 + pts[k][1] / 4, .65, 1), oB = clamp(.65 + pts[k + 1][1] / 4, .65, 1), cA = mul(c0, ka * 1.25), cB = mul(c0, ka * 1.25), fA = (pts[k][1] / H) ** 2 * .3, fB = (pts[k + 1][1] / H) ** 2 * .3;
          const u0 = U[0] + (U[2] - U[0]) * s / lati, u1 = U[0] + (U[2] - U[0]) * (s + 1) / lati, va = U[1] + (U[3] - U[1]) * .04, vb = U[1] + (U[3] - U[1]) * (.04 + v1);
          A.v(a.slice(0, 3), a[3], cA, fA, [u0, va], oA); A.v(b.slice(0, 3), b[3], cA, fA, [u1, va], oA); A.v(c.slice(0, 3), c[3], cB, fB, [u1, vb], oB);
          A.v(a.slice(0, 3), a[3], cA, fA, [u0, va], oA); A.v(c.slice(0, 3), c[3], cB, fB, [u1, vb], oB); A.v(d.slice(0, 3), d[3], cB, fB, [u0, vb], oB); } }
    }
    // una lama dipinta (fronda, foglia d'agave, canna): striscia che si piega, la cella stesa per lungo
    function lama(A, base, dir, L, w, cad, cell, H, seg, opz) {
      seg = seg || 4; opz = opz || {}; const U = cellUV(cell), side = nrm([-dir[2], 0, dir[0]]); if (!isFinite(side[0])) side[0] = 1;
      const col = opz.col || [1, 1, 1], P = []; for (let k = 0; k <= seg; k++) { const t = k / seg; P.push([base[0] + dir[0] * L * t, base[1] + dir[1] * L * t - cad * L * t * t, base[2] + dir[2] * L * t]); }
      for (let k = 0; k < seg; k++) { const a = P[k], b = P[k + 1], ta = k / seg, tb = (k + 1) / seg, fa = Math.min(1, a[1] / H) * (opz.flex || 1), fb = Math.min(1, b[1] / H) * (opz.flex || 1);
        const al = [a[0] - side[0] * w, a[1], a[2] - side[2] * w], ar = [a[0] + side[0] * w, a[1], a[2] + side[2] * w], bl = [b[0] - side[0] * w, b[1], b[2] - side[2] * w], br = [b[0] + side[0] * w, b[1], b[2] + side[2] * w];
        const n = nrm([dir[0] * .4, 1, dir[2] * .4]), oa = .45 + ta * .55, ob = .45 + tb * .55, va = U[1] + (U[3] - U[1]) * ta, vb = U[1] + (U[3] - U[1]) * tb;
        [[al, U[0], va, oa, fa], [ar, U[2], va, oa, fa], [br, U[2], vb, ob, fb], [al, U[0], va, oa, fa], [br, U[2], vb, ob, fb], [bl, U[0], vb, ob, fb], [al, U[0], va, oa, fa], [br, U[2], vb, ob, fb], [ar, U[2], va, oa, fa], [al, U[0], va, oa, fa], [bl, U[0], vb, ob, fb], [br, U[2], vb, ob, fb]]
          .forEach(([p, u, v, o, f]) => A.v(p, n, col, f, [u, v], o)); }
    }
    // le erbe: carte in piedi incrociate, normale in alto (si illuminano come il prato), occ 0 alla base, 1 in punta
    // le erbe: carte in piedi che si aprono un poco verso fuori (dall'alto non spariscono), la normale verso l'alto (si illuminano come
    // il prato), la base nell'ombra del suolo
    function ciuffo(A, H, w, cell, n, rr, col, apre) {
      for (let k = 0; k < n; k++) { const a = k / n * TAU + rr() * .8, tilt = (apre === undefined ? .3 : apre) * (.6 + rr() * .6), h = H * (.75 + rr() * .5), ww = w * (.8 + rr() * .4);
        const nd = nrm([Math.cos(a), -Math.sin(tilt) * .0, Math.sin(a)]), off = [-Math.sin(a) * 0, 0, 0];
        const base = [Math.cos(a + 1.57) * ww * .08, 0, Math.sin(a + 1.57) * ww * .08], up = [Math.cos(a + 1.57) * Math.sin(tilt), Math.cos(tilt), Math.sin(a + 1.57) * Math.sin(tilt)];
        const side = nrm(crs(up, nd)), Q = [[-1, 0], [1, 0], [1, 2], [-1, 2]].map(([u, v]) => [base[0] + side[0] * u * ww * .5 + up[0] * v * h * .5, base[1] + side[1] * u * ww * .5 + up[1] * v * h * .5, base[2] + side[2] * u * ww * .5 + up[2] * v * h * .5]);
        const U = cellUV(cell), UVq = [[U[0], U[1]], [U[2], U[1]], [U[2], U[3]], [U[0], U[3]]], fl = [0, 0, 1, 1], oo = [.55, .55, 1, 1], nU = [0, 1, 0];
        const cc = [col[0] * (.92 + rr() * .16), col[1] * (.92 + rr() * .16), col[2] * (.92 + rr() * .16)];
        [0, 1, 2, 0, 2, 3, 0, 2, 1, 0, 3, 2].forEach(q => A.v(Q[q], nU, cc, fl[q], UVq[q], oo[q])); }
    }
    const punto = (A, p, s, col, f) => { const U = cellUV('bianco'), c = hx(col), u = [(U[0] + U[2]) / 2, (U[1] + U[3]) / 2], O = [[s, 0, 0], [-s, 0, 0], [0, s, 0], [0, -s, 0], [0, 0, s], [0, 0, -s]], F8 = [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]];
      F8.forEach(tr => tr.forEach(k => A.v([p[0] + O[k][0], p[1] + O[k][1], p[2] + O[k][2]], nrm(O[k]), c, f, u, 1))); };
    // ---------------- L'ALBERO CHE CRESCE: scheletro di rami, foglie in fondo ai rami ----------------
    // Un albero si legge dal suo scheletro: il fusto, le branche, i rami, e solo in fondo ai rami le masse di foglie, col cielo che passa
    // fra l'una e l'altra. Qui il fusto sale con la sua inclinazione e la sua curva, si apre in branche (attorno al fusto con l'angolo
    // d'oro), ogni branca si divide in rami più corti e più sottili; la lunghezza di ogni ramo si accorcia se la punta uscirebbe dalla
    // forma della specie (l'involucro: l'ombrello del pino, la cupola del leccio, la fiamma del cipresso). In fondo a ogni ramo
    // dell'ultimo livello sta un CIUFFO: un piccolo nucleo scuro e qualche carta col rametto dipinto, orientate come il ciuffo vero
    // (piatte e rivolte al cielo nel pino, tutt'attorno nel leccio, pendenti nell'eucalipto). La luce di ogni carta viene dal centro del
    // suo ciuffo mescolato col centro della chioma: ogni ciuffo ha il suo lato in luce e la chioma resta un volume.
    // P (i parametri della specie, ALBERI qui sotto): t = fusto { h (frazione di H dove si apre), inc (inclinazione), curva, r (raggio alla
    // base, m), multi (fusti dal ceppo) }; b = branche { n, da/a (dove nascono lungo il fusto, frazioni), ang (dal fusto, gradi), len (m),
    // liv (livelli dei rami), figli, angF, lenF, su (quanto le punte tornano verso il cielo; negativo: ricadono) }; inv(x, y, z, H) → ≤ 1
    // se il punto sta nella forma; c = ciuffo { s (lato, m), carte, piatto (0 tondo … 1 piatto), pend (ricade), cella, lungo (lungo il ramo) }
    function albero(A, H, r, P, v, sp) {
      const t = P.t, b = P.b, cf = P.c, legno = PAL[SP[sp].legno] || '#5a4a3a', col = tinta(sp), C0 = P.centro ? P.centro(H) : [0, H * .7, 0];
      const dentro = (p) => P.inv(p[0], p[1], p[2], H) <= 1;
      const ruota = (d, ang, az) => { // gira d di ang (rad) attorno a un asse perpendicolare scelto da az
        const u = nrm(Math.abs(d[1]) < .95 ? crs(d, [0, 1, 0]) : crs(d, [1, 0, 0])), w = crs(d, u), ax = [u[0] * Math.cos(az) + w[0] * Math.sin(az), u[1] * Math.cos(az) + w[1] * Math.sin(az), u[2] * Math.cos(az) + w[2] * Math.sin(az)];
        const c = Math.cos(ang), s = Math.sin(ang), dt = ax[0] * d[0] + ax[1] * d[1] + ax[2] * d[2], cr = crs(ax, d);
        return nrm([d[0] * c + cr[0] * s + ax[0] * dt * (1 - c), d[1] * c + cr[1] * s + ax[1] * dt * (1 - c), d[2] * c + cr[2] * s + ax[2] * dt * (1 - c)]); };
      const ciuffi = [], fogliati = [];   // fogliati: i tratti di ramo degli ultimi due livelli, dove stanno le foglie
      // un ramo: da p0 verso d, lungo L, raggio rr; si piega verso il cielo (su) a metà; ritorna la punta e la direzione finale
      const ramo = (p0, d, L, rr, liv) => {
        let len = L; for (let k = 0; k < 5; k++) { const e = [p0[0] + d[0] * len, p0[1] + d[1] * len, p0[2] + d[2] * len]; if (dentro(e) || len < L * .3) break; len *= .8; }
        const su = (b.su || 0) * (liv + 1) / (b.liv + 1), dd = nrm([d[0], d[1] + su * .6, d[2]]), nz = (r() - .5) * .25 * len;
        const m = [p0[0] + d[0] * len * .5 + nz, p0[1] + d[1] * len * .5 + Math.abs(nz) * .3, p0[2] + d[2] * len * .5 - nz], e = [m[0] + dd[0] * len * .5, m[1] + dd[1] * len * .5, m[2] + dd[2] * len * .5];
        tubo(A, [p0, m, e], [rr, rr * .78, rr * .55], legno, H, liv <= 1 ? 7 : liv === 2 ? 5 : 4); if (liv >= b.liv - 1) fogliati.push([p0, m, e, liv]); return { e, d: nrm([e[0] - m[0], e[1] - m[1], e[2] - m[2]]), len };
      };
      const cresci = (p0, d, L, rr, liv) => {
        const R = ramo(p0, d, L, rr, liv);
        if (liv >= b.liv) { ciuffi.push([R.e, R.d, liv]); if (cf.lungo && R.len > cf.s * 1.2) { const tm = .55; ciuffi.push([[p0[0] + (R.e[0] - p0[0]) * tm, p0[1] + (R.e[1] - p0[1]) * tm, p0[2] + (R.e[2] - p0[2]) * tm], R.d, liv, .8]); } return; }
        const nf = b.figli[0] + Math.floor(r() * (b.figli[1] - b.figli[0] + 1)); let az = r() * TAU;
        for (let k = 0; k < nf; k++) { az += 2.39996; const tt = k === nf - 1 ? 1 : .5 + r() * .4, q = [p0[0] + (R.e[0] - p0[0]) * tt, p0[1] + (R.e[1] - p0[1]) * tt, p0[2] + (R.e[2] - p0[2]) * tt];
          const ang = (b.angF * (k === nf - 1 ? .5 : 1) * (.8 + r() * .4)) * Math.PI / 180; cresci(q, ruota(R.d, ang, az), L * b.lenF * (.85 + r() * .3), rr * .62, liv + 1); }
      };
      // i fusti (uno, o più dal ceppo come nell'ulivo e nel fico)
      const nF = t.multi || 1;
      for (let f = 0; f < nF; f++) {
        const a0 = r() * TAU + f * TAU / nF, inc = (t.inc || 0) * (.6 + r() * .8) + (nF > 1 ? .25 : 0), dx = Math.cos(a0) * inc, dz = Math.sin(a0) * inc, h = H * t.h * (nF > 1 ? .8 + r() * .3 : 1), cv = (t.curva || 0) * h;
        const NS = 5, pts = [], rs = []; for (let k = 0; k <= NS; k++) { const q = k / NS; pts.push([dx * h * q + Math.sin(q * 3 + v + f) * cv * q, h * q, dz * h * q + Math.cos(q * 2.6 + v) * cv * q * .7]); rs.push(t.r * (1 - q * .45) * (nF > 1 ? .7 : 1)); }
        if (t.ceppo) nucleo(A, [0, .25, 0], [t.ceppo, .4, t.ceppo], hx(legno), H, v + 41, { flex: 0, occ: .55, cella: 'corteccia' });
        pts.splice(1, 0, [pts[1][0] * .15, Math.min(.5, pts[1][1] * .3), pts[1][2] * .15]); rs.splice(1, 0, rs[0] * .92); rs[0] *= 1.45; tubo(A, pts, rs, legno, H, 10); pts.splice(1, 1); rs.splice(1, 1);
        const top = pts[NS], dTop = nrm([top[0] - pts[NS - 1][0], top[1] - pts[NS - 1][1], top[2] - pts[NS - 1][2]]);
        const nB = Math.max(1, Math.round((b.n[0] + r() * (b.n[1] - b.n[0])) / nF)); let az = r() * TAU;
        for (let k = 0; k < nB; k++) { az += 2.39996 + (r() - .5) * .3; const tt = b.da + (b.a - b.da) * (nB > 1 ? k / (nB - 1) : 1), i0 = Math.min(NS - 1, Math.floor(tt * NS)), fr = tt * NS - i0;
          const q = [pts[i0][0] + (pts[i0 + 1][0] - pts[i0][0]) * fr, pts[i0][1] + (pts[i0 + 1][1] - pts[i0][1]) * fr, pts[i0][2] + (pts[i0 + 1][2] - pts[i0][2]) * fr];
          const ang = (b.ang[0] + r() * (b.ang[1] - b.ang[0])) * Math.PI / 180, lenK = b.lenSu ? 1 - tt * b.lenSu : 1;
          cresci(q, ruota(dTop, ang, az), b.len * (.85 + r() * .3) * lenK, rs[i0] * .62, 1); }
      }
      // LE FOGLIE IN VOLUME: lungo i tratti di ramo degli ultimi due livelli, a passi, una nuvola di carte attorno al ramo (non solo in
      // punta): la chioma è piena dove ci sono i rami e si apre dove non ci sono. Niente nuclei: il volume lo fanno le carte stesse.
      // La luce di ogni carta: la normale presa per due terzi dal centro della chioma (il volume grande) e per un terzo dalla carta (il
      // dettaglio); l'occlusione: più scura quanto più sta dentro la chioma e in basso, più scura vicino al ramo che la porta.
      const ext = P.ext ? P.ext(H) : [H * .35, H * .25, H * .35], UPV = [0, 1, 0], cardsMax = P.carteMax || 2400; let nCard = 0;
      const passo = cf.s * .3, kk = cf.carte / 8;
      fogliati.sort(() => r() - .5).forEach(([p0, m, e, liv]) => {
        const segs = [[p0, m], [m, e]];
        segs.forEach(([a0, a1], si) => { const L = Math.hypot(a1[0] - a0[0], a1[1] - a0[1], a1[2] - a0[2]); if (liv < b.liv && si === 0) return; const nP = Math.max(1, Math.round(L / passo));
          for (let q = 0; q < nP; q++) { const t = (q + .5 + (r() - .5) * .4) / nP, c = [a0[0] + (a1[0] - a0[0]) * t, a0[1] + (a1[1] - a0[1]) * t, a0[2] + (a1[2] - a0[2]) * t];
            const nc = Math.round((9 + r() * 6) * kk); for (let k = 0; k < nc && nCard < cardsMax; k++, nCard++) {
              const pend = cf.pend || 0, piatto = cf.piatto || 0, rad = cf.s * (.25 + r() * .45);
              let dx = r() * 2 - 1, dy = (r() * 2 - 1) * (1 - piatto * .7) + (piatto ? .25 : 0) - pend * .45, dz = r() * 2 - 1; const dl = Math.hypot(dx, dy, dz) || 1; dx /= dl; dy /= dl; dz /= dl;
              const P2 = [c[0] + dx * rad, c[1] + dy * rad, c[2] + dz * rad];
              const dc = nrm([(P2[0] - C0[0]) / ext[0], (P2[1] - C0[1]) / ext[1], (P2[2] - C0[2]) / ext[2]]), rel = Math.min(1.3, Math.hypot((P2[0] - C0[0]) / ext[0], (P2[1] - C0[1]) / ext[1], (P2[2] - C0[2]) / ext[2]));
              const nPosa = nrm([dx * (1 - piatto) + (r() - .5) * .8, dy * (1 - piatto) + piatto + .3 + (r() - .5) * .6 - pend * .8, dz * (1 - piatto) + (r() - .5) * .8]);
              const nl = nrm([dc[0] * .62 + nPosa[0] * .3, dc[1] * .62 + nPosa[1] * .3 + .12, dc[2] * .62 + nPosa[2] * .3]);
              const occ = clamp(.18 + .62 * sstep(.15, 1, rel) + .18 * Math.max(0, dc[1]) + .1 * (rad / cf.s), .18, 1);
              const fiore = cf.fiori && r() < cf.fiori[1], cell = fiore ? cf.fiori[0] : cf.cella;
              carta(A, P2, cf.s * (.3 + r() * .2), nPosa, nl, cell, fiore ? [1, 1, 1] : colCella(cell, sp, col), Math.min(1, P2[1] / H) ** 1.2, r() * TAU, occ, { sy: pend ? 1.4 : 1 }); } } });
      });
      ciuffi.length = 0; void UPV;
    }
    // le forme delle specie (involucro: ≤ 1 dentro). Misure in metri su H, l'altezza di riferimento della specie.
    const ell = (cx, cy, cz, rx, ry, rz) => (x, y, z) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2;
    const ALBERI = {
      // il pino domestico: fusto nudo fino a due terzi, si apre in 4-5 branche a coppa, i rami finiscono in piatti d'aghi all'altezza
      // dell'ombrello; l'ombrello è largo quasi quanto l'albero è alto, piatto in cima e sotto
      pino: { t: { h: .64, inc: .07, curva: .07, r: .34 }, b: { n: [4, 6], da: .9, a: 1, ang: [28, 50], len: 4.2, liv: 3, figli: [2, 3], angF: 34, lenF: .62, su: .5 },
        inv: (x, y, z, H) => { const R = Math.hypot(x, z) / (H * .46), yy = (y - H * .86) / (H * .14); return Math.max(R * R + yy * yy * (yy > 0 ? 2.2 : .5), y > H ? 9 : 0); }, centro: H => [0, H * .84, 0], ext: H => [H * .44, H * .12, H * .44], carteMax: 2600,
        c: { s: 1.7, carte: 9, piatto: .78, cella: 'ramoAghi' } },
      // il pino marittimo e d'Aleppo: storto e inclinato, rami radi lungo la metà alta, quasi orizzontali, ciuffi a nuvola sulle punte
      pinoM: { t: { h: .8, inc: .2, curva: .25, r: .24 }, b: { n: [5, 7], da: .45, a: .98, ang: [55, 85], len: 2.6, liv: 2, figli: [2, 3], angF: 30, lenF: .65, su: .55, lenSu: .45 },
        inv: (x, y, z, H) => { const R = Math.hypot(x, z) / (H * .32 * (1.1 - (y / H) * .5)); return R * R + Math.max(0, (y - H) / (H * .1)) ** 2; }, centro: H => [0, H * .72, 0],
        c: { s: 1.35, carte: 8, piatto: .5, cella: 'ramoAghi2' } },
      // il leccio: fusto corto, branche robuste, chioma tonda fitta e scura, poco cielo
      leccio: { t: { h: .34, inc: .05, curva: .1, r: .26 }, b: { n: [4, 5], da: .7, a: 1, ang: [30, 55], len: 2.6, liv: 3, figli: [2, 3], angF: 38, lenF: .64, su: .25 },
        inv: (x, y, z, H) => ell(0, H * .64, 0, 3.5, H * .36, 3.5)(x, y, z), centro: H => [0, H * .62, 0], ext: H => [3.5, H * .36, 3.5],  c: { s: 1.25, carte: 8, piatto: .2, cella: 'ramoFoglioline', lungo: true } },
      // il carrubo: basso, largo, una cupola lucida fino quasi a terra
      carrubo: { t: { h: .3, inc: .06, curva: .1, r: .3, multi: 1 }, b: { n: [4, 6], da: .6, a: 1, ang: [45, 70], len: 3, liv: 3, figli: [2, 3], angF: 36, lenF: .62, su: .2 },
        inv: (x, y, z, H) => ell(0, H * .58, 0, 4.2, H * .42, 4.2)(x, y, z), centro: H => [0, H * .56, 0], ext: H => [4.2, H * .42, 4.2],  c: { s: 1.45, carte: 9, piatto: .3, cella: 'ramoOvali', lungo: true } },
      // l'ulivo: due o tre fusti ritorti dal ceppo gonfio, chioma rada e argento, larga
      ulivo: { t: { h: .48, inc: .18, curva: .35, r: .2, multi: 2, ceppo: .5 }, b: { n: [5, 7], da: .7, a: 1, ang: [35, 70], len: 1.5, liv: 3, figli: [2, 3], angF: 40, lenF: .66, su: .2 },
        inv: (x, y, z, H) => ell(0, H * .7, 0, 2.6, H * .32, 2.6)(x, y, z), centro: H => [0, H * .7, 0], ext: H => [2.6, H * .32, 2.6],  c: { s: .95, carte: 7, piatto: .35, cella: 'ramoLanceolate' } },
      // il fico: bassi fusti grigi che si allargano, foglie grandi, chioma a ombrello basso
      fico: { t: { h: .35, inc: .2, curva: .2, r: .14, multi: 3 }, b: { n: [6, 8], da: .7, a: 1, ang: [40, 70], len: 1.9, liv: 2, figli: [2, 3], angF: 38, lenF: .7, su: .35 },
        inv: (x, y, z, H) => ell(0, H * .66, 0, 3.1, H * .36, 3.1)(x, y, z), centro: H => [0, H * .66, 0], ext: H => [3.1, H * .36, 3.1],  c: { s: 1.25, carte: 7, piatto: .45, cella: 'ramoLarghe' } },
      // gli agrumi: piccoli, tondi, densi, coi frutti
      agrume: { t: { h: .3, inc: .03, curva: .05, r: .09 }, b: { n: [4, 5], da: .8, a: 1, ang: [30, 50], len: 1.1, liv: 2, figli: [2, 3], angF: 40, lenF: .7, su: .3 },
        inv: (x, y, z, H) => ell(0, H * .62, 0, 1.8, H * .42, 1.8)(x, y, z), centro: H => [0, H * .6, 0], ext: H => [1.8, H * .42, 1.8],  c: { s: .95, carte: 8, piatto: .15, cella: 'ramoOvali', fiori: ['agrumeFrutti', .3], lungo: true } },
      // il mandorlo: a vaso, rami sottili che salgono, chioma leggera (in fiore la variante 3)
      mandorlo: { t: { h: .34, inc: .05, curva: .1, r: .12 }, b: { n: [4, 5], da: .8, a: 1, ang: [25, 42], len: 1.8, liv: 3, figli: [2, 2], angF: 32, lenF: .66, su: .45 },
        inv: (x, y, z, H) => ell(0, H * .72, 0, 2.5, H * .33, 2.5)(x, y, z), centro: H => [0, H * .72, 0], c: { s: .85, carte: 6, piatto: .3, cella: 'ramoLanceolate' } },
      // la tamerice: più fusti, rami che ricadono, ciuffi piumosi
      tamerice: { t: { h: .45, inc: .2, curva: .3, r: .1, multi: 3 }, b: { n: [6, 8], da: .7, a: 1, ang: [35, 60], len: 1.6, liv: 2, figli: [2, 3], angF: 35, lenF: .7, su: -.2 },
        inv: (x, y, z, H) => ell(0, H * .62, 0, 2.6, H * .42, 2.6)(x, y, z), centro: H => [0, H * .6, 0], c: { s: 1, carte: 6, piatto: 0, pend: .55, cella: 'tamericeRamo' } },
      // l'eucalipto: fusto alto e chiaro, rami che salgono, ciuffi lunghi che pendono
      eucalipto: { t: { h: .62, inc: .06, curva: .12, r: .3 }, b: { n: [5, 7], da: .45, a: 1, ang: [22, 42], len: 3.2, liv: 3, figli: [2, 3], angF: 32, lenF: .62, su: .35 },
        inv: (x, y, z, H) => ell(0, H * .72, 0, 3.6, H * .32, 3.6)(x, y, z), centro: H => [0, H * .72, 0], ext: H => [3.6, H * .32, 3.6],  c: { s: 1.25, carte: 6, piatto: 0, pend: .65, cella: 'ramoLunghe' } },
      // il cipresso: la fiamma, rami corti che salgono stretti al fusto
      cipresso: { t: { h: .96, inc: .01, curva: .02, r: .2 }, b: { n: [22, 26], da: .06, a: .95, ang: [12, 26], len: 1.5, liv: 1, figli: [2, 2], angF: 18, lenF: .6, su: .6, lenSu: .7 },
        inv: (x, y, z, H) => { const w = .95 * Math.sin(Math.PI * Math.min(1, y / H * .98 + .03)) ** .7 + .05; return (Math.hypot(x, z) / w) ** 2 + Math.max(0, (y - H) / 1) ** 2; }, centro: H => [0, H * .5, 0],
        c: { s: .85, carte: 6, piatto: 0, cella: 'ramoSquame' } },
      // gli arbusti: molti fusti dal piede, chioma bassa
      lentisco: { t: { h: .2, inc: .3, curva: .2, r: .05, multi: 4 }, b: { n: [6, 8], da: .5, a: 1, ang: [25, 55], len: .9, liv: 1, figli: [2, 3], angF: 35, lenF: .7, su: .3 },
        inv: (x, y, z, H) => ell(0, H * .5, 0, 1.5, H * .55, 1.5)(x, y, z), centro: H => [0, H * .45, 0], c: { s: .85, carte: 6, piatto: .2, cella: 'ramoFoglioline' } },
      mirto: { t: { h: .25, inc: .25, curva: .2, r: .04, multi: 4 }, b: { n: [6, 8], da: .5, a: 1, ang: [20, 45], len: .7, liv: 1, figli: [2, 3], angF: 30, lenF: .7, su: .4 },
        inv: (x, y, z, H) => ell(0, H * .5, 0, 1.05, H * .55, 1.05)(x, y, z), centro: H => [0, H * .5, 0], c: { s: .7, carte: 6, piatto: .15, cella: 'ramoFoglioline' } },
      oleandro: { t: { h: .3, inc: .2, curva: .15, r: .05, multi: 5 }, b: { n: [7, 9], da: .5, a: 1, ang: [12, 30], len: 1.2, liv: 1, figli: [2, 3], angF: 25, lenF: .7, su: .5 },
        inv: (x, y, z, H) => ell(0, H * .55, 0, 1.4, H * .5, 1.4)(x, y, z), centro: H => [0, H * .55, 0], c: { s: .85, carte: 6, piatto: .1, cella: 'ramoLanceolate', fiori: ['oleandroFiori', .4] } },
    };
    // la cella delle ciocche di ogni specie
    const CELLA = { pino: 'lettieraAghi', pinoM: 'ramoAghi2', leccio: 'ramoFoglioline', carrubo: 'ramoOvali', lentisco: 'ramoFoglioline', mirto: 'ramoSquame', ulivo: 'ramoLanceolate', eucalipto: 'ramoLunghe', fico: 'ramoLarghe', agrume: 'agrumeFrutti', mandorlo: 'ramoLanceolate', tamerice: 'ramoLunghe', oleandro: 'ramoLanceolate', cipresso: 'ramoSquame', rosmarino: 'ramoSquame', edera: 'edera', bouganville: 'bouganville', felce: 'felce', cappero: 'cappero', ginestra: 'ramoSquame' };

    // ---------------- LE FORME ----------------
    const FORME = {
      ombrello(A, H, r, S, v) { const lean = (.05 + r() * .08) * H, a = r() * TAU, lx = Math.cos(a) * lean, lz = Math.sin(a) * lean, tT = H * .74;
        const pts = [0, .2, .45, .7, .9, 1].map(t => [lx * t ** 1.7 + Math.sin(t * 6 + v) * .12, tT * t, lz * t ** 1.7 + Math.cos(t * 5 + v) * .08]);
        tubo(A, pts, [.036, .029, .025, .022, .02, .017].map(k => k * H), PAL[S.legno], H);
        const top = pts[5], R = SP.pino.chioma * (H / 12) * (.92 + r() * .16), cy = H * .86, NB = 5 + (v % 2);
        for (let k = 0; k < NB; k++) { const b = k / NB * TAU + r() * .5, e = [top[0] + Math.cos(b) * R * .6, cy, top[2] + Math.sin(b) * R * .6]; tubo(A, [top, [(top[0] + e[0]) / 2, top[1] + (e[1] - top[1]) * .8, (top[2] + e[2]) / 2], e], [.014 * H, .01 * H, .006 * H], PAL[S.legno], H, 4); }
        chioma(A, [top[0], cy + H * .02, top[2]], [R, H * .1, R], 'pino', H, v * 11 + 1, { lobi: 7, ciocche: 11, s: 1.25, fondo: .75, lobiAlti: .9 }); },
      aleppo(A, H, r, S, v) { const a = r() * TAU, lean = (.1 + r() * .12) * H, lx = Math.cos(a) * lean, lz = Math.sin(a) * lean;
        const pts = [0, .25, .5, .75, 1].map(t => [lx * t ** 1.4 + Math.sin(t * 7 + v) * .25, H * .82 * t, lz * t ** 1.4 + Math.cos(t * 6 + v) * .2]);
        tubo(A, pts, [.03, .025, .02, .016, .012].map(k => k * H), PAL[S.legno], H);
        const NC = 3 + (v % 2);
        for (let k = 0; k < NC; k++) { const t = .5 + k / NC * .45, q = pts[Math.min(4, Math.round(t * 4))], b = r() * TAU, d = (.9 + r() * 1.3) * (1.1 - t * .4), e = [q[0] + Math.cos(b) * d, H * (.52 + t * .38), q[2] + Math.sin(b) * d];
          tubo(A, [q, e], [.01 * H, .006 * H], PAL[S.legno], H, 4); chioma(A, e, [1.4 + r() * .5, .7, 1.4 + r() * .5], 'pinoM', H, v * 13 + k, { lobi: 3, ciocche: 8, s: 1, fondo: .6 }); }
        chioma(A, [pts[4][0], H * .9, pts[4][2]], [1.5, .8, 1.5], 'pinoM', H, v * 13 + 9, { lobi: 3, ciocche: 8, s: 1, fondo: .5 }); },
      tondo(A, H, r, S, v) { const F = H * (.3 + r() * .06), bx = (r() - .5) * .3, bz = (r() - .5) * .3, R = S.chioma * .95;
        tubo(A, [[0, 0, 0], [bx * .3, F * .5, bz * .3], [bx, F, bz], [bx, F + 1.2, bz]], [.22, .18, .15, .1], PAL[S.legno], H);
        for (let k = 0; k < 3; k++) { const b = k / 3 * TAU + r(); tubo(A, [[bx, F - .2, bz], [bx + Math.cos(b) * R * .5, F + 1.4, bz + Math.sin(b) * R * .5]], [.1, .05], PAL[S.legno], H, 4); }
        const cy = F + (H - F) * .52, ry = (H - F) * .55;
        chioma(A, [bx, cy, bz], [R, ry, R], S === SP.carrubo ? 'carrubo' : 'leccio', H, v * 17 + 1, { lobi: 6, ciocche: 12, s: 1.05, fondo: .25 }); },
      cupola(A, H, r, S, v) { const R = S.chioma * (.9 + r() * .2), F = H * .3;
        tubo(A, [[0, 0, 0], [.1, F * .6, 0], [.05, F, .05]], [.32, .26, .22], PAL[S.legno], H);
        for (let k = 0; k < 3; k++) { const b = k / 3 * TAU + r(); tubo(A, [[.05, F, .05], [Math.cos(b) * R * .45, F + H * .22, Math.sin(b) * R * .45]], [.16, .08], PAL[S.legno], H, 4); }
        chioma(A, [0, H * .62, 0], [R, H * .36, R], 'carrubo', H, v * 19 + 1, { lobi: 7, ciocche: 12, s: 1.15, fondo: .5 }); },
      eucalipto(A, H, r, S, v) { const pts = [0, .3, .6, .85, 1].map(t => [Math.sin(t * 4 + v) * .35, H * .9 * t, Math.cos(t * 3 + v) * .25]);
        tubo(A, pts, [.32, .22, .16, .1, .06], PAL[S.legno], H);
        for (let k = 0; k < 4; k++) { const t = .5 + k / 4 * .45, b = r() * TAU, d = 1.2 + r() * 1.3, q = pts[Math.min(4, Math.round(t * 4))], e = [q[0] + Math.cos(b) * d, H * t, q[2] + Math.sin(b) * d];
          tubo(A, [q, e], [.08, .04], PAL[S.legno], H, 4); chioma(A, [e[0], e[1] - .4, e[2]], [1.3, 1.9, 1.3], 'eucalipto', H, v * 23 + k, { lobi: 3, ciocche: 7, s: 1, sy: 1.3, detN: 0 }); }
        chioma(A, [pts[4][0], H * .95, pts[4][2]], [1.3, 1.4, 1.3], 'eucalipto', H, v * 23 + 9, { lobi: 3, ciocche: 7, s: 1, detN: 0 }); },
      colonna(A, H, r, S, v) { tubo(A, [[0, 0, 0], [0, .9, 0]], [.2, .16], PAL[S.legno], H);
        const rr = rngK(v * 29 + 3), col = tinta('cipresso'); nucleo(A, [0, H * .48, 0], [.85, H * .48, .85], mul(col, .8), H, v * 29 + 1, { occ: .3 });
        for (let k = 0; k < 30; k++) { const y = H * (.05 + k / 30 * .92), w = Math.sin(Math.PI * Math.min(1, y / H * 1.05 + .04)) * 1.0, a = k * 2.4 + rr(), n = nrm([Math.cos(a), .2, Math.sin(a)]);
          carta(A, [Math.cos(a) * w * .78, y, Math.sin(a) * w * .78], .5 + w * .32, n, nrm([Math.cos(a), .35, Math.sin(a)]), 'ramoSquame', col, (y / H) ** 1.3, rr() * .4 - .2, clamp(.4 + y / H * .5, .3, 1), { sy: 1.5 }); } },
      ulivo(A, H, r, S, v) { const N2 = 2 + (v % 2);
        nucleo(A, [0, .25, 0], [.45, .35, .45], hx('#6a6456'), H, v + 41, { flex: 0, occ: .5, cella: 'corteccia' });
        const tips = []; for (let k = 0; k < N2; k++) { const b = k / N2 * TAU + r(), d = .9 + r() * .7, e = [Math.cos(b) * d, H * (.45 + r() * .12), Math.sin(b) * d];
          tubo(A, [[Math.cos(b) * .12, 0, Math.sin(b) * .12], [Math.cos(b + .8) * .35, H * .2, Math.sin(b + .8) * .3], [e[0] * .7, e[1] * .8, e[2] * .7], e], [.2, .16, .12, .08], PAL[S.legno], H); tips.push(e); }
        chioma(A, [0, H * .72, 0], [S.chioma, H * .26, S.chioma], 'ulivo', H, v * 31, { lobi: 5, ciocche: 9, s: .85, fondo: .45, senzaCentro: v % 2 === 0, detN: 0 }); },
      fico(A, H, r, S, v) { const R = S.chioma;
        for (let k = 0; k < 4; k++) { const b = k / 4 * TAU + r() * .6, e = [Math.cos(b) * R * .55, H * .55, Math.sin(b) * R * .55]; tubo(A, [[0, 0, 0], [Math.cos(b) * .3, H * .22, Math.sin(b) * .3], e], [.16, .12, .07], PAL[S.legno], H, 5); }
        chioma(A, [0, H * .66, 0], [R, H * .33, R], 'fico', H, v * 37 + 1, { lobi: 6, ciocche: 10, s: 1.05, fondo: .55 }); },
      agrume(A, H, r, S, v) { const R = S.chioma; tubo(A, [[0, 0, 0], [0, H * .3, 0]], [.1, .08], PAL[S.legno], H);
        chioma(A, [0, H * .6, 0], [R, H * .42, R], 'agrume', H, v * 43 + 1, { lobi: 4, ciocche: 9, s: .8, cella: 'ramoFoglioline', fiori: ['agrumeFrutti', .35] }); },
      mandorlo(A, H, r, S, v) { for (let k = 0; k < 4; k++) { const b = k / 4 * TAU + r() * .5, e = [Math.cos(b) * 1.4, H * .72, Math.sin(b) * 1.4]; tubo(A, [[0, 0, 0], [0, H * .3, 0], [e[0] * .5, H * .5, e[2] * .5], e], [.13, .1, .06, .03], PAL[S.legno], H, 4); }
        chioma(A, [0, H * .76, 0], [S.chioma, H * .22, S.chioma], 'mandorlo', H, v * 47, { lobi: 5, ciocche: 7, s: .8, detN: 0, fiori: v === 3 ? ['mandorloFiore', .9] : null, senzaCentro: true }); },
      tamerice(A, H, r, S, v) { for (let k = 0; k < 3; k++) { const b = k / 3 * TAU + r(), e = [Math.cos(b) * 1.1, H * .62, Math.sin(b) * 1.1]; tubo(A, [[0, 0, 0], [Math.cos(b) * .4, H * .3, Math.sin(b) * .4], e], [.12, .08, .04], PAL[S.legno], H, 4); }
        chioma(A, [0, H * .66, 0], [S.chioma, H * .3, S.chioma], 'tamerice', H, v * 53, { lobi: 5, ciocche: 8, s: .9, sy: 1.3, detN: 0 }); },
      cespo(A, H, r, S, v) { const R = S.chioma * (.9 + r() * .2), sp = S === SP.mirto ? 'mirto' : S === SP.felce ? 'felce' : 'lentisco';
        chioma(A, [0, H * .5, 0], [R, H * .5, R], sp, H, v * 59 + 1, { lobi: 3, ciocche: 7, s: .55 + R * .18, fondo: .7, flex: .5, detN: 0 }); },
      oleandro(A, H, r, S, v) { const R = S.chioma;
        for (let k = 0; k < 5; k++) { const b = k / 5 * TAU + r(); tubo(A, [[0, 0, 0], [Math.cos(b) * R * .4, H * .55, Math.sin(b) * R * .4]], [.04, .025], '#6a5a44', H, 3); }
        chioma(A, [0, H * .55, 0], [R, H * .48, R], 'oleandro', H, v * 71 + 1, { lobi: 4, ciocche: 8, s: .65, fondo: .3, flex: .7, detN: 0, fiori: ['oleandroFiori', .45] }); },
      ginestra(A, H, r, S, v) { nucleo(A, [0, H * .35, 0], [S.chioma * .5, H * .3, S.chioma * .5], mul(tinta('ginestra'), .8), H, v + 61, { det: 0, flex: .3 }); ciuffo(A, H, S.chioma * 1.9, 'ginestra', 4, r, [1, 1, 1]); },
      cuscino(A, H, r, S, v) { const R = S.chioma, cap = S === SP.cappero; chioma(A, [0, H * .45, 0], [R, H * .5, R], cap ? 'agrume' : 'rosmarino', H, v * 67 + 1, { lobi: 2, ciocche: 6, s: .4, fondo: .8, flex: .3, detN: 0, cella: 'ramoSquame', fiori: cap ? ['cappero', .5] : null }); },
      pale(A, H, r, S, v) { const rr = rngK(v * 17 + 5), U = cellUV('pala');
        // una pala: un disco spesso (icosaedro schiacciato), nel suo piano; c centro, a angolo nel piano verticale, rot giro attorno al verticale
        const pala = (c, a, rot, s, liv) => { const ca = Math.cos(a), sa = Math.sin(a), cr = Math.cos(rot), sr = Math.sin(rot), p = ICO[1], vecchia = liv === 0 && s > .9;
          const col = vecchia ? hx('#8a8466') : liv === 1 && rr() < .3 ? hx('#9aa47e') : [1, 1, 1];
          for (let i = 0; i < p.length; i += 3) { const x = p[i] * .3 * s, y = p[i + 1] * .38 * s, z = p[i + 2] * .065 * s * (1 - (p[i] ** 2 + p[i + 1] ** 2) * .5);
            const xx = x * ca - y * sa, yy = x * sa + y * ca, P = [c[0] + xx * cr + z * sr, c[1] + yy, c[2] - xx * sr + z * cr], n = nrm([(p[i] * ca - p[i + 1] * sa) * .35 * cr + p[i + 2] * sr, (p[i] * sa + p[i + 1] * ca) * .35 + .2, -(p[i] * ca - p[i + 1] * sa) * .35 * sr + p[i + 2] * cr]);
            A.v(P, n, col, .05 * liv, [U[0] + (U[2] - U[0]) * (.5 + p[i] * .48), U[1] + (U[3] - U[1]) * (.5 + p[i + 1] * .48)], .55 + liv * .15); }
          if (liv < 3) { const nf = liv === 0 ? 2 + Math.floor(rr() * 2) : rr() < .75 ? 1 + Math.floor(rr() * 2) : 0;
            for (let k = 0; k < nf; k++) { const b = a + (k - (nf - 1) / 2) * .7 + (rr() - .5) * .4, d = .36 * s, cx = c[0] + (-Math.sin(b) * d) * cr, cy = c[1] + Math.cos(b) * d * .95, cz = c[2] - (-Math.sin(b) * d) * sr;
              const ns = s * (.8 + rr() * .15), nb = b + (rr() - .5) * .3, d2 = .34 * ns; pala([cx - Math.sin(nb) * d2 * cr, cy + Math.cos(nb) * d2, cz + Math.sin(nb) * d2 * sr], nb, rot + (rr() - .5) * 1.4, ns, liv + 1); } }
          else for (let k = 0; k < 2 + Math.floor(rr() * 3); k++) { const b = a + (rr() - .5) * 1.2; punto(A, [c[0] - Math.sin(b) * .36 * s * cr, c[1] + Math.cos(b) * .4 * s, c[2] + Math.sin(b) * .36 * s * sr], .06, rr() < .5 ? '#c8402a' : '#e09030', .2); } };
        for (let k = 0; k < 2; k++) pala([(k - .5) * .5, .4, (rr() - .5) * .3], (rr() - .5) * .3, k * 1.6 + rr(), 1.05, 0);
      },
      rosetta(A, H, r, S, v) { for (let k = 0; k < 16; k++) { const b = k / 16 * TAU * 2.3 + r() * .2, up = .5 + (k % 3) * .22, L = H * (1 + r() * .3) * (k < 5 ? .7 : 1);
          lama(A, [0, .05, 0], [Math.cos(b) * (1 - up * .5), up, Math.sin(b) * (1 - up * .5)], L, .16, .3 * (1 - up), 'agave', H, 3, { flex: .1 }); }
        if (v === 3) { tubo(A, [[0, .3, 0], [.1, 2.5, 0], [.2, 4.8, .05]], [.08, .06, .04], '#7a7a48', 5, 4); for (let k = 0; k < 6; k++) { const y = 3 + k * .32, b = k * 2.1; nucleo(A, [.15 + Math.cos(b) * .35, y, Math.sin(b) * .35], [.3, .12, .3], hx('#e0c040'), 5, k + 3, { det: 0, occ: .9, cella: 'bianco' }); } } },
      canne(A, H, r, S, v) { for (let k = 0; k < 11; k++) { const b = r() * TAU, s = r() * .7, Lh = H * (.75 + r() * .3); lama(A, [Math.cos(b) * s * .5, 0, Math.sin(b) * s * .5], [Math.cos(b) * s * .15, 1, Math.sin(b) * s * .15], Lh, .32, .04, 'canna', H, 3, { flex: 1 }); } },
      palma(A, H, r, S, v) { const a = r() * TAU, lean = (.04 + r() * .1) * H, lx = Math.cos(a) * lean, lz = Math.sin(a) * lean, NS = 8, pts = [];
        for (let k = 0; k <= NS; k++) { const t = k / NS; pts.push([lx * t * t, H * .86 * t, lz * t * t]); }
        tubo(A, pts, pts.map((_, k) => .34 - k * .012), PAL[S.legno], H, 6, { anelli: true });
        const top = pts[NS]; nucleo(A, [top[0], top[1] + .1, top[2]], [.6, .55, .6], hx('#7a6a40'), H, v + 3, { det: 0, cella: 'corteccia', occ: .4 });
        for (let k = 0; k < 18; k++) { const b = k / 18 * TAU + r() * .3, up = k % 2 ? .6 : .18 + r() * .15, L = 3.4 + r() * .8;
          lama(A, [top[0], top[1] + .35, top[2]], [Math.cos(b) * .85, up, Math.sin(b) * .85], L, .55, .5 + (1 - up) * .35, 'palma', H, 5, { flex: 1 }); }
        if (v % 2) for (let k = 0; k < 4; k++) { const b = k / 4 * TAU + .4; punto(A, [top[0] + Math.cos(b) * .6, top[1] - .2, top[2] + Math.sin(b) * .6], .22, '#e09a2a', .9); } },
      washingtonia(A, H, r, S, v) { const lean = (.02 + r() * .05) * H, a = r() * TAU, NS = 8, pts = []; for (let k = 0; k <= NS; k++) { const t = k / NS; pts.push([Math.cos(a) * lean * t, H * .9 * t, Math.sin(a) * lean * t]); }
        tubo(A, pts, pts.map((_, k) => .26 - k * .014), PAL[S.legno], H, 5, { anelli: true });
        const top = pts[NS]; nucleo(A, [top[0], top[1] - .8, top[2]], [.72, 1.15, .72], hx('#6a5438'), H, v + 5, { det: 1, cella: 'corteccia', occ: .45 });
        for (let k = 0; k < 14; k++) { const b = k / 14 * TAU, up = .2 + (k % 3) * .22, n = nrm([Math.cos(b), up + .3, Math.sin(b)]); carta(A, [top[0] + Math.cos(b) * .9, top[1] + .3 + up, top[2] + Math.sin(b) * .9], .9, n, nrm([Math.cos(b), .7, Math.sin(b)]), 'washingtonia', [1, 1, 1], 1, -Math.PI / 2, .8); } },
      muro(A, H, r, S, v) { const boug = S === SP.bouganville, R = S.chioma, rr = rngK(v * 73 + 1), col = boug ? [1, 1, 1] : tinta('edera');   // contro un muro: la faccia piatta a z=0, verso +z
        nucleo(A, [0, H * .55, .25], [R * .7, H * .38, .3], mul(tinta(boug ? 'oleandro' : 'edera'), .8), H, v * 73, { flex: .4, det: 1, occ: .3 });
        for (let k = 0; k < 40; k++) { const x = (rr() - .5) * R * 2 * Math.sin(Math.PI * (.2 + .8 * rr())), y = H * (.08 + rr() * .92), n = nrm([(rr() - .5) * .6, .3 + rr() * .4, 1]); carta(A, [x, y, .3 + rr() * .3], .48 + rr() * .2, n, nrm([n[0], .5, 1]), boug ? 'bouganville' : 'edera', col, .5 * y / H, rr() * TAU, clamp(.4 + y / H * .6, .3, 1)); }
        tubo(A, [[0, 0, .15], [.1, H * .4, .2]], [.08, .06], '#5a4a3a', H, 4); },
      pergola(A, H, r, S, v) { const Lx = 3.2, D = 2.6, rr = rngK(v * 7 + 11);
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([i, j]) => tubo(A, [[i * Lx / 2, 0, j * D / 2], [i * Lx / 2, H, j * D / 2]], [.06, .05], '#7a6248', H, 4));
        for (let k = 0; k < 4; k++) { const z = -D / 2 + k * D / 3; tubo(A, [[-Lx / 2 - .2, H, z], [Lx / 2 + .2, H, z]], [.04, .04], '#8a7050', H, 4); }
        tubo(A, [[-Lx / 2, 0, -D / 2], [-Lx / 2 + .1, H * .5, -D / 2 + .1], [-Lx / 4, H + .1, 0]], [.07, .05, .03], '#5a4432', H, 4);
        for (let k = 0; k < 34; k++) { const x = (rr() - .5) * Lx * 1.05, z = (rr() - .5) * D * 1.05, n = nrm([(rr() - .5) * .5, 1, (rr() - .5) * .5]); carta(A, [x, H + .12 + rr() * .15, z], .55 + rr() * .2, n, nrm([n[0], 1, n[2]]), 'vite', [1, 1, 1], .3, rr() * TAU, .8); }
        for (let k = 0; k < 6; k++) { const x = (rr() - .5) * Lx * .8, z = (rr() - .5) * D * .8, n = nrm([rr() - .5, 0, rr() - .5]); carta(A, [x, H - .55, z], .4, n, [0, .3, 1], 'vite', [1, 1, 1], .3, Math.PI, .5, { sx: .9, sy: 1.3 }); } },
      tappeto(A, H, r, S, v) { const s = S.chioma * (.8 + r() * .5); carta(A, [0, .02 + v * .004, 0], s, [0, 1, 0], [0, 1, 0], S.cella, hx(PAL[S.pal][1]), 0, r() * TAU, .85, { oo: [.7, .85, 1, .8] }); },
      pigna(A, H, r, S, v) { nucleo(A, [0, .06, 0], [.075, .06, .055], hx('#8a5432'), 1, v + 7, { det: 1, occ: .7, flex: 0, cella: 'corteccia' }); },
      rametto(A, H, r, S, v) { const L = .8 + r() * .8, a = r() * TAU, e = [Math.cos(a) * L, .05, Math.sin(a) * L]; tubo(A, [[0, .04, 0], [e[0] * .5, .07, e[2] * .5 + .06], e], [.035, .025, .012], '#5a3e2c', 1, 4);
        const b = a + .7; tubo(A, [[e[0] * .5, .06, e[2] * .5], [e[0] * .5 + Math.cos(b) * .35, .06, e[2] * .5 + Math.sin(b) * .35]], [.015, .008], '#5a3e2c', 1, 3); },
      ciuffo(A, H, r, S, v) { const L = S.erbe || ['erbaDab'], c = L[v % L.length]; ciuffo(A, H, H * 1.1, c, 3, r, colCella(c, S.pal, tinta(S.pal))); },
      ombrelle(A, H, r, S, v) { ciuffo(A, H, H * .8, 'finocchietto', 2, r, [1, 1, 1]); },
      fiori(A, H, r, S, v) { ciuffo(A, H, H * .9, 'papavero', 3, r, [1, 1, 1]); },
      ciuffoAlto(A, H, r, S, v) { ciuffo(A, H, H * .7, S.cella, 2, r, colCella(S.cella, S.pal, tinta(S.pal))); },
      felce(A, H, r, S, v) { ciuffo(A, H, H * 1.1, 'felce', 4, r, colCella('felce', 'felce', tinta('felce')), .5); },
      fioriBianchi(A, H, r, S, v) { chioma(A, [0, H * .5, 0], [S.chioma, H * .5, S.chioma], 'erbaVerde', H, v * 3 + 1, { lobi: 2, ciocche: 6, s: .45, fondo: .8, flex: .6, detN: 0, cella: 'fioriBianchi' }); },
    };
    // ---------------- LE SAGOME (media distanza e lontano) ----------------
    function sagomaDi(sp, H, liv) {
      const S = SP[sp], A = Acc(), R = S.chioma, l1 = liv === 1, o = { lobi: l1 ? 3 : 2, ciocche: l1 ? 5 : 2, s: 1.6, detN: 0 };
      const tr = (h, rr) => { if (S.tronco) tubo(A, [[0, 0, 0], [0, h, 0]], [rr, rr * .7], PAL[S.legno] || '#6a5a4a', H, l1 ? 4 : 3); };
      const cl = S.sag;
      if (cl === 'ombrello') { tr(H * .8, .03 * H); chioma(A, [0, H * .87, 0], [R, H * .1, R], sp, H, 5, Object.assign({}, o, { fondo: .7, lobi: l1 ? 5 : 3 })); }
      else if (cl === 'tondo') { tr(H * .42, .2); chioma(A, [0, H * .64, 0], [R, H * .34, R], sp, H, 5, o); }
      else if (cl === 'colonna') nucleo(A, [0, H * .5, 0], [R * .85, H * .5, R * .85], mul(tinta(sp), .9), H, 5, { det: 0, occ: .6 });
      else if (cl === 'palma') { tr(H * .86, .25); for (let k = 0; k < (l1 ? 8 : 5); k++) { const b = k / (l1 ? 8 : 5) * TAU; lama(A, [0, H * .88, 0], [Math.cos(b) * .85, .25, Math.sin(b) * .85], 3.2, .55, .6, sp === 'palma' ? 'palma' : 'washingtonia', H, 2, {}); } }
      else if (cl === 'rado') { tr(H * .7, .03 * H); chioma(A, [0, H * .78, 0], [R, H * .2, R], sp, H, 5, o); }
      else chioma(A, [0, H * .48, 0], [R, H * .5, R], SP[sp] && CELLA[sp] ? sp : 'lentisco', H, 5, Object.assign({}, o, { fondo: .6, lobi: l1 ? 2 : 1, ciocche: l1 ? 4 : 0 }));
      return A.build();
    }
    const CACHE = {};
    const H0 = sp => { const S = SP[sp]; return (S.h[0] + S.h[1]) / 2; };
    function modello(sp, v) { const k = sp + v; if (CACHE[k]) return CACHE[k]; const S = SP[sp], H = H0(sp), A = Acc(), rr = rngK(hash2(sp.length * 31 + sp.charCodeAt(0), v, 911) * 1e9);
      let P = ALBERI[sp]; if (P && sp === 'mandorlo' && v === 3) P = Object.assign({}, P, { c: Object.assign({}, P.c, { fiori: ['mandorloFiore', .85] }) });
      if (P) albero(A, H, rr, P, v, sp); else FORME[S.forma](A, H, rr, S, v); return (CACHE[k] = A.build()); }
    function sagoma(sp, liv) { const k = '§' + sp + liv; return CACHE[k] || (CACHE[k] = sagomaDi(sp, H0(sp), liv || 1)); }
    return { Acc, nucleo, carta, chioma, tubo, lama, ciuffo, punto, FORME, modello, sagoma, H0, atlante, cellUV, CELLE, hx, mix, tinta, caricato: () => { atlante(); return CARICATO; } };
  })();

  // ================= IL MATERIALE: vento, livelli, dissolvenza =================
  // Un MeshLambertMaterial coi colori nei vertici; il vertex shader legge il centro dell'istanza (o l'attributo centro, per la geometria
  // fusa da lontano), calcola la distanza dalla camera e il peso k della fascia del livello (uBand: entra fra x e y, esce fra z e w);
  // il fragment shader dissolve a retino (niente trasparenze da ordinare). Sotto k ≈ 0 la pianta si chiude in un punto: niente disegno.
  // LA PITTURA (le manopole, condivise da tutti i materiali del verde): la luce del gioco divisa in tre fasce morbide (uRamp: soglia
  // ombra/mezzo, soglia mezzo/luce, morbidezza, in unità di «quanta luce prende»), l'ombra fredda e la luce calda come moltiplicatori della
  // tinta della specie, l'occlusione dipinta, il controluce sui bordi delle ciocche, quanto della tinta della luce del gioco passa (sera, notte).
  const U = typeof THREE === 'undefined' ? null : { uT: { value: 0 }, uCam: { value: new THREE.Vector3() }, uWind: { value: .06 },
    uPittura: { value: 1 }, uRamp: { value: new THREE.Vector3(.5, .92, .12) }, uOmbra: { value: new THREE.Vector3(.5, .7, .92) }, uOmbraAdd: { value: new THREE.Vector3(0, .03, .06) },
    uMezzo: { value: new THREE.Vector3(1, 1.04, .98) }, uLuce: { value: new THREE.Vector3(1.24, 1.21, .94) }, uLuceAdd: { value: new THREE.Vector3(.05, .05, .01) },
    uOcc: { value: .62 }, uTrasl: { value: 1.1 }, uTintaLuce: { value: .55 }, uGamma: { value: null }, uGain: { value: .62 }, uOff: { value: .02 }, uTintaSpecie: { value: .22 } };
  function materiale(band, opz) {
    opz = opz || {};
    // le carte hanno già le due facce: il materiale guarda solo il davanti (niente rovescio con la luce girata)
    const m = new THREE.MeshLambertMaterial({ vertexColors: true, map: KIT ? KIT.atlante() : null, alphaTest: .5, side: THREE.FrontSide });
    if (opz.senzaProfondita) m.depthWrite = false;   // [vegetazione] il prato di massa: niente profondità, quindi niente contorno del post
    const uBand = { value: new THREE.Vector4(band[0], band[1], band[2], band[3]) }; m.userData.uBand = uBand;
    m.onBeforeCompile = sh => {
      if (!U.uGamma.value) U.uGamma.value = gammaTex(); for (const k in U) sh.uniforms[k] = U[k]; sh.uniforms.uBand = uBand;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
uniform float uT; uniform vec3 uCam; uniform vec4 uBand; uniform float uWind; attribute float flex; attribute float occ; varying float vK; varying float vOcc;
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
float vgD = distance(vc.xz, uCam.xz); vOcc = occ;
vK = smoothstep(uBand.x, uBand.y, vgD) * (1.0 - smoothstep(uBand.z, uBand.w, vgD));
float vgP = vc.x * .21 + vc.z * .17;
transformed.x += (sin(uT * 1.7 + vgP) + .4 * sin(uT * 3.9 + vgP * 2.3)) * flex * uWind;
transformed.z += cos(uT * 1.3 + vgP * 1.3) * flex * uWind * .6;
#ifdef VEG_CENTRO
if (vK < .003) transformed = centro;
#else
if (vK < .003) transformed = vec3(0.0);
#endif`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying float vK; varying float vOcc; uniform float uPittura; uniform vec3 uRamp; uniform vec3 uOmbra; uniform vec3 uOmbraAdd; uniform vec3 uMezzo; uniform vec3 uLuce; uniform vec3 uLuceAdd; uniform float uOcc; uniform float uTrasl; uniform float uTintaLuce; uniform sampler2D uGamma; uniform float uGain; uniform float uOff; uniform float uTintaSpecie;`)
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
if (vK < .999) { float vgN = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715)))); if (vK < vgN) discard; }`)
        .replace('#include <envmap_fragment>', `#include <envmap_fragment>
{ // [vegetazione] la pittura: la luce che la foglia prende (con l'occlusione dipinta) scelta sulla GAMMA del riferimento; la specie la
  // tinge appena; la tinta della luce del gioco passa per metà (sera, notte); il controluce accende i bordi
  vec3 vgB = diffuseColor.rgb; float vgLb = max(dot(vgB, vec3(.299, .587, .114)), .002);
  float vgL = dot(outgoingLight, vec3(.299, .587, .114)) * mix(uOcc, 1., vOcc);
  float vgLf = dot(outgoingLight, vec3(.299, .587, .114)) / vgLb; vec3 vgHue = clamp(outgoingLight / max(vgB * vgLf, vec3(.002)), 0., 2.);
  vec3 vgC = texture2D(uGamma, vec2(clamp(vgL * uGain + uOff, .01, .99), .5)).rgb;
  vgC *= mix(vec3(1.), vgB / vgLb, uTintaSpecie) * mix(vec3(1.), vgHue, uTintaLuce);
  #if NUM_DIR_LIGHTS > 0
  float vgBack = pow(max(dot(-normalize(vViewPosition), directionalLights[0].direction), 0.), 3.);
  float vgEdge = 1. - smoothstep(.5, .9, diffuseColor.a);
  vgC += directionalLights[0].color * vgBack * (.3 + .7 * vgEdge) * vec3(.8, .9, .5) * uTrasl * vOcc * .25;
  #endif
  outgoingLight = mix(outgoingLight, vgC, uPittura); }`);
    };
    if (opz.centro) m.defines = { VEG_CENTRO: '' };
    m.customProgramCacheKey = () => 'veg' + (opz.centro ? 'C' : '');
    return m;
  }
  // l'ombra delle carte: la profondità ritagliata dall'alfa (le chiazze di luce sotto gli alberi)
  let DEPTH = null;
  function ombra() { return DEPTH || (DEPTH = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: KIT.atlante(), alphaTest: .5 })); }


  // ================= LA GAMMA: un solo colore per valore, per piante e suolo =================
  // Dal riferimento dell'utente (la radura col rudere vista dall'alto, 23 ottobre): l'armonia viene da una gamma sola che sale dall'ombra
  // blu notte al teal, al verde, al lime, alla luce crema. Il fogliame, l'erba e il suolo cadono tutti in questa scala secondo quanta luce
  // prendono; la specie sposta appena la tinta (uTintaSpecie). Il suolo caldo (aghi, paglia, terra) ha la sua gamma calda che si
  // mescola per formazione (CALDA).
  const GAMMA = ['#122e5b', '#154c63', '#1f636e', '#2c7b7b', '#499d8f', '#6ea470', '#9ac770', '#c5e276', '#f5f3b0'];
  const GAMMA_CALDA = ['#2a2440', '#4a3438', '#74503a', '#9a7448', '#b89458', '#cdb06a', '#dcc884', '#ece0a4', '#f8f0c8'];
  const hexRGB = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const gammaAt = (G, t) => { t = Math.max(0, Math.min(1, t)) * (G.length - 1); const i = Math.min(G.length - 2, Math.floor(t)), f = t - i, a = hexRGB(G[i]), b = hexRGB(G[i + 1]); return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; };
  let GT = null;
  function gammaTex() { if (GT) return GT; const d = new Uint8Array(256 * 4); for (let i = 0; i < 256; i++) { const c = gammaAt(GAMMA, i / 255); d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255; }
    GT = new THREE.DataTexture(d, 256, 1, THREE.RGBAFormat); GT.magFilter = GT.minFilter = THREE.LinearFilter; GT.needsUpdate = true; return GT; }
  // quanto calda è la formazione a terra (0 la gamma fredda, 1 la calda)
  const CALDA = { pineta: .8, pinetaM: .65, lecceta: .25, macchia: .4, gariga: .75, prato: .55, uliveto: .45, agrumeto: .3, riparia: .15, eucalipteto: .55, giardino: .3 };

  // ================= IL SUOLO DIPINTO SOTTO IL VERDE =================
  // Le piante devono nascere dal suolo, non starci sopra: sotto le chiome il suolo scende nell'ombra (una pozza morbida, spostata dalla
  // parte opposta al sole), nelle radure sale nella luce, lungo i sentieri si schiarisce e si scalda; la pennellata è allungata e segue
  // il pendio del rumore, non è grana. I bordi verso il suolo dipinto dal gioco sfumano (la maschera delle caselle è interpolata).
  function ombraSuolo(P) {   // la pozza d'ombra delle chiome per casella (0 … 1), calcolata una volta
    if (P.ombra) return P.ombra; const W = P.W, GW = W.GW, GH = W.GH, TS = W.TS, O = new Float32Array(GW * GH);
    P.piante.forEach(p => { const S = SP[p.sp]; if (!S || S.strato === 'C') return; const R = S.chioma * (S.strato === 'B' ? .8 : 1) * 1.1, cx = p.x - R * .25, cy = p.y - R * .35, k = S.strato === 'A' ? .7 : S.strato === 'M' ? .55 : .4;
      for (let ty = Math.floor((cy - R) / TS); ty <= Math.ceil((cy + R) / TS); ty++) for (let tx = Math.floor((cx - R) / TS); tx <= Math.ceil((cx + R) / TS); tx++) { if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) continue;
        const d = Math.hypot(tx * TS + 1 - cx, ty * TS + 1 - cy) / R; if (d < 1) { const i = ty * GW + tx; O[i] = Math.min(1, O[i] + k * (1 - d * d)); } } });
    return (P.ombra = O);
  }
  function dipingiSuolo(ctx, tx0, ty0, n, m, PX) {
    if (SPENTO || !PIANO) return; const P = PIANO, W = P.W, GW = W.GW, GH = W.GH, TS = W.TS, form = P.form, O = ombraSuolo(P), ppm = PX / TS;
    const mia = (tx, ty) => { if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) return 0; const f = form[ty * GW + tx]; if (!f || f === F.costa || f === F.urbano) return 0; const v = W.grid[ty * GW + tx], T = W.T;
      return v === T.TREE || v === T.SHRUB || v === T.GRASS || v === T.DIRT || v === T.FIELD || v === T.GRAVEL ? 1 : 0; };
    let any = false; for (let j = -1; j <= m && !any; j++) for (let i = -1; i <= n; i++) if (mia(tx0 + i, ty0 + j)) { any = true; break; } if (!any) return;
    const w = n * PX, h = m * PX, img = ctx.getImageData(0, 0, w, h), d = img.data;
    const smp = (A, fx, fy) => { const x0 = Math.floor(fx), y0 = Math.floor(fy), ax = fx - x0, ay = fy - y0, g = (x, y) => x < 0 || y < 0 || x >= GW || y >= GH ? 0 : A(x, y); return g(x0, y0) * (1 - ax) * (1 - ay) + g(x0 + 1, y0) * ax * (1 - ay) + g(x0, y0 + 1) * (1 - ax) * ay + g(x0 + 1, y0 + 1) * ax * ay; };
    const omb = (x, y) => O[y * GW + x], ton = (x, y) => { const f = form[y * GW + x]; return f ? FORM[f].tono : .5; }, cal = (x, y) => { const f = form[y * GW + x]; return f ? CALDA[FORM[f].id] || .4 : .4; };
    const sen = (x, y) => { const v = P.dSen[y * GW + x]; return v < 2.5 ? 1 - v / 2.5 : 0; };
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
      const wx = tx0 * TS + px / ppm, wy = ty0 * TS + py / ppm, fx = wx / TS - .5, fy = wy / TS - .5, a = smp(mia, fx, fy); if (a < .02) continue;
      // la pennellata: rumore allungato (i colpi vanno tutti in una direzione, che cambia piano), più la macchia larga
      const ang = fbm(wx / 30, wy / 30, 7801, 2) * 3.1, ca = Math.cos(ang), sa = Math.sin(ang), u = wx * ca + wy * sa, vv = -wx * sa + wy * ca;
      const pen = fbm(u / 1.6, vv / .35, 7802, 2) - .5, mac = fbm(wx / 9, wy / 9, 7803, 3) - .5;
      let t = .3 + smp(ton, fx, fy) * .42 - smp(omb, fx, fy) * .42 + mac * .22 + pen * .13 + smp(sen, fx, fy) * .14;
      const k = smp(cal, fx, fy), c1 = gammaAt(GAMMA, t), c2 = gammaAt(GAMMA_CALDA, t * .92 + .04), q = (py * w + px) * 4;
      const r = c1[0] + (c2[0] - c1[0]) * k, g = c1[1] + (c2[1] - c1[1]) * k, b = c1[2] + (c2[2] - c1[2]) * k;
      d[q] = d[q] + (r - d[q]) * a; d[q + 1] = d[q + 1] + (g - d[q + 1]) * a; d[q + 2] = d[q + 2] + (b - d[q + 2]) * a;
    }
    ctx.putImageData(img, 0, 0);
  }

  // ================= LA POSA NEL GIOCO: attorno alla camera, per specie =================
  // monta(scene, { W, groundH, telefono }) prepara i gruppi; aggiorna(cx, cz, t) a ogni fotogramma: quando la camera si sposta di qualche
  // metro rifà gli elenchi: vicino (entro R0) il modello intero per specie e variante; a media distanza (R0 … R1) la sagoma per specie;
  // la copertura bassa (erba, fiori, felci, lettiere) solo entro RC; le ombre di contatto sotto gli alberi vicini. Il passaggio fra i
  // livelli si dissolve a retino nel materiale (uBand). Gli alberi abbattuti (casella non più TREE) non si disegnano.
  function monta(scene, opz) {
    if (SPENTO || !KIT) return null; opz = opz || {}; const W = opz.W, P = piano(W), gH = opz.groundH || (() => 0), tel = !!opz.telefono;
    const R0 = tel ? 30 : 48, R1 = tel ? 90 : 150, RC = tel ? 14 : 24, F0 = 6;
    const MV = materiale([-1, 0, R0 - F0, R0]), MS = materiale([R0 - F0, R0, R1 - 12, R1]), MC = materiale([-1, 0, RC - 4, RC]), MCm = materiale([-1, 0, RC - 4, RC], { senzaProfondita: true });
    const gruppo = new THREE.Group(); gruppo.name = 'vegetazione'; scene.add(gruppo);
    const C = 16, idx = new Map(); P.piante.forEach(p => { const k = Math.floor(p.x / C) * 65536 + Math.floor(p.y / C); (idx.get(k) || idx.set(k, []).get(k)).push(p); });
    const IM = new Map(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), col = new THREE.Color();
    const im = (key, geo, mat, ombre) => { let g = IM.get(key); if (!g) { g = { cap: 0, mesh: null, n: 0, geo, mat, ombre }; IM.set(key, g); } return g; };
    const metti = (g, x, y, z, s, ry, t) => { if (g.n >= g.cap) cresci(g); eu.set(0, ry, 0); q.setFromEuler(eu); sc.set(s, s, s); ps.set(x, y, z); m4.compose(ps, q, sc); g.mesh.setMatrixAt(g.n, m4); const dd = (t - .5) * .16; col.setRGB(1 + dd, 1 + dd * .8, 1 + dd * .5); g.mesh.setColorAt(g.n, col); g.n++; };
    const cresci = g => { const cap = Math.max(16, g.cap * 2), m = new THREE.InstancedMesh(g.geo, g.mat, cap); m.frustumCulled = false; m.castShadow = !!g.ombre && !tel; m.receiveShadow = true; if (g.ombre) m.customDepthMaterial = ombra(); if (g.mat.depthWrite === false) m.renderOrder = 5;
      if (g.mesh) { for (let i = 0; i < g.n; i++) { g.mesh.getMatrixAt(i, m4); m.setMatrixAt(i, m4); g.mesh.getColorAt(i, col); m.setColorAt(i, col); } gruppo.remove(g.mesh); g.mesh.dispose(); }
      g.mesh = m; g.cap = cap; gruppo.add(m); };
    // LONTANO: tutte le piante grandi dell'isola in una geometria sola (la sagoma più semplice, già posata), che lo shader chiude dentro R1
    { const L = P.piante.filter(p => SP[p.sp].strato !== 'C' && (SP[p.sp].strato !== 'B' || SP[p.sp].chioma >= 1.2)); let nv = 0; const geos = L.map(p => { const g = KIT.sagoma(p.sp, 2); nv += g.attributes.position.count; return g; });
      const Pp = new Float32Array(nv * 3), Nn = new Float32Array(nv * 3), Cc = new Float32Array(nv * 3), Uu = new Float32Array(nv * 2), Oo = new Float32Array(nv), Ff = new Float32Array(nv), Ce = new Float32Array(nv * 3); let o = 0;
      L.forEach((p, k) => { const g = geos[k], A = g.attributes, s = p.h / KIT.H0(p.sp), cs = Math.cos(p.rot), sn = Math.sin(p.rot), y0 = gH(p.x, p.y) - .04;
        for (let i = 0; i < A.position.count; i++, o++) { const x = A.position.getX(i) * s, y = A.position.getY(i) * s, z = A.position.getZ(i) * s, nx = A.normal.getX(i), nz = A.normal.getZ(i);
          Pp[o * 3] = p.x + x * cs + z * sn; Pp[o * 3 + 1] = y0 + y; Pp[o * 3 + 2] = p.y - x * sn + z * cs; Nn[o * 3] = nx * cs + nz * sn; Nn[o * 3 + 1] = A.normal.getY(i); Nn[o * 3 + 2] = -nx * sn + nz * cs;
          Cc[o * 3] = A.color.getX(i); Cc[o * 3 + 1] = A.color.getY(i); Cc[o * 3 + 2] = A.color.getZ(i); Uu[o * 2] = A.uv.getX(i); Uu[o * 2 + 1] = A.uv.getY(i); Oo[o] = A.occ.getX(i); Ff[o] = 0;
          Ce[o * 3] = p.x; Ce[o * 3 + 1] = y0; Ce[o * 3 + 2] = p.y; } });
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(Pp, 3)); g.setAttribute('normal', new THREE.BufferAttribute(Nn, 3)); g.setAttribute('color', new THREE.BufferAttribute(Cc, 3));
      g.setAttribute('uv', new THREE.BufferAttribute(Uu, 2)); g.setAttribute('occ', new THREE.BufferAttribute(Oo, 1)); g.setAttribute('flex', new THREE.BufferAttribute(Ff, 1)); g.setAttribute('centro', new THREE.BufferAttribute(Ce, 3)); g.computeBoundingSphere();
      const far = new THREE.Mesh(g, materiale([R1 - 12, R1, 1e5, 1e5 + 1], { centro: true })); far.name = 'vegLontano'; far.frustumCulled = false; far.receiveShadow = true; gruppo.add(far); }
    let lx = 1e9, lz = 1e9, lc = 1e9, lcz = 1e9;
    const BASSE = new Set(['erbaSecca', 'erbaVerde', 'papavero', 'finocchietto', 'avena', 'cardo', 'asfodelo', 'fioriBianchi', 'tappetoAghi', 'tappetoFoglie', 'pigna', 'rametto']);
    function aggiorna(cx, cz, t) {
      U.uT.value = t || 0; U.uCam.value.set(cx, 0, cz);
      if (Math.hypot(cx - lx, cz - lz) > 4) { lx = cx; lz = cz; IM.forEach((g, k) => { if (!k.startsWith('c|')) g.n = 0; });
        const i0 = Math.floor((cx - R1) / C), i1 = Math.floor((cx + R1) / C), j0 = Math.floor((cz - R1) / C), j1 = Math.floor((cz + R1) / C);
        for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) (idx.get(i * 65536 + j) || []).forEach(p => {
          const d = Math.hypot(p.x - cx, p.y - cz); if (d > R1) return; const S = SP[p.sp]; if (S.tronco && p.tile !== undefined && W.grid[p.tile] !== W.T.TREE) return;
          const y = gH(p.x, p.y) - .04, s = p.h / KIT.H0(p.sp);
          if (d < R0) metti(im('v|' + p.sp + '|' + p.v, KIT.modello(p.sp, p.v), MV, S.strato !== 'C'), p.x, y, p.y, s, p.rot, p.t);
          if (d > R0 - F0 && S.strato !== 'C') metti(im('s|' + p.sp, KIT.sagoma(p.sp, 1), MS, false), p.x, y, p.y, s, p.rot, p.t); });
        IM.forEach((g, k) => { if (k.startsWith('c|') || !g.mesh) return; g.mesh.count = g.n; g.mesh.instanceMatrix.needsUpdate = true; if (g.mesh.instanceColor) g.mesh.instanceColor.needsUpdate = true; }); }
      if (Math.hypot(cx - lc, cz - lcz) > 2.5) { lc = cx; lcz = cz; IM.forEach((g, k) => { if (k.startsWith('c|')) g.n = 0; });
        const st = tel ? 1.1 : .8;
        for (let y = Math.floor((cz - RC) / st) * st; y < cz + RC; y += st) for (let x = Math.floor((cx - RC) / st) * st; x < cx + RC; x += st) {
          const jx = x + hash2(Math.round(x * 10), Math.round(y * 10), 7901) * st, jy = y + hash2(Math.round(x * 10), Math.round(y * 10), 7902) * st; if (Math.hypot(jx - cx, jy - cz) > RC) continue;
          const c = copertura(P, jx, jy); if (!c) continue; const S = SP[c.sp]; if (!S) continue; const v = Math.floor(c.t * 4), hh = S.h[0] + (S.h[1] - S.h[0]) * c.t;
          const eroe = c.sp === 'finocchietto' || c.sp === 'cardo' || c.sp === 'asfodelo' || (c.sp === 'papavero' && c.t < .3) || c.t < .04;   // [vegetazione] i pochi segni col contorno
          metti(im('c|' + c.sp + '|' + v + (eroe ? 'e' : 'm'), KIT.modello(c.sp, v), eroe ? MC : MCm, false), jx, gH(jx, jy) - .02, jy, hh / KIT.H0(c.sp), c.t * 6.28, c.t); }
        IM.forEach((g, k) => { if (!k.startsWith('c|') || !g.mesh) return; g.mesh.count = g.n; g.mesh.instanceMatrix.needsUpdate = true; if (g.mesh.instanceColor) g.mesh.instanceColor.needsUpdate = true; }); }
    }
    return { gruppo, aggiorna, misura: () => { let draw = 1, istanze = 0, tri = 0; IM.forEach(g => { if (g.mesh && g.n) { draw++; istanze += g.n; tri += g.n * g.geo.attributes.position.count / 3; } }); return { draw, istanze, tri: Math.round(tri) }; } };
  }

  const api = { SP, SPECIE, PAL, FORM, F, RADURE, SPENTO, piano, pianta, mia, copertura, misura, formazioni, hash2, fbm, KIT, U, materiale, ombra, monta, dipingiSuolo, GAMMA, gammaAt, attivo: !SPENTO };
  return api;
})();
if (typeof module !== 'undefined') module.exports = Vegetazione;
