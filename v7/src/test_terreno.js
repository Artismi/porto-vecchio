// [campagna-b] La prova del terreno della campagna (x < 1240): cd v7/src && node test_terreno.js --seme=12345
// Le due misure dell'audit del terreno (campagna/terreno.md), più le vie del pianoro:
// 1) le discontinuità dritte: righe o colonne di vertici dove il terreno salta più di 2 m da un vertice al vicino per almeno 14 m.
//    Prima erano 44 (le trincee nord-sud dei tipi di riva, il gradino a 64-72 m dalla riva, i capi della parete). Contano quelle
//    «nude»: non coperte dalla roccia (CLIFF, ROCK), dalla parete del Tavolato, da una strada coi suoi tagli e muri, dall'acqua;
// 2) il nastro del ciglio del Tavolato: su 720 angoli il profilo da -10 a +30 m dal ciglio; dove la grafica non disegna la parete
//    (W.tavParete) un salto di oltre 2,5 m in 2 m è un difetto se non sta sulla roccia (i gradoni ora sono fasce di roccia). Prima 203;
// 3) la costa: nessuna cala più stretta di 18 m fuori città; il collo non scende più al livello del mare;
// 4) le vie del pianoro (Traccia e Mulattiera del Tavolato): pendenza sul terreno, spigoli, punti doppi, il fuoco dei beduini fuori.
const log = console.log, warn = console.warn; console.log = () => { }; console.warn = () => { };
process.env.PV_CITTANUOVA = '1';
const W = require('./world_cittanuova.js'); console.log = log; console.warn = warn;
const T = W.T, GW = W.GW, GH = W.GH, TS = W.TS, VW = W.VW, TV = W.TAV;
let ko = 0; const ok = (c, m) => { console.log((c ? '  ok  ' : '  NO  ') + m); if (!c) ko++; };
const X1 = Math.floor(1240 / TS);   // la campagna: fino a x 1240 (la città comincia a 1200, il controllo ne guarda il bordo)
const VH = (i, j) => W.vh[Math.max(0, Math.min(GH, j)) * VW + Math.max(0, Math.min(GW, i))];
const gH = (x, z) => { const fx = x / TS, fz = z / TS, i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j; return VH(i, j) * (1 - u) * (1 - v) + VH(i + 1, j) * u * (1 - v) + VH(i, j + 1) * (1 - u) * v + VH(i + 1, j + 1) * u * v; };
const tile = (tx, ty) => tx < 0 || ty < 0 || tx >= GW || ty >= GH ? -1 : ty * GW + tx;
const ROCCIA = new Set([T.CLIFF, T.ROCK]);
const coperta = i => i < 0 || ROCCIA.has(W.grid[i]) || W.grid[i] === T.WATER || W.roadW[i] > 0 || (W.feat[i] & (1024 | 16384));   // roccia, acqua, strada, taglio, muro di sostegno
const ang = (x, y) => Math.atan2(y - TV.y, x - TV.x), eT = (x, y) => Math.hypot(x - TV.x, y - TV.y) - W.tavR(ang(x, y));
const parete = (x, y) => Math.abs(eT(x, y)) < 5 && W.tavParete(ang(x, y));

