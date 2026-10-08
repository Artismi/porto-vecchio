# Porto Vecchio — Bibbia delle missioni

Questo documento va dato per intero a un'IA che deve scrivere missioni per Porto Vecchio. Contiene il mondo, la mappa con gli id veri dei luoghi, le fazioni, il cast, quello che il motore sa già fare e il formato in cui consegnare missioni e moodboard.

Fonti: il codice di `v7/src/` (world.js, game.js, risacca.js, fazioni.js, ordine.js, sottosuolo.js, livelli.js, economia.js) e i documenti `HANDOFF_*.md`. Gli id e le coordinate del capitolo 12 sono estratti dal gioco (`World` + `Game.PLACES`, seme fisso). Se la mappa cambia, rigenerali (vedi 12.0).

---

## 0. Istruzioni per l'IA

Sei il game designer delle missioni di Porto Vecchio. Il tuo lavoro:

1. **Progettare missioni** sparse su tutta l'isola, sopra e sotto terra e in mare, dettagliate fino al punto in cui un programmatore può implementarle senza chiederti niente.
2. **Accompagnare ogni missione con una moodboard scritta**: palette, luce, aria, materiali, inquadrature, suoni, oggetti di scena, riferimenti e prompt per le immagini. La moodboard deve servire a chi disegna le scene e a chi genera immagini di riferimento.
3. **Restare dentro al mondo**: tono, epoca, fazioni e geografia sono quelli scritti qui. Se inventi un luogo, un personaggio o una meccanica, lo dichiari come **[NUOVO]** e spieghi dove sta e cosa serve.

Regole che non si discutono:

- **Usa solo gli id del capitolo 12** per luoghi ed edifici. Un id inventato fa fallire la missione: il motore lo scarta.
- **Distingui sempre** quello che il motore fa già (capitolo 6) da quello che richiede codice nuovo (segnalo con **[MOTORE]**).
- **Il mondo è vivo da solo**: gli abitanti hanno orari, ricordi, pettegolezzi, paure. Una buona missione si appoggia a questi sistemi (testimoni, voci, Repressione, orari) invece di metterli in pausa.
- **Niente missioni da corridoio**: ogni missione deve avere almeno due modi di riuscire (a piedi o in barca, di giorno con un travestimento o di notte, con la forza o con la parola) e un modo di fallire che lascia conseguenze, non un «game over».
- **Scrivi in italiano**, battute dei personaggi comprese. Insegne e scritte del regime in cirillico o coreano (vedi 2.4). I Marsigliesi parlano francese mescolato all'italiano.

---

## 1. Il mondo in una pagina

**Porto Vecchio, 1986. Un'isola del Tirreno sotto la Tutela**, un regime orwelliano retrofuturista: il 2019 come lo si immaginava nel 1984. È inverno: freddo umido, fanghiglia, nebbia, fumo di carbone dai camini, fuochi nei barili.

- **Il Garante** parla ogni sera **alle 20** da tutti gli schermi dei bar e delle piazze («L'ordine è una carezza»). I suoi ritratti e i murali di propaganda coprono i muri ciechi.
- **La Tutela** comanda dal '79, quando chi non firmò per lei fu epurato. Chi parla troppo viene «rettificato»: sparisce (il marito di Rosa nell'81).
- **L'Impero** è la potenza del continente. La sua nave arriva al porto cargo **il lunedì e il giovedì all'alba**, se la Tutela la lascia sbarcare, e porta tutto quello che l'isola non produce. Si paga in contanti e in tributo. Al mercato nero girano dollari e vodka dell'Impero.
- **Il Muro** taglia l'isola a est (x ≈ 1161 m): un solo varco, garitta, sbarre, torri coi riflettori. Oltre il Muro ci sono la Base della Tutela e il porto cargo e militare.
- **La Risacca** è la resistenza: cellule segrete, nomi di battaglia, simbolo **un'onda tracciata col gesso**, una radio clandestina (**Radio Scirocco**). Il giocatore ne fa parte.
- **Il protagonista è Nino.** Una casa in periferia ovest, tre amici del quartiere, un lavoro con l'orario, l'affitto il lunedì, la paga il venerdì, fame, sonno, igiene, svago e i vizi (vino, sigarette).
- **Gli abitanti**: circa 260 più il cast. Ognuno ha una giornata, un mestiere, un carattere (coraggio, chiacchiere, avidità, rispetto delle regole), un diario di ricordi e dei progetti. Si organizzano da soli (imprese, commissioni, scassi, agguati, proteste) e un'IA di regia dà loro iniziative vicino al giocatore.
- **Soldi**: lire, contate in migliaia nel gioco (un panino 3.000, un affitto 12.000 a settimana).

**Il tono**: malinconia e ironia, paura quotidiana e piccoli coraggi. Non è un mondo di eroi: è gente comune che sceglie da che parte stare. La violenza esiste e pesa: chi vede ricorda, chi ricorda parla.

---

## 2. Estetica: le regole visive del gioco

Queste regole vengono dal lavoro di grafica già fatto e dalle indicazioni di Andrea. Ogni moodboard deve rispettarle.

### 2.1 Inquadratura
- Pixel art isometrica con camera cinematografica: a piedi fov 14°, vista dall'alto a tre quarti; il gioco disegna a circa 400 pixel di altezza, quindi **conta la massa e la luce, non il dettaglio fine**. Un oggetto di un metro sono 4-6 pixel.
- La camera guarda da **sud-est**; il sole di giorno è basso e radente e arriva da nord-ovest, quindi le facciate visibili sono spesso in controluce. Di notte comandano le sorgenti artificiali.
- Alla guida la camera sta dietro al mezzo, fov 42°.

### 2.2 Luce (la «regia delle luci»)
- **Lampioni da strada**: sodio arancio cupo (`#f0a048`, al porto ancora più cupo).
- **Vetrine, finestre, porte**: incandescenza calda.
- **Vicino ai bar**: rosso-ambra basso.
- **Luoghi del regime** (caserma, Rocca, Muro, varco, Base, Palazzo della Cultura, quartiere del governo): **bianco duro**, un tubo su quattro sfarfalla.
- **Rosso del regime** (`#b84a3c`) e fuoco restano saturi; tutto il resto è desaturato dal grading.
- **Neon**: pochi e sgangherati (lettere spente, tubi rotti, sfarfallio). Niente ciano e magenta allegri: sembravano luci di Natale e sono stati tolti. Gli azzurri saturi vengono portati al grigio.
- **Di notte il buio è vero**: luna debolissima, coni di luce netti, ombre che si proiettano nella nebbia. Le luci difendono dal buio.
- **Aria**: brina sospesa che scintilla nei coni, fiato visibile davanti alle facce, vapore dai tombini, fumo di carbone dai camini, nebbiolina bassa che prende il colore delle luci, asfalto bagnato con i riflessi.

### 2.3 Materiali e palette di base
- Città: intonaci **grigio latte, bianco sporco e cemento**, con pochi caldi sbiaditi (ocra, cotto, sangue di bue, senape, rosa antico, salvia, verderame). Il contrasto da replicare è grigio latte contro murale rosso.
- Facciate vissute: intonaco caduto coi mattoni, colature sotto i davanzali, umido che sale, persiane di legno, bucato, edera dai tetti piani, giardini pensili, cavi elettrici, condizionatori, parabole, antenne.
- Composizione delle case **in tre fasce**: piano terra = la bottega o la porta; piani alti = un solo elemento forte (bovindo, murale, insegna); tetto = un solo gruppo (orto in vasi, pergolato, serbatoio con insegna).
- **Gerarchia**: il dettaglio va dove deve cadere l'occhio (porte, botteghe, il punto della missione); il resto resta calmo.
- Natura: abetaie scure, faggete, betulle bianche, pini piegati dal vento alla Punta, macchia sulla costa di tramontana, felci, foglie a cuore e palme nane nei valloni umidi, erba secca e paglia dorata sul pascolo del Tavolato.
- Mare color acciaio.
- **Neve**: il codice la sa disegnare, ma oggi è spenta (`NEVE = false` in render.js). Puoi proporre una missione con la neve solo come **[MOTORE]**.

### 2.4 Scritte e lingue
- Insegne in **cirillico e coreano**, a volte insieme: БАР ДЖИНО, 吳 식료품 (Alimentari Wu), ДВОРЕЦ КУЛЬТУРЫ, ОПЕКА 보호 (la Tutela), ГВАРДИЯ, КИНО АСТОР, ПРАЧЕЧНАЯ, 플리퍼, ПОРТО-ВЕККЬО sui cartelli di inizio città.
- Giornali: ПРАВДА ОСТРОВА, IL GARANTE, ВЕЧЕРНИЙ ПОРТ, 섬 신문, LA SERA.
- Telecamere del regime col cartello ВИДЕО-КОНТРОЛЬ.
- Manifesti: il Garante, slogan, concerti e cinema, scomparsi con le linguette, volantini della Risacca, ordinanze col timbro, tag a spray.
- Murali di propaganda in sei soggetti: il Garante sulla folla, l'operaio col martello, la contadina col covone e il bambino, il soldato della Tutela con la maschera davanti al Muro, l'occhio che ascolta con le antenne, il porto con la nave e le gru. La Risacca li sfregia con l'onda nera e «NO».

### 2.5 Da evitare
Palme da cartolina, olivi e cactus in città, azzurri saturi, ciano e magenta a festa, luci tutte uguali, oggetti sparsi a caso, «pioggia» di dettagli, eroi in posa, scritte in inglese (tranne la merce di contrabbando).

---

## 3. La geografia

