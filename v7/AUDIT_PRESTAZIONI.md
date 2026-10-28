# Porto Vecchio v7: audit delle prestazioni ([audit])

Base: merge di `origin/claude/gallant-dijkstra-sa2548` (fino a 984c6c6). I tasselli non si sono potuti cuocere: la cottura è crollata tre volte
per memoria, su una macchina condivisa con altri agenti. Tutte le misure sono quindi sulla città costruita nel browser, che è anche quello
che il sito serve oggi finché manca la release `tasselli-<impronta>`.

## Come si misura

| strumento | cosa fa |
|---|---|
| `strumenti/banco_audit.js` | Profilo telefono (390×844, DPR 3, `?cittanuova&leggera`), seme fisso, passo 1/60 s, tre giri da 600 fotogrammi: a piedi, di corsa, in auto. Conta alla fonte WebGL disegni, istanze, triangoli, cambi di programma, uniform e byte caricati. Raccoglie il profilo CPU (Profiler), le allocazioni (HeapProfiler.startSampling), le raccolte della memoria (Tracing, `devtools.timeline` e `v8.gc`) e l'inventario della scena. `--indice=` serve la pagina di un'altra build, per fare prima e dopo sulla stessa macchina. |
| `strumenti/sonda_clic.js` | Cronometra ogni gestore pointerdown, pointerup e click sulla tela, con le sottofunzioni (pickAt, G.findPath, R.project, Bottino, Oggetti.lootables). 40 clic, a zoom 1 e 4,2, da tre partenze. |
| `strumenti/sonda_perdite.js` | Geometrie e texture caricate sulla scheda video dopo il caricamento: chi le ha fatte, se sono in scena, i byte contati alla fonte. Fa tre viaggi fra i capi dell'isola (hangar1, punta, chiesa) e misura a ogni ritorno alla partenza. |

SwiftShader: i disegni vanno a vuoto, quindi i ms sono tempo di processore per preparare il fotogramma. Contano i rapporti, non i valori
assoluti. La macchina era carica (carico medio 11-24 su 4 CPU).

## Le metriche a regime (telefono, prima)

| | a piedi | di corsa | in auto |
|---|---:|---:|---:|
| disegni per fotogramma (ombre e post compresi) | 860-1144 | 862-948 | 1179-1453 |
| triangoli per fotogramma | 2,46 M | 2,37-2,40 M | 2,70 M |
| cambi di programma / bindTexture / uniform per fotogramma | 255 / 308 / 4130 | 246 / 305 / 4050 | 298 / 358 / 5115 |
| programmi shader | 201 | 201 | 203 |
| texture sulla scheda (three, MB contati alla fonte) | 418, 120 MB | 445, 121 MB | 700, 153 MB |
| geometrie (three), buffer GL, MB | 2897, 14.733, 248 MB | 2908, 15.779, 261 MB | 4032, 21.226, 327 MB |
| oggetti in scena / nel campo / che fanno ombra | 10.885 / 2.809 / 5.138 | 11.278 / 3.030 / 5.442 | 10.911 / 2.669 / 5.063 |
| materiali (oggetti) / diversi davvero | 3.794 / 78 | 3.809 / 78 | 3.915 / 78 |
| raccolte minori / maggiori al minuto | 131-378 / 7,1 | 57 / 2,3 | 66 / 2,2 |
| GC in ms per fotogramma, allocato | 6,9-9,4 ms, 4,0-4,1 GB/min | 3,3 ms, 1,8 GB/min | 2,8 ms, 2,1 GB/min |
| heap JS (con gli array buffer) | 859-879 MB | 887-897 MB | 916 MB |

ms per sistema nel fotogramma (tempo incluso, profilo CPU, giro a piedi): disegno di three 124 (42%), piazzamento dei graffiti
(`writing.js` placeWall) 46 (15%), `scene.updateMatrixWorld` 44 (15%), animazione delle persone (`models.js` animPerson + `animazioni.js`)
34 (12%), ombre (`peso_ombre.js`) 17 (6%), frustum di `peso_lontano` 11 (4%), logica (`game.js` step) 9,5 (3%).

## Le cause, per peso misurato

