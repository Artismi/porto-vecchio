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
