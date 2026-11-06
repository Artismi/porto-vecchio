// [camera9] LA TAVOLA OGGI | CAMERA9 e LA SCANSIONE DEI POSTI STRETTI, nel gioco vero (una pagina sola, Camera7.C9.on cambiato dal vivo).
//   node tavola9.js tavola            → ../tavola_oggi_camera9.jpg (+ i fogli dei posti), ../tavola9.json
//   node tavola9.js scansione         → ../scansione9.json: ogni ~6 m lungo i vicoli (nei due versi) la camera9 da ferma; i posti peggiori
//                                        fotografati (oggi | camera9) in ../posti_stretti.jpg
const path = require('path'), fs = require('fs');
const { avvia, provino } = require('../../controlli8/sonde/lib.js'), { posa } = require('./passo9.js');
const MODO = process.argv[2] || 'tavola', OUT = path.resolve(__dirname, '..'), TMP = process.env.TMP9 || path.join(__dirname, 'tmp');
const scrivi = (url, f) => { fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64')); return f; };
(async () => {
  fs.mkdirSync(TMP, { recursive: true });
  const { pg, log, close } = await avvia({ query: process.env.Q9 || 'leggera&tassellivecchi', vp: { width: 800, height: 450 } });
  try {
    const RD = await pg.evaluate(() => { const W = window.__pv.G.MAP.world, o = {}; for (const r of W.roads) if (/^vic_|cavour/.test(r.id)) o[r.id] = { w: r.w, nome: r.name || r.nome || '', pts: r.pts.map(q => [+q[0].toFixed(2), +q[1].toFixed(2)]) }; return o; });
    const V = n => RD[n].pts, mid = (n, f) => { const P = V(n), i = Math.max(0, Math.min(P.length - 2, Math.floor((P.length - 1) * f))); return [P[i], P[Math.min(P.length - 1, i + 3)]]; };
    if (MODO === 'tavola') {
      const pz = [1383, 303], lm = [1421, 399];
      const POSTI = [
        ['vicolo stretto (Caruggio dei Pescatori)', ...mid('vic_pescatori', .45)],
        ['Vico Lungo (a metà)', ...mid('vic_lungo', .5)],
        ['piazza San Rocco', [pz[0] - 8, pz[1] + 1], [pz[0] + 10, pz[1] - 1]],
        ['sbocco sulla piazza (Vicolo dei Lanternini)', [1372.1, 296.5], [1373, 310.6]],
        ['lungomare', [lm[0] - 6, lm[1]], [lm[0] + 20, lm[1]]],
        ['cima della Scala del Mercato', [1288.84, 342.9], [1288.84, 347.4]],
        ['cima della Scalinata di Vico Lungo', V('vic_lungo')[1], V('vic_lungo')[4]],
        ['Salita dei Gatti (a metà)', ...mid('vic_gatti', .5)],
        // i posti peggiori dell'urbanista (v7/URBANISTICA.md, worktree agent-a9a586dc11f2f79d4): le fessure di 2,2 m e la volta del Glacis
        ['Vico della Corte (fessura 2,2 m)', [1420, 362], [1432, 362]],
        ['Corte dei Pescatori (fessura 2,2 m)', [1388, 360], [1396, 360]],
        ['Androne del Pozzo Vecchio (fessura 2,2 m)', [1412, 292], [1422, 292]],
        ['sottopasso del Vico del Glacis', [1477, 292], [1490, 294]],
      ];
      const F = [], J = [];
      for (const [nome, at, verso] of POSTI) { const t0 = Date.now(); const riga = { nome, at, verso };
        for (const c9 of [false, true]) { const r = await posa(pg, { at, verso, c9, assesta: 2.5, perf: 6 }); const f = scrivi(r.url, path.join(TMP, `tavola_${nome.replace(/\W+/g, '_')}_${c9 ? 'c9' : 'oggi'}.jpg`));
          riga[c9 ? 'c9' : 'oggi'] = r.s; F.push([f, `${c9 ? 'CAMERA9' : 'OGGI'} - ${nome} - vista ${r.s.vista}°, braccio ${r.s.arm} m, orizzonte ${(r.s.oriz * 100).toFixed(0)}%, sfondo ${(r.s.sfondo * 100).toFixed(0)}%`]); }
        { const r = await posa(pg, { at, verso, c9: true, assesta: 1, perf: 6, foto: false, lontano: 0 }); riga.c9SenzaTetto = r.s.perf; }   // camera9 col piano lontano a 300 m come oggi
        J.push(riga); log(nome, ((Date.now() - t0) / 1000).toFixed(0) + 's', JSON.stringify(riga.oggi), JSON.stringify(riga.c9)); }
      fs.writeFileSync(path.join(OUT, 'tavola9.json'), JSON.stringify(J, null, 1));
      provino(F, path.join(OUT, 'tavola_oggi_camera9.jpg'), '[camera9] gli stessi posti, lo stesso punto del personaggio: a sinistra la camera di oggi (camera7), a destra ?camera9', 2, 640, 360);
      for (let k = 0; k < F.length; k += 8) provino(F.slice(k, k + 8), path.join(OUT, `tavola_${k / 8 + 1}.jpg`), `[camera9] oggi | camera9 (${k / 8 + 1})`, 2, 800, 450);
    } else {
      // la scansione: lungo ogni vicolo, ogni ~6 m, nei due versi; camera9 da ferma, senza foto
      const PARZ = path.join(OUT, 'scansione9_parziale.json'); let S = []; try { S = JSON.parse(fs.readFileSync(PARZ)); } catch (e) { }   // si riprende (la pagina muore per la memoria)
      for (const id of Object.keys(RD)) { if (S.some(q => q.id === id)) continue; const P = RD[id].pts; let acc = 0;
        for (let i = 1; i < P.length; i++) { acc += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); if (acc < 6 && i < P.length - 1) continue; acc = 0;
          for (const verso of [1, -1]) { const j = Math.max(0, Math.min(P.length - 1, i + verso * 2)); if (j === i) continue;
            const r = await posa(pg, { at: P[i], verso: P[j], c9: true, assesta: 1.2, foto: false }); S.push(Object.assign({ id, nome: RD[id].nome, w: RD[id].w, at: P[i], verso: P[j] }, r.s)); } }
        fs.writeFileSync(PARZ, JSON.stringify(S)); log(id, S.length); }
      // il voto: un buon quadro ha il braccio lungo, la vista bassa, lo sfondo in alto, il busto in vista
      for (const s of S) s.voto = +((s.arm / 7.5) * 2 + Math.max(0, 1 - Math.max(0, s.vista - 15) / 20) * 2 + s.sfondoAlto * 2 + (s.coperto ? -2 : 0) + (s.lift > 1 ? -1 : 0)).toFixed(2);
      S.sort((a, b) => a.voto - b.voto);
      fs.writeFileSync(path.join(OUT, 'scansione9.json'), JSON.stringify(S, null, 1));
      // i peggiori (uno per vicolo e a più di 15 m l'uno dall'altro): oggi | camera9
      const peg = []; for (const s of S) { if (peg.length >= 10) break; if (peg.some(q => Math.hypot(q.at[0] - s.at[0], q.at[1] - s.at[1]) < 15 || q.id === s.id)) continue; peg.push(s); }
      const F = [];
      for (const s of peg) for (const c9 of [false, true]) { const r = await posa(pg, { at: s.at, verso: s.verso, c9, assesta: 1.5 }); const f = scrivi(r.url, path.join(TMP, `stretto_${s.id}_${s.at.join('_')}_${c9 ? 'c9' : 'oggi'}.jpg`));
        F.push([f, `${c9 ? 'CAMERA9' : 'OGGI'} ${s.id} (${s.at[0].toFixed(0)}, ${s.at[1].toFixed(0)}) braccio ${r.s.arm} vista ${r.s.vista}° sfondo alto ${(r.s.sfondoAlto * 100).toFixed(0)}%${r.s.coperto ? ' COPERTO' : ''}`]); s['foto_' + (c9 ? 'c9' : 'oggi')] = path.basename(f); }
      fs.writeFileSync(path.join(OUT, 'posti_stretti.json'), JSON.stringify(peg, null, 1));
      provino(F, path.join(OUT, 'posti_stretti.jpg'), '[camera9] i posti dove anche camera9 non trova un buon quadro (a sinistra oggi, a destra camera9)', 2, 640, 360); log('fine scansione');
    }
  } catch (e) { log('ERRORE', e.message, e.stack); }
  await close();
})();
