// [vissuti] prova dei tetti vissuti (tetti_vissuti.js) sulla città nuova, col seme:
//   1. la densità per quartiere: le scenette sui terrazzi abitati, ognuna del suo quartiere (il borgo coi vasi e le latte, la marina con le
//      reti e le cassette, l'Ottocento con le sdraio, il canniccio, il limone); il borgo più fitto, l'Ottocento più pulito; i dettagli del
//      tempo (pozze, erba, cartacce, la malta del colmo, le colature);
//   2. niente sui percorsi: rifatto qui da capo, dalle linee di Percorsi.dati (giri, vie, rami, le alternative delle porte) e dalle scale,
//      passerelle e salti di Tetti: 1,2 m liberi sulle linee (la pozza e il sale si attraversano: contano solo alle porte), 1 m attorno a ogni arrivo;
//   3. niente compenetrazioni nel dato: fra le cose, coi gruppi del piano, col parapetto, niente di alto verso la camera;
//   4. il determinismo: lo stesso dato con il seme 12345 e con un altro seme, e due calcoli di fila (Math.random non entra);
//   5. il bilancio: i disegni fissi aggiunti (le istanze vicine) entro 150, le cartacce e le pozze solo vicino al personaggio.
// cd v7/src && node test_tetti_vissuti.js            (il seme: --seme=N, per difetto 12345)
const path = require('path'), src = __dirname;
const semina = require(path.join(src, 'seme.js')); semina(12345);
const log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {};
global.World = require(path.join(src, 'world_cittanuova.js'));
global.Percorsi = require(path.join(src, 'percorsi.js'));
global.Interior = require(path.join(src, 'interiors.js')); global.Game = require(path.join(src, 'game.js'));
global.Livelli = require(path.join(src, 'livelli.js')); global.Tetti = require(path.join(src, 'tetti.js'));
global.TettiVissuti = require(path.join(src, 'tetti_vissuti.js'));
console.log = log; console.warn = warn;
const G = Game, T = Tetti, TV = TettiVissuti, B = G.BUILDINGS, TS = G.TS, hyp = Math.hypot;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };

