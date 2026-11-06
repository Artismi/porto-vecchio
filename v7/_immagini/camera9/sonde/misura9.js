// [camera9] LA MISURA nel gioco vero (Chromium headless, SwiftShader, a passi): i percorsi a piedi coi tasti (il pilota umano di
// controlli8) per vicoli, piazza, sbocco, lungomare e cime delle scale, con la camera di oggi (camera7) e con camera9, nella STESSA
// pagina (Camera7.C9.on cambiato dal vivo). Scrive ../misura_<modo>.json (i registri), ../colpi_<modo>.json (cosa ferma il braccio) e le
// foto in TMP9. node misura9.js [oggi,c9] [percorsi,...] [query]
const path = require('path'), fs = require('fs');
const { avvia, provino } = require('../../controlli8/sonde/lib.js'), { corsa } = require('./passo9.js');
const MODI = (process.argv[2] || 'oggi,c9').split(','), SOLO = (process.argv[3] || '').split(',').filter(Boolean), OUT = path.resolve(__dirname, '..'), TMP = process.env.TMP9 || path.join(__dirname, 'tmp');
const GIU = [[1281, 342.4], [1286.6, 342.4], [1288.84, 342.6], [1288.84, 347.42], [1289, 349], [1292, 349.5]];
(async () => {
  fs.mkdirSync(TMP, { recursive: true });
  const { pg, log, close } = await avvia({ query: process.argv[4] || 'tassellivecchi', vp: { width: 640, height: 360 } });
  try {
    const RD = await pg.evaluate(() => { const W = window.__pv.G.MAP.world, o = {}; for (const r of W.roads) if (/^vic_|cavour/.test(r.id)) o[r.id] = { w: r.w, pts: r.pts.map(q => [+q[0].toFixed(2), +q[1].toFixed(2)]) }; return o; });
    fs.writeFileSync(path.join(__dirname, 'vicoli.json'), JSON.stringify(RD));
    const pz = [1383, 303], lm = [1421, 399], V = n => RD[n].pts, rev = a => a.slice().reverse();
    const PERC = {
      vicolo_pescatori: { percorso: V('vic_pescatori'), foto: 1.2 },
      vico_lungo: { percorso: V('vic_lungo') },
      sbocco_lanternini: { percorso: rev(V('vic_lanternini')).concat([[pz[0], pz[1]], [pz[0] + 10, pz[1] - 6]]) },
      piazza: { percorso: [[1393, 297], [1383, 303], [1372, 306]] },
      lungomare: { percorso: [[lm[0] - 20, lm[1]], [lm[0] + 25, lm[1]]] },
      scala_mercato_giu: { percorso: GIU },
      scala_mercato_su: { percorso: rev(GIU) },
      vicolo_gatti: { percorso: V('vic_gatti') },
      scala_forno: { percorso: V('vic_forno') },
    };
    // si riprende da dove la pagina è morta: i percorsi già nei registri non si rifanno
    const RESM = {}, COLPIM = {}; for (const m of MODI) { try { RESM[m] = JSON.parse(fs.readFileSync(path.join(OUT, `misura_${m}.json`))); COLPIM[m] = JSON.parse(fs.readFileSync(path.join(OUT, `colpi_${m}.json`))); } catch (e) { } }
    for (const nome of Object.keys(PERC)) for (const modo of MODI) {
      const RES = RESM[modo] = RESM[modo] || {}, COLPI = COLPIM[modo] = COLPIM[modo] || {};
      { if ((SOLO.length && !SOLO.includes(nome)) || RES[nome]) continue; const P = PERC[nome].percorso, t0 = Date.now();
        await pg.evaluate(() => { window.__pv.R.__cam7.spia = []; });
        const L = P.reduce((s, q, i) => i ? s + Math.hypot(q[0] - P[i - 1][0], q[1] - P[i - 1][1]) : 0, 0);
        const o = await corsa(pg, { c9: modo === 'c9', start: P[0], verso: P[Math.min(2, P.length - 1)], dt: 1 / 10, foto: PERC[nome].foto || 0, ogniSfondo: .6, segs: [{ sec: Math.min(30, L / 3.2 + 2), percorso: P }] });
        const spia = await pg.evaluate(() => { const s = window.__pv.R.__cam7.spia || [], c = {}; for (const h of s) { const k = `${h.tipo}|${h.nome}|${h.mt}|${h.mn}|r${h.r}|${h.su}`; c[k] = (c[k] || 0) + 1; } window.__pv.R.__cam7.spia = null; return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 12); });
        COLPI[nome] = spia;
        const files = o.fotos.map(([t, url, s]) => { const f = path.join(TMP, `${modo}_${nome}_${t.toFixed(1)}.jpg`); fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64')); return [f, s]; });
        RES[nome] = { arrivato: o.arrivato, log: o.log, fotos: files };
        fs.writeFileSync(path.join(OUT, `misura_${modo}.json`), JSON.stringify(RES)); fs.writeFileSync(path.join(OUT, `colpi_${modo}.json`), JSON.stringify(COLPI, null, 1));
        log(modo, nome, ((Date.now() - t0) / 1000).toFixed(0) + 's', o.log.length, 'fot', 'arrivato', o.arrivato);
      }
      fs.writeFileSync(path.join(OUT, `misura_${modo}.json`), JSON.stringify(RES));
      fs.writeFileSync(path.join(OUT, `colpi_${modo}.json`), JSON.stringify(COLPI, null, 1));
    }
  } catch (e) { log('ERRORE', e.message, e.stack); }
  await close();
})();
