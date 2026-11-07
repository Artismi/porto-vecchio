/* Porto Vecchio — [urbanistica2] LA FASE F1 DEL MASTERPLAN, IN PROVA: ANELLI E CORTI (v7/MASTERPLAN.md sez. 2 e 5, v7/URBANISTICA2.md).
   Spenta di serie; ?urbanistica2 la accende (in Node: PV_URBANISTICA2=1 node -r ./urbanistica2.js <prova>.js). Il confronto è immediato:
   lo stesso indirizzo con e senza ?urbanistica2.

   Cosa fa (in coordinate finali, dopo expand(): metri, x verso est, y verso sud):
   - M1 l'anello delle Mura: il Sottopassino sotto il rilevato della ferrovia (il pezzo sottopasso, come la Via Cavour), l'Orto delle Mura
     sotto il rilevato, il Vico della Torre dall'Orto alla Rua, lo Slargo della Torre sulla Rua con la fontanella;
   - M3 i passaggi nuovi: l'Androne delle Monache (dalla Rua nella Corte delle Monache, che diventa passante), il Passo della Corte (dalla
     corte al Vico Scuro), il Passo del Calzolaio (dalla Via delle Mura al sagrato, attraverso la corte dietro la chiesa), la Corte del
     Flipper (dalla Vittoria al retro della sala giochi e alla Corte dei Pescatori);
   - la Piazzetta del Lavatoio col lavatoio coperto.
   Ogni slargo ha UNA cosa sola (il pezzo medio) e al più due piccole: la fontanella, il fico, il lavatoio coperto, il pozzo, gli agrumi.

   LA REGOLA DEL COMMITTENTE (sopra il masterplan dove non vanno d'accordo): gomiti, curve e passaggi stretti sono LARGHI, percorribili,
   leggibili. Nessun passaggio sotto 3,4 m liberi (niente Androne «segreto» di 2,6 m); i gomiti girano al più di 30-35° e hanno l'interno
   smussato, così il tratto dopo si vede prima di arrivarci; due gomiti stanno ad almeno 12 m; ogni bocca si riconosce dalla via da cui
   parte (larga quanto il passaggio, con un segno: la luce, la cosa dello slargo vista attraverso). Dove la direzione gira di più (90°), gira
   dentro uno slargo (l'Orto, la Corte delle Monache, la Corte del Flipper), non in un vicolo. Il Sottopassino è corto, largo e chiaro.

   COME SI AGGANCIA (perché i tasselli non cambino a interruttore spento). La città cotta a tasselli ha un'impronta (build.py, IMPRONTA_TASS)
   fatta di tutti i moduli del gioco: toccare world_cittanuova.js la cambierebbe e la città online si costruirebbe nel browser finché il
   workflow non ricuoce. Questo modulo sta FUORI dall'impronta (build.py TASS_FUORI, come il caricatore dei tasselli) perché a interruttore
   spento non fa niente. A interruttore acceso:
   - nel browser la pagina non legge il mondo cotto né i tasselli (index.src.html, tasselli.js), salta world_cittanuova.js e lo riesegue
     subito dopo (dopo()) col testo toccato in tre punti (PEZZE): senza mondo cotto, e con due chiamate a questo modulo, mondo(W) dopo
     expand() (prima che le case arretrino e le casette sole se ne vadano) e fine(W) dopo il verde;
   - in Node lo stesso testo toccato si carica col require (l'aggancio qui in fondo).
   Se una pezza non trova il suo punto (world_cittanuova.js è cambiato), niente pezze: il mondo è quello di serie e Urbanistica2.stato.errore
   dice perché. Quando F1 sarà approvata, le pezze e mondo() entrano in world_cittanuova.js e questo modulo sparisce (e torna nell'impronta).

   mondo(W) lavora come casette() e arretra(): toglie o accorcia le case (al posto di una casa tolta va l'ultima della lista, così le altre
   tengono il loro indice e la città resta com'era), stampa le vie nuove nella griglia (roadW), fa gli slarghi, posa i pezzi con la loro
   quota e rifà le opere (barriere, pedonali). W.urbanistica2: quello che ha fatto (case tolte, accorciate, vie, slarghi, pezzi). */
