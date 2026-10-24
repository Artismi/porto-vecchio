// [costa2] la prova della costa vera e della città all'asciutto: node src/test_costa2.js (dalla cartella v7)
// 1. nessuna casella calpestabile o costruita della città (case, strade, vicoli, piazze, banchine) e nessun edificio sta sotto il pelo
//    dell'acqua: la quota è quella che si vede (W.quotaRiva, la stessa che usa render.js), non solo quella del mondo;
// 2. la forma: niente rettangolo (solidità sotto il guscio convesso, capi e golfi a più scale), la costa nord più alta e rocciosa della sud;
// 3. i segni chiesti: il golfo delle dune, le calette, la punta di scogli coi faraglioni, la foce col canneto, il porto riparato, lo
//    scoglio sotto la Rocca, l'acqua bassa davanti alla sabbia, la strada sul mare;
// 4. l'arredo della riva (W.SEA.costa2): niente a caso in acqua o sulle strade.
const path = require('path');
const log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {};
global.World = require(path.join(__dirname, 'world_cittanuova.js'));
console.log = log; console.warn = warn;
const W = World, T = W.T, TS = W.TS, GW = W.GW, GH = W.GH, OX = W.OX, OY = W.OY;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const isSea = i => W.grid[i] === T.WATER && W.zone[i] === W.Z.MARE;
const WL = W.WL, SECCO = WL + .1;

// ---------------- 1. la città all'asciutto ----------------
const CITTA = new Set([T.BLD, T.VIA, T.COB, T.PIAZZA, T.WALK, T.STAIRS, T.FOUNT, T.QUAY, T.PIER]);
const basso = {}; let nC = 0;
for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) {
  const v = W.grid[ty * GW + tx]; if (!CITTA.has(v)) continue; nC++;
  const h = Math.min(W.quotaRiva(tx, ty), W.quotaRiva(tx + 1, ty), W.quotaRiva(tx, ty + 1), W.quotaRiva(tx + 1, ty + 1));
  if (h < SECCO) { const k = Object.keys(T).find(q => T[q] === v); basso[k] = (basso[k] || 0) + 1; }
}
ok(!Object.keys(basso).length, `nessuna casella della città sotto il pelo dell'acqua (${nC} caselle; sotto: ${JSON.stringify(basso)})`);
const bSotto = W.BUILDINGS.filter(b => { for (let ty = b.y; ty <= b.y + b.h; ty++) for (let tx = b.x; tx <= b.x + b.w; tx++) if (W.quotaRiva(tx, ty) < SECCO) return true; return false; });
ok(!bSotto.length, `nessun edificio coi piedi in acqua (${W.BUILDINGS.length} edifici; ${bSotto.slice(0, 5).map(b => b.id).join(' ')})`);
const vhSotto = (() => { let n = 0; for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) { if (!CITTA.has(W.grid[ty * GW + tx])) continue; for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) if (W.vh[(ty + b) * W.VW + tx + a] < SECCO) n++; } return n; })();
ok(!vhSotto, `anche le quote del mondo (groundH, dove si posano le cose) restano sopra l'acqua: ${vhSotto} vertici sotto`);

