# Porto Vecchio — il peso della città nuova ([peso])

Obiettivo (dal committente): «deve girare fluido ma con la pazzesca qualità che stiamo ottenendo». 60 fps sui telefoni recenti, 30 stabili
sui medi; meno di 1000 disegni nel borgo, meno di 1500 nella vista peggiore; niente scatti di compilazione. **L'immagine non deve
peggiorare**: ogni passo è misurato sulle stesse inquadrature e confrontato pixel per pixel.

## 1. Il banco del peso (`strumenti/banco_peso.js`)

```
node strumenti/banco_peso.js <cartella> [--query=&nopeso] [--rif=<cartella di un giro precedente>] [--solo=borgo,notte] [--nf=8] [--nothrottle]
python3 strumenti/banco_diff.py <cartella A> <cartella B> [<cartella delle differenze>]
python3 strumenti/fogli_peso.py <cartella prima> <cartella dopo> _immagini/peso <nome>
```

Chromium senza testa con SwiftShader (`/opt/pw-browsers/chromium`), seme 12345 (lo stesso generatore di `src/seme.js`), il giorno dopo
quello di partenza, tempo sereno, 480×300. Dieci inquadrature fisse (le otto del piano, più la piazza d'adunata col sole basso e il
pavimento da vicino; le misure finali sono sulla pianta nuova: anello sul mare, Lungomare di Tramontana, segnaletica, pavimenti):

