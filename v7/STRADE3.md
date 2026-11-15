# STRADE3 — le strade coerenti: i segni dicono quello che fanno i mezzi

Ramo `strade3` da `claude/shader-styling-performance-wbvqfy` (vita2: il guidatore unico `Game.Guida`). Tavola: `_immagini/strade/strade3.jpg`.

Il committente: pavimenti e strade **molto coerenti e ben disegnati**: segnaletica orizzontale coerente, strisce pedonali nei posti
giusti (agli incroci e sulle linee di desiderio, attraverso la carreggiata, a filo dei cordoli), linee d'arresto all'imbocco
dell'incrocio dalla parte giusta della corsia, i cartelli giusti nei posti giusti e girati verso il traffico che regolano (a destra:
in Italia si guida a destra), senza chiudere il marciapiede, l'arredo dal lato giusto, niente giunture né difetti nei suoli. La regola:
**si aggiusta e si riposiziona, non si toglie**.

## Lo strumento

- `node strumenti/strade3_sonda.js [uscita.json] [cartelli_render.json]` (in Node, ~17 s). Carica la città nuova con le strade di
  serie (strade2) e prende il grafo che il guidatore usa davvero: le corsie di `G.LANES` dopo che vievive le stringe e le sposta per la
  sosta, i binari di `Guida.binario` (la corsia di destra), gli incroci dai capi di `LANES.conn` e dagli incroci a croce. Contro quel
  grafo prova la vernice e i cartelli di `segnaletica.js` (e, col file, quelli che posa `render.js`):
  - `zebra_*`: fuori da un incrocio o da una linea di desiderio (scuola, piazza, fermata), nel cuore dell'incrocio, storta, in curva,
    non a filo dei cordoli, su una via senza traffico;
  - `arresto_*`: manca (STOP, semaforo o dare precedenza senza linea), dalla parte sbagliata (non copre il binario di chi arriva o copre
    quello di chi va via), fuori posto (dentro l'altra carreggiata, dopo la zebra, oltre 10 m prima), orfana;
  - `cartello_*`: girato via dal traffico che regola (oltre 35°), a sinistra di chi arriva, che lascia meno di 1 m di marciapiede,
    doppio (due STOP per lo stesso approccio), mancante, staccato dalla sua linea, senza ragione (un «senso unico» dove le corsie vanno
    nei due versi, una «fermata» lontana dalle fermate, il divieto di sosta accanto agli stalli);
  - `segno_*`: la mezzeria fuori dalla separazione dei due binari, i margini e gli stalli dentro la sagoma di chi passa, le frecce e lo
    STOP contro il verso della corsia o fuori dalla corsia di chi arriva, le frecce che promettono svolte che il grafo non ha, il
    riquadro BUS dal lato sbagliato; `arredo_*`: le fermate alla sinistra dell'autobus.
  `STRADE3=0` dà il «prima» (le strade2 di serie senza questo lavoro).
- `node strumenti/strade3_vista.js <v7> <uscita.json> [query] [finestre]` (nel browser, ~4 min a finestra): scrive i cartelli posati
  da `render.js` (il registro `window.__strade3`: chi li posa, il punto, il verso finale dopo `snapRot2`) e misura le **giunture del
  suolo**: su finestre di 48 m guarda il suolo dall'alto con una camera della sonda (ortografica, solo le mesh del suolo e dei
  marciapiedi, senza le ombre delle case: la camera del gioco non si tocca) a 10 px/m; su ogni lato fra due caselle dello stesso tipo
  conta la *giuntura* (un gradino di luminanza proprio sul lato, 2,5 volte quello a 30 cm e a mezza casella) e il *salto* di tono fra due
  caselle omogenee (le tinte medie diverse di oltre il 6%), a parte i lati sui confini dei blocchi di 64 m. Salva le viste dall'alto.
- `node src/test_strade3.js [cartelli_render.json]`: la prova (zero casi per zebre, linee, cartelli, frecce; ≤ 2 margini).

## Cosa non tornava (la misura di prima)

