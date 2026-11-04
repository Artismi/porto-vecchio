# Porto Vecchio — L'immagine HD (ramo `hd`)

Il committente: «l'immagine è a bassa risoluzione, rumorosa, poco definita; le trame sembrano impastate; ogni tanto la qualità crolla».
L'audit (main 163679f) ha trovato le cause; qui cosa è cambiato, come si spegne, come si misura sul portatile vero.

**Interruttore generale: `?hd=0`** — il gioco di prima, identico (nessun shader, bersaglio o regolatore cambia).
Un passo alla volta: `?<nome>=0` (gli interruttori sono in `src/profilo.js`, `window.PV_HD`).

| Passo | Interruttore | Cosa fa |
| --- | --- | --- |
| 1 | `?foschia=0` | il colore dell'aria del passo unico (era rimasto in un commento: sempre grigio .8, il lontano lattiginoso di sera e di notte) |
| 2 | `?regola=0` | i regolatori a qualità stabile (tabella sotto) |
| 3 | `?upscale=0` | la tela alla risoluzione vera dello schermo e il passo che ingrandisce nitido |
| 4 | `?hdaa=0` | MSAA 2× nel profilo leggero al posto dell'FXAA; il filo dalla profondità col peso di copertura |
| 5 | `?pulito=0` | le trame pulite (tetti, pezzi, vissuto, vestiti, tessiture dei tasselli); `?tessiturepiene=0` solo le tessiture |
| 6 | `?risdin=0` | la risoluzione interna dinamica 640 → 1080 righe (dentro «regola») |
| 7 | `?hdombre=0` | l'ombra del sole più fine sopra le 900 righe; chi si muove aggiornato a ogni fotogramma |

## 1. I regolatori (governors): prima e dopo

Con «regola» (per difetto) nessun regolatore cambia più la risoluzione di colpo, spegne le ombre o ricompila i materiali.

