// [pedonale] la prova delle opere pedonali (src/pedonale.js, world_cittanuova.js opere(), game.js barriere e scale, segnaletica.js):
//   - nessuna via dei veicoli (corsie del traffico, vie minori di Ape e motorini) sotto o attraverso un'opera pedonale: scalinate, scale e
//     muraglioni dei gradoni, la piazza alta, le fontane, i sottopassi pedonali, il lastricato delle piazzette; nessun capo di via contro
//     un muro o una scala; nessuna corsia su una via pedonale;
//   - le vie con una scalinata sono pedonali, e su quelle vievive.js non fa girare né sostare nessuno;
//   - i muraglioni, le ringhiere e i parapetti fermano chi cammina e i mezzi (walkM, taglia) e chiudono i lati della griglia dei percorsi;
//   - dalla piazza alta alla via di sotto il percorso passa per la scala (e la quota sale coi gradini), e un passo dritto giù dal muro no;
//   - niente frecce, linee d'arresto, zebre né STOP sulle piazze e sulle zone pedonali.
// node src/test_pedonale.js   (dalla cartella v7 o da src)
const path = require('path'), src = __dirname;
const log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {};
global.World = require(path.join(src, 'world_cittanuova.js')); global.Interior = require(path.join(src, 'interiors.js')); global.Game = require(path.join(src, 'game.js'));
global.Chiarezza = require(path.join(src, 'chiarezza.js')); global.Vievive = require(path.join(src, 'vievive.js'));
global.Scena = require(path.join(src, 'scena.js')); global.Rete = require(path.join(src, 'rete.js'));
Scena.init(Game); Scena.piano(); Rete.init(Game, Scena);
const SG = require(path.join(src, 'segnaletica.js')); SG.piano();
console.log = log; console.warn = warn;
const G = Game, W = G.MAP.world, TS = G.TS, T = G.T, PD = require(path.join(src, 'pedonale.js')), VV = Vievive;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const tile = (x, y) => G.tileAt(Math.floor(x / TS), Math.floor(y / TS));

// ---------------- 1. LE STRADE DEI VEICOLI FUORI DALLE OPERE PEDONALI ----------------
const OP = W.pedonali || [], tipi = {}; OP.forEach(o => { tipi[o.tipo] = (tipi[o.tipo] || 0) + 1; });
ok(OP.length >= 15 && tipi.scala >= 2 && tipi.muraglione >= 4 && tipi.scalinata >= 3 && tipi.piazza_alta === 1, `le opere pedonali ci sono (${JSON.stringify(tipi)})`);
const L = PD.luoghi(W);
ok(!L.length, `nessuna via dei veicoli sotto, attraverso o contro un'opera pedonale (${L.length}${L.length ? ': ' + L.slice(0, 6).map(q => q.via + '/' + q.tipo + '/' + q.opera + ' ' + q.x + ',' + q.y).join('; ') : ''})`);
// le caselle: nessuna casella di carreggiata di una via dei veicoli dentro un'opera (il conto, casella per casella)
let celle = 0; const VR = W.roads.filter(rd => PD.veicolare(rd, W));
VR.forEach(rd => { const P = rd.pts, hw = rd.w / 2; for (let k = 0; k < P.length - 1; k++) { const [ax, ay] = P[k], [bx, by] = P[k + 1], l = Math.hypot(bx - ax, by - ay); if (l < 1e-3) continue; const ux = (bx - ax) / l, uy = (by - ay) / l;
  for (let s = 0; s < l; s += 1) for (let o = -hw + .3; o <= hw - .3; o += 1) { const x = ax + ux * s - uy * o, y = ay + uy * s + ux * o; if (OP.some(q => q.tipo !== 'piazza' && PD.dentro(q, x, y))) celle++; } } });
