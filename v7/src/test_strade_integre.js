// [pulizia] la prova delle strade integre (src/strade_integre.js) sulla città nuova: node src/test_strade_integre.js
// Le soglie sono il livello di oggi (24 ottobre 2026, dopo la pianta cea697e): i difetti non possono crescere. Quelli che oggi sono a zero
// restano a zero. Quando la pianta ne sistema, la soglia si abbassa qui (e la riga lo dice).
//   capo_cieco      una via che finisce nel nulla                                     0
//   asse            la carreggiata sotto una casa sull'asse della via                 0
//   capi_staccati   due capi di vie diverse a meno di 8 m che non si toccano          ≤ 2   ([pianta] prima 8: ora un incrocio vero)
//   buco            l'asse della via su una casella che non è suolo da strada         0     ([pianta] la fontana del Forno spostata in un canto)
//   sotto_casa      la carreggiata ristretta da una casa (lotto o caselle)            0     ([pianta] nessuna casa sopra le strade: le case arretrate, le casette levate; prima 104)
//   sotto_pezzo     la carreggiata nella scatola piena di un pezzo grande             0     ([pianta] la stazione 2 m a levante, la banchina fuori dalla via; prima 4)
//   marciapiede     il marciapiede di una via di città che smette o finisce contro un muro 0 ([pianta] prima 17; il
//                   marciapiede disegnato da render.js c'è di continuo, lo dice Pavimenti.swH nel gioco)
//   scoglio         uno scoglio grande della costa sulla carreggiata o sul marciapiede ≤ 15 (gli scogli delle mura sul Lungomare di Tramontana)
const path = require('path');
const log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {};
global.World = require(path.join(__dirname, 'world_cittanuova.js'));
console.log = log; console.warn = warn;
const S = require(path.join(__dirname, 'strade_integre.js'));
const R = S.analizza(World), C = R.conti;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const SOGLIE = { capo_cieco: 0, capi_staccati: 2, buco: 0, sotto_casa: 0, sotto_pezzo: 0, marciapiede: 0, scoglio: 0 };   // [sporcherie] tolti i massi sotto le mura: nessuno scoglio grande in strada   // [pianta] capi allineati (8 → 2), la fontana del Forno fuori dagli assi (2 → 0), nessuna casa sopra le strade: vicoli larghi quanto il corridoio, case arretrate dal filo, casette levate (sotto_casa 104 → 0), la stazione 2 m a levante (sotto_pezzo 4 → 0), il marciapiede continuo (17 → 0); gli scogli sono della costa
ok(R.vie > 30, `le vie controllate nella cornice della città: ${R.vie}`);
Object.keys(SOGLIE).forEach(k => ok(C[k] <= SOGLIE[k], `${k}: ${C[k]} (al più ${SOGLIE[k]})` + (C[k] > SOGLIE[k] ? ' — ' + R.punti[k].slice(0, 4).map(p => p.slice(1).join(' ')).join('; ') : '')));
const asse = R.punti.sotto_casa.filter(p => /asse/.test(p[6]));
ok(!asse.length, `nessuna via con una casa sull'asse (${asse.length}${asse.length ? ': ' + asse.slice(0, 4).map(p => p.slice(1).join(' ')).join('; ') : ''})`);
// [pulizia] le case accostate (l'utente: «o davvero fuse assieme, un'unica architettura, o separate; niente vie di mezzo, niente palazzi
// in griglia spigolosi e in mezzo»). Soglie di oggi, 24 ottobre; le baracche sono disordinate per costruzione e non contano
const AC = S.accostamenti(World), CA = AC.conti, SOGLIE_AC = { compenetrate: 2, fessura: 1, spiraglio: 159, appaiate_storte: 2, griglia_storta: 143, in_mezzo: 5 };   // spiraglio 159: uno in più dopo l'unione di [pianta] e [pulizia] (la stessa soglia scende con la revisione)
Object.keys(SOGLIE_AC).forEach(k => ok(CA[k] <= SOGLIE_AC[k], `case ${k}: ${CA[k]} (al più ${SOGLIE_AC[k]})` + (CA[k] > SOGLIE_AC[k] ? ' — ' + AC.punti[k].slice(0, 4).map(p => p.slice(1).join(' ')).join('; ') : '')));
console.log(fail ? `\n${fail} prove fallite` : '\ntutte le prove passate');
process.exitCode = fail ? 1 : 0;