// ---------------- 1. le discontinuità dritte ----------------
{ const runs = []; let nude = 0;
  const scan = (len, at, cover) => { let a = -1, nN = 0; for (let k = 0; k <= len; k++) { const s = k < len && at(k) > 2; if (s && a < 0) { a = k; nN = 0; } if (s && !cover(k)) nN++; if (!s && a >= 0) { if (k - 1 - a >= 7) runs.push({ L: (k - 1 - a) * TS, nuda: nN > (k - a) / 2 }); a = -1; } } };
  for (let i = 0; i < X1; i++) scan(GH, j => Math.abs(VH(i + 1, j) - VH(i, j)), j => coperta(tile(i, j - 1)) || coperta(tile(i, j)) || parete(i * TS + 1, j * TS));   // il salto fra due colonne di vertici
  for (let j = 0; j <= GH; j++) scan(X1, i => Math.abs(VH(i, j + 1) - VH(i, j)), i => coperta(tile(i - 1, j)) || coperta(tile(i, j)) || parete(i * TS, j * TS + 1));
  runs.forEach(r => { if (r.nuda) nude++; });
  ok(runs.length <= 40, `discontinuità dritte di almeno 14 m: ${runs.length} (prima 44; soglia 40)`);
  ok(nude <= 12, `di cui nude (erba o terra, senza roccia, parete, strada o acqua): ${nude} (soglia 12)`);
}
// ---------------- 2. il nastro del ciglio del Tavolato ----------------
{ let raw = 0, nudi = 0, pareteA = 0, varchi = 0; const NA = 720;
  for (let k = 0; k < NA; k++) { const a = k / NA * 2 * Math.PI, R = W.tavR(a); if (W.tavParete(a)) { pareteA++; continue; } if (W.tavVarco(a) && W.tavW(a) > .05) varchi++;
    const P = [], R0 = []; for (let d = -10; d <= 30; d += .5) { const x = TV.x + Math.cos(a) * (R + d), y = TV.y + Math.sin(a) * (R + d); P.push(gH(x, y)); R0.push(ROCCIA.has(W.grid[tile(Math.floor(x / TS), Math.floor(y / TS))])); }
    let mx = 0, mxN = 0; for (let i = 4; i < P.length; i++) { const dd = P[i - 4] - P[i]; mx = Math.max(mx, dd); let r = 0; for (let q = i - 4; q <= i; q++) if (R0[q]) r++; if (r < 3) mxN = Math.max(mxN, dd); }
    if (mx > 2.5) raw++; if (mxN > 2.5) nudi++; }
  ok(pareteA >= 240, `la parete disegnata copre ${pareteA} angoli su 720 (prima 225), aperta solo nel varco di ponente (${varchi} angoli)`);
  ok(varchi >= 10 && varchi <= 30, `il varco del canalone di ponente sta dove il canalone taglia davvero il ciglio: ${varchi} angoli`);
  ok(raw <= 160, `angoli senza parete con un salto oltre 2,5 m in 2 m: ${raw} (prima 203; soglia 160: i gradoni ora sono fasce di roccia, i tagli della mulattiera; il ciglio a lobi è più lungo)`);
  ok(nudi <= 30, `di cui senza roccia (erba stirata): ${nudi} (soglia 30)`);
}
// ---------------- 3. la costa e il collo ----------------
{ const strette = []; for (const sd of ['N', 'S']) { const L = W.COSTA2[sd]; for (let k = 0; k < L.length - 1; k++) if ((L[k][1] === 'cala' || L[k][1] === 'foce') && L[k + 1][0] < 1160 && L[k + 1][0] - L[k][0] < 18) strette.push(sd + L[k][0]); }
  ok(!strette.length, `nessuna cala o foce più stretta di 18 m fuori città ${strette.join(' ')}`);
  const H = []; for (let x = 905; x <= 990; x += 3) for (let y = 300; y <= 400; y += 3) if (W.inland(x, y) >= 40) H.push(gH(x, y)); H.sort((a, b) => a - b);
  const med = H[H.length >> 1], basso = H.filter(h => h < 1.5).length / H.length;
  ok(med > 2.8 && basso < .15, `il collo lontano dalla riva non è più una conca al livello del mare: quota mediana ${med.toFixed(1)} m (prima 0,9), sotto 1,5 m il ${(basso * 100).toFixed(0)}% (solo i valloni)`);
  // il gradino di Inland0: da 64 m in là la distanza dalla riva era quella in verticale (salto 48 → 66 m): niente più salti di 2 m in 3 m sulla colonna x 960
  let st = 0; for (let y = 240; y < 420; y++) st = Math.max(st, Math.abs(gH(960, y + 3) - gH(960, y))); ok(st < 2, `nessun gradino parallelo alla riva sulla colonna x 960 (salto massimo ${st.toFixed(1)} m in 3 m)`);
}
// la Forra e la Fiumara incise: in tre sezioni il fondo sta almeno 1,2 m sotto le sponde a 8 m (prima la Forra era solo verde)
for (const [nome, A, B] of [['Forra', [770, 414], [791, 424]], ['Forra', [791, 424], [814, 429]], ['Fiumara', [1090, 372], [1082, 386]]]) {
  const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, L = Math.hypot(B[0] - A[0], B[1] - A[1]), nx = -(B[1] - A[1]) / L, ny = (B[0] - A[0]) / L;
  let fondo = 1e9, fx = 0; for (let d = -4; d <= 4; d += .5) { const h = W.rawElev(mx + nx * d, my + ny * d); if (h < fondo) { fondo = h; fx = d; } }
  const sp = Math.min(W.rawElev(mx + nx * (fx + 8), my + ny * (fx + 8)), W.rawElev(mx + nx * (fx - 8), my + ny * (fx - 8)));
  ok(sp - fondo >= 1.2, `${nome} incisa in (${mx.toFixed(0)}, ${my.toFixed(0)}): il fondo ${(sp - fondo).toFixed(1)} m sotto la sponda più bassa`); }
