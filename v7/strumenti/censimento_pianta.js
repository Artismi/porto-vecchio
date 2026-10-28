// [qa_visivo] IL CENSIMENTO DELLA PIANTA: i difetti di posa che si contano sui dati del mondo (world_cittanuova.js, in node: pochi
// secondi), su tutta la mappa, con ogni caso diviso fra quello che resta e quello che sparisce con la mappa nuova (mappa_nuova/piano.md:
// a ovest di x 1022 si taglia, salvo l'Isola delle Palme; l'Isola Grande del Sud si riduce).
//   SUOLO      macchia (una casella di suolo diversa dalle 3-4 vicine, tutte uguali fra loro), buco (acqua chiusa in terra, meno di 6
//              caselle), salto (vicine calpestabili con più di 0,7 m di dislivello, niente scala o scogliera attorno), cambi (lungo l'asse
//              di una via, quante volte cambia il materiale sotto ogni 100 m)
//   CORDOLI    capolinea (una via di città che finisce nel nulla, lontana da altre vie, dall'acqua e dalle case), incrocio_stretto (due
//              vie che si incontrano sotto i 30°: il raccordo del marciapiede non ci sta), scala_in_via (una via di città che passa su
//              caselle di scala: il cordolo si interrompe), vittoria_piega (i pezzi rigidi del cordolo della Vittoria a una piega oltre 6°:
//              la fessura o la sovrapposizione all'esterno), cordolo_porta (un pezzo del cordolo della Vittoria davanti a una porta)
//   PORTE      porta_vuoto (la soglia su acqua, casa, roccia, scogliera), porta_strada (la soglia direttamente sulla carreggiata),
//              porta_doppia (due case con la stessa soglia), porta_quota (la soglia più di 40 cm sopra o sotto il piede della casa)
//   CASE       case_sovrapposte (due lotti che si coprono), cloni (due case accanto con stesso stile, piani e misure)
//   VERDE      albero_via (su via, piazza, scala, casa, acqua), albero_porta (a meno di 1,8 m davanti a una soglia), albero_doppio
//              (due piante a meno di 0,6 m)
//   node strumenti/censimento_pianta.js [uscita.json]
const path = require('path'), fs = require('fs');
const log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {};
const W = require(path.join(__dirname, '..', 'src', 'world_cittanuova.js'));
console.log = log; console.warn = warn;
const T = W.T, TS = W.TS, GW = W.GW, GH = W.GH, B = W.BUILDINGS, ROADS = (W.roads || []).filter(r => r && r.pts && r.pts.length > 1);
const out = path.resolve(process.argv[2] || path.join(__dirname, '..', 'reports', 'censimento_pianta.json'));
const tile = (tx, ty) => tx < 0 || ty < 0 || tx >= GW || ty >= GH ? -1 : W.grid[ty * GW + tx];
const VW = GW + 1, vh = (i, j) => W.quotaRiva ? W.quotaRiva(i, j) : W.vh[j * VW + i];
const hAt = (x, y) => { const i = x / TS, j = y / TS, i0 = Math.floor(i), j0 = Math.floor(j), fx = i - i0, fy = j - j0; return vh(i0, j0) * (1 - fx) * (1 - fy) + vh(i0 + 1, j0) * fx * (1 - fy) + vh(i0, j0 + 1) * (1 - fx) * fy + vh(i0 + 1, j0 + 1) * fx * fy; };
const TN = Object.fromEntries(Object.entries(T).map(([k, v]) => [v, k]));
// la mappa nuova: cosa sparisce
const ISO = id => (W.ISOLE || []).find(q => q.id === id), inIsola = (q, x, y) => { if (!q) return false; const c = Math.cos(-(q.rot || 0)), s = Math.sin(-(q.rot || 0)), dx = x - q.x, dy = y - q.y, u = dx * c - dy * s, v = dx * s + dy * c; return (u / (q.rx * 1.15)) ** 2 + (v / (q.ry * 1.15)) ** 2 < 1; };
const PALME = ISO('palme'), GSUD = (W.ISOLE || []).find(q => /grande|sud/.test(q.id) && q.id !== 'palme');
const tolta = (x, y) => (x < 1022 && !inIsola(PALME, x, y)) || inIsola(GSUD, x, y);
const CITTA = (x, y) => x >= 1202 && x <= 1630 && y >= 230 && y <= 472;
const P = {}, add = (k, x, y, ...r) => (P[k] = P[k] || []).push([Math.round(x), Math.round(y), tolta(x, y) ? 'tolta' : CITTA(x, y) ? 'città' : 'fuori', ...r]);
const GROUND = new Set([T.COB, T.VIA, T.PIAZZA, T.SAND, T.GRASS, T.WALK, T.DIRT, T.FIELD, T.DESERT, T.SALT, T.SHRUB, T.GRAVEL, T.TREE, T.ROCK].filter(v => v !== undefined));
const WALKG = new Set([T.COB, T.VIA, T.PIAZZA, T.WALK, T.DIRT, T.GRASS, T.SAND, T.GRAVEL, T.FIELD].filter(v => v !== undefined));
const SALVA = new Set([T.STAIRS, T.QUAY, T.PIER, T.CLIFF, T.BLD, T.WATER, T.FOUNT, T.ROCK].filter(v => v !== undefined));
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// ---------------- SUOLO ----------------
for (let ty = 1; ty < GH - 1; ty++) for (let tx = 1; tx < GW - 1; tx++) { const t = tile(tx, ty), x = (tx + .5) * TS, y = (ty + .5) * TS;
  if (GROUND.has(t)) { const nb = N4.map(([a, b]) => tile(tx + a, ty + b)); if (nb.every(v => v === nb[0]) && nb[0] !== t && GROUND.has(nb[0]) && t !== T.TREE) add('macchia', x, y, TN[t] + ' in ' + TN[nb[0]]); }
  if (WALKG.has(t)) for (const [a, b] of [[1, 0], [0, 1]]) { const u = tile(tx + a, ty + b); if (!WALKG.has(u)) continue; let salva = false; for (let p = -1; p <= 1 + a && !salva; p++) for (let q = -1; q <= 1 + b && !salva; q++) if (SALVA.has(tile(tx + p, ty + q))) salva = true; if (salva) continue;
    const dh = Math.abs(hAt(x, y) - hAt(x + a * TS, y + b * TS)); if (dh > .7) add('salto', x, y, TN[t] + '/' + TN[u], +dh.toFixed(2)); } }
{ const seen = new Uint8Array(GW * GH); for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) { if (seen[ty * GW + tx] || tile(tx, ty) !== T.WATER) continue;
  const st = [[tx, ty]], comp = []; seen[ty * GW + tx] = 1; let bordo = false; while (st.length && comp.length < 40) { const [a, b] = st.pop(); comp.push([a, b]); if (a <= 0 || b <= 0 || a >= GW - 1 || b >= GH - 1) bordo = true;
    for (const [p, q] of N4) { const u = a + p, v = b + q; if (u < 0 || v < 0 || u >= GW || v >= GH || seen[v * GW + u] || tile(u, v) !== T.WATER) continue; seen[v * GW + u] = 1; st.push([u, v]); } }
  if (!bordo && comp.length < 6 && !st.length) { const cx = comp.reduce((s, c) => s + c[0], 0) / comp.length, cy = comp.reduce((s, c) => s + c[1], 0) / comp.length; add('buco', (cx + .5) * TS, (cy + .5) * TS, comp.length + ' caselle'); } } }
