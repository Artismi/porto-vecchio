# Gli atlanti dei tasselli alla cottura: la proposta

## Il quadro (misurato, sonda `sonda_chi.js`, Game Boy di traverso all'avvio, media di 30 fotogrammi)
Le mesh dei tasselli sono il blocco più grande dei disegni della scena (~300 su ~900) con ~105 materiali in vista. Fra le piccole:
- 29 disegni a fotogramma di quadrati (6 indici) con **5 materiali** soli; 12 di 12 indici con 5 materiali; 12 di 36 indici con 10; 8 con 7.
  Pezzi con lo stesso materiale che la cottura ha lasciato separati (insegne, cartelli, pannelli: `userData.qs`, `tassello`).
- Le grandi: un disegno per materiale per tassello (~25 per tassello in vista).

## Cosa cambiare nella cottura (strumenti/tassella.js, tassella_pagina.js)
1. **Fondere per materiale dentro il tassello anche i pezzi piccoli** che oggi restano soli (salvo quelli che il gioco tocca uno per uno:
   insegne vive, luci che si accendono, pezzi con `userData` di comportamento). Stima: −30/−40 disegni all'avvio, nessun cambio d'aspetto.
2. **Atlanti per famiglia di materiale** (intonaci, pietre, legni, tetti; MeshStandard e MeshLambert separati): le tessiture dei materiali
   «uguali salvo la mappa» in una pila (`DataArrayTexture`, WebGL2) con l'indice nel vertice, oppure in un atlante con le UV rimappate
   (attenzione alla ripetizione: le mappe che si ripetono vanno in pila, non in atlante). Un materiale per famiglia: da ~25 a ~5 disegni
   per tassello. Richiede: lo shader (onBeforeCompile su MeshStandard/Lambert per leggere la pila), il formato dei tasselli (la versione
   dell'indice), il caricatore (tasselli.js materiale()), e la rifinitura dei raggi (rayTas legge il materiale del triangolo: con la pila
   il materiale è uno, il «tipo» va in un attributo).
3. **Tessiture compresse** (KTX2/Basis, già nelle note di FLUIDO3) nella stessa occasione: memoria della scheda video −4×.

Rischio: medio-alto (pipeline di cottura di 12-20 minuti, il formato dei tasselli, gli shader dello stile). Va fatto con chi cura la
cottura e lo stile, con le foto prima/dopo di tre posti.

## Terzo giro: la cottura vera, le misure, e dove mi sono fermato
Cotti i tasselli in questa copia (impronta 70c6815ec9432be3, 177 tasselli, 6.708 mesh prima di unire) tenendo i grezzi, e analizzati con
`strumenti/analisi_tasselli.js`:
- delle 2.995 mesh piccole (≤200 vertici) **993 sono già unibili** e **791 dividono i vettori**; ma unendo per gruppo non cambia niente:
  **3.936 mesh sono sole nel loro gruppo** (un materiale che nel tassello usa solo lei) e **tutte le 819** che dividono i vettori li
  dividono con mesh di un altro gruppo (la sagoma d'ombra delle case fuse). Provato: la cottura con l'unione «per gruppo dei vettori divisi»
  dà gli stessi numeri di quella di prima (2.443 mesh unite in 232, 4.497 mesh in tutto, cotte dagli stessi grezzi): la modifica non serve
  e non l'ho tenuta.
- **Il limite è il numero di materiali**: 830 materiali, e nel tassello quasi uno per mesh. La tavolozza (già nella cottura) unisce i
  materiali uguali a meno del colore. Un atlante (o una pila) per i materiali **uguali a meno della mappa** unirebbe **1.990 materiali-tassello
  in 165 gruppi**: circa **1.800 mesh in meno su 4.497 (−40%)**, i disegni dei tasselli in proporzione.
- Perché non l'ho fatto adesso: 265 delle 656 tessiture si ripetono (un atlante le rompe ai bordi: servono le pile, `sampler2DArray`, con
  le tessiture della stessa misura, o riscalate: l'immagine non resta identica), ogni mappa ha la sua trasformazione delle uv (da cuocere nei
  vertici), e lo shader dei materiali dei tasselli è quello trasformato dello stile (cvs/cfs) che **il direttore artistico sta cambiando in
  questo stesso giro** (luce a fasce, inchiostro): sostituire la lettura della mappa lì dentro adesso vuol dire lavorare sullo stesso codice
  nello stesso momento.

**Il piano, in passi misurabili** (ognuno con la cottura e `analisi_tasselli.js`):
1. nella compressione (tassella.js `unisci`), i gruppi «uguali a meno della mappa» con le mappe **della stessa misura, stesse impostazioni,
   senza trasformazione delle uv**: una pila (`DataArrayTexture`) per gruppo nel `tav`, l'indice dello strato in un attributo (`layer`, 8 bit);
2. nel caricatore (tasselli.js `materiale`), il materiale del gruppo con la pila e il frammento `map_fragment` che legge
   `texture(mapArr, vec3(vUv, vLayer))` — da fare **dopo** che lo stile si è assestato, insieme al direttore artistico;
3. poi le mappe di misure diverse (riscalate alla maggiore nel gruppo: qui l'immagine cambia, va guardata con le foto);
4. le tessiture compresse (KTX2) nella stessa occasione.
