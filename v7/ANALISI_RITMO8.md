# Porto Vecchio — Il ritmo dopo le unioni (ramo `ritmo8`)

Il committente: «va ancora molto a scatti» sul portatile (Intel Iris Xe) e sui telefoni, dopo le unioni di ieri (hd, camera7, graffiti2,
guida2, orienta, stile). Qui cosa si è misurato, cosa costa davvero, cosa è cambiato, come si spegne e come mandare i numeri dal portatile vero.

**Interruttore generale: `?noritmo8`** — il gioco di prima, identico. Uno alla volta (`src/profilo.js`, `window.PV_R8`):

| Interruttore | Cosa spegne | File |
| --- | --- | --- |
| `?noritmo8raggi` | il braccio di camera7: i raggi uguali nello stesso fotogramma una volta sola; le mesh senza posizioni saltate; le celle dei tasselli sopra o sotto il raggio saltate | `render.js` (cast7, raggi veloci), `tasselli.js` |
| `?noritmo8arte` | il disegnatore dei graffiti a parte (worker) con le tele lette dal processore | `writing.js` (artWorker) |
| `?noritmo8griglie` | le griglie dei raggi dei tasselli preparate a fette, i colpi fuori portata senza allocare, i 16 bit letti senza chiamate | `tasselli.js` |
| `?noritmo8pile` | le tessiture a strati grandi dei tasselli mandate alla scheda video a fette | `tasselli.js` |

Nessuna correzione cambia l'immagine, i comandi, la camera o il gioco: i risultati sono gli stessi (per i raggi del braccio provato raggio
per raggio, §3), cambia solo quando e quanto lavora il processore.

## 1. Come si è misurato

SwiftShader (Chromium senza scheda video) non dà tempi di scheda credibili, ma il processore sì. Tre strumenti, tutti in
`/tmp/.../scratchpad/ritmo8/` (copiati in `_immagini/ritmo8/strumenti/`):

- **Il percorso** (`percorso.js`): il gioco vero a tempo vero, profilo del portatile (`?leggera`, 1536×864 a dpr 1,25: tela 1920×1080),
  i disegni spenti nella scheda (il processore fa tutto: scena, three, uniform, caricamenti; SwiftShader non riempie pixel). Nascita →
  vicolo dei Pescatori a piedi (goTo) → piazza (con la camera girata) → lungomare → 30 s di guida (la Ritmo parcheggiata, gas e sterzo
  verso i punti della via) → la tavoletta dei graffiti aperta una volta → 6 s fermi. I tratti durano in **secondi di gioco** (a 3-5
  fotogrammi al secondo il personaggio fa per fotogramma quello che farebbe a 20). Per tratto: i giri di `requestAnimationFrame` (ogni
  callback, ms di JS per giro), il profilo del processore (CDP `Profiler`, campioni ogni 0,4 ms: tempo per funzione e per modulo, i
  campioni dentro i long task), le allocazioni (CDP `HeapProfiler` a campioni, anche quelle già raccolte), `Performance.getMetrics`, ogni
  chiamata WebGL e canvas che costa al processore (caricamenti di tessiture, buffer, compilazioni, letture), disegni e triangoli per giro,
  i programmi nati durante il tratto.
- **Il banco a passi** (`banco.js`): negli stessi quattro posti gli stessi 45 passi (G.step + R.frame a 1/30 s, camminando), tre volte,
  ognuno dentro un compito solo: dalla traccia (CDP `Tracing`, `tdur`) **il tempo del filo**, che regge la contesa (la macchina è divisa con
  altri agenti: carico medio 8-14 su 4 processori, i ms d'orologio salgono e scendono del 50% da una corsa all'altra). E quanti raggi,
  quanti triangoli provati.
- **Le sonde** (`sonda_cast.js`, `sonda2.js`, `sonda_worker.js`, `sonda_eq.js`): mesh per mesh dove vanno i triangoli dei raggi; lo stato del
  disegnatore dei graffiti; l'uguaglianza dei raggi prima/dopo.

Corse: `base_b` (main 85a0971), `kill_b` (main con `?hd=0&nofixcamera7&nofixorienta&nofixgraffiti2&nofixguida2`), `dopo_b` e `dopo_c` (questo
ramo). I numeri assoluti sono di questa macchina lenta e affollata: valgono i rapporti e i conteggi (triangoli, allocazioni, scatti).

## 2. Le cause, in ordine (misurate)

