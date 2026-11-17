// [mondo_fix] LA SONDA DEI MEZZI SOVRAPPOSTI, senza browser (MONDO_FIX.md). Il committente, sull'APK: «una macchina e un furgone bianco
// uno dentro l'altro». Carica la logica come strumenti/sonda_vita.js, fa girare G.step a passi di 0,05 s e ogni 0,2 s conta le coppie
// di mezzi di terra (non nascosti, non barche) le cui casse (scatole orientate VK.len × VK.wid, SAT) si infilano più di 25 cm entro
// 150 m dal giocatore (quello che si vede). Ogni coppia è classificata per chi la fa:
//   corsa      due mezzi in moto guidati dal computer (traffico, autobus, vie minori, Guida.prendi): la distanza di sicurezza non ha visto l'altro
//   fermo      uno guidato contro uno fermo (in sosta, in panne, un relitto)
//   fermi      due fermi (la sosta, un posteggio dato due volte)
//   comparso   uno dei due è appena ricomparso (riappari, il salto oltre 85 m) o è nato da meno di 2 s
// e conta i campioni (coppia × 0,2 s), le coppie distinte, il caso peggiore e qualche esempio.
// Uso (da v7/): node strumenti/sonda_mezzi_sovrapposti.js [secondi per ora = 240] [seme = 1]   PV_SONDA_ORE=8.5,13,19 per le ore
'use strict';
const path = require('path'), fs = require('fs');
const SV = require('./sonda_vita.js');
const SRC = path.join(__dirname, '..', 'src') + '/';
const hyp = Math.hypot;
function sat(VK, a, b) {   // la penetrazione minima fra le due scatole (0: non si toccano)
  const KA = VK[a.kind], KB = VK[b.kind];
  const ax = [[Math.cos(a.ang), Math.sin(a.ang)], [-Math.sin(a.ang), Math.cos(a.ang)], [Math.cos(b.ang), Math.sin(b.ang)], [-Math.sin(b.ang), Math.cos(b.ang)]];
  const ext = (K, g, q) => K.len / 2 * Math.abs(Math.cos(g) * q[0] + Math.sin(g) * q[1]) + K.wid / 2 * Math.abs(-Math.sin(g) * q[0] + Math.cos(g) * q[1]);
  let best = 1e9; for (const q of ax) { const d = (b.x - a.x) * q[0] + (b.y - a.y) * q[1], ov = ext(KA, a.ang, q) + ext(KB, b.ang, q) - Math.abs(d); if (ov <= 0) return 0; best = Math.min(best, ov); }
  return best;
}
function unaOra(ora, secondi, seme) {
  const G = global.Game, st = G.create(seme), p = st.player, dt = .05, N = Math.round(secondi / dt), inp = { x: 0, y: 0 }, VK = G.VK;
  p.vehicle = null; p.indoor = null; p.path = []; st.t = Math.floor(st.t / 1440) * 1440 + ora * 60; st.deadline = 1e12;
  const o = { ora, secondi, campioni: 0, coppie: 0, distinte: 0, peggio: 0, per: { corsa: 0, fermo: 0, fermi: 0, comparso: 0 }, salti85: 0, es: [] };
  const seen = new Set(), nato = new Map(), tp = new Map(), last = new Map();
  // all'avvio, in tutta l'isola: i mezzi messi uno sull'altro (la sosta di game.js, gli stalli di vievive, le ronde, le barche no)
  G.step(st, dt, inp); o.avvio = [];
  { const V0 = st.vehicles.filter(v => !v.hidden && VK[v.kind] && !VK[v.kind].boat && !VK[v.kind].pocket);
    for (let a = 0; a < V0.length; a++) for (let b = a + 1; b < V0.length; b++) { const A = V0[a], B = V0[b]; if (Math.abs(A.x - B.x) > 7 || Math.abs(A.y - B.y) > 7) continue; const pen = sat(VK, A, B); if (pen >= .25) o.avvio.push(A.id + ':' + A.kind + '|' + B.id + ':' + B.kind + '@' + Math.round(A.x) + ',' + Math.round(A.y) + ' ' + pen.toFixed(2)); } }
  const guidato = v => v.rider !== 'player' && (v.traffic || v.guida || (v.gd && v.gd.preso) || (typeof v.rider === 'string' && v.rider.startsWith('npc:')));
  const moto = v => hyp(v.vx || 0, v.vy || 0) > .3 || Math.abs(v.speed || 0) > .3;
  for (let i = 0; i < N; i++) {
    G.step(st, dt, inp); if (st.over) st.over = null;
    if (i % 4) continue; o.campioni++;
    const V = st.vehicles.filter(v => !v.hidden && VK[v.kind] && !VK[v.kind].boat && !VK[v.kind].pocket && hyp(v.x - p.x, v.y - p.y) < 150);
    for (const v of V) { if (!nato.has(v.id)) nato.set(v.id, st.clock); const t0 = tp.get(v.id); if (t0 !== undefined && t0 !== (v.__tp || 0)) nato.set(v.id, st.clock); tp.set(v.id, v.__tp || 0);
      const q = last.get(v.id); if (q && hyp(v.x - q[0], v.y - q[1]) > 85) { o.salti85++; nato.set(v.id, st.clock); } last.set(v.id, [v.x, v.y]); }
    for (let a = 0; a < V.length; a++) for (let b = a + 1; b < V.length; b++) { const A = V[a], B = V[b];
      if (Math.abs(A.x - B.x) > 7 || Math.abs(A.y - B.y) > 7) continue;
      if (A.rider === 'player' || B.rider === 'player') continue;   // l'urto del giocatore è la fisica vera (collideVehicles)
      const pen = sat(VK, A, B); if (pen < .25) continue;
      const gA = guidato(A) && moto(A), gB = guidato(B) && moto(B), nuovo = st.clock - nato.get(A.id) < 2 || st.clock - nato.get(B.id) < 2;
      const k = nuovo ? 'comparso' : gA && gB ? 'corsa' : gA || gB ? 'fermo' : 'fermi';
      o.coppie++; o.per[k]++; o.peggio = Math.max(o.peggio, pen); const id = [A.id, B.id].sort().join('|');
      if (!seen.has(id)) { seen.add(id); if (o.es.length < 10) o.es.push({ k, a: A.id + ':' + A.kind + (A.traffic ? ':tr' : A.guida ? ':' + A.guida : ''), b: B.id + ':' + B.kind + (B.traffic ? ':tr' : B.guida ? ':' + B.guida : ''), pen: +pen.toFixed(2), x: Math.round(A.x), y: Math.round(A.y), t: +(st.t % 1440 / 60).toFixed(2) }); } }
  }
  o.distinte = seen.size; o.peggio = +o.peggio.toFixed(2); return o;
}
if (require.main === module) {
  const secondi = +process.argv[2] || 240, seme = +process.argv[3] || 1, una = process.argv.find(a => /^--ora=/.test(a));
  require(SRC + 'seme.js')(seme);
  if (una) { SV.carica(); const o = unaOra(+una.slice(6), secondi, seme); process.stdout.write('@@' + JSON.stringify(o) + '\n'); process.exit(0); }
  const cp = require('child_process'), ore = (process.env.PV_SONDA_ORE || '8.5,13,19').split(',').map(Number), tot = { campioni: 0, coppie: 0, distinte: 0, corsa: 0, fermo: 0, fermi: 0, comparso: 0, salti85: 0, peggio: 0 };
  for (const ora of ore) {
    const r = cp.spawnSync(process.execPath, [__filename, String(secondi), String(seme), '--ora=' + ora], { encoding: 'utf8', maxBuffer: 1 << 26 }), m = (r.stdout || '').match(/@@(.*)/);
    if (!m) { console.log(ora, 'h: la sonda non è finita', (r.stderr || '').split('\n').filter(Boolean).slice(-3).join(' | ').slice(0, 300)); continue; }
    const o = JSON.parse(m[1]); console.log(`${String(ora).padStart(5)} h: ${o.coppie} campioni di coppie sovrapposte (${o.distinte} coppie) su ${o.campioni} · corsa ${o.per.corsa} fermo ${o.per.fermo} fermi ${o.per.fermi} comparso ${o.per.comparso} · salti >85 m ${o.salti85} · peggio ${o.peggio} m`);
    console.log(`        all'avvio, in tutta l'isola: ${o.avvio.length} coppie sovrapposte ${o.avvio.slice(0, 8).join(' · ')}`); tot.avvio = (tot.avvio || 0) + o.avvio.length;
    o.es.forEach(e => console.log('        ', JSON.stringify(e)));
    tot.campioni += o.campioni; tot.coppie += o.coppie; tot.distinte += o.distinte; for (const k in o.per) tot[k] += o.per[k]; tot.salti85 += o.salti85; tot.peggio = Math.max(tot.peggio, o.peggio);
  }
  console.log(JSON.stringify(tot));
}
