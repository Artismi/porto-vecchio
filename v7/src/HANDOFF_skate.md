# Porto Vecchio — Lo skate (9 ottobre)

Una tavola, sei posti dove usarla e una fisica pensata per sentire la tavola sotto i piedi. Tutto è in `src/skate.js`: logica, posti, grafica e HUD. Le idee vengono da Skate 3 (trick col gesto, grind che si agganciano da soli, la "linea"), ma il codice è nostro (vedi `HANDOFF_ispirazione.md`).

## Come si gioca
- **Prendere la tavola**: in ogni posto c'è una tavola appoggiata con un cerchio giallo a terra. Ci si avvicina e si preme **X**. Da quel momento X fa salire e scendere ovunque all'aperto.
- **W** dà una spinta. Si va a colpi, uno ogni 0,6 s, e intanto la tavola gira verso il puntatore. **S** frena col piede, **A/D** curvano.
- **Spazio**: si tiene premuto per caricare e si lascia per l'ollie. L'altezza va da 30 cm senza carica a più di un metro con la carica piena.
- **Il trick lo sceglie il mouse**: mentre tieni Spazio, l'ultimo scatto prima di lasciarlo decide cosa fai.
  - a sinistra: kickflip
  - a destra: heelflip
  - in giù: pop shove-it
  - un giro: 360 flip
  - fermo: ollie

  Ogni flip ha bisogno di un tempo minimo in aria (shove-it 0,45 s, kick/heel 0,55 s, 360 flip 0,75 s). Se atterri prima, cadi. Cadi anche se atterri di traverso o da troppo in alto.
- **Grind e slide** si agganciano da soli quando scendi su uno spigolo con un po' di velocità lungo lo spigolo. L'angolo di arrivo decide il tipo: 50-50, Crooked o Boardslide. Sul bordo di quarter e piscina è un grind sul bordo. Con Spazio esci con un ollie (anche col flip).
- **Slappy**: tenendo Spazio e strisciando contro un cordolo basso (fino a 32 cm) ci si sale sopra senza saltare. È un trick tipico degli anni '80.
- **Quarter e piscina**: in salita si rallenta davvero, perché l'energia si conserva. In cima alla parete verticale si vola dritti in su, si fa mezzo giro in aria e si ricade dentro. La presa la sceglie il gesto fatto lasciando Spazio in aria (Frontside, Indy, Method…). Restare a lungo sulle pareti curve vale "Carve".
- **La linea**: i trick si sommano finché resti in tavola. Il moltiplicatore è il numero di trick fatti. Dopo 2 secondi a terra senza trick la linea si chiude e i punti si incassano; se cadi la perdi. In alto al centro c'è l'HUD (trick, punti × moltiplicatore, totale e record).

