/* [unico] unico_toppe.js: TOPPE A BUCHI DEI FILE VECCHI, senza toccarli (dietro ?commedia).
   1. Licenziato fra il piano del giorno e l'arrivo al lavoro (mestieri.js:215, mestieri.js:344, popolo.js fire):
      P.job diventa null ma P.workToday resta, e popolo.js:796 legge P.job.title -> crash (visto: seme 2, 72 h).
      Rimedio: su ogni n.pop, «job» diventa un accessorio; quando qualcuno lo mette a null, sparisce anche workToday.
      Il valore resta un campo normale per il salvataggio (enumerabile, si legge come prima). */
var UnicoToppe = (function () {
  'use strict';
  const ON = typeof location !== 'undefined' && /[?&]commedia\b/.test(location.search);
  const UT = { ON };
  if (typeof module !== 'undefined' && module.exports) module.exports = UT;
  if (!ON) return UT;
  const Un = () => (typeof Unico !== 'undefined' && Unico.ON ? Unico : null);
  if (!Un()) { UT.ON = false; return UT; }
  const FATTI = new WeakSet(); let toppe = 0;
  function proteggi(P) {
    if (!P || FATTI.has(P)) return; FATTI.add(P);
    let v = P.job;
    Object.defineProperty(P, 'job', {
      enumerable: true, configurable: true,
      get() { return v; },
      set(x) { v = x; if (x === null || x === undefined) { if (P.workToday) { P.workToday = null; toppe++; } } }
    });
  }
  function fase(st) { const L = st.npcs; if (!L) return; for (let i = 0; i < L.length; i++) { const n = L[i]; if (n && n.pop) proteggi(n.pop); } }
  Un().fase('unico.toppe', { budget: { p95: .05 } }, fase);
  UT.stats = () => ({ toppe });
  return UT;
})();
if (typeof window !== 'undefined') window.UnicoToppe = UnicoToppe;
