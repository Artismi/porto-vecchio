// [tetti4] prova dei tetti come secondo livello esplorabile (tetti.js: rete4, corti4, premi4, copertura4, il piano; percorsi.js: i giri
// col tema, le vie e i rami) sulla città nuova:
//   1. la copertura: nel borgo almeno il 70% dei tetti si raggiunge dalla rete dei giri; marina e Ottocento almeno il 60%; le isole e i
//      tetti irraggiungibili calano rispetto a prima;
//   2. i giri: da 8 a 10 (il camminamento delle mura compreso), ognuno col suo tema e almeno un ramo che paga (belvedere, terrazza,
//      tesoro, corte); almeno due vie per salire e due per scendere, scale da terra viste dalla camera col piede in strada;
//   3. tutto si percorre col motore del gioco: la linea del giro, ogni via in su e in giù, ogni ramo fino al premio (la corte: giù
//      per la scala fino al cortile);
//   4. i tetti espressivi: più forme per quartiere (capanna col colmo nei due versi, padiglione, falda, cupoletta, volta), pendenze
//      diverse, la forma più comune sotto la metà dei tetti del borgo, i tetti muti in calo, i terrazzi col parapetto di più altezze;
//      zero compenetrazioni nel piano (premi compresi);
//   5. le corti a terra: ogni vuoto chiuso dentro gli isolati vecchi ha uno scopo (pozzo, orto, cortile delle reti, passaggio coperto).
// cd v7/src && node test_tetti4.js
const path = require('path'), src = __dirname;
const log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {};
global.World = require(path.join(src, 'world_cittanuova.js'));
global.Percorsi = require(path.join(src, 'percorsi.js'));
global.Interior = require(path.join(src, 'interiors.js')); global.Game = require(path.join(src, 'game.js'));
global.Risacca = require(path.join(src, 'risacca.js')); global.Popolo = require(path.join(src, 'popolo.js')); global.Azioni = require(path.join(src, 'azioni.js'));
global.Livelli = require(path.join(src, 'livelli.js')); global.Sottosuolo = require(path.join(src, 'sottosuolo.js')); global.Tetti = require(path.join(src, 'tetti.js'));
console.log = log; console.warn = warn;
const G = Game, T = Tetti, LV = Livelli, D = Percorsi.dati, B = G.BUILDINGS, TS = G.TS, hyp = Math.hypot;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };

// ---------------- 1. la copertura ----------------
const C4 = T.copertura4(), Z = C4.zone;
Object.entries(Z).forEach(([z, s]) => console.log(`${z}: ${s.tetti} tetti, sul giro ${s.giro}, dalla rete ${s.rete}, isole ${s.isola}, irraggiungibili ${s.muro}, muti ${s.muti}, forme ${JSON.stringify(s.forme)}`));
ok(Z.borgo.raggiungibili >= .7, `nel borgo i tetti raggiungibili dalla rete dei giri: ${Math.round(100 * Z.borgo.raggiungibili)}% (almeno 70%; prima 23%)`);
ok(Z.marina.raggiungibili >= .7 && Z.ottocento.raggiungibili >= .7, `marina ${Math.round(100 * Z.marina.raggiungibili)}%, Ottocento ${Math.round(100 * Z.ottocento.raggiungibili)}% (almeno 70%; prima 0% e 12%)`);   // [cucitura] alzato a 70%
ok(Z.borgo.isola + Z.borgo.muro <= 90, `nel borgo isole e irraggiungibili: ${Z.borgo.isola} + ${Z.borgo.muro} (prima 167 + 77)`);
ok(Z.borgo.attraversati >= .2, `i tetti del borgo attraversati da un giro, da una sua via o da un suo ramo: ${Math.round(100 * Z.borgo.attraversati)}% (prima 3%)`);
const R4 = T.RETE4; console.log(`la rete: ${R4.scalette.length} scalette fra tetti, ${R4.archi.length} archi, ${R4.passerelle.length} passerelle, ${(R4.salite || []).length} salite nuove da terra, ${R4.anelli} anelli`);
ok(R4.scalette.length >= 20 && R4.archi.length >= 8, 'i legami nuovi col vocabolario di qui: scalette di ferro e archi di contrasto');
ok(T.PLANKS.filter(P => P.via5).length <= 4, `sopra la Rua e la Marina pochi archi (${T.PLANKS.filter(P => P.via5).length}), uno ogni 30 m`);

