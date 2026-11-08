# Porto Vecchio — I ricorrenti (15 schede, 17 persone)

Cast ricorrente nuovo, da aggiungere ai 5 matti di `src/matti.js` (Generale, Contessa, Profeta, Nonno Peppino, Venditore di niente) senza
toccarli. Tono: REGIA_COMMEDIA §2 (sfacciati, non crudeli; stand-up; GTA; La Haine; ipocrisia sporca). Ogni battuta sta sotto i 70
caratteri. Nessuna citazione dai film di riferimento: le situazioni sono nostre.

**Come leggere le schede.**
- Il formato delle battute è quello dei matti: `passa` (primo incontro), `ritorno` (le volte dopo; ognuna sta in piedi da sola),
  `solo` (parla da solo mentre gli passi a qualche metro).
- Le pose sono quelle che `anim_vita.js` sa già fare (`legge`, `telefona`, `porta`, `fuma`, `saluta`, `orologio`, `braccia`, `tasche`,
  `discute`, `dietro`, `indica`; gli `act` `beve`, `spazza`, `siede`, `appoggiato`). Il prop è al massimo un oggetto in mano.
- L'arco: quattro passi in circa due settimane di gioco (una giornata dura mezz'ora). I passi scattano da quello che il motore sa
  già: Repressione (0-5), Morale della Risacca, la Zia che vende, la nave dell'Impero che sbarca o no, il debito, quello che fai tu.
- Il tono verso Nino: le quattro parole di `tono()` in `game.js` (`complice`, `paura`, `rancore`, `sospetto`). Una battuta per ciascuna.
- I luoghi sono gli id dello stradario (BIBBIA §12). Con `?cittanuova` valgono gli stessi id.
- **[NUOVO]** segna i segreti e gli agganci che non esistono ancora.

## La copertura

| # | Chi | Fazione | Quartiere |
|---|---|---|---|
| 1 | Totò Microfono | gente comune, vicino alla Risacca | E governo (`casa_171`, `casa_114`), F centro |
| 2 | Sbarra, Biscotto, Rasoio | i ragazzi (il Disgelo) | D periferia ovest, F centro di notte |
| 3 | Lo Squalo al telefono | la Famiglia | le cabine di tutta l'isola, F `magazzino` |
| 4 | Agente Reperto | la Tutela (Guardia Insulare) | F `commissariato`, G `paradiso`, `belvedere` |
| 5 | Ragionier Telone | i benpensanti a rate | G `mare`, E `casa_63`, `benzina` |
| 6 | Permesso | la Famiglia (esattore) | F botteghe, G `car_2`, E barbieri |
| 7 | Mezzolitro | i reduci (Risacca vecchia) | F `osteria`, D `vecchio_3` |
| 8 | la Cabala | gente comune / malavita in proprio | F `bar`, `casa_141`; B `pescatori_s` |
| 9 | Dottor Vento | la Risacca (Radio Scirocco) | F `bar`, `sirena`, `cultura`; l'etere |
| 10 | Fratello Catalogo | gente comune (il Miracolo) | F `piazza`, `calata`, `benzina` |
| 11 | Lucien | i Marsigliesi | G `car_2`, `passeggiata`, F `pontile` |
| 12 | Caporale Sanremo | la Tutela (soldati della Base) | H `varco`, I `molo_cargo`, C `sangiacomo` |
| 13 | Fulvio Taccuino | la Tutela (gli Orecchi) | F `sirena`, `biblioteca`, E `casa_114` |
| 14 | Pecorino | i briganti | C `radura`, F `piazza` nei giorni di mercato |
| 15 | Zio Tè | i beduini | A `tavolato`, F `piazza`, `caruggio` |

---

## 1. Totò Microfono — Salvatore Pirastu

- **Chi**: 47 anni, tipografo. Di giorno stampa i manifesti del Garante alla Tipografia Totò. Il giovedì sera li prende in giro al
  Circolo. Non è della Risacca: è peggio, è uno che non riesce a stare zitto.
