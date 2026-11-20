// [cinema] LA SONDA DEGLI INCASTRI (v7/DA_FUORI.md §5). Il committente: «evitare che il personaggio si incastri nelle cose: se spingi contro
// un muro, a meno che tu non sia completamente dritto, piano drifti a destra o a sinistra», «la tendenza a scorrere attorno agli ostacoli»,
// «se prendo una scala, finisco sopra o sotto: è difficile finire in mezzo e incastrarsi nel corrimano».
// Senza browser: carica la logica (come sonda_vita.js), sceglie N punti percorribili a meno di 1,2 m da un ostacolo (caselle piene, barriere:
// ringhiere, corrimano, parapetti; e i piedi delle scale), e da ognuno spinge la levetta in 16 direzioni per 1,5 s di gioco (a passi di 0,05 s,
// la levetta a 3/4: ~4,6 m/s). Conta:
//   fermo      le spinte che fanno meno di 0,35 m (incastrato: la levetta tenuta e il personaggio fermo)
//   strisciano le spinte fra 0,35 e 1,2 m (scivola, ma poco)
//   «di sbieco» le spinte che finiscono ferme anche se la direzione non è dritta contro l'ostacolo: le direzioni a ±22,5° vanno lontano
//              (più di 1,5 m) — quelle che il committente vuole vedere scivolare
//   scale      i punti sulle scale: quante spinte finiscono a metà della rampa contro il corrimano (ferme sopra una casella di scala)
// Uso (da v7/): node strumenti/sonda_incastri.js [punti = 400] [seme = 7]   (NOCINEMA=1: senza la regia nuova, per il prima/dopo)
'use strict';
const SV = require('./sonda_vita.js'); SV.carica();
if (!process.env.NOCINEMA) global.Cinema = require('../src/cinema.js');
const G = global.Game, W = global.World, TS = W.TS, GW = W.GW, GH = W.GH;
const N = +(process.argv[2] || 400), SEME = +(process.argv[3] || 7);
const st = G.create(1), p = st.player;
st.npcs.length = 0;   // le persone fuori: si misura la casa, non la folla
const V0 = st.vehicles.slice(); st.vehicles.length = 0;
let a = SEME >>> 0 || 1; const rnd = () => { a ^= a << 13; a >>>= 0; a ^= a >>> 17; a ^= a << 5; a >>>= 0; return a / 4294967296; };
// i punti: percorribili, con qualcosa che chiude entro 1,2 m (un raggio di 8 direzioni)
const punti = []; let prove = 0;
while (punti.length < N && prove < N * 400) { prove++;
  const x = 1100 + rnd() * 500, y = 220 + rnd() * 260;   // il borgo, le mura, il porto, la collina: dove ci sono vicoli, scale e ringhiere
  if (!G.walkM(x, y) || (G.seaM && G.seaM(x, y))) continue;
  let vicino = false; for (let k = 0; k < 8 && !vicino; k++) { const an = k * Math.PI / 4; for (const d of [.5, .8, 1.2]) if (!G.walkM(x + Math.cos(an) * d, y + Math.sin(an) * d) || (G.taglia && G.taglia(x, y, x + Math.cos(an) * d, y + Math.sin(an) * d))) { vicino = true; break; } }
  if (!vicino) continue;
  // il punto deve stare dove il personaggio può stare: lo si posa e si fa un passo fermo
  p.x = x; p.y = y; p.vx = p.vy = 0; p.vehicle = null; p.indoor = null; p.lv = null; p.path = []; G.step(st, .05, { x: 0, y: 0 });
  if (Math.hypot(p.x - x, p.y - y) > .05) continue;
  punti.push([x, y]); }
// le scale (W.passaggi con salita): punti sulla rampa, fra il piede (x0) e la cima (x1), dentro la larghezza (z0..z1)
const SCALE = (W.passaggi || []).filter(q => q.salita && isFinite(q.x0) && isFinite(q.x1));
const sulla = (s, x, y) => { const c = Math.cos(s.rot), sn = Math.sin(s.rot), dx = x - s.x, dy = y - s.y, lx = dx * c - dy * sn, lz = dx * sn + dy * c; return { lx, lz, dentro: lx > s.x0 + .4 && lx < s.x1 - .4 && lz >= s.z0 - .3 && lz <= s.z1 + .3 }; };
const puntiScala = [];
for (const s of SCALE) { const c = Math.cos(s.rot), sn = Math.sin(s.rot), pw = (lx, lz) => [s.x + lx * c + lz * sn, s.y - lx * sn + lz * c];
  for (const f of [.35, .65]) for (const g of [.15, .5, .85]) { const [x, y] = pw(s.x0 + (s.x1 - s.x0) * f, s.z0 + (s.z1 - s.z0) * g); if (G.walkM(x, y)) puntiScala.push([x, y, s]); } }
