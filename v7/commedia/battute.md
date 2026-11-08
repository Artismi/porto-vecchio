# Porto Vecchio — Banca delle battute (street, ?commedia)

Proposta di testo, nessun file del gioco toccato. Pronta per diventare dati.

**Formato**
- Una riga `- ` = una voce della lista. Dentro una riga, ` | ` separa i fumetti in sequenza (stessa persona nelle telefonate e nei pezzi; A, B, A… nei frammenti).
- `[voce]` all'inizio dice chi la dice. `[complice] [neutro] [paura] [rancore]` nelle visite = il tono che l'NPC ha verso Nino (`tono()` di game.js).
- Segnaposto: `{NOME}` (Nino), `{cosa}`, `{impresa}`, `{quando}`, `{luogo}` (già con preposizione, «alla Calata»), `{fatto}`, `{first}`, `{job}` («, commessa»). Righe con segnaposto tenute corte perché si allungano.
- Ogni fumetto ≤ 70 caratteri (controllato a script, segnaposto espansi con valori tipici).
- Tono tarato su `TONO.md` (8 novembre): reazioni a caldo, urlate, insulti personali, gente che si sputtana da sola sotto pressione. Niente aforismi, giochi di parole, satira fredda. Il test: un quindicenne ride alla prima lettura.
- Voci: ragazzi = veloci, «zio», «oi», «raga», skate e muri, si sfottono; Grigi = sbirri isterici che fanno figuracce; Famiglia = minaccia urlata e vanità da cappotto; reduci = vino, '79 e vanterie da sconfitti; benpensanti = la rata come fede, panico per tutto; vecchie = niente da perdere, lingua lunga; bottegai = conto, lamento, urla; porto = mani gelate, caposquadra, bestemmie trattenute; Marsigliesi = franco-italiano e disprezzo; preti/suore = carità pratica e mani pesanti; bambini = dicono tutto.
- Sostituto della «tribù» (Isola Grande del Sud, `isola:tribu`): **la Comune**, gente che nel '79 è scappata sull'isola a fare la vita libera e in sette anni è diventata una setta armata di assemblee, capre e paranoia. Nessuna etnia: sono quelli del liceo classico finiti male.

---

## 1. Frasi quando passi (per voce)

### ragazzi (Disgelo)
- Oi, Nino! Ma dove vai con quella faccia? Torna indietro, fa paura!
- Zio, m'hanno chiuso la rampa! La mia! L'avevo fatta io, coi mattoni!
- Ho fatto un ollie di un metro! Giuro! Non c'era nessuno, ma giuro!
- Oi, l'Alfetta! L'Alfetta! ...No, è un taxi. Raga, tornate, è un taxi!
- Mi sono rotto il polso ma il trick l'ho chiuso! Guarda! Non il polso!
- Fra, ho baciato la Sonia! Sulla guancia. Era girata. Conta uguale!
- Raga, chi m'ha fregato lo skate? Chi è stato?! ...Ah, ci sono sopra.
- Sei un tamarro, Nino. Detto con rispetto. Tanto rispetto.
- Mi presti mille lire? Te le ridò! Ti ho mai fregato? ...Sì, va be'.
- Ho corso più veloce di un Grigio! Era vecchio, ma era un Grigio!
- Mio padre m'ha buttato le cassette dal balcone! Tutte! Pure i Clash!
- Nino! Ti sei vestito al buio? Pure i calzini litigano!
- Zio, ho la scarpa bucata e la Debora mi guarda. Non muovo il piede.
- Un Grigio m'ha fermato e gli ho detto il mio nome vero! Che coglione!
- Raga, se arrivano i Grigi io non vi conosco! Neanche di vista! Ciao!
- Oi, chi ha detto che sono scemo? Chi è stato? Vieni qua e ridillo!
- Ho venduto il motorino di mio fratello! Lui non lo sa! Zitto, eh!
- Guarda 'sto muro! L'ho fatto io! Di notte! C'è scritto «vaffanculo»!
- Oi, Nino! Dividiamo? Tu paghi, io mangio! Dividiamo così!
- So girare sulla testa! L'ho fatto ieri! Guarda che bernoccolo!

### Grigi
- Ehi tu! Sì, tu! Che c'hai da ridere? Ti faccio ridere io, in caserma!
- Documenti! Subito! ...Non quelli! Quella è la schedina!
- Fermo lì! ...No, non tu, signora. Lei vada. Lei è mia zia.
- Chi m'ha rigato l'Alfetta? Chi è stato?! Me la scalano dalla paga!
- Non correre! Se corri devo correre io, e ho appena mangiato!
- Ho preso il ladro! L'ho preso! ...Era il collega in borghese. Ancora.
- Circolare! Circolare, ho detto! Ma perché nessuno circola mai?!
- Smettila di guardarmi, stronzetto! Ho una pistola! Da qualche parte!
- M'hanno rubato il cappello! A me! Chi ruba il cappello a un Grigio?!
- Avete visto un ragazzo col giubbotto? Tutti col giubbotto! Che isola!
- Oi, la cartaccia! Raccoglila! ...Va be', la raccolgo io. Ma ti guardo.
- Mia moglie m'ha cacciato di casa! Dormo in macchina! Nell'Alfetta!
- Io sono l'autorità, capito? L'AU-TO-RI-TÀ! ...Mi dai una sigaretta?
- Fermi tutti! ...Ho perso le chiavi delle manette. Nessuno si muova!
- Chi ha scritto «Ferri coglione»?! Io sono Ferri! Sei stato tu, eh?!
- Vent'anni di servizio e mi caga un gabbiano! Sulla divisa! Oggi!
- Alt! Fermo! ...Va be', non fermarti. Ma rallenta, che ti vedo!
- Quel cane m'ha morso! Arrestatelo! Il cane! Di chi è 'sto cane?!
- Mani fuori dalle tasche! Fuori! ...Ok, rimettile, fa freddo pure a me.
- Io ti conosco! Tu sei quello che... no. Comunque ti conosco, stronzo!

### Famiglia
- Nino! Nino! Guarda chi si vede! Quello che non ha pagato!
- Ehi, dove scappi? Non scappare, che mi sudo la camicia nuova!
- Bel cappotto! Rubato o pagato coi soldi nostri? Eh? Coi nostri?
- Salutami tua madre. Anzi no, la saluto io. So dove abita.
- Tano, guarda chi c'è! ...Tano! Svegliati, cazzo! È lui!
- Io ho fatto la galera per molto meno! Tre anni! Per un orologio!
- Venerdì, Nino! Venerdì! Se no ti ricordi di me per tutta la vita!
- Hai riso? Hai riso di me? Ridi ancora, dai. Ridi. ...Ecco, bravo.
- Mi guardi le scarpe? Sono di coccodrillo! Vero! L'ho ammazzato io!
- Lo Squalo è incazzato nero, Nino! Ha rotto un piatto! Quelli buoni!
- Non mi toccare la macchina! Neanche con gli occhi! È una Thema!
- Mi hai fatto fare brutta figura col capo, stronzo! Davanti a tutti!
- Che ci fai nel nostro quartiere? Ti sei perso? Ti ritrovo io, a pezzi.
- Io sono uno rispettato, capito? Al bar il caffè non lo pago! Mai!
- Nino, sorridi! Finché hai i denti, sorridi!
- Un'ora al freddo ad aspettarti! Un'ora! Ho il raffreddore per te!
- Il lavoro sporco non lo faccio! Tano, fallo tu! Io guardo la macchina!
- Oh, ma tu lo sai chi sono io? Lo sai? ...Allora perché non scappi?
- Rocco, tienilo! Tienilo! ...Rocco, ma che lo abbracci?!
- Cinquecentomila, Nino! Non quattrocento! Cinque! Sai contare?!

### reduci (Risacca vecchia)
- Nel '79 ho fatto scappare dieci Grigi! Dieci! ...Va be', tre. Grossi!
- Ehi tu! Pagami da bere! Io ho combattuto per te! ...Tu chi sei?
- Io avevo una radio! Tutta l'isola mi sentiva! ...Tre case. Ma forte!
- Non mi toccare il bicchiere! Il bicchiere è mio! L'unica cosa che ho!
- Ridi di un eroe?! Ti faccio vedere la cicatrice! ...Dov'era? Qua!
- Una volta ho fermato una campagnola con una patata. Non chiedere.
- Io il Garante l'ho preso a schiaffi! In sogno! Ma forte!
- Mia moglie m'ha lasciato per un Grigio! Nel '79 a quelli gli sparavo!
- Stronzi! Siete tutti stronzi! ...Tu no. Tu mi offri il vino.
- Avevo la mira migliore della Risacca! ...M'è caduto il bicchiere.
- Io so ancora fare una molotov! Guarda! ...Oste! Dammi una bottiglia!
- Non sono ubriaco! Sono un reduce! È diverso! Hic.
- Chi ha detto che la Risacca è morta? Chi?! Sono qua! Mi sto alzando!
- Il fucile ce l'ho ancora! Sotto il letto! Arrugginito, ma c'è!
- Nel '79 ero il più bello! Le ragazze mi tiravano i fiori! Coi vasi!
- Ehi, tu! Tu hai la faccia da Grigio! Sei un Grigio? Dillo!
- Offrimi un bicchiere e ti dico dov'è sepolto il tesoro della Risacca!
- Io non ho paura di nessuno! Di nessuno! ...Chi ha sbattuto la porta?!
- Tre giorni m'hanno torturato e non ho parlato! Avevo la tonsillite!
- Viva la Risacca! Viva! ...Oste, alza la radio, che mi sentono!

