/* Porto Vecchio — i posti per le situazioni [vita2]
   La città non è solo case e strade: ha gli angoli dove succedono le cose. Qui si leggono dalla mappa (deterministici, dal
   seme della città: stessi edifici, stesse strade → stessi posti) e si tipizzano, così le scene (eventi.js) e il riempimento
   di fondo (popolo.js) sanno dove stare, verso dove guardare, a che ora e con chi.
   Un posto: { id, k (tipo), x, y (metri), dir (verso dove si guarda, radianti), cap (quanti ci stanno), h (ore: [[dalle, alle], ...],
   alle > 24 = dopo mezzanotte), giorni (facoltativo, 0 = lunedì), zona (borgo, marina, ottocento, boom, baracche, vittoria,
   spianata, rocca), bi (l'edificio, se c'è), uso (della bottega), tetto/h3 (sui tetti: la quota), scala (c'è una scala appoggiata) }.
   Tipi: dehors, pensilina, fermata, panchina, angolo, retrobottega, facciata_in_riparazione, lotto_vuoto, fuoco, porta_della_citta,
   mercato, sagrato, calata, portone, vetrina, edicola, stenditoio; [mappa_compatta] cypher (alla grata del vapore), fila (al Forno e da
   Wu), carico (lo Scalo e lo scalo merci), banco_pesce (la pescheria), parata (la Vittoria, la domenica alle 11).
   Posti.all() li costruisce la prima volta che servono (così Tetti, caricato dopo, c'è già); Posti.near(x, y, r, k) li cerca;
   Posti.openAt(p, t) dice se a quell'ora il posto è vivo; Posti.slots(p, n) dispone n persone in modo leggibile dalla camera
   (fov stretto, yaw π/4: la camera sta a sud-est e guarda a nord-ovest; lo schermo va da sud-ovest a nord-est): mai in fila
   lungo la visuale, mai sovrapposti, rivolti verso la cosa che fanno. Vale per la città nuova (?cittanuova) e, per quello che
   trova, anche per la mappa vecchia. Prova: node test_posti.js */