La sonda sul ramo di partenza (`STRADE3=0`, con i 43 cartelli che render.js posa nella città): **44 casi**.
- **Zebre** (3): la zebra della fermata della Stazione scivolava dentro la svolta della Via della Stazione (12° di curva sotto le bande,
  storta di 5°), quella della Piazza sul Corso stava su 9° di curva.
- **Linee d'arresto** (1): al Passo del Lungomare c'erano il cartello STOP e la scritta, ma la linea cadeva nell'incrocio vicino
  (la pulizia la toglieva) e restava un cartello senza linea.
- **Cartelli** (37): 10 girati via dal traffico (il divieto di sosta all'ingresso della Vittoria di 180°, la P di 86-90°: guardava la
  strada di traverso, un attraversamento di 90°), 6 attraversamenti a sinistra di chi arriva (uno per zebra, sul lato della camera),
  **10 doppioni** (lo STOP e l'attraversamento di `buildStrade1` sopra quelli di segnaletica.js, a pochi metri: due STOP per lo stesso
  approccio), 7 pali che lasciano meno di 1 m di marciapiede, 2 «fermata» sui lampioni lontano da ogni fermata e un divieto di sosta
  accanto agli stalli, uno STOP 4 m dopo la sua linea.
- **Frecce** (3): «dritto» al semaforo del Porto per chi scende dal Corso (lì si va solo a destra o a sinistra), una freccia davanti a
  un incrocio che il guidatore non usa, una «destra» prima del bivio del Passo (la si leggeva per quello).
- Le zebre avevano il cartello per **11 versi di marcia su 34**.
- Le corsie e la mezzeria erano già coerenti (la mezzeria sta sulla separazione dei binari, spostata dalla sosta come le corsie di
  vievive; nessuna freccia contro il verso; le fermate tutte alla destra dell'autobus).
- **Il suolo dall'alto** (3 finestre nella città, 449 lati fra caselle uguali): 9 giunture (6 dentro i blocchi, 3 sui confini dei
  64 m) e 33 salti di tono oltre il 6% fra caselle omogenee.

## Le correzioni, alla fonte

Tutte dietro `S3` (di serie con strade2; `?nostrade3`, in Node `globalThis.PV_STRADE3 = false`, per confrontare).

**`segnaletica.js` — i segni degli incroci dal binario del guidatore.**
- `approccio(J, braccio)`: la corsia di `G.LANES` della strada del braccio, il verso verso l'incrocio, `Guida.binario` e l'ascissa dove
  il mezzo si ferma: appena fuori (60 cm) dalla carreggiata delle altre strade dell'incrocio, cioè dove il guidatore comincia l'arco di
  svolta; se c'è la zebra, 1 m prima delle strisce. Prima era il raggio del disco dell'incrocio più un numero, misurato sulla corda del
  braccio: le linee cadevano dentro un incrocio vicino (il Passo del Lungomare: lo STOP c'era, la linea e la scritta no).
- `traverso()`: la linea d'arresto va dalla separazione dei binari (l'asse della corsia, +12 cm) al ciglio di destra; lo STOP, le frecce
  e le scritte stanno al centro della corsia di chi guida (senza la striscia della sosta) e sono girati lungo il binario.
- `uscite()`: le frecce ai semafori e prima dei bivi del Porto e della Stazione dicono le uscite vere del grafo (`LANES.conn` al capo
  della corsia; dritto più le corsie che si innestano per chi passa), con la stessa direzione dei bracci (la corda a 10 m). Due tessere
  nuove: destra-sinistra (il Corso sul semaforo del Porto: prima diceva «dritto», dove non si va) e dritto-destra-sinistra. Niente
  freccia prima di un altro incrocio (la si leggerebbe per quello). La scritta della meta solo se il guidatore da lì ci va.
- Il cuore dell'incrocio per la pulizia dei segni è dove si sovrappongono due carreggiate (non il disco largo).