// i cambi di materiale lungo le vie
const cambi = []; ROADS.forEach(rd => { if (rd.kind === 'sterrato') return; let prev = null, n = 0, L = 0; const Q = rd.pts;
  for (let k = 0; k < Q.length - 1; k++) { const [ax, ay] = Q[k], [bx, by] = Q[k + 1], l = Math.hypot(bx - ax, by - ay); for (let s = 0; s < l; s += 1) { const x = ax + (bx - ax) * s / l, y = ay + (by - ay) * s / l, t = tile(Math.floor(x / TS), Math.floor(y / TS)); L++; if (t === T.BLD || t === T.WATER || t === T.PIER) continue; if (prev !== null && t !== prev) { n++; if (n <= 40) add('cambio_via', x, y, rd.id, TN[prev] + '→' + TN[t]); } prev = t; } }
  if (L > 20) cambi.push([rd.id, rd.kind, L, n, +(n / L * 100).toFixed(1)]); });
cambi.sort((a, b) => b[4] - a[4]);
// ---------------- CORDOLI ----------------
const segD = (rd, x, y) => { let d = 1e9; const Q = rd.pts; for (let k = 0; k < Q.length - 1; k++) { const [ax, ay] = Q[k], [bx, by] = Q[k + 1], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)); d = Math.min(d, Math.hypot(ax + dx * t - x, ay + dy * t - y)); } return d; };
const CITYK = new Set(['citta', 'vicolo', 'strada', 'litoranea']);
ROADS.forEach(rd => { if (!CITYK.has(rd.kind)) return; [rd.pts[0], rd.pts[rd.pts.length - 1]].forEach(([x, y], e) => {
  const altra = ROADS.some(o => o !== rd && segD(o, x, y) < o.w / 2 + 2.5); if (altra) return; let vicino = false; const tx = Math.floor(x / TS), ty = Math.floor(y / TS);
  for (let a = -3; a <= 3 && !vicino; a++) for (let b = -3; b <= 3 && !vicino; b++) { const t = tile(tx + a, ty + b); if (t === T.WATER || t === T.QUAY || t === T.PIER || t === -1 || t === T.STAIRS || t === T.PIAZZA) vicino = true; }
  add('capolinea', x, y, rd.id, rd.kind, vicino ? 'su acqua/piazza/scala' : 'nel nulla'); });
  // l'angolo con cui si stacca dalle altre vie (ai capi)
  [[0, 1], [rd.pts.length - 1, rd.pts.length - 2]].forEach(([i, j]) => { const [x, y] = rd.pts[i], [x2, y2] = rd.pts[j], a1 = Math.atan2(y2 - y, x2 - x);
    ROADS.forEach(o => { if (o === rd || !CITYK.has(o.kind) || segD(o, x, y) > o.w / 2 + .5) return; let best = null; const Q = o.pts; for (let k = 0; k < Q.length - 1; k++) { const [ax, ay] = Q[k], [bx, by] = Q[k + 1], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)), d = Math.hypot(ax + dx * t - x, ay + dy * t - y); if (!best || d < best.d) best = { d, a: Math.atan2(dy, dx) }; }
      let da = Math.abs(a1 - best.a) % Math.PI; da = Math.min(da, Math.PI - da) * 180 / Math.PI; if (da < 30) add('incrocio_stretto', x, y, rd.id + '×' + o.id, Math.round(da) + '°'); }); });
  if (rd.kind === 'citta' || rd.kind === 'strada' || rd.kind === 'litoranea') { let dentro = false; const Q = rd.pts; for (let k = 0; k < Q.length - 1; k++) { const [ax, ay] = Q[k], [bx, by] = Q[k + 1], l = Math.hypot(bx - ax, by - ay); for (let s = 0; s < l; s += 1) { const x = ax + (bx - ax) * s / l, y = ay + (by - ay) * s / l, t = tile(Math.floor(x / TS), Math.floor(y / TS)); if (t === T.STAIRS && !dentro) { add('scala_in_via', x, y, rd.id); dentro = true; } else if (t !== T.STAIRS) dentro = false; } } } });
