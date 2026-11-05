const H = require('./nodo8.js'), { corsa, W } = H;
const R = id => W.roads.find(r => r.id === id).pts.map(q => [q[0], q[1]]);
const GIU = [[1281, 342.4], [1286.6, 342.4], [1288.84, 342.6], [1288.84, 347.42], [1289, 349], [1292, 349.5]];
const TRATTI = [['scala del Mercato giù', GIU], ['scala del Mercato su', GIU.slice().reverse()], ['cavour_sotto (scalinata Stazione)', R('cavour_sotto')], ['vic_lanternini', R('vic_lanternini')], ['vic_arco', R('vic_arco')], ['vic_monache', R('vic_monache')], ['vic_storto', R('vic_storto')], ['vic_lungo (scalinata)', R('vic_lungo')], ['vic_forno (scalinata)', R('vic_forno')], ['carceri (dalla scala 17)', [[1271.6, 354.8], [1271.61, 357.75], [1269.37, 357.75], [1268.5, 359.3]].concat(R('carceri').slice(2))], ['mezzo', R('mezzo')], ['vic_mura', R('vic_mura')]];
function snag(L, vWant) { let ev = 0, run = 0, fr = 0; const dove = []; for (const q of L) { const want = q.inp.x || q.inp.y; if (want && q.dsp < vWant * .3) { run++; fr++; if (run === 5) { ev++; dove.push([+q.x.toFixed(1), +q.y.toFixed(1)]); } } else run = 0; } return { ev, fr, dove }; }
function prova(colla, fps, modi, out) {
  const tot = { ev: 0, t: 0, nonArriva: 0, lungo: 0 };
  for (const [nome, P0] of TRATTI) for (const modo of modi) {
    const P = P0; const run = modo.endsWith('corsa'), tasti = modo.startsWith('tasti');
    const L = corsa({ fps, colla, start: P[0], verso: P[Math.min(2, P.length - 1)], segs: [{ sec: 80, percorso: P, umano: true, tasti8: tasti, run, keys: run && tasti ? { shift: 1 } : undefined }] });
    const fine = P[P.length - 1], k = L.findIndex(q => q.i >= P.length - 3 && Math.hypot(q.x - fine[0], q.y - fine[1]) < 1.2), s = snag(k > 0 ? L.slice(0, k) : L, run ? 6.4 : 3.6);
    let lungo = 0; for (let i = 1; i < P.length; i++) lungo += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
    tot.ev += s.ev; if (k > 0) tot.t += k / fps; else tot.nonArriva++; tot.lungo += lungo;
    if (out) out.push({ colla, fps, tratto: nome, modo, s: k > 0 ? +(k / fps).toFixed(2) : null, m: +lungo.toFixed(1), intoppi: s.ev, fotIntoppo: s.fr, dove: s.dove, fine: k > 0 ? null : [+L[L.length - 1].x.toFixed(1), +L[L.length - 1].y.toFixed(1)] });
    if (process.env.V) console.log(`${colla} ${fps} ${nome} ${modo}: ${k > 0 ? (k / fps).toFixed(1) + ' s' : 'NON ARRIVA ' + L[L.length - 1].x.toFixed(1) + ',' + L[L.length - 1].y.toFixed(1)} / ${lungo.toFixed(0)} m, intoppi ${s.ev} ${JSON.stringify(s.dove)}`);
  }
  return tot;
}
module.exports = { prova, TRATTI };
if (require.main === module) { const colla = process.argv[2] || 'prima', fps = +(process.argv[3] || 30); process.env.V = 1;
  const tot = prova(colla, fps, ['levetta', 'tasti8', 'tasti8 corsa']); console.log(colla, fps, 'TOTALE', JSON.stringify(tot)); }
