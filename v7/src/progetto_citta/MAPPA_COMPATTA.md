# Porto Vecchio — la mappa compatta (fase 1: il progetto)

Il level designer, 21 ottobre. Risponde al verdetto del committente: «incasinato e dispersivo… meno spazio, strutturato meglio, come se
fossero tutti percorsi di missioni… teniamo un po' di tutto, ma via i palazzoni», e all'aggiunta: «i posti fighi e le attività restano tutte».
Questa è solo la fase 1, cioè il progetto. Il generatore non si tocca. Coordinate in **metri finali** (x verso est, y verso sud). Il
generatore lavora spostato di OX=320, OY=200: una x finale di 1250 è 930 nel generatore.

Le immagini (`node strumenti/mappa_compatta.js` le rifà dai dati scritti nello script):
- `_immagini/mappa_compatta/progetto_v2.png`: la mappa come la riceverebbe il giocatore, con le correzioni del committente (sez. 11:
  incroci veri e la Rocca a mare); `progetto.png` è la prima versione, tenuta per confronto;
- `_immagini/mappa_compatta/confronto_v2.png`: la stessa cornice sopra la pianta di oggi, con sotto la città intera di oggi.

---

## 0. L'idea in sei righe

1. **La città finisce alla stazione.** Si taglia tutto quello che sta a ovest di x 1250: viale, alberghi, griglia del boom, lungomare.
   La città costruita va da 1250 a 1606 e da 262 a 446, cioè **356 × 184 m** (oggi 620 × 300).
2. **Niente sopra i tre piani.** Fanno eccezione sei case-torre di quattro piani e i landmark. Sei landmark, ognuno visto da tre o quattro quartieri.
3. **Quattro livelli di strada e nessun anello:** un asse (la Vittoria, 10 m), tre vie (il Corso, la Rua, la Marina), i vicoli, le piazzette.
4. **Dodici luoghi-missione** fanno da scheletro. Ognuno ha un'icona sulla mappa e una firma che si vede dalla strada. Tutto il resto
   (botteghe, sotterranei, scene, attività) **si fonde in uno di loro o gli sta accanto**: l'inventario della sez. 8 non lascia fuori niente.
5. **Fra i luoghi ci sono tre modi di andare:** la via principale, la scorciatoia e il segreto (tetti, sotto terra, acqua). Il primo giro porta
   a otto rivelazioni studiate.
6. **Più del doppio di gente per m²:** si va da circa 2 a circa 4,8 abitanti ogni 1000 m², e ogni scena ha un posto e un'ora.

---

## 1. Le misure: cosa si taglia, cosa si comprime

La terra qui è stretta: la costa nord sta a y 266-270 (a ovest) e a 252-256 (nel borgo), la costa sud a 392 (a ovest) e a 416 (nel borgo).
Con la darsena, i moli e la calata la città occupa 184 m da nord a sud: il valore richiesto si raggiunge senza riempire il mare.

| Quartiere (epoca) | Oggi | Progetto | Come |
|---|---|---|---|
| **Boom ovest, alberghi, lungomare** (E6) | x 1040-1190, viale 12 m, lungomare 8 m, alberghi 4-5 piani | **tagliato**. Resta un angolo di 42 × 38 m (x 1250-1292, y 362-400) | una sola stecca di 3 piani su pilotis, ruotata di 12° (34 × 8 m), l'autosalone e il distributore. Gli alberghi e i condomini si spostano (sez. 8) |
| **Viale della Tutela** (E6) | x 1190, 12 m, alberato, palazzine di 4-5 piani | **tagliato** | la sua funzione (il regime che mostra le auto) passa all'autosalone e alla Vittoria |
| **Ottocento** (E3) | x 1190-1318, 128 m, griglia murattiana, strade da 7-8 m, 3-4 piani | **x 1250-1318, 68 m**, y 286-362 | un solo anello di cortina attorno al Mercato. Due isolati a corte (20 × 18 m) fra il piazzale della stazione e il Mercato, tagliati dalla Galleria del Mercato (3 m, coperta). Via Nazionale e Via Cavour scompaiono come vie: Cavour diventa un vicolo di 3 m col sottopasso |
| **Stazione e scalo merci** (E3) | fabbricato a x 1194, Via della Stazione lunga 200 m da 1100 | **x 1254-1290, y 287-295**, piazzale 1252-1294 × 296-306 | la stazione diventa la porta ovest della città: il treno arriva, la Costiera Nord finisce sul piazzale |
| **Baracche** (E7) | 84 scatole sparse fra 1100 e 1300 | **x 1222-1342, y 258-282**, 120 × 20 m, fra binari e mare | due file in aderenza, passaggi da 1 casella, il lotto del fuoco (r 5 m) a 1286,271, la grata del vapore |
| **Borgo** (E0) | x 1318-1463 | **uguale** (x 1314-1466, y 262-375) | è già della misura giusta. Si abbassa (sez. 2) e si sfoltisce: da 31 vicoli a 22, ognuno scorciatoia o nascondiglio misurato |
| **Marina** (E2) | x 1318-1480 | **uguale** (y 375-426 con la calata e lo scalo) | lo scalo d'alaggio (1292-1316 × 393-410) diventa il capo ovest. La gru sulla darsena |
| **Vittoria e piazza d'adunata** (E4) | asse di 12 m da 1310 a 1481, portici di 5 piani, piazza 30 × 33 m | **asse di 10 m da 1290 a 1508**, portici 3 piani, piazza 25 × 30 m (1313-1338 × 328-358) | l'asse parte dal Mercato (assorbe Via Nazionale) e arriva al ponte della Rocca |
| **Spianata** (E1) | 1463-1518, Raccordo del Muro asfaltato largo 8 m | **1466-1508**, 42 m, terra battuta e lastricato | il raccordo diventa la pista di pattuglia in terra (palco.js la disegna già) |
| **Rocca** (E1) | 1505-1610, Viale della Tutela da 10 m dentro, fronte bastionato simmetrico | **castello a mare** su uno scoglio (1525-1610 × 289-400), staccato dalla spianata dal canale (1508-1526) | sez. 11: masse a gradoni, mastio col faro, torrione tondo, darsena allagata col ponte ad arco; la piazza d'armi lastricata (1534-1580 × 314-348); nella Rocca non c'è più asfalto |
| **Giardini di Ponente** | x 1197, dentro il boom | **x 1222-1250**, una fascia di 28 m sul bordo ovest | il verde progettato che chiude la città: la vasca vuota dello skate, gli orti sulla scarpata, la Città dei Topi sotto |

Fuori dalla cornice l'isola resta com'è: la Collina dei Pini, il Monte, San Giacomo, il bosco, il Tavolato, le isole. Diventa
**l'entroterra della città** e non fa più parte della città. La Costiera Nord finisce al passaggio a livello (1250, 285), la Costiera Sud all'angolo del boom (1250, 394).

**Conti.** Le case passano da 592 a circa 420 (borgo ~230, marina ~55, Ottocento ~60, Vittoria ~16, boom 3, baracche ~55).
L'area costruita passa da circa 72.000 a circa 45.500 m².

---

## 2. Le altezze: basse, e alti solo i segni

Con la camera (fov 14°, pitch 0,72) un volume alto H nasconde da 0,8 a 1,15·H metri di suolo dietro di sé, verso nord-ovest.
Ne vengono due regole.

**Regola del lato camera.** Su una via il fronte sul lato della camera (il lato sud delle vie est-ovest, il lato est di quelle nord-sud)
ha **al massimo 2 piani (6 m, nasconde 4,8-6,9 m)**. Il lato lontano può avere 3 piani. Così una via di 5-7 m resta leggibile senza varco.
Nei vicoli vale il varco, come oggi.

| Epoca | Piani | Note |
|---|---|---|
| E0 borgo | 2, 3 sul lato nord della Rua e contro le mura | **6 case-torre di 4 piani**, una per ognuno di questi incroci: Porta di Terra (1328,296), sagrato (1398,300), Pozzo (1436,318), Forno (1348,366), testa del Vico Lungo (1418,372), mura (1450,272) |
| E2 marina | 3 sul lato nord della Via della Marina, 2 sul lato del mare | colori di Procida |
| E3 Ottocento | 3, 2 sul lato est del Corso | cornicione, angoli smussati con bottega |
| E4 regime | portici con 2 piani sopra (in tutto 3) | la torre littoria è un landmark, non una casa |
| E6 boom | la stecca 3, l'autosalone 1, il distributore a pensilina | **nessuna torre, nessun palazzone** |
| E7 baracche | 1-2 | lamiera |
| E1 Rocca | cortina 12 m, caserme 2 piani | come oggi |

