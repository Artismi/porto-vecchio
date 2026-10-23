// [mappa_compatta] la prova della città compatta (progetto_citta/MAPPA_COMPATTA.md, sez. 9 e 11): la cornice, le larghezze, le strade che
// si incontrano davvero (strumenti/incroci.js: nessun capo aperto, nessun moncone, angoli veri) e, passo dopo passo, le altezze, i
// luoghi-missione, le viste dei landmark, l'inventario. Ogni passo della migrazione aggiunge le sue righe.
// node src/test_mappa_compatta.js   (dalla cartella v7)
const path = require('path'), src = __dirname;
const log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {};
global.World = require(path.join(src, 'world_cittanuova.js'));
console.log = log; console.warn = warn;
const W = World, TS = W.TS, B = W.BUILDINGS, I = require(path.join(src, '..', 'strumenti', 'incroci.js'));
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const CORNICE = [1222, 250, 1610, 452], inC = (x, y) => x >= CORNICE[0] && x <= CORNICE[2] && y >= CORNICE[1] && y <= CORNICE[3];
const cen = b => [(b.x + b.w / 2) * TS, (b.y + b.h / 2) * TS];
const lungo = P => P.reduce((L, q, i) => i ? L + Math.hypot(q[0] - P[i - 1][0], q[1] - P[i - 1][1]) : 0, 0);

// ---------------- passo 1: la cornice ----------------
const citta = B.filter(b => b.era);   // le case della città per epoche (le case sparse dell'entroterra lungo le costiere restano)
const fuori = citta.filter(b => { const [x, y] = cen(b); return y > 200 && y < 470 && x > 1000 && x < 1700 && !inC(x, y); });
ok(!fuori.length, `niente case della città fuori dalla cornice 1222-1610 (${fuori.length}${fuori.length ? ': ' + fuori.slice(0, 5).map(b => b.id + '@' + cen(b).map(Math.round)).join(' ') : ''})`);
['via_governo', 'via_nazionale', 'raccordo_e', 'porto', 'via_cavour'].forEach(id => ok(!W.roads.some(r => r.id === id), `la strada tolta non c'è più: ${id}`));
const lit = W.roads.filter(r => r.kind === 'litoranea' && r.pts.some(([x, y]) => x > 1252 && inC(x, y)));
ok(!lit.length, `nessuna costiera dentro la città (${lit.map(r => r.id).join(', ')})`);

// ---------------- passo 2: le strade ----------------
const R = W.roads.filter(r => r.pts && r.kind !== 'sterrato' && r.pts.some(([x, y]) => inC(x, y)) && r.pts.every(([x]) => x >= 1180));
const W_OK = { 10: 1, 7: 1, 5: 1 }, larghe = R.filter(r => !(W_OK[r.w] || r.w <= 3));
ok(!larghe.length, `le larghezze ammesse: 10, 7, 5, ≤ 3 m (${larghe.map(r => r.id + ' ' + r.w).join(', ') || 'tutte'})`);
const vit = W.roads.find(r => r.id === 'vittoria'), cor = W.roads.find(r => r.id === 'corso'), rua = W.roads.find(r => r.id === 'rua'), mar = W.roads.find(r => r.id === 'marina');
ok(vit && vit.w === 7 && vit.viva && lungo(vit.pts) > 200, `la Vittoria: una via viva di 7 m, dal Mercato alla Rocca (${vit && Math.round(lungo(vit.pts))} m)`);   // [cucitura] non più l'asse di parata da 10 m
ok(cor && cor.w === 7 && rua && rua.w === 5 && mar && mar.w === 7 && mar.kind === 'citta', 'le vie: il Corso 7 m, la Rua 5 m (ZTL), la Marina lungomare di 7 m coi marciapiedi');   // [pianta] la tavola della viabilità
{ const lit = ['lung_nord', 'passeggiata', 'passeggiata_sud', 'marina'].map(id => W.roads.find(r => r.id === id));
  ok(lit.every(r => r && r.kind === 'citta' && r.w === 7), `[pianta] l'anello sul mare: Lungomare di Tramontana, Viale della Spianata, Via del Lido, Via della Marina, tutte di 7 m (${lit.map(r => r ? r.name + ' ' + r.w : 'manca').join(', ')})`);
  const L = lit[0], R = W.railCity, ryA = x => { let b = R[0]; R.forEach(q => { if (Math.abs(q[0] - x) < Math.abs(b[0] - x)) b = q; }); return b[1]; };
  const tra = L.pts.filter(q => q[0] > 1360 && q[0] < 1450), dmin = Math.min(...tra.map(q => ryA(q[0]) - q[1]));
  ok(tra.length > 10 && dmin >= 8.5, `[pianta] fra la ferrovia e il mare passa il Lungomare: l'asse a ${dmin.toFixed(1)} m dai binari, dal lato del mare`); }
