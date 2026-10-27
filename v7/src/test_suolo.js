// [suolo] la prova della gerarchia dei suoli (src/suolo.js) su tutta la mappa della città nuova: conta, a passi di mezzo metro, i punti
// dove due tipi di suolo incompatibili stanno uno sopra l'altro, come li disegnano pavimenti.js (la mappa dei materiali) e render.js
// (la tela, i marciapiedi rialzati):
//   via_sopra       una via disegnata su un suolo più alto di lei: la carreggiata sulla piazza pedonale o su un'opera, i basoli di un
//                   vicolo o la terra di un sentiero su una piazza (anche carrabile), su una scala, su una fontana;
//   marciapiede     il marciapiede rialzato sopra una piazza o un'opera;
//   marc_su_via     il marciapiede rialzato sopra la carreggiata disegnata di una via dei veicoli.
// L'obiettivo è zero in tutte e tre. --prima: gli stessi conti senza la gerarchia (com'era), per il confronto.
// E la segnaletica orizzontale (segnaletica.js e la tela di render.js), un solo strato per punto:
//   doppioni        un segno (STOP, linea d'arresto, zebra, mezzeria, stallo) che la tela dipinge anche sotto la decalcomania;
//   arresto_zebra   una linea d'arresto sopra le strisce pedonali, o a meno di 1 m dal loro bordo;
//   arresto_verso   una linea d'arresto o uno STOP sulla corsia da cui le auto escono (non su quella di chi arriva all'incrocio).
// node src/test_suolo.js [--prima]
const path = require('path'), fs = require('fs'), src = __dirname;
const PRIMA = process.argv.includes('--prima');
const log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {};
global.World = require(path.join(src, 'world_cittanuova.js')); global.Interior = require(path.join(src, 'interiors.js')); global.Game = require(path.join(src, 'game.js'));
global.Chiarezza = require(path.join(src, 'chiarezza.js')); global.Vievive = require(path.join(src, 'vievive.js'));
global.Scena = require(path.join(src, 'scena.js')); global.Rete = require(path.join(src, 'rete.js'));
Scena.init(Game); Scena.piano(); Rete.init(Game, Scena);
global.Suolo = require(path.join(src, 'suolo.js')); if (PRIMA) Suolo.vecchio(true);
const SG = require(path.join(src, 'segnaletica.js')); SG.piano();
console.log = log; console.warn = warn;
const W = World, T = W.T, TS = W.TS, GW = W.GW, GH = W.GH, S = Suolo.di(W), R = Suolo.R;
// le vie come le disegna pavimenti.js: quelle del mondo più le vie cucite (pavimenti.js vieTutte)
global.THREE = global.THREE || { Vector3: function () { this.set = () => this; }, Box3: function () {} };
const PV = new Function(fs.readFileSync(path.join(src, 'pavimenti.js'), 'utf8') + '\nreturn Pavimenti;')();
const gT = (tx, ty) => tx < 0 || ty < 0 || tx >= GW || ty >= GH ? -1 : W.grid[ty * GW + tx];
const geo1 = rd => { const s = [0]; for (let k = 1; k < rd.pts.length; k++) s.push(s[k - 1] + Math.hypot(rd.pts[k][0] - rd.pts[k - 1][0], rd.pts[k][1] - rd.pts[k - 1][1])); return { s, n: s.length }; };
const VIE = PV.vie({ roads: W.roads, gT, TS, T, geo1 }).filter(rd => rd.pts && rd.pts.length > 1);
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const NOMI = {}; Object.keys(R).forEach(k => NOMI[R[k]] = k);
const zona = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return tx < 0 || ty < 0 || tx >= GW || ty >= GH ? -1 : W.zone[ty * GW + tx]; };

