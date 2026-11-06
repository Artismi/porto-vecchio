// [fumetto2] la sonda dal vivo: una pagina sola, comandi via HTTP (per provare le manopole di E senza ricaricare).
// node repl.js <query>   poi un file in cmd/: echo '{"posto":"piazza","varianti":["E1","E2"],"pre":"p"}' > cmd/1.corsa ; la risposta in cmd/1.out
//                        echo 'return window.PV_STILE' > cmd/2.eval ; echo 'leggera&stile=E2' > cmd/3.reload
const { avvia, OUT } = require('./lib'); const { corsa } = require('./passo7'); const fs = require('fs'), path = require('path');
const Q = process.argv[2] || 'leggera&tassellivecchi&stile=E1';
const VP = { width: +(process.env.W || 960), height: +(process.env.H || 540) };
const L = JSON.parse(fs.readFileSync(path.join(OUT, 'luoghi.json'))); const V = L.vic_pescatori.pts, LT = L.vic_lanternini.pts.slice().reverse(), pz = L.piazza, lm = L.lungomare;
const POSTI = {
  vicolo: { ora: 11, start: V[0], verso: V[3], foto: 0, segs: [{ sec: 5, percorso: V, mag: .5 }, { sec: .6 }] },
  sbocco: { ora: 16, start: LT[0], verso: LT[3], foto: 0, segs: [{ sec: 7.5, percorso: LT.concat([[pz[0], pz[1]], [pz[0] + 10, pz[1] - 6]]), mag: .5 }, { sec: .6 }] },
  lungomare: { ora: 11, start: [lm[0] - 15, lm[1]], verso: [lm[0], lm[1]], foto: 0, segs: [{ sec: 4.5, percorso: [[lm[0] + 25, lm[1]]], mag: 1 }, { sec: .6 }] },
  piazza: { ora: 13, start: [pz[0] - 10, pz[1]], verso: [pz[0], pz[1]], foto: 0, segs: [{ sec: 3, percorso: [[pz[0] + 10, pz[1]]], mag: .5 }, { sec: .6 }] },
  sera: { ora: 19.3, start: [pz[0] + 10, pz[1]], verso: [pz[0] - 10, pz[1]], foto: 0, segs: [{ sec: 3, percorso: [[pz[0] - 10, pz[1]]], mag: .5 }, { sec: .6 }] },
  notte: { ora: 22.5, start: [pz[0] + 10, pz[1]], verso: [pz[0] - 10, pz[1]], foto: 0, segs: [{ sec: 3, percorso: [[pz[0] - 10, pz[1]]], mag: .5 }, { sec: .6 }] },
};
(async () => {
  fs.mkdirSync(path.join(OUT, 'f'), { recursive: true });
  let H = await avvia({ vp: VP, query: Q }); const log = H.log; let busy = false;
  // i comandi: un file in cmd/ (<nome>.eval = JS, <nome>.corsa = JSON, <nome>.reload = query), la risposta in cmd/<nome>.out
  const CMD = path.join(OUT, 'cmd'); fs.mkdirSync(CMD, { recursive: true }); log('pronto');
  for (;;) {
    const fl = fs.readdirSync(CMD).filter(f => /\.(eval|corsa|reload|quit)$/.test(f)).sort();
    if (!fl.length) { await new Promise(r => setTimeout(r, 300)); continue; }
    const f = fl[0], kind = f.split('.').pop(), body = fs.readFileSync(path.join(CMD, f), 'utf8'), t0 = Date.now(); fs.unlinkSync(path.join(CMD, f)); let out = '';
    try {
      if (kind === 'eval') { const r = await H.pg.evaluate(new Function(body)); out = JSON.stringify(r); }
      else if (kind === 'corsa') {
        const a = JSON.parse(body), P = JSON.parse(JSON.stringify(POSTI[a.posto])); if (a.ora !== undefined) P.ora = a.ora;
        P.varianti = a.varianti || [null]; P.tremolio = !!a.tremolio; P.tempi = a.tempi || 1;
        const r = await corsa(H.pg, P), o = [];
        r.var.forEach(([v, url, s, url2]) => { const g = path.join(OUT, 'f', `${a.pre || 'r'}_${a.posto}_${v || 'X'}.png`); fs.writeFileSync(g, Buffer.from(url.split(',')[1], 'base64')); o.push(g);
          if (url2) fs.writeFileSync(g.replace('.png', '_mezzopx.png'), Buffer.from(url2.split(',')[1], 'base64')); });
        fs.writeFileSync(path.join(OUT, `log_${a.pre || 'r'}_${a.posto}.json`), JSON.stringify({ stato: r.var.map(x => [x[0], x[2]]) }));
        out = JSON.stringify({ out: o, ms: r.var.map(x => x[2].ms) });
      }
      else if (kind === 'reload') { try { await H.close(); } catch (e) { } H = await avvia({ vp: VP, query: body.trim() || Q }); out = 'ok'; }
      else if (kind === 'quit') { fs.writeFileSync(path.join(CMD, f.replace(/\.\w+$/, '.out')), 'bye'); await H.close(); process.exit(0); }
    } catch (e) { out = 'ERR ' + String(e.message).slice(0, 600); }
    fs.writeFileSync(path.join(CMD, f.replace(/\.\w+$/, '.out')), out + '\n'); log(f, Date.now() - t0, 'ms');
  }
})();
