// [nitida] I MURI VAGANTI della città nuova, misurati sui dati del mondo (world_cittanuova.js, in node: pochi secondi). Il committente:
// «muri che continuano fuori dalle case». Per ogni cosa a forma di muro che il mondo posa (le cortine dei portici, i parapetti, i muretti
// della strada sul mare, i muri dei terrapieni, i muri del Recinto e delle mura) si chiede:
//   fuori_casa   la cortina dei portici (le arcate coi piani sopra) che continua dove dietro non c'è una casa: un muro di due piani
//                ritto nel vuoto fra due case (m di cortina senza casa dietro, e i tratti)
//   carreggiata  un muro o un parapetto dentro la carreggiata di una via (oltre 30 cm dal bordo)
//   dentro_casa  un muro che entra in una casa (oltre 30 cm)
//   moncone      un pezzo di muro isolato, corto (≤ 2 m), senza niente a cui attaccarsi: un avanzo
//   casetta      una casetta piccola (≤ 36 m²) senza nome né bottega, libera in mezzo al selciato o incastrata fra due tratti di carreggiata
//                (la regola di casette() in world_cittanuova.js, che le toglie: W.casetteTolte; quelle appoggiate a un'altra casa
//                restano, sono tetti dei giri sui tetti)
//   marciapiede_stretto  una casa col fronte a meno di 1,5 m dal bordo della carreggiata: il marciapiede ne resta una striscia
//   casa_in_carreggiata  una casa che entra nella carreggiata
// (il muro del posto di blocco attraversa la Vittoria apposta: è un varco, non si conta) e la cortina dei portici lunga in tutto (per il conto per km). Stampa i conti (città e isola intera), i casi con le coordinate e salva
// reports/muri_vaganti.json.   node strumenti/muri_vaganti.js [uscita.json]
//   prima/dopo: git show HEAD~1:v7/src/world_cittanuova.js > /tmp/w.js && PV_MONDO=/tmp/w.js node strumenti/muri_vaganti.js prima.json
const path = require('path'), fs = require('fs');
const log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {};
global.World = require(process.env.PV_MONDO ? path.resolve(process.env.PV_MONDO) : path.join(__dirname, '..', 'src', 'world_cittanuova.js'));
console.log = log; console.warn = warn;
const W = World, T = W.T, TS = W.TS, GW = W.GW, GH = W.GH, G = W.grid, B = W.BUILDINGS;
const out = path.resolve(process.argv[2] || path.join(__dirname, '..', 'reports', 'muri_vaganti.json'));
const CORNICE = [1202, 230, 1630, 472], inC = (x, y) => x >= CORNICE[0] && x <= CORNICE[2] && y >= CORNICE[1] && y <= CORNICE[3];
const tile = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return tx < 0 || ty < 0 || tx >= GW || ty >= GH ? -1 : G[ty * GW + tx]; };
// dentro una casa (il rettangolo vero, girato se la casa gira), con un margine
const BH = new Map(); B.forEach(b => { if (b.pezzo) return; for (let i = Math.floor(b.x * TS / 16) - 1; i <= Math.floor((b.x + b.w) * TS / 16) + 1; i++) for (let j = Math.floor(b.y * TS / 16) - 1; j <= Math.floor((b.y + b.h) * TS / 16) + 1; j++) { const k = i * 4096 + j; if (!BH.has(k)) BH.set(k, []); BH.get(k).push(b); } });
const inCasa = (x, y, m) => (BH.get(Math.floor(x / 16) * 4096 + Math.floor(y / 16)) || []).some(b => { const cx = (b.x + b.w / 2) * TS, cy = (b.y + b.h / 2) * TS, a = b.rot || 0, c = Math.cos(a), s = Math.sin(a), dx = x - cx, dy = y - cy, u = dx * c + dy * s, v = -dx * s + dy * c; return Math.abs(u) < b.w * TS / 2 - m && Math.abs(v) < b.h * TS / 2 - m; });
// la carreggiata: distanza dall'asse di una via asfaltata o lastricata (non i sentieri) meno la mezza larghezza
const RD = (W.roads || []).filter(r => r && r.pts && r.pts.length > 1 && r.kind !== 'sentiero' && r.kind !== 'sterrato' && !r.traccia);
const RH = new Map(); RD.forEach(rd => { for (let k = 0; k < rd.pts.length - 1; k++) { const [ax, ay] = rd.pts[k], [bx, by] = rd.pts[k + 1]; for (let i = Math.floor(Math.min(ax, bx) / 16) - 1; i <= Math.floor(Math.max(ax, bx) / 16) + 1; i++) for (let j = Math.floor(Math.min(ay, by) / 16) - 1; j <= Math.floor(Math.max(ay, by) / 16) + 1; j++) { const kk = i * 4096 + j; if (!RH.has(kk)) RH.set(kk, []); RH.get(kk).push([ax, ay, bx, by, rd.w || 4, rd.id]); } } });
const inCarr = (x, y, m) => { for (const q of RH.get(Math.floor(x / 16) * 4096 + Math.floor(y / 16)) || []) { const dx = q[2] - q[0], dy = q[3] - q[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - q[0]) * dx + (y - q[1]) * dy) / L2)); if (Math.hypot(q[0] + dx * t - x, q[1] + dy * t - y) < q[4] / 2 - m) return q[5]; } return null; };
// tutti i muri come segmenti: [x0, y0, x1, y1, tipo, nome]
const MURI = [];
// i pezzi girano come three.js (rotation.y): la x locale va a (cos r, −sin r) nel piano del mondo, la z locale a (sin r, cos r)
(W.pezzi || []).forEach(p => { const c = Math.cos(p.rot || 0), s = -Math.sin(p.rot || 0), seg = (L, nome) => MURI.push([p.x, p.y, p.x + c * L, p.y + s * L, p.tipo, nome || p.nome || p.tipo]);
  if (p.tipo === 'parapetto' || (p.tipo === 'muro_garante' && !p.opz.posto_blocco) || p.tipo === 'mura_tramontana' || p.tipo === 'cortina' || p.tipo === 'gradone') seg(p.opz.L || 0); });
