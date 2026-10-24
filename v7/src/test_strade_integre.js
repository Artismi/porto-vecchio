// [pulizia] la prova delle strade integre (src/strade_integre.js) sulla città nuova: node src/test_strade_integre.js
// Le soglie sono il livello di oggi (24 ottobre 2026, dopo la pianta cea697e): i difetti non possono crescere. Quelli che oggi sono a zero
// restano a zero. Quando la pianta ne sistema, la soglia si abbassa qui (e la riga lo dice).
//   capo_cieco      una via che finisce nel nulla                                     0
//   asse            la carreggiata sotto una casa sull'asse della via                 0
//   capi_staccati   due capi di vie diverse a meno di 8 m che non si toccano          ≤ 8
//   buco            l'asse della via su una casella che non è suolo da strada         ≤ 2   (la fontana del Forno sul vicolo di Mezzo)
//   sotto_casa      la carreggiata ristretta da una casa (lotto o caselle)            ≤ 104 (i vicoli di 3 m con le case che entrano 0,5-1 m)
//   sotto_pezzo     la carreggiata nella scatola piena di un pezzo grande             ≤ 4   (la stazione sulla Via della Stazione)
//   marciapiede     il marciapiede di una via di città che smette o finisce contro un muro ≤ 17 (il Lungomare di Tramontana)
const path = require('path');
const log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {};
global.World = require(path.join(__dirname, 'world_cittanuova.js'));
console.log = log; console.warn = warn;
const S = require(path.join(__dirname, 'strade_integre.js'));
const R = S.analizza(World), C = R.conti;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const SOGLIE = { capo_cieco: 0, capi_staccati: 8, buco: 2, sotto_casa: 104, sotto_pezzo: 4, marciapiede: 17 };
ok(R.vie > 30, `le vie controllate nella cornice della città: ${R.vie}`);
Object.keys(SOGLIE).forEach(k => ok(C[k] <= SOGLIE[k], `${k}: ${C[k]} (al più ${SOGLIE[k]})` + (C[k] > SOGLIE[k] ? ' — ' + R.punti[k].slice(0, 4).map(p => p.slice(1).join(' ')).join('; ') : '')));
const asse = R.punti.sotto_casa.filter(p => /asse/.test(p[6]));
ok(!asse.length, `nessuna via con una casa sull'asse (${asse.length}${asse.length ? ': ' + asse.slice(0, 4).map(p => p.slice(1).join(' ')).join('; ') : ''})`);
console.log(fail ? `\n${fail} prove fallite` : '\ntutte le prove passate');
process.exitCode = fail ? 1 : 0;