const DIR = 16, T = 1.5, dt = .05, R = { n: 0, fermo: 0, striscia: 0, sbieco: 0, scaleN: 0, scaleMezzo: 0, peggiori: [] };
for (const [x0, y0] of punti) {
  const dis = [];
  for (let k = 0; k < DIR; k++) { const an = k * 2 * Math.PI / DIR, ux = Math.cos(an), uy = Math.sin(an);
    p.x = x0; p.y = y0; p.vx = p.vy = 0; p.vehicle = null; p.indoor = null; p.lv = null; p.path = []; p.stun = 0; p.airT = -9; p.kbx = p.kby = 0; st.hitstop = 0; st.slowmo = 0;
    for (let i = 0; i < T / dt; i++) { G.step(st, dt, { x: ux, y: uy, mag: .75 }); if (st.over) st.over = null; }
    dis.push({ d: Math.hypot(p.x - x0, p.y - y0), fx: p.x, fy: p.y }); }
  for (let k = 0; k < DIR; k++) { const d = dis[k].d; R.n++;
    if (d < .35) { R.fermo++; const l = dis[(k + DIR - 1) % DIR].d, r = dis[(k + 1) % DIR].d; if (l > 1.5 || r > 1.5) R.sbieco++; R.peggiori.push([+x0.toFixed(1), +y0.toFixed(1), k * 360 / DIR, +d.toFixed(2)]); }
    else if (d < 1.2) R.striscia++;
  } }
// le scale: dalla rampa si spinge in 16 direzioni; «a metà» se dopo 1,5 s si è ancora sulla rampa e fermi (né sopra né sotto)
for (const [x0, y0, sc] of puntiScala) for (let k = 0; k < DIR; k++) { const an = k * 2 * Math.PI / DIR, ux = Math.cos(an), uy = Math.sin(an);
  p.x = x0; p.y = y0; p.vx = p.vy = 0; p.vehicle = null; p.indoor = null; p.lv = null; p.path = []; p.stun = 0; p.kbx = p.kby = 0; st.hitstop = 0;
  for (let i = 0; i < T / dt; i++) { G.step(st, dt, { x: ux, y: uy, mag: .75 }); if (st.over) st.over = null; }
  const d = Math.hypot(p.x - x0, p.y - y0), q = sulla(sc, p.x, p.y); R.scaleN++; if (q.dentro && d < .6) { R.scaleMezzo++; R.peggiori.push(['scala', +x0.toFixed(1), +y0.toFixed(1), k * 360 / DIR, +d.toFixed(2)]); } }
const pc = (a, b) => (b ? (100 * a / b).toFixed(1) : '0') + '%';
console.log(`incastri ${process.env.NOCINEMA ? '(prima, NOCINEMA)' : '(cinema)'}: ${punti.length} punti vicino agli ostacoli, ${R.n} spinte da 1,5 s`);
console.log(`  ferme (< 0,35 m)                 ${R.fermo}  ${pc(R.fermo, R.n)}`);
console.log(`  di sbieco ma ferme               ${R.sbieco}  ${pc(R.sbieco, R.n)}   (la direzione accanto, a 22,5°, va oltre 1,5 m)`);
console.log(`  strisciano (0,35-1,2 m)          ${R.striscia}  ${pc(R.striscia, R.n)}`);
console.log(`  scale: ${SCALE.length} rampe, ${puntiScala.length} punti, ${R.scaleN} spinte; ferme a metà rampa (< 0,6 m) ${R.scaleMezzo}  ${pc(R.scaleMezzo, R.scaleN)}`);
if (process.argv.includes('--peggiori')) console.log(JSON.stringify(R.peggiori.slice(0, 400)));
module.exports = R;
