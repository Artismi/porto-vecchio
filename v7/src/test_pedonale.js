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
console.log(fail ? `\n${fail} prove fallite` : '\ntutte le prove passate');
process.exitCode = fail ? 1 : 0;
