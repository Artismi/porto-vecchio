// [altopiano] La prova del Tavolato: cd v7/src && node test_altopiano.js
// 1) la geologia: la parete a maestrale, i gradoni a scirocco, il pianoro che pende verso scirocco, le doline con la pozza, i karren;
// 2) il verde: gariga sul pianoro, lecci nelle doline e nel canalone, roccia nuda sulle pareti;
// 3) si cammina: fra due caselle percorribili vicine al più 1,6 m di salto (oltre è parete, CLIFF); le tre salite (mulattiera,
//    canalone di levante, spaccatura di ponente) portano davvero dal bosco al pianoro, senza salti; il pianoro è tutto raggiungibile;
// 4) i posti di prima ci sono ancora (stessi id), sul Tavolato o attorno, raggiungibili.
const log = console.log, warn = console.warn; console.log = () => { }; console.warn = () => { };
process.env.PV_CITTANUOVA = '1';
const W = require('./world_cittanuova.js'); console.log = log; console.warn = warn;
const T = W.T, GW = W.GW, GH = W.GH, TS = W.TS, TV = W.TAV, E = W.ECO;
let ko = 0; const ok = (c, m) => { console.log((c ? '  ok  ' : '  NO  ') + m); if (!c) ko++; };
const idx = (x, y) => Math.floor(y / TS) * GW + Math.floor(x / TS), cx = i => (i % GW) * TS + 1, cy = i => ((i / GW) | 0) * TS + 1;
const ang = (x, y) => Math.atan2(y - TV.y, x - TV.x), dR = (x, y) => Math.hypot(x - TV.x, y - TV.y) - W.tavR(ang(x, y));
const walk = i => { const v = W.grid[i]; return v !== T.BLD && v !== T.WATER && v !== T.FOUNT && v !== T.TREE && v !== T.CLIFF; };
const F = W.feat, TOP = 2048;
const BF = W.BF, MIO = BF.TOP | BF.WALL | BF.TALUS | BF.CANALE | BF.TERR | BF.LECCI | BF.POZZA;   // le caselle che il Tavolato fa (pianoro, parete, ghiaione, gradoni, canaloni)
const zona = []; for (let i = 0; i < GW * GH; i++) { const x = cx(i), y = cy(i); if (Math.abs(x - TV.x) < 130 && Math.abs(y - TV.y) < 130 && dR(x, y) < 70 && (W.bosco(x, y).f & MIO)) zona.push(i); }
// 1) la geologia
{ let pw = 0, nw = 0, pl = 0, nl = 0;
  for (let k = 0; k < 360; k++) { const a = k / 360 * Math.PI * 2, w = W.tavW(a), R = W.tavR(a); if (W.CANALI.some(c => Math.abs(Math.atan2(Math.sin(a - c.a), Math.cos(a - c.a))) * c.R < c.hw0 + 2)) continue;
    let cl = false; for (let e = -2; e <= 3; e += .5) { const i = idx(TV.x + Math.cos(a) * (R + e), TV.y + Math.sin(a) * (R + e)); if (W.grid[i] === T.CLIFF) cl = true; }
    if (w > .8) { nw++; if (cl) pw++; } else if (w < .1) { nl++; if (cl) pl++; } }
  ok(nw > 60 && pw / nw > .9, `la parete a maestrale: il ciglio è roccia a picco per il ${Math.round(pw / nw * 100)}% (${nw} raggi)`);
  ok(nl > 60 && pl / nl < .35, `a scirocco il ciglio è basso: parete solo nel ${Math.round(pl / nl * 100)}% dei raggi (${nl})`); }
{ const top = zona.filter(i => F[i] & TOP), u = i => (cx(i) - TV.x) * TV.ud[0] + (cy(i) - TV.y) * TV.ud[1];
  const hi = top.filter(i => u(i) < -16), lo = top.filter(i => u(i) > 16), m = A => A.reduce((s, i) => s + W.elev[i], 0) / A.length;
  ok(top.length > 700 && m(hi) - m(lo) > 3, `il pianoro pende verso scirocco: ${m(hi).toFixed(1)} m a maestrale, ${m(lo).toFixed(1)} m a scirocco (${top.length} caselle)`);
  const salto = (a) => { const R = W.tavR(a); return W.elev[idx(TV.x + Math.cos(a) * (R - 6), TV.y + Math.sin(a) * (R - 6))] - W.elev[idx(TV.x + Math.cos(a) * (R + 6), TV.y + Math.sin(a) * (R + 6))]; };
  ok(salto(TV.dip + Math.PI) > 15, `la parete a maestrale salta ${salto(TV.dip + Math.PI).toFixed(1)} m`);
  const rk = top.filter(i => W.grid[i] === T.ROCK).length, tr = top.filter(i => W.grid[i] === T.TREE && W.eco[i] !== E.LECCETA).length;
  ok(rk / top.length > .04, `i campi solcati e i massi sul pianoro: ${(rk / top.length * 100).toFixed(1)}% di roccia`);
  ok(tr / top.length < .05, `sul pianoro al vento quasi niente alberi fuori dalle doline: ${(tr / top.length * 100).toFixed(1)}%`); }
{ const P = W.POZZA, b = W.elev[idx(P.x, P.y)], orlo = [0, 1, 2, 3, 4, 5].map(k => W.elev[idx(P.x + Math.cos(k) * 12, P.y + Math.sin(k) * 12)]), sab = zona.filter(i => (W.grid[i] === T.DIRT || W.grid[i] === T.SAND) && (W.feat[i] & 2048) && Math.hypot(cx(i) - P.x, cy(i) - P.y) < P.r + 2).length;
  ok(orlo.reduce((s, h) => s + h, 0) / orlo.length - b > 3 && sab >= 6, `la Dolina della Pozza: ${(orlo.reduce((s, h) => s + h, 0) / orlo.length - b).toFixed(1)} m sotto l'orlo, ${sab} caselle d'argilla per la pozza`);
  const lec = zona.filter(i => W.eco[i] === E.LECCETA && W.grid[i] === T.TREE).length; ok(lec >= 6, `i lecci nelle doline e nel canalone: ${lec} caselle d'albero`);
  const ga = zona.filter(i => (F[i] & TOP) && (W.eco[i] === E.FARO || W.eco[i] === E.MACCHIA)).length; ok(ga > 600, `gariga e macchia bassa sul pianoro: ${ga} caselle`); }
