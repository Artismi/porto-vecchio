/* Porto Vecchio — i percorsi del level designer (v7, [percorsi]).
   «Si deve avere la sensazione di essere sempre su un percorso creato da un level designer, anche essendo open world.»
   La rete dei percorsi della città nuova come DATO (W.percorsi), progettata e non casuale (PIANO_CITTA.md sez. 5, level_designer.md):
   - I TRE PERCORSI DOMINANTI (Lynch): la Rua Maestra (storta, dalla Porta di Terra alla spianata), la Via della Vittoria (dritta, dal
     Mercato al cannocchiale sulla Porta della Rocca), il Corso (ad arco, dalla ferrovia al porto). Poi i PERCORSI SECONDARI che li
     legano attraverso le piazzette e gli sbocchi: la Marina, la Via di Mezzo, il Pozzo, il Forno, il sagrato e le mura, la Stazione.
   - LE SCORCIATOIE: ogni vicolo si misura contro la strada (il cammino più corto senza vicoli fra i suoi due capi). Se è almeno il 30%
     più corto è una scorciatoia; altrimenti (o se è cieco) è un NASCONDIGLIO. Ogni vicolo è l'una o l'altra cosa.
   - I CIRCUITI SUI TETTI (si legano dopo, con Percorsi.lega, quando c'è tetti.js): almeno tre giri nel borgo, ognuno sale da una scala
     color minio, passa per i salti e le passerelle color crema, scende da un'altra parte; più il camminamento delle mura di tramontana.
   - LE PORTE DELLA CITTÀ (i colli di bottiglia): Porta di Terra, sottoportico della Vittoria, sottopasso della ferrovia, scala dei
     pescatori, posto di blocco sulla Vittoria. Ognuna con la sua alternativa (i tetti o un tombino), legata anch'essa in Percorsi.lega.
   - I PUNTI DI RICHIAMO: ogni percorso è spezzato in TRATTI (agli incroci, ai nodi, dove si perde la vista, al più 45 m nel borgo); per
     ogni tratto, dove punta lo sguardo: un landmark, il mare, la luce di una piazzetta, una porta accesa in fondo. Il richiamo dev'essere
     davanti (entro 35°), visibile (nessuna casa lo copre: si guarda da 1,6 m) e nel borgo a meno di 60 m (la regola dei 60 m).
   Il rendering (render.js [percorsi], tetti.js) legge questo dato e lo fa vedere senza HUD: l'usura del suolo, le briciole minio e
   crema, le luci in fondo ai tratti, i percorsi un filo più chiari e caldi, i nascondigli più scuri.
   Coordinate finali in metri (dopo expand: x verso est, y verso sud). Nessuna grafica qui. */
