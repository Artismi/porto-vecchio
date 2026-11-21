// [verde] LA VARIETÀ DEL VERDE CHE SI VEDE IN CITTÀ, misurata in Node (niente foto): per ogni posto dove va la camera (raggio 35 m, quello
// che il telefono vede del suolo) quante piante, di che specie e di quanti modelli; da dove vengono (gli alberi di città di render.js
// rifatti con le stesse regole, i ciuffi del kit «natura» di verdeCitta35, il piano di vegetazione.js, il verde di città nuovo
// Vegetazione.citta); quanta variazione di tinta e scala per istanza; i disegni che la posa attorno alla camera (Vegetazione.monta)
// chiede lì (un InstancedMesh per specie e variante vicino, uno per specie a media distanza).
//   node strumenti/verde_varieta.js [uscita.json]        (da v7; PV_PRIMA=1: senza il verde di città nuovo, com'era)
// Gli alberi di render.js sono rifatti in modo approssimato (senza gli incroci né la Vittoria): i conti per specie sono quelli giusti,
// i numeri assoluti ±10%.
const path = require('path'), fs = require('fs');
process.env.PV_CITTANUOVA = '1';
const SRC = path.join(__dirname, '..', 'src');
const log = console.log; console.log = () => {}; console.warn = () => {};
global.World = require(path.join(SRC, 'world_cittanuova.js')); const W = World;
global.Chiarezza = require(path.join(SRC, 'chiarezza.js'));
console.log = log;
const V = require(path.join(SRC, 'vegetazione.js'));
const T = W.T, Z = W.Z, TS = W.TS, GW = W.GW, GH = W.GH;
const PRIMA = process.env.PV_PRIMA === '1';
const th = (tx, ty, s) => { let h = (tx * 374761393 + ty * 668265263 + (s || 0) * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const gT = (tx, ty) => tx < 0 || ty < 0 || tx >= GW || ty >= GH ? -1 : W.grid[ty * GW + tx];
const zoneT = (tx, ty) => tx < 0 || ty < 0 || tx >= GW || ty >= GH ? -1 : W.zone[ty * GW + tx];
const CITTA = (x, z) => zoneT(Math.floor(x / TS), Math.floor(z / TS)) === Z.CITTA;

// ---- 1) gli alberi di città (render.js alberiCitta35 + albero4: le stesse regole, senza incroci) ----
const FR = Chiarezza.fronti(W.BUILDINGS, TS, gT, T, GW, GH, W.pezzi);
const isB = (x, z) => gT(Math.floor(x / TS), Math.floor(z / TS)) === T.BLD;
const roomy = (x, z, rad) => { for (let a = 0; a < 8; a++) { const q = a * .785; if (isB(x + Math.cos(q) * rad, z + Math.sin(q) * rad)) return false; } return !isB(x, z); };
const onRoad = (x, z) => { const k = Math.floor(z / TS) * GW + Math.floor(x / TS); return W.roadW[k] > 0 && gT(Math.floor(x / TS), Math.floor(z / TS)) === T.VIA; };
const freeF = (x, z, r = .6) => [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]].every(([u, w]) => { const v = gT(Math.floor((x + u) / TS), Math.floor((z + w) / TS)); return v !== T.BLD && v !== T.WATER && v !== T.VIA && v !== T.FOUNT && v !== T.TREE && v !== T.CLIFF; });
const libero = (x, z) => !Chiarezza.davanti(FR, x, z);
const ALB = [];
Chiarezza.strade(W.roads).forEach(S => { Chiarezza.filare(S.rd.pts, S.passo, S.off, S.inizio).forEach(({ x, z, sd }) => { if (S.lati.indexOf(sd) < 0) return;
  if (S.kind === 'filare') { if (!freeF(x, z) || !CITTA(x, z) || !libero(x, z)) return; ALB.push({ x, z, kind: 'filare', sp: S.sp, via: S.rd.id }); return; }
  if (!CITTA(x, z) || onRoad(x, z) || !roomy(x, z, 2.6) || !libero(x, z)) return; ALB.push({ x, z, kind: 'viale', via: S.rd.id }); }); });
for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) { if (zoneT(tx, ty) !== Z.CITTA) continue; const v = gT(tx, ty); if (v !== T.PIAZZA && v !== T.GRASS) continue;
  if (th(tx, ty, 355) > (v === T.PIAZZA ? .05 : .07)) continue; const x = tx * TS + 1, z = ty * TS + 1;
  if (onRoad(x, z) || !roomy(x, z, 3) || ALB.some(t => Math.hypot(t.x - x, t.z - z) < 4.5) || !libero(x, z)) continue; ALB.push({ x, z, kind: v === T.PIAZZA ? 'piazza' : 'cortile', largo: roomy(x, z, 7) }); }
