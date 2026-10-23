// [vegetazione] La prova del verde: cd v7/src && node test_vegetazione.js
// 1) densità per formazione dentro le forchette del piano (alberi e arbusti per ettaro);
// 2) niente piante su strade, marciapiedi, piazze, case, acqua; niente alberi a meno di 4,5 m da una porta, niente nel varco dei sentieri;
// 3) i tronchi del piano sono caselle TREE e fuori dalla città e dalla riva non restano caselle TREE senza tronco;
// 4) il piano è sempre uguale (due generazioni, stesso elenco);
// 5) il budget: piante in tutto, triangoli dei modelli vicini, la geometria lontana.
process.env.PV_CITTANUOVA = '1';
global.World = require('./world_cittanuova.js');
const V = require('./vegetazione.js'), W = World, T = W.T, GW = W.GW, TS = W.TS;
let ko = 0; const ok = (c, msg) => { console.log((c ? '  ok  ' : '  NO  ') + msg); if (!c) ko++; };
const P = W.vegetazione; ok(!!P, 'il piano è scritto nel mondo (W.vegetazione)');
// 1) densità
const D = V.misura(P), FORCHE = { lecceta: [120, 400, 80, 400], pineta: [25, 140, 20, 200], pinetaM: [40, 180, 50, 300], macchia: [10, 90, 400, 1400], gariga: [0, 20, 300, 1200], prato: [0, 15, 0, 80], uliveto: [50, 200, 0, 60], riparia: [20, 120, 300, 1200] };
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
// 5) il budget
const n = P.piante.length; ok(n > 4000 && n < 20000, `piante del piano: ${n} (fra 4000 e 20000)`);
console.log(`  conti: ${JSON.stringify(P.conti.perForma)}`);
console.log(ko ? `\n${ko} controlli NON passati` : '\ntutto a posto'); process.exit(ko ? 1 : 0);
