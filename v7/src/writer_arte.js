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
  const FONT = () => (typeof Graffiti !== 'undefined' && Graffiti.F) || {};
  const WM = typeof WriterMano !== 'undefined' ? WriterMano : (typeof require !== 'undefined' ? require('./writer_mano.js') : null);
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  // tutte le tele del disegno restano in memoria (willReadFrequently): il lavoro si legge pixel per pixel a ogni tappa, e una tela
  // sulla GPU costringe ogni volta ad aspettare la scheda video e a riportare indietro l'immagine (il blocco camminando)
  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); c.getContext('2d', { willReadFrequently: true }); return c; };
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
  const MOD = [14, 14, 14, 15, 15, 16, 17, 18, 19, 19, 20, 21, 22, 23, 24, 25, 26, 27];
  const COL2PAL = [19, 21, 20, 26, 23, 18, 17, 24];

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
  const FLATS = ['#9ad8e8', '#e86a9a', '#d8201a', '#b48ad8', '#f2d23a', '#f2efe6', '#5ac8a0', '#ff8a3a', '#cfd3d8'];
  const THROW_FAMS = ['throwie', 'throwie', 'chrome', 'chrome', 'fat', 'bubble'];
  const FAMS = Object.keys(FAM);
  // le famiglie di oggi, coi loro pesi (il wildstyle con le frecce e il bubble arcobaleno sono rari)
  const MODFAMS = ['piatto', 'piatto', 'piatto', 'contorno', 'contorno', 'block', 'block', 'heavy', 'semi', 'semi', 'script', 'astratto', 'astratto', 'astratto', 'bubble', 'wild', 'spiky'];
  const FILLS = ['flat', 'flat', 'due', 'due', 'fade', 'fade', 'diag', 'split', 'bolle', 'crepe', 'fiamme', 'scacchi', 'stelle'];
  const BGS = ['nuvola', 'sole', 'radici', 'skyline', 'spruzzi', 'ghiaccio', 'ovale', 'scacchi', 'esplosione', 'splat'];
  const BADGES = ['ovale', 'ovale', 'scacchi', 'esplosione', 'splat', 'nuvola', 'spruzzi', 'ghiaccio'];
  const CHARS = ['bboy', 'skater', 'sole', 'banchiere', 'grigio', 'boombox'];
  const WORDS = ['DISGELO', 'SOLE', 'RADICI', 'RESPIRA', 'LIBERI', 'PEDALA', 'CALDO', 'VAPORE'];
  const SLOGANS = ['IL GHIACCIO SI SPACCA', 'NO ALLE RATE', 'PEDALA E RESPIRA', 'SOLE PER TUTTI', 'LA STRADA E NOSTRA', 'GRIGI GO HOME', 'LAVORA CONSUMA PAGA? NO',
    'RADICI SOTTO L\'ASFALTO', 'PORTO VECCHIO VIVE', 'IL DISGELO E QUI', 'PIU BICI MENO RATE', 'NIENTE MARTIRI SOLO COLORI', 'IL VAPORE E DI TUTTI'];
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
  function path(x, pts) { x.beginPath(); pts.forEach(([a, b], k) => k ? x.lineTo(a, b) : x.moveTo(a, b)); }
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
  function sparkle(x, cx, cy, s, col) { x.save(); x.fillStyle = col; x.beginPath(); for (let k = 0; k < 8; k++) { const a = k * PI / 4, rr = k % 2 ? s * .22 : s; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); x.fill(); x.restore(); }
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
  function cloud(x, W, H, r, col, edge, k) {
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
      if (full) { const n = 10 + Math.floor(r() * 6); bg.save(); for (let k = 0; k < n; k++) { const a = Wp * (k + r() * .6) / n, b = Hp * (.92 + r() * .08), rr = Hp * (.07 + r() * .07); bg.fillStyle = P.o; bg.beginPath(); bg.arc(a, b, rr + 3, 0, 7); bg.fill(); bg.fillStyle = P.k; bg.beginPath(); bg.arc(a, b, rr, 0, 7); bg.fill(); } bg.restore(); } else bg.restore();
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
    } else cloud(bg, Wp, Hp, r, P.bg, P.o, 0);
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
  // il campo è morbido (onde lunghe metà del lavoro): lo si calcola su una griglia rada e lo si interpola, e lo si tiene per
  // tutte le tappe dello stesso lavoro (stesso seme, stessa misura). Prima era sin/cos per ogni pixel: secondi di blocco.
  const WARP_G = 8; let warpMemo = null;
  function warpGrid(seed, W, H, amp) {
    const key = seed + ':' + W + ':' + H + ':' + amp; if (warpMemo && warpMemo.key === key) return warpMemo;
    const f = warpField(seed, W, H, amp), gw = Math.ceil(W / WARP_G) + 2, gh = Math.ceil(H / WARP_G) + 2, gx = new Float32Array(gw * gh), gy = new Float32Array(gw * gh);
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) { const d = f(i * WARP_G, j * WARP_G); gx[j * gw + i] = d[0]; gy[j * gw + i] = d[1]; }
    return (warpMemo = { key, gw, gx, gy });
  }
  function handify(cnv, seed, q, opt) {
    const W = cnv.width, H = cnv.height, x = cnv.getContext('2d'), amp = H * (.0035 + (1 - q) * .009) * (opt && opt.amp != null ? opt.amp : 1);
    // 1. il braccio: tutto si piega un poco, insieme (bilineare)
    const src = x.getImageData(0, 0, W, H), dst = x.createImageData(W, H), S = src.data, D = dst.data, wg = warpGrid(seed, W, H, amp), gw = wg.gw, GX = wg.gx, GY = wg.gy, W4 = W * 4, rg = mulberry(seed ^ 0x2b7e15), ph1 = rg() * 7, ph2 = rg() * 7, ph3 = rg() * 7, spray = !(opt && opt.noSpray);
    for (let yy = 0; yy < H; yy++) {
      const gj = (yy / WARP_G) | 0, fy = yy / WARP_G - gj, r0 = gj * gw, r1 = r0 + gw;
      for (let xx = 0; xx < W; xx++) {
        const gi = (xx / WARP_G) | 0, fx = xx / WARP_G - gi, a = r0 + gi, b = r1 + gi;
        const dx = (GX[a] * (1 - fx) + GX[a + 1] * fx) * (1 - fy) + (GX[b] * (1 - fx) + GX[b + 1] * fx) * fy;
        const dy = (GY[a] * (1 - fx) + GY[a + 1] * fx) * (1 - fy) + (GY[b] * (1 - fx) + GY[b + 1] * fx) * fy;
        let sx = xx + dx, sy = yy + dy; sx = sx < 0 ? 0 : sx > W - 1.001 ? W - 1.001 : sx; sy = sy < 0 ? 0 : sy > H - 1.001 ? H - 1.001 : sy;
        const x0 = sx | 0, y0 = sy | 0, i00 = (y0 * W + x0) * 4, i10 = i00 + 4, i01 = i00 + W4, i11 = i01 + 4;
        if (!(S[i00 + 3] | S[i10 + 3] | S[i01 + 3] | S[i11 + 3])) continue;   // tutto trasparente: resta trasparente
        const ax = sx - x0, ay = sy - y0, w00 = (1 - ax) * (1 - ay), w10 = ax * (1 - ay), w01 = (1 - ax) * ay, w11 = ax * ay, o = (yy * W + xx) * 4;
        D[o] = S[i00] * w00 + S[i10] * w10 + S[i01] * w01 + S[i11] * w11;
        D[o + 1] = S[i00 + 1] * w00 + S[i10 + 1] * w10 + S[i01 + 1] * w01 + S[i11 + 1] * w11;
        D[o + 2] = S[i00 + 2] * w00 + S[i10 + 2] * w10 + S[i01 + 2] * w01 + S[i11 + 2] * w11;
        D[o + 3] = S[i00 + 3] * w00 + S[i10 + 3] * w10 + S[i01 + 3] * w01 + S[i11 + 3] * w11;
        if (spray && D[o + 3] > 8) {   // [writer] la vernice copre a nuvole (passate più cariche e più scariche), la grana fine, qualche buco dove si vede il muro
          const cl = Math.sin(xx * .021 + ph1) * Math.sin(yy * .029 + ph2) + Math.sin((xx + yy * .7) * .013 + ph3) * .6, gr = rg() - .5, mm = 1 + cl * .045 + gr * .07;
          D[o] = Math.min(255, D[o] * mm); D[o + 1] = Math.min(255, D[o + 1] * mm); D[o + 2] = Math.min(255, D[o + 2] * mm);
          if (rg() < .003) D[o + 3] *= .35; else if (cl < -1.1) D[o + 3] *= .9;
        }
      }
    }
    x.putImageData(dst, 0, 0);
    if (opt && opt.noSpray) return cnv;
    { const k0 = cv(W, H), k0x = k0.getContext('2d'); k0x.filter = `blur(${Math.max(.45, H * .0022).toFixed(2)}px)`; k0x.drawImage(cnv, 0, 0); x.clearRect(0, 0, W, H); x.drawImage(k0, 0, 0); }   // [writer] niente bordi da vettoriale: lo spray ammorbidisce sempre un filo
    // 2. la nebbia: una copia sfocata dietro (lo spray non ha mai il bordo netto come un pennarello)
    const k = cv(W, H), kx = k.getContext('2d'); kx.filter = `blur(${Math.max(1, H * .006).toFixed(1)}px)`; kx.drawImage(cnv, 0, 0); kx.filter = 'none';
    x.save(); x.globalCompositeOperation = 'destination-over'; x.globalAlpha = .75; x.drawImage(k, 0, 0); x.restore();
    { const m2 = cv(W, H), mx2 = m2.getContext('2d'); mx2.filter = `blur(${Math.max(2, H * .02).toFixed(1)}px)`; mx2.drawImage(cnv, 0, 0); x.save(); x.globalCompositeOperation = 'destination-over'; x.globalAlpha = .2; x.drawImage(m2, 0, 0); x.restore(); }   // [writer] la nebbia larga dell'overspray
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
  function blockGlyph(ch, t, w) {
    const P = [], R = (x0, y0, x1, y1) => P.push([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
    const D = (x0, y0, x1, y1, th) => { const dx = x1 - x0, dy = y1 - y0, l = hyp(dx, dy) || 1, nx = -dy / l * th / 2, ny = dx / l * th / 2; P.push([[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]]); };
    const th = Math.min(t, .22), m = .5 - th / 2, h2 = t / 2;   // le barre orizzontali un po' più sottili delle aste: i buchi restano aperti anche nelle lettere pesanti
    switch (ch) {
      case 'A': R(0, t * .9, t, 1); R(w - t, t * .9, w, 1); R(0, 0, w, th); R(0, m + .04, w, m + .04 + th); break;
      case 'B': R(0, 0, t, 1); R(0, 0, w - t * .45, th); R(0, m, w, m + th); R(0, 1 - th, w, 1); R(w - t * 1.35, 0, w - t * .35, m + th); R(w - t, m, w, 1); break;
      case 'C': R(0, 0, t, 1); R(0, 0, w, th); R(0, 1 - th, w, 1); break;
      case 'D': R(0, 0, t, 1); R(0, 0, w - t * .7, th); R(0, 1 - th, w - t * .7, 1); R(w - t, t * .7, w, 1 - t * .7); D(w - t * .9, t * .5, w - t * .4, t * 1.05, t * .9); D(w - t * .9, 1 - t * .5, w - t * .4, 1 - t * 1.05, t * .9); break;
      case 'E': R(0, 0, t, 1); R(0, 0, w, th); R(0, m, w * .82, m + th); R(0, 1 - th, w, 1); break;
      case 'F': R(0, 0, t, 1); R(0, 0, w, th); R(0, m, w * .82, m + th); break;
      case 'G': R(0, 0, t, 1); R(0, 0, w, th); R(0, 1 - th, w, 1); R(w - t, m, w, 1); R(w * .48, m, w, m + th); break;
      case 'H': R(0, 0, t, 1); R(w - t, 0, w, 1); R(0, m, w, m + th); break;
      case 'I': R(0, 0, t, 1); break;
      case 'J': R(w - t, 0, w, 1); R(0, 1 - th, w, 1); R(0, .55, t, 1); break;
      case 'K': R(0, 0, t, 1); D(t * .6, .56, w - h2 * .8, h2 * .8, t * 1.05); D(t * .6, .44, w - h2 * .8, 1 - h2 * .8, t * 1.05); break;
      case 'L': R(0, 0, t, 1); R(0, 1 - th, w, 1); break;
      case 'M': R(0, 0, t, 1); R(w - t, 0, w, 1); R(0, 0, w, th); R(w / 2 - t / 2, 0, w / 2 + t / 2, .72); break;
      case 'N': R(0, 0, t, 1); R(w - t, 0, w, 1); D(h2, h2 * .6, w - h2, 1 - h2 * .6, t * 1.15); break;
      case 'O': case '0': R(0, 0, t, 1); R(w - t, 0, w, 1); R(0, 0, w, th); R(0, 1 - th, w, 1); break;
      case 'P': R(0, 0, t, 1); R(0, 0, w, th); R(w - t, 0, w, m + th); R(0, m, w, m + th); break;
      case 'Q': R(0, 0, t, 1); R(w - t, 0, w, 1); R(0, 0, w, th); R(0, 1 - th, w, 1); D(w * .55, .7, w + t * .45, 1.12, t * .9); break;
      case 'R': R(0, 0, t, 1); R(0, 0, w, th); R(w - t, 0, w, m + th); R(0, m, w, m + th); D(w * .5, m + t * .6, w - h2, 1 - h2 * .4, t * 1.05); break;
      case 'S': R(t * .35, 0, w, th); R(0, 0, t, m + th); R(0, m, w, m + th); R(w - t, m, w, 1); R(0, 1 - th, w - t * .35, 1); break;
      case 'T': R(0, 0, w, th); R(w / 2 - t / 2, 0, w / 2 + t / 2, 1); break;
      case 'U': R(0, 0, t, 1); R(w - t, 0, w, 1); R(0, 1 - th, w, 1); break;
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
    const hollow = !!F.hollow, heavy = C.fam === 'heavy';
    const t = clamp(CN.weight * (heavy ? 1.35 : hollow ? .95 : 1.12), .18, heavy ? .4 : hollow ? .26 : .33), wL = Math.max(clamp(CN.width, .58, .92), 2 * clamp(CN.weight * (heavy ? 1.35 : hollow ? .95 : 1.12), .18, heavy ? .4 : hollow ? .26 : .33) + .24), sl = CN.slant, gap = clamp(CN.gap * .7, .05, .14);
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
    const ol = Math.max(2, S * CN.line * (hollow ? .8 : 1.05)), d3 = hollow || C.fam === 'piatto' && r() < .45 ? 0 : S * d3k * (heavy ? 1.3 : 1), dx = Math.cos(ang) * d3, dy = Math.sin(ang) * d3;
    const toPx = (l, [u, v]) => { const c = Math.cos(l.rot), sn = Math.sin(l.rot), a = (u - l.w / 2) * l.sc, b = (v - .6) * l.sc, U = l.w / 2 + a * c - b * sn, V = .6 + a * sn + b * c; return [ox0 + (l.x0 + U + (1 - V) * sl) * S, oy0 + (V + l.dy) * S]; };
    const NF = noiseField(Wp, Hp, (w.seed || 1) * 3 + 7, Math.max(8, S * .45)), rough = .12 + (1 - q) * .1;   // lo spray: la linea che ingrossa e si assottiglia piano lungo il tratto (la mano rallenta, accelera)
    // le maschere delle lettere (con gli angoli scelti dal writer)
    const spA = -.9 + rs() * .5, spSet = new Set(sys.split ? [Math.floor(rs() * L.length), Math.floor(rs() * L.length)] : []);
    const masks = L.map((l, li) => { const m = cv(Wp, Hp), mx = m.getContext('2d'); mx.fillStyle = '#fff'; l.polys.forEach(pl => { mx.beginPath(); pl.forEach((p, k) => { const [a, b] = toPx(l, p); k ? mx.lineTo(a, b) : mx.moveTo(a, b); }); mx.closePath(); mx.fill(); });
      if (spSet.has(li)) { const [cx, cy] = toPx(l, [l.w * (.35 + rs() * .3), .3 + rs() * .4]), ca = Math.cos(spA), sa = Math.sin(spA); mx.globalCompositeOperation = 'destination-out'; mx.strokeStyle = '#000'; mx.lineWidth = Math.max(2, ol * .9); mx.beginPath(); mx.moveTo(cx - ca * S, cy - sa * S); mx.lineTo(cx + ca * S, cy + sa * S); mx.stroke(); mx.globalCompositeOperation = 'source-over'; } return corner > 0 ? blurThresh(m, corner * t * S, .5) : m; });   // il taglio: la lettera spezzata in due piastre, il contorno ci passa in mezzo
    const tintC = (src, col) => { const k = cv(Wp, Hp), kx = k.getContext('2d'); kx.drawImage(src, 0, 0); kx.globalCompositeOperation = 'source-in'; if (col instanceof HTMLCanvasElement) kx.drawImage(col, 0, 0); else { kx.fillStyle = col; kx.fillRect(0, 0, Wp, Hp); } kx.globalCompositeOperation = 'source-over'; return k; };   // il contesto torna normale: chi ci disegna sopra dopo non cancella niente
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
    if (!hollow && q > .35 && r() < .75) o.drawImage(tintC(grow(EXTo, S * (.045 + CN.line * .6)), KL), 0, 0);   // il bordo: chiude il pezzo in una sagoma sola
    if (d3 > 0) { o.drawImage(tintC(EXTo, OL), 0, 0); const E2 = cv(Wp, Hp), e2 = E2.getContext('2d'); for (let k = 1; k <= n3; k++) e2.drawImage(ALL, dx * k / n3, dy * k / n3); o.drawImage(tintC(E2, shade(D3, -.3)), 0, 0); [[.6, 0], [.3, .16]].forEach(([fr, sh]) => { const E3 = cv(Wp, Hp), e3 = E3.getContext('2d'), nk = Math.max(1, Math.round(n3 * fr)); for (let k = 1; k <= nk; k++) e3.drawImage(ALL, dx * k / n3, dy * k / n3); o.drawImage(tintC(E3, shade(D3, sh)), 0, 0); }); }   // il 3D con la luce: chiaro vicino alla lettera, scuro in fondo
    if (sys.fx && !hollow) { const bb = [1e9, 1e9, -1e9, -1e9]; L.forEach(l => l.polys.flat().forEach(p => { const [a, b] = toPx(l, p); bb[0] = Math.min(bb[0], a); bb[1] = Math.min(bb[1], b); bb[2] = Math.max(bb[2], a); bb[3] = Math.max(bb[3], b); }));   // fuori: le bolle, le stelle, i segni, le linee di velocità (dietro alle lettere)
      const bub = (a, b, R) => { o.fillStyle = OL; o.beginPath(); o.arc(a, b, R + ol, 0, 7); o.fill(); o.fillStyle = P.f[0]; o.beginPath(); o.arc(a, b, R, 0, 7); o.fill(); o.fillStyle = '#fff'; o.beginPath(); o.arc(a - R * .35, b - R * .35, R * .22, 0, 7); o.fill(); };
      if (sys.fx & 1) { for (let k = 0; k < 2 + rs() * 3; k++) { const top0 = rs() < .5, a = bb[0] + (bb[2] - bb[0]) * rs(), b = top0 ? bb[1] - S * (.04 + rs() * .1) : bb[3] + S * (.02 + rs() * .1); bub(a, Math.max(S * .1, Math.min(Hp - S * .1, b)), S * (.025 + rs() * .045)); } }
      if (sys.fx & 2) { o.strokeStyle = OL; o.lineCap = 'round'; o.lineWidth = Math.max(2, ol * .8); for (let k = 0; k < 3; k++) { const y = bb[1] + (bb[3] - bb[1]) * (.3 + k * .18), x1 = bb[0] - S * .05, x0 = Math.max(ol * 2, x1 - S * (.15 + rs() * .2) * (k === 1 ? 1.5 : 1)); o.beginPath(); o.moveTo(x0, y); o.lineTo(x1, y); o.stroke(); }
        for (let k = 0; k < 2; k++) { const a = bb[2] + S * (.04 + rs() * .1), b = bb[1] + (bb[3] - bb[1]) * rs() * .5, z = S * .05; o.beginPath(); o.moveTo(a - z, b); o.lineTo(a + z, b); o.moveTo(a, b - z); o.lineTo(a, b + z); o.stroke(); } }
      sparkle(o, bb[0] + (bb[2] - bb[0]) * (.15 + rs() * .7), bb[1] - S * .02, S * .1, P.hi); }
    [...masks.keys()].reverse().forEach(i => {
      const m = masks[i];
      if (!hollow) { o.save(); o.globalAlpha = .3; o.filter = `blur(${(ol * 1.6).toFixed(1)}px)`; o.drawImage(tintC(grow(m, ol * 1.4), P.f[1]), 0, 0); o.restore(); }   // la nebbia del riempimento che scappa fuori
      const LN = grow(m, ol, rough, NF); o.save(); o.filter = 'blur(.6px)'; o.drawImage(tintC(LN, OL), 0, 0); o.restore();   // il contorno, chiuso, morbido sul bordo come lo spray
      { const RG = grow(LN, ol * 1.6), rg = RG.getContext('2d'); rg.globalCompositeOperation = 'destination-out'; rg.drawImage(LN, 0, 0); const MI = cv(Wp, Hp), mi = MI.getContext('2d'), rs = mulberry((w.seed || 1) * 31 + i);   // la polvere: puntini fini solo a ridosso della linea
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
    const P = PAL[(w.pal || 0) % PAL.length], r = mulberry(w.seed || 1), TK = (/^(tag|mtag|gotico)$/.test(w.style) || w.rec) && w.surf !== 'treno' ? (w.rec ? Math.max(1, Math.min(3, 1600 / Math.max(1, w.W * 100))) : 3) : 1, Wp = Math.round(w.W * PPM * TK), Hp = Math.round(w.H * PPM * TK),   /* [writer] la tag a tre volte la risoluzione: il filo del marker e le punte si vedono */ text = w.words || w.aka || 'NINO';
    const C = choose(w), q = C.q, stages = [], paths = [], radii = [];
    const snap = c => { const k = cv(Wp, Hp); k.getContext('2d').drawImage(c, 0, 0); stages.push(handify(k, (w.seed || 1) * 7 + 1, q, { noSpray: w.style === 'mtag' || (w.rec && w.tool === 'pennarello'), amp: w.rec ? .25 : undefined })); };
    const toy = q < .35;
    if (w.rec) { const c = cv(Wp, Hp), x = c.getContext('2d'), res = WM.drawRecorded(x, w.rec, Object.assign({}, WM.dna(w.hand || w.seed || 1)), Wp, Hp, r, w.col || '#141418', w.tool === 'pennarello' ? 'mtag' : 'tag'); snap(c); paths.push(res.path.filter((q, i) => i % 3 === 0)); radii.push(Math.max(res.W * 2.2, Hp * .08)); return { stages, paths, radii, Wp, Hp, C, ppm: PPM * TK }; }   // [writer] il disegno fatto alla tavoletta
    if (w.style === 'mostro') { const c = cv(Wp, Hp); monsterArt(w, P, r, Wp, Hp, snap, paths, radii, c.getContext('2d')); return { stages, paths, radii, Wp, Hp, C }; }
    if (w.style === 'tag' || w.style === 'mtag' || w.style === 'gotico') {   // la tag: la mano del writer (writer_mano.js), col suo segno accanto
      const c = cv(Wp, Hp), x = c.getContext('2d'), signW = w.sign && w.style !== 'gotico' ? Hp * .7 : 0, d = Object.assign({}, WM.dna(w.hand || w.seed || 1), w.style === 'gotico' ? { goth: true, vert: Hp > Wp * 1.4 } : {});
      const col = w.col || (w.style === 'mtag' ? '#121216' : P.f[1]);
      const res = WM.handTag(x, text, d, Wp - signW, Hp, r, w.style === 'gotico' && !w.col ? '#101012' : col, w.style === 'gotico' ? 'tag' : w.style);
      if (w.sign) sign(x, w.sign, Wp - signW * .55, Hp * .5, signW * .55, w.style === 'mtag' ? '#f2efe6' : col);
      snap(c); paths.push(res.path.filter((q, i) => i % 2 === 0).concat(w.sign ? [[Wp - signW * .55, Hp * .5]] : [])); radii.push(Math.max(res.W * 2.2, Hp * .1));
      return { stages, paths, radii, Wp, Hp, C, ppm: PPM * TK };
    }
    const c = cv(Wp, Hp), x = c.getContext('2d');
    if (/^(block|heavy|piatto|contorno|astratto)$/.test(C.fam) && w.style !== 'throw' && w.style !== 'wholecar') { blockArt(w, P, C, r, Wp, Hp, snap, paths, radii, x); return { stages, paths, radii, Wp, Hp, C }; }   // le lettere blockbuster
    if (FAM[C.fam] && (FAM[C.fam].fat && w.style !== 'wholecar' || /^(block|heavy|semi|wild|spiky|piatto|astratto)$/.test(C.fam) && w.style !== 'throw')) { bubbleArt(w, P, C, r, Wp, Hp, snap, paths, radii, x); SQ = 0; CUT = 0; return { stages, paths, radii, Wp, Hp, C }; }   // [writer] le bolle, e i pezzi costruiti sulle bolle   // le lettere a bolla
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
    const tint = (src, col, dst) => { const d = dst || t1; d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, Wp, Hp); d.drawImage(src, 0, 0); d.globalCompositeOperation = 'source-in'; if (col instanceof HTMLCanvasElement) d.drawImage(col, 0, 0); else { d.fillStyle = col; d.fillRect(0, 0, Wp, Hp); } d.globalCompositeOperation = 'source-over'; return d.canvas; };
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
    if (cloudPZ) { bg.save(); bg.translate(Wp * .08, Hp * .14); cloud(bg, Wp * .84, Hp * .72, r, cloudPZ, P.o, 0); bg.restore(); const k = cv(Wp, Hp), kx = k.getContext('2d'); kx.drawImage(BG, 0, 0); kx.drawImage(FILL, 0, 0); x.clearRect(0, 0, Wp, Hp); x.drawImage(k, 0, 0); snap(c); paths.push(raster(Wp, Hp, 4)); radii.push(Hp * .16); }
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
  return { PAL, COL2PAL, FAM, FAMS, FILLS, BGS, CHARS, WORDS, SLOGANS, SIGNS, SIGN_TXT, PPM, art, choose, conceive, dnaOf, crossOut, letters, mulberry };
})();
if (typeof module !== 'undefined') module.exports = WriterArte;
