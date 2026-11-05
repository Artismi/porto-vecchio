// [ritmo8] IL BANCO DEL RITMO, DA INCOLLARE NELLA CONSOLE (v7/ANALISI_RITMO8.md, §4). Misura gli scatti, non solo la media.
// Sul portatile vero (Iris Xe) o sul telefono (Chrome remoto): aprire il gioco, entrare in strada, incollare tutto questo file nella console
// (F12) e scrivere:
//     bancoRitmo()          // 20 s: camminare, correre, guidare come si fa di solito
//     bancoRitmo(30)        // o quanti secondi si vuole
// Alla fine stampa una tabella e copia negli appunti (copy) un JSON da mandare indietro così com'è. Misura:
//   - l'intervallo fra due fotogrammi (media, p50, p95, p99, il peggiore, quanti oltre 33/50/100 ms): gli scatti si vedono qui;
//   - i ms del processore per fotogramma: tutto il giro di main.js, R.frame (la grafica), G.step (la logica), Camera7.passo (il braccio
//     della camera coi raggi), il passo dei graffiti (Writing), i tasselli;
//   - i long task del browser (oltre 50 ms) con l'ora;
//   - la memoria JS (inizio e fine: se sale di molto in 20 s, la spazzatura fa scatti);
//   - disegni, triangoli, programmi, tessiture (renderer.info), la riga hd di F3, lo stato delle correzioni ritmo8.
// Per il confronto: rifare con ?noritmo8 nell'indirizzo (le correzioni di ritmo8 spente), stesso posto, stesso percorso.
(function () {
  const pv = window.__pv, R = pv && pv.R; if (!R) { console.warn('bancoRitmo: gioco non trovato'); return; }
  const rd = R.__models.renderer;
  const pq = (a, q) => { if (!a.length) return 0; const b = a.slice().sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(b.length * q))]; };
  const avvolgi = (o, k, M, nome) => { const f = o && o[k]; if (typeof f !== 'function' || f.__r8b) return null; const w = function () { const a = performance.now(); try { return f.apply(this, arguments); } finally { M[nome] = (M[nome] || 0) + performance.now() - a; } }; w.__r8b = true; o[k] = w; return () => { o[k] = f; }; };
  window.bancoRitmo = async function (secondi) {
    const S = (secondi || 20) * 1000, M = {}, iv = [], lt = [], via = [];
    via.push(avvolgi(R, 'frame', M, 'grafica R.frame'), avvolgi(pv.G, 'step', M, 'logica G.step'), typeof Camera7 !== 'undefined' ? avvolgi(Camera7, 'passo', M, 'camera7 (braccio)') : null);
    let po = null; try { po = new PerformanceObserver(l => { for (const e of l.getEntries()) lt.push([Math.round(e.startTime), Math.round(e.duration)]); }); po.observe({ type: 'longtask' }); } catch (e) { }
    const m0 = performance.memory ? performance.memory.usedJSHeapSize : 0, C0 = window.__C7M ? { c: window.__C7M.chiamate || 0, m: window.__C7M.memo || 0, ms: window.__C7M.ms || 0 } : null;
    let last = 0, n = 0; const t0 = performance.now();
    await new Promise(fine => { (function giro(ts) { if (last) iv.push(ts - last); last = ts; n++; if (performance.now() - t0 < S) requestAnimationFrame(giro); else fine(); })(performance.now()); });
    via.forEach(f => f && f()); if (po) po.disconnect();
    const m1 = performance.memory ? performance.memory.usedJSHeapSize : 0, I = rd.info, C = window.__C7M, T = window.__tasselli, A = window.Writing && (Writing.ARTW || (Writing._ && Writing._.ARTW));
    const out = {
      quando: new Date().toISOString(), indirizzo: location.search, scheda: window.PV_GPU_NOME || (window.PV_PROFILO && PV_PROFILO.scheda) || '', profilo: window.PV_PROFILO && PV_PROFILO.profilo,
      fotogrammi: n, fps: +(n / (S / 1000)).toFixed(1),
      intervalloMs: { media: +(iv.reduce((a, b) => a + b, 0) / Math.max(1, iv.length)).toFixed(1), p50: +pq(iv, .5).toFixed(1), p95: +pq(iv, .95).toFixed(1), p99: +pq(iv, .99).toFixed(1), peggiore: +Math.max(0, ...iv).toFixed(0), oltre33: iv.filter(d => d > 33.4).length, oltre50: iv.filter(d => d > 50).length, oltre100: iv.filter(d => d > 100).length },
      processoreMsPerFotogramma: Object.fromEntries(Object.entries(M).map(([k, v]) => [k, +(v / Math.max(1, n)).toFixed(2)])),
      longTask: { n: lt.length, ms: lt.reduce((a, b) => a + b[1], 0), lista: lt.slice(0, 20) },
      memoriaMB: m0 ? { inizio: +(m0 / 1048576).toFixed(1), fine: +(m1 / 1048576).toFixed(1) } : 'non disponibile',
      scena: { disegni: I.render.calls, triangoli: I.render.triangles, programmi: I.programs ? I.programs.length : 0, tessiture: I.memory.textures, geometrie: I.memory.geometries },
      hd: R.hdStato ? R.hdStato() : '', ritmo: window.__ritmo ? { scala: window.__ritmo.scala, tetto: window.__ritmo.tetto, cambi: window.__ritmo.cambi, gpuMs: window.__ritmo.gpuMs, cpuMs: window.__ritmo.cpuMs } : null,
      ritmo8: { acceso: !!(window.PV_R8 && PV_R8.tutto), braccio: C && C0 ? { raggi: C.chiamate - C0.c, dalRicordo: C.memo - C0.m, msPerFotogramma: +((C.ms - C0.ms) / Math.max(1, n)).toFixed(2) } : null,
        tasselli: T ? { griglie: T.r8griglie, grigliaMs: T.r8grigliaMs, pile: T.r8pile, pileFatte: T.r8pileFatte } : null, graffitiAParte: A ? { vivo: A.ok, inCodaQui: A.q.length } : null },
    };
    console.table(Object.assign({ fps: out.fps }, out.intervalloMs)); console.table(out.processoreMsPerFotogramma); console.log('[bancoRitmo]', out);
    try { copy(JSON.stringify(out)); console.log('bancoRitmo: il JSON è negli appunti (incollalo nella risposta)'); } catch (e) { console.log(JSON.stringify(out)); }
    return out;
  };
  console.log('bancoRitmo pronto: scrivi bancoRitmo() e gioca normalmente per 20 s');
})();
