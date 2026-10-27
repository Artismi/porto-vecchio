/* Porto Vecchio — [ritmo] la risoluzione dinamica e il tetto dei fotogrammi, insieme (v7).
   Prima erano due regolatori (main.js sul computer, peso_schermo.js sul telefono) più il «30 per sempre» del telefono; nessuno dei due
   sapeva risalire: con la sincronia dello schermo un fotogramma che sta nel tempo dura 16,7 ms sia che il lavoro sia 5 ms sia 16, e
   la soglia «sotto il 90%» non arrivava mai. Qui un regolatore solo:
   - SI MISURA l'intervallo fra due fotogrammi disegnati (media su ~1 s, e la quota di quelli fuori tempo: oltre il 125% del ritmo).
     Il ritmo voluto è 60 (o 30 quando c'è il tetto). Il periodo dello schermo si stima dai giri del browser (il 20° percentile).
   - PRESSIONE (media oltre il 108% o più di un fotogramma su cinque fuori tempo, per 1 s): si scende di un gradino della scala della
     scena (1 · .9 · .8 · .7 · .6 sul computer; 1 · .9 · .8, la 'bassa' .9 · .8 · .7, sul telefono). Arrivati al gradino del tetto (sul
     computer l'ultimo, sul telefono .8) e ancora fuori tempo, si mette il TETTO a 30: un 30 regolare invece dell'altalena 60/30. Con il
     tetto il ritmo voluto diventa 30 e la scala può risalire. Sugli schermi veloci (oltre 75 Hz) che non tengono il loro ritmo ma stanno
     sotto i 16,7 ms il tetto è a 60 (un 60, o 72 a 144 Hz, regolare).
   - MARGINE: con i tempi della scheda video (EXT_disjoint_timer_query, render.js gpuTiming) si sale quando il lavoro stimato al gradino
     sopra sta sotto l'80% del ritmo (per 2 s). Senza (quasi sempre sul telefono) si PROVA: dopo un tratto calmo si sale di un gradino (o si
     toglie il tetto); se entro 2,5 s torna la pressione si torna giù e la prossima prova aspetta il doppio (5 s, 10, 20… fino a 2 minuti);
     una prova che regge 6 s rimette l'attesa a 5 s (10 s per il tetto).
   - Al più un cambio al secondo (dopo un cambio i primi 300 ms non si contano: si rifanno i bersagli). La scala cambia SOLO il bersaglio
     della scena: il passo finale del look e la sua tela restano della loro misura (render.js resize/setRes).
   main.js: PesoRitmo.salta(now) a ogni giro del browser (true: questo giro non si disegna), PesoRitmo.misura(now, raw, attivo) sui
   fotogrammi disegnati, PesoRitmo.lavoro(ms) a fine fotogramma. ?noritmo spegne (i regolatori di prima); ?ritmo=30|60 fissa il tetto.
   window.__ritmo per le sonde.                                                                                                       */
