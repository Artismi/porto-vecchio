# Porto Vecchio — Mondi di strada 1: ricettatori, azzardo, ambulanti

Proposta del reparto commedia, 8 novembre. **Nessun file del gioco è stato toccato**: è solo testo da approvare, come gli altri
file di `v7/commedia/`. Quando sarà approvato andrà sotto `?commedia`.

Direzione di Andrea: «più street, più GTA, più stand-up comedy; ironico, sfacciato, grezzo. Deve sembrare viva e piena la città».
**Correzione di tono (seconda nota di Andrea), applicata a tutto il file:**
- niente aforismi, giochi di parole o paradossi da decifrare;
- comicità concreta: gente che urla per la roba sua, insulti, vanterie, lamentele, bugie scoperte subito, situazioni fisiche;
- ogni battuta la capisce un quindicenne alla prima lettura.
- taratura di `TONO.md`, seguita alla lettera:
  - sì a chi si sputtana da solo (egoista, pigro, vigliacco, sbruffone), agli amici che si fregano, alle reazioni a caldo
    urlate;
  - no all'insulto di repertorio sulla famiglia, all'ironia fredda, al burocrate stanco, alla battuta costruita sulla trovata.

Regole tenute (REGIA §2):
- parolacce sì, bestemmie no, sesso solo per allusione;
- niente razza né disabilità, nessuna battuta sui rettificati;
- al massimo 70 caratteri per battuta (controllato con uno script);
- la battuta non si spiega mai;
- 1986, inverno, l'isola sotto la Tutela, lire contate in migliaia («15» = 15.000 lire).

I luoghi sono gli id dello stradario (BIBBIA §12). Pose e oggetti in mano sono solo quelli che esistono:
- pose di `anim_vita.js`: `legge`, `telefona`, `porta`, `fuma`, `saluta`, `orologio`, `braccia`, `tasche`, `discute`, `dietro`, `indica`;
- `act` e FPOSE: `beve`, `spazza`, `siede`, `siede_terra`, `appoggiato`, `merce`, `porge`, `scalda`, `osserva`, `aspetta`, `raccoglie`, `lavora`;
- prop di `anim_mano.js`: `pacchetto`, `moneta`, `carta`, `scatola`, `borsa`, `sacco`, `radio`, `chiave`, `ruota`, `maglia`, `bottiglia`, `cassa`.

**[NUOVO]** segna quello che il motore oggi non sa fare. **[RIUSO]** segna il pezzo che esiste già.

---

## 0. Cosa c'è già nel codice (grep su `v7/src`)

| cerca | dove | cosa fa oggi (2 righe) |
|---|---|---|
| `ricett` | `popolo.js:148` GIRI.ricettatore | Giro serale (17-22) di alcuni abitanti, al `magazzino` e al `flipper`: guadagnano 4-12, rischio 3%, capo `sandro`. Quando un ladro ruba, il ricettatore incassa il 30% (`popolo.js:842`). |
| `ricett` | `fazioni.js:46-131, 279-284` | Ricettazione è uno dei 4 ruoli della Famiglia (tatuaggio: «una chiave sul dorso della mano»). Il fidato che ricetta (Sandro) fa da cassiere: lavanderia alle 10, sala giochi alle 11. |
| `rivendere` | `trame.js:136-145` fence / ERRAND.ricetta | Dopo uno scasso, chi ha la refurtiva nascosta in casa la porta al Magazzino (10-19) e la vende al 45% del prezzo base. Resta una nota «shady» nel suo diario. |
| `ricett` / vendi | `azioni.js:464, 692` verbo `vendi` | Un abitante (o un membro della banda) va dal ricettatore più vicino, o al Magazzino Neri, e vende la sua refurtiva. |
| `Magazzino` | `economia.js:94, 105`; `oggetti.js:1493, 1523` | Il `magazzino` è l'unico banco «nero»: vende al doppio e compra la roba illegale al 60% (la legale al 40%). Le altre botteghe ti comprano la roba illegale, ma chi è vicino ti sente (`suspicious()`, Repressione +1). |
| `refurtiva` | `oggetti.js:309-320` CAT gruppo valori | Prezzi base dei valori: refurtiva 6, orologio 15, gioielli 40, dollari dell'Impero 30, merce di contrabbando 15, sigarette di contrabbando 4. Al ricettatore si vende anche col baratto (`scambia`, `oggetti.js:1737`). |
| `Magazzino` | `game.js:1214` JOBS.sandro | «Portami un mezzo»: una Vespa rubata al `magazzino` paga 100, una macchina 160. Il debito con Sandro è `DEBT = 500` (500.000 lire). |
| `scommess` | `eventi.js:411` SCENE `scommessa` | Due ragazzi fanno a gara di corsa fino alla fontana: chi perde paga da bere. Non girano soldi veri: è solo una scena. |
| `scopa` | `popolo.js:174` OGG `carte` | «Un tavolo da scopa» all'`osteria`, al circolo, al bar e al pub, dalle 15 alle 24: costa 1 e abbassa svago e solitudine. (Negli altri file «scopa» è la scopa per spazzare: `anim_vita` `spazza`, `scorci.js`.) |
| `baruffa a carte` | `eventi.js:432` `carte_baruffa` | Due vecchi seduti per terra giocano a scopa: uno accusa l'altro di barare. Nel 35% dei casi finisce a botte. |
| `tombola` | `popolo.js:68` RECURRING | Giovedì 21-23 tombola al Circolo dei Lavoratori: la frequentano gli over 45 (45% di loro). Non ci sono vincite né cartelle. |
| `flipper` | `popolo.js:183, 811`; `soldi.js:53, 219, 456` | Chi ha il vizio del gioco va al Flipper e gioca alle macchinette della Famiglia (anche al `bar`, alla `sirena` e dai tabacchi). La cassetta delle macchinette si svuota il sabato alle 23 nella cassa della Famiglia. |
| bisca | `soldi.js:54, 591, 706-725`; `risacca.js:181, 1118` | Sette e mezzo **giocabile dal giocatore** al `magazzino` e al `flipper` dalle 22 alle 4: puntata fino a un terzo del banco, il pari va al banco, il sette e mezzo reale paga doppio. Un membro della Risacca può «tenere la bisca» (4% di essere arrestato per ogni ora, di più con la Repressione alta). |
| Lotto | `soldi.js:474-492, 595, 726` | Lotto del Garante dai tabacchi: ambo o terno, da 1 a 20, si gioca fino a venerdì alle 19. Anche gli abitanti col vizio comprano la schedina. |
| `ambulante` | `eventi.js:480` SCENE `ambulante` | Di giorno, al mercato, alla pensilina o sul sagrato, uno vende accendini e sigarette e fa il giro dei passanti. Nel 40% dei casi uno compra e gli dà 1. |
| `bancarell` / `mercato` | `popolo.js:66-67, 175, 627`; `economia.js:131, 287` | Mercato in `piazza` mercoledì e sabato, 7-13: il 70% degli abitanti ci fa la spesa (la dispensa sale di 5). Col verbo `vendi_merce` chi ha l'orto o pesca va a vendere al mercato. |
| wanted | `game.js:801` `wantedLevel` | Livello di ricercato da 0 a 5. Da 2 in su i Grigi escono dalla caserma; a 1, se ti stanno vicino, ti arrestano. |

**In breve**: i soldi sporchi girano già (cassiere, macchinette, bisca, Lotto, ricettatori del giro), ma il giocatore ne vede solo
due pezzi, la bisca e il banco del Magazzino. Mancano le facce, la trattativa e la strada. I tre mondi qui sotto ci mettono sopra
voci e scene, e usano quasi solo i numeri che ci sono già.

---

# MONDO 1 — LA ROBA (i ricettatori)

## 1.A Il mondo in sei righe
1. **Chi.** Sandro Neri compra al banco nero del Magazzino Neri (`magazzino`, 10-19). Sotto di lui girano i ricettatori del giro
   (17-22), e quattro lavorano in proprio: Cappotto, Nonna Oro, Saponetta e Cric.
2. **Dove.** La roba piccola si vende a Vico del Campo (`piazzetta`) e sulla `calata`. L'oro si vende nella Sartoria Rosaria
   (`casa_154`) e in chiesa (`chiesa`). I mezzi vanno alla Discarica di levante (`discarica`); chi paga troppo sta al `flipper`.
3. **Quando.** La roba gira la sera (17-22) e subito dopo gli scassi del giro (1-4). Quella «fredda» si vende la mattina dopo,
   tra le 10 e le 12, quando Sandro apre.
4. **Famiglia ed economia.** Ogni lira di refurtiva che non passa da Sandro è una lira tolta alla Famiglia. Permesso tiene il
   conto di chi vende fuori.
5. **Grigi e Risacca.** L'Agente Reperto rivende quello che sequestra. La Risacca compra dai ricettatori parti radio e
   documenti, e rivende a loro quello che ruba alla Tutela (tranne la roba dei Grigi, che quasi nessuno tocca).
6. **Il debito.** Nino deve 500.000 lire proprio a Sandro: se gli vendi la roba, lui si tiene subito un acconto **[NUOVO]**. Per
   questo conviene andare dagli altri, che però pagano peggio o ti vendono.

## 1.B I quattro ricorrenti

