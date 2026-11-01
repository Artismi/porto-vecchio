# Porto Vecchio — Analisi del processore (filo della pagina), 1 novembre

Ramo `claude/shader-styling-performance-wbvqfy` (482d163), `?cittanuova&leggera&tassellivecchi`, città a tasselli.
Obiettivo: sull'Iris Xe dell'utente un 30 fisso (meglio 60) **senza perdere niente dell'immagine**. Qui solo il fronte del
processore: tutto quello che gira a ogni fotogramma, nei timer, nei `requestIdleCallback` e nelle risposte dei lavoratori.

**Come si è misurato.** Chromium senza scheda video (SwiftShader): i millisecondi assoluti non valgono, valgono i rapporti e i
conteggi. Strumento nuovo: `strumenti/sonda_cicli.js` (avvolge, prima di ogni script, `requestAnimationFrame`, `setTimeout`,
`setInterval`, `requestIdleCallback`, i messaggi dei Worker e gli eventi; ogni callback prende il nome `funzione@riga` della riga
di `index.html` che l'ha chiesta, tradotta nel modulo; più le chiamate che fanno aspettare — `getProgramParameter`, `getImageData`,
`drawImage`, `texImage2D`… — attribuite alla callback in cui avvengono, i Long Animation Frame e un `.cpuprofile` per fase).
`--nodraw` manda a vuoto i disegni (come `banco_peso.js`): i fotogrammi corrono alla velocità del processore.
Sull'Iris Xe (F3, `?leggera&perf`): 2 fps, fotogramma 444-508 ms = gioco 32-48 + **attesa 397-476**; `altro:ciclo` **390-469 ms**.

---

## 0. Il colpevole di «altro:ciclo»: `writing.js frame` (i graffiti che cercano il loro muro)

`altro[go@64094]:ciclo` = **`Writing` → `frame()`** (`src/writing.js:2065`, avviato da `go()` a r. 2118 dentro
`DOMContentLoaded`: per questo misura.js non sapeva di chi fosse). Misurato callback per callback:

| fase (SwiftShader, 480×270) | `writing frame` media / fotogramma | massimo | `main` (gioco+grafica) |
| --- | --- | --- | --- |
| fermo, primi 30 s | **101 ms** | 1.213 ms | 897 ms (di cui 740 di compilazione) |
| a piedi, 45 s | **339 ms** | 1.210 ms | 139 ms |
| fermo dopo, 25 s | **714 ms** (più del ciclo del gioco) | 1.504 ms | 661 ms |

Gli altri cicli «altro» pesano poco: `risacca_ui` 3-4 ms, `tasselli tick` 0,4-4 ms (picco 25), `bottino` 0,5-1,4 ms
(ma 355 ms nel primo secondo, §2), `tetti` 0,4-0,7, gli altri sotto 0,2.

Dove va il tempo (profilo, solo i campioni sotto `writing frame`, fase «fermo dopo», 5,5 s):

```
5454 scanNear → 3906 placeWallG → 3830 fitWallG → 3800 nearTris → 3775 MeshBVH.intersectsBox
                                   (iterateOverTriangles 3267, ExtendedTriangle.update 1935: la prova scatola-triangolo)
                   1535 art() sul filo della pagina (pennelli/writer_arte: il disegno del lavoro)
```

Perché costa centinaia di ms a fotogramma:
1. **Il tetto di tempo non tiene.** `scanNear` (r. 2037) dà ai graffiti 1 ms a fotogramma (5 «di corsa»), ma il controllo è fra un
   passo e l'altro del generatore `placeWallG`/`fitWallG` (r. 2057). Il primo passo di `fitWallG` (r. 686) chiama `nearTris`
   (r. 631) su tutte le mesh candidate *prima* del primo `yield`: per ognuna la prova della scatola con l'indice dei raggi
   (`bt.intersectsBox`, r. 650), e se manca l'indice lo costruisce lì (`new MeshBVH`, r. 649). Un passo solo = 100-1.500 ms.