for (let i = 0; i < W.grid.length; i++) if (W.grid[i] === T.TREE && W.zone[i] === Z.CITTA) ALB.push({ x: (i % GW) * TS + 1, z: Math.floor(i / GW) * TS + 1, kind: 'casella' });
if (!PRIMA && V.citta) for (let k = ALB.length - 1; k >= 0; k--) { const t = ALB[k]; if (gT(Math.floor(t.x / TS), Math.floor(t.z / TS)) === T.SAND) ALB.splice(k, 1); }   // render.js: sulla sabbia di città il leccio no (le palme)
// la specie e il modello come albero4 (render.js): t.sp, o in piazza larga il pino al 35%, se no il leccio; il modello è Specie_variante
const ALBSP = typeof globalThis.__verdeAlbero === 'function' ? globalThis.__verdeAlbero : null;
ALB.forEach(t => { const r = rng((Math.round(t.x * 13) + Math.round(t.z * 7)) >>> 0);
  const sp = t.kind === 'casella' ? 'leccio' : t.sp || (t.kind === 'piazza' && r() < .35 && t.largo ? 'pino' : 'leccio');
  t.spF = sp; t.modello = sp === 'palma' ? 'Palma_' + Math.floor(r() * 6) : sp === 'pino' ? 'Pinodom_' + Math.floor(r() * 3) : 'Leccio_' + Math.floor(r() * 4); });

// ---- 2) i ciuffi del kit «natura» in città (render.js verdeCitta35, stesse estrazioni) ----
const CIUFFI = [];
for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) { if (zoneT(tx, ty) !== Z.CITTA) continue; const v = gT(tx, ty); if (v === T.BLD || v === T.WATER || v === T.VIA || v === T.QUAY) continue;
  const r = rng((tx * 6151 + ty * 2399 + 35) >>> 0), walls = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => gT(tx + a, ty + b) === T.BLD);
  walls.forEach(([a, b]) => { if (r() > (v === T.WALK ? .3 : .55)) return; const u = (r() - .5) * 1.6, x = tx * TS + 1 + a * .78 + (a ? 0 : u), z = ty * TS + 1 + b * .78 + (b ? 0 : u); const q = r(); r(); r(); CIUFFI.push({ x, z, m: q < .5 ? 'Grass_Wispy_Short' : q < .8 ? 'Grass_Common_Tall' : 'Plant_1', dove: 'piede del muro' }); });
  if (v === T.GRASS) { const k = 1 + Math.floor(r() * 3); for (let q = 0; q < k; q++) { const x = tx * TS + .3 + r() * 1.4, z = ty * TS + .3 + r() * 1.4, w = r(); if (walls.length > 1 && w < .3) continue; r(); r();
    CIUFFI.push({ x, z, m: w < .3 ? 'Bush_Common' : w < .55 ? 'Grass_Common_Tall' : w < .75 ? 'Fern_1' : w < .9 ? 'Plant_7_Big' : 'Plant_1_Big', dove: 'aiuola' }); } }
  else if (v === T.DIRT && r() < .4) CIUFFI.push({ x: tx * TS + 1, z: ty * TS + 1, m: 'Grass_Wispy_Short', dove: 'terra' }); }

// ---- 3) il piano di vegetazione.js e il verde di città nuovo ----
const P = W.vegetazione, PIANO = P.piante.filter(p => V.SP[p.sp].strato !== 'C');
const CV = !PRIMA && V.citta ? V.citta(W, { evita: ALB }) : [];

// ---- i posti dove va la camera ----
const POSTI = [
  ['Corso Garibaldi', 1302, 352], ['Piazza dell\'Ottagono', 1274, 343], ['Piazza San Rocco', 1383, 303], ['Vicolo dei Lanternini', 1373, 331],
  ['Lungomare (Passeggiata a mare)', 1425, 399], ['Spiaggia del Lido', 1449, 411], ['Marina del porto', 1333, 397], ['Giardini di Ponente', 1237, 341],
  ['Piazza della Rocca', 1489, 328], ['La Rocca', 1585, 323], ['Viale della Spianata', 1468, 300], ['Lungomare di Tramontana', 1350, 272] ];
const R = 35, out = { posti: [], totali: {} };
const conta = (L, k) => { const o = {}; L.forEach(q => { const v = k(q); o[v] = (o[v] || 0) + 1; }); return o; };
const top = o => Object.entries(o).sort((a, b) => b[1] - a[1]);
// i disegni della posa attorno alla camera (Vegetazione.monta): una mesh per specie|variante entro R0, una per specie (sagoma) fra R0-6 e R1
const disegni = (cx, cz, tel) => { const R0 = tel ? 30 : 48, R1 = tel ? 90 : 150, k = new Set();
  PIANO.concat(CV).forEach(p => { const d = Math.hypot(p.x - cx, p.y - cz); if (d > R1) return; const S = V.SP[p.sp];
    if (d < R0) k.add('v|' + p.sp + '|' + p.v); if (d > R0 - 6 && S.strato !== 'C' && !p.vicino) k.add('s|' + p.sp); }); return k.size; };
