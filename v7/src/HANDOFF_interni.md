# HANDOFF — Interni (4 ottobre 2026, sera)

Gli interni sono rifatti da capo: attività per attività, casa per casa, piano per piano.

## File
- `src/interiors.js` (riscritto): piante, programmi, arredo. API come prima (`layout, walk, outside, onStairTop, roomAt, kindOf, EXTRA`) più `stairGo, roomLabel, floorLabel, LOOTAS, LOOTX, FNAME, SZ, V, R, DECOR`.
- `src/interni_arte.js` (nuovo, caricato dopo `oggetti_ui.js`): la grafica degli interni e ~120 oggetti fatti a mano (`ia_*`, più la stufa `st_stufa`).
- `strumenti_inverno/interni_render.py`: aggancia `render.js` (buildIndoor → `InterniArte.build`, indoorPass → `InterniArte.light` / `exit`, altezza del giocatore al chiuso). Si può rilanciare: se il gancio c'è già non fa niente. **Va rilanciato ogni volta che render.js viene rigenerato dalla catena inverno_render*.py.**
- Patch piccole segnate `[interni]`: `game.js` (scale a più piani con `INT.stairGo`), `risacca_ui.js` (etichetta piano/stanza), `oggetti.js` (`lootTable`, `furnName`, `FURN2ST` leggono `LOOTAS/LOOTX/FNAME/roomLabel` di interiors), `index.src.html` (una riga).

