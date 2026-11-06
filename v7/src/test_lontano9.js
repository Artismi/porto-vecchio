// [lontano9] le prove del lontano della camera bassa (src/lontano9.js), nel mondo vero (world_cittanuova + game): node src/test_lontano9.js
// 1. l'occlusione è prudente: ogni sfera che il ventaglio dice nascosta ha TUTTI i raggi verso i suoi punti (sopra il suolo) fermati dalle
//    case vere alla gronda (la griglia non erosa, il passo di 25 cm), su migliaia di prove a caso dalle strade della città;
// 2. nei posti della tavola di camera9: la via davanti e la volta del Glacis non si nascondono, le vie dietro le case sì;
// 3. il flag (?nolontano9) e il taglio per genere (le case fuse, le istanze, il terreno mai «piccoli»).
const path = require('path'), src = __dirname;
const log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {};
global.World = require(path.join(src, 'world_cittanuova.js')); global.Interior = require(path.join(src, 'interiors.js')); global.Game = require(path.join(src, 'game.js'));
const L9 = require(path.join(src, 'lontano9.js'));
console.log = log; console.warn = warn;
const G = Game, W = G.MAP.world, TS = W.TS || 2, D = Math.PI / 180;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const VW = W.GW + 1, suolo = (x, y) => { const fx = x / TS, fy = y / TS, i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j, e = (a, b) => (W.velev && W.velev[b * VW + a]) || 0; return e(i, j) * (1 - u) * (1 - v) + e(i + 1, j) * u * (1 - v) + e(i, j + 1) * (1 - u) * v + e(i + 1, j + 1) * u * v; };
// le case vere: la casella intera della casa (niente erosione, niente margine), alla gronda; sopra, il tetto a falde (E0, E3) che sale dal
// bordo del lotto più vicino al punto (il tetto a padiglione: il più basso dei tetti a falde) fino al colmo di Visuale.mappa
const gronda = b => (b.base || 0) + (b.lighthouse ? 12 : b.kiosk ? 2.8 : b.fl >= 1 ? 3.6 + (b.fl - 1) * 2.4 : 3);
const VERO = new Float32Array(W.GW * W.GH).fill(-1e9);
for (let i = 0; i < W.GW * W.GH; i++) if (W.grid[i] === W.T.BLD) { const bi = W.bIndex[i]; if (bi >= 0 && W.BUILDINGS[bi]) VERO[i] = gronda(W.BUILDINGS[bi]); }
const alto = (x, z) => { const tx = Math.floor(x / TS), ty = Math.floor(z / TS); if (tx < 0 || ty < 0 || tx >= W.GW || ty >= W.GH) return -1e9; const i = ty * W.GW + tx, h = VERO[i]; if (h < -1e8) return h;
  const b = W.BUILDINGS[W.bIndex[i]]; if (!b || b.rot || !((b.era === 'E0' || b.era === 'E3') && !b.torre && !b.annesso)) return h;
  const t = Math.tan(b.era === 'E3' ? .42 : .3), e = Math.min(x - b.x * TS, (b.x + b.w) * TS - x, z - b.y * TS, (b.y + b.h) * TS - z); return h + Math.max(0, Math.min(e * t, Math.min(b.w, b.h) * TS / 2 * t)); };
