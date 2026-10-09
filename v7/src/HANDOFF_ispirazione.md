# Porto Vecchio — Idee prese da Skate 3, Rustler e American Fugitive (9 ottobre)

Ho guardato come sono costruiti tre giochi per prendere **idee e soluzioni**, non codice: qui non è stato copiato niente, e il materiale decompilato resta fuori dal repository (in `Downloads/`).

| Gioco | Cosa si è potuto leggere | Utile per |
| --- | --- | --- |
| **Skate 3** (Xbox 360, EA Black Box 2010) | Solo la struttura del disco: l'eseguibile è cifrato. Il mondo è diviso in quartieri (`worldDIST_*.big`) e i **locator** di ogni quartiere stanno in file separati dalla geometria (`global_locators/<quartiere>/*.rx2`). | skate, mondo a quartieri |
| **Rustler** (Unity + Mono, Jutsu Games 2022) | Il codice C# per intero: spawn, ricercato, macchina a stati, missioni, incontri. | struttura del gioco, polizia, missioni |
| **American Fugitive** (Unity IL2CPP, Fallen Tree 2019) | Nomi di classi e campi (non il corpo dei metodi). | percezione graduale degli NPC, zone di ricerca |

---

## 1. Lo skate

Si può fare con quello che c'è già. Lo skate è un mezzo (`VK`), con una sua funzione di moto accanto a `vehicleMotion` e uno stato a terra o in aria. Per l'aria si usa il meccanismo di `launch` (`airT`, `airH`).

**Cosa prendere da Skate** (le idee, non i dati):
- **I trick col gesto, non coi tasti.** In Skate la levetta destra "disegna" il trick: giù e poi su fa l'ollie, giù e poi su in diagonale fa il kickflip o l'heelflip, il mezzo giro fa lo shove-it. Da noi diventa un **gesto del mouse col tasto premuto**: si legge la traccia degli ultimi 250 ms e si classifica (verticale = ollie, verticale con coda a sinistra o a destra = flip, arco = shove-it). È il cuore del feeling di Skate e da noi costa poco.
- **Spinta a colpi.** Ogni pressione di W è una spinta (+2,5 m/s, con un ritmo massimo). Non c'è un acceleratore continuo: si va per inerzia e si frena col piede (S) o con un powerslide (spazio, che è già il nostro freno a mano).
- **Grind e slide che si agganciano da soli.** Se durante un salto lo skate passa entro 35 cm da un **bordo** e la direzione è quasi parallela, si aggancia e scorre lungo il bordo perdendo velocità. Se si arriva di traverso è uno slide. Il bordo è un segmento con una quota.
- **La caduta è parte del gioco.** Si cade atterrando storti (angolo fra skate e direzione oltre 35°) o sbattendo. Si riusa `launch`/`knockback` col ragdoll a capriole che c'è già, e alla caduta i passanti ridono o applaudono.
- **I punti come "linee"**: la combinazione vale finché non si tocca terra coi piedi. Gli NPC vicini se ne accorgono e se lo ricordano (con `emit` e un evento nuovo `numero`), e questo **si aggancia al sistema di voci**: «quello del Lungomare che salta le panchine».

**Dove si skata (si integra col mondo)**:
- I bordi esistono già come dati: cordoli dei marciapiedi, panchine e fioriere (registrate in `regProp`), balaustre dei muraglioni, gradini e scalinate (`MAP.ramps`). Basta una funzione `Skate.edges()` che li raccoglie in segmenti `{x0,y0,x1,y1,h,tipo}`, costruiti una volta sola e divisi in celle di 8 m.
- Da noi è **inverno**: la neve bagnata rallenta e la fanghiglia fa scivolare. Nasce così un motivo per avere **spot coperti**: il porticato, il Palazzo della Cultura, il piazzale dell'hangar, una **piscina vuota** di una villa del Ponente (lo spot classico anni '80).
- 1986: skate a tavola piatta e larga, ruote morbide, poco "street" tecnico. I trick giusti sono ollie, boneless, slappy sul cordolo, flip semplici e carving nella piscina. Va bene limitare il catalogo.
- Ci sono gli NPC skater: due o tre ragazzi che si trovano a uno spot (un oggetto intelligente `OGG` nuovo: `spot_skate`, interesse `sport`). Se li batti in una gara di trick, ti insegnano un trick o ti regalano una tavola. Per quell'interesse non serve scrivere comportamenti nuovi.

**File**: `skate.js` nuovo (fisica, gesti, bordi, punti), una voce in `VK`, aggancio in `driveVehicle`, modello e animazione in `render.js` con uno script come gli altri, HUD dei punti in `main.js`. Prova: `test_skate.js` (ollie su una panchina, grind sul cordolo, caduta).

---

## 2. Costruzione del mondo

Oggi il mondo nasce dal codice (`world.js`), e lo Studio ci mette sopra i ritocchi (`ritocchi.json`). Funziona, ma tutto ciò che **sta in un posto** (dove nasce la gente, dove si parcheggia, dove si lavora, gli spot) è sparso fra codice e dati.