var Percorsi = (function () {
  'use strict';
  const W = typeof World !== 'undefined' ? World : (typeof require !== 'undefined' ? require('./world_cittanuova.js') : null);
  const VUOTO = { attivo: false, lega() { return null; }, dati: null };
  if (!W || !W.sets || !W.roads) return VUOTO;   // la mappa vecchia: niente rete
  const DBG = typeof process !== 'undefined' && process.env && process.env.PV_DBG, T0 = Date.now();
  const TS = W.TS, GW = W.GW, GH = W.GH, T = W.T, B = W.BUILDINGS, EL = W.elev, BI = W.bIndex;
  const hyp = Math.hypot, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const inb = (tx, ty) => tx >= 0 && ty >= 0 && tx < GW && ty < GH;
  const tI = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return inb(tx, ty) ? ty * GW + tx : -1; };
  const walkT = (tx, ty) => { if (!inb(tx, ty)) return false; const v = W.grid[ty * GW + tx]; return v !== T.BLD && v !== T.WATER && v !== T.FOUNT && v !== T.TREE && v !== T.CLIFF; };   // come game.js
  const elevAt = (x, y) => { const i = tI(x, y); return i < 0 ? 0 : EL[i]; };
  const roofTop = b => (b.base || 0) + (b.lighthouse ? 12 : b.kiosk ? 2.8 : b.fl >= 1 ? 3.6 + (b.fl - 1) * 2.4 : 3);   // come Tetti.roofRule
  const road = id => W.roads.find(r => r.id === id);
  const lenP = P => { let L = 0; for (let k = 1; k < P.length; k++) L += hyp(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]); return L; };
  const pz = tipo => (W.pezzi || []).filter(p => p.tipo === tipo);
  const pzW = (p, lx, lz) => { const c = Math.cos(p.rot), s = Math.sin(p.rot); return [p.x + lx * c + lz * s, p.y - lx * s + lz * c]; };
  const pzL = (p, x, y) => { const c = Math.cos(p.rot), s = Math.sin(p.rot), dx = x - p.x, dy = y - p.y; return [dx * c - dy * s, dx * s + dy * c]; };
  const setOf = (k, f) => W.sets.find(q => q.k === k && (!f || f(q)));
  const cOf = q => q.x !== undefined ? [q.x, q.y] : [(q.x0 + q.x1) / 2, (q.y0 + q.y1) / 2];
  // il borgo (E0/E2) dove vale la regola dei 60 m: la Vittoria (E4) lo taglia e non ne fa parte
  const BORGO = { x0: 1312, x1: 1466, y0: 262, y1: 412 };
  const borgoAt = (x, y) => x > BORGO.x0 && x < BORGO.x1 && y > BORGO.y0 && y < BORGO.y1 && Math.abs(y - 343) > 13;

  if (DBG) console.error('[percorsi] t', 42, Date.now() - T0);
  // ================= LA VISTA: cosa copre cosa (case, pezzi grandi, archi sopra i vicoli) =================
  // l'altezza di un pezzo grande che riserva caselle piene (BLD senza casa): torre, porta, stazione, arco
  const PZH = { torre_littoria: 34, porta_terra: 13, stazione: 11, magazzini_volta: 5.2, sottopasso: 4.8, arco_sottopasso: 9.6, lavatoio: 3, caserma: 10, polveriera: 6, torrione: 16, porta_monumentale: 12, cortina: 12, bastione: 12, muro_garante: 3.6, mura_tramontana: 7, campanile: 30, facciata_chiesa: 16 };
  const PZBOX = []; (W.pezzi || []).forEach(p => { if (!p.imp) return; p.imp.forEach(r => { if (r[0] !== 'B') return; PZBOX.push({ p, r, h: (p.q || 0) + (PZH[p.tipo] || 8) }); }); });
  // gli archi e le volte sopra i vicoli: si passa sotto (la vista anche), ma sopra i 3,4 m coprono
  const VOLTE = []; (W.pezzi || []).forEach(p => { if (p.tipo === 'arco_sottopasso') VOLTE.push({ p, x0: -1, x1: 8.4, z0: -6, z1: 6, y0: (p.q || 0) + 3.2, y1: (p.q || 0) + 9.6 });
    if (p.tipo === 'arco_contrasto') VOLTE.push({ p, x0: -2, x1: 2, z0: -.6, z1: .6, y0: (p.q || 0) + 3.6, y1: (p.q || 0) + 7.5 });
    if (p.tipo === 'portico') VOLTE.push({ p, x0: 0, x1: 26, z0: -4.2, z1: .2, y0: (p.q || 0) + 4.6, y1: (p.q || 0) + 17 }); });
  const pzHAt = (x, y) => { let h = -1; PZBOX.forEach(q => { const [l, z] = pzL(q.p, x, y); if (l >= q.r[1] && l <= q.r[2] && z >= q.r[3] && z <= q.r[4]) h = Math.max(h, q.h); }); return h; };
  const PZH_CACHE = new Map();
  const solidH = i => {   // l'altezza assoluta del pieno in una casella (-1: vuota)
    if (W.grid[i] !== T.BLD) return -1; const bi = BI[i]; if (bi >= 0 && B[bi]) return roofTop(B[bi]);
    if (PZH_CACHE.has(i)) return PZH_CACHE.get(i); const tx = i % GW, ty = (i - tx) / GW, h = pzHAt(tx * TS + 1, ty * TS + 1), v = h > 0 ? h : EL[i] + 6; PZH_CACHE.set(i, v); return v; };
  // la vista libera da (ax, ay) a quota assoluta az fino a (bx, by, bz); skip: metri attorno al bersaglio che non contano (ci sta sopra)
  function vista(ax, ay, az, bx, by, bz, skip) {
    const L = hyp(bx - ax, by - ay); if (L < .5) return true; let last = -1;
    for (let s = .8; s < L - (skip || 0); s += .4) { const t = s / L, x = ax + (bx - ax) * t, y = ay + (by - ay) * t, z = az + (bz - az) * t, i = tI(x, y); if (i < 0) return false;
      if (i !== last) { last = i; const h = solidH(i); if (h > z) return false; }
      for (const v of VOLTE) { if (z < v.y0 || z > v.y1) continue; const [l, q] = pzL(v.p, x, y); if (l >= v.x0 && l <= v.x1 && q >= v.z0 && q <= v.z1) return false; } }
    return true;
  }
  const occhio = (x, y) => elevAt(x, y) + 1.6;

  if (DBG) console.error('[percorsi] t', 65, Date.now() - T0);
  // ================= IL CAMMINO A TERRA (per misurare scorciatoie e secondari) =================
  const BOX = { tx0: Math.floor(1240 / TS),   /* [mappa_compatta] la città finisce alla stazione */ tx1: Math.ceil(1620 / TS), ty0: Math.floor(236 / TS), ty1: Math.ceil(424 / TS) };
  const NB = (BOX.tx1 - BOX.tx0) * (BOX.ty1 - BOX.ty0), bw = BOX.tx1 - BOX.tx0;
  const bIdx = (tx, ty) => (ty - BOX.ty0) * bw + (tx - BOX.tx0), inBox = (tx, ty) => tx >= BOX.tx0 && ty >= BOX.ty0 && tx < BOX.tx1 && ty < BOX.ty1;
  // le caselle di ogni strada (il corridoio della sua larghezza)
  const corr = new Map();
  function corridoio(rd, pad) {
    const k = rd.id + ':' + (pad || 0); if (corr.has(k)) return corr.get(k); const S = new Set(), P = rd.pts, h = rd.w / 2 + (pad || 0);
    for (let k2 = 0; k2 < P.length - 1; k2++) { const [ax, ay] = P[k2], [bx, by] = P[k2 + 1], L = hyp(bx - ax, by - ay) || 1, nx = -(by - ay) / L, ny = (bx - ax) / L;
      for (let s = 0; s <= L; s += .5) for (let o = -h; o <= h; o += .5) { const i = tI(ax + (bx - ax) * s / L + nx * o, ay + (by - ay) * s / L + ny * o); if (i >= 0) S.add(i); } }
    corr.set(k, S); return S;
  }
  const VICOLI = W.roads.filter(r => /^vic_/.test(r.id) && r.pts && r.pts.length > 1);
  // le caselle «di strada»: le vie non vicolo della città (il loro corridoio); quelle dei vicoli sono le altre (una casella di via resta via)
  const stradaTiles = new Set(); W.roads.filter(r => r.pts && !/^vic_/.test(r.id) && r.era).forEach(rd => corridoio(rd, .5).forEach(i => stradaTiles.add(i)));
  const vicTiles = new Set(); VICOLI.forEach(rd => corridoio(rd, .3).forEach(i => { if (!stradaTiles.has(i) && W.grid[i] !== T.PIAZZA) vicTiles.add(i); }));
  // Dijkstra a 8 vicini sulle caselle del riquadro della città; ok(i) dice dove si può passare, cost(i) quanto pesa
  // il punto calpestabile più vicino (entro 3 m): i capi dei vicoli finiscono a volte su un gradino o contro la vasca
  const aTerra = (x, y) => { if (walkT(Math.floor(x / TS), Math.floor(y / TS))) return [x, y]; let b = null, bd = 9; for (let dy = -3; dy <= 3; dy += .5) for (let dx = -3; dx <= 3; dx += .5) { const d = hyp(dx, dy); if (d < bd && walkT(Math.floor((x + dx) / TS), Math.floor((y + dy) / TS))) { bd = d; b = [x + dx, y + dy]; } } return b || [x, y]; };
  function cammino(ax, ay, bx, by, ok, cost) {
    [ax, ay] = aTerra(ax, ay); [bx, by] = aTerra(bx, by);
    const s = tI(ax, ay), t = tI(bx, by); if (s < 0 || t < 0) return null;
    const D = new Float64Array(NB).fill(Infinity), P = new Int32Array(NB).fill(-1), H = [];
    const push = (i, d) => { H.push([d, i]); let k = H.length - 1; while (k > 0) { const q = (k - 1) >> 1; if (H[q][0] <= H[k][0]) break; [H[q], H[k]] = [H[k], H[q]]; k = q; } };
    const pop = () => { const top = H[0], last = H.pop(); if (H.length) { H[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < H.length && H[l][0] < H[m][0]) m = l; if (r < H.length && H[r][0] < H[m][0]) m = r; if (m === k) break; [H[m], H[k]] = [H[k], H[m]]; k = m; } } return top; };
    const sx = s % GW, sy = (s - sx) / GW, txe = t % GW, tye = (t - txe) / GW; if (!inBox(sx, sy) || !inBox(txe, tye)) return null;
    D[bIdx(sx, sy)] = 0; push(s, 0);
    while (H.length) { const [d, i] = pop(), tx = i % GW, ty = (i - tx) / GW, bi = bIdx(tx, ty); if (d > D[bi]) continue; if (i === t) break;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const x = tx + dx, y = ty + dy; if (!inBox(x, y) || !walkT(x, y)) continue;
        const j = y * GW + x; if (j !== t && !ok(j)) continue; if (dx && dy && (!walkT(tx + dx, ty) || !walkT(tx, ty + dy))) continue;   // niente angoli tagliati fra due muri
        const nd = d + (dx && dy ? Math.SQRT2 : 1) * TS * (cost ? cost(j) : 1), bj = bIdx(x, y); if (nd < D[bj]) { D[bj] = nd; P[bj] = i; push(j, nd); } } }
    const bt = bIdx(txe, tye); if (!isFinite(D[bt])) return null;
    const pts = []; let c = t; while (c >= 0) { const cx = c % GW, cy = (c - cx) / GW; pts.push([(cx + .5) * TS, (cy + .5) * TS]); if (c === s) break; c = P[bIdx(cx, cy)]; }
    pts.reverse(); return { pts, L: D[bt] };
  }
  // una polilinea a caselle diventa una linea pulita: si tiene un punto quando la retta dal precedente non resta sul calpestabile
  function semplifica(P) {
    if (P.length < 3) return P.slice(); const out = [P[0]]; let a = 0;
    const libero = (p, q) => { const L = hyp(q[0] - p[0], q[1] - p[1]); for (let s = 0; s <= L; s += .5) { const x = p[0] + (q[0] - p[0]) * s / L, y = p[1] + (q[1] - p[1]) * s / L; if (!walkT(Math.floor(x / TS), Math.floor(y / TS))) return false; } return true; };
    for (let k = 2; k < P.length; k++) if (!libero(P[a], P[k]) || hyp(P[k][0] - P[a][0], P[k][1] - P[a][1]) > 14) { out.push(P[k - 1]); a = k - 1; }
    out.push(P[P.length - 1]); return out;
  }

  if (DBG) console.error('[percorsi] t', 105, Date.now() - T0);
  // ================= I NODI: piazze, porte, sbocchi =================
  const NODI = [];
  const nodo = (id, nome, k, x, y, ex) => { const n = Object.assign({ id, nome, k, x, y }, ex || {}); NODI.push(n); return n; };
  const pt = pz('porta_terra')[0], ptC = pt ? pzW(pt, 11.5, 6.4) : [1323, 308];
  nodo('porta_terra', 'Porta di Terra', 'porta', ptC[0], ptC[1]);
  { const q = setOf('mercato'); if (q) nodo('mercato', 'Piazza del Mercato', 'piazza', q.x, q.y); }
  { const q = setOf('adunata'); if (q) nodo('adunata', 'Piazza d\'adunata', 'piazza', (q.x0 + q.x1) / 2, (q.y0 + q.y1) / 2); }
  { const q = setOf('sagrato'); if (q) nodo('sagrato', 'Sagrato della Chiesa Madre', 'piazza', (q.x0 + q.x1) / 2, q.y1 + 1); }
  { const q = setOf('piazzetta', q => q.bar); if (q) nodo('pozzo', 'Piazzetta del Pozzo (il bar)', 'piazza', q.x, q.y); }
  { const q = setOf('piazzetta', q => q.forno); if (q) nodo('forno', 'Piazzetta del Forno', 'piazza', q.x, q.y); }
  { const q = setOf('marina'); if (q) nodo('piazza_marina', 'Piazza della Marina', 'piazza', (q.x0 + q.x1) / 2, (q.y0 + q.y1) / 2); }
  const mg = pz('muro_garante')[0], mgC = mg ? pzW(mg, 12, 0) : [1469, 343];
  nodo('posto_blocco', 'Posto di blocco della Vittoria', 'porta', mgC[0], mgC[1]);
  { const R = road('rua'); if (R) nodo('spianata', 'La spianata della Rocca', 'sbocco', R.pts[R.pts.length - 1][0], R.pts[R.pts.length - 1][1]); }
  const nodoDi = id => NODI.find(n => n.id === id);

  if (DBG) console.error('[percorsi] t', 121, Date.now() - T0);
  // ================= I LANDMARK E GLI ALTRI RICHIAMI =================
  // landmark: [nome, x, y, quota assoluta del punto che si guarda, raggio del pezzo (la vista ci arriva sopra)]
  const LANDMARK = [];
  const lm = (tipo, nome, lx, lz, h, r) => pz(tipo).forEach(p => { const [x, y] = pzW(p, lx, lz); LANDMARK.push({ k: 'landmark', tipo, nome, x, y, z: (p.q || 0) + h, r }); });
  lm('campanile', 'il campanile della Chiesa Madre', 2.2, 0, 26, 3.5);
  lm('torre_littoria', 'la torre littoria', 4, 0, 30, 5);
  lm('porta_terra', 'la Porta di Terra', 11.5, 0, 11, 7);
  lm('tettoia_mercato', 'la tettoia verde del Mercato', 14, 0, 7, 15);
  lm('porta_monumentale', 'la Porta della Rocca', 5.5, 0, 11, 5);
  lm('torrione', 'il torrione della Rocca', 7, 0, 15, 8);
  lm('stazione', 'l\'orologio della stazione', 16, -6, 10, 10);
  lm('muro_garante', 'il riflettore del posto di blocco', 12, 0, 6.5, 3);
  lm('molo_vecchio', 'la lanterna del molo', 0, 0, 5, 4);
  // le luci delle piazze: il lampione in mezzo, a 3,5 m
  const LUCE_N = { mercato: 'del Mercato', adunata: 'della piazza d\'adunata', sagrato: 'del sagrato', pozzo: 'del bar del Pozzo', forno: 'della piazzetta del Forno', piazza_marina: 'della Piazza della Marina' };
  const LUCI = NODI.filter(n => n.k === 'piazza').map(n => ({ k: 'luce', nome: 'la luce ' + (LUCE_N[n.id] || 'della piazza'), x: n.x, y: n.y, z: elevAt(n.x, n.y) + 3.5, r: 2, nodo: n.id }));
  // il mare: le caselle d'acqua lungo la riva sud del borgo e della città (a quota del mare)
  const MARE = []; for (let x = 1250; x <= 1480; x += 6) for (let y = 380; y < 424; y += 2) { const i = tI(x, y); if (i >= 0 && W.grid[i] === T.WATER) { MARE.push({ k: 'mare', nome: 'il mare', x, y, z: .6, r: 1 }); break; } }
  for (let x = 1320; x <= 1470; x += 6) for (let y = 270; y > 240; y -= 2) { const i = tI(x, y); if (i >= 0 && W.grid[i] === T.WATER) { MARE.push({ k: 'mare', nome: 'il mare di tramontana', x, y, z: .6, r: 1 }); break; } }
  // le porte che si possono accendere: i portoni delle case (la lampadina sopra c'è già, [pulizia2]); la più vicina al fondo del tratto
  const PORTONI = []; B.forEach((b, bi) => { if (!b.door || b.lighthouse) return; const [dx, dy] = b.door; PORTONI.push({ bi, x: (dx + .5) * TS, y: (dy + .5) * TS }); });

  if (DBG) console.error('[percorsi] t', 142, Date.now() - T0);
  // ================= I PERCORSI E I LORO TRATTI =================
  const PERCORSI = [], TRATTI = [];
  // spezza una polilinea in tratti: ai nodi, dove si perde la vista dall'inizio, al più lmax metri
  function trattiDi(per, P, lmax) {
    const out = []; let a = 0;
    const lungo = (i, j) => { let L = 0; for (let k = i + 1; k <= j; k++) L += hyp(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]); return L; };
    // ricampiona a passi di ~2 m
    while (a < P.length - 1) {
      let b = a + 1;
      while (b < P.length - 1) {
        const L = lungo(a, b + 1), [x, y] = P[b + 1], borgo = borgoAt(x, y), lm2 = borgo ? Math.min(lmax, 45) : lmax;
        if (L > lm2) break;
        if (L > 14 && !vista(P[a][0], P[a][1], occhio(P[a][0], P[a][1]), x, y, elevAt(x, y) + 2.2, 0)) break;   // la vista si perde: il tratto finisce dove ancora si vede (non prima di 14 m)
        b++;
        if (L > 10 && NODI.some(n => hyp(n.x - P[b][0], n.y - P[b][1]) < 5)) break;   // un nodo: il tratto finisce lì
      }
      out.push(P.slice(a, b + 1)); a = b;
    }
    // l'ultimo pezzetto corto si unisce al precedente
    if (out.length > 1 && lenP(out[out.length - 1]) < 6) { const u = out.pop(); out[out.length - 1] = out[out.length - 1].concat(u.slice(1)); }
    return out.map((pts, i) => { const t = { id: per.id + '.' + (i + 1), percorso: per.id, k: per.k, pts, L: lenP(pts) }; t.borgo = borgoAt((pts[0][0] + pts[pts.length - 1][0]) / 2, (pts[0][1] + pts[pts.length - 1][1]) / 2); return t; });
  }
  const ricampiona = (P, d) => { const out = [P[0]]; for (let k = 1; k < P.length; k++) { const [ax, ay] = P[k - 1], [bx, by] = P[k], L = hyp(bx - ax, by - ay), n = Math.max(1, Math.round(L / d)); for (let j = 1; j <= n; j++) out.push([ax + (bx - ax) * j / n, ay + (by - ay) * j / n]); } return out; };
  function percorso(id, nome, k, pts, ex) {
    const P = ricampiona(pts, 2), per = Object.assign({ id, nome, k, pts: P, L: lenP(P), tratti: [] }, ex || {});
    trattiDi(per, P, k === 'dominante' && !/rua/.test(id) ? 140 : 60).forEach(t => { per.tratti.push(t.id); TRATTI.push(t); });
    PERCORSI.push(per); return per;
  }
  // i tre dominanti, nel verso del racconto
  { const R = road('rua'); if (R) percorso('rua', 'Rua Maestra', 'dominante', R.pts, { verso: 'dalla Porta di Terra alla spianata' }); }
  { const R = road('vittoria'); if (R) percorso('vittoria', 'Via della Vittoria', 'dominante', R.pts, { verso: 'dal Mercato al cannocchiale sulla Porta della Rocca' }); }
  { const R = road('corso'); if (R) percorso('corso', 'Corso Garibaldi', 'dominante', R.pts, { verso: 'dalla ferrovia al porto' }); }
  // i secondari: per tappe (nodi o punti), il cammino a terra preferisce le vie e le piazze
  const sulPercorso = (id, f) => { const P = (PERCORSI.find(p => p.id === id) || {}).pts || (road(id) || {}).pts; if (!P) return null; return f(P); };
  const vicino = (id, x, y) => sulPercorso(id, P => { let b = null, d = 1e9; P.forEach(q => { const e = hyp(q[0] - x, q[1] - y); if (e < d) { d = e; b = q; } }); return b; });
  const capo = (vid, fine) => { const r = road(vid); return r ? (fine ? r.pts[r.pts.length - 1] : r.pts[0]) : null; };
  const costoSec = i => stradaTiles.has(i) ? 1 : vicTiles.has(i) ? 1.15 : 1.8;
  function secondario(id, nome, tappe, ex) {
    const T2 = tappe.map(q => typeof q === 'string' ? (nodoDi(q) ? [nodoDi(q).x, nodoDi(q).y] : null) : q).filter(Boolean); if (T2.length < 2) return null;
    let pts = []; for (let k = 0; k < T2.length - 1; k++) { const c = cammino(T2[k][0], T2[k][1], T2[k + 1][0], T2[k + 1][1], () => true, costoSec); if (!c) return null; pts = pts.concat(k ? c.pts.slice(1) : c.pts); }
    return percorso(id, nome, 'secondario', semplifica(pts), ex);
  }
  {
    const MAR = road('marina'), MEZ = road('mezzo');
    if (MAR) percorso('marina', 'Via della Marina', 'secondario', MAR.pts, { lega: ['corso', 'piazza_marina'] });
    if (MEZ) percorso('mezzo', 'Via di Mezzo', 'secondario', MEZ.pts, { lega: ['forno', 'marina'] });
    // il Pozzo: dalla piazzetta del bar sulla Rua, poi giù per il Caruggio dei Pescatori sotto il portico fino alla Vittoria
    secondario('pozzo', 'Dal Pozzo alla Vittoria', ['pozzo', capo('vic_pozzo', false), capo('vic_pozzo', true), vicino('vittoria', 1437, 343)], { lega: ['pozzo', 'rua', 'vittoria'] });
    // il Forno: dalla Vittoria alla fontana del Forno e giù per la scalinata alla marina
    secondario('forno', 'Dal Forno alla marina', [vicino('vittoria', 1360, 343), 'forno', capo('vic_forno', false), capo('vic_forno', true), vicino('marina', 1349, 386)], { lega: ['vittoria', 'forno', 'marina'] });
    // il sagrato: dalla Rua al sagrato, poi su per il Vico dell'Arco fino alle mura
    secondario('sagrato', 'Dal sagrato alle mura', [vicino('rua', 1383, 308), 'sagrato', capo('vic_lanternini', false), capo('vic_lanternini', true)], { lega: ['rua', 'sagrato', 'mura'] });
    // la stazione: dal Corso alla Via della Stazione e al piazzale
    const VA = road('via_alta'); if (VA) secondario('stazione', 'Dal Corso alla stazione', [vicino('corso', 1318, 300), [VA.pts[Math.floor(VA.pts.length * .55)][0], VA.pts[Math.floor(VA.pts.length * .55)][1]]], { lega: ['corso', 'stazione'] });
    // la calata: dalla Piazza della Marina lungo l'acqua fino al Molo
    secondario('calata', 'La calata', ['piazza_marina', vicino('marina', 1440, 400), vicino('marina', 1470, 405)], { lega: ['piazza_marina', 'molo'] });
  }

  if (DBG) console.error('[percorsi] t', 200, Date.now() - T0);
  // ================= LE SCORCIATOIE E I NASCONDIGLI =================
  // la strada fra i due capi di un vicolo: il cammino più corto senza vicoli (solo vie, piazze, lastrico); i primi 3 m dai capi valgono
  const SCORC = [];
  VICOLI.forEach(rd => {
    const P = rd.pts, A = P[0], Z = P[P.length - 1], Lv = lenP(P), mine = corridoio(rd, .3);
    const ok = i => { if (!vicTiles.has(i)) return true; const tx = i % GW, ty = (i - tx) / GW, x = (tx + .5) * TS, y = (ty + .5) * TS; return mine.has(i) ? false : hyp(x - A[0], y - A[1]) < 3 || hyp(x - Z[0], y - Z[1]) < 3; };
    // se fra i due capi non c'è una via senza vicoli (il vicolo che lega due vicoli), si misura il giro più corto senza questo vicolo
    const okA = i => { if (!mine.has(i)) return true; const tx = i % GW, ty = (i - tx) / GW, x = (tx + .5) * TS, y = (ty + .5) * TS; return hyp(x - A[0], y - A[1]) < 3 || hyp(x - Z[0], y - Z[1]) < 3; };
    let c = cammino(A[0], A[1], Z[0], Z[1], ok, null), come = 'strada'; if (!c) { c = cammino(A[0], A[1], Z[0], Z[1], okA, null); come = 'giro'; }
    const Ls = c ? c.L : Infinity, g = isFinite(Ls) ? 1 - Lv / Ls : 0;
    const s = { vic: rd.id, nome: rd.name, pts: P, L: Lv, Lstrada: isFinite(Ls) ? Ls : null, come: c ? come : null, guadagno: isFinite(Ls) ? g : null, k: g >= .3 && isFinite(Ls) ? 'scorciatoia' : 'nascondiglio', cieco: !isFinite(Ls), strada: c ? semplifica(c.pts) : null };
    // l'indizio che la annuncia: l'arco o il sottopasso già posati sul vicolo, altrimenti la luce dall'altra parte (render.js la accende)
    const arco = (W.pezzi || []).find(p => (p.tipo === 'arco_sottopasso' || p.tipo === 'arco_contrasto') && p.vicolo === rd.id);
    const scala = (W.pezzi || []).find(p => p.tipo === 'scalinata' && p.vicolo === rd.id);
    s.indizio = arco ? { k: arco.tipo === 'arco_sottopasso' ? 'sottopasso' : 'arco', x: arco.x, y: arco.y } : scala ? { k: 'scalinata', x: scala.x, y: scala.y } : { k: 'luce', x: Z[0], y: Z[1] };
    SCORC.push(s);
  });

  if (DBG) console.error('[percorsi] t', 215, Date.now() - T0);
  // ================= LE PORTE DELLA CITTÀ (le alternative si legano in lega) =================
  const PORTE = [];
  const porta = (id, nome, k, x, y, lati, ex) => PORTE.push(Object.assign({ id, nome, k, x, y, lati, alternativa: null }, ex || {}));
  // lati: due punti a terra, uno per parte; l'alternativa li deve collegare senza passare dalla porta
  porta('porta_terra', 'Porta di Terra', 'porta', ptC[0] - 6, ptC[1], [[ptC[0] - 14, ptC[1] + 2], [ptC[0] + 10, ptC[1] + 1]]);
  // il sottoportico: il Vico dei Bottai passa sotto il portico e attraversa la Vittoria (il collo è la carreggiata sorvegliata)
  { const v = road('vic_bottai'), s = v ? v.pts[v.pts.length - 1] : [1398, 335]; porta('sottoportico', 'Il sottoportico della Vittoria (Vico dei Bottai)', 'sottoportico', s[0], 343, [[s[0], 324], [s[0], 362]], { vic: 'vic_bottai', imbocco: s }); }
  { const C = road('cavour_sotto'), p = pz('sottopasso')[0]; if (C && p) { const a = C.pts[0], z = C.pts[C.pts.length - 1], c = pzW(p, 7, 0); porta('sottopasso', 'Il sottopasso della ferrovia (Via Cavour)', 'sottopasso', c[0], c[1], [[a[0], a[1] - 1], [z[0], z[1] + 2]]); } }
  { const p = (W.pezzi || []).find(q => q.tipo === 'scalinata' && q.vicolo === 'vic_lungo'); if (p) { const v = road('vic_lungo'), a = v.pts[0], z = v.pts[v.pts.length - 1]; porta('scala_pescatori', 'La scala dei pescatori (Vico Lungo)', 'scala', p.x, p.y, [[a[0], a[1]], [z[0], z[1] + 3]], { vic: 'vic_lungo' }); } }
  porta('posto_blocco', 'Il posto di blocco sulla Vittoria', 'blocco', mgC[0], mgC[1], [[mgC[0] - 16, mgC[1]], [mgC[0] + 14, mgC[1]]]);

  if (DBG) console.error('[percorsi] t', 225, Date.now() - T0);
  // ================= I RICHIAMI DEI TRATTI =================
  function richiamo(t) {
    // lo sguardo: dove si guarda camminando, verso il punto del tratto a 10 m (o il fondo, se il tratto è dritto e lungo)
    const P = t.pts, [ax, ay] = P[0], [zx, zy] = P[P.length - 1], az = occhio(ax, ay), lmax = t.borgo ? 60 : 320;
    let q10 = P[P.length - 1]; { let L = 0; for (let k = 1; k < P.length; k++) { L += hyp(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]); if (L >= 10) { q10 = P[k]; break; } } }
    const d10 = Math.atan2(q10[1] - ay, q10[0] - ax), dZ = Math.atan2(zy - ay, zx - ax), dd = Math.abs(((d10 - dZ) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI), dir = dd < .3 ? dZ : d10; t.sguardo = dir;
    const davanti = q => { const d = hyp(q.x - ax, q.y - ay); if (d < 4 || d > lmax) return null; let a = Math.abs(Math.atan2(q.y - ay, q.x - ax) - dir); if (a > Math.PI) a = 2 * Math.PI - a; return a <= .61 ? { d, a } : null; };
    const prio = { landmark: 3, luce: 2.2, mare: 2, porta: 1 };
    let best = null;
    [LANDMARK, LUCI, MARE].forEach(L => L.forEach(q => { const f = davanti(q); if (!f) return; if (!vista(ax, ay, az, q.x, q.y, q.z, q.r)) return;
      const s = prio[q.k] * 10 - f.a * 8 + (f.d < 15 ? -6 : 0) + Math.min(f.d, 60) / 30; if (!best || s > best.s) best = { s, q, d: f.d }; }));
    if (best) return { k: best.q.k, nome: best.q.nome, x: best.q.x, y: best.q.y, z: best.q.z, d: best.d, r: best.q.r };
    // la porta accesa in fondo: il portone più vicino al fondo del tratto, che si veda dall'inizio
    let pb = null; PORTONI.forEach(q => { const de = hyp(q.x - zx, q.y - zy); if (de > 7) return; const f = davanti(q); if (!f) return; const z = elevAt(q.x, q.y) + 2.6; if (!vista(ax, ay, az, q.x, q.y, z, 1.2)) return; if (!pb || de < pb.de) pb = { q, de, z, d: f.d }; });
    if (pb) return { k: 'porta', nome: 'la porta accesa di ' + (B[pb.q.bi].name || 'una casa'), x: pb.q.x, y: pb.q.y, z: pb.z, d: pb.d, bi: pb.q.bi, r: 1.2 };
    // la lanterna in fondo al tratto: la si mette apposta (render.js) sul punto più lontano del tratto che si vede dall'inizio
    for (let k = P.length - 1; k > 0; k--) { const [x, y] = P[k], z = elevAt(x, y) + 2.4; if (hyp(x - ax, y - ay) > 4 && davanti({ x, y }) && vista(ax, ay, az, x, y, z, .6)) return { k: 'lanterna', nome: 'una lanterna in fondo', x, y, z, d: hyp(x - ax, y - ay), r: .6 }; }
    return { k: 'lanterna', nome: 'una lanterna in fondo', x: zx, y: zy, z: elevAt(zx, zy) + 2.4, d: hyp(zx - ax, zy - ay), r: .6 };
  }
  TRATTI.forEach(t => { t.richiamo = richiamo(t); });

  // ================= LEGA: i tetti e i tombini (quando tetti.js e sottosuolo.js ci sono) =================
  // api: { Tetti, Sottosuolo, Game }. Calcola i circuiti sui tetti del borgo e le alternative delle porte. Si chiama una volta.
  const CIRCUITI = [];
  // le zone dove si cerca un giro (il borgo ha i suoi isolati: ognuno il suo giro)
  const ZONE = [
    { id: 'giro_porta', nome: 'Il giro della Porta', x0: 1312, x1: 1362, y0: 278, y1: 326 },
    { id: 'giro_forno', nome: 'Il giro del Forno', x0: 1312, x1: 1380, y0: 352, y1: 392 },
    { id: 'giro_campanile', nome: 'Il giro del campanile', x0: 1395, x1: 1465, y0: 262, y1: 326 },
    { id: 'giro_marina', nome: 'Il giro della marina', x0: 1420, x1: 1466, y0: 350, y1: 410 },
  ];
  function lega(api) {
    if (DATI.legato) return DATI; const TT = api && api.Tetti, SO = api && api.Sottosuolo, G = api && api.Game; if (!TT || !G) return DATI;
    const BB = G.BUILDINGS, cen = i => [(BB[i].x + BB[i].w / 2) * TS, (BB[i].y + BB[i].h / 2) * TS], GBI = G.MAP.world.bIndex;
    // il grafo dei tetti: archi orientati (si sale di un gradino o di un salto, si scende fino alla caduta senza danno)
    const E = TT.grafo();
    const inZ = (Z, i) => { const [x, y] = cen(i); return x >= Z.x0 && x <= Z.x1 && y >= Z.y0 && y <= Z.y1; };
    const usati = new Set();
    ZONE.forEach(Z => {
      const scale = TT.LADDERS.filter(L => L.footB < 0 && !L.camm && inZ(Z, L.bi));
      let best = null;
      scale.forEach(L => {
        // il cammino migliore da questa scala: si premiano i passaggi crema (salti, passerelle, scale fra tetti) e la lunghezza
        const prev = new Map([[L.bi, null]]), Q = [L.bi];
        for (let k = 0; k < Q.length; k++) { const a = Q[k]; (E.get(a) || []).forEach(e => { if (prev.has(e.b) || !inZ(Z, e.b) || usati.has(e.b) || BB[e.b].annesso) return; prev.set(e.b, { a, e }); Q.push(e.b); }); }   /* [mappa_compatta] niente annessi da 2 m: ci si cade oltre */
        scale.forEach(M => { if (M.bi === L.bi || !prev.has(M.bi) || usati.has(M.bi)) return; const dd = hyp(M.fx - L.fx, M.fy - L.fy); if (dd < 18) return;
          const pass = []; let c = M.bi; while (prev.get(c)) { const q = prev.get(c); pass.unshift(q.e); c = q.a; }
          const crema = pass.filter(e => e.k === 'salto' || e.k === 'passerella' || e.k === 'scala').length; if (!crema) return;
          let Lr = hyp(L.tx - cen(L.bi)[0], L.ty - cen(L.bi)[1]); let px = L.tx, py = L.ty; pass.forEach(e => { Lr += hyp(e.x - px, e.y - py); px = e.x; py = e.y; }); Lr += hyp(M.tx - px, M.ty - py);
          const s = Lr + crema * 12 + dd * .5; if (!best || s > best.s) best = { s, L, M, pass, Lr, crema }; });
      });
      if (!best) return;
      const bs = [best.L.bi].concat(best.pass.map(e => e.b)); bs.forEach(i => usati.add(i));
      const pts = [[best.L.fx, best.L.fy], [best.L.tx, best.L.ty]].concat(best.pass.map(e => [e.x, e.y])).concat([[best.M.tx, best.M.ty], [best.M.fx, best.M.fy]]);
      CIRCUITI.push({ id: Z.id, nome: Z.nome, k: 'tetti', sali: best.L.i, scendi: best.M.i, edifici: bs, passi: best.pass.map(e => ({ k: e.k, a: e.a, b: e.b, x: e.x, y: e.y, i: e.i, ux: e.ux, uy: e.uy })), pts, L: best.Lr, crema: best.crema });
    });
    // il camminamento delle mura di tramontana: dalla scala di ronda alla scala di ferro dall'altra parte
    const CM = (TT.CAMM || []).filter(c => c.tipo === 'mura_tramontana');
    if (CM.length) { const sc = TT.LADDERS.filter(L => L.camm && L.camm.tipo === 'mura_tramontana'); const pts = []; CM.forEach(c => { pts.push(c.a, c.b); });
      const Lm = CM.reduce((s, c) => s + c.L, 0); CIRCUITI.push({ id: 'mura', nome: 'Il camminamento delle mura di tramontana', k: 'mura', scale: sc.map(L => L.i), camm: CM.map(c => c.i), pts: [sc[0] ? [sc[0].fx, sc[0].fy] : pts[0]].concat(pts).concat(sc[1] ? [[sc[1].fx, sc[1].fy]] : []), L: Lm, crema: 0 }); }
    // le alternative delle porte: i tetti (una catena di tetti da una scala da una parte a una scala dall'altra) o un tombino
    const tomb = SO && SO.TPL ? SO.TPL.portals.filter(P => P.kind === 'tombino' || P.kind === 'grata' || P.kind === 'botola' || P.kind === 'pozzo').map(P => ({ P, x: (P.s[0] + .5) * TS, y: (P.s[1] + .5) * TS })) : [];
    const ugOk = (a, b) => { if (!SO || !SO.TPL) return false; const ug = SO.TPL.ug, s = a.P.s[1] * GW + a.P.s[0], t = b.P.s[1] * GW + b.P.s[0], seen = new Uint8Array(GW * GH), Q = [s]; seen[s] = 1;
      for (let k = 0; k < Q.length && k < 60000; k++) { const i = Q[k]; if (i === t) return true; const tx = i % GW, ty = (i - tx) / GW; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = (ty + dy) * GW + tx + dx; if (!seen[j] && ug[j]) { seen[j] = 1; Q.push(j); } } } return false; };
    // la parte di una porta da cui sta un punto: il segno della proiezione sull'asse fra i due lati
    PORTE.forEach(Pt => {
      const [A, Z] = Pt.lati, ux = Z[0] - A[0], uy = Z[1] - A[1], lato = (x, y) => Math.sign((x - Pt.x) * ux + (y - Pt.y) * uy);   // da che parte della porta
      const vicinoP = (x, y) => hyp(x - Pt.x, y - Pt.y);
      // 0) un camminamento che scavalca la porta (il rilevato sopra il sottopasso, le mura): due scale di ferro sulla stessa catena, una per parte
      const scC = TT.LADDERS.filter(L => L.camm && vicinoP(L.fx, L.fy) < 30);
      const cA = scC.find(L => lato(L.fx, L.fy) < 0), cZ = cA && scC.find(L => lato(L.fx, L.fy) > 0 && L.camm.tipo === cA.camm.tipo);
      if (cA && cZ) { Pt.alternativa = { k: 'tetti', nome: cA.camm.tipo === 'sottopasso' ? 'sopra il rilevato: si scavalca la ferrovia' : 'sulle mura', camm: cA.camm.tipo, sali: cA.i, scendi: cZ.i, edifici: [], passi: [], pts: [[cA.fx, cA.fy], [cA.tx, cA.ty], [cZ.tx, cZ.ty], [cZ.fx, cZ.fy]] }; return; }
      // 1) i tetti: una scala da terra per parte, collegate dal grafo, entro 45 m dalla porta
      const sc = TT.LADDERS.filter(L => L.footB < 0 && !L.camm && vicinoP(L.fx, L.fy) < 45 && lato(L.fx, L.fy) !== 0);
      let bestT = null;
      sc.filter(L => lato(L.fx, L.fy) < 0).forEach(L => { const prev = new Map([[L.bi, null]]), Q = [L.bi];
        for (let k = 0; k < Q.length && k < 400; k++) { const a = Q[k]; (E.get(a) || []).forEach(e => { if (prev.has(e.b) || vicinoP(...cen(e.b)) > 55) return; prev.set(e.b, { a, e }); Q.push(e.b); }); }
        sc.filter(M => lato(M.fx, M.fy) > 0 && prev.has(M.bi)).forEach(M => { const pass = []; let c = M.bi; while (prev.get(c)) { const q = prev.get(c); pass.unshift(q.e); c = q.a; }
          const s = hyp(M.fx - L.fx, M.fy - L.fy) + pass.length * 4; if (!bestT || s < bestT.s) bestT = { s, L, M, pass }; }); });
      if (bestT) { Pt.alternativa = { k: 'tetti', nome: 'sui tetti', sali: bestT.L.i, scendi: bestT.M.i, edifici: [bestT.L.bi].concat(bestT.pass.map(e => e.b)), passi: bestT.pass.map(e => ({ k: e.k, a: e.a, b: e.b, x: e.x, y: e.y, i: e.i, ux: e.ux, uy: e.uy })),
        pts: [[bestT.L.fx, bestT.L.fy], [bestT.L.tx, bestT.L.ty]].concat(bestT.pass.map(e => [e.x, e.y])).concat([[bestT.M.tx, bestT.M.ty], [bestT.M.fx, bestT.M.fy]]) }; return; }
      // 2) un tombino per parte, collegati sotto terra
      let bestS = null; const tA = tomb.filter(q => lato(q.x, q.y) < 0 && vicinoP(q.x, q.y) < 70), tZ = tomb.filter(q => lato(q.x, q.y) > 0 && vicinoP(q.x, q.y) < 70);
      tA.forEach(a => tZ.forEach(z => { const s = vicinoP(a.x, a.y) + vicinoP(z.x, z.y); if (bestS && s >= bestS.s) return; if (ugOk(a, z)) bestS = { s, a, z }; }));
      if (bestS) Pt.alternativa = { k: 'tombino', nome: 'sotto, per la fogna', entra: [bestS.a.x, bestS.a.y], esce: [bestS.z.x, bestS.z.y], pts: [[bestS.a.x, bestS.a.y], [bestS.z.x, bestS.z.y]], via: bestS.a.P.name + ' → ' + bestS.z.P.name };
    });
    DATI.legato = true; return DATI;
  }

  const DATI = { nodi: NODI, percorsi: PERCORSI, tratti: TRATTI, scorciatoie: SCORC, circuiti: CIRCUITI, porte: PORTE, landmark: LANDMARK, luci: LUCI, borgo: BORGO, legato: false };
  W.percorsi = DATI;
  // i conti per le prove e la pianta
  function conteggio() {
    const sc = SCORC.filter(s => s.k === 'scorciatoia'), na = SCORC.filter(s => s.k === 'nascondiglio');
    return { percorsi: PERCORSI.length, dominanti: PERCORSI.filter(p => p.k === 'dominante').length, secondari: PERCORSI.filter(p => p.k === 'secondario').length, tratti: TRATTI.length,
      scorciatoie: sc.length, nascondigli: na.length, guadagnoMedio: sc.length ? sc.reduce((s, q) => s + q.guadagno, 0) / sc.length : 0, circuiti: CIRCUITI.length, porte: PORTE.length,
      richiami: TRATTI.reduce((o, t) => (o[t.richiamo.k] = (o[t.richiamo.k] || 0) + 1, o), {}) };
  }
  return { attivo: true, dati: DATI, lega, vista, occhio, elevAt, borgoAt, cammino, conteggio, roofTop };
})();
if (typeof module !== 'undefined') module.exports = Percorsi;