ok(celle === 0, `zero punti di carreggiata dei veicoli dentro scale, muraglioni, piazza alta, fontane, sottopassi (${celle})`);
// le scalinate e le scale: le loro vie sono pedonali; niente corsie né mezzi
const conScala = OP.filter(o => o.tipo === 'scalinata' && o.vicolo).map(o => o.vicolo);
ok(conScala.length >= 2 && conScala.every(id => { const rd = W.roads.find(r => r.id === id); return rd && rd.pedonale; }), `le vie con una scalinata sono pedonali (${conScala.join(' ')})`);
const ped = W.roads.filter(rd => rd.pedonale);
ok(ped.length >= 3 && ped.every(rd => !W.lanes.some(l => l.id === rd.id) && !G.LANES.some(l => l.id === rd.id)), `nessuna corsia del traffico sulle ${ped.length} vie pedonali`);
ok(ped.every(rd => VV.profilo(rd).rango === 'nessuno' && !VV.profilo(rd).mezzi.length), 'su una via pedonale vievive non fa girare nessun mezzo');
const stalli = VV.stalli ? VV.stalli() : [], suPed = stalli.filter(q => ped.some(rd => q.rd === rd.id || q.rd === rd));
ok(!suPed.length, `nessuno stallo di sosta su una via pedonale (${stalli.length} stalli)`);
const vit = W.roads.find(r => r.id === 'vittoria'), corso = W.roads.find(r => r.id === 'corso');
ok(vit && corso && Math.min(...corso.pts.map(p => Math.hypot(p[0] - vit.pts[0][0], p[1] - vit.pts[0][1]))) < 4, 'la Vittoria comincia al Corso, non sotto il muraglione dell\'Ottagono');

// ---------------- 2. I MURI FERMANO, LE SCALE PORTANO ----------------
const BAR = W.barriere || [];
ok(BAR.length >= 20, `le barriere ci sono (${BAR.length}: ${[...new Set(BAR.map(b => b[4]))].join(', ')})`);
const ferma = BAR.filter(b => { const x = (b[0] + b[2]) / 2, y = (b[1] + b[3]) / 2, nx = -(b[3] - b[1]), ny = b[2] - b[0], l = Math.hypot(nx, ny) || 1; return !G.walkM(x, y) && G.taglia(x + nx / l * .6, y + ny / l * .6, x - nx / l * .6, y - ny / l * .6); });
ok(ferma.length === BAR.length, `ogni muraglione, ringhiera, corrimano, spalletta e parapetto ferma il passo (${ferma.length} su ${BAR.length})`);
let lati = 0; for (let i = 0; i < G.BLK.length; i++) if (G.BLK[i]) lati++;
ok(lati > 50, `la griglia dei percorsi ha i lati chiusi lungo le barriere (${lati} caselle)`);
const SC = (W.passaggi || []).filter(s => s.salita);
ok(SC.length >= 2, `le scale dei gradoni (${SC.map(s => s.nome).join(', ')})`);
// chi cammina come il giocatore (main.js → game.js tryMove): il riquadro di 35 cm, lo stesso passo che non scavalca
function cammina(P, sx, sy) { const o = { x: sx, y: sy }, dt = 1 / 30; let t = 0, hs = []; P = P.slice();   // come main.js: si punta il primo punto (a 40 cm si passa al dopo), game.js tryMove col riquadro di 35 cm
  while (t < 90 && P.length) { const w = P[0], dx = w.x - o.x, dy = w.y - o.y, d = Math.hypot(dx, dy); if (d < (P.length > 1 ? .4 : .3)) { P.shift(); continue; } const s = Math.min(d, 4.2 * dt);
    G.tryMove(o, dx / d * s, dy / d * s, .35, false); const q = G.quotaScala(o.x, o.y); if (q !== null) hs.push(q); t += dt; }
  return { arrivato: !P.length, hs, o }; }
