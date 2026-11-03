# Porto Vecchio — Caricamento, streaming e memoria: diagnosi e piano (1 novembre)

Il committente: «ci mette tanto ad aprirsi, i pavimenti e le piante arrivano tardi»; deve andare liscio sul portatile con Intel Iris Xe
**senza perdere qualità**. Questo documento copre l'avvio, lo streaming (tasselli, blocchi del terreno, verde), gli invii alla scheda
video, la memoria e gli scatti mentre si cammina. Il costo per fotogramma (logica, disegno) lo segue un'altra analisi: qui si segnala
solo quello che nasce dallo streaming.

**Come si è misurato.** `strumenti/sonda_streaming.js` (nuovo): il gioco vero (`index.html?cittanuova&leggera&perf&tassellivecchi`,
i tasselli di `v7/tasselli`) in Chromium senza testa con SwiftShader, 400×225. La pagina servita ha in più solo dei `performance.mark`
prima di ogni `<script data-m>`; WebGL è contato alla fonte (byte di `texImage*`, `texSubImage*`, `bufferData`, `bufferSubData`, le
allocazioni, le compilazioni, chi le chiede dalla pila), più le richieste di rete, i messaggi ai lavoratori, `--trace-gc` di V8 e il
profilo del processore per fase. Poi si cammina come sul portatile: **1 m a fotogramma** (5 m/s a 5 fps, quello che fa l'Iris Xe), 48 m
avanti e 48 indietro, un giro completo della camera sul posto, lo zoom indietro e avanti.
La pagina è quella del ramo fra 803ca02 e 75ec12d (le prove sono delle 21:29-22:00). La macchina (4 processori) era condivisa con le sonde di altri lavori (carico 6-16): **i tempi assoluti sono gonfiati 2-4 volte; valgono
i conteggi, i byte, i fotogrammi e i rapporti**. Le stime per l'Iris Xe sono intervalli. I dati grezzi: `node strumenti/sonda_streaming.js
--vista=400x225 --tratto=48` (JSON in `$TMPDIR/streaming_<nome>.json`).

---

## 0. In una riga

L'avvio è lungo per lavoro che si potrebbe cuocere (l'acqua, il blocco sotto la camera, il mondo in base64) e per i programmi della scheda
video; ma la sensazione di «arriva tardi» viene soprattutto da **tre code che avanzano a colpi di fotogramma** mentre il portatile fa 4-7
fotogrammi al secondo: i **blocchi del terreno** (dipinti sul filo della pagina, 6+6 ms a fotogramma: ~33 fotogrammi l'uno), i **tasselli
della città** (partono a fine `R.init` e salgono un passo per fotogramma: la città vicina arriva 10 fotogrammi dopo «Gioca») e il **verde**
acceso a scatti per blocco. Camminando, poi, **l'ombra del sole si ricuoce per intero a ogni fotogramma** e i tasselli si smontano e
rimontano (riscaricati, ridecodificati, reinviati) a ogni giro di camera.

## 1. La linea del tempo misurata

| Tappa (`window.__tl`) | SwiftShader, carico 6 | Cosa c'è dentro | Iris Xe, stima |
|---|---:|---|---:|
| pagina letta ed eseguita (fino all'ultimo modulo) | 4,1 s | moduli 3,6 s: mondo cotto (lettura sincrona) 0,55, `cotto` 0,35, `segnaletica` 0,33, `main` 0,32, `tetti` 0,27, `percorsi` 0,25 | 1,5-2,5 s + rete |
| `R.init` (`init0` → `init1`) | 7,3 s | **acqua 6,5 s** (`buildWater`), isola 0,45 | 2-3 s |
| compilazione (`init1` → `compilato`) | 6,0 s | blocco sotto la camera 2,6 s (`preparaArrivo`), `PesoPronti.compila` 3,4 s (123 programmi) | 2-4 s |
| primi fotogrammi fino a «Gioca» (`vivo`) | 24 s, 12 fotogrammi | 17 s di attese dei programmi (`getProgramParameter`; senza `KHR_parallel_shader_compile` in SwiftShader) | 3-10 s (Direct3D compila: «Preparo la grafica») |
| città vicina in scena (`tasselliVicino`) | **+30 s dopo «Gioca», 10 fotogrammi** | 16 tasselli, 4,8 MB, decodifica ~3 s nei lavoratori | +2-4 s di pop-in |
| blocchi del terreno vicini (9 attorno alla camera) | **2 su 9 dopo 48 s**; 6 blocchi in 200 fotogrammi di gioco | ~33 fotogrammi per blocco | **5-15 s per blocco, 1-2 min per i 9** |

Byte del primo avvio (quello che va in rete): `index.html` 12,4 MB → **4,21 MB gzip / 3,22 brotli**; `mondo_cotto.js` 19,6 MB → 1,67 /
1,42; `tasselli/indice.json` + `dati.json` 4,2 MB → 0,47 gzip; i 16 tasselli dell'anello vicino 4,8 MB più le loro tessiture (webp, 1-2 MB); 82
modelli `.glb.gz` 6,3 MB. Totale prima di vedere la città: **~19 MB** (~17,5 con brotli).

---

## 2. Le cause, in ordine di peso

### 1. I blocchi del terreno (pavimenti, piante, verde) si dipingono sul filo della pagina, un pezzetto a fotogramma
**Evidenza.** Un blocco (64 m) è 9 fasi: la tela da 512×512 dipinta pixel per pixel in Canvas2D (in memoria normale), la scabrosità, la
luce cotta, le mappe dei pavimenti, la riva, le piante, il bosco, il verde (`render.js buildChunkGen`). Misurato, per blocco: 170-3.400 ms
di processore (mediana 300-700 nelle due prove); per fase, su tutta la sessione, **pittura 64%**, verde 21% (quasi tutto un blocco solo,
1,4 s), pavimenti 7-18%, riva e bosco il resto. Il tempo concesso:
6 ms nel fotogramma (`tettoV`) più al più 6 ms della pompa nel tempo libero (`POMPA`, un giro a fotogramma), e ogni domanda al lavoratore
`Calcolo` costa almeno un fotogramma (4-21 attese per blocco). Risultato: **10-77 fotogrammi per blocco** (`ISO.arrivo.blocchi`), 2 dei
9 vicini dopo 48 s di gioco, 6 blocchi in 200 fotogrammi. Dove il blocco manca si vede l'isola a bassa risoluzione: «i pavimenti arrivano
tardi». Sul leggero la tela si dipinge comunque a 512 e poi si dimezza (`LeggeraMem.meta`): stesso costo, metà qualità.
**Rimedio.** Cuocere i blocchi come la città: la cottura dei tasselli (`tassella.js`) fa già girare il gioco vero col seme fisso; basta
chiedergli ogni blocco (`buildChunk`, oggi escluso: la fase `island` resta viva) e salvare per blocco la tela (webp 512 e 256), la scabrosità, la luce cotta, le quattro mappe dei pavimenti (`id`, `id2`, `fi`, `mk`:
interi in virgola mobile, in gzip comprimono bene) e le istanze di piante, bosco e verde; il gioco li scarica e li monta come i tasselli.
I blocchi «sporchi» (`dirtyAt`: alberi tagliati, cantieri) si rifanno come oggi. In alternativa (o per i soli sporchi) la pittura in un
lavoratore con `OffscreenCanvas`: usa i 3-7 processori liberi invece del tempo del fotogramma.
**Guadagno.** I 9 blocchi vicini in scena insieme alla città (≈0,1-0,4 MB a blocco da scaricare invece di 0,15-1 s di processore);
**−12 ms a fotogramma** di costruzione mentre si cammina; −2,6 s di avvio (`preparaArrivo`). **Qualità**: la stessa (gli stessi pixel);
sul portatile si può mandare la tela a 512 invece che dimezzata (meglio). **Fatica**: media-alta (3-5 giorni: esportatore, formato, caricatore,
ripiego).

### 2. L'ombra del sole si ricuoce per intero a ogni fotogramma in movimento (e la sua mappa si rialloca)
**Evidenza.** `PesoOmbre` (`peso_ombre.js`) dovrebbe cuocere le cose ferme una volta e poi solo copiare. Misurato: **99 cotture intere in
99 fotogrammi a piedi, 37 su 37 girando la camera, 35 su 46 con lo zoom**, zero lavori in sottofondo (`aggancio` 0), quasi zero aggiunte.
Su tutta la sessione 203 cotture, nessuna in sottofondo; i motivi (`PesoOmbre.diag().motivi`): `chiave` (la matrice della camera d'ombra è
cambiata) 121, `misura` (la mappa ha cambiato dimensione) 82. Le cause nel codice: `render.js profSole` riscrive `sc.far` quando `far !== PSH.far` (confronto esatto: `far` segue
`half`, che segue lo zoom che scorre) e la matrice cambia di un nulla; `PesoOmbre.sole` rifà il riquadro quando `half`/`tex` cambiano e
**rialloca la mappa**; `tasselli.js ombre()` a ogni tassello montato, smontato o completato spegne e riaccende `PesoOmbre`, e `spegni()`
riporta la mappa alla misura di partenza (dispose) così il fotogramma dopo la rialloca e cuoce da capo. Conteggio: **103 allocazioni di
bersagli mentre si gioca (417 MB presi e lasciati, quasi tutte mappe d'ombra da ≈4,6 MB) in ~12 minuti**. Così la cache costa più dell'ombra semplice di three (la stessa passata intera, più le copie e le riallocazioni).
**Rimedio.** (a) Quantizzare `half` e `far` (al metro o al texel) e confrontare con tolleranza, così la matrice non cambia finché il
riquadro non salta davvero; (b) nei tasselli niente `attivo=false/true`: chiedere a `PesoOmbre` le **aggiunte** (c'è già: chi aggiunge
ombre si disegna sopra la mappa cotta, esatto) e, per lo smontaggio, una ricottura in sottofondo solo se la scatola del tassello tocca il
riquadro del sole (di solito no: si smonta fuori vista); (c) `spegni()` non deve rimettere la misura di partenza; (d) il riquadro «stretto»
sulla visuale si aggancia a passi di angolo (girando la camera oggi cambia a ogni fotogramma).
**Guadagno.** Mentre ci si muove, una passata d'ombra intera in meno per fotogramma (la scena ferma del riquadro: sull'Iris Xe stimati
5-15 ms di scheda video e 3-8 ms di processore per le chiamate) e nessuna riallocazione da 4,6 MB. È lo **stesso lavoro che finisce
nell'«attesa»** del riquadro F3. **Qualità**: la stessa mappa (la cache è pensata pixel per pixel). **Fatica**: bassa (1 giorno). Tocca
anche il fronte del costo per fotogramma: da concordare.

### 3. I tasselli si smontano e si rimontano: riscaricati, ridecodificati, reinviati
**Evidenza.** In ~12 minuti di prova (≈100 m a piedi, un giro di camera, uno zoom): **74 richieste ripetute** (una dozzina sono modelli chiesti due volte
all'avvio, il resto tasselli: lo stesso `t_28_7.bin`, 1,2 MB, 5 volte; `t_28_6`, `t_27_7`, `t_25_5`, `t_28_8` 4 volte), **61 decodifiche**
nel lavoratore (28 MB di tasselli scaricati contro i 4,8 dell'anello vicino), 19 smontaggi e 24 riaperture, 83 tessiture liberate e
riscaricate, **41 MB di buffer identici reinviati** alla scheda video. Il giro della camera sul posto smonta 3
tasselli e ne riapre 4; lo zoom ne smonta 8. Le cause (`tasselli.js`): sul leggero si monta a impronta + 24 m e si smonta a impronta + 40 m
(isteresi 16 m), ma l'impronta è il riquadro della vista **orientata** (cambia con la regia che gira la camera e con la nebbia che segue lo
zoom); sul leggero il compresso si butta appena aperto (`CFG.leggero`: si riscarica); `riapri` riscarica e **decodifica tutto il tassello**
per prendere qualche mesh rimandata o i dati dei raggi; `texLascia` libera la tessitura appena l'ultimo tassello se ne va. Ogni rimontaggio
mostra per qualche fotogramma la **sagoma** al posto delle case: è il pop-in delle case girando.
**Rimedio.** (a) Smontare per tempo e distanza (fuori dall'impronta larga da più di 8-10 s, o oltre il raggio di scarico), non al primo
fotogramma fuori; (b) sul portatile un **tetto di memoria** della scheda video per i tasselli (es. 300-400 MB, l'Iris Xe usa la RAM) con
lo scarico del meno usato, al posto dello scarico immediato; (c) tenere il compresso (tutta la città sono 24,8 MB di tasselli) e le
tessiture per 30-60 s dopo l'ultimo uso; (d) `riapri`: il lavoratore tiene in memoria gli ultimi tasselli aperti, o decodifica solo i
blocchi delle mesh chieste (i blocchi sono già separati nel formato).
**Guadagno.** Niente sagome girando e zoomando; −60-80% di decodifiche, scaricamenti e invii mentre si gioca (sull'Iris Xe ogni
rimontaggio è 1-8 MB di invii e 5-20 ms di montaggio sul filo della pagina). **Qualità**: meglio (niente pop-in). **Fatica**: bassa-media
(1-2 giorni).

### 4. La città vicina arriva 10 fotogrammi dopo «Gioca», e quando arriva fa un invio da 56 MB
**Evidenza.** I tasselli partono solo in `Tasselli.monta`, alla fine di `R.init`; da lì scaricamento, apertura e montaggio avanzano solo
dentro `tick` (un `requestAnimationFrame`): una tappa per fotogramma, al più 3 in volo. I primi fotogrammi sono lenti (programmi, invii),
quindi la città vicina è in scena **30 s e 10 fotogrammi dopo «Gioca»** (`__tl.tasselliVicino` − `__tl.gioco`), mentre «Gioca» è già
acceso. Prima dell'anello vicino il tetto è 40 ms e **4 milioni di vertici a fotogramma**: misurato un fotogramma con **56 MB** di invii
(buffer + `texSubImage3D` da 8 MB delle pile), 9 fotogrammi su 17 sopra 1 MB.
**Rimedio.** Lo scaricamento e la decodifica dell'anello vicino partono con `Tasselli.pronto` (prima di `boot`: il punto di partenza è noto)
e ogni tappa si concatena alla risposta (promessa), non al fotogramma; il montaggio dell'anello vicino si fa dietro lo schermo di carico,
**prima** della compilazione; «Gioca» (`vivo`) aspetta `tasselliVicino` e i blocchi vicini (con un tetto di tempo). Gli invii dell'anello
vicino si fanno nel caricamento (`renderer.initTexture`, un disegno a vuoto), non al primo fotogramma di gioco.
**Guadagno.** **La città intera al primo sguardo**; −10 fotogrammi di sagome; via lo scatto da 56 MB. L'attesa in totale non cresce: la
decodifica (~3 s qui) corre nei lavoratori mentre il filo della pagina fa `R.init`. **Qualità**: meglio. **Fatica**: bassa-media (1 giorno).

### 5. Programmi della scheda video che nascono dopo la compilazione (le ombre non sono mai compilate prima)
**Evidenza.** La compilazione del caricamento ne prepara 123, ma **altri 37 nascono dopo**: 17 nei primi
fotogrammi, 14 nei primi secondi di gioco, poi 1-3 per ogni tratto di cammino (187 alla fine). Su 37 programmi tardi, **13 sono `MeshDepthMaterial`**, le
varianti di profondità della passata d'ombra: `renderer.compile` (e `PesoPronti.compila`) compila solo i materiali della scena, e
`PesoPronti.vivo` rimanda solo i programmi del disegno principale (la passata d'ombra di three chiama `renderBufferDirect` con
`scene` nullo, e lì il rinvio non scatta); nella passata d'ombra la compilazione **ferma** il fotogramma. Gli altri
sono Lambert/Standard/Basic di cose che entrano dopo (tasselli vivi, persone, insegne). Sull'Iris Xe con Direct3D ogni programma è 100-500
ms (la misura scritta in `peso_pronti.js`, «[tieni]»).
**Rimedio.** Nel caricamento, dopo `PesoPronti.compila`: una passata d'ombra del sole a vuoto con tutte le cose che fanno ombra accese
(compila le varianti di profondità, anche quelle con `pid` dei tasselli) e i modelli d'esempio che mancano (un tassello vivo, una persona
vestita); l'elenco dei programmi tardi lo dà la sonda (`out.tardi`: tipo e chiave).
**Guadagno.** −10-30 fermate da 0,1-0,5 s nel primo minuto di gioco sull'Iris Xe. **Qualità**: nessun cambio. **Fatica**: bassa.
**Nel frattempo** 75ec12d (dopo queste prove) compila nel caricamento le varianti d'ombra (programmi d'ombra a gioco iniziato 8 → 0): resta
da fare per i ~24 programmi del disegno principale che nascono dopo (Lambert, Standard, Basic dei tasselli vivi, delle persone, delle insegne).

### 6. La pagina: 12,4 MB in un file solo, il mondo cotto in base64 letto in modo sincrono
**Evidenza.** (a) `mondo_cotto.js` (19,6 MB) si legge con una richiesta **sincrona** che parte solo quando il parser arriva al suo script,
dopo 2,1 MB di moduli letti ed eseguiti: in rete è un tempo in serie (1,67 MB gzip: 0,3-1,5 s), e da locale costa già 0,55 s di lettura
(stringa da 19,6 MB, `JSON.parse` due volte sui punti). I 13,2 MB di dati binari stanno in **base64 dentro una stringa JS** (17,6 MB), poi
`atob` e un ciclo `charCodeAt` (`cotto.js daB64`): +33% di byte e 0,35 s. (b) Tutto in un HTML: niente cache del codice di V8 (Chrome la tiene per
gli script esterni, non per quelli scritti nella pagina), niente lettura in sottofondo, e ogni deploy fa riscaricare tutti i 4,2 MB. La compilazione di primo livello dei moduli
vale ~0,5 s (misurata in Node, stessa V8; `three.min` 116 ms, `render` 62, `interiors` 59). (c) Peso che non serve all'avvio:
`fonts_graffiti.js` **706 KB gzip, il 17% della pagina** (i font dei graffiti in base64, i `.woff2` sono già in `assets/`); `world.js`
71 KB gzip letto ma mai eseguito con la città nuova; doppioni: `writer_mano`+`writer_arte`+`pennelli` ripetuti come testo per il lavoratore
(470 KB), `calcolo_lavoratore.js` e `meshopt_decoder.js` due volte, **`regia.js` incluso ed eseguito due volte** (righe 416 e 437 di
`index.src.html`).
**Rimedio.** `<link rel="preload" as="fetch">` del mondo cotto in testa alla pagina con `?v=<impronta>` (cache immutabile), il binario in un
`.bin` a parte e i punti in JSON semplice; `build.py` che scrive ogni modulo come file esterno con l'impronta nel nome (`immutable` come gli
`assets`), i lavoratori che caricano lo stesso file (`importScripts`) invece della copia in testo; i font dei graffiti dal primo graffito;
via `world.js` dalla build della città nuova e il secondo `regia.js`; servire brotli (4,21 → 3,22 MB).
**Guadagno.** Primo avvio: la pagina da 4,21 a 3,33 MB in gzip togliendo font, `world.js` e doppioni, **2,53 MB con brotli** (−40%;
misurato sul file), e il mondo cotto in parallelo alla pagina (−0,3-1,5 s secondo la linea); avvii
dopo un deploy: si riscarica solo il modulo cambiato (−3-4 MB) e la compilazione la salta la cache di V8 (−0,3-0,6 s). **Qualità**: nessun
cambio. **Fatica**: media (2 giorni: `build.py`, l'ordine degli script resta quello di oggi).

### 7. `R.init` è quasi tutto l'acqua
**Evidenza.** Coi tasselli `R.init` fa solo cielo, isola, acqua, segni, particelle: 7,3 s, di cui **acqua 6,5 s** (11 s nel primo giro):
`buildWater` scrive la maschera della terra e la profondità pixel per pixel su tutta l'isola e la sfoca due volte coi filtri 2D (`blur(2px)`,
`blur(5px)`) su tele da 1.300×400 e più, tutto sul processore. È deterministico (dipende solo dalla mappa).
**Rimedio.** Cuocere le due tessiture dell'acqua (profondità/fondale e maschera sfocata) nel mondo cotto o nei tasselli, e montarle come
immagini (decodificate fuori dal filo con `createImageBitmap`). Lo stesso per `segnaletica` (`prenota`, 0,33 s), `tetti` e `percorsi`
(0,25 s ciascuno all'esecuzione dello script) se sono calcoli sulla mappa.
**Guadagno.** −6,5 s in SwiftShader, **−1,5-3 s sull'Iris Xe**. **Qualità**: identica. **Fatica**: bassa-media (1 giorno).

### 8. Il profilo leggero del portatile usa i tagli di memoria del telefono, che abbassano la risoluzione
**Evidenza.** Sull'Iris Xe `profilo.js` aggiunge `?leggera`, e con lui partono i tagli di `leggera_memoria.js` pensati per il telefono:
tessiture dei tasselli nella variante `tel` (45 tessiture, per esempio 2048² → 512²), terreno dipinto a metà lato (4 px per metro invece di
8), atlanti di persone, scorci e segnaletica a metà, pile delle case a non oltre 256. Sul portatile la memoria non manca (la scheda usa la
RAM) e una tessitura più piccola, con le mipmap, non fa guadagnare fotogrammi: è **qualità persa per niente**.
**Rimedio.** Separare i due profili: «leggera» (il costo della scheda video: luci, ombre, risoluzione interna) sul portatile; «memoria del
telefono» solo col tocco o con `navigator.deviceMemory` ≤ 4.
**Guadagno.** Qualità piena delle tessiture sul portatile; costo: +2,3 MB da scaricare (tessiture dei tasselli piene 5,5 MB contro 3,2),
+60-150 MB sulla scheda video. **Qualità**: meglio. **Fatica**: bassa (mezza giornata).

### 9. Il verde e il bosco si accendono a scatti per blocco
**Evidenza.** `render.js updateChunks`: il verde di un blocco (`ch.vd`) è visibile se il bordo del blocco è entro **36 m** (62 sul
computer), il bosco vero (`ch.nat`) entro 34 m (58) con lo scambio secco con gli alberi bassi (`lt`). Il blocco è di 64 m: un'intera
fascia di erba e fiori compare in un fotogramma. In più `vegetazione.js aggiorna` rifà tutti gli elenchi delle istanze entro 90 m (150 sul
computer) ogni 4 m di cammino e le reinvia intere (`instanceMatrix.needsUpdate`); i `bufferSubData` in tutto sono ~0,3 MB a fotogramma
(anche da fermi: non sono solo del verde).
**Rimedio.** Dissolvenza a retino per distanza nello shader del verde e del bosco (come `vegetazione.js uBand`), con le istanze già in scena
un po' oltre la soglia; elenchi per celle da 16 m aggiunte e tolte ai bordi invece che rifatti.
**Guadagno.** Niente comparse di prati e boschi; −50-80% degli invii del verde. **Qualità**: meglio. **Fatica**: bassa-media (1 giorno).

### 10. Gli invii alla scheda video non hanno un tetto in byte
**Evidenza.** Camminando: invii per fotogramma **mediana 0,6-1 MB, 95° percentile 3-9 MB, massimo 11,5 MB**; un fotogramma su tre a piedi
sopra 1 MB. I grossi: `texSubImage3D` da 8 MB (le pile delle case dei tasselli, con le mipmap), buffer dei tasselli da 1-5 MB, le 4-5
tessiture di ogni blocco con le mipmap, il verde. Il tetto che c'è (`Tasselli.CFG.vertici`, 90.000 vertici sul leggero) conta i vertici,
non i byte, e ignora le tessiture, che three invia al primo disegno.
**Rimedio.** Una quota unica in byte per fotogramma (2-4 MB sull'Iris Xe) per tutto quello che arriva: `renderer.initTexture` sulle
tessiture nuove prima di metterle in scena, le pile grandi a strati (`texSubImage3D` per livello), i buffer di un tassello in più
fotogrammi, il resto al fotogramma dopo.
**Guadagno.** Via gli scatti da 10-50 ms dei fotogrammi con 5-11 MB di invii. **Qualità**: nessun cambio. **Fatica**: bassa-media.

### 11. La memoria
**Evidenza** (leggero, dopo l'arrivo → camminando; heap da `performance.memory`, che comprende i dati dei buffer; scheda video contata alla
fonte): **heap JS 400-500 MB**; **scheda video 173 MB → 250-273 MB** (tessiture 104 → 130-160, buffer 60 → 100-110, più i bersagli).
Doppioni: 14,7 MB di geometrie con gli stessi dati su 67 MB tenuti in pagina (le 92 copie di `tasselli_aloni`, gruppi di 12-15 mesh
uguali), 4,6 MB di tessiture uguali su 43 MB. Il ricambio: le mappe d'ombra riallocate (punto 2: 417 MB) e i buffer reinviati
(punto 3: 41 MB). Raccolta: una **Mark-Compact da 0,3-0,66 s per fase** (una ogni 1,5-3 minuti) e 700-1.000 Scavenge per fase (0,7-1,4 s in tutto,
la più lunga 0,12-0,23 s), in SwiftShader carico e con la sonda che aggiunge un po' di spazzatura: valgono come ordine di grandezza.
**Rimedio.** I punti 2 e 3 tolgono il grosso del ricambio. Poi: le geometrie uguali condivise (aloni, gruppi ripetuti dei tasselli vivi);
il campionatore dell'heap sul cammino (`banco_memoria.js --campiona`) per trovare chi alloca a ogni fotogramma (le pause da 0,3 s sono
scatti visibili). **Qualità**: nessun cambio. **Fatica**: bassa.

### 12. Cose piccole
- 12 modelli di `assets/mj` (`t_Crate`, `t_Pallet`, …) si chiedono **due volte** all'avvio (due caricatori in corsa): un'unica promessa
  per indirizzo.
- `profilo.js` crea un contesto WebGL usa e getta per leggere il nome della scheda (su Direct3D 50-150 ms): il nome si può leggere dal
  contesto vero (`avvio.js` lo fa già) e decidere il profilo prima di `R.init`.
- Il precarico dei kit (`avvio.js`, `?precarico`) è spento perché in SwiftShader allungava `R.init`: lì la scheda video è il processore;
  sul portatile va riprovato.

## 3. L'«attesa» da 400 ms: cosa può venire dallo streaming
Il riquadro F3 chiama «attesa» il tempo fuori dai moduli misurati: la scheda video, il navigatore, i cicli senza nome. Il profilo del
processore della pagina durante il cammino (`--profilo`, 34 fotogrammi a piedi e 25 girando) dice dove sta il filo della pagina: **fermo ad
aspettare il 71-80% del tempo**, 7-14% bloccato in `getProgramParameter` (programmi compilati al volo), ~10% di JS in tutto (render.js
1,6-1,8%, three 2,2%), raccolta della memoria ~1%. In SwiftShader la scheda video è il processore, ma la forma vale anche per l'Iris Xe: il
fotogramma lento è **lavoro della scheda video che la pagina aspetta**, e lo streaming ne aggiunge. In ordine:
1. la **passata d'ombra intera a ogni fotogramma** in movimento e le riallocazioni della mappa (punto 2; confermata in tutte e tre le
   prove: 34 cotture su 34 fotogrammi a piedi, 25 su 25 girando): lavoro della scheda video che la pagina aspetta al fotogramma dopo;
2. i **fotogrammi con 5-56 MB di invii** (punti 4 e 10) e le mipmap delle pile;
3. i **programmi compilati nella passata d'ombra** (punto 5): l'attesa della compilazione cade dentro `R.frame` (in F3 sono picchi di
   «grafica», non di attesa), ma il fotogramma si ferma lo stesso;
4. (il grosso di «altro:ciclo» sull'Iris Xe era `writing.js frame`, trovato e corretto dall'analisi del processore, 803ca02.) `Tasselli.tick`
   è un `requestAnimationFrame` nato dentro `boot()` (una promessa, senza `document.currentScript`): `misura.js` lo chiama
   `altro[tick@…]`, non «tasselli». Se in F3 compare quel nome, è lui (il suo tetto è 4 ms, ma 40 ms finché manca l'anello vicino);
5. le Mark-Compact da 0,3-0,6 s (punto 11).

## 4. Piano, in ordine

| # | Passo | Punti | Guadagno atteso sull'Iris Xe | Qualità | Fatica |
|---|---|---|---|---|---|
| 1 | Ombra del sole: tolleranza su `half`/`far`, aggiunte dei tasselli invece di spegnere, niente riallocazioni | 2 | −5-15 ms di scheda e −3-8 ms di processore a ogni fotogramma in movimento | uguale | 1 g |
| 2 | Tasselli: anello vicino scaricato e aperto durante `R.init`, tappe a promessa, montaggio e invii dietro lo schermo di carico, «Gioca» dopo l'anello vicino | 4 | città intera al primo sguardo, via lo scatto da 56 MB | meglio | 1 g |
| 3 | Tasselli: smontaggio per tempo, tetto di memoria, compresso e tessiture tenuti, `riapri` senza ridecodificare | 3 | niente sagome girando, −60-80% di decodifiche e invii | meglio | 1-2 g |
| 4 | Programmi dei modelli tardi compilati nel caricamento (le ombre: fatto in 75ec12d) | 5 | −10-30 fermate da 0,1-0,5 s nel primo minuto | uguale | 0,5 g |
| 5 | Profilo del portatile senza i tagli di memoria del telefono | 8 | tessiture piene | meglio | 0,5 g |
| 6 | Verde e bosco in dissolvenza, elenchi del verde a celle | 9 | niente comparse di prati e boschi | meglio | 1 g |
| 7 | Quota di invii in byte per fotogramma | 10 | via gli scatti da 10-50 ms | uguale | 1 g |
| 8 | **Blocchi del terreno cotti** (o dipinti in un lavoratore) | 1 | pavimenti e piante con la città; −12 ms a fotogramma camminando; −2,6 s di avvio | uguale o meglio | 3-5 g |
| 9 | Acqua cotta (e i calcoli di `segnaletica`, `tetti`, `percorsi` all'avvio) | 7 | −1,5-3 s di avvio | uguale | 1 g |
| 10 | Pagina a moduli esterni con impronta, mondo cotto in preload e in binario, font dei graffiti al primo uso, doppioni via, brotli | 6 | pagina −1,7 MB (−40%), −0,3-1,5 s al primo avvio; −3-4 MB e −0,3-0,6 s dopo ogni deploy | uguale | 2 g |
| 11 | Memoria: geometrie condivise, campionatore sul cammino, le richieste doppie | 11, 12 | meno pause di raccolta | uguale | 1 g |

I passi 1-5 sono piccoli e insieme tolgono quasi tutto lo «spunta dopo» delle case e gran parte degli scatti camminando; il passo 8 è il
lavoro grosso che risolve i pavimenti e le piante. Ogni passo si verifica con `strumenti/sonda_streaming.js` (stessa prova prima e dopo:
cotture d'ombra per fotogramma, riscaricamenti, decodifiche, programmi tardi, fotogrammi per blocco, MB di invii per fotogramma) e con le
foto a confronto per la stessa immagine; poi con F3 sul portatile vero.
