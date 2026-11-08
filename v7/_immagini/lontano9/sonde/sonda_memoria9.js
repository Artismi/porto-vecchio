// [lontano9] LA MEMORIA allo sbocco dei Lanternini: una pagina per modo (la memoria della scheda video non torna indietro: ogni modo la sua
// pagina). Dal Caruggio dei Pescatori allo sbocco sulla piazza, girando la camera sulla piazza (quattro direzioni), coi disegni accesi:
// dopo ogni posa la memoria del processo della scheda video (SwiftShader: la memoria della scheda sta lì), della pagina, l'heap JS, le
// geometrie, le tessiture e i programmi di three.
//   node sonda_memoria9.js <query> <etichetta> [uscita.json]
const path = require('path'), fs = require('fs');
const { avvia } = require('../../controlli8/sonde/lib.js'), { posa } = require('../../camera9/sonde/passo9.js');
const Q = process.argv[2] || 'leggera&tassellivecchi&camera9', ET = process.argv[3] || Q, OUTF = process.argv[4] || path.resolve(__dirname, '../memoria9.json');
function rss() { const { execFileSync } = require('child_process'); const L = execFileSync('ps', ['-eo', 'pid=,ppid=,rss=,args=']).toString().trim().split('\n').map(l => { const m = l.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/); return m && { pid: +m[1], ppid: +m[2], rss: +m[3], a: m[4] }; }).filter(Boolean);
  const mine = new Set([process.pid]); let ch = true; while (ch) { ch = false; for (const q of L) if (!mine.has(q.pid) && mine.has(q.ppid)) { mine.add(q.pid); ch = true; } }
  let gpu = 0, pag = 0; for (const q of L) if (mine.has(q.pid)) { if (/--type=gpu-process/.test(q.a)) gpu += q.rss; else if (/--type=renderer/.test(q.a)) pag += q.rss; } return { gpuMB: Math.round(gpu / 1024), paginaMB: Math.round(pag / 1024) }; }
(async () => {
  const { pg, log, close } = await avvia({ query: Q, vp: { width: 800, height: 450 } });
  const out = { query: Q, passi: [] };
  const misura = async nome => { const m = await pg.evaluate(() => { const rd = window.__pv.R.__models.renderer, im = rd.info.memory; return { heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0, geometrie: im.geometries, tessiture: im.textures, programmi: rd.info.programs ? rd.info.programs.length : 0, disegni: rd.info.render.calls }; });
    const r = Object.assign({ nome }, m, rss()); out.passi.push(r); log(JSON.stringify(r)); };
  try {
    await misura('partenza');
    const c9 = /camera9/.test(Q);
    const TAPPE = [['vicolo', [1343.49, 320.61], [1342.67, 324.79]], ['vicolo giù', [1345, 306], [1345.5, 300]], ['sbocco', [1372.1, 296.5], [1373, 310.6]], ['sbocco → est', [1372.1, 296.5], [1395, 300]], ['sbocco → nord', [1372.1, 296.5], [1372, 280]], ['sbocco → ovest', [1372.1, 296.5], [1350, 297]], ['piazza', [1375, 304], [1393, 302]], ['piazza → sud', [1383, 303], [1383, 330]]];
    for (const [nome, at, verso] of TAPPE) { await posa(pg, { at, verso, c9, assesta: 2, foto: true }); await misura(nome); }
  } catch (e) { log('ERRORE', e.message); out.errore = e.message; }
  let all = {}; try { all = JSON.parse(fs.readFileSync(OUTF)); } catch (e) { } all[ET] = out; fs.writeFileSync(OUTF, JSON.stringify(all, null, 1));
  log('FINE'); await close();
})();