**I cartelli.** `cartelloPer()`: sul ciglio alla destra di chi arriva, la faccia verso di lui, prima i posti che la camera vede, e se
il marciapiede è stretto a bandiera sul muro di destra.
- STOP e dare precedenza all'altezza della linea (o fino a 6 m prima);
- l'attraversamento: **uno per verso** (prima uno per zebra, sul lato della camera: metà erano a sinistra di chi arrivava);
- il divieto di sosta dell'asse per chi entra, la P girata verso chi passa accanto agli stalli (prima guardava la strada di traverso),
  l'area pedonale sul muro alla destra di chi entra nel vicolo;
- `liberoPalo` rifiuta il palo che lascia meno di 1 m fra sé e il muro.

**Le zebre di desiderio** (scuola, piazze, fermate): su un tratto dritto (±2,8 m, 4°), fuori dagli incroci dei mezzi, intere; prima
fuori anche dalle bocche dei vicoli, poi (sulla Vittoria, dove i vicoli sboccano ogni 10 m) anche sulla bocca di un vicolo; se la via
più vicina non ha un posto (la Via della Stazione, 18 m tutti in curva), la prossima entro 26 m. Prima scivolavano nella svolta.
La zebra che non ci sta intera non ferma più gli altri segni.

**`render.js`.** Nella cornice di segnaletica.js lo STOP, il dare precedenza e l'attraversamento di `buildStrade1` non si raddoppiano
(li mette segnaletica dal binario; fuori dalla cornice restano). I cartelli sui pali dei lampioni (`staffa_cartello`) dicono quello che
c'è: «fermata» solo entro 15 m da una fermata dello stesso lato, la P dove ci sono gli stalli di quel lato, se no il divieto di sosta;
mai «senso unico» (le corsie di `G.LANES` si fanno nei due versi), e guardano il traffico del loro lato (prima giravano col lampione).
Il registro `window.__strade3` per la sonda; `R.__ed.renderer` per la camera della sonda del suolo.

**`pavimenti.js` — la giuntura dei blocchi.** Lo shader del suolo legge la mappa del blocco (64 m) fra i quattro texel attorno al punto
e misura le coordinate della via (s, v) dal centro del texel. Sul bordo del blocco il texel «di fuori» veniva letto dal bordo (la
tessitura è bloccata) ma il centro restava quello di fuori: le file delle pietre, i giunti e l'usura dell'asfalto saltavano di 25-50 cm
sulla linea dei 64 m. Ora l'indice del texel si blocca dentro la mappa (anche nel ramo leggero e nel lod).

## Com'è venuta

La stessa sonda sul ramo (`node strumenti/strade3_sonda.js`, con i 31 cartelli che render.js posa ora): **4 casi** (44 prima).

| | prima | dopo |
|---|---:|---:|
| casi della sonda, tutti | 44 | **4** |
| zebre in curva, storte o fuori posto | 3 | **0** |
| approcci senza linea d'arresto o con la linea dalla parte sbagliata | 1 | **0** |
| cartelli girati via dal traffico | 10 | **1** |
| cartelli a sinistra di chi arriva | 6 | **0** |
| cartelli doppi per lo stesso approccio | 10 | **0** |
| pali che lasciano meno di 1 m di marciapiede | 7 | **2** |
| cartelli senza ragione o staccati | 4 | **0** |
| frecce che promettono svolte che il grafo non ha | 3 | **0** |
| versi di marcia delle zebre col cartello | 11/34 | **23/34** |
| la ricchezza: zebre · linee d'arresto · frecce e scritte · cartelli | 17 · 13 · 15 · 67 | 17 · **14** · 15 · 61 |
| suolo dall'alto: giunture fra caselle uguali | 9/449 | 10/420 |
| suolo dall'alto: salti di tono oltre il 6% | 33 | 34 |

