# Porto Vecchio — analisi urbanistica della città compatta: vicoli, visuali, rettilinei, leggibilità

L'urbanista, 6 novembre 2026. Risponde al committente: «mandiamo anche un agente urbanista ad analizzare la città, vicoli stretti e
zone dove la visuale funziona male, aree anguste, ostruite, tratti e vie troppo lunghe che ti costringono a un percorso rettilineo per
tanto tempo, rendendo la mappa poco organica; pesiamo eventualmente quali spazi allargare e alleggerire per favorire leggibilità ed estetica».

È un lavoro di **analisi e proposta**: la geometria della città non è stata toccata. Le immagini stanno in `_immagini/urbanistica/`.

| Immagine | Cosa mostra |
|---|---|
| `00_tavola_problemi_proposte.png` | **la tavola**: problemi in rosso, proposte in verde, numerate come la sez. 7 |
| `01_pianta_larghezze_canyon.png` | a. larghezza visiva delle vie, metro per metro · b. fattore canyon (gronda / larghezza) |
| `02_pianta_orientamento_ritmo.png` | c. landmark nell'inquadratura camminando, zone cieche · d. tratti monotoni, viste oltre 60 m, camera stretta, corti cieche, ingombri |
| `1x_prima_*.jpg` | le foto «prima» dal gioco vero, nei punti peggiori: a sinistra la camera di oggi (34°, braccio 10 m), a destra una camera bassa (18°, 7 m) |
| `2x_mock_*.png` | mock-up in pianta, prima e dopo, delle proposte principali |
| `3x_pacchetto_*.jpg` | il pacchetto sicuro fatto (sez. 10): prima (`?nourbanistica1`) e dopo, nel gioco |
| `4x_*.png` | il masterplan (`MASTERPLAN.md`) |

Ho provato anche i mock-up nel gioco, nascondendo dal vivo le case da togliere. Non funzionano: le facciate stanno nei blocchi fusi
della città e dalla lista per casa (`R.__buildings`) si spengono solo i dettagli. I mock-up sono quindi solo in pianta.

---

## 0. In sintesi

1. **Il borgo non è stretto, è rigido.** Le vie sotto i 3 m sono il 14% dell'asse stradale del borgo (21% dei vicoli). Il problema vero
   è un altro: l'**86% delle vie corre entro 10-15° dei due assi cardinali**, e tutti i vicoli a pettine pendono dalla stessa parte
   (`LEAN = .16` in `pett()`). Ne viene una griglia leggermente storta, non un tessuto organico. La densità degli incroci è buona
   (1.730 nodi/km², un incrocio ogni 33 m di via, tratti fra incroci di 16 m di mediana). Mancano i gomiti, gli sfalsamenti e
   l'alternanza fra compressione e respiro.
2. **I rettilinei lunghi sono pochi ma pesano.** Il primo è la **Via della Vittoria**: 221 m dritti, 53 s a passo, voluta come
   cannocchiale sulla Rocca. Poi il **Lungomare di Tramontana**: 207 m senza un solo accesso al borgo (guardrail e rilevato della
   ferrovia), 49 s. Seguono la **Via di Mezzo** (115 m dritti a 2,2-4 m di larghezza, con una vista di 112 m che finisce su una casa a
   un piano), la **Via delle Mura** (100 m) e la **Via della Marina** (92 m).
3. **Gli spazi angusti veri sono tre traverse e una volta.** Corte dei Pescatori, Vico della Corte e Androne del Pozzo Vecchio sono
   larghi 2,2 m con un fattore canyon di 2,1-2,7: la camera vi resta stretta (braccio sotto il 60%) nel 47-58% dei punti. Nel gioco
   vero, nel Vico della Corte, la camera di oggi crolla a 1,2 m. Al sottopasso
   del Vico del Glacis il suolo sale sotto la volta: misurata sui vertici del terreno, l'altezza libera lungo il passaggio è di
   **1,9-2,8 m invece di 3,2**, e ai capi della volta scende sotto il metro (sez. 3.4).
4. **Ci sono corti cieche**: tre ritagli di selciato da 64 a 188 m², con un solo accesso, profondi 22-30 m. Sono spazi morti, ma anche
   la migliore occasione di piazzette «scoperte» alla genovese.
5. **La leggibilità dipende dalla camera più che dalla pianta.** Con la camera di oggi (bordo alto dello schermo 11° sotto l'orizzonte)
   un landmark entra nell'inquadratura solo nel **2%** del tempo di cammino. Con una camera bassa a 18° e 7 m si sale al **26%**, a 15°
   al **31%**. Ma il campanile (28-30 m), il segno del borgo, resta fuori quadro quasi sempre: è troppo alto e troppo vicino. Dentro il
   borgo il giocatore si orienta solo con **firme basse** (portali, luci, colori, il mare in fondo al vicolo), e oggi in fondo a molte
   viste non c'è niente. Nel borgo il 25% dei punti non vede né un landmark né il mare, neanche girandosi.
6. **Il pacchetto sicuro** (sez. 8): varchi sul Lungomare, volta del Glacis, ingombri fuori dai vicoli stretti, firme basse in fondo alle
   viste, due respiri sulla Via delle Mura. Tocca barriere, pezzi e arredo, non la lottizzazione. Il resto (corti passanti, Vittoria in tre
   tempi, gomito della Via di Mezzo, pettine sfalsato) rifà i lotti e va fatto dopo, una proposta alla volta.

---

## 1. Metodo e numeri di base

- **Dati**: il mondo vero in Node (`world_cittanuova.js`, la stessa mappa per `?mappa=nuova` e senza: la città non cambia). Sono state
  usate le strade (`W.roads`, 47 nella cornice), le case con la scatola vera (centro, misure, rotazione, piani, gronda e colmo come
  `Visuale.mappa`), i pezzi (`W.pezzi`: volte, portici, sottopassi), le barriere, i nodi e i landmark di `Percorsi.dati`. L'arredo
  viene da `Scorci.tutti`, `Scena.piano`, `Vievive` e `Rete`, le stesse fonti di `test_scorci.js`.
- **Raster a 25 cm** della città (x 1200-1640, y 228-476). È pieno quello che è dentro la scatola di una casa, una casella `BLD`, acqua
  o roccia. Su ogni via si prende un campione a ogni metro (**2.349 m di asse**, 1.345 nel borgo). In ogni campione si misurano:
  - **larghezza visiva**: perpendicolare all'asse, da facciata a facciata;
  - **larghezza camminabile**: caselle percorribili;
  - **gronda** dei due fronti, da cui il **fattore canyon** H/L;
  - **vista dritta** avanti e indietro;
  - **volte** sopra la testa;
  - **camera simulata**: il braccio dal busto (1,15 m) all'indietro lungo la via, raggio a sfera 0,35 m contro case e volte, con le
    salite di `Camera7.K.lifts`. La camera di oggi ha 34° e 10 m; la camera bassa, per il lavoro parallelo su `?camera9`, ha 18° e 7 m;
  - **landmark visti a occhio** (1,7 m, in ogni direzione) e **nell'inquadratura** (campo verticale 46°, orizzontale ±37°, dietro al
    personaggio nei due versi di marcia);
  - **mare visibile**.
