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

(sotto, a ricerca svolta)
