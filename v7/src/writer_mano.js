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
      crown: r() < .22, halo: r() < .2, under: r() < .45, dashes: r() < .3, stars: r() < .25, quotes: r() < .15, drip: r() < .55,
      spray: r() < .5, grain: .3 + r() * .7, wob: .005 + r() * .02,
    };
  }
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
  // la punta larga trascinata lungo il percorso: un quadrilatero per segmento, tutti in un tracciato solo (niente giunture più scure)
  function chisel(x, pts, W, ang, taper0, taper1, contrast) {
    if (pts.length < 2) { x.beginPath(); x.arc(pts[0][0], pts[0][1], W * .5, 0, 7); x.fill(); return; }
    const nx = Math.cos(ang) * W / 2, ny = Math.sin(ang) * W / 2, L = pts.length - 1, base = Math.max(1, W * .16);
    x.beginPath();
    for (let i = 0; i < L; i++) {
      const a = pts[i], b = pts[i + 1], t0 = i / L, t1 = (i + 1) / L;
      const p = t => Math.min(1, taper0 ? Math.min(1, .35 + t / .2) : 1, taper1 ? Math.min(1, .15 + (1 - t) / .25) : 1);
      // il contrasto: dove il tratto corre lungo la punta resta il filo sottile (base), mai zero
      const s0 = p(t0), s1 = p(t1);
      const k = 1;   // la sezione la fa la geometria della punta
      x.moveTo(a[0] - nx * s0 * k, a[1] - ny * s0 * k); x.lineTo(a[0] + nx * s0 * k, a[1] + ny * s0 * k); x.lineTo(b[0] + nx * s1 * k, b[1] + ny * s1 * k); x.lineTo(b[0] - nx * s1 * k, b[1] - ny * s1 * k); x.closePath();
    }
    x.fill();
    // il filo: anche dove la punta corre di taglio resta una linea
    x.save(); x.lineWidth = base; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = x.fillStyle; x.beginPath(); pts.forEach((q, i) => i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1])); x.stroke(); x.restore();
  }

  // ---------------- LA TAG ----------------
  // la parola nella mano: i tratti in pixel (y in giù), già inclinati, rimbalzati, con la prima lettera grande e lo svolazzo
  function layout(text, d, r) {
    if (d.goth) d = Object.assign({}, d, { nibA: -.78, nibW: .3, wide: d.vert ? 1.25 : .9, contrast: .9, mix: 0, slant: d.vert ? 0 : .08, bigFirst: 1.15, tall: 1.3, adv: .62, swash: false, flick: true, bounce: .02, arc: 0, crown: false, halo: false, under: false, dashes: false, stars: false, quotes: false });
    const s = DEACC(text), strokes = []; let x = 0;
    [...s].forEach((ch, i) => {
      const g = glyph(ch, d, i); if (!g) { x += .35; return; }
      const sz = (i === 0 ? d.bigFirst : 1) * (1 + (r() - .5) * .12), by = d.bounce * (i % 2 ? 1 : -1) * (.5 + r()) + d.arc * Math.sin((i + .5) / Math.max(1, s.length) * PI);
      let gx1 = 0; g.forEach(tr => tr.forEach(([u]) => { gx1 = Math.max(gx1, u); }));
      g.forEach(tr => {
        const pts = tr.map(([u, v]) => { const vv = v > .9 ? .9 + (v - .9) * d.tall * 2.2 : v; let X = (d.vert ? -gx1 * d.wide * sz / 2 : x) + u * d.wide * sz, Y = (vv * sz + by - (d.vert ? i * 1.05 : 0)); X += Y * d.slant; return [X + (r() - .5) * d.wob * 4, -Y + (r() - .5) * d.wob * 4]; });
        strokes.push({ pts, i });
      });
      if (!d.vert) x += (gx1 * d.wide + .08) * sz * (d.adv / .65);
    });
    if (!strokes.length) return { strokes, box: [0, 0, 1, 1] };
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
    if (d.goth) d = Object.assign({}, d, { crown: false, halo: false, under: false, dashes: false, stars: false, quotes: false, spray: false, nibW: .3, nibA: -.78, contrast: .9 });
    const L = layout(text, d, r), [x0, y0, x1, y1] = L.box, decoT = d.crown || d.halo ? .22 : .06, decoB = d.under || d.swash ? .2 : .08;
    const sc = Math.min((Wp * .9) / Math.max(.1, x1 - x0), (Hp * (1 - decoT - decoB)) / Math.max(.1, y1 - y0)), ox = (Wp - (x1 - x0) * sc) / 2 - x0 * sc, oy = Hp * decoT - y0 * sc;
    const P = t => t.map(([a, b]) => [a * sc + ox, b * sc + oy]);
    const W = Math.max(2, sc * d.nibW * (tool === 'mtag' ? 1.1 : 1)), spray = tool !== 'mtag' && d.spray, path = [];
    x.save(); x.fillStyle = col; x.strokeStyle = col; x.lineJoin = 'round'; x.lineCap = 'round';
    if (spray) { x.shadowColor = col; x.shadowBlur = W * 1.1; }
    const segs = L.strokes.map(t => { const pts = smooth(P(t.pts), 5); pts.forEach(q => path.push(q)); return { pts, t }; });
    segs.forEach(({ pts, t }) => chisel(x, pts, W * (t.swash ? .8 : 1), d.nibA, true, t.flick || t.swash || pts.length > 6, d.contrast));
    x.shadowBlur = 0;
    if (d.goth) { x.lineWidth = Math.max(1, W * .1); x.lineCap = 'round'; segs.forEach(({ pts }) => { if (pts.length < 3 || r() < .6) return; const e = pts[pts.length - 1], p0 = pts[pts.length - 3], dx = e[0] - p0[0], dy = e[1] - p0[1], l = hyp(dx, dy) || 1, ux = dx / l, uy = dy / l, L2 = W * (1.5 + r() * 1.5), sg = r() < .5 ? 1 : -1; x.beginPath(); x.moveTo(e[0], e[1]); x.bezierCurveTo(e[0] + ux * L2 * .6, e[1] + uy * L2 * .6, e[0] + ux * L2 - uy * L2 * .5 * sg, e[1] + uy * L2 + ux * L2 * .5 * sg, e[0] + ux * L2 * .7 - uy * L2 * .9 * sg, e[1] + uy * L2 * .7 + ux * L2 * .9 * sg); x.stroke(); }); }   // i riccioli del gotico
    // la grana dello spray: puntini attorno ai tratti
    if (spray) { x.globalAlpha = .35; for (let k = 0; k < path.length * d.grain * .6; k++) { const q = path[Math.floor(r() * path.length)], a = r() * PI * 2, rr = W * (.6 + r() * 1.4); x.fillRect(q[0] + Math.cos(a) * rr, q[1] + Math.sin(a) * rr, 1.2, 1.2); } x.globalAlpha = 1; }
    // l'inchiostro del marker: la goccia dove si appoggia
    if (!spray) segs.forEach(({ pts }) => { if (r() < .5) { x.beginPath(); x.arc(pts[0][0], pts[0][1], W * .42, 0, 7); x.fill(); } });
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
      const lows = path.filter((q, i) => i % 3 === 0).sort((a, b) => b[1] - a[1]).slice(0, 18), n = 2 + Math.floor(r() * (tool === 'mtag' ? 6 : 4));
      x.lineCap = 'round';
      for (let k = 0; k < n && lows.length; k++) { const q = lows[Math.floor(r() * lows.length)], l = Hp * (.06 + r() * .26), w = Math.max(1, W * (.18 + r() * .2)); x.lineWidth = w; x.beginPath(); x.moveTo(q[0], q[1]); x.lineTo(q[0] + (r() - .5), q[1] + l); x.stroke(); x.beginPath(); x.arc(q[0], q[1] + l, w * .8, 0, 7); x.fill(); }
    }
    x.restore();
    return { path, W };
  }
  return { A, dna, glyph, fontFor, layout, handTag, chisel, smooth, mulberry };
})();
if (typeof module !== 'undefined') module.exports = WriterMano;
