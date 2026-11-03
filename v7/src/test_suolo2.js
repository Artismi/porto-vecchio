// [suolo2] la prova dei piani rialzati delle opere (game.js quotaSuolo), in Node, sul mondo vero della città nuova:
//   - sul ciglio della piazza alta dell'Ottagono, dietro il muro del Gradone del Mercato, il piede sta sul camminamento (non sul
//     terreno che scende verso la via: era fino a 1,3 m più in basso);
//   - la Scala del Mercato di levante sale a gradini (la quota cresce a scatti di un'alzata, mai più di 20 cm, mai all'indietro) dal
//     piede sulla via fino al pianerottolo alla quota della piazza; il pianerottolo, la copertina e il camminamento si passano a piedi;
//   - il gradino della fontana, i gradini del sagrato, il riempimento del passaggio a livello, il molo ci sono;
//   - la scala resta l'unico passaggio fra la via e la piazza alta (game.js findPath passa per la scala) e il muro non si attraversa.
// node src/test_suolo2.js   (dalla cartella v7 o da src)
const path = require('path'), src = __dirname;
const log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {};
global.World = require(path.join(src, 'world_cittanuova.js')); global.Interior = require(path.join(src, 'interiors.js')); global.Game = require(path.join(src, 'game.js'));
console.log = log; console.warn = warn;
const G = Game, W = G.MAP.world, PZ = W.pezzi || [];
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const loc = (p, lx, lz) => { const c = Math.cos(p.rot || 0), s = Math.sin(p.rot || 0); return [p.x + lx * c + lz * s, p.y - lx * s + lz * c]; };
ok(G.FIX_SUOLO2 && G.SUP.length >= 20, `le opere rialzate nella quota del suolo (${G.SUP.length}: ${[...new Set(G.SUP.map(s => s.tipo))].join(', ')})`);
// 1. il camminamento dietro il muro dei gradoni
const GR = PZ.filter(p => p.tipo === 'gradone');
let mx = 0; GR.forEach(p => { const o = p.opz; for (let lx = .5; lx < o.L - .5; lx += .5) for (const lz of [-.3, -1, -2]) { const [x, y] = loc(p, lx, lz), q = G.quotaSuolo(x, y, -99), atteso = (p.q || 0) + o.h + (lz > -.5 ? .16 : .05); mx = Math.max(mx, Math.abs(q - atteso)); } });
ok(GR.length === 4 && mx < .005, `il camminamento e la copertina dei ${GR.length} gradoni nella quota (scarto massimo ${(mx * 100).toFixed(1)} cm)`);
// 2. la scala di levante a gradini
const S = W.passaggi.find(s => s.salita && s.h > 1), pS = GR.find(p => Math.hypot(p.x - S.x, p.y - S.y) < .1), zc = (S.z0 + S.z1) / 2;
const Q = []; for (let lx = S.x0 - .14; lx <= S.x2 - .05; lx += .02) { const [x, y] = loc(pS, lx, zc); Q.push(G.quotaSuolo(x, y, -99)); }
const salti = Q.slice(1).map((q, i) => q - Q[i]), su = salti.filter(d => d > .01);
ok(Q.every(q => q !== null) && salti.every(d => d > -1e-6 && d < .2) && su.length >= pS.opz.n, `la Scala del Mercato sale a gradini: ${su.length} alzate fino a ${(Math.max(...salti) * 100).toFixed(1)} cm, mai all'indietro (dal piede ${Q[0].toFixed(2)} al pianerottolo ${Q[Q.length - 1].toFixed(2)})`);
ok(Math.abs(Q[Q.length - 1] - ((pS.q || 0) + pS.opz.h)) < .005, `il pianerottolo alla quota della piazza alta (${((pS.q || 0) + pS.opz.h).toFixed(2)})`);
// dentro un gradino la quota è piana (la pedata), non la rampa di prima
const tread = (i) => { const lx = S.x0 + (i + .5) * pS.opz.pd, [x, y] = loc(pS, lx, zc), [x2, y2] = loc(pS, lx + pS.opz.pd * .4, zc); return [G.quotaSuolo(x, y, -99), G.quotaSuolo(x2, y2, -99)]; };
ok([0, 3, 7, 12].every(i => { const [a, b] = tread(i); return Math.abs(a - b) < 1e-6; }), 'ogni pedata è in piano');
// 3. le altre opere
const F = PZ.find(p => p.tipo === 'fontana'), fq = G.quotaSuolo(F.x + F.opz.r + .2, F.y, -99);
ok(fq !== null && Math.abs(fq - ((F.q || 0) + .18)) < .005, `il gradino della ${F.nome} (${fq && fq.toFixed(2)})`);
const C = PZ.find(p => p.tipo === 'facciata_chiesa'); if (C) { const z1 = C.opz.spessore / 2 + C.opz.gradini * .4, [x, y] = loc(C, C.opz.w / 2, z1 - .2), [x2, y2] = loc(C, C.opz.w / 2, z1 - .4 * C.opz.gradini + .2);
  ok(Math.abs(G.quotaSuolo(x, y, -99) - ((C.q || 0) + .17)) < .005 && Math.abs(G.quotaSuolo(x2, y2, -99) - ((C.q || 0) + .17 * C.opz.gradini)) < .005, `i gradini del sagrato della ${C.nome}`); }
const PL = PZ.filter(p => p.tipo === 'passaggio_livello'); ok(PL.length && PL.every(p => { const q = G.quotaSuolo(p.x + (p.opz.w + 14) / 2 * Math.cos(p.rot || 0), p.y - (p.opz.w + 14) / 2 * Math.sin(p.rot || 0), -99); return q !== null && Math.abs(q - ((p.q || 0) + .44)) < .005; }), `il riempimento fra le rotaie dei ${PL.length} passaggi a livello (44 cm)`);
const MO = PZ.find(p => p.tipo === 'molo_vecchio'); if (MO) { const [x, y] = loc(MO, MO.opz.L1 / 2, 0); ok(Math.abs(G.quotaSuolo(x, y, -99) - (MO.q || 0)) < .005, `il piano del ${MO.nome}`); }
// 4. il terreno più alto vince sulle facce piane (non sulle scale)
const [gx, gy] = loc(GR[0], 2, -1.5); ok(G.quotaSuolo(gx, gy, 50) === 50, 'dove il terreno sta sopra il camminamento resta il terreno');
// 5. la scala resta il passaggio fra la via e la piazza, il muro non si attraversa
const A = S.pts[0], P = G.findPath(A[0] + 1.5, A[1] + .9, 1262, 349, 1.4, false), E = loc(pS, (S.x0 + S.x1) / 2, zc);
ok(P.length > 0 && P.some(q => Math.hypot(q.x - E[0], q.y - E[1]) < 3.2), `dalla via alla piazza alta il percorso passa per la scala (${P.length} punti)`);
const [w0x, w0y] = loc(pS, 1, 1), [w1x, w1y] = loc(pS, 1, -1); ok(G.taglia(w0x, w0y, w1x, w1y), 'il passo dritto attraverso il muro del gradone resta tagliato');
console.log(fail ? `\n${fail} prove NON passate` : '\ntutte le prove passate'); process.exit(fail ? 1 : 0);
