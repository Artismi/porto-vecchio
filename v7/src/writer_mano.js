/* Porto Vecchio — la mano dei writer (v7, «Writer»): l'handstyle, la tag vera. Solo canvas 2D.
   - L'ALFABETO: ogni lettera in due varianti (la maiuscola dritta e la sua forma «di mano»: minuscola, arricciata, con
     l'asta lunga), tratti di punti in una casella alta 1 (0 la linea di base, sotto zero le discendenti, sopra 1 le aste).
   - LA MANO (dna): l'inclinazione, la larghezza, la punta (marker a scalpello o spray), l'angolo della punta, quanto mischia
     maiuscole e minuscole, la prima lettera grande, il rimbalzo, l'arco della parola, lo svolazzo finale, le decorazioni
     (corona, aureola, sottolineatura col puntino, trattini ai lati, stelline, virgolette), le colature. Ogni writer ha la sua
     e la sua tag gli viene sempre uguale; due writer non firmano mai allo stesso modo.
   - IL TRATTO: la punta larga si trascina lungo il percorso (quadrilateri fra un punto e il successivo): i tratti di traverso
     alla punta sono grossi, quelli lungo la punta sottili, come col marker vero; le estremità si assottigliano (la pressione).
     Lo spray ha l'alone e la grana, il marker ha la goccia d'inchiostro dove si appoggia e cola.
   Si usa da writer_arte.js: per le tag (handTag) e come scheletro delle lettere dei pezzi (fontFor). */