- I 4 casi che restavano a quella misura erano tre **semafori** di `buildStrade1` (uno girato di 146°: `snapRot2` lo scattava a quarti
  di giro; due a meno di 1 m dal muro) e un margine del Corso che la sagoma di chi passa copre di 27 cm in curva (sotto la tolleranza
  di 25 cm per poco: la ruota sulla riga). I semafori sono corretti nell'ultimo commit (i cartelli e i semafori di render.js non
  scattano più a quarti; il palo cerca 1 m di marciapiede, prima a 75 cm poi a 45 cm dal ciglio): la misura nel browser di quest'ultimo ritocco non è rifatta (la coda del browser condiviso era
  piena), e le foto 2 e 3 della tavola sono di prima del ritocco.
- Le cose non diminuiscono: le zebre restano 17 (la Stazione perde la sua, che non ha un tratto dritto entro 26 m; la Piazza Grande ne
  guadagna una sulla Vittoria), le linee d'arresto salgono a 14 (torna quella del Passo), le frecce e le scritte restano 15 (due tessere
  nuove), i cartelli di segnaletica.js salgono da 33 a 39 (un attraversamento per verso); spariscono solo i 12 doppioni di render.js.
- **Il suolo**: la misura dall'alto non vede differenze (10 giunture su 420 lati contro 9 su 449, 34 salti contro 33). Nel browser senza
  scheda video i blocchi lontani dalla camera del gioco arrivano a pezzi anche accesi a mano: dove una finestra ha un blocco a metà, i
  «confini dei 64 m» misurano il buco, non la cucitura; la correzione dei texel al bordo del blocco (pavimenti.js) è ricavata dal
  codice e va guardata da vicino su una scheda vera. Nelle finestre misurate il suolo ha il 2% di giunture e l'8%
  di salti; nella vista dall'alto del Corso si vede un bordo a scaletta di caselle fra il lastrico della piazza e la terra (fra due
  materiali diversi, quindi fuori da questa misura): da guardare nel generatore delle piazze.
- **La tavola** `_immagini/strade/strade3.jpg`: otto coppie prima | dopo alla camera del gioco (960×600, ore 11, sereno, 45 s dopo il
  caricamento e a blocchi fermi) e i numeri. Si vedono: il divieto di sosta della Vittoria che ora guarda chi entra (1), la freccia
  dritto-destra e la scritta PORTO sul binario della Marina (2), lo STOP del Passo del Lungomare sul binario e un solo cartello (4), il
  cartello d'attraversamento alla destra di chi arriva alla zebra del Lungomare (6). La 3 e la 5 inquadrano poco dei loro incroci (la
  camera del gioco guarda il personaggio, che non si sposta per la foto); la 8 è una via lunga dove la sonda non trovava niente.

## Le prove

- `node src/test_strade3.js`: tutto bene (zebre, linee, cartelli e frecce a zero, un margine).
- `node src/test_segnaletica.js` (di serie in Node senza strade2: com'era) e con `globalThis.PV_STRADE2 = true`: le prove che non
  passavano non passano, nessuna nuova (le zebre di desiderio «fuori dagli incroci» contano anche le bocche dei vicoli: sulla Vittoria
  sboccano ogni 10 m; il riquadro BUS 1 su 6 è di strade2).
- `node src/test_suolo.js`: come prima; con strade2 tutto bene (`arresto_verso` ora misura la corsia dalla mezzeria dipinta, che vievive
  sposta per la sosta: lo STOP sul binario della Via del Porto sta 1,26 m a destra della mezzeria e 26 cm dall'asse della strada).
- `node src/test_pedonale.js`: tutto bene.
- Fumo (`fumo6.js`): `errori []` sul ramo (prima dell'ultimo ritocco dei semafori di render.js).

## Note

- **L'impronta dei tasselli cambia** (render.js, segnaletica.js e pavimenti.js ne fanno parte): `1054fac2789098fa` → `95944249afe968a7`.
  Finché il workflow non li ricuoce la città si costruisce nel browser (o con `?tassellivecchi` si vedono le strade di prima). Il mondo
  cotto (`mondo_cotto.js`, `1849c0282a62b376`) non cambia.
- Il guidatore non è toccato (game.js, vievive.js, azioni.js com'erano); la camera nemmeno; personaggi.js, guardaroba.js, vestiario.js e
  `unico_*` no.
