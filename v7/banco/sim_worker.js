/* Porto Vecchio — banco/sim_worker.js
   BANCO DI PROVA (Fase 0 del piano "NPC vivi senza IA, espansione"). Non è il gioco: è un carico SINTETICO con la forma del
   carico che la simulazione sociale avrà, per sapere PRIMA di scriverla se ci sta in un telefono di fascia media e in un Iris Xe.
   Tutto lo stato è in array tipizzati (SoA) preallocati e registrati (REG): il salvataggio è la loro concatenazione.
   Nel ciclo caldo (tick) niente allocazioni: niente oggetti, chiusure, Array.map, stringhe.

   Cosa simula (vedi RISULTATI.md per i numeri):
   - 4 livelli di dettaglio scelti ogni secondo per distanza dal giocatore (che cammina da solo):
       0 vicini (pensano a hzNear, scelta d'utilità su 20 azioni ogni decideSec, umore PAD ogni 500 ms, incontri, testimoni)
       1 visibili lontani (pensano a hzFar, seguono la routine, umore, incontri)
       2 fuori schermo nel quartiere (solo eventi d'orario nello heap, posizione analitica, incontri all'arrivo)
       3 resto della città (nessun evento proprio: un evento all'ora per quartiere fa "progredire le storie"; alla promozione
         la routine si valuta all'ora corrente e i bisogni/umore si recuperano in forma chiusa)
   - coda di eventi a priorità (heap binario sul tempo dovuto) con jitter gaussiano e cancellazione pigra per generazione;
   - registro dei fatti a sola aggiunta (anello) con indici per attore e per tipo (liste concatenate), catena causale col peso
     di Vita.fatto (×0,6 per salto, stop sotto 0,15), dimenticanza a fette: i fatti vecchi diventano contatori
     (attore, tipo, giorno), quelli citati da una storia setacciata vanno nell'archivio;
   - credenze per NPC (tetto beliefCap) con fonte, tipo di prova, forza che cala; impressioni WAWLT 3+/3- per relazione
     diretta (tetto relCap relazioni per NPC); pettegolezzo Daley-Kendall (ignaro/diffusore/soffocatore) con mutazione e
     orecchie indiscrete; testimoni (Gossamer: witness);
   - umore ALMA-like (PAD) ogni 500 ms per i vicini; status mosso dalle interazioni;
   - setaccio incrementale fittizio: ~30 schemi a stadi (2-4) con legami, finestra e "a meno che", parziali ≤ pmCap con
     deduplica per impronta;
   - istantanea al filo principale (snapHz) con buffer trasferiti a ping-pong: solo i livelli 0-1;
   - strumenti: istogramma del tick (p50/p95/p99/max), ritardo del tick, tempi per fase, memoria di tutti i buffer.
   Lo stesso file: (a) script classico nella pagina (creaSim per la modalità ?sim=main), (b) Worker del browser,
   (c) worker_threads di Node (banco_node.js). */