const OCC = (() => { L9.ventaglio(W, 0, 0, 0, 0, .1); return L9.griglia; })();
const volta = (x, z) => { const tx = Math.floor(x / TS), ty = Math.floor(z / TS); return VERO[ty * W.GW + tx] > -1e8 && OCC[ty * W.GW + tx] < -1e8; };
// un raggio dalla camera al punto: fermato da una casa vera?
const fermo = (o, p) => { const dx = p[0] - o[0], dy = p[1] - o[1], dz = p[2] - o[2], L = Math.hypot(dx, dy, dz); for (let s = .25; s < L - .05; s += .25) { const x = o[0] + dx * s / L, y = o[1] + dy * s / L, z = o[2] + dz * s / L; if (alto(x, z) > y && !volta(x, z)) return true; } return false; };
const DIR = []; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) { const l = Math.hypot(i, j, k); DIR.push(l ? [i / l, j / l, k / l] : [0, 0, 0]); }
const punti = (c, r) => DIR.map(d => { const p = [c[0] + d[0] * r, c[1] + d[1] * r, c[2] + d[2] * r]; p[1] = Math.max(p[1], suolo(p[0], p[2]) + .05); return p; });
// ---- 1. prudente, a caso
{ let seme = 7; const rnd = () => { seme = (seme * 16807) % 2147483647; return seme / 2147483647; };
  let prove = 0, nascoste = 0, sbagli = 0, primo = null; const x0 = 1150, x1 = 1600, z0 = 230, z1 = 430;
  for (let c = 0; c < 260; c++) {
    let x, z, n = 0; do { x = x0 + rnd() * (x1 - x0); z = z0 + rnd() * (z1 - z0); n++; } while ((!G.walkM(x, z) || alto(x, z) > -1e8) && n < 200);
    if (n >= 200) continue; const y = suolo(x, z) + 3.7, az = rnd() * 2 * Math.PI, A = 45 * D; L9.ventaglio(W, x, y, z, az, A);
    for (let k = 0; k < 40; k++) { const a = az + (rnd() * 2 - 1) * A * .9, d = 12 + rnd() * 180, r = .3 + rnd() * rnd() * 25, ox = x + Math.cos(a) * d, oz = z + Math.sin(a) * d, oy = suolo(ox, oz) + rnd() * 14;
      prove++; if (!L9.occluso(ox, oy, oz, r)) continue; nascoste++;
      const P = punti([ox, oy, oz], r); if (P.every(p => fermo([x, y, z], p))) continue; sbagli++;
      if (process.env.DBG9) { const p = P.find(q => !fermo([x, y, z], q)), dx = p[0] - x, dy = p[1] - y, dz = p[2] - z, L = Math.hypot(dx, dy, dz);
        for (let s = .25; s < L; s += .25) { const qx = x + dx * s / L, qy = y + dy * s / L, qz = z + dz * s / L, tx = Math.floor(qx / TS), ty = Math.floor(qz / TS), i = ty * W.GW + tx;
          if (OCC[i] > qy) console.log('  cella', tx, ty, 'occ', OCC[i].toFixed(2), 'vero', alto(qx, qz).toFixed(2), 'raggio', qy.toFixed(2), 's', s, JSON.stringify(W.BUILDINGS[W.bIndex[i]]).slice(0, 200)); } } if (!primo) primo = { cam: [x, y, z].map(v => +v.toFixed(1)), sfera: [ox, oy, oz, r].map(v => +v.toFixed(1)) }; } }
  ok(prove > 8000 && nascoste > prove * .15, `a caso dalle strade: ${prove} sfere, ${nascoste} nascoste (${(nascoste / prove * 100).toFixed(0)}%)`);
  ok(sbagli === 0, `nessuna sfera nascosta che una casa vera non copra tutta (${sbagli} sbagli${primo ? ', la prima ' + JSON.stringify(primo) : ''})`); }
// ---- 1b. le scatole (i secchi grandi: case fuse, tasselli): prudenti come le sfere
{ let seme = 11; const rnd = () => { seme = (seme * 16807) % 2147483647; return seme / 2147483647; };
  let prove = 0, nascoste = 0, sbagli = 0, primo = null;
  for (let c = 0; c < 200; c++) {
    let x, z, n = 0; do { x = 1150 + rnd() * 450; z = 230 + rnd() * 200; n++; } while ((!G.walkM(x, z) || alto(x, z) > -1e8) && n < 200);
    if (n >= 200) continue; const y = suolo(x, z) + 3.7, az = rnd() * 2 * Math.PI, A = 45 * D; L9.ventaglio(W, x, y, z, az, A);
    for (let k = 0; k < 30; k++) { const a = az + (rnd() * 2 - 1) * A * .8, d = 20 + rnd() * 150, ox = x + Math.cos(a) * d, oz = z + Math.sin(a) * d, hx = 2 + rnd() * 24, hz = 2 + rnd() * 24, g = suolo(ox, oz), y0 = g - 1, y1 = g + rnd() * 16;
      prove++; if (!L9.occlusoB(ox - hx, y0, oz - hz, ox + hx, y1, oz + hz)) continue; nascoste++;
      const P = []; for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) for (const yy of [y1, (y0 + y1) / 2]) { const px = ox - hx + 2 * hx * i / 4, pz = oz - hz + 2 * hz * j / 4; P.push([px, Math.max(yy, suolo(px, pz) + .05), pz]); }
      if (P.every(p => fermo([x, y, z], p))) continue; sbagli++; if (!primo) primo = { cam: [x, y, z].map(v => +v.toFixed(1)), scatola: [ox - hx, y0, oz - hz, ox + hx, y1, oz + hz].map(v => +v.toFixed(1)) }; } }
  ok(prove > 4000 && nascoste > prove * .1, `le scatole a caso: ${prove}, ${nascoste} nascoste (${(nascoste / prove * 100).toFixed(0)}%)`);
  ok(sbagli === 0, `nessuna scatola nascosta che le case vere non coprano tutta (${sbagli} sbagli${primo ? ', la prima ' + JSON.stringify(primo) : ''})`); }
