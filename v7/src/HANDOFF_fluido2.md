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

## Le costruzioni a budget e il riciclo (fatto, punto 1 e parte del 2)
- `render.js` `BUD` (anche `window.Costruzioni`): 3 ms per fotogramma per tutto quello che nasce mentre si gioca. Ogni
  costruzione chiede `ok(distanza, tipo)` e dichiara `add(ms, tipo)`. Passa sempre chi è a meno di 20 m; a turno ogni
  tipo (`gente`, `mezzi`, `piante`, `graffiti`) ha almeno una costruzione ogni 4 fotogrammi, così nessuno resta a secco.
  Collegati: i personaggi (modello, vestiti, stoffe), i mezzi, i blocchi di piante lontani (oltre 70 m: si vedono da 62),
  i graffiti (`placeWall` e il velo, in `writing.js`).
- **Riciclo dei personaggi** (`PEOPLE_KEEP`): chi esce dalla bolla di `popolo.js` resta da parte (gli ultimi 40) e torna già
  vestito, invece di ricostruire modello, vestiti e stoffe.
- Un singolo personaggio che costa più del budget si costruisce comunque intero (non si spezza a metà): il budget evita che
  se ne costruiscano tanti nello stesso fotogramma.

## Raggi veloci (fatto, punto 3)
- `mesh_bvh.js`: three-mesh-bvh 0.5.24 (MIT), caricato dopo three.min.js. `render.js` sostituisce `Mesh.prototype.raycast`:
  ogni geometria con più di 300 triangoli riceve un indice spaziale al secondo raggio che la colpisce; da lì un raggio tocca
  poche decine di triangoli invece di tutti. Restano col metodo di prima i personaggi animati, le forme con morph, le
  geometrie disegnate a metà (drawRange) e quelle modificate dopo (si accorge dalla versione degli attributi e torna indietro).
- Prova nel browser: 300 raggi sulla città, **300/300 risultati identici** (oggetto, distanza, materiale, uv), 4,3 volte più
  veloci anche provando tutte le 16.000 mesh insieme. Servono a tetti, graffiti, bomboletta, tavoletta, clic e tocchi.

## Vestire a rate (fatto)
- `vestiario.js dressGen`: il vestire è un generatore in fasi (sartoria, parti coperte, gusci, pittura, accessori). `dress`
  le fa tutte subito (giocatore, ritratti); in strada `render.js` chiede `Models.__aRate` e l'abitante si veste una fase per
  fotogramma (budget, tipo `vesti`), invisibile finché non ha finito (compare a 52 m, come prima, qualche fotogramma dopo).
- Prova: 6 abitanti vestiti subito e a rate, **6/6 identici** (mesh, vertici, materiali).

## Blocchi di terreno e piante a fasi (fatto)
- `render.js buildChunkGen`: un blocco (32 × 32 caselle) si costruisce in 9 fasi (dipinto del terreno in tre passate,
  scabrosità, geometria, luce cotta, vegetazione, bosco, verde) e va in scena solo finito; intanto resta il vecchio (o la
  base a bassa risoluzione, come prima). `updateChunks` porta avanti un lavoro alla volta (`ISO.job`): lontano una fase
  quando c'è tempo, vicino (meno di 70 m) almeno una per fotogramma e di più se il budget lo concede (fino a 4 ms).
  Nella schermata iniziale (`ISO.rush`) si fanno interi come prima. Se la mappa cambia a metà, il blocco si rifà.

## Ombre dei faretti quando serve (fatto)
- `render.js updateLights`: prima 3 faretti a turno ridisegnavano l'ombra a ogni fotogramma (ognuno circa 15 volte al
  secondo), anche nelle strade vuote. Ora: chi ha nel suo raggio qualcosa che si muove (gente, mezzi, il giocatore) subito,
  con la precedenza (fino a 3 per fotogramma); gli altri due volte al secondo (le chiome nel vento). `SHMOV` raccoglie chi si muove.

## Dove siamo (misure a regime, Chromium senza scheda video: contano i rapporti)
- Ciclo dei graffiti: da 344 a 60 ms per fotogramma; Risacca 6, tetti 2: i cicli dei moduli ora sono leggeri.
- Quello che resta in cima: il disegno della scena (scheda video), la costruzione dei personaggi (ora a fasi) e dei blocchi
  di piante col terreno dipinto (`buildChunk`, `paintTiles`, `verde38`, `prato38`).
- Il calendario unico (punto 4) vale poco con questi numeri: si decide con la classifica di F3 (`?perf`) sul PC vero.

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
