process.chdir(process.argv[2]);
global.World = require('./world.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js'); global.Risacca = require('./risacca.js'); global.Popolo = require('./popolo.js'); global.Azioni = require('./azioni.js');
try { global.Livelli = require('./livelli.js'); } catch (e) { }
global.Economia = require('./economia.js'); global.Fazioni = require('./fazioni.js'); global.Soldi = require('./soldi.js'); global.Oggetti = require('./oggetti.js');
try { global.Protagonista = require('./protagonista.js'); } catch (e) {}
global.Mestieri = require('./mestieri.js');
const G = Game, st = G.create(1);
for (let i=0;i<30*60*3;i++) G.step(st,1/30,{});
const n = st.npcs.find(n=>n.pop && !n.pop.cast && n.pop.job);
console.log(Object.keys(n), '\nPOP', Object.keys(n.pop));
console.log('job', JSON.stringify(n.pop.job).slice(0,300));
console.log('tr', n.tr, 'homeT', JSON.stringify(n.pop.homeT).slice(0,200), 'inv', n.pop.inv, 'friends', n.pop.friends, 'hh', n.pop.hh, 'rel', n.pop.rel);
console.log('diary', n.pop.diary.slice(-3));
const E = Economia.eco(st); const k = Object.keys(E.shops)[0]; console.log('shop', k, Object.keys(E.shops[k]), Economia.price.toString().slice(0,200));
console.log('npcs', st.npcs.length, 'pop', st.npcs.filter(n=>n.pop).length, 'jobs', [...new Set(st.npcs.filter(n=>n.pop&&n.pop.job).map(n=>n.pop.job.title||n.pop.job.base))].slice(0,80).join('|'));
console.log('st keys', Object.keys(st));
