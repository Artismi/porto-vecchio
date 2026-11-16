# Banco di prova NPC: risultati (Fase 0)

Prima di costruire la simulazione sociale del piano *NPC vivi senza IA, espansione* serviva sapere se ci sta in un telefono e in un Iris Xe. Questo banco risponde con un carico **sintetico** che ha la forma di quello vero: stessi array, stesse strutture, stessi ritmi, contenuto inventato. Non tocca `src/`, `build.py` né `index.html`.

| File | Cosa fa |
|---|---|
| `sim_worker.js` | Il simulatore. Gira in tre posti: Worker del browser, `worker_threads` di Node, oppure script nella pagina (`?sim=main`, il ripiego). |
| `banco.html` | La pagina di prova: base senza simulazione, poi simulazione, disegno finto, misure dei fotogrammi e dei long task, salvataggio e ricarica, verdetto. |
| `banco_node.js` | Lo stesso lavoratore in Node, per avere numeri in fretta (`node banco_node.js --scala`). |
| `banco_pw.js` | Chromium via Playwright con CPU rallentata (CDP) e tracciato delle pause GC di ogni filo (`node banco_pw.js --rate 4 --min 10 --trace`). |

Cosa simula, per 1000 NPC divisi in 50 vicini, 150 lontani visibili, 300 del quartiere e 500 del resto della città:
- quattro livelli di dettaglio, ricalcolati ogni secondo mentre il giocatore cammina;
- uno heap di eventi con jitter gaussiano;
- una scelta d'utilità su 20 azioni ogni 2 s per i vicini;
- l'umore PAD ogni 500 ms;
- un registro di fatti con indici per attore e per tipo, la catena ×0,6 di `Vita.fatto` e la dimenticanza a contatori;
- 32 credenze per NPC con fonte, prova e forza;
- le impressioni WAWLT 3+/3−, su 24 relazioni per NPC;
- il pettegolezzo Daley-Kendall, con mutazione, orecchie indiscrete e testimoni;
- un setaccio a 30 schemi con al più 500 parziali deduplicati;
- un'istantanea a 4 Hz con buffer trasferiti a ping-pong.

## Dove e come si è misurato

- **Macchina:** una VM con Xeon a 2,1 GHz e 4 core. Node 22, Chromium 153 headless. La GPU è SwiftShader, quindi il disegno è a puntini su canvas 2D: si misura la logica del filo principale, non la GPU.
- **Il rallentamento CDP non vale per il Worker.** `Emulation.setCPUThrottlingRate` rallenta solo la pagina, mentre sul Worker risponde "Operation is only supported for pages". I tick del Worker a 4× e a 6× sono infatti identici a quelli a 1×. Per avere i tick *rallentati* si è fatto girare lo stesso codice sul filo principale (`sim=main`), che invece il rallentamento lo subisce.
- **4× e 6× approssimano un Android di fascia media.** È solo un'approssimazione: tempo dilatato, senza i core piccoli, il calore e la banda di memoria di un telefono vero.

## Risultati contro i criteri

| Criterio | Misura (1000 NPC) | Esito |
|---|---|---|
| Tick p95 ≤ 5 ms | Worker 1×: **0,29 ms** (10 min, 3004 tick) · rallentato 4×: **1,09 ms** · 6×: **1,61 ms** | PASSA, margine 3-15× |
| Tick p99 ≤ 10 ms | Worker 1×: **0,39 ms** · 4×: **1,29 ms** · 6×: **2,01 ms** (massimo 5,2 ms) | PASSA |
| Sotto sforzo (150 vicini a 5 Hz, scelta ogni 0,5 s, 300 lontani a 1 Hz) | 6×: p95 **3,51**, p99 **4,09**, massimo 7,5 ms | PASSA, al limite del p95 |
| Nessuna pausa GC > 4 ms sul filo principale in 10 min | Col banco "muto" (nessun pannello vivo), 4×, 10 min: **3 pause > 4 ms** (4,5, 4,6 e 7,4 ms), circa una ogni 3 minuti. Nei 30 s di base senza simulazione ce n'erano già due da 7-7,5 ms (*memory reducer*). Col pannello aggiornato ogni secondo: 25 in 10 min (una MajorGC ogni ~21 s da 4-8 ms); senza simulazione, con lo stesso pannello, una ogni ~33 s da 3,4-5 ms | **NON PASSA a 4× in senso stretto**. Le pause sono rare, sono della stessa taglia di quelle della pagina vuota, e a 1× valgono 1-2 ms. Da rimisurare sul telefono |
| Fotogramma invariato rispetto a oggi | dt p95 16,75 ms con e senza simulazione in tutte le prove. Lavoro per fotogramma p95 da 0,15 a 0,55-0,85 ms a 4-6×, che comprende anche il disegno di 200 puntini. 10 min a 4×: 2 fotogrammi > 33 ms su 36.041 | PASSA sulla pagina di prova; non provato dentro il gioco vero |

