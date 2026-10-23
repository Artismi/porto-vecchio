// [tetti3] prova del piano dei tetti (tetti.js, Tetti.PIANO) sulla città nuova:
//   1. il ritmo e il conto per tetto: circa un tetto su tre abitato, da zero a due gruppi per tetto, i calmi al più uno (comignoli o antenna);
//      gli abitati dove va l'occhio (giri dei tetti, piazze, percorsi dominanti); il manto per epoca;
//   2. ogni gruppo ha uno scopo del catalogo e non si ripete sullo stesso tetto;
//   3. zero compenetrazioni nel piano: parapetto, falda (solo il colmo), bordo verso la camera, riserve (scale, passerelle, salti,
//      belvedere), corridoio del giro, gruppi fra loro;
//   4. le salite: ogni scala da terra si vede dalla camera (raggio contro le case col colmo delle falde e i pezzi grandi), le entrate e le
//      uscite dei giri dei tetti si vedono e hanno il piede su una casella di strada.
// cd v7/src && node test_tetti3.js
const path = require('path'), src = __dirname;
const log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {};
global.World = require(path.join(src, 'world_cittanuova.js'));
global.Percorsi = require(path.join(src, 'percorsi.js'));
global.Interior = require(path.join(src, 'interiors.js')); global.Game = require(path.join(src, 'game.js'));
global.Risacca = require(path.join(src, 'risacca.js')); global.Popolo = require(path.join(src, 'popolo.js')); global.Azioni = require(path.join(src, 'azioni.js'));
global.Livelli = require(path.join(src, 'livelli.js')); global.Sottosuolo = require(path.join(src, 'sottosuolo.js')); global.Tetti = require(path.join(src, 'tetti.js'));
console.log = log; console.warn = warn;
const T = Tetti, B = Game.BUILDINGS;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const V = T.verifica3(), P = T.PIANO.filter(Boolean);
console.log('tetti', V.tetti, 'abitati', V.vivi, 'calmi', V.calmi, 'gruppi per tetto [0,1,2]', JSON.stringify(V.perGruppi), 'gruppi', JSON.stringify(V.gruppi));
console.log('per epoca', JSON.stringify(V.perEra), 'abitati dove', JSON.stringify(V.viviDove));

// ---------------- 1. il ritmo e il budget ----------------
const quota = V.vivi / V.tetti;
ok(V.tetti > 50, `un piano per ogni casa con l'epoca (${V.tetti})`);
ok(quota > .26 && quota < .4, `circa un tetto su tre abitato (${(quota * 100).toFixed(0)}%)`);
ok(P.every(p => p.gruppi.length <= 2), 'nessun tetto con più di due gruppi');
ok(P.filter(p => !p.vivo).every(p => p.gruppi.length <= 2 && p.gruppi.every(g => g.k === 'comignoli' || g.k === 'antenna' || g.k === 'torretta')), 'i tetti calmi: al più i comignoli e un\'antenna ([tetti4] o la colombaia)');
ok(P.filter(p => p.vivo).every(p => p.tipo === 'piano' && p.gruppi.length >= 1 && ['bucato', 'pergola', 'vasi', 'stanza', 'altana'].includes(p.gruppi[0].k)), 'i tetti abitati sono terrazzi e il primo gruppo dice la vita (bucato, pergolato, vasi, stanza; [tetti4] l\'altana)');
const dove = V.viviDove, occhio = (dove.giro + dove.piazza + dove.lungo) / Math.max(1, V.vivi);
ok(occhio >= .5, `gli abitati dove va l'occhio: giri, piazze, percorsi dominanti (${(occhio * 100).toFixed(0)}%)`);
const giro = P.filter(p => p.giro); ok(giro.every(p => p.tipo === 'piano'), `i tetti dei giri sono terrazzi (${giro.length})`);
ok(P.every(p => p.tipo === 'piano' || (p.era === 'E3' ? p.manto === 'tegole' : p.manto === 'coppi')), 'il manto per epoca: coppi nel borgo, tegole nell\'Ottocento');
ok(P.filter(p => p.era === 'E4' || p.era === 'E6').every(p => p.tipo === 'piano' && p.manto === 'quadrotti'), 'regime e boom: lastrico di quadrotti');
ok(P.filter(p => p.era === 'E4').every(p => !p.gruppi.some(g => g.k === 'stanza' || g.k === 'bucato')), 'sul regime niente bucato né stanze abusive');

// ---------------- 2. gli scopi ----------------
ok(V.senzaScopo === 0, 'ogni gruppo ha il suo scopo nel catalogo');
ok(V.doppi === 0, 'nessun gruppo ripetuto sullo stesso tetto');

// ---------------- 3. le compenetrazioni del piano ----------------
const perTipo = {}; V.compenetrazioni.forEach(c => perTipo[c[c.length - 1]] = (perTipo[c[c.length - 1]] || 0) + 1);
ok(V.compenetrazioni.length === 0, `zero compenetrazioni sui tetti (${V.compenetrazioni.length} ${JSON.stringify(perTipo)})`);

// ---------------- 4. le salite ----------------
const S = V.salite;
console.log(`salite da terra ${S.scale}, viste ${S.viste}`);
ok(S.viste / Math.max(1, S.scale) >= .9, `le salite si vedono dalla camera (${S.viste}/${S.scale}, ${(100 * S.viste / Math.max(1, S.scale)).toFixed(0)}%)`);
ok(S.giri.length >= 6 && S.giri.every(q => q.vista && q.piede), `le entrate e le uscite dei giri si vedono, col piede in strada: ${S.giri.map(q => q.giro + ':' + q.lato + (q.vista ? '' : ' NASCOSTA')).join(' · ')}`);
const pot = B.map((b, i) => [b, i]).filter(([b]) => !b.era && (b.gov || b.military || b.church));
ok(pot.every(([b, i]) => !T.LADDERS.some(L => L.bi === i && !L.camm)), `nessuna scala dalla strada sui palazzi del potere e le chiese (${pot.length})`);

console.log(fail ? `\n${fail} prove non passate` : '\ntutte le prove passate');
process.exit(fail ? 1 : 0);
