// [campagna] la prova della campagna (a ovest della stazione): la ferrovia della miniera, le strade, gli edifici, nel mondo com'è nel gioco
// (world_cittanuova.js + game.js + writing.js). Le soglie sono quelle della revisione (campagna/ferrovia_strade.md, campagna/edifici.md).
// node src/test_campagna.js [--seme=N]   (dalla cartella v7; il seme non cambia il mondo)
const path = require('path'), src = __dirname;
const log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {};
global.World = require(path.join(src, 'world_cittanuova.js')); global.Interior = require(path.join(src, 'interiors.js'));
global.Game = require(path.join(src, 'game.js')); global.Risacca = require(path.join(src, 'risacca.js')); global.Popolo = require(path.join(src, 'popolo.js')); global.Azioni = require(path.join(src, 'azioni.js'));
global.Economia = require(path.join(src, 'economia.js')); global.Fazioni = require(path.join(src, 'fazioni.js')); global.Soldi = require(path.join(src, 'soldi.js')); global.Oggetti = require(path.join(src, 'oggetti.js'));
global.Graffiti = require(path.join(src, 'graffiti.js')); global.Livelli = require(path.join(src, 'livelli.js')); global.Sottosuolo = require(path.join(src, 'sottosuolo.js')); global.Tetti = require(path.join(src, 'tetti.js')); global.Writing = require(path.join(src, 'writing.js'));
console.log = log; console.warn = warn;
const G = Game, WR = Writing, W = G.MAP.world, TS = G.TS, T = G.T, B = G.BUILDINGS, L = G.layout();
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const XC = W.cityW0 || 1250, inCampagna = (x) => x < XC;
const seg = (x, y, P) => { let m = 1e9; for (let k = 0; k < P.length - 1; k++) { const [ax, ay] = P[k], [bx, by] = P[k + 1]; if (Math.min(ax, bx) - 30 > x || Math.max(ax, bx) + 30 < x || Math.min(ay, by) - 30 > y || Math.max(ay, by) + 30 < y) continue; const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)); m = Math.min(m, Math.hypot(ax + dx * t - x, ay + dy * t - y)); } return m; };
// la pianta di un edificio (girata): distanza con segno di un punto dal rettangolo (negativa dentro)
const bRect = b => { const cx = (b.x + b.w / 2) * TS, cy = (b.y + b.h / 2) * TS, r = b.rot || 0; return { cx, cy, c: Math.cos(r), s: Math.sin(r), hw: b.w * TS / 2, hh: b.h * TS / 2 }; };
const sdRect = (R, x, y) => { const dx = x - R.cx, dy = y - R.cy, u = Math.abs(dx * R.c + dy * R.s) - R.hw, v = Math.abs(-dx * R.s + dy * R.c) - R.hh; return u > 0 || v > 0 ? Math.hypot(Math.max(u, 0), Math.max(v, 0)) : Math.max(u, v); };
const corners = (b, m) => { const R = bRect(b), a = R.hw + (m || 0), c = R.hh + (m || 0); return [[-a, -c], [a, -c], [a, c], [-a, c]].map(([u, v]) => [R.cx + u * R.c - v * R.s, R.cy + u * R.s + v * R.c]); };
const sat = (A, Bq) => { for (const P of [A, Bq]) for (let i = 0; i < 4; i++) { const p = P[i], q = P[(i + 1) % 4], nx = q[1] - p[1], ny = p[0] - q[0]; let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9; A.forEach(v => { const d = v[0] * nx + v[1] * ny; a0 = Math.min(a0, d); a1 = Math.max(a1, d); }); Bq.forEach(v => { const d = v[0] * nx + v[1] * ny; b0 = Math.min(b0, d); b1 = Math.max(b1, d); }); if (a1 <= b0 || b1 <= a0) return false; } return true; };
const tileAt = (x, y) => G.tileAt(Math.floor(x / TS), Math.floor(y / TS));
const BC = B.filter(b => inCampagna((b.x + b.w / 2) * TS) && b.w > 0 && !b.isola && (b.y + b.h / 2) * TS > 200 && (b.y + b.h / 2) * TS < 640);