### benpensanti a rate
- Non toccare la macchina! Ottantaquattro rate! Non respirarle addosso!
- Via dal cancello, teppista! Chiamo i Grigi! Ho il numero sul frigo!
- Mio figlio non è un drogato! Ha solo gli occhi rossi! Dalla nascita!
- Ho visto tutto! Non ho visto niente! Cosa devo dire? Ditemelo!
- Abbiamo la tv a colori! A colori! Venite a vedere! No, non entrate!
- Mi hai sporcato le scarpe! Sono di vernice! Le sto ancora pagando!
- Io sono una persona per bene! Non ho mai detto una parolaccia, cazzo!
- Chi ha spaventato il mio barboncino?! È di razza! Ha il pedigree!
- Teppisti! Drogati! Comunisti! ...Ah, buongiorno, signor Ferri.
- Il mio vicino canta! Alle nove di sera! Chiamate qualcuno!
- Ma come ti vesti?! Ti vedono i miei figli! Copriti!
- Ho pagato tutto! Tutto! Tranne il frigo! E la macchina! E la casa!
- Non guardare mia moglie! ...Anzi, guardala. Non la guarda nessuno.
- Applaudo il Garante tutte le sere! In piedi! Ho la sciatica per lui!
- Il prato! Sul prato no! L'ho tagliato con le forbici! Col righello!
- Mi si è rotta la lavatrice! L'ho pagata tre anni! Era il mio orgoglio!
- Non è un sovversivo, è mio nipote! Cioè, non lo conosco! Arrestatelo!
- Abbassa la musica! C'è gente che dorme! Io! Io dormo!
- Che c'hai da guardare? Ho la ricevuta! Ho tutte le ricevute! In borsa!
- Mi hanno rigato la berlina! Chi è stato?! Io muoio! Muoio qui!

### vecchie
- Ehi, bello! Sì, tu! Hai un culo che sembra mio marito nel '50!
- Tirati su i pantaloni, scemo! Ti si vedono le mutande! E sono sporche!
- Non spingere, stronzo! Ho ottantasei anni e ti spacco la faccia!
- Nino! Mangi? Sei magro! Sembri un chiodo! Vieni che ti do il brodo!
- Quella là mi frega il posto in chiesa! Tutte le domeniche! Vipera!
- Il pesce puzza! Me l'hai dato marcio, ladro! Ridammi i soldi!
- Al mercato ho tirato un cavolo a un Grigio! Ha fatto «oh»! «Oh»!
- Ho vinto a tombola! Duecento lire! Stasera mi ubriaco come da ragazza!
- Sbrigati, ragazzo! Alla mia età non posso aspettare che attraversi tu!
- Lina! Lina! C'è il figlio della Pina che fa lo scemo! Vieni a vedere!
- Il pizzo? Allo Squalo? Io gli ho cambiato il pannolino, a quello lì!
- Delinquente! Ti ho visto! ...Bravo, però. Ne fai uno anche a me?
- Mio marito è morto e finalmente guardo la tv che voglio io! Viva!
- Non fischiarmi dietro, sporcaccione! ...Rifallo, dai. Mi piace.
- Trecento lire una pera?! Ai miei tempi ci compravi un marito!
- Le mie gambe! Chi ha messo questo gradino?! Il Comune! Assassini!
- Fammi passare, ho la pressione! A duecento! Muoviti!
- Ti ho visto nascere, Nino! Eri brutto! Adesso sei grosso e brutto!
- Non ho paura dei Grigi! Ho il bastone! E la dentiera che morde!
- Oi, giovane! Portami la borsa! ...Non così! Ci sono le uova, cretino!

### bottegai
- Non toccare la frutta! Ladro! ...Va be', compra almeno una mela!
- Fuori dal mio negozio, se non compri! Fuori! Mi sporchi la vetrina!
- M'hanno sfondato la saracinesca! Terza volta! Chiudo e me ne vado!
- Ho alzato i prezzi? Sì! Perché io mangio! Anch'io mangio, capito?!
- Chi ha preso il resto? Chi?! Avevo duemila lire sul bancone!
- Il pane è di ieri? È di stamattina! Lo giuro su mia madre! ...Di ieri.
- Signora, i pomodori non si palpano! Li palpa e non li compra! Sempre!
- Mi deve trentamila lire dal '79! Paga, disgraziato! Ti vedo!
- Il pizzo il venerdì, le tasse il lunedì! E io quando mangio? Eh?!
- Non appoggiarti alla vetrina, Nino. È l'unica cosa pagata.
- Ho venduto un etto di prosciutto! Uno! In tutto il giorno! Festa!
- Smettila di fischiare qui davanti! Mi spaventi i clienti! Il cliente!
- Il caffè dell'Impero! Diecimila! Non ti piace? Allora bevi l'acqua!
- Questa bilancia è precisa! Precisissima! Non guardarla! Guarda me!
- Ho le pulci nella farina? No! Non le ho! Chi l'ha detto?! Chi?!
- Non si fa credito! Lo vedi il cartello? Lo sai leggere, sì?!
- Ti conosco! Hai rubato le gomme da masticare nel '75! Pagale adesso!
- Mia moglie mi fa le corna col fornaio! Davanti al mio negozio!
- Sconto! Sconto per tutti! ...Tu no. Tu hai la faccia da uno che ruba.
- Chiuso! È chiuso! Non vedi che è chiuso? Sono le sette e un minuto!

### pescatori e portuali
- Spostati, che passo con la cassa! Spostati! Ti schiaccio i piedi!
- Chi m'ha fregato i guanti? Chi è stato?! Ho le mani di ghiaccio!
- Caposquadra di merda! Mi ha tolto una giornata! Per una sigaretta!
- Ho pescato un tonno così! Così! ...Va be', una sardina. Ma grossa!
- Stamattina onde di tre metri! Sono uscito lo stesso! Ho vomitato.
- Sono caduto in acqua! Davanti a tutti! Non ridete, cazzo, si gela!
- Questa cassa pesa troppo! Ragazzo, vieni, portala tu! Io ti guardo!
- Oi, ragazzo, tieni la corda! Tienila! ...Ma no! Adesso sono in acqua!
- Il gabbiano m'ha fregato il panino! Dalla mano! Ti ammazzo, uccello!
- I Marsigliesi pagano doppio! Doppio! E poi ti guardano come un cane!
- Ho le mani rotte, la schiena rotta, e mia moglie vuole la pelliccia!
- Giovedì arriva la nave! Doppio turno! Mia moglie non mi riconosce più!
- La barca mia è la più veloce del porto! Quando il motore parte!
- Mi guardi le mani? Due dita in meno! Il mare! Vuoi vedere il piede?
- Chi ha lasciato la rete qua?! Mi ci sono impigliato come un merluzzo!
- Lo scarico non lo faccio gratis! Non sono tuo padre! Paga!
- Puzzo di pesce? Certo! Io lavoro! Tu puzzi di niente, che è peggio!
- Ho vinto a carte tutta la paga del caposquadra! Adesso mi licenzia!
- Stanotte una cassa piena di dollari! Giuro! Ero sobrio! Quasi!
- Ehi, mozzo! Non dormire sulle reti! Svegliati, che arriva il capo!

### Marsigliesi (franco-italiano)
- Putain, cette île! Piove sempre! Le mie scarpe nuove, foutues!
- Eh, toi! Non guardare la valigetta! Non la guardare, j'ai dit!
- Didier! Didier! Hai lasciato la macchina aperta! Encore!
- Tu m'as touché? Mi hai toccato la giacca? C'est de la soie, connard!
- Quel caffè è pisse de chat! Diecimila lire per la pisse de chat!
- Je suis le roi de Marseille, moi! ...Bon, du quartier. Del palazzo.
- Ehi, l'Italien! Ti piace la mia macchina? Non è tua! Ah ah!
- Ma che fai, cretino? Tu veux mourir? Spostati!
- Didier m'a volé la fille! Encore! Avec ma moto!
- Ici le donne non mi guardano. À Marseille, toutes! Toutes!
- J'ai perdu la valise! La valise! Le patron va me tuer! Dov'è?!
- Bonsoir, je m'appelle Jean-Luc et je suis très dangereux. Vraiment.
- Ce vin, c'est du vinaigre! Mi hai avvelenato! Je vais vomir!
- J'ai froid! J'ai faim! E la vostra musica fa schifo! Je rentre!
- Stronzo! C'est comme ça qu'on dit? Stronzo! Ah, c'est beau!
- Arrête de rire! Tu ris de mon chapeau? Il est italien, le chapeau!
- Tu es Nino? On m'a parlé de toi. Pas en bien. Ça me plaît.
- Les flics d'ici! Mi hanno chiesto i documenti tre volte! Trois fois!
- Ehi, bella! Vieni a Marsiglia con me? ...Non? Tant pis. Toi, mémé?
- Didier! Smettila di cantare! Stiamo facendo una cosa illegale!

