# 6. Debuggabilità: replay deterministico, seme, ispettori

## Il fallimento
"Ieri l'oste ha dato fuoco al porto e non sappiamo perché": i bachi emergenti non si riproducono, e senza riproduzione non si correggono né si tarano.

## Casi e tecniche
- **Factorio**: lockstep deterministico (si scambiano input, non stato); a ogni desincronizzazione il gioco scrive un report con la copia del salvataggio di client e server al tick della divergenza. Bachi celebri: iterazione di tabelle hash in ordine non deterministico nei mod (FFF #70); multithreading deterministico (FFF #415). I replay sono solo input per tick, quindi si rompono con mod o versioni diverse. [FFF #188](https://factorio.com/blog/post/fff-188), [FFF #70](https://factorio.com/blog/post/fff-70), [FFF #415](https://factorio.com/blog/post/fff-415), [wiki Desync](https://wiki.factorio.com/Desynchronization).
- **Retro City Rampage (GDC 2015, Provinciano)**: motore deterministico, registrazione input, QA automatica e bachi "riproducibili al 100%". [GDC Vault](https://gdcvault.com/play/1021826/Automated-Testing-and-Instant-Replays)
- **Mark Wesley, 2K Marin (GDC 2013)**: sostiene il contrario — un replay *riavvolgibile* basato su istantanee di stato compresse è "molto superiore" al replay deterministico per debug e taratura, perché non pretende determinismo perfetto. [GDC Vault](https://gdcvault.com/play/1018138/Implementing-a-Rewindable-Instant-Replay)
- **The Last Clockwinder (GDC 2023)**: registrazione/riproduzione input in Unity, nata come meccanica e diventata strumento di test. [GDC Vault](https://gdcvault.com/play/1029182/Independent-Games-Summit-Fixing-Bugs)
- **Determinismo multipiattaforma (GDC 2024, Pollard/Bradley)**: For Honor e Overwatch come ispirazione; "i comandi generano lo stato". [slide](https://media.gdcvault.com/gdc2024/Slides/GDC+slide+presentations/Pollard_Bradley_CrossPlatformDeterminism+2024-03-26+09.34.19.pdf)
- **RimWorld dev mode**: menu azioni di debug (genera eventi, pedine), pannello ispettore, "Write Storyteller" che stampa nella lettera di incursione i totali e i modificatori di ricchezza. [wiki](https://www.rimworldwiki.com/wiki/Dev_mode)
- **JavaScript**: `Math.random()` non è inizializzabile con un seme e l'algoritmo dipende dal motore; servono PRNG intere come mulberry32/sfc32 o seedrandom. Le funzioni `Math.sin/cos/exp` sono "approssimate dall'implementazione" nella specifica ECMAScript, quindi possono differire tra V8 (WebView Android) e JavaScriptCore (Safari): per la logica di simulazione usare interi o tabelle. [seedrandom](https://davidbau.com/archives/2010/01/30/random_seeds_coded_hints_and_quintillions.html), [V8 Math.random](https://dev.to/puzpuzpuz/v8-deep-dives-random-thoughts-on-math-random-2ci4).

## Raccomandazioni operative
1. Un solo PRNG con seme per sottosistema (città, dicerie, meteo), mai `Math.random` nella logica.
2. Tick fisso della simulazione separato dal frame di rendering; ordine di iterazione stabile (array con id ordinati, mai `for…in` su oggetti mutati).
3. Diario di input del giocatore + seme = replay; in aggiunta istantanee periodiche (stile Wesley) per riavvolgere senza dipendere dal determinismo perfetto.
4. Hash dello stato ogni N tick registrato nel batch notturno: se due corse con stesso seme divergono, bisezione automatica sul tick.
5. Ispettore in gioco (`?debug`): per l'NPC selezionato mostrare bisogni, credenze con fonte, piano corrente e *perché* (punteggi delle alternative); per un evento della cronaca, la catena causale cliccabile.
6. "Spiega questa storia": dalla gazzetta risalire agli eventi grezzi che il setacciatore ha unito.
