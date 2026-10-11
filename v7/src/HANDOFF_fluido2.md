# Porto Vecchio — Alleggerire senza toccare la grafica (11 ottobre, seguito)

Ripartito da `claude/ecstatic-allen-7ogtfr` (che aveva già: bolla di dettaglio, canvas in memoria normale, shader compilati
all'avvio, profilo telefono, risoluzione dinamica). Da `claude/keen-turing-peeudm` è stato tenuto solo quello che mancava.

## Fatto
- **Il misuratore per modulo** (`misura.js`, solo con `?perf`): cronometra ogni aggancio del motore (HOOKS.step, move,
  think…, col tempo proprio), ogni ciclo a fotogramma di ogni modulo e ogni timer, attribuiti al file (`<script data-m>`).
  F3 mostra la classifica dei più pesanti. Senza `?perf` non si installa.
- **La bolla copre lo schermo**: `main.js viewRadius()` misura quanto si vede (angoli dello schermo sul terreno) e
  `game.js bubble()` non scende mai sotto: a zoom largo chi è sul bordo non cammina a scatti. I mezzi fermi e lontani
  non si calcolano.
- **Tetti a pezzi** (`tetti.js scanStart/scanWork`): la misura dei tetti (un raggio ogni metro contro i triangoli del
  modello, centinaia per casa) avanza riga per riga con 1,5 ms per fotogramma (3 sul tetto), invece di due case intere
  ogni 60 ms.
- **I graffiti si disegnano in un thread a parte** (`writing.js artFor`, Web Worker con writer_mano.js e writer_arte.js
  copiati in `<script id="pv-artworker" type="text/plain">`): generare un lavoro costava 50-210 ms e fermava il gioco
  avvicinandosi ai muri dipinti. Stesso disegno (stessi file, stessi semi, stesse firme passate al worker); i lavori
  finiti restano in memoria (48). Senza Worker o OffscreenCanvas si fa come prima.

## Misure (Chromium senza scheda video: valgono i rapporti, non i valori)
A regime, ciclo per ciclo: writing 344 ms medi prima della prossima correzione (vedi sotto), tetti 4, Risacca 3.
Profilo a regime, il peso che resta è **lavoro che parte quando qualcosa entra nel raggio del giocatore**:
- `writing.js placeWall` → `rayWall`/`wallRect`: raggi contro i triangoli degli edifici per piazzare i graffiti (~4,5%).
- `vestiario.js Models.person`/`dress`: i vestiti costruiti addosso a chi si avvicina (~2,9%).
- `pittura.js paint`/`paintAt`: le stoffe dipinte (~2,8%).
- `buildChunk` (vegetazione): i blocchi di piante che entrano in zona (~2,2%).

## Prossimi passi (piano)
1. **Una coda unica di "costruzioni"** con un tetto per fotogramma (2-3 ms), in ordine di distanza: personaggi, vestiti,
   stoffe, blocchi di piante, veli dei graffiti, misure dei muri. Niente si costruisce tutto insieme: entra un pezzo per
   fotogramma, prima il più vicino.
2. **Riciclo invece di ricostruzione**: i personaggi e i loro vestiti tenuti in una riserva quando escono dalla bolla
   (ritornano senza rifarli); le stoffe dipinte in memoria per capo e colore.
3. **Raggi più furbi**: per i muri dei graffiti e per i tetti una griglia degli edifici (si prova solo l'edificio della
   casella), o la quota letta da una mappa di profondità resa una volta.
4. **Il direttore d'orchestra**: i 10 cicli dei moduli e i 6 timer in un solo calendario, ogni compito con la sua
   frequenza (fotogramma, 4-10 volte al secondo, 1 al secondo, una volta al minuto di gioco).
5. **Passo fisso a 30 Hz con movimento interpolato**, se dopo i punti sopra la logica pesa ancora.
