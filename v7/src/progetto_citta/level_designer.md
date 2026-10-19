# Porto Vecchio — il punto di vista del level designer

## 1. Critica: cosa ho visto

**Il borgo è un parcheggio con delle torri.** La foto 3D a (1440, 330) mostra un ventaglio di asfalto largo 12-16 m, slarghi beige enormi e palazzine di 4-5 piani *isolate*, ognuna circondata dal vuoto. Ci si vede da un capo all'altro: niente si nasconde, niente si scopre. Un borgo genovese/pugliese è l'opposto: muro continuo, 2-3 m fra le facciate, cielo a striscia.

**Il gradiente è rovesciato.** La "metropoli" a (1200, 330) è più fitta, più storta e più viva del borgo. Chi entra dalla Rocca verso ovest va dal vuoto al pieno: il racconto dice il contrario.

**Troppe strade maestre, tutte uguali.** Otto assi larghi (corso, via_porto, via_alta, via_mura, viale_ovest...) più l'anello costiero che fa il giro dell'isola. Dall'alto la pianta è un groviglio di nastri grigi della stessa larghezza: nessuna gerarchia, quindi nessun orientamento. Il giocatore non impara la città perché non c'è niente da imparare: ogni strada è "una strada".

**I vicoli sono frammenti.** Nella pianta 1300-1500 i vicoli arancio sono pezzetti che collegano due strade larghe distanti 15 m: non portano da nessuna parte che non sia già raggiungibile dall'asfalto. Un vicolo vale come gameplay solo se è una *scorciatoia* o un *nascondiglio*.

**Prato dentro gli isolati.** Macchie verdi casuali dentro ogni isolato del borgo: sembrano caselle avanzate, non giardini. Nessun orto, nessun chiostro, nessun cortile con un muro attorno.

**Bordi tutti uguali.** L'anello asfaltato gira tutta la costa: la marina dei pescatori, il porto, le mura di tramontana, la ferrovia sono lo stesso bordo. Un bordo uguale ovunque non è un punto di riferimento.

**Nessuna epoca ha tagliato l'altra.** Le tre maglie (borgo/mezzo/metropoli) sono generate affiancate e cucite ai bordi. La stratificazione vera è fatta di *ferite*: una strada nuova che sventra il vecchio e lascia facciate tagliate, lotti triangolari, vicoli che finiscono contro un muro.

## 2. Proposta: generare per epoche, ognuna che taglia la precedente

L'ordine del generatore è l'ordine storico. Ogni fase lavora sopra la griglia lasciata dalla precedente, **demolisce** dove passa e lascia i resti.

**Fase 1 — Il borgo medievale (XII-XVI sec.), x 1330-1490.** Una *dorsale* storta (Via Maestra, 4-5 m) che corre sul crinale da est a ovest, e vicoli a pettine ogni 10-14 m verso i due mari (Molfetta), larghi 2 m, con 1-2 gomiti ciascuno. Isolati 10×25 m **pieni al 100%**: case 4-6 m di fronte, 3-5 piani, a filo strada, ruotate di ±8° sul vicolo. Il vuoto si scava, non si lascia: 1 corte chiusa (6×6) ogni ~3 isolati, accessibile da un sottopasso (casella di vicolo coperta da un piano). Piazzette 8-12 m solo dove si incrociano 3 vicoli, sempre con una chiesa o una fontana sul lato lungo. Scalinate dove i vicoli scendono al mare. Mura di tramontana sulla costa nord, con camminamento: è il primo "livello dei tetti".

**Fase 2 — La Rocca (1660-1690), x 1488-1610.** Si costruisce *sopra* il borgo: la spianata di 50 m (x 1430-1488) è ottenuta **cancellando** le case della fase 1. Il bordo ovest della spianata deve essere frastagliato: case tagliate a metà (muro cieco verso la Rocca), vicoli che finiscono sul vuoto, una chiesa sopravvissuta isolata nella spianata. Questo è il primo segno che il generatore deve lasciare: il potere che ha raso il quartiere.