| scatto | dove | zoom | ora |
|---|---|---|---|
| borgo | 1424, 322 (la Rua, il Pozzo, i vicoli) | 0,75 | 11:00 |
| marina | 1372, 388 (la calata, i magazzini) | 0,95 | 10:00 |
| vittoria | 1410, 343 (l'asse, i portici) | 0,95 | 12:00 |
| recinto | 1520, 352 (il Recinto del Garante, il porto) | 1,2 | 15:00 |
| rocca | 1560, 344 | 1,7 | 16:20 |
| citta | 1420, 340 (la città dall'alto: la vista peggiore) | 4 | 14:00 |
| notte | come il borgo | 0,75 | 22:00 |
| folla | 1278, 340 (il Mercato, posti riempiti come in galleria.js) | 0,85 | 10:00 |
| adunata | 1328, 343 (la piazza d'adunata: i dentini delle ombre lunghe) | 0,75 | 17:30 |
| suolo | 1424, 322 (la piazza del borgo da vicino: quasi solo pavimento) | 0,5 | 11:00 |

Per ogni inquadratura:

1. **I disegni di un fotogramma vero** (mediana di 8): *principale* (la scena, `GPUT.info`), *ombre* (tutte le passate d'ombra: three azzera
   `renderer.info` dopo l'ombra, quindi il contatore del gioco non le vedeva — l'ombra del sole da sola erano ~1.100 disegni), *post*.
   *Ombre a regime*: la media sui fotogrammi senza cotture (vedi §3.1). Il banco porta prima le persone a regime (`PesoGente.completa`:
   quello che il gioco fonde in qualche secondo).
2. **Il tempo del processore**: mediana di `R.frame` (la grafica lato processore: preparare i disegni) con i disegni a vuoto (vedi sotto),
   e lo stesso con il processore rallentato 4× (CDP `Emulation.setCPUThrottlingRate`). La logica (`G.step`) a parte.
3. **Il costo per categoria**, nello stesso fotogramma fermo: la scena si ridisegna intera e poi con una categoria spenta (persone, case
   fuse, pezzi delle case fuori fusione, statiche, posa, scorci, tetti vissuti, vetri, terreno, mezzi, aloni…); la differenza è il costo.
   Il «resto» è diviso per chi ha messo le cose in scena (le funzioni di `render.js` che hanno chiamato `scene.add`).
4. **Le foto**: il fotogramma vero col post, a scena ferma (`dt = 0`), e la «statica» senza chi si muove (persone, mezzi, particelle).
5. **A/B nella stessa pagina**: ogni alleggerimento che si spegne dal vivo (`window.__pesoAB`) si spegne, si rifà la foto, si riaccende; e
   per misurare il rumore si rifà la foto due volte uguale («stabile»: aloni che tremolano, acqua). Fra due caricamenti la città non è
   identica (il seme decide il caso, ma l'ordine dei lavori a budget no): **la soglia di rumore fra due caricamenti dello stesso codice è
   1,6-2,2 di scarto medio e ~4% di pixel oltre 8** (borgo); per questo gli A/B si fanno nella stessa pagina dove si può.

Avvertenze. Sotto SwiftShader un fotogramma vero dura 15 s: il banco **spegne i disegni** (`drawElements` & co. a vuoto) fuori dalle
foto, così il gioco gira alla velocità del processore e i tempi misurano il lavoro di chi prepara i disegni (uniformi, stati, liste), non la
rasterizzazione finta. I tempi valgono per i rapporti, non in assoluto. Il banco ferma la grafica adattiva del gioco (`main.js` scendeva di
risoluzione e poi spegneva le ombre perché i fotogrammi erano lenti: il primo giro misurava le ultime tre inquadrature senza ombre). Le cose
del gioco che vanno a tempo (le riprese delle ombre dei faretti ogni mezzo secondo) con fotogrammi lenti capitano a ogni fotogramma: le
«mappe d'ombra» per fotogramma qui sono più alte che a 60 fps.

{{TABELLE}}

## 3. I passi e cosa hanno comprato

### 3.1 Ombre in cache (`src/peso_ombre.js`, `?nopesoombre`)

Il primo peso non erano i faretti ma **l'ombra del sole**: ~1.100 disegni a ogni fotogramma (tutto quello che fa ombra nel riquadro di
92-128 m), più ~1.000-1.300 per ogni faretto ridisegnato. Quasi tutto quello che fa ombra sta fermo. Ogni luce con l'ombra ha ora la mappa
delle cose ferme, cotta una volta e copiata da parte (`blitFramebuffer`, colore e profondità): a ogni fotogramma la mappa riparte dalla copia
e ci si disegnano sopra solo le cose che si muovono (gli scheletri sempre; il resto se ha cambiato matrice negli ultimi 90 fotogrammi: porte,
panni, barche, mezzi; una persona intera se ha uno scheletro). **Le stesse cose, la stessa profondità: la stessa mappa.**

- Il sole: il riquadro seguiva la camera a ogni fotogramma. Ora il centro si aggancia alla **griglia dei texel** (l'ombra non «nuota» più
  camminando) e resta fermo finché la camera resta entro 8 m; il riquadro è più largo di 8 m per lato e la mappa più grande nella stessa
  proporzione. La direzione del sole va a scatti di 0,15°.
- **I dentini della piazza d'adunata** (strisce a sega sui bordi delle ombre lunghe, uguali con `?nopavimenti`): col sole basso (18-36°)
  un texel della mappa a terra si allunga di 1/sin(altezza) lungo la direzione del sole, 1,7-3,2 volte. Due rimedi, a costo di disegni
  zero: il texel di base 1,4 volte più fine (1,25 sul telefono; la mappa del computer ~3.470, sotto il lato massimo della scheda) con lo
  scarto in proporzione (le stesse manopole `PROF.ombraBias` di `profSole`), e **il riquadro stretto** (`?nopesostretta`, A/B `stretta`):
  lungo l'asse del sole il quadrato del gioco copriva a terra molto più della visuale; ora si stringe a quello che la camera di gioco vede
  fra terra e 70 m (più il margine del cammino), a metri interi (il reticolo non cambia camminando), con gli stessi texel: alla piazza
  d'adunata di mattina 57 m invece di 92, texel 1,6 volte più fini proprio lungo l'allungamento. Le ombre di chi sta fuori dalla visuale
  sulla visuale restano (chi fa ombra su un punto sta sulla stessa retta del sole: stessa x, y nella mappa).
- La cottura nuova si fa **in sottofondo, a lotti** (250 cose per fotogramma) su una mappa di riserva: dalla metà del margine la mappa del
  prossimo aggancio è già pronta quando serve; le cose ferme cambiate (un blocco che arriva, le scale dei tetti ricostruite) si ricuociono
  così, con la mappa vecchia in uso nel frattempo. Solo un salto oltre il margine (teletrasporto) cuoce subito.
- I faretti dei lampioni: **restano, con la loro ombra** (le persone sotto i lampioni fanno ombra: toglierla avrebbe peggiorato la notte).
  La pozza di luce a terra era già cotta ([inverno30]); la ripresa che il gioco chiedeva (qualcuno si muove sotto la luce, ogni mezzo
  secondo) ora è copia + chi si muove, e il faretto passato a un altro lampione resta senza ombra per i pochi fotogrammi della cottura.
- Scoperto strada facendo: in three r149 l'ombra prova i livelli della **camera di gioco**, non della camera dell'ombra; le sagome d'ombra
  delle case fuse (livello 1) non sono mai state disegnate. Non l'ho cambiato (cambierebbe l'immagine): è segnato in §5.

### 3.2 Vetri (`src/peso_vetro.js`, `?nopesovetro`; `?nopesotinte`)

Il vetro scuro e i pannelli accesi dietro le finestre (dieci toni più quello delle botteghe) erano un secchio per tono e per settore. Ora
un secchio solo: colore, luce propria, ruvidità e metallo in una tavolozza (due texel per voce, letti al texel esatto), la curva della notte
resta quella. Esteso poi a **tutte le tinte opache senza mappa delle case** (`?nopesotinte` per tornare ai soli vetri). Il vetro non è
diventato «finto riflesso»: era già opaco, e un riflesso nuovo avrebbe cambiato l'immagine. Le vetrine trasparenti: §3.4.

### 3.3 Persone (`src/peso_gente.js`, `?nopesogente`, `?nopesolontane`)

Il piano chiedeva tre livelli (vicine come sono, medie con la posa cotta in una tessitura e un'istanza per tipo di corpo, lontane come
impostori). Dalle misure una persona è 20-35 disegni perché ogni pezzo è un materiale: i tagli ad animazioni cotte e un corpo per tipo
avrebbero perso cappelli, borse, stoffe dipinte (peggio) e non avrebbero retto il cambio dei personaggi in corso (`personaggi.js`). Ho fatto:

- **la persona fusa, senza perdite**: quando ha finito di vestirsi, i suoi pezzi diventano poche SkinnedMesh sullo stesso scheletro, una per
  materiale «a meno del colore» (colore, luce propria, ruvidità, metallo nei vertici); gli accessori rigidi agganciati a un osso entrano come
  pelle con un osso solo. **Generica**: lavora su quello che il costruttore della figura produce (oggi `models.js`, domani `personaggi.js`).
  Ogni pezzo fuso e i suoi antenati tengono d'occhio la loro visibilità: se il gioco accende o spegne qualcosa (il casco della rivolta, un
  oggetto in mano) la persona torna com'era e si rifonde dopo. A budget (2 ms per fotogramma, un gruppo alla volta) e coi programmi preparati
  prima dello scambio (KHR_parallel_shader_compile): niente scatti;
- **la persona lontana**: sotto i 28 pixel d'altezza (alla risoluzione interna) tutti i pezzi in una o due mesh piatte, col colore di ogni
  pezzo moltiplicato per la media della sua mappa (a quella misura la scheda video legge comunque l'ultimo livello delle mipmap);
- nel menu, una persona per modello (e una guardia) si veste, si fonde e si prepara fuori scena: i programmi sono pronti al primo incontro.

### 3.4 Le case: trasparenti, botteghe, intonaco (`render.js` fusione1; `?nopesotrasp`, `?nopesobotteghe`, `?nopesointonaco`)

- Le decalcomanie (macchie, colature, manifesti, con l'ordine di disegno), i vetri delle vetrine e i materiali trasparenti per sempre
  entrano nei secchi per settore, **restando trasparenti** (la casa che si dissolve li ritrova come le altre parti);
- i fronti delle botteghe (portali, citofoni, insegne, serrande, tende: 480 pezzi nel borgo) erano gruppi a parte: ora ritrovano la loro
  casa e vanno nei suoi secchi (restano pieni quando la casa sbiadisce, come prima);
- l'intonaco entra nelle pile delle mappe ([leggero] l'aveva lasciato fuori per 1-3 livelli su un pixel ogni venti: non si vede).

### 3.5 Aloni e pozze di luce (`src/peso_bagliori.js`, `?nopesobagliori`)

Gli aloni (sprite additivi: ~1.000 in scena) e le pozze di luce a terra (piani additivi) si sommano senza ordine: un disegno per tessitura,
posizione-misura-colore-opacità letti a ogni fotogramma dagli originali (che il gioco continua ad accendere e far tremolare).

### 3.6 Le cose piccole lontane (`src/peso_lontano.js`, `?nopesolontano`)

Nel solo passaggio principale, un oggetto piccolo (raggio < 2,5 m) che sullo schermo è più piccolo di un pixel non si disegna. Le ombre e
le domande della logica non cambiano. La segnaletica nuova ci cade da sola.

### 3.7 L'atlante delle parti (`render.js`, `?nopesoatlante`) — correzione

L'atlante delle parti (FA, celle da 32 px) aveva 256 celle per 1.005+ richieste: dalla 256 in poi tutte finivano nella cella 255,
ridipinta a ogni richiesta (gli oggetti prendevano il colore dell'ultimo). Ora 1024 × 2048 (2.048 celle; 2048 è il lato che ogni scheda
WebGL2 regge), e l'atlante piccolo (CA) 256 × 1024. Le celle hanno gli stessi texel di prima. **Questo cambia l'immagine apposta**: gli
oggetti oltre la cella 255 hanno finalmente il loro colore.

### 3.8 Lo schermo e il telefono (`src/peso_schermo.js`, `?nopesoschermo`, `?livello=bassa|media|alta`)

- Il livello della scheda deciso da solo all'avvio (`WEBGL_debug_renderer_info`): bassa (Mali vecchi, Adreno ≤ 61x, PowerVR, software),
  media, alta. Nessun menu.
- Sul telefono la risoluzione interna segue il tempo del fotogramma (gradini 1 / 0,9 / 0,8, 0,72 sulla bassa; giù dopo 1,5 s sopra il
  118% del ritmo, su dopo 6 s sotto il 90%; tiene conto del ritmo a 30 di `main.js`). L'interfaccia è nel DOM e la tela finale resta a
  piena risoluzione: restano nitide. Il tetto del DPR c'era già: la risoluzione interna non dipende dal DPR (`render.js` resize: 640
  righe sul lato corto del telefono) e la tela finale è al più 2×.
- Il pavimento (`pavimenti.js`, fino a 8 letture di mappa per pixel): `Pavimenti.qualita('leggera')` sul telefono e sulla scheda bassa,
  `'alta'` altrove (`?nopesosuolo` lo lascia com'è). Il costo per pixel del suolo si vede nell'inquadratura *suolo*, su una scheda vera.

## 4. Gli interruttori

`?nopeso` spegne tutto insieme (il «prima» del banco). Uno per uno: `?nopesoombre`, `?nopesovetro`, `?nopesotinte`, `?nopesogente`,
`?nopesolontane`, `?nopesolontano`, `?nopesobagliori`, `?nopesotrasp`, `?nopesobotteghe`, `?nopesointonaco`, `?nopesoatlante`,
`?nopesoschermo`, `?nopesostretta`, `?nopesosuolo`. Dal vivo, per il banco: `window.__pesoAB.{ombre, stretta, gente, lontano, bagliori,
trasp}(true|false)`.

{{LIMITI}}

## 6. La memoria ([leggera])

Il telefono chiudeva la pagina della città nuova (il ripiego in `index.src.html` gli dava l'isola di prima). Ora la città nuova va anche
sul telefono: i tagli sono in `src/leggera_memoria.js` (piccoli ganci in `render.js`, `vegetazione.js`, `personaggi.js`, `oggetti3d.js`,
`scorci_arte.js`, `segnaletica.js`, `peso_ombre.js`, `peso_pronti.js`), `window.PV_NUOVA` è vero dappertutto e `?vecchia` riapre l'isola
di prima.

### 6.1 Il banco della memoria (`strumenti/banco_memoria.js`)

```
node strumenti/banco_memoria.js [--profilo=telefono|computer] [--vecchia] [--query=&nomemoria] [--giro=borgo,marina,citta]
     [--out=file.json] [--foto=cartella] [--campiona] [--nudo] [--js=file.js [--solojs]] [--top=40]
python3 strumenti/fogli_memoria.py prima.json dopo.json [tappa]      (le tabelle qui sotto; tappa 0 = dopo il caricamento, -1 = l'ultima)
```

Telefono: 390×844, DPR 3, tocco, `?cittanuova&leggera`; computer: 1280×720, `?cittanuova`. Chromium senza testa con SwiftShader, i disegni
a vuoto (come nel banco del peso). Si misura dopo il caricamento e a ogni tappa del giro (borgo, marina, la città dall'alto a zoom 2,5),
dopo una raccolta della memoria:

- **il cuore JS**: `performance.memory.usedJSHeapSize`, che in Chrome comprende gli **array buffer** (le copie delle geometrie e dei dati
  nel processore: `Runtime.getHeapUsage().backingStorageSize`); la differenza sono gli **oggetti JS**;
- **la scheda video, contata alla fonte**: ogni chiamata WebGL che riserva memoria (texImage2D/3D, texStorage, compressedTexImage,
  generateMipmap, bufferData, renderbufferStorage[Multisample]) per oggetto GL, tolta a deleteXxx o quando il navigatore raccoglie
  l'oggetto; più la tela (colore + profondità). Il proprietario: per le texture di three chi le ha create (la pila al `needsUpdate`), per i
  buffer la geometria (la pila al `setAttribute`), per bersagli e mappe d'ombra chi li ha allocati; righe di `index.html` → modulo e
  funzione (gli aiutanti come `canvasTex` e `mergeGeos` portano anche chi li chiama), poi le categorie (`CAT` nel banco);
- **le tele 2D** delle texture (la memoria di Skia: né heap né scheda video, ma il telefono la paga);
- le geometrie vive per chi le ha fatte, le copie nel processore «caricate» (anche sulla scheda) e «mai caricate» (mai disegnate);
- RSS e PSS dei processi (pagina e scheda video) e il loro picco, anche durante il caricamento (qui SwiftShader tiene la scheda video nel
  processore: è un controllo, non la misura).

`--campiona`: chi tiene gli oggetti JS (il campionatore di Chrome, per modulo:funzione@riga). `--foto`: la foto di ogni tappa (fuori dal
repo). `--js=file`: un'analisi in più nella pagina (le sonde usate: le pile, i pezzi rifatti e chi li chiede, le misure dei pezzi).

**Le unità.** Il «~520 MB contro ~330» del ripiego si accorda con gli *oggetti JS* (qui 451 contro 269 dopo il caricamento: lo stesso
rapporto 1,6). Contando tutto (heap con gli array buffer + scheda video + tele 2D) la città nuova sul telefono pesava **2,8 GB** dopo il
caricamento e **3,4 GB** dopo il giro; l'isola di prima, che sul telefono si apre, **1,6 GB** e **2,1 GB**.

**Il risultato.** Sul telefono la città nuova ora pesa **1,37 GB** dopo il caricamento e **1,69 GB** dopo il giro (−51% e −51%): meno
dell'isola di prima com'era (1,58 e 2,09 GB), con lo stesso picco dei processi (~3,2 GB qui, con la scheda video simulata nel processore).
Gli oggetti JS scendono da 451-515 a 320-366 MB: restano sopra l'isola di prima (269-319) e sopra i 300 MB del traguardo; il traguardo dei
300 MB «heap + scheda video» contando tutto non è raggiungibile senza togliere la città (l'isola di prima ne pesa 1.300): vedi §6.4.

### 6.2 Le misure (24 ottobre; «prima» = la base 9a6f453, l'anteprima unita a main, col banco di adesso; giro borgo → marina → città)

Il picco dei processi (RSS di pagina + scheda video, anche durante il caricamento; con SwiftShader la scheda video sta nel processore):

| | prima | dopo |
|---|---:|---:|
| telefono, città nuova: totale con le tele, il massimo del giro | 3412 MB | 1687 MB |
| telefono, città nuova: oggetti JS, il massimo | 515 MB | 366 MB |
| telefono, città nuova: picco dei processi | 4644 MB | 3162 MB |
| computer, città nuova: totale con le tele, il massimo del giro | 3846 MB | 3443 MB |
| computer, città nuova: oggetti JS, il massimo | 533 MB | 382 MB |
| computer, città nuova: picco dei processi | 5326 MB | 4745 MB |
| telefono, isola di prima (?vecchia): totale con le tele, il massimo del giro | 2086 MB | 1117 MB |
| telefono, isola di prima (?vecchia): oggetti JS, il massimo | 319 MB | 246 MB |
| telefono, isola di prima (?vecchia): picco dei processi | 3189 MB | 2186 MB |

**Telefono, città nuova, dopo il caricamento**

| dopo il caricamento | prima | dopo | |
|---|---:|---:|---:|
| heap JS (con gli array buffer) | 1578 | 865 | -45% |
| di cui oggetti JS | 451 | 320 | -29% |
| array buffer | 1127 | 545 | -52% |
| scheda video | 860 | 387 | -55% |
| tele 2D | 369 | 115 | -69% |
| totale heap + scheda | 2438 | 1252 | -49% |
| totale con le tele | 2807 | 1367 | -51% |

| scheda video per proprietario (MB) | prima | dopo |
|---|---:|---:|
| atlanti, tavolozze e pile (render) | 271.6 | 54.0 |
| case fuse (render) | 151.5 | 84.2 |
| vegetazione | 115.2 | 11.9 |
| statiche fuse e cose di strada (render) | 39.5 | 43.4 |
| persone | 39.1 | 10.1 |
| acqua (render) | 31.7 | 31.7 |
| segnaletica, arredo vie | 31.0 | 15.5 |
| mappe d'ombra | 27.4 | 11.2 |
| scorci, tetti | 26.6 | 9.9 |
| terreno a blocchi (render) | 21.5 | 16.0 |
| case: pezzi fuori fusione (render) | 21.3 | 21.7 |
| bersagli del post | 15.1 | 15.1 |
| città, il resto (render.js) | 12.3 | 7.8 |
| graffiti | 11.1 | 9.6 |
| tela (schermo) | 10.0 | 10.0 |
| menu, audio | 10.0 | 10.0 |
| modelli glTF/GLB (kit) | 8.4 | 8.4 |
| altro | 5.5 | 3.8 |
| pavimenti | 5.3 | 6.3 |
| insegne (render) | 3.4 | 4.4 |
| modelli (roba3d, arredo3d, pezzi) | 1.2 | 0.7 |
| peso_* (tavolozze, aloni) | 0.5 | 0.5 |

| copie nel processore per proprietario (MB) | prima | dopo |
|---|---:|---:|
| geometrie case fuse (render) | 477.5 | 145.9 |
| tele atlanti, tavolozze e pile (render) | 162.0 | 2.4 |
| geometrie statiche fuse e cose di strada (render) | 128.0 | 63.0 |
| geometrie vegetazione | 100.7 | 4.4 |
| dati atlanti, tavolozze e pile (render) | 80.2 | 17.5 |
| tele insegne (render) | 51.3 | 19.1 |
| geometrie case: pezzi fuori fusione (render) | 35.8 | 35.9 |
| tele acqua (render) | 31.7 | 31.7 |
| tele persone | 26.6 | 7.1 |
| tele segnaletica, arredo vie | 20.8 | 8.8 |
| geometrie terreno a blocchi (render) | 19.5 | 19.0 |
| geometrie altro | 18.6 | 17.0 |
| tele graffiti | 18.2 | 18.3 |
| tele città, il resto (render.js) | 17.9 | 10.3 |
| tele scorci, tetti | 16.0 | 4.0 |
| geometrie modelli (roba3d, arredo3d, pezzi) | 15.2 | 9.2 |
| geometrie città, il resto (render.js) | 12.4 | 12.6 |
| tele vegetazione | 11.0 | 3.5 |
| geometrie persone | 10.8 | 4.6 |
| geometrie riva | 7.2 | 7.2 |
| geometrie graffiti | 6.9 | 6.9 |
| tele modelli (roba3d, arredo3d, pezzi) | 6.7 | 5.5 |
| geometrie segnaletica, arredo vie | 6.5 | 6.5 |
| dati pavimenti | 6.3 | 8.3 |
| tele terreno a blocchi (render) | 5.6 | 3.1 |
| geometrie scorci, tetti | 5.4 | 5.4 |
| geometrie modelli glTF/GLB (kit) | 2.0 | 2.0 |

**Telefono, città nuova, dopo il giro (la città dall'alto)**

| citta | prima | dopo | |
|---|---:|---:|---:|
| heap JS (con gli array buffer) | 1813 | 1011 | -44% |
| di cui oggetti JS | 515 | 362 | -30% |
| array buffer | 1298 | 649 | -50% |
| scheda video | 1180 | 528 | -55% |
| tele 2D | 420 | 149 | -65% |
| totale heap + scheda | 2993 | 1539 | -49% |
| totale con le tele | 3412 | 1687 | -51% |

| scheda video per proprietario (MB) | prima | dopo |
|---|---:|---:|
| atlanti, tavolozze e pile (render) | 320.6 | 59.7 |
| case fuse (render) | 298.6 | 122.1 |
| vegetazione | 115.2 | 11.9 |
| persone | 62.4 | 21.8 |
| statiche fuse e cose di strada (render) | 56.2 | 56.6 |
| terreno a blocchi (render) | 53.4 | 30.7 |
| segnaletica, arredo vie | 32.0 | 16.0 |
| acqua (render) | 31.7 | 31.7 |
| scorci, tetti | 30.1 | 12.0 |
| case: pezzi fuori fusione (render) | 28.3 | 28.5 |
| mappe d'ombra | 25.0 | 10.3 |
| graffiti | 20.7 | 24.9 |
| modelli glTF/GLB (kit) | 19.2 | 22.7 |
| città, il resto (render.js) | 16.4 | 10.9 |
| bersagli del post | 15.1 | 15.1 |
| pavimenti | 13.3 | 13.3 |
| tela (schermo) | 10.0 | 10.0 |
| menu, audio | 10.0 | 10.0 |
| insegne (render) | 8.4 | 8.4 |
| altro | 6.2 | 4.5 |
| riva | 3.5 | 3.5 |
| modelli (roba3d, arredo3d, pezzi) | 2.1 | 1.7 |
| peso_* (tavolozze, aloni) | 0.9 | 0.9 |

| copie nel processore per proprietario (MB) | prima | dopo |
|---|---:|---:|
| geometrie case fuse (render) | 507.8 | 138.7 |
| tele atlanti, tavolozze e pile (render) | 162.0 | 2.4 |
| geometrie statiche fuse e cose di strada (render) | 130.7 | 62.2 |
| geometrie vegetazione | 100.7 | 4.4 |
| geometrie persone | 65.4 | 25.2 |
| tele insegne (render) | 51.3 | 16.1 |
| geometrie modelli (roba3d, arredo3d, pezzi) | 50.5 | 11.8 |
| geometrie case: pezzi fuori fusione (render) | 45.2 | 45.0 |
| dati atlanti, tavolozze e pile (render) | 36.9 | 13.2 |
| tele terreno a blocchi (render) | 35.6 | 10.1 |
| tele graffiti | 34.9 | 44.5 |
| tele acqua (render) | 31.7 | 31.7 |
| dati pavimenti | 30.3 | 30.3 |
| tele persone | 28.5 | 8.7 |
| geometrie terreno a blocchi (render) | 24.7 | 24.8 |
| tele segnaletica, arredo vie | 20.8 | 8.8 |
| tele città, il resto (render.js) | 19.4 | 11.6 |
| geometrie modelli glTF/GLB (kit) | 18.7 | 24.1 |
| geometrie altro | 18.6 | 17.0 |
| tele scorci, tetti | 16.0 | 4.0 |
| geometrie riva | 14.4 | 14.4 |
| geometrie città, il resto (render.js) | 13.7 | 13.7 |
| tele vegetazione | 11.0 | 3.5 |
| geometrie graffiti | 6.9 | 6.9 |
| tele modelli (roba3d, arredo3d, pezzi) | 6.8 | 5.6 |
| geometrie segnaletica, arredo vie | 6.6 | 6.6 |
| geometrie scorci, tetti | 5.4 | 5.4 |

**Computer, città nuova** (solo i tagli che non cambiano un pixel), dopo il caricamento e dopo il giro

| dopo il caricamento | prima | dopo | |
|---|---:|---:|---:|
| heap JS (con gli array buffer) | 1619 | 1296 | -20% |
| di cui oggetti JS | 485 | 322 | -34% |
| array buffer | 1134 | 974 | -14% |
| scheda video | 1169 | 1012 | -13% |
| tele 2D | 369 | 363 | -2% |
| totale heap + scheda | 2788 | 2308 | -17% |
| totale con le tele | 3156 | 2671 | -15% |

| citta | prima | dopo | |
|---|---:|---:|---:|
| heap JS (con gli array buffer) | 1839 | 1484 | -19% |
| di cui oggetti JS | 533 | 382 | -28% |
| array buffer | 1306 | 1102 | -16% |
| scheda video | 1588 | 1552 | -2% |
| tele 2D | 419 | 407 | -3% |
| totale heap + scheda | 3427 | 3036 | -11% |
| totale con le tele | 3846 | 3443 | -10% |

**Telefono, isola di prima (`?vecchia`)**: i tagli valgono anche lì (render.js è lo stesso), dopo il caricamento e dopo il giro

| dopo il caricamento | prima | dopo | |
|---|---:|---:|---:|
| heap JS (con gli array buffer) | 854 | 545 | -36% |
| di cui oggetti JS | 269 | 207 | -23% |
| array buffer | 585 | 338 | -42% |
| scheda video | 457 | 243 | -47% |
| tele 2D | 267 | 101 | -62% |
| totale heap + scheda | 1311 | 788 | -40% |
| totale con le tele | 1578 | 889 | -44% |

| citta | prima | dopo | |
|---|---:|---:|---:|
| heap JS (con gli array buffer) | 1036 | 634 | -39% |
| di cui oggetti JS | 319 | 246 | -23% |
| array buffer | 717 | 388 | -46% |
| scheda video | 717 | 339 | -53% |
| tele 2D | 333 | 144 | -57% |
| totale heap + scheda | 1753 | 973 | -45% |
| totale con le tele | 2086 | 1117 | -46% |

**I disegni e i tempi** (banco del peso col profilo del telefono, `?leggera`, 480×300, nella stessa versione con e senza i tagli:
`--query=&leggera` contro `&leggera&nomemoria`; mediana di 6 fotogrammi, tempi di SwiftShader: valgono i rapporti):

| scatto | disegni prima | disegni dopo | frame ms prima | frame ms dopo | 4× prima | 4× dopo |
|---|---:|---:|---:|---:|---:|---:|
| borgo | 1401 | 1404 | 172,7 | 206,2 | 909 | 979 |
| città dall'alto | 5157 | 5097 | 234,0 | 224,7 | 1469 | 1465 |

I disegni non cambiano; i tempi stanno nel rumore del banco (±15% fra due caricamenti; nel borgo, appena arrivati, la vegetazione lontana
costruisce i suoi riquadri, uno per fotogramma). Il caricamento: la compattazione delle case fuse costa ~15 s di processore in SwiftShader.

### 6.3 I tagli e cosa hanno comprato (telefono, dopo il giro)

| taglio (`?nomemoria<nome>` lo spegne) | dove | cosa |
|---|---|---|
| `pile` | `render.js` arrTex1 | le mappe delle case in pila a metà lato, non oltre 256 (le trame che si ripetono solo a metà); le tavolozze del kit (celle di colore lette al texel) a 128: atlanti, tavolozze e pile **321 → 60 MB** sulla scheda |
| `tele` | `render.js` arrTex1 | le tele 2D delle pile scendono a un quarto (servono solo alla casa che si dissolve): tele **162 → 2 MB** |
| `compatta` | `render.js` fusione1 | le case fuse: posizione in 16 bit nella scatola del secchio (la mesh porta centro e scala uniforme: <1 mm), uv in mezza precisione se stanno in ±2, i vertici uguali una volta sola con l'indice (il kit era indicizzato, la fusione triplicava), casa/colore/strato/vetro svuotati dopo l'invio: case fuse **508 → 139 MB** di copie, **299 → 122 MB** sulla scheda (con «pigri») |
| `pigri` (anche computer) | `render.js` lazyGeo1 | i pezzi originali rifatti per un raggio (la misura dei tetti di `tetti.js` al caricamento ne rifà ~3.700, ~125 MB) o per la dissolvenza si buttano dopo 5 s senza uso; il segnaposto eredita da uno solo |
| `statiche` | `render.js` flushStatic | normali, uv, colore e strato delle statiche fuse svuotati dopo l'invio (la posizione resta: chi nasconde un pezzo la chiude in un punto) |
| `verde`, `verdelontano` | `vegetazione.js` monta | le piante lontane a riquadri di 128 m entro 210 m dalla camera (oltre la nebbia del telefono non si vedevano), attributi compatti e svuotati dopo l'invio: **115 → 12 MB** sulla scheda, **100 → 4 MB** di copie |
| `atlanti` | personaggi, scorci, segnaletica, vegetazione | gli atlanti ≥ 1024 vanno alla scheda video a metà lato (la tela grande resta a chi disegna; a ogni `needsUpdate` la copia piccola si rifà) |
| `figure`, `gente` | `personaggi.js` | la pelle in attributi compatti (112 → ~45 byte a vertice); 40 figure in cache invece di 260 |
| `insegne` | `render.js` signTexture, insegnaTex | la tela dell'insegna si svuota dopo l'invio |
| `terreno` | `render.js` buildChunkGen | il terreno dipinto a blocchi a metà lato |
| `ombre` | `peso_ombre.js` | la mappa del sole ~945 invece di ~1550 (tre copie: cache, riserva, viva) |
| `compila` (anche computer) | `peso_pronti.js` | la compilazione del caricamento solo sul visibile: three r149 compilava anche i 17.000 pezzi originali spenti (−80 MB di oggetti JS) |
| `firme`, `cache` (anche computer) | `render.js` | le firme dei materiali (servivano solo alla fusione) e le geometrie modello delle cose di strada (`GC`, `BEVC`) buttate dopo il caricamento |
| `roba` (anche computer) | `oggetti3d.js` armaInMano | ogni arma si costruisce una volta: le armi (spente) di ogni personaggio sono copie con le stesse geometrie |
| (sempre) | `render.js` coalesce1 | il secchio delle statiche unito a un altro non tiene più i suoi pezzi (restava vivo nel registro: ~16 MB di geometrie) |

Rimasti com'erano, misurati: l'acqua (`buildWater`, 32 MB di tela + 32 sulla scheda: la riva fine la riscrive a blocchi), i pavimenti (le
loro DataTexture in virgola mobile si riscrivono dopo l'invio: svuotarle rompeva il selciato), i graffiti (`writing.js`, tele che crescono
col tempo), i bersagli del post, i pezzi delle case fuori fusione.

### 6.4 Quello che resta grande

- **gli oggetti JS (~320-360 MB)**: i 17.000 pezzi originali delle case fuse (Mesh, materiali per casa, segnaposti: ~60 MB), gli oggetti
  di scena di `arredo3d.js` (~13 MB), le persone (~30 MB tra figure, scheletri e armi), il resto della scena (~50.000 oggetti). Per
  scendere ancora servirebbe che i pezzi originali non esistessero come oggetti (rifatti dalla mesh fusa solo per la dissolvenza e i raggi);
- **le case fuse** (~140 MB di copie + ~120 sulla scheda dopo il giro): le copie servono per rifare i pezzi originali; i settori lontani
  potrebbero lasciare la scheda video (si ricaricano dalla copia);
- **il caricamento**: la compattazione delle case costa ~15 s di processore in SwiftShader (~5 s su un processore vero).

## 7. Caricamento ad anelli ([anelli])

Il gioco non si apriva (computer e telefono): prima del primo fotogramma la città nuova si costruiva **tutta**, e dopo, nel menu, i blocchi
del terreno si facevano interi a ogni fotogramma (fermo di decine di secondi). Ora c'è una cosa sola che decide cosa si fa e quando:
`src/anelli.js` (il motore, non sa niente della città) con i ganci in `render.js` (fusione1 a settori, la sagoma, le statiche lontane, i
blocchi del terreno).

### 7.1 Gli anelli

| anello | dove | cosa | quando |
|---|---|---|---|
| vicino | entro `Anelli.CFG.vicino` dal punto di partenza (170 m sul computer, 120 sul telefono: oltre la nebbia del primo sguardo) | le case fuse vere, le statiche, i blocchi del terreno | nel caricamento |
| medio | quello che si raggiunge in ~20 s alla velocità di adesso (a piedi 110-150 m, in macchina fino a 420), oltre la nebbia | le case vere dei settori di 48 m (SETT1), le statiche a celle di 80 m | appena si gioca, per primi (distanza dal punto guardato meno un premio di 45 m per quello che sta davanti alla camera) |
| lontano | il resto | la **sagoma**: le case come volumi (la scatola della casa girata come la casa, col colore del muro un po' spento e il tetto più scuro), una mesh sola, un programma solo | subito; poi, col tempo, la casa vera prende il suo posto |

Tutto quello che si vede vicino nasce nel caricamento: niente spunta sotto gli occhi. Le cose lontane arrivano oltre la nebbia; se si corre
più veloce dei lavori (un salto, la macchina), il settore che entra nella parte chiara della nebbia (`fog.near`) passa avanti con un tetto
di tempo più largo (14 ms), e fino ad allora si vede la sagoma, non un buco.

### 7.2 I lavori e il tetto di tempo

Ogni lavoro è un generatore che fa un pezzo a ogni passo e cede da solo (`Anelli.scaduto()`): la fusione di un settore va mesh per mesh,
poi le pile delle mappe una alla volta, poi un secchio alla volta (dopo il caricamento i secchi grandi si fanno a pezzi di al più 60.000
vertici, 24.000 sul telefono: ogni passo breve, indice a 16 bit; più disegni, gli stessi pixel). Il tetto per fotogramma è 3,5 ms (2,5 sul
telefono); 1 ms se il fotogramma misurato è lento rispetto al ritmo di riferimento (60, o 30 regolari sul telefono); 8 nel menu (6 sul
telefono). In più una quota di vertici nuovi per fotogramma per la scheda video (160.000, 60.000 sul telefono), perché l'invio lo paga il
disegno e non il lavoro (`Anelli.carica`, `Anelli.ASPETTA`: il lavoro aspetta il fotogramma dopo).

I blocchi del terreno (che già si facevano a pezzi) hanno un passo per ogni pittore (gli stessi, nello stesso ordine) e la riva, il suolo
e il suo mare in tre passi; nel menu corrono ma per al più 40 ms a fotogramma (prima un blocco intero: il primo, con la riva fine e il suo
mare, teneva fermo il menu per 25 s in SwiftShader).

### 7.3 La sfumatura

Il quarto canale della tessitura delle case fuse (FD1, uno per casa: 0 di norma) dice quanto si vede ancora la sagoma. Lo shader delle case
vere scarta i pixel dove il canale supera il retino (un rumore a gradiente intrecciato su `gl_FragCoord`, `Anelli.RETINO`), quello della
sagoma i complementari: per ~0,7 s le due si danno il cambio pixel per pixel, senza buchi e senza doppioni. A canale 0 (sempre con
`?tutto`) lo shader delle case non scarta niente: l'immagine è quella di prima.

**L'onda del primo avvio** (a ogni apertura della pagina, nel menu): anche le case vicine partono sagome e salgono a cerchi dal punto guardato
(110 m/s), come una città che si accende. Costa una mesh di scatole per un secondo e mezzo; `?noanimus` la spegne.

### 7.4 Il telefono e la memoria

Sul telefono le case lontane si fondono lo stesso, a pezzi (fondere libera i pezzi originali: diventano segnaposti e la fusa compattata è
molto più piccola), ma restano spente per la camera (livello 0) finché il loro settore non entra nell'anello medio; le statiche lontane
uguale. Così la scheda video riceve solo quello che si avvicina.

### 7.5 Il gioco non aspetta la grafica

Camminare, la quota del suolo (`groundH`, i praticabili), le porte, i tetti e la loro rete (tetti4: la regola dei piani; la misura sul
modello vero, `tetti.js` scanStart, usa i gruppi della casa anche quando la casa è fuori scena), la gente (`vievive.js`), le missioni
leggono i dati del mondo, non le mesh: dove la casa vera non è arrivata funzionano lo stesso. I raggi sulle case ancora fuori scena
colpiscono i loro pezzi originali (interi: non sono ancora segnaposti).

### 7.6 Gli interruttori e le sonde

- `?tutto`: come prima (tutto nel caricamento, niente sagome, niente lavori). Lo Studio (editor.html) costruisce sempre tutto.
- `?noanimus`: niente onda al primo avvio. `?anellilog`: il diario nella console.
- `window.__anelli`: lo stato (lavori, fatti, tetto, coda, urgenti, i passi più lunghi in `picchi`, `tuttoT`: quando è arrivato tutto).
  `Anelli.finisci()`: tutto subito (gli strumenti). `banco_peso.js` lo chiama da sé prima delle foto (`--anelli=vivo` per non farlo).
- `window.__tl`: la linea del tempo del caricamento (`init0`, `init1`: la costruzione; `compilato`: dopo la compilazione).

### 7.7 Le misure (24 ottobre, Chromium senza testa con SwiftShader, disegni a vuoto per i tempi; la macchina era carica: carico medio 5-12 su 4 processori, i tempi a muro oscillano del 20-30% fra due giri uguali, contano i rapporti)

Sonda: `__rt` (le fasi della costruzione), `window.__tl` (la linea del tempo), `window.__anelli`; 1280×720 sul computer, 390×844 DPR 3 tocco
`?leggera` sul telefono.

| | `?tutto` (come prima) | ad anelli |
|---|---:|---:|
| computer: la costruzione (somma di `__rt`) | 97,0 s | 85,8-97,6 s |
| computer: fusione1 nel caricamento | 9,9 s | 4,8-8,7 s (solo l'anello vicino) |
| computer: il menu fermo sul primo blocco del terreno (riva fine e il suo mare) | 24-27 s | nessuno: passi di 0,1-0,7 s |
| computer: le case dei 92 settori lontani dopo il caricamento | — | ~4,6 s di lavoro in tutto, a ≤3,5 ms per fotogramma (14 se un settore entra nella nebbia chiara); il passo più lungo dei lavori 30-50 ms |
| telefono: la costruzione | 130,7 s | 129,0 s |
| telefono: fusione1 nel caricamento | 26,1 s | 16,0 s |

Dopo l'unione di [telefono] (gallant dff541d), stessa macchina: la costruzione (`init1 - init0`) 95,3 s con `?tutto` contro 89,9 s ad
anelli, fusione1 17,0 contro 12,2 s.

Il grosso del caricamento che resta non è nell'anello: `pulizia2` (il regista e il rumore, ~45 s qui) e i dati del mondo (`world_cittanuova`,
`c2Dist`, la riva: dentro `water`, `buildings`) li alleggerisce il ramo dell'avvio (vedi il suo resoconto); la compilazione dei programmi
della scheda video (~180, nel processo della scheda: in SwiftShader 110-150 s di processore) resta.

Fotogrammi dopo «Gioca» (disegni a vuoto, il lavoro del processore, con la macchina carica): mediana e 95° percentile uguali fra `?tutto`
e anelli (500-700 ms qui: in SwiftShader col processore diviso; su un computer vero ~10 volte meno); i lavori degli anelli 1-3,5 ms per
fotogramma. Correndo a 15 m/s per 200 s: 80 settori su 96 arrivati, l'anello medio sale a 314 m, nessun buco (la sagoma tiene il posto).
I passi lunghi che restano sono dei blocchi del terreno fuori da render.js (il suolo di `pavimenti.js`, il prato di `vegetazione.js`,
la riva fine col suo mare: `copyTextureToTexture` aspetta la scheda video): 0,2-1,3 s qui, con la macchina carica.

**La memoria del telefono** (`strumenti/banco_memoria.js --profilo=telefono`, giro borgo → marina → città → mercato → borgo):

| | `?tutto` | ad anelli |
|---|---:|---:|
| dopo il caricamento: heap JS + scheda video | 863 + 365 = 1228 MB | 1016 + 321 = 1337 MB |
| il massimo del giro: heap + scheda | 1622 MB | 1587 MB |
| il picco della scheda video | 724 MB | 639 MB |

Dopo il caricamento l'heap è più alto (le case lontane tengono i pezzi originali finché il loro settore non si fonde, a pezzi, in
sottofondo) e la scheda più bassa (le case e le statiche lontane non ci vanno); durante il giro il totale scende sotto `?tutto`.

**La stessa città di `?tutto`.** Dopo `Anelli.finisci()` (stesso seme, stesso punto, disegni a vuoto) la scena è la stessa vertice per
vertice: le case fuse 13.326.384 vertici, le statiche 2.206.941, i pezzi rimasti nelle case 23.388, con la stessa somma delle posizioni nel
mondo, e per ognuna delle 588 case lo stesso numero di vertici fusi (le case fuse dopo entrano anche nello streaming della scheda video di
[memoria], `streamAdd1`). Cambiano solo il raggruppamento (le pile delle mappe per settore, i secchi tagliati a 60.000 vertici: 2.732 mesh
contro 2.159) e il numero della tavolozza, non i texel. Le foto del banco (`banco_peso.js --rif`) restano diverse di uno scarto medio di
3,4 (borgo) e 28 (marina) perché la camera del banco arriva al suo posto con un pixel di differenza fra due pagine (l'inseguimento dipende
dai fotogrammi passati): spostando la foto di un pixel lo scarto della marina scende da 26 a 15; il confronto che conta è quello della scena.

### 7.8 Quello che resta

- Le fasi della costruzione delle case (`buildings`, `case`, le facciate, i tetti) sono ancora per tutta l'isola: leggono e scrivono dati
  che altri usano dopo (b.__top, b.__win, le voci del registro di pulizia2). Il passo dopo è farle per settore (con `pulizia2`, che è di
  un altro ramo, rifatto sul settore e i suoi vicini).
- I passi lunghi dei blocchi fuori da render.js (pavimenti, vegetazione, la riva fine e il suo mare) vanno spezzati nei loro moduli.
- Sul telefono le case lontane si fondono in sottofondo: finché non è finito l'heap è ~100-150 MB sopra `?tutto`.
- La compilazione dei programmi (~180) è tutta nel caricamento: la si potrebbe dividere fra vicino e lontano solo con una compilazione
  asincrona che three r149 non ha.


## 8. La città a tasselli ([tasselli], pilota: `?tasselli=1`)

La città ferma non si costruisce più nel browser: `strumenti/tassella.js` la costruisce una volta nella build (il gioco vero in Chromium
senza testa, seme fisso, `?tutto`), `strumenti/tassella_pagina.js` cammina la scena finale e la taglia in settori di 48 m; il gioco scarica
solo i tasselli attorno alla camera (`src/tasselli.js`, il lavoratore `src/tasselli_lavoratore.js` con `meshopt_decoder.js`).

- **Cosa c'è in un tassello**: le mesh ferme messe in scena dalle fasi della città (tutte le fasi di `R.init` tranne cielo, isola, acqua,
  scena, particles, fx, debris, post), visibili, su un livello che una camera vede: case fuse con le loro sagome d'ombra (stesso buffer),
  statiche fuse, tetti, marciapiedi, segni, costa, arredi, le istanze divise per settore. I materiali portano lo shader già trasformato
  da `onBeforeCompile` (testo e uniform; quelle di modulo, come `FD1.u`, `PAL1.u`, `VENTO.t`, restano quelle vive di `render.js` per nome:
  `R.__tass.uni`), le tessiture i pixel che il gioco manda alla scheda video.
- **Il formato**: `PVT1` + testata JSON + blocchi; vettori quantizzati (posizione a 16 bit sulla scatola della mesh, normali a 8 bit),
  meshopt (vertici e indici), tutto in gzip (il lavoratore lo apre con `DecompressionStream`: va con qualunque server). Le zuppe di
  triangoli delle case fuse diventano vertici unici più indice (14,0 → 6,7 M vertici); le mesh uguali di un tassello si uniscono.
- **Le impronte**: `build.py` scrive `PV_IMPRONTA_TASS` (tutti i moduli del gioco, i modelli, il mondo cotto, l'esportatore);
  `tasselli/indice.json` deve averla uguale, se no il gioco costruisce come prima. `python3 build.py --tasselli` rifà i tasselli.
- **Gli anelli**: si apre e si monta quello che entra nell'impronta della camera a terra (fino alla nebbia) più un margine (24 m
  telefono, 40 computer: il riquadro dell'ombra del sole); si smonta quando ne esce di due margini; il compresso si scarica fino a 130 m
  (220 sul computer) e si butta oltre 200 (320). Dove il tassello manca c'è la sagoma (le case come volumi, `massaGeo1`, 32 KB per tutta
  l'isola) col retino di anelli. `?tassellilog`, `window.__tasselli`, `Tasselli.finisci(r)` per gli strumenti, `?tasselliraggio=0`.
- **Le misure** (`strumenti/misura_tasselli.js`, `strumenti/confronta_tasselli.js`; macchina condivisa, carico 8-13 su 4 processori,
  SwiftShader, disegni a vuoto: contano i rapporti):

| | telefono oggi | telefono tasselli | computer oggi | computer tasselli |
|---|---:|---:|---:|---:|
| si gioca (`__tl.gioco`, coi tasselli anche l'anello vicino) | 90-134 s | 31-56 s | 177 s | 84 s |
| `R.init` | 48-76 s | 5-10 s | 67 s | 7 s |
| pagina + scheda video, picco | 2,61-2,67 GB | 1,88 GB | 3,34 GB | 2,58 GB |
| pagina + scheda video, a regime | 2,50-2,62 GB | 1,86 GB | 3,31 GB | 2,53 GB |
| heap JS | 1.009 MB | 607 MB | 1.189 MB | 746 MB |
| disegni per fotogramma | 391 | 408 | 816 | 774 |
| scaricato fino all'anello vicino (tasselli, tessiture, indice) | — | 15,6 MB | — | 26,7 MB |

  Senza nessun tassello (`?tasselliraggio=0`) il telefono sta a 1,43 GB e 521 MB di heap: il resto del gioco (pagina, mondo cotto, kit,
  persone, mezzi, treni, sottosuolo, terreno a blocchi) pesa più della città.
- **L'immagine**: scarto medio contro oggi borgo 10,4 (il rumore fra due caricamenti di oggi è 1,5), città 4,8-6,5 (rumore 4,6). Quello che
  resta: le ombre (la cache di peso_ombre si ricuoce all'arrivo di ogni tassello e riparte da un altro riquadro), le facciate dipinte dal
  vivo (graffiti, murales) e le tele pigre ridipinte.
- **Quello che manca** (passo 3): le case tagliate e i tetti nascosti (visuale3/4: leggono `dyn.buildings`), i colpi e la distruzione
  sulle statiche, i graffiti sui muri, le luci che sfarfallano e gli aloni (sprite), bucato, bandiere e barche ferme come nella foto della
  build; la compilazione dei programmi dei tasselli nel caricamento; meno disegni (materiali in tavolozza/atlante per tassello).
