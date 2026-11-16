// [strade3] LA SONDA DELLE STRADE COERENTI: i segni della strada contro le corsie e gli incroci che il guidatore usa davvero.
// Il guidatore unico (game.js Guida) va sui binari delle corsie di G.LANES (la corsia di destra, a w/4 dall'asse della corsia, dopo che
// vievive le ha strette e spostate per la sosta) e svolta agli incroci sugli archi di LANES.conn. Qui si prende quel grafo e si guarda se
// la vernice e i cartelli (segnaletica.js, più i cartelli di render.js che la parte nel browser scrive in un file) dicono la stessa cosa:
//   zebra_*      le strisce pedonali: fuori da un incrocio e da una linea di desiderio (scuola, piazza, fermata), dentro il cuore di un
//                incrocio, storte rispetto alla via, non a filo dei cordoli, in curva, fuori dalla carreggiata;
//   arresto_*    la linea d'arresto: manca dove l'approccio ha lo STOP, il semaforo o deve dare la precedenza; dalla parte sbagliata (non
//                copre il binario di chi arriva o copre quello di chi va via); fuori posto (dentro l'incrocio, oltre la zebra, troppo indietro);
//   cartello_*   i cartelli: girati via dal traffico che regolano, sul lato sinistro di chi arriva (si guida a destra), che chiudono il
//                marciapiede (meno di 1 m libero), senza un traffico da regolare (un «senso unico» dove le corsie sono a doppio senso,
//                una fermata dove l'autobus non ferma), staccati dal loro segno;
//   segno_*      la vernice contro le corsie: la mezzeria fuori dalla separazione dei due binari, i margini e gli stalli dentro la sagoma
//                di chi passa, le frecce e le scritte contro il verso della corsia, le frecce che promettono svolte che non ci sono, lo
//                STOP e i triangoli fuori dalla corsia di chi arriva, il riquadro BUS dal lato sbagliato;
//   arredo_*     le fermate dal lato sbagliato per il verso dell'autobus.
// (le giunture del suolo e i salti di tono si misurano nel browser: strumenti/strade3_vista.js)
//   node strumenti/strade3_sonda.js [uscita.json] [cartelli_render.json]
// Stampa i conti per categoria; con l'uscita scrive i casi (x, y, cosa).
const path = require('path'), fs = require('fs');
const PI = Math.PI, hyp = Math.hypot, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), ad = (a, b) => { let d = a - b; while (d > PI) d -= 2 * PI; while (d < -PI) d += 2 * PI; return d; };

function carica(src) {
  src = path.resolve(src);
  globalThis.PV_STRADE2 = true;   // di serie nel gioco (index.src.html aggiunge ?strade2)
  if (process.env.STRADE3 === '0') globalThis.PV_STRADE3 = false;   // com'era (le strade di strade2 senza la coerenza col guidatore)
  const log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {};
  global.World = require(path.join(src, 'world_cittanuova.js')); global.Interior = require(path.join(src, 'interiors.js')); global.Game = require(path.join(src, 'game.js'));
  global.Chiarezza = require(path.join(src, 'chiarezza.js')); global.Vievive = require(path.join(src, 'vievive.js'));
  global.Scena = require(path.join(src, 'scena.js')); global.Rete = require(path.join(src, 'rete.js'));
  Scena.init(Game); Scena.piano(); Rete.init(Game, Scena);
  const SG = require(path.join(src, 'segnaletica.js')); SG.piano();
  console.log = log; console.warn = warn;
  return { G: Game, SG, VV: Vievive };
}

