/* Porto Vecchio — [apk_finale] IL REGOLATORE DEL TELEFONO (solo profilo leggero: tocco o ?leggera; ?nofluidotel lo spegne).
   Sul telefono vero il gioco con tutte le novità andava a 7-8 fps. Qui si guarda il tempo dei fotogrammi (media su 1,5 s) e si scende
   a gradini, poi si risale piano se avanza margine. Il gradino si cambia al più ogni 3 s (niente altalena). window.__fluidoTel: lo stato.
   [fluido] (v7/FLUIDO.md) Rifatto perché lavorava contro l'altro regolatore:
   - la risoluzione è di peso_ritmo.js (la scala fine di render.js, che sul telefono parte già dalla soglia: 1,25 px per px CSS). Qui prima
     si chiamava R.setRes(.85/.72/.6), che con la scala fine vuol dire «l'85% del massimo», cioè PIÙ righe di quelle di partenza: il primo
     gradino «giù» alzava i pixel. Ora qui la risoluzione si tocca solo se la scala fine non c'è (?regola=0, ?risdin=0);
   - col tetto a 30 (peso_ritmo) i fotogrammi durano 33,3 ms anche quando il lavoro avanza: la soglia fissa «oltre 33 ms» scendeva sempre e
     «sotto 24» non risaliva mai. Ora la misura è contro il ritmo voluto (30 col tetto, 60 senza): giù oltre il 112% e solo quando peso_ritmo
     è in fondo (scala minima e tetto a 30: prima scende lui), su quando si tiene il ritmo e il processore lavora meno del 55% del budget;
   - si parte dal gradino 1 (il telefono non ha mai margine all'avvio, mentre la città si monta), e il tetto di peso_ritmo parte a 30.
   I gradini (si sommano):
     1  le insegne vive oltre 45 m senza tubi al neon né ombre (gli aloni li spegne già insegne4 oltre 120 m)
     2  il tratteggio di luce3 spento (Luce3.imposta(0): l'uniform, il programma non si ricompila)
     3  (era: le ombre del sole a fotogrammi alterni. [arte] l'ombra si rifà a ogni fotogramma: scattava)
     4  [fluido2] la scena senza MSAA (R.telQ: un risolvere e metà della banda della scena in meno)
     5  [fluido2] le righe della soglia all'85% (nel Game Boy 310 invece di 365); senza la scala fine: la risoluzione al 72% (il vecchio gradino)
     6  [fluido2] meno persone disegnate (le 16 più vicine, fino al 15% della nebbia: render.js GTEL), l'ombra del sole ogni 3 fotogrammi
   [fluido2] si parte dal gradino 2 (il telefono vero andava a 7 fps: prima si arriva al giocabile, poi si risale se avanza margine) e si
   scende ogni 2 s invece di 3. ?fluidotel2=0 i gradini e i tempi di prima */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  const Q = location.search || '';
  const TEL = /[?&](leggera|bassa)\b/.test(Q) || (!/[?&]alta\b/.test(Q) && (() => { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } })());
  if (!TEL || /[?&](nofluidotel|vecchio)\b/.test(Q)) return;
  const VECCHIO = /[?&]fluidotel=vecchio\b/.test(Q);   // il regolatore di prima (le soglie fisse e la risoluzione), per il confronto
  const F2 = !VECCHIO && !/[?&]fluidotel2=0\b/.test(Q);
  const MAXG = F2 ? 6 : 4, GIU = F2 ? 2000 : 3000, ST = window.__fluidoTel = { gradino: 0, ms: 0, cambi: 0, storia: [], partenza: VECCHIO ? 0 : F2 ? 2 : 1 };
  let last = 0, acc = 0, n = 0, t0 = 0, buono = 0, cambio = 0, vicine = true, applicato = -1;
  const pv = () => window.__pv, R = () => pv() && pv().R;
  const fine = () => { const r = R(); return !!(r && r.hdScala && r.hdScala()); };   // la scala fine di render.js (peso_ritmo la muove)
  const RES_OLD = [1, .85, .85, .72, .6];
  function applica(g) {
    const r = R(); if (!r) return; applicato = g;
    if (VECCHIO) { try { if (r.setRes) r.setRes(RES_OLD[g]); } catch (e) { } }
    else if (!F2) { if (!fine()) { try { if (r.setRes) r.setRes(g >= 4 ? .72 : 1); } catch (e) { } } }
    else { try { if (r.telQ) r.telQ({ aa: g < 4, scala: g >= 5 && fine() ? .85 : 1 }); if (!fine() && r.setRes) r.setRes(g >= 5 ? .72 : 1); } catch (e) { }
      try { const GT = r.genteTel; if (GT) { GT.n = g >= 6 ? 16 : 22; GT.k = g >= 6 ? .15 : .3; } } catch (e) { } }
    try { const L = window.__LUCE3; if (L && L.capace) { if (g >= 2 && L.on) L.imposta(0); else if (g < 2 && !L.on && /[?&]luce3\b/.test(location.search)) L.imposta('a'); } } catch (e) { }
    vicine = VECCHIO ? g < 3 : g < 1;
  }
  // le insegne vive lontane: niente tubi al neon né ombre oltre 45 m
  function insegne() {
    const I = window.Insegne4, r = R(); if (!I || !I.SIGNS || !r || !r.getCamera) return; const cam = r.getCamera(); if (!cam) return;
    for (const S of I.SIGNS) { if (!S.g) continue; const lont = !vicine && S.g.position.distanceToSquared(cam.position) > 45 * 45;
      if (S.__ft === lont) continue; S.__ft = lont;
      for (const k in S.ms) { const o = S.ms[k]; if (!o) continue; if (k === 'neon') o.visible = !lont; o.castShadow = !lont && (k === 'ferro' || k === 'paint' || k === 'box'); }
      if (S.sp && lont) S.sp.visible = false; }
  }
  function giro(now) {
    requestAnimationFrame(giro);
    const p = pv(); if (!p || !p.st || (window.__tl && !window.__tl.gioco)) { last = now; return; }
    if (applicato < 0) { ST.gradino = ST.partenza; applica(ST.gradino); }
    if (document.hidden) { last = now; return; }
    const dt = now - last; last = now; if (dt <= 0 || dt > 1000) return;
    acc += dt; n++; if (!t0) t0 = now;
    if (now - t0 < 1500) return;
    const ms = acc / n; ST.ms = Math.round(ms * 10) / 10; acc = n = 0; t0 = now;
    let g = ST.gradino;
    if (VECCHIO) {
      if (ms < 24) buono += 1500; else buono = 0;
      if (ms > 33 && g < MAXG && now - cambio > 3000) g++;
      else if (buono >= 6000 && g > 0 && now - cambio > 3000) { g--; buono = 0; }
    } else {
      const PR = window.PesoRitmo, rs = PR && PR.ON && PR.stato ? PR.stato() : null, B = 1000 / ((rs && rs.tetto) || 60);
      const inFondo = !rs || (PR.inFondo ? PR.inFondo() : true), cpu = rs ? rs.cpuMs : 0;
      ST.budget = Math.round(B * 10) / 10; ST.inFondo = inFondo;
      if (ms < B * 1.03 && (!rs || cpu < B * .55)) buono += 1500; else buono = 0;
      if (ms > B * 1.12 && inFondo && g < MAXG && now - cambio > GIU) g++;
      else if (buono >= 8000 && g > 0 && now - cambio > 3000) { g--; buono = 0; }
    }
    if (g !== ST.gradino) { ST.gradino = g; ST.cambi++; cambio = now; ST.storia.push([Math.round(now / 1000), g, ST.ms]); if (ST.storia.length > 20) ST.storia.shift(); applica(g); }
    if (!vicine || ST.cambi) insegne();
  }
  requestAnimationFrame(giro);
})();
