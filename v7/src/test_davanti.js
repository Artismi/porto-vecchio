// [davanti] le prove della camera davanti alla casa (src/camera7.js KD, davantiMeta, davanti): node src/test_davanti.js
// La meta (coperto solo quello che la camera vede; quanto avanti: fino a KD.margine m davanti alla casa, dal lato del personaggio; mai
// sotto KD.minimo m dal busto), l'entrata (dopo KD.entra s, svelta), la banda e la tenuta (niente avanti e indietro), l'uscita (dopo
// KD.tieni s, liscia, senza salti), il salto (snap), il flag (?davanti / ?nodavanti, spento di difetto).
const C = require('./camera7.js'), KD = C.KD;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
// 0. il flag: in Node (niente location) spento
ok(C.CD && C.CD.on === false && typeof C.davanti === 'function', 'senza ?davanti la camera davanti alla casa è spenta (Camera7.CD.on false)');
// 1. la meta: tre raggi da 10 m, una casa fra 3 e 6 m dalla camera (la faccia dal lato del personaggio a 4 m dal corpo)
const casa = { L: 10, cam: 3, pg: 4 }, libero = { L: 10, cam: null, pg: null };
{ const m = C.davantiMeta([casa, casa, casa]);
  ok(m.n === 3 && Math.abs(m.f - (10 - (4 - KD.margine))) < 1e-9, `tre raggi coperti: la camera ${m.f.toFixed(2)} m avanti, a ${(10 - m.f).toFixed(2)} m dal corpo (${KD.margine} m davanti alla casa)`);
  const u = C.davantiMeta([casa, libero, libero]); ok(u.n === 1 && u.f === 0, 'un raggio solo coperto (una ringhiera davanti ai piedi): la camera non si muove, c\'è la sagoma');
  const d = C.davantiMeta([libero, casa, casa]); ok(d.n === 2 && d.f > 6, `busto e testa coperti: avanti ${d.f.toFixed(2)} m`);
  const f1 = C.davantiMeta([{ L: 10, cam: 3, pg: null }, { L: 10, cam: 3.2, pg: null }, libero]);
  ok(Math.abs(f1.f - (10 - (10 - 3.2 - KD.margine))) < 1e-9, `la facciata a una faccia sola (nessun colpo dal corpo): davanti alla faccia vista dalla camera (${(10 - f1.f).toFixed(2)} m dal corpo)`);
  const r = C.davantiMeta([{ L: 10, cam: null, pg: 2 }, { L: 10, cam: null, pg: 2 }, { L: 10, cam: null, pg: 2 }]);
  ok(r.n === 0 && r.f === 0, 'una faccia che guarda solo il personaggio (la camera non la vede): non copre'); }
// la corsa: S, una meta che cambia nel tempo, a passi di dt
const corri = (sec, meta, dt, S, L) => { S = S || C.creaDavanti(); const tr = []; for (let t = 0; t < sec - 1e-9; t += dt) tr.push([t, C.davanti(S, meta(t), L || 10, dt, false)]); return { S, tr, f: tr[tr.length - 1][1] }; };
const FT = 10 - (4 - KD.margine);
// 2. l'entrata: dopo KD.entra s di copertura, svelta e liscia (la molla: al 95% in KD.dentro s); una colonna che passa (0,06 s) non la muove
{ const { tr } = corri(1, () => FT, 1 / 60), t0 = (tr.find(q => q[1] > .01) || [9])[0], t95 = (tr.find(q => q[1] > FT * .95) || [9])[0];
  ok(t0 >= KD.entra - 1e-9 && t0 < KD.entra + .03, `entra dopo ${t0.toFixed(2)} s di copertura`);
  ok(t95 - t0 < KD.dentro + .04, `arriva al 95% in ${(t95 - t0).toFixed(2)} s`);
  const c = corri(1, t => (t < .06 ? FT : 0), 1 / 60); ok(c.tr.every(q => q[1] === 0), 'una colonna che copre per 0,06 s: la camera non si muove');
  let salto = 0; for (let i = 1; i < tr.length; i++) salto = Math.max(salto, tr[i][1] - tr[i - 1][1]); ok(salto < .8, `il passo più lungo in un fotogramma da 1/60 s: ${salto.toFixed(2)} m (niente scatti)`); }
// 3. la banda e la tenuta: la meta che trema di ±0,2 m e una scopertura di 0,2 s non la fanno andare avanti e indietro
{ const S = C.creaDavanti(); corri(1, () => FT, 1 / 30, S);
  const a = corri(2, t => FT - .2 * Math.abs(Math.sin(t * 9)), 1 / 30, S); ok(a.tr.every(q => q[1] >= FT - .2 - 1e-6 && q[1] <= FT + 1e-6) && Math.abs(a.f - FT) < .21, `la meta che trema di 0,2 m: resta fra ${(FT - .2).toFixed(2)} e ${FT.toFixed(2)} m`);
  const b = corri(.6, t => (t < .2 ? 0 : FT), 1 / 30, S); ok(b.tr.every(q => q[1] > FT - .26), `libera per 0,2 s (meno di ${KD.tieni} s): resta avanti`); }
// 4. l'uscita: dopo KD.tieni s libera torna indietro liscia, senza salti, e arriva fino in fondo
{ const S = C.creaDavanti(); corri(1, () => FT, 1 / 30, S); const { tr, f } = corri(3, () => 0, 1 / 30, S);
  const t0 = (tr.find(q => q[1] < FT - 1e-3) || [9])[0]; let v = 0; for (let i = 1; i < tr.length; i++) v = Math.max(v, Math.abs(tr[i][1] - tr[i - 1][1]) * 30);
  ok(t0 >= KD.tieni - 1 / 30 - 1e-9 && t0 < KD.tieni + .05, `libera: parte dopo ${t0.toFixed(2)} s`);
  ok(f < .02, `torna fino in fondo (${f.toFixed(3)} m dopo 3 s)`);
  ok(v < FT * 4.74 / KD.fuori / Math.E * 1.05, `liscia: al più ${v.toFixed(1)} m/s (la molla di ${KD.fuori} s)`); }
// 5. mai più vicina di KD.minimo m al busto (lì resta la sagoma); il salto (teletrasporto, avvio) arriva subito
{ const { f } = corri(2, () => 50, 1 / 30, null, 4); ok(Math.abs(f - (4 - KD.minimo)) < .01, `la casa addosso al personaggio: la camera si ferma a ${KD.minimo} m dal busto`);
  const S = C.creaDavanti(); ok(Math.abs(C.davanti(S, FT, 10, 1 / 30, true) - FT) < 1e-9, 'il salto: subito al posto giusto'); }
// 6. il braccio di sotto si accorcia da solo (il muro lo ferma): la spinta si riduce di altrettanto, la camera resta dov'era (non si somma)
{ const S = C.creaDavanti(); corri(1, () => FT, 1 / 30, S); const d0 = 10 - S.f.x, f = C.davanti(S, 0, 6.5, 1 / 30, false);
  ok(Math.abs((6.5 - f) - d0) < .05 || f === 0, `il braccio da 10 a 6,5 m: la camera resta a ${(6.5 - f).toFixed(2)} m dal busto (era ${d0.toFixed(2)})`);
  const g = C.davanti(S, 0, 2, 1 / 30, false); ok(g === 0, 'il braccio sotto la camera di adesso: la spinta va a zero (ci pensa il braccio)'); }
console.log(fail ? `\n${fail} NO` : '\ntutto ok'); process.exit(fail ? 1 : 0);
