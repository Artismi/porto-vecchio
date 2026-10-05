# Porto Vecchio — Gli NPC hanno uno scopo visibile (5 ottobre)

Segnalazione: «gli NPC vanno in giro a caso, nessuno lavora, nessuno in casa». La vita (popolo.js) li faceva già andare al lavoro, a casa, al bar, ma non si vedeva:
- chi arrivava in un edificio diventava invisibile, e gli interni non disegnavano mai nessuno (`Oggetti.staffIndoor` non lo usava nessuno);
- nei luoghi all'aperto si arrivava e si girava tra punti a caso ogni 3-10 secondi;
- chi lavorava all'aperto al suo posto (`al lavoro`, oggetti.js) non prendeva la posa del mestiere (anim_vita guardava solo `routine`).

## Cosa cambia (righe segnate `[scopo]`)
- **popolo.js**
  - *Dentro si vede chi c'è* (`roomStep`, `placeIndoor`, `roomWalk`, `roomExit`): quando il giocatore entra, chi è nell'edificio a quel piano prende un posto in `n.room` secondo quello che fa: letto (dorme), sedia a tavola (pranzo/cena), fornelli, poltrona, panca della chiesa, bancone (clienti), postazione di `staffIndoor` (chi lavora). Chi dorme senza un letto libero non si vede (è in un'altra stanza). Le famiglie dei condomini stanno al loro piano (`homeFloor`). Chi arriva mentre ci sei entra dalla porta e va al suo posto, chi esce cammina fino alla porta. A casa sua uno sconosciuto viene notato («E lei chi è?»).
  - *Crocchi* (`circlesOf`, `restSpot`, `chatter`, `chatLine`): all'aperto si va in un punto fisso del luogo e ci si mette in cerchio con chi c'è, ci si resta 20-50 s e ogni tanto si cambia crocchio. In crocchio si parla di quello che si ha in testa: un progetto, i soldi, la paura, la rabbia, il lavoro, gli interessi (`TALK_INT`).
  - `Popolo.doing(st, n)`: cosa sta facendo in due parole («al lavoro (barista)», «a passeggio → Lungomare»).
  - `Popolo._.arrest` (alias di `arrestFar`): mestieri.js e fazioni.js chiamavano `I.arrest`, che non esisteva, e il gioco si bloccava quando un abitante della Tutela faceva la spia.
- **anim_vita.js**: posa per chi è in `n.room` (dorme, tavola, siede, bancone, merce, lavora, prega, legge seduto); posa del mestiere anche per `al lavoro`.
- **main.js**: chi è nella stanza si clicca e ci si parla (solo Parla); l'etichetta sotto il puntatore dice cosa sta facendo; i fumetti si vedono anche dentro.
- **render.js** con `strumenti_inverno/scopo1.py` (dopo unione10): disegna chi è in `n.room` sul pavimento dell'interno e non lo nasconde col mondo di fuori.

## Prove
`node test_vita.js 1 1` e `node test_azioni.js 1 1` senza errori. In Chromium: condominio di notte (seduti alla scrivania e in poltrona, protestano), cucina a pranzo (a tavola), Circolo la sera (pieno, una partita a scopa).

## Aperto
- I condomini con due piani mettono tutte le famiglie al primo: servono più piani o più appartamenti per piano.
- Dentro non si possono rubare o picchiare le persone (il motore ignora chi è `inside`).