## I posti (`SPOTS`)
| id | dove | pezzi |
| --- | --- | --- |
| `cultura` | Piazzale della Cultura | due banchine che si guardano, due banchi di granito, la sbarra; due ragazzi di giorno |
| `sanrocco` | Piazza San Rocco | il blocco del manual, due panchine di marmo |
| `governo` | Piazza del Governo | il gradone lungo, due corrimano; **la Tutela non vuole** |
| `capannone` | piazzale del porto cargo | due quarter di legno (1,6 m), funbox, sbarra, kicker, sotto una tettoia con la neve sopra e la lampada accesa la sera; tre ragazzi di giorno |
| `piscina` | radura dei Giardini di Ponente (se non c'è posto: Collina Ovest, Piazza del Governo…) | la vasca vuota della fontana monumentale (9,6 × 6,4 m, profonda 1,7 m), **rialzata**: il ripiano tutto intorno, la rampa per salirci, lo scarico, la neve sul fondo, la statua senza testa. Rialzata perché una vasca sotto il livello del suolo resterebbe coperta dal terreno della grafica |
| `lungomare` | Via al Mare | il muretto lungo, un cordolo per lo slappy |

- **Piazzamento**: ogni posto cerca il punto libero più vicino al suo luogo, entro 46 m (`maxR`), e se non lo trova prova i luoghi di riserva (`alt`). Sta ad almeno 3,5 m dagli altri luoghi, dove la grafica mette fontane, bancarelle e monoliti. Valgono solo le caselle dei tipi voluti, mai strade, porte, edifici o banchi del mercato (`Game.layout()`). Le caselle occupate finiscono in `Game.layout().block`: per il motore diventano ingombro, così gli NPC ci girano attorno e i crocchi si fanno a bordo rampa. La tavola invece ci passa (`free`), e chi scende dalla tavola dentro un posto viene messo fuori (`unstick`). Gli oggetti di scena della città che cadono dentro un posto (panchine, barili, casse) vengono tolti come fa l'editor (`clearProps`), e si ritolgono a ogni partita nuova.
- La tettoia del Capannone sparisce quando ti avvicini, così dall'alto si vedono le rampe.
- **Pezzi**: un pezzo è `{k, dx, dy, a, L, W, H}`, e le rampe salgono verso +asse. I tipi sono `pad`, `bank`, `kicker`, `quarter` (con `D` pedana), `funbox` (con `B` banchine), `bowl` (con `A`, `B`, `RC` raggio d'angolo, `R` raggio della curva = profondità), `ledge`, `curb`, `rail`, `post`.
  - Il suolo da skate è un **campo d'altezze** (`surface`), fatto da tutti i pezzi tranne quelli stretti.
  - I pezzi stretti sono ostacoli (`solidAt`) con gli **spigoli** (`EDGES`) su cui si grinda.
  - **Per aggiungere un posto basta una riga in `SPOTS`.**

## Gli NPC
- Chi ti vede chiudere una linea da almeno 250 punti commenta (con `Game.say`). Gli anziani e i timidi brontolano.
- Se la linea arriva a 600 punti e qualcuno ti ha visto, nasce il fatto **`numero`** (`Game.emit`): entra nelle memorie, poi nelle voci («Hai sentito? Nino ha fatto i numeri con lo skate a …»). Ne nasce al massimo uno al minuto. La frase arriva da `HOOKS.verb`.
- Se cadi davanti a qualcuno, a volte ride o chiede se è tutto a posto.
- Se vai addosso a un passante sopra i 3,2 m/s, lui barcolla e tu cadi.
- **Piazza del Governo**: un agente o un militare che ti vede ti richiama due volte, poi alla terza ti sequestra la tavola. Ne trovi un'altra negli altri posti.
- I **ragazzi dello skate** (al Capannone e alla Cultura, dalle 10 alle 19, non sotto la pioggia se il posto è scoperto) sono solo grafica. Vanno avanti e indietro su una corsia libera, saltano e fanno il flip. Alle tue linee buone fanno il tifo.

## Agganci (righe `[skate]`)
- `game.js`, `movePlayer`: `if (p.sk && p.sk.on && … Skate.move(st, dt, inp)) return;`
- `render.js`, dopo `swimPose`: `Skate.pose(pg, st, playerH, dt)`, che mette il personaggio di traverso sopra la tavola, accovacciato quando carica, e fa girare la tavola nei trick. **Se `render.js` viene rigenerato dalla catena degli script, la riga va rimessa.**
- `index.src.html`: lo script dopo `sottosuolo.js`.
- Tasti e mouse li legge `skate.js` da solo (X, WASD, Spazio, il movimento del mouse mentre tieni Spazio), solo quando sei in tavola e non c'è un menu aperto.

## Prove
- `node test_skate.js` (dalla cartella `src`), 26 prove: i posti, la tavola, la spinta, l'ollie, il grind sulla sbarra, il flip senza altezza (si cade), il kickflip caricato, l'aria sul quarter con la ricaduta dentro, la caduta contro il funbox e la risalita, la vasca (si entra dal bordo e si risale con la rampa), la discesa fuori dagli ingombri, il fatto `numero` che finisce nelle voci, 10 s di giro libero.
- `test_vita.js`, `test_azioni.js` e `test_economia.js` girano anche con i posti caricati.

## Aperto
- Il touch non ha ancora i comandi dello skate.
- Le panchine e le fioriere della città (oggetti di `render.js`) non sono ancora grindabili, perché il motore non sa dove sono. Si può fare leggendo `R.__dz.props` dopo il caricamento.
- Il cordolo dei marciapiedi è disegnato con una curva liscia, mentre la logica ragiona a caselle da 2 m: per ora non è grindabile.
- I ragazzi dello skate non si possono cliccare né parlano: un `OGG` `spot_skate` in `popolo.js` (interesse sport) li farebbe diventare abitanti veri.
- Nessun suono dedicato: si usano `legno`, `palo` e `thud`. Un rotolio continuo di ruote sarebbe da fare in `audio.js`.

## Leggerezza (9 ottobre, sera)
- La fisica lavora solo quando sei in tavola e guarda solo i pezzi della cella di 8 m dove ti trovi (`GRID`): su tutta la mappa costa poco.
- La grafica: ogni posto è un gruppo suo con i pezzi **fusi in una mesh per materiale** (`mergeByMat`), e si disegna solo quando la camera è entro circa 75 m (di più con lo zoom largo). Tettoia, tavola appoggiata e cerchio giallo restano a parte perché si animano.
- Aperto: le piante del bosco (istanziate da `natura_kit.js`) spuntano dentro la vasca; vanno tolte dall'area del posto quando si piantano.
