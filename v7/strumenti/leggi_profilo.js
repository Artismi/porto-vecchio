// [fluido] legge un .cpuprofile (node --cpu-prof o CDP): tempo proprio e incluso per funzione file:riga, le prime N righe.
//   node strumenti/leggi_profilo.js <profilo.cpuprofile> [N=30] [filtro=regex sul file]
const fs = require('fs');
const [, , file, N0, filtro] = process.argv, N = +(N0 || 30), F = filtro ? new RegExp(filtro) : null;
const pr = JSON.parse(fs.readFileSync(file, 'utf8')), byId = new Map(pr.nodes.map(n => [n.id, n])), self = new Map(), parent = new Map();
pr.nodes.forEach(n => (n.children || []).forEach(c => parent.set(c, n.id)));
// con LENTI=<file json di [inizio, fine] in µs>: solo i campioni dentro quelle finestre (i passi lenti)
const WIN = process.env.LENTI ? JSON.parse(fs.readFileSync(process.env.LENTI, 'utf8')) : null; let tc = pr.startTime, wi = 0;
pr.samples.forEach((id, k) => { tc += pr.timeDeltas[k] || 0; if (WIN) { while (wi < WIN.length && WIN[wi][1] < tc) wi++; if (wi >= WIN.length || WIN[wi][0] > tc) return; } self.set(id, (self.get(id) || 0) + (pr.timeDeltas[k] || 0)); });
const key = cf => `${cf.functionName || '(anon)'} ${(cf.url || '').split('/').pop()}:${cf.lineNumber + 1}`;
const S = {}, I = {}; let tot = 0;
self.forEach((us, id) => { tot += us; const cf = byId.get(id).callFrame; S[key(cf)] = (S[key(cf)] || 0) + us;
  const seen = new Set(); for (let q = id; q !== undefined; q = parent.get(q)) { const c = byId.get(q).callFrame; if (!c.url) continue; const k = key(c); if (seen.has(k)) continue; seen.add(k); I[k] = (I[k] || 0) + us; } });
const top = (M, n) => Object.entries(M).filter(([k]) => !F || F.test(k)).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${(v / tot * 100).toFixed(1).padStart(5)}%  ${(v / 1000).toFixed(0).padStart(7)} ms  ${k}`);
console.log('totale', (tot / 1000).toFixed(0), 'ms\n-- proprio'); console.log(top(S, N).join('\n')); console.log('-- incluso'); console.log(top(I, N * 2).join('\n'));
// con CHI=<regex sulla chiave>: chi chiama quelle funzioni (il tempo incluso di quelle sotto ogni chiamante diretto)
if (process.env.CHI) { const RX = new RegExp(process.env.CHI), C = {};
  self.forEach((us, id) => { for (let q = id; q !== undefined; q = parent.get(q)) { const k = key(byId.get(q).callFrame); if (RX.test(k)) { const pq = parent.get(q); const pk = pq !== undefined ? key(byId.get(pq).callFrame) : '(radice)'; C[k + '  <=  ' + pk] = (C[k + '  <=  ' + pk] || 0) + us; break; } } });
  console.log('-- chiamanti di', process.env.CHI); console.log(Object.entries(C).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => `${(v / tot * 100).toFixed(1).padStart(5)}%  ${(v / 1000).toFixed(0).padStart(7)} ms  ${k}`).join('\n')); }
// con SOTTO=<regex>: il tempo proprio delle funzioni sotto quelle (cosa costa dentro)
if (process.env.SOTTO) { const RX = new RegExp(process.env.SOTTO), C = {}; let t = 0;
  self.forEach((us, id) => { let dentro = false; for (let q = id; q !== undefined; q = parent.get(q)) if (RX.test(key(byId.get(q).callFrame))) { dentro = true; break; } if (!dentro) return; t += us; const k = key(byId.get(id).callFrame); C[k] = (C[k] || 0) + us; });
  const M = {}; for (const k in C) { const f = k.split(' ').pop().split(':')[0]; M[f] = (M[f] || 0) + C[k]; }
  console.log('-- sotto', process.env.SOTTO, 'per file'); console.log(Object.entries(M).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => `${(v / t * 100).toFixed(1).padStart(5)}%  ${(v / 1000).toFixed(0).padStart(7)} ms  ${k}`).join('\n'));
  console.log('-- sotto', process.env.SOTTO, (t / 1000).toFixed(0), 'ms'); console.log(Object.entries(C).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, v]) => `${(v / t * 100).toFixed(1).padStart(5)}%  ${(v / 1000).toFixed(0).padStart(7)} ms  ${k}`).join('\n')); }