| | Prima (main 163679f) | Ora (`hd`) | Dove |
| --- | --- | --- | --- |
| **G1** scala dinamica (PesoRitmo) | 1 · .9 · .8 (sul portatile leggero 910×512), un cambio al secondo; la scena scalata andava sulla tela a 640 righe e il browser la stendeva ancora: **due ricampionamenti** | **passi del 5% in righe** fra la soglia **640** e il massimo (1080, mai oltre lo schermo), **al più un cambio ogni 2 s**; giù dopo 1 s di pressione, su solo se il timer della scheda video stima il gradino sopra **sotto l'80%** del fotogramma per 2 s (senza timer: la prova, con l'attesa che raddoppia se fallisce). Il profilo leggero parte da 640 e sale. Un ricampionamento solo (il passo che ingrandisce) | `peso_ritmo.js` avvia/misura, `render.js` setRes/hdScala/resizeHD |
| tetto a 30 | in fondo alla scala | uguale, ma in fondo c'è la soglia di 640 righe, non 512 | `peso_ritmo.js` |
| **G2** grafica ridotta (`lowQuality`) | dopo 10 s oltre 45 ms: **tutte le ombre spente, tutti i materiali ricompilati, PX = max(1,5, dpr×1,25)** (312×675 sul telefono), per sempre | **tre gradini**, uno per ogni 3 s di fatica (solo con la scala in fondo e il tetto a 30): 1 le ombre dei lampioni non si ridisegnano di giorno e il sole a fotogrammi alterni; 2 la mappa del sole ×.75; 3 il sole ogni tre fotogrammi, niente miniatura né micro-normale. **Mai la risoluzione, mai ombre spente, nessuna ricompilazione.** Bottone «Qualità piena» in basso a destra | `render.js` lowQuality/hdGrado/qualitaPiena, `main.js` (la chiamata) |
| **G3** contesto perso | `localStorage.pvLow = 1`: **ogni sessione dopo** partiva in G2 | `sessionStorage`: vale **solo per questa sessione** (dopo il ricaricamento: soglia di 640 righe ferma + gradino 2, col bottone). Il vecchio `localStorage.pvLow` dei giocatori **si cancella** | `render.js` init |
| **G5** lastrico (fwidth) | metri per pixel della risoluzione interna: la grana e i giunti cambiavano con la scala | × `pvHk` = righe interne / righe di riferimento (640 leggero, 1080 pieno): **dettaglio fisso** qualunque sia la scala | `pavimenti.js` GLSL_HD |
| **G6** giunti e trame dei pezzi | `px` interno | `px × pzHk` (come sopra) | `pezzi_citta.js` vesteHD |
| **G7** cose piccole lontane | raggio sotto mezzo pixel interno | mezzo pixel **di riferimento** (KPO.H = H / k) | `render.js` KPO, `peso_lontano.js` invariato |
| **G8** persone lontane (impostori) | 28 px interni | 28 px di riferimento (lo stesso KPO.H) | `peso_gente.js` invariato |
| ombra del sole sul telefono | a fotogrammi alterni sempre (chi si muove scatta a 30) | a ogni fotogramma («hdombre»); alterni solo dal gradino 1 | `render.js` frame |
| mappa del sole leggera | fineTel .8 | **1,1 sopra le 900 righe** (isteresi a 860), ×.75 al gradino 2 | `peso_ombre.js` mappa(), `render.js` hdOmbre |
| **G11** tessiture dei tasselli | a ½-¼ con ogni `?leggera`, anche sul portatile | **piene sul portatile**; le «tel» restano col tocco, `deviceMemory ≤ 4` o `?bassa` (`?tessiturepiene=0` com'era) | `leggera_memoria.js` |
| ripiego dell'ingrandimento (nuovo) | — | se il passo costa **più di 4 ms per 2 s** (timer della scheda video) la tela torna alla risoluzione interna e la stende il browser, per la sessione (`?ripiego=0`: mai) | `render.js` upscalePasso |

Lo stato di tutti nel riquadro **F3**, una riga:
`hd · scala 0.59 · righe 640/1080 (1137×640) · tela 1920×1080 · ingrandisce 0.62 ms · tetto no · LOWQ no · tel sì · aa 2×` (esempio)
(scala; righe interne / massimo e la misura della scena; la tela vera; il costo dell'ingrandimento o «CSS (ripiego)»; il tetto
dei fotogrammi; la grafica ridotta: no / gradino N / vecchio; il profilo leggero; MSAA). Nella riga «scheda video» c'è anche `upscale`.

## 2. Cosa è cambiato nell'immagine

1. **La foschia** (`render.js`, passo unico, `U.fH`): il colore dell'aria stava dentro un commento a fine riga; ora segue la nebbia dell'ora.
2. **I regolatori**: la tabella sopra.
3. **La tela vera e l'ingrandimento** (`render.js` resizeHD, upsInit, upscalePasso). Niente più mezza tela stesa dal browser: la tela è
   quella dello schermo (dpr fino a 2), la scena e il passo unico restano alla risoluzione interna, poi **un passo solo** ingrandisce:
   Catmull-Rom in 5 letture bilineari, la pinza ai 4 texel vicini (niente aloni, niente anelli), +.6 di nitidezza sul valore rispetto al
   bilineare (dentro la pinza), il retino contro le bande al pixel vero. 10 letture per pixel della tela. Tela senza alfa (`alpha:false`,
   contesto WebGL2 creato da `render.js`). Se la scena è già alla misura della tela (1080 righe su 1080p) l'ingrandimento non c'è.
   **Sugli schermi oltre dpr 2** (i telefoni a dpr 3: la tela resta a dpr 2 e il browser la stende ancora ×1,5) l'ingrandimento **non c'è**:
   misurato, ingrandire due volte (640 → 780 qui, 780 → 1170 nel browser) ammorbidiva più del solo browser (vicolo: laplaciano 33,8 contro
   41,2; piazza 30,7 contro 38,2). Lì la tela resta alla risoluzione interna e il browser la stende **una volta**; F3 dice `CSS (dpr oltre 2)`.
4. **Antialiasing e linee**: nel profilo leggero **MSAA 2×** nel bersaglio della scena (WebGL2) e **niente FXAA** (l'FXAA a 4+2 letture a
   mezza risoluzione impastava e friggeva). Scelto MSAA: l'antialiasing va fatto **prima** dell'ingrandimento (un FXAA dopo lavora su scale
   già ammorbidite a 1,7 px). Il **filo dalla profondità** ha il **peso di copertura**: col MSAA il colore del pixel di bordo dice quanta parte
   è della cosa davanti; il filo pesa per quella parte e il pixel misto dalla parte del fondo prende la sua quota (due letture in più, solo
   sui bordi). Il tratto per categoria (Sobel sull'alfa) resta com'era: col MSAA l'alfa risolta è già un campo continuo.
   *Alpha-to-coverage sul fogliame: non fatto* — l'alfa della scena porta la categoria (pfdAlfa/catAlfa), la copertura la leggerebbe come opacità.
5. **Pulito** (`?pulito=0`):
   - tetti (`roofTex1`): la tela a **32 px/m** (lo stesso disegno, ogni texel 2×2: gli orli restano netti ingranditi alla zoom di gioco;
     sul telefono resta a 16 per la memoria), **niente puntini né colature** al texel (licheni a punti, colature, i 520-1400 puntini di
     eternit, guaina e cemento, il muschio a punti delle pianelle, le gocce di ruggine), **anisotropia 8**;
   - pezzi (`pezzi_citta.js`): la grana a 23/m e i pori svaniscono sotto i 2 pixel;
   - vissuto (`render.js`): via `n2` (le chiazze di un metro sui tetti), la dose del vissuto da .9 a .5;
   - vestiti (`pittura.js`): `LinearMipmapLinear` (col `NearestMipmapLinear` rimpiccioliti friggevano camminando);
   - tessiture piene dei tasselli sul portatile (G11).
6. **Risoluzione dinamica** 640 → 1080 a passi del 5% col timer della scheda video (G1).
7. **Ombre**: sopra le 900 righe la mappa del sole del profilo leggero passa da .8 a 1,1; sul telefono chi si muove a ogni fotogramma.

**Non fatto (aperto)**: i manti regolari (coppi, ardesia, pianelle, quadrotti) come **disegni analitici nello shader** con i giunti
antialiasati (fwidth) e le celle a 3-4 toni come fa `pavimenti.js`: qui c'è il passo intermedio (32 px/m senza puntini). Le **dissolvenze
a retino** (case che cambiano dettaglio, `anelli.js`/`render.js` an1D; l'anello dell'erba `vdMatF`) restano a retino: con l'alfa vera la casa
e la sagoma dovrebbero essere trasparenti insieme (ordinamento, profondità) — il retino ora è a 640+ righe ingrandito nitido, dura 0,7 s.
L'erba si potrebbe far crescere (scala per filo nel vertice) invece di sfumarla: da fare. Il tratto per categoria senza peso di copertura.

**I tasselli**: i materiali e le mappe della città a tasselli sono **cotti** (shader già trasformato, tele già dipinte). Con
`?tassellivecchi` si vedono i passi 1-4, 6, 7 e i pezzi non cotti; i passi 5 su tetti, lastrico e pezzi della città si vedono
**dopo la nuova cottura** (al merge) o con la città costruita dal vivo (senza `?tassellivecchi`, come nelle foto «vivo» qui sotto).

**La camera nuova (blocco A, `camera7`: pitch ~25°, braccio 8 m, vFOV 50°, l'orizzonte nella nebbia)**: più distanza sullo schermo e un
primo piano più vicino. Le scelte qui reggono anche lì: i dettagli e i tagli (G5-G8) non dipendono più dalla scala, quindi la scala può
scendere sotto pressione senza far sparire cose lontane; l'anisotropia 8 sui tetti e i vestiti filtrati servono proprio alle superfici di
taglio; la foschia del colore giusto è quella che si vede di più guardando lontano. Da ricontrollare dopo l'unione: la soglia di 900 righe
della mappa del sole (il riquadro del sole sarà più largo) e i 28 px degli impostori delle persone (a 25° se ne vedono di più).

## 3. Come si misura sul portatile (Iris Xe) e sul telefono

Gli indirizzi A/B (lo stesso posto, una scheda per indirizzo, la stessa finestra a schermo intero):

- A, com'era: `https://<host>/porto-vecchio/?hd=0`
- B, l'HD: `https://<host>/porto-vecchio/`
- un passo alla volta: `?upscale=0` · `?hdaa=0` · `?pulito=0` · `?risdin=0` · `?regola=0` · `?hdombre=0` · `?foschia=0` · `?tessiturepiene=0`
- la risoluzione ferma per confrontare i tempi: `&noritmo` spegne peso_ritmo.js (resta il regolatore vecchio di main.js, a gradini .72/.85/1); per una misura a righe fisse usare le prove `hd640`/`hd1080` di bancoGPU, o `__pv.R.setRes(0.593)` (640) / `__pv.R.setRes(1)` (1080) dalla console

Sul portatile:
1. Aprire B, entrare in strada, fermarsi in un vicolo e poi in una piazza. **F3**: la riga `hd ·` dice scala, righe, tela, quanto costa
   l'ingrandimento (`ingrandisce X ms`, deve stare sotto 1-1,5 ms; oltre 4 ms per 2 s la tela torna al CSS e la riga dice `CSS (ripiego)`),
   il tetto, la grafica ridotta. La riga `scheda video` dà `scena · post · upscale` in ms.
2. Lasciar girare 30 s fermi: la scala sale da 0.59 (640 righe) finché la scheda video ha margine (ogni 2 s un passo). Annotare dove si
   ferma e i fps. Poi camminare e correre per 1 minuto: la scala deve muoversi al più di un passo ogni 2 s, mai sotto 640 righe; il
   «Grafica alleggerita» (gradini) non deve comparire se i fps reggono.
3. **bancoGPU**: aprire `B&perf&noritmo`, fermarsi in piazza, F12, incollare `strumenti/banco_gpu_console.js`, scrivere `bancoGPU()` e non
   toccare per ~60 s. Nella tabella ora ci sono anche `hd640` e `hd1080` (lo stesso posto a 640 e a 1080 righe) e la colonna `gpuIngr`
   (l'ingrandimento). Rifare con `A&perf&noritmo` per il confronto (lì `hd640`/`hd1080` non ci sono).
4. Ripetere 1-3 di sera (`ora` alle 19-20): la foschia ora ha il colore dell'ora (A: grigia).

Sul telefono: aprire B, F3 non c'è; `?perf` mostra lo stesso riquadro. A dpr 3 la riga `hd ·` dice `righe 640/780 (640×1385) · tela 640×1385 · CSS (dpr oltre 2)`; a dpr 2 `tela 780×1688 · ingrandisce`.

## 4. Le misure (SwiftShader, Chromium senza scheda video)

Sonda: la camera di gioco vera (le scene di `strumenti/profondita_scene.json`, a passo d'uomo), `?cittanuova&leggera&tassellivecchi`,
la stessa build (`?hd=0` contro il default, più `&ripiego=0`: in SwiftShader ogni passo costa decine di ms e il ripiego scatterebbe),
foto della tela stesa allo schermo come fa il browser (bilineare), metriche come nell'audit (`hd/fogli.py`): **varianza del laplaciano**
(nitidezza, più alto più netto) e **tremolio** (la camera spostata di mezzo pixel della tela: differenza media e % di pixel oltre 24 livelli;
più basso più stabile). «nuovo_min» è l'avvio del profilo leggero (640 righe, la soglia), «nuovo_1» il massimo (1080 righe) dove la
scheda video ha margine. I millisecondi di SwiftShader non valgono: i costi sono stime di riempimento (sotto).

**Portatile 1920×1080 (1536×864 a dpr 1,25)**

| Scena | | tela → schermo | laplaciano | tremolio medio | tremolio > 24 |
| --- | --- | --- | ---: | ---: | ---: |
| lontano | prima (`?hd=0`) | 1137×640 → 1920×1080 | 205.1 | 9.79 | 13.58% |
| lontano | ora, 640 righe | 1920×1080 → 1920×1080 | 322.9 | 6.36 | 4.71% |
| lontano | ora, 1080 righe | 1920×1080 → 1920×1080 | 1242.0 | 5.85 | 4.62% |
| piazza | prima (`?hd=0`) | 1137×640 → 1920×1080 | 104.8 | 4.73 | 4.71% |
| piazza | ora, 640 righe | 1920×1080 → 1920×1080 | 169.2 | 3.96 | 2.82% |
| piazza | ora, 1080 righe | 1920×1080 → 1920×1080 | 672.9 | 3.16 | 2.36% |
| strada_lunga | prima (`?hd=0`) | 1137×640 → 1920×1080 | 66.3 | 3.14 | 2.31% |
| strada_lunga | ora, 640 righe | 1920×1080 → 1920×1080 | 105.1 | 3.46 | 2.33% |
| strada_lunga | ora, 1080 righe | 1920×1080 → 1920×1080 | 387.2 | 2.74 | 1.81% |
| vicolo | prima (`?hd=0`) | 1137×640 → 1920×1080 | 75.1 | 3.67 | 3.49% |
| vicolo | ora, 640 righe | 1920×1080 → 1920×1080 | 135.7 | 3.52 | 2.03% |
| vicolo | ora, 1080 righe | 1920×1080 → 1920×1080 | 513.9 | 2.46 | 1.68% |

**Telefono 390×844 a dpr 3 (la tela a dpr 2: 780×1688, poi il browser a 1170×2532)**

| Scena | | tela → schermo | laplaciano | tremolio medio | tremolio > 24 |
| --- | --- | --- | ---: | ---: | ---: |
| piazza | prima (`?hd=0`) | 640×1385 → 1170×2532 | 38.2 | 2.15 | 2.06% |
| piazza | ora, 640 righe | 640×1385 → 1170×2532 | 35.8 | 1.93 | 1.54% |
| piazza | ora, 1080 righe | 780×1688 → 1170×2532 | 52.0 | 1.69 | 1.34% |
| vicolo | prima (`?hd=0`) | 640×1385 → 1170×2532 | 41.2 | 2.65 | 2.36% |
| vicolo | ora, 640 righe | 640×1385 → 1170×2532 | 41.1 | 2.39 | 1.72% |
| vicolo | ora, 1080 righe | 780×1688 → 1170×2532 | 58.2 | 2.08 | 1.51% |

Sul telefono a 640 righe l'immagine è **netta come prima** (la tela resta interna e la stende il browser, una volta) con **meno
tremolio** (pixel oltre 24: vicolo 2,36 → 1,72%, piazza 2,06 → 1,54%: MSAA al posto dell'FXAA); a 780 righe (dove la scala sale se c'è
margine) **+41% di nitidezza**. Il primo tentativo (ingrandire a dpr 2 e poi il browser a dpr 3) era più morbido: 33,8 e 30,7 — da qui la
regola «niente ingrandimento oltre dpr 2».

**Pulito, con la città costruita dal vivo** (senza `?tassellivecchi`, i tetti e i pezzi dipinti da questa build; portatile, 1080 righe,
scena «lontano»): `?pulito=0` 1296 · `pulito` 1297 di laplaciano su tutto lo schermo, 1104 → 1114 sul riquadro dei tetti. **A questa
distanza la differenza quasi non si misura**: le trame tolte sono sotto il pixel. Il guadagno è da vicino e di taglio (la camera bassa
di `camera7`), dove i tetti a 32 px/m restano netti e i puntini non friggono; da verificare a occhio dopo la cottura (foto
`_immagini/hd/portatile_vivo_lontano_pulito0_vs_pulito.png`).

Passaggi e disegni (vicolo, portatile): prima `ombra 1053² 37-40 disegni · scena 1137×640 ~375 disegni` e la tela a 1137×640; ora gli
stessi disegni nella scena (375 a 640 righe e 375 a 1080: **i dettagli non cambiano con la scala**, G5-G8), **un disegno in più**
(l'ingrandimento, `canvas 1920×1080`), un programma in più (197 contro 196), le tessiture uguali (219-222). A 1080 righe la mappa del
sole passa da 1053² a 1438² (hdombre). Le foto in `_immagini/hd/` (1:1 in pixel dello schermo: vecchio · nuovo 640 · nuovo 1080).

**Letture di tessitura per pixel (il passo unico, profilo leggero)**: −6 (via l'FXAA, 4+2 letture), +2 solo sui pixel di bordo del filo
(il peso di copertura, ~3-6% dei pixel), +10 per pixel **della tela** (l'ingrandimento).

## 5. Il costo, stimato in riempimento (per fotogramma)

| Passo | Portatile (scena 1137×640 = 0,73 Mpx, tela 2,07 Mpx) | Telefono (scena 640×1385 = 0,89 Mpx, tela 780×1688 = 1,32 Mpx) |
| --- | --- | --- |
| 1 foschia | 0 | 0 |
| 2 regolatori | 0 alla stessa scala; i gradini tolgono ombre (½, ⅓ dei ridisegni del sole) invece di pixel | idem |
| 3 ingrandimento | +2,07 Mpx × 10 letture = **20,7 M letture** (molto coerenti in cache) + 8,3 MB scritti; il compositore ora copia la tela 1:1 e senza alfa invece di stenderla. Iris Xe (~48 unità di tessitura a ~1,3 GHz): **~0,5-1 ms** | +1,32 Mpx × 10 = 13,2 M letture, 5,3 MB: ~1-1,5 ms su un telefono medio |
| 4 MSAA 2× | scena: 2 campioni di copertura/profondità (lo shader gira una volta); bersaglio +5,8 MB; la risoluzione (blit colore+profondità) ~0,73 Mpx × 24 B = **17 MB/fotogramma** (~1 GB/s a 60 fps); −4,4 M letture dell'FXAA | ~21 MB/fotogramma; −5,3 M letture |
| 5 pulito | tetti 4× i texel (512² invece di 256², +1 MB l'uno, ~12 tele): banda uguale grazie alle mipmap; anisotropia 8 solo sulle falde di taglio; tessiture piene dei tasselli: **+memoria video (fino a 32-36 MB l'una) e un invio da 30-80 ms la prima volta che arrivano** | tetti invariati (16 px/m), tessiture «tel» invariate |
| 6 risoluzione dinamica | a 1080 righe la scena e il passo unico ×2,84 (2,07 Mpx) e l'ingrandimento non c'è; ci si arriva solo col margine misurato | fino a 780 righe: ×1,49 |
| 7 ombre | sopra 900 righe la mappa del sole ×1,89 texel (1053² → 1438², 4,4 → 8,3 MB) | il sole a ogni fotogramma: copia + chi si muove ×2 (peso_ombre) |
