// Prova degli scambi tra la gente e della memoria lunga, senza grafica. Uso (dalla cartella src): node test_scambi.js [giorni] [seme]
global.World = require('./world.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js'); global.Risacca = require('./risacca.js'); global.Popolo = require('./popolo.js'); global.Azioni = require('./azioni.js'); global.Economia = require('./economia.js');
['fazioni', 'soldi'].forEach(m => require('./' + m + '.js')); global.Oggetti = require('./oggetti.js'); ['protagonista', 'mestieri'].forEach(m => require('./' + m + '.js'));
global.Scambi = require('./scambi.js');
const G = Game, Po = Popolo, days = +process.argv[2] || 2, seed = +process.argv[3] || 1;
const st = G.create(seed), t0 = Date.now(); let steps = 0;
const end = st.t + days * 1440;
while (st.t < end) { G.step(st, 1 / 30, {}); steps++; }
const pp = st.npcs.filter(n => n.pop && n.pop.ints);
console.log(`${days} giorni, ${pp.length} persone, ${((Date.now() - t0) / steps).toFixed(2)} ms per passo`);
console.log('Scambi:', JSON.stringify(Scambi.report(st)));
const tags = {}; pp.forEach(n => n.pop.diary.forEach(e => { if (/scambio|debito|favore|patto|aiuto|tradimento|ricordo|freddo/.test(e.tag)) tags[e.tag] = (tags[e.tag] || 0) + 1; }));
console.log('Nei diari:', JSON.stringify(tags));
const lunga = pp.map(n => (n.pop.lunga || []).length); console.log('Memoria lunga: media', (lunga.reduce((a, b) => a + b, 0) / pp.length).toFixed(1), 'max', Math.max(...lunga));
console.log('Debiti aperti:', pp.reduce((s, n) => s + Object.keys(n.pop.debiti || {}).length, 0));
const ex = pp.filter(n => n.pop.diary.some(e => /scambio|debito|favore|patto/.test(e.tag))).slice(0, 4);
ex.forEach(n => { console.log(`\n— ${n.name} (${n.role}), ${Math.round(n.pop.money)}.000 lire, tasche: ${JSON.stringify(n.pop.inv)}, casa: ${JSON.stringify(n.pop.casa || {})}`);
  n.pop.diary.filter(e => /scambio|debito|favore|patto|aiuto|tradimento|ricordo/.test(e.tag)).slice(-5).forEach(e => console.log(`   ${G.clockStr(e.t)} ${e.text}`));
  (n.pop.lunga || []).slice(-3).forEach(e => console.log(`   [lunga ×${e.times}] ${e.text}`)); });
