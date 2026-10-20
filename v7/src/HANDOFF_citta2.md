# Città nuova — riferimenti e regole di progetto

La città nuova è in prova: `world_cittanuova.js`, nel gioco con `?cittanuova`, pianta dall'alto con
`PV_CITTANUOVA=1 node strumenti/pianta.js uscita.png x0 y0 x1 y1 scala` (da `v7/`).
La build normale resta con la mappa vecchia (`world.js`).

## Il primo tentativo e perché non funzionava
- I bastioni puntavano verso la città, come vuole la regola, ma erano incollati alle case: mancavano la
  **spianata** (il campo di tiro vuoto fra fortezza e città), il **fossato**, le **mura a mare**, e dentro c'era un prato
  con palazzine sparse. Visti in 3D erano cunei di pietra in mezzo al borgo, senza senso.
- Le strade a ventaglio e le case girate lungo la via funzionano: si tengono.

## Riferimenti

### Fortezze sul porto (il modello della Rocca)
- **Fort St Elmo, La Valletta** — forte stellato sulla punta della penisola fra due porti: due mezzi bastioni, fianchi e
  facce, piazza d'armi, caserme, cavaliere; isolato da un **fossato**; davanti al fronte di terra una **spianata
  livellata senza costruzioni** che fa da spalto (glacis). Le caserme guardano la piazza lungo le cortine.
  [Fortifications of Valletta](https://en.wikipedia.org/wiki/Fortifications_of_Valletta) ·
  [Fort Saint Elmo (Structurae)](https://structurae.net/en/structures/fort-saint-elmo) ·
  [Lower Fort St Elmo (Univ. Malta)](https://um.edu.mt/library/oar/bitstream/123456789/126701/1/Lower%20Fort%20St%20Elmo%20and%20The%20Mortar%20Shells%20Fountain.pdf)
- **Real Cittadella, Messina** — pentagono a cinque bastioni sulla penisola a falce del porto, costruito dagli spagnoli
  (1680-86) per difendere il porto **e tenere sotto controllo la città** dopo la rivolta del 1674: è esattamente la
  Rocca del Garante. [Real Cittadella](https://en.wikipedia.org/wiki/Real_Cittadella) ·
  [FAI](https://fondoambiente.it/luoghi/real-cittadella-di-messina-fortezza-spagnola)
- **Porto Ercole, Forte Filippo** (Stato dei Presidi) — quadrilatero con grandi bastioni d'angolo e fossato profondo,
  sulla collina sopra il porto. [Museo Galileo](https://brunelleschi.imss.fi.it/itineraries/place/DefensiveSystemOfPortoErcole.html) ·
  [Forte Filippo](https://castellitoscani.com/en/forte-filippo-fortress/)
- **Portoferraio, Forte Stella e Linguella** — sistema mediceo: forte a stella sopra il centro, torre sul porto,
  camminamenti sulle mura. [Visit Tuscany](https://www.visittuscany.com/en/ideas/5-things-to-do-in-portoferraio/)
- **Kotor** — mura continue attorno alla città, **Porta a Mare** sul molo, porte di terra con bastioni.
  [Fortifications of Kotor](https://en.wikipedia.org/wiki/Fortifications_of_Kotor)

- **Brindisi, Castello Alfonsino (Forte a Mare)** (foto del committente) — la fortezza aragonese sull'isola davanti al porto:
  il **torrione tondo** con la lanterna in cima, le cortine di tufo dorato a scarpa, e dentro un **fossato pieno d'acqua di mare**
  (una darsena chiusa) che comunica col mare aperto da un **arco** sotto le mura; sulla banchina interna la **porta col portale
  bugnato a fasce bianche** e le finestrelle quadrate delle caserme. È il modello del fossato della Rocca: acqua verde e ferma,
  i riflessi delle mura, la passerella di servizio.

### Borghi di mare quasi in piano (il modello del borgo)
- **Bari Vecchia** — labirinto di vicoli e corti sulla penisola, chiuso dalla Muraglia sul mare e da fortini; **un solo
  corso largo** lo separa dal **quartiere murattiano a griglia**: due città una accanto all'altra.
  [Bari runseeing](https://greatruns.com/bari-runseeing-tour/) · [Muraglia](https://kupi.com/en/explore/italy/bari/muraglia-di-bari)
- **Trapani** — penisola a falce; nel labirinto due assi dritti (Rua Grande, Rua Nova); le **Mura di Tramontana**
  spagnole sulla costa nord coi bastioni Conca e Imperiale; la Torre di Ligny sulla punta.
  [Balarm](https://www.balarm.it/news/a-trapani-spunta-una-nuova-porta-sul-mare-dov-e-la-finestra-aperta-sulle-antiche-mura-155861) ·
  [Frommer's](https://www.frommers.com/destinations/trapani/things-to-do/)
- **Gallipoli** — città vecchia su un'isola, un ponte, il castello col rivellino alla porta, il mercato del pesce sul porto
  la mattina. [SiViaggia](https://siviaggia.it/idee-di-viaggio/gallipoli-puglia-cosa-vedere/579211/)
- **Genova** — i caruggi che si aprono all'improvviso in piazzette (Piazza delle Erbe, San Donato) piene di bar e osterie.
  [Visit Italy](https://www.visititaly.eu/it/luoghi-e-itinerari/genova-centro-storico)
- **Procida, Marina Corricella** — case a colori impilate sul porticciolo, lungomare senza auto, reti e barche.
  [Colorful Procida](https://darylhunterpolyhistor.substack.com/p/colorful-procida-italy)

### Puglia
- **Otranto** — castello aragonese a pianta **pentagonale**, tre torri cilindriche e **fossato** attorno; verso il mare un
  bastione **a punta di lancia**; la porta col **ponte levatoio** protetta da un'opera **triangolare** (rivellino) sul
  fossato; castello e mura sono **un solo sistema**; si entra dal mare per la **Porta Alfonsina**; i **Bastioni dei
  Pelasgi** guardano il porto. [Italia.it](https://www.italia.it/it/puglia/otranto/monumenti/castello-aragonese) ·
  [Il Tacco di Bacco](https://iltaccodibacco.it/otranto/castello-aragonese-di-otranto) ·
  [SiViaggia](https://siviaggia.it/idee-di-viaggio/otranto-incanto-del-salento/116518/)
- **Monopoli** — il **Castello Carlo V** compatto e massiccio sulla punta (Punta Penna), poi carcere; il **porto vecchio**
  coi pescatori che rammendano le reti e le barche; le mura col **Torrione**; il centro un labirinto di vicoli bianchi
  di calce; la cala-spiaggia appena fuori dalle mura. [The Wom](https://travel.thewom.it/italia/puglia/borgo-sul-mare-piu-affascinante-della-puglia.html) ·
  [Travel365](https://www.travel365.it/monopoli-cosa-vedere.htm)
- **Molfetta** — il **Borgo Vecchio a spina di pesce**: una via dorsale e i vicoli paralleli che ne escono a pettine,
  pensati contro il vento e i pirati. [Italo](https://blog.italotreno.com/idee-di-viaggio/cosa-fare-cosa-visitare-molfetta-dintorni/)
- **Polignano a Mare** — il borgo sulla scogliera, la **Porta Grande** col ponte levatoio, le terrazze a balcone sul mare.
  [Italia.it](https://italia.it/en/puglia/bari/centro-storico-di-polignano-a-mare)

### Il mercato
- **Porta Palazzo, Torino** — la piazza ottagonale più grande della città, tettoie coperte (la tettoia dei contadini)
  circondate da ~750 banchi su carretti, il mercato coperto accanto.
  [Comune di Torino](https://risorse.comune.torino.it/portapalazzo/bm~doc/2014-03-03-porta-palazzo-simbolo-dellintegrazione.pdf) ·
  [L'Espresso](https://lespresso.it/c/archivio/2020/4/1/il-mercato-allaperto-piu-grande-deuropa-ora-racconta-il-vuoto-di-questi-giorni-demergenza/44907)

### La metropoli e la periferia
- **Do the Right Thing** (Wynn Thomas): un solo isolato di Bed-Stuy, case a schiera, la pizzeria d'angolo costruita apposta.
  [NYC in film](https://nycinfilm.com/2023/04/16/do-the-right-thing-1989)
- **The Warriors**: New York di notte, la sopraelevata, i sottopassi, Coney Island.
  [Scouting NY](https://scoutingny.com/the-new-york-city-filming-locations-of-the-warriors-part-2) ·
  [Untapped Cities](https://untappedcities.com/2014/01/30/flashback-film-locations-the-warriors-show-a-gritty-nyc-in-the-1970s/)
- **Jerome Avenue**, la sopraelevata del Bronx sopra il viale. [NY Historical](https://digitalcollections2.nyhistory.org/items/183725-view-jerome-avenue-irt-line-looking-south-170th-street-167th-street-station-bronx)
- **Le Vele di Scampia** (Gomorra): la megastruttura a gallerie che dall'alto sembra un labirinto: il peso del regime.
  [Wanted in Rome](https://www.wantedinrome.com/news/italy-naples-demolition-vela-gialla.html)

### I dettagli: botteghe, strada, gente
- **Jamel Shabazz**, *Back in the Days* (NY 1980-89): vetrine, ragazzi vestiti per la strada, carrelli della spesa.
  [Jamel Shabazz](https://en.wikipedia.org/wiki/Jamel_Shabazz)
- **Martha Cooper**, *Subway Art* e *Street Play*: i treni dipinti fotografati dai tetti e dai lotti vuoti del South Bronx;
  i bambini che giocano fra le macerie. [Huck](https://www.huckmag.com/art-and-culture/martha-cooper-photographing-golden-age-of-nyc-graffiti-scene-80s/)
- **Gabriele Basilico**, *Milano ritratti di fabbriche* (1978-80), e **Luigi Ghirri**, *Viaggio in Italia* (1984):
  la periferia italiana di palazzine e asfalto. [Finestre sull'Arte](https://www.finestresullarte.info/mostre/castello-campori-soliera-fotografia-in-italia-tra-anni-ottanta-e-novanta)

## Regole di progetto che ne vengono

1. **La Rocca è un recinto chiuso sulla punta** (Otranto e Monopoli: il castello sulla punta, fossato, rivellino triangolare
   davanti alla porta, ponte levatoio), come St Elmo e la Cittadella di Messina: fronte di terra bastionato verso
   la città (due bastioni interi, la cortina, la porta nel mezzo, un **rivellino** davanti alla porta, il **fossato**),
   **mura a mare** che seguono la costa con mezzi bastioni agli angoli, la **Porta a Mare** sul porto militare.
   Dentro: la **piazza d'armi** al centro, il **palazzo del comando** in fondo sull'asse della porta, le **caserme in fila
   lungo le cortine** che guardano la piazza, la cappella, la polveriera, le cisterne. Niente prati né palazzine sparse.
2. **La spianata**: fra la Rocca e la città 40-60 m vuoti (il campo di tiro). È la grande scena del regime: lastricata,
   il Muro e il posto di blocco sul bordo, i pali coi riflettori, i ritratti del Garante. Nessuna casa.
3. **Il borgo comincia subito dopo la spianata** (Bari Vecchia, Gallipoli, Trapani, Monopoli): labirinto di vicoli e **corti**,
   con quartieri **a spina di pesce** come Molfetta (una dorsale e i vicoli a pettine), bianchi di calce,
   piazzette davanti alle chiese, uno o due **assi dritti antichi** che lo tagliano (Rua Grande / Rua Nova), le **mura di
   tramontana** sulla costa nord col camminamento sopra, la marina coi colori di Procida sul porto vecchio.
4. **Un solo corso largo** separa il borgo dalla città a griglia (Corso Vittorio Emanuele a Bari). Lì, sulla cucitura,
   la **piazza del mercato** alla Porta Palazzo: grande, ottagonale, tettoie e banchi.
5. **Allontanandosi la griglia cresce** in metropoli: isolati regolari, la **sopraelevata** su un viale, case a schiera,
   botteghe d'angolo, lotti vuoti, campetti; in fondo la **megastruttura** (le Vele) e le baracche lungo la ferrovia
   sulla costa.
6. **Regola rotta ogni tanto**: case fuori asse, vicoletti fra una casa e l'altra (già fatto: `b.rot`).