### preti e suore
- Non si corre in chiesa, delinquente! C'è la messa! E ho appena lavato!
- Chi ha rubato le candele? Chi?! Le conto ogni sera! Ne mancano tre!
- Togliti il cappello! In chiesa! ...E pure la sigaretta, disgraziato!
- Suor Teresa ha dato un pugno a un Grigio! Un pugno! Che donna!
- Il vino della messa è finito! Sagrestano! Ti ho visto! Sputalo!
- Mi hai pestato il piede! Ti perdono! Ma mi fa malissimo! Malissimo!
- Offerte! Anche mille lire! Anche cento! Anche un bottone, via!
- Tre ore di confessione e nessuno ha peccato! Tutti santi! Bugiardi!
- Le suore non hanno paura. Hanno un ombrello robusto e la mira buona.
- Vai a messa, Nino! Ti vedo al bar! Ti vedo, eh! Tutti i giorni!
- Chi ha suonato le campane alle tre di notte?! Vi scomunico tutti!
- Ho benedetto l'Alfetta e m'hanno fatto la multa! A me! A un prete!
- Basta parolacce davanti alla chiesa! Stronzi! ...Oh. Scusate.
- Bambini! Giù dal muro della canonica! Giù! Chiamo le vostre madri!
- Ho visto chi ha fregato l'elemosina! Ridammela, stronzetto! Subito!
- Padre Mario s'è addormentato durante la predica! La sua! Svegliatelo!
- Sì, io fumo! E allora? Pure San Rocco fumava! ...Non è vero. Ma io sì.
- Corri in sagrestia, nasconditi! ...Non lì! Quello è il confessionale!
- Il vento ha alzato la tonaca a suor Lucia! Non guardate! Giratevi!
- Dio ti ama! Io no! Hai rotto il vetro della canonica!

### bambini
- Sei un ladro? Mamma dice che quelli col giubbotto sì.
- Mio papà è più forte del tuo! Il tuo dov'è? Non c'è! Ah ah!
- Ho detto «stronzo» alla maestra! Castigo! Ma ne valeva la pena!
- Mamma! Mamma! Quello mi ha guardato! ...No, vabbè, non mi ha guardato.
- Ho mangiato un verme per mille lire! Mi dai mille lire? Ne mangio due!
- Oi! Mi dai una sigaretta? Ho nove anni! Fumo da quando ne avevo otto!
- Mio fratello ti picchia! Ha quattordici anni! È grosso così!
- Un Grigio m'ha dato un ceffone! L'ho detto alla nonna! È finito, lui!
- Ho fatto la pipì nella fontana del Garante! Non dirlo! Lo dico io!
- Sei brutto! Brutto brutto! ...Mi dai una caramella?
- Ho trovato una pistola! ...Era di plastica. Ma ho avuto paura uguale!
- Gara di sputi col figlio del Grigio. Ho vinto. Suo papà m'ha multato.
- Mamma ha detto a papà che è un coglione! Cos'è un coglione? Sei tu?
- Da grande faccio lo Squalo! Così la gente mi dà i soldi e basta!
- Il mio cane morde i Grigi! Solo i Grigi! L'ho addestrato io!
- Ho rotto il vetro! Non sono stato io! È stato il pallone!
- Ti faccio vedere il dente che mi è caduto! Guarda! È pieno di sangue!
- Mia sorella esce con un marinaio! Papà non lo sa! Glielo dico stasera!
- Sai fare la ruota? Io sì! Guarda! ...Ahia. Non guardare.
- Babbo Natale non esiste! L'ha detto mio cugino! Gli ho dato un calcio!

---

## 2. Reazioni a quello che fa il giocatore

### corre accanto
- [vecchia] Corri, corri. Alla tua età io correvo dietro ai marinai.
- [bottegaio] Ehi! Dove corri? Hai rubato? Hai rubato da me?! Controllo!
- [ragazzi] Oi, chi ti insegue? Nessuno? E allora fermati, sembri scemo!
- [benpensante] Non si corre in centro! Sembriamo dei poveri!
- [reduce] Corri, ragazzo, corri! Anch'io correvo! Poi m'hanno sparato nel culo!
- [pescatore] Piano, che c'è il ghiaccio! Se cadi non ti raccolgo, eh!
- [grigio] Ehi! Perché corri? Fermo! ...Va be', corri. Ho male ai piedi.
- [famiglia] Corri pure, Nino! Corri! Tanto io ho la macchina!
- [bambino] Gara! Ho vinto! Non lo sapevi, ma era una gara!
- [passante] Attento! M'hai fatto cadere la spesa! Le uova! Stronzo!

### ti viene addosso
- [ragazzi] Oi! Ma ci vedi? Toccami un'altra volta e ti stacco la testa!
- [grigio] M'hai urtato! Hai urtato un pubblico ufficiale! Chiedi scusa! Forte!
- [famiglia] Mi hai toccato il cappotto! Sei morto! ...Scherzo. No, non scherzo.
- [vecchia] Spingi una vecchia?! Vergogna! Ti spacco il bastone in testa!
- [benpensante] Il cappotto è a rate! Se si sgualcisce paga lei!
- [pescatore] Due spalle così e non mi vedi?! Ma dove guardi, coglione?!
- [marsigliese] Doucement! Mi hai pestato le scarpe nuove! Putain de merde!
- [prete] Ahia! Ti perdono! Ma ahia! Mi hai rotto il gomito, figliolo!
- [bambino] Mi hai rotto il gelato! Era finto ma me l'hai rotto!
- [reduce] Spingi un eroe della Risacca?! Torna qua! ...Aiutami ad alzarmi.

### guida male, tampona
- [benpensante] La mia berlina! Me l'hai presa sulla rata di marzo!
- [ragazzi] Ma chi ti ha dato la patente, tua madre?!
- [grigio] Fermo! Accosta! Hai preso l'Alfetta! L'Alfetta di servizio!
- [famiglia] Hai toccato la macchina di mio cognato! Scendi! Scendi, ho detto!
- [vecchia] Assassino! Ero sulle strisce! Le strisce, cretino!
- [pescatore] Guida il cane o guidi tu? Perché il cane andava meglio.
- [bottegaio] I miei gerani! Li hai ammazzati! Vent'anni di gerani!
- [marsigliese] Mais t'es fou?! Qui avete le strade strette e i cervelli pure!
- [bambino] Ancora! Rifallo! Prendi quella rossa!
- [reduce] Ma chi t'ha insegnato a guidare? Io guidavo meglio da ubriaco!

### suona il clacson
- [ragazzi] Suoni a me?! Scendi! Scendi dalla macchina, se hai coraggio!
- [vecchia] Suona pure! Io non mi sposto! Sono vecchia, posso fare la stronza!
- [grigio] Chi è che suona? Sei tu? Ti posso arrestare per rumore, lo sai?!
- [famiglia] Mi hai suonato? A me? Rifallo, dai. Rifallo e vedi.
- [benpensante] Che maleducazione! Mi hai fatto cadere la torta! Era per la suocera!
- [pescatore] Suona quanto vuoi! Col carretto vado piano! Piano!
- [marsigliese] Ooh, le petit klaxon. Très viril. Bravo.
- [prete] Smettila di suonare, c'è un funerale! La vedova è già incazzata!
- [bambino] Ancora! Fallo come la nave!

### dipinge un muro
- [ragazzi] Spacca! La B è storta, ma spacca! Fai pure la mia firma!
- [ragazzi] Zio, quello è il muro della Zia! Sei pazzo! Scappa, scappa!
- [benpensante] Il muro! L'ho dipinto io a maggio! Grigio! Con amore!
- [vecchia] Scrivi «la Pina è una vipera»! Grande! Che la vede dal balcone!
- [reduce] Ecco! Così facevamo noi! ...Non guardarmi, ho il fumo negli occhi.
- [bottegaio] Sulla saracinesca no! Sulla mia no! Fallo su quella del macellaio!
- [grigio] Fermo! Che scrivi?! «Grigio stronzo»? Chi è il Grigio stronzo?! Io?!
- [famiglia] Non lì. Quel muro è nostro. Togli quella roba o ti tolgo la mano.
- [prete] Non sul muro della chiesa, disgraziato! Ti tiro l'acqua santa!
- [bambino] Mi fai fare una lettera? La C. So fare la C.

### inseguito dai Grigi
- [ragazzi] Vai! Vai! A destra! No, l'altra destra!
- [ragazzi] Corri, Nino! Corri! Sono due e sono grassi! Ce la fai!
- [vecchia] Corri! Io li inciampo col bastone. Sono vecchia, mi credono.
- [reduce] Il vico! Sempre dal vico! Non v'insegna niente nessuno?
- [benpensante] Io non ho visto niente! Ho la tv accesa! Sto guardando!
- [bottegaio] Non dal mio negozio! Non dal mio... ecco, le uova! Le paghi!
- [pescatore] Dietro le reti! Puzzano. Il Grigio ha il naso delicato.
- [famiglia] Corri, Nino! Se ti prendono loro, a noi chi ci paga?
- [prete] Entra in chiesa! Svelto! Fai finta di pregare! In ginocchio, cretino!
- [bambino] Li ho mandati dall'altra parte! Mi devi mille lire!
- [marsigliese] Allez! Cours! Cours! Les flics d'ici sont lents comme des vaches!

### arrestato
- [ragazzi] Non parlare! Di' che eri al cinema! Che film? Inventa!
- [vecchia] Lasciatelo! È un ragazzo! ...Va be', un ragazzo grosso.
- [reduce] Bastardi! Lasciatelo! ...No, non me! Io passavo di qua!
- [benpensante] Lo sapevo! Lo sapevo! Ha salutato mia figlia, una volta! Dentro!
- [bottegaio] Mi doveva tremila lire! Prima mi paga, poi ve lo portate via!
- [famiglia] Ehi, Grigio! Quello mi deve dei soldi! Non me lo rovinate!
- [prete] Piano coi polsi, Grigio! È un bravo ragazzo! Più o meno! Abbastanza!
- [pescatore] L'hanno preso! Domani faccio il suo turno! Doppia paga! Grazie, Nino!
- [bambino] Lo portano via! Lo portano via! Posso salire anch'io in macchina?!
- [marsigliese] Ah! Ils t'ont eu! Je l'avais dit! Didier, paga! Ho vinto!

