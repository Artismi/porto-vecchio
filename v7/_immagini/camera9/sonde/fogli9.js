// [camera9] i provini dai registri di misura9.js: node fogli9.js [percorso ...] → ../filmstrip_<percorso>.jpg (sopra oggi, sotto camera9)
// e ../filmstrip_<percorso>_camera9.jpg (solo camera9, più grandi)
const fs = require('fs'), path = require('path'), { provino } = require('../../controlli8/sonde/lib.js'); const OUT = path.resolve(__dirname, '..');
const leggi = m => { try { return JSON.parse(fs.readFileSync(path.join(OUT, `misura_${m}.json`))); } catch (e) { return {}; } };
const A = leggi('oggi'), B = leggi('c9'), SOLO = process.argv.slice(2);
const lab = (m, s) => `${m} ${s.t.toFixed(1)}s vista ${s.vista}° braccio ${s.arm}m${s.lift > .5 ? ' salita ' + s.lift + '°' : ''}${s.side && Math.abs(s.side) > .2 ? ' spalla ' + s.side : ''} oriz ${(s.oriz * 100).toFixed(0)}%`;
for (const nome of Object.keys(B)) { if (SOLO.length && !SOLO.includes(nome)) continue;
  const a = (A[nome] || { fotos: [] }).fotos, b = B[nome].fotos, n = Math.min(6, Math.max(a.length, b.length)), passo = Math.max(a.length, b.length) / n;
  const pick = L => Array.from({ length: n }, (_, i) => L[Math.min(L.length - 1, Math.floor(i * passo))]).filter(Boolean);   // gli stessi istanti sopra e sotto
  const pa = pick(a), pb = pick(b); if (pa.length !== n || pb.length !== n) { console.log(nome, 'foto mancanti'); continue; }
  const F = pa.map(([f, s]) => [f, lab('OGGI', s)]).concat(pb.map(([f, s]) => [f, lab('CAMERA9', s)]));
  if (F.length) provino(F, path.join(OUT, `filmstrip_${nome}.jpg`), `[camera9] ${nome}: sopra la camera di oggi, sotto ?camera9 (a piedi coi tasti, il pilota umano, gli stessi istanti sopra e sotto)`, n, 400, 225);
  const G = b.map(([f, s]) => [f, lab('CAMERA9', s)]).filter((q, i) => i % Math.max(1, Math.ceil(b.length / 12)) === 0).slice(0, 12);
  if (G.length) provino(G, path.join(OUT, `filmstrip_${nome}_camera9.jpg`), `[camera9] ${nome} con ?camera9, in cammino`, 4, 480, 270);
  console.log(nome, F.length, G.length); }