**Da Skate 3: i locator separati dalla geometria.** Ogni quartiere ha un file di **punti con un significato**: spawn, posti auto, postazioni di lavoro, spot, punti panoramici, inizio delle missioni, ognuno con un id stabile. Da noi:
- `locator.json` per quartiere (borgo, centro, periferie, monte…), con punti `{id, tipo, x, y, ang, dati}`;
- lo **Studio** li mostra e li sposta (un'icona per tipo), come fa già coi mobili;
- `world.js` continua a generare i locator di base, che i ritocchi poi spostano. La regola è quella che il progetto usa già: il codice genera, i dati correggono.

**Da Rustler: punti di nascita con raffreddamento.** Ogni `Spawner` ha un tipo (cittadino, polizia, parcheggio, animale), una probabilità e un **tempo di riposo** dopo l'uso (10 s se ha fatto nascere qualcosa, 3 s se ci ha provato). Si usa **solo se è fuori dall'inquadratura ma vicino**: oltre la distanza di nascita, dentro quella di sparizione. Entrambe le distanze crescono quando sei a cavallo, perché vai più veloce. Il numero di poliziotti in giro lo decide il **livello di ricercato** (`TotalPolice` per stella).
- Da noi gli abitanti **esistono sempre**: è la forza del gioco, e non va cambiata. Lo schema di Rustler serve per **comparse, traffico, rinforzi e animali**, cioè per tutto ciò che non ha memoria. Oggi i rinforzi nascono a 45-90 m: con la regola "fuori dall'inquadratura" e "punto di nascita a riposo" non spunterebbero più nello stesso punto due volte di fila.

**Simulazione a distanza (idea mia, serve con 290 abitanti su 680 m)**: vicino al giocatore si simula tutto, lontano un passo ogni secondo con movimenti "a salti" lungo il percorso. È coerente con quello che fa Rustler (lontano non c'è niente) senza perdere la memoria.

---

## 3. NPC: percezione graduale (da American Fugitive)

Oggi `canSee` è sì o no: se ti vede, se ne ricorda subito con fiducia 0,95. American Fugitive usa invece un **contatore di attenzione** per ogni NPC (`AIAwareness`), con tre stati: *ignaro → incuriosito → allarmato*. Il contatore sale con velocità diverse per stato e scende piano. In sintesi:
- la velocità di salita dipende da **distanza**, **angolo** rispetto allo sguardo e da quanto il giocatore **dà nell'occhio** (`overtness`: correre, arma in mano, vestiti sporchi di sangue, dentro una casa non sua, di notte con un passamontagna);
- sopra la testa c'è un **indicatore** che si riempie (`AIAwarenessIndicator`): il giocatore *vede* che sta per essere notato e può smettere;
- da incuriosito l'NPC **va a guardare** (`AIState_LocalSearch`), da allarmato reagisce;
- la polizia dopo la fuga cerca in una **zona** (`SearchZonePanel`, `Objective_EvadePolice`) che si stringe e si sposta con le segnalazioni.

**Da noi**: `n.aware` (0-1) aggiornato in `perceive` e in un passo leggero ogni 0,25 s solo per chi è entro `visionRange`. `addMemory` scatta solo sopra 1, e la **fiducia del ricordo** viene dal contatore (visto bene = 0,95, intravisto = 0,6), così le voci partono già incerte. Il passamontagna, il cambio d'abito e l'ombra diventano strumenti veri. L'indicatore lo disegna `render.js` (un arco sopra la testa) e si vede solo quando sale.

**Da Rustler: il tempo di reazione.** Nelle transizioni della macchina a stati ogni condizione ha un **ritardo casuale** (es. 0,2-1 s prima di accorgersi che gli punti una pistola). Da noi `panicAround` lo fa già in parte (`[passo]`): conviene estenderlo a tutte le reazioni con lo stesso schema (`reactIn: [min, max]` per tipo di evento, scalato dal carattere `n.tr`).

---

## 4. Struttura del gioco

**Da Rustler: missioni fatte di mattoni.** Le missioni sono **fasi**. Ogni fase ha **azioni** (dialogo, vai a, dai un'arma, cambia ora, blocca lo spawn, imposta il ricercato) e **condizioni** (sei nel posto, sei sul mezzo, hai ucciso X con Y, hai spaventato N persone, distanza fra due cose). Sono circa 120 mattoni piccoli, e una missione è solo dati che li combinano (`QuestBuilder`).
- Da noi ci sono già `trame.js`, `commissioni.js` e `imprese.js`. Il passo successivo è **un solo motore di fasi** con un catalogo di azioni e condizioni, così trame, commissioni, imprese e sfide di skate (fai un grind lungo 10 m sul molo) si scrivono tutte allo stesso modo, anche dal modello linguistico (`CFG.mind`), perché il motore controlla solo i mattoni.
- **Incontri** (`EncounterManager` + `EncounterLocationTrigger`): piccole scene che partono quando passi in un punto (una lite, un borseggio, qualcuno che chiede aiuto). Da noi possono nascere **dai fatti veri** degli NPC (debiti, rabbie, progetti), e il punto d'innesco è un locator (vedi §2).

**Da Rustler: il ricercato.**
- Le stelle salgono a **contatori di uccisioni per livello** (`1,1,3,5,10` guardie oppure `3,3,9,12,20` persone), e una guardia che vede un crimine entro **12 m** fa partire subito la prima stella.
- Le stelle scendono **solo se nessuna guardia è entro 12 m** per un certo tempo.
- Mentre sei ricercato **salvataggio e viaggio rapido sono spenti**.
- Da noi c'è già la fazione dei Grigi con la memoria: ne prendiamo le soglie chiare e la regola del "nessuno vicino".

---

## Ordine proposto

1. **Skate** (§1): **fatto il 9 ottobre**, vedi `HANDOFF_skate.md` (sei posti sulla mappa, fisica, trick col gesto, grind, quarter e piscina, la linea, gli NPC che guardano e lo raccontano).
2. **Percezione graduale** (§3): poco codice in `game.js`/`popolo.js`, cambia subito come si gioca e rende più veri ricordi e voci.
3. **Locator e punti di nascita** (§2), insieme allo Studio.
4. **Motore delle fasi** (§4), che unifica trame, commissioni e imprese.
