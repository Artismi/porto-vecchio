# Porto Vecchio — La città che parla da sola: lo strato dei media e della grana

Proposta di scrittura (nessun file del repo toccato). Inverno 1986, l'isola sotto la Tutela. Tono: `REGIA_COMMEDIA.md` §2,
tarato su `commedia/TONO.md` (8 novembre). Cosa vuol dire, in pratica:
- **Si capisce al volo.** Un quindicenne la legge, la capisce e ride, senza sapere chi sono i Grigi. Se serve pensarci, si butta.
- **Chi parla si sputtana da solo.** Egoista, pigro, vigliacco, sbruffone: la battuta lo scopre. Gli amici si fregano fra loro.
- **A volume alto.** Reazioni a caldo a quello che succede adesso, urlate. Niente aforismi, giochi di parole, paradossi.
- **La propaganda e le pubblicità sono assurde, ma grosse**: prodotti ridicoli, il Garante che perde la testa in diretta, la
  pubblicità che confessa. Assurdo da radio di GTA, non satira fine.
- Parolacce sì, bestemmie no; sesso solo per allusione; niente razza, niente disabilità, niente battute sui rettificati né sulla
  Battuta. Niente insulti di repertorio fine a se stessi («tua madre», «tua sorella»): la parolaccia accompagna la figuraccia.
- **Al massimo 70 caratteri** per ogni riga detta, scritta o dipinta.

