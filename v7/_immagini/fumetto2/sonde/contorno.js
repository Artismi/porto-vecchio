// [fumetto2] il contorno del personaggio a 1:1: in piedi e in cammino (l'ultimo fotogramma a metà passo), A ed E, a 1920×1080.
//   Q='leggera&tassellivecchi&stile=E' node contorno.js <prefisso>     (leggera: la tela interna ~640 righe ingrandita; senza leggera: piena)
const { avvia, OUT } = require('./lib'); const { corsa } = require('./passo7'); const fs = require('fs'), path = require('path');
const Q = process.env.Q || 'leggera&tassellivecchi&stile=E', PRE = process.argv[2] || 'ct';
const L = JSON.parse(fs.readFileSync(path.join(OUT, 'luoghi.json'))); const pz = L.piazza;
(async () => {
  const H = await avvia({ vp: { width: 1920, height: 1080 }, query: Q });
  // cammina: da pz+10 verso ovest (verso est, da pz-10, il banco del mercato ferma il personaggio: spd 0, x ferma)
  const SOLO = (process.env.SOLO || 'fermo,cammina').split(',');
  for (const [nome, start, verso, segs] of [['fermo', [pz[0] - 10, pz[1]], [pz[0], pz[1]], [{ sec: 3, percorso: [[pz[0] + 10, pz[1]]], mag: .5 }, { sec: .6 }]], ['cammina', [pz[0] + 10, pz[1]], [pz[0] - 10, pz[1]], [{ sec: 3.2, percorso: [[pz[0] - 14, pz[1]]], mag: .5 }]]]) {
    if (!SOLO.includes(nome)) continue;
    const r = await corsa(H.pg, { ora: 13, start, verso, foto: 0, segs, varianti: ['A', 'E'], tempi: 1 });
    for (const [v, url, s] of r.var) { const f = path.join(OUT, 'f', `${PRE}_${nome}_${v}.png`); fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
      fs.writeFileSync(f.replace('.png', '.json'), JSON.stringify(s)); H.log(nome, v, s.omX, s.omY, s.omH, 'x', s.x, 'spd', s.spd); } }
  await H.close();
})();
