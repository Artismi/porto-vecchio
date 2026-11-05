// [controlli8] il riassunto prima/dopo: le misure in Node (../misure8.json) e nel gioco vero (../prova8_prima.json, ../prova8_dopo.json)
// → ../riassunto8.json e una tabella a schermo. node riassunto8.js
const path = require('path'), fs = require('fs'), D = path.resolve(__dirname, '..'), J = f => JSON.parse(fs.readFileSync(path.join(D, f)));
const M = J('misure8.json'), out = { node: {}, gioco: {} };
for (const c of ['prima', 'dopo']) { const m = M[c]; out.node[c] = { fps60: m.fps60, fps30: m.fps30, dopo4sDiD: m.dopo4sDiD, derivaSchermoWSADW: m.derivaSchermoWSADW, scala: m.scala,
  tratti: { tratti: m.tratti.length, nonArrivano: m.tratti.filter(t => t.s === null).length, intoppi: m.tratti.reduce((a, t) => a + t.intoppi, 0) } }; }
for (const c of ['prima', 'dopo']) { const R = J(`prova8_${c}.json`), g = { primaMossaFot30: R.primaMossa, passo90Fot30: R.passo90, dietrofrontFacciaS: R.dietrofrontFaccia, dietrofrontMarciaS: R.dietrofrontMarcia, ricentroGradi: R.ricentroGiro, wDiLatoGradi: R.wDiLato };
  for (const n of ['giu', 'su']) { const S = R['scala_' + n], L = S.log, t0 = L[0].t, dt = L[1].t - L[0].t, fin = L.filter(q => q.t - t0 <= (S.s || 9)), dopo1 = fin.filter(q => q.t - t0 > 1);
    g['scala_' + n] = { s: S.s, intoppi: S.intoppi, arrivato: S.s !== null, bracciominM: S.bracciomin, braccioSotto5mS: +(fin.filter(q => q.arm !== null && q.arm < 5).length * dt).toFixed(2), braccioSotto5mDopo1sS: +(dopo1.filter(q => q.arm !== null && q.arm < 5).length * dt).toFixed(2),
      saltoQuotaFotM: S.salitaFot, giroCameraMaxGradiS: S.giroCameraMax, personaggioSchermoX: S.schermoX.map(v => +v.toFixed(2)) }; }
  out.gioco[c] = g; }
fs.writeFileSync(path.join(D, 'riassunto8.json'), JSON.stringify(out, null, 1));
const r = (k, a, b) => console.log(k.padEnd(52), String(a).padEnd(18), b);
const P = out.node.prima, Q = out.node.dopo, A = out.gioco.prima, B = out.gioco.dopo;
r('', 'prima', 'dopo');
r('Node 60fps: prima mossa (fot) / 90% passo (fot)', P.fps60.primaMossaFot + ' / ' + P.fps60.passo90Fot, Q.fps60.primaMossaFot + ' / ' + Q.fps60.passo90Fot);
r('Node 30fps: prima mossa (fot) / 90% passo (fot)', P.fps30.primaMossaFot + ' / ' + P.fps30.passo90Fot, Q.fps30.primaMossaFot + ' / ' + Q.fps30.passo90Fot);
r('Gioco 30fps: prima mossa / 90% passo (fot)', A.primaMossaFot30 + ' / ' + A.passo90Fot30, B.primaMossaFot30 + ' / ' + B.passo90Fot30);
r('Node 60fps: 180° corpo visto / marcia invertita (s)', P.fps60.giro180VistaS.toFixed(2) + ' / ' + P.fps60.marciaInvertitaS.toFixed(2), Q.fps60.giro180VistaS.toFixed(2) + ' / ' + Q.fps60.marciaInvertitaS.toFixed(2));
r('Gioco 30fps: 180° corpo / marcia (s)', A.dietrofrontFacciaS.toFixed(2) + ' / ' + A.dietrofrontMarciaS.toFixed(2), B.dietrofrontFacciaS.toFixed(2) + ' / ' + B.dietrofrontMarciaS.toFixed(2));
r('Node: frenata di corsa (s, m)', P.fps60.frenataCorsaS.toFixed(2) + ' s ' + P.fps60.frenataCorsaM + ' m', Q.fps60.frenataCorsaS.toFixed(2) + ' s ' + Q.fps60.frenataCorsaM + ' m');
r('W dopo 4 s di D: gradi di lato sullo schermo (Node/gioco)', P.dopo4sDiD.wDiLatoGradi + ' / ' + A.wDiLatoGradi, Q.dopo4sDiD.wDiLatoGradi + ' / ' + B.wDiLatoGradi);
r('deriva del personaggio sullo schermo WSADW (%)', P.derivaSchermoWSADW, Q.derivaSchermoWSADW);
for (const n of ['giu', 'su']) { const a = A['scala_' + n], b = B['scala_' + n];
  r(`gioco: Scala del Mercato ${n} coi tasti (s, intoppi)`, (a.s === null ? 'non arriva' : a.s.toFixed(2) + ' s') + ', ' + a.intoppi, (b.s === null ? 'non arriva' : b.s.toFixed(2) + ' s') + ', ' + b.intoppi);
  r(`gioco: Scala ${n}: braccio <5 m (s, dopo il 1° s)`, a.braccioSotto5mDopo1sS, b.braccioSotto5mDopo1sS);
  r(`gioco: Scala ${n}: salto di quota in un fotogramma (m)`, a.saltoQuotaFotM, b.saltoQuotaFotM); }
r('Node: 36 tratti (12 vie x 3 modi): non arrivano / intoppi', P.tratti.nonArrivano + ' / ' + P.tratti.intoppi, Q.tratti.nonArrivano + ' / ' + Q.tratti.intoppi);
