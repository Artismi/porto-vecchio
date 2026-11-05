// [ritmo8] le prove del ritmo (v7/ANALISI_RITMO8.md), senza browser:
//   1. gli interruttori (profilo.js, window.PV_R8): ?noritmo8 spegne tutto, ?noritmo8<nome> uno solo, senza niente tutto acceso;
//   2. la griglia dei raggi a fette (tasselli.js grigliaG) è IDENTICA a quella di prima (la griglia() di main 85a0971, ricopiata qui) su
//      geometrie a caso, a 32 bit e a 16 bit, con e senza indice; e la quota di ogni cella contiene quella di ogni suo triangolo;
//   3. il disegnatore dei graffiti a parte: il codice del worker apre le tele 2D con willReadFrequently (e senza ?noritmo8arte soltanto).
// cd v7/src && node test_ritmo8.js [--seme=12345]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const SEME = +((process.argv.find(a => a.startsWith('--seme=')) || '').split('=')[1] || 12345);
let s0 = SEME >>> 0; const rnd = () => { s0 = (s0 * 1664525 + 1013904223) >>> 0; return s0 / 4294967296; };

// ---- 1. gli interruttori
function r8(q) { const win = {}; const ctx = { window: win, location: { search: q }, console, RegExp }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(__dirname, 'profilo.js'), 'utf8'), ctx); return win.PV_R8; }
{ const a = r8(''), b = r8('?noritmo8'), c = r8('?leggera&noritmo8raggi'), d = r8('?noritmo8pile&tassellivecchi');
  ok(a && a.on('raggi') && a.on('arte') && a.on('griglie') && a.on('pile'), 'senza interruttori: tutte le correzioni accese');
  ok(b && !b.on('raggi') && !b.on('arte') && !b.on('griglie') && !b.on('pile') && !b.tutto, '?noritmo8: tutte spente');
  ok(c && !c.on('raggi') && c.on('arte') && c.on('griglie') && c.on('pile'), '?noritmo8raggi: solo il braccio spento');
  ok(d && d.on('raggi') && !d.on('pile') && d.tutto, '?noritmo8pile: solo le pile spente (e non conta come ?noritmo8)'); }

// ---- 2. la griglia a fette contro quella di prima
const SRC = fs.readFileSync(path.join(__dirname, 'tasselli.js'), 'utf8');
function estrai(nome) { const i = SRC.indexOf(nome); if (i < 0) return null; let j = SRC.indexOf('{', i), k = 0; for (let q = j; q < SRC.length; q++) { if (SRC[q] === '{') k++; else if (SRC[q] === '}') { k--; if (!k) return SRC.slice(i, q + 1); } } return null; }
const PRIMA = `function grigliaPrima(g) {
    const P = posL(g.attributes.position), I = g.index ? g.index.__ix || g.index.array : null, nt = (I ? I.length : P.length / 3) / 3 | 0, c = RG.cella, bb = g.__bbW || g.boundingBox || (g.computeBoundingBox(), g.boundingBox);
    const x0 = Math.floor(bb.min.x / c), z0 = Math.floor(bb.min.z / c), nx = Math.floor(bb.max.x / c) - x0 + 1, nz = Math.floor(bb.max.z / c) - z0 + 1;
    const cnt = new Uint32Array(nx * nz + 1), v = k => I ? I[k] : k;
    const span = (t, f) => { let ax = Infinity, bx = -Infinity, az = Infinity, bz = -Infinity; for (let q = 0; q < 3; q++) { const i = v(t * 3 + q) * 3, x = pget(P, i), z = pget(P, i + 2); if (x < ax) ax = x; if (x > bx) bx = x; if (z < az) az = z; if (z > bz) bz = z; }
      const i0 = Math.max(0, Math.floor(ax / c) - x0), i1 = Math.min(nx - 1, Math.floor(bx / c) - x0), j0 = Math.max(0, Math.floor(az / c) - z0), j1 = Math.min(nz - 1, Math.floor(bz / c) - z0);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) f(j * nx + i); };
    for (let t = 0; t < nt; t++) span(t, k => { cnt[k + 1]++; });
    for (let k = 0; k < nx * nz; k++) cnt[k + 1] += cnt[k];
    const pos = cnt.slice(0, nx * nz), L = new Uint32Array(cnt[nx * nz]);
    for (let t = 0; t < nt; t++) span(t, k => { L[pos[k]++] = t; });
    ST.raggiV++;
    return { x0, z0, nx, nz, cnt, L, nt, timbri: new Uint32Array(nt), I, P };
  }`;
