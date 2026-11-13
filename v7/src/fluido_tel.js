/* Porto Vecchio — [apk_finale] IL REGOLATORE DEL TELEFONO (solo profilo leggero: tocco o ?leggera; ?nofluidotel lo spegne).
   Sul telefono vero il gioco con tutte le novità andava a 7-8 fps. Qui si guarda il tempo dei fotogrammi (media su 1,5 s) e si scende
   a gradini finché non si sta sotto i 33 ms (l'obiettivo è 30 fps), poi si risale piano se avanza margine (sotto 24 ms per 6 s):
     1  la risoluzione della scena al 85%            (R.setRes: la tela del look resta piena, scende solo la scena)
     2  il tratteggio di luce3 spento                (Luce3.imposta(0): l'uniform, il programma non si ricompila)
     3  la risoluzione al 72%; le insegne vive oltre 45 m senza tubi al neon né ombre
     4  la risoluzione al 60% (il minimo del telefono)
   Il gradino si cambia al più ogni 3 s (niente altalena). window.__fluidoTel: lo stato (le sonde). */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  const Q = location.search || '';
  const TEL = /[?&](leggera|bassa)\b/.test(Q) || (!/[?&]alta\b/.test(Q) && (() => { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } })());
  if (!TEL || /[?&](nofluidotel|vecchio)\b/.test(Q)) return;
  const RES = [1, .85, .85, .72, .6], ST = window.__fluidoTel = { gradino: 0, ms: 0, cambi: 0, storia: [] };
  let last = 0, acc = 0, n = 0, t0 = 0, buono = 0, cambio = 0, vicine = true;
  const pv = () => window.__pv, R = () => pv() && pv().R;
  function applica(g) {
    const r = R(); if (!r) return;
    try { if (r.setRes) r.setRes(RES[g]); } catch (e) { }
    try { const L = window.__LUCE3; if (L && L.capace) { if (g >= 2 && L.on) L.imposta(0); else if (g < 2 && !L.on && /[?&]luce3\b/.test(location.search)) L.imposta('a'); } } catch (e) { }
    vicine = g < 3;
  }
  // le insegne vive lontane: niente tubi al neon né ombre oltre 45 m (dal gradino 3; gli aloni li spegne già insegne4 oltre 120 m)
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
    if (document.hidden) { last = now; return; }
    const dt = now - last; last = now; if (dt <= 0 || dt > 1000) return;
    acc += dt; n++; if (!t0) t0 = now;
    if (now - t0 < 1500) return;
    const ms = acc / n; ST.ms = Math.round(ms * 10) / 10; acc = n = 0; t0 = now;
    if (ms < 24) buono += 1500; else buono = 0;
    let g = ST.gradino;
    if (ms > 33 && g < RES.length - 1 && now - cambio > 3000) g++;
    else if (buono >= 6000 && g > 0 && now - cambio > 3000) { g--; buono = 0; }
    if (g !== ST.gradino) { ST.gradino = g; ST.cambi++; cambio = now; ST.storia.push([Math.round(now / 1000), g, ST.ms]); if (ST.storia.length > 20) ST.storia.shift(); applica(g); }
    if ((ST.cambi || !vicine) && n === 0) insegne();
  }
  requestAnimationFrame(giro);
})();
