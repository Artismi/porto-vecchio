# Prestazioni sul telefono — il progetto di ricerca

## 1. Il progetto

Dall'analisi (ANALISI.md): sul telefono il gioco è limitato dal processore (1.200-1.800 disegni per fotogramma nell'APK coi tasselli,
14-15 mila oggetti in scena, heap 600-800 MB, GC frequenti), con blocchi periodici (il salvataggio che tiene fermo il passo, le griglie
dei raggi costruite al primo raggio, i caricamenti sulla scheda video) e una catena di comandi lunga. Le domande che contano per noi:

1. **WebView Android e WebGL.** Come disegna la WebView (draw functor, thread della GPU nel processo dell'app, SurfaceControl)? Quanto
   costa rispetto a Chrome? Ci sono impostazioni che pesano (layer, frequenza dello schermo, priorità)? TWA o Custom Tab sono un'alternativa?
2. **Il costo di un disegno in WebGL.** Quanto costa una chiamata di disegno nel browser (validazione di Blink, command buffer, ANGLE)
   sul telefono? Qual è il budget ragionevole di disegni e di cambi di programma/materiale per 30 fps su un Android medio?
3. **Batching e instancing in three.js (r149).** mergeGeometries, InstancedMesh, BatchedMesh (r159+), atlanti e array di tessiture,
   colori ai vertici al posto dei materiali per oggetto; come fondere i mezzi (scocca, vetri, ruote) e i micro-gruppi statici.
4. **Ombre a basso costo.** Ombre in cache, sagome povere, chiazze a terra (blob) per i mezzi, aggiornamento a frequenza ridotta.
5. **Passo fisso con interpolazione** nei giochi web (accumulatore, «Fix your timestep»), spirale della morte, come interpolare la
   camera e le persone.
6. **Tetti di fps e pacing** nel browser: rAF che salta giri, 30 regolari su 60 Hz, Android Frame Pacing, frequenza dello schermo.
7. **GC di V8 nei giochi**: Scavenger, Mark-Compact, Orinoco (concorrente e incrementale), quanto costano le pause, come evitarle
   (pool, niente allocazioni nel ciclo, heap piccolo), geometrie lato processore da liberare dopo il caricamento.
8. **Salvare senza bloccare**: structuredClone, worker, IndexedDB, CompressionStream, fotografie incrementali.
9. **Misurare su Android**: chrome://inspect sulla WebView (setWebContentsDebuggingEnabled), Perfetto (CPU, frequenze, termico, GPU),
   dumpsys gfxinfo, AGI; cosa guardare per primo.
10. **Latenza dei comandi** nelle pagine con iframe dello stesso sito: postMessage contro chiamata diretta.

Fonti da cercare: la documentazione di three.js (manuale, forum discourse.threejs.org, note di rilascio), MDN WebGL best practices,
Khronos, Chromium (android_webview/docs, gpu), Android Developers (frame pacing, Perfetto, WebView, performance class), V8 blog (GC),
Gaffer on Games (timestep), talk GDC / Google I/O su giochi web e WebGL su mobile, articoli di chi ha pubblicato giochi WebGL su mobile
(PlayCanvas, Babylon, Construct, Poki). Nelle ricerche solo termini generici.

## 2. Cosa ho imparato

Le ricerche: solo termini generici. Le fonti autorevoli trovate sono poche su alcuni punti (WebView contro Chrome, salvataggi): lo
segnalo dove la prova è aneddotica.

### 2.1 Il budget dei disegni sul telefono (domanda 2, 3)
- PlayCanvas dà **100-200 disegni** come obiettivo indicativo sui telefoni di fascia bassa; ogni disegno costa tempo di processore per
  passare a WebGL; meno materiali vuol dire meno shader e meno scatti di compilazione; vettori e matrici preallocati («ogni `new` nel
  ciclo porta il GC e i blocchi periodici»); collisioni su una mesh più povera di quella disegnata.
  https://developer.playcanvas.com/user-manual/optimization/guidelines/
- Arm (forum degli sviluppatori): ~500 disegni come tetto pratico sulla maggior parte dei telefoni, più su quelli alti, a prezzo di
  processore e batteria; i cambi di stato rendono ogni disegno più caro. https://community.arm.com/support-forums/f/graphics-gaming-and-vr-forum/48848/overhead-of-the-driver
- Meta (WebXR): il costo di processore di un disegno è quasi indipendente dalla complessità dell'oggetto.
  https://developers.meta.com/vr/documentation/web/webxr-perf-workflow/
- MDN, WebGL best practices: raggruppare i disegni, atlanti di tessiture (cambiare tessitura spezza il lotto); `getError`,
  `getParameter`, `getProgramParameter` prima che la compilazione sia finita, `readPixels` sincrono «fanno svuotare e fare il giro» col
  processo della GPU; `KHR_parallel_shader_compile` per non aspettare; i caricamenti di tessiture «prima di cominciare a disegnare, o
  almeno fra un passo e l'altro»; sulle GPU a tasselli `invalidateFramebuffer` per profondità e campioni MSAA.
  https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
- three.js: `BatchedMesh` (dopo la nostra r149; usa `WEBGL_multi_draw`, con ripiego più lento dove manca) riduce i disegni di forme
  diverse con un materiale; per noi oggi: `mergeGeometries` per lo statico, `InstancedMesh` per le copie, colori ai vertici invece di un
  materiale per oggetto. https://threejs.org/docs/api/en/objects/BatchedMesh.html ,
  https://developer.mozilla.org/docs/Web/API/WEBGL_multi_draw , https://discourse.threejs.org/t/instancedmesh-for-simple-geometries/28658

**Per noi**: 1.200-1.800 disegni sono 3-10 volte il budget di tutte le fonti. Il bersaglio realistico è 300-400 (prima tappa <600).

### 2.2 Ombre (domanda 4)
- Le ombre a mappa si ridisegnano a ogni fotogramma finché sono accese; «nessuna ombra» è la scelta consigliata per telefoni bassi; la
  pratica dei giochi su telefono sono le chiazze a terra (decal) per i corpi che si muovono.
  https://discourse.threejs.org/t/super-fast-dynamic-but-basic-shadows/74506 , https://polycount.com/discussion/comment/2522383
- **Per noi**: i mezzi fanno 100-250 disegni nella sola ombra: sul telefono via l'ombra a mappa dei mezzi (resta il disco/ombra a
  terra già presente nel gioco per le persone; per i mezzi una sagoma piatta in seguito).