| # | causa | peso misurato | dove | stato |
|---|---|---|---|---|
| 1 | **Memoria della scheda che cresce viaggiando** (la causa probabile di «dopo un po' si chiude») | QA: scheda 1,3 → 2,4 GB e geometrie 1188 → 2366 in 20 min, senza scendere al ritorno. Qui: geometrie 1478 → 3905 → 4045 in due viaggi | `render.js` rilascio: un pezzo di città visto una volta restava caricato per sempre | **corretto** |
| 2 | Disegno: circa 1000 disegni e 2,4-2,7 M triangoli, 4000-5000 uniform per fotogramma | 42-62% del fotogramma | 5.000+ oggetti che fanno ombra, 78 materiali veri su 3.800 oggetti materiale | da fare |
| 3 | **Graffiti piazzati in un colpo** (50-210 raggi per lavoro) | 46 ms/fotogramma nel giro a piedi (15%), la prima fonte di allocazioni (6 MB/fotogramma: `nearTris`, il raycast di three) | `writing.js` scanNear → placeWall/fitWall | **corretto** |
| 4 | `scene.updateMatrixWorld` su 11.000 oggetti | 37-44 ms/fotogramma (15-23%) | `render.js` FRZ: restano sciolti i rami che si muovono | da fare |
| 5 | Raccolte della memoria | 131-378 minori e 7 maggiori al minuto, 7-9 ms per fotogramma a piedi | graffiti (3), Frustum.intersectsObject, game.step, pushOutOfVehicles | in parte (3) |
| 6 | Animazione delle persone | 26-34 ms/fotogramma | `models.js` animPerson, `animazioni.js` apply | fuori perimetro (personaggi) |
| 7 | **Ombre: una mappa nuova da 949² a ogni cottura** in sottofondo, e la mappa di un lavoro lasciato a metà mai liberata | 32 / 25 / 42 mappe nuove per giro (110 / 86 / 145 MB allocati e buttati), 14-18 ms/fotogramma | `peso_ombre.js` luce, lavora | **corretto** |
| 8 | Frustum culling di tutti gli oggetti nel passaggio principale | 8-11 ms/fotogramma | `peso_lontano.js` (avvolge `Frustum.intersectsObject`) | da fare |
| 9 | **INP del clic**: scelta e percorso nel gestore | gestore 1-6 ms qui, ma `G.findPath` arriva a 118 ms da solo (lisciatura O(n²) di linee lunghe) | `main.js` onClick, `game.js` findPath/clearLine | **corretto** |
| 10 | **Il menu apre un secondo contesto WebGL che sul computer non si chiude mai**, e legge in modo sincrono i registri degli shader | QA: getProgramInfoLog al 7,3% del profilo | `menu_ui.js` draw3, makeThumb | **corretto** |

## Le correzioni (prima → dopo, stessa macchina)

**1. Le geometrie lontane lasciano la scheda video** (`render.js`, rilascio; `?nolontane` torna a prima). Il giro della scena a fette, che
già c'era, misura per ogni geometria la distanza della mesh più vicina che la usa. Se per due giri di fila sta oltre la nebbia vista dalla
camera (almeno 200 m sul computer, 150 sul telefono) ed è caricata con gli array interi, si chiama `dispose()`. Se torna in vista, three la
ricarica dagli array. L'immagine non cambia.
`sonda_perdite.js`, computer, viaggi hangar1 ⇄ punta ⇄ chiesa e ritorno alla partenza (buffer e texture contati alla fonte WebGL):

| alla partenza, dopo il viaggio | 1 | 2 | 3 |
|---|---:|---:|---:|
| geometrie (three), prima | 4050 | 4358 | 4552 |
| geometrie (three), dopo | 3877 | 4030 | 4010 |
| buffer sulla scheda, prima | 448 MB | 482 MB | 509 MB |
| buffer sulla scheda, dopo | 464 MB | 492 MB | 491 MB |
| geometrie lontane liberate (dopo) | 923 | 1931 | 2983 |

Prima, ogni viaggio aggiungeva 200-300 geometrie e 27-30 MB di buffer che non tornavano indietro. Dopo, dal secondo viaggio la memoria resta
ferma. Il grosso della salita però avviene alla prima visita della città intera e resta: i buffer passano da 133-157 MB alla partenza a
circa 460, le texture da 467-484 a 735-747 MB. Di queste texture, 182 MB sono 233 pile di mappe delle case (`arrTex1`), condivise da tutta
la città e quindi non liberabili per zona. Il numero di texture continua a salire di 40-60 a viaggio, ma i byte no (745 → 747 MB): sono le
texture delle ossa e le tele delle figure delle persone (`personaggi.js`, fuori dal mio perimetro). Il vero rimedio sono i tasselli, che
scaricano davvero per settore (vedi le prossime).

**2. Graffiti a dosi** (`writing.js`, fitWallG e placeWallG). Il piazzamento di un lavoro è un generatore che si ferma ogni sei raggi.
scanNear lo porta avanti nel tempo che ha (1 ms, 5 di corsa) e lo riprende al fotogramma dopo. Sono gli stessi raggi nello stesso ordine,
quindi lo stesso risultato (`test_graffiti.js` passa). Sul telefono, il lavoro per fotogramma (logica + grafica):

| | p95 | p99 | max | fotogrammi oltre 2× / 3× la mediana |
|---|---:|---:|---:|---:|
| a piedi | 412 → 260 ms | 624 → 414 | 909 → 646 | 56 → 25 / 18 → 6 |
| di corsa | 352 → 180 | 494 → 244 | 905 → 380 | 69 → 9 / 35 → 2 |
| in auto | 256 → 229 | 409 → 348 | 800 → 513 | 20 → 17 / 6 → 4 |

placeWall passa da 46 ms/fotogramma concentrati nel giro a piedi a circa 7 ms distribuiti su tutti i giri. Il GC a piedi scende da 9,4 a
4,6 ms per fotogramma.

**3. Ombre senza mappe nuove** (`peso_ombre.js`). La mappa vecchia resta da parte e la cottura dopo la riusa. Il lavoro lasciato a metà
(zoom, salto, faretto spostato) rimette la sua mappa da parte: prima restava allocata senza che nessuno la usasse. Le mappe 949² nuove per
giro passano da 32 / 25 / 42 a 0 / 0 / 0. L'immagine è identica (la prima passata pulisce la mappa).

**4. INP del clic** (`main.js`, `?noclicdopo` torna a prima). Il gestore registra solo dove e se è un doppio clic. La scelta e il percorso
si fanno all'inizio del fotogramma dopo (input → clickRun). Il rilascio della bomboletta (G.emit su tutti i passanti) passa anch'esso al
fotogramma dopo. `clearLine` fa prima un passaggio largo, con le stesse prove in un altro ordine: i percorsi sono identici, la firma di 400
percorsi non cambia. Gestori della tela sul telefono, 40 clic: mediana 1,0 → 0 ms, p90 3,1 → 0, max 5,8 → 0,8, 40 su 40 sotto 16 ms.
`G.findPath` su 200 coppie in node: totale 448 → 211 ms. I 789 ms del committente non si riproducono qui: il percorso più lungo misurato in
pagina è di 118 ms, ma ora non sta più nel gestore in nessun caso.

**5. Il menu** (`menu_ui.js`). I due contesti WebGL del menu (figure e anteprime) si chiudono anche sul computer, 15 s dopo la chiusura del
menu o l'ultima anteprima. `checkShaderErrors` è spento come nel renderer del gioco.

## Le prossime tre

1. **Meno disegni e meno uniform**: 5.000 oggetti fanno ombra e 3.800 materiali sono 78 materiali veri. Bisogna fondere le cose ferme per
   materiale e per settore anche nella città costruita nel browser (come i tasselli), e mettere in istanze le cose piccole ripetute. È il
   42-62% del fotogramma.
2. **Cuocere e pubblicare i tasselli**: senza release `tasselli-<impronta>` il sito costruisce la città nel browser, con 7.600 figli diretti
   della scena, R.init lungo e il picco di memoria più alto. Va controllato che il workflow giri a ogni push.
3. **`scene.updateMatrixWorld` (15-23%) e il frustum di tutti gli oggetti (8-11 ms)**: congelare per settore e non per ramo (FRZ), e fare
   il culling a griglia per settore invece che oggetto per oggetto.
