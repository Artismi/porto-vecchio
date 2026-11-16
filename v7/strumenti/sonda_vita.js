// [vita1] F0 · LA SONDA DELLA VITA, senza browser (AUDIT_VITA §5.1 e §7.1 F0). Carica i moduli della logica come il gioco (stesso
// ordine dei <script> di index.src.html, solo quelli che stanno in Node), fa girare G.step a passi di 0,05 s per N secondi di gioco
// a quattro ore del giorno e conta, ogni 0,2 s:
//   inVehFuori   chi è in un mezzo (n.inVeh) ma «fuori» (!n.inside): disegnato in piedi al centro dell'auto
//   carFuori     l'equipaggio (n.car) «fuori» e a meno di 1,2 m dal centro del suo mezzo (cioè dentro la scocca)
//   doveKo       [C2] chi ha n.inVeh ma n.dove non è 'mezzo', o chi è 'mezzo' senza un mezzo vero
//   coppieFerme  coppie di persone ferme (fuori, vicine al giocatore, entrambe a < 0,1 m/s) a meno di 0,4 m
//   bus          per ogni autobus di linea: quota dei campioni con un angolo della cassa fuori da T.VIA, e su acqua/edificio
//   traffico     deriva laterale (fra dove va e dove punta) > 8° e > 20°, inversioni sul posto (180° in < 3 s e < 5 m)
//   cani         campioni dei cani entro 200 m su una casella PIER ma fuori dalle assi di un pontile
//   pupazzi      campioni di mezzi con qualcuno al volante che il disegno mostrerebbe col pupazzo a scatole (G.AUTISTA, render.js)
//   senzaAutista campioni di mezzi in moto guidati da un abitante (rider 'npc:<id>') senza nessun autista disegnato
//   [vita2] C4, i mezzi guidati dal computer senza fisica (traffico, autobus, vie minori, abitanti col loro mezzo, G.Guida.prendi):
//   cin.scatti   angolo che cambia più di 0,6 rad in 0,2 s
//   cin.omega    velocità angolare oltre v·tan(sterzo max)/passo (+10%; il passo e lo sterzo da G.Guida.limiti, o la stessa formula)
//   cin.ugiro    inversioni sul posto di tutti questi (traf.ugiro: solo il traffico, come in VITA1)
//   cin.slipR8   deriva del traffico misurata sull'asse posteriore contro l'angolo medio del tratto (traf.slip8: al centro, come in VITA1)
//   salti        salti del bersaglio (il punto di corsia inseguito) oltre la strada fatta più 1 m, a ogni passo
//   bus.strada   campioni dell'autobus con un angolo della cassa fuori dalla carreggiata vera (né VIA, né PIAZZA, né entro w/2 da una strada carrabile)
// Uso (da v7/):  node strumenti/sonda_vita.js [secondi per ora = 600] [seme = 1] [uscita.json]
//                PV_SONDA_ORE=8.5,13,19,22.5 per cambiare le ore; PV_SONDA_PROVOCA=1 per provocare chi è in un mezzo (vedi sotto)
// Dalle prove: node src/test_vita.js sonde [secondi] [seme]  (stampa ok/NO sui conti che la fase F2 deve avere a zero)
'use strict';
const path = require('path'), fs = require('fs');
const SRC = path.join(__dirname, '..', 'src') + '/';
const MODS = ['World:world_cittanuova', 'Interior:interiors', 'Game:game', 'Posti:posti', 'Risacca:risacca', 'Popolo:popolo', 'Azioni:azioni',
  'Economia:economia', 'Fazioni:fazioni', 'Soldi:soldi', 'Oggetti:oggetti', 'Attivita:attivita', 'Cassaforti:cassaforti', 'Mestieri:mestieri', 'Scambi:scambi',
  'Convivenza:convivenza', 'Imprese:imprese', 'Commissioni:commissioni', 'Trame:trame', 'Creativita:creativita', 'Graffiti:graffiti', 'Livelli:livelli',
  'Sottosuolo:sottosuolo', 'Ordine:ordine', 'Scontri:scontri', 'Animali:animali', 'Tetti:tetti', 'WriterArte:writer_arte', 'Writing:writing',
  'WriterVita:writer_vita', 'Eventi:eventi', 'Matti:matti', 'Chiarezza:chiarezza', 'Vievive:vievive'];