### 3.1 Forma e coordinate
- Mappa **1300 × 400 m** (650 × 200 caselle da 2 m). **x cresce verso est, y verso sud**: y piccola = costa nord (di tramontana), y grande = costa sud.
- L'isola è una lingua di terra da ovest a est: a ovest una **testa di bosco quasi tonda** (centro 200, 214, raggio 166 m) col **Tavolato** in mezzo; poi una **vita stretta** e il **collo di foresta**; il **Monte Scuro**; la **periferia ovest**; il **quartiere del governo**; il **centro** col porto vecchio; la **periferia est** con la Collina Nera e il Lido; **il Muro**; la **Base** e il **porto cargo** sulla coda.
- Una **costiera fa il giro intero** (Costiera Nord `nord` e Costiera Sud `litoranea`, larghe 8 m), con le case a tratti tra strada e mare e a tratti la strada sospesa sul mare. In città: Corso della Vittoria (`corso`), Via del Porto, Via Alta, Via del Governo, viali diagonali sulla piazza e circa 140 vicoli stretti con nomi ricorrenti (Vicolo dei Lanternini, Vico della Fame, Vicolo del Fango, Salita dei Gatti, Vico delle Lamiere, Vicolo Cieco…).
- **Distanze**: dalla Punta al centro ci sono circa 950 m, dal Tavolato alla piazza circa 840 m. La testa di bosco è lontana: chi ci va a piedi impiega minuti veri. Usalo per dare peso ai viaggi.

### 3.2 Le regioni, da ovest a est
Per ogni regione: carattere, chi ci sta, come ci si arriva, e alcuni spunti di missione da sviluppare.

**A. La testa di bosco e il Tavolato (x 0–366).** Bosco fitto quasi tondo e, in mezzo, il **Tavolato**: un tepui a 42 m con pareti verticali, un ghiaione a fascia e un pianoro di pascolo. Ci si sale **solo a piedi**, da due canaloni (`canalone_o`, `canalone_e`). In cima c'è l'**accampamento dei beduini**. Sulla riva: **Faro di Punta Scogli** (torre di lamiera arancione su traliccio), **saline** e casa del salinaio, **Spiaggia Lunga** a sud con i capanni dei pescatori, le due **stazioni di estrazione** (Nord e Sud: mattoni, ciminiere a fasce, silo, trivella, torcia, recinto), il **Bosco Antico**, il **Campo partigiano** nascosto.
- Ambienti: punta ventosa, dune, pineta dietro la Spiaggia Lunga, saline, abetaia attorno al tepui, faggeta sui versanti al sole, macchia sulla costa di tramontana, ruderale alle stazioni.
- Spunti: un carico dalle stazioni di estrazione; trattare coi beduini sul Tavolato; un messaggio dal faro a una barca al largo; il Campo partigiano da ritrovare e riattivare.

**B. Il collo di foresta e la Spiaggia Lunga (x 366–678).** Foresta stretta tra le due costiere. A sud il **Borgo dei pescatori** col pontile, a nord le **Case della Tramontana** col pontile. La **Via della Memoria** è una mulattiera che sale verso il canalone di levante. **La Forra**: un torrente umido largo circa 40 m che scende dal Tavolato al Borgo dei pescatori, con felci, liane e foglie grandi.
- Spunti: contrabbando via mare tra i due borghi; un ricercato nascosto nella Forra; la gente dei borghi che vive di pesca e non vuole guai.

**C. Il Monte Scuro (x 678–790).** Un'unica cresta boscosa con una cima e una sella. **Altopiano col lago gelato**, **Pizzo del Monte Scuro** con la croce di vetta, **neviera**, **cascata gelata**, **Gola del Lupo** col **Ponte del Diavolo**, **Grotta** ed **Eremo del Romito** (collegati da gallerie naturali), **Fiumara dei Carbonai** e la sua caletta. Borghi arroccati: **San Giacomo** (chiesa, osteria, vigne, Conservificio Sanna) e **Borgo dei Carbonai**; la **Masseria Sant'Elia**, l'**ovile abbandonato** e la **Radura del pastore** (territorio dei briganti di Malanotte). Molti luoghi sono «da scoprire»: la prima volta compare «Hai scoperto: …».
- Strade: Strada del Valico (`macchia`), Strada di San Giacomo (`paese`), Sterrata di cresta (`cresta`), mulattiere e sentieri larghi 1,4 m segnati da segnavia e ometti di pietra.
- Spunti: patti e tradimenti coi briganti; una cassa sepolta; un fuggiasco da accompagnare oltre la cresta; il vino delle terrazze come merce di scambio.

**D. La periferia ovest e la Collina dei Pini (x 790–880).** Case lungo le costiere, blocchi d'abitazione, baraccopoli. **Paese Vecchio** abbandonato (la chiesa senza tetto, le case crollate), **Officina di Dorino**, **Discoteca Luna**, **Teatro Odeon**, **Pensione Gabbiano**, **Mattonificio Piras**, la **pineta** dove si nasconde Divisa, il **Monolite**, la carbonaia, i **Giardini di Ponente**. Qui abita Nino.
- Spunti: la discoteca come copertura per una trasmissione; un'auto da truccare all'officina; il Monolite come punto d'incontro segreto.

