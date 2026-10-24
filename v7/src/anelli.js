/* Porto Vecchio — [anelli] IL CARICAMENTO AD ANELLI (v7).
   Prima la città nuova si costruiva tutta prima del primo fotogramma: la pagina restava ferma minuti (sul telefono non arrivava). Ora:
   - l'anello VICINO (quello che la camera vede, fin oltre la nebbia, più un margine) si fa nel caricamento, in alta qualità;
   - l'anello MEDIO (dove puoi arrivare in ~20 s alla velocità di adesso: a piedi 100-150 m, in macchina 300-400) si fa per primo
     appena si gioca, a pezzi, dentro un tetto di tempo per fotogramma;
   - il LONTANO intanto è una sagoma povera (le case come volumi col colore del muro e del tetto, una mesh sola): da lì la casa vera
     sale con un retino che sfuma (mai uno scatto, mai un buco vicino), poi col tempo arriva tutto il resto, finché c'è.
   Qui c'è il motore che non sa niente della città: i lavori (generatori, uno per settore), la coda per distanza e per direzione dello
   sguardo, il tetto di tempo che si adatta al fotogramma misurato, le sfumature. render.js gli dà i lavori (fusione1 per settore,
   le statiche lontane, la sagoma) e lo chiama a ogni fotogramma (anelliTick1).
   ?tutto: come prima (tutto nel caricamento, niente sagome); ?anellilog: il diario nella console; window.__anelli: lo stato.
   Lo Studio (editor.html) costruisce sempre tutto. Il gioco (camminare, salire sui tetti, le porte, la gente, le missioni) legge i dati
   del mondo, non le mesh: dove la casa vera non è ancora arrivata funziona lo stesso (vedi PESO.md, «Caricamento ad anelli»). */