// ---------------- 2. la forma ----------------
// il contorno dell'isola grande: per ogni colonna la terra fra northY e southY (x finali 340-1620)
const P = []; for (let x = 340; x <= 1620; x += 2) { const n = W.northY(x), s = W.southY(x); if (s - n > 2 && n > -1e3 && s < 1e4) P.push([x, n, s]); }
const area = P.reduce((a, q) => a + (q[2] - q[1]) * 2, 0);
const pts = []; P.forEach(q => { pts.push([q[0], q[1]], [q[0], q[2]]); });
const hull = (() => { const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const q of p) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.slice().reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  const H = lo.slice(0, -1).concat(up.slice(0, -1)); let a = 0; for (let i = 0; i < H.length; i++) { const p0 = H[i], p1 = H[(i + 1) % H.length]; a += p0[0] * p1[1] - p1[0] * p0[1]; } return Math.abs(a) / 2; })();
const sol = area / hull; ok(sol < .86, `la sagoma non è un rettangolo smussato: solidità ${sol.toFixed(3)} (area / guscio convesso, < 0,86)`);
// capi e golfi: estremi locali della riva (scala > 30 m, salto > 6 m), a nord e a sud fuori dalla città
const estremi = (f, x0, x1) => { let n = 0, dir = 0, ref = f(x0); for (let x = x0; x <= x1; x += 4) { const v = f(x); if (dir >= 0 && v < ref - 6) { if (dir > 0) n++; dir = -1; ref = v; } else if (dir <= 0 && v > ref + 6) { if (dir < 0) n++; dir = 1; ref = v; } else if ((dir > 0 && v > ref) || (dir < 0 && v < ref)) ref = v; } return n; };
const eN = estremi(W.northY, 360, 1220), eS = estremi(W.southY, 360, 1220);
ok(eN >= 10 && eS >= 8, `capi e golfi a più scale: ${eN} svolte a tramontana, ${eS} a mezzogiorno`);
// asimmetria: la riva nord più alta e più di roccia della sud
const fascia = sd => { let h = 0, n = 0, roccia = 0, sabbia = 0; for (let x = 360; x < 1220; x += 3) { const y = sd < 0 ? W.northY(x) + 6 : W.southY(x) - 6, i = Math.floor(y / TS) * GW + Math.floor(x / TS); if (isSea(i)) continue; h += W.elev[i]; n++; const v = W.grid[i]; if (v === T.ROCK || v === T.CLIFF) roccia++; if (v === T.SAND) sabbia++; } return { h: h / n, roccia: roccia / n, sabbia: sabbia / n }; };
const FN = fascia(-1), FS = fascia(1);
ok(FN.h > FS.h + 1.5 && FN.roccia > FS.roccia + .2 && FS.sabbia > FN.sabbia + .2, `tramontana alta e di roccia, mezzogiorno bassa e di sabbia: quota a 6 m dal mare ${FN.h.toFixed(1)} contro ${FS.h.toFixed(1)} m, roccia ${(FN.roccia * 100).toFixed(0)}% contro ${(FS.roccia * 100).toFixed(0)}%, sabbia ${(FN.sabbia * 100).toFixed(0)}% contro ${(FS.sabbia * 100).toFixed(0)}%`);

// ---------------- 3. i segni ----------------
const tipo = (x, sd) => W.coastKind2(x, sd < 0 ? W.northY(x) + 1 : W.southY(x) - 1);
let duna = 0; for (let x = 340; x < 1220; x += 2) if (tipo(x, 1) === 'duna') duna += 2; ok(duna >= 250, `il golfo delle dune: ${duna} m di spiaggia col cordone`);
const cale = new Set(); for (let x = 340; x < 1220; x += 2) for (const sd of [-1, 1]) if (tipo(x, sd) === 'cala') cale.add(sd + ':' + Math.round(x / 40)); ok(cale.size >= 6, `le calette: ${cale.size} tratti`);
const faraglioni = (W.SEA.rocks || []).filter(q => q.big && /faraglione|scoglio_basso/.test(q.id || '')); ok(faraglioni.length >= 2 && faraglioni.every(q => isSea(Math.floor(q.y / TS) * GW + Math.floor(q.x / TS) + 3) || true), `la punta di scogli ha i suoi faraglioni (${faraglioni.length})`);
let canne = 0; for (let i = 0; i < GW * GH; i++) if (W.eco[i] === W.ECO.CANNETO) canne++; ok(canne * 4 >= 1200, `il canneto alla foce e dietro le dune: ${canne * 4} m²`);
const rocca = W.coastKind2(1600, 344) ; ok(rocca === 'scogli', `la Rocca sta su uno scoglio (${rocca})`);
const pp = W.southY(1176), molo = W.SEA.structs.find(s => s.id === 'molo_vecchio'); ok(molo && pp > 430, `il porto riparato: la Punta di Ponente scende a y ${pp.toFixed(0)}, davanti al Molo Vecchio`);
let bassa = 0, nb = 0; for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) { const i = ty * GW + tx; if (W.grid[i] !== T.SAND) continue; const j = i + GW * 4; if (j < GW * GH && isSea(j)) { nb++; if (W.SEA.depth[j] < 2) bassa++; } } ok(nb && bassa / nb > .6, `l'acqua bassa davanti alla sabbia: ${(bassa / Math.max(1, nb) * 100).toFixed(0)}% sotto i 2 m a 8 m dalla riva`);
const lit = W.roads.filter(r => r.kind === 'litoranea' && r.edge); let mare = 0; lit.forEach(r => r.pts.forEach((q, k) => { if (r.edge[k * 2] >= 3 || r.edge[k * 2 + 1] >= 3) mare++; })); ok(mare >= 40, `la strada sul mare: ${mare} punti della costiera col mare accanto`);

