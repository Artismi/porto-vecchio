// [inquadratura] IL COSTO PER FOTOGRAMMA della camera nuova contro ?vecchiacamera, lungo i percorsi (la stessa simulazione di
// strumenti/inquadratura.js): quante prove di raggio contro scatola (Visuale.entra) e quanti passi di misura in pianta (mappa.alto) a
// fotogramma, il tempo in Node, e le mesh in più disegnate (per ogni casa tagliata: la cornice e il pavimento; il tetto sbiadito: la copertina).
//   node strumenti/costo_inquadratura.js        (dalla cartella v7)
const path = require('path');
const log = console.log; console.log = () => {};
const IM = require(path.join(__dirname, 'inquadratura.js'));
console.log = log;
const V = require(path.join(__dirname, '..', 'src', 'visuale.js')), IQ = require(path.join(__dirname, '..', 'src', 'inquadratura.js'));
let nEntra = 0, nAlto = 0; const entra0 = V.entra; V.entra = (o, d, b) => { nEntra++; return entra0(o, d, b); };
const M0 = V.mappa(World), alto0 = M0.alto; M0.alto = (x, z) => { nAlto++; return alto0(x, z); };
const C = []; IM.PERC.forEach(p => C.push(...IM.campiona(p.pts)));
// in gioco la scelta del taglio mirato si rifà ogni 3 fotogrammi (render.js vis3Tick); la camera e i tetti a ogni fotogramma
for (const tel of [false, true]) for (const v of ['oggi', IQ.DIFETTO]) {
  nEntra = nAlto = 0; const t0 = process.hrtime.bigint(); let tagli = 0, sbiaditi = 0, n = 0;
  IM.PERC.forEach(p => { const cc = IM.campiona(p.pts); if (cc.length < 3) return; const R = IM.simula(v, cc, tel, M0); n += R.length;
    R.forEach(r => { const K = IQ.VARIANTI[v]; r.tagli.forEach(([, y]) => { if (K.taglio) tagli++; else sbiaditi++; }); }); });
  const ms = Number(process.hrtime.bigint() - t0) / 1e6, quadro = n * 1;   // (simula fa anche il quadro a raggi della misura: si toglie sotto)
  console.log(`${(tel ? 'telefono' : 'computer').padEnd(9)} ${v.padEnd(12)} campioni ${n}  entra/fotogramma ${(nEntra / n).toFixed(0).padStart(5)}  passi in pianta/fotogramma ${(nAlto / n).toFixed(0).padStart(5)}  case giù in media ${((tagli + sbiaditi) / n).toFixed(2)} (tagliate ${(tagli / n).toFixed(2)}, tetti via ${(sbiaditi / n).toFixed(2)})`);
}
// il tempo della sola logica (senza il quadro della misura): un fotogramma della camera e uno della scelta del taglio
{ const S = {}, R = IQ.rete(World), K = IQ.VARIANTI[IQ.DIFETTO], BOX = IM.CASA.filter(c => !c.b.pezzo).map(c => ({ box3: { min: { x: c.x0, y: c.base, z: c.z0 }, max: { x: c.x1, y: c.gr + 2.5, z: c.z1 } }, geo: { y0: c.base }, gr: c.gr }));
  const pick = C.filter((s, i) => i % 4 === 0); let tc = 0n, tt = 0n, e0;
  pick.forEach(s => { const fy = IM.pieno(s.x, s.z).h; let a = process.hrtime.bigint(); IQ.camera(S, { x: s.x, z: s.z, fy, dir: s.dir, vel: 1.4, yaw0: Math.PI / 4, base: .78, rete: R, mappa: M0, V, v: K, ok: true }, .016); tc += process.hrtime.bigint() - a;
    const cam = { x: s.x + 30, y: fy + 42, z: s.z + 30 }; e0 = nEntra; a = process.hrtime.bigint(); IQ.tagli(s.x, s.z, fy, cam, BOX, V, true, null, true); tt += process.hrtime.bigint() - a; });
  console.log(`\nlogica in Node, a fotogramma: la camera (misura + asse) ${(Number(tc) / 1e6 / pick.length).toFixed(3)} ms; la scelta del taglio su tutte le ${BOX.length} case ${(Number(tt) / 1e6 / pick.length).toFixed(3)} ms (in gioco una volta ogni 3 fotogrammi)`); }