// ---------------- la ferrovia ----------------
const TR = WR.TR, RA = WR.RAIL, P = TR.P, RC = W.railCampagna;
ok(TR.ok && RC && RC.n > 150, `la linea della campagna viene dai dati del mondo (${RC && RC.n} m in campagna, ${TR.len} m in tutto)`);
WR._.railFit({ groundH: G.groundV }); const el = TR.el;
const mine = B.find(b => b.id === 'miniera'), mc = [(mine.x + mine.w / 2) * TS, (mine.y + mine.h / 2) * TS];
const a0 = WR.railAt(0), park = WR.railAt(TR.sMine - TR.LEN / 2);
ok(Math.hypot(a0.x - mc[0], a0.y - mc[1]) < 60 && Math.hypot(park.x - mc[0], park.y - mc[1]) < 50, `parte dalla Stazione di estrazione Nord e il treno dorme accanto alla miniera (paraurti a ${Math.hypot(a0.x - mc[0], a0.y - mc[1]).toFixed(0)} m, treno fermo a ${Math.hypot(park.x - mc[0], park.y - mc[1]).toFixed(0)} m)`);
ok(!P[Math.round(TR.sMine)][3] && !P[Math.round(TR.sMine - TR.LEN)][3], 'il treno fermo sta sulla terra, non in mare');
ok(RA.landEnd > TR.sMine + 200, `la linea in terra va ben oltre il deposito (landEnd ${RA.landEnd}, deposito a ${TR.sMine})`);
{ let wet = 0, at = null; for (let i = 0; i < RA.landEnd; i++) { const q = P[i]; if (q[3] || (tileAt(q[0], q[1]) === T.WATER && !el[i])) { wet++; at = at || q; } } ok(!wet, `in terra il binario non sta sull'acqua se non su un ponte (${wet}${at ? ' a ' + at.slice(0, 2).map(Math.round) : ''})`); }
ok(RA.yards.some(y => /miniera/.test(y.name)) && RA.yards.every(Y => Y.s0 + Y.len < RA.landEnd), `gli scali in terra: ${RA.yards.map(y => y.name + ' ' + y.s0 + '-' + (y.s0 + y.len)).join(', ')}`);
ok(RA.spots.station && RA.spots.cant.length >= 1, `la stazione abbandonata (s ${RA.spots.station && RA.spots.station.s}) e le case cantoniere (${RA.spots.cant.map(c => c.s).join(', ')}) lungo la linea in terra`);
ok(RA.fences.length > 40 && RA.gaps.length >= 2, `la rete lungo la linea (${RA.fences.length} tratti, ${RA.gaps.length} varchi)`);
// la quota: la logica (game.js) e il disegno (writing.js railFit) sono la stessa funzione; in campagna quella del mondo
{ let d = 0; for (let i = 0; i < RC.n; i++) d = Math.max(d, Math.abs(P[i][2] - RC.h[i])); ok(d < .01, `la quota del ferro in campagna è quella del piano di posa (scarto massimo ${d.toFixed(3)} m)`); }
// i tratti su piloni: nessun moncone di piloni o di rilevato fra 1 e 20 m in campagna e all'ingresso in città
{ const runs = []; let a = 0; for (let i = 1; i <= P.length; i++) if (i === P.length || el[i] !== el[a]) { runs.push([a, i - 1, el[a]]); a = i; }
  const corti = runs.filter(([s, e, v], k) => P[s][0] < XC && k > 0 && k < runs.length - 1 && e - s + 1 < 20 && (v === 1 || e - s + 1 < 10));
  ok(!corti.length, `piloni e rilevato a tratti lunghi (${runs.filter(r => P[r[0]][0] < XC && r[2]).map(r => r[0] + '-' + r[1]).join(', ')}${corti.length ? '; corti: ' + corti.map(r => r.join('/')).join(' ') : ''})`); }
// le curve: raggio minimo
{ let rMin = 1e9, at = null; for (let i = 8; i < RC.n - 8; i += 2) { const a = P[i - 8], b = P[i], c = P[i + 8], A = Math.hypot(b[0] - a[0], b[1] - a[1]), Bv = Math.hypot(c[0] - b[0], c[1] - b[1]), C = Math.hypot(c[0] - a[0], c[1] - a[1]), ar = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2, R = ar < 1e-6 ? 1e9 : A * Bv * C / (4 * ar); if (R < rMin) { rMin = R; at = b; } }
  ok(rMin >= 40, `le curve della linea di campagna hanno almeno 40 m di raggio (il minimo: ${rMin.toFixed(0)} m${at ? ' a ' + at.slice(0, 2).map(Math.round) : ''})`); }
// il binario e le case: a 4 m almeno, mai dentro una pianta
{ let dmin = 1e9, chi = null; for (let i = 0; i < P.length; i++) { const q = P[i]; if (!inCampagna(q[0])) continue; for (const b of BC) { const R = bRect(b); if (Math.abs(R.cx - q[0]) > 30 || Math.abs(R.cy - q[1]) > 30) continue; const d = sdRect(R, q[0], q[1]); if (d < dmin) { dmin = d; chi = b.id + '@' + q.slice(0, 2).map(Math.round); } } }
  ok(dmin >= 4, `il binario passa ad almeno 4 m dalle case (il più vicino: ${dmin.toFixed(1)} m, ${chi})`); }
