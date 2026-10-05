# Porto Vecchio — La Regia e la chat immediata (5 ottobre)

Direzione di Andrea: «il percorso che devono fare, le azioni casuali, le interazioni interessanti devono rimanere lavoro dell'IA, per dare la sensazione di un mondo completamente vivo; e il mondo resta comunque vivo da solo: la gente va a lavoro, i bambini giocano, se prendi la macchina è per andare da qualche parte, qualcuno fa cose per i suoi progetti personali, il modo di fare. La chat deve essere disponibile nell'immediato, piuttosto un'altra chiave.»

## Due strati
1. **Il mondo vivo da solo (motore, senza IA)**: già in `popolo.js` (giornate, lavoro, bisogni, interessi, progetti, appuntamenti, malavita) e `azioni.js` (imprevisti, reazioni, piani). Nuovo in `src/regia.js`: **le auto sono di qualcuno** (all'avvio ogni auto parcheggiata senza padrone va all'adulto che abita più vicino, entro 45 m: `v.owner`, `pop.car`) e **chi ha l'auto vicina e deve andare lontano la prende** (blocco del programma a più di 130 m, auto entro 60 m: piano `guida` con `drive` e poi parcheggio).
2. **La regia dell'IA vicino al giocatore** (`src/regia.js`, kind `regia` in `server.js`): ogni 40 s di orologio vero, se il giocatore è all'aperto e non chatta, si prendono fino a 6 abitanti entro 34 m (non Grigi, non Risacca in servizio, senza un piano in corso, non ripresi negli ultimi 180 minuti di gioco) e si manda all'IA la **scena**: chi sono (età, mestiere, carattere, umore, cosa stanno facendo, progetto, ultimo pensiero e ricordo, soldi), i **rapporti** tra loro, i **posti vicini** con gli id. L'IA risponde con 1-3 azioni tra i verbi che il motore sa eseguire: `vai`, `fai` (attività inventata in un posto vero: «ripara la rete», «dipinge la barca»), `mangia`, `gesto`, `chiacchiera`, `sfotti`, `apprezza`, `offri`, `gioca`, `litiga`, con una **battuta** e un **perché** (che finisce nel diario). Tutto passa da `Azioni.intend` / `Azioni.startPlan`: strade vere, oggetti, effetti sui rapporti e sui ricordi. Id e posti inventati vengono scartati.

## La chat passa davanti
- `mente.js`: la chat (`kind: 'dialogo'`) non aspetta l'intervallo tra le chiamate; finché il giocatore chatta (e per 25 s dopo l'ultimo messaggio) chiacchiere, riflessioni e regia non partono: decide il motore.
- **Chiave dedicata alla chat** (facoltativa): `chatKey` in `api_key.json` (vedi `api_key.esempio.json`), oppure `MENTE_CHAT_KEY` (e `MENTE_CHAT_MODEL`) su Vercel. Ha la sua quota e le sue pause (`COOLDOWN` con il tag `chat:`), non conta nel budget al minuto del mondo. Senza, la chat usa la chiave comune ma con la precedenza.
- Su Vercel il freno per IP conta la chat a parte (`api/mente.js`). `api/_mente.js` è rigenerato con `python3 strumenti_inverno/mente_vercel.py`.

## Prove
- Senza chiave (questo container): il gioco parte senza errori; 19 auto su 35 hanno un padrone; scena costruita in piazza alle 11 (Gino barista, Rosa fioraia, rapporti, posti con distanze); tre azioni finte eseguite come piani veri («chiacchiera con Rosa (vuole sfogarsi)» con la battuta, «ripara la rete da pesca» alla piazza, «va a Fontana di San Rocco»), una con un id inventato scartata.
- Da provare con una chiave vera: la qualità delle scene e il costo (1 chiamata ogni 40 s, ~450 token di risposta).

## Da fare
- **Bambini**: la popolazione oggi va dai 18 ai 62 anni. Servono figli nelle famiglie (età 6-14), scuola la mattina, gioco nel pomeriggio (pallone, nascondino, campana) e l'altezza nel modello (`models.js`, `dressUp`: oggi `hgt` è casuale tra .94 e 1.04).
- **Il modo di fare**: piccole abitudini per persona quando è ferma (fuma, si appoggia al muro, conta i soldi, guarda l'orologio, fischietta), scelte dal carattere; l'IA può aggiungerle con `gesto`.
