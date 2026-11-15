# Porto Vecchio sul telefono: fluido ([fluido])

Ramo `fluido` (da `origin/claude/shader-styling-performance-wbvqfy`, 95b8c1a). Il telefono vero andava a 7-8 fps. Qui non c'è un telefono né
una scheda video: Chromium disegna in SwiftShader, quindi si misurano le cose che sul telefono costano, sempre sullo stesso profilo, prima e
dopo, una passata dopo l'altra sulla stessa macchina (condivisa, carico 7-10 su 4 processori: contano i rapporti).

Tavola: `_immagini/fluido/fluido.jpg` (per ogni posto la foto prima e dopo, coi numeri sotto).

## Come si misura

- **`strumenti/banco_fluido.js`**: il gioco come lo apre l'APK. La pagina d'ingresso del Game Boy (`android/app/src/main/ingresso`) col gioco
  nell'iframe `/gioco/index.html` e la sua query vera (`?strade2&insegne4&graffiti2&facce3&luce3&progetto&commedia&parola`), il `{pvc:'ciao'}`
  della console, un Android tipico di traverso (873×393 CSS, DPR 2,75, tocco: il profilo leggero lo sceglie il gioco). Lo schermo del Game Boy
  è 616×365 CSS. Seme fisso, passo fisso di 1/60 s, fermi in tre posti alle 11 col sereno: **l'inizio** (1265,349), **il porto** (il Molo
  Vecchio, 1290,381) e **la Piazza Grande** (1328,345). Per ogni posto, 30 fotogrammi per scaldare e 180 misurati:
  - ms di JS per fotogramma col **processore rallentato ×4** (CDP), coi disegni a vuoto: simulazione (`G.step`), grafica del processore
    (`R.frame`: three, ombre, matrici…) e «altro» (gli altri giri del browser: graffiti, HUD, regolatori);
  - contati alla fonte WebGL: disegni (scena, ombre, passi a tutta tela), triangoli, programmi, bersagli, pixel dei passi; poi un
    fotogramma «chi disegna cosa» per ramo della scena;
  - profilo del processore (salvato, `strumenti/leggi_profilo.js` lo legge per modulo:riga), allocazioni, raccolte della memoria;
  - i ms di SwiftShader di ogni passo (disegno vero, sincronizzato con la lettura di un pixel): il costo dei pixel e degli shader;
  - la foto dello schermo del Game Boy.
  I regolatori restano al gradino di partenza: si misura quello che il telefono ha all'avvio.
- **`strumenti/banco_logica.js`**: la logica in Node (i moduli di sonda_vita), fermi negli stessi posti, il tempo di processore per passo e
  una **firma** (dove sono tutte le persone e tutti i mezzi alla fine): una correzione «esatta» deve lasciarla uguale.

## Il quadro prima

Vedi la tabella «Prima e dopo» (colonne «prima»): all'inizio 1.683 ms di JS a fotogramma col processore ×4, di cui 1.122 fuori dal ciclo
del gioco; 635 disegni, 1,38 M triangoli, 4 passi dopo la scena, la scena a 1080×640 con MSAA 2×.

I costi più grandi all'inizio (processore ×4, tempo incluso, `prima_inizio.cpuprofile`):

| | ms/fot | dove |
|---|---:|---|
| l'aggancio dei graffiti di graffiti2 (raggi contro i muri) | 1.100 | `graffiti2.js:271` aggancia → `:316` tollerante → `writing.js:636` rayWall → `render.js:18523` fast → three (triangolo per triangolo) |
| il disegno di three (proiezione, uniform, disegni) | 290 | `render.js:20130` frame → `Js.render`; dentro: l'ombra del sole in cache `peso_ombre.js:246` (80) |
| il braccio della camera (5 raggi per prova, 2-3 prove) | 150 | `render.js:19815` cast7 ← `camera7.js:157` passo |
| il giro di writing.js (graffiti nuovi, quota del fotogramma) | 50 | `writing.js:2732` scanNear |
| il giro delle insegne nuove (tutta la scena ogni 5 s) | 40 | `insegne4.js:797` nuove |
| raccolte della memoria (96 MB allocati a fotogramma, dai raggi) | 38 | `getVertexPosition`, `intersectTriangle` di three |
| la simulazione | 27 | `game.js` step: mezzi contro persone, separazioni, animali |

