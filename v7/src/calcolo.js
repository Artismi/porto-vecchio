/* Porto Vecchio — [calcolo] I CONTI FUORI DAL FILO DELLA PAGINA. Un Web Worker (il testo di src/calcolo_lavoratore.js, nella pagina in
   <script type="text/plain" id="calcolo-lavoratore">) fa i conti pesanti che nascono mentre ci si muove e che restituiscono vettori
   tipizzati (trasferiti, senza copia): sul filo della pagina restano solo la raccolta dei dati e il montaggio (tessiture, geometrie),
   dentro i tetti di tempo di chi lo chiama. Senza Worker (o con ?nocalcolo, o se il lavoratore si guasta) gli stessi conti
   (CalcoloF) si fanno qui come prima: il risultato è lo stesso.
   Si usa dai generatori a passi (i blocchi di terreno di render.js): const px = yield* Calcolo.G('luce', dati);
   finché il lavoratore non risponde il generatore dà Calcolo.ATTESA (chi lo fa girare passa al fotogramma dopo).
   window.__calcolo: quanti conti fuori, quanti qui, i ms del lavoratore. */
var Calcolo = (function () {
  'use strict';
  const Q = typeof location !== 'undefined' ? location.search : '';
  const SI = typeof Worker !== 'undefined' && typeof Blob !== 'undefined' && typeof URL !== 'undefined' && typeof document !== 'undefined' && !/[?&]nocalcolo\b/.test(Q);
  const ATTESA = { attesa: true };
  const ST = { fuori: 0, qui: 0, guasti: 0, msFuori: 0, inVolo: 0 };
  let W = null, guasto = !SI, NID = 0; const ATT = new Map();
  function lavoratore() {
    if (W || guasto) return W;
    try {
      const el = document.getElementById('calcolo-lavoratore'); if (!el || !el.textContent) { guasto = true; return null; }
      W = new Worker(URL.createObjectURL(new Blob([el.textContent], { type: 'text/javascript' })));
      W.onmessage = e => { const m = e.data, h = ATT.get(m.id); if (!h) return; ATT.delete(m.id); ST.inVolo--; if (m.err) h.err = m.err; else { h.val = m.val; ST.msFuori += m.ms || 0; } h.fatto = true; };
      W.onerror = e => { console.warn('[calcolo] lavoratore:', e && e.message || e); guasto = true; ST.guasti++; ATT.forEach(h => { h.err = 'lavoratore guasto'; h.fatto = true; }); ATT.clear(); ST.inVolo = 0; try { W.terminate(); } catch (x) { } W = null; };
    } catch (e) { console.warn('[calcolo] niente lavoratore:', e); guasto = true; W = null; }
    return W;
  }
  // il conto qui, sul filo della pagina (come prima)
  function qui(op, a) { ST.qui++; return CalcoloF[op](a); }
  // dentro un generatore: yield* G(op, a). I dati si copiano (niente trasferimento): se il lavoratore si guasta il conto si rifà qui
  function* G(op, a) {
    const w = lavoratore(); if (!w) return qui(op, a);
    const h = { fatto: false, val: null, err: null }, id = ++NID; ATT.set(id, h); ST.inVolo++;
    try { w.postMessage({ id, op, a }); } catch (e) { ATT.delete(id); ST.inVolo--; h.err = String(e); h.fatto = true; }
    while (!h.fatto) yield ATTESA;
    if (h.err) { ST.guasti++; console.warn('[calcolo]', op, h.err); return qui(op, a); }
    ST.fuori++; return h.val;
  }
  const stato = () => Object.assign({ lavoratore: !!W, guasto }, ST, { msFuori: Math.round(ST.msFuori) });
  if (typeof window !== 'undefined') Object.defineProperty(window, '__calcolo', { get: stato, configurable: true });
  return { ATTESA, G, qui, stato, get attivo() { return !guasto; } };
})();
