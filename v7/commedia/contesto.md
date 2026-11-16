# Il contesto delle battute (commedia.js §9, dietro `?commedia`)

La nota della direzione artistica: «le frasi non devono dirle a caso, tipo Marta che dice "ma chi ti ha dato la patente", però non ci sono auto».
Quello che uno dice dev'essere vero di quello che ha intorno o di quello che è appena successo.

Come funziona: ogni fumetto passa dal setter `bark` di commedia.js. Prima della durata e del ritmo, `CX.gate` guarda se la frase
(per testo esatto o per regex) ha una condizione; se la condizione è falsa:

- **chiacchiera di fondo** (`fondo`, `voce`): la sostituzione scritta per quella frase, o una frase della stessa voce che il contesto non lo chiede; se non c'è, si tace;
- **a Nino / a caldo** (`te`, `caldo`): la sostituzione scritta; se non c'è, si tace;
- **scena recitata** (`scena`): solo le condizioni chiare (l'ora, il sole, i mezzi, i Grigi); si cambia il minimo e, senza sostituzione scritta, la battuta resta com'è;
- **i matti e i frammenti a due voci**: sono racconti («Ho preso la patente!»), niente condizioni.

Anche il ripescaggio delle grida di combattimento (§1) pesca solo frasi con la condizione vera.
I conti: `Commedia.stats.contesto` (`fuori`, `cambiate`, `tolte`, `lasciate` per regola).

## Le condizioni (dallo stato del gioco)

| condizione | vera quando |
|---|---|
| `veicolo` | un mezzo (non barca) che si muove a più di 1,5 m/s entro 15 m; o il giocatore al volante entro 15 m; o chi parla è appena stato investito (`lastHitByCar` < 12 s); o è sceso dalla macchina sfasciata (`driverOf`); o un `investimento`/`incidente` entro 25 m negli ultimi 25 minuti di gioco |
| `macchina` | `veicolo`, o una macchina (anche ferma) entro 15 m |
| `parte` | un mezzo che si muove entro 40 m, o un autobus |
| `sfreccia` | `veicolo`, o il giocatore che corre entro 6 m |
| `numero` | il giocatore entro 22 m in sella, o un trick/caduta in BMX negli ultimi 6 s |
| `mare` / `vedeMare` | acqua di mare entro 60 m / 110 m |
| `pioggia` | mai (il gioco non ha meteo: è sempre inverno); se un giorno ci sarà `st.meteo.pioggia`, vale quello |
| `caldo` | solo dentro (o `st.meteo.caldo`) |
| `sole` | fra le 8 e le 16, fuori |
| `luna` | dalle 18 alle 6, fuori |
| `mattino` / `sera` / `tardi` / `buio` | 4–14 / 13–4 / 20–5 / 17–7 |
| `bar` | un bar, osteria, birreria, trattoria, circolo, discoteca entro 25 m |
| `chiesa` | una chiesa o il santuario entro 40 m (o un prete dentro) |
| `banco` | al mercato (l'attività), in piazza o al Banco dei fiori (40 m), o una bottega di generi entro 15 m |
| `bottega` | una bottega o un locale entro 30 m |
| `grigi` | un Grigio vivo, fuori, entro 80 m |
| `cercato` | il giocatore è ricercato, o `grigi` |
| `spari` | uno sparo negli ultimi 15 s, chi parla è nel panico, o spari/omicidio/esplosione entro 90 m da poco |
| `sparato` | uno sparo negli ultimi 30 s o chi parla è ferito |
| `colpito` | chi parla è ferito (o colpito negli ultimi 8 s) |
| `macchinaSparata` | `macchina` e `sparato` |
| `botto` | un'esplosione entro 140 m da poco, o un fuoco entro 60 m |
| `nino` | il giocatore entro 9 m, fuori come chi parla |
| `ascolta` | un altro entro 4,5 m, o il giocatore entro 8 m (chi è dentro casa ha la sua gente) |

## Le frasi legate al contesto

56 frasi delle banche (game.js, popolo.js, azioni.js, matti.js, convivenza.js, scambi.js, eventi.js, commedia.js), più ogni chiacchiera di fondo col «tu» o con una domanda.
Le regex prendono anche le frasi nuove (e quelle dell'IA) che dicono la stessa cosa.

| regola | frasi (esempi esatti) | condizione | se è falsa |
|---|---|---|---|
| patente | «Chi ti ha dato la patente?!» (azioni.js, incidente), «Ma chi ti ha dato la patente, tua madre?!» (battute.md) | `veicolo` | «Ma sei scemo?!»; di fondo si tace |
| la mia macchina | «Guarda cosa hai fatto alla mia macchina!», «Mi hai rigato la portiera!», «Quello è il mio posto da vent'anni!» (scena del parcheggio, *soft*), «Sbrighiamoci, ho la macchina in seconda fila!», «Copri tu, Ferri! Io copro la macchina!» | `macchina` | «Guarda cosa hai fatto!»; «Ieri mi hai rigato la portiera! Ti ho visto!»; nel combattimento un'altra frase |
| guidare | «guidi come…», «sai guidare», «clacson», «non frena», «mi stavi investendo» | `veicolo` | si tace |
| guarda dove vai | «Guarda dove vai!», «Oh! Guarda dove vai!», «Ao, piano!» (game.js scansano, scena della bici) | `sfreccia` | «Mannaggia!» |
| l'autobus che parte | «Ferma! Devo salire!» (scena dell'autobus, *soft*) | `parte` | «Aspetta! Aspettaaa!» |
| il numero in bici | «Uh, che volo.», «Rifallo!», «Si è stampato.», «Si romperà l'osso del collo.» | `numero` | si tace |
| esco in mare | «Spostati, che esco in mare! Alle tre!…» (voce di notte del pescatore), «abboccano!» | `mare` | «Alle tre mi alzo per uscire in mare…» |
| si vede il mare | «Il mare oggi è color ferro.» (popolo.js) | `vedeMare` | «Stamattina sulla caletta c'era il ghiaccio.» |
| pioggia | «piove», «sta piovendo», «sotto la pioggia» (non «Non piove.», «piove dentro», «piove pesce», «alla prima pioggia») | `pioggia` | «Che freddo, eh?» |
| caldo | «che caldo», «fa caldo», «sto sudando» | `caldo` | «Che freddo, eh?» |
| sole | «Oggi si vende, c'è il sole.», «Le sue lenzuola mi coprono il sole!», «Buongiorno! Bella giornata, eh?» | `sole` | «…me lo sento.», «…la finestra!», «Buonasera! Che freddo, eh?» |
| luna | «Guarda che luna.» | `luna` | «Guarda che cielo.» |
| buongiorno / buonasera / buonanotte | «Buongiorno.» (manie, sedia con le rotelle), «Buongiorno a tutti!», «Buongiorno! Già aperto?», «Buonasera, signora Rosa.», «Buonasera.» | `mattino` / `sera` / `tardi` | il saluto giusto per l'ora |
| il riflettore | «Torre due, il riflettore!…» (Tutela) | `buio` | un'altra frase di combattimento |
| il bicchiere | «Ancora un bicchiere e vado…» (voce di notte) | `bar` | un'altra frase di notte |
| l'offerta in chiesa | «Offerte! Lasciatele lì, col cestino non giro.» | `chiesa` | un'altra frase da prete |
| il banco | «A quanto le vende?», «Ieri costavano meno.», «Che belle, oggi.» | `banco` | si tace |
| la vetrina | «Rocco, non sulla vetrina!…» (Squalo) | `bottega` | un'altra frase di combattimento |
| i Grigi qui | «Ecco i Grigi, in piazza. Di nuovo.» (scena dello stenditoio) | `grigi` | «Pina! Pina! Il sugo!» |
| i Grigi ti cercano | «Stai attento, che i Grigi ti cercano.» (game.js maybeBark), «Togliti di qui, è pieno di Grigi che chiedono di te.» (convivenza) | `cercato` | «Stai attento, che qui si sa tutto.» |
| gli spari | «Tutti giù!», «Mettetevi al riparo!», «Sparano!» | `spari` | si tace |
| il botto | «che botto», «è saltato in aria» | `botto` | si tace |
| colpito | «M'hai preso, stronzo!…», «Didier, il m'a touché!…», «Mi ha sparato! A me!…» | `colpito` | un'altra frase di combattimento |
| colpi | «Mi hai bucato il cappello!…», «…la divisa nuova», «Mon pantalon!…», «Centrale, colpi d'arma da fuoco!…», «Ogni colpo è un verbale…» | `sparato` | un'altra frase di combattimento |
| la mia macchina, sparata | «T'as tiré sur ma voiture?!…» | `macchinaSparata` | un'altra frase di combattimento |
| detta a Nino | le voci di notte rivolte a Nino: «Nino! Che ci fai qui di notte?…», «Rientra, scemo! …Ah, sei Nino.», «Ehi, ragazzo! Ho perso le chiavi!…», «Toi! Non hai visto niente!…», «Zio, pure tu fuori?…», «Ehi! È l'Ora Quieta!…», «Che fai in giro?! Documenti!…» | `nino` | una frase di notte di fondo |
| a qualcuno | le chiacchiere di fondo con una domanda o il «tu» («Hai visto la partita?», «Zio, stasera usciamo?», «Stasera scopa all'osteria, vieni?», «Oh, c'hai da accendere?», «Ti faccio una foto, stai fermo.») | `ascolta` | una frase da soli («Mah.», «Che giornata.», «Dove ho messo le chiavi…») |

Non sono legate: «Che freddo, eh?» (è sempre inverno), «Stamattina alla punta abboccavano.» e le altre al passato (le ha viste prima),
«La Vespa fa un rumore strano.» (la sua), le frasi di notte/giorno già sistemate da §7.

## La misura (test_commedia.js, seme 1)

Ogni fumetto nuovo, in tutta la città, misurato col metro qui sopra:

| | piazza, 400 s di giorno | giro di sera (calata, molo, bar, chiesa, piazza, pontile, marina), 300 s |
|---|---|---|
| spento | 9 fuori contesto su 626 (6 entro 26 m) | 19 su 430 (4 entro 26 m): il «Buongiorno.» delle manie la sera, le domande a nessuno |
| acceso | 0 su 235 | 0 su 252 |