**E. Il quartiere del governo (x 880–960).** Torri di cemento sopra la baraccopoli: **Palazzo del Governo**, **Ministero dell'Ordine**, **Uffici del Garante**, **Archivio di Stato**, **La Pietra dell'Onda** (insegna ОПЕКА), **Piazza del Governo** (sotto c'è il rifugio antiaereo). Luce bianca dura, Guardie del Garante. Vicino: **Cantiere navale** e scalo, **Tipografia Totò**, **Circolo dei Lavoratori**.
- Spunti: un fascicolo dall'Archivio; un volantino stampato in tipografia sotto il naso del Ministero; un'infiltrazione dal rifugio antiaereo.

**F. Il centro e il porto vecchio (x 960–1075).** Città organica: poche strade larghe, vicoli storti, piazzette. **Piazza San Rocco** con la fontana, il banco dei fiori, il mercato di fortuna e lo schermo del Garante; **Chiesa di San Rocco** (cripta), **Bar Da Gino**, **Bar Sirena** (la Zia), **Osteria del Porto**, **Caserma della Guardia**, **Biblioteca civica**, **Cinema Astor**, **Palazzo della Cultura**, **Alimentari Wu**, **Sala giochi Flipper**, **Magazzino Neri**, **Videoteca Stella**, **Hotel Miramare** (comando del Colonnello), **Ambulatorio**, **Condomini Stella e Aurora**. Il **porto vecchio**: Molo Vecchio a gomito con la lanterna rossa, Molo di Levante con la lanterna verde, pontili dei gozzi, della Marina ed Est (il pontile dei Marsigliesi), la Calata, i pescherecci.
- Sotto: fogne con 52 tombini, Cripta di San Rocco, Vecchie carceri sotto la caserma, Deposito dei contrabbandieri sotto il Magazzino Neri (grata sulla calata), Spaccio sotto il Flipper, Mercato di sotto sotto la piazza, Città dei Topi nella cisterna sotto i giardini.
- Spunti: quasi tutto. Il centro è denso: usalo per missioni sociali, di pedinamento, di consegna sotto gli occhi di tutti.

**G. La periferia est, il Lido e la Collina Nera (x 1075–1161).** Il **lungomare** (Via al Mare, Passeggiata a mare) con gli **hotel Flamingo** (ci dorme la Commissaria Pardo), **Paradiso** e **Oceano**, la **Gelateria Polo Nord**, la **Trattoria da Nina**, la **Banja del Lido**, la **Spiaggia gelata** e il pontile del Lido. Sopra, la **Collina Nera**: cava e casotto, ruderi, vecchia vedetta, **grotta** nascosta, **covo** nascosto, la **cima col ripetitore della Tutela** (`vetta`: se lo spegni prima delle 20 il Garante tace), il **Santuario del Mare** (cripta dei marinai, cisterna), il Belvedere, il **Bunker della guerra** con la botola nel bosco. In fondo, la **discarica di levante**.
- Spunti: sabotare il ripetitore; una notte al Flamingo; il covo come base della banda.

**H. Oltre il Muro: la Base (x 1161–1240).** **Varco del Muro** (garitta, sbarre, lasciapassare obbligatorio), **Rocca della Tutela** (radar che gira, antenna rossa, bandiere), **Caserma della Tutela**, sei baracche, **Poligono**, magazzino e dogana del porto cargo. Soldati coi cani, il blindato, le campagnole. Di notte l'**elicottero** gira col faro sopra la Base e la periferia est.
- Spunti: entrare con documenti falsi, dal mare o da sotto; recuperare un prigioniero; fotografare un carico.

**I. Il porto cargo e militare (x 1240–1300).** Moli di pietra larghi, gru, container, **Molo dell'Impero** con la nave, motovedette, rimorchiatore, **Eliporto** e hangar degli elicotteri, deposito della Base.
- Spunti: lo sbarco del lunedì all'alba; una cassa che non deve arrivare al Supermercato del Popolo; un passaggio clandestino verso il continente.

### 3.3 Il mare e la costa
- **Tipi di riva**: spiagge (Spiaggia Lunga, Spiaggetta del Gabbiano, Lido), cale (di tramontana, delle Case della Tramontana, di San Giacomo, caletta della fiumara), scogli (Punta Scogli, collo nord, sotto il Monte, lungomare nord, periferia est), falesie (costa alta di tramontana, sotto il Monte), porti.
- Fondale: piano davanti alle spiagge, medio sotto gli scogli, subito fondo sotto la falesia; bacini dei porti dragati a 4,5 m.
- Faraglioni e scogli affioranti, posti di pesca (`pesca_*`, `scogli_*`, `lanterna`), posti per il bagno (`bagno_*`).
- Movimenti fissi: **due pescherecci escono all'alba e tornano a metà giornata**; la **motovedetta fa il giro dell'isola**; la nave dell'Impero arriva al porto cargo.

### 3.4 Sotto terra
- **Fogne** sotto le strade grandi della città, con 52 tombini ogni ~30 m.
- **Posti di sotto**: Cripta di San Rocco, Cripta dei marinai (Santuario), Vecchie carceri (sotto la caserma, si sale in caserma), Rifugio antiaereo (sotto la Piazza del Governo, si sale nel Palazzo), Bunker della guerra (Collina Nera, botola nel bosco), Deposito dei contrabbandieri (sotto il Magazzino Neri, grata sulla calata), Spaccio sotto il Flipper, Mercato di sotto (sotto la piazza), Città dei Topi (cisterna sotto i giardini). Tutti collegati alle fogne.
- **Gente di sotto**: 13 persone, tra cui Tonino «Bavaglio» (contrabbando: sigarette americane, jeans, cassette, vodka, riviste proibite) e Gerri; quattro banchi (contrabbando, spaccio, ricettatore, Topi).
- **Metropolitana**: da Periferia Sud a Periferia Nord, circa 293 m, due gallerie a mezza elica (a metà una sopra l'altra, a −16,6 e −24,7 m), due treni che fanno la spola.
- **Grotte naturali**: Grotta del Romito (dal fondo della Gola del Lupo a un pozzo sul ciglio, col toro inciso) ed Eremo del Romito (dalla cengia all'altopiano).
- **Roba sepolta**: la cassa del brigante sotto il Paese Vecchio, la roba della guerra sotto i ruderi, più altri due punti.
- **Sotto terra nessuno ti vede.**

### 3.5 Le altre isole
Oggi **c'è una sola isola giocabile**. Fuori dalla mappa esistono il **continente dell'Impero** (da dove arriva la nave e dove va il tributo) e la costa di fronte. In mare ci sono solo faraglioni e scogli affioranti.

Se ti chiedono di progettare **isole nuove** (isolotti, un'isola carcere, un'isola dell'Impero, uno scoglio col faro), sono tutte **[NUOVO]** e **[MOTORE]**. Per ognuna consegna:
1. **Posizione** rispetto all'isola (direzione e distanza in metri) e **come ci si arriva**: le barche ci sono già (gozzo, lancia, motoscafo, con la stessa fisica delle auto e lo scarroccio); il nuoto è lento (1,8 m/s, 2,7 di corsa), senza armi e senza pesi.
2. **Ruolo nel mondo**: chi la controlla, perché esiste, cosa produce o nasconde, come entra nell'economia (la nave, il contrabbando, il tributo).
3. **Forma e ambienti**, con gli stessi ambienti già usati (falesia, macchia, pineta, scogli, ruderale) o nuovi motivati.
4. **Luoghi con id proposti** in minuscolo con il trattino basso (`isola_carcere_molo`), come quelli del capitolo 12.
5. **Una moodboard dell'isola** nel formato del capitolo 7.
6. **Almeno tre missioni** che la collegano all'isola principale.

---

## 4. Le fazioni

### 4.1 La Tutela (il regime)
- **Guardia Insulare, «i Grigi»**: presidiano le strade. Comandante il **Colonnello Ruggero Vasco** (`vasco`): ha requisito l'Hotel Miramare come comando; brutale ma prevedibile. Agenti del cast: **Carla Russo** (`carla`, crede nell'ordine) e **Ferri** (`ferri`, stanco, corruttibile). Base: Caserma della Guardia (`commissariato`), con turni, piantone e centrale. Tre Alfette in pattuglia, campagnole, posti di blocco con le transenne, ronde a piedi (di notte col coprifuoco).
- **Ufficio Rettifiche**: polizia politica in borghese. Capo: **Commissaria Ines Pardo** (`pardo`): gentile, colta, gioca a scacchi, non vuole ucciderti ma convincerti che hai torto. Lavora in biblioteca, dorme al Flamingo. Brucia i libri proibiti.
- **Gli Orecchi**: la rete di informatori. Capo: **la Zia** (`zia`), vedova sempre seduta al Bar Sirena, ti chiama «figlio mio». **Marta Sala** (`marta`) parla con lei.
- **Guardie del Garante** al Palazzo del Governo; **soldati della Base** con i cani al varco, alla Rocca, al porto cargo, all'eliporto e al poligono.
- **Documenti**: carta d'identità, tessera annonaria, lasciapassare per la zona della Base. Controlli, multe, perquisizioni, fermi.
- **Telecamere** sui lampioni (piazza, calata, lungomare, passeggiata, vico, salita, caruggio): accecarle con un sasso abbassa la Repressione nella zona.

### 4.2 La Risacca (la resistenza, il giocatore)
- **Al massimo 15 membri**; ognuno può avere **fino a 3 collaboratori** (mani, soldi, occhi) che conoscono solo lui. **Cellule autonome** (al massimo 5) nascono da sole e agiscono di notte. Compartimenti stagni: chi parla in cella fa cadere solo i suoi.
- **Morale** (0-100): sale con scritte, volantini, trasmissioni e sabotaggi senza vittime. **Repressione** (livelli 0-5): sale quando qualcuno vede e parla; **dal livello 3 cominciano le perquisizioni**, **dal 4 il coprifuoco anticipato alle 22** («Ora Quieta»).
- **Obiettivi della campagna**: onde scritte, trasmissioni di Radio Scirocco, il ripetitore della Collina Nera spento.
- **Basi**: spazi nascosti da trovare, scassinare e occupare (capitolo 6.6), o costruiti su lotti; moduli (deposito, dormitorio, stamperia, radio, falsari, officina, infermeria, armeria); barricate e mobili.

### 4.3 La Famiglia (la malavita organizzata)
- **Il capo «Senza nome»** (`capo`): chiuso in una casa qualsiasi della periferia est, non esce mai. Lo vedono solo i fidati, **di notte alle 23**, quando portano i conti: **seguendo un fidato si trova la base**.
- **Tre fidati**: **Sandro Neri** (`sandro`, ricettatore, ex «Squalo», fa affari con tutti), **Rocco «Mani di pietra»** (`rocco`), **Tano Scarpa** (`tano`). Sotto di loro 12 soldati: spacciatori, esattori, ricattatori, ricettatori. Massimo 20 uomini.
- **Riciclaggio**: la Sala giochi Flipper e la **Lavanderia Stella** (ПРАЧЕЧНАЯ 세탁) sono coperture. Il cassiere passa dalla lavanderia **alle 10** e dalla sala giochi **alle 11**. La paga e le **mazzette ai Grigi** (prima di tutti Ferri) si fanno nella notte tra venerdì e sabato.
- **Tatuaggi** leggibili: rango, anni di galera, mestiere, tradimento. Chi parla viene cacciato con una croce rovesciata.

### 4.4 I Marsigliesi
Contrabbandieri francesi, solo di notte, al **Pontile Est**: **Marcel Fabre** (`marcel`, Skorpion), **Jean-Luc Bonnet** (`jeanluc`, pistola), **Didier Roux** (`didier`, Skorpion). Dormono al Miramare. Sparano per primi. Si portano dietro una valigetta di soldi.

### 4.5 I briganti
**Salvatore «Malanotte» Cuccu** (`malanotte`): capobanda dei briganti dell'interno, latitante dal '79, lupara, gira di notte tra la Radura del pastore e l'ovile. Odia la Tutela, ma odia anche chi gli dà ordini. Mai collette, mai propaganda, mai lavoro.

### 4.6 I beduini
Pastori nomadi del **Tavolato**, metodici. Niente case: tende basse color erba secca. Commerciano tè, spezie, sale, lana, pelle, fichi secchi, miele, acqua, tende, coltelli, bussole, binocoli, mappe, carne, formaggio.

### 4.7 La gente comune
Bottegai, pescatori, scaricatori, taglialegna, carbonai, salinai, operai delle stazioni, pensionati, studenti. Si organizzano da soli: legna in pineta, collette, tutti alla Rocca per un fermato, ronde nei quartieri coi furti, pesca all'alba. Rubano, si vendicano, infamano, proteggono.

---

## 5. Il cast con cui scrivere

Gli id servono per le missioni. Gli orari sono `[ora, luogo]`: da quell'ora la persona va in quel luogo.

| id | Chi | Nome di battaglia | Dove e quando | Voce | Missione attuale |
|---|---|---|---|---|---|
| `lupo` | Ettore Ganz, 70 anni, bibliotecario, non firmò nel '79 | Lupo | casa `stella`; `biblioteca` 8-13 e 15-20; `piazza` 13; `osteria` 20 | lento, colto, ironico, cita libri | Salva i libri dal rogo |
| `beppe` | Dorino Carli, meccanico; ripara le campagnole dei Grigi e le odia | Candela | `officina` dalle 7; `osteria` 20 | sbrigativo, dialettale, frasi corte | Sabota una campagnola |
| `lucia` | Dott.ssa Bonaria Fadda, cura i feriti senza registrarli | Garza | `ambulatorio` dalle 7 | calma, precisa, stanca | Medicine dal magazzino |
| `pietro` | Suor Agata, nasconde i ricercati nella cripta di San Rocco | Madre | `chiesa` | dolce e ferma, proverbi | Viveri per la cripta |
| `vinile` | Rita Sanna, DJ della Discoteca Luna | Vinile | casa `gabbiano`; `spiaggia` 15; `sirena` 19; `disco` 21 | veloce, ironica, gergo da radio | Recupera il trasmettitore |
| `betamax` | Gigi Mura, Videoteca Stella; cassette proibite, una figlia di 16 anni, debiti | Betamax | casa `mare`; `video` 9-13 e 14-23 | mellifluo, battute da film | Contrabbando al pontile |
| `divisa` | Marlon Pinna, Grigio disertore, nascosto in pineta | Divisa | `pineta` | teso, militare, monosillabi | nessuna: **libero per te** |
| `cono` | Sasà Deiana, 19 anni, gelateria, va ovunque in Vespa | Cono | casa `mare`; `gelateria` 9; `lungomare` 20; `piazzetta` 22 | entusiasta, sfrontato, slang | Consegna sotto il naso di Pardo |
| `malanotte` | capobanda dei briganti | Malanotte | `radura`, di notte | cupo, proverbi da pastore | nessuna: **libero per te** |
| `gino` | barista del Bar Da Gino, TV sempre sul Garante | — | `bar` 6-23 | cordiale, pettegolo, prudente | lavoro: ghiaccio per il bar |
| `wu` | Wu Lin, Alimentari, vende con la tessera annonaria | — | `wu` 7-21 | cortese, misurato | lavoro: casse dal molo |
| `marta` | Marta Sala, pensionata, informatrice | — | chiesa, piazza, `wu`, `bar` | chiacchierona | — |
| `tonino` | Tonino Esposito, scaricatore, rancoroso coi potenti | — | `calata` dalle 5; `osteria` 16 | rude, diretto | lavoro: scarico al pontile |
| `elena` | Elena Vitale, studentessa, legge i libri tolti | — | `biblioteca`, `piazza`, `flipper` 19 | idealista, veloce | — |
| `rosa` | Rosa Amato, fioraia; marito rettificato nell'81 | — | `fiori` dalle 7; `chiesa` 18 | malinconica, gentile | lavoro: fiori per la chiesa |
| `nico` | Nico Galli, fattorino, consegna anche per la Famiglia | — | `molo`, `wu`, `magazzino` 14, `flipper` 18 | svelto, opportunista | — |
| `sandro` | Sandro Neri, ricettatore, fidato della Famiglia | — | `magazzino` 10; `flipper` 17 | minaccioso, affarista | lavoro: portami un mezzo |
| `rocco`, `tano` | fidati della Famiglia | — | `magazzino`, `flipper`, `calata`, `lungomare` | — | — |
| `vasco` | Colonnello della Guardia Insulare | — | `miramare`; `piazza` 12; `lungomare` 19 | sprezzante, da ordine del giorno | antagonista |
| `pardo` | Commissaria dell'Ufficio Rettifiche | — | `biblioteca` 8; `osteria` 13; `piazza` 19; `flamingo` 21 | pacata, inquietante | antagonista |
| `zia` | capo degli Orecchi | — | `sirena`, sempre | affettuosa e velenosa | antagonista |
| `carla`, `ferri` | Grigi | — | `commissariato` | formale / cinico | — |
| `marcel`, `jeanluc`, `didier` | Marsigliesi | — | `pontile`, di notte | francese | — |

Reclutabili nella Risacca: `lupo`, `beppe`, `lucia`, `pietro`, `vinile`, `betamax`, `divisa`, `cono`, `malanotte`, `elena`, `tonino`, `rosa`, `nico`, `gino`.

Segreti già scritti: Betamax tradisce se la Tutela arresta sua figlia. Puoi aggiungerne altri, segnandoli **[NUOVO]**.

Oltre al cast ci sono circa 260 abitanti generati, ognuno con casa, mestiere e carattere. Una missione può chiedere «un abitante con queste caratteristiche» (un pescatore del Borgo, un operaio della Stazione Nord) invece di un nome.

---

## 6. Cosa sa fare il motore

Questa è la cassetta degli attrezzi. Una missione fatta solo con questi pezzi si implementa scrivendo dati, senza toccare il motore.

### 6.1 Formato delle missioni che esiste già
**Missioni della Risacca** (`risacca.js`, `CARDS[id].mission`): una per personaggio, si chiede col verbo `missione` in chat. Tre tipi:

```js
// porta un oggetto da A a B (night: solo di notte; vehicle: la consegna va fatta in Vespa)
{ title: 'Recupera il trasmettitore', ask: 'battuta con cui la chiede', pickup: 'commissariato', drop: 'disco', item: 'il trasmettitore di Rita', night: true }
// sabota un obiettivo (act: 'sabota'); gift dà risorse all'inizio
{ title: 'Sabota una campagnola', ask: '…', act: 'sabota', place: 'commissariato', gift: { attrezzi: 1 } }
// consegna risorse
{ title: 'Viveri per la cripta', ask: '…', give: { res: 'viveri', qty: 4 }, drop: 'chiesa' }
```
Alla fine: il personaggio si fida (`bond` +0,3), la sua ideologia sale, il Morale sale di 4. Prendere roba al `commissariato` o al `magazzino` genera un evento di rischio (furto di materiali).

**Lavoretti** (`game.js`, `JOBS`): `{ title, pickup, drop, pay, ask, item, vespa: true, crime: true }`. Chi ha sentito cose brutte sul giocatore rifiuta.

Questi formati sono semplici. Per missioni a più fasi usa il formato del capitolo 8 e indica quali fasi richiedono **[MOTORE]**.

### 6.2 Muoversi
- **A piedi**, punta e clicca o WASD; di corsa col doppio clic.
- **Mezzi**: Vespa, Ape, Fiat 500 (`cinquecento`), Ritmo, Giulia, RX-7, GT-R, Bursley, furgone, camion, fuoristrada; dei Grigi: campagnola, Alfetta, blindato. Le auto sono di qualcuno (`v.owner`): rubarle è un furto che si ricorda. Fisica con derapate, danni, sfondamento di muri e vetrine. Officina (di Dorino o del covo): motore, assetto, nitro, corazza.
- **Barche**: gozzo, lancia, motoscafo. Si sale col tasto F dal pontile. Vanno dove c'è almeno 45 cm d'acqua; contro il molo non sfondano.
- **Nuoto**: 1,8 m/s (2,7 di corsa); niente spari, niente pesi in braccio; si esce su sabbia, scogli e banchine. **Gli abitanti non entrano in acqua**: il mare è una via di fuga vera.
- **Metropolitana**, **fogne** (V su tombini, grate, scale), **scavo** (H scava, J giù, K su, V botole; pala per la terra, piccone per la roccia; Maiusc+H scava di filato; si può sbucare dentro una casa).
- **Tavolato e sentieri stretti**: solo a piedi.

### 6.3 Il tempo
| Quando | Cosa succede |
|---|---|
| Alba, lunedì e giovedì | Arriva la nave dell'Impero al porto cargo (se la Tutela la lascia sbarcare), scarico sotto scorta, camion verso il Supermercato del Popolo, coda fuori |
| Alba | Due pescherecci escono, tornano a metà giornata |
| Due mattine a settimana, 6-13 | Mercato in piazza: chi produce vende al banchetto |
| 10 e 11 | Il cassiere della Famiglia passa dalla lavanderia e dalla sala giochi |
| 17 | Le famiglie fanno la spesa |
| 20 | Il Garante parla da tutti gli schermi (tace se il ripetitore è rotto; al suo posto può andare Radio Scirocco) |
| 22 (Repressione ≥ 4) | Coprifuoco anticipato |
| 23 | I fidati portano i conti al capo della Famiglia |
| Notte | Marsigliesi al Pontile Est, ronde col coprifuoco, elicottero sopra la Base e la periferia est, scassi |
| Lunedì / venerdì | Affitto / paga di Nino |
| Notte tra venerdì e sabato | Paga della Famiglia e mazzette ai Grigi |
| 22:30-3:00, e 20-23 del secondo giorno | Precipitazioni (pioggia o neve) |

### 6.4 Testimoni, memoria, voci
- Ogni azione illegale ha una **gravità** e un **rumore** (raggio in cui si sente): vandalismo, scippo, aggressione, rapina, furto di Vespa o auto, investimento, corruzione, spari, ferimento, omicidio, esplosione, molotov; e per la Risacca: scritta, volantino, sabotaggio, furto di materiali, evasione, colletta, scasso, telecamera, murale, foto.
- **Chi vede ricorda** (al buio e da lontano non riconosce), **racconta agli amici** e le voci girano dentro i gruppi; chi ha la lingua lunga racconta di più. Le persone cambiano opinione sul giocatore e possono rifiutargli lavori, denunciarlo o diventare ostili.
- I verbi furtivi (`furtivo: true`) riducono i testimoni.

### 6.5 Verbi che i personaggi sanno eseguire
Per i membri della Risacca, in chat o con gli ordini: `lavora`, `colletta`, `scrivi_onda`, `volantina`, `sabota`, `trasmetti`, `libera`, `proteggi`, `recluta`, `occupa`, `costruisci`, `allestisci`, `missione`, `scassina`, `scasso` (di notte), `lancia` (telecamera), `fotografa`, `ricatta`, `convoca`, `scava`, `inchioda`, `dipingi`, `picchia`, `arreda`, `ripara`, `pesca`, `rovista`, `bisca`, `vendi_documenti`, `mangia`, `bevi`, `dormi`.

Per la **regia dell'IA** sugli abitanti vicini al giocatore: `vai`, `fai` (un'attività inventata in un posto vero: «ripara la rete»), `mangia`, `gesto`, `chiacchiera`, `sfotti`, `apprezza`, `offri`, `gioca`, `litiga`.

Gli abitanti da soli: **commissioni** (pisciare, mangiare, comprare, vendere al mercato, spacciare, sistemare casa, scrivere sui muri), **imprese** (legna, collette, tutti alla Rocca per un fermato, cene, ronde, pesca all'alba), **trame** (scasso con ricognizione, attrezzo, palo e alibi; agguato; infamia; tradimento; protesta coi sassi).

### 6.6 Le azioni del giocatore sul posto
Vicino al punto giusto compaiono: guarda meglio una porta murata, scassina il lucchetto, occupa, rovista, apri la base, deposita, curati, costruisci su un lotto, lavora al cantiere, compra, **sabota**, inchioda assi, arreda, mangia, bevi, **scassina un negozio di notte** (22-6), **tira un sasso alla telecamera**, **fotografa** un Grigio o un antagonista, scava una buca nascosta, **dipingi un murale**, **scrivi l'onda**, **lascia volantini**, abbatti un albero (ascia).

**Obiettivi di sabotaggio** (`TARGETS`): il ripetitore della Tutela (`vetta`), una campagnola dei Grigi (`commissariato`), il proiettore dei cinegiornali (`cinema`), l'archivio dell'Ufficio Rettifiche (`biblioteca`), la cisterna di carburante della Guardia (`benzina`).

**Spazi nascosti** (`SPACES`): Cantina di Vico dei Lanternini, Appartamento sfitto di Vico del Campo, Retrobottega chiuso della piazza (lucchetto), Soffitta sopra il Banco dei fiori, Garage murato dietro l'officina, Magazzino del pesce abbandonato (lucchetto), Cantina sotto il Cinema Astor, Pensione chiusa per lutto (lucchetto), Casa del guardiano del faro, Soffitta del Belvedere, Vecchia cisterna del santuario, Casa del notaio sigillata (lucchetto), Magazzino del caruggio, Laboratorio del ceramista, Cantina dei Giardini, Masseria abbandonata degli ulivi, Casale dei vigneti, Canonica vuota di San Giacomo.

**Lotti per costruire** (`LOTS`): radura della pineta, giardini, Punta Scogli, scalo del cantiere, spiaggia dietro il Lido, vetta (solo antenna), Radura del pastore, riva del lago.

### 6.7 Risorse e negozi
Risorse della Risacca: viveri, carta, inchiostro, gesso, attrezzi, materiali, parti radio, medicine, documenti falsi, benzina, zucchero, merce, volantini, kit di sabotaggio, vernice, mobili, macchina fotografica, cellulare, foto compromettenti.

| Negozio (id) | Vende |
|---|---|
| `wu` | viveri, gesso, zucchero, carta |
| `car_2` | viveri |
| `biblioteca` | carta, inchiostro |
| `officina` | attrezzi, vernice |
| `benzina` | benzina |
| `cantiere` | materiali, mobili |
| `magazzino` | materiali |
| `video` | parti radio, macchina fotografica, cellulare (compra merce) |
| `disco` | parti radio |
| `ambulatorio` | medicine |

Ci sono anche le botteghe dell'economia (panetterie, pescheria, ferramenta, tabacchi, farmacia, barbieri, sartoria, lavanderia, tipografia), il Supermercato del Popolo, il mercato in piazza, i banchi di sotto e il commercio dei beduini.

### 6.8 Armi e violenza
Pugni, Beretta 92, lupara, Skorpion, molotov, sassi (gli abitanti li tirano nelle proteste). Le esplosioni sfondano muri; le auto sfondano vetrine, muri e facciate. Una missione **non deve richiedere** di uccidere: può permetterlo, con le conseguenze (omicidio = gravità massima, Repressione, gente che ricorda).

### 6.9 Strumenti per vedere i luoghi
- `node src/mappa_luoghi.js` → `mappa_luoghi.html`: la mappa con tutti i luoghi per categoria.
- `node strumenti_inverno/pianta3d.js out.png "box=x0,y0,x1,y1&lab=id,id&top=1"`: vista d'insieme con le etichette.
- `node strumenti_inverno/shot_gioco.js cartella scene.json`: istantanee del gioco vero. Ogni scena è `{ "nome": "…", "luogo": "id", "ora": minuti_da_mezzanotte, "zoom": 1, "attesa": 3000 }`. **Per ogni moodboard proponi 2-4 scene così**: diventano le foto «com'è oggi» accanto ai riferimenti.

---

## 7. La moodboard

Ogni missione (e ogni isola nuova) ha la sua moodboard scritta. Formato:

```markdown
### Moodboard — <titolo>
**L'idea in una frase**: cosa deve sentire chi gioca (paura, tenerezza, vertigine, rabbia…).
**Ora e tempo**: ora del giorno, giorno della settimana, meteo, aria (nebbia, brina, vapore, fumo).
**Palette** (5-7 colori con il ruolo):
- `#xxxxxx` base (il colore che occupa più schermo)
- `#xxxxxx` ombra
- `#xxxxxx` luce principale (e la sua sorgente: sodio, incandescenza, bianco regime, fuoco, luna)
- `#xxxxxx` accento (UNO, dove deve cadere l'occhio)
- `#xxxxxx` segnale del regime o della Risacca, se c'è
**Luce**: sorgenti, direzione, dove sono le ombre, cosa resta al buio.
**Materiali e superfici**: cosa si tocca (lamiera, intonaco bagnato, ghiaia, assi del pontile…).
**Composizione**: 3 inquadrature dalla camera del gioco (vista a tre quarti da sud-est); il punto focale di ognuna e cosa lo incornicia.
**Oggetti di scena**: cosa c'è nel posto (usa la libreria del capitolo 2 e gli arredi esistenti) e cosa va aggiunto **[NUOVO]**.
**Figure**: chi c'è, come si veste, che posa ha.
**Suono**: ambiente, voci, il suono che annuncia il pericolo.
**Riferimenti**: 3-6 riferimenti di film, fotografia, pittura o giochi, con una riga su cosa prendere da ognuno.
**Prompt per immagini** (in inglese, 2-3): per un generatore di immagini, con stile coerente:
  "isometric pixel art, 1986 retro-futurist authoritarian island, winter, …"
**Scene dal gioco**: 2-4 righe di scene.json per shot_gioco.js.
**Da evitare**: 3 cose che rovinerebbero il tono.
```

Riferimenti già usati da Andrea, da cui partire: la scena cyberpunk verde-nebbia col serbatoio-insegna giallo, i cavi e il neon arancio; i diorami di case giapponesi e coreane; la casetta verde di legno; il Quarticciolo di Roma; le chruščëvke sovietiche; il Palazzo della Cultura di Pripyat; il prato di Mutant Year Zero; Vice City per la notte sul lungomare. Altri riferimenti coerenti, a scelta: *Stalker* (zone abbandonate, acqua, attesa), *Brazil* (burocrazia grottesca), *1984* di Radford (colori bruciati), *Le vite degli altri* (l'ascolto), *I figli degli uomini* (camera a mano nel caos), la fotografia di Josef Koudelka e di Luigi Ghirri (la luce italiana spenta), i poster sovietici.

---

## 8. Il formato della scheda missione

Consegna ogni missione così. Le parti tra `< >` si riempiono; i campi che il motore non conosce vanno marcati **[MOTORE]**.

~~~markdown
## <Titolo>
**Chi la dà**: <id del cast o «un abitante: …»> · **Fazione**: Risacca / Famiglia / lavoro / altro
**Dove**: regioni e id dei luoghi toccati · **Quando**: ora, giorno, finestra di tempo
**Requisiti**: fiducia, oggetti, Repressione massima, missioni prima
**Premessa** (3-5 righe): perché esiste questa missione, cosa c'è in gioco per chi la dà.
**La richiesta** (la battuta del personaggio, nella sua voce).

### Fasi
1. <verbo + luogo id + condizione> — cosa vede il giocatore, cosa può andare storto.
2. …
(ogni fase con: obiettivo, id, ora, testimoni probabili, alternativa)

### Strade alternative
- A: … (es. via mare dal Borgo dei pescatori)
- B: … (es. dalle fogne con un tombino)
- C: … (es. con la parola: convincere Ferri, che è corruttibile)

### Se va male
Cosa succede nel mondo: chi ricorda, quale voce gira, Repressione, chi viene arrestato, la missione che diventa un'altra.

### Se va bene
Ricompense (soldi, risorse, fiducia, spazi rivelati, reclute), conseguenze visibili (un murale, schermi neri alle 20, una coda al Supermercato).

### Il mondo che reagisce
Cosa fanno da soli gli abitanti nei giorni dopo (voci, imprese, trame, proteste).

### Dati
```js
// formato esistente (se basta)
{ title: '…', ask: '…', pickup: '<id>', drop: '<id>', item: '…', night: true }
// formato esteso a fasi [MOTORE se usa fasi non supportate]
{ id: '…', giver: '<id>', fasi: [
  { k: 'vai', place: '<id>', ora: [22, 4] },
  { k: 'prendi', place: '<id>', item: '…' },
  { k: 'porta', place: '<id>', vehicle: 'barca' },
] }
```

### Moodboard
(formato del capitolo 7)
~~~

Quanto costa ogni fase:
- **Già controllata dal sistema delle missioni** (solo dati): prendere un oggetto in un luogo, consegnarlo (anche solo di notte o in Vespa), sabotare uno dei `TARGETS`, consegnare risorse.
- **L'azione esiste nel gioco, manca solo il controllo della missione** (**[MOTORE]**, lavoro piccolo): andare in un luogo, comprare in un negozio, scassinare, occupare, scrivere l'onda, volantinare, dipingere, accecare una telecamera, fotografare, scavare, pescare, viaggiare in barca, a nuoto, in metro o nelle fogne.
- **Da costruire** (**[MOTORE]**, lavoro grosso): seguire un personaggio, scorte, timer, dialoghi a scelta multipla scritti a mano, travestimenti, nuovi `TARGETS`, nuovi luoghi.

---

## 9. Esempio completo

### Missione: Le lettere del faro
**Chi la dà**: `divisa` (Marlon «Divisa» Pinna) · **Fazione**: Risacca
**Dove**: Collina dei Pini, Costiera Sud, Borgo dei pescatori, Punta Scogli, Canalone di ponente, Campo partigiano (`pineta`, `pescatori_s`, `faro`, `punta`, `canalone_o`, `campo_p`) · **Quando**: di notte
**Requisiti**: aver parlato con Divisa almeno una volta; **[MOTORE]** Repressione sotto 4 (oltre, il coprifuoco blocca la costiera)

**Premessa.** Nel '79 i partigiani che non firmarono lasciarono una radio da campo e un registro di nomi nella casa del guardiano del faro. Divisa l'ha saputo da un vecchio Grigio prima di disertare. La Tutela non sa dove sia il registro, ma la motovedetta passa sotto il faro ogni notte. Se la Risacca rimette in piedi il Campo partigiano sul Tavolato, ha una base che nessuno raggiunge in macchina.

**La richiesta.** «La radio del '79. Casa del faro. Di notte. Non per la costiera: posto di blocco. In barca dal Borgo. Portala al campo. Da solo.»

#### Fasi
1. **Vai al Borgo dei pescatori** (`pescatori_s`) dopo le 22. Un gozzo è ormeggiato al pontile. Testimoni probabili: un pescatore che ripara le reti.
2. **In barca fino a Punta Scogli** (`punta`), lungo la Spiaggia Lunga e attorno alla testa di bosco: più di mezzo chilometro di mare. La motovedetta fa il giro dell'isola: se ti incrocia, spegni il motore e lasciati scarrocciare verso gli scogli. **[MOTORE]**: luci della barca spente e cono di ricerca della motovedetta.
3. **Prendi la radio alla casa del faro** (`faro`). Fase `pickup` esistente, `night: true`. **[MOTORE]**: la casa è lo spazio nascosto `sp_faro`, che così si rivela.
4. **Porta la radio al Campo partigiano** (`campo_p`), a piedi: la radio pesa, quindi niente nuoto e niente corsa. Si passa dal Canalone di ponente (`canalone_o`), solo a piedi, ghiaione al buio.
5. **(Facoltativa) Accendi la radio al campo**: Radio Scirocco trasmette dal Tavolato. **[MOTORE]**: il modulo radio in un campo costruito.

#### Strade alternative
- **A, la costiera**: in auto lungo la Costiera Sud fino alla Pista della Punta. Più veloce, ma la Tutela mette posti di blocco sulle costiere; con documenti falsi si passa.
- **B, i beduini**: salire al Tavolato dal Canalone di levante e scambiare tè o sale coi beduini perché uno di loro vada al faro al posto tuo. **[MOTORE]**: incarico a un non membro.
- **C, l'attesa**: lasciare la radio nascosta in una buca alla Punta (scava, 2 ore) e tornare la notte dopo.

#### Se va male
Se la motovedetta ti vede, la Repressione sale e **[MOTORE]** il giorno dopo la Guardia sigilla la casa del faro (lo spazio torna chiuso col lucchetto). Se ti fermano con la radio, la voce «Nino portava una radio» gira fra i pescatori del Borgo; un pescatore con poco coraggio lo racconta alla Zia. Divisa smette di fidarsi: per una settimana risponde solo a monosillabi.

#### Se va bene
Divisa si fida di te (fiducia +0,3, Morale +4) e, se glielo chiedi, entra nella Risacca. Il Campo partigiano diventa occupabile come base: invisibile da strada, raggiungibile solo a piedi. **[MOTORE]** Il registro dei nomi rivela due spazi nascosti (`sp_masseria`, `sp_casale`) e il nome di un Grigio comprato.

#### Il mondo che reagisce
I pescatori del Borgo parlano della «barca senza luci». Se la radio trasmette, la sera dopo alle 20 in qualche bar della periferia ovest qualcuno abbassa il volume del Garante.

#### Dati
```js
// formato esistente
divisa: { …, mission: { title: 'Le lettere del faro', ask: 'La radio del \'79. Casa del faro. Di notte. Non per la costiera: posto di blocco. In barca dal Borgo. Portala al campo. Da solo.', pickup: 'faro', drop: 'campo_p', item: 'la radio da campo del \'79', night: true } }
```

#### Moodboard — Le lettere del faro
**L'idea in una frase**: vertigine e solitudine; il mare nero come unica via sicura.
**Ora e tempo**: tra mezzanotte e le 3, vento di ponente, mare mosso; nebbiolina bassa sulla Spiaggia Lunga, cielo senza luna.
**Palette**:
- `#0e1418` base: mare e cielo quasi neri, appena verdi
- `#1f2a2c` ombra: pini piegati dal vento, scogli
- `#e8742c` luce principale: la torre di lamiera arancione del faro sotto il suo fascio
- `#f4ead0` fascio del faro che spazza la nebbia, ogni pochi secondi
- `#b84a3c` accento: la lucina rossa della motovedetta al largo
- `#9aa59c` schiuma sulla riva e brina sulle assi del pontile
**Luce**: fuori città non ci sono lampioni: il buio è vero. L'unica luce fissa è la lampada del pontile del Borgo. Il fascio del faro taglia la nebbia e proietta per un attimo l'ombra dei pini sulla sabbia. La motovedetta ha un cono di ricerca bianco duro.
**Materiali**: assi bagnate del pontile con l'alga, scafo del gozzo con l'antivegetativa rossa, sabbia fradicia, scogli lucidi, lamiera ruggine della torre, ghiaione del canalone.
**Composizione**:
1. Il pontile del Borgo dall'alto: il gozzo in primo piano, la lampada del pontile, il buio del mare dietro.
2. La Punta dal mare: la torre arancione al centro, i pini piegati che la incorniciano, il fascio verso la camera.
3. Il canalone: una figura piccola sul ghiaione, la parete del Tavolato che occupa metà schermo, il fascio del faro lontano.
**Oggetti di scena**: reti appese, barche tirate in secca, cassetta del pesce rovesciata, la casa del guardiano con la porta murata a metà, una radio militare in cassa di legno con il simbolo dell'onda inciso **[NUOVO]**, ometti di pietra lungo la traccia del canalone.
**Figure**: Nino col berretto di lana e il pastrano; Divisa (giacca grigia senza mostrine, cinturone) solo all'inizio, in pineta; un vecchio pescatore che fuma sul pontile.
**Suono**: risacca, vento, il cigolio delle cime, il motore del gozzo; quello della motovedetta come segnale di pericolo; al campo, un fruscio di radio.
**Riferimenti**: *Stalker* (l'attesa e l'acqua nera); *I figli degli uomini* (la fuga in barca); le foto notturne dei fari bretoni di Jean Guichard (il fascio nella tempesta); *Mutant Year Zero* (silenzio e ombre fuori città).
**Prompt per immagini**:
- "isometric pixel art, night, small orange corrugated-metal lighthouse on a steel lattice, wind-bent pines, black sea with faint green tint, low fog lit by the rotating beam, 1986 retro-futurist authoritarian island, winter, cold palette, single warm accent"
- "isometric pixel art, wooden fishing pier at night, one bare bulb, small rowing boat with red antifouling, fisherman smoking, nets, distant patrol boat searchlight, desaturated, cinematic"
**Scene dal gioco**:
```json
[{ "nome": "borgo_notte", "luogo": "pescatori_s", "ora": 60, "zoom": 1, "attesa": 3000 },
 { "nome": "faro_notte", "luogo": "faro", "ora": 90, "zoom": 1.2, "attesa": 3000 },
 { "nome": "canalone", "luogo": "canalone_o", "ora": 120, "zoom": 1, "attesa": 3000 }]
```
**Da evitare**: luna piena e cielo stellato da cartolina; azzurri saturi nel mare; musica eroica.

---

## 10. Missioni che esistono già (non duplicarle)

| Titolo | Chi | Tipo | Luoghi |
|---|---|---|---|
| Salva i libri dal rogo | `lupo` | porta | `biblioteca` → `chiesa` |
| Sabota una campagnola | `beppe` | sabota | `commissariato` |
| Medicine dal magazzino | `lucia` | porta | `magazzino` → `ambulatorio` |
| Viveri per la cripta | `pietro` | risorse | 4 viveri → `chiesa` |
| Recupera il trasmettitore | `vinile` | porta, di notte | `commissariato` → `disco` |
| Contrabbando al pontile | `betamax` | porta, di notte | `pontile` → `video` |
| Consegna sotto il naso di Pardo | `cono` | porta, in Vespa | `gelateria` → `flamingo` |
| Casse dal molo | `wu` | lavoro | `molo` → `wu` |
| Ghiaccio per il bar | `gino` | lavoro | `calata` → `bar` |
| Fiori per la chiesa | `rosa` | lavoro | `fiori` → `chiesa` |
| Medicine per la signora Marta | `lucia` | lavoro | `ambulatorio` → `stella` |
| Scarico al pontile | `tonino` | lavoro | `pontile` → `osteria` |
| Consegna in Vespa | `beppe` | lavoro | `officina` → `miramare` |
| Portami un mezzo | `sandro` | lavoro, crimine | qualsiasi mezzo → `magazzino` |

Quasi tutto si svolge in centro. **Le missioni nuove devono portare il giocatore nel resto dell'isola**: testa di bosco, Tavolato, collo di foresta, Monte Scuro, quartiere del governo, Collina Nera, oltre il Muro, il mare, il sottosuolo.

---

## 11. Controllo finale prima di consegnare

- [ ] Ogni id esiste nel capitolo 12 (o è marcato **[NUOVO]**).
- [ ] Il nome che usi è quello del gioco: `monte` è la **Collina Nera**, non il Monte Scuro; `vetta` è la cima della Collina Nera col ripetitore; `deserto` è la Prateria del Tavolato; `sugheri` è la Valle delle betulle; `macchia` è la Pineta dell'altopiano; `lungomare` è Via al Mare; `spiaggia` è la Spiaggia gelata del Lido; `pineta` è la Pineta della Collina dei Pini; la strada `porto` si chiama Viale della Tutela.
- [ ] Orari coerenti col capitolo 6.3 e con gli orari dei personaggi.
- [ ] Almeno due strade per riuscire, un fallimento con conseguenze, il mondo che reagisce.
- [ ] Le parti nuove sono marcate **[MOTORE]** o **[NUOVO]**.
- [ ] La moodboard rispetta il capitolo 2: un solo accento, luci per tipo di luogo, niente azzurri saturi, niente palme.
- [ ] Le battute sono nella voce del personaggio.
- [ ] La missione sposta il giocatore su più regioni.

---

## 12. Stradario: tutti i luoghi con id

### 12.0 Come leggerlo e rigenerarlo
Coordinate in metri (x verso est, y verso sud); il luogo è il punto dove si arriva. «da scoprire» = la prima visita mostra «Hai scoperto»; «nascosto» = non compare finché non lo si trova; «arredo» = come lo arreda la grafica; «pesca» e «bagno» = posti dove si pesca e si fa il bagno. Gli edifici hanno il tipo e l'insegna.

Per rigenerare l'elenco dopo un cambio di mappa: carica `world.js`, `interiors.js` e `game.js` in Node (come fa `src/mappa_luoghi.js`) e stampa `Game.PLACES` (id, nome, x, y e i campi `scoperta`, `hidden`, `camp`, `pesca`, `bagno`) e `Game.BUILDINGS` (uso, insegna).

Gli edifici con nome che non sono luoghi a sé hanno id del tipo `casa_NN`: compaiono qui sotto col loro uso (panetteria, ufficio, fabbrica…).

#### Testa di bosco e Tavolato (x 0–366 m)

| id | Nome | x, y | Note |
|---|---|---|---|
| `punta` | Punta Scogli | 39, 223 |  |
| `faro` | Faro di Punta Scogli | 41, 209 |  |
| `scogli_1` | Scogli della Punta | 51, 145 | pesca |
| `scogli_8` | Scogli della Punta II | 51, 283 | pesca |
| `canalone_o` | Canalone di ponente | 85, 153 | da scoprire |
| `campo_p` | Campo partigiano | 99, 129 | arredo: bivacco, nascosto |
| `saline` | Saline | 101, 315 |  |
| `salinaio` | Casa del salinaio | 117, 297 |  |
| `bagno_0` | Spiaggia Lunga | 141, 367 | bagno |
| `beduini` | Accampamento dei beduini | 149, 177 | arredo: beduini |
| `pescatori_t` | Capanni della Punta | 151, 357 |  |
| `pesca_pontile_pescatori_t` | In fondo al Pontile dei Capanni | 155, 391 | pesca |
| `tavolato` | Il Tavolato | 173, 187 | da scoprire |
| `deserto` | Prateria del Tavolato | 179, 197 |  |
| `scogli_2` | Scogli di tramontana | 191, 49 | pesca |
| `miniera` | Stazione di estrazione Nord | 229, 83 |  |
| `stazione_n` | Stazione Nord: piazzale | 235, 77 |  |
| `canalone_e` | Canalone di levante | 255, 205 | da scoprire |
| `bagno_1` | Spiaggia Lunga | 261, 365 | bagno |
| `stazione_s` | Stazione Sud: piazzale | 263, 329 |  |
| `stazione2` | Stazione di estrazione Sud | 267, 319 |  |
| `bagno_4` | Cala di tramontana | 301, 93 | bagno |
| `bosco_antico` | Bosco Antico | 305, 137 | arredo: legna, da scoprire |
| `scogli_3` | Scogli di tramontana II | 331, 105 | pesca |
| `spiaggia_lunga` | Spiaggia Lunga | 331, 315 |  |

#### Collo di foresta e Spiaggia Lunga (x 366–678 m)

| id | Nome | x, y | Note |
|---|---|---|---|
| `bagno_2` | Spiaggia Lunga | 401, 283 | bagno |
| `memoria` | Via della Memoria | 421, 195 |  |
| `scogli_4` | Scogli di tramontana III | 471, 95 | pesca |
| `pescatori_s` | Borgo dei pescatori | 471, 267 |  |
| `pesca_pontile_pescatori_s` | In fondo al Pontile del Borgo | 473, 297 | pesca |
| `scogli_5` | Scogli di tramontana IV | 541, 75 | pesca |
| `bagno_3` | Spiaggia Lunga | 561, 263 | bagno |
| `bagno_5` | Cala delle Case della Tramontana | 567, 69 | bagno |
| `pescatori_n` | Case della Tramontana | 567, 89 |  |
| `pesca_pontile_pescatori_n` | In fondo al Pontile della Tramontana | 569, 49 | pesca |
| `scogli_6` | Scogli di tramontana V | 611, 55 | pesca |

#### Monte Scuro (x 678–790 m)

| id | Nome | x, y | Note |
|---|---|---|---|
| `scogli_7` | Scogli sotto il Monte | 681, 47 | pesca |
| `scogli_9` | Scogli della fiumara | 681, 253 | pesca |
| `eremo` | Eremo del Romito | 695, 161 | arredo: eremo, da scoprire, nascosto |
| `calanchi` | I Calanchi | 701, 83 | da scoprire |
| `ovile_b` | Ovile abbandonato | 709, 121 |  |
| `ovile` | Ovile abbandonato | 709, 125 |  |
| `radura` | Radura del pastore | 709, 143 |  |
| `masseria` | Masseria Sant'Elia | 713, 199 |  |
| `lago` | Lago gelato | 715, 139 |  |
| `villaggio` | Borgo dei Carbonai | 717, 191 |  |
| `altopiano` | Altopiano del Lago | 729, 129 | da scoprire |
| `chiesa_sg` | Chiesa di San Giacomo | 733, 93 |  |
| `macchia` | Pineta dell'altopiano | 733, 139 |  |
| `sugheri` | Valle delle betulle | 735, 169 |  |
| `sangiacomo` | San Giacomo | 737, 105 |  |
| `bagno_6` | Cala di San Giacomo | 739, 59 | bagno |
| `vigne` | Vigne di San Giacomo | 739, 83 |  |
| `osteria_sg` | Osteria di San Giacomo | 743, 107 | insegna ТРАКТИР |
| `casa_188` | Conservificio Sanna | 747, 69 | fabbrica, insegna КОНСЕРВЫ |
| `pozzo_o` | Spiazzo dei taglialegna | 747, 133 | arredo: legna |
| `sentiero` | Sentiero dei carbonai | 747, 157 |  |
| `caletta` | Caletta della fiumara | 747, 225 |  |
| `bagno_7` | Caletta della fiumara | 749, 225 | bagno |
| `ponte_diavolo` | Ponte del Diavolo | 751, 97 | da scoprire |
| `gola` | Gola del Lupo | 757, 79 | da scoprire |
| `fiumara` | Fiumara dei Carbonai | 757, 197 | arredo: fiumara, da scoprire |
| `romito` | Grotta del Romito | 767, 105 | da scoprire, nascosto |
| `cascata` | Cascata gelata | 767, 115 | arredo: cascata, da scoprire |
| `neviera` | La neviera | 773, 135 | arredo: neviera, da scoprire |
| `sorgente` | Sorgente gelata | 777, 157 | arredo: sorgente, da scoprire |
| `pizzo` | Pizzo del Monte Scuro | 781, 143 | arredo: croce, da scoprire |
| `cantina` | Cantina delle terrazze | 789, 191 |  |

#### Periferia ovest e Collina dei Pini (x 790–880 m)

| id | Nome | x, y | Note |
|---|---|---|---|
| `campeggio_o` | Spiazzo della collina | 795, 139 | arredo: tende |
| `oliveto` | Uliveto delle terrazze | 795, 187 |  |
| `dita` | Le Cinque Dita | 809, 181 | da scoprire |
| `gabbiano` | Pensione Gabbiano | 811, 195 | insegna ПАНСИОН |
| `passo` | Passo dei Pini | 813, 137 | da scoprire |
| `bagno_8` | Spiaggetta del Gabbiano | 815, 219 | bagno |
| `bivacco_o` | Bivacco dei Pini | 817, 133 | arredo: bivacco |
| `casa_8` | Teatro Odeon | 819, 67 | teatro, insegna ТЕАТР ОДЕОН |
| `casa_9` | Panetteria Lella | 825, 67 | panetteria, insegna ХЛЕБ 빵 |
| `vecchio_3` | La chiesa senza tetto | 827, 177 | arredo: rudere |
| `paese_vecchio` | Paese Vecchio | 831, 173 | arredo: rudere, da scoprire |
| `rudere_o` | Casale diroccato dei Pini | 833, 111 | arredo: rudere |
| `vecchio_2` | Case crollate del Paese Vecchio | 835, 169 | arredo: rudere |
| `collina_o` | Collina dei Pini | 837, 141 |  |
| `officina` | Officina di Dorino | 837, 177 | insegna МОТО 정비 |
| `pineta` | Pineta della Collina dei Pini | 853, 155 |  |
| `monolite` | Il Monolite | 855, 143 | arredo: monolite |
| `disco` | Discoteca Luna | 861, 83 | insegna ЛУНА 클럽 |
| `carbonaia` | Carbonaia | 869, 169 | arredo: carbonaia |
| `casa_103` | Mattonificio Piras | 869, 191 | fabbrica, insegna КИРПИЧ |
| `giardini` | Giardini di Ponente | 877, 141 |  |

#### Quartiere del governo (x 880–960 m)

| id | Nome | x, y | Note |
|---|---|---|---|
| `pietra` | La Pietra dell'Onda | 893, 119 | insegna ОПЕКА, governo |
| `casa_145` | Barbiere Gavino | 895, 107 | barbiere, insegna 이발 ЦИРЮЛЬНЯ |
| `archivio` | Archivio di Stato | 897, 151 | governo |
| `casa_89` | Barbiere Nello | 901, 169 | barbiere, insegna 이발 ЦИРЮЛЬНЯ |
| `casa_63` | Ufficio Mario | 909, 127 | ufficio, insegna КОНТОРА |
| `casa_114` | Circolo dei Lavoratori | 913, 101 | circolo, insegna КЛУБ |
| `casa_124` | Palestra Nello | 913, 161 | palestra, insegna СПОРТЗАЛ |
| `casa_125` | Farmacia Tina | 917, 169 | farmacia, insegna ✚ АПТЕКА 약국 |
| `piazza_gov` | Piazza del Governo | 919, 147 |  |
| `governo` | Palazzo del Governo | 921, 121 | insegna ДОМ ПРАВИТЕЛЬСТВА, governo |
| `casa_71` | Ferramenta Rosaria | 951, 127 | ferramenta, insegna ХОЗТОВАРЫ |
| `garante` | Uffici del Garante | 953, 157 | insegna ГАРАНТ 보호, governo |
| `cantiere` | Cantiere navale | 953, 173 | insegna ВЕРФЬ |
| `ministero` | Ministero dell'Ordine | 955, 109 | governo |
| `casa_171` | Tipografia Totò | 957, 161 | tipografia, insegna ТИПОГРАФИЯ |

#### Centro e porto vecchio (x 960–1075 m)

| id | Nome | x, y | Note |
|---|---|---|---|
| `casa_170` | Tabacchi Rosaria | 961, 147 | tabacchi, insegna ТАБАК |
| `benzina` | Distributore | 963, 93 | insegna БЕНЗИН |
| `scalo` | Scalo del cantiere | 967, 191 |  |
| `stella` | Condominio Stella | 971, 135 |  |
| `sirena` | Bar Sirena | 979, 173 | insegna 사이렌 БАР |
| `caruggio` | Caruggio dei Pescatori | 985, 153 |  |
| `chiesa` | Chiesa di San Rocco | 987, 123 |  |
| `pesca_pontile_ovest` | In fondo al Pontile dei gozzi | 991, 217 | pesca |
| `vico` | Vicolo dei Lanternini | 993, 117 |  |
| `bar` | Bar Da Gino | 1003, 133 | insegna БАР ДЖИНО |
| `osteria` | Osteria del Porto | 1003, 177 | insegna ТРАКТИР |
| `ambulatorio` | Ambulatorio | 1005, 89 | insegna ✚ АМБУЛАТОРИЯ |
| `molo` | Molo dei pescatori | 1005, 241 |  |
| `commissariato` | Caserma della Guardia | 1007, 161 | insegna ГВАРДИЯ |
| `piazza` | Piazza San Rocco | 1013, 117 |  |
| `marina` | Marina del porto vecchio | 1013, 197 |  |
| `pesca_pontile_centro` | In fondo al Pontile della Marina | 1013, 217 | pesca |
| `cinema` | Cinema Astor | 1017, 151 | insegna КИНО АСТОР |
| `calata` | Calata del porto | 1017, 187 |  |
| `wu` | Alimentari Wu | 1021, 141 | insegna 吳 식료품 |
| `casa_26` | Ufficio Tina | 1023, 77 | ufficio, insegna КОНТОРА |
| `fontana` | Fontana di San Rocco | 1025, 117 |  |
| `casa_141` | Lavanderia Pina | 1025, 165 | lavanderia, insegna ПРАЧЕЧНАЯ |
| `casa_59` | Panetteria Mario | 1027, 107 | panetteria, insegna ХЛЕБ 빵 |
| `casa_154` | Sartoria Rosaria | 1031, 165 | sartoria, insegna АТЕЛЬЕ |
| `fiori` | Banco dei fiori | 1033, 123 |  |
| `pontile` | Pontile Est | 1037, 215 |  |
| `pesca_pontile` | In fondo al Pontile Est | 1037, 217 | pesca |
| `biblioteca` | Biblioteca civica | 1041, 141 |  |
| `lanterna` | Lanterna del Molo Vecchio | 1041, 241 |  |
| `video` | Videoteca Stella | 1043, 97 | insegna ВИДЕО 2000 |
| `miramare` | Hotel Miramare | 1043, 173 | insegna МИРАМАРЕ |
| `pesca_molo_vecchio` | In punta al Molo Vecchio | 1043, 241 | pesca |
| `casa_45` | Ferramenta Totò | 1045, 89 | ferramenta, insegna ХОЗТОВАРЫ |
| `cultura` | Palazzo della Cultura | 1053, 111 | insegna ДВОРЕЦ КУЛЬТУРЫ |
| `aurora` | Condominio Aurora | 1053, 161 |  |
| `casa_143` | Tabacchi Efisio | 1055, 103 | tabacchi, insegna ТАБАК |
| `flipper` | Sala giochi Flipper | 1057, 139 | insegna 플리퍼 |
| `piazzetta` | Vico del Campo | 1059, 131 |  |
| `pesca_molo_levante` | In punta al Molo di Levante | 1065, 227 | pesca |
| `magazzino` | Magazzino Neri | 1067, 159 | insegna СКЛАД НЕРИ |
| `molo_levante` | Molo di Levante | 1069, 223 |  |

#### Periferia est, Lido e Collina Nera (x 1075–1161 m)

| id | Nome | x, y | Note |
|---|---|---|---|
| `lungomare` | Via al Mare | 1079, 185 |  |
| `mare` | Condominio Mare | 1081, 85 |  |
| `salita` | Salita della Collina Nera | 1083, 129 |  |
| `grotta` | La grotta | 1083, 151 | arredo: grotta, nascosto |
| `car_2` | Trattoria da Nina | 1091, 179 | insegna 식당 НИНА |
| `gelateria` | Gelateria Polo Nord | 1093, 169 | insegna МОРОЖЕНОЕ |
| `bivacco_e` | Bivacco della Collina Nera | 1099, 139 | arredo: bivacco |
| `passeggiata` | Passeggiata a mare | 1105, 195 |  |
| `oceano` | Hotel Oceano | 1109, 91 | insegna ОКЕАН |
| `osservatorio` | Vecchia vedetta | 1109, 109 | arredo: vedetta |
| `belvedere` | Belvedere | 1109, 119 |  |
| `bagno_9` | Spiaggia del Lido | 1113, 209 | bagno |
| `flamingo` | Hotel Flamingo | 1115, 185 | insegna ФЛАМИНГО |
| `monte` | Collina Nera | 1117, 133 |  |
| `casa_160` | Palestra Pina | 1123, 85 | palestra, insegna СПОРТЗАЛ |
| `paradiso` | Hotel Paradiso | 1123, 185 | insegna ПАРАДИЗО |
| `casa_164` | Scuola elementare | 1125, 91 | scuola, insegna ШКОЛА |
| `ruderi` | Ruderi della Collina Nera | 1125, 161 | arredo: rudere |
| `spiaggia` | Spiaggia gelata | 1125, 199 |  |
| `pesca_pontile_lido` | In fondo al Pontile del Lido | 1125, 227 | pesca |
| `vetta` | Cima della Collina Nera | 1131, 135 |  |
| `santuario` | Santuario del Mare | 1139, 85 |  |
| `bagno_10` | Spiaggia del Lido | 1139, 215 | bagno |
| `campeggio_e` | Spiazzo della Collina Nera | 1141, 129 | arredo: tende |
| `casotto` | Casotto della cava | 1143, 151 |  |
| `cava` | Cava della Collina Nera | 1143, 151 |  |
| `casa_30` | Ufficio Bruno | 1147, 73 | ufficio, insegna КОНТОРА |
| `chiosco` | Banja del Lido | 1155, 189 | insegna БАНЯ |
| `covo` | Il covo sulla Collina Nera | 1157, 141 | nascosto |
| `casa_31` | Pescheria Mario | 1159, 81 | pescheria, insegna РЫБА 생선 |

#### Oltre il Muro: la Base (x 1161–1240 m)

| id | Nome | x, y | Note |
|---|---|---|---|
| `muro` | Il Muro | 1161, 139 | varco |
| `discarica` | Discarica di levante | 1161, 185 |  |
| `scogli_10` | Scogli del Lido | 1171, 211 | pesca |
| `varco` | Varco del Muro | 1175, 139 |  |
| `deposito_n` | Magazzino del porto cargo | 1197, 147 | militare |
| `poligono` | Poligono della Base | 1201, 167 |  |
| `caserma_p` | Caserma della Tutela | 1203, 105 | militare |
| `pesca_molo_cargo_n1` | In punta al Molo cargo nord | 1219, 73 | pesca |
| `rocca` | Rocca della Tutela | 1225, 115 | insegna ОПЕКА 보호, militare |
| `deposito_s` | Dogana del porto cargo | 1227, 151 | militare |
| `pesca_molo_cargo_s1` | In punta al Molo militare | 1227, 217 | pesca |

#### Porto cargo e militare (x 1240–1300 m)

| id | Nome | x, y | Note |
|---|---|---|---|
| `pesca_molo_cargo_n2` | In punta al Molo dell'Impero | 1245, 75 | pesca |
| `eliporto` | Eliporto della Base | 1245, 135 |  |
| `hangar1` | Hangar degli elicotteri | 1251, 175 | militare |
| `pesca_molo_cargo_s2` | In punta al Molo dei rimorchiatori | 1253, 219 | pesca |
| `hangar2` | Deposito della Base | 1265, 119 | militare |
| `molo_cargo` | Porto cargo | 1277, 141 |  |

