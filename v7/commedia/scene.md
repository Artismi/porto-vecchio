# Porto Vecchio — Trenta scene nuove per la strada (più una di riserva)

Proposta del reparto commedia, 8 novembre. **Niente è stato toccato nel gioco**: le schede stanno in `scene_dati.js` (stessa cartella),
nel formato SCENE di `eventi.js`, pronte da aggiungere al catalogo come fa `matti.js`.

Direzione di Andrea: «più street, più GTA, più stand-up comedy; ironico, sfacciato, grezzo. Deve sembrare viva e piena la città».
Regole rispettate (REGIA_COMMEDIA §2): una voce per fazione, al massimo 70 caratteri a fumetto (controllato a macchina: 465 varianti,
nessuna oltre), parolacce sì, bestemmie no, sesso solo per allusione, niente razza né disabilità, nessuna battuta sui rettificati,
nessuna battuta spiegata. Nessuna scena duplica le 100 di `eventi.js` e `matti.js` (ids controllati) né le cinque di REGIA §3.

## Come leggere il copione
- **nome**: «battuta» oppure «battuta»: le varianti, il motore ne sceglie una. «la folla» è uno a caso del capannello.
- `{a}`, `{b}`: il nome vero di chi recita (il motore lo riempie).
- _corsivo_: quello che si vede (chi va dove, pose, oggetti in mano). Pose e oggetti sono solo quelli che esistono (anim_vita.js, anim_lotta.js, anim_mano.js).
- **[NUOVO]**: il motore oggi non lo sa fare. Il copione regge anche senza: l'interprete salta le chiavi che non conosce.

## Cosa serve al motore (tutte le [NUOVO], in ordine di utilità)
1. **`ask`, la scelta** (8 scene): 2-3 tasti sotto il fumetto, 6-12 secondi per decidere, un ramo di default se non scegli. Con `say:'player'` per la battuta di Nino.
2. **`memo` e `rep`**: chi recita si ricorda di te (una parola chiave e un segno, nel suo diario); la reputazione con un gruppo (famiglia, grigi, ragazzi, quartiere, risacca). Servono anche `money` (soldi a te) e `give` (un oggetto in Tasca).
3. **`hunt`**: un attore insegue il giocatore (oggi `chase` vuole due ruoli). Breve, 12-14 s, con un ramo se ti prende e uno se ti perde.
4. **`tv`**: lo schermo del bar col Garante acceso/spento (il discorso delle 20 diventa un posto: `bar_tv`).
5. **`window` e `throw`**: affacciarsi a un balcone sopra il posto `portone`; un oggetto che cade e resta a terra.
6. **`car`**: un'Alfetta che passa piano e se ne va (il silenzio dei ragazzi). **`playerTo`**: aspetta che il giocatore vada da qualcuno.
7. Filtri nuovi: `prete`, `marsigliese`, `orecchio`. Posti nuovi: `caserma`, `officina`, `cabina`, `bar_tv` (oggi le schede ripiegano su posti che esistono, `soft:true`).

## La prova (fatta, senza toccare il repo)
Uno script nella cartella degli strumenti carica i moduli veri di `v7/src` come `test_eventi.js`, aggiunge queste schede e le lancia una per una:
**30 su 31 partono e arrivano in fondo** (tutte sotto i 90 s). Quella che non parte, `arance_sovversive`, vuole due Grigi di pattuglia
vicini, come `pattuglia_notte` che già oggi non sempre parte. Le chiavi [NUOVO] vengono saltate senza errori.

## Indice