**Fase 3 — Il Rettifilo umbertino (1880-1900).** UNA sola strada dritta, 14 m, dalla spianata verso ovest fino al mercato, che sventra il borgo senza pietà: lungo i fronti palazzi a corte di 5 piani, alti e regolari, ma *dietro* la prima fila riappaiono le case vecchie tagliate. Fine del borgo, inizio del borgo murattiano: griglia ortogonale 30×30 m con isolati a corte (x 1250-1330). Sulla cucitura la piazza del mercato ottagonale (60 m, tettoie).

**Fase 4 — Il Garante (1925-1940 e dopo).** Un solo viale monumentale vuoto (20 m, alberi in fila, statua) che punta dritto alla Rocca, *non allineato* al Rettifilo: l'angolo fra i due (10-15°) crea lotti triangolari e un palazzo a cuneo (il Flatiron di Porto Vecchio). Asse di parata, sorveglianza, niente ripari: per il giocatore è la zona proibita.

**Fase 5 — Il boom e la speculazione (1955-1975), x 1100-1250.** Griglia americana 24×60 m, strade 10 m, palazzoni 6-10 piani, case a schiera, lotti vuoti recintati, la sopraelevata su pilastri lungo un viale (sotto: buio, mercato nero, graffiti). In fondo la megastruttura a gallerie (le Vele): un livello verticale percorribile.

**Fase 6 — L'abusivo (1975-1986).** Sopra tutto il resto: verande sui tetti, scale esterne, passerelle fra palazzi del boom (i ponti dei tetti), baracche lungo la ferrovia sulla costa sud-ovest. È l'unica fase che può crescere anche *dentro* la spianata e sotto la sopraelevata.

## 3. Regole da level designer

- **Tre landmark verticali**, sempre visibili dall'alto: il cavaliere della Rocca (est), il campanile del Duomo al centro del borgo, l'antenna/torre del boom (ovest). Bastano per orientarsi.
- **Gerarchia stradale di 4 livelli soli**: viale (20 m, 1), Rettifilo e corsi (12-14 m, max 3), vie (6-8 m), vicoli (2-3 m). Niente anello costiero continuo: la costa cambia (mura, marina, banchine, ferrovia, scogli).
- **Regola dei 60 m**: nel borgo nessuna visuale libera oltre 60 m (gomiti, archi, sottopassi). Nella metropoli visuali di 300 m. Così il borgo confonde e la metropoli spiega.
- **Ogni vicolo è una scorciatoia**: deve tagliare almeno il 30% rispetto al percorso su strada, altrimenti si cancella.
- **Colli di bottiglia = porte**: 4-5 passaggi obbligati fra quartieri (la porta di terra, l'arco sotto il Rettifilo, il sottopasso ferroviario, la scala dei pescatori). Lì stanno i posti di blocco della Tutela; accanto, sempre, un'alternativa sui tetti o nei sotterranei.
- **Tetti come livello**: nel borgo case contigue con dislivelli massimo 1 piano (si salta); nella metropoli passerelle abusive. Il giocatore deve poter attraversare il borgo senza scendere.
- **Zone di gioco legate all'epoca**: spaccio sotto la sopraelevata, graffiti sulle facciate cieche delle case tagliate e sui treni, mercato sulla cucitura, fuga nei vicoli.
- **Rompi la regola una volta per quartiere**, non ovunque: una casa del borgo nella griglia, un palazzone nel borgo, un giardino murato (orto del convento, 20×30 m) dove nessuno se lo aspetta.

## 4. Da evitare

Il ventaglio di strade larghe dalla Porta; erba come riempitivo; case isolate senza vicini; vicoli che duplicano le strade; slarghi beige senza bordo; più di un'epoca che usa la stessa larghezza di strada.