SC.forEach(s => { const c = Math.cos(s.rot), sn = Math.sin(s.rot), pw = (lx, lz) => [s.x + lx * c + lz * sn, s.y - lx * sn + lz * c];
  const primo = Q => Q.map(([u, v]) => pw(u, v)).find(q => G.walkM(q[0], q[1]) && !G.muroM(q[0], q[1], .5)) || pw(Q[0][0], Q[0][1]);   // il primo punto libero (non un albero dell'anello)
  const alto = primo([[0, -3.2], [-2, -3.2], [2, -3.2], [-4, -3.2], [0, -5], [-2, -5]].map(([u, v]) => [(s.x1 + s.x2) / 2 + u, v])), basso = primo([[s.x0 - 1.3, (s.z0 + s.z1) / 2], [s.x0 - 2, (s.z0 + s.z1) / 2], [s.x0 - 3, (s.z0 + s.z1) / 2]]);   // al piede della scala, sul piano basso
  const P = G.findPath(alto[0], alto[1], basso[0], basso[1], 1.4), Q = G.findPath(basso[0], basso[1], alto[0], alto[1], 1.4);
  let via = false, scav = false, prev = { x: alto[0], y: alto[1] }; P.forEach(q => { const n = Math.ceil(Math.hypot(q.x - prev.x, q.y - prev.y) / .25); for (let i = 0; i <= n; i++) if (G.quotaScala(prev.x + (q.x - prev.x) * i / n, prev.y + (q.y - prev.y) * i / n) !== null) via = true; if (G.taglia(prev.x, prev.y, q.x, q.y)) scav = true; prev = q; });
  ok(P.length && via && !scav, `${s.nome}: dalla piazza alta alla via di sotto il percorso passa per la scala, senza scavalcare il muro (${P.length} punti)`);
  ok(Q.length > 0, `${s.nome}: e dalla via si risale alla piazza`);
  const g = cammina(P, alto[0], alto[1]), up = cammina(Q, basso[0], basso[1]);
  const sale = up.hs.length > 3 && up.hs[up.hs.length - 1] - up.hs[0] > s.h * .8 && up.hs.every((h, i) => !i || h >= up.hs[i - 1] - .05);
  ok(g.arrivato && up.arrivato && sale, `${s.nome}: a piedi si scende e si risale per i gradini (quota ${up.hs.length ? up.hs[0].toFixed(2) + ' → ' + up.hs[up.hs.length - 1].toFixed(2) : '-'}, il muro alto ${s.h.toFixed(2)} m)`);
  // giù dritti dal muro, accanto alla scala: il passo è chiuso
  const m0 = pw(Math.max(.5, s.x0 - 2), -.8), m1 = pw(Math.max(.5, s.x0 - 2), .9);
  ok(G.taglia(m0[0], m0[1], m1[0], m1[1]) && !G.walkM((m0[0] + m1[0]) / 2, (m0[1] + m1[1]) / 2), `${s.nome}: dal ciglio del muraglione non si scende dritti`);
  // di fianco ai gradini non si sale: il corrimano chiude il lato della scala
  const f0 = pw((s.x0 + s.x1) / 2, s.z1 + .8), f1 = pw((s.x0 + s.x1) / 2, (s.z0 + s.z1) / 2);
  ok(G.taglia(f0[0], f0[1], f1[0], f1[1]), `${s.nome}: sui gradini si entra solo dal piede, non di fianco`); });