Sul lato della scheda: la scena a 1080×640 con MSAA 2× (640 righe, 1,6 px per px CSS) era il 90% dei ms di SwiftShader; i passi dopo
(la maschera e la distanza dalle sagome dello stile E a mezza risoluzione, poi il passo unico) l'8%. 530 disegni nella scena e 1,3 M triangoli:
le case fuse (`fusione1`, 414k, 125 disegni), le persone (230k), i massi dei moli (175k in 183 istanze), la rete della città (`segni`: 143k in 4
mesh grandi quanto l'isola, disegnate da ogni posto).

## Le leve (in ordine di peso)

1. **I graffiti a dosi vere** (`graffiti2.js`, `writing.js`, `render.js` fast; commit 33e0f73). L'aggancio di graffiti2 (fino a 64 raggi più i
   420 del riquadro tollerante per lavoro) controllava il tetto di tempo solo fra un lavoro e l'altro: un lavoro durava centinaia di ms. Ora
   aggancia e tollerante sono generatori ripresi nel tempo che c'è (sul telefono 1,2 ms a fotogramma), stessi raggi nello stesso ordine.
   Il giro di writing.js sul telefono ha 1 ms (2,5 di corsa) invece del 6-12% del fotogramma (che a 7 fps voleva dire 15-25 ms). Le mesh
   piccole ma sparse (meno di 900 indici, sfera oltre 6 m: i pezzi fusi della città) hanno l'indice dei raggi come le grandi (stessi colpi).
   «Altro» da 1.122-1.936 a 64-88 ms/fot; allocato da 96-154 MB a 9-21 MB a fotogramma; raccolte da 38-51 a 7-12 ms/fot.
2. **La risoluzione del telefono** (`render.js` resizeHD; b109683). La soglia della scala fine sul telefono è 1,25 px per px CSS del lato
   corto (nel Game Boy 456 righe invece di 640): −49% di pixel. Il passo unico dello stile E resta (i suoi fili sono in «pixel stabili»,
   HDR.k). SwiftShader: scena −38/−61%, passi dopo la scena −49/−77%. Se il telefono ha margine, peso_ritmo sale come prima.
3. **Il regolatore parte da un gradino sensato** (`peso_ritmo.js`, `fluido_tel.js`; b109683). Due errori in fluido_tel (commit 2695670):
   con la scala fine `setRes(.85)` vuol dire l'85% del massimo, cioè il primo gradino «giù» alzava i pixel; e col tetto a 30 un fotogramma
   dura 33,3 ms anche quando avanza tempo, quindi «oltre 33 ms» scendeva sempre e «sotto 24» non risaliva mai (al banco: gradino 4 in 50 s).
   Ora la risoluzione la muove solo peso_ritmo, fluido_tel misura contro il ritmo voluto e scende solo quando peso_ritmo è in fondo; si
   parte col tetto a 30 e dal gradino 1. Gradino 3 nuovo: il sole a fotogrammi alterni (`R.ombreRade`). `?fluidotel=vecchio` com'era.
4. **La simulazione** (`game.js`, `animali.js`; ff96759, 3121e3f, e204e17). Persone contro mezzi e mezzi contro persone provati prima su
   array di numeri (le persone sono oggetti a dizionario: ogni lettura una ricerca per nome), griglie riusate, chiavi numeriche, animali con
   la scatola prima dell'hypot: stessa firma in `banco_logica.js` (posizioni finali identiche), −20% di processore. Sul telefono l'anello:
   dentro la bolla chi fa la sua giornata oltre 30 m dal giocatore fa il passo a giri alterni, oltre 48 m uno su tre (persone aggiornate a
   passo 112-175 → 73-87). Simulazione da 24-27 a 20-22 ms/fot.
5. **La grafica del processore** (`peso_ombre.js`, `insegne4.js`, `peso_lontano.js`, `peso_gente.js`, `render.js`; 37c15a3, e781d50,
   e7b961c). Sul telefono il conto di chi fa ombra (17.000 oggetti) a fotogrammi alterni (i mobili si ridisegnano sempre); il giro delle
   insegne nuove a fette di 1,5 ms invece di tutta la scena ogni 5 s; il giro dei muri da dipingere a fette di 1.500 nodi; le cose piccole
   lontane tagliate sotto 1 px di raggio (era mezzo); la persona lontana sotto 40 px di riferimento (23 px CSS). Grafica da 445-779 a
   366-530 ms/fot.
6. **Triangoli e passi** (`riva.js`, `render.js`; e781d50, e7b961c, ef7a239). La rete della città (`segni`: mensole, contatori, cabine,
   antenne) era fusa in 4 mesh grandi quanto l'isola, 143k triangoli disegnati da ogni posto: ora per riquadri di 96 m (29k in vista
   all'inizio). I massi dei moli sul telefono a metà triangoli (175k → 89k all'inizio). La distanza dalle sagome dello stile E cerca 4 texel
   invece di 10 (il passo unico la usa fino a 4 px: stessa immagine, 9 letture invece di 21).

## Prima e dopo

