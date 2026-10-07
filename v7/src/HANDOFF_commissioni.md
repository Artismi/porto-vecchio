# Porto Vecchio — Imprese e commissioni: organizzarsi e fare le cose davvero (6 ottobre)

Richieste: gli NPC devono potersi organizzare. I bisogni (pisciare, mangiare) li soddisfano quando vogliono. Vanno a comprare quello che serve (anche per comprare altro), guadagnano, spacciano, si trovano un lavoro, progettano e sistemano casa, fanno graffiti. E non solo nella testa: devono farlo nel gioco.

## Imprese (imprese.js, nuovo)
Un problema o una voglia condivisa → qualcuno (coraggio + parlantina) prende l'iniziativa: decide cosa, dove e quando (fuori dai suoi orari di lavoro) e cerca gente. Famiglia, amici, vicini, chi ne ha bisogno; ognuno decide da sé (interesse, stima, favori dovuti, paura, se è libero) e chi accetta passa parola a un suo amico. Ognuno prende un ruolo secondo quello che ha. L'impegno entra nella giornata (`P.impegni` in popolo.js, blocco `impresa`). Se un'ora prima non sono abbastanza si rinuncia; all'ora giusta chi c'è la fa (squadra raccolta attorno, pose del lavoro), e si ricorda chi c'era e chi no.
- legna in pineta (chi ha l'ascia taglia, chi ha la carriola porta), colletta per una famiglia nei guai, tutti alla Rocca per un fermato (in tanti può uscire), cena all'osteria (ognuno porta qualcosa), ronda nei quartieri coi furti (i ladri girano al largo, a volte ne prendono uno), pesca all'alba.
- Esclusi Grigi, bande, marsigliesi e nemici dichiarati. Una ronda per quartiere, una legna alla volta.
- Se ne parla per strada; in chat il personaggio sa delle sue imprese e il giocatore si unisce col verbo `partecipa` (la presenza conta come per gli NPC; per la legna ne porta a casa anche lui).
- Prova: `node test_imprese.js [giorni] [seme]`.

## Commissioni (popolo.js `errand`/`ERRAND`, commissioni.js nuovo)
Una commissione è un blocco inserito subito: si va a piedi, ci si sta il tempo che serve facendo la cosa (vicino al giocatore in secondi veri, lontano in minuti di gioco), solo allora succede, poi si riprende quello che si faceva. Una commissione può avviarne un'altra (compro i mobili → li porto a casa → sistemo).
- **Pisciare** (`need.vescica`, sale col tempo e più in fretta bevendo): a casa o al bar se sono vicini; se no, quando non ce la fa più (brillo, poco rispettoso delle regole, di notte), contro un muro. Se c'è un Grigio: multa. Chi passa se lo ricorda.
- **Mangiare**: con la fame si mangia dalle tasche (scambi.js) o si va a prendere un panino.
- **Comprare**: quello che manca (`Scambi.wants`) nella bottega più vicina che lo vende; si torna col pacco in mano (`n.hand`) fino a casa.
- **Vendere**: nei giorni di mercato chi produce porta il prodotto del suo lavoro al banchetto in piazza e lo vende a chi passa.
- **Spaccio**: chi ha il vizio va dallo spacciatore dove fa il suo giro, e lo scambio si fa lì (con un Grigio vicino, rischio). Tolta la vendita astratta da `doGiro`.
- **Casa**: chi ha qualche soldo e la casa spoglia compra sedia, tavolo, coperta o vernice, la porta a casa e la sistema (imbianca).
- **Scritte dei progetti**: chi scrive sul muro ci va, si mette di faccia al muro (`wallSpot`, solo lati di edifici veri), ci sta il tempo di dipingere, e solo allora la scritta c'è.

## Graffiti visibili (render.js con `strumenti_inverno/muri_gente2.py`, dopo scopo1)
Ogni muro dipinto dagli abitanti (`st.pop.walls`, con `wx, wy, wface`) diventa un riquadro sulla facciata: scritte in stampatello con le colature (rosse o nere), satira e arte a pennellate. Quando il regime le cancella resta una macchia grigia. `window.__muriGente` per le prove. Il riquadro c'è (controllato), ma non l'ho visto bene in un'istantanea (tettoie e tetti davanti): va guardato giocando.

## Anche
- `onBlockStart`: chi perde il posto mentre è al lavoro non maturava la paga di un lavoro che non c'è più (errore che bloccava il gioco, raro).
- I «muri» dei posti dove si sta (`spotsOf`) ora sono solo lati di edifici veri; la fontana e i banchi sono bordi ma non muri.

## Misure (2 giorni, seme 3)
Imprese: 18 nate, 10 fatte, 70 adesioni. Commissioni: 783 acquisti in bottega, 12 vendite al mercato, 13 spacci, 21 case sistemate. Circa 4 ms per passo (prima di questi moduli 2,2).