// ---------------- 2. i giri, i temi, i premi, le vie ----------------
const giri = D.circuiti.filter(c => c.k === 'tetti'), tutti = D.circuiti;
ok(giri.length >= 8 && giri.length <= 10 && tutti.length === giri.length + 1, `da otto a dieci giri sui tetti, più le mura (${tutti.length}: ${tutti.map(c => c.nome.replace(/^Il (giro )?/, '')).join(', ')})`);
ok(tutti.every(c => c.tema), 'ogni giro ha il suo tema: ' + tutti.map(c => c.tema).join(' · '));
ok(giri.every(c => (c.rami || []).length >= 1), 'ogni giro sui tetti ha almeno un ramo che paga: ' + giri.map(c => c.id.replace('giro_', '') + ' ' + c.rami.map(r => r.premio).join('+')).join(' · '));
const kinds = new Set(); giri.forEach(c => c.rami.forEach(r => kinds.add(r.premio)));
ok(kinds.size >= 4, `i premi sono di quattro tipi (${[...kinds].join(', ')})`);
ok(T.PREMI.length === giri.reduce((s, c) => s + c.rami.length, 0) && T.BELV.filter(v => v.giro).length === giri.reduce((s, c) => s + c.rami.filter(r => r.premio === 'belvedere').length, 0), `i premi nel mondo (${T.PREMI.length}) e i belvederi dei giri fra i belvederi (${T.BELV.filter(v => v.giro).length})`);
const strada = L => G.walkT(Math.floor(L.fx / TS), Math.floor(L.fy / TS)) && T.bAt(L.fx, L.fy) < 0;
giri.forEach(c => { const su = [...new Set(c.salite)], giu = [...new Set(c.discese)], tutte = [...new Set(su.concat(giu))].map(i => T.LADDERS[i]);
  ok(su.length >= 2 && giu.length >= 2 && tutte.every(L => L.footB < 0 && strada(L) && T.vistaL3(L)), `${c.nome}: ${su.length} vie su e ${giu.length} giù, tutte da terra e viste dalla camera`); });