// la Vittoria: i pezzi rigidi del cordolo (render.js buildVittoria2, 1,5 m) a una piega del tracciato
const DOORS = []; B.forEach((b, i) => { if (!b.door) return; const [dx, dy] = b.door; let o = [0, 0]; if (dy >= b.y + b.h) o = [0, 1]; else if (dy < b.y) o = [0, -1]; else if (dx >= b.x + b.w) o = [1, 0]; else if (dx < b.x) o = [-1, 0]; DOORS.push({ b, i, dx, dy, o, x: (dx + .5) * TS, y: (dy + .5) * TS }); });
{ const vit = ROADS.find(r => r.id === 'vittoria'); if (vit) { const h = vit.w / 2, Q = vit.pts; for (let k = 1; k < Q.length - 1; k++) { const a1 = Math.atan2(Q[k][1] - Q[k - 1][1], Q[k][0] - Q[k - 1][0]), a2 = Math.atan2(Q[k + 1][1] - Q[k][1], Q[k + 1][0] - Q[k][0]); let d = Math.abs(Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1))) * 180 / Math.PI; if (d > 6) add('vittoria_piega', Q[k][0], Q[k][1], Math.round(d) + '°', 'fessura ~' + (Math.tan(d * Math.PI / 360) * .3 * 100).toFixed(0) + ' cm per lato'); }
  for (let s = .75, k = 0, acc = 0; k < Q.length - 1; k++) { const [ax, ay] = Q[k], [bx, by] = Q[k + 1], L = Math.hypot(bx - ax, by - ay); if (L < 1e-6) continue; const ux = (bx - ax) / L, uy = (by - ay) / L;
    while (s <= acc + L) { const t = s - acc, x = ax + ux * t, y = ay + uy * t; [-1, 1].forEach(sd => { const cx = x - uy * sd * (h + .15), cy = y + ux * sd * (h + .15); DOORS.forEach(D => { if (Math.hypot(D.x + D.o[0] * TS * .5 - cx, D.y + D.o[1] * TS * .5 - cy) < 1.2) add('cordolo_porta', cx, cy, D.b.id || D.i); }); }); s += 1.5; } acc += L; } } }