var PesoRitmo = (function () {
  'use strict';
  const Q = typeof location !== 'undefined' ? location.search : '';
  const ON = !/[?&]noritmo\b/.test(Q);
  const FISSO = +((Q.match(/[?&]ritmo=(30|60)\b/) || [])[1] || 0);
  const S = { R: null, tel: false, scala: [1], i: 0, iTetto: 0, tetto: FISSO, periodo: 1000 / 60, giri: [], gn: 0, int: [], ultimo: 0,
    pres: 0, calma: 0, cambio: 0, prova: null, attesa: 5000, attesaT: 10000, gpu: false, cpu: 0, cambi: 0, giu: 0, su: 0, prove: 0, fallite: 0, tetti: 0, pronto: false };
  function avvia(R) {
    S.R = R; S.pronto = true; S.tel = !!R.phone || (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches);
    const liv = (window.__pesoLivello && window.__pesoLivello.livello) || 'media';
    if (S.tel) { S.scala = liv === 'bassa' ? [.9, .8, .7] : [1, .9, .8]; S.iTetto = liv === 'bassa' ? 1 : S.scala.length - 1; }
    else { S.scala = [1, .9, .8, .7, .6]; S.iTetto = S.scala.length - 1; }
    S.i = 0; if (R.setRes) R.setRes(S.scala[0]);
    if (!S.tel && R.gpuTiming && !/[?&]noritmogpu\b/.test(Q)) try { S.gpu = !!R.gpuTiming(true); } catch (e) { S.gpu = false; }
  }
  const T0 = () => S.tetto || 60, budget = () => 1000 / T0();
  // quanti giri dello schermo per fotogramma, col tetto (30 a 60 Hz: 2; 60 a 144 Hz: 2, cioè 72 regolari)
  const passi = () => S.tetto ? Math.max(1, Math.round(1000 / S.tetto / S.periodo)) : 1;
  function salta(now) {
    if (!ON) return false;
    if (S.gn) { const d = now - S.gn; if (d > 2 && d < 60) { S.giri.push(d); if (S.giri.length >= 90) { const b = S.giri.sort((x, y) => x - y); S.periodo = Math.min(34, Math.max(4, b[Math.floor(b.length * .2)])); S.giri.length = 0; } } }
    S.gn = now;
    if (!S.tetto || !S.ultimo) return false;
    return now - S.ultimo < (passi() - .5) * S.periodo;
  }
  function lavoro(ms) { S.cpu += (ms - S.cpu) * .1; }
  function scala(i, now) { i = Math.max(0, Math.min(S.scala.length - 1, i)); if (i === S.i) return false; const su = i < S.i; S.i = i; S.R.setRes(S.scala[i]); dopo(now); S.cambi++; su ? S.su++ : S.giu++; return true; }
  function tetto(v, now) { if (FISSO || v === S.tetto) return false; S.tetto = v; dopo(now); S.cambi++; S.tetti++; return true; }
  function dopo(now) { S.cambio = now; S.int.length = 0; S.pres = 0; S.calma = 0; }
  function gpuMs() { const g = S.gpu && S.R.gpuTimes; if (!g || !g.ok) return 0; let s = 0; for (const k in g.ms) s += g.ms[k]; return s; }
  // la prova è andata male: si torna com'era e la prossima aspetta il doppio
  function fallita(now) {
    const P = S.prova; S.prova = null; S.fallite++;
    if (P.tipo === 'scala') { scala(P.da, now); S.attesa = Math.min(120000, S.attesa * 2); }
    else { tetto(P.da, now); S.attesaT = Math.min(120000, S.attesaT * 2); }
  }
  function misura(now, raw, attivo) {
    if (!ON) return;
    if (!S.pronto) { const R = window.__pv && window.__pv.R; if (!R || !R.setRes) return; S.t0 = S.t0 || now;
      if (!window.__pesoLivello && window.PesoSchermo && now - S.t0 < 5000) return;   // il livello della scheda (peso_schermo.js) decide la scala del telefono
      avvia(R); }
    const d = now - (S.ultimo || now); S.ultimo = now;
    if (!attivo || raw > .25 || d <= 0 || now - S.cambio < 300) return;   // il caricamento, una pausa, i bersagli appena rifatti: non contano
    S.int.push([now, d]); while (S.int.length && now - S.int[0][0] > 1000) S.int.shift();
    if (S.int.length < 12) return;
    const B = budget(); let m = 0, fuori = 0; for (const q of S.int) { m += q[1]; if (q[1] > B * 1.25) fuori++; }
    m /= S.int.length; const qf = fuori / S.int.length, dd = Math.min(100, d);
    const veloce = S.periodo < 13.3, lento = veloce && !S.tetto && m > S.periodo * 1.3 && m <= B * 1.08;   // lo schermo veloce che non tiene il suo ritmo
    const pressione = m > B * 1.08 || qf > .2, calmo = !pressione && m < B * 1.02 && qf < .03;
    if (pressione || lento) { S.pres += dd; S.calma = 0; } else if (calmo) { S.calma += dd; S.pres = 0; } else { S.pres = Math.max(0, S.pres - dd); S.calma = 0; }
    if (S.prova && now - S.prova.t > 6000) { if (S.prova.tipo === 'scala') S.attesa = 5000; else S.attesaT = 10000; S.prova = null; }   // ha retto
    if (now - S.cambio < 1000) return;   // al più un cambio al secondo
    if (S.prova && S.pres > 400 && now - S.prova.t < 2500) { fallita(now); return; }
    if (S.pres > 1000) {
      if (lento && !pressione) { tetto(60, now); return; }
      if (S.i < S.iTetto || (S.tetto === 30 && S.i < S.scala.length - 1)) { scala(S.i + 1, now); return; }
      if (S.tetto !== 30 && tetto(30, now)) return;
      if (S.i < S.scala.length - 1) { scala(S.i + 1, now); return; }
      S.pres = 0; return;   // in fondo: ci pensa la grafica ridotta di main.js
    }
    // il margine misurato (scheda video e processore): si sale senza provare
    const g = gpuMs();
    if (g > 0 && !pressione && (S.i > 0 || (S.tetto && !FISSO))) {
      const k = S.i > 0 ? S.scala[S.i - 1] / S.scala[S.i] : 1, Bs = S.i > 0 ? B : 1000 / 60, st = Math.max(g * k * k, S.cpu);   // il lavoro al gradino sopra (i pixel vanno col quadrato), o senza tetto
      if (st < Bs * .8) { S.calma2 = (S.calma2 || 0) + dd; if (S.calma2 > 2000) { S.calma2 = 0; if (S.i > 0) scala(S.i - 1, now); else tetto(S.tetto === 30 && veloce ? 60 : 0, now); } }
      else S.calma2 = 0;
      if (S.i > 0) return;   // con i tempi la scala non si prova
    }
    if (FISSO && S.i === 0) return;
    // senza i tempi: la prova
    if (S.calma > (S.i > 0 ? S.attesa : S.attesaT) && (S.i > 0 || S.tetto)) {
      S.prove++;
      if (S.i > 0) { const da = S.i; if (scala(S.i - 1, now)) S.prova = { tipo: 'scala', da, t: now }; }
      else { const da = S.tetto; if (tetto(da === 30 && veloce ? 60 : 0, now)) S.prova = { tipo: 'tetto', da, t: now }; }
    }
  }
  // per main.js: la grafica ridotta solo quando il regolatore è in fondo (scala minima e tetto a 30)
  const inFondo = () => !ON || (S.i >= S.scala.length - 1 && S.tetto === 30);
  const stato = () => ({ on: ON, tel: S.tel, scala: S.scala[S.i], gradino: S.i, scalaTutta: S.scala.slice(), tetto: S.tetto, periodo: +S.periodo.toFixed(2), passi: passi(),
    gpu: S.gpu, gpuMs: +gpuMs().toFixed(2), cpuMs: +S.cpu.toFixed(2), attesa: S.attesa, attesaT: S.attesaT, prova: S.prova && S.prova.tipo, cambi: S.cambi, giu: S.giu, su: S.su, prove: S.prove, fallite: S.fallite, tetti: S.tetti });
  if (typeof window !== 'undefined') Object.defineProperty(window, '__ritmo', { get: stato, configurable: true });
  return { ON, salta, misura, lavoro, inFondo, stato, get tetto() { return S.tetto; } };
})();
if (typeof window !== 'undefined') window.PesoRitmo = PesoRitmo;