- **Cornice del borgo**: quella di `Percorsi.dati.borgo` (x 1312-1466, y 262-412).
- **Velocità** (`game.js`, `movePlayer`): a passo 4,2 m/s, di corsa 6,4 m/s, al massimo 7,8 m/s.
- **Foto**: il gioco vero in Chromium senza scheda video (SwiftShader), il personaggio pilotato per qualche metro così che la camera
  gli stia dietro come camminando, ore 10:30, cielo sereno. La camera bassa è `Camera7.K` messa a pitch 0,314 e arm 7 dal vivo: è
  un'approssimazione di `?camera9`, non la sua versione finale.

**Il borgo in numeri** (cornice 154 × 150 m = 23.100 m²):

| | |
|---|---|
| case | 350: 41 a un piano, **255 a due (73%)**, 48 a tre, 6 case-torre a quattro |
| suolo | case 39%, vie e piazze 39%, **ritagli di selciato che non sono vie né corti 10%** (2.364 m²) |
| asse stradale | 1.335 m, 40 incroci (**1.730/km²**), un incrocio ogni 33 m |
| tratti fra due incroci | 68: media 20 m, mediana 16, 90° percentile 39, massimo 57 (Via della Marina) |
| orientamento | 47% della lunghezza entro ±10° dall'est-ovest, 39% entro ±15° dal nord-sud: **86% sui due assi** |
| larghezza visiva | < 3 m: 14% · 3-5 m: 22% · aperta su un lato (> 15 m): 39% |
| fattore canyon H/L | > 1,5: 21% · > 2,2 (fessura): 12% · < 0,3 (aperto): 33%. Poco nel mezzo: fra la fessura e lo stradone manca la «via» |

---

## 2. La pianta: larghezze, altezze, canyon (`01_pianta_larghezze_canyon.png`)

- **I vicoli a pettine** hanno 1,7-3 m di larghezza nei dati e sono larghi a vista 2,2-4,2 m (mediana 4,2 m): due caselle fra facciate
  di due piani (6 m di gronda). Il fattore canyon sta fra 1,3 e 1,8. Nei punti più stretti (2,2 m) sale a 2,7. La misura è giusta per un
  caruggio: il problema non è la sezione ma la **ripetizione**. Ci sono quindici vicoli quasi uguali, paralleli, dritti, lunghi 25-40 m,
  con 0-1 traverse ciascuno.
- **Le traverse est-ovest** (Corte dei Pescatori, Vico della Corte, Androne del Pozzo Vecchio, Vico del Lavatoio) sono le vere fessure:
  2,2 m costanti, H/L 2,1-2,7, lunghe 13-22 m.
- **La Rua Maestra** è l'unica via di mezza misura (mediana 7,2 m, H/L 0,8): funziona.
- **Le vie del contorno** (Vittoria 19 m fra i fronti, Marina 20, Lungomare 29, Viale della Spianata 36) sono aperte su un lato o molto
  larghe (H/L 0,1-0,3). Il salto dalla fessura di 2,2 m allo stradone di 19 m è brusco. È un contrasto voluto, ma mancano i gradini di
  mezzo, cioè le piazzette e gli slarghi di 6-12 m dentro il borgo. Ce ne sono due: il Pozzo (r 6) e il Forno (r 5).
- **Altezze piatte**: il 73% delle case ha due piani. Con la camera bassa lo skyline diventa visibile, e oggi è una linea quasi continua
  a 6 m. Le sei case-torre ci sono (Latteria Rosaria, 1326,299, 1392,314, 1438,324, 1346,366, Birreria del Porto), ma non chiudono
  nessuna vista.

---

## 3. Aree anguste, ostruite, cieche

### 3.1 Le fessure e la camera

Il braccio della camera simulata, in percentuale del braccio pieno, misurato nei due versi:

| Via | larghezza visiva | H/L | camera di oggi: braccio medio / punti sotto il 60% | camera bassa: braccio medio / punti sotto il 60% |
|---|---|---|---|---|
| Corte dei Pescatori (1384-1397, y 360) | 2,2 m | 2,7 | 51% / 58% | 53% / 58% |
| Vico della Corte (1415-1437, y 362) | 2,2 m | 2,1 | 56% / 55% | 59% / 50% |
| Androne del Pozzo Vecchio (1409-1424, y 292) | 2,2 m | 2,7 | 64% / 47% | 62% / 47% |
| Vico del Glacis (1471-1497, y 290) | 7,6 m | 0,8 | 50% / 58% | 64% / 48% |
| Vicolo dei Lanternini (sottopasso a 1372,292) | — | — | 64% / 48% | 87% / 2% |
| Vico dell'Arco (sottopasso a 1408,300) | 2,2-4,2 m | 1,4 | 71% / 41% | 90% / 1% |
| tutta la città | | | 96% / 5,3% | 97% / 3,6% |

**Nel gioco vero** (foto 1x, il braccio misurato dalla sonda dopo pochi passi):
- Vico della Corte: **1,2 m** con la camera di oggi (il minimo, `K.armMin`), 7 m con quella bassa;
- Vico Lungo: 2,6 m oggi, 7 m bassa;
- Rua, Lungomare, Via di Mezzo, Vittoria e Via delle Mura: 10 m e 7 m, pieni.

La camera bassa sta meglio nei vicoli dritti, perché resta sotto le gronde.

Le fessure est-ovest sono strette per tutte e due le camere: il personaggio ci entra da un vicolo perpendicolare e il braccio sbatte
nello spigolo. Ai sottopassi (volta a 3,2 m, lunga 12 m) la camera di oggi, alta 6,7 m, colpisce la casa sopra la volta, mentre quella
bassa ci passa sotto. In sette punti l'asse della via passa a meno di 0,35 m da una facciata (Via delle Mura a 1396,278 e 1422,274,
Vico del Sale 1452,316, l'Androne 1421,292, la Corte dei Pescatori e il Vico della Corte): lì la via è più stretta di quanto dicono i dati.