POSTI.forEach(([nome, cx, cz]) => {
  const vic = q => Math.hypot(q.x - cx, (q.z !== undefined ? q.z : q.y) - cz) < R;
  const a = ALB.filter(vic), c = CIUFFI.filter(vic), p = PIANO.filter(vic), n = CV.filter(vic);
  const tipi = {}; for (let ty = Math.floor((cz - R) / TS); ty <= (cz + R) / TS; ty++) for (let tx = Math.floor((cx - R) / TS); tx <= (cx + R) / TS; tx++) { if (Math.hypot(tx * TS + 1 - cx, ty * TS + 1 - cz) > R) continue; const v = gT(tx, ty); const nm = Object.keys(T).find(k => T[k] === v) || '?'; tipi[nm] = (tipi[nm] || 0) + 1; }
  const spec = {}; a.forEach(t => spec[t.spF] = (spec[t.spF] || 0) + 1); p.forEach(q => spec[q.sp] = (spec[q.sp] || 0) + 1); n.forEach(q => spec[q.sp] = (spec[q.sp] || 0) + 1);
  const modelli = new Set(a.map(t => t.modello).concat(c.map(q => q.m), p.map(q => q.sp + q.v), n.map(q => q.sp + q.v)));
  const tot = a.length + p.length + n.length, dom = top(spec)[0];
  out.posti.push({ nome, x: cx, z: cz, alberiCitta: conta(a, t => t.spF), modelliAlberi: [...new Set(a.map(t => t.modello))].length, ciuffiKit: conta(c, q => q.m), piano: conta(p, q => q.sp), cittaNuovo: conta(n, q => q.sp),
    specie: Object.keys(spec).length, modelli: modelli.size, piante: tot, dominante: dom ? dom[0] + ' ' + Math.round(dom[1] / Math.max(1, tot) * 100) + '%' : '-', suolo: tipi, disegniVerde: { telefono: disegni(cx, cz, true), computer: disegni(cx, cz, false) } });
});
// tutta la città
const inCitta = q => CITTA(q.x, q.z !== undefined ? q.z : q.y);
out.totali = { alberiCitta: conta(ALB, t => t.spF), perTipo: conta(ALB, t => t.kind), modelliAlberi: conta(ALB, t => t.modello), ciuffiKit: conta(CIUFFI, q => q.m), ciuffiDove: conta(CIUFFI, q => q.dove),
  pianoInCitta: conta(PIANO.filter(inCitta), q => q.sp), cittaNuovo: conta(CV, q => q.sp), cittaNuovoDove: conta(CV, q => q.dove || '?'),
  specieDefiniteMaiInCitta: V.SPECIE.filter(s => !ALB.some(t => t.spF === s) && !CV.some(q => q.sp === s) && !PIANO.some(q => q.sp === s && inCitta(q))) };
// la variazione per istanza: render.js albero4 tinge con uno di 4 bianchi (#ffffff #f2f4ea #f8f6ee #eef2e8: ±3% di valore, nessun giro di
// tinta) e scala 0,9-1,1; i ciuffi del kit con 4-5 bianchi verdini; la posa del verde nuovo ±8% di valore (vegetazione.js metti)
const fs2 = process.argv[2] || path.join(__dirname, '..', 'reports', 'verde_varieta' + (PRIMA ? '_prima' : '') + '.json');
fs.mkdirSync(path.dirname(fs2), { recursive: true }); fs.writeFileSync(fs2, JSON.stringify(out, null, 1));
log((PRIMA ? 'PRIMA (senza il verde di città nuovo)' : 'ORA') + ' — la città, raggio ' + R + ' m attorno ai posti della camera');
out.posti.forEach(q => log(`  ${q.nome.padEnd(32)} piante ${String(q.piante).padStart(4)}  specie ${String(q.specie).padStart(2)}  modelli ${String(q.modelli).padStart(2)}  dominante ${q.dominante.padEnd(14)} disegni verde tel ${q.disegniVerde.telefono} / pc ${q.disegniVerde.computer}`
  + `\n      alberi ${JSON.stringify(q.alberiCitta)}  nuovo ${JSON.stringify(q.cittaNuovo)}\n      ciuffi ${JSON.stringify(q.ciuffiKit)}`));
log('  tutta la città: alberi ' + JSON.stringify(out.totali.alberiCitta) + ' per tipo ' + JSON.stringify(out.totali.perTipo));
log('  modelli d\'albero ' + JSON.stringify(out.totali.modelliAlberi));
log('  ciuffi del kit ' + JSON.stringify(out.totali.ciuffiKit) + ' ' + JSON.stringify(out.totali.ciuffiDove));
log('  verde di città nuovo ' + JSON.stringify(out.totali.cittaNuovo) + ' ' + JSON.stringify(out.totali.cittaNuovoDove));
log('  specie del kit mai in città: ' + out.totali.specieDefiniteMaiInCitta.join(', '));
log('  ' + fs2);
if (process.env.PV_DEBUG) { const k = {}; ALB.forEach(t => { const v = gT(Math.floor(t.x / TS), Math.floor(t.z / TS)); const n = Object.keys(T).find(q => T[q] === v); k[t.kind + ':' + n] = (k[t.kind + ':' + n] || 0) + 1; }); log('alberi per suolo', JSON.stringify(k)); }