ok(L.rail.conflicts === 0, 'nessuna casella di casa sotto il binario');
{ const sg = B.find(b => b.id === 'chiesa_sg'), R = bRect(sg); let d = 1e9; P.forEach(q => { d = Math.min(d, sdRect(R, q[0], q[1])); }); ok(d >= 6, `la Chiesa di San Giacomo sta lontana dal binario (${d.toFixed(1)} m)`); }
// i passaggi a livello: dove una strada asfaltata taglia la linea in piano, la strada e il ferro alla stessa quota
{ const pl = W.pezzi.filter(p => p.tipo === 'passaggio_livello' && p.campagna), road = id => G.MAP.roads.find(r => r.id === id);
  ok(pl.length >= 3, `i passaggi a livello della campagna: ${pl.length} (${(RC.pl || []).filter(q => q.pz).map(q => q.road).join(', ')})`);
  let bad = []; (RC.pl || []).filter(q => q.pz && q.i >= 0).forEach(q => { const h = P[q.i][2], g = G.groundV(q.x, q.y); if (Math.abs(h - .42 - g) > .9) bad.push(q.road + ' ' + (h - g).toFixed(2)); });
  ok(!bad.length, 'ai passaggi a livello il ferro sta sulla strada' + (bad.length ? ': ' + bad.join(', ') : ''));
  const raso = (RA.cross || []).filter(c => inCampagna(c.x)); ok(!raso.length, `nessun incrocio a raso senza passaggio a livello o sottopasso (${raso.map(c => c.road).join(', ')})`); }

// ---------------- le strade ----------------
const RD = G.MAP.roads.filter(r => r.pts && r.pts.length > 1 && !r.rect && r.pts.some(([x]) => inCampagna(x)) && r.pts.every(([x]) => x < XC + 2) && r.kind !== 'citta' && r.kind !== 'vicolo');
{ const bad = []; RD.forEach(r => [r.pts[0], r.pts[r.pts.length - 1]].forEach(p => { if (tileAt(p[0], p[1]) === T.WATER) bad.push(r.id + '@' + p.map(Math.round)); }));
  ok(!bad.length, `nessuna strada finisce in mare (${bad.join(' ') || 'nessuna'})`); }
{ const bad = []; RD.forEach(r => { const m = r.w / 2 - .3; for (const b of BC) { const R = bRect(b); if (r.vialetto && r.id === 'vialetto_' + b.id) continue; const hit = r.pts.find(p => Math.abs(R.cx - p[0]) < 30 && Math.abs(R.cy - p[1]) < 30 && sdRect(R, p[0], p[1]) < m); if (hit) bad.push(r.id + ' in ' + b.id + '@' + hit.map(Math.round)); } });
  ok(!bad.length, `nessuna strada (né vialetto) dentro una casa (${bad.slice(0, 8).join(', ') || 'nessuna'}${bad.length > 8 ? ' …' + bad.length : ''})`); }
{ const SKIP = new Set(['tav_top', 'mulattiera_tav', 'canale_e', 'canale_o']), bad = [];   // le vie del Tavolato le sistema chi lavora sull'altopiano
  RD.forEach(r => { if (SKIP.has(r.id) || r.vialetto) return; [0, r.pts.length - 1].forEach(e => { const [x, y] = r.pts[e]; let bd = 1e9, chi = null; G.MAP.roads.forEach(o => { if (o === r || !o.pts || o.pts.length < 2) return; const d = seg(x, y, o.pts) - o.w / 2; if (d < bd) { bd = d; chi = o.id; } }); if (bd > 1.5 && bd < 8) bad.push(r.id + '→' + chi + ' ' + bd.toFixed(1)); }); });
  ok(!bad.length, `nessun capo a 2-8 m da un'altra strada senza toccarla (${bad.join(', ') || 'nessuno'})`); }
{ const SKIP = new Set(['tav_top', 'mulattiera_tav', 'canale_e', 'canale_o']), bad = [];
  RD.forEach((r, i) => { if (SKIP.has(r.id)) return; RD.forEach((o, j) => { if (j <= i || SKIP.has(o.id)) return; let run = 0, best = 0; for (let k = 1; k < r.pts.length; k++) { const p = r.pts[k], d = seg(p[0], p[1], o.pts); if (d < (r.w + o.w) / 2 * .8) { run += Math.hypot(p[0] - r.pts[k - 1][0], p[1] - r.pts[k - 1][1]); best = Math.max(best, run); } else run = 0; } if (best > 14) bad.push(r.id + '/' + o.id + ' ' + best.toFixed(0) + ' m'); }); });
  ok(!bad.length, `nessuna strada corre sopra un'altra per più di 14 m (oltre l'incrocio) (${bad.join(', ') || 'nessuna'})`); }