Scala, con p95 / p99 del tick in ms:

| N | Node tempo reale (120 s) | Worker Chromium 1× | Rallentato 4× | Rallentato 6× | Memoria | Salvataggio grezzo → gzip |
|---|---|---|---|---|---|---|
| 500 | 0,27 / 0,49 | 0,29 / 0,59 | 1,01 / 1,29 | — | 1,97 MB | 1,94 MB → 338 KB |
| 1000 | 0,33 / 0,57 | 0,29 / 0,39 | 1,09 / 1,29 | 1,61 / 2,01 | 3,05 MB | 3,00 MB → 500-590 KB (980 KB con 72 ore di storia) |
| 2000 | 0,33 / 0,65 | 0,31 / 0,41 | 1,29 / 2,51 | 1,91 / 2,41 (massimo 8,7) | 5,19 MB | 5,14 MB → 838 KB |

Il costo cresce poco con N. Pesano il numero di vicini e lontani, non il resto della città.

Altri numeri:
- **Tick di fila contro tick in tempo reale.** In Node, 6000 tick uno dopo l'altro costano in media 0,03-0,04 ms. Lo stesso tick in tempo reale (uno ogni 200 ms) costa p50 0,15 ms: tra un tick e l'altro le cache si raffreddano. Su un telefono, se il Worker finisce su un core piccolo, conterà questo secondo numero.
- **Allocazioni.** Restano circa 250 byte per tick: double inscatolati dei builtin e dei timer. Erano 700 prima di due correzioni: lo stato del caso spostato in un `Int32Array` e `now`/`rt` in un `Float64Array`. Nel Worker le MinorGC durano ≤ 0,9 ms e le MajorGC ≤ 2,8 ms (Chromium). In Node arrivano fino a 4-7 ms, ma cadono fuori dal tick e spostano solo il ritardo.
- **Salvataggio (1000 NPC, nel Worker, 1×).** Serializzare costa 4-9 ms, gzip 55-73 ms, IndexedDB 5-11 ms: in tutto 65-93 ms. I due slot A/B si alternano con un puntatore.
- **Ripristino.** Gunzip 13-23 ms più ripristino 10-20 ms. La somma di controllo è risultata uguale in tutte le prove. Anche la prova di ricarica vera passa: salva in A, ricarica la pagina, legge B, somma di controllo uguale.
- **Ritardo dei tick durante i salvataggi.** Mentre il Worker comprime, i tick slittano: al massimo 25 ms nei 10 minuti.
- **Ambiente.** `crossOriginIsolated` è falso e `SharedArrayBuffer` assente, come previsto: postMessage è la strada giusta. `navigator.storage.persist()` dà falso in headless; su un browser vero lo decide il coinvolgimento dell'utente.
- **Compattazione del registro.** Con 72 ore di storia, o con il registro ridotto a 4096 fatti, la dimenticanza ha piegato circa 4200 fatti in 6000 tick. Nessuno sfratto forzato, nessun contatore perso, percentili invariati.

## Cosa domina il costo

1. **Il pensiero dei vicini**, cioè percezione sulla griglia, incontri, testimoni e scelta d'utilità. Vale il 45-65% del tick. Sotto sforzo, a 6×, arriva a 1,33 ms su circa 2 ms.
2. **I lontani**: circa il 20%.
3. **L'istantanea nel Worker**, che per lo più è il `postMessage`: 0,035-0,046 ms.

Heap degli eventi, livelli, griglia e spazzini restano sotto 0,05 ms ciascuno a 4×. La regola che ne esce: il costo è proporzionale a vicini × Hz dei vicini, più il ritmo delle scelte. Mille o duemila abitanti "di sfondo" costano quasi niente.

**Memoria: 3 MB per 1000 NPC, il doppio della stima del piano (1,5 MB).** La voce più grossa sono le impressioni (1,06 MB), poi il registro (0,82 MB) e le credenze (0,80 MB).

**Il pannello del banco, non la simulazione, causava le GC lunghe del filo principale.** Aggiornare ogni secondo la tabella HTML e ricevere ogni secondo l'oggetto delle statistiche provoca una MajorGC ogni 20-30 s. Senza pannello le MajorGC periodiche spariscono: in 10 minuti a 4× ne restano tre sopra i 4 ms (una ogni ~3 min). In più ci sono le GC del *memory reducer* di V8 subito dopo l'avvio, che ci sono anche senza simulazione. Il Worker aggiunge al filo principale quattro messaggi al secondo con un buffer trasferito, e quasi niente altro.

## Raccomandazioni di taratura