Cose già nel gioco a cui ci si aggancia (da `v7/src`):
- il Garante alle 20 da tutti gli schermi («L'ordine è una carezza»), il ripetitore in vetta che lo spegne, la riga
  «in tutti i bar qualcuno abbassa il volume del Garante» quando va in onda Radio Scirocco (risacca.js);
- il Bollettino della Tutela letto in piazza il lunedì alle 9 (popolo.js `RECURRING`), il Lotto del Garante, l'Ente Case del
  Garante, la tessera annonaria, il Supermercato del Popolo, il Banco;
- le insegne delle botteghe (world_cittanuova.js `USES`/`MINORI`: «FERRAMENTA BRUNO», «Osteria da Pinna»), le case
  `Casa <cognome>`; i posti `fila`, `cypher`, `parata`, `banco_pesce`, `carico` (posti.js).

Ricorrenze fra le sezioni (la città si cita da sola, e la terza volta il giocatore ride da solo). Sono tutte cose che si
capiscono la prima volta: il **Garante pelato** (che dice di non esserlo), **Efisio e Tonino di via Cavour** (la moglie di Efisio
di notte urla «Tonino»), il **ragazzo con la felpa verde** che ha fatto il dito al Garante, il **gatto che graffia il Garante**,
la **berlina Polaris 1300** che nessuno usa, il **frigorifero Iceberg** a rate, la **nave che arriva domani**, il **94%** di felicità,
la **luce a sere alterne**, **Gavino** che non è mai invitato.

---

## 1. Il Garante alle 20 — 15 trasmissioni

Voce: paterna, solenne, pause lunghe. Mai una parolaccia. Però ogni sera qualcosa gli va storto in diretta, e si vede che è un
vanitoso permaloso: si vanta, si offende, perde le staffe, si ricompone. Ogni trasmissione chiude con la sigla (tre note) e lo
stemma; durante l'inno si sta in piedi. Le reazioni sono di avventori diversi (A, B, C, Gino il barista), urlate **dopo** la
frase chiave, mai sopra. Al bar si insulta lo schermo, ci si frega fra amici, e chi fa lo sbruffone si scopre vigliacco.

### 1.1 Il freddo
> Cittadini. Fa freddo. Lo so.
> Io però sto benissimo. Ho tre stufe.
> Una per i piedi, una per le mani, una per il cane.
> Voi avete due palate di carbone a famiglia. Bastano.
> Se avete freddo, saltellate. Io vi guardo.
> L'ordine è una carezza. Buonanotte.

- A: «Tre stufe! Pure il cane! Vaffanculo, pelato!» (poi, a Gino) «Non dirlo a nessuno.»
- B: «Gino, la stufa la metti vicino a me?» C: «Perché a te?» B: «Perché l'ho chiesto io.»
- C (ubriaco, saltella): «Guarda, Garante! Salto! Ho caldo! …Gino, ho vomitato.»

### 1.2 La nave
> La nave dell'Impero arriverà domani.
> L'ho detto anche ieri. Ma stavolta è vero.
> Ve lo giuro sulla mia faccia.
> Andate al molo alle cinque. Portatevi una sedia.

- A: «Tre mattine al molo, cazzo! Io domani ci mando mio figlio.»
- B: «Io ci vado. Alle cinque. Tu mi tieni il posto dalle quattro, eh?»
- C: «Giura sulla faccia? Allora la nave è pelata pure lei!»

### 1.3 Le scritte
> Qualcuno scrive sui muri. Scrive «NO».
> E stamattina, sotto il mio ritratto, ha scritto «PELATO».
> Io non sono pelato. Ho i capelli corti. Davanti.
> IO NON SONO PELATO!
> (si ricompone) …L'ordine è una carezza.

- A: «È pelato! È pelato! Guarda come brilla!»
- B (fiero): «"Pelato" l'ho scritto io.» (entra un Grigio) «…Cioè, l'ha scritto lui.»
- C: «Eri tu? E dicevi che eri a letto con la febbre, stronzo!»

### 1.4 La statistica
> La felicità sull'isola è al novantaquattro per cento.
> Il sei per cento infelice lo conosciamo. Abbiamo l'elenco.
> Il primo dell'elenco si chiama Gino.
> Gino, sorridi. Ti stiamo guardando.

- Gino: «Io?! Ho il tuo ritratto sopra la macchina del caffè!»
- A: «Gino, sorridi!» Gino: «Sto sorridendo, cazzo! Questo è il sorriso!»
- B: «Meno male. Pensavo di essere io il primo. …Oi, non guardatemi.»

### 1.5 Il Garante non dorme
> Il Garante non dorme mai. Vi guardo dormire.
> Signora del terzo piano di via Cavour: ho sentito tutto.
> Suo marito si chiama Efisio.
> Stanotte lei urlava «Tonino». Tre volte.
> Buonanotte a tutti. E a Tonino in particolare.

- Efisio (si alza, rovescia la sedia): «TONINO! DOVE CAZZO È TONINO?!»
- Tonino (si nasconde dietro il flipper): «Non ci sono! Non mi hai visto!»
- C: «Efisio, offri tu, stasera? Così ti consoli.» A: «Approfittatore!»

### 1.6 Le rotelle
> Molti giovani vanno sulle tavole con le rotelle.
> Ieri uno è passato sotto il mio balcone.
> Mi ha fatto il dito. Ti ho visto. Avevi la felpa verde.
> Felpa verde, ti troveremo.

- A (ragazzo, si toglie la felpa verde e la mette al vicino): «Tienila tu, fra.»
- B (con la felpa addosso): «Ma è tua!» A: «Adesso è tua. Ti sta benissimo.»
- C (vecchio): «Io il dito gliel'ho fatto nel '62! Ma lui non mi ha visto.»

### 1.7 I gatti
> Da domani c'è il censimento dei gatti.
> Ogni gatto avrà la tessera con la foto.
> Questo è il mio. Si chiama Garante Secondo. È bellissimo.
> (il gatto lo graffia in faccia, in diretta)
> TOGLIETE LA TELECAMERA! TOGLIETELA!

- A (in piedi, applaude): «Bravo gatto! Il gatto è un eroe!»
- B: «Gino, rimandala indietro! Rimandala!» Gino: «È la TV, coglione, non va indietro!»
- C: «Il mio gatto lo dichiaro morto. Così non pago la tessera.»

### 1.8 Il pane
> Dicono che manca il pane. Non è vero.
> Il pane c'è. L'ho mangiato io, a cena.
> Col burro. E col prosciutto.
> (si pulisce la bocca) Era buonissimo.

- A (tira una ciabatta allo schermo): «Mangiati questa, pelato!»
- Gino: «Chi ha tirato la ciabatta? La TV è a rate! Chi è stato?!» A: «Lui!»
- B: «Io il pane ce l'ho. Due pagnotte. …Ma sono per me, eh.»

### 1.9 Il Modulo 31-L
> Chi vuole lamentarsi compili il Modulo 31-L.
> L'Ufficio Lamentele è aperto il martedì. Per un quarto d'ora.
> Chi si lamenta riceverà una visita. Gentile. Col furgone.

- A: «Io mi lamento! Domani vado e glielo dico in faccia!» B: «Vai?» A: «…Vai tu.»
- B: «Io il modulo l'ho compilato col nome di mio cognato.»
- C: «Gino, mi lamento che la birra è calda!» Gino: «Allora ti mando il furgone.»

### 1.10 La radio che non esiste
> Qualcuno di notte ascolta una radio non autorizzata.
> Questa radio non esiste.
> E se non esiste, perché la sentite? Eh? PERCHÉ?
> Lo so che adesso qualcuno abbassa il volume. Lo sento!
> NON ABBASSATE IL VOLUME QUANDO PARLO!

- Gino (rialza di scatto la manopola): «Non l'ho toccato! È stato lui!»
- A: «Io la radio non la ascolto mai.» B: «Ieri alle due cantavi la sigla!»
- C: «Stanotte alle due, passaparola.» B: «Che c'è alle due?» C: «Niente! NIENTE!»

### 1.11 Il calcio
> Domenica la Selezione dell'Isola ha vinto dieci a zero.
> Sei gol li ho segnati io. Di testa. A sessantadue anni.
> L'arbitro dice che non ha mai visto niente del genere.

- A: «Io c'ero! Gli avversari erano i camerieri del Palazzo!»
- B (ubriaco): «Sei gol? Io ne ho fatti sette, nel '62! Con le scarpe di mio padre!»
- C: «Sette? Ma se nel '62 facevi il raccattapalle!» B: «Il raccattapalle più forte!»

### 1.12 La luce
> Questa settimana la luce c'è a sere alterne.
> Stasera tocca ai numeri dispari.
> I pari stiano al buio e non rompano.
> Io sto al numero uno. Acceso sempre. Buonanotte.

- (la luce del bar si spegne) A: «Gino, siamo pari?!» Gino: «Siamo il 14, genio!»
- B (al buio): «Ho pagato il giro!» A: «Non è vero!» B: «Al buio non si vede!»
- C: «La luce no, ma il pelato si vede benissimo! Brilla lui!»

### 1.13 Il Tributo
> Venerdì è la Festa del Tributo.
> Ogni famiglia regala all'Impero la cosa che ha di più cara.
> Il frigorifero. Resta a casa vostra, ma è dell'Impero.
> E lo continuate a pagare voi. Con amore.

- A: «Il frigo è suo? Allora la mortadella me la mangio adesso. Tutta.»
- B: «L'ho finito di pagare ieri! IERI, CAZZO!»
- C: «Io il frigo non ce l'ho. Ah ah! …Gino, mi tieni la birra nel tuo?»

### 1.14 La nebbia
> Stasera c'è nebbia. L'ha ordinata la Guardia.
> Nella nebbia voi non vedete la Guardia. Ma la Guardia vede voi.
> (fuori campo) «Capo, io non vedo un cazzo!»
> …Quello era un attore.

- A: «Un attore! Sì, come no! Stasera esco, tanto non vedono niente!»
- B: «Esci? Allora mi porti le sigarette.» A: «…Mi sa che resto qui.»
- C (ubriaco): «Ieri nella nebbia ho baciato una! Speriamo fosse mia moglie!»

### 1.15 L'inno
> Cittadini, in piedi. Suona l'inno.
> Lo so chi resta seduto. Vi vedo dallo schermo.
> Tu. Sì, tu. Al bar. Col berretto.
> ALZATI.

- (uno col berretto scatta in piedi e rovescia la birra) «Ero già in piedi! Sono basso!»
- Gino: «Mi hai bagnato il bancone! In piedi o seduto, la birra la paghi!»
- B (che è rimasto seduto, sottovoce): «Ha visto lui. A me no. Ah ah.»

**Note di regia.** Una trasmissione per sera, a rotazione senza ripetere per 15 giorni di gioco; la 1.10 solo se Radio Scirocco
ha trasmesso nelle ultime 48 ore; la 1.2 solo il lunedì e il giovedì in cui la nave non è arrivata; la 1.11 il lunedì; la 1.13 il
giovedì; la 1.15 la domenica (e a ogni prima sera in un bar nuovo, perché il giocatore impari che all'inno ci si alza). La 1.5
apre la scena della lite di via Cavour (§8.2). Le reazioni vanno nell'agenda unica di `?commedia` (massimo un «pezzo» rivolto al
giocatore), ma le reazioni da bar sono ambiente: non contano nel limite se il giocatore non è il destinatario.

---

## 2. Radio Ufficiale — 25 pubblicità del Banco e dell'Impero

Stile radio di GTA: voce gonfia che urla, jingle, effetti sonori, e alla fine la clausola letta al doppio della velocità. Le
pubblicità promettono cose ridicole e si tradiscono da sole. Fra parentesi quadre chi parla. Tutto si compra a rate dal
**Banco** (il Banco del Popolo, sportelli in ogni quartiere). Una riga per volta, ognuna detta tutta d'un fiato.

1. **Berlina Polaris 1300.** [Uomo che urla come al mercato]
   - «POLARIS 1300! LA MACCHINA CHE FA CREPARE D'INVIDIA IL VICINO!»
   - «Quattro porte! Due si aprono! Le altre due sono per bellezza!»
   - «Da zero a cento! In un pomeriggio!»
   - *Clausola:* «I freni sono un optional. Le rate finiscono nel 2030.»
2. **Frigorifero Iceberg.** [Coppia]
   - «Caro, ho comprato l'Iceberg!» «Ma fuori fa meno due!»
   - «Sì, ma dentro fa meno tre! E il freddo è NOSTRO!»
   - «ICEBERG! IL FREDDO CHE TI PUOI PERMETTERE! A RATE!»
   - *Clausola:* «Corrente non inclusa. Spento è un ottimo armadio.»
3. **Televisore Occhio Serale.** [Voce calda]
   - «Il Garante, a casa tua, tutte le sere! E tu sei in mutande!»
   - «Occhio Serale! Un canale solo! Così non sbagli!»
   - *Clausola:* «La manopola del volume è finta. Il Garante si sente.»
4. **Piumino Bufera.** [Donna, entusiasta]
   - «Piumino Bufera! Senza piume! Senza oche! Senza caldo!»
   - «Sudi e geli nello stesso momento! Due stagioni in un piumino!»
   - *Clausola:* «Prende fuoco. Non fumarci dentro.»
5. **Carne Patria in scatola.** [Uomo burbero]
   - «Che carne è?» «È carne!» «Di cosa?» «DI CARNE! MANGIA E STAI ZITTO!»
   - «Carne Patria. Non fare domande alla scatola.»
   - *Clausola:* «Ogni scatola contiene carne. Più o meno.»
6. **RataSicura.** [Voce rassicurante che si agita]
   - «Non paghi la rata? Niente paura! C'è RataSicura!»
   - «Non paghi RataSicura? C'è RataSicura Più!»
   - «Non paghi nemmeno quella? …Ti veniamo a prendere. Ciao!»
7. **Lucidatrice Splendor.** [Donna, complice]
   - «Tuo marito torna dalla miniera e non ti guarda più?»
   - «Splendor! Il pavimento brilla, lui scivola e ti guarda per forza!»
   - *Clausola:* «Il Banco non paga le fratture.»
8. **Riposo Rateale, onoranze dell'Impero.** [Voce bassa, organo]
   - «Sei morto? Tranquillo! Puoi pagare a rate anche da morto!»
   - «Riposo Rateale! Pagano i tuoi figli! E i figli dei tuoi figli!»
   - *Clausola:* «Se saltate una rata, il nonno torna a casa.»
9. **Fagioli del Continente.** [Voce epica, tamburi]
   - «Hanno attraversato il mare! Hanno passato la dogana! Per te!»
   - «FAGIOLI DEL CONTINENTE!» (rumore di scoreggia lunghissima) «…Funzionano!»
10. **Margarina Gelo d'Oro.** [Bambina, poi mamma]
    - «Mamma, cos'è il burro?» «Roba da ricchi, amore. Mangia e taci.»
    - «Gelo d'Oro! Si spalma sul pane, sulle scarpe, sulla bici!»
    - *Clausola:* «Non mangiarla se sei incinta, malato o hai fame.»
11. **Corso «Diventa Ispettore».** [Uomo, complice]
    - «Ti piace farti i fatti degli altri? Fallo di mestiere!»
    - «Diventa Ispettore in dodici dispense! In regalo, un binocolo!»
    - «Il primo mese spii tua madre! Poi i vicini! Poi tutta la via!»
12. **Enciclopedia del Sapere Approvato.** [Voce colta che perde la pazienza]
    - «Ventiquattro volumi! Tutto quello che c'è da sapere!»
    - «Il volume 19 non esce. Non chiedete perché. NON CHIEDETE!»
    - *Clausola:* «Il volume 19 è in ristampa dal 1971.»
13. **Lavatrice Vortice 5.** [Uomo, gridando sopra il rumore]
    - «VORTICE 5! LAVA! CENTRIFUGA! SALTA PER LA CUCINA COME UN CANE!»
    - «Fa così casino che i vicini non sentono più quando litigate!»
    - *Clausola:* «Legarla al lavandino. Se esce sul balcone, chiamate il Banco.»
14. **Prestito «Subito Domani».** [Voce velocissima]
    - «Ti servono soldi? Il Banco te li dà! Subito! Cioè domani! Cioè boh!»
    - «Interessi al trentotto per cento! Tanto tu non sai fare i conti!»
15. **Sigarette Bianche di Stato.** [Uomo roco]
    - «Bianche di Stato. Le sigarette dell'uomo vero.» (tosse lunghissima)
    - «…dell'uomo vero… (tosse) …chiamate qualcuno. Chiamate qualcuno!»
16. **Materasso Riposo del Lavoratore.** [Voce allegra]
    - «Una molla ti punge sempre nella schiena! Così non dormi troppo!»
    - «E la mattina arrivi in miniera puntuale! Riposo del Lavoratore!»
17. **Caldaia Calor Nazionale.** [Nonno, nostalgico]
    - «Il caldo di una volta! Con la puzza di una volta!»
    - «Calor Nazionale! Se ti gira la testa, vuol dire che funziona!»
    - *Clausola:* «Aprite la finestra. Davvero. Apritela adesso.»
18. **Bambola Brava Bambina.** [Bambola, voce registrata, poi bambina]
    - «Sì! Grazie! È stato papà!»
    - «Brava Bambina! La bambola che fa la spia! Tirale il filo!»
    - «Papà, perché la butti in mare? Papà!»
19. **Vodka Impero Leggera.** [Uomo fiero, poi la stessa voce ubriaca]
    - «Vodka Impero Leggera! La bevi a colazione e vai a lavorare!»
    - «Io la bevo… e vado a lavorare… dove lavoro? Mamma?»
20. **Telefono di casa «Pronto Sicuro».** [Coppia felice]
    - «Il telefono in casa! Chiami la mamma, la zia, la fidanzata!»
    - «E c'è sempre un signore che respira dentro! Non sei mai solo!»
    - *Clausola:* «Il clic è normale. Non dite niente di strano.»
21. **Profumo Brina.** [Donna, francese finta]
    - «Brina! Il profumo che sa di neve, di sapone e di caserma!»
    - «Lui ti annusa e si mette sull'attenti! Tutto sull'attenti!»
22. **Ricostituente FerroForte.** [Medico]
    - «Pallido? Stanco? Hai idee strane? FerroForte!»
    - «Due cucchiai e le idee strane spariscono! Tutte! Pure quelle buone!»
    - *Clausola:* «Effetti collaterali: denti verdi, pipì blu.»
23. **Lotto del Garante.** [Banditore]
    - «Gioca al Lotto del Garante! Si vince un milione!»
    - «L'ultimo vincitore? Il Garante! Il penultimo? Il Garante!»
    - «Gioca anche tu! Forse la prossima volta vince… il Garante!»
24. **«Carrello Fisso», Supermercato del Popolo.** [Mamma, sollevata]
    - «Ogni settimana lo stesso carrello! Patate, fagioli, patate!»
    - «Carrello Fisso! Così non ti viene voglia di niente!»
    - *Clausola:* «Le uova nella foto sono disegnate.»
25. **Sposalizio «Sì per Sempre».** [Tenore, poi voce]
    - «Sposati con Sì per Sempre! Chiesa, pranzo, foto col Garante!»
    - «E se lei ti lascia? Le rate restano! Le rate non ti lasciano mai!»

**Uso.** In onda nelle botteghe, sulle autoradio delle Polaris ferme al traffico, dagli altoparlanti del Supermercato del Popolo,
dalle finestre di mattina. Tre pubblicità ogni dieci minuti di gioco, mai la stessa due volte in un'ora. Ogni tanto chi è vicino
alla radio risponde («Ma vaffanculo, tu e la Polaris!»), con le battute di §8.

---

## 3. Radio Scirocco — 10 segmenti (la pirata)

In onda di notte (di solito alle 2), voce di **Vinile** (Rita Sanna) e ospiti. Fruscio, una base rallentata del Garante sotto.
Vinile parla veloce, ride, si incazza, va nel panico in diretta. Mai nomi veri: «quello lì», «il pelato».

1. **L'apertura.**
   - «Le due, Porto Vecchio! Qui Radio Scirocco, la radio che non esiste!»
   - «Se mi sentite siete matti, l'ha detto la TV. Ciao, matti!»
   - «Alzate il volume! Ma piano! …PIANO, Tonino, ti sento dal porto!»
2. **I messaggi per gli amici.**
   - «Messaggi. Il gabbiano ha tre zampe. Ripeto: tre zampe.»
   - «Chi doveva capire ha capito. Chi non ha capito è un Grigio. Ciao!»
3. **Le dediche.**
   - «Da Efisio, via Cavour: "Tonino, ti aspetto sotto casa. Con la mazza."»
   - «Da Tonino: "Efisio, non ero io! Era mio cugino! Tonino pure lui!"»
   - «Tonino, amore, non aiuti. Questa è per voi due. Correte.»
4. **Il meteo.**
   - «Meteo. Freddo. Domani? Freddo. Dopodomani? Freddo, cazzo, che volete?»
   - «Nebbia sulla calata dalle quattro. I Grigi non vedono niente. Uscite!»
5. **Il Bollettino come si deve.**
   - «Leggiamo il Bollettino. "La felicità è al novantaquattro per cento."»
   - (pernacchia lunghissima)
   - «"Il pane arriva lunedì."» (pernacchia) «"La nave arriva domani."» (pernacchia)
   - «Basta, scusate, ho finito la saliva.»
6. **Gli avvisi del quartiere** (le mappe del Disgelo, a voce).
   - «Avvisi! La grata della stazione sbuffa caldo da stasera. Venite!»
   - «La rampa dello scalo è pulita. Chi l'ha pulita? Nessuno di voi, pigri.»
   - «Il tombino di Vico della Fame è chiuso. Pino ci ha provato lo stesso.»
   - «Pino è ancora lì dentro. Qualcuno gli porti un panino.»
7. **La telefonata in diretta.**
   - «Pronto, sei in onda!» «Ciao Vinile! Volevo dire che il Garante…»
   - «NIENTE NOMI! Niente nomi, amore!» «…che quello lì è uno stronzo!»
   - «Bravo! Questo è coraggio! Come ti chiami?» «Mauro Pala, via Roma 12!»
   - «…NON DIRE IL NOME! Mauro, scappa dalla cabina! CORRI!»
8. **La pubblicità al contrario.**
   - «Stanco delle rate? Prova NIENTE! Niente non costa niente!»
   - «Niente non si rompe! Niente non te lo pignorano! NIENTE! Compralo!»
9. **Il vecchio dell'osteria.**
   - «Mi chiama un signore dall'osteria. Pronto?» «METTI IL LISCIO!»
   - «Signore, è una radio pirata.» «E IO SONO UN PIRATA! METTI IL LISCIO!»
   - «…Va bene. Il liscio. Per il pirata ubriaco.» (parte il liscio)
10. **La chiusura.**
    - «Si chiude! Spegnete la radio e rimettete il Garante, svelti!»
    - «Alle cinque passano i Grigi. Se bussano, dite che dormivate. Russate!»
    - «Ciao, belli. Ciao, Grigio che ascolti. Lo so che ascolti. Ciao!»

**Uso.** Quando la Risacca trasmette (risacca.js `trasmetti`), i segmenti escono dalle finestre di notte a volume basso e
dalle radio dei ragazzi alla grata; il segmento 6 può aggiornarsi con i posti veri (grata, rampa, tombino aperto più vicino).

---

## 4. Altoparlanti della Tutela in piazza — 25 annunci

Voce femminile registrata, cortese, con l'eco; ogni tanto le scappa la pazienza. Un annuncio ogni 6–10 minuti di gioco nelle
piazze con un altoparlante (Piazza Grande, Piazza della Marina, piazzale della stazione, mercato), preceduto da un gong.

1. «Attenzione. È arrivato il pane. …No, scusate. Era una prova.»
2. «È vietato correre in piazza. Chi corre sarà rincorso.»
3. «Sorridete. La Guardia vi sta fotografando. Lei no, signore. Lei no.»
4. «È vietato fischiettare. Sì, anche tu. Sì, ti sentiamo.»
5. «Signor Porcu, sua moglie la cerca. Dice che sa dov'era ieri sera.»
6. «Chi lecca la fontana gelata ci resta attaccato fino a marzo. Ragazzi.»
7. «Ragazzo con lo skate: scendi dal monumento. SCENDI. Ti vediamo.»
8. «Trovata una dentiera in piazza. Chi l'ha persa, sorrida a un Grigio.»
9. «Vietato dare da mangiare ai gabbiani. Si mangiano già i vostri panini.»
10. «Chi ha fatto i baffi al Garante in via Alta: abbiamo il pennarello.»
11. «Chi ha scritto NO sul muro: hai sbagliato. Si scrive SÌ. Correggi.»
12. «Il mercato chiude alle tredici. Alle tredici e uno, si scappa.»
13. «Controlli a sorpresa. Sorpresa! Sei tu.»
14. «La nave arriverà. Ripetiamo: arriverà. Non chiedete quando. Basta!»
15. «Si ricorda che domani è lunedì. Ci dispiace tanto.»
16. «Chi tossisce mentre parla il Garante lo fa apposta. Lo sappiamo.»
17. «I cani della Guardia mordono. Anche chi ha il lasciapassare. Scusate.»
18. «Il signore che ha lasciato la Polaris in doppia fila: adesso è nostra.»
19. «Il freddo di oggi è normale. Smettetela di lamentarvi.»
20. «Cerchiamo il padrone del gatto che ha morso un Grigio. Bravo gatto.»
21. «Fate la fila in silenzio. Signora col cappello verde, parlo con lei.»
22. «Il sorriso è consentito fino alle diciotto. Dopo, faccia normale.»
23. «Avviso per Tonino di via Cavour: Efisio la sta cercando. Ha una mazza.»
24. «Ci scusiamo per il disturbo.» (fischio fortissimo) «…Ci scusiamo ancora.»
25. «Fine degli annunci. Tutti a casa. Sì, anche voi due dietro la fontana.»

---

## 5. Muri

### 5.1 Manifesti della Tutela — 30 slogan
Carta stampata, rosso del regime su grigio latte; il ritratto o un disegno semplice; il timbro ОПЕКА 보호 in basso. La
propaganda è grossa, si vanta e si tradisce da sola. Si legge da lontano in un secondo.

1. LAVORA. PAGA LA RATA. DORMI. RIPETI.
2. IL GARANTE TI VEDE. ANCHE IN BAGNO.
3. CON LA POLARIS SEI QUALCUNO. SENZA, SEI A PIEDI.
4. CHI NON PAGA LA RATA DORME IN CASERMA.
5. IL GARANTE TI GUARDA. SORRIDI!
6. HAI FREDDO? SALTELLA!
7. LA NAVE ARRIVA DOMANI! (il «DOMANI» è un foglietto incollato sopra, nuovo ogni giorno)
8. FAMIGLIA · LAVORO · BERLINA
9. STAI ZITTO. È PIÙ SICURO.
10. LA FILA È BELLA! (disegno: una fila di gente che sorride)
11. UN FRIGORIFERO IN OGNI CASA! (A RATE)
12. SEI FELICE? ☐ SÌ ☐ SÌ, MOLTO
13. RAGAZZO, SCENDI DALLO SKATE E COMPRATI UNA POLARIS!
14. IL MARE È DELL'IMPERO. NON FARCI LA PIPÌ.
15. OGNI SCRITTA SUL MURO LA PAGA TUO PADRE.
16. HAI FIRMATO? FIRMA ANCORA!
17. DORMI TRANQUILLO: TI GUARDIAMO NOI.
18. MANGIA CARNE PATRIA. NON FARE DOMANDE.
19. IL TUO FUTURO L'HA GIÀ DECISO IL GARANTE. RILASSATI!
20. LA DOMENICA SI PASSEGGIA. IN SENSO ORARIO.
21. MAMMA, PAPÀ, IL GARANTE: UNA FAMIGLIA COMPLETA.
22. NON PENSARE. CI PENSIAMO NOI.
23. È INUTILE SCAPPARE. LA GUARDIA HA LE SCARPE NUOVE.
24. GRAZIE ALLE TUE RATE, IL GARANTE HA UNA VILLA NUOVA! (con la foto della villa)
25. VOTA SÌ! (non c'è nessuna votazione in corso)
26. HAI PERSO LA TESSERA DEL PANE? DIGIUNA!
27. SEGNALA IL TUO VICINO! VINCI UN PROSCIUTTO!
28. IL GARANTE HA TUTTI I CAPELLI. (foto del Garante col cappello)
29. UN GATTO REGISTRATO È UN GATTO FELICE. (nella foto il gatto è incazzatissimo)
30. LUCE A SERE ALTERNE: STASERA NON È LA TUA.

### 5.2 Biglietti scritti a mano — 30 (porte, portoni, pali, vetrine)
Carta a quadretti, pennarello, nastro adesivo; alcuni con le linguette da strappare. Sono arrabbiati, personali, meschini:
ognuno è una lite di condominio, e chi scrive si scopre peggio di chi accusa.

1. A CHI MI HA FREGATO LA BICI: SO CHI SEI, STRONZO. RIPORTALA.
2. PERSO GATTO ROSSO. SI CHIAMA GARANTE. NON CHIAMATELO FORTE IN PIAZZA.
3. CHI PISCIA NEL PORTONE: TI HO VISTO. LO DICO A TUA MOGLIE.
4. LE MUTANDE SUL FILO SONO MIE. CHI LE HA PRESE LE RIPORTI. LAVATE.
5. SECONDO PIANO: SE SUONI LA FISARMONICA ALLE 6 ANCORA, TE LA SFONDO.
6. VENDO FRIGO ICEBERG. NON FUNZIONA. MANCANO 14 RATE. UN AFFARE.
7. PERSA DENTIERA IN VIA ALTA. CHI LA TROVA NON SE LA PROVI, PORCO.
8. MATRIMONIO PINNA-SERRA, SABATO ORE 11. TUTTI INVITATI TRANNE GAVINO.
9. CHIUSO PER LUTTO. NON È MORTO NESSUNO: HO PERSO A CARTE. — IL BARBIERE
10. IL MURETTO NON È UNA RAMPA, STRONZI. L'HO FATTO IO CON LE MIE MANI.
11. LELLA HA IL PANE! CORRETE, CHE FINISCE! (sotto, altra penna: L'HO PRESO TUTTO IO)
12. A CHI HA RIGATO LA MIA POLARIS: TI AUGURO LA DIARREA ALLA PARATA.
13. SI RIPARANO RADIO. TUTTE. ANCHE QUELLE STRANE. BUSSARE TRE VOLTE.
14. NON SUONATE: IL CAMPANELLO DÀ LA SCOSSA. L'HO MESSO PER TE, LUIGI.
15. CHI FA CAGARE IL CANE QUI: DOMANI TE LA TROVI NELLA CASSETTA.
16. LE SCALE LE HO LAVATE IO. CHI SALE CON LE SCARPE SPORCHE MUORE.
17. AFFITTASI STANZA. NO SKATE, NO RADIO, NO FIDANZATE. SOPRATTUTTO NO.
18. CERCO DONNA PER IL LISCIO. SO BALLARE. HO LA MACCHINA. HO I DENTI.
19. PERSO CANE. È BRUTTO E MORDE. LO RIVOGLIO LO STESSO.
20. A CHI RUBA IL GIORNALE DAL MIO ZERBINO: C'È SOLO IL GARANTE. TIENILO.
21. VENDO ENCICLOPEDIA. MANCA IL 19. NON ROMPETE LE PALLE PER IL 19.
22. GRAZIE A CHI HA RIPORTATO A CASA LA NONNA. ORA RIDAI LA BORSA, LADRO.
23. SCAMBIO BOLLINI DELLA CARNE CON BOLLINI DELLO ZUCCHERO. NO GRIGI.
24. TERZO PIANO: IL LETTO CIGOLA. TUTTE LE NOTTI. COMPRATENE UNO NUOVO.
25. RIPETIZIONI DI MATEMATICA. SE TUO FIGLIO È SCEMO, COSTA DI PIÙ.
26. PORTONE CHIUSO ALLE 22. CHI ARRIVA DOPO DORME IN STRADA. SÌ, ANTONIO.
27. TONINO, SO CHE SEI STATO TU. — EFISIO
28. TONINO NON ABITA PIÙ QUI. NON BUSSATE. — TONINO
29. MAURO: HAI BUCATO IL MIO TETTO PER L'ANTENNA. TI HO VISTO. RIPARA.
30. VENDO LAVATRICE VORTICE 5. È SCAPPATA DUE VOLTE. VA LEGATA.

### 5.3 Scritte del Disgelo — 30 (solo il testo)
Spray, gesso, stencil; vanno vicino all'onda. Corte, sgarbate, leggibili da lontano. Quelle segnate (→) sono «mappe operative»
(MANIFESTO §2): chi le dipinge e dove lo decide l'altro gruppo, qui c'è solo il testo.

1. NO
2. DISGELO
3. GARANTE PELATO
4. 94% DI STOCAZZO
5. BANCO LADRO
6. SKATE NON È REATO
7. GUARDONE (sotto il manifesto 5.1.2, «IL GARANTE TI VEDE. ANCHE IN BAGNO»)
8. GRIGIO: COLORE DI MERDA
9. LA NAVE NON ARRIVA, SVEGLIA!
10. NON FIRMARE
11. VAFFANCULO LA RATA
12. TONINO SEI MORTO — EFISIO
13. CARNE PATRIA = GATTO
14. LA NEBBIA È NOSTRA
15. FERRI PRENDE LE BUSTE
16. GINO METTI LA BIRRA FREDDA
17. QUI HA PISCIATO IL GARANTE
18. ABBASSA IL VOLUME, PELATO
19. MAURO SPIONE
20. HO SCRITTO IO. — FELPA VERDE
21. ZIA ASCOLTA (→ vicino al Bar Sirena: avviso)
22. QUI NIENTE ORECCHIE (→ posto sicuro)
23. CALDO → (→ la grata o la presa calda più vicina)
24. TOMBINO ↓ (→ tombino aperto)
25. RAMPA OK (→ rampa pulita dal ghiaccio)
26. GRIGI ALLE 23 (→ passa la ronda)
27. CAREZZA? TOCCAMI E VEDI
28. CORRI ZIO
29. FRA, RESTA
30. IL GRIGIO HA LA PANCIA. CORRI E BASTA

Tag di firma delle crew (per i pezzi grandi): **SKIROKKO**, **RAMPA 7**, **I GABBIANI**, **TOPI**, **GELO86**, **VAPORE**,
**SCARAFAGGI**, **LA CALATA**.

---

## 6. Nomi

### 6.1 Quaranta botteghe con l'insegna
Formato: **nome** (uso in `USES`/`MINORI`) — `INSEGNA` come è dipinta — il cartello in vetrina o la cosa che si nota.
Il nome sembra vero; la battuta sta nel cartello, che si legge in un secondo. L'insegna resta in italiano come oggi nel codice;
per le botteghe con licenza della Tutela (tabacchi, farmacia, Banco) si può aggiungere la riga di sotto in cirillico/coreano
(BIBBIA §2.4), per esempio ФАРМАЦИЯ 약국.

| # | Nome (uso) | Insegna | In vetrina / il dettaglio |
|---|---|---|---|
| 1 | Bar Ritorno (bar) | BAR RITORNO | «Chi vomita pulisce. Chi non paga, non ritorna.» |
| 2 | Bar dell'Ultimo (bar) | BAR DELL'ULTIMO | «Ultimo giro alle 23:50. Chi dice "l'ultimo, giuro" paga doppio.» |
| 3 | Bar Tranquillo (bar) | BAR TRANQUILLO | sotto, a pennarello: «ultima rissa: ieri» |
| 4 | Caffè Nazionale (bar, portici) | CAFFÈ NAZIONALE | «Vietato parlare di politica, di calcio e di mia moglie.» |
| 5 | Osteria Il Debito (trattoria) | OSTERIA IL DEBITO | «Si paga prima. Sì, anche tu, Tonino.» |
| 6 | Osteria da Mimmo Zitto (trattoria) | VINI E CUCINA DA MIMMO | «Mimmo non ha visto niente. Nemmeno voi.» |
| 7 | Trattoria La Rata (trattoria) | TRATTORIA LA RATA | «Oggi: pasta. Ieri: pasta. Domani: indovina.» |
| 8 | Barbiere Gavino (barbiere) | BARBIERE GAVINO | «Taglio 2.000. Se ti muovi, l'orecchio è gratis.» |
| 9 | Salone Nello (barbiere) | SALONE NELLO · UOMO DONNA | «Qui si parla di calcio. E di chi va a letto con chi.» |
| 10 | Ferramenta Tutto Chiude (ferramenta) | FERRAMENTA TUTTO CHIUDE | lucchetti a grappoli; «Copie di chiavi in 5 minuti. Non chiedo di chi sono.» |
| 11 | Ferramenta F.lli Usai (ferramenta) | F.LLI USAI | «NON VENDIAMO BOMBOLETTE.» (dalla porta sul retro esce un ragazzo con tre bombolette) |
| 12 | Lavanderia Bianco di Stato (lavanderia) | LAVANDERIA BIANCO DI STATO | «Togliamo tutte le macchie. Pure quelle rosse. Non chiediamo.» |
| 13 | Tintoria Dolores (lavanderia) | TINTORIA DOLORES | «Tingiamo in grigio. Chi vuole il rosso, se ne va.» |
| 14 | Tabacchi Fumo Lento (tabacchi) | TABACCHI · ТАБАК | «Le americane non esistono. Chiedetele a voce bassa.» |
| 15 | Panetteria Pane Domani (panetteria) | PANETTERIA PANE DOMANI | cartello fisso, scolorito dal sole: «OGGI FINITO» |
| 16 | Farmacia della Pazienza (farmacia) | ✚ FARMACIA DELLA PAZIENZA | «Aspirina: finita. Supposte: tantissime.» |
| 17 | Drogheria Pina (drogheria) | DROGHERIA PINA | «Spezie, caffè, e tutti i fatti vostri.» |
| 18 | Calzolaio Totò (calzolaio) | CALZOLAIO TOTÒ | «Si risuolano ciabatte. Anche quelle tirate alla TV.» |
| 19 | Latteria La Mucca Contenta (latteria) | LATTERIA LA MUCCA CONTENTA | «Latte in polvere. La mucca è scappata.» |
| 20 | Merceria Il Filo (merceria) | MERCERIA IL FILO | «Ricuciamo tutto. Anche i pantaloni della rissa di sabato.» |
| 21 | Frutta e Verdura Peppino (fruttivendolo) | FRUTTA E VERDURA PEPPINO | «Arance: giovedì. Forse. Non rompete.» (cassetta vuota con la foto di un'arancia) |
| 22 | Pescheria Serra (pescheria) | PESCHERIA SERRA · PESCE FRESCO | in città la chiamano «Puzza di Ieri» |
| 23 | Orologeria L'Ora Esatta (orologiaio) | OROLOGERIA L'ORA ESATTA | ogni orologio in vetrina segna un'ora diversa; «Chiuso per pranzo. Torno alle boh.» |
| 24 | Cartoleria Carta Bollata (cartoleria) | CARTOLERIA CARTA BOLLATA | «Moduli 31-L: finiti. Lamentatevi a casa.» |
| 25 | Profumeria Brina (profumeria) | PROFUMERIA BRINA | «Profumi per lui. Perché lui puzza.» |
| 26 | Elettrodomestici Il Futuro (elettrodomestici) | IL FUTURO · A RATE | un Iceberg in vetrina col fiocco e il cartellino «3.000 al mese. Per sempre.» |
| 27 | Mobili Casa Ferma (mobili) | MOBILI CASA FERMA | «Divani in finta pelle. D'estate ti si attaccano al culo.» |
| 28 | Boutique Monique (abbigliamento) | BOUTIQUE MONIQUE | la tiene Maria Loi, che si fa chiamare Monique; «Moda di Parigi. Cucita di sopra da mia zia.» |
| 29 | Gioielleria Oro di Famiglia (orologiaio) | GIOIELLERIA ORO DI FAMIGLIA | «Compro oro. Non chiedo da dove viene. Giuro.» |
| 30 | Libreria Pagine Approvate (cartoleria) | LIBRERIA | uno scaffale solo, tutti i libri con la faccia del Garante in copertina |
| 31 | Palestra Ercole (palestra) | PALESTRA ERCOLE | «Pesi, sacco, lotta. I Grigi entrano gratis, purtroppo.» |
| 32 | Autorimessa da Bruno (autorimessa) | AUTORIMESSA · RIPARAZIONI POLARIS | «Ripariamo Polaris. Sempre le stesse. Ogni settimana.» |
| 33 | Birreria La Schiuma (pub) | BIRRERIA LA SCHIUMA | «Birra alla spina. Calda. Non si discute.» |
| 34 | Onoranze Funebri Sereno (nuovo uso: pompe funebri) | ONORANZE FUNEBRI SERENO | «Ci vediamo presto!» |
| 35 | Foto Lampo (nuovo uso: fotografo) | FOTO LAMPO · FOTOTESSERE | «Fototessere in un minuto. Se vieni brutto, è colpa tua.» |
| 36 | Macelleria Lai (nuovo uso: macelleria) | MACELLERIA LAI | gatto grasso in vetrina col cartello «È NOSTRO. NON È IN VENDITA.» |
| 37 | Pasticceria Fontana (nuovo uso: pasticceria) | PASTICCERIA FONTANA | «Torte per matrimoni, battesimi e divorzi.» |
| 38 | Parrucchiera Wanda (nuovo uso: parrucchiera) | ACCONCIATURE WANDA | «Permanente in quattro ore. Vi racconto tutto di tutti.» |
| 39 | Sala da ballo Stella Polare (nuovo uso: sala da ballo) | SALA DA BALLO STELLA POLARE | «Liscio il venerdì. Vietato strusciarsi. Ballate e basta.» |
| 40 | Banco dei Pegni (nuovo uso: monte dei pegni) | MONTE DEI PEGNI · ЛОМБАРД | la fila del lunedì; «Prendiamo tutto: fedi, orologi, denti d'oro.» |

Nota tecnica (per chi le mette): i nomi 34–40 sono usi che `USES`/`MINORI` non hanno. Quelli 1–33 si possono mettere nelle liste
che ci sono già, al posto di «Bar Tina» e «Ferramenta Bruno». Tenere la regola del codice: insegna = nome solo se sta in 18
caratteri, altrimenti la parola del mestiere. Non toccare i locali con nome (Bar Da Gino, Sirena, Wu, Flipper, Videoteca, Lavanderia
Stella, Tipografia Totò).

### 6.2 Venti soprannomi di palazzi e condomini
I nomi che usa la gente (nelle battute, nei biglietti, nei pettegolezzi); il nome ufficiale resta sulla targa (Ente Case del
Garante, lotto n.).

1. **Il Frigorifero**: il palazzone bianco, gelato; tutti dentro hanno l'Iceberg a rate e nessuno ha la stufa.
2. **Palazzo Trent'Anni**: la stecca INA-Casa; trent'anni di mutuo, trenta famiglie, un ascensore, trenta litigi.
3. **Palazzo Pazienza**: l'ascensore è rotto dal '79. Al sesto piano c'è uno che non scende dal '79.
4. **Il Termosifone**: l'unico col riscaldamento centrale. Odiato da tutto il quartiere, che va a scroccare il caffè.
5. **Palazzo Silenzio**: ci abitano i Grigi con le famiglie. Nessuno ci passa davanti, nemmeno i gatti.
6. **Le Orecchie**: quello davanti al Bar Sirena; da ogni finestra si sente il bar, e il bar sente ogni finestra.
7. **La Nave**: lungo e stretto, col vento oscilla, al quinto piano si vomita.
8. **Il Formicaio**: dodici scale, nessuno sa quanta gente ci abiti, il censimento ha rinunciato.
9. **Il Comò**: basso, largo, tanti cassetti; ogni famiglia ci nasconde qualcosa, di solito un parente.
10. **Palazzo dei Panni**: il bucato steso sempre, anche quando piove; la facciata non l'ha mai vista nessuno.
11. **La Scatoletta**: case minime per gli operai della miniera, tutte uguali, come la Carne Patria.
12. **Il Purgatorio**: a metà fra le baracche e i palazzi buoni; quelli di sopra e quelli di sotto si odiano.
13. **La Ringhiera**: a ballatoio; si sa chi esce, con chi e a che ora, e lo si urla.
14. **Il Transatlantico**: la torre del boom con le terrazze; ci stanno quelli che si credono arrivati.
15. **La Cassaforte**: un palazzo normale con le inferriate a tutti i piani. Ci abitano amici della Famiglia.
16. **Palazzo Bollettino**: gli inquilini sanno tutto prima della TV, perché lo inventano loro.
17. **Il Barattolo**: cilindrico (il serbatoio vecchio riadattato a case); se uno scoreggia, lo sentono tutti.
18. **Le Gemelle**: due palazzine identiche; le due famiglie dell'ultimo piano non si parlano dal '72 per un parcheggio.
19. **Il Lazzaretto**: l'umido sale fino al terzo piano. Sul citofono qualcuno ha scritto «MUFFA».
20. **La Vedetta**: l'ultimo piano guarda il porto; chi ci abita vede arrivare la nave per primo e affitta il balcone.

### 6.3 Il nome delle case: come chiamare una casa per chi ci abita davvero

**Perché oggi esce 21 volte «Casa Fadda».** In `world_cittanuova.js` (riga ~3053) l'etichetta si decide prima della gente:
`'Casa ' + COGNOMI[hash2(b.x, b.y, 21) * 30]`, su una lista di 30 cognomi, e l'hash su coordinate vicine si raggruppa. Poi
`popolo.js` (riga ~334) dà alla famiglia della casa un cognome **suo**, scelto a caso fra 60 (`pick(r, COGNOMI)`). Così sulla
porta c'è scritto Fadda e dentro abitano i Murgia. E Fadda è anche il cognome della dottoressa Bonaria Fadda (`lucia`): il
giocatore crede che siano tutte case sue.

**Le regole** (da applicare quando Popolo ha messo le famiglie nelle case, cioè l'etichetta la scrive Popolo e non World):
1. **La casa porta il cognome del capofamiglia che ci abita.** Una famiglia: «Casa Murgia». Due famiglie: «Casa Pinna-Usai»
   (prima chi ci sta da più tempo). Tre o più famiglie nello stesso portone: il **soprannome del palazzo** (6.2) o
   «Palazzo Ledda» dal cognome più numeroso, e i cognomi sul citofono (interno: lista).
2. **Coinquilini giovani** (il ramo `coinquilino` di popolo.js): «la casa dei ragazzi» o «Casa dei Carta e altri», mai il cognome
   di uno solo.
3. **Chi vive solo**: nome e cognome se anziano («Casa di Nives Porcu»), il cognome se adulto; la vedova «Casa della vedova Loi».
4. **Casa vuota**: «Casa sfitta» oppure, se è dell'Ente, «Alloggio dell'Ente n. 14». Una casa da cui hanno portato via
   qualcuno (rettificato) **tiene il suo nome**: è la memoria del quartiere, e la gente lo sa (vedi Rosa Amato).
5. **Il cast ha la precedenza**: nessuna casa generata usa il cognome di un personaggio del cast nello stesso quartiere (Fadda,
   Ganz, Carli, Sanna, Mura, Pinna, Deiana, Vitale, Amato, Galli, Neri, Esposito, Sala…), così il giocatore non si confonde.
6. **Mai lo stesso cognome più di due volte entro 80 m**, e mai sulla stessa strada di fila; se la sorte lo ripete, scatta il
   nome di battesimo («Casa di Tore Murgia»): due Murgia nella stessa via sono parenti, e lo si dice (vedi 7).
7. **Il soprannome batte il cognome** quando c'è: la gente dice «da Mimmo Zitto», «quelli della Polaris»,
   «la casa del gallo» (la lettera al Garante sul vicino col gallo c'è già nel gioco). Uno su sei, per i più chiacchieroni.
8. **Parenti vicini**: se due case della stessa via hanno lo stesso cognome, la seconda diventa «Casa Murgia (il fratello)» o
   «i Murgia di sopra». È una battuta gratis e rende la città una rete.
9. **Botteghe sotto casa** (`shopFront`): la bottega ha il suo nome, il portone accanto ha il nome della famiglia; spesso è la
   stessa («Macelleria Lai» e sopra «Casa Lai»): ma solo se il bottegaio abita lì davvero.
10. **Lista cognomi**: usare quella di popolo.js (60 nomi), non quella di World (30), e aggiungerne 30 del sud e del porto
    (Scognamiglio, Cuccuru, Lecca, Mereu, Sechi, Erriu, Pala, Frau, Congiu, Pusceddu, Iervolino, Capasso, Russo, Barra, Tedde,
    Ghiani, Asara, Serreli, Mastino, Uda, Sulis, Pirisi, Mocci, Lostia, Farris, Garau, Pittau, Cadoni, Demontis, Muscas).

---

## 7. «L'Eco della Tutela»

Il quotidiano del regime (accanto a ПРАВДА ОСТРОВА e IL GARANTE): due fogli, la foto del Garante sempre uguale, l'oroscopo
uguale per tutti i segni. In mano a chi legge sulla panchina e all'edicola (posa `legge_su`), appallottolato nei barili del
fuoco, a fare da tovaglia all'osteria. I titoli sono propaganda gonfia che si sputtana da sola.

### 7.1 Trenta titoli
1. LA NAVE ARRIVA DOMANI! (COME IERI)
2. FELICITÀ AL 94%! IL RESTO SONO GUFI
3. IL GARANTE SEGNA SEI GOL DI TESTA. «UN FENOMENO», DICE IL GARANTE
4. GATTO GRAFFIA IL GARANTE: ARRESTATO IL GATTO
5. PANE: IL GARANTE L'HA ASSAGGIATO. «BUONISSIMO»
6. FATTO IL DITO AL GARANTE: SI CERCA UNA FELPA VERDE
7. NUOVO PARCHEGGIO IN CENTRO. C'È UNA MACCHINA: QUELLA DEL GARANTE
8. UN CITTADINO SU TRE HA IL FRIGO. GLI ALTRI DUE SONO INVIDIOSI
9. PIOVE: È COLPA DEI MARSIGLIESI
10. CROLLA IL MOLO VECCHIO. L'ENTE: «L'AVEVAMO DETTO NOI»
11. LA RADIO PIRATA NON ESISTE. DOMANI LA CHIUDIAMO
12. FERMATO UOMO CHE FISCHIETTAVA. I VICINI: «ERA ANCHE STONATO»
13. SELEZIONE DELL'ISOLA 10, CAMERIERI DEL PALAZZO 0
14. CENSIMENTO GATTI: SONO 4.200. TRE SONO SOSPETTI
15. CODE PIÙ CORTE! LE ABBIAMO DIVISE IN DUE
16. IL CARBONE C'È! È TUTTO NEL MAGAZZINO DEL GARANTE
17. IL BANCO ABBASSA LE RATE DI 10 LIRE. FESTA IN PIAZZA
18. PAGA L'ULTIMA RATA E SVIENE DI GIOIA. IL BANCO: «SUBITO UN'ALTRA»
19. BOOM DI MATRIMONI: TUTTI VOGLIONO IL FRIGO IN REGALO
20. UN ANNO SENZA RAPINE! (TRANNE QUATTRO)
21. IL GARANTE NON DORME MAI. I MEDICI: «È UN SUPEREROE»
22. RIPITTURATI 400 METRI DI MURI. STAMATTINA C'ERA DI NUOVO «PELATO»
23. BALCONE PIÙ ORDINATO: VINCE LA SIGNORA BUSSU. LE VICINE: «HA BARATO»
24. NEBBIA: LA GUARDIA ARRESTA UN LAMPIONE
25. SKATE: I RAGAZZI CHIEDONO UN POSTO. AVRANNO IL CORTILE DELLA CASERMA
26. DISCOTECA LUNA: SEQUESTRATO UN DISCO TROPPO ALLEGRO
27. LUCE A SERE ALTERNE: RISSA FRA PARI E DISPARI IN VIA ROMA
28. VIA CAVOUR: TONINO SMENTISCE TUTTO E PARTE PER IL CONTINENTE
29. MARE GROSSO: LA MOTOVEDETTA NON ESCE. IL CAPITANO HA LA NAUSEA
30. OROSCOPO: TUTTI I SEGNI, SETTIMANA OTTIMA. ORDINE DEL GARANTE

### 7.2 Quindici piccoli annunci
1. VENDO POLARIS. MAI USATA. MIA MOGLIE NON LO SA. CHIAMARE DI GIORNO.
2. VEDOVA ALLEGRA CERCA SIGNORE CON STUFA. LA STUFA È IMPORTANTE.
3. CEDO POSTO IN FILA AL FORNO, QUARTO. 500 LIRE. NON TRATTO, PEZZENTI.
4. CERCO VOLUME 19. PAGO BENE. NON CHIAMATE PER SCHERZO, STRONZI.
5. SCAMBIO DENTIERA COME NUOVA CON DUE LAMPADINE DA 60.
6. PENSIONATO FA IL TESTIMONE: MATRIMONI, INCIDENTI, RISSE. VEDO POCO.
7. PERSA FEDE AL MOLO. SE TROVATE ANCHE MIO MARITO, TENETEVELO.
8. REGALO GATTINI REGISTRATI. QUELLO CHE MORDE I GRIGI COSTA DI PIÙ.
9. SIGNORINA DÀ LEZIONI DI BUONE MANIERE. AI GRIGI GRATIS, POVERINI.
10. CERCASI FISARMONICISTA PER FUNERALE ALLEGRO. IL MORTO HA INSISTITO.
11. VENDO TV OCCHIO SERALE. PRENDE SOLO IL GARANTE. VI PREGO, PRENDETELA.
12. CERCO STANZA. SONO TRANQUILLO. NON BEVO. QUASI MAI. QUASI.
13. COMPRO BOTTONI. TANTI. NON CHIEDETE PERCHÉ.
14. RAGAZZO FA LA FILA AL POSTO VOSTRO. 300 LIRE L'ORA. SE PIOVE, 500.
15. VENDO GESSO E COLLA. TANTA COLLA. CHIEDERE DI MADRE DOPO LE 18. (in codice: la Risacca)

---

## 8. Il calendario della città: la settimana

Fasce: **alba** 5–7 · **mattina** 7–12 · **mezzogiorno** 12–14 · **pomeriggio** 14–18 · **sera** 18–24 · **notte** 0–5 (l'Ora
Quieta, dalle 22 con la Repressione a 4). La partita comincia **martedì alle 18**: la sera del martedì è la prima impressione, ed
è la più piena.

Legenda dello stato:
- **[ESISTE id]**: c'è già in `popolo.js RECURRING` (giorno, ore, id). Le voci attuali: `pesce` ogni giorno 6–8 al `molo`;
  `bollettino` lun 9–10 in `piazza`; `affitto` lun 8–9; `mercato` mer e sab 7–13 in `piazza`; `tombola` gio 21–23 al `circolo`;
  `paga` ven 18–19; `sabato` sab 22–03 alla `disco`; `messa` dom 10–11 in `chiesa`; `struscio` dom 17–20 sul `lungomare`;
  `vespro` ogni giorno 18–19 in `chiesa`.
- **[POSTO tipo]**: c'è il tipo di posto in posti.js (`fila`, `cypher`, `parata`, `banco_pesce`, `carico`, `mercato`, `sagrato`,
  `dehors`, `edicola`, `calata`, `fuoco`, `portone`…), ma non come evento del calendario.
- **[SISTEMA]**: c'è come sistema (il Garante alle 20, le mazzette del venerdì notte, i conti al capo alle 23, la nave).
- **[NUOVO]**: da aggiungere a `RECURRING` (una riga) con i posti per le pose. **[POSA NUOVA]** / **[OGGETTO]**: serve
  una posa o una cosa in mano che oggi non c'è: è del gruppo dei personaggi (vedi §9).

Pose usate (tutte già in `anim_vita.js`/FPOSE salvo segnate): `aspetta`, `siede`, `siede_terra`, `fuma_su`, `tasche_su`,
`braccia_su`, `orologio_su`, `legge_su`, `appoggiato`, `discute_su`, `dietro_su`, `osserva`, `scalda`, `lavora`, `raccoglie`,
`merce`, `martella`, `porge`, `indica_su`, `saluta_su`, `telefona_su`, `balla`.

### 8.0 Ogni giorno (lo strato di base)
| Fascia | Evento | Luogo | Gente | Cosa fanno (pose) | Battute | Stato |
|---|---|---|---|---|---|---|
| alba | Asta del pesce | `molo` / Piazza della Marina (banco_pesce) | 15–25 | `merce`, `aspetta`, `indica_su`, `discute_su` | «È fresco?» «L'ho pescato io stamattina! Con queste mani! …Va bene, ieri.» | [ESISTE pesce] |
| alba | La fila al Forno di Lella e da Wu | Forno, Alimentari Wu (6–9) | 8–20 | `aspetta`, `tasche_su`, `orologio_su`, `scalda` | «Chi è l'ultimo?» «Io! Ma tengo il posto a mia sorella, a mio cognato e a un signore!» | [POSTO fila] |
| alba | I pescherecci escono | darsena, pontili | 6–8 a bordo | `lavora` | «Tira tu la rete, io comando!» «Comandi cosa? La barca è mia!» | [SISTEMA] |
| mattina | Edicola: chi legge l'Eco in piedi | edicole | 3–6 | `legge_su`, `fuma_su` | «Me lo presti?» «Compratelo!» «Costa!» «E allora leggi da sopra la spalla, scroccone!» | [POSTO edicola] |
| mezzogiorno | La sirena delle 12, la pausa ai portici | Vittoria, scalo, stazione | 10–20 | `siede_terra`, `fuma_su`, `siede` | «Mi dai un pezzo di panino?» «No.» «Ti ho dato una sigaretta ieri!» «Era mia!» | [NUOVO] |
| pomeriggio | Vecchi al fuoco nel barile | lotti vuoti, calata | 3–6 | `scalda`, `appoggiato` | «Nel '62 ho steso tre Grigi da solo!» «Nel '62 scappavi più veloce di tutti!» | [POSTO fuoco] |
| sera | Vespro a San Rocco | `chiesa` | 10–20 | `aspetta`, `dietro_su` sul sagrato | «Signore, fammi vincere al Lotto. Solo a me, eh. Agli altri no.» | [ESISTE vespro] |
| sera | Il Garante alle 20 | ogni bar, Piazza Grande (schermo) | 6–15 per bar, 30 in piazza | `siede`, `osserva`, `braccia_su` | le reazioni di §1 | [SISTEMA] |
| sera / notte | Il cypher alla grata del vapore | grata della stazione, baracche (20–02) | 6–14 giovani | `scalda`, `braccia_su`, `discute_su`, `balla` | «Garante pelato, sei solo un…» «Fra, i Grigi!» «…un grande! Sei un grande!» | [POSTO cypher] |
| notte | La ronda dei Grigi a coppie | vie larghe, piazze | 2 + 2 | camminata, `osserva`, `indica_su` | «Centrale, tutto tranquillo.» (uno gli passa davanti con la sua bici) «…LA MIA BICI!» | [SISTEMA] |
| notte | Il forno acceso: Lella e i garzoni | Forno (dalle 3) | 3 | `lavora`, ombre alla finestra | «Impasti tu?» «Io ho impastato ieri.» «Ieri hai dormito sui sacchi!» | [NUOVO] |

### 8.1 Lunedì — la nave, l'affitto, il Bollettino
| Fascia | Evento | Luogo | Gente | Pose | Battute | Stato |
|---|---|---|---|---|---|---|
| alba | **La fila per la nave dell'Impero** | davanti al Recinto / molo dell'Impero (porto cargo) | 40–70 | `aspetta`, `scalda` ai barili, `tasche_su`, `indica_su` verso il mare | «Mi hai rubato il posto!» «Sono qui dalle quattro!» «Ti ho visto arrivare adesso!» | [SISTEMA nave] → [NUOVO] come evento |
| alba | Fila al Monte dei Pegni (prima dell'affitto) | Banco dei Pegni (6.1 n. 40) | 8–12 | `aspetta`, `porge` | «Questo anello era di mia madre.» «E lei lo sa che lo porti qui?» «…No.» | [NUOVO] |
| mattina | **L'affitto**: sportello dell'Ente Case | Ente Case del Garante | 15–25 | `aspetta`, `orologio_su`, `discute_su` | «Dodicimila?! La settimana scorsa erano diecimila!» «E la prossima quattordici. Avanti!» | [ESISTE affitto] |
| mattina | **Lettura del Bollettino** | `piazza` (Piazza Grande) | 60–100 | `aspetta`, `braccia_su`, `legge_su` (chi segue sul foglio) | il lettore: «…e il grano arriva lunedì!» uno dal fondo: «OGGI È LUNEDÌ!» Il lettore: «…Chi l'ha detto?» Tutti: «Lui!» | [ESISTE bollettino] |
| mattina | Gli imbianchini della Tutela coprono le scritte | muri della stazione e della Vittoria | 3–4 + 6 che guardano | `lavora`, `osserva` | «Domani lo riscrivono.» «Meglio! Mi pagano a metro!» (poi, piano) «Anzi, scrivilo più grande.» | [NUOVO] [OGGETTO rullo] |
| mezzogiorno | Lo scarico della nave: la catena dei facchini | porto cargo, carri merci (posto `carico`) | 20–30 | `lavora` in fila, `porge` | «Questa la porti tu, è pesante.» «E tu che porti?» «Io conto le casse.» | [POSTO carico] |
| pomeriggio | Calcio nel vicolo, porta disegnata col gesso | Vico della Fame, Salita dei Gatti | 8–12 ragazzi + 3 vecchi a guardare | corsa, `osserva`, `braccia_su` | «Gol!» «Era fuori!» «Il pallone è mio! Se dico gol, è gol!» | [NUOVO] [POSA NUOVA calcio] [OGGETTO pallone] |
| sera | La fila da Wu per le cose della nave | Alimentari Wu | 15–25 | `aspetta`, `discute_su` | «Lo zucchero c'è?» «Ultimo pacco.» «È mio!» «L'ho toccato prima io!» | [POSTO fila] |
| sera | Lunedì al bar: chi ha pagato l'affitto non beve | Bar Da Gino, osterie | 4–6 a bar, pochi | `siede`, `fuma_su` | «Un bicchiere d'acqua.» «Ma se ieri offrivi a tutti, sbruffone!» «Ieri era domenica!» | [NUOVO] (è densità bassa voluta) |
| notte | Le casse «perse» della nave al Pontile Est | Pontile Est, calata | 3 Marsigliesi + 4 facchini | `lavora`, `porge`, `osserva` | «Questa cassa la prendo io. Voi quella vuota. Ça va? Ça va.» | [SISTEMA Marsigliesi] |

### 8.2 Martedì — la giornata qualunque (e la prima sera del giocatore)
| Fascia | Evento | Luogo | Gente | Pose | Battute | Stato |
|---|---|---|---|---|---|---|
| alba | Le mogli dei pescatori sul molo a guardare il mare | molo, scala dei pescatori | 4–6 | `appoggiato`, `braccia_su`, `osserva` | «Se non torna entro le sette, la barca la vendo io!» | [NUOVO] |
| mattina | **L'Ufficio Lamentele, dalle 9 alle 9 e 15** | Uffici del Garante (corpo di guardia) | 30 in fila, poi tutti via di colpo alle 9:15 | `aspetta`, `orologio_su`, poi via | «Mi lamento!» «Di cosa?» «Che chiudete alle nove e un quarto!» «Sono le nove e sedici. Fuori!» | [NUOVO] (la fila che sparisce in un minuto è uno spettacolo) |
| mattina | Il bucato del martedì | cortili, ballatoi, stenditoi | 6–10 donne e uomini | `lavora` (stenditoio), `discute_su` da balcone a balcone | «Signora, le sue mutande gocciolano sulle mie!» «Le mie sono pulite! Le sue no!» | [POSTO stenditoio] |
| mezzogiorno | Carne con la tessera: la fila in macelleria | Macelleria Lai | 10–15 | `aspetta`, `discute_su` | «Due etti.» «Hai bollini per uno.» «Allora prendo i bollini della nonna. Tanto lei non mangia.» | [NUOVO] |
| pomeriggio | Carte e morra fuori dall'osteria | Osteria del Porto, Il Debito (dehors) | 6–8 | `siede`, `discute_su`, `braccia_su` | «Hai barato!» «Io? Mai!» (gli cade un asso dalla manica) «…Quello era già lì.» | [POSTO dehors] |
| pomeriggio | Le prove della banda della Tutela | Piazza Grande | 8–12 suonatori + 10 che guardano | `lavora` (suonare) | il maestro: «Chi ha fatto la pernacchia con la tromba?! CHI?!» il trombettista: «Il tamburo!» | [NUOVO] [POSA NUOVA suonare] [OGGETTO strumenti] |
| sera | **Il passeggio corto della Rua Maestra** (18–20) | Rua Maestra, Corso | 30–50 | camminata a coppie, `saluta_su`, `appoggiato` | «Ti saluto quella ragazza.» «Vai!» «…Vai tu, che io ho il raffreddore.» | [NUOVO] |
| sera | **La lite dal balcone** | via Cavour (il terzo piano!) | 2 ai balconi + 10–15 sotto | `discute_su` (balcone), `osserva`, `indica_su` (sotto) | Efisio: «TONINO È LÌ DENTRO?!» lei: «No! È sotto il letto! …Cioè, non c'è!» uno sotto: «Efisio, se lo trovi, mi deve diecimila!» | [NUOVO] (scena, si aggancia a §1.5) |
| sera | Il Garante alle 20, primo della partita | Bar Da Gino, Piazza Grande | 12 / 30 | `siede`, `osserva` | trasmissione 1.1 (il freddo) | [SISTEMA] |
| notte | Gli attacchini della Risacca | portoni, pali | 2–3, di nascosto | `lavora` veloce, `osserva` | «Tu attacca, io faccio il palo.» «Fai il palo sempre tu!» «Perché sono bravo!» | [SISTEMA Risacca] |
| notte | L'ultimo bar che chiude: tre che cantano | Bar dell'Ultimo | 3 | `appoggiato`, `braccia_su` | il barista: «Fuori!» uno: «Gino, offro io!» «Allora entra.» «…Non ho i soldi.» «Fuori!» | [NUOVO] |

### 8.3 Mercoledì — il mercato e il funerale
| Fascia | Evento | Luogo | Gente | Pose | Battute | Stato |
|---|---|---|---|---|---|---|
| alba | Il montaggio dei banchi | Mercato ottagonale, `piazza` | 10–14 | `lavora`, `raccoglie`, posto `carico` | «Questo è il mio posto da trent'anni!» «Da ieri è dell'Ente! Sposta il culo!» | [NUOVO] |
| mattina | **Il mercato rionale** | `piazza`, Mercato ottagonale | 60–120 | `merce`, `aspetta`, `discute_su`, `porge` | «Ladro!» «Grazie, signora. Fanno tremila.» / «Pesi giusto?» «Giustissimo!» (ha il pollice sulla bilancia) | [ESISTE mercato] |
| mattina | Il banditore delle pentole a rate | angolo del mercato | 1 + 15–20 in cerchio | `braccia_su`, `indica_su` / `osserva` | «UNA PENTOLA! DUE PENTOLE! UNA VITA DI PENTOLE! TREMILA AL MESE!» «E se muoio?» «Paga sua moglie!» | [NUOVO] |
| mattina | Le comari del sagrato (Marta e le altre) | sagrato di San Rocco | 4–6 | `discute_su`, `dietro_su` | «Io non dico niente, eh.» «E allora dillo!» «La Pinna va dal macellaio tre volte al giorno!» | [POSTO sagrato] |
| mezzogiorno | Si smonta il mercato; i ragazzi raccolgono gli scarti | `piazza` | 6–8 | `raccoglie`, `porge` | «Fra, dividiamo: io la mela buona, tu quella col verme.» | [NUOVO] |
| pomeriggio | **Il funerale** (a giorni: uno su due mercoledì) | da San Rocco lungo la Vittoria | 30–50 dietro la bara | `dietro_su`, `aspetta`, testa bassa; chi passa si toglie il cappello | «Era una brava persona.» «Mi doveva cinquemila!» «Pure a me! …Chi glieli chiede, adesso?» / il nipote, piano: «L'orologio del nonno chi se lo prende?» | [NUOVO] [POSA NUOVA portare la bara] |
| pomeriggio | Skate alla rampa dello scalo | rampa di carico dello scalo | 6–10 giovani | corsa, `appoggiato`, `osserva` | «Arriva il Grigio!» «Quanto lontano?» «Ha la pancia. Un altro giro ci sta!» | [NUOVO] (skate: del gruppo personaggi/veicoli) |
| sera | La fila al Cinema Astor per il film approvato | Piazza Grande | 20–40 | `aspetta`, `fuma_su`, coppie | «"Il Grano del Gelo" di nuovo?! L'ho visto sei volte!» «E perché sei in fila?» «Al buio si bacia.» | [NUOVO] |
| sera | Il Garante | bar | — | — | trasmissione a rotazione | [SISTEMA] |
| notte | La ronda dei vicini contro i furti | baracche, Il Purgatorio | 4–6 con le torce | `osserva`, `indica_su` | «Chi va là?» «Tuo cugino!» «E che ci fai con la mia bici?!» «…La riportavo!» | [NUOVO] (c'è in BIBBIA §4.7, non nel calendario) |

### 8.4 Giovedì — la seconda nave, le madri, la tombola
| Fascia | Evento | Luogo | Gente | Pose | Battute | Stato |
|---|---|---|---|---|---|---|
| alba | La fila per la seconda nave | Recinto / porto cargo | 30–50 (meno del lunedì) | `aspetta`, `scalda` | «Tienimi il posto, vado a pisciare.» (torna dopo un'ora col caffè) «Dov'eri?!» «A pisciare!» | [SISTEMA nave] → [NUOVO] |
| mattina | Il giovedì delle «americane» sotto i portici | portici della Vittoria | 3–4 venditori + clienti che passano | `appoggiato`, `tasche_su`, `porge` di nascosto | «Bionde?» «Non esistono.» «Dammene due pacchetti, dai!» | [NUOVO] (gente di sotto che sale) |
| mattina | Lo sportello delle rate al Banco | Banco | 15–25 | `aspetta`, `orologio_su`, `discute_su` | «Ho pagato la rata del frigo!» «Manca la RataSicura.» «Ma vaffanculo, tu e la RataSicura!» | [NUOVO] |
| mezzogiorno | **Lo sciopero bianco di dieci minuti** dei portuali | calata, scalo | 20–30 seduti | `siede_terra`, `braccia_su`, poi `lavora` | «Non è uno sciopero, capo! È una pausa lunga!» «Quanto lunga?» «Finché te ne vai!» | [NUOVO] (protesta che non si chiama protesta) |
| pomeriggio | **Le madri fuori dalla Pietra dell'Onda** | posto di blocco della Vittoria | 10–20 donne | `aspetta`, `braccia_su`, nessuno parla | (una sola) «Ha diciassette anni. Gli ho portato il maglione.» — e basta. Niente battute qui. | [NUOVO] (il momento serio, La Haine) |
| pomeriggio | La scuola guida in Piazza Grande | Piazza Grande | 1 Polaris + istruttore + 6–8 che guardano | `osserva`, `indica_su` | «Frizione!» «Quale?» «Ce n'è una sola!» «E allora perché urla?!» (prende in pieno un banco del pesce) | [NUOVO] |
| sera | **Tombola e microfono aperto al Circolo** (dalle 21; il microfono dopo la cinquina) | `circolo` | 40–60 | `siede`, `braccia_su`, uno in piedi al microfono | il banditore: «Novanta, la paura!» Al microfono, un ubriaco: «Mia moglie m'ha lasciato per il tabaccaio! Applausi!» «Quarantotto, il morto che parla!» | [ESISTE tombola] + [NUOVO microfono] |
| sera | Il Garante del giovedì (il Tributo, 1.13) | bar | — | — | — | [SISTEMA] |
| notte | Quelli della tombola tornano cantando; la ronda li conta | dal Circolo alla Ringhiera | 8–10 | camminata, `braccia_su` | il Grigio: «Siete in dieci! È un corteo!» «No, siamo ubriachi! È diverso!» | [NUOVO] |

### 8.5 Venerdì — la paga, il liscio, le buste
| Fascia | Evento | Luogo | Gente | Pose | Battute | Stato |
|---|---|---|---|---|---|---|
| alba | Gli operai al treno della miniera | stazione, pensilina | 30–50 | `aspetta`, `fuma_su`, `scalda`, `orologio_su` | «Oggi dico al capo che sono malato.» «Ieri eri malato.» «E oggi sono più malato!» | [NUOVO] [POSTO pensilina] |
| mattina | Il pesce del venerdì: la fila in pescheria | Pescheria Serra / banco_pesce | 15–25 | `aspetta`, `indica_su` | «Quello lì, con l'occhio vivo!» «Signora, quello è l'occhio mio!» | [POSTO banco_pesce] |
| mattina | Si lava il ritratto del Garante | la gru del porto / il murale grande | 2 sul cestello + 6–10 sotto | `lavora`, `osserva` | «Lavagli bene la testa, che brilla poco!» «Sali tu, se sei bravo!» «…Io soffro le altezze.» | [NUOVO] |
| mezzogiorno | **La protesta delle mogli dei portuali** (paga in ritardo) | Piazza Grande, davanti al Palazzo del Governo | 15–25 donne + 4 Grigi | `discute_su`, `braccia_su`, `indica_su` | «Paga! Paga! Paga!» il Grigio: «Signore, è un assembramento!» una: «Bruno, sono tua madre! Vai a casa!» | [NUOVO] [OGGETTO cartelli] |
| pomeriggio | **La paga** | uffici, Banco, cassa della miniera | 20–40 in fila | `aspetta`, `legge_su` (la busta) | «Hanno tolto la decima!» «E la RataSicura!» «E il Tributo!» «Mi resta la busta! Vuota!» | [ESISTE paga] |
| pomeriggio | Si riscatta al Monte dei Pegni | Banco dei Pegni | 10–15 | `aspetta`, `porge` | «Rivoglio la fede!» «Con gli interessi.» «Tenetevela! Tanto mio marito non se n'è accorto.» | [NUOVO] |
| sera | I bar pieni del venerdì | tutti i bar, dehors | 10–20 per bar | `siede`, `fuma_su`, `braccia_su`, brindisi | «Offro io!» (tutti esultano) «…Gino, segna. Pago lunedì.» | [NUOVO] (densità alta) |
| sera | Il venerdì del liscio | Sala da ballo Stella Polare | 20–30 | `balla` a coppie, `siede` ai lati | «Ballo benissimo, io!» «Mi hai pestato i piedi sei volte!» «Perché sono veloce!» | [NUOVO] [POSA NUOVA ballo in coppia] |
| notte | **Le buste ai Grigi** (mazzette, ven-sab) | retro della Lavanderia Stella, Flipper | 2–3 della Famiglia + Ferri | `porge`, `fuma_su`, `osserva` | «È più leggera della settimana scorsa!» «E tu sei più grasso, Ferri. Siamo pari.» | [SISTEMA mazzette] |
| notte | I conti al capo alle 23 | una casa della periferia est | 1 fidato che cammina | — | (nessuna battuta: chi segue, vede) | [SISTEMA capo] |
| notte | Due ubriachi sul molo che parlano al mare | molo, lanterna rossa | 2 | `siede_terra`, `braccia_su` | «Mare! Ti voglio bene!» (arriva un'onda) «…Mi hai bagnato le scarpe, stronzo!» | [NUOVO] |

### 8.6 Sabato — il mercato, le nozze, la Luna
| Fascia | Evento | Luogo | Gente | Pose | Battute | Stato |
|---|---|---|---|---|---|---|
| alba | Il montaggio del mercato (come mercoledì) | `piazza` | 10–14 | `lavora` | «Monti tu il banco, io vado a prendere il caffè.» «È la terza volta!» «Il caffè è lontano!» | [NUOVO] |
| mattina | **Il mercato** | `piazza`, Mercato ottagonale | 80–140 | `merce`, `aspetta`, `porge` | «Mi fa lo sconto?» «Le faccio un calcio nel culo, gratis!» | [ESISTE mercato] |
| mattina | Il barbiere pieno | Barbiere Gavino, Salone Nello | 5–8 seduti fuori ad aspettare | `siede`, `legge_su` | «Tocca a me!» «No, a me!» «Tu sei arrivato adesso!» «Ma io ho fretta!» | [NUOVO] |
| mattina | **Il matrimonio a San Rocco** (11) | sagrato di San Rocco | 30–60 | `aspetta`, `saluta_su`, il riso, la foto davanti al ritratto | «Bella sposa!» «Bella rata! Vent'anni di Sì per Sempre!» / Gavino, dal fondo: «Io sono qui per caso! Passavo!» | [NUOVO] [OGGETTO riso/fiori] |
| mezzogiorno | Il pranzo di nozze all'osteria (porte aperte) | Osteria Il Debito, Trattoria La Rata | 30–40 dentro, 6 fuori a fumare | `siede`, `balla`, `fuma_su` | lo zio in piedi: «Due parole!» tutti: «NO!» | [NUOVO] |
| mezzogiorno | Calcio in strada, sfida fra quartieri | la via del Purgatorio contro la Ringhiera | 12–16 + 10 spettatori | corsa, `braccia_su`, `osserva` | «Io sto in porta!» «Stai sempre in porta!» «Perché in porta non si corre!» | [NUOVO] [POSA NUOVA calcio] |
| pomeriggio | Il lavaggio della Polaris davanti a casa | vie del boom, Transatlantico | 5–10 uomini, uno per auto | `lavora`, `appoggiato`, `discute_su` fra vicini | «Chi ha toccato la mia Polaris?! C'è un'impronta! UN'IMPRONTA!» | [NUOVO] [OGGETTO secchio] |
| pomeriggio | **La sfilata in skate non autorizzata** (che diventa una fuga) | dalla rampa dello scalo giù per la Vittoria | 15–25 ragazzi, poi 4–6 Grigi | corsa, `braccia_su`; i passanti `osserva` | «Non è un corteo! È il traffico!» / il Grigio, col fiatone: «Fermi! …Fermi un attimo, che muoio!» | [NUOVO] (sotto la Repressione 3) |
| sera | La fila alla Discoteca/Radio Luna (21:30) | torre dell'acqua, Radio Luna | 30–50 giovani | `aspetta`, `fuma_su`, `balla` sul posto | il buttafuori: «Tu no.» «Conosco il DJ!» «Il DJ è mia cugina, e non ti conosce.» | [NUOVO] |
| sera | I fidanzati sulle scale del Belvedere | scalinate, muretti della marina | 4–8 coppie | `appoggiato`, `siede` vicini | «Che guardi?» «Il mare.» «Il mare è di là, porco!» | [NUOVO] |
| notte | **Sabato sera alla Luna** (fino alle 3, col permesso) | `disco` | 60–100 dentro, 10 fuori | `balla`, `fuma_su`, `appoggiato` | «Guardate! Ballo meglio di tutti!» (scivola e cade) «…Chi ha bagnato il pavimento?!» | [ESISTE sabato] |
| notte | L'uscita delle 3 | davanti alla Luna, verso la stazione | 40 a gruppi | camminata, `braccia_su`, `discute_su` (una rissa che non comincia) | «Tenetemi, che lo ammazzo!» (nessuno lo tiene) «…Tenetemi, ho detto!» | [NUOVO] |

### 8.7 Domenica — la messa, la parata, il passeggio
| Fascia | Evento | Luogo | Gente | Pose | Battute | Stato |
|---|---|---|---|---|---|---|
| alba | I pescatori della domenica, con le canne | Molo Vecchio, lanterna | 6–10 | `siede`, `lavora` | «L'ho preso! È enorme!» (è una scarpa) «…Era enorme. È scappato.» | [NUOVO] [OGGETTO canna] |
| alba | Asta del pesce, ridotta | `molo` | 6–10 | `merce`, `aspetta` | «Questo pesce puzza!» «È domenica, signora! Puzza anche lei e non dico niente!» | [ESISTE pesce] |
| mattina | **La messa grande** | `chiesa` (San Rocco) | 60–90 dentro, 15 sul sagrato | `aspetta`, `saluta_su` all'uscita, `dietro_su` | «Hai fatto la comunione?» «Due volte! Avevo fame!» | [ESISTE messa] |
| mattina | **La parata della Tutela sulla Vittoria** (11) | Via della Vittoria (posto `parata`) | 20–30 in marcia + 80–120 ai lati | `saluta_su`, `braccia_su`, `osserva` | «Applaudi, che ti guardano!» «Applaudi tu per me, io ho le mani in tasca.» | [POSTO parata] → [NUOVO] in RECURRING |
| mattina | La processione di San Rocco (prima domenica del mese) che incrocia la parata | dal sagrato verso la Vittoria (11:20) | 30–40 + la statua | `dietro_su`, `aspetta` | il Grigio: «Di qua non si passa, c'è la parata!» il parroco: «Spostati, figliolo, che la statua pesa!» | [NUOVO] [OGGETTO statua: scenografia] |
| mezzogiorno | **Il pranzo della domenica**: finestre aperte, gente ai balconi | tutti i palazzi | 1–2 per balcone, molti | `appoggiato` alla ringhiera, `fuma_su`, `discute_su` fra balconi | dalla finestra: «Gavinoooo! È pronto!» dalla strada: «Arrivo!» un altro: «Anch'io mi chiamo Gavino!» «Vieni pure tu, c'è pasta!» | [NUOVO] (vedi §9: gente alle finestre) |
| mezzogiorno | La schedina al bar | Bar Da Gino, Tabacchi | 10–15 | `siede`, `legge_su`, `discute_su` | «Facciamo la schedina insieme! Metà per uno!» «E se vince?» «Allora era mia.» | [NUOVO] |
| pomeriggio | La partita alla radio: uomini in cerchio | piazzette, Piazzetta del Pozzo | 8–12 attorno a una radiolina | `aspetta`, `braccia_su` ai gol, `siede` | «GOL! GOL!» «…Annullato.» «Arbitro, vaffanculo! Lo sapevo, io!» | [NUOVO] [OGGETTO radio] |
| pomeriggio | **La passeggiata della domenica** (17–20) | `lungomare`, Passeggiata a mare | 80–150 | camminata a coppie e a famiglie, `saluta_su`, `appoggiato` al parapetto | «Ci sono i Lai, sorridi!» «Mi devono quarantamila! Sorridi tu!» / «Sei ingrassato!» «Pure tu!» «Io ho le ossa grosse!» | [ESISTE struscio] |
| pomeriggio | La gelateria aperta col freddo | Gelateria Polo Nord | 6–10 | `aspetta`, `appoggiato` | «Mi fai assaggiare?» «Hai già assaggiato tutti i gusti!» «Manca il limone!» | [NUOVO] |
| sera | Il Garante della domenica (più lungo) | bar, schermo della piazza | 10–15 / 40 | `siede`, `osserva` | trasmissione 1.15 (l'inno) o a rotazione | [SISTEMA] |
| sera | Vespro e ultimi giri | `chiesa`, `lungomare` | 15 / 20 | `aspetta`, camminata | «Domani è lunedì.» «Non dirlo! Non dirlo!» | [ESISTE vespro] |
| notte | Domenica notte, la città vuota: la Risacca scrive | muri, sottopassi | 2–3 | `lavora`, `osserva` | «Scrivi tu "PELATO", io guardo.» «Guardi sempre tu!» «Ho l'occhio buono!» | [SISTEMA Risacca] |

**Cosa aggiungere a `RECURRING`, nell'ordine** (una riga ciascuno, prima i più visibili): `nave` (lun e gio 5–8, porto cargo),
`parata` (dom 11–12, Vittoria), `lite` e `rua` (mar 18–20), `funerale` (mer 15–17, un mercoledì su due), `lamentele`
(mar 9:00–9:15), `madri` (gio 15–17, posto di blocco), `protesta` (ven 12–13, Piazza Grande), `nozze` (sab 11–14, chiesa e
osteria), `skate` (sab 15–17), `liscio` (ven 21–24), `microfono` (gio dentro la tombola), `pegni` (lun 6–8 e ven 15–17),
`radio_partita` (dom 15–17), `pranzo_dom` (dom 12–14: è un evento di finestre, non di strade).

---

## 9. La densità: far sembrare piena la città su Intel Iris Xe e sul telefono

**Il punto di partenza** (`popolo.js`): `CFG.near` 84 m (vive per intero chi è entro 84 m), `far` 98 m (isteresi), `maxNear` 84
figure intere al massimo; sul telefono (`LeggeraMem.on('gente')`) `near` 40, `far` 50, `maxNear` 36, perché ogni figura costa
circa 0,4 MB (pelle, scheletro, animazioni). Il riempimento dei posti `FILL` (r 56 m, `maxIn` 56 nella città compatta) fa uscire
le comparse dalle porte vicine. La nebbia comincia a 85 m. Il gioco disegna a circa 400 px di altezza: a 60 m una persona è
alta pochi pixel, e a quella distanza **conta la massa, non la figura**.

Quindi la proposta è: le figure intere restano poche e vanno dove guarda la camera; tutto il resto della «gente» è finto,
costa quasi niente e si vede solo come massa, luce e suono.

### 9.1 Spendere le 84 figure dove serve (costo zero)
- **Il calendario tira la gente.** Quando un evento di §8 è attivo entro `FILL.r`, i suoi posti hanno la precedenza nel
  riempimento: 30 persone in fila alla nave valgono più di 30 persone sparse in 30 vicoli. Fuori dagli eventi la città può
  essere più vuota: il contrasto fra la piazza piena e il vicolo vuoto si legge come vita, la gente sparsa uniforme no.
- **Il cono della camera.** La camera guarda da sud-est: chi sta dietro al giocatore (fuori dall'inquadratura) scende di
  priorità come `dentroPeso` fa per chi è al chiuso (+45 m). Proposta: +30 m a chi è fuori dal tronco di vista.
- **Le figure ferme costano meno delle figure che camminano**: niente percorsi, niente evitamento. Un evento come la fila
  o la messa va riempito di gente ferma con una posa a ciclo, non di gente che arriva.

### 9.2 I gruppi fissi (i «quadri»): niente simulazione
Un quadro è un gruppo di 3–8 persone che per il motore è **una cosa sola**: un punto, un orario (dal calendario), un elenco
di pose a ciclo e un elenco di battute. Non ha percorsi né memoria. Esempi: il cerchio attorno alla radio della partita, i
vecchi al barile, le comari sul sagrato, la fila al Monte dei Pegni, il cypher visto da lontano.
- Entro `near`: il quadro si «apre» in figure intere prese dagli abitanti leggeri della zona (come fa `FILL` con le comparse).
- Fra `near` e circa 160 m: il quadro resta una **sagoma di gruppo** (vedi 9.3).
- Se il giocatore interagisce con uno del quadro, quello diventa un abitante vero (il suo record leggero c'è già in Popolo).
Questo è lavoro di regia/Popolo, non tocca i modelli, se le figure sono quelle che ci sono.

### 9.3 La folla di fondo oltre la nebbia
Fra `far` (98 m) e 160 m, e sul telefono fra 50 e 110 m: **sagome** in una sola `InstancedMesh` (una o due chiamate di disegno
per 200–300 persone), colore piatto scuro che prende la nebbia, una leggera oscillazione nel vertex shader (il peso che passa
da un piede all'altro), spostamento lento lungo la strada per chi «passeggia». Si mettono dove dice il calendario (la fila
della nave è una fila di sagome che continua dietro le prime figure vere) e dove ci sono gli abitanti leggeri secondo i loro
orari. Dissolvenza incrociata sul bordo `near`/`far` per non far vedere il cambio.
- **[GRUPPO PERSONAGGI]** due strade: (a) sagome geometriche generiche (capsula + testa + cappotto a campana), che non
  usano i modelli ma devono avere le proporzioni giuste: le approva il gruppo dei personaggi; (b) impostori, cioè cartoline
  con 8 direzioni × 2 fotogrammi fotografate dai modelli veri: più belle, ma si fanno **dai loro modelli** e vanno rifatte se
  cambiano. Consiglio (a) per il telefono, (b) solo se il gruppo personaggi le vuole fare.

### 9.4 La gente alle finestre e sui balconi
- **Di notte, le finestre accese con la sagoma dietro la tenda**: 4–6 varianti di texture (una persona in piedi, una seduta,
  due che parlano, uno che fuma alla finestra aperta), sulle finestre delle case dove Popolo dice che qualcuno è in casa
  e sveglio. È un materiale delle finestre: non tocca i modelli.
- **Alle 20 il riverbero del Garante**: per 15 minuti le finestre delle case abitate sfarfallano col grigio della TV
  (un'uniforme di tempo nello shader delle finestre; grigio, non azzurro: BIBBIA §2.2). La città intera che guarda la stessa
  cosa è la battuta più grande, e costa una riga. Se il ripetitore è spento, le finestre restano ferme.
- **Di giorno, i balconi**: bucato che si muove (vertex shader), una sedia, una pianta, la finestra aperta. Una persona
  vera affacciata (`appoggiato` alla ringhiera) solo entro `near` e solo nelle ore di §8 (pranzo della domenica, lite del
  martedì). **[GRUPPO PERSONAGGI]** la posa «affacciato alla ringhiera» con le braccia sul parapetto a un'altezza data
  e il «parla da balcone a balcone» sono pose nuove.
- **Le voci dalle finestre** bastano a far abitare un palazzo che nessuno vede: «Gavinoooo, è pronto!», «Chi ha preso
  il mio shampoo?!», «Abbassa la radio!» «Abbassala tu!», la Polaris dell'ultimo piano che non parte.

### 9.5 Le file
La fila è il modo più economico di dire «c'è tanta gente» e insieme racconta la città (la nave, il pane, il Banco, le madri).
Le prime 3–5 persone sono figure intere (`aspetta`, `orologio_su`, `tasche_su`, una che parla col vicino); il resto è sagoma
(9.3) in fila lungo il muro. La lunghezza la decide la simulazione: 40 alla nave che arriva, 70 alla nave che non arriva,
la fila del forno che si accorcia alle 9. Un posto `fila` c'è già (Forno, Wu): basta allungarlo con le sagome. Dalla fila
esce ogni tanto la lite del posto rubato («Ero qui prima io!» «Ma se sei arrivato adesso!»).

### 9.6 Il suono come folla
Un tappeto di brusio la cui intensità segue la **densità virtuale** della zona (gli abitanti leggeri lì + gli eventi attivi),
non le figure visibili: la piazza del mercato «suona» piena anche se il motore ne mostra 30. Più i suoni puntuali: la TV
del Garante che esce dalle porte dei bar alle 20 (con gli insulti di §1 sopra), la radio delle botteghe (§2), l'altoparlante
(§4), un bambino che chiama, un cane, una saracinesca. È la cosa che costa meno e rende di più.

### 9.7 Le tracce di gente
Cose che dicono «qui ci sono persone» senza persone: biciclette e Vespe appoggiate ai muri, la porta della bottega
socchiusa con la luce, le cicche davanti al bar, il fumo dai camini delle case abitate (solo quelle), il secchio della
Polaris, il pallone fermo nel vicolo, i manifesti strappati, i biglietti di §5.2 sui portoni. Sono oggetti fermi, istanziati.

### 9.8 Il bilancio proposto
| | Iris Xe | Telefono |
|---|---|---|
| figure intere (`maxNear`) | 84 (com'è) | 36 (com'è) |
| `near` / `far` | 84 / 98 m | 40 / 50 m |
| sagome di fondo (9.3) | fino a 300, fino a 160 m | fino a 120, fino a 110 m, senza ombre |
| quadri (9.2) aperti in figure | entro `near` | entro 30 m, al massimo 2 insieme |
| finestre con sagoma, riverbero delle 20 | sì | sì (è un materiale) |
| bucato che si muove | sì | solo entro 40 m |
| brusio a densità virtuale | sì | sì |

Le figure intere non aumentano su nessuno dei due: la città si riempie con quello che non è una figura.

### 9.9 Cosa tocca il gruppo dei personaggi (da chiedere a loro, non da fare qui)
- **Pose nuove** citate in §8: giocare a calcio, ballare in coppia (il liscio), portare la bara o la statua a spalla,
  suonare (la banda), affacciarsi alla ringhiera, applaudire, lanciare il riso, tifare attorno a una radio.
- **Oggetti in mano** (`anim_mano.js`): pallone, cartelli di protesta, canna da pesca, strumenti della banda, rullo
  dell'imbianchino, radiolina, secchio e spugna, fiori della sposa.
- **Bambini**: molte scene (calcio, scuola, il matrimonio) ne vorrebbero; se non ci sono modelli di bambini, le scene
  si fanno coi ragazzi (15–19 anni) e non si mettono bambini finti.
- **Sagome o impostori** (9.3): proporzioni o fotografie dei loro modelli.
- **Skate**: chi lo anima e chi lo guida (personaggi o veicoli).