Conto atteso dei piani: 1 piano ~100 · 2 piani ~230 · 3 piani ~85 · 4 piani 6. Oggi 96 · 306 · 154 · 36 (più uno da 5).

**I landmark (gli unici volumi alti).** Ognuno ha il suo colore di notte e si vede da almeno tre quartieri. Le visuali sono disegnate
nel progetto e la prova nuova le misura con `Percorsi.vista` (sez. 9).

| Landmark | Dove | Alto | Di notte | Visto da |
|---|---|---|---|---|
| Campanile a maioliche della Chiesa Madre | 1392, 291 | 30 m | cella campanaria calda | Mercato (dalla Porta di Terra), Pozzo, spianata, Piazza della Marina |
| Torre littoria (Ministero) | 1335, 323 | 34 m | bianco freddo, lo schermo del Garante | piazzale della stazione, tutta la Vittoria, la marina, le baracche |
| Orologio della stazione | 1270, 289 | 14 m | quadrante giallo | Mercato (in fondo alla Galleria), Corso, baracche |
| Torre dell'acqua con l'antenna di Radio Luna | 1310, 272 | 18 m | lampada bianca che lampeggia | Mercato, Porta di Terra, camminamento delle mura |
| Gru del porto sulla darsena | 1372, 414 | 22 m | luce arancio in punta al braccio | Piazza della Marina, Forno, Scalo, sbocco del sottoportico sulla Vittoria |
| Mastio della Rocca col faro (il «torrione col riflettore») | 1594, 327 | 24 m + lanterna | **rosso** | il cannocchiale della Vittoria, il Pozzo, il Molo Vecchio, la spianata |

Due landmark bassi, che si leggono dall'alto e dalla mappa: la **tettoia verde del Mercato** (7 m) e il **pennacchio di vapore** della grata delle baracche.

---

## 3. La gerarchia delle strade

| Livello | Quante | Larghezza | Quali | Suolo | Traffico |
|---|---|---|---|---|---|
| **Asse di parata** | 1 | 10 m + portici | Via della Vittoria, 1290-1508 a y 343, dal Mercato al ponte della Rocca | travertino a giunti, pennoni | auto, blindati, la parata della domenica alle 11 |
| **Vie** | 3 | 5-7 m | **Corso Garibaldi** 7 m (dal piazzale della stazione allo scalo, ad arco, 110 m, un filare); **Rua Maestra** 5 m (dalla Porta di Terra alla spianata, storta, 165 m); **Via della Marina** 5 m (dallo scalo al Molo, 190 m) | porfido (Corso), basoli (Rua, Marina) | sul Corso auto e Ape; su Rua e Marina solo Ape, Vespe e carretti |
| **Vicoli** | ~28 | 2-3 m | il pettine del borgo (22), Via di Mezzo (3 m, scende di grado), Galleria del Mercato, Vico Cavour col sottopasso, Vico delle Carceri, Vico dei Giardini, il Vico Lungo con la scala | basoli, gradini | a piedi, bici, skate |
| **Piazzette** (nodi) | 10 | 8-32 m | Mercato (ottagono, r 16), piazzale della Stazione, piazza d'adunata, sagrato, Pozzo (r 6), Forno (r 5), Piazza della Marina, lotto del fuoco, Scalo, piazza d'armi | per epoca | — |