function carica(log) {
  const manca = [];
  const _l = console.log; console.log = (...a) => { if (!/^\[campagna\]/.test(String(a[0]))) _l(...a); };
  for (const m of MODS) { const [g, f] = m.split(':'); if (global[g]) continue; try { global[g] = require(SRC + f + '.js'); } catch (e) { manca.push(f + ': ' + e.message.slice(0, 80)); } }
  console.log = _l; if (manca.length && log) log('     moduli non caricati: ' + manca.join(' · '));
  return manca;
}
// [vita2] la deriva è l'angolo fra dove va e l'asse del mezzo, nei due versi: in retromarcia (la manovra a tre punti) non è «di traverso»
const sl2 = (m, a) => Math.min(Math.abs(ad(m, a)), Math.abs(ad(m, a + Math.PI)));
const hyp = Math.hypot, ad = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
// [vita2] il passo (asse anteriore - asse posteriore), la distanza dal centro all'asse posteriore e lo sterzo massimo (atan(passo / raggio minimo)):
// la stessa formula di G.Guida.limiti (game.js), qui per misurare anche il gioco di prima
function limitiDi(G, v) {
  const K = G.VK[v.kind] || { len: 4 }, two = !!(K.two || K.pocket), wb = K.wb || (v.kind === 'autobus' ? 5.6 : two || v.kind === 'ape' ? K.len * .68 : K.len * .62);
  const ra = K.ra || (v.kind === 'autobus' ? 2.6 : wb * .48), rmin = v.kind === 'autobus' ? 6.3 : K.rmin || (K.pocket ? 1.6 : two ? 2.4 : Math.max(3.6, Math.min(7.5, K.len * 1.1)));
  return { wb, ra, dmax: Math.atan(wb / rmin), rmin };
}
// [vita2] la carreggiata vera: entro w/2 (+10 cm) dall'asse di una strada carrabile (non le pedonali, i vicoli, i sentieri): la griglia a caselle da 2 m
// fa scalini sulle vie di sbieco, e un angolo della cassa sul marciapiede di uno scalino non è fuori strada
function strade(G) {
  const W = G.MAP.world, VV = typeof Vievive !== 'undefined' ? Vievive : null, segs = [];
  for (const rd of (W.roads || [])) { if (!rd || !rd.pts || rd.pts.length < 2) continue; const r = VV && VV.rango ? VV.rango(rd) : (rd.kind === 'citta' ? 'via' : 'nessuno'); if (r !== 'asse' && r !== 'via' && r !== 'extra' && !(rd.kind === 'strada' || rd.kind === 'litoranea')) continue;
    for (let k = 0; k < rd.pts.length - 1; k++) { const a = rd.pts[k], b = rd.pts[k + 1]; segs.push([a[0], a[1], b[0], b[1], rd.w / 2 + .1]); } }
  const C = 16, grid = new Map();
  segs.forEach((g, i) => { const x0 = Math.floor((Math.min(g[0], g[2]) - g[4]) / C), x1 = Math.floor((Math.max(g[0], g[2]) + g[4]) / C), y0 = Math.floor((Math.min(g[1], g[3]) - g[4]) / C), y1 = Math.floor((Math.max(g[1], g[3]) + g[4]) / C);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) { const k = x * 65536 + y; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); } });
  return { su(x, y) { const L = grid.get(Math.floor(x / C) * 65536 + Math.floor(y / C)); if (!L) return false; for (const i of L) { const [ax, ay, bx, by, h] = segs[i], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-9, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)); if (hyp(ax + dx * t - x, ay + dy * t - y) <= h) return true; } return false; } };
}
// una sonda: un'ora del giorno, N secondi di gioco
function sonda(G, st, ora, secondi, opt) {
  opt = opt || {};
  const p = st.player, T = G.T, TS = G.TS, W = G.MAP.world, dt = .05, N = Math.round(secondi / dt), inp = { x: 0, y: 0 };
  p.vehicle = null; p.indoor = null; p.lv = null; p.path = []; if (opt.px != null) { p.x = opt.px; p.y = opt.py; }
  st.t = Math.floor(st.t / 1440) * 1440 + ora * 60; st.deadline = 1e12;
  const AU = G.AUTISTA || { veroR: 45, ripiego: 'pupazzo' };
  const o = { ora, secondi, campioni: 0, inVehFuori: 0, carFuori: 0, doveKo: 0, es: [], coppieFerme: 0, coppie: new Set(), coppieEs: [],
    bus: { n: 0, fuori: 0, duro: 0, yawMax: 0 }, traf: { n: 0, slip8: 0, slip20: 0, ugiro: 0 }, cani: { n: 0, fuori: 0 }, pupazzi: 0, senzaAutista: 0, guidati: 0 };
  const piers = (W.SEA ? W.SEA.structs : []).filter(s => s.type === 'pontile');
  const offDeck = (x, y) => { let best = null; for (const s of piers) for (let k = 1; k < s.pts.length; k++) { const a = s.pts[k - 1], c = s.pts[k], ex = c[0] - a[0], ey = c[1] - a[1], L2 = ex * ex + ey * ey || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * ex + (y - a[1]) * ey) / L2)), d = hyp(x - a[0] - ex * t, y - a[1] - ey * t) - s.w / 2; if (best === null || d < best) best = d; } return best; };
  const prev = new Map(), hist = new Map(), busK = G.VK.autobus;
  // [vita2] C4 · i conti della guida (AUDIT_VITA F4-F6): il passo e lo sterzo massimo di ogni mezzo (G.Guida.limiti, o la stessa formula
  // se il gioco non ce l'ha: così la sonda misura con lo stesso metro prima e dopo), le strade carrabili per «la cassa fuori strada»
  const limiti = v => (G.Guida && G.Guida.limiti) ? G.Guida.limiti(v) : limitiDi(G, v);
  const carr = strade(G);
  o.cin = { n: 0, scatti: 0, omega: 0, omegaMax: 0, ugiro: 0, nT: 0, slipR8: 0, slipR20: 0 }; o.salti = { n: 0, k: 0, es: [] }; o.bus.strada = 0;
  const refPrev = new Map(), cinHist = new Map();
  const kin = v => !v.hidden && !v.wreck && !v.stalled && !(v.looseUntil > st.clock) && v.rider !== 'player' && (v.traffic || v.guida === 'linea' || v.guida === 'minore' || (typeof v.rider === 'string' && v.rider.startsWith('npc:')) || (v.gd && v.gd.preso));
  const es = (k, x) => { if (o.es.length < 12) o.es.push(Object.assign({ k, t: +(st.t % 1440 / 60).toFixed(2) }, x)); };
  // [vita1] i mezzi degli abitanti: da soli, in dieci minuti vicino al giocatore, li prende quasi nessuno. Ogni 15 s due abitanti vicini
  // che hanno il mezzo a portata vanno col mezzo in un posto lontano (il piano 'guida' di azioni.js): è la strada di Vasco alle 19
  // (AUDIT_VITA §5.1, s4), quella dove il «fammi uscire» degli altri moduli lasciava la persona in piedi nell'auto
  o.guide = 0; o.provocazioni = 0; let nextG = 3, nextP = 5; const PROVOCA = opt.provoca != null ? opt.provoca : process.env.PV_SONDA_PROVOCA === '1';
  const forza = opt.guida !== false && typeof Azioni !== 'undefined';
  const homes = st.npcs.filter(n => n.pop && n.pop.homeT).map(n => n.pop.homeT);
  for (let i = 0; i < N; i++) {
    G.step(st, dt, inp);
    if (o.__c0 === undefined) o.__c0 = st.clock;
    if (forza && st.clock - o.__c0 >= nextG) { nextG += 15;
      const C = st.npcs.filter(n => n.pop && !n.dead && !n.pop.emer && !n.cop && !n.__ev && n.pop.near && hyp(n.x - p.x, n.y - p.y) < 90 && st.vehicles.some(v => v.owner === n.id && !v.hidden && !v.wreck && !v.traffic && !v.rider && hyp(v.x - n.x, v.y - n.y) < 60)).sort((a, b) => hyp(a.x - p.x, a.y - p.y) - hyp(b.x - p.x, b.y - p.y)).slice(0, 2);
      for (const n of C) { const far = homes.filter(h => hyp(h.x - n.x, h.y - n.y) > 150); const t = far[Math.floor(Math.random() * far.length)]; if (t && Azioni.intend(st, n, 'guida', { dove: t }, 2).ok) o.guide++; } }
    // PV_SONDA_PROVOCA=1: ogni 4 s, a chi è in un mezzo, quello che fanno gli altri moduli: una volta la giornata che lo «fa uscire»
    // (l'azione torna 'routine': popolo, convivenza, ordine... decidono loro), una volta la scrittura nuda n.inside = false (le 68 righe)
    if (PROVOCA && st.clock - o.__c0 >= nextP) { nextP += 4; o.__pk = (o.__pk || 0) + 1;
      for (const n of st.npcs) { if (n.dead || !(n.inVeh || (n.car && n.inside))) continue; o.provocazioni++;
        if (o.__pk % 2) n.action = { name: 'routine', scores: [], why: 'sonda', since: st.clock }; else n.inside = false; } }
    if (st.over) st.over = null;
    // [vita2] i salti del bersaglio: il punto di corsia che il mezzo insegue (G.Guida: v.gd.ref; prima: lanePos della sua corsia), a ogni
    // passo; un salto è uno spostamento oltre la strada fatta più un metro (agli incroci il vecchio traffico passava al vertice più vicino)
    for (const v of st.vehicles) { if (v.hidden || v.wreck || !v.traffic || v.stalled) { refPrev.delete(v.id); continue; }
      const r = (v.gd && v.gd.ref) ? v.gd.ref : (v.lane && G.LANES[v.lane.i] ? G.lanePos(G.LANES[v.lane.i], v.lane.s, v.lane.dir) : null); if (!r) continue;
      const q = refPrev.get(v.id); refPrev.set(v.id, { x: r.x, y: r.y, tp: v.__tp || 0, sp: Math.abs(v.speed || 0) });
      if (!q || q.tp !== (v.__tp || 0)) continue; o.salti.n++; const d = hyp(r.x - q.x, r.y - q.y);
      if (d > Math.max(q.sp, Math.abs(v.speed || 0)) * dt * 1.5 + 1) { o.salti.k++; if (o.salti.es.length < 8) o.salti.es.push({ id: v.id, d: +d.toFixed(1), x: +r.x.toFixed(0), y: +r.y.toFixed(0), sp: +(v.speed || 0).toFixed(1), sp0: +q.sp.toFixed(1), man: !!(v.gd && v.gd.man), r0: !!(v.gd && v.gd.r0), siren: !!v.siren }); } }
    if (i % 4) continue;   // ogni 0,2 s
    o.campioni++;
    const vById = new Map(); st.vehicles.forEach(v => vById.set(v.id, v));
    const ferme = [];
    for (const n of st.npcs) {
      if (n.dead) continue;
      if (n.inVeh && !n.inside) { o.inVehFuori++; es('inVehFuori', { id: n.id, a: n.action && n.action.name, veh: n.inVeh, x: +n.x.toFixed(1), y: +n.y.toFixed(1) }); }
      if (n.car && !n.inside) { const c = vById.get(n.car); if (c && hyp(c.x - n.x, c.y - n.y) < 1.2) { o.carFuori++; es('carFuori', { id: n.id, a: n.action && n.action.name, car: c.id }); } }
      if ('dove' in n) { const inV = !!(n.inVeh && vById.get(n.inVeh)); if ((inV && n.dove !== 'mezzo') || (n.dove === 'mezzo' && !(n.dentro && vById.get(n.dentro.id)))) { o.doveKo++; es('doveKo', { id: n.id, dove: n.dove, inVeh: n.inVeh, car: n.car }); } }
      if (!n.inside && n.pop && n.pop.near && Math.abs(n.speedNow || 0) < .1 && hyp(n.x - p.x, n.y - p.y) < 60) ferme.push(n);
    }
    for (let a = 0; a < ferme.length; a++) for (let c = a + 1; c < ferme.length; c++) { const A = ferme[a], B = ferme[c]; if (Math.abs(A.x - B.x) > .4 || Math.abs(A.y - B.y) > .4) continue; const d = hyp(A.x - B.x, A.y - B.y); if (d < .4) { o.coppieFerme++; o.coppie.add(A.id < B.id ? A.id + '|' + B.id : B.id + '|' + A.id); if (o.coppieEs.length < 6) o.coppieEs.push({ a: A.id, b: B.id, d: +d.toFixed(2), x: +A.x.toFixed(1), y: +A.y.toFixed(1), pa: A.__posto && A.__posto.pose, pb: B.__posto && B.__posto.pose }); } }
    for (const v of st.vehicles) {
      if (v.hidden || v.wreck) continue;
      const q0 = prev.get(v.id); prev.set(v.id, { x: v.x, y: v.y, ang: v.ang, t: st.clock, tp: v.__tp || 0, k: kin(v) });
      const q = q0 && q0.tp === (v.__tp || 0) && hyp(v.x - q0.x, v.y - q0.y) < 6 ? q0 : null;   // [vita2] dopo un salto voluto (G.Guida: chi sparisce dietro l'angolo e ricompare lontano; vievive: il mezzo in panne portato via) si riparte
      if (q0 && !q) { hist.delete(v.id); cinHist.delete(v.id); }
      // chi si vede al volante (la regola di render.js per i mezzi a quattro ruote con un sedile: G.AUTISTA)
      const K = G.VK[v.kind] || {}, two = v.kind === 'vespa' || v.kind === 'bmx' || v.kind === 'ciao' || K.two || K.pocket, boat = K.boat;
      const npcRider = typeof v.rider === 'string' && v.rider.startsWith('npc:');
      const drvOn = !two && !boat && (v.traffic || (v.police && v.rider === 'npc' && !v.arrived) || (v.rider === 'npc' && (v.livrea || v.driveTo || v.tutela || (AU.guida && v.guida))) || (npcRider && AU.npcId));
      if (drvOn) { o.guidati++; const camD = Math.abs(v.x - p.x) + Math.abs(v.y - p.y); if (AU.ripiego === 'pupazzo' && camD >= AU.veroR) o.pupazzi++; }
      if (!two && !boat && npcRider && !AU.npcId && Math.abs(v.speed || 0) > 1) o.senzaAutista++;
      if (!q) continue;
      const dx = v.x - q.x, dy = v.y - q.y, ds = hyp(dx, dy), dtt = st.clock - q.t || .2;
      // [vita2] tutti i mezzi guidati dal computer senza fisica: scatti d'angolo (> 0,6 rad in 0,2 s), velocità angolare oltre v·tan(sterzo max)/passo,
      // inversioni sul posto; per il traffico anche la deriva misurata sull'asse posteriore (dove un mezzo che non slitta non ha velocità di traverso)
      if (q.k && kin(v) && dtt > .1) { const L = limiti(v), da = Math.abs(ad(v.ang, q.ang)), om = da / dtt, vm = ds / dtt, lim = vm * Math.tan(L.dmax) / L.wb;
        o.cin.n++; if (da > .6) { o.cin.scatti++; if ((o.esG = o.esG || []).length < 10) o.esG.push({ t: +(st.clock - o.__c0).toFixed(1), id: v.id, da: +da.toFixed(2), kind: v.kind, g: v.guida || (v.traffic ? 'traffico' : v.rider) }); }
        if (om > lim * 1.1 + .05) { o.cin.omega++; if ((o.esO = o.esO || []).length < 8) o.esO.push({ id: v.id, kind: v.kind, g: v.guida || (v.traffic ? 'traffico' : v.rider), om: +om.toFixed(2), lim: +lim.toFixed(2), vm: +vm.toFixed(2), x: +v.x.toFixed(0), y: +v.y.toFixed(0), man: !!(v.gd && v.gd.man) }); } if (vm > 1) o.cin.omegaMax = Math.max(o.cin.omegaMax, om / Math.max(1e-3, lim));
        const H = cinHist.get(v.id) || []; H.push([st.clock, v.x, v.y, v.ang]); while (H.length && st.clock - H[0][0] > 3) H.shift(); cinHist.set(v.id, H); if (H.length > 5) { const h0 = H[0]; if (Math.abs(ad(v.ang, h0[3])) > 2.6 && hyp(v.x - h0[1], v.y - h0[2]) < 5) { o.cin.ugiro++; cinHist.set(v.id, []); } }
        if (v.traffic) { const cA = Math.cos(v.ang), sA = Math.sin(v.ang), cQ = Math.cos(q.ang), sQ = Math.sin(q.ang), rx = (v.x - cA * L.ra) - (q.x - cQ * L.ra), ry = (v.y - sA * L.ra) - (q.y - sQ * L.ra);
          if (hyp(rx, ry) > .3) { o.cin.nT++; const sl = sl2(Math.atan2(ry, rx), q.ang + ad(v.ang, q.ang) / 2); if (sl > .14) o.cin.slipR8++; if (sl > .35) o.cin.slipR20++; } } }
      if (v.kind === 'autobus' && v.guida === 'linea') {
        o.bus.n++; o.bus.yawMax = Math.max(o.bus.yawMax, Math.abs(ad(v.ang, q.ang)) / dtt);
        const c = Math.cos(v.ang), s = Math.sin(v.ang); let off = 0, duro = 0, fs = 0;
        for (const [l, w] of [[busK.len / 2, busK.wid / 2], [busK.len / 2, -busK.wid / 2], [-busK.len / 2, busK.wid / 2], [-busK.len / 2, -busK.wid / 2]]) { const x = v.x + c * l - s * w, y = v.y + s * l + c * w, t = G.tileAt(Math.floor(x / TS), Math.floor(y / TS)); if (t !== T.VIA) off++; if (t === T.WATER || t === T.BLD) duro++; if (t !== T.VIA && t !== T.PIAZZA && !carr.su(x, y)) fs++; }
        if (off) o.bus.fuori++; if (duro) o.bus.duro++; if (fs) { o.bus.strada++; if (o.bus.esS === undefined) o.bus.esS = []; if (o.bus.esS.length < 10 && (o.campioni % 25 === 0)) o.bus.esS.push([+v.x.toFixed(0), +v.y.toFixed(0)]); }
      }
      if (v.traffic && ds > .3) { o.traf.n++; const slip = sl2(Math.atan2(dy, dx), v.ang); if (slip > .14) o.traf.slip8++; if (slip > .35) o.traf.slip20++; if (v.gd && v.gd.man) { o.traf.nMan = (o.traf.nMan || 0) + 1; if (slip > .14) o.traf.slip8Man = (o.traf.slip8Man || 0) + 1; } }   // [vita2] quanta parte è la manovra a tre punti (a sterzo pieno il centro va di sbieco di atan(ra·tan δ/passo), ~15°)
      if (v.traffic) { const H = hist.get(v.id) || []; H.push([st.clock, v.x, v.y, v.ang]); while (H.length && st.clock - H[0][0] > 3) H.shift(); hist.set(v.id, H); if (H.length > 5) { const h0 = H[0]; if (Math.abs(ad(v.ang, h0[3])) > 2.6 && hyp(v.x - h0[1], v.y - h0[2]) < 5) { o.traf.ugiro++; hist.set(v.id, []); if ((o.esU = o.esU || []).length < 6) o.esU.push({ id: v.id, kind: v.kind, t: +(st.clock - o.__c0).toFixed(1), x: +v.x.toFixed(0), y: +v.y.toFixed(0), man: !!(v.gd && v.gd.man), tp: v.__tp || 0, gd: v.gd ? v.gd.tipo : null, a: H.map(q => +q[3].toFixed(2)) }); } } }
    }
    if (st.ani) for (const a of st.ani.list) { if (a.sp !== 'cane' || a.dead || hyp(a.x - p.x, a.y - p.y) > 200) continue; o.cani.n++; if (G.tileAt(Math.floor(a.x / TS), Math.floor(a.y / TS)) === T.PIER) { const od = offDeck(a.x, a.y); if (od !== null && od > .1) o.cani.fuori++; } }
  }
  o.coppieDistinte = o.coppie.size; delete o.coppie; delete o.__c0; delete o.__pk;
  o.bus.quotaStrada = +(o.bus.strada / Math.max(1, o.bus.n)).toFixed(3);
  o.cin.quotaScatti = +(o.cin.scatti / Math.max(1, o.cin.n)).toFixed(4); o.cin.quotaOmega = +(o.cin.omega / Math.max(1, o.cin.n)).toFixed(4); o.cin.omegaMax = +o.cin.omegaMax.toFixed(2);
  o.cin.quotaR8 = +(o.cin.slipR8 / Math.max(1, o.cin.nT)).toFixed(3); o.cin.quotaR20 = +(o.cin.slipR20 / Math.max(1, o.cin.nT)).toFixed(3);
  o.bus.quotaFuori = +(o.bus.fuori / Math.max(1, o.bus.n)).toFixed(3); o.bus.quotaDuro = +(o.bus.duro / Math.max(1, o.bus.n)).toFixed(3); o.bus.yawMax = +o.bus.yawMax.toFixed(2);
  o.traf.quota8 = +(o.traf.slip8 / Math.max(1, o.traf.n)).toFixed(3); o.traf.quota20 = +(o.traf.slip20 / Math.max(1, o.traf.n)).toFixed(3);
  o.cani.quota = +(o.cani.fuori / Math.max(1, o.cani.n)).toFixed(3);
  o.vicini = st.npcs.filter(n => n.pop && n.pop.near && !n.inside).length;
  return o;
}
// tutte le ore: una partita nuova per ora, ognuna in un processo suo (G.create si fa una volta per processo: Risacca.CARDS), così le
// ore non si trascinano i guasti l'una dell'altra
function unaOra(ora, secondi, seme) {
  const G = global.Game, t0 = Date.now(), st = G.create(seme);
  const o = sonda(G, st, ora, secondi); o.ms = Date.now() - t0; return o;
}
function riga(o) {
  return `     ${String(o.ora).padStart(4)} h: inVeh&&!inside ${o.inVehFuori} · car&&!inside ${o.carFuori} · dove ko ${o.doveKo} · coppie ferme <0,4 m ${o.coppieFerme} (${o.coppieDistinte} coppie) · bus fuori VIA ${(o.bus.quotaFuori * 100).toFixed(0)}% (acqua/edificio ${(o.bus.quotaDuro * 100).toFixed(0)}%, ${o.bus.yawMax} rad/s) · bus fuori strada ${((o.bus.quotaStrada || 0) * 100).toFixed(1)}% · deriva >8° ${(o.traf.quota8 * 100).toFixed(1)}% (asse post. ${((o.cin ? o.cin.quotaR8 : 0) * 100).toFixed(1)}%) · inversioni ${o.traf.ugiro} (tutti ${o.cin ? o.cin.ugiro : '-'}) · salti bersaglio ${o.salti ? o.salti.k : '-'} · scatti ${o.cin ? o.cin.scatti : '-'} · ω oltre il limite ${o.cin ? o.cin.omega : '-'} (max ×${o.cin ? o.cin.omegaMax : '-'}) · cani fuori ${(o.cani.quota * 100).toFixed(1)}% · pupazzi ${o.pupazzi}/${o.guidati} · senza autista ${o.senzaAutista} · guide forzate ${o.guide}${o.provocazioni ? ' · provocazioni ' + o.provocazioni : ''} · ${(o.ms / 1000).toFixed(0)} s`;
}
function giro(secondi, seme, ore, log) {
  const R = { secondi, seme, ore: [], quando: new Date().toISOString() }, cp = require('child_process'), os = require('os');
  for (const ora of ore) {
    const tmp = path.join(os.tmpdir(), `sonda_vita_${process.pid}_${ora}.json`);
    const r = cp.spawnSync(process.execPath, [__filename, String(secondi), String(seme), tmp, '--ora=' + ora], { encoding: 'utf8', maxBuffer: 1 << 26 });
    let o = null; try { o = JSON.parse(fs.readFileSync(tmp, 'utf8')); fs.unlinkSync(tmp); } catch (e) { }
    if (!o) { if (log) log(`     ${ora} h: la sonda non è finita (${(r.stderr || '').split('\n').filter(Boolean).slice(-3).join(' | ').slice(0, 300)})`); o = { ora, rotta: true, inVehFuori: 1e9, carFuori: 1e9, doveKo: 1e9, coppieFerme: 0, coppieDistinte: 0, bus: { n: 0, fuori: 0, duro: 0, strada: 0 }, traf: { n: 0, slip8: 0, ugiro: 0 }, cani: { n: 0, fuori: 0 }, pupazzi: 1e9, guidati: 0, senzaAutista: 1e9 }; }
    else if (log) log(riga(o));
    R.ore.push(o);
  }
  const S = k => R.ore.reduce((a, o) => a + (typeof k === 'function' ? k(o) : o[k]), 0);
  R.totale = { inVehFuori: S('inVehFuori'), carFuori: S('carFuori'), doveKo: S('doveKo'), coppieFerme: S('coppieFerme'), coppieDistinte: S('coppieDistinte'),
    busQuotaFuori: +(S(o => o.bus.fuori) / Math.max(1, S(o => o.bus.n))).toFixed(3), busQuotaDuro: +(S(o => o.bus.duro) / Math.max(1, S(o => o.bus.n))).toFixed(3),
    trafQuota8: +(S(o => o.traf.slip8) / Math.max(1, S(o => o.traf.n))).toFixed(3), inversioni: S(o => o.traf.ugiro), caniQuota: +(S(o => o.cani.fuori) / Math.max(1, S(o => o.cani.n))).toFixed(3),
    pupazzi: S('pupazzi'), guidati: S('guidati'), senzaAutista: S('senzaAutista'),
    busQuotaStrada: +(S(o => o.bus.strada || 0) / Math.max(1, S(o => o.bus.n))).toFixed(3), busYawMax: Math.max(...R.ore.map(o => o.bus.yawMax || 0)),
    trafQuotaR8: +(S(o => o.cin ? o.cin.slipR8 : 0) / Math.max(1, S(o => o.cin ? o.cin.nT : 0))).toFixed(3),
    trafQuota8SenzaManovra: +(S(o => o.traf.slip8 - (o.traf.slip8Man || 0)) / Math.max(1, S(o => o.traf.n - (o.traf.nMan || 0)))).toFixed(3), trafQuotaManovra: +(S(o => o.traf.nMan || 0) / Math.max(1, S(o => o.traf.n))).toFixed(3), inversioniTutti: S(o => o.cin ? o.cin.ugiro : 0),
    salti: S(o => o.salti ? o.salti.k : 0), passiSalti: S(o => o.salti ? o.salti.n : 0), scatti: S(o => o.cin ? o.cin.scatti : 0), omegaOltre: S(o => o.cin ? o.cin.omega : 0),
    omegaMax: Math.max(...R.ore.map(o => o.cin ? o.cin.omegaMax : 0)), campioniCin: S(o => o.cin ? o.cin.n : 0) };
  return R;
}
module.exports = { carica, sonda, giro, unaOra, MODS };
if (require.main === module) {
  const secondi = +process.argv[2] || 600, seme = +process.argv[3] || 1, out = process.argv[4] && !/^--/.test(process.argv[4]) ? process.argv[4] : null;
  const unaA = process.argv.find(a => /^--ora=/.test(a));
  require(SRC + 'seme.js')(seme);
  if (unaA) { carica(); const o = unaOra(+unaA.slice(6), secondi, seme); fs.writeFileSync(out, JSON.stringify(o)); process.exit(0); }
  const ore = (process.env.PV_SONDA_ORE || '8.5,13,19,22.5').split(',').map(Number);
  const R = giro(secondi, seme, ore, console.log);
  console.log(JSON.stringify(R.totale));
  if (out) fs.writeFileSync(out, JSON.stringify(R, null, 1));
}
