// [scale-finestre] prova delle scale di ferro contro le aperture delle facciate (Andrea: «scala su finestra, capita quasi ovunque»):
//   1. nessuna scala (le salite da terra, le scale dal tetto basso del vicino, le scalette fra tetti, le salite della rete, le scale delle
//      corti) passa su un vano: finestre, porte, vetrine e insegne delle botteghe, la scala esterna della marina, le serrande del kit;
//      dal vano ci vogliono 25 cm d'aria per parte, su tutta l'altezza della scala (dal piede alla cima). Le aperture sono quelle che
//      tetti.js rifà con le regole di render.js (Tetti._.aperture4: buildModular e casaKit, dagli stessi dati e dagli stessi hash);
//      prima di [scale-finestre] le scale stavano al centro della casella, cioè sulla colonna delle finestre: 224 su 319;
//   2. le aperture rifatte hanno la forma di render.js: la finestra al centro di ogni modulo di 2 m, la porta sulla casella della porta;
//   3. le scale si contano per tipo e per muro (cieco, fra due colonne di finestre, sul giunto fra due case), e nessuna casa con la scala ha
//      la facciata sconosciuta senza che lo si dica.
// cd v7/src && node test_scale_finestre.js            (il seme: --seme=N, per difetto 12345)
const path = require('path'), src = __dirname;
require(path.join(src, 'seme.js'))(12345);
const log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {};
global.World = require(path.join(src, 'world_cittanuova.js'));
global.Percorsi = require(path.join(src, 'percorsi.js'));
global.Interior = require(path.join(src, 'interiors.js')); global.Game = require(path.join(src, 'game.js'));
global.Risacca = require(path.join(src, 'risacca.js')); global.Popolo = require(path.join(src, 'popolo.js')); global.Azioni = require(path.join(src, 'azioni.js'));
global.Livelli = require(path.join(src, 'livelli.js')); global.Sottosuolo = require(path.join(src, 'sottosuolo.js')); global.Tetti = require(path.join(src, 'tetti.js'));
console.log = log; console.warn = warn;
const G = Game, T = Tetti, B = G.BUILDINGS, TS = G.TS, AP = T._.aperture4, SOPRA = T._.sopraApertura4;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };

// ---------------- 1. nessuna scala su un vano ----------------
const scale = T.LADDERS.filter(L => !L.camm), tipo = L => L.tipo4 || (L.footB >= 0 ? 'dal vicino' : 'da terra');
const sopra = [], ingombri = [], ignote = [], perTipo = {};
scale.forEach(L => { const k = tipo(L); perTipo[k] = (perTipo[k] || 0) + 1;
  if (!AP(L.bi)) { ignote.push(L); return; }
  const h = SOPRA(L.bi, L.x, L.y, L.ox, L.oy, L.footB); if (h) sopra.push({ L, h });
  else if (SOPRA(L.bi, L.x, L.y, L.ox, L.oy, L.footB, true)) ingombri.push(L); });
console.log(`scale ${scale.length} ${JSON.stringify(perTipo)}; sul muro cieco ${scale.length - sopra.length - ingombri.length - ignote.length}, fra due colonne di finestre (accanto alle persiane) ${ingombri.length}, su case dalla facciata non rifatta ${ignote.length}`);
sopra.slice(0, 8).forEach(({ L, h }) => console.log(`  la scala ${L.i} (${tipo(L)}) di ${B[L.bi].id} sul lato ${h.f} a ${h.u.toFixed(2)} m: il vano ${h.A[0].toFixed(2)}-${h.A[1].toFixed(2)} m, quota ${h.A[2].toFixed(1)}-${h.A[3].toFixed(1)}`));
ok(sopra.length === 0, `nessuna scala su una finestra, una porta, una vetrina (25 cm d'aria per parte): ${sopra.length} su ${scale.length}`);
// le case con la scala e la facciata non rifatta (i pezzi, le chiese, le baracche: non le monta buildModular né casaKit) sono poche
ok(ignote.length <= Math.max(25, scale.length * .1), `case con la scala e la facciata non rifatta: ${ignote.length} (${[...new Set(ignote.map(L => B[L.bi].id))].slice(0, 6).join(', ')}${ignote.length > 6 ? '…' : ''})`);

// ---------------- 2. la forma delle aperture rifatte ----------------
// una casa del borgo dell'Ottocento a due piani o più, senza bottega e col lotto sulla casella: ogni modulo del lato sud ha la finestra al
// primo piano (E3: tutte le colonne), la porta sta sulla casella della porta
const casa = B.findIndex(b => b.era === 'E3' && b.fl >= 2 && b.w >= 3 && !b.shop && !b.sign && !b.shopFront && !b.rot && !T.libero4(b) && b.door && b.door[1] === b.y + b.h && AP(B.indexOf(b)) && AP(B.indexOf(b)).chi === 'moduli');
if (casa >= 0) { const b = B[casa], O = AP(casa), y1 = 3.6 + .4, fin = O.S.filter(A => A[4] && A[2] >= y1 - .01 && A[2] < y1 + .01).map(A => (A[0] + A[1]) / 2).sort((p, q) => p - q);
  const attese = Array.from({ length: b.w }, (_, k) => k * TS + 1), porta = O.S.filter(A => A[4] && A[2] === 0 && Math.abs((A[0] + A[1]) / 2 - ((b.door[0] - b.x) * TS + 1)) < .01);
  ok(fin.length === b.w && fin.every((u, k) => Math.abs(u - attese[k]) < .01) && porta.length === 1, `le aperture di ${b.id} (${b.w}x${b.h}, ${b.fl} piani): al primo piano le finestre a ${fin.map(u => u.toFixed(1)).join(', ')} m, la porta sulla sua casella`); }
else ok(false, 'manca una casa dell\'Ottocento per la forma delle aperture');
// fra due colonne di finestre (il giunto fra due moduli) la scala ci sta: 1,05 m fra i vani, 49 cm la scala, 28 cm d'aria per parte
{ const b = B[casa], [wx, wy] = [(b.x + 1) * TS, (b.y + b.h) * TS], [cx, cy] = [(b.x + .5) * TS, (b.y + b.h) * TS];
  ok(!SOPRA(casa, wx, wy, 0, 1, -1) && !!SOPRA(casa, cx, cy, 0, 1, -1), `sul giunto fra due moduli la scala sta (${!SOPRA(casa, wx, wy, 0, 1, -1)}), al centro del modulo no: lì c'è la finestra (${!!SOPRA(casa, cx, cy, 0, 1, -1)})`); }

console.log(fail ? `\n${fail} prove non passate` : '\ntutte le prove passate');
process.exit(fail ? 1 : 0);
