# Porto Vecchio — la fase F1 del masterplan, da provare: anelli e corti (`?urbanistica2`)

L'urbanista, 7 novembre 2026. Il committente vuole **provare** la pianta nuova, non solo leggerla. Questa è la fase F1 di
`MASTERPLAN.md` (sez. 5), costruita davvero e spenta di serie: **aggiungi `?urbanistica2` all'indirizzo** e cammini il borgo con i passaggi
e gli slarghi nuovi; senza, la città è quella di oggi. Il confronto è immediato (stesso indirizzo, con e senza).

| Immagine (`_immagini/urbanistica2/`) | Cosa mostra |
|---|---|
| `mappa_f1.jpg` | **la mappa da leggere al volo**: oggi e F1 affiancati, i luoghi numerati con la loro cosa e una riga |
| `prima_dopo_01…10_*.jpg` | ogni luogo nel gioco, oggi e con F1, con la camera di oggi e con `?camera9` (stile E, 1600×900, ore 10:30) |
| `tavola_prima_dopo.jpg` | tutte le coppie in un foglio |
| `leggibilita.jpg` | 8 m prima di ogni bocca e di ogni gomito, camera di oggi e `?camera9`: si legge il tratto dopo? |
| `giro.jpg` | il giro Sottopassino → Corte delle Monache → Slargo della Torre in otto fotogrammi |

---

## 0. In una pagina

- **Sei passaggi nuovi** e **sei slarghi**, tutti nel borgo nord e attorno alla Vittoria:
  1. il **Sottopassino dell'Orto** sotto la ferrovia, dal Lungomare all'Orto;
  2. l'**Orto delle Mura** sotto il rilevato;
  3. il **Vico della Torre**: la Via delle Mura continua fino all'Orto e scende alla Rua;
  4. lo **Slargo della Torre** sulla Rua;
  5. l'**Androne delle Monache**, dalla Rua nella corte;
  6. la **Corte delle Monache**, passante;
  7. il **Passo della Corte**, dalla corte al Vico Scuro;
  8. il **Passo del Calzolaio**, dalla Via delle Mura al sagrato;
  9. la **Corte del Calzolaio**, a metà del passo;
  10. la **Piazzetta del Lavatoio** sul Vico del Lavatoio;
  11. la **Corte del Flipper**, dalla Vittoria alla Corte dei Pescatori.
- Ogni slargo ha **una cosa sola**: la fontanella, gli agrumi dell'orto, il fico (e la scala di ferro ai tetti, che `tetti.js` mette da sé
  nella corte), il lavatoio coperto, il pozzo. Pezzi del kit che ci sono già (`fontana`, `pozzo`, `lavatoio`, `sottopasso`), gli alberi
  del verde istanziato (`fico`, `agrume`).
- **Le misure del sez. 1, rifatte sul mondo vero** (sez. 4): anelli da 24 a **29**, corti cieche da 3 a **0**, il tratto a scelta unica più
  lungo da 43 a **38 m** (resta la Via di Mezzo, che è F2), il Lungomare senza un bivio da 111 a **69 m**, lo slargo più vicino a una
  mediana di **13 m** (prima 16) e il 90° percentile a **30 m** (prima 35).
- **La regola del committente** (sez. 1) vince sul masterplan: niente sotto 4 m fra i muri, i gomiti larghi, le bocche che si vedono.
- **Si spegne da sé**: senza `?urbanistica2` niente cambia, neanche l'impronta dei tasselli (sez. 3).

---

## 1. La regola dei passaggi (principio di progetto)

Il committente: gomiti, curve e passaggi stretti devono essere **larghi, percorribili, leggibili e comprensibili**, altrimenti il giocatore
si confonde. Vale per tutto quello che si costruisce da F1 in poi, e dove il masterplan dice altro vince questa regola.

- **Larghezza**: nessun passaggio sotto **3,4 m liberi**. Niente «Androne segreto» di 2,6 m: in F1 i passaggi hanno 4 m fra i muri (due
  caselle), il Passo della Corte 6 m, il Sottopassino 4,4 m di fornice.
