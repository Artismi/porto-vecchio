// [riva] la prova della riva fine: node src/test_riva.js (dalla cartella v7)
// 1. nessuna cucitura: sul bordo fra la fascia fine e il terreno a caselle le quote coincidono;
// 2. la città resta all'asciutto: accanto alle case, alle strade, alle banchine la riva fine non cambia niente;
// 3. gli scogli: mai su una strada o su una casella della città, la cima sopra il suolo, ci si sale (la quota li conta);
// 4. la forma: la spiaggia sale dalla battigia alla berma, la duna ha il cordone, la sabbia si cammina (pendenze dolci), gli scogli
//    hanno i gradoni; 5. i numeri e i tempi.
const path = require('path');
const log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {};
global.World = require(path.join(__dirname, 'world_cittanuova.js'));
console.log = log; console.warn = warn;
const Riva = require(path.join(__dirname, 'riva.js'));
const W = World, T = W.T, TS = W.TS, GW = W.GW, GH = W.GH, WL = W.WL;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const t0 = Date.now(); ok(Riva.init(W) && Riva.on, 'la riva fine si accende sul mondo della città nuova');
// tutti i blocchi
const NCX = Math.ceil(GW / Riva.CH), NCY = Math.ceil(GH / Riva.CH); let nT = 0, nS = 0, nC = 0; const BL = [];
for (let cj = 0; cj < NCY; cj++) for (let ci = 0; ci < NCX; ci++) { const B = Riva.blocco(ci, cj); if (!B.any) continue; BL.push(B); nT += B.any; nS += B.scogli.length; nC += B.ciottoli.length; }
const ms = Date.now() - t0;
// ---------------- 1. nessuna cucitura ----------------
const qR = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS), u = x / TS - tx, v = y / TS - ty; return W.quotaRiva(tx, ty) * (1 - u) * (1 - v) + W.quotaRiva(tx + 1, ty) * u * (1 - v) + W.quotaRiva(tx, ty + 1) * (1 - u) * v + W.quotaRiva(tx + 1, ty + 1) * u * v; };
let cuc = 0, cucMax = 0, lati = 0;
for (let ty = 1; ty < GH - 1; ty++) for (let tx = 1; tx < GW - 1; tx++) { if (!Riva.inBanda(tx, ty)) continue;
  for (const [a, b, ex, ey] of [[1, 0, 1, 0], [-1, 0, 0, 0], [0, 1, 0, 1], [0, -1, 0, 0]]) { if (Riva.inBanda(tx + a, ty + b)) continue; lati++;
    for (let s = 0; s <= 4; s++) { const x = (tx + ex + (a ? 0 : s / 4)) * TS, y = (ty + ey + (b ? 0 : s / 4)) * TS, hN = Riva.quotaNuda(tx, ty, x - (a > 0 ? 1e-6 : 0), y - (b > 0 ? 1e-6 : 0)), d = Math.abs(hN - qR(x, y)); cucMax = Math.max(cucMax, d); if (d > .01) cuc++; } } }
ok(cuc === 0, `nessuna cucitura sul bordo della fascia (${lati} lati, scarto massimo ${(cucMax * 100).toFixed(2)} cm)`);
// ---------------- 2. la città all'asciutto ----------------
const CITTA = new Set([T.BLD, T.VIA, T.COB, T.PIAZZA, T.WALK, T.STAIRS, T.FOUNT, T.QUAY, T.PIER]);
let vic = 0, cambi = 0;
for (let ty = 1; ty < GH - 1; ty++) for (let tx = 1; tx < GW - 1; tx++) { const i = ty * GW + tx; if (!CITTA.has(W.grid[i]) && !(W.roadW[i] > 0)) continue;
  if (Riva.inBanda(tx, ty)) vic++;
  for (const [a, b] of [[.25, .25], [.75, .75], [.5, .5]]) { const x = (tx + a) * TS, y = (ty + b) * TS, q = Riva.quota(x, y); if (q !== null && Math.abs(q - qR(x, y)) > .02) cambi++; } }
ok(vic === 0 && cambi === 0, `le caselle della città e le strade fuori dalla fascia, la loro quota non cambia (${vic} nella fascia, ${cambi} punti cambiati)`);
// ---------------- 3. gli scogli ----------------
let sStr = 0, sSotto = 0, sSale = 0; const tutti = []; BL.forEach(B => B.scogli.forEach(s => tutti.push(s)));
tutti.forEach(s => { const i = Math.floor(s.y / TS) * GW + Math.floor(s.x / TS); if (CITTA.has(W.grid[i]) || W.roadW[i] > 0) sStr++;
  const nuda = Riva.quotaNuda(Math.floor(s.x / TS), Math.floor(s.y / TS), s.x, s.y), q = Riva.quota(s.x, s.y); if (s.z + s.h < nuda + .1) sSotto++; if (q !== null && q >= s.z + s.h * .9) sSale++; });