### 2.3 Passo fisso e interpolazione (domanda 5)
- Gaffer on Games, «Fix Your Timestep!»: accumulatore, passi di dt fisso, tetto al tempo del fotogramma (0,25 s) contro la spirale,
  disegno che fonde stato precedente e attuale con alpha = resto/dt. https://gafferongames.com/post/fix_your_timestep/
- Comandi dentro il passo fisso: campionare l'input una volta per fotogramma e consumarlo nel primo passo.
  https://jakubtomsu.github.io/posts/input_in_fixed_timestep
- **Per noi**: è la soluzione strutturale (F3). Il «tempo pieno» di cinema.js (fino a 2 passi variabili, uno se caro) è un ibrido che
  sul telefono oscilla: per ora si spegne sul telefono; il passo fisso viene dopo, con l'interpolazione di persone, mezzi e camera.

### 2.4 Tetti e pacing (domanda 6)
- Android Frame Pacing (Swappy): 30 fps su uno schermo a 60 Hz senza pacing danno tempi come «49, 16, 33 ms»; fotogrammi brevi seguiti
  da lunghi si leggono come scatti; meglio un ritmo costante, e la frequenza dello schermo più vicina al ritmo voluto.
  https://developer.android.com/games/sdk/frame-pacing
- Nel browser non c'è un tetto standard: si chiama rAF a ogni giro e si salta il disegno se non è passato abbastanza tempo (quello che
  fa peso_ritmo). https://groups.google.com/a/chromium.org/g/chromium-html5/c/qLxS7RmTM8w
- **Per noi**: tetto a 30 fisso sul telefono (niente prove di risalita, che sono 2 s di altalena 60/30 ciascuna), schermo a 60 Hz (già
  in MainActivity), risoluzione decisa all'avvio e poi ferma (ogni cambio rialloca i bersagli: un fotogramma lungo).

### 2.5 GC di V8 (domanda 7)
- Orinoco: lo Scavenger (giovani) parallelo, la marcatura concorrente e incrementale per il resto; ma le raccolte grandi possono
  cadere in mezzo a un'animazione, e la barriera di scrittura costa. https://v8.dev/blog/trash-talk ,
  https://v8.dev/blog/concurrent-marking , https://v8.dev/blog/orinoco-parallel-scavenger
- three.js: `onUploadCallback` per liberare l'array lato processore dopo il caricamento (non vale per gli aggiornamenti); `dispose()`
  per i buffer della GPU. https://threejs.org/docs/api/en/core/BufferAttribute.html ,
  https://discourse.threejs.org/t/how-to-free-cpu-side-memory-for-geometry-texture-already-on-gpu/70602