- **Gomiti**:
  - ognuno gira al più di **30-35°**, mai uno zig-zag a 90°;
  - l'interno del gomito si allarga (lo spigolo si smussa o la casa d'angolo si accorcia): **da 8 m prima del gomito si vedono almeno 6 m
    del tratto dopo**;
  - due gomiti stanno ad almeno **12 m**.
- **Dove la via deve girare di più** (90°), gira **dentro uno slargo**, non in un vicolo: l'angolo dell'Orto (10 × 9 m), la Corte delle
  Monache (10 × 22 m), la Corte del Flipper (10 × 6 m).
- **Bocche leggibili**: ogni passaggio si riconosce dalla via da cui parte. La bocca è larga almeno quanto il passaggio e ha un segno: la
  luce, un arco, una pianta, o la cosa dello slargo che si vede attraverso (il fico in fondo all'Androne, la fontanella dalla Rua, il
  pozzo dalla Vittoria). Niente fessure buie.
- **Sottopassi**: corti, larghi e chiari; l'uscita si vede dall'imbocco.
- **Il fondo della vista**: dove un passaggio, un gomito o uno slargo inquadra il fondo di una vista, il muro che la chiude è cieco
  (almeno 6 × 4 m, senza finestre, davanzali né insegne), così la strada dipinta ci può mettere il pezzo grande (sez. 6).
- **La camera**: la camera di oggi e `?camera9` passano ogni gomito e ogni passaggio senza chiudersi, senza entrare nei muri e senza perdere
  il personaggio. Si controlla camminando (sez. 5): nessun fotogramma col braccio sotto il 60% o col personaggio coperto.

---

## 2. I luoghi (coordinate finali, metri)

| # | Luogo | Dove | Com'è | La sua cosa | Case |
|---|---|---|---|---|---|
| 1 | **Sottopassino dell'Orto** | 1341, 258 → 281 | dritto, a squadra col binario, 22 m da asse ad asse, 9 sotto la volta; fornice di 4,4 × 3,8 m (il pezzo `sottopasso`, come la Via Cavour); il suolo in piano sotto la volta a 0,93 m e la ferrovia che passa sopra sul suo impalcato (`writing.js` lo fa da sé dove una via incrocia la linea) | la luce dell'Orto in fondo | — |
| 2 | **Orto delle Mura** | 1314-1366 × 277-285 | la striscia di selciato sotto il rilevato con le aiuole lungo il piede (erba, sotto 1 m: niente ostacolo per la camera); all'angolo ovest lo slargo di 10 × 9 m | due agrumi; di lì il campanile | 3 casette tolte all'angolo (un piano, una baracca) |
| 3 | **Vico della Torre** | Via delle Mura (1374, 282) → Orto → Rua (1315, 306) | la Via delle Mura si prolunga a ponente fino all'angolo dell'Orto e scende per la striscia che oggi è un cortile cieco, larga 6 m | la torre dell'acqua di Radio Luna alle spalle | (con 2 e 4) |
| 4 | **Slargo della Torre** | 1315, 298 | lo sbocco della striscia sulla Rua, allargato di una fila di case; accanto la casa-torre della Porta | la fontanella | 2 tolte |
| 5 | **Androne delle Monache** | Rua (1434, 313) → corte | 4 m, la bocca sulla Rua di 8 m | il fico in fondo, nell'asse | 2 tolte |
| 6 | **Corte delle Monache** | 1430-1440 × 280-304 | la corte cieca diventa passante; resta selciato chiuso dalle case | il fico, la scala di ferro ai tetti (`tetti.js`), la porta dell'Osteria | — |
| 7 | **Passo della Corte** | corte → Vico Scuro (1446, 291) | 6 m | — | 1 tolta |
| 8 | **Passo del Calzolaio** | Via delle Mura (1394, 280) → sagrato → Rua (1396, 308) | dritto (uno scarto di 1,8 m a metà), 4 m, accanto alla bottega del calzolaio | il campanile davanti | 4 tolte |
| 9 | **Corte del Calzolaio** | 1395-1404 × 286-298 | la corte dietro la chiesa, a metà del passo | il respiro (i vasi di chi ci abita) | — |
| 10 | **Piazzetta del Lavatoio** | 1382-1394 × 318-328 | sul Vico del Lavatoio fra i Gatti e i Bottai | il lavatoio coperto (pezzo `lavatoio`, tettoia) | 6 tolte |
| 11 | **Corte del Flipper** | Vittoria (1371, 340) → corte → Corte dei Pescatori (1384, 362) | in asse col Vico dei Gatti (un incrocio vero); il passo di 4 m nella casa d'angolo, la corte dietro la sala giochi, poi 4 m fino al Vicolo delle Reti | il pozzo | 1 tolta, 3 accorciate |

