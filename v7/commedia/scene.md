# Porto Vecchio — Trentuno scene nuove per la strada (seconda stesura, tarata su TONO.md)

Proposta del reparto commedia, 8 novembre. **Niente è stato toccato nel gioco**: le schede stanno in `scene_dati.js` (stessa cartella),
nel formato SCENE di `eventi.js`, pronte da aggiungere al catalogo come fa `matti.js`. Questo file si rigenera dal JS (copione a macchina).

**La taratura** (`TONO.md`, i voti di Andrea): fuori l'ironia fredda, i paradossi da sportello, gli aforismi, i giochi di parole e il burocrate
stanco; dentro la gente che si sputtana da sola sotto pressione (egoismo, pigrizia, vigliaccheria, vanteria), gli amici che si fregano, le
reazioni urlate a quello che succede adesso. Il test: un quindicenne ride alla prima lettura senza sapere chi sono i Grigi.
Regole di sempre (REGIA_COMMEDIA §2): una voce per fazione, al massimo 70 caratteri a fumetto (controllato a macchina: 533 varianti,
nessuna oltre), parolacce sì, bestemmie no, sesso solo per allusione, niente razza né disabilità, nessuna battuta sui rettificati.
Nessuna scena duplica le 100 di `eventi.js` e `matti.js` (ids controllati) né le cinque di REGIA §3.

**Cosa è cambiato rispetto alla prima stesura.** Tutte le battute riscritte. Cinque scene che reggevano solo come satira fredda sono
state sostituite da scene nuove, fisiche e rumorose (id nuovo): «Il timbro del timbro» → **Il furbo della fila** (`salta_la_fila`);
«Davanti il Garante, dietro le cozze» → **Due cartelli, un angolo** (`due_cartelli`); «Il censimento dei gabbiani» → **Il tuffo dalla
calata** (`il_tuffo`); «La multa al defunto» → **La multa mangiata** (`multa_mangiata`); «L'applauso di Stato» → **Chi paga il giro**
(`chi_paga_il_giro`). Quindici hanno tenuto l'id ma cambiato il motore comico (comitato, arance, campagnola, primo fermo, cugina, coraggioso, pallone,
battesimo, santo, in piedi, Ape, famiglia per bene, reduce, baffi al Garante, marsigliese); undici hanno tenuto premessa e scaletta
con tutte le battute nuove (cravatte, piangitrice, cambiali, scippo, sposo, Vespa, banana, bacio, cabina, vodka, ultima corsa).

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
**30 su 31 partono e arrivano in fondo** (tutte sotto i 90 s). Non arriva in fondo: `arance_sovversive` (non parte). `arance_sovversive` vuole due Grigi di pattuglia vicini, come `pattuglia_notte` che già oggi non sempre parte (era così anche nella prima stesura). Le chiavi [NUOVO] vengono saltate senza errori.

## Indice

