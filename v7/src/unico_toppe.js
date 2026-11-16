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
  // C2 (vita1): se il gioco ha G.entra/G.esci, i verbi entra/esci del sistema unico passano da lì (porta, portiera, n.dove)
  let c2 = 0;
  (function c2Verbi() {
    const V = Un().Verbo || (typeof Verbo !== 'undefined' ? Verbo : null);
    if (!V || !V.EFF || typeof G === 'undefined') return;
    const E0 = V.EFF.entra, X0 = V.EFF.esci;
    if (E0) V.EFF.entra = function (c, b) { E0.apply(this, arguments); const n = c && c.A && c.A.o; if (n && n !== c.st.player && typeof G.entra === 'function' && c.A.dove && c.A.dove.k === 'dentro') { G.entra(n, 'casa', c.A.dove.b); c2++; } };
    if (X0) V.EFF.esci = function (c) { const n = c && c.A && c.A.o, x = n && n.x, y = n && n.y; X0.apply(this, arguments); if (n && n !== c.st.player && typeof G.esci === 'function' && n.dove && n.dove !== 'fuori') { G.esci(n, { x: n.x != null ? n.x : x, y: n.y != null ? n.y : y }, c.st); c2++; } };
  })();
  UT.stats = () => ({ toppe, c2 });
  return UT;
})();
if (typeof window !== 'undefined') window.UnicoToppe = UnicoToppe;