In tutto **19 case tolte e 3 accorciate** (su ~350 nel borgo); il masterplan ne stimava 6-8 per F1, ma molte sono casette di una o due
caselle (le baracche dell'Orto, gli annessi). Ogni slargo ha **un pezzo medio** (fontanella, lavatoio, pozzo) o un albero, e al più due
piccoli (gli agrumi).

**Rispetto al masterplan**, tre cose cambiano per la regola del committente e per il Covo:
- l'**Androne** non è più coperto e largo 2,6 m: è aperto e largo 4 m (una volta da 8 m di fronte, `arco_sottopasso`, lì non ci sta fra la
  Latteria e la Ferramenta);
- il **passo dalla Corte delle Monache al Vico delle Monache** non c'è: sboccava proprio accanto al fondo della corte, che confina col Covo
  (sez. 6). La corte resta passante con l'Androne e il Passo della Corte;
- lo **Slargo della Torre** sta 9 m più a ponente (1315 invece di 1324), sullo sbocco della striscia che c'è già: a 1324 avrebbe tolto la
  Farmacia e la casa-torre della Porta, che il masterplan stesso vuole come landmark (M7).

---

## 3. Come è agganciato: l'interruttore e i tasselli

- **`src/urbanistica2.js`** (nuovo) fa tutto. A interruttore spento non fa niente.
- **A interruttore acceso**, nel browser:
  - la pagina non legge il mondo cotto (`index.src.html`) né i tasselli (`tasselli.js`);
  - salta `world_cittanuova.js` e lo riesegue subito dopo col testo toccato in tre punti (le «pezze»): senza mondo cotto, `mondo(W)` dopo
    `expand()` e `fine(W)` dopo il verde. Se una pezza non trova il suo punto, il mondo resta quello di serie e `Urbanistica2.stato.errore`
    dice perché.
