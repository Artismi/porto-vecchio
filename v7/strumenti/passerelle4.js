// [tetti4] LE PASSERELLE CONTRO I TETTI: ogni passerella, arco e ponte fra i tetti (Tetti.PLANKS) contro il solido dei tetti delle case
// che tocca o sorvola (Tetti.passerelle4: falde col manto, gronde, colmo, comignoli, parapetti con la copertina, gruppi, cupole, premi,
// le cose dei tetti vissuti), tolleranza 2 cm. Stampa ogni passerella che urta, col punto peggiore (x, y, quota) e contro cosa.
//   node strumenti/passerelle4.js [--json uscita.json]
const path = require('path'), fs = require('fs'), src = path.join(__dirname, '..', 'src');
require(path.join(src, 'seme.js'))(12345);
const log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {};
global.World = require(path.join(src, 'world_cittanuova.js')); global.Percorsi = require(path.join(src, 'percorsi.js'));
global.Interior = require(path.join(src, 'interiors.js')); global.Game = require(path.join(src, 'game.js'));
global.Livelli = require(path.join(src, 'livelli.js')); global.Sottosuolo = require(path.join(src, 'sottosuolo.js')); global.Tetti = require(path.join(src, 'tetti.js'));
global.TettiVissuti = require(path.join(src, 'tetti_vissuti.js'));
console.log = log; console.warn = warn;
const R = Tetti.passerelle4(), k = {};
R.urti.forEach(u => { k[u.tipo] = (k[u.tipo] || 0) + 1; });
console.log(`passerelle ${R.passerelle}, con urti ${R.conPunti} ${JSON.stringify(k)}, punti ${R.urti.reduce((s, u) => s + u.n, 0)}`);
R.urti.sort((a, b) => b.cm - a.cm).forEach(u => console.log(`  #${u.i} ${u.tipo} ${Game.BUILDINGS[u.a].id}→${Game.BUILDINGS[u.b].id}: ${u.n} punti, il peggiore ${u.cm} cm dentro ${u.contro} (${u.forma}) a (${u.x}, ${u.y}, ${u.z})`));
const j = process.argv.indexOf('--json'); if (j > 0) fs.writeFileSync(process.argv[j + 1], JSON.stringify(R, null, 1));