**1. Il braccio di camera7 (cast7): il primo costo del fotogramma.** Camera7.passo prova il braccio da 2 a 6 volte per fotogramma, ogni prova
cinque raggi contro ~130-230 mesh vicine. Quota del giro principale (`base_b`): **68% fermi alla nascita (215 ms per fotogramma), 33% nel
vicolo, 19-21% in piazza e sul lungomare**; 92 MB di allocazioni per fotogramma alla nascita (numeri a virgola mobile dentro
`Ray.intersectTriangle`, ~545.000 triangoli provati per fotogramma), da qui anche gli scatti del raccoglitore (GC 17 ms per fotogramma).
Le sonde hanno trovato perché:
- il **verde lontano del profilo leggero** (`vegLontano`, LeggeraMem.verde) manda le posizioni alla scheda video e le butta; l'indice spaziale
  (mesh_bvh) fatto dopo era **una foglia sola di 13.130 triangoli con i vertici NaN**: ogni raggio li provava tutti, senza poter colpire
  niente (65.650 prove per prova del braccio, ~20 ms in SwiftShader). Sta in tutto il profilo leggero, cioè sul portatile Iris Xe e sui telefoni;
- le **mesh dei tasselli** (rayTas, griglia in pianta di 2 m): nelle celle fitte un raggio di 1-2 m prova migliaia di triangoli; la griglia di
  una mesh nuova si faceva **al primo raggio, dentro il fotogramma** (50-70 ms su una mesh di 120.000 triangoli in SwiftShader): uno scatto
  ogni volta che un tassello nuovo entra nel braccio;
- ogni colpo, anche fuori portata, si copiava prima di scartarlo (MB di spazzatura per fotogramma).

**2. Il disegnatore dei graffiti morto: tutti i graffiti disegnati sul filo della pagina.** Il worker dei graffiti legge i pixel centinaia
di volte per pezzo (`getImageData`) su tele OffscreenCanvas messe sulla scheda video: ogni lettura aspetta la scheda. Misurato: **un pezzo
87,8 s nel worker** (contro 0,8 s sul filo della pagina). Oltre i 60 s senza risposta il gioco lo dà per morto (`ARTW.ok = false`) e da lì
**ogni graffito si disegna sul filo della pagina, uno ogni 1,2 s, 100-130 ms l'uno** (handify, inkRender): 4-31 ms per fotogramma di media,
e un long task ogni 1,2 s finché ci sono graffiti da disegnare (sempre, camminando). Nei long task del percorso: 19,5 s su 13 minuti. Sul
portatile vero la lettura costa meno che in SwiftShader, ma è la stessa attesa della scheda, nel mezzo del disegno del gioco.

