# Porto Vecchio — Il lontano della camera bassa ([lontano9], 6-7 novembre)

La camera bassa (`?camera9`, ANALISI_CAMERA9.md) vede l'orizzonte e la città lontana: i disegni salivano da 1,4× a 9× (sbocco dei
Lanternini 309 → 2.691), i triangoli da 1,2× a 3,5×, e la pagina di prova moriva per la memoria allo sbocco dei Lanternini. Tagliare il
piano lontano o avvicinare la nebbia non serviva (2.117 → 2.086): i disegni in più stanno fra 30 e 150 m. Qui il lavoro di chi tiene le
prestazioni: **src/lontano9.js** (nuovo), una riga in render.js (la chiamata prima del disegno, accanto a peso_lontano e peso_scatole),
`src/test_lontano9.js`, le sonde in `_immagini/lontano9/sonde/`.

Solo con camera9 accesa e fuori (non al chiuso, non sotto terra, non alla guida): **la camera di oggi non cambia di un disegno**
(`Lontano9.prima` esce subito se `Camera7.C9.on` è spento; il banco lo conferma, colonna «oggi»). `?nolontano9` spegne tutto
(`?nolontano9occ` solo l'occlusione, `?nolontano9pic` solo le cose piccole), `Lontano9.attivo = false` dal vivo. Gli stili del post
(render.js, «stile») non sono toccati, né gli shader: nessun programma nuovo.

## 0. In breve

| | computer (tasselli) | leggera (tasselli) | leggera, città nel browser |
|---|---|---|---|
| disegni della vista, somma dei 12 posti: oggi → camera9 prima → **dopo** | 5.579 → 14.462 → **6.553** (1,17× oggi) | 6.174 → 14.196 → **6.456** (1,05×) | 5.735 → 16.450 → **6.913** (1,21×) |
| posti entro 1,3× oggi | **8/12** | **9/12** | 7/12 |
| sotto il tetto (computer 800, leggera 400; tutti i passaggi) | **12/12** (oggi 10/12) | 2/12 (oggi 4/12) | 2/12 (oggi 6/12) |
| triangoli per fotogramma, media: oggi → prima → dopo | 1,45 → 2,30 → 1,87 M | 1,52 → 2,11 → 1,76 M | 1,44 → 2,32 → 1,83 M |
| processore (ms, SwiftShader, media dei posti) prima → dopo | 64 → 57 | 61 → 56 | 98 → 84 |
| scheda video allo sbocco, poi in piazza (leggera, nel browser) oggi / prima / dopo | | | 1.190 / 1.650 / **1.423** MB; geometrie 2.590 / 5.125 / **3.091** |

Dove non basta: **lo sbocco dei Lanternini** (computer 303 → 714, 2,4×; nel browser 277 → 823, 3×: la piazza intera è davvero nel
quadro, e i settori della piazza sono secchi grandi visibili), **il lungomare** (1,6-1,9×: le cose del lungomare fra 30 e 75 m si
vedono davvero), **l'Androne del Pozzo Vecchio** (1,5-1,8×) e **piazza San Rocco** (1,3-1,5×). Il tetto di 400 disegni del profilo
leggero non lo rispetta nemmeno la camera di oggi in 8 posti su 12; camera9 dopo lontano9 ci resta in 2. Il tetto di 800 sul computer
regge ovunque.

## 1. Da dove venivano i disegni (misurato)

Ogni disegno della vista con camera9 (`sonde/sonda_analisi9.js`: il genere, il raggio, la distanza dal bordo della sfera, cosa ne
direbbe lontano9), nei posti della tavola:

- **nei vicoli, allo sbocco, nelle fessure** due terzi dei disegni in più sono **dietro le case**: la camera bassa guarda lungo la via
  e il tronco di vista prende tutta la città, ma da 3,7 m le case di due-tre piani la coprono. Three non lo sa (prova solo il frustum).
- **le cose piccole lontane**: insegne, cartelli, vasi, sedie, persone, pezzi dei vicoli vivi a 60-150 m (sul lungomare e dall'alto
  delle scale), 5-15 pixel sullo schermo, nella nebbia.
- **le case fuse e i tasselli**: un secchio (un materiale) per settore di 48 m. La loro **sfera** sporge 34 m sopra il settore: nessuna
  casa la copre mai, e la prova a sfera non li nasconde. La loro **scatola** sì (la cima vera è la gronda più alta del settore).
- **i gruppi di istanze sui tetti** (tetti4: ringhiere, corde, panni, assi; quindici disegni per gruppo di tetti): nella vista bassa
  stanno sopra le case lontane.
- nella città costruita nel browser (senza tasselli, come le misure di camera9) i settori lontani fusi a pezzi (Anelli, al più 24.000
  vertici a pezzo sul profilo leggero) sono **100 disegni a settore**; con i tasselli (la città di difetto) i secchi non sono a pezzi.

## 2. Cosa fa lontano9

### 2.1 L'occlusione delle case (la mappa delle altezze, come la scansione di camera9)

A ogni fotogramma, dalla camera, un **ventaglio di colonne** in pianta sulle direzioni del quadro (una ogni 0,4°: a 50 m 35 cm, le
bocche dei vicoli da 1,7 m restano aperte), da 1 a 300 m (a passi di 1, 2, 4 m). In ogni colonna si tiene, per ogni distanza, la
pendenza più alta del pieno incontrato fin lì (l'«orizzonte» della direzione). Una cosa è nascosta se in **tutte** le colonne che copre
(più una per lato) il pieno davanti a lei sale più in alto della sua cima. Le cose piccole con la sfera, le grandi (raggio oltre 6 m:
i secchi delle case fuse e dei tasselli, il terreno, i gruppi di istanze) con la scatola del mondo (quella dei gruppi di istanze fatta
dalle istanze).

La griglia è **prudente** (un oggetto torna disegnato quando spunta appena da una casa più bassa della vera, quindi non salta):
- solo le case vere, nelle caselle del loro lotto (render.js costruisce il corpo della casa che riempie il lotto: `x0 = b.x * TS`);
- l'altezza è la gronda (Tetti.roofRule) meno 25 cm; sopra, per i tetti a falde (E0, E3), la falda che sale dal bordo del lotto più
  vicino alla casella (la più bassa delle falde possibili: a capanna o a padiglione);
- le case girate solo nelle caselle con i quattro spigoli dentro il lotto girato; niente pezzi (chiesa, opifici: la forma non è un
  blocco), chioschi, faro, gradoni;
- niente volte: sotto gli archi, i sottopassi e i portici (Visuale.mappa) si vede attraverso (il sottopasso del Glacis: la via oltre resta);
- la camera nella casella di una casa (la casella è di 2 m, il braccio la tiene fuori dal muro vero): ogni colonna conta il pieno solo
  dopo esserne uscita.

`src/test_lontano9.js` lo prova contro le case vere (la casella intera, la gronda, il tetto a falde vero, il passo di 25 cm): 10.400 sfere
e 6.000 scatole a caso dalle strade della città, il 30% e il 26% nascoste, **nessuna** con un raggio verso un suo punto che le case vere
lascino passare; il vicolo davanti, la piazza dallo sbocco, il lungomare fino a 80 m e il sottopasso del Glacis restano in vista.

Il costo: le colonne si fanno solo dove serve, e restano quelle del fotogramma prima se la camera è ferma; in Node 0,6 ms a fotogramma
per 1.500 prove e 250 colonne (lo sbocco), su una macchina carica.

### 2.2 Le cose piccole lontane, per genere, senza salti

| genere | taglio (bordo vicino della sfera) | fascia |
|---|---|---|
| piccole (raggio sotto 1,6 m: insegne, cartelli, vasi, sedie, cassette, biciclette, decalcomanie e vetri di una casa sola) | oltre 75 m | 60-75 m |
| persone e animali | oltre 80 m | 65-80 m |
| medie (raggio sotto 4 m: banchi, chioschi, alberelli, barche piccole, gruppi piccoli di istanze) | oltre 120 m | 105-120 m |

Mai: il cielo, il terreno, l'acqua, la sagoma della città (keep, waterMask), chi ha un `onBeforeRender` suo. **La dissolvenza**: nella
fascia la cosa si stringe verso il centro della sua sfera (la scala da 1 a 0, liscia, lungo 15 m), quindi al taglio è già un punto e
non salta. Si fa solo per il disegno della vista (onBeforeRender del prototipo: la matrice del mondo si stringe e torna com'era
subito dopo, in onAfterRender; le ombre e i raggi non la vedono). È una scelta: un retino nello shader avrebbe voluto un pezzo di
programma in ogni materiale (ricompilazioni, gli scatti dei programmi che nascono tardi, e gli shader del look non sono miei); la
stretta non costa niente alla scheda video e a 60-75 m una cosa da 1,6 m è di 5-15 pixel.

### 2.3 Cosa non ho fatto, e perché

- **Un livello lontano per le case fuse** (un'impostora o una mesh sola per settore oltre 60 m). Misurato: dopo l'occlusione i secchi
  dei settori che restano stanno quasi tutti entro 60 m (la sfera di un settore di 48 m tocca i 30 m quando il centro è a 64 m) e oltre
  80 m ne restano 10-50 a posto. Un livello lontano vero (un materiale solo, i colori nei vertici) toglie le finestre e le tessiture
  della città che camera9 vuole mostrare (lo sfondo è il suo scopo); la sagoma dei tasselli (scatole colorate) esiste già e sul telefono
  si usa oltre 105 m dal punto guardato. Fondere di nuovo i pezzi di Anelli (la città nel browser) non si può sul telefono: dopo l'invio
  la copia in memoria è svuotata. Resta da fare se il telefono vero lo chiede: la sagoma per i tasselli oltre 100 m dalla camera (il
  retino degli anelli c'è già).
- **Il piano lontano, la nebbia**: non servono (ANALISI_CAMERA9.md §4) e toglierebbero lo sfondo.

## 3. Le misure

`sonde/sonda_lontano9.js`: i dodici posti della tavola di camera9, la stessa pagina; «oggi» la camera di oggi; «prima» e «dopo»
camera9 **nello stesso stato** (gli stessi tasselli arrivati, lo stesso fotogramma del mondo), senza e con lontano9. Prima di misurare
la sonda aspetta che i tasselli chiesti dalla vista siano arrivati. Disegni e triangoli: la media di due fotogrammi interi, tutti i
passaggi (sul profilo leggero l'ombra del sole si ridisegna a fotogrammi alterni: con un fotogramma solo il conto ballava di 300).
I ms: il processore (G.step + R.frame coi disegni di WebGL spenti, mediana di 16) in SwiftShader su una macchina condivisa con altri
agenti: rumorosi, il segno conta più del numero. I triangoli dei tasselli sono la media dei due fotogrammi.

<!-- TABELLE -->
**Il computer (i tasselli)** (`?tassellivecchi`). «Vista»: i disegni del passaggio principale (quello che lontano9 tocca); «tutti»: tutti i passaggi, ombre comprese, media di due fotogrammi; ms: il processore, mediana di 16 fotogrammi.

| posto | vista oggi | vista camera9 prima | vista camera9 dopo | dopo / oggi | tutti oggi / prima / dopo | triangoli M oggi / prima / dopo | ms oggi / prima / dopo | nascoste / piccole |
|---|---|---|---|---|---|---|---|---|
| vicolo stretto (Caruggio dei Pescatori) | 585 | 1974 (×3.4) | **661** | **1.13** | 701 / 2013 / 692 | 2.08 / 3.09 / 2.42 | 40 / 115 / 88 | 941 / 411 |
| Vico Lungo (a metà) | 620 | 816 (×1.3) | **407** | **0.66** | 825 / 960 / 477 | 1.37 / 1.72 / 1.28 | 52 / 61 / 53 | 364 / 43 |
| piazza San Rocco | 313 | 507 (×1.6) | **452** | 1.44 | 332 / 510 / 440 | 1.16 / 1.98 / 1.84 | 53 / 63 / 68 | 44 / 0 |
| sbocco sulla piazza (Vicolo dei Lanternini) | 303 | 2344 (×7.7) | **714** | 2.36 | 301 / 2328 / 716 | 1.42 / 3.76 / 2.97 | 42 / 93 / 89 | 934 / 634 |
| lungomare | 337 | 910 (×2.7) | **623** | 1.85 | 368 / 907 / 623 | 0.86 / 1.56 / 1.33 | 54 / 55 / 53 | 116 / 161 |
| cima della Scala del Mercato | 791 | 1426 (×1.8) | **709** | **0.90** | 964 / 1464 / 741 | 1.33 / 2.00 / 1.80 | 47 / 52 / 45 | 593 / 151 |
| cima della Scalinata di Vico Lungo | 664 | 1321 (×2.0) | **581** | **0.88** | 694 / 1343 / 588 | 1.89 / 2.31 / 1.92 | 37 / 49 / 48 | 500 / 213 |
| Salita dei Gatti (a metà) | 558 | 1802 (×3.2) | **628** | **1.13** | 558 / 1811 / 638 | 1.89 / 2.81 / 2.34 | 31 / 53 / 42 | 773 / 378 |
| Vico della Corte (fessura 2,2 m) | 517 | 1159 (×2.2) | **548** | **1.06** | 494 / 1199 / 594 | 1.83 / 2.28 / 1.76 | 58 / 52 / 48 | 412 / 167 |
| Corte dei Pescatori (fessura 2,2 m) | 318 | 514 (×1.6) | **372** | **1.17** | 318 / 518 / 360 | 1.42 / 1.99 / 1.68 | 53 / 65 / 64 | 141 / 1 |
| Androne del Pozzo Vecchio (fessura 2,2 m) | 286 | 1225 (×4.3) | **513** | 1.79 | 266 / 1209 / 609 | 0.97 / 2.48 / 1.87 | 31 / 45 / 40 | 498 / 165 |
| sottopasso del Vico del Glacis | 287 | 464 (×1.6) | **345** | **1.20** | 416 / 434 / 315 | 1.19 / 1.57 / 1.29 | 30 / 61 / 51 | 76 / 47 |
| **tutti i 12 posti** | 5579 | 14462 (×2.6) | **6553** | **1.17** | 6237 / 14696 / 6793 | | 44 / 64 / 57 (media) | |

Entro 1,3× la vista di oggi: **8/12** posti. Sotto il tetto di 800 disegni (tutti i passaggi): camera9 dopo 12/12, oggi 10/12.

**Il profilo leggero (?leggera: il telefono, l'Iris Xe; i tasselli)** (`?leggera&tassellivecchi`). «Vista»: i disegni del passaggio principale (quello che lontano9 tocca); «tutti»: tutti i passaggi, ombre comprese, media di due fotogrammi; ms: il processore, mediana di 16 fotogrammi.

| posto | vista oggi | vista camera9 prima | vista camera9 dopo | dopo / oggi | tutti oggi / prima / dopo | triangoli M oggi / prima / dopo | ms oggi / prima / dopo | nascoste / piccole |
|---|---|---|---|---|---|---|---|---|
| vicolo stretto (Caruggio dei Pescatori) | 688 | 1924 (×2.8) | **607** | **0.88** | 708 / 1971 / 703 | 2.11 / 3.00 / 2.37 | 40 / 56 / 62 | 960 / 410 |
| Vico Lungo (a metà) | 651 | 796 (×1.2) | **398** | **0.61** | 736 / 841 / 447 | 1.41 / 1.62 / 1.34 | 48 / 46 / 52 | 351 / 39 |
| piazza San Rocco | 375 | 534 (×1.4) | **484** | **1.29** | 366 / 533 / 478 | 1.42 / 1.69 / 1.65 | 39 / 52 / 63 | 47 / 0 |
| sbocco sulla piazza (Vicolo dei Lanternini) | 384 | 2139 (×5.6) | **715** | 1.86 | 368 / 2216 / 1011 | 1.36 / 3.39 / 2.99 | 37 / 73 / 54 | 814 / 544 |
| lungomare | 439 | 995 (×2.3) | **717** | 1.63 | 597 / 1011 / 729 | 1.07 / 1.42 / 1.24 | 31 / 48 / 29 | 116 / 159 |
| cima della Scala del Mercato | 782 | 1349 (×1.7) | **667** | **0.85** | 807 / 1638 / 701 | 1.46 / 1.91 / 1.65 | 41 / 44 / 51 | 532 / 148 |
| cima della Scalinata di Vico Lungo | 669 | 1246 (×1.9) | **551** | **0.82** | 745 / 1276 / 576 | 1.89 / 2.19 / 1.87 | 46 / 61 / 44 | 461 / 209 |
| Salita dei Gatti (a metà) | 733 | 1799 (×2.5) | **603** | **0.82** | 848 / 1829 / 627 | 1.90 / 2.60 / 2.14 | 50 / 64 / 52 | 780 / 392 |
| Vico della Corte (fessura 2,2 m) | 451 | 1130 (×2.5) | **492** | **1.09** | 572 / 1155 / 493 | 1.56 / 1.88 / 1.54 | 63 / 86 / 70 | 465 / 161 |
| Corte dei Pescatori (fessura 2,2 m) | 373 | 669 (×1.8) | **395** | **1.06** | 417 / 657 / 384 | 1.56 / 2.26 / 1.59 | 55 / 103 / 73 | 260 / 1 |
| Androne del Pozzo Vecchio (fessura 2,2 m) | 331 | 1140 (×3.4) | **490** | 1.48 | 379 / 1162 / 496 | 1.47 / 2.19 / 1.79 | 41 / 47 / 41 | 461 / 142 |
| sottopasso del Vico del Glacis | 298 | 475 (×1.6) | **337** | **1.13** | 296 / 465 / 328 | 1.04 / 1.16 / 1.00 | 26 / 50 / 82 | 95 / 47 |
| **tutti i 12 posti** | 6174 | 14196 (×2.3) | **6456** | **1.05** | 6839 / 14754 / 6973 | | 43 / 61 / 56 (media) | |

Entro 1,3× la vista di oggi: **9/12** posti. Sotto il tetto di 400 disegni (tutti i passaggi): camera9 dopo 2/12, oggi 4/12.

**Il profilo leggero, la città costruita nel browser (?tasselli=0: come le misure di ANALISI_CAMERA9.md)** (`?leggera&tasselli=0`). «Vista»: i disegni del passaggio principale (quello che lontano9 tocca); «tutti»: tutti i passaggi, ombre comprese, media di due fotogrammi; ms: il processore, mediana di 16 fotogrammi.

| posto | vista oggi | vista camera9 prima | vista camera9 dopo | dopo / oggi | tutti oggi / prima / dopo | triangoli M oggi / prima / dopo | ms oggi / prima / dopo | nascoste / piccole |
|---|---|---|---|---|---|---|---|---|
| vicolo stretto (Caruggio dei Pescatori) | 568 | 2248 (×4.0) | **658** | **1.16** | 668 / 2268 / 677 | 1.92 / 3.44 / 2.32 | 113 / 102 / 83 | 1104 / 458 |
| Vico Lungo (a metà) | 677 | 954 (×1.4) | **441** | **0.65** | 851 / 1012 / 500 | 1.40 / 1.62 / 1.38 | 78 / 80 / 70 | 446 / 51 |
| piazza San Rocco | 292 | 503 (×1.7) | **446** | 1.53 | 312 / 499 / 444 | 1.08 / 1.87 / 1.74 | 103 / 92 / 79 | 57 / 0 |
| sbocco sulla piazza (Vicolo dei Lanternini) | 277 | 2707 (×9.8) | **823** | 2.97 | 273 / 2699 / 815 | 1.34 / 3.87 / 2.70 | 128 / 133 / 122 | 1146 / 691 |
| lungomare | 396 | 1092 (×2.8) | **685** | 1.73 | 528 / 1157 / 716 | 1.10 / 1.51 / 1.25 | 59 / 63 / 61 | 184 / 213 |
| cima della Scala del Mercato | 889 | 1649 (×1.9) | **813** | **0.91** | 1177 / 1793 / 906 | 1.76 / 2.37 / 1.94 | 57 / 99 / 90 | 576 / 169 |
| cima della Scalinata di Vico Lungo | 674 | 1430 (×2.1) | **583** | **0.86** | 871 / 1452 / 615 | 2.01 / 2.37 / 1.98 | 92 / 65 / 58 | 573 / 236 |
| Salita dei Gatti (a metà) | 750 | 2193 (×2.9) | **750** | **1.00** | 825 / 2272 / 836 | 2.08 / 3.00 / 2.25 | 65 / 89 / 91 | 953 / 422 |
| Vico della Corte (fessura 2,2 m) | 372 | 1274 (×3.4) | **524** | 1.41 | 399 / 1297 / 601 | 1.07 / 2.10 / 1.59 | 122 / 97 / 127 | 533 / 217 |
| Corte dei Pescatori (fessura 2,2 m) | 280 | 537 (×1.9) | **343** | **1.23** | 269 / 532 / 346 | 1.24 / 1.73 / 1.52 | 118 / 125 / 93 | 134 / 1 |
| Androne del Pozzo Vecchio (fessura 2,2 m) | 272 | 1365 (×5.0) | **500** | 1.84 | 260 / 1363 / 498 | 1.13 / 2.42 / 1.94 | 125 / 149 / 68 | 616 / 201 |
| sottopasso del Vico del Glacis | 288 | 498 (×1.7) | **347** | **1.20** | 349 / 492 / 342 | 1.16 / 1.53 / 1.32 | 78 / 82 / 66 | 105 / 50 |
| **tutti i 12 posti** | 5735 | 16450 (×2.9) | **6913** | **1.21** | 6782 / 16836 / 7296 | | 95 / 98 / 84 (media) | |

Entro 1,3× la vista di oggi: **7/12** posti. Sotto il tetto di 400 disegni (tutti i passaggi): camera9 dopo 2/12, oggi 6/12.
<!-- /TABELLE -->

## 4. La tavola: niente si perde, niente salta

`_immagini/lontano9/tavola_prima_dopo.jpg` (e `_2.jpg`): sei posti (sbocco dei Lanternini, Caruggio dei Pescatori, lungomare, cima della
Scala del Mercato, piazza San Rocco, Corte dei Pescatori), lo stesso fotogramma del mondo, a sinistra camera9 senza lontano9, al centro
con lontano9, a destra la differenza ×4. `striscia_fascia.jpg`: il lungomare passo dopo passo (ogni 2,5 m), sopra senza, in mezzo con,
sotto la differenza: le cose nella fascia si stringono, nessuna salta. I numeri in `_immagini/lontano9/tavola9.json`.

Come si legge: nella differenza restano puntini sparsi (media 0,4-0,7 su 255, sotto lo 0,1% dei pixel oltre 24): il rumore delle
cose che si muovono da sole fra un fotogramma e l'altro (le foglie, l'acqua, le persone lontane), lo stesso che c'è fra due fotogrammi
uguali senza lontano9. Due eccezioni nella foto, e tutte e due sono **l'ombra del sole**, non lontano9: nella Corte dei Pescatori e al
passo 6 della striscia una striscia di sole sul selciato (sul molo) è diversa fra le due foto. L'ho rifatta apposta nella Corte
(`sonde/esegui9.js` con un pezzo che alterna cinque volte spento/acceso/spento/acceso/spento nello stesso fotogramma del mondo): fra
spento e acceso la differenza è media 0,29-0,50 e lo 0-0,25% dei pixel, **uguale** a quella fra spento e spento (0,30-0,48, 0-0,25%).
L'ombra del sole qui si ridisegna a fotogrammi (il gradino della grafica, PesoOmbre): la prima foto aveva l'ombra del posto prima.
Lontano9 non tocca il passaggio delle ombre.

Fra le foto della tavola i disegni (della vista) sono quelli di quel fotogramma; il banco (sez. 3) li misura dopo che i tasselli sono
arrivati tutti, quindi sono più alti.

<!-- TAVOLA -->
| posto | disegni senza → con lontano9 | differenza media (0-255) | pixel che cambiano più di 24 |
|---|---|---|---|
| sbocco sulla piazza (Vicolo dei Lanternini) | 1070 → 366 | 0.531 | 0.013% |
| vicolo stretto (Caruggio dei Pescatori) | 1851 → 546 | 0.517 | 0.003% |
| lungomare | 500 → 330 | 0.412 | 0.017% |
| cima della Scala del Mercato | 1306 → 639 | 0.567 | 0.071% |
| piazza San Rocco | 429 → 395 | 0.645 | 0.022% |
| Corte dei Pescatori (fessura 2,2 m) | 440 → 344 | 10.156 | 10.559% |
| striscia del lungomare (8 passi) | | 4.897 (il passo peggiore) | 4.504% |
<!-- /TAVOLA -->

## 5. La memoria allo sbocco dei Lanternini

**Perché la pagina moriva.** Three manda alla scheda video una geometria, una tessitura, un programma la prima volta che li disegna, e
non li ritira più. Con la camera di oggi la città dietro le case e lontana non entrava mai nel tronco di vista, quindi non saliva mai;
con camera9 sale tutta, già dall'avvio (la vista della partenza: +450 MB) e poi allo sbocco, dove il quadro prende la piazza e la
città dietro (i settori fusi di Anelli, le tele delle insegne e dei vicoli vivi). In SwiftShader la memoria della scheda video è
quella del processo del navigatore, e la pagina di prova ha un tetto: con altri agenti sulla macchina, moriva. Lontano9 non disegna
quello che è dietro le case e le cose piccole lontane, quindi **non le manda nemmeno alla scheda video**: metà della memoria in più di
camera9 resta fuori.

`sonde/sonda_memoria9.js`, una pagina per modo (la memoria non torna indietro), il profilo leggero con la città costruita nel browser
(dove la pagina di camera9 moriva), dal Caruggio dei Pescatori allo sbocco, girando sulla piazza (quattro direzioni) e in piazza:

<!-- MEMORIA -->
| modo | posa | scheda video (MB, il processo di SwiftShader) | pagina (MB) | geometrie sulla scheda | tessiture | programmi |
|---|---|---|---|---|---|---|
| oggi | partenza | 853 | 2903 | 1305 | 218 | 180 |
| oggi | sbocco | 1126 | 2268 | 2088 | 281 | 182 |
| oggi | sbocco → ovest | 1156 | 2391 | 2358 | 293 | 183 |
| oggi | piazza → sud | 1190 | 2459 | 2590 | 314 | 183 |
| camera9_prima | partenza | 1311 | 2812 | 3570 | 611 | 181 |
| camera9_prima | sbocco | 1623 | 2181 | 4890 | 735 | 185 |
| camera9_prima | sbocco → ovest | 1636 | 2186 | 5008 | 758 | 186 |
| camera9_prima | piazza → sud | 1650 | 2224 | 5125 | 773 | 186 |
| camera9_dopo | partenza | 1083 | 2760 | 1915 | 347 | 179 |
| camera9_dopo | sbocco | 1301 | 2219 | 2781 | 478 | 181 |
| camera9_dopo | sbocco → ovest | 1320 | 2363 | 2982 | 492 | 184 |
| camera9_dopo | piazza → sud | 1423 | 2442 | 3091 | 512 | 185 |
<!-- /MEMORIA -->

## 6. Come si prova

- `node src/test_lontano9.js`: l'occlusione prudente (sfere e scatole a caso contro le case vere), la camera sul bordo di una casa, i
  posti della tavola, il costo, le soglie.
- Nel gioco: `index.html?camera9` (con lontano9), `?camera9&nolontano9` (senza); `Lontano9.conto()` in console: prove, nascoste dalle
  case, piccole tagliate, nella fascia, colonne fatte. Sul portatile vero: `strumenti/banco_gpu_console.js` e `banco_ritmo_console.js`
  con `?camera9` e poi `?camera9&nolontano9`.
- Le prove di sempre passano come prima: test_camera7, test_camera9, test_controlli8, test_ritmo8, test_hd_ritmo; test_tasselli ha la
  stessa prova che falliva già sulla base (l'impronta della pagina contro quella dei sorgenti). La prova di fumo (`fumo6.js`) dà
  `errori []` con la camera di oggi e con `&camera9` (la sua foto finale è andata in tempo scaduto sulla macchina carica: la pagina era viva).
- Le sonde (dal cancello comune dei browser): `sonde/sonda_lontano9.js` (il banco), `sonda_analisi9.js` (ogni disegno),
  `sonda_tavola9.js` + `tavola9.py` (la tavola), `sonda_memoria9.js` (la memoria), `riempi9.py` (le tabelle di questo file).