2. **È sempre «di corsa».** `rush` (r. 2030) resta vero finché entro 40 m ci sono meno di 12 graffiti mostrati: nella città a
   tasselli dopo 45 s ce n'era **1** piazzato su 1.593 lavori (sonda: `gfx 0`, `rect 0→1`, `gfxFail` 4→9), quindi corre sempre.
3. **Quasi tutti falliscono e si riprovano.** Un lavoro che non trova il muro torna in coda fino a 4 volte (`gfxFail > 3`), e
   `scanList` riporta a 2 i falliti ogni volta che la camera salta di 60 m (r. 2028): lo stesso conto, rifatto. Ogni tentativo
   costa 0,5-1 s di processore qui. Prova diretta sui 12 lavori più vicini (a 13-14 m): **in 12 casi su 12 il primo raggio
   verso il muro non trova niente** (`rayWall` su 50-184 mesh candidate, 3-24 ms solo lui), `placeWall` → `false`. Quando il primo
   raggio colpisce qualcosa (un palo, un'insegna) parte `fitWallG` con `nearTris` e la griglia di raggi: lì vanno i secondi.
   (I graffiti che non compaiono sui muri della città a tasselli sono anche un difetto visivo: vedi C1, punto d.)
4. **Il disegno fatto qui.** Quando il disegnatore a parte non risponde (o non è ancora nato: `ARTW.ok` era `null` per i primi
   30 s) `artFor` disegna sul filo della pagina (`sync`, r. 914 e 923): 50-200 ms sull'Iris Xe a lavoro, 700 qui.

Perché sull'Iris Xe diventa **l'attesa**: è un ciclo `requestAnimationFrame` separato, fuori da `main:ciclo`, quindi il riquadro
F3 lo conta come «attesa» (fotogramma − gioco). Il suo peso dipende da quanti lavori ci sono attorno (entro 80 m) e da quante
mesh candidate hanno: per questo l'utente ha visto 390-469 ms in un punto, 66 in un altro, 3 dove non ci sono muri dipinti.

---

## 1. I risultati, uno per uno

Ogni voce: **evidenza** · **guadagno stimato sull'Iris Xe** · **rischio per l'immagine** · **lavoro**.
Il guadagno è stimato riportando i rapporti misurati qui sui tempi F3 dell'utente (il suo ciclo del gioco è 32-48 ms contro i
~136 di questa macchina a disegni veri: circa un terzo).

### C1. Graffiti: un tetto di tempo vero dentro `placeWallG` (il colpevole, §0)
- **Evidenza**: §0. `nearTris` e `new MeshBVH` girano interi dentro un passo del generatore; `onPlane` fa 50-130 raggi
  (`rayWall`, r. 604) con un `yield` ogni 6.
- **Cosa fare** (stessi raggi, stesso ordine, stesso risultato, solo spezzato meglio):
  a. `nearTris` diventa generatore: `yield` dopo ogni mesh (e prima di una `new MeshBVH`, che va a sua volta a un fotogramma suo);
     `scanNear` guarda il tempo dentro il ciclo `do … while` anche fra le mesh. Il tetto di 1/5 ms diventa vero.
  b. Prima del `bt.intersectsBox` la prova della scatola d'ingombro (`g.boundingBox` contro `Bl`, oggi fatta solo nel ramo
     senza indice, r. 652): scarta la maggior parte delle mesh grandi senza toccare l'albero.
  c. La memoria del risultato: `nearTris(list, c, E)` per lavoro si calcola una volta (chiave: id del lavoro + versione delle
     geometrie candidate) e non ad ogni tentativo; i fallimenti deterministici (nessun muro, la regola degli strati da seme,
     r. 1046) si ricordano per lavoro finché il tassello sotto non cambia: niente quattro tentativi uguali.
  d. «Di corsa» solo se gli ultimi tentativi sono riusciti (con 9 falliti su 10 non c'è niente da correre); e capire perché
     sui tasselli il primo raggio non trova il muro (12 su 12): i candidati di `bmbCands` (render.js r. 4507, lista rifatta ogni
     6 s) forse non contengono le mesh dei tasselli che fanno da muro, o i loro dati dei raggi (`raggiA`, posizioni a 16 bit,
     `tasselli.js` r. 387 e 435) non rispondono a `rayWall`; da verificare anche con tasselli della stessa build (qui
     `?tassellivecchi`). Oggi è un difetto visivo (muri senza graffiti) oltre che un costo.
  e. Il disegno mai sul filo della pagina: se il disegnatore a parte non c'è ancora o è in coda si aspetta (il lavoro compare
     qualche secondo dopo, identico); `sync()` solo senza Worker/OffscreenCanvas.
  f. A lungo termine: il piazzamento dei lavori NPC è deterministico (stesso seme, stesso muro) → si può **cuocere** con i
     tasselli (`w.anc` come per i lavori salvati, `placeAnchor`, r. 1054) o farlo nel lavoratore `Calcolo`.
