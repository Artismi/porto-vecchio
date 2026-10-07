# Porto Vecchio — Sembrare vivi (6 ottobre)

Dopo un'analisi a mente fresca (misure su due giorni e mezzo): il tempo non tornava (il tragitto medio fra due impegni durava più della sosta), la vita succedeva dove il giocatore non la vede, le battute si ripetevano (e qualcuno diceva «Che caldo» d'inverno), nessuno veniva a cercare il giocatore, nessuno camminava in compagnia, nessuno usava il proprio mezzo. Il gioco non ha una trama scritta: la storia nasce da quello che fanno gli NPC, quindi deve vederla il giocatore. Righe `[vivi]`.

## Il tempo (game.js)
- `MIN_PER_SEC` da 2,5 a 1,2: una giornata dura mezz'ora vera; a piedi 100 m sono un'ora e mezza di gioco, non tre.
- Le scelte di dove andare pesano di più la distanza a piedi (`chooseObj`: /170 invece di /320); chi ha un mezzo va anche lontano (/520).
- L'anticipo della partenza (`blockNow`) usa la velocità vera: a piedi quella della persona, col mezzo quella della macchina.

## Chi ha il mezzo lo usa (azioni.js, popolo.js)
- Verbo nuovo `guida` (dove): va al proprio mezzo, ci sale, guida per le strade (percorso che preferisce la carreggiata), parcheggia e scende; gli ultimi metri a piedi. In città 11 m/s (la Vespa 9).
- Nella vita normale (`nearMove`): per un tragitto oltre 110 m, chi ha il proprio mezzo entro 60 m lo prende.
- Il mezzo guidato da un NPC non si rompe per gli urti finti contro i bordi (prima arrivava distrutto a metà strada).
- I mezzi parcheggiati senza padrone sono dell'adulto che abita più vicino (`giveVehicles`): 18 mezzi con proprietario invece di 6.
- Provato: Pasquale, minatore a 890 m da casa, esce, prende la Giulia, arriva al lavoro un'ora prima del turno, la macchina integra.

## Camminare insieme (popolo.js `walkWith`)
- Due amici o parenti che vanno nello stesso posto e si trovano vicini camminano fianco a fianco, al passo di chi guida (l'id più piccolo), e intanto parlano. Quando uno arriva o si separano, ognuno riprende la sua strada.

## Vengono loro dal giocatore (convivenza.js `reasonFor`, `approachPick`, `approachMove`)
Ogni 15-30 secondi circa qualcuno lì vicino viene a cercarti a piedi e ti dice una cosa vera, poi torna alle sue cose:
- **avviso**: i Grigi ti cercano (se ti vuole bene o odia il regime);
- **favore**: ti deve un favore;
- **invito**: all'impresa che sta organizzando (`partecipa` in chat per andarci);
- **richiesta**: una cosa che gli manca davvero (se ce l'hai nello zaino te la chiede; in chat: `ricevi`);
- **minaccia**: se ce l'ha con te;
- **notizia**: l'ultimo fatto della città (una notizia la dà uno solo);
- **offerta**: roba che ha in più;
- **presentazione**: chi non ti conosce e ha voglia di parlare si presenta (una volta), senza svelare segreti;
- **saluto**: chi ti stima ti racconta una cosa sua.
Non due visite dello stesso tipo di fila. La chat sa cosa è venuto a dirti e cosa ti ha chiesto.

## Le chiacchiere vere (azioni.js)
- La chiacchiera fra due abitanti usa le battute costruite sui fatti veri (`Popolo._.chatLine`: appuntamenti, patti, debiti, quello che è successo, interessi); «Che caldo» è diventato «Che freddo».

## Prove
`node /tmp/vivi.js` (script di prova non nel repository): in 4 ore di gioco in piazza 7-8 visite diverse, molte coppie che camminano insieme. Pasquale: vedi sopra.

## Ancora da fare (dall'analisi)
- Un solo agenda e una sola decisione per NPC (oggi 4 posti diversi per gli impegni).
- Il salvataggio della partita (senza, la storia che nasce muore a ogni ricarica).
- Relazioni più ricche (rivalità, amori, gelosie) per avere conflitti e archi.
- Una cronaca della città e una regia che porti le cose interessanti vicino al giocatore.
- Bilanciamento: 39% di disoccupati, troppi morti, coltelli in ogni casa.
