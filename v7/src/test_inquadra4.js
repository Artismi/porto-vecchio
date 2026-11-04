// [camera4] le prove della gerarchia dell'inquadratura (src/visuale.js inquadra4): node src/test_inquadra4.js
// [camera7] queste regole ora valgono solo con ?nofixcamera7 (la camera di prima, a piedi); nel gioco di difetto la camera a piedi è la vista unica: la prova test_camera7.js
const V = require('./visuale.js');
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const K = V.INQUADRA4, YAW = 0;   // la camera sta verso +z dal personaggio
// una mappa finta: un muro alto `h` sulla fila z in [z0, z0 + 2), x in [x0, x1); una volta dove volta(x, z) dice
const mappa = (muri, volte) => ({ alto: (x, z) => { for (const m of muri) if (x >= m.x0 && x < m.x1 && z >= m.z0 && z < m.z0 + 2) return m.h; return -1e9; }, volta: (x, z) => !!(volte && volte(x, z)) });
function corri(M, sec, dt, upd) {
  const S = {}, cache = new Map(), tr = []; let t = 0;
  for (; t < sec; t += dt) { const q = Object.assign({ M, x: 0, z: 0, fy: 0, vx: 0, vz: 0, yaw: YAW, base: K.base, ok: true, mano: false, cache }, upd ? upd(t) : {}); V.inquadra4(S, q, dt, K); tr.push([t, S.p, S.z, S.liv]); }
  return { S, tr };
}
// 1. strada larga: la pendenza di sempre, nessun cambio
{ const r = corri(mappa([]), 6, 1 / 30); ok(r.S.cambi === 0 && Math.abs(r.S.p - K.base) < 1e-6, `strada libera: la pendenza resta ${K.base} (cambi ${r.S.cambi})`); }
// 2. un muro di 7 m a 5 m sul lato camera: sale quanto basta (gradino 1), una volta sola, e il busto si vede
{ const M = mappa([{ x0: -20, x1: 20, z0: 5, h: 7 }]), r = corri(M, 6, 1 / 30), need = Math.atan2(7 - 1.1, 5);
  ok(r.S.liv === 1 && r.S.pT >= need && r.S.pT <= K.max, `muro di 7 m a 5 m: più dall'alto (${r.S.pT.toFixed(2)} ≥ ${need.toFixed(2)}), gradino ${r.S.liv}`);
  ok(r.S.cambi === 1, `un cambio solo (${r.S.cambi})`); }
// 3. un muro di 30 m a 4 m (la corte): la pendenza più alta non basta, si avvicina (gradino 2)
{ const r = corri(mappa([{ x0: -20, x1: 20, z0: 4, h: 30 }]), 6, 1 / 30); ok(r.S.liv === 2 && Math.abs(r.S.pT - K.max) < 1e-6 && r.S.zT === K.zoom, `corte: pendenza ${K.max} e zoom ${K.zoom} (gradino ${r.S.liv})`); }
// 4. anticipare: camminando verso un vicolo stretto (il muro comincia a x = 6), la camera sale prima di arrivarci
{ const M = mappa([{ x0: 6, x1: 40, z0: 3, h: 9 }]), r = corri(M, 6, 1 / 30, t => ({ x: t * 1.6, vx: 1.6 }));
  const arriva = 6 / 1.6, su = r.tr.find(x => x[3] >= 1), alta = r.tr.find(x => x[1] > K.base + .1);
  ok(su && su[0] < arriva, `decide prima di arrivare al muro (${su ? su[0].toFixed(2) : '-'} s < ${arriva.toFixed(2)} s)`);
  ok(alta && alta[0] < arriva + .3, `ed è già in alto quando ci arriva (${alta ? alta[0].toFixed(2) : '-'} s)`); }
// 5. niente ping-pong: un muro a intermittenza (porte e sbocchi ogni 2 m) non la fa salire e scendere di continuo
{ const muri = []; for (let x = 0; x < 60; x += 4) muri.push({ x0: x, x1: x + 2, z0: 4, h: 8 });
  const r = corri(mappa(muri), 20, 1 / 30, t => ({ x: t * 1.6, vx: 1.6 }));
  ok(r.S.cambi <= 2, `muri a intermittenza per 20 s: al più 2 cambi (${r.S.cambi})`); }
// 6. scende con calma: uscendo dal vicolo la pendenza torna giù solo dopo K.scende s
{ const M = mappa([{ x0: -40, x1: 4, z0: 3, h: 9 }]), r = corri(M, 12, 1 / 30, t => ({ x: t * 1.6, vx: 1.6 }));
  const giu = r.tr.find(x => x[0] > 4 && x[3] === 0); ok(giu && giu[0] > 4 / 1.6 + K.scende, `uscendo scende dopo ${giu ? giu[0].toFixed(2) : '-'} s (non prima di ${(4 / 1.6 + K.scende).toFixed(2)})`); }
// 7. il giocatore vince: se tocca lo zoom l'automatica cede (torna alla pendenza di sempre) e riprende dopo K.mano s
{ const M = mappa([{ x0: -20, x1: 20, z0: 5, h: 7 }]), r = corri(M, 14, 1 / 30, t => ({ mano: t > 4 && t < 4.1 }));
  const a = r.tr.find(x => x[0] > 7.5), b = r.tr[r.tr.length - 1];
  ok(Math.abs(a[1] - K.base) < .03, `dopo il tocco cede (pendenza ${a[1].toFixed(2)})`); ok(b[1] > K.base + .1, `e riprende dopo ${K.mano} s (${b[1].toFixed(2)})`); }
// 8. sotto la volta resta come si è
{ const M = mappa([{ x0: -20, x1: 20, z0: 5, h: 7 }], (x, z) => x > 3), r = corri(M, 10, 1 / 30, t => ({ x: t < 4 ? 0 : 5 }));
  ok(r.S.liv === 1 && r.S.cambi === 1, `sotto la volta non cambia (gradino ${r.S.liv}, cambi ${r.S.cambi})`); }
// 9. uguale a ogni frequenza di fotogrammi
{ const M = mappa([{ x0: -20, x1: 20, z0: 5, h: 7 }]), at = (dt, T) => { const r = corri(M, T + 1e-6, dt); return r.S.p; };
  const a = at(1 / 60, 2), b = at(.25, 2); ok(Math.abs(a - b) < .03, `a 60 e a 4 fotogrammi al secondo la stessa pendenza dopo 2 s (${a.toFixed(3)} / ${b.toFixed(3)})`); }
console.log(fail ? `\n${fail} prove non passano` : '\ntutto a posto'); process.exit(fail ? 1 : 0);