((W.SEA && W.SEA.costa2 && W.SEA.costa2.muretti) || []).forEach(q => { const ux = -q.ny, uy = q.nx; MURI.push([q.x - ux, q.y - uy, q.x + ux, q.y + uy, 'muretto', 'Muretto della strada sul mare']); });
((W.SEA && W.SEA.terrapieni) || []).forEach(q => MURI.push([q.x, q.y, q.x + q.ux * q.L, q.y + q.uy * q.L, 'terrapieno', 'Muro del terrapieno']));
const P = { fuori_casa: [], carreggiata: [], dentro_casa: [], moncone: [], casetta: [], marciapiede_stretto: [], casa_in_carreggiata: [] }, conto = { caseArretrate: (W.caseArretrate || []).length, cortina: 0, cortinaFuori: 0, casetteTolte: (W.casetteTolte || []).length, muri: MURI.length };
// 1) la cortina dei portici: lungo il fronte (x del pezzo, campate × campata), dietro (dal lato delle case, a profondità + 1 m) deve esserci una casa
(W.pezzi || []).filter(p => p.tipo === 'portico').forEach(p => { const L = p.opz.campate * p.opz.campata, c = Math.cos(p.rot || 0), s = -Math.sin(p.rot || 0), nx = -s, ny = c, d = (p.opz.profondita || 3.6) / 2 + 1.2;
  const casa = (t, sd) => tile(p.x + c * t + nx * sd * d, p.y + s * t + ny * sd * d) === T.BLD;
  let n0 = 0, n1 = 0; for (let t = .25; t < L; t += .5) { if (casa(t, 1)) n0++; if (casa(t, -1)) n1++; } const sd = n0 >= n1 ? 1 : -1;
  let run = null; const chiudi = () => { if (run && run[1] - run[0] > .6) { const t = (run[0] + run[1]) / 2, x = p.x + c * t, y = p.y + s * t; P.fuori_casa.push([Math.round(x), Math.round(y), p.nome, +(run[1] - run[0]).toFixed(1), p.opz.piani]); if (inC(x, y)) conto.cortinaFuori += run[1] - run[0]; } run = null; };
  for (let t = .25; t < L; t += .5) { if (!casa(t, sd)) { if (!run) run = [t - .25, t + .25]; else run[1] = t + .25; } else chiudi(); } chiudi();
  if (inC(p.x, p.y)) conto.cortina += L; });
