/* [unico] unico_schermo.js: LO SCHERMO PULITO AL TELEFONO (dietro ?commedia; spento il flag non fa niente).
   La regola della direzione artistica: nel gioco niente copre la vista; testi, chat e avvisi stanno nel menu del personaggio.
   Solo CSS e un osservatore, nessun file del gioco toccato:
     - il pannello della banda (#rs-panel): le righe delle schede vanno a capo pulite (parola.js mette in cima «Chat della banda» e
       la griglia a tre righe del pannello schiacciava le schede sotto il contenuto); aperto il pannello, l'HUD in alto sparisce
     - al telefono: la striscia Morale/Repressione in alto a sinistra, sopra il riquadro dei soldi (non più sopra «In tasca»);
       l'obiettivo in una riga sola; gli avvisi del feed (#feed) un attimo, in una riga troncata (~3 s), e per intero nella
       scheda «Notizie» della Città (Segni.notizia, unico_segni.js), col numero sul bottone del menu. */
(function () {
  'use strict';
  if (typeof location === 'undefined' || !/[?&]commedia\b/.test(location.search) || typeof document === 'undefined') return;
  const TEL = '@media (pointer: coarse), (max-width: 720px)';
  const css = document.createElement('style'); css.id = 'unico-schermo-css'; css.textContent = [
    // il pannello: colonna flessibile (qualunque numero di figli in cima), il corpo prende il resto e scorre
    '#rs-panel:not([hidden]){display:flex !important;flex-direction:column}', '#rs-panel>*{flex:none}', '#rs-panel>.body{flex:1 1 auto;min-height:0}',
    '#rs-panel nav{row-gap:0}', '#rs-panel nav button{white-space:nowrap}',
    'body:has(#rs-panel:not([hidden])) #rs-hud, body:has(#rs-panel:not([hidden])) #debt, body:has(#rs-panel:not([hidden])) #or-obj, body:has(#rs-panel:not([hidden])) #feed{visibility:hidden}',
    // il numero delle novità sullo zaino: in alto a sinistra, ciano, per non confondersi col numero rosa degli oggetti
    '#dock .us-badge{left:-6px !important;top:-6px !important;bottom:auto !important;background:#1f8fa0 !important;color:#fff !important}',
    '#rs-panel .us-nz small{opacity:.7}', '#rs-panel .us-nz.bad{color:#8a2a2a}',
    '@keyframes usToast{0%{opacity:0;transform:translateY(-4px)}8%{opacity:1;transform:none}85%{opacity:1}100%{opacity:0;visibility:hidden}}',
    TEL + '{',
    '  body.or-on #rs-hud{left:8px !important;top:6px !important;transform:none !important;max-width:calc(100vw - 76px);gap:6px;padding:2px 6px;overflow:hidden}',
    '  body.or-on #rs-hud .lbl{font-size:10px !important;letter-spacing:.04em}', '  body.or-on #rs-hud .bar{width:54px}',
    '  body.or-on #debt{top:36px !important}',
    '  body.or-on #or-obj{display:flex !important;align-items:baseline;gap:6px;white-space:nowrap;padding:3px 8px;max-width:calc(100vw - 130px);min-height:0}',
    '  body.or-on #or-obj .lb{font-size:10px;flex:none}', '  body.or-on #or-obj b{font-size:13px;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:0 1 auto}',
    '  body.or-on #or-obj small{font-size:11px;flex:none}',
    '  #feed{gap:0 !important}', '  #feed .fi:nth-child(n+2){display:none !important}',
    '  #feed .fi{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:13px !important;padding:3px 8px !important;animation:usToast 3.2s ease-out forwards !important}',
    '}'].join('\n');
  (document.head || document.documentElement).appendChild(css);
  // il registro: ogni riga nuova di st.feed (oggetti di G.feed) passa una volta sola nelle Notizie
  const viste = new WeakSet();
  setInterval(() => {
    const pv = window.__pv, st = pv && pv.st; if (!st || !st.feed || typeof Segni === 'undefined' || !Segni.notizia) return;
    for (let i = st.feed.length - 1; i >= 0; i--) { const f = st.feed[i]; if (!f || typeof f !== 'object' || viste.has(f)) continue; viste.add(f); if (f.text) Segni.notizia(st, f.text, f.kind); }
  }, 400);
})();