var WriterMano = (function () {
  'use strict';
  const hyp = Math.hypot, PI = Math.PI, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const pickR = (r, a) => a[Math.floor(r() * a.length)];

  // ---------------- L'ALFABETO ----------------
  // [variante dritta, variante di mano]; un tratto di un solo punto è un puntino
  const A = {
    A: [[[[0, 0], [.3, 1], [.6, 0]], [[.1, .42], [.52, .46]]], [[[.5, .55], [.3, .65], [.08, .45], [.12, .1], [.35, 0], [.5, .25]], [[.5, .66], [.5, .08], [.64, 0]]]],
    B: [[[[0, 0], [0, 1]], [[0, 1], [.35, 1], [.5, .86], [.45, .62], [0, .55]], [[0, .55], [.48, .5], [.6, .26], [.45, 0], [0, 0]]], [[[.06, 1.18], [0, 0]], [[0, .32], [.25, .6], [.5, .45], [.5, .15], [.25, 0], [0, .1]]]],
    C: [[[[.58, .86], [.36, 1], [.1, .86], [0, .5], [.1, .12], [.36, 0], [.6, .15]]], [[[.46, .56], [.26, .63], [.05, .42], [.1, .08], [.32, 0], [.52, .14]]]],
    D: [[[[0, 0], [0, 1]], [[0, 1], [.3, .96], [.55, .72], [.58, .3], [.35, .03], [0, 0]]], [[[.5, 1.18], [.5, 0], [.64, .05]], [[.5, .45], [.28, .62], [.05, .42], [.1, .08], [.32, 0], [.5, .2]]]],
    E: [[[[.56, 1], [0, 1], [0, 0], [.6, 0]], [[0, .52], [.42, .52]]], [[[.52, .9], [.3, 1], [.08, .86], [.15, .6], [.38, .52]], [[.38, .52], [.05, .42], [0, .15], [.25, 0], [.58, .12]]]],
    F: [[[[.6, 1], [0, 1], [0, -.05]], [[0, .52], [.42, .52]]], [[[.62, 1.05], [.36, 1.12], [.2, .9], [.15, -.12], [0, -.24]], [[0, .5], [.46, .55]]]],
    G: [[[[.58, .86], [.36, 1], [.08, .86], [0, .5], [.1, .12], [.36, 0], [.58, .15], [.6, .45], [.32, .45]]], [[[.5, .5], [.28, .63], [.06, .42], [.12, .15], [.35, .12], [.5, .35]], [[.5, .62], [.5, -.2], [.3, -.38], [.04, -.25]]]],
    H: [[[[0, 0], [0, 1]], [[.6, 0], [.6, 1]], [[0, .52], [.6, .52]]], [[[0, 1.18], [0, 0]], [[0, .35], [.25, .6], [.5, .5], [.55, .2], [.62, 0]]]],
    I: [[[[.3, 0], [.3, 1]], [[.05, 1], [.55, 1]], [[.05, 0], [.55, 0]]], [[[.2, .66], [.22, 0], [.34, .04]], [[.21, .94]]]],
    J: [[[[.6, 1], [.6, .2], [.45, 0], [.15, 0], [0, .2]]], [[[.42, .66], [.44, -.2], [.26, -.4], [0, -.3]], [[.43, .94]]]],
    K: [[[[0, 0], [0, 1]], [[.6, 1], [0, .45], [.62, 0]]], [[[0, 1.18], [0, 0]], [[.5, .66], [.05, .3], [.58, 0]]]],
    L: [[[[0, 1], [0, 0], [.6, 0]]], [[[.26, 1.18], [.05, .2], [.15, 0], [.62, .06]]]],
    M: [[[[0, 0], [0, 1], [.3, .45], [.6, 1], [.6, 0]]], [[[0, 0], [0, .62]], [[0, .45], [.15, .62], [.3, .45], [.3, 0]], [[.3, .45], [.45, .62], [.6, .45], [.62, 0]]]],
    N: [[[[0, 0], [0, 1], [.6, 0], [.6, 1]]], [[[0, 0], [0, .63]], [[0, .4], [.25, .63], [.5, .5], [.56, 0]]]],
    O: [[[[.3, 1], [.05, .86], [0, .45], [.1, .1], [.3, 0], [.55, .12], [.62, .5], [.52, .88], [.3, 1]]], [[[.3, .63], [.08, .5], [.05, .2], [.25, 0], [.5, .12], [.55, .42], [.3, .63]]]],
    P: [[[[0, -.05], [0, 1]], [[0, 1], [.4, 1], [.6, .8], [.55, .55], [.35, .45], [0, .45]]], [[[0, .63], [0, -.36]], [[0, .45], [.25, .63], [.5, .45], [.45, .12], [.2, .05], [0, .15]]]],
    Q: [[[[.3, 1], [.05, .86], [0, .45], [.1, .1], [.3, 0], [.55, .12], [.62, .5], [.52, .88], [.3, 1]], [[.38, .22], [.7, -.1]]], [[[.5, .5], [.28, .63], [.06, .42], [.12, .15], [.35, .12], [.5, .35]], [[.5, .62], [.5, -.36], [.66, -.26]]]],
    R: [[[[0, 0], [0, 1]], [[0, 1], [.4, 1], [.6, .8], [.55, .58], [.3, .48], [0, .48]], [[.25, .48], [.62, 0]]], [[[0, 0], [0, .63]], [[0, .4], [.2, .6], [.46, .63]]]],
    S: [[[[.58, .86], [.4, 1], [.12, .98], [0, .8], [.1, .6], [.5, .42], [.6, .18], [.42, 0], [.12, 0], [0, .15]]], [[[.5, .56], [.25, .63], [.08, .5], [.25, .32], [.45, .2], [.4, .02], [.08, 0]]]],
    T: [[[[0, 1], [.6, 1]], [[.3, 1], [.3, 0]]], [[[.25, 1.08], [.22, .1], [.35, 0], [.52, .08]], [[0, .62], [.56, .66]]]],
    U: [[[[0, 1], [0, .25], [.15, 0], [.45, 0], [.6, .25], [.6, 1]]], [[[0, .63], [.02, .15], [.2, 0], [.45, .1], [.5, .63]], [[.5, .63], [.52, 0], [.64, .05]]]],
    V: [[[[0, 1], [.3, 0], [.6, 1]]], [[[0, .63], [.25, 0], [.55, .66], [.68, .76]]]],
    W: [[[[0, 1], [.15, 0], [.3, .55], [.45, 0], [.6, 1]]], [[[0, .63], [.14, 0], [.3, .4], [.46, 0], [.62, .66]]]],
    X: [[[[0, 0], [.6, 1]], [[0, 1], [.6, 0]]], [[[0, .63], [.56, 0]], [[.56, .63], [0, -.06]]]],
    Y: [[[[0, 1], [.3, .5], [.6, 1]], [[.3, .5], [.3, 0]]], [[[0, .63], [.1, .2], [.3, .15], [.5, .63]], [[.5, .63], [.48, -.25], [.3, -.42], [.04, -.3]]]],
    Z: [[[[0, 1], [.6, 1], [0, 0], [.6, 0]]], [[[0, .63], [.56, .63], [0, 0], [.58, 0]], [[.12, .32], [.46, .32]]]],
  };
  const FB = () => (typeof Graffiti !== 'undefined' && Graffiti.F) || {};
  const DEACC = s => String(s).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9!?.\- ']/g, '');

  // ---------------- LA MANO ----------------
  function dna(seed) {
    const r = mulberry((seed || 1) ^ 0x7f4a7c15);
    return {
      seed, slant: -.1 + r() * .6, wide: .75 + r() * .55, nibA: -.25 - r() * .9, nibW: (r() < .5 ? .13 : .18) + r() * .1, contrast: .45 + r() * .5,
      mix: r() < .3 ? 0 : r() * .8, bigFirst: r() < .55 ? 1.25 + r() * .35 : 1, bounce: r() * .14, arc: (r() - .5) * .3, adv: .5 + r() * .3,
      flick: r() < .7, swash: r() < .4, loop: r() < .3, tall: r() < .35 ? 1.2 + r() * .3 : 1,
      crown: r() < .07, halo: r() < .1, under: r() < .4, dashes: r() < .12, stars: r() < .08, quotes: r() < .1, drip: r() < .55,
      spray: r() < .5, grain: .3 + r() * .7, wob: .005 + r() * .02,
      st: pickR(r, ['calli', 'stampatello', 'corsivo', 'spigoloso', 'spray', 'veloce', 'libera', 'libera']), st2: r(),
    };
  }
  // [writer] LE FAMIGLIE DI MANO: la stessa tag cambia carattere a seconda di chi la fa
  const STILI = {
    grog: { nibW: .2, contrast: .9, nibA: -.7, spray: false, drip: true, hs: { slant: .42, tall: 1.6, drop: .45, adv: .8, over: 1.5, acc: .55, accK: '=' } },   // il marker alto e tirato dei fogli Bombing Science
    calli: { hs: { slant: .38, tall: 1.35, adv: .86, hook: true, acc: .35, over: 1.2 }, nibW: .26, contrast: .95, nibA: -.62, slant: .3, wide: 1.15, adv: .74, swash: true, flick: true, mix: .35, connect: true, bounce: .04, spray: false },   // calligrafica a punta larga
    stampatello: { hs: { slant: .16, tall: 1.05, drop: .15, adv: .95, hook: false, acc: .15, under: true }, nibW: .3, contrast: .4, slant: .02, wide: .95, mix: 0, swash: false, flick: false, under: true, drip: true, bounce: .02, arc: 0, tall: 1, bigFirst: 1.1 },   // stampatello grosso che cola
    corsivo: { hs: { slant: .36, tall: 1.5, drop: .4, adv: .84, acc: .2 }, nibW: .17, contrast: .7, slant: .34, wide: 1.05, mix: .95, loop: true, connect: true, swash: true, bounce: .1, tall: 1.35 },   // corsivo legato, le aste lunghe
    spigoloso: { hs: { slant: .45, tall: 1.45, adv: .78, acc: .5, accK: '||' }, nibW: .18, contrast: .85, slant: .45, wide: .72, adv: .62, angular: true, flick: true, swash: false, bounce: .06, mix: .2 },   // spigoloso e stretto, le lettere si toccano
    spray: { hs: { slant: .22, tall: 1.15, adv: .92, acc: .1 }, nibW: .32, contrast: .25, spray: true, grain: 1, slant: .15, wide: 1.1, drip: true, flick: true, mix: .3 },   // spray grasso con l'alone
    veloce: { hs: { slant: .42, tall: 1.6, drop: .45, adv: .82, acc: .45, accK: '=' }, nibW: .11, contrast: .5, wob: .035, slant: .42, wide: 1.25, under: true, swash: true, flick: true, bounce: .12, mix: .6, scratch: true },   // veloce, sottile, graffiata
  };
  // la lettera di questa mano: la variante la decide la mano (sempre uguale per la stessa lettera nella stessa posizione)
  function glyph(ch, d, i) {
    const g = A[ch]; if (!g) return FB()[ch] || null;
    const k = mulberry((d.seed || 1) * 31 + ch.charCodeAt(0) * 7 + (i === 0 ? 3 : 0))();
    return g[i === 0 && d.bigFirst > 1 ? 0 : (k < d.mix ? 1 : 0)];
  }
  // lo scheletro per i pezzi (writer_arte.js letters): un alfabeto come Graffiti.F, con le varianti di questa mano
  function fontFor(d) {
    const out = Object.assign({}, FB());
    Object.keys(A).forEach(ch => { const k = mulberry((d.seed || 1) * 31 + ch.charCodeAt(0) * 7)(); out[ch] = A[ch][k < (d.mix || 0) * .6 ? 1 : 0]; });
    return out;
  }

  // ---------------- IL TRATTO ----------------
  // Catmull-Rom: il tratto ammorbidito, n punti fra un punto e l'altro
  function smooth(pts, n) {
    if (pts.length < 3) { if (pts.length < 2) return pts.slice(); const out = []; for (let j = 0; j <= n; j++) out.push([pts[0][0] + (pts[1][0] - pts[0][0]) * j / n, pts[0][1] + (pts[1][1] - pts[0][1]) * j / n]); return out; }
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let j = 0; j < n; j++) { const t = j / n, t2 = t * t, t3 = t2 * t; out.push([.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3), .5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]); }
    }
    out.push(pts[pts.length - 1]); return out;
  }
  // [writer] le curve tese e gli angoli a punta: il tratto si spezza dove gira di colpo (cuspide) e ogni pezzo si ammorbidisce da sé
  function smoothC(pts, n) {
    if (pts.length < 3) return smooth(pts, n);
    const out = []; let seg = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      seg.push(pts[i]);
      if (i < pts.length - 1) { const a = pts[i - 1], b = pts[i], c = pts[i + 1], ux = b[0] - a[0], uy = b[1] - a[1], vx = c[0] - b[0], vy = c[1] - b[1], dot = (ux * vx + uy * vy) / ((hyp(ux, uy) * hyp(vx, vy)) || 1);
        if (dot < -.15) { const sm = smooth(seg, n); if (out.length) sm.shift(); out.push(...sm); seg = [b]; } }
    }
    const sm = smooth(seg, n); if (out.length) sm.shift(); out.push(...sm); return out;
  }
  // la punta larga trascinata lungo il percorso: un quadrilatero per segmento, tutti in un tracciato solo (niente giunture più scure)
  function chisel(x, pts, W, ang, taper0, taper1, contrast) {
    if (pts.length < 2) { x.beginPath(); x.arc(pts[0][0], pts[0][1], W * .5, 0, 7); x.fill(); return; }
    const nx = Math.cos(ang) * W / 2, ny = Math.sin(ang) * W / 2, L = pts.length - 1, base = Math.max(1, W * (taper1 > 1 ? .1 : .16));
    x.beginPath();
    for (let i = 0; i < L; i++) {
      const a = pts[i], b = pts[i + 1], t0 = i / L, t1 = (i + 1) / L;
      const p = t => Math.min(1, taper0 ? Math.min(1, (taper0 > 1 ? .22 : .35) + t / (taper0 > 1 ? .14 : .2)) : 1, taper1 ? Math.min(1, (taper1 > 1 ? .04 : .15) + (1 - t) / (taper1 > 1 ? .32 : .25)) : 1);   // 2 = la punta affilata dell'handstyle
      // il contrasto: dove il tratto corre lungo la punta resta il filo sottile (base), mai zero
      const s0 = p(t0), s1 = p(t1);
      const k = 1;   // la sezione la fa la geometria della punta
      x.moveTo(a[0] - nx * s0 * k, a[1] - ny * s0 * k); x.lineTo(a[0] + nx * s0 * k, a[1] + ny * s0 * k); x.lineTo(b[0] + nx * s1 * k, b[1] + ny * s1 * k); x.lineTo(b[0] - nx * s1 * k, b[1] - ny * s1 * k); x.closePath();
    }
    x.fill();
    // il filo: anche dove la punta corre di taglio resta una linea
    const cut = taper1 > 1 ? Math.floor(L * .12) : 0;   // il filo non arriva in fondo: la punta resta affilata
    x.save(); x.lineWidth = base; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = x.fillStyle; x.beginPath(); pts.slice(0, pts.length - cut).forEach((q, i) => i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1])); x.stroke(); x.restore();
  }

  // ---------------- L'HANDSTYLE (la ricerca) ----------------
  // Dai fogli degli alfabeti (Bombing Science × GROG, DEEJ, i fogli a pennarello) e dai muri e dai furgoni taggati:
  //  1. l'inclinazione forte e sempre uguale (20–30°): la mano corre in avanti;
  //  2. le aste esagerate: le lettere strette e alte, le aste che salgono oltre la riga e le gambe che scendono sotto, a ritmo
  //     (la prima lettera grande, poi alta-bassa), mai tutte uguali come un carattere da stampa;
  //  3. le lettere strette che si toccano e si accavallano (lo spazio negativo è poco, la parola è un blocco);
  //  4. le traverse che sforano: tagliano la lettera e arrivano dentro quella vicina;
  //  5. l'attacco e l'uscita: il tratto parte con un uncino (la punta che si appoggia) e finisce a frusta, a punta;
  //  6. niente rette morte: ogni asta ha l'arco del polso, le curve sono tese e gli angoli a punta (cuspidi), non arrotondati;
  //  7. gli accenti: «=» e «||» nei vuoti, il punto, il punto esclamativo, la frustata sotto che torna indietro;
  //  8. la punta a scalpello: grosso dove il tratto va di traverso alla punta, un filo dove ci corre lungo.
  // Le lettere: x da 0 a ~.6, y 0 la riga di base, 1 l'altezza; ogni lettera in due o tre forme, la mano ne sceglie una
  // e la rifà sempre uguale.
  const HS = {
    A: [[[[0, 0], [.16, .55], [.33, 1], [.44, .52], [.55, 0]], [[-.02, .4], [.58, .5]]],
      [[[0, 0], [.14, .55], [.3, 1], [.42, .55], [.5, .02], [.62, .1]], [[.6, .5], [.25, .38], [.06, .46], [.22, .58]]],
      [[[.55, .04], [.52, .5], [.4, 1], [.22, .66], [.05, .26], [.16, .04], [.38, .2], [.6, .46]]]],
    B: [[[[.04, 1.02], [0, 0]], [[-.04, .98], [.38, 1], [.5, .84], [.4, .64], [.1, .56], [.5, .48], [.6, .24], [.44, .03], [-.02, 0]]],
      [[[0, 0], [.02, 1]], [[-.08, .92], [.3, 1.03], [.5, .9], [.42, .66], [.12, .55], [.56, .42], [.5, .08], [.18, 0], [-.04, .1]]]],
    C: [[[[.55, .84], [.42, .99], [.18, .95], [.03, .6], [.05, .2], [.24, 0], [.5, .04], [.63, .2]]],
      [[[.4, .76], [.56, .9], [.44, 1.02], [.2, .95], [.03, .55], [.1, .13], [.34, 0], [.64, .12]]]],
    D: [[[[.03, 1.02], [0, 0]], [[-.06, .98], [.3, .98], [.55, .76], [.58, .32], [.38, .05], [-.02, 0]]],
      [[[0, 0], [.04, 1.02], [.42, .9], [.6, .5], [.46, .12], [.12, 0], [-.08, .16]]]],
    E: [[[[.58, 1], [.06, .99], [.02, .5], [0, 0], [.62, .02]], [[-.04, .52], [.44, .55]]],
      [[[.56, .9], [.36, 1.02], [.1, .93], [.13, .68], [.4, .55], [.1, .49], [0, .24], [.15, .02], [.45, 0], [.64, .14]]],
      [[[.6, 1.02], [.04, .98]], [[.0, 1.0], [.0, 0], [.64, 0]], [[-.06, .5], [.48, .56]]]],
    F: [[[[.62, 1.04], [.05, 1], [0, -.06]], [[-.06, .5], [.46, .55]]],
      [[[.66, 1.06], [.32, 1.02], [.15, .9], [.1, .4], [0, -.28]], [[-.12, .48], [.5, .58]]]],
    G: [[[[.56, .86], [.4, 1], [.15, .95], [0, .55], [.08, .15], [.3, 0], [.55, .08], [.6, .42], [.3, .45]]],
      [[[.55, .9], [.35, 1], [.08, .8], [.05, .42], [.25, .26], [.5, .4], [.56, .72], [.53, -.18], [.3, -.42], [0, -.3]]]],
    H: [[[[0, 1], [0, 0]], [[.55, 1], [.56, 0]], [[-.06, .48], [.62, .54]]],
      [[[0, 1.02], [0, 0]], [[.5, 1.08], [.58, -.06]], [[-.1, .44], [.66, .6]]]],
    I: [[[[.2, 1], [.18, 0]]], [[[0, 1], [.44, 1.03]], [[.22, 1], [.2, 0]], [[-.02, 0], [.42, .03]]]],
    J: [[[[0, 1], [.62, 1.03]], [[.44, 1.01], [.42, .02], [.26, -.25], [0, -.16]]],
      [[[.5, 1], [.48, .1], [.35, -.1], [.1, -.05], [0, .15]]]],
    K: [[[[0, 1], [0, 0]], [[.56, 1], [.05, .45], [.62, 0]]],
      [[[0, 1.02], [0, 0]], [[.56, 1.02], [.04, .48]], [[.16, .56], [.64, -.02]]]],
    L: [[[[.05, 1], [0, 0], [.62, .02]]], [[[.12, 1.02], [0, .08], [.1, 0], [.4, .05], [.66, 0]]]],
    M: [[[[0, 0], [.03, 1], [.3, .38], [.57, 1], [.6, 0]]], [[[0, 0], [.05, .9], [.17, .99], [.28, .4], [.4, .95], [.54, .96], [.6, 0]]]],
    N: [[[[0, 0], [0, 1], [.55, 0], [.57, 1]]], [[[0, 0], [.02, .95], [.12, .99], [.5, 0], [.62, 1.05]]]],
    O: [[[[.32, 1], [.06, .8], [0, .35], [.2, 0], [.48, .05], [.6, .45], [.48, .9], [.22, 1], [.06, .84]]],
      [[[.42, .96], [.16, .92], [.02, .5], [.14, .06], [.4, 0], [.58, .3], [.5, .8], [.28, 1.02], [.62, 1.1]]]],
    P: [[[[0, 1], [0, 0]], [[-.04, .98], [.44, .98], [.56, .75], [.4, .55], [0, .5]]],
      [[[0, 1], [0, -.26]], [[-.06, .94], [.4, 1.02], [.58, .8], [.45, .55], [.05, .52]]]],
    Q: [[[[.32, 1], [.06, .8], [0, .35], [.2, 0], [.48, .05], [.6, .45], [.48, .9], [.22, 1], [.06, .84]], [[.32, .3], [.72, -.14]]]],
    R: [[[[0, 1], [0, 0]], [[-.04, .98], [.44, .98], [.55, .75], [.4, .55], [.05, .5], [.25, .48], [.62, 0]]],
      [[[0, 0], [0, 1]], [[-.06, .94], [.45, 1.02], [.52, .75], [.1, .52], [.68, -.06]]]],
    S: [[[[.56, .88], [.4, 1], [.12, .95], [.02, .78], [.15, .6], [.42, .45], [.58, .25], [.45, .03], [.15, 0], [0, .12]]],
      [[[.6, .96], [.3, 1.02], [.06, .86], [.2, .62], [.5, .4], [.48, .1], [.22, -.02], [-.04, .06]]]],
    T: [[[[-.02, 1], [.62, 1.02]], [[.3, 1], [.29, 0]]], [[[-.06, .9], [.2, 1.02], [.66, 1]], [[.33, 1], [.28, .14], [.4, 0]]]],
    U: [[[[0, 1], [0, .25], [.15, 0], [.42, 0], [.56, .25], [.56, 1]]], [[[0, 1], [.02, .2], [.2, 0], [.45, .15], [.52, 1], [.56, 0]]]],
    V: [[[[0, 1], [.28, 0], [.58, 1]]], [[[0, 1], [.25, 0], [.45, .6], [.66, 1.05]]]],
    W: [[[[0, 1], [.13, 0], [.3, .65], [.45, 0], [.6, 1]]], [[[0, 1], [.14, 0], [.3, .55], [.44, 0], [.5, .6], [.66, 1.04]]]],
    X: [[[[0, 1], [.6, 0]], [[.6, 1], [0, 0]]], [[[0, 1], [.66, -.04]], [[.58, 1.02], [.3, .5], [-.04, -.04]]]],
    Y: [[[[0, 1], [.3, .5], [.6, 1]], [[.3, .5], [.3, 0]]], [[[0, 1], [.25, .45]], [[.6, 1], [.22, -.3], [0, -.2]]]],
    Z: [[[[0, 1], [.6, 1], [0, 0], [.62, 0]]], [[[0, .96], [.6, 1], [0, 0], [.64, .02]], [[.1, .5], [.5, .5]]]],
    '!': [[[[.1, 1.05], [.04, .3]], [[.02, 0]]]],
  };
  // la mano dell'handstyle: le misure della ricerca, ogni writer le sue
  function hsHand(d) {
    const r = mulberry((d.seed || 1) ^ 0x51ed27);
    return Object.assign({
      slant: .25 + r() * .22, tall: 1.15 + r() * .45, drop: .2 + r() * .35, wide: .9 + r() * .3, adv: .84 + r() * .12, bow: (r() - .5) * .14,
      hook: r() < .6, over: .6 + r() * .9, acc: r() < .7 ? .2 + r() * .45 : 0, accK: pickR(r, ['=', '=', '||', '.', '//']), rise: (r() - .35) * .16,
      first: 1.22 + r() * .45, lastBig: r() < .35, rhythm: .12 + r() * .2, flickE: r() < .8, under: r() < .4, bang: r() < .15,
      dropAt: [Math.floor(r() * 4), Math.floor(r() * 6)],
    }, ...[d.hs || {}].map(o => { const q = {}; for (const k in o) q[k] = typeof o[k] === 'number' ? o[k] * (.88 + r() * .24) : o[k]; return q; }));   // la famiglia dà il carattere, la mano lo varia
  }
  // la parola in handstyle: i tratti (in unità di lettera, y in giù), con le aste, le traverse che sforano, gli uncini, le
  // cuspidi, gli accenti e la frustata
  function handLayout(text, d) {
    const h = hsHand(d), s = DEACC(text) + (h.bang ? '!' : ''), N = s.length, strokes = [], letters = [], ph = (d.seed || 1) % 5; let x = 0;
    [...s].forEach((ch, i) => {
      const V = HS[ch]; let g = V ? V[mulberry((d.seed || 1) * 131 + ch.charCodeAt(0) * 17)() * V.length | 0] : (FB()[ch] || null); if (!g) { x += .3; return; }
      if (V && d.mix > .5 && V.length > 1 && i > 0) g = V[(V.indexOf(g) + 1) % V.length];   // la mano corsiva preferisce le forme legate
      // il ritmo delle misure: la prima grande, poi alte e basse a onda (mai a caso), l'ultima a volte grande
      const sz = i === 0 ? h.first : (h.lastBig && i === N - 1 && ch !== '!' ? h.first * .88 : 1 + h.rhythm * Math.sin(i * 2.1 + ph)),
        tl = 1 + (h.tall - 1) * (i % 2 === (ph & 1) ? 1 : .55), drop = h.dropAt.includes(i) ? h.drop : 0;
      let gx0 = 1e9, gx1 = -1e9; g.forEach(tr => tr.forEach(([u]) => { gx0 = Math.min(gx0, u); gx1 = Math.max(gx1, u); }));
      const gw = Math.max(.1, gx1 - gx0), base = h.rise * x;
      g.forEach((tr0, k) => {
        let tr = tr0.map(p => p.slice());
        const isBar = tr.length === 2 && Math.abs(tr[1][1] - tr[0][1]) < Math.abs(tr[1][0] - tr[0][0]) * .4;
        if (isBar) {   // 4. la traversa sfora, di più in avanti
          const dx = tr[1][0] - tr[0][0], dy = tr[1][1] - tr[0][1], l = hyp(dx, dy) || 1, o = h.over * .14;
          tr[0] = [tr[0][0] - dx / l * o * .5, tr[0][1] - dy / l * o * .5]; tr[1] = [tr[1][0] + dx / l * o * 1.3, tr[1][1] + dy / l * o * 1.3 + .04];
        } else {
          // 2. le aste: sopra .8 si allunga verso l'alto; le gambe scelte scendono sotto la riga
          tr = tr.map(([u, v]) => [u, v > .8 ? .8 + (v - .8) * tl * 2.2 : v]);
          if (drop) [0, tr.length - 1].forEach(j => { if (tr[j][1] <= .02 && tr.length > 1) { const q = tr[j === 0 ? 1 : j - 1]; if (Math.abs(q[0] - tr[j][0]) < .25) tr[j] = [tr[j][0] - (q[0] - tr[j][0]) * .15, tr[j][1] - drop]; } });
        }
        if (tr.length === 2 && !isBar) { const a = tr[0], b = tr[1], l = hyp(b[0] - a[0], b[1] - a[1]); tr.splice(1, 0, [(a[0] + b[0]) / 2 + (b[1] - a[1]) / (l || 1) * h.bow * l, (a[1] + b[1]) / 2 - (b[0] - a[0]) / (l || 1) * h.bow * l]); }   // 6. l'arco del polso
        else if (tr.length === 2) { const a = tr[0], b = tr[1]; tr.splice(1, 0, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + Math.abs(h.bow) * .5]); }
        // 5. l'uncino d'attacco: la punta si appoggia e torna indietro un attimo
        if (h.hook && k === 0 && tr.length > 1 && tr[0][1] > .5) { const a = tr[0], b = tr[1], dx = b[0] - a[0], dy = b[1] - a[1], l = hyp(dx, dy) || 1; tr.unshift([a[0] - dy / l * .07 - dx / l * .02, a[1] + dx / l * .07 - dy / l * .02]); }
        const pts = tr.map(([u, v]) => { const Y = v * sz + base + (i === 0 ? 0 : 0), X = x + (u - gx0) * h.wide * sz + Y * h.slant; return [X, -Y]; });
        strokes.push({ pts, i, bar: isBar, corner: true });
      });
      letters.push({ i, x0: x, x1: x + gw * h.wide * sz, top: sz * (1 + (tl - 1) * .5) + base, base, sz });
      x += (gw < .15 ? gw + .18 : gw * h.wide * h.adv + .05) * sz;
    });
    if (!strokes.length) return { strokes, box: [0, 0, 1, 1] };
    // 5. la frusta: l'ultimo tratto della parola continua e finisce a punta
    const last = strokes.filter(t => !t.bar).slice(-1)[0] || strokes[strokes.length - 1];
    if (h.flickE && last.pts.length > 1) { const e = last.pts[last.pts.length - 1], p0 = last.pts[last.pts.length - 2], dx = e[0] - p0[0], dy = e[1] - p0[1], l = hyp(dx, dy) || 1; last.pts.push([e[0] + dx / l * .22 + .1, e[1] + dy / l * .22 - .06], [e[0] + dx / l * .3 + .3, e[1] + dy / l * .2 - .14]); last.flick = true; }
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; const bb = () => { x0 = 1e9; x1 = -1e9; y0 = 1e9; y1 = -1e9; strokes.forEach(t => t.pts.forEach(([a, b]) => { x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b); })); }; bb();
    // 7. la frustata sotto: parte da sotto l'ultima lettera, torna indietro sotto la parola e finisce a punta (o con la freccia)
    if (h.under) { const yb = y1 + .1, xe = x1 - .05; const ru = mulberry((d.seed || 1) ^ 0x77)(), W2 = x1 - x0; strokes.push({ i: N - 1, swash: true, pts: ru < .5 ? [[xe - .1, yb - .22], [xe + .05, yb - .02], [xe - W2 * .25, yb + .1], [x0 + W2 * .3, yb + .12], [x0 - .05, yb + .02], [x0 - .18, yb - .12]] : [[x0 + .05, yb - .1], [x0 + W2 * .2, yb + .08], [x0 + W2 * .6, yb + .1], [xe + .1, yb - .02], [xe + .3, yb - .2]] }); }   // la frustata: torna indietro e risale, o corre avanti e si alza
    // 7. gli accenti nei vuoti: «=», «||», «//», il punto; sempre negli stessi posti per la stessa mano
    const ra = mulberry((d.seed || 1) ^ 0x2a2a);
    letters.forEach(L => {
      if (ra() >= h.acc || L.i === N - 1) return;
      const cx = L.x1 + .06 + L.top * .55 * h.slant, cy = -(L.base + L.top * (.55 + ra() * .3)), s2 = .1 * L.sz, sl = h.slant;
      if (h.accK === '=') [0, 1].forEach(j => strokes.push({ i: L.i, acc: true, pts: [[cx - s2 * .5, cy + j * s2 * .6 + s2 * .15], [cx + s2 * .5, cy + j * s2 * .6 - s2 * .15]] }));
      else if (h.accK === '||' || h.accK === '//') [0, 1].forEach(j => { const tk = h.accK === '//' ? .7 : sl; strokes.push({ i: L.i, acc: true, pts: [[cx + j * s2 * .55, cy + s2 * .6], [cx + j * s2 * .55 + s2 * 1.2 * tk, cy - s2 * .6]] }); });
      else strokes.push({ i: L.i, acc: true, pts: [[cx, cy]] });
    });
    bb();
    return { strokes, box: [x0, y0, x1, y1], hs: h };
  }

  // ---------------- LE FIRME DISEGNATE ----------------
  // [writer] Le tag dei writer veri non escono da una formula: ognuna è un segno solo, disegnato una volta e rifatto sempre
  // uguale, con la sua idea (la lettera che chiude la parola, la curva che diventa la sottolineatura, il tratto che non si stacca).
  // Il disegno è dritto, in un riquadro 100 × 50 (y in giù, la riga di base a 40, le maiuscole da ~11): l'inclinazione (sl) la
  // mette il polso, uguale per tutto. Pochi stacchi: le lettere entrano una nell'altra. Un punto [x, y, 1] è una punta (il
  // gesto si ferma e torna indietro); fra le punte la curva è tesa e continua.
  // IL GESTO: il tratto è un nastro che cambia spessore lungo la corsa: si appoggia sottile, si gonfia dove la mano rallenta
  // (le curve), si stringe dove corre (i dritti), alla fine scappa via a punta. Al marker conta anche l'angolo della punta.
  const arcP = (cx, cy, rx, ry, a0, a1, n) => { const o = []; n = n || 16; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return o; };
  // [writer] LE SALDATURE: una lettera che arriva su un'altra ci entra piena, con la giunta ([x, y, 2] all'inizio o alla fine
  // del tratto): la A si appoggia all'asta della D, la N dà l'asta alla E, la K sta in piedi sulla E, la A sulla O.
  // [writer] LA FORMA: la tag è un disegno prima che una parola. Non sta in un rettangolo come un carattere da stampa: è
  // tonda e chiusa come un amuleto (le lettere si abbracciano, una coda torna a prendere l'inizio), le misure saltano (una
  // lettera enorme, una minuscola infilata nel vuoto), le aste si proiettano fuori, e ha i suoi segni: la corona, l'aureola,
  // le virgolette, la freccia, il cuore, la scintilla. Riquadro ~100 × 70, y in giù; base = la riga attorno a cui il polso
  // inclina (sl).
  // [writer] I SEGNI ATTORNO (dai fogli di tag): la stella a cinque punte fatta in un tratto, l'asterisco, la coroncina, la
  // freccia, i «!!», l'«=», le virgolette, le tacche «///», il diamante, la scintilla, la x, l'aureola. Ognuno è un gesto
  // (punte dove la mano gira), più sottile della tag. [tipo, x, y, misura, rotazione]
  function decoStrokes(k, x0, y0, sz, rot) {
    sz *= 1.7; const c = Math.cos(rot || 0), sn = Math.sin(rot || 0), T = t => t.map(([u, v, f]) => [x0 + (u * c - v * sn) * sz, y0 + (u * sn + v * c) * sz, f]);
    const star = []; for (let i = 0; i <= 5; i++) { const a = -PI / 2 + i * PI * 4 / 5; star.push([Math.cos(a), Math.sin(a), i && i < 5 ? 1 : 0]); }
    const D = {
      stella: [star],
      asterisco: [[[0, -1], [0, 1]], [[-.87, -.5], [.87, .5]], [[-.87, .5], [.87, -.5]]],
      corona: [[[-1, .4], [-1.05, -.6, 1], [-.5, 0, 1], [0, -.85, 1], [.5, 0, 1], [1.05, -.6, 1], [1, .4]], [[-1.1, .45], [1.1, .4]]],
      freccia: [[[-1, .6], [.95, -.55]], [[.25, -.7], [.95, -.55, 1], [.7, .05]]],
      bang: [[[0, -1], [-.08, .35]], [[-.12, .85]], [[.5, -1], [.42, .35]], [[.38, .85]]],
      uguale: [[[-.7, -.2], [.7, -.3]], [[-.6, .25], [.8, .15]]],
      virgolette: [[[0, -.6], [-.12, .25]], [[.42, -.6], [.3, .25]]],
      tacche: [[[-.6, .5], [-.3, -.5]], [[-.1, .5], [.2, -.5]], [[.4, .5], [.7, -.5]]],
      diamante: [[[-.7, -.3], [-.35, -.75, 1], [.35, -.75, 1], [.7, -.3, 1], [0, .9, 1], [-.7, -.3, 1], [.7, -.3]], [[-.2, -.75], [0, -.3, 1], [.2, -.75]]],
      scintilla: [[[0, -1], [0, 1]], [[-.6, 0], [.6, 0]]],
      x: [[[-.6, -.6], [.6, .6]], [[.6, -.6], [-.6, .6]]],
      aureola: [arcP(0, 0, 1, .35, -.3, 6.4, 16)],
    };
    return (D[k] || []).map(T);
  }
  // [writer] Quattro scuole dai fogli: lo SWIPE (tutto avanti, la frustata lunga sotto e quella che taglia sopra), il WHAMX
  // (le lettere strette al centro e le ali che si aprono a raggiera), il BASIS (aste alte e spigolose, le traverse lunghe che
  // attraversano tutto, le tacche), il BUSTED (le lettere a ricciolo chiuse nel cuore, a spruzzo, che cola). Non si deve
  // leggere per forza: deve colpire.
  // [writer] Quattro scuole dai fogli: lo SWIPE (tutto avanti, la frustata lunga sotto e quella che taglia sopra), il WHAMX
  // (le lettere strette al centro e le ali che si aprono a raggiera), il BASIS (aste alte e spigolose, le traverse lunghe che
  // attraversano tutto, le tacche), il BUSTED (le lettere a ricciolo chiuse nel cuore, a spruzzo, che cola). Non si deve
  // leggere per forza: deve colpire.
  const SIGNED = {
    KEOS: { w: 5.4, sl: .12, base: 42, idea: 'swipe: la frustata sotto e il taglio sopra', deco: [['stella', 1, 6, 4.5, .2], ['asterisco', 93, 42, 3, .3], ['virgolette', 88, 18, 4], ['tacche', 4, 30, 3.5]], strokes: [
      [[13, 4], [10.5, 22], [8, 42]],
      [[27, 7], [17, 17], [10, 25, 1], [18, 33], [26, 42]],
      [[27, 37], [35, 30], [33.5, 25], [27.5, 27.5], [25.5, 36], [30, 42], [38, 39]],
      [[53, 8], [44, 12], [38.5, 27], [41, 39.5], [49, 39], [55.5, 24], [53.5, 9.5], [46, 10.5]],
      [[74, 9], [66.5, 6.5], [59.5, 11.5], [64.5, 21], [68.5, 30], [62, 40], [51, 43]],
      [[1, 49], [30, 46.5], [62, 43], [84, 36], [100, 27]],
      [[36, 19.5], [62, 15.5], [84, 11], [99, 6]],
      [[80, 25]], [[86, 23.5]],
    ] },
    DAKO: { w: 5.2, sl: .1, base: 40, idea: 'whamx: le ali che si aprono', deco: [['corona', 40, -2, 7], ['scintilla', 8, 8, 3], ['scintilla', 90, 6, 2.5], ['bang', 99, 22, 6], ['x', 2, 58, 2]], strokes: [
      [[17, 9], [15, 24], [13.5, 38, 1], [22, 36.5], [29, 26], [27.5, 14], [18, 9], [9, 11]],
      [[28, 40], [33, 24], [36.5, 7, 1], [40, 22], [43.5, 39]], [[29.5, 27], [47.5, 25]],
      [[50, 8], [48.5, 23], [47.5, 39]], [[61, 9], [49, 24, 1], [55.5, 31], [63, 40]],
      [[75, 11], [66.5, 15], [63.5, 29], [68, 38.5], [76, 35], [79, 21], [75, 11], [69, 13]],
      [[12, 24, 2], [3, 32], [0, 44], [4, 54]], [[84, 18, 2], [94, 27], [99, 40], [96, 52]],
      [[32, 40, 2], [23, 50]], [[44, 40, 2], [43, 53]], [[56, 40, 2], [64, 52]], [[71, 39, 2], [86, 50]],
    ] },
    SNEK: { w: 4.6, sl: .14, base: 42, idea: 'basis: aste alte, traverse che attraversano', deco: [['diamante', 4, -3, 4.5], ['freccia', 92, 34, 7, -.2], ['uguale', 50, 50, 4], ['asterisco', 80, 2, 2.5]], strokes: [
      [[17, 9], [9, 6], [4.5, 13], [13, 23], [17.5, 33], [10, 42], [1, 39]],
      [[20, 43], [22.5, 26], [25, 9, 1], [31, 25], [34, 41, 1], [37, 22], [40, 1]],
      [[57, 7], [49, 7.5], [44, 8.5, 1], [42, 25], [40.5, 41, 1], [50, 40], [58, 39]],
      [[60, 1], [58, 22], [56.5, 45]], [[75, 10], [66, 18], [58, 26, 1], [68, 33], [78, 42], [86, 47]],
      [[16, 25.5], [40, 24], [70, 21.5], [99, 18]],
      [[88, 9], [86.5, 20]], [[93, 8], [91.5, 19]],
      [[63, 49]], [[69, 50.5]],
    ] },
    KAOS: { w: 3.8, sl: .08, base: 44, drips: 7, idea: 'busted: i riccioli chiusi nel cuore, che cola', deco: [['stella', 3, 4, 5, -.2], ['stella', 98, 32, 3.5, .3], ['aureola', 50, -4, 9], ['tacche', 6, 46, 3.5], ['asterisco', 94, 50, 2.5]], strokes: [
      [[50, 13], [42, 3], [26, 2], [12, 11], [10, 26], [24, 39], [50, 54, 1], [74, 39], [89, 25], [87, 10], [74, 2], [59, 3], [50, 13]],
      [[23, 13], [21.5, 26], [20.5, 37]], [[33, 14], [26, 21], [22, 26, 1], [28, 31], [34, 36]],
      [[45, 23], [39.5, 21], [35.5, 27], [39, 33.5], [44.5, 30], [46, 22], [47.5, 35]],
      [[57, 21.5], [51.5, 24.5], [51.5, 33], [57, 34], [60.5, 27], [58.5, 21.5], [54, 20]],
      [[73, 19], [67, 19], [65.5, 24.5], [71.5, 27.5], [73, 33], [64.5, 37]],
      [[42, 46], [58, 46]],
      [[94, 5], [92.5, 14]], [[98, 4], [96.5, 13]],
    ] },
  };
  // la scuola del muro (pezzo SKILZ, a marker): tenuta da parte, più incisa che scritta
  // [writer] LA SCUOLA DEL MURO (dal pezzo SKILZ, pensato a marker): la tag sale verso destra; la rampa parte da sotto la prima
  // lettera, corre sotto tutto e risale a punta, così la tag sta dentro un triangolo; le lettere sono spigolose, le traverse
  // sforano a lama; dai tratti spuntano le spine (il punto [x, y, 3]: un uncino curvo che esce e finisce a punta); sopra
  // galleggia il disco. Non si deve leggere per forza: deve colpire.
  const SIGNED_MURO = {
    KEOS: { sharp: true, w: 5.2, sl: .24, base: 50, idea: 'la rampa, le spine, la O fatta disco', strokes: [
      [[19, 6, 3], [15, 28], [9, 50], [1, 60, 1], [30, 53], [60, 45, 3], [88, 37, 1], [84, 29]],
      [[35, 10], [26, 20], [15, 31, 1], [25, 38, 3], [36, 47]],
      [[54, 15], [45, 14.5, 1], [40.5, 41, 1], [53, 39.5]], [[41.5, 28, 3], [55, 26], [68, 24.5]],
      arcP(56, 4, 7.5, 4.6, -.3, 6.4, 18),
      [[85, 16, 3], [76, 12.5], [68.5, 18], [74.5, 26], [81.5, 33], [75, 42], [64, 45.5]],
    ] },
    DAKO: { sharp: true, w: 5.2, sl: .24, base: 50, idea: 'la rampa, la D a lama, il disco', strokes: [
      [[15, 8, 3], [12.5, 30], [8, 50], [0, 58, 1], [40, 52], [72, 46, 3], [94, 41, 1], [90, 34]],
      [[11, 46, 2], [24, 45], [34, 36], [33, 20], [23, 10.5], [7, 12]],
      [[31, 50], [37.5, 30], [42.5, 6, 1], [46.5, 28, 3], [51, 47]], [[28, 32], [50, 30], [64, 28]],
      [[59, 10, 3], [57, 30], [54.5, 48]], [[73, 14], [58, 30, 1], [67, 37, 3], [77, 46]],
      [[90, 24], [84, 22], [80.5, 30], [83.5, 38], [90, 36], [92, 28], [88, 22.5]],
      arcP(44, -4, 7, 4.4, -.3, 6.4, 16),
    ] },
    SNEK: { sharp: true, w: 5, sl: .24, base: 50, idea: 'la rampa, la traversa a lama, le spine', strokes: [
      [[21, 10, 3], [11, 8], [6.5, 16], [16, 26], [20, 36], [12, 47], [0, 57, 1], [44, 51], [92, 41, 1], [88, 33]],
      [[22, 48], [25, 26], [28, 8, 1], [34, 30, 3], [38, 46, 1], [42, 24], [46, 3]],
      [[62, 10], [52.5, 10, 1], [48.5, 44, 1], [60, 42]], [[49.5, 27, 3], [63, 25], [78, 23]],
      [[69, 5, 3], [66, 28], [63, 50]], [[83, 14], [67, 30, 1], [77, 38, 3], [89, 48]],
      arcP(46, -7, 5.5, 3.6, -.3, 6.4, 14),
    ] },
    KAOS: { sharp: true, w: 5.2, sl: .24, base: 50, idea: 'la rampa, la O fatta disco sulla A', strokes: [
      [[17, 6, 3], [13, 30], [7, 50], [0, 58, 1], [44, 50.5], [86, 40, 1], [82, 32]],
      [[31, 12], [23, 22], [14, 30, 1], [23, 37, 3], [31, 46]],
      [[33, 48], [38.5, 28], [43.5, 8, 1], [47.5, 28, 3], [52.5, 46]], [[30, 32], [56, 30], [64, 29]],
      arcP(44, -3, 7, 4.4, -.3, 6.4, 16),
      [[79, 14, 3], [67, 10], [59, 16], [67, 26], [75, 34], [67, 44], [55, 47]],
      [[90, 22]], [[94.5, 20]],
    ] },
  };
  // il gesto: la curva per i punti (Catmull-Rom centripeta: niente riccioli né pance), spezzata alle punte; [x, y, punta]
  function gesture(P, step) {
    const out = [], pieces = []; let pc = [P[0]];
    for (let i = 1; i < P.length; i++) { pc.push(P[i]); if (P[i][2] && i < P.length - 1) { pieces.push(pc); pc = [P[i]]; } }
    pieces.push(pc);
    const dd = (a, b) => Math.sqrt(Math.max(1e-4, hyp(b[0] - a[0], b[1] - a[1])));
    pieces.forEach((Q, k) => {
      if (Q.length < 2) return;
      for (let i = 0; i < Q.length - 1; i++) {
        const p1 = Q[i], p2 = Q[i + 1], p0 = Q[i - 1] || [2 * p1[0] - p2[0], 2 * p1[1] - p2[1]], p3 = Q[i + 2] || [2 * p2[0] - p1[0], 2 * p2[1] - p1[1]];
        const t1 = dd(p0, p1), t2 = t1 + dd(p1, p2), t3 = t2 + dd(p2, p3), n = Math.max(2, Math.ceil(hyp(p2[0] - p1[0], p2[1] - p1[1]) / step));
        for (let j = (k === 0 && i === 0) ? 0 : 1; j <= n; j++) {
          const t = t1 + (t2 - t1) * j / n, L = (a, b, ta, tb) => [a[0] * (tb - t) / (tb - ta) + b[0] * (t - ta) / (tb - ta), a[1] * (tb - t) / (tb - ta) + b[1] * (t - ta) / (tb - ta)];
          const A1 = L(p0, p1, 0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3), B1 = L(A1, A2, 0, t2), B2 = L(A2, A3, t1, t3), C = L(B1, B2, t1, t2);
          out.push([C[0], C[1], (j === n && i === Q.length - 2 && k < pieces.length - 1) ? 1 : 0]);
        }
      }
    });
    return out;
  }
  const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  // il nastro: uno spessore per campione, i bordi sinistro e destro, un poligono per pezzo (fra le punte), la giunta tonda
  function ribbon(x, G, Wd, cap) {
    let a = 0;
    const cut = [0]; G.forEach((q, i) => { if (q[2] && i > 0 && i < G.length - 1) cut.push(i); }); cut.push(G.length - 1);
    for (let c = 0; c + 1 < cut.length; c++) {
      const i0 = cut[c], i1 = cut[c + 1], Lf = [], Rt = [];
      for (let i = i0; i <= i1; i++) {
        const pa = G[Math.max(i0, i - 1)], pb = G[Math.min(i1, i + 1)], tx = pb[0] - pa[0], ty = pb[1] - pa[1], l = hyp(tx, ty) || 1, nx = -ty / l, ny = tx / l, h = Wd[i] / 2;
        Lf.push([G[i][0] + nx * h, G[i][1] + ny * h]); Rt.push([G[i][0] - nx * h, G[i][1] - ny * h]);
      }
      x.beginPath(); Lf.forEach((p, k) => k ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); for (let k = Rt.length - 1; k >= 0; k--) x.lineTo(Rt[k][0], Rt[k][1]); x.closePath(); x.fill();
      if (c > 0) { x.beginPath(); x.arc(G[i0][0], G[i0][1], Wd[i0] * .42, 0, 7); x.fill(); }   // la punta: la giunta piena
    }
    if (cap) [0, G.length - 1].forEach(i => { x.beginPath(); x.arc(G[i][0], G[i][1], Wd[i] / 2, 0, 7); x.fill(); });
    return a;
  }
  // lo spessore lungo il gesto: l'appoggio, la velocità (le curve lente, i dritti veloci), la fuga finale, la punta del marker
  // [writer] LA FISICA DEL TRATTO (dai fogli): il marker si appoggia e lascia la goccia piena; correndo dritto si consuma e
  // si stringe; nelle curve la mano frena e il tratto si riempie; alla fine scappa via a punta tagliente. Una saldatura (w0, w1)
  // entra piena nell'altro tratto.
  function profile(G, W, mark, nibA, w0, w1, sharp) {
    const n = G.length, s = [0]; for (let i = 1; i < n; i++) s.push(s[i - 1] + hyp(G[i][0] - G[i - 1][0], G[i][1] - G[i - 1][1])); const L = s[n - 1] || 1;
    const kap = G.map((q, i) => { const a = G[Math.max(0, i - 3)], b = G[Math.min(n - 1, i + 3)]; if (q[2]) return 1; const u = Math.atan2(q[1] - a[1], q[0] - a[0]), v = Math.atan2(b[1] - q[1], b[0] - q[0]); let d = Math.abs(v - u); if (d > PI) d = 2 * PI - d; return clamp(d / Math.max(.5, s[Math.min(n - 1, i + 3)] - s[Math.max(0, i - 3)]) * 4, 0, 1); });
    const ks = kap.map((_, i) => { let t = 0, c = 0; for (let j = Math.max(0, i - 4); j <= Math.min(n - 1, i + 4); j++) { t += kap[j]; c++; } return t / c; });
    let run = 0; const runs = G.map((q, i) => { if (i) run += s[i] - s[i - 1]; run *= 1 - ks[i] * .25; if (q[2]) run = 0; return run; });   // quanto corre dritto (le curve frenano, le punte ripartono)
    const exit = Math.min(.45, W * (mark ? 3.2 : 2.4) / L);
    return G.map((q, i) => {
      const u = s[i] / L, a = G[Math.max(0, i - 1)], b = G[Math.min(n - 1, i + 1)], dir = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const pool = w0 ? 1 : sharp ? .12 + .88 * sstep(0, W * 2.4, s[i]) : 1 + .2 * (1 - sstep(0, W * 2, s[i]))   /* sharp: anche l'attacco a lama */, fast = 1 - .38 * sstep(0, W * 12, runs[i]), brake = 1 + .22 * ks[i], tail = w1 ? 1 : (mark ? .03 : .14) + (mark ? .97 : .86) * (1 - sstep(1 - exit, 1, u));
      let w = W * pool * fast * brake * tail;
      if (mark) w *= .5 + .5 * Math.abs(Math.sin(dir - nibA));
      return Math.max(1, w);
    });
  }
  // disegna una firma; ritorna i punti del percorso (per la mano che la ripassa)
  function drawSigned(x, S, Wp, Hp, r, col, tool, d) {
    const mark = tool === 'mtag', sl = S.sl || .2, path = [];
    // le spine: da ogni punto [x, y, 3] spunta un uncino curvo saldato al tratto, verso dove corre la mano, a lati alterni
    if (!S.__x) { let side = 1; const add = []; S.strokes.forEach(t => t.forEach((q, k) => { if (q[2] !== 3) return; const a = t[Math.max(0, k - 1)], b = t[Math.min(t.length - 1, k + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = hyp(dx, dy) || 1, tx = dx / l, ty = dy / l, nx = -ty * side, ny = tx * side; side = -side; add.push([[q[0], q[1], 2], [q[0] + nx * 3.2 + tx * 2.2, q[1] + ny * 3.2 + ty * 2.2], [q[0] + nx * 5.2 + tx * 7.5, q[1] + ny * 5.2 + ty * 7.5]]); }));
      const dec = []; (S.deco || []).forEach(d => decoStrokes(...d).forEach(t => dec.push(t)));
      const base = S.strokes.map(t => t.map(q => q[2] === 3 ? [q[0], q[1]] : q)).concat(add);
      S.__x = { strokes: base.concat(dec), f: base.map(() => 1).concat(dec.map(() => .42)), n: S.strokes.length }; }
    const FW = S.__x.f; S = Object.assign({}, S, { strokes: S.__x.strokes });
    const B = S.base || 40, G0 = S.strokes.map(t => t.length < 2 ? [[t[0][0] + (B - t[0][1]) * sl, t[0][1], 0]] : gesture(t.map(([a, b, c]) => [a + (B - b) * sl, b, c]), .35));
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; G0.forEach(g => g.forEach(([a, b]) => { x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b); }));
    const pad = S.w * 1.2, sc = Math.min(Wp * .94 / (x1 - x0 + pad * 2), Hp * .86 / (y1 - y0 + pad * 2)), ox = Wp / 2 - (x0 + x1) / 2 * sc, oy = Hp * .45 - (y0 + y1) / 2 * sc;
    const G = G0.map(g => g.map(([a, b, c]) => [ox + a * sc, oy + b * sc, c])), W = S.w * sc * (mark ? .78 : 1), nibA = d && d.nibA != null ? d.nibA : -.75;
    const weld = S.strokes.map(t => [t[0][2] === 2, t[t.length - 1][2] === 2]), Wds = G.map((g, i) => g.length < 2 ? [W * (mark ? 1.1 : 1.15) * (FW[i] < 1 ? .7 : 1)] : profile(g, (mark ? W * 1.45 : W) * FW[i], mark, nibA, weld[i][0], weld[i][1], S.sharp || FW[i] < 1).map((w, k) => w * (1 + (mark ? .13 : .07) * (Math.sin(k * .21 + i * 2.3) * .6 + Math.sin(k * .83 + i) * .3) + (mark ? .035 : .05) * (r() - .5))));   // [writer] il bordo dell'inchiostro: mai liscio, la vernice prende e molla
    const draw = (k, cap) => G.forEach((g, i) => { if (g.length < 2) { x.beginPath(); x.arc(g[0][0], g[0][1], Wds[i][0] * k / 2, 0, 7); x.fill(); return; } ribbon(x, g, Wds[i].map(w => w * k), cap); if (!weld[i][0] && !S.sharp && FW[i] === 1) { x.beginPath(); x.arc(g[0][0], g[0][1], Wds[i][0] * k * .47, 0, 7); x.fill(); }   /* la goccia dove si appoggia */ weld[i].forEach((on, e) => { if (!on) return; const j = e ? g.length - 1 : 0; x.beginPath(); x.arc(g[j][0], g[j][1], Math.max(Wds[i][j], W * .8) * k * .55, 0, 7); x.fill(); }); });   // la giunta della saldatura
    x.save(); x.fillStyle = col; x.strokeStyle = col;
    if (!mark) { x.save(); x.filter = `blur(${(W * .35).toFixed(1)}px)`; x.globalAlpha = .16; draw(1.4, true); x.restore(); x.save(); x.filter = `blur(${Math.max(.5, W * .03).toFixed(1)}px)`; draw(1, true); x.restore(); }   // lo spruzzo: l'alone largo e leggero, poi il tratto col bordo appena morbido
    else draw(1, false);
    G.forEach(g => g.forEach(q => path.push(q)));
    // le colature: dove la mano si ferma in basso (i fondi delle curve, le punte in basso), poche e sottili
    const bots = []; G.forEach((g, i) => g.forEach((q, k) => { if (k < 3 || k > g.length - 4) return; if (g[k - 3][1] < q[1] && g[k + 3][1] <= q[1] && q[1] > Hp * (S.drips > 4 ? .3 : .45)) bots.push([q, Wds[i][k]]); else if (S.drips > 4 && k % 9 === 0 && q[1] > Hp * .35) bots.push([q, Wds[i][k] * .8]); }));
    const n = Math.min(bots.length, S.drips != null ? S.drips : mark ? (r() < .5 ? 1 : 0) : 1 + Math.floor(r() * 3));
    for (let k = 0; k < n; k++) { const [q, w0] = bots.splice(Math.floor(r() * bots.length), 1)[0], l = Hp * (.04 + r() * r() * (S.drips > 4 ? .45 : .3)), w = Math.max(1, w0 * (.22 + r() * .15)); x.beginPath(); x.moveTo(q[0] - w / 2, q[1]); x.lineTo(q[0] + w / 2, q[1]); x.lineTo(q[0] + w * .35, q[1] + l); x.arc(q[0], q[1] + l, w * .55, 0, PI); x.lineTo(q[0] - w * .35, q[1] + l); x.closePath(); x.fill(); }
    if (!mark) { x.globalAlpha = .25; for (let k = 0; k < path.length * .25; k++) { const q = path[Math.floor(r() * path.length)], a = r() * PI * 2, rr = W * (.8 + r() * 1.2); x.fillRect(q[0] + Math.cos(a) * rr, q[1] + Math.sin(a) * rr, 1.5, 1.5); } }   // la grana fuori
    x.restore();
    return { path, W };
  }

  // ---------------- LA TAG ----------------
  // la parola nella mano: i tratti in pixel (y in giù), già inclinati, rimbalzati, con la prima lettera grande e lo svolazzo
  function layout(text, d, r) {
    if (d.st && STILI[d.st] && !d.goth) d = Object.assign({}, d, STILI[d.st]);
    if (d.goth) d = Object.assign({}, d, { nibA: -.78, nibW: .3, wide: d.vert ? 1.25 : .9, contrast: .9, mix: 0, slant: d.vert ? 0 : .08, bigFirst: 1.15, tall: 1.3, adv: .62, swash: false, flick: true, bounce: .02, arc: 0, crown: false, halo: false, under: false, dashes: false, stars: false, quotes: false });
    // [writer] L'ARMONIA: un solo alfabeto per tutta la parola (le maiuscole o la mano), le lettere della stessa larghezza (il ritmo),
    // il rimbalzo come un'onda continua lungo la parola, niente tremolio a caso sui punti: la mano corre, non trema
    const s = DEACC(text), strokes = [], caseV = d.goth ? 0 : (d.mix > .5 ? 1 : 0), ph = (d.seed || 1) % 7, cw = .56 * d.wide; let x = 0;
    [...s].forEach((ch, i) => {
      const G0 = A[ch], g = G0 ? G0[i === 0 && d.bigFirst > 1 ? 0 : caseV] : (FB()[ch] || null); if (!g) { x += .35; return; }
      const sz = i === 0 ? d.bigFirst : 1, by = d.bounce * Math.sin(i * 1.25 + ph) + d.arc * Math.sin((i + .5) / Math.max(1, s.length) * PI);
      let gx0 = 1e9, gx1 = -1e9; g.forEach(tr => tr.forEach(([u]) => { gx0 = Math.min(gx0, u); gx1 = Math.max(gx1, u); }));
      const gw = Math.max(.12, gx1 - gx0), kx = gw < .2 ? 1 : clamp(.6 / gw, .8, 1.3);   // ogni lettera portata alla stessa larghezza (le I e le punteggiature restano strette)
      g.forEach(tr => {
        const pts = tr.map(([u, v]) => { const vv = v > .9 ? .9 + (v - .9) * d.tall * 2.2 : v; let X = (d.vert ? -gw * d.wide * sz / 2 : x) + (u - gx0) * kx * d.wide * sz, Y = (vv * sz + by - (d.vert ? i * 1.05 : 0)); X += Y * d.slant; return [X, -Y]; });
        strokes.push({ pts, i });
      });
      if (!d.vert) x += ((gw < .2 ? gw : .6) * d.wide + .1) * sz * (d.adv / .65);
    });
    if (!strokes.length) return { strokes, box: [0, 0, 1, 1] };
    if (d.connect) { const byI = []; strokes.forEach(t => { (byI[t.i] = byI[t.i] || []).push(t); }); for (let i = 0; i + 1 < byI.length; i++) { const A0 = byI[i], B0 = byI[i + 1]; if (!A0 || !B0) continue; const a = A0[A0.length - 1].pts.slice(-1)[0], b = B0[0].pts[0]; if (hyp(b[0] - a[0], b[1] - a[1]) > 1.1) continue; strokes.push({ i, link: true, pts: [a, [(a[0] + b[0]) / 2, Math.max(a[1], b[1]) + .12], b] }); } }   // [writer] le lettere legate
    // lo svolazzo: l'ultimo tratto continua, torna sotto la parola e finisce a punta
    const last = strokes[strokes.length - 1], e = last.pts[last.pts.length - 1];
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; strokes.forEach(t => t.pts.forEach(([a, b]) => { x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b); }));
    if (d.swash) strokes.push({ i: last.i, swash: true, pts: [e, [e[0] + .25, y1 + .12], [(x0 + x1) * .55, y1 + .32], [x0 + .1, y1 + .2], [x0 - .2, y1 - .05]] });
    else if (d.flick) { const p0 = last.pts[Math.max(0, last.pts.length - 2)], dx = e[0] - p0[0], dy = e[1] - p0[1], l = hyp(dx, dy) || 1; last.pts.push([e[0] + dx / l * .35, e[1] + dy / l * .35]); last.flick = true; }
    if (d.loop && strokes[0]) { const f = strokes[0], a = f.pts[0]; f.pts.unshift([a[0] - .1, a[1] + .1], [a[0] - .22, a[1] - .1], [a[0] - .05, a[1] - .18]); }
    x0 = 1e9; x1 = -1e9; y0 = 1e9; y1 = -1e9; strokes.forEach(t => t.pts.forEach(([a, b]) => { x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b); }));
    return { strokes, box: [x0, y0, x1, y1] };
  }
  // disegna la tag di questa mano in un riquadro Wp × Hp; ritorna i punti del percorso (per la mano che la ripassa)
  function handTag(x, text, d, Wp, Hp, r, col, tool) {
    { const S = !d.goth && SIGNED[DEACC(text)]; if (S) return drawSigned(x, S, Wp, Hp, r, col, tool, d); }   // [writer] la firma disegnata, se ce l'ha
    if (d.st && STILI[d.st] && !d.goth) d = Object.assign({}, d, STILI[d.st]);
    if (d.goth) d = Object.assign({}, d, { crown: false, halo: false, under: false, dashes: false, stars: false, quotes: false, spray: false, nibW: .3, nibA: -.78, contrast: .9 });
    if (d.st === 'libera' && !d.goth && d.st2 < .5) d = Object.assign({}, d, STILI.grog);   // metà delle mani libere sono del marker alto
    const HSt = !d.goth; if (HSt) d = Object.assign({}, d, { under: false, halo: false, stars: false, dashes: false, quotes: false, crown: d.crown && d.st2 > .6 });   // [writer] l'handstyle ha i suoi accenti
    const L = HSt ? handLayout(text, d) : layout(text, d, r), [x0, y0, x1, y1] = L.box, decoT = d.crown || d.halo ? .22 : .06, decoB = d.under || d.swash ? .2 : .08;
    const sc = Math.min((Wp * .9) / Math.max(.1, x1 - x0), (Hp * (1 - decoT - decoB)) / Math.max(.1, y1 - y0)), ox = (Wp - (x1 - x0) * sc) / 2 - x0 * sc, oy = Hp * decoT - y0 * sc;
    const P = t => t.map(([a, b]) => [a * sc + ox, b * sc + oy]);
    const W = Math.max(2, sc * d.nibW * (tool === 'mtag' ? 1.1 : 1)), spray = tool !== 'mtag' && d.spray, path = [];
    x.save(); x.fillStyle = col; x.strokeStyle = col; x.lineJoin = 'round'; x.lineCap = 'round';
    if (spray) { x.shadowColor = col; x.shadowBlur = W * .45; }   // [writer] l'alone sì, ma la tag si deve leggere
    const segs = L.strokes.map(t => { const pts = d.angular && !t.swash ? P(t.pts) : HSt ? smoothC(P(t.pts), 6) : smooth(P(t.pts), 5); pts.forEach(q => path.push(q)); return { pts, t }; });
    if (HSt) segs.forEach(({ pts, t }) => chisel(x, pts, W * (t.acc ? .55 : t.swash ? .75 : t.bar ? .9 : 1), d.nibA, 2, 2, d.contrast));   // l'attacco e l'uscita affilati
    else segs.forEach(({ pts, t }) => chisel(x, pts, W * (t.swash ? .8 : t.link ? .35 : 1), d.nibA, true, t.flick || t.swash || t.link || pts.length > 6, d.contrast));
    if (d.scratch) { x.save(); x.globalAlpha = .5; x.lineWidth = Math.max(1, W * .12); segs.forEach(({ pts }) => { if (r() < .5) return; x.beginPath(); pts.forEach((q, i) => i ? x.lineTo(q[0] + W * .4, q[1] - W * .3) : x.moveTo(q[0] + W * .4, q[1] - W * .3)); x.stroke(); }); x.restore(); }   // la seconda passata veloce, scheggiata
    x.shadowBlur = 0;
    if (d.goth) { x.lineWidth = Math.max(1, W * .1); x.lineCap = 'round'; segs.forEach(({ pts }) => { if (pts.length < 3 || r() < .6) return; const e = pts[pts.length - 1], p0 = pts[pts.length - 3], dx = e[0] - p0[0], dy = e[1] - p0[1], l = hyp(dx, dy) || 1, ux = dx / l, uy = dy / l, L2 = W * (1.5 + r() * 1.5), sg = r() < .5 ? 1 : -1; x.beginPath(); x.moveTo(e[0], e[1]); x.bezierCurveTo(e[0] + ux * L2 * .6, e[1] + uy * L2 * .6, e[0] + ux * L2 - uy * L2 * .5 * sg, e[1] + uy * L2 + ux * L2 * .5 * sg, e[0] + ux * L2 * .7 - uy * L2 * .9 * sg, e[1] + uy * L2 * .7 + ux * L2 * .9 * sg); x.stroke(); }); }   // i riccioli del gotico
    // la grana dello spray: puntini attorno ai tratti
    if (spray) { x.globalAlpha = .35; for (let k = 0; k < path.length * d.grain * .6; k++) { const q = path[Math.floor(r() * path.length)], a = r() * PI * 2, rr = W * (.6 + r() * 1.4); x.fillRect(q[0] + Math.cos(a) * rr, q[1] + Math.sin(a) * rr, 1.2, 1.2); } x.globalAlpha = 1; }
    // l'inchiostro del marker: la goccia dove si appoggia
    if (!spray) segs.forEach(({ pts, t }) => { if (!t.acc && r() < (HSt ? .3 : .5)) { x.beginPath(); x.arc(pts[0][0], pts[0][1], W * (HSt ? .3 : .42), 0, 7); x.fill(); } });
    const bx0 = x0 * sc + ox, bx1 = x1 * sc + ox, by0 = y0 * sc + oy, by1 = y1 * sc + oy, mid = (bx0 + bx1) / 2, th = Math.max(1.5, W * .45);
    x.lineWidth = th;
    if (d.crown) { const cw = (bx1 - bx0) * (.18 + r() * .14), cx = mid + (r() - .5) * (bx1 - bx0) * .4, cy = by0 - Hp * .04, h = Hp * .13; x.beginPath(); x.moveTo(cx - cw, cy); x.lineTo(cx - cw * .9, cy - h); x.lineTo(cx - cw * .4, cy - h * .45); x.lineTo(cx, cy - h * 1.15); x.lineTo(cx + cw * .4, cy - h * .45); x.lineTo(cx + cw * .9, cy - h); x.lineTo(cx + cw, cy); x.stroke(); [-.9, 0, .9].forEach(k => { x.beginPath(); x.arc(cx + cw * k, cy - h * (k ? 1.05 : 1.25), th * .8, 0, 7); x.fill(); }); }
    else if (d.halo) { const hx = bx0 + (bx1 - bx0) * (.15 + r() * .3); x.beginPath(); x.ellipse(hx, by0 - Hp * .07, Hp * .13, Hp * .045, -.15, 0, 7); x.stroke(); }
    if (d.under && !d.swash) { const uy = by1 + Hp * .07, u0 = bx0 + (bx1 - bx0) * .05, u1 = bx1 - (bx1 - bx0) * (.1 + r() * .2); chisel(x, smooth([[u0, uy + Hp * .02], [(u0 + u1) / 2, uy], [u1, uy - Hp * .01]], 4), W * .9, d.nibA, true, true, d.contrast); x.beginPath(); x.arc(u1 + W * 1.4, uy - Hp * .01, W * .55, 0, 7); x.fill(); if (r() < .5) { x.fillRect(u0 + (u1 - u0) * .2, uy + Hp * .06, (u1 - u0) * .4, th); } }
    if (d.dashes) { const cy = (by0 + by1) / 2; x.fillRect(bx0 - W * 3.2, cy, W * 2, th); x.fillRect(bx1 + W * 1.2, cy - W, W * 2, th); }
    if (d.stars) for (let k = 0; k < 2; k++) { const sx = k ? bx1 + W * 1.5 : bx0 - W * 1.5, sy = by0 + Hp * .05; x.beginPath(); for (let j = 0; j < 8; j++) { const a = j * PI / 4, rr = j % 2 ? W * .3 : W * 1.2; x.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); } x.closePath(); x.fill(); }
    if (d.quotes) { const qx = bx1 + W * .8, qy = by0; x.fillRect(qx, qy, th, Hp * .1); x.fillRect(qx + th * 2.2, qy, th, Hp * .1); }
    // le colature: dai punti più bassi dei tratti verticali
    if (d.drip || tool === 'mtag') {
      const main = []; segs.forEach(({ pts, t }) => { if (!t.swash && !t.link && !t.acc) pts.forEach(q => main.push(q)); }); const lows = main.filter((q, i) => i % 3 === 0).sort((a, b) => b[1] - a[1]).slice(0, 18),   /* [writer] cola dalle lettere, non dallo svolazzo né dalla sottolineatura */ n = 2 + Math.floor(r() * (tool === 'mtag' ? 6 : 4));
      x.lineCap = 'round';
      for (let k = 0; k < n && lows.length; k++) { const q = lows[Math.floor(r() * lows.length)], l = Hp * (.06 + r() * .26) * (HSt ? .4 + r() * r() * 1.6 : 1), w = Math.max(1, W * (HSt ? .08 + r() * .14 : .18 + r() * .2));   /* [writer] le colature del marker: fili sottili, lunghe e corte */ x.lineWidth = w; x.beginPath(); x.moveTo(q[0], q[1]); x.lineTo(q[0] + (r() - .5), q[1] + l); x.stroke(); x.beginPath(); x.arc(q[0], q[1] + l, w * (HSt ? .55 : .8), 0, 7); x.fill(); }
    }
    x.restore();
    return { path, W };
  }
  return { STILI, A, HS, SIGNED, handLayout, dna, glyph, fontFor, layout, handTag, chisel, smooth, mulberry };
})();
if (typeof module !== 'undefined') module.exports = WriterMano;