// ---------------- gli edifici ----------------
{ const bad = []; for (let i = 0; i < BC.length; i++) for (let j = i + 1; j < BC.length; j++) { const a = BC[i], b = BC[j]; if (Math.abs(a.x - b.x) > 14 || Math.abs(a.y - b.y) > 14) continue; if (sat(corners(a, -.05), corners(b, -.05))) bad.push(a.id + '/' + b.id); }
  ok(!bad.length, `nessuna casa dentro un'altra (${bad.join(', ') || 'nessuna'})`); }
// lo scalino: il terreno attorno alla pianta (1 m fuori) e la posa dell'edificio
{ const bad = []; let worst = 0, chi = null; BC.forEach(b => { if (b.lighthouse) return; const C = corners(b, 1); let lo = 1e9, hi = -1e9; for (let k = 0; k < 4; k++) { const [ax, ay] = C[k], [bx, by] = C[(k + 1) % 4]; for (let t = 0; t <= 1; t += .1) { const x = ax + (bx - ax) * t, y = ay + (by - ay) * t, v = tileAt(x, y); if (v === T.WATER || v === T.BLD || v === T.VIA) continue; const g = G.groundV(x, y); lo = Math.min(lo, g); hi = Math.max(hi, g); } }
    if (lo > hi) return; const step = Math.max(hi - b.base, b.base - lo); if (step > worst) { worst = step; chi = b.id; } if (hi - lo > 2.4 || step > 1.8) bad.push(b.id + ' ' + (hi - lo).toFixed(1)); });
  ok(!bad.length, `nessuna casa a cavallo di uno scalino (attorno alla pianta al più 2,4 m, al più 1,8 dalla posa; il peggiore ${worst.toFixed(1)} m ${chi}${bad.length ? '; ' + bad.slice(0, 8).join(', ') : ''})`); }
{ const nord = B.find(b => b.id === 'miniera'), sud = B.find(b => b.id === 'stazione2'), pz = W.pezzi.filter(p => p.campagna === 'miniera_n' || p.campagna === 'miniera_s');
  ok(nord && sud && nord.pezzo === 'opificio' && sud.pezzo === 'opificio', 'le stazioni di estrazione sono opifici di mattoni con la ciminiera (un pezzo, non scatole colorate)');
  ok(['miniera_n', 'miniera_s'].every(c => ['opificio', 'castelletto', 'tramoggia'].every(t => pz.filter(p => p.campagna === c && p.tipo === t).length === 1)), 'ogni stazione: una sala argani, un castelletto, una tramoggia (niente doppioni)');
  ok(pz.every(p => Math.abs(p.q - (p.campagna === 'miniera_n' ? W.railCampagna.pad.H : W.stazSud.H)) < .01), 'tutto il piazzale alla stessa quota (spianato)'); }
{ const fab = B.filter(b => b.use === 'fabbrica'); ok(fab.length === 2 && fab.every(b => b.warehouse && b.pezzo === 'opificio' && W.pezzi.some(p => p.tipo === 'opificio' && p.b === b.i && p.opz.ciminiera > 0)), `le fabbriche sono capannoni con la ciminiera: ${fab.map(b => b.name).join(', ')}`); }
{ const faro = B.find(b => b.id === 'faro'), sal = B.find(b => b.id === 'salinaio'), rel = b => { let lo = 1e9, hi = -1e9; for (let x = b.x * TS - .5; x <= (b.x + b.w) * TS + .5; x += .5) for (let y = b.y * TS - .5; y <= (b.y + b.h) * TS + .5; y += .5) { if (tileAt(x, y) === T.WATER || tileAt(x, y) === T.BLD) continue; const g = G.groundV(x, y); lo = Math.min(lo, g); hi = Math.max(hi, g); } return hi - lo; };
  ok(rel(faro) < 1.6 && rel(sal) < 1.8, `il faro (${rel(faro).toFixed(1)} m) e la casa del salinaio (${rel(sal).toFixed(1)} m) su un terreno in piano`); }
{ const row = BC.filter(b => b.house && !b.era && (b.y + b.h / 2) * TS < 300 && (b.x + b.w / 2) * TS > 1100), sz = new Set(row.map(b => b.w + 'x' + b.h)); ok(row.length < 6 || sz.size >= 3, `lungo la Costiera Nord niente file di case uguali (${row.length} case, ${sz.size} misure)`); }

console.log(fail ? `\n${fail} prove fallite` : '\ntutto bene');
process.exit(fail ? 1 : 0);