// ---------------- 3. col motore ----------------
const st = G.create(1), p = st.player, DT = 1 / 30;
const run = (s, inp) => { for (let i = 0; i < s * 30; i++) G.step(st, DT, Object.assign({ x: 0, y: 0 }, inp)); };
const calm = () => { p.hp = 100; p.stun = 0; p.kbx = p.kby = 0; st.police = []; st.heat = 0; p.speed = 0; p.jz = 0; p.jvz = 0; p.jcharge = null; };
const clear = () => st.npcs.forEach(n => { if (hyp(n.x - p.x, n.y - p.y) < 30) { n.x = p.x + 120; n.y = p.y; n.path = []; } });
const roofAt = (b, x, y) => { const q = T.roofAt(x, y); return q && q.bi === b ? q.h : T.roofRule(B[b]); };
function sali(L) { p.lv = null; p.indoor = null; p.vehicle = null; p.x = L.fx; p.y = L.fy; calm(); clear(); LV.key(st, 'v'); run(8, {}); return !!(p.lv && p.lv.k === 'tetto' && p.lv.b === L.bi); }
function scendi(L) { p.lv = { k: 'tetto', b: L.bi, h: roofAt(L.bi, L.tx, L.ty) }; p.x = L.tx; p.y = L.ty; calm(); clear(); LV.key(st, 'v'); run(9, {}); return !p.lv && hyp(p.x - L.fx, p.y - L.fy) < .3; }
function passa(e) {   // come test_percorsi.js
  if (e.k === 'scala') { const L = T.LADDERS[e.i], up = e.a === L.footB; p.lv = { k: 'tetto', b: e.a, h: up ? roofAt(e.a, L.fx, L.fy) : roofAt(e.a, L.tx, L.ty) }; p.x = up ? L.fx : L.tx; p.y = up ? L.fy : L.ty; calm(); clear();
    T.climb(st, L, up); run(9, {}); return p.lv && p.lv.k === 'tetto' && p.lv.b === e.b && p.hp === 100; }
  const PK = e.k === 'passerella' ? T.PLANKS[e.i] : null, ux = e.ux, uy = e.uy, back = e.k === 'salto' ? 2.2 : e.k === 'passerella' ? (PK && PK.pin ? PK.gap / 2 + PK.pin + .3 : 3.4) : e.k === 'gradino' ? .55 : 1.2;
  p.x = e.x - ux * back; p.y = e.y - uy * back; p.lv = { k: 'tetto', b: e.a, h: roofAt(e.a, p.x, p.y) }; calm(); clear(); T.settle(st);
  if (!(p.lv && p.lv.b === e.a)) return false;
  if (e.k === 'salto' || e.k === 'gradino') { G.jumpHold(st, true); run(.7, {}); G.jumpHold(st, false); }
  for (let k = 0; k < 5 * 30 && !(p.lv && p.lv.b === e.b && !(p.jz > 0)); k++) G.step(st, DT, { x: ux, y: uy, sprint: e.k === 'salto' });
  run(.4, {}); return !!(p.lv && p.lv.k === 'tetto' && p.lv.b === e.b) && p.hp === 100;
}
const nome = e => e.k + '(' + B[e.a].id + '→' + B[e.b].id + ')';
let passi = 0;
giri.forEach(c => {
  const es = [], L0 = T.LADDERS[c.sali], L1 = T.LADDERS[c.scendi];
  es.push(sali(L0) ? 'su' : 'NOsu'); c.passi.forEach(e => { passi++; es.push(passa(e) ? e.k[0] : 'NO' + nome(e)); }); es.push(scendi(L1) ? 'giù' : 'NOgiù');
  (c.vie || []).forEach(v => { const L = T.LADDERS[v.i];
    const a = [sali(L) ? 'su' : 'NOsu']; v.su.forEach(e => { passi++; a.push(passa(e) ? e.k[0] : 'NO' + nome(e)); }); a.push(p.lv && c.edifici.includes(p.lv.b) ? 'giro' : 'NOgiro');
    const b = []; v.giu.forEach(e => { passi++; b.push(passa(e) ? e.k[0] : 'NO' + nome(e)); }); b.push(scendi(L) ? 'giù' : 'NOgiù');
    es.push('| via ' + a.join(' ') + ' / ' + b.join(' ')); });
  (c.rami || []).forEach(r => { const a = []; r.passi.forEach(e => { passi++; a.push(passa(e) ? e.k[0] : 'NO' + nome(e)); });
    if (!r.passi.length) { const q = T.LADDERS[r.scala]; p.lv = { k: 'tetto', b: r.bi, h: roofAt(r.bi, q.tx, q.ty) }; }
    a.push(p.lv && p.lv.b === r.bi ? r.premio : 'NO' + r.premio);
    if (r.premio === 'corte') { const L = T.LADDERS[r.scala], Cc = T.CORTI[L.corte]; const giu = scendi(L), dentro = Cc && Cc.celle.some(([x, y]) => x === Math.floor(p.x / TS) && y === Math.floor(p.y / TS)); a.push(giu && dentro ? 'nella corte' : 'NOcorte'); }
    es.push('| ramo ' + a.join(' ')); });
  ok(!es.some(s => /NO/.test(s)), `${c.nome} (${c.tema}): ${es.join(' ')}`);
});
console.log(`passaggi percorsi col motore: ${passi}`);
// il tesoro si apre la prima volta, e una volta sola
{ const q = T.PREMI.find(z => z.k === 'tesoro'); if (q) { if (st.tetti) st.tetti.tesori = {}; p.lv = { k: 'tetto', b: q.bi, h: T.roofRule(B[q.bi]) }; p.x = q.x; p.y = q.y; calm(); const m0 = p.money; run(.3, {}); const m1 = p.money; run(.3, {}); ok(m1 > m0 && p.money === m1, `il tesoro si apre una volta (+${m1 - m0})`); } }