var Posti = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const W = G.MAP.world, TS = G.TS, GW = G.GW, GH = G.GH, T = G.T, B = G.BUILDINGS, PL = G.PLACES;
  const hash2 = W.hash2 || ((x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; });
  const PI = Math.PI, hyp = Math.hypot, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const CAM = { yaw: PI / 4 };   // la camera a piedi (render.js): sta verso +x, +y rispetto a chi guarda
  const camDir = () => ({ x: -Math.sin(CAM.yaw), y: -Math.cos(CAM.yaw) });            // dove guarda la camera (nord-ovest)
  const camRight = () => ({ x: Math.cos(CAM.yaw), y: -Math.sin(CAM.yaw) });           // la destra dello schermo (nord-est)
  const tile = (tx, ty) => G.tileAt(tx, ty), cx = tx => tx * TS + TS / 2, tx = x => Math.floor(x / TS);
  const roadW = i => (W.roadW ? W.roadW[i] : 0), zone = i => (W.zone ? W.zone[i] : -1), ZC = W.Z ? W.Z.CITTA : 1;
  // una casella dove si può stare: percorribile, non carreggiata, non dentro una casa
  const standT = (a, b) => { const v = tile(a, b); return G.walkT(a, b) && v !== T.VIA && v !== T.WATER; };
  const standM = (x, y) => standT(tx(x), tx(y));
  const bAt = (a, b) => (a < 0 || b < 0 || a >= GW || b >= GH) ? -1 : (W.bIndex ? W.bIndex[b * GW + a] : -1);

  // ---------------- I TIPI: ore, capienza, chi ci sta, come ci si dispone ----------------
  // who: filtro per il riempimento (popolo.js): any, old, young, m, f, adult, shop. pose: la posa di chi sta lì (anim_vita.js;
  // _su: solo le braccia). lay: la disposizione (cerchio attorno al punto, riga davanti a un muro, banco col venditore).
  const TIPI = {
    dehors:    { h: [[7.5, 25]], cap: 4, who: 'adult', pose: 'siede', lay: 'cerchio', r: .95, dens: 1 },
    pensilina: { h: [[6.5, 23]], cap: 4, who: 'any', pose: 'aspetta', lay: 'riga', r: 1.1, dens: .9 },
    fermata:   { h: [[6.5, 22]], cap: 3, who: 'any', pose: 'aspetta', lay: 'riga', r: 1.1, dens: .6 },
    panchina:  { h: [[7.5, 23]], cap: 3, who: 'old', pose: 'siede', lay: 'riga', r: .85, dens: 1 },
    angolo:    { h: [[16, 27]], cap: 4, who: 'young', pose: 'appoggiato', lay: 'cerchio', r: 1, dens: 1 },
    retrobottega: { h: [[6.5, 11.5], [18, 22]], cap: 3, who: 'm', pose: 'raccoglie', lay: 'riga', r: 1.2, dens: .7 },
    facciata_in_riparazione: { h: [[8, 18]], cap: 2, who: 'm', pose: 'martella', lay: 'riga', r: 1.3, dens: 1 },
    lotto_vuoto: { h: [[9, 20]], cap: 4, who: 'young', pose: 'aspetta', lay: 'cerchio', r: 1.6, dens: .6 },
    fuoco:     { h: [[17.5, 27]], cap: 4, who: 'm', pose: 'scalda', lay: 'cerchio', r: 1.3, dens: 1 },
    porta_della_citta: { h: [[0, 24]], cap: 3, who: 'cop', pose: 'aspetta', lay: 'riga', r: 1.4, dens: .3 },
    mercato:   { h: [[6.5, 13.5]], cap: 4, who: 'any', pose: 'merce', lay: 'banco', r: 1.3, giorni: [0, 1, 2, 3, 4, 5], dens: 1.2 },   // il mercato coperto: tutte le mattine, la domenica no
    sagrato:   { h: [[7, 21]], cap: 4, who: 'old', pose: 'aspetta', lay: 'cerchio', r: 1.1, dens: .8 },
    calata:    { h: [[5, 12], [16, 19]], cap: 3, who: 'm', pose: 'lavora', lay: 'riga', r: 1.3, dens: 1 },
    portone:   { h: [[8, 22]], cap: 2, who: 'f', pose: 'braccia_su', lay: 'riga', r: .9, dens: .9 },
    vetrina:   { h: [[8.5, 20.5]], cap: 2, who: 'any', pose: 'osserva', lay: 'riga', r: 1, dens: .8 },
    edicola:   { h: [[6, 20]], cap: 3, who: 'adult', pose: 'legge_su', lay: 'riga', r: 1, dens: .8 },
    stenditoio: { h: [[9, 12], [16, 18.5]], cap: 2, who: 'f', pose: 'lavora', lay: 'riga', r: 1, dens: .7, tetto: true },
    // [mappa_compatta] i tipi nuovi della città compatta (MAPPA_COMPATTA.md sez. 6)
    cypher:    { h: [[20, 26]], cap: 8, who: 'young', pose: 'appoggiato', lay: 'cerchio', r: 1.8, dens: 1 },   // il cerchio dei ragazzi attorno alla grata del vapore
    fila:      { h: [[6, 9]], cap: 6, who: 'any', pose: 'aspetta', lay: 'riga', r: .8, dens: 1 },             // la coda del pane e della tessera
    carico:    { h: [[5, 11]], cap: 4, who: 'm', pose: 'raccoglie', lay: 'riga', r: 1.3, dens: 1 },           // casse e sacchi allo Scalo e ai carri merci
    banco_pesce: { h: [[5, 12]], cap: 4, who: 'any', pose: 'merce', lay: 'banco', r: 1.3, dens: 1.2 },      // il banco davanti alla pescheria
    parata:    { h: [[10.5, 12.5]], cap: 8, who: 'any', pose: 'aspetta', lay: 'riga', r: 1, giorni: [6], dens: 1 },   // la domenica: la folla ai bordi della Vittoria
  };
  // le botteghe dove si beve e si mangia, e quelle con la vetrina
  const BARS = /^(bar|sirena|osteria|osteria_sg|car_2|gelateria|chiosco)$/, BARUSE = /^(pub|circolo|bar|trattoria|gelateria|osteria)$/;
  const SHOPUSE = /^(wu|panetteria|pescheria|tabacchi|macelleria|fruttivendolo|emporio|ferramenta|barbiere|farmacia|lavanderia|tipografia|sartoria|abbigliamento|armeria|autorimessa|fiori|video|alimentari)$/;
  const isBar = b => !!b && !b.shack && (BARS.test(b.id || '') || BARUSE.test(b.use || ''));
  const isShop = b => !!b && !b.shack && !isBar(b) && (SHOPUSE.test(b.use || '') || SHOPUSE.test(b.id || '') || (b.shop && b.use !== 'ufficio' && b.use !== 'teatro' && b.use !== 'scuola' && b.use !== 'palestra'));
  // la porta: la casella fuori, e la direzione dalla casa verso fuori
  function doorOf(b) {
    if (!b || !b.door) return null; const [dx, dy] = b.door;
    const o = dx < b.x ? [-1, 0] : dx >= b.x + b.w ? [1, 0] : dy < b.y ? [0, -1] : [0, 1];
    return { tx: dx, ty: dy, ox: o[0], oy: o[1], fx: -o[1], fy: o[0] };   // f: lungo la facciata
  }

  // ---------------- LA ZONA ----------------
  const RD = id => (W.roads || []).find(r => r.id === id);
  function distRoad(rd, x, y) { if (!rd || !rd.pts) return 1e9; let d = 1e9; for (let k = 0; k < rd.pts.length; k += 2) d = Math.min(d, hyp(rd.pts[k][0] - x, rd.pts[k][1] - y)); return d; }
  const FORTX = W.FORT ? W.FORT.x : (W.WALL ? W.WALL.x : 1e9), SPIAN = W.WALL ? W.WALL.x - 25 : 1e9;
  function zonaAt(x, y) {
    if (x >= FORTX) return 'rocca';
    if (x >= SPIAN) return 'spianata';
    const bi = nearestB(x, y, 8), b = bi >= 0 ? B[bi] : null;
    const vit = RD('vittoria'); if (vit && distRoad(vit, x, y) < 9 && !(b && hyp(cx(b.x) + (b.w - 1) * TS / 2 - x, cx(b.y) + (b.h - 1) * TS / 2 - y) < (b.w + b.h) * TS / 2 + 1.5)) return 'vittoria';   // in mezzo alla strada sorvegliata; sotto le case no
    if (b && b.shack) return 'baracche';
    if (b && b.era === 'E2') return 'marina';
    if (b && (b.era === 'E0' || b.era === 'E4')) return 'borgo';
    if (b && b.era === 'E3') return 'ottocento';
    if (b && (b.era === 'E6' || b.era === 'E7')) return 'boom';
    if (vit) { const corso = RD('corso'), via = RD('via_governo') || null, vp = RD('via_porto'); if (corso && x > corso.pts[0][0] + 20) return y > (W.sets ? 370 : 1e9) ? 'marina' : 'borgo';
      if (via && x < via.pts[0][0] + 10) return 'boom'; if (!via && vp && distRoad(vp, x, y) < 12) return 'boom';   // [mappa_compatta] il boom resta solo nell'angolo della Via del Porto
      return 'ottocento'; }
    return 'centro';
  }
  function nearestB(x, y, r) { let best = -1, bd = r * r; const a = tx(x), b0 = tx(y), R = Math.ceil(r / TS); for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) { const bi = bAt(a + i, b0 + j); if (bi < 0) continue; const d = (i * TS) ** 2 + (j * TS) ** 2; if (d < bd) { bd = d; best = bi; } } return best; }
  const DENS = { borgo: 1, marina: 1, ottocento: 1, boom: .8, baracche: 1.2, vittoria: .15, spianata: .1, rocca: 0, centro: .8 };   // [mappa_compatta] più gente per m²: ottocento .7→1, boom .5→.8, baracche .6→1,2; la Vittoria resta vuota

  // ---------------- LA COSTRUZIONE ----------------
  let ALL = null, BYK = null, GRID = null;
  const CELL = 24;
  function build() {
    const out = [], seen = []; let nid = 0;
    const far = (x, y, k, d) => !seen.some(q => q.k === k && hyp(q.x - x, q.y - y) < d);
    const add = (k, x, y, dir, extra) => {
      if (!(x > 0 && y > 0)) return null; const D = TIPI[k], p = Object.assign({ id: k + '_' + (nid++), k, x, y, dir, cap: D.cap, h: D.h, giorni: D.giorni }, extra || {});
      p.zona = zonaAt(x, y); out.push(p); seen.push(p); return p;
    };
    // la casella libera più vicina a un punto (per stare), entro r caselle
    const freeNear = (x, y, r) => { let best = null, bd = 1e9; const a = tx(x), b0 = tx(y); for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { if (!standT(a + i, b0 + j)) continue; const d = i * i + j * j; if (d < bd) { bd = d; best = [a + i, b0 + j]; } } return best; };
    const dirTo = (x, y, X, Y) => Math.atan2(Y - y, X - x);

    // --- dehors: davanti ai bar, ai lati della porta, sul marciapiede (mai in carreggiata) ---
    B.forEach((b, bi) => {
      if (!isBar(b)) return; const d = doorOf(b); if (!d) return;
      for (const side of [-1, 1]) {
        const cells = [];
        for (let k = 1; k <= 2; k++) for (let o = 0; o <= 1; o++) { const a = d.tx + d.fx * k * side + d.ox * o, c = d.ty + d.fy * k * side + d.oy * o; if (standT(a, c) && bAt(a, c) < 0) cells.push([a, c]); }
        if (cells.length < 2) continue;
        const mx = cells.reduce((s, q) => s + cx(q[0]), 0) / cells.length, my = cells.reduce((s, q) => s + cx(q[1]), 0) / cells.length;
        add('dehors', mx, my, Math.atan2(d.oy, d.ox), { bi, uso: b.use || b.id, nome: b.name || b.label });
      }
    });
    // le piazzette col bar (scenografie dei nodi): i tavolini sul lato della piazzetta
    (W.sets || []).forEach(s => { if (s.k !== 'piazzetta' || !s.bar) return; for (let k = 0; k < 2; k++) { const a = PI * .25 + k * PI, q = freeNear(s.x + Math.cos(a) * s.r * .6, s.y + Math.sin(a) * s.r * .6, 2); if (q) add('dehors', cx(q[0]), cx(q[1]), dirTo(cx(q[0]), cx(q[1]), s.x, s.y), { set: 'piazzetta' }); } });

    // --- pensiline e fermate: sulle vie della città (≥ 7 m), ogni ~75 m, sul marciapiede, rivolte alla strada ---
    const CITYROADS = (W.roads || []).filter(rd => rd.pts && !rd.monte && rd.w >= 7 && (rd.kind === 'citta' || (rd.kind === 'litoranea' && rd.era)));
    CITYROADS.forEach(rd => {
      const P = rd.pts, cum = [0]; for (let k = 1; k < P.length; k++) cum.push(cum[k - 1] + hyp(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]));
      const L = cum[cum.length - 1], step = 75, n = Math.max(1, Math.floor(L / step)), off = (hash2(P[0][0] | 0, P[0][1] | 0, 5) * .6 + .2) * step;
      for (let i = 0; i < n; i++) {
        const s = off + i * step; if (s > L - 10) break; let k = 1; while (k < cum.length - 1 && cum[k] < s) k++;
        const t = (s - cum[k - 1]) / ((cum[k] - cum[k - 1]) || 1), x = P[k - 1][0] + (P[k][0] - P[k - 1][0]) * t, y = P[k - 1][1] + (P[k][1] - P[k - 1][1]) * t;
        const ang = Math.atan2(P[k][1] - P[k - 1][1], P[k][0] - P[k - 1][0]), nx = -Math.sin(ang), ny = Math.cos(ang);
        let best = null; for (const sd of [1, -1]) { for (const o of [1.2, 2.2]) { const qx = x + nx * sd * (rd.w / 2 + o), qy = y + ny * sd * (rd.w / 2 + o); if (standM(qx, qy) && tile(tx(qx), tx(qy)) !== T.COB) { best = { qx, qy, sd }; break; } } if (best) break; }
        if (!best) continue;
        const k2 = /^(corso|via_alta|via_porto)$/.test(rd.id) ? 'pensilina' : 'fermata';
        if (far(best.qx, best.qy, k2, 40)) add(k2, best.qx, best.qy, Math.atan2(-ny * best.sd, -nx * best.sd), { rd: rd.id, via: rd.name });
      }
    });

    // --- panchine: ai bordi delle piazze e dei giardini, sul lungomare verso il mare ---
    const benchAt = (X, Y, R, nmax, faceTo) => {
      const cand = []; const a0 = tx(X), b0 = tx(Y), RT = Math.ceil(R / TS);
      for (let j = -RT; j <= RT; j++) for (let i = -RT; i <= RT; i++) {
        const a = a0 + i, c = b0 + j, x = cx(a), y = cx(c), dd = hyp(x - X, y - Y); if (dd > R || !standT(a, c)) continue;
        const v = tile(a, c); if (v !== T.PIAZZA && v !== T.WALK && v !== T.COB && v !== T.GRASS && v !== T.QUAY && v !== T.DIRT) continue;
        let edge = 0, water = 0, road = 0, wx = 0, wy = 0;
        for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const u = tile(a + ox, c + oy); if (u === T.VIA) road++; else if (!G.walkT(a + ox, c + oy) || u === T.TREE) { edge++; wx += ox; wy += oy; if (u === T.WATER) water++; } }
        if (road || edge === 0 || edge > 2) continue;
        cand.push({ x, y, s: (water ? 2 : 1) + (edge === 1 ? .3 : 0) - dd / R * .5 + hash2(a, c, 9) * .2, face: water ? Math.atan2(wy, wx) : faceTo ? dirTo(x, y, faceTo.x, faceTo.y) : Math.atan2(-wy, -wx) });
      }
      cand.sort((p, q) => q.s - p.s); const got = [];
      for (const q of cand) { if (got.length >= nmax) break; if (got.some(g => hyp(g.x - q.x, g.y - q.y) < 7) || !far(q.x, q.y, 'panchina', 7)) continue; got.push(q); add('panchina', q.x, q.y, q.face, { luogo: 'piazza' }); }
    };
    ['piazza', 'piazzetta', 'giardini', 'lungomare', 'passeggiata', 'belvedere', 'fontana', 'marina', 'piazza_gov'].forEach(id => { const p = PL[id]; if (p) benchAt(p.x, p.y, 13, 3, p); });
    (W.sets || []).forEach(s => { if (s.k === 'mercato') benchAt(s.x, s.y, s.r + 2, 3, s); if (s.k === 'sagrato' || s.k === 'marina') benchAt((s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2, Math.max(s.x1 - s.x0, s.y1 - s.y0) / 2 + 2, 2, null); });
    { const lm = RD('via_porto'); if (lm && lm.pts) for (let k = 2; k < lm.pts.length - 2; k += 10) { const [x, y] = lm.pts[k], [x1, y1] = lm.pts[k + 1], ang = Math.atan2(y1 - y, x1 - x), nx = -Math.sin(ang), ny = Math.cos(ang);
      for (const sd of [1, -1]) { const qx = x + nx * sd * (lm.w / 2 + 1.5), qy = y + ny * sd * (lm.w / 2 + 1.5), sea = tile(tx(qx + nx * sd * 6), tx(qy + ny * sd * 6)) === T.WATER || tile(tx(qx + nx * sd * 10), tx(qy + ny * sd * 10)) === T.WATER; if (sea && standM(qx, qy) && far(qx, qy, 'panchina', 30)) add('panchina', qx, qy, Math.atan2(ny * sd, nx * sd), { luogo: 'lungomare' }); } } }

    // --- angoli: dove un vicolo sbuca su una via o una piazza ---
    (W.roads || []).filter(rd => rd.kind === 'vicolo' && rd.pts && rd.pts.length > 2).forEach(rd => {
      [rd.pts[0], rd.pts[rd.pts.length - 1]].forEach((e, ei) => {
        const inn = ei ? rd.pts[rd.pts.length - 2] : rd.pts[1], ang = Math.atan2(e[1] - inn[1], e[0] - inn[0]);
        // davanti allo sbocco c'è una via larga o una piazza?
        let big = null; for (let d = 1; d <= 4 && !big; d++) { const qx = e[0] + Math.cos(ang) * d * TS, qy = e[1] + Math.sin(ang) * d * TS, v = tile(tx(qx), tx(qy)); if (v === T.VIA || v === T.WALK || v === T.PIAZZA || (v === T.COB && roadW(tx(qy) * GW + tx(qx)) > rd.w + 1)) big = { qx, qy }; }
        if (!big) return;
        // il posto: la casella del vicolo appena dentro lo sbocco, contro un muro
        let spot = null; for (let d = .5; d <= 3 && !spot; d += .5) { const qx = e[0] - Math.cos(ang) * d * TS, qy = e[1] - Math.sin(ang) * d * TS; if (standM(qx, qy) && tile(tx(qx), tx(qy)) !== T.VIA) spot = { qx, qy }; }
        if (!spot || !far(spot.qx, spot.qy, 'angolo', 9)) return;
        add('angolo', spot.qx, spot.qy, ang, { rd: rd.id, vicolo: rd.name });
      });
    });

    // --- retrobotteghe: il vicolo dietro una bottega (il lato opposto alla porta), per il carico-scarico ---
    B.forEach((b, bi) => {
      if (!(isShop(b) || isBar(b))) return; const d = doorOf(b); if (!d) return;
      const faces = [[-d.ox, -d.oy], [d.fx, d.fy], [-d.fx, -d.fy]];   // retro, poi i fianchi
      for (const [ox, oy] of faces) {
        const cells = [];
        for (let i = 0; i < (ox ? b.h : b.w); i++) { const a = ox ? (ox > 0 ? b.x + b.w : b.x - 1) : b.x + i, c = oy ? (oy > 0 ? b.y + b.h : b.y - 1) : b.y + i; const v = tile(a, c); if (standT(a, c) && bAt(a, c) < 0 && v !== T.WALK && v !== T.PIAZZA) cells.push([a, c]); }
        if (cells.length < 2) continue;
        const m = cells[Math.floor(cells.length / 2)], x = cx(m[0]) + ox * .4, y = cx(m[1]) + oy * .4;
        if (!far(x, y, 'retrobottega', 10)) break;
        add('retrobottega', x, y, Math.atan2(-oy, -ox), { bi, uso: b.use || b.id, nome: b.name || b.label }); break;
      }
    });

    // --- facciate in riparazione: 3 in città, nei vicoli del borgo, sul lato di un vicolo (mai la porta) ---
    { const cand = [];
      B.forEach((b, bi) => {
        if (!b.era || b.shack || b.fl < 2 || !(b.era === 'E0' || b.era === 'E2' || b.era === 'E3')) return; const d = doorOf(b); if (!d) return;
        for (const [ox, oy] of [[d.fx, d.fy], [-d.fx, -d.fy], [-d.ox, -d.oy]]) {
          const len = ox ? b.h : b.w; if (len < 3) continue; const i = Math.floor(len / 2), a = ox ? (ox > 0 ? b.x + b.w : b.x - 1) : b.x + i, c = oy ? (oy > 0 ? b.y + b.h : b.y - 1) : b.y + i;
          if (!standT(a, c) || bAt(a, c) >= 0 || tile(a, c) !== T.COB || !standT(a + ox, c + oy)) continue;
          cand.push({ bi, x: cx(a) + ox * .35, y: cx(c) + oy * .35, dir: Math.atan2(-oy, -ox), h: hash2(a, c, 31) }); break;
        }
      });
      cand.sort((p, q) => p.h - q.h); let n = 0;
      for (const q of cand) { if (n >= 3) break; if (!far(q.x, q.y, 'facciata_in_riparazione', 60)) continue; add('facciata_in_riparazione', q.x, q.y, q.dir, { bi: q.bi, scala: true, lamiera: n % 2 === 0 }); n++; }
    }

    // --- lotti vuoti e fuochi: fra le baracche e nei vuoti chiusi dalle case, lontano dalle vie ---
    { const cand = [], shackN = (a, c) => { let n = 0; for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) { const bi = bAt(a + i, c + j); if (bi >= 0 && B[bi].shack) n++; } return n; };
      for (let c = 1; c < GH - 1; c += 2) for (let a = 1; a < GW - 1; a += 2) {
        const i = c * GW + a; if (zone(i) !== ZC) continue; const v = tile(a, c); if (!(v === T.DIRT || v === T.GRASS || v === T.COB || v === T.GRAVEL) || roadW(i) > 0) continue;
        let ok = true; for (let j = -1; j <= 1 && ok; j++) for (let k = -1; k <= 1 && ok; k++) { const u = tile(a + k, c + j); if (!G.walkT(a + k, c + j) || u === T.VIA || u === T.WALK) ok = false; }
        if (!ok) continue;
        let via = false; for (let j = -3; j <= 3 && !via; j++) for (let k = -3; k <= 3 && !via; k++) if (tile(a + k, c + j) === T.VIA) via = true; if (via) continue;
        const sh = shackN(a, c); let walls = 0; for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let d = 1; d <= 6; d++) if (bAt(a + ox * d, c + oy * d) >= 0) { walls++; break; }
        if (sh < 2 && walls < 3) continue;
        cand.push({ x: cx(a), y: cx(c), sh, s: sh * 2 + walls + hash2(a, c, 77) });
      }
      cand.sort((p, q) => q.s - p.s); const got = [];
      for (const sep of [16, 11]) for (const q of cand) { if (got.length >= 12) break; if (got.some(g => hyp(g.x - q.x, g.y - q.y) < sep)) continue; got.push(q); }
      // [mappa_compatta] nella città compatta le baracche sono poche: i fuochi restano 3-5, ma almeno due lotti restano vuoti per i ragazzi
      const nF = Math.max(3, Math.min(5, got.length - 2));
      got.forEach((q, i) => add(i < nF ? 'fuoco' : 'lotto_vuoto', q.x, q.y, hash2(q.x | 0, q.y | 0, 3) * 6.283, { baracche: q.sh }));
    }

    // --- le porte della città: la Porta di Terra della Rocca, il varco del Muro, i capi della Vittoria, il passaggio della ferrovia, la scala dei pescatori ---
    { const gate = (x, y, dir, nome) => { const q = freeNear(x, y, 4); if (q && far(cx(q[0]), cx(q[1]), 'porta_della_citta', 14)) add('porta_della_citta', cx(q[0]), cx(q[1]), dir, { nome }); };
      if (W.FORT && W.FORT.gates) W.FORT.gates.forEach(g => { if (g.kind === 'terra') gate(g.x - 5, g.y, 0, 'Porta di Terra'); });
      if (W.WALL && W.WALL.gate) gate(W.WALL.x - 4, (W.WALL.gate[0] + W.WALL.gate[1]) / 2, 0, 'il varco del Muro');
      if (PL.varco) gate(PL.varco.x - 4, PL.varco.y, 0, 'il varco');
      const vit = RD('vittoria'); if (vit && vit.pts) { const a = vit.pts[0], z = vit.pts[vit.pts.length - 1]; gate(a[0] + 4, a[1] - vit.w / 2 - 1.5, 0, 'l\'imbocco della Vittoria'); gate(z[0] - 6, z[1] - vit.w / 2 - 1.5, PI, 'il sottoportico della Vittoria'); }
      const va = RD('via_alta'); if (va && va.pts && W.railCity) { let best = null, bd = 1e9; va.pts.forEach(p => W.railCity.forEach(r => { const d = hyp(p[0] - r[0], p[1] - r[1]); if (d < bd) { bd = d; best = p; } })); if (best && bd < 6) gate(best[0] + 3, best[1] + 5, -PI / 2, 'il passaggio a livello'); }
      // le scale: gruppi di gradini in città (la scala dei pescatori che sale dalla marina)
      const st2 = []; for (let c = 1; c < GH - 1; c++) for (let a = 1; a < GW - 1; a++) if (tile(a, c) === T.STAIRS && zone(c * GW + a) === ZC) st2.push([a, c]);
      const grp = []; st2.forEach(([a, c]) => { const g = grp.find(q => hyp(q.a - a, q.c - c) < 5); if (g) { g.n++; g.a = (g.a * (g.n - 1) + a) / g.n; g.c = (g.c * (g.n - 1) + c) / g.n; } else grp.push({ a, c, n: 1 }); });
      grp.filter(g => g.n >= 3).sort((p, q) => q.n - p.n).slice(0, 3).forEach(g => { const q = freeNear(cx(g.a), cx(g.c) + 3, 3); if (q && far(cx(q[0]), cx(q[1]), 'porta_della_citta', 14)) add('porta_della_citta', cx(q[0]), cx(q[1]), Math.atan2(cx(g.c) - cx(q[1]), cx(g.a) - cx(q[0])), { nome: 'la scala dei pescatori', scala: true }); });
    }

    // --- il mercato: i banchi in cerchio sotto la tettoia (venditore dietro, rivolto fuori; i clienti davanti) ---
    (W.sets || []).forEach(s => { if (s.k !== 'mercato') return; const n = 8; for (let k = 0; k < n; k++) { const a = k / n * 2 * PI + PI / n, r = s.r * .55, x = s.x + Math.cos(a) * r, y = s.y + Math.sin(a) * r; const q = standM(x, y) ? [tx(x), tx(y)] : freeNear(x, y, 1); if (q) add('mercato', cx(q[0]), cx(q[1]), a, { banco: k, set: 'mercato' }); } });
    if (!(W.sets || []).some(s => s.k === 'mercato') && PL.piazza) { const s = PL.piazza; for (let k = 0; k < 6; k++) { const a = k / 6 * 2 * PI, q = freeNear(s.x + Math.cos(a) * 6, s.y + Math.sin(a) * 6, 1); if (q) add('mercato', cx(q[0]), cx(q[1]), a, { banco: k }); } }

    // --- il sagrato: davanti alla chiesa ---
    (W.sets || []).forEach(s => { if (s.k !== 'sagrato') return; const ch = PL.chiesa || { x: (s.x0 + s.x1) / 2, y: s.y0 }; for (let k = 0; k < 3; k++) { const x = s.x0 + (s.x1 - s.x0) * (k + .5) / 3, y = (s.y0 + s.y1) / 2 + 2, q = freeNear(x, y, 2); if (q) add('sagrato', cx(q[0]), cx(q[1]), dirTo(cx(q[0]), cx(q[1]), ch.x, ch.y), { set: 'sagrato' }); } });
    if (!(W.sets || []).some(s => s.k === 'sagrato') && PL.chiesa) { const c = PL.chiesa; for (let k = -1; k <= 1; k++) { const q = freeNear(c.x + k * 4, c.y + 5, 2); if (q) add('sagrato', cx(q[0]), cx(q[1]), dirTo(cx(q[0]), cx(q[1]), c.x, c.y), {}); } }

    // --- la calata: sul bordo della banchina, ogni 12 m, rivolti al mare ---
    (W.sets || []).forEach(s => { if (s.k !== 'calata') return;
      for (let x = s.x0 + 6; x < s.x1; x += 12) { const a = tx(x); let edge = null; for (let c = tx(360); c < GH - 1 && !edge; c++) { const v = tile(a, c); if (v === T.QUAY && tile(a, c + 1) === T.WATER) edge = c; if (v === T.WATER && c > tx(380)) break; }
        if (edge === null || !standT(a, edge)) continue; add('calata', cx(a), cx(edge) + .35, PI / 2, { set: 'calata' }); } });
    if (!(W.sets || []).some(s => s.k === 'calata') && PL.calata) { const c = PL.calata; for (let k = -2; k <= 2; k++) { const q = freeNear(c.x + k * 8, c.y + 2, 2); if (q && tile(q[0], q[1]) === T.QUAY) add('calata', cx(q[0]), cx(q[1]), PI / 2, {}); } }

    // --- portoni: l'androne delle case (chi aspetta, chi chiacchiera), uno su tre, a distanza ---
    B.forEach((b, bi) => {
      if (!b.house || b.shack || (b.fl || 1) < 2 || isBar(b) || isShop(b) || !(b.era === 'E0' || b.era === 'E2' || b.era === 'E3' || !b.era)) return; const d = doorOf(b); if (!d) return;
      if (hash2(b.x, b.y, 41) > .36 || !standT(d.tx, d.ty) || tile(d.tx, d.ty) === T.PIAZZA) return;
      const x = cx(d.tx), y = cx(d.ty); if (!far(x, y, 'portone', 12)) return;
      add('portone', x - d.ox * .3, y - d.oy * .3, Math.atan2(d.oy, d.ox), { bi, nome: b.label || b.name });
    });

    // --- vetrine: accanto al portone della bottega (b.shopFront se c'è, altrimenti la casella lungo la facciata) ---
    B.forEach((b, bi) => {
      if (!(isShop(b) || isBar(b))) return; const d = doorOf(b); if (!d) return;
      let a = null, c = null; const sf = b.shopFront;
      if (sf) { const q = Array.isArray(sf) ? sf : sf.tile || (sf.tx !== undefined ? [sf.tx, sf.ty] : sf.x !== undefined && sf.x < GW ? [sf.x, sf.y] : null); if (q && standT(q[0], q[1])) { a = q[0]; c = q[1]; } else if (q && standT(q[0] + d.ox, q[1] + d.oy)) { a = q[0] + d.ox; c = q[1] + d.oy; } }
      if (a === null) for (const sd of [1, -1]) { const qa = d.tx + d.fx * sd, qc = d.ty + d.fy * sd; if (standT(qa, qc) && bAt(qa, qc) < 0 && bAt(qa - d.ox, qc - d.oy) === bi) { a = qa; c = qc; break; } }
      if (a === null) return;
      add('vetrina', cx(a) - d.ox * .25, cx(c) - d.oy * .25, Math.atan2(-d.oy, -d.ox), { bi, uso: b.use || b.id, nome: b.name || b.label });
    });

    // --- edicole: al Mercato, alla Stazione, sul Corso ---
    { const pts = []; const mk = (W.sets || []).find(s => s.k === 'mercato'); if (mk) pts.push([mk.x - mk.r - 3, mk.y, 'Mercato']);
      const va = RD('via_alta'); if (va && va.pts) { const p = va.pts[Math.min(6, va.pts.length - 1)], q = va.pts[Math.min(7, va.pts.length - 1)], ang = Math.atan2(q[1] - p[1], q[0] - p[0]); pts.push([p[0] - Math.sin(ang) * (va.w / 2 + 2), p[1] + Math.cos(ang) * (va.w / 2 + 2), 'Stazione']); }
      const co = RD('corso'); if (co && co.pts) { const p = co.pts[Math.floor(co.pts.length / 2)], q = co.pts[Math.floor(co.pts.length / 2) + 1], ang = Math.atan2(q[1] - p[1], q[0] - p[0]); pts.push([p[0] + Math.sin(ang) * (co.w / 2 + 2), p[1] - Math.cos(ang) * (co.w / 2 + 2), 'Corso']); }
      if (!pts.length && PL.piazza) pts.push([PL.piazza.x + 5, PL.piazza.y - 4, 'Piazza']);
      pts.forEach(([x, y, nome]) => { const q = freeNear(x, y, 3); if (!q) return; let dir = 0; for (let d = 1; d <= 4; d++) for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (tile(q[0] + ox * d, q[1] + oy * d) === T.VIA) dir = Math.atan2(oy, ox); add('edicola', cx(q[0]), cx(q[1]), dir, { nome }); });
    }

    // --- [mappa_compatta] i posti nuovi della città compatta ---
    { const pzT = t => (W.pezzi || []).filter(q => q.tipo === t), setK = k => (W.sets || []).find(q => q.k === k);
      const davantiA = (b, n, k, ex) => { const d = doorOf(b); if (!d) return; for (let j = 1; j <= 3; j++) { const a = d.tx + d.ox * j, c = d.ty + d.oy * j; if (!standT(a, c)) continue; add(k, cx(a), cx(c), Math.atan2(-d.oy, -d.ox), Object.assign({ bi: B.indexOf(b), nome: b.name || b.label }, ex || {})); return; } };
      // il cypher: alla grata del vapore fra le baracche, la sera (20-02)
      pzT('grata_vapore').forEach(g => { const q = freeNear(g.x + 2.5, g.y, 3); if (q) add('cypher', cx(q[0]), cx(q[1]), dirTo(cx(q[0]), cx(q[1]), g.x, g.y), { nome: 'la grata del vapore' }); });
      // la fila: davanti al forno della piazzetta e all'alimentari Wu (la tessera)
      { const fs = (W.sets || []).find(q => q.k === 'piazzetta' && q.forno); let fb = null, fd = 1e9; if (fs) B.forEach(b => { if (b.shack || !b.door || !(b.use === 'panetteria' || /forno/.test(b.id || ''))) return; const d = hyp(cx(b.x) - fs.x, cx(b.y) - fs.y); if (d < fd) { fd = d; fb = b; } });
        if (fb && fd < 40) davantiA(fb, 'fila', 'fila', { set: 'forno' }); else if (fs) { const q = freeNear(fs.x, fs.y + 2, 3); if (q) add('fila', cx(q[0]), cx(q[1]), 0, { set: 'forno' }); }
        const wu = B.find(b => b.id === 'wu' || b.use === 'wu'); if (wu) davantiA(wu, 'fila', 'fila', { nome: 'la tessera da Wu' }); }
      // il carico: lo Scalo dell'officina e i carri merci sul tronchino della stazione
      { const sc = setK('scalo'); if (sc) { const q = freeNear((sc.x0 + sc.x1) / 2, (sc.y0 + sc.y1) / 2, 4); if (q) add('carico', cx(q[0]), cx(q[1]), PI / 2, { set: 'scalo' }); }
        pzT('carro_merci').forEach(c => { for (const dy of [4, -4, 6, -6]) { const q = freeNear(c.x, c.y + dy, 2); if (q) { add('carico', cx(q[0]), cx(q[1]), dirTo(cx(q[0]), cx(q[1]), c.x, c.y), { nome: 'lo scalo merci' }); break; } } }); }
      // il banco del pesce: davanti alla pescheria (o sulla Piazza della Marina)
      { const pe = B.find(b => b.use === 'pescheria' && !b.shack); if (pe) davantiA(pe, 'banco_pesce', 'banco_pesce');
        if (!pe || !seen.some(q => q.k === 'banco_pesce')) { const m = setK('marina'); if (m) { const q = freeNear((m.x0 + m.x1) / 2, (m.y0 + m.y1) / 2, 3); if (q) add('banco_pesce', cx(q[0]), cx(q[1]), PI / 2, { set: 'marina' }); } } }
      // la parata: la domenica la folla sui due marciapiedi della Vittoria, a un terzo e a due terzi
      { const vit = RD('vittoria'); if (vit && vit.pts && vit.pts.length > 3) [.33, .66].forEach(f => { const k = Math.floor((vit.pts.length - 1) * f), p0 = vit.pts[k], p1 = vit.pts[k + 1], L = hyp(p1[0] - p0[0], p1[1] - p0[1]) || 1, nx = -(p1[1] - p0[1]) / L, ny = (p1[0] - p0[0]) / L;
          [-1, 1].forEach(sd => { const q = freeNear(p0[0] + nx * sd * (vit.w / 2 + 1.5), p0[1] + ny * sd * (vit.w / 2 + 1.5), 2); if (q) add('parata', cx(q[0]), cx(q[1]), Math.atan2(-ny * sd, -nx * sd), { nome: 'la parata della Vittoria' }); }); }); }
    }

    // --- stenditoi sui tetti: le case basse del borgo, una su sei ---
    { const TT = typeof Tetti !== 'undefined' ? Tetti : null, MG = 3.1;
      B.forEach((b, bi) => {
        if (!(b.era === 'E0' || b.era === 'E2') || b.shack || b.torre || (b.fl || 1) > 3 || b.w * b.h < 6 || hash2(b.x, b.y, 53) > .16) return;
        const x = cx(b.x) + (b.w - 1) * TS / 2, y = cx(b.y) + (b.h - 1) * TS / 2;
        let h3 = null; if (TT && TT.roofH) { try { h3 = TT.roofH(bi, x, y); } catch (e) { h3 = null; } if (h3 === null && TT.roofRule) { try { h3 = TT.roofRule(b); } catch (e) { h3 = null; } } }
        if (h3 === null) h3 = (G.MAP.elev[tx(y) * GW + tx(x)] || 0) + (b.base || 0) + MG + ((b.fl || 1) - 1) * 2.8;
        add('stenditoio', x, y, hash2(b.x, b.y, 54) < .5 ? 0 : PI / 2, { bi, tetto: true, h3 });
      });
    }
    return out;
  }
  function all() {
    if (ALL) return ALL; ALL = build(); BYK = {}; GRID = new Map();
    ALL.forEach(p => { (BYK[p.k] = BYK[p.k] || []).push(p); const key = Math.floor(p.x / CELL) + ',' + Math.floor(p.y / CELL); (GRID.get(key) || GRID.set(key, []).get(key)).push(p); });
    return ALL;
  }
  const ofType = k => (all(), BYK[k] || []);
  // i posti entro r metri (del tipo k, o di uno dei tipi in un array), dal più vicino
  function near(x, y, r, k) {
    all(); const out = [], R = Math.ceil(r / CELL), a = Math.floor(x / CELL), b = Math.floor(y / CELL), ks = k ? (Array.isArray(k) ? k : [k]) : null;
    for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) { const L = GRID.get((a + i) + ',' + (b + j)); if (!L) continue; for (const p of L) { if (ks && !ks.includes(p.k)) continue; const d = hyp(p.x - x, p.y - y); if (d <= r) { p.__d = d; out.push(p); } } }
    return out.sort((p, q) => p.__d - q.__d);
  }
  // a quest'ora il posto è vivo? (t: minuti di gioco; alle > 24 vuol dire dopo mezzanotte)
  const hourOf = t => ((t / 60) % 24 + 24) % 24, weekday = t => (Math.floor(t / 1440) + 1) % 7;
  function inHours(h, hr) { if (!h) return true; const L = Array.isArray(h[0]) ? h : [h]; return L.some(([a, z]) => z > 24 ? (hr >= a || hr < z - 24) : (hr >= a && hr < z)); }
  function openAt(p, t) { if (!inHours(p.h, hourOf(t))) return false; if (p.giorni && !p.giorni.includes(weekday(t))) return false; return true; }
  // quanto è viva la zona (0..1.2): il borgo pieno, la Vittoria vuota e sorvegliata, il boom a metà, la marina la mattina
  function density(p, t) { let d = DENS[p.zona] !== undefined ? DENS[p.zona] : .8; const hr = hourOf(t); if (p.zona === 'marina' && hr >= 5 && hr < 12) d = 1.2; if (p.zona === 'boom' && hr >= 17 && hr < 22) d = .7; return d * (TIPI[p.k] ? TIPI[p.k].dens : 1); }

  // ---------------- LA DISPOSIZIONE: primo piano, quinte, fondale ----------------
  // n persone attorno al posto, leggibili dalla camera: la riga corre lungo lo schermo (da sud-ovest a nord-est), mai lungo
  // la visuale; attorno a un tavolo o a un fuoco si sta in cerchio ma a cavallo dell'asse dello schermo, così nessuno copre
  // nessuno; davanti a un muro (vetrina, retrobottega, facciata) in riga a mezzo metro, rivolti al muro; al banco il
  // venditore dietro e i clienti davanti. Ogni slot: { x, y, face }. Chi non ci sta (muro, carreggiata) si avvicina al punto.
  function slots(p, n, opt) {
    const D = TIPI[p.k] || {}, lay = (opt && opt.lay) || D.lay || 'cerchio', r = (opt && opt.r) || D.r || 1, out = [];
    const rt = camRight(), dx = Math.cos(p.dir), dy = Math.sin(p.dir);
    const fix = (x, y) => { if (standM(x, y)) return { x, y }; for (let f = .75; f >= .2; f -= .1) { const qx = p.x + (x - p.x) * f, qy = p.y + (y - p.y) * f; if (standM(qx, qy)) return { x: qx, y: qy }; } return { x: p.x, y: p.y }; };   // stretti attorno al punto
    if (lay === 'riga') {
      // la riga lungo la facciata (perpendicolare a dir), un passo indietro dal punto; se la facciata corre lungo la visuale
      // si sfalsa in profondità così le teste non si coprono
      const fx = -dy, fy = dx, along = Math.abs(fx * rt.x + fy * rt.y);   // 1: la riga corre lungo lo schermo (bene), 0: lungo la visuale
      for (let k = 0; k < n; k++) { const o = (k - (n - 1) / 2) * r, deep = along < .5 ? (k % 2 ? .5 : -.2) : 0, x = p.x + fx * o - dx * (.55 + deep), y = p.y + fy * o - dy * (.55 + deep); out.push(Object.assign(fix(x, y), { face: p.dir })); }
      return out;
    }
    if (lay === 'banco') {
      out.push(Object.assign(fix(p.x - dx * .3, p.y - dy * .3), { face: p.dir, banco: true }));   // il venditore, dietro il banco
      for (let k = 1; k < n; k++) { const o = (k - n / 2) * .9, x = p.x + dx * 1.3 - dy * o, y = p.y + dy * 1.3 + dx * o; out.push(Object.assign(fix(x, y), { face: p.dir + PI })); }
      return out;
    }
    // cerchio: il punto in mezzo, le persone a cavallo dell'asse dello schermo; con due, una per lato (di fronte);
    // con tre un semicerchio aperto verso la camera (il primo piano resta libero)
    const a0 = Math.atan2(rt.y, rt.x), N = Math.max(n, 2), span = n <= 3 ? PI * .9 : 2 * PI;
    for (let k = 0; k < n; k++) { const a = n <= 3 ? a0 + PI / 2 - span / 2 + span * (N === 1 ? .5 : k / (N - 1)) + PI : a0 + (k + .5) / N * 2 * PI; const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r; out.push(Object.assign(fix(x, y), { face: Math.atan2(p.y - y, p.x - x) })); }
    return out;
  }
  // per le prove e la mappa: conti per tipo
  function count() { const c = {}; all().forEach(p => c[p.k] = (c[p.k] || 0) + 1); return c; }
  return { TIPI, DENS, all, ofType, near, openAt, inHours, hourOf, weekday, density, slots, zonaAt, count, camDir, camRight, CAM, standM, isBar, isShop, doorOf, reset: () => { ALL = null; } };
})();
if (typeof module !== 'undefined') module.exports = Posti;
