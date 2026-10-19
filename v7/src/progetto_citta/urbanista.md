# L'urbanista storico — la città come palinsesto

## 1. Critica: che cosa ho visto in pianta

- **Le strade maestre sono figlie della Rocca, e la storia dice il contrario.** Sei arterie di 14-16 m (7-8 caselle) partono a ventaglio dalla Porta della Rocca e tagliano il borgo in sei spicchi triangolari. È il tridente di una capitale barocca, ma il borgo esisteva *prima* della Rocca. Effetto: il borgo non c'è più, ci sono sei aiuole d'asfalto.
- **Dentro gli spicchi le case sono oggetti sparsi.** Sono rettangoli staccati, col verde avanzato in mezzo e i vicoli arancio che girano fra i cortili. Mancano cortina stradale, isolato e corte. In un borgo mediterraneo il suolo coperto è l'85-95%, qui forse il 50%: sembra una periferia di villette.
- **Tre maglie con lo stesso generatore e parametri diversi** (passo 18/13/10, sghembo 0/.75/.95). Così viene un *gradiente*, non una *stratificazione*: ogni epoca ha una geometria, un lotto e un tipo edilizio suoi.
- **Nessuna epoca lascia segni sulla successiva.** La Strada delle Mura (arco di raggio 96 m) è un'idea giusta, ma resta una strada come le altre: nessun moncone di bastione, nessun salto di quota, nessun giardino nel fossato.
- **La spianata è una striscia beige di 10-16 m.** Ne servono 40-60. Il borgo finisce "pulito", mentre la spianata è stata *tagliata* nel borgo.
- **La metropoli è un frammento.** Il parco si mangia un terzo della parte ovest, gli isolati sono 5-6 e non hanno un confine che li generi (il corso).
- **La costa nord** ha la ferrovia in mare e una fila di case lungo la strada. Non c'è la fascia baraccata.

## 2. Il principio: generare per epoche, in ordine

Il generatore deve **ripercorrere la storia**. Ogni strato scrive sulla griglia, il successivo eredita i lotti, le linee e le quote del precedente e li **taglia, ricopre, sopraeleva**, senza mai cancellarli del tutto. Ogni casella e ogni edificio porta il suo `layer`.

Misure del sito (coordinate finali): città 1100-1490, Rocca 1490-1610, terra y≈255-450. Sono solo 390 m: ogni epoca deve stare stretta e densa.

## 3. Gli strati

**S0 — Antico/medievale (fino al 1500), x 1330-1490.** Il nucleo sta sul rilievo sopra la cala del porto vecchio. Lascia **un solo asse dritto** (il decumano, la "Rua Grande") est-ovest, largo 4 m, e un cardine storto verso la cala. Intorno, una maglia **a spina di pesce** alla Molfetta: dorsali con vicoli a pettine ogni 8-12 m, larghi 2-3 m. I lotti gotici misurano 5-7 m di fronte per 12-16 di profondità. Al punto più alto la Chiesa Madre col sagrato (14×10 m). Il perimetro delle mura medievali è un'ellisse che passa per x≈1320.

