# 2. Il problema delle diecimila ciotole di farinata (oatmeal) e la varietà nelle sessioni lunghe

## Il fallimento
Kate Compton: diecimila ciotole di farinata con i fiocchi in posizioni diverse sono matematicamente uniche ma *percettivamente* identiche. L'unicità percettiva, non quella combinatoria, è ciò che conta. [Game Developer, Compton "Practical procedural generation for everyone"](https://gamedeveloper.com/design/practical-procedural-generation-for-everyone-), [Emily Short 2016](https://emshort.blog/2016/09/21/bowls-of-oatmeal-and-text-generation/), [Rabii & Cook FDG 2023 "Why Oatmeal is Cheap"](https://ar5iv.labs.arxiv.org/html/2305.02131).

Rabii e Cook formalizzano: l'oatmeal è "economico" perché ha bassa complessità di Kolmogorov percepita — il generatore varia molti parametri indipendenti, e il cervello comprime tutto in "è farinata".

## Casi
- **Watch Dogs: Legion**: migliaia di reclute, pochi archetipi riconoscibili, dialoghi riciclati (vedi nota 1).
- **Shadows of Doubt**: "una volta capito dove stanno gli indizi" i casi si ripetono.
- **Wildermyth**: vignette ripetute alla terza campagna.
- **CK3**: "Less Event Spam" fu una voce dell'aggiornamento Crown; un modder osserva che un sovrano lussurioso con un pool di eventi limitato "diventa ripetitivo". I giocatori: "No, più eventi NON è la risposta". [Paradox forum](https://admin-forum.paradoxplaza.com/forum/threads/random-events-feels-like-im-missing-something.1848968), [Steam CK3](https://steamcommunity.com/app/1158310/discussions/0/3808407060884649786).

## Rimedi documentati
- **Poche decisioni grandi** (Boris the Brave, "Oatmeal spice", luglio 2026): scegliere a inizio corsa pochi parametri globali (palette, mix di forme) e generare tutto da quelli; scelte discrete invece che continue; *flag* rari per varianti che sorprendono anche dopo aver imparato la regola ("bisogna stabilire una regola prima di romperla"); correlare le proprietà; variare per regioni. [boristhebrave.com](https://www.boristhebrave.com/2026/07/05/oatmeal-spice/)
- **Collegare la generazione alla meccanica** (Emily Short): il testo generato senza effetto meccanico è "puramente decorativo" e il giocatore impara a ignorarlo; i procedimenti funzionano meglio per piccoli cambiamenti persistenti dello stato.
- **Raffreddamento e memoria di ciò che è già stato detto**: ogni battuta/evento ha un tempo di ricarica per osservatore (pratica comune CK3/Valve; vedi rapporti precedenti per il sistema regole di Elan Ruskin).

## Come misurare la varietà
- **Analisi dello spazio espressivo** (Smith & Whitehead 2010): generare un grande campione, calcolare 2 metriche per output, plottare la mappa di calore; rivela bias nascosti. [PDF](https://www.pcgworkshop.com/archive/smith2010analyzing.pdf), [PCG book cap. 12](https://www.pcgbook.com/chapter12.pdf). La scelta delle metriche è decisiva ([Withington et al. 2023](https://ar5iv.labs.arxiv.org/html/2304.02366)).
- Metriche proposte per Porto Vecchio (mie, non da fonte): entropia di Shannon sui tipi di evento per ora di gioco; quota di "prime volte" (tipi mai visti dal giocatore) per sessione; distanza tra cronache di due semi diversi (Jaccard sui pattern setacciati); tasso di ripetizione di battuta identica entro N minuti per lo stesso ascoltatore.
