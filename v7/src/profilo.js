/* Porto Vecchio — [profilo] IL PROFILO LEGGERO SULLE SCHEDE INTEGRATE, DECISO PRIMA DI TUTTO (v7).
   Il profilo leggero (render.js PHONE, leggera_memoria.js, peso_*: 2 faretti senza ombra, la mappa del sole più piccola, la risoluzione
   interna sul lato corto, le mappe a metà) si accendeva solo col tocco o con ?leggera. Su un portatile con la grafica integrata il profilo
   pieno non regge: Intel Iris Xe (D3D11) a 7 fps, 113 ms di processore e 60 ms di scheda per fotogramma (il riquadro F3 del committente).
   Qui, prima di ogni altro modulo (tutti leggono location.search quando si caricano): un contesto WebGL usa e getta legge il nome della
   scheda; se è integrata o in software si aggiunge «leggera» all'indirizzo (history.replaceState, la pagina non si ricarica) e ogni modulo
   sceglie il profilo leggero come sul telefono. I comandi restano quelli del computer (li decide il puntatore, non ?leggera).
   ?alta (o ?piena) tiene il profilo pieno; ?leggera lo forza. window.PV_PROFILO dice cosa si è scelto e perché.                          */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const P = window.PV_PROFILO = { profilo: 'pieno', motivo: '', scheda: '' };
  let q = '';
  try { q = location.search || ''; } catch (e) { return; }
  if (/[?&](alta|piena)\b/.test(q)) { P.motivo = '?alta'; return; }
  if (/[?&](leggera|bassa)\b/.test(q)) { P.profilo = 'leggera'; P.motivo = '?leggera'; return; }
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