**Si tolgono:** il Raccordo del Muro (8 m), il Viale della Tutela nella Rocca (10 m, diventa la piazza d'armi), il Viale della Tutela a ovest
(12 m), la Via del Porto (8 m), la Via Nazionale (8 m, la assorbe la Vittoria), la Via della Stazione (7 m, la sostituisce il piazzale), la
Costiera Nord e la Costiera Sud dentro la città. **Nessun anello:** per fare il giro della città si cambia sempre tipo di strada.
Le distanze fra le piazze sono tutte di almeno 40 m. Il Forno si sposta a 1356,370 e la Marina sta a 1398,381.

---

## 4. I dodici luoghi-missione

Ruoli: **hub** (ci torni, ci trovi gente e lavori), **segreto** (si trova, non si vede), **pericolo** (ti controllano o ti sparano),
**premio** (ci guadagni soldi, oggetti, potenziamenti). Sulla mappa ogni luogo ha un disco a spicchi coi colori dei suoi ruoli, l'icona e il numero.

| # | Luogo | Dove | Ruolo | Aggancio (dal MANIFESTO e dalla BIBBIA) | Firma da lontano | Dalla mappa · dalla strada |
|---|---|---|---|---|---|---|
| 1 | **Bar Da Gino**, Piazzetta del Pozzo | 1428,324 | hub | Gino tiene la TV sul Garante. Il capo della Famiglia sta al tavolino del dehors, il pizzo passa da qui (Pax Mafiosa) | gli ombrelloni rossi sulla piazzetta e il campanile alle spalle | tazza dorata al gomito della Rua · si sente prima di vederlo, poi la Rua gira e la piazzetta si apre (V5) |
| 2 | **Forno di Lella**, Piazzetta del Forno | 1356,370 | hub, premio | il calore della controcultura: la canna fumaria del forno scalda la cantina, che è una presa termica. Ci passano le voci del quartiere alle 6 | il fumo del comignolo, di notte la luce arancio della bocca del forno | pane dorato e verde sulla Via di Mezzo · la coda del pane alle 6-8 |
| 3 | **San Rocco e la cripta**, sagrato | 1381,300 | segreto | Suor Agata nasconde i ricercati nella cripta. Da lì si scende nelle catacombe e nel cunicolo verso il rifugio | il campanile a maioliche, 30 m | croce viola · dalla Porta di Terra il campanile in fondo alla Rua (V3) |
| 4 | **Pescheria e calata**, Piazza della Marina | 1398,381 | hub, premio | i pescherecci all'alba. Tonino scarica e il deposito dei contrabbandieri sta sotto il Magazzino Neri (la grata sulla calata) | la gru, la lanterna del Molo Vecchio | pesce sull'acqua · il Vico Lungo scende a scalini sul mare (V6) |
| 5 | **Officina dello Scalo** | 1304,401 | premio | Dorino «Candela» ripara le campagnole dei Grigi e le sabota. La ciclo-officina dei ragazzi monta copertoni chiodati e batterie rigenerate; le rampe di legno del Capannone stanno qui | il portone a volta col pezzo wildstyle, lo scivolo in acqua | ingranaggio verde al capo ovest della marina · il rumore della mola |
| 6 | **Covo nel bunker delle mura** | 1438,280 | segreto | la Risacca e i ragazzi coltivano la serra idroponica nel bunker della guerra, sotto la vecchia vedetta: «sotto terra nessuno ti vede» | solo dal mare e dalle mura: una lanterna verde fra i merli | foglia viola · si arriva dal camminamento o dal Vico dell'Arco, non dalla strada |
| 7 | **Radio Luna** (ex Discoteca Luna) | 1307,274 | segreto, premio | Vinile trasmette dal magazzino del tronchino merci. L'antenna sta sulla torre dell'acqua della ferrovia | la torre dell'acqua con l'antenna e la lampada bianca, 18 m | antenna fra le baracche · la musica che esce dal capannone |
| 8 | **Mercato ottagonale** | 1274,343 | hub, pericolo | il mercato tutte le mattine, i banchi a carretto, il comizio. La celere fa le retate, lo scippo | la tettoia verde in ghisa | ottagono · dalla Galleria la tettoia si apre (V2) |
| 9 | **Stazione e scalo merci** | 1270,301 | pericolo, premio | i convogli della miniera e i vagoni merci di lusso (livello 2 dell'Ordine). La Famiglia ha talpe fra i casellanti | l'orologio, 14 m | orologio · è la prima cosa che si vede arrivando (V1) |
| 10 | **Baracche e grata del vapore** | 1284,270 | hub, segreto | il cypher attorno alla grata che sfiata il vapore della centrale. I fuochi nei bidoni, l'autobus sepolto sotto la discarica | il pennacchio di vapore, i fuochi di notte | fiamma · si scende dal sottopasso Cavour |
| 11 | **Posto di blocco della Vittoria** | 1478,343 | pericolo | il Muro, la garitta, i riflettori, il Garante. È la porta della Linea Rossa | il riflettore e i pali in fila | sbarra rossa · in fondo alla Vittoria, sempre in vista (V7) |
| 12 | **La Rocca** | 1556,343 | pericolo | l'ultimo atto: prigionieri, il carico dell'Impero, il cunicolo di fuga e la cisterna | il torrione col riflettore rosso | torre rossa · il cannocchiale della Vittoria |

**Luoghi minori** (senza numero, li tiene vicini un luogo-missione): il **Banco** sul Corso col portavalori (accanto al 9), l'**Autosalone del
Gelo** con le auto da far saltare (premio e pericolo, accanto al 5), la **Caserma della Guardia** con le vecchie carceri sul lato sud
dell'adunata, il **rifugio antiaereo** sotto l'adunata (lo raggiunge il segreto del 3 e del 6), la **Sala giochi Flipper** con lo spaccio sotto,
sulla Via di Mezzo (fra il 2 e il 4).

**Lettura.** Dalla mappa: icone e colori dicono cosa è e quanto è pericoloso; i landmark dicono dove sono. Dalla strada: ogni luogo ha una firma alta
(il landmark del suo quartiere) e una firma bassa (insegna, luce, suono, fumo) che si accende entro 30 m.

---

## 5. Le vie fra i luoghi e le rivelazioni

Usano i concetti di `W.percorsi` (`percorsi.js`): i **dominanti** sono la Rua, la Vittoria e il Corso; i **secondari** si calcolano per tappe; le
**scorciatoie** devono essere almeno il 30% più corte della strada, altrimenti sono nascondigli; poi i **circuiti** sui tetti e le **porte**,
ognuna con la sua alternativa. Le lunghezze qui sotto sono misurate sulle linee del progetto.

| Da → a | Principale | Scorciatoia | Segreto |
|---|---|---|---|
| Mercato (8) → Bar (1) | Porta di Terra e Rua, storta, 155 m: la città vera | la Vittoria, dritta, 147 m: più corta ma **sorvegliata** (posto di blocco, pattuglie) | i tetti, 106 m: dalla casa-torre della Porta al giro del campanile, poi giù dalla scala minio sul Pozzo |
| Bar (1) → Forno (2) | Rua, Vico dei Bottai, sottoportico, Via di Mezzo, 120 m | il Caruggio dei Pescatori sotto il portico | **sotto**: il pozzo è asciutto; col secchio si scende nella cisterna e si esce nella cantina del forno, 83 m |
| Forno (2) → Marina (4) | Via di Mezzo e la scala dei pescatori, 85 m | la scalinata del Forno, 58 m (−32%) | la corte del lavatoio (androne passante) |
| Marina (4) → Officina (5) | Via della Marina, 91 m | **dentro i magazzini a volta**, che sono in fila e comunicano, 81 m (al coperto, dalle guardie) | **in gozzo** dalla darsena allo scivolo, 62 m |
| Officina (5) → Stazione (9) | il Corso, 109 m | Vico delle Carceri, Mercato, Galleria, 99 m: al coperto | la fogna sotto il Corso, dalle vecchie carceri al tombino del piazzale |
| Stazione (9) → Baracche (10) | il passaggio a livello, 52 m | il sottopasso Cavour, 27 m | sopra il rilevato, sui tetti dei carri merci |
| Baracche (10) → Covo (6) | gli scogli sotto le mura, con la bassa marea | — | **il camminamento delle mura** di tramontana, 137 m: dalla scala di ronda alla vedetta |
| Chiesa (3) → Covo (6) | Rua e Vico dell'Arco | — | **sotto**: cripta, catacombe, rifugio sotto l'adunata, cunicolo fino al bunker, 201 m |
| Bar (1) → spianata (11) | la fine della Rua, 41 m | — | i tetti delle case mozzate sul bordo, 35 m: si guarda il posto di blocco dall'alto |
| Spianata → Rocca (12) | ponte e Porta, 69 m, sorvegliato | — | **per mare**: dal Molo Vecchio lungo il canale fino alla porta d'acqua della darsena, 190 m |

Le **porte** restano le cinque di oggi: Porta di Terra, sottoportico dei Bottai, sottopasso Cavour, scala dei pescatori, posto di blocco.
Se ne aggiunge una sesta, il **passaggio a livello**, con l'alternativa del sottopasso. Ognuna ha accanto i tetti o un tombino.

**I circuiti sui tetti:** restano il giro della Porta, del Forno, del campanile e della marina, e il camminamento delle mura. Se ne aggiunge
uno: **il giro del Mercato** sui tetti dell'Ottocento, sulla cortina dell'ottagono. Con le case basse (dislivelli di un piano al massimo) i salti si moltiplicano.

**Le rivelazioni del primo giro** (V1-V8 sulla mappa). È una passeggiata studiata dalla stazione al Molo: a ogni svolta si scopre un landmark.

| | Dove | Cosa si scopre | Come è costruita |
|---|---|---|---|
| V1 | passaggio a livello (1246,288) | l'orologio della stazione, e sopra i tetti la torre littoria | la Costiera Nord arriva bassa fra i muri della scarpata |
| V2 | uscita della Galleria (1272,324) | la tettoia verde del Mercato | la Galleria è coperta e buia per 22 m, poi lo spazio si apre |
| V3 | Porta di Terra (1322,300) | il campanile, inquadrato dall'arco in fondo alla Rua | la Rua è allineata sul campanile per 60 m, poi fa gomito |
| V4 | gomito della Rua (1366,312) | il sagrato, col campanile proprio sopra | il gomito nasconde il sagrato fino all'ultimo |
| V5 | Rua a 1416,313 | il Pozzo col bar e, in fondo alla Rua, la luce della spianata e il torrione | la Rua gira verso sud-est e si apre sulla piazzetta |
| V6 | testa del Vico Lungo (1418,376) | il mare, la gru, la lanterna del Molo | la scala scende fra due case-torre |
| V7 | sbocco del sottoportico (1398,345) | la Vittoria: il cannocchiale sulla Porta della Rocca, il riflettore | si esce dal buio del portico sull'asse vuoto |
| V8 | sulle mura (1446,266) | il mare di tramontana, il vapore delle baracche, il treno | è l'unica vista lunga del borgo, da un livello sopra |

Regola dei 60 m: nel borgo nessuna vista dritta supera i 60 m, tranne V7 (la Vittoria) e V8 (le mura). Queste due sono volute.

---

## 6. La densità di vita

**Oggi.** `Popolo.CFG.max` = 207 abitanti su tutta l'isola, di cui il 70% entro 250 m da casa del giocatore: circa 145 in città, su ~72.000 m²,
cioè **~2 ogni 1000 m²**. `FILL.maxIn` = 42 nei posti entro 64 m.
**Progetto.** ~220 abitanti in città su ~45.500 m², cioè **~4,8 ogni 1000 m² (2,4 volte oggi)**, più ~40 divise (Grigi, Tutela).

Parametri: `CFG.max` 207 → 260 · `nearR` 250 → 190 (copre tutta la città da qualunque casa) · `nearShare` .7 → .85 · `maxNear` 70 → 84
· `FILL.maxIn` 42 → 56 · `FILL.r` 64 → 56. In `Posti.DENS`: `ottocento` .7 → 1, `baracche` .6 → 1,2, `boom` .5 → .8; `vittoria` resta .15 (deve restare vuota).

Gente fuori casa, per quartiere e fascia oraria (civili; tra parentesi le divise):

| Quartiere (m²) | 6-10 | 10-14 | 14-18 | 18-22 | 22-2 | 2-6 | Dove stanno (set e posti) |
|---|---|---|---|---|---|---|---|
| Borgo (13.000) | 30 | 45 | 35 | **55** | 25 | 6 | dehors del Pozzo e della Rua, sagrato, Forno (la coda delle 6-8), angoli dei vicoli, stenditoi sui tetti, retrobotteghe |
| Marina (6.400) | **40** | 25 | 15 | 25 | 12 | 8 | calata (reti 5-11), pescheria, Scalo e Officina, dehors dell'Osteria, banco del pesce, spiaggetta del Lido |
| Ottocento e Mercato (7.100) | 45 | **50** | 35 | 30 | 8 | 3 | banchi del Mercato (12), pensilina e edicola del piazzale, vetrine del Corso, Banco, scuola |
| Baracche (1.450) | 10 | 8 | 10 | 20 | **18** | 6 | fuochi (3), lotti vuoti, facciate in riparazione, il cypher alla grata (20-02) |
| Vittoria e adunata (2.800) | 6 (6) | 8 (6) | 8 (6) | 6 (8) | 2 (8) | 0 (6) | edicola, fermate, posto di blocco. La domenica alle 11 la parata: 40 comparse |
| Spianata e Rocca (14.800) | (20) | (20) | (20) | (20) | (24) | (24) | palco.js: carri, container, garitte, ronde |

**Le scene sui posti** (`eventi.js`): mattina consegne e furgone in doppia fila (retrobotteghe della Rua e del Corso), postino (portoni del
borgo), mercato che monta (Mercato 6-8,5), reti (calata 5-11,5), serrande su (vetrine del Corso e della Rua). Mezzogiorno: serrande giù, pausa
sul gradino (sagrato). Sera: dehors pieni e capo al tavolino (Pozzo), gang all'angolo (sbocchi dei vicoli sulla Vittoria e sul Corso), pizzo
(vetrine della Rua), fuoco fra le baracche, pattuglia di notte (posto di blocco, Porta di Terra). Le scene senza posto (amici, bici, gatto,
graffito…) girano dove c'è gente: con la città più piccola e più piena, ci si passa accanto più spesso.

Tipi di posto nuovi (in `posti.js`): **cypher** (alla grata, 20-02, giovani, cap 8), **fila** (al Forno e alla tessera di Wu, 6-9, cap 6), **carico**
(lo scalo merci e lo Scalo, 5-11), **banco_pesce** (pescheria, 5-12).

---

## 7. Il piano di migrazione (fase 2 e seguenti, in quest'ordine)

Prima di tutto si **uniscono i rami** `percorsi2` (f2c49f3), `spianata2` (d3f99cf) e `chiarezza`: questo worktree non ha ancora `percorsi.js`,
`palco.js` e `chiarezza.js`. Poi si **misura com'è oggi**: `test_percorsi`, `test_posti`, `test_citta_viva`, `strumenti/leggibilita.js`, la pianta
e la galleria, per avere il «prima».

1. **La cornice** (`world_cittanuova.js`). `CITY_W0` 750 → 930 (finale 1250). Si tolgono `raccordo_e`, la strada `porto` dentro la Rocca, che
   diventa caselle `PIAZZA` (la piazza d'armi), `via_governo`, `via_porto`, `via_nazionale`, e `via_alta` oltre il piazzale. Le costiere finiscono a gen 930.
   Si tolgono anche i `WF('via_governo')`, `WF('via_porto')` e `WF('via_alta')`.
2. **Le strade.** `vittoria`: `line(970, 1188, 143)`, `w` 12 → 10. `corso`: `w` 10 → 7, l'arco fra gen 976 e 991 (finale 1296-1311). `via_cavour`
   → vicolo da 3 m a gen 970. `cavour_sotto` a gen 970. `mezzo` 4 → 3. Pettine: si tengono i 22 vicoli che `percorsi.js` misura come scorciatoie
   o come nascondigli con un posto. Nuovi: Galleria del Mercato (coperta, come `arco_sottopasso` lungo), Vico delle Carceri, Vico dei Giardini.
3. **`PIENO` e le altezze.**
   - `PIENO('ottocento')`: `x0` 873 → 930, `ring` 5 → 4, `f` [4,7] → [4,6], `mk` con `fl` 3 (2 sul lato camera).
   - `PIENO('borgo')`: `mk` con `fl` 2 di base e 3 sul lato nord della Rua e contro le mura. Le case-torre non più con `hash < .05`: sono le 6 della sez. 2.
   - `WF('vittoria')`: `fl` [3,3]. `WF('corso')`: `fl` [2,3].
   - Baracche: il ciclo `tx` da `T2i(752)-T2i(1000)` a `T2i(902)-T2i(1022)`.
   - **Tetto finale**: in fondo, `B.forEach(b => { if (b.era && !b.torre && b.fl > 3) b.fl = 3; })`.
4. **I pezzi** (`W.pezzi`, `pezzi_citta.js`).
   - Si spostano: `stazione`, `binari`, `locomotiva`, `carro_merci`, `sottopasso`, `passaggio_livello` (a 1250), la scalinata della stazione,
     di +60…+76 m verso est (sez. 1).
   - Si rifanno 3 piani invece di 5: i 17 `portico`.
   - Pezzi nuovi: `torre_acqua` (con antenna), `gru_porto`, `grata_vapore`, `stecca_boom`, `autosalone`, `distributore`. Gli ultimi tre possono
     essere case con un `use` invece che pezzi.
   - Restano dove sono: torre littoria, tettoia, porta di terra, chiesa, campanile, mura, magazzini, darsena, molo, scalo, bastioni, cortine,
     torrione, caserme, polveriera, pozzo, fontana, lavatoio, archi, edicole, gradoni, bitte, palo dei riflettori, muro del Garante.
   - La fontana del Forno va da 1366,367 a 1356,370.
5. **`W.sets`** e i luoghi.
   - Si aggiungono `{k:'stazione'}`, `{k:'scalo'}`, `{k:'baracche'}` (il fuoco e la grata), `{k:'armi'}`.
   - Si sposta `piazzetta forno` (1356,370, r 5).
   - Si aggiunge **`W.luoghi`**: i 12 luoghi della sez. 4 come dato (`id, nome, x, y, ruoli, icona, firma, landmark, ingressi, segreto`). Lo
     leggono `percorsi.js` (i nodi), `posti.js`, `mappa_luoghi.js` (la mappa del giocatore) e le missioni.
   - Si aggiorna `RELOC` (i luoghi con nome che si spostano, sez. 8).
6. **`percorsi.js`.**
   - `BOX` da 1080 a 1240. `MARE` con x da 1250. `BORGO` resta.
   - Nodi nuovi: stazione, scalo, baracche, radio, covo.
   - Il secondario `stazione` non usa più `via_alta`: va dal Corso al piazzale. Secondari nuovi: `officina` (Marina → Scalo), `baracche`
     (piazzale → passaggio a livello → lotto del fuoco), `mura`.
   - Landmark nuovi: `gru_porto`, `torre_acqua`.
   - `ZONE`: si aggiunge `giro_mercato` (1250-1318 × 286-362).
   - Porte: la sesta, il passaggio a livello.
7. **`palco.js`.** `asse` cerca le caselle `T.VIA` a `F.x+14`: con la piazza d'armi lastricata deve accettare anche `T.PIAZZA`, oppure leggere
   l'asse dal pezzo `porta_monumentale`. `WALL` e `FORT` non cambiano. La pista di pattuglia c'è già.
8. **`chiarezza.js` e `render.js`.** Filari solo sul Corso (un lato) e sui Giardini; niente alberi sulla Vittoria (c'è già); `PASSO` resta 12.
9. **`tetti.js`.** Nessun cambio di regola (`roofRule`). Si rigenera il grafo: più salti. Si controllano i 4+1 circuiti più il nuovo.
10. **`posti.js`, `popolo.js`, `eventi.js`.** `zonaAt` (il boom solo nell'angolo), `DENS`, i tipi nuovi (sez. 6), `CFG` e `FILL` di popolo. Le scene nuove: cypher, fila, parata.
11. **`sottosuolo.js`.** Metropolitana da Mercato (1262,352) a Mura (1455,288). Città dei Topi sotto i Giardini (1236,340). La stanza murata del
    regime sotto la stazione. L'autobus sepolto `near: 'discarica'` con la discarica ora alle baracche (1230,270). Il resto è già sotto la città compatta.
12. **I documenti.** `BIBBIA_MISSIONI.md` sez. 3 (le regioni D, E, G cambiano), `mappa_luoghi`, `strumenti/scorci.json` (gli scorci a ovest di 1250 si spostano).

---

## 8. L'inventario: niente si perde

Fatto dal codice il 21 ottobre: `G.PLACES` (266), gli edifici con `use` e `shopFront` (691), `Posti.all()`, `Sottosuolo.TPL.places`,
`Sottosuolo.RITROVAMENTI`, `Eventi.SCENE` (71), `W.pezzi`, `W.sets`, `Tetti`, `Imprese.KINDS`, `skate.js`. Ogni riga ha una destinazione.
La sigla **L1-L12** è il luogo-missione (sez. 4). «Resta» vuol dire che la posizione non cambia.

### 8.1 I posti con nome della città (`G.PLACES` e gli edifici con nome)

| Luogo o attività | Oggi | Nella mappa compatta |
|---|---|---|
| Bar Da Gino (`bar`), Fontana di San Rocco (`fontana`), Piazzale della Cultura (skate) | 1405,331 · 1431,323 | **L1**, Pozzo 1428,324 (la fontana è il pozzo) |
| Panetteria Lella, Panetteria Mario | 1397,309 · 1385,311 | **L2** Forno di Lella (le due panetterie diventano il forno e la sua rivendita sulla Rua) |
| Trattoria da Nina (`car_2`), Osteria da Melis, Latteria Pina, Vico del Campo (`piazzetta`) | 1447,383 · 1359,371 · 1345,371 · 1369,365 | piazzetta del Forno, **L2** |
| Chiesa di San Rocco, Piazza San Rocco (`piazza`), skate «Piazza San Rocco» | 1387,299 · 1383,303 | **L3**, sagrato. Resta |
| Pescheria Bruno, Pescheria Mario, Calata, Marina del porto vecchio, Molo dei pescatori, Pontile Est, Lanterna del Molo Vecchio, Molo di Levante | 1411-1423,375 · 1351,391 · 1333,397 · 1325-1391,415-441 | **L4**. Restano |
| Osteria del Porto, Birreria del Porto, Gelateria Polo Nord, Cinema Astor, Abiti e Confezioni, Sartoria Rosaria, Calzolaio Efisio, Palestra Pina | 1427-1459,381-407 · 1407,365 · 1375,383 | Via della Marina, attorno a **L4**. Restano |
| Magazzino Neri (Sandro, la Famiglia) | 1323,373 | il primo dei magazzini a volta, fra **L4** e **L5**. Resta |
| Santuario del Mare, Via al Mare (`lungomare`), Passeggiata a mare, skate «muretto della Via al Mare» | 1453,401 · 1421,399 | capo est della Via della Marina, sotto la spianata. Restano |
| Banja del Lido (`chiosco`), Spiaggia del Lido (`bagno_9`, `bagno_10`), Spiaggia gelata, `pesca_pontile_lido` | 1433-1459,369-427 | la spiaggetta sotto la spianata (1440-1480 × 405-416). Restano |
| Officina di Dorino (`officina`) | 1151,389 | **L5** Scalo, 1304,401 (si sposta) |
| Cantiere navale (`cantiere`), Scalo del cantiere (`scalo`), `pesca_pontile_ovest` | 1175,395 · 1287,391 | **L5**: il cantiere si fonde con lo scalo d'alaggio |
| Capannone del porto cargo (skate, rampe al coperto) | dentro la Base | **L5**, il magazzino a volta dell'Officina |
| Autorimessa Centrale, Distributore (`benzina`) | 1251,311 · 1281,295 | angolo del boom (1254-1290 × 362-400), accanto a **L5** |
| Covo sulla Collina Nera (`covo`), Vecchia vedetta (`osservatorio`), Belvedere | 1443,297 · 1433,273 · 1389,277 | **L6**, bunker sotto le mura (1438,280); il belvedere è sul camminamento |
| Discoteca Luna (`disco`) | 1183,279 | **L7** Radio Luna, magazzino del tronchino (1298-1316 × 268-280) |
| Videoteca Stella (Betamax) | 1405,301 | resta sulla Rua (fra L3 e L1) |
| Banco dei fiori (`fiori`), Mercato | 1271,343 | **L8**. Resta |
| Scuola elementare, Ufficio Bruno, Condominio Aurora, Emporio Imperiale | 1255,341 · 1263,333 · 1277,329 · 1249,328 | cortina dell'ottagono, **L8** |
| Biblioteca civica (Lupo), Archivio di Stato, Teatro Odeon, Condominio Stella | 1205,317 · 1233,327 · 1159,387 · 1197,365 | si spostano negli isolati a corte fra il piazzale e il Mercato (1250-1296 × 307-326); l'Archivio va nel Ministero |
| Le 18 botteghe della griglia ovest (Calzature Russo e Greco, Profumeria Nello, Mario e Gavino, Cartoleria Mura, Rosaria, Fontana ed Efisio, Drogheria Rizzo, Lombardi e Piras, Orologeria Rosaria, Gavino e Greco, Caffè Nello…) | x 1128-1249 | piano terra della cortina del Mercato e del Corso (16 fronti sull'ottagono, 12 sul Corso) |
| Botteghe dell'Ottocento a est (Tipografia Totò, Tabacchi Rosaria, Merceria Nello, Piras e Greco, Caffè Sanna, Profumeria Totò e Tina, Calzature Lella, Orologeria Totò, Caffè Conti) | 1243-1313,317-391 | Corso e Vico delle Carceri. Restano o si accostano di 10-20 m |
| Stazione, scalo merci (oggi solo pezzi) | 1194,297 | **L9**, 1254-1290 × 287-306 |
| Hotel Miramare (il colonnello Vasco) | 1227,381 | piazzale della stazione, lato sud (**L9**) |
| Hotel Flamingo (la Commissaria Pardo) | 1145,407 | sul Corso, davanti al Mercato |
| Hotel Paradiso, Hotel Oceano, Pensione Gabbiano (Vinile), Condominio Mare (Elena, Nico, Cono, Betamax) | 1115-1175,385-411 | **Hotel Oceano e Condominio Mare nella stecca del boom** (2 scale); Paradiso e Gabbiano sulla Via della Marina est, verso il Lido |
| Scogliera del Lungomare (`scogli_8`), Discarica di levante | 1281,271 · 1091,265 | **L10**: gli scogli stanno già lì; la discarica si sposta in testa alle baracche (1230,270) |
| Il Muro, Varco del Muro, Uffici del Garante, La Pietra dell'Onda | 1481-1495,339 · 1443,295 · 1445,331 | **L11**: gli uffici e la Pietra stanno sul bordo della spianata, fra le case mozzate |
| Palazzo del Governo, Ministero dell'Ordine, Piazza del Governo (`piazza_gov`), skate «gradoni e corrimano» | 1321,331 · 1299,299 · 1329,343 | la piazza d'adunata: il Ministero alla base della torre littoria, il Governo sul lato ovest. Restano |
| Caserma della Guardia (`commissariato`, carceri sotto) | 1269,359 | lato sud dell'adunata (1316-1338 × 360-368) |
| Ambulatorio (Garza) | 1331,321 | resta, dietro la torre littoria, sulla Rua |
| Rocca della Tutela, Caserma della Tutela, Hangar, Deposito della Base, porto cargo (magazzino, dogana, `molo_cargo`), Eliporto, Poligono, i 4 posti di pesca dei moli cargo | 1513-1597 | **L12**. Restano (palco.js dispone carri, container ed eliporto) |
| Alimentari Wu (la tessera annonaria) | 1367,331 | resta sulla Rua; la fila (posto nuovo) davanti |
| Le botteghe del borgo (Frutta e verdura ×5, Latterie ×4, Osterie ×4, Bar Russo, Bar Pinna, Drogherie, Ferramenta ×2, Armeria del Cacciatore, Merceria Mura e Totò, Tabacchi Efisio, Totò e Rizzo, Farmacia Tina, Barbieri ×2, Palestra Nello, Uffici Tina e Mario, Calzolaio Totò, Attrezzi Efisio, Barbiere Gavino, Mode Costa, Russo e Lella, Gioielleria Lella, Circolo dei Lavoratori, Lavanderia Pina, Libreria Pina) | Rua, Via di Mezzo, Vittoria (1319-1463) | restano: sono già nel borgo compatto. I fronti della Vittoria passano sotto i portici di 3 piani |
| Sala giochi Flipper (lo spaccio sotto) | 1387,355 | resta, sulla Via di Mezzo fra L2 e L4 |
| Bar Sirena (la Zia degli Orecchi) | 1291,379 | resta, sul Corso basso, all'angolo del boom |
| Collina Nera: salita, monte, vetta, bivacco, spiazzo, ruderi, cava, grotta (oggi solo nomi sopra il borgo) | 1407-1471 | i nomi passano alle cose vere sotto: grotta → la grotta delle stalattiti; cava → la miniera della cava sotto la spianata; ruderi → i vuoti delle bombe nel borgo; bivacco e spiazzo → il lotto del fuoco (L10) |
| Giardini di Ponente, la vasca vuota dello skate, Pineta, Monolite, Carbonaia, Paese Vecchio, Collina dei Pini, Bivacco, Sorgente, Casale | 1115-1197 | **Giardini**: fascia ovest della cornice (1222-1250), con la vasca. Il resto è entroterra fuori dalla città: resta |
| Tutto il resto dell'isola e le altre isole (`chiesa_sg`, `osteria_sg`, masseria, cantina, miniera, stazioni di estrazione, faro, saline, Tavolato, beduini, campo partigiano, borghi dei pescatori, Monte Scuro, Gola del Lupo, Eremo, scogli 1-7 e 9-10, bagni 0-8, pontili dei pescatori, isola delle Palme, isola Grande del Sud, villaggio della tribù, Conservificio e Mattonificio) | x < 1100 o fuori dall'isola | **restano dove sono**: è l'entroterra e il mare, il viaggio |

### 8.2 Le botteghe per uso (in città oggi)

Botteghe di oggi in città, per uso: bar 5 · trattoria 5 · fruttivendolo 6 · profumeria 5 · orologiaio 5 · merceria 5 · latteria 5 · drogheria 5
· cartoleria 5 · calzolaio 5 · tabacchi 4 · abbigliamento 4 · ufficio 3 · ferramenta 3 · pescheria 2 · panetteria 2 · palestra 2 · lavanderia 2
· barbiere 2 · uno a testa: tipografia, teatro, scuola, sartoria, pub, macelleria, farmacia, falegnameria, fabbro, emporio, circolo, banca,
autorimessa, armeria. In tutto ~93. **Destinazione: tutte.** I fronti di bottega nella città compatta sono almeno 95: Rua 25, Marina 15,
ottagono 16, Corso 12, Via di Mezzo 8, portici della Vittoria 12, piazzale 4, boom 3. La prova conta un fronte per ogni uso che c'è oggi.
Gli **interni** (`interiors.js`) seguono il loro edificio.

### 8.3 Sotto terra (`Sottosuolo.TPL.places`, ritrovamenti, banchi)

| Cosa | Oggi | Destinazione |
|---|---|---|
| Cripta di San Rocco, catacombe di San Rocco, Mercato di sotto (banco) | 1383-1395,292-303 | **L3**. Restano |
| Rifugio antiaereo, le case dello sventramento sepolte | 1329,343 · 1343,338 | sotto l'adunata: il segreto fra L3 e L6. Restano |
| Bunker della guerra | 1433,273 | **L6**. Resta |
| Deposito dei contrabbandieri (banco) | 1323,367 | sotto il Magazzino Neri, grata sulla calata (L4). Resta |
| Spaccio sotto il Flipper (banco) | 1387,362 | resta |
| Vecchie carceri | 1271,366 | sotto la Caserma della Guardia, lato sud dell'adunata (si sposta di 50 m) |
| Città dei Topi (banco) | 1197,341 | sotto i Giardini di Ponente (1236,340) |
| Metropolitana Periferia Sud e Nord | 1229,364 · 1455,288 | **stazione Mercato** (1262,352) e **stazione Mura** (1455,288): ~200 m invece di 293 |
| Cripta dei marinai, catacombe del convento, fiume sotterraneo | 1449-1454,387-401 | sotto il Santuario, capo est della marina. Restano |
| Grotta delle stalattiti | 1421,369 | sotto il Vico Lungo. Resta |
| Miniera della cava | 1471,369 | sotto la spianata. Resta |
| Borgo sepolto (raso nel 1660) | 1487,335 | sotto la spianata e il Muro. Resta |
| Cisterna e cunicolo di fuga della Rocca | 1569-1577,323-326 | **L12**. Restano |
| Il relitto | 1348,403 | sotto la darsena. Resta |
| Catacombe di San Giacomo, vecchia miniera del Nord | 1059,293 · 549,283 | fuori città: restano |
| Ritrovamento: **lo scheletro del dinosauro** | 1170,355 (pineta) | resta nella pineta della Collina dei Pini, a 80 m dalla città: è la prima gita fuori |
| Ritrovamento: **l'autobus sepolto** | 1088,278 (discarica) | sotto la discarica nuova in testa alle baracche (1232,272) |
| Ritrovamenti: barca romana, statua, campana, auto della guerra, anfore 0/2/3, tesoretti 1/2/3/5, bottiglie 3/4 | dentro la cornice | restano |
| Ritrovamenti: stanza murata del regime | 1235,301 | sotto la stazione (1268,292) |
| Ritrovamenti: rifugio dei partigiani, cimitero dei cani, deposito d'armi, nascondiglio del brigante, anfore 1/4, tesoretti 0/4, bottiglie 0-2, ossa fossili 0-3 | 1051-1183 | restano sulla collina e sul Monte (entroterra) |
| 52 tombini, fogne | sotto le strade grandi | sotto la Vittoria, il Corso, la Rua e la Marina: ~40 tombini, uno ogni 30 m come oggi |

### 8.4 I pezzi e le scenografie (`W.pezzi`, `W.sets`)

| Cosa | Destinazione |
|---|---|
| `torre_littoria`, `tettoia_mercato`, `porta_terra`, `facciata_chiesa`, `campanile`, `mura_tramontana` ×7, `magazzini_volta` ×2, `darsena`, `molo_vecchio`, `scalo_alaggio`, `bitta` ×4, `pozzo`, `lavatoio`, `arco_sottopasso` ×3, `arco_contrasto` ×5, `edicola_votiva` ×4, `gradone` ×5, `muro_garante`, `palo_riflettori` ×4, `bastione` ×2, `fossato`, `cortina` ×3, `porta_monumentale`, `torrione`, `caserma` ×3, `polveriera` | restano |
| `fontana` (del Forno) | 1356,370 |
| `portico` ×17 | restano, 3 piani |
| `stazione`, `binari`, `locomotiva`, `carro_merci`, `sottopasso`, `passaggio_livello`, scalinata della stazione | si spostano a est (L9) |
| `scalinata` ×3 della marina | restano |
| set `mercato`, `sagrato`, `adunata` (25 × 30), `piazzetta` bar, `marina`, `calata` | restano |
| set `piazzetta` forno | 1356,370 |
| nuovi: `torre_acqua`, `gru_porto`, `grata_vapore`; set `stazione`, `scalo`, `baracche`, `armi`; `W.luoghi` | sez. 7 |

### 8.5 I posti per le situazioni, le scene, le attività

| Cosa (oggi) | Destinazione |
|---|---|
| Posti `dehors` (38), `vetrina` (85), `portone` (60), `angolo` (41), `panchina` (33), `retrobottega` (27), `stenditoio` (17), `sagrato` (3), `calata` (7), `mercato` (8), `edicola` (3), `pensilina` (5), `fermata` (3), `fuoco` (5), `lotto_vuoto` (7), `facciata_in_riparazione` (3), `porta_della_citta` (4) | tutti i tipi restano. Si rigenerano da case e strade (`posti.js`) e diventano più fitti per m². Quelli del boom ovest passano al piazzale e all'angolo del boom. Le fermate e la pensilina vanno sul Corso e sul piazzale. Le porte della città salgono a 6 |
| Scene con posto: scippo, corsa all'autobus, madri alla pensilina (fermata/pensilina → Corso e piazzale) · rissa, dehors pieni, capo al tavolino, carte e baruffa, ubriaco, musicista, saluta tutti (dehors → Pozzo, Rua, Osteria) · ambulante, comizio, mercato che monta (mercato → L8) · mendicante, pausa sul gradino, sagrato al vespro, predica (sagrato → L3) · spazzino, serranda su e giù, barbiere sulla porta, due vetri, pizzo, vetrina guarda (vetrina → Rua, Corso, ottagono) · consegna col furgone, ricettatore (retrobottega → vicoli dietro la Rua e il Corso) · postino, telefono, portone e chiacchiere, circospetto (portone → borgo) · gang all'angolo, spaccio, pattuglia di notte (angolo → sbocchi sulla Vittoria e sul Corso) · reti (calata → L4) · fuoco fra le baracche (L10) · posto di blocco (porte → L11, Porta di Terra, passaggio a livello) · lamiera sulla scala (facciata → borgo, baracche) · stenditoio (tetti del borgo) · edicola e giornale (edicole → piazzale, Vittoria, Mercato) · lite al parcheggio (`sosta` → Corso e angolo del boom, le uniche vie con le auto ferme) · innamorati e vecchi in panchina (panchine → Giardini, sagrato, calata) · scala (`ladder` → le scale dei tetti) | ogni scena ha almeno un posto del suo tipo |
| Scene senza posto (non ha pagato, polizia insegue, perquisizione, scommessa, lite di coppia, vicini e bucato, due ubriachi, malore, anziano cade, portafoglio, indicazioni, chiede sigaretta, provoca, complimento, gatto, sorella persa, fattorino, attacchino, foto, pittore, gessetti, jogging, ballano, corteggia, amici, bici, bici passa, graffito) | girano dove c'è gente: tutta la città compatta |
| Skate (`skate.js`, 6 posti): Piazzale della Cultura, Piazza San Rocco, Piazza del Governo, Capannone del porto cargo, vasca dei Giardini di Ponente, muretto della Via al Mare | L1 · L3 · adunata · L5 · Giardini · calata (vedi 8.1) |
| BMX tascabile, writer (muri liberi, hall, heaven spot dai tetti), graffiti, writing | ovunque. I muri ciechi delle case mozzate sulla spianata e delle testate della Vittoria sono le tele grandi; gli heaven spot stanno sulle case di 3 piani lungo le vie |
| Pesca (i posti `pesca_*` della città) | restano sui moli (L4, L5, L12) |
| Mestieri (`mestieri.js` JOBMAP: stampa, tessere, fascicoli, timbri, cura, ripara e sabota, benzina, bancone, casse, contrabbando, barca, proiezione, cripta, staffetta, cassette, lezione al debitore…) | seguono il loro edificio (sez. 8.1): tipografia, Ministero, ambulatorio, Officina, distributore, bar, Magazzino Neri, cinema, San Rocco, Radio Luna |
| Imprese (`imprese.js`: legna, colletta, rocca, cena, ronda, pesca) | legna nell'entroterra · colletta nel borgo · rocca a L12 · cena a L2 e nelle osterie · ronda sulla Vittoria e nel borgo · pesca a L4 |
| Commissioni (`commissioni.js`: bagno, bar, botteghe) e cantiere del covo (`cantiere.js`) | seguono le case e le botteghe; il cantiere del covo ha come primo posto L6 |
| Biliardo, freccette, jukebox, poligono, vetrina delle armi (`popolo.js` SPOT_OBJ) | dentro i loro locali: bar, circolo, Rocca, armeria |
| Pescherecci all'alba, motovedetta, nave dell'Impero (lunedì e giovedì), mercato due mattine, cassiere della Famiglia alle 10-11 | darsena e Molo (L4) · giro dell'isola · porto cargo (L12) · L8 · lavanderia e Flipper (restano) |

### 8.6 Tetti e porte

| Cosa | Destinazione |
|---|---|
| 539 scale dei tetti (`Tetti.LADDERS`) | si rigenerano. Le case più basse ne danno di più fra case vicine e meno salti verso il vuoto |
| Circuiti: giro della Porta, del Forno, del campanile, della marina | restano (le zone `ZONE` di `percorsi.js` stanno nel borgo, che non si muove) |
| Camminamento delle mura di tramontana | resta, ed è il segreto Baracche → Covo |
| Nuovo: giro del Mercato | sui tetti dell'Ottocento |
| Porte: Porta di Terra, sottoportico dei Bottai, sottopasso Cavour, scala dei pescatori, posto di blocco | restano. Il sottopasso Cavour si sposta con la stazione (gen 970) |
| Nuova porta: passaggio a livello | la sua alternativa è il sottopasso |

---

## 9. Le prove da aggiornare e quella nuova

- `test_posa.js`: pezzi voluti (aggiungere gru, torre dell'acqua, grata). La riga «dalla Via della Stazione si scende agli scogli» diventa
  «dal piazzale». «La Vittoria si percorre tutta, dal Mercato al Muro» (nuovi capi). Portici a 3 piani.
- `test_percorsi.js` (sul ramo `percorsi2`): 3 dominanti, almeno 9 secondari, 6 porte con l'alternativa, 5 circuiti, scorciatoie ≥ 30%.
- `test_chiarezza.js`: filari solo sul Corso.
- `test_posti.js`, `test_citta_viva.js`: conti per zona (il boom quasi sparisce, le baracche crescono), i tipi nuovi, la densità ≥ 4 ogni 1000 m².
- `test_segni.js`, `test_botteghe.js`: ogni uso di bottega di oggi ha almeno un fronte.
- `test_sottosuolo.js`: tombini (~40), metropolitana più corta, Topi e carceri spostati, autobus sotto la discarica nuova.
- `test_tetti.js`: i circuiti e la caduta senza danno con le case più basse.
- `strumenti/leggibilita.js`: le soglie (vie ≥ 90% leggibili senza varco con la regola del lato camera).
- **Nuova `test_mappa_compatta.js`**, da scrivere in fase 2:
  - la cornice: niente case fuori da 1222-1608;
  - le altezze: nessuna casa sopra i 3 piani tranne le 6 torri;
  - le larghezze ammesse: 10, 7, 5, ≤ 3;
  - nessuna strada `litoranea` dentro la cornice;
  - le piazze a più di 40 m l'una dall'altra;
  - 12 `W.luoghi` raggiungibili a piedi;
  - ogni landmark visto da almeno 2 quartieri (`Percorsi.vista`);
  - ogni riga della sez. 8 ritrovata nel mondo per nome o id.

## 10. I rischi

1. **Rami non uniti.** `percorsi.js`, `palco.js` e `chiarezza.js` non sono in questo worktree: la fase 2 parte da un'unione, altrimenti si progetta su codice vecchio.
2. **Coordinate scritte a mano dappertutto.** `RELOC` dei luoghi con nome, `BORGO` e `ZONE` di percorsi, l'asse di palco (cerca `T.VIA`),
   `strumenti/scorci.json`, la BIBBIA, i salvataggi. Lo spostamento di stazione, officina, alberghi e disco rompe gli id e le missioni che li
   citano, se `RELOC` non è aggiornato nello stesso passo.
3. **Il bordo ovest vuoto.** Tagliata la città, la fascia 1100-1250 rischia di diventare «la metropoli che è un parco». Va disegnata come
   entroterra vero: pineta, orti a terrazze, la scarpata ferroviaria. Va fatto subito, non dopo.
4. **Le prestazioni.** 84 abitanti pieni invece di 70 e scene più fitte: si contano le draw call nel borgo di sera, che è il caso peggiore.
5. **La regola del lato camera.** Senza la regola dei 2 piani sul lato sud ed est, le vie da 5 m spariscono dietro le case anche se sono basse.
   Si misura con `leggibilita.js` prima e dopo.
6. **Missioni e scene che contano sullo spazio.** Inseguimenti, fughe in BMX e cariche della celere con meno metri: la Vittoria (218 m) e il
   Corso (110 m) sono le uniche corse lunghe, e vanno bene per questo. La fuga lunga diventa i tetti e il sotto.
7. **La ferrovia sotto le mura.** Resta fino al Muro: rilevato, mura e baracche si toccano a 15 m dalla riva. Le baracche hanno solo 13-16 m:
   due file, non tre.

---

## 11. Le correzioni del committente (v2): gli incroci e la Rocca a mare

### 11.1 Le strade si incontrano come strade vere

Il committente: «le strade non si incrociano e fondono in modo realistico, ma a volte continuano con un tondo o altre cose strane: la forma
delle strade e dei bivi è fondamentale», e poi: «alcune vie finiscono in vicoli ciechi perché continuano oltre l'incrocio ma non finiscono da
nessuna parte». Le regole, per la pianta e per il gioco:

- **Ogni capo ha un perché.** Una strada finisce su un'altra (incrocio a T, o a Y dove due vie si separano), dentro un nodo (piazza,
  piazzetta, spianata, Giardini) o **contro qualcosa di dichiarato nei dati**: una scala (sale sulle mura, scende alla spiaggia), una porta o un
  arco (la Porta della Rocca, il sottopasso), un luogo in fondo (la discarica delle baracche), un affaccio sul mare con la banchina, l'uscita
  verso l'entroterra. Mai un tondo, mai un moncone.
- **Niente monconi oltre l'incrocio.** Se il tratto dopo l'ultimo incrocio non porta a niente si accorcia fino all'incrocio, che diventa una T.
  Un vicolo cieco resta solo se è voluto (nascondiglio, corte, porta, scala sui tetti, affaccio) e lungo almeno 6 m, con la chiusura scritta.
- **Angoli veri.** Fra due bracci vicini almeno 40°: la T fra 60° e 120°, la Y fra 40° e 60°. Niente cunei.
- **Il cordolo gira l'angolo.** Ogni angolo fra due bracci ha lo smusso (raggio 1,6 m sui vicoli, 3 m sulle vie) oppure lo spigolo di una casa;
  il cordolo è continuo e si apre solo dove entra un'altra strada. I vicoli laterali si aprono dal fronte, non sono attaccati sopra.

Nella rete v2 i vicoli a pettine del nord non muoiono più contro le mura: finiscono sulla **Via delle Mura**, il vicolo che corre dentro la
cinta (il pomerio), con la scala di ronda della Porta di Terra a ovest e la spianata a est. I pettini del sud si aprono sulla Vittoria; quelli
sotto la Vittoria sulla Via di Mezzo; la Via di Mezzo entra nel Corso e nella Via della Marina. La Rua parte dal Corso (sotto la Porta di
Terra) e finisce sulla spianata. La Vittoria va dal Mercato alla spianata; il **Ponte della Rocca** passa il canale e finisce sulla Porta.

Il controllo è `strumenti/incroci.js` (lo usano la pianta del progetto e la prova del gioco): conta incroci per tipo, capi per tipo di chiusura,
angoli sotto i 40°, capi aperti e monconi, e calcola gli smussi. **La rete v2: 37 strade, 50 incroci (47 a T, 1 a Y, 2 a croce), 74 capi:
48 su una strada, 19 in un nodo, 7 chiusi (3 scale, 1 porta, 1 luogo, 2 uscite verso l'entroterra), 0 capi aperti, 0 monconi.** Il gioco di oggi
(`node strumenti/incroci.js`): 43 strade, 39 capi aperti (vicoli che muoiono a metà, la Via Nazionale che finisce nel nulla, il Raccordo del Muro).

Nella pianta i capi sono tagliati dritti e ogni chiusura ha il suo segno (gradini, arco, facciata, freccia); nel gioco le vie si stendono con
i capi dritti (non più `lineCap: round`) e ogni strada porta i suoi `capi` nei dati.

### 11.2 La Rocca: un castello aragonese a mare

«La fortezza adesso non ci sta.» I riferimenti (`_immagini/riferimenti/fortezza_da_fuori.png`, `fortezza_da_dentro.webp`) sono un castello a mare
su uno scoglio basso, cinto da un frangiflutti di massi e staccato dalla città dall'acqua. La Rocca v2 (coordinate finali):

| Parte | Dove | Alto | Com'è | Nel gioco |
|---|---|---|---|---|
| Canale | 1504-1518, da riva a riva | — | il vecchio fossato diventa mare: la Rocca è un'isola. Ci si arriva solo dalla Vittoria, sul ponte in muratura col levatoio, o per mare | `fossato` con `acqua` |
| Scoglio e frangiflutti | 1518-1603 × 301-381 | — | la riva di roccia bassa e, a 2,5 m in mare, un anello di massi tondi e scogli rotolati (non davanti alla porta d'acqua e ai moli) | caselle `ROCK`, 21 tratti di `scogliera` |
| Fronte di terra con la Porta | 1518-1526 × 316-372 | 14 m | muro a picco, poche finestrelle, parapetto merlato; la porta con lo stemma sull'asse della Vittoria (il cannocchiale ci arriva) | 2 `corpo_rocca`, `porta_monumentale` |
| Rivellino di ponente | 1518-1528 × 306-316 | 6 m | basso, a scarpa, l'erba sulla terrazza | `corpo_rocca` con `scarpa`, `erba` |
| Caserma sulla cortina nord | 1530-1570 × 310-320 | 2 piani | la caserma lunga contro il mare di tramontana, il fronte sulla piazza d'armi | `caserma` (edificio `caserma_p`) |
| Raccordo | 1570-1578 × 316-328 | 17 m | il gradone fra la caserma e il mastio, merlato | `corpo_rocca` (`hangar2`) |
| **Mastio col faro** (il comando) | 1578-1592 × 324-340 | 24 m + faro | il volume più alto, a picco: piede a scarpa, cordone, finestrelle rade, merli sui beccatelli, lo stemma; in cima il casotto, il castelletto di ferro a traliccio e la lanterna rossa (il «torrione col riflettore» del landmark) | `mastio` (edificio `rocca`) |
| Corpo di levante | 1580-1592 × 340-356 | 13 m | la massa sulla punta, finestre rade | `corpo_rocca` (`hangar1`) |
| Rivellino di scirocco | 1584-1600 × 358-374 | 7 m | il bastione basso a punta verso il mare, con la garitta | `bastione` |
| **Torrione** tondo e tozzo | 1532, 372, r 9 | 10 m | sull'angolo di libeccio, verso la città e il porto, come nel riferimento | `torrione` senza lanterna |
| Piazza d'armi | 1542-1570 × 322-345 | — | lastricata, il luogo-missione 12; la polveriera (1528-1540 × 324-332) nell'angolo | caselle `PIAZZA`, `polveriera` |
| **Darsena** | acqua 1544-1574 × 350-372 | — | il bacino allagato dentro le mura, le banchine di carparo coi gradini che scendono all'acqua | `darsena` con `rocca` (caselle d'acqua e `QUAY`) |
| **Ponte ad arco** | da 1543 a 1575 a y 359 | 7 m | il grande arco a tutto sesto di pietra che scavalca la darsena | `ponte_arco` |
| **Porta d'acqua** | 1544-1574 × 372-376, fornice 1554-1563 | 11 m | la volta che apre la darsena sul mare, fra i due moli; la saracinesca alzata | `porta_acqua` |
| Corpo del ponte e **portale** | 1526-1538 × 346-362; portale a 1538, 348-357 | 10 m | la massa con l'erba in cima; sulla faccia verso la darsena (e la camera) il portale con lo stemma e la pensilina di ferro | `corpo_rocca` (`deposito_n`), `porta_monumentale` con `pensilina` |
| Moli | 1546 e 1572, da 380 a 414 | — | il molo militare (motovedette, rimorchiatore) e quello della nave dell'Impero (lunedì e giovedì) | `molo` (i due moli a nord e la testata non ci sono più) |

Nel gioco: i pezzi di `pezzi_citta.js` allungati (`fossato` col mare, `darsena` del castello coi gradini, `porta_monumentale` con la
pensilina, `torrione` tozzo, `bastione` basso, `caserma`, `polveriera`) e cinque nuovi: `mastio`, `corpo_rocca`, `ponte_arco`,
`porta_acqua`, `scogliera`, tutti di carparo dorato (`COL.carparo`, la sua veste a conci). Gli edifici militari del gioco (comando,
caserma, depositi) restano edifici (porte, interni, missioni) e la loro grafica la fa la massa del castello (`b.pezzo`). Il cunicolo di fuga e la cisterna (sotto) restano; il segreto per mare entra
dalla porta d'acqua della darsena invece che dal fossato.