### ruba
- [bottegaio] Al ladro! Al ladro! Fermatelo! ...Ha preso il salame buono!
- [ragazzi] In tasca e cammina normale. Normale! Non così!
- [vecchia] Ho visto, eh. Non dico niente. Ma una caramella mi tocca.
- [benpensante] Ladro! Ladro! Chiamate i Grigi! Chiamate tutti! Mia moglie!
- [famiglia] Rubi nel nostro quartiere?! Senza chiedere?! Ma sei scemo?!
- [grigio] Fermo! Quello l'aveva già sequestrato un collega!
- [reduce] Bravo! Ruba! Ruba anche per me! Una bottiglia, di rosso!
- [prete] Ti ho visto! Rimetti a posto, disgraziato! Ti vede pure Dio!
- [bambino] Lo dico! Lo dico! ...Se mi dai metà non lo dico.
- [pescatore] Quella era la mia cassa! Torna qui, ladro di merda!

### gira con un'arma
- [ragazzi] Zio! Metti via quella roba! Ma sei scemo? Ci arrestano tutti!
- [vecchia] Mettila via, che ti vedono. E poi non ti dona.
- [benpensante] Un'arma! Ho chiuso il gas? Ho chiuso il gas.
- [grigio] Ha un'arma! Ha un'arma! ...Ferri, la tua dov'è? Nel cassetto?!
- [famiglia] Uh, guarda, ha la pistola! Che paura! Dai, spara! ...Non sparare.
- [reduce] Metti giù quel ferro, ragazzo! Ti tremano le mani! Ti tremano!
- [bottegaio] Fuori di qui con quella! ...Prendi il pane e vai.
- [prete] In chiesa con la pistola?! Fuori! Ti tiro il messale in faccia!
- [bambino] È vera? Me la fai tenere? Dai! Un secondo! Giuro che non sparo!
- [marsigliese] Ah ah! Regarde, Didier! Tiene la pistola come una forchetta!

### ubriaco
- [ragazzi] Zio, sei distrutto! Hai vomitato sulle scarpe! Sulle mie scarpe!
- [vecchia] Ubriacone! Uguale a mio marito! Lui almeno cantava bene!
- [reduce] Finalmente uno che mi capisce. Vieni, il secondo lo offro io.
- [benpensante] Ubriaco alle quattro! Io aspetto almeno il Garante!
- [grigio] Lei è ubriaco. ...Un po' anch'io. Vada a casa e zitto.
- [bottegaio] Giù le mani dalle bottiglie! Se ne rompi una le paghi tutte!
- [famiglia] Bevi, bevi, Nino! Coi soldi di chi? Eh? Coi soldi di chi?!
- [prete] Figliolo, ma sei marcio! Ti sei bevuto il vino della messa?!
- [pescatore] Respira col naso. Guarda il mare. No, quello è un muro.
- [bambino] Perché cammini storto? Mamma! Quello cammina come papà!

### bagnato, infreddolito
- [vecchia] Sei bagnato come un pulcino. Un pulcino di novanta chili.
- [ragazzi] Ti sei buttato in mare vestito?! Sei un mito! Scemo, ma un mito!
- [benpensante] Non sgocciolare sul mio marciapiede! L'ho fatto lavare! Ieri!
- [pescatore] Caduto dalla calata? Tutti, una volta. Io sette.
- [bottegaio] Non entrare! Non entrare così! Mi bagni il pavimento! Fuori!
- [reduce] Bagnato fradicio! Bevi questo, che scalda! ...Non tutto, stronzo!
- [famiglia] Mi hai bagnato le scarpe! Sono di Milano! Asciugale! Con la giacca!
- [grigio] Fermo! Perché sei bagnato?! Che hai buttato in acqua? Parla!
- [prete] Vieni dentro, che muori di freddo! Ma non sederti sul banco buono!
- [marsigliese] T'as l'air d'un chien mouillé. Un chien italien. Pire.

### di notte, durante l'Ora Quieta
- [grigio] Ehi! È l'Ora Quieta! A casa! Subito! O ti ci porto io, a calci!
- [grigio] Che fai in giro a quest'ora?! Documenti! ...Shh! Parla piano!
- [ragazzi] (piano) Zio, pure tu fuori? Shh. Adesso è tutto nostro.
- [vecchia] (dalla finestra) Rientra, scemo! ...Ah, sei Nino. Rientra, scemo.
- [benpensante] (dalla finestra) Chiamo la Guardia! Giuro! ...Chi ha il numero?
- [reduce] Ehi, ragazzo! Ho perso le chiavi! Aprimi tu! Sali dal balcone!
- [famiglia] Nino! Che ci fai qui di notte? Lavori? No? Allora porta i soldi!
- [marsigliese] Toi! Qu'est-ce que tu regardes? Non hai visto niente! Rien!
- [prete] (dalla finestra) Chi canta a quest'ora?! Ubriaconi! Domani in chiesa!
- [pescatore] Spostati, che esco in mare! Alle tre! Ogni notte! Che vita di merda!

### vestito strano
- [ragazzi] Che schifo di giacca, Nino! ...Me la presti stasera? Dai!
- [ragazzi] Fa schifo, giuro. Ma spacca. Tutte e due le cose.
- [vecchia] Bel vestito. Mio cugino ne aveva uno uguale. Nella bara.
- [benpensante] Copriti! Ti vedono i bambini! Ma che sei, un cantante?!
- [grigio] Fermo! Che roba è quella giacca? L'hai rubata? A un pagliaccio?
- [famiglia] Ma come ti sei conciato? Mi fai vergognare! Cammina più in là!
- [marsigliese] Oh là là! Didier, regarde! Il s'est habillé avec les rideaux!
- [bottegaio] Quella giacca era in vetrina nel '72. Nessuno la prese. Tu sì.
- [prete] Figliolo, togliti quella roba prima di entrare! Spaventi le vecchie!
- [bambino] Mamma, è un pagliaccio o un ladro? ...Tutti e due, dice.

### fermo a fissare
- [ragazzi] Oi! Che guardi?! Che cazzo guardi?! Ti piaccio?
- [ragazzi] Oi. Se fissi ancora ti si ferma la faccia così.
- [vecchia] Che c'hai da guardare? Non hai mai visto una bella donna? Eh?!
- [grigio] Perché mi guardi? Ti faccio paura? Ti faccio paura, eh? Bene!
- [benpensante] Perché mi guarda? Ho pagato. Ho la ricevuta. È a casa.
- [famiglia] Mi fissi, Nino? Fissami ancora e ti chiudo un occhio. A scelta.
- [reduce] Che guardi? Sono un monumento? Sì! Lo sono! Offrimi da bere!
- [bottegaio] Guardi e non compri! Guardi e non compri! Ti faccio pagare!
- [bambino] Gara a chi non sbatte gli occhi! ...Hai perso! Mi devi una caramella!
- [marsigliese] Arrête de me fixer! Tu veux quoi? Un bacio? Va' fanculo!

---

## 3. Frasi di combattimento (15 per fazione)
Le prime 4 di ogni lista sono le serie (escono più spesso se il bug resta); le altre sono miste.

### cop
- Fermo! Getta l'arma!
- A terra! Mani sulla testa! Sulla tua, scemo!
- Centrale, colpi d'arma da fuoco! Mandate tutti!
- Copritemi! Lo prendo dal vico!
- Ogni colpo è un verbale, stronzo! Sei pagine a colpo!
- Mi ha sparato! A me! Ho due figli e il mutuo, stronzo!
- Mandate rinforzi! E dite a mia moglie che il sugo lo spegne lei!
- Lo sai quanto costa un proiettile alla Tutela? Te lo detraggo!
- Arrenditi e nessuno si fa male! Tranne te, un po', in caserma!
- Mi hai bucato il cappello! È d'ordinanza! Me lo scalano!
- Sparo! Sparo davvero! ...Ferri, come si toglie la sicura?
- Mi hai bucato la divisa nuova, stronzo! La pago io!
- Rinforzi! ...Come in ferie? Tutti?
- Esci con le mani alzate! O come ti pare, basta che esci!
- Vai avanti tu, Ferri! Io ti copro! Da qui! Da dietro la macchina!

### squalo (la Famiglia)
- Lo Squalo ti saluta!
- Vieni fuori, Nino!
- Te la sei cercata!
- Giragli dietro, Tano!
- Vai avanti tu, Tano! Io ho la giacca nuova!
- Vieni fuori, che ti faccio lo sconto sul funerale!
- Mi hai sporcato la giacca! Questa la paghi a parte!
- Alle gambe! Sparagli alle gambe! ...Tano, quelle sono le mie!
- Esci, dai! Mia madre ha buttato la pasta, e scuoce!
- Te l'abbiamo detto con le buone! Queste sono le meno buone!
- Dopo questa il debito raddoppia! Per il disturbo!
- Ti voglio bene, Nino! Ma devo spararti! Sono due cose diverse!
- M'hai preso, stronzo! M'hai preso! ...No, è il sugo. Ti ammazzo!
- Sbrighiamoci, ho la macchina in seconda fila!
- Rocco, non sulla vetrina! Quello paga regolare!

