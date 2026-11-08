/* [commedia] Porto Vecchio — la regia della commedia (vedi REGIA_COMMEDIA.md, commedia/TONO.md).
   Tutto dietro ?commedia: a interruttore spento questo file non fa niente. Fuori dall'impronta dei tasselli (build.py TASS_FUORI). */
(function () {
  'use strict';
  const ON = typeof location !== 'undefined' && /[?&]commedia\b/.test(location.search);
  const Commedia = { ON };
  if (typeof window !== 'undefined') window.Commedia = Commedia;
  if (!ON) return;
})();
