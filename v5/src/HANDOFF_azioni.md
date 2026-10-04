# Porto Vecchio — Le Azioni: imprevisti, reazioni, morte (3 ottobre, notte)

Base: v4 (la Vita). Il modulo nuovo è `src/azioni.js`: solo logica, caricato subito dopo `popolo.js` (`<script>/*azioni.js*/</script>` in `index.src.html`).

Le altre modifiche sono poche:
- in `popolo.js` l'oggetto `Popolo._` espone gli strumenti interni e `REFLECT` raccoglie le riflessioni degli altri moduli;
- `wakeNear`, `sleepFar` e `urge` non toccano chi ha un imprevisto in corso;
- c'è l'interesse `arte`: album, bombolette, pezzi sui muri con lo stile di ognuno, la Tutela che li cancella.

`game.js`, `render.js`, `risacca.js` e `main.js` non sono toccati.

## Principio
Niente comportamenti scritti uno per uno: **azioni base con regole del mondo**, che chiunque può fare ovunque abbiano senso, se lo vuole.
- **Fatti del mondo**:
  - terra morbida (`SOFT`: pineta, macchia, sugheri, radura, vigne, oliveto, discarica, cimitero, spiaggia…): solo lì si scava;
  - posti nascosti (`HIDDEN`);
  - cabine del telefono (`PHONES`: piazza, bar, Wu, molo, Sirena…);
  - dove si trova una pala (`SHOVELS`; chi fa il bracciante, il cavatore o il carpentiere ne ha una a casa);
  - forza per sollevare (`strength`: età, corporatura, salute).
- **Azioni**:
  - uccidere (`kill`, con le stesse conseguenze di quando uccide il giocatore);
  - litigare (`quarrel`) e fare a botte (`brawl`: da vicino si vede, da lontano si decide chi vince);
  - scappare;
  - sollevare e trascinare un corpo (che si sposta con chi lo porta);
  - nasconderlo tra i cespugli;
  - prendere una pala, scavare, seppellire;
  - frugare nelle tasche di un morto;
  - telefonare e mandare messaggi (`message`: alla Guardia da qualsiasi telefono; a un amico se è a casa col telefono o ha il cellulare; al giocatore dalla rete della Risacca);
  - chiamare la Guardia, piangere un morto, riferire alla Zia, costituirsi, farsi medicare, chiedere aiuto a un amico che non fa domande.
- **Piani d'emergenza** (`startPlan` e `runPlan`): una reazione diventa una fila di passi del tipo vai lì, fai questo, poi quello, che passa davanti alla giornata. Da vicino si cammina davvero; da lontano il tempo di strada è calcolato. Un piano si interrompe se arriva un fermo, se la persona muore, se il corpo sparisce o se scadono le 18 ore.

## Imprevisti e reazioni
- **Chi se ne accorge**: da vicino conta la vista del motore (`canSee`); da lontano basta essere nello stesso posto. Un corpo coperto di frasche lo trova solo chi ci passa sopra.
- **Le scelte**: ognuno sceglie dal carattere (coraggio, rispetto delle regole, avidità), dalla paura e dai legami con il morto e con chi l'ha ucciso. Le possibilità sono:
  - chiama la Guardia: corre alla cabina o al telefono di casa;
  - scappa a casa e lo racconta in famiglia;
  - il parente o l'amico corre dal corpo e piange, poi vuole giustizia;
  - il complice o l'assassino lo fa sparire;
  - chi è avido gli fruga nelle tasche;
  - gli Orecchi corrono dalla Zia;
  - chi ha coraggio affronta l'assassino;
  - fa finta di niente.
- **La Guardia** arriva 25-60 minuti dopo la chiamata. Porta via il corpo e avvisa la famiglia; se qualcuno ha visto, va a prendere l'assassino. Chi viene sorpreso a trascinare un corpo finisce in cella.
- **Chi vede qualcuno trascinare un corpo** se lo ricorda: l'evento `occultamento` passa di bocca in bocca come gli altri.
- **I membri della Risacca** lo scrivono al giocatore ("Non venite da queste parti").

