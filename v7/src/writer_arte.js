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
    const chr = w.chr !== undefined ? w.chr : (wild && q > .3 ? pickR(r, CHARS) : null);
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
      fillk: FAM[fam].chrome ? 'chrome' : pickR(r, ['flat', 'flat', 'flat', 'due', 'due', 'fade', r() < .1 ? pickR(r, FILLS) : 'flat']),
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
    return { width: .6 + r() * .32, weight: .2 + r() * .12, slant: r() < .45 ? 0 : (r() - .25) * .32, con: r() * .45, bh: r() < .4 ? r() * .35 : 0,
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
  function bodyPath(x, l, e, dx, dy) {
    x.beginPath();
    l.body.forEach(b => { if (b.c) { x.moveTo(b.c[0] + dx + b.r + e, b.c[1] + dy); x.arc(b.c[0] + dx, b.c[1] + dy, b.r + e, 0, PI * 2); } else { const ax = b.a[0] + dx, ay = b.a[1] + dy, bx = b.b[0] + dx, by = b.b[1] + dy, an = Math.atan2(by - ay, bx - ax), rr = b.r + e; x.moveTo(ax + Math.cos(an + PI / 2) * rr, ay + Math.sin(an + PI / 2) * rr); x.arc(ax, ay, rr, an + PI / 2, an + PI * 1.5); x.arc(bx, by, rr, an - PI / 2, an + PI / 2); x.closePath(); } });
  }
  function fillBody(x, l, e, col, dx, dy) { x.fillStyle = col; l.body.forEach(b => { x.beginPath(); if (b.c) x.arc(b.c[0] + (dx || 0), b.c[1] + (dy || 0), b.r + e, 0, PI * 2); else { const ax = b.a[0] + (dx || 0), ay = b.a[1] + (dy || 0), bx = b.b[0] + (dx || 0), by = b.b[1] + (dy || 0), an = Math.atan2(by - ay, bx - ax), rr = b.r + e; x.moveTo(ax + Math.cos(an + PI / 2) * rr, ay + Math.sin(an + PI / 2) * rr); x.arc(ax, ay, rr, an + PI / 2, an + PI * 1.5); x.arc(bx, by, rr, an - PI / 2, an + PI / 2); x.closePath(); } x.fill(); }); }
  // gli schemi di colore: il bozzetto (bianco e rosso), la throwie (nero e bianco), il colore pieno, il cromato
  function bubbleScheme(fam, P, r, q) {
    if (fam === 'throwie') return r() < .7 ? { fill: '#141418', ol: '#f6f4ee', outer: '#141418', d3: '#141418', shine: '#f6f4ee', slit: '#f6f4ee' } : { fill: '#f6f4ee', ol: '#141418', outer: null, d3: '#141418', shine: '#141418', slit: '#141418' };
    if (fam === 'chrome') return r() < .55 ? { fill: '#cfd3d8', ol: '#101012', outer: null, d3: '#101012', shine: '#ffffff', slit: '#101012', thick: 1.6 } : { fill: 'chrome', ol: '#101012', outer: P.k === '#101012' ? null : P.k, d3: '#101012', shine: '#ffffff', slit: '#101012' };
    const k = r();
    if (k < .3) { const c = pickR(r, [P.f[2], '#d8201a', '#1a3a9a', '#101012']); return { fill: '#fbf8f0', ol: c, outer: null, d3: c, shine: c, slit: c }; }   // il bozzetto
    if (P.f && k < .75) return { fill: P.f[1], ol: '#101012', outer: null, d3: r() < .5 ? '#101012' : P.d, shine: '#ffffff', slit: '#101012', thick: 1.4 };   // pieno piatto col nero
    return { fill: P.f[k < .65 ? 0 : 1], fill2: P.f[1], ol: P.o, outer: q > .5 ? P.k : null, d3: P.d, shine: '#ffffff', slit: P.o };
  }
  function bubbleArt(w, P, C, r, Wp, Hp, snap, paths, radii, x) {
    const F = FAM[C.fam], q = C.q, throwUp = w.style === 'throw', S0 = bubbleScheme(C.fam, P, r, q);
    const o = { adv: C.fam === 'throwie' ? .72 : C.fam === 'fat' ? .74 : .8, jit: .1 + (1 - q) * .12, rot: .16 + (1 - q) * .1, bounce: .05 + r() * .06, squash: .95 + r() * .35, slant: (r() - .3) * .25, puff: C.fam === 'fat' || C.fam === 'throwie' ? 1.12 + r() * .1 : 1 + r() * .08 };
    const sloganH = C.slogan && !throwUp ? Hp * .12 : 0, B = bubbleFit(bubbleLayout(w.words || w.aka || 'NINO', o, r), Wp, Hp - sloganH, Hp * .1);
    const u = B.s, ol = Math.max(2, u * (.045 + r() * .02) * (S0.thick || 1)), d3 = u * (.12 + r() * .1) * (q < .3 ? .4 : 1), ang = .6 + r() * .5, dx = Math.cos(ang) * d3, dy = Math.sin(ang) * d3, steps = Math.max(2, Math.round(d3 / 1.2));
    const order = B.L.map((l, i) => i).reverse();   // si disegna da destra: la lettera a sinistra sta sopra quella a destra (così si legge)
    const chromeG = () => { const g = x.createLinearGradient(0, B.box[1], 0, B.box[3]); g.addColorStop(0, '#ffffff'); g.addColorStop(.45, '#c8d0da'); g.addColorStop(.52, '#5a6472'); g.addColorStop(.6, '#9aa4b2'); g.addColorStop(1, '#eef2f6'); return g; };
    const fillCol = c => c === 'chrome' ? chromeG() : c;
    // 1. il riempimento
    const FILL = cv(Wp, Hp), fx = FILL.getContext('2d'); order.forEach(i => fillBody(fx, B.L[i], 0, S0.fill === 'chrome' ? '#c8d0da' : S0.fill));
    x.drawImage(FILL, 0, 0); snap(x.canvas); const pts = []; B.L.forEach(l => l.body.forEach(b => { if (b.c) for (let a = 0; a < 6; a++) pts.push([b.c[0] + Math.cos(a) * b.r * .5, b.c[1] + Math.sin(a) * b.r * .5]); else for (let t = 0; t <= 1; t += .25) pts.push([b.a[0] + (b.b[0] - b.a[0]) * t, b.a[1] + (b.b[1] - b.a[1]) * t]); })); paths.push(pts); radii.push(u * .3);
    // 2. lo sfondo
    const BG = cv(Wp, Hp), bg = BG.getContext('2d');
    if (C.bgk) { background(bg, C.bgk, P, Wp, Hp, r, false); const k = cv(Wp, Hp), kx = k.getContext('2d'); kx.drawImage(BG, 0, 0); kx.drawImage(FILL, 0, 0); x.clearRect(0, 0, Wp, Hp); x.drawImage(k, 0, 0); snap(x.canvas); paths.push(raster(Wp, Hp, 3)); radii.push(Hp * .18); }
    // 3. le lettere: il filo esterno attorno a tutto, poi ognuna col suo blocco 3D pieno, il contorno, il riempimento, le fessure
    const OUT = cv(Wp, Hp), ox = OUT.getContext('2d'); ox.drawImage(BG, 0, 0);
    if (S0.outer) for (let s = 0; s <= steps; s++) B.L.forEach(l => fillBody(ox, l, ol * 2.4, S0.outer, dx * s / steps, dy * s / steps));
    order.forEach(i => { const l = B.L[i]; for (let s = steps; s >= 1; s--) fillBody(ox, l, ol, S0.ol, dx * s / steps, dy * s / steps); });   // il blocco del 3D col suo bordo, dietro a tutto
    order.forEach(i => { const l = B.L[i]; for (let s = steps; s >= 1; s--) fillBody(ox, l, 0, S0.d3, dx * s / steps, dy * s / steps); });
    order.forEach(i => {
      const l = B.L[i];
      if (S0.d3 === S0.ol) { ox.strokeStyle = S0.fill === 'chrome' ? '#fff' : S0.fill; ox.lineWidth = Math.max(1, ol * .35); ox.globalAlpha = .5; bodyPath(ox, l, -ol * .1, dx * .55, dy * .55); ox.stroke(); ox.globalAlpha = 1; }   // la riga del 3D (nel bozzetto)
      fillBody(ox, l, ol, S0.ol, 0, 0); fillBody(ox, l, 0, fillCol(S0.fill), 0, 0);
      if (S0.fill2 && q > .45) { ox.save(); bodyPath(ox, l, 0, 0, 0); ox.clip(); const [a0, b0, a1, b1] = B.box; ox.fillStyle = S0.fill2; ox.beginPath(); ox.moveTo(a0, (b0 + b1) * .58); for (let xx = a0; xx <= a1; xx += u * .35) ox.lineTo(xx, (b0 + b1) * .58 + Math.sin(xx / u * 4) * u * .05); ox.lineTo(a1, b1); ox.lineTo(a0, b1); ox.fill(); ox.restore(); }   // la sfumatura a onda (due colori)
      ox.fillStyle = S0.slit; l.holes.forEach(h => { ox.beginPath(); ox.ellipse(h.c[0], h.c[1], Math.max(ol, h.rx), Math.max(ol, h.ry), h.rot, 0, 7); ox.fill(); });   // i buchi
      ox.strokeStyle = S0.slit; ox.lineWidth = ol * 1.15; ox.lineCap = 'round'; ox.lineJoin = 'round'; l.slits.forEach(sl => { ox.save(); bodyPath(ox, l, -ol * .2, 0, 0); ox.clip(); ox.beginPath(); sl.forEach(([a, b], k) => k ? ox.lineTo(a, b) : ox.moveTo(a, b)); ox.stroke(); ox.restore(); });
      // le luci: un arco e un puntino sul cuscinetto più grande, in alto a sinistra
      const big = l.body.reduce((a, b) => (b.r > a.r ? b : a)), bc = big.c || [(big.a[0] + big.b[0]) / 2, Math.min(big.a[1], big.b[1])];
      ox.strokeStyle = S0.shine; ox.fillStyle = S0.shine; ox.lineWidth = Math.max(1.5, ol * .8); ox.beginPath(); ox.arc(bc[0], bc[1], big.r * .62, PI * 1.08, PI * 1.42); ox.stroke(); ox.beginPath(); ox.arc(bc[0] + Math.cos(PI * 1.55) * big.r * .62, bc[1] + Math.sin(PI * 1.55) * big.r * .62, ol * .7, 0, 7); ox.fill();
      if (C.fam === 'throwie' && r() < .3) doodles(ox, [{ pts: [bc, [bc[0], bc[1] + big.r * .4]] }], big.r * 1.4, r, S0.shine, true, false, r() < .4);
    });
    if (throwUp ? r() < .5 : r() < .3) { const lows = []; B.L.forEach(l => l.body.forEach(b => { const c = b.c || (b.a[1] > b.b[1] ? b.a : b.b); lows.push([c[0], c[1] + b.r]); })); ox.fillStyle = S0.ol; ox.strokeStyle = S0.ol; ox.lineCap = 'round'; for (let k = 0; k < 3 + Math.floor(r() * 4); k++) { const qq = pickR(r, lows), l2 = Hp * (.05 + r() * .14); ox.lineWidth = ol * 1.4; ox.beginPath(); ox.moveTo(qq[0], qq[1]); ox.lineTo(qq[0], qq[1] + l2); ox.stroke(); ox.beginPath(); ox.arc(qq[0], qq[1] + l2, ol * 1.1, 0, 7); ox.fill(); } }   // le colature
    x.clearRect(0, 0, Wp, Hp); x.drawImage(OUT, 0, 0); snap(x.canvas); paths.push(pts.slice()); radii.push(u * .38);
    // 4. i dettagli: la firma, l'anno, lo slogan, qualche stellina
    const [bx0, by0, bx1, by1] = B.box;
    if (q > .6) for (let k = 0; k < 2; k++) sparkle(x, bx0 + r() * (bx1 - bx0), by0 + r() * (by1 - by0) * .3, u * .08, S0.shine === '#141418' ? '#141418' : '#ffffff');
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
    const W = cnv.width, H = cnv.height, x = cnv.getContext('2d'), amp = H * (.0035 + (1 - q) * .009) * (opt && opt.amp != null ? opt.amp : 1);
    // 1. il braccio: tutto si piega un poco, insieme (bilineare)
    const src = x.getImageData(0, 0, W, H), dst = x.createImageData(W, H), S = src.data, D = dst.data, f = warpField(seed, W, H, amp);
    for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
      const [dx, dy] = f(xx, yy), sx = clamp(xx + dx, 0, W - 1.001), sy = clamp(yy + dy, 0, H - 1.001), x0 = sx | 0, y0 = sy | 0, ax = sx - x0, ay = sy - y0, i00 = (y0 * W + x0) * 4, i10 = i00 + 4, i01 = i00 + W * 4, i11 = i01 + 4, o = (yy * W + xx) * 4;
      for (let c = 0; c < 4; c++) D[o + c] = (S[i00 + c] * (1 - ax) + S[i10 + c] * ax) * (1 - ay) + (S[i01 + c] * (1 - ax) + S[i11 + c] * ax) * ay;
    }
    x.putImageData(dst, 0, 0);
    if (opt && opt.noSpray) return cnv;
    // 2. la nebbia: una copia sfocata dietro (lo spray non ha mai il bordo netto come un pennarello)
    const k = cv(W, H), kx = k.getContext('2d'); kx.filter = `blur(${Math.max(1, H * .006).toFixed(1)}px)`; kx.drawImage(cnv, 0, 0); kx.filter = 'none';
    x.save(); x.globalCompositeOperation = 'destination-over'; x.globalAlpha = .7; x.drawImage(k, 0, 0); x.restore();
    // 3. la grana: puntini del colore del bordo, appena fuori
    const r = mulberry(seed ^ 0x3c6ef3), img = x.getImageData(0, 0, W, H).data, n = Math.round(W * H / 90);
    for (let i = 0; i < n; i++) { const px = Math.floor(r() * W), py = Math.floor(r() * H), j = (py * W + px) * 4; if (img[j + 3] < 200) continue; const a = r() * 6.283, d = 1 + r() * H * .012, qx = px + Math.cos(a) * d, qy = py + Math.sin(a) * d, jj = ((qy | 0) * W + (qx | 0)) * 4; if (qx < 0 || qy < 0 || qx >= W || qy >= H || img[jj + 3] > 60) continue; x.fillStyle = `rgba(${img[j]},${img[j + 1]},${img[j + 2]},${(.35 + r() * .5).toFixed(2)})`; x.fillRect(qx, qy, 1 + (r() < .3 ? 1 : 0), 1); }
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
    let cur = 0;
    ids.forEach((i, k) => { const [x0, , x1] = bb[i], w0 = Math.max(1e-3, x1 - x0), narrow = w0 / H < .3, sx = narrow ? 1 : clamp(tw / w0, .7, 1.6), dy = step * (k % 2 ? -1 : 0);
      groups[i].forEach(t => { t.pts = t.pts.map(([a, b]) => [cur + (a - x0) * sx, b + dy]); }); cur += w0 * sx + gap; });
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
    const P = PAL[(w.pal || 0) % PAL.length], r = mulberry(w.seed || 1), Wp = Math.round(w.W * PPM), Hp = Math.round(w.H * PPM), text = w.words || w.aka || 'NINO';
    const C = choose(w), q = C.q, stages = [], paths = [], radii = [];
    const snap = c => { const k = cv(Wp, Hp); k.getContext('2d').drawImage(c, 0, 0); stages.push(handify(k, (w.seed || 1) * 7 + 1, q, { noSpray: w.style === 'mtag' })); };
    const toy = q < .35;
    if (w.style === 'mostro') { const c = cv(Wp, Hp); monsterArt(w, P, r, Wp, Hp, snap, paths, radii, c.getContext('2d')); return { stages, paths, radii, Wp, Hp, C }; }
    if (w.style === 'tag' || w.style === 'mtag' || w.style === 'gotico') {   // la tag: la mano del writer (writer_mano.js), col suo segno accanto
      const c = cv(Wp, Hp), x = c.getContext('2d'), signW = w.sign && w.style !== 'gotico' ? Hp * .7 : 0, d = Object.assign({}, WM.dna(w.hand || w.seed || 1), w.style === 'gotico' ? { goth: true, vert: Hp > Wp * 1.4 } : {});
      const col = w.col || (w.style === 'mtag' ? '#121216' : P.f[1]);
      const res = WM.handTag(x, text, d, Wp - signW, Hp, r, w.style === 'gotico' && !w.col ? '#101012' : col, w.style === 'gotico' ? 'tag' : w.style);
      if (w.sign) sign(x, w.sign, Wp - signW * .55, Hp * .5, signW * .55, w.style === 'mtag' ? '#f2efe6' : col);
      snap(c); paths.push(res.path.filter((q, i) => i % 2 === 0).concat(w.sign ? [[Wp - signW * .55, Hp * .5]] : [])); radii.push(Math.max(res.W * 2.2, Hp * .1));
      return { stages, paths, radii, Wp, Hp, C };
    }
    const c = cv(Wp, Hp), x = c.getContext('2d');
    if (FAM[C.fam] && FAM[C.fam].fat && w.style !== 'wholecar') { bubbleArt(w, P, C, r, Wp, Hp, snap, paths, radii, x); return { stages, paths, radii, Wp, Hp, C }; }   // le lettere a bolla
    const train = w.style === 'wholecar', wild = w.style === 'burner' || train, throwUp = w.style === 'throw', F = FAM[C.fam];
    const charW = C.chr ? Hp * (train ? .95 : .9) : 0, charLeft = !(r() < .3);
    const sloganH = C.slogan && !throwUp ? Hp * .1 : 0;
    // la mano: un toy trema, non sa il 3D, sbaglia gli spessori; un king è pulito, profondo, pieno di dettagli
    const CN0 = w.cons || consOf(w.hand || w.seed || 1), LW = Wp - charW, opts = { font: null, h: 100, adv: F.adv, skew: F.skew * .4 + CN0.slant, bounce: q < .35 ? .04 : 0, rot: q < .35 ? .1 : .02, wob: q < .35 ? .03 : 0, scale: 0, ext: F.ext * .6, links: C.fam === 'wild' && q > .6 ? Math.min(2, F.links) : 0 };
    // lo scheletro: per le famiglie che corrono (semi, wild, corsivo, a spine) è la TAG del writer, ingrassata: il pezzo ha la sua mano
    const handFam = /^(wild|script)$/.test(C.fam);
    let L0;
    if (handFam && WM) {
      const hd = Object.assign({}, WM.dna(w.hand || w.seed || 1), { crown: false, halo: false, under: false, dashes: false, stars: false, quotes: false, swash: C.fam === 'script' || (wild && r() < .5), loop: false, wob: 0, mix: C.fam === 'script' ? .7 : C.fam === 'block' ? 0 : .35, adv: C.fam === 'wild' ? .55 : .62, bigFirst: 1, tall: 1, bounce: 0, arc: 0, wob: 0 });
      const H0 = WM.layout(text, hd, r); L0 = { strokes: H0.strokes.map(t => ({ pts: WM.smooth(t.pts, 3).filter((q, k, a) => k % 2 === 0 || k === a.length - 1).map(([a, b]) => [a * 100, b * 100]), i: t.i, swash: t.swash })), box: H0.box.map(v => v * 100) };
    } else L0 = letters(text, opts, r);
    const CN = w.cons || consOf(w.hand || w.seed || 1);
    L0 = evenOut(L0, C.fam, CN);
    const padK = .6 * F.lw / (1 + 1.2 * F.lw) + .04, L = fit(L0, LW, Hp - sloganH, Hp * padK, train ? 1.6 : wild ? 1.3 : 1.1);
    const ox0 = charLeft ? charW : 0; L.strokes.forEach(t => { t.pts = t.pts.map(([a, b]) => [a + ox0, b]); }); L.box = [L.box[0] + ox0, L.box[1], L.box[2] + ox0, L.box[3]];
    const capH = 100 * L.s, lw = (F.flat || F.fat || F.ink ? F.lw * .5 + CN.weight * .5 : CN.weight * .6 + F.lw * .4) * capH * (train ? 1.1 : 1), ol = Math.max(2, capH * CN.line * (toy ? .7 + r() * .6 : 1)), kl = Math.max(2, capH * .03);
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
        if (cap === 'round') { const o = [], a0 = Math.atan2(a[1] - p[1], a[0] - p[0]); for (let k = 1; k < 6; k++) { const an = a0 - k / 6 * PI; o.push([p[0] + Math.cos(an) * w, p[1] + Math.sin(an) * w]); } return o; }
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
    if (!F.ink && !F.flat) fillPattern(px, throwUp && !F.chrome ? (C.fillk === 'diag' ? 'diag' : 'fade') : C.fillk, P, L.box, lw, Wp, Hp, r);
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
    if (C.bgk) { background(bg, toy && !train ? 'spruzzi' : C.bgk, P, Wp, Hp, r, train); const k = cv(Wp, Hp), kx = k.getContext('2d'); kx.drawImage(BG, 0, 0); kx.drawImage(FILL, 0, 0); x.clearRect(0, 0, Wp, Hp); x.drawImage(k, 0, 0); snap(c); paths.push(raster(Wp, Hp, train ? 6 : 4)); radii.push(Hp * (train ? .13 : .16)); }
    // 3. le lettere vere: la keyline attorno a tutto (3D compreso), il 3D pieno col suo bordo dietro a tutte, poi le lettere in ordine
    const OUT = cv(Wp, Hp), ox = OUT.getContext('2d'); ox.drawImage(BG, 0, 0);
    ox.lineJoin = 'round'; ox.lineCap = 'round';
    const allP = order.flatMap(i => polys[i]);
    if (q > .3 && !throwUp && !F.flat && (P.k && (w.pal < 14 || r() < .3))) { ox.strokeStyle = KL; ox.fillStyle = KL; extrude(ox, allP, KL, 2 * (ol + kl)); strokeL(ox, allP, KL, 2 * (ol + kl)); }   // la keyline attorno a tutto, 3D compreso
    ox.strokeStyle = F.ink ? KL : P.o; extrude(ox, allP, null, 2 * ol);   // il bordo del blocco 3D
    ox.fillStyle = F.ink ? KL : P.d; extrude(ox, allP, null, 0);   // il blocco 3D
    order.forEach(i => {
      ox.lineJoin = J; ox.miterLimit = 1.6; strokeL(ox, polys[i], OL, 2 * ol); ox.lineJoin = 'round';   // il contorno della lettera (sopra il 3D e sopra la lettera prima)
      if (F.hollow) { ox.save(); ox.globalCompositeOperation = 'destination-out'; ox.drawImage(maskOf(i), 0, 0); ox.restore(); if (C.bgk) { ox.save(); ox.globalCompositeOperation = 'destination-over'; ox.restore(); } return; }   // solo contorno: dentro si vede il muro
      const Li = letterImg(i, !F.ink && !F.flat && q > .45 ? shade(P.f[2], -.35) : null, Math.max(1.5, ol * .8)), lc = t1; lc.clearRect(0, 0, Wp, Hp); lc.drawImage(Li, 0, 0);
      lc.globalCompositeOperation = 'source-atop';
      if (q > .5 && !F.flat) { lc.strokeStyle = P.hi; lc.fillStyle = P.hi; lc.lineCap = 'round'; lc.lineWidth = Math.max(1.5, ol * .7); polys[i].slice(0, 1).forEach(pl => { let k0 = 0, best = 1e9; pl.forEach(([a, b], k) => { if (a + b < best) { best = a + b; k0 = k; } }); const a = pl[k0], b = pl[(k0 + 1) % pl.length], cxp = pl.reduce((s0, p) => s0 + p[0], 0) / pl.length, cyp = pl.reduce((s0, p) => s0 + p[1], 0) / pl.length, ix = cxp - a[0], iy = cyp - a[1], il = hyp(ix, iy) || 1, off = ol * 2.4, ex2 = b[0] - a[0], ey2 = b[1] - a[1], el = hyp(ex2, ey2) || 1, len = Math.min(el * .6, lw * .55);
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