### marsiglia
- Tirez! Tirez!
- Il est là, putain!
- Personne ne touche la valise!
- À gauche! À gauche!
- T'as tiré sur ma voiture?! Ma voiture! Je vais te tuer deux fois!
- Didier! Arrête de recharger en chantant!
- Mon pantalon! C'était du lin! Tu vas payer!
- Il est où? ...Derrière toi! Non, l'autre toi!
- Le bateau part dans dix minutes! Tue-le vite!
- Va' fanculo, Italien! C'est le seul mot que je sais!
- Mon dernier chargeur! Fais-toi tuer avec, au moins!
- Didier, il m'a touché! Je saigne! ...Non, c'est le vin!
- Ma mère m'appelle ce soir! Je veux lui dire que c'est fait!
- Couvre-moi! Avec les balles! Pas avec ton manteau!
- Il ne meurt pas! Pourquoi il ne meurt pas? C'est l'humidité!

### tutela_isola (soldati delle zone militari e degli isolotti)
- Intruso in zona militare!
- Fuoco! Fuoco!
- Copritemi!
- Non farlo scappare!
- Fuoco a volontà! ...Con moderazione, il magazzino è vuoto!
- Sentinella tre, rispondi! ...Dorme! Svegliatelo, sparano!
- Per la Tutela! E per la licenza di Pasqua!
- Copritemi! Mi mancano sei mesi al congedo!
- Liberate il cane! ...È scappato! Liberate il caporale!
- Mamma, voglio tornare a casa! ...Sparate! Sparate voi!
- Torre due, il riflettore! Non su di me! Su di lui!
- Mi sono pisciato addosso! Nessuno lo dica al sergente!
- Rapporto: contatto ostile! Rapporto: ho paura! Cancella il secondo!
- Alt, chi va là! ...Doveva rispondere! Adesso sparo!
- Ho perso il fucile! Il fucile! Chi ha visto il mio fucile?!

### isola:comune (sostituisce la tribù; stessa chiave o `isola:comune`)
Anche i feed di game.js:789 andrebbero cambiati: «La Comune ti ha visto: arrivano coi forconi.» / «Sull'Isola Grande del Sud la Comune ti dà la caccia.»
- Fuori dalla nostra terra!
- Circondatelo!
- Proteggete le capre!
- Il fuoco è acceso! Tutti al fuoco!
- Niente denaro, niente Stato, niente te! Via!
- Sei della Tutela? Del continente? Sei vestito male uguale!
- Assemblea! Votiamo! ...Abbiamo votato: addosso!
- Pace e amore! Per noi! Per te, sale grosso!
- Non toccare l'orto! L'orto è vivo! Tu ancora per poco!
- Sette anni che ci sentiamo osservati! Eccoti, finalmente!
- Mi hai calpestato i pomodori! I pomodori! Assassino!
- Avevamo detto niente armi! Abbiamo cambiato idea nel '79!
- In cerchio! Come alle riunioni! Lui al centro!
- Chi ti manda? La Tutela? Mia madre? Rispondi!
- Tiragli il formaggio! Quello stagionato!

---

## 4. Telefonate a metà (cabina o per strada; parla uno solo)
- …Mamma, non urlare! Non urlare! | …Mi hanno fermato, sì. | …No, non ho fatto niente! | …Va bene, un pochino. Non urlare!
- …Gina! Gina, apri! Sono sotto casa! | …Lo so che ci sei, vedo la luce! | …Chi è quello alla finestra?! | …GINA!
- …Mi hanno fregato le ruote! Tutte e quattro! | …Stanotte! Sotto casa! | …La macchina è sui mattoni! | …Ridi? Ridi, stronzo?!
- …Avvocato, mi dica la verità: vado dentro? | …Quanto? | …QUANTO?! | …Avvocato? Avvocato, non riattacchi!
- …Non sono al bar! Sono al lavoro! | …Quale musica? È la radio dell'ufficio! | …Quale bicchiere? | …Pronto? Amore? Pronto?
- …Tonino, il carico è saltato! | …I Grigi! Dappertutto! | …No, non ho parlato! Non ho parlato! | …Ho detto solo il tuo nome. Ma piano.
- …Mia moglie è a messa! Vieni! Subito! | …Sì, la messa corta! Corri! | …E togliti le scarpe sulle scale!
- …Dottore, cos'ho?! Me lo dica! | …Niente? Come niente?! | …Ho pagato cinquantamila per niente?! | …Mi trovi qualcosa! Almeno una!
- …Non ho fatto la spia! Giuro! | …Chi te l'ha detto? La Zia?! | …La Zia è una bugiarda! | …Zia? Sei tu? Ciao, Zia. Scusa, Zia.
- …Papà, la Vespa l'ho prestata. | …A un amico. | …Uno che non conosci. | …Neanch'io, a dire il vero.
- …Il numero non te lo do. È una cabina. | …Vieni a cercarmi qui. | …Sono quella col cappotto. | …Tutti col cappotto? È inverno, cretino.
- …Mi hanno licenziato! Sì! Di nuovo! | …Ho dato del coglione al capo! | …Era dietro di me! Non lo sapevo! | …Pure tu mi dai del coglione?!
- …Nonna, mandami i soldi! | …Per l'università! | …Sì, ci vado! Ci vado da domani! | …Nonna, ma che ti ridi?!
- …Sto bene. Sto benissimo. | …Ho detto benissimo, cosa c'è di sospetto? | …No, non ho bevuto. | …Va bene. Un pochino sto male.
- …Mi hai venduto una pelliccia di topo! | …Topo! Lo so che è topo! | …Si muove, cazzo! Si muove ancora!
- …Lo so che è tardi. Lo so. | …Lo so che c'è l'Ora Quieta. | …Infatti parlo piano. | …TI AMO. …Piano. Ti amo.
- …Ho tamponato una Thema! Della Famiglia! | …Sì, quella Famiglia! | …Sono nella cabina! Non esco! | …Mamma, portami il passaporto!
- …Ho visto il tuo ex alla Luna! | …Ballava! Come un pollo! | …Con la Rita! | …Sì, quella Rita! …Pronto? Piangi?
- …Dodici ore in coda per il lasciapassare! | …E sai cosa m'hanno detto? | …«Domani»! «Domani»! | …Io domani gli brucio l'ufficio!
- …Le ventimila gliele porto! Giuro! | …Venerdì! | …Cosa vuol dire «o le gambe»? | …Giovedì! Facciamo giovedì!
- …Mi hanno portato via il frigo! Il frigo! | …Con dentro l'arrosto! | …Sì! Per tre rate! | …Almeno l'arrosto ridatemelo, bastardi!
- …Mamma, ho perso il traghetto! | …Sì, l'ultimo! | …Perché ero al bar! Ero al bar, va bene?! | …No, non dirlo a papà!
- …Ho vinto al totocalcio! Tredici! | …No, dodici! | …Undici. Va be', ho vinto un caffè! | …Però paghi tu!
- …Domani sciopero! Tutti! | …Sì, anche tu! | …Ma che malato?! Sei malato da tre anni, stronzo!
- …Ti ricordi la cosa che abbiamo nascosto nel '79? | …L'hanno trovata. | …No, non il fucile. Il gatto. | …Vivo. Incazzatissimo.
- …Chi parla? | …Lo Squalo? | …Signor Squalo! Che piacere! Che onore! | …Sì. Sì. Venerdì. Sì. Grazie. Mi scusi.
- …Voglio parlare col direttore! | …Lei è il direttore? | …Allora lei è uno stronzo! | …No, non riattacchi! Scusi! Scusi!
- …Amore, non sono uscito con nessuno. | …Il rossetto è mio. | …Sì, lo metto. Da stasera. | …Rosso fuoco. Mi sta da dio.
- …Mi hanno preso in tv! | …Faccio il pubblico! | …Applaudo! In prima fila! | …Mamma, guardami stasera! Sono quello che applaude!
- …No, Radio Scirocco non la ascolto. | …Non so neanche cos'è. | …Il novantotto? Non lo conosco, il novantotto. | …Va bene, il novantotto sì.

---

## 5. Frammenti sentiti passando (si chiude prima della battuta)

