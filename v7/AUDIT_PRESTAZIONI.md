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
| `strumenti/sonda_disegni.js` | ([disegni]) Profilo telefono, fermo in due punti del borgo (1424,322 e 1372,388), le 11 di mattina. Per due fotogrammi: ogni disegno, del passaggio principale e delle ombre, con la mesh, il suo ramo, gli userData e il materiale. Chi fa ombra. Le prove di frustum per passaggio e per ramo, le chiamate di updateMatrixWorld per ramo e chi chiama scene.updateMatrixWorld. Su 120 fotogrammi, la mediana dei ms di `scene.updateMatrixWorld`, della proiezione (da `scene.onBeforeRender` a `renderList.finish`: prove di frustum e lista dei disegni) e di tutto `render()`. `--indice=` per il prima. |
| `strumenti/sonda_uguale_fusi.js` | ([fusi]) La stessa inquadratura disegnata due volte nella stessa pagina, a gioco fermo: con tutto acceso (A), poi con `peso_fusi.js` spento e le matrici di three come prima (B). Le mappe d'ombra si ricuociono finché l'immagine non smette di cambiare, poi il confronto è pixel per pixel. |

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
| 2 | Disegno: circa 1000 disegni e 2,4-2,7 M triangoli, 4000-5000 uniform per fotogramma | 42-62% del fotogramma | 5.000+ oggetti che fanno ombra, 78 materiali veri su 3.800 oggetti materiale | **ombre corrette** (sotto); passaggio principale invariato |
| 3 | **Graffiti piazzati in un colpo** (50-210 raggi per lavoro) | 46 ms/fotogramma nel giro a piedi (15%), la prima fonte di allocazioni (6 MB/fotogramma: `nearTris`, il raycast di three) | `writing.js` scanNear → placeWall/fitWall | **corretto** |
| 4 | `scene.updateMatrixWorld` su 11.000 oggetti | 37-44 ms/fotogramma (15-23%) | `render.js` FRZ: restano sciolti i rami che si muovono; e ogni `getWorldPosition` obbligava tutta la scena | **corretto** |
| 5 | Raccolte della memoria | 131-378 minori e 7 maggiori al minuto, 7-9 ms per fotogramma a piedi | graffiti (3), Frustum.intersectsObject, game.step, pushOutOfVehicles | in parte (3) |
| 6 | Animazione delle persone | 26-34 ms/fotogramma | `models.js` animPerson, `animazioni.js` apply | fuori perimetro (personaggi) |
| 7 | **Ombre: una mappa nuova da 949² a ogni cottura** in sottofondo, e la mappa di un lavoro lasciato a metà mai liberata | 32 / 25 / 42 mappe nuove per giro (110 / 86 / 145 MB allocati e buttati), 14-18 ms/fotogramma | `peso_ombre.js` luce, lavora | **corretto** |
| 8 | Frustum culling di tutti gli oggetti nel passaggio principale | 8-11 ms/fotogramma | `peso_lontano.js` (avvolge `Frustum.intersectsObject`) | **in parte** (settori) |
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

## Secondo giro: disegni, matrici, visibilità ([disegni], [matrici], [fusi])

### Da dove venivano i disegni

`sonda_disegni.js`, telefono, nel borgo, prima delle correzioni (quattro passate, i disegni per fotogramma):

| | 1424,322 | 1372,388 |
|---|---:|---:|
| disegni per fotogramma | 1.207-1.658 | 916-1.128 |
| nel passaggio principale | 657-712 | 570-712 |
| nelle ombre | 551-994 | 345-416 |

Più della metà dei disegni erano **ombre di cose che si muovono**. Grazie a `peso_ombre.js` le cose ferme sono già cotte: a ogni ripresa
si ridisegnano solo i mobili. Ma un mobile è fatto di molti pezzi. Il treno della miniera ha 526 pezzi che fanno ombra (458 disegni d'ombra
a fotogramma), un'auto 30-45 e una barca circa 100. Nel passaggio principale, invece, i 631 disegni di un fotogramma usano 346 materiali
diversi: le statiche sono già fuse per materiale e per settore (`fusione1`, `flushStatic`, `posa1`), e quello che resta è la varietà dei
materiali, non il numero degli oggetti.