// ---------------- 1. la densità per quartiere ----------------
const V = TV.verifica(), Z = V.perZona;
console.log(`tetti ${V.tetti} (terrazzi ${V.terrazzi}, falde ${V.falde}), cose ${V.cose}, istanze vicine: cartacce ${V.vicini.carte}, pozze ${V.vicini.pozze}`);
console.log('scenette', JSON.stringify(V.scene));
Object.entries(Z).forEach(([z, s]) => console.log(`${z}: terrazzi ${s.terrazzi} (abitati ${s.vivi}), falde ${s.falde}; cose per tetto ${s.perTerrazzo}, per terrazzo abitato ${s.perVivo}, per terrazzo calmo ${s.perCalmo}; scenette su ${Math.round(100 * s.quotaScene)}% dei terrazzi; cartacce per tetto ${s.cartePerTetto}\n     ${JSON.stringify(s.k)}`));
const quota = z => { let n = 0, v = 0; TV.VISSUTI.forEach(t => { if (t && t.zona === z && t.tipo === 'piano' && t.vivo) { v++; if (t.storia) n++; } }); return n / Math.max(1, v); };
ok(quota('borgo') >= .6 && quota('ottocento') >= .5 && quota('marina') >= .5, `una scenetta sui terrazzi abitati: borgo ${Math.round(100 * quota('borgo'))}%, Ottocento ${Math.round(100 * quota('ottocento'))}%, marina ${Math.round(100 * quota('marina'))}%`);
const sceneDi = z => { const s = new Set(); TV.VISSUTI.forEach(t => { if (t && t.zona === z) t.storia.split('+').filter(Boolean).forEach(n => s.add(n)); }); return s; };
const SB = sceneDi('borgo'), SM = sceneDi('marina'), SO = sceneDi('ottocento');
ok(['nonna', 'orto', 'gatti'].filter(n => SB.has(n)).length >= 3 && [...SB].every(n => ['nonna', 'orto', 'panni', 'gatti'].includes(n)), `il borgo: ${[...SB].join(', ')}`);
ok(['pescatore', 'nasse', 'remi'].filter(n => SM.has(n)).length >= 2 && [...SM].every(n => ['pescatore', 'nasse', 'remi', 'panni', 'ombra'].includes(n)), `la marina: ${[...SM].join(', ')}`);
ok(['salotto', 'ombrellone', 'ombra', 'canniccio', 'limone', 'pranzo'].filter(n => SO.has(n)).length >= 3 && [...SO].every(n => ['salotto', 'ombrellone', 'ombra', 'canniccio', 'limone', 'pranzo', 'cisterna'].includes(n)), `l'Ottocento: ${[...SO].join(', ')}`);
ok((Z.ottocento.k.sdraio || 0) >= 4 && ((Z.ottocento.k.stuoia || 0) + (Z.ottocento.k.telo || 0)) >= 1, `nell'Ottocento le sdraio (${Z.ottocento.k.sdraio || 0}) e un canniccio o un ombrellone (${(Z.ottocento.k.stuoia || 0) + (Z.ottocento.k.telo || 0)})`);
ok((Z.marina.k.rete || 0) + (Z.marina.k.cassetta || 0) + (Z.marina.k.remi || 0) >= 6 && (Z.marina.k.sale || 0) >= 1, `sulla marina reti, cassette e remi (${(Z.marina.k.rete || 0) + (Z.marina.k.cassetta || 0) + (Z.marina.k.remi || 0)}), il sale (${Z.marina.k.sale || 0})`);
ok((Z.borgo.k.latta || 0) >= 30 && (Z.borgo.k.vaso || 0) >= 20 && (Z.borgo.k.gatto || 0) >= 5, `nel borgo le latte di basilico (${Z.borgo.k.latta || 0}), i vasi (${Z.borgo.k.vaso || 0}), i gatti (${Z.borgo.k.gatto || 0})`);
ok(Z.borgo.perVivo > Z.ottocento.perVivo && Z.borgo.perCalmo > Z.ottocento.perCalmo && Z.borgo.cartePerTetto > Z.ottocento.cartePerTetto, `il borgo più fitto e più sporco dell'Ottocento (per abitato ${Z.borgo.perVivo} contro ${Z.ottocento.perVivo}, per calmo ${Z.borgo.perCalmo} contro ${Z.ottocento.perCalmo}, cartacce ${Z.borgo.cartePerTetto} contro ${Z.ottocento.cartePerTetto})`);
ok(Object.values(Z).every(s => s.perVivo <= 12 && s.perCalmo <= 4), 'mai ingombro: al più 12 cose su un terrazzo abitato e 4 su uno calmo, in media');
const maxT = Math.max(...TV.VISSUTI.filter(t => t && t.tipo === 'piano').map(t => t.cose.filter(o => o.k !== 'colatura').length)); ok(maxT <= 22, `il terrazzo più pieno ha ${maxT} cose (al più 22, contando i ciuffi d'erba)`);
ok(V.perK.pozza >= 40 && V.perK.erba >= 150 && V.perK.malta >= 150 && V.perK.colatura >= 60 && (V.perK.cappero || 0) + (V.perK.valeriana || 0) >= 60, `i dettagli del tempo: pozze ${V.perK.pozza}, ciuffi d'erba ${V.perK.erba}, capperi e valeriane ${(V.perK.cappero || 0) + (V.perK.valeriana || 0)}, malta del colmo ${V.perK.malta}, colature ${V.perK.colatura}`);
const carte = ['busta', 'cartaccia', 'giornale', 'tappi', 'pallone', 'scarpa', 'lattina'].filter(k => V.perK[k]); ok(carte.length >= 6 && V.vicini.carte >= 60 && V.vicini.carte <= 400, `le cartacce di ${carte.length} tipi (${carte.join(', ')}), ${V.vicini.carte} in tutto: poche`);
const falde = TV.VISSUTI.filter(t => t && t.tipo === 'falde'); ok(falde.filter(t => t.cose.some(o => o.falda)).length >= 50 && falde.some(t => t.cose.some(o => o.gronda)) && falde.some(t => t.cose.some(o => o.colmo)), `sulle falde l'erba della gronda (${falde.filter(t => t.cose.some(o => o.falda)).length} tetti), sul colmo e la roba nel canale`);

