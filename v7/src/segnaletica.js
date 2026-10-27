/* Porto Vecchio — [segnaletica] LA STRADA CHE SI LEGGE: segnaletica orizzontale, cartelli, indicazioni, insegne (solo città nuova).
   Il committente: «attenzione analoga per le strade: segnaletica orizzontale, cartelli, indicazioni, insegne chiare per tutte le
   attività, evidenti». Un paese di mare italiano fra gli anni '70 e '80, in registro di plastico: poche cose, grandi, consumate.
   - LE STRISCE (decalcomanie nella geometria fusa, non nella tela del suolo): mezzeria e margini sulle vie a due corsie (la Vittoria,
     il Corso, la Via della Stazione, la Via del Porto) secondo il profilo di vievive.js (si guida a DESTRA: la linea d'arresto sta sulla
     corsia di destra di chi arriva); le costiere dove entrano in città; le zebre agli incroci (le stesse di render.js crossings35, più
     quelle davanti alla scuola, alle piazze, alle fermate); linea d'arresto e STOP, triangoli del dare precedenza (anche dove la Rua
     e la Via della Marina sboccano sulle vie); il riquadro giallo BUS alle fermate della linea 1; gli stalli e la P; le frecce sulle vie
     del porto e della stazione. Consumate: la tela ha i buchi, ogni pezzo la sua opacità.
   - I CARTELLI: stop, dare precedenza, attraversamento pedonale, area pedonale agli ingressi del borgo, divieto di sosta sull'asse, P,
     su pali zincati sul marciapiede (a 0,45 m dal cordolo: dietro restano più di 1,5 m), o a bandiera sul muro dove il marciapiede non c'è.
   - LE INDICAZIONI: le frecce bianche (e marroni per i luoghi da vedere) agli incroci grandi, verso i luoghi veri di W.luoghi e
     W.PLACES (Porto, Stazione, Mercato, Centro, Rocca, San Rocco, Lido, Scalo), scelte col cammino vero (un campo di distanza sulla
     griglia percorribile), non a vista.
   - LE INSEGNE: ogni attività (b.shop, b.sign, b.shopFront) e ogni luogo-missione ha UNA voce in W.insegne. Le botteghe sotto casa
     hanno già il nome sulla fascia (render.js fronteBottega): qui prendono la bandiera perpendicolare col segno del mestiere (la T dei
     tabacchi, la croce verde della farmacia, la tazza del bar…), che si legge in prospettiva di strada anche dal lato nascosto alla
     camera; sotto i portici della Vittoria l'insegna sta nella lunetta dell'arco. I locali che render.js firma già (l'insegna grande
     accesa dei bar, degli hotel, dei palazzi) restano come sono e la voce lo dice (fonte 'facciata'); quelli che firma uno scorcio
     (W.scorci, il kit delle botteghe di un altro filone) si saltano (fonte 'scorci'). I luoghi senza insegna (il Forno, il Mercato, la
     chiesa, le baracche, il posto di blocco, la Rocca, il covo) prendono la loro.
   Grafica: un atlante solo (una tela 2048 × 2048), quattro materiali (cartelli, cartelli accesi la notte, pali a colori nei vertici,
   strisce trasparenti con polygonOffset), fusi in riquadri di SETT m: poche decine di chiamate di disegno per tutta la città.
   Prova: node src/test_segnaletica.js */