// 2) i muri: nella carreggiata, dentro una casa, i monconi
const vicini = (m, i) => MURI.some((o, j) => j !== i && [[o[0], o[1]], [o[2], o[3]]].some(([x, y]) => [[m[0], m[1]], [m[2], m[3]]].some(([a, b]) => Math.hypot(x - a, y - b) < .6)));
MURI.forEach((m, i) => { const L = Math.hypot(m[2] - m[0], m[3] - m[1]), mx = (m[0] + m[2]) / 2, my = (m[1] + m[3]) / 2; let nc = 0, nd = 0, via = null;
  for (let t = .25; t < L; t += .5) { const x = m[0] + (m[2] - m[0]) * t / L, y = m[1] + (m[3] - m[1]) * t / L, r = inCarr(x, y, .3); if (r) { nc++; via = r; } if (inCasa(x, y, .3)) nd++; }
  if (nc) P.carreggiata.push([Math.round(mx), Math.round(my), m[5], +(nc * .5).toFixed(1), via]);
  if (nd) P.dentro_casa.push([Math.round(mx), Math.round(my), m[5], +(nd * .5).toFixed(1)]);
  if (L <= 2.05 && !vicini(m, i) && tile(mx, my) !== T.BLD && ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => tile(m[0] + a * 1.2, m[1] + b * 1.2) === T.BLD || tile(m[2] + a * 1.2, m[3] + b * 1.2) === T.BLD)) P.moncone.push([Math.round(mx), Math.round(my), m[5], +L.toFixed(1)]); });
// 3) le casette di troppo: piccole (≤ 36 m²), senza nome né bottega, quasi tutte libere in mezzo al selciato o incastrate fra due tratti
// di carreggiata (la regola di casette() in world_cittanuova.js; W.casetteTolte: quelle che il mondo ha già tolto)
{ const OPEN = new Set([T.VIA, T.WALK, T.PIAZZA, T.COB]), LARGO = new Set([T.VIA, T.WALK, T.PIAZZA]), luogo = new Set(Object.values(W.PLACES || {}).map(p => p && p.id));
  const lato = (b, a, c) => { let n = 0, t = 0; if (a) { const tx = a > 0 ? b.x + b.w : b.x - 1; for (let ty = b.y; ty < b.y + b.h; ty++) { t++; if (W.roadW[ty * GW + tx] > 0) n++; } } else { const ty = c > 0 ? b.y + b.h : b.y - 1; for (let tx = b.x; tx < b.x + b.w; tx++) { t++; if (W.roadW[ty * GW + tx] > 0) n++; } } return t && n * 2 >= t; };
  const PORT = (W.pezzi || []).filter(p => p.tipo === 'portico').map(p => { const L = p.opz.campate * p.opz.campata, x0 = Math.cos(p.rot || 0) < 0 ? p.x - L : p.x; return [x0, x0 + L, p.y]; });
  const dietroPortico = b => { const cx = (b.x + b.w / 2) * TS, cy = (b.y + b.h / 2) * TS; return PORT.some(([x0, x1, y]) => cx > x0 - 2 && cx < x1 + 2 && Math.abs(cy - y) < 4 + b.h * TS / 2); };
  B.forEach(b => { if (dietroPortico(b)) return; if (!b.house || b.pezzo || b.shack || b.name || b.shop || b.shopFront || b.sign || b.military || b.kiosk || b.vittoria || b.sottoPortico || b.portico || b.lighthouse || b.isola || luogo.has(b.id) || (b.use && b.use !== 'casa') || b.w * b.h > 9) return;
    if (W.zone[b.y * GW + b.x] !== W.Z.CITTA) return; const R = []; for (let ty = b.y - 1; ty <= b.y + b.h; ty++) for (let tx = b.x - 1; tx <= b.x + b.w; tx++) if (tx === b.x - 1 || tx === b.x + b.w || ty === b.y - 1 || ty === b.y + b.h) R.push(G[ty * GW + tx]);
    const q = R.filter(v => OPEN.has(v)).length / R.length, l = R.filter(v => LARGO.has(v)).length / R.length, inc = (lato(b, 1, 0) && lato(b, -1, 0)) || (lato(b, 0, 1) && lato(b, 0, -1));
    if ((q >= .75 || l >= .6 || inc) && !(b.w * b.h > 2 && R.includes(T.BLD))) P.casetta.push([Math.round((b.x + b.w / 2) * TS), Math.round((b.y + b.h / 2) * TS), b.id, b.w * TS + 'x' + b.h * TS, inc ? 'incastrata' : 'libera ' + Math.round(q * 100) + '%']); }); }