- **Per noi**: niente allocazioni nel ciclo (pool), heap più piccolo; ma le geometrie servono ai raggi (camera, graffiti): liberarle
  richiede mesh di collisione separate (strutturale).

### 2.6 Salvare senza bloccare (domanda 8)
- Il clone strutturato e la serializzazione costano sul filo principale; spostare il lavoro in un worker e passare ArrayBuffer
  trasferibili evita la copia; si può scrivere IndexedDB dal worker. https://nolanlawson.com/2016/02/29/high-performance-web-worker-messages/ ,
  https://developer.chrome.com/blog/transferable-objects-lightning-fast , https://web.dev/structured-clone/
- **Per noi**: il salvataggio di unico_salva tiene fermo il passo durante la fotografia (87 fotogrammi misurati) e la compressione dura
  minuti. Sul telefono: niente salvataggio periodico (resta a pausa/hidden/pagehide/sonno, quando il giocatore non gioca).

### 2.7 WebView contro Chrome/TWA (domanda 1)
- La WebView disegna attraverso il draw functor sul RenderThread dell'app; le segnalazioni pubbliche (aneddotiche, vecchie) danno
  fino a 2× meno fps che in Chrome per lo stesso WebGL; nessun banco autorevole. Il disegno in software va sempre evitato.
  https://groups.google.com/a/chromium.org/g/graphics-dev/c/_inOdqCzNzM , https://forum.babylonjs.com/t/webgl2-perfomance-issue-on-android-embeded-webview-vs-chrome/1319 ,
  https://chromium.googlesource.com/chromium/src/+/refs/tags/92.0.4515.74/android_webview/docs/software_draw_deprecated.md
- TWA: Chrome a tutto schermo nell'app, «le prestazioni di Chrome», ma serve un sito verificato (Digital Asset Links) e Chrome sul
  telefono. https://developer.android.com/develop/ui/views/layout/webapps/trusted-web-activities , https://web.dev/articles/web-on-android
- **Per noi**: la prova A/B (stesso gioco in Chrome sul telefono contro l'APK) va fatta per prima sul telefono; se il divario è grande,
  la TWA verso il sito Vercel è un'opzione seria.

### 2.8 Misurare sul telefono (domanda 9)
- `WebView.setWebContentsDebuggingEnabled(true)` (solo nelle build di prova) e chrome://inspect dal computer: DevTools e tracce anche
  della WebView di sistema; registrazioni brevi (≤10 s), un'attività per volta. Perfetto/Traceur per frequenze, termico, GPU.
  https://developer.chrome.com/docs/devtools/remote-debugging/webviews ,
  https://chromium.org/developers/how-tos/trace-event-profiling-tool/recording-tracing-runs
- **Per noi**: la build `-Pprova` deve accendere il debug della WebView (fuori dal mio intervento: android/ non è nella mia cartella di
  lavoro più di tanto; lo lascio scritto).

## 3. Come cambia il piano

1. **Conferma**: la priorità sono i disegni (le fonti danno 100-500, noi 1.200-1.800). Primo colpo misurabile e sicuro: via l'ombra a
   mappa dei mezzi sul telefono (100-250 disegni), poi i micro-gruppi statici fusi (grate e ingressi: ~140 disegni da fermi
   all'avvio), poi i mezzi fusi.
2. **Tetto**: 30 fisso sul telefono, niente prove di risalita, risoluzione e gradini decisi nei primi secondi e poi fermi (Swappy:
   il ritmo costante conta più della media).
3. **Tempo**: `Cinema.passi` spento sul telefono adesso; il passo fisso con interpolazione resta il lavoro strutturale.
4. **Salvataggio**: sul telefono niente salvataggio periodico; il worker per JSON e gzip resta da fare.
5. **Compilazioni e caricamenti**: niente letture sincrone dei programmi a gioco vivo (già c'è peso_pronti col parallel compile); i
   caricamenti dei tasselli sulla scheda video da distribuire (resta).
6. **Misure sul telefono**: prima la prova A/B Chrome/APK e `?perf`; debug della WebView nella build di prova.

### 3.1 Dopo l'indicazione del committente (lavoro conservativo)
Niente funzioni tolte, niente cambi visibili senza una foto: il salvataggio sul telefono non si spegne, si sposta nella pausa (scaduti i
3 minuti parte appena il gioco è fermo: pausa, taccuino, menu che ferma il mondo, dialogo; restano hidden, pagehide e il sonno); l'ombra
dei mezzi non si toglie, la fa la sola scocca; il «tempo pieno» di cinema.js resta, con l'isteresi sul costo del passo invece che spento;
il livello basso dei mezzi sul telefono da 45 m (non 28). Ogni passo un commit, con la misura prima e dopo.
