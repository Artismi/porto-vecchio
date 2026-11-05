/* Porto Vecchio — [profilo] IL PROFILO LEGGERO SULLE SCHEDE INTEGRATE, DECISO PRIMA DI TUTTO (v7).
   Il profilo leggero (render.js PHONE, leggera_memoria.js, peso_*: 2 faretti senza ombra, la mappa del sole più piccola, la risoluzione
   interna sul lato corto, le mappe a metà) si accendeva solo col tocco o con ?leggera. Su un portatile con la grafica integrata il profilo
   pieno non regge: Intel Iris Xe (D3D11) a 7 fps, 113 ms di processore e 60 ms di scheda per fotogramma (il riquadro F3 del committente).
   Qui, prima di ogni altro modulo (tutti leggono location.search quando si caricano): un contesto WebGL usa e getta legge il nome della
   scheda; se è integrata o in software si aggiunge «leggera» all'indirizzo (history.replaceState, la pagina non si ricarica) e ogni modulo
   sceglie il profilo leggero come sul telefono. I comandi restano quelli del computer (li decide il puntatore, non ?leggera).
   ?alta (o ?piena) tiene il profilo pieno; ?leggera lo forza. window.PV_PROFILO dice cosa si è scelto e perché.                          */
/* [hd] GLI INTERRUTTORI DELL'IMMAGINE HD, decisi qui prima di tutti i moduli (v7/ANALISI_HD.md). window.PV_HD.on(nome): vero se il passo
   è acceso. ?hd=0 li spegne tutti (il gioco di prima, identico); ?<nome>=0 uno solo:
     foschia  il colore dell'aria del passo unico (era sempre grigio .8: il lontano lattiginoso di sera e di notte)
     regola   i regolatori a qualità stabile (la grafica ridotta a gradini senza toccare la risoluzione né spegnere le ombre, il contesto
              perso vale per la sessione, la scala fine a passi del 5% con la soglia delle 640 righe, i dettagli misurati in pixel stabili)
     upscale  la tela alla risoluzione vera dello schermo e un passo che ingrandisce nitido (Catmull-Rom con la pinza dei vicini)
     hdaa     MSAA 2× nel profilo leggero al posto dell'FXAA, i fili dalla profondità con il peso di copertura
     pulito   le trame pulite: niente puntini al texel, le mappe dei tetti a 32 px/m, anisotropia 8, i vestiti filtrati
     risdin   la risoluzione interna dinamica fra 640 e 1080 righe (dentro «regola»)
     hdombre  l'ombra del sole più fine sopra le 900 righe, chi si muove aggiornato a ogni fotogramma                                  */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  let q = ''; try { q = location.search || ''; } catch (e) { q = ''; }
  const tutto = !/[?&]hd=0\b/.test(q);
  window.PV_HD = { on: k => tutto && (!k || !new RegExp('[?&]' + k + '=0\\b').test(q)), tutto };
})();
/* [ritmo8] GLI INTERRUTTORI DEL RITMO (v7/ANALISI_RITMO8.md): window.PV_R8.on(nome) vero se la correzione è accesa. ?noritmo8 le spegne
   tutte (il gioco di prima, identico); ?noritmo8<nome> una sola:
     raggi    il braccio di camera7: i raggi uguali nello stesso fotogramma una volta sola; le mesh senza posizioni (il verde lontano) saltate;
              nei tasselli le celle che il raggio passa sopra o sotto saltate
     arte     il disegnatore dei graffiti a parte (worker) con le tele lette dal processore (willReadFrequently): non muore più per lentezza
     griglie  le griglie dei raggi dei tasselli preparate a fette prima che il braccio le tocchi; i colpi fuori portata scartati senza allocare
     pile     le tessiture a strati grandi dei tasselli mandate alla scheda video a fette (pochi strati per fotogramma)                    */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  let q = ''; try { q = location.search || ''; } catch (e) { q = ''; }
  const tutto = !/[?&]noritmo8(&|$)/.test(q);
  window.PV_R8 = { on: k => tutto && (!k || !new RegExp('[?&]noritmo8' + k + '\\b').test(q)), tutto };
})();
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const P = window.PV_PROFILO = { profilo: 'pieno', motivo: '', scheda: '' };
  let q = '';
  try { q = location.search || ''; } catch (e) { return; }
  if (/[?&](alta|piena)\b/.test(q)) { P.motivo = '?alta'; return; }
  if (/[?&](leggera|bassa)\b/.test(q)) { P.profilo = 'leggera'; P.motivo = '?leggera'; return; }
  // il forno dei tasselli (strumenti/tassella.js), i banchi e le sonde girano in un browser automatico in software: lì il profilo resta
  // quello che chiede l'indirizzo (la città a tasselli si cuoce col profilo pieno, e le misure restano confrontabili con le vecchie)
  try { if (navigator.webdriver) { P.motivo = 'browser automatico'; return; } } catch (e) { }
  // il nome della scheda: un contesto minimo, letto e subito restituito (avvio.js lo ritrova in PV_GPU_NOME, senza chiederlo di nuovo)
  let nome = '';
  try {
    const c = document.createElement('canvas'); c.width = c.height = 1;
    const gl = c.getContext('webgl', { failIfMajorPerformanceCaveat: false, powerPreference: 'high-performance' }) || c.getContext('experimental-webgl');
    if (gl) {
      const e = gl.getExtension('WEBGL_debug_renderer_info');
      nome = String(e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
      const lc = gl.getExtension('WEBGL_lose_context'); if (lc) lc.loseContext();
    }
  } catch (e) { nome = ''; }
  P.scheda = nome; if (nome) window.PV_GPU_NOME = nome;
  const n = nome.toLowerCase();
  // integrate e in software: Intel (non le Arc da tavolo), le AMD dei processori («Radeon(TM) Graphics», Vega), i disegnatori in software
  const soft = /swiftshader|llvmpipe|softpipe|software|microsoft basic/.test(n);
  const intel = /intel/.test(n) && !/arc\(tm\)\s*a\d|arc a\d/.test(n);
  const apu = /radeon\(tm\) graphics|radeon graphics|radeon vega|vega \d+ graphics|radeon\(tm\) (\d{3}m|610m|660m|680m|760m|780m)/.test(n);
  if (!(soft || intel || apu)) { P.motivo = nome ? 'scheda dedicata' : 'scheda sconosciuta'; return; }
  P.profilo = 'leggera'; P.motivo = soft ? 'in software' : 'scheda integrata';
  try {
    const u = new URL(location.href);
    u.search = (u.search ? u.search + '&' : '?') + 'leggera';
    history.replaceState(history.state, '', u.toString());
  } catch (e) { P.profilo = 'pieno'; P.motivo = 'indirizzo non modificabile'; }
  try { console.log('[profilo]', P.profilo, '·', P.motivo, '·', nome); } catch (e) { }
})();