// ---------------- 4. i tetti espressivi e senza compenetrazioni ----------------
const V = T.verifica3(), perTipo = {}; V.compenetrazioni.forEach(c => perTipo[c[c.length - 1]] = (perTipo[c[c.length - 1]] || 0) + 1);
ok(V.compenetrazioni.length === 0, `zero compenetrazioni nel piano dei tetti (${V.compenetrazioni.length} ${JSON.stringify(perTipo)})`);
const P4 = T.PIANO.filter(P => P && (P.era === 'E0' || P.era === 'E2' || P.era === 'E3'));
const firme = {}; P4.filter(P => P.era === 'E0').forEach(P => { const f = P.firma4; firme[f] = (firme[f] || 0) + 1; });
const dom = Math.max(...Object.values(firme)) / P4.filter(P => P.era === 'E0').length;
console.log('forme del borgo', JSON.stringify(firme));
ok(dom < .5, `nel borgo la forma più comune copre ${Math.round(100 * dom)}% dei tetti (meno della metà)`);
const forme = new Set(P4.map(P => P.forma4 || P.forma || P.tipo)); ok(['capanna', 'padiglione', 'falda', 'cupola', 'volta'].every(f => forme.has(f)), `le forme: ${[...forme].join(', ')}`);
ok(P4.some(P => P.colmo && !P.colmo.along) && P4.some(P => P.colmo && P.colmo.along), 'il colmo nei due versi');
const pend = new Set(P4.filter(P => P.pitch).map(P => P.pitch.toFixed(2))); ok(pend.size >= 5, `pendenze diverse (${pend.size})`);
const par = new Set(); P4.forEach(P => P.parapetti && Object.values(P.parapetti).forEach(h => par.add(h))); ok(par.size >= 3, `i parapetti dei terrazzi di più altezze (${[...par].sort().join(', ')} m)`);
ok(P4.filter(P => P.tipo === 'piano' && P.parapetti).every(P => P.parapetti.S <= .5 && P.parapetti.E <= .5), 'verso la camera (sud, est) il parapetto resta basso');
ok(T.PIANO.filter(Boolean).every(P => !P.giro || P.tipo === 'piano'), 'i tetti dei giri restano terrazzi');
const alt = T.PIANO.filter(P => P && P.gruppi.some(g => g.k === 'altana')).length, tor = T.PIANO.filter(P => P && P.gruppi.some(g => g.k === 'torretta')).length;
ok(alt >= 4 && tor >= 2, `altane (${alt}) e torrette (${tor}) sui tetti`);
const cam = {}; T.PIANO.forEach(P => P && P.gruppi.forEach(g => { if (g.k === 'comignoli' && g.tipo4) cam[g.tipo4] = (cam[g.tipo4] || 0) + 1; })); ok(Object.keys(cam).length >= 3, `comignoli di più tipi: ${JSON.stringify(cam)}`);
ok(T.PREMI.every(q => { const P = T.PIANO[q.bi]; return !P || P.riserve.some(r => hyp(r[0] - q.x, r[1] - q.y) < .05); }), 'ogni premio ha il suo posto riservato sul tetto');

// ---------------- 5. le corti ----------------
const CO = T.CORTI, ck = {}; CO.forEach(c => ck[c.k] = (ck[c.k] || 0) + 1);
ok(CO.length >= 10 && CO.every(c => ['pozzo', 'orto', 'bottega', 'passaggio'].includes(c.k)), `le corti a terra con uno scopo: ${CO.length} ${JSON.stringify(ck)}`);
ok(CO.filter(c => c.scala >= 0).length >= 3, `le scale che scendono nelle corti (${CO.filter(c => c.scala >= 0).length})`);
ok(giri.some(c => c.rami.some(r => r.premio === 'corte')), 'almeno un giro scende in una corte');

console.log(fail ? `\n${fail} prove non passate` : '\ntutte le prove passate');
process.exit(fail ? 1 : 0);
