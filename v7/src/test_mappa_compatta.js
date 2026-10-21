// [mappa_compatta] la prova della città compatta (progetto_citta/MAPPA_COMPATTA.md, sez. 9 e 11): la cornice, le larghezze, le strade che
// si incontrano davvero (strumenti/incroci.js: nessun capo aperto, nessun moncone, angoli veri) e, passo dopo passo, le altezze, i
// luoghi-missione, le viste dei landmark, l'inventario. Ogni passo della migrazione aggiunge le sue righe.
// node src/test_mappa_compatta.js   (dalla cartella v7)
const path = require('path'), src = __dirname;
const log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {};
global.World = require(path.join(src, 'world_cittanuova.js'));
console.log = log; console.warn = warn;
const W = World, TS = W.TS, B = W.BUILDINGS, I = require(path.join(src, '..', 'strumenti', 'incroci.js'));
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const CORNICE = [1222, 250, 1610, 452], inC = (x, y) => x >= CORNICE[0] && x <= CORNICE[2] && y >= CORNICE[1] && y <= CORNICE[3];
const cen = b => [(b.x + b.w / 2) * TS, (b.y + b.h / 2) * TS];
const lungo = P => P.reduce((L, q, i) => i ? L + Math.hypot(q[0] - P[i - 1][0], q[1] - P[i - 1][1]) : 0, 0);

// ---------------- passo 1: la cornice ----------------
const citta = B.filter(b => b.era);   // le case della città per epoche (le case sparse dell'entroterra lungo le costiere restano)
const fuori = citta.filter(b => { const [x, y] = cen(b); return y > 200 && y < 470 && x > 1000 && x < 1700 && !inC(x, y); });
ok(!fuori.length, `niente case della città fuori dalla cornice 1222-1610 (${fuori.length}${fuori.length ? ': ' + fuori.slice(0, 5).map(b => b.id + '@' + cen(b).map(Math.round)).join(' ') : ''})`);
['via_governo', 'via_nazionale', 'raccordo_e', 'porto', 'via_cavour'].forEach(id => ok(!W.roads.some(r => r.id === id), `la strada tolta non c'è più: ${id}`));
const lit = W.roads.filter(r => r.kind === 'litoranea' && r.pts.some(([x, y]) => x > 1252 && inC(x, y)));
ok(!lit.length, `nessuna costiera dentro la città (${lit.map(r => r.id).join(', ')})`);

// ---------------- passo 2: le strade ----------------
const R = W.roads.filter(r => r.pts && r.kind !== 'sterrato' && r.pts.some(([x, y]) => inC(x, y)) && r.pts.every(([x]) => x >= 1180));
const W_OK = { 10: 1, 7: 1, 5: 1 }, larghe = R.filter(r => !(W_OK[r.w] || r.w <= 3));
ok(!larghe.length, `le larghezze ammesse: 10, 7, 5, ≤ 3 m (${larghe.map(r => r.id + ' ' + r.w).join(', ') || 'tutte'})`);
const vit = W.roads.find(r => r.id === 'vittoria'), cor = W.roads.find(r => r.id === 'corso'), rua = W.roads.find(r => r.id === 'rua'), mar = W.roads.find(r => r.id === 'marina');
ok(vit && vit.w === 10 && lungo(vit.pts) > 200, `un asse: la Vittoria, 10 m (${vit && Math.round(lungo(vit.pts))} m)`);
ok(cor && cor.w === 7 && rua && rua.w === 5 && mar && mar.w === 5, 'tre vie: il Corso 7 m, la Rua e la Marina 5 m');
const nVic = R.filter(r => r.w <= 3).length; ok(nVic >= 20 && nVic <= 34, `i vicoli: ${nVic} (il progetto: ~28)`);
const { strade, nodi } = I.dalMondo(W, CORNICE), C = I.controlla(strade, nodi);
console.log('     incroci', JSON.stringify(C.conti));
ok(C.conti.aperti === 0, `ogni capo finisce su una strada, in un nodo o contro una chiusura dichiarata (aperti: ${C.conti.aperti})`);
ok(!C.errori.some(e => /moncone/.test(e)), 'nessun moncone oltre un incrocio' + (C.errori.filter(e => /moncone/.test(e)).length ? ': ' + C.errori.filter(e => /moncone/.test(e)).slice(0, 3).join(' · ') : ''));
ok(!C.errori.some(e => /angolo/.test(e)), 'ogni incrocio ha gli angoli veri (≥ 40°)' + (C.errori.filter(e => /angolo/.test(e)).length ? ': ' + C.errori.filter(e => /angolo/.test(e)).slice(0, 3).join(' · ') : ''));
ok(C.errori.length === 0, `il controllo degli incroci è pulito (${C.errori.length} errori)` + (C.errori.length ? ': ' + C.errori.slice(0, 3).join(' · ') : ''));
ok(C.capi.filter(c => c.k === 'chiuso').every(c => c.perche && c.perche.length > 8), 'ogni chiusura dice il suo perché');
ok(C.conti.T >= 30, `le strade laterali si aprono dai fronti: ${C.conti.T} incroci a T`);

console.log(fail ? `\n${fail} prove non passate` : '\ntutte le prove passano');
process.exit(fail ? 1 : 0);