- **Ritmi: tenere quelli provati.** Sono tick a 5 Hz, vicini a 4 Hz, lontani a 0,33 Hz, scelta ogni 2 s, umore ogni 500 ms. C'è margine: a 6× resta sotto soglia anche con 150 vicini a 5 Hz. Come bilancio prudente per il telefono: **al massimo 100 vicini a 4 Hz**, e scelta d'utilità non più spesso di 1 s.
- **Tetti:**
  - `beliefCap` 32: non è mai stato pieno (zero sfratti), si può portare a 16.
  - `relCap` da 24 a 12-16, e i riferimenti ai fatti delle impressioni da Int32 a indici più corti. Insieme dimezzano le impressioni.
  - Tempi in `Float32`/`Uint32` al posto di `Float64`.
  - Con queste tre modifiche si torna verso 1,5-2 MB.
  - `logCap` 16384 basta per circa 2 giorni di gioco (circa 3,3 fatti al secondo, circa 7000 al giorno).
  - Lo heap di eventi (N×4+2048) non si è mai riempito.
- **Setaccio.** Il tetto di 500 parziali viene raggiunto: 1426 rifiutati in 10 minuti. Il tetto funziona, ma gli schemi veri devono partire da tipi rari (non da `chiacchiera`) e avere finestre corte, altrimenti si riempie di parziali inutili.
- **Salvataggio.** Ogni 2-5 minuti e su `visibilitychange`, nel Worker. Conviene tagliare a fette la compressione, o usare `CompressionStream` a pezzi da 256 KB, perché un tick non slitti di 25 ms. Sul telefono il gzip costerà forse 200-400 ms, fuori dal filo della pagina.
- **Filo principale.** Le interrogazioni al Worker ("cosa pensa X di Y") vanno fatte a richiesta, con risposte piccole, non ogni secondo con oggetti grossi. Niente `innerHTML` periodici nel gioco. L'istantanea a 4 Hz in un solo buffer trasferito va bene.

## Onestà: cosa manca

- **Mancano telefono e Iris Xe.** Il criterio del piano parla di "un Android di fascia media e un Iris Xe", e qui non c'è né l'uno né l'altro. Il rallentamento 4-6× è un'approssimazione: non simula i core piccoli, il calore né la memoria. In più, sul Worker non agisce affatto, e il tick rallentato è stato misurato sul filo principale.
- **Il carico è sintetico.** I costi veri dipenderanno dalla logica vera, per esempio da quanti schemi e quanto complessi. I numeri danno l'ordine di grandezza e un margine: circa 3-15× sotto le soglie.
- **"Fotogramma invariato" vale per una pagina quasi vuota.** Nel gioco il filo principale è molto più carico. Va rifatta la prova con il Worker dentro il gioco vero (Fase 1).
- **APK non provato.** L'APK apre il sito di Artismi in una WebView senza barra degli indirizzi. Per verificarci `crossOriginIsolated` serve aprirvi `banco.html`, oppure il debug remoto (`chrome://inspect`).

## Per Andrea: provarlo sul telefono e sul portatile

Su Vercel la Root Directory è `v7` e `.vercelignore` non esclude `banco/`: dopo il push la pagina è su **`https://<il-tuo-sito>.vercel.app/banco/banco.html`**. Su Vercel la modalità three.js non c'è, perché `src/` è escluso, e la pagina usa da sola i puntini.

1. Sul telefono (Chrome) e sul portatile Iris Xe (Chrome o Edge), con la batteria in carica e senza altre app aperte, apri l'indirizzo qui sopra.
2. Premi **«Prova standard (10 min)»** e lascia lo schermo acceso con la pagina davanti, senza toccarla: in secondo piano i fotogrammi si fermano. Sul telefono fai una seconda prova aggiungendo `&muto=1` all'indirizzo, per misurare il filo principale senza il pannello.
3. Alla fine premi **«Copia risultati»** e mandami il testo, uno per dispositivo. Se vuoi, premi anche «Prova ricarica»: deve dire OK.

**Come leggere i numeri:**
- Nella tabella del verdetto il verde passa e il rosso no.
- I due numeri chiave sono **tick del Worker p95 e p99**, da confrontare con 5 e 10 ms.
- Poi conta il **fotogramma p95 con − senza**: deve essere ≤ +1 ms.
- I long task devono essere 0.
- Le pause GC la pagina non le vede direttamente. Per vederle sul portatile: DevTools → Performance → registra un minuto → cerca "Major GC" più lunghe di 4 ms. Per il telefono si fa lo stesso da `chrome://inspect`.

Per rifare le prove qui:
- `node banco_node.js --scala`
- `node banco_pw.js --rate 4 --min 10 --trace`
- `node banco_pw.js --rate 6 --min 3 --sim main --trace`
- `node banco_pw.js --rate 4 --min 3 --muto 1 --trace`

Playwright va trovato globale (`npm root -g`).
