/* Porto Vecchio — i pennelli dei graffiti (v7, [graffiti]). Pennelli procedurali, tutti nostri (niente pennelli scaricati):
   la bomboletta (cap standard, fat cap, skinny cap), il rullo, il pennarello (mop/marker), l'adesivo, e la GRANA del muro.
   - LA BOMBOLETTA: una nuvola di puntini con la densità che cala dal centro (gaussiana), l'overspray (l'alone di polvere
     fine attorno), i puntini e gli schizzi (speckle e splatter), le colature dove la vernice si accumula (la mano si ferma o
     rallenta), lo spessore che cala con la velocità della mano. Fat cap: largo e morbido, cola di più; skinny: stretto e netto.
   - IL RULLO: una banda larga e piatta, la copertura irregolare, le strisce del rullo che si asciuga (più si va avanti meno
     vernice), il bordo carico (le creste ai lati della banda), il segno della partenza e della fermata, le colature grosse.
   - IL PENNARELLO: la punta a scalpello, l'inchiostro che si raccoglie dove si appoggia e dove si ferma, le colature sottili
     del mop. L'ADESIVO: l'etichetta di carta con la tag a pennarello, gli angoli tondi, un angolo che si stacca.
   - LA GRANA (grit): la vernice si rompe sulla grana dell'intonaco, nelle fughe dei mattoni, sul cemento poroso; poco sul
     metallo. E l'età: i lavori vecchi sbiadiscono, perdono colore e si scrostano.
   Tutti i numeri stanno in PENNELLI (i pennelli), SUPERFICI (i muri) e USO (che pennello usa ogni lavoro): si ritocca lì.
   Gira dove gira il disegno dei lavori: nel disegnatore a parte (Web Worker, OffscreenCanvas: writing.js) o nella pagina.
   Tutto dal seme: lo stesso lavoro esce uguale. */