### Cappotto — Efisio Porcu, 41 anni
- **Dove e quando**: alla `calata` 7-9 (aspetta gli scaricatori); al `bar` 12; a Vico del Campo (`piazzetta`) 17-22; al `flipper` 22-24.
  La domenica sul `lungomare`, col cappotto della festa (è uguale all'altro).
- **Voce**: velocissimo, giura su tutto, dice «originale» di qualsiasi cosa. Lo scopri a mentire ogni due frasi e non si
  vergogna mai.
- **Gag visiva**: `tasche`, poi `porge` con un `pacchetto`, e subito un altro `pacchetto`. Apre il cappotto e dentro c'è un
  negozio.

**Primo incontro**
- «Ehi. Ehi, tu. Vuoi un orologio? Ho un orologio. Ne ho sei.»
- «È originale dell'Impero. Guarda, c'è scritto. Sì, a penna. Originale.»
- «Ti do diecimila per quella roba. Non guardarmi così, è tanto.»
- «Rubata? Chi ha detto rubata? Io ho detto "roba". Dammi qua.»

**Ritorno**
- «Che mi porti? Se è un'altra radio rotta, ti tiro dietro la radio.»
- «Il giradischi che mi hai dato era del mio vicino. L'ha riconosciuto!»
- «Non urlare "roba rubata"! Sei scemo?! Parla piano, coglione!»

**Da solo**
- «Orologi, accendini, una scarpa! Solo la destra! Chi la vuole?»
- «Chi ha l'ora? …Sì, lo so che ne ho dodici addosso. Sono tutti fermi.»
- «Mamma mia che freddo. Ho sei sciarpe qui dentro e nessuna è mia.»

**Arco**
1. *All'inizio.* Compra tutto a poco (35%) e non fa domande.
2. *La Repressione arriva a 3 (perquisizioni).* I Grigi aprono i cappotti per strada. Lui vende da un `sacco` che si porta in
   spalla (`porta`) e giura che è la biancheria della madre.
3. *Il bivio.* L'Agente Reperto lo ferma in piazzetta davanti a tutti (scena R1).
   - **Se paghi la multa per lui** (10): ti fa il 10% in più per sempre e ti dice a che ora Saponetta va alla Sirena.
   - **Se lo lasci lì**: sta dentro tre giorni, e la sua roba compare sul banco di Reperto alla `calata` (scena R5).
4. *La fine.*
   - **Libero e grato**: apre un banco vero al mercato, con la licenza appesa, e sotto il banco c'è il cappotto.
   - **Venduto da Saponetta**: il cappotto resta appeso in caserma, e i Grigi a turno se lo provano.

### Nonna Oro — Annetta Dessì, 73 anni
- **Dove e quando**: nella Sartoria Rosaria (`casa_154`) 9-12, dove «fa gli orli»; al `wu` 12; alla `chiesa` 18, al vespro,
  dove tratta seduta nel banco. Dalle 21 alle 23 alla finestra del Condominio Stella (`stella`): paga calando i soldi nel cestino.
- **Voce**: nonna dolcissima che bestemmia come uno scaricatore (senza bestemmie: parolacce). Ti chiama «tesoro» e subito dopo
  «cretino».
- **Gag visiva**: `legge` con una `moneta` attaccata al naso, cioè guarda l'oro da vicinissimo. Poi `porge` e tira sul prezzo.

**Primo incontro**
- «Fammi vedere, tesoro. …Questo è ottone. Ti hanno fregato, cretino.»
- «L'oro lo prendo io. Il resto portalo a quel ladro di Cappotto.»
- «Ventimila. Non fare quella faccia, che ti do pure una caramella.»
- «Non mi toccare la borsa! Ti stacco la mano! Giù!»

**Ritorno**
- «Sei tornato! Hai mangiato? Sei magro. Cos'hai portato? Fammi vedere.»
- «La catenina che mi hai dato la cercano in tre. Stronzetto. Bravo.»
- «Oggi niente. Ho il nipote in casa. È un Grigio, quel deficiente.»

**Da sola**
- «Diciotto grammi! Diciotto! M'ha fregato pure stavolta, quel cane!»
- «Chi ha toccato la mia bilancina?! Vi taglio le dita a tutti!»
- «Chi mi ha preso gli occhiali?! …Ah. Li ho in testa. Non ridete!»

**Arco**
1. *All'inizio.* Compra solo oro e orologi, al 70%. Il resto lo rifiuta e ti insulta.
2. *Arriva il nipote, Agente Dessì* (un Grigio generato, filtro `cop`). Da quel giorno lei non tratta più a casa: solo in chiesa,
   al vespro, sottovoce e coi conti sulle dita.
3. *Il bivio* (scena R3). Il nipote sta per aprire la scatola dei gioielli.
   - **Se gliela porti fuori di casa tu** (lavoretto: `stella` → `chiesa`, porta un oggetto, `crime: true`): ti paga sempre
     l'80%.
   - **Se non la aiuti**, o la lasci al nipote: lui la ferma, e lei, per salvarsi, fa il tuo nome **[NUOVO]** (una denuncia con
     `who: 'player'`).
4. *La fine.*
   - **Amica**: ti regala la bilancina del marito. Con la bilancina, l'oro te lo pagano il 10% in più da tutti **[NUOVO]**.
   - **Nemica**: alle 21 si affaccia dalla finestra e urla il tuo nome a chi passa, ogni sera.

### Saponetta — Mirko Lecca, 23 anni
- **Dove e quando**: al `flipper` 18-23; alla `sirena` 16-18, dove si siede vicino alla Zia (è il giro `orecchio` che esiste
  già: questo è l'indizio); sul `lungomare` 23-1.
- **Voce**: dei ragazzi, ma esagerata: «fratello», abbracci, paga troppo e fa troppe domande. Racconta bugie e si contraddice
  da solo.
- **Gag visiva**: `appoggiato` al flipper, con una `moneta` che fa girare tra le dita. Quando lo guardi smette di colpo.

**Primo incontro**
- «Fratello! Quanto vuoi? Dimmi tu. Davvero, dimmi tu il prezzo.»
- «Ti do il doppio di Cappotto. Lui è un tirchio. Io sono tuo amico.»
- «Dove l'hai presa? No, così. Per curiosità. Mi piacciono le storie.»
- «Domani stessa ora? Porta tutto. E dimmi dove abiti, che passo io.»

**Ritorno**
- «Il mio fratello preferito! Allora, che hai fatto stanotte? Racconta!»
- «Oggi pago benissimo. Chiedimi perché. No, non chiedermelo.»
- «Ho saputo che ti hanno perquisito. Che sfiga! Io non ho detto niente.»

**Da solo**
- «…sì, Zia, è lui. …No, non l'ho fatto apposta. …Sì, l'ho fatto apposta.»
- «Cinquemila dalla Zia, ottomila dalla roba. Domani mi compro le scarpe.»
- «Quello là mi guarda. Mi guarda? No. …Mi guarda. Cazzo, mi guarda.»

**Arco**
1. *All'inizio.* Paga l'80%, cioè più di tutti. Dopo ogni vendita c'è il 60% che parli con la Zia (vedi 1.E).
2. *Puoi accorgertene.* Se passi dalla `sirena` tra le 16 e le 18, lui è seduto accanto alla Zia e le parla all'orecchio
   (scena R4).
3. *Il bivio.*
   - **Gli dai un posto falso** («l'ho presa al Miramare»): i Grigi perquisiscono l'albergo del Colonnello Vasco, e Vasco fa una
     scenata. La Zia non si fida più di lui.
   - **Lo dici ai ragazzi della rampa** (Sbarra, Biscotto e Rasoio di `ricorrenti.md`): sulla vetrina del Flipper compare
     «SAPONETTA ORECCHIO» (writing).
   - **Lo picchi**: botte normali, e la Zia ti segna.
4. *La fine.*
   - **Smascherato**: lo prendono come piantone alla caserma. Sta seduto sulla porta con una giacca da Grigio di tre taglie più
     grande.
   - **Mai scoperto**: diventa il preferito della Zia e alla Sirena si siede al tavolo suo.

### Cric — Battista Cossu, 52 anni
- **Dove e quando**: alla Discarica di levante (`discarica`) 8-17; all'`osteria` 18-21; il sabato all'`officina` a litigare con
  Dorino sui pezzi.
- **Voce**: grugniti, numeri, insulti alle macchine. Parla delle auto come di persone grasse o malate.
- **Gag visiva**: `lavora` con una `ruota` in mano. Ha sempre una ruota in mano, anche all'osteria.

**Primo incontro**
- «Che è 'sta merda? Una Vespa? Cinquantamila. Quaranta se mi guardi.»
- «Targa? Quale targa? Smontala tu, che io ho la schiena rotta!»
- «Io ho smontato una Mercedes con le mani! In dieci minuti! Da solo!»
- «Allo Squalo non dire niente. Lui le macchine le vuole tutte per sé.»

**Ritorno**
- «La Ritmo che m'hai portato era di un Grigio! Mi sono cagato sotto!»
- «Basta Vespe! L'ultima m'è partita da sola e m'ha investito!»
- «Hai la faccia sudata. Che hai fatto? No, non dirmelo. Siediti.»

**Da solo**
- «Fiat, Fiat, Alfetta… Un'Alfetta?! Chi cazzo m'ha portato un'Alfetta?»
- «M'è caduto il motore sul piede! Il piede buono! Porca miseria!»
- «Questo sedile è di uno grasso. Si vede. Lo vendo a un altro grasso.»

**Arco**
1. *All'inizio.* Compra qualsiasi mezzo, anche di notte (Sandro chiude alle 19), e lo smonta in un'ora di gioco.
2. *Sandro lo viene a sapere* (dopo il secondo mezzo che gli porti). Da quel giorno Cric ha un occhio nero e Rocco sta seduto sul
   cofano di una macchina, alla discarica, a fumare (`siede`, `fuma`).
3. *Il bivio.*
   - **Cric ti chiede un'Alfetta dei Grigi** (paga 200, la Repressione sale di 1, i Grigi perquisiscono la discarica).
   - **Sandro ti chiede di dargli fuoco alla discarica** (paga 80, il debito scende di 50; c'è già l'incendio con la molotov).
4. *La fine.*
   - **Con te**: arma una macchina per la Risacca. Vale come l'officina del covo, gratis, una volta.
   - **Con la Famiglia**: lavora per Sandro e ti paga la metà. «Ordini dall'alto. Dall'alto c'è lo Squalo.»

## 1.C Sei scene

Formato come `scene.md`: ruoli con i filtri di `eventi.js`; «la folla» è uno a caso del capannello; `{a}` è il nome vero.

### R1. Il cappotto aperto — `cappotto_aperto` (folla)
**Quando e dove**: sera, 18-21, Vico del Campo (`piazzetta`), posto `angolo` (soft).
**Ruoli**: `a` Cappotto (o un ricettatore del giro, filtro `m`); `b` una signora (filtro `f|old`); `c` un marito (filtro `m`);
`d` l'Agente Reperto (filtro `cop`, entra tardi).

- _`a` `tasche`, poi apre il cappotto (`porge` con un `pacchetto`). Si forma un capannello di 6 (`osserva`)._
- **a**: «Orologi, radioline, accendini! Roba dell'Impero! Originale!»
- **b**: «Quello è il mio orologio!» oppure «Quella è la mia radio! Ha l'adesivo!»
- **a**: «No, signora, è uguale. Ne hanno fatti mille.»
- **b**: «C'è inciso dietro "a Bruno". Mio marito si chiama Bruno!»
- **a**: «Pure mio cugino si chiama Bruno. È un nome normale.»
- **c**: «Io sono Bruno. E quella è la mia sciarpa. Ce l'hai al collo!»
- **la folla**: «Fagli vedere le tasche!» oppure «Io cerco una scarpa sinistra.» oppure «Ce l'ha pure il mio portafoglio, guarda!»
- _`a` `braccia`._
- **a**: «Va bene! Ve la rivendo. Prezzo da amico. Cinquemila.»
- **c**: «Cinquemila per la MIA sciarpa?!»
- **a**: «Quattro. Ma solo perché sei Bruno.»
- _Entra `d`. Il capannello si apre._
- **d**: «Che succede qui? Assembramento.»
- **la folla**: «Niente!» oppure «Compriamo sciarpe.» oppure «Ci ha rubato tutto, quello!»
- **d**: «Rubato? Allora è un sequestro. Dia qua il cappotto. Tutto.»
- _`a` dà il cappotto a `d` (`porge`). `d` se ne va col cappotto in spalla (`porta`)._
- **c**: «E la mia sciarpa?»
- **d**: «Venga in caserma con la ricevuta della sciarpa.»
- **a**: «Ho freddo! Mi ha preso il cappotto! Io denuncio!»

**Nota**: folla di 6. Se `d` non c'è (nessun Grigio a 40 m), la scena finisce con `c` che si riprende la sciarpa a strattoni
(`brawl` al 30%). È il passo 3 dell'arco di Cappotto: dopo la scena compare il bivio della multa **[NUOVO] `ask`**.

### R2. Il banco dello Squalo — `banco_dello_squalo` (scelta)
**Quando e dove**: 10-12, `magazzino` (davanti al banco). **Viene da te**: parte se entri con roba illegale nello zaino.
**Ruoli**: `a` Sandro (cast); `b` un ladro del giro che vende prima di te (filtro `m|young`, `pop.giro === 'ladro'`).

- **b**: «Una radio, due orologi, un frullatore.»
- **a**: «Il frullatore funziona?»
- **b**: «Non lo so. Era della signora del secondo piano.»
- **a**: «Allora non funziona. Dodici, tutto.»
- **b**: «Dodici? Mi sono arrampicato fino al secondo piano!»
- **a**: «Fosse il terzo piano, ti davo tredici. Dodici. Esci.»
- _`b` prende i soldi e se ne va. `a` guarda NINO._
- **a**: «Nino. Che piacere. Hai portato la roba o i soldi?»
- **a**: «Facciamo così: ti compro la roba e mi tengo un pezzo per il debito.»
- **[NUOVO] SCELTA** (10 s; se non scegli: «Vendi»)
  1. **Vendi tutto**
     - **a**: «Bravo. Il 25% lo tengo io. Per il debito. Contento?»
     - **NINO**: «No.»
     - **a**: «Però l'hai detto con educazione. Prendi.»
     - _[RIUSO] `sell()` al banco nero; [NUOVO] il 25% va a ridurre `st.debt`._
  2. **Tira sul prezzo**
     - **NINO**: «Venti. Sennò vado da Cric.»
     - **a**: «Da Cric? Quello che smonta? Vai, vai. Poi smonta pure a te.»
     - _al 40%:_ **a**: «Diciotto. E Cric non lo nomini più qua dentro.» _(+15%)_
     - _altrimenti:_ **a**: «Dodici. E la prossima volta ti ricordi chi è il banco.» _(-10%, Sandro si ricorda: «Cric»)_
  3. **Me ne vado**
     - **a**: «Vai da Cappotto? Ti dà una sciarpa e una pacca.»
     - _[NUOVO] Sandro si ricorda di te (-1, «è andato altrove»). Permesso passa a trovarti entro due giorni (visita `minaccia` di
       convivenza)._

### R3. La nonna e il nipote — `nonna_e_nipote` (scelta)
**Quando e dove**: 19-21, sotto il Condominio Stella (`stella`), posto `portone`. Solo dopo il passo 2 dell'arco di Nonna Oro.
**Ruoli**: `a` Nonna Oro; `b` l'Agente Dessì, il nipote (filtro `cop|young`).

- _`a` esce dal portone con una `scatola` sotto il braccio (`porta`). `b` arriva dall'angolo._
- **b**: «Nonna! Dove vai con quella scatola?»
- **a**: «In chiesa. Sono biscotti. Per il prete.»
- **b**: «Fammeli vedere. Ho fame.»
- **a**: «Sono biscotti del prete! Ti vuoi mangiare i biscotti del prete?»
- **b**: «Nonna, la scatola fa rumore. I biscotti non fanno rumore.»
- **a**: «Sono biscotti duri. Li ho fatti io. Lo sai che cucino male.»
- _`a` vede NINO._
- **a**: «Tesoro! Che fortuna! Tienimi la scatola, che mi cade.»
- **[NUOVO] SCELTA** (8 s; se non scegli: «Non la prendi»)
  1. **Prendi la scatola e vai**
     - **b**: «Ehi! Tu! Dove vai coi biscotti di mia nonna?»
     - **a**: «Lascialo stare! È il ragazzo della parrocchia!»
     - _[RIUSO] lavoretto `stella` → `chiesa` con l'oggetto «la scatola della nonna», `crime: true`; [NUOVO] `hunt` di 12 s
       di `b`._
     - _[NUOVO] Nonna Oro si ricorda di te (+2, «la scatola»): da ora paga l'80%._
  2. **Non la prendi**
     - **NINO**: «Signora, io ho le mani occupate.»
     - **a**: «Occupate a fare cosa? Brutto stronzo!»
     - **b**: «Nonna, apri. Adesso.»
     - _`b` apre la scatola (`legge`)._
     - **b**: «Nonna. Ci sono sei orologi. E la fede della signora Pina.»
     - **a**: «È stato lui! Me l'ha data lui! Quello lì!»
     - _[NUOVO] denuncia del giocatore (`who: 'player'`), Repressione +1; Nonna Oro portata via (`jail`)._
  3. **Distrai il nipote**
     - **NINO**: «Agente! Mi hanno rubato la Vespa! Là, di corsa!»
     - **b**: «Dove? …Nonna, non ti muovere! Torno subito!»
     - _`b` corre via. `a` se ne va dall'altra parte, piano (`dietro`)._
     - **a**: «Bravo. Sei scemo, ma bravo. Domani ti pago bene.»

### R4. Saponetta alla Sirena — `saponetta_alla_sirena` (scelta)
**Quando e dove**: 16-18, `sirena`, al dehors. Parte se hai venduto a Saponetta nelle ultime 24 ore.
**Ruoli**: `a` Saponetta; `b` la Zia (cast, seduta); `c` un ragazzo della rampa, se c'è (filtro `young`).

- _`b` `siede`. `a` arriva veloce, le si siede accanto e le parla all'orecchio (`discute` piano)._
- **b**: «Figlio mio, quanto?»
- **a**: «Due orologi e una radio. Stanotte. Lui dice dalla Panetteria Mario.»
- **b**: «Lui chi?»
- **a**: «Quello del debito. Nino.»
- _`a` vede NINO e salta in piedi._
- **a**: «Fratello! Che ci fai qui? Io? Niente. Mia zia. È mia zia.»
- **b**: «Io non ho nipoti, figlio mio.»
- **a**: «È una zia di quartiere. Ciao, Zia. Ciao a tutti.»
- **[NUOVO] SCELTA** (10 s; se non scegli: «Fai finta di niente»)
  1. **Fai finta di niente**
     - **NINO**: «Tranquillo. Domani ti porto altra roba.»
     - **a**: «Bravo! …Cioè, bravo. Ciao.»
     - _[NUOVO] Nino si ricorda di Saponetta: «orecchio» (si sblocca il bivio del falso posto)._
  2. **Lo dici forte**
     - **NINO**: «Ehi! Saponetta fa la spia alla Zia! L'avete sentito?»
     - **c**: «Saponetta?! Gli ho venduto la Vespa di mio padre!»
     - **la folla**: «Lo sapevo, ha le scarpe nuove!» oppure «Infame!» oppure «Io gli ho detto pure dove abito!»
     - _`a` scappa (`flee`). [NUOVO] Reputazione ragazzi +1; la Zia si ricorda di te (-2)._
  3. **Lo segui**
     - _[RIUSO] pedinamento: `a` va alla caserma (`commissariato`) e ci entra dalla porta di lato. Una pagina del Taccuino._

### R5. L'asta di Reperto — `asta_di_reperto` (folla)
**Quando e dove**: mattina presto, 6-8, alla `calata` (posto `calata`). Martedì e venerdì, o il giorno dopo un sequestro grosso.
**Ruoli**: `a` l'Agente Reperto (filtro `cop`; con `ricorrenti.md` è Oreste Murgia); `b` la vittima di un furto (filtro
`adult`); `c` un vecchio della folla (filtro `old`).

- _`a` dispone delle `cassa` per terra, come un banco. Si forma un capannello di 8._
- **a**: «Roba sequestrata! Si vende per legge! Pagamento in contanti!»
- **a**: «Lotto uno: una radio. Funziona. L'ho ascoltata io tutta la notte.»
- **b**: «Quella è la mia radio! Me l'hanno rubata martedì!»
- **a**: «E l'abbiamo ritrovata. Visto che funzioniamo? Ottomila.»
- **b**: «Devo PAGARE la mia radio?!»
- **a**: «Zitto, o sequestro pure lei!»
- **b**: «Ma vaffanculo! Vaffanculo tu e la tua divisa!»
- **a**: «Ottomila. Sennò la compra lui. Vero, signore?»
- **la folla**: «Sette!» oppure «Ce l'ha pure la mia bici, lì dietro!» oppure «Io compro, tanto la rubano di nuovo.»
- **c**: «Agente! Le sigarette sequestrate! Perché il pacchetto è aperto?!»
- **a**: «Controllo qualità. Lotto due: un cappotto. Pieno.»
- _a caso (50%, se Cappotto è in cella):_
   - **la folla**: «Quello è il cappotto di Cappotto!» oppure «C'è ancora dentro la roba!»
   - **a**: «Il cappotto si vende col contenuto. Trentamila.»
- **a**: «Chiuso! Arrivano i superiori. Chi ha comprato, non ha visto.»

**Nota**: folla di 8. [NUOVO] il banco di Reperto è un banco nero temporaneo (`black: true`): ci trovi la roba che ti hanno
sequestrato, ricomprabile al 100%.

### R6. La Ritmo del Grigio — `ritmo_del_grigio`
**Quando e dove**: giorno, 10-16, alla `discarica`. Parte se nelle ultime 24 ore hai portato a Cric un'auto di un Grigio
(`v.owner` è un cop).
**Ruoli**: `a` Cric; `b` il Grigio derubato (filtro `cop|m`); `c` un garzone di Cric (filtro `young`).

- _`a` `lavora` con una `ruota`. `c` porta un sedile (`porta`, prop `sedia`)._
- **b**: «Buongiorno. Cerco una Ritmo rossa. Me l'hanno rubata stanotte.»
- **a**: «Rossa? Qui niente rosso. Solo ruggine.»
- **b**: «Quella portiera è rossa.»
- **a**: «Quella? È di una Fiat. Del '72. Di mio zio.»
- **b**: «C'è il mio adesivo. "Guardia Insulare, sezione bocce".»
- **a**: «Mio zio giocava a bocce.»
- _`c` passa dietro `b` col sedile. `b` si gira._
- **b**: «E quello? È il mio sedile! C'è la mia forma!»
- **c**: «Questo? È per la nonna. Ha la schiena.»
- **b**: «Mettilo giù. Mi siedo e ti dico se è mio.»
- _`c` posa il sedile. `b` ci si siede (`siede`)._
- **b**: «…È mio. Lo sento. È proprio il mio.»
- **a**: «Allora te lo vendo. Diecimila. Per te, otto.»
- **b**: «Otto?! È MIO!»
- **a**: «Sette. Ma il volante è un'altra trattativa.»
- _`b` si alza, prende il sedile in braccio (`porta`) e se ne va a piedi._
- **b**: «Torno con la squadra. E col resto della macchina!»
- **a**: «Non c'è più il resto! …Cazzo. C'è ancora il resto. Smontate!»

## 1.D Quaranta battute (barks)

**Passando (vicino a un ricettatore)**
1. «Psst. Orologio? Radio? Una moglie? No, scherzo. Orologio?»
2. «Hai roba? Ti si vede in faccia che hai roba.»
3. «Non fermarti qui davanti, che sembra che compri.»
4. «Pago in contanti. Contanti veri, mica buoni del Garante.»
5. «Ho preso un televisore. Chi mi aiuta a portarlo? Pago in televisore.»
6. «Stasera chiudo presto, mia madre fa le lasagne.»
7. «Vuoi una Vespa? Ha un solo difetto: il proprietario la cerca.»
8. «Fra, vendi tu. Se arrivano i Grigi, io non ti conosco.»
9. «Non c'è niente da vedere. Gira. Gira, ho detto.»
10. «Ehi, il ragazzo del debito! Ancora vivo? Lo Squalo ti cerca, eh!»

**Trattativa**
11. «Quanto? Ma sei scemo? È roba rubata, mica nuova!»
12. «Diecimila. Undici. Undici e un caffè. Basta così.»
13. «Questa è roba che scotta. Ti do la metà, e già è tanto.»
14. «Me l'hanno offerta a meno ieri. Da un altro. Più brutto di te.»
15. «Va bene, va bene. Ma lo dici a qualcuno e non ti conosco più.»
16. «Ti do quindici. Non sedici: quindici. Il sedici porta sfiga.»
17. «Se la vuoi vendere a tutti i costi, vuol dire che è calda.»
18. «L'orologio va avanti di un'ora. Meno cinquemila.»
19. «Te la pago domani! Giuro su mia madre! …Su mia zia. Mia madre no.»
20. «Ultima offerta. Ultima ultima. Questa è proprio l'ultima. Dodici.»

**Reagiscono a te**
21. «Te l'ho vista rubare, quella. Ieri. Brava mano.» (al giocatore che ha rubato da meno di un'ora)
22. «Ricercato? Allora oggi pago meno. Molto meno.» (wanted ≥ 1)
23. «Ti stanno dietro due Grigi. Non entrare qui. Vai, vai!» (inseguito)
24. «Puzzi di benzina. Hai fregato una macchina?» (sceso da un'auto rubata)
25. «Con quella pistola in mano mi fai il prezzo tu, eh? Quanto?» (arma in mano)
26. «Sei ubriaco. Torna domani, che ti frego meno.» (ubriaco)
27. «Ma sei bagnato fradicio. Hai nuotato con la roba? Si è rovinata!» (bagnato)
28. «Ah, sei amico di Cappotto. Allora il prezzo è quello di Cappotto.»
29. «Lo Squalo ha detto che passi da lui. Io non ti ho visto.»
30. «Tu hai venduto a Saponetta? Coglione. Lo sanno tutti tranne te.»

**La folla**
31. «Quella è roba mia! La mia lampada! Era sul mio comodino!»
32. «Mi hanno rubato la radio e me l'hanno rivenduta. A meno.»
33. «Chiamate i Grigi! …No, aspettate, che ho le sigarette.»
34. «È roba di contrabbando? Quanto costa? Lo chiedo per mia cognata.»
35. «L'ha comprata da Cappotto. Si vede, è rotta.»
36. «Quella è la giacca di mio marito! Toglitela! Toglitela subito!»
37. «Ogni volta che lo vedo, mi tocco il portafoglio.»
38. «Ladro! Quello è l'orologio di mio padre! Ridammelo, stronzo!»
39. «Ha detto che è d'oro. Mi è diventato verde il dito.»
40. «Sono tre giorni che cerco la bici. Ce l'ha il Grigio, ci va al lavoro.»

## 1.E Gioco: «Vendi la roba»

**Cosa fa il giocatore.** Ruba (scasso, scippo, case, mezzi: tutto esiste già) e poi deve trasformare la roba in lire. Sceglie a
chi venderla, tratta sul prezzo e rischia che il ricettatore lo venda.

**I banchi (prezzo = % del prezzo base in CAT)**

| ricettatore | dove, quando | compra | paga | rischio |
|---|---|---|---|---|
| Sandro [RIUSO banco nero] | `magazzino` 10-19 | tutta la roba illegale | 60% | si tiene il 25% per il debito [NUOVO]; si ricorda di ogni vendita |
| Cappotto [NUOVO] | `piazzetta` 17-22, `calata` 7-9 | tutto | 35% | rivende la roba in strada: 10% al giorno per oggetto che il proprietario la riconosca e si ricordi di te |
| Nonna Oro [NUOVO] | `casa_154` 9-12, `chiesa` 18, `stella` 21-23 | solo oro, gioielli, orologi, dollari | 70% (80% se amica) | nessuno, fino al bivio del nipote |
| Saponetta [NUOVO] | `flipper` 18-23 | tutto | 80% | 60% (+10% per livello di wanted) che lo dica alla Zia: la mattina dopo perquisizione a casa tua (la refurtiva nascosta si perde) |
| Cric [NUOVO] | `discarica` 8-17, di notte su appuntamento | mezzi e pezzi d'auto | Vespa 40, Ape 50, 500 70, Ritmo 90, Giulia 120, sportive 150, Alfetta dei Grigi 200 | dal secondo mezzo, Sandro lo sa: rep Famiglia -1 a ogni vendita |

Per paragone, Sandro col lavoretto «Portami un mezzo» paga 100 per una Vespa e 160 per un'auto, ma chiude alle 19 e i mezzi dei
Grigi non li vuole.

**Il prezzo, in una formula** [NUOVO, sopra `sellPrice`]
`offerta = base × paga% × (1 − 0,12 × wanted) × (calda ? 0,7 : 1) × (1 + 0,05 × vendite oneste col ricettatore, max +20%)`.
«Calda» vuol dire rubata da meno di 12 ore di gioco: serve una data sul pezzo (`ogg.t`). Saponetta non guarda se è calda: per
questo paga di più.

**La trattativa** [NUOVO `ask`; senza `ask` si ripiega su `scambia`, RIUSO `barter`]
- Il ricettatore fa l'offerta e dice la battuta (sezione D, 11-20). Tu scegli tra tre tasti.
- **Accetto**: si vende.
- **Di più**: riesce con probabilità `0,5 − 0,3 × avidità + 0,1 × fiducia` (i tratti di `n.tr` esistono già).
  - Se riesce, l'offerta sale del 15%.
  - Se non riesce, scende del 10% e conta come strike. Al secondo strike: «Vattene. Oggi non compro.» e quel banco per te è
    chiuso fino a domani.
- **Me ne vado**: nel 35% dei casi ti richiama con +10% («Ehi! Torna qui, stronzo. Dai.»), altrimenti niente.

**I rischi, tutti con pezzi che esistono**
- **La Zia** (Saponetta): una nota con `who: 'player'` al giro `orecchio` [RIUSO voci]; la perquisizione viene dalla
  Repressione ≥ 3 [RIUSO], anticipata su casa tua [NUOVO].
- **Il proprietario che riconosce la roba** (Cappotto): [NUOVO] il pezzo rivenduto finisce nell'inventario di un abitante
  qualsiasi. Se il derubato lo vede, il ricordo «ha rubato» va su di te [RIUSO memoria].
- **La Famiglia**: se in un giorno vendi fuori da Sandro più di 30 (30.000 lire), passa Permesso (visita `minaccia` di
  convivenza, RIUSO) e la rep Famiglia scende di 1 [NUOVO `rep`].
- **I Grigi**: vendere roba illegale a una bottega normale fa già scattare `suspicious()` [RIUSO].

**Quanto si fa, a occhio**
- Uno scasso a una bottega dà 3-5 refurtive da 6 (base 18-30): da Cappotto sono 6-10, da Sandro 11-18 meno il 25%, da
  Saponetta 14-24 più una perquisizione.
- Una casa coi gioielli (40) dà 28 da Nonna Oro.
- Una Giulia rubata dà 120 da Cric, e Sandro arrabbiato.
- Per arrivare a 500 servono dieci notti buone: abbastanza per farlo sentire impossibile, non abbastanza per fartelo mollare.

**Da costruire**: la tabella dei banchi (dati); `ask`; la data sul pezzo; l'acconto sul debito (una riga in `sell()`); la
perquisizione mirata; il pezzo rivenduto che gira. Tutto il resto si riusa.

---

# MONDO 2 — IL BANCO (l'azzardo)

## 2.A Il mondo in sei righe
1. **Chi.** La Famiglia tiene i banchi che ci sono già: le macchinette, il sette e mezzo al Magazzino e al Flipper, il Lotto del
   Garante; la Cabala tiene il Totogarante delle 20. Nuovi: Mano Lesta con le tre campanelle, il Professore con la scopa a
   soldi, Lina Banco al tavolo della bisca e Turbo con le corse delle Ape.
2. **Dove.** Campanelle sul `lungomare`, sulla `passeggiata` e in `piazza` nei giorni di mercato. Scopa al Circolo dei
   Lavoratori (`casa_114`) e all'`osteria`. Bisca al `magazzino` e al `flipper`. Corse sulla Salita della Collina Nera
   (`salita`).
3. **Quando.** Campanelle 10-13 e 17-19, le stesse ore dei borsaioli del giro: mentre guardi i bicchieri, ti alleggeriscono.
   Scopa 15-20, torneo il giovedì prima della tombola. Bisca 22-4. Ape il sabato alle 23.
4. **Famiglia ed economia.** La Famiglia prende il 30% di ogni banco. Chi gioca soldi in strada senza pagare il posto si vede
   arrivare Permesso col vassoio di paste.
5. **Grigi e Risacca.** Ferri prende la busta il venerdì notte, e la bisca resta aperta. Quando la Repressione sale, o la busta
   salta, la retata la guida Carla Russo, che le buste non le prende. La Risacca tiene la bisca per fare cassa (RIUSO `bisca`).
6. **Il debito.** È la strada veloce: 500.000 in una notte, o 500.000 in più. Al tavolo Lina ti fa credito, e il credito della
   Famiglia si somma al debito con Sandro **[NUOVO]**.

## 2.B I quattro ricorrenti

### Mano Lesta — Ignazio Loddo, 34 anni
- **Dove e quando**: sul `lungomare` 10-13; sulla `passeggiata` 17-19; in `piazza` mercoledì e sabato, al mercato; alla `calata`
  all'alba del lunedì e del giovedì, alla fila della nave. Con lui ci sono due compari (abitanti generati, filtro `m`): uno fa
  finta di vincere, l'altro fa il palo.
- **Voce**: banditore da strada. Veloce, ti sfotte se perdi, ti adula finché giochi.
- **Gag visiva**: `merce` su una `scatola` di cartone (il tavolino). Ogni tre secondi `orologio`, cioè guarda se arrivano i Grigi.

**Primo incontro**
- «Dov'è la pallina? Dove sta? Guarda bene, che io sono lento!»
- «Il signore ha vinto! Diecimila! Bravo! …Il prossimo coglione? Scusate.»
- «Gioca tu, gioca. Hai la faccia di uno fortunato. E un po' scemo.»
- «Cinquemila per giocare! Vinci, ti do dieci! Perdi, ti voglio bene!»

**Ritorno**
- «Ancora tu! L'altra volta hai perso trentamila. Ci riprovi? Bravo!»
- «Oggi vincono tutti. Davvero. Guarda lui. È mio cugino, ma ha vinto.»
- «Non guardarmi le mani! Le mani sono mie, tu guarda i bicchieri!»

**Da solo**
- «Tonino, tu sei quello che vince. Quando vinci fai la faccia contenta!»
- «Ho perso la pallina. …Chi ha visto una pallina? Rossa, per terra.»
- «Grigio a destra. No, è un prete. Il prete gioca? Ciao, padre!»

**Arco**
1. *All'inizio.* Le campanelle (gioco in 2.E). Se non scopri il trucco, perdi.
2. *Torna un benpensante che ci ha perso l'affitto*, coi fratelli (scena Z6). Da quel giorno Mano Lesta lavora solo sulla
   `passeggiata`, lontano dalla piazza.
3. *Il bivio.*
   - **Fai il compare**: ti paga 3 a giro per fare finta di vincere. Chi hai fregato si ricorda di te.
   - **Spieghi il trucco alla folla**: rep quartiere +1, e Mano Lesta ti porta rancore.
4. *La fine.*
   - **Socio**: ti dà il 20% della giornata, che lasci in cassa della Risacca o in tasca.
   - **Nemico**: si sposta alla fila della nave con una scatola nuova e un occhio nero, e quando ti vede mette via tutto.

### Il Professore — Cesare Tola, 71 anni
- **Dove e quando**: al Circolo dei Lavoratori (`casa_114`) 15-20, al tavolo da scopa (RIUSO OGG `carte`); all'`osteria` 20-23;
  al `bar` alle 20 per il Garante. Insegnava matematica alla Scuola elementare (`casa_164`): l'hanno mandato in pensione nel '79.
- **Voce**: vecchio che insulta il compagno, conta le carte ad alta voce, accusa tutti di barare mentre bara lui.
- **Gag visiva**: `siede` con una `carta` in mano; `indica` il compagno a ogni presa sbagliata.

**Primo incontro**
- «Siediti. Scopa a mille lire la partita. Se perdi, paghi e stai zitto.»
- «Ma che carta hai buttato?! Se perdiamo, paghi tu! Tutto tu!»
- «Il settebello è mio. È sempre stato mio. Da quarant'anni.»
- «Io non baro. Ho la manica larga. È colpa della giacca.»

**Ritorno**
- «Il ragazzo è tornato a farsi spennare! Pino, porta una sedia!»
- «Ieri ho vinto la dentiera di Peppino. Ce l'ho in tasca, vuoi vedere?»
- «Gioca piano. Ho il cuore. Se vinco io, bene. Se vinci tu, muoio.»

**Da solo**
- «Primiera mia, carte mie, denari miei. E tu, Pino, sei un incapace.»
- «Chi ha toccato il mazzo? Erano quaranta. Ne conto trentanove.»
- «Mia moglie crede che sto in biblioteca. Io! In biblioteca!»

**Arco**
1. *All'inizio.* Scopa a soldi (gioco in 2.E). Bara una mano su quattro, e lo puoi scoprire.
2. *Il torneo del giovedì* (18-21, prima della tombola). La Famiglia scommette su di lui: Tano siede in prima fila e lo guarda.
3. *Il bivio.* In finale tocca a te contro di lui.
   - **Perdi apposta**: Tano ti dà 20.
   - **Vinci**: prendi il premio, 50, ma la Famiglia ha perso la scommessa (rep Famiglia -1).
4. *La fine.*
   - **Hai perso apposta**: ti offre il vino per sempre e racconta a tutti che ti ha battuto.
   - **Hai vinto**: non torna più al Circolo. Lo trovi ai `giardini` che gioca a scopa da solo e bara lo stesso.

### Lina Banco — Pasqualina Frau, 49 anni
- **Dove e quando**: alla bisca, `magazzino` 22-4 (RIUSO sette e mezzo di `soldi.js`); il giovedì al `flipper`. Dorme fino a
  mezzogiorno; alle 13 mangia alla Trattoria da Nina (`car_2`), sempre la stessa cosa.
- **Voce**: piatta e annoiata. Chiama i punti come chiamava i numeri alla tombola, dove ha lavorato vent'anni. Nessuna emozione:
  ha visto perdere case intere.
- **Gag visiva**: `siede` con una `carta`, e `fuma` senza mai togliersi la sigaretta di bocca.

**Primo incontro**
- «Puntata minima cinquemila. Siediti o levati, che mi fai ombra.»
- «Sette e mezzo. Il banco vince. Il banco vince sempre, amore. Sveglia.»
- «Credito? Sì, ti faccio credito. Poi te lo viene a chiedere Rocco.»
- «Non toccare le carte. Non toccare il tavolo. Non toccare me.»

**Ritorno**
- «Oh, quello del debito. Siediti. Te ne serve dell'altro, di debito?»
- «Tu sei quello che ieri ha pianto. Davanti a tutti. Siediti, piagnone.»
- «Ieri hai urlato quando hai vinto. Se urli ancora, fuori.»

**Da sola**
- «Sei e mezzo. Sette. Sballato. Paga. Sei. Paga. Mamma che noia.»
- «Chi ha vomitato sotto il tavolo?! Chi è stato?! Tu! Pulisci!»
- «Rocco, quello al tavolo due ha una carta nella scarpa. La sinistra.»

**Arco**
1. *All'inizio.* Gioca il banco e fa credito al 20% al giorno (vedi 2.E).
2. *La busta di Ferri salta* (la Risacca blocca le mazzette, o Ferri finisce nei guai), o la Repressione arriva a 3. Da quel
   giorno Lina tiene una `borsa` vicino alla porta, pronta (`porta`).
3. *Il bivio* (scena Z3, la retata).
   - **Le salvi la cassa**: ti azzera il credito e ti dice l'ora del cassiere.
   - **Ti prendi il piatto**: 60 in tasca subito, e Lina sa che sei stato tu.
4. *La fine.*
   - **Salvata**: apre una bisca sua alla Banja del Lido (`chiosco`), contro la Famiglia. Lì il credito te lo fa al 10%.
   - **Arrestata**: al tavolo ci mettono Rocco, che non sa contare. «Sette… e il mezzo dov'è? Chi ha il mezzo?»

### Turbo — Sergio Manca, 26 anni
- **Dove e quando**: di giorno fa le consegne in Ape tra il `wu`, la `calata` e la `gelateria`; alle 18 è all'`officina` a
  rompere le palle a Dorino; il sabato alle 23 è in cima alla `salita`, alla partenza.
- **Voce**: dei ragazzi, tutta vanteria. La sua Ape è «preparata». Ogni vanteria si smonta da sola.
- **Gag visiva**: `appoggiato` all'Ape (veicolo che esiste), con una `chiave` inglese in mano.

**Primo incontro**
- «Vedi quest'Ape? Fa novanta. In discesa. Col vento. Ma fa novanta.»
- «Sabato si corre sulla Salita! Diecimila per correre! Hai un mezzo?»
- «Ho battuto pure una Giulia. Era parcheggiata, ma l'ho battuta.»
- «Le scommesse le tiene mio fratello. Se perdi e non paghi, lo conosci.»

**Ritorno**
- «Sabato corri? Porta un mezzo vero, non la merda dell'altra volta.»
- «Ho messo il motore della lavatrice. Non ridere. Gira a mille.»
- «Mi hanno tolto la patente. Tanto non ce l'avevo.»

**Da solo**
- «Brum. Brum brum. …Mamma, non è niente! Provo il motore!»
- «Le ruote le ho lisciate io. Lisce vanno più veloci. Lo sanno tutti.»
- «Ho preso un Grigio con lo specchietto. Gli ho chiesto scusa. Poi via.»

**Arco**
1. *All'inizio.* La corsa del sabato (gioco in 2.E).
2. *La Repressione arriva a 2.* I Grigi mettono un posto di blocco in fondo alla Salita, e la corsa si sposta sulla `spiaggia`
   gelata, sulla sabbia. Ci si insabbia e si spinge.
3. *Il bivio.* Il fratello di Turbo ha scommesso contro di te.
   - **Perdi apposta**: 15.
   - **Vinci**: il fratello perde 80 e ti cerca.
4. *La fine.*
   - **Amico**: prepara un'Ape per la Risacca, che va più veloce nelle consegne di notte.
   - **Eroe per una settimana**: si schianta contro il ritratto del Garante in fondo alla Salita (Repressione +1). Tutti i
     ragazzi gli offrono da bere.

## 2.C Sei scene

### Z1. Le tre campanelle — `tre_campanelle` (folla, scelta)
**Quando e dove**: 10-13 o 17-19, sul `lungomare` o sulla `passeggiata` (posto `angolo`, soft).
**Ruoli**: `a` Mano Lesta; `b` il compare che vince (filtro `m`); `c` un benpensante (filtro `adult`); `d` un borsaiolo del giro
(`pop.giro === 'borsaiolo'`, se c'è).

- _`a` `merce` sulla `scatola`. Si forma un capannello di 6 (`osserva`). `d` si mette dietro al capannello._
- **a**: «Dov'è la pallina? Tre bicchieri, una pallina! Chi la trova vince!»
- **b**: «Io! Questo! …Ho vinto! Diecimila! Facile!»
- **a**: «Bravo il signore! Il signore è fortunato! Chi è il prossimo?»
- **c**: «Lo faccio io. È facile, l'ho vista. È sotto quello.»
- _`c` paga (`porge`). `a` muove le mani._
- **a**: «Guarda bene. Gira, gira, gira. Dove sta?»
- **c**: «Quello in mezzo.»
- **a**: «Ooh, peccato! Era a destra! Riprova, che adesso la sai.»
- **c**: «Io l'ho vista andare in mezzo!»
- **la folla**: «Riprova!» oppure «Mio cognato ci ha lasciato lo stipendio.» oppure «Quello che ha vinto è suo cugino, lo conosco!»
- **a**: «Il signore lì vuole provare? Sì, tu. Faccia da vincitore.»
- **[NUOVO] SCELTA** (10 s; se non scegli: «Guardi e basta»)
  1. **Giochi** _(si apre il gioco delle campanelle, vedi 2.E)_
  2. **Lo dici forte**
     - **NINO**: «Quello che vince è il suo compare! Ve lo dico io!»
     - **b**: «Io? Non l'ho mai visto! …Ciao, Ignazio. Cioè, chi è?»
     - **c**: «Ridammi i soldi! Subito, ladro!»
     - _`a` chiude la `scatola` e scappa (`flee`). `c` lo insegue. [NUOVO] rep quartiere +1; Mano Lesta si ricorda di te (-2)._
  3. **Guardi e basta**
     - _`d` passa vicino a NINO. [RIUSO] scippo del borsaiolo: perdi 2-8, a meno che tu non ti muova._
     - **a**: «Grazie a tutti! Domani stessa ora! Tenetevi i portafogli!»

### Z2. Il settebello nella manica — `settebello_nella_manica`
**Quando e dove**: 15-20, Circolo dei Lavoratori (`casa_114`), al tavolo da scopa (RIUSO OGG `carte`); se no al dehors
dell'`osteria`.
**Ruoli**: `a` il Professore; `b` Pino, il suo compagno (filtro `old`); `c` un avversario (filtro `old|m`); `d` un altro
avversario (filtro `old`).

- _`a`, `b`, `c` e `d` siedono (`siede`). Tre vecchi in piedi guardano (`osserva`)._
- **a**: «Pino, ma che hai buttato? Il re? Il re su un tavolo vuoto?»
- **b**: «Avevo solo quello.»
- **a**: «E allora tienilo in mano e muori col re!»
- **c**: «Scopa.»
- **a**: «Scopa un corno. Ha toccato il mazzo. Tutti l'abbiamo visto.»
- **d**: «Io no.»
- **a**: «Tu non vedi niente da sei anni. Gioca.»
- _`a` `indica` il tavolo. Gli cade una `carta` dalla manica._
- **c**: «Cos'è quella?»
- **a**: «Quale?»
- **c**: «La carta per terra. È il settebello.»
- **a**: «Il settebello è sul tavolo. Quello è un altro settebello.»
- **d**: «Ce ne sono due?»
- **a**: «Nel mio mazzo sì. Il mazzo è mio.»
- **b**: «Professore, il mazzo è del Circolo. C'è il timbro.»
- **a**: «Pino, da che parte stai? Ti pago io il vino! Da quarant'anni!»
- _al 35%: [RIUSO] `brawl` fra `a` e `c`, da seduti; altrimenti `c` si alza._
- **c**: «Domani le carte le porto io. E tu ti levi la giacca.»
- **a**: «Allora gioco in canottiera. Col freddo. Così muoio e siete contenti.»

### Z3. La retata — `retata_alla_bisca` (folla, scelta)
**Quando e dove**: 0-3, alla bisca del `magazzino` (o del `flipper`). Parte con la probabilità della retata (vedi 2.E) mentre
il giocatore è al tavolo, o ci passa davanti.
**Ruoli**: `a` Lina Banco; `b` Carla Russo (cast `carla`) o un Grigio (filtro `cop`); `c` un giocatore (filtro `m`); `d` un
secondo Grigio (filtro `cop`).

- _`a` `siede` al tavolo. Si forma un capannello di 6 giocatori (`siede`, `braccia`). `c` ha davanti una `pila` di monete._
- **a**: «Sette. Il banco vince. Pagate.»
- **c**: «Ancora una. L'ultima. Giuro sulla testa di mia moglie.»
- **a**: «Hai giurato sulla moglie pure ieri. Paga.»
- _Rumore alla porta. `b` e `d` entrano._
- **b**: «Guardia Insulare! Nessuno si muova! Mani sul tavolo!»
- **la folla**: «I Grigi!» oppure «Ferri non ha detto niente!» oppure «Io sono qui per il bagno!» oppure «Mia madre mi ammazza!»
- **c**: «Agente, stavamo giocando a tombola!»
- **b**: «Con le carte?»
- **c**: «Tombola con le carte. È nuova. Del continente.»
- _`a` mette la mano sulla cassa._
- **a**: «Ragazzo. Prendi la borsa. Vai dal retro. Adesso.»
- **[NUOVO] SCELTA** (8 s; se non scegli: «Ti butti sotto il tavolo»)
  1. **Salvi la cassa di Lina**
     - _[RIUSO] fuga dal retro con un oggetto in mano; [NUOVO] `hunt` di `d`, 14 s._
     - **b**: «Quello con la borsa! Fermo!»
     - _se scappi:_ [NUOVO] Lina si ricorda di te (+3, «la cassa»): ti azzera il credito e ti dice l'ora del cassiere.
     - _se ti prendono:_ fermo (RIUSO arresto), e la borsa va in caserma.
  2. **Ti prendi il piatto**
     - _[RIUSO] `take()` di 40-80 dalla tavola._
     - **a**: «Ti ho visto. Ti ho visto, figlio di puttana. Ti ho visto.»
     - _[NUOVO] Lina si ricorda di te (-3); rep Famiglia -1; [RIUSO] wanted 1._
  3. **Ti butti sotto il tavolo**
     - **d**: «Sotto il tavolo c'è uno. …Pure lui ha la carta nella scarpa.»
     - **b**: «Tutti in caserma. Tu, signora, per prima.»
     - **a**: «Prima mi finisco la sigaretta.»
     - _[RIUSO] fermo di tutti quelli al tavolo (`jail`), multa 20._

**Nota**: folla di 6. La retata chiude la bisca per 2 notti [NUOVO]. Se c'era la busta di Ferri, la retata non parte, ma alle 2
entra Ferri da solo e chiede «un caffè e la busta», due battute.

### Z4. La corsa delle Ape — `corsa_delle_ape` (folla)
**Quando e dove**: sabato, 23-0, in cima alla `salita` della Collina Nera.
**Ruoli**: `a` Turbo; `b` il fratello di Turbo, che tiene le scommesse (filtro `m|young`); `c` un ragazzo con la bandiera (filtro
`young`).

- _Tre Ape e due Vespe in fila (RIUSO veicoli parcheggiati). Si forma un capannello di 10 ai lati (`braccia`, `fuma`)._
- **b**: «Scommesse! Turbo paga due! L'Ape gialla tre! La Vespa cinque!»
- **la folla**: «Cinquemila su Turbo!» oppure «Turbo l'altra volta è finito nel fosso!» oppure «La Vespa è di mio fratello, vince!»
- **a**: «Guardate il motore. Guardatelo. Ho fatto tutto io.»
- **la folla**: «Ma è un motore di lavatrice!»
- **a**: «Di lavatrice tedesca! Gira a mille!»
- **c**: «Pronti! Al tre! Uno… due…»
- **a**: «Aspetta! Aspetta. Mi si è spenta.»
- **la folla**: «Spingi, Turbo!» oppure «Ogni sabato la stessa storia!»
- _due ragazzi spingono l'Ape di `a` (`lavora`)._
- **a**: «Partita! È partita! Vai col tre!»
- **c**: «Tre!»
- _[NUOVO] la corsa: i mezzi scendono lungo la `salita` verso il `lungomare` (vedi 2.E). Il capannello corre giù a guardare._
- _a caso (25% + 10% per livello di Repressione):_
   - **la folla**: «L'Alfetta! In fondo! I Grigi!»
   - _[RIUSO] wanted 2 per tutti i piloti: inseguimento._
- _altrimenti, all'arrivo:_
   - **a**: «Ho vinto! Ho vinto! …Chi ha vinto?»
   - **b**: «La Vespa. Paga cinque. Siamo rovinati. Tu chiudi la bocca.»

### Z5. Il marito al tavolo — `il_marito_al_tavolo`
**Quando e dove**: venerdì notte, 22-1, alla bisca del `flipper` (dopo la paga, RIUSO RECURRING `paga`).
**Ruoli**: `a` un marito che gioca (filtro `m|adult`, meglio se `pop.vice === 'gioco'`); `b` sua moglie (filtro `f|adult`);
`c` Lina Banco (o il gestore della sala).

- _`a` siede al tavolo con la busta paga aperta (`legge`, prop `carta`)._
- **a**: «Tutto sul sette. Tutta la busta. Stasera è la sera.»
- **c**: «Sei e mezzo. Il banco vince.»
- **a**: «Non è possibile. Ancora una. Metà busta.»
- _`b` entra di corsa._
- **b**: «TONINO!»
- **a**: «Amore! Che ci fai qui? È un posto di uomini!»
- **b**: «Dov'è la paga? Dove sta la paga, Tonino?»
- **a**: «Qui. Una parte. L'altra l'ho investita.»
- **b**: «Investita? Nelle carte?!»
- **a**: «Stavo per vincere! Mancava un mezzo! UN MEZZO!»
- **c**: «Signora, si siede? Puntata minima cinquemila.»
- **b**: «Dammi le carte. …Dammi le carte, ho detto.»
- _`b` siede al posto di `a`. `a` resta in piedi (`braccia`)._
- **c**: «Sette e mezzo reale. La signora vince il doppio.»
- **b**: «Andiamo, Tonino. Ti compro un gelato. Tu non giochi più.»
- **a**: «Ma i soldi sono miei!»
- **b**: «Zitto! Cammina! Davanti a tutti mi fai fare 'sta figura!»

**Nota**: niente scelta. Se la moglie ha perso (60%, RIUSO punteggio di sette e mezzo), escono tutti e due a testa bassa e lui
dice: «Te l'avevo detto che era la sera.»

### Z6. La rivincita — `rivincita_del_benpensante` (folla, scelta)
**Quando e dove**: 11-13, in `piazza` (il giorno dopo Z1, se c'è stata).
**Ruoli**: `a` Mano Lesta; `b` il benpensante di Z1 (o uno nuovo, filtro `adult|m`); `c`, `d` i suoi fratelli (filtro `m`).

- _`a` `merce` sulla `scatola`. `b`, `c` e `d` arrivano di corsa (`go`, sp 2.6)._
- **b**: «Eccolo! Eccolo lì, il ladro! Fratelli!»
- **a**: «Signore! Che piacere! Vuole la rivincita?»
- **c**: «Vuole i soldi. E pure i miei, che non c'entro.»
- **a**: «Se vuole i soldi, deve vincerli. È la regola.»
- **d**: «La regola adesso è un'altra. Prendetelo.»
- _`a` vede NINO. Gli corre dietro._
- **a**: «Amico mio! Diglielo che io sono onesto! Diglielo!»
- **[NUOVO] SCELTA** (8 s; se non scegli: «Ti sposti»)
  1. **Lo copri**
     - **NINO**: «È mio cugino. Vi ridà i soldi. Vero, cugino?»
     - **a**: «…Certo. Cugino. Ecco. Trentamila. Erano trenta?»
     - **b**: «Quaranta.»
     - **a**: «Trenta. Con mio cugino davanti non si mente.»
     - _[NUOVO] Mano Lesta si ricorda di te (+2). Il benpensante si ricorda di te (-1)._
  2. **Lo indichi**
     - **NINO**: «Ha pure la pallina in tasca. Guardate.»
     - _`c` gli tira fuori dalla tasca la pallina rossa._
     - **la folla**: «Visto?!» oppure «Era sempre in tasca!» oppure «Io ci ho giocato due anni!»
     - _[RIUSO] `brawl` dei tre fratelli contro `a`; poi `a` scappa (`flee`). Rep quartiere +1._
  3. **Ti sposti**
     - _`a` scappa (`flee`); i tre lo inseguono per la `piazza`, rovesciano una bancarella, e la folla urla._
     - **la folla**: «Le mie arance!» oppure «Prendetelo!» oppure «Ma chi è? Corro anch'io!»

## 2.D Quaranta battute (barks)

**Passando (vicino a un banco)**
1. «Una partita veloce? Una sola. Poi vai a casa. Giuro.»
2. «Stasera ho vinto tre volte. Ho perso sei. Però tre volte ho vinto!»
3. «Mia moglie crede che sono al lavoro. Il lavoro è qui.»
4. «Mi presti diecimila? Te li ridò stasera. Vinco io, stasera.»
5. «Il 47! Quattro anni che gioco il 47! Esce il 48! VAFFANCULO!»
6. «Non guardare le mie carte! Non guardare la mia faccia!»
7. «Ho perso la Vespa. A carte. L'ha vinta uno che non sa guidare.»
8. «Domani smetto. Lo dico da otto anni, ma domani smetto davvero.»
9. «La macchinetta mi ha mangiato tutto. La prendo a calci. Piano.»
10. «Chi gioca a sette e mezzo? Io porto le carte, tu i soldi.»

**Al tavolo e alle campanelle**
11. «Carta. Carta. …Carta. …Cazzo.»
12. «Sto. Sto bene così. No, aspetta, carta.»
13. «Hai barato! Ti ho visto! Non so come, ma ti ho visto!»
14. «Raddoppio. Raddoppio tutto. Tanto è dello Squalo.»
15. «Il banco vince col pari? Chi l'ha deciso? Il banco?»
16. «Questa mano era mia! Me l'hai rubata col tuo sette!»
17. «Io dico sinistra. No. Destra. No, sinistra. Vai, sinistra!»
18. «Era sotto quello! L'ho vista! Alza, alza quello!»
19. «Ancora cinquemila e ho finito. Poi altri cinque e ho finito davvero.»
20. «Ho vinto! HO VINTO! …Ah, è pari. Vince il banco.»

**Reagiscono a te**
21. «Il ragazzo del debito gioca! Puntate contro di lui, ragazzi!»
22. «Hai vinto? Allora offri. Le regole del tavolo.» (dopo una vincita)
23. «Hai perso tutto? Bravo. Benvenuto, siediti con noi.» (dopo una perdita)
24. «Ehi! Non correre qui dentro, sembra una retata!» (corre)
25. «Sei ubriaco? Siediti, siediti. Con gli ubriachi gioco volentieri.»
26. «Tu porti sfiga. Da quando sei qui ho perso tre mani. Vattene.»
27. «Con quella pistola in tasca nessuno ti dice che bari.» (arma)
28. «Non giocare con Lina. Io ci ho perso la casa. Tu non ce l'hai.»
29. «Sei ricercato? Allora non sederti vicino a me.» (wanted ≥ 1)
30. «Mi dai cinquemila? Tu hai la faccia di uno che vince stasera.»

**La folla**
31. «Ha vinto! Quello ha vinto! …No, è il cugino.»
32. «Mio padre ci ha perso il negozio. Mio nonno la barca.»
33. «Ho scommesso contro Turbo. È mio amico, per questo lo so.»
34. «Turbo s'è ribaltato un'altra volta. Sta bene. L'Ape no.»
35. «Stasera alla bisca c'era il Grigio. Ha giocato pure lui.»
36. «Il Professore ha vinto pure stasera. Con due settebelli.»
37. «Mio marito torna a casa senza scarpe. Le ha giocate.»
38. «La retata! Dicono che stanotte c'è la retata! Chi l'ha detto?»
39. «Lina! Mi hai fregato! Ti ho vista, strega! Ridammi la Vespa!»
40. «Ho vinto alla macchinetta! Mille lire! Ne ho messe trentamila.»

## 2.E Gioco: «Il banco»

Quattro giochi, dal più economico da fare al più caro. Il sette e mezzo esiste già (`soldi.js:706-725`): qui si aggiungono il
credito e la retata.

### 1. Le tre campanelle (Mano Lesta) — [NUOVO, piccolo]
- **Regole.** Si punta da 1 a 20 (meno di 5 lui non accetta: «Coi soldi del gelato non si gioca»). Tre bicchieri e una pallina,
  in un pannello come quello della bisca (RIUSO lo stile di `biscaView`).
  - Il primo giro è onesto: la pallina si vede andare.
  - Dal secondo giro, se punti 10 o più, o se hai vinto il giro prima, **la pallina non c'è sotto nessun bicchiere** (ce l'ha in
    mano lui).
- **Come si vince.** C'è un quarto tasto, «Alza tu gli altri due».
  - Se la pallina non c'è, lo hai scoperto: deve pagarti il doppio, e il compare ti si avvicina (al 30%: `brawl`).
  - Se la pallina c'è (primo giro), hai perso, e lui ride.
- **Rischio extra.** A ogni giro, se c'è un borsaiolo del giro a meno di 10 m (RIUSO GIRI.borsaiolo, 10-13 e 17-21), al 25% ti
  prende 2-8. Se ti muovi tra un giro e l'altro, il borsaiolo non ti prende.
- **Il lavoro da compare.** 3 a giro, fino a 6 giri. Chi era nel capannello si ricorda di te come «il compare» (RIUSO memoria).
- **Numeri.** Una mattina da compare vale 18. Una mattina da giocatore furbo: 10-30.

### 2. La scopa a soldi (il Professore) — [RIUSO OGG `carte`; NUOVO la partita]
- **Regole.** Una partita vale 1-5. Non è una scopa vera: si gioca a **tre mani**, e a ogni mano scegli una cosa.
  - **Gioca sicuro**: 55% di prendere la mano.
  - **Cerca la scopa**: 30%, ma se la prendi vale per due.
  - **Guarda le maniche**.
- **Il trucco.** Il Professore bara una mano su quattro: in quella mano tu hai il 15% qualsiasi cosa scegli.
  - Se guardi le maniche quando bara: vinci la partita intera, lui paga doppio e urla.
  - Se le guardi quando non bara: si offende, e per oggi non gioca più con te.
- **Il torneo** (giovedì 18-21, al Circolo). Iscrizione 5, quattro partite a eliminazione, premio 50. In finale arriva Tano: 20
  per perdere (bivio dell'arco).
- **Numeri.** Si vince poco e si perde poco. Serve a far vedere il Circolo e a conoscere Tano.

### 3. Sette e mezzo alla bisca (Lina Banco) — [RIUSO `bisca_puntata`/`carta`/`sto`; NUOVO credito e retata]
- **Il credito.** Lina presta fino a 50 alla volta, al 20% al giorno.
  - Il prestito si somma al debito con Sandro (`st.debt += x` quando scade, dopo 2 giorni).
  - Prima che scada passa Rocco (RIUSO visita `minaccia`).
- **La retata.** Ogni notte la probabilità è `4% + 6% × livello di Repressione`; +30% se Saponetta ha detto alla Zia che giochi;
  0 se Ferri ha preso la busta il venerdì (RIUSO fazioni, mazzette).
  - Quando parte, c'è la scena Z3.
  - Se ti prendono: fermo (RIUSO), perdi quello che hai sul tavolo e paghi 20 di multa.
  - Dopo la retata, la bisca resta chiusa 2 notti.
- **Numeri.** Il banco del Magazzino in `soldi.js` ha il limite di un terzo della cassa: si possono vincere 50-100 a notte, e
  perderli.

### 4. La corsa delle Ape (Turbo) — [NUOVO, il più caro]
- **Regole.** Sabato alle 23, dalla `salita` al `lungomare`, passando per tre porte (il Belvedere, la curva della `grotta`, il
  traguardo). Iscrizione 10, con qualsiasi mezzo (le sportive pagano 20: «Con la RX-7 è facile, stronzo»).
- **Versione economica.** Gli avversari non guidano davvero: hanno un tempo fisso, tirato a sorte (Turbo 1:40-2:10, l'Ape gialla
  1:50, la Vespa 1:35-2:30). Tu corri contro il cronometro, e all'arrivo il fratello legge la classifica. Il mezzo che scende con
  te è solo coreografia sulla strada (RIUSO guida dei veicoli verso un target).
- **Scommesse.** Su di te paga 3, su Turbo 2, sulla Vespa 5. Il fratello accetta da 5 a 50.
- **Rischio.** 25% + 10% per livello di Repressione che in fondo ci sia l'Alfetta: wanted 2 a tutti (RIUSO inseguimento).
  Sfasciare il mezzo è possibile (RIUSO danni).
- **Numeri.** 30 per una vittoria, fino a 150 con una scommessa grossa su di te.

### E la Cabala?
Il Totogarante sul discorso delle 20 è già scritto in `ricorrenti.md` §8. Qui si aggancia solo così: dopo la prima retata la
Cabala dà le quote sulla prossima («Retata entro giovedì: paga quattro»).

---

# MONDO 3 — LA STRADA (gli ambulanti)

## 3.A Il mondo in sei righe
1. **Chi.** Venditori senza licenza: Castagna, Calze, Cassetta e Ombrello. Ci sono anche quelli che esistono già: l'ambulante
   degli accendini (`eventi.js:480`) e il banditore delle pentole a rate (`citta.md` §8.3).
2. **Dove.** Dove c'è la fila:
   - la nave all'alba del lunedì e del giovedì (`calata`, verso il porto cargo);
   - il `wu` e la Panetteria Mario (`casa_59`);
   - il Cinema Astor (`cinema`) la sera;
   - il mercato in `piazza` il mercoledì e il sabato;
   - il sagrato (`chiesa`) dopo la messa;
   - il `lungomare` la domenica 17-20;
   - la Stazione Nord (`stazione_n`) all'alba.
3. **Quando.** Seguono la gente del calendario (`citta.md` §8). Se piove, esce Ombrello.
4. **Famiglia ed economia.** Il posto si paga a Permesso: 5 al giorno al mercato, 2 altrove. La merce viene dal Pontile Est
   (i Marsigliesi, di notte) e dal Magazzino. Senza la nave dell'Impero mancano le calze.
5. **Grigi e Risacca.** La licenza ambulante è il modulo 12-V, e ci vogliono sei mesi per averla. Senza licenza ti fanno 15 di
   multa e ti sequestrano la merce, che poi ritrovi da Reperto (scena R5). Gli ambulanti passano anche i volantini della
   Risacca, dentro i cartocci **[NUOVO]**.
6. **Il debito.** Per Nino è il lavoro più onesto che c'è senza un padrone: 20-50 al giorno. Basta per l'affitto, non per lo
   Squalo, e ti fa conoscere tutta la città.

## 3.B I quattro ricorrenti

### Castagna — Domenico Atzori, 63 anni
- **Dove e quando**: in `piazza` 9-13 (il mercoledì e il sabato al mercato); in fila al `cinema` 18-21; la domenica 17-20 sul
  `lungomare`; di notte il carretto lo lega alla fontana (`fontana`) con la catena.
- **Voce**: urla le castagne, si lamenta del freddo e di tutti, insulta i clienti e poi regala castagne ai bambini.
- **Gag visiva**: `scalda` le mani sul barile (posto `fuoco`), con un `sacco` di castagne ai piedi.

**Primo incontro**
- «Castagne calde! Comprate, sennò me le mangio tutte io!»
- «Mille lire il cartoccio. Sono dieci castagne. Nove. Una l'ho mangiata.»
- «Non toccare! Se tocchi compri. L'hai toccata. Mille.»
- «Trent'anni in questa piazza! Non mi sposto! Né per te né per i Grigi!»

**Ritorno**
- «Oh, il ragazzo! Tieni, una gratis. È bruciata, ma è gratis.»
- «Ieri m'hanno preso il carretto. Questo è di mio cognato. Non lo sa.»
- «Il Grigio s'è mangiato mezzo sacco e poi m'ha fatto la multa. Unto!»

**Da solo**
- «Castagne… castagne… Chi vuole castagne… Nessuno. Me le mangio io.»
- «Ho i piedi gelati e le mani cotte. Non c'è una via di mezzo, cazzo.»
- «Bambino, vieni. Prendine due. Non dire a tua madre che erano gratis.»

**Arco**
1. *All'inizio.* Ti affitta il carretto (5 al giorno): è il primo lavoro da ambulante (3.E).
2. *La Repressione arriva a 2.* I Grigi gli sequestrano il carretto. Lui vende le castagne da una pentola che tiene in braccio
   (`porta`, prop `latta`) e si brucia.
3. *Il bivio.* Il carretto è nel cortile della caserma.
   - **Lo riprendi** (RIUSO scasso, di notte, al `commissariato`).
   - **Paghi la multa** (15).
   - **Lo lasci lì**.
4. *La fine.*
   - **Carretto riportato**: sulla fiancata c'è l'onda col gesso, e lui giura di non sapere chi l'ha fatta.
   - **Carretto perso**: vende sulla porta dell'`osteria` e il primo cartoccio lo regala sempre a Mezzolitro.

### Calze — Graziella Mameli, 44 anni
- **Dove e quando**: in `piazza` il mercoledì e il sabato; sul sagrato (`chiesa`) la domenica dopo messa; sulla `passeggiata`
  17-19; al `pontile` la notte del lunedì, a prendere la merce dai Marsigliesi.
- **Voce**: fortissima e senza vergogna. Dà schiaffi sulle mani agli uomini e fa allusioni a voce alta davanti alle vecchie.
- **Gag visiva**: `porge` tenendo alta una `maglia` (le calze) e con la `borsa` aperta ai piedi, cioè la valigia.

**Primo incontro**
- «Calze velate dell'Impero! Signora, così suo marito torna presto!»
- «Le tocchi, le tocchi. Senta che roba. Lei no, signore! Giù le mani!»
- «Tremila al paio. Due paia cinquemila. Tre paia e ti sposo.»
- «Taglia unica. Va bene a tutte. Pure a te, se vuoi. Io non dico niente.»

**Ritorno**
- «Ancora tu? Per chi le compri? Per la mamma? Sì, sì. La mamma.»
- «Ieri le ha comprate la moglie del Colonnello. Quattro paia. Nere.»
- «Mi hanno fermata. Ho detto che le porto io. Tutte e quaranta.»

**Da sola**
- «Reggiseni! Mutande! Calze! Roba di sotto! La roba di sopra domani!»
- «Il prete mi ha guardato la valigia per mezz'ora. Mezz'ora!»
- «Ho le gambe gelate e vendo calze! Che vita di merda!»

**Arco**
1. *All'inizio.* Vende al mercato. Ogni ora i Grigi la cacciano, e lei si sposta di dieci metri.
2. *La nave dell'Impero non sbarca, o il Pontile Est viene chiuso* (RIUSO: la nave, i Marsigliesi). Niente merce: vende
   «calze di Stato», grigie e pesanti. Nessuno le compra.
3. *Il bivio.*
   - **Le vai a prendere la cassa dai Marsigliesi** (lavoretto di notte: `pontile` → `casa_154`, `crime: true`): ti dà il 30% della
     cassa.
   - **Reperto ti offre 10** per dirgli dove tiene la valigia.
4. *La fine.*
   - **Amica**: vende dalla finestra del Condominio Aurora (`aurora`) col cestino a corda, e la fila arriva fino al portone.
   - **Venduta**: la valigia la vedi a casa di Reperto, appesa allo stendino. Lei ti urla dietro ogni volta che passi.

### Cassetta — Ivo Mereu, 17 anni
- **Dove e quando**: alla `gelateria` 15-16; al `flipper` 16-19; a Vico del Campo (`piazzetta`) 22-24; il sabato fuori dalla
  `disco`. Va in giro col mangianastri in spalla.
- **Voce**: dei ragazzi, veloce. Sa tutti i titoli e se li inventa quando non li sa.
- **Gag visiva**: `porta` con la `radio` in spalla, a volume alto. Quando passa un Grigio la spegne e `saluta`.

**Primo incontro**
- «Oi, fra. Cassette. Roba del continente. Quella che alla radio non c'è.»
- «Questa l'ho registrata dalla radio. Si sente mia madre che chiama.»
- «Tremila. Duemila se dici che sono un genio. Dillo. Forte.»
- «Questa è vietata. Questa pure. Questa è il Garante, per i Grigi.»

**Ritorno**
- «Fra! Ti è piaciuta? No? L'hai messa al contrario, deficiente.»
- «Ho la nuova di Radio Scirocco. Non chiedermi come. Non lo so.»
- «M'hanno preso il mangianastri. Questo l'ho trovato. In una macchina.»

**Da solo**
- «Uno, due, prova. Uno, due. …Mamma, esco! …Uno, due.»
- «Ho registrato sopra il discorso del Garante. L'ha sentito mio padre.»
- «Cento cassette e due pile. Mi servono pile. Chi ha pile?»

**Arco**
1. *All'inizio.* Vende le cassette: 2-3 ciascuna.
2. *L'Ufficio Rettifiche comincia a sequestrare le cassette* (con Pardo in giro, la Repressione a 2). Lui, cagato sotto, vende
   solo «musica approvata»: l'inno della Tutela, fatto con l'organetto. Nessuno la compra.
3. *Il bivio.*
   - **Copia la trasmissione di Radio Scirocco su 50 cassette**, e tu le distribuisci. Vale come volantinare: il Morale sale.
   - **Pardo lo ferma**, e lui fa dei nomi. Se c'è Betamax, Betamax è in pericolo.
4. *La fine.*
   - **Eroe**: le sue cassette suonano alla Luna, e Vinile le annuncia.
   - **Spaventato**: lavora per la Radio Ufficiale. Porta il caffè e ruba i nastri.

### Ombrello — Nando Puddu, 50 anni
- **Dove e quando**: esce **solo se piove** (22:30-3 e 20-23 del secondo giorno, RIUSO meteo): all'uscita del `cinema`, sotto i
  portici del `bar`, alla `calata`. Quando non piove sta all'`osteria` a lamentarsi. Con la nebbia vende fazzoletti.
- **Voce**: si lamenta sempre. Parla del tempo come di un nemico personale. Alza i prezzi mentre parla.
- **Gag visiva**: `porta` con un `sacco` di ombrelli in spalla; `indica` il cielo.

**Primo incontro**
- «Ombrelli! Ombrelli! Piove! …Tra poco piove. Compra adesso, costa meno.»
- «Cinquemila. Sì, cinquemila. Prima che piovesse era tremila.»
- «Si apre così. No, così. Aspetta… Vabbè, è un ombrello da donna.»
- «Rotto? Non è rotto. È fatto per il vento da sinistra.»

**Ritorno**
- «Ancora senza ombrello? Ma sei scemo? Settemila. A te sette.»
- «Si è rotto? L'hai aperto sotto la pioggia, per forza. Che pretendi?»
- «Tre giorni che non piove. Mi vogliono rovinare, quei bastardi.»

**Da solo**
- «Dai… dai… piovi… Lo sento nel ginocchio. Il ginocchio non sbaglia.»
- «Piovi, porca miseria! Piovi! Ho ventidue ombrelli e tre figli!»
- «Ventidue ombrelli e mi bagno. Non posso aprirne uno, è merce.»

**Arco**
1. *All'inizio.* Quando piove, si vende.
2. *La parata della domenica sotto la pioggia* (RIUSO posto `parata`). La Tutela gli ordina 40 ombrelli grigi per i Grigi.
3. *Il bivio.*
   - **Ombrelli di Stato**: lui li consegna, e da allora ha un tesserino.
   - **La Risacca** (tu, con la vernice): disegnate l'onda dentro i 40 ombrelli. Alla parata piove, i Grigi aprono gli ombrelli,
     e sotto ognuno c'è un'onda (Morale +5, Repressione +1).
4. *La fine.*
   - **L'onda**: tutta la città ne parla per una settimana, e lui giura che li ha comprati già così.
   - **Il tesserino**: vende ombrelli grigi col distintivo e si lamenta lo stesso.

## 3.C Sei scene

### A1. Arrivano! — `arrivano_i_grigi` (folla)
**Quando e dove**: mercoledì e sabato 9-12, in `piazza` (RIUSO RECURRING `mercato`, posto `mercato`).
**Ruoli**: `a` Castagna; `b` Calze; `c` una vecchia cliente (filtro `old|f`); `d` un Grigio (filtro `cop`); `e` un ragazzo di
vedetta (filtro `young`).

- _`a` `scalda`; `b` `porge`. Si forma un capannello di 8 tra i due banchi (`aspetta`, `merce`)._
- **b**: «Calze! Calze dell'Impero! Ultime dieci paia!»
- **c**: «Queste quanto?»
- **b**: «Tremila, signora. Per lei duemila e cinque.»
- **c**: «Duemila.»
- **b**: «Duemila e cinque. Ha delle gambe che se lo meritano.»
- _`e` arriva di corsa._
- **e**: «Arrivano! I Grigi! Dalla chiesa!»
- _Tutti gli ambulanti chiudono in un secondo (`raccoglie`). `b` chiude la `borsa`, `a` copre il barile._
- **a**: «Non vendo niente! Mi scaldo! È vietato scaldarsi?»
- **b**: «Signora, ridia le calze! Le ridia!»
- **c**: «Quali calze?»
- _`c` nasconde le calze nella borsa della spesa. `d` arriva (`osserva`)._
- **d**: «Che c'è qui? Mercato abusivo?»
- **la folla**: «Niente!» oppure «Siamo in fila!» oppure «Per cosa?» «Boh, siamo in fila.» oppure «Io passavo.»
- **d**: «Lei. Cos'ha nella valigia?»
- **b**: «I miei vestiti. Vado da mia sorella. Parto.»
- **d**: «Da sua sorella col reggiseno appeso fuori?»
- **b**: «È il mio. Lo porto in mano. Fa caldo.»
- **d**: «Ci sono due gradi.»
- **b**: «Per me fa caldo! Sono in menopausa!»
- _`d` se ne va, scuotendo la testa. `c` se ne va piano con le calze._
- **b**: «Signora! I duemila! SIGNORA!»

**Nota**: folla di 8. Se il giocatore vende in piazza (3.E), la scena parte per tutti, lui compreso.

### A2. Il posto — `il_posto_si_paga` (scelta)
**Quando e dove**: mercoledì e sabato alle 10, in `piazza`. **Viene da te** se hai il carretto o la valigia.
**Ruoli**: `a` Permesso (`ricorrenti.md` §6, col vassoio di paste); `b` Castagna; `c` Rocco (cast `rocco`, due passi dietro).

- _`a` arriva dal banco di `b` (`porta` col vassoio, `saluta`)._
- **a**: «Buongiorno, signor Atzori. Le ho portato una pasta.»
- **b**: «Non la voglio la pasta. Quanto?»
- **a**: «Cinquemila. Come sempre. La pasta è gratis.»
- **b**: «Ho venduto tre cartocci! Tre! Sono tremila!»
- **a**: «Allora gliene presto due io. Fanno cinque. Me li ridà sabato.»
- _`b` paga, borbottando. `a` si gira verso NINO._
- **a**: «E lei! Che bel carretto. È suo? È nuovo? Paga anche lei, vero?»
- **[NUOVO] SCELTA** (10 s; se non scegli: «Paghi»)
  1. **Paghi** (5)
     - **a**: «Grazie. Si prenda una pasta. È alla crema.»
     - _[NUOVO] rep Famiglia +1. Per oggi Permesso ti tiene lontani i ladruncoli._
  2. **Non paghi**
     - **NINO**: «Non ho venduto niente ancora.»
     - **a**: «Capisco. Le faccio credito fino alle undici. Alle undici passa lui.»
     - _`c` `indica` NINO e poi il carretto._
     - _[NUOVO] alle 11, se non hai pagato: Rocco ti rovescia il carretto (la merce è persa)._
  3. **Paghi anche per Castagna** (10)
     - **b**: «Ma che fai, scemo? …Grazie. Tieni, castagne gratis per un mese.»
     - **a**: «Che bel gesto. Lo racconterò in giro. A chi deve saperlo.»
     - _[NUOVO] Castagna si ricorda di te (+3). Permesso si ricorda di te come «generoso» (rep Famiglia +1)._

### A3. La fila della nave — `fila_della_nave` (folla)
**Quando e dove**: alba del lunedì e del giovedì, 5-8, alla `calata`, verso il porto cargo (posto `fila`).
**Ruoli**: `a` Castagna; `b` Mano Lesta; `c` Calze; `d` uno in fila (filtro `adult`); `e` uno in fila (filtro `old`).

- _Una fila di 10 (`aspetta`, `scalda`). `a` `scalda` col barile; `b` `merce` sulla `scatola`; `c` `porge` lungo la fila._
- **a**: «Castagne calde per chi aspetta la nave!»
- **b**: «Campanelle per chi si annoia ad aspettare la nave!»
- **c**: «Calze per chi aspetta la nave e ha freddo alle gambe!»
- **d**: «Ma la nave arriva o no?»
- **a**: «E io che ne so? Se arriva, vendo meno. Speriamo di no.»
- **e**: «L'anno scorso ha portato le arance. Le ho viste. Erano arancioni.»
- **d**: «Io sono qui dalle tre. Mi tengo il posto con la sedia.»
- **la folla**: «Che porta oggi?» oppure «Zucchero, dicono.» oppure «Dicono anche che arriva, e non arriva mai.»
- _a caso (50%: RIUSO la nave sbarca o no):_
   - **la folla**: «La nave! Si vede!» oppure «È lei! Ha i camini!»
   - _La fila si stringe e spinge (`aspetta`, poi `go` di tutti verso `calata`)._
   - **c**: «Ho venduto tutto! Adesso arrivano le calze vere e non vendo più!»
- _altrimenti:_
   - **la folla**: «Non sbarca. La Tutela non la fa sbarcare.» oppure «Ancora!»
   - **d**: «Allora una castagna. Almeno quella.»
   - **a**: «Mille.»
   - **d**: «Ieri ottocento!»
   - **a**: «Ieri ero di buon umore! Mille, o vai a cagare!»

### A4. La gara dei banditori — `gara_dei_banditori` (folla)
**Quando e dove**: sabato 10-12, in `piazza`, al mercato.
**Ruoli**: `a` Calze; `b` il banditore delle pentole a rate (filtro `m|adult`; `citta.md` §8.3); `c` uno del pubblico (filtro
`m`).

- _`a` e `b` sono a due banchi vicini (`merce`). Si forma un capannello di 10 in mezzo (`osserva`)._
- **b**: «Una pentola! Due pentole! Una vita di pentole, tremila al mese!»
- **a**: «Calze! Più belle delle pentole! E non si pagano a rate!»
- **b**: «Signora, abbassi la voce, che qui si vende roba seria!»
- **a**: «Roba seria? Le tue pentole si bucano al primo sugo!»
- **b**: «Le tue calze si bucano a guardarle!»
- **la folla**: «Vai, Graziella!» oppure «Io ho la pentola. È bucata, è vero.» oppure «Io le calze. Bucate pure quelle.»
- **a**: «Chi compra un paio di calze, ha un bacio sulla guancia!»
- **b**: «Chi compra una pentola, ha la pentola!»
- **c**: «Io voglio il bacio.»
- **a**: «Tremila.»
- **c**: «Senza le calze?»
- **a**: «Senza le calze, cinquemila.»
- **la folla**: «Uuuh!» oppure «Dagliele, Tore!» oppure «Tore, tua moglie è lì dietro!»
- _`c` si gira, vede qualcuno e scappa (`flee`)._
- **b**: «Visto? Le pentole non fanno scappare nessuno!»
- **a**: «Perché non le compra nessuno!»

### A5. Il carretto in discesa — `carretto_in_discesa` (scelta)
**Quando e dove**: pomeriggio 15-18, in cima alla `salita` della Collina Nera. Va bene anche il `vico`, con la scalinata.
**Ruoli**: `a` Castagna; `b` un Grigio (filtro `cop`).

- _`a` spinge il carretto in salita (`lavora`). `b` gli si mette davanti (`indica`)._
- **b**: «Alt. La licenza.»
- **a**: «La licenza? Sì. Ce l'ho. A casa. In un cassetto. Sotto le mutande.»
- **b**: «Allora andiamo a casa a prenderla.»
- **a**: «Non posso lasciare il carretto. Me lo rubano.»
- **b**: «Lo tengo io.»
- _`a` molla il carretto per prendere i documenti. Il carretto parte da solo in discesa (RIUSO un oggetto spinto o un veicolo
  senza conducente; versione economica: il carretto è una figura col prop `cassa` che `go` in discesa)._
- **a**: «Il carretto! Il CARRETTO!»
- **b**: «Fermo! Fermo, in nome della Tutela!»
- **[NUOVO] SCELTA** (6 s; se non scegli: «Lo lasci andare»)
  1. **Lo fermi**
     - _[NUOVO] `playerTo` il carretto in 6 s._
     - **a**: «Bravo! Ragazzo d'oro! Castagne gratis per sempre!»
     - **b**: «Ottimo. Adesso lo sequestro.»
     - **a**: «Ma l'ha fermato lui, non tu!»
     - **b**: «Appunto. Lui è testimone.»
     - _[NUOVO] Castagna +2, e il Grigio si ricorda di te (+1, «il carretto»)._
  2. **Lo lasci andare**
     - _il carretto arriva in fondo e si rovescia (`fall` della figura). Le castagne rotolano sulla strada._
     - **la folla**: «Castagne!» oppure «Gratis! Sono per terra!» oppure «Raccogliete!»
     - _[RIUSO] capannello che raccoglie (`raccoglie`), come in `vodka_per_terra`._
     - **a**: «Lasciatele! Sono mie! …Almeno pagatemene una!»
  3. **Gli sali sopra**
     - **NINO**: «Ci penso io!»
     - _[NUOVO] il carretto diventa un veicolo per 15 s, lentissimo, senza freni._
     - **b**: «Quello è un mezzo! Hai la patente per il carretto?!»
     - **a**: «Le castagne! Attento alle castagne, deficiente!»
     - _[RIUSO] wanted 1. Castagna ti ama e ti odia, +1._

### A6. Piove — `piove_al_cinema` (folla)
**Quando e dove**: quando piove (RIUSO meteo), 21-23, all'uscita del `cinema` (posto `portone`).
**Ruoli**: `a` Ombrello; `b` un Grigio (filtro `cop`); `c` un ragazzo (filtro `young`); `d` una coppia, lei (filtro `f`).

- _Esce la gente dal cinema: capannello di 9 sotto la tettoia (`aspetta`, `braccia`). `a` arriva col `sacco` (`porta`)._
- **a**: «Ombrelli! Ombrelli! Tremila!»
- **la folla**: «Uno!» oppure «Due!» oppure «Io ne voglio uno grande!»
- **a**: «Quattromila. È aumentato. Piove di più.»
- **d**: «Due minuti fa erano tremila!»
- **a**: «Due minuti fa pioveva meno. Cinquemila.»
- **b**: «Ne prendo uno. Per servizio.»
- **a**: «Seimila.»
- **b**: «Per servizio, ho detto.»
- **a**: «Per servizio, gratis. Me lo firma? Mi serve per la Tutela.»
- **b**: «Non firmo niente.»
- **a**: «Allora è da seimila.»
- _`b` prende l'ombrello e se ne va senza pagare._
- **c**: «Fra, siamo in cinque. Ne compriamo uno e ci stiamo sotto tutti.»
- _[NUOVO] cinque ragazzi camminano stretti sotto un ombrello (RIUSO `follow` a distanza 0,4)._
- **a**: «Non vale! Uno a testa! Lo dice la legge!»
- **c**: «Quale legge?»
- **a**: «La mia!»
- _Smette di piovere (o non smette)._
- **la folla**: «Ha smesso!» oppure «Mi ridai i soldi?» oppure «Ecco. Ombrello per niente.»
- **a**: «Non si rimborsa! Domani piove! Lo dice il ginocchio!»

## 3.D Quaranta battute (barks)

**Passando (vicino a un ambulante)**
1. «Castagne! Calde! Chi le vuole calde!»
2. «Calze dell'Impero! Signora, guardi che velo! Guardi!»
3. «Cassette! Musica! Roba che i Grigi non sanno!»
4. «Accendini! Due per mille! Uno funziona!»
5. «Sigarette! Bionde! Non chiedete come, chiedete quante!»
6. «Pile! Lamette! Lacci! Fiammiferi! Il Garante in cartolina!»
7. «Fazzoletti per la nebbia! Ombrelli per la pioggia! Tutto per tutto!»
8. «Il caffè del continente! In polvere! Sa di caffè, quasi!»
9. «Bambola che parla! Parla! …Parla, cazzo! Ieri parlava!»
10. «Ultimi pezzi! Ultimissimi! Dopo questi ne ho altri, ma ultimi!»

**Trattativa**
11. «Quanto? Mille. No, non ottocento. Mille. Ottocento e novanta.»
12. «Prendine due, che ti faccio lo sconto. Il secondo costa uguale.»
13. «Ma lo sa quanto l'ho pagato io? No? Meglio.»
14. «Non è rotto! Fa così da nuovo. Dagli un colpo. Ecco. Visto?»
15. «Duemila, e ti regalo il cartoccio. Il cartoccio è nuovo.»
16. «Lo sconto?! Ti faccio lo sconto sulla faccia, se tocchi ancora!»
17. «Signora, l'ha toccato. Adesso è suo. Mille.»
18. «Non ho il resto. Mai. Neanche ieri. Prendi un'altra cosa.»
19. «Lo prendi o lo guardi? Se lo guardi, costa uguale.»
20. «Ultimo prezzo. L'ho detto io, quindi è l'ultimo.»

**Reagiscono a te (quando vendi tu)**
21. «Ehi! Quello è il mio angolo! Trent'anni che sto qui!»
22. «Il ragazzo del debito vende castagne! Siamo arrivati a questo!»
23. «Vendi più di me? Non è possibile. Le hai rubate?»
24. «Corri! Corri col carretto, che arrivano!» (Grigio vicino)
25. «Grida più forte, che non ti sente nessuno. Così. Brutto, ma così.»
26. «Hai i prezzi bassi, stronzo. Mi rovini la piazza.»
27. «Tu non sei del mestiere. Si vede. Hai le mani pulite.»
28. «Bagnato così fai pena. Vendi di più. Resta sotto l'acqua.» (bagnato)
29. «Tienimi il carretto un attimo. …Se arrivano i Grigi, è tuo.»
30. «Permesso ti cercava. Ha detto "Che bel carretto". Hai capito, no?»

**La folla**
31. «Castagne a mille? Ma è un furto! …Dammene due.»
32. «Le calze che ho preso sabato sono già bucate. Ne prendo altre.»
33. «L'ombrello si è rotto al primo vento. Era un ombrello da sole.»
34. «Mio figlio ha comprato una cassetta. È il Garante al contrario.»
35. «Arrivano i Grigi! …No, è il postino. Riaprite.»
36. «Ho visto Castagna correre. Correre! Col carretto! A sessant'anni!»
37. «Dammi le calze! Sono per mia moglie! …Non dirlo a mia moglie.»
38. «Il Grigio s'è preso le castagne e se n'è andato senza pagare.»
39. «Ma chi gliel'ha data la licenza a quello? …Ah, non ce l'ha.»
40. «Io non compro dagli abusivi. Io compro da mio cugino. È abusivo.»

## 3.E Gioco: «Il carretto»

**Cosa fa il giocatore.** Un lavoro senza padrone: prendi la merce, scegli il posto, vendi a chi passa e scappi dai Grigi
quando arrivano.

**1. L'attrezzo** (dai ricorrenti) [NUOVO, ma piccolo]

| attrezzo | da chi | costo | cosa vendi | prezzo | dove rende |
|---|---|---|---|---|---|
| carretto | Castagna | 5 al giorno, più 8 per un sacco = 20 cartocci | castagne | 1 | `piazza` al mercato, `cinema` 18-21, `lungomare` la domenica |
| valigia | Calze | lei si prende il 50% | calze | 3 (lei te le dà a 1,5) | mercato, sagrato dopo messa, `passeggiata` |
| mangianastri | Cassetta | 1 per cassetta | cassette | 2-3 | `flipper`, `gelateria`, fuori dalla `disco` il sabato |
| sacco di ombrelli | Ombrello | 2 per ombrello | ombrelli, solo se piove | 4-8 | uscita del `cinema`, `bar`, `calata` |

La merce si può anche comprare da soli: le calze al `pontile` di notte dai Marsigliesi (1), le castagne dai carbonai al
`villaggio` (5 al sacco, più lontano e più economico).

**2. La vendita** [RIUSO lo schema della scena `ambulante`; NUOVO i tasti]
- Ti fermi in un posto con gente (un posto di `posti.js`: `mercato`, `fila`, `portone`, `pensilina`, `sagrato`). Ogni 15-30 s un
  abitante a meno di 10 m si avvicina. Più gente c'è, più clienti arrivano (si usa il conteggio del brusio, `citta.md` §9.6).
- Per ogni cliente scegli una frase (3 tasti):
  - **«Prezzo basso»**: vendi al 65%, ma a meno 20%;
  - **«Tirala lunga»**: vendi al 45%, a prezzo pieno, e il cliente resta il doppio del tempo;
  - **«Urla»**: nei 15 s dopo arrivano 2 clienti in più, ma il rumore arriva a 30 m e i Grigi ti sentono.
- Il cliente conta:
  - i vecchi comprano col prezzo basso (+15%);
  - i ragazzi se urli (+15%);
  - le calze le comprano più le donne, ma gli uomini le prendono «per la mamma».
- Le battute del cliente sono quelle di 3.D (11-20 e 31-40).

**3. I Grigi** [RIUSO pattuglie e wanted; NUOVO «chiudi»]
- Se un Grigio passa a meno di 25 m, un altro ambulante grida «Arrivano!» (3.D, 24).
- Hai 4 secondi per **chiudere** (tieni premuto il tasto).
  - Se chiudi e cammini, niente.
  - Se corri con la merce in vista e un Grigio ti vede, sei a wanted 1 (RIUSO inseguimento). Col carretto vai al 70% della
    velocità (RIUSO `porta` con prop `cassa`).
  - Se ti prendono con la merce aperta: 15 di multa, e la merce va al banco di Reperto (scena R5, la riprendi al 100%).

**4. La Famiglia** [RIUSO Permesso e visite]
- Al mercato il posto costa 5, altrove 2 (scena A2).
- Se non paghi, alle 11 Rocco ti rovescia il carretto.
- Se paghi, per oggi i borsaioli del giro non ti toccano.

**5. La Risacca** [NUOVO, opzionale]
- Con almeno 1 di `volantini` nello zaino, il tasto «Metti un volantino nel cartoccio»: ogni cartoccio fa Morale +0,2, e
  ogni volta c'è il 5% di `suspicious()` (RIUSO).

**Numeri a occhio**
- Una mattina di mercato (mer o sab, 7-13): 25-35 clienti, la metà compra.
  - Castagne: 20 cartocci, guadagno 7-12 tolti sacco, affitto e posto.
  - Calze: 15 paia, 22 tolta la parte di Calze.
- Una sera al cinema: 6-10.
- Una notte di pioggia con gli ombrelli: 20-40.
- In tutto 20-50 al giorno. L'affitto (12 a settimana) si paga; il debito no.
- Serve a una cosa: ti porta nei posti dove c'è gente, e ti fa vedere le scene di questi tre mondi.

---

## Extra: dieci scambi fra amici che si fregano (sulla misura della prova 9 di `TONO.md`)
Due abitanti dello stesso gruppo (filtro `young` o `m`), a voce alta, vicino a un banco. Vanno nel mazzo dei frammenti.
1. (dal ricettatore) «Vendi tu, che hai la faccia onesta.» «E i soldi?» «I soldi li tengo io.»
2. (alle campanelle) «Gioca tu, che sei fortunato.» «E se perdo?» «Se perdi, erano i tuoi.»
3. (alla retata) «Scappa! Ti copro io!» …«Agente! È andato di là! Quello col giubbotto!»
4. (col carretto) «Tu spingi in salita. Io spingo in discesa.»
5. (alla bisca) «Prestami dieci. Se vinco te ne do venti.» «E se perdi?» «Non mi vedi più.»
6. (da Castagna) «Ne assaggio una.» …«Un'altra, quella era bruciata.» …«Un'altra.» «SEIMILA!»
7. (da Saponetta) «Non dico niente a nessuno. Giuro.» …«Agente, è stato lui. Io zitto, eh.»
8. (prima di uno scasso) «Io faccio il palo, tu entri.» «A metà?» «Il palo rischia di più. Settanta.»
9. (alla scopa) «Fammi vedere le carte, ti aiuto.» …«Ha il settebello! Ce l'ha in mano lui!»
10. (sotto la pioggia) «Ci stiamo in due sotto l'ombrello?» «Sì. Io sotto, tu vicino.»

## Cosa serve al motore, in ordine (tutti e tre i mondi)
1. **`ask`**, la scelta sotto il fumetto: è già la prima richiesta di `scene.md`. Qui la usano 10 scene su 18 e le trattative.
2. **Un pannello di gioco piccolo**, sullo stampo di quello del sette e mezzo (`soldi.js` `biscaView`): campanelle, scopa a tre
   mani, trattativa col ricettatore. Sono tre schermate con tre tasti ciascuna.
3. **I banchi dei ricettatori come dati**: chi, dove, quando, cosa compra, quanto paga, che rischio porta. Si appoggiano a
   `sell()` e `sellPrice` di `oggetti.js`.
4. **Due righe sul debito**: l'acconto di Sandro su ogni vendita, e il credito della bisca che si somma a `st.debt`.
5. **La data sul pezzo rubato** («calda» per 12 ore).
6. **La retata come evento**, con le probabilità di 2.E.
7. **La vendita in strada**: clienti che si avvicinano, i tre tasti, e il «chiudi» quando arriva un Grigio.
8. **La corsa delle Ape**: tre porte e un cronometro (è il pezzo più caro).
9. Le altre chiavi delle scene: `memo` e `rep`, `hunt`, `playerTo`. Mancano gli stessi pezzi già chiesti in `scene.md`.

## I conti
- **12 ricorrenti**, 10 battute ciascuno: 120 battute. Ognuno ha un arco in tre passi più la fine.
- **18 scene** (6 per mondo):
  - 8 con una scelta del giocatore: R2, R3, R4, Z1, Z3, Z6, A2, A5;
  - 10 con la folla: R1, R5, Z1, Z3, Z4, Z6, A1, A3, A4, A6.
- **120 battute di strada** (40 per mondo), più **10 scambi fra amici** (20 battute).
- **3 giochi proposti**: «Vendi la roba», «Il banco» (con quattro giochi dentro) e «Il carretto».