## Morte e risveglio
Chiunque muoia, comunque sia successo (il giocatore, una sparatoria, un altro personaggio), lascia il **corpo** nel mondo: un personaggio morto con `corpse`. Il motore lo disegna a terra e il traffico lo evita.

La persona si **risveglia all'ambulatorio** 2-5 ore dopo, senza memoria: diario, amici, nemici, progetti e chat con la banda azzerati. Se era della Risacca, ne esce. La famiglia viene a saperlo ("è viva, ma non riconosce più nessuno"). Lei apre il progetto `chisono`: chiede all'ambulatorio, torna nella casa che dicono sia la sua, va al vecchio lavoro.

## Liti, risse, incidenti
- **Liti**: ogni 20 minuti, chi si trova nello stesso posto con un conto aperto può litigare. I conti aperti sono un ladro riconosciuto, un bidone, i soldi dello Squalo, la politica col vino in corpo. La rabbia, il coraggio e il vino possono trasformare la lite in rissa. Chi perde va a farsi medicare e si segna il nemico.
- **Incidenti**: quando un'auto del traffico sbanda per un urto, il guidatore decide.
  - Chi ha poco coraggio tira dritto.
  - Gli altri scendono: la macchina resta lì e il guidatore diventa un abitante vero.
  - Se l'altro è il giocatore: chi è coraggioso e arrabbiato fa a botte (qualche spintone, poi se ne va se il giocatore non reagisce); gli altri urlano e, se rispettano le regole, vanno a denunciare.
  - Tra due auto del traffico scendono tutti e due e litigano.

## Iniziativa estrema e la Mente
- **Progetti nuovi** in `Popolo._.PROJ`:
  - `conti`: rabbia altissima, nessun rispetto delle regole, molto coraggio e un nemico. Prende il coltello in cucina e lo aspetta sotto casa: rissa o omicidio;
  - `lezione`: Rocco e Tano vanno a picchiare chi non paga lo Squalo, al massimo ogni due giorni;
  - `chisono`;
  - `coscienza`: chi ha un segreto pesante e una coscienza si confessa da Suor Agata, o si costituisce;
  - `giustizia`: chi ha perso qualcuno va in commissariato e accende un cero.
- **Riflessioni notturne** in `REFLECT`:
  - "chi sono? Non ricordo niente";
  - "nessuno deve saperlo. Nessuno";
  - "non passo più da Piazza San Rocco" (con i posti da evitare);
  - "hanno ammazzato Marco, e adesso non mi riconosce più";
  - "la prossima volta non finisce così".

## Prove
`src/test_azioni.js` (`node test_azioni.js [giorni] [seme]`), esempio in `prova_azioni.txt`:
1. un ricettatore uccide al mercato davanti a 24 persone: chi chiama, chi scappa, chi piange; la Guardia porta via il corpo e arresta l'assassino; la vittima si risveglia senza memoria;
2. di notte, nel bosco, davanti al giocatore: il killer trascina il corpo tra i cespugli, lo copre, va a casa a prendere la pala, torna, scava e seppellisce;
3. il giocatore tampona un'auto: il guidatore scende e, a seconda del carattere, fa a botte oppure urla e va a denunciare;
4. più giorni di vita normale: liti, risse, le lezioni dello Squalo; gli omicidi spontanei sono rarissimi.

`test_vita.js` carica anche `azioni.js`: 5 giorni senza errori, 0,62 ms per passo.

## Limiti noti
- Da vicino si cammina col passo del motore, quindi in tempo di gioco una camminata è lenta (100 m ≈ 3 ore): far sparire un corpo davanti al giocatore richiede ore di gioco.
- I personaggi non sparano tra loro: si uccide a mani nude o col coltello, e da lontano si decide subito chi ha la meglio.
- Le fosse (`st.pop.graves`) per ora non le trova nessuno.