// ---- 1c. la camera nella casella di una casa (il braccio la tiene fuori dal muro vero, non dalla griglia di 2 m): l'occlusione resta
{ let c = null; for (let i = 0; i < W.GW * W.GH && !c; i++) { if (OCC[i] < -1e8) continue; const tx = i % W.GW, ty = Math.floor(i / W.GW); if (tx < 575 || tx > 800 || ty < 115 || ty > 215) continue;
    const vic = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([a, b]) => OCC[i + a + b * W.GW] < -1e8 && G.walkM((tx + a + .5) * TS, (ty + b + .5) * TS)); if (vic) c = { x: (tx + .5 + vic[0] * .45) * TS, z: (ty + .5 + vic[1] * .45) * TS }; }
  let n = 0; if (c) { const y = suolo(c.x, c.z) + 3.7; for (const az of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) { L9.ventaglio(W, c.x, y, c.z, az, 45 * D); for (const d of [40, 60, 80]) for (const a of [-.4, 0, .4]) { const ox = c.x + Math.cos(az + a) * d, oz = c.z + Math.sin(az + a) * d; if (L9.occluso(ox, suolo(ox, oz) + 1, oz, 1)) n++; } } }
  ok(c && n > 0, `la camera sul bordo di una casa (${c ? c.x.toFixed(0) + ', ' + c.z.toFixed(0) : '-'}): ${n} cose dietro le altre case ancora nascoste`); }
// ---- 2. i posti
const guarda = (at, verso, arm = 7.5) => { const h = Math.atan2(verso[1] - at[1], verso[0] - at[0]), x = at[0] - Math.cos(h) * arm, z = at[1] - Math.sin(h) * arm, y = suolo(at[0], at[1]) + 3.7; L9.ventaglio(W, x, y, z, h, 45 * D); return { x, y, z, h }; };
const lungo = (c, d, r = 1) => { const x = c.x + Math.cos(c.h) * d, z = c.z + Math.sin(c.h) * d; return L9.occluso(x, suolo(x, z) + 1, z, r); };
{ const roads = Object.fromEntries(W.roads.filter(r => /^vic_/.test(r.id)).map(r => [r.id, r.pts]));
  const P = roads.vic_pescatori, i = Math.floor((P.length - 1) * .45), c = guarda(P[i], P[Math.min(P.length - 1, i + 3)]);
  // la via davanti: un punto lungo il vicolo, a 15-25 m dalla camera (fra le case)
  let lib = 0, n = 0; for (let k = i; k < P.length && Math.hypot(P[k][0] - c.x, P[k][1] - c.z) < 30; k++) { const d = Math.hypot(P[k][0] - c.x, P[k][1] - c.z); if (d < 12) continue; n++; if (!L9.occluso(P[k][0], suolo(P[k][0], P[k][1]) + 1, P[k][1], .5)) lib++; }
  ok(n > 0 && lib === n, `Caruggio dei Pescatori: i ${n} punti del vicolo davanti a 12-30 m restano in vista`);
  // di lato, dietro le case: a 40-90 m, a 20-40° dal vicolo
  // di lato, dietro le case: a 40-90 m, a 20-40° dal vicolo, quelle che le case vere coprono (il centro e i punti della sfera)
  let nas = 0, m = 0; for (const a of [-40, -30, -20, 20, 30, 40]) for (const d of [40, 60, 90]) { const x = c.x + Math.cos(c.h + a * D) * d, z = c.z + Math.sin(c.h + a * D) * d, y = suolo(x, z) + 1;
    if (alto(x, z) > -1e8 || !punti([x, y, z], 1).every(p => fermo([c.x, c.y, c.z], p))) continue; m++; if (L9.occluso(x, y, z, 1)) nas++; }
  ok(m > 5 && nas >= m * .7, `Caruggio dei Pescatori: di lato, dietro le case, ${nas}/${m} cose piccole a 40-90 m nascoste (quelle che le case vere coprono)`); }
{ const c = guarda([1477, 292], [1490, 294]); const v = [10, 14, 18].map(d => lungo(c, d, .5));   // (la via gira a 24 m dalla camera: oltre c'è una casa)
  ok(v.every(q => !q), `sottopasso del Vico del Glacis: sotto la volta e subito oltre la via resta in vista (${v.map(q => q ? 'nascosta' : 'vista').join(', ')})`); }
{ const c = guarda([1372.1, 296.5], [1373, 310.6]); const v = [14, 20, 28].map(d => lungo(c, d, .5));
  ok(v.every(q => !q), `sbocco dei Lanternini: la piazza davanti resta in vista`); }
{ const c = guarda([1415, 399], [1441, 399]); const v = [20, 40, 80].map(d => lungo(c, d, 1));
  ok(v.every(q => !q), `lungomare: il lungomare davanti resta in vista fino a 80 m`); }