| n | titolo | id | quando, dove | tipo | scelta | persone |
|---|---|---|---|---|---|---|
| 1 | Il furbo della fila | `salta_la_fila` | mattina, davanti alla caserma (lo sportello) | lite pubblica, Grigi, folla, inseguimento |  | 9 |
| 2 | Le cravatte dal terzo piano | `cravatte_dal_balcone` | mattina, sotto un condominio (il portone) | lite pubblica, folla |  | 8 |
| 3 | Il comitato del 9 | `comitato_del_nove` | mattina presto, alla fermata | assemblea, folla, Grigi |  | 8 |
| 4 | La piangitrice a ore | `prefica_a_ore` | mattina, sul sagrato di San Rocco | funerale, folla, scelta | sì | 8 |
| 5 | Le arance sequestrate | `arance_sovversive` | mattina, al mercato | Grigi, folla di vecchie, inseguimento |  | 8 |
| 6 | Il meccanico e la campagnola | `campagnola_offesa` | mattina, all'officina dello Scalo | lavoro, Grigi |  |  |
| 7 | Diciotto anni di cambiali | `diciotto_anni_di_cambiali` | giorno, accanto a un'auto parcheggiata | crollo pubblico, folla |  | 7 |
| 8 | Lo scippo alla rovescia | `scippo_alla_rovescia` | giorno, al mercato | crimine andato male |  |  |
| 9 | Due cartelli, un angolo | `due_cartelli` | giorno, alla pensilina o in piazza | lite pubblica, rissa, folla |  | 6 |
| 10 | Il tuffo dalla calata | `il_tuffo` | giorno, sulla calata o sul lungomare | ragazzi, sbruffone, folla |  | 6 |
| 11 | La multa mangiata | `multa_mangiata` | giorno, accanto a un'auto parcheggiata | Grigi, inseguimento |  |  |
| 12 | Il primo fermo | `come_si_scrive_nino` | giorno o sera, vicino a una porta della città | Grigi, scelta | sì |  |
| 13 | La macchina restituita | `la_cugina` | giorno, accanto a un'auto parcheggiata | Famiglia |  |  |
| 14 | Il più coraggioso del quartiere | `classifica_dei_grigi` | pomeriggio, in periferia (a piedi) | ragazzi, camminata |  |  |
| 15 | Il pallone dei Grigi | `pallone_in_caserma` | pomeriggio, sotto il muro della caserma | ragazzi, Grigi, scelta | sì |  |
| 16 | Il battesimo con la busta | `battesimo_con_busta` | domenica mattina, sul sagrato di San Rocco | Famiglia, rito, folla |  | 9 |
| 17 | Lo sposo corre | `sposo_in_fuga` | sabato a mezzogiorno, sul sagrato | matrimonio, folla, scelta, inseguimento | sì | 9 |
| 18 | Il santo e il ritratto | `santo_e_ritratto` | domenica pomeriggio, dal sagrato verso la piazza | processione, folla, Grigi |  | 11 |
| 19 | Il ladro senza spinta | `spingi_la_vespa` | sera, all'angolo | crimine andato male, scelta | sì |  |
| 20 | Mani in alto, è una banana | `rapina_alla_banana` | sera, davanti al tabacchi | crimine andato male |  |  |
| 21 | Il bacio sbagliato | `la_mano_sbagliata` | sera, al dehors del bar | Famiglia, rito |  |  |
| 22 | Chi paga il giro | `chi_paga_il_giro` | sera, al dehors del bar | amici, scelta | sì |  |
| 23 | La fila al telefono | `una_cabina_sola` | sera, alla cabina (o all'edicola) | lite pubblica, folla |  | 7 |
| 24 | In piedi per il Garante | `in_piedi_per_il_garante` | alle 20, al dehors del bar con lo schermo | il discorso delle 20, folla, scelta | sì | 8 |
| 25 | Il pezzo dell'Ape | `pezzo_dell_ape` | giorno, dove un'Ape è in doppia fila | stand-up rivolto a te (sbruffone) |  |  |
| 26 | La famiglia per bene | `pezzo_della_suocera` | giorno, alla fermata | stand-up rivolto a te (benpensante) |  |  |
| 27 | Il reduce e il braccio di ferro | `pezzo_del_reduce` | sera, fuori dall'osteria | stand-up rivolto a te (reduce, ubriaco) |  |  |
| 28 | La vodka dell'Impero | `vodka_per_terra` | all'alba del lunedì e del giovedì, sulla calata | Famiglia, folla, scelta | sì | 8 |
| 29 | I baffi al Garante | `se_tu_fossi_il_garante` | notte, al muretto o all'angolo | ragazzi, notte, momento serio |  |  |
| 30 | Il marsigliese al pontile | `pezzo_del_marsigliese` | notte, sulla calata o al pontile | stand-up rivolto a te (Marsigliesi) |  |  |
| 31 | L'ultima corsa | `ultima_corsa_dell_autobus` | notte, alla fermata prima dell'Ora Quieta | folla, notte, Grigi |  | 9 |

Le 8 scene con la scelta: 4, 12, 15, 17, 19, 22, 24, 28. Le scene con 5 o più persone in scena (capannello compreso) sono 15: 1, 2, 3, 4, 5, 7, 9, 10, 16, 17, 18, 23, 24, 28, 31.
La 31 (`ultima_corsa_dell_autobus`) è di riserva: notte, folla, Ora Quieta.

---

## Mattina

### 1. Il furbo della fila — `salta_la_fila`

**Quando e dove**: mattina, davanti alla caserma (lo sportello). Ore 8–12 · giorni lun, mar, mer, gio, ven. Posto: caserma [NUOVO], fila, portone (soft).  
**Tipo**: lite pubblica, Grigi, folla, inseguimento  
**Ruoli**: `a` il Grigio allo sportello (filtro cop); `b` la vecchia prima della fila (filtro old); `c` il furbo (filtro adult|any); `d` il ragazzo in fondo (filtro young)

- _Il Grigio allo sportello prende posto; la vecchia prima della fila prende posto; il ragazzo in fondo prende posto (insieme). Si forma un capannello di 5 (aspetta). Il Grigio allo sportello aspetta._
- **il Grigio allo sportello**: «Il prossimo! Veloci, che alle undici chiudo!» oppure «Avanti! Muovetevi, che ho fame!»
- _Il furbo va verso il Grigio allo sportello._
- **il furbo**: «Permesso! Scusate! Ho solo una domanda! Una sola!» oppure «Scusate, è un secondo! Devo solo chiedere una cosa!»
- _La vecchia prima della fila: rabbia. La vecchia prima della fila gesticola._
- **la vecchia prima della fila**: «Una domanda un cazzo! Sono qui dalle sette!»
- **il furbo**: «Signora, ho mia madre che sta malissimo!»
- **la folla**: «Pure la mia!» oppure «La mia è morta e faccio la fila lo stesso!» oppure «Dietro, furbo! In fondo!»
- **il ragazzo in fondo**: «Tua madre l'ho vista stamattina al mercato. Correva.»
- **il furbo**: «Era un'altra! Cioè, corre perché sta male!»
- **la vecchia prima della fila**: «In fondo, o ti spacco la borsa in testa!»
- _la vecchia prima della fila insegue il furbo._
   - se lo prende:
      - _La vecchia prima della fila dà uno spintone._
      - **la vecchia prima della fila**: «Tieni! Questa è per la domanda!»
      - **il furbo**: «Ahia! Va bene! Vado in fondo! Che violenza!»
   - se lo perde:
      - **la vecchia prima della fila**: «Torna qua! Ho settantotto anni e ti prendo lo stesso!»
- **il Grigio allo sportello**: «Bene. Pausa caffè. Cinque minuti.» oppure «Allora io vado al bar. Un attimo.»
- **la folla**: «Ma come?! E noi?!» oppure «Pure tu salti la fila, stronzo!» oppure «Portane uno pure a me!»
- **il Grigio allo sportello**: «Non vi muovete, che perdete il posto!»
- _Il Grigio allo sportello va via._
- **il ragazzo in fondo**: «Oi. Adesso che non c'è... chi è il primo?»
- **la folla**: «IO!» oppure «Io! Io!» oppure «Io, che sono il più vecchio!»

**Nota**: Folla di 5 in fila. Il furbo salta la fila, la vecchia lo insegue; alla fine lo sportello stesso salta la fila del bar. Posto «caserma» [NUOVO], se no la fila del forno.

### 2. Le cravatte dal terzo piano — `cravatte_dal_balcone`

**Quando e dove**: mattina, sotto un condominio (il portone). Ore 7–11.5. Posto: portone.  
**Tipo**: lite pubblica, folla  
**Ruoli**: `a` Tiziana, la moglie, al balcone (filtro f); `b` il marito, in canottiera (filtro adult|m); `c` Loredana, la vicina del quarto (filtro f)

- _[NUOVO] Tiziana si affaccia al balcone. Il marito prende posto. Il marito: freddo._
- **il marito**: «{a}! Apri! Non è come pensi!» oppure «{a}, amore! Ti giuro che è un malinteso!»
- **Tiziana**: «Il malinteso ha il rossetto e abita al quarto!»
- _[NUOVO] Tiziana lancia giù: maglia._
- **il marito**: «Le cravatte no! Quelle buone sono per i funerali!»
- _Si forma un capannello di 5._
- **la folla**: «Brava {a}! Tira!» oppure «Butta pure le mutande, che ridiamo!» oppure «Lo sapevo! L'avevo detto a tutti!»
- _Il marito gesticola._
- **il marito**: «Che cazzo guardate? Andate a lavorare!»
- **la folla**: «Oggi è festa. Grazie a te.» oppure «Siamo in pensione, bello.» oppure «Zitto, che adesso lancia la radio.»
- _[NUOVO] Tiziana lancia giù: radio._
- **il marito**: «La radio no! È a rate! Non l'ho finita di pagare!»
- **Tiziana**: «Falla pagare a Loredana!»
- _[NUOVO] Loredana si affaccia al balcone._
- **Loredana**: «Io non c'entro! Gli ho solo prestato lo zucchero!»
- **Tiziana**: «Tre volte a settimana?! Lui il caffè lo prende amaro!»
- **la folla**: «Ohhh!» oppure «Beccati!» oppure «Io lo zucchero lo compro, eh.»
- **il marito**: «Loredana, diglielo tu che non è successo niente!»
- **Loredana**: «Io? Scusi, ma lei chi è? Non la conosco.»
- **il marito**: «Come chi sono?! Ieri sera mi chiamavi orsetto!»
- **la folla**: «Orsetto!» oppure «Ciao, orsetto!» oppure «Orsetto, la radio s'è rotta!»
- _Il marito raccoglie. Il marito ha in mano: maglia._
- **il marito**: «Va bene! Me ne vado da mia madre!»
- **Tiziana**: «Tua madre ha già chiamato! Non ti vuole neanche lei!»
- _Il marito se ne va._
- **la folla**: «Ciao, orsetto!» oppure «Lascia le chiavi!»

**Nota**: Folla di 5. Servono il balcone e gli oggetti lanciati che restano a terra [NUOVO]; senza, la moglie urla dal portone. Loredana lo scarica in un secondo.

### 3. Il comitato del 9 — `comitato_del_nove`

**Quando e dove**: mattina presto, alla fermata. Ore 6.5–9.5. Posto: fermata, pensilina (soft).  
**Tipo**: assemblea, folla, Grigi  
**Ruoli**: `a` il capopopolo (filtro adult|m); `b` la signora con la borsa (filtro old); `c` il ragazzo (filtro young); `d` il Grigio che passa (filtro cop)

- _Il capopopolo prende posto; la signora con la borsa prende posto; il ragazzo prende posto (insieme). Si forma un capannello di 4 (aspetta)._
- **la signora con la borsa**: «Quaranta minuti! Il 9 non passa!»
- **il ragazzo**: «Il 9 l'ho visto ieri. Andava dall'altra parte.»
- _Il capopopolo allarga le braccia._
- **il capopopolo**: «Basta! Facciamo casino! Blocchiamo la strada!»
- **la folla**: «Sì!» oppure «Bravo!» oppure «Tu vai davanti, però.»
- **il capopopolo**: «Io parlo, voi gridate! Abbasso il 9!»
- **la folla**: «Abbasso!» oppure «Abbasso!» oppure «Abbasso chi guida il 9!»
- **il capopopolo**: «Chi è con me alzi la mano!»
- _La folla alza le mani. Il ragazzo alza le mani. Il Grigio che passa va verso il punto della scena._
- **il Grigio che passa**: «Che è 'sto casino? Chi è il capo, qua?»
- _La folla indica._
- **la folla**: «Lui!» oppure «È lui!» oppure «Ha detto abbasso!»
- **il capopopolo**: «Io? Io aspettavo il 9! Manco li conosco!»
- _Il capopopolo indica._
- **il capopopolo**: «Agente, il capo è quello! Il ragazzo!»
- **il ragazzo**: «Io?! Ho quindici anni! Che capo?!»
- **il Grigio che passa**: «Circolare, tutti. Il 9 oggi non passa.»
- **la signora con la borsa**: «E io come ci vado al lavoro?!»
- **il Grigio che passa**: «A piedi, signora. Io ci vado a piedi.»
- _La signora con la borsa va via; il Grigio che passa va via (insieme)._
- **il ragazzo**: «Oi, presidente! Domani rifacciamo?»
- **il capopopolo**: «Non ti conosco! Non ci siamo mai visti!»

**Nota**: Folla di 4 + 3 ruoli. Il capopopolo urla finché arriva il Grigio, poi vende il ragazzo. Nessuna conseguenza per ora.

### 4. La piangitrice a ore — `prefica_a_ore`

**Quando e dove**: mattina, sul sagrato di San Rocco. Ore 9–12.5. Posto: sagrato. **Viene da te.**  
**Tipo**: funerale, folla, scelta  
**Ruoli**: `a` la piangitrice (filtro old|f); `b` la vedova (filtro f); `c` il cerimoniere delle pompe funebri (filtro old|m)

- _La piangitrice prende posto; la vedova prende posto; il cerimoniere delle pompe funebri prende posto (insieme). Si forma un capannello di 5 (aspetta). La piangitrice prega._
- **la piangitrice**: «Ohhh Gesualdo! Gesualdo, perché?!»
- **la vedova**: «Si chiama Ernesto, stronza!»
- **la piangitrice**: «Ohhh Ernesto! Perché, Ernesto?!»
- **la folla**: «Era uno buono, Ernesto.» oppure «Mi doveva diecimila lire! Chi me li ridà?» oppure «Chi è quella che urla?»
- **la folla**: «La piangitrice. Otto mila. Dodici se sviene.»
- **la piangitrice**: «Signora, lo svenimento lo vuole o no? Si decida!»
- **la vedova**: «Non ho i soldi neanche per i fiori!»
- **la piangitrice**: «Allora piango a metà. Ohh... Erne...»
- _La piangitrice prega. La vedova guarda NINO (tu)._
- **la vedova**: «Oh! Lei! È il nipote di Torino? Quello ricco?»
- **[NUOVO] SCELTA** (12 s; se non scegli: «No, mi dispiace») — **la vedova**: «È lei? Il nipote?»
   1. **Sì, sono il nipote**
      - **la folla**: «Il nipote ricco! È venuto!» oppure «Allora le diecimila me le dai tu!»
      - **il cerimoniere delle pompe funebri**: «Due parole, il nipote. Veloce.»
      - **NINO (tu)** [NUOVO]: «Ernesto era... alto.»
      - **la folla**: «Era un metro e cinquanta!» oppure «Bravo, bellissimo.» oppure «Non lo conosceva per niente.»
      - _La vedova porge. [NUOVO] Ti resta in tasca: cappello._
      - **la vedova**: «Tieni. Il cappello di Ernesto. E il suo conto al bar.»
      - _[NUOVO] La vedova si ricorda di te (+2, «il nipote»). [NUOVO] Reputazione quartiere +1._
   2. **No, mi dispiace**
      - **la vedova**: «Peccato. Allora chi cazzo paga il carro?»
      - **la piangitrice**: «Io no. Io piango e basta.»
   3. **Pago io lo svenimento**
      - _[NUOVO] Soldi -12 mila._
      - **la piangitrice**: «Ohhh Ernesto! Portami con te!»
      - _La piangitrice cade._
      - **la folla**: «Mamma mia, che botta!» oppure «Questa sì che è una professionista!» oppure «Al mio la voglio uguale!»
      - _La piangitrice si rialza._
      - **la piangitrice**: «Mi sono fatta male davvero. Sono altre cinque.»
      - _[NUOVO] La vedova si ricorda di te (+1, «lo svenimento»). [NUOVO] La piangitrice si ricorda di te (+1, «cliente»)._
- **il cerimoniere delle pompe funebri**: «Sbrighiamoci! Il carro ha un altro morto alle undici!»

**Nota**: SCELTA. Sì: la vedova ti dà il cappello del morto (e i suoi debiti al bar). Paghi lo svenimento: -12 mila, ti ricordano tutte e due.

### 5. Le arance sequestrate — `arance_sovversive`

**Quando e dove**: mattina, al mercato. Ore 8–12.5. Posto: mercato, banco_pesce (soft).  
**Tipo**: Grigi, folla di vecchie, inseguimento  
**Ruoli**: `a` il Grigio anziano (filtro cop); `b` il Grigio giovane (filtro cop); `c` la signora con la rete (filtro old|f)

- _La signora con la rete ha in mano: borsa. Il Grigio anziano va verso la signora con la rete; il Grigio giovane segue il Grigio anziano (insieme). La signora con la rete guarda il Grigio anziano._
- **il Grigio anziano**: «Alt! Signora! Cos'ha nella rete?»
- **la signora con la rete**: «Arance! Sono arance! Non ha gli occhi?»
- _Il Grigio anziano indica._
- **il Grigio anziano**: «Frutta d'importazione! Sequestro!»
- _Il Grigio giovane ha in mano: borsa. Si forma un capannello di 5._
- **la folla**: «Ladri! Rubate le arance alle vecchie!» oppure «Vergogna! Con la divisa!» oppure «Ieri m'hanno preso le sigarette, questi!»
- _Il Grigio giovane mangia._
- **la signora con la rete**: «Se la sta mangiando! Guardatelo! Se la mangia!»
- **il Grigio giovane**: «È per l'analisi! ...Mamma mia, che buona.»
- **il Grigio anziano**: «Dammene una, va'.»
- **la folla**: «Pure lui!» oppure «Analizzala anche tu, stronzo!» oppure «Fategli il verbale, a loro!»
- _La signora con la rete: rabbia. La signora con la rete va verso il Grigio giovane. La signora con la rete dà uno spintone._
- **il Grigio giovane**: «Signora! La divisa nuova! Me la sporca di arancia!»
- **il Grigio anziano**: «Ritirata! Andiamo, andiamo!»
- _la signora con la rete insegue il Grigio giovane._
   - se lo prende:
      - _La signora con la rete ha in mano: borsa._
      - **la signora con la rete**: «Dammi qua! E ringrazia che ho la sciatica!»
      - **il Grigio giovane**: «Non lo dica in caserma! La prego!»
   - se lo perde:
      - **la signora con la rete**: «Vi conosco! Siete i nipoti della Carmela! Lo dico a lei!»
- **la folla**: «Brava {c}!» oppure «Ottant'anni e corre più dei Grigi!» oppure «Io le arance le nascondo nel reggiseno.»
- _Il Grigio anziano va via._

**Nota**: Folla di 5. Servono due Grigi in pattuglia vicini. La rete passa di mano (hand); la vecchia insegue il giovane e se la riprende.

### 6. Il meccanico e la campagnola — `campagnola_offesa`

**Quando e dove**: mattina, all'officina dello Scalo. Ore 7.5–12.5. Posto: officina [NUOVO], retrobottega, facciata_in_riparazione (soft).  
**Tipo**: lavoro, Grigi  
**Ruoli**: `a` il meccanico (filtro shop|m); `b` il Grigio che aspetta la macchina (filtro cop)

- _Una campagnola dei Grigi in doppia fila. Il meccanico va verso il mezzo. Il meccanico lavora. Il Grigio che aspetta la macchina va verso il punto della scena. Il Grigio che aspetta la macchina aspetta._
- **il meccanico**: «Ma che ci avete fatto? Il rally? La frizione è bruciata!»
- **il Grigio che aspetta la macchina**: «Ho inseguito un pericoloso! A centoventi!»
- **il meccanico**: «Questa fa sessanta in discesa. Chi inseguivi, una vecchia?»
- **il Grigio che aspetta la macchina**: «...Una vecchia veloce. Con la bici.»
- _Il meccanico martella. Il meccanico armeggia._
- **il meccanico**: «E sotto il sedile? Sei bottiglie di vodka?»
- **il Grigio che aspetta la macchina**: «Roba sequestrata! Sono prove!»
- **il meccanico**: «Prove mezze vuote.»
- **il Grigio che aspetta la macchina**: «Le prove evaporano! Fa caldo, in macchina!»
- **il meccanico**: «Fanno quindicimila. Più cinque per non aver visto niente.»
- **il Grigio che aspetta la macchina**: «Cinque?! Ma io sono la legge!»
- **il meccanico**: «Allora dieci.»
- **il Grigio che aspetta la macchina**: «Va bene, cinque! Ma al maresciallo non dire niente!»
- _Il Grigio che aspetta la macchina paga 5 mila a il meccanico._
- **il meccanico**: «Il maresciallo m'ha portato la sua ieri. Stesse bottiglie.»

**Nota**: Una campagnola in doppia fila (van kind campagnola, esiste). Il Grigio si vanta dell'inseguimento, il meccanico trova le bottiglie. Paga 5 (pay).

## Giorno

### 7. Diciotto anni di cambiali — `diciotto_anni_di_cambiali`

**Quando e dove**: giorno, accanto a un'auto parcheggiata. Ore 9–19. Posto: sosta (soft).  
**Tipo**: crollo pubblico, folla  
**Ruoli**: `a` il benpensante a rate (filtro adult|m); `b` un passante (filtro young|any)

- _Il benpensante a rate va verso il punto della scena. Il benpensante a rate armeggia. Il benpensante a rate: rabbia._
- **il benpensante a rate**: «Parti! Parti, porca miseria! Diciotto anni di rate!» oppure «Diciotto anni di cambiali e non parte! Diciotto!»
- _Il benpensante a rate tira un calcio._
- **il benpensante a rate**: «Parti! Ti ho comprato pure i tappetini!»
- _Si forma un capannello di 5._
- **la folla**: «Signore, si calmi!» oppure «Le dia un altro calcio, a me funziona.» oppure «È la batteria! È sempre la batteria!»
- _Il benpensante a rate gesticola._
- **il benpensante a rate**: «La batteria è nuova! A rate! Ventiquattro!»
- **un passante**: «Stamattina qui hanno rubato tre macchine. La sua no.»
- **il benpensante a rate**: «Neanche i ladri la vogliono?! Che schifo!»
- _Il benpensante a rate tira un calcio. Il benpensante a rate cade._
- **il benpensante a rate**: «Ahia! Il piede! Mi sono rotto il piede!»
- _Il benpensante a rate si rialza._
- **la folla**: «Ben ti sta!» oppure «Adesso a rate ti paghi pure il gesso!» oppure «Che figura di merda, davanti a tutti.»
- **il benpensante a rate**: «Voi! Spingete! Vi do mille lire!»
- **la folla**: «Mille? Spingi tu.» oppure «Per mille spingo con un dito.» oppure «Io ho la schiena. Però guardo.»
- _Il benpensante a rate si siede per terra._
- **il benpensante a rate**: «Mia moglie me l'aveva detto: compra la bici. Io no. La berlina.»

**Nota**: Folla di 5. «calcio» è la posa di anim_lotta (va bene sulla ruota). La macchina non si muove; lui si fa male al piede.

### 8. Lo scippo alla rovescia — `scippo_alla_rovescia`

**Quando e dove**: giorno, al mercato. Ore 8.5–13.5. Posto: mercato, banco_pesce, fila (soft).  
**Tipo**: crimine andato male  
**Ruoli**: `a` la vecchia con la borsa (filtro old|f); `b` lo scippatore (filtro young|m)

- _La vecchia con la borsa ha in mano: borsa. Lo scippatore va verso la vecchia con la borsa. Lo scippatore raccoglie. Lo scippatore ha in mano: borsa._
- **la vecchia con la borsa**: «Ah sì?! A me?! Brutto disgraziato!» oppure «La borsa! A me la borsa?!»
- _la vecchia con la borsa insegue lo scippatore._
   - se lo prende:
      - **la vecchia con la borsa**: «Preso! Ottantadue anni e ti ho preso!»
      - **lo scippatore**: «Signora, che c'è dentro?! Pesa un quintale!»
      - **la vecchia con la borsa**: «Tre chili di ceci! E adesso me li porti a casa!»
      - **lo scippatore**: «Dove abita?»
      - **la vecchia con la borsa**: «Quarto piano. Senza ascensore. Corri, che sei bravo.»
      - **lo scippatore**: «Non lo dite a nessuno, eh! Che mi rovinate!»
      - _La vecchia con la borsa va via. Lo scippatore segue la vecchia con la borsa._
   - se lo perde:
      - **la vecchia con la borsa**: «Corri, corri! Tanto ti conosco! Sei il figlio della Pina!» oppure «Vai! Dentro ci sono le bollette! Pagale tu!»

**Nota**: La vecchia è più veloce del ladro (la borsa pesa). Se lo prende, lui le porta la spesa: escono insieme di scena.

### 9. Due cartelli, un angolo — `due_cartelli`

**Quando e dove**: giorno, alla pensilina o in piazza. Ore 10–17. Posto: pensilina, angolo, edicola (soft).  
**Tipo**: lite pubblica, rissa, folla  
**Ruoli**: `a` l'uomo-cartello delle cozze (filtro old|m); `b` l'uomo-cartello dei materassi (filtro adult|m)

- _L'uomo-cartello delle cozze ha in mano: cartello. L'uomo-cartello delle cozze gironzola._
- **l'uomo-cartello delle cozze**: «Cozze fresche al Molo! Fresche di stamattina!» oppure «Cozze! Cozze! Più fresche di voi!»
- _L'uomo-cartello dei materassi ha in mano: cartello. L'uomo-cartello dei materassi va verso l'uomo-cartello delle cozze._
- **l'uomo-cartello dei materassi**: «Oi! Questo è il mio angolo! Sparisci!»
- **l'uomo-cartello delle cozze**: «Il tuo angolo? C'è scritto il tuo nome?»
- **l'uomo-cartello dei materassi**: «Quindici anni che sto qua! Ho i piedi a forma di marciapiede!»
- **l'uomo-cartello delle cozze**: «E io quaranta! Ho la schiena a forma di cartello!»
- _Si forma un capannello di 4._
- **la folla**: «Botte! Botte!» oppure «Dai, nonno, dagli col cartello!» oppure «Io scommetto sulle cozze!»
- _L'uomo-cartello dei materassi: rabbia._
- **l'uomo-cartello dei materassi**: «Vattene, vecchio, che ti stendo come un materasso!»
- **l'uomo-cartello delle cozze**: «Provaci! Che ho fatto la guerra! Quella vera!»
- _a caso (50%):_
   - **la folla**: «Vai!» oppure «Dagliele!»
   - _Rissa: l'uomo-cartello delle cozze contro l'uomo-cartello dei materassi._
- _altrimenti:_
   - _L'uomo-cartello delle cozze dà uno spintone. L'uomo-cartello dei materassi cade._
   - **l'uomo-cartello dei materassi**: «Mi ha spinto! Avete visto? Mi ha spinto un vecchio!»
   - **la folla**: «Un vecchio con le cozze!» oppure «Che figura di merda!» oppure «Rialzati, materasso!»
   - _L'uomo-cartello dei materassi si rialza. L'uomo-cartello dei materassi se ne va._
   - **l'uomo-cartello delle cozze**: «Cozze fresche! E pure vincenti!»

**Nota**: Folla di 4 che tifa. Due uomini-cartello per lo stesso angolo: al 50% rissa, se no il vecchio lo spinge per terra. Sostituisce «Davanti il Garante, dietro le cozze».

### 10. Il tuffo dalla calata — `il_tuffo`

**Quando e dove**: giorno, sulla calata o sul lungomare. Ore 11–18.5. Posto: calata, panchina (soft).  
**Tipo**: ragazzi, sbruffone, folla  
**Ruoli**: `a` quello che si tuffa (a parole) (filtro young|m); `b` l'amico (filtro young)

- _Quello che si tuffa prende posto. L'amico va verso quello che si tuffa. Quello che si tuffa allarga le braccia._
- **quello che si tuffa**: «Guardate! Mi tuffo dalla calata! Di testa!» oppure «Gente! Adesso mi tuffo! Di testa, eh!»
- **l'amico**: «Fallo, allora. Sono venti minuti che lo dici.»
- _Si forma un capannello di 4._
- **la folla**: «Tuffati!» oppure «Vai, campione!» oppure «L'acqua è a due gradi, eh.»
- **quello che si tuffa**: «Aspetta, mi devo concentrare. È una cosa mentale.»
- **l'amico**: «È mentale che te la fai addosso.»
- **quello che si tuffa**: «Io? Io l'anno scorso mi sono tuffato dal faro!»
- **l'amico**: «Il faro è chiuso da dieci anni.»
- **quello che si tuffa**: «...Da fuori. Mi sono tuffato da fuori.»
- **la folla**: «Uno! Due...!» oppure «Tuffati o paghi da bere!» oppure «Dai che c'abbiamo fretta!»
- **quello che si tuffa**: «Fa freddo! Mi viene il crampo! Domani!»
- _L'amico dà uno spintone. Quello che si tuffa cade._
- **l'amico**: «Oh, scusa. M'è scivolata la mano.»
- _Quello che si tuffa si rialza._
- **quello che si tuffa**: «Infame! Mi hai spinto davanti a tutti!»
- **l'amico**: «E manco in acqua. Neanche cadere sai.»
- **la folla**: «Tuffo per terra! Dieci!» oppure «Il campione del faro!» oppure «Ahahah! Rifallo!»
- **quello che si tuffa**: «Domani mi tuffo! Domani venite tutti!»
- _Quello che si tuffa se ne va._

**Nota**: Folla di 4. Lo sbruffone non si tuffa; l'amico lo spinge, ma per terra. Sostituisce «Il censimento dei gabbiani».

### 11. La multa mangiata — `multa_mangiata`

**Quando e dove**: giorno, accanto a un'auto parcheggiata. Ore 8.5–19. Posto: sosta (soft).  
**Tipo**: Grigi, inseguimento  
**Ruoli**: `a` il Grigio con il blocchetto (filtro cop); `b` il padrone della macchina (filtro adult|m)

- _Il Grigio con il blocchetto prende posto. Il Grigio con il blocchetto ha in mano: carta. Il Grigio con il blocchetto legge/scrive._
- **il Grigio con il blocchetto**: «Doppia fila. Quarantamila.»
- _Il padrone della macchina va verso il Grigio con il blocchetto._
- **il padrone della macchina**: «Fermo! Fermo! Un secondo! Ero lì un secondo!»
- **il Grigio con il blocchetto**: «Quaranta minuti. T'ho cronometrato.»
- **il padrone della macchina**: «Mia moglie sta partorendo! Dentro al bar!»
- **il Grigio con il blocchetto**: «Nel bar?»
- **il padrone della macchina**: «...Sì. Prima il cappuccino, poi partorisce.»
- **il padrone della macchina**: «Dai, siamo amici! Ci siamo visti alla cresima!»
- **il Grigio con il blocchetto**: «Io alle cresime non ci vado.»
- _Il Grigio con il blocchetto porge. Il padrone della macchina ha in mano: carta. Il padrone della macchina mangia._
- **il padrone della macchina**: «Che multa? Io non vedo nessuna multa.»
- _Il Grigio con il blocchetto: rabbia._
- **il Grigio con il blocchetto**: «M'hai mangiato la multa! Il blocchetto lo pago io!»
- **il padrone della macchina**: «Era buona. Sapeva di caserma.»
- **il Grigio con il blocchetto**: «Adesso te ne faccio due! E una per la bocca!»
- _il Grigio con il blocchetto insegue il padrone della macchina._
   - se lo prende:
      - **il Grigio con il blocchetto**: «Sputa! Sputa la multa, che è un documento!»
      - **il padrone della macchina**: «L'ho già digerita! Avvocato!»
      - _Il padrone della macchina viene portato via (fermo)._
   - se lo perde:
      - **il Grigio con il blocchetto**: «Ti trovo! La targa ce l'ho! ...Era scritta sulla multa.»

**Nota**: Due ruoli. Lui inventa tutto, poi si mangia la multa; il Grigio lo insegue: se lo prende, fermo. Sostituisce «La multa al defunto».

### 12. Il primo fermo — `come_si_scrive_nino`

**Quando e dove**: giorno o sera, vicino a una porta della città. Ore 8–22. Posto: porta_della_citta, angolo (soft). **Viene da te.**  
**Tipo**: Grigi, scelta  
**Ruoli**: `a` il Grigio al primo giorno (filtro cop)

- _Il Grigio al primo giorno va verso NINO (tu). Il Grigio al primo giorno guarda NINO (tu). Il Grigio al primo giorno ha in mano: carta. Il Grigio al primo giorno indica._
- **il Grigio al primo giorno**: «Fermo! Mani in alto! Cioè no, documenti!»
- **il Grigio al primo giorno**: «Non scappare, eh! È il mio primo giorno!»
- _Il Grigio al primo giorno legge/scrive._
- **[NUOVO] SCELTA** (10 s; se non scegli: «Nino») — **il Grigio al primo giorno**: «Il nome! Dimmi il nome, dai, che mi guardano!»
   1. **Nino**
      - **il Grigio al primo giorno**: «Nino! Nino come? Come si scrive Nino?»
      - **NINO (tu)** [NUOVO]: «N. I. N. O.»
      - **il Grigio al primo giorno**: «Piano! Piano, che sto ancora alla N!»
      - **il Grigio al primo giorno**: «Fatto! Il mio primo schedato! Stasera lo dico a mamma!»
      - _[NUOVO] Il Grigio al primo giorno si ricorda di te (-1, «schedato»). [NUOVO] Reputazione grigi -1._
   2. **Gennaro Lanterna**
      - **il Grigio al primo giorno**: «Lanterna... Lanterna! Il cognato del maresciallo!»
      - **il Grigio al primo giorno**: «Mi scusi! Non dica niente al maresciallo, la prego!»
      - _a caso (50%):_
         - **il Grigio al primo giorno**: «...Aspetta. Il maresciallo non ha cognati!»
         - **il Grigio al primo giorno**: «Fermo, Lanterna! Fermo che sparo! Non ce l'ho, ma fermo!»
         - [NUOVO] _il Grigio al primo giorno insegue TE._
            - se ti prende:
               - **il Grigio al primo giorno**: «Preso! Ho preso uno! Il primo giorno! Mamma!»
               - _[NUOVO] Il Grigio al primo giorno si ricorda di te (-2, «il bugiardo»)._
            - se ti perde:
               - **il Grigio al primo giorno**: «Centrale... no, niente. Al maresciallo non dite niente.»
      - _altrimenti:_
         - **il Grigio al primo giorno**: «Saluti al maresciallo! Gli dica che sono bravo!»
   3. **Il nome del Garante**
      - **il Grigio al primo giorno**: «...Eccellenza! Mi perdoni! Non l'avevo riconosciuta!»
      - _Il Grigio al primo giorno saluta._
      - **il Grigio al primo giorno**: «Mia madre la tiene in camera da letto! In foto, eh!»
      - _a caso (50%):_
         - **il Grigio al primo giorno**: «Un momento! Il Garante è più alto! E più vecchio!»
         - [NUOVO] _il Grigio al primo giorno insegue TE._
            - se ti prende:
               - **il Grigio al primo giorno**: «Mi prendi per il culo il primo giorno?! Vieni!»
               - _[NUOVO] Reputazione grigi -2._
            - se ti perde:
               - **il Grigio al primo giorno**: «Era lui. Sicuro. Ho fatto bene a lasciarlo andare.»
      - _altrimenti:_
         - **il Grigio al primo giorno**: «Vada, Eccellenza! E se può... una promozione!»
         - _[NUOVO] Il Grigio al primo giorno si ricorda di te (+1, «il Garante»). [NUOVO] Reputazione ragazzi +1._
- _Il Grigio al primo giorno se ne va._

**Nota**: SCELTA. Il Grigio è al primo giorno e si caga sotto. Nome vero: schedato (rep grigi -1). Nome falso o il Garante: al 50% ci casca, se no ti insegue (hunt).

### 13. La macchina restituita — `la_cugina`

**Quando e dove**: giorno, accanto a un'auto parcheggiata. Ore 10–19. Posto: sosta (soft).  
**Tipo**: Famiglia  
**Ruoli**: `a` l'uomo della Famiglia (filtro adult|m); `b` il ragazzo con l'occhio nero (filtro young|m); `c` la signora derubata (filtro old|f)

- _Il ragazzo con l'occhio nero: ferito. L'uomo della Famiglia va verso la signora derubata; il ragazzo con l'occhio nero segue l'uomo della Famiglia (insieme). La signora derubata guarda l'uomo della Famiglia._
- **l'uomo della Famiglia**: «Signora, buongiorno. La sua Cinquecento. Gliel'ha presa questo.»
- **la signora derubata**: «Ladro! Me l'hai rubata ieri, delinquente!»
- **il ragazzo con l'occhio nero**: «Non sapevo che era sua! Sembrava di nessuno!»
- **l'uomo della Famiglia**: «Di nessuno?! Ha il rosario sullo specchietto!»
- **l'uomo della Famiglia**: «Chiedi scusa alla signora! In ginocchio!»
- _Il ragazzo con l'occhio nero prega._
- **il ragazzo con l'occhio nero**: «Scusi, signora! Non lo faccio più! Non lo dica a mia madre!»
- _La signora derubata gesticola._
- **la signora derubata**: «E il fanale rotto? Chi me lo paga?»
- **l'uomo della Famiglia**: «Lui. Per sei mesi. E le lava pure la macchina.»
- **il ragazzo con l'occhio nero**: «Sei mesi?! Per una Cinquecento?!»
- **l'uomo della Famiglia**: «Zitto! Che t'ho trovato dentro che cantavi!»
- **il ragazzo con l'occhio nero**: «Non cantavo io! Era la radio!»
- **la signora derubata**: «Quale radio? Me l'hanno rubata l'anno scorso!»
- **l'uomo della Famiglia**: «Signora, da oggi è protetta. Il primo del mese passo io.»
- **la signora derubata**: «E che vieni a fare?»
- **l'uomo della Famiglia**: «A prendere il caffè. E il resto.»
- **la signora derubata**: «Ma andate a cagare tutti e due!»
- _L'uomo della Famiglia se ne va; il ragazzo con l'occhio nero se ne va (insieme)._
- **la signora derubata**: «E lasciate le chiavi, stronzi!»

**Nota**: Il ragazzo ha il mood «ferito». La signora da oggi è «protetta»: [NUOVO] potrebbe entrare nella lista di chi la Famiglia protegge.

### 14. Il più coraggioso del quartiere — `classifica_dei_grigi`

**Quando e dove**: pomeriggio, in periferia (a piedi). Ore 14–19.5. Posto: angolo, lotto_vuoto, panchina (soft).  
**Tipo**: ragazzi, camminata  
**Ruoli**: `a` lo sbruffone (filtro young); `b` il secondo (filtro young); `c` il terzo (filtro young)

- _Il secondo va verso lo sbruffone; il terzo va verso lo sbruffone (insieme). Lo sbruffone va via; il secondo segue lo sbruffone; il terzo segue il secondo (insieme)._
- **lo sbruffone**: «Io se vedo un Grigio gli rido in faccia. Così. Ah-ah.»
- **il secondo**: «Io gli tiro lo skate. Dritto in testa.»
- **il terzo**: «Io gli dico: oi, Grigio, sei un cesso. E scappo.»
- **lo sbruffone**: «Vigliacco. Io non scappo mai. Mai, fra.»
- _[NUOVO] Un'Alfetta dei Grigi passa piano e se ne va. Lo sbruffone si siede per terra. Il secondo guarda attorno, circospetto. Il terzo guarda attorno, circospetto._
- **il terzo**: «...»
- **il secondo**: «Oi. Dov'era {a}?»
- **il terzo**: «Dietro di te. Attaccato. Ti teneva la maglia.»
- **lo sbruffone**: «Mi allacciavo la scarpa!»
- **il secondo**: «Hai le scarpe con lo strappo, coglione.»
- **il terzo**: «Gli ridevi in faccia, eh? Ah-ah.»
- **lo sbruffone**: «Non era un Grigio! Era un taxi grigio!»
- **il secondo**: «Ti sei nascosto dietro di me! Mi usavi come scudo!»
- **lo sbruffone**: «Ti proteggevo! Facevo la scorta!»
- **il terzo**: «Allora adesso vai davanti tu, scorta.»
- **lo sbruffone**: «No, io faccio la retroguardia. È più pericolosa.»
- _Lo sbruffone va via; il secondo segue lo sbruffone; il terzo segue il secondo (insieme)._

**Nota**: Camminata e parlata. Lo sbruffone si accuccia quando passa la ronda [NUOVO]; senza, resta l'attesa e il resto regge.

### 15. Il pallone dei Grigi — `pallone_in_caserma`

**Quando e dove**: pomeriggio, sotto il muro della caserma. Ore 14–18.5. Posto: caserma [NUOVO], lotto_vuoto, angolo (soft). **Viene da te.**  
**Tipo**: ragazzi, Grigi, scelta  
**Ruoli**: `a` quello che ha tirato (filtro young); `b` quello del pallone (filtro young); `c` il piantone (filtro cop)

- _Quello che ha tirato ha in mano: pallone. Quello che ha tirato tira un calcio._
- **quello che ha tirato**: «Gooool! ...Oh, cazzo.»
- **quello del pallone**: «Bravo, campione! Dentro la caserma!»
- **quello del pallone**: «Hai tirato tu, vai tu.»
- **quello che ha tirato**: «Il pallone è tuo. Vai tu, è roba tua.»
- **quello del pallone**: «Io ho già un fascicolo. Tu sei pulito.»
- **quello che ha tirato**: «Sono pulito perché nelle caserme non ci vado, coglione!»
- _Quello che ha tirato guarda NINO (tu); quello del pallone va verso NINO (tu) (insieme)._
- **quello del pallone**: «Oi, tu! Sì, tu, faccia da bravo ragazzo! Vai tu!»
- **[NUOVO] SCELTA** (12 s; se non scegli: «Arrangiatevi») — **quello del pallone**: «Dai, è l'unico pallone del quartiere!»
   1. **Vai a chiedere**
      - _[NUOVO] Tu vai da il piantone. Il piantone guarda NINO (tu)._
      - **il piantone**: «Un pallone? Ah, questo. È sequestrato.»
      - **il piantone**: «La sera ci giochiamo noi. Ci serve.»
      - **quello che ha tirato**: «Ci giocano loro! Lo sapevo! Ladri!»
      - _[NUOVO] Reputazione ragazzi +1. [NUOVO] Il piantone si ricorda di te (-1, «il pallone»)._
   2. **Scavalca il muro**
      - **quello che ha tirato**: «Vai! Vai, eroe!»
      - **il piantone**: «Alt! Intruso! Fermo o sparo!»
      - [NUOVO] _il piantone insegue TE._
         - se ti prende:
            - **il piantone**: «Preso! E il pallone resta qua! Anzi, ci gioco io!»
            - _[NUOVO] Reputazione grigi -1._
         - se ti perde:
            - **quello del pallone**: «Corre come un ladro vero! Ti voglio bene!»
      - **quello che ha tirato**: «Grande! ...Però il pallone dov'è?»
      - _[NUOVO] Reputazione ragazzi +2._
   3. **Arrangiatevi**
      - **quello che ha tirato**: «Sbirro!»
      - **quello del pallone**: «Sbirro e pure brutto!»
      - **quello che ha tirato**: «Un favore ti abbiamo chiesto! Uno!»
      - _[NUOVO] Quello che ha tirato si ricorda di te (-1, «sbirro»). [NUOVO] Reputazione ragazzi -1._
- _Quello che ha tirato se ne va; quello del pallone se ne va (insieme)._

**Nota**: SCELTA. Chiedi: i ragazzi ti rispettano (+1), e si scopre che col pallone ci giocano i Grigi. Scavalchi: il piantone ti insegue, ragazzi +2. Rifiuti: «sbirro».

### 16. Il battesimo con la busta — `battesimo_con_busta`

**Quando e dove**: domenica mattina, sul sagrato di San Rocco. Ore 10–12.5 · giorni dom. Posto: sagrato.  
**Tipo**: Famiglia, rito, folla  
**Ruoli**: `a` il padrino (Famiglia) (filtro adult|m); `b` il prete (filtro prete|old [NUOVO]); `c` la madre col bambino (filtro f)

- _Il prete prende posto; il padrino prende posto; la madre col bambino prende posto (insieme). Si forma un capannello di 6 (aspetta)._
- **il padrino**: «Padre, sbrighiamoci, che ho la macchina in doppia fila!»
- **il prete**: «Questo è un sacramento!»
- **il padrino**: «E quella è una Mercedes!»
- **la folla**: «Oh, una Mercedes!» oppure «L'ha presa ieri. Di notte.» oppure «Ma il bambino dov'è?»
- **la madre col bambino**: «Il bambino urla da un'ora! Fate qualcosa!»
- **il padrino**: «Urla perché è forte! Come lo zio!»
- _Il padrino ha in mano: pacchetto. Il padrino porge._
- **il padrino**: «Per la chiesa, padre! Cinquecentomila!»
- **il padrino**: «Cazzo! La busta! S'è aperta!»
- _La folla raccoglie._
- **la folla**: «Soldi! Ci sono i soldi per terra!» oppure «Questo è mio! L'ho visto prima io!» oppure «Battezzate pure me!»
- _Il prete raccoglie._
- **il prete**: «Fermi! Sono della chiesa! Giù le mani!»
- **il padrino**: «Ridatemeli! Erano contati!»
- **la folla**: «Contati da chi?» oppure «Io non ho preso niente. Ho raccolto.» oppure «Io stavo pregando. Per terra.»
- _Il prete ha in mano: pacchetto._
- **il padrino**: «Erano cinquecento! Qua ce ne sono duecento!»
- **il prete**: «Il resto è offerta spontanea.»
- **la madre col bambino**: «E il bambino?! Qualcuno guarda il bambino?!»

**Nota**: Folla di 6. La busta cade, i soldi per terra, tutti si buttano (prete compreso). Filtro «prete» [NUOVO]; senza, un vecchio qualsiasi fa il prete.

### 17. Lo sposo corre — `sposo_in_fuga`

**Quando e dove**: sabato a mezzogiorno, sul sagrato. Ore 11–13.5 · giorni sab. Posto: sagrato. **Viene da te.**  
**Tipo**: matrimonio, folla, scelta, inseguimento  
**Ruoli**: `a` lo sposo (filtro young|m); `b` la sposa (filtro f); `c` il padre della sposa (filtro old|m)

- _La sposa prende posto; lo sposo prende posto; il padre della sposa prende posto (insieme). Si forma un capannello di 6. La folla allarga le braccia._
- **la folla**: «Viva gli sposi!» oppure «Il riso! Tirate il riso!» oppure «Si vede già la pancia, eh!»
- _Lo sposo guarda attorno, circospetto._
- **lo sposo**: «Scusate. Devo andare in bagno. Un attimo.»
- **la sposa**: «Il bagno è dall'altra parte, Tonino!»
- _Lo sposo va verso NINO (tu) di corsa._
- **il padre della sposa**: «Fermatelo! Ho pagato il ristorante! Centoventi coperti!»
- **[NUOVO] SCELTA** (6 s; se non scegli: «Lascialo passare») — **lo sposo**: «Spostati! Spostati, ti prego, fratello!»
   1. **Sgambetto**
      - _Lo sposo cade. Il padre della sposa va verso lo sposo._
      - **il padre della sposa**: «Bravo! Tu vieni al pranzo! Ti mangi pure la sua porzione!»
      - **lo sposo**: «Infame! Pensavo fossi un uomo!»
      - **la sposa**: «Amore, sei caduto! Hai visto? È destino!»
      - _Lo sposo si rialza. Lo sposo segue il padre della sposa. [NUOVO] Il padre della sposa si ricorda di te (+2, «lo sgambetto»). [NUOVO] Lo sposo si ricorda di te (-2, «lo sgambetto»)._
   2. **Lascialo passare**
      - _il padre della sposa insegue lo sposo._
         - se lo prende:
            - **il padre della sposa**: «Dove vai?! Ho già pagato i confetti!»
         - se lo perde:
            - **il padre della sposa**: «Torna! Ti spezzo le gambe! Tutte e due!»
            - **la sposa**: «Lascia, papà. Ha lasciato qui il motorino. Torna.»
   3. **Scappa con lui**
      - **lo sposo**: «Fratello! Al porto! Prendiamo una nave!»
      - **lo sposo**: «Qualsiasi nave! Pure quella del pesce!»
      - _Lo sposo se ne va di corsa._
      - [NUOVO] _il padre della sposa insegue TE._
         - se ti prende:
            - **il padre della sposa**: «Tu! Il complice! Allora il pranzo lo paghi tu!»
            - _[NUOVO] Soldi -20 mila._
         - se ti perde:
            - **il padre della sposa**: «Ti ho visto in faccia! Il quartiere è piccolo, stronzo!»
      - _[NUOVO] Il padre della sposa si ricorda di te (-2, «il complice»). [NUOVO] Lo sposo si ricorda di te (+2, «il fratello»)._
- **la folla**: «Ma il pranzo si fa lo stesso?» oppure «Io il regalo me lo riprendo!» oppure «Il più bel matrimonio dell'anno!»

**Nota**: SCELTA + inseguimento. Sgambetto: il suocero ti vuole al pranzo (+2). Scappi con lo sposo: il suocero ti insegue (hunt).

### 18. Il santo e il ritratto — `santo_e_ritratto`

**Quando e dove**: domenica pomeriggio, dal sagrato verso la piazza. Ore 16.5–19 · giorni dom. Posto: sagrato, parata (soft).  
**Tipo**: processione, folla, Grigi  
**Ruoli**: `a` il primo portatore (filtro adult|m); `b` il secondo portatore (che non spinge) (filtro adult|m); `c` il prete (filtro prete|old [NUOVO]); `d` il Grigio del cerimoniale (filtro cop)

- _Il prete prende posto; il primo portatore prende posto; il secondo portatore prende posto (insieme). Il primo portatore ha in mano: cassa. Il secondo portatore ha in mano: cassa. Si forma un capannello di 7 (prega)._
- **la folla**: «Viva San Rocco!» oppure «Piano, che lo fate cadere!» oppure «Quest'anno il santo pesa di più.»
- _Il Grigio del cerimoniale va verso il prete._
- **il Grigio del cerimoniale**: «Ordine della Tutela! Il ritratto del Garante va davanti!»
- **il prete**: «Davanti al santo?!»
- **il Grigio del cerimoniale**: «Davanti. E più in alto. Muovetevi!»
- _Il prete va via; il primo portatore segue il prete; il secondo portatore segue il primo portatore; il Grigio del cerimoniale segue il secondo portatore (insieme)._
- **il primo portatore**: «Oi! Stai spingendo o no? Il peso lo sento tutto io!»
- **il secondo portatore**: «Sto spingendo! Sto pregando e spingendo!»
- **il primo portatore**: «Stai pregando e basta! Spingi, stronzo!»
- **il secondo portatore**: «Non dire stronzo davanti al santo!»
- **il primo portatore**: «Il santo lo sa che sei uno stronzo! Da trent'anni!»
- **la folla**: «Pende! Pende a destra!» oppure «Il Garante cade! Cade!» oppure «Lasciatelo cadere, il Garante!»
- **il Grigio del cerimoniale**: «Chi ha detto lasciatelo cadere?! Chi è stato?!»
- **la folla**: «Lui.» oppure «Io pregavo.» oppure «È stato quello. Quello là.»
- **il Grigio del cerimoniale**: «Fermi tutti! Chi ha parlato?»
- **il prete**: «Agente, è una processione! Non si ferma!»
- **il Grigio del cerimoniale**: «Allora camminate. E zitti!»
- **il secondo portatore**: «Hai sentito? Zitto e spingi.»
- **il primo portatore**: «Spingi tu, bastardo!»

**Nota**: Folla di 7 che segue. I due portatori litigano: uno fa finta di portare. La statua e il ritratto in spalla [NUOVO: oggetti a quattro mani]; oggi «regge» (cassa).

## Sera (e i pezzi rivolti a te)

### 19. Il ladro senza spinta — `spingi_la_vespa`

**Quando e dove**: sera, all'angolo. Ore 18–23.5. Posto: angolo, sosta (soft). **Viene da te.**  
**Tipo**: crimine andato male, scelta  
**Ruoli**: `a` il ladro di Vespe (filtro young|m); `b` il padrone della Vespa (filtro adult|m)

- _Una Vespa in doppia fila. Il ladro di Vespe va verso il mezzo. Il ladro di Vespe armeggia._
- **il ladro di Vespe**: «Dai, bella. Dai. Non mi fare la stronza proprio adesso.»
- _Il ladro di Vespe guarda NINO (tu)._
- **il ladro di Vespe**: «Oi! Tu! Dammi una spinta, che s'è ingolfata!»
- **[NUOVO] SCELTA** (10 s; se non scegli: «Tira dritto») — **il ladro di Vespe**: «Due secondi, fra! Giuro che è mia!»
   1. **Spingi**
      - **il ladro di Vespe**: «Va! Va! Ti amo, fratello! Ti amo!»
      - _Il ladro di Vespe se ne va di corsa. Il padrone della Vespa va verso il punto della scena._
      - **il padrone della Vespa**: «La mia Vespa! E tu?! Tu spingevi!»
      - [NUOVO] _il padrone della Vespa insegue TE._
         - se ti prende:
            - **il padrone della Vespa**: «Adesso spingi me fino a casa, complice!»
         - se ti perde:
            - **il padrone della Vespa**: «Ti trovo! Ho la tua faccia stampata in testa!»
      - _[NUOVO] Il padrone della Vespa si ricorda di te (-2, «il complice»). [NUOVO] Il ladro di Vespe si ricorda di te (+1, «la spinta»)._
   2. **Grida «al ladro!»**
      - **NINO (tu)** [NUOVO]: «Al ladro! Al ladro!»
      - **il ladro di Vespe**: «Infame! Ti avevo chiamato fra!»
      - _Il ladro di Vespe se ne va di corsa. Il padrone della Vespa va verso NINO (tu)._
      - **il padrone della Vespa**: «Grazie! Tieni, mille lire. Che c'è? È solo una Vespa.»
      - _[NUOVO] Soldi +1 mila. [NUOVO] Il padrone della Vespa si ricorda di te (+1, «l'onesto»). [NUOVO] Reputazione ragazzi -1._
   3. **Tira dritto**
      - **il ladro di Vespe**: «Grazie, eh! Bel fratello! Spingo da solo!»
      - _Il ladro di Vespe spinge con forza. Il padrone della Vespa va verso il ladro di Vespe._
      - **il padrone della Vespa**: «Oi! Che fai con la mia Vespa?»
      - **il ladro di Vespe**: «Gliela porto dal meccanico! Gratis!»
      - **il padrone della Vespa**: «Ah. Grazie, sei gentile.»
      - **il padrone della Vespa**: «...Ma io non ho chiamato nessun meccanico!»
      - _il padrone della Vespa insegue il ladro di Vespe._
         - se lo prende:
            - **il padrone della Vespa**: «Meccanico, eh?! Adesso ti aggiusto io!»
            - _Rissa: il padrone della Vespa contro il ladro di Vespe._
         - se lo perde:
            - **il padrone della Vespa**: «Torna! Ladro di merda! Almeno lascia il casco!»

**Nota**: SCELTA. Spingi: il padrone ti insegue e ti ricorda (-2). Chiami: mille lire, i ragazzi ti chiamano infame. Tiri dritto: inseguimento fra loro.

### 20. Mani in alto, è una banana — `rapina_alla_banana`

**Quando e dove**: sera, davanti al tabacchi. Ore 18–21.5. Posto: vetrina, edicola (soft).  
**Tipo**: crimine andato male  
**Ruoli**: `a` il tabaccaio (filtro shop|adult); `b` il rapinatore (filtro young|m)

- _Il tabaccaio prende posto; il rapinatore prende posto (insieme). Il rapinatore guarda attorno, circospetto. Il rapinatore mano in tasca, minacciosa._
- **il rapinatore**: «Fermo! Rapina! Ho una pistola!»
- **il tabaccaio**: «Quella è una banana, {b}.»
- **il rapinatore**: «È una pistola a forma di banana! Esiste!»
- **il tabaccaio**: «Ti conosco da quando eri alto così. Ti pisciavi addosso qui davanti.»
- **il rapinatore**: «Zitto! Non dirlo forte! C'è gente!»
- **il tabaccaio**: «E l'anno scorso hai pianto perché il gratta e vinci non vinceva.»
- **il rapinatore**: «Basta! Dammi le sigarette o sparo!»
- _Il tabaccaio porge. Il rapinatore ha in mano: pacchetto._
- **il tabaccaio**: «Prendi le Nazionali e sparisci. Le segno a tua madre.»
- **il rapinatore**: «Grazie! Cioè... mani in alto! E grazie!»
- _Il rapinatore se ne va. Il rapinatore mangia._
- **il rapinatore**: «Comunque la pistola è buona.»

**Nota**: Due ruoli. Il tabaccaio lo conosce da bambino e lo sputtana; il pacchetto glielo dà comunque (sul conto della madre).

### 21. Il bacio sbagliato — `la_mano_sbagliata`

**Quando e dove**: sera, al dehors del bar. Ore 19–23.5. Posto: dehors.  
**Tipo**: Famiglia, rito  
**Ruoli**: `a` il fidato, seduto (filtro old|m); `b` lo zio (filtro adult|m); `c` il nipote emozionato (filtro young|m); `d` il barista (filtro shop|any)

- _Il fidato prende posto. Il fidato si siede. Il barista prende posto. Il barista si siede. Lo zio va verso il fidato; il nipote emozionato segue lo zio (insieme)._
- **lo zio**: «Dottore, le presento mio nipote. Bravo ragazzo. Non parla.»
- _Il nipote emozionato va verso il barista. Il nipote emozionato porge._
- **il nipote emozionato**: «Baciamo le mani, dottore!»
- **il barista**: «...Io faccio i caffè.»
- _Lo zio dà uno spintone._
- **lo zio**: «Non lui, deficiente! Quello è il barista!»
- **il nipote emozionato**: «Zio, m'hai detto quello seduto! Era seduto pure lui!»
- **il barista**: «Mi stavo riposando un secondo. Da stamattina.»
- **il fidato**: «Lascia stare. Il barista qua dentro conta più di me.»
- _Il nipote emozionato va verso il fidato. Il nipote emozionato porge._
- **il nipote emozionato**: «Baciamo le mani, dottore. Pure i piedi, se vuole.»
- **il fidato**: «Basta così, che mi consumi.»
- **il barista**: «Allora? Tre caffè?»
- **il fidato**: «Quattro. Uno al ragazzo, che trema.»
- **il nipote emozionato**: «Non tremo! Sono emozionato! È diverso!»
- _Il fidato paga 1 mila a il barista._

**Nota**: Quattro ruoli, nessuna conseguenza. Lo zio dà uno scappellotto al nipote (spinta). Il fidato paga i caffè (pay a→d 1).

### 22. Chi paga il giro — `chi_paga_il_giro`

**Quando e dove**: sera, al dehors del bar. Ore 19–23.5. Posto: dehors, bar_tv [NUOVO] (soft). **Viene da te.**  
**Tipo**: amici, scelta  
**Ruoli**: `a` quello che ha ordinato (filtro adult|m); `b` l'amico che paga sempre (dice lui) (filtro adult|m); `c` il terzo (filtro young|m); `d` il barista (filtro shop|any)

- _Quello che ha ordinato prende posto; l'amico che paga sempre prende posto; il terzo prende posto (insieme). Quello che ha ordinato si siede. L'amico che paga sempre si siede. Il terzo si siede. Il barista va verso quello che ha ordinato._
- **il barista**: «Allora, signori. Sei birre e tre panini. Diciottomila.»
- _Quello che ha ordinato armeggia._
- **quello che ha ordinato**: «Oh, cazzo. Il portafoglio. L'ho lasciato in macchina.»
- _Quello che ha ordinato si siede._
- **l'amico che paga sempre**: «Tu non ce l'hai, la macchina.»
- **quello che ha ordinato**: «Nella macchina di mio cugino!»
- **l'amico che paga sempre**: «Io pago sempre io! Sempre!»
- **il terzo**: «Tu? Tu hai pagato nel '78. Una gazzosa.»
- **l'amico che paga sempre**: «Era una gazzosa grande!»
- **il barista**: «Diciottomila. Chi paga?»
- **quello che ha ordinato**: «Paga lui, che ha bevuto di più!»
- **l'amico che paga sempre**: «Io ho bevuto per farvi compagnia!»
- **il terzo**: «Io ho preso solo un panino! ...E tre birre.»
- _Quello che ha ordinato guarda NINO (tu)._
- **quello che ha ordinato**: «Oi! Tu! Sei amico nostro, no? Da sempre!»
- **[NUOVO] SCELTA** (12 s; se non scegli: «Pago io») — **quello che ha ordinato**: «Dai, che ci conosciamo da... da prima.»
   1. **Pago io**
      - _[NUOVO] Soldi -18 mila._
      - **quello che ha ordinato**: «Ecco un amico vero! Domani ti rendo tutto!»
      - **l'amico che paga sempre**: «Non è vero. Non rende mai niente a nessuno.»
      - **il terzo**: «Già che paghi tu... un altro giro?»
      - _[NUOVO] Quello che ha ordinato si ricorda di te (+1, «il giro»). [NUOVO] Il barista si ricorda di te (+1, «pagatore»)._
   2. **Scappate!**
      - **NINO (tu)** [NUOVO]: «Ragazzi... scappate!»
      - _Quello che ha ordinato se ne va di corsa; l'amico che paga sempre se ne va di corsa (insieme)._
      - **il barista**: «Fermi! Ladri! Vi conosco tutti!»
      - _il barista insegue il terzo._
         - se lo prende:
            - **il barista**: «Tu! Adesso lavi i bicchieri fino a Natale!»
            - **il terzo**: «Io ho preso solo un panino!»
         - se lo perde:
            - **il barista**: «Vi conosco! E i panini erano di ieri!»
      - _[NUOVO] Il barista si ricorda di te (-1, «il complice»). [NUOVO] Reputazione ragazzi +1._
   3. **Paga lui (indichi chi ha ordinato)**
      - **NINO (tu)** [NUOVO]: «Paga lui. Ha il portafoglio nel calzino.»
      - **quello che ha ordinato**: «Infame! Come lo sai?!»
      - _Quello che ha ordinato armeggia._
      - **l'amico che paga sempre**: «Nel calzino! Da vent'anni! Lo sapevo!»
      - _Quello che ha ordinato paga 18 mila a il barista._
      - **il terzo**: «Allora prendiamo un altro giro! Paga il calzino!»
      - _[NUOVO] Quello che ha ordinato si ricorda di te (-1, «il calzino»)._

**Nota**: SCELTA. Tre amici, il conto, nessuno ha il portafoglio. Paghi tu: -18. «Scappate!»: il barista insegue il ragazzo. «Paga lui»: sputtani quello col portafoglio nel calzino. Sostituisce «L'applauso di Stato».

### 23. La fila al telefono — `una_cabina_sola`

**Quando e dove**: sera, alla cabina (o all'edicola). Ore 18–22.5. Posto: cabina [NUOVO], edicola, portone (soft).  
**Tipo**: lite pubblica, folla  
**Ruoli**: `a` l'uomo al telefono (filtro adult|m); `b` la signora in fila (filtro f); `c` il vecchio in fila (filtro old)

- _L'uomo al telefono prende posto. La signora in fila prende posto; il vecchio in fila prende posto (insieme). L'uomo al telefono al telefono._
- **l'uomo al telefono**: «...no, amore, sono al lavoro. ...Sì, di sera. Al porto.»
- **l'uomo al telefono**: «...è un turno speciale. ...Tutta la notte. Fino a domani.»
- _La signora in fila guarda l'orologio._
- **la signora in fila**: «Sono venti minuti! Ho mia madre all'ospedale!»
- **l'uomo al telefono**: «Un attimo, signora! ...No, amore, non è una donna! È una signora!»
- **l'uomo al telefono**: «...mia moglie? Quella non sa neanche dov'è la cabina.»
- **il vecchio in fila**: «Sua moglie la conosco. La cabina la sa benissimo.»
- **il vecchio in fila**: «Mi telefona tutte le sere. Alle dieci.»
- _Si forma un capannello di 4._
- **la folla**: «Ohhh!» oppure «Becco!» oppure «Metti la viva voce!»
- **l'uomo al telefono**: «...ti richiamo, che qui c'è il circo.»
- **l'uomo al telefono**: «Che cazzo guardate? Mai visto un uomo innamorato?»
- **la signora in fila**: «Sì. Di una alla volta.»
- **la folla**: «Ahahah!» oppure «Brava!» oppure «Questa la racconto al bar!»
- _Il vecchio in fila va verso il punto della scena. Il vecchio in fila al telefono._
- **il vecchio in fila**: «...Pronto, Gina? Sono io. Indovina chi ho davanti.»
- _L'uomo al telefono se ne va di corsa._
- **la folla**: «Corri!» oppure «Saluta la Gina!»
- **la signora in fila**: «Finalmente! ...Oh, cazzo. Chi mi presta un gettone?»

**Nota**: Folla di 4 + 3 ruoli. Posto «cabina» [NUOVO]. Il vecchio telefona alla moglie dell'uomo: chiude lui la scena.

### 24. In piedi per il Garante — `in_piedi_per_il_garante`

**Quando e dove**: alle 20, al dehors del bar con lo schermo. Ore 19.9–20.5. Posto: bar_tv [NUOVO], dehors (soft). **Viene da te.**  
**Tipo**: il discorso delle 20, folla, scelta  
**Ruoli**: `a` il barista (filtro shop|adult); `b` il vecchio che non si alza (filtro old|m); `c` la signora che lavora a maglia (un Orecchio) (filtro orecchio|old [NUOVO])

- _[NUOVO] Lo schermo col Garante si accende. Il vecchio che non si alza prende posto; la signora che lavora a maglia prende posto; il barista prende posto (insieme). Il vecchio che non si alza si siede. La signora che lavora a maglia si siede. Si forma un capannello di 5 (si siede)._
- **il barista**: «Sono le otto! In piedi, tutti! C'è il Garante!»
- _La folla aspetta._
- **la folla**: «Che palle, ogni sera...» oppure «Mi si è addormentata la gamba!» oppure «Togliti il cappello, cretino!»
- _Il barista si siede._
- **la folla**: «Oi! E tu? Tu sei seduto!»
- **il barista**: «Io ho le varici! Ho il certificato!»
- _Il vecchio che non si alza: ubriaco._
- **il vecchio che non si alza**: «Io non mi alzo! Io mi alzo solo per pisciare!»
- _La signora che lavora a maglia osserva._
- **la signora che lavora a maglia**: «Alzati, caro. Se no devo scrivere il tuo nome.»
- _Il barista guarda NINO (tu)._
- **il barista**: «E tu? Su o giù? Decidi, che lei scrive.»
- **[NUOVO] SCELTA** (10 s; se non scegli: «In piedi») — **il barista**: «Decidi!»
   1. **In piedi**
      - **la signora che lavora a maglia**: «Bravo, caro. Bravo.»
      - **il vecchio che non si alza**: «Pecora! Bella pecora in piedi! Beee!»
      - _[NUOVO] La signora che lavora a maglia si ricorda di te (+1, «in piedi»)._
   2. **Resta seduto col vecchio**
      - **il vecchio che non si alza**: «Ecco! Un uomo vero! Offro io! ...Cioè, offri tu.»
      - _La signora che lavora a maglia legge/scrive._
      - **la signora che lavora a maglia**: «Me lo segno, caro. Con affetto.»
      - _[NUOVO] La signora che lavora a maglia si ricorda di te (-2, «seduto»). [NUOVO] Reputazione risacca +1. [NUOVO] Il vecchio che non si alza si ricorda di te (+2, «seduto»)._
   3. **Stacca la spina**
      - _[NUOVO] Lo schermo col Garante si spegne. La folla si siede._
      - **la folla**: «Oh no! Un guasto!» oppure «Che peccato! Proprio stasera!» oppure «Un altro giro, allora!»
      - **il barista**: «Chi è stato?! Chi l'ha staccata?!»
      - **la folla**: «Il guasto.» oppure «È stato il guasto. L'ho visto.»
      - _La signora che lavora a maglia guarda NINO (tu)._
      - **la signora che lavora a maglia**: «Io ho visto tutto, caro. Ma dopo c'è il mio sceneggiato.»
      - _[NUOVO] La signora che lavora a maglia si ricorda di te (-1, «la spina»). [NUOVO] Reputazione quartiere +1._
- **il vecchio che non si alza**: «Domani staccatela prima, che c'è il varietà!»

**Nota**: SCELTA. Il barista ordina a tutti di alzarsi e resta seduto lui. In piedi: l'Orecchio approva. Seduto col vecchio: ti segna (-2). Stacchi la spina: tutti sollevati.

### 25. Il pezzo dell'Ape — `pezzo_dell_ape`

**Quando e dove**: giorno, dove un'Ape è in doppia fila. Ore 8–18.5. Posto: sosta, angolo, mercato (soft). **Viene da te.**  
**Tipo**: stand-up rivolto a te (sbruffone)  
**Ruoli**: `a` l'uomo dell'Ape (filtro adult|m)

- _Un'Ape in doppia fila. L'uomo dell'Ape va verso NINO (tu). L'uomo dell'Ape guarda NINO (tu). L'uomo dell'Ape indica._
- **l'uomo dell'Ape**: «Oi! L'hai vista la mia Ape? Settanta all'ora! In discesa! Col vento!»
- **l'uomo dell'Ape**: «Ieri ho superato una Mercedes! ...Era parcheggiata. Ma l'ho superata.»
- **l'uomo dell'Ape**: «Le donne si girano quando passo! ...Per il fumo nero, ma si girano.»
- _L'uomo dell'Ape allarga le braccia._
- **l'uomo dell'Ape**: «Al mercato mi chiamano il Ferrari! ...Mi chiamo io. Ma gira.»
- _L'uomo dell'Ape va verso il mezzo. L'uomo dell'Ape armeggia._
- **l'uomo dell'Ape**: «Parti! Dai, stronza! ...Oi, tu. Mi dai una spinta? Solo all'inizio.»

**Nota**: Pezzo (la stessa persona, la botta in fondo): si vanta dell'Ape, poi non parte e ti chiede una spinta. Nessuna conseguenza.

### 26. La famiglia per bene — `pezzo_della_suocera`

**Quando e dove**: giorno, alla fermata. Ore 8–19. Posto: fermata, pensilina, panchina (soft). **Viene da te.**  
**Tipo**: stand-up rivolto a te (benpensante)  
**Ruoli**: `a` il benpensante col cappotto buono (filtro adult|m); `b` il figlio (filtro young|m)

- _Il benpensante col cappotto buono va verso NINO (tu). Il benpensante col cappotto buono guarda NINO (tu)._
- **il benpensante col cappotto buono**: «Lei è giovane. Si vede che non ha una famiglia come la mia.»
- **il benpensante col cappotto buono**: «Mia moglie va in chiesa ogni giorno. Mio figlio studia. Ingegnere.»
- **il benpensante col cappotto buono**: «In casa nostra parolacce mai. Siamo gente per bene.»
- _Il figlio va verso il benpensante col cappotto buono._
- **il figlio**: «Oi, pa'! Dammi diecimila! Ho finito la vernice rossa!»
- _Il benpensante col cappotto buono guarda via._
- **il benpensante col cappotto buono**: «...Non lo conosco. Mai visto.»
- **il figlio**: «Pa'! Sono io! Quello ingegnere!»
- _Il benpensante col cappotto buono: rabbia._
- **il benpensante col cappotto buono**: «Vattene, stronzo, che mi rovini la reputazione, cazzo!»
- **il figlio**: «E mamma dice che stasera torna tardi. Dal parroco.»
- _Il figlio se ne va. Il benpensante col cappotto buono guarda NINO (tu)._
- **il benpensante col cappotto buono**: «Gente per bene, glielo dicevo. Lei non ha visto niente.»
- _Il benpensante col cappotto buono se ne va._

**Nota**: Pezzo a te, con l'ipocrisia che arriva in scena: si vanta della famiglia, passa il figlio, lui lo rinnega a parolacce. Nessuna conseguenza.

### 27. Il reduce e il braccio di ferro — `pezzo_del_reduce`

**Quando e dove**: sera, fuori dall'osteria. Ore 19–23.5. Posto: dehors, panchina (soft). **Viene da te.**  
**Tipo**: stand-up rivolto a te (reduce, ubriaco)  
**Ruoli**: `a` il reduce con il bicchiere (filtro old|m)

- _Il reduce con il bicchiere: ubriaco. Il reduce con il bicchiere ha in mano: bottiglia. Il reduce con il bicchiere va verso NINO (tu). Il reduce con il bicchiere guarda NINO (tu)._
- **il reduce con il bicchiere**: «Oi, tu! Lo sai chi sono io? Lo sai?!»
- **il reduce con il bicchiere**: «Nel '79 ho fatto scappare dodici Grigi. Da solo. A mani nude.»
- **il reduce con il bicchiere**: «Erano dodici! ...Va be', due. Uno era piccolo.»
- _Il reduce con il bicchiere beve._
- **il reduce con il bicchiere**: «Braccio di ferro! Dai! Ti spezzo come un grissino!»
- **il reduce con il bicchiere**: «Aspetta... prima mi siedo bene.»
- _Il reduce con il bicchiere cade._
- **il reduce con il bicchiere**: «Non sono caduto! Mi sono messo comodo!»
- _Il reduce con il bicchiere si rialza._
- **il reduce con il bicchiere**: «Offrimi da bere, che t'ho salvato la patria!»
- _Il reduce con il bicchiere se ne va._

**Nota**: Pezzo a te. Si vanta, ti sfida a braccio di ferro e cade dalla sedia. Se offri (un tasto «offri»: [NUOVO]) ti ricorda bene.

## Notte e alba

### 28. La vodka dell'Impero — `vodka_per_terra`

**Quando e dove**: all'alba del lunedì e del giovedì, sulla calata. Ore 5–8 · giorni lun, gio. Posto: calata, carico (soft). **Viene da te.**  
**Tipo**: Famiglia, folla, scelta  
**Ruoli**: `a` il soldato della Famiglia (filtro adult|m); `b` lo scaricatore (filtro m)

- _Un furgone in doppia fila. Il soldato della Famiglia va verso il mezzo. Il soldato della Famiglia ha in mano: cassa. Il soldato della Famiglia va verso il punto della scena. Il soldato della Famiglia cade._
- **il soldato della Famiglia**: «Cazzo! Cazzo! La vodka!»
- _Il soldato della Famiglia si rialza._
- **lo scaricatore**: «Io non ho visto niente! Io scarico e basta!»
- _Si forma un capannello di 6 (raccoglie)._
- **la folla**: «È caduta! È di nessuno!» oppure «Vodka gratis! Correte!» oppure «Ne prendo tre! Per mia suocera! Per disinfettare!»
- _Il soldato della Famiglia: rabbia. Il soldato della Famiglia indica._
- **il soldato della Famiglia**: «Giù le mani, stronzi! È della Famiglia!»
- **la folla**: «Quale famiglia? C'è scritto Impero!» oppure «Io sono di famiglia! Ho sei figli!» oppure «Allora prendo pure per i figli!»
- _Lo scaricatore raccoglie._
- **il soldato della Famiglia**: «Pure tu, {b}?!»
- **lo scaricatore**: «Io la salvo! La metto al sicuro! Nella giacca!»
- _Il soldato della Famiglia guarda NINO (tu)._
- **il soldato della Famiglia**: «Tu! Tienimi il furgone, che li ammazzo tutti!»
- **[NUOVO] SCELTA** (10 s; se non scegli: «Grida «i Grigi!»») — **il soldato della Famiglia**: «Allora? Ti muovi o resti lì come un palo?»
   1. **Tieni il furgone**
      - **il soldato della Famiglia**: «Bravo! Almeno uno che non ruba!»
      - _Il soldato della Famiglia allarga le braccia._
      - **il soldato della Famiglia**: «Chi ha preso, ha comprato! Diecimila a bottiglia! Domani passo!»
      - **la folla**: «Domani non ci sono!» oppure «Io sono morto stamattina!» oppure «Passa da mia cognata, paga lei!»
      - _[NUOVO] Reputazione famiglia +1. [NUOVO] Il soldato della Famiglia si ricorda di te (+1, «il furgone»)._
   2. **Prendi una bottiglia**
      - _[NUOVO] Ti resta in tasca: vodka._
      - **il soldato della Famiglia**: «Pure tu?! Ti ho visto! Ho visto la tua faccia!»
      - **lo scaricatore**: «Io ne ho prese due. Così siamo pari.»
      - _[NUOVO] Il soldato della Famiglia si ricorda di te (-2, «la vodka»)._
   3. **Grida «i Grigi!»**
      - **NINO (tu)** [NUOVO]: «I Grigi! Arrivano i Grigi!»
      - _La folla se ne va di corsa. Lo scaricatore se ne va di corsa._
      - **il soldato della Famiglia**: «Dove?! Dove sono?!»
      - _Il soldato della Famiglia guarda attorno, circospetto._
      - **il soldato della Famiglia**: «...Non c'è nessuno. Simpatico. Ci vediamo, simpatico.»
      - _[NUOVO] Il soldato della Famiglia si ricorda di te (-1, «lo scherzo»). [NUOVO] Reputazione ragazzi +1._

**Nota**: SCELTA, folla di 6 che saccheggia (scaricatore compreso). Tieni il furgone: Famiglia +1. Prendi una bottiglia: vodka in Tasca, lui ti ricorda (-2). «I Grigi!»: tutti scappano.

### 29. I baffi al Garante — `se_tu_fossi_il_garante`

**Quando e dove**: notte, al muretto o all'angolo. Ore 22–3 (dopo mezzanotte). Posto: angolo, panchina, cypher (soft).  
**Tipo**: ragazzi, notte, momento serio  
**Ruoli**: `a` quello che ha le idee (filtro young); `b` quello con la febbre (filtro young); `c` quello che si fa serio (filtro young); `d` quello con le scarpe nuove (filtro young|any)

- _Quello che ha le idee prende posto; quello con la febbre prende posto; quello che si fa serio prende posto; quello con le scarpe nuove prende posto (insieme). Quello che ha le idee si siede. Quello con la febbre si appoggia. Quello che si fa serio si siede per terra. Quello con le scarpe nuove fuma. Quello con la febbre: freddo._
- **quello che ha le idee**: «Chi ha il coraggio di fare i baffi al Garante? Lì, sul muro.»
- **quello con la febbre**: «Io! Io ce l'ho, il coraggio! ...Però ho la febbre.»
- **quello con le scarpe nuove**: «Io lo farei, fra. Ma ho le scarpe nuove.»
- **quello con la febbre**: «Vai tu, che l'hai detto!»
- **quello che ha le idee**: «Io? Io ho avuto l'idea! L'idea è la parte difficile!»
- **quello con le scarpe nuove**: «Allora l'idea falla tu, e i baffi pure.»
- **quello che ha le idee**: «Vaffanculo. Domani.»
- **quello che si fa serio**: «Mio padre ci ha scritto sopra, una volta. Poi non è tornato a cena.»
- **quello con la febbre**: «Pure lo zio di Totò.»
- **quello che ha le idee**: «Oi. Chi ha la siga?»
- **quello con le scarpe nuove**: «Io ho il tabacco. Le cartine no.»
- **quello con la febbre**: «E allora a che cazzo servi?»
- **quello con le scarpe nuove**: «Servo a farti compagnia, stronzo.»
- **quello che si fa serio**: «Vai a comprarle tu, le cartine. Sei il più veloce.»
- **quello con le scarpe nuove**: «Io? Ho le scarpe nuove, t'ho detto!»

**Nota**: Quattro ragazzi. La sfida: chi va a disegnare i baffi al Garante sul muro. Nessuno. Il momento serio non si commenta: si riparte con le cazzate.

### 30. Il marsigliese al pontile — `pezzo_del_marsigliese`

**Quando e dove**: notte, sulla calata o al pontile. Ore 22–4 (dopo mezzanotte). Posto: calata, carico, angolo (soft). **Viene da te.**  
**Tipo**: stand-up rivolto a te (Marsigliesi)  
**Ruoli**: `a` un marsigliese con la sigaretta (filtro marsigliese|adult [NUOVO])

- _Un marsigliese con la sigaretta va verso NINO (tu). Un marsigliese con la sigaretta guarda NINO (tu). Un marsigliese con la sigaretta fuma._
- **un marsigliese con la sigaretta**: «Toi! Vieni qua. Io ho una barca. La più grande del porto.»
- **un marsigliese con la sigaretta**: «A Marsiglia ho tre donne. Qui neanche una. Siete brutti, tutti.»
- **un marsigliese con la sigaretta**: «Il vostro caffè fa schifo. Il vostro vino fa schifo. Voi pure.»
- **un marsigliese con la sigaretta**: «Ti porto a Marsiglia. Centomila. Solo andata, che qua non torni.»
- _Un marsigliese con la sigaretta guarda via._
- **un marsigliese con la sigaretta**: «...Merde! La mia barca! Partono senza di me!»
- **un marsigliese con la sigaretta**: «Attendez! Aspettate, bastardi! I soldi ce li ho io!»
- _Un marsigliese con la sigaretta va via di corsa._

**Nota**: Pezzo a te: si vanta e disprezza tutti, poi la barca parte senza di lui. Filtro «marsigliese» [NUOVO] (o il cast: marcel). [NUOVO] aggancio a una missione per Marsiglia.

### 31. L'ultima corsa — `ultima_corsa_dell_autobus`

**Quando e dove**: notte, alla fermata prima dell'Ora Quieta. Ore 21.5–23.5. Posto: fermata, pensilina (soft).  
**Tipo**: folla, notte, Grigi  
**Ruoli**: `a` l'autista (sceso a fumare) (filtro adult|m); `b` l'infermiera del turno di notte (filtro f); `c` il ragazzo senza biglietto (filtro young); `d` il Grigio dell'Ora Quieta (filtro cop)

- _L'autista prende posto; l'infermiera del turno di notte prende posto; il ragazzo senza biglietto prende posto (insieme). Si forma un capannello di 5 (aspetta). L'autista fuma._
- **l'autista**: «Ultima corsa! Chi c'è c'è! Chi non c'è dorme qua!»
- **l'infermiera del turno di notte**: «Parta, per favore! Attacco alle dieci all'ospedale!»
- **l'autista**: «Prima la sigaretta. Senza, guido come un cane.»
- **la folla**: «Sbrigati, che arriva l'Ora Quieta!» oppure «Spingi, nonna! Spingi!» oppure «Prima io! Io il biglietto ce l'ho!»
- **il ragazzo senza biglietto**: «Capo, il biglietto lo pago domani! Giuro!»
- **l'autista**: «L'hai detto pure ieri. E l'altro ieri.»
- **il ragazzo senza biglietto**: «E infatti sono tornato! Sono di parola!»
- _Il Grigio dell'Ora Quieta va verso il punto della scena. Il Grigio dell'Ora Quieta indica._
- **il Grigio dell'Ora Quieta**: «Fermi tutti! Conto. Uno, due... troppi! Siete troppi!»
- **il ragazzo senza biglietto**: «Signora, mi faccia passare per suo figlio. ...Mamma!»
- **l'infermiera del turno di notte**: «Io non ho figli! E se li avevo, non così brutti!»
- _a caso (25%):_
   - **il Grigio dell'Ora Quieta**: «Tu! Senza biglietto! Vieni con me!»
   - _Il ragazzo senza biglietto alza le mani. Il ragazzo senza biglietto viene portato via (fermo)._
- _altrimenti:_
   - **il Grigio dell'Ora Quieta**: «Salite! Tutti! Subito! E zitti fino al capolinea!»
- **l'autista**: «Avete sentito? Su! Su! E chi vomita, scende!»
- _L'autista va via; l'infermiera del turno di notte va via (insieme)._

**Nota**: Folla di 5 che spinge per salire. Il ragazzo prova a passare per figlio dell'infermiera; al 25% il Grigio lo trattiene. L'autobus vero [NUOVO]; oggi l'autista basta.

---

## Le dieci battute migliori
1. «Il malinteso ha il rossetto e abita al quarto!» (la moglie, *Le cravatte dal terzo piano*)
2. «Io? Io aspettavo il 9! Manco li conosco!» (il capopopolo, *Il comitato del 9*)
3. «Hai tirato tu, vai tu.» «Il pallone è tuo. Vai tu, è roba tua.» (*Il pallone dei Grigi*)
4. «Mi allacciavo la scarpa!» «Hai le scarpe con lo strappo, coglione.» (*Il più coraggioso del quartiere*)
5. «M'hai mangiato la multa! Il blocchetto lo pago io!» (il Grigio, *La multa mangiata*)
6. «Io! Io ce l'ho, il coraggio! ...Però ho la febbre.» (*I baffi al Garante*)
7. «Fermo! Mani in alto! Cioè no, documenti!» (il Grigio al primo giorno, *Il primo fermo*)
8. «Tu? Tu hai pagato nel '78. Una gazzosa.» «Era una gazzosa grande!» (*Chi paga il giro*)
9. «Erano dodici! ...Va be', due. Uno era piccolo.» (il reduce, *Il reduce e il braccio di ferro*)
10. «Vattene, stronzo, che mi rovini la reputazione, cazzo!» (il benpensante, *La famiglia per bene*)