// ---------------- 1. LE VIE SOPRA LE PIAZZE ----------------
const C = { via_sopra: 0, marciapiede: 0, marc_su_via: 0 }, DOVE = { via_sopra: new Map(), marciapiede: new Map(), marc_su_via: new Map() };
const segna = (k, chi, x, y) => { C[k]++; const q = DOVE[k].get(chi); if (q) q.n++; else DOVE[k].set(chi, { n: 1, x: Math.round(x), y: Math.round(y) }); };
// la carreggiata disegnata, per il marciapiede: cella di mezzo metro -> la via dei veicoli che ci passa
const H = .5, NW = Math.ceil(GW * TS / H), key = (x, y) => Math.floor(y / H) * NW + Math.floor(x / H);
const CARR = new Set(), E = new Map();   // E: la distanza dal ciglio della via di città disegnata più vicina (per il marciapiede)
VIE.forEach(rd => { const P = rd.pts, hw = rd.w / 2, rv = Suolo.rangoVia(rd), urb = (rd.kind === 'citta' || rd.kind === 'litoranea') && !rd.rect; let s = 0;
  for (let k = 0; k < P.length - 1; k++) { const [ax, ay] = P[k], [bx, by] = P[k + 1], L = Math.hypot(bx - ax, by - ay); if (L < 1e-4) continue; const ux = (bx - ax) / L, uy = (by - ay) / L;
    for (let t = 0; t < L; t += H) { const sv = s + t, drawn = !S.tagliata(rd, sv);
      for (let o = -hw + H / 2; o < hw; o += H) { const x = ax + ux * t - uy * o, y = ay + uy * t + ux * o; if (!drawn || !S.via(rd, x, y, sv)) continue;
        if (S.rango(x, y) > rv) segna('via_sopra', rd.id + ' su ' + NOMI[S.rango(x, y)], x, y);
        if (rv >= R.carreggiata) CARR.add(key(x, y)); if (urb) E.set(key(x, y), -1); }
      if (urb && drawn && zona(ax, ay) === W.Z.CITTA) for (let o = hw; o < hw + 2.1; o += H) for (const sd of [-1, 1]) { const x = ax + ux * t - uy * o * sd, y = ay + uy * t + ux * o * sd, kk = key(x, y), e = o - hw; if (!E.has(kk) || E.get(kk) > e) E.set(kk, e); } }
    s += L; } });
// il marciapiede: la fascia fra 15 cm e 2 m dal ciglio delle vie di città (render.js swField), dove la gerarchia lo lascia stare
E.forEach((e, kk) => { const x = (kk % NW + .5) * H, y = (Math.floor(kk / NW) + .5) * H; if (e < .15 || e > 2 || zona(x, y) !== W.Z.CITTA || !S.marciapiede(x, y)) return;
  const r = S.rango(x, y); if (r >= R.piazza) segna('marciapiede', NOMI[r], x, y); else if (CARR.has(kk)) segna('marc_su_via', 'carreggiata', x, y); });
const top = k => [...DOVE[k].entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 5).map(([chi, q]) => `${chi} ${q.n} (${q.x},${q.y})`).join('; ');
console.log(`${PRIMA ? 'PRIMA (senza gerarchia)' : 'DOPO'}: sovrapposizioni fra suoli incompatibili, punti di mezzo metro: ${JSON.stringify(C)} = ${C.via_sopra + C.marciapiede + C.marc_su_via}`);
ok(C.via_sopra === 0, `nessuna via sopra un suolo più alto (piazza pedonale, opera; vicoli e sentieri su qualunque piazza): ${C.via_sopra}${C.via_sopra ? ' — ' + top('via_sopra') : ''}`);
ok(C.marciapiede === 0, `nessun marciapiede rialzato su una piazza o un'opera: ${C.marciapiede}${C.marciapiede ? ' — ' + top('marciapiede') : ''}`);
ok(C.marc_su_via === 0, `nessun marciapiede sopra una carreggiata: ${C.marc_su_via}${C.marc_su_via ? ' — ' + top('marc_su_via') : ''}`);
// la gerarchia è una sola: le vie dei veicoli che attraversano una piazza pedonale vi diventano lastricato (il taglio), e le piazze pedonali ci sono
const ped = new Set(); for (let i = 0; i < GW * GH; i++) if (S.CL[i] === R.pedonale) ped.add(i);
ok(PRIMA || ped.size > 100, `le piazze pedonali riconosciute (${ped.size} caselle)`);
const tagliate = VIE.filter(rd => S.tagli(rd).length).map(rd => rd.id);
ok(PRIMA || tagliate.length > 0, `le vie che si interrompono su una piazza e riprendono dopo: ${tagliate.length} (${tagliate.slice(0, 12).join(' ')})`);

