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
  const COL2PAL = [5, 6, 4, 1, 0, 8, 9, 10];

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
    semi: { nome: 'semi-wild', adv: .74, skew: .14, bounce: .05, rot: .12, wob: .025, scale: .14, ext: .32, lw: .28, join: 'miter', cap: 'square', d3: .5, arrows: 2, links: 1 , sh: { flare: .4, bh: .2, con: .3, cap: 'flare', sharp: true } },
    wild: { nome: 'wildstyle', adv: .64, skew: .22, bounce: .1, rot: .32, wob: .04, scale: .3, ext: .62, lw: .24, join: 'miter', cap: 'square', d3: .55, arrows: 4, links: 3 , sh: { flare: .5, bh: .15, con: .35, cap: 'point', sharp: true } },
    spiky: { nome: 'a spine', adv: .7, skew: .14, bounce: .08, rot: .24, wob: .02, scale: .26, ext: .5, lw: .26, join: 'miter', cap: 'butt', d3: .4, arrows: 0, links: 1, spikes: true , sh: { flare: -.45, bh: .1, con: .45, cap: 'point', sharp: true } },
    script: { nome: 'corsivo', adv: .56, skew: .44, bounce: .07, rot: .08, wob: .01, scale: .14, ext: .2, lw: .22, join: 'round', cap: 'round', d3: .32, arrows: 0, links: 0, nibK: .6, swash: true , sh: { flare: -.35, bh: 0, con: .65, cap: 'point', sharp: false, smooth: true } },
    chrome: { nome: 'chrome', adv: .62, skew: .08, bounce: .05, rot: .1, wob: .015, scale: .1, ext: .06, lw: .4, join: 'round', cap: 'round', d3: .25, arrows: 0, links: 0, chrome: true, fat: true },
  };
  const THROW_FAMS = ['throwie', 'throwie', 'fat', 'bubble', 'chrome'];
  const FAMS = Object.keys(FAM);
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
    return { fam, fillk, bgk, chr, q, yr: w.yr || pickR(r, YEARS), slogan: w.slogan !== undefined ? w.slogan : (wild && q > .4 || r() < .2 ? pickR(r, SLOGANS) : null) };
  }
  // IL BOZZETTO: un writer pensa il suo pezzo. dna = { fam, pals, chars, pol (quanto è politico), skill }; tutto il resto lo decide il caso
  function conceive(o) {
    const d = o.dna || {}, seed = o.seed || Math.floor(Math.random() * 1e9), r = mulberry(seed ^ 0x2545f491), style = o.style || 'pezzo';
    const wild = style === 'burner' || style === 'wholecar', throwUp = style === 'throw';
    const q = clamp((d.skill != null ? d.skill : .5) + (r() - .5) * .18, .05, 1);
    let fam = r() < .78 && d.fam ? d.fam : pickR(r, FAMS); if (throwUp && !THROW_FAMS.includes(fam)) fam = pickR(r, THROW_FAMS);
    if (q < .3 && (fam === 'wild' || fam === 'spiky' || fam === 'script')) fam = pickR(r, ['semi', 'bubble', 'block']);   // un toy non sa fare il wildstyle
    const pals = d.pals && d.pals.length ? d.pals : [Math.floor(r() * PAL.length)];
    const pol = d.pol != null ? d.pol : .4;
    const sk = { style, aka: o.aka, crew: o.crew, seed, q, fam, pal: pickR(r, pals) % PAL.length,
      words: wild && r() < pol * .5 ? pickR(r, WORDS) : null,
      slogan: !throwUp && style !== 'tag' && r() < pol * (wild ? 1 : .5) ? pickR(r, SLOGANS) : null,
      chr: wild && q > .3 ? (d.chars && d.chars.length && r() < .8 ? pickR(r, d.chars) : pickR(r, CHARS)) : null,
      fillk: q < .3 ? 'fade' : FAM[fam].chrome ? 'chrome' : pickR(r, FILLS),
      bgk: style === 'wholecar' ? pickR(r, ['sole', 'radici', 'skyline']) : wild ? pickR(r, ['sole', 'radici', 'skyline', 'esplosione', 'ovale']) : throwUp ? (r() < .35 ? pickR(r, ['ovale', 'splat', 'esplosione']) : null) : pickR(r, BADGES),
      yr: pickR(r, YEARS), by: o.by };
    return sk;
  }
  // il DNA di un writer a caso (gli NPC: dal loro numero)
  function dnaOf(seed, skill, crewCol) {
    const r = mulberry(seed ^ 0x9e3779b9), pals = [crewCol != null ? crewCol : Math.floor(r() * PAL.length)];
    while (pals.length < 3) { const k = Math.floor(r() * PAL.length); if (!pals.includes(k)) pals.push(k); }
    return { fam: pickR(r, FAMS), pals, chars: [pickR(r, CHARS), pickR(r, CHARS)], pol: r(), skill: skill != null ? skill : .3 + r() * .6 };
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
    L.strokes.forEach(t => { if (t.pts.length < 2 || t.link || t.swash) return; [[t.pts.length - 1, t.pts.length - 2], [0, 1]].forEach(([i, j], e) => { if (e && r() < .5) return; const a = t.pts[i], b = t.pts[j], dx = a[0] - b[0], dy = a[1] - b[1], l = hyp(dx, dy) || 1, ux = dx / l, uy = dy / l, s = w * .5, len = w * (1.3 + r() * 1.4);
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
    K: { b: [['k', .2, .12, .2, .88, .24], ['c', .64, .76, .25], ['c', .68, .25, .28]], s: [[[.95, .5], [.45, .5]], [[.44, .9], [.44, .62]]] },
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
    if (fam === 'chrome') return { fill: 'chrome', ol: '#101012', outer: P.k === '#101012' ? null : P.k, d3: '#101012', shine: '#ffffff', slit: '#101012' };
    const k = r();
    if (k < .3) { const c = pickR(r, [P.f[2], '#d8201a', '#1a3a9a', '#101012']); return { fill: '#fbf8f0', ol: c, outer: null, d3: c, shine: c, slit: c }; }   // il bozzetto
    return { fill: P.f[k < .65 ? 0 : 1], fill2: P.f[1], ol: P.o, outer: q > .5 ? P.k : null, d3: P.d, shine: '#ffffff', slit: P.o };
  }
  function bubbleArt(w, P, C, r, Wp, Hp, snap, paths, radii, x) {
    const F = FAM[C.fam], q = C.q, throwUp = w.style === 'throw', S0 = bubbleScheme(C.fam, P, r, q);
    const o = { adv: C.fam === 'throwie' ? .72 : C.fam === 'fat' ? .74 : .8, jit: .1 + (1 - q) * .12, rot: .16 + (1 - q) * .1, bounce: .05 + r() * .06, squash: .95 + r() * .35, slant: (r() - .3) * .25, puff: C.fam === 'fat' || C.fam === 'throwie' ? 1.12 + r() * .1 : 1 + r() * .08 };
    const sloganH = C.slogan && !throwUp ? Hp * .12 : 0, B = bubbleFit(bubbleLayout(w.words || w.aka || 'NINO', o, r), Wp, Hp - sloganH, Hp * .1);
    const u = B.s, ol = Math.max(2, u * (.045 + r() * .02)), d3 = u * (.12 + r() * .1) * (q < .3 ? .4 : 1), ang = .6 + r() * .5, dx = Math.cos(ang) * d3, dy = Math.sin(ang) * d3, steps = Math.max(2, Math.round(d3 / 1.2));
    const order = B.L.map((l, i) => i); if (r() < .4) order.reverse();   // da sinistra sopra o da destra sopra
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

  // ================= IL LAVORO =================
  const PPM = 100;   // pixel per metro (alto: i bordi netti anche da vicino)
  // i punti dei tratti, uno ogni step pixel, lettera dopo lettera: il percorso della mano
  function densify(strokes, step) { const out = []; strokes.forEach(t => { for (let k = 0; k < t.pts.length; k++) { const a = t.pts[k], b = t.pts[k + 1]; out.push(a); if (!b) continue; const l = hyp(b[0] - a[0], b[1] - a[1]), n = Math.floor(l / step); for (let j = 1; j < n; j++) out.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]); } }); return out; }
  function raster(Wp, Hp, rows) { const out = [], dy = Hp / rows; for (let k = 0; k < rows; k++) { const y = dy * (k + .5), L = k % 2 ? [Wp, 0] : [0, Wp]; for (let j = 0; j <= 16; j++) out.push([L[0] + (L[1] - L[0]) * j / 16, y + (j % 2 ? dy * .3 : -dy * .3)]); } return out; }
  // la penna larga: il tratto ripassato tre volte lungo la punta inclinata (i verticali più grossi degli orizzontali)
  function pen(x, strokes, arrowsL, w, col, dx, dy, J, Cp, nib) {
    if (!nib) { pass(x, { strokes, arrows: arrowsL, w0: w }, w, col, dx, dy, J, Cp); return; }
    const a = -.8, ux = Math.cos(a) * w * nib, uy = Math.sin(a) * w * nib, w2 = w * (1 - nib * .55);
    for (const k of [-1, 0, 1]) pass(x, { strokes, arrows: k ? [] : arrowsL, w0: w2 }, w2, col, (dx || 0) + ux * k, (dy || 0) + uy * k, J, Cp);
  }
  function art(w) {
    const P = PAL[(w.pal || 0) % PAL.length], r = mulberry(w.seed || 1), Wp = Math.round(w.W * PPM), Hp = Math.round(w.H * PPM), text = w.words || w.aka || 'NINO';
    const C = choose(w), q = C.q, stages = [], paths = [], radii = [];
    const snap = c => { const k = cv(Wp, Hp); k.getContext('2d').drawImage(c, 0, 0); stages.push(k); };
    const toy = q < .35;
    if (w.style === 'tag' || w.style === 'mtag') {   // la tag: la mano del writer (writer_mano.js), col suo segno accanto
      const c = cv(Wp, Hp), x = c.getContext('2d'), signW = w.sign ? Hp * .7 : 0, d = WM.dna(w.hand || w.seed || 1);
      const col = w.col || (w.style === 'mtag' ? '#121216' : P.f[1]);
      const res = WM.handTag(x, text, d, Wp - signW, Hp, r, col, w.style);
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
    const LW = Wp - charW, opts = { font: WM ? WM.fontFor(WM.dna(w.hand || w.seed || 1)) : null, h: 100, adv: F.adv, skew: F.skew, bounce: F.bounce, rot: F.rot * (.6 + q * .6), wob: F.wob + (1 - q) * .045, scale: F.scale, ext: F.ext * (.3 + q * .9), links: wild && q > .5 ? F.links : Math.min(1, F.links) };
    const padK = .6 * F.lw / (1 + 1.2 * F.lw) + .04, L = fit(letters(text, opts, r), LW, Hp - sloganH, Hp * padK, train ? 1.6 : wild ? 1.3 : 1.1);
    const ox0 = charLeft ? charW : 0; L.strokes.forEach(t => { t.pts = t.pts.map(([a, b]) => [a + ox0, b]); }); L.box = [L.box[0] + ox0, L.box[1], L.box[2] + ox0, L.box[3]];
    const lw = F.lw * 100 * L.s * (train ? 1.12 : 1), ol = Math.max(2.5, lw * (throwUp ? .24 : .2) * (toy ? .7 + r() * .6 : 1)), kl = Math.max(2, lw * .16);
    const d3 = throwUp ? Math.max(2, lw * F.d3 * .6) : Math.max(toy ? 1 : 3, lw * F.d3 * (toy ? .3 : .55 + q * .55)), ang3 = F.chrome ? .9 : .78, dx = d3 * Math.cos(ang3), dy = d3 * Math.sin(ang3), steps = Math.max(1, Math.round(d3 / 1.5));
    if (F.swash) swash(L, r);
    if (F.arrows && !throwUp && q > .3) arrows(L, r, Math.round(F.arrows * q) + Math.floor(r() * 2), lw); else { L.arrows = []; L.w0 = lw; }
    if (F.spikes) spikes(L, r, lw);
    // IL CORPO DELLE LETTERE: ogni tratto diventa una sagoma (poligono) a spessore variabile; le lettere sono sagome, non tubi
    const SH = F.sh || { flare: .2, bh: .2, con: .25, cap: 'square', sharp: true }, nibA = -.9 + r() * .5;
    const [lbx0, lby0, lbx1, lby1] = L.box, lbh = Math.max(1, lby1 - lby0);
    const wfn = (t, p, a) => lw * Math.max(.25, (1 + SH.flare * Math.pow(Math.abs(2 * t - 1), 3)) * (1 + SH.bh * ((p[1] - lby0) / lbh - .5)) * (1 - SH.con + SH.con * Math.abs(Math.sin(a - nibA)) * 1.3));
    const jit = (1 - q) * lw * .05 + lw * .008;
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
        const cap = t.swash || (SH.cap === 'flare' && r() < .5) ? 'point' : SH.cap;
        if (cap === 'point') return [[p[0] + d[0] * w * (1.6 + r()), p[1] + d[1] * w * (1.6 + r())]];
        if (cap === 'round') { const o = [], a0 = Math.atan2(a[1] - p[1], a[0] - p[0]); for (let k = 1; k < 6; k++) { const an = a0 - k / 6 * PI; o.push([p[0] + Math.cos(an) * w, p[1] + Math.sin(an) * w]); } return o; }
        if (cap === 'flare') return [[a[0] + d[0] * w * .5 - d[1] * w * .25, a[1] + d[1] * w * .5 + d[0] * w * .25], [p[0] + d[0] * w * .9, p[1] + d[1] * w * .9], [b[0] + d[0] * w * .3, b[1] + d[1] * w * .3]];
        return [[a[0] + d[0] * w * .55, a[1] + d[1] * w * .55], [b[0] + d[0] * w * .55, b[1] + d[1] * w * .55]];   // il taglio dritto (block)
      };
      let poly = Lf.concat(capOf(true), Rt.reverse(), capOf(false));
      let area = 0; for (let k = 0; k < poly.length; k++) { const p0 = poly[k], p1 = poly[(k + 1) % poly.length]; area += p0[0] * p1[1] - p1[0] * p0[1]; } if (area < 0) poly = poly.reverse();
      return poly;
    };
    const groups = []; L.strokes.forEach(t => { (groups[t.i] = groups[t.i] || []).push(t); }); const order = groups.map((g, i) => i).filter(i => groups[i]);
    if (C.fam === 'wild' && q > .5) for (let k = 0; k + 1 < order.length; k++) if (r() < .35) { const t = order[k]; order[k] = order[k + 1]; order[k + 1] = t; k++; }
    const arrOf = i => (L.arrows || []).filter(a => { const tip = a[1]; let best = -1, bd = 1e9; L.strokes.forEach(t => { const e = t.pts[t.pts.length - 1], d = hyp(e[0] - tip[0], e[1] - tip[1]); if (d < bd) { bd = d; best = t.i; } }); return best === i; });
    const polys = []; order.forEach(i => { polys[i] = groups[i].map(strokePoly).concat(arrOf(i).map(a => { let p = a.slice(); let ar = 0; for (let k = 0; k < 3; k++) { const p0 = p[k], p1 = p[(k + 1) % 3]; ar += p0[0] * p1[1] - p1[0] * p0[1]; } return ar < 0 ? p.reverse() : p; })); });
    const pathOf = (list, dx, dy) => { const P2 = new Path2D(); list.forEach(pl => { pl.forEach(([a, b], k) => k ? P2.lineTo(a + (dx || 0), b + (dy || 0)) : P2.moveTo(a + (dx || 0), b + (dy || 0))); P2.closePath(); }); return P2; };
    // l'estrusione esatta del 3D: per ogni lato della sagoma il quadrilatero fino alla copia spostata, più la copia
    const extrudeOf = (list) => { const P2 = new Path2D(); list.forEach(pl => { for (let k = 0; k < pl.length; k++) { const a = pl[k], b = pl[(k + 1) % pl.length]; P2.moveTo(a[0], a[1]); P2.lineTo(b[0], b[1]); P2.lineTo(b[0] + dx, b[1] + dy); P2.lineTo(a[0] + dx, a[1] + dy); P2.closePath(); } pl.forEach(([a, b], k) => k ? P2.lineTo(a + dx, b + dy) : P2.moveTo(a + dx, b + dy)); P2.closePath(); }); return P2; };
    const LP = [], EP = []; order.forEach(i => { LP[i] = pathOf(polys[i]); EP[i] = extrudeOf(polys[i]); });
    // i colori: le throwie a inchiostro (nero pieno, bordo bianco, filo nero fuori); il block pesante col riempimento chiaro
    const inkFill = F.ink ? (r() < .75 ? '#141418' : shade(P.f[2], -.55)) : null, OL = F.ink ? '#f6f4ee' : P.o, KL = F.ink ? '#141418' : P.k;
    const PAT = cv(Wp, Hp), px = PAT.getContext('2d'); px.fillStyle = inkFill || P.f[1]; px.fillRect(0, 0, Wp, Hp);
    if (!F.ink) fillPattern(px, throwUp && !F.chrome ? (C.fillk === 'diag' ? 'diag' : 'fade') : C.fillk, P, L.box, lw, Wp, Hp, r);
    const fillIn = (ctx, i) => { ctx.save(); ctx.clip(LP[i], 'nonzero'); ctx.drawImage(PAT, 0, 0); ctx.restore(); };
    // la seconda linea: la sagoma erosa (intersezione di 8 copie spostate) riempita col motivo, sopra la sagoma piena del colore della linea
    const M1 = cv(Wp, Hp), m1 = M1.getContext('2d'), M2 = cv(Wp, Hp), m2 = M2.getContext('2d');
    const fillInLine = (ctx, i, col, m) => {
      m1.clearRect(0, 0, Wp, Hp); m1.fillStyle = '#fff'; m1.fill(LP[i]);
      m2.globalCompositeOperation = 'source-over'; m2.clearRect(0, 0, Wp, Hp); m2.drawImage(M1, 0, 0); m2.globalCompositeOperation = 'destination-in';
      for (let k = 0; k < 8; k++) m2.drawImage(M1, Math.cos(k * PI / 4) * m, Math.sin(k * PI / 4) * m);
      m2.globalCompositeOperation = 'source-in'; m2.drawImage(PAT, 0, 0); m2.globalCompositeOperation = 'source-over';
      ctx.save(); ctx.fillStyle = col; ctx.fill(LP[i]); ctx.restore(); ctx.drawImage(M2, 0, 0);
    };
    const J = SH.sharp ? 'miter' : 'round';
    // 1. il riempimento (un writer riempie per primo)
    const FILL = cv(Wp, Hp), fx = FILL.getContext('2d'); order.forEach(i => fillIn(fx, i));
    x.drawImage(FILL, 0, 0); snap(c); paths.push(densify(order.flatMap(i => groups[i]), lw * .5)); radii.push(lw * .75);
    // 2. lo sfondo (dietro alle lettere)
    const BG = cv(Wp, Hp), bg = BG.getContext('2d');
    if (C.bgk) { background(bg, toy && !train ? 'spruzzi' : C.bgk, P, Wp, Hp, r, train); const k = cv(Wp, Hp), kx = k.getContext('2d'); kx.drawImage(BG, 0, 0); kx.drawImage(FILL, 0, 0); x.clearRect(0, 0, Wp, Hp); x.drawImage(k, 0, 0); snap(c); paths.push(raster(Wp, Hp, train ? 6 : 4)); radii.push(Hp * (train ? .13 : .16)); }
    // 3. le lettere vere: la keyline attorno a tutto, il 3D pieno dietro a tutte, poi ogni lettera col suo contorno e il suo riempimento
    const OUT = cv(Wp, Hp), ox = OUT.getContext('2d'); ox.drawImage(BG, 0, 0); ox.lineJoin = J; ox.miterLimit = 3;
    ox.lineJoin = 'round';
    if (q > .3 && !throwUp) { ox.strokeStyle = KL; ox.lineWidth = 2 * (ol + kl); order.forEach(i => { ox.stroke(LP[i]); ox.stroke(EP[i]); }); ox.fillStyle = KL; order.forEach(i => { ox.fill(LP[i]); ox.fill(EP[i]); }); }
    ox.strokeStyle = OL; ox.lineWidth = 2 * ol; order.forEach(i => ox.stroke(EP[i])); ox.lineJoin = J; ox.miterLimit = 2;
    ox.fillStyle = F.ink ? KL : P.d; order.forEach(i => ox.fill(EP[i]));
    order.forEach(i => {
      ox.strokeStyle = OL; ox.lineWidth = 2 * ol; ox.stroke(LP[i]);
      if (!F.ink && q > .45) fillInLine(ox, i, shade(P.f[2], -.35), Math.max(1.5, ol * .8)); else fillIn(ox, i);
      ox.save(); ox.clip(LP[i]);
      // le luci: tocchi bianchi lungo il bordo in alto a sinistra di ogni lettera (mai una riga in mezzo)
      if (q > .5) { ox.strokeStyle = P.hi; ox.lineCap = 'round'; ox.lineWidth = Math.max(1.5, ol * .7); polys[i].slice(0, 1).forEach(pl => { let k0 = 0, best = 1e9; pl.forEach(([a, b], k) => { if (a + b < best) { best = a + b; k0 = k; } }); const a = pl[k0], b = pl[(k0 + 1) % pl.length], cxp = pl.reduce((s0, p) => s0 + p[0], 0) / pl.length, cyp = pl.reduce((s0, p) => s0 + p[1], 0) / pl.length, ix = cxp - a[0], iy = cyp - a[1], il = hyp(ix, iy) || 1, off = ol * 2.2, ex = b[0] - a[0], ey = b[1] - a[1], el = hyp(ex, ey) || 1, len = Math.min(el * .6, lw * .55);
        ox.beginPath(); ox.moveTo(a[0] + ix / il * off, a[1] + iy / il * off); ox.lineTo(a[0] + ix / il * off + ex / el * len, a[1] + iy / il * off + ey / el * len); ox.stroke(); ox.fillStyle = P.hi; ox.beginPath(); ox.arc(a[0] + ix / il * off + ex / el * (len + ol * 2.2), a[1] + iy / il * off + ey / el * (len + ol * 2.2), ol * .6, 0, 7); ox.fill(); }); }
      if (F.doodles && q > .25) doodles(ox, groups[i], lw, r, F.ink ? '#f6f4ee' : P.hi, F.ink, F.stars, F.ink && i === order[Math.floor(order.length / 2)] && r() < .45);
      ox.restore();
    });
    if (throwUp || toy || r() < .3) drips(ox, L, r, F.ink ? (r() < .5 ? '#f6f4ee' : '#141418') : throwUp ? P.o : P.f[2], lw * .3, throwUp ? 6 : toy ? 7 : 3, Hp * (toy ? .22 : .16));
    x.clearRect(0, 0, Wp, Hp); x.drawImage(OUT, 0, 0); snap(c); paths.push(densify(order.flatMap(i => groups[i]), lw * .6)); radii.push(lw * .6 + ol * 2 + d3 * .5);
    // 4. i dettagli: stelline, il personaggio, la firma della crew, l'anno, lo slogan
    for (let k = 0; k < Math.round((wild ? 4 : 2) * q); k++) { const t = pickR(r, L.strokes), qq = t.pts[0]; sparkle(x, qq[0], qq[1] - lw * .3, lw * (.35 + r() * .3), P.hi); }
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