- **In Node**: `PV_URBANISTICA2=1 node -r ./urbanistica2.js test_xxx.js` (l'aggancio è un `require` che carica il testo toccato).
- **`mondo(W)`** lavora come `casette()` e `arretra()`:
  - toglie o accorcia le case (al posto di una casa tolta va l'ultima della lista: le altre tengono il loro indice, e con lui insegne,
    facciate, semi; la città resta com'era);
  - stampa le vie nuove nella griglia;
  - fa gli slarghi, posa i pezzi con la loro quota, abbassa il rilevato lungo il Sottopassino;
  - rifà le opere (barriere, pedonali).

  `W.urbanistica2` dice cosa ha fatto. Le case si indicano col punto e col nome che devono avere: se il mondo di serie cambia, l'intervento
  si salta e si annota.
- **I tasselli.** L'impronta della città a tasselli (`IMPRONTA_TASS`) è fatta di tutti i moduli del gioco: toccare `world_cittanuova.js`
  l'avrebbe cambiata e online la città si sarebbe costruita nel browser fino alla ricottura. Per questo F1 sta tutta in un modulo nuovo che
  **sta fuori dall'impronta** (`build.py`, `TASS_FUORI`, come il caricatore dei tasselli): a interruttore spento non tocca la città.
  - `IMPRONTA_TASS` resta `48196fd63f899c14`;
  - l'impronta del mondo cotto resta `b0e755cd030a0cbf`: `mondo_cotto.js` non cambia.

  Con `?urbanistica2` la città si costruisce nel browser, senza tasselli: è una prova.
- **Quando F1 sarà approvata**: le pezze e `mondo()` entrano in `world_cittanuova.js`, il modulo se ne va (e con lui l'eccezione in
  `TASS_FUORI`), i tasselli si ricuociono.
- Le manopole per provare: `?u2salta=flipper,lavatoio` spegne una zona alla volta (in Node `PV_U2_SALTA`; le zone: `torre`,
  `sottopassino`, `monache`, `calzolaio`, `lavatoio`, `flipper`).

---

## 4. Le misure (sez. 1 di `MASTERPLAN.md`, rifatte sul mondo vero)

Stessi strumenti e stesse definizioni del masterplan (rete di `W.roads`, eventi bivio/slargo/vista, camera bassa 18° e braccio 7 m per i
landmark), cornice x 1300-1470, y 255-412. «Oggi» è la città di serie (col pacchetto sicuro F0), «F1» la stessa con `?urbanistica2`.

| Misura | Oggi | **F1** | Masterplan (tutto) |
|---|---|---|---|
| tratto a scelta unica più lungo | 43 m (la Rua) | **38 m** (la Via di Mezzo: F2) | 33 m |
| quota dei tratti a scelta unica oltre 35 m · 90° percentile | 4,7% · 23 m | **2,0% · 21 m** | 0% · 17 m |
| tratto senza un bivio, tutte le vie (Lungomare) · quota oltre 45 m | 111 m · 12,8% | **69 m · 9,3%** | 66 m · 8,9% |
| tratto senza un bivio, solo i vicoli | 43 m | **41 m** (il Vico della Torre, dalla Rua al Sottopassino, con due slarghi in mezzo) | 38 m |
| **anelli** (numero ciclomatico) | 24 | **29** | 30 |
| **corti cieche** | 3 (Monache, dietro il sagrato, Flipper) | **0** | 0 |
| capi senza uscita | 8 | **7** (la Via delle Mura ora prosegue) | 7 |
| slarghi e piazze nella cornice | 9 (5 piazze + 4 di F0) | **15** | 21 |
| **distanza dallo slargo più vicino**: mediana · 90° percentile · massimo | 16 · 35 · 73 m | **13 · 30 · 73 m** | 9 · 22 · 54 m |
| metri di via a più di 30 m da uno slargo | 17% | **10%** | 5% |
| vicoli sotto 3 m | 17,5% | **14,1%** (i vecchi: il pettine è F3) | 0,2% |
| landmark o mare in quadro camminando: cornice · cuore | 55% · 35% | 55% · 33% | 64% · 46% |

Quello che resta lontano dall'obiettivo è dove F1 non arriva: la Via di Mezzo e la Vittoria (F2), il pettine e i vicoli stretti (F3), le
altane delle case-torri che fanno i landmark (F4). Il massimo di 73 m dallo slargo è sulla Via di Mezzo.

---

## 5. Leggibilità e camera

Le misure della regola (sez. 1) sui passaggi veri (raster delle case a 25 cm, raggi all'altezza degli occhi):

| Passaggio | Larghezza libera, minima | Gomiti (gradi) | Da 8 m prima, metri visti dei 6 dopo |
|---|---|---|---|
| Sottopassino | 4,1 m (4,4 sotto la volta) | nessuno | — (dritto: l'uscita si vede dall'imbocco) |
| Vico della Torre | 4,1 m (6,2 al 10° percentile) | 87° **dentro l'angolo dell'Orto** (slargo), 17° | 6 · 6 |
| Androne delle Monache | 4,1 m | 13° | 6 |
| Passo della Corte | 6,1 m | nessuno | — |
| Passo del Calzolaio | 4,1 m | 10° e 18° (uno scarto di 1,8 m) | 6 · 6 |
| Corte del Flipper | 4,1 m | 11°; poi 92° **dentro la corte** | 6 · **4** |

La Corte del Flipper è il punto più debole: la sala giochi (un piano, con nome e porta: non si tocca) fa lo spigolo interno della svolta.
Il passo gira dentro la corte e non sul suo spigolo, così il retro si vede già dal passo: 4 m dei 6 a occhio d'uomo; la camera di oggi, più
alta del tetto della sala giochi, lo vede tutto. La foto 13 di `leggibilita.jpg` mostra le due camere.

**Il giro della camera** (`leggibilita.jpg`; strumento: la sonda di cattura dell'urbanista, come `strumenti/sonda_occlusione.js`): il
personaggio cammina col motore del gioco lungo ogni passaggio nuovo, nei due versi, con la camera di oggi e con `?camera9`; a ogni
fotogramma si legge il braccio della camera (`__CAM7.S.arm`) e se una casa non tagliata copre il personaggio (il raggio dal busto e dalla
testa alla camera entra nella sua scatola). Prima del gioco, la stessa prova sulla geometria: dal busto (1,15 m) il braccio va indietro lungo la direzione del cammino con la pendenza
della camera (10 m a 34° la camera di oggi, 7,5 m a 20° `?camera9`), e dove entra per la prima volta nel volume di una casa la camera
dovrebbe venire avanti.
- Su 1.624 casi (406 punti, uno ogni mezzo metro, nei due versi e con le due camere), **dentro i passaggi nessuno sotto il 60%**.
- Sotto il 60% ci sono solo i primi 2-3 m sulla via da cui si entra: fermi sulla Rua (o sul Vico Scuro, sul Vicolo delle Reti, sull'Orto)
  e girati verso la bocca, la camera passa sopra le case dall'altra parte della via.
- È quello che fanno oggi le bocche di tutti i vicoli: il Vico dell'Arco 0,38, il Vico delle Monache 0,23, il Vico dei Bottai 0,23, il
  Vicolo delle Reti 0,17, misurati allo stesso modo.

RISULTATI_GIOCO

---

## 6. I vincoli della sez. 5

- **Il Covo** (il bunker nelle mura, 1438,280, confina col fondo nord della Corte delle Monache).
  - Il luogo del covo (`PLACES.covo`, 1445,299, sul Vico Scuro) e il suo segno dipinto non cambiano: lo vedono le stesse caselle di via
    di prima (30).
  - Il fondo della corte resta un **recesso chiuso**: niente passo verso il Vico delle Monache (sboccava lì accanto), e il fico sta in
    fondo all'asse dell'Androne.
  - Misura (raggi a occhio d'uomo dalle caselle di via entro 45 m verso il fondo della corte, 1438,281): oggi **0** caselle lo vedono; con
    F1 senza il fico lo vedrebbero 13 (dall'Androne e, di là dalla Rua, dal Vico del Pozzo, che è in asse); **col fico, 0**.
  - La corte diventa l'anticamera del covo, ma l'ingresso non si vede dalla strada.
- **I graffiti.** La strada dipinta (stile E) metteva **10 lavori su 3 muri** delle case tolte (8 sul fianco della casa dove ora si apre il
  Passo della Corte, uno sulla casa del retro del Flipper, uno accanto alla porta della casa dell'Androne). Con F1 ognuno torna, con lo
  stesso stile, la stessa zona e lo stesso livello, sul muro più vicino al suo posto di prima: i fianchi nuovi del Passo della Corte, della
  Corte del Flipper, dell'Androne (scarto medio 3,2 m; `urbanistica2.js`, `GRAFFITI`). Il resto della strada dipinta si ridistribuisce da
  sé, a regole: nelle zone di F1 i lavori sono 137 oggi e 136 con F1 (in tutta la città 952 e 927: la distribuzione a regole si rimescola quando cambiano i muri).
- **I percorsi** (`percorsi.js`): ogni scorciatoia resta più corta del 30%; i giri sui tetti del borgo restano quattro (il Forno, il
  campanile, la ferrovia, e il giro del Pozzo al posto di quello delle reti). Per tenerli la casa d'angolo della Corte del Flipper si
  accorcia invece di sparire: senza di lei il giro del Forno si spezzava.
- **NPC, regia, missioni**: le prove dei posti, delle botteghe, della regia e delle vie vive passano come prima; i luoghi-missione e i
  loro ingressi non cambiano (nessuna casa con nome o bottega si tocca: `urbanistica2.js` lo controlla).
- **Prestazioni**: PRESTAZIONI

### I muri di fondo (per la strada dipinta)

Chi lavora ai graffiti ha visto che le viste lunghe finiscono su facciate piene di finestre, dove un pezzo grande di fondo non ci sta. La
regola, da F1 in poi: **dove un passaggio, un gomito o uno slargo inquadra il fondo di una vista, il muro che la chiude è cieco**:
- un timpano, un retro o un muro di confine;
- almeno 6 m di larghezza e 4 m di altezza, senza finestre, davanzali né insegne.

**Il dato.** `mondo()` guarda lungo l'asse di ogni passaggio e di ogni slargo di F1 (13 viste) fino al primo muro e lo scrive in
`W.urbanistica2.muriFondale`. Per ognuno:
- la vista e il punto da cui si guarda;
- la distanza;
- che cos'è: `rilevato`, `pezzo` o `casa` (con `casa` e `faccia`);
- il centro, la normale (verso chi guarda), la larghezza e l'altezza;
- `cieco` (oggi senza finestre) e `adatto` (6 × 4 m, senza porta né insegna);
- `perche`, quando non va.

`W.muriFondale` è l'elenco dei soli adatti: è quello che `writing.js` (`fondaleCieco`, `fondaleMuroG`, sul ramo dei graffiti, non
ancora unito: qui non si tocca) può leggere.

| Vista | Il fondo | Largo × alto | Stato |
|---|---|---|---|
| Vico della Torre, dalla Rua | il muro del rilevato della ferrovia, sotto la torre dell'acqua | 12 × 4 m | **cieco**: il pezzo grande va lì |
| Corte del Flipper, dalla Vittoria | il fianco nord della casa in fondo alla corte (accorciata da F1) | 6 × 7,2 m | **adatto**: la porta passa sul fronte della Via di Mezzo, la faccia resta da fare cieca (`b.muroFondale`) |
| Corte del Flipper, dal Vicolo delle Reti | il fianco est della casa d'angolo della corte | 6 × 7,2 m | **adatto**: la porta passa sulla corte, la faccia resta da fare cieca |
| il Sottopassino, dal Lungomare e dall'Orto | le spalle di pietra ai lati del fornice | 2 × 3,8 m (12 × 5,15 col fornice) | cieche ma strette: tag e pezzi piccoli |
| Sottopassino, dal Lungomare (di là) · Vico del Lavatoio, dai Bottai · Flipper, verso le Reti | facce con la porta o la bottega (una ha il nome) | 6-12 m | non adatte: la porta non ha un'altra faccia libera, o la casa ha un nome |
| Androne · Passo della Corte · Passo del Calzolaio · Vico del Lavatoio, dai Gatti | facce di 2-4 m | — | strette: la vista finisce su uno spigolo o su un vicolo che continua (dall'Androne, poi, c'è il fico) |
| Orto verso le Mura · Calzolaio dal sagrato · Vico della Torre dalle Mura | la vista continua o finisce sul piede basso del rilevato | — | aperte |

**Le finestre.** Oggi `render.js` mette le finestre su ogni faccia che dà su uno spazio aperto, e `render.js` sta nell'impronta dei
tasselli: in F1 non si tocca. Quindi:
- il muro del rilevato è cieco già oggi;
- le due facce di casa adatte portano la richiesta `b.muroFondale = { f, largo, alto, vista }`;
- quando F1 entrerà di serie, `render.js` dovrà leggerla per farle cieche, come fa già col tratto del ritratto (`b.__prop`).

### Le prove (`node <prova>.js`, di serie e con `PV_URBANISTICA2=1 node -r ./urbanistica2.js <prova>.js`)

Le prove della città, di serie e con F1 (le righe NO, cioè le prove che non passano):

| Prova | Di serie | Con F1 | Note |
|---|---|---|---|
| `test_tasselli` | 1 | 1 | la stessa (l'impronta della prova non conta i `.glb.gz`); l'impronta della pagina è quella dei sorgenti |
| `test_percorsi` | 2 | 2 | le stesse; **ogni scorciatoia resta più corta del 30%**; i giri sui tetti nel borgo restano 4 |
| `test_strade_integre` | 1 | 1 | la stessa (4 case a fessura, fuori da F1); nessuna carreggiata sotto le case, capi staccati 2 come prima |
| `test_tetti4` | 9 | 9 | quante prima, ma una cambia (sotto) |
| `test_posa` | 6 | 6 | le stesse |
| `test_costa2` | 1 | 1 | la stessa |
| `test_imperfezioni` | 2 | 2 | le stesse |
| `test_mappa_compatta` | 0 | 0 | i vicoli 34 (al più 34: l'Androne e il Passo della Corte sono una via sola) |
| `test_pedonale`, `test_tetti_vissuti`, `test_scorci`, `test_posti`, `test_botteghe`, `test_regia`, `test_chiarezza`, `test_segni`, `test_segnaletica`, `test_compenetrazioni`, `test_strada_dipinta` | 0 | 0 | |
| `test_vievive` | 0 (4 giri) | 0 in 2 giri su 4 | negli altri due una scena delle vie «non parte» in tempo, ogni volta un'altra (la fila all'edicola, l'attacchino): le scene dipendono da chi passa, e con F1 la gente cammina per vie diverse. Da riguardare prima di portare F1 di serie |

**`test_tetti4`, il delta esatto.** Le 9 restano 9, con una sostituzione:
- con F1 passa «Il giro del Forno: 1 vie su e 1 giù» (di serie non passa);
- non passa «Il giro del Pozzo: 1 vie su e 1 giù» (il giro del Pozzo prende il posto di quello delle reti).

Le altre otto sono le stesse, con numeri un poco diversi:
- la copertura della marina 3% → 0%;
- i tetti del borgo attraversati da un giro 15% → 14%;
- le prove delle case girate 9 → 10 e 7 → 9 prove non passate;
- la firma del lotto, la stessa sostanza.

I tetti del borgo passano da **329 a 307 (−22**, non i 4-6 stimati dal masterplan: sono le 19 case tolte e i pezzi delle accorciate,
molte di una o due caselle). Quelli raggiungibili dalla rete dei giri scendono dall'80 al **74%** (la soglia è il 70%); gli irraggiungibili
salgono da 42 a 61. La F4 (le tre scale ai tetti degli slarghi, i due giri nuovi) è fatta per rimetterli in rete.

---

## 7. Gli strumenti

- **Nel repository**: `src/urbanistica2.js`, gli agganci in `index.src.html` e `tasselli.js`, `TASS_FUORI` in `build.py`.
- **Fuori dal commit**, come per `URBANISTICA.md`: gli script usa e getta delle misure (il raster e le misure della sez. 1 sono quelli del
  masterplan, rifatti sul mondo con `?urbanistica2`), la sonda di cattura per le foto e il giro della camera, la mappa illustrata.
- **Per rifare le misure su una fase**: il metodo è nella sez. 1 di `MASTERPLAN.md`. `W.urbanistica2` dà le case tolte, le vie e gli
  slarghi.