### Le correzioni

**6. Le matrici si rifanno solo se cambiano** (`render.js`, `umwSelf`; `?nomatrici` torna a prima). La causa vera dei 37-44 ms era
un'altra. Ogni `getWorldPosition` (cioè `updateWorldMatrix`) ricompone i genitori fino alla scena e lascia alzato `matrixWorldNeedsUpdate`
sulla scena. Così, a ogni fotogramma, la scena obbligava tutti i ~38.000 oggetti a rifare la matrice nel mondo, anche i rami congelati da FRZ:
51.000 chiamate per fotogramma. Ora, per ogni oggetto, la matrice locale si ricompone solo se posizione, rotazione o scala sono cambiate
(con `matrixAutoUpdate` spento, se è cambiata la matrice locale). Quella nel mondo si rifà se è cambiata la locale, se l'ha rifatta il
genitore, se l'oggetto è appena stato attaccato (`add`, `attach`) o se qualcuno ha alzato il flag. In quest'ultimo caso i figli sono obbligati
solo se la matrice è venuta diversa. I numeri sono quelli di three, senza i conti che li rifanno uguali. In più, un ramo sciolto perché
qualcosa dentro si è mosso (una sbarra, una porta) si riprova a congelare sui figli, fino a tre livelli: restano sciolti solo quelli che si
muovono, mai dentro i mezzi e le persone.

**7. Le ombre fuse** (`peso_fusi.js`, `?noombrefuse`). Nei rami che non sono congelati si osserva per 90 fotogrammi, con tre confronti, chi
si muove o si accende rispetto al genitore. Così si trovano i gruppi rigidi: i pezzi che restano fermi rispetto a un genitore comune (il
vagone, la scocca), mentre le ruote che girano, i livelli dei LOD e i carrelli in curva fanno gruppo a sé. Per ogni gruppo che si muove nel
mondo, e per ogni lato dell'ombra, si fa una sagoma sola: gli stessi triangoli nelle coordinate del genitore (i pezzi specchiati col verso
delle facce girato). La sagoma fa ombra al posto dei pezzi (`castShadow` spento sui pezzi), è invisibile alla camera e segue il genitore
subito prima delle ombre, dopo che la proiezione ha scelto i livelli dei LOD. A ogni fotogramma si riguarda la catena di ogni pezzo fuso:
posizione, visibilità, geometria, materiale, ombra. Se qualcosa cambia, la sagoma si scioglie subito e si rifà più tardi senza quel nodo. Oltre
i 160 m dalla camera il controllo si fa ogni 30 fotogrammi. Le persone non si toccano. Nel borgo: 140 sagome al posto di 1.420 pezzi, e chi
fa ombra scende da 7.083 a 5.581 oggetti.

**8. I settori** (`peso_fusi.js`, `?nosettori`). I rami congelati (fermi da 10 s) stanno in celle di 32 m, ognuna con la sfera che contiene
tutti i suoi rami (ricalcolata a giro, 150 rami a fotogramma, con un margine di 2 m e la generazione: una cella vecchia non conta mai). A ogni
fotogramma si prova solo la sfera della cella. Nel solo passaggio principale, i rami delle celle fuori dalla camera escono dalla lista dei
figli della scena, così three non li visita nemmeno, e tornano prima delle ombre (`renderList.finish`). I rami grandi (il treno fermo, la
ferrovia) o con dentro qualcosa che non sta in una cella (istanze, LOD) si dividono nei figli, fino a due livelli sotto. I figli congelati di
un ramo sciolto vanno ognuno nella sua cella. I mezzi fuori dalla camera escono con la loro sfera, portata dove stanno, e il loro LOD si
aggiorna come l'avrebbe aggiornato three (serve per la loro ombra). Restano alla prova di sempre chi ha `frustumCulled` spento, le istanze,
gli scheletri e chi ha una prova sua (`instCull`, le persone).

Con i tasselli funziona allo stesso modo: i tasselli sono rami fermi con `matrixAutoUpdate` spento, quindi FRZ li congela, entrano nelle
celle e le loro matrici non si toccano. Il lavoro, però, si vede soprattutto su ciò che non è nei tasselli (mezzi, treno, barche, ferrovia,
cose di strada). La prova con una release dei tasselli vera non si è potuta fare: qui la cottura non entra in memoria.