| | inizio prima | inizio dopo | porto prima | porto dopo | piazza prima | piazza dopo |
|---|---:|---:|---:|---:|---:|---:|
| JS per fotogramma, ms (processore ×4) | 1683 | 458 | 1952 | 622 | 2405 | 477 |
| · simulazione (G.step) | 27 | 20 | 27 | 21 | 24 | 22 |
| · grafica (R.frame) | 535 | 374 | 779 | 530 | 445 | 366 |
| · altro (gli altri giri del browser) | 1122 | 64 | 1145 | 71 | 1936 | 88 |
| JS p95, ms | 2585 | 656 | 3118 | 831 | 4226 | 638 |
| raccolte della memoria, ms per fotogramma | 38,1 | 7,6 | 40,8 | 11,5 | 50,8 | 6,6 |
| allocato, KB per fotogramma | 96.033 | 10.487 | 109.974 | 20.690 | 154.266 | 9075 |
| disegni per fotogramma (tutti) | 635 | 592 | 511 | 474 | 829 | 673 |
| · scena / ombre / passi | 531 / 100 / 4 | 525 / 63 / 4 | 361 / 146 / 4 | 332 / 138 / 4 | 603 / 223 / 4 | 582 / 87 / 4 |
| triangoli (migliaia) | 1384 | 1225 | 928 | 703 | 1567 | 1421 |
| · scena / ombre | 1290 / 94 | 1123 / 102 | 800 / 128 | 621 / 81 | 1360 / 207 | 1323 / 98 |
| programmi usati / cambi di programma | 110 / 215 | 110 / 215 | 94 / 178 | 93 / 172 | 102 / 217 | 100 / 211 |
| passi a tutta tela (Mpx a fotogramma) | 4 (1,2) | 4 (0,6) | 4 (1,2) | 4 (0,6) | 4 (1,2) | 4 (0,6) |
| risoluzione della scena | 1080×640 | 769×456 | 1080×640 | 769×456 | 1080×640 | 769×456 |
| SwiftShader, ms: scena | 4320 | 2601 | 2769 | 1716 | 3400 | 1329 |
| SwiftShader, ms: ombra / passi | 88 / 402 | 112 / 189 | 170 / 358 | 65 / 182 | 84 / 563 | 98 / 131 |

**Rispetto agli obiettivi** (telefono, processore ×4): JS sotto 12 ms → **no**, 458-622 ms (−73/−80%); disegni sotto ~300 → **no**,
474-673 (−7/−19%); triangoli sotto ~400k → **no**, 0,70-1,42 M (−10/−24%); al più 2 passi a tutta tela → **in parte**: 4 passi, ma uno solo
a tutta tela e tre a un quarto dell'area (la distanza dalle sagome), cioè 1,75 tele equivalenti, coi pixel dimezzati.
I ms di questa macchina sono gonfiati dal carico (7-10 su 4 processori, SwiftShader nello stesso processo della GPU): valgono i rapporti.
Non misurato qui: il telefono vero (fps, temperatura), i tasselli scaricati dall'APK (la città qui è costruita nel browser), il gioco in
movimento (solo fermi in tre posti).

## Cosa resta

- **Il disegno di three** è ora il 40% del JS: la proiezione visita le ~29.000 mesh della città costruita nel browser e 530 disegni hanno
  110 programmi. Coi tasselli scendono le mesh; per i disegni servono meno materiali (tavolozza e pile di mappe per le statiche).
- **Le case fuse** (`fusione1`: 414-627k triangoli, 125-191 disegni): un livello semplificato per i settori lontani.
- **Le persone** (230-260k triangoli, ~7.700 per figura con guardaroba2/facce3): una figura semplificata oltre i 30 m in `personaggi.js`;
  il fogliame istanziato (blob da 494 triangoli, 108k all'inizio): un blob più semplice sul telefono.
- **I blocchi del terreno** costruiti camminando (`render.js` buildChunkGen → `world_cittanuova.js` c2Dist: 8%).
- **Il braccio della camera** (6,5%): raggi su mesh compatte col metodo lento (712 a fotogramma, `__rlGeo` del banco).
- **L'ombra del sole**: 63-138 disegni dei mobili a fotogramma.

## Gli interruttori

`?telpr=1.5` (o `=0` com'era) · `?notetto30` · `?fluidotel=vecchio` · `?noanello` · `?nofluidogiri` · `?nobvhsparse` · `?noaggtel` ·
`?nograftel` · `?noombrelievi` · `?nolontanotel` · `?nolontanetel` · `?nomassitel` · `?noedisttel` · `?nosegniriquadri`.
Strumenti: `strumenti/banco_fluido.js`, `banco_logica.js`, `leggi_profilo.js` (HTML=, SOTTO=, CHI=, LENTI=), `leggi_righe.js`,
`tabella_fluido.js`, `fogli_fluido.py`. Prova di fumo (`fumo6.js`): `errori []`, prima e dopo (la foto va in timeout a 30 s anche sulla build
di partenza: è il carico della macchina).