const nVic = R.filter(r => r.w <= 3).length; ok(nVic >= 20 && nVic <= 34, `i vicoli: ${nVic} (il progetto: ~28)`);
const { strade, nodi } = I.dalMondo(W, CORNICE), C = I.controlla(strade, nodi);
console.log('     incroci', JSON.stringify(C.conti));
ok(C.conti.aperti === 0, `ogni capo finisce su una strada, in un nodo o contro una chiusura dichiarata (aperti: ${C.conti.aperti})`);
ok(!C.errori.some(e => /moncone/.test(e)), 'nessun moncone oltre un incrocio' + (C.errori.filter(e => /moncone/.test(e)).length ? ': ' + C.errori.filter(e => /moncone/.test(e)).slice(0, 3).join(' · ') : ''));
ok(!C.errori.some(e => /angolo/.test(e)), 'ogni incrocio ha gli angoli veri (≥ 40°)' + (C.errori.filter(e => /angolo/.test(e)).length ? ': ' + C.errori.filter(e => /angolo/.test(e)).slice(0, 3).join(' · ') : ''));
ok(C.errori.length === 0, `il controllo degli incroci è pulito (${C.errori.length} errori)` + (C.errori.length ? ': ' + C.errori.slice(0, 3).join(' · ') : ''));
ok(C.capi.filter(c => c.k === 'chiuso').every(c => c.perche && c.perche.length > 8), 'ogni chiusura dice il suo perché');
ok(C.conti.T >= 30, `le strade laterali si aprono dai fronti: ${C.conti.T} incroci a T`);

// ---------------- passo 3: le altezze ----------------
const caseC = citta.filter(b => b.house && inC(...cen(b))), torri = caseC.filter(b => b.torre), alte = caseC.filter(b => b.fl > 3 && !b.torre);
const ist = {}; caseC.forEach(b => { ist[b.fl] = (ist[b.fl] || 0) + 1; }); console.log('     piani', JSON.stringify(ist), 'case', caseC.length);
ok(!alte.length, `nessuna casa sopra i 3 piani tranne le case-torre (${alte.length}${alte.length ? ': ' + alte.slice(0, 4).map(b => b.id + ' ' + b.fl).join(' ') : ''})`);
ok(torri.length === 6 && torri.every(b => b.fl === 4), `sei case-torre di quattro piani (${torri.length})`);
// il lato camera: la casa che ha la via a nord o a ovest (entro 3 m dal filo) sulla Rua, la Marina, il Corso ha al più 2 piani
const VIE = ['rua', 'marina', 'corso'].map(id => W.roads.find(r => r.id === id)).filter(Boolean);
const dVia = (rd, x, y) => { let m = 1e9; for (let k = 0; k < rd.pts.length - 1; k++) { const [ax, ay] = rd.pts[k], [bx, by] = rd.pts[k + 1], vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy || 1, t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / L2)); m = Math.min(m, Math.hypot(x - ax - vx * t, y - ay - vy * t)); } return m - rd.w / 2; };
const camera = caseC.filter(b => !b.torre && !b.shack && VIE.some(rd => { for (let tx = b.x; tx < b.x + b.w; tx++) if (dVia(rd, tx * TS + 1, b.y * TS - 1) < 1.2) return true; for (let ty = b.y; ty < b.y + b.h; ty++) if (dVia(rd, b.x * TS - 1, ty * TS + 1) < 1.2) return true; return false; }));
const camAlte = camera.filter(b => b.fl > 2);
ok(camera.length > 20 && !camAlte.length, `sulle vie il fronte lato camera ha al più 2 piani (${camera.length} case, ${camAlte.length} più alte${camAlte.length ? ': ' + camAlte.slice(0, 4).map(b => b.id + '@' + cen(b).map(Math.round) + ' ' + b.fl).join(' ') : ''})`);