// ---------------- 2. LA SEGNALETICA: UN SOLO STRATO ----------------
const P = SG.piano(), STR = P.strisce, hyp = Math.hypot;
const sulla_tela = SG.tela ? STR.filter(s => SG.tela(s.k === 'zebra' ? 'zebra' : s.arresto ? 'arresto' : s.k, s.x, s.y)) : STR.filter(s => /^(stop|zebra|riga|triangolo|freccia_dritta)$/.test(s.k));
ok(PRIMA ? true : sulla_tela.length === 0, `doppioni: nessun segno dipinto due volte (tela sotto e decalcomania sopra): ${sulla_tela.length}${sulla_tela.length ? ' — ' + sulla_tela.slice(0, 4).map(s => s.k + ' ' + s.x.toFixed(0) + ',' + s.y.toFixed(0)).join('; ') : ''}`);
// le linee d'arresto rispetto alle zebre: mai sopra, il bordo a 1 m almeno prima delle strisce
const Z = STR.filter(s => s.k === 'zebra'), AR = STR.filter(s => s.arresto);
const sopra = AR.filter(a => Z.some(z => { const ux = Math.cos(z.ang), uy = Math.sin(z.ang), dx = a.x - z.x, dy = a.y - z.y, u = Math.abs(dx * ux + dy * uy), v = Math.abs(-dx * uy + dy * ux); return v < z.w / 2 + 1.2 && u < z.L / 2 + 1 + a.w / 2; }));
ok(sopra.length === 0, `arresto_zebra: nessuna linea d'arresto sulle strisce o a meno di 1 m (${sopra.length} su ${AR.length})${sopra.length ? ' — ' + sopra.slice(0, 4).map(s => s.x.toFixed(0) + ',' + s.y.toFixed(0)).join('; ') : ''}`);
// il verso: la linea d'arresto e lo STOP sulla corsia di chi arriva all'incrocio (si guida a destra), come le corsie del traffico (G.LANES)
const LN = (Game.LANES || []).filter(l => l.pts && l.pts.length > 1);
function versoOk(s) {   // la corsia più vicina al segno: deve andare verso l'incrocio più vicino
  let best = null, bd = 3; LN.forEach(l => { for (let k = 0; k < l.pts.length - 1; k++) { const [ax, ay] = l.pts[k], [bx, by] = l.pts[k + 1], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((s.x - ax) * dx + (s.y - ay) * dy) / L2)), d = hyp(ax + dx * t - s.x, ay + dy * t - s.y); if (d < bd) { bd = d; best = { ux: dx, uy: dy }; } } });
  if (!best) return null; const J = s.J; if (!J) return null; return (J.x - s.x) * best.ux + (J.y - s.y) * best.uy > 0; }
const AV = STR.filter(s => (s.arresto || s.k === 'stop') && s.J).map(s => ({ s, v: versoOk(s) })).filter(q => q.v !== null), storti = AV.filter(q => !q.v);
ok(storti.length === 0, `arresto_verso: linee d'arresto e STOP sulla corsia di chi arriva (${AV.length - storti.length} su ${AV.length})${storti.length ? ' — ' + storti.slice(0, 4).map(q => q.s.k + ' ' + q.s.x.toFixed(0) + ',' + q.s.y.toFixed(0)).join('; ') : ''}`);
console.log(fail ? `\n${fail} prove fallite` : '\ntutte le prove passate');
process.exitCode = fail ? 1 : 0;
