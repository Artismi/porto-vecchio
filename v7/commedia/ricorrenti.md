# Porto Vecchio — I ricorrenti (15 schede, 17 persone)

Cast ricorrente nuovo, da aggiungere ai 5 matti di `src/matti.js` (Generale, Contessa, Profeta, Nonno Peppino, Venditore di niente) senza
toccarli. Tono: `commedia/TONO.md` (la taratura di Andrea dell'8 novembre), poi REGIA_COMMEDIA §2. Ogni battuta è una reazione a caldo
a quello che succede adesso: urlata, diretta, si capisce senza sapere niente del mondo. Gente che si sputtana da sola (egoismo, pigrizia,
vigliaccheria, vanteria), amici che si fregano, figuracce sotto pressione, panico, gente che urla dei fatti suoi. Niente aforismi, giochi di parole, paradossi, ironia fredda, indovinelli.
Parolacce sì, bestemmie no, sesso solo per allusione, mai razza o disabilità. Ogni battuta sta sotto i 70 caratteri (controllato a
script). Nessuna citazione dai film di riferimento: le situazioni sono nostre.

**Il test** (da TONO.md): un quindicenne la capisce e ride alla prima lettura, anche senza sapere chi sono i Grigi? Chi parla si
scopre: egoista, pigro, vigliacco, sbruffone? Se serve pensarci, si butta. Meglio di tutto: la gente che si sputtana da sola e gli
amici che si fregano a vicenda. Niente insulti di repertorio sulle madri e sulle sorelle.

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

- **Chi**: 47 anni, tipografo. Di giorno stampa i manifesti del Garante alla Tipografia Totò. Il giovedì sera fa il comico al Circolo,
  ed è un disastro: non fa ridere, se la prende con chi non ride, e appena entra un Grigio si mette a lodare il Garante a squarciagola.
  Non è della Risacca: è uno che non riesce a stare zitto, finché non se la fa sotto.
- **Dove e quando**:
  - lunedì-venerdì `casa_171` 7-18 (in vetrina, le mani nere d'inchiostro);
  - `bar` 18:30: prova i pezzi su Gino, che non ride mai e glielo dice;
  - `osteria` 20: dà la schiena allo schermo del Garante;
  - **giovedì** `casa_114` (Circolo dei Lavoratori): tombola alle 20:30, palco 21:30-22:30;
  - sabato `piazza` 11, attacca bottone coi passanti e li obbliga a ridere; domenica dorme.
- **Voce**: urla al pubblico, si vanta di serate trionfali che nessuno ha visto, insulta chi non ride. Sotto pressione si rimangia
  tutto in diretta, a voce ancora più alta.
- **Gag visiva**: usa come microfono quello che ha in mano: la bottiglia, un manifesto arrotolato, una pagnotta (posa `telefona`,
  prop in mano). Sotto il braccio sempre un rotolo di manifesti del Garante (`porta`).

**Primo incontro**
- «Giovedì faccio il comico al Circolo! Mia moglie non viene. Vieni tu!»
- «La settimana scorsa la sala è morta dal ridere! Due persone, ma morte!»
- «Ridi! Perché non ridi? Era una battuta! …Era una battuta, giuro!»
- «Il Garante ha la parrucca! …C'è un Grigio? Capelli stupendi, eh!»

**Ritorno**
- «Oh, il pubblico! Giovedì vieni? Mi serve uno che ride! Pago la birra!»
- «Gino non ha riso manco stavolta! Gino, sei un pezzo di legno!»
- «Sei quello che non ride! Ridi adesso, che c'è il padrone del Circolo!»
- «Diecimila facce del Garante stamattina! Lo sogno pure, porca troia!»

**Da solo**
- «Buonasera Porto Vecchio! …Troppo piano. BUONASERA, STRONZI! …Troppo.»
- «Gino, se non ridi giovedì dico a tua moglie dove vai il martedì!»
- «Se stasera non ride nessuno mi butto dal pontile. Un'altra volta.»
- «C'è un Orecchio in sala! C'è un Orecchio! Fate i vaghi! Ridete!»

**Il pezzo del giovedì** (formato «pezzi», 3-5 battute di fila verso la sala)
- «Mio cognato s'è comprato la macchina a rate! Sessanta rate!»
- «Ne ha pagate tre! È arrivato il Banco e se l'è presa con lui dentro!»
- «L'hanno tirato fuori dal finestrino! E lui urlava: "Il telone no!"»
- «Tu lì in fondo, che non ridi! Tu sei il cognato! Ciao, Ermanno!»
- Alle 20 si accende lo schermo e il pezzo cambia a metà: «…e il Garante, che uomo! Che spalle! Applausi al Garante, forza!»
  «Applaudite, cazzo! C'è un Grigio in fondo! APPLAUDITE!»

**Arco**
1. *Giovedì 1.* Lo spettacolo va (male, ma va). Se c'eri, da lì in poi ti chiama «il pubblico». In prima fila c'è Fulvio Taccuino
   (scheda 13) che ride troppo forte e scrive.
2. *Repressione ≥ 2, oppure la Zia ha mandato qualcuno in sala.* Totò cambia repertorio: solo suocera e tombola. Si vede: porta la
   cravatta, suda, la sala è a metà. A te dice: «Stasera niente Garante! Parlo di mia suocera! Lei non mi arresta!»
3. *Il bivio.*
   - **Se lo aiuti** (sali sul palco, trovi l'Orecchio, gli procuri il rotolo di carta della tipografia per i volantini): fa il pezzo
     della parrucca urlando in piedi sulla sedia, e il Morale sale.
   - **Se la Zia lo vende**: Grigi alla tipografia, i rotoli di manifesti buttati per strada sotto la pioggia, lui che li rincorre.
4. *La fine.*
   - **Venduto**: il giovedì dopo il palco è vuoto, c'è solo il microfono. Ogni tanto uno dei ragazzi (scheda 2) ci sale, urla una
     frase e scende: «Totò era un coglione! E ci manca, il coglione!»
   - **Salvato**: il giovedì si sposta al covo, per pochi. Si vede in città: sotto ai manifesti del Garante che stampa compare una
     riga minuscola in fondo, «Il Garante ha la parrucca». **[NUOVO]**

**Tono verso Nino**
- complice: «Sei materiale buono! Ti metto nel pezzo! Tranquillo, ti chiamo Pino.»
- paura: «Stasera niente pezzi! Chiamo la tombola e basta! Ambo! Vattene!»
- rancore: «Ho un pezzo su di te. Ridono tutti. Dice che sei uno stronzo.»
- sospetto: «Lei è dell'Ufficio? Confesso: la parrucca l'ho detta io. Una volta.»

---

## 2. Quelli della rampa — Sbarra, Biscotto, Rasoio

Tre ragazzi della periferia ovest che camminano e parlano. È la scena 4 della Regia («Fino al mattino») resa ricorrente. Non sono un
gruppo con un capo: si sfottono, si interrompono, si sputtanano a vicenda. Le battute vanno dette a turno.

- **Sbarra — Michele Usai**, 19 anni, disoccupato. Il nervoso. Spiega a tutti cosa farebbe a un Grigio, e non lo fa mai. Si chiama
  così perché si porta dietro un pezzo di sbarra bianca e rossa rubato a un posto di blocco.
- **Biscotto — Davide Sechi**, 17 anni, garzone al Mattonificio (`casa_103`). Il paranoico: vede Grigi dappertutto, va nel panico
  per niente, mangia biscotti da una scatola di latta.
- **Rasoio — Samanta Loi**, 18 anni, lavora alla Lavanderia Pina (`casa_141`). Quella che sputtana. Una frase e Sbarra è nudo.
- **Dove e quando**:
  - Rasoio `casa_141` 8-14 tranne la domenica; Biscotto `casa_103` 7-13;
  - tutti e tre ai `giardini` 15-17, alla rampa chiusa con le transenne;
  - `officina` 17, a scroccare a Dorino; `flipper` 19;
  - alle 20 a `piazzetta`, di spalle allo schermo;
  - 23-01 il giro lungo verso il centro (`vico`, `caruggio`, `calata`) per evitare i Grigi;
  - domenica pomeriggio `spiaggia`.
- **Voci**:
  - Sbarra: «fra», «zio», minacce enormi, vanterie, e se la fa sotto;
  - Biscotto: panico, «ci guardano», bocca piena;
  - Rasoio: secca, piatta, lo sputtana davanti a tutti.
- **Gag visiva**:
  - Sbarra fa la boxe con l'ombra (`discute`) e ha la sbarra in spalla (`porta`);
  - Biscotto ha la scatola di latta (`porta`);
  - Rasoio sta a braccia conserte (`braccia`).
  - Camminano sempre in fila per tre. Quando ne manca uno, lo spazio resta.

**Primo incontro**
- Sbarra: «Oi! Tu sei Nino! Quello del debito con lo Squalo! Fra, sei morto!»
- Biscotto: «Fra, quello ci guarda. Ci guarda! …È un manifesto. Scusate.»
- Rasoio: «Biscò, hai paura pure dei manifesti. Mangia e sta' zitto.»
- Sbarra: «Se un Grigio mi tocca, giuro, lo apro come una cozza!»
- Rasoio: «L'ultima volta ti sei pisciato addosso, Michè.»
- Sbarra: «Era pioggia! C'era il sole, ma era pioggia!»

**Ritorno**
- Biscotto: «Nino! Hai da mangiare? No? E allora che vieni a fare?»
- Sbarra: «Hanno chiuso la rampa, zio! Che cazzo gli ha fatto la rampa?!»
- Rasoio: «Oh, Nino. Hai i soldi? Offri. Non li hai? Pezzente. Ciao.»
- Biscotto: «Ieri l'Alfetta m'ha guardato! M'ha guardato, fra! Sono finito!»
- Sbarra: «Ieri ho fatto a botte con tre Grigi!» Rasoio: «Era uno. Era la Pina.»

**Da soli** (tra loro, mentre passi)
- Sbarra: «Un giorno rubo l'Alfetta e la butto a mare! Coi Grigi dentro!»
- Rasoio: «Tu non sai guidare manco il carrello del Wu.»
- Rasoio: «Biscò, hai un biscotto?» Biscotto: «Finiti!» *Scuote la latta: è piena.*
- Sbarra: «Biscò, stasera lo facciamo?» Biscotto: «Cosa?!» Sbarra: «Il muro!» Biscotto: «Ah. Il muro. Certo.»
- Sbarra: «Se arrivano i Grigi vi copro io! …Arrivano? CIAO!» *Scappa da solo.*
- Sbarra: «Un giorno me ne vado sulla nave dell'Impero! Nella stiva! Coi polli!»
- Rasoio: «Coi polli ci stai già, Michè.»
- Sbarra (boxe con l'ombra): «Pam! Pam! Pam! …Mi sono stirato la spalla. Non ridete!»
- Rasoio: «Mezzanotte e non è successo un cazzo. Che serata di merda.»

**L'Alfetta che passa piano** (il momento serio, sempre uguale)
- Silenzio. Biscotto: «…» Sbarra: «Respira.» Rasoio: «Zitti.»
- L'Alfetta va via. Sbarra: «Visto? Avevano paura di me!» Rasoio: «Tremavi. Ti sentivo i denti.» Si riparte.

**Arco**
1. *Le prime sere.* Cazzate e paranoie. Se fai con loro il giro della notte almeno una volta, diventano «i tuoi»: ti aspettano a
   `piazzetta` alle 22.
2. *Repressione ≥ 2.* I giardini chiudono del tutto: i tre si spostano alla `discarica` e al `vecchio_3`. Se il Morale è sopra 50,
   Sbarra fa un'onda col gesso sulla rampa, storta, e la fa vedere a tutti urlando.
3. *Il bivio, la sera dopo un tuo giorno violento o con Repressione ≥ 3.* Sbarra non c'è: l'hanno fermato. Biscotto e Rasoio camminano
   in due, con lo spazio in mezzo.
   - **Se lo tiri fuori** (Rocca, Ferri pagato, ti prendi la colpa): torna con un occhio nero e una sbarra nuova, e sta più zitto.
4. *La fine.*
   - **Sbarra non torna entro tre giorni**: Biscotto smette di parlare, cammina e basta. Rasoio diventa reclutabile nella Risacca
     **[NUOVO]**, e lo dice da sola: «Io mi sono rotta il cazzo di stirare le loro divise.»
   - **Sbarra torna**: una notte i tre riaprono la rampa. Tolgono le transenne, ci dipingono l'onda e ci vanno con lo skate.
     Al mattino le transenne sono rimesse, l'onda resta.

**Tono verso Nino**
- complice (Sbarra): «Questo è Nino! È dei nostri! Nino, di' una parolaccia ai Grigi!»
- paura (Biscotto): «Ciao Nino, ciao! Noi non ti conosciamo! Corri, Michè!»
- rancore (Rasoio): «Per colpa tua hanno preso Michele. Fatti vedere qua e ti apro.»
- sospetto (Sbarra): «Fra, ti hanno visto coi Grigi! Coi Grigi! Ridevi! RIDEVI COI GRIGI!»

---

## 3. Lo Squalo al telefono — Sandro Neri, da casa

- **Chi**: è `sandro` del cast, il creditore di Nino (`game.js` lo chiama «lo Squalo»). Di nuovo c'è la **sua vita di casa**, che entra
  nelle telefonate: la moglie **Graziella** (sempre fuori campo), il figlio **Denis** di 8 anni, la suocera, il sugo.
  *Nota di canone*: la Bibbia dice «ex Squalo», il codice dice «lo Squalo». Qui seguo il codice.
- **Dove e quando**: suona la cabina (`cabina_sip`) più vicina quando le passi a meno di 12 m. Succede una volta al giorno finché c'è
  il debito, e in più martedì e venerdì alle 13:15 (ora di pranzo) e alle 20:05 (Graziella guarda il Garante). Di persona lo vedi al
  `magazzino` alle 10 e al `flipper` alle 17, con il grembiule da cucina sotto la giacca.
- **Voce**: urla le minacce a Nino e urla alla famiglia nello stesso fiato. La casa interrompe a ogni frase e lui perde il filo.
- **Gag visiva**: la cabina che squilla e ondeggia la cornetta appesa. Nino alza la cornetta (`telefona`). Sandro col grembiule.

**Prima telefonata**
- «Nino! Sono io! Il debito! Cinquecento… GRAZIELLA, ABBASSA LA TV!»
- «Cinquecentomila lire, Nino! Entro giovedì, o ti spacco le ginocchia!»
- «Ti spezzo… No, amore, non a te! A Nino! Nino, ti saluta mia moglie.»
- «Giovedì all'alba alla calata! Coi soldi! …Denis, molla il gatto!»

**Ritorno** (le telefonate dopo)
- «Nino! Il piccolo ha la febbre e io le palle girate! Dove sono i soldi!»
- «Mamma, metti giù l'altro telefono! …Nino, sei morto. Mamma, giù!»
- «Metà?! METÀ?! Che sono, un salumiere?! Tutto, Nino! TUTTO!»
- «I soldi, Nino! Ho promesso la pelliccia a Graziella! E all'altra!»

**Da solo** (se alzi la cornetta e non dici niente, senti la casa)
- «Respira, ti sento! Respira pure! Ogni respiro te lo metto sul debito!»
- «GRAZIELLA! IL SUGO! Si attacca! …Nino, se si attacca è colpa tua!»
- «Chi ha usato il mio rasoio? Chi?! …Mamma?! Sulle gambe?! MAMMA!»
- «Denis, le parolacce no! Siamo gente per bene! Passami la pistola!»

**Arco**
1. *Settimana 1.* Minaccia e appuntamento vero (giorno, ora, luogo), che finisce nel Taccuino.
2. *Il debito.*
   - **Se paghi una parte**: le telefonate si fanno più calde e lui comincia a chiederti favori («Passa dal Wu, prendi il basilico!
     Se è moscio ti ammazzo!»).
   - **Se non paghi**: la cornetta la prende Graziella: «Sono la moglie. Lui è un pezzo di pane. Io no, Nino. Io no.» Da lì le
     minacce le fa lei, e sono peggio.
3. *La Famiglia sospetta di lui* (in `fazioni.js` «parla troppo»), *oppure la Zia lo vende, oppure Repressione ≥ 3* (perquisizioni).
   Chiama da cabine sempre diverse, sottovoce, e ti chiede di nascondergli un pacchetto per due giorni. Si vede: niente grembiule,
   si guarda dietro. Al telefono: «Nino, sono io. Non dire il mio nome! Non dirlo! …L'hai detto.»
4. *La fine.*
   - **Debito pagato**: l'ultima telefonata è un invito a pranzo, «Domenica da noi! Sei di famiglia! Vieni o ti ammazzo!», ed è la
     cosa più spaventosa del gioco. Dopo, la cabina suona una volta sola: è Graziella che vuole sapere se la ricetta del ragù
     gliel'ha data Nino.
   - **Debito non pagato**: la cabina suona e nessuno parla. La mattina dopo sulla cornetta c'è un pesce.

**Tono verso Nino**
- complice: «Dicono che hai fegato, Nino! Bravo! Ti voglio bene! Paga!»
- paura: «Ho saputo di quel casino! Ma sei matto?! Paga e stammi lontano!»
- rancore: «Graziella dice di perdonarti. Graziella non comanda! …Sì, amore.»
- sospetto: «Chi c'è lì con te? CHI C'È?! Ti sento respirare in due!»

---

## 4. Agente Reperto — Oreste Murgia

- **Chi**: 46 anni, agente scelto della Guardia Insulare. Il moralista: multa i baci in pubblico, i capelli lunghi, le gonne corte.
  Fuma quello che sequestra, beve la vodka dell'Impero che confisca, e il mercoledì sera fa una lunga «ispezione» all'Hotel Paradiso.
  Non è Ferri: Ferri è stanco e si vende, Murgia urla la morale e intanto si serve.
- **Dove e quando**:
  - `commissariato` 7;
  - ronda in `piazza` 9-12, a caccia di coppie;
  - `giardini` 15, sequestri ai ragazzi;
  - 18 l'Alfetta ferma al `belvedere`, i vetri appannati e il fumo dal finestrino;
  - **mercoledì** `paradiso` 22-24;
  - domenica 17 a braccetto con la madre sulla `passeggiata`, cittadino modello.
- **Voce**: sbraita contro il degrado, e appena lo guardi si sputtana da solo: nega a voce alta cose che nessuno gli ha chiesto.
- **Gag visiva**: una bustina con scritto REPERTO che annusa e si rimette in tasca. Fuma (`fuma`) e, appena lo guardi, nasconde la mano
  dietro la schiena (`dietro`).

**Primo incontro**
- «Lei! Mani in vista! Quello era un bacio?! In pubblico?! Duemila lire!»
- «Che guarda? Se lei vede qualcosa, io devo scrivere. Non veda niente.»
- «Questo lo sequestro! Per la sua salute! …Ha da accendere?»
- «Ho gli occhi rossi per il vento! Il VENTO! Non per altro!»

**Ritorno**
- «Gioventù marcia! Io alla sua età ero sposato! Tre figli! E l'amante!»
- «Al Paradiso? Io? Mai! Il mercoledì gioco a carte! Con mia madre!»
- «Tutto in regola? Peccato. Mi tocca scrivere "niente". Lo scriva lei.»
- «Non sono fatto! Sono in servizio da tre giorni! È stanchezza!»

**Da solo**
- «Centrale, Murgia! Appostamento! Se chiama mia madre, sono in chiesa!»
- «Reperto dodici. Buono. Buonissimo. Reperto tredici, vieni da papà.»
- «Se mi vede mia madre mi ammazza! Altro che la Pardo! Mi ammazza!»
- «Chi ha toccato la vodka sequestrata?! È una prova! …Ah. L'ho finita io»

**Arco**
1. *I primi giorni.* Fa la morale, multa i ragazzi. Se passi dal belvedere alle 18 lo vedi fumare in macchina.
2. *Lo becchi* (fotocamera, oppure lo vedi entrare al Paradiso il mercoledì). Diventa il «tuo» Grigio: ai posti di blocco guarda da
   un'altra parte, ma ti chiede «reperti» (sigarette, vodka). Si vede: ti fa l'occhiolino e ti saluta di nascosto (`saluta`, piccolo).
3. *Repressione ≥ 3: Pardo e Vasco stringono sulla corruzione.* In pubblico diventa durissimo per coprirsi, urla più forte di tutti e
   ferma i ragazzi (vedi incontro B). **Se la Zia lo vende** (lei del Paradiso sa tutto): lo trasferiscono.
4. *La fine.*
   - **Trasferito**: lo trovi al `varco`, al freddo, accanto al Caporale Sanremo (scheda 12), pulito, sobrio e furioso:
     «Qui non c'è niente! Manco una canna! Mi hanno rovinato la vita!»
   - **Protetto da te**: lo promuovono brigadiere (una striscia nuova sulla manica). Urla ancora di più ed è ancora più corrotto, e
     senza saperlo rivende alla Risacca i pezzi di radio sequestrati. **[NUOVO]**

**Tono verso Nino**
- complice: «Io e lei siamo amici, eh! Allora giovedì la roba me la porta gratis!»
- paura: «Buonasera! Non ho visto niente! Non ho fumato niente! Ciao!»
- rancore: «Lei m'ha visto al Paradiso. Mia madre non lo sa. D'accordo, stronzo?»
- sospetto: «Perquisizione! Le tasche! Svelto, che ho finito la scorta!»

---

## 5. Ragionier Telone — Ermanno Cocco

- **Chi**: 51 anni, impiegato all'Ufficio Mario (`casa_63`): timbra pratiche per il Ministero. È l'uomo del Miracolo: un'Argenta
  grigio metallizzato a sessanta rate, che chiama **Gloria**. La tiene sotto un telone e non la usa mai. Chiunque la tocchi, la sfiori
  o la guardi troppo a lungo si prende un urlo da far voltare la strada.
- **Dove e quando**:
  - 6:45 lucida Gloria sotto il Condominio `mare`;
  - 7:30 va al lavoro a piedi; `casa_63` 8-17;
  - 17:30 al `benzina`, solo per misurare le gomme;
  - 18:30 lucida di nuovo;
  - **alle 20** si siede in macchina, ferma, e ascolta il Garante all'autoradio a tutto volume, coi finestrini giù, perché si senta
    che ha l'autoradio;
  - sabato 10 lavaggio a mano;
  - domenica 11 il giro della `passeggiata` a 10 all'ora, con moglie e figli che camminano accanto, perché i sedili non si siedono.
- **Voce**: strilla. Si vanta di ogni optional con chiunque, insulta chi va a piedi (lui va a piedi), va nel panico per un granello di
  polvere.
- **Gag visiva**: il panno con cui lucida (`spazza`); solleva un angolo del telone, controlla, ricopre. Se qualcuno passa a meno di
  due metri, si mette in mezzo a braccia larghe.

**Primo incontro**
- «GIÙ LE MANI! È un'Argenta! Rata ventidue di sessanta! Giù!»
- «Servosterzo! Autoradio! Vetri elettrici! E tu che hai? Le scarpe!»
- «Non si appoggi! Non respiri! Non la guardi, che la appanna!»
- «Ti sei seduto sul cofano?! SUL COFANO?! Chiamo la Guardia!»

**Ritorno**
- «Tu! Ti ho visto ieri vicino a Gloria! Due metri! Due metri, bastardo!»
- «Rata ventitré pagata! Tre giorni a pane e acqua! Ma guarda che cerchi!»
- «Mio figlio ha toccato il volante! L'ho chiuso in bagno! Due ore!»
- «Hai sentito il Garante dalla mia autoradio? No? Pezzente! Stereo!»

**Da solo**
- «Chi è bella? Chi ha il servosterzo? Tu! Brava, Gloria! Bravissima!»
- «Un graffio! UN GRAFFIO! …È un capello. Respira, Ermanno. Respira.»
- «Un piccione! Sul tetto! VIA, BESTIA! Ti sparo! …Ha cagato. Ha cagato!»
- «Mia moglie dice che amo più te, Gloria. È vero. Non dirglielo.»

**Arco**
1. *All'inizio.* Orgoglio, panno, urla.
2. *La nave dell'Impero non sbarca, o Repressione ≥ 2.* Il Banco alza gli interessi e lui salta i pasti. Si vede: cravatta allentata,
   lucida anche di notte, alla luce del lampione, e urla ai gatti.
3. *Il bivio.*
   - **Se lo aiuti** (paghi una rata, cacci i ragazzi che vogliono dipingerla): ti deve un favore enorme.
   - **Se la Zia lo vende** (una volta al bar si è lamentato dei tassi del Garante): arriva il carro attrezzi del Banco. È la scena
     2 della Regia, ma è la sua: lui in giacca che corre dietro al carro attrezzi, «Fermi! Ha ancora il telone! Ha freddo!»
4. *La fine.*
   - **Pignorata**: gira col telone piegato sotto il braccio e lo urla a chiunque: «Me l'hanno presa! Il Banco! Ladri! Avevo pagato
     le ruote!» Il giovedì lo trovi al Circolo in prima fila: è lui il cognato di Totò, e non ride.
   - **Salvata da te**: te la presta una volta per una fuga. «Non oltre i trenta! Non respirare sui sedili! La graffi e ti ammazzo!»
     La mattina dopo sul cofano c'è un'onda col gesso, e lui la lucida piangendo, ma non la cancella del tutto.

**Tono verso Nino**
- complice: «Lei è una brava persona. Può guardarla. Da lì. Non da qui. LÌ!»
- paura: «Io non la conosco! Gloria neanche! Vada via dalla macchina!»
- rancore: «Lei ha toccato Gloria! Ho le impronte! Le ho prese col talco!»
- sospetto: «Cosa ci fa vicino alla mia macchina?! Si allontani! Tre metri!»

---

## 6. Permesso — Tullio Caddeo

- **Chi**: 38 anni, esattore della Famiglia, risponde a Tano. Il più educato dell'isola: dà del Lei, porta le paste, chiede scusa per
  tutto. Ma ha la miccia corta: alla prima scusa del cliente scatta, urla, tira calci ai banconi, rompe una cosa. Poi si ricompone col
  fiatone, chiede scusa mortificato e lascia una pasta in più. Vive con la madre.
- **Dove e quando**:
  - **lunedì**: Panetteria Mario (`casa_59`) 9, `wu` 10, `fiori` 11, `car_2` 13 (prima mangia, paga, poi incassa);
  - **martedì**: `gelateria` 9, `video` 11, Sartoria Rosaria (`casa_154`) 15;
  - **mercoledì**: i barbieri del quartiere del governo (`casa_145`, `casa_89`);
  - giovedì a casa con la madre;
  - **venerdì**: `flipper` 18, `magazzino` 23 coi conti;
  - domenica `piazza` 11, a braccetto con la madre.
- **Voce**: parte cortesissimo, esplode a metà frase con le parolacce, torna cortese ansimando. L'esplosione è il pezzo.
- **Gag visiva**: un vassoio di paste incartate (`porta`). Si leva il cappello per salutare (`saluta`). Quando esplode il vassoio vola,
  e lui lo raccoglie chiedendo scusa alle paste.

**Primo incontro**
- «Buongiorno, mi perdoni il disturbo. Sono quello della Famiglia.»
- «Le ho portato le paste. …Come "non ho i soldi"? COME NON HAI I SOLDI?!»
- «Mi perdoni, ha un bagno? Ho mangiato tre cannoli in macchina.»
- «Mi scusi. Non so cosa mi prende. Venerdì ripasso. Coi soldi, eh!»

**Ritorno**
- «Che piacere! Lei è in regola! Che bella persona! Che bella giornata!»
- «Il Wu m'ha detto "domani". DOMANI?! …Scusi. Ho rotto un vaso. Pago io.»
- «Mi perdoni le urla di lunedì. Mamma dice che devo respirare. Respiro.»
- «Cortesemente, mi dia la busta. …LA BUSTA! …Cortesemente. Grazie.»

**Da solo**
- «Calmo, Tullio. Calmo. Sei un signore. …PORCO CANE! Calmo.»
- «Panetteria, quindici. Fioraia, la pago io. Non ditelo al capo, eh!»
- «Mamma dice che sono troppo buono. Ieri ho morso un bancone, mamma!»
- «Terza vetrina rotta questo mese! E le pago io! Porca miseria!»

**Arco**
1. *Il giro.* Se gli capiti vicino, ti fa portare il vassoio. Se assisti a un'esplosione, ti chiede scusa anche a te.
2. *La cassa della Famiglia cala (o la sabotate tu).* Il capo stringe e gli mette Rocco dietro. Si vede: Rocco cammina due passi
   dietro di lui, e Tullio esplode più spesso e più forte, e dopo chiede scusa con le lacrime agli occhi.
3. *Il bivio.*
   - **Se paghi tu la quota di qualcuno** (Rosa, il Wu): Tullio si commuove e ti dà un'informazione, l'ora esatta del cassiere.
   - **Se la Zia lo vende** (è vero che la quota di Rosa la paga di tasca sua): ha rubato alla Famiglia. Gli fanno la croce rovesciata.
4. *La fine.*
   - **Cacciato**: fa la colletta per la Risacca porta a porta. **[NUOVO]** «Un contributo per la Risacca, per cortesia. …DAMMI I SOLDI! …Scusi.»
   - **Promosso fidato**: comincia a dare del tu e smette di urlare. Niente più paste, niente più scuse: parla piano e basta. È il
     cambio più spaventoso della città, e lo capisci da solo.

**Tono verso Nino**
- complice: «Lei è uno che capisce! Un cannolo? Prenda! PRENDA, HO DETTO! Grazie.»
- paura: «Prego, prego, passi lei! Io non urlo! Con lei non urlo mai!»
- rancore: «Mi ha mancato di rispetto. Mamma dice di perdonarla. Venerdì, eh.»
- sospetto: «Che ci fa qui? CHE CAZZO CI FAI QUI?! …Mi perdoni. Che ci fa qui?»

---

## 7. Mezzolitro — Raimondo Lai

- **Chi**: 64 anni, reduce. Nel '79 non firmò e si è fatto quattro anni di confino. È la Risacca di prima, quella che ha perso, e beve
  per tutti quelli che non ci sono. Racconta di essere stato un eroe, e ogni volta l'eroe si rimpicciolisce.
- **Dove e quando**:
  - `osteria` 11-15;
  - `giardini` 15: dà da mangiare ai piccioni e li chiama coi nomi dei compagni;
  - `osteria` 17-23, e alle 20 canta stonato sopra il Garante;
  - lunedì e giovedì all'alba alla `calata`, a urlare alla nave dell'Impero «che non ci ha salvati»;
  - domenica 10 alla chiesa senza tetto (`vecchio_3`), da solo.
- **Voce**: ubriaco e fiero, si vanta di un passato che si smonta mentre lo racconta, sbraita contro i giovani e contro il Garante,
  poi ti abbraccia piangendo.
- **Gag visiva**: alza il bicchiere in un brindisi a nessuno (`beve`, poi `saluta`). Sul petto una medaglia fatta col tappo di una
  bottiglia.

**Primo incontro**
- «Siediti! Ti racconto il '79! Tu paghi, io racconto. Mi pare giusto.»
- «Avevo trecento uomini, io! Trecento! …Trenta. Ma trenta cattivi!»
- «Nel '79 ho preso a calci un Grigio! Era piccolo! Ma era un Grigio!»
- «Non mi alzo per nessuno. Nel '79 mi sono alzato una volta. Basta.»

**Ritorno**
- «Ancora vivo, tu? Pure io! Che schifo! Brindiamo!»
- «Voi giovani non sapete un cazzo! Io ho fatto quattro anni di confino!»
- «Oggi ti racconto il '79! Dopo la partita. E dopo il pisolino.»
- «L'onda l'hai fatta storta! Storta! Ai miei tempi ti menavano per meno!»

**Da solo**
- «A Peppino! A Tore! A quello coi baffi, come cazzo si chiamava!»
- «Garante, sei uno stronzo! …Non c'è nessuno? Bene. STRONZO!»
- «Oste! Un altro mezzo! Segna sul conto della rivoluzione!»
- «Mi sono pisciato sulle scarpe. Cinquant'anni di lotta e guarda qua.»

**Arco**
1. *All'inizio.* Beve, racconta, ti vuole bene senza motivo.
2. *Il Morale sale sopra 50 (le onde sui muri).* Se ne accorge e le conta a voce alta, una per una. Si vede: la mattina cammina invece
   di stare seduto, e la medaglia è lucidata.
3. *Il bivio.*
   - **Se lo porti a un'azione della Risacca**: ti dice dov'è il deposito del '79 tra le case crollate (`vecchio_2`), con dentro un
     ciclostile arrugginito. **[NUOVO]**
   - **Con Repressione ≥ 4 (Ora Quieta)**: lo portano via perché ha cantato sopra il Garante. All'osteria resta il suo posto, col
     bicchiere capovolto.
4. *La fine.*
   - **Reclutato**: sta sobrio un giorno intero per la notte grande, poi festeggia per tre. All'osteria brinda a te urlando il tuo
     nome di battaglia, e lo sbaglia.
   - **Arrestato e liberato da te**: torna con una strofa nuova, ancora più stonata.
   - **Arrestato e non liberato**: ogni sera alle 20 qualcuno all'osteria gli versa il mezzo litro e lo lascia lì.

**Tono verso Nino**
- complice: «Tu sei dei miei, ragazzo! Ti voglio bene! Paga il vino!»
- paura: «Stammi lontano! Ne ho già sepolti troppi come te! Vai! VAI!»
- rancore: «Hai venduto qualcuno, infame! Fuori dalla mia osteria! …FUORI!»
- sospetto: «Sei dell'Ufficio? Io sì. Nel '75. Tre mesi. Non dirlo all'oste.»

---

## 8. La Cabala — Nunzia Atzeni

- **Chi**: 57 anni, vedova, gestisce il **Totogarante**: scommesse clandestine sul discorso delle 20 (quante volte dice «ordine», se
  tossisce, se la parrucca si muove, quanto dura). Ha anche un lotto clandestino coi numeri suoi: 33 il Garante, 47 il Grigio,
  90 la paura. La Famiglia vuole la sua parte, la Zia gioca di nascosto. Lei non paga mai senza litigare.
- **Dove e quando**:
  - `piazza` 9-12, raccoglie le giocate; `wu` 12;
  - l'«ufficio» nel retro della Lavanderia Pina (`casa_141`) 14-17 (Rasoio la copre);
  - **`bar` 19:30-20:30**: l'estrazione è il discorso del Garante, tutti col biglietto in mano a contare;
  - `osteria` 21, paga le vincite (quando non può farne a meno);
  - domenica al Borgo dei pescatori (`pescatori_s`): scommesse sul pescato.
- **Voce**: urla le quote come al mercato, materna con chi gioca, isterica durante il conteggio, ladra quando paga.
- **Gag visiva**: matita dietro l'orecchio, quaderno aperto (`legge`). Davanti allo schermo conta sulle dita e sbatte il quaderno sul
  bancone.

**Primo incontro**
- «Stasera "ordine" lo dice sette volte! Tre a uno! Chi gioca? Tu! Dai!»
- «Un segreto: la Zia gioca da me. Sempre il trentatré. Mai uscito.»
- «Hai sognato un Grigio? Quarantasette! Un Grigio nudo? Novanta! Gioca!»
- «Non hai i soldi? E che vieni a fare al bar, il soprammobile?!»

**Ritorno**
- «Ieri "ordine" nove volte! Ho pagato il condominio! Grazie, Garante!»
- «Hai un debito? Benissimo! Chi ha un debito gioca forte! Dai!»
- «Hai vinto? Non urlare! Non urlare, che poi vogliono vincere tutti!»
- «Il Wu gioca il dodici da quattro anni! Mai uscito! Mai! Ahahah!»

**Da sola** (davanti allo schermo, alle 20)
- «Ha tossito?! NON HA TOSSITO! Era il microfono! Non pago!»
- «Sette! Otto! Dai, bello, dillo! Di' "ordine"! Dillo, parruccone!»
- «Chi aveva lo starnuto? Nessuno? BANCO! Garante, ti amo!»
- «Ha finito prima?! Sei minuti?! Che cazzo, Garante, stai male?!»

**Arco**
1. *All'inizio.* Il Totogarante gira. Puoi giocare: prima delle 20 scegli una previsione, alle 20:30 si paga (e si litiga).
2. *La Famiglia viene a riscuotere* (incontro A con Permesso), *oppure il Garante tace* (la Risacca spegne il ripetitore della
   `vetta`): niente discorso, tutte le giocate nulle, il bar in rivolta, gente che le tira i bicchieri. Lei passa a scommettere su
   Radio Scirocco. Si vede: l'estrazione si sposta dallo schermo alla radio sul bancone.
3. *Il bivio.*
   - **Se la Zia la vende** (ha debiti di gioco con lei) **o con Repressione ≥ 3**: i Grigi entrano in lavanderia e lei nasconde i
     biglietti nel pesce, al Borgo, urlando ai pescatori di non toccare quel cefalo.
   - **Se la copri tu** (ti tieni il quaderno per una notte): ti regala una «quota sicura», cioè l'ora del cassiere della Famiglia,
     le 10 alla Lavanderia Stella.
4. *La fine.*
   - **Arrestata**: al bar continuano a scommettere tra loro, «come faceva la Cabala», e a litigare uguale. Il quaderno passa di mano
     in mano.
   - **Prospera**: comincia a prendere scommesse sulla Risacca («La prossima onda in centro! Paga cinque!»). È un pericolo per te:
     Pardo può leggere le quote e prevedere le vostre mosse. **[NUOVO]**

**Tono verso Nino**
- complice: «Per te quota speciale, tesoro! Perdi lo stesso, ma ti abbraccio!»
- paura: «Su di te non prendo scommesse! Porti sfiga! Via dal bancone!»
- rancore: «Ho una quota su quando ti prendono! Due a uno! Ci gioco io!»
- sospetto: «Chiedi tante quote e non giochi mai! Sei un Orecchio? Fuori!»

---

## 9. Dottor Vento — Ottavio Pes, «il Tecnico»

La voce di Radio Scirocco. Non è Vinile: lei fa la DJ alla Luna e lo ammira e lo invidia senza sapere chi è.

- **Chi**: 56 anni, riparatore di radio e televisori, timido, balbetta. Di giorno tiene in onda il Garante: è lui che aggiusta gli
  schermi dei bar. Di notte è Dottor Vento, e in onda è un altro: sfotte i Grigi per nome, saluta le loro madri, urla. Di giorno ha il
  terrore che qualcuno lo riconosca, e nega tutto prima che glielo chiedano.
- **Dove e quando**:
  - casa al Condominio `stella`;
  - `bar` 9 (lo schermo di Gino), `sirena` 11 (la Zia lo adora: «che bravo ragazzo»), `osteria` 15;
  - `cultura` 16 (l'impianto del Palazzo); `piazza` 19:45: controlla lo schermo grande prima delle 20;
  - **in onda martedì, venerdì e domenica 23-01**, da un posto che cambia ogni volta. Lo senti dalle radio delle case, dall'officina
    di Dorino, dalla Luna.
- **Voce**: di giorno balbetta, suda, si difende da accuse che nessuno gli fa. In onda sfacciato, veloce, insulti con nome e cognome.
  La frase «massa a terra» la dicono tutti e due: è l'indizio.
- **Gag visiva**: ha sempre in braccio una valvola o un tubo catodico (`porta`) e un cacciavite dietro l'orecchio. Quando parla il
  Garante piega la testa come per sistemare l'antenna.

**Primo incontro** (di giorno)
- «P-permesso, scusi! Devo aggiustare il Garante! Ha perso il rosso!»
- «Radio Scirocco? Mai sentita! Io alle nove dormo! Coi tappi!»
- «Non mi parli! Ho il tubo catodico in braccio! Se cade, scoppia!»
- «Non tocchi l'antenna! Scotta! È del Garante! Se si spegne m'ammazzano!»

**Ritorno**
- «Ah, lei. Non mi guardi così! Non ho fatto niente! Sto aggiustando!»
- «Ho dormito come un sasso! Tutta la notte! Dalle undici all'una no!»
- «Massa a terra! Massa a terra, ho detto! Parlavo al televisore! Giuro!»
- «Lo schermo del bar? Domani. Il Garante l'ho già aggiustato una volta.»

**Da solo**
- «Stai fermo, Garante! Fermo! Ti prendo a cacciavitate, stronzo!»
- «Massa a terra. Massa a terra! …Mamma mia, l'ho detto forte?»
- «Prova microfono. Uno, due. Funziona. Il resto lo provo stanotte.»
- «Ahia! La scossa! Duecentoventi! Ho i capelli dritti! Non ridete!»

**In onda** (dalle radio, di notte)
- «Buonanotte, isola! Qui Dottor Vento! Saluto mia mamma! Mamma, dormi!»
- «Agente Murgia, lo sappiamo cosa fumi! Passacene un po', stronzo!»
- «Ai Grigi in ascolto: vi abbiamo bucato una gomma. Buona camminata!»
- «Un pezzo per il soldato al varco! Balla, Ennio! Lo so che balli!»
- «Pardo, ci cerchi? Siamo dietro di te! No, scherzo! …Girati.»

**Arco**
1. *Settimana 1.* Tre notti in onda. Se stai attento, la frase «massa a terra» la senti sia alla radio sia al bar.
2. *Lo scopri* (lo segui alle 22:45, o lo riconosci dalla tosse). Va nel panico, ti supplica in ginocchio di stare zitto, poi diventa
   un alleato: manda in onda i messaggi della Risacca (obiettivo «trasmissioni»). Si vede: mentre aggiusta lo schermo del Garante, ti
   fa l'occhiolino.
3. *Repressione ≥ 3: arriva il furgone del goniometro.* La Tutela assume proprio lui per trovare la radio pirata. Lui «aiuta», e il
   furgone gira in tondo intorno alla fontana. **Se la Zia lo vende** (il suo televisore va a righe ogni martedì alle 23): Pardo
   passa in bottega a farsi aggiustare una radio che funziona, e lui suda tanto che gli cade il cacciavite.
4. *La fine.*
   - **Preso**: Radio Scirocco tace. Alla Luna Vinile prende il microfono e urla: «Il Dottore non c'è più! Vaffanculo, Garante!»
   - **Salvo, e col ripetitore conquistato**: alle 20 entra nel discorso del Garante per dieci secondi, su tutti gli schermi
     dell'isola. Neve, e la sua voce: «Scusate l'interruzione! Garante, sei un pagliaccio! Ciao!»

**Tono verso Nino**
- complice: «Lei è uno a posto. Glielo dico: io di notte non dormo mai. Zitto, eh.»
- paura: «Non ho niente da riparare! Niente! Vada via! Ho la febbre!»
- rancore: «Lei mi ha fatto saltare un fusibile! Il mio! Stronzo! Largo!»
- sospetto: «Troppe domande! Lei è della Tutela! Io sono un tecnico! TECNICO!»

---

## 10. Fratello Catalogo — Arturo Serra

- **Chi**: 43 anni, ex rappresentante di aspirapolveri (mai venduto uno). Nell'84 ha ordinato dal **Catalogo dell'Impero** un
  frullatore a sette velocità, e non è mai arrivato. Da allora aspetta ogni nave urlando, si vanta con tutti di cose che non ha, e
  difende l'unica copia del catalogo dell'isola come fosse sua figlia. Non vende niente (il Venditore di niente è un altro) e non
  annuncia la fine del mondo (quello è il Profeta). La Tutela lo lascia fare: urla per l'Impero, non contro.
- **Dove e quando**:
  - **lunedì e giovedì alle 6 alla `calata`**: urla alla nave dell'Impero da lontano, a braccia aperte;
  - `piazza` 10-12, in piedi su una cassetta;
  - `wu` 12: si mette in fila e litiga con chi gli sta davanti;
  - `lungomare` 15, col naso sulle vetrine degli alberghi;
  - `benzina` 17, a guardare le macchine che fanno il pieno;
  - alle 20 legge ad alta voce il catalogo sopra il Garante.
- **Voce**: televenditore sgolato. Si vanta di quello che ha ordinato, insulta chi non ha niente (lui non ha niente), va in pezzi
  ogni volta che la nave non porta il frullatore.
- **Gag visiva**: il catalogo aperto e alzato sopra la testa (`indica`, il catalogo in mano). Se qualcuno si avvicina, se lo stringe
  al petto. Una pagina strappata se la tiene in tasca e ogni tanto la bacia.

**Primo incontro**
- «Fratello! Hai il tostapane a due fette? No?! E come cazzo vivi?!»
- «Io ho ordinato il frullatore a sette velocità! SETTE! Tu manco una!»
- «Non toccare il catalogo! Hai le mani unte! Via! VIA!»
- «Pagina centoquattro, la cyclette! Ci pedalerò io! Presto! Giovedì!»

**Ritorno**
- «Giovedì arriva la nave! Arriva il frullatore! Lo sento! LO SENTO!»
- «Ti manca qualcosa, eh? Si vede! Hai la faccia di uno senza tostapane!»
- «Ti presto il catalogo! Una notte! Lasciami il giubbotto! E le scarpe!»
- «Chi ha strappato la pagina dodici?! CHI?! Era la lavatrice!»

**Da solo**
- «Ordinato nell'84! Consegna in sei settimane! Lunghe, 'ste settimane!»
- «Il Garante ha la cravatta di pagina trentuno! Lo sapevo! LO SAPEVO!»
- «Nave! NAVE! Ce l'hai il mio frullatore?! …Non ha manco rallentato.»
- «Soddisfatti o rimborsati! Non sono soddisfatto! Rimborsatemi, stronzi!»

**Arco**
1. *All'inizio.* Urla a quattro gatti.
2. *La nave non sbarca, o il razionamento stringe.* Il pubblico cresce, perché chi ha fame ascolta chi urla di roba da mangiare. La
   Tutela comincia a usarlo come distrazione e gli regala un megafono. Si vede: il prop diventa il megafono, e lo senti da tre vie.
3. *Il bivio.*
   - **Se gli porti un oggetto vero dalla nave** (un tostapane passato dai Marsigliesi, vedi Lucien): va in crisi davanti a tutti.
     «Fa solo il pane?! Tutto qua?! Dieci anni per il PANE?!» Da lì urla contro le rate, e Telone lo sente e trema.
   - **Se la Zia lo vende** perché è diventato sovversivo: gli tolgono il megafono e lui urla lo stesso, rauco.
4. *La fine.*
   - **Pentito**: il giorno della nave sta alla calata e grida: «Non aspettate! Dentro non c'è niente! Solo saponette! SAPONETTE!»
     Sulla copertina del catalogo c'è un'onda disegnata a penna.
   - **Comprato dalla Tutela**: la sua faccia finisce su un manifesto nuovo, «IL BOOM È PER TUTTI», stampato da Totò Microfono.

**Tono verso Nino**
- complice: «Tu sei un cliente speciale! Ti faccio toccare la copertina! Un dito!»
- paura: «Prendi quello che vuoi! Prendi il catalogo! No, il catalogo no! Vai!»
- rancore: «Ti ho cancellato dal catalogo! Esaurito! Non esisti, pezzente!»
- sospetto: «Non desideri niente?! Niente?! Allora sei un sovversivo!»

---

## 11. Lucien — Lucien Caraffa, «le Petit»

- **Chi**: 34 anni, il cuoco e il motorista della barca di Marcel. Odia l'isola, odia il caffè, e lo dice a voce alta a chiunque.
  È innamorato della cucina di Nina (e, per allusione, di Nina), e appena c'è di mezzo lei si sputtana. Non spara: le pistole le hanno
  gli altri.
- **Dove e quando**:
  - dorme al `miramare` fino alle 14;
  - 15 Trattoria da Nina (`car_2`): pranzo tardo, insulta tutto, chiede il bis;
  - 17 sulla `passeggiata`, fuma guardando il mare dalla parte di casa;
  - 22-04 al `pontile` con Marcel, Jean-Luc e Didier;
  - il mercoledì sera «ha la febbre» e resta da Nina fino a tardi.
- **Voce**: urla contro l'isola in mezzo francese («putain», «mon vieux»), insulta tutto quello che mangia e beve, e si scioglie
  appena si parla di Nina. Niente gag sul pane.
- **Gag visiva**: fuma (`fuma`), sospira con la mano sul cuore. Il caffè lo assaggia, lo sputa e ne ordina un altro (`beve`).

**Primo incontro**
- «Non mi guardi! Se mi guarda, poi Marcel mi chiede chi era! Via!»
- «Questo caffè è una merda! Un altro! …Merda pure questo! Un altro!»
- «Isola di merda! Niente burro, niente vino, niente di niente! Putain!»
- «Contrabbando? Io? Sono il cuoco! È roba di Marcel! Arrestate Marcel!»

**Ritorno**
- «Toi! Ancora qui? Ma non te ne vai mai? Neanch'io! Putain!»
- «Ho mangiato da Nina! Malissimo! Ho chiesto il bis per gentilezza! Tre!»
- «Hai visto Nina? Ha chiesto di me? Dimmi di sì! Mentimi, ti pago!»
- «Marcel dice che sono innamorato! Io? Di quella? …Sì. Di quella. Sì!»

**Da solo**
- «Maman, se mi vedessi! Contrabbandiere! In un posto senza burro!»
- «Nina ha messo il finocchio nel ragù! Il finocchio! La sposo!»
- «Tre giorni e me ne vado! Lo dico da due anni! Putain di isola!»
- «NINA! Nina! NINA, ESCI! Ho portato il burro! Il BURRO VERO!»

**Arco**
1. *All'inizio.* Ti chiede un favore piccolo: portare un biglietto a Nina, chiuso.
2. *Se porti i biglietti* (sono tre, uno al giorno): ti fa lo sconto sulla roba dei Marsigliesi. **Con Repressione ≥ 2** al pontile
   mettono un riflettore e Marcel lo tiene a bordo. Si vede: Lucien in coperta che fuma e urla verso la trattoria da lontano.
3. *Il bivio.*
   - **Se tradisci i Marsigliesi** (stai con la Tutela o con la Famiglia contro di loro): Lucien diventa ostile.
   - **Se la Zia vende i loro orari**: retata al pontile, e Lucien si nasconde nella cucina di Nina. Lo puoi travestire col grembiule.
4. *La fine.*
   - **Aiutato**: resta sull'isola e fa il cuoco da Nina col nome di «Luciano». È il primo Marsigliese che diserta per un ragù.
   - **No**: parte con la barca. Dal ponte grida l'ultima: «Isola di merda! Salutami Nina! Dille che il finocchio…» Una settimana
     dopo arriva da Nina un sacco di caffè vero.

**Tono verso Nino**
- complice: «Sei mio amico, eh? Allora il conto da Nina lo paghi tu, amico!»
- paura: «Doucement! Doucement! Io cucino! Non sparo! Chiedi a Nina!»
- rancore: «Mi ricordo di te, stronzo! Da Nina non mangi più! Mai!»
- sospetto: «Chi ti manda? Marcel? La Zia? Nina? Dimmi Nina! Ti prego!»

---

## 12. Caporale Sanremo — Ennio Floris

- **Chi**: 20 anni, soldato di leva della Tutela al Varco del Muro. Vuole fare il cantante, e canta a squarciagola canzoni sue,
  bruttissime. È di San Giacomo e ha nostalgia della madre. Parla col cane di servizio, che si chiama Brigadiere. Appena deve fare il
  soldato davvero, va nel panico.
- **Dove e quando**:
  - `varco` 6-14 (turno in garitta);
  - lunedì e giovedì all'alba al `molo_cargo`, per lo scarico della nave;
  - `caserma_p` 18;
  - domenica libera all'`osteria_sg` di `sangiacomo` dalla madre: lì canta, e la madre applaude da sola.
- **Voce**: canta a pieni polmoni, si vanta della sua carriera inesistente, urla gli ordini e poi si scusa.
- **Gag visiva**: tiene il lasciapassare come un microfono mentre lo controlla. Il cane accanto, seduto. Guarda l'orologio (`orologio`)
  e conta i giorni al congedo.

**Primo incontro**
- «Lasciapassare! …Ha da fumare? Allora è valido! Passi!»
- «Alt! Chi va là! …Scusi, mi è uscito forte. Sono nervoso. Alt.»
- «Brigadiere, qua! …Non lei, il cane! Il cane si chiama Brigadiere!»
- «Sono il cantante più bravo della caserma! L'ha detto mia madre!»

**Ritorno**
- «Ah, lei! Ho scritto una canzone! Si chiama "Varco"! VAAARCOOO!»
- «Ferma o sparo! …Non ho i colpi, me li hanno tolti. Ferma lo stesso!»
- «Brigadiere, non leccarlo! Lo devo perquisire! Brigadiere, molla!»
- «Il sergente mi ha preso a calci! Per una canzone! Era bellissima!»

**Da solo**
- «Amore mio di cementooo! Ti guardo dalla garittaaa! …Fa schifo. Lo so!»
- «Brigadiere, se arriva la Risacca tu scappi? Bravo. Pure io.»
- «Novantuno giorni al congedo! Novanta e mezzo! Mamma, arrivo!»
- «Centrale, varco! Un gabbiano mi ha cagato sull'elmetto! Rispondete!»

**Arco**
1. *All'inizio.* Annoiato e simpatico. Se gli dai le sigarette due volte, una volta ti fa passare senza lasciapassare (a rischio tuo).
2. *Repressione ≥ 2.* Gli mettono accanto un sergente. Diventa formale e terrorizzato. Si vede: niente canzoni, schiena dritta
   (`dietro`), urla «Alt!» a tutti, anche ai gatti, e un solo occhiolino.
3. *Il bivio.*
   - **Se passi coi documenti falsi nel suo turno e si scopre, o la Zia lo vende**: lo puniscono col turno di notte al molo cargo,
     al freddo, e gli tolgono il cane.
   - **Se Dottor Vento gli dedica un pezzo**: canta alla garitta a voce piena, e il sergente lo sente.
4. *La fine.*
   - **Diserta**: lo trovi in `pineta` con Divisa. Due disertori, uno che parla a monosillabi e uno che canta.
   - **Arriva al congedo**: un giovedì sale al Circolo da Totò e canta «Varco». È tremenda. Applaudono tutti, anche gli Orecchi.

**Tono verso Nino**
- complice: «Lei passa! Io non l'ho vista! Brigadiere, manco tu! Vai, vai!»
- paura: «Si fermi! Per favore! Se no mi fanno rapporto! Mamma!»
- rancore: «Per colpa sua mi hanno tolto il cane! Le sparo! Appena ho i colpi!»
- sospetto: «Lei passa troppo spesso! O ha la fidanzata o ha la bomba! Quale?!»

---

## 13. Fulvio Taccuino — Fulvio Spanu

- **Chi**: 29 anni, disoccupato, vive con la madre al Condominio `aurora`. Orecchio dilettante: vuole che la Zia lo assuma. Spia
  malissimo, si fa scoprire ogni volta, nega a voce alta e scrive tutto. La Zia lo ignora da sette anni.
- **Dove e quando**:
  - `sirena` 8: rapporto alla Zia, che gli chiude la porta in faccia;
  - 9-13 segue gente a caso (`piazza`, `vico`, `caruggio`); `wu` 13;
  - `biblioteca` 15: sorveglia Lupo, che gli corregge gli errori nel rapporto;
  - **giovedì `casa_114` 21**: prima fila al Circolo. È lui «quello che ride troppo» della scena 3;
  - `osteria` 22.
- **Voce**: aspirante spia beccata in flagrante, panico, smentite urlate, vanterie su una carriera che non ha.
- **Gag visiva**: il giornale coi due buchi per gli occhi, tenuto al contrario (`legge`). Un taccuino in mano.

**Primo incontro**
- «Non mi guardi! Sono in incognito! Il giornale coi buchi è normale!»
- «Com'è vestito? È per il rapporto. Mia madre lo legge prima della Zia.»
- «Io, un Orecchio? Io? Ma si figuri! …Sì. Sono un Orecchio. Bravissimo.»
- «La Zia mi stima! Tantissimo! Non mi risponde, ma mi stima!»

**Ritorno**
- «Ancora lei! Ho un fascicolo su di lei! Un foglio! Fronte e retro!»
- «Ieri l'ho seguita fino a casa! Poi era tardi. Il resto lo invento.»
- «Ha detto una cosa contro il Garante? La ripeta! Piano! Sto scrivendo!»
- «Mi ha scoperto?! Come?! Il giornale è al contrario?! Merda!»

**Da solo**
- «Ore dieci, il soggetto compra il pane. Sospetto! Ciabatta! SOSPETTO!»
- «Zia! Zia, ho una notizia! …Zia? Mi ha chiuso la porta. Un'altra volta.»
- «Rapporto: mia madre parla male del Garante. Tutte le sere. Scritto.»
- «Mamma, non entrare! Sto facendo il rapporto! Mamma! È segreto!»

**Arco**
1. *All'inizio.* Ti segue male. Non scopre niente.
2. *Se gli dai informazioni false.* Le porta alla Zia. Se provocano una retata nel posto sbagliato (meglio se della Famiglia), la
   Repressione va da un'altra parte e la Zia comincia a fidarsi di lui. Si vede: lei gli regala un cappotto buono, lui butta il
   giornale coi buchi e diventa pericoloso.
3. *Il bivio.*
   - **Se la Zia vende qualcuno per un suo rapporto** (Totò, i ragazzi), Fulvio si sente in colpa e lo dice a voce alta, all'osteria.
   - **Se lo affronti in quel momento**, puoi girarlo: diventa un doppio Orecchio. **[NUOVO]**
4. *La fine.*
   - **Girato**: passa alla Zia i rapporti falsi della Risacca, ed è pessimo anche in questo. Con Repressione ≥ 4 sparisce, e sulla
     panchina della piazza resta il taccuino aperto.
   - **Promosso**: siede alla Sirena accanto alla Zia e non ti parla più. Non urla più. È il segnale che fa più paura.

**Tono verso Nino**
- complice: «Io la copro, eh! Nel rapporto ho messo il suo vicino. Le somiglia.»
- paura: «Il suo rapporto l'ho mangiato! Giuro! Senza sale! Mi lasci!»
- rancore: «Ho riaperto il suo fascicolo! Adesso sono due fogli, stronzo!»
- sospetto: «Lei mi segue?! Io seguo lei! Lei non può seguire me! Basta!»

---

## 14. Pecorino — Bachisio Mele

- **Chi**: 52 anni, pastore e staffetta dei briganti di Malanotte. Scende a vendere il formaggio e nelle forme porta i messaggi.
  Urla la merce, insulta i cittadini, e si vanta del cugino brigante, così forte che metà piazza sa chi è.
- **Dove e quando**:
  - lunedì e giovedì alle 7 scende dalla `radura` per la mulattiera;
  - `piazza` 9-12, banco del formaggio accanto a Zio Tè (litigano per i clienti); `osteria` 12; `wu` 14, baratto; alle 16 risale;
  - martedì e mercoledì all'`ovile`; domenica `osteria_sg`.
- **Voce**: banditore da mercato, insulti alla città (mollaccioni, puzzano di benzina), vanterie di montagna, e se gli tocchi la
  forma ti caccia.
- **Gag visiva**: una forma di formaggio sotto il braccio (`porta`). Annusa i clienti prima di vendere, e glielo dice.

**Primo incontro**
- «Formaggio! L'ho fatto io! Mia moglie mungeva, ma io guardavo!»
- «Questo ha un anno! …Due. Va be', tre. Ma è buonissimo! Compra!»
- «Mio cugino sta in montagna con la lupara! Compra o glielo dico!»
- «Non toccarlo con le mani da città! Lo annuso prima io! E annuso te!»

**Ritorno**
- «Sei tornato! Era buono, eh?! Te l'avevo detto! Paga, che è buono!»
- «Ti saluta uno con la barba e la lupara! Non ti dico chi! Malanotte!»
- «Questa forma è per te. Dentro c'è un biglietto. Non mangiarlo, eh!»
- «Ho contato i Grigi in piazza! Ne mancano tre! Se li è presi il lupo!»

**Da solo**
- «Latte in bottiglia! Bevono il latte in bottiglia! Gente malata!»
- «Ho venduto la forma marcia a un Grigio! Domani caga in divisa!»
- «Che puzza di benzina! Come fate a respirare, voi?! Mollaccioni!»
- «Chi ha toccato il formaggio?! Chi?! Ti ho visto! Hai il dito unto!»

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
- complice: «A te prezzo di montagna! È uguale, ma ti abbraccio! Vieni qua!»
- paura: «A te non vendo! Porti sfiga! Via dal banco! Via!»
- rancore: «Ti aspetto in montagna! Col bastone! Quando ho finito di mungere!»
- sospetto: «Chi ti ha mandato?! Nessuno compra il formaggio così! Spia!»

---

## 15. Zio Tè — Idris

- **Chi**: 61 anni, mercante beduino del Tavolato. Scende in città due volte a settimana. Mercanteggia come in una tragedia, si offende
  a morte se rifiuti il tè, si vanta dei suoi cammelli e sfotte i cittadini in faccia. Si ride della città con lui, mai di lui.
- **Dove e quando**:
  - **lunedì e venerdì**: `piazza` 9-13, con tè, sale, spezie, bussole, mappe;
  - `wu` 14, scambi (urlati); `caruggio` 15;
  - risale prima del buio, alle 16:30, verso i `beduini` sul `tavolato`.
- **Voce**: teatrale, a voce piena. Ogni prezzo è una ferita, ogni tè rifiutato un'offesa alla famiglia, ogni cittadino un mollusco.
- **Gag visiva**: versa il tè dall'alto e lo offre a chiunque passi (`porta`, poi il braccio alto). Quando tratta si mette le mani nei
  capelli.

**Primo incontro**
- «Tè! Rifiuti il mio tè?! Mi offendi! Offendi i miei figli! Siediti!»
- «Cinquemila?! Mi vuoi rovinare! Ho otto figli! …Tre. Mangiano per otto!»
- «Sul Tavolato ho trenta cammelli! Trenta! E tu cos'hai? Il debito!»
- «Questa mappa è vera! Lo giuro sui miei cammelli! Su quasi tutti!»

**Ritorno**
- «Sei tornato! Il tè di ieri l'hai pagato? No! Allora paghi due tè!»
- «Ho visto uno lucidare una macchina ferma per tre ore! Siete malati!»
- «Un Grigio mi chiede i documenti! Gli mostro la capra! Passa!»
- «Settemila! Ultimo prezzo! …Seimila! Mi strozzi! Cinque! Ladro!»

**Da solo**
- «Tè! Tè caldo! Nessuno vuole il tè?! Popolo di morti di sonno!»
- «Le otto! Tutti fermi davanti alla scatola! Svegliatevi, pecore!»
- «Un Grigio mi ha comprato una bussola! Speriamo che si perda!»
- «Il mio cammello è più sveglio del vostro Garante! E più bello!»

**Arco**
1. *All'inizio.* Commercia. Le sue mappe segnano qualche luogo «da scoprire».
2. *Repressione ≥ 2* (tassa sui banchi) *o Permesso che prova a chiedergli il pizzo*. Rifiuta a voce altissima, davanti a tutta la
   piazza: «Pizzo?! A me?! Ti pago in tè, e ringrazia!» Si vede: il banco si sposta dalla fontana ai `giardini`, ai margini.
3. *Il bivio.*
   - **Se lo difendi**: ti vende la «mappa delle scale», il giro sui tetti. **[NUOVO]**
   - **Se la Zia vende i suoi movimenti** (porta notizie per il Tavolato): smette di scendere, e i beduini mandano un ragazzo che
     non parla.
4. *La fine.*
   - **Amicizia**: ti invita sul Tavolato. È un rifugio sicuro e l'aggancio a una missione.
   - **Sparito**: in piazza resta la macchia nera del fornellino. La città si accorge che le manca il tè, e Fratello Catalogo prova a
     vendere il «tè dell'Impero» in bustina, urlando.

**Tono verso Nino**
- complice: «Tu bevi il tè come un uomo! Sei quasi uno di noi! Quasi!»
- paura: «Il tè è finito! Per te è finito! Gli altri bevono! Vai!»
- rancore: «Il mio tè non lo bevi più! Neanche quello buono! Quello lo bevo io!»
- sospetto: «Troppe domande sulle tende! Chi ti manda, eh?! Chi?!»

---

## Incontri tra ricorrenti

Tre scene in strada, nel formato di `eventi.js` (ruoli, battute in fila, una scelta). Si accendono solo se tutti i personaggi sono
vivi e liberi.

### A. «Il contributo» — Permesso e la Cabala (lunedì, `bar`, 19:45)
- Permesso: «Signora Atzeni, mi perdoni. La Famiglia vorrebbe il dieci per cento.»
- Cabala: «Il dieci?! Ma vai a cagare, tu e la Famiglia!»
- Permesso: «Il dieci, signora. …IL DIECI, HO DETTO! …Mi scusi. Il dieci.»
- Cabala: «Facciamo così: se stasera dice "ordine" otto volte, ti do il venti!»
- Permesso: «E se no?»
- Cabala: «Se no paghi tu a me! E porti le paste!»
- *Alle 20 lo schermo si accende. Il bar conta in coro.* Folla: «Cinque!» «Sei!» «Ha tossito!» «Sette!» *Il Garante saluta. Fine.*
- Permesso: «SETTE?! DILLO, STRONZO! DILLO UN'ALTRA VOLTA!» *Prende a calci lo sgabello.*
- Permesso: «…Mi scusi. Pago io. Pago pure lo sgabello.»
- Cabala: «Diecimila, lo sgabello e una pasta. Alla crema!»
- **Tu puoi**:
  - scommettere con uno dei due;
  - avvertire Rocco: la Cabala entra nel suo arco al passo 3;
  - stare zitto: da quella sera Permesso gioca ogni lunedì, perde, sfascia uno sgabello, e la Famiglia non vede una lira.

### B. «Ispezione morale» — Agente Reperto e i ragazzi della rampa (pomeriggio, `giardini`)
- Reperto: «Fermi tutti! Ispezione morale! Tu! Cos'hai in tasca?!»
- Sbarra: «Le mani! E tu cos'hai negli occhi? Sono rossi, agente!»
- Reperto (fruga Biscotto): «E questo?!» Biscotto: «Un biscotto!» Reperto: «Sequestrato!» *Lo mangia.*
- Reperto: «Gioventù di merda! Niente valori! Niente decenza!»
- Rasoio: «Mercoledì sera, agente. Hotel Paradiso. Stanza otto.»
- Reperto: «…»
- Rasoio: «Le lenzuola del Paradiso le lavo io. Le sue sono le peggio.»
- Reperto: «CIRCOLARE! Tutti e tre! Non ho sentito niente! Non è vero niente!»
- *I tre se ne vanno.* Sbarra: «Ma tu le lavi davvero, al Paradiso?!» Rasoio: «No. Però s'è cagato addosso.»
- **Tu puoi**:
  - ridere: Reperto se lo ricorda, rancore;
  - dare ragione a Reperto: i ragazzi ti chiamano «sbirro» per un giorno;
  - aspettare che se ne vadano e chiedere a Rasoio della stanza otto: Reperto passa al passo 2 del suo arco senza fotocamera.

### C. (in più, breve) «Gloria» — Telone, Fratello Catalogo e Zio Tè (sabato, `benzina`, 10)
- Catalogo (in ginocchio davanti all'Argenta): «Pagina dodici! Sei la pagina dodici! Sei vera!»
- Telone: «GIÙ LE MANI! Rata ventitré! Non me la sbavare!»
- Catalogo: «Posso solo guardarla?» Telone: «Due minuti! Senza respirare!»
- Zio Tè (passando con la teiera): «Due scemi davanti a una macchina ferma! Un tè, scemi?»
- Telone: «Il tè vicino a Gloria?! VIA! VIA COL TÈ!» Zio Tè: «Mi hai offeso! Adesso ne paghi due!»

---

## Note per chi lo mette nel codice

- **I dati.** Ogni scheda diventa una voce come i `MATTI`: `nick`, `chi` (oppure un id fisso: questi sono abitanti nominati, non pescati
  a caso), `fissa`, `voce`, `passa`, `ritorno`, `solo`, più due chiavi nuove:
  - `toni: { complice, paura, rancore, sospetto }`, letta con `tono()`;
  - `arco: [quattro stati]`, ognuno con la condizione, la posa o il prop che cambia, e le battute che sostituiscono `ritorno`.
- **Il salvataggio.** Gli archi hanno bisogno del salvataggio minimo (Regia §4.7): basta lo stato dell'arco (0-3) e il ramo preso.
- **Le battute.** Tutte sotto i 70 caratteri, controllate a script. Le righe in corsivo sono indicazioni di regia, non fumetti.
  Molte battute hanno due tempi («…»): l'urlo e la figuraccia. Il fumetto può dividerle in due, con mezzo secondo di pausa.
- **Il volume.** Il maiuscolo è un urlo: fumetto più grande, che trema. Le esplosioni di Permesso e le urla di Telone si sentono anche
  fuori schermo, a 30 m, come il clacson.
- **Il ritmo.** Questa è tanta voce in più per la città: deve passare dall'agenda unica (un pezzo verso Nino ogni 40-60 s). Le righe
  `solo` e le telefonate sentite di passaggio invece possono uscire fuori agenda, a volume basso. È quello che fa sembrare piena la città.