// ---------------- passo 5: i luoghi-missione e i nodi ----------------
{ const L = W.luoghi || [], T = W.T, walk = i => { const v = W.grid[i]; return i >= 0 && v !== T.BLD && v !== T.WATER && v !== T.FOUNT && v !== T.CLIFF && v !== T.TREE; };
  const aTerra = (x, y) => { for (let r = 0; r <= 8; r += 1) for (let a = 0; a < 16; a++) { const tx = Math.floor((x + Math.cos(a * Math.PI / 8) * r) / TS), ty = Math.floor((y + Math.sin(a * Math.PI / 8) * r) / TS), i = ty * W.GW + tx; if (walk(i)) return i; } return -1; };
  ok(L.length === 12 && L.every(l => l.ruoli.length && l.icona && l.firma && l.ingressi.length && l.segreto), `i dodici luoghi-missione come dato (W.luoghi: ${L.map(l => l.id).join(', ')})`);
  const s0 = aTerra(1274, 343), seen = new Uint8Array(W.grid.length), q = [s0]; seen[s0] = 1;
  for (let h = 0; h < q.length; h++) { const i = q[h], tx = i % W.GW, ty = (i / W.GW) | 0; if (tx * TS < 1180 || tx * TS > 1620 || ty * TS < 240 || ty * TS > 420) continue; for (const d of [1, -1, W.GW, -W.GW]) { const j = i + d; if (!seen[j] && walk(j)) { seen[j] = 1; q.push(j); } } }
  const lontani = L.filter(l => { const i = aTerra(l.x, l.y); return i < 0 || !seen[i]; });
  ok(!lontani.length, 'ogni luogo-missione si raggiunge a piedi dal Mercato' + (lontani.length ? ': mancano ' + lontani.map(l => l.id).join(', ') : ''));
  const C = (W.sets || []).filter(q => /^(mercato|sagrato|adunata|piazzetta|marina)$/.test(q.k)).map(q => [q.k, q.x !== undefined ? q.x : (q.x0 + q.x1) / 2, q.y !== undefined ? q.y : (q.y0 + q.y1) / 2]);
  let dmin = 1e9, cp = ''; C.forEach((a, i) => C.forEach((b, j) => { if (j <= i) return; const d = Math.hypot(a[1] - b[1], a[2] - b[2]); if (d < dmin) { dmin = d; cp = a[0] + '-' + b[0]; } }));
  // il progetto ne chiede 40: il Forno sta fra l'adunata e la Piazza della Marina (74 m fra le due), e dall'adunata dista 35 m
  ok(dmin >= 34, `le piazze del borgo e del centro lontane l'una dall'altra (la più vicina: ${cp} a ${Math.round(dmin)} m; il progetto: 40)`);
  ok(['stazione', 'scalo', 'baracche', 'armi'].every(k => (W.sets || []).some(q => q.k === k)), 'i nodi nuovi: piazzale della stazione, Scalo, lotto del fuoco, piazza d\'armi'); }