ok(tutti.length > 300 && sStr === 0, `gli scogli (${tutti.length}) mai sulle strade o nella città (${sStr})`);
ok(sSotto < tutti.length * .03, `la cima degli scogli sta sopra il suolo (${sSotto} sepolti)`);
ok(sSale > tutti.length * .9, `ci si sale sopra: la quota al centro è la cima (${sSale} su ${tutti.length})`);
// ---------------- 4. la forma ----------------
// sui campioni della sabbia: la quota media per distanza dalla riva e la pendenza
const pro = {}, proD = {}; let pS = 0, pR = 0, nPS = 0, gr = 0, nGr = 0;
for (const B of BL) for (let j = 0; j < B.m; j++) for (let i = 0; i < B.n; i++) { if (!B.mask[j * B.n + i]) continue; const tx = B.tx0 + i, ty = B.ty0 + j, f = Riva.famT(tx, ty), k = Riva.kindT(tx, ty);
  for (const [a, b] of [[.3, .3], [.7, .6]]) { const x = (tx + a) * TS, y = (ty + b) * TS, s = Riva.suolo(tx, ty, x, y, 0), d = s[4], q = Riva.quotaNuda(tx, ty, x, y);
    if (f === 1 && k !== 'cala' && d > -2 && d < 30) { const L = k === 'duna' ? proD : pro, c = Math.round(d); L[c] = L[c] || [0, 0]; L[c][0] += q; L[c][1]++;
      if (d > 0 && d < 8) {   /* la spiaggia, dalla battigia alla retrospiaggia (il fianco della duna può essere ripido) */ const e = .5, gx = Riva.quotaNuda(tx, ty, x + e, y) - q, gy = Riva.quotaNuda(tx, ty, x, y + e) - q, sl = Math.hypot(gx, gy) / e; pS += sl > .45 ? 1 : 0; nPS++; } }
    if (f === 2 && d > 0 && d < 6) { const e = .25, hh = []; for (let t = -4; t <= 4; t++) hh.push(Riva.quotaNuda(tx, ty, x + t * e, y)); let salti = 0; for (let t = 1; t < hh.length; t++) if (Math.abs(hh[t] - hh[t - 1]) > .08) salti++; gr += salti; nGr++; } } }
const m = (L, c) => L[c] ? L[c][0] / L[c][1] : NaN;
ok(m(pro, 0) < WL + .25 && m(pro, 5) > m(pro, 1) + .2, `la spiaggia sale dalla battigia alla berma (d 0: ${(m(pro, 0) - WL).toFixed(2)} m sull'acqua, d 1: ${(m(pro, 1) - WL).toFixed(2)}, d 5: ${(m(pro, 5) - WL).toFixed(2)})`);
ok(m(proD, 16) > m(proD, 8) + .5, `la duna ha il cordone dietro la spiaggia (d 8: ${(m(proD, 8) - WL).toFixed(2)} m, d 16: ${(m(proD, 16) - WL).toFixed(2)} m)`);
ok(pS / nPS < .04, `la spiaggia si cammina: ${(pS / nPS * 100).toFixed(1)}% dei campioni fra la battigia e la berma con pendenza oltre il 45%`);
ok(gr / nGr > .6, `gli scogli hanno i gradoni (${(gr / nGr).toFixed(2)} salti ogni 2 m)`);
// ---------------- 5. i numeri ----------------
ok(nT > 2000, `le caselle della fascia fine: ${nT} (${(nT * 4).toLocaleString('it')} m²), i ciottoli ${nC}`);
ok(ms < 6000, `il calcolo di tutti i blocchi in ${ms} ms`);
// la stessa riva due volte (deterministica)
{ const a = tutti.slice(0, 50).map(s => s.x + ',' + s.y + ',' + s.r).join(';'); delete require.cache[require.resolve(path.join(__dirname, 'riva.js'))]; const R2 = require(path.join(__dirname, 'riva.js')); R2.init(W); const t2 = []; for (let cj = 0; cj < NCY; cj++) for (let ci = 0; ci < NCX; ci++) { const B = R2.blocco(ci, cj); B.scogli.forEach(s => t2.push(s)); }
  ok(a === t2.slice(0, 50).map(s => s.x + ',' + s.y + ',' + s.r).join(';'), 'la stessa riva ogni volta (niente a caso)'); }
console.log(fail ? `\n${fail} prove non passano` : '\ntutte le prove passano'); process.exit(fail ? 1 : 0);