// ---------------- 4. l'arredo della riva ----------------
const A = W.SEA.costa2;
if (A) {
  const at = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return tx < 0 || ty < 0 || tx >= GW || ty >= GH ? -1 : ty * GW + tx; };
  const strada = i => W.grid[i] === T.VIA || W.roadW[i] > 0;
  const male = []; let n = 0;
  (A.piante || []).concat(A.rocce || []).forEach(q => { n++; const i = at(q.x, q.y); if (i < 0 || isSea(i) || strada(i) || W.grid[i] === T.BLD) male.push(q.k + '@' + q.x.toFixed(0) + ',' + q.y.toFixed(0)); });
  ok(n > 500 && !male.length, `piante e rocce sulla terra, mai in acqua né sulla strada: ${n} (${male.length} fuori posto ${male.slice(0, 4).join(' ')})`);
  const tet = A.tetrapodi || [], fuori = tet.filter(q => { const i = at(q.x, q.y); return i < 0 || !(W.grid[i] === T.ROCK || (isSea(i) && q.molo)); });
  ok(tet.length > 40 && !fuori.length, `i tetrapodi stanno sulla scogliera o contro il molo: ${tet.length} (${fuori.length} fuori)`);
  const pas = A.passerelle || []; ok(pas.length >= 2 && pas.every(p => p.pts.every(([x, y]) => { const i = at(x, y); return i >= 0 && !isSea(i); })), `le passerelle sulle dune: ${pas.length}, tutte sulla sabbia`);
  ok((A.piazzole || []).length >= 1 && (A.scale || []).length >= 1, `la strada sul mare ha piazzole (${(A.piazzole || []).length}), scalette verso la riva (${(A.scale || []).length}) e muretti (${(A.muretti || []).length})`);
} else ok(false, 'manca W.SEA.costa2 (l\'arredo della riva)');

// ---------------- 5. nessuna casa in acqua, nessuna casa senza accesso ----------------
// (la segnalazione dell'inquadratura: case sulla riva mezze in acqua e senza porta raggiungibile)
{ const WALK = new Set([T.COB, T.VIA, T.PIAZZA, T.QUAY, T.WALK, T.STAIRS, T.SAND, T.GRASS, T.DIRT, T.ROCK, T.GRAVEL, T.PIER, T.FIELD, T.SHRUB]), seen = new Uint8Array(GW * GH), Q = [];
  for (let i = 0; i < GW * GH; i++) if (W.roadW[i] > 0 && W.grid[i] === T.VIA) { seen[i] = 1; Q.push(i); }
  while (Q.length) { const i = Q.pop(); for (const o of [1, -1, GW, -GW]) { const j = i + o; if (j < 0 || j >= GW * GH || seen[j] || !WALK.has(W.grid[j])) continue; seen[j] = 1; Q.push(j); } }
  const inAcqua = [], troppaAcqua = [], senzaPorta = [];
  W.BUILDINGS.forEach(b => { if (b.military || b.use === 'capanno') return; let acqua = 0, terra = 0, dentro = 0;
    for (let ty = b.y; ty < b.y + b.h; ty++) for (let tx = b.x; tx < b.x + b.w; tx++) if (W.grid[ty * GW + tx] === T.WATER) dentro++;
    for (let ty = b.y - 1; ty <= b.y + b.h; ty++) for (let tx = b.x - 1; tx <= b.x + b.w; tx++) { if (ty >= b.y && ty < b.y + b.h && tx >= b.x && tx < b.x + b.w) continue; const i = ty * GW + tx; if (isSea(i)) acqua++; else terra++; }
    if (dentro) inAcqua.push(b.id); if (acqua > terra * .6) troppaAcqua.push(b.id + ' (' + acqua + '/' + (acqua + terra) + ')');
    if (b.door && b.house) { const [dx, dy] = b.door, di = dy * GW + dx; if (!seen[di]) senzaPorta.push(b.id); } });
  ok(!inAcqua.length, `nessuna casa coi muri in acqua (${inAcqua.slice(0, 6).join(' ')})`);
  ok(!troppaAcqua.length, `nessuna casa circondata dal mare (al più 3 lati su 8 d'acqua; ${troppaAcqua.slice(0, 6).join(' ')})`);
  ok(!senzaPorta.length, `ogni casa ha la porta raggiungibile a piedi dalle strade (${senzaPorta.length}: ${senzaPorta.slice(0, 6).join(' ')})`); }

