# Porto Vecchio — La camera davanti alla casa ([davanti], 11 novembre)

Il committente, sul telefono in verticale dentro il Game Boy del sito, a inizio partita («Trova Lupo · Biblioteca civica e parlagli»):
un muro giallo alto riempie il centro dello schermo fra la camera e il personaggio, che si vede solo nella sagoma arancione. «Per
inquadrature così la camera dovrebbe stare un po' più avanti, davanti all'edificio, così l'edificio non sta fra me e il personaggio».

`?davanti` la accende, `?nodavanti` la spegne (vince); **di difetto è spenta** finché il committente non approva. Dal vivo:
`Camera7.CD.on = true/false`, le manopole in `Camera7.KD`, lo stato in `window.__CAM7.dav` e `__CAM7.davF` (m avanti in questo fotogramma).
Vale per camera7 (di difetto) e camera9 (`?camera9`), a piedi e fuori: telefono in verticale e in orizzontale, computer, Game Boy.

## 1. Perché il braccio di oggi non bastava

camera7 e camera9 hanno già un braccio di gru (`cast7`): un raggio a sfera **dal busto verso la camera**; se tocca, il braccio si accorcia.
Due buchi lasciano il personaggio dietro una casa:

1. **Le mesh sotto 3,5 m di raggio non fermano il braccio** (scelta voluta: lampioni, cartelli, l'arredo). Ma fra queste ci sono pezzi
   di casa: pannelli e muretti sui tetti, abbaini, parapetti, a 8-9 m d'altezza, proprio dove sta la camera alta (34-50°).
2. **Il raggio parte dal personaggio**: una faccia che guarda la camera e non il personaggio (le facciate e i pannelli a una faccia sola)
   il raggio la prende dal retro, e three.js non la vede. La camera invece la vede, e la disegna davanti al personaggio.

Misurato attorno al punto d'avvio (sotto, §3): con la camera fuori dai muri, il personaggio coperto in 5 inquadrature su 1.240; due
sono la scena del committente (un pannello scuro riempie il centro, il personaggio solo in sagoma: `tetto_a`, `tetto_b` nelle foto).

## 2. Cosa fa (src/camera7.js `KD`, `davantiMeta`, `davanti`; render.js `davanti7`)

Dopo il braccio, a ogni fotogramma, tre raggi **dalla camera** verso le anche, il busto e la testa (`KD.punti`: 0,75, 1,15, 1,6 m)
contro le mesh piene vicine: le case, le fuse, le torri, gli archi, anche i pezzi piccoli da `KD.raggioMin` = 1,2 m in su; non le
chiome (hanno il retino), le persone, i mezzi, le cose registrate (ombrelloni, banchi, tende: le spegne già `cose7`). Per ogni raggio
coperto anche quello al contrario, dal corpo verso la camera: la faccia della casa dal lato del personaggio, se c'è.

- **Coperto** è solo quello che la camera vede, e solo se lo sono almeno `KD.quanti` = 2 raggi su 3 (una ringhiera davanti ai piedi
  non muove la camera: c'è la sagoma).
- **Dove**: la camera scivola avanti lungo il raggio camera → busto fino a `KD.margine` = 0,4 m davanti alla casa (dal lato del
  personaggio). Si spostano insieme la camera e il punto guardato: **la vista non gira e il busto resta nello stesso punto dello
  schermo**, il personaggio diventa solo più grande. Mai più vicina di `KD.minimo` = 1,5 m al busto (lì resta la sagoma).
- **Liscia**: entra dopo `KD.entra` = 0,1 s di copertura (una colonna che passa non la muove), con la molla di `KD.dentro` = 0,3 s
  (parte piano: al più 0,6 m in un fotogramma da 1/60 s anche per 6 m di strada); torna indietro solo dopo `KD.tieni` = 0,35 s libera,
  con la molla di `KD.fuori` = 0,7 s; dentro la banda di `KD.banda` = 0,25 m sta ferma (niente avanti e indietro).
- Il braccio di sotto non cambia: quando si accorcia da solo, la meta di qui si riduce di conseguenza.

Non toccati: il braccio, le salite, la spalla di camera9, il ricentro, i comandi (`test_camera7.js`, `test_camera9.js`,
`test_controlli8.js` passano uguali), il retino delle chiome, la sagoma (resta per quello che la camera non può evitare).

## 3. Le misure

**Le foto** (Pixel 7 emulato, lo schermo del Game Boy del sito: 383×680 in verticale, 627×333 in orizzontale; camera7, la camera di
difetto; sopra prima, sotto `?davanti`): `_immagini/davanti/tavola_verticale.jpg` (l'avvio, `tetto_a`, `tetto_b`, il Caruggio dei
Pescatori, Vico Lungo, Vico della Corte), `_immagini/davanti/tavola_orizzontale.jpg` (l'avvio, `tetto_a`, `tetto_b`).

- `tetto_a` e `tetto_b`: prima un pannello scuro riempie il centro del quadro e il personaggio è solo la sagoma arancione (camera a 10 m,
  50° e 46°); con `?davanti` la camera sta 1,7 e 5,2 m più avanti, davanti al pannello, e il personaggio si vede intero.
- L'avvio e i tre vicoli: uguali al pixel di composizione (lì il personaggio non era coperto: il livello non scatta).

**La scansione attorno all'avvio** (`griglia.js`: ogni 3 m in un quadrato di 52 m attorno a (1265, 349), 155 punti a piedi × 8 yaw =
1.240 inquadrature, 20 fotogrammi per una; «nascosto»: almeno 2 di 3 raggi dalla camera alle anche, al busto e alla testa toccano una
mesh piena):

| | nascosto (tutto) | nascosto con la camera fuori dai muri (braccio > 1,3 m) | la camera spinta avanti |
|---|---|---|---|
| oggi | 30 | 5 | — |
| `?davanti` | 28 | 3 | 5 |

I due che restano fuori dai muri: un banco registrato a 2,7 m da terra (le cose registrate le spegne `cose7`, non qui) e un lampione
(0,4 m di raggio). Gli altri 25 sono punti con la camera già dentro un portico o un androne (braccio al minimo, il muro a meno di
`KD.minimo` dal personaggio): lì resta la sagoma.

**Il cammino dietro il muro** (`cammina.js`: a 1,5 m/s davanti a `tetto_a` e `tetto_b`, la camera ferma nello yaw, 30 fotogrammi al
secondo): una sola entrata e una sola uscita per tratto, nessun avanti e indietro; i salti della camera oltre 1 m in un fotogramma sono
gli stessi con e senza `?davanti` (4 e 6: sono del braccio di camera7, vedi §5), il livello non ne aggiunge.

**La sonda delle coperture** (`node strumenti/sonda_occlusione.js --modi=nuova,vecchia --vecchia=davanti`, profilo leggero, i due vicoli
vicino alla piazza, la piazza, il portico, 69 s): **uguale al decimale** con e senza `?davanti` (coperto senza taglio 0,43%, cambi
d'inquadratura 41,6 al minuto, strappo della distanza 10.354): su quei tratti il personaggio non finisce mai dietro una casa vera e il
livello non scatta; nessun peggioramento. Il suo «coperto» in piazza (1,4%) è misurato con le scatole delle case, non con le mesh.

**Il costo**: tre raggi per fotogramma dalla camera (sei quando è coperto), sulle mesh vicine con mesh_bvh; `window.__DAV7.ms` e `.n`.

## 4. Come si prova

- `node src/test_davanti.js`: la meta (solo quello che la camera vede, la facciata a una faccia sola, il minimo), l'entrata (dopo 0,1 s,
  liscia), la colonna che passa, la banda, la tenuta, l'uscita (liscia, fino in fondo), il salto, il flag.
- Nel gioco: `index.html?davanti` (camera7), `index.html?camera9&davanti` (camera9). I posti delle foto: `tetto_a` (1290, 344) con la
  camera a sud (yaw 0), `tetto_b` (1287, 347) yaw 45°, a 25 m dal punto d'avvio (1265, 349).
- La sonda delle coperture: `node strumenti/sonda_occlusione.js --modi=nuova,vecchia --vecchia=davanti` (la seconda colonna è con
  `?davanti`).

## 5. Da sapere

- **I tasselli**: `src/camera7.js` e `src/render.js` entrano nell'impronta dei tasselli (`build.py` IMPRONTA_TASS): vanno ricotti
  (`python3 build.py --tasselli`) prima di pubblicare, anche se la città non cambia.
- **Il quadro iniziale esatto del committente** non l'ho riprodotto al pixel: nel banco (Pixel 7 emulato, Game Boy, sito e repository)
  l'avvio a (1265, 349) non è coperto in nessuno dei 18 yaw provati. Le inquadrature coperte vicine all'avvio sono quelle di `tetto_a`
  e `tetto_b`, con lo stesso aspetto (il muro al centro, la sagoma). Se il committente ritrova quella di prima, vale la pena una foto
  con `?davanti` nello stesso punto.
- **Il braccio di camera7 salta da solo** (di oggi, anche senza il flag): in `tetto_a` camminando il braccio passa da 9,6 a 1,3 m in
  un fotogramma e poi oscilla (l'«ultima prova: mai dentro un muro» di `passo`); questo livello non lo tocca. Quando il braccio si
  accorcia da solo la spinta in avanti si riduce di altrettanto (`davanti`: la camera resta alla stessa distanza dal busto), così le
  due cose non si sommano.
- **I casi che restano**: la camera già dentro un portico o sotto una volta (il braccio al minimo, 1,2 m: il muro è più vicino al
  personaggio di `KD.minimo`), e le cose piccole sotto 1,2 m di raggio (un lampione).