(function (G) {
  'use strict';

  // ------------------------------------------------------------------ costanti
  const NEEDS = 6, TRAITS = 5, NA = 20, NT = 40, RT = 8, RE = 8, KINDS = 8, DISTR = 9, WORLD = 600, DSIZE = 200;
  const NONE = 0xFFFF;
  const EV_ROUTINE = 1, EV_ARRIVO = 2, EV_PROMESSA = 3, EV_STORIA = 4;
  const PRED_STORIA = 0, PRED_DOVE = 1, PRED_DEBITO = 2;
  const PROVA_OSS = 1, PROVA_DETTO = 2, PROVA_ORECCHIO = 3, PROVA_MUTATA = 4, PROVA_RIFLESSO = 5;
  const DK_DIFF = 1, DK_SOFF = 2;
  // tipi di fatto (stessi nomi dei fatti di vita.js dove ci sono)
  const TIPI = ['incontro', 'chiacchiera', 'gag', 'figuraccia', 'lite', 'rissa', 'regalo', 'prestito', 'saldato', 'promessa',
    'parola_mantenuta', 'parola_rotta', 'voce', 'furto', 'denuncia', 'corteggia', 'gelosia', 'bevuta', 'lavoro', 'licenziato',
    'assunto', 'festa', 'debito', 'amore', 'rottura', 'scusa_vera', 'rancore', 'favore', 'favore_negato', 'arrivo',
    'messa', 'pesca', 'spesa', 'scommessa', 'vinto', 'perso', 'visto', 'muso', 'pace', 'storia'];
  const T = {}; for (let i = 0; i < TIPI.length; i++) T[TIPI[i]] = i;
  // valenza (per le impressioni) e stimolo emotivo PAD dei tipi
  const VAL = new Int8Array(NT), EMO = new Float32Array(NT * 3);
  (function () {
    const v = { chiacchiera: 10, gag: 30, figuraccia: -25, lite: -60, rissa: -100, regalo: 70, prestito: 40, saldato: 30, promessa: 15,
      parola_mantenuta: 50, parola_rotta: -70, voce: 0, furto: -110, denuncia: -40, corteggia: 30, gelosia: -50, bevuta: 15, festa: 40,
      debito: -20, amore: 90, rottura: -80, scusa_vera: 30, rancore: -40, favore: 50, favore_negato: -30, scommessa: 10, vinto: 20,
      perso: -15, muso: -30, pace: 40, licenziato: -30, assunto: 20 };
    for (const k in v) VAL[T[k]] = v[k];
    for (let t = 0; t < NT; t++) { const s = VAL[t] / 110; EMO[t * 3] = s; EMO[t * 3 + 1] = Math.abs(s) * .8 + .1; EMO[t * 3 + 2] = s * .5; }
  })();
  // azioni (scelta d'utilità). kind: 0 casa,1 lavoro,2 bar,3 negozio,4 piazza,5 chiesa,6 mercato,7 porto; 100 la sua casa,
  // 101 il suo lavoro, 102 il suo bar, 255 resta dov'è. need: 0 fame,1 stanchezza,2 socialità,3 svago,4 soldi,5 stima
  const AZ = [['dormire', 100, 1, 360], ['lavorare', 101, 4, 240], ['mangiare', 100, 0, 40], ['bere al bar', 102, 2, 60],
    ['chiacchierare', 4, 2, 30], ['passeggiare', 7, 3, 30], ['fare la spesa', 6, 0, 30], ['messa', 5, 5, 60], ['guardare il mare', 7, 3, 40],
    ['giocare a carte', 102, 3, 90], ['fare un favore', 255, 5, 20], ['corteggiare', 4, 2, 30], ['spettegolare', 4, 2, 30],
    ['riposare in piazza', 4, 1, 30], ['cercare lavoro', 3, 4, 60], ['pescare', 7, 0, 90], ['scherzo', 102, 3, 15], ['tornare a casa', 100, 1, 20],
    ['comprare il giornale', 3, 3, 10], ['litigare per strada', 255, 5, 10]];
  const N_INTER = 10;   // tipi d'interazione all'incontro

  // ------------------------------------------------------------------ il simulatore
  function creaSim(cfg) {
    cfg = cfg || {};
    const num = (k, d) => (cfg[k] != null && cfg[k] !== '' && isFinite(+cfg[k])) ? +cfg[k] : d;
    const N = Math.max(16, Math.min(8000, num('n', 1000) | 0));
    let C0 = Math.min(N, num('near', 50) | 0), C1 = Math.min(N - C0, num('far', 150) | 0);
    let C2 = Math.min(N - C0 - C1, num('district', Math.round(N * .3)) | 0);
    const HZ = num('hz', 5), HZ_NEAR = num('hzNear', 4), HZ_FAR = num('hzFar', 1 / 3), MOOD_S = num('moodMs', 500) / 1000;
    const DECIDE_S = num('decideSec', 2), SCALA = num('scala', 60), SNAP_HZ = num('snapHz', 4), SEED = num('seed', 1) >>> 0;
    const K = Math.max(4, num('beliefCap', 32) | 0), RC = Math.max(4, num('relCap', 24) | 0);
    let LC = 1; const lcWant = Math.max(1024, num('logCap', 16384) | 0); while (LC < lcWant) LC <<= 1; const LM = LC - 1;
    const PM = Math.max(16, Math.min(30000, num('pmCap', 500) | 0)), NP = Math.max(1, Math.min(64, num('patterns', 30) | 0));
    const RAW_DAYS = num('rawDays', 2), EVMAX = num('evMax', 600) | 0, SPEED = 3;   // m/s reali
    const SNAPMAX = 1024, SNAPF = 8, SNAPH = 8;

    // registro dei buffer (lo stato salvato = tutti questi, in ordine)
    const REG = [];
    function A(nome, cat, Tipo, len) { const a = new Tipo(len); REG.push({ nome, cat, a }); return a; }

    // scalari dello stato (sincronizzati prima del salvataggio e dopo il caricamento)
    const SC = A('scalari', 'scalari', Float64Array, 32);

    // --- mondo: luoghi
    const PLMAX = 256;
    const plX = A('plX', 'mondo', Float32Array, PLMAX), plZ = A('plZ', 'mondo', Float32Array, PLMAX), plKind = A('plKind', 'mondo', Uint8Array, PLMAX);
    const plDist = A('plDist', 'mondo', Uint8Array, PLMAX), plHead = A('plHead', 'mondo', Int32Array, PLMAX), plCount = A('plCount', 'mondo', Uint16Array, PLMAX);
    const nearPl = A('nearPl', 'mondo', Int16Array, DISTR * KINDS * 4);
    // --- azioni e routine (tabelle)
    const aKind = A('aKind', 'tabelle', Uint8Array, NA), aDur = A('aDur', 'tabelle', Float32Array, NA), aBase = A('aBase', 'tabelle', Float32Array, NA);
    const aNeed = A('aNeed', 'tabelle', Float32Array, NA * NEEDS), aSat = A('aSat', 'tabelle', Float32Array, NA * NEEDS);
    const aTrait = A('aTrait', 'tabelle', Float32Array, NA * TRAITS), aMood = A('aMood', 'tabelle', Float32Array, NA * 3), aTod = A('aTod', 'tabelle', Float32Array, NA * 24);
    const rtHour = A('rtHour', 'tabelle', Float32Array, RT * RE), rtAct = A('rtAct', 'tabelle', Uint8Array, RT * RE);
    const nRate = A('nRate', 'tabelle', Float32Array, NEEDS);
    // --- NPC (SoA)
    const x = A('x', 'npc', Float32Array, N), z = A('z', 'npc', Float32Array, N), vx = A('vx', 'npc', Float32Array, N), vz = A('vz', 'npc', Float32Array, N);
    const sx = A('sx', 'npc', Float32Array, N), sz = A('sz', 'npc', Float32Array, N), dx = A('dx', 'npc', Float32Array, N), dz = A('dz', 'npc', Float32Array, N);
    const t0 = A('t0', 'npc', Float64Array, N), dur = A('dur', 'npc', Float32Array, N), moving = A('moving', 'npc', Uint8Array, N);
    const dest = A('dest', 'npc', Int16Array, N), at = A('at', 'npc', Int16Array, N), oNext = A('oNext', 'npc', Int32Array, N), oPrev = A('oPrev', 'npc', Int32Array, N);
    const tier = A('tier', 'npc', Uint8Array, N), home = A('home', 'npc', Uint16Array, N), work = A('work', 'npc', Uint16Array, N), bar = A('bar', 'npc', Uint16Array, N);
    const dist = A('dist', 'npc', Uint8Array, N), rout = A('rout', 'npc', Uint8Array, N), entry = A('entry', 'npc', Uint8Array, N);
    const act = A('act', 'npc', Uint8Array, N), routAct = A('routAct', 'npc', Uint8Array, N), actEnd = A('actEnd', 'npc', Float64Array, N);
    const genR = A('genR', 'npc', Uint32Array, N), genA = A('genA', 'npc', Uint32Array, N);
    const nextThink = A('nextThink', 'npc', Float64Array, N), lastThink = A('lastThink', 'npc', Float64Array, N), nextMood = A('nextMood', 'npc', Float64Array, N);
    const nextDecide = A('nextDecide', 'npc', Float64Array, N), lastUpd = A('lastUpd', 'npc', Float64Array, N), lastTalk = A('lastTalk', 'npc', Float64Array, N);
    const needs = A('needs', 'mente', Float32Array, N * NEEDS), trait = A('trait', 'mente', Float32Array, N * TRAITS), memoria = A('memoria', 'mente', Float32Array, N);
    const pad = A('pad', 'mente', Float32Array, N * 3), padBase = A('padBase', 'mente', Float32Array, N * 3), emo = A('emo', 'mente', Float32Array, N * 3), emoI = A('emoI', 'mente', Float32Array, N);
    const status = A('status', 'mente', Float32Array, N), habit = A('habit', 'mente', Float32Array, N * NA);
    // --- quartieri
    const distStart = A('distStart', 'npc', Int32Array, DISTR + 1), distItems = A('distItems', 'npc', Int32Array, N), cnt3 = A('cnt3', 'npc', Int32Array, DISTR);
    // --- heap degli eventi
    const HC = N * 4 + 2048;
    const hT = A('heapT', 'heap', Float64Array, HC), hI = A('heapI', 'heap', Int32Array, HC), hK = A('heapK', 'heap', Uint8Array, HC), hG = A('heapG', 'heap', Uint32Array, HC);
    // --- registro dei fatti (anello di LC)
    const fT = A('fT', 'fatti', Float64Array, LC), fTipo = A('fTipo', 'fatti', Uint8Array, LC), fA = A('fA', 'fatti', Uint16Array, LC), fB = A('fB', 'fatti', Uint16Array, LC);
    const fL = A('fL', 'fatti', Int16Array, LC), fArg = A('fArg', 'fatti', Int16Array, LC), fCausa = A('fCausa', 'fatti', Int32Array, LC);
    const fPeso = A('fPeso', 'fatti', Float32Array, LC), fHop = A('fHop', 'fatti', Uint8Array, LC), fFlag = A('fFlag', 'fatti', Uint8Array, LC);
    const fPrevA = A('fPrevA', 'fatti', Int32Array, LC), fPrevB = A('fPrevB', 'fatti', Int32Array, LC), fPrevT = A('fPrevT', 'fatti', Int32Array, LC);
    const actHead = A('actHead', 'fatti', Int32Array, N), typHead = A('typHead', 'fatti', Int32Array, NT);
    // contatori dei fatti dimenticati: (attore, tipo, giorno) → quante volte
    const CC = 16384, cKey = A('cKey', 'fatti', Uint32Array, CC), cCnt = A('cCnt', 'fatti', Uint16Array, CC);
    // archivio dei fatti fissati (citati da una storia)
    const ARC = 4096, arcId = A('arcId', 'fatti', Int32Array, ARC), arcT = A('arcT', 'fatti', Float64Array, ARC), arcTipo = A('arcTipo', 'fatti', Uint8Array, ARC);
    const arcA = A('arcA', 'fatti', Uint16Array, ARC), arcB = A('arcB', 'fatti', Uint16Array, ARC), arcArg = A('arcArg', 'fatti', Int16Array, ARC);
    // --- credenze (K slot per NPC)
    const bSubj = A('bSubj', 'credenze', Int32Array, N * K), bPred = A('bPred', 'credenze', Uint8Array, N * K), bVal = A('bVal', 'credenze', Int32Array, N * K);
    const bSrc = A('bSrc', 'credenze', Uint16Array, N * K), bStr = A('bStr', 'credenze', Float32Array, N * K), bT = A('bT', 'credenze', Float64Array, N * K);
    const bProva = A('bProva', 'credenze', Uint8Array, N * K), bDK = A('bDK', 'credenze', Uint8Array, N * K);
    // --- impressioni WAWLT (RC relazioni dirette per NPC, 3+ e 3- ciascuna con il fatto che l'ha causata)
    const rDst = A('rDst', 'impressioni', Uint16Array, N * RC), rCharge = A('rCharge', 'impressioni', Float32Array, N * RC), rT = A('rT', 'impressioni', Float64Array, N * RC);
    const rIV = A('rIV', 'impressioni', Int8Array, N * RC * 6), rIF = A('rIF', 'impressioni', Int32Array, N * RC * 6);
    // --- setaccio: schemi e parziali
    const patT = A('patT', 'setaccio', Uint8Array, NP * 4), patBind = A('patBind', 'setaccio', Uint8Array, NP * 4), patLen = A('patLen', 'setaccio', Uint8Array, NP);
    const patWin = A('patWin', 'setaccio', Float32Array, NP), patUnless = A('patUnless', 'setaccio', Uint8Array, NP);
    const startOff = A('startOff', 'setaccio', Uint16Array, NT + 1), startPat = A('startPat', 'setaccio', Uint8Array, NP);
    const pmP = A('pmP', 'setaccio', Uint8Array, PM), pmS = A('pmS', 'setaccio', Uint8Array, PM), pmX = A('pmX', 'setaccio', Uint16Array, PM), pmY = A('pmY', 'setaccio', Uint16Array, PM);
    const pmT = A('pmT', 'setaccio', Float64Array, PM), pmF = A('pmF', 'setaccio', Int32Array, PM * 4), pmLive = A('pmLive', 'setaccio', Uint8Array, PM);
    const pmNW = A('pmNW', 'setaccio', Int32Array, PM), pmPW = A('pmPW', 'setaccio', Int32Array, PM), pmWT = A('pmWT', 'setaccio', Uint8Array, PM);
    const pmNU = A('pmNU', 'setaccio', Int32Array, PM), pmPU = A('pmPU', 'setaccio', Int32Array, PM), pmFree = A('pmFree', 'setaccio', Int32Array, PM);
    const waitHead = A('waitHead', 'setaccio', Int32Array, NT), unlessHead = A('unlessHead', 'setaccio', Int32Array, NT);
    let DD = 64; while (DD < PM * 4) DD <<= 1; const DM = DD - 1;
    const ddKey = A('ddKey', 'setaccio', Int32Array, DD), ddVal = A('ddVal', 'setaccio', Int32Array, DD);   // ddVal: -1 vuoto, -2 lapide
    const SCAP = 256, stP = A('stP', 'setaccio', Uint8Array, SCAP), stX = A('stX', 'setaccio', Uint16Array, SCAP), stY = A('stY', 'setaccio', Uint16Array, SCAP);
    const stT = A('stT', 'setaccio', Float64Array, SCAP), stF = A('stF', 'setaccio', Int32Array, SCAP * 4);
    // --- lavoro (non è stato, ma lo si conta nella memoria e lo si salva lo stesso: è piccolo)
    const GC = 8192, GMASK = GC - 1, CELL = 4;
    const gHead = A('gHead', 'lavoro', Int32Array, GC), gNext = A('gNext', 'lavoro', Int32Array, N), gKey = A('gKey', 'lavoro', Int32Array, N);
    const t01 = A('t01', 'lavoro', Int32Array, N), dBin = A('dBin', 'lavoro', Uint8Array, N);
    const BINS = 256, bins = A('bins', 'lavoro', Int32Array, BINS), seen = A('seen', 'lavoro', Int32Array, BINS);
    const VIC = A('vic', 'lavoro', Int32Array, 64), WI = A('wInter', 'lavoro', Float32Array, N_INTER);
    // istogrammi (strumenti: non salvati)
    const HB = 2500, HW = 0.02;   // 0,02 ms per secchio, fino a 50 ms
    const hist = new Uint32Array(HB + 1), late = new Uint32Array(HB + 1);
    const FASI = ['livelli', 'griglia', 'eventi', 'vicini', 'lontani', 'spazzini', 'istantanea'];
    const fase = new Float64Array(FASI.length);

    // ------------------------------------------------------------ stato scalare (variabili locali, veloci)
    let hn = 0, nextF = 0, tailF = 0, n01 = 0, nextRetier = 0, nextSnap = 0;
    let pmFreeN = 0, ddTomb = 0, stN = 0, arcN = 0, sweepI = 0, pmSweep = 0;
    const G0 = 6 * 3600;   // il primo giorno comincia alle 6
    let popI = 0, popK = 0, popG = 0;
    const DT = new Float64Array(2);   // i dt passati alle funzioni del pensiero (un double come argomento si inscatola)
    const TM = new Float64Array(8); TM[3] = TM[4] = WORLD / 2;   // rt (s reali), now (s di gioco), giocatore: in un array, perché un double in una variabile di chiusura si inscatola a ogni scrittura
    const RS = new Int32Array(1); RS[0] = SEED || 1;   // lo stato del caso in un array: in una variabile di chiusura ogni scrittura fuori dai Smi alloca
    const ST = { tick: 0, eventi: 0, stantii: 0, heapPieno: 0, arretrati: 0, fatti: 0, fattiTagliati: 0, dimenticati: 0, contatoriPersi: 0, archiviati: 0,
      forzati: 0, interazioni: 0, leggere: 0, storieCitta: 0, decisioni: 0, umori: 0, pensieriVicini: 0, pensieriLontani: 0, promozioni: 0, retrocessioni: 0,
      reidratati: 0, credenze: 0, credRivedute: 0, credSfrattate: 0, impressioni: 0, voci: 0, vociNuove: 0, soffocate: 0, mutazioni: 0, orecchie: 0,
      testimoni: 0, parziali: 0, parzialiRifiutati: 0, parzialiDoppi: 0, parzialiScaduti: 0, parzialiUccisi: 0, avanzati: 0, storie: 0,
      istantanee: 0, istantaneeSaltate: 0, promesse: 0, msMax: 0, lateMax: 0 };
    function syncOut() {
      SC[0] = TM[0]; SC[1] = TM[1]; SC[2] = RS[0]; SC[3] = hn; SC[4] = nextF; SC[5] = tailF; SC[6] = n01; SC[7] = nextRetier; SC[8] = nextSnap;
      SC[9] = TM[3]; SC[10] = TM[4]; SC[11] = TM[2]; SC[12] = pmFreeN; SC[13] = ddTomb; SC[14] = stN; SC[15] = arcN; SC[16] = sweepI; SC[17] = pmSweep;
      SC[18] = N; SC[19] = LC; SC[20] = K; SC[21] = RC; SC[22] = PM; SC[23] = C0; SC[24] = C1; SC[25] = C2;
    }
    function syncIn() {
      TM[0] = SC[0]; TM[1] = SC[1]; RS[0] = SC[2] | 0; hn = SC[3]; nextF = SC[4]; tailF = SC[5]; n01 = SC[6]; nextRetier = SC[7]; nextSnap = SC[8];
      TM[3] = SC[9]; TM[4] = SC[10]; TM[2] = SC[11]; pmFreeN = SC[12]; ddTomb = SC[13]; stN = SC[14]; arcN = SC[15]; sweepI = SC[16]; pmSweep = SC[17];
      C0 = SC[23]; C1 = SC[24]; C2 = SC[25];
    }

    // ------------------------------------------------------------ caso (mulberry32, stato nello SC)
    // rndI() rende un intero di 30 bit (un Smi: nessuna allocazione anche se la chiamata non viene incorporata); R30 lo porta in [0,1)
    function rndI() { const r = (RS[0] + 0x6D2B79F5) | 0; RS[0] = r; let t = r; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return (t ^ (t >>> 14)) >>> 2; }
    const R30 = 1 / 1073741824;
    function gauss() { let u = (rndI() * R30); if (u < 1e-9) u = 1e-9; return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283185307 * (rndI() * R30)); }
    const perf = (typeof performance !== 'undefined') ? () => performance.now() : () => Date.now();

    // ------------------------------------------------------------ heap
    function hpush(t, i, k, g) {
      if (hn >= HC) { ST.heapPieno++; return; }
      let j = hn++;
      while (j > 0) { const p = (j - 1) >> 1; if (hT[p] <= t) break; hT[j] = hT[p]; hI[j] = hI[p]; hK[j] = hK[p]; hG[j] = hG[p]; j = p; }
      hT[j] = t; hI[j] = i; hK[j] = k; hG[j] = g;
    }
    function hpop() {
      popI = hI[0]; popK = hK[0]; popG = hG[0];
      const n = --hn; if (n === 0) return;
      const t = hT[n], i = hI[n], k = hK[n], g = hG[n];
      let j = 0;
      for (;;) {
        let c = 2 * j + 1; if (c >= n) break;
        if (c + 1 < n && hT[c + 1] < hT[c]) c++;
        if (hT[c] >= t) break;
        hT[j] = hT[c]; hI[j] = hI[c]; hK[j] = hK[c]; hG[j] = hG[c]; j = c;
      }
      hT[j] = t; hI[j] = i; hK[j] = k; hG[j] = g;
    }

    // ------------------------------------------------------------ luoghi
    function entra(i, pl) {
      if (at[i] === pl) return; esce(i);
      at[i] = pl; oPrev[i] = -1; oNext[i] = plHead[pl]; if (plHead[pl] >= 0) oPrev[plHead[pl]] = i; plHead[pl] = i; plCount[pl]++;
    }
    function esce(i) {
      const pl = at[i]; if (pl < 0) return;
      if (oPrev[i] >= 0) oNext[oPrev[i]] = oNext[i]; else plHead[pl] = oNext[i];
      if (oNext[i] >= 0) oPrev[oNext[i]] = oPrev[i];
      oNext[i] = oPrev[i] = -1; at[i] = -1; plCount[pl]--;
    }
    function luogoTipo(d, k, i) { return nearPl[(d * KINDS + k) * 4 + (i & 3)]; }
    function luogoPerAz(i, a) {
      const k = aKind[a];
      if (k === 100) return home[i]; if (k === 101) return work[i]; if (k === 102) return bar[i];
      if (k === 255) return at[i] >= 0 ? at[i] : home[i];
      return luogoTipo(dist[i], k, i);
    }
    function posAnalitica(i) {
      if (!moving[i]) return;
      const d = dur[i]; let f = d > 0 ? (TM[1] - t0[i]) / d : 1; if (f > 1) f = 1; else if (f < 0) f = 0;
      x[i] = sx[i] + (dx[i] - sx[i]) * f; z[i] = sz[i] + (dz[i] - sz[i]) * f;
    }
    function parti(i, pl) {
      if (tier[i] >= 2) posAnalitica(i);
      esce(i);
      const tx = plX[pl] + ((rndI() * R30) - .5) * 5, tz = plZ[pl] + ((rndI() * R30) - .5) * 5;
      sx[i] = x[i]; sz[i] = z[i]; dx[i] = tx; dz[i] = tz; dest[i] = pl;
      const ddx = tx - x[i], ddz = tz - z[i], d = Math.sqrt(ddx * ddx + ddz * ddz);
      t0[i] = TM[1]; dur[i] = d / SPEED * SCALA; moving[i] = 1;
      if (d > 1e-3) { vx[i] = ddx / d * SPEED; vz[i] = ddz / d * SPEED; } else { vx[i] = vz[i] = 0; }
      if (tier[i] >= 2) { genA[i]++; hpush(TM[1] + dur[i], i, EV_ARRIVO, genA[i]); }
    }
    function arriva(i) {
      moving[i] = 0; vx[i] = vz[i] = 0; x[i] = dx[i]; z[i] = dz[i]; entra(i, dest[i]);
    }

    // ------------------------------------------------------------ registro dei fatti
    function fatto(tipo, a, b, luogo, arg, causa) {
      let peso = 1, hop = 0;
      if (causa >= 0) {
        if (causa >= tailF && causa < nextF) { const cs = causa & LM; peso = fPeso[cs] * .6; hop = fHop[cs] + 1; if (peso < .15) { ST.fattiTagliati++; return -1; } }
        else causa = -1;
      }
      if (nextF - tailF >= LC) { dimentica(); ST.forzati++; }
      const id = nextF++, s = id & LM;
      fT[s] = TM[1]; fTipo[s] = tipo; fA[s] = a; fB[s] = b; fL[s] = luogo; fArg[s] = arg; fCausa[s] = causa; fPeso[s] = peso; fHop[s] = hop > 255 ? 255 : hop; fFlag[s] = 0;
      fPrevA[s] = actHead[a]; actHead[a] = id;
      if (b !== NONE && b !== a) { fPrevB[s] = actHead[b]; actHead[b] = id; } else fPrevB[s] = -1;
      fPrevT[s] = typHead[tipo]; typHead[tipo] = id;
      ST.fatti++;
      setaccia(id);
      return id;
    }
    // l'ultimo fatto fra a e b (per la causa), cercando al più max fatti di a
    function ultimoTra(a, b, max) {
      let id = actHead[a], k = 0;
      while (id >= tailF && k++ < max) {
        const s = id & LM;
        if ((fA[s] === a && fB[s] === b) || (fA[s] === b && fB[s] === a)) return id;
        id = fA[s] === a ? fPrevA[s] : fPrevB[s];
      }
      return -1;
    }
    // quante volte di recente (per tipo, dall'indice per tipo)
    function quantiTipo(tipo, finestra, max) {
      let id = typHead[tipo], k = 0, n = 0; const lim = TM[1] - finestra;
      while (id >= tailF && k++ < max) { const s = id & LM; if (fT[s] < lim) break; n++; id = fPrevT[s]; }
      return n;
    }
    // dimentica il fatto più vecchio: contatore (attore, tipo, giorno), o archivio se fissato
    function dimentica() {
      const s = tailF & LM;
      if (fFlag[s] & 1) {
        const k = arcN++ & (ARC - 1); arcId[k] = tailF; arcT[k] = fT[s]; arcTipo[k] = fTipo[s]; arcA[k] = fA[s]; arcB[k] = fB[s]; arcArg[k] = fArg[s]; ST.archiviati++;
      } else {
        const day = (fT[s] / 86400) | 0, key = ((fA[s] * 64 + fTipo[s]) * 4096 + (day & 4095)) + 1;
        let h = Math.imul(key, 0x9E3779B1) >>> 18, ok = false, oldest = -1, oldDay = 1e9;
        for (let p = 0; p < 24; p++) {
          const j = (h + p) & (CC - 1), kk = cKey[j];
          if (kk === key) { if (cCnt[j] < 65535) cCnt[j]++; ok = true; break; }
          if (kk === 0) { cKey[j] = key; cCnt[j] = 1; ok = true; break; }
          const dd = ((kk - 1) & 4095); if (dd < oldDay) { oldDay = dd; oldest = j; }
        }
        if (!ok) { cKey[oldest] = key; cCnt[oldest] = 1; ST.contatoriPersi++; }
      }
      tailF++; ST.dimenticati++;
    }

    // ------------------------------------------------------------ credenze
    function forzaEff(j) { const s = bStr[j] - (TM[1] - bT[j]) * (0.03 / 3600); return s > 0 ? s : 0; }   // −0,03 per ora di gioco
    function trovaCred(i, subj, pred) { const b = i * K; for (let k = 0; k < K; k++) { const j = b + k; if (bStr[j] > 0 && bSubj[j] === subj && bPred[j] === pred) return j; } return -1; }
    function credi(i, subj, pred, val, src, str, prova, dk) {
      const b = i * K; let free = -1, minJ = b, minS = 1e9;
      for (let k = 0; k < K; k++) {
        const j = b + k;
        if (bStr[j] <= 0) { if (free < 0) free = j; continue; }
        if (bSubj[j] === subj && bPred[j] === pred) {
          const e = forzaEff(j);
          if (bVal[j] === val) { bStr[j] = e + str * .5 > 1 ? 1 : e + str * .5; bT[j] = TM[1]; }
          else if (str > e) { bVal[j] = val; bStr[j] = str; bT[j] = TM[1]; bSrc[j] = src; bProva[j] = prova; ST.credRivedute++; }
          return j;
        }
        const e = forzaEff(j); if (e < minS) { minS = e; minJ = j; }
      }
      let j = free; if (j < 0) { j = minJ; ST.credSfrattate++; }
      bSubj[j] = subj; bPred[j] = pred; bVal[j] = val; bSrc[j] = src; bStr[j] = str; bT[j] = TM[1]; bProva[j] = prova; bDK[j] = dk;
      ST.credenze++; return j;
    }
    function miglioreStoria(i) {
      const b = i * K; let best = -1, bs = .1;
      for (let k = 0; k < K; k++) { const j = b + k; if (bStr[j] > 0 && bPred[j] === PRED_STORIA && bDK[j] === DK_DIFF) { const e = forzaEff(j); if (e > bs) { bs = e; best = j; } } }
      return best;
    }

    // ------------------------------------------------------------ impressioni (WAWLT)
    function riga(i, j, crea) {
      const b = i * RC; let free = -1, minR = b, minC = 1e9;
      for (let k = 0; k < RC; k++) {
        const r = b + k, d = rDst[r];
        if (d === j) return r;
        if (d === NONE) { if (free < 0) free = r; continue; }
        const c = Math.abs(rCharge[r]) + (rT[r] - TM[1]) / 86400;   // debole e vecchia = sfrattabile
        if (c < minC) { minC = c; minR = r; }
      }
      if (!crea) return -1;
      const r = free >= 0 ? free : minR;
      rDst[r] = j; rCharge[r] = 0; rT[r] = TM[1]; const o = r * 6; for (let k = 0; k < 6; k++) { rIV[o + k] = 0; rIF[o + k] = -1; }
      return r;
    }
    function impressiona(i, j, v, fid) {
      if (i === j || v === 0) return;
      const r = riga(i, j, true), o = r * 6; ST.impressioni++;
      let mk = -1, mv = 999;
      if (v > 0) { for (let k = 0; k < 3; k++) if (rIV[o + k] < mv) { mv = rIV[o + k]; mk = k; } if (v > mv) { rIV[o + mk] = v > 127 ? 127 : v; rIF[o + mk] = fid; } }
      else { mv = -999; for (let k = 3; k < 6; k++) if (rIV[o + k] > mv) { mv = rIV[o + k]; mk = k; } if (v < mv) { rIV[o + mk] = v < -127 ? -127 : v; rIF[o + mk] = fid; } }
      let c = 0; for (let k = 0; k < 6; k++) c += rIV[o + k]; rCharge[r] = c; rT[r] = TM[1];
    }
    function affinita(i, j) { const r = riga(i, j, false); return r < 0 ? 0 : rCharge[r] / 381; }

    // ------------------------------------------------------------ umore ALMA-like (PAD)
    function emoziona(i, tipo, k) {
      const b = i * 3, t = tipo * 3, I = emoI[i], w = I / (I + k + 1e-6);
      emo[b] = emo[b] * w + EMO[t] * (1 - w); emo[b + 1] = emo[b + 1] * w + EMO[t + 1] * (1 - w); emo[b + 2] = emo[b + 2] * w + EMO[t + 2] * (1 - w);
      emoI[i] = I + k > 1 ? 1 : I + k;
    }
    function umore(i) {
      const dt = DT[1];
      const b = i * 3; let I = emoI[i] - dt / 6; if (I < 0) I = 0; emoI[i] = I;
      for (let k = 0; k < 3; k++) {
        const m = pad[b + k], c = emo[b + k], base = padBase[b + k];
        let v = m;
        if (I > .02) { if ((c - base) * (m - c) > 0) v += (m > c ? 1 : -1) * .05 * I * dt; else v += (c - m) * .3 * I * dt; }   // spinta oltre il centro, altrimenti tirata
        v += (base - v) * .02 * dt;
        pad[b + k] = v > 1 ? 1 : v < -1 ? -1 : v;
      }
      ST.umori++;
    }

    // ------------------------------------------------------------ setaccio incrementale
    function lega(p, st, X, Y, a, b) {
      const m = patBind[p * 4 + st];
      if (m === 0) return a === X; if (m === 1) return a === Y; if (m === 2) return b === X;
      return (a === X && b === Y) || (a === Y && b === X);
    }
    function ddH(p, X, Y) { return (Math.imul((p * 1009 + X) | 0, 65537) + Y * 31 + 7) | 0; }
    function ddFind(p, X, Y) {
      const k = ddH(p, X, Y); let h = Math.imul(k, 0x9E3779B1) >>> 0;
      for (let q = 0; q < DD; q++) { const j = (h + q) & DM, v = ddVal[j]; if (v === -1) return -1; if (v >= 0 && ddKey[j] === k && pmP[v] === p && pmX[v] === X && pmY[v] === Y) return v; }
      return -1;
    }
    function ddPut(p, X, Y, v) {
      const k = ddH(p, X, Y); let h = Math.imul(k, 0x9E3779B1) >>> 0;
      for (let q = 0; q < DD; q++) { const j = (h + q) & DM; if (ddVal[j] < 0) { if (ddVal[j] === -2) ddTomb--; ddKey[j] = k; ddVal[j] = v; return; } }
    }
    function ddDel(p, X, Y, v) {
      const k = ddH(p, X, Y); let h = Math.imul(k, 0x9E3779B1) >>> 0;
      for (let q = 0; q < DD; q++) { const j = (h + q) & DM; if (ddVal[j] === -1) return; if (ddVal[j] === v && ddKey[j] === k) { ddVal[j] = -2; ddTomb++; break; } }
      if (ddTomb > DD >> 2) ddRifai();
    }
    function ddRifai() { ddVal.fill(-1); ddTomb = 0; for (let v = 0; v < PM; v++) if (pmLive[v]) ddPut(pmP[v], pmX[v], pmY[v], v); }
    function wLink(v, t) { pmWT[v] = t; pmPW[v] = -1; pmNW[v] = waitHead[t]; if (waitHead[t] >= 0) pmPW[waitHead[t]] = v; waitHead[t] = v; }
    function wUnlink(v) { const t = pmWT[v]; if (pmPW[v] >= 0) pmNW[pmPW[v]] = pmNW[v]; else waitHead[t] = pmNW[v]; if (pmNW[v] >= 0) pmPW[pmNW[v]] = pmPW[v]; pmNW[v] = pmPW[v] = -1; }
    function uLink(v, t) { pmPU[v] = -1; pmNU[v] = unlessHead[t]; if (unlessHead[t] >= 0) pmPU[unlessHead[t]] = v; unlessHead[t] = v; }
    function uUnlink(v, t) { if (pmPU[v] >= 0) pmNU[pmPU[v]] = pmNU[v]; else unlessHead[t] = pmNU[v]; if (pmNU[v] >= 0) pmPU[pmNU[v]] = pmPU[v]; pmNU[v] = pmPU[v] = -1; }
    function pmLibera(v) {
      wUnlink(v); const u = patUnless[pmP[v]]; if (u !== 255) uUnlink(v, u);
      ddDel(pmP[v], pmX[v], pmY[v], v); pmLive[v] = 0; pmFree[pmFreeN++] = v;
    }
    function setaccia(id) {
      const s = id & LM, t = fTipo[s], a = fA[s], b = fB[s];
      // 1) "a meno che": uccide i parziali che aspettavano di non vedere questo tipo per X
      let v = unlessHead[t];
      while (v >= 0) { const nx = pmNU[v]; if (pmX[v] === a || pmX[v] === b) { pmLibera(v); ST.parzialiUccisi++; } v = nx; }
      // 2) avanza i parziali che aspettano questo tipo
      v = waitHead[t];
      while (v >= 0) {
        const nx = pmNW[v], p = pmP[v];
        if (TM[1] - pmT[v] > patWin[p]) { pmLibera(v); ST.parzialiScaduti++; v = nx; continue; }
        const stg = pmS[v];
        if (lega(p, stg, pmX[v], pmY[v], a, b)) {
          pmF[v * 4 + stg] = id; ST.avanzati++;
          if (stg + 1 >= patLen[p]) { storia(v); pmLibera(v); }
          else { pmS[v] = stg + 1; wUnlink(v); wLink(v, patT[p * 4 + stg + 1]); }
        }
        v = nx;
      }
      // 3) comincia gli schemi che partono con questo tipo
      for (let q = startOff[t]; q < startOff[t + 1]; q++) {
        const p = startPat[q];
        if (ddFind(p, a, b) >= 0) { ST.parzialiDoppi++; continue; }
        if (pmFreeN === 0) { ST.parzialiRifiutati++; continue; }
        const w = pmFree[--pmFreeN];
        pmP[w] = p; pmS[w] = 1; pmX[w] = a; pmY[w] = b; pmT[w] = TM[1]; pmF[w * 4] = id; pmF[w * 4 + 1] = pmF[w * 4 + 2] = pmF[w * 4 + 3] = -1; pmLive[w] = 1;
        wLink(w, patT[p * 4 + 1]); const u = patUnless[p]; if (u !== 255) uLink(w, u);
        ddPut(p, a, b, w); ST.parziali++;
      }
    }
    function storia(v) {
      const k = stN++ & (SCAP - 1), p = pmP[v]; stP[k] = p; stX[k] = pmX[v]; stY[k] = pmY[v]; stT[k] = TM[1];
      for (let q = 0; q < 4; q++) { const f = pmF[v * 4 + q]; stF[k * 4 + q] = f; if (f >= tailF && f < nextF) fFlag[f & LM] |= 1; }
      ST.storie++;
      // la storia diventa una voce: i due protagonisti la sanno (riflesso) e la raccontano
      const f0 = pmF[v * 4];
      credi(pmX[v], f0, PRED_STORIA, pmX[v], pmX[v], .9, PROVA_RIFLESSO, DK_DIFF);
      if (pmY[v] !== NONE) credi(pmY[v], f0, PRED_STORIA, pmX[v], pmX[v], .9, PROVA_RIFLESSO, DK_DIFF);
    }

    // ------------------------------------------------------------ griglia (livelli 0-1)
    function griglia() {
      gHead.fill(-1);
      for (let q = 0; q < n01; q++) {
        const i = t01[q], cx = Math.floor(x[i] / CELL), cz = Math.floor(z[i] / CELL), key = cx * 4096 + cz, h = Math.imul(key, 0x9E3779B1) >>> 19 & GMASK;
        gKey[i] = key; gNext[i] = gHead[h]; gHead[h] = i;
      }
    }
    function vicini(i, r, max) {
      const xi = x[i], zi = z[i], r2 = r * r; let n = 0;
      const cx0 = Math.floor((xi - r) / CELL), cx1 = Math.floor((xi + r) / CELL), cz0 = Math.floor((zi - r) / CELL), cz1 = Math.floor((zi + r) / CELL);
      for (let cx = cx0; cx <= cx1; cx++) for (let cz = cz0; cz <= cz1; cz++) {
        const key = cx * 4096 + cz; let j = gHead[Math.imul(key, 0x9E3779B1) >>> 19 & GMASK];
        while (j >= 0) {
          if (j !== i && gKey[j] === key) { const ex = x[j] - xi, ez = z[j] - zi; if (ex * ex + ez * ez <= r2) { VIC[n++] = j; if (n >= max) return n; } }
          j = gNext[j];
        }
      }
      return n;
    }

    // ------------------------------------------------------------ interazioni
    function interazione(a, b, piena) {
      ST.interazioni++; if (!piena) ST.leggere++;
      lastTalk[a] = lastTalk[b] = TM[0];
      const affA = affinita(a, b), Pa = pad[a * 3], Aa = pad[a * 3 + 1], Ea = trait[a * TRAITS + 2], Na = trait[a * TRAITS + 4];
      const story = miglioreStoria(a);
      WI[0] = 1; WI[1] = .3 + .6 * Ea + .3 * Pa; WI[2] = Math.max(0, -affA * 1.5 - Pa * .5 + Na * .4 + Aa * .3) + quantiTipo(T.lite, 3600, 16) * .02;   // aria di lite in città WI[3] = Math.max(0, affA * .6);
      WI[4] = .15 + needs[b * NEEDS + 4] * .3; WI[5] = .2; WI[6] = story >= 0 ? 1.2 : 0; WI[7] = .1 + Math.max(0, affA) * .4; WI[8] = .2; WI[9] = affA < -.2 ? .3 : 0;
      let tot = 0; for (let k = 0; k < N_INTER; k++) tot += WI[k];
      let r = (rndI() * R30) * tot, c = 0; while (c < N_INTER - 1 && r >= WI[c]) { r -= WI[c]; c++; }
      const luogo = at[a] >= 0 ? at[a] : -1, causa = ultimoTra(a, b, 12);
      let tipo = T.chiacchiera, arg = 0;
      switch (c) {
        case 1: { const ok = (rndI() * R30) < .5 + .3 * (status[a] - status[b]) + .2 * Ea; tipo = ok ? T.gag : T.figuraccia; break; }
        case 2: tipo = (rndI() * R30) < .12 ? T.rissa : T.lite; break;
        case 3: tipo = T.regalo; arg = ((rndI() * R30) * 50) | 0; break;
        case 4: tipo = T.prestito; arg = (5 + (rndI() * R30) * 95) | 0; break;
        case 5: tipo = T.promessa; break;
        case 6: tipo = T.voce; break;
        case 7: tipo = (rndI() * R30) < .8 ? T.corteggia : T.gelosia; break;
        case 8: tipo = (rndI() * R30) < .7 ? T.favore : T.favore_negato; break;
        case 9: tipo = T.scusa_vera; break;
      }
      let id = fatto(tipo, a, b, luogo, arg, causa);
      if (id < 0) id = fatto(tipo, a, b, luogo, arg, -1);
      const v = VAL[tipo];
      // impressioni (WAWLT): b di a sempre, a di b per i tipi reciproci
      impressiona(b, a, v, id);
      if (tipo === T.lite || tipo === T.rissa || tipo === T.chiacchiera || tipo === T.scusa_vera) impressiona(a, b, v, id);
      // status e emozioni
      if (tipo === T.gag) { status[a] += .02; status[b] -= .005; } else if (tipo === T.figuraccia) status[a] -= .02;
      else if (tipo === T.rissa || tipo === T.lite) { if ((rndI() * R30) < .5 + status[a] - status[b]) { status[a] += .01; status[b] -= .01; } else { status[a] -= .01; status[b] += .01; } }
      if (piena) { emoziona(a, tipo, .4); emoziona(b, tipo, .5); }
      needs[a * NEEDS + 2] *= .7; needs[b * NEEDS + 2] *= .7;
      // credenze d'osservazione (dove l'ho visto)
      if (luogo >= 0) { credi(a, b, PRED_DOVE, luogo, a, .6, PROVA_OSS, 0); credi(b, a, PRED_DOVE, luogo, b, .6, PROVA_OSS, 0); }
      if (tipo === T.prestito) credi(b, a, PRED_DEBITO, arg, a, 1, PROVA_OSS, 0);
      if (tipo === T.promessa || tipo === T.prestito) { hpush(TM[1] + (1 + (rndI() * R30) * 5) * 3600, id, EV_PROMESSA, 0); ST.promesse++; }
      if (tipo === T.voce && story >= 0) pettegola(a, b, story, piena);
      // testimoni (Gossamer): chi è vicino vede le cose che contano
      if (piena && (v > 25 || v < -25) && id >= 0) {
        const n = vicini(a, 8, 8);
        for (let q = 0; q < n && q < 6; q++) {
          const w = VIC[q]; if (w === b) continue;
          if ((rndI() * R30) < .5) { credi(w, id, PRED_STORIA, a, a, .8, PROVA_OSS, DK_DIFF); impressiona(w, a, v >> 1, id); ST.testimoni++; }
        }
      }
    }
    // Daley-Kendall: a (diffusore) racconta a b la storia nello slot js
    function pettegola(a, b, js, piena) {
      ST.voci++;
      const subj = bSubj[js], jb = trovaCred(b, subj, PRED_STORIA);
      if (jb >= 0) { bDK[js] = DK_SOFF; if (bDK[jb] === DK_DIFF) bDK[jb] = DK_SOFF; ST.soffocate++; return; }
      let val = bVal[js], prova = PROVA_DETTO;
      const str = forzaEff(js) * (.6 + .4 * Math.max(0, affinita(b, a))) * .9;
      if ((rndI() * R30) < .15 * (1 - memoria[b])) {   // mutazione: il colpevole diventa un altro che b conosce
        const r = (b * RC + (((rndI() * R30) * RC) | 0)); if (rDst[r] !== NONE) { val = rDst[r]; prova = PROVA_MUTATA; ST.mutazioni++; }
      }
      credi(b, subj, PRED_STORIA, val, a, str, prova, DK_DIFF); ST.vociNuove++;
      let v = -20; if (subj >= tailF && subj < nextF) v = VAL[fTipo[subj & LM]];
      if (val < N) impressiona(b, val, v >> 1, subj);
      if (piena) {
        const n = vicini(a, 4, 8);
        for (let q = 0; q < n; q++) { const w = VIC[q]; if (w !== b && (rndI() * R30) < .2) { credi(w, subj, PRED_STORIA, val, a, str * .5, PROVA_ORECCHIO, DK_DIFF); ST.orecchie++; } }
      }
    }

    // ------------------------------------------------------------ scelta d'utilità (vicini)
    function decidi(i) {
      ST.decisioni++;
      const hour = ((TM[1] / 3600) % 24) | 0, ni = i * NEEDS, ti = i * TRAITS, mi = i * 3, hi = i * NA;
      let b1 = 0, b2 = 0, b3 = 0, s1 = -1e9, s2 = -1e9, s3 = -1e9;
      for (let a = 0; a < NA; a++) {
        let u = aBase[a] + aTod[a * 24 + hour] + (a === routAct[i] ? .3 : 0);
        for (let k = 0; k < NEEDS; k++) { const nd = needs[ni + k]; u += aNeed[a * NEEDS + k] * nd * nd; }
        for (let k = 0; k < TRAITS; k++) u += aTrait[a * TRAITS + k] * trait[ti + k];
        for (let k = 0; k < 3; k++) u += aMood[a * 3 + k] * pad[mi + k];
        u -= habit[hi + a] * .4;
        if (aKind[a] !== 255) { const pl = luogoPerAz(i, a), ex = plX[pl] - x[i], ez = plZ[pl] - z[i]; u -= Math.sqrt(ex * ex + ez * ez) * .002; }
        if (u > s1) { s3 = s2; b3 = b2; s2 = s1; b2 = b1; s1 = u; b1 = a; } else if (u > s2) { s3 = s2; b3 = b2; s2 = u; b2 = a; } else if (u > s3) { s3 = u; b3 = a; }
      }
      // rumore pesato fra le prime tre
      const w1 = s1 - s3 + .05, w2 = s2 - s3 + .05, w3 = .05; let r = (rndI() * R30) * (w1 + w2 + w3);
      const pick = r < w1 ? b1 : r < w1 + w2 ? b2 : b3;
      act[i] = pick; habit[hi + pick] += 1;
      actEnd[i] = TM[1] + aDur[pick] * 60 * (.7 + .6 * (rndI() * R30));
      nextDecide[i] = TM[0] + DECIDE_S * (.8 + .4 * (rndI() * R30));
      const pl = luogoPerAz(i, pick); if (pl !== at[i] && !(moving[i] && dest[i] === pl)) parti(i, pl);
    }

    // ------------------------------------------------------------ pensiero (livelli 0 e 1)
    function bisogni(i) {
      const dtG = DT[0] * SCALA;
      const ni = i * NEEDS, a = act[i], ai = a * NEEDS, sat = !moving[i];
      for (let k = 0; k < NEEDS; k++) {
        let v = needs[ni + k] + nRate[k] * dtG / 3600; if (sat) v -= aSat[ai + k] * dtG / 3600;
        needs[ni + k] = v > 1 ? 1 : v < 0 ? 0 : v;
      }
    }
    function cammina(i) {
      const dt = DT[0];
      if (!moving[i]) return;
      const ex = dx[i] - x[i], ez = dz[i] - z[i], d = Math.sqrt(ex * ex + ez * ez), step = SPEED * dt;
      if (d <= step || d < .3) { arriva(i); return; }
      vx[i] = ex / d * SPEED; vz[i] = ez / d * SPEED; x[i] += vx[i] * dt; z[i] += vz[i] * dt;
    }
    function pensa(i, vicino) {
      const dt = TM[0] - lastThink[i]; lastThink[i] = TM[0]; DT[0] = dt;
      bisogni(i); lastUpd[i] = TM[1];
      cammina(i);
      const hi = i * NA, f = 1 - .01 * dt; for (let a = 0; a < NA; a++) habit[hi + a] *= f;
      status[i] *= .9999;
      if (vicino) {
        ST.pensieriVicini++;
        // separazione leggera e percezione
        const n = vicini(i, 3, 8); let sepx = 0, sepz = 0, chi = -1;
        for (let q = 0; q < n; q++) { const j = VIC[q], ex = x[i] - x[j], ez = z[i] - z[j], d2 = ex * ex + ez * ez + .01; if (d2 < 1) { sepx += ex / d2; sepz += ez / d2; } if (chi < 0 && TM[0] - lastTalk[j] > 20) chi = j; }
        if (!moving[i]) { x[i] += sepx * .05 * dt; z[i] += sepz * .05 * dt; }
        if (chi >= 0 && TM[0] - lastTalk[i] > 20 && (rndI() * R30) < .5) interazione(i, chi, true);
        if (TM[0] >= nextDecide[i] || TM[1] >= actEnd[i]) decidi(i);
        if (TM[0] >= nextMood[i]) { DT[1] = MOOD_S; umore(i); nextMood[i] = TM[0] + MOOD_S; }
        nextThink[i] = TM[0] + 1 / HZ_NEAR;
      } else {
        ST.pensieriLontani++;
        const n = vicini(i, 3, 4);
        if (n > 0 && TM[0] - lastTalk[i] > 20 && TM[0] - lastTalk[VIC[0]] > 20 && (rndI() * R30) < .3) interazione(i, VIC[0], true);
        DT[1] = dt; umore(i);
        nextThink[i] = TM[0] + (1 / HZ_FAR) * (.9 + .2 * (rndI() * R30));
      }
    }

    // ------------------------------------------------------------ routine ed eventi
    function entryOra(r, h) { let e = RE - 1; for (let k = 0; k < RE; k++) if (rtHour[r * RE + k] <= h) e = k; return e; }
    function prossimaRoutine(i) {
      const r = rout[i], e2 = (entry[i] + 1) % RE, day = Math.floor(TM[1] / 86400);
      let tn = day * 86400 + rtHour[r * RE + e2] * 3600; if (tn <= TM[1]) tn += 86400;
      tn += gauss() * 600; if (tn < TM[1] + 60) tn = TM[1] + 60;
      hpush(tn, i, EV_ROUTINE, genR[i]);
    }
    function evRoutine(i) {
      const e = (entry[i] + 1) % RE, k = rout[i] * RE + e; entry[i] = e; routAct[i] = rtAct[k];
      if (tier[i] !== 0) { act[i] = rtAct[k]; const pl = luogoPerAz(i, act[i]); if (pl !== at[i] && !(moving[i] && dest[i] === pl)) parti(i, pl); }
      prossimaRoutine(i);
    }
    function evArrivo(i) {
      arriva(i);
      if (tier[i] === 2 && plCount[at[i]] > 1 && TM[0] - lastTalk[i] > 20) {
        let j = plHead[at[i]], s = ((rndI() * R30) * 6) | 0; while (s-- > 0 && oNext[j] >= 0) j = oNext[j];
        if (j === i) j = oNext[j] >= 0 ? oNext[j] : plHead[at[i]];
        if (j !== i && j >= 0 && (rndI() * R30) < .35) interazione(i, j, false);
      }
    }
    function evPromessa(fid) {
      if (fid < tailF || fid >= nextF) return;   // dimenticata
      const s = fid & LM, a = fA[s], b = fB[s];
      if ((rndI() * R30) < .55 + .3 * trait[a * TRAITS + 1]) { const id = fatto(fTipo[s] === T.prestito ? T.saldato : T.parola_mantenuta, a, b, -1, fArg[s], fid); impressiona(b, a, 50, id); }
      else { const id = fatto(T.parola_rotta, a, b, -1, 0, fid); impressiona(b, a, -70, id); status[a] -= .01; }
    }
    const STORIE_CITTA = [T.lite, T.amore, T.debito, T.assunto, T.licenziato, T.festa, T.furto, T.rottura, T.pace, T.scommessa, T.bevuta, T.messa];
    function evStoria(d) {
      const n = distStart[d + 1] - distStart[d], k = Math.max(1, Math.round(cnt3[d] * .06));
      if (cnt3[d] > 0) for (let q = 0; q < k; q++) {
        let a = -1; for (let tr = 0; tr < 6; tr++) { const c = distItems[distStart[d] + (((rndI() * R30) * n) | 0)]; if (tier[c] === 3) { a = c; break; } }
        if (a < 0) continue;
        let b = rDst[a * RC + (((rndI() * R30) * RC) | 0)]; if (b === NONE || b >= N) b = distItems[distStart[d] + (((rndI() * R30) * n) | 0)];
        if (b === a) continue;
        const aff = affinita(a, b); let t = STORIE_CITTA[((rndI() * R30) * STORIE_CITTA.length) | 0];
        if (aff < -.3 && (rndI() * R30) < .5) t = T.lite; else if (aff > .3 && (rndI() * R30) < .3) t = T.amore;
        const id = fatto(t, a, b, home[a], 0, ultimoTra(a, b, 8)), v = VAL[t];
        impressiona(b, a, v, id); impressiona(a, b, v >> 1, id);
        status[a] += v * .0002;
        if (id >= 0 && (v > 25 || v < -25)) { credi(a, id, PRED_STORIA, a, a, .9, PROVA_RIFLESSO, DK_DIFF); credi(b, id, PRED_STORIA, a, a, .9, PROVA_RIFLESSO, DK_DIFF); }
        ST.storieCitta++;
      }
      hpush(TM[1] + 3600 + gauss() * 300, d, EV_STORIA, 0);
    }
    // alla promozione dal livello 3: la routine valutata all'ora di adesso, bisogni e umore recuperati in forma chiusa
    function reidrata(i) {
      ST.reidratati++;
      const h = (TM[1] / 3600) % 24, e = entryOra(rout[i], h); entry[i] = e; routAct[i] = act[i] = rtAct[rout[i] * RE + e];
      const pl = luogoPerAz(i, act[i]); moving[i] = 0; vx[i] = vz[i] = 0;
      x[i] = dx[i] = plX[pl] + ((rndI() * R30) - .5) * 5; z[i] = dz[i] = plZ[pl] + ((rndI() * R30) - .5) * 5; dest[i] = pl; entra(i, pl);
      const el = TM[1] - lastUpd[i]; lastUpd[i] = TM[1];
      if (el > 0) {
        const ni = i * NEEDS; for (let k = 0; k < NEEDS; k++) { const v = needs[ni + k] + nRate[k] * el / 3600 * .5; needs[ni + k] = v > 1 ? 1 : v; }
        const f = Math.exp(-el / 7200), b = i * 3; for (let k = 0; k < 3; k++) pad[b + k] = padBase[b + k] + (pad[b + k] - padBase[b + k]) * f;
        emoI[i] = 0;
      }
      genR[i]++; prossimaRoutine(i);
    }

    // ------------------------------------------------------------ livelli di dettaglio (ogni secondo)
    const MAXD = WORLD * 1.42;
    function livelli() {
      bins.fill(0); seen.fill(0);
      for (let i = 0; i < N; i++) {
        if (tier[i] === 2) posAnalitica(i);
        const ex = x[i] - TM[3], ez = z[i] - TM[4]; let bn = (Math.sqrt(ex * ex + ez * ez) * BINS / MAXD) | 0; if (bn >= BINS) bn = BINS - 1;
        dBin[i] = bn; bins[bn]++;
      }
      // tagli esatti: per ogni livello k il secchio di confine e quanti ne prende
      let cum = 0, k = 0; const tgt0 = C0, tgt1 = C0 + C1, tgt2 = C0 + C1 + C2;
      let cut0 = BINS, cut1 = BINS, cut2 = BINS, q0 = 0, q1 = 0, q2 = 0;
      for (let bI = 0; bI < BINS; bI++) {
        const nc = cum + bins[bI];
        if (k === 0 && nc >= tgt0) { cut0 = bI; q0 = tgt0 - cum; k = 1; }
        if (k === 1 && nc >= tgt1) { cut1 = bI; q1 = tgt1 - cum; k = 2; }
        if (k === 2 && nc >= tgt2) { cut2 = bI; q2 = tgt2 - cum; k = 3; }
        cum = nc;
      }
      n01 = 0;
      for (let i = 0; i < N; i++) {
        const bn = dBin[i], sn = seen[bn]++;
        let nt = 3;
        if (bn < cut0 || (bn === cut0 && sn < q0)) nt = 0;
        else if (bn < cut1 || (bn === cut1 && sn < q1)) nt = 1;
        else if (bn < cut2 || (bn === cut2 && sn < q2)) nt = 2;
        const ot = tier[i];
        if (nt !== ot) {
          if (nt < ot) ST.promozioni++; else ST.retrocessioni++;
          if (ot === 3) { cnt3[dist[i]]--; tier[i] = nt; reidrata(i); }
          else if (nt === 3) { cnt3[dist[i]]++; genR[i]++; genA[i]++; if (moving[i]) { posAnalitica(i); moving[i] = 0; } tier[i] = 3; }
          else if (nt <= 1 && ot === 2) { posAnalitica(i); genA[i]++; tier[i] = nt; }
          else if (nt === 2 && ot <= 1) {
            tier[i] = 2;
            if (moving[i]) { const ex = dx[i] - x[i], ez = dz[i] - z[i]; sx[i] = x[i]; sz[i] = z[i]; t0[i] = TM[1]; dur[i] = Math.sqrt(ex * ex + ez * ez) / SPEED * SCALA; genA[i]++; hpush(TM[1] + dur[i], i, EV_ARRIVO, genA[i]); }
          } else tier[i] = nt;
          if (nt <= 1) { nextThink[i] = TM[0] + (rndI() * R30) / HZ_NEAR; lastThink[i] = TM[0]; nextMood[i] = TM[0] + (rndI() * R30) * MOOD_S; nextDecide[i] = TM[0] + (rndI() * R30) * DECIDE_S; }
        }
        if (nt <= 1) t01[n01++] = i;
      }
    }

    // ------------------------------------------------------------ spazzini a fette (dimenticanza, decadimento, scadenze)
    function spazzini() {
      // registro: oltre il 60% pieno, o fatti più vecchi di RAW_DAYS giorni, 64 per tick
      const lim = TM[1] - RAW_DAYS * 86400;
      for (let m = 0; m < 64 && tailF < nextF; m++) { if (nextF - tailF > LC * .6 || fT[tailF & LM] < lim) dimentica(); else break; }
      // credenze e impressioni: un NPC su (hz × 60) per tick → tutti una volta al minuto
      const per = Math.max(1, Math.ceil(N / (HZ * 60)));
      for (let m = 0; m < per; m++) {
        const i = sweepI; sweepI = (sweepI + 1) % N;
        const b = i * K; for (let k = 0; k < K; k++) { const j = b + k; if (bStr[j] > 0 && forzaEff(j) < .05) bStr[j] = 0; }
        const rb = i * RC; for (let k = 0; k < RC; k++) {
          const r = rb + k; if (rDst[r] === NONE) continue;
          if (TM[1] - rT[r] > 5 * 86400 && Math.abs(rCharge[r]) < 20) { rDst[r] = NONE; continue; }
          const o = r * 6; let c = 0; for (let q = 0; q < 6; q++) { const v = rIV[o + q]; const nv = v > 0 ? v - 1 : v < 0 ? v + 1 : 0; rIV[o + q] = nv; c += nv; } rCharge[r] = c;
        }
      }
      // parziali scaduti: 25 per tick
      for (let m = 0; m < 25; m++) { const v = pmSweep; pmSweep = (pmSweep + 1) % PM; if (pmLive[v] && TM[1] - pmT[v] > patWin[pmP[v]]) { pmLibera(v); ST.parzialiScaduti++; } }
    }

    // ------------------------------------------------------------ il tick
    let misura = true;
    function tick(dtR) {
      const tA = performance.now();
      TM[0] += dtR; TM[1] = G0 + TM[0] * SCALA; ST.tick++;
      TM[2] += dtR * .004; TM[3] = WORLD / 2 + Math.cos(TM[2]) * WORLD * .35; TM[4] = WORLD / 2 + Math.sin(TM[2] * 1.7) * WORLD * .35;   // il giocatore va a spasso
      let t1 = tA, t2;
      if (TM[0] >= nextRetier) { livelli(); nextRetier = TM[0] + 1; t2 = perf(); fase[0] += t2 - t1; t1 = t2; }
      griglia(); t2 = perf(); fase[1] += t2 - t1; t1 = t2;
      let ev = 0;
      while (hn > 0 && hT[0] <= TM[1]) {
        if (ev >= EVMAX) { ST.arretrati++; break; }
        hpop(); ev++;
        if (popK === EV_ROUTINE) { if (genR[popI] === popG && tier[popI] !== 3) evRoutine(popI); else ST.stantii++; }
        else if (popK === EV_ARRIVO) { if (genA[popI] === popG && tier[popI] >= 2) evArrivo(popI); else ST.stantii++; }
        else if (popK === EV_PROMESSA) evPromessa(popI);
        else if (popK === EV_STORIA) evStoria(popI);
      }
      ST.eventi += ev; t2 = perf(); fase[2] += t2 - t1; t1 = t2;
      for (let q = 0; q < n01; q++) { const i = t01[q]; if (tier[i] === 0 && TM[0] >= nextThink[i]) pensa(i, true); }
      t2 = perf(); fase[3] += t2 - t1; t1 = t2;
      for (let q = 0; q < n01; q++) { const i = t01[q]; if (tier[i] === 1 && TM[0] >= nextThink[i]) pensa(i, false); }
      t2 = perf(); fase[4] += t2 - t1; t1 = t2;
      spazzini(); t2 = perf(); fase[5] += t2 - t1; t1 = t2;
      if (TM[0] >= nextSnap && api.onSnap) { nextSnap = TM[0] + 1 / SNAP_HZ; api.onSnap(); t2 = perf(); fase[6] += t2 - t1; t1 = t2; }
      const ms = perf() - tA;
      if (misura) { let bk = (ms / HW) | 0; if (bk > HB) bk = HB; hist[bk]++; if (ms > ST.msMax) ST.msMax = ms; }
      return ms;
    }
    function ritardo(ms) { if (!misura) return; let bk = (ms / HW) | 0; if (bk < 0) bk = 0; if (bk > HB) bk = HB; late[bk]++; if (ms > ST.lateMax) ST.lateMax = ms; }
    // istantanea: [n, rt, px, pz, ora, giorno, 0, 0] + per NPC [id, x, z, vx, vz, azione, piacere, livello]
    function istantanea(f32) {
      let n = 0; const cap = Math.min(SNAPMAX, ((f32.length - SNAPH) / SNAPF) | 0);
      for (let q = 0; q < n01 && n < cap; q++) {
        const i = t01[q], o = SNAPH + n * SNAPF, e = tier[i] === 1 ? TM[0] - lastThink[i] : 0;
        f32[o] = i; f32[o + 1] = x[i] + vx[i] * e * (moving[i] ? 1 : 0); f32[o + 2] = z[i] + vz[i] * e * (moving[i] ? 1 : 0);
        f32[o + 3] = moving[i] ? vx[i] : 0; f32[o + 4] = moving[i] ? vz[i] : 0; f32[o + 5] = act[i]; f32[o + 6] = pad[i * 3]; f32[o + 7] = tier[i]; n++;
      }
      f32[0] = n; f32[1] = TM[0]; f32[2] = TM[3]; f32[3] = TM[4]; f32[4] = (TM[1] / 3600) % 24; f32[5] = Math.floor(TM[1] / 86400); f32[6] = 0; f32[7] = 0;
      ST.istantanee++; return n;
    }

    // ------------------------------------------------------------ costruzione del mondo
    function costruisci() {
      // luoghi: per quartiere 10 case, 4 lavori, 2 bar, 2 negozi, 1 piazza; più 3 chiese, 2 mercati, 3 moli
      let np = 0;
      const metti = (k, d) => { const cx = (d % 3) * DSIZE, cz = ((d / 3) | 0) * DSIZE; plX[np] = cx + 15 + (rndI() * R30) * (DSIZE - 30); plZ[np] = cz + 15 + (rndI() * R30) * (DSIZE - 30); plKind[np] = k; plDist[np] = d; np++; };
      for (let d = 0; d < DISTR; d++) { for (let q = 0; q < 10; q++) metti(0, d); for (let q = 0; q < 4; q++) metti(1, d); metti(2, d); metti(2, d); metti(3, d); metti(3, d); metti(4, d); }
      metti(5, 0); metti(5, 4); metti(5, 8); metti(6, 3); metti(6, 5); metti(7, 6); metti(7, 7); metti(7, 8);
      plHead.fill(-1);
      for (let d = 0; d < DISTR; d++) for (let k = 0; k < KINDS; k++) {
        const cx = (d % 3) * DSIZE + DSIZE / 2, cz = ((d / 3) | 0) * DSIZE + DSIZE / 2, mine = [];
        for (let p = 0; p < np; p++) if (plKind[p] === k && plDist[p] === d) mine.push(p);
        if (!mine.length) { const all = []; for (let p = 0; p < np; p++) if (plKind[p] === k) all.push(p); all.sort((a, b) => Math.hypot(plX[a] - cx, plZ[a] - cz) - Math.hypot(plX[b] - cx, plZ[b] - cz)); mine.push(...all.slice(0, 2)); }
        for (let c = 0; c < 4; c++) nearPl[(d * KINDS + k) * 4 + c] = mine[c % mine.length];
      }
      // azioni
      for (let a = 0; a < NA; a++) {
        aKind[a] = AZ[a][1]; aDur[a] = AZ[a][3]; aBase[a] = (rndI() * R30) * .2;
        const pn = AZ[a][2];
        for (let k = 0; k < NEEDS; k++) { aNeed[a * NEEDS + k] = k === pn ? 2 + (rndI() * R30) : (rndI() * R30) * .3 - .1; aSat[a * NEEDS + k] = k === pn ? .6 + (rndI() * R30) * .4 : 0; }
        for (let k = 0; k < TRAITS; k++) aTrait[a * TRAITS + k] = ((rndI() * R30) - .5) * .4;
        for (let k = 0; k < 3; k++) aMood[a * 3 + k] = ((rndI() * R30) - .5) * .4;
        for (let h = 0; h < 24; h++) aTod[a * 24 + h] = (a === 0 ? (h < 6 || h >= 23 ? 1.5 : -1) : a === 1 ? (h >= 8 && h < 18 ? .6 : -.8) : 0) + ((rndI() * R30) - .5) * .1;
      }
      nRate[0] = .12; nRate[1] = .06; nRate[2] = .1; nRate[3] = .08; nRate[4] = .05; nRate[5] = .03;
      // routine: 8 modelli × 8 voci
      const sera = [3, 4, 7, 5, 9, 3, 12, 8];
      for (let r = 0; r < RT; r++) {
        const off = ((r * .37) % 1) - .5, dis = r >= 6;
        const seq = [2, dis ? 15 : 1, r & 1 ? 3 : 2, dis ? 14 : 1, sera[r], 2, r & 2 ? 9 : 4, 0];
        const ore = [6.5, 8, 12.5, 14, 18, 20, 21.5, 23.2];
        for (let e = 0; e < RE; e++) { rtHour[r * RE + e] = Math.min(23.9, ore[e] + off * (e === 7 ? .3 : 1)); rtAct[r * RE + e] = seq[e]; }
      }
      // NPC
      const houses = [], works = [], bars = [];
      for (let p = 0; p < np; p++) { if (plKind[p] === 0) houses.push(p); else if (plKind[p] === 1) works.push(p); else if (plKind[p] === 2) bars.push(p); }
      const perD = []; for (let d = 0; d < DISTR; d++) perD.push([]);
      for (let i = 0; i < N; i++) {
        const h = houses[((rndI() * R30) * houses.length) | 0], d = plDist[h]; home[i] = h; dist[i] = d; perD[d].push(i);
        const ws = works.filter(p => (rndI() * R30) < .6 ? plDist[p] === d : true); work[i] = ws.length ? ws[((rndI() * R30) * ws.length) | 0] : works[0];
        const bs = bars.filter(p => plDist[p] === d); bar[i] = bs[((rndI() * R30) * bs.length) | 0];
        rout[i] = ((rndI() * R30) * RT) | 0; memoria[i] = (rndI() * R30);
        for (let k = 0; k < TRAITS; k++) trait[i * TRAITS + k] = (rndI() * R30) * 2 - 1;
        const O = trait[i * TRAITS], C = trait[i * TRAITS + 1], E = trait[i * TRAITS + 2], Ag = trait[i * TRAITS + 3], Ne = trait[i * TRAITS + 4];
        padBase[i * 3] = .21 * E + .59 * Ag - .19 * Ne; padBase[i * 3 + 1] = .15 * O + .3 * Ne - .57 * Ag * .2; padBase[i * 3 + 2] = .25 * O + .17 * C + .6 * E - .32 * Ag;   // Mehrabian
        for (let k = 0; k < 3; k++) pad[i * 3 + k] = padBase[i * 3 + k];
        for (let k = 0; k < NEEDS; k++) needs[i * NEEDS + k] = (rndI() * R30) * .5;
        status[i] = ((rndI() * R30) - .5) * .4; tier[i] = 3; at[i] = -1; oNext[i] = oPrev[i] = -1; actHead[i] = -1; lastTalk[i] = -100;
        x[i] = plX[h]; z[i] = plZ[h]; lastUpd[i] = G0;
      }
      let o = 0; for (let d = 0; d < DISTR; d++) { distStart[d] = o; for (const i of perD[d]) distItems[o++] = i; cnt3[d] = perD[d].length; } distStart[DISTR] = o;
      for (let i = 0; i < N; i++) entra(i, home[i]);
      rDst.fill(NONE); rIF.fill(-1); typHead.fill(-1);
      // schemi del setaccio: 2-4 stadi sui tipi comuni, legami, finestra 2-48 ore, a volte "a meno che"
      const comuni = [T.chiacchiera, T.gag, T.figuraccia, T.lite, T.rissa, T.regalo, T.prestito, T.saldato, T.promessa, T.parola_rotta, T.parola_mantenuta, T.voce, T.corteggia, T.gelosia, T.favore, T.favore_negato, T.scusa_vera, T.amore, T.debito, T.festa];
      for (let p = 0; p < NP; p++) {
        const len = 2 + (((rndI() * R30) * 3) | 0); patLen[p] = len; patWin[p] = (1 + (rndI() * R30) * 11) * 3600; patUnless[p] = (rndI() * R30) < .4 ? comuni[((rndI() * R30) * comuni.length) | 0] : 255;
        for (let s = 0; s < len; s++) { patT[p * 4 + s] = comuni[((rndI() * R30) * (s === 0 ? 8 : comuni.length)) | 0]; patBind[p * 4 + s] = ((rndI() * R30) * 4) | 0; }
        if (patUnless[p] === patT[p * 4 + 1]) patUnless[p] = 255;
      }
      const cnt = new Uint16Array(NT); for (let p = 0; p < NP; p++) cnt[patT[p * 4]]++;
      let s = 0; for (let t = 0; t < NT; t++) { startOff[t] = s; s += cnt[t]; } startOff[NT] = s;
      const fill = new Uint16Array(NT); for (let p = 0; p < NP; p++) { const t = patT[p * 4]; startPat[startOff[t] + fill[t]++] = p; }
      waitHead.fill(-1); unlessHead.fill(-1); pmNW.fill(-1); pmPW.fill(-1); pmNU.fill(-1); pmPU.fill(-1); ddVal.fill(-1);
      for (let v = PM - 1; v >= 0; v--) pmFree[pmFreeN++] = v;
      for (let d = 0; d < DISTR; d++) hpush(G0 + (rndI() * R30) * 3600, d, EV_STORIA, 0);
      TM[1] = G0;
    }
    costruisci();

    // ------------------------------------------------------------ salvataggio (sezioni) e controllo
    function hashNome(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
    const STATO = REG.filter(r => r.cat !== 'lavoro');   // la griglia e i secchi si rifanno: non sono stato
    function sommaParola(h, u8) {   // somma di controllo a parole di 32 bit (stile murmur), coda a byte
      const nw = u8.byteLength >> 2;
      if ((u8.byteOffset & 3) === 0 && nw) { const u32 = new Uint32Array(u8.buffer, u8.byteOffset, nw); for (let i = 0; i < nw; i++) { h = Math.imul(h ^ u32[i], 0x5bd1e995); h ^= h >>> 15; } }
      else for (let i = 0; i < nw * 4; i++) { h = Math.imul(h ^ u8[i], 0x5bd1e995); h ^= h >>> 15; }
      for (let i = nw * 4; i < u8.byteLength; i++) { h = Math.imul(h ^ u8[i], 0x5bd1e995); h ^= h >>> 15; }
      return h;
    }
    function controllo() { syncOut(); let h = 0x12345678 | 0; for (const r of STATO) h = sommaParola(h, new Uint8Array(r.a.buffer, r.a.byteOffset, r.a.byteLength)); return h >>> 0; }
    const MAGIC = 0x31425650;   // 'PVB1'
    function serializza() {
      syncOut();
      let tot = 32; for (const r of STATO) tot += 16 + ((r.a.byteLength + 3) & ~3);
      const buf = new ArrayBuffer(tot), dv = new DataView(buf), u8 = new Uint8Array(buf);
      dv.setUint32(0, MAGIC, true); dv.setUint32(4, 1, true); dv.setUint32(8, N, true); dv.setUint32(12, STATO.length, true);
      let o = 32, h = 0x12345678 | 0;
      for (const r of STATO) {
        const src = new Uint8Array(r.a.buffer, r.a.byteOffset, r.a.byteLength);
        dv.setUint32(o, hashNome(r.nome), true); dv.setUint32(o + 4, r.a.BYTES_PER_ELEMENT, true); dv.setUint32(o + 8, r.a.length, true); dv.setUint32(o + 12, r.a.byteLength, true); o += 16;
        u8.set(src, o); h = sommaParola(h, src); o += (r.a.byteLength + 3) & ~3;
      }
      dv.setUint32(16, h >>> 0, true); dv.setFloat64(24, TM[1], true);
      return { buf, controllo: h >>> 0 };
    }
    function ripristina(buf) {
      const dv = new DataView(buf), u8 = new Uint8Array(buf);
      if (dv.getUint32(0, true) !== MAGIC) return { ok: false, err: 'formato sconosciuto' };
      if (dv.getUint32(8, true) !== N || dv.getUint32(12, true) !== STATO.length) return { ok: false, err: 'dimensioni diverse (N o sezioni)' };
      const atteso = dv.getUint32(16, true); let o = 32, h = 0x12345678 | 0;
      for (const r of STATO) {
        if (dv.getUint32(o, true) !== hashNome(r.nome) || dv.getUint32(o + 12, true) !== r.a.byteLength) return { ok: false, err: 'sezione ' + r.nome + ' diversa' };
        o += 16; const src = u8.subarray(o, o + r.a.byteLength); h = sommaParola(h, src);
        new Uint8Array(r.a.buffer, r.a.byteOffset, r.a.byteLength).set(src); o += (r.a.byteLength + 3) & ~3;
      }
      syncIn();
      const dopo = controllo();
      return { ok: (h >>> 0) === atteso && dopo === atteso, atteso, letto: h >>> 0, dopo };
    }

    // ------------------------------------------------------------ resoconto
    function pct(hh, p, tot) { let c = 0; const lim = tot * p; for (let i = 0; i <= HB; i++) { c += hh[i]; if (c >= lim) return (i + .5) * HW; } return HB * HW; }
    function memoria_() {
      const per = {}; let tot = 0;
      for (const r of REG) { per[r.cat] = (per[r.cat] || 0) + r.a.byteLength; tot += r.a.byteLength; }
      return { totale: tot, per, stato: STATO.reduce((s, r) => s + r.a.byteLength, 0) };
    }
    function resoconto() {
      let tot = 0, sum = 0; for (let i = 0; i <= HB; i++) { tot += hist[i]; sum += hist[i] * (i + .5) * HW; }
      let lt = 0; for (let i = 0; i <= HB; i++) lt += late[i];
      let pmLiveN = 0; for (let v = 0; v < PM; v++) pmLiveN += pmLive[v];
      let cred = 0; for (let j = 0; j < N * K; j++) if (bStr[j] > 0) cred++;
      let rel = 0, imp = 0; for (let r = 0; r < N * RC; r++) if (rDst[r] !== NONE) { rel++; const o = r * 6; for (let k = 0; k < 6; k++) if (rIV[o + k]) imp++; }
      let cc = 0; for (let j = 0; j < CC; j++) if (cKey[j]) cc++;
      const fasi = {}; for (let k = 0; k < FASI.length; k++) fasi[FASI[k]] = tot ? +(fase[k] / tot).toFixed(4) : 0;
      return {
        n: N, livelli: [C0, C1, C2, N - C0 - C1 - C2], hz: HZ, hzNear: HZ_NEAR, hzFar: +HZ_FAR.toFixed(3), scala: SCALA,
        tick: { n: tot, media: tot ? +(sum / tot).toFixed(3) : 0, p50: +pct(hist, .5, tot).toFixed(3), p95: +pct(hist, .95, tot).toFixed(3), p99: +pct(hist, .99, tot).toFixed(3), max: +ST.msMax.toFixed(3) },
        ritardo: { n: lt, p50: +pct(late, .5, lt).toFixed(2), p99: +pct(late, .99, lt).toFixed(2), max: +ST.lateMax.toFixed(2) },
        fasiMsPerTick: fasi,
        oraGioco: +((TM[1] / 3600) % 24).toFixed(2), giorno: Math.floor(TM[1] / 86400), heap: hn, heapCap: HC,
        registro: { vivi: nextF - tailF, cap: LC, totali: nextF, contatori: cc, archivio: Math.min(arcN, ARC) },
        credenze: cred, credCap: N * K, relazioni: rel, relCap: N * RC, impressioni: imp, parzialiVivi: pmLiveN, parzialiCap: PM, storieSetacciate: stN,
        conti: Object.assign({}, ST), memoria: memoria_(),
      };
    }
    function azzera() { hist.fill(0); late.fill(0); fase.fill(0); for (const k in ST) ST[k] = 0; }

    const api = {
      N, cfg, tick, ritardo, istantanea, resoconto, azzera, serializza, ripristina, controllo, onSnap: null,
      get misura() { return misura; }, set misura(v) { misura = !!v; },
      SNAPLEN: SNAPH + SNAPMAX * SNAPF, HZ,
      // corre a vuoto per ore di gioco (storia pregressa: il registro si riempie, la dimenticanza lavora)
      preriscalda(oreGioco) { const was = misura; misura = false; const dt = 1 / HZ, n = Math.ceil(oreGioco * 3600 / SCALA * HZ); const t = perf(); for (let i = 0; i < n; i++) tick(dt); misura = was; return { tick: n, ms: Math.round(perf() - t) }; },
    };
    return api;
  }

  // ------------------------------------------------------------------ il guscio del lavoratore
  // compressione e IndexedDB (A/B con puntatore): nel Worker, fuori dal filo della pagina
  async function gz(buf) { const s = new Blob([buf]).stream().pipeThrough(new CompressionStream('gzip')); return await new Response(s).arrayBuffer(); }
  async function ungz(buf) { const s = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip')); return await new Response(s).arrayBuffer(); }
  function idb() { return new Promise((ok, ko) => { const r = indexedDB.open('banco_pv', 1); r.onupgradeneeded = () => r.result.createObjectStore('salvataggi'); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); }); }
  function idbGet(db, k) { return new Promise((ok, ko) => { const r = db.transaction('salvataggi').objectStore('salvataggi').get(k); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); }); }
  function idbPut(db, k, v) { return new Promise((ok, ko) => { const tx = db.transaction('salvataggi', 'readwrite'); tx.objectStore('salvataggi').put(v, k); tx.oncomplete = () => ok(); tx.onerror = () => ko(tx.error); tx.onabort = () => ko(tx.error); }); }

  function guscio(port) {
    const now = () => performance.now();
    let sim = null, timer = null, prossimo = 0, periodo = 200, spare = [null, null, null], spareN = 0, corre = false;
    const SNAPMSG = { op: 'snap', buf: null, n: 0 }, TR = [null];
    let gcObs = null; const GCN = { n: 0, max: 0, tot: 0, sopra4: 0 };
    function giro() {
      if (!corre) return;
      const t = now(); sim.ritardo(t - prossimo);
      sim.tick(periodo / 1000);
      prossimo += periodo; let d = prossimo - now(); if (d < 0) { prossimo = now(); d = 0; }
      timer = setTimeout(giro, d);
    }
    function onSnap() {
      if (spareN === 0) { SKIP.n++; return; }
      const buf = spare[--spareN]; spare[spareN] = null;
      const f = new Float32Array(buf); SNAPMSG.n = sim.istantanea(f); SNAPMSG.buf = buf; TR[0] = buf;
      port.postMessage(SNAPMSG, TR); SNAPMSG.buf = null; TR[0] = null;
    }
    const SKIP = { n: 0 };
    async function salva(d) {
      const t0 = now(); const { buf, controllo } = sim.serializza(); const t1 = now();
      const z = await gz(buf); const t2 = now();
      let slot = null, t3 = t2, err = null;
      if (typeof indexedDB !== 'undefined' && !d.ritorna) {
        try {
          const db = await idb(); const p = await idbGet(db, 'puntatore'); slot = p && p.slot === 'A' ? 'B' : 'A';
          await idbPut(db, slot, { z, controllo, n: sim.N, cfg: sim.cfg, quando: Date.now() });
          await idbPut(db, 'puntatore', { slot, controllo, quando: Date.now() }); db.close();
        } catch (e) { err = String(e && e.message || e); }
        t3 = now();
      }
      const r = { op: 'salvato', id: d.id, controllo, grezzo: buf.byteLength, compresso: z.byteLength, msSerializza: +(t1 - t0).toFixed(2), msGzip: +(t2 - t1).toFixed(2), msIdb: +(t3 - t2).toFixed(2), msTotale: +(t3 - t0).toFixed(2), slot, err };
      if (d.ritorna) { r.z = z; port.postMessage(r, [z]); } else port.postMessage(r);
    }
    async function carica(d) {
      const t0 = now(); let z = d.z, info = null;
      try {
        if (!z) { const db = await idb(); const p = await idbGet(db, 'puntatore'); if (!p) throw new Error('nessun salvataggio'); info = await idbGet(db, p.slot); db.close(); z = info.z; info.slot = p.slot; }
        const t1 = now(); const raw = await ungz(z); const t2 = now();
        const target = d.verifica ? creaSim(Object.assign({}, sim ? sim.cfg : d.cfg)) : (sim || (sim = creaSim(d.cfg)));
        const r = target.ripristina(raw); const t3 = now();
        port.postMessage({ op: 'caricato', id: d.id, ok: r.ok, err: r.err, atteso: r.atteso, dopo: r.dopo, slot: info && info.slot, controlloVivo: d.verifica && sim ? sim.controllo() : null, msLeggi: +(t1 - t0).toFixed(2), msGunzip: +(t2 - t1).toFixed(2), msRipristina: +(t3 - t2).toFixed(2), grezzo: raw.byteLength });
      } catch (e) { port.postMessage({ op: 'caricato', id: d.id, ok: false, err: String(e && e.message || e) }); }
    }
    port.onmessage = function (e) {
      const d = e.data;
      if (d.op === 'snapR') { if (spareN < spare.length) spare[spareN++] = d.buf; return; }
      if (d.op === 'avvia') {
        sim = creaSim(d.cfg); sim.onSnap = onSnap; periodo = 1000 / sim.HZ;
        for (let i = 0; i < 2; i++) spare[spareN++] = new ArrayBuffer(sim.SNAPLEN * 4);
        const pw = d.cfg.prewarm != null && d.cfg.prewarm !== '' ? +d.cfg.prewarm : 24;
        const pre = d.cfg.ripristina ? null : sim.preriscalda(pw);   // col ripristino lo stato arriva dopo, con 'carica'
        sim.azzera();
        if (d.gc && typeof require === 'function') {
          try { const { PerformanceObserver } = require('perf_hooks'); gcObs = new PerformanceObserver(l => { for (const en of l.getEntries()) { GCN.n++; GCN.tot += en.duration; if (en.duration > GCN.max) GCN.max = en.duration; if (en.duration > 4) GCN.sopra4++; } }); gcObs.observe({ entryTypes: ['gc'] }); } catch (x) { }
        }
        port.postMessage({ op: 'pronto', pre, memoria: sim.resoconto().memoria, crossOriginIsolated: typeof crossOriginIsolated !== 'undefined' ? crossOriginIsolated : null, sab: typeof SharedArrayBuffer !== 'undefined' });
        if (!d.fermo) { corre = true; prossimo = now() + periodo; timer = setTimeout(giro, periodo); }
        return;
      }
      if (d.op === 'corri') { if (!corre) { corre = true; prossimo = now() + periodo; timer = setTimeout(giro, periodo); } return; }
      if (d.op === 'ferma') { corre = false; clearTimeout(timer); return; }
      if (d.op === 'azzera') { sim.azzera(); SKIP.n = 0; GCN.n = GCN.max = GCN.tot = GCN.sopra4 = 0; return; }
      if (d.op === 'stats') { const r = sim.resoconto(); r.conti.istantaneeSaltate = SKIP.n; r.gcLavoratore = gcObs ? Object.assign({}, GCN) : null; port.postMessage({ op: 'stats', id: d.id, r }); return; }
      if (d.op === 'veloce') {   // tick uno dopo l'altro, senza attese: il costo puro
        const was = corre; corre = false; clearTimeout(timer); sim.azzera(); const t = now();
        for (let i = 0; i < d.tick; i++) sim.tick(1 / sim.HZ);
        const r = sim.resoconto(); r.msParete = now() - t; port.postMessage({ op: 'stats', id: d.id, r });
        if (was) { corre = true; prossimo = now() + periodo; timer = setTimeout(giro, periodo); }
        return;
      }
      if (d.op === 'salva') { salva(d); return; }
      if (d.op === 'carica') { carica(d); return; }
      if (d.op === 'controllo') { port.postMessage({ op: 'controllo', id: d.id, controllo: sim.controllo() }); return; }
    };
  }

  // chi sono? Worker del browser, worker_threads di Node, o script nella pagina
  const isBrowserWorker = typeof WorkerGlobalScope !== 'undefined' && typeof self !== 'undefined' && self instanceof WorkerGlobalScope;
  let nodePort = null;
  if (!isBrowserWorker && typeof require === 'function') { try { const wt = require('worker_threads'); if (!wt.isMainThread && wt.parentPort) nodePort = wt.parentPort; } catch (e) { } }
  if (isBrowserWorker) guscio(self);
  else if (nodePort) {
    const port = { postMessage: (m, t) => nodePort.postMessage(m, t), set onmessage(f) { nodePort.on('message', d => f({ data: d })); } };
    guscio(port);
  }
  G.creaSim = creaSim;
  if (typeof module !== 'undefined' && module.exports) module.exports = { creaSim };
})(typeof self !== 'undefined' ? self : typeof globalThis !== 'undefined' ? globalThis : this);