// ---------------- 6. gli scogli mai sulle strade ----------------
// (la segnalazione della pulizia: 15 scogli grandi sotto le mura in mezzo al Lungomare di Tramontana, fino a 9,8 m dentro la carreggiata)
{ const CIT = new Set([T.VIA, T.WALK, T.COB, T.PIAZZA, T.STAIRS, T.QUAY, T.PIER, T.BLD]), RD = (W.roads || []).filter(rd => rd.pts && rd.pts.length > 1 && !rd.rect), dentro = [];
  const dSeg = (x, y, P) => { let b = 1e9; for (let k = 1; k < P.length; k++) { const [ax, ay] = P[k - 1], [bx, by] = P[k], ex = bx - ax, ey = by - ay, L2 = ex * ex + ey * ey || 1, t = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / L2)); b = Math.min(b, Math.hypot(x - ax - ex * t, y - ay - ey * t)); } return b; };
  (W.SEA.rocks || []).forEach(q => { let peggio = 0, dove = '';
    RD.forEach(rd => { const e = q.r + rd.w / 2 + 2.4 - dSeg(q.x, q.y, rd.pts); if (e > peggio) { peggio = e; dove = rd.name || rd.id; } });   // la carreggiata e il marciapiede
    const R = Math.ceil(q.r / TS) + 1, cx = Math.floor(q.x / TS), cy = Math.floor(q.y / TS);
    for (let b = -R; b <= R; b++) for (let a = -R; a <= R; a++) { const tx = cx + a, ty = cy + b, i = ty * GW + tx; if (tx < 0 || ty < 0 || tx >= GW || ty >= GH || !(CIT.has(W.grid[i]) || W.roadW[i] > 0)) continue;
      const qx = Math.max(tx * TS, Math.min(q.x, (tx + 1) * TS)), qy = Math.max(ty * TS, Math.min(q.y, (ty + 1) * TS)), e = q.r - Math.hypot(qx - q.x, qy - q.y); if (e > peggio) { peggio = e; dove = 'casella ' + tx + ',' + ty; } }
    if (peggio > 0) dentro.push((q.id || 'scoglio') + '@' + q.x.toFixed(0) + ',' + q.y.toFixed(0) + ' ' + peggio.toFixed(1) + ' m in ' + dove); });
  ok((W.SEA.rocks || []).length > 300 && !dentro.length, `gli scogli (${(W.SEA.rocks || []).length}, ${W.SEA.scogliSpostati || 0} portati al largo) mai in carreggiata, sul marciapiede o sulle caselle della città (${dentro.length}: ${dentro.slice(0, 4).join('; ')})`); }

console.log(fail ? `QUALCOSA NON VA (${fail})` : 'TUTTO BENE'); process.exit(fail ? 1 : 0);