// ---------------- PORTE ----------------
const VUOTO = new Set([T.WATER, T.BLD, T.ROCK, T.CLIFF].filter(v => v !== undefined)), soglia = new Map();
DOORS.forEach(D => { const t = tile(D.dx, D.dy), u = tile(D.dx + D.o[0], D.dy + D.o[1]), id = D.b.id || D.i;
  if (VUOTO.has(t)) add('porta_vuoto', D.x, D.y, id, 'soglia ' + TN[t]); else if (VUOTO.has(u) && u !== T.BLD) add('porta_vuoto', D.x, D.y, id, 'davanti ' + TN[u]);
  if (t === T.VIA) add('porta_strada', D.x, D.y, id, D.b.use || D.b.label || '');
  const k = D.dx + ',' + D.dy; if (soglia.has(k)) add('porta_doppia', D.x, D.y, id + '|' + soglia.get(k)); else soglia.set(k, id);
  if (D.b.base !== undefined) { const dq = hAt(D.x, D.y) - D.b.base; if (Math.abs(dq) > .4) add('porta_quota', D.x, D.y, id, +dq.toFixed(2)); } });
// ---------------- CASE ----------------
const RB = B.map((b, i) => ({ b, i, x0: b.x, y0: b.y, x1: b.x + b.w, y1: b.y + b.h }));
for (let a = 0; a < RB.length; a++) for (let c = a + 1; c < RB.length; c++) { const p = RB[a], q = RB[c]; const ox = Math.min(p.x1, q.x1) - Math.max(p.x0, q.x0), oy = Math.min(p.y1, q.y1) - Math.max(p.y0, q.y0);
  if (ox > 0 && oy > 0) { if (p.b.rot || q.b.rot) continue; add('case_sovrapposte', (Math.max(p.x0, q.x0) + ox / 2) * TS, (Math.max(p.y0, q.y0) + oy / 2) * TS, (p.b.id || p.i) + '|' + (q.b.id || q.i), ox * oy + ' caselle'); }
  else if ((ox === 0 && oy > 0) || (oy === 0 && ox > 0)) { const s = (k, v) => p.b[k] === q.b[k]; if (s('style') && s('fl') && s('w') && s('h') && p.b.house && q.b.house && (p.b.era === q.b.era)) add('cloni', (p.x0 + p.x1 + q.x0 + q.x1) / 4 * TS, (p.y0 + p.y1 + q.y0 + q.y1) / 4 * TS, (p.b.id || p.i) + '|' + (q.b.id || q.i), 'stile ' + p.b.style + ' piani ' + p.b.fl); } }