// tutte le porte e i posti della città restano raggiungibili a piedi dal Corso (coi lati chiusi, i salti di quota e le scale)
{ const GW = G.GW, GH = G.GH, DX = [1, -1, 0, 0, 1, 1, -1, -1], DY = [0, 0, 1, -1, 1, -1, 1, -1], seen = new Uint8Array(GW * GH), q = [], s0 = Math.floor(343 / TS) * GW + Math.floor(corso.pts[Math.floor(corso.pts.length / 2)][0] / TS);
  seen[s0] = 1; q.push(s0);
  while (q.length) { const c = q.pop(), cx = c % GW, cy = (c / GW) | 0;
    for (let k = 0; k < 8; k++) { const nx = cx + DX[k], ny = cy + DY[k]; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH || !G.walkT(nx, ny) || (G.BLK[c] & (1 << k))) continue; if (k >= 4 && (!G.walkT(cx + DX[k], cy) || !G.walkT(cx, cy + DY[k]))) continue; const n = ny * GW + nx; if (!seen[n]) { seen[n] = 1; q.push(n); } }
    (G.LINK.get(c) || []).forEach(l => { if (!seen[l.to]) { seen[l.to] = 1; q.push(l.to); } }); }
  const vicino = (tx, ty, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (seen[(ty + dy) * GW + tx + dx]) return true; return false; }, citta = (tx, ty) => W.zone[ty * GW + tx] === W.Z.CITTA;
  const porte = G.BUILDINGS.filter(b => b.door && citta(b.door[0], b.door[1])), perse = porte.filter(b => !vicino(b.door[0], b.door[1], 1));
  const posti = Object.values(W.PLACES).filter(p => citta(Math.floor(p.x / TS), Math.floor(p.y / TS))), persi = posti.filter(p => !vicino(Math.floor(p.x / TS), Math.floor(p.y / TS), 2));
  ok(!perse.length && !persi.length, `a piedi si arriva a tutte le ${porte.length} porte e a tutti i ${posti.length} posti della città${perse.length || persi.length ? ' (persi: ' + perse.map(b => b.id).concat(persi.map(p => p.id || p.name)).slice(0, 6).join(' ') + ')' : ''}`); }

// ---------------- 3. NIENTE SEGNI DA STRADA SULLE PIAZZE ----------------
const P0 = SG.piano(), strisce = P0.strisce, dentroPed = q => OP.some(o => o.r !== undefined ? Math.hypot(q.x - o.x, q.y - o.y) < o.r : PD.dentro(o, q.x, q.y));
const frecce = strisce.filter(q => /^freccia/.test(q.k)), suPiazza = frecce.filter(q => tile(q.x, q.y) === T.PIAZZA || dentroPed(q));
ok(!suPiazza.length, `nessuna freccia sulle piazze (${frecce.length} frecce${suPiazza.length ? '; ' + suPiazza.slice(0, 4).map(q => q.x.toFixed(1) + ',' + q.y.toFixed(1)).join(' ') : ''})`);
const segni = strisce.filter(q => [T.PIAZZA, T.STAIRS, T.FOUNT].includes(tile(q.x, q.y)) || dentroPed(q));
ok(!segni.length, `nessun segno da strada (zebre, linee d'arresto, STOP, frecce) sulle piazze e sulle opere pedonali (${strisce.length} strisce${segni.length ? '; ' + segni.slice(0, 4).map(q => q.k + ' ' + q.x.toFixed(1) + ',' + q.y.toFixed(1)).join(' ') : ''})`);
const sulPed = strisce.filter(q => { const rd = ped.find(r => { const P = r.pts; for (let k = 0; k < P.length - 1; k++) { const [ax, ay] = P[k], [bx, by] = P[k + 1], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((q.x - ax) * dx + (q.y - ay) * dy) / L2)); if (Math.hypot(ax + dx * t - q.x, ay + dy * t - q.y) < r.w / 2 - .3) return true; } return false; });
  return rd && !VR.some(v => { const P = v.pts; for (let k = 0; k < P.length - 1; k++) { const [ax, ay] = P[k], [bx, by] = P[k + 1], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((q.x - ax) * dx + (q.y - ay) * dy) / L2)); if (Math.hypot(ax + dx * t - q.x, ay + dy * t - q.y) < v.w / 2 + .5) return true; } return false; }); });
