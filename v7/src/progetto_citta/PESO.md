# Porto Vecchio — il peso della città nuova ([peso])

Obiettivo (dal committente): «deve girare fluido ma con la pazzesca qualità che stiamo ottenendo». 60 fps sui telefoni recenti, 30 stabili
sui medi; meno di 1000 disegni nel borgo, meno di 1500 nella vista peggiore; niente scatti di compilazione. **L'immagine non deve
peggiorare**: ogni passo è misurato sulle stesse otto inquadrature e confrontato pixel per pixel.

## 1. Il banco del peso (`strumenti/banco_peso.js`)

```
node strumenti/banco_peso.js <cartella> [--query=&nopeso] [--rif=<cartella di un giro precedente>] [--solo=borgo,notte] [--nf=8] [--nothrottle]
python3 strumenti/banco_diff.py <cartella A> <cartella B> [<cartella delle differenze>]
python3 strumenti/fogli_peso.py <cartella prima> <cartella dopo> _immagini/peso <nome>
```

Chromium senza testa con SwiftShader (`/opt/pw-browsers/chromium`), seme 12345 (lo stesso generatore di `src/seme.js`), il giorno dopo
quello di partenza, tempo sereno, 480×300. Otto inquadrature fisse:

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
  proporzione (stesso texel: 2048 → 2480 sul computer, 1024 → ~1240 sul telefono). La direzione del sole va a scatti di 0,15°.
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

## 4. Gli interruttori

`?nopeso` spegne tutto insieme (il «prima» del banco). Uno per uno: `?nopesoombre`, `?nopesovetro`, `?nopesotinte`, `?nopesogente`,
`?nopesolontane`, `?nopesolontano`, `?nopesobagliori`, `?nopesotrasp`, `?nopesobotteghe`, `?nopesointonaco`, `?nopesoatlante`,
`?nopesoschermo`. Dal vivo, per il banco: `window.__pesoAB.{ombre, gente, lontano, bagliori, trasp}(true|false)`.

{{LIMITI}}