| n | titolo | id | quando, dove | tipo | scelta | persone |
|---|---|---|---|---|---|---|
| 1 | Il timbro del timbro | `timbro_del_timbro` | mattina, davanti alla caserma (lo sportello) | Grigi, folla |  | 9 |
| 2 | Le cravatte dal terzo piano | `cravatte_dal_balcone` | mattina, sotto un condominio (il portone) | lite pubblica, folla |  | 8 |
| 3 | Il comitato del 9 | `comitato_del_nove` | mattina presto, alla fermata | assemblea, folla, Grigi |  | 8 |
| 4 | La piangitrice a ore | `prefica_a_ore` | mattina, sul sagrato di San Rocco | funerale, folla, scelta | sì | 8 |
| 5 | Le arance d'importazione | `arance_sovversive` | mattina, al mercato | Grigi, folla di vecchie |  | 8 |
| 6 | Il meccanico e la campagnola | `campagnola_offesa` | mattina, all'officina dello Scalo | lavoro, Grigi |  |  |
| 7 | Diciotto anni di cambiali | `diciotto_anni_di_cambiali` | giorno, accanto a un'auto parcheggiata | crollo pubblico, folla |  | 7 |
| 8 | Lo scippo alla rovescia | `scippo_alla_rovescia` | giorno, al mercato | crimine andato male |  |  |
| 9 | Davanti il Garante, dietro le cozze | `davanti_il_garante` | giorno, alla pensilina o in piazza | lavoro assurdo |  |  |
| 10 | Il censimento dei gabbiani | `censimento_gabbiani` | giorno, sulla calata o sul lungomare | lavoro assurdo, Tutela |  |  |
| 11 | La multa al defunto | `multa_al_defunto` | giorno, accanto a un'auto parcheggiata | Grigi |  |  |
| 12 | Come si scrive Nino | `come_si_scrive_nino` | giorno o sera, vicino a una porta della città | Grigi, scelta | sì |  |
| 13 | La macchina restituita | `la_cugina` | giorno, accanto a un'auto parcheggiata | Famiglia |  |  |
| 14 | La classifica dei Grigi | `classifica_dei_grigi` | pomeriggio, in periferia (a piedi) | ragazzi, camminata |  |  |
| 15 | Il pallone dei Grigi | `pallone_in_caserma` | pomeriggio, sotto il muro della caserma | ragazzi, Grigi, scelta | sì |  |
| 16 | Il battesimo con la busta | `battesimo_con_busta` | domenica mattina, sul sagrato di San Rocco | Famiglia, rito, folla |  | 9 |
| 17 | Lo sposo corre | `sposo_in_fuga` | sabato a mezzogiorno, sul sagrato | matrimonio, folla, scelta, inseguimento | sì | 9 |
| 18 | Il santo e il ritratto | `santo_e_ritratto` | domenica pomeriggio, dal sagrato verso la piazza | processione, folla, Grigi |  | 11 |
| 19 | Il ladro senza spinta | `spingi_la_vespa` | sera, all'angolo | crimine andato male, scelta | sì |  |
| 20 | Mani in alto, è una banana | `rapina_alla_banana` | sera, davanti al tabacchi | crimine andato male |  |  |
| 21 | Il bacio sbagliato | `la_mano_sbagliata` | sera, al dehors del bar | Famiglia, rito |  |  |
| 22 | L'applauso di Stato | `applauso_di_stato` | sera, poco prima delle 20, al bar | lavoro assurdo, stand-up, scelta | sì |  |
| 23 | La fila al telefono | `una_cabina_sola` | sera, alla cabina (o all'edicola) | lite pubblica, folla |  | 7 |
| 24 | In piedi per il Garante | `in_piedi_per_il_garante` | alle 20, al dehors del bar con lo schermo | il discorso delle 20, folla, scelta | sì | 8 |
| 25 | Il pezzo dell'Ape | `pezzo_dell_ape` | giorno, dove un'Ape è in doppia fila | stand-up rivolto a te |  |  |
| 26 | La suocera e la Tutela | `pezzo_della_suocera` | giorno, alla fermata | stand-up rivolto a te (benpensante) |  |  |
| 27 | Il posto di Franco | `pezzo_del_reduce` | sera, fuori dall'osteria | stand-up rivolto a te (reduce) |  |  |
| 28 | La vodka dell'Impero | `vodka_per_terra` | all'alba del lunedì e del giovedì, sulla calata | Famiglia, folla, scelta | sì | 8 |
| 29 | Se tu fossi il Garante | `se_tu_fossi_il_garante` | notte, al muretto o all'angolo | ragazzi, notte, momento serio |  |  |
| 30 | Il marsigliese al pontile | `pezzo_del_marsigliese` | notte, sulla calata o al pontile | stand-up rivolto a te (Marsigliesi) |  |  |
| 31 | L'ultima corsa | `ultima_corsa_dell_autobus` | notte, alla fermata prima dell'Ora Quieta | folla, notte, Grigi |  | 9 |

Le 8 scene con la scelta: 4, 12, 15, 17, 19, 22, 24, 28. Le scene con 5 o più persone in scena (capannello compreso) sono 13: 1, 2, 3, 4, 5, 7, 16, 17, 18, 23, 24, 28, 31.
La 31 (`ultima_corsa_dell_autobus`) è di riserva: notte, folla, Ora Quieta.

---

## Mattina

### 1. Il timbro del timbro — `timbro_del_timbro`

**Quando e dove**: mattina, davanti alla caserma (lo sportello). Ore 8–12 · giorni lun, mar, mer, gio, ven. Posto: caserma [NUOVO], fila, portone (soft).  
**Tipo**: Grigi, folla  
**Ruoli**: `a` il Grigio allo sportello (filtro cop); `b` il primo della fila (filtro old); `c` il secondo (filtro adult|any); `d` il ragazzo in fondo (filtro young)

- _Il Grigio allo sportello prende posto; il primo della fila prende posto; il secondo prende posto; il ragazzo in fondo prende posto (insieme). Si forma un capannello di 5 (aspetta). Il Grigio allo sportello aspetta._
- **il Grigio allo sportello**: «Il prossimo. Modulo 7?» oppure «Avanti. Ha il modulo per il modulo?»
- **il primo della fila**: «Ho il 7. Il 7-bis me l'avete preso voi a marzo.»
- **il Grigio allo sportello**: «Senza il bis, il 7 è carta. Torni col bis.»
- **il primo della fila**: «E il bis dove lo prendo?»
- **il Grigio allo sportello**: «Qui. Ci vuole il 7 timbrato.»
- _Il primo della fila: rabbia. Il primo della fila gesticola._
- **il primo della fila**: «Ma il 7 lo timbrate solo se c'è il bis!»
- **il Grigio allo sportello**: «Vede che ha capito? Il prossimo.»
- **il secondo**: «Io devo fare il certificato di esistenza in vita.»
- **il Grigio allo sportello**: «Lei è vivo?»
- **il secondo**: «Credo.»
- **il Grigio allo sportello**: «Credo non è un timbro.»
- **la folla**: «Alle dieci e mezza chiudete! Sono le dieci!» oppure «Mia madre è morta in questa fila. Aspettava il certificato.» oppure «Io vengo per abitudine. A casa mi annoio.» oppure «Il bis lo vende il cugino del piantone. Diecimila.»
- **il ragazzo in fondo**: «Fra, io devo solo ridare una tessera. L'ho trovata.»
- _Il Grigio allo sportello guarda il ragazzo in fondo. Il Grigio allo sportello indica._
- **il Grigio allo sportello**: «Trovata? Venga dentro. Si accomodi.»
- _a caso (30%):_
   - **il ragazzo in fondo**: «...ciao a tutti. Salutatemi mia madre.»
   - _Il ragazzo in fondo va verso il Grigio allo sportello. Il ragazzo in fondo viene portato via (fermo)._
- _altrimenti:_
   - **il ragazzo in fondo**: «Sai che c'è? Me la tengo. Mi piace la foto.»
   - _Il ragazzo in fondo se ne va._
- **il Grigio allo sportello**: «Chiusura per pranzo. Riapriamo quando riapriamo.»
- **la folla**: «Vaffanculo, va'.» oppure «Ci vediamo domani. Stessa fila.» oppure «Io resto. Così domani sono il primo.»

**Nota**: Folla di 5 in fila. Al 30% il ragazzo viene trattenuto (jail). Serve il posto «caserma» [NUOVO], se no la fila del forno.

### 2. Le cravatte dal terzo piano — `cravatte_dal_balcone`

**Quando e dove**: mattina, sotto un condominio (il portone). Ore 7–11.5. Posto: portone.  
**Tipo**: lite pubblica, folla  
**Ruoli**: `a` Tiziana, la moglie, al balcone (filtro f); `b` il marito, in canottiera (filtro adult|m); `c` la vicina del quarto (filtro f)

- _[NUOVO] Tiziana si affaccia al balcone. Il marito prende posto. Il marito: freddo._
- **il marito**: «{a}! Apri! È un malinteso!» oppure «{a}, amore! Ti spiego tutto! Apri!»
- **Tiziana**: «Il malinteso si chiama Loredana e sta al quarto!»
- _[NUOVO] Tiziana lancia giù: maglia._
- **il marito**: «Le cravatte no! Sono di mia madre!»
- _Si forma un capannello di 5._
- **la folla**: «Brava {a}!» oppure «Loredana del quarto? Pure con mio marito.» oppure «Butta il televisore, che lo vediamo tutti.»
- _Il marito gesticola._
- **il marito**: «Che avete da guardare? Non ce l'avete una casa?»
- **la folla**: «Sì, ma la tua è più divertente.» oppure «La mia è noiosa. Mio marito è fedele. Che schifo.»
- _[NUOVO] Tiziana lancia giù: radio._
- **il marito**: «La radio no! C'è la partita!»
- **Tiziana**: «Ascoltala da Loredana!»
- _[NUOVO] La vicina del quarto si affaccia al balcone._
- **la vicina del quarto**: «Io non c'entro! Gli ho prestato lo zucchero!»
- **Tiziana**: «Tre volte a settimana, lo zucchero?!»
- **la folla**: «Ohhh.» oppure «Uh, lo zucchero.» oppure «Io lo zucchero lo compro, eh.»
- _Il marito raccoglie. Il marito ha in mano: maglia._
- **il marito**: «Va bene. Vado da mia madre.»
- **Tiziana**: «Tua madre ha già telefonato. Non ti vuole neanche lei.»
- _Il marito se ne va._
- **la folla**: «Prova dal prete!» oppure «Ciao, bello!»

**Nota**: Folla di 5. Servono il balcone e gli oggetti lanciati che restano a terra [NUOVO]; senza, la moglie urla dal portone.

### 3. Il comitato del 9 — `comitato_del_nove`

**Quando e dove**: mattina presto, alla fermata. Ore 6.5–9.5. Posto: fermata, pensilina (soft).  
**Tipo**: assemblea, folla, Grigi  
**Ruoli**: `a` il portavoce improvvisato (filtro adult|m); `b` la signora con la borsa (filtro old); `c` il ragazzo (filtro young); `d` il Grigio che passa (filtro cop)

- _Il portavoce improvvisato prende posto; la signora con la borsa prende posto; il ragazzo prende posto (insieme). Si forma un capannello di 4 (aspetta)._
- **la signora con la borsa**: «Quaranta minuti. Il 9 non passa.»
- **il ragazzo**: «Il 9 non esiste, signora. È una leggenda.»
- _Il portavoce improvvisato allarga le braccia._
- **il portavoce improvvisato**: «Basta! Cittadini! Facciamo un comitato!»
- **la folla**: «Bravo!» oppure «Chi paga?» oppure «Ci sto, se finisce prima delle otto.»
- **il portavoce improvvisato**: «Primo punto: il 9. Secondo: chi ha rubato il 9.»
- **il ragazzo**: «Terzo punto: la merenda.»
- **il portavoce improvvisato**: «Votiamo! Chi è per lo sciopero dell'attesa?»
- _La folla alza le mani. Il ragazzo alza le mani. Il Grigio che passa va verso il punto della scena._
- **il Grigio che passa**: «Che è questo capannello? Assembramento?»
- **il portavoce improvvisato**: «No, agente. Aspettiamo il 9.»
- **la folla**: «Il 9, sì.» oppure «Viva il 9.» oppure «Io manco lo so cos'è un comitato.»
- **il Grigio che passa**: «Il 9 da oggi è soppresso. Circolare.»
- **la signora con la borsa**: «E noi come ci andiamo, al lavoro?»
- **il Grigio che passa**: «Con la fantasia, signora. Come tutti.»
- _La signora con la borsa va via; il Grigio che passa va via (insieme)._
- **il ragazzo**: «Presidente, ci vediamo domani?»
- **il portavoce improvvisato**: «Non ti conosco. Non ci conosciamo.»

**Nota**: Folla di 4 + 3 ruoli. Chi alza la mano lo vede il Grigio: niente conseguenze per ora (potrebbe segnare la fermata).

### 4. La piangitrice a ore — `prefica_a_ore`

**Quando e dove**: mattina, sul sagrato di San Rocco. Ore 9–12.5. Posto: sagrato. **Viene da te.**  
**Tipo**: funerale, folla, scelta  
**Ruoli**: `a` la piangitrice (filtro old|f); `b` la vedova (filtro f); `c` il cerimoniere delle pompe funebri (filtro old|m)

- _La piangitrice prende posto; la vedova prende posto; il cerimoniere delle pompe funebri prende posto (insieme). Si forma un capannello di 5 (aspetta). La piangitrice prega._
- **la piangitrice**: «Ohhh Gesualdo! Gesualdo nostro!»
- **la vedova**: «Si chiamava Ernesto.»
- **la piangitrice**: «Ohhh Ernesto! Ernesto nostro!»
- **la folla**: «Era uno buono, Ernesto.» oppure «Mi doveva diecimila lire.» oppure «Chi è quella?»
- **la folla**: «La piangitrice. Otto a funerale, dodici con lo svenimento.»
- **la piangitrice**: «Signora, lo svenimento è compreso?»
- **la vedova**: «Non ho i soldi neanche per i fiori.»
- **la piangitrice**: «Allora piango a metà.»
- _La piangitrice prega. La vedova guarda NINO (tu)._
- **la vedova**: «Lei! È il nipote di Torino? Ernesto parlava sempre di lei.»
- **[NUOVO] SCELTA** (12 s; se non scegli: «No, mi dispiace») — **la vedova**: «È lei? Il nipote?»
   1. **Sì, sono il nipote**
      - **la folla**: «Il nipote! È venuto!» oppure «Quello di Torino! Quello ricco!»
      - **il cerimoniere delle pompe funebri**: «Il nipote dice due parole.»
      - **NINO (tu)** [NUOVO]: «Ernesto era... alto.»
      - **la folla**: «Era basso.» oppure «Bellissime parole.» oppure «Ha ragione. Dentro, era alto.»
      - _La vedova porge. [NUOVO] Ti resta in tasca: cappello._
      - **la vedova**: «Tieni. Il cappello di Ernesto. Lo voleva a te.»
      - _[NUOVO] La vedova si ricorda di te (+2, «il nipote»). [NUOVO] Reputazione quartiere +1._
   2. **No, mi dispiace**
      - **la vedova**: «Peccato. Quello vero non viene da nove anni.»
      - **la piangitrice**: «Neanche io sono la sorella. Eppure guardi come piango.»
   3. **Pago io lo svenimento**
      - _[NUOVO] Soldi -12 mila._
      - **la piangitrice**: «Ohhh Ernesto! Portami con te!»
      - _La piangitrice cade._
      - **la folla**: «Mamma mia, che professionista.» oppure «Questo sì che è un funerale.» oppure «Al mio la voglio uguale.»
      - _La piangitrice si rialza._
      - **la piangitrice**: «Ricevuta?»
      - _[NUOVO] La vedova si ricorda di te (+1, «lo svenimento»). [NUOVO] La piangitrice si ricorda di te (+1, «cliente»)._
- **il cerimoniere delle pompe funebri**: «Signori, il carro non aspetta. Ha un altro giro alle undici.»

**Nota**: SCELTA. Sì: la vedova ti ricorda (+2) e ti dà il cappello del morto. Paghi lo svenimento: -12 mila, ti ricordano tutte e due.

### 5. Le arance d'importazione — `arance_sovversive`

**Quando e dove**: mattina, al mercato. Ore 8–12.5. Posto: mercato, banco_pesce (soft).  
**Tipo**: Grigi, folla di vecchie  
**Ruoli**: `a` il Grigio anziano (filtro cop); `b` il Grigio giovane (filtro cop); `c` la signora con la rete (filtro old|f)

- _La signora con la rete ha in mano: borsa. Il Grigio anziano va verso la signora con la rete; il Grigio giovane segue il Grigio anziano (insieme). La signora con la rete guarda il Grigio anziano._
- **il Grigio anziano**: «Signora, cos'ha nella rete?»
- **la signora con la rete**: «Arance.»
- **il Grigio anziano**: «Da dove?»
- **la signora con la rete**: «Dal banco. Lì.»
- **il Grigio anziano**: «E il banco da dove le prende?»
- **la signora con la rete**: «Dall'albero, agente. Le arance vengono dagli alberi.»
- _Il Grigio anziano indica._
- **il Grigio anziano**: «Frutta d'importazione non dichiarata. Sequestro.»
- _Il Grigio giovane ha in mano: borsa. Si forma un capannello di 5._
- **la folla**: «Vergogna! Sono arance!» oppure «Mio nipote è nei Grigi. Si vergogna pure lui.» oppure «Quelle dell'Impero sono più buone, però.»
- _Il Grigio giovane mangia._
- **la signora con la rete**: «Se la sta mangiando!»
- **il Grigio giovane**: «È per l'analisi.»
- **il Grigio anziano**: «...e com'è?»
- **il Grigio giovane**: «Sovversiva. Dolcissima.»
- **la signora con la rete**: «Me ne lasci una, almeno. Per il nipote.»
- **il Grigio anziano**: «Una. Ma la dichiara.»
- **la signora con la rete**: «Dichiaro che siete due stronzi.»
- **la folla**: «Brava {c}!» oppure «Scrivilo sul modulo!» oppure «Ha dichiarato!»
- _Il Grigio anziano allarga le braccia._
- **il Grigio anziano**: «Circolare! Tutte! Anche lei, nonna!»
- **la folla**: «Io circolo da ottant'anni.» oppure «Circola tu, che sei giovane.»
- _Il Grigio anziano va via; il Grigio giovane segue il Grigio anziano (insieme)._

**Nota**: Folla di 5. Se ci sono due Grigi in pattuglia vicini. La rete passa di mano (hand). Nessuna conseguenza sul giocatore.

### 6. Il meccanico e la campagnola — `campagnola_offesa`

**Quando e dove**: mattina, all'officina dello Scalo. Ore 7.5–12.5. Posto: officina [NUOVO], retrobottega, facciata_in_riparazione (soft).  
**Tipo**: lavoro, Grigi  
**Ruoli**: `a` il meccanico (filtro shop|m); `b` il Grigio che aspetta la macchina (filtro cop)

- _Una campagnola dei Grigi in doppia fila. Il meccanico va verso il mezzo. Il meccanico lavora. Il Grigio che aspetta la macchina va verso il punto della scena. Il Grigio che aspetta la macchina aspetta._
- **il meccanico**: «Allora, bella. Chi ti ha ridotta così? I tuoi padroni, eh?»
- **il Grigio che aspetta la macchina**: «Parla con la macchina?»
- **il meccanico**: «Con lei sì. Con voi è inutile.»
- **il meccanico**: «Senti come tossisce. Ha i polmoni di un Grigio.»
- **il Grigio che aspetta la macchina**: «Quanto ci vuole?»
- **il meccanico**: «Se le volete bene, due ore. Se no, due settimane.»
- _Il meccanico martella._
- **il meccanico**: «Ti faccio correre, tranquilla. Ma non verso di noi.»
- **il Grigio che aspetta la macchina**: «Che ha detto?»
- **il meccanico**: «Candela. È un termine tecnico.»
- **il Grigio che aspetta la macchina**: «Mi fa la fattura?»
- **il meccanico**: «La fattura costa il doppio. La fiducia è gratis.»
- **il Grigio che aspetta la macchina**: «Allora fiducia.»
- _Il Grigio che aspetta la macchina paga 5 mila a il meccanico._
- **il meccanico**: «Bravo. Fidatevi. Sempre.»

**Nota**: Una campagnola in doppia fila (van kind campagnola, esiste). Il Grigio paga 5 al meccanico. Posto «officina» [NUOVO].

## Giorno

### 7. Diciotto anni di cambiali — `diciotto_anni_di_cambiali`

**Quando e dove**: giorno, accanto a un'auto parcheggiata. Ore 9–19. Posto: sosta (soft).  
**Tipo**: crollo pubblico, folla  
**Ruoli**: `a` il benpensante a rate (filtro adult|m); `b` un passante (filtro young|any)

- _Il benpensante a rate va verso il punto della scena. Il benpensante a rate armeggia. Il benpensante a rate: rabbia._
- **il benpensante a rate**: «Diciotto anni di cambiali e la radio prende solo il Garante.» oppure «Ogni mese la rata. Ogni mese parte. Oggi no.»
- _Il benpensante a rate tira un calcio._
- **il benpensante a rate**: «Parti! Che ti ho pagato pure i tappetini!»
- _Si forma un capannello di 5._
- **la folla**: «Signore, si calmi!» oppure «Le dia un altro calcio, a me ha funzionato.» oppure «È la cinghia. È sempre la cinghia.»
- _Il benpensante a rate gesticola._
- **il benpensante a rate**: «La cinghia l'ho cambiata a rate! Ventiquattro!»
- **un passante**: «Stamattina ne ho viste rubare tre. La sua no.»
- **il benpensante a rate**: «Neanche i ladri la vogliono?!»
- _Il benpensante a rate tira un calcio._
- **il benpensante a rate**: «Sapete che c'è? Vado a piedi. Come i poveri.»
- **la folla**: «Bentornato.» oppure «Benvenuto, allora.» oppure «Si sta bene, quaggiù.»
- _Il benpensante a rate va via. Il benpensante a rate va verso il punto della scena._
- **il benpensante a rate**: «Però la chiudo a chiave. Non si sa mai.»
- _Il benpensante a rate si siede per terra._
- **il benpensante a rate**: «Mia moglie me l'aveva detto. Prendi la bici. A rate.»

**Nota**: Folla di 5. «calcio» è la posa di anim_lotta (va bene sulla ruota). La macchina non si muove: è il punto.

### 8. Lo scippo alla rovescia — `scippo_alla_rovescia`

**Quando e dove**: giorno, al mercato. Ore 8.5–13.5. Posto: mercato, banco_pesce, fila (soft).  
**Tipo**: crimine andato male  
**Ruoli**: `a` la vecchia con la borsa (filtro old|f); `b` lo scippatore (filtro young|m)

- _La vecchia con la borsa ha in mano: borsa. Lo scippatore va verso la vecchia con la borsa. Lo scippatore raccoglie. Lo scippatore ha in mano: borsa._
- **la vecchia con la borsa**: «Ah sì? Ah sì?!» oppure «A me? A me?!»
- _la vecchia con la borsa insegue lo scippatore._
   - se lo prende:
      - **la vecchia con la borsa**: «Vent'anni di mercato con questa borsa. Pesa, eh?»
      - **lo scippatore**: «Signora, ma che c'è dentro?!»
      - **la vecchia con la borsa**: «Tre chili di ceci e mio marito. In foto.»
      - **la vecchia con la borsa**: «Adesso me la porti fino a casa. Terzo piano.»
      - **lo scippatore**: «...senza ascensore?»
      - **la vecchia con la borsa**: «Corri tanto, no?»
      - _La vecchia con la borsa va via. Lo scippatore segue la vecchia con la borsa._
   - se lo perde:
      - **la vecchia con la borsa**: «Vai, vai! Ci sono le bollette! Pagale!» oppure «Corri! Tanto ti conosco. Sei il figlio della Pina!»

**Nota**: La vecchia è più veloce del ladro (la borsa pesa). Se lo prende, lui le porta la spesa: escono insieme di scena.

### 9. Davanti il Garante, dietro le cozze — `davanti_il_garante`

**Quando e dove**: giorno, alla pensilina o in piazza. Ore 10–17. Posto: pensilina, angolo, edicola (soft).  
**Tipo**: lavoro assurdo  
**Ruoli**: `a` l'uomo-cartello (filtro old|m); `b` un passante (filtro any)

- _L'uomo-cartello ha in mano: cartello. L'uomo-cartello gironzola._
- **l'uomo-cartello**: «Stasera alle venti parla il Garante! Non mancate!» oppure «Alle venti! Il Garante! Posti in piedi!»
- _Un passante va verso l'uomo-cartello._
- **un passante**: «Ma lei non è quello delle cozze di ieri?»
- **l'uomo-cartello**: «Ieri le cozze. Oggi il Garante. Il cartello è lo stesso.»
- **l'uomo-cartello**: «A mezzogiorno lo giro. Davanti il Garante, dietro le cozze.»
- **un passante**: «E chi paga meglio?»
- **l'uomo-cartello**: «Le cozze. Il Garante paga in rispetto. Non si mangia.»
- _L'uomo-cartello guarda attorno, circospetto._
- **l'uomo-cartello**: «Cozze fresche al Molo! Più fresche del discorso!»
- **un passante**: «Ssh! Non lo dica forte.»
- **l'uomo-cartello**: «Il discorso è registrato. Le cozze no.»

**Nota**: L'uomo col cartello lo gira a metà scena [NUOVO: il cartello con due facce; oggi basta il cartello].

### 10. Il censimento dei gabbiani — `censimento_gabbiani`

**Quando e dove**: giorno, sulla calata o sul lungomare. Ore 9–16.5. Posto: calata, panchina (soft).  
**Tipo**: lavoro assurdo, Tutela  
**Ruoli**: `a` il censore dei gabbiani (filtro old|m); `b` il ragazzo curioso (filtro young)

- _Il censore dei gabbiani ha in mano: carta. Il censore dei gabbiani legge/scrive. Il censore dei gabbiani guarda via._
- **il censore dei gabbiani**: «Trecentododici. Trecentotredici.»
- _Il ragazzo curioso va verso il censore dei gabbiani._
- **il ragazzo curioso**: «Che conti, zio?»
- **il censore dei gabbiani**: «Gabbiani. Censimento della Tutela. Tutto ciò che vola si registra.»
- **il ragazzo curioso**: «E se uno si sposta?»
- **il censore dei gabbiani**: «Lo conto due volte e lo multo.»
- _Il censore dei gabbiani indica._
- **il censore dei gabbiani**: «Quello vola storto. Scrivo: atteggiamento.»
- **il ragazzo curioso**: «Zio, è un piccione.»
- **il censore dei gabbiani**: «Peggio. Un piccione che si finge gabbiano.»
- _Il censore dei gabbiani legge/scrive._
- **il ragazzo curioso**: «Quanto ti pagano?»
- **il censore dei gabbiani**: «Un tanto a gabbiano. Per questo amo il giovedì.»
- **il ragazzo curioso**: «Perché il giovedì?»
- **il censore dei gabbiani**: «Arriva la nave. I gabbiani seguono l'Impero. Come tutti.»

**Nota**: Scena da fermi, a due. Se i gabbiani di animali.js sono vicini, a li guarda (look at gabbiano: [NUOVO], oggi guarda via).

### 11. La multa al defunto — `multa_al_defunto`

**Quando e dove**: giorno, accanto a un'auto parcheggiata. Ore 8.5–13. Posto: sosta (soft).  
**Tipo**: Grigi  
**Ruoli**: `a` il Grigio con il blocchetto (filtro cop); `b` la vedova (filtro old|f)

- _Il Grigio con il blocchetto prende posto. Il Grigio con il blocchetto ha in mano: carta. Il Grigio con il blocchetto legge/scrive._
- **il Grigio con il blocchetto**: «Sosta oltre il disco orario. Trentamila.»
- _La vedova va verso il Grigio con il blocchetto._
- **la vedova**: «Agente, la macchina era di mio marito. È morto a settembre.»
- **il Grigio con il blocchetto**: «Condoglianze. Il proprietario si presenti in caserma.»
- **la vedova**: «Sta al cimitero. Terza fila.»
- **il Grigio con il blocchetto**: «Allora il domicilio è il cimitero. Notifico lì.»
- **la vedova**: «E se non viene?»
- **il Grigio con il blocchetto**: «Scatta la mora. I morti la pagano doppia: hanno tempo.»
- **la vedova**: «Me la dia. Gliela porto io. Gliela metto sulla tomba.»
- **il Grigio con il blocchetto**: «Sul marmo non si affigge. Ci vuole il modulo.»
- _La vedova: rabbia._
- **la vedova**: «Vaffanculo, a lei e al modulo.»
- **il Grigio con il blocchetto**: «Questo è oltraggio. Ma per l'oltraggio il modulo è finito.»
- _Il Grigio con il blocchetto aspetta._

**Nota**: Due ruoli, da fermi. Il vaffanculo della vedova non ha conseguenze: è il punto (non c'è il modulo).

### 12. Come si scrive Nino — `come_si_scrive_nino`

**Quando e dove**: giorno o sera, vicino a una porta della città. Ore 8–22. Posto: porta_della_citta, angolo (soft). **Viene da te.**  
**Tipo**: Grigi, scelta  
**Ruoli**: `a` il Grigio che non sa scrivere (filtro cop)

- _Il Grigio che non sa scrivere va verso NINO (tu). Il Grigio che non sa scrivere guarda NINO (tu). Il Grigio che non sa scrivere ha in mano: carta. Il Grigio che non sa scrivere indica._
- **il Grigio che non sa scrivere**: «Lei. Fermo. Nome.»
- _Il Grigio che non sa scrivere legge/scrive._
- **[NUOVO] SCELTA** (10 s; se non scegli: «Nino») — **il Grigio che non sa scrivere**: «Il nome. Non ho tutto il giorno.»
   1. **Nino**
      - **il Grigio che non sa scrivere**: «Nino come? Con quante enne?»
      - **NINO (tu)** [NUOVO]: «Due.»
      - **il Grigio che non sa scrivere**: «Due. No, tre. Scrivo N e poi vediamo.»
      - **il Grigio che non sa scrivere**: «Ecco. Adesso lei esiste. Complimenti.»
      - _[NUOVO] Il Grigio che non sa scrivere si ricorda di te (-1, «schedato»). [NUOVO] Reputazione grigi -1._
   2. **Gennaro Lanterna**
      - **il Grigio che non sa scrivere**: «Lanterna... Lanterna. Ah, il cognato di Ferri!»
      - **il Grigio che non sa scrivere**: «Passi, passi. Saluti a sua sorella.»
      - _a caso (50%):_
         - **il Grigio che non sa scrivere**: «...un momento. Ferri non ha sorelle.»
         - **il Grigio che non sa scrivere**: «Fermo, Lanterna! Fermo!»
         - [NUOVO] _il Grigio che non sa scrivere insegue TE._
            - se ti prende:
               - **il Grigio che non sa scrivere**: «Lanterna un cazzo. Documenti.»
               - _[NUOVO] Il Grigio che non sa scrivere si ricorda di te (-2, «il bugiardo»)._
            - se ti perde:
               - **il Grigio che non sa scrivere**: «Centrale, cerco un Lanterna. No. Spento.»
      - _altrimenti:_
         - **il Grigio che non sa scrivere**: «Bella famiglia, i Lanterna.»
   3. **Il nome del Garante**
      - **il Grigio che non sa scrivere**: «...Signore. Non l'avevo riconosciuta.»
      - _Il Grigio che non sa scrivere saluta._
      - **il Grigio che non sa scrivere**: «Di persona è più... basso.»
      - **il Grigio che non sa scrivere**: «Posso dirle che mia madre la ama?»
      - _a caso (50%):_
         - **il Grigio che non sa scrivere**: «Un momento. Il Garante ha i baffi.»
         - [NUOVO] _il Grigio che non sa scrivere insegue TE._
            - se ti prende:
               - **il Grigio che non sa scrivere**: «Oltraggio al ritratto vivente. Vieni.»
               - _[NUOVO] Reputazione grigi -2._
            - se ti perde:
               - **il Grigio che non sa scrivere**: «Centrale... no, niente. Mi sono sbagliato.»
      - _altrimenti:_
         - **il Grigio che non sa scrivere**: «Vada, Eccellenza. Non ci siamo visti.»
         - _[NUOVO] Il Grigio che non sa scrivere si ricorda di te (+1, «il Garante»). [NUOVO] Reputazione ragazzi +1._
- _Il Grigio che non sa scrivere se ne va._

**Nota**: SCELTA. Nome vero: schedato (rep grigi -1). Nome falso o il Garante: al 50% ci casca, se no ti insegue (hunt).

### 13. La macchina restituita — `la_cugina`

**Quando e dove**: giorno, accanto a un'auto parcheggiata. Ore 10–19. Posto: sosta (soft).  
**Tipo**: Famiglia  
**Ruoli**: `a` l'uomo della Famiglia (filtro adult|m); `b` il ragazzo con l'occhio nero (filtro young|m); `c` la signora derubata (filtro old|f)

- _Il ragazzo con l'occhio nero: ferito. L'uomo della Famiglia va verso la signora derubata; il ragazzo con l'occhio nero segue l'uomo della Famiglia (insieme). La signora derubata guarda l'uomo della Famiglia._
- **l'uomo della Famiglia**: «Signora, buongiorno. La sua Cinquecento.»
- **la signora derubata**: «Me l'hanno rubata ieri!»
- **l'uomo della Famiglia**: «Lo sappiamo. Il ragazzo è nuovo.»
- **l'uomo della Famiglia**: «Chiedi scusa alla signora.»
- **il ragazzo con l'occhio nero**: «Scusi, signora. Non sapevo che lei era la cugina.»
- **la signora derubata**: «Cugina di chi?»
- **l'uomo della Famiglia**: «Lasci stare. Lei è cugina. Da oggi.»
- **l'uomo della Famiglia**: «Le abbiamo fatto il pieno. E lavata. Il ragazzo, con la lingua.»
- **il ragazzo con l'occhio nero**: «Non è vero.»
- **l'uomo della Famiglia**: «Lo sarà.»
- _La signora derubata gesticola._
- **la signora derubata**: «Ma io non voglio essere cugina di nessuno!»
- **l'uomo della Famiglia**: «Nessuno vuole, signora. Succede.»
- **l'uomo della Famiglia**: «Il primo del mese passiamo per gli auguri.»
- **la signora derubata**: «Quali auguri?»
- **l'uomo della Famiglia**: «Quelli che si pagano.»
- _L'uomo della Famiglia se ne va; il ragazzo con l'occhio nero se ne va (insieme)._
- **la signora derubata**: «Almeno lasciate le chiavi!»

**Nota**: Il ragazzo ha il mood «ferito». La signora da oggi «è cugina»: [NUOVO] potrebbe entrare nella lista di chi la Famiglia protegge.

### 14. La classifica dei Grigi — `classifica_dei_grigi`

**Quando e dove**: pomeriggio, in periferia (a piedi). Ore 14–19.5. Posto: angolo, lotto_vuoto, panchina (soft).  
**Tipo**: ragazzi, camminata  
**Ruoli**: `a` il primo, che fa le classifiche (filtro young); `b` il secondo (filtro young); `c` il terzo (filtro young)

- _Il secondo va verso il primo; il terzo va verso il primo (insieme). Il primo va via; il secondo segue il primo; il terzo segue il secondo (insieme)._
- **il primo**: «Classifica. Il Grigio più scemo del quartiere. Vai.»
- **il secondo**: «Quello della fontana. Ha multato la fontana.»
- **il terzo**: «Secondo. Primo quello che saluta i manifesti.»
- **il primo**: «Saluta il Garante sul muro. Quando piove gli tiene l'ombrello.»
- **il secondo**: «Quindi è innamorato.»
- **il terzo**: «Fra, sono tutti innamorati. Si chiama Tutela.»
- _[NUOVO] Un'Alfetta dei Grigi passa piano e se ne va. Il primo guarda attorno, circospetto. Il secondo guarda attorno, circospetto. Il terzo guarda attorno, circospetto._
- **il terzo**: «...»
- **il secondo**: «Visto? Niente.»
- **il primo**: «Ultimo posto?»
- **il secondo**: «Ferri. Ferri non è scemo. Ferri è stanco.»
- **il terzo**: «Ferri ha preso la mazzetta da mio zio. Gli ha dato il resto.»
- **il primo**: «Un Grigio onesto. Fuori classifica.»
- **il secondo**: «Mettilo in un museo.»
- **il terzo**: «Sotto vetro. Che non si sporchi.»
- _Il primo va via; il secondo segue il primo; il terzo segue il secondo (insieme)._

**Nota**: Camminata e parlata: a va lontano piano, b e c lo seguono. La ronda che passa [NUOVO] fa il silenzio; senza, resta l'attesa.

### 15. Il pallone dei Grigi — `pallone_in_caserma`

**Quando e dove**: pomeriggio, sotto il muro della caserma. Ore 14–18.5. Posto: caserma [NUOVO], lotto_vuoto, angolo (soft). **Viene da te.**  
**Tipo**: ragazzi, Grigi, scelta  
**Ruoli**: `a` quello che ha tirato (filtro young); `b` quello col fascicolo (filtro young); `c` il piantone (filtro cop)

- _Quello che ha tirato ha in mano: pallone. Quello che ha tirato tira un calcio._
- **quello che ha tirato**: «Gooool! ...Oh, no.»
- **quello col fascicolo**: «Fra. È finito dentro la caserma.»
- **quello che ha tirato**: «Vai tu.»
- **quello col fascicolo**: «Io ho già un fascicolo. Vai tu.»
- **quello che ha tirato**: «Io ho la faccia che piace ai cani.»
- _Quello che ha tirato guarda NINO (tu); quello col fascicolo va verso NINO (tu) (insieme)._
- **quello col fascicolo**: «Oi, tu. Faccia pulita. Ci vai tu a chiedere il pallone?»
- **[NUOVO] SCELTA** (12 s; se non scegli: «Arrangiatevi») — **quello col fascicolo**: «Dai, che è l'unico che abbiamo.»
   1. **Vai a chiedere**
      - _[NUOVO] Tu vai da il piantone. Il piantone guarda NINO (tu)._
      - **il piantone**: «Un pallone? Compili la richiesta di restituzione corpo estraneo.»
      - **il piantone**: «Cinque giorni. Lo riavrete sgonfio. Per sicurezza.»
      - **quello che ha tirato**: «Almeno ci hai provato. Sei dei nostri, oggi.»
      - _[NUOVO] Reputazione ragazzi +1. [NUOVO] Il piantone si ricorda di te (-1, «il pallone»)._
   2. **Scavalca il muro**
      - **quello che ha tirato**: «Vai! Vai! Il pallone!»
      - **il piantone**: «Alt! Intrusione! Chi va là?»
      - [NUOVO] _il piantone insegue TE._
         - se ti prende:
            - **il piantone**: «Il muro della Tutela non si scavalca. Si aggira.»
            - _[NUOVO] Reputazione grigi -1._
         - se ti perde:
            - **quello col fascicolo**: «Lascia il pallone! Corri! Lascia stare il pallone!»
      - _[NUOVO] Reputazione ragazzi +2._
   3. **Arrangiatevi**
      - **quello che ha tirato**: «Sbirro.»
      - **quello col fascicolo**: «Sbirro e pure brutto.»
      - _[NUOVO] Quello che ha tirato si ricorda di te (-1, «sbirro»). [NUOVO] Reputazione ragazzi -1._
- _Quello che ha tirato se ne va; quello col fascicolo se ne va (insieme)._

**Nota**: SCELTA. Chiedi: i ragazzi ti rispettano (+1). Scavalchi: il piantone ti insegue, ragazzi +2. Rifiuti: «sbirro» per un giorno.

### 16. Il battesimo con la busta — `battesimo_con_busta`

**Quando e dove**: domenica mattina, sul sagrato di San Rocco. Ore 10–12.5 · giorni dom. Posto: sagrato.  
**Tipo**: Famiglia, rito, folla  
**Ruoli**: `a` il padrino (Famiglia) (filtro adult|m); `b` il prete (filtro prete|old [NUOVO]); `c` la madre col bambino (filtro f)

- _Il prete prende posto; il padrino prende posto; la madre col bambino prende posto (insieme). Si forma un capannello di 6 (aspetta)._
- **il prete**: «Il padrino rinuncia al male?»
- **il padrino**: «Rinuncio. Abbiamo chiuso i conti l'anno scorso.»
- **il prete**: «E alle sue opere?»
- **il padrino**: «Dipende dalle opere.»
- **la folla**: «Bello, il bambino.» oppure «Somiglia al padre.» oppure «Quale dei due?»
- _Il padrino ha in mano: pacchetto. Il padrino porge. Il prete ha in mano: pacchetto._
- **il padrino**: «Per la chiesa, padre. Per il tetto.»
- **il prete**: «Il tetto non perde.»
- **il padrino**: «Per adesso.»
- **la madre col bambino**: «Come lo chiamiamo, alla fine?»
- **il padrino**: «Come il nonno.»
- **la madre col bambino**: «Il nonno è latitante.»
- **il padrino**: «Allora non si chiama. Viene lui, quando vuole.»
- **la folla**: «Ci sono i confetti?» oppure «Il rinfresco è al Flipper.» oppure «In chiesa e poi al Flipper?»
- **la folla**: «Dove si battezza, si ricicla.» oppure «Zitto, che ti sentono.»
- **il prete**: «Andate in pace.»
- **il padrino**: «Andiamo, padre. E lei stia in pace pure lei.»

**Nota**: Folla di 6. La busta passa al prete (hand pacchetto). Filtro «prete» [NUOVO]; senza, un vecchio qualsiasi fa il prete.

### 17. Lo sposo corre — `sposo_in_fuga`

**Quando e dove**: sabato a mezzogiorno, sul sagrato. Ore 11–13.5 · giorni sab. Posto: sagrato. **Viene da te.**  
**Tipo**: matrimonio, folla, scelta, inseguimento  
**Ruoli**: `a` lo sposo (filtro young|m); `b` la sposa (filtro f); `c` il padre della sposa (filtro old|m)

- _La sposa prende posto; lo sposo prende posto; il padre della sposa prende posto (insieme). Si forma un capannello di 6. La folla allarga le braccia._
- **la folla**: «Viva gli sposi!» oppure «Il riso! Tirate il riso!» oppure «Si vede già, eh. Si vede.»
- _Lo sposo guarda attorno, circospetto._
- **lo sposo**: «Scusate. Prendo una cosa in macchina.»
- **la sposa**: «Quale macchina? Non ce l'hai, la macchina.»
- _Lo sposo va verso NINO (tu) di corsa._
- **il padre della sposa**: «Fermatelo! È mio genero! Lo pago io il pranzo!»
- **[NUOVO] SCELTA** (6 s; se non scegli: «Lascialo passare») — **lo sposo**: «Spostati! Spostati, ti prego!»
   1. **Sgambetto**
      - _Lo sposo cade. Il padre della sposa va verso lo sposo._
      - **il padre della sposa**: «Bravo! Tu vieni al pranzo. Primo tavolo.»
      - **lo sposo**: «Traditore. Ti credevo un uomo libero.»
      - **la sposa**: «Amore, sei caduto! Vedi che è destino?»
      - _Lo sposo si rialza. Lo sposo segue il padre della sposa. [NUOVO] Il padre della sposa si ricorda di te (+2, «lo sgambetto»). [NUOVO] Lo sposo si ricorda di te (-2, «lo sgambetto»)._
   2. **Lascialo passare**
      - _il padre della sposa insegue lo sposo._
         - se lo prende:
            - **il padre della sposa**: «Dove vai? La dote l'abbiamo già spesa!»
         - se lo perde:
            - **il padre della sposa**: «Torna! La dote l'abbiamo già spesa!»
            - **la sposa**: «Lascialo, papà. Torna. Ha lasciato il motorino da noi.»
   3. **Scappa con lui**
      - **lo sposo**: «Fratello! Al porto! C'è una nave!»
      - **lo sposo**: «Non quella dell'Impero! Un'altra! Qualsiasi!»
      - _Lo sposo se ne va di corsa._
      - [NUOVO] _il padre della sposa insegue TE._
         - se ti prende:
            - **il padre della sposa**: «Tu! Tu paghi il pranzo, allora! Centoventi coperti!»
            - _[NUOVO] Soldi -20 mila._
         - se ti perde:
            - **il padre della sposa**: «Ti ho visto in faccia! Il quartiere è piccolo!»
      - _[NUOVO] Il padre della sposa si ricorda di te (-2, «il complice»). [NUOVO] Lo sposo si ricorda di te (+2, «il fratello»)._
- **la folla**: «Il riso! Chi lo ripulisce, adesso?» oppure «Il più bel matrimonio dell'anno.»

**Nota**: SCELTA + inseguimento. Sgambetto: il suocero ti vuole al pranzo (+2). Scappi con lo sposo: il suocero ti insegue (hunt).

### 18. Il santo e il ritratto — `santo_e_ritratto`

**Quando e dove**: domenica pomeriggio, dal sagrato verso la piazza. Ore 16.5–19 · giorni dom. Posto: sagrato, parata (soft).  
**Tipo**: processione, folla, Grigi  
**Ruoli**: `a` il primo portatore (filtro adult|m); `b` il secondo portatore (filtro adult|m); `c` il prete (filtro prete|old [NUOVO]); `d` il Grigio del cerimoniale (filtro cop)

- _Il prete prende posto; il primo portatore prende posto; il secondo portatore prende posto (insieme). Il primo portatore ha in mano: cassa. Il secondo portatore ha in mano: cassa. Si forma un capannello di 7 (prega)._
- **la folla**: «Viva San Rocco!» oppure «Quest'anno il santo è dimagrito.» oppure «San Rocco, pensaci tu.»
- _Il Grigio del cerimoniale va verso il prete._
- **il Grigio del cerimoniale**: «Disposizione della Tutela: il ritratto del Garante va davanti.»
- **il prete**: «Davanti? Al santo?»
- **il Grigio del cerimoniale**: «Accanto, va bene. Ma più in alto.»
- _Il prete va via; il primo portatore segue il prete; il secondo portatore segue il primo portatore; il Grigio del cerimoniale segue il secondo portatore (insieme)._
- **il primo portatore**: «Il santo pesa ottanta chili. Il Garante quanto pesa?»
- **il secondo portatore**: «Il Garante pesa sempre.»
- **il primo portatore**: «Chi l'ha messo storto, il Garante?»
- **il secondo portatore**: «Si è girato a guardare il santo. Per invidia.»
- **la folla**: «San Rocco, facci la grazia!» oppure «Quale grazia?» oppure «Quella che sai tu. Ma piano, che sente.»
- **il Grigio del cerimoniale**: «Silenzio! Le grazie senza autorizzazione no.»
- **il prete**: «Agente, la processione serve a chiederle.»
- **il Grigio del cerimoniale**: «Allora in fila. Una alla volta. Con il nome.»
- **la folla**: «...» oppure «Io allora niente grazia.» oppure «La chiedo a casa, sotto voce.»

**Nota**: Folla di 7 che segue. La statua e il ritratto in spalla [NUOVO: oggetti a quattro mani]; oggi i portatori con «regge» (cassa).

## Sera (e i pezzi rivolti a te)

### 19. Il ladro senza spinta — `spingi_la_vespa`

**Quando e dove**: sera, all'angolo. Ore 18–23.5. Posto: angolo, sosta (soft). **Viene da te.**  
**Tipo**: crimine andato male, scelta  
**Ruoli**: `a` il ladro di Vespe (filtro young|m); `b` il padrone della Vespa (filtro adult|m)

- _Una Vespa in doppia fila. Il ladro di Vespe va verso il mezzo. Il ladro di Vespe armeggia._
- **il ladro di Vespe**: «Dai, bella. Dai. Non mi fare questo.»
- _Il ladro di Vespe guarda NINO (tu)._
- **il ladro di Vespe**: «Oi. Tu. Mi dai una spinta? S'è ingolfata.»
- **[NUOVO] SCELTA** (10 s; se non scegli: «Tira dritto») — **il ladro di Vespe**: «Due secondi, fra. Giuro che è mia.»
   1. **Spingi**
      - **il ladro di Vespe**: «Vai! Vai che va! Ti voglio bene!»
      - _Il ladro di Vespe se ne va di corsa. Il padrone della Vespa va verso il punto della scena._
      - **il padrone della Vespa**: «La mia Vespa! E tu? Il complice!»
      - [NUOVO] _il padrone della Vespa insegue TE._
         - se ti prende:
            - **il padrone della Vespa**: «Adesso mi riporti la Vespa. A spinta.»
         - se ti perde:
            - **il padrone della Vespa**: «Ti trovo! Ho la tua faccia in testa!»
      - _[NUOVO] Il padrone della Vespa si ricorda di te (-2, «il complice»). [NUOVO] Il ladro di Vespe si ricorda di te (+1, «la spinta»)._
   2. **Grida «al ladro!»**
      - **NINO (tu)** [NUOVO]: «Al ladro! Al ladro!»
      - **il ladro di Vespe**: «Infame. Ma bella faccia, eh.»
      - _Il ladro di Vespe se ne va di corsa. Il padrone della Vespa va verso NINO (tu)._
      - **il padrone della Vespa**: «Grazie. Tieni, mille lire. Non è molto, è una Vespa.»
      - _[NUOVO] Soldi +1 mila. [NUOVO] Il padrone della Vespa si ricorda di te (+1, «l'onesto»). [NUOVO] Reputazione ragazzi -1._
   3. **Tira dritto**
      - **il ladro di Vespe**: «Grazie, eh. Spingo da solo.»
      - _Il ladro di Vespe spinge con forza. Il padrone della Vespa va verso il ladro di Vespe._
      - **il padrone della Vespa**: «Ma che fai, la spingi?»
      - **il ladro di Vespe**: «La porto dal meccanico. Servizio a domicilio.»
      - **il padrone della Vespa**: «Ah. Grazie.»
      - **il padrone della Vespa**: «...Aspetta. Io non ho chiamato nessun meccanico.»
      - _il padrone della Vespa insegue il ladro di Vespe._
         - se lo prende:
            - **il padrone della Vespa**: «Meccanico, eh? Ti aggiusto io.»
            - _Rissa: il padrone della Vespa contro il ladro di Vespe._
         - se lo perde:
            - **il padrone della Vespa**: «Ladro! E pure educato! Il peggio!»

**Nota**: SCELTA. Spingi: il padrone ti insegue e ti ricorda (-2). Chiami: mille lire, i ragazzi ti chiamano infame. Tiri dritto: inseguimento fra loro.

### 20. Mani in alto, è una banana — `rapina_alla_banana`

**Quando e dove**: sera, davanti al tabacchi. Ore 18–21.5. Posto: vetrina, edicola (soft).  
**Tipo**: crimine andato male  
**Ruoli**: `a` il tabaccaio (filtro shop|adult); `b` il rapinatore (filtro young|m)

- _Il tabaccaio prende posto; il rapinatore prende posto (insieme). Il rapinatore guarda attorno, circospetto. Il rapinatore mano in tasca, minacciosa._
- **il rapinatore**: «Fermo! È una rapina! Sono armato!»
- **il tabaccaio**: «Quella è una banana, {b}.»
- **il rapinatore**: «È un'arma a forma di banana.»
- **il tabaccaio**: «Tua madre ieri ha pagato il conto. Le sigarette del mese.»
- **il rapinatore**: «...ah, sì?»
- **il tabaccaio**: «E m'ha detto: a mio figlio non vendergli più niente.»
- **il rapinatore**: «Allora è una rapina giusta. Dammi le sigarette.»
- _Il tabaccaio porge. Il rapinatore ha in mano: pacchetto._
- **il tabaccaio**: «Prendi le Nazionali e sparisci. E saluta tua madre.»
- **il rapinatore**: «Te la saluto. Ma non ci provare.»
- _Il rapinatore se ne va. Il rapinatore mangia._
- **il rapinatore**: «Comunque è buona.»

**Nota**: Due ruoli. Il tabaccaio dà comunque un pacchetto al ragazzo (pay 1 al contrario: il ragazzo non paga).

### 21. Il bacio sbagliato — `la_mano_sbagliata`

**Quando e dove**: sera, al dehors del bar. Ore 19–23.5. Posto: dehors.  
**Tipo**: Famiglia, rito  
**Ruoli**: `a` il fidato, seduto (filtro old|m); `b` lo zio (filtro adult|m); `c` il nipote emozionato (filtro young|m); `d` il barista (filtro shop|any)

- _Il fidato prende posto. Il fidato si siede. Il barista prende posto. Lo zio va verso il fidato; il nipote emozionato segue lo zio (insieme)._
- **lo zio**: «Dottore, le presento mio nipote. Bravo ragazzo. Muto.»
- _Il nipote emozionato va verso il barista. Il nipote emozionato porge._
- **il nipote emozionato**: «Baciamo le mani.»
- **il barista**: «...il caffè glielo porto lo stesso.»
- **lo zio**: «Non lui, deficiente! Lui fa i caffè!»
- **il nipote emozionato**: «Zio, uno che fa i caffè qua dentro conta.»
- **il fidato**: «Il ragazzo ha capito tutto. Il barista sa più di me.»
- _Il nipote emozionato va verso il fidato. Il nipote emozionato porge._
- **il nipote emozionato**: «Baciamo le mani, dottore.»
- **il fidato**: «Una basta. Che poi si consuma.»
- **il barista**: «Allora? Tre caffè?»
- **il fidato**: «Quattro. Uno al ragazzo, che si è emozionato.»
- _Il fidato paga 1 mila a il barista._

**Nota**: Quattro ruoli, nessuna conseguenza. Il fidato paga i caffè (pay a→d 1).

### 22. L'applauso di Stato — `applauso_di_stato`

**Quando e dove**: sera, poco prima delle 20, al bar. Ore 19.3–20.2. Posto: bar_tv [NUOVO], dehors (soft). **Viene da te.**  
**Tipo**: lavoro assurdo, stand-up, scelta  
**Ruoli**: `a` l'applauditore di mestiere (filtro adult|m)

- _L'applauditore di mestiere va verso NINO (tu). L'applauditore di mestiere guarda NINO (tu)._
- **l'applauditore di mestiere**: «Oi. Tu che fai alle otto? Niente? Perfetto.»
- **l'applauditore di mestiere**: «Io applaudo il Garante. Al bar. Di mestiere. Tremila a discorso.»
- **l'applauditore di mestiere**: «Se batto io, battono tutti. Se no la Zia segna chi non batte.»
- **l'applauditore di mestiere**: «Stasera ho la cresima di mia figlia. Mi fai il turno?»
- **[NUOVO] SCELTA** (12 s; se non scegli: «Vergognati») — **l'applauditore di mestiere**: «Facile: batti e annuisci.»
   1. **Faccio il turno**
      - **l'applauditore di mestiere**: «Bravo. Alla parola «ordine» batti più forte.»
      - **l'applauditore di mestiere**: «Alla parola «carezza», ti commuovi.»
      - _[NUOVO] Soldi +3 mila. [NUOVO] Lo schermo col Garante si accende. [NUOVO] L'applauditore di mestiere si ricorda di te (+1, «il turno»)._
   2. **Voglio di più**
      - **l'applauditore di mestiere**: «Cinquemila? Ma sei un artista o un sindacato?»
      - **l'applauditore di mestiere**: «Va bene. Quattro. Se ti scappa una lacrima, cinque.»
      - _[NUOVO] Soldi +4 mila. [NUOVO] Lo schermo col Garante si accende. [NUOVO] L'applauditore di mestiere si ricorda di te (+1, «il tirchio»)._
   3. **Vergognati**
      - **l'applauditore di mestiere**: «Vergognarmi? Io pago l'affitto con le mani. E tu?»
      - **l'applauditore di mestiere**: «Con la morale? Fammi sapere quanto rende.»
      - _[NUOVO] L'applauditore di mestiere si ricorda di te (-1, «il moralista»)._
- _L'applauditore di mestiere se ne va._

**Nota**: SCELTA. Turno: +3 (o +5 se tratti). Lo mandi a quel paese: ti ricorda (-1). Lo schermo del bar [NUOVO] si accende alle 20.

### 23. La fila al telefono — `una_cabina_sola`

**Quando e dove**: sera, alla cabina (o all'edicola). Ore 18–22.5. Posto: cabina [NUOVO], edicola, portone (soft).  
**Tipo**: lite pubblica, folla  
**Ruoli**: `a` l'uomo al telefono (filtro adult|m); `b` la signora in fila (filtro f); `c` il vecchio in fila (filtro old)

- _L'uomo al telefono prende posto. La signora in fila prende posto; il vecchio in fila prende posto (insieme). L'uomo al telefono al telefono._
- **l'uomo al telefono**: «...no, amore, sono al lavoro. ...Sì, alle sette di sera.»
- **l'uomo al telefono**: «...il porto chiude tardi. ...Tardissimo. Tipo domani.»
- _La signora in fila guarda l'orologio._
- **la signora in fila**: «Sono venti minuti! Ho mia madre all'ospedale!»
- **l'uomo al telefono**: «Un attimo! ...No, non a te, amore. A una signora.»
- **l'uomo al telefono**: «...certo che ti penso. ...Mia moglie? Non lo sa usare, il telefono.»
- **il vecchio in fila**: «Io sua moglie la conosco. Il telefono lo usa benissimo.»
- **il vecchio in fila**: «Mi chiama tutti i giorni.»
- _Si forma un capannello di 4._
- **la folla**: «Ohhh!» oppure «Mettila in viva voce!» oppure «Io sono qui per lo stesso numero, credo.»
- **l'uomo al telefono**: «...ti richiamo. Qui c'è un'assemblea.»
- **l'uomo al telefono**: «Che avete da guardare? Mai visto un uomo innamorato?»
- **la signora in fila**: «Sì. Di solito di una sola.»
- **la folla**: «Ahahah!» oppure «Brava!» oppure «Questa la racconto al bar.»
- _Il vecchio in fila va verso il punto della scena. Il vecchio in fila al telefono._
- **il vecchio in fila**: «...Pronto, Gina? Sono io. Indovina chi ho davanti.»
- _L'uomo al telefono se ne va di corsa._
- **la folla**: «Corri!» oppure «Saluta la moglie!»

**Nota**: Folla di 4 + 3 ruoli. Posto «cabina» [NUOVO]. Il vecchio telefona alla moglie dell'uomo: chiude lui la scena.

### 24. In piedi per il Garante — `in_piedi_per_il_garante`

**Quando e dove**: alle 20, al dehors del bar con lo schermo. Ore 19.9–20.5. Posto: bar_tv [NUOVO], dehors (soft). **Viene da te.**  
**Tipo**: il discorso delle 20, folla, scelta  
**Ruoli**: `a` il barista (filtro shop|adult); `b` il vecchio che non si alza (filtro old|m); `c` la signora che lavora a maglia (un Orecchio) (filtro orecchio|old [NUOVO])

- _[NUOVO] Lo schermo col Garante si accende. Il vecchio che non si alza prende posto; la signora che lavora a maglia prende posto; il barista prende posto (insieme). Il vecchio che non si alza si siede. La signora che lavora a maglia si siede. Si forma un capannello di 5 (si siede)._
- **il barista**: «Sono le otto. In piedi, signori. Il Garante.»
- _La folla aspetta._
- **la folla**: «...in piedi, sì.» oppure «Ogni sera mi si addormenta la gamba proprio adesso.» oppure «Il cappello! Togliti il cappello.»
- _Il vecchio che non si alza: ubriaco._
- **il vecchio che non si alza**: «Io non mi alzo. Mi sono alzato nel '79. Guarda com'è finita.»
- _La signora che lavora a maglia osserva._
- **la signora che lavora a maglia**: «Alzati, figlio mio. Che poi me lo devo ricordare.»
- _Il barista guarda NINO (tu)._
- **il barista**: «E tu? Seduto o in piedi? Decidi, che ci guarda.»
- **[NUOVO] SCELTA** (10 s; se non scegli: «In piedi») — **il barista**: «Decidi.»
   1. **In piedi**
      - **la signora che lavora a maglia**: «Bravo, figlio mio. Bravo.»
      - **il vecchio che non si alza**: «Pecore. Belle pecore in piedi.»
      - _[NUOVO] La signora che lavora a maglia si ricorda di te (+1, «in piedi»)._
   2. **Resta seduto col vecchio**
      - **il vecchio che non si alza**: «Ecco! Un uomo! Offro io!»
      - _La signora che lavora a maglia legge/scrive._
      - **la signora che lavora a maglia**: «Me lo segno, figlio mio. Con affetto.»
      - _[NUOVO] La signora che lavora a maglia si ricorda di te (-2, «seduto»). [NUOVO] Reputazione risacca +1. [NUOVO] Il vecchio che non si alza si ricorda di te (+2, «seduto»)._
   3. **Stacca la spina**
      - _[NUOVO] Lo schermo col Garante si spegne. La folla si siede._
      - **la folla**: «Ah. Che peccato.» oppure «Un guasto! Proprio stasera!» oppure «Che dispiacere. Un altro giro?»
      - **il barista**: «Chi è stato?»
      - **la folla**: «Il guasto.» oppure «Il guasto, sì. È stato il guasto.»
      - _La signora che lavora a maglia guarda NINO (tu)._
      - **la signora che lavora a maglia**: «Io ho visto, figlio mio. Ma ho le gambe stanche.»
      - _[NUOVO] La signora che lavora a maglia si ricorda di te (-1, «la spina»). [NUOVO] Reputazione quartiere +1._
- **il vecchio che non si alza**: «Domani staccatela prima. Dopo c'è il varietà.»

**Nota**: SCELTA. In piedi: l'Orecchio approva. Seduto col vecchio: ti segna (-2, la voce va alla Repressione). Stacchi la spina: tutti sollevati.

### 25. Il pezzo dell'Ape — `pezzo_dell_ape`

**Quando e dove**: giorno, dove un'Ape è in doppia fila. Ore 8–18.5. Posto: sosta, angolo, mercato (soft). **Viene da te.**  
**Tipo**: stand-up rivolto a te  
**Ruoli**: `a` l'uomo dell'Ape (filtro adult|m)

- _Un'Ape in doppia fila. L'uomo dell'Ape va verso NINO (tu). L'uomo dell'Ape guarda NINO (tu). L'uomo dell'Ape indica._
- **l'uomo dell'Ape**: «Oi! Sai quanto fa l'Ape in salita? Ventidue. Mi superano i funerali.»
- **l'uomo dell'Ape**: «Ieri mi ferma un Grigio. Eccesso di lentezza. L'ha scritto lui.»
- **l'uomo dell'Ape**: «Dice: lei intralcia il traffico. Che traffico? Io, lui e un mulo.»
- **l'uomo dell'Ape**: «E il mulo ha la precedenza. Perché è del Comune.»
- _L'uomo dell'Ape allarga le braccia._
- **l'uomo dell'Ape**: «Mia moglie dice che l'Ape mi somiglia. Fa rumore e non arriva.»
- _L'uomo dell'Ape va verso il mezzo._

**Nota**: Pezzo (3-5 battute della stessa persona, la botta in fondo). Nessuna conseguenza.

### 26. La suocera e la Tutela — `pezzo_della_suocera`

**Quando e dove**: giorno, alla fermata. Ore 8–19. Posto: fermata, pensilina, panchina (soft). **Viene da te.**  
**Tipo**: stand-up rivolto a te (benpensante)  
**Ruoli**: `a` il benpensante col cappotto buono (filtro adult|m)

- _Il benpensante col cappotto buono va verso NINO (tu). Il benpensante col cappotto buono guarda NINO (tu)._
- **il benpensante col cappotto buono**: «Lei è sposato? No? Allora non sa cos'è la Tutela.»
- **il benpensante col cappotto buono**: «Mia suocera vive con noi dal '79. Come la Tutela. Stesso anno.»
- **il benpensante col cappotto buono**: «Lei controlla la spesa, la posta, gli orari. Io firmo e sorrido.»
- **il benpensante col cappotto buono**: «Alle otto guarda il Garante e annuisce. Lui annuisce a lei.»
- **il benpensante col cappotto buono**: «Una volta ho detto no. Nell'82. Me lo ricorda a ogni Natale.»
- **il benpensante col cappotto buono**: «Il Garante prima o poi muore. Lei ha ottantanove anni e fa ginnastica.»
- _Il benpensante col cappotto buono se ne va._

**Nota**: Pezzo a te. Nessuna conseguenza.

### 27. Il posto di Franco — `pezzo_del_reduce`

**Quando e dove**: sera, fuori dall'osteria. Ore 19–23.5. Posto: dehors, panchina (soft). **Viene da te.**  
**Tipo**: stand-up rivolto a te (reduce)  
**Ruoli**: `a` il reduce con il bicchiere (filtro old|m)

- _Il reduce con il bicchiere: ubriaco. Il reduce con il bicchiere ha in mano: bottiglia. Il reduce con il bicchiere va verso NINO (tu). Il reduce con il bicchiere guarda NINO (tu)._
- **il reduce con il bicchiere**: «Siediti. No, non lì. Lì si sedeva Franco. Franco non viene più.»
- **il reduce con il bicchiere**: «Tranquillo. Franco è vivo. Ha fatto pace con la moglie.»
- **il reduce con il bicchiere**: «Nel '79 stavamo sui monti. Tre mesi. Fucili del '15 e una fisarmonica.»
- **il reduce con il bicchiere**: «La fisarmonica sparava meglio.»
- _Il reduce con il bicchiere beve._
- **il reduce con il bicchiere**: «Voi ragazzi fate le onde col gesso. Bello. Pulito.»
- **il reduce con il bicchiere**: «Noi i muri li bucavamo. Voi ci scrivete sopra. Si va avanti.»
- **il reduce con il bicchiere**: «Offri tu. Io ho già offerto la giovinezza.»
- _Il reduce con il bicchiere se ne va._

**Nota**: Pezzo amaro e tenero. Se offri (un tasto «offri» potrebbe esserci: [NUOVO]) ti ricorda bene.

## Notte e alba

### 28. La vodka dell'Impero — `vodka_per_terra`

**Quando e dove**: all'alba del lunedì e del giovedì, sulla calata. Ore 5–8 · giorni lun, gio. Posto: calata, carico (soft). **Viene da te.**  
**Tipo**: Famiglia, folla, scelta  
**Ruoli**: `a` il soldato della Famiglia (filtro adult|m); `b` lo scaricatore (filtro m)

- _Un furgone in doppia fila. Il soldato della Famiglia va verso il mezzo. Il soldato della Famiglia ha in mano: cassa. Il soldato della Famiglia va verso il punto della scena. Il soldato della Famiglia cade._
- **il soldato della Famiglia**: «Cazzo. La vodka.»
- _Il soldato della Famiglia si rialza._
- **lo scaricatore**: «Io non ho visto niente. Scarico il niente da vent'anni.»
- _Si forma un capannello di 6 (raccoglie)._
- **la folla**: «È caduta! È di nessuno!» oppure «Vodka dell'Impero! Quella vera!» oppure «Ne prendo una per mia suocera. Per pulire.»
- _Il soldato della Famiglia: rabbia. Il soldato della Famiglia indica._
- **il soldato della Famiglia**: «Giù le mani! È della Famiglia!»
- **la folla**: «Della Famiglia? C'è scritto Impero.» oppure «La famiglia di chi?» oppure «Io sono di famiglia. Ho sei figli.»
- _Il soldato della Famiglia guarda NINO (tu)._
- **il soldato della Famiglia**: «Tu. Tienimi il furgone. Uno fermo mi serve.»
- **[NUOVO] SCELTA** (10 s; se non scegli: «Grida «i Grigi!»») — **il soldato della Famiglia**: «Allora? Ti muovi o no?»
   1. **Tieni il furgone**
      - **il soldato della Famiglia**: «Bravo. Io mi ricordo chi sei. Tu ricordati chi sono io.»
      - _Il soldato della Famiglia allarga le braccia._
      - **il soldato della Famiglia**: «Chi ha preso, ha comprato! Diecimila a bottiglia! Domani passo!»
      - **la folla**: «Domani non ci sono.» oppure «Io sono morto stamattina.» oppure «Passa da mia cognata, è lei che paga.»
      - _[NUOVO] Reputazione famiglia +1. [NUOVO] Il soldato della Famiglia si ricorda di te (+1, «il furgone»)._
   2. **Prendi una bottiglia**
      - _[NUOVO] Ti resta in tasca: vodka._
      - **il soldato della Famiglia**: «Anche tu? Ti ho visto. Hai una faccia che si ricorda.»
      - **lo scaricatore**: «Io pure ne ho presa una. Così siamo pari.»
      - _[NUOVO] Il soldato della Famiglia si ricorda di te (-2, «la vodka»)._
   3. **Grida «i Grigi!»**
      - **NINO (tu)** [NUOVO]: «I Grigi! Arrivano i Grigi!»
      - _La folla se ne va di corsa. Lo scaricatore se ne va di corsa._
      - **il soldato della Famiglia**: «Dove? ...Non c'è nessuno.»
      - **il soldato della Famiglia**: «Simpatico. Ci vediamo, simpatico.»
      - _[NUOVO] Il soldato della Famiglia si ricorda di te (-1, «lo scherzo»). [NUOVO] Reputazione ragazzi +1._

**Nota**: SCELTA, folla di 6 che saccheggia. Tieni il furgone: Famiglia +1. Prendi una bottiglia: vodka in Tasca, lui ti ricorda (-2). «I Grigi!»: tutti scappano.

### 29. Se tu fossi il Garante — `se_tu_fossi_il_garante`

**Quando e dove**: notte, al muretto o all'angolo. Ore 22–3 (dopo mezzanotte). Posto: angolo, panchina, cypher (soft).  
**Tipo**: ragazzi, notte, momento serio  
**Ruoli**: `a` quello delle domande (filtro young); `b` il secondo (filtro young); `c` quello che si fa serio (filtro young); `d` il quarto (filtro young|any)

- _Quello delle domande prende posto; il secondo prende posto; quello che si fa serio prende posto; il quarto prende posto (insieme). Quello delle domande si siede. Il secondo si appoggia. Quello che si fa serio si siede per terra. Il quarto fuma. Il secondo: freddo._
- **quello delle domande**: «Se tu fossi il Garante per un giorno, che fai?»
- **il secondo**: «Spengo la televisione alle otto. Per vedere che faccia fa.»
- **il quarto**: «Io mi dimetto. Poi vado in TV e dico: ciao, scherzavo.»
- **quello delle domande**: «Ti arrestano.»
- **il quarto**: «Chi? Sono io il Garante. Mi arresto e mi do la grazia.»
- **quello delle domande**: «E tu?»
- **quello che si fa serio**: «Io faccio una passeggiata. Da solo. Senza guardie. Per vedere com'è.»
- **quello che si fa serio**: «Mio padre diceva sempre: domani. Domani, domani.»
- **il secondo**: «Pure il mio.»
- **quello delle domande**: «Oi. Chi ha la siga?»
- **il quarto**: «Io ho il drum. Le cartine no.»
- **il secondo**: «Allora sei inutile pure da Garante.»
- **il quarto**: «Fottiti.»
- **quello che si fa serio**: «Fottiti tu. Con affetto.»

**Nota**: Quattro ragazzi. Il momento serio non si commenta e non fa ridere: si riparte con le cazzate. Nessuna conseguenza.

### 30. Il marsigliese al pontile — `pezzo_del_marsigliese`

**Quando e dove**: notte, sulla calata o al pontile. Ore 22–4 (dopo mezzanotte). Posto: calata, carico, angolo (soft). **Viene da te.**  
**Tipo**: stand-up rivolto a te (Marsigliesi)  
**Ruoli**: `a` un marsigliese con la sigaretta (filtro marsigliese|adult [NUOVO])

- _Un marsigliese con la sigaretta va verso NINO (tu). Un marsigliese con la sigaretta guarda NINO (tu). Un marsigliese con la sigaretta fuma._
- **un marsigliese con la sigaretta**: «Toi. Sì, tu. Vieni. Non ti mangio. Ho già cenato. Male.»
- **un marsigliese con la sigaretta**: «Il vostro caffè: una tragedia. Il vostro vino: un incidente.»
- **un marsigliese con la sigaretta**: «La vostra polizia ferma tutti. Me no. Sai perché? Pago in franchi.»
- **un marsigliese con la sigaretta**: «Voi pagate in paura. È una moneta debole, mon ami.»
- **un marsigliese con la sigaretta**: «Bella isola, eh. Fatta bene. Abitata male.»
- **un marsigliese con la sigaretta**: «Ti porto a Marsiglia. Centomila. Solo andata.»
- **un marsigliese con la sigaretta**: «Il ritorno? Il ritorno non lo vuole nessuno.»
- _Un marsigliese con la sigaretta se ne va._

**Nota**: Pezzo a te. Filtro «marsigliese» [NUOVO] (o il cast: marcel). Alla fine un passaggio vero per Marsiglia: [NUOVO] aggancio a una missione.

### 31. L'ultima corsa — `ultima_corsa_dell_autobus`

**Quando e dove**: notte, alla fermata prima dell'Ora Quieta. Ore 21.5–23.5. Posto: fermata, pensilina (soft).  
**Tipo**: folla, notte, Grigi  
**Ruoli**: `a` l'autista (sceso a fumare) (filtro adult|m); `b` l'infermiera del turno di notte (filtro f); `c` il ragazzo senza biglietto (filtro young); `d` il Grigio dell'Ora Quieta (filtro cop)

- _L'autista prende posto; l'infermiera del turno di notte prende posto; il ragazzo senza biglietto prende posto (insieme). Si forma un capannello di 5 (aspetta). L'autista fuma._
- **l'autista**: «Ultima corsa. Chi c'è, c'è. Chi non c'è, dorme qua.»
- **l'infermiera del turno di notte**: «Parta, per favore. Attacco alle dieci, all'ospedale.»
- **l'autista**: «Signora, prima la sigaretta. È il mio sindacato.»
- **la folla**: «Sbrigati, che arriva l'Ora Quieta.» oppure «Io dormo sul 9. L'anno scorso l'ho fatto.» oppure «Il 9 non esiste.»
- **il ragazzo senza biglietto**: «Capo, il biglietto lo pago domani. Giuro sulla Vespa.»
- **l'autista**: «Non hai la Vespa.»
- **il ragazzo senza biglietto**: «Giuro su quella che avrò.»
- _Il Grigio dell'Ora Quieta va verso il punto della scena. Il Grigio dell'Ora Quieta indica._
- **il Grigio dell'Ora Quieta**: «Conto. Uno, due, tre... Siete troppi per un autobus.»
- **l'autista**: «È un autobus. Ci vanno cinquanta persone.»
- **il Grigio dell'Ora Quieta**: «Cinquanta a bordo. A terra il massimo è tre. Assembramento.»
- _a caso (25%):_
   - **il Grigio dell'Ora Quieta**: «Tu, senza biglietto. Con me.»
   - _Il ragazzo senza biglietto alza le mani. Il ragazzo senza biglietto viene portato via (fermo)._
- _altrimenti:_
   - **il Grigio dell'Ora Quieta**: «Salite. Tutti. Subito. E zitti fino al capolinea.»
- **l'autista**: «Avete sentito il signore. Su. Che c'è il riscaldamento. Rotto.»
- _L'autista va via; l'infermiera del turno di notte va via (insieme)._

**Nota**: Folla di 5 che aspetta di salire. Il Grigio conta chi c'è: al 25% trattiene il ragazzo. L'autobus vero [NUOVO]; oggi l'autista basta.

---

## Le cinque battute migliori
1. «Dove si battezza, si ricicla.» (la folla, *Il battesimo con la busta*)
2. «Il Garante pesa sempre.» (il portatore, *Il santo e il ritratto*)
3. «Scatta la mora. I morti la pagano doppia: hanno tempo.» (il Grigio, *La multa al defunto*)
4. «Mia moglie dice che l'Ape mi somiglia. Fa rumore e non arriva.» (*Il pezzo dell'Ape*)
5. «Offri tu. Io ho già offerto la giovinezza.» (il reduce, *Il posto di Franco*)