ok(!sulPed.length, `nessun segno da strada sulle vie pedonali (${sulPed.length})`);
// ---------------- 4. NESSUN MEZZO SULLE SCALE NÉ NELLE ZONE PEDONALI ----------------
// (il committente: «che fa la polizia sulle scale con la macchina?», «ci sale scambiandole per una strada»). La griglia NOV di game.js,
// la fisica dei mezzi (vehicleFree con driveM), i percorsi dei mezzi (findPath con veicolo) e la sosta (parkSpot)
{ const GW = G.GW, NOV = G.NOV, at = (x, y) => G.novAt(x, y);
  const scale = OP.filter(o => o.tipo === 'scala' || o.tipo === 'scalinata'), senza = scale.filter(o => { const c = o.poly.reduce((a, q) => [a[0] + q[0] / o.poly.length, a[1] + q[1] / o.poly.length], [0, 0]); return at(c[0], c[1]) !== 2; });
  ok(scale.length && !senza.length, `le ${scale.length} scale e scalinate sono vietate ai mezzi${senza.length ? ' (libere: ' + senza.map(o => o.id).join(', ') + ')' : ''}`);
  let stairs = 0, stairsNo = 0; for (let c = 0; c < GW * G.GH; c++) if (W.grid[c] === T.STAIRS) { stairs++; if (NOV[c] !== 2) stairsNo++; }
  ok(!stairsNo, `ogni casella di gradini (${stairs}) è vietata ai mezzi`);
  const ott = OP.find(o => o.tipo === 'piazza_alta'), oc = ott.poly.reduce((a, q) => [a[0] + q[0] / 8, a[1] + q[1] / 8], [0, 0]);
  const oq = [oc[0] + (ott.poly[0][0] - oc[0]) * .55, oc[1] + (ott.poly[0][1] - oc[1]) * .55];   // fra la fontana e il bordo
  ok(at(oq[0], oq[1]) >= 1 && !G.driveM(oq[0], oq[1]) && G.walkM(oq[0], oq[1]), `la piazza alta dell'Ottagono: a piedi sì, coi mezzi no`);
  let suCorsia = 0; (W.lanes || []).forEach(l => { const P = l.pts; for (let k = 0; k < P.length - 1; k++) for (let t = 0; t < 1; t += .1) { const x = P[k][0] + (P[k + 1][0] - P[k][0]) * t, y = P[k][1] + (P[k + 1][1] - P[k][1]) * t; if (at(x, y)) suCorsia++; } });
  ok(suCorsia === 0, `nessun punto delle corsie del traffico in una casella vietata ai mezzi (${suCorsia})`);
  // le vie pedonali: le loro caselle (fuori dalle carreggiate) sono vietate
  const pedv = W.roads.filter(r => r.pedonale && r.pts && r.pts.length > 1); let pedLib = 0, pedTot = 0;
  pedv.forEach(r => { const P = r.pts; for (let k = 0; k < P.length - 1; k++) { const x = (P[k][0] + P[k + 1][0]) / 2, y = (P[k][1] + P[k + 1][1]) / 2; if (VR.some(v => (() => { const P = v.pts; for (let i = 0; i < P.length - 1; i++) { const [ax, ay] = P[i], [bx, by] = P[i + 1], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)); if (Math.hypot(ax + dx * t - x, ay + dy * t - y) < v.w / 2 + TS) return true; } return false; })())) continue; pedTot++; if (!at(x, y)) { pedLib++; if (process.env.PEDDBG) console.log(r.id, r.w, x.toFixed(1), y.toFixed(1), G.tileAt(Math.floor(x / TS), Math.floor(y / TS))); } } });
  ok(pedTot > 0 && pedLib === 0, `le vie pedonali (${pedv.length}, ${pedTot} tratti fuori dalle carreggiate) sono vietate ai mezzi (${pedLib} liberi)`);
  // la sosta: parkSpot non posa un mezzo sui gradini né in piazza
  const sp = G.parkSpot(oc[0], oc[1], false); ok(!at(sp.x, sp.y), `la sosta chiesta in mezzo all'Ottagono finisce fuori dalla piazza (${sp.x.toFixed(1)}, ${sp.y.toFixed(1)})`);
  // l'inseguimento simulato: una volante sulla via sotto il gradone dell'Ottagono insegue chi sta sulla piazza alta; un'auto in fuga a tutto
  // gas contro la scala. Mai una casella di scala sotto il telaio, mai dentro la piazza
  const st = G.create(12345), K = G.VK.polizia;
  const sc = W.passaggi.find(q => q.salita && Math.hypot(q.x - oc[0], q.y - oc[1]) < 40) || W.passaggi.find(q => q.salita), piede = sc.pts[0];
  const parti = G.parkSpot(piede[0], piede[1], true);
  const telaio = v => { const c = Math.cos(v.ang), s2 = Math.sin(v.ang), hl = K.len / 2 - .05, hw = K.wid / 2 - .05; return [[hl, hw], [hl, -hw], [-hl, hw], [-hl, -hw], [0, 0]].map(([a, b]) => at(v.x + a * c - b * s2, v.y + a * s2 + b * c)); };
  const prova = (nome, v, passo, sec) => { let sc2 = 0, pz = 0, mosso = 0, x0 = v.x, y0 = v.y; for (let t = 0; t < sec; t += 1 / 30) { passo(v, 1 / 30); const q = telaio(v); if (q.some(k => k === 2)) sc2++; if (q[4] === 1) pz++; mosso = Math.max(mosso, Math.hypot(v.x - x0, v.y - y0)); }
    ok(!sc2 && !pz, `${nome}: mai sui gradini (${sc2}) né dentro la piazza (${pz}), mosso fino a ${mosso.toFixed(1)} m`); };
  { const v = G.makeVehicle(st, { id: 'prova_volante', kind: 'polizia', x: parti.x, y: parti.y, ang: 0, rider: 'npc' }); st.vehicles.push(v); let path = [], pt = 9;
    prova('la volante che insegue sulla piazza alta', v, (v, dt) => { pt += dt; if (pt > 2.5 || !path.length) { path = G.findPath(v.x, v.y, oc[0], oc[1], 1, true) || []; pt = 0; }
      while (path.length > 1 && Math.hypot(path[0].x - v.x, path[0].y - v.y) < 3) path.shift(); const w = path[0] || { x: oc[0], y: oc[1] };
      G.vehicleMotion(st, v, dt, Math.atan2(w.y - v.y, w.x - v.x), 1, false, true, false); }, 25);
    const pp = G.findPath(parti.x, parti.y, oc[0], oc[1], 1, true); ok(pp.every(q => at(q.x, q.y) !== 2) && pp.every(q => !at(q.x, q.y)), `il percorso della volante verso la piazza alta non passa per la scala né per la piazza (${pp.length} punti)`); }
  { const v = G.makeVehicle(st, { id: 'prova_fuga', kind: 'giulia', x: parti.x, y: parti.y, ang: 0, rider: 'npc' }); st.vehicles.push(v); const pc = sc.pts[2];
    prova('l\'auto in fuga a tutto gas contro la scala', v, (v, dt) => G.vehicleMotion(st, v, dt, Math.atan2(pc[1] - v.y, pc[0] - v.x), 1, false, true, false), 12); }
}

