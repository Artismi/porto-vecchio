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
const SG = require(process.env.PV_SEGNALETICA || path.join(src, 'segnaletica.js'));   // PV_SEGNALETICA: un'altra versione, per il prima SG.piano();
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
// prima di [suolo] la tela dipingeva sotto ogni decalcomania della città (marks1, strisce35): le zebre, gli STOP, le linee, gli stalli
const sulla_tela = SG.tela ? STR.filter(s => SG.tela(s.k === 'zebra' ? 'zebra' : s.arresto ? 'arresto' : s.stallo ? 'stallo' : s.k, s.asse ? s.asse[0] : s.x, s.asse ? s.asse[1] : s.y)) : STR.filter(s => s.k !== 'bus' && !/^parola|^freccia_(destra|sinistra)|^freccia_dritta_/.test(s.k));
ok(sulla_tela.length === 0, `doppioni: nessun segno dipinto due volte (tela sotto e decalcomania sopra): ${sulla_tela.length}${sulla_tela.length ? ' — ' + sulla_tela.slice(0, 4).map(s => s.k + ' ' + s.x.toFixed(0) + ',' + s.y.toFixed(0)).join('; ') : ''}`);
// le linee d'arresto rispetto alle zebre: mai sopra, il bordo a 1 m almeno prima delle strisce
const Z = STR.filter(s => s.k === 'zebra'), AR = STR.filter(s => s.arresto);
const sopra = AR.filter(a => Z.some(z => { const ux = Math.cos(z.ang), uy = Math.sin(z.ang), dx = a.x - z.x, dy = a.y - z.y, u = Math.abs(dx * ux + dy * uy), v = Math.abs(-dx * uy + dy * ux); return v < z.w / 2 + a.L / 2 && u - z.L / 2 - a.w / 2 < .95; }));   // il bordo della linea a meno di 1 m (5 cm di tolleranza) dal bordo della banda
if (process.argv.includes('--dbg')) sopra.forEach(a => { const z = Z.filter(z => hyp(z.x - a.x, z.y - a.y) < 6); console.log('  arresto', a.x.toFixed(1), a.y.toFixed(1), a.jx, a.jy, z.map(q => q.motivo + ' ' + q.zebra + ' ' + q.x.toFixed(1) + ',' + q.y.toFixed(1)).join(' | ')); });
ok(sopra.length === 0, `arresto_zebra: nessuna linea d'arresto sulle strisce o a meno di 1 m (${sopra.length} su ${AR.length})${sopra.length ? ' — ' + sopra.slice(0, 4).map(s => s.x.toFixed(0) + ',' + s.y.toFixed(0)).join('; ') : ''}`);
// il verso: la linea d'arresto, lo STOP e la freccia sulla corsia di chi arriva all'incrocio. Si guida a destra (come G.lanePos): chi arriva va
// verso -u (u: dal centro dell'incrocio lungo il braccio), la sua corsia è a destra, dalla parte di (u.y, -u.x) rispetto alla mezzeria
const VIA = STR.filter(s => (s.arresto || s.k === 'stop' || s.k === 'freccia_dritta' || s.k === 'triangolo') && s.jx !== undefined);
const storti = VIA.filter(s => { const ux = s.ux, uy = s.uy, d = (s.x - s.jx) * ux + (s.y - s.jy) * uy, cx = s.jx + ux * d, cy = s.jy + uy * d; return (s.x - cx) * uy + (s.y - cy) * -ux < .1; });
const senza = STR.filter(s => (s.arresto || s.k === 'stop') && s.jx === undefined);
ok(VIA.length > 0 && storti.length === 0 && senza.length === 0, `arresto_verso: linee d'arresto, STOP, frecce e triangoli degli incroci sulla corsia di chi arriva (${VIA.length - storti.length} su ${VIA.length}; senza incrocio ${senza.length})${storti.length ? ' — ' + storti.slice(0, 4).map(s => s.k + ' ' + s.x.toFixed(0) + ',' + s.y.toFixed(0)).join('; ') : ''}`);
// ---------------- 3. [suolo2] IL BORDO DELLA VIA: SCIVOLI E FONTANE (le regole di suolo.js, come le usa render.js) ----------------
// Il marciapiede come lo costruisce render.js (swField, buildSidewalks): in città la fascia di 2,1 m dal ciglio delle vie di città, alta
// 15 cm (H = 0,15 · clamp(S/0,2 + 0,5), S = min(e − 0,02, 2,1 − e), e la distanza dal ciglio con l'unione morbida delle due vie più vicine),
// a vertici di mezzo metro; il colore segue l'altezza (colMarc35: top = smoothstep(0,05, 0,14, H); la fascia chiara del cordolo dove top
// è vicino a 0,7, la canaletta scura dove top < 0,5). Lo scivolo (Suolo.scivolo, Suolo.scivoloH) lo abbassa davanti alle zebre (render.js
// crossings35). Si contano, su tutta la mappa:
//   scivoli_orfani    uno scivolo senza una zebra dipinta a meno di 1 m (le bande intere), o con l'asse a più di 3° dalla via;
//   chiari            i vertici del marciapiede vero (oltre 15 cm dal ciglio) che lo scivolo dipinge col chiaro del cordolo (il colore
//                     che seguiva l'altezza abbassata passava per quella del cordolo): i
//                     «rettangoli chiari» lungo la carreggiata;
//   scuri             i vertici del marciapiede vero che lo scivolo dipinge con la canaletta scura: la «chiazza tonda» accanto alle strisce
//                     (chiari e scuri: solo dove senza lo scivolo il marciapiede non lo sarebbe);
//   non_a_filo        i vertici in fondo allo scivolo (abbassati del tutto) che restano più di 1 cm sopra la strada;
//   fontane_bucate    le caselle di fontana dove il terreno si buca (sotto si vede il mare: il quadrato d'acqua blu attorno alla vasca).
// --prima2: le regole di prima (Suolo.vecchio2), per il confronto.
const PRIMA2 = process.argv.includes('--prima2'); if (PRIMA2) Suolo.vecchio2(true);
{ const CW = PRIMA2 ? SG.crossings35().map(c => Object.assign({}, c)) : P.zebre.filter(z => z.bande).map(z => ({ x: z.x, y: z.y, ux: z.ux, uy: z.uy, w: z.w, L: SG.CFG.zebra.L }));
  const ZB = P.strisce.filter(s => s.k === 'zebra'), D2 = { scivoli_orfani: 0, chiari: 0, scuri: 0, non_a_filo: 0, fontane_bucate: 0 }, es = [];
  CW.forEach(c => { const zb = ZB.filter(s => hyp(s.x - c.x, s.y - c.y) < c.w / 2 + 1), rd = VIE.find(r => (r.kind === 'citta' || r.kind === 'litoranea') && SG.lNear(SG.lin(r), c.x, c.y).d < r.w / 2);
    let storto = false; if (rd) { const Ln = SG.lin(rd), q = SG.lNear(Ln, c.x, c.y), a = SG.lAt(Ln, q.s - 1.5), b = SG.lAt(Ln, q.s + 1.5), t = Math.atan2(b.y - a.y, b.x - a.x); storto = Math.abs(Math.sin(t - Math.atan2(c.uy, c.ux))) > Math.sin(3 * Math.PI / 180); }
    if (zb.length < 2 || storto || !zb.some(s => hyp(s.x - c.x, s.y - c.y) < 1)) { D2.scivoli_orfani++; if (es.length < 4) es.push('scivolo ' + (storto ? 'storto' : 'senza zebra') + ' ' + c.x.toFixed(0) + ',' + c.y.toFixed(0)); } });
  // il campo del marciapiede attorno agli scivoli
  const RR = .5, urb = VIE.map((rd, i) => i).filter(i => (VIE[i].kind === 'citta' || VIE[i].kind === 'litoranea') && !VIE[i].rect), sst = (a, b, t) => { t = Math.max(0, Math.min(1, (t - a) / (b - a))); return t * t * (3 - 2 * t); };
  const eDi = (x, z) => { let e1 = 1e9, e2 = 1e9, r1 = -1; for (const ri of urb) { const rd = VIE[ri]; if (!rd.pts.some(p => Math.abs(p[0] - x) < 40 && Math.abs(p[1] - z) < 40)) continue; const P0 = rd.pts; let s0 = 0;
      for (let k = 0; k < P0.length - 1; k++) { const [ax, az] = P0[k], [bx, bz] = P0[k + 1], L = Math.hypot(bx - ax, bz - az) || 1e-6, t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / (L * L))), sk = s0; s0 += L;
        if (S.tagliata(rd, sk + t * L)) continue; const d = Math.hypot(x - ax - (bx - ax) * t, z - az - (bz - az) * t), e = d - rd.w / 2; if (d > rd.w / 2 + 3.4) continue;
        if (r1 === ri) { if (e < e1) e1 = e; } else if (e < e1) { e2 = e1; e1 = e; r1 = ri; } else if (e < e2) e2 = e; } }
    if (e1 > 1e8) return 9; if (e2 > 1e8) return e1; const hk = Math.max(3.8 - Math.abs(e1 - e2), 0) / 3.8; return Math.min(e1, e2) - hk * hk * 3.8 / 4; };
  const visti = new Set();
  CW.forEach(c => { const ext = c.w / 2 + 3; for (let j = Math.floor((c.y - ext) / RR); j <= Math.ceil((c.y + ext) / RR); j++) for (let i = Math.floor((c.x - ext) / RR); i <= Math.ceil((c.x + ext) / RR); i++) {
    const kk = j * 100000 + i; if (visti.has(kk)) continue; visti.add(kk); const x = i * RR, z = j * RR; if (zona(x, z) !== W.Z.CITTA) continue;
    const e0 = eDi(x, z); let S38 = Math.min(e0 - .02, 2.1 - e0); if (!S.marciapiede(x, z)) S38 = -.05; const h0 = .15 * Math.max(0, Math.min(1, S38 / .2 + .5)); if (h0 < .002) continue;
    let low = 0; CW.forEach(q => { low = Math.max(low, Suolo.scivolo(q, x, z)); }); if (low <= 0) continue;
    const h = Suolo.scivoloH(h0, low), top = sst(.05, .14, Suolo.off2 ? h : h0), curb = Math.max(0, 1 - Math.abs(top - .7) / .32) * 1.1, scuro = top < .5 ? (1 - top * 2) * .95 : 0;   // render.js buildSidewalks: il colore dall'altezza di prima dello scivolo
    const lastra = Suolo.off2 ? 0 : 0;   // (prima: scivoloCol1 tirava appena verso il grigio, non toglieva né il chiaro né lo scuro)
    const t0 = sst(.05, .14, h0), curb0 = Math.max(0, 1 - Math.abs(t0 - .7) / .32) * 1.1, scuro0 = t0 < .5 ? (1 - t0 * 2) * .95 : 0;   // il colore che il marciapiede avrebbe lì senza scivolo
    if (e0 > .15 && curb * (1 - lastra) > .5 && curb0 <= .5) { D2.chiari++; if (es.length < 8) es.push('chiaro ' + x + ',' + z); }
    if (e0 > .15 && scuro * (1 - lastra) > .5 && scuro0 <= .5) { D2.scuri++; if (es.length < 8) es.push('scuro ' + x + ',' + z); }
    if (low > .98 && e0 > 0 && h > .01) D2.non_a_filo++; } });
  for (let i = 0; i < GW * GH; i++) if (W.grid[i] === T.FOUNT && Suolo.bucoTerreno(W.grid[i], T)) D2.fontane_bucate++;
  const tot = Object.values(D2).reduce((a, b) => a + b, 0);
  console.log(`${PRIMA2 ? 'PRIMA (regole del bordo di prima)' : 'DOPO'}: il bordo della via, ${CW.length} scivoli: ${JSON.stringify(D2)} = ${tot}${es.length ? '\n   ' + es.join('; ') : ''}`);
  ok(PRIMA2 || tot === 0, `[suolo2] niente rettangoli spuntati: ogni scivolo davanti a una zebra, a filo e raccordato, col colore delle lastre (niente chiaro del cordolo né chiazza scura); nessuna fontana col terreno bucato (${tot})`); }

console.log(fail ? `\n${fail} prove fallite` : '\ntutte le prove passate');
process.exitCode = fail ? 1 : 0;