const posLsrc = (SRC.match(/function posL\(PA\) \{[^\n]*/) || [''])[0], pgetSrc = (SRC.match(/const pget = [^\n]*/) || [''])[0], GG = estrai('function* grigliaG(g)');
ok(!!posLsrc && !!pgetSrc && !!GG, 'tasselli.js: posL, pget e grigliaG trovati');
const box = { RG: { cella: 2 }, ST: { raggiV: 0 }, Math, Uint32Array, Float32Array, Infinity };
vm.createContext(box); vm.runInContext(posLsrc + '\n' + pgetSrc + '\n' + PRIMA + '\n' + GG + '\nthis.posL = posL; this.grigliaPrima = grigliaPrima; this.grigliaG = grigliaG;', box);
function geo(nt, q16, indice) {
  const nv = indice ? Math.max(3, Math.floor(nt * 1.2)) : nt * 3, P = new Float32Array(nv * 3), mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  const cx = rnd() * 400 - 200, cz = rnd() * 400 - 200;
  for (let i = 0; i < nv; i++) { const big = rnd() < .05; P[i * 3] = cx + (rnd() - .5) * (big ? 60 : 30); P[i * 3 + 1] = rnd() * 14; P[i * 3 + 2] = cz + (rnd() - .5) * (big ? 60 : 30); for (let c = 0; c < 3; c++) { mn[c] = Math.min(mn[c], P[i * 3 + c]); mx[c] = Math.max(mx[c], P[i * 3 + c]); } }
  const pos = { array: P }, g = { attributes: { position: pos }, boundingBox: { min: { x: mn[0], y: mn[1], z: mn[2] }, max: { x: mx[0], y: mx[1], z: mx[2] } }, index: null };
  if (q16) { const k = [0, 1, 2].map(c => (mx[c] - mn[c]) / 65535 || 1e-6), u = new Uint16Array(nv * 3); for (let i = 0; i < nv * 3; i++) u[i] = Math.round((P[i] - mn[i % 3]) / k[i % 3]); pos.__q = { u, mn, k }; }
  if (indice) { const I = new Uint32Array(nt * 3); for (let i = 0; i < I.length; i++) I[i] = Math.floor(rnd() * nv); g.index = { array: I, __ix: I }; }
  return g;
}
let uguali = 0, prove = 0, quote = true, fette = 0;
for (let n = 0; n < 24; n++) {
  const g = geo(200 + Math.floor(rnd() * 12000), n % 3 === 1, n % 2 === 0), A = box.grigliaPrima(g), it = box.grigliaG(g); let r, pause = 0; do { r = it.next(); if (!r.done) pause++; } while (!r.done); const B = r.value; fette += pause;
  prove++; const same = A.x0 === B.x0 && A.z0 === B.z0 && A.nx === B.nx && A.nz === B.nz && A.nt === B.nt && A.cnt.length === B.cnt.length && A.cnt.every((v, i) => v === B.cnt[i]) && A.L.length === B.L.length && A.L.every((v, i) => v === B.L[i]);
  if (same) uguali++;
  // ogni triangolo di ogni cella sta dentro la quota della cella
  const P = box.posL(g.attributes.position), I = g.index ? g.index.__ix : null, py = i => P.__q ? P.get(i) : P[i];
  for (let k = 0; k < B.nx * B.nz && quote; k++) for (let q = B.cnt[k]; q < B.cnt[k + 1]; q++) { const t = B.L[q]; for (let w = 0; w < 3; w++) { const vi = I ? I[t * 3 + w] : t * 3 + w, y = py(vi * 3 + 1); if (y < B.ymn[k] - 1e-4 || y > B.ymx[k] + 1e-4) { quote = false; break; } } }
}
ok(uguali === prove, `la griglia a fette è identica a quella di prima: ${uguali}/${prove} geometrie (32 e 16 bit, con e senza indice; ${fette} pause in tutto)`);
ok(quote, 'la quota di ogni cella contiene tutti i vertici dei suoi triangoli');
ok(/griglieTick\(x, z\)/.test(SRC) && /R8G && vicinoFatto/.test(SRC), 'le griglie si preparano nel giro dei tasselli, dopo l\'anello vicino');
ok(/if \(b < 0\) \{ bf \+= -1 - b; return false; \}/.test(SRC), 'monta1 aspetta la pila a metà (la mesh entra a pila piena)');

// ---- 3. il disegnatore a parte
const W = fs.readFileSync(path.join(__dirname, 'writing.js'), 'utf8');
const m = /const R8A = ([^\n]*);\n/.exec(W);
ok(!!m && /willReadFrequently: true/.test(m[1]) && /PV_R8\.on\('arte'\)/.test(m[1]), 'il worker dei graffiti apre le tele 2D con willReadFrequently, se arte è accesa');
if (m) { // il pezzo di codice che il worker riceve, eseguito su una OffscreenCanvas finta
  const code = vm.runInNewContext(m[1], { window: { PV_R8: { on: () => true } } }); const viste = [];
  const F = function () { }; F.prototype.getContext = function (k, o) { viste.push([k, o]); return {}; };
  vm.runInNewContext(code + '; new OffscreenCanvas(1, 1).getContext("2d"); new OffscreenCanvas(1, 1).getContext("2d", { alpha: false }); new OffscreenCanvas(1, 1).getContext("webgl2");', { OffscreenCanvas: F });
  ok(viste[0][1] && viste[0][1].willReadFrequently === true && viste[1][1].willReadFrequently === true && viste[1][1].alpha === false && viste[2][1] === undefined, 'nel worker: 2d con willReadFrequently (le altre opzioni restano), webgl2 com\'era');
  ok(vm.runInNewContext(m[1], { window: { PV_R8: { on: () => false } } }) === '', 'con ?noritmo8arte il codice del worker è quello di prima');
}
console.log(fail ? `${fail} prove NON passate` : 'tutte le prove passate'); process.exit(fail ? 1 : 0);