### adulti (FRAM)
- Mi hai rigato la macchina! | Io? Ma se ero a piedi! | Con la borsa! L'hai rigata con la borsa! | Ma è una Panda! | E allora?!
- Hai detto a tutti che porto il parrucchino! | Io? Mai! | L'ha detto la Pina! | La Pina mente! | …Però lo porti, eh.
- Ridammi i soldi! | Non ce li ho! | Ieri al bar offrivi a tutti! | Coi tuoi, sì! Ero generoso!
- Tuo figlio m'ha rotto il vetro! | Mio figlio è un angelo! | Il tuo angelo ha tirato un mattone! | Bella mira, eh? Ha preso da me!
- Ho vinto la tombola in parrocchia! | Cosa? | Un prosciutto! | Intero? | Una fetta. Ma spessa!
- Il tuo cane ha cagato davanti a casa mia! | Non è il mio cane! | Ha il tuo guinzaglio! | …Glielo avrò prestato.
- Mi hai guardato la moglie! | Ma chi?! | Tu! Al mercato! | Guardavo le melanzane! | Mia moglie sta alle melanzane tutti i giorni!
- Sei un ladro! | E tu un cornuto! | Chi te l'ha detto?! | …Nessuno. Tiravo a indovinare.
- Ho preso la Ritmo! | A rate? | Pagata tutta! | Con che soldi? | …Abbassa la voce, che mi sente la moglie.
- Mi aiuti a traslocare domenica? | Domenica? | Sì. | Domenica muore mia zia. | Quale zia? | Lo decido domenica.
- Ho fatto a botte col macellaio! | Hai vinto? | Ho perso un dente. | E lui? | Lui s'è tenuto il dente. Il mio.
- Chi ha fregato la mia bicicletta?! | Non guardarmi! | Ce l'hai sotto il culo! | …È uguale. È una coincidenza!
- Mia moglie m'ha cacciato di casa! | E dove dormi? | Da te! | Da me no! | Allora da tua moglie! Lei ha detto sì!
- Hai sentito? Il Bianchi s'è sposato! | Con chi? | Con la Rosa! | Quella che è stata con tutti? | Pure con te? | …Cambiamo discorso.
- Il medico m'ha detto che ho il fegato grosso! | Quanto? | Come un melone! | E smetti di bere? | Scherzi? Lo sto festeggiando!
- Abbassa la radio, stronzo! | Vieni a spegnerla tu! | Arrivo! | …Ecco, l'ho abbassata! Non salire!
- Mi presti la macchina? | Si è rotta. | Te l'ho vista stamattina! | Si è rotta adesso. Mentre parlavi.
- Mio figlio ha dato del coglione a un Grigio! | E il Grigio? | L'ha inseguito per tre vicoli. | E poi? | Poi s'è seduto a piangere.
- Sai cosa ha detto la Zia? | Non voglio saperlo! | Ha parlato di te! | …Cosa ha detto?! Dimmelo! Dimmelo subito!
- Ho mangiato il pesce dell'Impero! | E com'era? | Buono! | E perché sei verde? | …Scusa. Dov'è il cesso?! Dov'è?!
- Ci hanno chiuso la sala da ballo! | Ancora?! | Ho appena comprato le scarpe! | Balla a casa! | A casa c'è mia suocera! Mi tocca ballare con lei!
- Hai visto la Lucia ieri sera? | Con chi era? | Con un marinaio! | Uno? | …Uno alla volta, dai!
- Il vicino ha la giacca nuova! | Dove lavora? | Non lavora! | Allora ruba! | Sì! M'ha rubato la giacca! È la mia!
- Paghiamo a metà? | Io ho preso solo un caffè! | E le tre grappe? | Quelle erano per il caffè!
- Ho chiesto scusa a mia suocera. | E lei? | M'ha tirato una ciabatta! | E tu? | Ho chiesto scusa di nuovo. Due ciabatte.
- Mi hanno fregato il portafogli sull'autobus! | Quanto c'era? | Tutto! | Quanto è tutto? | Duemila. E la foto di mia madre. Rivoglio la foto!
- Ho visto il Garante dal vivo! | E com'è? | Piccolo! Piccolissimo! | Ma dai! | Giuro! Me lo mangiavo! …Non dirlo in giro.
- Mio cognato è un coglione! | Perché? | Ha comprato una Vespa senza motore! | E che ci fa? | Dice che la spinge per fare sport!
- Me la ridai la scala? | Che scala? | Te l'ho prestata a marzo! | …Ah, quella scala. Ci ho fatto la legna.
- Hai visto chi ha rigato la macchina del sindaco? | Io no. | Io neanche. | …Gino, ce l'hai ancora il chiodo in mano.
- Mia figlia s'è fidanzata con un Marsigliese! | No! | Sì! Ha la Mercedes! | …E ce l'ha un fratello?
- Guarda chi c'è! | Chi? | Mio marito! Col cappello nuovo! | E allora? | Io il cappello non gliel'ho comprato!
- Mi presti dei soldi? | Quanti? | Tutti. | Tutti cosa? | Quelli che hai. Poi ti spiego.
- Lui dice che mi ama. | E tu? | Ha la Lancia.
- Hai pagato la rata? | Quale rata?! | Della tv! | Non la paghiamo da tre mesi! | E allora chi suona alla porta?!
- Mio marito s'è addormentato al funerale! | Di chi? | Di sua madre! | No! | Russava! Davanti alla bara!
- Ho venduto la fede! | Sei pazza?! E tuo marito? | Non se n'è accorto! | Da quanto? | Da tre anni! Tre anni, capisci?!
- Ieri al porto c'era uno nudo! | Nudo nudo? | Con la cravatta! | E chi era? | Il caposquadra! Ha perso a carte!
- Hanno messo la telecamera sul lampione! | E tu? | Le ho fatto il dito! Due volte! | Sei matto?! | Era spenta! …Era spenta, vero?
- Hai il lasciapassare? | Sì! | Fammi vedere! | …È scaduto nell'83. Ma la foto è bella!
- L'avvocato m'ha detto di stare calmo! | E tu? | Gli ho tirato la sedia! | E adesso? | Adesso mi serve un altro avvocato!
- Se ti chiedono, ieri sera ero con te. | Dove? | Al bar! | Ieri sera io ero con tua moglie. | …Allora ero al bar da solo.
- Mi hanno fregato le galline! | Chi? | Il vicino! | Come lo sai? | Le sento! Nel suo forno!
- Domani c'è la parata! | Ci vai? | Devo! Mi pagano il panino! | Solo il panino? | Col prosciutto! Mica scemo!
- Ho perso al lotto! | Quanto? | Lo stipendio. | Di chi? | …Di mia moglie. Non dirle niente.
- Mio fratello è tornato dal continente! | E com'è? | Ha una macchina lunga così! | Davvero? | E i debiti più lunghi! Dorme da me!
- Hai detto che sono grassa?! | Io? Mai! | Ho sentito! | Ho detto robusta! | Robusta?! Robusta a chi?!
- Le hai dato il bacio? | Sulla guancia! | Quale? | Quella di suo padre! M'ha preso a calci!
- Chi ha mangiato la mia torta?! | Il gatto! | Il gatto ha la tua faccia, allora! | …Che c'entra? | Sei pieno di crema!
- I Grigi! | Dove?! | Sotto casa! Butta la roba nel cesso! | Quale roba? | Tutta! Pure il caffè!
- Ho cambiato barbiere! | Perché? | Il vecchio m'ha tagliato un orecchio! | Tutto? | Un pezzetto! Il pezzo migliore!
- Mio figlio fuma, beve e dipinge i muri! | E tu? | Gli ho trovato il posto in banca! | In banca?! | Il direttore è mio cognato! Mica scemo!

### ragazzi (FRAM_G)
- Chi è più veloce, io o te? | Io. | Allora vai tu a prendere le sigarette.
- Raga, l'Alfetta! | Dove?! | Lì! | Scappa! | …No, è un taxi. Raga, tornate! Tornate!
- Ho baciato la Debora! | Seee! | Giuro! | Dove? | Sulla mano. Mi stava dando uno schiaffo.
- Tuo fratello è un coglione! | Lo so! | Ieri m'ha menato! | Lo so! Gliel'ho detto io!
- Ho fatto un salto di tre metri! | Seee. | Chiedi a Marco! | Marco, è vero? | Due. Poi è finito nel cassonetto.
- Mi presti mille lire? | No. | Cinquecento? | No. | Una sigaretta? | Tieni. Ora sparisci.
- Chi ha i soldi? | Io no. | Io neanche. | E chi ha ordinato tre birre? | Tu! Hai detto «offro io»!
- Ho visto la Pardo in costume! | Bugiardo! | Giuro! Al porto! | E com'era? | M'ha arrestato. Ne valeva la pena.
- Oi, guarda quello con la permanente! | Chi? | Quello lì! Che coglione! | È mio padre. | …Bella permanente, zio. Davvero.
- Ho fregato le sigarette a mio nonno! | Dammene una! | Senza filtro, eh! | …Tossisci? Sei un bambino!
- M'hanno perquisito i Grigi! | E? | M'hanno trovato la lettera per la Debora! | E? | L'hanno letta ad alta voce! Tutta!
- Facciamo a botte? | Perché? | Mi annoio. | Va bene. | …Ahia! Piano, stronzo, era per finta!
- Ti copro io! Vai! | Sicuro? | Vai! | …Grigio! È lui! Quello lì! Prendetelo!
- Corri! Corri! | Chi ci insegue?! | Non lo so! Corrono tutti! | …Raga, ci inseguiamo da soli?!
- Mi hai rubato la ragazza! | Non è vero! | Vi ho visti al cinema! | Era buio! Mi sono seduto lì per sbaglio! | Per due ore?!
- Zio, ho vomitato sul Garante! | Cosa?! | Sul manifesto! In piazza! | E? | E l'ho pulito con la manica. Avevo paura.
- Facciamo un colpo! | Dove? | Al bar di Tonino! | Ma è tuo zio! | Appunto! Ho le chiavi!
- Raga, che puzza! | Sei tu! | Non sono io! | Sei sempre tu! | …Va be', sono io. Ma è la pizza.
- Oi, ho trovato centomila lire! | Dove?! | Nella giacca di mio padre! | E lui? | Lui non lo sa ancora. Corri!
- Chi m'ha disegnato il cazzo sulla faccia?! | Dormivi! | Al bar! Davanti a tutti! | Era arte, zio!
- Raga. Raga. Ho un'idea. | No. | Non l'hai sentita. | No lo stesso.
- Ti presto il giubbotto. | Davvero? | Diecimila. | Siamo amici! | Allora quindicimila.
- Gara fino al porto! | Chi perde? | Paga le birre! | Io non ho soldi! | Allora vinci, coglione!
- Ho il motorino di mio cugino! | Fammi fare un giro! | Non va! | Come non va? | Non va! Lo spingo da stamattina!
- Mia madre m'ha beccato a fumare! | E? | M'ha dato uno schiaffo! | E? | E m'ha fregato il pacchetto! Tutto!
- Oi, Marco ha dato un pugno al Grigio! | Giura! | Poi è scappato! | E il Grigio? | L'ha detto a sua madre. Lei l'ha già menato.
- Chi è il più forte qui? | Io! | Tu?! T'ha menato una suora! | …Aveva l'ombrello!
- Se ci fermano, parlo io! | Tu?! L'ultima volta hai pianto! | Avevo la congiuntivite! | Pure il Grigio piangeva, dal ridere!
- Andiamo alla Luna stasera? | Coi soldi di chi? | Tuoi! | Io non ho soldi! | Allora di tuo padre! Dov'è il portafogli?
- Oi, la Debora ti guarda! | Davvero?! | Sì! | Come sto? | Hai lo sputo sul mento, zio.
- Il Grigio di ieri sera aveva paura. | Di noi? | Di tutto. Si vedeva. | Allora siamo pari.
- M'hanno chiuso la rampa! Col cemento! | E noi? | La riapriamo! Col martello! | Hai un martello? | …Ho una scarpa.
- Ti ricordi Nicola? | Quello dello skate? | Non torna da tre giorni. | …Sarà dalla nonna. | Sarà.
- Chi ha detto che sono basso? | Nessuno! | Chi ha riso?! | Nessuno! | Ti ho visto, Pino! Ti ho visto dal basso!
- Hai visto il Grigio cadere dalla tavola? | L'hanno visto tutti. | Io no. Raccontalo. | Due metri. Di culo. | Ancora. Raccontalo ancora.
- Oi, che ore sono? | Le quattro. | Di giorno? | Zio, c'è il sole. | Non si sa mai.
- Raga, mio padre è uscito di galera! | Che bello! | Bello?! Dorme nel mio letto!
- Facciamo una band. | Chi suona? | Nessuno. | Va bene. Il nome?
- Oi, ma tu ci credi alla Risacca? | Shh! | Dico, esiste? | Shh, cazzo! C'è il Grigio!
- Mi presti il giubbotto? | Per? | Per sembrare te. | Perché? | Mi cerca uno.
- Chi sale per primo sul muro? | Tu. | Perché io? | Sei più leggero. E se sparano, sparano a te.
- Zio, abbiamo diciannove anni. | E? | Niente. Abbiamo diciannove anni.