// la camera sopra i tetti vede tutto: nessuna sfera nascosta dietro case più basse di lei
{ const c = { x: 1380, z: 300 }; L9.ventaglio(W, c.x, 80, c.z, 0, 45 * D); let n = 0; for (const d of [30, 60, 120]) for (const a of [-30, 0, 30]) { const x = c.x + Math.cos(a * D) * d, z = c.z + Math.sin(a * D) * d; if (L9.occluso(x, suolo(x, z) + 4, z, 1)) n++; }
  ok(n === 0, 'dall\'alto (80 m, sopra i tetti) niente è nascosto dalle case'); }
// la volta: le caselle sotto gli archi e i sottopassi non sono pieno
{ let n = 0; for (let i = 0; i < W.GW * W.GH; i++) if (VERO[i] > -1e8 && OCC[i] < -1e8) n++; let pz = 0; (W.pezzi || []).forEach(p => { if (/^(arco_sottopasso|arco_contrasto|portico)$/.test(p.tipo)) pz++; });
  ok(pz === 0 || n > 0, `le case erose e le volte vuote: ${n} caselle di casa non contano come pieno (${pz} volte nel mondo)`); }
// ---- 2b. il costo: un fotogramma tipico (il ventaglio di 50°, 1500 sfere da provare come nello sbocco, tutte le colonne fatte)
{ const c = guarda([1372.1, 296.5], [1373, 310.6]); let seme = 3; const rnd = () => { seme = (seme * 16807) % 2147483647; return seme / 2147483647; };
  const S = []; for (let i = 0; i < 1500; i++) { const a = c.h + (rnd() * 2 - 1) * .7, d = 5 + rnd() * 200, x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d; S.push([x, suolo(x, z) + rnd() * 8, z, .3 + rnd() * 6]); }
  const N = 60, t0 = process.hrtime.bigint(); let n = 0; for (let f = 0; f < N; f++) { L9.ventaglio(W, c.x + f * .01, c.y, c.z, c.h, 50 * D); for (const q of S) if (L9.occluso(q[0], q[1], q[2], q[3])) n++; }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / N; ok(ms < 4, `il costo in Node: ${ms.toFixed(2)} ms a fotogramma per 1500 prove e ${Math.ceil(100 / .4)} colonne (${(n / N).toFixed(0)} nascoste)`); }
// ---- 3. il flag
ok(L9.ON === true && typeof L9.prima === 'function', 'in Node (niente location) il modulo è acceso; ?nolontano9 lo spegne (Lontano9.ON)');
ok(L9.P.dist >= 60 && L9.P.dist <= 90 && L9.P.banda >= 10 && L9.P.distMezzo > L9.P.dist, `le cose piccole oltre ${L9.P.dist} m (dissolte da ${L9.P.dist - L9.P.banda} m), le medie oltre ${L9.P.distMezzo} m`);
console.log(fail ? `\n${fail} PROVE FALLITE` : '\ntutte le prove passano');
process.exit(fail ? 1 : 0);
