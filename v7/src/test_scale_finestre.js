// [scale-finestre] prova delle scale di ferro contro le aperture delle facciate (Andrea: «scala su finestra, capita quasi ovunque»):
//   1. nessuna scala (le salite da terra, le scale dal tetto basso del vicino, le scalette fra tetti, le salite della rete, le scale delle
//      corti) passa su un vano: finestre, porte, vetrine e insegne delle botteghe, la scala esterna della marina, le serrande del kit;
//      dal vano ci vogliono 25 cm d'aria per parte, su tutta l'altezza della scala (dal piede alla cima). Le aperture sono quelle che
//      tetti.js rifà con le regole di render.js (Tetti._.aperture4: buildModular e casaKit, dagli stessi dati e dagli stessi hash);
//      prima di [scale-finestre] le scale stavano al centro della casella, cioè sulla colonna delle finestre: 224 su 319;
//   2. le aperture rifatte hanno la forma di render.js: la finestra al centro di ogni modulo di 2 m, la porta sulla casella della porta;
//   3. le scale si contano per tipo e per muro (cieco, fra due colonne di finestre, sul giunto fra due case), e nessuna casa con la scala ha
//      la facciata sconosciuta senza che lo si dica.
//   4. il modulo cieco: dove il muro non ha un posto la scala lo accieca (L.cieco); render.js non ci mette la finestra (Tetti.cieco4).
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

// ---------------- 4. il modulo cieco ----------------
// dove il muro non ha un posto (le case strette dell'Ottocento), la scala accieca il suo modulo: la marca sta sulla scala (L.cieco) e
// render.js la legge con Tetti.cieco4 quando posa le finestre di buildModular. La marca va solo sulle case di buildModular, su un modulo
// dove c'è davvero una finestra, e Tetti.cieco4 la dice ai piani che la scala attraversa, non a quelli sotto il suo piede.
const ciechi = scale.filter(L => L.cieco), MG = 3.6, MF = 2.4;
const male = ciechi.filter(L => { const O = AP(L.bi), c = L.cieco, fl = Math.max(1, B[L.bi].fl || 1);
  if (!O || O.chi !== 'moduli' || !O[c.f].some(A => A[5] === 'fin' && Math.abs((A[0] + A[1]) / 2 - c.u) < .15)) return true;
  for (let p = 0; p < fl; p++) { const top = (p ? MG + (p - 1) * MF : 0) + 2.25; if (T.cieco4(L.bi, c.f, c.u, p) !== (top > c.y0 + .05)) return true; }
  return false; });
console.log(`moduli ciechi per le scale: ${ciechi.length} (${JSON.stringify(ciechi.reduce((o, L) => (o[tipo(L)] = (o[tipo(L)] || 0) + 1, o), {}))})`);
ok(!male.length, `ogni modulo cieco sta su una finestra di buildModular e Tetti.cieco4 lo dice ai piani che la scala attraversa (${male.length} sbagliati)`);
ok(ciechi.length <= scale.length * .3, `i moduli ciechi restano l'eccezione: ${ciechi.length} su ${scale.length} scale`);

// ---------------- 5. le scale di ferro non entrano in niente ----------------
// [scorcio] (il committente: «vedo ancora scale compenetrate») la fascia della scala (70 cm lungo il muro, mezzo metro in fuori) non sta
// dentro un'altra casa (la scala da terra) né fuori dal tetto basso del vicino (la scala dal vicino); quella da terra non posa i piedi
// su una scala, un muraglione, una scalinata, una fontana o un albero, e nessuna barriera (parapetti, ringhiere, corrimano) la taglia.
// Soglia zero. (Prima di [scorcio] 5 scale da terra stavano col fianco nella casa a filo sul giunto o sullo spigolo della corte.)
{ const W = G.MAP.world, OP = W.pedonali || [], BAR = W.barriere || [], bIn = (x, y) => B.findIndex(b => x > b.x * TS + .01 && x < (b.x + b.w) * TS - .01 && y > b.y * TS + .01 && y < (b.y + b.h) * TS - .01);
  const dentroP = (P, x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [ax, ay] = P[j], [bx, by] = P[i]; if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) c = !c; } return c; };
  const dSeg = (b, x, y) => { const dx = b[2] - b[0], dy = b[3] - b[1], l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - b[0]) * dx + (y - b[1]) * dy) / l2)); return Math.hypot(b[0] + dx * t - x, b[1] + dy * t - y); };
  const K = { casa: [], opera: [], albero: [], barriera: [] };
  T.LADDERS.filter(L => !L.camm && !(T.libero4 && T.libero4(B[L.bi]))).forEach(L => { const P = []; for (const t of [-.35, 0, .35]) for (const v of [.08, .3, .5]) P.push([L.x + L.ox * v - L.oy * t, L.y + L.oy * v + L.ox * t]);
    const altra = P.map(([x, y]) => bIn(x, y)).find(q => q >= 0 && q !== L.bi && q !== L.footB); if (altra !== undefined) K.casa.push(`${L.i} (${B[L.bi].id}) in ${B[altra].id}`);
    if (L.footB >= 0) return;   // sul tetto del vicino: il suolo sotto non conta
    const o = OP.find(o => o.tipo !== 'piazza' && o.tipo !== 'piazza_alta' && P.some(([x, y]) => o.poly ? dentroP(o.poly, x, y) : Math.hypot(x - o.x, y - o.y) < o.r)); if (o) K.opera.push(`${L.i} su ${o.id}`);
    if (P.some(([x, y]) => G.tileAt(Math.floor(x / TS), Math.floor(y / TS)) === G.T.TREE)) K.albero.push(String(L.i));
    const bb = BAR.find(b => P.some(([x, y]) => dSeg(b, x, y) < .1)); if (bb) K.barriera.push(`${L.i} / ${bb[4]}`); });
  const n = Object.values(K).reduce((a, v) => a + v.length, 0);
  ok(!n, `nessuna scala di ferro compenetrata (${T.LADDERS.length} scale; in un'altra casa ${K.casa.length}, su un'opera ${K.opera.length}, su un albero ${K.albero.length}, tagliate da una barriera ${K.barriera.length}${n ? ': ' + Object.values(K).flat().slice(0, 6).join('; ') : ''})`); }

console.log(fail ? `\n${fail} prove non passate` : '\ntutte le prove passate');
process.exit(fail ? 1 : 0);