function sonda(ctx, extra) {
  const { G, SG, VV } = ctx, W = G.MAP.world, M = G.MAP, TS = G.TS, T = G.T, Gd = G.Guida, P = SG.piano(), C = SG.CORNICE;
  const inC = (x, y, m) => x >= C[0] - (m || 0) && x <= C[2] + (m || 0) && y >= C[1] - (m || 0) && y <= C[3] + (m || 0);
  const tile = (x, y) => G.tileAt(Math.floor(x / TS), Math.floor(y / TS));
  const casi = []; const caso = (k, x, y, cosa, o) => casi.push(Object.assign({ k, x: +(+x).toFixed(1), y: +(+y).toFixed(1), cosa }, o || {}));
  const ROADS = (M.roads || []).filter(rd => rd && rd.pts && rd.pts.length > 1);
  const RD = id => ROADS.find(r => r.id === id);
  const LANES = G.LANES, MEZZO = .85;   // la mezza sagoma di un'auto (1,7 m)
  // ---------------- le corsie del guidatore ----------------
  function projL(L, x, y) { let best = 1e18, bs = 0, bk = 0; const Pp = L.pts; for (let k = 0; k < Pp.length - 1; k++) { const ax = Pp[k][0], ay = Pp[k][1], dx = Pp[k + 1][0] - ax, dy = Pp[k + 1][1] - ay, l2 = dx * dx + dy * dy || 1e-12, t = clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1), d = hyp(ax + dx * t - x, ay + dy * t - y); if (d < best) { best = d; bs = L.cum[k] + t * Math.sqrt(l2); bk = k; } }
    const a = Pp[bk], b = Pp[bk + 1], ang = Math.atan2(b[1] - a[1], b[0] - a[0]), px = a[0] + (b[0] - a[0]) * ((bs - L.cum[bk]) / ((L.cum[bk + 1] - L.cum[bk]) || 1)), py = a[1] + (b[1] - a[1]) * ((bs - L.cum[bk]) / ((L.cum[bk + 1] - L.cum[bk]) || 1));
    const lat = (x - px) * -Math.sin(ang) + (y - py) * Math.cos(ang);   // + a sinistra della corsia nel verso delle s crescenti (la normale (-sin, cos)): nel mondo (y verso sud) è la DESTRA di chi va verso +s
    return { d: best, s: bs, ang, lat, x: px, y: py }; }
  // la corsia del guidatore più vicina a un punto (della stessa strada, se data)
  function laneDi(x, y, rd) { let best = null; LANES.forEach((L, i) => { if (rd && L.id !== rd.id) return; const q = projL(L, x, y); if (!best || q.d < best.q.d) best = { L, i, q }; }); return best; }
  // il punto del binario di chi va nel verso dir alla s (della linea centrale)
  function bin(L, dir, s) { const B = Gd.binario(L, dir); return Gd.at(B, Gd.sDaC(B, s)); }
  // ---------------- gli incroci del guidatore ----------------
  const NODI = [];
  const nodo = (x, y) => { let n = NODI.find(q => hyp(q.x - x, q.y - y) < 6); if (!n) { n = { x, y, arms: [], fine: [] }; NODI.push(n); } return n; };
  const addArm = (n, i, s, out) => { const L = LANES[i], a = G.laneAt(L, s), b = G.laneAt(L, clamp(s + out * 10, 0, L.L)), dx = b.x - a.x, dy = b.y - a.y, l = hyp(dx, dy) || 1, ux = dx / l, uy = dy / l;
    if (n.arms.some(q => q.i === i && q.ux * ux + q.uy * uy > .9)) return; n.arms.push({ i, s, out, ux, uy, w: L.w }); };
  LANES.forEach((A, i) => [0, 1].forEach(e => { if (!A.conn[e].length) return; const s = e ? A.L : 0, p = G.laneAt(A, s), n = nodo(p.x, p.y); n.fine.push(i); addArm(n, i, s, e ? -1 : 1);
    A.conn[e].forEach(o => { addArm(n, o.j, o.s, o.dir); }); }));
  // gli incroci a croce (due corsie che si attraversano senza finire): il guidatore passa dritto
  for (let i = 0; i < LANES.length; i++) for (let j = i + 1; j < LANES.length; j++) { const A = LANES[i], B = LANES[j];
    for (let a = 0; a < A.pts.length - 1; a++) { const a1 = A.pts[a], a2 = A.pts[a + 1]; for (let b = 0; b < B.pts.length - 1; b++) { const b1 = B.pts[b], b2 = B.pts[b + 1];
      if (Math.max(a1[0], a2[0]) < Math.min(b1[0], b2[0]) || Math.max(b1[0], b2[0]) < Math.min(a1[0], a2[0]) || Math.max(a1[1], a2[1]) < Math.min(b1[1], b2[1]) || Math.max(b1[1], b2[1]) < Math.min(a1[1], a2[1])) continue;
      const d1x = a2[0] - a1[0], d1y = a2[1] - a1[1], d2x = b2[0] - b1[0], d2y = b2[1] - b1[1], den = d1x * d2y - d1y * d2x; if (Math.abs(den) < 1e-9) continue;
      const t = ((b1[0] - a1[0]) * d2y - (b1[1] - a1[1]) * d2x) / den, u = ((b1[0] - a1[0]) * d1y - (b1[1] - a1[1]) * d1x) / den; if (t < 0 || t > 1 || u < 0 || u > 1) continue;
      const x = a1[0] + d1x * t, y = a1[1] + d1y * t, sa = A.cum[a] + t * hyp(d1x, d1y), sb = B.cum[b] + u * hyp(d2x, d2y), n = nodo(x, y);
      [[i, sa, A], [j, sb, B]].forEach(([k, s, L]) => { if (s > 3) addArm(n, k, s, -1); if (s < L.L - 3) addArm(n, k, s, 1); }); } } }
  NODI.forEach(n => { n.r = Math.max(...n.arms.map(a => a.w)) / 2 + 2; n.city = G.MAP.zone[Math.floor(n.y / TS) * G.GW + Math.floor(n.x / TS)] === M.Z.CITTA; });
  const nodiC = NODI.filter(n => inC(n.x, n.y) && n.arms.length >= 3);
  const nodoVicino = (x, y) => { let b = null, bd = 1e9; NODI.forEach(n => { const d = hyp(n.x - x, n.y - y) - n.r; if (d < bd) { bd = d; b = n; } }); return { n: b, d: bd }; };
  // il cuore dell'incrocio: dentro la carreggiata di almeno due corsie del nodo
  const cuore = (n, x, y) => n.arms.filter((a, k) => n.arms.findIndex(o => o.i === a.i) === k).filter(a => projL(LANES[a.i], x, y).d < LANES[a.i].w0 / 2 || projL(LANES[a.i], x, y).d < LANES[a.i].w / 2).length >= 2;
  const wC = L => Math.max(L.w, L.w0 || 0);   // la carreggiata intera (con la sosta)

  // ---------------- 1. LE ZEBRE ----------------
  const POI = [];   // le linee di desiderio: dove la gente attraversa per andare (la scuola, le piazze, le fermate)
  const sc = G.BUILDINGS.find(b => b.use === 'scuola' && b.door); if (sc) POI.push({ k: 'scuola', x: (sc.door[0] + .5) * TS, y: (sc.door[1] + .5) * TS });
  (W.sets || []).filter(q => /^(mercato|stazione|adunata|marina)$/.test(q.k)).forEach(q => POI.push({ k: 'piazza', x: q.x !== undefined ? q.x : (q.x0 + q.x1) / 2, y: q.y !== undefined ? q.y : (q.y0 + q.y1) / 2, box: q.x0 !== undefined ? [q.x0, q.y0, q.x1, q.y1] : null }));
  if (VV && VV.fermate) VV.fermate().forEach(f => POI.push({ k: 'fermata', x: f.x, y: f.y }));
  const dPOI = (x, y, k) => Math.min(...POI.filter(p => !k || p.k === k).map(p => p.box ? hyp(Math.max(p.box[0] - x, 0, x - p.box[2]), Math.max(p.box[1] - y, 0, y - p.box[3])) : hyp(p.x - x, p.y - y)), 1e9);
  const Z = (P.zebre || []).filter(z => z.bande > 0 && inC(z.x, z.y));
  const bande = P.strisce.filter(s => s.k === 'zebra');
  Z.forEach((z, zi) => {
    const J = nodoVicino(z.x, z.y), lv = laneDi(z.x, z.y, z.rd);
    if (z.motivo === 'incrocio') { if (!J.n || J.d > 8) caso('zebra_fuori_incrocio', z.x, z.y, `zebra d'incrocio a ${J.d.toFixed(1)} m dal più vicino incrocio dei mezzi`); }
    else { if (dPOI(z.x, z.y, z.motivo) > 30) caso('zebra_senza_desiderio', z.x, z.y, `zebra «${z.motivo}» a ${dPOI(z.x, z.y, z.motivo).toFixed(0)} m dalla sua ragione`); }
    if (J.n && cuore(J.n, z.x, z.y)) caso('zebra_nel_cuore', z.x, z.y, `zebra «${z.motivo}» nel cuore dell'incrocio (${J.n.x.toFixed(0)},${J.n.y.toFixed(0)})`);
    if (!lv) { caso('zebra_senza_traffico', z.x, z.y, 'zebra su una via dove non passa nessuna corsia'); return; }
    // le bande: perpendicolari alla via (il lato lungo lungo la via), da un cordolo all'altro, su un tratto dritto
    const mie = bande.filter(b => b.zebra === z.i);
    const sto = Math.max(...mie.map(b => Math.abs(Math.sin(ad(b.ang, lv.q.ang)))));
    if (sto > Math.sin(4 * PI / 180)) caso('zebra_storta', z.x, z.y, `le bande a ${(Math.asin(Math.min(1, sto)) * 180 / PI).toFixed(1)}° dalla via`);
    const rd = z.rd, Ln = SG.lin(rd), q = SG.lNear(Ln, z.x, z.y), a1 = SG.lAt(Ln, q.s - 2), a2 = SG.lAt(Ln, q.s + 2); if (Math.abs(ad(a2.ang, a1.ang)) > 6 * PI / 180) caso('zebra_in_curva', z.x, z.y, `la via gira di ${(Math.abs(ad(a2.ang, a1.ang)) * 180 / PI).toFixed(0)}° sotto la zebra`);
    const lat = mie.map(b => { const p = SG.lAt(Ln, SG.lNear(Ln, b.x, b.y).s); return (b.x - p.x) * -Math.sin(p.ang) + (b.y - p.y) * Math.cos(p.ang); });
    if (lat.length) { const lo = Math.min(...lat) - .25, hi = Math.max(...lat) + .25, mg = [lo + rd.w / 2, rd.w / 2 - hi];
      if (mg.some(m => m > .75 || m < -.05)) caso('zebra_non_a_filo', z.x, z.y, `dai cordoli ${mg.map(m => m.toFixed(2)).join(' e ')} m`); }
  });
  // gli incroci della città senza nessuna zebra (i bracci larghi, dove la gente attraversa): conto, non errore
  const incSenzaZebra = nodiC.filter(n => n.city && n.arms.filter(a => a.w >= 5).length >= 3 && !Z.some(z => hyp(z.x - n.x, z.y - n.y) < n.r + 12)).length;

  // ---------------- 2. GLI APPROCCI E LE LINEE D'ARRESTO ----------------
  const ARR = P.strisce.filter(s => s.k === 'riga' && s.arresto), STOPS = P.strisce.filter(s => s.k === 'stop'), TRI = P.strisce.filter(s => s.k === 'triangolo');
  const J1 = SG.junc1().filter(J => inC(J.x, J.y, 140));
  // per ogni braccio regolato di segnaletica (gli stessi incroci): il nodo del guidatore, la corsia, il binario di chi arriva
  const APP = [];
  J1.forEach(J => J.arms.forEach(a => {
    const regola = J.signal && a.w >= 7 && J.city ? 'semaforo' : a.minor && !J.signal ? (J.city || a.w >= 6.5 ? 'stop' : 'precedenza') : null; if (!regola) return;
    const N = nodoVicino(J.x, J.y), lv = LANES.map((L, i) => ({ L, i })).filter(o => o.L.id === a.rd.id);
    if (!N.n || N.d > 4 || !lv.length) { caso('arresto_incrocio_senza_traffico', J.x + a.ux * (J.r + 3), J.y + a.uy * (J.r + 3), `${regola} su un incrocio che il guidatore non usa (${a.rd.id})`, { strada: a.rd.id }); return; }
    // la corsia e il verso: chi arriva va verso -u, cioè verso il nodo
    const pa = [J.x + a.ux * (J.r + 3), J.y + a.uy * (J.r + 3)], best = lv.map(o => ({ o, q: projL(o.L, pa[0], pa[1]) })).sort((p, q) => p.q.d - q.q.d)[0], L = best.o.L, q = best.q;
    const dir = Math.cos(q.ang) * -a.ux + Math.sin(q.ang) * -a.uy > 0 ? 1 : -1;
    APP.push({ J, a, regola, L, li: best.o.i, dir, s: q.s, N: N.n });
  }));
  // la sagoma di una linea (rettangolo orientato): il punto (x, y) ci cade dentro?
  const dentroR = (s, x, y, pad) => { const c = Math.cos(s.ang), n = Math.sin(s.ang), dx = x - s.x, dy = y - s.y; return Math.abs(dx * c + dy * n) <= s.L / 2 + (pad || 0) && Math.abs(-dx * n + dy * c) <= s.w / 2 + (pad || 0); };
  APP.forEach(A => {
    const { J, a, regola, L, dir } = A, mieA = ARR.filter(s => s.jx === J.x && s.jy === J.y && s.ux === a.ux && s.uy === a.uy);
    if (!mieA.length && regola !== 'precedenza') { caso('arresto_manca', J.x + a.ux * (J.r + 3), J.y + a.uy * (J.r + 3), `${regola} senza linea d'arresto (${a.rd.id})`, { strada: a.rd.id }); return; }
    if (regola === 'precedenza') { const t = TRI.filter(s => s.jx === J.x && s.jy === J.y && s.ux === a.ux && s.uy === a.uy); if (!t.length) caso('arresto_manca', J.x + a.ux * (J.r + 3), J.y + a.uy * (J.r + 3), `dare precedenza senza triangoli (${a.rd.id})`); else {
      const B = bin(L, dir, projL(L, t[0].x, t[0].y).s), cop = t.some(s => hyp(s.x - B.x, s.y - B.y) < 1.2), opp = bin(L, -dir, projL(L, t[0].x, t[0].y).s), copO = t.some(s => hyp(s.x - opp.x, s.y - opp.y) < .9);
      if (!cop || copO) caso('arresto_lato', t[0].x, t[0].y, `i triangoli ${!cop ? 'non sono sulla corsia di chi arriva' : 'anche sulla corsia di chi va via'} (${a.rd.id})`); } return; }
    mieA.forEach(s => {
      const pl = projL(L, s.x, s.y), B = bin(L, dir, pl.s), O = bin(L, -dir, pl.s);
      const cop = dentroR(Object.assign({}, s, { w: 1.6 }), B.x, B.y, 0), copO = dentroR(Object.assign({}, s, { w: 1.6 }), O.x, O.y, -.1);
      if (!cop) caso('arresto_lato', s.x, s.y, `la linea d'arresto non copre il binario di chi arriva (${a.rd.id}, ${regola})`, { strada: a.rd.id });
      if (copO) caso('arresto_lato', s.x, s.y, `la linea d'arresto copre anche il binario di chi va via (${a.rd.id})`, { strada: a.rd.id });
      // dove: fuori dalla carreggiata delle altre corsie del nodo (prima dell'incrocio), prima della zebra, non più di 8 m prima del bordo
      const altre = A.N.arms.filter(o => LANES[o.i].id !== L.id).map(o => LANES[o.i]).filter((x, k, arr) => arr.indexOf(x) === k);
      const dIn = Math.min(...altre.map(Lb => { const rb = RD(Lb.id); return rb ? SG.lNear(SG.lin(rb), s.x, s.y).d - rb.w / 2 : projL(Lb, s.x, s.y).d - wC(Lb) / 2; }), 99);   // dalla carreggiata vera (la strada, non la corsia spostata per la sosta)
      if (dIn < .2) caso('arresto_posto', s.x, s.y, `la linea d'arresto dentro la carreggiata dell'altra via (${dIn.toFixed(2)} m)`, { strada: a.rd.id });
      else if (dIn > 10) caso('arresto_posto', s.x, s.y, `la linea d'arresto ${dIn.toFixed(1)} m prima dell'incrocio`, { strada: a.rd.id });
      const zb = (P.zebre || []).filter(z => z.bande > 0 && z.rd === a.rd && hyp(z.x - s.x, z.y - s.y) < 8);
      zb.forEach(z => { const dz = (z.x - J.x) * a.ux + (z.y - J.y) * a.uy, dsx = (s.x - J.x) * a.ux + (s.y - J.y) * a.uy; if (dsx < dz + SG.CFG.zebra.L / 2 + .2) caso('arresto_posto', s.x, s.y, `la linea d'arresto non sta prima della zebra (${(dsx - dz).toFixed(1)} m)`, { strada: a.rd.id }); });
    });
    // lo STOP scritto: nella corsia di chi arriva, leggibile per lui (la base verso chi arriva)
    if (regola === 'stop') STOPS.filter(s => s.jx === J.x && s.jy === J.y && s.ux === a.ux && s.uy === a.uy).forEach(s => { const pl = projL(L, s.x, s.y), B = bin(L, dir, pl.s);
      if (!dentroR(s, B.x, B.y, .2)) caso('segno_stop_corsia', s.x, s.y, `lo STOP non è sulla corsia di chi arriva (${a.rd.id})`);
      const trav = Math.atan2(Math.sin(B.ang), Math.cos(B.ang)); if (Math.cos(ad(s.ang, trav)) < .9) caso('segno_stop_verso', s.x, s.y, `lo STOP si legge a rovescio per chi arriva (${a.rd.id})`); });
  });
  // le linee d'arresto senza un approccio regolato (orfane)
  ARR.forEach(s => { if (!inC(s.x, s.y, 140)) return; if (!APP.some(A => A.J.x === s.jx && A.J.y === s.jy && A.a.ux === s.ux && A.a.uy === s.uy)) caso('arresto_orfano', s.x, s.y, 'una linea d\'arresto dove nessuno deve fermarsi'); });

  // ---------------- 3. I CARTELLI ----------------
  // ogni cartello: { k, x, y, yaw (la faccia guarda (sin yaw, cos yaw)), muro, fonte }. Il traffico che regola e il suo verso:
  const faccia = yaw => [Math.sin(yaw), Math.cos(yaw)];
  const CARTE = [];
  P.pali.forEach(p => { if (p.tipo !== 'cartelli') return; p.plates.forEach(pl => CARTE.push({ k: pl.k, x: p.x, y: p.y, yaw: p.yaw + (pl.retro ? PI : 0), muro: !!p.muro, fonte: 'segnaletica', motivo: pl.motivo })); });
  (extra || []).forEach(c => CARTE.push(Object.assign({ fonte: 'render' }, c)));
  // il marciapiede: quanto resta libero fra il palo e il muro (o il ciglio dall'altra parte), lungo la normale della via più vicina
  const solido = v => v === T.BLD || v === T.WATER || v === T.CLIFF || v === T.FOUNT;
  function libero(x, y) { const lv = laneDi(x, y); if (!lv) return 9; const n = [-Math.sin(lv.q.ang), Math.cos(lv.q.ang)], sd = Math.sign(lv.q.lat) || 1; let dm = 9;
    for (let o = .1; o < 4; o += .05) { const px = x + n[0] * sd * o, py = y + n[1] * sd * o; if (solido(tile(px, py))) { dm = o; break; } }
    const kerb = Math.abs(lv.q.lat) - wC(lv.L) / 2; return { muro: dm - .06, ciglio: kerb }; }
  const ped = (P.zebre || []).filter(z => z.bande > 0);
  CARTE.forEach(c => {
    if (!inC(c.x, c.y, 20)) return; const f = faccia(c.yaw);
    let trav = null, lato = null, rd = null, cosa = c.k;
    if (/^(stop|precedenza|yield|semaforo)$/.test(c.k)) {   // il braccio dell'incrocio più vicino che dà la precedenza (o ha il semaforo)
      const A = APP.filter(A => (A.regola === 'semaforo') === (c.k === 'semaforo')).map(A => { const B = bin(A.L, A.dir, projL(A.L, c.x, c.y).s); return { A, B, d: hyp(B.x - c.x, B.y - c.y) }; }).sort((p, q) => p.d - q.d)[0];
      if (!A || A.d > 12) { caso('cartello_orfano', c.x, c.y, `${c.k} (${c.fonte}) senza un approccio che dà la precedenza entro 12 m`); return; }
      trav = [Math.cos(A.B.ang), Math.sin(A.B.ang)]; rd = A.A.a.rd; lato = { B: A.B, L: A.A.L };
      // staccato dal suo segno: lungo la marcia, più di 6 m prima o 3 m dopo la sua linea d'arresto (o i triangoli)
      const ln = P.strisce.filter(s => (s.arresto || s.k === 'triangolo') && s.jx === A.A.J.x && s.jy === A.A.J.y && s.ux === A.A.a.ux && s.uy === A.A.a.uy);
      if (ln.length) { const d = Math.min(...ln.map(s => (s.x - c.x) * trav[0] + (s.y - c.y) * trav[1])); if (d > 6 || d < (c.k === 'semaforo' ? -6 : -3)) caso('cartello_staccato', c.x, c.y, `${c.k} (${c.fonte}) a ${d.toFixed(1)} m dalla sua linea`, { strada: rd.id }); }
      (A.A.cart = A.A.cart || []).push(c);
    } else if (/^(attraversamento|ped)$/.test(c.k)) {   // la zebra più vicina; il traffico che le arriva incontro dal lato del cartello
      const z = ped.map(z => ({ z, d: hyp(z.x - c.x, z.y - c.y) })).sort((p, q) => p.d - q.d)[0];
      if (!z || z.d > 9) { caso('cartello_orfano', c.x, c.y, `attraversamento (${c.fonte}) senza zebra entro 9 m`); return; }
      const L = laneDi(z.z.x, z.z.y, z.z.rd); if (!L) return; const along = (c.x - z.z.x) * Math.cos(L.q.ang) + (c.y - z.z.y) * Math.sin(L.q.ang), dir = along > 0 ? -1 : 1;   // il cartello sta prima della zebra per chi va verso la zebra
      const B = bin(L.L, dir, projL(L.L, c.x, c.y).s); trav = [Math.cos(B.ang), Math.sin(B.ang)]; rd = z.z.rd; lato = { B, L: L.L };
    } else if (/^(divieto_sosta|nopark|P|divieto|sensounico|fermata|settore)$/.test(c.k)) {   // la corsia accanto: chi passa dal lato del cartello
      const L = laneDi(c.x, c.y); if (!L) return; const dir = L.q.lat > 0 ? 1 : -1, B = bin(L.L, dir, L.q.s); trav = [Math.cos(B.ang), Math.sin(B.ang)]; rd = RD(L.L.id); lato = { B, L: L.L };
      if (c.k === 'sensounico') caso('cartello_senza_ragione', c.x, c.y, `«senso unico» (${c.fonte}) su ${L.L.id}, che il guidatore fa nei due versi`);
      if (c.k === 'fermata' && !(VV && VV.fermate().some(fm => hyp(fm.x - c.x, fm.y - c.y) < 25))) caso('cartello_senza_ragione', c.x, c.y, `«fermata» (${c.fonte}) a più di 25 m da una fermata dell'autobus`);
      if (c.k === 'settore') { trav = null; }
      // il divieto di sosta accanto agli stalli dello stesso lato (o la P dove non c'è sosta): dicono il contrario della vernice
      const st = P.strisce.filter(s => s.stallo && hyp(s.x - c.x, s.y - c.y) < 9 && Math.sign(projL(L.L, s.x, s.y).lat) === Math.sign(L.q.lat));
      if (/^(divieto_sosta|nopark|divieto)$/.test(c.k) && st.length) caso('cartello_senza_ragione', c.x, c.y, `«${c.k}» (${c.fonte}) accanto agli stalli`);
      if (c.k === 'P' && !P.strisce.some(s => s.stallo && hyp(s.x - c.x, s.y - c.y) < 25)) caso('cartello_senza_ragione', c.x, c.y, `«P» (${c.fonte}) senza stalli entro 25 m`);
    }
    if (trav) {
      // la faccia verso chi arriva: (sin yaw, cos yaw) contro il verso opposto alla marcia
      const dot = -(f[0] * trav[0] + f[1] * trav[1]);
      if (dot < Math.cos(35 * PI / 180)) caso('cartello_girato', c.x, c.y, `${cosa} (${c.fonte}) girato di ${(Math.acos(clamp(dot, -1, 1)) * 180 / PI).toFixed(0)}° dal traffico che regola`, { strada: rd && rd.id });
      // il lato: a destra di chi va (la destra di (dx, dy) nel mondo è (-dy, dx))
      const right = [-trav[1], trav[0]], sd = (c.x - lato.B.x) * right[0] + (c.y - lato.B.y) * right[1];
      if (sd < 0) caso('cartello_lato', c.x, c.y, `${cosa} (${c.fonte}) a sinistra di chi arriva`, { strada: rd && rd.id });
    }
    if (!c.muro) { const lb = libero(c.x, c.y); if (lb !== 9 && lb.muro < 1.0 && lb.ciglio > .25 && lb.muro + lb.ciglio > 1.05) caso('cartello_marciapiede', c.x, c.y, `${cosa} (${c.fonte}): ${lb.muro.toFixed(2)} m fino al muro, ${lb.ciglio.toFixed(2)} m dal ciglio`); }
  });
  // due cartelli uguali per lo stesso approccio (uno di segnaletica.js e uno di render.js, per esempio)
  APP.forEach(A => { const C2 = A.cart || []; ['stop', 'precedenza', 'semaforo'].forEach(k => { const q = C2.filter(c => (c.k === 'yield' ? 'precedenza' : c.k) === k); if (q.length > 1) caso('cartello_doppio', q[1].x, q[1].y, `${q.length} cartelli «${k}» per lo stesso approccio (${q.map(c => c.fonte).join(', ')})`, { strada: A.a.rd.id }); }); });
  // gli approcci regolati senza il loro cartello
  APP.forEach(A => { if (!inC(A.J.x, A.J.y)) return; const k = A.regola; if (k === 'semaforo' && !(extra || []).length) return; /* i semafori li mette render.js: si contano solo con i suoi cartelli */ if (!(A.cart || []).some(c => (c.k === 'yield' ? 'precedenza' : c.k) === k)) caso('cartello_manca', A.J.x + A.a.ux * (A.J.r + 3), A.J.y + A.a.uy * (A.J.r + 3), `${k} senza il suo cartello (${A.a.rd.id})`, { strada: A.a.rd.id }); });
  ped.filter(z => inC(z.x, z.y)).forEach(z => { (CARTE.filter(c => /^(attraversamento|ped)$/.test(c.k) && hyp(c.x - z.x, c.y - z.y) < 9)).forEach((c, i, arr) => { if (arr.some((o, j) => j < i && Math.cos(o.yaw - c.yaw) > .8 && hyp(o.x - c.x, o.y - c.y) < 9)) caso('cartello_doppio', c.x, c.y, `due cartelli d'attraversamento per lo stesso verso (${c.fonte})`); }); });
  // le zebre e i loro cartelli: per ogni verso del traffico, uno a destra di chi arriva (conto)
  let zVersi = 0, zVersiOk = 0;
  ped.filter(z => inC(z.x, z.y)).forEach(z => { const L = laneDi(z.x, z.y, z.rd); if (!L) return; [1, -1].forEach(dir => { zVersi++; const B = bin(L.L, dir, L.q.s), tr = [Math.cos(B.ang), Math.sin(B.ang)];
    if (CARTE.some(c => /^(attraversamento|ped)$/.test(c.k) && hyp(c.x - z.x, c.y - z.y) < 9 && -(faccia(c.yaw)[0] * tr[0] + faccia(c.yaw)[1] * tr[1]) > .8 && (c.x - B.x) * -tr[1] + (c.y - B.y) * tr[0] > 0 && ((c.x - z.x) * tr[0] + (c.y - z.y) * tr[1]) < 0)) zVersiOk++; }); });

  // ---------------- 4. LA VERNICE CONTRO LE CORSIE ----------------
  P.strisce.forEach(s => {
    if (!inC(s.x, s.y, 140)) return;
    if (s.k === 'riga' && s.mezz) { const lv = laneDi(s.x, s.y, RD(s.mezz)); if (!lv || lv.q.d > 6) return;
      if (Math.abs(lv.q.lat) > .25) caso('segno_mezzeria', s.x, s.y, `la mezzeria a ${lv.q.lat.toFixed(2)} m dalla separazione dei binari (${s.mezz})`, { strada: s.mezz });
      if (Math.abs(Math.sin(ad(s.ang, lv.q.ang))) > Math.sin(10 * PI / 180)) caso('segno_mezzeria', s.x, s.y, `la mezzeria storta di ${(Math.asin(Math.min(1, Math.abs(Math.sin(ad(s.ang, lv.q.ang))))) * 180 / PI).toFixed(0)}° (${s.mezz})`, { strada: s.mezz }); }
    if (s.k === 'riga' && s.margine) { const lv = laneDi(s.x, s.y, RD(s.margine)); if (!lv) return; const dentro = Math.abs(lv.q.lat) - s.w / 2;
      if (dentro < lv.L.w / 4 + MEZZO - .25) caso('segno_margine', s.x, s.y, `il margine a ${dentro.toFixed(2)} m dall'asse: la sagoma di chi passa sul binario (a ${(lv.L.w / 4).toFixed(2)} m) lo copre di ${(lv.L.w / 4 + MEZZO - dentro).toFixed(2)} m`, { strada: s.margine }); }   // (25 cm di tolleranza: la ruota sulla riga di margine è normale)
    if (s.k === 'riga' && s.stallo) { const lv = laneDi(s.x, s.y); if (!lv) return; const c = Math.cos(s.ang), n = Math.sin(s.ang);
      const lat = [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => projL(lv.L, s.x + c * a * s.L / 2 - n * b * s.w / 2, s.y + n * a * s.L / 2 + c * b * s.w / 2).lat);
      const inner = Math.min(...lat.map(Math.abs)); if (inner < lv.L.w / 4 + MEZZO - .05 && Math.sign(lat[0]) === Math.sign(lat[3])) caso('segno_stallo', s.x, s.y, `lo stallo a ${inner.toFixed(2)} m dall'asse: dentro la sagoma di chi passa`); }
    if (s.k.startsWith('freccia') || s.k.startsWith('parola')) { const lv = laneDi(s.x, s.y); if (!lv || lv.q.d > lv.L.w) return;
      const dir = lv.q.lat > 0 ? 1 : -1, B = bin(lv.L, dir, lv.q.s), trav = Math.atan2(Math.sin(B.ang), Math.cos(B.ang));
      // le tessere dei segni (frecce, scritte, STOP) hanno il loro asse +u nel verso di chi le legge guidando
      if (Math.cos(ad(s.ang, trav)) < .9) caso('segno_freccia_verso', s.x, s.y, `${s.k} contro il verso della corsia (${lv.L.id})`, { strada: lv.L.id });
      if (s.k.startsWith('freccia')) { // le svolte promesse: un'uscita del guidatore in quella direzione dal prossimo incrocio
        const ux = Math.cos(trav), uy = Math.sin(trav), nn = NODI.filter(n => { const d = (n.x - s.x) * ux + (n.y - s.y) * uy; return d > 0 && d < 45 && Math.abs((n.x - s.x) * -uy + (n.y - s.y) * ux) < 8; }).sort((p, q) => hyp(p.x - s.x, p.y - s.y) - hyp(q.x - s.x, q.y - s.y))[0];
        if (!nn) caso('segno_freccia_svolta', s.x, s.y, `${s.k} senza un incrocio davanti (${lv.L.id})`);
        else { const esce = { dritta: false, destra: false, sinistra: false };
          nn.arms.forEach(a => { if (a.i === lv.i && a.ux * -ux + a.uy * -uy > .7) return; const c = a.ux * ux + a.uy * uy, cr = ux * a.uy - uy * a.ux; if (c > .7) esce.dritta = true; else if (cr > .3) esce.destra = true; else if (cr < -.3) esce.sinistra = true; });   // (y verso sud: a destra di chi va il prodotto è positivo)
          const vuole = s.k.replace('freccia_', '').split('_'); vuole.forEach(v => { if (!esce[v]) caso('segno_freccia_svolta', s.x, s.y, `${s.k}: «${v}» ma lì il guidatore non può andare (${lv.L.id})`, { strada: lv.L.id }); }); } } }
    if (s.k === 'bus') { const LB2 = VV && VV.linea ? VV.linea() : null; if (!LB2 || !LB2.giro) return; const q = VV.lNear(LB2.giro, s.x, s.y), p = VV.lAt(LB2.giro, q.s), sd = (s.x - p.x) * -Math.sin(p.ang) + (s.y - p.y) * Math.cos(p.ang);
      if (q.d < 6 && sd < -.6) caso('segno_bus_lato', s.x, s.y, `il riquadro BUS a sinistra dell'autobus che ci passa (${sd.toFixed(1)} m)`); }
  });
  // ---------------- 5. LE FERMATE ----------------
  // la fermata a destra dell'autobus: il giro della linea (vievive lineaBus) vicino alla fermata, il suo verso
  const LB = VV && VV.linea ? VV.linea() : null;
  if (LB && LB.giro) LB.fermate.forEach(f => { const g = LB.giro, q = VV.lNear(g, f.x, f.y), p = VV.lAt(g, q.s), sd = (f.x - p.x) * -Math.sin(p.ang) + (f.y - p.y) * Math.cos(p.ang);
    if (sd < 0) caso('arredo_fermata_lato', f.x, f.y, `la fermata ${f.nome || f.id} sta a sinistra dell'autobus che ci passa`); });
  // ---------------- i conti ----------------
  const per = {}; casi.forEach(c => { per[c.k] = (per[c.k] || 0) + 1; });
  const fam = {}; casi.forEach(c => { const k = c.k.split('_')[0]; fam[k] = (fam[k] || 0) + 1; });
  const ver = { zebre: Z.length, bande: bande.length, arresti: ARR.length, approcci: APP.length, cartelli: CARTE.filter(c => inC(c.x, c.y, 20)).length, cartelliRender: (extra || []).length, nodi: nodiC.length, incrociSenzaZebra: incSenzaZebra, zebreVersi: zVersi, zebreVersiConCartello: zVersiOk,
    mezzeria: P.strisce.filter(s => s.mezz).length, margini: P.strisce.filter(s => s.margine).length, stalli: P.strisce.filter(s => s.stallo).length, frecce: P.strisce.filter(s => s.k.startsWith('freccia')).length };
  return { totale: casi.length, famiglie: fam, per, conti: ver, casi };
}

if (require.main === module) {
  const src = path.join(__dirname, '..', 'src'), ctx = carica(src), out = process.argv[2], ex = process.argv[3] && fs.existsSync(process.argv[3]) ? JSON.parse(fs.readFileSync(process.argv[3], 'utf8')) : null;
  const R = sonda(ctx, ex ? ex.cartelli || ex : null);
  console.log('[strade3] casi', R.totale, JSON.stringify(R.famiglie)); console.log(JSON.stringify(R.per)); console.log(JSON.stringify(R.conti));
  const ese = {}; R.casi.forEach(c => { (ese[c.k] = ese[c.k] || []).push(c); }); Object.entries(ese).forEach(([k, L]) => console.log(' ', k, L.length, L.slice(0, 4).map(c => `${c.x},${c.y} ${c.cosa}`).join(' | ')));
  if (out) fs.writeFileSync(out, JSON.stringify(R, null, 1));
}
module.exports = { carica, sonda };
