// Prova delle imprese (la gente si organizza), senza grafica. Uso (dalla cartella src): node test_imprese.js [giorni] [seme]
global.World = require('./world.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js'); global.Risacca = require('./risacca.js'); global.Popolo = require('./popolo.js'); global.Azioni = require('./azioni.js'); global.Economia = require('./economia.js');
['fazioni', 'soldi'].forEach(m => require('./' + m + '.js')); global.Oggetti = require('./oggetti.js'); ['protagonista', 'mestieri'].forEach(m => require('./' + m + '.js'));
global.Scambi = require('./scambi.js'); global.Convivenza = require('./convivenza.js'); global.Imprese = require('./imprese.js');
const G = Game, days = +process.argv[2] || 2, seed = +process.argv[3] || 1;
const st = G.create(seed), t0 = Date.now(); let steps = 0; const end = st.t + days * 1440;
while (st.t < end) { G.step(st, 1 / 30, {}); steps++; }
console.log(`${days} giorni, ${((Date.now() - t0) / steps).toFixed(2)} ms per passo`);
console.log('Imprese:', JSON.stringify(Imprese.report(st)));
console.log('Convivenza:', JSON.stringify(Convivenza.report(st)));
Imprese.list(st).slice(-8).forEach(E => console.log(` - [${E.status}] ${E.label} (${G.nameOf(st, E.leader)}), ${G.clockStr(E.t)} a ${E.tgt.label}: ${E.members.map(id => G.nameOf(st, id) + (E.roles[id] ? '/' + E.roles[id] : '')).join(', ')}${E.result ? ' → ' + E.result : ''}`));
