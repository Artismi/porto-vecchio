/* Porto Vecchio — [suono] LA MUSICA ADATTIVA E I CAMPIONI COTTI IN CASA (v7/squadra/suono/RICERCA.md).
   Placida quando è pace, un film d'azione quando si scalda: la regia (cinema.js, Cinema.S.v da 0 a 1) decide, la musica segue.
   1. I CAMPIONI: niente file. Batteria, basso, piano elettrico, archi, l'«orchestra hit», il vinile, la voce da graffiare, i passi e gli
      ambienti (audio.js) si calcolano qui una volta in AudioBuffer mono a 22 050 Hz (il campionatore anni '80 lavorava così), a pezzi,
      con un tetto di ~2 ms per fotogramma (lavora): il primo tocco non scatta. Suonarli costa una sorgente e un guadagno.
   2. DUE STATI (il risequenziamento orizzontale): la PACE, 82 BPM, lo-fi (piano elettrico, cassa morbida, il vinile, il passa-basso
      chiuso), a sezioni di 4-8 battute scelte a caso coi loro pesi e, ogni tanto, il silenzio (il paese e il mare restano soli);
      l'AZIONE, 96 BPM, boom bap pieno (cassa dura, rullante, basso a sedicesimi, gli stab, gli archi). L'azione entra SUL BATTITO DOPO
      con lo stinger (piatto e orchestra hit: l'hip hop del 1986); la pace torna SULLA BATTUTA pari con uno scratch.
   3. GLI STRATI (verticali): dentro ogni stato la tensione apre gli strati (charleston a sedicesimi, stab, archi, scratch, shaker) e il
      filtro; la pace «inquieta» (ricercato, la tensione che scende) suona il giro scuro con la batteria.
   4. GLI STINGER: i momenti grossi (il rallentatore, l'uccisione, l'inseguimento che parte, la fine) a tempo sul sedicesimo dopo.
   Il tempo: le note si programmano sull'orologio dell'audio con K.anticipo s di anticipo (la radio di audio.js fa lo stesso), il ciclo
   del gioco riempie solo la finestra. Le voci sono contate (al più K.voci): oltre, cadono prima i charleston e la melodia.
   ?nomusica: niente musica (i campioni dei passi e degli ambienti si cuociono lo stesso). Dal vivo: window.__suono (audio.js). */
