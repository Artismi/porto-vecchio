// [gpu] IL BANCO DELLA SCHEDA VIDEO, DA INCOLLARE NELLA CONSOLE (ANALISI_OTTIMIZZAZIONE_GPU.md, §0).
// Sul portatile vero (Iris Xe): aprire il gioco con  ?leggera&perf&noritmo  (noritmo: la risoluzione resta ferma), entrare in strada,
// fermarsi in un punto tipico (il borgo, una piazza), incollare tutto questo file nella console (F12) e poi scrivere:
//     bancoGPU()            // ~45 s, non toccare niente
// Stampa una tabella: per ogni prova i ms della scheda video (scena, post) letti dai contatori di F3, i ms del processore spesi in
// renderer.render della scena, i fotogrammi al secondo. Ogni prova spegne UNA cosa dal vivo (niente ricompilazioni) e la riaccende:
//   base          com'è
//   forbice       la scena disegnata dentro un rettangolo di 8×8 pixel: stessi disegni, stessi programmi, stessi vertici e la stessa
//                 ombra, ma quasi nessun frammento. Quello che resta è il costo NON di pixel (vertici, cambi di stato, ombra, e l'attesa
//                 dei comandi dal processore). È la prova che decide dove cercare.
//   res60         la scena al 60% della tela (R.setRes): se i ms scendono quasi in proporzione ai pixel, comandano i pixel
//   noProposta    i pezzi di shader iniettati in tutti i materiali (rumori del vissuto, nuvole, retino, celle) a zero dalle uniform
//   noNuvole      solo l'ombra delle nuvole e il vissuto del diorama a zero
//   ombraFerma    la mappa d'ombra del sole non si ridisegna (resta quella dell'ultimo fotogramma)
//   noSuolo       il terreno a blocchi (col lastricato procedurale) nascosto
//   piatto        tutti i materiali sostituiti da uno solo, piatto (stessa geometria): il costo degli shader (e dei cambi di programma)
// L'immagine durante le prove è sbagliata di proposito; alla fine torna com'era.
(function () {
  const pv = window.__pv, R = pv && pv.R; if (!R) { console.warn('bancoGPU: gioco non trovato'); return; }
  const rd = R.__models.renderer, scene = R.__models.scene, T3 = window.THREE;
  const ST = { modo: 'base', cpu: 0, n: 0, fr: [], last: 0 };
  const r0 = rd.render;
  rd.render = function (s, c) {
    if (s !== scene) return r0.apply(this, arguments);
    const t = rd.getRenderTarget(); let forb = false;
    if (ST.modo === 'forbice' && t) { t.scissor.set(0, 0, 8, 8); t.scissorTest = true; rd.setRenderTarget(t); forb = true; }
    const a = performance.now(); try { return r0.apply(this, arguments); } finally { ST.cpu += performance.now() - a; ST.n++; if (forb) { t.scissorTest = false; rd.setRenderTarget(t); } } };
  const sm = rd.shadowMap, s0 = sm.render; sm.render = function () { if (ST.modo === 'ombraFerma') return; return s0.apply(this, arguments); };
  (function raf(now) { if (ST.last) ST.fr.push(now - ST.last); ST.last = now; requestAnimationFrame(raf); })(performance.now());
  const piatto = new T3.MeshBasicMaterial({ color: 0x8a8070 });
  const nascosti = [];
  const MODI = {
    base: [() => { }, () => { }],
    forbice: [() => { }, () => { }],
    res60: [() => { ST.res0 = R.res; R.setRes(.6); }, () => { R.setRes(ST.res0 || 1); }],
    noProposta: [() => { window.__SGU.pro.on = false; }, () => { window.__SGU.pro.on = true; }],
    noNuvole: [() => { const D = window.__DIOR; ST.d0 = [D.nuvole, D.vissuto]; D.nuvole = 0; D.vissuto = 0; }, () => { const D = window.__DIOR; D.nuvole = ST.d0[0]; D.vissuto = ST.d0[1]; }],
    ombraFerma: [() => { }, () => { }],
    noSuolo: [() => { (R.ISO.chunks || new Map()).forEach(ch => { const m = ch.grp && ch.grp.children[0]; if (m && m.visible) { m.visible = false; nascosti.push(m); } if (ch.riva && ch.riva.grp && ch.riva.grp.visible) { ch.riva.grp.visible = false; nascosti.push(ch.riva.grp); } }); },
      () => { nascosti.splice(0).forEach(m => { m.visible = true; }); }],
    piatto: [() => { scene.overrideMaterial = piatto; }, () => { scene.overrideMaterial = null; }],
  };
  // [hd] (ANALISI_HD.md) con l'immagine HD: la scena a 640 righe (la soglia) e a 1080 (il massimo), lo stesso posto; la colonna gpuIngr
  // è il passo che ingrandisce fino alla tela vera. Con ?hd=0 queste due prove non ci sono
  const HDS = R.hdScala && R.hdScala();
  if (HDS) { MODI.hd640 = [() => { ST.res0 = R.res; R.setRes(HDS.kmin); }, () => { R.setRes(ST.res0); }]; MODI.hd1080 = [() => { ST.res0 = R.res; R.setRes(1); }, () => { R.setRes(ST.res0); }]; }
  const aspetta = ms => new Promise(r => setTimeout(r, ms));
  window.bancoGPU = async function (secondi) {
    const S = (secondi || 4) * 1000; if (R.gpuTiming && !R.gpuTiming(true)) console.warn('bancoGPU: niente EXT_disjoint_timer_query: solo processore e fps');
    const out = [];
    for (const k of Object.keys(MODI)) {
      ST.modo = k; MODI[k][0](); await aspetta(1800);   // si assesta (i contatori di F3 fanno la media su 30 fotogrammi)
      ST.cpu = 0; ST.n = 0; ST.fr = []; const g = []; const t0 = performance.now();
      while (performance.now() - t0 < S) { await aspetta(250); const m = R.gpuTimes && R.gpuTimes.ms; if (m && m.scena !== undefined) g.push([m.scena, m.post || 0, m.upscale || 0]); }
      const fr = ST.fr.slice().sort((a, b) => a - b), med = fr[fr.length >> 1] || 0, gl = g.slice(Math.floor(g.length / 2));
      const avg = i => gl.length ? gl.reduce((a, b) => a + b[i], 0) / gl.length : NaN, info = R.gpuTimes && R.gpuTimes.info || {};
      out.push({ prova: k, gpuScena: +avg(0).toFixed(1), gpuPost: +avg(1).toFixed(1), gpuIngr: +avg(2).toFixed(2), cpuRenderScena: +(ST.cpu / Math.max(1, ST.n)).toFixed(1), fps: +(1000 / Math.max(1, med)).toFixed(1), disegni: info.calls, triangoli: info.tris, px: info.px });
      MODI[k][1](); ST.modo = 'base'; await aspetta(600);
    }
    console.table(out); return out;
  };
  console.log('bancoGPU pronto: scrivi bancoGPU() e non toccare niente per ~45 s');
})();
