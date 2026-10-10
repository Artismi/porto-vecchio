# Porto Vecchio — Alleggerimento (10 ottobre)

Camminando il gioco si fermava per qualche secondo e poi ripartiva. Con un profilo della CPU mentre il personaggio cammina
(Playwright + Chromium, `Profiler` di DevTools) le cause erano quasi tutte letture sincrone dalla GPU (`getImageData`) e
lavoro pesante fatto nel fotogramma in cui una cosa entra in vista. Niente è stato tolto dal gioco: cambia quando e come si
fa il lavoro, e si evitano i doppioni.

## Le cause e le correzioni

- **I blocchi di città** (`buildChunk`, render.js): ogni blocco nuovo rileggeva dalla GPU tutta la tela del suolo per farne
  la mappa della lucidità. Ora la lucidità la calcola lo shader dalla texture stessa (`ROUGH_GLSL`, stessa formula).
  `snowPass` con la neve spenta (`NEVE = false`) non sfoca né rilegge più il velo, che era tutto trasparente.
  Nel profilo: la costruzione dei blocchi è passata da circa 105 s a 1,4 s.
- **I graffiti dei writer** (writer_arte.js, writing.js): ogni lavoro entro 80 m si ridisegnava da capo, tappa per tappa,
  a 100 pixel per metro, rileggendo le tele dalla GPU; oltre 140 m veniva buttato e tornando si ricominciava.
  Ora le tele del disegno stanno in memoria (`willReadFrequently`), il campo del braccio si calcola su una griglia rada e
  vale per tutte le tappe (`warpGrid`), e i lavori finiti lasciati indietro tengono l'immagine finale (`ART_KEEP`, 48).
- **Gli shader**: si compilavano la prima volta che una cosa entrava in vista. `warmShaders()` li compila all'inizio
  (al terzo fotogramma e al 150°), anche per le cose nascoste, sul bersaglio vero del disegno (`rt`). Muovendosi ne
  nascono ancora una manciata (le varianti delle ombre), non più decine.
- **Le persone**: chi si allontana lascia il modello in serbo (`PKEEP`, 160) e tornando si riusa; al massimo 3 modelli
  nuovi per fotogramma (chi parla con te e chi è nella stanza passano sempre).

## Il doppio degli abitanti (popolo.js)
- `CFG.max` 420 → 840, `CFG.maxNear` 70 → 130. Il limite vero erano i posti letto: la capienza delle case è raddoppiata
  (13 m² a testa nei palazzi, 21 nelle case; 48 e 14 al massimo).
- Con il seme 1: 902 abitanti invece di 484, per strada attorno a te 48 invece di 22. Il passo della simulazione
  in Node passa da 3,5 a 6,2 ms (sono quelli vicini che camminano davvero).

## Il riflesso bianco a terra
Il suolo è un `MeshStandardMaterial` col riflesso del cielo: con la visuale inclinata (zoom ravvicinato) il Fresnel del
sole e del cielo diventava un velo bianco, gonfiato dal bloom. `MATTE_GLSL` tiene solo un filo di speculare
(diretto × 0,18 con un tetto, indiretto × 0,3) sui blocchi di terreno e sull'isola di sfondo. Colori e luci invariati.

## Tombini, bidoni, oggetti uno dentro l'altro
- **Tombini**: c'erano quattro giri indipendenti (quelli veri del sottosuolo, uno a ogni incrocio e il 40% lungo le vie,
  quelli dipinti sull'asfalto, i chiusini sotto il vapore, fino a settanta a caso in centro). `manholeFree` è un registro
  unico: prima quelli veri (`Sottosuolo.TPL.portals`, ci si scende), poi i decorativi solo a 12-14 m da ogni altro.
  I chiusini del vapore sono un solo `InstancedMesh`.
- **Rifiuti**: `trashFree` fa lo stesso per bidoni, cassonetti e campane: quelli messi a mano vengono prima, sui
  marciapiedi del centro un bidone ogni 9 m al massimo, cassonetti ad almeno 14 m l'uno dall'altro. Il tiro dei dadi
  dei marciapiedi resta uguale, quindi il resto dell'arredo non si sposta.
- **Compenetrazioni, senza perdere nulla**: la pulizia `pulizia35` (fuori dalle case, fuori dalla carreggiata, niente
  uno dentro l'altro) girava a metà costruzione e toglieva gli oggetti fuori posto; ora gira anche alla fine (`pulizia39`)
  e vale per tutto quello messo dopo (incroci, strade, arredo urbano, guardrail…). Un oggetto fuori posto prima si
  sposta (`moveProp35`: il punto libero e in piano più vicino, fino a 3 m); si toglie solo se non c'è posto.
  Con il seme di prova: 107 spostati, 14 tolti (prima delle modifiche ne sparivano 32 nella sola prima pulizia).

## Come misurare
- Profilo camminando, istantanee e misure senza disegno: gli script usati stanno fuori dal repository; il metodo è
  `Profiler.start` via CDP, poi `W` tenuto premuto, e il riepilogo per funzione (tempo incluso) dal `.cpuprofile`.
- Nel container il disegno è via software (SwiftShader): i tempi assoluti dei fotogrammi non valgono, i rapporti sì.
