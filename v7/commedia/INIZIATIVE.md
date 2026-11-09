# Le iniziative libere: estri, muri che brulicano, la base nel bosco, la catena (9 novembre)

La richiesta della direzione artistica:
«anche la libera intenzione di fare cose che rompono lo schema, simpatiche, e dire e chiedere agli altri cose del genere, per
rendere il tutto imprevedibile e causare curiosi effetti a catena; e i graffiti li devono fare anche, devono diventare qualcosa
di brulicante, che nel tempo prende iniziativa. Anche costruire la base nel bosco e altre cose del genere o usare il crafting per
rispondere alle proprie necessità, tutto possibile».
E poi: «senza appesantire, come strato ulteriore sul lavoro che c'è»; «nel rumore si producano anche iniziative nuove, non
scriptate, e organiche in sviluppo»; «effetti a catena, a farfalla».

Tutto sta in **`src/iniziative.js`**, dietro `?commedia`, caricato dopo `vita.js`, fuori dall'impronta dei tasselli.
Nessun altro file di `src/` è toccato. Spento il flag: `Iniziative = { ON: false }` e nessun aggancio.
La prova è `src/test_iniziative.js`.

**In una riga.** Un abitante si mette in testa una cosa (la lotteria, la fila per niente, la corsa delle carriole, la capanna nel
bosco), lo chiede agli altri, ci vanno davvero, succede davvero con i sistemi che ci sono, e quello che è successo diventa il
motivo della cosa dopo. Prima il fatto, poi la parola.

---

## 1. Cosa c'era e cosa si guida da fuori

