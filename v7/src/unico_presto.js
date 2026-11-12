/* [unico] unico_presto.js: IL CASO INSTRADATO PRESTO (commedia/SISTEMA_UNICO.md §6.1.3, il limite del passo 0).
   Dietro ?commedia. Spento il flag non fa niente (Math.random intatto, nessun nome nuovo).

   Il problema. unico_porta.js instrada Math.random sul flusso «vecchi» dentro il passo, ma si carica dopo i moduli del gioco: chi
   si è tenuto da parte Math.random al caricamento (const rnd = Math.random: azioni, economia, oggetti, eventi, writing, matti, …,
   ventisei moduli) chiama ancora quello vero, e la partita dipende dal caso di fuori (nel passo 0: ~126.000 numeri in 6 ore).

   La soluzione, senza toccare quei file. Questo file si carica PRIMA di game.js e dei moduli del gioco (una riga in index.src.html)
   e mette al posto di Math.random un rinvio: chi se lo tiene da parte tiene il rinvio, e il rinvio a ogni chiamata passa a
   Math.random com'è ADESSO. Prima della porta è quello vero; dopo, è quello della porta (il flusso «vecchi» dentro il passo, il
   caso vero fuori). Una guardia evita il giro chiuso: quando la porta chiede il caso vero (il suo ORIG_RANDOM è questo rinvio) il
   rinvio risponde col caso vero di prima.
   Il costo: una chiamata in più per numero. Fuori dal passo non cambia niente: il disegno e la UI hanno il caso vero. */
var UnicoPresto = (function () {
  'use strict';
  const ON = typeof location !== 'undefined' && /[?&]commedia\b/.test(location.search);
  const P = { ON };
  if (typeof module !== 'undefined' && module.exports) module.exports = P;
  if (!ON) return P;
  if (Math.random && Math.random.__presto) return Math.random.__presto;   // caricato due volte: si tiene il primo
  const VERO = Math.random;
  let dentro = false;
  const rinvio = function () {
    const cur = Math.random;
    if (dentro || cur === rinvio) { P.veri++; return VERO(); }
    dentro = true;
    try { P.rinviati++; return cur(); } finally { dentro = false; }
  };
  rinvio.__presto = P;
  Math.random = rinvio;
  Object.assign(P, { VERO, rinvio, veri: 0, rinviati: 0 });
  return P;
})();
if (typeof window !== 'undefined') window.UnicoPresto = UnicoPresto;
