// [vegetazione] La prova del verde: cd v7/src && node test_vegetazione.js
// 1) densità per formazione dentro le forchette del piano (alberi e arbusti per ettaro);
// 2) niente piante su strade, marciapiedi, piazze, case, acqua; niente alberi a meno di 4,5 m da una porta, niente nel varco dei sentieri;
// 3) i tronchi del piano sono caselle TREE e fuori dalla città e dalla riva non restano caselle TREE senza tronco;
// 4) il piano è sempre uguale (due generazioni, stesso elenco);
// 5) i bouquet: ci sono, lungo i sentieri e attorno alle radure, in tutti e tre i ruoli;
// 6) il budget: piante in tutto.
process.env.PV_CITTANUOVA = '1';
global.World = require('./world_cittanuova.js');
const V = require('./vegetazione.js'), W = World, T = W.T, GW = W.GW, TS = W.TS;
let ko = 0; const ok = (c, msg) => { console.log((c ? '  ok  ' : '  NO  ') + msg); if (!c) ko++; };
const P = W.vegetazione; ok(!!P, 'il piano è scritto nel mondo (W.vegetazione)');
// 1) densità
const D = V.misura(P), FORCHE = { lecceta: [120, 400, 80, 400], pineta: [25, 140, 20, 200], pinetaM: [40, 180, 50, 300], macchia: [10, 90, 400, 1400], gariga: [0, 20, 300, 1200], prato: [0, 25, 0, 180], uliveto: [50, 220, 0, 90], riparia: [20, 120, 300, 1200] };
for (const [k, [a0, a1, b0, b1]] of Object.entries(FORCHE)) { const d = D[k]; if (!d) { ok(false, `formazione ${k} presente`); continue; } ok(d.alberiHa >= a0 && d.alberiHa <= a1 && d.arbustiHa >= b0 && d.arbustiHa <= b1, `${k}: ${d.alberiHa} alberi/ha, ${d.arbustiHa} arbusti/ha (attesi ${a0}-${a1}, ${b0}-${b1})`); }
// 2) dove non si pianta
const VIETATE = new Set([T.BLD, T.WATER, T.VIA, T.WALK, T.PIAZZA, T.COB, T.QUAY, T.PIER, T.STAIRS, T.FOUNT]);
let suStrada = 0, suVietata = 0, vicinoPorta = 0, nelVarco = 0;
const porte = W.BUILDINGS.filter(b => b.door).map(b => [(b.door[0] + .5) * TS, (b.door[1] + .5) * TS]);
P.piante.forEach(p => { const i = Math.floor(p.y / TS) * GW + Math.floor(p.x / TS), v = W.grid[i];
  if (W.roadW[i] > 0) suStrada++; if (VIETATE.has(v)) suVietata++;
  const S = V.SP[p.sp]; if (S.strato === 'A' || S.strato === 'M') { if (porte.some(([x, y]) => Math.hypot(p.x - x, p.y - y) < 4.5)) vicinoPorta++; const s = P.sentieri[0] && P.dSen[i] < 1; if (s) nelVarco++; } });