## Come funziona
- **Piani**: fino a 7 (come l'esterno). Ogni piano ha la sua pianta. Scala: al piano terra il tappeto giallo porta su; ai piani di mezzo azzurro = giù, giallo = su; all'ultimo solo giù.
- **Programmi** (`program()`): ogni attività ha le sue stanze (bar con bancone e retro, trattoria, banja, discoteca, alberghi, Palazzo della Cultura con salone/biblioteca del Partito/museo, caserme e Rocca con archivi/celle/interrogatorio/camerate/comando, faro, hangar, cantiere con la barca, mestieri con le postazioni di oggetti.js…).
- **Case**: chi ci vive (`moodOf`): famiglia, anziana, operaio, pescatore, intellettuale, funzionario, kommunalka, contadini, rudere. Dipende dal quartiere. Nei condomini: androne/portineria al piano terra, una famiglia diversa per piano. Piani di una stanza sola: monolocale, soggiorno-cucina, mansarda.
- **Arredo** (tabella `R`): `'id'` contro il muro, `'@gruppo'` (tavolo con sedie, letto coi comodini, angolo stufa, bancone…, tabella `V`), `'*'` in mezzo, `'~'` per terra, `'^'` appeso (ritratto del Garante, tappeto al muro, manifesti, icone, calendari, termosifoni…), `'?'` a caso, `'!'` priorità (postazioni). Corridoi liberi davanti a porte, ingresso e scala; tutto raggiungibile (controllato).
- **Grafica**: pavimento e pareti per stanza (carta da parati, pittura a due colori, piastrelle, mattoni, perline, velluto…) con sporco e usura; pozze di neve all'ingresso; finestre gelate con la lama di luce; lampade per tipo (lampadina, lampadario, neon che sfarfallano, candele, fuoco, discoteca); le luci di fuori non entrano; alle 20 i televisori si accendono forte (il Garante).

## Prove
- `node test_oggetti.js 1 1`: tutto a posto. Tutte le piante raggiungibili, tutte le scale coerenti (script in /tmp della sessione, da rifare se serve).
- Screenshot headless di case, bar, caserme, chiesa, cultura, disco, alberghi, faro.

## Da fare
- Le persone dentro (oggi chi è al chiuso non si disegna): `Oggetti.staffIndoor` dà già i posti dei lavoratori.
- Stanze molto grandi ancora un po' vuote; qualche cucina stretta (scala + porta + ingresso) resta senza fornelli.
- Rendimento: molte mesh per oggetto; se serve, fondere le geometrie per oggetto.

## 4/10 notte
- Clic per andare dentro gli edifici: percorso vero sul piano (`Interior.findPath`, `nearFree`; `main.js` goalPath/freeSpot), clic sul pavimento (screenToGround all'altezza del pavimento), cambiando piano il clic vecchio si annulla.
- Tappeti della scala con la freccia e che pulsano: giallo ↑ sali, azzurro ↓ scendi. Zona della scala un po' più larga.

## 9-10 ottobre: planimetrie al metro, arredi composti, roba sui mobili, il tono di Porto Vecchio
Commit `2339dbb` e `184631b` (righe segnate `[planimetrie]` e `[design]` in `interiors.js`, nuovi oggetti in `interni_arte.js`).
- **Planimetrie al metro** (`splitFloor`): si taglia a passi di 1 m, non più a caselle di 2 m. Bagni, ripostigli e ingressi
  stretti come quelli veri (minimo 2 m nelle case, 3 m altrove); i tagli stanno lontani dalle porte già aperte e dalla scala;
  le porte vicino a un angolo (il muro lungo resta per i mobili), qualche volta in mezzo.
- **Il corridoio**: le case grandi hanno un disimpegno largo 2 m dall'ingresso verso il fondo, con le stanze ai lati e, se la
  casa è profonda, una stanza larga quanto la casa in fondo (di solito il soggiorno). `hallDoors` apre una porta per ogni
  stanza che confina col disimpegno o con l'ingresso; nessuna stanza resta chiusa.
- **Case più grandi**: una casa piccola guadagna un paio di stanze, le botteghe una sala vera. L'ingresso piccolo di casa è un
  ingresso vero (attaccapanni, scarpiera, specchio). Stanze in più dove servono: ingresso, stanza degli ospiti, lavanderia.
- **Arredi composti** (`V`, `CENTERED`, `CAP`, `TALL`): il salotto col tappeto sotto, il divano, il tavolino, le poltrone che si
  guardano, la lampada ad arco e la TV di fronte; il tavolo da pranzo con le sedie e i fiori; il letto coi comodini e le
  abat-jour sul tappeto; lo studio; l'angolo lettura. I mobili alti cercano l'angolo, le composizioni il centro del muro;
  davanti alle finestre niente mobili alti; al massimo due piante o un angolo lettura per stanza.
- **Roba da prendere sui mobili** (`LOOTSMALL`, `SURF`, `PICK`): portafogli, banconote, orologi, medicine, profumi, rasoi,
  cassette, vinili, fiammiferi, accendini, boombox, moka, radioline, carte da gioco, candele, lettere… raccolta in uno o due
  mucchietti per piano sopra tavoli, banconi e credenze, all'altezza giusta del piano. Presa tutta, sparisce dalla stanza
  (`oggetti.js`, `pickGone`).
- **Il tono** (`184631b`): l'ambiente spento e freddo; il consumo pastello lucido; la pubblicità del regime zuccherosa;
  controcultura e autoprodotto ricchi (patchwork, mobile dipinto, casse fatte a mano, serra idroponica, boombox).

### Prove
- `node test_oggetti.js 1 1`: piante raggiungibili, scale coerenti. Un controllo falliva: «i lavoratori all'aperto non
  stanno al loro posto». Su `main` passa solo perché quell'istante (9:20 del secondo giorno) non c'è nessuno all'aperto; qui ce
  ne sono 2-3 ancora in cammino verso i campi e la calata (a 130-180 m dal posto). Il controllo guarda un istante solo: con
  gli interni nuovi cambia l'ordine dei numeri casuali. Ora il controllo conta solo chi è già sul posto (entro 40 m):
  chi è ancora in cammino non conta.
- La simulazione è circa il 10% più lenta di `main` (un'ora di gioco: 4,3 s contro 3,9 s).