---

## 6. I pezzi (sfoghi rivolti a Nino, 3-5 battute, la botta in fondo)
- [benpensante] Tu! Sì, tu! Hai visto chi m'ha rigato la berlina? | Ottantaquattro rate! Ottantaquattro! | Sono uscito dieci minuti per il pane! | E adesso c'è scritto «cornuto» sulla portiera! | ...Ma come facevano a saperlo?!
- [ragazzi] Nino! Nino, m'hanno fermato i Grigi! | Mi hanno messo al muro, tipo film! | Io ho fatto il duro. Zitto. Sguardo così. | Poi m'hanno chiesto il nome e ho pianto. | Ma con dignità, eh!
- [vecchia] Nino! Vieni qua! Ho visto tutto! | Quello del terzo piano porta su le donne! | Una diversa ogni sera! A settant'anni! | Lo dico a sua moglie? | ...No. Prima gli chiedo se ha un amico.
- [bottegaio] Lo sai chi m'ha spennato stamattina? Tutti! | La Famiglia, i Grigi, e pure il prete! | Il prete! Per la festa del santo! | Il santo non m'ha mai comprato un etto di prosciutto! Mai!
- [portuale] Nino, il caposquadra m'ha tolto la giornata! | Per una sigaretta! Una! | Lui ne fuma quaranta! Sulle casse! | Sai che faccio? Domani gli piscio nel caffè. | ...L'ho già fatto ieri. Non se n'è accorto.
- [reduce] Ragazzo! Siediti! Ti racconto il '79! | Ero in piazza! Davanti a tutti! Col megafono! | Ho urlato «Abbasso la Tutela»! Fortissimo! | Poi m'hanno preso e ho urlato «Viva la Tutela». | Più forte.
- [ragazza Disgelo] Nino, mia madre m'ha bruciato il giubbotto! | Quello di pelle! Che avevo fregato a mio fratello! | Dice che è da puttana! | Io le ho detto che è da uomo! | ...Peggio. Adesso cerca mio fratello con l'accendino.
- [grigio fuori servizio] Oggi m'hanno tirato un uovo, Nino. Un uovo! | Sulla divisa! Sul cappello! | Mi sono girato e ridevano tutti! | Pure il collega! Pure il cane del collega! | Stasera dico a mia moglie che era una rapina.
- [benpensante] Mio figlio! Hai visto mio figlio? | Ha i capelli verdi! Verdi! | Alla prima comunione della cugina! | Il prete gli ha dato l'ostia e s'è fatto il segno della croce! | ...Due volte!
- [famiglia] Nino. Nino, guardami. | Lo vedi questo vestito? È nuovo. È di Milano. | Sono venuto fin qua per te, col vestito nuovo. | Se me lo fai sporcare, ti ammazzo. | Se non paghi, torno col vestito vecchio.
- [vecchio] Nino! M'hanno fatto la multa! A me! | Per la bicicletta! Senza luce! | Ho ottantadue anni! Gli ho detto: arrestatemi! | ...M'hanno arrestato. Tre ore. | Ho mangiato meglio che a casa. Domani ci torno.
- [marsigliese] Toi! Viens ici! J'ai une question! | Perché qui tutti mi guardano male? | Je suis beau! Je suis riche! J'ai la Mercedes! | ...Ah. C'est pour ça. D'accord.
- [prete] Nino, figliolo, ascoltami bene. | Qualcuno ha fregato l'elemosina. Tutta. | Ho chiesto in giro. Ho pregato. Ho minacciato. | Se scopro chi è stato... | ...Lo perdono. Ma prima gli spacco la faccia.
- [ragazzi] Nino! Ho visto il Garante! Dal vivo! | Usciva dalla macchina! A tre metri! | Gli ho urlato «stronzo»! Fortissimo! | ...Nella mia testa. Ma fortissimo.
- [bottegaia] Nino, tu che sei giovane, dimmi la verità. | Sono ancora bella? | ...Ci hai pensato! Ci hai pensato troppo! | Fuori! Fuori dal negozio! E paga le mele!
- [portuale] Nino, ho fatto a botte col Marsigliese! | Grosso così! Con l'anello! | Gli ho dato un pugno, uno solo! | Lui è rimasto in piedi. | Io la mano non la sento più. Mi offri da bere?
- [vecchia] Ragazzo, aiutami ad attraversare! | Piano! Piano! Ho l'anca nuova! | Non così piano! Mi vedono! | La Pina mi guarda dal balcone! | Fai finta di essere il mio fidanzato. Su, sorridi.
- [ragazzi] Nino, la Debora m'ha lasciato! | Per un Marsigliese! Con la Mercedes! | Io ho lo skate! Lo skate! | Gliel'ho detto: «Con lui ti annoierai!» | ...M'ha mandato una cartolina da Marsiglia.
- [benpensante] Nino, mi hanno pignorato la tv! | Durante il Garante! Mentre parlava! | Mia moglie applaudiva e loro la staccavano! | Ha applaudito anche quando sono usciti.
- [esattore della Famiglia] Ascoltami bene, Nino. Respira. | Io non mi arrabbio mai. Mai. | Io sono uno calmo! Calmo, capito?! | CALMO, CAZZO! | ...Scusa. Venerdì, eh.
- [reduce] Nino! Ragazzo! Il fucile! L'ho ritrovato! | Quello del '79! Era in cantina! | L'ho pulito, l'ho caricato, sono uscito! | Ho fatto tre passi e m'è venuto il fiatone. | Domani ci riprovo. Il fucile tienilo tu.

---

## 7. Le visite (convivenza.js reasonFor): 9 tipi × 8 varianti
Regola: si pesca solo tra le varianti col tono giusto (`tono()` di game.js: complice, neutro, paura, rancore). Se il tono è stato dato da meno di 10 minuti con un fatto grave (`__tonoT`), niente varianti `[complice]` scherzose: solo `[neutro]` o niente visita. `invito` e `notizia` sono in due fumetti: il primo è il dato del motore, il secondo il commento.

### avviso (i Grigi ti cercano)
- [complice] {NOME}! Togliti il giubbotto! Subito! Ti cercano col giubbotto!
- [complice] Due Grigi al bar chiedono di te! Ho detto che sei morto! Fai il morto!
- [complice] Non passare dalla piazza, scemo! C'è l'Alfetta! Ti aspettano!
- [complice] Ti hanno descritto, {NOME}! «Alto e brutto»! T'hanno preso in pieno!
- [neutro] Io non ti ho detto niente. Ma a casa tua stasera non ci andrei.
- [neutro] Gira un Grigio con la tua foto! Sei venuto malissimo! Corri!
- [paura] Va' via, ti prego. Ti cercano. Io ho i bambini.
- [paura] Ti cercano! Io non ti conosco! Non ti ho mai visto! Ciao!

### favore (ti deve qualcosa)
- [complice] {NOME}! Ti devo una! Anche due! Chiedi, che aspetti?!
- [complice] Per quella volta: ti serve una cantina? Ce l'ho! Coi topi, ma è tua!
- [complice] Me la ricordo, quella cosa! Mia moglie pure! Lei ti vuole sposare!
- [neutro] Ti devo un favore. Non mi piace dovere. Chiedimelo presto.
- [neutro] Quello che hai fatto. Grazie. Non ne parliamo più. Ma grazie.
- [neutro] Se ti serve un pasto, un passaggio, un alibi. L'alibi costa.
- [paura] Ti devo un favore, lo so. Basta che non c'entrano i Grigi.
- [rancore] Ti devo un favore, stronzo. Mi brucia il culo. Te lo rendo e basta.