- **Guadagno**: tutta l'«attesa» misurata, **~350-450 ms a fotogramma** nei punti con muri dipinti → da 2 fps al limite della
  scheda video (40-46 ms) e del gioco (32-48 ms): **~15-20 fps** senza toccare altro. a+b+e da soli portano il ciclo sotto i
  5 ms a fotogramma (resta lo stesso lavoro totale, a rate).
- **Rischio**: nessuno (stessi riquadri; i graffiti compaiono qualche fotogramma dopo, come già succede col disegnatore).
- **Lavoro**: a+b+e piccolo (mezza giornata); c+d medio; f grande.

### C2. Bottino: modelli rifatti da zero e tutti nello stesso fotogramma
- **Evidenza**: `bottino.js sync` (r. 223-241) costruisce ogni oggetto con `build()` (Modella + `Superfici.vesti` + `unisci`), senza
  cache e senza tetto: nel primo secondo di gioco `altro[init@97559]:ciclo` = **355 ms** (15 modelli in scena, 26 voci in lista).
  Costo per modello misurato: **cestino 78-104 ms**, militare 14-17, bosco 11-24, posto 9-12, carico 3-10, gli altri 1-11.
  Ogni volta che arriva un modello scaricato (`Scaricati.ver`, 14 file) **tutti** i modelli si rifanno (r. 236), anche quelli che
  non usano file scaricati (solo `rottami` chiama `dl()`). Camminando, ogni cestino che entra nei 45 m è uno scatto di ~90 ms.
- **Cosa fare**: un modello campione per (tipo, chiuso, `dlv` solo per chi usa `dl`), poi `clone()` che condivide geometrie e
  materiali (la rotazione per `ref` si mette sul gruppo, come oggi); al più un modello nuovo per fotogramma; i campioni si
  preparano nel caricamento o nel tempo libero.
- **Guadagno**: lo scatto d'avvio (300+ ms) e gli scatti da 30-100 ms camminando; meno memoria (geometrie condivise).
- **Rischio**: nessuno (stesse geometrie, stessi materiali). **Lavoro**: piccolo.

