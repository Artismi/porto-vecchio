/* [commedia] Porto Vecchio — parola e azione (vedi commedia/PAROLA_AZIONE.md): prima si prova, poi si parla.
   Tutto dietro ?commedia o ?parola: a interruttore spento questo file non fa niente. Fuori dall'impronta dei tasselli. */
(function () {
  'use strict';
  const ON = typeof location !== 'undefined' && /[?&](commedia|parola)\b/.test(location.search);
  const Parola = { ON };
  if (typeof window !== 'undefined') window.Parola = Parola;
  if (!ON) return;
})();