// 3) si cammina
// la quota su cui si cammina è quella che si vede (W.vh ai vertici, come groundH della grafica): la media dei quattro vertici della casella
const VW = GW + 1, H = i => { const k = ((i / GW) | 0) * VW + (i % GW); return (W.vh[k] + W.vh[k + 1] + W.vh[k + VW] + W.vh[k + VW + 1]) / 4; };
{ const opera = i => [0, 1, -1, GW, -GW].some(o => W.roadW[i + o] > 0);   // le scarpate dei sentieri (scavo e riporto) sono opere, non roccia
  let salti = 0, es = []; for (const i of zona) { if (!walk(i) || opera(i)) continue; for (const j of [i + 1, i + GW]) { if (!walk(j) || opera(j)) continue; const d = Math.abs(H(i) - H(j)); if (d > 1.6) { salti++; if (es.length < 4) es.push(`${cx(i)},${cy(i)} ${d.toFixed(1)} m`); } } }
  ok(salti === 0, `nessun salto oltre 1,6 m fra caselle percorribili vicine (${salti}${es.length ? ': ' + es.join(' · ') : ''})`); }
const segD = (x, y, P) => { let m = 1e9; for (let k = 0; k < P.length - 1; k++) { const [ax, ay] = P[k], [bx, by] = P[k + 1], vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy || 1, t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / L2)); m = Math.min(m, Math.hypot(x - ax - vx * t, y - ay - vy * t)); } return m; };
for (const [id, nome, passo] of [["mulattiera_tav", "la mulattiera", 1.6], ["canale_e", "il canalone di levante", 1.6], ["canale_o", "la spaccatura di ponente (si arrampica: gradini fino a 2 m)", 2]]) {
  const rd = W.roads.find(r => r.id === id); if (!rd) { ok(false, `${nome}: c'è (${id})`); continue; }
  const P = rd.pts, a = idx(...P[0]), b = idx(...P[P.length - 1]), seen = new Set([a]), q = [a]; let hmax = 0;
  const S = [0]; for (let k = 1; k < P.length; k++) S.push(S[k - 1] + Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]));
  for (let k = 1, j = 0; k < P.length; k++) { const L = S[k] - S[j]; if (L < 3) continue; hmax = Math.max(hmax, Math.abs(rd.h[k] - rd.h[j]) / L); j = k; }   // la pendenza lungo il sentiero, su tratti di 3 m
  while (q.length) { const i = q.pop(); for (const j of [i + 1, i - 1, i + GW, i - GW]) { if (seen.has(j) || !walk(j) || Math.abs(H(i) - H(j)) > passo || segD(cx(j), cy(j), P) > 3.5) continue; seen.add(j); q.push(j); } }
  const dz = H(b) - H(a);
  ok(seen.has(b) && dz > 15 && (F[b] & TOP) && hmax <= rd.G + .06, `${nome}: dal bosco (${H(a).toFixed(0)} m) al pianoro (${H(b).toFixed(0)} m) senza salti lungo il sentiero, pendenza massima ${(hmax * 100).toFixed(0)}% (al più ${Math.round(rd.G * 100)}%)`);
}
// raggiungibile a piedi dalla piazza della città (le caselle di adesso: il verde nuovo ha già tolto e messo i suoi alberi)
const R = new Uint8Array(GW * GH); { const s = W.PLACES.piazza.ty * GW + W.PLACES.piazza.tx, q = [s]; R[s] = 1; while (q.length) { const i = q.pop(); for (const j of [i + 1, i - 1, i + GW, i - GW]) if (j >= 0 && j < GW * GH && !R[j] && walk(j)) { R[j] = 1; q.push(j); } } }
{ const top = zona.filter(i => (F[i] & TOP) && walk(i)), fuori = top.filter(i => !R[i]).length; ok(fuori / top.length < .02, `il pianoro è raggiungibile (${fuori} caselle su ${top.length} fuori)`); }
// 4) i posti
for (const id of ['tavolato', 'deserto', 'beduini', 'canalone_e', 'canalone_o', 'bosco_antico', 'campo_p', 'punta', 'saline', 'stazione_n', 'stazione_s', 'dolina', 'belvedere_tav']) {
  const p = W.PLACES[id], i = p ? p.ty * GW + p.tx : -1; ok(p && walk(i) && R[i] && dR(p.x, p.y) < 110, `${id}: ${p ? p.name : 'manca'} ${p ? `(${p.x}, ${p.y}, ${W.elev[i].toFixed(0)} m)` : ''}`); }
{ const P = W.PLACES; ok(dR(P.belvedere_tav.x, P.belvedere_tav.y) > -9 && W.tavW(ang(P.belvedere_tav.x, P.belvedere_tav.y)) > .8, 'il belvedere sta sul ciglio della parete a maestrale');
  ok([P.tavolato, P.deserto, P.beduini, P.dolina].every(p => F[p.ty * GW + p.tx] & TOP), 'il Tavolato, la prateria, l\'accampamento e la dolina stanno sul pianoro'); }
console.log(ko ? `\n${ko} controlli NON passati` : '\ntutto a posto'); process.exit(ko ? 1 : 0);
