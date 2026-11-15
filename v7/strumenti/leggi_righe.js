// [fluido] le righe calde di una funzione in un .cpuprofile (positionTicks): node strumenti/leggi_righe.js <profilo> <regex sulla chiave nome file:riga>
const fs = require('fs');
const [, , file, rx] = process.argv, RX = new RegExp(rx);
const pr = JSON.parse(fs.readFileSync(file, 'utf8')), L = {}; let tot = 0;
for (const n of pr.nodes) { const cf = n.callFrame, k = `${cf.functionName || '(anon)'} ${(cf.url || '').split('/').pop()}:${cf.lineNumber + 1}`; if (!RX.test(k)) continue;
  for (const t of n.positionTicks || []) { L[t.line] = (L[t.line] || 0) + t.ticks; tot += t.ticks; } }
console.log('campioni', tot); console.log(Object.entries(L).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([l, t]) => `${(t / tot * 100).toFixed(1).padStart(5)}%  riga ${l}`).join('\n'));