| sistema | cosa c'è già | cosa fa `iniziative.js` |
|---|---|---|
| `azioni.js` `startPlan` / `endPlan` / `social` / `quarrel` | i piani a passi (andare, fare per N minuti, verificare), le partite, le offerte, le liti | ogni iniziativa è un piano vero per chi la organizza e per ogni invitato; i giochi, i giri offerti, le liti passano da `social` e `quarrel` |
| `popolo.js` `note`, `_.paintWall`, `_.sketchFor`, `arrest`, i diari | il diario, il muro dipinto dagli abitanti (la voce «X ha dipinto un muro»), il fermo | i testimoni e chi c'era se lo segnano; la fontana dipinta e il cartello falso sono `paintWall` veri; l'imitazione del Garante o la protesta possono finire in un fermo |
| `scambi.js` `take` / `put`, `economia.js` `buy` / `price` | la roba nelle tasche e in casa, le botteghe con le scorte | premi, vendite, baratti, regali, la spesa per una ricetta: tutto passa di mano davvero |
| `oggetti.js` `RECIPES` (142 ricette), `CAT` | raccogliere, fare, smontare: per il giocatore (`craft`) e per chi lavora (`produceHour`) | una **prova a secco** (`procura`) trova come procurarsi una cosa: raccoglierla (il posto e l'attrezzo della ricetta), farla (gli ingredienti, la postazione di casa), comprarla, farsi prestare l'attrezzo. Poi la fa davvero, con gli stessi numeri della ricetta |
| `cantiere.js` `BY`, `footprint`, `inCity`, `st.covo.obj` | il catalogo (falò, capanna tonda, tenda, amaca, striscione…) e il disegno degli oggetti del covo | la costruzione di un abitante è un oggetto vero del catalogo, fuori città, con le caselle solide, il cantiere aperto (`wip`) finché lavora, pagato con la sua roba; segnato `o.npc` (non è del giocatore: nessun covo suo, nessuna base della Risacca, `orienta.js` non svela niente) |
| `writer_vita.js` `mission` / `bombing` / `freeSite`, `writing.js` `npcWork` / `_.addWork` / `S().works` / `grow` | le uscite di notte, il palo, i Grigi che interrompono, le tag di giorno, la storia dei muri | le crew decidono la notte da sole (§3); **la distribuzione dei graffiti alla nascita della città non si tocca** (né `strada_dipinta.js` né il piazzamento di `writing.js`) |
| `matti.js` `S().q`, `commedia.js` regia e contesto | la fila dei frammenti a due voci, il ritmo, il cancello del contesto | le battute vanno nella nostra fila, con un'ombra nella fila di matti: la regia le tratta come un frammento (la seconda voce solo se è uscita la prima) e i frammenti inventati aspettano |
| `vita.js` `fatto` / `catena` / `scambio` / `registraIntento` | il registro dei fatti condiviso, gli scambi fra due | ogni fatto va anche in `Vita.fatto` (con la causa); gli scambi fra due che non sono in un'iniziativa (il prestito, la buca rinfacciata, la rivincita) li mette in scena `Vita.scambio` |
| `parola.js` `promette` | il cane da guardia | una battuta che dice «ci sto», «vengo», «va bene» esce solo con un sì vero |

**Cosa era «sospeso»** (`REGIA_COMMEDIA.md` §1): il cantiere, il crafting, la base. Funzionano, ma solo per il giocatore e si
svelano alla prima base. Qui li usano gli abitanti, con il loro stato, senza cambiare il percorso del giocatore.

---

## 2. Gli estri: atomi, prova a secco, invito, fatto

**Gli atomi.** Un'iniziativa è una composizione: **verbo × oggetto × posto × motivo × forma**.
- **I verbi** (diciotto, tutti cose che il motore fa davvero): lotteria, vendi, gara, gioca, fila, esibisci, protesta, corteo,
  dipingi, colletta, pesca, raccogli, fabbrica, costruisci, tavolata, tesoro, baratto, tuffo, offri, regala.
- **Gli oggetti** sono quelli che ci sono: la roba nelle tasche di chi la pensa, le ricette, il catalogo del cantiere, e le cose
  che non sono oggetti («la vista sul mare», «l'aria in barattolo», «il ritratto»: soldi veri, nessuna roba inventata).
- **I posti** del verbo (le piazze, il molo, i bar, il bosco); a volte quello sbagliato, apposta (`strano`): la tavolata al
  Ministero è comica proprio perché è vera.
- **Il motivo** viene dal carattere e dai bisogni (rabbia, fame, noia, compagnia, avidità) o da un fatto (§4).
- **La forma**: da solo, con un amico, la folla, la sfida.

**La prova a secco.** Prima di partire si prova tutto: c'è il premio, c'è la roba (o il modo di procurarsela, passo per passo),
c'è il traguardo, c'è a chi cantare la serenata, c'è un posto libero nel bosco. Se manca qualcosa l'iniziativa non nasce (mai a
metà). Lo stesso cancello vale per quelle scritte, quelle composte, le copie e quelle chieste all'IA.

**Il giro.**
1. Il fatto «X si è messo in testa Y» (nel diario).
2. Gli inviti. Chi accetta lo decidono amicizia, simpatia, noia, paura, il lavoro. Vicino al giocatore si chiede a chi è lì, in
   faccia, e un solo invito si sente. Chi lascia il banco per venire lascia davvero la bottega vuota (un fatto); chi aveva un
   appuntamento a quell'ora gli dà buca (un fatto, e l'altro se lo segna).
3. Ci vanno (piani di `Azioni`): da vicino si vede camminare, da lontano si arriva col tempo di strada.
4. Il via, la cosa, la fine: l'effetto vero (soldi, roba, muri, ricette, cantiere, liti, fermi). Se chi l'ha pensata si ferma,
   uno di quelli lì la porta avanti (solo dove non serve la roba sua).
5. I Grigi: vedono la folla entro 30 m (60 per la protesta) e la sciolgono. Può diventare **vietata**: dopo, la stessa cosa si
   rifà **di nascosto** (di notte, alla discarica, alla grotta, al magazzino).
6. Le battute della fine, le note di chi ha visto, la voce che gira (il diario passa già da `Popolo.share` e dal coro).

**I tetti** (senza appesantire): una decisione ogni 10 minuti di gioco; in media ~22 iniziative al giorno in città; al massimo 2
vive entro 120 m dal giocatore e 7 in tutto; le battute solo entro 22 m, al massimo due scambi in attesa, col ritmo della regia.
Il costo misurato nella prova è 0,02 ms a passo di media (§7).

**I 25 estri scritti** (gli atomi fissati e le battute loro): la lotteria della capra (solo se una capra vera c'è), la fontana
dipinta, la fila per niente, la corsa delle carriole, la pesca di notte con la lampada (fatta con la ricetta), la vendita della
vista sul mare, la protesta per la panchina, la serenata, la processione finta, il torneo di scopa, il comizio sulla cassetta, il
mercatino del baratto, il tuffo di dicembre, la tavolata nel vico, il concerto di pentole, i ritratti a mille lire, la colletta,
l'aria di mare in barattolo, la caccia al tesoro, il battesimo della barca, la gara di bugie, il cartello falso, l'imitazione del
Garante, il fuoco nel bosco, la legna per la vedova.

Le battute stanno sotto i 70 caratteri, nelle strutture di `TONO.md` (chi si sputtana, la priorità sbagliata, la vanteria, il
dettaglio fuori luogo, la risposta secca), e si riempiono coi fatti veri: chi ha vinto, quanto, cosa.

---

## 3. Le iniziative nuove e la loro vita (il meme)

Oltre agli estri scritti, la maggior parte nasce **composta**: un verbo, un oggetto vero, un posto, un motivo. Il nome viene dagli
atomi («la corsa delle carriole», «la caccia al salame», «il banco delle castagne», «la tenda nel bosco»).

Ognuna ha una piccola memoria (`st.ini.memi`, al massimo 60): nome, origine (scritta, composta, copia, seguito, bisogno, IA,
fusione), il padre, la generazione, quante volte, quante riuscite, il massimo di gente, l'ultima volta, la forza.
- **Si copia.** Chi ha visto o c'era la rifà il giorno dopo, **cambiata**: un altro oggetto, un altro posto, il posto sbagliato,
  un'altra cosa con la stessa gente, di notte. La copia è figlia (generazione +1).
- **Cresce.** Tre riuscite con almeno tre persone: diventa **fissa**, col suo giorno («la corsa delle carriole del giovedì») e chi
  c'era la rifà quel giorno a quell'ora.
- **Si sfida o si fonde.** Due uguali nello stesso posto si sfidano; due diverse si fondono una volta («il tuffo d'inverno con
  mercatino del baratto»), poi chi arriva si aggiunge.
- **Svanisce.** Senza gente perde forza; la forza cala ogni mattina; dopo quattro giorni senza nessuno si dimentica.
- **Va sotto terra** quando i Grigi la vietano.

**La Mente (facoltativa, spenta).** `Iniziative.CFG.ia`: con `'finta'` (le prove) la proposta viene dagli atomi come la darebbe
il server; con `true` si chiede a `/api/mente` `{ kind: 'iniziativa', atomi }` e la risposta JSON `{ verbo, oggetto, posto,
motivo, nome }` passa dalla stessa prova a secco. **Manca sul server** il `kind: 'iniziativa'` (`server.js`, `api/_mente.js`):
oggi risponde con l'errore e non succede niente.

---

## 4. La catena (l'effetto farfalla)

Ogni fatto ha una causa: `{ id, tipo, chi, d, dati, causa, hop, t }`, lo stesso formato di `Vita.fatto` (dove viene copiato,
`f.vid`). `Iniziative.catena(st, id)` e `catenaTesto` danno la catena; `Iniziative.sentito(st)` le ultime, in una riga, per il
Taccuino «Sentito dire».

Un fatto può diventare il motivo della cosa dopo (con il calo: probabilità × 0,6 per salto; al massimo 16 seguiti al giorno):

| il fatto | il seguito |
|---|---|
| vince un oggetto (lotteria, tesoro) | lo rivende, lo rimette in lotteria, lo nasconde |
| perde la gara | chiede la rivincita (scambio) o ne organizza un'altra |
| vince soldi, vende | offre un giro al bar |
| la lite (il baccano delle pentole) | la scritta sul muro, la protesta |
| il banco lasciato | la fila davanti alla bottega vuota |
| la buca | il rancore, rinfacciato in faccia (via `Vita.scambio`) |
| l'attrezzo non reso | il rancore |
| i Grigi, il divieto | la stessa cosa, di nascosto |
| il fermo | la colletta, la protesta, l'omaggio sul muro della crew |
| la colletta | il debito con lo Squalo pagato (soldi veri) |
| la legna, il pesce, le castagne | li porta alla vecchia del palazzo, o li vende al mercato |
| la capanna, il fuoco | un amico costruisce accanto, la tavolata nel bosco |
| un muro dipinto, crossato, ripulito | la crew risponde, i Grigi chiedono chi è stato (§5) |

Esempio di catena (dalla prova): *il mercatino del baratto → 6 alla Sala giochi → 2 scambi → i Grigi lo sciolgono → vietato → il
mercatino del baratto (di nascosto) alla Discarica → diventa fisso: ogni lunedì*.

---

## 5. I muri che brulicano

Le crew (PVK, BDS, TNT) e i loro writer ci sono già, con le uscite di notte di `writer_vita.js`. In più, ogni sera alle 21:30 ogni
crew decide la sua notte:
1. **Risponde**: se un suo pezzo è stato crossato, va a crossare un pezzo di chi l'ha fatto; se i Grigi gliel'hanno ripulito,
   lo ripassa sullo stesso muro, più grosso.
2. **L'omaggio**: se qualcuno è finito dentro, «LIBERO X» su un muro libero.
3. **Il beef**: le guerre (PVK e BDS di partenza, e quelle nate dai crossaggi) diventano crossaggi veri (`w.crossed`, la tag
   sopra con `over`).
4. **La zona**: una passeggiata a bombare (`WriterVita.bombing`).

Di giorno **i Grigi ripuliscono** (i muri vicino ai palazzi del regime, alla piazza, alla chiesa, le scritte, i crossaggi freschi):
l'agente vicino ci va col solvente (`w.erased`, `w.buffed`), lontano a conti fatti. **I toy copiano**: una tag accanto a quella
nuova di una crew. Ogni fatto dei muri spinge un poco `W.grow` (la scena cresce nel tempo: più writer, più uscite).
Vicino al giocatore il pennello è un passo vero (la mano, la vernice che cresce); lontano a conti fatti.

**Cosa manca nei file degli altri** (senza, si va avanti così):
- `writer_vita.js` non esporta `paintStep`/`start`: qui c'è un pennello nostro, più semplice (niente nebbia di vernice).
- `writing.js` disegna il crossaggio (`crossOut`) solo se `w.crossed` c'è prima che il pezzo sia disegnato fino in fondo: un
  crossaggio su un pezzo già disegnato si vede come la tag nuova sopra, ma la riga che lo cancella non c'è. Serve una riga che
  rimetta `g.crossDrawn = false` / ridisegni quando `w.crossed` arriva dopo.
- La «toppa grigia» del buff (`STYLES.buff`) esiste solo con `?stile=E`: il muro ripulito sparisce, senza la toppa.

---

## 6. I bisogni: la legna, il cibo, la capanna

Ogni mezz'ora di gioco (dalle 7 alle 16) si guardano dodici abitanti, a turno:
- **freddo**: niente legna in casa → «la raccolta della legna» (ricetta `x_legna` alla pineta, con l'ascia sua, prestata da un
  vicino o comprata);
- **fame** senza soldi: le castagne (`x_castagne`) o la pesca (`x_pesca`, la canna prestata);
- **riparo** (giovani, disoccupati, chi ama la campagna o il mare; raro, al massimo 10 in città): la capanna tonda, la tenda o il
  fuoco nel bosco. La roba si procura con le ricette e le botteghe; si costruisce col catalogo del cantiere, fuori città.

Gli attrezzi prestati si rendono alla fine (un fatto); se no il rancore.
Cosa dicono è vero: «Mi presti l'ascia? Te la rendo stasera.» esce solo dopo il prestito, «Finito! La tenda è mia.» solo
quando l'oggetto c'è.

**Cosa non si guida**: lo scavo (`livelli.js`, `sottosuolo.js`) resta del giocatore (le sue API lavorano sulla posizione del
giocatore); il baule e le scorte delle basi della Risacca non si toccano.

---

## 7. Prestazioni

- Una decisione ogni 10 minuti di gioco; la sorveglianza dei Grigi una volta al secondo sulle iniziative vive (al massimo 7).
- Le battute solo entro 22 m dal giocatore; i piani lontani li fa `Azioni` col tempo di strada.
- Il registro: 500 fatti, 60 memorie, 400 battute.
- Le decisioni vanno a turno (ogni 5 minuti di gioco: decidere, più uno fra bisogni, la sera delle crew, il giorno dei muri);
  un seguito e una copia per giro al massimo.
- Misurato nella prova (Node, 2–3 giorni, semi 1 e 2): 0,02 ms a passo di media. Il passo più caro arriva a 10–40 ms una
  volta ogni tanto (una decisione con le prove a secco e gli inviti; in Node ci cade dentro anche la raccolta della memoria):
  da guardare nel browser con il banco dei tempi.

## 8. Le decisioni aperte

1. Quante al giorno (`CFG.pGiorno` 22) e quante vicine (2)?
2. Le iniziative «nel posto sbagliato» (12% delle composte): comiche o troppe?
3. La capanna nel bosco: il giocatore la vede e ci entra, ma non può usarla come covo. Va bene così, o un abitante amico può
   offrirgliela (un sì vero, con `Vita.scambio`)?
4. Il server: aggiungere `kind: 'iniziativa'` alla Mente?
5. Le due righe nei file dei writer (§5).
