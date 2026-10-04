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
