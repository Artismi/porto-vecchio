# Porto Vecchio 1.6.1 vista da fuori: punto di partenza e punto d'arrivo

20 novembre 2026. Il committente: «la 1.6.1 non è niente male, ma si può fare molto meglio. Guardala da fuori, come se non avessi
lavorato al progetto. Il gameplay più fluido, le inquadrature migliori, un gioco molto più scenografico e dinamico. Adesso è rallentato e
a volte poco comprensibile, su tutti i livelli». E poi: «cinematografico, dinamico come un film d'azione quando le cose si scaldano,
veloce; quando si vuole la pace, placido. Inquadrature e ambienti pensati come level design. Esperienza e coerenza degli avvenimenti.
Il graffito sul muro applicato in modo corretto e comprensibile. Animazioni, texture, ombre, luci. Fluido e leggero, perché giri bene
sul telefono senza scatti. Che il personaggio non si incastri: contro un muro, se non sei dritto, scivoli piano a destra o a sinistra;
in bici fai inversione contro l'ostacolo; su una scala finisci sopra o sotto, mai nel corrimano».

Questa nota ha tre parti: **la diagnosi** (dove la 1.6.1 perde, livello per livello, con le prove), **il primo intervento** (cosa è
già cambiato su questo ramo, misurato, ognuno con il suo interruttore), **il punto d'arrivo** (com'è il gioco finito e le fasi per
arrivarci).

---

## 0. In una pagina