### C3. I programmi dell'ombra si compilano a gioco iniziato
- **Evidenza**: nel ciclo del gioco `getProgramParameter` aspetta **11,1 s su 31 s** (fermo) e 3,7 s su 26 s, quasi tutto dentro
  `sm.render` → `PesoOmbre disegna`. Programmi nati dopo «gioco» (sonda dei programmi): 8 `MeshDepthMaterial` (le varianti
  d'ombra con `onBeforeCompile`, `tasPidD`, istanze, il taglio della casa) e a 115 s `pesoBagliori1`. `PesoPronti.compila`
  e `renderer.compile` preparano i programmi della scena, non quelli della mappa d'ombra.
- **Cosa fare**: nel caricamento, dopo la compilazione della scena, una passata delle ombre (sole e un faretto per tipo) sulla
  scena finta di `peso_pronti.js` con il TAGLIO attivo, più le varianti d'ombra di tasselli/vivi; aspettarle con
  `shadersPronti`. Anche `pesoBagliori` lì.
- **Guadagno**: sull'Iris Xe (Direct3D, compilazione lenta) 8-9 scatti da 0,1-0,5 s nel primo minuto. Fronte condiviso con la
  scheda video. **Rischio**: nessuno. **Lavoro**: piccolo.

### C4. 18 cicli `requestAnimationFrame` che non sanno del tetto a 30
- **Evidenza**: oltre a `main.js` girano 18 cicli propri (writing ×2, bottino, risacca_ui, tasselli, tetti, sottosuolo, cantiere,
  skate, writer_vita, vestiario, personaggi, menu_ui ×2, studio, risacca, …). Con `PesoRitmo` a 30 (`main.js` r. 1144: il giro
  si salta) loro continuano a 60: il lavoro di writing, tasselli, risacca_ui e bottino si fa **due volte per fotogramma
  disegnato**. Inoltre misura.js li attribuisce male (nascono in `DOMContentLoaded`/promesse) e `requestIdleCallback` non è
  misurato (la pompa: 7 ms di media, 41 di picco, finisce nell'«attesa»).
- **Cosa fare**: un registro unico (`Ciclo.aggiungi(nome, fn)`): main.js chiama i moduli dopo `FRAME`, solo nei giri disegnati,
  e misura.js li vede per nome. I moduli che devono restare vivi col gioco in pausa (menu) si registrano «sempre».
- **Guadagno**: col tetto a 30, metà del costo di tutti questi cicli (oggi 10-15 ms a giro sull'Iris Xe, dopo C1); misure giuste.
- **Rischio**: nessuno (un aggiornamento per fotogramma disegnato è tutto quello che si vede). **Lavoro**: medio (meccanico).

### C5. Le etichette di `risacca_ui`
- **Evidenza**: `risacca_ui loop` 3,2-4,1 ms a fotogramma, sempre. `labels()` (r. 434) a ogni fotogramma: due
  `getBoundingClientRect`, `G.BUILDINGS.forEach` su **tutte** le case per le porte entro 9 m (r. 453), proiezioni, scritture di
  stile.
- **Cosa fare**: le porte in una griglia (una volta); i rettangoli di `cv` e `app` solo al `resize`; le etichette solo se camera o
  persone si sono mosse (oggi si riscrivono uguali).
- **Guadagno**: 2-4 ms a fotogramma. **Rischio**: nessuno. **Lavoro**: piccolo.

### C6. I giri della scena a rate: quattro visitatori invece di uno
- **Evidenza** (profilo a piedi, per fotogramma): `sliceWalk` 6 ms, `frzTick` 5 ms (4.000 oggetti a fotogramma, sempre),
  `scene.updateMatrixWorld` 5 ms. Girano in parallelo `frzTick` (render.js r. 17479), `instCull` (r. 17352, 3.000/fotogramma ogni
  secondo), la plastica `SM2W` (r. 18622, 2.000 ogni 3 s), `bmbTick` (r. 4502, 4.000 quando servono i graffiti), il giro di
  `PesoOmbre raccogli` e quello di `peso_bagliori`, `rilascioTick` (4 ms).
- **Cosa fare**: un visitatore solo per fotogramma che chiama tutti i clienti sullo stesso nodo; meglio ancora la registrazione
  all'`add`/`remove` (già intercettati per FRZ e UMW) invece della scoperta per giro.
- **Guadagno**: 5-8 ms → sull'Iris Xe 2-4 ms. **Rischio**: nessuno. **Lavoro**: medio.

### C7. Le pose delle persone: dita e polsi anche a 40 m
- **Evidenza**: `animPerson` 17 ms a fotogramma a piedi (`Anim.apply` → `hand`, `fingers`, `limits`, `applyWorld`). `apply`
  (`animazioni.js` r. 372) fa `g.updateMatrixWorld(true)` sull'intero scheletro e ogni `applyWorld` (r. 289) rifà la matrice
  del sotto-albero; poi three la rifà ancora nel render. Il diradamento esiste solo oltre 28 m (un fotogramma su 2) e 45 m (su 3).
- **Cosa fare**: dita e polsi solo entro ~12 m dalla camera (oltre sono 1-2 pixel); oltre 15 m le pose leggere (`vita`,
  `parla`) a fotogrammi alterni; un `updateMatrixWorld` per persona alla fine invece di uno per osso.
- **Guadagno**: 6-10 ms qui → 2-4 ms sull'Iris Xe (più con tanta gente). **Rischio**: trascurabile (dita sotto il pixel).
  **Lavoro**: piccolo-medio.

### C8. I passi lunghi dei blocchi e della pompa
- **Evidenza**: `updateChunks`/`passoBlocco` 14 ms a fotogramma a piedi con un tetto di 6 ms (`tettoV`, render.js r. 3339): un passo del
  generatore `buildChunkGen` arriva a 20-40 ms; `suoloErbosoG` (vegetazione) 139 ms di tempo proprio nel profilo fermo;
  `pompa` (requestIdleCallback) 7 ms di media e **41 di picco** con un tetto di 6.
- **Cosa fare**: spezzare i passi lunghi (`suoloErbosoG`, `mappeG` dei pavimenti, `riva costruisci`) con `yield` più fitti; i conti
  puri (il prato, le mappe dei pavimenti) nel lavoratore `Calcolo`, che già esiste.
- **Guadagno**: niente fotogrammi oltre il tetto mentre arrivano i blocchi (scatti da 20-40 ms → 6). **Rischio**: nessuno.
  **Lavoro**: medio.

### C9. Persone e mezzi che nascono a metà gioco
- **Evidenza**: a piedi `vesteGen`/`figura`/`costruisci`/`testaKit` (personaggi) 25-30 ms in un fotogramma, `veicolo3d` 35 ms;
  il budget `BUD` c'è ma un passo solo lo supera.
- **Cosa fare**: geometrie dei vestiti in cache per firma del look (molti passanti condividono pezzi); le parti grosse nel
  caricamento o nel tempo libero; `yield` più fitti in `vesteGen`.
- **Guadagno**: scatti da 25-35 ms quando arriva gente. **Rischio**: nessuno. **Lavoro**: medio.

### C10. Il costo di three nel disegno (grafica, processore: 26-41 ms sull'Iris Xe)
- **Evidenza**: 564-804 disegni (F3 dell'utente); scena 8.000-9.000 oggetti, 4.600-5.300 visibili, 21 luci, 1 ombra attiva
  (sonda dei programmi). Profilo: `Js.render` 53 ms/fotogramma qui, di cui l'ombra (`sm.render` → `PesoOmbre`) 18 ms; i due
  `Frustum.intersectsObject` sostituiti (peso_lontano r. 69299 di index.html, render.js r. 17310) 4,5 ms.
- **Cosa fare**: per gli oggetti congelati (FRZ) la sfera nel mondo calcolata una volta e riusata dal controllo d'inquadratura;
  le cose piccole fuori dalla camera dell'ombra con i livelli (le liste ci sono già in PesoOmbre); fondere ancora quello che
  resta sciolto (cfr. ANALISI_FLUIDITA §3). È il fronte della scheda video/disegni: qui solo la parte di processore.
- **Guadagno**: 3-8 ms. **Rischio**: nessuno. **Lavoro**: medio-grande.

### C11. Timer dell'interfaccia
- **Evidenza**: `comandi upd` ogni 200 ms (`querySelectorAll` + `MenuUI.quiCount` → `quiList` → catena di
  `Azioni.playerActions` avvolta da 6+ moduli) e `menu_ui` ogni 400 ms, che rifà lo stesso conto; in una finestra `comandi:timer`
  è arrivato a 110 ms. `quiCount` ha già una memoria di 500 ms ma comandi la scavalca appena scade.
- **Cosa fare**: `quiList` ricalcolata solo quando cambia la cella del giocatore, l'ora di gioco (al minuto) o l'inventario;
  il pulsante e il dock leggono lo stesso valore.
- **Guadagno**: 1-3 ms medi, via i picchi. **Rischio**: nessuno. **Lavoro**: piccolo.

### C12. Allocazioni a ogni fotogramma (basso)
- **Evidenza**: raccolta della memoria ~0,3% del profilo: poco. Le voci evitabili: `new Map(W.works.map(…))` a ogni fotogramma
  su 1.593 lavori (writing r. 2088), `scanList` ogni 150 ms con `filter/map/sort` su tutti i lavori, `new THREE.Vector3` per
  ogni raggio in `onPlane`/`rectOnWall`, `SPILLS.filter` ogni 2 fotogrammi, `LSRC.filter().sort()` ogni 6.
- **Cosa fare**: indice id→lavoro tenuto da `addWork`; lista dei lavori vicini per cella; vettori di lavoro riusati.
- **Guadagno**: 0,5-1 ms e meno pause della memoria sull'Iris Xe. **Rischio**: nessuno. **Lavoro**: piccolo.

### C13. Tasselli
- **Evidenza**: `tick` 0,4-4 ms di media, picco 25 (`monta1` col suo tetto, `apri`, `smonta`); risposte del lavoratore
  `W:onmessage` 1,4 ms di media, picco 19,6. `tick` percorre tutti i tasselli a ogni fotogramma (`IND.tasselli.forEach`, r. 646)
  con distanza e impronta.
- **Cosa fare**: i tasselli per anelli (solo quelli entro `butta` si guardano a ogni fotogramma, gli altri ogni 10); la risposta
  del lavoratore a rate se porta più tasselli insieme.
- **Guadagno**: 1-2 ms, via i picchi. **Rischio**: nessuno. **Lavoro**: piccolo.

---

## 2. Il piano, in ordine

| # | Cosa | Guadagno Iris Xe | Rischio | Lavoro |
| --- | --- | --- | --- | --- |
| 1 | **C1 a+b+e**: tetto vero nei graffiti (yield in `nearTris`, prova della scatola, niente disegno sul filo) | **−350-450 ms** nei punti con muri dipinti (2 → ~15-20 fps) | nessuno | piccolo |
| 2 | **C2**: bottino a campioni clonati, un modello per fotogramma | scatto d'avvio −300 ms, −30-100 ms camminando | nessuno | piccolo |
| 3 | **C3**: le ombre compilate nel caricamento | 8-9 scatti da 0,1-0,5 s nel primo minuto | nessuno | piccolo |
| 4 | **C5** etichette risacca, **C11** timer, **C12** allocazioni | 3-6 ms | nessuno | piccolo |
| 5 | **C1 c+d**: memoria dei tentativi, «di corsa» solo se si riesce, capire perché il muro non si trova sui tasselli | il resto dei graffiti; i graffiti tornano sui muri | nessuno (anzi) | medio |
| 6 | **C4**: un registro unico dei cicli (e misura.js che li vede) | metà del costo dei cicli col tetto a 30 | nessuno | medio |
| 7 | **C7** pose a distanza, **C6** un visitatore solo | 4-8 ms | trascurabile | medio |
| 8 | **C8**, **C9**, **C13**: passi lunghi di blocchi, persone, tasselli | via gli scatti da 20-40 ms | nessuno | medio |
| 9 | **C1 f**: piazzamento dei graffiti cotto coi tasselli / nel lavoratore | il costo sparisce | nessuno | grande |
| 10 | **C10**: il processore del disegno di three | 3-8 ms | nessuno | medio-grande |

Con 1-4 il processore sull'Iris Xe torna al suo ciclo (32-48 ms, poi meno con 6-8): da lì il limite è la scheda video
(39-46 ms), che è l'altro fronte. Per il 30 fisso servono entrambi sotto i 33 ms; per il 60 sotto i 16.

**Per verificare sull'Iris Xe dopo ogni passo**: `?leggera&perf`, F3; la riga `altro[frame@…]:ciclo` (dopo C4: `writing:ciclo`)
deve sparire dalla classifica e l'«attesa» scendere al tempo della scheda video meno quello del gioco.
Qui: `node strumenti/sonda_cicli.js --fasi=fermo:30,cammina:45,fermo2:25` (con `--nodraw` per i tempi del solo processore).