var Segnaletica = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const W = G.MAP.world, TS = G.TS, T = G.T, M = G.MAP;
  const ATTIVO = !!(W && W.sets && W.roads);
  const PI = Math.PI, hyp = Math.hypot, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hash = (x, y, s) => { let h = (Math.round(x * 7) * 374761393 + Math.round(y * 7) * 668265263 + (s || 0) * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  const PV = () => (typeof Pavimenti !== 'undefined' && Pavimenti.strade && Pavimenti.strade() ? Pavimenti : null);   // [strade] l'asfalto nuovo (pavimenti.js)
  const VV = () => (typeof Vievive !== 'undefined' && Vievive && Vievive.attivo ? Vievive : null);
  const CH = () => (typeof Chiarezza !== 'undefined' && Chiarezza ? Chiarezza : null);
  const RT = () => (typeof Rete !== 'undefined' && Rete && Rete.attivo && Rete.attivo() ? Rete : null);
  const CORNICE = [1222, 250, 1610, 452];
  const inC = (x, y, m) => x >= CORNICE[0] - (m || 0) && x <= CORNICE[2] + (m || 0) && y >= CORNICE[1] - (m || 0) && y <= CORNICE[3] + (m || 0);
  const SETT = 96;   // il lato dei riquadri fusi (m): vedi la nota sulle chiamate di disegno in fondo
  // le misure (m)
  const CFG = {
    palo: { r: .03, dal: .45 },             // il palo zincato: a 0,45 m dal cordolo, sul marciapiede (2,1 m: dietro restano 1,6 m)
    cartello: 2.2,                           // il bordo basso del cartello sul marciapiede
    bandiera: { y0: 2.8, h: .66, da: .26, a: 1.05, stretta: .72 },   // l'insegna a bandiera: dal muro, sopra le tende (2,68) e sotto i balconi (3,54)
    liberoPorta: 1.0,                        // m liberi attorno a porte, vetrine, scale
    mezzeria: { on: 3, off: 3, w: .2 }, margine: .18, zebra: { b: .5, L: 2.6 },   // le linee un po' più larghe del vero (12 cm): dall'alto devono leggersi
  };

  // ================= LA GRIGLIA E LE STRADE =================
  const GW = G.GW, GH = G.GH, tile = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return tx < 0 || ty < 0 || tx >= GW || ty >= GH ? -1 : M.grid[ty * GW + tx]; };
  const zonaC = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return tx >= 0 && ty >= 0 && tx < GW && ty < GH && M.zone[ty * GW + tx] === M.Z.CITTA; };
  const PIENO = v => v === T.BLD || v === T.WATER || v === T.CLIFF || v === T.FOUNT || v === T.TREE || v < 0;
  const bIdx = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) return -1; const i = W.bIndex ? W.bIndex[ty * GW + tx] : -1; return i >= 0 ? i : -1; };
  const ROADS = () => (M.roads || []).filter(rd => rd && rd.pts && rd.pts.length > 1);
  function linea(P) { const cum = [0]; for (let k = 1; k < P.length; k++) cum.push(cum[k - 1] + hyp(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1])); return { P, cum, L: cum[cum.length - 1] }; }
  const LN = new Map(); const lin = rd => LN.get(rd) || (LN.set(rd, linea(rd.pts)), LN.get(rd));
  function lAt(Ln, s) { const P = Ln.P, C = Ln.cum; s = clamp(s, 0, Ln.L); let lo = 0, hi = C.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (C[m] <= s) lo = m; else hi = m; }
    const a = P[lo], b = P[hi], t = (s - C[lo]) / ((C[hi] - C[lo]) || 1); return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) }; }
  function lNear(Ln, x, y) { let best = 1e9, bs = 0; const P = Ln.P; for (let k = 0; k < P.length - 1; k++) { const ax = P[k][0], ay = P[k][1], dx = P[k + 1][0] - ax, dy = P[k + 1][1] - ay, L2 = dx * dx + dy * dy || 1e-9, t = clamp(((x - ax) * dx + (y - ay) * dy) / L2, 0, 1), d = hyp(ax + dx * t - x, ay + dy * t - y); if (d < best) { best = d; bs = Ln.cum[k] + t * Math.sqrt(L2); } } return { d: best, s: bs }; }
  // sulla carreggiata di una strada (non sterrato): margine m oltre il bordo (negativo: dentro)
  function suCarreggiata(x, y, pad, salta) { for (const rd of ROADS()) { if (rd === salta || rd.kind === 'sterrato') continue; const P = rd.pts; let near = false; for (let k = 0; k < P.length; k += 6) if (Math.abs(P[k][0] - x) < 80 && Math.abs(P[k][1] - y) < 80) { near = true; break; } if (!near) continue; if (lNear(lin(rd), x, y).d < rd.w / 2 + (pad || 0)) return rd; } return null; }

  // ---- gli incroci, come render.js (junctions, armsAt, junc1, crossings35): le strisce nuove cadono sopra quelle dipinte nel suolo ----
  let JUNC = null;
  function junctions() {
    if (JUNC) return JUNC; JUNC = [];
    const R = (M.roads || []).filter(r => r.kind !== 'sterrato'), seg = [];
    R.forEach((rd, ri) => { for (let k = 0; k < rd.pts.length - 1; k++) seg.push([ri, rd.pts[k], rd.pts[k + 1], rd.w]); });
    const add = (x, y, r) => { if (!JUNC.some(j => hyp(j[0] - x, j[1] - y) < 4)) JUNC.push([x, y, r]); };
    // (le stesse coppie e nello stesso ordine di render.js; si saltano solo quelle con le scatole lontane, che non possono toccarsi)
    const bx = seg.map(([, a, b]) => [Math.min(a[0], b[0]) - .5, Math.min(a[1], b[1]) - .5, Math.max(a[0], b[0]) + .5, Math.max(a[1], b[1]) + .5]);
    for (let i = 0; i < seg.length; i++) for (let j = i + 1; j < seg.length; j++) {
      const A0 = bx[i], B0 = bx[j]; if (A0[2] < B0[0] || B0[2] < A0[0] || A0[3] < B0[1] || B0[3] < A0[1]) continue;
      const [ra, a1, a2, wa] = seg[i], [rb, b1, b2, wb] = seg[j]; if (ra === rb) continue;
      const d1x = a2[0] - a1[0], d1y = a2[1] - a1[1], d2x = b2[0] - b1[0], d2y = b2[1] - b1[1], den = d1x * d2y - d1y * d2x; if (Math.abs(den) < 1e-6) continue;
      const t = ((b1[0] - a1[0]) * d2y - (b1[1] - a1[1]) * d2x) / den, u = ((b1[0] - a1[0]) * d1y - (b1[1] - a1[1]) * d1x) / den;
      if (t >= -.05 && t <= 1.05 && u >= -.05 && u <= 1.05) add(a1[0] + d1x * t, a1[1] + d1y * t, Math.max(wa, wb) / 2 + 2);
    }
    R.forEach(rd => [rd.pts[0], rd.pts[rd.pts.length - 1]].forEach(e => { for (const o of R) { if (o === rd) continue; for (let k = 0; k < o.pts.length; k += 1) if (hyp(o.pts[k][0] - e[0], o.pts[k][1] - e[1]) < o.w / 2 + 2) { add(e[0], e[1], Math.max(o.w, rd.w) / 2 + 2); return; } } }));
    return JUNC;
  }
  let JH = null;
  function nearJ(x, y, extra) { if (!JH) { JH = new Map(); junctions().forEach(j => { const k = Math.floor(j[0] / 24) * 4096 + Math.floor(j[1] / 24); (JH.get(k) || JH.set(k, []).get(k)).push(j); }); }
    const i0 = Math.floor(x / 24), j0 = Math.floor(y / 24); let best = 1e9; for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) for (const q of JH.get(i * 4096 + j) || []) best = Math.min(best, hyp(q[0] - x, q[1] - y) - q[2] - (extra || 0)); return best; }
  function armsAt(jx, jy, jr, conVicoli) {
    const arms = [];
    (M.roads || []).forEach(rd => {
      if ((rd.kind === 'vicolo' && !conVicoli) || rd.kind === 'sterrato') return; const P = rd.pts; if (!P || P.length < 2) return;
      let best = 1e9, bs = 0, acc = 0; const cum = [0];
      for (let k = 0; k < P.length - 1; k++) { const ax = P[k][0], ay = P[k][1], dx = P[k + 1][0] - ax, dy = P[k + 1][1] - ay, L = hyp(dx, dy) || 1e-6;
        const t = clamp(((jx - ax) * dx + (jy - ay) * dy) / (L * L), 0, 1), d = hyp(ax + dx * t - jx, ay + dy * t - jy); if (d < best) { best = d; bs = acc + t * L; } acc += L; cum.push(acc); }
      if (best > rd.w / 2 + 2) return;
      const at = s0 => { for (let k = 0; k < P.length - 1; k++) if (s0 <= cum[k + 1]) { const t = (s0 - cum[k]) / ((cum[k + 1] - cum[k]) || 1); return [P[k][0] + (P[k + 1][0] - P[k][0]) * t, P[k][1] + (P[k + 1][1] - P[k][1]) * t]; } return null; };
      [-1, 1].forEach(sg => { const s1 = bs + sg * (jr + 4); if (s1 < 0 || s1 > acc) return; const q = at(s1); if (!q) return; const dx = q[0] - jx, dy = q[1] - jy, L = hyp(dx, dy); if (L < jr * .6) return;
        const ux = dx / L, uy = dy / L; if (arms.some(o => o.ux * ux + o.uy * uy > .94)) return; arms.push({ ux, uy, w: rd.w, rd }); });
    });
    return arms;
  }
  function geo1(rd) {
    if (rd.__sg1) return rd.__sg1; const P = rd.pts, n = P.length, s = new Float32Array(n), ux = new Float32Array(n), uy = new Float32Array(n), cv = new Float32Array(n);
    for (let k = 1; k < n; k++) s[k] = s[k - 1] + hyp(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]);
    for (let k = 0; k < n; k++) { const a = P[Math.max(0, k - 1)], c = P[Math.min(n - 1, k + 1)], L = hyp(c[0] - a[0], c[1] - a[1]) || 1; ux[k] = (c[0] - a[0]) / L; uy[k] = (c[1] - a[1]) / L; }
    for (let k = 0; k < n; k++) { let a = k, b = k; while (a > 0 && s[k] - s[a] < 7) a--; while (b < n - 1 && s[b] - s[k] < 7) b++; cv[k] = Math.atan2(ux[a] * uy[b] - uy[a] * ux[b], ux[a] * ux[b] + uy[a] * uy[b]); }
    Object.defineProperty(rd, '__sg1', { value: { s, ux, uy, cv, n }, enumerable: false, configurable: true }); return rd.__sg1;
  }
  const urb = rd => rd.kind === 'citta' || rd.kind === 'litoranea';
  const PRI = rd => rd.kind === 'litoranea' ? 0 : rd.kind === 'strada' ? 1 : rd.kind === 'citta' ? (rd.main ? 2 : 3) : 4;
  let J1 = null;
  function junc1() {
    if (J1) return J1; J1 = [];
    const R = (M.roads || []).filter(rd => rd.kind !== 'vicolo' && rd.kind !== 'sterrato' && rd.pts && rd.pts.length > 2);
    junctions().forEach(([jx, jy, jr]) => {
      const arms = [];
      R.forEach(rd => { const P = rd.pts, g = geo1(rd); let best = 1e9, bs = 0;
        for (let k = 0; k < P.length - 1; k++) { const ax = P[k][0], ay = P[k][1], dx = P[k + 1][0] - ax, dy = P[k + 1][1] - ay, L2 = dx * dx + dy * dy || 1e-6, t = clamp(((jx - ax) * dx + (jy - ay) * dy) / L2, 0, 1), d = hyp(ax + dx * t - jx, ay + dy * t - jy); if (d < best) { best = d; bs = g.s[k] + t * Math.sqrt(L2); } }
        if (best > rd.w / 2 + 2) return; const tot = g.s[g.n - 1], mine = [];
        [-1, 1].forEach(sg => { const s1 = bs + sg * (jr + 6); if (s1 < 0 || s1 > tot) return; let k = 0; while (k < g.n - 2 && g.s[k + 1] < s1) k++; const t = (s1 - g.s[k]) / ((g.s[k + 1] - g.s[k]) || 1), qx = P[k][0] + (P[k + 1][0] - P[k][0]) * t, qy = P[k][1] + (P[k + 1][1] - P[k][1]) * t, dx = qx - jx, dy = qy - jy, L = hyp(dx, dy); if (L < jr * .6) return;
          const ux = dx / L, uy = dy / L; if (arms.some(o => o.ux * ux + o.uy * uy > .94)) return; mine.push({ rd, ux, uy, w: rd.w }); });
        mine.forEach(a => { a.through = mine.length === 2; arms.push(a); }); });
      if (arms.length < 2) return;
      const top = arms.reduce((b, a) => !b || (a.through && !b.through) || (a.through === b.through && (PRI(a.rd) < PRI(b.rd) || (PRI(a.rd) === PRI(b.rd) && a.w > b.w))) ? a : b, null);
      arms.forEach(a => { a.minor = a.rd !== top.rd; });
      const city = zonaC(jx, jy), big = arms.filter(a => urb(a.rd) && a.w >= 7).length;
      J1.push({ x: jx, y: jy, r: jr, arms, city, signal: city && arms.length >= 3 && big >= 3 });
    });
    const sig = J1.filter(j => j.signal).sort((a, b) => b.arms.reduce((s, a2) => s + a2.w, 0) - a.arms.reduce((s, a2) => s + a2.w, 0)); const keep = [];
    sig.forEach(j => { if (keep.length < 9 && !keep.some(o => hyp(o.x - j.x, o.y - j.y) < 60)) keep.push(j); else j.signal = false; });
    return J1;
  }
  let CW = null;
  function crossings35() {
    if (CW) return CW; CW = [];
    const R = (M.roads || []).filter(urb);
    const nearRoad = (rd, x, y) => { const P = rd.pts; for (let k = 0; k < P.length - 1; k++) { const ax = P[k][0], ay = P[k][1], dx = P[k + 1][0] - ax, dy = P[k + 1][1] - ay, L2 = dx * dx + dy * dy || 1, t = clamp(((x - ax) * dx + (y - ay) * dy) / L2, 0, 1); if (hyp(ax + dx * t - x, ay + dy * t - y) < rd.w / 2 + 1.5) return true; } return false; };
    junctions().forEach(([jx, jy, jr]) => {
      if (!zonaC(jx, jy)) return;
      if (R.filter(rd => nearRoad(rd, jx, jy)).length < 2) return;
      const AR = armsAt(jx, jy, jr); if (AR.length < 3) return;
      AR.forEach(a => { if (a.w < 6) return; const qx = jx + a.ux * (jr + 3.4), qy = jy + a.uy * (jr + 3.4); if (CW.some(c => hyp(c.x - qx, c.y - qy) < 7)) return;
        CW.push({ x: qx, y: qy, ux: a.ux, uy: a.uy, w: a.w, rd: a.rd, motivo: 'incrocio', j: [jx, jy, jr] }); });
    });
    return CW;
  }

  // ================= IL PIANO =================
  let PIANO = null;
  const STR = [], CART = [], PALI = [], IND = [], INS = [];
  // ---------------- 1. LE STRISCE ----------------
  // una striscia: { k: tessera, x, y (centro), ang (asse lungo, +u della tessera), L (lungo u), w (largo v), a (opacità), giallo }
  // [pedonale] niente segni da strada (frecce, linee d'arresto, zebre, STOP) sulle piazze e sulle zone pedonali: sul lastricato PIAZZA, sulle
  // scale e le fontane, dentro le opere pedonali del mondo (W.pedonali: la piazza alta, le scalinate, i muraglioni) e sulle vie pedonali
  // (rd.pedonale) fuori dalla carreggiata di una via dei veicoli
  const PED_T = new Set([T.PIAZZA, T.STAIRS, T.FOUNT].filter(v => v !== undefined));
  const dentroPoly = (P, x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
  function pedonaleQui(x, y) {
    if (PED_T.has(tile(x, y))) return true;
    for (const o of W.pedonali || []) if (o.r !== undefined ? hyp(x - o.x, y - o.y) < o.r : dentroPoly(o.poly, x, y)) return true;
    const rd = suCarreggiata(x, y, 0); return !!(rd && rd.pedonale && !ROADS().some(q => q !== rd && !q.pedonale && q.kind !== 'vicolo' && q.kind !== 'sterrato' && lNear(lin(q), x, y).d < q.w / 2));
  }
  function striscia(k, x, y, ang, L, w, a, o) { const s = Object.assign({ k, x, y, ang, L, w, a: a === undefined ? .8 : a }, o || {}); if (pedonaleQui(x, y)) return s; STR.push(s); return s; }
  // una linea lungo una polilinea (spostata di off a sinistra), a tratti: pezzi di al più 2 m
  function rigaLungo(rd, s0, s1, off, w, fn, tess, passo) {   // [strade] passo: la mezzeria a tratti di 3 m esatti (prima pezzi di 2 m: tratti di 4 e buchi di 2, a caso)
    const Ln = lin(rd); for (let s = s0; s < s1 - .05;) { const e = Math.min(s1, s + (passo || 2)), a = lAt(Ln, s), b = lAt(Ln, e), ang = Math.atan2(b.y - a.y, b.x - a.x), nx = -Math.sin(ang), ny = Math.cos(ang), mx = (a.x + b.x) / 2 + nx * off, my = (a.y + b.y) / 2 + ny * off;
      if (fn(mx, my, s, e)) striscia(tess || 'riga', mx, my, ang, hyp(b.x - a.x, b.y - a.y), w, .78 + hash(mx, my, 3) * .06); s = e; }   // [strade] la stessa vernice su tutta la linea
  }
  // il riquadro giallo BUS alle fermate della linea 1: sulla carreggiata, lungo il cordolo, 12 m, letto da chi guida (a destra il cordolo)
  function busBox(VVm, Z) {
    PIANO.bus = []; if (!VVm) return;
    VVm.fermate().forEach(f => { const rd = ROADS().find(r => r.id === f.rd); if (!rd) return; const Ln = lin(rd), q = lNear(Ln, f.x, f.y);
      for (const dS of [0, -3, 3, -6, 6]) { const c = lAt(Ln, q.s + dS), nx = -Math.sin(c.ang), ny = Math.cos(c.ang), sd = (f.x - c.x) * nx + (f.y - c.y) * ny > 0 ? 1 : -1, o = sd * (rd.w / 2 - 1.3), ux = Math.cos(c.ang), uy = Math.sin(c.ang);
        const x = c.x + nx * o, y = c.y + ny * o; if ([-6, 0, 6].some(e => nearJ(x + ux * e, y + uy * e, .5) < 0) || Z.some(z => hyp(z.x - x, z.y - y) < 8.5) || PIANO.bus.some(b => hyp(b.x - x, b.y - y) < 14)) continue;
        striscia('bus', x, y, c.ang + (sd > 0 ? 0 : PI), 12, 2.5, .78, { giallo: true }); PIANO.bus.push({ x, y, f: f.id }); return; } });
  }
  const vicinoZebra = (x, y, pad) => STR.some(s => s.k === 'zebra' && hyp(s.x - x, s.y - y) < 2.2 + (pad || 0));
  function strisce() {
    const VVm = VV();
    // le zebre: quelle di render.js (stessi punti), poi quelle chieste dai posti (la scuola, le piazze, le fermate)
    const Z = crossings35().slice();
    const ancora = (x, y, motivo) => { let best = null, bd = 30; ROADS().forEach(rd => { if (!(rd.kind === 'citta') || !zonaC(x, y)) return; const q = lNear(lin(rd), x, y); if (q.d < bd) { bd = q.d; best = { rd, s: q.s }; } }); if (!best) return;
      const Ln = lin(best.rd); for (const dS of [0, 3, -3, 6, -6, 9, -9, 12, -12]) { const p = lAt(Ln, best.s + dS); if (p.x < 0 || nearJ(p.x, p.y, 2) < 0 || Z.some(c => hyp(c.x - p.x, c.y - p.y) < 14) || (PIANO.bus || []).some(q => hyp(q.x - p.x, q.y - p.y) < 8.5)) continue;
        const ux = Math.cos(p.ang), uy = Math.sin(p.ang); Z.push({ x: p.x, y: p.y, ux, uy, w: best.rd.w, rd: best.rd, motivo }); return; } };
    busBox(VVm, Z);   // prima il riquadro della fermata, poi le zebre chieste dai posti (fuori dal riquadro)
    const scuola = G.BUILDINGS.find(b => b.use === 'scuola' && b.door); if (scuola) ancora((scuola.door[0] + .5) * TS, (scuola.door[1] + .5) * TS, 'scuola');
    (W.sets || []).filter(q => /^(mercato|stazione|adunata|marina)$/.test(q.k)).forEach(q => ancora(q.x !== undefined ? q.x : (q.x0 + q.x1) / 2, q.y !== undefined ? q.y : (q.y0 + q.y1) / 2, 'piazza'));
    if (VVm) VVm.fermate().forEach(f => ancora(f.x, f.y, 'fermata'));
    Z.forEach((c, ci) => { const ang = Math.atan2(c.uy, c.ux), nb = Math.max(2, Math.floor((c.w - .8) / 1)), o0 = -(nb - 1) / 2;
      for (let b = 0; b < nb; b++) { const o = o0 + b; striscia('zebra', c.x - c.uy * o, c.y + c.ux * o, ang, CFG.zebra.L, CFG.zebra.b, .8 + hash(c.x, c.y, b) * .06, { zebra: ci, motivo: c.motivo });   /* [strade] le bande tutte uguali */ }
      c.i = ci; });   // [suolo] la linea d'arresto della zebra non c'è più da sola: è quella dello STOP o del semaforo, prima delle strisce (sotto)
    PIANO.zebre = Z;
    // mezzeria e margini sulle vie a due corsie (vievive: la mezzeria al centro della carreggiata, spostata dalla sosta)
    ROADS().forEach(rd => { if (rd.kind !== 'citta' || !rd.pts.some(p => inC(p[0], p[1]))) return; const S = VVm ? VVm.segnaletica(rd) : { mezzeria: rd.w >= 5.5, asse: 0, sosta: [] }, P = VVm ? VVm.profilo(rd) : { rango: 'via' };
      const Ln = lin(rd), fuori = (x, y) => !zonaC(x, y) || nearJ(x, y, 1) < 0 || vicinoZebra(x, y, .6) || suCarreggiata(x, y, -.6, rd);
      if (S.mezzeria) rigaLungo(rd, 0, Ln.L, S.asse || 0, CFG.mezzeria.w, (x, y, s) => { if (fuori(x, y)) return false; const dj = nearJ(x, y, 0); return dj < 15 || (s % 6) < 3; }, null, 3);   // continua nei 15 m prima dell'incrocio
      const mar = P.rango === 'asse' ? [-1, 1] : [-1, 1].filter(sd => !(S.sosta || []).includes(sd));
      mar.forEach(sd => rigaLungo(rd, 0, Ln.L, sd * (rd.w / 2 - .3), CFG.margine, (x, y) => !fuori(x, y) && nearJ(x, y, 3) >= 0));
    });
    // le costiere dove arrivano in città: la stessa regola della tela (render.js marks1: tratti 4,5 su 9, continua in curva e prima degli incroci)
    ROADS().forEach(rd => { if (rd.kind !== 'litoranea') return; const g = geo1(rd), P = rd.pts;
      for (let k = 0; k < g.n - 1; k++) { const [ax, ay] = P[k], [bx, by] = P[k + 1], mx = (ax + bx) / 2, my = (ay + by) / 2; if (!inC(mx, my, 140)) continue;
        const dj = nearJ(mx, my, 0); if (dj < .5 || suCarreggiata(mx, my, -.3, rd)) continue; const city = zonaC(mx, my), L = hyp(bx - ax, by - ay), ang = Math.atan2(by - ay, bx - ax), nx = -g.uy[k], ny = g.ux[k];
        const cont = Math.abs(g.cv[k]) > (city ? 9 : .42) || (!city && dj < 18), period = city ? 6 : 9, on = city ? 3 : 4.5;
        if (cont || (g.s[k] % period) < on) striscia('riga', mx, my, ang, L, CFG.mezzeria.w, .74 + hash(mx, my, 5) * .06);
        if (!city && dj > 3) [-1, 1].forEach(sd => { const o = sd * (rd.w / 2 - .35); if (suCarreggiata(mx + nx * (o + sd * .6), my + ny * (o + sd * .6), 0, rd)) return; striscia('riga', mx + nx * o, my + ny * o, ang, L, CFG.margine, .62 + hash(mx, my, 7 + sd) * .06, { asse: [mx, my] }); }); } });   // asse: il punto della mezzeria (la tela decide lì)
    // gli incroci: STOP e linea d'arresto, o i triangoli, sulle strade che danno la precedenza (gli stessi punti della tela); frecce ai semafori
    PIANO.precedenze = [];
    // [suolo] un solo strato e il verso vero: la linea d'arresto sta sulla corsia di destra di chi arriva (va verso -u), e se sul braccio c'è
    // la zebra sta PRIMA delle strisce, col bordo a 1 m dal loro; lo STOP e la freccia ancora prima, nella stessa corsia
    const zebraDi = (J, ux, uy) => Z.find(z => z.motivo === 'incrocio' && z.j && hyp(z.j[0] - J.x, z.j[1] - J.y) < 1.5 && z.ux * ux + z.uy * uy > .9);
    junc1().forEach(J => { if (!inC(J.x, J.y, 140)) return; J.arms.forEach((a, ai) => { const ux = a.ux, uy = a.uy, rx = uy, ry = -ux, lane = a.w / 2;   // destra di chi arriva (va verso -u): si guida a destra
      const d0 = J.r + (J.city ? 3.4 : 1.2), sx = J.x + ux * d0, sy = J.y + uy * d0, ang = Math.atan2(uy, ux), arm = { jx: J.x, jy: J.y, ux, uy };
      const zb = zebraDi(J, ux, uy), dA = zb ? (zb.x - J.x) * ux + (zb.y - J.y) * uy + CFG.zebra.L / 2 + 1.1 + .45 / 2 : d0 + .22, ax = J.x + ux * dA, ay = J.y + uy * dA;   // il centro della linea d'arresto lungo il braccio
      const arresto = () => striscia('riga', ax + rx * lane / 2, ay + ry * lane / 2, ang + PI / 2, lane - .35, .45, .78, Object.assign({ arresto: true }, arm));
      if (a.minor && !J.signal) {
        if (J.city || a.w >= 6.5) { arresto();
          striscia('stop', ax + ux * 2.1 + rx * lane / 2, ay + uy * 2.1 + ry * lane / 2, ang + PI, 2.4, Math.min(1.7, lane - .4), .74, arm);   // STOP lungo la corsia, allungato per chi guida, prima della linea
          PIANO.precedenze.push({ k: 'stop', x: sx, y: sy, ux, uy, rx, ry, lane, J }); }
        else { for (let o = .4; o < lane - .2; o += .7) striscia('triangolo', ax + rx * o, ay + ry * o, ang, .5, .45, .75, arm); PIANO.precedenze.push({ k: 'precedenza', x: sx, y: sy, ux, uy, rx, ry, lane, J }); }
      }
      if (J.city && J.signal && a.w >= 7) { arresto(); striscia('freccia_dritta', ax + ux * (dA - d0 < 1 ? 6.8 : 4.4) + rx * lane / 2, ay + uy * (dA - d0 < 1 ? 6.8 : 4.4) + ry * lane / 2, ang + PI, 3.2, 1.1, .62, arm); }
    }); });
    // la Rua, la Via della Marina e le passeggiate (una corsia a senso alternato, Ape e motorini) che sboccano su una via: i triangoli
    junctions().forEach(([jx, jy, jr]) => { if (!zonaC(jx, jy)) return; const A = armsAt(jx, jy, jr, true), vie = A.filter(a => a.rd.kind === 'citta'); if (!vie.length) return;
      A.forEach(a => { if (a.rd.kind !== 'vicolo' || a.w < 4.5 || a.rd.pedonale) return;   /* [pedonale] sulle vie pedonali non entra nessun mezzo: niente triangoli */ const ux = a.ux, uy = a.uy, rx = uy, ry = -ux, w = a.w, d0 = Math.max(...vie.map(v => v.w)) / 2 + .6, sx = jx + ux * d0, sy = jy + uy * d0, ang = Math.atan2(uy, ux);
        if (STR.some(s => s.k === 'triangolo' && hyp(s.x - sx, s.y - sy) < 3)) return;
        for (let o = -w / 2 + .45; o < w / 2 - .3; o += .7) striscia('triangolo', sx + rx * o, sy + ry * o, ang, .5, .45, .7, { minore: a.rd.id });
        PIANO.precedenze.push({ k: 'precedenza', x: sx, y: sy, ux, uy, rx, ry, lane: w / 2, minore: a.rd, J: { x: jx, y: jy, r: jr } }); }); });
    // gli stalli: le tacche e la P (gli stessi tratti della tela, render.js segniSuolo1)
    if (VVm) VVm.stalli().forEach((q, i) => { const L0 = VVm.CFG.stallo, ux = Math.cos(q.ang), uz = Math.sin(q.ang);
      [-1, 1].forEach(e => { const px = q.cx + ux * e * L0 / 2, pz = q.cy + uz * e * L0 / 2, nx = q.nx, nz = q.ny, w = q.w, o = w / 2 - 2.1, ax = px + nx * o, az = pz + nz * o, bx = px + nx * (w / 2 - .3), bz = pz + nz * (w / 2 - .3);
        striscia('riga', (ax + bx) / 2, (az + bz) / 2, Math.atan2(bz - az, bx - ax), hyp(bx - ax, bz - az), .12, .6, { stallo: 1 });
        if (e < 0) striscia('riga', ax + ux * L0 / 2, az + uz * L0 / 2, q.ang, L0, .12, .55, { stallo: 1 });
        if (e > 0 && i % 6 === 2) striscia('P', (ax + bx) / 2 + ux * 2.6, (az + bz) / 2 + uz * 2.6, q.ang + PI / 2, 1.3, 1.1, .6, { stallo: 1 }); }); });
    // le frecce sulle vie del porto e della stazione: due per corsia prima degli incroci, verso dove si può andare
    // dove la Via del Porto e la Via della Stazione si staccano dalle costiere: sulle corsie di chi arriva dalla costiera la freccia
    // (dritto, a destra, a sinistra: quello che l'incrocio permette) e la scritta PORTO o STAZIONE sulla corsia che ci porta
    [['via_porto', 'PORTO'], ['via_alta', 'STAZIONE']].forEach(([id, parola]) => { const rd = ROADS().find(r => r.id === id); if (!rd) return;
      junc1().filter(J => inC(J.x, J.y, 160) && J.arms.some(a => a.rd === rd)).forEach(J => { const t = J.arms.find(q => q.rd === rd);
        J.arms.forEach(a => { if (a === t) return; const R0 = a.rd, Ln = lin(R0), q0 = lNear(Ln, J.x, J.y), sgn = (() => { const p = lAt(Ln, q0.s + 5); return (p.x - J.x) * a.ux + (p.y - J.y) * a.uy > 0 ? 1 : -1; })();
          const altri = J.arms.filter(o => o !== a), cr = o => a.ux * o.uy - a.uy * o.ux;   // chi arriva va verso -u; il braccio o sta alla sua destra se cr(o) < 0
          const dritto = altri.some(o => o.ux * a.ux + o.uy * a.uy < -.8), dx = altri.some(o => o.ux * a.ux + o.uy * a.uy > -.8 && cr(o) < 0), sx2 = altri.some(o => o.ux * a.ux + o.uy * a.uy > -.8 && cr(o) > 0);
          const k = dritto && dx ? 'freccia_dritta_destra' : dritto && sx2 ? 'freccia_dritta_sinistra' : dritto ? 'freccia_dritta' : dx ? 'freccia_destra' : 'freccia_sinistra';
          [[J.r + 9, k], [J.r + 15, 'parola|' + parola], [J.r + 28, k]].forEach(([d, kk]) => { const p = lAt(Ln, q0.s + sgn * d); const ang = p.ang + (sgn > 0 ? PI : 0), nx = -Math.sin(ang), ny = Math.cos(ang), lane = R0.w / 4;
            const x = p.x + nx * lane, y = p.y + ny * lane;   // la corsia di destra di chi va verso ang: +v (la normale sinistra della tela è la destra di chi guida)
            if (nearJ(x, y, 1) < 0 || vicinoZebra(x, y, 2) || STR.some(s => (s.k === 'stop' || s.k === 'triangolo') && hyp(s.x - x, s.y - y) < 3)) return;
            if (kk.startsWith('parola')) striscia(kk, x, y, ang, 4.2, 1.5, .66, { freccia: rd.id, verso: id }); else striscia(kk, x, y, ang, 3.2, 1.1, .64, { freccia: rd.id }); }); }); }); });
  }

  // ---------------- 2. I PALI E I CARTELLI ----------------
  let FR = null; const fronti = () => FR || (FR = CH() ? CH().fronti(G.BUILDINGS, TS, (tx, ty) => G.tileAt(tx, ty), T, GW, GH, W.pezzi) : null);
  const davanti = (x, y, pad) => !!(CH() && fronti() && CH().davanti(fronti(), x, y, pad || 0));
  let OST = null;   // le cose che stanno già a terra: lampioni, pali della rete, fermate, edicole, plance, alberi in filare
  function ostacoli() {
    if (OST) return OST; OST = [];
    const R = RT(); if (R) { const g = R.grafo(); (g.lampioni || []).forEach(n => { if (n.modello !== 'braccio') OST.push([n.x, n.z, .35, 'lampione']); }); (g.nodi || []).forEach(n => { if (n.k === 'palo' || n.k === 'cabina') OST.push([n.x, n.z, n.k === 'cabina' ? 2 : .4, n.k]); }); }
    const V = VV(); if (V) { V.fermate().forEach(f => { const c = Math.cos(f.dir), s = Math.sin(f.dir); OST.push([f.x, f.y, 2.2, 'fermata']); OST.push([f.x + c * .45 + s * 1.7, f.y + s * .45 - c * 1.7, .5, 'palo fermata']); }); V.edicole().forEach(e => OST.push([e.kx, e.ky, 2.4, 'edicola'])); V.plance().forEach(p => OST.push([p.x, p.y, 1.4, 'plancia'])); }
    const S = SC(); if (S) { const A = S.piano(); A.bidoni.forEach(q => OST.push([q.x, q.z, .45, 'bidone'])); A.cassonetti.forEach(q => OST.push([q.x, q.z, .9, 'cassonetto'])); A.dehors.forEach(d => d.tavoli.forEach(t => OST.push([t.x, t.z, .9, 'tavolino']))); }
    (W.pezzi || []).forEach(p => { if (/fontana|pozzo|edicola_votiva|torre_acqua|gru_porto|bitta|palo_riflettori|torre_guardia/.test(p.tipo)) OST.push([p.x, p.y, (p.opz && p.opz.r || 1) + .8, p.tipo]); });
    return OST;
  }
  // un punto a terra libero per un palo: dentro la città, non nel pieno, non su una carreggiata, mai davanti a porte, vetrine, scale
  function liberoPalo(x, y, salta, spazio) {
    if (!zonaC(x, y)) return false; for (const [dx, dy] of [[0, 0], [.5, 0], [-.5, 0], [0, .5], [0, -.5]]) if (PIENO(tile(x + dx, y + dy))) return false;
    if (suCarreggiata(x, y, .15)) return false; if (davanti(x, y, CFG.liberoPorta)) return false;
    if (ostacoli().some(o => hyp(o[0] - x, o[1] - y) < o[2] + .5)) return false;
    if (PALI.some(p => p !== salta && hyp(p.x - x, p.y - y) < (spazio || 1.1))) return false;   // spazio: per i pali che non vogliono compagnia (le indicazioni, il divieto)
    if (STR.some(s => s.k === 'zebra' && hyp(s.x - x, s.y - y) < 1.6)) return false;
    return true;
  }
  // QUELLO CHE LA CAMERA VEDE: la camera sta a sud-est e guarda in giù di ~0,72 rad (LEGGIBILITA.md: una casa alta H nasconde ~0,8-1,15 H
  // di suolo dietro di sé). Un punto a quota h si vede se lungo il raggio verso la camera (+x, +y, in salita di tan 0,72 a metro) nessuna
  // casa (il tetto con la falda) sta più in alto del raggio. Le cose si mettono prima dove si vedono, poi dove si può.
  const TANP = Math.tan(.72), ELV = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return tx < 0 || ty < 0 || tx >= GW || ty >= GH || !M.elev ? 0 : M.elev[ty * GW + tx] || 0; };
  const altezzaCasa = bi => { const b = G.BUILDINGS[bi]; return (b.fl >= 1 ? 3.6 + (b.fl - 1) * 2.4 : 3) + .9 + (b.base || 0); };
  function visibile(x, y, h) { const s = Math.SQRT1_2, h0 = ELV(x, y) + h; for (let d = .4; d < 32; d += .4) { const px = x + s * d, py = y + s * d, bi = bIdx(px, py); if (bi >= 0 && G.BUILDINGS[bi] && ELV(px, py) + altezzaCasa(bi) > h0 + d * TANP) return false; } return true; }
  // il palo sul marciapiede accanto al punto (x, y) della carreggiata, dal lato n: si cerca lungo il cordolo (avanti e indietro)
  function paloAlCordolo(rd, x, y, nx, ny, tx, ty, yaw, pref, spazio) {
    const Ln = lin(rd), q = lNear(Ln, x, y), c = lAt(Ln, q.s), half = rd.w / 2 + CFG.palo.dal;
    for (const vede of [true, false]) for (const d of pref || [0, -1, 1, -2, 2, -3, 3, -4, 4, -6, 6]) { const p = lAt(Ln, q.s + d), px = p.x + nx * half, py = p.y + ny * half;
      if (liberoPalo(px, py, null, spazio) && (!vede || visibile(px, py, 2.7))) return { x: px, y: py, yaw }; }
    return null;
  }
  // un cartello: si appende al palo vicino se c'è posto (due per palo), se no un palo nuovo
  function cartello(k, pos, motivo) {
    const near = PALI.find(p => p.tipo === 'cartelli' && p.plates.length < 2 && hyp(p.x - pos.x, p.y - pos.y) < 1.4 && Math.abs(Math.atan2(Math.sin(p.yaw - pos.yaw), Math.cos(p.yaw - pos.yaw))) < .6);
    const plate = { k, motivo }; if (near) { near.plates.push(plate); CART.push(Object.assign({ palo: near }, plate)); return near; }
    // schiena contro schiena: lo stesso supporto, la faccia di dietro (chi esce dal vicolo legge una cosa, chi entra l'altra)
    const dietro = PALI.find(p => p.tipo === 'cartelli' && hyp(p.x - pos.x, p.y - pos.y) < 1.4 && !p.plates.some(q => q.retro) && Math.abs(Math.abs(Math.atan2(Math.sin(p.yaw - pos.yaw), Math.cos(p.yaw - pos.yaw))) - PI) < .5);
    if (dietro) { plate.retro = true; dietro.plates.push(plate); CART.push(Object.assign({ palo: dietro }, plate)); return dietro; }
    if (PALI.some(p => hyp(p.x - pos.x, p.y - pos.y) < 1.1)) return null;   // due supporti non si toccano
    const P = { tipo: 'cartelli', x: pos.x, y: pos.y, yaw: pos.yaw, plates: [plate], muro: pos.muro || null }; PALI.push(P); CART.push(Object.assign({ palo: P }, plate)); return P;
  }
  // il muro più vicino di fianco a una bocca di vicolo: la mensola a bandiera per l'area pedonale (nei vicoli il marciapiede non c'è)
  function muroDiFianco(x, y, nx, ny) {
    for (const sd of [1, -1]) for (let o = .4; o < 4; o += .2) { const wx = x + nx * sd * o, wy = y + ny * sd * o; if (tile(wx, wy) === T.BLD) { const ax = wx - nx * sd * .2, ay = wy - ny * sd * .2; return { x: ax, y: ay, nx: -nx * sd, ny: -ny * sd, bi: bIdx(wx, wy) }; } }
    return null;
  }
  function cartelli() {
    const VVm = VV();
    // stop e dare precedenza: sul marciapiede di destra di chi arriva, all'altezza della linea
    PIANO.precedenze.forEach(q => { const rd = q.minore || (q.J.arms ? (q.J.arms.find(a => a.ux === q.ux && a.uy === q.uy) || {}).rd : null); if (!rd || !inC(q.x, q.y)) return; const yaw = Math.atan2(q.ux, q.uy);   // la faccia guarda +u: chi arriva
      if (rd.kind === 'vicolo') { const m = muroDiFianco(q.x + q.ux * .8, q.y + q.uy * .8, q.rx, q.ry); if (m && !davanti(m.x + m.nx * .5, m.y + m.ny * .5, .2)) cartello('precedenza', { x: m.x, y: m.y, yaw, muro: m }, 'sbocco ' + rd.id); return; }
      const p = paloAlCordolo(rd, q.x, q.y, q.rx, q.ry, -q.ux, -q.uy, yaw, [0, 1, 2, 3, 4, 5, 6]); if (p) cartello(q.k, p, 'incrocio'); });
    // l'attraversamento pedonale: uno per zebra, sul marciapiede dal lato della camera se si può
    (PIANO.zebre || []).forEach(c => { if (!inC(c.x, c.y)) return; const nx = -c.uy, ny = c.ux, sds = (nx + ny) <= 0 ? [1, -1] : [-1, 1];   // dal lato lontano dalla camera (nord-ovest): davanti al muro, non dietro la casa d'angolo
      let got = null; for (const vede of [true, false]) for (const sd of sds) { if (got) break;
        const half = c.rd.w / 2 + CFG.palo.dal; for (const d of [1.9, 2.5, 3.1, -1.9, -2.5, -3.1]) { const x = c.x + nx * sd * half + c.ux * d, y = c.y + ny * sd * half + c.uy * d; if (liberoPalo(x, y) && (!vede || visibile(x, y, 2.7))) { got = { x, y, yaw: Math.atan2(c.ux * Math.sign(d), c.uy * Math.sign(d)) }; break; } } }
      if (got) cartello('attraversamento', got, c.motivo); });
    // l'area pedonale agli ingressi del borgo: dove un vicolo del borgo (E0-E2) sbocca sulla via, sul muro di fianco (al più sei, i più frequentati)
    const bocche = []; junctions().forEach(([jx, jy, jr]) => { if (!zonaC(jx, jy)) return; const A = armsAt(jx, jy, jr, true), vie = A.filter(a => a.rd.kind === 'citta'); if (!vie.length) return;
      A.forEach(a => { if (a.rd.kind !== 'vicolo' || !/^E[0-2]$/.test(a.rd.era || '')) return; bocche.push({ a, jx, jy, d0: Math.max(...vie.map(v => v.w)) / 2 + 1.6, peso: a.w * 10 + (a.rd.id === 'rua' || a.rd.id === 'marina' ? 30 : 0) }); }); });
    bocche.sort((p, q) => q.peso - p.peso); let nPed = 0;
    bocche.forEach(B0 => { if (nPed >= 6) return; const a = B0.a, x = B0.jx + a.ux * B0.d0, y = B0.jy + a.uy * B0.d0; if (CART.some(c => c.k === 'pedonale' && hyp(c.palo.x - x, c.palo.y - y) < 25)) return;
      const m = muroDiFianco(x, y, a.uy, -a.ux); if (!m || davanti(m.x + m.nx * .5, m.y + m.ny * .5, .2)) return; cartello('pedonale', { x: m.x, y: m.y, yaw: Math.atan2(a.ux, a.uy) + PI, muro: m }, 'borgo ' + a.rd.id); nPed++; });
    // il divieto di sosta sull'asse (la Vittoria è pulita per ordine): ai due capi
    const vit = ROADS().find(r => r.id === 'vittoria'); if (vit) { const Ln = lin(vit); [24, Ln.L - 24].forEach((s, i) => {   // dopo l'incrocio, non sull'angolo (lì vanno le indicazioni)
      const p = lAt(Ln, s), nx = -Math.sin(p.ang), ny = Math.cos(p.ang), sd = (nx + ny) >= 0 ? 1 : -1, yaw = Math.atan2(Math.cos(p.ang) * (i ? -1 : 1), Math.sin(p.ang) * (i ? -1 : 1));
      const q = paloAlCordolo(vit, p.x, p.y, nx * sd, ny * sd, 0, 0, yaw, [0, 2, -2, 4, -4, 6, -6, 8, -8, 10, -10], 3.5); if (q) cartello('divieto_sosta', q, 'asse'); }); }
    // la P: dove ci sono gli stalli (a gruppi di 40 m), al più quattro
    if (VVm) { const gr = []; VVm.stalli().forEach(s => { if (!gr.some(g => hyp(g.x - s.x, g.y - s.y) < 40)) gr.push(s); });
      gr.slice(0, 4).forEach(s => { let got = null; for (const o of [1.4, 2, 2.6]) for (const d of [0, 2.5, -2.5, 5, -5]) { if (got) break; const x = s.x + s.nx * o + Math.cos(s.ang) * d, y = s.y + s.ny * o + Math.sin(s.ang) * d; if (liberoPalo(x, y)) got = { x, y, yaw: Math.atan2(-s.nx, -s.ny) }; } if (got) cartello('P', got, 'sosta'); }); }
  }

  // ---------------- 3. LE INDICAZIONI ----------------
  // le mete: dai dati (W.luoghi, W.PLACES, W.sets); il nome corto sul cartello; bianco per la città, marrone per i luoghi da vedere
  function mete() {
    const L = id => (W.luoghi || []).find(l => l.id === id), P = id => W.PLACES && W.PLACES[id], S = k => (W.sets || []).find(q => q.k === k);
    const xy = o => o ? (o.x !== undefined && o.x !== null && o.y !== undefined && o.y !== null ? [o.x, o.y] : o.x0 !== undefined ? [(o.x0 + o.x1) / 2, (o.y0 + o.y1) / 2] : null) : null;
    const out = [], add = (id, testo, o, colore, nome) => { const p = xy(o); if (p) out.push({ id, testo, x: p[0], y: p[1], colore, nome: nome || (o && (o.nome || o.name)) || testo }); };
    add('porto', 'PORTO', P('calata') || S('marina'), 'bianco', P('calata') && P('calata').name);
    add('stazione', 'STAZIONE', L('stazione'), 'bianco');
    add('mercato', 'MERCATO', L('mercato'), 'bianco');
    add('centro', 'CENTRO', S('adunata') || P('piazza_gov'), 'bianco', (S('adunata') || {}).nome);
    add('scalo', 'SCALO', L('officina') ? { x: (S('scalo') || L('officina')).x0 !== undefined ? ((S('scalo').x0 + S('scalo').x1) / 2) : L('officina').x, y: S('scalo') ? (S('scalo').y0 + S('scalo').y1) / 2 : L('officina').y, nome: 'Scalo' } : null, 'bianco');
    const F = W.FORT, gt = F && F.gates ? F.gates.find(g => g.kind === 'terra') : null; add('rocca', 'ROCCA', gt ? { x: Math.min(F.ditch[0], F.ditch[2]) - 4, y: gt.y, nome: (L('rocca') || {}).nome } : L('rocca'), 'marrone');
    add('chiesa', 'S. ROCCO', L('chiesa'), 'marrone', P('chiesa') && P('chiesa').name);
    add('lido', 'LIDO', P('bagno_9'), 'marrone', P('bagno_9') && P('bagno_9').name);
    return out;
  }
  // il campo di distanza (m) sulla griglia percorribile da una meta (Dijkstra a 8 vicini, a celle)
  function campo(x0, y0) {
    const N = GW * GH, D = new Float32Array(N).fill(1e9), ok = i => { const v = M.grid[i]; return !(v === T.BLD || v === T.WATER || v === T.CLIFF || v === T.FOUNT); };
    const tx0 = clamp(Math.floor(x0 / TS), 0, GW - 1), ty0 = clamp(Math.floor(y0 / TS), 0, GH - 1); let s0 = ty0 * GW + tx0;
    if (!ok(s0)) { let bd = 1e9; for (let r = 1; r < 12 && bd === 1e9; r++) for (let a = -r; a <= r; a++) for (const [tx, ty] of [[tx0 + a, ty0 - r], [tx0 + a, ty0 + r], [tx0 - r, ty0 + a], [tx0 + r, ty0 + a]]) { if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) continue; const i = ty * GW + tx; if (ok(i)) { const d = hyp(tx - tx0, ty - ty0); if (d < bd) { bd = d; s0 = i; } } } }
    // coda a secchi (distanze in decimetri): abbastanza esatta, veloce
    const B = [], push = (i, d) => { const k = Math.round(d * 10); (B[k] || (B[k] = [])).push(i); }; D[s0] = 0; push(s0, 0);
    const NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    const X0 = Math.max(0, Math.floor((CORNICE[0] - 200) / TS)), X1 = Math.min(GW - 1, Math.ceil((CORNICE[2] + 200) / TS)), Y0 = Math.max(0, Math.floor((CORNICE[1] - 200) / TS)), Y1 = Math.min(GH - 1, Math.ceil((CORNICE[3] + 200) / TS));   // la finestra della città
    for (let k = 0; k < B.length; k++) { const Q = B[k]; if (!Q) continue; for (let h = 0; h < Q.length; h++) { const i = Q[h], d = D[i]; if (Math.round(d * 10) !== k) continue; const tx = i % GW, ty = (i - tx) / GW;
      if (d > 1400) continue; for (const [a, b, c] of NB) { const x2 = tx + a, y2 = ty + b; if (x2 < X0 || y2 < Y0 || x2 > X1 || y2 > Y1) continue; const j = y2 * GW + x2; if (!ok(j)) continue; if (a && b && (!ok(ty * GW + x2) || !ok(y2 * GW + tx))) continue; const nd = d + c * TS; if (nd < D[j] - .05) { D[j] = nd; push(j, nd); } } } B[k] = null; }
    return D;
  }
  const dAt = (D, x, y) => { let m = 1e9; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const tx = Math.floor(x / TS) + dx, ty = Math.floor(y / TS) + dy; if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) continue; m = Math.min(m, D[ty * GW + tx]); } return m; };
  function indicazioni() {
    const ME = mete(); ME.forEach(m => { m.D = campo(m.x, m.y); }); PIANO.mete = ME.map(m => ({ id: m.id, testo: m.testo, x: m.x, y: m.y, colore: m.colore, nome: m.nome }));
    // gli incroci dove si sceglie: quelli fra vie (render.js junc1) in città, più gli sbocchi della Rua e della Marina; uno ogni 40 m
    const cand = [];
    junc1().forEach(J => { if (!J.city || !inC(J.x, J.y) || J.arms.length < 3) return; cand.push({ x: J.x, y: J.y, r: J.r, arms: J.arms.map(a => ({ ux: a.ux, uy: a.uy, w: a.w, rd: a.rd })), peso: J.arms.reduce((s, a) => s + a.w, 0) }); });
    junctions().forEach(([jx, jy, jr]) => { if (!zonaC(jx, jy) || !inC(jx, jy)) return; const A = armsAt(jx, jy, jr, true).filter(a => a.w >= 3); if (A.length < 3 || !A.some(a => a.rd.kind === 'citta' || a.w >= 4.5)) return; if (cand.some(c => hyp(c.x - jx, c.y - jy) < 8)) return;
      cand.push({ x: jx, y: jy, r: jr, arms: A, peso: A.reduce((s, a) => s + a.w * (a.rd.kind === 'citta' ? 1 : .6), 0) }); });
    cand.sort((a, b) => b.peso - a.peso);
    // [pianta] dieci incroci (erano otto): con l'anello sul mare ci sono più bivi dove scegliere
    const scelti = []; cand.forEach(c => { if (scelti.length < 10 && !scelti.some(o => hyp(o.x - c.x, o.y - c.y) < 38)) scelti.push(c); });
    scelti.forEach(J => {
      // le frecce: per ogni meta il braccio che la avvicina di più (sul cammino vero)
      const frecce = [];
      ME.forEach(m => { const dJ = dAt(m.D, J.x, J.y); if (dJ < 45 || dJ > 900) return; let best = null, bd = dJ - 6;
        J.arms.forEach(a => { const d = dAt(m.D, J.x + a.ux * (J.r + 8), J.y + a.uy * (J.r + 8)); if (d < bd) { bd = d; best = a; } }); if (best) frecce.push({ m, a: best, d: dJ }); });
      if (!frecce.length) return;
      // al più quattro, al più due per direzione (prima le direzioni diverse: il cartello serve a scegliere)
      frecce.sort((p, q) => (p.m.colore === q.m.colore ? 0 : p.m.colore === 'bianco' ? -1 : 1) || p.d - q.d); const tieni = [], perDir = new Map();
      for (const pass of [1, 2]) frecce.forEach(f => { if (tieni.length >= 4 || tieni.includes(f)) return; const n = perDir.get(f.a) || 0; if (n >= pass) return; perDir.set(f.a, n + 1); tieni.push(f); });
      tieni.sort((p, q) => (p.m.colore === q.m.colore ? 0 : p.m.colore === 'bianco' ? -1 : 1));
      if (tieni.length < 2) return;
      // il palo: all'angolo fra due bracci, sul marciapiede
      const ang = J.arms.map(a => Math.atan2(a.uy, a.ux)).sort((a, b) => a - b), bis = []; for (let i = 0; i < ang.length; i++) { const a0 = ang[i], a1 = i + 1 < ang.length ? ang[i + 1] : ang[0] + 2 * PI, m = (a0 + a1) / 2; bis.push({ m, sp: a1 - a0 }); }
      bis.sort((p, q) => (Math.cos(p.m) + Math.sin(p.m)) - (Math.cos(q.m) + Math.sin(q.m)));   // l'angolo lontano dalla camera (nord-ovest): la camera (sud-est) lo vede attraverso l'incrocio; quello vicino lo nasconde la sua casa
      const dita = (x, y) => tieni.every(f => { const a = Math.atan2(f.a.uy, f.a.ux); for (let d = .2; d <= 1.75; d += .2) if (tile(x + Math.cos(a) * d, y + Math.sin(a) * d) === T.BLD) return false; return true; });   // le frecce non entrano nei muri
      let pos = null; for (const vede of [true, false]) for (const b of bis) { if (b.sp < .9 || pos) continue; for (let o = J.r + 1; o < J.r + 7 && !pos; o += .5) { const x = J.x + Math.cos(b.m) * o, y = J.y + Math.sin(b.m) * o; if (liberoPalo(x, y, null, 3) && dita(x, y) && (!vede || visibile(x, y, 2.9))) pos = { x, y }; } }
      if (!pos) return;
      const P = { tipo: 'indicazioni', x: pos.x, y: pos.y, yaw: 0, plates: tieni.map((f, i) => ({ k: 'freccia|' + f.m.id, meta: f.m.id, testo: f.m.testo, colore: f.m.colore, dir: Math.atan2(f.a.uy, f.a.ux), y: 2.35 + i * .44 })) };
      PALI.push(P); IND.push({ x: P.x, y: P.y, incrocio: [J.x, J.y], frecce: P.plates.map(p => ({ meta: p.meta, testo: p.testo, dir: +p.dir.toFixed(3), colore: p.colore })) });
    });
  }

  // ---------------- 4. LE INSEGNE ----------------
  // il mestiere → il tipo dell'insegna (il disegno, il colore, la parola, se si accende la notte)
  const TIPI = {
    bar: { w: 'BAR', bg: '#b8262a', fg: '#fff6e0', ic: 'tazza', luce: 1 }, tabacchi: { w: 'TABACCHI', bg: '#1c2a52', fg: '#f4f0e6', ic: 'T', luce: 1, forma: 'alta' },
    farmacia: { w: 'FARMACIA', bg: '#1f8a3a', fg: '#ffffff', ic: 'croce', luce: 1, forma: 'croce' }, ambulatorio: { w: 'AMBULATORIO', bg: '#f2f0ea', fg: '#c8201c', ic: 'crocerossa' },
    drogheria: { w: 'ALIMENTARI', bg: '#e8c25a', fg: '#3a2410', ic: 'cesta' }, alimentari: { w: 'ALIMENTARI', bg: '#e8c25a', fg: '#3a2410', ic: 'cesta' },
    pescheria: { w: 'PESCHERIA', bg: '#2a6a9a', fg: '#f4f0e6', ic: 'pesce' }, barbiere: { w: 'BARBIERE', bg: '#f2f0ea', fg: '#1c2a52', ic: 'barbiere' },
    trattoria: { w: 'TRATTORIA', bg: '#6a2a1e', fg: '#f6e6c0', ic: 'fiasco', luce: 1 }, osteria: { w: 'OSTERIA', bg: '#6a2a1e', fg: '#f6e6c0', ic: 'fiasco', luce: 1 },
    hotel: { w: 'HOTEL', bg: '#1e3a7a', fg: '#ffe9a8', ic: 'stelle', luce: 1 }, pensione: { w: 'PENSIONE', bg: '#1e3a7a', fg: '#ffe9a8', ic: 'stelle', luce: 1 },
    officina: { w: 'OFFICINA', bg: '#2a2c30', fg: '#f2c02a', ic: 'chiave' }, autorimessa: { w: 'GARAGE', bg: '#2a2c30', fg: '#f2c02a', ic: 'chiave' },
    panetteria: { w: 'PANE', bg: '#c88a3a', fg: '#2a1a0a', ic: 'pane', luce: 1 }, forno: { w: 'FORNO', bg: '#c88a3a', fg: '#2a1a0a', ic: 'pane', luce: 1 },
    latteria: { w: 'LATTERIA', bg: '#e8eef4', fg: '#1e4a8a', ic: 'latte' }, fruttivendolo: { w: 'FRUTTA', bg: '#3a7a2a', fg: '#fff6d8', ic: 'mela' },
    calzolaio: { w: 'CALZATURE', bg: '#5a3a24', fg: '#f4e4c8', ic: 'scarpa' }, merceria: { w: 'MERCERIA', bg: '#c84a8a', fg: '#fff4fa', ic: 'rocchetto' },
    ferramenta: { w: 'FERRAMENTA', bg: '#c86a1a', fg: '#1a1410', ic: 'martello' }, profumeria: { w: 'PROFUMERIA', bg: '#e8b8d0', fg: '#4a1a3a', ic: 'boccetta' },
    orologiaio: { w: 'OROLOGI', bg: '#1a1a1a', fg: '#e8c25a', ic: 'orologio' }, cartoleria: { w: 'CARTOLERIA', bg: '#f2f0ea', fg: '#2a4a8a', ic: 'matita' },
    lavanderia: { w: 'LAVANDERIA', bg: '#5ab8d8', fg: '#0a2a3a', ic: 'goccia' }, palestra: { w: 'PALESTRA', bg: '#1a1a1a', fg: '#ff5a3a', ic: 'manubrio' },
    tipografia: { w: 'TIPOGRAFIA', bg: '#2a2a2a', fg: '#f2f0ea', ic: 'lettera' }, circolo: { w: 'CIRCOLO', bg: '#a8201c', fg: '#fff2e0', ic: 'stella' },
    scuola: { w: 'SCUOLA', bg: '#f2f0ea', fg: '#1a1a1a', ic: 'tricolore' }, teatro: { w: 'TEATRO', bg: '#6a1a2a', fg: '#ffd23b', ic: 'maschere', luce: 1 }, cinema: { w: 'CINEMA', bg: '#6a1a2a', fg: '#ffd23b', ic: 'pellicola', luce: 1 },
    sartoria: { w: 'SARTORIA', bg: '#2a2a4a', fg: '#f2f0ea', ic: 'forbici' }, pub: { w: 'BIRRERIA', bg: '#2a4a2a', fg: '#f2c02a', ic: 'boccale', luce: 1 },
    abbigliamento: { w: 'MODA', bg: '#f2f0ea', fg: '#a8203a', ic: 'gruccia' }, armeria: { w: 'ARMERIA', bg: '#3a3a2a', fg: '#e8e0c8', ic: 'bersaglio' },
    elettrodomestici: { w: 'ELETTRO', bg: '#2a5a9a', fg: '#ffffff', ic: 'fulmine' }, mobili: { w: 'MOBILI', bg: '#7a5a3a', fg: '#f4e4c8', ic: 'sedia' },
    gelateria: { w: 'GELATI', bg: '#f4d0e0', fg: '#8a1a4a', ic: 'cono', luce: 1 }, ufficio: { w: 'UFFICI', bg: '#c8c4b8', fg: '#1a1a1a', ic: 'lettera' },
    mercato: { w: 'MERCATO', bg: '#2a5a3a', fg: '#f4f0e0', ic: 'cesta', forma: 'pannello' }, chiesa: { w: 'S. ROCCO', bg: '#7a4a2a', fg: '#f4ead8', ic: 'campanile', forma: 'pannello' },
    baracche: { w: 'BARACCHE', bg: '#8a7a5a', fg: '#2a1a0a', ic: 'fiamma', forma: 'tavola' }, posto_blocco: { w: 'ALT', bg: '#f2f0ea', fg: '#c8201c', ic: 'alt', forma: 'pannello' },
    rocca: { w: 'ROCCA', bg: '#7a4a2a', fg: '#f4ead8', ic: 'torre', forma: 'pannello' }, covo: { w: '', bg: '#3a4a3a', fg: '#7aff8a', ic: 'foglia', forma: 'segno' },
  };
  const tipoDi = b => { const u = String(b.use || '').toLowerCase(), id = String(b.id || ''), t = String(b.sign && b.sign.t || '');
    if (TIPI[u]) return u; if (/hotel/i.test(t) || /miramare|flamingo|paradiso|oceano/.test(id)) return 'hotel'; if (/pension/i.test(t)) return 'pensione';
    if (/osteria|trattoria|car_2/.test(id) || /OSTERIA|TRATTORIA|VINI/.test(t)) return 'trattoria'; if (/^bar|sirena|caff/i.test(id + ' ' + t)) return 'bar';
    if (/officina|cantiere|benzina/.test(id)) return 'officina'; if (/gelat/.test(id)) return 'gelateria'; if (/ambulatorio/.test(id)) return 'ambulatorio'; if (/wu|alimentar/i.test(id + t)) return 'alimentari'; return null; };
  // le facce di un edificio: inizio, tangente, normale verso fuori, lunghezza
  function facciata(b, f) {
    const x0 = b.x * TS, y0 = b.y * TS, x1 = (b.x + b.w) * TS, y1 = (b.y + b.h) * TS;
    return f === 'S' ? { f, ox: x0, oy: y1, tx: 1, ty: 0, nx: 0, ny: 1, L: x1 - x0 } : f === 'N' ? { f, ox: x0, oy: y0, tx: 1, ty: 0, nx: 0, ny: -1, L: x1 - x0 }
      : f === 'E' ? { f, ox: x1, oy: y0, tx: 0, ty: 1, nx: 1, ny: 0, L: y1 - y0 } : { f, ox: x0, oy: y0, tx: 0, ty: 1, nx: -1, ny: 0, L: y1 - y0 };
  }
  const latoDi = (b, d) => !d ? null : d[1] === b.y + b.h ? 'S' : d[1] === b.y - 1 ? 'N' : d[0] === b.x + b.w ? 'E' : d[0] === b.x - 1 ? 'W' : null;
  const uDi = (F, tx, ty) => F.tx ? (tx + .5) * TS - F.ox : (ty + .5) * TS - F.oy;
  // i portici (pezzi): una faccia sotto il portico ha l'insegna nella lunetta dell'arco, sul filo dei pilastri
  function porticoDi(F, u) {
    const x = F.ox + F.tx * u, y = F.oy + F.ty * u;
    for (const p of W.pezzi || []) { if (p.tipo !== 'portico') continue; const o = p.opz || {}, L = (o.campate || 1) * (o.campata || 4), P = o.profondita || 4, rot = p.rot || 0; if (Math.abs(rot) > .01 || F.f !== 'S') continue;
      if (x < p.x - .2 || x > p.x + L + .2 || Math.abs(y - (p.y - P / 2 - .25)) > 1.2) continue;
      const cw = o.campata || 4, i = clamp(Math.floor((x - p.x) / cw), 0, (o.campate || 1) - 1); return { p, xa: p.x + i * cw + cw / 2, ya: p.y + P / 2 - .25, h: o.h || 4.4, luce: cw - (o.pilastro || .7) }; }
    return null;
  }
  const scorciFirma = b => { const S = W.scorci; if (!S) return null; const L = Array.isArray(S) ? S : Object.values(S); return L.find(s => s && (s.bi === G.BUILDINGS.indexOf(b) || s.b === b.id || s.edificio === b.id || s.id === b.id || (s.bottega && s.bottega === b.id)) && (s.insegna || s.sign || s.firma || (Array.isArray(s.kit) && s.kit.some(k => /insegna/.test(k))))) || null; };
  // la bandiera di una bottega sotto casa: sulla faccia della bottega, appena fuori dal fronte, dal lato lontano dal portone
  function bandieraDi(b, tipo, testo) {
    const S = b.shopFront, f0 = S && S.face || latoDi(b, b.door); if (!f0) return null; const f = f0, F = facciata(b, f), dS = S && S.door ? S.door : b.door;
    const us = (S && S.span ? S.span : [dS, dS]).map(t => uDi(F, t[0], t[1])), u0 = Math.min(...us) - TS / 2, u1 = Math.max(...us) + TS / 2, up = b.door && latoDi(b, b.door) === f ? uDi(F, b.door[0], b.door[1]) : null;
    const porte = []; (fronti() || []).forEach(q => { if (q.b === b || Math.abs((q.x - F.ox) * F.nx + (q.z - F.oy) * F.ny) < .8) { const u = (q.x - F.ox) * F.tx + (q.z - F.oy) * F.ty; if (u > -1 && u < F.L + 1 && q.tipo === 'porta') porte.push(u); } });
    const lontano = up === null ? 1 : (u0 + u1) / 2 >= up ? 1 : -1, cands = [];
    for (const sd of [lontano, -lontano]) for (const o of [.35, .7, 1.1]) cands.push(sd > 0 ? u1 + o : u0 - o);
    cands.push(F.L - .35, .35);
    for (const sd of [lontano, -lontano]) for (const o of [1.6, 2.2, 2.8]) cands.push(sd > 0 ? u1 + o : u0 - o);   // [pianta] un po' più in là, se lì la camera la vede (solo nel primo giro, quello che cerca la vista)
    const prova = (f, F, u, vede) => { if (u < .3 || u > F.L - .3) return null; if (f === f0 && porte.some(pu => Math.abs(pu - u) < .55)) return null;   // mai sull'asse di una porta (sopra c'è l'architrave)
      const x = F.ox + F.tx * u, y = F.oy + F.ty * u, pt = porticoDi(F, u);
      if (vede && !pt && !visibile(x + F.nx * .7, y + F.ny * .7, 3.1)) return null;   // prima dove la camera la vede
      if (pt) return { montaggio: 'lunetta', f, u, x: pt.xa, y: pt.ya, nx: 0, ny: 1, w: Math.min(1.9, pt.luce - .9), h: .5, y0: pt.h - .55 - .5, bi: G.BUILDINGS.indexOf(b) };
      const larga = (u) => { const x = F.ox + F.tx * u, y = F.oy + F.ty * u; let w = CFG.bandiera.a; for (const d of [1.2, 1.6, 2.2]) if (PIENO(tile(x + F.nx * d, y + F.ny * d)) && tile(x + F.nx * d, y + F.ny * d) === T.BLD) { w = Math.min(w, d * .5); break; } return w; };
      const w = larga(u); if (w < .55) return null; if (PIENO(tile(x + F.nx * .3, y + F.ny * .3))) return null;
      if (INS.some(q => q.montaggio === 'bandiera' && hyp(q.x - x, q.y - y) < 2.4)) return null;
      if (targheVicine(G.BUILDINGS.indexOf(b), x, y)) return null;
      if (f !== f0 && (fronti() || []).some(q => q.tipo === 'porta' && hyp(q.x - x, q.z - y) < .9)) return null;
      const R = RT(); if (R && R.grafo().nodi.some(n => (n.k === 'mensola' || n.k === 'contatore' || n.k === 'lampione') && n.bi === G.BUILDINGS.indexOf(b) && hyp(n.x - x, n.z - y) < .9)) return null;
      const fo = (TIPI[tipo] || {}).forma, wq = Math.min(w, CFG.bandiera.a) - CFG.bandiera.da;   // la croce quadrata, il pannello alto dei tabacchi
      return { montaggio: 'bandiera', f, u, x, y, nx: F.nx, ny: F.ny, w: fo === 'croce' ? Math.min(wq, .7) : fo === 'alta' ? Math.min(wq, .6) : wq, h: fo === 'croce' ? .7 : fo === 'alta' ? .76 : CFG.bandiera.h, y0: fo === 'alta' || fo === 'croce' ? 2.72 : CFG.bandiera.y0, bi: G.BUILDINGS.indexOf(b) }; };
    for (const vede of [true, false]) {
      for (const [ci, u] of cands.entries()) { if (!vede && ci >= 8) continue; const q = prova(f0, F, u, vede); if (q) return q; }
      // [pianta] la bottega d'angolo: se la sua faccia non si vede, la bandiera gira l'angolo, sulla faccia verso la camera (sud o est), vicino allo spigolo
      if (vede) for (const f2 of ['S', 'E']) { if (f2 === f0) continue; const F2 = facciata(b, f2), d0 = Math.hypot(F2.ox - F.ox, F2.oy - F.oy), d1 = Math.hypot(F2.ox + F2.tx * F2.L - F.ox - F.tx * F.L, F2.oy + F2.ty * F2.L - F.oy - F.ty * F.L);
        const lato = Math.min(Math.hypot(F2.ox - F.ox - F.tx * F.L, F2.oy - F.oy - F.ty * F.L), d0) < Math.min(d1, Math.hypot(F2.ox + F2.tx * F2.L - F.ox, F2.oy + F2.ty * F2.L - F.oy)) ? 0 : 1;
        for (const o of [.6, 1, 1.4]) { const q = prova(f2, F2, lato ? F2.L - o : o, true); if (q) return q; } }
    }
    return null;
  }
  // le targhe delle vie e i civici del piano dell'arredo (scena.js): l'angolo della via resta alla targa
  const SC = () => (typeof Scena !== 'undefined' && Scena && Scena.attivo && Scena.attivo() ? Scena : null);
  const targheVicine = (bi, x, y) => { const S = SC(); if (!S) return false; const A = S.piano(); return A.targhe.some(t => t.bi === bi && hyp(t.x - x, t.z - y) < .9) || A.civici.some(c => c.bi === bi && hyp(c.x - x, c.z - y) < .5); };
  // una targa a muro accanto al portone (ripiego: si legge da vicino)
  function targaDi(b) { const f = latoDi(b, b.door); if (!f) return null; const F = facciata(b, f), up = uDi(F, b.door[0], b.door[1]), u = up + (up + 1 <= F.L - .3 ? .95 : -.95);
    return { montaggio: 'targa', f, u, x: F.ox + F.tx * u, y: F.oy + F.ty * u, nx: F.nx, ny: F.ny, w: .6, h: .42, y0: 1.45, bi: G.BUILDINGS.indexOf(b) }; }
  // un muro che guarda un punto (per i luoghi senza bottega): la faccia di casa più vicina che dà sulla piazza
  function muroVerso(x, y, raggio) {
    let best = null, bd = raggio || 16;
    G.BUILDINGS.forEach((b, bi) => { const cx = (b.x + b.w / 2) * TS, cy = (b.y + b.h / 2) * TS; if (hyp(cx - x, cy - y) > 40 || b.military) return;
      ['S', 'E', 'N', 'W'].forEach(f => { const F = facciata(b, f); for (let u = 1; u < F.L - .6; u += 1) { const wx = F.ox + F.tx * u, wy = F.oy + F.ty * u; if (PIENO(tile(wx + F.nx * 1.2, wy + F.ny * 1.2))) continue; const d = hyp(wx - x, wy - y), vede = (x - wx) * F.nx + (y - wy) * F.ny > 0; if (!vede || d > bd) continue; bd = d; best = { b, bi, f, u, F }; } }); });
    return best;
  }
  function insegne() {
    const B = G.BUILDINGS, att = B.filter(b => (b.shop || b.sign || b.shopFront) && b.door && inC((b.door[0] + .5) * TS, (b.door[1] + .5) * TS));
    const voce = (o) => { INS.push(o); return o; };
    att.forEach(b => {
      const tipo = tipoDi(b) || 'ufficio', T0 = TIPI[tipo], testo = (b.sign && b.sign.t) || (b.name || '').toUpperCase(), id = 'ins_' + b.id, base = { id, place: b.id, nome: b.name || b.label || b.id, testo, tipo, luogo: null };
      const sc = scorciFirma(b); if (sc) return voce(Object.assign(base, { fonte: 'scorci', montaggio: 'scorcio', x: (b.door[0] + .5) * TS, y: (b.door[1] + .5) * TS, facing: 0 }));
      if (!b.shopFront || b.shopFront.piano === undefined) {   // i locali che render.js firma già con l'insegna grande accesa sulla faccia del portone
        const f = latoDi(b, b.door) || 'S', F = facciata(b, f); return voce(Object.assign(base, { fonte: 'facciata', montaggio: b.deco && b.fl >= 4 ? 'bandiera_verticale' : 'fascia', f, x: (b.door[0] + .5) * TS - F.nx * TS / 2, y: (b.door[1] + .5) * TS - F.ny * TS / 2, facing: Math.atan2(F.nx, F.ny), parola: T0.w })); }
      const q = bandieraDi(b, tipo, testo) || targaDi(b); if (!q) return;
      b.__blade = true;   // la bandiera al neon a caso di render.js no: la bandiera di questa bottega è questa
      voce(Object.assign(base, { fonte: 'segnaletica', parola: T0.w, icona: T0.ic, bg: T0.bg, fg: T0.fg, luce: !!T0.luce, fascia: true, facing: Math.atan2(q.nx, q.ny) }, q));
    });
    // i luoghi-missione: legati alla loro attività se ne hanno una lì (stessa voce), se no la loro insegna
    (W.luoghi || []).forEach(l => {
      const vicina = INS.filter(q => q.place && B.find(b => b.id === q.place)).map(q => ({ q, b: B.find(b => b.id === q.place) })).map(o => ({ ...o, d: hyp((o.b.door[0] + .5) * TS - l.x, (o.b.door[1] + .5) * TS - l.y) }))
        .filter(o => o.d < 26 && (tipoDi(o.b) === l.id || o.b.id === l.id || (l.id === 'radio' && o.b.id === 'disco') || (l.id === 'officina' && o.b.id === 'officina'))).sort((p, q) => p.d - q.d)[0];
      if (vicina) { vicina.q.luogo = l.id; return; }
      const T0 = TIPI[l.id] || TIPI.ufficio, base = { id: 'ins_luogo_' + l.id, place: 'luogo:' + l.id, nome: l.nome, luogo: l.id, tipo: l.id, testo: T0.w, parola: T0.w, icona: T0.ic, bg: T0.bg, fg: T0.fg, luce: !!T0.luce, fonte: 'segnaletica' };
      if (l.id === 'stazione') { const p = (W.pezzi || []).find(q => q.tipo === 'stazione'); if (p) return voce(Object.assign(base, { fonte: 'pezzo', montaggio: 'pezzo', x: p.x, y: p.y, facing: 0, testo: (p.opz && p.opz.nome) || 'STAZIONE' })); }
      if (T0.forma === 'pannello' || T0.forma === 'tavola') {   // a palo: il Mercato, la chiesa, il posto di blocco, la Rocca, le baracche
        let x = l.x, y = l.y; if (l.id === 'rocca' || l.id === 'posto_blocco') { const F = W.FORT, gt = F && F.gates ? F.gates.find(g => g.kind === 'terra') : null; if (gt) { x = Math.min(F.ditch[0], F.ditch[2]) - (l.id === 'rocca' ? 5 : 16); y = gt.y; } }
        if (l.id === 'mercato') { const p = (W.pezzi || []).find(q => q.tipo === 'tettoia_mercato'); if (p) { x = p.x + (p.opz.diametro || 28) / 2 + 2; y = p.y + 3; } }
        if (l.id === 'chiesa') { const S = (W.sets || []).find(q => q.k === 'sagrato'); if (S) { x = S.x1 - 1.5; y = S.y1 + .2; } }
        let got = null; for (let r = 0; r < 14 && !got; r += .5) for (let a = 0; a < 16 && !got; a++) { const px = x + Math.cos(a * PI / 8 + PI / 4) * r, py = y + Math.sin(a * PI / 8 + PI / 4) * r; if ((liberoPalo(px, py) && (r > 8 || visibile(px, py, 2.4))) || (l.id !== 'mercato' && l.id !== 'chiesa' && !zonaC(px, py) && !PIENO(tile(px, py)) && !suCarreggiata(px, py, .3) && !PALI.some(p => hyp(p.x - px, p.y - py) < 1.1))) got = { x: px, y: py }; }
        if (!got) return; const yaw = Math.atan2(1, 1);   // la faccia verso la camera (sud-est)
        const P = { tipo: 'pannello', x: got.x, y: got.y, yaw, plates: [{ k: 'ins|' + l.id, ins: base.id }], forma: T0.forma }; PALI.push(P);
        return voce(Object.assign(base, { montaggio: T0.forma === 'tavola' ? 'tavola' : 'pannello', x: got.x, y: got.y, facing: yaw, w: T0.forma === 'tavola' ? 1.3 : 1.5, h: T0.forma === 'tavola' ? .6 : .9, y0: T0.forma === 'tavola' ? 1.2 : 1.9 })); }
      // a muro: il Forno (la bandiera sulla piazzetta), il covo (il segno dipinto, piccolo, per chi lo sa)
      const m = muroVerso(l.x, l.y, l.id === 'covo' ? 14 : 18); if (!m) return;
      if (l.id === 'covo') return voce(Object.assign(base, { montaggio: 'segno', f: m.f, u: m.u, x: m.F.ox + m.F.tx * m.u, y: m.F.oy + m.F.ty * m.u, nx: m.F.nx, ny: m.F.ny, w: .55, h: .55, y0: 1.4, bi: m.bi, facing: Math.atan2(m.F.nx, m.F.ny) }));
      const q = (() => { const F = m.F; for (const du of [0, .6, -.6, 1.2, -1.2, 1.8, -1.8]) { const u = clamp(m.u + du, .4, F.L - .4), x = F.ox + F.tx * u, y = F.oy + F.ty * u; if (INS.some(o => hyp(o.x - x, o.y - y) < 2.4) || (fronti() || []).some(f => f.tipo === 'porta' && hyp(f.x - x, f.z - y) < .9) || targheVicine(m.bi, x, y)) continue; return { montaggio: 'bandiera', f: m.f, u, x, y, nx: F.nx, ny: F.ny, w: CFG.bandiera.a - CFG.bandiera.da, h: CFG.bandiera.h, y0: CFG.bandiera.y0, bi: m.bi }; } return null; })();
      if (q) voce(Object.assign(base, q, { facing: Math.atan2(q.nx, q.ny) }));
    });
  }

  // ================= IL PIANO INTERO =================
  function piano(rifai) {
    if (PIANO && !rifai) return PIANO; STR.length = 0; CART.length = 0; PALI.length = 0; IND.length = 0; INS.length = 0; OST = null; FR = null;
    PIANO = { strisce: STR, cartelli: CART, pali: PALI, indicazioni: IND, insegne: INS, zebre: [], precedenze: [], bus: [], mete: [] };
    if (!ATTIVO) return PIANO;
    strisce(); insegne(); cartelli(); indicazioni();
    W.insegne = INS; W.segnaletica = { strisce: STR, cartelli: CART, pali: PALI, indicazioni: IND };
    return PIANO;
  }
  // al caricamento (prima che render.js costruisca le case): solo le insegne, per marcare le botteghe che hanno la bandiera di questo filone
  function prenota() { if (!ATTIVO) return; STR.length = 0; PALI.length = 0; INS.length = 0; FR = null; PIANO = { strisce: STR, cartelli: CART, pali: PALI, indicazioni: IND, insegne: INS, zebre: [], precedenze: [], bus: [], mete: [] }; insegne(); W.insegne = INS.slice(); PIANO = null; }
  // i conti per le prove e per chi misura
  function conta() { const P = piano(), per = {}; P.strisce.forEach(s => { per[s.k] = (per[s.k] || 0) + 1; }); const pc = {}; P.cartelli.forEach(c => { pc[c.k] = (pc[c.k] || 0) + 1; }); const fi = {}; P.insegne.forEach(q => { fi[q.fonte + ':' + q.montaggio] = (fi[q.fonte + ':' + q.montaggio] || 0) + 1; });
    return { strisce: P.strisce.length, perTessera: per, zebre: P.zebre.length, cartelli: P.cartelli.length, perCartello: pc, pali: P.pali.length, indicazioni: P.indicazioni.length, frecce: P.indicazioni.reduce((s, q) => s + q.frecce.length, 0), insegne: P.insegne.length, perFonte: fi }; }
  // i riquadri fusi che la grafica farà (materiale × riquadro di SETT m): il tetto delle chiamate di disegno in più
  function riquadri() { const P = piano(), S = new Set(), k = (m, x, y) => m + '|' + Math.floor(x / SETT) + ',' + Math.floor(y / SETT);
    P.strisce.forEach(s => S.add(k('strisce', s.x, s.y))); P.pali.forEach(p => { S.add(k('pali', p.x, p.y)); S.add(k(p.plates.some(q => q.k.startsWith('ins|')) && false ? 'luce' : 'cartelli', p.x, p.y)); });
    P.insegne.forEach(q => { if (q.fonte !== 'segnaletica') return; S.add(k(q.luce ? 'luce' : 'cartelli', q.x, q.y)); S.add(k('pali', q.x, q.y)); });
    return { n: S.size, chiavi: [...S] }; }

  // ================= LA GRAFICA (solo nel browser) =================
  // L'ATLANTE: una tela 2048 × 2048, tessere impilate a scaffali. Le tessere delle strisce sono bianche (il giallo lo dà il colore del
  // vertice); quelle dei cartelli hanno la loro forma nell'alfa (ottagono, triangolo, tondo, croce): il materiale le ritaglia (alphaTest).
  const ATL = { c: null, x: null, S: 2048, uv: new Map(), riga: { x: 0, y: 0, h: 0 }, tex: null };
  function tessera(key, w, h, draw) {
    if (ATL.uv.has(key)) return ATL.uv.get(key); const A = ATL, pad = 4;
    if (A.riga.x + w + pad > A.S) { A.riga = { x: 0, y: A.riga.y + A.riga.h + pad, h: 0 }; }
    const x0 = A.riga.x, y0 = A.riga.y; A.riga.x += w + pad; A.riga.h = Math.max(A.riga.h, h);
    if (y0 + h > A.S) { console.warn('[segnaletica] atlante pieno', key); return [0, 0, 0, 0]; }
    const x = A.x; x.save(); if (A.f && A.f !== 1) x.scale(A.f, A.f); x.translate(x0, y0); x.beginPath(); x.rect(0, 0, w, h); x.clip(); draw(x, w, h); x.restore();
    const uv = [(x0 + .5) / A.S, 1 - (y0 + h - .5) / A.S, (x0 + w - .5) / A.S, 1 - (y0 + .5) / A.S]; A.uv.set(key, uv); return uv;
  }
  const r2 = (s) => { let a = (s * 2654435761) >>> 0 || 1; return () => { a ^= a << 13; a >>>= 0; a ^= a >>> 17; a ^= a << 5; a >>>= 0; return a / 4294967296; }; };
  function usura(x, w, h, seed, n, forte) { const r = r2(seed); x.save(); x.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < n; i++) { x.fillStyle = `rgba(0,0,0,${(r() * (forte || .7)).toFixed(2)})`; const s = 1 + r() * (forte ? 6 : 3); x.fillRect(r() * w, r() * h, s * (1 + r() * 2), s); } x.restore(); }
  function sporco(x, w, h, seed, n) { const r = r2(seed); for (let i = 0; i < n; i++) { x.fillStyle = `rgba(60,50,40,${(r() * .12).toFixed(2)})`; x.fillRect(r() * w, r() * h, 2 + r() * 10, 1 + r() * 3); } }
  function fitFont(x, t, maxW, size, peso, fam) { let s = size; x.font = `${peso || 'bold'} ${s}px ${fam || 'Arial, Helvetica, sans-serif'}`; while (s > 8 && x.measureText(t).width > maxW) { s--; x.font = `${peso || 'bold'} ${s}px ${fam || 'Arial, Helvetica, sans-serif'}`; } return s; }
  const tondo = (x, cx, cy, r, f) => { x.beginPath(); x.arc(cx, cy, r, 0, PI * 2); x.fillStyle = f; x.fill(); };
  function rrect(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
  // i disegni dei mestieri (in un quadrato di lato s centrato in cx, cy, col colore c)
  function icona(x, k, cx, cy, s, c, bg) {
    x.save(); x.translate(cx, cy); x.fillStyle = c; x.strokeStyle = c; x.lineWidth = s * .08; x.lineCap = 'round'; x.lineJoin = 'round'; const h = s / 2;
    const P = (pts, chiudi) => { x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(a * h, b * h) : x.moveTo(a * h, b * h)); if (chiudi !== false) x.closePath(); };
    switch (k) {
      case 'tazza': P([[-.7, -.2], [.4, -.2], [.3, .55], [-.6, .55]]); x.fill(); x.beginPath(); x.arc(.5 * h, .12 * h, .22 * h, -PI / 2, PI / 2); x.stroke(); P([[-.9, .7], [.6, .7]], false); x.stroke(); for (const o of [-.4, -.05]) { x.beginPath(); x.moveTo(o * h, -.4 * h); x.quadraticCurveTo((o + .15) * h, -.6 * h, o * h, -.85 * h); x.stroke(); } break;
      case 'T': x.font = `bold ${s * 1.25}px Georgia, "Times New Roman", serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('T', 0, s * .06); break;
      case 'croce': case 'crocerossa': { const a = .3; P([[-a, -1], [a, -1], [a, -a], [1, -a], [1, a], [a, a], [a, 1], [-a, 1], [-a, a], [-1, a], [-1, -a], [-a, -a]]); x.fill(); break; }
      case 'cesta': P([[-.85, -.1], [.85, -.1], [.6, .75], [-.6, .75]]); x.fill(); x.beginPath(); x.arc(0, -.1 * h, .6 * h, PI, 0); x.stroke(); x.fillStyle = bg; for (let i = -2; i <= 2; i++) x.fillRect(i * .28 * h - .04 * h, .05 * h, .08 * h, .6 * h); break;
      case 'pesce': x.beginPath(); x.ellipse(-.1 * h, 0, .65 * h, .32 * h, 0, 0, PI * 2); x.fill(); P([[.45, 0], [.95, -.4], [.95, .4]]); x.fill(); x.fillStyle = bg; tondo(x, -.5 * h, -.05 * h, .07 * h, bg); break;
      case 'barbiere': { x.save(); rrect(x, -.28 * h, -.9 * h, .56 * h, 1.8 * h, .2 * h); x.clip(); x.fillStyle = '#f2f0ea'; x.fillRect(-h, -h, 2 * h, 2 * h); const cs = ['#c8201c', '#1e4a9a']; for (let i = -6; i < 6; i++) { x.fillStyle = cs[(i + 6) % 2]; x.beginPath(); x.moveTo(-.3 * h, i * .3 * h); x.lineTo(.3 * h, (i * .3 - .3) * h); x.lineTo(.3 * h, (i * .3 - .18) * h); x.lineTo(-.3 * h, (i * .3 + .12) * h); x.fill(); } x.restore(); x.lineWidth = s * .05; rrect(x, -.28 * h, -.9 * h, .56 * h, 1.8 * h, .2 * h); x.stroke(); break; }
      case 'fiasco': x.beginPath(); x.arc(0, .3 * h, .55 * h, 0, PI * 2); x.fill(); x.fillRect(-.12 * h, -.9 * h, .24 * h, .8 * h); x.fillStyle = bg; x.fillRect(-.55 * h, .1 * h, 1.1 * h, .14 * h); x.fillRect(-.55 * h, .4 * h, 1.1 * h, .1 * h); break;
      case 'stelle': for (let i = -1; i <= 1; i++) { x.save(); x.translate(i * .62 * h, 0); x.beginPath(); for (let k2 = 0; k2 < 10; k2++) { const r = k2 % 2 ? .13 * h : .3 * h, a = k2 * PI / 5 - PI / 2; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); x.fill(); x.restore(); } break;
      case 'chiave': x.lineWidth = s * .16; x.beginPath(); x.moveTo(-.6 * h, .6 * h); x.lineTo(.3 * h, -.3 * h); x.stroke(); x.beginPath(); x.arc(.45 * h, -.45 * h, .32 * h, 0, PI * 2); x.fill(); x.fillStyle = bg; x.beginPath(); x.moveTo(.45 * h, -.45 * h); x.lineTo(.9 * h, -.6 * h); x.lineTo(.6 * h, -.9 * h); x.fill(); break;
      case 'pane': x.beginPath(); x.ellipse(0, .1 * h, .85 * h, .45 * h, 0, PI, 0); x.lineTo(.85 * h, .3 * h); x.lineTo(-.85 * h, .3 * h); x.closePath(); x.fill(); x.strokeStyle = bg; x.lineWidth = s * .05; for (const o of [-.4, 0, .4]) { x.beginPath(); x.moveTo((o - .12) * h, -.15 * h); x.lineTo((o + .12) * h, .1 * h); x.stroke(); } break;
      case 'latte': P([[-.3, -.9], [.3, -.9], [.3, -.55], [.5, -.3], [.5, .9], [-.5, .9], [-.5, -.3], [-.3, -.55]]); x.fill(); x.fillStyle = bg; x.fillRect(-.36 * h, -.05 * h, .72 * h, .35 * h); break;
      case 'mela': x.beginPath(); x.arc(-.25 * h, .15 * h, .5 * h, 0, PI * 2); x.arc(.25 * h, .15 * h, .5 * h, 0, PI * 2); x.fill(); x.lineWidth = s * .07; x.beginPath(); x.moveTo(0, -.3 * h); x.lineTo(.1 * h, -.8 * h); x.stroke(); x.beginPath(); x.ellipse(.35 * h, -.65 * h, .25 * h, .1 * h, -.4, 0, PI * 2); x.fill(); break;
      case 'scarpa': P([[-.9, .5], [-.9, -.3], [-.5, -.3], [-.2, .05], [.7, .2], [.9, .5]]); x.fill(); x.fillRect(-.9 * h, .55 * h, 1.8 * h, .14 * h); break;
      case 'rocchetto': x.fillRect(-.55 * h, -.8 * h, 1.1 * h, .2 * h); x.fillRect(-.55 * h, .6 * h, 1.1 * h, .2 * h); x.fillRect(-.35 * h, -.6 * h, .7 * h, 1.2 * h); x.strokeStyle = bg; x.lineWidth = s * .03; for (let i = -5; i <= 5; i++) { x.beginPath(); x.moveTo(-.35 * h, i * .1 * h); x.lineTo(.35 * h, i * .1 * h + .05 * h); x.stroke(); } break;
      case 'martello': x.save(); x.rotate(-.6); x.fillRect(-.08 * h, -.3 * h, .16 * h, 1.2 * h); x.fillRect(-.5 * h, -.6 * h, 1 * h, .32 * h); x.restore(); break;
      case 'boccetta': rrect(x, -.45 * h, -.2 * h, .9 * h, 1.05 * h, .2 * h); x.fill(); x.fillRect(-.15 * h, -.55 * h, .3 * h, .4 * h); x.beginPath(); x.arc(0, -.75 * h, .2 * h, 0, PI * 2); x.fill(); break;
      case 'orologio': x.beginPath(); x.arc(0, 0, .8 * h, 0, PI * 2); x.fill(); x.strokeStyle = bg; x.fillStyle = bg; x.beginPath(); x.arc(0, 0, .62 * h, 0, PI * 2); x.fill(); x.strokeStyle = c; x.lineWidth = s * .08; x.beginPath(); x.moveTo(0, -.45 * h); x.lineTo(0, 0); x.lineTo(.32 * h, .12 * h); x.stroke(); break;
      case 'matita': x.save(); x.rotate(-.7); x.fillRect(-.14 * h, -.8 * h, .28 * h, 1.3 * h); P([[-.14, .5], [.14, .5], [0, .9]]); x.fill(); x.restore(); break;
      case 'goccia': x.beginPath(); x.moveTo(0, -.9 * h); x.bezierCurveTo(.7 * h, 0, .7 * h, .8 * h, 0, .8 * h); x.bezierCurveTo(-.7 * h, .8 * h, -.7 * h, 0, 0, -.9 * h); x.fill(); break;
      case 'manubrio': x.fillRect(-.6 * h, -.08 * h, 1.2 * h, .16 * h); for (const o of [-1, 1]) { x.fillRect(o * .6 * h - .14 * h, -.45 * h, .28 * h, .9 * h); x.fillRect(o * .82 * h - .08 * h, -.3 * h, .16 * h, .6 * h); } break;
      case 'lettera': rrect(x, -.8 * h, -.5 * h, 1.6 * h, 1 * h, .08 * h); x.fill(); x.strokeStyle = bg; x.lineWidth = s * .06; P([[-.8, -.5], [0, .1], [.8, -.5]], false); x.stroke(); break;
      case 'stella': x.beginPath(); for (let k2 = 0; k2 < 10; k2++) { const r = k2 % 2 ? .35 * h : .85 * h, a = k2 * PI / 5 - PI / 2; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); x.fill(); break;
      case 'tricolore': ['#2a8a3a', '#f4f2ea', '#c8201c'].forEach((cc, i) => { x.fillStyle = cc; x.fillRect((-.9 + i * .6) * h, -.6 * h, .6 * h, 1.2 * h); }); x.strokeStyle = '#1a1a1a'; x.lineWidth = s * .03; x.strokeRect(-.9 * h, -.6 * h, 1.8 * h, 1.2 * h); break;
      case 'maschere': x.beginPath(); x.ellipse(-.3 * h, 0, .45 * h, .55 * h, -.2, 0, PI * 2); x.fill(); x.beginPath(); x.ellipse(.35 * h, .1 * h, .45 * h, .55 * h, .2, 0, PI * 2); x.fill(); x.fillStyle = bg; [[-.45, -.1], [-.15, -.15], [.2, 0], [.5, 0]].forEach(([a, b]) => tondo(x, a * h, b * h, .08 * h, bg)); break;
      case 'pellicola': x.beginPath(); x.arc(-.4 * h, -.2 * h, .38 * h, 0, PI * 2); x.arc(.4 * h, -.2 * h, .38 * h, 0, PI * 2); x.fill(); x.fillRect(-.6 * h, .2 * h, 1.1 * h, .6 * h); P([[.5, .35], [.9, .15], [.9, .85], [.5, .65]]); x.fill(); break;
      case 'forbici': x.lineWidth = s * .08; for (const o of [-1, 1]) { x.beginPath(); x.arc(-.55 * h, o * .35 * h, .22 * h, 0, PI * 2); x.stroke(); x.beginPath(); x.moveTo(-.35 * h, o * .25 * h); x.lineTo(.9 * h, -o * .25 * h); x.stroke(); } break;
      case 'boccale': x.fillRect(-.55 * h, -.5 * h, .85 * h, 1.3 * h); x.lineWidth = s * .1; x.beginPath(); x.arc(.35 * h, .15 * h, .3 * h, -PI / 2, PI / 2); x.stroke(); x.fillStyle = '#f4f0e0'; x.beginPath(); x.ellipse(-.12 * h, -.55 * h, .55 * h, .22 * h, 0, 0, PI * 2); x.fill(); break;
      case 'gruccia': x.lineWidth = s * .08; P([[-.85, .5], [0, -.2], [.85, .5], [-.85, .5]], false); x.stroke(); x.beginPath(); x.arc(0, -.45 * h, .2 * h, PI * .9, PI * 2.4); x.stroke(); break;
      case 'bersaglio': [.85, .6, .35].forEach((r, i) => tondo(x, 0, 0, r * h, i % 2 ? bg : c)); tondo(x, 0, 0, .12 * h, c); break;
      case 'fulmine': P([[.15, -.95], [-.5, .1], [-.05, .1], [-.25, .95], [.5, -.15], [.05, -.15]]); x.fill(); break;
      case 'sedia': x.fillRect(-.45 * h, -.9 * h, .14 * h, 1.8 * h); x.fillRect(-.45 * h, -.05 * h, .9 * h, .14 * h); x.fillRect(.31 * h, 0, .14 * h, .9 * h); break;
      case 'cono': P([[-.4, -.1], [.4, -.1], [0, .95]]); x.fill(); x.beginPath(); x.arc(0, -.3 * h, .42 * h, 0, PI * 2); x.fill(); break;
      case 'campanile': x.fillRect(-.3 * h, -.5 * h, .6 * h, 1.4 * h); P([[-.4, -.5], [.4, -.5], [0, -.95]]); x.fill(); x.fillStyle = bg; x.beginPath(); x.arc(0, -.15 * h, .14 * h, PI, 0); x.fillRect(-.14 * h, -.15 * h, .28 * h, .25 * h); x.fill(); break;
      case 'torre': x.fillRect(-.45 * h, -.45 * h, .9 * h, 1.35 * h); for (let i = 0; i < 3; i++) x.fillRect((-.45 + i * .35) * h, -.75 * h, .2 * h, .3 * h); x.fillStyle = bg; x.beginPath(); x.arc(0, .55 * h, .2 * h, PI, 0); x.fillRect(-.2 * h, .55 * h, .4 * h, .35 * h); x.fill(); break;
      case 'fiamma': x.beginPath(); x.moveTo(0, -.95 * h); x.bezierCurveTo(.7 * h, -.2 * h, .6 * h, .85 * h, 0, .85 * h); x.bezierCurveTo(-.6 * h, .85 * h, -.6 * h, 0, -.15 * h, -.3 * h); x.bezierCurveTo(-.1 * h, .1 * h, .1 * h, .1 * h, 0, -.95 * h); x.fill(); break;
      case 'alt': x.beginPath(); for (let k2 = 0; k2 < 8; k2++) { const a = k2 * PI / 4 + PI / 8; x.lineTo(Math.cos(a) * .9 * h, Math.sin(a) * .9 * h); } x.closePath(); x.fill(); x.fillStyle = '#ffffff'; x.font = `bold ${s * .42}px Arial, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('ALT', 0, s * .02); break;
      case 'foglia': x.beginPath(); x.moveTo(0, -.9 * h); x.bezierCurveTo(.8 * h, -.4 * h, .6 * h, .5 * h, 0, .8 * h); x.bezierCurveTo(-.6 * h, .5 * h, -.8 * h, -.4 * h, 0, -.9 * h); x.fill(); x.strokeStyle = bg; x.lineWidth = s * .04; x.beginPath(); x.moveTo(0, -.7 * h); x.lineTo(0, .9 * h); x.stroke(); break;
      default: x.beginPath(); x.arc(0, 0, .5 * h, 0, PI * 2); x.fill();
    }
    x.restore();
  }
  // ---- le tessere ----
  const SEGNI = {
    stop: { w: .9, h: .9, forma: 'otto' }, precedenza: { w: .9, h: .8, forma: 'tri' }, attraversamento: { w: .7, h: .7, forma: 'quadro' }, pedonale: { w: .6, h: .8, forma: 'quadro' },
    divieto_sosta: { w: .7, h: .7, forma: 'tondo' }, P: { w: .7, h: .7, forma: 'quadro' },
  };
  function tessSegno(k) {
    return tessera('cart|' + k, 128, k === 'pedonale' ? 176 : 128, (x, w, h) => { x.clearRect(0, 0, w, h); const c = w / 2;
      if (k === 'stop') { x.beginPath(); for (let i = 0; i < 8; i++) { const a = i * PI / 4 + PI / 8; x.lineTo(c + Math.cos(a) * 62, c + Math.sin(a) * 62); } x.closePath(); x.fillStyle = '#f2f0ea'; x.fill(); x.beginPath(); for (let i = 0; i < 8; i++) { const a = i * PI / 4 + PI / 8; x.lineTo(c + Math.cos(a) * 56, c + Math.sin(a) * 56); } x.closePath(); x.fillStyle = '#b8201c'; x.fill();
        x.fillStyle = '#f6f2ea'; fitFont(x, 'STOP', 96, 40); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('STOP', c, c + 2); }
      else if (k === 'precedenza') { x.beginPath(); x.moveTo(4, 6); x.lineTo(124, 6); x.lineTo(64, 122); x.closePath(); x.fillStyle = '#b8201c'; x.fill(); x.beginPath(); x.moveTo(24, 17); x.lineTo(104, 17); x.lineTo(64, 96); x.closePath(); x.fillStyle = '#f2f0ea'; x.fill(); }
      else if (k === 'attraversamento') { rrect(x, 3, 3, 122, 122, 10); x.fillStyle = '#1f4f9a'; x.fill(); x.beginPath(); x.moveTo(64, 14); x.lineTo(118, 112); x.lineTo(10, 112); x.closePath(); x.fillStyle = '#f2f0ea'; x.fill();
        x.fillStyle = '#1a1a1a'; for (let i = 0; i < 4; i++) x.fillRect(28 + i * 20, 96, 12, 10); tondo(x, 66, 46, 7, '#1a1a1a'); x.lineWidth = 6; x.strokeStyle = '#1a1a1a'; x.lineCap = 'round'; x.beginPath(); x.moveTo(64, 56); x.lineTo(60, 76); x.lineTo(50, 92); x.moveTo(60, 76); x.lineTo(72, 92); x.moveTo(64, 60); x.lineTo(76, 70); x.moveTo(63, 60); x.lineTo(52, 70); x.stroke(); }
      else if (k === 'pedonale') { rrect(x, 3, 3, 122, 170, 8); x.fillStyle = '#f2f0ea'; x.fill(); x.lineWidth = 4; x.strokeStyle = '#1a1a1a'; rrect(x, 8, 8, 112, 160, 6); x.stroke(); tondo(x, 64, 64, 46, '#c8201c'); tondo(x, 64, 64, 39, '#1f4f9a');
        x.strokeStyle = '#f2f0ea'; x.fillStyle = '#f2f0ea'; x.lineWidth = 6; x.lineCap = 'round'; [[50, 0], [76, 6]].forEach(([px, dy]) => { tondo(x, px, 40 + dy, 6, '#f2f0ea'); x.beginPath(); x.moveTo(px, 48 + dy); x.lineTo(px, 70 + dy); x.lineTo(px - 7, 88 + dy); x.moveTo(px, 70 + dy); x.lineTo(px + 7, 88 + dy); x.moveTo(px - 8, 58 + dy); x.lineTo(px + 8, 58 + dy); x.stroke(); });
        x.fillStyle = '#1a1a1a'; x.textAlign = 'center'; x.textBaseline = 'middle'; fitFont(x, 'AREA', 100, 22); x.fillText('AREA', 64, 128); fitFont(x, 'PEDONALE', 104, 22); x.fillText('PEDONALE', 64, 152); }
      else if (k === 'divieto_sosta') { tondo(x, c, c, 62, '#c8201c'); tondo(x, c, c, 48, '#1f4f9a'); x.strokeStyle = '#c8201c'; x.lineWidth = 12; x.beginPath(); x.moveTo(c - 34, c - 34); x.lineTo(c + 34, c + 34); x.stroke(); }
      else if (k === 'P') { rrect(x, 3, 3, 122, 122, 10); x.fillStyle = '#1f4f9a'; x.fill(); x.lineWidth = 3; x.strokeStyle = '#f2f0ea'; rrect(x, 9, 9, 110, 110, 7); x.stroke(); x.fillStyle = '#f2f0ea'; x.font = 'bold 92px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('P', c, c + 5); }
      sporco(x, w, h, k.length * 7, 30); usura(x, w, h, k.length * 13, 25); }); }
  function tessRetro(forma) {
    return tessera('retro|' + forma, 64, 64, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = '#8a8c88'; const c = 32;
      if (forma === 'otto') { x.beginPath(); for (let i = 0; i < 8; i++) { const a = i * PI / 4 + PI / 8; x.lineTo(c + Math.cos(a) * 31, c + Math.sin(a) * 31); } x.closePath(); x.fill(); }
      else if (forma === 'tri') { x.beginPath(); x.moveTo(2, 3); x.lineTo(62, 3); x.lineTo(32, 61); x.closePath(); x.fill(); }
      else if (forma === 'tondo') tondo(x, c, c, 31, '#8a8c88'); else if (forma === 'croce') { const a = 10; x.fillRect(c - a, 1, 2 * a, 62); x.fillRect(1, c - a, 62, 2 * a); }
      else x.fillRect(1, 1, 62, 62);
      x.fillStyle = 'rgba(40,40,40,.25)'; x.fillRect(29, 0, 6, 64); }); }
  // l'insegna di un mestiere (una per tipo, non per bottega: il nome è già sulla fascia)
  function tessInsegna(q) {
    const T0 = TIPI[q.tipo] || TIPI.ufficio, forma = T0.forma || 'piana', key = 'ins|' + q.tipo + (q.montaggio === 'lunetta' ? '|lun' : '') + (q.montaggio === 'segno' ? '|segno' : '');
    const W0 = q.montaggio === 'lunetta' ? 384 : forma === 'pannello' ? 256 : forma === 'tavola' ? 256 : forma === 'alta' ? 160 : 224, H0 = q.montaggio === 'lunetta' ? 112 : forma === 'pannello' ? 160 : forma === 'tavola' ? 112 : forma === 'croce' || forma === 'segno' ? 224 : forma === 'alta' ? 208 : 184;
    return tessera(key, W0, H0, (x, w, h) => { x.clearRect(0, 0, w, h); const bg = T0.bg, fg = T0.fg;
      if (forma === 'croce') { icona(x, 'croce', w / 2, h / 2, w * .96, bg, bg); x.save(); x.globalCompositeOperation = 'source-atop'; const g = x.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); g.addColorStop(0, '#5aff8a'); g.addColorStop(1, bg); x.fillStyle = g; x.fillRect(0, 0, w, h); x.restore(); icona(x, 'croce', w / 2, h / 2, w * .6, '#d8ffe0', bg); return; }
      if (forma === 'segno') { x.globalAlpha = .85; icona(x, 'foglia', w / 2, h / 2, w * .8, fg, bg); x.globalAlpha = 1; usura(x, w, h, 77, 60, .8); return; }
      if (forma === 'tavola') { x.fillStyle = bg; x.fillRect(2, 6, w - 4, h - 12); x.strokeStyle = 'rgba(40,28,16,.5)'; x.lineWidth = 2; for (let y = 20; y < h; y += 26) { x.beginPath(); x.moveTo(2, y); x.lineTo(w - 2, y + 2); x.stroke(); }
        icona(x, T0.ic, 40, h / 2, 56, '#c84a1a', bg); x.fillStyle = fg; x.textAlign = 'left'; x.textBaseline = 'middle'; fitFont(x, T0.w, w - 86, 40, 'bold', 'Impact, "Arial Black", sans-serif'); x.fillText(T0.w, 76, h / 2 + 2); usura(x, w, h, 31, 50); return; }
      rrect(x, 2, 2, w - 4, h - 4, 10); x.fillStyle = bg; x.fill(); x.lineWidth = 4; x.strokeStyle = fg; x.globalAlpha = .8; rrect(x, 9, 9, w - 18, h - 18, 7); x.stroke(); x.globalAlpha = 1;
      if (q.montaggio === 'lunetta') { icona(x, T0.ic, 62, h / 2, 74, fg, bg); x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; fitFont(x, T0.w, w - 140, 54, 'bold', 'Georgia, "Times New Roman", serif'); x.fillText(T0.w, (w + 104) / 2, h / 2 + 3); sporco(x, w, h, 5, 20); return; }
      const big = T0.ic === 'T' || T0.ic === 'alt', isz = big ? h * .62 : h * .5;
      icona(x, T0.ic, w / 2, 18 + isz / 2 + (big ? 0 : 4), isz, fg, bg);
      x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; fitFont(x, T0.w, w - 30, big ? 26 : 34); x.fillText(T0.w, w / 2, h - 30);
      sporco(x, w, h, T0.w.length * 11, 24); usura(x, w, h, T0.w.length * 3, 14); }); }
  // la freccia d'indicazione: bianca coi caratteri neri (marrone coi caratteri bianchi per i luoghi da vedere), punta a destra o a sinistra
  function tessFreccia(meta, testo, colore, verso) {
    return tessera('fre|' + meta + '|' + verso, 448, 104, (x, w, h) => { x.clearRect(0, 0, w, h); const bg = colore === 'marrone' ? '#7a4a26' : '#f2f0ea', fg = colore === 'marrone' ? '#f6eee0' : '#141414', tip = 46;
      x.save(); if (verso < 0) { x.translate(w, 0); x.scale(-1, 1); }
      x.beginPath(); x.moveTo(3, 3); x.lineTo(w - tip, 3); x.lineTo(w - 3, h / 2); x.lineTo(w - tip, h - 3); x.lineTo(3, h - 3); x.closePath(); x.fillStyle = bg; x.fill();
      x.beginPath(); x.moveTo(10, 10); x.lineTo(w - tip - 3, 10); x.lineTo(w - 14, h / 2); x.lineTo(w - tip - 3, h - 10); x.lineTo(10, h - 10); x.closePath(); x.lineWidth = 4; x.strokeStyle = fg; x.stroke(); x.restore();
      const x0 = verso < 0 ? tip + 6 : 16, x1 = verso < 0 ? w - 16 : w - tip - 6; let tx = x0, tw = x1 - x0;
      if (meta === 'centro') { const cx = verso < 0 ? x1 - 30 : x0 + 30; x.lineWidth = 5; x.strokeStyle = fg; x.beginPath(); x.arc(cx, h / 2, 20, 0, PI * 2); x.stroke(); tondo(x, cx, h / 2, 6, fg); if (verso < 0) tw -= 64; else { tx += 64; tw -= 64; } }
      x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; fitFont(x, testo, tw, 58); x.fillText(testo, tx + tw / 2, h / 2 + 3);
      sporco(x, w, h, testo.length * 17 + verso, 30); usura(x, w, h, testo.length * 5 + verso, 12); }); }
  // ---- le tessere delle strisce: bianche, con l'usura nell'alfa ----
  function tessStriscia(k) {
    if (k.startsWith('parola|')) return tessera('str|' + k, 288, 112, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = '#ffffff'; const t = k.slice(7); x.save(); x.translate(w / 2, h / 2); x.rotate(PI / 2); fitFont(x, t, h - 8, 64); x.scale(1, 1); x.textAlign = 'center'; x.textBaseline = 'middle'; x.save(); x.scale(1, w / h * .8); x.fillText(t, 0, 2); x.restore(); x.restore(); usura(x, w, h, t.length * 37, 300, .9); });   // la meta scritta lungo la corsia, alta come lo STOP
    const D = { riga: [256, 16], zebra: [256, 48], stop: [192, 128], triangolo: [48, 48], P: [96, 96], bus: [768, 160], freccia_dritta: [224, 80], freccia_destra: [224, 80], freccia_sinistra: [224, 80], freccia_dritta_destra: [224, 80], freccia_dritta_sinistra: [224, 80] }[k] || [64, 64];
    return tessera('str|' + k, D[0], D[1], (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = '#ffffff'; x.strokeStyle = '#ffffff';
      if (k === 'riga' || k === 'zebra') x.fillRect(0, 1, w, h - 2);
      else if (k === 'stop') { x.save(); x.translate(w / 2, h / 2); x.rotate(PI / 2); x.scale(1, w / h * .9); x.font = PV() && typeof document !== 'undefined' && document.fonts && document.fonts.check('700 60px "Saira Condensed"') ? '700 66px "Saira Condensed", "Arial Narrow", Arial, sans-serif' : 'bold 60px Arial, sans-serif';   /* [strade] le lettere strette e alte della segnaletica italiana */ x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('STOP', 0, 4); x.restore(); }   // le lettere alte lungo la corsia: l'alto verso dove si va
      else if (k === 'triangolo') { x.beginPath(); x.moveTo(w - 2, h / 2); x.lineTo(2, 2); x.lineTo(2, h - 2); x.closePath(); x.fill(); }
      else if (k === 'P') { x.font = 'bold 88px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('P', w / 2, h / 2 + 4); }
      else if (k === 'bus') { x.lineWidth = 8; x.strokeRect(6, 6, w - 12, h - 12); x.lineWidth = 6; x.beginPath(); for (let i = 0; i <= 12; i++) { const px = 10 + i * (w - 20) / 12; x.lineTo(px, i % 2 ? h - 12 : 12); } x.stroke();
        x.save(); x.fillStyle = '#ffffff'; x.globalCompositeOperation = 'destination-out'; x.fillRect(w / 2 - 90, 24, 180, h - 48); x.restore(); x.save(); x.translate(w / 2, h / 2); x.rotate(PI / 2); x.font = 'bold 66px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.scale(1, 1.25); x.fillText('BUS', 0, 2); x.restore(); }
      else if (k.startsWith('freccia')) { const dx = /destra/.test(k), sx = /sinistra/.test(k), dr = /dritta/.test(k), m = h / 2; x.lineWidth = 12; x.lineCap = 'butt';
        if (dr || (!dx && !sx)) { x.fillRect(8, m - 7, w - 70, 14); x.beginPath(); x.moveTo(w - 4, m); x.lineTo(w - 66, m - 28); x.lineTo(w - 66, m + 28); x.closePath(); x.fill(); }
        [[dx, 1], [sx, -1]].forEach(([on, s]) => { if (!on) return; const bx = dr ? 70 : 110; x.beginPath(); x.moveTo(8, m); x.lineTo(bx, m); x.quadraticCurveTo(bx + 34, m, bx + 34, m + s * 18); x.stroke(); x.beginPath(); x.moveTo(bx + 34, m + s * 38); x.lineTo(bx + 14, m + s * 14); x.lineTo(bx + 54, m + s * 14); x.closePath(); x.fill(); }); }
      usura(x, w, h, k.length * 101 + w, Math.round(w * h / (k === 'riga' ? 700 : 260)), k === 'riga' ? .4 : .5); }); }   // [strade] la vernice consumata ma pulita: meno buchi, più leggeri   // le righe sottili meno bucate: dall'alto sparivano

  // ================= LA COSTRUZIONE =================
  let scene = null, groundH = null, ready = false, built = false, MAT = null; const MESH = [], CNT = { mesh: 0, vert: 0, segni: 0, strisce: 0, insegne: 0, pali: 0 };
  function materiali() {
    if (MAT) return MAT;
    const t = new THREE.CanvasTexture(ATL.c); t.anisotropy = 4; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; if (typeof LeggeraMem !== 'undefined' && !(ATL.f < 1)) LeggeraMem.mezza(t); ATL.tex = t;   /* [leggera] sul telefono a metà lato */   // come le altre tele del gioco (render.js canvasTex): senza codifica
    const segni = new THREE.MeshStandardMaterial({ map: t, alphaTest: .5, roughness: .62, metalness: .05 });
    const luce = new THREE.MeshStandardMaterial({ map: t, alphaTest: .5, roughness: .5, metalness: 0, emissive: new THREE.Color('#ffffff'), emissiveMap: t, emissiveIntensity: 0 });
    const pali = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .55, metalness: .35, side: THREE.DoubleSide });
    const strisce = new THREE.MeshStandardMaterial({ map: t, vertexColors: true, transparent: true, depthWrite: false, roughness: .85, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -6 });
    [segni, luce, pali, strisce].forEach(m => { m.userData.segnaletica = true; });
    if (PV()) PV().vernice(strisce);   // [strade] la vernice legge la grana e le crepe dell'asfalto (pavimenti.js)
    return (MAT = { segni, luce, pali, strisce });
  }
  // i mucchi: materiale × riquadro, geometria non indicizzata (posizione, normale, uv, colore a 4)
  const MU = new Map();
  function mucchio(m, x, z) { const k = m + '|' + Math.floor(x / SETT) + ',' + Math.floor(z / SETT); let b = MU.get(k); if (!b) MU.set(k, b = { m, p: [], n: [], u: [], c: [] }); return b; }
  function tri3(b, A, Bv, C, N, uA, uB, uC, cc) { b.p.push(A[0], A[1], A[2], Bv[0], Bv[1], Bv[2], C[0], C[1], C[2]); for (let i = 0; i < 3; i++) b.n.push(N[0], N[1], N[2]); b.u.push(uA[0], uA[1], uB[0], uB[1], uC[0], uC[1]); cc.forEach(c => b.c.push(c[0], c[1], c[2], c[3])); }   // [strade] un colore per vertice
  function tri(b, A, Bv, C, N, uA, uB, uC, col) { b.p.push(A[0], A[1], A[2], Bv[0], Bv[1], Bv[2], C[0], C[1], C[2]); for (let i = 0; i < 3; i++) b.n.push(N[0], N[1], N[2]); b.u.push(uA[0], uA[1], uB[0], uB[1], uC[0], uC[1]); for (let i = 0; i < 3; i++) b.c.push(col[0], col[1], col[2], col[3]); }
  // una piastra verticale che guarda la normale (fx, fz) del piano: R = alto × normale; uv = [u0, v0, u1, v1]
  function piastra(m, cx, cy, cz, fx, fz, w, h, uv, specchio, col) {
    const L = hyp(fx, fz) || 1; fx /= L; fz /= L; const rx = fz, rz = -fx, b = mucchio(m, cx, cz), hw = w / 2, hh = h / 2, N = [fx, 0, fz], c = col || [1, 1, 1, 1];
    const BL = [cx - rx * hw, cy - hh, cz - rz * hw], BR = [cx + rx * hw, cy - hh, cz + rz * hw], TR = [cx + rx * hw, cy + hh, cz + rz * hw], TL = [cx - rx * hw, cy + hh, cz - rz * hw];
    let [u0, v0, u1, v1] = uv; if (specchio) [u0, u1] = [u1, u0];
    tri(b, BL, BR, TR, N, [u0, v0], [u1, v0], [u1, v1], c); tri(b, BL, TR, TL, N, [u0, v0], [u1, v1], [u0, v1], c);
  }
  const C3 = h => { const c = new THREE.Color(h); return [c.r, c.g, c.b, 1]; };
  // una scatola orientata (per i pali, le staffe, le cornici): centro, asse lungo (ux, uz) orizzontale, misure
  function scatola(cx, cy, cz, ax, az, lx, ly, lz, col) {
    const b = mucchio('pali', cx, cz), L = hyp(ax, az) || 1, ux = ax / L, uz = az / L, vx = -uz, vz = ux, c = C3(col);
    const P = (a, y, d) => [cx + ux * a + vx * d, cy + y, cz + uz * a + vz * d], X = lx / 2, Y = ly / 2, Z = lz / 2;
    const facce = [[[X, -Y, -Z], [X, -Y, Z], [X, Y, Z], [X, Y, -Z], [ux, 0, uz]], [[-X, -Y, Z], [-X, -Y, -Z], [-X, Y, -Z], [-X, Y, Z], [-ux, 0, -uz]], [[-X, Y, -Z], [X, Y, -Z], [X, Y, Z], [-X, Y, Z], [0, 1, 0]], [[-X, -Y, Z], [X, -Y, Z], [X, -Y, -Z], [-X, -Y, -Z], [0, -1, 0]], [[X, -Y, Z], [-X, -Y, Z], [-X, Y, Z], [X, Y, Z], [vx, 0, vz]], [[-X, -Y, -Z], [X, -Y, -Z], [X, Y, -Z], [-X, Y, -Z], [-vx, 0, -vz]]];
    facce.forEach(([a, b2, c2, d, N]) => { const A = P(...a), B2 = P(...b2), C2 = P(...c2), D = P(...d); tri(b, A, B2, C2, N, [0, 0], [0, 0], [0, 0], c); tri(b, A, C2, D, N, [0, 0], [0, 0], [0, 0], c); });
  }
  // il palo zincato: un prisma a otto facce (STILE.md, regola 1: il palo è un cilindro a 8 lati, mai sotto i 9 cm), col tappo e il piede
  function palo(x, y0, z, h, r, col) { const b = mucchio('pali', x, z), c = C3(col || '#a4a8a6'), n = 8; r = Math.max(r, .045);   // [coerenza]
    for (let i = 0; i < n; i++) { const a0 = i / n * PI * 2, a1 = (i + 1) / n * PI * 2, am = (a0 + a1) / 2, A = [x + Math.cos(a0) * r, y0, z + Math.sin(a0) * r], Bv = [x + Math.cos(a1) * r, y0, z + Math.sin(a1) * r], C = [x + Math.cos(a1) * r, y0 + h, z + Math.sin(a1) * r], D = [x + Math.cos(a0) * r, y0 + h, z + Math.sin(a0) * r], N = [Math.cos(am), 0, Math.sin(am)];
      tri(b, A, C, Bv, N, [0, 0], [0, 0], [0, 0], c); tri(b, A, D, C, N, [0, 0], [0, 0], [0, 0], c); tri(b, [x, y0 + h, z], C, D, [0, 1, 0], [0, 0], [0, 0], [0, 0], c); }
    scatola(x, y0 + .04, z, 1, 0, r * 3.4, .08, r * 3.4, '#6a6c6a'); }
  // una decalcomania a terra, divisa in pezzi che seguono il suolo
  function decal(s) {
    // [strade] con l'asfalto nuovo: la decalcomania poggia sui triangoli veri del suolo (Pavimenti.quota), divisa più fitta (30 cm) dove le
    // ruote la consumano (zebre, STOP, frecce, linee d'arresto: la vernice cala sulle traiettorie), 1 cm sopra con il polygon offset
    const pv = PV(), fit = pv && /zebra|stop|freccia|bus|triangolo/.test(s.k), passo = fit ? .3 : 1.4;
    const uv = tessStriscia(s.k), ca = Math.cos(s.ang), sa = Math.sin(s.ang), vx = -sa, vy = ca, nu = Math.max(1, Math.ceil(s.L / passo)), nv = Math.max(1, Math.ceil(s.w / passo)), b = mucchio('strisce', s.x, s.y);
    const col = s.giallo ? [.95, .74, .2, s.a] : [.97, .96, .92, Math.min(1, s.a * 1.12)], H = (u, v) => { const x = s.x + ca * u + vx * v, z = s.y + sa * u + vy * v, q = pv ? pv.quota(x, z) : null; return [x, (q !== null ? q + .012 : groundH(x, z) + .028), z]; };
    const C = (A) => fit ? [col[0], col[1], col[2], col[3] * (1 - .25 * pv.ruote(A[0], A[2]))] : col;   // [strade] le ruote la consumano appena (prima a chiazze)
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const ua = -s.L / 2 + s.L * i / nu, ub = -s.L / 2 + s.L * (i + 1) / nu, va = -s.w / 2 + s.w * j / nv, vb = -s.w / 2 + s.w * (j + 1) / nv;
      const U = q => uv[0] + (uv[2] - uv[0]) * ((q + s.L / 2) / s.L), V = q => uv[3] - (uv[3] - uv[1]) * ((q + s.w / 2) / s.w);   // l'alto della tessera (v1) sta a v = -w/2: come la tela ruotata di ang
      const A = H(ua, va), Bv = H(ub, va), C2 = H(ub, vb), D = H(ua, vb), N = [0, 1, 0];
      if (fit) { tri3(b, A, C2, Bv, N, [U(ua), V(va)], [U(ub), V(vb)], [U(ub), V(va)], [C(A), C(C2), C(Bv)]); tri3(b, A, D, C2, N, [U(ua), V(va)], [U(ua), V(vb)], [U(ub), V(vb)], [C(A), C(D), C(C2)]); }
      else { tri(b, A, C2, Bv, N, [U(ua), V(va)], [U(ub), V(vb)], [U(ub), V(va)], col); tri(b, A, D, C2, N, [U(ua), V(va)], [U(ua), V(vb)], [U(ub), V(vb)], col); } }
    CNT.strisce++;
  }
  // un cartello stradale su un supporto (palo o staffa al muro); dir: la normale della faccia (gioco x, y)
  function piastraCartello(k, cx, cy, cz, fx, fz, retroK) {
    const S0 = SEGNI[k], uv = tessSegno(k), ru = retroK ? tessSegno(retroK) : tessRetro(S0.forma), S1 = retroK ? SEGNI[retroK] : S0;
    piastra('segni', cx + fx * .012, cy, cz + fz * .012, fx, fz, S0.w, S0.h, uv);
    piastra('segni', cx - fx * .012, cy, cz - fz * .012, -fx, -fz, S1.w, S1.h, ru);
    CNT.segni++;
  }
  function costruisci() {
    built = true; const P = piano(true); MAT = null;
    if (typeof PuliziaRumore !== 'undefined' && PuliziaRumore.SALTA && PuliziaRumore.SALTA.size) {   // [pulizia] quello che la passata del rumore ha tolto (doppioni, pali addosso a un altro): solo la grafica, il piano resta
      const S = PuliziaRumore.SALTA, k = (c, q) => c + Math.round(q.x * 10) + ',' + Math.round(q.y * 10);
      P.pali = P.pali.filter(p => !S.has(k('p', p))); P.insegne = P.insegne.filter(q => q.fonte !== 'segnaletica' || !S.has(k('i', q))); }
    ATL.f = typeof LeggeraMem !== 'undefined' ? LeggeraMem.meta2() : 1; ATL.c = document.createElement('canvas'); ATL.c.width = ATL.c.height = ATL.S * ATL.f; ATL.x = ATL.c.getContext('2d');   // [dieta] sul telefono a metà lato, le tessere in scala ATL.uv.clear(); ATL.riga = { x: 0, y: 0, h: 0 }; MU.clear();
    // ---- le strisce ----
    P.strisce.forEach(decal);
    if (false) P.strisce.forEach(q => { if (q.k !== 'zebra' && q.k !== 'riga') return; if (hash(q.x, q.y, 77) > .16) return;   // [strade] tolta la ripassata: la copia spostata leggeva come strisce doppie e storte   // [strade] ripassata: la vernice vecchia sotto la nuova, spostata di qualche centimetro
      const d = (hash(q.x, q.y, 78) - .5) * .14, nx = -Math.sin(q.ang), ny = Math.cos(q.ang); decal(Object.assign({}, q, { x: q.x + nx * d + Math.cos(q.ang) * d * .5, y: q.y + ny * d, a: q.a * .38 })); CNT.strisce--; });
    // ---- i pali coi cartelli, i pali delle indicazioni, i pannelli dei luoghi ----
    P.pali.forEach(p => {
      if (p.tipo === 'cartelli') {
        const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw), avanti = p.plates.filter(q => !q.retro), dietro = p.plates.find(q => q.retro);
        if (p.muro) {   // a bandiera dal muro: la staffa perpendicolare, il cartello appeso in fondo
          const m = p.muro, y0 = groundH(m.x + m.nx * .6, m.y + m.ny * .6), L = .62, cx = m.x + m.nx * L, cz = m.y + m.ny * L, top = y0 + 2.55 + avanti.length * .9;
          scatola(m.x + m.nx * L / 2, top + .05, m.y + m.ny * L / 2, m.nx, m.ny, L + .02, .05, .05, '#2a2a2c'); scatola(m.x + m.nx * .02, top - .2, m.y + m.ny * .02, m.nx, m.ny, .04, .5, .14, '#2a2a2c');
          avanti.forEach((q, i) => { const S0 = SEGNI[q.k], cy = top - .06 - (i + .5) * (S0.h + .06) - i * .02; piastraCartello(q.k, cx, cy, cz, fx, fz, i === 0 && dietro ? dietro.k : null); scatola(cx, cy + S0.h / 2 + .03, cz, fx, fz, .03, .1, .03, '#2a2a2c'); });
          CNT.pali++; return; }
        const y0 = groundH(p.x, p.y); let y = y0 + CFG.cartello; const hs = avanti.map(q => SEGNI[q.k].h), tot = hs.reduce((a, b) => a + b + .05, 0);
        palo(p.x, y0, p.y, CFG.cartello + tot + .05, CFG.palo.r);
        avanti.slice().reverse().forEach((q, i) => { const S0 = SEGNI[q.k], cy = y + S0.h / 2; piastraCartello(q.k, p.x + fx * .045, cy, p.y + fz * .045, fx, fz, i === avanti.length - 1 && dietro ? dietro.k : null); [cy - S0.h * .3, cy + S0.h * .3].forEach(yy => scatola(p.x + fx * .03, yy, p.y + fz * .03, fx, fz, .04, .04, .1, '#7a7c7a')); y += S0.h + .05; });
        CNT.pali++;
      } else if (p.tipo === 'indicazioni') {
        const y0 = groundH(p.x, p.y), top = Math.max(...p.plates.map(q => q.y)) + .5; palo(p.x, y0, p.y, top, .045, '#8e928e'); scatola(p.x, y0 + top + .02, p.y, 1, 0, .1, .04, .1, '#5a5c5a');
        p.plates.forEach(q => { const dx = Math.cos(q.dir), dz = Math.sin(q.dir), L = 1.62, H = .38, cx = p.x + dx * (L / 2 + .06), cz = p.y + dz * (L / 2 + .06), cy = y0 + q.y;
          const uvR = tessFreccia(q.meta, q.testo, q.colore, 1), uvL = tessFreccia(q.meta, q.testo, q.colore, -1);
          piastra('segni', cx - dz * .012, cy, cz + dx * .012, -dz, dx, L, H, uvR);   // la faccia a sinistra della freccia: chi la guarda ha la punta a destra
          piastra('segni', cx + dz * .012, cy, cz - dx * .012, dz, -dx, L, H, uvL);
          scatola(p.x + dx * .06, cy, p.y + dz * .06, dx, dz, .12, H * .7, .05, '#5a5c5a'); CNT.segni++; });
        CNT.pali++;
      }
    });
    // ---- le insegne ----
    P.insegne.forEach(q => { if (q.fonte !== 'segnaletica') return; const uv = tessInsegna(q), mat = q.luce ? 'luce' : 'segni';
      if (q.montaggio === 'bandiera') {
        const y0 = groundH(q.x + q.nx * 1.2, q.y + q.ny * 1.2), T0 = TIPI[q.tipo] || {}, w = q.w, h = q.h, d0 = CFG.bandiera.da, cx = q.x + q.nx * (d0 + w / 2), cz = q.y + q.ny * (d0 + w / 2), cy = y0 + q.y0 + h / 2;
        const tx = -q.ny, tz = q.nx;   // la tangente del muro: le due facce guardano lungo la strada
        piastra(mat, cx + tx * .02, cy, cz + tz * .02, tx, tz, w, h, uv); piastra(mat, cx - tx * .02, cy, cz - tz * .02, -tx, -tz, w, h, uv);
        if (T0.forma !== 'croce') scatola(cx, cy, cz, q.nx, q.ny, w + .02, h + .02, .03, '#3a3a3c');   // la cassa sottile (non per la croce: ha la sua sagoma)
        scatola(q.x + q.nx * (d0 + w + .06) / 2, cy + h / 2 + .07, q.y + q.ny * (d0 + w + .06) / 2, q.nx, q.ny, d0 + w + .06, .04, .04, '#26262a');   // il braccio di ferro
        scatola(q.x + q.nx * .03, cy + h / 2 - .1, q.y + q.ny * .03, q.nx, q.ny, .05, .42, .16, '#26262a');   // la piastra al muro
        const sx = q.x + q.nx * (d0 * .55), sz = q.y + q.ny * (d0 * .55); scatola(sx, cy + h / 2 - .08, sz, q.nx, q.ny, d0 * 1.1, .03, .03, '#26262a');
        CNT.insegne++;
      } else if (q.montaggio === 'lunetta') {
        const y0 = groundH(q.x, q.y + .8), cy = y0 + q.y0 + q.h / 2; piastra(mat, q.x, cy, q.y + .015, 0, 1, q.w, q.h, uv); piastra('segni', q.x, cy, q.y - .015, 0, -1, q.w, q.h, tessRetro('quadro'));
        [-1, 1].forEach(s => scatola(q.x + s * q.w * .35, cy + q.h / 2 + .2, q.y, 1, 0, .02, .4, .02, '#26262a')); CNT.insegne++;
      } else if (q.montaggio === 'targa' || q.montaggio === 'segno') {
        const y0 = groundH(q.x + q.nx * .8, q.y + q.ny * .8), cy = y0 + q.y0 + q.h / 2, o = q.montaggio === 'segno' ? .025 : .04; piastra(mat, q.x + q.nx * o, cy, q.y + q.ny * o, q.nx, q.ny, q.w, q.h * (q.montaggio === 'targa' ? 1 : 1), uv);
        if (q.montaggio === 'targa') scatola(q.x + q.nx * .02, cy, q.y + q.ny * .02, -q.ny, q.nx, q.w + .03, q.h + .03, .03, '#3a3a3c'); CNT.insegne++;
      } else if (q.montaggio === 'pannello' || q.montaggio === 'tavola') {
        const y0 = groundH(q.x, q.y), fx = Math.sin(q.facing), fz = Math.cos(q.facing), rx = fz, rz = -fx, cy = y0 + q.y0 + q.h / 2;
        piastra(mat, q.x + fx * .03, cy, q.y + fz * .03, fx, fz, q.w, q.h, uv); piastra('segni', q.x - fx * .03, cy, q.y - fz * .03, -fx, -fz, q.w, q.h, tessRetro('quadro'));
        if (q.montaggio === 'tavola') scatola(q.x, y0 + (q.y0 + q.h) / 2, q.y, rx, rz, .08, q.y0 + q.h, .08, '#5a3e28');
        else [-1, 1].forEach(s => palo(q.x + rx * s * (q.w / 2 - .08), y0, q.y + rz * s * (q.w / 2 - .08), q.y0 + q.h + .05, .035, '#3a5a46'));
        CNT.insegne++;
      }
    });
    // ---- la fusione: un mesh per mucchio ----
    const M0 = materiali(); ATL.tex.needsUpdate = true;
    MU.forEach(b => { if (!b.p.length) return; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(b.u, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(b.c, 4));
      g.computeBoundingSphere(); const me = new THREE.Mesh(g, M0[b.m]); me.matrixAutoUpdate = false; me.castShadow = false; me.receiveShadow = b.m !== 'strisce'; me.userData.segnaletica = b.m; if (b.m === 'strisce') me.renderOrder = 1;
      scene.add(me); MESH.push(me); CNT.vert += b.p.length / 3; });
    CNT.mesh = MESH.length; CNT.atlante = ATL.riga.y + ATL.riga.h;
    if (typeof window !== 'undefined') window.__segnaletica = { conta: conta(), costruito: Object.assign({}, CNT), riquadri: MESH.length };
    if (typeof window !== 'undefined' && (window.__dbg35 || window.__sgdbg)) console.log('[segnaletica]', JSON.stringify(window.__segnaletica));
  }
  function attach(api) { scene = api.scene; groundH = api.groundH; ready = !!(scene && groundH && ATTIVO); }
  function tick(st, time, night) {
    if (!ready) return; if (!built) { try { costruisci(); } catch (e) { built = true; console.error('[segnaletica]', e); } }
    if (MAT) { const k = clamp((night || 0) * 1.25, 0, 1); MAT.luce.emissiveIntensity = k * .85; }
  }
  // per le misure (prima/dopo sulla stessa scena): spegne e riaccende tutto il filone
  function mostra(on) { MESH.forEach(m => { m.visible = !!on; }); return MESH.length; }
  // ---------------- AGGANCIO a ordine_arte.js (come vievive_arte.js) ----------------
  if (typeof THREE !== 'undefined' && typeof OrdineArte !== 'undefined' && OrdineArte && !OrdineArte.__segnaletica && ATTIVO) {
    const a0 = OrdineArte.attach, t0 = OrdineArte.tick; OrdineArte.__segnaletica = true;
    OrdineArte.attach = api => { a0(api); try { attach(api); } catch (e) { console.error('[segnaletica] attach', e); } };
    OrdineArte.tick = (st, time, night, dt, cam) => { t0(st, time, night, dt, cam); try { tick(st, time, night); } catch (e) { if (!tick.err) { tick.err = 1; console.error('[segnaletica]', e); } } };
    try { prenota(); } catch (e) { console.error('[segnaletica] prenota', e); }   // subito, solo le insegne: le bandiere al neon di render.js sanno già quali botteghe hanno la loro
  }

  // [suolo] UN SOLO STRATO: la tela del suolo (render.js marks1, strisce35, segniSuolo1) può dipingere questo segno qui? No, dove lo fa
  // già questo filone con le decalcomanie: le zebre, i segni degli incroci della città, mezzeria e margini delle vie di città, gli stalli
  function tela(k, x, y, rd) {
    if (!ATTIVO) return true;
    if (k === 'zebra') return false;
    if (k === 'stallo' || k === 'P') return !VV();
    if (k === 'incrocio' || k === 'arresto' || k === 'stop' || k === 'triangolo' || k === 'freccia_dritta') return !inC(x, y, 140);
    if (rd && rd.kind === 'citta') return !rd.pts.some(p => inC(p[0], p[1]));
    if (rd && rd.kind !== 'litoranea') return true;   // le strade di campagna: solo la tela
    return !inC(x, y, 140);   // le righe: mezzeria e margini (le costiere fino a 140 m dalla cornice)
  }
  const API = { tela, visibile, ATTIVO, attivo: ATTIVO, CFG, TIPI, SEGNI, SETT, CORNICE, piano, conta, riquadri, junctions, junc1, crossings35, armsAt, nearJ, facciata, tipoDi, mete, campo, dAt, suCarreggiata, liberoPalo, lin, lNear, lAt, attach, tick, mostra, get mesh() { return MESH; }, get costruito() { return CNT; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  return API;
})();