### 3.2 Gli ingombri

In città ci sono 170 cose a terra (bidoni, cassonetti, dehors, edicole, fermate, stalli, pali, mezzi degli scorci). L'arredo è misurato:
non c'è il «disordine» che mangia le vie. Ma **dieci cose stanno in vicoli di 2,2 m e lasciano 1,4-1,7 m**: otto bidoni (Vico del Sale
1450,321, Vico Scuro 1444,297, Caruggio dei Pescatori 1343,322, Vicolo Storto 1351,353, Vico delle Sorelle 1434,375, l'Androne 1419,292,
Via di Mezzo 1401,373, Vico della Corte 1424,362) e due lavagne (Vico della Fame 1358,354, Vicolo delle Reti 1385,355). Il dehors del
Bar Mario sta in Vico Scuro (1446-1447, 276-278: tavolino, due fioriere, lavagna) in 4,2 m. Il personaggio passa (la collisione è a
caselle), ma la camera e lo sguardo inciampano.

Il censimento **non comprende** quello che `render.js` posa da sé: barili, bombole, casse, vasi, i ciuffi d'erba secca ai piedi dei muri.
La foto della Via di Mezzo (`11_prima_via_di_mezzo.jpg`) mostra un barile e una bombola del gas a metà di un vicolo di 2,2 m (1318,370),
cioè metà della sezione. Le stesse regole della proposta 3 vanno date anche a quella posa.

### 3.3 Le corti cieche