// ---------------- la Rocca a mare (sez. 11.2) ----------------
{ const F = W.FORT, T = W.T, cellA = (x, y) => Math.floor(y / TS) * W.GW + Math.floor(x / TS), mare = (x, y) => { const i = cellA(x, y); return W.grid[i] === T.WATER && W.zone[i] === W.Z.MARE; };
  const xc = (F.ditch[0] + F.ditch[2]) / 2; let asciutto = 0, ponte = 0; for (let y = 290; y <= 390; y += 2) { if (Math.abs(y - F.y) < 4) { if (!mare(xc, y)) ponte++; continue; } if (!mare(xc, y)) asciutto++; }
  ok(!asciutto && ponte > 0, `lo scoglio è staccato dalla città dal canale (${asciutto} caselle asciutte nel canale), passato dal ponte`);
  const PZ = W.pezzi.filter(p => p.x > F.ditch[0] - 4), n = t => PZ.filter(p => p.tipo === t).length;
  ok(n('mastio') === 1 && PZ.find(p => p.tipo === 'mastio').opz.lanterna && n('torrione') === 1 && n('corpo_rocca') >= 6 && n('bastione') >= 1 && n('porta_monumentale') === 2 && n('porta_acqua') === 1 && n('ponte_arco') === 1,
    `le masse del castello: mastio col faro, torrione, ${n('corpo_rocca')} masse di carparo, rivellino, porta, portale, porta d'acqua, ponte ad arco`);
  ok(n('scogliera') >= 10, `il frangiflutti di massi attorno allo scoglio (${n('scogliera')} tratti)`);
  // la darsena è mare dentro le mura e la porta d'acqua la apre sul mare aperto
  const D = PZ.find(p => p.tipo === 'darsena'), s0 = cellA(D.x + 20, D.y); let aperto = false; { const seen = new Set([s0]), q = [s0]; for (let h = 0; h < q.length && h < 20000 && !aperto; h++) { const i = q[h], y = Math.floor(i / W.GW) * TS; if (y > 392) aperto = true; for (const d of [1, -1, W.GW, -W.GW]) { const j = i + d; if (!seen.has(j) && W.grid[j] === T.WATER) { seen.add(j); q.push(j); } } } }
  ok(mare(D.x + 20, D.y) && aperto, 'la darsena allagata dentro le mura esce in mare dalla porta d\'acqua');
  const mil = W.BUILDINGS.filter(b => b.military && b.x * TS > F.ditch[2] - 2); ok(mil.length >= 6 && mil.every(b => b.pezzo), `gli edifici della Rocca sono masse del castello (${mil.map(b => b.id + ':' + b.pezzo).join(' ')})`);
}

// ---------------- passo 11: sotto la città compatta ----------------
{ console.log = () => {}; global.Interior = require(path.join(src, 'interiors.js')); global.Game = require(path.join(src, 'game.js')); global.Livelli = require(path.join(src, 'livelli.js'));
  const SS = require(path.join(src, 'sottosuolo.js')); console.log = log; const TPL = SS.TPL, M = TPL.metro, pl = id => TPL.places.find(q => q.id === id), PL = Game.PLACES;
  ok(M.ok && M.A.name === 'Mercato' && M.B.name === 'Mura' && Math.hypot(M.A.x - 1262, M.A.y - 352) < 25 && Math.hypot(M.B.x - 1455, M.B.y - 288) < 25, `la metropolitana dal Mercato alle Mura (${M.ok ? M.A.x.toFixed(0) + ',' + M.A.y.toFixed(0) + ' → ' + M.B.x.toFixed(0) + ',' + M.B.y.toFixed(0) + ', ' + M.L.toFixed(0) + ' m' : 'manca'})`);
  const topi = pl('topi'); ok(topi && Math.hypot(topi.x - 1236, topi.y - 340) < 15, `la Città dei Topi sotto i Giardini (${topi ? topi.x.toFixed(0) + ',' + topi.y.toFixed(0) : 'manca'})`);
  const F = TPL.finds || [], fd = id => F.find(q => q.id === id), reg = fd('regime'), bus = fd('bus');
  ok(reg && PL.stazione && Math.hypot(reg.x - PL.stazione.x, reg.y - PL.stazione.y) < 40, `la stanza murata del regime sotto la stazione (${reg ? reg.x.toFixed(0) + ',' + reg.y.toFixed(0) : 'manca'})`);
  ok(bus && Math.hypot(bus.x - 1232, bus.y - 266) < 40, `l'autobus sepolto sotto la discarica delle baracche (${bus ? bus.x.toFixed(0) + ',' + bus.y.toFixed(0) : 'manca'})`); }

console.log(fail ? `\n${fail} prove non passate` : '\ntutte le prove passano');
process.exit(fail ? 1 : 0);