var Anelli = (function () {
  'use strict';
  const Q = typeof location !== 'undefined' ? location.search : '';
  const STUDIO = typeof window !== 'undefined' && !!window.PV_STUDIO;
  const ON = !STUDIO && !/[?&]tutto\b/.test(Q);
  const LOG = /[?&]anellilog\b/.test(Q);
  const TEL = (() => { try { if (/[?&]alta\b/.test(Q)) return false; return /[?&](leggera|bassa)\b/.test(Q) || matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } })();
  // le misure (metri, millisecondi)
  const CFG = {
    vicino: TEL ? 120 : 170,        // nel caricamento: le case entro questo raggio dal punto di partenza (la nebbia chiude a ~110-190 m)
    margine: 30,                    // l'anello vicino mentre si gioca: la nebbia + questo
    onda: !/[?&]noanimus\b/.test(Q), // al primo avvio, nel menu: le sagome e poi la città vera che sale a onda dal personaggio (?noanimus: subito)
    ondaV: 110,                     // la velocità dell'onda (m/s)
    medio: [110, 420],              // l'anello medio: 20 s alla velocità di adesso, fra questi due
    secondi: 20,
    tetto: TEL ? 2.5 : 3.5,         // il tempo dei lavori per fotogramma, di norma
    tettoMin: 1, tettoMax: TEL ? 6 : 8, tettoUrgente: 14,   // col fotogramma lento, nel menu, e quando un settore vicino manca
    sfuma: .7,                      // la sfumatura dalla sagoma alla casa vera (s)
    sguardo: 45,                    // quanti metri vale avere il settore davanti alla camera
    vertici: TEL ? 60000 : 160000,  // quanti vertici nuovi per fotogramma alla scheda video (l'invio lo paga il disegno, non il lavoro)
  };
  // un lavoro che deve aspettare il fotogramma dopo (la quota dei vertici è finita) dà ASPETTA: il motore passa al fotogramma dopo
  const ASPETTA = { aspetta: true };
  let VF = 0;
  const carica = n => { if (VF > 0 && VF + n > CFG.vertici) return false; VF += n; return true; };
  const ST = { lavori: 0, fatti: 0, ms: 0, picco: 0, fotogrammi: 0, tetto: CFG.tetto, urgenti: 0, inizio: performance.now(), tuttoT: null, coda: 0, sfumature: 0, medio: 0, vel: 0 };
  const CODA = [];   // { x, z, r, gen, tipo, peso, d } in attesa o in corso
  let cur = null, ordT = 0, avgF = 16.7, lastNow = 0;
  const SF = [];     // le sfumature in corso: { t0, dur, set(k) }
  const log = (...a) => { if (LOG) console.log('[anelli]', ...a); };
  // un lavoro: un generatore che fa un pezzo a ogni next() e controlla lui l'orologio (Anelli.scaduto()) per cedere il passo
  function lavoro(job) { job.d = 1e9; CODA.push(job); ST.lavori++; ST.coda = CODA.length; return job; }
  let DL = 0, ETI = '';
  // i passi più lunghi (oltre 20 ms), per trovare chi non cede il passo: window.__anelli.picchi
  const PIC = [];
  function picchi(k, ms) { PIC.push([k, +ms.toFixed(1)]); PIC.sort((a, b) => b[1] - a[1]); if (PIC.length > 12) PIC.length = 12; }
  const segna = e => { ETI = e; };
  const scaduto = () => performance.now() > DL;
  // la priorità: la distanza dalla camera (dal bordo del settore), meno un premio per quello che sta davanti
  function ordina(cx, cz, fx, fz) {
    for (const j of CODA) { const dx = j.x - cx, dz = j.z - cz, L = Math.hypot(dx, dz), d = Math.max(0, L - (j.r || 0)); const dot = L > 1 ? (dx * fx + dz * fz) / L : 1; j.d = d; j.s = d - CFG.sguardo * Math.max(0, dot) + (j.peso || 0); }
    CODA.sort((a, b) => a.s - b.s);
  }
  // a ogni fotogramma (render.js): dove guarda la camera, fin dove si vede, quanto si va veloci, se siamo nel menu
  function tick(o) {
    const now = performance.now(), raw = lastNow ? now - lastNow : 16.7; lastNow = now;
    if (raw < 250) avgF += (raw - avgF) * .05;
    SF.length && sfumature(now);
    if (!CODA.length && !cur) { if (ST.tuttoT === null && ST.lavori) { ST.tuttoT = Math.round(now - ST.inizio); log('tutto fatto in', ST.tuttoT, 'ms'); if (o.fine) o.fine(); } return; }
    const vel = Math.min(40, o.vel || 0); ST.vel = vel;
    const medio = Math.max(CFG.medio[0], Math.min(CFG.medio[1], vel * CFG.secondi)); ST.medio = Math.round(medio);
    const vicino = (o.nebbia || 150) + CFG.margine;
    if (now - ordT > 400 || !cur) { ordT = now; ordina(o.x, o.z, o.fx || 0, o.fz || 0); }
    // il tetto di tempo: si stringe se il fotogramma è lento, si allarga nel menu; un settore dentro la nebbia che manca passa avanti
    let tetto = o.menu ? CFG.tettoMax : avgF > 24 ? CFG.tettoMin : avgF > 19 ? (CFG.tetto + CFG.tettoMin) / 2 : CFG.tetto;
    const prossimo = cur || CODA[0];
    if (prossimo && prossimo.d < vicino - CFG.margine * .5 && !o.menu) { tetto = CFG.tettoUrgente; ST.urgenti++; }
    ST.tetto = tetto; DL = now + tetto; VF = 0;
    let n = 0;
    while (performance.now() < DL) {
      if (!cur) {   // sul telefono quello che chiede la scheda video (telefono: false) oltre l'anello medio aspetta: la memoria cresce solo dove si va
        let k = 0; if (TEL) while (k < CODA.length && CODA[k].telefono === false && CODA[k].d > medio + vicino) k++;
        if (k >= CODA.length) break; cur = CODA.splice(k, 1)[0]; ST.coda = CODA.length; }
      const t1 = performance.now(); ETI = '';
      let r; try { r = cur.gen.next(); } catch (e) { console.warn('[anelli] lavoro', cur.tipo, e); r = { done: true }; }
      const dt = performance.now() - t1; if (dt > 20) picchi(cur.tipo + (ETI ? ':' + ETI : ''), dt);
      n++; if (!r.done && r.value === ASPETTA) break;
      if (r.done) { ST.fatti++; if (cur.fatto) try { cur.fatto(); } catch (e) { console.warn('[anelli]', e); } cur = null; }
    }
    const ms = performance.now() - now; ST.ms += ms; ST.fotogrammi++; if (ms > ST.picco) ST.picco = +ms.toFixed(1);
  }
  // tutto subito (gli strumenti, un salto lontano): finisce i lavori in coda senza tetto
  const SUF = [];   // chi vuole sapere che si finisce tutto subito (render.js: l'onda del primo avvio)
  const suFinisci = f => SUF.push(f);
  function finisci(filtro) {
    if (!filtro) SUF.forEach(f => { try { f(); } catch (e) { console.warn('[anelli]', e); } });
    DL = Infinity; VF = -1e12; const resta = [];
    const run = j => { let r; do { try { r = j.gen.next(); } catch (e) { console.warn('[anelli]', e); r = { done: true }; } } while (!r.done); ST.fatti++; if (j.fatto) j.fatto(); };
    if (cur && (!filtro || filtro(cur))) { run(cur); cur = null; }
    while (CODA.length) { const j = CODA.shift(); if (filtro && !filtro(j)) { resta.push(j); continue; } run(j); }
    CODA.push(...resta); ST.coda = CODA.length; DL = 0; VF = 0;
    if (!filtro) sfumaTutte();   // e le sfumature arrivano in fondo (gli strumenti fotografano la città intera)
  }
  // le sfumature: k da 0 a 1 in dur secondi (set(k) a ogni fotogramma, set(1) alla fine)
  function sfuma(set, dur, ritardo) { SF.push({ t0: performance.now() + (ritardo || 0) * 1000, dur: (dur || CFG.sfuma) * 1000, set }); ST.sfumature++; }
  function sfumature(now) { for (let i = SF.length - 1; i >= 0; i--) { const f = SF[i]; if (now < f.t0) continue; const k = Math.min(1, (now - f.t0) / f.dur); try { f.set(k * k * (3 - 2 * k)); } catch (e) { } if (k >= 1) SF.splice(i, 1); } }
  const sfumaTutte = () => { while (SF.length) { const f = SF.pop(); try { f.set(1); } catch (e) { } } };
  // il retino della sfumatura (lo stesso in tutti gli shader che sfumano, così sagoma e casa vera si danno il cambio pixel per pixel)
  const RETINO = 'float an1D() { return fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715)))); }';
  const stato = () => Object.assign({ on: ON, telefono: TEL, coda: CODA.length + (cur ? 1 : 0), avgF: +avgF.toFixed(1) }, ST, { ms: Math.round(ST.ms), picchi: PIC.slice() });
  if (typeof window !== 'undefined') Object.defineProperty(window, '__anelli', { configurable: true, get: stato });
  return { ON, TEL, CFG, ASPETTA, carica, segna, picchi, suFinisci, lavoro, tick, finisci, scaduto, sfuma, RETINO, stato, log, get vuota() { return !CODA.length && !cur; } };
})();
if (typeof window !== 'undefined') window.Anelli = Anelli;