**3. Le tessiture a strati piene dei tasselli (hd, G11).** Sul portatile una pila arriva a 32 MB (512×512×32): mandata in un colpo
(`texSubImage3D` da `texSu`) era **un caricamento da 96 ms fino a 1,16 s** in SwiftShader (30-80 ms stimati sull'Iris Xe): uno scatto a ogni
tassello nuovo che ne porta una.

**4. Le compilazioni a metà gioco** (2-5 programmi per tratto, `getProgramParameter` fino a 2 s in SwiftShader): qui senza
`KHR_parallel_shader_compile` aspettano; sul portatile vero c'è l'estensione e `peso_pronti.js` (vivo) fa già saltare il fotogramma
all'oggetto nuovo invece di fermare il gioco. Non toccate.

**5. L'apertura della tavoletta**: `tavShot` legge la foto del muro con `readRenderTargetPixels` (sincrona): 6,2-7,8 s in SwiftShader
(aspetta tutta la coda della scheda), sul portatile vero decine di ms, una volta per apertura. Non toccata (il flusso dell'apertura è del blocco graffiti).

**Il resto del fotogramma non è nuovo** (`base_b` contro `kill_b`, stesso tratto): il disegno di three lato processore (43-90 ms qui, 550-1400
disegni), le matrici (umw, 20-35 ms), le persone, la logica (G.step 7-13 ms, uguale con e senza guida2: le auto nuove non si vedono nel
profilo), le ombre (4-8 ms). **orienta**: la minimappa che gira si ridisegna a 10 Hz (drawImage ~0,03-0,1 ms per fotogramma). **stile**:
il disegno di three costa uguale. **guida2**: l'audio sintetizzato crea i nodi della radio solo con la radio accesa (R), il motore usa nodi
fissi: niente nel profilo. **hd**: lato processore l'MSAA aggiunge un `blitFramebuffer` per fotogramma (≤ 0,6 ms qui di solito); il resto di
hd è scheda video (§5).

## 3. Le correzioni

1. **Il braccio di camera7** (`render.js` cast7, `?noritmo8raggi`):
   - i raggi già fatti in questo fotogramma con gli stessi numeri esatti non si rifanno (fino a otto per fotogramma): fermi, due prove su tre
     sono lo stesso raggio (misurato: 67% dal ricordo da fermi, 18-22% camminando);
   - le geometrie che hanno buttato le posizioni (array vuoto, senza copia per i raggi) non si provano: non potevano colpire niente
     (`render.js`, raggi veloci: vale per tutti i raggi, non solo per il braccio);
   - solo per il braccio (gli serve il colpo più vicino, non l'ordine dei colpi): nei tasselli le celle che il raggio attraversa tutto sopra
     o tutto sotto i triangoli della cella si saltano (ogni griglia ora sa la quota più bassa e più alta di ogni cella).
   **Provato uguale**: 8 posti × 40 raggi (nascita, vicolo, piazza, lungomare), il cast7 nuovo contro l'algoritmo di prima ricopiato: 320 su 320
   identici (`_immagini/ritmo8/sonda_eq.json`).
2. **Il disegnatore dei graffiti** (`writing.js`, `?noritmo8arte`): nel worker le tele 2D si aprono con `willReadFrequently: true` (lette dal
   processore). Lo stesso disegno: **3,5 s invece di 87,8 s** per lo stesso pezzo; il worker non muore più (`ok: true`, 343 pezzi nel percorso,
   coda sul filo della pagina vuota) e i 100-130 ms ogni 1,2 s spariscono (arte sul filo: 0 ms in tutti i tratti).
3. **Le griglie dei raggi a fette** (`tasselli.js`, `?noritmo8griglie`): la griglia di una mesh è un generatore (una pausa ogni 4.096
   triangoli); `griglieTick`, nel giro dei tasselli, prepara quelle delle mesh entro 20 m dalla camera con al più 1,5 ms per fotogramma
   (1 sul telefono), prima che il braccio le tocchi. Se un raggio arriva prima la si finisce lì, come prima. In più: il colpo fuori near/far si
   scarta prima di copiarlo, le posizioni a 16 bit si leggono senza nove chiamate per triangolo. Risultato identico.
4. **Le pile a fette** (`tasselli.js`, `?noritmo8pile`): una tessitura a strati oltre 4 MB (2 sul telefono) si alloca come fa three
   (`texStorage3D`, i parametri) e si riempie a fette di strati, al più 4 MB per fotogramma, poi le mipmap; la mesh che la usa entra in scena a
   pila piena (`monta1` aspetta il fotogramma dopo): mai mezza. Il caricamento più lungo passa da 96 ms (1,16 s in un'altra corsa) a ≤ 53 ms in
   SwiftShader; sul portatile vero ~4 MB per fotogramma.

## 4. Prima e dopo (i numeri)

### Il banco a passi, portatile (tempo del filo: regge la contesa)

R.frame + G.step, 45 passi camminando, mediana di tre (`_immagini/ritmo8/banco_*.json`):

| Posto | ms di processore per fotogramma, prima → dopo | ms d'orologio | p95 d'orologio | triangoli provati per fotogramma | GC per fotogramma |
| --- | --- | --- | --- | --- | --- |
| nascita | **169 → 63 (−63%)** | 280 → 90 | 513 → 165 | 544.770 → 128.278 | 37,5 → 5,2 ms |
| vicolo | **89 → 54 (−40%)** | 161 → 66 | 290 → 100 | 99.819 → 56.992 | 12,4 → 3,9 ms |
| piazza | 64,5 → 59 (−9%) | 113 → 84 | 277 → 188 | 17.109 → 2.267 | 9,9 → 9,3 ms |
| lungomare | 46,6 → 43,9 (−6%) | 76 → 51 | 120 → 81 | 4.771 → 317 | 7,9 → 2,0 ms |

TABELLA_TELEFONO

### Il percorso (tempo vero; i ms assoluti dipendono dalla contesa del momento)

TABELLA_PERCORSO

## 5. Il portatile vero (Iris Xe): cosa mandare

Quello che qui non si può misurare: i tempi della scheda video (MSAA 2× + l'ingrandimento, le ombre, il riempimento), le compilazioni
con Direct3D, i caricamenti veri. Due prove, ognuna due volte: **con** e **senza** `?noritmo8` (stesso posto, stesso percorso).

**A. Il riquadro F3** (Chrome, finestra a tutto schermo, il gioco con `?perf` per avere anche la classifica dei moduli):
1. aprire `…/porto-vecchio/?perf`, entrare in strada, fermarsi nel vicolo dei Pescatori 20 s; poi camminare fino alla piazza; poi guidare 30 s;
2. in ognuno dei tre momenti fotografare il riquadro F3 (o copiare il testo). Le righe da mandare:
   - `NN fps · peggiore NN ms` (il peggiore conta più dei fps: è lo scatto);
   - `fotogramma NN ms = gioco NN ms + attesa NN ms` (gioco alto = processore; attesa alta = scheda video o browser);
   - `hd · scala … · righe …/1080 (…) · tela … · ingrandisce N ms · tetto … · LOWQ … · aa 2×`;
   - `logica N ms · grafica (processore) N ms`;
   - `scheda video N ms: scena … · post … · upscale …`;
   - `NNN disegni · NNNk triangoli · NNN shader`;
   - le prime 6 righe della classifica `— i moduli più pesanti —`.
3. rifare tutto con `…/porto-vecchio/?perf&noritmo8`.

**B. Il banco del ritmo** (nuovo, `strumenti/banco_ritmo_console.js`): stesso posto, F12 → Console, incollare tutto il file, poi
`bancoRitmo()` e giocare normalmente 20 s (camminare, girare la camera). Il JSON finisce negli appunti: incollarlo così com'è. Dice fps,
intervallo fra fotogrammi (p50/p95/p99, quanti oltre 33/50/100 ms), ms di processore per fotogramma di R.frame, G.step e del braccio di
camera7, i long task, la memoria JS prima e dopo, disegni/triangoli/programmi, la riga hd, lo stato di ritmo8 (raggi dal ricordo, griglie,
pile, il disegnatore dei graffiti vivo). Rifarlo con `?noritmo8`.

**C. La scheda video** (`strumenti/banco_gpu_console.js`, invariato): aprire `…/porto-vecchio/?perf&noritmo`, fermarsi in piazza, F12,
incollare il file, `bancoGPU()`, non toccare niente per ~60 s, copiare la tabella (`console.table`). Le colonne `gpuScena`, `gpuPost`,
`gpuIngr` (l'ingrandimento) e le prove `hd640` / `hd1080` dicono quanto costano la risoluzione e l'ingrandimento sulla scheda vera.

**MSAA e partenza del regolatore su Intel: proposta, non cambiata.** Il primo F3 del committente (Iris Xe, prima del profilo leggero) era
113 ms di processore contro 60 di scheda: il collo è il processore, ed è lì che questo ramo lavora. Lato scheda il regolatore di hd parte
già dalla soglia (640 righe) e sale solo se il timer della scheda dice che c'è margine; l'MSAA 2× ha preso il posto dell'FXAA (−6 letture
per pixel, +1 risolvere da ~17 MB a fotogramma a 640 righe), l'ingrandimento è ~0,5-1 ms stimato. Due cose da guardare nei numeri di B e C:
- se `gpuIngr` supera ~1,5 ms o `scheda video` resta sopra ~14 ms a 640 righe, proporrei **sul profilo leggero Intel il tetto delle righe a
  900** invece di 1080: sopra le 900 righe `hdombre` allarga la mappa del sole da 1053² a 1438² (×1,89 texel) proprio quando la scala sale;
- se la riga hd mostra la scala che cambia spesso (`cambi` nel banco del ritmo, più di uno ogni 5-10 s), ogni cambio rifà i bersagli
  (MSAA, profondità, ingrandimento): uno scatto per cambio. Lì basterebbe alzare il margine per salire (oggi 80% del fotogramma) al 70%.
Senza i numeri della scheda vera non cambio né l'MSAA né la partenza: con MSAA spento tornerebbero i bordi che friggono che hd ha tolto.

## 6. Cosa resta aperto

- Il disegno di three lato processore (550-1400 disegni) e le matrici sono ora la parte più grande del fotogramma; non sono nuovi
  (uguali con gli interruttori di ieri spenti). Ridurli vuol dire meno disegni (fusioni, istanze): lavoro a parte.
- Il braccio di camera7 resta il costo più alto fra le cose nuove nei posti fitti (alla nascita: ~128.000 triangoli per fotogramma, la cella
  di 2 m sotto il personaggio ne ha migliaia). Un indice spaziale vero per le mesh dei tasselli (al posto della griglia in pianta) lo
  abbatterebbe, ma costa memoria sul telefono.
- La lettura della foto della tavoletta (sincrona) si potrebbe fare con un buffer e un recinto (PBO + fenceSync) aprendo il pannello un
  fotogramma dopo: è il flusso del blocco graffiti, non toccato.
- Le compilazioni a metà gioco sul portatile vero: guardare il `peggiore` di F3 quando entra un tassello nuovo; `peso_pronti.js` (vivo) le
  dovrebbe già assorbire con `KHR_parallel_shader_compile`.

## 7. Le prove

TEST_ESITO
