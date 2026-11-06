# Porto Vecchio — La camera bassa ([camera9], 6 novembre)

Il committente: «LA CAMERA RIMANE TROPPO ALTA E QUINDI LA VISUALE CHIUSA». Nel gioco vero la vista guarda quasi dritta in giù: niente
cielo, niente orizzonte, niente fondale, ogni quadro è chiuso e stretto. Vuole un quadro composto come un'inquadratura di cinema,
equilibrato, **con uno sfondo** (cielo, orizzonte, la città lontana nella parte alta del quadro).

`?camera9` accende la camera nuova, `?nocamera9` la spegne (vince sull'altro); di difetto resta la camera di oggi (camera7) finché il
committente non approva. Dal vivo: `Camera7.C9.on = true/false`, le manopole in `Camera7.K9` (`window.__CAMERA7` resta quella di camera7).

## 1. Perché era così ripida (misurato)

### 1.1 Anche a braccio pieno l'orizzonte non c'era mai

La pendenza nominale di camera7 è 34°, il campo verticale 46° (16:9): il bordo alto del quadro sta **11° sotto l'orizzonte**. Sul
computer l'orizzonte non entra mai nel quadro, nemmeno in piazza o sul lungomare a braccio pieno; solo sul telefono in verticale (campo
verticale 80°) il bordo alto arriva 6° sopra l'orizzonte. Il campo (`vfov`) non è il colpevole: è la pendenza. L'urbanista l'ha misurato
dall'altra parte (v7/URBANISTICA.md, worktree dell'urbanista): con la camera di oggi un landmark entra nel quadro il **2%** del tempo di
cammino; con una camera a 18° e 7 m il 26%, a 15° il 31%.

### 1.2 Nei vicoli diventava 40-50°: le salite e il braccio corto