La 1.6.1 ha un mondo ricchissimo e una simulazione profonda. Quello che manca è **la regia**: niente decide come il gioco *si sente*
momento per momento. Ogni intervento degli ultimi due mesi ha aggiunto uno strato (camera7 sopra camera6 sopra CALMA2…, 220
interruttori nell'indirizzo, 119 dei quali tengono in vita una versione vecchia), e ognuno ha risolto il suo problema. Nessuno guarda
l'insieme: il tempo, la camera, il corpo del personaggio, i colpi, le scritte e il ritmo.

Le cinque cause più grosse del «rallentato e poco comprensibile»:

1. **Il mondo va davvero più piano.** Sotto i 20 fotogrammi al secondo il gioco avanza al massimo 50 ms per fotogramma. A 8 fps,
   che sul telefono capita, il mondo corre al 40% del tempo vero. Non sembra lento: è lento.
2. **La camera non ha registro.** È un braccio solo, alto 34°, neutro: uguale in una passeggiata e in una sparatoria. Il cielo e
   l'orizzonte non si vedono quasi mai. Salendo in auto c'è un salto a 54° per un fotogramma; scendendo, un taglio secco. Guidando, una
   cornice 4:3 annerisce i lati dello schermo. Sul telefono in orizzontale è il 38%.
3. **Il corpo non risponde come promette.** Il passo di serie (3,6 m/s) mostra la corsa al 72% della sua velocità: una corsetta
   svogliata. La levetta del telefono arriva alla corsa solo oltre il 92% della spinta e dopo 0,7 s. I pugni non hanno peso: nessun
   fermo d'impatto, nessuna scossa. Il pulsante Picchia sceglie bersagli fuori dalla portata del pugno.
4. **Il personaggio si incastra.** Lungo un muro fatto di più caselle, ogni giuntura fra due caselle si comportava come uno spigolo
   invisibile e ti spingeva indietro. Spingendo di sbieco contro un muro dritto ci si fermava, invece di scivolare. In bici contro un
   muro la levetta indietro faceva solo sterzare in tondo.
5. **Troppe cose dette insieme, nel posto sbagliato.** Appena saliti su un'auto rubata (prova col profilo a tocco) quattro scritte si
   sovrappongono al centro, sopra la macchina. La prima cosa da fare è una chat che ferma il mondo. I testimoni fermano il tempo con
   una scritta grande.

Il primo intervento (§3) affronta 1, 2, 3 e 4 e una parte del 5. Il resto è il piano (§5).

---

## 1. Come l'ho guardata

- **Il gioco vero, come nell'APK.** La pagina d'ingresso del Game Boy rosa (`android/app/src/main/ingresso`) con dentro il gioco in
  `/gioco/`, Chromium col profilo di un telefono (Pixel 7, tocco, in verticale e in orizzontale). Poi la stessa partita senza Game Boy,
  col profilo a tocco, per confronto. Qui non c'è una scheda video: Chromium disegna col processore (SwiftShader) a 0,3 fotogrammi al
  secondo. Le foto valgono per le inquadrature e per lo schermo, non per la fluidità.
- **Il codice**, letto da capo: `main.js` (il ciclo), `camera7.js` e la camera di `render.js`, `game.js` (il passo a piedi, i mezzi, i
  colpi), `peso_ritmo.js`, `fluido_tel.js`, i cicli dei moduli, `writing.js` (la tavoletta dei graffiti).
- **Le note** del progetto (FLUIDO 1-3, ANALISI_CAMERA, ANALISI_CAMERA9, AUDIT_PRESTAZIONI, DECISIONI), lette dopo, per controllo.
- **Le sonde senza browser**: `strumenti/sonda_incastri.js` (nuova: 250 punti vicino agli ostacoli, 16 direzioni, 1,5 s per spinta;
  più le rampe delle scale) e `strumenti/sonda_partenza.js`.

Cosa non ho potuto fare: provare su un telefono vero e misurare i fotogrammi veri. Nessuna nota del progetto ha numeri da un telefono
vero. È la prima misura da fare (§5, F0).

---

## 2. La diagnosi, livello per livello

### 2.1 Il tempo

- `main.js` loop0: un `G.step` per fotogramma, al più 50 ms. Sotto i 20 fps il tempo che manca si perde: a 10 fps il mondo va al 50%,
  a 8 fps al 40%. La camera invece va col tempo vero (al più 250 ms): **il mondo rallenta e la camera no**, e questo si sente.
- Il telefono sta a 30 (il tetto di `peso_ritmo.js`). Ogni fotogramma che sfora i 33 ms finisce al terzo giro dello schermo: il ritmo
  alterna 33 e 50 ms.
- Rallentano di proposito: il rallentatore dei testimoni (0,8 s al 35%), quello delle uccisioni (0,35 s), il menu in strada (25%),
  la chat di gruppo (25%). Il rallentatore è uno strumento di regia potente: va usato per i momenti, non per ogni testimone.

### 2.2 La camera

- **Uno strato solo a piedi, tre strati sui mezzi.** A piedi fuori c'è solo `Camera7.passo`. Sui mezzi, dentro casa e sotto terra
  gira ancora la camera vecchia (CAM6, CALMA2, INQ4, RG5, BASSA…), quasi tutta scavalcata ma viva.
- **Senza registro.** Braccio 10 m, pendenza 34°, lente 46°: sempre. Il bordo alto del quadro sta 11° sotto l'orizzonte: niente
  cielo, niente fondale, niente landmark lontani. È una vista «da mappa», leggibile ma piatta. La variante bassa (`?camera9`) esiste ed
  è più cinematografica, ma non è di serie.
- **La scossa non si vede.** È una traslazione di `min(0,35, scossa² × 0,9)` metri: per la pistola 4 mm. Solo lupara ed esplosioni si
  sentono.
- **Le transizioni sono salti.** Salendo su un mezzo la vista media di CAM6 (54°, 8 m) entra per un fotogramma e poi sfuma in ~2 s.
  Scendendo, camera7 riparte da capo: taglio secco.
- **La cornice 4:3 guidando** (`render.js`, `U.pillar`): bande nere ai lati. Sul telefono in orizzontale (2,16:1) è il 38% dello
  schermo, proprio quando si deve vedere la strada. Nel Game Boy in verticale lo schermo è già stretto e le bande non entrano.
- **Il Game Boy in verticale** (l'APK): lo schermo del gioco è largo ~0,6 della sua altezza. camera7 vuole almeno 62° di orizzontale,
  quindi in verticale la lente sale al tetto di 80°: la strada stirata ai bordi, il personaggio piccolo al centro, i muri vicini enormi
  (`_immagini/apk_gameboy_verticale.jpg`: alla partenza il personaggio è una sagoma dietro un muro che riempie lo schermo). È la vista
  del telefono, cioè quella che conta di più.
- **Il dialogo** sposta solo il punto guardato a metà fra te e chi parla: nessun campo e controcampo, nessuna vicinanza.
- **Nel rallentatore lo sguardo avanti si accorciava** (la velocità per la camera era misurata col tempo non rallentato).
- La decisione dell'11 novembre era «la camera resta com'è». La richiesta di oggi la supera: le inquadrature sono il cuore del lavoro.
  La camera di prima resta a un interruttore (`?nocinema_camera`).

### 2.3 Il corpo: comandi, passo, colpi, incastri

- **Il passo** con i tasti è 3,6 m/s. La corsa parte da 3,5 m/s (`models.js`): a 3,6 si vede la clip della corsa al 72%. Sembra una
  corsetta lenta.
- **La levetta del telefono** è quadratica (a metà corsa 2,3 m/s), la corsa piena è oltre il 92% e arriva dopo 0,7 s; in auto il gas
  pieno dopo 1,8 s. È la causa più probabile del «lento» nell'APK.
- **I pugni**: 14 di danno, 7-9 pugni per mettere giù qualcuno, nessun fermo d'impatto, nessuna scossa, nessuno spintone. Sul
  telefono il segno del colpo (la croce) è nascosto. Il pulsante Picchia sceglie il bersaglio fino a 2,4 m, ma il pugno arriva a 1,8:
  in mezzo il colpo va a vuoto.
- **Gli incastri**, misurati con la sonda (250 punti nel borgo vicino a muri, ringhiere e scale, 16 direzioni, 1,5 s di levetta):

| | 1.6.1 |
|---|---|
| spinte ferme (meno di 0,35 m) | 2,8% |
| ferme anche se la direzione accanto (22,5°) va lontano | 2,5% |
| spinte che strisciano (0,35-1,2 m) | 5,0% |
| sulle scale, fermi a metà rampa contro il corrimano | 1,4% |

  La causa principale l'ho trovata in `scivola7`: il cerchio del personaggio veniva spinto fuori da ogni casella piena verso il suo
  punto più vicino. Lungo un muro di più caselle, alla giuntura fra due caselle il punto più vicino è lo spigolo comune, e la spinta
  andava in diagonale all'indietro. Spingendo di sbieco contro il muro della Vittoria ci si muoveva di 4 cm in 1,5 s.
- **La BMX contro un muro**: col clic si girava sul posto, con la levetta (telefono e Game Boy) no: sterzava in tondo contro il muro,
  poi partiva la retromarcia automatica.

### 2.4 La leggibilità: cosa si capisce e quando

- **Il Game Boy** tiene lo schermo pulito: un avviso alla volta, i comandi sulla pulsantiera. È la scelta giusta e va difesa.
- **Il profilo a tocco senza Game Boy** (il sito senza console, o il vecchio APK) ha tutto sullo schermo: soldi, obiettivo, «Cose da
  fare qui», minimappa, pausa, due levette, due pulsanti, tre icone. Appena saliti su un'auto, quattro scritte una sopra l'altra al
  centro: «Scendi dall'auto», «Sergio ti ha visto.», la scheda «AL VOLANTE» con quattro suggerimenti, il nome del mezzo.
- **Il primo minuto**: tre schede di testo, poi «Trova Lupo», poi una chat che ferma il mondo (sul telefono: tastiera e pannello),
  poi una commissione da portare. Nessuna azione nei primi due minuti. Un film d'azione apre con un'immagine e un movimento.
- **Gli avvenimenti** arrivano tutti con lo stesso peso: un passante che ti vede ferma il tempo con la stessa forza di
  un'uccisione. Senza gerarchia non si capisce cosa conta.

### 2.5 La fluidità sul telefono

Dalle note (SwiftShader col processore rallentato 4 volte; nessun numero da un telefono vero):
- circa 545 disegni, 1,1 milioni di triangoli, 109 programmi a fotogramma; il collo di bottiglia è il processore (three.js e WebGL
  ~55%, l'ombra del sole 9%, i raggi del braccio della camera 10%);
- **i cicli dei moduli lavoravano anche nei giri saltati**: col tetto a 30 su uno schermo a 60, graffiti2, tetti, sottosuolo e i
  moduli unico_* facevano il loro lavoro in un giro su due che non si disegna: il doppio del lavoro per fotogramma;
- ombre del sole a 15 o 10 Hz e persone lontane animate a 15 o 10 Hz senza interpolazione: a 30 fps si vedono a scatti;
- il raccoglitore della memoria: pause da 0,3-0,66 s ogni 1,5-3 minuti, heap ~900 MB;
- l'avvio: la prima volta l'APK scarica tutta la città prima di giocare; poi ~40 s su SwiftShader.

### 2.6 Il mondo, la luce, i graffiti, le animazioni

- **Il level design** del borgo è studiato (MASTERPLAN, URBANISTICA) ma la camera non lo mostra: dall'alto a 34° si vedono strade e
  selciati, non scorci, sbocchi, fondali. La camera e l'urbanistica vanno progettate insieme: ogni slargo ha la sua inquadratura.
- **Il graffito sul muro.** La cornice gialla sta al centro dello schermo e il raggio di lì prende il muro o la terra a seconda della
  distanza (1.6 ha aggiunto il tasto Muro/Terra). La causa vera è la camera: a 34° il centro dello schermo guarda il selciato davanti
  a te, e il muro sta in alto, piccolo e di sbieco.
- **Le animazioni**: la corsa al 72% al posto del passo; il pugno è una mossa procedurale di 0,35 s senza anticipo né arretramento;
  chi prende un colpo vacilla ma non arretra.
- **La luce**: le ombre del sole a metà frequenza sul telefono sono la sola luce viva che scatta. Il tratteggio e l'aria (1.6) sono
  la firma del gioco: vanno tenuti, ma con la regola che il segno non deve tremare.

### 2.7 Il codice

- 184 moduli, ~130.000 righe senza librerie e prove; `render.js` 21.000 righe.
- 220 interruttori nell'indirizzo; 119 tengono in vita «com'era».
- 341 etichette di lavori diversi nei commenti.
- La camera ha avuto tredici strati; sui mezzi girano ancora.

Il metodo (un intervento piccolo, un interruttore, una tavola) è sano per non rompere niente. Ma senza un momento in cui le versioni
vecchie si tolgono, il codice cresce in larghezza e ogni fotogramma attraversa i rami di tutti. Proposta: **ogni interruttore «no…» ha
una data di scadenza**; approvato il lavoro, alla fase successiva il ramo vecchio si toglie.

---

## 3. Il primo intervento (questo ramo): la regia

Un modulo nuovo, `src/cinema.js` (fuori dall'impronta dei tasselli), e poche righe nei punti giusti. Tutto si spegne con
`?nocinema`; ogni parte con il suo interruttore.

| Parte | Cosa fa | Dove | Interruttore |
|---|---|---|---|
| **Il tempo pieno** | il fotogramma lungo si divide in passi da 50 ms (al più 3): il mondo va col tempo vero fino a ~7 fps; se il motore costa più di 14 ms a passo, un passo in meno | `main.js` loop0, `Cinema.passi` | `?nocinema_tempo` |
| **La tensione** | un numero da 0 (pace) a 1 (azione) letto dallo stato: polizia che insegue, gente che ti combatte vicino, colpi sparati e presi, ferite, velocità del mezzo, corsa. Sale in 0,35 s, tiene 2,5 s, scende in 3,5 s | `Cinema.tick` | — |
| **La camera calma e d'azione** | a piedi i numeri di camera7 vanno da CALMA (braccio 10,6 m, 31°, lente 44°, ricentro lento) ad AZIONE (7,6 m, 24°, lente 55°, ricentro svelto, sguardo avanti 2,6 m) | `Cinema.k7`, `render.js` camera7Frame | `?nocinema_camera` |
| **Lo schermo in verticale** | nel Game Boy in verticale la lente scende da 80° a 70° (orizzontale minimo 48° invece di 62°) e il braccio si allunga del 15%: la stessa strada, meno deformata | `Cinema.k7` | `?nocinema_camera` |
| **Il nemico nel quadro** | con la tensione, il punto guardato si sposta verso chi ti combatte più vicino (un quarto della distanza, al più 3 m): chi ti minaccia entra nell'inquadratura | `Cinema.tick`, `render.js` camera7Frame | `?nocinema_camera` |
| **La camera del muro** | con la bomboletta in mano: braccio 6,2 m, 13°, lente 50°: si guarda la parete, la cornice gialla cade sul muro | `Cinema.k7` | `?nocinema_camera` |
| **Il corpo della camera** | il trauma (colpi, urti, ferite, esplosioni) scuote la camera in rotazione; la lente pompa a ogni colpo sparato e si stringe a ogni colpo preso; rollio negli urti forti | `Cinema.dopo` | `?nocinema_scossa` |
| **I passaggi** | salire, scendere, cambiare vista: la camera passa dalla posa di prima alla nuova in 0,75 s (posizione, rotazione, lente); la vista da inseguimento arriva in ~0,8 s invece di ~2 | `Cinema.dopo`, `render.js` | `?nocinema_passaggi` |
| **Niente bande guidando** | via la cornice 4:3 | `render.js` U.pillar | `?nocinema_cornice` |
| **Il pugno che arriva** | 50 ms di fermo (100 se lo stendi), scossa, chi lo prende arretra di mezzo metro; Picchia fa il passo verso il bersaglio scelto se è fuori portata | `game.js` fire, `main.js` picchia | `?nocinema_colpi` |
| **La levetta pronta e il passo vero** | corsa piena all'85% della spinta, curva meno piatta (a metà ~3,2 m/s), rampa dimezzata (0,35 s a piedi, 0,9 in auto); coi tasti il passo è 4,6 m/s (la corsa al 92%, che si legge come un'andatura) | `main.js` levMag, `game.js` muovi7 | `?nocinema_passo` |
| **Le giunte** | lungo un muro di più caselle il lato comune non è uno spigolo: si scivola | `game.js` scivola7 | `?nocinema_scivola` |
| **Il varco di lato** | spingendo contro un muro, se entro 1,6 m di lato la via è libera ci si scivola verso di lei (da 1,2 m/s a metà del passo, dopo 0,1 s) | `game.js` aggira | `?nocinema_scivola` |
| **Le scale** | sulla rampa la levetta che sale o scende va lungo i gradini; contro il corrimano si scivola verso la cima o il piede | `game.js` asseScala, aggira | `?nocinema_scivola` |
| **La BMX che gira contro il muro** | con la levetta indietro la bici si gira sul posto (con un saltello indietro se il muso è nel muro), poi riparte | `game.js` driveVehicle | `?nocinema_scivola` |
| **La gerarchia dei fatti** | il rallentatore dei testimoni solo per i fatti grossi (omicidio, ferimento, rapina, esplosione, investimento, molotov); scippi, graffiti e auto rubate si scrivono e basta | `game.js` emit | `?nocinema_momenti` |
| **I giri saltati** | graffiti2, tetti, sottosuolo, unico_cose, unico_segni, unico_parti_vivo, unico_strada non lavorano nei giri che non si disegnano | i loro cicli, `Cinema.saltato` | `?nocinema_giri` |

### 3.1 Le misure

La sonda degli incastri, stessi 250 punti e stesse spinte (`node strumenti/sonda_incastri.js 250 7`, prima con `NOCINEMA=1`):

| | 1.6.1 | con la regia |
|---|---|---|
| spinte ferme (meno di 0,35 m) | 2,8% | **2,0%** |
| ferme anche se la direzione accanto va lontano | 2,5% | **1,8%** |
| spinte che strisciano (0,35-1,2 m) | 5,0% | **3,5%** |
| sulle scale, fermi a metà rampa | 1,4% | **0%** |

Le spinte ferme che restano sono quasi tutte **dritte contro un muro lungo** (71 su 80 alle direzioni 0°, 90°, 180°, 270°, i muri
della griglia) o dentro un angolo chiuso: è il «completamente dritto» che il committente accetta. Nel gioco vero la camera è girata
di un angolo qualunque e una spinta esattamente perpendicolare è rara.

`node src/test_cinema.js`:
- a 8 fps tre passi da 40 ms: il mondo va col tempo vero (prima 50 ms ogni 120: il 42%);
- di sbieco (22°) contro il muro della Vittoria: prima 0,04 m in 1,5 s, ora 4,75 m;
- sulla scala, di traverso contro il corrimano: prima 0,12 m, ora 3,13 m lungo i gradini;
- la BMX col muso nel muro e la levetta indietro: girata (scarto 8°) e ripartita;
- il pugno: 50 ms di fermo, scossa 0,3, spintone 3,2 m/s;
- la tensione: con la polizia dietro arriva a 0,85 in 1 s, tiene 2 s, torna a 0 in 12 s.

Le prove di prima (`test_controlli8`, `test_comandi6`, `test_guida2`, `test_pedonale`, `test_bmx`, `test_camera7`, `test_camera9`,
`test_scontri`, `test_skate`) passano senza e con la regia. Due prove dicevano i numeri di prima (il passo a 3,6 m/s, fermi contro il
muro): ora sanno della regia.

### 3.2 La tavola

`_immagini/da_fuori/` (la 1.6.1 e questo ramo, nel Game Boy, sul telefono simulato): vedi §6.

---

## 4. Il punto d'arrivo

**Un gioco con due registri e un regista.**

- **La pace** è la passeggiata nel paese. Camera più lontana e un poco più bassa, lente lunga, movimenti lenti, il ricentro che non
  si sente. Il fondale c'è: il mare, la collina, il Santuario, il tramonto. Niente scritte: le cose da fare si vedono nel mondo (una
  persona che ti fa un cenno, una saracinesca alzata, un muro libero illuminato). Il suono è il paese.
- **L'azione** arriva in mezzo secondo. La camera si avvicina e si abbassa, la lente si apre, chi ti minaccia entra nel quadro (il
  regista sposta il punto guardato tra te e il nemico più vicino). Ogni colpo ha peso: il fermo, la scossa, la lente, il suono. I
  momenti grossi (un'uccisione, un'esplosione, il primo inseguimento) hanno il rallentatore. Gli altri no.
- **Il regista** è uno solo (`cinema.js`), e decide il tempo, la camera, i passaggi, le scosse, la gerarchia delle scritte (un
  avvenimento alla volta, il più importante) e la musica. Tutti gli altri moduli gli dicono cosa succede; nessuno muove la camera o
  ferma il tempo da solo.
- **Il corpo** non si incastra mai senza volerlo: scivola attorno agli ostacoli, sulle scale finisce sopra o sotto, in bici gira contro
  il muro. La risposta è immediata.
- **Il level design si vede**: ogni slargo del masterplan ha un'inquadratura di riferimento (dove guarda la camera quando ci entri),
  i landmark sono nel quadro, gli scorci si aprono.
- **Il graffito** si fa davanti a una parete vista di fronte: la camera del muro, la cornice sulla parete, la tavoletta. Si capisce
  dove va, prima di cominciare.
- **Sul telefono** il gioco tiene 30 fps fermi (non 30 che oscillano fra 20 e 30), con l'avvio sotto i 15 s.

---

## 5. Le fasi

Ogni fase: un lavoro, una misura prima e dopo, una tavola, un interruttore che **scade** alla fase dopo.

| Fase | Cosa | Misura di arrivo |
|---|---|---|
| **F0 · Il telefono vero** | APK con `?perf`: fotogrammi, ms del motore e del disegno, `__ritmo`, `__fluidoTel`, `__tasselli`, `__cinema`, su due telefoni (medio e basso) | i primi numeri veri |
| **F1 · La regia** (questo ramo) | tempo pieno, tensione, camera calma e d'azione, camera del muro, passaggi, scossa, colpi, levetta, incastri, giri saltati | §3.1; la tavola; il giudizio del committente sul telefono |
| **F2 · La camera unica** | la camera dei mezzi dentro la regia (tensione, curve, inseguimenti: il punto guardato fra te e chi ti insegue), il dialogo con campo e controcampo, il nemico nel quadro, via CAM6/CALMA2/INQ4/RG5/BASSA; `?camera9` come base della pace | un solo ramo di camera in `render.js`; nessun salto nei passaggi |
| **F3 · Il passo fisso** | il motore a passo fisso (30 Hz) con l'interpolazione del disegno; le persone lontane e le ombre interpolate; materiali condivisi e atlanti per il costruito | 30 fps fermi sul telefono medio; metà dei disegni |
| **F4 · Il primo minuto e le scritte** | si comincia con un'azione (un inseguimento breve, una fuga sui tetti), la chat dopo; la gerarchia degli avvenimenti (un rallentatore solo per i momenti grossi); i suggerimenti dei comandi in basso, piccoli, uno alla volta | il primo colpo entro 30 s; mai più di una scritta al centro |
| **F5 · Il graffito** | la camera del muro più la parete di fronte (lo yaw sulla normale del muro scelto), la cornice che si vede sempre intera, un'anteprima prima di aprire | la cornice sul muro al primo tocco nel 95% dei muri |
| **F6 · Le animazioni** | il passo vero (clip della camminata fino a 3,5 m/s, corsa sopra), il pugno con anticipo e arretramento, chi prende un colpo arretra, le cadute | nessuna clip fuori dalla sua velocità |
| **F7 · La luce** | l'ombra del sole a frequenza piena vicino al giocatore, il tramonto e la notte come momenti di regia | niente luce che scatta |
| **Pulizia** | via i rami «com'era» delle fasi approvate | meno della metà degli interruttori |

---

## 6. Come provarlo

- Nel browser: l'indirizzo di sempre. `?nocinema` per la 1.6.1 così com'era; `?nocinema_camera`, `_scossa`, `_passaggi`, `_cornice`,
  `_colpi`, `_passo`, `_scivola`, `_tempo`, `_giri`, `_momenti` una parte alla volta.
- Dal vivo: `__cinema` nella console dice la tensione, il motivo, il trauma, il passaggio in corso; `Cinema.K` sono i numeri.
- Prove: `node src/test_cinema.js`; `node strumenti/sonda_incastri.js 250 7` (con `NOCINEMA=1` per la 1.6.1).
- L'APK: la regia tocca `game.js`, `render.js`, `main.js` e altri moduli dentro l'impronta dei tasselli: per l'APK con la città dentro
  i tasselli vanno ricotti una volta (`python3 build.py --tasselli`).