var Musica = (function () {
  'use strict';
  const Q = typeof location !== 'undefined' ? location.search || '' : '';
  const SR = 22050, PI2 = Math.PI * 2;
  const K = {
    anticipo: .45,           // s: la finestra programmata in anticipo (a 8 fps un fotogramma è 0,125 s)
    bpmPace: 82, bpmAzione: 96,
    swingPace: .6, swingAzione: .56,   // lo swing dell'MPC sui sedicesimi (0,5 = dritto)
    entra: .58,              // tensione per l'azione (ricercato 1 = 0,5 resta pace inquieta; inseguimento, spari, scontro: azione)
    esce: .3, minAzione: 4,  // sotto, sulla battuta pari e dopo almeno 4 battute, si torna alla pace
    inquieta: .2,            // la pace con la batteria e il giro scuro
    voci: 26,                // tetto delle voci della musica
    lavoro: 2,               // ms per fotogramma per cuocere i campioni
    volumi: { batt: .5, basso: .42, tasti: .2, mel: .17, pad: .12, stab: .2, fx: .34, vinile: .05 },
  };
  const F = { musica: !/[?&]nomusica\b/.test(Q) };
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const mf = n => 440 * Math.pow(2, (n - 69) / 12);

  // ---------------- 1. LA CUCINA DEI CAMPIONI ----------------
  function seme(s) { let x = (s >>> 0) || 1; return () => (x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296; }
  // il biquad di RBJ (lp, hp, bp a picco 0 dB), con set(f) per gli sweep
  function BQ(type, f0, q) {
    let b0, b1, b2, a1, a2, x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    const set = f => { f = Math.max(20, Math.min(SR * .45, f)); const w = PI2 * f / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * (q || .707)), a0 = 1 + al;
      if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; } else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; } else { b0 = al; b1 = 0; b2 = -al; }
      b0 /= a0; b1 /= a0; b2 /= a0; a1 = -2 * c / a0; a2 = (1 - al) / a0; };
    set(f0);
    const run = x => { const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
    run.set = set; return run;
  }
  const exp = Math.exp, sin = Math.sin, tanh = Math.tanh || (x => { const e = Math.exp(2 * x); return (e - 1) / (e + 1); });
  // le ricette: generatori che riempiono d (Float32Array) e cedono ogni 2048 campioni. dur in s; norm: il picco finale
  const RIC = {};
  const ric = (nome, dur, fn, norm) => { RIC[nome] = { dur, fn, norm: norm === undefined ? .9 : norm }; };
  // LA BATTERIA
  ric('cassa', .55, function* (d, R) { let ph = 0; const lp = BQ('lp', 1800, .7);
    for (let i = 0; i < d.length; i++) { const t = i / SR, f = 46 + 120 * exp(-t * 32); ph += PI2 * f / SR; d[i] = tanh((sin(ph) * exp(-t * 6.5) + lp(R() * 2 - 1) * exp(-t * 260) * .4) * 1.5); if (!(i & 2047)) yield; } });
  ric('cassa2', .6, function* (d, R) { let ph = 0; const lp = BQ('lp', 3200, .7);
    for (let i = 0; i < d.length; i++) { const t = i / SR, f = 48 + 170 * exp(-t * 38); ph += PI2 * f / SR; d[i] = tanh((sin(ph) * exp(-t * 5.2) + lp(R() * 2 - 1) * exp(-t * 200) * .6) * 2.6); if (!(i & 2047)) yield; } });
  ric('rull', .42, function* (d, R) { let ph = 0; const bp = BQ('bp', 2000, .6), hp = BQ('hp', 700, .7);
    for (let i = 0; i < d.length; i++) { const t = i / SR; ph += PI2 * 195 * (1 + .45 * exp(-t * 40)) / SR; const n = hp(bp(R() * 2 - 1));
      d[i] = tanh((sin(ph) * exp(-t * 22) * .75 + n * (exp(-t * 13) * 2.2 + exp(-t * 60) * 1.2)) * 1.6); if (!(i & 2047)) yield; } });
  ric('rull_m', .45, function* (d, R) { let ph = 0; const lp = BQ('lp', 3200, .6), hp = BQ('hp', 400, .7);
    for (let i = 0; i < d.length; i++) { const t = i / SR; ph += PI2 * 180 / SR; const n = lp(hp(R() * 2 - 1));
      d[i] = sin(ph) * exp(-t * 26) * .5 + n * (exp(-t * 11) * 1.4 + exp(-t * 4.5) * .12); if (!(i & 2047)) yield; } });
  ric('chh', .07, function* (d, R) { const hp = BQ('hp', 6800, .8), bp = BQ('bp', 9000, 1.2);
    for (let i = 0; i < d.length; i++) { const t = i / SR, n = R() * 2 - 1; d[i] = (hp(n) + bp(n) * .6) * exp(-t * 75); if (!(i & 2047)) yield; } });
  ric('ohh', .5, function* (d, R) { const hp = BQ('hp', 6000, .8), bp = BQ('bp', 8500, 1.5);
    for (let i = 0; i < d.length; i++) { const t = i / SR, n = R() * 2 - 1; d[i] = (hp(n) + bp(n) * .7) * exp(-t * 7.5) * Math.min(1, t * 900); if (!(i & 2047)) yield; } });
  ric('shk', .1, function* (d, R) { const bp = BQ('bp', 5200, 1.5);
    for (let i = 0; i < d.length; i++) { const t = i / SR; d[i] = bp(R() * 2 - 1) * Math.min(1, t * 90) * exp(-Math.max(0, t - .012) * 42); if (!(i & 2047)) yield; } });
  ric('piatto', 2, function* (d, R) { const hp = BQ('hp', 3600, .7), bp = BQ('bp', 6200, .9); let a = 0, b = 0, c = 0;
    for (let i = 0; i < d.length; i++) { const t = i / SR, n = R() * 2 - 1; a += PI2 * 3150 / SR; b += PI2 * 4180 / SR; c += PI2 * 5390 / SR;
      d[i] = ((hp(n) + bp(n) * .8) * exp(-t * 2.3) + (sin(a) + sin(b) + sin(c)) * .04 * exp(-t * 3)) * Math.min(1, t * 2000); if (!(i & 2047)) yield; } });
  // IL BASSO (do2): armoniche fino alla quarta, perché l'altoparlante del telefono la fondamentale non la dà
  ric('basso', 1.7, function* (d) { let ph = 0;
    for (let i = 0; i < d.length; i++) { const t = i / SR; ph += PI2 * mf(36) / SR; const x = sin(ph) + .38 * sin(2 * ph) + .2 * sin(3 * ph) + .09 * sin(4 * ph);
      d[i] = tanh(x * 1.5 * (exp(-t * 1.1) * .8 + exp(-t * 7) * .3) * Math.min(1, t * 160)); if (!(i & 2047)) yield; } });
  // IL PIANO ELETTRICO (do4): FM a rapporto 1, l'indice che cala, la lamella che tintinna all'attacco
  ric('tasti', 2.6, function* (d) { let pc = 0, pm = 0, pt = 0; const f = mf(60), lp = BQ('lp', 5200, .6);
    for (let i = 0; i < d.length; i++) { const t = i / SR; pc += PI2 * f / SR; pm += PI2 * f / SR; pt += PI2 * f * 7.1 / SR; const I = 2.1 * exp(-t * 5) + .25;
      d[i] = lp(tanh(1.2 * (sin(pc + I * sin(pm)) * exp(-t * 1.25) + sin(pt) * exp(-t * 26) * .09)) * Math.min(1, t * 330)); if (!(i & 2047)) yield; } });
  // GLI ARCHI (do3): tre seghe un poco stonate fra loro, passa-basso, attacco lento
  ric('pad', 4, function* (d) { let a = 0, b = 0, c = 0; const f = mf(48), lp = BQ('lp', 1500, .6), lp2 = BQ('lp', 2200, .6), n = d.length;
    for (let i = 0; i < n; i++) { const t = i / SR; a = (a + f * .996 / SR) % 1; b = (b + f / SR) % 1; c = (c + f * 1.004 / SR) % 1;
      const env = Math.min(1, t / .45) * Math.min(1, (n - i) / (SR * .7)); d[i] = lp2(lp((a + b + c - 1.5) * .66)) * env; if (!(i & 2047)) yield; } });
  // L'ORCHESTRA HIT (do4): ottave e quinta di seghe, il filtro che si chiude, un soffio all'attacco
  ric('stab', 1.1, function* (d, R) { const P = [1, 1.5, 2, 3, 4], ph = [0, 0, 0, 0, 0], f = mf(60), lp = BQ('lp', 5000, .9), hp = BQ('hp', 2000, .7);
    for (let i = 0; i < d.length; i++) { const t = i / SR; let x = 0; for (let k = 0; k < 5; k++) { ph[k] = (ph[k] + f * P[k] / SR) % 1; x += (ph[k] * 2 - 1) / (1 + k * .5); }
      if (!(i & 31)) lp.set(800 + 4200 * exp(-t * 6)); d[i] = tanh((lp(x * .45) + hp(R() * 2 - 1) * exp(-t * 40) * .5) * exp(-t * 3.4) * Math.min(1, t * 600) * 1.8); if (!(i & 2047)) yield; } });
  // IL VINILE: i crepitii (impulsi rari in un passa-banda) e un fruscio basso; 3 s in giro
  ric('vinile', 3, function* (d, R) { const bp = BQ('bp', 2600, .9), lp = BQ('lp', 3800, .6);
    for (let i = 0; i < d.length; i++) { const k = R() < 16 / SR ? (.25 + .75 * Math.pow(R(), 3)) * (R() < .5 ? -1 : 1) : 0; d[i] = bp(k * 6) + lp(R() * 2 - 1) * .05; if (!(i & 2047)) yield; } }, .5);
  // LA VOCE DA GRAFFIARE («ahh»: una sega in tre formanti), e la sua copia rovesciata (il disco che torna indietro)
  ric('voce', .5, function* (d) { let ph = 0; const f1 = BQ('bp', 760, 5), f2 = BQ('bp', 1220, 6), f3 = BQ('bp', 2600, 8), n = d.length;
    for (let i = 0; i < n; i++) { const t = i / SR; ph = (ph + (150 - 30 * t / .5) / SR) % 1; const s = ph * 2 - 1; d[i] = (f1(s) + f2(s) * .8 + f3(s) * .35) * Math.min(1, t * 70) * Math.min(1, (n - i) / (SR * .06)); if (!(i & 2047)) yield; } });
  // IL BOATO dello stinger
  ric('boom', 2.4, function* (d, R) { let ph = 0; const lp = BQ('lp', 260, .8);
    for (let i = 0; i < d.length; i++) { const t = i / SR; ph += PI2 * (28 + 34 * exp(-t * .9)) / SR; d[i] = tanh((sin(ph) * exp(-t * 1.5) + lp(R() * 2 - 1) * exp(-t * 2.2) * 1.6) * 2); if (!(i & 2047)) yield; } });

  // la cottura: una coda di nomi, lavorata a pezzi
  const M = { ctx: null, lav: null, buf: {}, coda: [], job: null, msCotti: 0, pronto: false, lay: {}, lp: null, S: null, voci: 0, creati: 0, stq: [], vin: null };
  function cuociOra(nome, seed) {   // tutto subito (le prove; e chi ha fretta)
    const r = RIC[nome]; const d = new Float32Array(Math.max(1, Math.round(r.dur * SR))); const it = r.fn(d, seme(seed || nome.length * 7919 + 17)); while (!it.next().done) { } return fine(d, r.norm);
  }
  function fine(d, norm) { if (norm) { let p = 0; for (let i = 0; i < d.length; i++) { const a = d[i] < 0 ? -d[i] : d[i]; if (a > p) p = a; } if (p > 1e-6) { const k = norm / p; for (let i = 0; i < d.length; i++) d[i] *= k; } } return d; }
  function aBuffer(ctx, d) { const b = ctx.createBuffer(1, d.length, SR); if (b.copyToChannel) b.copyToChannel(d, 0); else b.getChannelData(0).set(d); return b; }
  // chi non sta in RIC (audio.js aggiunge i suoi: passi, ambienti) passa con la sua ricetta
  function chiedi(nome, dur, fn, norm, seed) { if (!RIC[nome]) ric(nome, dur, fn, norm); if (!(nome in M.buf) && !M.coda.some(q => q.nome === nome) && !(M.lav && M.lav.attesa.has(nome))) M.coda.push({ nome, seed }); }
  // [suono] LA CUCINA FUORI DAL FILO DEL GIOCO: un Web Worker (dal testo, come tasselli.js e calcolo.js) cuoce le ricette (il loro testo:
  // usano solo SR, PI2, exp, sin, tanh, mf, BQ e Math) e rimanda i Float32Array; qui resta solo la copia nell'AudioBuffer. La prima
  // prova sul filo principale aveva picchi di 40 ms (la compilazione di ogni ricetta): sul telefono uno scatto per campione.
  // Senza Worker (o se si rompe) la cottura torna qui, a pezzi (lavora)
  const testoCucina = () => 'const SR=' + SR + ',PI2=Math.PI*2,exp=Math.exp,sin=Math.sin,tanh=Math.tanh,mf=n=>440*Math.pow(2,(n-69)/12);\n' + seme.toString() + '\n' + BQ.toString() + '\n' + fine.toString() + '\n' +
    'onmessage=e=>{const q=e.data;try{const fn=(0,eval)("("+q.src+")");const d=new Float32Array(Math.max(1,Math.round(q.dur*SR)));const it=fn(d,seme(q.seed));while(!it.next().done){}fine(d,q.norm);postMessage({nome:q.nome,d},[d.buffer]);}catch(err){postMessage({nome:q.nome,err:String(err)});}};';
  function apriCucina() {
    if (typeof Worker === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined' || /[?&]nocucina\b/.test(Q)) return null;
    const testo = testoCucina();
    try { const w = new Worker(URL.createObjectURL(new Blob([testo], { type: 'text/javascript' }))); w.attesa = new Set();
      w.onmessage = e => { const q = e.data; w.attesa.delete(q.nome); if (q.err || !q.d) { RIC[q.nome].qui = true; M.coda.push({ nome: q.nome }); return; } try { M.buf[q.nome] = aBuffer(M.ctx, q.d); } catch (x) { M.buf[q.nome] = null; } };
      w.onerror = () => { M.lav = null; w.attesa.forEach(n => M.coda.push({ nome: n })); try { w.terminate(); } catch (x) { } };
      return w; } catch (e) { return null; }
  }
  const manda = q => { const r = RIC[q.nome]; M.lav.attesa.add(q.nome); M.lav.postMessage({ nome: q.nome, src: r.fn.toString(), dur: r.dur, norm: r.norm, seed: q.seed || q.nome.length * 7919 + 17 }); };
  function lavora(ms) {
    if (!M.ctx) return;
    if (M.lav) { for (let i = 0; i < M.coda.length; i++) if (!RIC[M.coda[i].nome].qui) { manda(M.coda[i]); M.coda.splice(i--, 1); } if (!M.coda.length) return; }   // chi nel lavoratore si è rotto si cuoce qui
    const t0 = now();
    while (now() - t0 < ms) {
      if (!M.job) { const q = M.coda.shift(); if (!q) break; const r = RIC[q.nome]; const d = new Float32Array(Math.max(1, Math.round(r.dur * SR))); M.job = { nome: q.nome, d, r, it: r.fn(d, seme(q.seed || q.nome.length * 7919 + 17)) }; }
      if (M.job.it.next().done) { const J = M.job; M.job = null; try { M.buf[J.nome] = aBuffer(M.ctx, fine(J.d, J.r.norm)); } catch (e) { M.buf[J.nome] = null; } }
    }
    M.msCotti += now() - t0;
  }

  // ---------------- 2. LA PARTITURA ----------------
  // i giri: [basso (midi), accordo del piano senza la fondamentale]. PACE: Fmaj9 Em7 Dm9 Cmaj9 · Dm9 G13 Cmaj9 Am9 · (scuro) Am9 Dm9 Fmaj7 E7b9
  const GIRI = {
    pace: [[[41, [57, 60, 64, 67]], [40, [55, 59, 62, 64]], [38, [53, 57, 60, 64]], [36, [52, 55, 59, 62]]],
      [[38, [53, 57, 60, 64]], [43, [53, 57, 59, 64]], [36, [52, 55, 59, 62]], [45, [55, 59, 60, 64]]]],
    scuro: [[[45, [55, 59, 60, 64]], [38, [53, 57, 60, 64]], [41, [57, 60, 64, 65]], [40, [56, 59, 62, 65]]]],
    // AZIONE: Am Am F E · Dm Am B♭ A (il frigio del film d'azione)
    azione: [[[45, [57, 60, 64]], [45, [57, 60, 64]], [41, [57, 60, 65]], [40, [56, 59, 64]]],
      [[38, [57, 62, 65]], [45, [57, 60, 64]], [46, [58, 62, 65]], [45, [57, 61, 64]]]],
  };
  const SCALA = [57, 60, 62, 64, 67, 69, 72, 74, 76];   // la pentatonica di la minore per la melodia
  // la batteria a sedicesimi: le casse di ogni stato (una a battuta, a caso), il rullante sul 2 e sul 4
  const CASSE = { pace: [[0, 10], [0, 7, 10], [0, 10, 13], [0, 6, 10]], azione: [[0, 3, 10], [0, 7, 9], [0, 2, 10, 11], [0, 3, 8, 10]] };
  const BASSI = { pace: [[[0, 0, 6], [10, 7, 3], [14, -1, 2]], [[0, 0, 5], [7, 0, 2], [10, 12, 3]]],   // [passo, intervallo (-1: verso il prossimo), durata in sedicesimi]
    azione: [[[0, 0, 2], [3, 0, 1], [6, 12, 1], [8, 0, 2], [10, 7, 1], [11, 0, 1], [14, 10, 2]], [[0, 0, 3], [3, 0, 2], [7, 12, 1], [8, 0, 2], [11, 7, 2], [14, -1, 2]]] };
  const MOTIVI = [[0, 3, 6, 10], [2, 4, 7], [0, 6, 8, 14], [4, 7, 10, 12], [1, 3, 8, 11]];
  // le sezioni della pace: battute e strati
  const SEZ = {
    intro: { len: 4, s: { tasti: .9, vinile: 1 } },
    groove: { len: 8, s: { tasti: .75, batt: .8, basso: .85, vinile: .8 } },
    melodia: { len: 8, s: { tasti: .6, batt: .8, basso: .85, mel: .8, vinile: .8 } },
    stacco: { len: 4, s: { tasti: .8, batt: .5, basso: .5, vinile: 1 }, soloHat: true },
    notte: { len: 8, s: { pad: .7, tasti: .55, basso: .5, batt: .45, vinile: .9 }, soloRim: true },
    silenzio: { len: 16, s: {} },
  };
  const DOPO = { intro: [['groove', .7], ['melodia', .3]], groove: [['melodia', .45], ['stacco', .3], ['groove', .25]], melodia: [['groove', .4], ['stacco', .4], ['melodia', .2]],
    stacco: [['groove', .6], ['melodia', .4]], notte: [['notte', .5], ['stacco', .25], ['groove', .25]], silenzio: [['intro', 1]] };
  const pesa = (L, r) => { let a = r * L.reduce((s, x) => s + x[1], 0); for (const x of L) { a -= x[1]; if (a <= 0) return x[0]; } return L[L.length - 1][0]; };
  function nuovoStato(seed) { return { modo: 'pace', sez: 'intro', sezBar: 0, giri: 0, riposo: 4, bar: 0, barModo: 0, step: 0, next: 0, prog: 0, giro: 'pace', rnd: seme(seed || 1986), casse: CASSE.pace[0], bas: 0, mot: null, motBar: 0, uscita: false, entrata: false, T: 0, notte: 0, ultimoSt: -99 }; }

  // LA SCELTA (pura, provata da test_suono.js): sul battito l'azione che entra, sulla battuta la pace che torna e le sezioni
  function battito(S, T) {   // k % 4 === 0
    if (S.modo !== 'azione' && T >= K.entra) { S.modo = 'azione'; S.barModo = 0; S.step = 0; S.giro = 'azione'; S.prog = (S.rnd() * GIRI.azione.length) | 0; S.entrata = true; return 'entra'; }
    return null;
  }
  function battuta(S, T, notte) {   // k === 0, dopo battito
    S.bar++; S.barModo++;
    if (S.modo === 'azione') {
      if (T < K.esce && S.barModo > K.minAzione && S.bar % 2 === 0) { S.modo = 'pace'; S.sez = T >= K.inquieta ? 'groove' : 'intro'; S.sezBar = 0; S.barModo = 0; S.giri = 0; S.giro = T >= K.inquieta ? 'scuro' : 'pace'; S.uscita = true; return 'esce'; }
      if (S.bar % 2 === 0) S.casse = CASSE.azione[(S.rnd() * CASSE.azione.length) | 0];
      return null;
    }
    S.sezBar++;
    // la pace inquieta: niente silenzio, la batteria e il giro scuro
    if (T >= K.inquieta && (S.sez === 'silenzio' || S.sez === 'intro' || S.sez === 'notte')) { S.sez = 'groove'; S.sezBar = 0; S.giro = 'scuro'; S.prog = 0; return 'inquieta'; }
    if (S.sezBar >= SEZ[S.sez].len) {
      S.sezBar = 0; S.giri++;
      let n = pesa(DOPO[S.sez], S.rnd());
      if (S.sez !== 'silenzio' && S.giri >= S.riposo && T < K.inquieta * .75) { n = 'silenzio'; S.giri = 0; S.riposo = 4 + ((S.rnd() * 4) | 0); }
      else if (notte >= .7 && n !== 'stacco' && n !== 'intro' && S.rnd() < .6) n = 'notte';
      if (n !== S.sez || S.rnd() < .5) { S.giro = T >= K.inquieta ? 'scuro' : 'pace'; S.prog = (S.rnd() * GIRI[S.giro].length) | 0; }
      S.sez = n; S.casse = CASSE.pace[(S.rnd() * CASSE.pace.length) | 0]; S.bas = (S.rnd() * BASSI.pace.length) | 0;
      return 'sezione';
    }
    if (S.sezBar % 2 === 0) S.casse = CASSE.pace[(S.rnd() * CASSE.pace.length) | 0];
    return null;
  }
  // gli strati per lo stato e la tensione (0..1 ciascuno)
  const STRATI = ['batt', 'basso', 'tasti', 'mel', 'pad', 'stab', 'fx', 'vinile'];
  function strati(S, T, out) {
    for (const n of STRATI) out[n] = 0; out.fx = 1;
    if (S.modo === 'azione') { out.batt = 1; out.basso = 1; out.tasti = T < .7 ? .45 : .2; out.stab = T >= .65 ? 1 : .35; out.pad = T >= .65 ? .8 : 0; out.vinile = .25; out.hat16 = T >= .65; out.extra = T >= .85; }
    else { const s = SEZ[S.sez].s; for (const n in s) out[n] = s[n]; out.hat16 = false; out.extra = false; if (S.giro === 'scuro' && out.batt) out.batt = Math.max(out.batt, .9); }
    return out;
  }
  const taglio = (S, T, notte) => S.modo === 'azione' ? 7000 + 4000 * T : (S.sez === 'silenzio' ? 1200 : 2300 + 2600 * Math.min(1, T / K.entra)) * (1 - .25 * notte);

  // ---------------- 3. L'ESECUZIONE (Web Audio) ----------------
  function collega(ctx, dest) {
    M.ctx = ctx; M.S = nuovoStato(((Math.random() * 1e9) | 0) + 1); M.lav = apriCucina();
    M.lp = ctx.createBiquadFilter(); M.lp.type = 'lowpass'; M.lp.frequency.value = 2400; M.lp.Q.value = .6; M.lp.connect(dest);
    for (const n of STRATI) { const g = ctx.createGain(); g.gain.value = 0; g.connect(M.lp); M.lay[n] = { g, v: 0 }; }
    if (F.musica) ['tasti', 'vinile', 'cassa', 'rull_m', 'chh', 'basso', 'ohh', 'pad', 'cassa2', 'rull', 'stab', 'piatto', 'shk', 'voce', 'boom'].forEach(n => chiedi(n));
  }
  const BASE = ['tasti', 'vinile', 'cassa', 'rull_m', 'chh', 'basso'];
  // LO CHOKE (come una drum machine): una voce per gruppo (la cassa, il rullante, i charleston: il chiuso taglia l'aperto, il basso), al
  // più due per gli archi e quattro per l'accordo; la nuova sfuma la vecchia in pochi millisecondi. Le voci insieme scendono da ~28 a ~14
  const GRUPPO = { cassa: 'k', cassa2: 'k', rull: 's', rull_m: 's', chh: 'h', ohh: 'h', shk: 'x', basso: 'b', stab: 'st', pad: 'p', tasti: 't' }, TETTO = { p: 2, t: 4 };
  const CH = {};
  function strozza(gr, t, quanti) { const L = CH[gr] || (CH[gr] = []); while (L.length >= quanti) { const v = L.shift(); if (v.fine > t) { try { v.g.gain.cancelScheduledValues(t); v.g.gain.setTargetAtTime(0, t, gr === 't' || gr === 'p' ? .06 : .012); v.s.stop(t + .12); } catch (e) { } } } return L; }
  function voce(nome, t, o) {   // o: { rate, vol, dur, dest, off, det, libero }
    const b = M.buf[nome]; if (!b || !M.ctx) return null; const ctx = M.ctx;
    const s = ctx.createBufferSource(); s.buffer = b; if (o.rate && o.rate !== 1) s.playbackRate.value = o.rate; if (o.det && s.detune) s.detune.value = o.det;
    const g = ctx.createGain(); g.gain.value = o.vol; s.connect(g); g.connect(o.dest);
    const off = o.off || 0; s.start(t, off);
    if (o.dur) { g.gain.setValueAtTime(o.vol, t + o.dur); g.gain.setTargetAtTime(0, t + o.dur, .05); s.stop(t + o.dur + .35); }
    M.voci++; M.creati += 2; s.onended = () => { M.voci--; try { s.disconnect(); g.disconnect(); } catch (e) { } };
    const gr = !o.libero && o.dest !== DEST('fx') && o.dest !== DEST('mel') ? GRUPPO[nome] : null;
    if (gr) { const L = strozza(gr, t, TETTO[gr] || 1); L.push({ s, g, fine: t + (o.dur ? o.dur + .35 : b.duration / (o.rate || 1)) }); }
    return s;
  }
  const DEST = n => M.lay[n].g;
  function scratch(t, mosse) {   // «wikka»: avanti e indietro sulla voce, a rampe di playbackRate
    for (let i = 0; i < mosse; i++) { const t0 = t + i * .085, rev = i % 2 === 1, s = voce(rev ? 'voce_r' : 'voce', t0, { vol: .9, dest: DEST('fx'), off: rev ? .2 : .05, dur: .075 });
      if (s) { s.playbackRate.setValueAtTime(.25, t0); s.playbackRate.linearRampToValueAtTime(1.7, t0 + .035); s.playbackRate.linearRampToValueAtTime(.3, t0 + .075); } }
  }
  const L = {};
  // un sedicesimo: decide (battito, battuta) e programma le note
  function passo(tq, I) {
    const S = M.S; let ev = null;
    if (S.step % 4 === 0) ev = battito(S, I.T);   // l'azione che entra azzera il passo: la battuta nuova comincia qui
    if (S.step % 16 === 0) { const e2 = battuta(S, I.T, I.notte); ev = ev || e2; }
    const k = S.step % 16;
    const az = S.modo === 'azione', bpm = az ? K.bpmAzione : K.bpmPace, dur = 60 / bpm / 4, sw = (S.step % 2) ? dur * ((az ? K.swingAzione : K.swingPace) * 2 - 1) : 0;
    const R = S.rnd, hum = () => (R() - .5) * .008, t = tq + sw;
    strati(S, I.T, L);
    const G = GIRI[S.giro][S.prog % GIRI[S.giro].length], ch = G[(S.bar % 4 + 4) % 4], nx = G[((S.bar + 1) % 4 + 4) % 4];
    const pieno = M.voci < K.voci, vivo = I.attivo && F.musica;
    if (vivo) {
      // gli stinger del passaggio
      if (ev === 'entra') { M.tEntra = tq; voce('piatto', tq, { vol: 1, dest: DEST('fx') }); voce('stab', tq, { vol: .9, dest: DEST('fx'), rate: Math.pow(2, (ch[0] + 12 - 60) / 12) }); voce('boom', tq, { vol: .45, dest: DEST('fx') }); }
      if (ev === 'esce') { scratch(tq, 4); voce('piatto', tq, { vol: .6, dest: DEST('fx') }); }
      while (M.stq.length) { const q = M.stq.shift(); stinger(q, tq, ch); }
      // la batteria
      if (L.batt > .01) {
        const soloHat = !az && SEZ[S.sez].soloHat, soloRim = !az && SEZ[S.sez].soloRim, fill = az && S.bar % 4 === 3 && k >= 12;
        if (!soloHat && S.casse.indexOf(k) >= 0 && !(soloRim && k !== 0)) voce(az ? 'cassa2' : 'cassa', t + hum(), { vol: (k === 0 ? 1 : .8) * (az ? 1 : .85), dest: DEST('batt') });
        if (!soloHat && (k === 4 || k === 12)) voce(az ? 'rull' : (soloRim ? 'chh' : 'rull_m'), t + .012 + hum(), { vol: soloRim ? .5 : .9, dest: DEST('batt'), rate: soloRim ? .45 : 1 });
        if (fill && k > 12) voce('rull', t + hum(), { vol: .35 + .15 * (k - 12), dest: DEST('batt') });
        if (!az && !soloHat && !soloRim && (k === 7 || k === 15) && R() < .25) voce('rull_m', t + hum(), { vol: .18, dest: DEST('batt') });   // le note fantasma
        const hat = L.hat16 ? true : k % 2 === 0;
        if (hat && pieno && !(soloRim && k % 4)) { const open = az ? (k === 14 && S.bar % 2 === 1) : (k === 6 && R() < .2); voce(open ? 'ohh' : 'chh', t + hum(), { vol: (k % 4 === 0 ? .55 : k % 2 === 0 ? .42 : .26) * (.85 + R() * .3), dest: DEST('batt'), rate: az ? 1 : .9 }); }
        if (L.extra && pieno && k % 2 === 1) voce('shk', t + hum(), { vol: .3, dest: DEST('batt') });
      }
      // il basso
      if (L.basso > .01) { const P = BASSI[az ? 'azione' : 'pace'][az ? (S.bar >> 1) % 2 : S.bas % 2];
        for (const b of P) if (b[0] === k) { const n = b[1] < 0 ? nx[0] + (nx[0] > ch[0] ? -1 : 1) : ch[0] + b[1]; voce('basso', t + hum(), { vol: k === 0 ? 1 : .8, rate: Math.pow(2, (n - 36) / 12), dur: b[2] * dur * .95, dest: DEST('basso') }); } }
      // il piano: l'accordo sull'1 (e un'anticipazione sul «e» del 2 a battute alterne); in azione staccato
      if (L.tasti > .01 && pieno) {
        const quando = az ? (k === 6 || k === 14) : (k === 0 || (k === 6 && S.bar % 2 === 1 && SEZ[S.sez].len > 4));
        if (quando) { const d = az ? dur * 1.6 : (k === 0 ? dur * (S.bar % 2 === 1 ? 6 : 14) : dur * 8); ch[1].forEach((n, i) => voce('tasti', t + i * .006 + hum(), { vol: .5 + R() * .15, rate: Math.pow(2, (n - 60) / 12), dur: d, dest: DEST('tasti'), det: (R() - .5) * 14 })); }
      }
      // la melodia: un motivo dalla pentatonica, tenuto due battute e poi mutato
      if (L.mel > .01 && pieno) {
        if (k === 0) { if (!S.mot || S.bar - S.motBar >= 2) { const r = MOTIVI[(R() * MOTIVI.length) | 0]; S.mot = r.map(p => [p, SCALA[2 + ((R() * 7) | 0)]]); S.motBar = S.bar; } else if (R() < .5) { const j = (R() * S.mot.length) | 0; S.mot[j] = [S.mot[j][0], SCALA[2 + ((R() * 7) | 0)]]; } }
        for (const m of S.mot || []) if (m[0] === k) voce('tasti', t + hum(), { vol: .6, rate: Math.pow(2, (m[1] + 12 - 60) / 12), dur: dur * 2.5, dest: DEST('mel'), det: (R() - .5) * 10 });
      }
      // gli archi: fondamentale e quinta, tutta la battuta
      if (L.pad > .01 && k === 0) [ch[0] + 12, ch[0] + 19].forEach(n => voce('pad', t, { vol: .7, rate: Math.pow(2, (n - 48) / 12), dur: dur * 16 * 1.02, dest: DEST('pad'), det: (R() - .5) * 8 }));
      // lo stab dell'azione: l'1 delle battute pari, a volte il «e» del 3
      if (az && L.stab > .5 && ((k === 0 && S.bar % 2 === 0) || (k === 10 && R() < .3))) voce('stab', t, { vol: .6, rate: Math.pow(2, (ch[0] + 12 - 60) / 12), dest: DEST('stab') });
      // lo scratch a fine frase, con la tensione al massimo
      if (az && L.extra && S.bar % 4 === 3 && k === 8 && R() < .6) scratch(t, 4);
    } else M.stq.length = 0;
    S.next += dur; S.step++;
    return ev;
  }
  function stinger(q, t, ch) {
    if (q === 'grosso') { voce('stab', t, { vol: 1, dest: DEST('fx'), rate: Math.pow(2, (ch[0] + 12 - 60) / 12) }); voce('piatto', t, { vol: .8, dest: DEST('fx') }); voce('boom', t, { vol: .6, dest: DEST('fx') }); }
    else if (q === 'inseguimento') { scratch(t, 6); voce('piatto', t, { vol: .7, dest: DEST('fx') }); }
    else if (q === 'fine') { voce('stab', t, { vol: .9, dest: DEST('fx'), rate: Math.pow(2, (ch[0] - 60) / 12) * .5 }); voce('boom', t, { vol: .8, dest: DEST('fx') }); M.S.modo = 'pace'; M.S.sez = 'silenzio'; M.S.sezBar = 0; M.S.giri = 0; M.fine = M.ctx.currentTime; }
  }
  // i livelli degli strati e il filtro: solo quando cambiano (niente automazioni nuove a ogni fotogramma)
  const Lt = {};
  function livelli(t, I) {
    const S = M.S; strati(S, I.T, Lt); const on = I.attivo && F.musica;
    for (const n of STRATI) { const v = on ? Lt[n] * K.volumi[n] : 0, l = M.lay[n]; if (Math.abs(v - l.v) > .002) { l.v = v; l.g.gain.setTargetAtTime(v, t, S.modo === 'azione' ? .08 : .6); } }
    let f = taglio(S, I.T, I.notte || 0) * (I.ovattato ? .35 : 1); if (M.fine && t - M.fine < 1.5) f = 250;
    if (Math.abs(f - (M.f || 0)) > M.f * .04 || !M.f) { M.f = f; M.lp.frequency.setTargetAtTime(f, t, .25); }
    // il vinile: una sorgente sola in giro, ferma quando lo strato tace
    const vv = on && Lt.vinile > .01 && M.buf.vinile;
    if (vv && !M.vin) { const s = M.ctx.createBufferSource(); s.buffer = M.buf.vinile; s.loop = true; s.connect(DEST('vinile')); s.start(t); M.vin = s; M.voci++; M.creati++; }
    else if (!vv && M.vin) { try { M.vin.stop(t + .8); } catch (e) { } M.vin = null; M.voci--; }
  }
  // ogni fotogramma (audio.js): I = { T: la tensione, notte: 0..1, attivo: la musica si sente (non la radio, non spenta), ovattato }
  function tick(t, I) {
    if (!M.ctx) return; lavora(K.lavoro);
    if (M.buf.voce && !M.buf.voce_r) { const d = M.buf.voce.getChannelData(0), r = new Float32Array(d.length); for (let i = 0; i < d.length; i++) r[i] = d[d.length - 1 - i]; M.buf.voce_r = aBuffer(M.ctx, r); }
    if (!M.pronto) { M.pronto = F.musica && BASE.every(n => M.buf[n]); if (!M.pronto) return; M.S.next = t + .1; }
    const S = M.S; M.T = I.T;
    if (S.next < t) S.next = t + .05;   // un buco (la pagina ferma, uno scatto lungo): si riparte da adesso, senza raffiche
    let n = 0; while (S.next < t + K.anticipo && n++ < 64) passo(S.next, I);
    livelli(t, I);
  }
  // un momento grosso: suona sul sedicesimo dopo (uno ogni 3 s al più)
  function momento(q) { if (!M.ctx || !M.pronto || !F.musica) return false; const t = M.ctx.currentTime; if (q !== 'fine' && t - (M.ultimoSt || -9) < 3) return false; M.ultimoSt = t; if (M.stq.indexOf(q) < 0) M.stq.push(q); return true; }
  const stato = () => M.S ? { modo: M.S.modo, sezione: M.S.modo === 'azione' ? 'azione' : M.S.sez, giro: M.S.giro, battuta: M.S.bar, voci: M.voci, nodiCreati: M.creati, campioni: Object.keys(M.buf).length, inCoda: M.coda.length + (M.job ? 1 : 0) + (M.lav ? M.lav.attesa.size : 0), cucina: M.lav ? 'lavoratore' : 'qui', msCottura: +M.msCotti.toFixed(1), filtro: Math.round(M.f || 0), pronta: M.pronto } : null;
  return { K, F, SR, RIC, BQ, seme, testoCucina, ric, chiedi, cuociOra, lavora, collega, tick, momento, voce, stato, buf: M.buf, get M() { return M; },
    // per le prove: la scelta pura
    nuovoStato, battito, battuta, strati, taglio, GIRI, SEZ };
})();
if (typeof module !== 'undefined') module.exports = Musica;