**S1 — La Rocca (1660-1690).** Si costruisce sulla punta **demolendo la parte est del borgo**. La spianata (x 1440-1490, 50 m) è *ritagliata*: i vicoli finiscono ciechi sul vuoto, le case restano tagliate a metà con i muri di spina a vista, mezza chiesa sopravvive (la facciata sì, l'abside no). Insieme alla Rocca nascono le **mura di tramontana** bastionate lungo la costa nord, unite alla Rocca, con il camminamento percorribile (4 m). A sud, il molo della Porta a Mare.

**S2 — Il Settecento della marina, x 1330-1440, lato sud.** Nasce il borgo di marina sulla calata: magazzini e fondaci di 10×20 m in fila sul porto, con le case alte e strette dei pescatori (3-5 piani) e scalinate che salgono al nucleo. Archi e sottopassi (vicoli coperti di 1 casella).

**S3 — L'Ottocento (1860-1910).** Si abbattono le mura di terra e sul fossato nasce **il Corso**, una circonvallazione curva di 14 m con alberi, che segue l'ellisse medievale (x≈1300-1330). Di là dal Corso c'è il **borgo nuovo murattiano** (x 1190-1300). La griglia **non è a nord**: è ortogonale alla tangente del Corso nel punto della porta principale. Isolati di 36×48 m (18×24 caselle) a corte chiusa, cortina continua a 4-5 piani, strade di 10 m con marciapiedi. Sulla cucitura, alla porta di terra, sta il **mercato ottagonale** (Porta Palazzo, diametro 40 m, tettoie in ghisa). Nel 1880 arriva la **ferrovia** sulla costa nord, su terrapieno, che taglia le mura di tramontana con un varco: la stazione sta all'estremo ovest del Corso. Il parco diventa la villa comunale (40×50 m) sul vecchio bastione in fondo al Corso.

**S4 — Lo sventramento (1930-40).** Un **rettifilo di 18 m** fende il borgo dal Corso alla spianata: è l'unica strada larga del borgo, quella che oggi usa la Tutela. Sui due lati ci sono palazzi porticati INA, alti e lisci, e dietro i fianchi sventrati del tessuto vecchio: muri ciechi, lotti mozzati, piazzette triangolari di risulta.

**S5 — Guerra e ricostruzione (1943-60).** Dove sono cadute le bombe (3-5 buchi di 15-25 m sparsi nel borgo e nell'Ottocento) ci sono vuoti diventati parcheggi, campetti o palazzine a 6 piani fuori allineamento: qui va la regola rotta, con rotazione fino a 30°.

**S6 — La speculazione (1960-80), x 1060-1190 e a macchia.** Ovest: torri da 10-16 piani su lotti accorpati e la superstrada sopraelevata sul viale (12 m). In fondo la **megastruttura** a stecche (le Vele, 120×20 m, gallerie). A macchia nell'Ottocento: qualche palazzone da 9 piani che sostituisce mezza corte. Sopra i tetti del borgo, le **sopraelevazioni abusive** in lamiera e blocchetti: è il livello dei tetti per il gameplay. Lungo la ferrovia nord, tra binari e scogli, la **fascia baraccata** profonda 10-25 m.

**S7 — Il Garante (1980-86).** Non costruisce, **occupa e taglia**: il Muro e il posto di blocco sulla spianata, i cancelli sui vicoli, i riflettori, i ritratti sulle testate cieche dello sventramento.

## 4. Regole generative

1. **Ordine fisso**: S0→S7. Gli strati successivi demoliscono solo per *operazioni nominate* (spianata, sventramento, bombe, accorpamento).
2. **Il borgo non ha strade carrabili**, a parte il rettifilo S4 e la calata. Il resto è vicolo di 2-4 m, scalinata, sottopasso.
3. **Copertura**: borgo ≥85%, Ottocento 70% (con corti interne), speculazione 35-45% (torri e piazzali). Il prato è ammesso solo nei vuoti nominati.
4. **Facciate a filo strada**: una casa nasce dal fronte del lotto. Niente oggetti liberi fuori da S5 e S6.
5. **Le cuciture sono luoghi**: Corso/borgo = mercato e porte; borgo/spianata = muri tagliati e cancelli; Ottocento/speculazione = la sopraelevata.
6. **Cinque landmark di orientamento**: Rocca, Chiesa Madre, mercato ottagonale, Vele, stazione. Da ogni piazza se ne devono vedere almeno due.

## 5. Da evitare

Viali che convergono sulla Rocca. Verde di risulta fra le case. Lo stesso tipo edilizio in tutte le epoche. Le transizioni a sfumatura: le epoche si toccano con un **bordo netto** (un corso, un muro, un taglio), mai con un gradiente.