| Corte (selciato fra le case, nessuna via) | area | accessi | profondità | da dove |
|---|---|---|---|---|
| 1426-1440 × 280-304 (dietro l'Osteria da Deiana) | 188 m² | 1 | 30 m | Vico delle Monache a 1425,283 |
| 1394-1404 × 280-300 (dietro il Calzolaio Nello) | 96 m² | 1 | 28 m | Via delle Mura a 1395,279 |
| 1366-1378 × 350-364 (dietro la Sala giochi Flipper) | 64 m² | 1 | 22 m | Vittoria a 1369,349 |

In città i ritagli di selciato sono 100, per 4.684 m², di cui 2.640 nel borgo. La maggior parte sono strisce di 2-4 m fra case e vie e
non pesano. Queste tre però sono stanze vere, profonde, con una sola porta: si entra, non c'è niente, si torna indietro.

### 3.4 Le volte basse

Le volte sopra le vie sono tre sottopassi (`arco_sottopasso`, 3,2 m liberi, 12 m di lunghezza) e i portici della Vittoria (lato nord,
4,4 m). Al **sottopasso del Vico del Glacis** (1484,294) la volta parte da q 3,52, ma il suolo sotto l'impronta va da 3,64 a 6,40 m.
L'altezza libera è stata misurata sui vertici del terreno (`W.quotaRiva`, quello che il gioco disegna e su cui cammina):
- **lungo il passaggio** (est-ovest): 1,94 · 2,20 · 2,39 · 2,80 · 2,62 · 2,64 · 2,32 m, invece di 3,2;
- **di traverso, verso i capi della volta**: 0,33 · 0,58 · … · 1,03 · 1,37 m.

Il personaggio (1,75 m) ci passa per poco e la camera di oggi ci sbatte. Gli altri due sottopassi stanno a 2,7-3,35 m: sono a posto.
Vedi la foto `16_prima_glacis.jpg`.

---

## 4. I rettilinei e l'organicità

### 4.1 I rettilinei

Ogni via è stata semplificata (Douglas-Peucker a 1,2 m) e sono stati fusi i pezzi che girano meno di 12°. La tabella dà i tratti che
obbligano a camminare dritti.

| Tratto | lungo | a passo | di corsa | incroci lungo il tratto | in fondo |
|---|---|---|---|---|---|
| Via della Vittoria (1297 → 1518, y 343) | **221 m** | 53 s | 35 s | 15 (pettine, Corso, Viale) | la Porta della Rocca (voluto) |
| Lungomare di Tramontana (1288 → 1442) | 78 + 77 m, poi 34 | 37 s | 24 s | **0** | il mare e la punta |
| Via di Mezzo (1305 → 1419) | **115 m** | 27 s | 18 s | 6 vicoli | una casa a un piano (vista di 112 m) |
| Via delle Mura (1367 → 1466) | 100 m | 24 s | 16 s | 5 vicoli | il Viale della Spianata |
| Via della Marina (1310 → 1402) | 92 m | 22 s | 14 s | 1 | il mare a sinistra |
| Viale della Spianata (1468, 251 → 343) | 92 m | 22 s | 14 s | 7 | la Vittoria |
| Via del Lido (1468, 343 → 412) | 69 m | 16 s | 11 s | 1 | la spiaggia |
| Via del Porto (1250 → 1310) | 60 m | 14 s | 9 s | 1 | lo Scalo |
| Rua Maestra, primo tratto (1292 → 1372) | 81 m in due pezzi | 19 s | 13 s | **1** (Caruggio dei Pescatori) | il sagrato, ma solo all'ultimo |
| vicoli a pettine | 25-40 m | 6-10 s | 4-6 s | 0-1 | la Rua, la Vittoria, il mare |

### 4.2 Il ritmo: tratti monotoni e premi

Un tratto è **monotono** quando non ha un incrocio, una curva sopra i 25° in 10 m o uno slargo (larghezza doppia o un nodo a 12 m). I
**premi** sono il mare in vista, un landmark nell'inquadratura (camera bassa) e un nodo.

| Tratto monotono | lungo | a passo | premi lungo il tratto |
|---|---|---|---|
| Lungomare di Tramontana, 1259 → 1462 | **207 m** | **49 s** | il mare sempre, i landmark nel 21% (verso est) o nel 79% (verso ovest) del tratto |
| Via del Lido, 1468, 354 → 397 | 44 m | 10 s | il mare |
| Via della Marina, 1414 → 1452 | 42 m | 10 s | il mare, i landmark nel 45-58% |
| Via di Mezzo, 1312 → 1344 | 33 m | 8 s | **nessuno**: niente mare, niente landmark, 31 m senza premi |
| Caruggio dei Pescatori, 1345, 309 → 331 | 23 m | 5 s | nessuno |
| Rua Maestra, 1349 → 1369 | 22 m | 5 s | nessuno nel tratto; poi il gomito sul sagrato |

Il Lungomare è il tratto più lungo di tutta la città senza una scelta. Il mare lo salva come vista, ma il giocatore non può entrare in
città per 180 m: sul lato dei binari corre un **guardrail continuo da x 1354 a 1460** e, a ovest, il **rilevato della ferrovia** alto
2-5 m (foto `10_prima_lungomare.jpg`: a destra il muro nero del rilevato).

### 4.3 Viste troppo lunghe (la «regola dei 60 m»)

`MAPPA_COMPATTA.md` (sez. 5) vuole che nel borgo nessuna vista dritta superi i 60 m, tranne la Vittoria e le mura. Oggi, lungo gli assi
del borgo, il **24% delle direzioni** di sguardo supera i 60 m. Non sono tutte un male:
- **i vicoli a pettine che finiscono sul mare** (Vico dei Gatti, del Sale, dei Cordai, delle Monache: 64-68 m sul mare) sono il «mare in
  fondo al caruggio», un premio. **Da tenere.**
- **Male**: la Via di Mezzo (112 m su una casa anonima a un piano), la Rua verso ovest (126 m che escono dal borgo e attraversano il
  Corso), i vicoli allineati a cavallo della Vittoria (Tonnaroti 126 m, Vico Lungo 117, Gatti 94): due vicoli sullo stesso asse ai due lati
  dell'incrocio fanno un corridoio di 100 m che taglia il borgo come una griglia.

### 4.4 Organicità

La densità degli incroci (1.730/km²) e il tratto medio (20 m) sono da città antica: il borgo **non** è dispersivo. È poco organico per
tre ragioni misurabili:
1. **l'orientamento**: l'86% della lunghezza sta sui due assi cardinali, i vicoli sono tutti paralleli e pendono di 9° dalla stessa parte;
2. **gli incroci passanti**: i vicoli a nord e a sud della Vittoria sono quasi in asse, e incroci a croce dove servirebbero T sfalsate («a
   baionetta») allungano le viste;
3. **niente respiri intermedi**: dentro il borgo ci sono due piazzette (Pozzo e Forno), il sagrato e la Piazza della Marina. Fra la
   fessura di 2,2 m e la Vittoria di 19 m mancano gli slarghi di 6-12 m che in un borgo ligure capitano ogni 40-60 m di cammino.

---

## 5. Dove la visuale funziona male

**Camera di oggi** (34°, braccio 10 m, il bordo alto dello schermo 11° sotto l'orizzonte). Nelle vie il personaggio si vede bene: il
braccio è pieno nel 95% dei punti. Ma l'orizzonte non c'è mai, e con lui spariscono i landmark (sez. 6). La camera è stretta nelle
fessure est-ovest e sotto i sottopassi.

**Camera bassa** (18°, 7 m: un'anticipazione di `?camera9`). Si vede lontano lungo la via (foto `00`/`1x`, a destra): la via diventa un
corridoio con un fondo, e il fondo conta. È più tollerante sotto le volte (la camera passa sotto i 3,2 m dei sottopassi), ma non nelle
fessure. Con la camera bassa diventano evidenti:
- **le viste senza fondo**: la Via di Mezzo e la Rua verso ovest;
- **i muri ciechi lungo i rettilinei**: il rilevato del Lungomare, il retro dei lotti sulla Via delle Mura;
- **lo skyline piatto a 6 m**: tutte case a due piani, poche emergenze.

Le foto «prima» (sinistra: oggi, destra: bassa), coi punti della tavola:

| Foto | Punto | Cosa si vede |
|---|---|---|
| `10_prima_lungomare.jpg` | 1 | a destra, per tutto il tratto, il muro nero del rilevato e il guardrail: il borgo si vede solo sopra il muro, lontano. A sinistra il mare e le auto in sosta |
| `11_prima_via_di_mezzo.jpg` | 7 | un corridoio di 2,2-4 m che non finisce: con la camera bassa la vista corre per oltre 100 m. Un barile e una bombola del gas occupano metà della sezione. Il fronte sud è il fianco cieco del Magazzino Neri, la cui insegna, da qui, si legge a specchio |
| `12_prima_vittoria.jpg` | 6 | in fondo la Porta della Rocca, piccola e bianca: il cannocchiale funziona. Ma per 221 m la sezione, i lampioni e il marciapiede restano uguali (la scala di grigi è la tinta della zona sorvegliata) |
| `13_prima_vico_della_corte.jpg` | 8 | **la camera di oggi crolla a 1,2 m** (il braccio minimo) e il personaggio riempie lo schermo. Quella bassa ci passa e mostra la porta rossa in fondo, una buona chiusura della vista |
| `14_prima_vico_lungo.jpg` | 9 | la camera di oggi scende a 2,6 m. Con quella bassa si vede il dehors della gelateria: frigo, sedie, tavolini e gente occupano metà del vicolo |
| `15_prima_via_delle_mura.jpg` | 11 | la via è aperta a sinistra su binari, treno e lungomare, ed è piacevole. Il problema è la striscia di selciato vuota fra le case e i binari (932 m² senza uso) e i 100 m con un fronte solo |
| `16_prima_glacis.jpg` | 2 | il suolo fa una gobba sotto la volta e il personaggio ci passa con la testa vicino all'intradosso. La camera di oggi crolla a 1,7 m |
| `17_prima_corte_cieca.jpg` | 4 | l'unico accesso alla corte cieca (1425,283) è una fessura di una casella: la camera sta a 2,8 m con tutte e due le regolazioni. Dentro ci sono 188 m² senza uscita |

---

## 6. Leggibilità: il giocatore sa dove si trova?

| | camera di oggi (34°) | camera bassa 18° / 7 m | camera bassa 15° / 7 m |
|---|---|---|---|
| tempo di cammino con almeno un landmark nell'inquadratura, città | **2%** | 26% | 31% |
| idem, borgo | 2% | 21% | 25% |
| campanile della Chiesa Madre nell'inquadratura | 0 punti | 0 punti | 26 punti (~1%) |
| landmark più presenti | lanterna del molo, riflettore, Porta di Terra | Porta della Rocca, lanterna del molo, Porta di Terra, orologio della stazione | faro del mastio, Porta della Rocca, lanterna, Porta di Terra |

- **A occhio** (girandosi, 1,7 m) il 28% della città e il **42% del borgo** non vede nessun landmark. Il 15% della città e il **25% del
  borgo** non vede né un landmark né il mare: sono le **zone cieche** (cerchi rossi in `02`, pannello c). Stanno nella fascia fra Rua e
  Vittoria, nella Via di Mezzo, nelle traverse e nei vicoli a sud della Vittoria.
- **I landmark alti non bastano nel borgo.** Con la camera inclinata in basso un volume di 28-30 m entra nel quadro solo da oltre
  100-200 m, cioè dal Lungomare, dalla Marina e dalla Vittoria, non dai vicoli. Dentro il borgo ci si orienta con le **firme basse**,
  fra 3 e 8 m: il portale della chiesa, l'edicola votiva illuminata, l'albero della piazzetta, l'insegna a bandiera, la torre di quattro
  piani in fondo alla via, la luce del mare in fondo al vicolo. `MAPPA_COMPATTA.md` lo dice già (sez. 4: «una firma alta e una firma
  bassa che si accende entro 30 m»), ma in fondo alle viste peggiori (Via di Mezzo est, Rua ovest, imbocchi del pettine sulla Vittoria)
  la firma bassa non c'è.
- **Cosa funziona**: la Vittoria (la Porta della Rocca sempre in quadro, il 91-100% del tempo), il Lungomare verso ovest, la Marina (la
  lanterna, la gru), i vicoli che scendono al mare.
- **Lacune**: la Via di Mezzo (0% di landmark, 36% di mare), il Caruggio dei Pescatori e il Vico dei Bottai (0% e 0%), le traverse (0%).
  Il borgo nord fra Rua e Mura vede il mare ma nessun landmark: il campanile è alle spalle e in alto.

---

## 7. Le proposte, pesate

Peso: **beneficio** per leggibilità (L), estetica (E), camera (C) e flusso (F), da 0 a 3 ciascuno; **costo e rischio** da 1 (dati, pezzi,
arredo) a 3 (rifà la lottizzazione di mezzo borgo). **Priorità** = beneficio / costo; la tabella è in ordine di priorità. ★ = pacchetto
sicuro (sez. 8). La 4 ha la priorità più alta delle due ★ che la seguono, ma tocca i lotti: per questo sta fuori dal pacchetto. La regola di fondo è il **ritmo**: vicolo stretto
→ slargo → vicolo. Non si allarga tutto. Si tolgono le fessure inutili, si aggiungono i respiri, si chiudono le viste su qualcosa.

| # | Dove | Cosa | L | E | C | F | costo | priorità |
|---|---|---|---|---|---|---|---|---|
| **1** ★ | Lungomare di Tramontana | due varchi pedonali sulla ferrovia (x 1374 e 1448) e un belvedere | 2 | 1 | 0 | 3 | 1 | **6,0** |
| **2** ★ | Vico del Glacis, sottopasso 1484,294 | la volta segue il suolo (3,2 m liberi) | 0 | 1 | 3 | 2 | 1 | **6,0** |
| **5** ★ | fondo delle viste nel borgo | firme basse (3-8 m) dove la vista finisce sul niente | 3 | 2 | 0 | 0 | 1 | **5,0** |
| **4** | tre corti cieche | corti passanti: un androne verso la Rua, un passo sul sagrato | 1 | 3 | 1 | 2 | 2 | **3,5** |
| **3** ★ | dieci punti nei vicoli di 2,2 m | bidoni e lavagne fuori, regola «niente arredo dove restano < 2 m» | 0 | 1 | 1 | 1 | 1 | **3,0** |
| **11** ★ | Via delle Mura | due respiri alle teste e gli orti sul ritaglio verso i binari | 1 | 2 | 0 | 0 | 1 | **3,0** |
| **7** | Via di Mezzo | gomito dopo il Forno, tratti di 2,2 m portati a 3,4 m, respiro davanti alla torre | 2 | 2 | 1 | 1 | 2 | **3,0** |
| **10** | Rua Maestra, primo tratto | un vicolo a nord (x ≈ 1325) verso la torre dell'acqua | 2 | 1 | 0 | 2 | 2 | **2,5** |
| **6** | Via della Vittoria | due slarghi sul fronte sud: tre tempi da 90, 38 e 56 m | 1 | 2 | 0 | 1 | 2 | **2,0** |
| **8** | Corte dei Pescatori, Vico della Corte, Androne | allargare a 3-3,5 m, o abbassare la casa sul lato camera | 0 | 0 | 3 | 1 | 2 | **2,0** |
| **9** | il pettine | sfalsare i vicoli agli incroci con Rua e Vittoria, pendenze diverse, gomiti veri | 2 | 3 | 0 | 1 | 3 | **2,0** |
| **12** | Via della Marina est, Via del Lido | soste: panchine sul mare, un albero | 0 | 1 | 0 | 0 | 1 | **1,0** |

### 1 ★ Varchi sul Lungomare di Tramontana

- **Dove**: x 1374 (sull'asse del Vicolo dei Lanternini, che arriva alla Via delle Mura a 1374,282) e x 1448 (asse del Vico Scuro, che
  arriva a 1448,273). I binari stanno a y 271 e 262: in quel tratto sono a raso, su caselle di ghiaia, e li separa dal Lungomare solo
  il guardrail.
- **Cosa**: aprire il guardrail per 3 m, disegnare un attraversamento pedonale dei binari col pezzo del passaggio a livello (sbarre e
  luci: c'è già al passaggio della Costiera Nord), le strisce sul Lungomare e un tratto di selciato fino alla Via delle Mura. Sul lato
  mare, davanti al varco 1, un **belvedere** a sbalzo (1356-1372, 250-257) con due panchine, rivolto verso il campanile e la punta.
- **Perché**: 207 m (49 s) senza scelta diventano tre tratti di 90, 75 e 40 m. Il borgo nord si collega al mare. Il varco 1 ha in
  fondo il Vicolo dei Lanternini col suo sottopasso (una rivelazione compressa), il varco 2 la Latteria Rosaria (casa-torre a 4 piani).
- **Tocca**: i pezzi `parapetto` (tipo `guardrail`) e `W.barriere` lungo il Lungomare, `W.passaggi`, il passaggio a livello per i treni
  (la ferrovia di città ha traffico: le sbarre devono funzionare come alla Costiera), le strisce in `segnaletica.js`. NPC e percorsi
  seguono da soli le caselle (sono già percorribili). Rischio basso.

### 2 ★ La volta del sottopasso del Vico del Glacis

- **Dove**: il pezzo `arco_sottopasso` a 1483,96, 294,30 (rot 1,52, q 3,52).
- **Cosa**: posare la volta sulla quota più alta del suolo sotto la sua impronta (q = max del suolo + 0), oppure spianare il vico
  sotto la volta.
- **Perché**: lungo il passaggio l'altezza libera è di 1,9-2,8 m invece di 3,2 m (misurata sui vertici del terreno). La camera di oggi
  è stretta nel 58% del vico.
- **Tocca**: un numero del pezzo nel generatore (la posa del sottopasso del Glacis), `percorsi.js VOLTE`, `Visuale.mappa`. Rischio
  minimo. Una regola generale vale per tutti i sottopassi: q = la quota più alta del suolo sotto l'impronta.

### 3 ★ Ingombri fuori dai vicoli stretti

- **Cosa**: spostare gli otto bidoni e le due lavagne della sez. 3.2 nelle corti e negli slarghi vicini, a meno di 10 m. Il dehors del
  Bar Mario va dal Vico Scuro (4,2 m) alla Via delle Mura, che sul lato dei binari è aperta. Il dehors della Gelateria Polo Nord nel
  Vico Lungo (frigo, sedie, tavolini: foto 14) si stringe sul muro della bottega. Il barile e la bombola nella Via di Mezzo (foto 11)
  vanno contro il muro o in una corte. Una regola in `Scena.piano`: niente arredo
  dove la larghezza libera resterebbe sotto i 2 m, niente in vie sotto i 3 m salvo a muro.
- **Tocca**: `scena.js`, `chiarezza.js` (le regole), `test_chiarezza`, `test_scorci` (le compenetrazioni). Rischio minimo.

### 4 Corti cieche → corti passanti

- **Corte delle Monache** (1426-1440 × 280-304): aprire verso sud un **androne** largo 3,6 m (1431-1435, 302-311, al posto delle case
  283 e 299 della Rua, 6 × 4 e 4 × 1,8 m) col pezzo `arco_sottopasso` (una casa sopra la volta). La corte diventa un passaggio Rua →
  Vico delle Monache, con un albero, una porta, la scala per i tetti. È la sequenza ligure: buio dell'androne, poi la luce della corte.
- **Corte del Calzolaio** (1394-1404 × 280-300): un passo di 3 m (1397,5-1400,5, 296-304) verso il sagrato, che è a 2 m. Il sagrato
  avrà una seconda entrata dalle mura.
- **Corte della Sala giochi** (1366-1378 × 350-364): non si apre (a est c'è la Corte dei Pescatori). Diventa una corte con una
  destinazione: un pozzo, un orto, l'ingresso posteriore della Sala giochi. Così il vicolo cieco ha un premio.
- **Tocca**: lottizzazione locale (due case diventano androni), `W.pezzi`, `tetti.js` e `tetti_vissuti.js` (il grafo dei tetti perde
  due tetti ma guadagna un salto), i graffiti salvati su quei muri (`writing.js` riporta il pezzo «dov'era» solo se il muro c'è
  ancora), `test_percorsi`, `test_tetti4`, `strumenti/incroci.js`. Costo medio-basso. Mock-up: `21_mock_4_corti_passanti.png`.

### 5 ★ Firme basse in fondo alle viste

- **Dove**: dove una vista lunga finisce sul niente.
  - **Via di Mezzo, verso est**: oggi la vista finisce su una casa a un piano a 1419,376. Va girata sulla **Birreria del Porto**
    (casa-torre, 1419,371): insegna a bandiera, lampione a muro, tenda colorata.
  - **Rua, verso est, nel primo tratto**: il portale e la scalinata del sagrato (1373-1379, 297-300). Basta il pezzo `facciata_chiesa`
    più leggibile: lampada sul portale e gradini illuminati.
  - **Corso e Via di Mezzo, verso ovest**: all'imbocco (1291,371) un'edicola o una fontanella.
  - **Rua, verso ovest** (1305,306): un lampione col braccio e una bandiera sulla Porta di Terra ridotta.
  - **Imbocchi del pettine sulla Vittoria** (es. Vico Lungo 1418,346): ognuno col suo colore di bottega e la sua luce.
- **Perché**: con la camera bassa sono le uniche cose che entrano in quadro dentro il borgo (sez. 6).
- **Tocca**: `scorci.js` (le ricette), `segnaletica.js`, `rete.js` (i lampioni a braccio), pezzi piccoli a muro. Niente archi né cavi
  in mezzo ai vicoli (`LEGGIBILITA.md` sez. 1: «niente archi sopra la testa più di uno ogni 30 m»). Rischio basso.

### 6 La Via della Vittoria in tre tempi

- **Cosa**: il cannocchiale sulla Rocca resta, dritto. Sul fronte sud (quello della camera, a due piani) si arretra il filo di 4-6 m in
  due punti:
  - lo **Slargo del Sottoportico** (1390-1408, 346-352, allo sbocco del Vico dei Tonnaroti), con una fontanella e due lecci;
  - uno **slargo davanti al Santuario del Mare** (1446-1462, 346-351).
- **Perché**: 221 m uguali diventano 90 + 38 + 56 m, con due «soste» dove fermarsi, sedersi, fare missioni. La parata ci passa ancora.
- **Tocca**: lotti sud della Vittoria (case 88, 89, 373, 376-378, 93), `vievive.js` (fermate e stalli), `scorci.js` (`ATTESA_CUCITURA`:
  se è ancora attiva sulla Vittoria, gli scorci lì non si posano), `test_mappa_compatta`, `test_botteghe`. Costo medio. Mock-up:
  `22_mock_6_vittoria_tre_tempi.png`.

### 7 Via di Mezzo: gomito e respiro

- **Cosa**:
  - un **gomito** subito dopo il Forno: il tratto fra x 1376 e 1392 scende di 2,5-3 m verso sud. Nella `MEZ` di `world_cittanuova.js`
    il punto `[1052, 169]` diventa `[1052, 171.5]`, quindi `[1372, 371.5]` in metri finali. La vista di 112 m si chiude sul fronte del
    Forno;
  - i due tratti a 2,2 m (1360-1375 e 1404-1420) portati a 3,4 m;
  - un **respiro** di 12 × 6 m davanti alla Birreria del Porto (1403-1415, 371-377, al posto delle case 436 e 437, 4 × 2 m l'una).
- **Perché**: il vicolo più lungo del borgo diventa compressione → Forno → gomito → respiro alla torre → Vico Lungo che scende al mare.
- **Tocca**: la polilinea `MEZ`, i lotti a nord e a sud, gli incroci col Vicolo delle Reti e il Vico dei Tonnaroti, la Scalinata del
  Forno (si aggancia alla `MEZ`), `test_percorsi`, `incroci.js`. Costo medio. Mock-up: `23_mock_7_8_via_di_mezzo_fessure.png`.

### 8 Le fessure a 3 m

- **Cosa**: le traverse `trav()` della Corte dei Pescatori, del Vico della Corte e dell'Androne passano da 2,5 a 3,5 m di larghezza nei
  dati, 3 m a vista. In alternativa la casa sul lato sud (quello della camera) scende a un piano.
- **Perché**: sono i tre punti in cui la camera è stretta per metà del tempo, con tutte e due le camere.
- **Tocca**: `trav()` e i lotti accanto (una fila di case si accorcia di un metro). Costo basso-medio. Insieme alla 7, che lavora
  sugli stessi isolati.

### 9 Il pettine sfalsato

- **Cosa**:
  - dove due vicoli si guardano attraverso la Vittoria o la Rua (Gatti / Reti, Bottai / Tonnaroti, Pozzo / Vico Lungo, Sale / Sorelle),
    spostarne uno di 4-6 m: l'incrocio a croce diventa due T «a baionetta» (schema nella tavola, verde a 1371-1378, 339-346);
  - dare a ogni vicolo la sua pendenza (`LEAN` per vicolo, da −0,2 a +0,25 invece di 0,16 per tutti);
  - portare lo scarto del gomito a metà vicolo da 2,4 a 4-5 m, così il gomito si vede.
- **Perché**: è il cuore dell'organicità. Le viste da 100-126 m si spezzano senza perdere quelle sul mare (i vicoli che scendono al mare
  restano dritti in fondo). La griglia scompare.
- **Tocca**: tutto il borgo si rilottizza: scorci, botteghe, tetti, graffiti salvati, rifugi e scene di `posti.js`, e le prove
  `test_mappa_compatta`, `test_percorsi`, `test_tetti4`, `test_tetti_vissuti`, `test_scorci`, `test_posti`, `test_botteghe`,
  `compenetrazioni`. Costo alto: va fatto in un filone a sé, un incrocio alla volta, con le foto prima e dopo.

### 10 Rua ovest: un vicolo verso la torre dell'acqua

- **Dove**: la Rua corre per 54 m (1292-1346) senza aprirsi a nord.
- **Cosa**: aprire un vicolo di 3 m a x ≈ 1325, fra il Condominio Stella e le case 217 e 251 (la casella a 1326,294 è già selciato),
  dalla Rua alla striscia sotto il rilevato, dove si vede la **torre dell'acqua di Radio Luna** (1307,272, 18 m con l'antenna).
- **Perché**: una scorciatoia verso le baracche e Radio Luna e una vista su un landmark dal tratto più cieco della Rua.
- **Tocca**: un `pett()` in più a nord della Rua e i lotti 217 e 251. Costo medio.

### 11 ★ Via delle Mura: due respiri

- **Cosa**:
  - uno slargo alla **scala di ronda** (1368-1380, 275-281), dove arriva il varco 1;
  - uno alla testa del Vico Scuro (1441-1453, 266-272), dove arriva il varco 2;
  - sul ritaglio fra la via e i binari (932 m² di selciato senza uso) gli **orti delle mura**: verde progettato, muretti a secco bassi
    (sotto 1 m: niente ostacolo per la camera).
- **Tocca**: caselle di selciato già libere (`COB` senza via), `vegetazione.js` e `paesaggio.js`. Niente lotti. Rischio basso.

### 12 Soste sulla Marina est e sulla Via del Lido

- **Cosa**: due panchine sul parapetto e un albero sui tratti di 42-44 m senza eventi.
- **Tocca**: arredo. Bassa priorità: il mare tiene già.

### Cosa **non** fare

- Non allargare i vicoli a pettine: 2,2-4 m fra case di due piani è il caruggio giusto. Si sfalsano, non si allargano.
- Non curvare la Vittoria né chiudere le viste dei vicoli sul mare: sono premi.
- Non aggiungere archi, cavi, bucato o tende sopra i vicoli per «riempire»: la camera bassa ci sbatte.
- Non riempire le corti di arredo: una corte vale per il vuoto e per una cosa sola (l'albero, il pozzo).

---

## 8. Il pacchetto sicuro (da fare per primo)

**1, 2, 3, 5, 11**. Lavorano su barriere, pezzi, arredo, segni e caselle già libere. Nessuna casa si sposta, quindi niente lotti,
niente graffiti persi e niente grafo dei tetti da rifare.

| Ordine | Proposta | File | Prova |
|---|---|---|---|
| 1 | 2: volta del Glacis (prima la foto) | `world_cittanuova.js` (posa del sottopasso) | `test_percorsi`, `test_visuale4` |
| 2 | 3: ingombri | `scena.js`, `chiarezza.js` | `test_chiarezza`, `test_scorci` |
| 3 | 1 e 11: varchi, belvedere, respiri della Via delle Mura | `world_cittanuova.js` (guardrail, passaggi, slarghi), `segnaletica.js` | `test_mappa_compatta`, `strumenti/incroci.js`, `test_pedonale`, `test_vievive` |
| 4 | 5: firme basse | `scorci.js`, `segnaletica.js`, `rete.js` | `test_scorci`, `test_segnaletica` |

Ogni modifica a un sorgente del mondo cambia l'impronta. `build.py` ricuoce `mondo_cotto.js` (~30 s) e i tasselli vanno ricotti dal
workflow (`tasselli.yml`, 15-20 min): finché non ci sono il gioco costruisce la città nel browser.

Fase 2, nell'ordine: **4** (corti passanti), **7 + 8** (Via di Mezzo e fessure: stessi isolati), **6** (Vittoria), **10**, e per ultima
la **9** (pettine), in un filone a sé.

---

## 9. Note

- Le misure sono sulla pianta e sulle scatole delle case, non sulla geometria disegnata: balconi, gronde sporgenti, insegne e alberi non
  ci sono. Il braccio della camera è una simulazione col raggio a sfera di `Camera7`, non la camera vera; i valori assoluti sono
  indicativi, il confronto fra i punti è affidabile.
- La camera bassa (18°/7 m) è un'ipotesi per il lavoro parallelo su `?camera9`. Quando quei numeri saranno decisi, le percentuali
  della sez. 6 andranno rifatte.
- Gli strumenti di misura sono script usa e getta (Node per il mondo e l'arredo, Python per raster, raggi e tavole, una sonda Playwright
  per le foto). Come da consegna non sono nel commit. Il metodo è nella sez. 1 e si rifà con `strumenti/censimento_pianta.js` e
  `strumenti/copertura_visuale4.js` come base.

---

## 10. Il pacchetto sicuro, fatto (`[urbanistica1]`, 6 novembre)

Il committente: «sì, liberare i vicoli». È nel gioco, acceso di serie. **`?nourbanistica1`** torna com'era: il mondo cotto e i tasselli non
si usano e la città si ricalcola nel browser. In Node: `PV_NOURBANISTICA1=1`.

| # | Cosa | Dove (metri finali) | File |
|---|---|---|---|
| 1 | **due varchi pedonali sulla ferrovia** dal Lungomare: il guardrail si apre (4,8 e 3,7 m) e sul binario c'è il passaggio pedonale (`passaggio_livello` largo 3,2 m: il riempimento fra le rotaie, le sbarre alzate, le croci, le lanterne). Il primo varco **si sposta sul Vico dell'Arco** (x 1411): sui Lanternini (x 1374) il binario corre ancora sul rilevato, 2 m sopra la strada. Il secondo è sul Vico Scuro (x 1446) | 1411 e 1446, y 255-275 | `world_cittanuova.js` (`VARCHI_LUNG`, posa dei parapetti) |
| 1 | **il belvedere**: davanti al varco dell'Arco il parapetto esce di 4 m sul mare per 12 m, con due spallette; il ripiano è banchina a 1,4 m | 1400-1412, 244-250 | idem (`CITY.belvedere`) |
| 2 | **le volte dei sottopassi in piano col suolo**: la volta posa sulla quota mediana del passaggio e il suolo sotto è in piano. Al Vico del Glacis l'altezza libera va da 1,9-2,8 m a **3,2 m** dappertutto; ai Lanternini e all'Arco cambia di qualche centimetro | 1484,294 · 1376,293 · 1412,300 | idem (passata finale, 7c) |
| 3 | **niente ingombri nei passaggi larghi una casella**: bidoni (spostati lungo la loro via, entro 15 m, dove il vicolo è largo: restano tutti e 16), tavolini, fioriere, lavagne e frigo dei dehors; in `render.js` solo la posa: la roba davanti alle porte e quella alla base dei muri, più niente «roba di cortile» sulle caselle che fiancheggiano una via. **Non** tocca i vicoli larghi due caselle: il fusto e la bombola della Via di Mezzo (foto 11) restano, perché lì la via è larga 4 m e ne lasciano 3 | tutto il borgo | `scena.js` (`piano`), `render.js` (`STRETTO35`, `oggetti35`, la vita alla base dei muri) |
| 5 | **le firme in fondo alle viste**: dove un vicolo guarda dritto per 40 m e più e la vista finisce sul muro di una casa, un'edicola votiva col lume, solo se davanti restano 3,4 m liberi, lontana dalle porte e dalle altre edicole. Ne nascono due (in fondo al Vico dei Gatti, sui due lati). **Nel gioco, da 25 m e più, un'edicola alta 3,8 m si legge appena** (di giorno conta il lume): la firma bassa vera viene col masterplan (M7), con le altane delle case-torri e le cose degli slarghi | 1374,348 · 1370,306 | `world_cittanuova.js` |
| 11 | **i due slarghi della Via delle Mura**: la striscia di selciato sotto le mura diventa piazzetta di 12 × 6 m (alla scala di ronda la fontanella, al Vico Scuro l'edicola sul pilastro) | 1368-1380 × 275-281 · 1441-1453 × 266-272 | `world_cittanuova.js` |

Il resto: `cotto.js` (con `?nourbanistica1` il mondo cotto non vale), `tasselli.js` (idem per i tasselli), `percorsi.js` (i passaggi
pedonali non sono «il passaggio a livello»: porte e landmark di `Percorsi` restano quelli di prima).

**Controlli.**
- **Percorsi e NPC**: le caselle del varco erano già percorribili (marciapiede, massicciata, selciato) e c'era solo il guardrail. Il grafo
  si rifà da sé. Nessuna casa si sposta.
- **Collisioni**: le barriere nascono dai parapetti (`opere()`): i varchi sono buchi nel guardrail, il belvedere ha il suo parapetto e
  le spallette. La fontanella ha il suo gradino (`game.js` supAdd).
- **Graffiti**: nessun muro si sposta. Le tre edicole nuove occupano 1,1 m di muro ciascuna.
- **Missioni**: i luoghi-missione e i loro ingressi non cambiano; le porte e i landmark di `Percorsi` sono gli stessi.
- **Tasselli**: l'impronta cambia, quindi il workflow `tasselli.yml` deve ricuocere. Finché non lo fa, la città si costruisce nel
  browser.

**Prove** (`node src/<prova>.js`, confrontate con le stesse prove con `PV_NOURBANISTICA1=1`, cioè com'era):
- **Passano**: `test_pedonale`, `test_mappa_compatta`, `test_chiarezza`, `test_scorci`, `test_segni` (i bidoni restano 16: si
  spostano, non spariscono), `test_compenetrazioni`, `test_posti`, `test_segnaletica`, `test_suolo2`, `test_vievive`.
- **Non passano già prima, e uguali**:
  - `test_tasselli`: l'impronta della prova non conta i `.glb.gz` di `assets/`, `build.py` sì;
  - `test_percorsi`: i giri del Mercato e del Forno;
  - `test_strade_integre`: 4 case a fessura, fuori dal pacchetto;
  - `test_costa2`: le passerelle sulle dune;
  - `test_tetti4`: le stesse 9;
  - `test_posa`: le stesse 6. Anzi una in meno, perché ora le edicole votive ci sono tutte.

**Prima e dopo nel gioco** (`3x_pacchetto_*.jpg`, a sinistra `?nourbanistica1`, a destra di serie, stessa camera e stessa ora):
- `30`: il varco del Vico dell'Arco. Prima il guardrail e la massicciata; dopo il passaggio con le sbarre e, di là, lo slargo.
- `31`: il belvedere sul mare.
- `32`: il varco del Vico Scuro.
- `33`: lo slargo delle Mura ovest con la fontanella.
- `34`, `35`: il sottopasso del Glacis con le due camere. Prima il suolo faceva la gobba sotto la volta, dopo è in piano.
- `39`: il Vico del Sale senza il bidone.

Le foto si fanno con `?nourbanistica1` e di serie dallo stesso punto, ore 10:30. La prova di fumo (`fumo6.js`, dietro il cancello dei due
posti del browser) dà `errori []`.