ok(suStrada === 0, `nessuna pianta sulle strade (${suStrada})`); ok(suVietata === 0, `nessuna pianta su case, acqua, marciapiedi, piazze (${suVietata})`);
ok(vicinoPorta === 0, `nessun albero davanti a una porta (${vicinoPorta})`); ok(nelVarco === 0, `nessun tronco nel varco dei sentieri (${nelVarco})`);
// 3) le caselle dei tronchi
const tronchi = new Set(P.piante.filter(p => V.SP[p.sp].tronco).map(p => p.tile)); let senza = 0;
for (let i = 0; i < W.grid.length; i++) if (W.grid[i] === T.TREE && V.mia(W, i) && !tronchi.has(i)) senza++;
ok(senza === 0, `ogni casella TREE del verde nuovo ha il suo tronco (${senza} senza)`);
// 4) determinismo
const P2 = V.piano(W, { rifai: true }); const firma = Q => Q.piante.map(p => p.sp + p.x.toFixed(2) + p.y.toFixed(2)).join('|');
ok(firma(P2) === firma(P), `il piano è sempre uguale (${P2.piante.length} piante)`);
// 5) i bouquet: ci sono, lungo i sentieri e attorno alle radure, in tutti e tre i ruoli
{ const R = {}; P.piante.forEach(p => { if (p.ruolo) R[p.ruolo] = (R[p.ruolo] || 0) + 1; }); ok(P.conti.bouquet > 100 && R.fondale && R.ritmo && R.cornice, `bouquet: ${P.conti.bouquet} (fondale ${R.fondale}, ritmo ${R.ritmo}, cornice ${R.cornice})`); }
// 6) il budget
const n = P.piante.length; ok(n > 4000 && n < 20000, `piante del piano: ${n} (fra 4000 e 20000)`);
// 7) [verde] il verde di città (Vegetazione.citta): c'è, è vario, sta al suo posto, è sempre uguale, costa poco
{ global.Chiarezza = require('./chiarezza.js'); const CV = V.citta(W), CV2 = V.citta(W, { rifai: true }), FR = Chiarezza.fronti(W.BUILDINGS, TS, (x, y) => W.grid[y * GW + x], T, GW, W.GH, W.pezzi);
  const sp = {}; CV.forEach(p => sp[p.sp] = (sp[p.sp] || 0) + 1); const n = CV.length, dom = Math.max(...Object.values(sp)) / n;
  ok(n > 150 && n < 1500, `verde di città: ${n} piante (fra 150 e 1500)`);
  ok(Object.keys(sp).length >= 12 && dom < .3, `verde di città vario: ${Object.keys(sp).length} specie, la più diffusa ${(dom * 100).toFixed(0)}% (${JSON.stringify(sp)})`);
  let via = 0, fuori = 0, fronte = 0, muro = 0, sagome = new Set(), vit = 0; const VIT = W.roads.filter(r => r.pennoni || r.id === 'vittoria');
  CV.forEach(p => { const i = Math.floor(p.y / TS) * GW + Math.floor(p.x / TS); if (W.grid[i] === T.VIA || W.grid[i] === T.BLD && !p.muro && !p.su) via++; if (W.zone[i] !== W.Z.CITTA) fuori++;
    if (Chiarezza.davanti(FR, p.x, p.y, 0) && (p.muro ? Chiarezza.davanti(FR, p.x + Math.sin(p.rot) * .6, p.y + Math.cos(p.rot) * .6, .5) : true)) fronte++;
    if (p.muro) { const a = Math.round(Math.sin(p.rot)), b = Math.round(Math.cos(p.rot)), j = Math.floor((p.y - b * .3) / TS) * GW + Math.floor((p.x - a * .3) / TS); if (W.grid[j] !== T.BLD) muro++; }
    if (!p.vicino) sagome.add(p.sp); VIT.forEach(rd => { for (let k = 1; k < rd.pts.length; k++) { const A = rd.pts[k - 1], Bq = rd.pts[k], dx = Bq[0] - A[0], dy = Bq[1] - A[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p.x - A[0]) * dx + (p.y - A[1]) * dy) / L2)); if (Math.hypot(p.x - A[0] - dx * t, p.y - A[1] - dy * t) < rd.w / 2 + 5) { vit++; return; } } }); });
  ok(via === 0 && fuori === 0, `verde di città: niente sulla carreggiata o dentro le case (${via}), niente fuori città (${fuori})`);
  ok(fronte === 0, `verde di città: niente davanti a porte, vetrine, scale (${fronte})`);
  ok(muro === 0, `i rampicanti sono attaccati a un muro e lo guardano dalla parte giusta (${muro} staccati)`);
  ok(vit === 0, `la Vittoria resta spazzata (${vit})`);
  ok(sagome.size <= 8, `le sagome a media distanza solo per le piante grandi: ${sagome.size} specie (${[...sagome].join(', ')})`);
  ok(CV2.map(p => p.sp + p.x + p.y).join('|') === CV.map(p => p.sp + p.x + p.y).join('|'), 'il verde di città è sempre uguale');
  const varianti = new Set(CV.map(p => p.sp + '|' + p.v)); ok(varianti.size <= 22, `un disegno per specie e variante: ${varianti.size} in tutta la città`); }
console.log(`  conti: ${JSON.stringify(P.conti.perForma)}`);
console.log(ko ? `\n${ko} controlli NON passati` : '\ntutto a posto'); process.exit(ko ? 1 : 0);