// 4) le case sul marciapiede: il fronte (spigoli compresi) a meno di 1,5 m dal bordo della carreggiata di una via di città (il marciapiede
// è la fascia di 2,1 m oltre il bordo: ne resta una striscia), o dentro la carreggiata. Le arretra arretra() in world_cittanuova.js; dove non
// si può (case di due caselle, botteghe girate dall'altra parte) render.js chiude lì il marciapiede (swField, [nitida])
{ const RU = (W.roads || []).filter(rd => rd && rd.pts && rd.pts.length > 1 && (rd.kind === 'citta' || rd.kind === 'litoranea'));
  const bordo = (x, y) => { let d = 1e9, id = null; RU.forEach(rd => { for (let k = 0; k < rd.pts.length - 1; k++) { const [ax, ay] = rd.pts[k], [bx, by] = rd.pts[k + 1], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)), e = Math.hypot(ax + dx * t - x, ay + dy * t - y) - (rd.w || 6) / 2; if (e < d) { d = e; id = rd.id; } } }); return [d, id]; };
  B.forEach(b => { if (b.pezzo) return; const cx = (b.x + b.w / 2) * TS, cy = (b.y + b.h / 2) * TS; if (!inC(cx, cy)) return; const a = b.rot || 0, c = Math.cos(a), s = Math.sin(a), hw = b.w * TS / 2, hh = b.h * TS / 2; let best = [1e9, null];
    for (let k = 0; k <= 8; k++) for (const [u, v] of [[-hw + 2 * hw * k / 8, -hh], [-hw + 2 * hw * k / 8, hh], [-hw, -hh + 2 * hh * k / 8], [hw, -hh + 2 * hh * k / 8]]) { const r = bordo(cx + u * c - v * s, cy + u * s + v * c); if (r[0] < best[0]) best = r; }
    if (best[0] < 0) P.casa_in_carreggiata.push([Math.round(cx), Math.round(cy), b.id, b.name || '', best[1], +best[0].toFixed(2)]); else if (best[0] < 1.5) P.marciapiede_stretto.push([Math.round(cx), Math.round(cy), b.id, b.name || '', best[1], +best[0].toFixed(2)]); }); }
conto.cortina = +conto.cortina.toFixed(1); conto.cortinaFuori = +conto.cortinaFuori.toFixed(1);
log('MURI VAGANTI (città: x ' + CORNICE[0] + '-' + CORNICE[2] + ', y ' + CORNICE[1] + '-' + CORNICE[3] + ')');
log('casette tolte dal mondo', conto.casetteTolte, '· case arretrate dal marciapiede', conto.caseArretrate, '· muri misurati', conto.muri, '· cortina dei portici in città', conto.cortina, 'm, di cui senza casa dietro', conto.cortinaFuori, 'm');
const tab = {}; Object.keys(P).forEach(k => { const c = P[k].filter(q => inC(q[0], q[1])).length; tab[k] = { citta: c, isola: P[k].length }; log(k.padEnd(13), 'città', String(c).padStart(4), '· isola', String(P[k].length).padStart(4)); });
Object.keys(P).forEach(k => { const L = P[k].filter(q => inC(q[0], q[1])); if (L.length) log('  ' + k + ':', L.slice(0, 12).map(q => q.join(' ')).join(' | ')); });
fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify({ quando: new Date().toISOString(), conto, tab, casi: P }, null, 1));
log('salvato', out);
