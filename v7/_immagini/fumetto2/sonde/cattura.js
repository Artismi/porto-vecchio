// [fumetto2] la cattura per il progetto: per ogni inquadratura il fotogramma finale (A, D2) e, con D1 (celle piatte nei materiali), il colore della
// scena prima del passo, la distanza (cm, R*256+G) e la categoria (B = alfa: categoria*6+faccia, /35). node cattura.js [posti|ore|tutto]
const { avvia, OUT } = require('./lib'); const { corsa } = require('./passo7'); const fs = require('fs'), path = require('path');
const VP = { width: +(process.env.W || 960), height: +(process.env.H || 540) }, Q = process.env.Q || 'leggera&tassellivecchi&stile=A', COSA = process.argv[2] || 'tutto';
const L = JSON.parse(fs.readFileSync(path.join(OUT, 'luoghi.json'))); const V = L.vic_pescatori.pts, LT = L.vic_lanternini.pts.slice().reverse(), pz = L.piazza, lm = L.lungomare;
const POSTI = {
  vicolo: { ora: 11, start: V[0], verso: V[3], foto: 0, segs: [{ sec: 5, percorso: V, mag: .5 }, { sec: .6 }] },
  sbocco: { ora: 16, start: LT[0], verso: LT[3], foto: 0, segs: [{ sec: 7.5, percorso: LT.concat([[pz[0], pz[1]], [pz[0] + 10, pz[1] - 6]]), mag: .5 }, { sec: .6 }] },
  lungomare: { ora: 11, start: [lm[0] - 15, lm[1]], verso: [lm[0], lm[1]], foto: 0, segs: [{ sec: 4.5, percorso: [[lm[0] + 25, lm[1]]], mag: 1 }, { sec: .6 }] },
  piazza: { ora: 13, start: [pz[0] - 10, pz[1]], verso: [pz[0], pz[1]], foto: 0, segs: [{ sec: 3, percorso: [[pz[0] + 10, pz[1]]], mag: .5 }, { sec: .6 }] },
  sera: { ora: 19.3, start: [pz[0] + 10, pz[1]], verso: [pz[0] - 10, pz[1]], foto: 0, segs: [{ sec: 3, percorso: [[pz[0] - 10, pz[1]]], mag: .5 }, { sec: .6 }] },
};
const ORE = [['mattino', 8.2], ['mezzogiorno', 12.5], ['pomeriggio', 16], ['oro', 18.6], ['crepuscolo', 19.9], ['notte', 22.5]];
const JOBS = [];
if (COSA !== 'ore') for (const k in POSTI) JOBS.push({ nome: `posto_${k}`, P: POSTI[k] });
if (COSA !== 'posti') for (const [k, h] of ORE) JOBS.push({ nome: `ora_${k}`, P: Object.assign({}, POSTI.sera, { ora: h }) });
(async () => {
  for (const d of ['f', 'g']) fs.mkdirSync(path.join(OUT, d), { recursive: true });
  let H = await avvia({ vp: VP, query: Q }); const log = H.log;
  for (const J of JOBS) { if (process.env.SALTA && fs.existsSync(path.join(OUT, 'g', `${J.nome}.json`))) continue; const t0 = Date.now();
    for (let k = 0; k < 2; k++) { try {
        const P = JSON.parse(JSON.stringify(J.P)); P.varianti = ['A', 'D2', 'D1']; P.grezzo = ['D1']; P.maschere = true; P.tempi = 1;
        const r = await corsa(H.pg, P);
        r.var.forEach(([v, url]) => fs.writeFileSync(path.join(OUT, 'f', `${J.nome}_${v}.png`), Buffer.from(url.split(',')[1], 'base64')));
        const g = r.grezzo && r.grezzo.D1; if (!g) throw new Error('niente grezzo');
        fs.writeFileSync(path.join(OUT, 'g', `${J.nome}_col.png`), Buffer.from(g.col.split(',')[1], 'base64'));
        fs.writeFileSync(path.join(OUT, 'g', `${J.nome}_dep.png`), Buffer.from(g.dep.split(',')[1], 'base64'));
        for (const k in (g.mask || {})) fs.writeFileSync(path.join(OUT, 'g', `${J.nome}_m_${k}.png`), Buffer.from(g.mask[k].split(',')[1], 'base64'));
        fs.writeFileSync(path.join(OUT, 'g', `${J.nome}.json`), JSON.stringify({ maschere: Object.keys(g.mask || {}), cam: g.cam, player: g.player, ora: g.ora, notte: g.notte, stato: r.var.map(x => [x[0], x[2]]) }));
        log(J.nome, ((Date.now() - t0) / 1000).toFixed(0) + 's'); break; }
      catch (e) { log('crash', J.nome, String(e.message).slice(0, 200)); try { await H.close(); } catch (x) { } H = await avvia({ vp: VP, query: Q }); } } }
  try { await H.close(); } catch (x) { }
  log('fine');
})();
