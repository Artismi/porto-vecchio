/* Porto Vecchio — il disegno dei lavori dei writer (v7, «Writer»). Solo canvas 2D, nessuna dipendenza da three.js.
   Un lavoro (writing.js: { style, aka, pal, seed, W, H, crew, ... }) diventa una serie di TAPPE, immagini intere da svelare
   in ordine come le farebbe un writer vero: il riempimento, lo sfondo, il contorno col 3D, alla fine luci e dettagli.
   - LE FAMIGLIE DI LETTERE: block (blockbuster dritte, angoli vivi), bubble (lettere a bolla dei throw-up), semi (semi-wild:
     qualche freccia), wild (wildstyle: lettere che si incastrano, frecce, punte, collegamenti), chrome (argento e nero,
     il throw-up classico). Ogni writer ha la sua (st.npcs[].pop.writer.fam), il giocatore la sceglie col pezzo.
   - I RIEMPIMENTI: sfumato, in diagonale, a bande (split), a bolle, a crepe di ghiaccio, a fiamme, a scacchi, cromato, a stelle.
   - GLI SFONDI: la nuvola di bolle, il sole che spacca il ghiaccio, le radici che sollevano l'asfalto, lo skyline del porto
     (palazzoni, gru, la torre della miniera col fumo), gli spruzzi, le schegge di ghiaccio.
   - I PERSONAGGI (burner e whole car): il b-boy, lo skater col berretto oversize, il sole con gli occhiali, il banchiere che
     si scioglie, il Grigio col casco della Celere (col naso da maiale), il boombox.
   - LE PAROLE: di solito il nome del writer; nelle produzioni le parole del Disgelo (DISGELO, SOLE, RADICI...); sotto i pezzi
     gli slogan piccoli; vicino alle tag i SEGNI (le tag sono mappe: la presa calda, il tombino aperto, la rampa pulita,
     l'occhio dei Grigi, la serra).
   Tutto è deciso dal seme del lavoro: lo stesso lavoro si ridisegna sempre uguale. */
var WriterArte = (function () {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), hyp = Math.hypot, PI = Math.PI;
  // [graffiti3] l'alfabeto a tratti: quello di graffiti.js, o (nel disegnatore a parte, dove graffiti.js non c'è) le maiuscole
  // dritte di writer_mano.js. Prima nel worker era vuoto: niente firme piccole, slogan, anno, e i pezzi semi/wild senza lettere.
  let F0 = null;
  const FONT = () => (typeof Graffiti !== 'undefined' && Graffiti && Graffiti.F) || F0 || (F0 = fontFromHand());
  const WM = typeof WriterMano !== 'undefined' ? WriterMano : (typeof require !== 'undefined' ? require('./writer_mano.js') : null);
  function fontFromHand() { const out = {}; if (WM && WM.A) Object.keys(WM.A).forEach(ch => { out[ch] = WM.A[ch][0]; }); return out; }
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  // [graffiti3] nel disegnatore a parte (worker) non esiste HTMLCanvasElement: `instanceof` mandava in errore ogni pezzo a blocchi, che
  // tornava a disegnarsi nel gioco (il più pesante, un secondo l'uno). Si guarda se sa fare getContext.
  const isCanvas = o => !!o && typeof o === 'object' && typeof o.getContext === 'function';
  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  const DEACC = s => String(s).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9!?.\- ']/g, '');
  const pickR = (r, a) => a[Math.floor(r() * a.length)];

  // ---------------- LE TAVOLOZZE ----------------
  // riempimento sfumato (3), contorno, 3D, keyline, fondo, luce. Le prime otto sono quelle della rotella dei colori.
  const PAL = [
    { f: ['#ffe14a', '#ff9a1e', '#e2361e'], o: '#1a1420', d: '#3a1a62', k: '#f6f1e4', bg: '#3aa6e0', hi: '#ffffff' },
    { f: ['#8ee0ff', '#2a86e0', '#283c9e'], o: '#0e1018', d: '#c8302a', k: '#fbf8ee', bg: '#f2c430', hi: '#ffffff' },
    { f: ['#ff8acb', '#d8409a', '#6e1a70'], o: '#14121c', d: '#1a6e5c', k: '#eefbf3', bg: '#9ad44a', hi: '#ffffff' },
    { f: ['#d2f560', '#5ab43a', '#1a6c3c'], o: '#0e1410', d: '#5a2a8e', k: '#faf2e0', bg: '#ee5e2a', hi: '#ffffff' },
    { f: ['#ffffff', '#c8d0d8', '#7e8ea0'], o: '#0e0e10', d: '#202026', k: '#e23a2a', bg: '#1c1c2c', hi: '#ffffff', chrome: true },
    { f: ['#ff5a3a', '#c8201a', '#5e0e0e'], o: '#f6f1e4', d: '#101012', k: '#101012', bg: '#f4c43a', hi: '#ffe0c0' },
    { f: ['#4a4a56', '#24242c', '#0a0a0e'], o: '#f6f1e4', d: '#c8302a', k: '#101010', bg: '#e8e0d0', hi: '#b8c0d0' },
    { f: ['#ffd23a', '#ff8a1a', '#c84a10'], o: '#1a1010', d: '#2a5a9a', k: '#f8f0e0', bg: '#5a2a8e', hi: '#ffffff' },
    // il Disgelo: verde acido, fucsia, arancione contro il grigio del cemento; il ghiaccio che si spacca
    { f: ['#e6ff5a', '#9ae620', '#2e9a1a'], o: '#120e1a', d: '#ff2a9a', k: '#ffffff', bg: '#2a1a4a', hi: '#ffffff' },
    { f: ['#ff9ae2', '#ff2aa8', '#a0105e'], o: '#101014', d: '#2ad8ff', k: '#fff8f0', bg: '#ff9a1a', hi: '#ffffff' },
    { f: ['#ffc06a', '#ff6a10', '#c03a08'], o: '#0e0e14', d: '#2a3a9a', k: '#f0f8ff', bg: '#9ad8ff', hi: '#ffffff' },
    { f: ['#f0fbff', '#8ad0f0', '#2a7ab0'], o: '#0a1420', d: '#ff5a2a', k: '#ffd23a', bg: '#ff7a3a', hi: '#ffffff' },
    { f: ['#c8fff0', '#3ae0c0', '#0a7a8a'], o: '#14101c', d: '#ffd23a', k: '#1a1420', bg: '#e8304a', hi: '#ffffff' },
    { f: ['#fff2a0', '#ffd23a', '#e09a0a'], o: '#2a0e3a', d: '#6a1aa0', k: '#f8f0ff', bg: '#1ab0a0', hi: '#ffffff' },
  ];
  // i colori della rotella di main.js (rosso, nero, bianco, blu, giallo, verde, rosa, arancio) → tavolozza
  // LE TAVOLOZZE DI OGGI (dalle 14 in poi): poche tinte piatte e il nero. L'argento e nero, i pastelli col contorno nero dei muri
  // pieni, il rosso e nero, il bianco e nero, i toni di terra, un fluo da solo, il blu pieno, il duotono. Quelle sopra (gli anni '80:
  // sfumature arcobaleno) restano per i lavori vecchi della storia dei muri.
  PAL.push(
    { f: ['#d6d9dd', '#c8ccd1', '#b4b9bf'], o: '#0c0c0e', d: '#0c0c0e', k: '#f2efe6', bg: '#1a1a1e', hi: '#ffffff', silver: true },
    { f: ['#a8dcec', '#9ad4e8', '#86c6de'], o: '#111114', d: '#2a3a7a', k: '#f4f1ea', bg: '#f0b8cc', hi: '#ffffff' },
    { f: ['#cdb6ea', '#bca2e0', '#a88ed4'], o: '#111114', d: '#2a2240', k: '#f4f1ea', bg: '#e8e0a8', hi: '#ffffff' },
    { f: ['#f4aec8', '#ee96b8', '#e27ea6'], o: '#111114', d: '#5a1a3a', k: '#ffffff', bg: '#a8dcec', hi: '#ffffff' },
    { f: ['#aeeacf', '#96dec0', '#7ed2b0'], o: '#111114', d: '#1a4a3a', k: '#f4f1ea', bg: '#f4aec8', hi: '#ffffff' },
    { f: ['#e2221b', '#d21c17', '#b51611'], o: '#0c0c0e', d: '#0c0c0e', k: '#f4f1ea', bg: '#f4f1ea', hi: '#ffffff' },
    { f: ['#f6f4ee', '#efece4', '#e4e0d6'], o: '#0c0c0e', d: '#0c0c0e', k: '#e2221b', bg: '#0c0c0e', hi: '#ffffff' },
    { f: ['#17171b', '#141418', '#101014'], o: '#f6f4ee', d: '#f6f4ee', k: '#17171b', bg: '#e2221b', hi: '#f6f4ee' },
    { f: ['#c8643a', '#b85a32', '#a04a28'], o: '#f0e8d8', d: '#3a2a1e', k: '#2a2018', bg: '#7a8a4a', hi: '#f0e8d8' },
    { f: ['#d8aa3a', '#c89c32', '#b0862a'], o: '#1e1a14', d: '#5a6a32', k: '#f0e8d8', bg: '#2a2a2a', hi: '#fff4d8' },
    { f: ['#ff7a1a', '#ff6c12', '#f05c0a'], o: '#0c0c0e', d: '#0c0c0e', k: '#f4f1ea', bg: '#cfd3d8', hi: '#ffffff' },
    { f: ['#c0ff3a', '#b0f22e', '#9ee024'], o: '#0c0c0e', d: '#3a2a6a', k: '#f4f1ea', bg: '#17171b', hi: '#ffffff' },
    { f: ['#2a3ad8', '#2434ca', '#1c2ab2'], o: '#f6f4ee', d: '#0c0c0e', k: '#0c0c0e', bg: '#f4aec8', hi: '#ffffff' },
    { f: ['#ff8a3a', '#ff8a3a', '#cdb6ea'], o: '#111114', d: '#2a2240', k: '#f4f1ea', bg: '#aeeacf', hi: '#ffffff' });
  // [graffiti4] LE TAVOLOZZE DEI MURI VERI (dalle foto di Roma e Bologna): tinte sporche e pastello, il contorno nero sottile, il 3D
  // di un colore che stacca, il colore delle macchie nel riempimento (acc), il riempimento preferito (fills)
  const REAL0 = PAL.length;
  PAL.push(
    { f: ['#f4b49a', '#e8957a', '#d27a5e'], o: '#141414', d: '#8ccbe6', k: '#f2efe8', bg: '#2e5a44', hi: '#fbf6ee', acc: '#e8743c', fills: ['macchie', 'macchie', 'sfumato'] },   // salmone, 3D celeste, nuvola verde coi puntini
    { f: ['#bccbdc', '#9ab0cc', '#7a90b4'], o: '#16161a', d: '#56628a', k: '#ece8de', bg: '#6a7aa0', hi: '#ffffff', acc: '#f0cf72', fills: ['strisce', 'strisce', 'macchie'] },   // grigio-azzurro, le strisce gialle
    { f: ['#f28a46', '#e45e2a', '#c42a20'], o: '#121212', d: '#121212', k: '#f4f0e6', bg: '#2a8ac8', hi: '#fff4e8', acc: '#f4f0e6', fills: ['split', 'split', 'sfumato'] },   // arancio e rosso, la riga bianca che cola
    { f: ['#f6ee66', '#e9e04c', '#b7d65a'], o: '#141414', d: '#141414', k: '#f4f4ec', bg: '#5aa84a', hi: '#ffffff', acc: '#ffffff', fills: ['macchie', 'sfumato', 'split'] },   // giallo e verde acido, il 3D nero
    { f: ['#93cfe2', '#6ab8d6', '#4a98be'], o: '#18263a', d: '#26385a', k: '#e8ecf0', bg: '#c87a96', hi: '#ffffff', acc: '#d88aa8', fills: ['scacchi', 'macchie', 'strisce'] },   // celeste e rosa, gli scacchi
    { f: ['#cde4f1', '#abd2e8', '#88b8d8'], o: '#1a1a2a', d: '#2a2a6a', k: '#f0f0f4', bg: '#d86a9a', hi: '#ffffff', acc: '#3050c8', fills: ['macchie', 'sfumato'] },   // azzurro chiaro coi segni blu
    { f: ['#202024', '#2a6ab8', '#3a8ad0'], o: '#f0f0ec', d: '#141414', k: '#141414', bg: '#5ad0c0', hi: '#ffffff', acc: '#f0f0ec', fills: ['split'] },   // nero sopra e blu sotto, la riga che cola
    { f: ['#e6e8ea', '#c6cace', '#9aa0a8'], o: '#141414', d: '#2a3a7a', k: '#141414', bg: '#e05a3a', hi: '#ffffff', acc: '#8a94a2', fills: ['sfumato', 'macchie'], silver: true },   // l'argento
    { f: ['#cdc1e2', '#b0a0d0', '#8a7ab0'], o: '#151518', d: '#e6dc6c', k: '#ffffff', bg: '#3a3a48', hi: '#ffffff', acc: '#f2a0b8', fills: ['macchie', 'sfumato', 'scacchi'] },   // lilla, 3D giallo
    { f: ['#cae8c2', '#a2d0a2', '#6aa878'], o: '#141414', d: '#3a5a3a', k: '#f4f0e0', bg: '#e0a85a', hi: '#ffffff', acc: '#f0e08a', fills: ['strisce', 'macchie'] },   // menta
    { f: ['#f2c466', '#e09a40', '#b86a2a'], o: '#1a1410', d: '#5a2a1a', k: '#f6eedc', bg: '#3a6a8a', hi: '#fff4d8', acc: '#c83a2a', fills: ['sfumato', 'split', 'macchie'] },   // ocra e mattone
    { f: ['#f2bccb', '#e29ab2', '#c87894'], o: '#141418', d: '#2a8a8a', k: '#f8f4f0', bg: '#3a4a5a', hi: '#ffffff', acc: '#ffffff', fills: ['macchie', 'scacchi'] },   // rosa antico, 3D petrolio
    { f: ['#4656bc', '#2e3e9c', '#1c2a78'], o: '#f2ece0', d: '#141414', k: '#141414', bg: '#e8a040', hi: '#d0e0ff', acc: '#7a8ae0', fills: ['sfumato', 'macchie'] },   // blu pieno col contorno chiaro
    { f: ['#f2f0ec', '#e2ded6', '#c8c4bc'], o: '#141414', d: '#c82a28', k: '#141414', bg: '#8ab8d0', hi: '#ffffff', acc: '#c82a28', fills: ['macchie', 'strisce'] },   // bianco sporco, 3D rosso
    { f: ['#f0d27a', '#d8b84a', '#a88a2a'], o: '#141414', d: '#3a2a6a', k: '#f0ece0', bg: '#7a5aa0', hi: '#fff8e0', acc: '#7a5aa0', fills: ['scacchi', 'macchie'] },   // senape e viola
    { f: ['#e86a5a', '#d04a3e', '#a02e28'], o: '#141414', d: '#f0e2c0', k: '#141414', bg: '#3a8a7a', hi: '#ffe8d8', acc: '#f6d0a0', fills: ['split', 'macchie'] });   // rosso mattone, 3D crema
  const REAL = Array.from({ length: PAL.length - REAL0 }, (_, i) => REAL0 + i);
  const MOD = REAL.concat(REAL, [14, 15, 16, 19, 20, 21, 26]);   // [graffiti4] di oggi: quasi tutte le tavolozze dei muri veri
  const COL2PAL = [REAL0 + 15, REAL0 + 6, REAL0 + 13, REAL0 + 12, REAL0 + 3, REAL0 + 9, REAL0 + 11, REAL0 + 2];   // [graffiti4] la rotella del giocatore: rosso, nero, bianco, blu, giallo, verde, rosa, arancio sulle tavolozze vere

  // ---------------- LE FAMIGLIE DI LETTERE ----------------
  // adv: passo fra le lettere (sotto .7 si accavallano); lw: spessore del riempimento (frazione dell'altezza); d3: profondità del 3D
  // fat: lettere grasse fuse in un blocco; ink: nero pieno e contorno bianco (le throwie); doodles: luci, occhi, spirali, crocette dentro le lettere
  // spikes: punte affilate a ogni estremità; swash: lo svolazzo del corsivo sotto la parola; hard: l'ombra netta lunga invece del 3D sfumato
  const FAM = {
    block: { nome: 'block', adv: .84, skew: 0, bounce: 0, rot: .03, wob: .006, scale: .05, ext: .04, lw: .34, join: 'miter', cap: 'square', d3: .62, arrows: 0, links: 0 , sh: { flare: .05, bh: .25, con: .2, cap: 'square', sharp: true } },
    heavy: { nome: 'block pesante', adv: .8, skew: .06, bounce: .02, rot: .04, wob: .004, scale: .06, ext: 0, lw: .46, join: 'miter', cap: 'square', d3: 1, arrows: 0, links: 0, hard: true , sh: { flare: 0, bh: .35, con: .15, cap: 'square', sharp: true } },
    bubble: { nome: 'bubble', adv: .58, skew: .05, bounce: .07, rot: .14, wob: .02, scale: .14, ext: 0, lw: .48, join: 'round', cap: 'round', d3: .3, arrows: 0, links: 0, fat: true, doodles: true },
    fat: { nome: 'bubble grasso', adv: .52, skew: .06, bounce: .09, rot: .18, wob: .015, scale: .2, ext: 0, lw: .56, join: 'round', cap: 'round', d3: .35, arrows: 0, links: 0, fat: true, doodles: true, stars: true },
    throwie: { nome: 'throwie', adv: .55, skew: .04, bounce: .09, rot: .16, wob: .015, scale: .2, ext: 0, lw: .54, join: 'round', cap: 'round', d3: .1, arrows: 0, links: 0, fat: true, ink: true, doodles: true },
    semi: { nome: 'semi-wild', adv: .74, skew: .14, bounce: .05, rot: .12, wob: .025, scale: .14, ext: .32, lw: .36, join: 'miter', cap: 'square', d3: .5, arrows: 2, links: 1 , sh: { flare: .4, bh: .2, con: .3, cap: 'flare', sharp: true } },
    wild: { nome: 'wildstyle', adv: .64, skew: .22, bounce: .1, rot: .32, wob: .04, scale: .3, ext: .62, lw: .32, join: 'miter', cap: 'square', d3: .55, arrows: 4, links: 3 , sh: { flare: .5, bh: .15, con: .35, cap: 'point', sharp: true } },
    spiky: { nome: 'a spine', adv: .7, skew: .14, bounce: .08, rot: .24, wob: .02, scale: .26, ext: .5, lw: .32, join: 'miter', cap: 'butt', d3: .4, arrows: 0, links: 1, spikes: true , sh: { flare: -.45, bh: .1, con: .45, cap: 'point', sharp: true } },
    script: { nome: 'corsivo', adv: .6, skew: .38, bounce: .05, rot: .06, wob: .01, scale: .1, ext: .2, lw: .3, join: 'round', cap: 'round', d3: .32, arrows: 0, links: 0, nibK: .6, swash: true , sh: { flare: -.3, bh: 0, con: .45, cap: 'point', sharp: false, smooth: true } },
    chrome: { nome: 'chrome', adv: .62, skew: .08, bounce: .05, rot: .1, wob: .015, scale: .1, ext: .06, lw: .4, join: 'round', cap: 'round', d3: .25, arrows: 0, links: 0, chrome: true, fat: true },
  };
  // fill-in: riempimento piatto, contorno nero spesso, niente 3D (i pezzi veloci dei muri pieni); contorno: solo la linea, dentro il muro
  FAM.piatto = { nome: 'fill-in', adv: .86, skew: .04, bounce: .02, rot: .04, wob: 0, scale: .05, ext: 0, lw: .38, join: 'miter', cap: 'square', d3: 0, arrows: 0, links: 0, flat: true, sh: { flare: 0, bh: .12, con: .12, cap: 'square', sharp: true } };
  FAM.contorno = { nome: 'solo contorno', adv: .84, skew: .06, bounce: .03, rot: .05, wob: 0, scale: .06, ext: .1, lw: .4, join: 'miter', cap: 'square', d3: 0, arrows: 0, links: 0, flat: true, hollow: true, sh: { flare: .05, bh: .1, con: .15, cap: 'square', sharp: true } };
  FAM.astratto = { nome: 'astratto', adv: .84, skew: .06, bounce: .03, rot: .06, wob: 0, scale: .08, ext: .05, lw: .4, join: 'miter', cap: 'square', d3: .3, arrows: 0, links: 0, flat: true, cuts: true, sh: { flare: 0, bh: .15, con: .2, cap: 'square', sharp: true } };
  // [graffiti3] il 3D style: niente contorno, solo volumi: la faccia sfumata e il blocco profondo con le sue ombre (lo stile di DAIM)
  FAM.tridi = { nome: '3D', adv: .84, skew: .1, bounce: .03, rot: .05, wob: 0, scale: .06, ext: 0, lw: .4, join: 'miter', cap: 'square', d3: 1.6, arrows: 0, links: 0, solid: true, sh: { flare: 0, bh: .2, con: .2, cap: 'square', sharp: true } };
  const FLATS = ['#9ad8e8', '#e86a9a', '#d8201a', '#b48ad8', '#f2d23a', '#f2efe6', '#5ac8a0', '#ff8a3a', '#cfd3d8'];
  const THROW_FAMS = ['throwie', 'throwie', 'chrome', 'chrome', 'fat', 'bubble'];
  const FAMS = Object.keys(FAM);
  // le famiglie di oggi, coi loro pesi (il wildstyle con le frecce e il bubble arcobaleno sono rari)
  const MODFAMS = ['piatto', 'piatto', 'piatto', 'contorno', 'contorno', 'block', 'block', 'heavy', 'semi', 'semi', 'script', 'astratto', 'astratto', 'astratto', 'bubble', 'wild', 'spiky', 'tridi', 'wild'];   // [graffiti3] il 3D e un po' più wildstyle
  const FILLS = ['flat', 'flat', 'due', 'due', 'fade', 'fade', 'diag', 'split', 'bolle', 'crepe', 'fiamme', 'scacchi', 'stelle'];
  const BGS = ['nuvola', 'sole', 'radici', 'skyline', 'spruzzi', 'ghiaccio', 'ovale', 'scacchi', 'esplosione', 'splat'];
  const BADGES = ['ovale', 'ovale', 'scacchi', 'esplosione', 'splat', 'nuvola', 'spruzzi', 'ghiaccio'];
  const CHARS = ['bboy', 'skater', 'sole', 'banchiere', 'grigio', 'boombox'];
  const WORDS = ['DISGELO', 'SOLE', 'RADICI', 'RESPIRA', 'LIBERI', 'PEDALA', 'CALDO', 'VAPORE'];
  const SLOGANS = ['IL GHIACCIO SI SPACCA', 'NO ALLE RATE', 'PEDALA E RESPIRA', 'SOLE PER TUTTI', 'LA STRADA E NOSTRA', 'GRIGI GO HOME', 'LAVORA CONSUMA PAGA? NO',
    'RADICI SOTTO L\'ASFALTO', 'IL DISGELO E QUI', 'PIU BICI MENO RATE', 'NIENTE MARTIRI SOLO COLORI', 'IL VAPORE E DI TUTTI'];
  const SIGNS = ['caldo', 'tombino', 'rampa', 'occhio', 'serra'];
  const SIGN_TXT = { caldo: 'una presa calda (vapore, si sta al caldo)', tombino: 'un tombino aperto (per sparire)', rampa: 'una rampa pulita (per lo skate)', occhio: 'qui passano i Grigi', serra: 'una serra vicina' };
  const YEARS = ["'86", "'87", "'88", '86', '87'];
  // le scelte di un lavoro (se non le ha già): dal seme, così si ridisegna sempre uguale. q: la mano (0 toy … 1 king)
  function choose(w) {
    const r = mulberry((w.seed || 1) ^ 0x5bd1e995), throwUp = w.style === 'throw', wild = w.style === 'burner' || w.style === 'wholecar';
    const P = PAL[(w.pal || 0) % PAL.length], q = w.q != null ? w.q : .7;
    const fam = w.fam && FAM[w.fam] ? (throwUp && !THROW_FAMS.includes(w.fam) ? pickR(r, THROW_FAMS) : w.fam) : throwUp ? (P.chrome ? 'chrome' : pickR(r, THROW_FAMS)) : wild ? pickR(r, ['wild', 'wild', 'semi', 'spiky', 'heavy']) : pickR(r, FAMS);
    const fillk = w.fillk || (FAM[fam].chrome || P.chrome ? 'chrome' : throwUp || q < .3 ? pickR(r, ['fade', 'diag']) : pickR(r, FILLS));
    const bgk = w.bgk !== undefined ? w.bgk : (w.style === 'wholecar' ? pickR(r, ['sole', 'radici', 'skyline', 'skyline']) : w.style === 'burner' ? pickR(r, ['sole', 'radici', 'skyline', 'esplosione', 'ovale']) : throwUp ? (r() < .35 ? pickR(r, ['ovale', 'splat', 'esplosione']) : null) : pickR(r, BADGES));
    const chr = w.chr !== undefined ? w.chr : (wild && q > .75 && r() < .35 ? pickR(r, CHARS) : null);   // [writer] il personaggio: raro, solo da chi sa farlo
    return { fam, fillk, bgk, chr, q, yr: w.yr !== undefined ? w.yr : (r() < .12 ? pickR(r, YEARS) : ''), slogan: w.slogan !== undefined ? w.slogan : (wild && q > .4 || r() < .2 ? pickR(r, SLOGANS) : null) };
  }
  // IL BOZZETTO: un writer pensa il suo pezzo. dna = { fam, pals, chars, pol (quanto è politico), skill }; tutto il resto lo decide il caso
  function conceive(o) {
    const d = o.dna || {}, seed = o.seed || Math.floor(Math.random() * 1e9), r = mulberry(seed ^ 0x2545f491), style = o.style || 'pezzo';
    const wild = style === 'burner' || style === 'wholecar', throwUp = style === 'throw';
    const q = clamp((d.skill != null ? d.skill : .5) + (r() - .5) * .18, .05, 1);
    let fam = r() < .7 && d.fam ? d.fam : pickR(r, MODFAMS); if (throwUp && !THROW_FAMS.includes(fam)) fam = pickR(r, THROW_FAMS);
    if (q < .3 && (fam === 'wild' || fam === 'spiky' || fam === 'script')) fam = pickR(r, ['semi', 'bubble', 'block', 'piatto']);   // un toy non sa fare il wildstyle
    const pals = d.pals && d.pals.length ? d.pals : [Math.floor(r() * PAL.length)];
    const pol = d.pol != null ? d.pol : .4;
    const sk = { style, aka: o.aka, crew: o.crew, seed, q, fam, cons: d.cons || consOf(seed), pal: pickR(r, pals) % PAL.length,
      words: wild && r() < pol * .5 ? pickR(r, WORDS) : null,
      slogan: !throwUp && style !== 'tag' && r() < pol * (wild ? .5 : .25) ? pickR(r, SLOGANS) : null,
      chr: null,
      fillk: FAM[fam].chrome ? 'chrome' : pickR(r, ['flat', 'flat', 'bande', 'bande', 'bande', 'due', r() < .1 ? pickR(r, FILLS) : 'flat']),
      bgk: style === 'wholecar' ? pickR(r, ['rullo', 'rullo', 'skyline']) : throwUp ? (r() < .3 ? 'rullo' : null) : r() < .45 ? 'rullo' : r() < .08 ? pickR(r, BADGES) : null,
      yr: r() < .12 ? pickR(r, YEARS) : '', by: o.by };
    if (FAM[fam].flat && r() < .75) sk.bgk = null;
    return sk;
  }
  // LA COSTRUZIONE: come un writer disegna le lettere dei pezzi. Non disordine: scelte. Larghezza, peso, inclinazione, contrasto
  // (verticali e orizzontali diversi), i terminali, la base pesante, i gradini della linea di base, le barre che sporgono, la
  // spaziatura, lo spessore della linea. Ogni writer ha la sua; due writer non costruiscono mai uguale.
  function consOf(seed) {
    const r = mulberry((seed || 1) ^ 0x68e31da4);
    return { wave: r() < .5 ? .03 + r() * .05 : 0, link: r() < .35, width: .6 + r() * .32, weight: .2 + r() * .12, slant: r() < .3 ? 0 : .08 + r() * .2, con: r() * .45, bh: r() < .4 ? r() * .35 : 0,
      term: pickR(r, ['cut', 'cut', 'flare', 'round', 'spike']), step: r() < .25 ? .04 + r() * .06 : 0, bars: r() < .35 ? .25 + r() * .3 : 0, gap: .05 + r() * .12, line: .035 + r() * .025 };
  }
  // il DNA di un writer a caso (gli NPC: dal loro numero)
  function dnaOf(seed, skill, crewCol) {
    const r = mulberry(seed ^ 0x9e3779b9), pals = [crewCol != null ? (crewCol >= 14 ? crewCol : MOD[(crewCol * 5 + 3) % MOD.length]) : pickR(r, MOD)];
    while (pals.length < 3) { const k = pickR(r, MOD); if (!pals.includes(k)) pals.push(k); }
    return { cons: consOf(seed), fam: pickR(r, MODFAMS), pals, chars: [pickR(r, CHARS), pickR(r, CHARS)], pol: r(), skill: skill != null ? skill : .3 + r() * .6 };
  }

  // ---------------- LE LETTERE ----------------
  // ogni tratto in pixel, con la mano del writer (inclinazione, rimbalzo, lettere che si accavallano, punte allungate)
  function letters(text, o, r) {
    const F = o.font || FONT(), s = DEACC(text), out = [], h = o.h, adv = h * (o.adv || .78);
    let x = 0;
    [...s].forEach((ch, i) => {
      const g = F[ch]; if (!g) { x += adv * .5; return; }
      const bounce = (o.bounce || 0) * h * (i % 2 ? 1 : -1) * (.6 + r() * .6), rot = (o.rot || 0) * (r() - .5), sc = 1 + (o.scale || 0) * (r() - .5);
      const cxL = x + .3 * h, cyL = h / 2, cr = Math.cos(rot), sr = Math.sin(rot);
      g.forEach(tr => {
        let pts = tr.map(([u, v]) => { let px = (u - .3) * h * sc, py = -(v - .5) * h * sc; px += py * -(o.skew || 0); const qx = px * cr - py * sr, qy = px * sr + py * cr; return [cxL + qx + (r() - .5) * (o.wob || 0) * h, cyL + qy + bounce + (r() - .5) * (o.wob || 0) * h]; });
        if (o.ext && pts.length > 1 && r() < o.ext) {   // la punta che esce (wildstyle)
          const a = pts[pts.length - 1], b = pts[pts.length - 2], dx = a[0] - b[0], dy = a[1] - b[1], l = hyp(dx, dy) || 1; pts = pts.concat([[a[0] + dx / l * h * .24, a[1] + dy / l * h * .24]]);
        }
        if (o.ext && pts.length > 1 && r() < o.ext * .5) {   // e quella che entra
          const a = pts[0], b = pts[1], dx = a[0] - b[0], dy = a[1] - b[1], l = hyp(dx, dy) || 1; pts = [[a[0] + dx / l * h * .18, a[1] + dy / l * h * .18]].concat(pts);
        }
        out.push({ pts, i });
      });
      x += adv * sc;
    });
    // i collegamenti del wildstyle: una lettera tira una linea dentro la successiva
    for (let k = 0; k < (o.links || 0); k++) {
      const ls = out.filter(t => t.pts.length > 1); if (ls.length < 3) break;
      const a = ls[Math.floor(r() * (ls.length - 1))], b = ls.find(t => t.i === a.i + 1); if (!b) continue;
      const p = a.pts[a.pts.length - 1], q = b.pts[Math.floor(b.pts.length / 2)], m = [(p[0] + q[0]) / 2, Math.min(p[1], q[1]) - h * .12];
      out.push({ pts: [p, m, q], i: a.i, link: true });
    }
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; out.forEach(t => t.pts.forEach(([a, b]) => { x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b); }));
    if (!out.length) { x0 = y0 = 0; x1 = y1 = 1; }
    return { strokes: out, box: [x0, y0, x1, y1] };
  }
  function fit(L, W, H, pad, stretch) {   // scala e sposta le lettere dentro W × H (margine pad); stretch: quanto si possono allargare
    const [x0, y0, x1, y1] = L.box, sy = Math.min((W - 2 * pad) / Math.max(1, x1 - x0), (H - 2 * pad) / Math.max(1, y1 - y0)), sx = Math.min(sy * (stretch || 1), (W - 2 * pad) / Math.max(1, x1 - x0));
    const ox = (W - (x1 - x0) * sx) / 2 - x0 * sx, oy = (H - (y1 - y0) * sy) / 2 - y0 * sy;
    L.strokes.forEach(t => { t.pts = t.pts.map(([a, b]) => [a * sx + ox, b * sy + oy]); }); L.box = [x0 * sx + ox, y0 * sy + oy, x1 * sx + ox, y1 * sy + oy]; L.s = sy; return L;
  }
  // [graffiti3] LE CURVE: l'alfabeto a tratti ha pochi punti per lettera (una C sono sei segmenti) e stroked così faceva i
  // triangoli nelle curve. Prima di ogni tratto si liscia (Chaikin) dove la linea gira piano; gli spigoli veri (sopra i 60°)
  // restano spigoli. Vale per tutto quello che passa da pass(): lettere, firme piccole, slogan, scritte.
  function smoothK(pts, passes) {
    let P = pts; if (!P || P.length < 3) return P;
    for (let it = 0; it < (passes || 2); it++) {
      const Q = [P[0]];
      for (let k = 1; k < P.length - 1; k++) {
        const a = P[k - 1], b = P[k], c = P[k + 1], u1 = [b[0] - a[0], b[1] - a[1]], u2 = [c[0] - b[0], c[1] - b[1]], turn = Math.abs(Math.atan2(u1[0] * u2[1] - u1[1] * u2[0], u1[0] * u2[0] + u1[1] * u2[1]));
        if (turn > 1.05 || (hyp(u1[0], u1[1]) + hyp(u2[0], u2[1])) < 1.5) Q.push(b); else Q.push([.75 * b[0] + .25 * a[0], .75 * b[1] + .25 * a[1]], [.75 * b[0] + .25 * c[0], .75 * b[1] + .25 * c[1]]);
      }
      Q.push(P[P.length - 1]); P = Q;
    }
    return P;
  }
  function path(x, pts) { const P = smoothK(pts, 2); x.beginPath(); P.forEach(([a, b], k) => k ? x.lineTo(a, b) : x.moveTo(a, b)); }
  // un passaggio: tutte le lettere spesse w, di quel colore, spostate di (dx, dy)
  function pass(x, L, w, col, dx, dy, join, cap) {
    x.save(); x.translate(dx || 0, dy || 0); x.lineJoin = join || 'round'; x.lineCap = cap || 'round'; x.lineWidth = w; x.strokeStyle = col; x.miterLimit = 3;
    L.strokes.forEach(t => { if (t.pts.length === 1) { x.beginPath(); x.arc(t.pts[0][0], t.pts[0][1], w / 2, 0, 7); x.fillStyle = col; x.fill(); return; } path(x, t.pts); x.stroke(); });
    (L.arrows || []).forEach(a => { x.beginPath(); a.forEach(([p, q], k) => k ? x.lineTo(p, q) : x.moveTo(p, q)); x.closePath(); x.fillStyle = col; x.fill(); if (w > L.w0) { x.lineWidth = w - L.w0; x.stroke(); x.lineWidth = w; } });
    x.restore();
  }
  // le frecce: dalle punte di qualche tratto, triangoli che continuano la linea
  function arrows(L, r, n, w) {
    L.arrows = []; L.w0 = w; const ends = [];
    L.strokes.forEach(t => { if (t.pts.length < 2 || t.link) return; const a = t.pts[t.pts.length - 1], b = t.pts[t.pts.length - 2]; ends.push([a, b]); });
    for (let k = 0; k < n && ends.length; k++) {
      const [a, b] = ends.splice(Math.floor(r() * ends.length), 1)[0], dx = a[0] - b[0], dy = a[1] - b[1], l = hyp(dx, dy) || 1, ux = dx / l, uy = dy / l, s = w * (1.1 + r() * .4);
      const tip = [a[0] + ux * s * 1.7, a[1] + uy * s * 1.7], l1 = [a[0] - uy * s, a[1] + ux * s], l2 = [a[0] + uy * s, a[1] - ux * s];
      L.arrows.push([l1, tip, l2]);
    }
  }
  // le spine: a ogni estremità un triangolo lungo e stretto che continua il tratto (lettere taglienti)
  function spikes(L, r, w) {
    L.arrows = L.arrows || []; L.w0 = w;
    L.strokes.forEach(t => { if (t.pts.length < 2 || t.link || t.swash) return; [[t.pts.length - 1, t.pts.length - 2], [0, 1]].forEach(([i, j], e) => { if (r() < (e ? .8 : .55)) return; const a = t.pts[i], b = t.pts[j], dx = a[0] - b[0], dy = a[1] - b[1], l = hyp(dx, dy) || 1, ux = dx / l, uy = dy / l, s = w * .48, len = w * (1.2 + r() * .6);
      L.arrows.push([[a[0] - uy * s, a[1] + ux * s], [a[0] + ux * len, a[1] + uy * len], [a[0] + uy * s, a[1] - ux * s]]); }); });
  }
  // lo svolazzo del corsivo: dall'ultima lettera torna indietro sotto la parola e finisce a punta
  function swash(L, r) {
    const [x0, y0, x1, y1] = L.box, last = Math.max(...L.strokes.map(t => t.i)), h = y1 - y0;
    L.strokes.push({ i: last, swash: true, pts: [[x1 - h * .1, y1 - h * .15], [x1 + h * .1, y1 + h * .12], [(x0 + x1) * .5, y1 + h * .2], [x0 + h * .1, y1 + h * .05], [x0 - h * .15, y1 - h * .12]] });
    let a0 = 1e9, b0 = 1e9, a1 = -1e9, b1 = -1e9; L.strokes.forEach(t => t.pts.forEach(([a, b]) => { a0 = Math.min(a0, a); b0 = Math.min(b0, b); a1 = Math.max(a1, a); b1 = Math.max(b1, b); })); L.box = [a0, b0, a1, b1];
  }
  // dentro le lettere grasse: la luce (un arco e un puntino), e a volte gli occhi, la spirale, la crocetta
  function doodles(x, G0, lw, r, col, ink, stars, eyes) {
    const pts = []; G0.forEach(t => t.pts.forEach(q => pts.push(q))); if (!pts.length) return; pts.sort((a, b) => a[1] - b[1]);
    x.save(); x.strokeStyle = col; x.fillStyle = col; x.lineCap = 'round';
    const top = pts[Math.floor(r() * Math.min(pts.length, 3))], cx = top[0] - lw * .18, cy = top[1] - lw * .1;
    x.lineWidth = Math.max(1.5, lw * .1); x.beginPath(); x.arc(cx + lw * .12, cy + lw * .2, lw * .26, PI * 1.05, PI * 1.55); x.stroke();
    x.beginPath(); x.arc(cx + lw * .3, cy - lw * .02, lw * .055, 0, 7); x.fill();
    const mid = pts[Math.floor(pts.length * (.4 + r() * .3))], k = r();
    if (eyes) {   // la faccia: due occhi da cartone
      for (const s of [-1, 1]) { x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(mid[0] + s * lw * .2, mid[1], lw * .17, lw * .22, 0, 0, 7); x.fill(); x.strokeStyle = '#101012'; x.lineWidth = Math.max(1, lw * .04); x.stroke(); x.fillStyle = '#101012'; x.beginPath(); x.arc(mid[0] + s * lw * .2 + lw * .05, mid[1] + lw * .05, lw * .08, 0, 7); x.fill(); }
    } else if (k < .25 && ink) { x.lineWidth = Math.max(1.2, lw * .06); x.beginPath(); for (let a = 0; a < PI * 5; a += .3) { const rr = lw * .03 * a; x.lineTo(mid[0] + Math.cos(a) * rr, mid[1] + Math.sin(a) * rr); } x.stroke(); }   // la spirale
    else if (k < .45 && ink) { x.lineWidth = Math.max(1.2, lw * .07); x.beginPath(); x.moveTo(mid[0] - lw * .16, mid[1]); x.lineTo(mid[0] + lw * .16, mid[1]); x.moveTo(mid[0], mid[1] - lw * .16); x.lineTo(mid[0], mid[1] + lw * .16); x.stroke(); }   // la crocetta
    else if (stars && k < .7) sparkle(x, mid[0], mid[1], lw * .22, col);
    x.restore();
  }
  function shade(hex, k) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; const f = v => clamp(Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k), 0, 255); return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join(''); }
  // [graffiti3] la luce: non più la stella a otto punte da clipart, ma due passate corte a croce (una lunga, una corta) col capo
  // tondo e un punto, come si fa con la bomboletta a un palmo dal muro
  function sparkle(x, cx, cy, s, col) { x.save(); x.strokeStyle = col; x.fillStyle = col; x.lineCap = 'round'; x.lineWidth = Math.max(1.2, s * .26); x.beginPath(); x.moveTo(cx, cy - s); x.lineTo(cx, cy + s * .9); x.moveTo(cx - s * .6, cy + s * .05); x.lineTo(cx + s * .6, cy - s * .05); x.stroke(); x.beginPath(); x.arc(cx + s * .05, cy - s * .02, Math.max(1, s * .22), 0, 7); x.fill(); x.restore(); }
  function drips(x, L, r, col, w, n, maxL) {
    x.save(); x.strokeStyle = col; x.fillStyle = col; x.lineCap = 'round';
    const pts = []; L.strokes.forEach(t => t.pts.forEach(q => pts.push(q))); pts.sort((a, b) => b[1] - a[1]);
    for (let k = 0; k < n && pts.length; k++) { const q = pts[Math.floor(r() * Math.min(pts.length, 12 + k * 3))], l = maxL * (.3 + r() * .7); x.lineWidth = w * (.35 + r() * .3); x.beginPath(); x.moveTo(q[0], q[1]); x.lineTo(q[0] + (r() - .5) * 1.5, q[1] + l); x.stroke(); x.beginPath(); x.arc(q[0], q[1] + l, x.lineWidth * .7, 0, 7); x.fill(); }
    x.restore();
  }
  function smallTag(x, text, cx, cy, h, col, r, maxW, thick) {   // la scritta piccola (crew, anno, slogan, dediche)
    const L = letters(text, { h, adv: .7, skew: .3, wob: .05, bounce: .04 }, r); let [x0, y0, x1, y1] = L.box;
    const k = maxW && x1 - x0 > maxW ? maxW / (x1 - x0) : 1;
    L.strokes.forEach(t => { t.pts = t.pts.map(([a, b]) => [(a - (x0 + x1) / 2) * k + cx, (b - (y0 + y1) / 2) * k + cy]); }); L.box = [0, 0, 0, 0];
    pass(x, L, Math.max(1.2, h * .11 * k) * (thick || 1), col, 0, 0);
  }

  // ---------------- I RIEMPIMENTI ----------------
  // si dipinge su FILL (già pieno delle lettere): source-atop, quindi solo dentro le lettere
  function fillPattern(fx, kind, P, box, lw, Wp, Hp, r) {
    const [bx0, by0, bx1, by1] = box, T = by0 - lw / 2, Bm = by1 + lw / 2;
    fx.save(); fx.globalCompositeOperation = 'source-atop';
    const vgrad = (a, b, c) => { const g = fx.createLinearGradient(0, T, 0, Bm); g.addColorStop(0, a); g.addColorStop(.55, b); g.addColorStop(1, c); return g; };
    if (kind === 'flat') { fx.fillStyle = P.f[1]; fx.fillRect(0, 0, Wp, Hp); fx.restore(); return; }
    if (kind === 'bande') {   // la sfumatura a bande nette: chiaro in alto, scuro in basso, i tagli appena curvi, un filo di luce sul taglio
      const n = r() < .5 ? 2 : 3, cols = n === 2 ? [shade(P.f[1], .28), shade(P.f[1], -.12)] : [shade(P.f[1], .32), P.f[1], shade(P.f[1], -.24)], hh = (by1 - by0 + lw) / n, bend = (r() - .5) * lw * .5;
      fx.fillStyle = cols[0]; fx.fillRect(0, 0, Wp, Hp);
      for (let k = 1; k < n; k++) { const y0 = by0 - lw / 2 + hh * k; fx.fillStyle = cols[k]; fx.beginPath(); fx.moveTo(0, y0 + bend); fx.quadraticCurveTo(Wp / 2, y0 - bend, Wp, y0 + bend); fx.lineTo(Wp, Hp); fx.lineTo(0, Hp); fx.fill(); fx.strokeStyle = 'rgba(255,255,255,.55)'; fx.lineWidth = Math.max(1, lw * .04); fx.beginPath(); fx.moveTo(0, y0 + bend); fx.quadraticCurveTo(Wp / 2, y0 - bend, Wp, y0 + bend); fx.stroke(); }
      fx.restore(); return;
    }
    if (kind === 'due') { fx.fillStyle = P.f[0]; fx.fillRect(0, 0, Wp, Hp); fx.fillStyle = P.f[1]; fx.beginPath(); const yy = by0 + (by1 - by0) * (.45 + r() * .2); fx.moveTo(0, yy); for (let xx = 0; xx <= Wp; xx += lw * .4) fx.lineTo(xx, yy + Math.sin(xx / lw * 2.2) * lw * .12); fx.lineTo(Wp, Hp); fx.lineTo(0, Hp); fx.fill(); fx.restore(); return; }
    if (kind === 'chrome') {   // il cromato: cielo chiaro in alto, l'orizzonte scuro a metà, il riflesso del suolo sotto
      const g = fx.createLinearGradient(0, T, 0, Bm); g.addColorStop(0, '#ffffff'); g.addColorStop(.42, '#c4ccd6'); g.addColorStop(.5, '#4a5462'); g.addColorStop(.56, '#8a94a2'); g.addColorStop(1, '#e8ecf2');
      fx.fillStyle = g; fx.fillRect(0, 0, Wp, Hp);
      fx.strokeStyle = 'rgba(255,255,255,.75)'; fx.lineWidth = Math.max(1.5, lw * .06); for (let k = 0; k < 6; k++) { const xx = bx0 + r() * (bx1 - bx0); fx.beginPath(); fx.moveTo(xx, T); fx.lineTo(xx + lw * .5, Bm); fx.stroke(); }
    } else if (kind === 'diag') {
      const g = fx.createLinearGradient(bx0, T, bx1, Bm); g.addColorStop(0, P.f[0]); g.addColorStop(.5, P.f[1]); g.addColorStop(1, P.f[2]); fx.fillStyle = g; fx.fillRect(0, 0, Wp, Hp);
    } else {
      fx.fillStyle = vgrad(P.f[0], P.f[1], P.f[2]); fx.fillRect(0, 0, Wp, Hp);
    }
    if (kind === 'split') {   // le bande che tagliano il riempimento
      fx.strokeStyle = P.f[2]; fx.globalAlpha = .6; fx.lineWidth = Math.max(2, lw * .12);
      for (let yy = by0 + (by1 - by0) * .58; yy < by1 + lw; yy += lw * .9) { fx.beginPath(); for (let xx = bx0 - lw; xx < bx1 + lw; xx += lw * .5) fx.lineTo(xx, yy + ((xx / (lw * .5)) % 2 < 1 ? -lw * .12 : lw * .12)); fx.stroke(); }
      fx.globalAlpha = 1;
    } else if (kind === 'bolle') {
      for (let k = 0; k < 40; k++) { fx.fillStyle = k % 3 ? P.f[0] : P.hi; fx.globalAlpha = .55 + r() * .4; fx.beginPath(); fx.arc(bx0 + r() * (bx1 - bx0), T + r() * (Bm - T), lw * (.05 + r() * .14), 0, 7); fx.fill(); }
      fx.globalAlpha = 1;
    } else if (kind === 'crepe') {   // il ghiaccio che si spacca: crepe bianche che si ramificano
      fx.strokeStyle = 'rgba(255,255,255,.85)'; fx.lineCap = 'round';
      for (let k = 0; k < 9; k++) {
        let x = bx0 + r() * (bx1 - bx0), y = T + r() * (Bm - T), a = r() * PI * 2; fx.lineWidth = Math.max(1.2, lw * (.04 + r() * .04)); fx.beginPath(); fx.moveTo(x, y);
        for (let s = 0; s < 6; s++) { a += (r() - .5) * 1.4; x += Math.cos(a) * lw * .45; y += Math.sin(a) * lw * .45; fx.lineTo(x, y); if (r() < .35) { fx.moveTo(x, y); fx.lineTo(x + Math.cos(a + 1) * lw * .3, y + Math.sin(a + 1) * lw * .3); fx.moveTo(x, y); } }
        fx.stroke();
      }
    } else if (kind === 'fiamme') {   // le fiamme dal basso
      fx.fillStyle = P.f[2]; fx.fillRect(0, by0 + (by1 - by0) * .55, Wp, Hp);
      fx.fillStyle = P.f[0];
      for (let xx = bx0 - lw; xx < bx1 + lw; xx += lw * (.35 + r() * .3)) {
        const h0 = (by1 - by0) * (.25 + r() * .35), w0 = lw * (.25 + r() * .2), base = Bm;
        fx.beginPath(); fx.moveTo(xx - w0, base); fx.quadraticCurveTo(xx - w0 * .2, base - h0 * .6, xx + w0 * .3, base - h0); fx.quadraticCurveTo(xx + w0 * .2, base - h0 * .45, xx + w0, base); fx.closePath(); fx.fill();
      }
    } else if (kind === 'scacchi') {
      const s = Math.max(4, lw * .3); fx.fillStyle = P.f[2]; fx.globalAlpha = .75;
      for (let yy = by0 + (by1 - by0) * .6; yy < Bm; yy += s) for (let xx = bx0 - lw; xx < bx1 + lw; xx += s) if ((Math.floor(xx / s) + Math.floor(yy / s)) % 2) fx.fillRect(xx, yy, s, s);
      fx.globalAlpha = 1;
    } else if (kind === 'stelle') {
      for (let k = 0; k < 22; k++) sparkle(fx, bx0 + r() * (bx1 - bx0), T + r() * (Bm - T), lw * (.08 + r() * .14), k % 2 ? P.hi : P.f[0]);
    } else if (kind === 'fade' || kind === 'diag') {   // le passate di vernice si vedono
      fx.strokeStyle = 'rgba(255,255,255,.14)'; fx.lineWidth = lw * .16; for (let xx = bx0 - Hp; xx < bx1 + Hp; xx += lw * .5) { fx.beginPath(); fx.moveTo(xx, Bm); fx.lineTo(xx + Hp * .7, T); fx.stroke(); }
    }
    if (kind !== 'chrome') { fx.fillStyle = 'rgba(255,255,255,.9)'; for (let k = 0; k < 14; k++) { fx.beginPath(); fx.arc(bx0 + r() * (bx1 - bx0), by0 + r() * (by1 - by0) * .45, lw * (.03 + r() * .05), 0, 7); fx.fill(); } }
    fx.restore();
  }

  // ---------------- GLI SFONDI ----------------
  // [graffiti3] era «cloud» come la nuvola dei pezzi più sotto: la seconda vinceva e lo sfondo «nuvola» mandava in errore il lavoro
  function cloudBlobs(x, W, H, r, col, edge, k) {
    const blobs = [], n = 7 + Math.floor(r() * 5) + (k || 0);
    for (let i = 0; i < n; i++) blobs.push([W * (.1 + .8 * r()), H * (.25 + .5 * r()), H * (.22 + .2 * r())]);
    x.fillStyle = edge; blobs.forEach(([a, b, rr]) => { x.beginPath(); x.arc(a, b, rr + Math.max(2, H * .025), 0, 7); x.fill(); });
    x.fillStyle = col; blobs.forEach(([a, b, rr]) => { x.beginPath(); x.arc(a, b, rr, 0, 7); x.fill(); });
    x.fillStyle = 'rgba(255,255,255,.22)'; blobs.forEach(([a, b, rr]) => { x.beginPath(); x.arc(a - rr * .3, b - rr * .35, rr * .35, 0, 7); x.fill(); });
  }
  function shard(x, cx, cy, s, r, fill, edge) {   // una scheggia di ghiaccio
    x.beginPath(); const n = 4 + Math.floor(r() * 3); for (let k = 0; k < n; k++) { const a = k / n * PI * 2 + r() * .6, rr = s * (.5 + r() * .7); x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * .8); } x.closePath();
    x.fillStyle = fill; x.fill(); x.strokeStyle = edge; x.lineWidth = Math.max(1.5, s * .08); x.stroke();
  }
  function background(bg, kind, P, Wp, Hp, r, full) {
    if (full || kind === 'skyline' || kind === 'sole' || kind === 'radici') {   // le scene intere (whole car, burner)
      const g = bg.createLinearGradient(0, 0, 0, Hp); g.addColorStop(0, P.bg); g.addColorStop(1, P.d); bg.fillStyle = g;
      if (full) bg.fillRect(0, 0, Wp, Hp); else { bg.beginPath(); const rr = Hp * .18; bg.moveTo(rr, Hp * .06); bg.lineTo(Wp - rr, Hp * .04); bg.quadraticCurveTo(Wp - 2, Hp * .06, Wp - Hp * .04, rr); bg.lineTo(Wp - Hp * .02, Hp - rr); bg.quadraticCurveTo(Wp - 2, Hp - 2, Wp - rr, Hp - Hp * .05); bg.lineTo(rr, Hp - Hp * .03); bg.quadraticCurveTo(2, Hp - 2, Hp * .03, Hp - rr); bg.lineTo(Hp * .05, rr); bg.quadraticCurveTo(2, 2, rr, Hp * .06); bg.closePath(); bg.fill(); bg.strokeStyle = P.o; bg.lineWidth = Math.max(3, Hp * .025); bg.stroke(); bg.save(); bg.clip(); }
      if (kind === 'sole') {   // il sole che spacca il ghiaccio
        const cx = Wp * (.55 + r() * .3), cy = Hp * .42, R0 = Hp * .26;
        bg.fillStyle = P.f[0]; bg.globalAlpha = .55; for (let k = 0; k < 16; k++) { const a = k / 16 * PI * 2; bg.beginPath(); bg.moveTo(cx, cy); bg.lineTo(cx + Math.cos(a - .09) * Wp, cy + Math.sin(a - .09) * Wp); bg.lineTo(cx + Math.cos(a + .09) * Wp, cy + Math.sin(a + .09) * Wp); bg.closePath(); bg.fill(); } bg.globalAlpha = 1;
        bg.fillStyle = P.f[1]; bg.beginPath(); bg.arc(cx, cy, R0 * 1.15, 0, 7); bg.fill(); bg.fillStyle = P.f[0]; bg.beginPath(); bg.arc(cx, cy, R0, 0, 7); bg.fill();
        for (let xx = 0; xx < Wp; xx += Hp * (.18 + r() * .12)) shard(bg, xx, Hp * (.86 + r() * .1), Hp * (.12 + r() * .08), r, '#d8f2ff', '#5aa6d8');   // la lastra di ghiaccio che si spacca
        bg.strokeStyle = '#ffffff'; bg.lineWidth = Math.max(2, Hp * .012); for (let k = 0; k < 7; k++) { let x0 = r() * Wp, y0 = Hp * .8; bg.beginPath(); bg.moveTo(x0, y0); for (let s = 0; s < 4; s++) { x0 += (r() - .5) * Hp * .3; y0 += Hp * .05; bg.lineTo(x0, y0); } bg.stroke(); }
      } else if (kind === 'radici') {   // le radici che sollevano l'asfalto delle concessionarie
        for (let xx = -Hp * .2; xx < Wp; xx += Hp * (.35 + r() * .2)) { bg.save(); bg.translate(xx, Hp * .9); bg.rotate((r() - .5) * .5); bg.fillStyle = '#5a5a60'; bg.fillRect(0, -Hp * .1, Hp * .34, Hp * .16); bg.strokeStyle = '#2a2a2e'; bg.lineWidth = 2; bg.strokeRect(0, -Hp * .1, Hp * .34, Hp * .16); bg.fillStyle = '#f2f2e8'; bg.fillRect(Hp * .05, -Hp * .03, Hp * .1, Hp * .02); bg.restore(); }
        bg.lineCap = 'round';
        for (let k = 0; k < 6; k++) {
          let x0 = Wp * r(), y0 = Hp; bg.strokeStyle = k % 2 ? '#6a3a1a' : '#8a5a2a'; bg.lineWidth = Hp * (.03 + r() * .04); bg.beginPath(); bg.moveTo(x0, y0);
          for (let s = 0; s < 5; s++) { const nx = x0 + (r() - .5) * Hp * .5, ny = y0 - Hp * (.12 + r() * .1); bg.quadraticCurveTo((x0 + nx) / 2 + (r() - .5) * Hp * .2, (y0 + ny) / 2, nx, ny); x0 = nx; y0 = ny; } bg.stroke();
          bg.fillStyle = '#5ac83a'; for (let s = 0; s < 3; s++) { bg.beginPath(); bg.ellipse(x0 + (r() - .5) * Hp * .1, y0 + (r() - .5) * Hp * .1, Hp * .05, Hp * .025, r() * PI, 0, 7); bg.fill(); }
        }
      } else {   // lo skyline del porto: palazzoni, gru, la torre della miniera col fumo
        bg.fillStyle = 'rgba(0,0,0,.38)';
        for (let xx = 0; xx < Wp;) { const bw = Hp * (.12 + r() * .2), bh = Hp * (.15 + r() * .4); bg.fillRect(xx, Hp - bh, bw, bh); bg.fillStyle = 'rgba(255,230,120,.35)'; for (let wy = Hp - bh + Hp * .04; wy < Hp - Hp * .05; wy += Hp * .06) for (let wx = xx + Hp * .02; wx < xx + bw - Hp * .03; wx += Hp * .05) if (r() < .4) bg.fillRect(wx, wy, Hp * .02, Hp * .025); bg.fillStyle = 'rgba(0,0,0,.38)'; xx += bw + Hp * .03; }
        const gx = Wp * (.2 + r() * .6); bg.strokeStyle = 'rgba(0,0,0,.45)'; bg.lineWidth = Math.max(2, Hp * .015); bg.beginPath(); bg.moveTo(gx, Hp); bg.lineTo(gx, Hp * .25); bg.lineTo(gx + Hp * .5, Hp * .25); bg.moveTo(gx - Hp * .12, Hp * .25); bg.lineTo(gx, Hp * .25); bg.moveTo(gx + Hp * .4, Hp * .25); bg.lineTo(gx + Hp * .4, Hp * .45); bg.stroke();   // la gru
        const mx = Wp * (.05 + r() * .2); bg.fillStyle = 'rgba(0,0,0,.45)'; bg.fillRect(mx, Hp * .3, Hp * .08, Hp * .7); bg.fillStyle = 'rgba(220,220,220,.35)'; for (let k = 0; k < 5; k++) { bg.beginPath(); bg.arc(mx + Hp * (.06 + k * .07), Hp * (.25 - k * .04), Hp * (.06 + k * .02), 0, 7); bg.fill(); }   // la miniera che fuma
      }
      for (let k = 0; k < (full ? 30 : 12); k++) sparkle(bg, r() * Wp, r() * Hp * .6, Hp * (.015 + r() * .025), 'rgba(255,255,255,.85)');
      if (full === true) { const n = 10 + Math.floor(r() * 6); bg.save(); for (let k = 0; k < n; k++) { const a = Wp * (k + r() * .6) / n, b = Hp * (.92 + r() * .08), rr = Hp * (.07 + r() * .07); bg.fillStyle = P.o; bg.beginPath(); bg.arc(a, b, rr + 3, 0, 7); bg.fill(); bg.fillStyle = P.k; bg.beginPath(); bg.arc(a, b, rr, 0, 7); bg.fill(); } bg.restore(); } else bg.restore();
    } else if (kind === 'rullo') {   // il fondo a rullo: una o due campiture piatte, storte, coi bordi sfrangiati e le righe del rullo
      const n = r() < .5 ? 1 : 2;
      for (let k = 0; k < n; k++) { const col = k ? P.d : P.bg, mx = Wp * (.03 + r() * .06), my = Hp * (.06 + r() * .1), x0 = mx + (k ? Wp * (.2 + r() * .3) : 0), x1 = Wp - mx - (k ? 0 : Wp * r() * .1), y0 = my + (k ? Hp * .3 : 0), y1 = Hp - my, rot = (r() - .5) * .05;
        bg.save(); bg.translate(Wp / 2, Hp / 2); bg.rotate(rot); bg.translate(-Wp / 2, -Hp / 2); bg.fillStyle = col; bg.beginPath();
        const edge = (ax, ay, bx, by) => { const L = hyp(bx - ax, by - ay), n0 = Math.max(4, Math.floor(L / (Hp * .03))); for (let j = 0; j <= n0; j++) { const t = j / n0; bg.lineTo(ax + (bx - ax) * t + (r() - .5) * Hp * .02, ay + (by - ay) * t + (r() - .5) * Hp * .02); } };
        edge(x0, y0, x1, y0); edge(x1, y0, x1, y1); edge(x1, y1, x0, y1); edge(x0, y1, x0, y0); bg.closePath(); bg.fill();
        bg.save(); bg.clip(); bg.globalAlpha = .08; bg.strokeStyle = r() < .5 ? '#ffffff' : '#000000'; for (let yy = y0; yy < y1; yy += Hp * (.06 + r() * .05)) { bg.lineWidth = Hp * (.02 + r() * .04); bg.beginPath(); bg.moveTo(x0, yy); bg.lineTo(x1, yy + (r() - .5) * Hp * .05); bg.stroke(); } bg.restore(); bg.restore(); }
    } else if (kind === 'ovale') {   // il badge ovale, un po' storto, col suo bordo (e a volte un secondo ovale dietro)
      const rot = (r() - .5) * .14;
      if (r() < .5) { bg.fillStyle = P.d; bg.beginPath(); bg.ellipse(Wp / 2 + Hp * .06, Hp / 2 + Hp * .05, Wp * .49, Hp * .44, rot, 0, 7); bg.fill(); }
      bg.fillStyle = P.bg; bg.strokeStyle = P.o; bg.lineWidth = Math.max(3, Hp * .03); bg.beginPath(); bg.ellipse(Wp / 2, Hp / 2, Wp * .47, Hp * .4, rot, 0, 7); bg.fill(); bg.stroke();
      bg.strokeStyle = 'rgba(255,255,255,.5)'; bg.lineWidth = Math.max(2, Hp * .015); bg.beginPath(); bg.ellipse(Wp / 2, Hp / 2, Wp * .44, Hp * .36, rot, PI * 1.05, PI * 1.45); bg.stroke();
    } else if (kind === 'scacchi') {   // le strisce a scacchi sopra e sotto
      const s0 = Math.max(5, Hp * .07); bg.fillStyle = P.bg; bg.fillRect(Wp * .04, Hp * .2, Wp * .92, Hp * .6);
      for (const y0 of [Hp * .06, Hp * .8]) for (let yy = 0; yy < 2; yy++) for (let xx = 0; xx * s0 < Wp * .9; xx++) { bg.fillStyle = (xx + yy) % 2 ? P.o : P.k; bg.fillRect(Wp * .05 + xx * s0, y0 + yy * s0, s0, s0); }
    } else if (kind === 'esplosione') {   // l'esplosione a stella
      const cx = Wp / 2, cy = Hp / 2, n = 18 + Math.floor(r() * 8); bg.beginPath();
      for (let k = 0; k < n * 2; k++) { const a = k / (n * 2) * PI * 2, rr = k % 2 ? .62 : 1 + r() * .25; bg.lineTo(cx + Math.cos(a) * Wp * .48 * rr, cy + Math.sin(a) * Hp * .48 * rr); }
      bg.closePath(); bg.fillStyle = P.bg; bg.fill(); bg.strokeStyle = P.o; bg.lineWidth = Math.max(3, Hp * .025); bg.stroke();
      bg.save(); bg.clip(); bg.fillStyle = 'rgba(255,255,255,.18)'; for (let k = 0; k < 9; k++) { const a = k / 9 * PI * 2; bg.beginPath(); bg.moveTo(cx, cy); bg.lineTo(cx + Math.cos(a) * Wp, cy + Math.sin(a) * Wp); bg.lineTo(cx + Math.cos(a + .12) * Wp, cy + Math.sin(a + .12) * Wp); bg.closePath(); bg.fill(); } bg.restore();
    } else if (kind === 'splat') {   // lo schizzo di vernice con le colature
      const cx = Wp / 2, cy = Hp / 2; bg.fillStyle = P.bg;
      bg.beginPath(); for (let k = 0; k < 28; k++) { const a = k / 28 * PI * 2, rr = .8 + r() * .25; bg.lineTo(cx + Math.cos(a) * Wp * .42 * rr, cy + Math.sin(a) * Hp * .4 * rr); } bg.closePath(); bg.fill();
      for (let k = 0; k < 14; k++) { const a = r() * PI * 2, d = .5 + r() * .12; bg.beginPath(); bg.arc(cx + Math.cos(a) * Wp * d, cy + Math.sin(a) * Hp * d, Hp * (.02 + r() * .05), 0, 7); bg.fill(); }
      for (let k = 0; k < 6; k++) { const xx = Wp * (.25 + r() * .5), l = Hp * (.15 + r() * .3); bg.fillRect(xx, cy + Hp * .25, Hp * .035, l); bg.beginPath(); bg.arc(xx + Hp * .0175, cy + Hp * .25 + l, Hp * .03, 0, 7); bg.fill(); }
    } else if (kind === 'ghiaccio') {
      for (let k = 0; k < 8; k++) shard(bg, Wp * (.08 + r() * .84), Hp * (.25 + r() * .5), Hp * (.2 + r() * .14), r, '#cfefff', P.o);
    } else if (kind === 'spruzzi') {   // gli spruzzi e le colature: sfondo leggero
      for (let k = 0; k < 26; k++) { const a = Wp * r(), b = Hp * (.15 + r() * .7), rr = Hp * (.03 + r() * .09); bg.fillStyle = k % 3 ? P.bg : P.d; bg.globalAlpha = .8; bg.beginPath(); bg.arc(a, b, rr, 0, 7); bg.fill(); if (r() < .4) { bg.fillRect(a - rr * .15, b, rr * .3, rr * (1 + r() * 2)); } }
      bg.globalAlpha = 1;
    } else cloudBlobs(bg, Wp, Hp, r, P.bg, P.o, 0);
  }

  // ---------------- I PERSONAGGI ----------------
  function character(x, kind, cx, cy, s, P, r) {
    x.save(); x.lineJoin = 'round'; x.lineCap = 'round'; x.lineWidth = Math.max(2, s * .06); x.strokeStyle = P.o;
    const ell = (a, b, rx, ry, col, rot) => { x.fillStyle = col; x.beginPath(); x.ellipse(a, b, rx, ry, rot || 0, 0, 7); x.fill(); x.stroke(); };
    const shades = (y) => { x.fillStyle = '#101014'; x.fillRect(cx - s * .36, y, s * .72, s * .2); x.strokeRect(cx - s * .36, y, s * .72, s * .2); x.fillStyle = 'rgba(255,255,255,.7)'; x.fillRect(cx - s * .3, y + s * .03, s * .12, s * .05); };
    const grin = () => { x.fillStyle = '#ffffff'; x.beginPath(); x.moveTo(cx - s * .22, cy + s * .2); x.quadraticCurveTo(cx + s * .05, cy + s * .42, cx + s * .26, cy + s * .16); x.closePath(); x.fill(); x.stroke(); };
    if (kind === 'sole') {   // il sole con gli occhiali che ghigna
      x.fillStyle = P.f[1]; for (let k = 0; k < 12; k++) { const a = k / 12 * PI * 2; x.beginPath(); x.moveTo(cx + Math.cos(a - .18) * s * .5, cy + Math.sin(a - .18) * s * .5); x.lineTo(cx + Math.cos(a) * s * .82, cy + Math.sin(a) * s * .82); x.lineTo(cx + Math.cos(a + .18) * s * .5, cy + Math.sin(a + .18) * s * .5); x.closePath(); x.fill(); x.stroke(); }
      ell(cx, cy, s * .5, s * .5, P.f[0]); shades(cy - s * .12); grin();
    } else if (kind === 'banchiere') {   // il banchiere del Banco che si scioglie: cilindro, monocolo, sigaro, il sacco delle rate
      ell(cx, cy + s * .05, s * .4, s * .48, '#f0c8a8');
      x.fillStyle = '#1a1a1e'; x.fillRect(cx - s * .3, cy - s * .85, s * .6, s * .45); x.strokeRect(cx - s * .3, cy - s * .85, s * .6, s * .45); x.fillRect(cx - s * .46, cy - s * .44, s * .92, s * .08);
      x.fillStyle = '#c8302a'; x.fillRect(cx - s * .3, cy - s * .5, s * .6, s * .06);
      x.beginPath(); x.arc(cx + s * .14, cy - s * .05, s * .1, 0, 7); x.stroke(); x.beginPath(); x.moveTo(cx + s * .22, cy); x.lineTo(cx + s * .3, cy + s * .3); x.stroke();   // il monocolo
      x.fillStyle = '#101010'; x.beginPath(); x.arc(cx - s * .14, cy - s * .05, s * .04, 0, 7); x.fill();
      ell(cx, cy + s * .14, s * .1, s * .08, '#e09a8a');   // il naso
      x.fillStyle = '#6a3a1a'; x.fillRect(cx + s * .05, cy + s * .3, s * .4, s * .07); x.fillStyle = '#ff6a10'; x.fillRect(cx + s * .44, cy + s * .3, s * .05, s * .07);   // il sigaro
      x.fillStyle = 'rgba(140,200,240,.85)'; for (let k = 0; k < 5; k++) { const dx = (k - 2) * s * .16; x.beginPath(); x.moveTo(cx + dx - s * .05, cy + s * .48); x.quadraticCurveTo(cx + dx, cy + s * (.8 + r() * .3), cx + dx + s * .05, cy + s * .48); x.fill(); }   // si scioglie
      ell(cx - s * .6, cy + s * .5, s * .22, s * .25, '#c8a060'); x.fillStyle = P.o; x.font = `bold ${Math.round(s * .22)}px Arial`; x.textAlign = 'center'; x.fillText('L.', cx - s * .6, cy + s * .58);
    } else if (kind === 'grigio') {   // il Grigio della Celere: casco, visiera di plexiglas, naso da maiale, manganello
      ell(cx, cy, s * .44, s * .5, '#e8b48a');
      x.fillStyle = '#5a6068'; x.beginPath(); x.ellipse(cx, cy - s * .12, s * .52, s * .5, 0, PI, 0); x.fill(); x.stroke(); x.fillRect(cx - s * .52, cy - s * .14, s * 1.04, s * .08);
      x.fillStyle = 'rgba(180,220,255,.45)'; x.fillRect(cx - s * .44, cy - s * .08, s * .88, s * .4); x.strokeRect(cx - s * .44, cy - s * .08, s * .88, s * .4);
      ell(cx, cy + s * .14, s * .16, s * .11, '#f0a0a8'); x.fillStyle = '#5a2030'; x.beginPath(); x.arc(cx - s * .05, cy + s * .14, s * .03, 0, 7); x.arc(cx + s * .05, cy + s * .14, s * .03, 0, 7); x.fill();
      x.fillStyle = '#101010'; x.beginPath(); x.arc(cx - s * .17, cy + s * .02, s * .04, 0, 7); x.arc(cx + s * .17, cy + s * .02, s * .04, 0, 7); x.fill();
      x.fillStyle = '#2a2a2e'; x.save(); x.translate(cx + s * .55, cy + s * .2); x.rotate(-.6); x.fillRect(-s * .05, -s * .6, s * .1, s * .9); x.strokeRect(-s * .05, -s * .6, s * .1, s * .9); x.restore();
      x.fillStyle = P.f[1]; x.font = `bold ${Math.round(s * .16)}px Arial`; x.textAlign = 'center'; x.fillText('OINK', cx, cy + s * .72);
    } else if (kind === 'boombox') {
      x.fillStyle = '#2a2a30'; x.fillRect(cx - s * .7, cy - s * .35, s * 1.4, s * .8); x.strokeRect(cx - s * .7, cy - s * .35, s * 1.4, s * .8);
      x.fillStyle = '#c8c8d0'; x.fillRect(cx - s * .5, cy - s * .62, s, s * .08); x.strokeRect(cx - s * .5, cy - s * .62, s, s * .08);
      for (const sx of [-1, 1]) { ell(cx + sx * s * .42, cy + s * .08, s * .22, s * .22, '#101014'); ell(cx + sx * s * .42, cy + s * .08, s * .09, s * .09, P.f[1]); }
      x.fillStyle = '#e8e2d0'; x.fillRect(cx - s * .14, cy - s * .2, s * .28, s * .18); x.fillStyle = '#3a3a3e'; x.beginPath(); x.arc(cx - s * .06, cy - s * .11, s * .04, 0, 7); x.arc(cx + s * .06, cy - s * .11, s * .04, 0, 7); x.fill();
      x.fillStyle = P.hi; x.font = `bold ${Math.round(s * .4)}px Arial`; x.textAlign = 'center'; x.fillText('♪', cx - s * .7, cy - s * .55); x.fillText('♫', cx + s * .75, cy - s * .7);
    } else if (kind === 'skater') {   // lo skater: berretto oversize, sciarpa fluo, la tavola
      x.save(); x.translate(cx + s * .35, cy + s * .55); x.rotate(-.5); x.fillStyle = P.f[1]; x.fillRect(-s * .7, -s * .09, s * 1.4, s * .18); x.strokeRect(-s * .7, -s * .09, s * 1.4, s * .18); x.fillStyle = '#f0f0f0'; for (const wx of [-.45, .45]) { x.beginPath(); x.arc(wx * s, s * .16, s * .07, 0, 7); x.fill(); x.stroke(); } x.restore();
      ell(cx, cy, s * .42, s * .5, '#c89a72');
      x.fillStyle = P.d; x.beginPath(); x.moveTo(cx - s * .46, cy - s * .1); x.quadraticCurveTo(cx - s * .5, cy - s * .9, cx + s * .1, cy - s * .78); x.quadraticCurveTo(cx + s * .6, cy - s * .6, cx + s * .46, cy - s * .1); x.closePath(); x.fill(); x.stroke();   // il berretto oversize
      x.fillStyle = P.f[0]; x.fillRect(cx - s * .48, cy - s * .16, s * .96, s * .1);
      x.fillStyle = '#101014'; x.beginPath(); x.arc(cx - s * .15, cy + s * .03, s * .05, 0, 7); x.arc(cx + s * .15, cy + s * .03, s * .05, 0, 7); x.fill(); grin();
      x.fillStyle = '#c8ff3a'; x.fillRect(cx - s * .5, cy + s * .45, s, s * .14); x.strokeRect(cx - s * .5, cy + s * .45, s, s * .14); x.fillRect(cx + s * .3, cy + s * .55, s * .14, s * .4);   // la sciarpa fluo
    } else {   // il b-boy col cappellino all'indietro, gli occhiali, il ghigno
      ell(cx, cy, s * .42, s * .5, '#e8b48a');
      x.fillStyle = P.f[2]; x.beginPath(); x.ellipse(cx, cy - s * .3, s * .46, s * .3, 0, PI, 0); x.fill(); x.stroke();
      x.beginPath(); x.moveTo(cx + s * .3, cy - s * .3); x.lineTo(cx + s * .78, cy - s * .2); x.lineTo(cx + s * .32, cy - s * .12); x.closePath(); x.fill(); x.stroke();
      shades(cy - s * .08); grin(); ell(cx, cy + s * .62, s * .5, s * .16, P.f[0]);
    }
    x.restore();
  }
  // ---------------- I SEGNI (le tag come mappe) ----------------
  function sign(x, kind, cx, cy, s, col) {
    x.save(); x.strokeStyle = col; x.fillStyle = col; x.lineWidth = Math.max(1.5, s * .12); x.lineCap = 'round'; x.lineJoin = 'round';
    if (kind === 'caldo') { x.strokeRect(cx - s * .4, cy, s * .8, s * .4); for (let k = -1; k <= 1; k++) { x.beginPath(); x.moveTo(cx + k * s * .25, cy - s * .05); x.bezierCurveTo(cx + k * s * .25 - s * .12, cy - s * .25, cx + k * s * .25 + s * .12, cy - s * .4, cx + k * s * .25, cy - s * .6); x.stroke(); } }
    else if (kind === 'tombino') { x.beginPath(); x.arc(cx, cy, s * .4, 0, 7); x.stroke(); x.beginPath(); x.moveTo(cx - s * .28, cy); x.lineTo(cx + s * .28, cy); x.moveTo(cx, cy - s * .28); x.lineTo(cx, cy + s * .28); x.stroke(); x.beginPath(); x.moveTo(cx + s * .6, cy - s * .3); x.lineTo(cx + s * .6, cy + s * .3); x.lineTo(cx + s * .45, cy + s * .15); x.moveTo(cx + s * .6, cy + s * .3); x.lineTo(cx + s * .75, cy + s * .15); x.stroke(); }
    else if (kind === 'rampa') { x.beginPath(); x.moveTo(cx - s * .5, cy + s * .3); x.lineTo(cx + s * .5, cy + s * .3); x.lineTo(cx + s * .5, cy - s * .2); x.closePath(); x.stroke(); x.beginPath(); x.arc(cx - s * .2, cy - s * .35, s * .1, 0, 7); x.arc(cx + s * .15, cy - s * .55, s * .1, 0, 7); x.fill(); }
    else if (kind === 'occhio') { x.beginPath(); x.moveTo(cx - s * .5, cy); x.quadraticCurveTo(cx, cy - s * .45, cx + s * .5, cy); x.quadraticCurveTo(cx, cy + s * .45, cx - s * .5, cy); x.stroke(); x.beginPath(); x.arc(cx, cy, s * .14, 0, 7); x.fill(); x.beginPath(); x.moveTo(cx - s * .55, cy - s * .5); x.lineTo(cx + s * .55, cy + s * .5); x.stroke(); }
    else { x.strokeRect(cx - s * .4, cy - s * .4, s * .8, s * .8); x.beginPath(); x.ellipse(cx, cy, s * .14, s * .3, .6, 0, 7); x.fill(); x.beginPath(); x.moveTo(cx - s * .2, cy + s * .3); x.lineTo(cx + s * .15, cy - s * .2); x.stroke(); }
    x.restore();
  }

  // ================= LE LETTERE A BOLLA (throw-up, bubble, throwie, chrome) =================
  // ogni lettera è fatta di cuscinetti: c = cerchio [x, y, r], k = capsula [x1, y1, x2, y2, r] (casella alta 1, y in su);
  // s = le fessure (le linee del contorno dentro la lettera: i buchi schiacciati, le gambe, le bocche della C e della S)
  const BUB = {
    A: { b: [['k', .2, .2, .32, .62, .26], ['k', .8, .2, .68, .62, .26], ['c', .5, .7, .33]], s: [[[.5, -.08], [.5, .34]]], h: [[.5, .62, .07, .1]] },
    B: { b: [['k', .22, .16, .22, .84, .24], ['c', .55, .73, .27], ['c', .6, .29, .31]], s: [[[1.02, .5], [.56, .5]]], h: [[.54, .73, .07, .06], [.58, .29, .08, .07]] },
    C: { b: [['c', .5, .5, .46]], s: [[[1, .5], [.52, .5]]] },
    D: { b: [['k', .22, .16, .22, .84, .24], ['c', .56, .5, .42]], s: [], h: [[.56, .5, .08, .15]] },
    E: { b: [['k', .22, .16, .22, .84, .24], ['k', .22, .83, .74, .83, .17], ['k', .22, .5, .64, .5, .16], ['k', .22, .17, .78, .17, .18]], s: [[[1, .665], [.4, .665]], [[1, .335], [.4, .335]]] },
    F: { b: [['k', .22, .14, .22, .84, .24], ['k', .22, .83, .76, .83, .18], ['k', .22, .5, .64, .5, .16]], s: [[[1, .665], [.4, .665]], [[.9, .3], [.42, .3]]] },
    G: { b: [['c', .5, .5, .46], ['c', .78, .3, .18]], s: [[[1, .6], [.56, .6]], [[.62, .45], [.62, .3]]] },
    H: { b: [['k', .2, .12, .2, .88, .24], ['k', .8, .12, .8, .88, .24], ['k', .2, .5, .8, .5, .22]], s: [[[.5, 1], [.5, .72]], [[.5, 0], [.5, .28]]] },
    I: { b: [['k', .38, .14, .38, .86, .28]], s: [] },
    J: { b: [['k', .66, .4, .66, .88, .25], ['c', .42, .3, .3]], s: [[[.42, .55], [.42, .38]]] },
    K: { b: [['k', .2, .12, .2, .88, .24], ['k', .3, .5, .74, .84, .21], ['k', .32, .46, .78, .16, .23]], s: [[[1, .5], [.6, .5]]] },
    L: { b: [['k', .24, .25, .24, .88, .25], ['k', .24, .2, .78, .2, .22]], s: [[[.48, .55], [.62, .42]]] },
    M: { b: [['k', .16, .14, .16, .84, .2], ['k', .5, .14, .5, .76, .2], ['k', .84, .14, .84, .84, .2], ['c', .33, .78, .21], ['c', .67, .78, .21]], s: [[[.33, 0], [.33, .55]], [[.67, 0], [.67, .55]]] },
    N: { b: [['k', .18, .12, .18, .88, .23], ['k', .82, .12, .82, .88, .23], ['k', .2, .78, .8, .22, .21]], s: [[[.44, 0], [.44, .38]], [[.56, 1], [.56, .62]]] },
    O: { b: [['c', .5, .5, .47]], s: [], h: [[.5, .5, .1, .18]] },
    P: { b: [['k', .22, .12, .22, .88, .24], ['c', .58, .66, .33]], s: [[[.46, .0], [.56, .3]]], h: [[.57, .67, .08, .09]] },
    Q: { b: [['c', .5, .52, .45], ['c', .84, .12, .15]], s: [[[.68, .26], [.82, .18]]], h: [[.5, .54, .1, .16]] },
    R: { b: [['k', .22, .12, .22, .88, .24], ['c', .58, .68, .3], ['k', .45, .4, .74, .16, .22]], s: [[[1, .44], [.52, .44]], [[.46, -.02], [.5, .28]]], h: [[.57, .69, .07, .08]] },
    S: { b: [['c', .44, .72, .3], ['c', .56, .28, .3]], s: [[[1, .64], [.55, .64]], [[0, .36], [.45, .36]]] },
    T: { b: [['k', .12, .82, .88, .82, .2], ['k', .5, .14, .5, .78, .25]], s: [[[.25, .58], [.3, .66]], [[.75, .58], [.7, .66]]] },
    U: { b: [['k', .2, .4, .2, .88, .24], ['k', .8, .4, .8, .88, .24], ['c', .5, .32, .38]], s: [[[.5, 1], [.5, .5]]] },
    V: { b: [['k', .2, .84, .44, .22, .26], ['k', .8, .84, .56, .22, .26]], s: [[[.5, 1], [.5, .56]]] },
    W: { b: [['k', .12, .84, .26, .2, .2], ['k', .5, .66, .38, .2, .2], ['k', .5, .66, .62, .2, .2], ['k', .88, .84, .74, .2, .2]], s: [[[.31, 1], [.33, .5]], [[.69, 1], [.67, .5]]] },
    X: { b: [['k', .2, .84, .8, .16, .24], ['k', .8, .84, .2, .16, .24]], s: [[[.5, 1], [.5, .7]], [[.5, 0], [.5, .3]]] },
    Y: { b: [['k', .2, .84, .5, .5, .24], ['k', .8, .84, .5, .5, .24], ['k', .5, .14, .5, .5, .24]], s: [[[.5, 1], [.5, .72]]] },
    Z: { b: [['k', .16, .82, .84, .82, .2], ['k', .82, .8, .18, .2, .22], ['k', .16, .18, .84, .18, .2]], s: [[[0, .62], [.42, .62]], [[1, .38], [.58, .38]]] },
    '0': { b: [['c', .5, .5, .46]], s: [], h: [[.5, .5, .09, .2]] }, '1': { b: [['k', .42, .14, .42, .86, .27], ['c', .26, .78, .16]], s: [] },
    '2': { b: [['c', .5, .72, .3], ['k', .2, .2, .8, .2, .22], ['k', .72, .6, .24, .22, .2]], s: [[[0, .64], [.4, .64]]] }, '3': { b: [['c', .48, .73, .28], ['c', .5, .28, .3]], s: [[[0, .64], [.42, .64]], [[0, .36], [.42, .36]], [[.25, .5], [.6, .5]]] },
    '4': { b: [['k', .7, .14, .7, .86, .24], ['k', .2, .4, .85, .4, .2], ['k', .24, .45, .5, .86, .2]], s: [[[.5, .6], [.55, .5]]] }, '5': { b: [['k', .25, .82, .8, .82, .2], ['k', .26, .82, .26, .5, .2], ['c', .52, .32, .32]], s: [[[0, .38], [.42, .38]]] },
    '6': { b: [['c', .5, .32, .33], ['k', .3, .4, .55, .88, .22]], s: [[[.5, .38], [.5, .26]]] }, '7': { b: [['k', .15, .82, .85, .82, .2], ['k', .82, .8, .4, .14, .24]], s: [] },
    '8': { b: [['c', .5, .74, .27], ['c', .5, .29, .31]], s: [[[.5, .8], [.5, .7]], [[.5, .36], [.5, .24]]] }, '9': { b: [['c', .5, .68, .33], ['k', .7, .6, .45, .12, .22]], s: [[[.5, .74], [.5, .62]]] },
  };
  // la parola a bolla: i cuscinetti in pixel (y in giù), lettera dopo lettera, accavallate
  function bubbleLayout(text, o, r) {
    const s = DEACC(text).replace(/[^A-Z0-9]/g, ''), L = []; let x = 0;
    [...s].forEach((ch, i) => {
      const g = BUB[ch] || BUB.O, sz = 1 + (r() - .5) * o.jit, rot = (r() - .5) * o.rot, by = (i % 2 ? 1 : -1) * o.bounce * (.4 + r() * .6), sq = o.squash;
      const cx = .5, cy = .5, cr = Math.cos(rot), sr = Math.sin(rot);
      const T = (u, v) => { const px = (u - cx) * sq * sz, py = (v - cy) * sz; return [x + .5 * sq + px * cr - py * sr + py * o.slant, -(cy + by + px * sr + py * cr)]; };
      const body = g.b.map(b => b[0] === 'c' ? { c: T(b[1], b[2]), r: b[3] * sz * o.puff } : { a: T(b[1], b[2]), b: T(b[3], b[4]), r: b[5] * sz * o.puff });
      const slits = g.s.map(sl => sl.map(([u, v]) => T(u, v))), holes = (g.h || []).map(([u, v, rx, ry]) => ({ c: T(u, v), rx: rx * sq * sz, ry: ry * sz, rot }));
      L.push({ ch, body, slits, holes, i }); x += o.adv * sq * sz;
    });
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    L.forEach(l => l.body.forEach(b => (b.c ? [b.c] : [b.a, b.b]).forEach(([a, c]) => { x0 = Math.min(x0, a - b.r); x1 = Math.max(x1, a + b.r); y0 = Math.min(y0, c - b.r); y1 = Math.max(y1, c + b.r); })));
    return { L, box: [x0, y0, x1, y1] };
  }
  function bubbleFit(B, W, H, pad) {
    const [x0, y0, x1, y1] = B.box, s = Math.min((W - 2 * pad) / (x1 - x0), (H - 2 * pad) / (y1 - y0)), ox = (W - (x1 - x0) * s) / 2 - x0 * s, oy = (H - (y1 - y0) * s) / 2 - y0 * s, M = ([a, b]) => [a * s + ox, b * s + oy];
    B.L.forEach(l => { l.body.forEach(b => { if (b.c) b.c = M(b.c); else { b.a = M(b.a); b.b = M(b.b); } b.r *= s; }); l.slits = l.slits.map(sl => sl.map(M)); l.holes.forEach(h => { h.c = M(h.c); h.rx *= s; h.ry *= s; }); });
    B.box = [x0 * s + ox, y0 * s + oy, x1 * s + ox, y1 * s + oy]; B.s = s; return B;
  }
  // i cuscinetti di una lettera, gonfiati di e (il contorno), spostati di (dx, dy)
  // [writer] la forma dei cuscinetti: SQ = 0 bolle tonde; SQ > 0 pezzi squadrati (barre a taglio dritto, blocchi con lo spigolo smussato)
  let SQ = 0, CUT = 0;
  function rrect(x, cx, cy, hw, hh, ang, rad, sh) {   // rettangolo ruotato con gli spigoli arrotondati (aggiunto al tracciato corrente); sh: le teste tagliate in obliquo
    const c = Math.cos(ang), s0 = Math.sin(ang), P0 = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([u, v]) => [u + (sh || 0) * v, v]).map(([u, v]) => [cx + u * c - v * s0, cy + u * s0 + v * c]);
    rad = Math.max(0, Math.min(rad, hw, hh)); const m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], s1 = m(P0[3], P0[0]);
    x.moveTo(s1[0], s1[1]); for (let k = 0; k < 4; k++) x.arcTo(P0[k][0], P0[k][1], P0[(k + 1) % 4][0], P0[(k + 1) % 4][1], rad); x.closePath();
  }
  function padPath(x, b, e, dx, dy) {
    if (b.c) { const cx = b.c[0] + dx, cy = b.c[1] + dy, rr = b.r + e;
      if (!SQ) { x.moveTo(cx + rr, cy); x.arc(cx, cy, rr, 0, PI * 2); } else rrect(x, cx, cy, rr * .94, rr * .94, 0, rr * (.55 - SQ * .3)); return; }
    const ax = b.a[0] + dx, ay = b.a[1] + dy, bx = b.b[0] + dx, by = b.b[1] + dy, an = Math.atan2(by - ay, bx - ax), rr = b.r + e;
    if (!SQ) { x.moveTo(ax + Math.cos(an + PI / 2) * rr, ay + Math.sin(an + PI / 2) * rr); x.arc(ax, ay, rr, an + PI / 2, an + PI * 1.5); x.arc(bx, by, rr, an - PI / 2, an + PI / 2); x.closePath(); return; }
    const L = hyp(bx - ax, by - ay) / 2 + rr * .82; rrect(x, (ax + bx) / 2, (ay + by) / 2, L, rr * .96, an, rr * (.45 - SQ * .3), CUT);   // la barra: taglio dritto, appena smussata
  }
  function bodyPath(x, l, e, dx, dy) { x.beginPath(); l.body.forEach(b => padPath(x, b, e, dx, dy)); }
  function fillBody(x, l, e, col, dx, dy) { x.fillStyle = col; l.body.forEach(b => { x.beginPath(); padPath(x, b, e, dx || 0, dy || 0); x.fill(); }); }
  // LE BOLLE DI OGGI (dai bozzetti dei writer): riempimento col suo tono d'ombra in basso, contorno colorato (o nero), il blocco
  // del 3D, la keyline chiara attorno a tutto, il colore delle decorazioni (aureole, corone, crocette, stelline, mini-tag)
  const REFS = [
    { fill: '#5fe38c', shade: '#1f8a4a', ol: '#123a8a', d3: '#123a8a', outer: '#8af0ff', deco: '#ffffff' },   // verde col bagliore blu
    { fill: '#c8ef3a', shade: '#8ab81a', ol: '#141414', d3: '#141414', outer: '#ececec', deco: '#ff4a1a' },   // lime e nero
    { fill: '#ff8a1a', shade: '#e0560e', ol: '#d8201a', d3: '#d8201a', outer: '#8ad8c8', deco: '#ff8a1a' },   // arancio col rosso, le crocette
    { fill: '#2a30d8', shade: '#1a1a9a', ol: '#e8f040', d3: '#b8c030', outer: '#bdbdbd', deco: '#e8f040' },   // blu pieno, contorno giallo
    { fill: '#f070e8', shade: '#c03ec4', ol: '#141414', d3: '#3a1a6a', outer: '#f2f2f2', deco: '#ffffff' },   // fucsia, l'ombra viola
    { fill: '#f0b020', shade: '#cf7e10', ol: '#4a2a8a', d3: '#4a2a8a', outer: '#c8f0a0', deco: '#4a2a8a' },   // oro e viola
    { fill: '#5a2a8a', shade: '#3a1a66', ol: '#4aef4a', d3: '#1e7a2a', outer: '#262626', deco: '#4aef4a' },   // viola e verde fluo
    { fill: '#6af0d8', shade: '#2fb8a8', ol: '#e8201a', d3: '#e8201a', outer: '#f4b0a8', deco: '#ffffff', bubbles: true },   // acqua e rosso, le bolle
    { fill: '#fbf4f6', shade: '#f0c4da', ol: '#e060a8', d3: '#b04a9a', outer: '#fdf6fa', deco: '#e060a8' },   // bianco e rosa (i pastelli)
    { fill: '#fdf0d6', shade: '#f0d0a8', ol: '#7a3aa0', d3: '#c49ae8', outer: '#fff8ee', deco: '#7a3aa0' },   // crema e viola
    { fill: '#d4f0cc', shade: '#9fd4ac', ol: '#1a8a9a', d3: '#14687a', outer: '#eefbf2', deco: '#1a8a9a' },   // menta e petrolio
    { fill: '#f8d860', shade: '#e8a42e', ol: '#c03a1a', d3: '#e87a2a', outer: '#fff4cc', deco: '#c03a1a' },   // giallo e rosso
    { fill: '#e4ecf4', shade: '#aec2d8', ol: '#6e82a0', d3: '#9ab0c8', outer: '#f6f8fb', deco: '#6e82a0' },   // ghiaccio
    { fill: '#f4a0b8', shade: '#c82a3a', ol: '#9a1a2a', d3: '#d84a5a', outer: '#8ac8f0', deco: '#ffffff' },   // rosa e rosso sul celeste
    { fill: '#7aa08e', shade: '#557a6a', ol: '#101010', d3: '#101010', outer: '#d8d8d8', deco: '#f0e020' },   // salvia e nero, i dettagli gialli
    { fill: '#f8ee1a', ol: '#1c3aa8', d3: '#1c3aa8', outer: null, deco: '#1c3aa8', flat: true, marks: 2 },   // giallo pieno e blu: niente luci, tanti segni dentro
    { fill: '#fdf0f2', shade: '#f2bccb', ol: '#111114', d3: '#111114', outer: '#f6ccd6', deco: '#111114', scribble: true, marks: 1 },   // bianco e rosa col nero, gli scarabocchi dietro
  ];
  // il riempimento a marker dentro una lettera: l'ombra in basso (la lettera spostata in su lascia la mezzaluna scura),
  // le righe oblique delle passate, qualche bolla
  function markerFill(x, l, S0, u, r) {
    x.save(); bodyPath(x, l, 0, 0, 0); x.clip();
    const box = l.body.reduce((a, b) => { const cs = b.c ? [b.c] : [b.a, b.b]; cs.forEach(([p, q]) => { a[0] = Math.min(a[0], p - b.r); a[1] = Math.min(a[1], q - b.r); a[2] = Math.max(a[2], p + b.r); a[3] = Math.max(a[3], q + b.r); }); return a; }, [1e9, 1e9, -1e9, -1e9]);
    if (S0.shade) { x.fillStyle = S0.shade; x.fillRect(box[0], box[1], box[2] - box[0], box[3] - box[1]); fillBody(x, l, -u * .02, S0.fill, -u * .02, -u * .11); }
    const lum = (h => { if (!h || h[0] !== '#') return .5; const n = parseInt(h.slice(1), 16); return ((n >> 16) * .3 + ((n >> 8) & 255) * .59 + (n & 255) * .11) / 255; })(S0.fill);
    if (S0.flat || lum < .3) { x.restore(); return; }
    x.lineCap = 'round'; const ang = -1.05 + (r() - .5) * .3, ca = Math.cos(ang), sa = Math.sin(ang), step = Math.max(2, u * .045), L = (box[2] - box[0]) + (box[3] - box[1]);
    for (let t = -L; t < L; t += step * (2.2 + r() * 2.5)) {
      const cx = (box[0] + box[2]) / 2 + t, cy = (box[1] + box[3]) / 2; x.strokeStyle = r() < .7 ? (S0.shade || 'rgba(0,0,0,.4)') : 'rgba(255,255,255,.6)'; x.globalAlpha = .06 + r() * .07; x.lineWidth = Math.max(1, u * (.03 + r() * .04));
      const a = (r() - .5) * L * .3, b = L * (.3 + r() * .35); x.beginPath(); x.moveTo(cx + ca * (a - b), cy + sa * (a - b)); x.lineTo(cx + ca * (a + b), cy + sa * (a + b)); x.stroke();
    }
    x.globalAlpha = 1;
    if (S0.bubbles) for (let k = 0; k < 3; k++) { const b = pickR(r, l.body), c = b.c || b.a, rr = b.r * (.25 + r() * .2), px = c[0] + (r() - .5) * b.r, py = c[1] - b.r * .2 + (r() - .5) * b.r * .6; x.strokeStyle = S0.ol; x.lineWidth = Math.max(1, u * .014); x.beginPath(); x.arc(px, py, rr, 0, 7); x.stroke(); x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(px - rr * .35, py - rr * .4, rr * .22, rr * .14, -.6, 0, 7); x.fill(); }
    x.restore();
  }
  // i segni dentro le lettere (le linee di costruzione, il «=», la crocetta, i puntini, la freccina, la mini-tag): sottili, del contorno
  function innerMarks(x, l, S0, u, r, text, n) {
    const b = l.body.reduce((a, c) => (c.r > a.r ? c : a)), c = b.c || [(b.a[0] + b.b[0]) / 2, (b.a[1] + b.b[1]) / 2], R = b.r;
    x.save(); bodyPath(x, l, -u * .02, 0, 0); x.clip(); x.strokeStyle = S0.ol; x.fillStyle = S0.ol; x.lineCap = 'round'; x.lineJoin = 'round'; x.lineWidth = Math.max(1.2, u * .016);
    const at = () => [c[0] + (r() - .5) * R * 1.1, c[1] + (r() - .5) * R * 1.1];
    for (let k = 0; k < n; k++) {
      const [px, py] = at(), kd = pickR(r, ['uguale', 'linea', 'linea', 'tag', 'punti', S0.fill === '#141418' ? 'spirale' : 'linea']), s2 = u * (.05 + r() * .04);
      if (kd === 'uguale') { for (const d of [-.3, .3]) { x.beginPath(); x.moveTo(px - s2, py + d * s2); x.lineTo(px + s2, py + d * s2 - s2 * .2); x.stroke(); } }
      if (kd === 'croce') { x.beginPath(); x.moveTo(px - s2 * .7, py - s2 * .7); x.lineTo(px + s2 * .7, py + s2 * .7); x.moveTo(px + s2 * .7, py - s2 * .7); x.lineTo(px - s2 * .7, py + s2 * .7); x.stroke(); }
      if (kd === 'punti') for (let j = 0; j < 2 + Math.floor(r() * 3); j++) { x.beginPath(); x.arc(px + (r() - .5) * s2 * 3, py + (r() - .5) * s2 * 3, Math.max(1.5, s2 * (.2 + r() * .35)), 0, 7); x.fill(); }
      if (kd === 'freccia') { const a = r() * 6.28, L = s2 * 3; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * L, py + Math.sin(a) * L); x.stroke(); const hx = px + Math.cos(a) * L, hy = py + Math.sin(a) * L; x.beginPath(); x.moveTo(hx, hy); x.lineTo(hx - Math.cos(a - .5) * s2, hy - Math.sin(a - .5) * s2); x.moveTo(hx, hy); x.lineTo(hx - Math.cos(a + .5) * s2, hy - Math.sin(a + .5) * s2); x.stroke(); }
      if (kd === 'linea') { x.beginPath(); x.moveTo(px - R * .4, py + R * .3); x.quadraticCurveTo(px, py - R * .2, px + R * .35, py + R * .4); x.stroke(); }   // la linea di costruzione (la curva interna)
      if (kd === 'tag' && R > u * .2) smallTag(x, text, px, py, R * .28, S0.ol, r, R * 1.1);
      if (kd === 'spirale') { x.beginPath(); for (let t = 0; t < 14; t += .3) { const rr = s2 * .12 * t; x.lineTo(px + Math.cos(t) * rr, py + Math.sin(t) * rr); } x.stroke(); }
    }
    x.restore();
  }
  // gli scarabocchi dietro il pezzo: spirali di marker che girano dietro le lettere
  function scribble(x, Wp, Hp, col, r, u) {
    x.save(); x.strokeStyle = col; x.lineWidth = Math.max(1, u * .012); x.globalAlpha = .75; x.lineCap = 'round';
    for (let k = 0; k < 5; k++) { let cx = Wp * (.1 + r() * .8), cy = Hp * (.2 + r() * .6); const R = Hp * (.06 + r() * .06); x.beginPath(); for (let t = 0; t < 26; t += .25) { cx += R * .07; x.lineTo(cx + Math.cos(t) * R, cy + Math.sin(t) * R * .8); } x.stroke(); }
    x.restore();
  }
  function markerHatch(x, box, lw, r, col) {   // le passate del marker sopra una lettera (source-atop: restano dentro)
    const [a0, b0, a1, b1] = box, ang = -1.05, ca = Math.cos(ang), sa = Math.sin(ang), L = (a1 - a0) + (b1 - b0), step = Math.max(2, lw * .12); x.lineCap = 'round';
    for (let t = -L; t < L; t += step * (.7 + r() * .8)) { const cx = (a0 + a1) / 2 + t, cy = (b0 + b1) / 2, a = (r() - .5) * L * .3, b = L * (.15 + r() * .25); x.strokeStyle = r() < .7 ? col : '#ffffff'; x.globalAlpha = .1 + r() * .12; x.lineWidth = Math.max(1, lw * (.02 + r() * .03)); x.beginPath(); x.moveTo(cx + ca * (a - b), cy + sa * (a - b)); x.lineTo(cx + ca * (a + b), cy + sa * (a + b)); x.stroke(); }
    x.globalAlpha = 1;
  }
  // LE COLATURE VERE: nascono dal bordo più basso della sagoma (3D compreso), dove la vernice si è caricata; vengono a gruppi
  // (dove il writer si è fermato), scendono dritte per gravità, si assottigliano e finiscono con la goccia
  function realDrips(ctx, B, dx, dy, ol, col, u, r, Wp, Hp, load) {
    const M = cv(Wp, Hp), mx = M.getContext('2d'); B.L.forEach(l => { fillBody(mx, l, ol, '#000', 0, 0); fillBody(mx, l, ol, '#000', dx, dy); });
    const A = mx.getImageData(0, 0, Wp, Hp).data, bot = new Float32Array(Wp).fill(-1);
    for (let xx = 0; xx < Wp; xx++) for (let yy = Hp - 1; yy >= 0; yy--) if (A[(yy * Wp + xx) * 4 + 3] > 128) { bot[xx] = yy; break; }
    const ok = []; for (let xx = 2; xx < Wp - 2; xx++) if (bot[xx] > 0 && bot[xx] >= bot[xx - 2] - 1 && bot[xx] >= bot[xx + 2] - 1) ok.push(xx);   // i punti bassi del bordo (le pance delle lettere)
    if (!ok.length) return;
    const groups = 1 + (r() < .4 ? 1 : 0);
    for (let g = 0; g < groups; g++) {
      const c0 = pickR(r, ok), n = 2 + Math.floor(r() * 3 * load), span = u * (.25 + r() * .35);
      for (let k = 0; k < n; k++) {
        const xx = Math.round(clamp(c0 + (r() - .5) * span, 2, Wp - 3)), y0 = bot[xx]; if (y0 < 0) continue;
        const near = 1 - Math.abs(xx - c0) / (span / 2 + 1), L = Math.min(Hp - y0 - 4, u * (.08 + (.2 + r() * .45) * near * load)), w0 = Math.max(1.5, ol * (.55 + r() * .5));
        if (L < u * .04) continue; const wob = (r() - .5) * w0 * .6;
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(xx - w0, y0 - ol * .5); ctx.quadraticCurveTo(xx - w0 * .55 + wob, y0 + L * .5, xx - w0 * .4 + wob, y0 + L); ctx.lineTo(xx + w0 * .4 + wob, y0 + L); ctx.quadraticCurveTo(xx + w0 * .55 + wob, y0 + L * .5, xx + w0, y0 - ol * .5); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.ellipse(xx + wob, y0 + L + w0 * .35, w0 * .62, w0 * .85, 0, 0, 7); ctx.fill();   // la goccia in fondo
      }
    }
  }
  // i riempimenti alternativi (tutti dentro la lettera, uguali su tutto il pezzo): bande, due colori, sfumato, nuvole a spray
  function fillVariant(x, l, kind, cols, box, u, r) {
    const [a0, b0, a1, b1] = box, hh = b1 - b0, ww = a1 - a0; x.save(); bodyPath(x, l, 0, 0, 0); x.clip();
    if (kind === 'bande') { const cut = (yy, k) => { x.beginPath(); x.moveTo(a0 - u, yy); for (let xx = a0 - u; xx <= a1 + u; xx += u * .2) x.lineTo(xx, yy + Math.sin((xx - a0) / (ww + 1) * PI * (1.2 + k * .3) + k) * hh * .04); x.lineTo(a1 + u, b1 + u); x.lineTo(a0 - u, b1 + u); x.closePath(); };
      x.fillStyle = cols[0]; x.fillRect(a0 - u, b0 - u, ww + 2 * u, hh + 2 * u); x.fillStyle = cols[1]; cut(b0 + hh * .42, 0); x.fill(); x.fillStyle = cols[2]; cut(b0 + hh * .74, 1); x.fill(); }
    else if (kind === 'due') { x.fillStyle = cols[0]; x.fillRect(a0 - u, b0 - u, ww + 2 * u, hh + 2 * u); x.fillStyle = cols[2]; x.beginPath(); x.moveTo(a0 - u, b0 + hh * .62); for (let xx = a0 - u; xx <= a1 + u; xx += u * .2) x.lineTo(xx, b0 + hh * (.62 - .25 * (xx - a0) / ww) + Math.sin((xx - a0) / u * 2.2) * hh * .03); x.lineTo(a1 + u, b1 + u); x.lineTo(a0 - u, b1 + u); x.closePath(); x.fill(); }
    else if (kind === 'sfumato') { const g = x.createLinearGradient(0, b0, 0, b1); g.addColorStop(0, cols[0]); g.addColorStop(.5, cols[1]); g.addColorStop(1, cols[2]); x.fillStyle = g; x.fillRect(a0 - u, b0 - u, ww + 2 * u, hh + 2 * u); }
    else if (kind === 'nuvole') {   // la base e le nuvole di spray dei due toni, morbide
      x.fillStyle = cols[1]; x.fillRect(a0 - u, b0 - u, ww + 2 * u, hh + 2 * u);
      for (let k = 0; k < 7; k++) { const top = k % 2 === 0, cx = a0 + r() * ww, cy = top ? b0 + hh * (.05 + r() * .25) : b0 + hh * (.75 + r() * .25), R = u * (.35 + r() * .45), g = x.createRadialGradient(cx, cy, 0, cx, cy, R), c = top ? cols[0] : cols[2];
        g.addColorStop(0, c); g.addColorStop(.55, c); g.addColorStop(1, c + '00'); x.fillStyle = g; x.fillRect(cx - R, cy - R, 2 * R, 2 * R); }
    }
    x.restore();
  }
  // il riflesso: un trattino curvo e un puntino in alto a sinistra di ogni cuscinetto grande (non l'arco lucido)
  function glints(x, l, col, u, r) {
    x.fillStyle = col; x.strokeStyle = col; x.lineCap = 'round';
    l.body.filter(b => b.r > u * .16).forEach(b => {
      const c = b.c || (b.a[1] < b.b[1] ? b.a : b.b), R = b.r * .66, a0 = PI * (1.12 + r() * .08);
      x.lineWidth = Math.max(1.5, u * .03); x.beginPath(); x.arc(c[0], c[1], R, a0, a0 + .32); x.stroke();
      x.beginPath(); x.arc(c[0] + Math.cos(a0 + .55) * R, c[1] + Math.sin(a0 + .55) * R, Math.max(1.2, u * .02), 0, 7); x.fill();
    });
  }
  // la faccia dentro la lettera: gli occhi socchiusi e il ghigno coi denti
  function letterFace(x, l, S0, u, r) {
    const b = l.body.reduce((a, c) => (c.r > a.r ? c : a)), c = b.c || [(b.a[0] + b.b[0]) / 2, (b.a[1] + b.b[1]) / 2], R = b.r * .7;
    if (r() < .5) {   // gli occhioni a cartone che spuntano dalla lettera
      const K = S0.ol === '#f6f4ee' ? '#141418' : S0.ol, lw0 = Math.max(1.5, u * .025);
      for (const sd of [-1, 1]) { const ex = c[0] + sd * R * .42, ey = c[1] - R * .25, rx = R * .4, ry = R * .55; x.fillStyle = '#ffffff'; x.strokeStyle = K; x.lineWidth = lw0; x.beginPath(); x.ellipse(ex, ey, rx, ry, 0, 0, 7); x.fill(); x.stroke();
        x.fillStyle = '#101012'; x.beginPath(); x.ellipse(ex + sd * rx * .2, ey + ry * .3, rx * .3, ry * .3, 0, 0, 7); x.fill(); x.fillStyle = '#ffffff'; x.beginPath(); x.arc(ex + sd * rx * .12, ey + ry * .2, rx * .09, 0, 7); x.fill();
        x.strokeStyle = K; x.beginPath(); x.moveTo(ex - rx * .5, ey - ry * 1.25); x.lineTo(ex + rx * .3, ey - ry * 1.05); x.stroke(); }
      return;
    }
    x.save(); bodyPath(x, l, 0, 0, 0); x.clip(); x.lineJoin = 'round'; x.lineCap = 'round';
    x.fillStyle = '#ffffff'; x.strokeStyle = S0.ol; x.lineWidth = Math.max(1.5, u * .022);
    x.beginPath(); x.moveTo(c[0] - R * .7, c[1] + R * .05); x.quadraticCurveTo(c[0], c[1] + R * .2, c[0] + R * .75, c[1] - R * .05); x.quadraticCurveTo(c[0] + R * .1, c[1] + R * .85, c[0] - R * .7, c[1] + R * .05); x.fill(); x.stroke();
    x.lineWidth = Math.max(1, u * .014); x.beginPath(); for (let k = 0; k <= 8; k++) { const t = k / 8, px = c[0] - R * .6 + t * R * 1.25, py = c[1] + R * (k % 2 ? .45 : .18) - t * R * .1; k ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke();
    x.lineWidth = Math.max(1.5, u * .022); x.beginPath(); x.moveTo(c[0] - R * .55, c[1] - R * .45); x.quadraticCurveTo(c[0] - R * .35, c[1] - R * .6, c[0] - R * .1, c[1] - R * .42); x.stroke();
    x.beginPath(); x.moveTo(c[0] + R * .15, c[1] - R * .45); x.quadraticCurveTo(c[0] + R * .38, c[1] - R * .62, c[0] + R * .6, c[1] - R * .4); x.stroke();
    x.restore();
  }
  // le decorazioni attorno: aureola, corona, crocette, stelline sottili, cuore, la mini-tag, l'anno, le gocce
  function decorate(x, B, S0, u, r, text, Wp, Hp, ol) {
    const [bx0, by0, bx1, by1] = B.box, col = S0.deco || '#ffffff', K = S0.ol, tops = [];
    B.L.forEach(l => { let t = null; l.body.forEach(b => { const c = b.c || (b.a[1] < b.b[1] ? b.a : b.b); if (!t || c[1] - b.r < t[1]) t = [c[0], c[1] - b.r]; }); tops.push(t); });
    const star = (cx, cy, s) => { x.save(); x.fillStyle = '#ffffff'; x.beginPath(); for (let k = 0; k < 8; k++) { const a = k * PI / 4, rr = k % 2 ? s * .12 : s; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); x.fill(); x.restore(); };
    const cross = (cx, cy, s) => { x.save(); x.strokeStyle = col === '#ffffff' ? K : col; x.lineCap = 'round'; x.lineWidth = Math.max(2, s * .32); x.shadowColor = x.strokeStyle; x.shadowBlur = s * .35; const a = (r() - .5) * .6; x.beginPath(); for (const d of [a, a + PI / 2 + (r() - .5) * .3]) { const L = s * (.9 + r() * .3); x.moveTo(cx - Math.cos(d) * L, cy - Math.sin(d) * L); x.lineTo(cx + Math.cos(d) * L * (.8 + r() * .3), cy + Math.sin(d) * L * (.8 + r() * .3)); } x.stroke(); x.restore(); };   // [writer] la crocetta: due passate di bomboletta, non un adesivo
    const kinds = []; const n = 2 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) kinds.push(pickR(r, ['minitag', 'minitag', 'aureola', 'stelle', 'croci', 'cuore']));   // [writer] niente croci, cuori, stelline, corone: scorciatoie che si notano
    [...new Set(kinds)].forEach(kd => {
      x.lineCap = 'round'; x.lineJoin = 'round';
      if (kd === 'aureola') { const t = pickR(r, tops); x.strokeStyle = col === '#ffffff' ? K : col; x.lineWidth = Math.max(1.5, u * .022); x.beginPath(); x.ellipse(t[0], t[1] - u * .12, u * .2, u * .055, (r() - .5) * .2, 0, 7); x.stroke(); }
      if (kd === 'corona') { const t = pickR(r, tops), w2 = u * .32, y0 = t[1] - u * .05; x.strokeStyle = col === '#ffffff' ? K : col; x.lineWidth = Math.max(1.5, u * .022); x.beginPath(); x.moveTo(t[0] - w2 / 2, y0); x.lineTo(t[0] - w2 / 2, y0 - w2 * .45); x.lineTo(t[0] - w2 / 4, y0 - w2 * .2); x.lineTo(t[0], y0 - w2 * .55); x.lineTo(t[0] + w2 / 4, y0 - w2 * .2); x.lineTo(t[0] + w2 / 2, y0 - w2 * .45); x.lineTo(t[0] + w2 / 2, y0); x.closePath(); x.stroke(); }
      if (kd === 'croci') for (let k = 0; k < 4 + Math.floor(r() * 4); k++) { const a = r() * PI * 2, px = (bx0 + bx1) / 2 + Math.cos(a) * (bx1 - bx0) * (.45 + r() * .1), py = (by0 + by1) / 2 + Math.sin(a) * (by1 - by0) * (.5 + r() * .12); cross(clamp(px, u * .15, Wp - u * .15), clamp(py, u * .15, Hp - u * .15), u * (.08 + r() * .06)); }
      if (kd === 'stelle') for (let k = 0; k < 2 + Math.floor(r() * 3); k++) star(bx0 + r() * (bx1 - bx0), by0 + r() * (by1 - by0) * .5, u * (.06 + r() * .07));
      if (kd === 'cuore') { const t = pickR(r, tops), s2 = u * .09, cx = t[0] + u * .25, cy = t[1] + u * .05; x.strokeStyle = col === '#ffffff' ? '#e8406a' : col; x.lineWidth = Math.max(2, ol * 1.1); x.lineCap = 'round'; x.shadowColor = x.strokeStyle; x.shadowBlur = s2 * .3; x.fillStyle = 'rgba(0,0,0,0)'; x.beginPath(); x.moveTo(cx, cy + s2); x.bezierCurveTo(cx - s2 * 1.6, cy - s2 * .2, cx - s2 * .7, cy - s2 * 1.4, cx, cy - s2 * .45); x.bezierCurveTo(cx + s2 * .7, cy - s2 * 1.4, cx + s2 * 1.6, cy - s2 * .2, cx + s2 * .1, cy + s2 * .8); x.stroke(); x.shadowBlur = 0; }   // il cuore: un tratto solo, a spruzzo
      if (kd === 'minitag') smallTag(x, text, clamp(bx0 + (r() < .5 ? -u * .05 : (bx1 - bx0) * .9), u * .4, Wp - u * .4), r() < .5 ? Math.max(u * .12, by0 - u * .02) : Math.min(Hp - u * .1, by1 + u * .02), u * .14, col === '#ffffff' ? K : col, r, u * 1.1);
      if (kd === 'corna') tops.forEach(t => { if (r() < .5) return; const h = u * (.12 + r() * .08), w2 = u * .07, lean = (r() - .5) * u * .1; x.fillStyle = S0.fill === 'chrome' ? '#cfd3d8' : S0.fill; x.strokeStyle = K; x.lineWidth = Math.max(1.5, ol * 1.4); x.beginPath(); x.moveTo(t[0] - w2, t[1] + ol * 2); x.quadraticCurveTo(t[0] - w2 * .3 + lean, t[1] - h * .5, t[0] + lean * 1.5, t[1] - h); x.quadraticCurveTo(t[0] + w2 * .2, t[1] - h * .3, t[0] + w2, t[1] + ol * 2); x.stroke(); x.fill(); });
      if (kd === 'gocce') { const lows = []; B.L.forEach(l => l.body.forEach(b => { const c = b.c || (b.a[1] > b.b[1] ? b.a : b.b); lows.push([c[0], c[1] + b.r]); })); x.strokeStyle = S0.ol; x.fillStyle = S0.ol; for (let k = 0; k < 3 + Math.floor(r() * 3); k++) { const q = pickR(r, lows), l2 = u * (.15 + r() * .35); x.lineWidth = ol * 1.1; x.beginPath(); x.moveTo(q[0], q[1] - ol); x.lineTo(q[0], q[1] + l2); x.stroke(); x.beginPath(); x.ellipse(q[0], q[1] + l2 + ol * .4, ol * 1.2, ol * 1.6, 0, 0, 7); x.fill(); } }
    });
  }
  // gli schemi di colore: il bozzetto (bianco e rosso), la throwie (nero e bianco), il colore pieno, il cromato
  function bubbleScheme(fam, P, r, q) {
    if ((fam === 'bubble' || fam === 'fat') && r() < .62) return Object.assign({ shine: '#ffffff' }, pickR(r, REFS), { ref: true });   // [writer] le bolle dei bozzetti di oggi
    if (fam === 'throwie' && r() < .25) return Object.assign({ shine: '#ffffff' }, pickR(r, REFS.filter(R => R.ol === '#141414' || R.ol === '#101010')), { ref: true });
    if (fam === 'throwie') return r() < .7 ? { fill: '#141418', ol: '#f6f4ee', outer: '#141418', d3: '#141418', shine: '#f6f4ee', slit: '#f6f4ee' } : { fill: '#f6f4ee', ol: '#141418', outer: null, d3: '#141418', shine: '#141418', slit: '#141418' };
    if (fam === 'chrome') return r() < .55 ? { fill: '#cfd3d8', ol: '#101012', outer: null, d3: '#101012', shine: '#ffffff', slit: '#101012', thick: 1.6 } : { fill: 'chrome', ol: '#101012', outer: P.k === '#101012' ? null : P.k, d3: '#101012', shine: '#ffffff', slit: '#101012' };
    const k = r();
    if (k < .3) { const c = pickR(r, [P.f[2], '#d8201a', '#1a3a9a', '#101012']); return { fill: '#fbf8f0', ol: c, outer: null, d3: c, shine: c, slit: c }; }   // il bozzetto
    if (P.f && k < .75) return { fill: P.f[1], ol: '#101012', outer: null, d3: r() < .5 ? '#101012' : P.d, shine: '#ffffff', slit: '#101012', thick: 1.4 };   // pieno piatto col nero
    return { fill: P.f[k < .65 ? 0 : 1], fill2: P.f[1], ol: P.o, outer: q > .5 ? P.k : null, d3: P.d, shine: '#ffffff', slit: P.o };
  }
  function bubbleArt(w, P, C, r, Wp, Hp, snap, paths, radii, x) {
    const F = FAM[C.fam], q = C.q, throwUp = w.style === 'throw', PZB = !F.fat;   // PZB: un pezzo (block, semi, wild) costruito sulle bolle, squadrato
    SQ = PZB ? (C.fam === 'block' || C.fam === 'heavy' || C.fam === 'astratto' || C.fam === 'piatto' ? 1 : .55) : 0;
    const S0 = PZB ? { fill: P.f[1], bands: P.f, ol: P.o, d3: P.d, outer: q > .3 ? P.k : null, deco: P.o, shine: P.hi, slit: P.o, ref: true, pz: true } : bubbleScheme(C.fam, P, r, q); if (!S0.slit) S0.slit = S0.ol;
    const o = PZB ? { adv: .8, jit: .04 + (1 - q) * .08, rot: .06 + (1 - q) * .08, bounce: .03, squash: 1.05 + r() * .2, slant: .12 + r() * .1, puff: .92 } : { adv: C.fam === 'throwie' ? .72 : C.fam === 'fat' ? .74 : .8, jit: .1 + (1 - q) * .12, rot: .16 + (1 - q) * .1, bounce: .05 + r() * .06, squash: .95 + r() * .35, slant: (r() - .3) * .25, puff: C.fam === 'fat' || C.fam === 'throwie' ? 1.12 + r() * .1 : 1 + r() * .08 };
    const sloganH = C.slogan && !throwUp ? Hp * .12 : 0, B = bubbleFit(bubbleLayout(w.words || w.aka || 'NINO', o, r), Wp, Hp - sloganH, Hp * .1);
    // [writer] LE VARIANTI (dal seme, indipendenti): il taglio delle barre, il riempimento, il contorno, il 3D, la keyline
    const vr = mulberry((w.seed || 1) ^ 0x7f4a7c15), V = {
      cut: PZB && /wild|spiky|semi/.test(C.fam) && vr() < .65 ? .4 + vr() * .35 : 0,
      fillv: PZB ? pickR(vr, ['bande', 'bande', 'due', 'sfumato', 'nuvole', 'nuvole']) : S0.ref && !S0.flat && S0.fill !== 'chrome' && vr() < .3 ? 'nuvole' : null,
      olv: S0.fill === '#141418' ? 'pieno' : pickR(vr, ['pieno', 'pieno', 'sottile', 'doppio']), d3v: pickR(vr, ['blocco', 'blocco', 'blocco', 'ombra']), dir: vr() < .3 ? -1 : 1, kv: pickR(vr, ['grassa', 'grassa', 'sottile']) };
    CUT = V.cut;
    const u = B.s, ol = Math.max(2, u * (.045 + r() * .02) * (S0.thick || 1) * (V.olv === 'sottile' ? .6 : 1)), d3 = u * (.12 + r() * .1) * (q < .3 ? .4 : 1) * (V.d3v === 'ombra' ? 1.3 : 1), ang = .6 + r() * .5, dx = Math.cos(ang) * d3 * V.dir, dy = Math.sin(ang) * d3, steps = Math.max(2, Math.round(d3 / 1.2));
    const S3 = V.d3v === 'ombra' ? [steps] : null;   // l'ombra staccata: solo l'ultimo gradino
    const faceI = S0.ref && q > .45 && r() < (S0.pz ? .12 : .3) ? Math.floor(r() * B.L.length) : -1, faceI2 = C.fam === 'throwie' && r() < .35 ? Math.floor(r() * B.L.length) : -1;
    const order = B.L.map((l, i) => i).reverse();   // si disegna da destra: la lettera a sinistra sta sopra quella a destra (così si legge)
    const chromeG = () => { const g = x.createLinearGradient(0, B.box[1], 0, B.box[3]); g.addColorStop(0, '#ffffff'); g.addColorStop(.45, '#c8d0da'); g.addColorStop(.52, '#5a6472'); g.addColorStop(.6, '#9aa4b2'); g.addColorStop(1, '#eef2f6'); return g; };
    const fillCol = c => c === 'chrome' ? chromeG() : c;
    // 1. il riempimento
    const FILL = cv(Wp, Hp), fx = FILL.getContext('2d'); order.forEach(i => fillBody(fx, B.L[i], 0, S0.fill === 'chrome' ? '#c8d0da' : S0.fill));
    x.drawImage(FILL, 0, 0); snap(x.canvas); const pts = []; B.L.forEach(l => l.body.forEach(b => { if (b.c) for (let a = 0; a < 6; a++) pts.push([b.c[0] + Math.cos(a) * b.r * .5, b.c[1] + Math.sin(a) * b.r * .5]); else for (let t = 0; t <= 1; t += .25) pts.push([b.a[0] + (b.b[0] - b.a[0]) * t, b.a[1] + (b.b[1] - b.a[1]) * t]); })); paths.push(pts); radii.push(u * .3);
    // 2. lo sfondo
    const BG = cv(Wp, Hp), bg = BG.getContext('2d');
    if (S0.ref && C.bgk !== 'rullo' && w.style !== 'wholecar') C.bgk = null;   // [writer] le bolle dei bozzetti stanno da sole sul muro
    if (C.bgk) { if (C.bgk === 'rullo' && w.style !== 'wholecar') cloudOf(bg, FILL, P, Wp, Hp, r, q); else background(bg, C.bgk, P, Wp, Hp, r, w.style === 'wholecar'); const k = cv(Wp, Hp), kx = k.getContext('2d'); kx.drawImage(BG, 0, 0); kx.drawImage(FILL, 0, 0); x.clearRect(0, 0, Wp, Hp); x.drawImage(k, 0, 0); snap(x.canvas); paths.push(raster(Wp, Hp, 3)); radii.push(Hp * .18); }
    // 3. le lettere: il filo esterno attorno a tutto, poi ognuna col suo blocco 3D pieno, il contorno, il riempimento, le fessure
    const OUT = cv(Wp, Hp), ox = OUT.getContext('2d'); if (S0.scribble) scribble(bg, Wp, Hp, S0.ol, r, u); ox.drawImage(BG, 0, 0);
    if (S0.outer) for (let s = 0; s <= steps; s++) { if (S3 && s && s < steps) continue; B.L.forEach(l => fillBody(ox, l, ol * (V.kv === 'sottile' ? 1.5 : 2.4), S0.outer, dx * s / steps, dy * s / steps)); }
    order.forEach(i => { const l = B.L[i]; for (let s = steps; s >= 1; s--) { if (S3 && s < steps) continue; fillBody(ox, l, ol * 2, S0.ol, dx * s / steps, dy * s / steps); } });   // il blocco del 3D col suo bordo, dietro a tutto
    order.forEach(i => { const l = B.L[i]; for (let s = steps; s >= 1; s--) { if (S3 && s < steps) continue; fillBody(ox, l, ol, S0.d3, dx * s / steps, dy * s / steps); } });   // [writer] gonfiato quanto il contorno: copre i bordi dei gradini, resta solo quello esterno
    order.forEach(i => {
      const l = B.L[i];
      if (S0.d3 === S0.ol) { ox.strokeStyle = S0.fill === 'chrome' ? '#fff' : S0.fill; ox.lineWidth = Math.max(1, ol * .35); ox.globalAlpha = .5; bodyPath(ox, l, -ol * .1, dx * .55, dy * .55); ox.stroke(); ox.globalAlpha = 1; }   // la riga del 3D (nel bozzetto)
      fillBody(ox, l, ol, S0.ol, 0, 0); fillBody(ox, l, 0, fillCol(S0.fill), 0, 0);
      if (V.fillv) fillVariant(ox, l, V.fillv, S0.bands || [shade(S0.fill, .35), S0.fill, shade(S0.fill, -.28)], B.box, u, r);
      if (V.olv === 'doppio') { ox.strokeStyle = S0.fill === 'chrome' ? '#ffffff' : shade(S0.bands ? S0.bands[0] : S0.fill, .55); ox.lineWidth = Math.max(1.2, ol * .45); bodyPath(ox, l, -ol * 1.1, 0, 0); ox.stroke(); }   // la seconda linea dentro
      if (false && S0.bands) { ox.save(); bodyPath(ox, l, 0, 0, 0); ox.clip(); const [a0, b0, a1, b1] = B.box, hh = b1 - b0, cut = (yy, k) => { ox.beginPath(); ox.moveTo(a0 - u, yy); for (let xx = a0 - u; xx <= a1 + u; xx += u * .2) ox.lineTo(xx, yy + Math.sin((xx - a0) / (a1 - a0 + 1) * PI * (1.2 + k * .3) + k) * hh * .04); ox.lineTo(a1 + u, b1 + u); ox.lineTo(a0 - u, b1 + u); ox.closePath(); };
        ox.fillStyle = S0.bands[0]; ox.fillRect(a0 - u, b0 - u, a1 - a0 + 2 * u, hh + 2 * u); ox.fillStyle = S0.bands[1]; cut(b0 + hh * .42, 0); ox.fill(); ox.fillStyle = S0.bands[2]; cut(b0 + hh * .74, 1); ox.fill(); ox.restore(); }   // [writer] la sfumatura dei pezzi: bande nette col taglio curvo, uguale su tutto
      else if (!V.fillv && (S0.ref || (S0.fill !== 'chrome' && q > .4))) markerFill(ox, l, S0.ref ? S0 : { fill: S0.fill, shade: null, ol: S0.ol }, u, r);   // [writer] le passate del marker, l'ombra in basso
      if (S0.fill2 && q > .45) { ox.save(); bodyPath(ox, l, 0, 0, 0); ox.clip(); const [a0, b0, a1, b1] = B.box; ox.fillStyle = S0.fill2; ox.beginPath(); ox.moveTo(a0, (b0 + b1) * .58); for (let xx = a0; xx <= a1; xx += u * .35) ox.lineTo(xx, (b0 + b1) * .58 + Math.sin(xx / u * 4) * u * .05); ox.lineTo(a1, b1); ox.lineTo(a0, b1); ox.fill(); ox.restore(); }   // la sfumatura a onda (due colori)
      ox.fillStyle = S0.slit; l.holes.forEach(h => { ox.beginPath(); if (SQ) rrect(ox, h.c[0], h.c[1], Math.max(ol, h.rx * .8), Math.max(ol, h.ry), h.rot, Math.max(ol, h.rx * .8) * .4); else ox.ellipse(h.c[0], h.c[1], Math.max(ol, h.rx), Math.max(ol, h.ry), h.rot, 0, 7); ox.fill(); });   // [writer] nei pezzi i buchi sono squadrati come le lettere   // i buchi
      ox.strokeStyle = S0.slit; ox.lineWidth = ol * 1.15; ox.lineCap = 'round'; ox.lineJoin = 'round'; l.slits.forEach(sl => { ox.save(); bodyPath(ox, l, -ol * .2, 0, 0); ox.clip(); ox.beginPath(); sl.forEach(([a, b], k) => k ? ox.lineTo(a, b) : ox.moveTo(a, b)); ox.stroke(); ox.restore(); });
      // le luci: un arco e un puntino sul cuscinetto più grande, in alto a sinistra
      const big = l.body.reduce((a, b) => (b.r > a.r ? b : a)), bc = big.c || [(big.a[0] + big.b[0]) / 2, Math.min(big.a[1], big.b[1])];
      if (S0.ref) { if (!S0.flat) glints(ox, S0.pz ? { body: [l.body.reduce((a, c) => (c.r > a.r ? c : a))] } : l, S0.shine, u, r); if (i === faceI) letterFace(ox, l, S0, u, r); else if (S0.marks || r() < (S0.pz ? .2 : .35)) innerMarks(ox, l, S0, u, r, w.aka || 'NINO', (S0.marks || 1) + Math.floor(r() * 2)); } else { ox.strokeStyle = S0.shine; ox.fillStyle = S0.shine; ox.lineWidth = Math.max(1.5, ol * .8); ox.beginPath(); ox.arc(bc[0], bc[1], big.r * .62, PI * 1.08, PI * 1.42); ox.stroke(); ox.beginPath(); ox.arc(bc[0] + Math.cos(PI * 1.55) * big.r * .62, bc[1] + Math.sin(PI * 1.55) * big.r * .62, ol * .7, 0, 7); ox.fill(); }
      if (C.fam === 'throwie' && S0.fill === '#141418') { if (i === faceI2) letterFace(ox, l, S0, u, r); else if (r() < .7) innerMarks(ox, l, S0, u, r, w.aka || 'NINO', 1 + Math.floor(r() * 2)); }   // [writer] la throwie nera: spirali, crocette, «=» bianchi dentro
      else if (C.fam === 'throwie' && r() < .3) doodles(ox, [{ pts: [bc, [bc[0], bc[1] + big.r * .4]] }], big.r * 1.4, r, S0.shine, true, false, r() < .4);
    });
    if (r() < (throwUp ? .6 : .35) + (1 - q) * .3) realDrips(ox, B, dx, dy, ol, S0.ol, u, r, Wp, Hp, .6 + (1 - q) * .8);   // [writer] le colature vere, dal bordo basso, a gruppi
    x.clearRect(0, 0, Wp, Hp); x.drawImage(OUT, 0, 0); snap(x.canvas); paths.push(pts.slice()); radii.push(u * .38);
    // 4. i dettagli: la firma, l'anno, lo slogan, qualche stellina
    const [bx0, by0, bx1, by1] = B.box;
    if (S0.ref && (!S0.pz || r() < .5)) decorate(x, B, S0, u, r, w.aka || 'NINO', Wp, Hp, ol);
    else if (C.fam === 'throwie' && S0.fill === '#141418' && r() < .6) decorate(x, B, Object.assign({}, S0, { deco: '#141418' }), u, r, w.aka || 'NINO', Wp, Hp, ol);   // [writer] aureole, corone, crocette, stelline, mini-tag, gocce
    else if (q > .6) for (let k = 0; k < 2; k++) sparkle(x, bx0 + r() * (bx1 - bx0), by0 + r() * (by1 - by0) * .3, u * .08, S0.shine === '#141418' ? '#141418' : '#ffffff');
    smallTag(x, w.words && w.aka ? w.aka + ' ' + (w.crew || 'PV') : (w.crew || 'PV'), Math.min(Wp - Hp * .3, bx1 - Hp * .15), Math.min(Hp - sloganH - Hp * .06, by1 + ol * 2), Hp * .1, S0.ol === '#f6f4ee' ? '#141418' : S0.ol, r, Wp * .3);
    if (!throwUp && C.yr) smallTag(x, C.yr, bx0 + Hp * .12, Math.max(Hp * .06, by0 + Hp * .02), Hp * .08, S0.ol === '#f6f4ee' ? '#141418' : S0.ol, r);
    if (sloganH) { const r2 = mulberry((w.seed || 1) + 99), r3 = mulberry((w.seed || 1) + 99); smallTag(x, C.slogan, Wp / 2, Hp - sloganH * .55, sloganH * .7, '#ffffff', r2, Wp * .85, 2.6); smallTag(x, C.slogan, Wp / 2, Hp - sloganH * .55, sloganH * .7, '#141418', r3, Wp * .85); }
    snap(x.canvas); paths.push(raster(Wp, Hp, 2)); radii.push(Hp * .2);
  }

  // ================= I PERSONAGGI (lavoro a sé: lo «stile» mostro) =================
  function monsterArt(w, P, r, Wp, Hp, snap, paths, radii, x) {
    // il corpo: tre-sei passate di rullo (linee grasse a capo tondo) buttate giù di getto; la loro unione è la sagoma
    const ign = r() < .45, lw = Math.max(3, Hp * (ign ? .016 : .022)), K = '#101012', body = r() < .5 ? '#f2efe6' : pickR(r, FLATS.concat([P.f[0], P.f[1]])), body2 = !ign && r() < .5 ? pickR(r, FLATS) : null;   // ign: l'ignorant style (linea unica, niente ombre, faccia da niente)
    const cx = Wp * (.42 + r() * .16), cy = Hp * (.52 + r() * .06), R0 = Math.min(Wp * .25, Hp * .25), rolls = [];
    const nR = 3 + Math.floor(r() * 4);
    for (let k = 0; k < nR; k++) { const a = r() * PI, l = R0 * (.6 + r() * 1.1), ox = (r() - .5) * R0 * 1.1, oy = (r() - .5) * R0 * .9, wd = R0 * (.55 + r() * .55); rolls.push({ a: [cx + ox - Math.cos(a) * l / 2, cy + oy - Math.sin(a) * l / 2], b: [cx + ox + Math.cos(a) * l / 2, cy + oy + Math.sin(a) * l / 2], w: wd, col: body2 && k === nR - 1 ? body2 : body }); }
    // le appendici: corna, orecchie, braccia, gambe (passate più sottili che escono dalla sagoma)
    const top = rolls.reduce((m, q) => Math.min(m, q.a[1] - q.w / 2, q.b[1] - q.w / 2), 1e9), bot = rolls.reduce((m, q) => Math.max(m, q.a[1] + q.w / 2, q.b[1] + q.w / 2), -1e9);
    const lims = []; if (r() < .7) for (const sx of [-1, 1]) lims.push({ a: [cx + sx * R0 * .4, top + R0 * .25], b: [cx + sx * R0 * (.55 + r() * .35), top - R0 * (.35 + r() * .45)], w: R0 * (.12 + r() * .1), col: body });
    for (const sx of [-1, 1]) if (r() < .75) { const ay = cy + (r() - .3) * R0 * .5, ax = cx + sx * R0 * 1.05; lims.push({ a: [ax - sx * R0 * .3, ay], b: [ax + sx * R0 * (.3 + r() * .3), ay - R0 * (.2 + r() * .6)], w: R0 * (.16 + r() * .08), col: body }); }
    for (const sx of [-1, 1]) if (r() < .6) lims.push({ a: [cx + sx * R0 * .35, bot - R0 * .2], b: [cx + sx * R0 * (.4 + r() * .2), bot + R0 * (.2 + r() * .15)], w: R0 * .2, col: body });
    const all = rolls.concat(lims), roll = (ctx, q, extra, col) => { ctx.strokeStyle = col; ctx.lineWidth = q.w + extra; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(q.a[0], q.a[1]); ctx.quadraticCurveTo((q.a[0] + q.b[0]) / 2 + (q.b[1] - q.a[1]) * .15, (q.a[1] + q.b[1]) / 2 - (q.b[0] - q.a[0]) * .15, q.b[0], q.b[1]); ctx.stroke(); };
    // 1. le macchie (con la trama del rullo: righe nel verso della passata)
    const F0 = cv(Wp, Hp), f0 = F0.getContext('2d');
    all.forEach(q => { roll(f0, q, 0, q.col); }); f0.save(); f0.globalCompositeOperation = 'source-atop';
    all.forEach(q => { const a = Math.atan2(q.b[1] - q.a[1], q.b[0] - q.a[0]); for (let k = 0; k < 7; k++) { const o = (k / 6 - .5) * q.w * .9; f0.strokeStyle = k % 2 ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.07)'; f0.lineWidth = q.w * .1; f0.beginPath(); f0.moveTo(q.a[0] - Math.sin(a) * o, q.a[1] + Math.cos(a) * o); f0.lineTo(q.b[0] - Math.sin(a) * o, q.b[1] + Math.cos(a) * o); f0.stroke(); } }); f0.restore();
    x.drawImage(F0, 0, 0); snap(x.canvas); paths.push(all.flatMap(q => [q.a, [(q.a[0] + q.b[0]) / 2, (q.a[1] + q.b[1]) / 2], q.b])); radii.push(R0 * .45);
    // 2. la linea nera attorno a tutto (sotto le macchie: resta solo il bordo), un po' fuori registro come fatta dopo, a mano
    const O = cv(Wp, Hp), o = O.getContext('2d'), mis = lw * .6; all.forEach(q => roll(o, { a: [q.a[0] + mis, q.a[1] - mis * .5], b: [q.b[0] + mis, q.b[1] - mis * .5], w: q.w }, lw * 2, K)); o.drawImage(F0, 0, 0);
    if (!ign) { o.save(); o.globalCompositeOperation = 'source-atop'; o.fillStyle = 'rgba(0,0,0,.16)'; o.beginPath(); o.ellipse(cx + R0 * .7, cy + R0 * .4, R0 * .7, R0 * 1.3, -.4, 0, 7); o.fill(); o.restore(); }   // l'ombra di lato
    x.clearRect(0, 0, Wp, Hp); x.drawImage(O, 0, 0); snap(x.canvas); paths.push(all.flatMap(q => [q.a, q.b])); radii.push(R0 * .3);
    // 3. la faccia, dove la sagoma lo permette: gli occhi in alto, la bocca coi denti sotto
    if (ign) {   // la faccia da niente: due puntini storti, una linea per bocca (a volte coi denti contati), una X
      const ey2 = top + R0 * (.5 + r() * .2); x.fillStyle = K; x.strokeStyle = K; x.lineWidth = lw; x.lineCap = 'round';
      [-1, 1].forEach(sx => { const ex = cx + sx * R0 * (.22 + r() * .1), ey3 = ey2 + (r() - .5) * R0 * .12; if (r() < .2) { x.beginPath(); x.moveTo(ex - R0 * .07, ey3 - R0 * .07); x.lineTo(ex + R0 * .07, ey3 + R0 * .07); x.moveTo(ex + R0 * .07, ey3 - R0 * .07); x.lineTo(ex - R0 * .07, ey3 + R0 * .07); x.stroke(); } else { x.beginPath(); x.arc(ex, ey3, R0 * (.05 + r() * .04), 0, 7); x.fill(); } });
      const my2 = ey2 + R0 * (.4 + r() * .2), mw2 = R0 * (.3 + r() * .3); x.beginPath(); x.moveTo(cx - mw2, my2 + (r() - .5) * R0 * .1); x.quadraticCurveTo(cx, my2 + (r() - .3) * R0 * .3, cx + mw2, my2 + (r() - .5) * R0 * .1); x.stroke();
      if (r() < .5) for (let k = 1; k < 5; k++) { const tx = cx - mw2 + k * mw2 * .4; x.beginPath(); x.moveTo(tx, my2 - R0 * .05); x.lineTo(tx, my2 + R0 * .06); x.stroke(); }
      if (w.aka) smallTag(x, w.aka, Wp * .8, Hp * .9, Hp * .07, K, r, Wp * .3);
      snap(x.canvas); paths.push(raster(Wp, Hp, 3)); radii.push(Hp * .12); return;
    }
    const Wh = '#ffffff', ne = pickR(r, [1, 2, 2, 2, 3]), ey = top + R0 * (.45 + r() * .2);
    for (let k = 0; k < ne; k++) { const ex = cx + (ne === 1 ? 0 : (k / (ne - 1) - .5) * R0 * (ne === 3 ? 1 : .75)) + (r() - .5) * R0 * .1, er = R0 * (ne === 1 ? .38 : .22) * (.85 + r() * .35);
      x.fillStyle = Wh; x.strokeStyle = K; x.lineWidth = lw; x.beginPath(); x.ellipse(ex, ey, er, er * (.9 + r() * .3), (r() - .5) * .3, 0, 7); x.fill(); x.stroke(); const lk = (r() - .5) * er * .7; x.fillStyle = K; x.beginPath(); x.arc(ex + lk, ey + er * .15, er * .4, 0, 7); x.fill(); x.fillStyle = Wh; x.beginPath(); x.arc(ex + lk - er * .14, ey, er * .11, 0, 7); x.fill();
      if (r() < .45) { x.lineWidth = lw * 1.3; x.lineCap = 'round'; x.beginPath(); x.moveTo(ex - er * 1.1, ey - er * (1.2 + r() * .3)); x.lineTo(ex + er * .9, ey - er * (.8 + r() * .5)); x.stroke(); } }
    const mx = cx + (r() - .5) * R0 * .2, my = Math.min(bot - R0 * .4, ey + R0 * (.55 + r() * .25)), mw = R0 * (.45 + r() * .35), mh = R0 * (.22 + r() * .2), sad = r() < .2;
    x.fillStyle = '#2a1416'; x.strokeStyle = K; x.lineWidth = lw; x.beginPath(); if (sad) x.ellipse(mx, my + mh, mw, mh, 0, PI, 0); else x.ellipse(mx, my, mw, mh, 0, 0, PI); x.closePath(); x.fill(); x.stroke();
    if (!sad) { x.fillStyle = Wh; const nT = 4 + Math.floor(r() * 6), crooked = r() < .5; for (let k = 0; k < nT; k++) { const tx = mx - mw * .9 + (k + .5) / nT * mw * 1.8, tw = mw / nT * .85, th = mh * (.4 + r() * (crooked ? .5 : .15)); x.beginPath(); x.moveTo(tx - tw, my); x.lineTo(tx + (crooked ? (r() - .5) * tw : 0), my + th); x.lineTo(tx + tw, my); x.closePath(); x.fill(); x.lineWidth = lw * .5; x.stroke(); } if (r() < .5) { x.fillStyle = '#e86a7a'; x.beginPath(); x.ellipse(mx + mw * .2, my + mh * .7, mw * .3, mh * .25, 0, 0, 7); x.fill(); } }
    x.strokeStyle = K; x.lineWidth = lw * .7; x.lineCap = 'round'; for (let k = 0; k < 12; k++) { const a = r() * PI * 2, d = R0 * (1.35 + r() * .35), px0 = cx + Math.cos(a) * d * 1.15, py0 = cy + Math.sin(a) * d * .85; if (px0 < lw || px0 > Wp - lw || py0 < lw || py0 > Hp - lw) continue; x.beginPath(); x.moveTo(px0, py0); x.lineTo(px0 + Math.cos(a) * lw * 3, py0 + Math.sin(a) * lw * 3); x.stroke(); }   // i segni del movimento
    if (w.aka) smallTag(x, w.aka + ' ' + (w.crew || ''), Wp * .82, Hp * .92, Hp * .07, K, r, Wp * .3);
    snap(x.canvas); paths.push(raster(Wp, Hp, 3)); radii.push(Hp * .12);
  }
  // ================= LA MANO SULLA VERNICE =================
  // Quello che rende un lavoro vivo invece di un carattere tipografico: la deformazione continua del braccio (un campo morbido
  // che piega tutte le linee insieme, uguale per ogni tappa dello stesso lavoro), la nebbia dello spray attorno ai bordi, la grana,
  // le passate del riempimento, le colature. Tutto dal seme: lo stesso lavoro si ridisegna uguale.
  function warpField(seed, Wp, Hp, amp) {
    const r = mulberry(seed ^ 0x51ed27), comps = [];
    for (let k = 0; k < 4; k++) comps.push({ fx: (.6 + r() * 1.6) / Hp, fy: (.6 + r() * 1.6) / Hp, ph: r() * 7, ax: (r() - .5) * 2, ay: (r() - .5) * 2, w: 1 / (k + 1) });
    return (x, y) => { let dx = 0, dy = 0; for (const c of comps) { const s0 = Math.sin(x * c.fx * 6.283 + y * c.fy * 2.1 + c.ph) * c.w, s1 = Math.cos(y * c.fy * 6.283 - x * c.fx * 1.7 + c.ph * 1.3) * c.w; dx += s0 * c.ax + s1 * .4; dy += s1 * c.ay + s0 * .4; } return [dx * amp, dy * amp]; };
  }
  function handify(cnv, seed, q, opt) {
    const W = cnv.width, H = cnv.height, x = cnv.getContext('2d'), K = opt && opt.amp != null ? opt.amp : 1, amp = H * (.006 + (1 - q) * .01) * K;
    // 1. il braccio: tutto si piega un poco, insieme (bilineare); [graffiti4] e la mano trema: un secondo campo, più fitto e più
    // piccolo, piega i contorni come una linea fatta a mano libera (nelle foto nessuna linea è dritta né parallela all'altra)
    const src = x.getImageData(0, 0, W, H), dst = x.createImageData(W, H), S = src.data, D = dst.data, f = warpField(seed, W, H, amp), f2 = warpField(seed ^ 0x6a09, H / 7, H / 7, H * .0016 * K * (1.4 - q * .6)), rg = mulberry(seed ^ 0x2b7e15), ph1 = rg() * 7, ph2 = rg() * 7, ph3 = rg() * 7, ph4 = rg() * 7;
    // [graffiti4] la vernice sul muro: un filo spenta (la polvere, il sole), coperta a passate (dove la passata è scarica il muro
    // si vede sotto), e se il lavoro è vecchio sbiadita, sporca, scrostata
    const age = opt && opt.age ? opt.age : 0, dull = opt && opt.noSpray ? 0 : .1 + age * .3, thin = opt && opt.noSpray ? 0 : .1 + age * .25;
    for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
      const [dx0, dy0] = f(xx, yy), [dx1, dy1] = f2(xx, yy), sx = clamp(xx + dx0 + dx1, 0, W - 1.001), sy = clamp(yy + dy0 + dy1, 0, H - 1.001), x0 = sx | 0, y0 = sy | 0, ax = sx - x0, ay = sy - y0, i00 = (y0 * W + x0) * 4, i10 = i00 + 4, i01 = i00 + W * 4, i11 = i01 + 4, o = (yy * W + xx) * 4;
      for (let c = 0; c < 4; c++) D[o + c] = (S[i00 + c] * (1 - ax) + S[i10 + c] * ax) * (1 - ay) + (S[i01 + c] * (1 - ax) + S[i11 + c] * ax) * ay;
      if (D[o + 3] > 8 && !(opt && opt.noSpray)) {   // [writer] la vernice copre a nuvole (passate più cariche e più scariche), la grana fine, qualche buco dove si vede il muro
        const cl = Math.sin(xx * .021 + ph1) * Math.sin(yy * .029 + ph2) + Math.sin((xx + yy * .7) * .013 + ph3) * .6, cl2 = Math.sin(xx * .06 + yy * .011 + ph4) * Math.sin(yy * .05 - xx * .02 + ph1), gr = rg() - .5, m = 1 + cl * .06 + cl2 * .03 + gr * .08;
        let R0 = D[o] * m, G0 = D[o + 1] * m, B0 = D[o + 2] * m; const lu = R0 * .3 + G0 * .59 + B0 * .11;
        R0 += (lu - R0) * dull + (196 - R0) * age * .12; G0 += (lu - G0) * dull + (188 - G0) * age * .12; B0 += (lu - B0) * dull + (172 - B0) * age * .12;   // spenta verso il grigio, e verso il colore del muro se vecchia
        D[o] = clamp(R0, 0, 255); D[o + 1] = clamp(G0, 0, 255); D[o + 2] = clamp(B0, 0, 255);
        const cover = 1 - thin * clamp(.5 - cl * .45 - cl2 * .3 + gr * .5, 0, 1);   // la copertura: il muro passa sotto le passate scariche
        D[o + 3] *= cover; if (rg() < .003 + age * .01) D[o + 3] *= .3;
      }
    }
    x.putImageData(dst, 0, 0);
    if (age > 0 && !(opt && opt.noSpray)) {   // [graffiti4] il tempo: le righe sporche della pioggia dall'alto, la crosta che salta, la polvere dal basso
      const ra = mulberry(seed ^ 0xa9e), sc = Math.max(1, H / 200); x.save(); x.globalCompositeOperation = 'source-atop';
      for (let k = 0; k < W / (14 * sc) * age; k++) { const sx = ra() * W, sw = (2 + ra() * 6) * sc, L = H * (.2 + ra() * .8), g = x.createLinearGradient(0, 0, 0, L); g.addColorStop(0, `rgba(40,34,28,${(.12 + ra() * .18) * age})`); g.addColorStop(1, 'rgba(40,34,28,0)'); x.fillStyle = g; x.fillRect(sx, 0, sw, L); }
      { const g = x.createLinearGradient(0, H * .7, 0, H); g.addColorStop(0, 'rgba(70,58,44,0)'); g.addColorStop(1, `rgba(70,58,44,${.35 * age})`); x.fillStyle = g; x.fillRect(0, H * .7, W, H * .3); }
      x.globalCompositeOperation = 'destination-out';
      for (let k = 0; k < 30 * age * (W / H); k++) { const cx = ra() * W, cy = ra() * H, rr = (1 + ra() * ra() * 9) * sc; x.globalAlpha = .5 + ra() * .5; x.beginPath(); for (let j = 0; j < 7; j++) { const a = j / 7 * PI * 2, d = rr * (.5 + ra() * .7); x.lineTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d); } x.closePath(); x.fill(); }   // la crosta che salta: buchi storti dove si vede il muro
      x.restore();
    }
    if (opt && opt.noSpray) return cnv;
    const crisp = opt && opt.crisp;   // [graffiti4] l'inchiostro: il bordo resta netto, la nebbia appena
    { const k0 = cv(W, H), k0x = k0.getContext('2d'); k0x.filter = `blur(${Math.max(crisp ? .3 : .45, H * (crisp ? .001 : .0022)).toFixed(2)}px)`; k0x.drawImage(cnv, 0, 0); x.clearRect(0, 0, W, H); x.drawImage(k0, 0, 0); }   // [writer] niente bordi da vettoriale: lo spray ammorbidisce sempre un filo
    // 2. la nebbia: una copia sfocata dietro (lo spray non ha mai il bordo netto come un pennarello)
    const k = cv(W, H), kx = k.getContext('2d'); kx.filter = `blur(${Math.max(1, H * .006).toFixed(1)}px)`; kx.drawImage(cnv, 0, 0); kx.filter = 'none';
    x.save(); x.globalCompositeOperation = 'destination-over'; x.globalAlpha = crisp ? .3 : .75; x.drawImage(k, 0, 0); x.restore();
    { const m2 = cv(W, H), mx2 = m2.getContext('2d'); mx2.filter = `blur(${Math.max(2, H * .02).toFixed(1)}px)`; mx2.drawImage(cnv, 0, 0); x.save(); x.globalCompositeOperation = 'destination-over'; x.globalAlpha = crisp ? .07 : .2; x.drawImage(m2, 0, 0); x.restore(); }   // [writer] la nebbia larga dell'overspray
    // 3. la grana: puntini del colore del bordo, appena fuori
    const r = mulberry(seed ^ 0x3c6ef3), img = x.getImageData(0, 0, W, H).data, n = Math.round(W * H / 45);
    for (let i = 0; i < n; i++) { const px = Math.floor(r() * W), py = Math.floor(r() * H), j = (py * W + px) * 4; if (img[j + 3] < 200) continue; const a = r() * 6.283, d = 1 + r() * H * .022, qx = px + Math.cos(a) * d, qy = py + Math.sin(a) * d, jj = ((qy | 0) * W + (qx | 0)) * 4; if (qx < 0 || qy < 0 || qx >= W || qy >= H || img[jj + 3] > 60) continue; x.fillStyle = `rgba(${img[j]},${img[j + 1]},${img[j + 2]},${(.35 + r() * .5).toFixed(2)})`; const sz = r() < .15 ? 2 : 1; x.fillRect(qx, qy, sz, sz); }
    return cnv;
  }
  // le passate del riempimento: strisce morbide più chiare e più scure, come le braccia che vanno avanti e indietro
  function passes(x, box, lw, r, Wp, Hp) {
    const [a0, b0, a1, b1] = box; x.save(); x.globalCompositeOperation = 'source-atop'; x.lineCap = 'round';
    x.filter = `blur(${Math.max(1, lw * .12).toFixed(1)}px)`;
    for (let k = 0; k < 9; k++) { const xx = a0 + (a1 - a0) * r(), th = lw * (.4 + r() * .7), ang = .9 + (r() - .5) * .5; x.strokeStyle = r() < .55 ? 'rgba(255,255,255,.09)' : 'rgba(0,0,0,.07)'; x.lineWidth = th; x.beginPath(); x.moveTo(xx - Math.cos(ang) * Hp, b1 + lw); x.lineTo(xx + Math.cos(ang) * Hp * .4, b0 - lw); x.stroke(); }
    x.filter = 'none';
    x.restore();
  }

  // ================= LE LETTERE BLOCKBUSTER (block, heavy, fill-in, solo contorno, astratto) =================
  // Lettere progettate, non scheletri ingrassati: aste e barre piene dello stesso spessore t, le diagonali solo dove servono,
  // i buchi netti. Casella alta 1 (y in giù), larga w. Ogni writer sceglie spessore, larghezza, inclinazione, angoli (vivi,
  // smussati, tondi), spaziatura. Contorno, 3D e bordo si fanno sulla maschera della lettera: sfocata e tagliata a soglia, così
  // il contorno è chiuso e di spessore costante.
  // [graffiti3] le lettere tonde (O, C, D, G, U, J, Q, le pance di B, P, R) sono archi veri: un anello coi suoi buchi (`hole`:
  // il poligono si toglie dalla maschera), non più barre e smussi a triangolo. Le altre restano barre: i blockbuster sono squadrati.
  function blockGlyph(ch, t, w) {
    const P = [], R = (x0, y0, x1, y1) => P.push([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
    const D = (x0, y0, x1, y1, th) => { const dx = x1 - x0, dy = y1 - y0, l = hyp(dx, dy) || 1, nx = -dy / l * th / 2, ny = dx / l * th / 2; P.push([[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]]); };
    // il rettangolo coi quattro angoli tondi (raggi: alto sinistra, alto destra, basso destra, basso sinistra), 7 segmenti per arco
    const RR = (x0, y0, x1, y1, rs, hole) => { const o = [], cs = [[x1, y0, rs[1], -PI / 2], [x1, y1, rs[2], 0], [x0, y1, rs[3], PI / 2], [x0, y0, rs[0], PI]];
      cs.forEach(([cx, cy, rr, a0], i) => { const r0 = Math.max(0, Math.min(rr, (x1 - x0) / 2, (y1 - y0) / 2)), sx = i === 0 || i === 1 ? -1 : 1, sy = i === 0 || i === 3 ? 1 : -1, ccx = cx + sx * r0, ccy = cy + sy * r0; if (r0 <= 0) { o.push([cx, cy]); return; } for (let k = 0; k <= 7; k++) { const a = a0 + k / 7 * PI / 2; o.push([ccx + Math.cos(a) * r0, ccy + Math.sin(a) * r0]); } });
      if (hole) o.hole = true; P.push(o); };
    const ring = (x0, y0, x1, y1, rs, tx, ty) => { RR(x0, y0, x1, y1, rs); RR(x0 + tx, y0 + ty, x1 - tx, y1 - ty, rs.map(v => Math.max(0, v - Math.min(tx, ty))), true); };   // l'anello: la sagoma tonda e dentro il buco
    const H = (x0, y0, x1, y1) => { P.push(Object.assign([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], { hole: true })); };   // un taglio: toglie un rettangolo
    const th = Math.min(t, .22), m = .5 - th / 2, h2 = t / 2;   // le barre orizzontali un po' più sottili delle aste: i buchi restano aperti anche nelle lettere pesanti
    const rb = Math.min(.5, w * .45);   // il raggio delle pance
    switch (ch) {
      case 'A': R(0, t * .9, t, 1); R(w - t, t * .9, w, 1); R(0, 0, w, th); R(0, m + .04, w, m + .04 + th); break;
      case 'B': ring(0, 0, w * .92, m + th, [0, rb * .8, rb * .8, 0], t, th); ring(0, m, w, 1, [0, rb, rb, 0], t, th); R(0, 0, t, 1); break;
      case 'C': ring(0, 0, w, 1, [rb, rb, rb, rb], t, th); H(w - t - .02, th * 1.25, w + .1, 1 - th * 1.25); break;
      case 'D': ring(0, 0, w, 1, [0, rb, rb, 0], t, th); break;
      case 'E': R(0, 0, t, 1); R(0, 0, w, th); R(0, m, w * .82, m + th); R(0, 1 - th, w, 1); break;
      case 'F': R(0, 0, t, 1); R(0, 0, w, th); R(0, m, w * .82, m + th); break;
      case 'G': ring(0, 0, w, 1, [rb, rb, rb, rb], t, th); H(w - t - .02, th * 1.25, w + .1, m); R(w * .48, m, w, m + th); break;
      case 'H': R(0, 0, t, 1); R(w - t, 0, w, 1); R(0, m, w, m + th); break;
      case 'I': R(0, 0, t, 1); break;
      case 'J': R(w - t, 0, w, .7); ring(0, .3, w, 1, [0, 0, rb, rb], t, th); H(t - .01, .2, w - t + .01, .55); H(-.1, .2, t, .55); break;
      case 'K': R(0, 0, t, 1); D(t * .6, .56, w - h2 * .8, h2 * .8, t * 1.05); D(t * .6, .44, w - h2 * .8, 1 - h2 * .8, t * 1.05); break;
      case 'L': R(0, 0, t, 1); R(0, 1 - th, w, 1); break;
      case 'M': R(0, 0, t, 1); R(w - t, 0, w, 1); R(0, 0, w, th); R(w / 2 - t / 2, 0, w / 2 + t / 2, .72); break;
      case 'N': R(0, 0, t, 1); R(w - t, 0, w, 1); D(h2, h2 * .6, w - h2, 1 - h2 * .6, t * 1.15); break;
      case 'O': case '0': ring(0, 0, w, 1, [rb, rb, rb, rb], t, th); break;
      case 'P': ring(0, 0, w, m + th, [0, rb, rb, 0], t, th); R(0, 0, t, 1); break;
      case 'Q': ring(0, 0, w, 1, [rb, rb, rb, rb], t, th); D(w * .55, .7, w + t * .45, 1.12, t * .9); break;
      case 'R': ring(0, 0, w, m + th, [0, rb, rb, 0], t, th); R(0, 0, t, 1); D(w * .5, m + t * .6, w - h2, 1 - h2 * .4, t * 1.05); break;
      case 'S': R(t * .35, 0, w, th); R(0, 0, t, m + th); R(0, m, w, m + th); R(w - t, m, w, 1); R(0, 1 - th, w - t * .35, 1); break;
      case 'T': R(0, 0, w, th); R(w / 2 - t / 2, 0, w / 2 + t / 2, 1); break;
      case 'U': ring(0, 0, w, 1, [0, 0, rb, rb], t, th); H(t - .01, -.1, w - t + .01, .5); break;
      case 'V': D(h2, 0, w / 2, 1 - h2 * .5, t * 1.1); D(w - h2, 0, w / 2, 1 - h2 * .5, t * 1.1); break;
      case 'W': R(0, 0, t, 1); R(w - t, 0, w, 1); R(0, 1 - th, w, 1); R(w / 2 - t / 2, .28, w / 2 + t / 2, 1); break;
      case 'X': D(h2, h2 * .5, w - h2, 1 - h2 * .5, t * 1.1); D(w - h2, h2 * .5, h2, 1 - h2 * .5, t * 1.1); break;
      case 'Y': D(h2, 0, w / 2, .52, t * 1.05); D(w - h2, 0, w / 2, .52, t * 1.05); R(w / 2 - t / 2, .45, w / 2 + t / 2, 1); break;
      case 'Z': R(0, 0, w, th); R(0, 1 - th, w, 1); D(w - h2 * 1.2, t * .9, h2 * 1.2, 1 - t * .9, t * 1.1); break;
      case '1': R(w / 2 - t / 2, 0, w / 2 + t / 2, 1); R(w / 2 - t * 1.4, 0, w / 2, t); break;
      case '2': R(0, 0, w, th); R(w - t, 0, w, m + th); R(0, m, w, m + th); R(0, m, t, 1); R(0, 1 - th, w, 1); break;
      case '3': R(0, 0, w, th); R(w - t, 0, w, 1); R(w * .25, m, w, m + th); R(0, 1 - th, w, 1); break;
      case '4': R(0, 0, t, m + th); R(0, m, w, m + th); R(w - t * 1.4, 0, w - t * .4, 1); break;
      case '5': R(0, 0, w, th); R(0, 0, t, m + th); R(0, m, w, m + th); R(w - t, m, w, 1); R(0, 1 - th, w, 1); break;
      case '6': R(0, 0, t, 1); R(0, 0, w, th); R(0, m, w, m + th); R(w - t, m, w, 1); R(0, 1 - th, w, 1); break;
      case '7': R(0, 0, w, th); D(w - h2, t * .8, w * .35, 1 - h2 * .3, t * 1.1); break;
      case '8': R(0, 0, t, 1); R(w - t, 0, w, 1); R(0, 0, w, th); R(0, m, w, m + th); R(0, 1 - th, w, 1); break;
      case '9': R(0, 0, w, th); R(0, 0, t, m + th); R(0, m, w, m + th); R(w - t, 0, w, 1); R(0, 1 - th, w, 1); break;
      default: R(0, 0, t, 1);
    }
    return P;
  }
  // [graffiti3] la maschera di una lettera: prima le sagome piene, poi i buchi (gli anelli delle lettere tonde) tolti
  function fillPolys(mx, l, toPx) {
    mx.fillStyle = '#fff'; const draw = pl => { mx.beginPath(); pl.forEach((p, k) => { const [a, b] = toPx(l, p); k ? mx.lineTo(a, b) : mx.moveTo(a, b); }); mx.closePath(); mx.fill(); };
    l.polys.forEach(pl => { if (!pl.hole) draw(pl); }); mx.globalCompositeOperation = 'destination-out'; l.polys.forEach(pl => { if (pl.hole) draw(pl); }); mx.globalCompositeOperation = 'source-over';
  }
  // larghezza della lettera (in altezze): le strette e le larghe
  const BW = ch => ch === 'I' ? 0 : ch === '1' ? .55 : /[MW]/.test(ch) ? 1.3 : /[TYVXA]/.test(ch) ? 1.05 : 1;
  // sfocatura e soglia: thr .5 arrotonda gli angoli senza cambiare la misura; thr basso allarga (il contorno, il bordo)
  // il rumore morbido (per i bordi dello spray e le passate del riempimento): caselle a caso ingrandite con lo sfumato
  function noiseField(W, H, seed, cell) {
    const r = mulberry(seed ^ 0x2f6b), w0 = Math.max(2, Math.ceil(W / cell)), h0 = Math.max(2, Math.ceil(H / cell)), sm = cv(w0, h0), sx = sm.getContext('2d'), id = sx.createImageData(w0, h0);
    for (let i = 0; i < w0 * h0; i++) { const v = r() * 255; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; } sx.putImageData(id, 0, 0);
    const big = cv(W, H), bx = big.getContext('2d'); bx.imageSmoothingEnabled = true; bx.drawImage(sm, 0, 0, W, H); return { cnv: big, data: bx.getImageData(0, 0, W, H).data };
  }
  function blurThresh(src, s, thr, rough, NF) {
    const W = src.width, H = src.height, k = cv(W, H), x = k.getContext('2d'); if (s > .3) x.filter = `blur(${s.toFixed(2)}px)`; x.drawImage(src, 0, 0); x.filter = 'none';
    const d = x.getImageData(0, 0, W, H), A = d.data, lo = (thr - .06) * 255, hi = (thr + .06) * 255, N = rough && NF ? NF.data : null;
    for (let i = 0; i < A.length; i += 4) { const a0 = A[i + 3], a = a0 + (N && a0 > 0 && a0 < 255 ? (N[i] - 128) * rough : 0), v = a <= lo ? 0 : a >= hi ? 255 : (a - lo) / (hi - lo) * 255; A[i] = A[i + 1] = A[i + 2] = 255; A[i + 3] = v; }
    x.putImageData(d, 0, 0); return k;
  }
  const erode = (src, r0) => blurThresh(src, Math.max(.5, r0 / 1.28), .9);   // stringe di r0 pixel
  const grow = (src, r0, rough, NF) => blurThresh(src, Math.max(.5, r0 / 1.28), .1, rough, NF);   // allarga di r0 pixel (angoli tondi, chiuso; rough: il bordo ruvido dello spray)
  // la nuvola dietro al pezzo: tondi spruzzati attorno alle lettere, fusi in una sagoma sola, il bordo che sfuma in polvere
  function cloud(bg, L, toPx, S, P, Wp, Hp, r, q) {
    const M = cv(Wp, Hp), mx = M.getContext('2d'); mx.fillStyle = '#fff';
    L.forEach(l => { const n = 2 + Math.floor(r() * 3); for (let k = 0; k < n; k++) { const [a, b] = toPx(l, [l.w * (.1 + r() * .8), .25 + r() * .7]), R = S * (.42 + r() * .3); mx.beginPath(); mx.arc(a, b, R, 0, 7); mx.fill(); } });
    const B = blurThresh(M, S * .14, .5), T = cv(Wp, Hp), tx = T.getContext('2d'); tx.filter = `blur(${(S * .025).toFixed(1)}px)`; tx.drawImage(B, 0, 0); tx.filter = 'none'; tx.globalCompositeOperation = 'source-in';
    const g = tx.createLinearGradient(0, 0, 0, Hp); g.addColorStop(0, shade(P.bg, .12)); g.addColorStop(1, shade(P.bg, -.12)); tx.fillStyle = g; tx.fillRect(0, 0, Wp, Hp); tx.globalCompositeOperation = 'source-over';
    bg.save(); bg.globalAlpha = .9; bg.filter = `blur(${(S * .1).toFixed(1)}px)`; bg.drawImage(T, 0, 0); bg.restore(); bg.drawImage(T, 0, 0);   // il velo attorno, poi la nuvola piena
    if (q > .5) for (let k = 0; k < 4 + r() * 6; k++) sparkle(bg, r() * Wp, Hp * (.08 + r() * .3), S * (.06 + r() * .08), 'rgba(255,255,255,.9)');
  }
  // la nuvola da una maschera qualunque (bolle, tratti): la sagoma delle lettere gonfiata e resa morbida, il bordo mosso piano
  function cloudOf(bg, FILL, P, Wp, Hp, r, q) {
    const NF = noiseField(Wp, Hp, Math.floor(r() * 1e6), Hp * .22), B = blurThresh(FILL, Hp * .055, .1, .45, NF), T = cv(Wp, Hp), tx = T.getContext('2d'); tx.drawImage(B, 0, 0); tx.globalCompositeOperation = 'destination-in'; tx.filter = `blur(${(Hp * .035).toFixed(1)}px)`; tx.fillStyle = '#fff'; tx.fillRect(Hp * .09, Hp * .09, Wp - Hp * .18, Hp * .82); tx.filter = 'none'; tx.globalCompositeOperation = 'source-in';   // sfuma prima del bordo del muro
    const g = tx.createLinearGradient(0, 0, 0, Hp); g.addColorStop(0, shade(P.bg, .12)); g.addColorStop(1, shade(P.bg, -.12)); tx.fillStyle = g; tx.fillRect(0, 0, Wp, Hp); tx.globalCompositeOperation = 'source-over';
    bg.save(); bg.globalAlpha = .9; bg.filter = `blur(${(Hp * .03).toFixed(1)}px)`; bg.drawImage(T, 0, 0); bg.restore(); bg.save(); bg.filter = `blur(${(Hp * .006).toFixed(1)}px)`; bg.drawImage(T, 0, 0); bg.restore();
    if (q > .5) for (let k = 0; k < 3 + r() * 5; k++) sparkle(bg, r() * Wp, Hp * (.08 + r() * .3), Hp * (.03 + r() * .04), 'rgba(255,255,255,.9)');
  }
  function blockArt(w, P, C, r, Wp, Hp, snap, paths, radii, x) {
    const q = C.q, F = FAM[C.fam], CN = w.cons || consOf(w.hand || w.seed || 1), text = DEACC(w.words || w.aka || 'NINO').replace(/[^A-Z0-9]/g, '') || 'NINO';
    const hollow = !!F.hollow, heavy = C.fam === 'heavy', solid = !!F.solid;   // [graffiti3] solid: il 3D style, niente contorno, lettere che si toccano, blocco profondo
    if (solid) C.bgk = null;
    const t = clamp(CN.weight * (heavy ? 1.35 : hollow ? .95 : 1.12), .18, heavy ? .4 : hollow ? .26 : .33), wL = Math.max(clamp(CN.width, .58, .92), 2 * clamp(CN.weight * (heavy ? 1.35 : hollow ? .95 : 1.12), .18, heavy ? .4 : hollow ? .26 : .33) + .24), sl = CN.slant, gap = solid ? .03 : clamp(CN.gap * .7, .05, .14);
    const corner = { cut: 0, spike: 0, flare: .07, round: .16 }[CN.term] ?? .05, step = CN.step || 0, wave = CN.wave || 0;
    // la parola in coordinate della lettera (altezza 1): le caselle una dopo l'altra, l'inclinazione, i gradini, l'onda
    const L = []; let cur = 0; [...text].forEach((ch, k) => { const ww = ch === 'I' ? t : wL * BW(ch), dy = (k % 2 ? -step : 0) - wave * Math.sin((k + .5) / text.length * PI); L.push({ ch, x0: cur, w: ww, dy, rot: (r() - .5) * (.08 + (1 - q) * .1) + (k % 2 ? .02 : -.02) * CN.con, sc: k === 0 ? 1.08 : .95 + r() * .08, polys: blockGlyph(ch, t, ww) }); cur += ww + gap; });   // le lettere ballano: ognuna un filo storta, la prima più grande
    const arrL = false, arrR = q > .45 && mulberry((w.hand || w.seed || 1) * 7919 + 13)() < .35, aw = arrR ? .3 : 0;   // le frecce: escono dalle lettere, fanno parte della lettera (stessa maschera, stesso contorno)
    if (arrL) { const l = L[0], th = Math.min(t, .2) * .95; l.polys.push([[t * .2, 0], [t * .2 + th, 0], [-.04, -.17], [-.04 - th * .7, -.17 + th * .7]], [[-.26, -.26], [.06, -.2], [-.16, .02]]); }   // la freccia in su: il gambo che esce dall'asta, la punta
    if (arrR) { const l = L[L.length - 1], th = Math.min(t, .2) * .95; l.polys.push([[l.w - .05, 1 - th], [l.w + aw * .55, 1 - th], [l.w + aw * .55, 1], [l.w - .05, 1]], [[l.w + aw * .4, 1 - th * 2.1], [l.w + aw, 1 - th / 2], [l.w + aw * .4, 1 + th * 1.1]]); }   // la freccia in fondo: la riga di base che continua e finisce a punta
    // il sistema del writer: le stesse regole su tutte le lettere (il calcio alla base, la bandierina in alto, le schegge, i tagli)
    const rs = mulberry((w.hand || w.seed || 1) * 104729 + 1), th0 = Math.min(t, .22), sys = { kick: q > .35 && rs() < .6, flag: q > .4 && rs() < .5, chips: q > .5 && rs() < .65, split: q > .45 && rs() < .55, inline: q > .5 && rs() < .5, fx: q > .4 ? Math.floor(rs() * 4) : 0, colate: rs() < .25 };
    L.forEach((l, k) => {
      if (sys.kick && /[BDEFHKLMNPRIU]/.test(l.ch) && rs() < .75) l.polys.push([[t * .5, 1 - th0 * .9], [-.13 - rs() * .06, 1 + .015], [t * .5, 1]]);   // il calcio: la base dell'asta che scappa a sinistra a punta
      if (sys.flag && /[EFTZS57]/.test(l.ch)) l.polys.push([[l.w - t * .6, 0], [l.w + .07, -.1 - rs() * .05], [l.w - .01, th0 * .9]]);   // la bandierina: la barra in alto che si alza a punta
    });
    if (sys.chips) { const l0 = L[0], l1 = L[L.length - 1]; l0.polys.push([[-.2, .3], [-.09, .27], [-.11, .4], [-.22, .43]], [[-.17, .5], [-.11, .49], [-.12, .56]]); l1.polys.push([[l1.w + .1 + aw, .1], [l1.w + .22 + aw, .06], [l1.w + .19 + aw, .19], [l1.w + .08 + aw, .2]]); L.forEach(l => { l.x0 += .2; }); cur += .4; }   // le schegge: pezzi di lettera che volano via (stesso contorno, stesso 3D)
    cur += aw;
    const totW = cur - gap + Math.abs(sl), sloganH = C.slogan ? Hp * .1 : 0;
    // le misure in pixel: margine per contorno, 3D, bordo
    const pad = Hp * (arrL ? .15 : .12), d3k = .16 + r() * .1, ang = .55 + r() * .4, S = Math.min((Wp - 2 * pad - Hp * d3k) / totW, (Hp - 2 * pad - sloganH - Hp * d3k * .6) / (1 + step + wave));
    const ox0 = (Wp - (totW * S + Hp * d3k * .5)) / 2, oy0 = (Hp - sloganH - (1 + step + wave) * S - Hp * d3k * .5) / 2 + (step + wave) * S;
    const ol = Math.max(2, S * CN.line * (hollow ? .8 : 1.05)), d3 = hollow || C.fam === 'piatto' && r() < .45 ? 0 : S * d3k * (heavy ? 1.3 : solid ? 2.4 : 1), dx = Math.cos(ang) * d3, dy = Math.sin(ang) * d3;
    const toPx = (l, [u, v]) => { const c = Math.cos(l.rot), sn = Math.sin(l.rot), a = (u - l.w / 2) * l.sc, b = (v - .6) * l.sc, U = l.w / 2 + a * c - b * sn, V = .6 + a * sn + b * c; return [ox0 + (l.x0 + U + (1 - V) * sl) * S, oy0 + (V + l.dy) * S]; };
    const NF = noiseField(Wp, Hp, (w.seed || 1) * 3 + 7, Math.max(8, S * .45)), rough = .12 + (1 - q) * .1;   // lo spray: la linea che ingrossa e si assottiglia piano lungo il tratto (la mano rallenta, accelera)
    // le maschere delle lettere (con gli angoli scelti dal writer)
    const spA = -.9 + rs() * .5, spSet = new Set(sys.split ? [Math.floor(rs() * L.length), Math.floor(rs() * L.length)] : []);
    const masks = L.map((l, li) => { const m = cv(Wp, Hp), mx = m.getContext('2d'); fillPolys(mx, l, toPx);
      if (spSet.has(li)) { const [cx, cy] = toPx(l, [l.w * (.35 + rs() * .3), .3 + rs() * .4]), ca = Math.cos(spA), sa = Math.sin(spA); mx.globalCompositeOperation = 'destination-out'; mx.strokeStyle = '#000'; mx.lineWidth = Math.max(2, ol * .9); mx.beginPath(); mx.moveTo(cx - ca * S, cy - sa * S); mx.lineTo(cx + ca * S, cy + sa * S); mx.stroke(); mx.globalCompositeOperation = 'source-over'; } return corner > 0 ? blurThresh(m, corner * t * S, .5) : m; });   // il taglio: la lettera spezzata in due piastre, il contorno ci passa in mezzo
    const tintC = (src, col) => { const k = cv(Wp, Hp), kx = k.getContext('2d'); kx.drawImage(src, 0, 0); kx.globalCompositeOperation = 'source-in'; if (isCanvas(col)) kx.drawImage(col, 0, 0); else { kx.fillStyle = col; kx.fillRect(0, 0, Wp, Hp); } kx.globalCompositeOperation = 'source-over'; return k; };   // il contesto torna normale: chi ci disegna sopra dopo non cancella niente
    // il riempimento: piatto, a bande nette, a due toni
    const PAT = cv(Wp, Hp), px = PAT.getContext('2d'), fk = F.flat && C.fillk !== 'bande' ? 'flat' : C.fillk;
    const top = oy0 - (step + wave) * S, bot = oy0 + S;
    if (fk === 'bande' || fk === 'fade') { const n = r() < .5 ? 2 : 3, cols = n === 2 ? [shade(P.f[1], .25), shade(P.f[1], -.1)] : [shade(P.f[1], .3), P.f[1], shade(P.f[1], -.22)], hh = (bot - top) / n; px.fillStyle = cols[0]; px.fillRect(0, 0, Wp, Hp); for (let k = 1; k < n; k++) { px.fillStyle = cols[k]; px.fillRect(0, top + hh * k, Wp, Hp); } }
    else if (fk === 'due') { px.fillStyle = P.f[0]; px.fillRect(0, 0, Wp, Hp); px.fillStyle = P.bg; px.fillRect(0, top + (bot - top) * (.55 + r() * .1), Wp, Hp); }
    else { const g = px.createLinearGradient(0, top, 0, bot), mid = .45 + r() * .2; g.addColorStop(0, P.f[0]); g.addColorStop(mid - .12, P.f[0]); g.addColorStop(mid + .12, P.f[1]); g.addColorStop(1, shade(P.f[1], -.18)); px.fillStyle = g; px.fillRect(0, 0, Wp, Hp); }   // la sfumata: due colori che si mangiano a metà, morbida come lo spray
    if (sys.colate && !hollow) { px.fillStyle = fk === 'due' ? P.f[1] : P.f[0]; const yb = top + (bot - top) * (.28 + rs() * .12); px.fillRect(0, 0, Wp, yb); for (let xx = rs() * S * .2; xx < Wp; xx += S * (.1 + rs() * .16)) { const wd = S * (.05 + rs() * .07), ln = (bot - top) * (.08 + rs() * rs() * .45); px.fillRect(xx, yb - 1, wd, ln); px.beginPath(); px.arc(xx + wd / 2, yb + ln, wd / 2, 0, 7); px.fill(); } }   // le colate dentro: il colore di sopra che cola sull'altro
    const lum = h => { const n = parseInt(h.slice(1), 16); return ((n >> 16) * .3 + ((n >> 8) & 255) * .59 + (n & 255) * .11) / 255; };
    const OL = hollow && lum(P.o) > .55 ? '#141418' : P.o, D3 = P.d, KL = P.k;   // il solo contorno su un muro chiaro vuole la linea scura
    { const pa = -.5 + r() * .3, ca = Math.cos(pa), sa = Math.sin(pa), bw = S * (.16 + r() * .08); px.save(); px.lineCap = 'round';   // le passate: il braccio va avanti e indietro in diagonale, ogni passata un filo più o meno carica
      for (let k = 0, n = Math.ceil((Wp + Hp) / bw * .9); k < n; k++) { const c0 = -Hp + k * bw * 1.1, a0 = r(); px.globalAlpha = .05 + a0 * .07; px.strokeStyle = a0 < .5 ? '#000000' : '#ffffff'; px.lineWidth = bw * (.8 + r() * .5);
        px.beginPath(); px.moveTo(c0 - sa * Hp * 2, -ca * Hp * 2 + Hp / 2); px.lineTo(c0 + sa * Hp * 2, ca * Hp * 2 + Hp / 2); px.stroke(); }
      px.restore(); }
    if (q > .4 && !hollow) { const ka = -1.05 + r() * .25, kc = Math.cos(ka), ks = Math.sin(ka), sp = S * (1.8 + r() * 1.2), ph = r() * sp; px.save(); px.strokeStyle = P.hi; px.lineCap = 'butt';   // i tagli di luce: due righe parallele, una grossa e una fina, sempre allo stesso angolo su tutto il pezzo
      for (let c0 = -Hp + ph; c0 < Wp + Hp; c0 += sp) [[0, .07], [.13, .025]].forEach(([o0, wd]) => { px.globalAlpha = .6; px.lineWidth = S * wd * .8; const cx = c0 + o0 * S; px.beginPath(); px.moveTo(cx - kc * Hp * 2, Hp / 2 - ks * Hp * 2); px.lineTo(cx + kc * Hp * 2, Hp / 2 + ks * Hp * 2); px.stroke(); });
      px.restore(); }
    // 1. il riempimento
    const FILL = cv(Wp, Hp), fx = FILL.getContext('2d'); if (!hollow) masks.forEach(m => fx.drawImage(tintC(m, PAT), 0, 0)); else masks.forEach(m => fx.drawImage(tintC(grow(m, ol), OL), 0, 0));
    x.drawImage(FILL, 0, 0); snap(x.canvas); const pts = []; L.forEach(l => l.polys.forEach(pl => { const c0 = pl.reduce((s0, p) => [s0[0] + p[0] / pl.length, s0[1] + p[1] / pl.length], [0, 0]); pts.push(toPx(l, c0)); })); paths.push(pts); radii.push(t * S * .9);
    // 2. il fondo
    const BG = cv(Wp, Hp), bg = BG.getContext('2d'); if (C.bgk) { if (C.bgk === 'rullo') cloud(bg, L, toPx, S, P, Wp, Hp, r, q); else background(bg, C.bgk, P, Wp, Hp, r, false); const k = cv(Wp, Hp), kx = k.getContext('2d'); kx.drawImage(BG, 0, 0); kx.drawImage(FILL, 0, 0); x.clearRect(0, 0, Wp, Hp); x.drawImage(k, 0, 0); snap(x.canvas); paths.push(raster(Wp, Hp, 3)); radii.push(Hp * .16); }
    // 3. il pezzo: il bordo attorno a tutto, il 3D col suo contorno dietro a tutte, poi le lettere da destra (la sinistra sta sopra)
    const OUT = cv(Wp, Hp), o = OUT.getContext('2d'); o.drawImage(BG, 0, 0);
    const ALL = cv(Wp, Hp), al = ALL.getContext('2d'); masks.forEach(m => al.drawImage(m, 0, 0));
    const EXT = cv(Wp, Hp), ex = EXT.getContext('2d'), n3 = Math.max(1, Math.ceil(d3 / 1.2)); for (let k = 0; k <= n3; k++) ex.drawImage(ALL, dx * k / n3, dy * k / n3);
    const EXTo = grow(EXT, ol);
    if (!hollow && !solid && q > .35 && r() < .75) o.drawImage(tintC(grow(EXTo, S * (.045 + CN.line * .6)), KL), 0, 0);   // il bordo: chiude il pezzo in una sagoma sola
    if (d3 > 0) { if (!solid) o.drawImage(tintC(EXTo, OL), 0, 0); const E2 = cv(Wp, Hp), e2 = E2.getContext('2d'); for (let k = 1; k <= n3; k++) e2.drawImage(ALL, dx * k / n3, dy * k / n3); o.drawImage(tintC(E2, shade(D3, solid ? -.55 : -.3)), 0, 0); (solid ? [[.75, -.3], [.5, -.1], [.25, .1]] : [[.6, 0], [.3, .16]]).forEach(([fr, sh]) => { const E3 = cv(Wp, Hp), e3 = E3.getContext('2d'), nk = Math.max(1, Math.round(n3 * fr)); for (let k = 1; k <= nk; k++) e3.drawImage(ALL, dx * k / n3, dy * k / n3); o.drawImage(tintC(E3, shade(D3, sh)), 0, 0); }); }   // il 3D con la luce: chiaro vicino alla lettera, scuro in fondo
    if (sys.fx && !hollow) { const bb = [1e9, 1e9, -1e9, -1e9]; L.forEach(l => l.polys.flat().forEach(p => { const [a, b] = toPx(l, p); bb[0] = Math.min(bb[0], a); bb[1] = Math.min(bb[1], b); bb[2] = Math.max(bb[2], a); bb[3] = Math.max(bb[3], b); }));   // fuori: le bolle, le stelle, i segni, le linee di velocità (dietro alle lettere)
      const bub = (a, b, R) => { o.fillStyle = OL; o.beginPath(); o.arc(a, b, R + ol, 0, 7); o.fill(); o.fillStyle = P.f[0]; o.beginPath(); o.arc(a, b, R, 0, 7); o.fill(); o.fillStyle = '#fff'; o.beginPath(); o.arc(a - R * .35, b - R * .35, R * .22, 0, 7); o.fill(); };
      if (sys.fx & 1) { for (let k = 0; k < 2 + rs() * 3; k++) { const top0 = rs() < .5, a = bb[0] + (bb[2] - bb[0]) * rs(), b = top0 ? bb[1] - S * (.04 + rs() * .1) : bb[3] + S * (.02 + rs() * .1); bub(a, Math.max(S * .1, Math.min(Hp - S * .1, b)), S * (.025 + rs() * .045)); } }
      if (sys.fx & 2) { o.strokeStyle = OL; o.lineCap = 'round'; o.lineWidth = Math.max(2, ol * .8); for (let k = 0; k < 3; k++) { const y = bb[1] + (bb[3] - bb[1]) * (.3 + k * .18), x1 = bb[0] - S * .05, x0 = Math.max(ol * 2, x1 - S * (.15 + rs() * .2) * (k === 1 ? 1.5 : 1)); o.beginPath(); o.moveTo(x0, y); o.lineTo(x1, y); o.stroke(); }
        for (let k = 0; k < 2; k++) { const a = bb[2] + S * (.04 + rs() * .1), b = bb[1] + (bb[3] - bb[1]) * rs() * .5, z = S * .05; o.beginPath(); o.moveTo(a - z, b); o.lineTo(a + z, b); o.moveTo(a, b - z); o.lineTo(a, b + z); o.stroke(); } }
      sparkle(o, bb[0] + (bb[2] - bb[0]) * (.15 + rs() * .7), bb[1] - S * .02, S * .1, P.hi); }
    [...masks.keys()].reverse().forEach(i => {
      const m = masks[i];
      if (!hollow) { o.save(); o.globalAlpha = .3; o.filter = `blur(${(ol * 1.6).toFixed(1)}px)`; o.drawImage(tintC(grow(m, ol * 1.4), P.f[1]), 0, 0); o.restore(); }   // la nebbia del riempimento che scappa fuori
      const LN = grow(m, ol, rough, NF); if (!solid) { o.save(); o.filter = 'blur(.6px)'; o.drawImage(tintC(LN, OL), 0, 0); o.restore(); }   // il contorno, chiuso, morbido sul bordo come lo spray
      if (!solid) { const RG = grow(LN, ol * 1.6), rg = RG.getContext('2d'); rg.globalCompositeOperation = 'destination-out'; rg.drawImage(LN, 0, 0); const MI = cv(Wp, Hp), mi = MI.getContext('2d'), rs = mulberry((w.seed || 1) * 31 + i);   // la polvere: puntini fini solo a ridosso della linea
        mi.fillStyle = '#000'; for (let k = 0, n = Wp * Hp / 90; k < n; k++) { const a = rs() * Wp, b = rs() * Hp, z = .5 + rs() * rs() * 1.3; mi.fillRect(a, b, z, z); } mi.globalCompositeOperation = 'destination-in'; mi.drawImage(RG, 0, 0); o.save(); o.globalAlpha = .55 - q * .25; o.drawImage(tintC(MI, OL), 0, 0); o.restore(); }
      if (hollow) { o.save(); o.globalCompositeOperation = 'destination-out'; o.drawImage(m, 0, 0); o.restore(); return; }
      const Li = tintC(m, PAT), lx = Li.getContext('2d');
      if (sys.inline) { const a = Math.max(1.5, t * S * .09), h = Math.max(1.5, t * S * .06), E1 = erode(m, a), R1 = cv(Wp, Hp), r1 = R1.getContext('2d'); r1.drawImage(E1, 0, 0); r1.globalCompositeOperation = 'destination-out'; r1.drawImage(erode(m, a + h), 0, 0); lx.globalAlpha = .9; lx.drawImage(tintC(R1, lum(P.f[1]) > .6 ? shade(P.f[1], -.35) : P.hi), 0, 0); lx.globalAlpha = 1; }   // la seconda linea: corre dentro, tutta attorno
      { const l = L[i], g = Math.max(2, t * S * .14); lx.save(); lx.globalCompositeOperation = 'source-atop'; lx.fillStyle = lx.strokeStyle = '#ffffff'; lx.lineCap = 'round'; lx.globalAlpha = .9;   // i riflessi: il colpo di bianco sull'angolo in alto, il punto, a volte la stella
        const [ax, ay] = toPx(l, [t * .3, th0 * .35]); lx.lineWidth = g * .55; lx.beginPath(); lx.moveTo(ax, ay); lx.lineTo(ax + S * Math.min(.18, l.w * .4), ay - S * .005); lx.stroke(); lx.beginPath(); lx.moveTo(ax, ay); lx.lineTo(ax - S * .005, ay + S * .12); lx.stroke(); lx.beginPath(); lx.arc(ax + S * Math.min(.26, l.w * .55), ay, g * .3, 0, 7); lx.fill();
        if (q > .55 && rs() < .3) { const [bx, by] = toPx(l, [l.w * (.4 + rs() * .4), .5 + rs() * .3]); sparkle(lx, bx, by, S * .07, '#ffffff'); } lx.restore(); }
      if (q > .45 && !sys.inline) {   // la luce: una riga sottile lungo i bordi in alto a sinistra, rientrata dal contorno
        const g = Math.max(1.5, t * S * .1), h = Math.max(1.5, t * S * .07), B1 = cv(Wp, Hp), b1 = B1.getContext('2d'); b1.drawImage(m, g, g); b1.globalCompositeOperation = 'destination-out'; b1.drawImage(m, g + h, g + h); b1.globalCompositeOperation = 'destination-in'; b1.drawImage(m, 0, 0);
        lx.globalAlpha = .8; lx.drawImage(tintC(B1, P.hi), 0, 0); lx.globalAlpha = 1;
      }
      if (F.cuts) { const xs = L[i].polys.flat().map(p => toPx(L[i], p)), a0 = Math.min(...xs.map(p => p[0])), a1 = Math.max(...xs.map(p => p[0])), b0 = Math.min(...xs.map(p => p[1])), b1 = Math.max(...xs.map(p => p[1]));
        lx.globalCompositeOperation = 'source-atop'; const cA = r() * PI, cx0 = a0 + (a1 - a0) * (.3 + r() * .4), cy0 = b0 + (b1 - b0) * (.3 + r() * .4), ux = Math.cos(cA), uy = Math.sin(cA), LL = (a1 - a0 + b1 - b0);
        lx.fillStyle = pickR(r, [P.bg, P.d, P.f[0], KL]); lx.beginPath(); lx.moveTo(cx0 - ux * LL, cy0 - uy * LL); lx.lineTo(cx0 + ux * LL, cy0 + uy * LL); lx.lineTo(cx0 + ux * LL - uy * LL, cy0 + uy * LL + ux * LL); lx.lineTo(cx0 - ux * LL - uy * LL, cy0 - uy * LL + ux * LL); lx.closePath(); lx.fill();
        lx.strokeStyle = OL; lx.lineWidth = Math.max(1.5, ol * .7); lx.beginPath(); lx.moveTo(cx0 - ux * LL, cy0 - uy * LL); lx.lineTo(cx0 + ux * LL, cy0 + uy * LL); lx.stroke(); lx.globalCompositeOperation = 'source-over'; }   // l'astratto: un taglio, due piani
      o.drawImage(Li, 0, 0);
    });
    { const nD = Math.round((q < .5 ? 5 : 2) + r() * 3); o.lineCap = 'round';   // le colature: dal fondo delle lettere, del colore del contorno o del riempimento
      for (let k = 0; k < nD; k++) { const l = pickR(r, L), pl = pickR(r, l.polys), b0 = pl.reduce((m0, p) => p[1] > m0[1] ? p : m0, pl[0]); if (b0[1] < .85) continue; const [bx, by] = toPx(l, [b0[0] + (r() - .5) * t * .6, Math.min(1, b0[1])]), len = S * (.06 + r() * .22), wd = Math.max(1.5, ol * (.5 + r() * .5));
        o.strokeStyle = o.fillStyle = r() < .6 ? OL : P.f[1]; o.lineWidth = wd; o.beginPath(); o.moveTo(bx, by + ol * .5); o.lineTo(bx + (r() - .5) * 1.5, by + ol + len); o.stroke(); o.beginPath(); o.arc(bx, by + ol + len, wd * .8, 0, 7); o.fill(); } }
    x.clearRect(0, 0, Wp, Hp); x.drawImage(OUT, 0, 0); snap(x.canvas); paths.push(pts.slice()); radii.push(t * S * .9 + ol * 2);
    // 4. la firma della crew, lo slogan
    smallTag(x, w.words && w.aka ? w.aka + ' ' + (w.crew || '') : (w.crew || ''), Math.min(Wp - Hp * .25, ox0 + totW * S), Math.min(Hp - sloganH - Hp * .05, oy0 + S + Hp * .07), Hp * .08, '#141418', r, Wp * .3);
    if (sloganH) { const r2 = mulberry((w.seed || 1) + 99); smallTag(x, C.slogan, Wp / 2, Hp - sloganH * .55, sloganH * .7, '#141418', r2, Wp * .85); }
    snap(x.canvas); paths.push(raster(Wp, Hp, 2)); radii.push(Hp * .2);
  }

  // =====================================================================================================================
  // [graffiti4] L'INCHIOSTRO: il disegno come lo fa un writer sul blackbook e poi sul muro (dai fogli di riferimento).
  // - LA GERARCHIA DELLE LINEE: il contorno esterno è grosso (e più grosso in basso a destra, dove cade l'ombra); le linee dentro
  //   (dove una lettera passa sopra l'altra, i tagli, i buchi) sono sottili e si assottigliano. Le lettere sono una massa sola:
  //   la sinistra copre la destra e sopra la destra resta solo la sua linea sottile.
  // - L'OMBRA piatta spostata (throw-up) o il 3D estruso (pezzi), fusi col contorno; il BORDO da sticker attorno a tutto.
  // - IL RIEMPIMENTO: colore pieno con la parte bassa più scura tagliata da un'onda, sfumato, tratteggio da pennarello, liquido
  //   con le bolle, macchie, strisce; uguale su tutto il pezzo (è un colore solo che passa sotto tutte le lettere).
  // - LE LUCI: archetti bianchi sottili sui lobi, il puntino; nei pezzi i tagli bianchi e la riga lungo i bordi alti.
  // - LE COLATURE fanno parte della forma (hanno il contorno); gli asterischi a inchiostro, le aureole, le corone, le linee di
  //   velocità, la mini-tag dentro una lettera.
  // =====================================================================================================================
  const SAT = ['#f77fe0', '#e8409a', '#e5322a', '#ff8a1a', '#ffd21a', '#b8e03a', '#34d07a', '#1fb0a8', '#3ad6f0', '#2a6ae0', '#8a4ae0', '#b58ae8', '#f4f4f2', '#b8bcc2', '#18181c', '#c8f0b0', '#ff7a6a', '#7a5ae8', '#e8e8ea', '#f2a0c8'];
  const hexRGB = h => { const n = parseInt(String(h).slice(1, 7), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const mixC = (a, b, t) => { const A = hexRGB(a), B = hexRGB(b); return '#' + A.map((v, i) => clamp(Math.round(v + (B[i] - v) * t), 0, 255).toString(16).padStart(2, '0')).join(''); };
  const lumC = h => { const [a, b, c] = hexRGB(h); return (a * .3 + b * .59 + c * .11) / 255; };
  // la tavolozza di un lavoro a inchiostro: dal colore pieno nascono l'ombra interna, la luce, l'ombra portata, il bordo
  function inkScheme(r, P) {
    const real = P && P.acc && r() < .3, base = real ? P.f[1] : pickR(r, SAT), dark = lumC(base) < .2, pale = lumC(base) > .82;
    const contrast = pickR(r, SAT.filter(c => Math.abs(lumC(c) - lumC(base)) > .2 && c !== base));
    const ink = dark ? pickR(r, ['#f2d21a', '#f4f4f2', '#3ad6f0', '#e8409a']) : real ? P.o : r() < .85 ? '#141418' : mixC(base, '#000000', .7);
    return { fill: base, shade: dark ? '#3a3a42' : pale ? pickR(r, [contrast, mixC(base, '#606070', .35)]) : mixC(mixC(base, '#000000', .3), contrast, .12), light: dark ? '#5a5a66' : mixC(base, '#ffffff', .4), acc: real ? P.acc : contrast,
      ink, inner: ink, shadow: real ? P.d : pickR(r, dark ? [mixC(ink, '#000000', .3), '#5a5a66'] : ['#141418', '#141418', mixC(base, '#000000', .55), contrast, mixC(contrast, '#000000', .3)]),
      border: pickR(r, ['#ffffff', '#ffffff', '#f6f4f0', mixC(contrast, '#ffffff', .25), dark ? ink : '#ffffff']), line: pickR(r, ['#8a8a92', '#141418', null, null]), hi: '#ffffff', bg: real ? P.bg : mixC(contrast, '#ffffff', .1), bg2: mixC(contrast, '#000000', .25) };
  }
  // le operazioni sulle maschere (canvas bianchi con l'alfa)
  const shiftC = (src, dx, dy) => { const k = cv(src.width, src.height); k.getContext('2d').drawImage(src, dx, dy); return k; };
  const minusC = (a, b) => { const k = cv(a.width, a.height), kx = k.getContext('2d'); kx.drawImage(a, 0, 0); kx.globalCompositeOperation = 'destination-out'; kx.drawImage(b, 0, 0); return k; };
  const unionC = list => { const k = cv(list[0].width, list[0].height), kx = k.getContext('2d'); list.forEach(m => m && kx.drawImage(m, 0, 0)); return k; };
  const smearC = (src, dx, dy) => { const k = cv(src.width, src.height), kx = k.getContext('2d'), n = Math.max(1, Math.ceil(hyp(dx, dy) / 1.2)); for (let i = 0; i <= n; i++) kx.drawImage(src, dx * i / n, dy * i / n); return k; };
  // la linea che si assottiglia: da w0 a w1 lungo il percorso
  function taperLine(ctx, pts, w0, w1, col) {
    if (!pts || pts.length < 2) return; const P2 = smoothK(pts, 2), n = P2.length, Lf = [], Rt = [];
    for (let i = 0; i < n; i++) { const a = P2[Math.max(0, i - 1)], b = P2[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = hyp(dx, dy) || 1, t = i / (n - 1), w = (w0 + (w1 - w0) * t) / 2; Lf.push([P2[i][0] - dy / l * w, P2[i][1] + dx / l * w]); Rt.push([P2[i][0] + dy / l * w, P2[i][1] - dx / l * w]); }
    ctx.fillStyle = col; ctx.beginPath(); Lf.concat(Rt.reverse()).forEach(([a, b], k) => k ? ctx.lineTo(a, b) : ctx.moveTo(a, b)); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(P2[0][0], P2[0][1], w0 / 2, 0, 7); ctx.fill();
  }
  // i punti dentro una maschera, riga per riga (il percorso della mano quando riempie)
  function fillPath(m, step) { const W = m.width, H = m.height, A = m.getContext('2d').getImageData(0, 0, W, H).data, out = []; let k = 0; for (let y = step / 2; y < H; y += step, k++) { const row = []; for (let x = step / 2; x < W; x += step) if (A[((y | 0) * W + (x | 0)) * 4 + 3] > 100) row.push([x, y]); if (k % 2) row.reverse(); row.forEach(p => out.push(p)); } return out.length ? out : [[W / 2, H / 2]]; }
  function bboxC(m) { const W = m.width, H = m.height, A = m.getContext('2d').getImageData(0, 0, W, H).data; let x0 = W, y0 = H, x1 = 0, y1 = 0; for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (A[(y * W + x) * 4 + 3] > 100) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return x1 > x0 ? [x0, y0, x1, y1] : [0, 0, W, H]; }
  // il riempimento: un colore solo che passa sotto tutte le lettere
  function inkPAT(kind, sc, box, S, Wp, Hp, r) {
    const c = cv(Wp, Hp), x = c.getContext('2d'), [a0, b0, a1, b1] = box, hh = b1 - b0, ww = a1 - a0;
    const wave = (y, amp, ph, fq) => { x.beginPath(); x.moveTo(-5, Hp + 5); for (let xx = -5; xx <= Wp + 5; xx += Math.max(3, S * .05)) x.lineTo(xx, y + Math.sin(xx / Math.max(1, S) * fq + ph) * amp); x.lineTo(Wp + 5, Hp + 5); x.closePath(); };
    x.fillStyle = sc.fill; x.fillRect(0, 0, Wp, Hp);
    if (kind === 'sfuma') { const g = x.createLinearGradient(0, b0, 0, b1); g.addColorStop(0, sc.light); g.addColorStop(.45, sc.fill); g.addColorStop(1, sc.shade); x.fillStyle = g; x.fillRect(0, 0, Wp, Hp);
      x.globalAlpha = .5; for (let k = 0; k < ww * hh / (S * S) * 6; k++) { const px = a0 + r() * ww, py = b0 + r() * hh, t = (py - b0) / hh; x.fillStyle = t < .4 ? sc.light : sc.shade; x.beginPath(); x.arc(px, py, S * (.004 + r() * .008), 0, 7); x.fill(); } x.globalAlpha = 1; }   // la grana dello spray sulla sfumatura
    else if (kind === 'liquido') { x.fillStyle = sc.light; x.fillRect(0, 0, Wp, Hp); const y = b0 + hh * (.48 + r() * .14); x.fillStyle = sc.shade; wave(y, S * .03, r() * 6, 3.2); x.fill(); x.fillStyle = sc.fill; wave(y + S * .03, S * .03, r() * 6, 3.2); x.fill();
      for (let k = 0; k < ww / S * 6; k++) { const px = a0 + r() * ww, py = y - S * (.02 + r() * .2), rr = S * (.015 + r() * .035); x.fillStyle = sc.fill; x.beginPath(); x.arc(px, py, rr, 0, 7); x.fill(); }   // le bolle che salgono
      for (let k = 0; k < ww / S * 4; k++) { const px = a0 + r() * ww, py = y + S * (.1 + r() * .4), rr = S * (.01 + r() * .025); x.fillStyle = sc.light; x.globalAlpha = .7; x.beginPath(); x.arc(px, py, rr, 0, 7); x.fill(); } x.globalAlpha = 1; }
    else if (kind === 'macchie') { for (let k = 0; k < 6 + ww / S * 4; k++) { const cx = a0 + r() * ww, cy = b0 + r() * hh, rr = S * (.12 + r() * .3), col = pickR(r, [sc.light, sc.shade, sc.acc, sc.light]), g = x.createRadialGradient(cx, cy, 0, cx, cy, rr), [R0, G0, B0] = hexRGB(col); g.addColorStop(0, `rgba(${R0},${G0},${B0},.85)`); g.addColorStop(.6, `rgba(${R0},${G0},${B0},.55)`); g.addColorStop(1, `rgba(${R0},${G0},${B0},0)`); x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy, rr, rr * (.5 + r() * .5), r() * PI, 0, 7); x.fill(); }
      x.fillStyle = sc.shade; x.globalAlpha = .9; wave(b0 + hh * .78, S * .03, r() * 6, 2.4); x.fill(); x.globalAlpha = 1; }
    else if (kind === 'strisce') { const sw = S * (.07 + r() * .05), lean = (r() - .5) * .5; x.fillStyle = sc.acc; for (let xx = a0 - S; xx < a1 + S; xx += sw * 2.2) { x.beginPath(); x.moveTo(xx, b0 - S); x.lineTo(xx + sw, b0 - S); x.lineTo(xx + sw + lean * S * 2, b1 + S); x.lineTo(xx + lean * S * 2, b1 + S); x.closePath(); x.fill(); } x.fillStyle = sc.shade; wave(b0 + hh * .8, S * .025, r() * 6, 2.4); x.fill(); }
    else if (kind === 'pois') { x.fillStyle = sc.shade; wave(b0 + hh * (.62 + r() * .1), S * .035, r() * 6, 2.6); x.fill(); x.fillStyle = sc.shade; for (let k = 0; k < ww * hh / (S * S) * 10; k++) { x.beginPath(); x.arc(a0 + r() * ww, b0 + r() * hh, S * (.015 + r() * .03), 0, 7); x.fill(); } }
    else if (kind === 'mattoni') { x.strokeStyle = sc.shade; x.lineWidth = Math.max(1, S * .014); const bh = S * .12, bw = S * .26; for (let y = b0, k = 0; y < b1; y += bh, k++) { x.beginPath(); x.moveTo(a0, y); x.lineTo(a1, y); x.stroke(); for (let xx = a0 + (k % 2) * bw / 2; xx < a1; xx += bw) { x.beginPath(); x.moveTo(xx, y); x.lineTo(xx, y + bh); x.stroke(); } } x.fillStyle = sc.shade; x.globalAlpha = .8; wave(b0 + hh * .8, S * .03, r() * 6, 2.4); x.fill(); x.globalAlpha = 1; }
    else if (kind !== 'piatto') { const y = b0 + hh * (.58 + r() * .14); x.fillStyle = sc.shade; wave(y, S * (.025 + r() * .03), r() * 6, 2 + r() * 2); x.fill();   // 'ombra': la parte bassa più scura, tagliata da un'onda
      if (r() < .4) { x.fillStyle = sc.light; x.globalAlpha = .8; x.beginPath(); x.moveTo(-5, -5); for (let xx = -5; xx <= Wp + 5; xx += S * .05) x.lineTo(xx, b0 + hh * .2 + Math.sin(xx / S * 2.6 + 1) * S * .02); x.lineTo(Wp + 5, -5); x.closePath(); x.fill(); x.globalAlpha = 1; } }   // e a volte la luce in alto
    if (kind === 'tratteggio' || (kind !== 'sfuma' && kind !== 'macchie' && r() < .3)) {   // le passate del pennarello: parallele, ordinate, ognuna un po' più lunga o più corta
      const ang = -1.05 + (r() - .5) * .2, ca = Math.cos(ang), sa = Math.sin(ang), nx = -sa, ny = ca, step = S * (.045 + r() * .02), col = r() < .7 ? sc.shade : sc.light, cx0 = (a0 + a1) / 2, cy0 = (b0 + b1) / 2, R0 = hyp(ww, hh) / 2 + S; x.lineCap = 'round'; x.strokeStyle = col;
      for (let t = -R0; t < R0; t += step * (.85 + r() * .3)) { const L = hh * (.22 + r() * .35), o = (r() - .5) * hh * .6, px = cx0 + nx * t + ca * o, py = cy0 + ny * t + sa * o; x.globalAlpha = .35 + r() * .2; x.lineWidth = Math.max(1, S * (.011 + r() * .006)); x.beginPath(); x.moveTo(px - ca * L, py - sa * L); x.lineTo(px + ca * L, py + sa * L); x.stroke(); } x.globalAlpha = 1; }
    return c;
  }
  // le colature con il contorno: un dito di vernice che scende dal bordo basso, con la goccia in fondo
  function dripMask(U, Wp, Hp, r, n, len, wd) {
    const A = U.getContext('2d').getImageData(0, 0, Wp, Hp).data, bot = [];
    for (let xx = 2; xx < Wp - 2; xx += 2) for (let yy = Hp - 1; yy >= 0; yy--) if (A[(yy * Wp + xx) * 4 + 3] > 128) { bot.push([xx, yy]); break; }
    const m = cv(Wp, Hp), mx = m.getContext('2d'); mx.fillStyle = '#fff'; if (!bot.length) return m;
    const lows = bot.filter((p, i) => i > 1 && i < bot.length - 2 && p[1] >= bot[i - 2][1] && p[1] >= bot[i + 2][1]);
    for (let k = 0; k < n; k++) { const [px, py] = pickR(r, lows.length ? lows : bot), w = wd * (.6 + r() * .7), L = Math.min(Hp - py - w * 1.6, len * (.3 + r() * .7)); if (L < w) continue;
      mx.beginPath(); mx.moveTo(px - w * 1.1, py - w); mx.quadraticCurveTo(px - w * .5, py + w * .4, px - w * .5, py + L); mx.lineTo(px + w * .5, py + L); mx.quadraticCurveTo(px + w * .5, py + w * .4, px + w * 1.1, py - w); mx.closePath(); mx.fill(); mx.beginPath(); mx.ellipse(px, py + L, w * .75, w * .85, 0, 0, 7); mx.fill(); }
    return m;
  }
  // la maschera dal rumore: dove il rumore supera la soglia (per spezzare le righe di luce a tratti)
  function noiseMask(NF, thr) { const W = NF.cnv.width, H = NF.cnv.height, k = cv(W, H), kx = k.getContext('2d'), d = kx.createImageData(W, H), A = d.data, N = NF.data; for (let i = 0; i < A.length; i += 4) { A[i] = A[i + 1] = A[i + 2] = 255; A[i + 3] = N[i] > thr * 255 ? 255 : 0; } kx.putImageData(d, 0, 0); return k; }
  // l'asterisco a inchiostro (non la stella da adesivo): tre righe sottili che si incrociano, una più lunga
  function asterisk(ctx, cx, cy, s, col, r) { ctx.save(); ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1, s * .14); const a0 = r() * PI; for (let k = 0; k < 3 + (r() < .4 ? 1 : 0); k++) { const a = a0 + k * PI / 3 + (r() - .5) * .3, L = s * (k ? .7 + r() * .3 : 1.1); ctx.beginPath(); ctx.moveTo(cx - Math.cos(a) * L, cy - Math.sin(a) * L); ctx.lineTo(cx + Math.cos(a) * L, cy + Math.sin(a) * L); ctx.stroke(); } ctx.restore(); }
  // IL MOTORE: le maschere delle lettere (0 = davanti, a sinistra), il riempimento, l'ombra, le linee, le luci, i dettagli
  const INK = { on: false };   // [graffiti4] mentre disegna il motore a inchiostro: la mano meno storta, il bordo netto
  function inkRender(o) {
    const { Wp, Hp, masks, sc, r, S, x, snap, paths, radii } = o, NF = noiseField(Wp, Hp, o.seed || 7, Math.max(6, S * .3)), ow = o.ow, iw = o.iw;
    let U = unionC(masks); const box0 = bboxC(U), all = masks.slice();
    if (o.drips) { const D = dripMask(U, Wp, Hp, r, o.drips, o.dripLen || S * .6, o.dripW || S * .05); all.push(D); U = unionC([U, D]); }
    const SH = o.extrude ? smearC(U, o.dx, o.dy) : shiftC(U, o.dx, o.dy), ALL = unionC([U, SH]);
    const PAT = inkPAT(o.fillKind, sc, box0, S, Wp, Hp, r);
    // lo sfondo dietro (l'esplosione, la nuvola) e il bordo da sticker attorno a tutto
    const LB = cv(Wp, Hp), lb = LB.getContext('2d'), BG = o.bg ? o.bg(U, box0) : null, OUTER_ALL = BG ? unionC([ALL, BG.mask]) : ALL;
    if (o.border) { const Bm = grow(grow(OUTER_ALL, ow * 1.1), o.border); if (sc.line) lb.drawImage(tintTo(grow(Bm, Math.max(1.5, ow * .25)), sc.line, Wp, Hp), 0, 0); lb.drawImage(tintTo(Bm, sc.border, Wp, Hp), 0, 0); }
    if (BG) { lb.drawImage(tintTo(grow(BG.mask, ow * .8, .25, NF), sc.ink, Wp, Hp), 0, 0); lb.drawImage(BG.paint, 0, 0); }
    // il contorno esterno: grosso, e più grosso in basso a destra (dove cade l'ombra)
    const OUT = cv(Wp, Hp), ox = OUT.getContext('2d'); ox.drawImage(tintTo(grow(ALL, ow, .3, NF), sc.ink, Wp, Hp), 0, 0); ox.drawImage(tintTo(grow(shiftC(ALL, ow * .35, ow * .45), ow, .3, NF), sc.ink, Wp, Hp), 0, 0);
    // l'ombra o il 3D: pieno, il 3D che scurisce verso il fondo
    const SHL = cv(Wp, Hp), sx = SHL.getContext('2d'); if (o.extrude) { const g = cv(Wp, Hp), gx = g.getContext('2d'), gr = gx.createLinearGradient(0, box0[1], o.dx, box0[3] + o.dy); gr.addColorStop(0, sc.shadow); gr.addColorStop(1, mixC(sc.shadow, '#000000', .45)); gx.fillStyle = gr; gx.fillRect(0, 0, Wp, Hp); sx.drawImage(tintTo(SH, g, Wp, Hp), 0, 0); } else sx.drawImage(tintTo(SH, sc.shadow, Wp, Hp), 0, 0);
    // le lettere: il riempimento solo (prima tappa) e poi lettera per lettera, da dietro, ognuna con la sua linea sottile sopra quella dietro
    const LF = cv(Wp, Hp), lf = LF.getContext('2d'), LFL = cv(Wp, Hp), ll = LFL.getContext('2d');
    for (let i = all.length - 1; i >= 0; i--) { const fi = tintTo(all[i], PAT, Wp, Hp); lf.drawImage(fi, 0, 0); ll.drawImage(fi, 0, 0);
      const ring = minusC(grow(all[i], iw, .12, NF), all[i]); ll.drawImage(tintTo(ring, sc.inner, Wp, Hp), 0, 0);
      if (o.inner) o.inner(ll, i); }
    // le luci e i dettagli
    const HL = cv(Wp, Hp), hl = HL.getContext('2d'); if (o.hilite) o.hilite(hl, U);
    if (o.rim) masks.forEach((m, i) => {   // la riga di luce lungo i bordi alti, spezzata (una lettera sì e una no, a tratti)
      const k = Math.max(1.5, S * .022), inn = erode(m, ow * .45 + k), band = minusC(inn, shiftC(inn, k * 1.1, k * 1.4)), bx = band.getContext('2d'); bx.globalCompositeOperation = 'destination-in'; bx.drawImage(noiseMask(NF, .5), 0, 0); hl.drawImage(tintTo(band, sc.hi, Wp, Hp), 0, 0); });
    if (o.deco) o.deco(hl, U, box0);
    // le tappe: il riempimento, lo sfondo e l'ombra, le linee, le luci
    const EDGE = cv(Wp, Hp), ex = EDGE.getContext('2d'), em = Math.max(3, Hp * .02); ex.filter = `blur(${(em * .5).toFixed(1)}px)`; ex.fillStyle = '#fff'; ex.fillRect(em, em, Wp - 2 * em, Hp - 2 * em);   // il bordo del velo sfuma: niente tagli dritti se qualcosa arriva al margine
    const st = (list) => { x.clearRect(0, 0, Wp, Hp); list.forEach(c => x.drawImage(c, 0, 0)); x.save(); x.globalCompositeOperation = 'destination-in'; x.drawImage(EDGE, 0, 0); x.restore(); snap(x.canvas); };
    const fp = fillPath(U, Math.max(4, S * .12));
    st([LF]); paths.push(fp); radii.push(S * .22);
    st([LB, SHL, LF]); paths.push(raster(Wp, Hp, 3)); radii.push(Hp * .16);
    st([LB, OUT, SHL, LFL]); paths.push(fp.slice().reverse()); radii.push(S * .25);
    st([LB, OUT, SHL, LFL, HL]); paths.push(raster(Wp, Hp, 2)); radii.push(Hp * .2);
  }
  // ---- il throw-up e le bolle a inchiostro ----
  function bubbleInk(w, P, C, r, Wp, Hp, snap, paths, radii, x, pre) {   // pre: { B, u } una disposizione già fatta (il verticale)
    const q = C.q, text = (w.words || w.aka || 'NINO'), sc = inkScheme(r, P), fat = C.fam === 'fat' || C.fam === 'throwie';
    if (C.fam === 'throwie' && r() < .45) { const bw = r() < .6; Object.assign(sc, { fill: bw ? '#18181c' : '#f2f2f0', light: bw ? '#4a4a52' : '#ffffff', shade: bw ? '#2c2c34' : '#c8c8cc', ink: bw ? pickR(r, ['#f4f4f2', '#f2d21a', '#f4f4f2']) : '#141418' }); sc.inner = sc.ink; }   // la throwie classica: nera col contorno chiaro, o bianca e nera
    if (C.fam === 'chrome') Object.assign(sc, { fill: '#cfd3d8', light: '#f4f6f8', shade: '#8a929c', ink: '#141418', inner: '#141418' });
    SQ = 0; CUT = 0;
    const drips = r() < .3 ? 3 + Math.floor(r() * 5) : 0, lay = { adv: fat ? .66 + r() * .08 : .72 + r() * .08, jit: .12 + (1 - q) * .1, rot: .14 + (1 - q) * .12, bounce: .06 + r() * .07, squash: .8 + r() * .22, slant: (r() - .3) * .3, puff: fat ? 1.16 + r() * .1 : 1.06 + r() * .1 };
    const B = pre ? pre.B : bubbleFit(bubbleLayout(text, lay, r), Wp * .96, Hp * (drips ? .78 : .88), Hp * .1), u = pre ? pre.u : B.s;
    const masks = B.L.map(l => { const m = cv(Wp, Hp); fillBody(m.getContext('2d'), l, 0, '#fff'); return m; });
    const ow = Math.max(3, u * (.055 + r() * .03)), iw = Math.max(2, u * (.034 + r() * .014));
    inkRender({ Wp, Hp, masks, sc, r, S: u, x, snap, paths, radii, seed: (w.seed || 1) * 5 + 3, ow, iw, dx: u * (.05 + r() * .06), dy: u * (.07 + r() * .06), extrude: false, border: r() < .7 ? u * (.04 + r() * .05) : 0, drips, dripLen: u * .55, dripW: u * .045,
      fillKind: pickR(r, ['ombra', 'ombra', 'ombra', 'sfuma', 'tratteggio', 'tratteggio', 'liquido', 'pois', 'macchie', 'piatto']),
      inner: (ctx, i) => { const l = B.L[i]; if (!l) return; ctx.save(); bodyPath(ctx, l, 0, 0, 0); ctx.clip();
        ctx.fillStyle = sc.inner; l.holes.forEach(h => { ctx.beginPath(); ctx.ellipse(h.c[0], h.c[1], Math.max(iw * 1.2, h.rx * .75), Math.max(iw * 2, h.ry * 1.05), h.rot, 0, 7); ctx.fill(); });   // i buchi: stretti, una goccia d'inchiostro
        l.slits.forEach(sl => taperLine(ctx, sl, iw * 2.2, iw * .5, sc.inner)); ctx.restore(); },   // i tagli: dal bordo verso dentro, si assottigliano
      hilite: (ctx) => { ctx.save(); ctx.strokeStyle = sc.hi; ctx.fillStyle = sc.hi; ctx.lineCap = 'round';   // gli archetti di luce sui lobi grandi, col puntino
        B.L.forEach(l => { l.body.filter(b => b.r > u * .14).sort((a, b) => b.r - a.r).slice(0, 1 + (r() < .5 ? 1 : 0)).forEach(b => { const c = b.c || (b.a[1] < b.b[1] ? b.a : b.b), R0 = b.r * (.62 + r() * .12), a0 = PI * (1.08 + r() * .1), a1 = a0 + .35 + r() * .25;
          const pts = []; for (let t = 0; t <= 1.001; t += .2) { const a = a0 + (a1 - a0) * t; pts.push([c[0] + Math.cos(a) * R0, c[1] + Math.sin(a) * R0]); } taperLine(ctx, pts, u * .05, u * .016, sc.hi);
          if (r() < .7) { const a = a1 + .28; ctx.beginPath(); ctx.arc(c[0] + Math.cos(a) * R0, c[1] + Math.sin(a) * R0, u * .024, 0, 7); ctx.fill(); } }); }); ctx.restore(); },
      deco: (ctx, U, bx) => {
        const n = Math.floor(r() * 4); for (let k = 0; k < n; k++) asterisk(ctx, bx[0] + r() * (bx[2] - bx[0]), Math.max(u * .1, bx[1] - u * (.05 + r() * .1)), u * (.06 + r() * .05), sc.ink === '#f4f4f2' ? '#141418' : sc.ink, r);   // gli asterischi sopra
        if (r() < .25) { ctx.save(); ctx.strokeStyle = sc.ink; ctx.lineWidth = Math.max(1.2, u * .018); ctx.lineCap = 'round'; const side = r() < .5 ? -1 : 1, X0 = side < 0 ? bx[0] - u * .06 : bx[2] + u * .06; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(X0 - side * u * (.25 + k * .08), (bx[1] + bx[3]) / 2, u * (.25 + k * .06), side < 0 ? PI * .8 : -PI * .2, side < 0 ? PI * 1.2 : PI * .2); ctx.stroke(); } ctx.restore(); }   // le linee di velocità
        if (r() < .3 && WM) { const l = pickR(r, B.L), b = l.body.reduce((a, c) => (c.r > a.r ? c : a)), c = b.c || b.a, tw = b.r * 1.3, th = b.r * .6, t = cv(Math.round(tw), Math.round(th)); WM.handTag(t.getContext('2d'), w.aka || 'NINO', Object.assign({}, WM.dna((w.hand || w.seed || 1) + 3), { skill: .8 }), t.width, t.height, r, sc.inner, 'mtag'); ctx.drawImage(t, c[0] - tw / 2, c[1] - th / 2); }   // la mini-tag dentro una lettera
        if (r() < .15) { const l = B.L[0], t = l.body.reduce((a, b) => { const cc = b.c || b.a; return cc[1] - b.r < a[1] ? [cc[0], cc[1] - b.r] : a; }, [0, 1e9]); ctx.save(); ctx.strokeStyle = r() < .5 ? '#f2d21a' : '#ffffff'; ctx.lineWidth = Math.max(2, u * .04); ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = u * .05; ctx.beginPath(); ctx.ellipse(t[0], t[1] - u * .12, u * .22, u * .06, -.1, 0, 7); ctx.stroke(); ctx.restore(); }   // l'aureola
        { const t = cv(Math.round(u * .9), Math.round(u * .32)); if (WM) WM.handTag(t.getContext('2d'), w.crew || 'PV', Object.assign({}, WM.dna((w.seed || 1) * 3 + 1), { skill: .8 }), t.width, t.height, r, sc.ink === '#f4f4f2' ? '#141418' : sc.ink, 'mtag'); ctx.drawImage(t, Math.min(Wp - t.width - 2, bx[2] - u * .5), Math.min(Hp - t.height - 2, bx[3] + u * .02)); }   // la crew a pennarello, sotto
      } });
  }
  // ---- le lettere a pennellata (semi-wild, wild): lo scheletro della lettera ripassato con una punta larga a scalpello: le aste
  // grosse e le traverse sottili (il contrasto), le estremità svasate e tagliate di sbieco, nel wild a punta; le curve morbide,
  // gli spigoli vivi; le lettere si avvicinano finché si sovrappongono
  function brushLetters(text, CN, wild, r, Wp, Hp, pad, bottom) {
    let L0 = letters(text, { h: 100, adv: .78, skew: .14 + Math.abs(CN.slant) * .5, bounce: .04, rot: .06, wob: 0, scale: .08, ext: wild ? .3 : .1, links: 0 }, r);
    L0 = evenOut(L0, wild ? 'wild' : 'semi', Object.assign({}, CN, { link: false }));
    const ov = (wild ? .17 : .1) * 100, gi = {}; L0.strokes.forEach(t => { gi[t.i] = 1; }); const ids = Object.keys(gi).map(Number).sort((a, b) => a - b);
    L0.strokes.forEach(t => { const k = ids.indexOf(t.i); t.pts = t.pts.map(([a, b]) => [a - k * ov, b]); });
    { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; L0.strokes.forEach(t => t.pts.forEach(([a, b]) => { x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b); })); L0.box = [x0, y0, x1, y1]; }
    const lw0 = .3 + CN.weight * .25, avail = Hp - bottom - 2 * pad, padK = pad + avail / (1 + lw0) * lw0 * .55, L = fit(L0, Wp, Hp - bottom, padK, 1.3), capH = Math.max(1, L.box[3] - L.box[1]), lw = capH * lw0;   // il margine: quanto sporge la pennellata oltre lo scheletro
    const nibA = -.85 + r() * .4, con = .35 + CN.con * .6, flare = wild ? .25 : .45;
    const groups = {}; L.strokes.forEach(t => { (groups[t.i] = groups[t.i] || []).push(t); });
    const masks = ids.map(i => {
      const m = cv(Wp, Hp), mx = m.getContext('2d'); mx.fillStyle = '#fff';
      (groups[i] || []).forEach(t => {
        let pts = smoothK(t.pts, 3); if (pts.length === 1) { mx.beginPath(); mx.arc(pts[0][0], pts[0][1], lw * .55, 0, 7); mx.fill(); return; }
        const n = pts.length, dirs = []; for (let k = 0; k < n - 1; k++) { const dx = pts[k + 1][0] - pts[k][0], dy = pts[k + 1][1] - pts[k][1], l = hyp(dx, dy) || 1; dirs.push([dx / l, dy / l]); }
        const wAt = (k, d) => lw * Math.max(.32, (1 + flare * Math.pow(Math.abs(2 * k / (n - 1) - 1), 3)) * (1 - con + con * Math.abs(Math.sin(Math.atan2(d[1], d[0]) - nibA)) * 1.25));
        const Lf = [], Rt = [];
        for (let k = 0; k < n; k++) { const d0 = dirs[Math.max(0, k - 1)], d1 = dirs[Math.min(n - 2, k)], ax = d0[0] + d1[0], ay = d0[1] + d1[1], al = hyp(ax, ay) || 1, tx = ax / al, ty = ay / al, w = wAt(k, [tx, ty]) / 2; Lf.push([pts[k][0] - ty * w, pts[k][1] + tx * w]); Rt.push([pts[k][0] + ty * w, pts[k][1] - tx * w]);
          if (k > 0 && k < n - 1 && Math.abs(Math.atan2(d0[0] * d1[1] - d0[1] * d1[0], d0[0] * d1[0] + d0[1] * d1[1])) > .5) { mx.beginPath(); mx.arc(pts[k][0], pts[k][1], w * .98, 0, 7); mx.fill(); } }   // lo spigolo: pieno
        const free = e => !(groups[i] || []).some(o => o !== t && o.pts.some(q => hyp(q[0] - e[0], q[1] - e[1]) < lw * .9));
        const cap = (end) => { const k = end ? n - 1 : 0, d = end ? dirs[n - 2] : [-dirs[0][0], -dirs[0][1]], p = pts[k], w = wAt(k, d) / 2, a = end ? Lf[k] : Rt[k], b = end ? Rt[k] : Lf[k];
          if (!free(p)) return [[p[0] + d[0] * w * .9 - d[1] * w * .4, p[1] + d[1] * w * .9 + d[0] * w * .4], [p[0] + d[0] * w * .9 + d[1] * w * .4, p[1] + d[1] * w * .9 - d[0] * w * .4]];   // tocca un'altra asta: entra dentro
          if (wild && !t.link) { const L2 = w * (2.4 + r() * 2); return [[p[0] + d[0] * L2, p[1] + d[1] * L2]]; }   // la punta
          const sk = (r() < .5 ? 1 : -1) * (.5 + r() * .5); return [[a[0] + d[0] * w * (.5 + sk * .6), a[1] + d[1] * w * (.5 + sk * .6)], [b[0] + d[0] * w * (.5 - sk * .6), b[1] + d[1] * w * (.5 - sk * .6)]]; };   // il taglio di sbieco
        const poly = Lf.concat(cap(true), Rt.slice().reverse(), cap(false));
        mx.beginPath(); poly.forEach(([a, b], k) => k ? mx.lineTo(a, b) : mx.moveTo(a, b)); mx.closePath(); mx.fill();
      });
      return m;
    });
    return { masks, capH, lw, ids, groups, box: L.box };
  }
  // ---- il pezzo a inchiostro: lettere costruite (block, semi, wild, a spine, 3D) ----
  function pieceInk(w, P, C, r, Wp, Hp, snap, paths, radii, x) {
    const q = C.q, CN = w.cons || consOf(w.hand || w.seed || 1), sc = inkScheme(r, P), text = DEACC(w.words || w.aka || 'NINO').replace(/[^A-Z0-9]/g, '') || 'NINO';
    if (C.fam === 'contorno') Object.assign(sc, { fill: '#f6f4f0', light: '#ffffff', shade: pickR(r, ['#d8d4cc', mixC(sc.fill, '#ffffff', .45)]), ink: '#141418', inner: '#141418', shadow: pickR(r, ['#141418', sc.fill, '#8a8a92']) });   // [graffiti4] il bozzetto: bianco col contorno nero
    const wild = /^(wild|spiky)$/.test(C.fam) && q > .4, semi = wild || C.fam === 'semi' || C.fam === 'astratto' || C.fam === 'script', heavy = C.fam === 'heavy' || C.fam === 'tridi';
    const t = clamp(CN.weight * (heavy ? 1.3 : 1.12), .2, heavy ? .38 : .32), wL = Math.max(clamp(CN.width, .62, .95), 2 * t + .22), sl = .1 + Math.abs(CN.slant) * .8, gap = -(.03 + r() * .06) - (wild ? .04 : 0);
    const rs = mulberry((w.hand || w.seed || 1) * 104729 + 1), th0 = Math.min(t, .22);
    const sloganH = C.slogan ? Hp * .1 : 0, pad = Hp * .16, d3k = .14 + r() * .1, ang = .5 + r() * .5;
    let L = [], cur = 0, S, toPx, masks;
    if (semi) {   // [graffiti4] semi e wild: le lettere a pennellata
      const BL = brushLetters(text, CN, wild, r, Wp, Hp, Hp * .08, sloganH + Hp * d3k * .7); masks = BL.masks; S = BL.capH;
      toPx = (l, [u, v]) => { const bb = l.bb; return [bb[0] + (bb[2] - bb[0]) * u / Math.max(.01, l.w), bb[1] + (bb[3] - bb[1]) * v]; };
      L = masks.map(m => ({ w: 1, bb: bboxC(m) }));
    } else {
    [...text].forEach((ch, k) => { const ww = ch === 'I' ? t : wL * BW(ch); L.push({ ch, x0: cur, w: ww, dy: (k % 2 ? -1 : 1) * (.02 + r() * .05) * (semi ? 1.5 : 1), rot: (r() - .5) * (semi ? .16 : .08), sc: k === 0 ? 1.14 : .93 + r() * .12, polys: blockGlyph(ch, t, ww) }); cur += ww + gap; });
    // la costruzione: le stesse regole su tutte le lettere (il calcio, la bandierina), nel semi le frecce, nel wild le punte a ogni estremità libera
    L.forEach(l => {
      if (q > .35 && /[BDEFHKLMNPRIU]/.test(l.ch) && rs() < .6) l.polys.push([[t * .5, 1 - th0 * .9], [-.15 - rs() * .06, 1 + .02], [t * .5, 1]]);
      if (q > .4 && /[EFTZS57]/.test(l.ch)) l.polys.push([[l.w - t * .6, 0], [l.w + .1, -.12 - rs() * .06], [l.w - .01, th0 * .9]]);
      if (wild) l.polys.slice().forEach(pl => { if (pl.hole || pl.length !== 4 || rs() > .45) return; const e = rs() < .5 ? [pl[0], pl[1]] : [pl[2], pl[3]], o0 = pl[rs() < .5 ? 3 : 1], mx = (e[0][0] + e[1][0]) / 2, my = (e[0][1] + e[1][1]) / 2, dx = mx - o0[0], dy = my - o0[1], d = hyp(dx, dy) || 1;
        l.polys.push([e[0], [mx + dx / d * t * (1.1 + rs() * .8), my + dy / d * t * (1.1 + rs() * .8)], e[1]]); });   // la punta che esce dalla barra
    });
    if (semi && q > .45) { const l = L[Math.floor(rs() * L.length)], th = Math.min(t, .2); l.polys.push([[l.w * .5 - th / 2, 0], [l.w * .5 + th / 2, 0], [l.w * .5 + th / 2 + .1, -.3], [l.w * .5 - th / 2 + .1, -.3]], [[l.w * .5 - th * 1.4 + .1, -.26], [l.w * .5 + .14, -.58], [l.w * .5 + th * 1.4 + .1, -.26]]); }   // la freccia che sale da una lettera
    { const l = L[L.length - 1], th = Math.min(t, .2), aw = .34; if (semi && rs() < .7) { l.polys.push([[l.w - .05, 1 - th], [l.w + aw * .55, 1 - th], [l.w + aw * .55, 1], [l.w - .05, 1]], [[l.w + aw * .4, 1 - th * 2.1], [l.w + aw, 1 - th / 2], [l.w + aw * .4, 1 + th * 1.1]]); cur += aw; } }   // la freccia in fondo
    const totW = cur - gap + sl;
    S = Math.min((Wp - 2 * pad - Hp * d3k) / totW, (Hp - 1.6 * pad - sloganH - Hp * d3k * .7) / 1.15);
    const ox0 = (Wp - (totW * S + Hp * d3k * .6)) / 2, oy0 = (Hp - sloganH - S * 1.1 - Hp * d3k * .6) / 2 + S * .2;
    toPx = (l, [u, v]) => { const c = Math.cos(l.rot), sn = Math.sin(l.rot), a = (u - l.w / 2) * l.sc, b = (v - .6) * l.sc, U = l.w / 2 + a * c - b * sn, V = .6 + a * sn + b * c; return [ox0 + (l.x0 + U + (1 - V) * sl) * S, oy0 + (V + l.dy) * S]; };
    const corner = { cut: .02, spike: .02, flare: .07, round: .14 }[CN.term] ?? .05;
    masks = L.map(l => { const m = cv(Wp, Hp); fillPolys(m.getContext('2d'), l, toPx); return blurThresh(m, Math.max(.6, corner * t * S), .5); });
    }
    const d3 = S * d3k * (heavy ? 1.5 : 1), dx = Math.cos(ang) * d3, dy = Math.sin(ang) * d3, ow = Math.max(3, S * (.05 + r() * .02)), iw = Math.max(2, S * (.03 + r() * .012));
    const bgk = r() < .35 ? 'burst' : r() < .55 ? 'cloud' : null;
    inkRender({ Wp, Hp, masks, sc, r, S, x, snap, paths, radii, seed: (w.seed || 1) * 7 + 5, ow, iw, dx, dy, extrude: true, border: r() < .55 ? S * (.04 + r() * .04) : 0, drips: r() < .2 ? 2 + Math.floor(r() * 4) : 0, dripLen: S * .4, dripW: S * .035, rim: true,
      fillKind: pickR(r, (P.fills && r() < .5) ? P.fills.map(f => ({ macchie: 'macchie', sfumato: 'sfuma', strisce: 'strisce', split: 'ombra', scacchi: 'pois' })[f] || 'sfuma') : ['sfuma', 'sfuma', 'sfuma', 'ombra', 'ombra', 'macchie', 'tratteggio', 'strisce', 'liquido', 'mattoni']),
      bg: bgk ? (U, bx) => { const m = cv(Wp, Hp), mx = m.getContext('2d'), cx = (bx[0] + bx[2]) / 2, cy = (bx[1] + bx[3]) / 2, mg = Hp * .05, rx = Math.min((bx[2] - bx[0]) * .56, (cx - mg) / 1.3, (Wp - cx - mg) / 1.3), ry = Math.min((bx[3] - bx[1]) * .8, (cy - mg) / 1.3, (Hp - cy - mg) / 1.3); mx.fillStyle = '#fff';   // [graffiti4] dentro il riquadro: niente tagli dritti
          if (bgk === 'burst') { mx.beginPath(); const n = 18 + Math.floor(r() * 10); for (let k = 0; k < n * 2; k++) { const a = k / (n * 2) * PI * 2, rr = k % 2 ? .72 : .98 + r() * .3; mx.lineTo(cx + Math.cos(a) * rx * rr, cy + Math.sin(a) * ry * rr); } mx.closePath(); mx.fill(); }
          else { const ex = (bx[2] - bx[0]) / 2, ey = (bx[3] - bx[1]) / 2, n = 10 + Math.floor(r() * 5); mx.beginPath(); mx.ellipse(cx, cy, ex * .95, ey * .85, 0, 0, 7); mx.fill();   // la nuvola: bolle grosse attorno a un ovale, dentro il riquadro
            for (let k = 0; k < n; k++) { const a = k / n * PI * 2 + r() * .3, px = cx + Math.cos(a) * ex * .92, py = cy + Math.sin(a) * ey * .82, R1 = Math.min(ey * (.45 + r() * .3), px - mg, Wp - px - mg, py - mg, Hp - py - mg); if (R1 > S * .05) { mx.beginPath(); mx.arc(px, py, R1, 0, 7); mx.fill(); } } }
          const paint = tintTo(m, sc.bg, Wp, Hp), px = paint.getContext('2d'); px.globalCompositeOperation = 'source-atop'; px.fillStyle = sc.bg2; for (let k = 0; k < (bx[2] - bx[0]) / S * 10; k++) { px.globalAlpha = .6; px.beginPath(); px.arc(bx[0] - S * .3 + r() * (bx[2] - bx[0] + S * .6), bx[1] - S * .3 + r() * (bx[3] - bx[1] + S * .6), S * (.015 + r() * .035), 0, 7); px.fill(); }   // i puntini nello sfondo
          return { mask: m, paint }; } : null,
      hilite: (ctx) => { ctx.save(); ctx.strokeStyle = sc.hi; ctx.lineCap = 'round';   // i tagli bianchi: due righe sottili parallele per lettera, sempre allo stesso angolo
        const ka = -1.1 + r() * .3; masks.forEach((m, i) => { if (rs() < .35) return; const c = cv(Wp, Hp), cx2 = c.getContext('2d'), l = L[i], [mx0, my0] = toPx(l, [l.w * (.2 + rs() * .6), .3 + rs() * .4]); cx2.strokeStyle = '#fff'; cx2.lineCap = 'round'; [[0, S * .02], [S * .06, S * .009]].forEach(([o, wd]) => { cx2.lineWidth = Math.max(1, wd); cx2.beginPath(); cx2.moveTo(mx0 + o - Math.cos(ka) * S * .4, my0 - Math.sin(ka) * S * .4); cx2.lineTo(mx0 + o + Math.cos(ka) * S * .4, my0 + Math.sin(ka) * S * .4); cx2.stroke(); });
          cx2.globalCompositeOperation = 'destination-in'; cx2.drawImage(erode(m, ow * .5), 0, 0); ctx.drawImage(tintTo(c, sc.hi, Wp, Hp), 0, 0); });
        ctx.restore(); },
      deco: (ctx, U, bx) => {
        for (let k = 0; k < 1 + Math.floor(r() * 3); k++) { const cx2 = bx[0] + r() * (bx[2] - bx[0]), cy2 = bx[1] + r() * (bx[3] - bx[1]) * .4; ctx.save(); ctx.strokeStyle = '#ffffff'; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1, S * .012); const s2 = S * (.12 + r() * .1); for (const a of [0, PI / 2]) { ctx.beginPath(); ctx.moveTo(cx2 - Math.cos(a) * s2, cy2 - Math.sin(a) * s2); ctx.lineTo(cx2 + Math.cos(a) * s2, cy2 + Math.sin(a) * s2); ctx.stroke(); } for (const a of [PI / 4, -PI / 4]) { ctx.beginPath(); ctx.moveTo(cx2 - Math.cos(a) * s2 * .45, cy2 - Math.sin(a) * s2 * .45); ctx.lineTo(cx2 + Math.cos(a) * s2 * .45, cy2 + Math.sin(a) * s2 * .45); ctx.stroke(); } ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx2, cy2, S * .02, 0, 7); ctx.fill(); ctx.restore(); }   // la stella a raggi sottili
        if (r() < .2) { const [hx, hy] = toPx(L[0], [L[0].w * .5, -.12]); ctx.save(); ctx.strokeStyle = r() < .5 ? '#f2d21a' : '#ffffff'; ctx.lineWidth = Math.max(2, S * .035); ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = S * .06; ctx.beginPath(); ctx.ellipse(hx, hy, S * .28, S * .07, -.12, 0, 7); ctx.stroke(); ctx.restore(); }   // l'aureola
        const ink = lumC(sc.border) > .6 || !sc.border ? '#141418' : '#f4f4f2';
        if (WM) { const tw = Math.min(Wp * .22, S * 1.2), th = S * .35, t2 = cv(Math.round(tw), Math.round(th)); WM.handTag(t2.getContext('2d'), (w.crew || 'PVK') + (C.yr ? ' ' + C.yr : ''), Object.assign({}, WM.dna((w.seed || 1) * 3 + 1), { skill: .85 }), t2.width, t2.height, r, ink, 'mtag'); ctx.drawImage(t2, Math.min(Wp - tw - 2, bx[2] - tw * .8), Math.min(Hp - th - 2, bx[3] + S * .05)); }   // la crew e l'anno a pennarello
        if (sloganH) smallTag(ctx, C.slogan, Wp / 2, Hp - sloganH * .55, sloganH * .7, ink, mulberry((w.seed || 1) + 99), Wp * .85);
      } });
  }

  // ================= IL WHOLE CAR =================
  // [writer] la fiancata intera, da un capo all'altro e da sopra a sotto: il fondo (il rullo a due colori con le passate e le
  // colature, il cielo con le nuvole, o una scena), il pezzo grande coi motori dei muri, di lato il throw-up della crew o il
  // personaggio, poi la data, la crew e le tag dei soci negli angoli. Ogni fase è un passo del riempimento.
  function trainArt(w, P, C, r, Wp, Hp, stages, paths, radii) {
    const q = C.q, out = cv(Wp, Hp), x = out.getContext('2d'), push = () => { const k = cv(Wp, Hp); k.getContext('2d').drawImage(out, 0, 0); stages.push(k); };
    // 1. il fondo: lascia un filo di carro nudo sopra e sotto, sfrangiato (il rullo non arriva al bordo)
    const BG = cv(Wp, Hp), b = BG.getContext('2d'), kind = w.bgk && w.bgk !== 'rullo' ? 'scena' : pickR(r, ['rullo', 'rullo', 'cielo', 'cielo', 'scena']), m0 = Hp * (.03 + r() * .03), m1 = Hp * (.03 + r() * .04);
    if (kind === 'scena') background(b, w.bgk && w.bgk !== 'rullo' ? w.bgk : pickR(r, ['sole', 'skyline', 'radici']), P, Wp, Hp, r, 'treno');
    else if (kind === 'cielo') { const g = b.createLinearGradient(0, 0, 0, Hp); g.addColorStop(0, shade(P.bg, -.25)); g.addColorStop(.6, P.bg); g.addColorStop(1, shade(P.bg, .3)); b.fillStyle = g; b.fillRect(0, 0, Wp, Hp);
      const M = cv(Wp, Hp), mx = M.getContext('2d'); mx.fillStyle = '#fff'; for (let xx = -Hp * .2; xx < Wp + Hp * .2; xx += Hp * (.18 + r() * .2)) { mx.beginPath(); mx.arc(xx, Hp * (.82 + r() * .12), Hp * (.12 + r() * .14), 0, 7); mx.fill(); }   // le nuvole basse, fuse
      const Cl = blurThresh(M, Hp * .03, .5), ck = Cl.getContext('2d'); ck.globalCompositeOperation = 'source-in'; ck.fillStyle = shade(P.bg, .7); ck.fillRect(0, 0, Wp, Hp); b.save(); b.filter = `blur(${(Hp * .01).toFixed(1)}px)`; b.drawImage(Cl, 0, 0); b.restore();
      for (let k = 0; k < 14; k++) sparkle(b, r() * Wp, Hp * (.08 + r() * .45), Hp * (.02 + r() * .03), 'rgba(255,255,255,.85)'); }
    else { const c0 = P.bg, c1 = pickR(r, [P.d, shade(P.bg, -.35), P.f[0]]), yb = Hp * (.5 + r() * .2); b.fillStyle = c0; b.fillRect(0, 0, Wp, Hp); b.fillStyle = c1; b.beginPath(); b.moveTo(0, yb); for (let xx = 0; xx <= Wp; xx += Hp * .12) b.lineTo(xx, yb + Math.sin(xx / Hp * 2.1 + r()) * Hp * .03); b.lineTo(Wp, Hp); b.lineTo(0, Hp); b.closePath(); b.fill();
      b.save(); b.globalAlpha = .07; for (let yy = 0; yy < Hp; yy += Hp * (.035 + r() * .03)) { b.fillStyle = r() < .5 ? '#000' : '#fff'; b.fillRect(0, yy, Wp, Hp * (.012 + r() * .02)); } b.restore();   // le passate del rullo
      b.fillStyle = c0; for (let k = 0; k < Wp / (Hp * .25); k++) { const xx = r() * Wp, l = Hp * (.03 + r() * r() * .18), wd = Hp * (.008 + r() * .01); b.fillRect(xx, yb - 2, wd, l); b.beginPath(); b.arc(xx + wd / 2, yb + l, wd * .6, 0, 7); b.fill(); } }   // le colature del colore di sopra
    { b.save(); b.globalCompositeOperation = 'destination-out'; b.fillStyle = '#000'; const edge = (y0, dir) => { b.beginPath(); b.moveTo(0, dir < 0 ? 0 : Hp); for (let xx = 0; xx <= Wp; xx += Hp * .04) b.lineTo(xx, y0 + (r() - .5) * Hp * .02); b.lineTo(Wp, dir < 0 ? 0 : Hp); b.closePath(); b.fill(); }; edge(m0, -1); edge(Hp - m1, 1); b.restore(); }
    x.drawImage(BG, 0, 0); stages.push(handify(out, (w.seed || 1) * 7 + 1, q, {})); paths.push(raster(Wp, Hp, 6)); radii.push(Hp * .13);
    // 2. il pezzo grande: alto quasi quanto la fiancata, a sinistra o al centro
    const side = r() < .55 ? (r() < .5 ? 'crew' : 'mostro') : null, pw = w.W * (side ? .57 : .8), ph = w.H * .84, base = { aka: w.aka, crew: w.crew, words: w.words, hand: w.hand, cons: w.cons, dna: w.dna, pal: w.pal, q: w.q, by: w.by, slogan: null, bgk: null };
    const fam = /^(block|heavy|piatto|astratto|bubble|fat|semi)$/.test(C.fam) ? C.fam : pickR(r, ['block', 'heavy', 'astratto', 'bubble', 'fat']);
    const main = art(Object.assign({}, base, { style: 'burner', fam, W: pw, H: ph, seed: (w.seed || 1) * 3 + 1 })), ox = Math.round(side ? Wp * .03 : (Wp - main.Wp) / 2), oy = Math.round((Hp - main.Hp) / 2);
    main.stages.forEach(s0 => { x.clearRect(0, 0, Wp, Hp); x.drawImage(BG, 0, 0); x.drawImage(s0, ox, oy); push(); });
    const LAY = cv(Wp, Hp), ly = LAY.getContext('2d'); ly.drawImage(main.stages[main.stages.length - 1], ox, oy);
    main.paths.forEach((pt, k) => { paths.push(pt.map(([a, bb]) => [a + ox, bb + oy])); radii.push(main.radii[k]); });
    // 3. di lato: il throw-up della crew, o il personaggio
    const gaps = [[Wp * .01, ox]]; let gx1 = Wp * .99;
    if (side) { const sw = w.W * .3, sh = w.H * (side === 'mostro' ? .86 : .7), sub = art(Object.assign({}, base, side === 'mostro' ? { style: 'mostro', W: sw, H: sh, seed: (w.seed || 1) * 5 + 2 } : { style: 'throw', words: w.crew || 'PVK', W: sw, H: sh, seed: (w.seed || 1) * 5 + 2, pal: (w.pal || 0) + 3 })), sx = Math.round(Wp - sub.Wp - Wp * .025), sy = Math.round((Hp - sub.Hp) / 2 + (side === 'crew' ? Hp * .05 : 0));
      sub.stages.forEach(s0 => { x.clearRect(0, 0, Wp, Hp); x.drawImage(BG, 0, 0); x.drawImage(LAY, 0, 0); x.drawImage(s0, sx, sy); push(); });
      gx1 = sx; ly.drawImage(sub.stages[sub.stages.length - 1], sx, sy); sub.paths.forEach((pt, k) => { paths.push(pt.map(([a, bb]) => [a + sx, bb + sy])); radii.push(sub.radii[k]); }); }
    gaps.push([ox + main.Wp, gx1]); if (side) gaps.push([gx1 + Wp * .27, Wp * .99]);
    const free = gaps.filter(([a, bb]) => bb - a > Wp * .05).sort((u, v) => (v[1] - v[0]) - (u[1] - u[0]));   // gli spazi liberi, i più larghi prima
    // 4. i dettagli: la data e la crew in basso, le tag dei soci, solo negli spazi liberi (mai sopra il pezzo)
    x.clearRect(0, 0, Wp, Hp); x.drawImage(BG, 0, 0); x.drawImage(LAY, 0, 0);
    const ink = lum(P.bg) > .55 ? '#141418' : '#f2efe6', d = new Date(2026, 9, 1 + Math.floor(r() * 28)), date = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear()).slice(2)}`;
    const G0 = free[0], G1 = free[1] || free[0];
    if (G0) { smallTag(x, (w.crew || 'PVK') + ' CREW', (G0[0] + G0[1]) / 2, Hp - m1 - Hp * .08, Hp * .065, ink, r, (G0[1] - G0[0]) * .9); smallTag(x, date, (G1[0] + G1[1]) / 2, Hp - m1 - Hp * (G1 === G0 ? .18 : .08), Hp * .06, ink, r, (G1[1] - G1[0]) * .9); }
    if (WM && WM.handTag) for (let k = 0; k < Math.min(free.length * 2, 2 + Math.floor(r() * 2)); k++) { const Gk = free[k % free.length], tw = Math.min(Wp * .07, (Gk[1] - Gk[0]) * .85), th = Hp * .16, tc = cv(Math.round(tw), Math.round(th)), nm = pickR(r, ['KEOS', 'DUNE', 'RAKE', 'ZORA', 'NEMO', 'KRAN', 'BLES', w.aka || 'PV']); WM.handTag(tc.getContext('2d'), nm, Object.assign({}, WM.dna(Math.floor(r() * 1e6)), { skill: .8 }), tc.width, tc.height, r, ink, 'mtag'); x.drawImage(tc, Gk[0] + (Gk[1] - Gk[0] - tw) * r(), k < free.length ? m0 + Hp * .02 : Hp * .4); }   // le tag dei soci
    push(); paths.push(raster(Wp, Hp, 2)); radii.push(Hp * .15);
  }
  const lum = h => { const n = parseInt(String(h).slice(1, 7), 16); return ((n >> 16) * .3 + ((n >> 8) & 255) * .59 + (n & 255) * .11) / 255; };
  // =====================================================================================================================
  // [graffiti3] GLI ALTRI STILI DELLA STRADA. Oltre a tag, throw-up, pezzi e burner, quello che si vede davvero sui muri:
  // - il RULLO (blockbuster a rullo): lettere piene e piatte, enormi, uno o due colori, fatte col rullo su un palo: in alto, sui
  //   muri ciechi, sui capannoni; a volte solo il contorno; colature grosse.
  // - il VERTICALE sui palazzi: le lettere una sotto l'altra dal tetto in giù. A rullo (dal tetto, col palo), a bolle, o in «pixo»
  //   (le aste alte, sottili e spigolose dei muri di San Paolo, nero o bianco, fatte arrampicandosi).
  // - la tag a ESTINTORE: un estintore caricato di vernice e aria compressa fa lettere alte metri, sporche, che colano per metri.
  // - lo STENCIL: la mascherina ritagliata, una sagoma a un colore coi ponticelli, la stessa ripetuta per tutta la città.
  // - la SCRITTA a pennello: la tradizione italiana del muro politico, d'amore, degli ultras: stampatello di getto, l'A cerchiata,
  //   la stella, il cuore, le colature del pennello.
  // - il MANIFESTO attaccato con la colla: fogli strappati e sovrapposti, uno slogan stampato, un volto, una retinatura.
  // - gli ADESIVI: il grappolo di slap («ciao mi chiamo»), i tondi delle crew, le facce, su pali, porte, cassonetti.
  // - il MURALE: il muralismo dei paesi (Orgosolo): campiture piatte, contorni neri grossi, i pescatori, i volti, i pugni che
  //   rompono il muro, le bici, l'isola col faro, la fascia con la frase.
  // - il CALLIGRAFFITI: la pennellessa larga che scrive una parola sola, grande, astratta, su un fondo a rullo.
  // Tutto dal seme: lo stesso lavoro si ridisegna uguale. Le misure di partenza stanno in DEF (writing.js STYLES le ripete).
  // =====================================================================================================================
  const DEF = { tag: [1.1, .55], mtag: [.6, .32], throw: [2.7, 1.3], pezzo: [4.8, 2.05], burner: [6.6, 2.5], gotico: [1.4, 3.2], mostro: [3, 2.6], wholecar: [16, 2.9],
    rullo: [9, 2.4], verticale: [2, 7], estintore: [3, 4], stencil: [1, 1.1], scritta: [4.5, .75], manifesto: [1.2, 1.4], adesivi: [.6, .5], murale: [6.5, 4], calli: [4.2, 2.2] };
  const SCRITTE = {
    politica: ['GRIGI FUORI', 'LIBERTA', 'NO AL MURO', 'IL VAPORE E DI TUTTI', 'NO RATE', 'GARANTE DIMETTITI', 'PANE E SOLE', 'LA STRADA E NOSTRA', 'DISGELO SUBITO', 'VIA I GRIGI DAL PORTO', 'CASE NON CASERME', 'LAVORO PER TUTTI', 'NO AL CARBONE', 'IL MURO CADRA', 'NESSUNO E ILLEGALE'],
    amore: ['GIULIA TI AMO', 'NINO + ROSA', 'SEI LA MIA VITA', 'TI AMO DA MORIRE', 'TORNA', 'PAOLA 6 TUTTO', 'MARCO E LUCIA', 'TI PENSO', 'SCUSAMI', 'LAURA PERDONAMI', 'TI ASPETTO AL MOLO', 'SARA X SEMPRE'],
    ultras: ['CVR ULTRAS', 'CURVA MARE', 'ONORE AI RAGAZZI', 'CURVA SUD OLE', 'ZONA CVR', 'DIFFIDATI LIBERI', 'FORZA PORTO', 'CVR 1979', 'SOLO LA CURVA'],
    strada: ['ZONA RSC', 'QUI COMANDA LA SCOGLIERA', 'TOY FUORI', 'PVK IN CASA', 'KINGS', 'TNT TUTTA LA NOTTE', 'BDS SULLA SCOGLIERA', 'OGS NON MUORE'],
  };
  const MANIFESTI = ['IL DISGELO\nE QUI', 'RATE?\nNO', 'SABATO SERA\nLIVE AL\nBAR SIRENA', 'CONCERTO\nRADICI\nORE 22', 'ASSEMBLEA\nGIOVEDI\nAL CALDO', 'CERCASI\nVESPA', 'SOLE\nPER TUTTI', 'NO AL\nCARBONE', 'FESTA DEL\nPORTO', 'SCIOPERO\nGENERALE', 'LA STRADA\nE NOSTRA', 'DISCO\nAURORA\nVENERDI', 'SMARRITO\nGATTO MIMI', 'CINEMA\nASTOR\nULTIMA PRIMA'];
  const STENCIL_TXT = ['GRIGI GO HOME', 'NO', 'PEDALA', 'DISGELO', 'SOLE PER TUTTI', 'OINK', 'SVEGLIA', 'LIBERI', 'NO RATE', 'RESPIRA', 'CHI PAGA?', 'VOTA SOLE', 'OCCHIO', 'RESISTI'];
  const STENCIL_MOTIFS = ['grigio', 'grigio', 'sole', 'bboy', 'banchiere', 'boombox', 'skater', 'bici', 'bici', 'pesce', 'pugno', 'tv', 'ratto', 'ratto', 'stella', 'ancora', 'bomboletta', 'asino', 'occhio'];
  const MURALI_TXT = { pesca: ['IL MARE E DI CHI LO PESCA', 'VIVIAMO DI MARE', 'LE RETI NON SI PAGANO A RATE'], volti: ['NOI SIAMO IL PORTO', 'LA MEMORIA NON SI CANCELLA', 'LE DONNE DEL PORTO'], pugni: ['IL MURO CADE', 'UNITI SI VINCE', 'NESSUN MURO E PER SEMPRE'], bici: ['PEDALA E RESPIRA', 'PIU BICI MENO RATE', 'LA SALITA E NOSTRA'], isola: ['ISOLA LIBERA', 'IL FARO NON SI SPEGNE'] };
  // ---- attrezzi comuni ----
  const tintTo = (src, col, Wp, Hp) => { const k = cv(Wp, Hp), kx = k.getContext('2d'); kx.drawImage(src, 0, 0); kx.globalCompositeOperation = 'source-in'; if (typeof col === 'string') { kx.fillStyle = col; kx.fillRect(0, 0, Wp, Hp); } else kx.drawImage(col, 0, 0); return k; };
  // la trama del rullo: le passate un filo più chiare e più scure, dentro quello che c'è già (source-atop)
  function rollerTex(x, Wp, Hp, r, vert, k) { x.save(); x.globalCompositeOperation = 'source-atop'; x.globalAlpha = .09 * (k || 1); const step = Math.max(3, (vert ? Wp : Hp) * .03); for (let v = 0; v < (vert ? Wp : Hp); v += step * (1 + r())) { x.fillStyle = r() < .5 ? '#000' : '#fff'; if (vert) x.fillRect(v, 0, step * (.4 + r() * .8), Hp); else x.fillRect(0, v, Wp, step * (.4 + r() * .8)); } x.restore(); }
  // le colature grosse (rullo, estintore): dal bordo basso di una maschera, a gruppi, col rigonfiamento in fondo
  function bigDrips(x, mask, col, Wp, Hp, r, n, len, wd) {
    const A = mask.getContext('2d').getImageData(0, 0, Wp, Hp).data, bot = []; for (let xx = 1; xx < Wp - 1; xx += 2) { for (let yy = Hp - 1; yy >= 0; yy--) if (A[(yy * Wp + xx) * 4 + 3] > 128) { bot.push([xx, yy]); break; } }
    if (!bot.length) return; x.save(); x.fillStyle = col; x.strokeStyle = col; x.lineCap = 'round';
    for (let k = 0; k < n; k++) { const [px, py] = pickR(r, bot), L = Math.min(Hp - py - 2, len * (.2 + r() * r() * .8)), w0 = wd * (.5 + r() * .7); if (L < wd) continue; x.lineWidth = w0; x.beginPath(); x.moveTo(px, py - w0); x.lineTo(px + (r() - .5) * 2, py + L); x.stroke(); x.beginPath(); x.ellipse(px, py + L, w0 * .7, w0 * .95, 0, 0, 7); x.fill(); }
    x.restore();
  }
  // la parola a blocchi (le lettere di blockGlyph, altezza 1) con lo spazio fra le lettere; lo spazio bianco è una lettera vuota
  function blockWord(text, t, wL, gap) { const L = []; let cur = 0; [...text].forEach(ch => { if (ch === ' ') { L.push({ ch, x0: cur, w: .35, polys: [] }); cur += .35 + gap; return; } const ww = ch === 'I' ? t : wL * BW(ch); L.push({ ch, x0: cur, w: ww, polys: blockGlyph(ch, t, ww) }); cur += ww + gap; }); return { L, tot: cur - gap }; }
  function letterMask(l, toPx, Wp, Hp, corner, S) { const m = cv(Wp, Hp); fillPolys(m.getContext('2d'), l, toPx); return corner > 0 ? blurThresh(m, corner * S, .5) : m; }
  // la mascherina: un'immagine ridotta a un colore solo (i pixel scuri), coi ponticelli tagliati come in uno stencil vero
  function stencilize(src, ink, Wp, Hp, r, thr, bridges) {
    const k = cv(Wp, Hp), kx = k.getContext('2d'); kx.drawImage(src, 0, 0); const d = kx.getImageData(0, 0, Wp, Hp), A = d.data;
    for (let i = 0; i < A.length; i += 4) { const lum = (A[i] * .3 + A[i + 1] * .59 + A[i + 2] * .11) / 255; A[i + 3] = A[i + 3] > 100 && lum < thr ? 255 : 0; }
    kx.putImageData(d, 0, 0); const T = tintTo(k, ink, Wp, Hp), tx = T.getContext('2d');
    tx.globalCompositeOperation = 'destination-out'; tx.strokeStyle = '#000'; tx.lineWidth = Math.max(1.5, Hp * .012); for (let i = 0; i < bridges; i++) { const a = r() * PI, cx0 = Wp * (.2 + r() * .6), cy0 = Hp * (.2 + r() * .6), L = Hp * .45; tx.beginPath(); tx.moveTo(cx0 - Math.cos(a) * L, cy0 - Math.sin(a) * L); tx.lineTo(cx0 + Math.cos(a) * L, cy0 + Math.sin(a) * L); tx.stroke(); }
    return T;
  }
  // ---- il rullo (una riga, o due) e il verticale a rullo (una lettera sotto l'altra) ----
  function rollerArt(w, P, C, r, Wp, Hp, snap, paths, radii, x, stacked) {
    const text0 = DEACC(w.words || w.aka || 'NINO').replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim() || 'NINO', text = stacked ? text0.replace(/ /g, '') : text0, n = text.replace(/ /g, '').length;
    const vr = mulberry((w.seed || 1) ^ 0x3d1f), V = { mode: pickR(vr, ['pieno', 'pieno', 'ombra', 'ombra', 'vuoto']), t: .3 + vr() * .12, col: vr() < .5 ? pickR(vr, FLATS) : P.f[1], col2: pickR(vr, ['#101012', '#f2efe6', '#d8201a', '#1c3aa8']), step: vr() < .4 ? .04 : 0 };
    if (V.col === V.col2) V.col2 = '#101012';
    const t = V.t, { L: L0, tot } = blockWord(text, t, .78, .08), pts = []; let toPx, S, L = L0;
    if (!stacked) {   // una riga (o due, se la parola è lunga e il muro è basso: si spezza allo spazio, o a metà)
      const rows = tot * Hp > Wp * 2.6 && n >= 6 ? 2 : 1, padX = Wp * .04, padY = Hp * .08, rowH = (Hp - 2 * padY) / rows, rowsL = [];
      let cutAt = L0.length; if (rows === 2) { const sp = L0.map((l, i) => l.ch === ' ' ? i : -1).filter(i => i > 0); cutAt = sp.length ? sp.reduce((a, c) => Math.abs(c - L0.length / 2) < Math.abs(a - L0.length / 2) ? c : a) : Math.ceil(L0.length / 2); }
      for (let k = 0; k < rows; k++) { const seg = L0.slice(k ? cutAt : 0, k ? L0.length : cutAt).filter(l => l.ch !== ' '), w0 = seg.reduce((s0, l) => s0 + l.w, 0) + .08 * (seg.length - 1); let cur = 0; seg.forEach(l => { l.x0 = cur; cur += l.w + .08; l.row = k; l.rowW = w0; }); rowsL.push(seg); }
      L = rowsL.flat();
      S = Math.min(...rowsL.map(seg => (Wp - 2 * padX) / seg[0].rowW), rowH * .82);
      toPx = (l, [u, v]) => [padX + (Wp - 2 * padX - l.rowW * S) / 2 + (l.x0 + u) * S, padY + l.row * rowH + (rowH - S) / 2 + (v + (V.step && L.indexOf(l) % 2 ? -V.step : 0)) * S];
    } else {   // una sotto l'altra, dal tetto in giù
      const padY = Hp * .03, padX = Wp * .07, cellH = (Hp - 2 * padY) / n; S = Math.min(cellH * .86, (Wp - 2 * padX) / Math.max(...L.map(l => l.w)));
      toPx = (l, [u, v]) => { const i = L.indexOf(l); return [padX + (Wp - 2 * padX - l.w * S) / 2 + u * S, padY + i * cellH + (cellH - S) / 2 + v * S]; };
    }
    const masks = L.map(l => letterMask(l, toPx, Wp, Hp, .04 * t, S)), ALL = cv(Wp, Hp), al = ALL.getContext('2d'); masks.forEach(m => al.drawImage(m, 0, 0));
    L.forEach(l => pts.push(toPx(l, [l.w / 2, .5])));
    const ol = Math.max(2, S * .045);
    // 1. il rullo: il colore pieno (con l'ombra staccata prima, se è in due colori), o il solo contorno
    if (V.mode === 'ombra') { const sh = cv(Wp, Hp); sh.getContext('2d').drawImage(ALL, S * .07, S * .08); x.drawImage(tintTo(sh, V.col2, Wp, Hp), 0, 0); }
    if (V.mode !== 'vuoto') { const F0 = tintTo(ALL, V.col, Wp, Hp); rollerTex(F0.getContext('2d'), Wp, Hp, r, stacked, 1.4); x.drawImage(F0, 0, 0); }
    else { const G0 = grow(ALL, ol * 2.2), gx = G0.getContext('2d'); gx.globalCompositeOperation = 'destination-out'; gx.drawImage(ALL, 0, 0); x.drawImage(tintTo(G0, V.col, Wp, Hp), 0, 0); }
    snap(x.canvas); paths.push(pts.slice()); radii.push(S * .6);
    // 2. il contorno (pieno: una linea attorno), le colature grosse
    if (V.mode === 'pieno') { const G0 = grow(ALL, ol * 1.6), gx = G0.getContext('2d'); gx.globalCompositeOperation = 'destination-out'; gx.drawImage(erode(ALL, 1), 0, 0); x.drawImage(tintTo(G0, V.col2, Wp, Hp), 0, 0); }
    bigDrips(x, ALL, V.col, Wp, Hp, r, 3 + Math.floor(r() * 5), S * .5, ol * 2.4);
    snap(x.canvas); paths.push(pts.slice()); radii.push(S * .7);
    // 3. la firma col rullo piccolo, l'anno
    const ink = V.mode === 'vuoto' ? V.col : V.col2; smallTag(x, (w.crew || 'PVK') + (C.yr ? ' ' + C.yr : ''), stacked ? Wp / 2 : Wp - Hp * .14, stacked ? Hp - Wp * .05 : Hp - Hp * .05, stacked ? Wp * .07 : Hp * .07, ink, r, stacked ? Wp * .8 : Wp * .3);
    snap(x.canvas); paths.push(raster(Wp, Hp, 2)); radii.push(Hp * .2);
  }
  // ---- il verticale a bolle: le lettere del throw-up una sotto l'altra ----
  function stackedBubbleArt(w, P, C, r, Wp, Hp, snap, paths, radii, x) {
    const text = DEACC(w.words || w.aka || 'NINO').replace(/[^A-Z0-9]/g, '') || 'NINO', n = text.length;
    SQ = 0; CUT = 0; const B = bubbleLayout(text, { adv: .8, jit: .08, rot: .12, bounce: 0, squash: 1.05, slant: 0, puff: 1.1 }, r), cellH = Hp / n, pad = Wp * .1;
    B.L.forEach((l, i) => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; l.body.forEach(b => (b.c ? [b.c] : [b.a, b.b]).forEach(([a, c]) => { x0 = Math.min(x0, a - b.r); x1 = Math.max(x1, a + b.r); y0 = Math.min(y0, c - b.r); y1 = Math.max(y1, c + b.r); }));
      const s = Math.min((Wp - 2 * pad) / (x1 - x0), cellH * .92 / (y1 - y0)), ox = (Wp - (x1 - x0) * s) / 2 - x0 * s, oy = i * cellH + (cellH - (y1 - y0) * s) / 2 - y0 * s, M = ([a, b]) => [a * s + ox, b * s + oy];
      l.body.forEach(b => { if (b.c) b.c = M(b.c); else { b.a = M(b.a); b.b = M(b.b); } b.r *= s; }); l.slits = l.slits.map(sl => sl.map(M)); l.holes.forEach(h => { h.c = M(h.c); h.rx *= s; h.ry *= s; }); l.s = s; });
    const u = Math.min(...B.L.map(l => l.s));
    INK.on = true; try { bubbleInk(Object.assign({}, w, { style: 'throw' }), P, Object.assign({}, C, { fam: C.fam === 'bolle' ? 'bubble' : 'throwie' }), r, Wp, Hp, snap, paths, radii, x, { B, u }); } finally { INK.on = false; }   // [graffiti4] lo stesso inchiostro dei throw-up
  }
  // ---- il pixo: aste alte, sottili, spigolose, dritte; nero o bianco; dal tetto o arrampicandosi ----
  function pixoArt(w, P, C, r, Wp, Hp, snap, paths, radii, x) {
    const text = DEACC(w.words || w.aka || 'NINO').replace(/[^A-Z0-9]/g, '') || 'NINO', n = text.length, F = FONT();
    const vr = mulberry((w.seed || 1) ^ 0x9e37), col = w.col || pickR(vr, ['#101012', '#101012', '#f2efe6', '#f2efe6', '#d8201a']), stacked = Hp > Wp * 1.3;
    const cellH = stacked ? Hp / n : Hp, lh = stacked ? cellH * .86 : Hp * .8, lw = stacked ? Wp * .7 : (Wp * .9) / n * .72, pts = [];
    x.save(); x.strokeStyle = col; x.fillStyle = col; x.lineCap = 'butt'; x.lineJoin = 'miter'; x.miterLimit = 4; const th = Math.max(2, Math.min(lw, lh) * (.09 + vr() * .05)); x.lineWidth = th;
    [...text].forEach((ch, i) => {
      const g = F[ch] || F.I || [], cx = stacked ? Wp / 2 : Wp * .05 + (i + .5) * (Wp * .9) / n, cy = stacked ? i * cellH + cellH / 2 : Hp / 2, kx = 1 + (r() - .5) * .08, ky = 1 + (r() - .5) * .06;
      const T = ([u, v]) => [cx + (u - .3) / .6 * lw * kx, cy + (.5 - v) * lh * ky];   // alte e strette, dritte
      g.forEach(tr => { let p = tr.map(T); if (p.length === 1) { x.fillRect(p[0][0] - th / 2, p[0][1] - th / 2, th, th); pts.push(p[0]); return; }
        if (r() < .6) { const a = p[p.length - 1], b = p[p.length - 2], d = hyp(a[0] - b[0], a[1] - b[1]) || 1, ux = (a[0] - b[0]) / d, uy = (a[1] - b[1]) / d, sg = r() < .5 ? 2 : -2; p = p.concat([[a[0] + ux * th * 1.2 - uy * th * sg, a[1] + uy * th * 1.2 + ux * th * sg]]); }   // il piedino: ogni asta finisce con un taglio obliquo
        x.beginPath(); p.forEach((q, k) => k ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1])); x.stroke(); p.forEach(q => pts.push(q)); });
      if (r() < .35) { x.beginPath(); x.moveTo(cx - lw * .55, cy + lh * .5 + th); x.lineTo(cx + lw * .55, cy + lh * .5 + th); x.stroke(); }   // la riga di base
    });
    smallTag(x, (w.crew || 'PVK') + (C.yr ? ' ' + C.yr : ''), stacked ? Wp / 2 : Wp - Hp * .2, stacked ? Hp - Wp * .05 : Hp - Hp * .06, stacked ? Wp * .07 : Hp * .08, col, r, stacked ? Wp * .85 : Wp * .3);
    x.restore(); snap(x.canvas); paths.push(pts); radii.push(th * 3);
  }
  // ---- la tag a estintore ----
  function extinguisherArt(w, P, C, r, Wp, Hp, snap, paths, radii, x) {
    const text = w.words || w.aka || 'NINO', vr = mulberry((w.seed || 1) ^ 0x1e57), col = w.col || pickR(vr, ['#f2efe6', '#101012', '#d8201a', '#cfd3d8', '#1c3aa8']);
    const d = Object.assign({}, WM.dna(w.hand || w.seed || 1), { spray: true, nibW: .4, grain: 1.2, drip: false, crown: false, halo: false, under: false, dashes: false, stars: false, quotes: false, oldHand: true, st: 'spray', wide: 1.15, bigFirst: 1.2, contrast: .3, mix: .2 });
    const c = cv(Wp, Hp), cx = c.getContext('2d'), res = WM.handTag(cx, text, d, Wp, Hp * .8, r, col, 'tag');
    x.save(); x.filter = `blur(${(Hp * .018).toFixed(1)}px)`; x.globalAlpha = .55; x.drawImage(c, 0, 0); x.restore(); x.drawImage(c, 0, 0);   // la nebbia larga e sporca attorno al tratto
    x.fillStyle = col; for (let k = 0; k < 60 && res.path.length; k++) { const q = res.path[Math.floor(r() * res.path.length)], a = r() * PI * 2, rr = res.W * (.8 + r() * 3); x.globalAlpha = .3 + r() * .6; x.beginPath(); x.arc(q[0] + Math.cos(a) * rr, q[1] + Math.sin(a) * rr, 1 + r() * r() * res.W * .25, 0, 7); x.fill(); } x.globalAlpha = 1;   // la pressione sputa gocce grosse attorno
    bigDrips(x, c, col, Wp, Hp, r, 8 + Math.floor(r() * 8), Hp * .5, res.W * .5);   // la vernice troppa cola per metri
    snap(x.canvas); paths.push(res.path.filter((q, i) => i % 2 === 0)); radii.push(Math.max(res.W * 2.5, Hp * .08));
  }
  // ---- lo stencil ----
  function motif(ctx, kind, cx0, cy0, s, P, r) {   // le sagome semplici a un colore (le altre sono i personaggi ridotti a mascherina)
    const K = '#141418'; ctx.save(); ctx.fillStyle = K; ctx.strokeStyle = K; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = s * .12;
    const ring = (a, b, R) => { ctx.beginPath(); ctx.arc(a, b, R, 0, 7); ctx.stroke(); }, cut = f => { ctx.globalCompositeOperation = 'destination-out'; f(); ctx.globalCompositeOperation = 'source-over'; };
    if (kind === 'bici') { ring(cx0 - s * .55, cy0 + s * .3, s * .35); ring(cx0 + s * .55, cy0 + s * .3, s * .35); ctx.beginPath(); ctx.moveTo(cx0 - s * .55, cy0 + s * .3); ctx.lineTo(cx0 - s * .15, cy0 - s * .3); ctx.lineTo(cx0 + s * .35, cy0 - s * .3); ctx.lineTo(cx0 + s * .55, cy0 + s * .3); ctx.lineTo(cx0 - s * .05, cy0 + s * .3); ctx.lineTo(cx0 - s * .15, cy0 - s * .3); ctx.moveTo(cx0 + s * .35, cy0 - s * .3); ctx.lineTo(cx0 + s * .25, cy0 - s * .55); ctx.lineTo(cx0 + s * .5, cy0 - s * .6); ctx.moveTo(cx0 - s * .15, cy0 - s * .3); ctx.lineTo(cx0 - s * .3, cy0 - s * .5); ctx.stroke(); }
    else if (kind === 'pesce') { ctx.beginPath(); ctx.ellipse(cx0 - s * .1, cy0, s * .6, s * .32, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(cx0 + s * .4, cy0); ctx.lineTo(cx0 + s * .8, cy0 - s * .35); ctx.lineTo(cx0 + s * .8, cy0 + s * .35); ctx.closePath(); ctx.fill(); cut(() => { ctx.beginPath(); ctx.arc(cx0 - s * .5, cy0 - s * .08, s * .07, 0, 7); ctx.fill(); ctx.lineWidth = s * .05; ctx.beginPath(); ctx.moveTo(cx0 - s * .3, cy0 - s * .3); ctx.quadraticCurveTo(cx0 - s * .15, cy0, cx0 - s * .3, cy0 + s * .3); ctx.stroke(); }); }
    else if (kind === 'pugno') { ctx.beginPath(); ctx.ellipse(cx0, cy0 + s * .05, s * .45, s * .4, 0, 0, 7); ctx.fill(); for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(cx0 - s * .3 + k * s * .2, cy0 - s * .3, s * .12, 0, 7); ctx.fill(); } ctx.beginPath(); ctx.ellipse(cx0 + s * .42, cy0 + s * .05, s * .14, s * .3, -.4, 0, 7); ctx.fill(); ctx.fillRect(cx0 - s * .2, cy0 + s * .35, s * .4, s * .55); cut(() => { ctx.lineWidth = s * .04; for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(cx0 - s * .4 + k * s * .2, cy0 - s * .25); ctx.lineTo(cx0 - s * .4 + k * s * .2, cy0 + s * .05); ctx.stroke(); } }); }
    else if (kind === 'tv') { ctx.fillRect(cx0 - s * .6, cy0 - s * .35, s * 1.2, s * .9); ctx.beginPath(); ctx.moveTo(cx0 - s * .2, cy0 - s * .35); ctx.lineTo(cx0 - s * .45, cy0 - s * .8); ctx.moveTo(cx0 + s * .2, cy0 - s * .35); ctx.lineTo(cx0 + s * .45, cy0 - s * .8); ctx.stroke(); cut(() => ctx.fillRect(cx0 - s * .48, cy0 - s * .25, s * .8, s * .65)); ctx.lineWidth = s * .08; ctx.beginPath(); ctx.moveTo(cx0 - s * .35, cy0 - s * .12); ctx.lineTo(cx0 + s * .2, cy0 + s * .28); ctx.moveTo(cx0 + s * .2, cy0 - s * .12); ctx.lineTo(cx0 - s * .35, cy0 + s * .28); ctx.stroke(); }
    else if (kind === 'ratto') { ctx.beginPath(); ctx.ellipse(cx0, cy0 + s * .1, s * .55, s * .3, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(cx0 + s * .4, cy0 - s * .05); ctx.lineTo(cx0 + s * .95, cy0 + s * .15); ctx.lineTo(cx0 + s * .4, cy0 + s * .3); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.arc(cx0 + s * .45, cy0 - s * .12, s * .13, 0, 7); ctx.fill(); ctx.lineWidth = s * .07; ctx.beginPath(); ctx.moveTo(cx0 - s * .5, cy0 + s * .2); ctx.quadraticCurveTo(cx0 - s * 1.1, cy0 + s * .1, cx0 - s, cy0 - s * .4); ctx.stroke(); cut(() => { ctx.beginPath(); ctx.arc(cx0 + s * .62, cy0 + s * .04, s * .045, 0, 7); ctx.fill(); }); }
    else if (kind === 'stella') { ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = -PI / 2 + k * PI / 5, rr = k % 2 ? s * .3 : s * .7; ctx.lineTo(cx0 + Math.cos(a) * rr, cy0 + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); }
    else if (kind === 'ancora') { ring(cx0, cy0 - s * .6, s * .12); ctx.beginPath(); ctx.moveTo(cx0, cy0 - s * .48); ctx.lineTo(cx0, cy0 + s * .6); ctx.moveTo(cx0 - s * .4, cy0 - s * .2); ctx.lineTo(cx0 + s * .4, cy0 - s * .2); ctx.stroke(); ctx.beginPath(); ctx.arc(cx0, cy0 + s * .1, s * .55, .3, PI - .3); ctx.stroke(); }
    else if (kind === 'bomboletta') { ctx.fillRect(cx0 - s * .25, cy0 - s * .4, s * .5, s); ctx.fillRect(cx0 - s * .12, cy0 - s * .6, s * .24, s * .2); ctx.fillRect(cx0 - s * .04, cy0 - s * .72, s * .08, s * .12); for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.arc(cx0 + s * (.15 + r() * .6), cy0 - s * (.6 + r() * .4), s * (.02 + r() * .05), 0, 7); ctx.fill(); } cut(() => ctx.fillRect(cx0 - s * .18, cy0 - s * .1, s * .36, s * .3)); }
    else if (kind === 'asino') { ctx.beginPath(); ctx.ellipse(cx0, cy0 + s * .1, s * .42, s * .5, 0, 0, 7); ctx.fill(); [-1, 1].forEach(sd => { ctx.beginPath(); ctx.ellipse(cx0 + sd * s * .35, cy0 - s * .55, s * .13, s * .45, sd * .35, 0, 7); ctx.fill(); }); ctx.beginPath(); ctx.moveTo(cx0 - s * .3, cy0 - s * .3); ctx.lineTo(cx0 - s * .3, cy0 - s * .5); ctx.lineTo(cx0 - s * .15, cy0 - s * .38); ctx.lineTo(cx0, cy0 - s * .55); ctx.lineTo(cx0 + s * .15, cy0 - s * .38); ctx.lineTo(cx0 + s * .3, cy0 - s * .5); ctx.lineTo(cx0 + s * .3, cy0 - s * .3); ctx.closePath(); ctx.fill(); cut(() => { [-1, 1].forEach(sd => { ctx.beginPath(); ctx.ellipse(cx0 + sd * s * .16, cy0 - s * .02, s * .07, s * .1, 0, 0, 7); ctx.fill(); }); ctx.lineWidth = s * .05; ctx.beginPath(); ctx.arc(cx0, cy0 + s * .22, s * .18, PI * 1.1, PI * 1.9); ctx.stroke(); }); }
    else if (kind === 'occhio') sign(ctx, 'occhio', cx0, cy0, s, K);
    else character(ctx, kind, cx0, cy0, s * .7, P, r);
    ctx.restore();
  }
  function stencilArt(w, P, C, r, Wp, Hp, snap, paths, radii, x) {
    const vr = mulberry((w.motifSeed || w.seed || 1) ^ 0x57e4), kind = w.motif || pickR(vr, STENCIL_MOTIFS), ink = w.col || pickR(vr, ['#141418', '#141418', '#141418', '#d8201a', '#f4f1ea', '#1c3aa8']), txt = w.words !== undefined ? w.words : (vr() < .7 ? pickR(vr, STENCIL_TXT) : null), two = vr() < .35;
    const mh = txt ? Hp * .68 : Hp * .9, s = Math.min(Wp * .4, mh * .42), cx0 = Wp / 2, cy0 = mh * .5;
    x.fillStyle = ink; x.globalAlpha = .07; x.fillRect(Wp * .05, Hp * .04, Wp * .9, Hp * .92); x.globalAlpha = 1;   // l'alone della tavola: il rettangolo appena spruzzato attorno
    if (two) { x.fillStyle = pickR(vr, ['#d8201a', '#f2d23a', '#2a86e0', '#ff8a3a']); x.beginPath(); x.arc(cx0, cy0, s * 1.05, 0, 7); x.fill(); snap(x.canvas); paths.push([[cx0, cy0]]); radii.push(s * 1.2); }   // il secondo strato: una campitura dietro
    const t = cv(Wp, Hp), tx = t.getContext('2d'); motif(tx, kind, cx0, cy0, s, P, r);
    if (txt) { const { L, tot } = blockWord(DEACC(txt).replace(/[^A-Z0-9?! ]/g, ''), .3, .74, .1), S = Math.min((Wp * .9) / tot, Hp * .2), toPx = (l, [u, v]) => [(Wp - tot * S) / 2 + (l.x0 + u) * S, Hp * .8 + (v - .5) * S]; L.forEach(l => tx.drawImage(tintTo(letterMask(l, toPx, Wp, Hp, 0, S), '#141418', Wp, Hp), 0, 0)); }
    x.drawImage(stencilize(t, ink, Wp, Hp, r, .5, 3 + Math.floor(r() * 3)), 0, 0);
    x.fillStyle = ink; x.globalAlpha = .25; const ex = r() < .5 ? Wp * .08 : Wp * .92, ey = r() < .5 ? Hp * .1 : Hp * .9; for (let k = 0; k < 30; k++) { const a = r() * PI * 2, rr = r() * Wp * .1; x.beginPath(); x.arc(ex + Math.cos(a) * rr, ey + Math.sin(a) * rr, 1 + r() * 2, 0, 7); x.fill(); } x.globalAlpha = 1;   // lo spruzzo che passa oltre la tavola, in un angolo
    snap(x.canvas); paths.push(raster(Wp, Hp, 3)); radii.push(Hp * .22);
  }
  // ---- la scritta a pennello (politica, d'amore, ultras, di strada) ----
  function scrittaArt(w, P, C, r, Wp, Hp, snap, paths, radii, x) {
    const vr = mulberry((w.seed || 1) ^ 0x5c71), kind = w.kind && SCRITTE[w.kind] ? w.kind : pickR(vr, ['politica', 'politica', 'amore', 'ultras', 'strada']), text = w.words || pickR(vr, SCRITTE[kind]);
    const tool = w.tool2 || pickR(vr, ['pennello', 'pennello', 'rullo', 'spray']), col = w.col || pickR(vr, kind === 'politica' ? ['#d8201a', '#d8201a', '#101012', '#f2efe6'] : kind === 'ultras' ? ['#1c3aa8', '#d8201a', '#101012'] : ['#d8201a', '#101012', '#f2efe6', '#1c3aa8']);
    const pre = kind === 'politica' && vr() < .4 ? 'A' : kind === 'amore' && vr() < .5 ? 'cuore' : null, post = (kind === 'politica' && vr() < .35) || (kind === 'ultras' && vr() < .4) ? 'stella' : null;
    const h = Hp * .62, preW = pre ? h * 1.15 : 0, postW = post ? h * 1.15 : 0, free = Wp - preW - postW - Wp * .06;
    const L = fit(letters(text, { h: 100, adv: .76, skew: tool === 'spray' ? .1 : .03, wob: tool === 'pennello' ? .03 : .01, bounce: .025, rot: .03 }, r), free, Hp * .9, Hp * .08, 1.4);
    const dx0 = Wp * .03 + preW; L.strokes.forEach(t => { t.pts = t.pts.map(([a, b]) => [a + dx0, b]); }); L.box = [L.box[0] + dx0, L.box[1], L.box[2] + dx0, L.box[3]];
    const lw = Math.max(2, (L.box[3] - L.box[1]) * (tool === 'rullo' ? .2 : tool === 'spray' ? .11 : .14)), pts = [];
    x.save(); x.strokeStyle = col; x.fillStyle = col; x.lineCap = tool === 'rullo' ? 'butt' : 'round'; x.lineJoin = 'round';
    if (tool === 'spray') { x.shadowColor = col; x.shadowBlur = lw * .6; }
    L.strokes.forEach(t => { if (t.pts.length === 1) { x.beginPath(); x.arc(t.pts[0][0], t.pts[0][1], lw * .5, 0, 7); x.fill(); pts.push(t.pts[0]); return; }
      const n = tool === 'pennello' ? 3 : 1, Q = smoothK(t.pts, 2);
      for (let k = 0; k < n; k++) { x.lineWidth = lw * (n > 1 ? .55 + r() * .4 : 1); x.globalAlpha = n > 1 ? .75 : 1; x.beginPath(); Q.forEach(([a, b], j) => { const ox = n > 1 ? (r() - .5) * lw * .25 : 0, oy = n > 1 ? (r() - .5) * lw * .25 : 0; j ? x.lineTo(a + ox, b + oy) : x.moveTo(a + ox, b + oy); }); x.stroke(); }   // il pennello: tre passate un po' fuori registro
      x.globalAlpha = 1; t.pts.forEach(q => pts.push(q)); });
    x.shadowBlur = 0; const cy = (L.box[1] + L.box[3]) / 2;
    if (pre === 'A') { const cx0 = L.box[0] - h * .68, R = h * .5; x.lineWidth = lw * .9; x.beginPath(); x.arc(cx0, cy, R, 0, 7); x.stroke(); x.beginPath(); x.moveTo(cx0 - R * .6, cy + R * .7); x.lineTo(cx0, cy - R * .8); x.lineTo(cx0 + R * .6, cy + R * .7); x.moveTo(cx0 - R * .75, cy + R * .15); x.lineTo(cx0 + R * .75, cy + R * .15); x.stroke(); }
    if (pre === 'cuore') { const cx0 = L.box[0] - h * .62, s2 = h * .38; x.beginPath(); x.moveTo(cx0, cy + s2); x.bezierCurveTo(cx0 - s2 * 1.7, cy - s2 * .2, cx0 - s2 * .8, cy - s2 * 1.4, cx0, cy - s2 * .4); x.bezierCurveTo(cx0 + s2 * .8, cy - s2 * 1.4, cx0 + s2 * 1.7, cy - s2 * .2, cx0, cy + s2); x.fill(); }
    if (post === 'stella') { const cx0 = L.box[2] + h * .68; x.beginPath(); for (let k = 0; k < 10; k++) { const a = -PI / 2 + k * PI / 5, rr = k % 2 ? h * .22 : h * .5; x.lineTo(cx0 + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); x.fill(); }
    x.restore();
    if (tool !== 'spray' || r() < .5) drips(x, L, r, col, lw * .5, 3 + Math.floor(r() * 5), Hp * .3);
    snap(x.canvas); paths.push(pts); radii.push(lw * 2);
  }
  // ---- il manifesto attaccato con la colla ----
  function posterArt(w, P, C, r, Wp, Hp, snap, paths, radii, x) {
    const vr = mulberry((w.seed || 1) ^ 0x7a57), n = 1 + (vr() < .5 ? 1 : 0) + (vr() < .3 ? 1 : 0), pts = [];
    for (let k = 0; k < n; k++) {
      const pw = Wp * (n === 1 ? .9 : .62), ph = Math.min(Hp * (n === 1 ? .92 : .68), pw * 1.42), cx0 = Wp * (n === 1 ? .5 : .3 + vr() * .4), cy0 = Hp * (n === 1 ? .5 : .32 + vr() * .36), rot = (vr() - .5) * .12;
      const kind = pickR(vr, ['slogan', 'slogan', 'volto', 'collage']), paper = pickR(vr, ['#efe7d2', '#e8dcc0', '#f4efe4', '#f0d070', '#e86a5a', '#d8d0c8']), ink = paper === '#e86a5a' || paper === '#f0d070' ? '#141418' : pickR(vr, ['#141418', '#d8201a', '#1c3aa8']);
      const c = cv(Math.round(pw), Math.round(ph)), cx = c.getContext('2d'), W2 = c.width, H2 = c.height;
      cx.fillStyle = paper; cx.fillRect(0, 0, W2, H2); cx.textAlign = 'center';
      if (kind === 'slogan') { const lines = pickR(vr, MANIFESTI).split('\n'), fs = Math.min(W2 / 5.6, H2 / (lines.length * 1.6)); cx.fillStyle = ink; cx.font = `bold ${Math.round(fs)}px Arial`; lines.forEach((ln, i) => cx.fillText(ln, W2 / 2, H2 * .5 + (i - (lines.length - 1) / 2) * fs * 1.25 + fs * .35)); if (vr() < .5) { cx.fillRect(W2 * .08, H2 * .07, W2 * .84, H2 * .035); cx.fillRect(W2 * .08, H2 * .9, W2 * .84, H2 * .035); } }
      else if (kind === 'volto') { const t = cv(W2, H2), tx = t.getContext('2d'); character(tx, pickR(vr, CHARS), W2 / 2, H2 * .42, Math.min(W2, H2) * .36, P, r); cx.drawImage(stencilize(t, ink, W2, H2, r, .5, 0), 0, 0); cx.fillStyle = ink; cx.font = `bold ${Math.round(W2 / 7)}px Arial`; cx.fillText(pickR(vr, ['RICERCATO', 'DISGELO', 'OINK', 'CHI PAGA?', 'SVEGLIA', 'LIBERI']), W2 / 2, H2 * .9); }
      else { cx.fillStyle = ink; for (let yy = 0; yy < H2; yy += W2 * .05) for (let xx = 0; xx < W2; xx += W2 * .05) { const rr = W2 * .022 * (.3 + .7 * Math.abs(Math.sin(xx * .02 + yy * .013))); cx.beginPath(); cx.arc(xx, yy, rr, 0, 7); cx.fill(); } cx.fillStyle = paper; cx.beginPath(); cx.arc(W2 * .5, H2 * .4, W2 * .3, 0, 7); cx.fill(); cx.fillStyle = ink; cx.font = `bold ${Math.round(W2 * .42)}px Arial`; cx.fillText(pickR(vr, ['NO', 'SI', '!', '?', 'W']), W2 / 2, H2 * .55); }   // la retinatura
      cx.fillStyle = 'rgba(120,90,40,.12)'; for (let k2 = 0; k2 < 6; k2++) { cx.beginPath(); cx.ellipse(vr() * W2, vr() * H2, W2 * (.1 + vr() * .25), H2 * (.05 + vr() * .15), vr() * 3, 0, 7); cx.fill(); }   // la carta ingiallita, la colla
      cx.strokeStyle = 'rgba(0,0,0,.1)'; cx.lineWidth = 1; for (let k2 = 0; k2 < 3; k2++) { const px = vr() * W2; cx.beginPath(); cx.moveTo(px, 0); cx.lineTo(px + (vr() - .5) * W2 * .1, H2); cx.stroke(); }   // le pieghe
      cx.globalCompositeOperation = 'destination-out';
      const tear = (x0, y0, x1, y1, cxr, cyr, deep) => { cx.beginPath(); cx.moveTo(x0, y0); for (let j = 1; j < 7; j++) { const t = j / 7; cx.lineTo(x0 + (x1 - x0) * t + (vr() - .5) * deep, y0 + (y1 - y0) * t + (vr() - .5) * deep); } cx.lineTo(x1, y1); cx.lineTo(cxr, cyr); cx.closePath(); cx.fill(); };   // uno strappo d'angolo: la linea sfrangiata, poi l'angolo
      if (vr() < .7) tear(0, H2 * (.75 + vr() * .2), W2 * (.15 + vr() * .25), H2, 0, H2, W2 * .06);
      if (vr() < .5) tear(W2 * (.6 + vr() * .3), 0, W2, H2 * (.1 + vr() * .2), W2, 0, W2 * .06);
      if (vr() < .35) { cx.beginPath(); const ex = W2 * (.2 + vr() * .6), ey = H2 * (.3 + vr() * .5); for (let j = 0; j < 9; j++) { const a = j / 9 * PI * 2, rr = W2 * (.08 + vr() * .1); cx.lineTo(ex + Math.cos(a) * rr, ey + Math.sin(a) * rr * .8); } cx.closePath(); cx.fill(); }   // il pezzo mancante
      cx.globalCompositeOperation = 'source-over';
      x.save(); x.translate(cx0, cy0); x.rotate(rot); x.shadowColor = 'rgba(0,0,0,.25)'; x.shadowBlur = Wp * .01; x.shadowOffsetY = Wp * .004; x.drawImage(c, -W2 / 2, -H2 / 2); x.restore(); pts.push([cx0, cy0]);
    }
    snap(x.canvas); paths.push(pts.concat(raster(Wp, Hp, 2))); radii.push(Hp * .35);
  }
  // ---- gli adesivi ----
  function stickersArt(w, P, C, r, Wp, Hp, snap, paths, radii, x) {
    const vr = mulberry((w.seed || 1) ^ 0xad51), n = 5 + Math.floor(vr() * 9), pts = [], s0 = Math.min(Wp, Hp);
    for (let k = 0; k < n; k++) {
      const kind = pickR(vr, ['nome', 'nome', 'tondo', 'quadro', 'ovale', 'faccia']), sw = s0 * (.22 + vr() * .16), sh = kind === 'nome' ? sw * .62 : kind === 'ovale' ? sw * .65 : sw, cx0 = sw / 2 + vr() * (Wp - sw), cy0 = sh / 2 + vr() * (Hp - sh), rot = (vr() - .5) * .5;
      const c = cv(Math.round(sw), Math.round(sh)), cx = c.getContext('2d'), W2 = c.width, H2 = c.height, col = pickR(vr, ['#d8201a', '#1c3aa8', '#f2d23a', '#101012', '#5ac8a0', '#ff8a3a', '#e860a8']), ink = '#101012';
      cx.fillStyle = '#f4f1ea'; cx.textAlign = 'center';
      if (kind === 'tondo' || kind === 'faccia') { cx.beginPath(); cx.arc(W2 / 2, H2 / 2, W2 / 2, 0, 7); cx.fill(); }
      else if (kind === 'ovale') { cx.beginPath(); cx.ellipse(W2 / 2, H2 / 2, W2 / 2, H2 / 2, 0, 0, 7); cx.fill(); }
      else cx.fillRect(0, 0, W2, H2);
      if (kind === 'tondo') { cx.fillStyle = col; cx.beginPath(); cx.arc(W2 / 2, H2 / 2, W2 * .42, 0, 7); cx.fill(); cx.fillStyle = '#f4f1ea'; cx.font = `bold ${Math.round(W2 * .36)}px Arial`; cx.fillText(pickR(vr, ['PVK', 'BDS', 'TNT', 'RSC', 'OGS', 'KMT']), W2 / 2, H2 * .63); }
      else if (kind === 'ovale') { cx.fillStyle = col; cx.beginPath(); cx.ellipse(W2 / 2, H2 / 2, W2 * .44, H2 * .42, 0, 0, 7); cx.fill(); }
      else if (kind === 'nome') { cx.fillStyle = col; cx.fillRect(0, 0, W2, H2 * .34); cx.fillStyle = '#f4f1ea'; cx.font = `bold ${Math.round(H2 * .15)}px Arial`; cx.fillText('CIAO MI CHIAMO', W2 / 2, H2 * .24); }
      else if (kind === 'quadro') { cx.fillStyle = col; cx.fillRect(W2 * .08, H2 * .08, W2 * .84, H2 * .84); }
      if (kind === 'nome' || kind === 'ovale' || kind === 'quadro') { const t = cv(W2, H2), tx = t.getContext('2d'); try { WM.handTag(tx, pickR(vr, ['DAKO', 'KEOS', 'SNEK', 'ZORA', 'NEMO', 'KRAN', 'PIXO', 'LUPA', w.aka || 'PV']), Object.assign({}, WM.dna(Math.floor(vr() * 1e6)), { skill: .7 }), W2 * (kind === 'nome' ? .9 : .7), H2 * (kind === 'nome' ? .6 : .5), r, kind === 'quadro' ? '#f4f1ea' : kind === 'ovale' ? '#f4f1ea' : ink, 'mtag'); } catch (e) { } cx.drawImage(t, W2 * (kind === 'nome' ? .05 : .15), H2 * (kind === 'nome' ? .36 : .25)); }
      if (kind === 'faccia') { const t = cv(W2, H2), tx = t.getContext('2d'); character(tx, pickR(vr, CHARS), W2 / 2, H2 * .5, W2 * .3, P, r); cx.drawImage(t, 0, 0); }
      if (vr() < .4) { cx.fillStyle = 'rgba(255,255,255,.35)'; cx.fillRect(0, 0, W2, H2); }   // sbiadito dal sole
      if (vr() < .35) { cx.globalCompositeOperation = 'destination-out'; cx.beginPath(); cx.moveTo(W2, H2); cx.lineTo(W2 - W2 * .3, H2); cx.lineTo(W2, H2 - H2 * .3); cx.closePath(); cx.fill(); cx.globalCompositeOperation = 'source-over'; }   // l'angolo che si stacca
      x.save(); x.translate(cx0, cy0); x.rotate(rot); x.shadowColor = 'rgba(0,0,0,.3)'; x.shadowBlur = 2; x.drawImage(c, -W2 / 2, -H2 / 2); x.restore(); pts.push([cx0, cy0]);
    }
    snap(x.canvas); paths.push(pts); radii.push(s0 * .3);
  }
  // ---- il murale ----
  function muralArt(w, P, C, r, Wp, Hp, snap, paths, radii, x) {
    const vr = mulberry((w.seed || 1) ^ 0x4a11), scene = w.scene && MURALI_TXT[w.scene] ? w.scene : pickR(vr, ['pesca', 'volti', 'pugni', 'bici', 'isola']), K = '#141418', olw = Math.max(2, Hp * .012);
    const SKY = pickR(vr, ['#f2c430', '#ff8a3a', '#8ad0f0', '#e86a9a', '#f4aec8']), SEA = pickR(vr, ['#2a86e0', '#1a6e5c', '#3ae0c0', '#283c9e']), SKIN = pickR(vr, ['#e8b48a', '#c89a72', '#f0c8a8', '#a0704e']), BRIGHT = ['#d8201a', '#1c3aa8', '#f2d23a', '#5ac8a0', '#ff8a3a', '#e860a8'];
    const poly = (ctx, pts, fill) => { ctx.beginPath(); pts.forEach((p, k) => k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } ctx.strokeStyle = K; ctx.lineWidth = olw; ctx.lineJoin = 'round'; ctx.stroke(); };
    const ell = (ctx, cx0, cy0, rx, ry, fill, rot) => { ctx.beginPath(); ctx.ellipse(cx0, cy0, rx, ry, rot || 0, 0, 7); if (fill) { ctx.fillStyle = fill; ctx.fill(); } ctx.strokeStyle = K; ctx.lineWidth = olw; ctx.stroke(); };
    const gull = (ctx, gx, gy, gs) => { ctx.strokeStyle = K; ctx.lineWidth = olw * .8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(gx - gs, gy); ctx.quadraticCurveTo(gx - gs * .5, gy - gs * .8, gx, gy); ctx.quadraticCurveTo(gx + gs * .5, gy - gs * .8, gx + gs, gy); ctx.stroke(); };
    const Bg = cv(Wp, Hp), b = Bg.getContext('2d'), horizon = Hp * (.45 + vr() * .15);
    // 1. le campiture di fondo: il cielo a due toni, il mare (o la collina, o il muro), il sole
    b.fillStyle = SKY; b.fillRect(0, 0, Wp, Hp); b.fillStyle = shade(SKY, .25); b.fillRect(0, 0, Wp, horizon * .4);
    if (scene === 'pesca' || scene === 'isola') { b.fillStyle = SEA; b.fillRect(0, horizon, Wp, Hp - horizon); b.strokeStyle = '#ffffff'; b.lineWidth = olw * .9; for (let yy = horizon + Hp * .06; yy < Hp; yy += Hp * .09) { b.beginPath(); for (let xx = -Hp * .1; xx < Wp + Hp * .1; xx += Hp * .12) { b.moveTo(xx, yy); b.quadraticCurveTo(xx + Hp * .06, yy - Hp * .035, xx + Hp * .12, yy); } b.stroke(); } }
    else if (scene === 'bici' || scene === 'pugni') { b.fillStyle = scene === 'pugni' ? '#8a8a8e' : '#9ad44a'; b.beginPath(); b.moveTo(0, horizon + Hp * .1); b.quadraticCurveTo(Wp * .3, horizon - Hp * .15, Wp * .55, horizon + Hp * .05); b.quadraticCurveTo(Wp * .8, horizon + Hp * .15, Wp, horizon - Hp * .05); b.lineTo(Wp, Hp); b.lineTo(0, Hp); b.closePath(); b.fill();
      if (scene === 'pugni') { b.strokeStyle = '#5a5a5e'; b.lineWidth = olw * .7; for (let yy = horizon; yy < Hp; yy += Hp * .07) { b.beginPath(); b.moveTo(0, yy); b.lineTo(Wp, yy); b.stroke(); for (let xx = Math.round(yy / (Hp * .07)) % 2 ? Hp * .07 : 0; xx < Wp; xx += Hp * .14) { b.beginPath(); b.moveTo(xx, yy); b.lineTo(xx, yy + Hp * .07); b.stroke(); } } } }   // i mattoni
    else { b.fillStyle = shade(SKY, -.3); b.fillRect(0, horizon + Hp * .25, Wp, Hp); }
    if (scene !== 'volti') { const sx = Wp * (.72 + vr() * .2), sy = Hp * (.2 + vr() * .1), R0 = Hp * .13; b.fillStyle = '#ffe14a'; for (let k = 0; k < 14; k++) { const a = k / 14 * PI * 2; b.beginPath(); b.moveTo(sx + Math.cos(a - .1) * R0, sy + Math.sin(a - .1) * R0); b.lineTo(sx + Math.cos(a) * R0 * 1.6, sy + Math.sin(a) * R0 * 1.6); b.lineTo(sx + Math.cos(a + .1) * R0, sy + Math.sin(a + .1) * R0); b.closePath(); b.fill(); } ell(b, sx, sy, R0, R0, '#ffe14a'); }
    x.drawImage(Bg, 0, 0); snap(x.canvas); paths.push(raster(Wp, Hp, 4)); radii.push(Hp * .18);
    // 2. le figure: a campiture, con la testa, il busto, il fazzoletto o il berretto, gli occhi grandi
    const Fg = cv(Wp, Hp), f = Fg.getContext('2d');
    // una figura come nei murali dei paesi: le spalle tonde, il collo, le braccia lungo il corpo (o il pugno alzato), la testa col
    // fazzoletto o col berretto, le sopracciglia, il naso di profilo, la bocca aperta che canta
    const arm = (ax, ay, bx, by, s, col) => { f.lineCap = 'round'; f.strokeStyle = K; f.lineWidth = s * .3; f.beginPath(); f.moveTo(ax, ay); f.lineTo(bx, by); f.stroke(); f.strokeStyle = col; f.lineWidth = s * .3 - olw * 2; f.beginPath(); f.moveTo(ax, ay); f.lineTo(bx, by); f.stroke(); };
    const figure = (cx0, cy0, s, shirt, pose) => {
      const up = pose === 'fist' || pose === 'flag';
      if (up) { arm(cx0 + s * .45, cy0 + s * .55, cx0 + s * .95, cy0 - s * .9, s, shirt); ell(f, cx0 + s * .97, cy0 - s * 1.08, s * .2, s * .22, SKIN); f.strokeStyle = K; f.lineWidth = olw * .8; for (let k = 0; k < 3; k++) { f.beginPath(); f.moveTo(cx0 + s * (.82 + k * .08), cy0 - s * 1.2); f.lineTo(cx0 + s * (.84 + k * .08), cy0 - s * .98); f.stroke(); } }
      // il busto: le spalle tonde, i fianchi
      f.beginPath(); f.moveTo(cx0 - s * .2, cy0 + s * .42); f.quadraticCurveTo(cx0 - s * .62, cy0 + s * .42, cx0 - s * .66, cy0 + s * .85); f.lineTo(cx0 - s * .62, cy0 + s * 1.6); f.lineTo(cx0 + s * .62, cy0 + s * 1.6); f.lineTo(cx0 + s * .66, cy0 + s * .85); f.quadraticCurveTo(cx0 + s * .62, cy0 + s * .42, cx0 + s * .2, cy0 + s * .42); f.closePath(); f.fillStyle = shirt; f.fill(); f.strokeStyle = K; f.lineWidth = olw; f.stroke();
      if (pose === 'righe') { f.save(); f.beginPath(); f.rect(cx0 - s * .66, cy0 + s * .55, s * 1.32, s * 1.05); f.clip(); f.fillStyle = '#f4f1ea'; for (let yy = cy0 + s * .6; yy < cy0 + s * 1.6; yy += s * .28) f.fillRect(cx0 - s, yy, s * 2, s * .12); f.restore(); }
      if (!up) arm(cx0 + s * .55, cy0 + s * .75, cx0 + s * .7, cy0 + s * 1.55, s, shirt); arm(cx0 - s * .55, cy0 + s * .75, cx0 - s * .7, cy0 + s * 1.55, s, shirt);
      if (!up) ell(f, cx0 + s * .72, cy0 + s * 1.62, s * .13, s * .15, SKIN); ell(f, cx0 - s * .72, cy0 + s * 1.62, s * .13, s * .15, SKIN);
      f.fillStyle = SKIN; f.fillRect(cx0 - s * .14, cy0 + s * .2, s * .28, s * .3); f.strokeStyle = K; f.lineWidth = olw; f.strokeRect(cx0 - s * .14, cy0 + s * .2, s * .28, s * .3);   // il collo
      ell(f, cx0, cy0 - s * .15, s * .4, s * .5, SKIN);
      if (pose === 'fazzoletto') { const c0 = pickR(vr, BRIGHT); poly(f, [[cx0 - s * .44, cy0 - s * .15], [cx0 - s * .32, cy0 - s * .66], [cx0 + s * .32, cy0 - s * .66], [cx0 + s * .44, cy0 - s * .15], [cx0 + s * .55, cy0 + s * .35], [cx0 + s * .14, cy0 + s * .2], [cx0 - s * .14, cy0 + s * .2], [cx0 - s * .55, cy0 + s * .35]], c0); }
      else { poly(f, [[cx0 - s * .44, cy0 - s * .36], [cx0 - s * .3, cy0 - s * .7], [cx0 + s * .33, cy0 - s * .7], [cx0 + s * .46, cy0 - s * .36], [cx0 + s * .6, cy0 - s * .3]], pickR(vr, ['#1c3aa8', '#2a2a2e', '#d8201a'])); f.fillStyle = '#2a1a10'; f.beginPath(); f.moveTo(cx0 - s * .4, cy0 - s * .36); f.quadraticCurveTo(cx0 - s * .42, cy0 - s * .1, cx0 - s * .34, cy0); f.lineTo(cx0 - s * .3, cy0 - s * .3); f.closePath(); f.fill(); }   // il berretto, la basetta
      [-1, 1].forEach(sd => { ell(f, cx0 + sd * s * .16, cy0 - s * .18, s * .08, s * .1, '#ffffff'); f.fillStyle = K; f.beginPath(); f.arc(cx0 + sd * s * .16 + sd * s * .02, cy0 - s * .16, s * .04, 0, 7); f.fill(); f.strokeStyle = K; f.lineWidth = olw * .9; f.beginPath(); f.arc(cx0 + sd * s * .16, cy0 - s * .2, s * .12, PI * 1.15, PI * 1.85); f.stroke(); });   // gli occhi grandi, le sopracciglia
      f.beginPath(); f.moveTo(cx0 + s * .02, cy0 - s * .12); f.lineTo(cx0 + s * .08, cy0 + s * .05); f.lineTo(cx0 - s * .02, cy0 + s * .05); f.stroke();   // il naso
      f.fillStyle = '#5a1a1e'; f.beginPath(); f.ellipse(cx0, cy0 + s * .17, s * .12, s * .08, 0, 0, 7); f.fill(); f.stroke();   // la bocca aperta: canta
    };
    if (scene === 'pesca') { const bx0 = Wp * .45, by0 = horizon + Hp * .18, bw = Wp * .42, bh = Hp * .14; for (let k = 0; k < 3; k++) figure(bx0 - bw * .3 + k * bw * .3, by0 - bh * 1.3, Hp * .09, k === 1 ? '#f2d23a' : '#1c3aa8', 'righe'); poly(f, [[bx0 - bw / 2, by0 - bh * .2], [bx0 + bw / 2, by0 - bh * .2], [bx0 + bw * .4, by0 + bh], [bx0 - bw * .4, by0 + bh]], pickR(vr, BRIGHT)); f.fillStyle = '#f4f1ea'; f.fillRect(bx0 - bw * .45, by0 + bh * .3, bw * .9, bh * .18); f.strokeStyle = K; f.lineWidth = olw * 1.3; f.beginPath(); f.moveTo(bx0 - bw * .5, by0 - bh * 1.6); f.lineTo(bx0 - bw * .62, by0 + bh * .9); f.stroke(); for (let k = 0; k < 4; k++) gull(f, Wp * (.1 + vr() * .5), Hp * (.12 + vr() * .22), Hp * .03); }
    else if (scene === 'volti') { for (let k = 0; k < 3; k++) figure(Wp * (.2 + k * .3), Hp * (.42 + (k % 2) * .08), Hp * .17, pickR(vr, BRIGHT), k % 2 ? 'fazzoletto' : 'berretto'); }
    else if (scene === 'pugni') { f.strokeStyle = K; f.lineWidth = olw * 1.4; f.lineCap = 'round'; for (let k = 0; k < 3; k++) { const fx = Wp * (.22 + k * .28) + Hp * .14 * .97, fy = Hp * (.6 + (k % 2) * .05) - Hp * .14 * 1.3; for (let j = 0; j < 3; j++) { let px = fx, py = fy; const a = -PI / 2 + (j - 1) * .7 + (vr() - .5) * .3; f.beginPath(); f.moveTo(px, py); for (let q2 = 0; q2 < 4; q2++) { px += Math.cos(a) * Hp * .07 + (vr() - .5) * Hp * .05; py += Math.sin(a) * Hp * .07; f.lineTo(px, py); } f.stroke(); } }   // le crepe partono dai pugni
      for (let k = 0; k < 3; k++) figure(Wp * (.22 + k * .28), Hp * (.6 + (k % 2) * .05), Hp * .14, pickR(vr, BRIGHT), 'fist'); }
    else if (scene === 'bici') { for (let k = 0; k < 3; k++) { const cx0 = Wp * (.18 + k * .3), cy0 = horizon + Hp * .12 + (k % 2) * Hp * .04, R0 = Hp * .09; [-1, 1].forEach(sd => { ell(f, cx0 + sd * R0 * 1.3, cy0, R0, R0, null); ell(f, cx0 + sd * R0 * 1.3, cy0, R0 * .3, R0 * .3, K); }); poly(f, [[cx0 - R0 * 1.3, cy0], [cx0 - R0 * .3, cy0 - R0 * 1.1], [cx0 + R0 * .9, cy0 - R0 * 1.1], [cx0 + R0 * 1.3, cy0], [cx0 + R0 * .2, cy0]], pickR(vr, BRIGHT)); figure(cx0 + R0 * .1, cy0 - R0 * 2.9, R0 * .75, pickR(vr, BRIGHT), k === 1 ? 'flag' : 'berretto'); if (k === 1) poly(f, [[cx0 + R0 * .85, cy0 - R0 * 3.7], [cx0 + R0 * 2.2, cy0 - R0 * 3.3], [cx0 + R0 * .85, cy0 - R0 * 2.9]], '#d8201a'); } }
    else { const ix = Wp * .5, iy = horizon; poly(f, [[ix - Wp * .3, iy + Hp * .02], [ix - Wp * .15, iy - Hp * .18], [ix, iy - Hp * .1], [ix + Wp * .12, iy - Hp * .22], [ix + Wp * .3, iy + Hp * .02]], '#5a8a3a'); poly(f, [[ix + Wp * .1, iy - Hp * .22], [ix + Wp * .14, iy - Hp * .22], [ix + Wp * .15, iy - Hp * .42], [ix + Wp * .09, iy - Hp * .42]], '#f4f1ea'); f.fillStyle = '#d8201a'; f.fillRect(ix + Wp * .095, iy - Hp * .36, Wp * .05, Hp * .04); ell(f, ix + Wp * .12, iy - Hp * .44, Wp * .025, Hp * .03, '#ffe14a'); for (let k = 0; k < 5; k++) gull(f, Wp * (.1 + vr() * .8), Hp * (.1 + vr() * .25), Hp * .03); }
    x.drawImage(Fg, 0, 0); snap(x.canvas); paths.push(raster(Wp, Hp, 5)); radii.push(Hp * .14);
    // 3. la fascia con la frase, la firma
    const txt = w.words || pickR(vr, MURALI_TXT[scene]), bandH = Hp * .13, band = pickR(vr, ['#f4f1ea', '#141418', '#d8201a']); x.fillStyle = band; x.fillRect(0, Hp - bandH, Wp, bandH); x.strokeStyle = K; x.lineWidth = olw; x.strokeRect(olw / 2, Hp - bandH, Wp - olw, bandH);
    smallTag(x, txt, Wp / 2, Hp - bandH * .5, bandH * .55, band === '#f4f1ea' ? '#141418' : '#f4f1ea', r, Wp * .92, 2.2);
    smallTag(x, (w.aka || 'PV') + ' ' + (w.crew || ''), Wp * .9, Hp - bandH - Hp * .04, Hp * .05, K, r, Wp * .2);
    snap(x.canvas); paths.push(raster(Wp, Hp, 2)); radii.push(Hp * .2);
  }
  // ---- il calligraffiti ----
  function calliArt(w, P, C, r, Wp, Hp, snap, paths, radii, x) {
    const vr = mulberry((w.seed || 1) ^ 0xca11), text = w.words || w.aka || 'NINO', dark = vr() < .5, ink = w.col || (dark ? pickR(vr, ['#101012', '#1c3aa8', '#d8201a']) : '#f4f1ea');
    if (vr() < .75) {   // il fondo a rullo, storto, coi bordi sfrangiati: chiaro per l'inchiostro scuro, scuro per il bianco
      x.save(); x.translate(Wp / 2, Hp / 2); x.rotate((vr() - .5) * .04); x.fillStyle = dark ? pickR(vr, ['#f4f1ea', '#e8e0c8', '#f2d23a']) : pickR(vr, ['#141418', '#1c3aa8', '#2a2240']); const m = Wp * .03; x.beginPath();
      for (let t = 0; t <= 1.001; t += .08) x.lineTo(-Wp / 2 + m + (Wp - 2 * m) * t, -Hp / 2 + m + (vr() - .5) * Hp * .02); for (let t = 0; t <= 1.001; t += .15) x.lineTo(Wp / 2 - m + (vr() - .5) * Wp * .01, -Hp / 2 + m + (Hp - 2 * m) * t); for (let t = 1; t >= -.001; t -= .08) x.lineTo(-Wp / 2 + m + (Wp - 2 * m) * t, Hp / 2 - m + (vr() - .5) * Hp * .02); x.closePath(); x.fill(); x.restore();
      snap(x.canvas); paths.push(raster(Wp, Hp, 4)); radii.push(Hp * .16);
    }
    const d = Object.assign({}, WM.dna(w.hand || w.seed || 1), WM.STILI.calli, { nibW: .3 + vr() * .1, contrast: .95, nibA: -.7 + vr() * .3, oldHand: true, st: 'calli', spray: false, drip: false, crown: false, halo: false, under: false, dashes: false, stars: false, quotes: false, swash: true, mix: .4, wide: 1.1 });
    const c = cv(Wp, Hp), cx = c.getContext('2d'), res = WM.handTag(cx, text, d, Wp * .92, Hp * .78, r, ink, 'tag');
    cx.fillStyle = ink; const W0 = res.W * (1.3 + vr() * .5); for (let k = 0; k < 2 + Math.floor(vr() * 2); k++) { const y0 = Hp * (.15 + vr() * .7), pts = [], ph = vr() * PI, am = Hp * .2 * (vr() - .5) * 2; for (let t = 0; t <= 1.001; t += .1) pts.push([Wp * (.05 + .9 * t), y0 + Math.sin(t * PI + ph) * am]); WM.chisel(cx, WM.smooth(pts, 4), W0, d.nibA, true, true, d.contrast); }   // le pennellate larghe che accompagnano
    x.drawImage(c, Wp * .04, Hp * .1);
    x.fillStyle = ink; for (let k = 0; k < 40 && res.path.length; k++) { const q = res.path[Math.floor(r() * res.path.length)]; x.globalAlpha = .4 + r() * .6; x.beginPath(); x.arc(q[0] + Wp * .04 + (r() - .5) * res.W * 4, q[1] + Hp * .1 + (r() - .5) * res.W * 4, .5 + r() * r() * res.W * .2, 0, 7); x.fill(); } x.globalAlpha = 1;   // gli schizzi della pennellessa
    snap(x.canvas); paths.push(res.path.filter((q, i) => i % 2 === 0).map(([a, b]) => [a + Wp * .04, b + Hp * .1])); radii.push(Math.max(res.W * 2, Hp * .1));
  }
  const TKS = { tag: 3, mtag: 3, gotico: 3, adesivi: 3, stencil: 2.5, manifesto: 2, scritta: 1.6, calli: 1.3 };   // la risoluzione in più per i lavori piccoli o fini
  const NOSPRAY = { mtag: 1, manifesto: 1, adesivi: 1 }, AMP = { manifesto: .3, adesivi: .2, stencil: .4, murale: .5, rullo: .6, verticale: .6 };

  // ================= IL LAVORO =================
  const PPM = 100;   // pixel per metro (alto: i bordi netti anche da vicino)
  // i punti dei tratti, uno ogni step pixel, lettera dopo lettera: il percorso della mano
  function densify(strokes, step) { const out = []; strokes.forEach(t => { for (let k = 0; k < t.pts.length; k++) { const a = t.pts[k], b = t.pts[k + 1]; out.push(a); if (!b) continue; const l = hyp(b[0] - a[0], b[1] - a[1]), n = Math.floor(l / step); for (let j = 1; j < n; j++) out.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]); } }); return out; }
  function raster(Wp, Hp, rows) { const out = [], dy = Hp / rows; for (let k = 0; k < rows; k++) { const y = dy * (k + .5), L = k % 2 ? [Wp, 0] : [0, Wp]; for (let j = 0; j <= 16; j++) out.push([L[0] + (L[1] - L[0]) * j / 16, y + (j % 2 ? dy * .3 : -dy * .3)]); } return out; }
  // LE PROPORZIONI: ogni lettera alla stessa altezza delle maiuscole, sulla stessa linea di base, larga quanto vuole la famiglia
  // (le I e gli 1 restano strette), una dopo l'altra con la spaziatura della famiglia. Lo svolazzo segue l'ultima lettera.
  const WIDTH = { block: .72, heavy: .78, piatto: .74, contorno: .72, astratto: .74, semi: .7, wild: .7, spiky: .66, script: .56 }, GAP = { block: -.02, heavy: -.04, piatto: -.03, contorno: .03, astratto: -.02, semi: -.07, wild: -.12, spiky: -.05, script: -.1 };
  function evenOut(L, fam, cons) {
    const groups = {}; L.strokes.forEach(t => { (groups[t.i] = groups[t.i] || []).push(t); });
    const ids = Object.keys(groups).map(Number).sort((a, b) => a - b); if (!ids.length) return L;
    const bb = {}; ids.forEach(i => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; groups[i].forEach(t => { if (t.swash) return; t.pts.forEach(([a, b]) => { x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b); }); }); if (x0 > x1) { x0 = x1 = 0; y0 = 0; y1 = 1; } bb[i] = [x0, y0, x1, y1]; });
    const hs = ids.map(i => bb[i][3] - bb[i][1]).sort((a, b) => a - b), H = hs[hs.length - 1] || 1;   // l'altezza delle maiuscole (la più alta)
    const tw = (cons ? cons.width : (WIDTH[fam] || .7)) * H, gap = (cons ? cons.gap : .08) * H * (fam === 'wild' ? .2 : fam === 'script' ? .4 : 1), step = cons ? cons.step * H : 0;
    let cur = 0; const wave = cons ? (cons.wave || 0) * H : 0, n = ids.length, foot = [];
    ids.forEach((i, k) => { const [x0, , x1, y1] = bb[i], w0 = Math.max(1e-3, x1 - x0), narrow = w0 / H < .3, sx = narrow ? 1 : clamp(tw / w0, .7, 1.6), dy = step * (k % 2 ? -1 : 0) - wave * Math.sin((k + .5) / n * PI);   // l'onda: la parola fa un arco
      groups[i].forEach(t => { t.pts = t.pts.map(([a, b]) => [cur + (a - x0) * sx, b + dy]); }); foot.push([cur, cur + w0 * sx, y1 + dy]); cur += w0 * sx + gap; });
    if (cons && cons.link && fam !== 'contorno') for (let k = 0; k + 1 < n; k++) { if (k % 2) continue; const a = foot[k], b = foot[k + 1], y = Math.max(a[2], b[2]) - H * .06; L.strokes.push({ i: ids[k], link: true, pts: [[a[1] - H * .12, y], [b[0] + H * .12, y]] }); }   // i collegamenti alla base
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; L.strokes.forEach(t => t.pts.forEach(([a, b]) => { x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b); }));
    L.box = [x0, y0, x1, y1]; return L;
  }
  // la penna larga: il tratto ripassato tre volte lungo la punta inclinata (i verticali più grossi degli orizzontali)
  function pen(x, strokes, arrowsL, w, col, dx, dy, J, Cp, nib) {
    if (!nib) { pass(x, { strokes, arrows: arrowsL, w0: w }, w, col, dx, dy, J, Cp); return; }
    const a = -.8, ux = Math.cos(a) * w * nib, uy = Math.sin(a) * w * nib, w2 = w * (1 - nib * .55);
    for (const k of [-1, 0, 1]) pass(x, { strokes, arrows: k ? [] : arrowsL, w0: w2 }, w2, col, (dx || 0) + ux * k, (dy || 0) + uy * k, J, Cp);
  }
  function art(w) {
    const P = PAL[(w.pal || 0) % PAL.length], r = mulberry(w.seed || 1), TK = (TKS[w.style] || w.rec) && w.surf !== 'treno' ? (w.rec ? Math.max(1, Math.min(3, 1600 / Math.max(1, w.W * 100))) : TKS[w.style]) : 1, Wp = Math.round(w.W * PPM * TK), Hp = Math.round(w.H * PPM * TK),   /* [writer] la tag a tre volte la risoluzione: il filo del marker e le punte si vedono */ text = w.words || w.aka || 'NINO';
    const C = choose(w), q = C.q, stages = [], paths = [], radii = [];
    const snap = c => { const k = cv(Wp, Hp); k.getContext('2d').drawImage(c, 0, 0); stages.push(handify(k, (w.seed || 1) * 7 + 1, q, { noSpray: !!NOSPRAY[w.style] || (w.rec && w.tool === 'pennarello'), amp: w.rec ? .25 : INK.on ? .55 : AMP[w.style], crisp: INK.on, age: w.old ? .15 + mulberry((w.seed || 1) ^ 0xa6e)() * .45 : 0 })); };
    const toy = q < .35;
    if (w.rec) { const c = cv(Wp, Hp), x = c.getContext('2d'), res = WM.drawRecorded(x, w.rec, Object.assign({}, WM.dna(w.hand || w.seed || 1)), Wp, Hp, r, w.col || '#141418', w.tool === 'pennarello' ? 'mtag' : 'tag'); snap(c); paths.push(res.path.filter((q, i) => i % 3 === 0)); radii.push(Math.max(res.W * 2.2, Hp * .08)); return { stages, paths, radii, Wp, Hp, C, ppm: PPM * TK }; }   // [writer] il disegno fatto alla tavoletta
    if (w.style === 'mostro') { const c = cv(Wp, Hp); monsterArt(w, P, r, Wp, Hp, snap, paths, radii, c.getContext('2d')); return { stages, paths, radii, Wp, Hp, C }; }
    // [graffiti3] gli altri stili della strada
    { const NEW = { rullo: (...a) => rollerArt(...a, false), estintore: extinguisherArt, stencil: stencilArt, scritta: scrittaArt, manifesto: posterArt, adesivi: stickersArt, murale: muralArt, calli: calliArt };
      if (w.style === 'verticale') { const vf = /^(rullo|bolle|pixo)$/.test(w.fam) ? w.fam : pickR(mulberry((w.seed || 1) ^ 0x11), ['rullo', 'rullo', 'bolle', 'pixo', 'pixo']); C.vfam = vf; NEW.verticale = vf === 'bolle' ? stackedBubbleArt : vf === 'pixo' ? pixoArt : (...a) => rollerArt(...a, true); }
      if (NEW[w.style]) { const c = cv(Wp, Hp); NEW[w.style](w, P, C, r, Wp, Hp, snap, paths, radii, c.getContext('2d')); SQ = 0; CUT = 0; return { stages, paths, radii, Wp, Hp, C, ppm: PPM * TK }; } }
    if (w.style === 'tag' || w.style === 'mtag' || w.style === 'gotico') {   // la tag: la mano del writer (writer_mano.js), col suo segno accanto
      const c = cv(Wp, Hp), x = c.getContext('2d'), signW = w.sign && w.style !== 'gotico' ? Hp * .7 : 0, d = Object.assign({}, WM.dna(w.hand || w.seed || 1), w.style === 'gotico' ? { goth: true, vert: Hp > Wp * 1.4 } : {});
      const col = w.col || (w.style === 'mtag' ? '#121216' : P.f[1]);
      const res = WM.handTag(x, text, d, Wp - signW, Hp, r, w.style === 'gotico' && !w.col ? '#101012' : col, w.style === 'gotico' ? 'tag' : w.style);
      if (w.sign) sign(x, w.sign, Wp - signW * .55, Hp * .5, signW * .55, w.style === 'mtag' ? '#f2efe6' : col);
      snap(c); paths.push(res.path.filter((q, i) => i % 2 === 0).concat(w.sign ? [[Wp - signW * .55, Hp * .5]] : [])); radii.push(Math.max(res.W * 2.2, Hp * .1));
      return { stages, paths, radii, Wp, Hp, C, ppm: PPM * TK };
    }
    if (w.style === 'wholecar' && !w.flat) { trainArt(w, P, C, r, Wp, Hp, stages, paths, radii); return { stages, paths, radii, Wp, Hp, C }; }   // [writer] la fiancata intera
    const c = cv(Wp, Hp), x = c.getContext('2d');
    // [graffiti4] il motore a inchiostro: i throw-up e le bolle, i pezzi costruiti (il solo contorno e il corsivo restano ai motori di prima)
    if (w.style === 'throw' || (/^(bubble|fat|throwie|chrome)$/.test(C.fam) && w.style !== 'wholecar')) { INK.on = true; try { bubbleInk(w, P, C, r, Wp, Hp, snap, paths, radii, x); } finally { INK.on = false; } SQ = 0; CUT = 0; return { stages, paths, radii, Wp, Hp, C }; }
    if (/^(block|heavy|piatto|astratto|tridi|semi|wild|spiky|contorno|script)$/.test(C.fam) && w.style !== 'wholecar') { INK.on = true; try { pieceInk(w, P, C, r, Wp, Hp, snap, paths, radii, x); } finally { INK.on = false; } return { stages, paths, radii, Wp, Hp, C }; }
    if (/^(block|heavy|piatto|contorno|astratto|tridi)$/.test(C.fam) && w.style !== 'throw' && w.style !== 'wholecar') { blockArt(w, P, C, r, Wp, Hp, snap, paths, radii, x); return { stages, paths, radii, Wp, Hp, C }; }   // le lettere blockbuster
    // [graffiti3] il wildstyle e le lettere a spine vanno dal motore a tratti (frecce, punte, incastri, il personaggio): prima
    // passavano tutte dalle bolle squadrate e un «wild» era un bubble con gli angoli. Il semi-wild metà e metà, i toy restano alle bolle
    const wildFree = (/^(wild|spiky)$/.test(C.fam) && C.q > .4) || (C.fam === 'semi' && C.q > .45 && mulberry((w.seed || 1) ^ 0x77) () < .5);
    if (FAM[C.fam] && !wildFree && (FAM[C.fam].fat && w.style !== 'wholecar' || /^(block|heavy|semi|wild|spiky|piatto|astratto)$/.test(C.fam) && w.style !== 'throw')) { bubbleArt(w, P, C, r, Wp, Hp, snap, paths, radii, x); SQ = 0; CUT = 0; return { stages, paths, radii, Wp, Hp, C }; }   // [writer] le bolle, e i pezzi costruiti sulle bolle   // le lettere a bolla
    const train = w.style === 'wholecar', wild = w.style === 'burner' || train, throwUp = w.style === 'throw', F = FAM[C.fam];
    const charW = C.chr ? Hp * (train ? .95 : .9) : 0, charLeft = !(r() < .3);
    const sloganH = C.slogan && !throwUp ? Hp * .1 : 0;
    // la mano: un toy trema, non sa il 3D, sbaglia gli spessori; un king è pulito, profondo, pieno di dettagli
    const CN0 = w.cons || consOf(w.hand || w.seed || 1), LW = Wp - charW, PZ = !F.flat && !F.ink && C.fam !== 'script' && q > .35, opts = { font: null, h: 100, adv: F.adv * (PZ ? .9 : 1), skew: PZ ? .14 + Math.abs(CN0.slant) * .5 : F.skew * .4 + CN0.slant, bounce: q < .35 ? .04 : 0, rot: q < .35 ? .1 : .02, wob: q < .35 ? .03 : 0, scale: 0, ext: F.ext * .6, links: C.fam === 'wild' && q > .6 ? Math.min(2, F.links) : 0 };
    // lo scheletro: per le famiglie che corrono (semi, wild, corsivo, a spine) è la TAG del writer, ingrassata: il pezzo ha la sua mano
    const handFam = C.fam === 'script';   // [writer] il wildstyle parte dalle lettere dei pezzi (con frecce e punte), non dalla tag: si legge
    let L0;
    if (handFam && WM) {
      const hd = Object.assign({}, WM.dna(w.hand || w.seed || 1), { crown: false, halo: false, under: false, dashes: false, stars: false, quotes: false, swash: C.fam === 'script' || (wild && r() < .5), loop: false, wob: 0, mix: C.fam === 'script' ? .7 : 0, adv: C.fam === 'wild' ? .55 : .62, bigFirst: 1, tall: 1, bounce: 0, arc: 0, wob: 0 });
      const H0 = WM.layout(text, hd, r); L0 = { strokes: H0.strokes.map(t => ({ pts: WM.smooth(t.pts, 3).filter((q, k, a) => k % 2 === 0 || k === a.length - 1).map(([a, b]) => [a * 100, b * 100]), i: t.i, swash: t.swash })), box: H0.box.map(v => v * 100) };
    } else L0 = letters(text, opts, r);
    const CN = w.cons || consOf(w.hand || w.seed || 1);
    L0 = evenOut(L0, C.fam, CN);
    const padK = (.6 * F.lw / (1 + 1.2 * F.lw) + .04) * (PZ ? 1.45 : 1), L = fit(L0, LW, Hp - sloganH, Hp * padK, train ? 1.6 : wild ? 1.3 : 1.1);
    const ox0 = charLeft ? charW : 0; L.strokes.forEach(t => { t.pts = t.pts.map(([a, b]) => [a + ox0, b]); });
    if (PZ) { const fl0 = r() * 6.28, fA = Hp * (.025 + r() * .02), bw = Math.max(1, L.box[2] - L.box[0]); L.strokes.forEach(t => { t.pts = t.pts.map(([a, b]) => [a, b + Math.sin((a - L.box[0]) / bw * PI * 1.3 + fl0) * fA]); }); L.box = [L.box[0], L.box[1] - fA, L.box[2], L.box[3] + fA]; }   /* [writer] il flow: la linea di base ondeggia, le lettere corrono insieme */  L.box = [L.box[0] + ox0, L.box[1], L.box[2] + ox0, L.box[3]];
    const capH = 100 * L.s, lw = (F.flat || F.fat || F.ink ? F.lw * .5 + CN.weight * .5 : CN.weight * .6 + F.lw * .4) * capH * (train ? 1.1 : 1) * (PZ ? 1.3 : 1), ol = Math.max(2, capH * CN.line * (toy ? .7 + r() * .6 : 1)), kl = Math.max(2, capH * .03);
    const mod3 = r(), d3 = F.flat || (C.pal >= 14 && mod3 < .4) ? (r() < .4 ? lw * .22 : .01) : throwUp ? Math.max(2, lw * F.d3 * .6) : Math.max(toy ? 1 : 3, lw * F.d3 * (toy ? .3 : .55 + q * .55)), ang3 = F.chrome ? .9 : .78, dx = d3 * Math.cos(ang3), dy = d3 * Math.sin(ang3), steps = Math.max(1, Math.round(d3 / 1.5));
    if (F.swash) swash(L, r);
    if (F.arrows && !throwUp && q > .3) arrows(L, r, Math.max(1, Math.round(F.arrows * q * .6)), lw); else { L.arrows = []; L.w0 = lw; }
    if (F.spikes) spikes(L, r, lw);
    if (CN.bars) L.strokes.forEach(t => { if (t.swash || t.pts.length < 2) return; const e = t.pts[t.pts.length - 1], p0 = t.pts[t.pts.length - 2], dx = e[0] - p0[0], dy = e[1] - p0[1]; if (Math.abs(dy) > Math.abs(dx) * .3 || dx <= 0) return;
      const free = !L.strokes.some(o => o !== t && o.i === t.i && o.pts.some(q2 => hyp(q2[0] - e[0], q2[1] - e[1]) < lw * .9)); if (free && r() < CN.bars) e[0] += 100 * L.s * .22; });   // le barre che sporgono
    // IL CORPO DELLE LETTERE: ogni tratto diventa una sagoma (poligono) a spessore variabile; le lettere sono sagome, non tubi
    const SH0 = F.sh || { flare: .2, bh: .2, con: .25, cap: 'square', sharp: true }, SH = Object.assign({}, SH0, { con: (SH0.con + CN.con) / 2, bh: Math.max(SH0.bh * .5, CN.bh), cap: C.fam === 'script' ? SH0.cap : { cut: 'square', flare: 'flare', round: 'round', spike: 'point' }[CN.term] }), nibA = -.9 + r() * .5;
    const [lbx0, lby0, lbx1, lby1] = L.box, lbh = Math.max(1, lby1 - lby0);
    const wfn = (t, p, a) => lw * Math.max(.25, (1 + SH.flare * Math.pow(Math.abs(2 * t - 1), 3)) * (1 + SH.bh * ((p[1] - lby0) / lbh - .5)) * (1 - SH.con + SH.con * Math.abs(Math.sin(a - nibA)) * 1.3));
    const jit = q < .35 ? lw * .04 : 0;
    const groups = []; L.strokes.forEach(t => { (groups[t.i] = groups[t.i] || []).push(t); });
    const strokePoly = (t) => {
      let pts = t.pts; if (SH.smooth && pts.length > 2 && WM) pts = WM.smooth(pts, 4);
      else if (PZ && pts.length > 2) for (let it = 0; it < 3; it++) {   // [writer] niente low poly: le curve si arrotondano e si infittiscono, gli spigoli (oltre 55°) restano vivi
        const Q = [pts[0]]; for (let k = 1; k < pts.length - 1; k++) { const a = pts[k - 1], b = pts[k], c2 = pts[k + 1], u1 = [b[0] - a[0], b[1] - a[1]], u2 = [c2[0] - b[0], c2[1] - b[1]], turn = Math.abs(Math.atan2(u1[0] * u2[1] - u1[1] * u2[0], u1[0] * u2[0] + u1[1] * u2[1]));
          if (turn < .95) Q.push([.75 * b[0] + .25 * a[0], .75 * b[1] + .25 * a[1]], [.75 * b[0] + .25 * c2[0], .75 * b[1] + .25 * c2[1]]); else Q.push(b); }
        Q.push(pts[pts.length - 1]); pts = Q; }
      if (pts.length === 1) { const c0 = pts[0], rr = lw * .55, o = []; for (let k = 0; k < 14; k++) o.push([c0[0] + Math.cos(k / 14 * PI * 2) * rr, c0[1] + Math.sin(k / 14 * PI * 2) * rr]); return o; }
      const n = pts.length, Lf = [], Rt = [], dirs = [];
      for (let i = 0; i < n - 1; i++) { const dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1], l = hyp(dx, dy) || 1; dirs.push([dx / l, dy / l]); }
      for (let i = 0; i < n; i++) {
        const d0 = dirs[Math.max(0, i - 1)], d1 = dirs[Math.min(n - 2, i)], ax = d0[0] + d1[0], ay = d0[1] + d1[1], al = hyp(ax, ay) || 1, tx0 = ax / al, ty0 = ay / al, nx = -ty0, ny = tx0;
        const mit = SH.sharp ? Math.min(1.6, 1 / Math.max(.6, Math.abs(d0[0] * tx0 + d0[1] * ty0))) : 1, w = wfn(i / (n - 1), pts[i], Math.atan2(ty0, tx0)) / 2 * mit, p = pts[i];
        const j1 = (r() - .5) * jit, j2 = (r() - .5) * jit;
        Lf.push([p[0] + nx * w + j1, p[1] + ny * w + j2]); Rt.push([p[0] - nx * w - j2, p[1] - ny * w + j1]);
      }
      const capOf = (end) => {   // l'estremità: tagliata, tonda, a punta, svasata
        const i = end ? n - 1 : 0, d = end ? dirs[n - 2] : [-dirs[0][0], -dirs[0][1]], p = pts[i], w = wfn(end ? 1 : 0, p, 0) / 2, a = end ? Lf[n - 1] : Rt[0], b = end ? Rt[n - 1] : Lf[0];
        const joint = (groups[t.i] || []).some(o => o !== t && o.pts.some(q2 => hyp(q2[0] - p[0], q2[1] - p[1]) < lw * .9));   // il capo tocca un altro tratto della lettera
        const cap = joint ? (SH.cap === 'square' ? 'square' : 'round') : t.swash || (SH.cap === 'flare' && r() < .5) ? 'point' : SH.cap;
        if (cap === 'point') return [[p[0] + d[0] * w * (1.6 + r()), p[1] + d[1] * w * (1.6 + r())]];
        if (cap === 'round') { const o = [], a0 = Math.atan2(a[1] - p[1], a[0] - p[0]); for (let k = 1; k < 12; k++) { const an = a0 - k / 12 * PI; o.push([p[0] + Math.cos(an) * w, p[1] + Math.sin(an) * w]); } return o; }
        if (cap === 'flare') return [[a[0] + d[0] * w * .5 - d[1] * w * .25, a[1] + d[1] * w * .5 + d[0] * w * .25], [p[0] + d[0] * w * .9, p[1] + d[1] * w * .9], [b[0] + d[0] * w * .3, b[1] + d[1] * w * .3]];
        return [[a[0] + d[0] * w * .55, a[1] + d[1] * w * .55], [b[0] + d[0] * w * .55, b[1] + d[1] * w * .55]];   // il taglio dritto (block)
      };
      const capE = capOf(true), capS = capOf(false);   // le estremità prima di girare il lato destro
      let poly = Lf.concat(capE, Rt.slice().reverse(), capS);
      let area = 0; for (let k = 0; k < poly.length; k++) { const p0 = poly[k], p1 = poly[(k + 1) % poly.length]; area += p0[0] * p1[1] - p1[0] * p0[1]; } if (area < 0) poly = poly.reverse();
      return poly;
    };
    const order = groups.map((g, i) => i).filter(i => groups[i]).reverse();   // da destra: la lettera a sinistra sta sopra (così si legge)
    if (C.fam === 'wild' && q > .75) for (let k = 0; k + 1 < order.length; k++) if (r() < .15) { const t = order[k]; order[k] = order[k + 1]; order[k + 1] = t; k += 2; }   // solo il wildstyle dei king intreccia qualche lettera
    const arrOf = i => (L.arrows || []).filter(a => { const tip = a[1]; let best = -1, bd = 1e9; L.strokes.forEach(t => { const e = t.pts[t.pts.length - 1], d = hyp(e[0] - tip[0], e[1] - tip[1]); if (d < bd) { bd = d; best = t.i; } }); return best === i; });
    const polys = []; order.forEach(i => { polys[i] = groups[i].map(strokePoly).concat(arrOf(i).map(a => { let p = a.slice(); let ar = 0; for (let k = 0; k < 3; k++) { const p0 = p[k], p1 = p[(k + 1) % 3]; ar += p0[0] * p1[1] - p1[0] * p0[1]; } return ar < 0 ? p.reverse() : p; })); });
    // LE MASCHERE: ogni lettera riempita tratto per tratto (niente buchi dove i tratti si incrociano); contorni, keyline e 3D
    // si fanno per dilatazione della maschera (copie spostate in cerchio): nessuna linea interna, bordi puliti
    const M = cv(Wp, Hp), mx = M.getContext('2d'), T1 = cv(Wp, Hp), t1 = T1.getContext('2d'), T2 = cv(Wp, Hp), t2 = T2.getContext('2d');
    const J = SH.cap === 'square' ? 'miter' : 'round';
    const polyPath = (ctx, pl, dx0, dy0) => { ctx.beginPath(); pl.forEach(([a, b], k) => k ? ctx.lineTo(a + (dx0 || 0), b + (dy0 || 0)) : ctx.moveTo(a + (dx0 || 0), b + (dy0 || 0))); ctx.closePath(); };
    const maskOf = i => { mx.clearRect(0, 0, Wp, Hp); mx.fillStyle = '#fff'; mx.strokeStyle = '#fff'; mx.lineWidth = 1.2; mx.lineJoin = 'round'; polys[i].forEach(pl => { polyPath(mx, pl); mx.fill(); mx.stroke(); }); return M; };
    // i contorni e il 3D a vettori, un tratto alla volta (così i tratti che si incrociano non si annullano)
    const strokeL = (ctx, list, col, wd, dx0, dy0) => { ctx.strokeStyle = col; ctx.lineWidth = wd; list.forEach(pl => { polyPath(ctx, pl, dx0, dy0); ctx.stroke(); }); };
    const extrude = (ctx, list, col, wd) => { list.forEach(pl => { for (let k = 0; k < pl.length; k++) { const a = pl[k], b = pl[(k + 1) % pl.length]; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(b[0] + dx, b[1] + dy); ctx.lineTo(a[0] + dx, a[1] + dy); ctx.closePath(); if (wd) ctx.stroke(); else ctx.fill(); } polyPath(ctx, pl, dx, dy); if (wd) ctx.stroke(); else ctx.fill(); }); };
    const tint = (src, col, dst) => { const d = dst || t1; d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, Wp, Hp); d.drawImage(src, 0, 0); d.globalCompositeOperation = 'source-in'; if (isCanvas(col)) d.drawImage(col, 0, 0); else { d.fillStyle = col; d.fillRect(0, 0, Wp, Hp); } d.globalCompositeOperation = 'source-over'; return d.canvas; };
    const DIRS = 20, dilate = (ctx, img, rr, ox0, oy0) => { ctx.drawImage(img, ox0 || 0, oy0 || 0); if (rr <= 0) return; for (const f of rr > 4 ? [1, .55] : [1]) for (let k = 0; k < DIRS; k++) ctx.drawImage(img, (ox0 || 0) + Math.cos(k / DIRS * PI * 2) * rr * f, (oy0 || 0) + Math.sin(k / DIRS * PI * 2) * rr * f); };
    const smear = (img, dst) => { dst.clearRect(0, 0, Wp, Hp); const n = Math.max(1, Math.ceil(d3 / 1.2)); for (let k = 0; k <= n; k++) dst.drawImage(img, dx * k / n, dy * k / n); return dst.canvas; };   // la maschera trascinata lungo il 3D
    const inkFill = F.ink ? (r() < .75 ? '#141418' : shade(P.f[2], -.55)) : F.flat ? pickR(r, FLATS) : null, OL = F.ink ? '#f6f4ee' : F.flat ? '#101012' : P.o, KL = F.ink ? '#141418' : P.k;
    const PAT = cv(Wp, Hp), px = PAT.getContext('2d'); px.fillStyle = inkFill || P.f[1]; px.fillRect(0, 0, Wp, Hp);
    if (PZ && !F.chrome && !(P.silver)) {   // [writer] la sfumatura dei pezzi: bande nette, il taglio curvo, uguale su tutto il pezzo
      const [a0, b0, a1, b1] = L.box, hh = b1 - b0, cut = (yy, k) => { px.beginPath(); px.moveTo(a0 - lw, yy); for (let xx = a0 - lw; xx <= a1 + lw; xx += lw * .5) px.lineTo(xx, yy + Math.sin((xx - a0) / (a1 - a0 + 1) * PI * (1.2 + k * .3) + k) * hh * .05); px.lineTo(a1 + lw, b1 + lw * 2); px.lineTo(a0 - lw, b1 + lw * 2); px.closePath(); };
      px.fillStyle = P.f[0]; px.fillRect(0, 0, Wp, Hp); px.fillStyle = P.f[1]; cut(b0 + hh * (.4 + r() * .1), 0); px.fill(); px.fillStyle = P.f[2]; cut(b0 + hh * (.72 + r() * .08), 1); px.fill();
      px.strokeStyle = 'rgba(255,255,255,.55)'; px.lineWidth = Math.max(1.5, lw * .05); cut(b0 + hh * (.4 + r() * .1) - lw * .08, 0); px.stroke();
    } else if (!F.ink && !F.flat) fillPattern(px, throwUp && !F.chrome ? (C.fillk === 'diag' ? 'diag' : 'fade') : C.fillk, P, L.box, lw, Wp, Hp, r);
    passes(px, L.box, lw, r, Wp, Hp);
    // il riempimento di una lettera (con la seconda linea: la maschera erosa riempita col motivo sopra la maschera del colore della linea)
    const letterImg = (i, lineCol, m) => {
      const Mi = maskOf(i);
      if (!lineCol) return tint(Mi, PAT, t2);
      t2.globalCompositeOperation = 'source-over'; t2.clearRect(0, 0, Wp, Hp); t2.drawImage(Mi, 0, 0); t2.globalCompositeOperation = 'destination-in';
      for (let k = 0; k < 8; k++) t2.drawImage(Mi, Math.cos(k * PI / 4) * m, Math.sin(k * PI / 4) * m);
      t2.globalCompositeOperation = 'source-in'; t2.drawImage(PAT, 0, 0); t2.globalCompositeOperation = 'destination-over'; t2.fillStyle = lineCol; t2.fillRect(0, 0, Wp, Hp);   // sotto: il colore della linea (solo dentro la maschera)
      t2.globalCompositeOperation = 'destination-in'; t2.drawImage(Mi, 0, 0); t2.globalCompositeOperation = 'source-over'; return T2;
    };
    // 1. il riempimento (un writer riempie per primo)
    const FILL = cv(Wp, Hp), fx = FILL.getContext('2d'); order.forEach(i => fx.drawImage(letterImg(i), 0, 0));
    x.drawImage(FILL, 0, 0); snap(c); paths.push(densify(order.flatMap(i => groups[i]), lw * .5)); radii.push(lw * .75);
    // 2. lo sfondo (dietro alle lettere)
    const BG = cv(Wp, Hp), bg = BG.getContext('2d');
    let cloudPZ = null; if (PZ && !train && C.bgk && C.bgk !== 'rullo') { cloudPZ = q > .55 && r() < .6 ? pickR(r, FLATS.filter(c => c !== '#d8201a')) : null; C.bgk = null; }   // [writer] nei pezzi niente scacchi, ovali, adesivi: al più la nuvola chiara
    if (cloudPZ) { bg.save(); bg.translate(Wp * .08, Hp * .14); cloudBlobs(bg, Wp * .84, Hp * .72, r, cloudPZ, P.o, 0); bg.restore(); const k = cv(Wp, Hp), kx = k.getContext('2d'); kx.drawImage(BG, 0, 0); kx.drawImage(FILL, 0, 0); x.clearRect(0, 0, Wp, Hp); x.drawImage(k, 0, 0); snap(c); paths.push(raster(Wp, Hp, 4)); radii.push(Hp * .16); }
    if (C.bgk) { if (C.bgk === 'rullo' && !train && !toy) cloudOf(bg, FILL, P, Wp, Hp, r, q); else background(bg, toy && !train ? 'spruzzi' : C.bgk, P, Wp, Hp, r, train); const k = cv(Wp, Hp), kx = k.getContext('2d'); kx.drawImage(BG, 0, 0); kx.drawImage(FILL, 0, 0); x.clearRect(0, 0, Wp, Hp); x.drawImage(k, 0, 0); snap(c); paths.push(raster(Wp, Hp, train ? 6 : 4)); radii.push(Hp * (train ? .13 : .16)); }
    // 3. le lettere vere: la keyline attorno a tutto (3D compreso), il 3D pieno col suo bordo dietro a tutte, poi le lettere in ordine
    const OUT = cv(Wp, Hp), ox = OUT.getContext('2d'); ox.drawImage(BG, 0, 0);
    ox.lineJoin = 'round'; ox.lineCap = 'round';
    const allP = order.flatMap(i => polys[i]);
    const inPoly = (pt, pl) => { let c3 = false; for (let a = 0, b = pl.length - 1; a < pl.length; b = a++) { const A = pl[a], B2 = pl[b]; if ((A[1] > pt[1]) !== (B2[1] > pt[1]) && pt[0] < (B2[0] - A[0]) * (pt[1] - A[1]) / (B2[1] - A[1]) + A[0]) c3 = !c3; } return c3; };
    if (q > .3 && !throwUp && !F.flat && (P.k && (PZ || w.pal < 14 || r() < .3))) { ox.strokeStyle = KL; ox.fillStyle = KL; extrude(ox, allP, KL, 2 * (ol + kl)); strokeL(ox, allP, KL, 2 * (ol + kl)); }   // la keyline attorno a tutto, 3D compreso
    ox.strokeStyle = F.ink ? KL : P.o; extrude(ox, allP, null, 2 * ol);   // il bordo del blocco 3D
    ox.fillStyle = F.ink ? KL : P.d; extrude(ox, allP, null, 0);   // il blocco 3D
    if (PZ && d3 > 3) {   // [writer] gli spigoli del 3D: dagli angoli della lettera al blocco, sottili, del colore del contorno
      ox.strokeStyle = P.o; ox.lineWidth = Math.max(1, ol * .55); ox.lineCap = 'round';
      const onEdge = (pt, own) => !allP.some(o => o !== own && inPoly(pt, o));
      allP.forEach(pl => { const n = pl.length; for (let k = 0; k < n; k++) { if (!onEdge(pl[k], pl)) continue; const a = pl[(k - 1 + n) % n], b = pl[k], c2 = pl[(k + 1) % n], u1 = [b[0] - a[0], b[1] - a[1]], u2 = [c2[0] - b[0], c2[1] - b[1]], l1 = hyp(...u1) || 1, l2 = hyp(...u2) || 1, turn = Math.abs(Math.atan2(u1[0] * u2[1] - u1[1] * u2[0], u1[0] * u2[0] + u1[1] * u2[1]));
        if (turn < .6 || l1 < ol * 2 || l2 < ol * 2) continue; ox.beginPath(); ox.moveTo(b[0], b[1]); ox.lineTo(b[0] + dx, b[1] + dy); ox.stroke(); } });
      const sh3 = ox.createLinearGradient(0, L.box[1], 0, L.box[3] + d3); sh3.addColorStop(0, 'rgba(255,255,255,.12)'); sh3.addColorStop(1, 'rgba(0,0,0,.25)');
    }
    const DI = cv(Wp, Hp), di = DI.getContext('2d'), RL = cv(Wp, Hp), rl = RL.getContext('2d');
    const rim = (i, k, sx, sy, col) => { rl.globalCompositeOperation = 'source-over'; rl.clearRect(0, 0, Wp, Hp); rl.drawImage(maskOf(i), 0, 0); rl.globalCompositeOperation = 'destination-out'; rl.drawImage(M, sx * k, sy * k); rl.globalCompositeOperation = 'source-in'; rl.fillStyle = col; rl.fillRect(0, 0, Wp, Hp); rl.globalCompositeOperation = 'source-over'; return RL; };   // il bordo interno della lettera dal lato (sx, sy)
    order.forEach(i => {
      if (PZ) { di.clearRect(0, 0, Wp, Hp); dilate(di, maskOf(i), ol); ox.drawImage(tint(DI, OL), 0, 0); }   // [writer] il contorno: la sagoma unita della lettera allargata (chiuso, niente giunture)
      else { ox.lineJoin = J; ox.miterLimit = 1.6; strokeL(ox, polys[i], OL, 2 * ol); ox.lineJoin = 'round'; }   // il contorno della lettera (sopra il 3D e sopra la lettera prima)
      if (F.hollow) { ox.save(); ox.globalCompositeOperation = 'destination-out'; ox.drawImage(maskOf(i), 0, 0); ox.restore(); if (C.bgk) { ox.save(); ox.globalCompositeOperation = 'destination-over'; ox.restore(); } return; }   // solo contorno: dentro si vede il muro
      const Li = letterImg(i, !F.ink && !F.flat && q > .45 ? shade(P.f[2], -.35) : null, Math.max(1.5, ol * .8)), lc = t1; lc.clearRect(0, 0, Wp, Hp); lc.drawImage(Li, 0, 0);
      lc.globalCompositeOperation = 'source-atop';
      if (PZ) {   // [writer] lo shine: lungo i bordi rivolti in alto a sinistra, rientrato dal contorno, un trattino e un puntino
        lc.strokeStyle = P.hi; lc.fillStyle = P.hi; lc.lineCap = 'round'; lc.lineWidth = Math.max(1.5, lw * .07);
        const lit = []; polys[i].forEach(pl => { let ar = 0; for (let k = 0; k < pl.length; k++) { const p0 = pl[k], p1 = pl[(k + 1) % pl.length]; ar += p0[0] * p1[1] - p1[0] * p0[1]; } const sg = ar > 0 ? 1 : -1;
          for (let k = 0; k < pl.length; k++) { const a = pl[k], b = pl[(k + 1) % pl.length], ex = b[0] - a[0], ey = b[1] - a[1], el = hyp(ex, ey); if (el < lw * .45) continue;
            const nx = ey / el * sg, ny = -ex / el * sg; if (nx * -.62 + ny * -.78 < .55) continue;   // la normale verso fuori guarda la luce (in alto a sinistra)
            lit.push({ a, ex, ey, el, nx, ny }); } });
        const kk = Math.max(1.5, lw * .085);
        lc.globalAlpha = .55; lc.drawImage(rim(i, kk * 1.3, -1, -1, shade(P.f[2], -.35)), 0, 0);   // [writer] l'ombra interna in basso a destra
        lc.globalAlpha = .85; lc.drawImage(rim(i, kk, 1, 1, P.hi), kk * .45, kk * .45); lc.globalAlpha = 1;   // la luce continua lungo i bordi in alto a sinistra, rientrata
        lit.sort((p0, p1) => p1.el - p0.el); lit.filter(e => !polys[i].some(o => inPoly([e.a[0] + e.ex * .5, e.a[1] + e.ey * .5], o) && !o.includes(e.a))).slice(0, 1).forEach(({ a, ex, ey, el, nx, ny }) => { {
            const inn = ol * 1.4 + lw * .06, s0 = .18, s1 = .18 + Math.min(.5, lw * 1.2 / el); lc.beginPath(); lc.moveTo(a[0] + ex * s0 - nx * inn, a[1] + ey * s0 - ny * inn); lc.lineTo(a[0] + ex * s1 - nx * inn, a[1] + ey * s1 - ny * inn); lc.stroke();
            lc.beginPath(); lc.arc(a[0] + ex * (s1 + .1) - nx * inn, a[1] + ey * (s1 + .1) - ny * inn, lc.lineWidth * .55, 0, 7); lc.fill(); } });
      } else       if (q > .5 && !F.flat) { lc.strokeStyle = P.hi; lc.fillStyle = P.hi; lc.lineCap = 'round'; lc.lineWidth = Math.max(1.5, ol * .7); polys[i].slice(0, 1).forEach(pl => { let k0 = 0, best = 1e9; pl.forEach(([a, b], k) => { if (a + b < best) { best = a + b; k0 = k; } }); const a = pl[k0], b = pl[(k0 + 1) % pl.length], cxp = pl.reduce((s0, p) => s0 + p[0], 0) / pl.length, cyp = pl.reduce((s0, p) => s0 + p[1], 0) / pl.length, ix = cxp - a[0], iy = cyp - a[1], il = hyp(ix, iy) || 1, off = ol * 2.4, ex2 = b[0] - a[0], ey2 = b[1] - a[1], el = hyp(ex2, ey2) || 1, len = Math.min(el * .6, lw * .55);
        lc.beginPath(); lc.moveTo(a[0] + ix / il * off, a[1] + iy / il * off); lc.lineTo(a[0] + ix / il * off + ex2 / el * len, a[1] + iy / il * off + ey2 / el * len); lc.stroke(); lc.beginPath(); lc.arc(a[0] + ix / il * off + ex2 / el * (len + ol * 2.2), a[1] + iy / il * off + ey2 / el * (len + ol * 2.2), ol * .6, 0, 7); lc.fill(); }); }   // la luce: un tocco sul bordo in alto a sinistra
      if (F.doodles && q > .25) doodles(lc, groups[i], lw, r, F.ink ? '#f6f4ee' : P.hi, F.ink, F.stars, F.ink && i === order[Math.floor(order.length / 2)] && r() < .45);
      if (F.cuts) { const pts = polys[i].flat(), a0 = Math.min(...pts.map(p => p[0])), a1 = Math.max(...pts.map(p => p[0])), b0 = Math.min(...pts.map(p => p[1])), b1 = Math.max(...pts.map(p => p[1])), cols = [P.f[0], P.bg, P.d, P.k, P.f[2]];
        for (let k = 0; k < 2 + Math.floor(r() * 3); k++) { const ang = r() * PI, cx0 = a0 + (a1 - a0) * r(), cy0 = b0 + (b1 - b0) * r(), L2 = (a1 - a0 + b1 - b0), ux = Math.cos(ang), uy = Math.sin(ang);
          lc.fillStyle = pickR(r, cols); lc.beginPath(); lc.moveTo(cx0 - ux * L2, cy0 - uy * L2); lc.lineTo(cx0 + ux * L2, cy0 + uy * L2); lc.lineTo(cx0 + ux * L2 - uy * L2, cy0 + uy * L2 + ux * L2); lc.lineTo(cx0 - ux * L2 - uy * L2, cy0 - uy * L2 + ux * L2); lc.closePath(); lc.globalAlpha = .9; lc.fill(); lc.globalAlpha = 1;
          lc.strokeStyle = OL; lc.lineWidth = Math.max(1.5, ol * .7); lc.beginPath(); lc.moveTo(cx0 - ux * L2, cy0 - uy * L2); lc.lineTo(cx0 + ux * L2, cy0 + uy * L2); lc.stroke(); } }   // i piani
      lc.globalCompositeOperation = 'source-over'; ox.drawImage(T1, 0, 0);
    });
    if (throwUp || toy) drips(ox, L, r, F.ink ? (r() < .5 ? '#f6f4ee' : '#141418') : throwUp ? P.o : P.f[2], lw * .3, throwUp ? 6 : 7, Hp * (toy ? .22 : .16));
    x.clearRect(0, 0, Wp, Hp); x.drawImage(OUT, 0, 0); snap(c); paths.push(densify(order.flatMap(i => groups[i]), lw * .6)); radii.push(lw * .6 + ol * 2 + d3 * .5);
    // 4. i dettagli: stelline, il personaggio, la firma della crew, l'anno, lo slogan

    if (C.chr) character(x, C.chr, charLeft ? charW * .5 : Wp - charW * .5, (Hp - sloganH) * .52, Hp * (train ? .5 : .46), P, r);
    const [bx0, by0, bx1, by1] = L.box, crew = w.crew || 'PV';
    smallTag(x, w.words && w.aka ? w.aka + ' ' + crew : crew, Math.min(Wp - Hp * .3, bx1 - Hp * .2), Math.min(Hp - sloganH - Hp * .07, by1 + lw * .9), Hp * .1, P.o, r, Wp * .3);
    if (!throwUp) smallTag(x, C.yr, bx0 + Hp * .15, Math.max(Hp * .07, by0 - lw * .8), Hp * .08, P.o, r);
    if (sloganH) { const r2 = mulberry((w.seed || 1) + 99), r3 = mulberry((w.seed || 1) + 99); smallTag(x, C.slogan, Wp / 2, Hp - sloganH * .55, sloganH * .75, P.k, r2, Wp * .85, 2.6); smallTag(x, C.slogan, Wp / 2, Hp - sloganH * .55, sloganH * .75, P.o, r3, Wp * .85); }
    snap(c); paths.push(raster(Wp, Hp, 3)); radii.push(Hp * .2);
    return { stages, paths, radii, Wp, Hp, C };
  }
  // il crossaggio: una X enorme e la tag di chi crossa
  function crossOut(ctx, x, y, Wp, Hp, c, r) {
    ctx.save(); ctx.strokeStyle = '#101012'; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(4, Hp * .07); ctx.shadowColor = '#101012'; ctx.shadowBlur = 3;
    ctx.beginPath(); ctx.moveTo(x + Wp * .08, y + Hp * .1); ctx.lineTo(x + Wp * .92, y + Hp * .9); ctx.moveTo(x + Wp * .9, y + Hp * .08); ctx.lineTo(x + Wp * .1, y + Hp * .92); ctx.stroke(); ctx.restore();
    const L = fit(letters(c.aka + ' ' + c.crew, { h: 100, adv: .66, skew: .4, wob: .07, bounce: .1, rot: .2 }, r), Wp * .8, Hp * .45, 4);
    ctx.save(); ctx.translate(x + Wp * .1, y + Hp * .3); pass(ctx, L, Math.max(3, Hp * .06), '#d8201a', 0, 0); ctx.restore();
  }
  return { PAL, COL2PAL, FAM, FAMS, FILLS, BGS, CHARS, WORDS, SLOGANS, SIGNS, SIGN_TXT, PPM, DEF, SCRITTE, MANIFESTI, STENCIL_TXT, STENCIL_MOTIFS, MURALI_TXT, art, choose, conceive, dnaOf, crossOut, letters, mulberry };
})();
if (typeof module !== 'undefined') module.exports = WriterArte;
