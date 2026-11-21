/* Porto Vecchio — [errori] IL REGISTRO DEGLI ERRORI ZITTITI (squadra/codice, ANALISI.md §5).
   Nei cicli di ogni fotogramma alcuni pezzi stanno dentro try { … } catch (e) { }: se si rompono, il gioco va avanti e nessuno lo sa
   (un errore che si ripete 30 volte al secondo resta invisibile). Qui il catch resta com'è (l'errore non esce, il gioco fa le stesse
   cose), ma lo annota: la PRIMA volta per ogni posto un console.warn, poi solo il conto. Nessun cambio di comportamento.
   window.__errori = { n, posti: { 'cielo.frame': { n, primo, ultimo } } }: lo leggono le sonde e la console.
   Nei moduli: catch (e) { if (typeof Errori !== 'undefined') Errori.nota('modulo.posto', e); }   (in Node, senza questo file, niente) */
var Errori = (function () {
  'use strict';
  const R = { n: 0, posti: {} };
  function nota(dove, e) {
    try {
      const p = R.posti[dove] || (R.posti[dove] = { n: 0, primo: 0, ultimo: '' });
      p.n++; R.n++; p.ultimo = String((e && e.message) || e).slice(0, 200);
      if (p.n === 1) { p.primo = typeof performance !== 'undefined' ? Math.round(performance.now()) : 0; if (typeof console !== 'undefined') console.warn('[errori] ' + dove + ' (le volte dopo si contano soltanto: window.__errori)', e); }
    } catch (_) { /* il registro non deve mai rompere chi lo chiama */ }
  }
  if (typeof window !== 'undefined') window.__errori = R;
  return { nota, R };
})();
if (typeof module !== 'undefined') module.exports = Errori;