var Pennelli = (function () {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), hyp = Math.hypot, PI = Math.PI;
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  const gauss = r => { let u = 0; for (let k = 0; k < 3; k++) u += r(); return (u - 1.5) / .5; };   // circa normale (somma di tre)

  // ================= LA TABELLA DEI PENNELLI =================
  // size: lo spessore (× quello del tratto, in m per i tratti a mano: vedi M), flow: quanta vernice esce, pressure: quanto si
  // preme (pieno al centro), drip: le colature (0-1), grit: quanto la vernice sente la grana del muro, cap: il tappo.
  // Solo bomboletta: overspray (l'alone), speckle (i puntini fuori), splatter (gli schizzi), speedK (quanto stringe veloce).
  // Solo rullo: dry (quanto si asciuga lungo la passata), edge (le creste ai bordi), marks (i segni di partenza e fermata).
  // Solo pennarello: pool (la goccia dove si ferma). Solo adesivo: peel (quanto si stacca l'angolo).
  const PENNELLI = {
    spray:   { nome: 'bomboletta', size: 1,   flow: .8,  pressure: .7,  drip: .35, grit: .5,  cap: 'standard', overspray: .22, speckle: .5,  splatter: .12, speedK: .45, M: .05 },
    fat:     { nome: 'fat cap',    size: 1.9, flow: .9,  pressure: .8,  drip: .55, grit: .45, cap: 'fat',      overspray: .34, speckle: .7,  splatter: .22, speedK: .55, M: .05 },
    skinny:  { nome: 'skinny cap', size: .5,  flow: .7,  pressure: .8,  drip: .18, grit: .35, cap: 'skinny',   overspray: .1,  speckle: .3,  splatter: .04, speedK: .35, M: .05 },
    roller:  { nome: 'rullo',      size: 1,   flow: .85, pressure: .6,  drip: .3,  grit: .7,  cap: 'rullo',    dry: .45, edge: .35, marks: .6, M: .22 },
    marker:  { nome: 'pennarello', size: 1,   flow: 1,   pressure: .9,  drip: .3,  grit: .22, cap: 'mop',      pool: .55, M: .022 },
    sticker: { nome: 'adesivo',    size: 1,   flow: 1,   pressure: 1,   drip: 0,   grit: .08, cap: 'carta',    peel: .35 },
  };
  // la grana dei muri: grain (quanto è ruvido), cell (la misura della grana, cm), joints (le fughe: 1 i mattoni), bw/bh (il mattone, m)
  const SUPERFICI = {
    intonaco: { grain: .55, cell: 1.2, joints: 0 },
    mattoni:  { grain: .35, cell: .8, joints: 1, bw: .25, bh: .065, jw: .012 },
    cemento:  { grain: .45, cell: .5, joints: 0, pori: .5 },
    pietra:   { grain: .6, cell: 2.5, joints: 1, bw: .42, bh: .22, jw: .02, mosso: .5 },
    metallo:  { grain: .12, cell: .4, joints: 0 },
    legno:    { grain: .3, cell: .6, joints: 0, venatura: 1 },
  };
  // che pennello usa ogni lavoro (e la superficie per difetto di ogni appoggio)
  const USO = { tag: 'skinny', mtag: 'marker', throw: 'fat', pezzo: 'spray', burner: 'spray', gotico: 'skinny', mostro: 'roller', wholecar: 'fat', rullo: 'roller', sticker: 'sticker',
    // [unione-graffiti] gli stili della strada di writer_arte.js: il verticale a rullo prende il rullo (vedi art), quelli a bolle e il pixo la bomboletta
    verticale: 'spray', estintore: 'fat', stencil: 'spray', scritta: 'spray', calli: 'spray', murale: 'roller', manifesto: 'sticker', adesivi: 'sticker' };
  // [unione-graffiti] sul disegno di writer_arte.js (le lettere dai font, gli stili, la SUA grana della vernice: le passate, i pori, la
  // nebbia stretta, i puntini dell'overspray, le colature disegnate nella forma) i pennelli passano solo quello che lui non fa, e meno:
  // la grana del MURO dove sta il lavoro (intonaco, mattoni con le fughe, cemento, il metallo dei mezzi) e i giorni sul muro, la
  // polvere del tappo (fat più larga, skinny appena), qualche colatura in più e, nei rulli, la passata del rullo che si asciuga.
  // polvere / colature / grit: quanto dei pennelli resta sopra la sua resa (1 = come sui disegni nostri, la tavoletta e l'adesivo);
  // gli schizzi (splatter) no: prendono il colore dai bianchi del bordo e delle luci e li spargono sulle lettere
  const SU_ARTE = { polvere: .45, colature: .5, grit: .6, rullata: .6 };
  const RULLATO = { rullo: 1, verticale: 'rullo' };   // dove passa il rullo sulle lettere (il verticale solo se è della famiglia rullo)
  const SUP_DI = { muro: 'intonaco', treno: 'metallo', vagone: 'metallo', auto: 'metallo' };
  // l'età: i giorni sul muro → quanto sbiadisce (alfa e colore) e quanto si scrosta
  const ETA = { fade: .07, desat: .1, chips: .05, max: 6 };
  const tune = (k, o) => Object.assign({}, PENNELLI[k] || PENNELLI.spray, o || {});

  // ================= LA PUNTA: il puntino morbido =================
  // un puntino di vernice con la densità che cala dal centro: una sprite per colore, disegnata una volta
  const DOT = new Map();
  function dot(col) {
    let d = DOT.get(col); if (d) return d; const S = 32, c = cv(S, S), x = c.getContext('2d'), g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, col); g.addColorStop(.45, col); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, S, S);
    x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, S, S);   // il colore pieno, l'alfa del gradiente
    if (DOT.size > 40) DOT.clear(); DOT.set(col, c); return c;
  }
  // la velocità della mano e la sosta lungo il tratto: pts = [[x, y, t(ms)?, pressione?], ...]
  function speeds(pts) {
    const n = pts.length, v = new Float32Array(n), hasT = pts.some(q => q[2] != null && q[2] > 0); let L = 0;
    for (let i = 1; i < n; i++) L += hyp(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const mean = L / Math.max(1, n - 1);
    for (let i = 0; i < n; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], d = hyp(b[0] - a[0], b[1] - a[1]), dt = hasT ? Math.max(1, (b[2] || 0) - (a[2] || 0)) : 0; v[i] = hasT ? d / dt : d / Math.max(1e-3, mean * 2); }
    let vm = 0; for (let i = 0; i < n; i++) vm += v[i]; vm = vm / Math.max(1, n) || 1; for (let i = 0; i < n; i++) v[i] = clamp(v[i] / (vm * 1.6), 0, 1.5);   // 1 ≈ la mano veloce del tratto
    return v;
  }

  // ================= LA BOMBOLETTA =================
  // un tratto: w0 lo spessore pieno in pixel. Ritorna i punti dove la vernice si è accumulata (per le colature)
  function spray(x, pts, col, w0, P, r) {
    P = P || PENNELLI.spray; if (!pts.length) return [];
    const v = speeds(pts), D = dot(col), heavy = [], fine = [];
    let acc = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[Math.min(pts.length - 1, i + 1)], pr = a[3] != null ? a[3] : P.pressure, sp = v[i];
      const w = Math.max(1.2, w0 * P.size * (1 - P.speedK * Math.min(1, sp)) * (.55 + .7 * pr)), seg = hyp(b[0] - a[0], b[1] - a[1]);
      const steps = Math.max(1, Math.ceil(seg / Math.max(.8, w * .18)));
      for (let s = 0; s < steps; s++) {
        const t = s / steps, px = a[0] + (b[0] - a[0]) * t, py = a[1] + (b[1] - a[1]) * t;
        // il getto: il nocciolo pieno (la sprite morbida), la nuvola attorno (puntini a gaussiana), l'alone fine (overspray)
        x.globalAlpha = clamp(P.flow * (.25 + .5 * pr) * (1.1 - .4 * Math.min(1, sp)), .05, 1); x.drawImage(D, px - w * .62, py - w * .62, w * 1.24, w * 1.24);
        const nd = Math.round(2 + w * .5 * P.flow);
        for (let k = 0; k < nd; k++) { const rr = Math.abs(gauss(r)) * w * .38, an = r() * PI * 2; fine.push(px + Math.cos(an) * rr, py + Math.sin(an) * rr, .5 + r() * .5); }
        const no = Math.round(w * P.overspray * 1.4);
        for (let k = 0; k < no; k++) { const rr = w * (.5 + Math.abs(gauss(r)) * .55), an = r() * PI * 2; fine.push(px + Math.cos(an) * rr, py + Math.sin(an) * rr, .12 + r() * .18); }
        acc += P.flow * (1.2 - Math.min(1, sp)) * (.6 + pr * .6);
      }
      if (sp < .35 || acc > 26) { if (acc > 9) heavy.push([a[0], a[1] + w * .3, w, acc]); acc *= .35; }   // la mano si è fermata: lì c'è tanta vernice
      else acc *= .92;
    }
    // i puntini: quelli del getto e quelli dell'overspray, un pixel o due
    x.fillStyle = col; for (let k = 0; k < fine.length; k += 3) { x.globalAlpha = fine[k + 2]; const s = fine[k + 2] > .4 && r() < .2 ? 1.6 : 1; x.fillRect(fine[k], fine[k + 1], s, s); }
    // lo speckle (i puntini più grossi che scappano lontano) e lo splatter (gli schizzi con la coda)
    const L = pts.length;
    for (let k = 0; k < L * P.speckle * .5; k++) { const q = pts[Math.floor(r() * L)], an = r() * PI * 2, rr = w0 * P.size * (.7 + r() * 1.3); x.globalAlpha = .25 + r() * .45; const s = 1 + r() * Math.max(1, w0 * .05); x.beginPath(); x.arc(q[0] + Math.cos(an) * rr, q[1] + Math.sin(an) * rr, s * .5, 0, 7); x.fill(); }
    for (let k = 0; k < L * P.splatter * .06; k++) splat(x, pts[Math.floor(r() * L)], w0 * P.size, col, r);
    x.globalAlpha = 1;
    return heavy;
  }
  // uno schizzo: la macchia, le goccioline attorno, a volte la coda nel verso del getto
  function splat(x, q, w, col, r) {
    const an = r() * PI * 2, d = w * (.4 + r() * 1.1), cx = q[0] + Math.cos(an) * d, cy = q[1] + Math.sin(an) * d, s = Math.max(1, w * (.06 + r() * .1));
    x.fillStyle = col; x.globalAlpha = .75 + r() * .25; x.beginPath(); x.arc(cx, cy, s, 0, 7); x.fill();
    for (let k = 0; k < 3 + r() * 5; k++) { const a2 = r() * PI * 2, d2 = s * (1.4 + r() * 2.2); x.beginPath(); x.arc(cx + Math.cos(a2) * d2, cy + Math.sin(a2) * d2, s * (.15 + r() * .3), 0, 7); x.fill(); }
    if (r() < .4) { x.lineWidth = s * .5; x.strokeStyle = col; x.lineCap = 'round'; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(an) * s * 4, cy + Math.sin(an) * s * 4); x.stroke(); }
  }
  // una colatura: il filo che scende (si stringe, ondeggia appena) e la goccia in fondo
  function drip(x, px, py, w, len, col, r) {
    if (len < 2) return; const wob = (r() - .5) * w * .5, w2 = Math.max(.8, w);
    x.fillStyle = col; x.globalAlpha = .92; x.beginPath(); x.moveTo(px - w2, py); x.quadraticCurveTo(px - w2 * .5 + wob, py + len * .55, px - w2 * .35 + wob, py + len); x.lineTo(px + w2 * .35 + wob, py + len); x.quadraticCurveTo(px + w2 * .5 + wob, py + len * .55, px + w2, py); x.closePath(); x.fill();
    x.beginPath(); x.ellipse(px + wob, py + len + w2 * .3, w2 * .6, w2 * .85, 0, 0, 7); x.fill(); x.globalAlpha = 1;
  }

  // ================= IL RULLO =================
  // una passata: pts lungo il verso del rullo, W la larghezza della banda in pixel. La banda piena, poi la vernice che si consuma
  function roller(x, pts, col, W, P, r) {
    P = P || PENNELLI.roller; if (pts.length < 2) return [];
    let L = 0; const sl = [0]; for (let i = 1; i < pts.length; i++) { L += hyp(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); sl.push(L); }
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; pts.forEach(q => { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); });
    const pad = W, bw = Math.ceil(x1 - x0 + pad * 2), bh = Math.ceil(y1 - y0 + pad * 2), ox = x0 - pad, oy = y0 - pad;
    const B = cv(bw, bh), b = B.getContext('2d'), M = cv(bw, bh), m = M.getContext('2d');
    // la banda: un nastro rettangolare perpendicolare al verso (il rullo non ruota col tratto: resta di traverso)
    const left = [], right = [];
    for (let i = 0; i < pts.length; i++) { const a = pts[Math.max(0, i - 1)], c = pts[Math.min(pts.length - 1, i + 1)], dx = c[0] - a[0], dy = c[1] - a[1], l = hyp(dx, dy) || 1, nx = -dy / l, ny = dx / l, h = W / 2 * (1 + (r() - .5) * .04);
      left.push([pts[i][0] - ox + nx * h, pts[i][1] - oy + ny * h]); right.push([pts[i][0] - ox - nx * h, pts[i][1] - oy - ny * h]); }
    b.fillStyle = col; b.beginPath(); left.forEach((q, k) => k ? b.lineTo(q[0], q[1]) : b.moveTo(q[0], q[1])); for (let k = right.length - 1; k >= 0; k--) b.lineTo(right[k][0], right[k][1]); b.closePath(); b.fill();
    // il rullo si asciuga: strisce nel verso della passata dove la vernice manca, sempre di più verso la fine
    m.lineCap = 'butt'; const nS = Math.round(10 + W * .25);
    for (let k = 0; k < nS; k++) { const o = (r() - .5) * W * .92, t0 = r() * .5, dry = P.dry * (.4 + r() * .9);
      m.strokeStyle = '#000'; m.lineWidth = Math.max(.8, W * (.008 + r() * .03)); m.beginPath(); let first = true;
      for (let i = 0; i < pts.length; i++) { const u = sl[i] / (L || 1); if (u < t0) continue; const a = pts[Math.max(0, i - 1)], c = pts[Math.min(pts.length - 1, i + 1)], dx = c[0] - a[0], dy = c[1] - a[1], l = hyp(dx, dy) || 1, X = pts[i][0] - ox - dy / l * o, Y = pts[i][1] - oy + dx / l * o; if (first) { m.moveTo(X, Y); first = false; } else m.lineTo(X, Y); }
      m.globalAlpha = clamp(dry * .55, 0, .9); m.stroke(); }
    // la grana del rullo: la spugna lascia la copertura a buchini, più radi dove c'è più vernice
    const id = m.getImageData(0, 0, bw, bh), A = id.data, cell = Math.max(1, Math.round(W * .015));
    for (let yy = 0; yy < bh; yy += cell) for (let xx = 0; xx < bw; xx += cell) { if (r() > .22 * P.dry + .04) continue; const a0 = 60 + r() * 140; for (let j = 0; j < cell; j++) for (let i = 0; i < cell; i++) { const q = ((yy + j) * bw + xx + i) * 4; if (q < A.length) A[q + 3] = Math.max(A[q + 3], a0); } }
    m.putImageData(id, 0, 0);
    b.globalCompositeOperation = 'destination-out'; b.drawImage(M, 0, 0); b.globalCompositeOperation = 'source-over';
    // le creste ai bordi: la vernice spinta fuori dai lati del rullo, più scura e più piena, un filo fuori registro
    b.save(); b.globalCompositeOperation = 'source-atop'; b.lineWidth = Math.max(1, W * .035);
    [[left, 1], [right, -1]].forEach(([E]) => { b.strokeStyle = 'rgba(0,0,0,' + (.12 + P.edge * .3).toFixed(2) + ')'; b.beginPath(); E.forEach((q, k) => k ? b.lineTo(q[0], q[1]) : b.moveTo(q[0], q[1])); b.stroke(); });
    b.restore();
    b.save(); b.strokeStyle = col; b.globalAlpha = .55 + P.edge * .4; b.lineWidth = Math.max(1, W * .02); [left, right].forEach(E => { b.beginPath(); E.forEach((q, k) => { const jx = (r() - .5) * W * .015; k ? b.lineTo(q[0] + jx, q[1] + jx) : b.moveTo(q[0], q[1]); }); b.stroke(); }); b.restore();
    // la partenza e la fermata: dove il rullo si appoggia e dove si alza resta una riga carica di traverso
    if (P.marks > 0) { [[0, 1], [pts.length - 1, -1]].forEach(([i]) => { b.strokeStyle = col; b.globalAlpha = .7 * P.marks; b.lineWidth = Math.max(1.5, W * .06); b.beginPath(); b.moveTo(left[i][0], left[i][1]); b.lineTo(right[i][0], right[i][1]); b.stroke(); b.globalAlpha = .25 * P.marks; b.strokeStyle = 'rgba(0,0,0,.6)'; b.lineWidth = Math.max(1, W * .015); b.stroke(); }); b.globalAlpha = 1; }
    x.drawImage(B, ox, oy);
    // dove il rullo si ferma cola: la vernice in fondo alla banda, grossa
    const heavy = []; const e = pts[pts.length - 1]; heavy.push([e[0], e[1] + W * .45, W * .25, 30]); if (P.drip > .2) { const q = pts[Math.floor(pts.length * (.3 + r() * .4))]; heavy.push([q[0] + (r() - .5) * W * .6, q[1] + W * .45, W * .2, 20]); }
    return heavy;
  }

  // ================= IL PENNARELLO =================
  // la punta a scalpello (nibA l'angolo): largo di traverso alla punta, sottile lungo; l'inchiostro si raccoglie dove si ferma
  function marker(x, pts, col, w0, P, r, nibA) {
    P = P || PENNELLI.marker; if (!pts.length) return []; const v = speeds(pts), na = nibA != null ? nibA : -.75, heavy = [];
    x.fillStyle = col; x.strokeStyle = col; x.globalAlpha = .93;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dir = Math.atan2(b[1] - a[1], b[0] - a[0]), q = pts[i];
      const w = Math.max(1, w0 * P.size * (.3 + .7 * Math.abs(Math.sin(dir - na))) * (1.1 - .3 * Math.min(1, v[i]))), c = Math.cos(na), s = Math.sin(na), h = w0 * P.size * .5, t = Math.max(.8, w * .22);
      x.beginPath(); x.moveTo(q[0] - c * h - s * t, q[1] - s * h + c * t); x.lineTo(q[0] + c * h - s * t, q[1] + s * h + c * t); x.lineTo(q[0] + c * h + s * t, q[1] + s * h - c * t); x.lineTo(q[0] - c * h + s * t, q[1] - s * h - c * t); x.closePath(); x.fill();
      if (i === 0 || i === pts.length - 1 || v[i] < .15) { x.beginPath(); x.ellipse(q[0], q[1] + w0 * .1, w0 * P.size * .45 * (.6 + P.pool), w0 * P.size * .38 * (.6 + P.pool), na, 0, 7); x.fill(); if (P.flow > .8) heavy.push([q[0], q[1] + w0 * .3, Math.max(.8, w0 * .12), 14 * P.flow]); }
    }
    x.globalAlpha = 1; return heavy;
  }

  // ================= L'ADESIVO =================
  // l'etichetta: carta con gli angoli tondi, la fascia colorata in cima (con la scritta), il riquadro bianco con la tag a
  // pennarello (drawTag(ctx, w, h) la disegna), l'ombra sottile, un angolo che si stacca e si piega
  const STICK = [['#d8201a', 'CIAO, SONO'], ['#2a6ac8', 'CIAO, SONO'], ['#f2efe6', ''], ['#f2d23a', ''], ['#3a9a5a', 'SALUTI DA']];
  function sticker(x, X, Y, Wd, Hd, r, drawTag, P) {
    P = P || PENNELLI.sticker; const [band, txt] = STICK[Math.floor(r() * STICK.length)], rot = (r() - .5) * .16, rad = Math.min(Wd, Hd) * .08;
    x.save(); x.translate(X + Wd / 2, Y + Hd / 2); x.rotate(rot); x.translate(-Wd / 2, -Hd / 2);
    const rr = (a, b, w, h, k) => { x.beginPath(); x.moveTo(a + k, b); x.lineTo(a + w - k, b); x.quadraticCurveTo(a + w, b, a + w, b + k); x.lineTo(a + w, b + h - k); x.quadraticCurveTo(a + w, b + h, a + w - k, b + h); x.lineTo(a + k, b + h); x.quadraticCurveTo(a, b + h, a, b + h - k); x.lineTo(a, b + k); x.quadraticCurveTo(a, b, a + k, b); x.closePath(); };
    x.fillStyle = 'rgba(0,0,0,.22)'; rr(Wd * .015, Hd * .03, Wd, Hd, rad); x.fill();   // l'ombra: la carta è spessa un filo
    x.fillStyle = band; rr(0, 0, Wd, Hd, rad); x.fill();
    const hb = txt ? Hd * .3 : Hd * .1; x.fillStyle = '#fbfaf5'; rr(Wd * .06, hb, Wd * .88, Hd - hb - Hd * .08, rad * .5); x.fill();
    if (txt) { x.fillStyle = band === '#f2efe6' ? '#141418' : '#fbfaf5'; x.font = `bold ${Math.max(6, Hd * .17).toFixed(0)}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, Wd / 2, hb * .52); }
    x.save(); x.beginPath(); x.rect(Wd * .06, hb, Wd * .88, Hd - hb - Hd * .08); x.clip(); x.translate(Wd * .08, hb); drawTag(x, Wd * .84, Hd - hb - Hd * .08); x.restore();
    // l'angolo che si stacca: un triangolo piegato, il retro della carta più chiaro, il muro sotto
    if (r() < P.peel + .3) { const k = Math.min(Wd, Hd) * (.12 + r() * .14) * (P.peel + .4); x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.moveTo(Wd - k, Hd); x.lineTo(Wd, Hd - k); x.lineTo(Wd, Hd); x.closePath(); x.fill(); x.globalCompositeOperation = 'source-over';
      x.fillStyle = '#e6e2d6'; x.beginPath(); x.moveTo(Wd - k, Hd); x.lineTo(Wd, Hd - k); x.lineTo(Wd - k * .9, Hd - k * .9); x.closePath(); x.fill(); x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 1; x.stroke(); }
    // i graffi: qualcuno ha provato a toglierlo
    x.globalCompositeOperation = 'destination-out'; x.strokeStyle = 'rgba(0,0,0,.5)'; x.lineWidth = Math.max(1, Hd * .012);
    for (let k = 0; k < 2 + r() * 3; k++) { const a = r() * Wd, b = r() * Hd; x.beginPath(); x.moveTo(a, b); x.lineTo(a + (r() - .5) * Wd * .3, b + (r() - .5) * Hd * .2); x.stroke(); }
    x.restore();
  }

  // ================= LA GRANA DEL MURO E L'ETÀ =================
  // la maschera: dove la vernice manca (0-255). Uguale per tutte le tappe dello stesso lavoro (dal seme e dalla superficie)
  const MASK = new Map();
  function gritMask(Wp, Hp, ppm, sup, seed, amt, eta) {
    const key = [Wp, Hp, ppm | 0, sup, seed, amt.toFixed(2), eta || 0].join(':'); if (MASK.has(key)) return MASK.get(key);
    const S = SUPERFICI[sup] || SUPERFICI.intonaco, r = mulberry((seed ^ 0x9e3779b9) + (sup.length * 131)), out = new Uint8Array(Wp * Hp);
    // il rumore a valori su due scale: la grana (cell cm) e le macchie larghe (dove il muro beve di più)
    const cpx = Math.max(1, S.cell / 100 * ppm), gw = Math.ceil(Wp / cpx) + 2, gh = Math.ceil(Hp / cpx) + 2, g = new Float32Array(gw * gh); for (let i = 0; i < g.length; i++) g[i] = r();
    const lc = Math.max(4, .35 * ppm), lw = Math.ceil(Wp / lc) + 2, lh = Math.ceil(Hp / lc) + 2, Lg = new Float32Array(lw * lh); for (let i = 0; i < Lg.length; i++) Lg[i] = r();
    const val = (G, w, X, Y) => { const i = Math.floor(X), j = Math.floor(Y), fx = X - i, fy = Y - j, a = G[j * w + i], b = G[j * w + i + 1], c = G[(j + 1) * w + i], d = G[(j + 1) * w + i + 1], sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy); return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy; };
    const bw = (S.bw || 1) * ppm, bh = (S.bh || 1) * ppm, jw = Math.max(.8, (S.jw || .01) * ppm), age = Math.min(ETA.max, eta || 0);
    const thr = S.grain * amt * .55 + age * ETA.chips;   // sotto questa soglia la vernice salta (i buchini della grana)
    for (let y = 0; y < Hp; y++) {
      const row = Math.floor(y / bh), off = row % 2 ? bw / 2 : 0, jy = S.joints ? Math.min(y % bh, bh - (y % bh)) : 1e9;
      for (let x = 0; x < Wp; x++) {
        const n = val(g, gw, x / cpx, y / cpx), m = val(Lg, lw, x / lc, y / lc), k = y * Wp + x;
        let a = 0;
        if (n * (.7 + m * .6) < thr) a = 255 * clamp((thr - n * (.7 + m * .6)) / Math.max(.05, thr) * 1.6, 0, 1);
        if (S.joints) { const jx = Math.min((x + off) % bw, bw - ((x + off) % bw)), j = Math.min(jx, jy); if (j < jw) a = Math.max(a, 255 * clamp(amt * (.55 + .35 * S.joints) * (1 - j / jw * .6), 0, .9)); }   // nella fuga lo spruzzo arriva a metà
        if (S.pori && r() < S.pori * amt * .012) a = 255;   // i pori del cemento
        out[k] = a;
      }
    }
    if (MASK.size > 24) MASK.clear(); MASK.set(key, out); return out;
  }
  // passa la grana e l'età su una tappa del disegno (il canvas si cambia sul posto)
  function grana(c, o) {
    const W = c.width, H = c.height; if (W < 2 || H < 2) return c;
    const P = tune(o.pen), amt = clamp(P.grit * (o.grit != null ? o.grit : 1), 0, 1), eta = Math.min(ETA.max, o.eta || 0), M = gritMask(W, H, o.ppm || 100, o.sup || 'intonaco', o.seed || 1, amt, eta);
    const x = c.getContext('2d'), id = x.getImageData(0, 0, W, H), D = id.data, fade = 1 - eta * ETA.fade, des = eta * ETA.desat, wall = o.wall || [200, 196, 188];
    for (let i = 0, k = 0; i < D.length; i += 4, k++) {
      const a = D[i + 3]; if (!a) continue;
      let na = a * (1 - M[k] / 255) * fade;
      if (des > 0) { const l = (D[i] * .3 + D[i + 1] * .59 + D[i + 2] * .11); D[i] += (l - D[i]) * des + (wall[0] - D[i]) * des * .3; D[i + 1] += (l - D[i + 1]) * des + (wall[1] - D[i + 1]) * des * .3; D[i + 2] += (l - D[i + 2]) * des + (wall[2] - D[i + 2]) * des * .3; }
      D[i + 3] = na;
    }
    x.putImageData(id, 0, 0); return c;
  }
  // le colature di una tappa già disegnata: dove la vernice è piena e spessa (colonne di pixel pieni lunghe) e finisce in
  // basso, scende un filo. Poche, dal seme; il fat cap e il rullo colano di più, lo skinny quasi mai
  function colature(c, o) {
    const P = tune(o.pen), W = c.width, H = c.height, n0 = Math.round(P.drip * (o.dripK != null ? o.dripK : 1) * (2 + W / 120)); if (n0 < 1 || W < 8 || H < 8) return c;
    const x = c.getContext('2d'), D = x.getImageData(0, 0, W, H).data, r = mulberry((o.seed || 1) ^ 0x7f4a7c15), ppm = o.ppm || 100;
    const cand = [];
    for (let k = 0; k < n0 * 6; k++) {
      const xx = Math.floor(r() * W); let run = 0, best = null;
      for (let yy = 0; yy < H - 2; yy++) { const a = D[(yy * W + xx) * 4 + 3]; if (a > 200) run++; else { if (run > ppm * .05 && (!best || run > best.run)) best = { y: yy, run }; run = 0; } }
      if (best) cand.push([xx, best.y, best.run]);
    }
    cand.sort((a, b) => b[2] - a[2]);
    for (let k = 0; k < Math.min(n0, cand.length); k++) {
      const [xx, yy, run] = cand[Math.floor(r() * Math.min(cand.length, n0 * 2))], i = ((yy - 2) * W + xx) * 4, col = `rgb(${D[i]},${D[i + 1]},${D[i + 2]})`;
      const len = Math.min(H - yy - 3, ppm * (.03 + r() * r() * .22) * (.5 + P.drip) * Math.min(2, run / (ppm * .1)));
      drip(x, xx, yy - 1, Math.max(.8, ppm * (P.cap === 'mop' ? .003 : .006) * (.6 + r() * .8) * P.size), len, col, r);
    }
    return c;
  }
  // l'overspray e lo speckle di una tappa: la polvere fine appena fuori dai bordi (la bomboletta non ha mai il bordo netto)
  function polvere(c, o) {
    const P = tune(o.pen); if (!P.overspray) return c; const W = c.width, H = c.height, x = c.getContext('2d'), D = x.getImageData(0, 0, W, H).data, r = mulberry((o.seed || 1) ^ 0x1b873593), ppm = o.ppm || 100;
    const n = Math.round(W * H / 900 * P.speckle * (P.cap === 'fat' ? 1.4 : P.cap === 'skinny' ? .6 : 1) * (o.polK != null ? o.polK : 1)), reach = ppm * (P.cap === 'fat' ? .045 : P.cap === 'skinny' ? .012 : .025);
    for (let k = 0; k < n; k++) { const px = Math.floor(r() * W), py = Math.floor(r() * H), j = (py * W + px) * 4; if (D[j + 3] < 180) continue; const an = r() * PI * 2, d = reach * (.3 + Math.abs(gauss(r))), qx = px + Math.cos(an) * d, qy = py + Math.sin(an) * d; if (qx < 0 || qy < 0 || qx >= W || qy >= H) continue; const jj = ((qy | 0) * W + (qx | 0)) * 4; if (D[jj + 3] > 40) continue;
      x.fillStyle = `rgba(${D[j]},${D[j + 1]},${D[j + 2]},${(.2 + r() * .5).toFixed(2)})`; const s = r() < .12 ? 2 : 1; x.fillRect(qx, qy, s, s); }
    for (let k = 0; k < Math.round(P.splatter * W / 60 * (o.splK != null ? o.splK : 1)); k++) { const px = Math.floor(r() * W), py = Math.floor(r() * H), j = (py * W + px) * 4; if (D[j + 3] < 220) continue; splat(x, [px, py], ppm * .08, `rgb(${D[j]},${D[j + 1]},${D[j + 2]})`, r); }
    x.globalAlpha = 1; return c;
  }
  // [unione-graffiti] LA RULLATA: le lettere già disegnate (i font del rullo di writer_arte.js) passate col rullo nostro: bande
  // dall'alto in basso larghe quanto il rullo (22 cm), un filo sovrapposte, con le strisce dove il rullo si asciuga, la spugna a
  // buchini e il bordo carico; la vernice resta solo dove il rullo l'ha portata. Uguale per tutte le tappe (dal seme)
  const RULL = new Map();
  function rullataMask(W, H, ppm, seed) {
    const key = [W, H, ppm | 0, seed].join(':'); if (RULL.has(key)) return RULL.get(key);
    const r = mulberry((seed ^ 0x5bd1e995) >>> 0), P = tune('roller'), bw = Math.max(6, .22 * ppm), M = cv(W, H), m = M.getContext('2d');
    for (let x0 = bw * .4; x0 < W + bw * .5; x0 += bw * (.8 + r() * .1)) {
      const pts = [], dx = (r() - .5) * bw * .3; for (let y = -bw; y <= H + bw; y += 4) pts.push([x0 + dx * y / H, y]);
      roller(m, pts, '#000', bw, Object.assign({}, P, { marks: 0 }), r);
    }
    const Lo = cv(W, H), lo = Lo.getContext('2d'); lo.fillStyle = '#000'; lo.fillRect(0, 0, W, H); lo.globalCompositeOperation = 'destination-out'; lo.drawImage(M, 0, 0);   // dove il rullo NON ha portato vernice
    if (RULL.size > 8) RULL.clear(); RULL.set(key, Lo); return Lo;
  }
  function rullata(c, o) {
    const W = c.width, H = c.height; if (W < 4 || H < 4) return c;
    const x = c.getContext('2d'); x.save(); x.globalAlpha = clamp(o.rullK != null ? o.rullK : 1, 0, 1); x.globalCompositeOperation = 'destination-out'; x.drawImage(rullataMask(W, H, o.ppm || 100, o.seed || 1), 0, 0); x.restore(); return c;
  }
  // tutto il passaggio di una tappa: polvere (spray), colature, grana ed età. o: { pen, sup, seed, ppm, eta, grit, last, polK, dripK, rullata }
  function finisci(c, o) {
    if (!c || !c.getContext) return c;
    const P = tune(o.pen);
    if (o.rullata) rullata(c, o);
    if (P.overspray && o.polK !== 0) polvere(c, o);
    if (o.last && P.drip > 0) colature(c, o);   // le colature solo sull'ultima tappa: vengono alla fine, quando la vernice è tanta
    grana(c, o);
    return c;
  }

  // ================= I LAVORI NUOVI: il roller e l'adesivo; e i tratti a mano coi pennelli =================
  // le lettere a rullo (i roller sui muri alti, sui tetti): grosse, piatte, un colore pieno, le colature lunghe del rullo
  const ROLL_COLS = [['#f2efe6', '#141418'], ['#141418', null], ['#c8ccd2', '#141418'], ['#d8201a', '#f2efe6'], ['#2a6ac8', null], ['#f2d23a', '#141418']];
  function rollerArt(w, WA, ppm) {
    const r = mulberry((w.seed || 1) ^ 0x2545f491), Wp = Math.round(w.W * ppm), Hp = Math.round(w.H * ppm), c = cv(Wp, Hp), x = c.getContext('2d'), stages = [], paths = [], radii = [];
    const text = String(w.aka || 'NINO').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'NINO', [fill, line] = ROLL_COLS[Math.floor(r() * ROLL_COLS.length)];
    const L = WA.letters(text, { h: 100, adv: .78, skew: .02, wob: .01, bounce: .02, rot: .02, scale: 0 }, r);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; L.strokes.forEach(t => t.pts.forEach(([a, b]) => { x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b); }));
    const lw = Hp * .2, pad = lw * .8, s = Math.min((Wp - pad * 2) / Math.max(1, x1 - x0), (Hp - pad * 2) / Math.max(1, y1 - y0)), ox = (Wp - (x1 - x0) * s) / 2 - x0 * s, oy = (Hp - (y1 - y0) * s) / 2 - y0 * s;
    const P = tune('roller'), heavy = [], all = [];
    const step = (pts) => { const out = []; for (let k = 0; k < pts.length - 1; k++) { const a = pts[k], b = pts[k + 1], n = Math.max(1, Math.ceil(hyp(b[0] - a[0], b[1] - a[1]) / 4)); for (let j = 0; j < n; j++) out.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]); } out.push(pts[pts.length - 1]); return out; };
    if (line) { const F = cv(Wp, Hp), f = F.getContext('2d'); L.strokes.forEach(t => { const pts = step(t.pts.map(([a, b]) => [a * s + ox, b * s + oy])); if (pts.length > 1) roller(f, pts, line, lw + lw * .35, Object.assign({}, P, { marks: P.marks * .5 }), r); }); x.drawImage(F, 0, 0); stages.push(snapC(c)); paths.push(L.strokes.flatMap(t => t.pts.map(([a, b]) => [a * s + ox, b * s + oy]))); radii.push(lw); }
    L.strokes.forEach(t => { const pts = step(t.pts.map(([a, b]) => [a * s + ox, b * s + oy])); if (pts.length < 2) return; all.push(...pts); heavy.push(...roller(x, pts, fill, lw, P, r)); });
    heavy.forEach(h => { if (r() < .75) drip(x, h[0], h[1], h[2] * (.3 + r() * .4), Hp * (.06 + r() * r() * .35) * (.5 + P.drip), fill, r); });
    stages.push(snapC(c)); paths.push(all.filter((q, i) => i % 3 === 0)); radii.push(lw * .7);
    return { stages, paths, radii, Wp, Hp, C: { q: .6 }, ppm };
  }
  const snapC = c => { const k = cv(c.width, c.height); k.getContext('2d').drawImage(c, 0, 0); return k; };
  // l'adesivo con la tag a pennarello dentro
  function stickerArt(w, WM, ppm) {
    const r = mulberry((w.seed || 1) ^ 0x68e31da4), Wp = Math.round(w.W * ppm), Hp = Math.round(w.H * ppm), c = cv(Wp, Hp), x = c.getContext('2d');
    let path = [];
    sticker(x, Wp * .04, Hp * .06, Wp * .92, Hp * .86, r, (ctx, tw, th) => { try { const res = WM.handTag(ctx, w.aka || 'NINO', Object.assign({}, WM.dna(w.hand || w.seed || 1)), tw, th, r, w.col || '#121216', 'mtag'); path = res.path || []; } catch (e) { ctx.fillStyle = '#121216'; ctx.fillRect(tw * .1, th * .4, tw * .8, th * .15); } });
    return { stages: [snapC(c)], paths: [path.length ? path.filter((q, i) => i % 3 === 0).map(q => [q[0] + Wp * .1, q[1] + Hp * .3]) : [[Wp / 2, Hp / 2]]], radii: [Math.max(4, Hp * .3)], Wp, Hp, C: { q: .5 }, ppm };
  }
  // i tratti della tavoletta coi pennelli (rec.pen: il pennello scelto, rec.cfg: le manopole): nel riquadro Wp × Hp
  function drawStrokes(x, rec, Wp, Hp, col, r) {
    const k = rec.frame ? Wp / rec.frame.w : 1, pen = rec.pen || 'spray', P = tune(pen, rec.cfg), wpx = (rec.wpx || 8) * k, heavy = [], path = [];
    rec.strokes.forEach(s0 => { const pts = s0.map(q => [q[0] * k, q[1] * k, q[2], q[3]]); pts.forEach(q => path.push(q));
      if (pen === 'roller') heavy.push(...roller(x, pts, col, wpx, P, r));
      else if (pen === 'marker') heavy.push(...marker(x, pts, col, wpx, P, r));
      else heavy.push(...spray(x, pts, col, wpx, P, r)); });
    const nd = Math.round(heavy.length * P.drip); heavy.sort((a, b) => b[3] - a[3]);
    for (let i = 0; i < Math.min(nd, heavy.length); i++) { const h = heavy[i]; drip(x, h[0], h[1], Math.max(.8, h[2] * (pen === 'marker' ? .2 : .14)), Math.min(Hp - h[1] - 2, Hp * (.04 + r() * .25) * (.4 + P.drip) * (pen === 'roller' ? 1.6 : 1)), col, r); }
    return { path, W: wpx };
  }
  // IL LAVORO COI PENNELLI: il disegno di writer_arte.js (o il roller, l'adesivo, i tratti della tavoletta coi pennelli), poi
  // ogni tappa passa dal pennello del lavoro (polvere, colature, grana del muro, età). Lo chiamano il disegnatore a parte e writing.js
  function art(w) {
    const WA = typeof WriterArte !== 'undefined' ? WriterArte : null, WM = typeof WriterMano !== 'undefined' ? WriterMano : null; if (!WA) return null;
    let pen = (w.rec && w.rec.pen) || (w.sticker ? 'sticker' : USO[w.style] || 'spray'), arte = false;
    const sup = w.sup || SUP_DI[w.surf] || 'intonaco';
    let A;
    // [unione-graffiti] il rullo: le lettere le disegna writer_arte.js (i font a blocchi del rullo, una o due righe, il contorno, le
    // colature grosse) e il rullo nostro le passa; rollerArt (le lettere a tratti) resta per quando writer_arte.js non ce la fa
    if (w.sticker && WM) A = stickerArt(w, WM, WA.PPM * 3);
    else if (w.rec && w.rec.pen && WM) { const TK = Math.max(1, Math.min(3, 1600 / Math.max(1, w.W * 100))), ppm = WA.PPM * TK, Wp = Math.round(w.W * ppm), Hp = Math.round(w.H * ppm), c = cv(Wp, Hp), r = mulberry(w.seed || 1), res = drawStrokes(c.getContext('2d'), w.rec, Wp, Hp, w.col || '#141418', r);
      A = { stages: [c], paths: [res.path.filter((q, i) => i % 3 === 0)], radii: [Math.max(res.W * 2.2, Hp * .08)], Wp, Hp, C: { q: .6 }, ppm }; }
    else { try { A = WA.art(w); arte = true; } catch (e) { if (w.style !== 'rullo') throw e; } if ((!A || !A.stages) && w.style === 'rullo') { A = rollerArt(w, WA, WA.PPM); arte = false; } }
    if (!A || !A.stages) return A;
    const rull = arte && (RULLATO[w.style] === 1 || (RULLATO[w.style] === 'rullo' && A.C && A.C.vfam === 'rullo'));
    if (rull) pen = 'roller'; else if (arte && w.rec && w.tool === 'pennarello') pen = 'marker';
    // su un disegno di writer_arte.js: meno polvere, colature e grana (la sua resa le ha già), e i lavori vecchi della storia hanno già
    // la loro età (pioggia, crosta): i giorni sul muro contano dopo i primi due
    const K = arte ? SU_ARTE : { polvere: 1, colature: 1, grit: 1 }, eta = arte && w.old ? Math.max(0, (w.eta || 0) - 2) : (w.eta || 0);
    const ppm = A.ppm || (A.Wp / Math.max(.01, w.W)), n = A.stages.length, o = { pen, sup, seed: w.seed || 1, ppm, eta, grit: (w.grit != null ? w.grit : 1) * K.grit, wall: w.wallRGB, polK: K.polvere, splK: arte ? 0 : 1, rullata: rull, rullK: SU_ARTE.rullata };
    A.stages = A.stages.map((c, i) => finisci(c, Object.assign({ last: i === n - 1, dripK: (w.style === 'tag' || w.style === 'mtag' ? .5 : 1) * K.colature }, o)));
    A.ppm = ppm; A.pen = pen; return A;
  }
  return { PENNELLI, SUPERFICI, USO, SUP_DI, ETA, SU_ARTE, RULLATO, tune, rullata, spray, roller, marker, sticker, drip, splat, grana, colature, polvere, finisci, gritMask, rollerArt, stickerArt, drawStrokes, art, mulberry };
})();
if (typeof module !== 'undefined') module.exports = Pennelli;