- **Dove e quando**:
  - lunedì-venerdì `casa_171` 7-18 (in vetrina, le mani nere d'inchiostro);
  - `bar` 18:30: prova i pezzi su Gino, che non ride mai;
  - `osteria` 20: dà la schiena allo schermo del Garante;
  - **giovedì** `casa_114` (Circolo dei Lavoratori): tombola alle 20:30, palco 21:30-22:30;
  - sabato `piazza` 11, «raccoglie materiale» parlando coi passanti; domenica dorme.
- **Voce**: stand-up puro. Parte da una cosa piccola e vera, la porta all'assurdo, pausa, botta, se ne va.
- **Gag visiva**: usa come microfono quello che ha in mano: la bottiglia, un manifesto arrotolato, una pagnotta (posa `telefona`,
  prop in mano). Sotto il braccio sempre un rotolo di manifesti del Garante (`porta`).

**Primo incontro**
- «Stampo i manifesti del Garante. Lui mette la faccia, io l'inchiostro.»
- «Sai cos'è la libertà di parola? È quando parli e poi corri.»
- «Prova microfono. Uno, due. Due è già un assembramento.»
- «Il Garante dice che il popolo è unito. È vero: in fila dal Wu.»

**Ritorno**
- «Oh, il pubblico! Giovedì vieni? Mi serve uno che ride per primo.»
- «Ho un pezzo nuovo sulla tessera annonaria. Dura poco, come la tessera.»
- «Tu sei quello che non ride. Ti metto in prima fila. Ti voglio sudato.»
- «Ho stampato diecimila "L'ordine è una carezza". Ho il polso rotto.»

**Da solo**
- «"Il Garante ha i piedi"… no. "Il Garante ha i calzini." Meglio.»
- «Pausa. Botta. Pausa. Botta. Pausa. Fuga.»
- «La parrucca detta due volte è satira. Tre volte è il confino.»
- «Bel pubblico stasera. Due Orecchi, un Grigio e mia cognata.»

**Il pezzo del giovedì** (formato «pezzi», 3-5 battute di fila verso la sala)
- «Mio cognato s'è comprato la macchina a rate. Sessanta rate.»
- «Ne ha pagate tre. Le ruote sono sue. Il resto è del Banco.»
- «Quando frena, frena il Banco. Quando sbanda, sbanda lui.»
- Alle 20 si accende lo schermo e il pezzo cambia a metà: «…e invece il Garante, che uomo. Alto. Sopra tutti. Sopra le leggi.»
  «Instancabile. Parla ogni sera. Mai visto dormire. O lavorare.»

**Arco**
1. *Giovedì 1.* Lo spettacolo va. Se c'eri, da lì in poi ti chiama «il pubblico». In sala c'è Fulvio Taccuino (scheda 13) che ride troppo.
2. *Repressione ≥ 2, oppure la Zia ha mandato qualcuno in sala.* Totò ammorbidisce: fa i pezzi sul tempo e sulla suocera. Si vede:
   porta la cravatta (ha paura) e il pubblico è a metà. A te dice: «Stasera niente Garante. Stasera la pioggia. La pioggia non denuncia.»
3. *Il bivio.*
   - **Se lo aiuti** (sali sul palco, trovi l'Orecchio, gli procuri il rotolo di carta della tipografia per i volantini): fa il pezzo
     della parrucca e il Morale sale.
   - **Se la Zia lo vende**: Grigi alla tipografia, i rotoli di manifesti buttati per strada sotto la pioggia.
4. *La fine.*
   - **Venduto**: il giovedì dopo il palco è vuoto, c'è solo il microfono. Ogni tanto uno dei ragazzi (scheda 2) ci sale, dice una
     frase e scende: «Totò direbbe una cosa. Io dico: Totò.»
   - **Salvato**: il giovedì si sposta al covo, per pochi. Si vede in città: sotto ai manifesti del Garante che stampa compare una
     riga minuscola in fondo, ogni settimana diversa («Stampato con la mano sinistra»). **[NUOVO]**

**Tono verso Nino**
- complice: «Tu sei materiale buono. Tranquillo, nel pezzo ti cambio il nome.»
- paura: «Stasera niente pezzi. Stasera chiamo i numeri della tombola.»
- rancore: «Sai che c'è? Il pezzo su di te fa ridere. Lo tengo.»
- sospetto: «Bella serata. Lei è dell'Ufficio? Allora il Garante è un genio.»

---

## 2. Quelli della rampa — Sbarra, Biscotto, Rasoio

Tre ragazzi della periferia ovest che camminano e parlano. È la scena 4 della Regia («Fino al mattino») resa ricorrente. Non sono un
gruppo con un capo: si contraddicono, si interrompono, chiudono un attimo prima della battuta. Le battute vanno dette a turno.

- **Sbarra — Michele Usai**, 19 anni, disoccupato. Il nervoso. Spiega a tutti cosa farebbe a un Grigio, e non lo fa mai. Si chiama
  così perché si porta dietro un pezzo di sbarra bianca e rossa rubato a un posto di blocco.
- **Biscotto — Davide Sechi**, 17 anni, garzone al Mattonificio (`casa_103`). Il sognatore: storie lunghe che non arrivano da nessuna
  parte, teorie sul Garante. Mangia biscotti da una scatola di latta.
- **Rasoio — Samanta Loi**, 18 anni, lavora alla Lavanderia Pina (`casa_141`). Quella seria. Una frase e la discussione è chiusa.
- **Dove e quando**:
  - Rasoio `casa_141` 8-14 tranne la domenica; Biscotto `casa_103` 7-13;
  - tutti e tre ai `giardini` 15-17, alla rampa chiusa con le transenne;
  - `officina` 17, a scroccare a Dorino; `flipper` 19;
  - alle 20 a `piazzetta`, di spalle allo schermo;
  - 23-01 il giro lungo verso il centro (`vico`, `caruggio`, `calata`) per evitare i Grigi;
  - domenica pomeriggio `spiaggia`.
- **Voci**:
  - Sbarra: «fra», «zio», domande retoriche, rabbia che finisce in niente;
  - Biscotto: «secondo me…», divaga, si perde;
  - Rasoio: secca, piatta, ha sempre l'ultima parola.
- **Gag visiva**:
  - Sbarra fa la boxe con l'ombra (`discute`) e ha la sbarra in spalla (`porta`);
  - Biscotto ha la scatola di latta (`porta`);
  - Rasoio sta a braccia conserte (`braccia`).
  - Camminano sempre in fila per tre. Quando ne manca uno, lo spazio resta.

**Primo incontro**
- Sbarra: «Oi. Tu sei Nino. Quello del debito. Fra, sei famoso.»
- Biscotto: «Secondo me il Garante non ha i piedi. In TV mai visti.»
- Rasoio: «Ha i piedi. Li tiene sul collo nostro. Andiamo.»
- Sbarra: «Se un Grigio mi tocca, giuro, gli faccio… gli faccio una cosa.»
- Rasoio: «Gli fai il bucato. Lo stiro io, mercoledì.»

**Ritorno**
- Biscotto: «Nino! Ti stavamo cercando. No, è una bugia. Ma ci stai.»
- Sbarra: «Hanno chiuso la rampa. Pure la scala dietro, zio. Pure l'aria.»
- Rasoio: «Ancora vivo? Allora offri. È la tassa per essere vivo.»
- Biscotto: «Ieri è passata l'Alfetta. Non è successo niente. Due volte.»

**Da soli** (tra loro, mentre passi)
- Biscotto: «Se ti rettificano, ti rettificano tutto? Pure le orecchie?»
- Sbarra: «Il manifesto dice "ognuno al suo posto". Il mio è 'sto muretto.»
- Biscotto: «Mio nonno dice che prima c'erano le feste. Che cazzo erano?»
- Sbarra: «Un giorno me ne vado sulla nave dell'Impero. Nella stiva. Coi polli.»
- Rasoio: «Coi polli ci stai già, Michè.»
- Rasoio: «Mezzanotte e niente. Domani stessa ora, stesso niente. Puntuali.»

**L'Alfetta che passa piano** (il momento serio, sempre uguale)
- Silenzio. Biscotto: «…» Sbarra: «Respira.» Rasoio: «Respiro dopo.»
- L'Alfetta va via. Sbarra: «Visto? Niente.» Rasoio: «Fino a qui.» Si riparte.

**Arco**
1. *Le prime sere.* Cazzate e paranoie. Se fai con loro il giro della notte almeno una volta, diventano «i tuoi»: ti aspettano a
   `piazzetta` alle 22.
2. *Repressione ≥ 2.* I giardini chiudono del tutto: i tre si spostano alla `discarica` e al `vecchio_3`. Se il Morale è sopra 50,
   Sbarra fa un'onda col gesso sulla rampa, storta.
3. *Il bivio, la sera dopo un tuo giorno violento o con Repressione ≥ 3.* Sbarra non c'è: l'hanno fermato. Biscotto e Rasoio camminano
   in due, con lo spazio in mezzo.
   - **Se lo tiri fuori** (Rocca, Ferri pagato, ti prendi la colpa): torna con un occhio nero e una sbarra nuova, e sta più zitto.
4. *La fine.*
   - **Sbarra non torna entro tre giorni**: Biscotto smette di parlare, cammina e basta. Rasoio diventa reclutabile nella Risacca
     **[NUOVO]**, e lo dice da sola: «Io mi sono rotta di stirare i loro panni.»
   - **Sbarra torna**: una notte i tre riaprono la rampa. Tolgono le transenne, ci dipingono l'onda e ci vanno con lo skate.
     Al mattino le transenne sono rimesse, l'onda resta.

**Tono verso Nino**
- complice (Sbarra): «Questo è Nino. È dei nostri. Nino, di' una cosa da dei nostri.»
- paura (Biscotto): «Ciao Nino. Noi stavamo andando. Da un'altra parte. Sempre.»
- rancore (Rasoio): «Per colpa tua hanno preso Michele. Cammina dall'altro lato.»
- sospetto (Sbarra): «Fra, ti vedono coi Grigi. Spero che glieli stai vendendo.»

---

## 3. Lo Squalo al telefono — Sandro Neri, da casa

- **Chi**: è `sandro` del cast, il creditore di Nino (`game.js` lo chiama «lo Squalo»). Di nuovo c'è la **sua vita di casa**, che entra
  nelle telefonate: la moglie **Graziella** (sempre fuori campo), il figlio **Denis** di 8 anni, la suocera, il sugo.
  *Nota di canone*: la Bibbia dice «ex Squalo», il codice dice «lo Squalo». Qui seguo il codice.
- **Dove e quando**: suona la cabina (`cabina_sip`) più vicina quando le passi a meno di 12 m. Succede una volta al giorno finché c'è
  il debito, e in più martedì e venerdì alle 13:15 (ora di pranzo) e alle 20:05 (Graziella guarda il Garante). Di persona lo vedi al
  `magazzino` alle 10 e al `flipper` alle 17, con il grembiule da cucina sotto la giacca.
- **Voce**: cortesia da pranzo della domenica, minaccia sotto, e la casa che interrompe a ogni frase.
- **Gag visiva**: la cabina che squilla e ondeggia la cornetta appesa. Nino alza la cornetta (`telefona`). Sandro col grembiule.

**Prima telefonata**
- «Nino. Sono io. Sì, quello. Il debito. Cinque… Graziella, abbassa!»
- «Cinquecentomila. Non sono io che li voglio. È il principio. E io.»
- «Ti spezzo… No, amore, non a te. A Nino. Nino, ti saluta mia moglie.»
- «Giovedì all'alba, alla calata. Porta i soldi. Il caffè lo porto io.»

**Ritorno** (le telefonate dopo)
- «Nino, lo Squalo. Indovina chi ha la febbre? Il piccolo. E tu, presto.»
- «Chiamo da casa: al magazzino i muri hanno gli Orecchi. Qui la suocera.»
- «Pagato metà? Bravo. Metà gamba non te la rompo. Scegli quale metà.»
- «No, mamma, è lavoro. …Mia suocera dice che hai la voce da debitore.»

**Da solo** (se alzi la cornetta e non dici niente, senti la casa)
- «Respira, ti sento. Respira pure. La telefonata la metto sul debito.»
- «…sì, amore, il ragù va girato. Come i soldi. Se no si attacca.»
- «Graziella, chi ha usato il mio rasoio per le gambe? …Ah. Il cane.»
- «Denis, non si dice "stronzo". Si dice "il signore che deve a papà".»

**Arco**
1. *Settimana 1.* Minaccia e appuntamento vero (giorno, ora, luogo), che finisce nel Taccuino.
2. *Il debito.*
   - **Se paghi una parte**: le telefonate si fanno più calde e lui comincia a chiederti favori («Passa dal Wu, prendi il basilico»).
   - **Se non paghi**: la cornetta la prende Graziella: «Sono la moglie. Lui è dolce. Io no.» Da lì le minacce le fa lei.
3. *La Famiglia sospetta di lui* (in `fazioni.js` «parla troppo»), *oppure la Zia lo vende, oppure Repressione ≥ 3* (perquisizioni).
   Chiama da cabine sempre diverse, sottovoce, e ti chiede di nascondergli un pacchetto per due giorni. Si vede: niente grembiule,
   si guarda dietro.
4. *La fine.*
   - **Debito pagato**: l'ultima telefonata è un invito a pranzo la domenica, «ormai sei di famiglia», ed è la cosa più spaventosa
     del gioco. Dopo, la cabina suona una volta sola: è Graziella che vuole sapere se la ricetta del ragù gliel'ha data Nino.
   - **Debito non pagato**: la cabina suona e nessuno parla. La mattina dopo sulla cornetta c'è un pesce.

**Tono verso Nino**
- complice: «Si dice in giro che hai fegato. Il fegato vale. Lo segno.»
- paura: «Ho saputo di quel casino. Bravo. Adesso paga, che mi fai paura.»
- rancore: «Mi hai fatto un torto. Mia moglie dice di perdonare. Lei non conta.»
- sospetto: «Chi c'è lì con te? Nessuno? Allora perché la cabina fa l'eco?»

---

## 4. Agente Reperto — Oreste Murgia

- **Chi**: 46 anni, agente scelto della Guardia Insulare. Il moralista: multa i baci in pubblico, i capelli lunghi, le gonne corte.
  Fuma quello che sequestra, beve la vodka dell'Impero che confisca, e il mercoledì sera fa una lunga «ispezione» all'Hotel Paradiso.
  Non è Ferri: Ferri è stanco e si vende, Murgia ci crede, e intanto si serve.
- **Dove e quando**:
  - `commissariato` 7;
  - ronda in `piazza` 9-12, a caccia di coppie;
  - `giardini` 15, sequestri ai ragazzi;
  - 18 l'Alfetta ferma al `belvedere`, i vetri appannati e il fumo dal finestrino;
  - **mercoledì** `paradiso` 22-24;
  - domenica 17 a braccetto con la madre sulla `passeggiata`, cittadino modello.
- **Voce**: predica sul degrado con le parole di un regolamento, e a ogni frase gli scappa un'ammissione.
- **Gag visiva**: una bustina con scritto REPERTO che annusa e si rimette in tasca. Fuma (`fuma`) e, appena lo guardi, nasconde la mano
  dietro la schiena (`dietro`).

**Primo incontro**
- «Lei. Mani in vista. Quello era un bacio? In pubblico? Duemila lire.»
- «Il vizio è una malattia, ragazzo. Io lo studio. Da vicino. Ogni sera.»
- «Questo lo sequestro. Per la sua salute. Ha da accendere?»
- «La morale è come la divisa: si lava poco, ma si porta.»

**Ritorno**
- «Ancora lei. Mi sembra lucido. Troppo lucido. Ha preso qualcosa? Ne ha?»
- «Sto facendo un'indagine sul degrado. È lunga. Le prove le ho in tasca.»
- «Ci siamo visti al Paradiso? No. Io al Paradiso non ci vado. Basta.»
- «Tutto in regola? Peccato. Cioè: bene. Molto bene. Circolare.»

**Da solo**
- «Centrale, Murgia. Sono in appostamento. …No, non sono fatto.»
- «Reperto dodici. Analisi: buono. Molto buono. Reperto tredici.»
- «Se mi vede mia madre, mi rettifica lei. Altro che la Pardo.»
- «La gioventù perduta. L'ho persa pure io. Al Paradiso, nel '71.»

**Arco**
1. *I primi giorni.* Fa la morale, multa i ragazzi. Se passi dal belvedere alle 18 lo vedi fumare in macchina.
2. *Lo becchi* (fotocamera, oppure lo vedi entrare al Paradiso il mercoledì). Diventa il «tuo» Grigio: ai posti di blocco guarda da
   un'altra parte, ma ti chiede «reperti» (sigarette, vodka). Si vede: ti fa l'occhiolino e ti saluta di nascosto (`saluta`, piccolo).
3. *Repressione ≥ 3: Pardo e Vasco stringono sulla corruzione.* In pubblico diventa durissimo per coprirsi e ferma i ragazzi (vedi
   incontro B). **Se la Zia lo vende** (lei del Paradiso sa tutto): lo trasferiscono.
4. *La fine.*
   - **Trasferito**: lo trovi al `varco`, al freddo, accanto al Caporale Sanremo (scheda 12), pulito, sobrio e amaro:
     «Qui il vizio non arriva. Arriva solo il vento.»
   - **Protetto da te**: lo promuovono brigadiere (una striscia nuova sulla manica). È più moralista e più corrotto, e senza saperlo
     rivende alla Risacca i pezzi di radio sequestrati. **[NUOVO]**

**Tono verso Nino**
- complice: «Io e lei non ci conosciamo. Però giovedì mi porta quella cosa.»
- paura: «Buonasera. Non ho visto niente. Non ho fumato niente. Arrivederci.»
- rancore: «Me la ricordo, la sua faccia. È una faccia da modulo lungo.»
- sospetto: «Si fermi. Perquisizione. Cosa cerco? Lo scopro quando lo trovo.»

---

## 5. Ragionier Telone — Ermanno Cocco

- **Chi**: 51 anni, impiegato all'Ufficio Mario (`casa_63`): timbra pratiche per il Ministero. È l'uomo del Miracolo: un'Argenta
  grigio metallizzato a sessanta rate, che chiama **Gloria**. La tiene sotto un telone e non la usa, se no si consuma.
- **Dove e quando**:
  - 6:45 lucida Gloria sotto il Condominio `mare`;
  - 7:30 va al lavoro a piedi; `casa_63` 8-17;
  - 17:30 al `benzina`, solo per misurare le gomme;
  - 18:30 lucida di nuovo;
  - **alle 20** si siede in macchina, ferma, e ascolta il Garante all'autoradio: «si sente meglio»;
  - sabato 10 lavaggio a mano;
  - domenica 11 il giro della `passeggiata` a 10 all'ora, con moglie e figli che camminano accanto, perché i sedili non si siedono.
- **Voce**: pomposo, pauroso, conta tutto in rate. È per l'ordine perché l'ordine tiene bassi i tassi.
- **Gag visiva**: il panno con cui lucida (`spazza`); solleva un angolo del telone, controlla, ricopre. Alle 20 è seduto in macchina
  da solo, a guardare dritto davanti a sé.

**Primo incontro**
- «Non si appoggi! È un'Argenta. Rata ventidue di sessanta. Grazie.»
- «Si chiama Gloria. Con mia moglie parlo meno. Gloria non ribatte.»
- «A piedi, sì. Se la uso si consuma. Mica l'ho comprata per usarla.»
- «Io sono per l'ordine. L'ordine tiene bassi i tassi.»

**Ritorno**
- «Rata ventitré pagata. Tre giorni a pane e acqua. Ma che riflessi.»
- «Lei passa sempre vicino a Gloria. Le faccio presente che la vedo.»
- «Mio figlio vuole guidare. Gli ho detto: a trent'anni, a rata finita.»
- «Ha sentito il Garante ieri? Dalla mia autoradio è un'altra persona.»

**Da solo**
- «Chi è bella? Chi ha il servosterzo? Brava. Brava, Gloria.»
- «Mancano trentotto rate. Morirò prima io. Lei resterà nuova.»
- «Un graffio. Un graffio! …No. È un capello. Respira, Ermanno.»
- «Se mi pignorano, che si prendano il divano. Il divano non ha un'anima.»

**Arco**
1. *All'inizio.* Orgoglio e panno.
2. *La nave dell'Impero non sbarca, o Repressione ≥ 2.* Il Banco alza gli interessi e lui salta i pasti. Si vede: cravatta allentata,
   lucida anche di notte, alla luce del lampione.
3. *Il bivio.*
   - **Se lo aiuti** (paghi una rata, cacci i ragazzi che vogliono dipingerla): ti deve un favore enorme.
   - **Se la Zia lo vende** (una volta al bar si è lamentato dei tassi del Garante): arriva il carro attrezzi del Banco. È la scena
     2 della Regia, ma è la sua: lui in giacca, il telone piegato.
4. *La fine.*
   - **Pignorata**: gira col telone piegato sotto il braccio e lucida il posto vuoto. «Gloria sta in un posto migliore. Il deposito
     del Banco.» Comincia a sbraitare contro il Banco e il giovedì lo trovi al Circolo in prima fila: è lui il cognato di Totò.
   - **Salvata da te**: te la presta una volta per una fuga. «Non oltre i trenta. E non respiri sui sedili.» La mattina dopo sul
     cofano c'è un'onda col gesso, e lui la lucida piangendo, ma non la cancella del tutto.

**Tono verso Nino**
- complice: «Lei è una brava persona. Non lo dica in giro, potrebbero pensar male.»
- paura: «Io non la conosco. Gloria neanche. Siamo una famiglia per bene.»
- rancore: «Lei ha toccato Gloria. Lo so. Ho preso le impronte. Col talco.»
- sospetto: «Lei come si chiama? No, così. Per il registro condominiale.»

---

## 6. Permesso — Tullio Caddeo

- **Chi**: 38 anni, esattore della Famiglia, risponde a Tano. Il più educato dell'isola: dà del Lei, porta le paste, chiede scusa prima
  di minacciare. Vive con la madre.
- **Dove e quando**:
  - **lunedì**: Panetteria Mario (`casa_59`) 9, `wu` 10, `fiori` 11, `car_2` 13 (prima mangia, paga, poi incassa);
  - **martedì**: `gelateria` 9, `video` 11, Sartoria Rosaria (`casa_154`) 15;
  - **mercoledì**: i barbieri del quartiere del governo (`casa_145`, `casa_89`);
  - giovedì a casa con la madre;
  - **venerdì**: `flipper` 18, `magazzino` 23 coi conti;
  - domenica `piazza` 11, a braccetto con la madre.
- **Voce**: cortesia da sagrestia (senza la sagrestia), diminutivi, eufemismi. La minaccia è sempre nella subordinata.
- **Gag visiva**: un vassoio di paste incartate (`porta`). Si leva il cappello per salutare (`saluta`).

**Primo incontro**
- «Buongiorno, mi perdoni il disturbo. Io sono quello del disturbo.»
- «Le ho portato le paste. Le paste sono un regalo. Il resto no.»
- «Non lo chiami pizzo, la prego. Lo chiami "contributo alla serenità".»
- «Se non può, non si preoccupi. Mi preoccupo io. Poi viene Rocco.»

**Ritorno**
- «Che piacere! Lei non mi deve niente. Per ora. Che bella giornata.»
- «Mi scusi se le sorrido. È deformazione professionale. Come il resto.»
- «Il Wu oggi ha pagato con le lacrime. Gliele ho asciugate io. Scalate.»
- «Mi saluti sua madre. Non la conosco: è per dire che so dove sta.»

**Da solo**
- «Il segreto è il Lei. Quando passo al tu, sono già botte.»
- «Panetteria, quindici. Fioraia, la pago io. Non ditelo al capo.»
- «Mamma dice che sono troppo buono. Mamma non ha mai visto Rocco.»
- «Grazie. Mi scusi. Per cortesia. …Rocco, il mignolo. Solo il mignolo.»

**Arco**
1. *Il giro.* Se gli capiti vicino, ti fa portare il vassoio.
2. *La cassa della Famiglia cala (o la sabotate tu).* Il capo stringe e gli mette Rocco dietro. Si vede: Rocco cammina due passi
   dietro di lui, e i «mi perdoni» gli escono strozzati.
3. *Il bivio.*
   - **Se paghi tu la quota di qualcuno** (Rosa, il Wu): Tullio si commuove e ti dà un'informazione, l'ora esatta del cassiere.
   - **Se la Zia lo vende** (è vero che la quota di Rosa la paga di tasca sua): ha rubato alla Famiglia. Gli fanno la croce rovesciata.
4. *La fine.*
   - **Cacciato**: fa la colletta per la Risacca porta a porta, educatissimo. **[NUOVO]** «Contributo alla serenità. Quella vera.»
   - **Promosso fidato**: comincia a dare del tu e smette di portare le paste. È il cambio più spaventoso della città, e lo capisci
     da solo.

**Tono verso Nino**
- complice: «Lei è uno che capisce. Si prenda un cannolo. Due. Me li segno.»
- paura: «Prego, prego, passi lei. Io aspetto. Io aspetto sempre.»
- rancore: «Mi dicono che mi ha mancato di rispetto. Mi addolora. A Rocco no.»
- sospetto: «Che coincidenza vederla qui. Io alle coincidenze non credo. Le pago.»

---

## 7. Mezzolitro — Raimondo Lai

- **Chi**: 64 anni, reduce. Nel '79 non firmò e si è fatto quattro anni di confino. È la Risacca di prima, quella che ha perso, e beve
  per tutti quelli che non ci sono.
- **Dove e quando**:
  - `osteria` 11-15;
  - `giardini` 15: dà da mangiare ai piccioni e li chiama coi nomi dei compagni;
  - `osteria` 17-23, e alle 20 canta stonato sopra il Garante;
  - lunedì e giovedì all'alba alla `calata`, a guardare la nave dell'Impero «che non ci ha salvati»;
  - domenica 10 alla chiesa senza tetto (`vecchio_3`), da solo.
- **Voce**: amaro, beone, frasi che partono grandi e crollano, tenero quando non te lo aspetti.
- **Gag visiva**: alza il bicchiere in un brindisi a nessuno (`beve`, poi `saluta`). Sul petto una medaglia fatta col tappo di una
  bottiglia.

**Primo incontro**
- «Tu. Sì. Hai la faccia di uno che dice no. Siediti, che passa.»
- «Nel '79 eravamo trecento. Poi cento. Poi io e il vino. Il vino tiene.»
- «Ti offro da bere. No: offri tu. Io offro l'esperienza.»
- «Non chiamarmi eroe. Chiamami Mezzolitro. Eroe costa di più.»

**Ritorno**
- «Ancora vivo? Io sì. Che vergogna, alla mia età, essere ancora vivo.»
- «Ah, quello del debito. Pure io ero in debito. Con la storia.»
- «Oggi non parlo del '79. Parlo del '78. Era peggio, ma si rideva.»
- «L'onda l'hai fatta storta. Bravo. Le nostre erano dritte, e guarda.»

**Da solo**
- «A Peppino. A Tore. A quello coi baffi, come cazzo si chiamava.»
- «Garante, sei uno stronzo. In privato. In pubblico pure, ma piano.»
- «Un altro mezzo. Il mezzo è una misura politica: non si arrende.»
- «Sulla tessera annonaria ho scritto "no". Me l'hanno timbrata.»

**Arco**
1. *All'inizio.* Beve, racconta, ti vuole bene senza motivo.
2. *Il Morale sale sopra 50 (le onde sui muri).* Se ne accorge e le conta. Si vede: la mattina cammina invece di stare seduto, e la
   medaglia è lucidata.
3. *Il bivio.*
   - **Se lo porti a un'azione della Risacca**: ti dice dov'è il deposito del '79 tra le case crollate (`vecchio_2`), con dentro un
     ciclostile arrugginito. **[NUOVO]**
   - **Con Repressione ≥ 4 (Ora Quieta)**: lo portano via perché ha cantato sopra il Garante. All'osteria resta il suo posto, col
     bicchiere capovolto.
4. *La fine.*
   - **Reclutato**: sta sobrio un giorno intero per la notte grande, poi festeggia per tre. All'osteria brinda a te col tuo nome di
     battaglia, a voce troppo alta.
   - **Arrestato e liberato da te**: torna con una strofa nuova.
   - **Arrestato e non liberato**: ogni sera alle 20 qualcuno all'osteria gli versa il mezzo litro e lo lascia lì.

**Tono verso Nino**
- complice: «Tu sei dei nostri, ragazzo. Dei miei. Di quelli vivi, per ora.»
- paura: «Stammi lontano. Ne ho già sepolti abbastanza, come te.»
- rancore: «Tu hai venduto qualcuno. Si sente dall'odore. Odori di '79.»
- sospetto: «Sei dell'Ufficio? No? E allora perché bevi così poco?»

---

## 8. La Cabala — Nunzia Atzeni

- **Chi**: 57 anni, vedova, gestisce il **Totogarante**: scommesse clandestine sul discorso delle 20 (quante volte dice «ordine», se
  tossisce, se la parrucca si muove, quanto dura). Ha anche un lotto clandestino con una smorfia tutta sua: 33 il Garante, 47 il Grigio,
  90 la paura. La Famiglia vuole la sua parte, la Zia gioca di nascosto.
- **Dove e quando**:
  - `piazza` 9-12, raccoglie le giocate; `wu` 12;
  - l'«ufficio» nel retro della Lavanderia Pina (`casa_141`) 14-17 (Rasoio la copre);
  - **`bar` 19:30-20:30**: l'estrazione è il discorso del Garante, tutti col biglietto in mano a contare;
  - `osteria` 21, paga le vincite;
  - domenica al Borgo dei pescatori (`pescatori_s`): scommesse sul pescato.
- **Voce**: velocissima, solo numeri e quote, materna e cinica.
- **Gag visiva**: matita dietro l'orecchio, quaderno aperto (`legge`). Davanti allo schermo conta sulle dita.

**Primo incontro**
- «Stasera "ordine" lo dice sette volte. Paga tre a uno. Ci stai?»
- «Parrucca che si muove, paga dieci. Non si muove mai. Per questo paga.»
- «Non è azzardo. Il Garante è sicuro. È la cosa più sicura che c'è.»
- «Hai sognato un Grigio? Quarantasette. Un Grigio che ride? Novanta.»

**Ritorno**
- «Ieri "ordine" nove volte. Ho pagato il condominio. Grazie, Garante.»
- «Hai un debito? Ottimo. Chi ha un debito gioca meglio. Ha fame.»
- «Ti ho tenuto la schedina. Ho scritto "tosse". Stasera è raffreddato.»
- «Non fidarti di chi vince sempre. Io non vinco mai. Io incasso.»

**Da sola** (davanti allo schermo, alle 20)
- «Ordine, uno. Ordine, due. Carezza, uno. Mamma mia, che serata lenta.»
- «Sette… otto… ha starnutito. Chi aveva lo starnuto? Nessuno. Banco.»
- «Se il Garante muore, chi paga? Il Garante. Glielo chiedo.»
- «Il Wu gioca il dodici da quattro anni. Il dodici lo sa e si nasconde.»

**Arco**
1. *All'inizio.* Il Totogarante gira. Puoi giocare: prima delle 20 scegli una previsione, alle 20:30 si paga.
2. *La Famiglia viene a riscuotere* (incontro A con Permesso), *oppure il Garante tace* (la Risacca spegne il ripetitore della
   `vetta`): niente discorso, tutte le giocate nulle, il bar in rivolta. Lei passa a scommettere su Radio Scirocco. Si vede:
   l'estrazione si sposta dallo schermo alla radio sul bancone.
3. *Il bivio.*
   - **Se la Zia la vende** (ha debiti di gioco con lei) **o con Repressione ≥ 3**: i Grigi entrano in lavanderia e lei nasconde i
     biglietti nel pesce, al Borgo.
   - **Se la copri tu** (ti tieni il quaderno per una notte): ti regala una «quota sicura», cioè l'ora del cassiere della Famiglia,
     le 10 alla Lavanderia Stella.
4. *La fine.*
   - **Arrestata**: al bar continuano a scommettere tra loro, «come faceva la Cabala». Il quaderno passa di mano in mano.
   - **Prospera**: comincia a prendere scommesse sulla Risacca («la prossima onda, in centro, paga cinque»). È un pericolo per te:
     Pardo può leggere le quote e prevedere le vostre mosse. **[NUOVO]**

**Tono verso Nino**
- complice: «Per te quota speciale. Perdi lo stesso, ma con affetto.»
- paura: «Su di te non prendo scommesse. Non sono matta.»
- rancore: «Ho una quota su quando ti prendono. Sta scendendo.»
- sospetto: «Chiedi tante quote e giochi poco. Sei un Orecchio o un ragioniere?»

---

## 9. Dottor Vento — Ottavio Pes, «il Tecnico»

La voce di Radio Scirocco. Non è Vinile: lei fa la DJ alla Luna e lo ammira e lo invidia senza sapere chi è.

- **Chi**: 56 anni, riparatore di radio e televisori, timido, balbetta. Di giorno tiene in onda il Garante: è lui che aggiusta gli
  schermi dei bar. Di notte è Dottor Vento. Niente dediche al telefono (la radio è clandestina): parla lui e basta.
- **Dove e quando**:
  - casa al Condominio `stella`;
  - `bar` 9 (lo schermo di Gino), `sirena` 11 (la Zia lo adora: «che bravo ragazzo»), `osteria` 15;
  - `cultura` 16 (l'impianto del Palazzo); `piazza` 19:45: controlla lo schermo grande prima delle 20;
  - **in onda martedì, venerdì e domenica 23-01**, da un posto che cambia ogni volta. Lo senti dalle radio delle case, dall'officina
    di Dorino, dalla Luna.
- **Voce**: di giorno mite, tecnica, chiede scusa. In onda sfacciato, veloce, gergo da radio. La frase «massa a terra» la dicono tutti
  e due: è l'indizio.
- **Gag visiva**: ha sempre in braccio una valvola o un tubo catodico (`porta`) e un cacciavite dietro l'orecchio. Quando parla il
  Garante piega la testa come per sistemare l'antenna.

**Primo incontro** (di giorno)
- «Permesso, scusi. Devo rimettere in onda il Garante. Ha perso il rosso.»
- «Radio Scirocco? Non la conosco. Su che frequenza, che la tolgo?»
- «Le valvole sono come la gente. Si scaldano, si scaldano, poi saltano.»
- «Non tocchi l'antenna. Se la tocca, sente cose. Vietate. Bellissime.»

**Ritorno**
- «Ah, lei. Ha la radio a casa? La tenga bassa. Di notte tira un vento…»
- «Ho dormito come un sasso. Dalle undici all'una no. Il resto sì.»
- «La TV della Zia l'ho regolata io. Adesso vede tutto. Un po' meno.»
- «Dicono che quello della radio ha una bella voce. Io ho la sinusite.»

**Da solo**
- «Il Garante ha un falso contatto. Da sette anni. Non si ripara.»
- «Massa a terra. Tutto a terra. Prima o poi pure lui.»
- «Mezza onda, onda intera. L'onda intera si vede da lontano.»
- «Prova microfono. Uno, due. …No, quello è Totò. Uno.»

**In onda** (dalle radio, di notte)
- «Buonanotte, isola. Qui Dottor Vento. La ricetta è sempre quella: no.»
- «Il Garante stasera ha detto "carezza" undici volte. Carezzatelo.»
- «Ai Grigi in ascolto: la vostra Alfetta ha una gomma a terra. Fra poco.»
- «Un pezzo per chi è al varco col freddo. Sì, soldato, tu. Balla.»
- «Radio Scirocco. Non ci trovate: siamo quello che passa dalla finestra.»

**Arco**
1. *Settimana 1.* Tre notti in onda. Se stai attento, la frase «massa a terra» la senti sia alla radio sia al bar.
2. *Lo scopri* (lo segui alle 22:45, o lo riconosci dalla tosse). Ti prega di stare zitto, poi diventa un alleato: manda in onda i
   messaggi della Risacca (obiettivo «trasmissioni»). Si vede: mentre aggiusta lo schermo del Garante, ti fa l'occhiolino.
3. *Repressione ≥ 3: arriva il furgone del goniometro.* La Tutela assume proprio lui per trovare la radio pirata. Lui «aiuta», e il
   furgone gira in tondo intorno alla fontana. **Se la Zia lo vende** (il suo televisore va a righe ogni martedì alle 23): Pardo
   passa in bottega a farsi aggiustare una radio che funziona.
4. *La fine.*
   - **Preso**: Radio Scirocco tace. Alla Luna Vinile prende il microfono e dice una frase sola: «Il Dottore è malato. Il vento no.»
   - **Salvo, e col ripetitore conquistato**: alle 20 entra nel discorso del Garante per dieci secondi, su tutti gli schermi
     dell'isola. Neve, e la sua voce: «Scusate l'interruzione. Anzi, no.»

**Tono verso Nino**
- complice: «Lei è un buon ascoltatore. Si vede dalle orecchie. Le copra.»
- paura: «Oggi non ho niente da riparare. Niente. Neanche lei.»
- rancore: «Lei mi ha fatto saltare un fusibile, ragazzo. Il mio. Largo.»
- sospetto: «Troppe domande tecniche, per uno che non sa cos'è una valvola.»

---

## 10. Fratello Catalogo — Arturo Serra

- **Chi**: 43 anni, ex rappresentante di aspirapolveri (mai venduto uno). Predica il **Catalogo dell'Impero**: un catalogo per
  corrispondenza sbarcato nell'84, l'unica copia dell'isola, consumata. Non vende niente (il Venditore di niente è un altro) e non
  annuncia la fine del mondo (quello è il Profeta). Annuncia la Merce. La Tutela lo lascia fare: promette il boom gratis.
- **Dove e quando**:
  - **lunedì e giovedì alle 6 alla `calata`**: saluta la nave dell'Impero da lontano, a braccia aperte;
  - `piazza` 10-12, in piedi su una cassetta;
  - `wu` 12: si mette in fila «per testimoniare la fila»;
  - `lungomare` 15, davanti alle vetrine degli alberghi;
  - `benzina` 17, a guardare le macchine che fanno il pieno;
  - alle 20 legge ad alta voce il catalogo sopra il Garante.
- **Voce**: televendita e predica insieme, codici prodotto, superlativi, nessun dio: solo la Merce.
- **Gag visiva**: il catalogo aperto e alzato sopra la testa (`indica`, il catalogo in mano). Una pagina strappata se la tiene in
  tasca e ogni tanto la guarda.

**Primo incontro**
- «Fratello! Hai già il tostapane a due fette? No? Allora sei in ritardo.»
- «Pagina centoquattro: frullatore a sette velocità. Sette! Tu una.»
- «Non dico compra. Dico desidera. Al resto ci pensa la rata.»
- «Codice 4471/B, cyclette da salotto. Pedali tanto e resti lì. Come qui.»

**Ritorno**
- «Sei tornato! Hai desiderato? Si vede: occhi da garanzia due anni.»
- «Giovedì arriva la nave. Dentro c'è il futuro. E le saponette.»
- «Ti manca qualcosa? Bravo. È quello il segreto: che manchi.»
- «Ho visto la tua faccia a pagina sei. Ah, no. Era un modello. Peccato.»

**Da solo**
- «Consegna in sei settimane. Ordinato nell'84. Sono settimane lunghe.»
- «Taglia unica. Colore a scelta, purché arancione.»
- «Soddisfatti o rimborsati. Non sono soddisfatto. Nessuno mi rimborsa.»
- «Il Garante ha la cravatta di pagina trentuno. Lo sapevo. Lo sapevo!»

**Arco**
1. *All'inizio.* Predica a quattro gatti.
2. *La nave non sbarca, o il razionamento stringe.* Il pubblico cresce, perché chi ha fame ascolta. La Tutela comincia a usarlo come
   distrazione e gli regala un megafono. Si vede: il prop diventa il megafono.
3. *Il bivio.*
   - **Se gli porti un oggetto vero dalla nave** (un tostapane passato dai Marsigliesi, vedi Lucien): va in crisi. «Fa solo… il pane.
     Basta?» Diventa un predicatore al contrario, «La Merce non verrà», e se la prende con le rate. Telone lo sente e trema.
   - **Se la Zia lo vende** perché è diventato sovversivo: gli tolgono il megafono e predica sottovoce.
4. *La fine.*
   - **Pentito**: il giorno della nave sta alla calata e grida: «Non aspettate! Dentro non c'è niente! Ci sono le saponette!» Sulla
     copertina del catalogo c'è un'onda disegnata a penna.
   - **Comprato dalla Tutela**: la sua faccia finisce su un manifesto nuovo, «IL BOOM È PER TUTTI», stampato da Totò Microfono.

**Tono verso Nino**
- complice: «Tu sei un cliente speciale. Hai la faccia da carta fedeltà.»
- paura: «Nessun reso, nessun reso! Prendi quello che vuoi e vattene.»
- rancore: «Ti ho tolto dal catalogo. Esaurito. Fuori produzione.»
- sospetto: «Compri poco. Chi compra poco pensa. E chi pensa, eh.»

---

## 11. Lucien — Lucien Caraffa, «le Petit»

- **Chi**: 34 anni, il cuoco e il motorista della barca di Marcel. Odia l'isola, odia il caffè, è innamorato della cucina di Nina
  (e, per allusione, di Nina). Non spara: le pistole le hanno gli altri.
- **Dove e quando**:
  - dorme al `miramare` fino alle 14;
  - 15 Trattoria da Nina (`car_2`): pranzo tardo, critica tutto, chiede il bis;
  - 17 sulla `passeggiata`, fuma guardando il mare dalla parte di casa;
  - 22-04 al `pontile` con Marcel, Jean-Luc e Didier;
  - il mercoledì sera «ha la febbre» e resta da Nina fino a tardi.
- **Voce**: metà francese, metà disprezzo turistico, ma dolce appena si parla di cibo. Niente gag sul pane.
- **Gag visiva**: fuma (`fuma`), sospira con la mano sul cuore. Il caffè lo assaggia e lo rimette giù (`beve`).

**Primo incontro**
- «Bonsoir. Non mi guardi. Se mi guarda poi devo ricordarmi di lei.»
- «Il vostro caffè è una dichiarazione di guerra. L'accetto. Un altro.»
- «Marsiglia ha il mare. Voi avete l'acqua. Non è uguale, mon vieux.»
- «Non faccio contrabbando. Vi porto le cose che vi meritate. Poche.»

**Ritorno**
- «Ah, toi. Ancora qui? Che domanda. Dove vuoi andare, da un'isola.»
- «Ho mangiato da Nina. Malissimo. Domani ci torno. Per protesta.»
- «Marcel dice che parlo troppo con la gente del posto. Tu non sei gente.»
- «Hai visto Nina? Non dirle che chiedevo. Dille che chiedevi tu.»

**Da solo**
- «Maman, se mi vedessi. Contrabbandiere. In un posto senza burro.»
- «Il mare è uguale a casa. Solo che casa è dall'altra parte.»
- «Nina ha messo il finocchio nel ragù. È un crimine. La sposo.»
- «Tre giorni e me ne vado. Lo dico da due anni. Tre giorni lunghi.»

**Arco**
1. *All'inizio.* Ti chiede un favore piccolo: portare un biglietto a Nina, chiuso.
2. *Se porti i biglietti* (sono tre, uno al giorno): ti fa lo sconto sulla roba dei Marsigliesi. **Con Repressione ≥ 2** al pontile
   mettono un riflettore e Marcel lo tiene a bordo. Si vede: Lucien in coperta che fuma e saluta la trattoria da lontano.
3. *Il bivio.*
   - **Se tradisci i Marsigliesi** (stai con la Tutela o con la Famiglia contro di loro): Lucien diventa ostile.
   - **Se la Zia vende i loro orari**: retata al pontile, e Lucien si nasconde nella cucina di Nina. Lo puoi travestire col grembiule.
4. *La fine.*
   - **Aiutato**: resta sull'isola e fa il cuoco da Nina col nome di «Luciano». È il primo Marsigliese che diserta per un ragù.
   - **No**: parte con la barca. Dal ponte grida l'ultima: «Isola di merda! Salutami Nina! Dille che il finocchio…» Una settimana
     dopo arriva da Nina un sacco di caffè vero.

**Tono verso Nino**
- complice: «Tu sei quasi marsigliese. Ti mancano l'eleganza. E Marsiglia.»
- paura: «Doucement. Io sono il cuoco. Le pistole le hanno gli altri tre.»
- rancore: «Mi ricordo di te. Noi ci ricordiamo tutto. Soprattutto chi deve.»
- sospetto: «Chi ti manda? La Zia? Marcel? Nina? Dimmi Nina.»

---

## 12. Caporale Sanremo — Ennio Floris

- **Chi**: 20 anni, soldato di leva della Tutela al Varco del Muro. Vuole fare il cantante. È di San Giacomo e ha nostalgia della madre.
  Parla col cane di servizio, che si chiama Brigadiere.
- **Dove e quando**:
  - `varco` 6-14 (turno in garitta);
  - lunedì e giovedì all'alba al `molo_cargo`, per lo scarico della nave;
  - `caserma_p` 18;
  - domenica libera all'`osteria_sg` di `sangiacomo` dalla madre: lì canta.
- **Voce**: ingenua, formule da regolamento mescolate a canzoni sue, sempre bruttissime.
- **Gag visiva**: tiene il lasciapassare come un microfono mentre lo controlla. Il cane accanto, seduto. Guarda l'orologio (`orologio`)
  e conta i giorni al congedo.

**Primo incontro**
- «Lasciapassare. …Bello. La foto non le somiglia. Per fortuna sua.»
- «Seduto, Brigadiere. Il cane è Brigadiere. Io caporale. Comanda lui.»
- «Lei che è di città: le piace la mia voce? Dica sì. Sono armato.»
- «Qui non passa nessuno. Tranne chi passa. Quelli sono in regola.»

**Ritorno**
- «Ah, lei! Ho scritto una canzone. Si chiama "Varco". Parla di un varco.»
- «Brigadiere l'ha riconosciuta. Scodinzola. Io la devo perquisire.»
- «Mamma dice che sono dimagrito. Le ho detto che la divisa ingrassa.»
- «Il sergente dice: coi civili non si parla. Lei è civile? Allora zitto.»

**Da solo**
- «"Amore mio di cemento, ti guardo dalla garitta"… no. Dalla torretta.»
- «Brigadiere, se scappiamo, tu da che parte vai? Ecco. Pure io.»
- «Novantuno giorni al congedo. Novanta e mezzo. Novanta e…»
- «Centrale, varco. Niente da segnalare. Un gabbiano. Lo segnalo.»

**Arco**
1. *All'inizio.* Annoiato e simpatico. Se gli dai le sigarette due volte, una volta ti fa passare senza lasciapassare (a rischio tuo).
2. *Repressione ≥ 2.* Gli mettono accanto un sergente. Diventa formale e spaventato. Si vede: niente canzoni, schiena dritta (`dietro`),
   e un solo occhiolino.
3. *Il bivio.*
   - **Se passi coi documenti falsi nel suo turno e si scopre, o la Zia lo vende**: lo puniscono col turno di notte al molo cargo,
     al freddo, e gli tolgono il cane.
   - **Se Dottor Vento gli dedica un pezzo**: canta alla garitta a voce piena, e il sergente lo sente.
4. *La fine.*
   - **Diserta**: lo trovi in `pineta` con Divisa. Due disertori, uno che parla a monosillabi e uno che canta.
   - **Arriva al congedo**: un giovedì sale al Circolo da Totò e canta «Varco». È tremenda. Applaudono tutti, anche gli Orecchi.

**Tono verso Nino**
- complice: «Lei passa. Io non l'ho vista. Brigadiere, neanche tu. Bravo.»
- paura: «Si fermi! Cioè: si fermi, per favore. Io ho i nervi.»
- rancore: «Per colpa sua mi hanno tolto il cane. Non la perdono. Lui neanche.»
- sospetto: «Lei passa troppo spesso. O ha una fidanzata o ha un piano.»

---

## 13. Fulvio Taccuino — Fulvio Spanu

- **Chi**: 29 anni, disoccupato, vive con la madre al Condominio `aurora`. Orecchio dilettante: vuole che la Zia lo assuma. Spia male,
  in modo visibile, e scrive tutto. La Zia lo ignora da sette anni.
- **Dove e quando**:
  - `sirena` 8: rapporto alla Zia, che lo manda via;
  - 9-13 segue gente a caso (`piazza`, `vico`, `caruggio`); `wu` 13;
  - `biblioteca` 15: sorveglia Lupo, che gli corregge i congiuntivi nel rapporto;
  - **giovedì `casa_114` 21**: prima fila al Circolo. È lui «quello che ride troppo» della scena 3;
  - `osteria` 22.
- **Voce**: aspirante spia, rapporti pieni di dettagli inutili, insicuro e fiero insieme.
- **Gag visiva**: il giornale coi due buchi per gli occhi, tenuto al contrario (`legge`). Un taccuino in mano.

**Primo incontro**
- «Non mi guardi. Sono in incognito. Si vede? Non si vede. Grazie.»
- «Lei com'è vestito? Lo chiedo per il rapporto. Per la mia memoria.»
- «Io, un Orecchio? Ma si figuri. Al massimo un lobo.»
- «La Zia mi stima. Non me lo dice, se no mi monto. Da sette anni.»

**Ritorno**
- «Ancora lei. Ho un fascicolo su di lei. È un foglio, ma fronte e retro.»
- «Ieri l'ho seguita fino a casa. Poi mi sono perso. Lei dove abita?»
- «Ha detto una cosa contro il Garante? La ripeta piano. Sto scrivendo.»
- «Giovedì al Circolo ho riso tantissimo. Per lavoro. Anche no.»

**Da solo**
- «Ore dieci e un quarto, il soggetto compra il pane. Sospetto. Ciabatta.»
- «Zia, ho una notizia. …Sì, aspetto. …Aspetto. …Va bene, domani.»
- «Rapporto: tutti parlano male del Garante. Tutti. Pure io. Cancella.»
- «Un giorno avrò un nome in codice. Lo voglio bello. Tipo "Fulvio".»

**Arco**
1. *All'inizio.* Ti segue male. Non scopre niente.
2. *Se gli dai informazioni false.* Le porta alla Zia. Se provocano una retata nel posto sbagliato (meglio se della Famiglia), la
   Repressione va da un'altra parte e la Zia comincia a fidarsi di lui. Si vede: lei gli regala un cappotto buono, lui butta il
   giornale coi buchi e diventa pericoloso.
3. *Il bivio.*
   - **Se la Zia vende qualcuno per un suo rapporto** (Totò, i ragazzi), Fulvio si sente in colpa.
   - **Se lo affronti in quel momento**, puoi girarlo: diventa un doppio Orecchio. **[NUOVO]**
4. *La fine.*
   - **Girato**: passa alla Zia i rapporti falsi della Risacca, ed è pessimo anche in questo. Con Repressione ≥ 4 sparisce, e sulla
     panchina della piazza resta il taccuino aperto.
   - **Promosso**: siede alla Sirena accanto alla Zia e non ti parla più. È il segnale che fa più paura.

**Tono verso Nino**
- complice: «Io non l'ho vista. Cioè, l'ho scritto. Ma a matita.»
- paura: «Il rapporto su di lei l'ho strappato. E mangiato. Senza sale.»
- rancore: «Ho riaperto il suo fascicolo. Adesso sono due fogli.»
- sospetto: «Lei è sospetto. Anch'io. Siamo in due. Ci sediamo?»

---

## 14. Pecorino — Bachisio Mele

- **Chi**: 52 anni, pastore e staffetta dei briganti di Malanotte. Scende a vendere il formaggio e nelle forme porta i messaggi.
- **Dove e quando**:
  - lunedì e giovedì alle 7 scende dalla `radura` per la mulattiera;
  - `piazza` 9-12, banco del formaggio accanto a Zio Tè; `osteria` 12; `wu` 14, baratto; alle 16 risale;
  - martedì e mercoledì all'`ovile`; domenica `osteria_sg`.
- **Voce**: proverbi da pastore che sono insulti alla città, poche parole, nessuna fretta.
- **Gag visiva**: una forma di formaggio sotto il braccio (`porta`). Annusa i clienti prima di vendere.

**Primo incontro**
- «Formaggio. Di pecora. La pecora è d'accordo. Tu?»
- «Voi in città vi chiudete in casa per paura. Noi in casa non entriamo.»
- «In montagna il Garante non arriva. Arriva la neve. Lei si scioglie.»
- «Questo ha un anno. Come la latitanza di mio cugino. No, lui di più.»

**Ritorno**
- «Torni? O il formaggio era buono, o la tua vita è triste.»
- «Ti saluta uno. Non ti dico chi. Ha la barba e la lupara. Ti saluta.»
- «Questa forma è per te. Dentro c'è un biglietto. Non mangiarlo.»
- «Il pastore conta le pecore. Io conto i Grigi. Ne mancano tre. Bene.»

**Da solo**
- «Comprano il latte in bottiglia. Come se la pecora fosse di vetro.»
- «Pecora che bela al Garante, il lupo se la mangia per pietà.»
- «Ho venduto due forme a un Grigio. Una era buona.»
- «Su mi lavo. Quaggiù puzzate di benzina e di paura.»

**Arco**
1. *I giorni di mercato.* Se Malanotte ha qualcosa per te, il messaggio arriva in una forma.
2. *Se fai affari coi briganti*, ti porta il formaggio buono e i sentieri della montagna. **Con Repressione ≥ 3** mettono un posto di
   blocco sulla mulattiera e lui smette di scendere. Si vede: al suo posto in piazza c'è una forma sola, col biglietto «Sono di là».
3. *Il bivio.* Se Agente Reperto gli sequestra il formaggio, o la Zia vende il suo ruolo, i briganti rispondono. Una mattina una
   campagnola dei Grigi ha le ruote sostituite da quattro forme di pecorino. **[NUOVO]**
4. *La fine.*
   - **Protetto da te**: una notte ti guida oltre il Monte Scuro (aggancio per una missione di fuga).
   - **Arrestato**: un giorno di mercato scende Malanotte in persona e vende il formaggio a prezzo triplo. Nessuno tratta.

**Tono verso Nino**
- complice: «A te il prezzo di montagna. È uguale, ma te lo dico guardandoti.»
- paura: «A te non vendo. Porti male, come la grandine sulle vigne.»
- rancore: «Su da noi chi fa un torto lo aspettiamo. Abbiamo tempo. E pecore.»
- sospetto: «Chi ti ha mandato? Nessuno compra il formaggio così.»

---

## 15. Zio Tè — Idris

- **Chi**: 61 anni, mercante beduino del Tavolato. Scende in città due volte a settimana. È l'osservatore da fuori: si ride della
  città con lui, mai di lui. Parla un italiano perfetto e lento.
- **Dove e quando**:
  - **lunedì e venerdì**: `piazza` 9-13, con tè, sale, spezie, bussole, mappe;
  - `wu` 14, scambi; `caruggio` 15;
  - risale prima del buio, alle 16:30, verso i `beduini` sul `tavolato`.
- **Voce**: calma, ironica, stand-up dell'antropologo. Fa sembrare assurda ogni abitudine dell'isola.
- **Gag visiva**: versa il tè dall'alto e lo offre a chiunque passi (`porta`, poi il braccio alto). Alle 20, davanti allo schermo, ha
  una faccia di pura curiosità.

**Primo incontro**
- «Tè? Siediti. Voi correte sempre. Dove andate, se è un'isola?»
- «Il vostro capo vi parla da una scatola. E voi lo ascoltate. In piedi.»
- «Vendo bussole. Qui servono: tutti dicono di sapere da che parte stare.»
- «Sale, spezie, mappe. La mappa è vera. Le strade, non so.»

**Ritorno**
- «Sei tornato. Il tè l'hai pagato l'altra volta. Questo lo ripaghi.»
- «Un uomo lucida una macchina ferma da tre ore. È una preghiera?»
- «Mi hanno chiesto i documenti. Ho fatto vedere una capra. È passata.»
- «La mappa nuova. Hanno spostato il Muro? No? Allora è vecchia.»

**Da solo**
- «Trecento persone e nessuno ha tempo per un tè. Che popolo ricco.»
- «Le otto. Tutti fermi davanti alla scatola. Come le pecore col tuono.»
- «Un Grigio mi ha comprato una bussola. Non so dove vuole andare.»
- «Sul Tavolato c'è il vento. Qui c'è il Garante. Il vento almeno cambia.»

**Arco**
1. *All'inizio.* Commercia. Le sue mappe segnano qualche luogo «da scoprire».
2. *Repressione ≥ 2* (tassa sui banchi) *o Permesso che prova a chiedergli il pizzo*. Rifiuta con calma («Pago in tè»). Si vede: il
   banco si sposta dalla fontana ai `giardini`, ai margini.
3. *Il bivio.*
   - **Se lo difendi**: ti vende la «mappa delle scale», il giro sui tetti. **[NUOVO]**
   - **Se la Zia vende i suoi movimenti** (porta notizie per il Tavolato): smette di scendere, e i beduini mandano un ragazzo che
     non parla.
4. *La fine.*
   - **Amicizia**: ti invita sul Tavolato. È un rifugio sicuro e l'aggancio a una missione.
   - **Sparito**: in piazza resta la macchia nera del fornellino. La città si accorge che le manca il tè, e Fratello Catalogo prova a
     vendere il «tè dell'Impero» in bustina.

**Tono verso Nino**
- complice: «Tu bevi il tè senza guardare l'orologio. Sei quasi uno di noi.»
- paura: «Il tè oggi è finito. Per te. Per gli altri c'è.»
- rancore: «Da noi chi sbaglia beve per ultimo. Tu non bevi proprio.»
- sospetto: «Fai domande come uno che conta le tende. Chi le conta, per chi?»

---

## Incontri tra ricorrenti

Due scene in strada, nel formato di `eventi.js` (ruoli, battute in fila, una scelta). Si accendono solo se tutti e due i
personaggi sono vivi e liberi.

### A. «Il contributo» — Permesso e la Cabala (lunedì, `bar`, 19:45)
- Permesso: «Signora Atzeni, mi perdoni. La Famiglia vorrebbe il dieci per cento.»
- Cabala: «Il dieci per cento di cosa? Io non vinco. Io incasso.»
- Permesso: «Appunto. Dell'incasso. Con rispetto parlando.»
- Cabala: «Facciamo così. Se stasera dice "ordine" otto volte, ti do il venti.»
- Permesso: «E se no?»
- Cabala: «Se no paghi tu a me. Il dieci. Con rispetto parlando.»
- *Alle 20 lo schermo si accende. Il bar conta in coro.* Folla: «Cinque!» «Sei!» «Ha tossito!» «Sette!» *Il Garante saluta. Fine.*
- Permesso: «Sette. Mi perdoni. Quanto le devo?»
- Cabala: «Diecimila. E una pasta. Alla crema, non ricotta.»
- **Tu puoi**:
  - scommettere con uno dei due;
  - avvertire Rocco: la Cabala entra nel suo arco al passo 3;
  - stare zitto: da quella sera Permesso gioca ogni lunedì e perde, e la Famiglia non vede una lira.

### B. «Ispezione morale» — Agente Reperto e i ragazzi della rampa (pomeriggio, `giardini`)
- Reperto: «Fermi tutti. Ispezione morale. Tu, cos'hai in tasca?»
- Sbarra: «Le mani. Sequestramele, che fa freddo.»
- Reperto (fruga Biscotto): «E questo? Cos'è?» Biscotto: «Un biscotto.» Reperto: «Sequestrato.» *Lo mangia.*
- Reperto: «La gioventù di oggi. Niente valori. Niente decenza.»
- Rasoio: «Mercoledì sera, agente. Hotel Paradiso. Stanza otto.»
- Reperto: «…»
- Rasoio: «Le lenzuola del Paradiso le lavo io. Il mercoledì.»
- Reperto: «Circolare. Voi tre. Circolare, ho detto. Con calma. Non correte.»
- *I tre se ne vanno.* Sbarra: «Ma tu le lavi davvero, al Paradiso?» Rasoio: «No. Da oggi sì.»
- **Tu puoi**:
  - ridere: Reperto se lo ricorda, rancore;
  - dare ragione a Reperto: i ragazzi ti chiamano «sbirro» per un giorno;
  - aspettare che se ne vadano e chiedere a Rasoio della stanza otto: Reperto passa al passo 2 del suo arco senza fotocamera.

### C. (in più, breve) «Gloria» — Telone, Fratello Catalogo e Zio Tè (sabato, `benzina`, 10)
- Catalogo (in ginocchio davanti all'Argenta): «Pagina dodici. Sei la pagina dodici.»
- Telone: «Non la tocchi! Rata ventitré!»
- Catalogo: «Posso solo… guardarla?» Telone: «Due minuti. Senza fiato.»
- Zio Tè (passando con la teiera): «Due uomini davanti a una scatola ferma. Allora è una preghiera.»

---

## Note per chi lo mette nel codice

- **I dati.** Ogni scheda diventa una voce come i `MATTI`: `nick`, `chi` (oppure un id fisso: questi sono abitanti nominati, non pescati
  a caso), `fissa`, `voce`, `passa`, `ritorno`, `solo`, più due chiavi nuove:
  - `toni: { complice, paura, rancore, sospetto }`, letta con `tono()`;
  - `arco: [quattro stati]`, ognuno con la condizione, la posa o il prop che cambia, e le battute che sostituiscono `ritorno`.
- **Il salvataggio.** Gli archi hanno bisogno del salvataggio minimo (Regia §4.7): basta lo stato dell'arco (0-3) e il ramo preso.
- **Le battute.** Tutte sotto i 70 caratteri, controllate a script. Le righe in corsivo sono indicazioni di regia, non fumetti.
- **Il ritmo.** Questa è tanta voce in più per la città: deve passare dall'agenda unica (un pezzo verso Nino ogni 40-60 s). Le righe
  `solo` e le telefonate sentite di passaggio invece possono uscire fuori agenda, a volume basso. È quello che fa sembrare piena la città.