// ---------------- VERDE ----------------
const NONVERDE = new Set([T.VIA, T.COB, T.PIAZZA, T.STAIRS, T.BLD, T.WATER, T.QUAY, T.PIER, T.FOUNT].filter(v => v !== undefined));
const PI = (W.vegetazione && W.vegetazione.piante) || [], GRID = new Map(), gk = (x, y) => Math.floor(x / 4) * 4096 + Math.floor(y / 4);
PI.forEach((p, i) => { const t = tile(Math.floor(p.x / TS), Math.floor(p.y / TS)); if (NONVERDE.has(t)) add('albero_via', p.x, p.y, p.sp, TN[t]);
  const k = gk(p.x, p.y); (GRID.get(k) || GRID.set(k, []).get(k)).push(i); });
PI.forEach((p, i) => { for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) (GRID.get(gk(p.x + a * 4, p.y + c * 4)) || []).forEach(j => { if (j <= i) return; const q = PI[j]; if (Math.hypot(p.x - q.x, p.y - q.y) < .6) add('albero_doppio', p.x, p.y, p.sp + '+' + q.sp); }); });
DOORS.forEach(D => { const fx = D.x + D.o[0] * TS * .5, fy = D.y + D.o[1] * TS * .5; for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) (GRID.get(gk(fx + a * 4, fy + c * 4)) || []).forEach(j => { const q = PI[j]; if (Math.hypot(q.x - fx, q.y - fy) < 1.8) add('albero_porta', q.x, q.y, D.b.id || D.i, q.sp); }); });
// ---------------- stampa ----------------
const DESC = { macchia: 'SUOLO', buco: 'SUOLO', salto: 'SUOLO', cambio_via: 'SUOLO', capolinea: 'CORDOLI', incrocio_stretto: 'CORDOLI', scala_in_via: 'CORDOLI', vittoria_piega: 'CORDOLI', cordolo_porta: 'CORDOLI', porta_vuoto: 'PORTE', porta_strada: 'PORTE', porta_doppia: 'PORTE', porta_quota: 'PORTE', case_sovrapposte: 'CASE', cloni: 'CASE', albero_via: 'VERDE', albero_porta: 'VERDE', albero_doppio: 'VERDE' };
const conti = {}; Object.keys(DESC).forEach(k => { const L = P[k] || [], c = { tot: L.length, città: 0, fuori: 0, tolta: 0 }; L.forEach(q => c[q[2]]++); conti[k] = c; });
console.log('CENSIMENTO DELLA PIANTA (tolta = sparisce con la mappa nuova)\n');
console.log('voce'.padEnd(18) + 'gruppo'.padEnd(9) + 'tot'.padStart(6) + 'città'.padStart(7) + 'fuori'.padStart(7) + 'tolta'.padStart(7));
Object.entries(conti).forEach(([k, c]) => console.log(k.padEnd(18) + DESC[k].padEnd(9) + String(c.tot).padStart(6) + String(c.città).padStart(7) + String(c.fuori).padStart(7) + String(c.tolta).padStart(7)));
const tipi = (k, i) => { const o = {}; (P[k] || []).forEach(q => { o[q[i]] = (o[q[i]] || 0) + 1; }); return Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([a, b]) => a + ' ' + b).join(' · '); };
console.log('\nmacchia per tipo:', tipi('macchia', 3)); console.log('salto per tipo:', tipi('salto', 3)); console.log('albero_via per suolo:', tipi('albero_via', 4)); console.log('porta_vuoto:', tipi('porta_vuoto', 4));
console.log('\ncambi di materiale lungo le vie (per 100 m), i peggiori:'); cambi.slice(0, 12).forEach(c => console.log('  ' + c.join('  ')));
Object.keys(DESC).forEach(k => { const L = (P[k] || []).filter(q => q[2] !== 'tolta'); if (!L.length) return; console.log(`\n${k} (restano ${L.length}), i primi:`); L.slice(0, 8).forEach(q => console.log('  ' + q.join('  '))); });
fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify({ quando: new Date().toISOString(), conti, cambi, casi: P }, null, 1)); console.log('\nsalvato', out);