var Urbanistica2 = (function () {
  'use strict';
  const ON = (() => { try {
    if (typeof location !== 'undefined' && typeof window !== 'undefined') return /[?&]urbanistica2\b/.test(location.search || '') && !/[?&]nourbanistica2\b/.test(location.search || '');
    if (typeof process !== 'undefined' && process.env) return process.env.PV_URBANISTICA2 === '1';
  } catch (e) { } return false; })();
  const STATO = { on: ON, pezze: 0, errore: null };

  // ---------------- le pezze a world_cittanuova.js (ognuna deve trovare il suo punto una volta sola) ----------------
  const PEZZE = [
    // il mondo cotto è di serie: con F1 si calcola
    ['const CT = typeof Cotto !== \'undefined\' ? Cotto : null;', 'const CT = null;'],
    // dopo expand() (e il taglio della mappa nuova): F1, prima che le case arretrino e le casette sole se ne vadano
    ['arretra(mnTaglia(expand(generate())))', 'arretra(Urbanistica2.mondo(mnTaglia(expand(generate())), { T, Z, TS, opere, chaikin }))'],
    // dopo il verde: gli alberi degli slarghi
    ['else if (VG && VG.pianta) VG.pianta(W); }', 'else if (VG && VG.pianta) VG.pianta(W); Urbanistica2.fine(W, { T, TS }); }'],
  ];
  function applica(src) {
    for (const [a] of PEZZE) { const i = src.indexOf(a); if (i < 0 || src.indexOf(a, i + 1) >= 0) throw new Error('[urbanistica2] la pezza non trova il suo punto (una volta sola): ' + a.slice(0, 60)); }
    let s = src; PEZZE.forEach(([a, b]) => { s = s.replace(a, () => b); }); STATO.pezze = PEZZE.length; return s;
  }

  // ---------------- F1 ----------------
  // Le case si indicano col punto (metri finali) di una loro casella e col nome che devono avere (un controllo: se il mondo di serie
  // cambia e lì c'è un'altra casa, l'intervento si salta e si annota). Le misure sono quelle delle tavole 40-46 (MASTERPLAN.md),
  // corrette per la regola del committente (sopra).
  const VIA_W = 3;   // la carreggiata disegnata dei passaggi nuovi (≤ 3 m come i vicoli: test_mappa_compatta); il libero fra le case è 4 m (due caselle)
  // le zone (per provarle una alla volta: ?u2salta=flipper,lavatoio — in Node PV_U2_SALTA): torre (Orto, Vico e Slargo della Torre),
  // sottopassino, monache, calzolaio, lavatoio, flipper
  const SALTA = new Set((() => { try { if (typeof location !== 'undefined' && location.search) { const m = /[?&]u2salta=([^&]+)/.exec(location.search); return m ? decodeURIComponent(m[1]) : ''; }
    if (typeof process !== 'undefined' && process.env) return process.env.PV_U2_SALTA || ''; } catch (e) { } return ''; })().split(',').filter(Boolean));
  const PIANO = {
    togli: [   // [punto, id, zona]
      [1318.5, 284, 'casa_148', 'torre'], [1320.5, 280.5, 'casa_141', 'torre'], [1326.5, 278.5, 'casa_136', 'torre'],   // l'angolo dell'Orto: il Vico della Torre gira dentro lo slargo
      [1318.5, 297, 'casa_204', 'torre'], [1318.5, 292, 'casa_178', 'torre'],                                          // lo Slargo della Torre si allarga sulla Rua
      [1433, 308.5, 'casa_257', 'monache'], [1432, 305, 'casa_240', 'monache'],                                        // l'Androne delle Monache dalla Rua
      [1440, 290, 'casa_175', 'monache'],                                                                              // il Passo della Corte verso il Vico Scuro
      [1392.5, 282, 'casa_143', 'calzolaio'],                                                                          // la bocca sulla Via delle Mura
      [1394.5, 293, 'casa_189', 'calzolaio'], [1394.5, 296.5, 'casa_209', 'calzolaio'], [1396.5, 297, 'casa_195', 'calzolaio'],   // dalla corte dietro la chiesa al sagrato
      [1387, 322.5, 'casa_311', 'lavatoio'], [1384.5, 321, 'casa_304', 'lavatoio'], [1390.5, 326.5, 'casa_321', 'lavatoio'], [1382.5, 326.5, 'casa_320', 'lavatoio'], [1392.5, 322.5, 'casa_312', 'lavatoio'], [1387, 319, 'casa_295', 'lavatoio'],
      [1379, 362, 'casa_359', 'flipper'],                                                                              // la Corte del Flipper verso la Corte dei Pescatori
    ],
    accorcia: [   // [punto, id, lato, caselle, zona]
      [1366.5, 352, 'casa_37', 'E', 1, 'flipper'],    // la Corte del Flipper: il passo dalla Vittoria si apre a 4 m dentro la casa d'angolo (la casa accanto resta:
      [1364, 357, 'casa_37', 'S', 2, 'flipper'],      // senza lei il giro dei tetti del Forno si spezza); e la casa resta col fronte sulla Vittoria, 2 × 4 caselle
      [1373, 363, 'casa_370', 'N', 1, 'flipper'],     // la Corte del Flipper verso la Corte dei Pescatori: da 2 a 4 m
      [1368, 363, 'casa_369', 'N', 1, 'flipper'],     // e lo spigolo fra la corte e il passo: da 2 a 4 m (prima le due case si toccavano d'angolo con la sala giochi)
    ],
  };
  const fa = z => !SALTA.has(z);
  // per le prove: le case da lasciare dove sono (PV_U2_TIENI=casa_330,casa_359)
  const TIENI = new Set((typeof process !== 'undefined' && process.env && typeof window === 'undefined' ? process.env.PV_U2_TIENI || '' : '').split(',').filter(Boolean));

  function mondo(W, K) {
    if (!ON || !W || !W.grid) return W;
    const T = K.T, TS = K.TS, GW = W.GW, GH = W.GH, VW = GW + 1, g = W.grid, BI = W.bIndex, RW = W.roadW, EL = W.elev, VH = W.vh, B = W.BUILDINGS;
    const S = W.urbanistica2 = { tolte: [], accorciate: [], vie: [], slarghi: [], pezzi: [], alberi: [], avvisi: [] };
    const ti = (x, y) => Math.floor(y / TS) * GW + Math.floor(x / TS);
    const casaIn = (x, y) => { const j = BI[ti(x, y)]; return j >= 0 ? B[j] : null; };
    const OPEN = new Set([T.VIA, T.WALK, T.PIAZZA, T.COB]);
    const vAt = (x, y) => { const fx = Math.max(0, Math.min(GW - .001, x / TS)), fy = Math.max(0, Math.min(GH - .001, y / TS)), i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j; return (VH[j * VW + i] * (1 - u) + VH[j * VW + i + 1] * u) * (1 - v) + (VH[(j + 1) * VW + i] * (1 - u) + VH[(j + 1) * VW + i + 1] * u) * v; };
    const elevDaiVertici = i => { const tx = i % GW, ty = (i / GW) | 0; EL[i] = (VH[ty * VW + tx] + VH[ty * VW + tx + 1] + VH[(ty + 1) * VW + tx] + VH[(ty + 1) * VW + tx + 1]) / 4; };
    const libera = (i, v) => { g[i] = v; BI[i] = -1; };
    const anello = (x0, y0, w, h) => { const L = []; for (let ty = y0 - 1; ty <= y0 + h; ty++) for (let tx = x0 - 1; tx <= x0 + w; tx++) { if (tx >= x0 && tx < x0 + w && ty >= y0 && ty < y0 + h) continue; if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) continue; L.push(ty * GW + tx); } return L; };
    const quotaAnello = R => { let h = 0, n = 0, rc = 0; R.forEach(i => { if (OPEN.has(g[i])) { h += EL[i]; n++; rc = Math.max(rc, W.reach[i]); } }); return { h: n ? h / n : null, rc }; };
    const LUOGHI = new Set(Object.values(W.PLACES || {}).map(p => p && p.id));
    const sicura = (b, id, perche) => { if (!b) { S.avvisi.push(perche + ': nessuna casa'); return false; } if (b.id !== id) { S.avvisi.push(perche + ': lì c\'è ' + b.id + ', non ' + id); return false; }
      if (b.name || b.shopFront || b.pezzo || b.torre || LUOGHI.has(b.id) || b.tiers || b.__tierOf) { S.avvisi.push(perche + ': ' + b.id + ' ha un nome, una bottega o è un luogo'); return false; } return true; };

    // 1) le case tolte (le caselle tornano selciato, alla quota del giro attorno)
    const tolte = [];
    PIANO.togli.forEach(([x, y, id, z]) => { if (!fa(z) || TIENI.has(id)) return; const b = casaIn(x, y); if (!sicura(b, id, 'togli ' + id)) return; if (tolte.includes(b)) return;
      const q = quotaAnello(anello(b.x, b.y, b.w, b.h));
      for (let ty = b.y; ty < b.y + b.h; ty++) for (let tx = b.x; tx < b.x + b.w; tx++) { const i = ty * GW + tx; libera(i, T.COB); if (q.h !== null) EL[i] = q.h; W.reach[i] = q.rc || W.reach[i]; }
      tolte.push(b); S.tolte.push({ id: b.id, x: b.x * TS, y: b.y * TS, w: b.w * TS, h: b.h * TS, fl: b.fl || 1 }); });
    // 2) le case accorciate (dal lato del passaggio; la porta, se stava su quel lato, arretra con la casa)
    PIANO.accorcia.forEach(([x, y, id, f, n, z]) => { if (!fa(z) || TIENI.has(id)) return; const b = casaIn(x, y); if (!sicura(b, id, 'accorcia ' + id)) return;
      if ((f === 'N' || f === 'S' ? b.h : b.w) - n < 1) { S.avvisi.push('accorcia ' + id + ': non resta niente'); return; }
      const NV = { S: [0, -1], N: [0, 1], E: [-1, 0], W: [1, 0] }[f], d0 = b.door ? b.door.slice() : null;
      for (let s = 0; s < n; s++) { const cells = [];
        if (f === 'S') { const ty = b.y + b.h - 1; for (let tx = b.x; tx < b.x + b.w; tx++) cells.push(ty * GW + tx); b.h--; }
        else if (f === 'N') { const ty = b.y; for (let tx = b.x; tx < b.x + b.w; tx++) cells.push(ty * GW + tx); b.y++; b.h--; }
        else if (f === 'E') { const tx = b.x + b.w - 1; for (let ty = b.y; ty < b.y + b.h; ty++) cells.push(ty * GW + tx); b.w--; }
        else { const tx = b.x; for (let ty = b.y; ty < b.y + b.h; ty++) cells.push(ty * GW + tx); b.x++; b.w--; }
        cells.forEach(i => { const o = i - NV[1] * GW - NV[0]; libera(i, T.COB); if (OPEN.has(g[o])) { EL[i] = EL[o]; W.reach[i] = W.reach[o] || W.reach[i]; } }); }
      if (b.door) { let [dx, dy] = b.door;
        if (f === 'S' && dy >= b.y + b.h) dy = b.y + b.h; else if (f === 'N' && dy < b.y) dy = b.y - 1; else if (f === 'E' && dx >= b.x + b.w) dx = b.x + b.w; else if (f === 'W' && dx < b.x) dx = b.x - 1;
        if (dx >= b.x - 1 && dx <= b.x + b.w && (dx === b.x - 1 || dx === b.x + b.w)) dy = Math.max(b.y, Math.min(b.y + b.h - 1, dy)); else dx = Math.max(b.x, Math.min(b.x + b.w - 1, dx));
        b.door = [dx, dy]; }
      if (b.cx !== undefined) { b.cx = (b.x + b.w / 2) * TS; b.cy = (b.y + b.h / 2) * TS; b.lw = b.w * TS; b.ld = b.h * TS; }
      S.accorciate.push({ id: b.id, f, caselle: n, porta: d0 ? [d0, b.door] : null }); });

    // 3) le vie nuove: la polilinea (un vertice ogni metro: il binario le trova, writing.js), la carreggiata nella griglia
    const dSeg = (x, y, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)); return Math.hypot(x - ax - dx * t, y - ay - dy * t); };
    const fitta = P => { const out = [P[0].slice()]; for (let k = 1; k < P.length; k++) { const [ax, ay] = P[k - 1], [bx, by] = P[k], n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay))); for (let s = 1; s <= n; s++) out.push([+(ax + (bx - ax) * s / n).toFixed(2), +(ay + (by - ay) * s / n).toFixed(2)]); } return out; };
    const via = (id, name, P0, o) => { o = o || {}; const P = fitta((o.liscia ? K.chaikin(P0, 2) : P0).concat(o.coda || [])), w = o.w || VIA_W, fuori = o.fuori || null;
      const rd = Object.assign({ id, name, w, kind: 'vicolo', pts: P, main: false, era: 'E0', urbanistica2: true }, o.ex || {}); W.roads.push(rd);
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; P.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
      let n = 0; for (let ty = Math.floor((y0 - w) / TS); ty <= Math.floor((y1 + w) / TS); ty++) for (let tx = Math.floor((x0 - w) / TS); tx <= Math.floor((x1 + w) / TS); tx++) {
        const i = ty * GW + tx, cx = tx * TS + TS / 2, cy = ty * TS + TS / 2; if (fuori && fuori(cx, cy)) continue;
        let d = 1e9; for (let k = 1; k < P.length; k++) d = Math.min(d, dSeg(cx, cy, P[k - 1][0], P[k - 1][1], P[k][0], P[k][1])); if (d > w / 2 + .3) continue;
        if (g[i] === T.BLD || g[i] === T.WATER || g[i] === T.PIAZZA || g[i] === T.VIA || g[i] === T.WALK) continue;
        if (g[i] === T.GRAVEL || g[i] === T.GRASS || g[i] === T.DIRT || g[i] === T.SHRUB) g[i] = T.COB;
        if (!(RW[i] > 0)) { RW[i] = w; n++; } }
      S.vie.push({ id, name, L: +P.reduce((s, q, k) => k ? s + Math.hypot(q[0] - P[k - 1][0], q[1] - P[k - 1][1]) : 0, 0).toFixed(1), caselle: n }); return rd; };
    // gli slarghi: il selciato diventa piazza (come CITY.piazzette), dentro l'ellisse o il rettangolo
    const slargo = (nome, cosa, x, y, rx, ry, o) => { o = o || {}; let n = 0;
      for (let ty = Math.floor((y - ry) / TS); ty <= Math.floor((y + ry) / TS); ty++) for (let tx = Math.floor((x - rx) / TS); tx <= Math.floor((x + rx) / TS); tx++) {
        const i = ty * GW + tx, cx = tx * TS + 1, cy = ty * TS + 1, e = ((cx - x) / rx) ** 2 + ((cy - y) / ry) ** 2; if (e > 1) continue;
        if (g[i] === T.BLD || g[i] === T.WATER || g[i] === T.VIA || g[i] === T.FOUNT || g[i] === T.STAIRS) continue;
        if (o.corte) continue;   // la corte resta selciato (la scala ai tetti la trova come corte: tetti.js)
        g[i] = o.verde && o.verde(cx, cy) ? T.GRASS : T.PIAZZA; RW[i] = 0; n++; }
      S.slarghi.push({ nome, cosa, x, y, rx, ry, caselle: n }); };
    // i pezzi: la quota di posa come la passata finale (il punto più basso dell'impronta), le caselle chiuse riservate (BLD senza casa)
    const pw = (p, lx, lz) => { const c = Math.cos(p.rot), s = Math.sin(p.rot); return [p.x + lx * c + lz * s, p.y - lx * s + lz * c]; };
    const pl = (p, wx, wy) => { const c = Math.cos(p.rot), s = Math.sin(p.rot), dx = wx - p.x, dy = wy - p.y; return [dx * c - dy * s, dx * s + dy * c]; };
    const celleDi = (p, x0, x1, z0, z1, f) => { const C = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([a, b]) => pw(p, a, b)); const xs = C.map(c => c[0]), ys = C.map(c => c[1]);
      for (let ty = Math.floor(Math.min(...ys) / TS); ty <= Math.floor(Math.max(...ys) / TS); ty++) for (let tx = Math.floor(Math.min(...xs) / TS); tx <= Math.floor(Math.max(...xs) / TS); tx++) { const [lx, lz] = pl(p, tx * TS + 1, ty * TS + 1); if (lx >= x0 && lx <= x1 && lz >= z0 && lz <= z1) f(ty * GW + tx); } };
    const pezzo = (tipo, x, y, rot, opz, ex, imp, foot) => { const p = Object.assign({ tipo, x, y, rot: rot || 0, opz: opz || {}, urbanistica2: true }, ex || {});
      if (imp) { p.imp = imp; imp.forEach(([k, x0, x1, z0, z1]) => { if (k === 'B') celleDi(p, x0, x1, z0, z1, i => { if (RW[i] > 0 || BI[i] >= 0) return; g[i] = T.BLD; BI[i] = -1; }); }); }
      const r = foot || [-.5, .5, -.5, .5], pts = [[r[0], r[2]], [r[1], r[2]], [r[1], r[3]], [r[0], r[3]], [(r[0] + r[1]) / 2, (r[2] + r[3]) / 2]];
      if (p.q === undefined) p.q = Math.round(Math.min(...pts.map(([a, b]) => vAt(...pw(p, a, b)))) * 100) / 100;
      (W.pezzi = W.pezzi || []).push(p); S.pezzi.push({ tipo, nome: p.nome, x: +x.toFixed(2), y: +y.toFixed(2) }); return p; };

    // ---- M1 · il Sottopassino: dal Lungomare di Tramontana, sotto la ferrovia, all'Orto delle Mura. Dritto, a squadra col binario, corto
    // (22 m da asse ad asse, 9 sotto la volta), largo 4,4 m e alto 3,8: dall'imbocco si vede l'uscita e l'Orto ----
    const XS = 1341, RC = W.railCity || [];
    let C = null, U = null; { let bk = -1, bd = 1e9; RC.forEach((q, k) => { const d = Math.abs(q[0] - XS); if (d < bd) { bd = d; bk = k; } });
      if (bk > 0 && bk < RC.length - 1 && bd < 4) { const a = RC[bk - 1], b = RC[bk + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; U = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
        const t = (XS - a[0]) / ((b[0] - a[0]) || 1); C = [XS, a[1] + (b[1] - a[1]) * t]; } }
    const lung = W.roads.find(r => r.id === 'lung_nord'), yLung = x => { const P = lung ? lung.pts : []; for (let k = 1; k < P.length; k++) if ((P[k - 1][0] - x) * (P[k][0] - x) <= 0 && P[k][0] !== P[k - 1][0]) return P[k - 1][1] + (P[k][1] - P[k - 1][1]) * (x - P[k - 1][0]) / (P[k][0] - P[k - 1][0]); return null; };
    const YO = 281.2;   // l'asse dell'Orto (fra il piede del rilevato e le case)
    if (fa('sottopassino')) { if (C && U && lung) {
      const D = [-U[1], U[0]], s0 = (yLung(C[0]) - C[1]) / D[1], s1 = (YO - C[1]) / D[1];   // D: verso sud, a squadra col binario
      // la quota del passaggio: in piano sotto la volta, fra il Lungomare e l'Orto; i vertici del rilevato lungo il passaggio scendono
      const qN = vAt(C[0] + D[0] * (s0 + 4), C[1] + D[1] * (s0 + 4)), qS = vAt(C[0] + D[0] * (s1 - .5), C[1] + D[1] * (s1 - .5)), q = Math.round((qN * .4 + qS * .6) * 100) / 100;
      const W2 = 4.4, tocchi = new Set();
      for (let j = Math.floor((C[1] + s0 * D[1] - 3) / TS); j <= Math.ceil((C[1] + s1 * D[1] + 3) / TS); j++) for (let i = Math.floor((C[0] - 9) / TS); i <= Math.ceil((C[0] + 9) / TS); i++) {
        const x = i * TS, y = j * TS, lx = (x - C[0]) * U[0] + (y - C[1]) * U[1], lz = (x - C[0]) * D[0] + (y - C[1]) * D[1]; if (Math.abs(lx) > W2 / 2 + 1.2) continue;
        let h = null; if (Math.abs(lz) <= 7.6) h = q; else if (lz < -7.6 && lz > s0 + 3.5) h = q + (qN - q) * Math.min(1, (-7.6 - lz) / 3); else if (lz > 7.6 && lz < s1) h = q + (qS - q) * Math.min(1, (lz - 7.6) / 2.5);
        if (h === null) continue; VH[j * VW + i] = h; for (let b = -1; b <= 0; b++) for (let a = -1; a <= 0; a++) if (i + a >= 0 && j + b >= 0) tocchi.add((j + b) * GW + i + a); }
      tocchi.forEach(i => { const v = g[i]; if (v === T.BLD || v === T.WATER) return; elevDaiVertici(i); if (v === T.GRAVEL) g[i] = T.COB; });
      const P = []; for (let s = s0; s <= s1 + .01; s += 1) P.push([C[0] + D[0] * s, C[1] + D[1] * s]);
      via('vic_sottopassino', 'Sottopassino dell\'Orto', P, { ex: { sottopasso: true, pedonale: true, era: 'E7' } });
      const L = 12, rot = Math.atan2(-U[1], U[0]);
      const sp = pezzo('sottopasso', C[0] - U[0] * L / 2, C[1] - U[1] * L / 2, rot, { L, w: W2, h: 3.8, binario: false, hRilevato: 5.15 }, { nome: 'Sottopassino dell\'Orto' }, [['B', -.5, L + .5, -4.6, 4.6]]);
      // il fornice resta aperto: le caselle del passaggio sotto la volta non sono muro (la volta sta sopra)
      celleDi(sp, L / 2 - W2 / 2 + .2, L / 2 + W2 / 2 - .2, -6, 6, i => { if (BI[i] < 0 && g[i] === T.BLD) { g[i] = T.COB; RW[i] = VIA_W; } });
      sp.q = q; S.sottopasso = { x: +C[0].toFixed(2), y: +C[1].toFixed(2), q, qN: +qN.toFixed(2), qS: +qS.toFixed(2), libero: W2, h: 3.8 };
    } else S.avvisi.push('sottopassino: non trovo la ferrovia o il Lungomare'); }

    // ---- M1 · l'Orto delle Mura e il Vico della Torre: la Via delle Mura si prolunga a ponente lungo il piede del rilevato fino
    // all'angolo dell'Orto, poi giù nello Slargo della Torre e sulla Rua. La direzione gira di 90° dentro l'angolo dell'Orto (uno slargo
    // di 10 × 9 m), non in un vicolo. La Via delle Mura cominciava 7 m prima del Vicolo dei Lanternini: ora comincia lì (un nodo solo) ----
    const mura = W.roads.find(r => r.id === 'vic_mura'), rua = W.roads.find(r => r.id === 'rua'), lant = W.roads.find(r => r.id === 'vic_lanternini');
    const yRua = x => { const P = rua.pts; for (let k = 1; k < P.length; k++) if ((P[k - 1][0] - x) * (P[k][0] - x) <= 0 && P[k][0] !== P[k - 1][0]) return P[k - 1][1] + (P[k][1] - P[k - 1][1]) * (x - P[k - 1][0]) / (P[k][0] - P[k - 1][0]); return null; };
    if (fa('torre')) { if (mura && rua && lant) {
      const M0 = mura.pts.slice(), LE = lant.pts[lant.pts.length - 1].slice(), coda = M0.filter(q => q[0] < LE[0] - .3);
      mura.pts = [LE].concat(M0.filter(q => q[0] > LE[0] + .3)); S.muraDa = { prima: M0[0], ora: LE };
      via('vic_torre', 'Vico della Torre', [[1315.3, yRua(1315.3)], [1315.2, 297], [1315.4, 290], [1317.2, 285.6], [1321.5, 282.6], [1328, 281.6], [1341.5, YO], [1356, 282.3], [1362, 282.4]], { liscia: true, coda: coda.concat([LE]) });
      slargo('Orto delle Mura', 'gli orti sotto il rilevato, due agrumi; la vista sul campanile', 1321, 284.5, 7.5, 5);
      // gli orti: le aiuole lungo il piede del rilevato, fra l'angolo e il Sottopassino e oltre (erba e terra, sotto 1 m: niente ostacolo)
      { let n = 0; for (let ty = Math.floor(277.5 / TS); ty < Math.floor(280 / TS); ty++) for (let tx = Math.floor(1323 / TS); tx < Math.floor(1364 / TS); tx++) { const i = ty * GW + tx, cx = tx * TS + 1;
          if (cx > 1336 && cx < 1346) continue; if (g[i] !== T.COB || RW[i] > 0) continue; g[i] = T.GRASS; n++; } S.orti = n; }
      slargo('Slargo della Torre', 'la fontanella; in fondo la torre dell\'acqua di Radio Luna', 1315.5, 298.5, 5.2, 4.6);
      pezzo('fontana', 1312.9, 297.4, 0, { r: 1.2, h: 1.9, lati: 8, cannelle: 2 }, { nome: 'Fontanella della Torre' }, null, [-2, 2, -2, 2]);
      S.alberi.push(['agrume', 1331, 279.2, 3.4], ['agrume', 1349.5, 279.4, 3.2]);
    } else S.avvisi.push('vico della torre: manca la Via delle Mura, la Rua o il Vicolo dei Lanternini'); }

    // ---- M3 · la Corte delle Monache passante: l'Androne dalla Rua, il Passo della Corte al Vico Scuro, il passo al Vico delle Monache.
    // La corte resta selciato chiuso dalle case (tetti.js ci mette la scala ai tetti); il fico in mezzo ----
    const scuro = W.roads.find(r => r.id === 'vic_scuro'), monache = W.roads.find(r => r.id === 'vic_monache');
    const xSu = (rd, y) => { const P = rd.pts; for (let k = 1; k < P.length; k++) if ((P[k - 1][1] - y) * (P[k][1] - y) <= 0 && P[k][1] !== P[k - 1][1]) return P[k - 1][0] + (P[k][0] - P[k - 1][0]) * (y - P[k - 1][1]) / (P[k][1] - P[k - 1][1]); return null; };
    const corte = (x, y) => x > 1430 && x < 1440 && y > 280 && y < 304;
    if (fa('monache')) { if (scuro && monache) {
      // le tre vie si incontrano nel mezzo della corte (un nodo della rete); dentro la corte la carreggiata non si stampa
      // IL COVO: il bunker delle mura (1438,280) confina col fondo nord della corte. Il fondo resta un recesso chiuso (niente passo verso il
      // Vico delle Monache, che ci sboccava accanto: il varco di 2 m che c'è resta com'era) e il fico sta in fondo all'asse dell'Androne (in asse col
      // Vico del Pozzo, di là dalla Rua): dalla strada il fondo della corte non si vede. URBANISTICA2.md, «Il Covo»
      const NC = [1434.6, 291.2];
      via('vic_androne_monache', 'Androne delle Monache', [[1434, yRua(1434)], [1434, 303.5], [1433.5, 297.5], NC], { fuori: corte });
      via('passo_corte', 'Passo della Corte', [NC, [1439.5, 291], [xSu(scuro, 291), 291]], { fuori: corte });
      slargo('Corte delle Monache', 'il fico, la scala di ferro ai tetti, la porta dell\'Osteria', 1435, 292, 5, 11, { corte: true });
      S.alberi.push(['fico', 1437, 287.2, 4.8]);   // in fondo all'asse dell'Androne: si vede dalla Rua e copre il recesso del covo
    } else S.avvisi.push('corte delle monache: manca il Vico Scuro o il Vico delle Monache'); }

    // ---- M3 · il Passo del Calzolaio: dalla Via delle Mura, accanto alla bottega del calzolaio, dritto nella corte dietro la chiesa e giù
    // sul sagrato fino alla Rua (sul lastricato del sagrato la carreggiata non si stampa) ----
    if (fa('calzolaio') && mura) { const ym = (() => { const P = mura.pts; for (let k = 1; k < P.length; k++) if ((P[k - 1][0] - 1394) * (P[k][0] - 1394) <= 0) return P[k - 1][1] + (P[k][1] - P[k - 1][1]) * (1394 - P[k - 1][0]) / (P[k][0] - P[k - 1][0]); return 279.6; })();
      via('passo_calzolaio', 'Passo del Calzolaio', [[1394, ym], [1394, 284.6], [1395.8, 290], [1395.8, 300.5], [1395.8, yRua(1395.8)]], {});
      slargo('Corte del Calzolaio', 'la corte dietro il sagrato: gli scalini, i vasi', 1399.5, 293.5, 4.6, 4.2);
    }

    // ---- la Piazzetta del Lavatoio, sul Vico del Lavatoio fra i Gatti e i Bottai: il lavatoio coperto contro il fondo nord ----
    if (fa('lavatoio')) {
      slargo('Piazzetta del Lavatoio', 'il lavatoio coperto', 1388.5, 323.5, 6, 4.6);
      const L = 3; pezzo('lavatoio', 1386.4, 320.6, 0, { L, tettoia: true }, { nome: 'Lavatoio coperto' }, [['B', -1, L + 2.2, -2.5, 2.5]], [-1, L + 2.2, -2.5, 2.5]); }

    // ---- M3 · la Corte del Flipper: dalla Vittoria (in asse col Vico dei Gatti: un incrocio solo) nella corte del pozzo, dietro la sala
    // giochi, alla Corte dei Pescatori. Si gira dentro la corte, non sullo spigolo della sala giochi: così dal passo si vede già il retro ----
    if (fa('flipper')) { const reti = W.roads.find(r => r.id === 'vic_reti'), vit = W.roads.find(r => r.id === 'vittoria'), gatti = W.roads.find(r => r.id === 'vic_gatti');
      if (reti && vit && gatti) { const G0 = gatti.pts[gatti.pts.length - 1], yv = vit.pts[0][1], xg = G0[0];   // parte dal capo del Vico dei Gatti (di là dalla Vittoria): un incrocio vero
        via('passo_flipper', 'Corte del Flipper', [[G0[0], G0[1]], [xg, yv], [1368, 349], [1367.8, 355.5], [1367.6, 359.2], [1372, 361.9], [1378, 362], [xSu(reti, 362), 362]], {});
        slargo('Corte del Flipper', 'il pozzo, la porta di dietro della sala giochi', 1366.8, 359, 5, 3.6);
        pezzo('pozzo', 1363.8, 357.5, 0, { r: .8, arco: true }, { nome: 'Pozzo della Corte del Flipper' }, null, [-1, 1, -1, 1]);
      } else S.avvisi.push('corte del flipper: manca la Vittoria, il Vico dei Gatti o il Vicolo delle Reti'); }

    // 4) gli indici: come casette(), al posto della casa tolta va l'ultima della lista
    if (tolte.length) { const sposta = new Map(); tolte.map(b => B.indexOf(b)).sort((a, c) => c - a).forEach(j => { const ult = B.pop(); if (j < B.length) { B[j] = ult; sposta.set(B.length, j); } });
      for (let i = 0; i < BI.length; i++) { const j = BI[i]; if (j >= 0 && sposta.has(j)) BI[i] = sposta.get(j); }
      B.forEach((b, j) => { b.i = j; }); }
    // 5) le opere (barriere, pedonali, scale) coi pezzi nuovi
    if (K.opere) { const O = K.opere(W.pezzi, W.sets); W.pedonali = O.pedonali; W.barriere = O.barriere; W.passaggi = O.scale; }
    if (S.avvisi.length && typeof console !== 'undefined') console.warn('[urbanistica2]', S.avvisi.join(' · '));
    return W;
  }

  // dopo il verde (vegetazione.js): gli alberi degli slarghi, specie del verde nuovo (il fico, gli agrumi), istanziati come gli altri.
  // La casella del tronco è TREE (si urta) e passa al verde nuovo (render.js non ci mette il tiglio di città)
  function fine(W, K) {
    if (!ON || !W || !W.urbanistica2) return W;
    const P = W.vegetazione, T = K.T, TS = K.TS, S = W.urbanistica2; if (!P || !P.piante || !P.form) { S.avvisi.push('verde: niente piano'); return W; }
    const fGiardino = (() => { const c = {}; for (let i = 0; i < P.form.length; i += 97) if (P.form[i] > 1) c[P.form[i]] = (c[P.form[i]] || 0) + 1; return +Object.keys(c).sort((a, b) => c[b] - c[a])[0] || 2; })();
    S.alberi.forEach(([sp, x, y, h], k) => { const i = Math.floor(y / TS) * W.GW + Math.floor(x / TS); if (W.grid[i] === T.BLD || W.grid[i] === T.WATER) { S.avvisi.push('albero ' + sp + ': casella occupata'); return; }
      W.grid[i] = T.TREE; P.form[i] = fGiardino; P.piante.push({ sp, x, y, h, rot: 1.3 + k * 2.1, v: k % 2, t: .3 + .2 * (k % 3), f: fGiardino, tile: i, urbanistica2: true }); });
    return W;
  }

  // ---------------- i graffiti dei muri tolti (la strada dipinta, stile E) ----------------
  // Sui muri delle case che F1 toglie la strada dipinta di serie mette dieci lavori (misurati in Node col mondo di serie: tre muri, il più
  // pieno è il fianco sul Vico Scuro della casa dove ora si apre il Passo della Corte). Con F1 quei muri non ci sono: dopo la storia dei
  // muri ogni lavoro va sul muro più vicino al suo posto di prima (entro 14 m), con lo stesso stile, la stessa zona e lo stesso livello.
  // [stile, x, y, zona, livello, la casa di prima]
  const GRAFFITI = [
    ['pezzo', 1444.55, 291.44, 'vicolo', 'vissuto', 'casa_175'], ['tag', 1444.55, 292.06, 'vicolo', 'piccolo', 'casa_175'], ['mtag', 1444.55, 291.34, 'vicolo', 'piccolo', 'casa_175'],
    ['mtag', 1444.55, 292.74, 'vicolo', 'piccolo', 'casa_175'], ['tag', 1444.55, 290.78, 'vicolo', 'piccolo', 'casa_175'], ['adesivi', 1444.55, 290.2, 'vicolo', 'piccolo', 'casa_175'],
    ['gotico', 1444.55, 290.83, 'vicolo', 'medio', 'casa_175'], ['adesivi', 1444.55, 289.65, 'vicolo', 'piccolo', 'casa_175'],
    ['pezzo', 1377.3, 363, 'ritrovo', 'medio', 'casa_359'], ['adesivi', 1431, 304.14, 'vicolo', 'porta', 'casa_240'],
  ];
  function graffiti() {
    if (!ON || typeof StradaDipinta === 'undefined' || StradaDipinta.__u2) return !!(typeof StradaDipinta !== 'undefined');
    const SD = StradaDipinta, s0 = SD.storia; SD.__u2 = true;
    SD.storia = function (st, ctx) { const r = s0.apply(this, arguments); try { sposta(st, ctx); } catch (e) { STATO.graffiti = 'errore: ' + e.message; } return r; };
    return true;
  }
  function sposta(st, ctx) {
    const G = typeof Game !== 'undefined' ? Game : null, WR = typeof Writing !== 'undefined' ? Writing : null, WA = typeof WriterArte !== 'undefined' ? WriterArte : null;
    if (!G || !WR || !WA || !ctx || !ctx.SITES || !(G.MAP.world && G.MAP.world.urbanistica2)) return;
    const tolte = new Set(G.MAP.world.urbanistica2.tolte.map(t => t.id)), works = WR.S(st).works, crew = (SD => SD && SD.CREW && SD.CREW.PVK)(StradaDipinta) || { scrittori: ['CIAPA'] }, fatti = [];
    GRAFFITI.forEach(([style, x, y, z, liv, casa], k) => { if (!tolte.has(casa)) return;
      let best = null; ctx.SITES.forEach(q => { if (!/^(strada|hall|ferrovia|muro)$/.test(q.kind) || (q.len || 0) < 1.2 || !q.along) return;
        const t = Math.max(.3, Math.min(q.len - .3, (x - q.x) * q.along[0] + (y - q.y) * q.along[1])), px = q.x + q.along[0] * t, py = q.y + q.along[1] * t, d = Math.hypot(px - x, py - y);
        if (d < 14 && (!best || d < best.d)) best = { q, t, d }; });
      if (!best) return;
      let du = best.t; for (let i = 0; i < 6 && works.some(w => w.spot && Math.hypot(w.spot.x - (best.q.x + best.q.along[0] * du), w.spot.y - (best.q.y + best.q.along[1] * du)) < .45); i++) du = Math.max(.3, Math.min(best.q.len - .3, best.t + (i % 2 ? -1 : 1) * .6 * (1 + (i >> 1))));
      const aka = crew.scrittori[k % crew.scrittori.length], h = aka.charCodeAt(0) * 977 + aka.charCodeAt(1) * 31 + (aka.charCodeAt(2) || 7), sk0 = .45 + (h % 45) / 100, seed = 7919 * (k + 1) + 104729;
      const spot = Object.assign(ctx.spotOf(best.q, du), { sdZona: z });
      const w = Object.assign(WA.conceive({ aka, crew: 'PVK', style, dna: WA.dnaOf(h, sk0, h % 14), seed, by: 'old:' + aka }), { by: 'old', hand: h * 13, surf: 'muro', spot, place: spot.place, prog: 1, done: true, old: true, sdPal: 1, sdZona: z, sdLiv: liv, sdEta: .35, u2: casa });
      if (style === 'tag' || style === 'mtag') w.tagK = 1;
      if (style === 'adesivi') w.sdAdesivi = { n: 5, nomi: crew.scrittori.slice(0, 3), crew: ['PVK'], loghi: StradaDipinta.LOGHI };
      WR._.addWork(st, w); w.t0 = w.tDone = st.t - 40 * 1440; fatti.push({ style, da: [x, y], a: [+spot.x.toFixed(2), +spot.y.toFixed(2)], d: +best.d.toFixed(1) }); });
    STATO.graffiti = fatti;
  }

  // ---------------- nel browser: si salta world_cittanuova.js e lo si riesegue toccato ----------------
  function prima() { if (!ON || typeof window === 'undefined') return; window.__U2_NUOVA = window.PV_NUOVA; window.PV_NUOVA = false; }
  function dopo() {
    if (!ON || typeof window === 'undefined' || typeof document === 'undefined') return; window.PV_NUOVA = window.__U2_NUOVA; if (!window.PV_NUOVA) return;
    const el = document.querySelector('script[data-m="world_cittanuova"]'); if (!el) { STATO.errore = 'manca world_cittanuova'; return; }
    let src = el.textContent; try { src = applica(src); } catch (e) { STATO.errore = e.message; console.error(e.message); }
    const s = document.createElement('script'); s.setAttribute('data-m', 'world_cittanuova_u2'); s.textContent = src; (document.head || document.documentElement).appendChild(s);
    if (typeof console !== 'undefined') console.log('[urbanistica2] F1 acceso', STATO.errore ? '(SENZA pezze: ' + STATO.errore + ')' : '');
    const tg = setInterval(() => { if (graffiti()) clearInterval(tg); }, 40);   // la strada dipinta nasce dopo: ci si aggancia appena c'è
  }

  const API = { on: ON, PEZZE, PIANO, GRAFFITI, applica, mondo, fine, prima, dopo, graffiti, stato: STATO };
  // ---------------- in Node: il require di world_cittanuova.js carica il testo toccato ----------------
  if (ON && typeof module !== 'undefined' && typeof require === 'function' && typeof window === 'undefined') { try {
    const Mod = require('module'), fs = require('fs'), path = require('path'), ld = Mod._extensions['.js'];
    Mod._extensions['.js'] = function (m, f) { if (path.basename(f) === 'world_cittanuova.js') { let s = fs.readFileSync(f, 'utf8'); try { s = applica(s); } catch (e) { STATO.errore = e.message; console.error(e.message); } return m._compile(s, f); } return ld(m, f); };
    global.Urbanistica2 = API;
  } catch (e) { STATO.errore = e.message; } }
  return API;
})();
if (typeof module !== 'undefined') module.exports = Urbanistica2;