### invito (a un'impresa)
- [complice] {quando}: {impresa}, {luogo}. | Servono braccia! Le tue fanno schifo, ma servono!
- [complice] {quando}: {impresa}, {luogo}. | Porta te stesso e stai zitto.
- [complice] {quando}: {impresa}, {luogo}. | Vieni? Ci sarà da ridere. O da correre.
- [neutro] {quando}: {impresa}, {luogo}. | Siamo pochi. Vieni, e non fare cazzate come l'altra volta.
- [neutro] {quando}: {impresa}, {luogo}. | Vieni o no? Decidi! Non ho tutto il giorno!
- [neutro] {quando}: {impresa}, {luogo}. | Paga poco, ma si mangia.
- [paura] {quando}: {impresa}, {luogo}. | Vieni? Ti prego! Da solo me la faccio addosso!
- [rancore] {quando}: {impresa}, {luogo}. | Non mi piaci. Ma serve gente. Vedi tu.

### richiesta (gli manca qualcosa; le prime quattro se ce l'hai nello zaino)
- [complice] Ho visto che hai {cosa}. | Me ne dai un po'? Dai! Dai! Ti voglio bene!
- [complice] {NOME}, una cortesia: {cosa}. | Non chiedere per cosa.
- [paura] Non è che hai {cosa}? | Non per me. Per mia madre. No, per me.
- [rancore] Tu hai {cosa}. | Dammelo e non ti spacco la faccia. Mi pare onesto.
- [neutro] Cerco {cosa} da stamattina! | Da stamattina! Sto impazzendo! Ce l'hai?
- [neutro] Sai dove trovo {cosa}? | Da Wu non c'è! Al nero costa un rene! Un rene!
- [neutro] Cerco {cosa}. | Se torno a casa senza, mia moglie mi ammazza! Mi ammazza!
- [paura] Cerco {cosa}. | Se i Grigi chiedono, non te l'ho chiesto.

### minaccia (rancore)
- [rancore] Tu. Qui non ti voglio. Sparisci, o ti faccio sparire io.
- [rancore] So cosa hai fatto, {NOME}. Lo sa anche mia madre. È peggio.
- [rancore] Gira al largo, stronzo! Al largo! Più largo di così!
- [rancore] Ti ho visto, {NOME}! Ti spacco la faccia! Tutta! Pure il naso!
- [rancore] Guardami un'altra volta, {NOME}, e ti cavo gli occhi! Tutti e due!
- [rancore] Non parlarmi. Non guardarmi. Respira da un'altra parte.
- [rancore] Vaffanculo, {NOME}! Tu e tutta la tua famiglia! Pure il gatto!
- [rancore] Un'altra volta e vado dalla Zia! Le dico tutto! Pure le bugie!

### notizia (un fatto vero della giornata)
- [complice] Hai sentito? {fatto}. | Non sei stato tu? Peccato! Che figata!
- [complice] {fatto}. | Dicono la Risacca. Io dico: era ora.
- [neutro] Lo sai? {fatto}. | Mia cugina l'ha visto! Ha urlato così forte che l'hanno fermata!
- [neutro] {fatto}. | C'erano tre Grigi a guardare per terra! Uno piangeva!
- [neutro] Hai saputo? {fatto}. | Ho visto tutto! Dal balcone! In mutande! Non dirlo a nessuno!
- [paura] {fatto}. | Adesso passano casa per casa! Io chiudo! Chiudo tutto!
- [paura] Hai sentito? {fatto}. | Non dire che te l'ho detto io.
- [rancore] {fatto}. | Chissà chi è stato. Chissà.

### offerta (ha roba in più)
- [complice] Ho {cosa}. | Per te metà prezzo! Ma non dirlo a nessuno, che mi rovini!
- [complice] Ho {cosa}. | Caduto da un camion. Il camion era fermo.
- [neutro] Ho {cosa}. | Quasi nuovo! Quasi mio! Lo vuoi o no? Svelto!
- [neutro] Ho {cosa} in più. | Tu soldi, io roba, e non ci siamo visti.
- [neutro] Da me: {cosa}, a metà prezzo. | L'altra metà la paghi stando zitto.
- [paura] Ho {cosa}. | Portalo via, ti prego. Se me lo trovano in casa…
- [paura] Ho {cosa}, se vuoi. | Gratis! Gratis! Basta che te lo porti via! Subito!
- [rancore] Ho {cosa}. | A te prezzo doppio. Perché mi stai sul cazzo.

### presentazione (una volta sola; Nino è del posto: non «sei nuovo»)
- [neutro] Io sono {first}{job}. Ti ho visto crescere. Non tanto, eh.
- [neutro] Sono {first}{job}. Il vetro! Me l'hai rotto col pallone, nel '76!
- [neutro] Sono {first}{job}. Tuo padre mi deve una Vespa! Salutamelo!
- [neutro] Ci conosciamo? {first}{job}! Quello che urla dal balcone! Sì, io!
- [neutro] Sono {first}{job}. Tua madre mi doveva dei soldi. Acqua passata.
- [complice] {first}{job}. Mi hanno parlato bene di te. In pochi, ma bene.
- [complice] Piacere, {first}{job}. Ti ho visto con la vernice. Non t'ho visto.
- [paura] Sono {first}{job}. Ti dico il nome, così non lo vai a cercare.

### saluto (chi ti vuole bene; il seguito può essere una chatLine)
- [complice] Ciao {NOME}! Sei ancora vivo? Bravo, continua.
- [complice] Oh, {NOME}! Ieri al bar ti ho difeso! Ho preso un pugno per te!
- [complice] {NOME}! Domenica passa, mia madre cucina per un reggimento.
- [neutro] Ciao {NOME}! Che faccia di merda, oggi! Dormito male?
- [neutro] {NOME}! Oi! ...No, scusa, pensavo fossi un altro. Uno simpatico.
- [neutro] Sempre in giro, tu, {NOME}! Ma lavorare mai, eh? Mai!
- [paura] Ciao, ciao {NOME}. Ciao. Sto andando, eh. Ciao.
- [rancore] {NOME}. ...Ciao. Ho detto ciao. Basta così.

---

## 8. Il capannello (mormorii, una riga a testa)

### una rissa
- Dagli! ...Non tu, l'altro!
- Vado a chiamare qualcuno. ...Dopo. Prima guardo.
- Dagli un calcio! Nelle palle! ...Uh. Gliel'ha dato.
- Cinquemila sul piccolo!
- Il cappello! Gli è volato il cappello!
- Mi ha schizzato il sangue sulla giacca! Chi paga, adesso?!
- Separateli! ...Io no. Qualcuno.
- Morde! Quello morde! Non vale!
- Quello è mio cognato! Dagli! Dagli forte!
- Al primo Grigio scappiamo tutti, eh. Tutti insieme.

### un arresto
- L'hanno preso. ...Chi? Uno. Basta che non sono io.
- Che ha fatto?! ...Ha rubato una gallina? Per una gallina?!
- Io lo conoscevo appena. Lo scriva.
- È il mio vicino! Finalmente! Suonava la tromba!
- Piano coi polsi, che ci lavora!
- Bastardi! ...Ho detto «bastardi»? Ho detto «bravi»! Bravi!
- Non guardate, che arrestano pure noi! ...Spostati, che non vedo!
- È il figlio della Pina! Pina! Pina, scendi! Ti arrestano il figlio!
- Ben gli sta! ...Che ha fatto? Non lo so! Ben gli sta uguale!
- Ehi, Grigio! Prendi anche mia suocera! Te la regalo!

### uno che cade
- È caduto! È caduto di faccia! Ah ah! Scusa! Ah ah!
- Si è rotto qualcosa? ...I pantaloni! Gli si vede il culo!
- Non ridete. Non ridete. ...Va bene, adesso ridete.
- Tutto a posto! È caduto bene! Ha esperienza!
- Lo tiriamo su? Dopo. Adesso fa scena.
- Ghiaccio. Lo dico da novembre: ghiaccio.
- È il terzo oggi. Il primo era un Grigio. Bellissimo.
- Rifallo! Rifallo, che mio cugino non l'ha visto!
- Il mio gelato! È caduto sul mio gelato! Me lo ripaghi!
- Chiamate un dottore! ...Io sono dottore! In legge! Non lo tocco!

### un comizio, un discorso
- Che dice? ...Non lo so, ma lo dice forte.
- Bravo! ...Per cosa? Non lo so. Ha una bella voce.
- Parla più piano, che dietro c'è la Zia.
- Ha ragione. Ha ragione. Io me ne vado, ma ha ragione.
- Scendi da lì, buffone! Ti si vede la canottiera!
- Ma è il fornaio?! E il pane chi lo fa, stronzo?!
- Più forte! Non si sente! ...Non così vicino! Mi sputi!
- Io non lo conosco! Lo vedo per la prima volta! ...Ciao, Gino.
- Lo dico sempre anch'io. A casa. In bagno.
- Se arrivano i Grigi, io compravo le sigarette.

### un incidente d'auto
- Era verde! ...Verde per chi?
- La mia macchina! Mia! Era parcheggiata! Era parcheggiata, cazzo!
- Ha preso la macchina del dottore. E adesso chi ci cura?
- Ma dove guardavi, coglione?! Ci vedi o no?!
- È ubriaco! Puzza da qui! ...Ce n'è ancora, in macchina?
- Nessuno tocchi le gomme! ...Ecco, una se n'è già andata.
- Il fanale! M'è passato sulla testa!
- Mio figlio guida meglio. Ha sette anni.
- Ho visto tutto! Tutto! ...Cioè, no. Niente. Non ho visto niente.
- Chi chiama i Grigi? ...Nessuno? Bene. Nessuno.