### Prima → dopo

`sonda_disegni.js`, telefono, stessa macchina, una passata dopo l'altra (mediane su 120 fotogrammi, disegni a vuoto: ms di processore).
Prima: `484da2b` (il merge di partenza). Dopo: questa build.

| | 1424,322 prima | dopo | 1372,388 prima | dopo |
|---|---:|---:|---:|---:|
| disegni per fotogramma | 1.450 | 720-800 | 1.128 | 650-765 |
| di cui nelle ombre | 785 | 78-152 | 416 | 80-89 |
| di cui nel passaggio principale | 665 | 640-665 | 712 | 570-685 |
| `scene.updateMatrixWorld` | 21,5 ms | 5,0-5,8 ms | 22,4 ms | 7,0 ms |
| chiamate di updateMatrixWorld per fotogramma | 51.000 | 19.000 | 56.000 | 23.000 |
| proiezione (prove di frustum e lista) | 13,2 ms | 10,3 ms | 14,3 ms | 10,7 ms |
| prove di frustum principali / d'ombra per fotogramma | 8.969 / 2.464 | 4.908 / 330-1.940 | 8.681 / 1.905 | 4.915 / 265 |
| tutto `render()` | 52,6 ms | 29,5-32,4 ms | 52,7 ms | 32,8-34,8 ms |
| costo di `peso_fusi.js` (prima del disegno) | | 2,0-2,3 ms | | 2,2-2,4 ms |

Le ombre nella colonna di sinistra variano da una passata all'altra: a volte capita una cottura in sottofondo della mappa del sole, con le sue
prove. Il resto dello scarto di `render()` è il disegno delle ombre in meno.

**Stessa immagine.** `sonda_uguale_fusi.js`, 390×640, borgo e via Vittoria, alle 11 e alle 21 (sole e faretti), con 127-143 sagome fuse e i
settori attivi: 0 pixel diversi su 0 canali in tutte e quattro le inquadrature. In B il controllo usa le matrici di three come prima, quindi
anche una matrice che non si fosse rifatta in A si sarebbe vista.

### Cosa resta

- **Il passaggio principale non è sceso** (570-712 disegni): ognuno è un materiale diverso in un settore diverso. Per scendere sotto i 300
  disegni bisogna ridurre i materiali, non gli oggetti: tavolozza e pile di mappe anche per le statiche che ancora non le usano (`vievive`:
  27 disegni con 27 materiali; `velo`, `wr`, i `MeshBasicMaterial` sciolti: un materiale per oggetto), istanze per i pezzi ripetuti dei
  tetti (`noRoof`: 33 disegni con 7 materiali). Fondere di nuovo le statiche già fuse (`fusione1`: 105 disegni con 43 materiali in 7
  settori) costerebbe una seconda copia dei vertici, che sul telefono non c'è.
- I mezzi nel passaggio principale: circa 43 disegni l'uno (14 materiali, più i pezzi tenuti apposta separati: scocca per le ammaccature,
  ruote, fari). La stessa macchina delle ombre fuse potrebbe fonderli per materiale, ma bisogna prima controllare che nessuno shader dei
  mezzi legga le coordinate locali.
- `scene.updateMatrixWorld` è a 5-7 ms: sono soprattutto le ossa delle persone (`personaggi.js`, fuori perimetro) e i mezzi.

## Le prossime tre

1. **Meno materiali nel passaggio principale** (vedi «Cosa resta»): tavolozza e pile di mappe per le statiche che hanno ancora un
   materiale a oggetto, istanze per i pezzi dei tetti, i mezzi fusi per materiale. Le ombre sono già a posto.
2. **Cuocere e pubblicare i tasselli**: senza release `tasselli-<impronta>` il sito costruisce la città nel browser, con 7.600 figli diretti
   della scena, R.init lungo e il picco di memoria più alto. Va controllato che il workflow giri a ogni push.
3. **Le persone**: `animPerson` e `animazioni.js` (26-34 ms) e le loro ossa, che sono il grosso delle matrici che restano. Questo lavoro
   tocca `personaggi.js`.
