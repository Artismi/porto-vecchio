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
    ['arretra(mnTaglia(expand(generate())))', 'arretra(Urbanistica2.mondo(mnTaglia(expand(generate())), { T, Z, TS, opere, chaikin, fbm }))'],
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
  const VIA_W = 1.7, VIA_RW = 3;   // [f1qualita] la carreggiata dei vicoli del borgo (1,7 m: la stessa riga di basoli, bordo e canaletta), la casella di via 3 m come i vicoli di serie
  // (prima 2,8 m: una riga più larga di tutte quelle del borgo; il libero fra le case resta 4 m, due caselle)
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
      [1379, 362, 'casa_359', 'flipper'], [1377, 365, 'casa_377', 'flipper'], [1379, 367, 'casa_384', 'flipper'],   // [f1qualita] le due casette del retro che restavano sole (prima le toglieva casette() dopo, senza dirlo)                                                                              // la Corte del Flipper verso la Corte dei Pescatori
    ],
    accorcia: [   // [punto, id, lato, caselle, zona]
      [1366.5, 352, 'casa_37', 'E', 1, 'flipper'],    // la Corte del Flipper: il passo dalla Vittoria si apre a 4 m dentro la casa d'angolo (la casa accanto, casa_330, regge il giro dei tetti)
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
    const CAMB = new Set(), PIENE = new Set();   // per i graffiti cotti: le caselle che F1 libera e quelle che un pezzo nuovo riempie
    const libera = (i, v) => { if (g[i] === T.BLD) CAMB.add(i); g[i] = v; BI[i] = -1; };
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

    // [f1qualita] il Supermercato «La Spiga»: ordine.js lo dà a partita iniziata alla casa libera più grande vicino alla piazza, che di serie è
    // casa_37 (18 caselle, la porta sul fianco est, la bandiera SPESA). Accorciata (12) perdeva il posto e il supermercato andava a casa_158,
    // sulla Via delle Mura. Lo si segna qui, come lo segnerebbe ordine.js (che lo trova e non ne sceglie un altro): resta dov'è, col fronte sul passo
    { const sup = S.accorciate.some(a => a.id === 'casa_37') ? B.find(b => b.id === 'casa_37') : null;
      if (sup && !sup.name && !B.some(b => b.use === 'supermercato')) { Object.assign(sup, { use: 'supermercato', trade: 'supermercato', name: 'Supermercato del Popolo «La Spiga»', shop: true, sign: { t: 'SUPERMERCATO LA SPIGA', c: '#ffd23b' }, superm: true }); sup.label = sup.name; S.supermercato = sup.id; } }

    // 3) le vie nuove: la polilinea (un vertice ogni metro: il binario le trova, writing.js), la carreggiata nella griglia
    const dSeg = (x, y, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)); return Math.hypot(x - ax - dx * t, y - ay - dy * t); };
    const fitta = P => { const out = [P[0].slice()]; for (let k = 1; k < P.length; k++) { const [ax, ay] = P[k - 1], [bx, by] = P[k], n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay))); for (let s = 1; s <= n; s++) out.push([+(ax + (bx - ax) * s / n).toFixed(2), +(ay + (by - ay) * s / n).toFixed(2)]); } return out; };
    const via = (id, name, P0, o) => { o = o || {}; const P = o.rado ? P0.map(q => [+q[0].toFixed(2), +q[1].toFixed(2)]) : fitta((o.liscia ? K.chaikin(P0, 2) : P0).concat(o.coda || [])), w = o.w || VIA_W, fuori = o.fuori || null;
      const rd = Object.assign({ id, name, w, kind: 'vicolo', pts: P, main: false, era: 'E0', urbanistica2: true }, o.ex || {}); W.roads.push(rd);
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; P.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
      let n = 0; for (let ty = Math.floor((y0 - w) / TS); ty <= Math.floor((y1 + w) / TS); ty++) for (let tx = Math.floor((x0 - w) / TS); tx <= Math.floor((x1 + w) / TS); tx++) {
        const i = ty * GW + tx, cx = tx * TS + TS / 2, cy = ty * TS + TS / 2; if (fuori && fuori(cx, cy)) continue;
        let d = 1e9; for (let k = 1; k < P.length; k++) d = Math.min(d, dSeg(cx, cy, P[k - 1][0], P[k - 1][1], P[k][0], P[k][1])); if (d > w / 2 + .3) continue;
        if (g[i] === T.BLD || g[i] === T.WATER || g[i] === T.PIAZZA || g[i] === T.VIA || g[i] === T.WALK) continue;
        if (g[i] === T.GRAVEL || g[i] === T.GRASS || g[i] === T.DIRT || g[i] === T.SHRUB) g[i] = T.COB;
        if (!(RW[i] > 0)) { RW[i] = VIA_RW; n++; } }
      S.vie.push({ id, name, L: +P.reduce((s, q, k) => k ? s + Math.hypot(q[0] - P[k - 1][0], q[1] - P[k - 1][1]) : 0, 0).toFixed(1), caselle: n }); return rd; };
    // gli slarghi: come i due slarghi della Via delle Mura del pacchetto sicuro (world_cittanuova.js [urbanistica1]): un rettangolo di selciato
    // che diventa PIAZZA (suolo.js: i vicoli si fermano al bordo; niente casella di via), la sua cosa sola (la fontanella, il lavatoio, il pozzo).
    // Niente voce in W.sets: le piazze del borgo restano quelle (test_mappa_compatta, 34 m l'una dall'altra). Prima un'ellisse a caselle e
    // un'aiuola d'erba: i bordi a scaletta e i cespugli sparsi. La corte resta selciato (la scala ai tetti la trova come corte: tetti.js)
    const thR = (tx, ty, s0) => { let h = (tx * 374761393 + ty * 668265263 + (s0 || 0) * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };   // render.js th
    const slargo = (nome, cosa, x, y, rx, ry, o) => { o = o || {}; let n = 0;   // il rettangolo: centro x, y e mezzi lati rx, ry (si prendono le caselle col centro dentro)
      if (!o.corte) for (let ty = Math.floor((y - ry) / TS); ty <= Math.ceil((y + ry) / TS); ty++) for (let tx = Math.floor((x - rx) / TS); tx <= Math.ceil((x + rx) / TS); tx++) {
        const i = ty * GW + tx, cx = tx * TS + 1, cy = ty * TS + 1; if (Math.abs(cx - x) > rx || Math.abs(cy - y) > ry) continue;
        if (o.fuori && o.fuori(cx, cy)) continue;
        if (thR(tx, ty, 355) <= .05) continue;   // la casella dove render.js (alberiCitta35) pianta da sé un leccio o un pino nelle piazzette: lo slargo ha già la sua cosa sola
        if (g[i] === T.BLD || g[i] === T.WATER || g[i] === T.VIA || g[i] === T.WALK || g[i] === T.FOUNT || g[i] === T.STAIRS || g[i] === T.GRAVEL || g[i] === T.TREE) continue;
        g[i] = T.PIAZZA; RW[i] = 0; n++; }
      S.slarghi.push({ nome, cosa, x, y, rx, ry, caselle: n }); };
    // i pezzi: la quota di posa come la passata finale (il punto più basso dell'impronta), le caselle chiuse riservate (BLD senza casa)
    const pw = (p, lx, lz) => { const c = Math.cos(p.rot), s = Math.sin(p.rot); return [p.x + lx * c + lz * s, p.y - lx * s + lz * c]; };
    const pl = (p, wx, wy) => { const c = Math.cos(p.rot), s = Math.sin(p.rot), dx = wx - p.x, dy = wy - p.y; return [dx * c - dy * s, dx * s + dy * c]; };
    const celleDi = (p, x0, x1, z0, z1, f) => { const C = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([a, b]) => pw(p, a, b)); const xs = C.map(c => c[0]), ys = C.map(c => c[1]);
      for (let ty = Math.floor(Math.min(...ys) / TS); ty <= Math.floor(Math.max(...ys) / TS); ty++) for (let tx = Math.floor(Math.min(...xs) / TS); tx <= Math.floor(Math.max(...xs) / TS); tx++) { const [lx, lz] = pl(p, tx * TS + 1, ty * TS + 1); if (lx >= x0 && lx <= x1 && lz >= z0 && lz <= z1) f(ty * GW + tx); } };
    const pezzo = (tipo, x, y, rot, opz, ex, imp, foot) => { const p = Object.assign({ tipo, x, y, rot: rot || 0, opz: opz || {}, urbanistica2: true }, ex || {});
      if (imp) { p.imp = imp; imp.forEach(([k, x0, x1, z0, z1]) => { if (k === 'B') celleDi(p, x0, x1, z0, z1, i => { if (RW[i] > 0 || BI[i] >= 0) return; if (g[i] !== T.BLD) PIENE.add(i); g[i] = T.BLD; BI[i] = -1; }); }); }
      const r = foot || [-.5, .5, -.5, .5], pts = [[r[0], r[2]], [r[1], r[2]], [r[1], r[3]], [r[0], r[3]], [(r[0] + r[1]) / 2, (r[2] + r[3]) / 2]];
      if (p.q === undefined) p.q = Math.round(Math.min(...pts.map(([a, b]) => vAt(...pw(p, a, b)))) * 100) / 100;
      (W.pezzi = W.pezzi || []).push(p); S.pezzi.push({ tipo, nome: p.nome, x: +x.toFixed(2), y: +y.toFixed(2) }); return p; };

    // ---- M1 · il Sottopassino: dal Lungomare di Tramontana, sotto la ferrovia, all'Orto delle Mura. Dritto, a squadra col binario, corto.
    // [f1qualita] Il rilevato qui è alto solo 3 m sul suolo: il pezzo (la volta e 1,6 m di muratura sopra, pezzi_citta.js) con la volta da
    // 3,8 m usciva 2 m sopra il binario, un blocco col tetto piatto che spezzava la linea. Ora la volta è pedonale (2,4 × 4 m), il passaggio
    // sta alla quota dell'Orto (niente scalini), il colmo del rilevato sale di quel che serve (il binario lo segue piano, railProfile al
    // 3%) e il pezzo finisce sotto la massicciata: il treno passa sopra. La via non ha vertici sul binario (writing.js non ci mette il suo
    // impalcato, che alzava la linea di altri 2,4 m); verso il Lungomare una rampa sotto il 12% ----
    const XS = 1338, RC = W.railCity || [];
    let C = null, U = null; { let bk = -1, bd = 1e9; RC.forEach((q, k) => { const d = Math.abs(q[0] - XS); if (d < bd) { bd = d; bk = k; } });
      if (bk > 0 && bk < RC.length - 1 && bd < 4) { const a = RC[bk - 1], b = RC[bk + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; U = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
        const t = (XS - a[0]) / ((b[0] - a[0]) || 1); C = [XS, a[1] + (b[1] - a[1]) * t]; } }
    const lung = W.roads.find(r => r.id === 'lung_nord'), yLung = x => { const P = lung ? lung.pts : []; for (let k = 1; k < P.length; k++) if ((P[k - 1][0] - x) * (P[k][0] - x) <= 0 && P[k][0] !== P[k - 1][0]) return P[k - 1][1] + (P[k][1] - P[k - 1][1]) * (x - P[k - 1][0]) / (P[k][0] - P[k - 1][0]); return null; };
    const YO = 280.8;   // l'asse dell'Orto (la striscia fra il piede del rilevato e le case: 276-284)
    if (fa('sottopassino')) { if (C && U && lung) {
      const D = [-U[1], U[0]], W2 = 4, HV = 2.4, HR = HV + 1.6, PB = 4.5, L = 10;   // D: verso sud; la volta HV, il rilevato del pezzo HR, mezza profondità PB (pezzi_citta.js: 9 m)
      const at = (lx, lz) => [C[0] + U[0] * lx + D[0] * lz, C[1] + U[1] * lx + D[1] * lz], loc = (x, y) => [(x - C[0]) * U[0] + (y - C[1]) * U[1], (x - C[0]) * D[0] + (y - C[1]) * D[1]];
      const sN = (yLung(C[0]) + (lung.w || 7) / 2 + .2 - C[1]) / D[1], sS = (YO - C[1]) / D[1];   // il ciglio della carreggiata del Lungomare, l'asse dell'Orto
      const q = Math.round(vAt(...at(0, PB + 1.6)) * 100) / 100, qN = vAt(...at(0, sN + .6)), cima = q + HR;   // la quota dell'Orto; il pezzo arriva a cima
      const VX = (i, j) => [i * TS, j * TS], tile = (x, y) => g[Math.floor(y / TS) * GW + Math.floor(x / TS)];
      const tocchi = new Set(), metti = (i, j, h) => { VH[j * VW + i] = h; for (let b = -1; b <= 0; b++) for (let a = -1; a <= 0; a++) if (i + a >= 0 && j + b >= 0) tocchi.add((j + b) * GW + i + a); };
      // 1) il colmo del rilevato: dove sta sotto cima, sale a cima sotto il pezzo e torna giù in 22 m per parte (solo i vertici della massicciata)
      for (let j = Math.floor((C[1] - 30) / TS); j <= Math.ceil((C[1] + 30) / TS); j++) for (let i = Math.floor((C[0] - 34) / TS); i <= Math.ceil((C[0] + 34) / TS); i++) {
        const [x, y] = VX(i, j), [lx, lz] = loc(x, y); if (Math.abs(lz) > 2.2) continue; const k = Math.max(0, (Math.abs(lx) - L / 2 - .5) / 22); if (k >= 1) continue;
        if (![[0, 0], [-1, 0], [0, -1], [-1, -1]].every(([a, b]) => { const v = g[(j + b) * GW + i + a]; return v === T.GRAVEL || v === T.BLD; })) continue;
        const h0 = VH[j * VW + i], h = cima + .05; if (h0 < h) VH[j * VW + i] = h0 + (h - h0) * (1 - k * k * (3 - 2 * k)); }
      // 2) il passaggio: in piano alla quota q sotto il pezzo e verso l'Orto, poi la rampa fino al Lungomare (pendenza sotto il 12%)
      const rampa = Math.max(2, Math.abs(qN - q) / .12);
      for (let j = Math.floor((C[1] + (sN - 1) * D[1]) / TS); j <= Math.ceil((C[1] + (PB + 2.5) * D[1]) / TS); j++) for (let i = Math.floor((C[0] - 6) / TS); i <= Math.ceil((C[0] + 6) / TS); i++) {
        const [x, y] = VX(i, j), [lx, lz] = loc(x, y); if (Math.abs(lx) > W2 / 2 + .05) continue;
        let h = null; if (lz >= -PB && lz <= PB + 2.5) h = q; else if (lz < -PB && lz > -PB - rampa - .01) h = q + (qN - q) * Math.min(1, (-PB - lz) / rampa);
        if (h !== null) metti(i, j, h); }
      tocchi.forEach(i => { const v = g[i]; if (v === T.BLD || v === T.WATER) return; elevDaiVertici(i); if (v === T.GRAVEL) g[i] = T.COB; });
      // la via: dal ciglio del Lungomare all'Orto, coi vertici fuori dal binario (writing.js non ci vede un incrocio)
      const P = [at(0, sN), at(0, -PB - rampa), at(0, -PB), at(0, PB), at(0, sS)];
      via('vic_sottopassino', 'Sottopassino dell\'Orto', P, { ex: { sottopasso: true, pedonale: true }, rado: true });
      const rot = Math.atan2(-U[1], U[0]);
      const sp = pezzo('sottopasso', C[0] - U[0] * L / 2, C[1] - U[1] * L / 2, rot, { L, w: W2, h: HV, binario: false, hRilevato: HR }, { nome: 'Sottopassino dell\'Orto' }, [['B', -.3, L + .3, -PB - .1, PB + .1]]);
      // il fornice resta aperto: le caselle del passaggio sotto la volta non sono muro (la volta sta sopra)
      celleDi(sp, L / 2 - W2 / 2 + .2, L / 2 + W2 / 2 - .2, -6, 6, i => { if (BI[i] < 0 && g[i] === T.BLD) { g[i] = T.COB; RW[i] = VIA_RW; } });
      sp.q = q; S.sottopasso = { x: +C[0].toFixed(2), y: +C[1].toFixed(2), q, qN: +qN.toFixed(2), cima: +cima.toFixed(2), libero: W2, h: HV, rampa: +rampa.toFixed(1) };
    } else S.avvisi.push('sottopassino: non trovo la ferrovia o il Lungomare'); }

    // ---- M1 · l'Orto delle Mura e il Vico della Torre: la Via delle Mura si prolunga a ponente lungo il piede del rilevato fino
    // all'angolo dell'Orto, poi giù nello Slargo della Torre e sulla Rua. La direzione gira di 90° dentro l'angolo dell'Orto (uno slargo
    // di 10 × 9 m), non in un vicolo. La Via delle Mura cominciava 7 m prima del Vicolo dei Lanternini: ora comincia lì (un nodo solo) ----
    const mura = W.roads.find(r => r.id === 'vic_mura'), rua = W.roads.find(r => r.id === 'rua'), lant = W.roads.find(r => r.id === 'vic_lanternini');
    const yRua = x => { const P = rua.pts; for (let k = 1; k < P.length; k++) if ((P[k - 1][0] - x) * (P[k][0] - x) <= 0 && P[k][0] !== P[k - 1][0]) return P[k - 1][1] + (P[k][1] - P[k - 1][1]) * (x - P[k - 1][0]) / (P[k][0] - P[k - 1][0]); return null; };
    if (fa('torre')) { if (mura && rua && lant) {
      const M0 = mura.pts.slice(), LE = lant.pts[lant.pts.length - 1].slice(), coda = M0.filter(q => q[0] < LE[0] - .3);
      mura.pts = [LE].concat(M0.filter(q => q[0] > LE[0] + .3)); S.muraDa = { prima: M0[0], ora: LE };
      // [f1qualita] dritto e in asse: giù per la striscia fra il Miramare e le case (6-8 m, l'asse a 1316), il gomito dentro l'Orto, poi lungo
      // l'Orto in asse con la striscia (prima una curva di Chaikin attraverso il lastricato: una riga di basoli storta su un selciato dritto)
      via('vic_torre', 'Vico della Torre', [[1316, yRua(1316)], [1316, 284.2], [1318.4, YO], [1362, YO]], { coda: coda.concat([LE]) });
      slargo('Orto delle Mura', 'l\'angolo dell\'Orto sotto il rilevato; la vista sul campanile', 1320, 283, 5.1, 2.1);   // 1314-1326 × 280-286
      slargo('Slargo della Torre', 'la fontanella; in fondo la torre dell\'acqua di Radio Luna', 1314, 298, 3.1, 3.1);   // 1310-1318 × 294-302, sulla bocca della Rua
      pezzo('fontana', 1312.9, 297.4, 0, { r: 1.2, h: 1.9, lati: 8, cannelle: 2 }, { nome: 'Fontanella della Torre' }, null, [-2, 2, -2, 2]);
      // [f1qualita] niente aiuole né agrumi lungo l'Orto: le aiuole d'erba seminavano cespugli ed erbacce sul passaggio, gli alberi (col loro
      // cespuglio al piede, il verde nuovo) stavano nella riga della via; il lastricato sotto il rilevato resta quello di serie, pulito
    } else S.avvisi.push('vico della torre: manca la Via delle Mura, la Rua o il Vicolo dei Lanternini'); }

    // ---- M3 · la Corte delle Monache passante: l'Androne dalla Rua, il Passo della Corte al Vico Scuro, il passo al Vico delle Monache.
    // La corte resta selciato chiuso dalle case (tetti.js ci mette la scala ai tetti); il fico in mezzo ----
    const scuro = W.roads.find(r => r.id === 'vic_scuro'), monache = W.roads.find(r => r.id === 'vic_monache');
    const xSu = (rd, y) => { const P = rd.pts; for (let k = 1; k < P.length; k++) if ((P[k - 1][1] - y) * (P[k][1] - y) <= 0 && P[k][1] !== P[k - 1][1]) return P[k - 1][0] + (P[k][0] - P[k - 1][0]) * (y - P[k - 1][1]) / (P[k][1] - P[k - 1][1]); return null; };
    const corte = (x, y) => x > 1430 && x < 1440 && y > 280 && y < 304;
    // [f1qualita] un passaggio che sbocca sulla Rua di fronte a un vicolo di serie parte dal capo di quello (un incrocio vero: niente due capi
    // staccati a 2 m, test_strade_integre), se no dall'asse della Rua
    const capoDi = (id, x, y) => { const r0 = W.roads.find(r => r.id === id); if (!r0) return [x, y]; const P = r0.pts, c = [P[0], P[P.length - 1]].sort((a, b) => Math.hypot(a[0] - x, a[1] - y) - Math.hypot(b[0] - x, b[1] - y))[0]; return Math.hypot(c[0] - x, c[1] - y) < 4 ? c.slice() : [x, y]; };
    if (fa('monache')) { if (scuro && monache) {
      // dentro la corte la carreggiata non si stampa (resta una corte: tetti.js ci mette la scala)
      // IL COVO: il bunker delle mura (1438,280) confina col fondo nord della corte. Il fondo resta un recesso chiuso (niente passo verso il
      // Vico delle Monache, che ci sboccava accanto: il varco di 2 m che c'è resta com'era) e il fico sta in fondo all'asse dell'Androne (in asse col
      // Vico del Pozzo, di là dalla Rua): dalla strada il fondo della corte non si vede. URBANISTICA2.md, «Il Covo»
      const NC = [1434.6, 291.2];
      // l'Androne e il Passo della Corte sono una via sola (test_mappa_compatta: al più 34 vicoli): dalla Rua, dentro la corte, al Vico Scuro
      via('vic_androne_monache', 'Androne delle Monache e Passo della Corte', [capoDi('vic_pozzo', 1434, yRua(1434)), [1434, 303.5], [1433.5, 297.5], NC, [1439.5, 291], [xSu(scuro, 291), 291]], { fuori: corte });
      slargo('Corte delle Monache', 'il fico, la scala di ferro ai tetti, la porta dell\'Osteria', 1435, 292, 5, 11, { corte: true });
      S.alberi.push(['fico', 1437, 287.2, 4.8]);   // in fondo all'asse dell'Androne: si vede dalla Rua e copre il recesso del covo
    } else S.avvisi.push('corte delle monache: manca il Vico Scuro o il Vico delle Monache'); }

    // ---- M3 · il Passo del Calzolaio: dalla Via delle Mura, accanto alla bottega del calzolaio, dritto nella corte dietro la chiesa e giù
    // sul sagrato fino alla Rua (sul lastricato del sagrato la carreggiata non si stampa) ----
    if (fa('calzolaio') && mura) { const ym = (() => { const P = mura.pts; for (let k = 1; k < P.length; k++) if ((P[k - 1][0] - 1394) * (P[k][0] - 1394) <= 0) return P[k - 1][1] + (P[k][1] - P[k - 1][1]) * (1394 - P[k - 1][0]) / (P[k][0] - P[k - 1][0]); return 279.6; })();
      // [f1qualita] in fondo il passo esce sul sagrato accanto alla Falegnameria Efisio (casa_228: economia.js la fa bottega a partita
      // iniziata; prima casette() la toglieva perché restava sola e la falegnameria andava altrove): la via scende sul sagrato, a ponente
      via('passo_calzolaio', 'Passo del Calzolaio', [[1394, ym], [1394, 284.6], [1395.4, 290], [1395.4, 300.5], [1394.4, 302.4], [1389.6, yRua(1389.6)]], {});   // sul sagrato (lastricato: la riga del vicolo non si disegna) fino alla Rua, lontano dal capo del Vico dei Bottai e dalla falegnameria
      slargo('Corte del Calzolaio', 'la corte dietro il sagrato: gli scalini, i vasi', 1398, 292, 3.1, 3.1);   // 1394-1402 × 288-296
    }

    // ---- la Piazzetta del Lavatoio, sul Vico del Lavatoio fra i Gatti e i Bottai: il lavatoio coperto contro il fondo nord ----
    if (fa('lavatoio')) {
      slargo('Piazzetta del Lavatoio', 'il lavatoio coperto', 1388, 323, 5.1, 4.1);   // 1382-1394 × 318-328 (il lavatoio contro il lato nord)
      const L = 3; pezzo('lavatoio', 1386.4, 320.6, 0, { L, tettoia: true }, { nome: 'Lavatoio coperto' }, [['B', -1, L + 2.2, -2.5, 2.5]], [-1, L + 2.2, -2.5, 2.5]); }

    // ---- M3 · la Corte del Flipper: dalla Vittoria (in asse col Vico dei Gatti: un incrocio solo) nella corte del pozzo, dietro la sala
    // giochi, alla Corte dei Pescatori. Si gira dentro la corte, non sullo spigolo della sala giochi: così dal passo si vede già il retro ----
    if (fa('flipper')) { const reti = W.roads.find(r => r.id === 'vic_reti'), vit = W.roads.find(r => r.id === 'vittoria'), gatti = W.roads.find(r => r.id === 'vic_gatti');
      if (reti && vit && gatti) { const G0 = gatti.pts[gatti.pts.length - 1], yv = vit.pts[0][1], xg = G0[0];   // parte dal capo del Vico dei Gatti (di là dalla Vittoria): un incrocio vero
        // [f1qualita] dal capo del Vico dei Gatti attraverso la Vittoria (l'asfalto e il marciapiede ci passano sopra: suolo.js), poi dritto nel
        // passo di 4 m davanti alla porta del Supermercato (l'asse a 1368), il gomito largo nella corte dietro la sala giochi (che c'era già, chiusa)
        // e in asse col passo verso il Vicolo delle Reti
        via('passo_flipper', 'Corte del Flipper', [[G0[0], G0[1]], [xg, yv], [1368, 348.5], [1368, 359.4], [1371, 361.4], [xSu(reti, 361.4), 361.4]], {});   // dritto fino al Vicolo delle Reti: passa a 1,4 m dal capo della Corte dei Pescatori (un incrocio)
        slargo('Corte del Flipper', 'il pozzo, la porta di dietro della sala giochi', 1378, 363, 4.1, 3.1);   // 1374-1382 × 360-366
        pezzo('pozzo', 1379.6, 365, 0, { r: .8, arco: true }, { nome: 'Pozzo della Corte del Flipper' }, null, [-1, 1, -1, 1]);
      } else S.avvisi.push('corte del flipper: manca la Vittoria, il Vico dei Gatti o il Vicolo delle Reti'); }

    // 4) gli indici: come casette(), al posto della casa tolta va l'ultima della lista
    if (tolte.length) { const sposta = new Map(); tolte.map(b => B.indexOf(b)).sort((a, c) => c - a).forEach(j => { const ult = B.pop(); if (j < B.length) { B[j] = ult; sposta.set(B.length, j); } });
      for (let i = 0; i < BI.length; i++) { const j = BI[i]; if (j >= 0 && sposta.has(j)) BI[i] = sposta.get(j); }
      B.forEach((b, j) => { b.i = j; }); }
    // 6) I MURI DI FONDO (per la strada dipinta: writing.js fondaleCieco / fondaleMuroG, sul ramo dei graffiti). Dove un passaggio, un gomito o
    // uno slargo di F1 inquadra il fondo di una vista, il muro che la chiude: dov'è, verso dove guarda, quanto è largo e alto, e se è cieco
    // (il rilevato della ferrovia, le spalle del Sottopassino: sì; la faccia di una casa: oggi ha le finestre, e la casa porta la richiesta
    // b.muroFondale = { f, largo, alto } perché render.js la faccia cieca quando F1 entra di serie). W.urbanistica2.muriFondale, W.muriFondale
    { const VISTE = [
        ['Vico della Torre, dalla Rua', [1315.3, 304], [0, -1]], ['Vico della Torre, dalle Mura verso l\'Orto', [1372, 282.2], [-1, .02]], ['Orto, dall\'angolo verso le Mura', [1317, 283], [1, -.03]],
        ['Sottopassino, dal Lungomare', [1340.4, 263], [.087, 1]], ['Androne delle Monache, dalla Rua', [1434, 311.5], [0, -1]], ['Passo della Corte, dal Vico Scuro', [1446, 291.2], [-1, 0]],
        ['Passo del Calzolaio, dalle Mura', [1394, 280.5], [.1, 1]], ['Passo del Calzolaio, dal sagrato', [1395.8, 306], [-.08, -1]], ['Vico del Lavatoio, dal Vico dei Gatti', [1374.5, 324.6], [1, 0]],
        ['Vico del Lavatoio, dal Vico dei Bottai', [1395, 324.8], [-1, 0]], ['Corte del Flipper, dalla Vittoria', [1368, 344], [0, 1]], ['Corte del Flipper, dalla corte verso le Reti', [1370, 362], [1, 0]],
        ['Corte del Flipper, dal Vicolo delle Reti', [1383.5, 362], [-1, 0]]];
      const MF = []; VISTE.forEach(([nome, P0, d0]) => { const L = Math.hypot(d0[0], d0[1]), d = [d0[0] / L, d0[1] / L]; let prev = ti(P0[0], P0[1]), hit = null;
        for (let t = .5; t < 70 && !hit; t += .25) { const x = P0[0] + d[0] * t, y = P0[1] + d[1] * t, i = ti(x, y); if (i === prev) continue; const v = g[i];
          if (v === T.BLD || v === T.GRAVEL) hit = { i, prev, t, x, y, v }; else if (v === T.WATER) break; else prev = i; }
        if (!hit) { MF.push({ vista: nome, da: P0, fondo: 'aperto (il mare o la via che continua)' }); return; }
        const tx = hit.i % GW, ty = (hit.i / GW) | 0, px = hit.prev % GW, py = (hit.prev / GW) | 0, n = [Math.sign(px - tx), Math.sign(py - ty)];   // la normale: verso chi guarda
        const f = n[1] < 0 ? 'N' : n[1] > 0 ? 'S' : n[0] > 0 ? 'E' : 'W', dist = +hit.t.toFixed(1);
        const AR = hit.v === T.GRAVEL ? +Math.max(0, Math.max(vAt(hit.x + d[0] * 2, hit.y + d[1] * 2), vAt(hit.x + d[0] * 3, hit.y + d[1] * 3)) - vAt(hit.x - d[0] * 1.5, hit.y - d[1] * 1.5)).toFixed(1) : 0;
        if (hit.v === T.GRAVEL) { MF.push({ vista: nome, da: P0, dist, tipo: 'rilevato', nome: 'il muro del rilevato della ferrovia', centro: [+hit.x.toFixed(1), +hit.y.toFixed(1)], normale: n, largo: 12, alto: AR, cieco: true, adatto: AR >= 3.5 }); return; }
        const j = BI[hit.i];
        if (j < 0) { let pz = null, bd = 1e9; (W.pezzi || []).forEach(q => { const L2 = (q.opz && q.opz.L) || 0, dd = Math.hypot(q.x + Math.cos(q.rot || 0) * L2 / 2 - hit.x, q.y - Math.sin(q.rot || 0) * L2 / 2 - hit.y); if (dd < bd) { bd = dd; pz = q; } });
          MF.push({ vista: nome, da: P0, dist, tipo: 'pezzo', nome: pz ? pz.nome || pz.tipo : '?', centro: [+hit.x.toFixed(1), +hit.y.toFixed(1)], normale: n, largo: (pz && pz.opz && pz.opz.L) || 6, alto: pz && pz.tipo === 'sottopasso' ? pz.opz.hRilevato : 4, cieco: !!(pz && /sottopasso|mura|binari|gradone/.test(pz.tipo)), adatto: !!(pz && /sottopasso|mura|binari|gradone/.test(pz.tipo)) }); return; }
        const b = B[j], largo = (f === 'N' || f === 'S' ? b.w : b.h) * TS, alto = +(1 + 3.1 * Math.max(1, b.fl || 1)).toFixed(1);
        const c = f === 'N' ? [(b.x + b.w / 2) * TS, b.y * TS] : f === 'S' ? [(b.x + b.w / 2) * TS, (b.y + b.h) * TS] : f === 'W' ? [b.x * TS, (b.y + b.h / 2) * TS] : [(b.x + b.w) * TS, (b.y + b.h / 2) * TS];
        const suFaccia = (q, F) => q && ((F === 'N' && q[1] < b.y) || (F === 'S' && q[1] >= b.y + b.h) || (F === 'W' && q[0] < b.x) || (F === 'E' && q[0] >= b.x + b.w));
        let porta = suFaccia(b.door, f), spostata = null;
        // il muro di fondo si progetta: se la casa è senza nome né bottega e la porta sta proprio su quella faccia, la porta passa su un'altra
        // faccia libera (la casella davanti a metà lato è selciato o via), e la faccia della vista resta da fare cieca
        if (porta && largo >= 6 && alto >= 4 && !b.name && !b.shopFront && !LUOGHI.has(b.id)) {
          const fuori = { N: [b.x + (b.w >> 1), b.y - 1], S: [b.x + (b.w >> 1), b.y + b.h], W: [b.x - 1, b.y + (b.h >> 1)], E: [b.x + b.w, b.y + (b.h >> 1)] };
          for (const F of ['S', 'E', 'W', 'N']) { if (F === f) continue; const [qx, qy] = fuori[F], v = g[qy * GW + qx]; if (BI[qy * GW + qx] >= 0 || !(v === T.COB || v === T.VIA || v === T.WALK || v === T.PIAZZA)) continue;
            spostata = { da: b.door.slice(), a: [qx, qy], faccia: F }; b.door = [qx, qy]; porta = false; break; } }
        const adatto = largo >= 6 && alto >= 4 && !b.name && !b.shopFront && !porta;
        if (adatto) b.muroFondale = { f, largo, alto, vista: nome };
        MF.push({ vista: nome, da: P0, dist, tipo: 'casa', casa: b.id, faccia: f, centro: c, normale: n, largo, alto, cieco: false, adatto, portaSpostata: spostata,
          perche: adatto ? 'faccia senza porta né insegna: da fare cieca (b.muroFondale)' : largo < 6 ? 'faccia stretta (' + largo + ' m)' : 'su questa faccia ci sono la porta, la bottega o l\'insegna' }); });
      const SP = (W.pezzi || []).find(q => q.urbanistica2 && q.tipo === 'sottopasso');
      if (SP) { const L2 = SP.opz.L, c0 = Math.cos(SP.rot), s0 = Math.sin(SP.rot), cx = SP.x + c0 * L2 / 2, cy = SP.y - s0 * L2 / 2;
        [[-1, 'dal Lungomare'], [1, 'dall\'Orto']].forEach(([sg, v]) => MF.push({ vista: 'il Sottopassino, ' + v, tipo: 'pezzo', nome: 'le spalle del Sottopassino: due tratti ciechi di 3,8 m ai lati del fornice (per tag e pezzi piccoli, non per un pezzo grande)', centro: [+(cx + s0 * 4.5 * sg).toFixed(1), +(cy + c0 * 4.5 * sg).toFixed(1)], normale: [+(s0 * sg).toFixed(2), +(c0 * sg).toFixed(2)], largo: L2, alto: SP.opz.hRilevato, fornice: SP.opz.w, cieco: true, adatto: false })); }
      S.muriFondale = MF; W.muriFondale = MF.filter(m => m.centro && m.adatto); }
    // 5) le opere (barriere, pedonali, scale) coi pezzi nuovi
    if (K.opere) { const O = K.opere(W.pezzi, W.sets); W.pedonali = O.pedonali; W.barriere = O.barriere; W.passaggi = O.scale; }
    const nasc = (k, v) => Object.defineProperty(S, k, { value: v, enumerable: false, writable: true });   // fuori dal JSON di W.urbanistica2
    nasc('__cambiate', [...CAMB]); nasc('__piene', [...PIENE]); nasc('__case0', B.slice());
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

  // ---------------- i graffiti: la storia dei muri del sito (quella cotta coi tasselli), meno i muri che F1 cambia ----------------
  // Di serie il sito parte coi tasselli, e i graffiti di partenza sono la lista cotta (tasselli/graffiti.json: writer_vita.js li prende già
  // piazzati, writing.js cotti; con lo stile E strada_dipinta.js li dirada, rimodella, e aggiunge fondali, porte e pali). Con ?urbanistica2 i
  // tasselli non si usano e writer_vita.js faceva la storia nel browser: un'altra distribuzione in TUTTA la città (F1_QUALITA.md, causa 1).
  // Qui la storia si fa come di serie: la lista cotta intera (così il caso di rimodella e gli indici restano quelli del sito), poi via i
  // lavori che stavano su un muro che F1 toglie, accorcia o copre; quelli vanno, senza ammucchiarsi, sul muro nuovo più vicino. Senza la
  // lista cotta (in locale, senza tasselli) resta la storia del browser, che dei muri tolti non sa niente.
  const GRAF = { L: undefined, fatto: false, stato: null };
  function listaCotta() {
    if (GRAF.L !== undefined) return GRAF.L; GRAF.L = null;
    try { const Q = location.search || '', base = window.PV_TASSELLI_BASE || 'tasselli/', imp = window.PV_IMPRONTA_TASS, v = '?v=' + (imp || '0');
      if (/[?&]nofixgraffiti\b/.test(Q)) return null;
      const get = f => { const x = new XMLHttpRequest(); x.open('GET', new URL(base + f + v, location.href).href, false); x.send(); return x.status === 200 ? JSON.parse(x.responseText) : null; };
      const j = get('indice.json'); if (!j || j.versione !== 1 || !(j.impronta === imp || /[?&]tassellivecchi\b/.test(Q)) || !j.graffiti || !j.graffiti.file) return null;
      const g = get(j.graffiti.file); GRAF.L = g && Array.isArray(g.lavori) && g.lavori.length ? g.lavori : null;
    } catch (e) { GRAF.L = null; }
    return GRAF.L;
  }
  function graffiti() {
    if (!ON || typeof Writing === 'undefined' || typeof WriterVita === 'undefined' || typeof Game === 'undefined' || !Writing.S) return false;
    if (Writing.__u2) return true; Writing.__u2 = true; const S0 = Writing.S;
    // writer_vita.js fa la storia al primo passo con dei writer (step: WR.S(st), poi history): qui si passa prima
    Writing.S = function (st) { const W = S0.apply(this, arguments); if (!GRAF.fatto && W && W.writers && W.writers.length) { try { storia(st, W); } catch (e) { GRAF.stato = 'errore: ' + e.message; console.warn('[urbanistica2] graffiti', e); } } return W; };
    return true;
  }
  function storia(st, W) {
    const G = Game, WV = WriterVita, MW = G.MAP && G.MAP.world; if (!MW || !MW.urbanistica2 || !WV.SITES || !WV.SITES.length) return;
    const v = W.vita || (W.vita = { night: -1, plan: [], out: 0, mopT: 0, caught: 0 }); GRAF.fatto = true; if (v.hist) { GRAF.stato = 'storia già fatta'; return; }
    const L = listaCotta(); if (!L) { GRAF.stato = 'senza lista cotta: la storia del browser'; return; }
    v.hist = true;
    const SD = typeof StradaDipinta !== 'undefined' && StradaDipinta.attiva() ? StradaDipinta : null, WR = Writing, TS = G.TS, GW = G.GW;
    const placeOf = s => { if (s.name) return s.name; try { const p = G.nearestPlace(s.x, s.y); return p ? 'a ' + p.name : ''; } catch (e) { return ''; } };
    const spotOf = (s, du, h) => ({ x: s.x + s.along[0] * (du || 0), y: s.y + s.along[1] * (du || 0), face: s.face, h: h != null ? h : s.h, place: placeOf(s), kind: s.kind });
    const ctx = { SITES: WV.SITES, spotOf, ws: W.writers.map(id => G.byId(st, id)).filter(n => n && n.pop && n.pop.writer) };
    const n0 = W.works.length, base = W.nextId;
    v.cotti = WR._.cotti(st, SD ? SD.rimodella(st, L.map(o => Object.assign({}, o))) : L.map(o => Object.assign({}, o)));
    // i muri che F1 cambia: le caselle liberate (case tolte, accorciate, e quelle che dopo casette() ha tolto perché restavano sole), quelle
    // che un pezzo nuovo riempie
    const U = MW.urbanistica2, CAMB = new Set(U.__cambiate || []), PIENE = new Set(U.__piene || []), ora = new Set(G.BUILDINGS);
    (U.__case0 || []).forEach(b => { if (ora.has(b)) return; for (let ty = b.y; ty < b.y + b.h; ty++) for (let tx = b.x; tx < b.x + b.w; tx++) CAMB.add(ty * GW + tx); });
    const ti = (x, z) => Math.floor(z / TS) * GW + Math.floor(x / TS), via = [];
    const nuovi = W.works.slice(n0).filter(w => { const R = w.gfxRect; if (!R || !R.c || !R.n) return true; const c = R.c, n = R.n;
      const dietro = ti(c.x - n.x * .4, c.z - n.z * .4), qui = ti(c.x, c.z), davanti = ti(c.x + n.x * .5, c.z + n.z * .5);
      if (CAMB.has(dietro) || CAMB.has(qui) || PIENE.has(davanti) || PIENE.has(qui)) { via.push(w); return false; } return true; });
    const tolti = new Set(via.map(w => w.id)); W.works.splice(n0, W.works.length - n0, ...nuovi); W.works.forEach(w => { if (w.over) w.over = w.over.filter(i => !tolti.has(i)); });
    if (SD) SD.storia(st, Object.assign(ctx, { cotti: true }));
    GRAF.stato = { cotti: v.cotti, tolti: via.length, spostati: sposta(st, ctx, via, CAMB) };
  }
  // i lavori dei muri che non ci sono più: sul muro più vicino (entro 12 m) che dà sullo spazio nuovo o lo guarda, uno ogni 2,5 m di muro libero
  // e mai addosso a un altro lavoro; se non c'è posto, niente (meglio un muro pulito che un mucchio)
  function sposta(st, ctx, via, CAMB) {
    const G = Game, WR = Writing, WA = typeof WriterArte !== 'undefined' ? WriterArte : null, W = WR.S(st), fatti = []; if (!WA || !via.length) return fatti;
    const TS = G.TS, GW = G.GW, ti = (x, y) => Math.floor(y / TS) * GW + Math.floor(x / TS);
    const vicini = (x, y) => { for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) if (CAMB.has(ti(x + a * TS, y + b * TS))) return true; return false; };
    const SITI = ctx.SITES.filter(q => /^(strada|hall|ferrovia|muro)$/.test(q.kind) && (q.len || 0) >= 2.4 && q.along && vicini(q.x, q.y));
    const usati = new Map();
    const occupato = (x, y, r) => W.works.some(w => { const p = w.spot || (w.pos && { x: w.pos.x, y: w.pos.z }); return p && Math.hypot(p.x - x, p.y - y) < r; });
    via.sort((a, b) => (b.W || 1) - (a.W || 1)).forEach((o, k) => { const c = o.gfxRect && o.gfxRect.c, x = c ? c.x : o.spot.x, y = c ? c.z : o.spot.y, Wd = Math.min(o.W || 1.2, 4);
      let best = null; SITI.forEach(q => { const n = usati.get(q) || 0; if (n >= Math.floor(q.len / 2.5)) return; const t = Math.max(Wd / 2 + .3, Math.min(q.len - Wd / 2 - .3, (x - q.x) * q.along[0] + (y - q.y) * q.along[1]));
        if (q.len < Wd + .6) return; const px = q.x + q.along[0] * t, py = q.y + q.along[1] * t, d = Math.hypot(px - x, py - y); if (d > 12 || occupato(px, py, Wd / 2 + 1)) return; if (!best || d < best.d) best = { q, t, d }; });
      if (!best) return; usati.set(best.q, (usati.get(best.q) || 0) + 1);
      const spot = ctx.spotOf(best.q, best.t), aka = o.aka || 'CIAPA', crew = o.crew || 'PVK', h = aka.charCodeAt(0) * 977 + aka.charCodeAt(1) * 31 + (aka.charCodeAt(2) || 7), sk0 = .45 + (h % 45) / 100;
      const w = Object.assign(WA.conceive({ aka, crew, style: o.style, dna: WA.dnaOf(h, sk0, h % 14), seed: o.seed || (7919 * (k + 1)), by: 'old:' + aka }),
        { by: 'old', hand: o.hand || h * 13, surf: 'muro', spot, place: spot.place, prog: 1, done: true, old: true, u2: true }, o.sdPal ? { sdPal: o.sdPal, sdZona: o.sdZona, sdLiv: o.sdLiv, sdEta: o.sdEta } : {});
      ['W0', 'H0', 'tagK', 'sign', 'words', 'kind', 'sdAdesivi', 'sdManifesti'].forEach(f => { if (o[f] !== undefined) w[f] = o[f]; });
      WR._.addWork(st, w); w.t0 = w.tDone = st.t - (o.eta0 || 40 * 1440); fatti.push({ style: o.style, da: [+x.toFixed(1), +y.toFixed(1)], a: [+spot.x.toFixed(1), +spot.y.toFixed(1)], d: +best.d.toFixed(1) }); });
    return fatti;
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

  const API = { on: ON, PEZZE, PIANO, GRAF, applica, mondo, fine, prima, dopo, graffiti, stato: STATO };
  // ---------------- in Node: il require di world_cittanuova.js carica il testo toccato ----------------
  if (ON && typeof module !== 'undefined' && typeof require === 'function' && typeof window === 'undefined') { try {
    const Mod = require('module'), fs = require('fs'), path = require('path'), ld = Mod._extensions['.js'];
    Mod._extensions['.js'] = function (m, f) { if (path.basename(f) === 'world_cittanuova.js') { let s = fs.readFileSync(f, 'utf8'); try { s = applica(s); } catch (e) { STATO.errore = e.message; console.error(e.message); } return m._compile(s, f); } return ld(m, f); };
    global.Urbanistica2 = API;
  } catch (e) { STATO.errore = e.message; } }
  return API;
})();
if (typeof module !== 'undefined') module.exports = Urbanistica2;