// ---------------- 5. LE SCALE NON SI COMPENETRANO ----------------
// (il committente, davanti all'Ottagono: «vedo ancora scale compenetrate»). Ogni scala dei gradoni e ogni scalinata, nella sua cornice:
//   - il terreno (i vertici di vh, interpolati come render.js groundH) non passa sopra le pedate, il pianerottolo e l'arrivo (5 cm di
//     tolleranza: la griglia dei vertici è di 2 m); il piede della scala del gradone sta sul terreno (entro 5 cm) o sopra il suo basamento;
//   - nessuna casa dentro la scala, il pianerottolo e mezzo metro d'attacco al piede;
//   - nessun'altra opera (muraglioni d'altri gradoni, altre scale, fontane, sottopassi) e nessuna barriera altrui la attraversa;
//   - nessun albero (le caselle TREE, con la formella di 1,4 m) sopra la scala.
// Soglia zero. Le scale di ferro sui muri hanno la loro prova in test_scale_finestre.js.
{ const VH = (i, j) => G.MAP.vh[Math.max(0, Math.min(G.GH, j)) * G.MAP.VW + Math.max(0, Math.min(G.GW, i))];
  const gH = (x, z) => { const fx = x / TS, fz = z / TS, i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j; return VH(i, j) * (1 - u) * (1 - v) + VH(i + 1, j) * u * (1 - v) + VH(i, j + 1) * (1 - u) * v + VH(i + 1, j + 1) * u * v; };
  const dentroP = (P, x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [ax, ay] = P[j], [bx, by] = P[i]; if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) c = !c; } return c; };
  const casaIn = (x, y) => G.BUILDINGS.find(b => x > b.x * TS + .02 && x < (b.x + b.w) * TS - .02 && y > b.y * TS + .02 && y < (b.y + b.h) * TS - .02);
  const alberoIn = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) if (G.tileAt(tx + a, ty + c) === T.TREE && Math.abs(x - ((tx + a) * TS + 1)) < 1.5 && Math.abs(y - ((ty + c) * TS + 1)) < 1.5) return true; return false; };
  const segX = (b, P) => { for (let t = 0; t <= 1; t += .02) if (dentroP(P, b[0] + (b[2] - b[0]) * t, b[1] + (b[3] - b[1]) * t)) return true; return false; };
  const conti = { terreno: [], casa: [], opera: [], barriera: [], albero: [] }, segna = (k, nome) => { if (conti[k].indexOf(nome) < 0) conti[k].push(nome); };
  // le scale dei gradoni (W.pezzi, opz.scalaX di world_cittanuova.js scalaGradone) e le scalinate, ognuna con la sua cornice e il suo profilo
  const SCALE5 = [];
  W.pezzi.filter(p => p.tipo === 'gradone' && p.opz.scala).forEach(p => { const o = p.opz, X = o.scalaX, h = o.h, za = h * .06, zb = za + 1.8;
    if (!X) { const n = Math.ceil(h / .17), pd = Math.min(.32, (o.L - 1.6) / n), xi = Math.max(0, o.L - n * pd - 1.4), aa = h / n;   // senza il posto sul terreno: la scala di prima, in fondo al muro
      SCALE5.push({ nome: p.nome + ' ' + Math.round(p.x) + ',' + Math.round(p.y), p, x0: xi, x1: Math.min(o.L, xi + n * pd + 1.4), z0: za, z1: zb, q: p.q, piede: 0, fondo: 0, senza: true, prof: u => u >= xi + n * pd ? h : aa * Math.min(n, Math.floor((u - xi) / pd) + 1) }); return; }
    const n = o.n, pd = o.pd, aa = o.hs / n; SCALE5.push({ nome: p.nome + ' ' + Math.round(p.x) + ',' + Math.round(p.y), p, x0: X[0], x1: X[2], z0: za, z1: zb, q: p.q, piede: o.yb, fondo: o.fondo, prof: u => u >= X[1] ? h : o.yb + aa * Math.min(n, Math.floor((u - X[0]) / pd) + 1) }); });
  W.pezzi.filter(p => p.tipo === 'scalinata').forEach(p => { const o = p.opz, H = o.dislivello || 8, n = Math.max(1, Math.ceil(H / .17)), a = H / n, pd = o.pedata || .36, nf = Math.max(1, (o.pianerottoli || 0) + 1), w = o.w || 4;
    const st = []; let x = 0, y = 0; for (let f = 0; f < nf; f++) { const k = Math.round(n * (f + 1) / nf) - Math.round(n * f / nf); for (let i = 0; i < k; i++) { y += a; st.push([x, x + pd, y]); x += pd; } const lx = f < nf - 1 ? 1.6 - pd : 1.2; st.push([x, x + lx, y]); x += lx; }
    SCALE5.push({ nome: p.nome, p, x0: 0, x1: x, z0: -w / 2, z1: w / 2, q: p.q, prof: u => { for (const q of st) if (u >= q[0] - 1e-6 && u < q[1]) return q[2]; return H; } }); });
  SCALE5.forEach(S => { const p = S.p, c = Math.cos(p.rot || 0), sn = Math.sin(p.rot || 0), pw = (lx, lz) => [p.x + lx * c + lz * sn, p.y - lx * sn + lz * c];
    const poly = [[S.x0, S.z0], [S.x1, S.z0], [S.x1, S.z1], [S.x0, S.z1]].map(([u, v]) => pw(u, v));
    let gmax = -9; for (let u = S.x0 + .02; u <= S.x1 - .02; u += .1) for (let v = S.z0; v <= S.z1 + 1e-6; v += .2) { const [x, z] = pw(u, v); gmax = Math.max(gmax, gH(x, z) - S.q - S.prof(u)); }
    if (gmax > .05) segna('terreno', `${S.nome} (+${Math.round(gmax * 100)} cm)`);
    if (S.piede !== undefined) { let gp = -9, gm = 9; for (let v = S.z0; v <= S.z1 + 1e-6; v += .3) { const [x, z] = pw(S.x0 + .05, v), g = gH(x, z) - S.q; gp = Math.max(gp, g); gm = Math.min(gm, g); }
      if (gp > S.piede + .05 || gm < S.fondo) segna('terreno', `${S.nome} (il piede: terreno ${gp.toFixed(2)}, gradino ${S.piede.toFixed(2)}, basamento ${S.fondo.toFixed(2)})`); }
    for (let u = S.x0 - .6; u <= S.x1 + 1e-6; u += .2) for (let v = S.z0 - .05; v <= S.z1 + .3 + 1e-6; v += .2) { const [x, z] = pw(u, v), b = casaIn(x, z); if (b) { segna('casa', `${S.nome} in ${b.id}`); u = 1e9; break; } }
    for (let u = S.x0; u <= S.x1 + 1e-6; u += .25) for (let v = S.z0; v <= S.z1 + 1e-6; v += .3) { const [x, z] = pw(u, v); if (alberoIn(x, z)) { segna('albero', S.nome); u = 1e9; break; } }
    const Lx = p.tipo === 'gradone' ? p.opz.L : S.x1, Z0 = p.tipo === 'gradone' ? -1 : S.z0 - .6, Z1 = p.tipo === 'gradone' ? S.z1 + .3 : S.z1 + .6, loc = (x, y) => { const dx = x - p.x, dy = y - p.y; return [dx * c - dy * sn, dx * sn + dy * c]; };
    const mie = OP.filter(o => o.poly && o.poly.every(q => { const [lx, lz] = loc(q[0], q[1]); return lx > -.5 && lx < Lx + .5 && lz > Z0 && lz < Z1; }));   // le opere dello stesso pezzo (il suo muraglione, la sua impronta)
    OP.forEach(o => { if (!o.poly || mie.indexOf(o) >= 0 || o.tipo === 'piazza' || o.tipo === 'piazza_alta') return; const inner = poly.map(q => q); if (o.poly.some(q => dentroP(inner, q[0], q[1])) || inner.some(q => dentroP(o.poly, q[0], q[1]))) segna('opera', `${S.nome} / ${o.id}`); });
    BAR.forEach(b => { const [lx, lz] = loc((b[0] + b[2]) / 2, (b[1] + b[3]) / 2); if (lx > -.5 && lx < Lx + .5 && lz > Z0 - .5 && lz < Z1 + .5) return; if (segX(b, poly)) segna('barriera', `${S.nome} / ${b[4]}`); }); });   // le barriere del pezzo (corrimano, testata, spallette, il ciglio) sono sue
  const tot = Object.values(conti).reduce((a, v) => a + v.length, 0);
  ok(tot === 0, `nessuna scala dei gradoni né scalinata compenetrata (${SCALE5.length} scale; terreno sopra i gradini ${conti.terreno.length}, case ${conti.casa.length}, altre opere ${conti.opera.length}, barriere altrui ${conti.barriera.length}, alberi ${conti.albero.length}${tot ? ': ' + Object.values(conti).flat().slice(0, 6).join('; ') : ''})`);
  ok(SCALE5.filter(S => S.p.tipo === 'gradone').every(S => !S.senza), 'ogni scala dei gradoni ha il suo posto sul terreno (opz.scalaX)'); }

console.log(fail ? `\n${fail} prove fallite` : '\ntutte le prove passate');
process.exitCode = fail ? 1 : 0;
