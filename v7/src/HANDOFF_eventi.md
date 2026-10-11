# Porto Vecchio — Eventi vicino al giocatore e fluidità (11 ottobre)

## Gli eventi (`src/eventi.js`, prova `node test_eventi.js`)
Una regia **senza IA**: ogni 15-35 s, se sei all'aperto e nessuno ti dà la caccia, a 10-34 m da te parte una scena con la gente vera che faceva la sua giornata. Al massimo due insieme. Convive con la regia con l'IA (`regia.js`), che resta per le azioni "creative" quando c'è una chiave.

- **Le scene sono dati** (`SCENE`, in fondo al file): `roles` (chi recita: filtro `any`/`m`/`f`/`old`/`young`/`cop`/`writer`, `near` un altro ruolo), `when` (`day`/`night`), `player: true` (si rivolge a te), `place: 'ladder'`, `beats` (le battute in fila). Il commento in cima al file elenca le battute: `say`, `go`, `all`, `wait`, `pose`, `mood`, `look`, `follow`, `wander`, `flee`, `chase` (con i rami `catch` e `lose`), `crowd` (il capannello, ruolo `folla`), `fall`, `up`, `brawl`, `jail`, `pay`, `p` (a caso), `ladder`, `ride` (la BMX), `fn`.
- **Aggiungere una scena** = aggiungere una scheda; il test la prova da sola (parte, arriva all'ultima battuta, lascia liberi gli attori).
- **41 scene** oggi: scippo, non ha pagato, polizia che insegue, perquisizione, corsa all'autobus, scommessa, rissa, lite di coppia, lite per il parcheggio, vicine e il bucato, baruffa a carte, ubriaco, due ubriachi, malore, anziano che cade, portafoglio perso, indicazioni, mendicante, sigaretta (a te), provocazione (a te), complimento (a te), il gatto, la sorella persa, ambulante, spazzino, fattorino, attacchino, telefono, foto, pittore, gessetti, jogging, musicista col capannello, ballo, corteggiamento, amici, innamorati, comizio, spaccio, predica del vecchio, la scala di ferro fino al tetto, la BMX che cade (la bici resta: si può prendere), la BMX che passa, il writer che esce a bombare (`writer_vita.js`).
- Chi recita ha `n.__ev`: il movimento lo decide la scena (`G.HOOKS.move`); le chiacchiere degli altri moduli per lui tacciono (`G.say` filtrato); `popolo.js` lo tiene «vicino» (`mustBeNear`). Se viene colpito o stordito esce di scena. Chi scappa e si infila in un portone: inseguimento perso.
- Se all'aperto non c'è nessuno adatto, qualcuno **esce dalla porta** (gli abitanti «dentro» stanno sulla soglia del loro edificio).
- Pose: quelle di `anim_vita.js` e `anim_lotta.js`; col suffisso `_su` sulle braccia (`fuma_su`, `telefona_su`, `indica_su`...), gli stati (`ubriaco`, `rabbia`, `stanco`...) come `mood`.

## Fluidità
- `game.js`, sezione `[fluido]`: bolla del dettaglio (fuori, chi è calmo pensa e cammina 4 volte al secondo), A* con tetto secondo la distanza, spinta tra abitanti su griglia, traffico e urti solo fra vicini. Logica: da 3,0 a 1,8 ms per passo.
- `render.js`: mezzi fuori vista non animati; risoluzione dinamica (`R.setRes`, decisa in `main.js`: sopra i 22 ms a fotogramma scende fino a metà, sotto i 14 ms risale). Dal ramo `keen-turing`: istanze e personaggi con l'ingombro vero (un terzo di disegni in meno), contatore F3.

## Sottosuolo
- La metropolitana non nasceva più (le coordinate fisse cadevano in mare dopo il rifacimento della mappa): ora le stazioni si ricavano dalla città (`sottosuolo.js`, `cityAt`). Periferia Sud è a ~60 m dalla partenza.
- Tombini, pozzi, grate e scale della metro si cliccano (ci vai e scendi; da sotto, risali); sulla minimappa la M rossa e i puntini dei tombini.

## Aperto
- `test_fazioni.js` ha un «NO» da verificare (non ho fatto in tempo a confrontarlo con la versione di prima). `test_economia.js` supera i 15 minuti.
- Eventi: le battute sono fisse; si potrebbero far dire all'IA (`mente.js`) quando c'è una chiave. Mancano scene coi mezzi (incidente fra auto, motorino rubato) e coi cani (`animali.js`).