// ---------------- 2. niente sui percorsi (rifatto da capo) ----------------
const D = Percorsi.dati, linee = [];
D.circuiti.forEach(c => { linee.push(c.pts); (c.vie || []).forEach(v => linee.push(v.pts)); (c.rami || []).forEach(r => linee.push(r.pts)); });
D.porte.forEach(q => { if (q.alternativa && q.alternativa.k === 'tetti') linee.push(q.alternativa.pts); });
const rr = (o, x, y) => hyp(Math.max(0, Math.abs(x - o.x) - o.hx), Math.max(0, Math.abs(y - o.y) - o.hy));
const arrivi = []; T.LADDERS.forEach(L => { if (!L.camm) { arrivi.push([L.bi, L.tx, L.ty, 1]); if (L.footB >= 0) arrivi.push([L.footB, L.fx, L.fy, 1]); } });
T.PLANKS.forEach(P => { arrivi.push([P.a, P.wa[0] - P.ox * .5, P.wa[1] - P.oy * .5, 1]); arrivi.push([P.b, P.wb[0] + P.ox * .5, P.wb[1] + P.oy * .5, 1]); });
T.JUMPS.forEach(J => { for (let k = J.k0; k <= J.k1; k++) { const [wx, wy] = J.sd.wall(k); arrivi.push([J.bi, wx - J.ox * .6, wy - J.oy * .6, .9]); arrivi.push([J.bj, wx + J.ox * (TS + .6), wy + J.oy * (TS + .6), .9]); } });
let sulle = [], agli = [], prove = 0;
TV.VISSUTI.forEach(t => { if (!t) return; const b = B[t.bi], loc = (x, y) => T.loc3(b, x, y), x0 = b.x * TS - 2, y0 = b.y * TS - 2, x1 = (b.x + b.w) * TS + 2, y1 = (b.y + b.h) * TS + 2;
  const segs = []; linee.forEach(pts => { for (let k = 0; k < pts.length - 1; k++) { const A = pts[k], C = pts[k + 1], L = hyp(C[0] - A[0], C[1] - A[1]), n = Math.max(1, Math.ceil(L / .1));
    for (let j = 0; j <= n; j++) { const x = A[0] + (C[0] - A[0]) * j / n, y = A[1] + (C[1] - A[1]) * j / n; if (x >= x0 && x <= x1 && y >= y0 && y <= y1) segs.push(loc(x, y)); } } });
  const arr = arrivi.filter(a => a[0] === t.bi).map(a => [...loc(a[1], a[2]), a[3]]);
  t.cose.forEach(o => { if (o.k === 'colatura' || o.k === 'malta' || o.gronda) return; prove++;
    if (!TV.CAT[o.k].piatto && segs.some(([x, y]) => rr(o, x, y) < .55)) sulle.push(t.bi + ':' + o.k);
    if (arr.some(([x, y, r]) => rr(o, x, y) < r)) agli.push(t.bi + ':' + o.k); }); });
ok(!sulle.length, `niente a meno di 55 cm dalle linee dei giri, delle vie, dei rami (${prove} cose provate; ${sulle.length} sulle linee ${sulle.slice(0, 6).join(' ')})`);
ok(!agli.length, `niente sugli arrivi delle scale, delle passerelle e dei salti (${agli.length} ${agli.slice(0, 6).join(' ')})`);
ok(!V.corridoio.length, `il corridoio di 1,2 m e le porte del tetto (anche fra le porte, a due a due) sono liberi secondo il modulo (${V.corridoio.length})`);

// ---------------- 3. niente compenetrazioni nel dato ----------------
ok(!V.urti.length, `nessun urto fra le cose e coi gruppi del piano (${V.urti.length} ${JSON.stringify(V.urti.slice(0, 4))})`);
ok(!V.fuori.length, `dentro il parapetto (${V.fuori.length})`);
ok(!V.alti.length, `niente più alto di 1,2 m a meno di 1,5 m dai bordi verso la camera (${V.alti.length})`);
ok(TV.VISSUTI.every(t => !t || t.cose.every(o => o.k !== 'colatura' || o.fuori)), 'le colature stanno fuori, sulla faccia del parapetto');
const V3 = T.verifica3(); ok(V3.compenetrazioni.length === 0, `il piano dei tetti resta senza compenetrazioni (${V3.compenetrazioni.length})`);

// ---------------- 4. il determinismo ----------------
const f1 = TV.firma(); TV.calcola(); const f2 = TV.firma(); semina(987654321); TV.calcola(); const f3 = TV.firma(); semina(12345); TV.calcola();
ok(f1 === f2 && f2 === f3, `lo stesso dato due volte di fila e con un altro seme (${f1} ${f2} ${f3})`);
const ff = TV.firma(); ok(ff === f1, `col seme 12345 la firma è ${ff}`);

// ---------------- 5. il bilancio ----------------
const BL = TV.bilancio(); console.log('bilancio', JSON.stringify(BL));
ok(BL.disegni <= 150, `i disegni fissi aggiunti: ${BL.disegni} (le istanze vicine; mobili, piante e malta nelle mesh fuse dell'atlante)`);
ok(BL.vicino.carte <= 40 && BL.vicino.carteTel < BL.vicino.carte && BL.vicino.pozze <= 70 && BL.vicino.pozzeTel < BL.vicino.pozze, `le cartacce solo entro ${BL.vicino.carte} m (sul telefono ${BL.vicino.carteTel}), le pozze entro ${BL.vicino.pozze} m (${BL.vicino.pozzeTel})`);
ok(TV.VISSUTI.every(t => !t || t.cose.every(o => !['busta', 'cartaccia', 'giornale', 'tappi', 'pallone', 'scarpa', 'lattina', 'pozza'].includes(o.k) || TV.CAT[o.k].vicino)), 'ogni cartaccia e ogni pozza è un\'istanza vicina');
const fusi = V.cose - V.vicini.carte - V.vicini.pozze; ok(fusi <= 3200, `i pezzi fusi (nei gruppi dei tetti, nelle mesh per settore): ${fusi}`);

console.log(fail ? `\n${fail} prove non passate` : '\ntutte le prove passate');
process.exit(fail ? 1 : 0);
