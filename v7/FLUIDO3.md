# Porto Vecchio sul telefono: fluido, terza passata ([fluido3])

Ramo `fluido3` (da `origin/claude/shader-styling-performance-wbvqfy`, 8aff0e7). Una passata breve: analisi di sistema (la WebView,
il renderer, la scena contata), poi solo le vittorie sicure, **stessa immagine** (nessun dettaglio vicino in meno, niente sul look, il
computer non cambia). Tavola: `_immagini/fluido/fluido3.jpg` (l'inizio sul telefono, prima | dopo, coi numeri).

Misure come in FLUIDO.md: `strumenti/banco_fluido.js` (il Game Boy dell'APK, telefono Android di traverso, processore ×4, SwiftShader),
qui un solo posto (l'inizio, 90 fotogrammi) prima e dopo; più tre sonde usa e getta (inventario della scena, prove del frustum e matrici
per ramo, celle a confronto nella stessa pagina). La macchina è condivisa (carico 5-20): valgono i rapporti.

## 1. Cosa dice la letteratura (breve)

| tema | regola pratica | fonte |
|---|---|---|
| disegni e oggetti | sul telefono medio la scena soffre oltre qualche centinaio di disegni; InstancedMesh per forme uguali, BatchedMesh (three r159+, qui c'è r149) per forme diverse con lo stesso materiale; si misura con `renderer.info` | [utsubo, 100 tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips) |
| matrici e prove | ogni oggetto visitato costa (matrice, prova del frustum, lista): i fermi con `matrixAutoUpdate=false`, la prova per gruppi | idem; qui già fatto (render.js `[matrici]`, FRZ, peso_fusi «settori») |
| chiamate che bloccano | `getError`, `getParameter`, `readPixels` sincroni, `checkFramebufferStatus`: anche >1 ms l'una; i registri degli shader solo col debug; `KHR_parallel_shader_compile` | [MDN, WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices) |
| tessiture | compresse (ETC/ASTC via KTX2/Basis): meno memoria e meno banda, «preziosa sul telefono»; ETC1S piccolo, UASTC fedele | MDN; [Don McCurdy, texture formats](https://www.donmccurdy.com/2024/02/11/web-texture-formats/) |
| precisione | `mediump` è più veloce ma spesso rompe l'immagine | MDN |
| schede a tasselli (Mali, Adreno) | pulire all'inizio del passo è gratis, non pulire costa una rilettura; invalidare profondità e campioni MSAA che non servono; ogni cambio di bersaglio scrive e rilegge la memoria | [Qualcomm Adreno, tiling](https://developer.qualcomm.com/sites/default/files/docs/adreno-gpu/snapdragon-game-toolkit/gdg/gpu/best_practices_tiling.html); [Vulkan, TBR](https://docs.vulkan.org/guide/latest/tile_based_rendering_best_practices.html); [Meta, GPU pipelines](https://developers.meta.com/horizon/documentation/native/android/po-advanced-gpu-pipelines/) |
| MSAA | nel tassello è quasi gratis se si risolve lì; in WebGL2 su un bersaglio (renderbuffer multicampione + `blitFramebuffer`) i campioni vanno in memoria e si rileggono: costa banda | Vulkan TBR; Meta |
| WebView | l'accelerazione è di serie; mai `LAYER_TYPE_SOFTWARE` (niente WebGL); il disegno in software è deprecato | [Chromium, software draw deprecated](https://chromium.googlesource.com/chromium/src/+/refs/tags/92.0.4515.74/android_webview/docs/software_draw_deprecated.md) |
| priorità e prestazioni sostenute | `setRendererPriorityPolicy` dice quanto è facile uccidere il processo della pagina (non la velocità); `Window.setSustainedPerformanceMode` (Android 7+, se `isSustainedPerformanceModeSupported`) dà un livello costante invece del picco e poi del taglio termico | [AOSP, performance management](https://source.android.com/docs/core/power/performance) |
| frequenza dello schermo | `preferredRefreshRate` / `preferredDisplayModeId` (o `Surface.setFrameRate`): lo schermo al ritmo del gioco; Android 15 mette i giochi a 60 Hz di serie per i consumi; decide il sistema | [Android, frame rate](https://developer.android.com/media/optimize/performance/frame-rate); [high refresh rate](https://android-developers.googleblog.com/2020/04/high-refresh-rate-rendering-on-android.html) |
| ritmo | meglio un 30 regolare (30 = 60/2) che un ritmo variabile; Android vitals conta lenti i fotogrammi oltre 34 ms; seguire lo stato termico e scendere prima del taglio | [Frame pacing](https://developer.android.com/games/sdk/frame-pacing); [slow sessions](https://developer.android.com/topic/performance/vitals/slow-session); [consumi](https://developer.android.com/games/optimize/power) |
| memoria | niente allocazioni nel giro del fotogramma: ogni raccolta sul telefono è un fotogramma lungo | utsubo; MDN |

## 2. Questa app

### La WebView (android/)

| voce | com'era | giudizio |
|---|---|---|
| accelerazione | `hardwareAccelerated="true"`, nessun `setLayerType` | giusto (mai software) |
| cache, file, zoom, viewport | `LOAD_DEFAULT`, asset via `WebViewAssetLoader` (https vero), zoom spento, `useWideViewPort`, `textZoom 100` | giusto |
| debug | nessun `setWebContentsDebuggingEnabled`, nessun registro degli shader (`?debug`) | giusto |
| pre-raster fuori schermo | `setOffscreenPreRaster(false)` | giusto (una sola WebView, sempre in vista) |
| keep-screen-on, schermo intero | `FLAG_KEEP_SCREEN_ON`, immersivo, ritaglio `ALWAYS` | giusto |
| **frequenza dello schermo** | quella del telefono (90/120 Hz sui medi recenti) | **da sistemare**: il gioco va a 30 (peso_ritmo), il browser girava 90-120 giri al secondo |
| **prestazioni sostenute** | no | **da aggiungere** dove c'è |
| priorità del processo della pagina | quella di serie | esplicita (`IMPORTANT`, anche se la pagina non si vede un attimo) |
| sfondo della finestra | il colore del tema, ridisegnato sotto la WebView opaca | via (`setBackgroundDrawable(null)`) |
| **la pagina d'ingresso** | il caricamento del Game Boy, nascosto (`data-hidden`, opacità 0), con la scritta che pulsa (`animation: y 1.2s infinite`) **sempre in corsa** sotto il gioco (sonda: `document.getAnimations()` in gioco = 1) | **da sistemare**: un'animazione infinita tiene il compositore a produrre un fotogramma a ogni giro dello schermo |
| dpr | 2,75 nel profilo; il gioco disegna alla sua risoluzione interna (523-616 × 310-365) e il browser la stende una volta | giusto |

### Il renderer

Contesto WebGL2 `alpha:false, antialias:false, preserveDrawingBuffer:false, powerPreference:'high-performance'`, `highp` (23 bit),
pixel ratio 1, scena in un bersaglio (616×365 al gradino 2 di partenza, 523×310 al 6 dove arriva il regolatore), MSAA 2× solo nel
bersaglio e solo fino al gradino 3 (fluido_tel lo toglie al 4), due passi a tutta tela (la sagoma a mezza risoluzione e il passo unico),
l'ombra del sole PCF morbida 997² in cache (peso_ombre: si ridisegna solo chi si muove), un giro su due (uno su tre al gradino 6).
Nessuna lettura sincrona nel fotogramma. **Il lato della scheda video è già stato ridotto ~4× (FLUIDO2): il collo di bottiglia è il
processore.**

### La scena contata (l'inizio, telefono, città costruita nel browser)

36.253 oggetti, 28.724 mesh (11.966 accese, **545 nell'inquadratura**), 9.848 figli della scena, 17.975 materiali (22.357
MeshStandard), 193 programmi; a fotogramma ~509 disegni con ~300 materiali diversi (306 cambi), 2.050 uniform, 215 cambi di programma.
Nel solo disegno della scena: **~6.700-7.400 prove del frustum** (LOD dei mezzi 805, case 683, treno della miniera 658, persone e verde
591, buildings 537, ferrovia 512, dettagli 511…) e **8.268 matrici** (mezzi 3.456, persone e verde 3.013, treno 677).

### Dove va il processore (l'inizio, ×4: 431 ms di JS a fotogramma, mediana 408)

| | ms/fot | % | con impatto visivo se si taglia? |
|---|---:|---:|---|
| three: proiezione (prove del frustum, lista) | 61 | 14 | no, se si prova meno (celle) |
| three: i ~509 disegni (stato, uniform, chiamate) | 65 + 38 | 24 | sì, salvo fondere (materiali condivisi, pile di mappe) |
| il «programma» (codice nativo: le chiamate WebGL, il compositore sul filo) | 77 | 14 | segue i disegni |
| l'ombra del sole (peso_ombre: chi si muove, la firma) | 40 | 9 | no, ma è già a dosi |
| i blocchi del terreno che si costruiscono (camminando) | 40 | 9 | no, ma è lavoro vero |
| le matrici (8.268 nodi) | 31 | 7 | **no** |
| il braccio della camera, i raggi | 21 + 22 | 10 | no, già riusati |
| la simulazione | 21 | 5 | no |
| i giri di servizio (rilascio, congelati, fette) | 12 + 11 + 16 | 9 | **no** |
| raccolte della memoria (9,4 MB allocati a fotogramma) | 10 | 2 | no |

## 3. Cosa cambia (tutto telefono, stessa immagine)

1. **Lo schermo a 60 Hz** (MainActivity `prestazioni`): `preferredRefreshRate = 60` e, se c'è, il modo dello schermo a 60 Hz della stessa
   risoluzione. Il gioco sul telefono va a 30 regolari = 60/2; a 90/120 Hz il browser faceva 3-4 giri (tutti i requestAnimationFrame dei
   moduli, il compositore) per un fotogramma disegnato. **Stima: −30/−50% del lavoro a vuoto del browser e del compositore sui telefoni a
   90/120 Hz, meno calore; niente sui 60 Hz.**
2. **Le prestazioni sostenute** (`setSustainedPerformanceMode`, dove `isSustainedPerformanceModeSupported`, solo col gioco davanti):
   niente picco e poi taglio termico dopo 5-10 minuti. **Stima: fotogrammi stabili nel tempo; sui telefoni che non lo offrono niente.**
   Se il telefono dell'utente lo offre e i primi minuti calano, è la prima riga da togliere.
3. **La WebView**: `LAYER_TYPE_NONE` esplicito, il processo della pagina a priorità `IMPORTANT`, niente sfondo della finestra. Di
   correttezza più che di velocità.
4. **L'ingresso non anima più da nascosto** (`android/app/src/main/ingresso/index.html` e `ingresso/costruisci.mjs`:
   `[data-hidden="true"] *{animation:none}`): la scritta del caricamento pulsava all'infinito sotto il gioco. **Stima: il compositore
   a 30 fotogrammi al secondo (quelli del gioco) invece che a ogni giro dello schermo: −50/−75% di composizioni della tela a tutto
   schermo (2,6 Mpx l'una a dpr 2,75), cioè banda della scheda video e batteria.**
5. **I mezzi che non si vedono non rifanno le matrici** (render.js `mezziFermiTel`, `?nomzl`): durante il disegno della scena i mezzi
   spenti dal gioco (fuori dalla vista) e il livello alto di ogni LOD oltre la sua distanza (la stessa misura che three fa subito dopo,
   distanza/zoom > soglia + 2 m: in quel fotogramma è spento) saltano il giro delle matrici; dopo, la matrice si rifà alla prima occasione
   (`__mwRe`). Non si disegnano e non fanno ombra; chi le chiede fuori dal disegno (`getWorldPosition`, `updateMatrixWorld`) le ha giuste.
6. **Le celle di peso_fusi a 12 m invece di 32** (`?nocelletel`): la vista del telefono copre poche decine di metri e una cella da 32 m a
   cavallo del bordo faceva provare tutti i suoi rami. Nella stessa pagina (sonda, 30 fotogrammi per misura): 32 m 6.517-6.882 prove,
   16 m 5.553-5.844, **12 m 5.354**, 8 m 4.761; il disegno della scena (JS, senza disegnare) 39,9 → 36,6 ms a 16 m. La prova della cella
   è prudente come prima: stessa immagine.
7. **Il giro del rilascio ogni 6 s invece di 3** sul telefono (geometrie uscite dalla scena liberate qualche secondo dopo).
8. Il banco conta i mezzi fermi e le celle (`inventario.mezziFermi`, `inventario.celle`).

## 4. Prima e dopo (l'inizio, telefono, processore ×4, 90 fotogrammi)

Il regolatore (fluido_tel) arriva al gradino 6 in tutti e due i giri: stessa risoluzione (523×310), stesso look (la tavola). Lo stato del
mondo non è identico fra due giri (la missione mostrata, chi passa), quindi ±10% su simulazione, ombre e raccolte è rumore.

| | prima | dopo | |
|---|---:|---:|---:|
| JS per fotogramma, ms (media / mediana / p95) | 431 / 408 / 584 | 412 / 402 / 613 | −4,5% |
| · grafica (R.frame) | 353 | 323 | **−8,6%** |
| · disegno di three (Js.render) | 212 | 194 | −8,5% |
| · · proiezione (prove del frustum, lista) | 61,1 | 45,8 | **−25%** |
| · · prove del frustum (catena dei moduli) | 22,2 | 17,0 | −23% |
| · matrici della scena (scene.updateMatrixWorld) | 31,5 | 25,6 | **−19%** (34 mezzi o livelli saltati) |
| · giro del rilascio | 11,9 | sotto 8 (fuori dai primi 80) | ~−50% |
| · ombra del sole (peso_ombre, passata) | 39,5 | 47,6 | rumore (chi si muove nel riquadro) |
| · blocchi del terreno | 40,1 | 34,6 | rumore |
| simulazione / altro | 21 / 57 | 27 / 62 | rumore |
| disegni (scena / ombra / passi) | 572 (507 / 63 / 2) | 545 (498 / 45 / 2) | |
| triangoli | 1.151k | 1.100k | |
| programmi usati / cambi | 109 / 215 | 109 / 213 | |
| uniform a fotogramma | 2.052 | 2.038 | |
| celle dei settori (fuori) | 212 (174) | 754 (637), 5.811 rami tolti dalla proiezione | |
| GC ms/fot · allocato KB/fot | 10,2 · 9.440 | 13,7 · 9.085 | rumore |
| SwiftShader ms: scena / ombra / passo unico | 1.946 / 108 / 207 | 1.959 / 63 / 200 | stesso lavoro della scheda |

**Non misurabile qui** (servono il telefono vero e il compositore vero, non quello senza testa): lo schermo a 60 Hz, l'animazione
dell'ingresso spenta, le prestazioni sostenute. Sono le voci che sul telefono possono pesare più di tutto il resto (vedi le stime al punto 3):
a 120 Hz il browser faceva 4 giri per un fotogramma del gioco e il compositore ricomponeva lo schermo intero a ogni giro.
Prova di fumo (`fumo6.js`): `errori []` (la foto va in timeout a 30 s come nelle passate di prima).

## 5. Cosa resta (in ordine di guadagno stimato)

| | stima | perché non qui |
|---|---|---|
| **meno disegni e meno materiali**: ~509 disegni con ~300 materiali (17.975 nella scena, quasi uno per mesh); materiali uguali condivisi (una chiave dei parametri, all'avvio) e le case fuse (`fusione1`, 100 disegni) con una pila di mappe per settore | −20/−30% della grafica del processore | i materiali sono toccati uno per uno da altri sistemi (le case che sbiadiscono, le finestre accese, le insegne): va fatto con loro |
| **il fogliame** (blob da 494 e 326 triangoli istanziati: 150k triangoli all'inizio): un blob più semplice oltre ~30 m | −10% dei triangoli | cambia la sagoma da vicino se sbagliato: va guardato con chi fa il verde |
| **i blocchi del terreno** camminando (40 ms/fot ×4 all'inizio, `c2Raw` 2 MB allocati a fotogramma) | −5/−8% camminando | è il calcolo della riva per vertice: va riscritto, non accorciato |
| **il treno della miniera** (677 nodi mai fermi, 658 prove a fotogramma anche fuori vista) | −3% | sta in writing.js (graffiti, altra sessione): una sfera per carro e il salto delle matrici come per i mezzi |
| **lo stato termico** (`PowerManager.getThermalHeadroom`, Android 11+) passato alla pagina: fluido_tel scende un gradino prima del taglio | fotogrammi stabili nel tempo | serve il telefono vero per tararlo |
| **KTX2/Basis** per le tessiture grandi dei tasselli | memoria della scheda video −4×, avvio | la scena è a 523×310: la banda delle tessiture non è il collo di bottiglia; utile per la memoria (le chiusure della pagina) |
| **MSAA spento dall'avvio** | banda della scena al gradino 2 | il regolatore lo toglie già al gradino 4 quando serve; dall'avvio cambierebbe gli spigoli |
| `mediump` | poco | rompe i retini e le coordinate del mondo (fino a ~1.500 m) |

## Gli interruttori

`?nomzl` · `?nocelletel` (e i vecchi di FLUIDO.md e FLUIDO2.md). Nell'APK le impostazioni dell'Activity non hanno interruttore: per
provarle senza, si commenta `prestazioni(w)` in MainActivity. **I tasselli vanno ricotti** (`python3 build.py --tasselli`): render.js è
cambiato e l'impronta della pagina con lui (la build dell'APK si ferma se non coincidono).
