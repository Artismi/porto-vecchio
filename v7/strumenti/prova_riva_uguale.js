// [telefono] LA RIVA UGUALE AL BIT: W.inland, W.northY, W.southY di src/world_cittanuova.js contro la versione di git HEAD, su 500.000 punti
// (griglia a quarti di casella attorno alla costa più punti a caso): quanti risultati diversi (devono essere 0) e il rapporto dei tempi.
// Serve ogni volta che si tocca c2Dist, NorthY/SouthY o Inland0.   node strumenti/prova_riva_uguale.js  (dalla cartella v7)
const path = require('path'), fs = require('fs'), cp = require('child_process');
const v7 = path.resolve(__dirname, '..');
const old = cp.execSync('git show HEAD:v7/src/world_cittanuova.js', { cwd: v7, maxBuffer: 1 << 26 }).toString();
const tmp = path.join(v7, 'src', '_world_prima.js'); fs.writeFileSync(tmp, old);
const quiet = f => { const l = console.log, w = console.warn; console.log = () => {}; console.warn = () => {}; try { return f(); } finally { console.log = l; console.warn = w; } };
const A = quiet(() => require(tmp)), B = quiet(() => require(path.join(v7, 'src/world_cittanuova.js')));
// punti: una griglia fitta attorno alla costa (quelli che il gioco chiede davvero stanno sui vertici e a quarti di casella), più punti a caso
let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pts = [];
for (let i = 0; i < 400000; i++) pts.push([Math.floor(rnd() * 1300 * 4) / 4, Math.floor(rnd() * 500 * 4) / 4]);
for (let i = 0; i < 100000; i++) pts.push([rnd() * 1300, rnd() * 500]);
let diff = 0, n = 0;
const tA0 = process.hrtime.bigint(); const ra = pts.map(([x, y]) => A.inland(x, y)); const tA = Number(process.hrtime.bigint() - tA0) / 1e6;
const tB0 = process.hrtime.bigint(); const rb = pts.map(([x, y]) => B.inland(x, y)); const tB = Number(process.hrtime.bigint() - tB0) / 1e6;
for (let i = 0; i < pts.length; i++) { n++; if (!Object.is(ra[i], rb[i])) { diff++; if (diff < 5) console.log('diverso', pts[i], ra[i], rb[i]); } }
const nd = pts.slice(0, 50000).reduce((k, [x]) => k + (Object.is(A.northY(x), B.northY(x)) && Object.is(A.southY(x), B.southY(x)) ? 0 : 1), 0);
console.log(JSON.stringify({ punti: n, diversi: diff, rive_diverse: nd, ms_prima: Math.round(tA), ms_dopo: Math.round(tB), volte: +(tA / tB).toFixed(1) }));
fs.unlinkSync(tmp);