Il registro di `passo()` nel gioco vero, a piedi coi tasti (il pilota umano di controlli8), stessa pagina, stessi percorsi
(`_immagini/camera9/misura_oggi.json`, `distribuzioni.json`): «vista» è la pendenza vera della vista (giù dall'orizzonte), «salita» i
fotogrammi con `K.lifts` in azione, «corto» quelli con la rampa di `K.close` (braccio sotto 6,5 m).

<!-- TABELLA_OGGI -->
| percorso | camera | vista p50 / p90 / max | braccio m p50 / p10 / min | salita | corto | vista > 40° | orizzonte nel quadro | sfondo (terzo alto) | piedi sullo schermo (dall'alto) | salto della vista max (per fotogramma da 0,1 s) |
|---|---|---|---|---|---|---|---|---|---|---|
| Caruggio dei Pescatori (1,7 m) | oggi | 34° / 50° / 50° | 10.0 / 9.0 / 3.2 | 31% | 6% | 30% | 0% | 0% (0%) | 0.71 | 16.0° |
| Vico Lungo (scalini al mare) | oggi | 34° / 44° / 50° | 10.0 / 9.3 / 1.5 | 23% | 5% | 11% | 0% | 0% (0%) | 0.71 | 13.1° |
| Vicolo dei Lanternini → piazza | oggi | 34° / 50° / 50° | 10.0 / 2.3 / 1.6 | 29% | 26% | 42% | 0% | 0% (0%) | 0.71 | 16.0° |
<!-- /TABELLA_OGGI -->

I colpevoli, nell'ordine:

1. **Le salite (`K.lifts`: +6°, +12°, +16°)**. Quando il raggio a braccio pieno tocca qualcosa (la casa dietro l'angolo, una gronda, un
   balcone: i colpi sono quasi tutti sulle mesh fuse della città, `fusione1`, raggio 30 m, `colpi_oggi.json`), camera7 prova PRIMA a
   salire e solo dopo ad accorciare. Nei vicoli è il 23-31% dei fotogrammi: 34° + 16° = **50°, col braccio di 10 m la camera a 8,8 m**,
   sopra le gronde. È il «quasi dall'alto» delle foto del committente. Il salto da 34° a 50° arriva in 0,45 s (la molla) e torna giù dopo
   1,5 s libero: nel Caruggio dei Pescatori la vista cambia fino a 16° in un fotogramma da 0,1 s.
2. **La rampa del braccio corto (`K.close`: sotto 6,5 m la pendenza sale fino a 50° a 3,5 m)**. Allo sbocco dei Lanternini il 26% dei
   fotogrammi; nelle fessure dell'urbanista (Corte dei Pescatori, Androne del Pozzo Vecchio) il braccio crolla al minimo, 1,2 m, a 50°:
   il personaggio riempie lo schermo visto dalla nuca (tavola, righe 10-11), in piazza San Rocco presso la bocca dei Lanternini la camera
   finisce **dentro il muro** e si vede la sagoma (tavola, riga 3).
3. `K.armMin` 1,2 m e il campo fisso (46°) nei posti stretti: il braccio corto non allarga il quadro, lo chiude.

## 2. Cosa fa camera9 (src/camera7.js `passo9`, `K9`; render.js `camera7Frame`)

Tutto dentro `camera7.js`, accanto a camera7 (la testa del passo è comune: `testa()`, lo yaw, il ricentro, la mira, la velocità
smussata sono gli stessi, a numeri identici; `test_camera9.js` prova che lo yaw di camera9 è quello di camera7 al decimo di nanoradiante,
quindi i comandi rispetto alla vista di controlli8 non cambiano).

| | camera7 (oggi) | camera9 |
|---|---|---|
| braccio pieno | 10 m | **7,5 m** |
| pendenza del braccio | 34° (±12° del giocatore) | **20°** (da 8° a 32° col giocatore) |
| pendenza della vista | 34° (la vista guarda il busto) | **~15°**: la vista guarda più su del braccio, il busto a `K9.compY` = 60% dello schermo dall'alto |
| camera sopra la strada | 6,7 m | **3,7 m** |
| orizzonte nel quadro (16:9) | mai (bordo alto 11° sotto) | **al 22% dall'alto**, anche camminando e correndo |
| personaggio | busto al 50%, piedi 61% | busto 60%, piedi 75%; alto il 23% dello schermo (oggi 12%) |
| campo verticale | 46° | **50°**, fino a **58°** col braccio corto (`K9.vfovCorto`) |
| sguardo avanti | 1,5 m avanti lungo la marcia (la camera avanzava con lui) | solo di lato (`K8.aheadLat`): in avanti la camera bassa ha già la via nella metà alta; il braccio che avanzava col punto guardato abbassava il personaggio al 72% e chiudeva l'orizzonte |
| vicolo chiuso dietro | PRIMA sale (fino a +16°), poi accorcia | PRIMA **la spalla** (di lato fino a 0,8 m, quanto posto c'è accanto al busto), POI **il braccio corto** col campo che si allarga, la salita **solo se il braccio scenderebbe sotto 3 m** (+6° o +12°) |
| braccio corto | sale a 50° a 3,5 m | sale a 30° a 2,2 m (rampa liscia), busto al 45% (i piedi nel quadro) |
| la più ripida | 50° (+ la salita) | **34°** (`K9.liftCap`: mai oltre la camera7 a braccio pieno) |
| scale in discesa | il raggio sbatte sui gradini, braccio corto, sale | la pendenza sale col suolo dietro (`K9.terra` 1,5 m sopra il suolo sotto la camera; molla 0,25 s in salita, 0,9 s in discesa: niente tuffi in cima) |
| braccio che esce | molla 0,6 s, subito | molla 0,9 s, solo dopo 0,4 s senza colpi (`K9.armTieni`): all'angolo non esce e rientra |
| piano lontano | 300 m (il telefono: la nebbia + 5) | la nebbia piena + 10 m (`K9.lontano`) |

Le cose piccole fra la camera e te restano come in camera7, e con la camera bassa contano di più: i banchi, le tende e i cartelli
registrati (`DZ.props`) si spengono finché coprono (`cose7`), le chiome hanno il retino (`fade7`, `uR7`) e non fermano il braccio, le mesh
piccole (raggio sotto 3,5 m, l'arredo delle vie vive) non fermano il braccio, il personaggio coperto si vede in sagoma. **Non toccato**:
gli stili di render.js (il look è di un altro agente), la nebbia (stessa distanza di camera7; `K9.nebbia` è una manopola, di difetto 1).

### 2.1 La prima prova e cosa ha insegnato

La prima versione (registro in `misura_c9_v1.json` nello scratchpad, non tenuto) allo sbocco dei Lanternini dava 43° di vista per
qualche fotogramma: all'angolo il braccio usciva e rientrava (7,3 → 2,4 m in 0,1 s), la spalla sfarfallava (+0,8 → -0,2 → +0,8), la
salita arrivava a 40°, e la spalla di 0,8 m in un vicolo da 1,7 m metteva l'origine del raggio **nel muro** (braccio a 1,6 m). Da qui
`K9.liftCap` 34°, la tenuta del braccio, la spalla che non cambia lato prima di 0,8 s e che si sposta solo quanto posto c'è (un raggio di
lato dal busto), le prove `4b` e `3b` di `test_camera9.js`.

## 3. Le misure: oggi e camera9

Gli stessi percorsi, la stessa pagina (`Camera7.C9.on` cambiato dal vivo), 10 fotogrammi al secondo, il profilo leggero
(`?leggera&tassellivecchi`; la macchina era condivisa con altri agenti). «Sfondo» è la parte del quadro che vede oltre 60 m o il cielo
(una griglia di 16×9 raggi contro la mappa delle case e il suolo), tra parentesi quella del terzo alto.

<!-- TABELLA_TUTTO -->
| percorso | camera | vista p50 / p90 / max | braccio m p50 / p10 / min | salita | corto | vista > 40° | orizzonte nel quadro | sfondo (terzo alto) | piedi sullo schermo (dall'alto) | salto della vista max (per fotogramma da 0,1 s) |
|---|---|---|---|---|---|---|---|---|---|---|
| Caruggio dei Pescatori (1,7 m) | oggi | 34° / 50° / 50° | 10.0 / 9.0 / 3.2 | 31% | 6% | 30% | 0% | 0% (0%) | 0.71 | 16.0° |
| Caruggio dei Pescatori (1,7 m) | camera9 | 15° / 30° / 30° | 7.5 / 2.9 / 2.9 | 0% | 24% | 0% | 87% | 2% (6%) | 0.75 | 7.9° |
| Vico Lungo (scalini al mare) | oggi | 34° / 44° / 50° | 10.0 / 9.3 / 1.5 | 23% | 5% | 11% | 0% | 0% (0%) | 0.71 | 13.1° |
| Vico Lungo (scalini al mare) | camera9 | 15° / 15° / 33° | 7.5 / 5.3 / 1.6 | 0% | 11% | 0% | 91% | 4% (10%) | 0.75 | 18.5° |
| Vicolo dei Lanternini → piazza | oggi | 34° / 50° / 50° | 10.0 / 2.3 / 1.6 | 29% | 26% | 42% | 0% | 0% (0%) | 0.71 | 16.0° |
<!-- /TABELLA_TUTTO -->

<!-- ISTOGRAMMA -->
**La pendenza della vista su tutti i fotogrammi dei percorsi misurati** (% dei fotogrammi per fascia di gradi):

| | 0-10 | 10-15 | 15-20 | 20-25 | 25-30 | 30-34.5 | 34.5-40 | 40-45 | 45-50 | 50-90 | fotogrammi |
|---|---|---|---|---|---|---|---|---|---|---|---|
| oggi | 0 | 0 | 0 | 0 | 0 | 63 | 6 | 4 | 7 | 20 | 471 |
| camera9 | 0 | 88 | 1 | 0 | 1 | 10 | 0 | 0 | 0 | 0 | 285 |
<!-- /ISTOGRAMMA -->

### 3.1 La tavola: gli stessi posti, lo stesso punto del personaggio

`_immagini/camera9/tavola_oggi_camera9.jpg` (tutti e dodici), e a fogli `tavola_1.jpg` (vicolo stretto, Vico Lungo, piazza San Rocco,
sbocco dei Lanternini), `tavola_2.jpg` (lungomare, cima della Scala del Mercato, cima della Scalinata di Vico Lungo, Salita dei Gatti),
`tavola_3.jpg` (i quattro posti peggiori dell'urbanista: Vico della Corte, Corte dei Pescatori, Androne del Pozzo Vecchio, il sottopasso
del Vico del Glacis). A sinistra oggi, a destra camera9, il personaggio fermo nello stesso punto e rivolto allo stesso modo; i numeri di
ogni foto in `tavola9.json`.

<!-- TAVOLA -->
| posto | oggi: vista, braccio | camera9: vista, braccio, spalla | orizzonte (camera9, dall'alto) | sfondo nel terzo alto oggi → camera9 | busto coperto oggi / camera9 |
|---|---|---|---|---|---|
| vicolo stretto (Caruggio dei Pescatori) (1343, 321) | 34°, 10 m | 14.7°, 7.5 m, 0 m | 22% | 0% → 2% | no / no |
| Vico Lungo (a metà) (1414, 367) | 34°, 10 m | 14.7°, 7.5 m, 0 m | 22% | 0% → 5% | no / no |
| piazza San Rocco (1375, 304) | 50°, 1.2 m | 14.7°, 5.04 m, 0.8 m | 22% | 0% → 5% | sì / no |
| sbocco sulla piazza (Vicolo dei Lanternini) (1372, 296) | 50°, 2.25 m | 17.8°, 4.24 m, 0 m | 17% | 0% → 2% | no / no |
| lungomare (1415, 399) | 34°, 10 m | 14.7°, 7.5 m, 0 m | 22% | 0% → 48% | no / no |
| cima della Scala del Mercato (1289, 343) | 34°, 10 m | 14.7°, 7.5 m, 0 m | 22% | 0% → 22% | no / no |
| cima della Scalinata di Vico Lungo (1418, 348) | 34°, 10 m | 14.7°, 7.5 m, 0 m | 22% | 0% → 5% | no / no |
| Salita dei Gatti (a metà) (1374, 325) | 34°, 10 m | 14.7°, 7.5 m, 0 m | 22% | 0% → 3% | no / no |
| Vico della Corte (fessura 2,2 m) (1420, 362) | 46°, 10 m | 14.7°, 6.09 m, 0 m | 22% | 0% → 0% | no / no |
| Corte dei Pescatori (fessura 2,2 m) (1388, 360) | 50°, 1.2 m | 14.7°, 5.88 m, 0.8 m | 22% | 0% → 0% | no / no |
| Androne del Pozzo Vecchio (fessura 2,2 m) (1412, 292) | 50°, 1.2 m | 14.7°, 7.5 m, 0.8 m | 22% | 0% → 0% | no / no |
| sottopasso del Vico del Glacis (1477, 292) | 50°, 2.54 m | 14.7°, 7.5 m, -0.8 m | 22% | 0% → 12% | no / no |
<!-- /TAVOLA -->

Cosa si vede: in Vico Lungo il mare in fondo alla via; sul lungomare il faro, il molo e il mare; dalla cima della Scala del Mercato il
porto e la città dietro; nelle fessure dell'urbanista la via in prospettiva centrale con la porta in fondo invece della nuca del
personaggio; al sottopasso del Glacis la volta e la via oltre invece del muro. Il personaggio è più grande (23% dell'altezza dello
schermo contro 12%) e sta nel terzo di mezzo-basso.

### 3.2 La striscia nel vicolo stretto

`_immagini/camera9/filmstrip_vicolo_pescatori_camera9.jpg`: il Caruggio dei Pescatori a piedi coi tasti con camera9, una foto ogni
1,2 s, fino allo sbocco sulla piazza; `filmstrip_vicolo_pescatori.jpg` sopra oggi e sotto camera9.

## 4. Il costo (la camera bassa vede lontano)

Misurato con le sonde di questo lavoro (`_immagini/camera9/sonde/sonda_disegni9.js`, `sonda_cpu9.js`, e il costo di ogni foto della
tavola): i disegni e i triangoli di un fotogramma intero (`renderer.info`, tutti i passaggi), i ms d'orologio con SwiftShader (rumorosi:
la macchina era condivisa), il profilo del processore.

<!-- COSTO -->
**Nei dodici posti della tavola** (profilo leggero, 640×360; un fotogramma intero, mediana di 6):

| posto | disegni oggi → camera9 | triangoli oggi → camera9 | ms (SwiftShader) oggi → camera9 |
|---|---|---|---|
| vicolo stretto (Caruggio dei Pescatori) | 674 → 2242 (×3.3) | 1.67 M → 3.05 M (×1.8) | 194 → 189 |
| Vico Lungo (a metà) | 682 → 979 (×1.4) | 0.97 M → 1.32 M (×1.4) | 348 → 167 |
| piazza San Rocco | 277 → 1913 (×6.9) | 0.75 M → 2.66 M (×3.6) | 213 → 276 |
| sbocco sulla piazza (Vicolo dei Lanternini) | 309 → 2691 (×8.7) | 1.05 M → 3.72 M (×3.5) | 403 → 292 |
| lungomare | 363 → 1134 (×3.1) | 0.84 M → 1.38 M (×1.6) | 98 → 207 |
| cima della Scala del Mercato | 932 → 1787 (×1.9) | 1.51 M → 2.27 M (×1.5) | 166 → 269 |
| cima della Scalinata di Vico Lungo | 676 → 1447 (×2.1) | 1.77 M → 2.35 M (×1.3) | 156 → 207 |
| Salita dei Gatti (a metà) | 693 → 2193 (×3.2) | 2.04 M → 2.98 M (×1.5) | 294 → 298 |
| Vico della Corte (fessura 2,2 m) | 390 → 1304 (×3.3) | 1.02 M → 1.92 M (×1.9) | 205 → 520 |
| Corte dei Pescatori (fessura 2,2 m) | 283 → 1998 (×7.1) | 1.04 M → 2.82 M (×2.7) | 278 → 213 |
| Androne del Pozzo Vecchio (fessura 2,2 m) | 262 → 1457 (×5.6) | 1.04 M → 2.19 M (×2.1) | 229 → 246 |
| sottopasso del Vico del Glacis | 267 → 574 (×2.1) | 0.86 M → 1.20 M (×1.4) | 571 → 223 |

**Il profilo del computer** (`?tassellivecchi`, piano lontano 300 m; i disegni della vista principale per distanza dalla camera, il bordo della sfera dell'oggetto):

| posto | camera | disegni (vista) | tutti i passaggi | triangoli | piano lontano | 0-30 m | 30-80 m | 80-150 m | oltre 150 m |
|---|---|---|---|---|---|---|---|---|---|
| vicolo | oggi | 627 | 1143 | 2.81 M | 300 m | 383 | 124 | 1 | 119 |
| vicolo | camera9, piano lontano 300 m | 2147 | 2215 | 3.23 M | 300 m | 405 | 724 | 784 | 234 |
| vicolo | camera9 | 2117 | 2127 | 3.28 M | 246 m | 454 | 714 | 789 | 160 |
| vicolo | camera9, nebbia ×0.75 | 2123 | 2160 | 3.37 M | 187 m | 421 | 780 | 787 | 135 |
| vicolo | camera9, nebbia ×0.6 | 2086 | 2461 | 4.00 M | 152 m | 422 | 743 | 789 | 132 |
| sbocco | oggi | 300 | 328 | 1.22 M | 300 m | 182 | 2 | 1 | 115 |

**Il processore** (20 fotogrammi a passi, i disegni spenti: G.step + R.frame; ms per fotogramma mediana / massimo, e il totale dei raggi del braccio `cast7` sui 20):

| posto | camera | ms mediana / max | raggi del braccio (ms su 20 fotogrammi) |
|---|---|---|---|
| sbocco | oggi | 221.4 / 8773.3 | 309.8 |
| sbocco | camera9 | 262.5 / 5682.4 | 524 |
| lungomare | oggi | 114 / 304.7 | 188.4 |
| lungomare | camera9 | 100.3 / 418.8 | 74 |
<!-- /COSTO -->

**Il profilo del computer, quattro posti** (`?tassellivecchi`, il piano lontano di camera7 a 300 m; un fotogramma intero, i disegni della vista principale e di tutti i passaggi, ombre comprese):

| posto | camera | disegni (vista) | tutti i passaggi | triangoli | piano lontano |
|---|---|---|---|---|---|
| vicolo | oggi | 607 | 1074 | 2.75 M | 300 m |
| vicolo | camera9 | 2134 | 2200 | 3.26 M | 246 m |
| vicolo | camera9, piano lontano 300 m | 2188 | 2201 | 3.29 M | 300 m |
| sbocco | oggi | 295 | 360 | 1.14 M | 300 m |
| sbocco | camera9 | 2585 | 2602 | 3.68 M | 246 m |
| sbocco | camera9, piano lontano 300 m | 2648 | 2679 | 3.79 M | 300 m |
| piazza | oggi | 357 | 357 | 1.17 M | 300 m |
| piazza | camera9 | 954 | 972 | 2.85 M | 246 m |
| piazza | camera9, piano lontano 300 m | 881 | 939 | 3.72 M | 300 m |
| lungomare | oggi | 327 | 712 | 1.53 M | 300 m |
| lungomare | camera9 | 1138 | 1153 | 1.41 M | 246 m |
| lungomare | camera9, piano lontano 300 m | 1198 | 1259 | 1.46 M | 300 m |


Cosa vuol dire:
- **I disegni crescono molto**: da 1,4× (Vico Lungo, il sottopasso) a 7-9× (lo sbocco sulla piazza, la Corte dei Pescatori): con la vista
  a 15° il tronco di vista prende tutta la città fino alla nebbia, e la città è fatta di molti pezzi (le mesh fuse `fusione1`, l'arredo,
  gli sprite delle insegne, le persone). I triangoli crescono meno (1,2-3,5×). Su SwiftShader i ms per fotogramma non seguono i disegni
  (il riempimento domina), ma su un telefono vero 2.000-2.700 disegni sono un costo di processore serio (three.js e WebGL per disegno).
- **Il tetto del piano lontano alla nebbia** (`K9.lontano`) toglie poco (0-5% dei disegni) e **nemmeno la nebbia più vicina aiuta**
  (`K9.nebbia` 0,75 e 0,6 nel Caruggio dei Pescatori: il piano lontano da 246 a 187 e 152 m, i disegni da 2.117 a 2.123 e 2.086). I
  disegni in più stanno fra 30 e 150 m (nel vicolo 714 + 789 su 2.117; oggi 124 + 1): le case e l'arredo delle vie vicine che la camera
  alta non vedeva perché guardava la strada. Quindi accorciare la vista non serve e toglierebbe lo sfondo; serve un livello di dettaglio
  per distanza (sotto). `K9.nebbia` resta una manopola, di difetto 1.
- **Il braccio** (i raggi di `cast7`): allo sbocco 26 ms per fotogramma contro 15 di oggi (più prove quando è chiuso: la spalla), sul
  lungomare 3,7 contro 9,4 (libero: niente salite da provare). I raggi ripetuti non aumentano (il ricordo di ritmo8 vale: la prova a spalla 0
  è quella della camera).
- **La memoria**: la pagina di prova (SwiftShader, 2,2 GB per la scheda) è morta più volte con camera9 allo sbocco dei Lanternini (la
  piazza e la città dietro nel quadro), mai con la camera di oggi nello stesso punto: più città nel quadro, più pezzi caricati e più
  programmi. Da provare sul telefono vero.
- **Lo streaming**: camminando con camera9 verso la piazza la pagina di prova ha avuto fotogrammi lunghissimi (il processo della scheda
  video al 130%: compilazioni e caricamenti dei pezzi della città che entrano nel quadro per la prima volta). È lo stesso fenomeno degli
  «scatti» di [firma]/[ritmo8], più spesso perché si vede più città.

Da fare (per chi tiene le prestazioni; non fatto qui): (1) uno spegnimento a distanza delle cose piccole (arredo, sprite, persone) oltre
60-80 m, dove non si leggono comunque; (2) un livello lontano per le mesh fuse (i blocchi della città oltre ~100 m in una mesh sola o in
una sagoma dipinta: lo skyline); (3) le bande della nebbia: con la camera bassa la nebbia diventa il fondale, il suo colore contro il cielo
fa una riga all'orizzonte (sul lungomare si vede); è materia del look (non toccato).

## 5. I posti dove anche camera9 non trova un buon quadro

La scansione (`_immagini/camera9/sonde/tavola9.js scansione`): ogni ~6 m lungo tutti i vicoli (`vic_*`, `cavour_sotto`), nei due
versi, camera9 da ferma; il voto mette insieme il braccio, la pendenza della vista, lo sfondo nel terzo alto e se il busto è coperto.
I peggiori, uno per vicolo e a più di 15 m l'uno dall'altro, con le foto oggi | camera9 in `_immagini/camera9/posti_stretti.jpg`; tutti i
punti in `scansione9.json`, i peggiori in `posti_stretti.json`. Per l'urbanista.

<!-- STRETTI -->
| # | vicolo | punto (x, y) → verso | braccio | vista | sfondo nel terzo alto | busto coperto | voto |
|---|---|---|---|---|---|---|---|
<!-- /STRETTI -->

## 6. I rischi

- **Le prestazioni** (sez. 4): il rischio vero. Da provare su un telefono vero prima di farla di difetto.
- **Le cose in primo piano**: con la camera a 3,7 m le tende, i chioschi, i banchi e i balconi bassi entrano nella metà bassa del quadro
  (lo sbocco del Caruggio dei Pescatori: il chiosco verde davanti). Le cose registrate si spengono già quando coprono il personaggio;
  quelle fuse nella città (le tende delle case) no.
- **I muri vicini**: nelle fessure di 2,2 m la camera dritta lungo la via è libera e il quadro è buono, ma basta un poco di sbieco (lo yaw
  non ancora ricentrato) e mezzo quadro è una parete vicina (Corte dei Pescatori, Androne nella tavola).
- **La spalla** cambia la composizione (il personaggio va di lato fino a 0,8 m): voluta, ma nuova. Si torna in mezzo dopo 1,2 s di via
  dritta libera.
- **Il ricentro** è quello di camera7 (le stesse costanti): con il braccio corto (sotto il 60%: 4,5 m invece di 6) parte subito e svelto
  (controlli8); con camera9 il braccio è corto più spesso solo agli angoli.
- **I comandi**: invariati (`test_controlli8.js`, `test_ritmo8.js`, `test_camera7.js` passano; lo yaw di camera9 è quello di camera7).
- **L'avvio** usa il braccio della camera accesa (`avvio7`: 7,5 m a 20° invece di 10 m a 34°): sceglie la via con meno strada libera dietro.
- **La mira** sopra la spalla destra: braccio 4,2 m (era 6,8), 0,7 m a destra.

## 7. Come si prova

- `node src/test_camera9.js`: la vista, l'orizzonte, il personaggio, il vicolo (la spalla, il muro accanto), il chiuso, l'angolo (il colpo
  che va e viene), la salita come ultima risorsa, la scala in discesa (niente tuffi), lo yaw uguale a camera7, la spalla che non sfarfalla,
  la mira.
- Nel gioco vero: `index.html?camera9`; le sonde in `_immagini/camera9/sonde/` (`misura9.js` i percorsi e il registro, `analizza9.py` le
  distribuzioni, `fogli9.js` le strisce, `tavola9.js tavola|scansione` la tavola e i posti stretti, `sonda_disegni9.js` i disegni,
  `sonda_cpu9.js` il profilo; usano `controlli8/sonde/lib.js`; `riprova.sh` le rilancia se la pagina muore).
