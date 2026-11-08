// [stile] le cinque inquadrature fisse con la camera7 (vicolo, sbocco, lungomare, piazza, sera), lo stesso istante in A, B, C.
// node scatti.js <query> <varianti A,B,C> <prefisso> [posti]
const { avvia, OUT } = require('./lib'); const { corsa } = require('./passo7'); const fs = require('fs'), path = require('path');
const Q = process.argv[2] || 'leggera&tassellivecchi', VAR = (process.argv[3] || '').split(',').filter(Boolean), PRE = process.argv[4] || 'base', SOLO = (process.argv[5] || '').split(',').filter(Boolean);
const VP = { width: +(process.env.W || 960), height: +(process.env.H || 540) };
(async () => {
  fs.mkdirSync(path.join(OUT, 'f'), { recursive: true });
  let H = await avvia({ vp: VP, query: Q }); const log = H.log;
  const L = JSON.parse(fs.readFileSync(path.join(OUT, 'luoghi.json'))); const V = L.vic_pescatori.pts, LT = L.vic_lanternini.pts.slice().reverse(), pz = L.piazza, lm = L.lungomare;
  const posti = {
    vicolo: { ora: 11, start: V[0], verso: V[3], foto: 0, segs: [{ sec: 5, percorso: V, mag: .5 }, { sec: .6 }] },
    sbocco: { ora: 16, start: LT[0], verso: LT[3], foto: 0, segs: [{ sec: 7.5, percorso: LT.concat([[pz[0], pz[1]], [pz[0] + 10, pz[1] - 6]]), mag: .5 }, { sec: .6 }] },
    lungomare: { ora: 11, start: [lm[0] - 15, lm[1]], verso: [lm[0], lm[1]], foto: 0, segs: [{ sec: 4.5, percorso: [[lm[0] + 25, lm[1]]], mag: 1 }, { sec: .6 }] },
    piazza: { ora: 13, start: [pz[0] - 10, pz[1]], verso: [pz[0], pz[1]], foto: 0, segs: [{ sec: 3, percorso: [[pz[0] + 10, pz[1]]], mag: .5 }, { sec: .6 }] },
    sera: { ora: 19.3, start: [pz[0] + 10, pz[1]], verso: [pz[0] - 10, pz[1]], foto: 0, segs: [{ sec: 3, percorso: [[pz[0] - 10, pz[1]]], mag: .5 }, { sec: .6 }] },
  };
  for (const posto of Object.keys(posti)) { if (SOLO.length && !SOLO.includes(posto)) continue; const t0 = Date.now();
    for (let k = 0; k < 2; k++) { try { const P = JSON.parse(JSON.stringify(posti[posto])); P.varianti = VAR.length ? VAR : [null]; P.tremolio = !!process.env.TREMOLIO; P.tempi = +(process.env.TEMPI || 2);
        const r = await corsa(H.pg, P);
        r.var.forEach(([v, url, s, url2]) => { fs.writeFileSync(path.join(OUT, 'f', `${PRE}_${posto}_${v || 'X'}.png`), Buffer.from(url.split(',')[1], 'base64')); if (url2) fs.writeFileSync(path.join(OUT, 'f', `${PRE}_${posto}_${v || 'X'}_mezzopx.png`), Buffer.from(url2.split(',')[1], 'base64')); });
        fs.writeFileSync(path.join(OUT, `log_${PRE}_${posto}.json`), JSON.stringify({ stato: r.var.map(x => [x[0], x[2]]) }));
        log(posto, ((Date.now() - t0) / 1000).toFixed(0) + 's', JSON.stringify(r.var[0][2]), 'ms', JSON.stringify(r.var.map(x => [x[0], x[2].ms, x[2].pitch, x[2].omH]))); break; }
      catch (e) { log('crash', posto, String(e.message).slice(0, 160)); try { await H.close(); } catch (x) { } H = await avvia({ vp: VP, query: Q }); } } }
  if (process.env.PERF) try { const P = await H.pg.evaluate(() => { const R = window.__pv.R, rd = R.__models.renderer; return { prog: rd.info.programs.length, calls: rd.info.render.calls, tri: rd.info.render.triangles, tex: rd.info.memory.textures, size: [rd.domElement.width, rd.domElement.height] }; }); log('perf', JSON.stringify(P)); } catch (e) { }
  try { await H.close(); } catch (x) { }
})();