// ---------------- 4. le vie del pianoro ----------------
for (const [id, Gmax] of [['tav_top', .22], ['mulattiera_tav', .22]]) {
  const r = W.roads.find(q => q.id === id); if (!r) { ok(false, `manca ${id}`); continue; }
  const P = r.pts, n = P.length, s = [0]; for (let k = 1; k < n; k++) s.push(s[k - 1] + Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]));
  let g = 0, gp = 0; for (let k = 0; k < n; k++) for (let j = k + 1; j < n; j++) if (s[j] - s[k] >= 8) { g = Math.max(g, Math.abs(gH(...P[j]) - gH(...P[k])) / (s[j] - s[k])); gp = Math.max(gp, Math.abs(r.h[j] - r.h[k]) / (s[j] - s[k])); break; }
  let amax = 0, smin = 1e9; for (let k = 1; k < n - 1; k++) { const ax = P[k][0] - P[k - 1][0], ay = P[k][1] - P[k - 1][1], bx = P[k + 1][0] - P[k][0], by = P[k + 1][1] - P[k][1], la = Math.hypot(ax, ay), lb = Math.hypot(bx, by); smin = Math.min(smin, la); amax = Math.max(amax, Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb || 1)))) * 57.3); }
  ok(g <= Gmax && gp <= Gmax, `${id}: pendenza sul terreno ${(g * 100).toFixed(0)}%, del profilo ${(gp * 100).toFixed(0)}% su 8 m (prima 53% e 43%; limite ${Gmax * 100}%)`);
  ok(amax <= 45 && smin >= .4, `${id}: spigolo massimo ${amax.toFixed(0)}° fra segmenti, segmento minimo ${smin.toFixed(2)} m (prima 104° su punti a 0,1 m)`);
}
{ const B = W.PLACES.beduini; let dm = 1e9; for (const id of ['tav_top', 'mulattiera_tav']) { const r = W.roads.find(q => q.id === id); for (let k = 1; k < r.pts.length; k++) { const a = r.pts[k - 1], b = r.pts[k], dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((B.x - a[0]) * dx + (B.y - a[1]) * dy) / (dx * dx + dy * dy || 1))); dm = Math.min(dm, Math.hypot(B.x - a[0] - dx * t, B.y - a[1] - dy * t)); } }
  ok(dm >= 6, `il fuoco dei beduini sta fuori dalle tracce: a ${dm.toFixed(1)} m (prima 0,5 m)`); }
// ---------------- 5. [costa-ferrovia] la riva lungo la ferrovia, il mare sotto le costiere, il contorno del Tavolato ----------------
// la riva accanto alla ferrovia (x 1076-1220): prima la falesia di 9-10 m finiva sulla caletta a 0,6 m con un muro dritto nord-sud
{ let mx = 0, at = ''; for (let x = 1080; x < 1216; x += 2) for (let y = 236; y < 300; y += 2) { const a = W.rawElev(x, y), b = W.rawElev(x + 2, y), c = W.rawElev(x, y + 2); if (a < -1 || b < -1 || c < -1) continue;
    const ds = Math.max(Math.abs(b - a), Math.abs(c - a)); if (ds > mx) { mx = ds; at = `${x},${y}`; } }
  ok(mx < 2.6, `la riva accanto alla ferrovia senza gradini: salto massimo ${mx.toFixed(1)} m in 2 m (${at}; prima 8,7)`); }
{ let n = 0; for (const rd of W.roads) { if (rd.kind !== 'litoranea') continue; const half = rd.w / 2; for (const [x, y] of rd.pts) for (let dy = -half; dy <= half; dy += 1) for (let dx = -half; dx <= half; dx += 1) { if (dx * dx + dy * dy > half * half) continue; const i = tile(Math.floor((x + dx) / TS), Math.floor((y + dy) / TS)); if (i >= 0 && W.grid[i] === T.WATER) n++; } }
  ok(n === 0, `il mare non entra nella carreggiata delle costiere: ${n} punti (prima 11 caselle)`); }
{ const R = []; for (let k = 0; k < 360; k++) R.push(W.tavR(k / 360 * 2 * Math.PI)); const m = R.reduce((s, v) => s + v, 0) / R.length, sd = Math.sqrt(R.reduce((s, v) => s + (v - m) * (v - m), 0) / R.length);
  let curv = 0; for (let k = 0; k < 360; k++) { const d2 = R[(k + 1) % 360] - 2 * R[k] + R[(k + 359) % 360]; if (d2 > .15) curv++; }
  ok(sd / m > .14 && curv >= 20, `il contorno del Tavolato non è un'ellisse: scarto ${(sd / m * 100).toFixed(0)}% del raggio medio ${m.toFixed(0)} m, ${curv} gradi di ciglio rientrante (speroni e anfiteatri)`); }
console.log(ko ? `\n${ko} controlli NON passati` : '\ntutto a posto'); process.exit(ko ? 1 : 0);
