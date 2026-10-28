# Porto Vecchio — Graffiti col pennello dello Studio (7 ottobre)

I graffiti si fanno col pennello dello Studio (lo strumento «Colore» di editor.js, ramo charming-gates): si dipinge
davvero sulla texture della superficie colpita, con la misura bloccata da bomboletta (fra 2,5 e 9 cm). Niente riquadri
appiccicati: la vernice entra nella facciata. Righe `[graffiti]` e `[bombolette1]`.

## Gli abitanti: decide l'IA (graffiti.js)
- Chi parte per dipingere (commissione `passo` per una scritta, `murale` per un'opera) prepara subito il disegno: uno
  locale (scritta in stampatello a tratti + un simbolo che dice chi è: l'onda della Risacca, il Garante con le orecchie
  d'asino, la barca del pescatore, un cuore, una stella…) e intanto chiede all'IA (`/api/mente`, kind `graffito`) cosa
  dipingerebbe quella persona, col suo carattere, umore, ricordi, interessi, odio per il regime. Se l'IA risponde prima che
  arrivi al muro, si dipinge quello dell'IA (testo + tratti liberi in metri sul muro).
- Arrivato al muro, il graffito entra in `st.pop.walls` con i tratti (`strokes`: u lungo il muro, v in altezza, colore,
  spessore). Se il giocatore è vicino lo vede crescere tratto dopo tratto mentre la persona spruzza; se no compare intero.
  Alla fine `paintWall` (popolo.js) lo completa (evento, testimoni, reazioni) invece di farne un altro.
- Se il regime cancella il muro, la facciata torna com'era (gomma dalla copia della texture prima del primo spruzzo).
  Se il quartiere viene ridisegnato, il graffito si ridipinge.

## Il giocatore: la bomboletta (main.js)
- La bomboletta (ferramenta, officina) si impugna dalle Tasche come gli altri attrezzi. In mano, il tasto sinistro tenuto
  premuto spruzza sulla superficie sotto il puntatore, entro 2,6 m (non si cammina col clic). Rotella: colore (rosso, nero, bianco, blu, giallo, verde, rosa, arancio).
- Una bomboletta dura circa un minuto di spruzzo. Chi ti vede dipingere lo sa (evento `vandalismo`).

## Pezzi
- `src/graffiti.js`: font a tratti, simboli, disegno locale, richiesta all'IA, muro in corso.
- `strumenti_inverno/bombolette1.py` (dopo trame1.py): in render.js porta `surfaceAt`/`dab` dello Studio
  (bmbHit, bmbDab), dipinge i tratti dei muri (bmbPass), `R.spray` per il giocatore; i muri con i tratti non hanno più
  il riquadro di muri_gente2.
- `server.js` kind `graffito` (canale eventi); `api/_mente.js` rigenerato.
- Non toccati: casa, scavi, baracche, mobili (progettati altrove).

## Avvicinamento e gesto (aggiunto)
- Chi dipinge va fino al muro scelto partendo (`E.spot`, non dove si è fermato arrivando nel posto), a mezzo metro (la
  grafica misura dov'è davvero il muro: `w.__wallD`), si gira, e solo allora comincia a spruzzare; mentre dipinge si
  sposta di lato seguendo la scritta (`w.__tipU`). La commissione cominciata non viene interrotta dal blocco dopo.
- La posa «vernicia» porta la mano sul punto dove va la vernice (`w.__tip` / `player.__tip`), gli occhi sul tratto.
- Il giocatore spruzza a portata di braccio (1,2 m); un muro più lontano (entro 9 m): ci si cammina davanti e poi si spruzza.

## Il distributore (distributore1.py)
Era una scatola bianca: pensilina, pompe e totem avevano le coordinate della vecchia mappa. Rifatto attorno all'edificio vero.

## Graffiti 2 (19 ottobre): i muri dipinti fin da subito, la tavoletta completa
**Perché all'avvio non si vedeva niente.** La storia dei muri c'era (`writer_vita.js history`: ~740 lavori in `st.wr.works`,
non dipende dal numero di abitanti: bastano i writer, 9 su 207), ma la grafica li costruiva a goccia: un lavoro per giro di
150 ms, solo quando il budget `BUD` (`window.Costruzioni`) dava il turno ai graffiti (uno ogni 4 fotogrammi) e poi
aspettando il disegnatore a parte. Su una macchina lenta (o senza scheda video: 0,3 fotogrammi al secondo senza testa) dopo
15 s c'era un lavoro in coda e nessuno sul muro, e se il worker non rispondeva non arrivava mai niente.
- `writing.js scanNear` (fuori da `frame`): **di corsa** all'avvio, dopo un salto della camera di più di 60 m e quando entro
  40 m ci sono meno di 12 lavori dipinti: 30 ms per giro, senza aspettare il turno del budget, fino a 24 disegni in coda al
  worker (di regola 6 ms, col turno, 8 in coda). `scanNear(st, x, y, { force: true, ms })` per le prove.
- `artFor`: se il worker non risponde in 4 s il disegno si fa nel gioco (in coda, uno per giro); se non ha mai risposto e ne ha
  persi 3, si spegne (`[Writing] il disegnatore a parte non risponde`).
- I veli nuovi si disegnano subito (`drawUpTo` appena fatti).

**La tavoletta (tasto 7, o B fino a «tavoletta»).** Si tiene premuto su un muro entro 14 m (più in là: «avvicinati») e si
trascina la finestra gialla; lasciando, la foto dritta del muro si apre nel pannello: in cima dove sei, la misura e che
lavoro diventa (tag, throw-up, pezzo; col pennarello tag a marker), quante bombolette hai; gli otto colori in vista (anche
tasti 1-8), spessore, «Annulla tratto» (Ctrl+Z), «Pulisci», «Salva sul muro» (Invio), «Esci» (Esc). Senza bombolette (o
pennarello) non si salva. Salvato, il disegno va **subito** sul muro (`saveOnWall`, non aspetta il giro dei graffiti).

**La città reagisce** (`cityReact`, da `finish` per ogni lavoro tuo, bomboletta o tavoletta): i nomi di chi ti ha visto
(`G.seesPlayer`, entro 24 m); un agente che ti vede ti ferma a voce, +5 al calore e `vandalismo` (i Grigi ti cercano); un
writer o un toy approva (+fama); un passante commenta, e a volte va a chiamare i Grigi. Vicino ai palazzi del regime
(governo, ministero, Garante, commissariato, Rocca, chiesa…) il lavoro si cancella quasi sempre la mattina dopo, quelli visti
da un agente una volta su due; la mattina il feed dice cosa ti hanno cancellato.

Prove: `test_writing.js` (agente che vede, nessuno che vede, muro del regime cancellato). Senza testa i giri dei graffiti
seguono i fotogrammi (qui 5 s l'uno): per le foto si chiama `Writing._.scanNear(..., { force: true })`.

## Graffiti 3 (20 ottobre): il ventaglio della strada, i verticali sui palazzi, le zone calde, le curve vere
**Perché sembravano fatti al computer.** L'alfabeto a tratti (`Graffiti.F`, sei segmenti per una C) veniva stroked com'era:
triangoli nelle curve di tag piccole, firme, slogan e pezzi semi/wild. E le lettere a blocchi tonde (O, D, C, G) erano barre coi
smussi a triangolo. Più le stelline a otto punte da clipart.
- `writer_arte.js smoothK` (Chaikin con gli spigoli veri conservati, sopra i 60°): passa da `path()`, quindi da tutto quello che
  usa `pass()`: lettere, `smallTag` (firme, anno, slogan), scritte.
- `blockGlyph`: O, 0, C, D, G, Q, U, J e le pance di B, P, R sono anelli ad archi veri (`RR`, 7 segmenti per quarto) con i buchi
  (`pl.hole`, tolti dalla maschera in `fillPolys`). Le altre restano barre: i blockbuster sono squadrati.
- `sparkle`: due passate corte a croce col capo tondo e un punto, non la stella.
- Il wildstyle era un bubble squadrato: `wild` e `spiky` (e metà dei `semi`) con mano sopra .4 vanno dal motore a tratti
  (frecce, punte, incastri, il personaggio, prima raggiungibile solo dal corsivo). Famiglia nuova `tridi` (il 3D style: niente
  contorno, blocco profondo con tre ombre, lettere che si toccano; `FAM.tridi.solid` dentro `blockArt`).

**Tre difetti veri trovati per strada.**
- Il disegnatore a parte (il worker: solo writer_mano.js e writer_arte.js) non aveva `Graffiti.F`: firme, anno, slogan e le
  lettere dei pezzi semi/wild uscivano vuoti quando disegnava lui. Ora `FONT()` ripiega sulle maiuscole dritte di `WriterMano.A`.
- `cloud` era definita due volte (le bolle degli sfondi e la nuvola dei pezzi): vinceva la seconda e ogni lavoro con sfondo
  `nuvola` andava in errore (`L.forEach is not a function`) e restava `gfxFail`. La prima si chiama `cloudBlobs`.
- `col instanceof HTMLCanvasElement` nel worker lancia (lì esiste solo OffscreenCanvas): **tutti i pezzi a blocchi** fallivano di
  là e si ridisegnavano nel gioco, i più pesanti (un secondo l'uno). Ora `isCanvas(o)` guarda `getContext`.

**Gli stili nuovi** (`writer_arte.js`, sezione «GLI ALTRI STILI DELLA STRADA»; scala in `writing.js STYLES`, con `over` per
quelli che vanno sopra a tutto senza contare come crossaggio; misure di partenza in `WriterArte.DEF`):
| stile | misura | dove | note |
| --- | --- | --- | --- |
| `rullo` | 9 × 2,4 (una o due righe, spezza allo spazio) | hall, cima dei palazzi (heaven), facciate larghe | pieno con contorno, ombra staccata, o solo contorno; trama del rullo, colature grosse |
| `verticale` | 2 × fino a 9 (alto quanto la facciata) | `facciata` (fianchi liberi dei palazzi da due piani) | `fam` rullo / bolle / pixo (le aste spigolose di San Paolo, nere o bianche) |
| `estintore` | 3 × 4, centro a 3,4 m | facciate, sottopassi | handTag a spruzzo grasso, nebbia larga, schizzi, colature per metri |
| `stencil` | 1 × 1,1 | strada, sottopassi | 19 soggetti: sagome a un colore (bici, pesce, pugno, tv, ratto, stella, ancora, bomboletta, l'asino del Garante, l'occhio) e i personaggi ridotti a mascherina (`stencilize`: soglia di luce + ponticelli); didascalia a blocchi; a volte un secondo strato colorato; lo stesso writer ripete sempre la sua (`motifSeed`) |
| `scritta` | 4,5 × 0,75 | strada, Muro, sottopassi | politica / amore / ultras / strada (`SCRITTE`), pennello a tre passate, rullo o spray; l'A cerchiata, il cuore, la stella; chi è politico (`dna.pol`) scrive di politica |
| `manifesto` | 1,2 × 1,4 | strada | 1-3 fogli con slogan (`MANIFESTI`), volto a mascherina o retinatura; carta ingiallita, pieghe, colla, strappi e pezzi mancanti |
| `adesivi` | 0,6 × 0,5 | strada (altezza d'uomo) | 5-13 slap: «ciao mi chiamo» con la tag a marker, i tondi delle crew, ovali, facce; sbiaditi, con l'angolo che si stacca |
| `murale` | 6,5 × 4 | hall, Muro | cinque scene alla Orgosolo (pesca, volti, pugni che rompono il muro, bici, isola col faro): campiture piatte, contorni neri, figure col fazzoletto o il berretto, la fascia con la frase (`MURALI_TXT`) |
| `calli` | 4,2 × 2,2 | hall, strada | pennellessa larga (`STILI.calli` + `chisel`) su fondo a rullo, pennellate che accompagnano, schizzi |

**Dove stanno** (`writing.js placeWall`): la misura può venire dal lavoro (`w.W0`, `w.H0`, dal sito via `writer_vita sizeFor`),
la quota del centro dal sito (`sp.h`) o ad altezza d'uomo (`EYE`, dal seme). `SMALL` (tag, gotico, estintore, stencil,
scritta, manifesto, adesivi) va sopra a tutto. Siti nuovi in `writer_vita.js buildSites`: `facciata` (fianco libero di un
palazzo alto almeno 7 m: `h` centro del verticale, `Hv`, `gh`, `top`, la scala `L` se c'è).

**Le zone calde** (`writer_vita.js DENSE`, `denseAt`): cantiere, scalo, discarica, magazzini, varco, Muro, caruggi, vicoli,
calata, flipper: lì il peso dei muri è ×2,5, i lavori grandi si stringono (`MIND` ×.55), le hall of fame sono **produzioni**
(pezzi della stessa crew uno accanto all'altro, con tag e adesivi sotto) e sui palazzi i verticali stanno fianco a fianco ogni
2,6 m. La storia parte da 1350 lavori (era 820): in una partita circa 140 verticali, 40 rulli, 20 estintori, 65 stencil, 55
scritte, 70 adesivi, 30 manifesti, 15 calligraffiti, 10 murali, oltre ai soliti.

**Le notti**: `planNight` ha l'uscita `facciata` (verticale dal tetto con la scala, come l'heaven spot; senza scala l'estintore
da terra); `styleFor` mette murali, calligraffiti e rulli nelle hall, scritte e stencil per strada; il bombing porta anche
mascherina, adesivi, colla.

**La galleria** (`strumenti_inverno/galleria_graffiti.js out.png "stile:fam:tavolozza:seme:W:H:parole,..." [colonne] [ppm] [1|2]`):
disegna ogni lavoro con `WriterArte.art` senza il gioco; `1` senza `Graffiti.F` (come era nel worker), `2` dentro un vero
Web Worker come nel gioco. È il modo per guardare gli stili da vicino prima di toccare la città.

## Graffiti 4 (22 ottobre): l'inchiostro, dai fogli di riferimento e dalle foto dei muri
Dopo «Graffiti 3» i lavori sembravano ancora generati: lettere da font, contorni tutti uguali, colori da giocattolo. Riferimenti
usati: le foto di Wikimedia Commons (Roma, Bologna: pezzi sui muri antirumore, hall of fame, throw-up) e i fogli da blackbook
mandati da Andrea (throw-up a bolle, pezzi semi-wild e wildstyle). Cosa li rende veri, e come è fatto ora (`writer_arte.js`,
sezione «L'INCHIOSTRO»):
- **La gerarchia delle linee** (`inkRender`): il contorno esterno grosso, più grosso in basso a destra; le linee interne sottili
  (dove una lettera passa sopra l'altra: ogni lettera ha il suo anello sottile, disegnato da dietro in avanti, la sinistra sta
  sopra), i tagli e i buchi che si assottigliano (`taperLine`). Le lettere sono una massa sola.
- **Ombra e 3D**: l'ombra piatta spostata (throw-up) o il 3D estruso che scurisce (pezzi), fusi col contorno; il **bordo da
  sticker** (bianco o chiaro, a volte col filo scuro) attorno a tutto; dietro, a volte, l'esplosione o la nuvola a bolle coi
  puntini (dentro il riquadro: il bordo del velo sfuma, niente tagli dritti).
- **Il riempimento** (`inkPAT`, un colore solo sotto tutte le lettere): ombra (la parte bassa scura tagliata da un'onda, a volte la
  luce in alto), sfumato con la grana, tratteggio da pennarello ordinato, liquido con le bolle, puntini, macchie, strisce, mattoni.
- **Le luci**: archetti bianchi sottili sui lobi col puntino (throw-up); nei pezzi la riga di luce spezzata lungo i bordi alti, due
  tagli bianchi paralleli per lettera, le stelle a raggi sottili.
- **I dettagli**: colature col contorno (fanno parte della forma, `dripMask`), asterischi a inchiostro, aureola, linee di velocità,
  mini-tag dentro una lettera, la crew e l'anno a pennarello sotto.
- **Le tavolozze** (`inkScheme`): un colore pieno saturo da cui nascono ombra, luce, ombra portata, bordo; la throwie classica nera
  o bianca, il cromato; una volta su tre le tavolozze dei muri veri (`REAL`, dalle foto: salmone, grigio-azzurro, lilla, menta...).
- **Le lettere**: throw-up e bolle sulle bolle di sempre (`BUB`) ma più strette e sovrapposte (`bubbleInk`); i pezzi block, heavy,
  piatto, 3D a blocchi con gli archi veri (`pieceInk`); semi, wild, a spine, astratto e corsivo **a pennellata**
  (`brushLetters`): lo scheletro ripassato con la punta a scalpello (aste grosse, traverse sottili, estremità svasate tagliate di
  sbieco; nel wild a punta), le lettere che si sovrappongono, il pezzo che riempie l'altezza del muro.
- **La resa** (`handify`): col motore a inchiostro la mano trema meno e il bordo resta netto (`crisp`); la vernice è un filo spenta e
  a passate (il muro si vede sotto le passate scariche); i lavori vecchi della storia (`w.old`) sono sbiaditi, rigati dalla pioggia,
  scrostati (`age`).
- Il verticale a bolle passa dallo stesso inchiostro (`stackedBubbleArt` → `bubbleInk` con la disposizione già fatta).
- Restano ai motori di prima: tag e gotico (`writer_mano.js`), il mostro, il whole car (che però disegna il suo pezzo grande con
  `art` e quindi con l'inchiostro), rullo, pixo, estintore, stencil, scritte, manifesti, adesivi, murali, calligraffiti.
- Tolti dai testi «Porto Vecchio» e «Risacca» (nomi provvisori): murali, scritte, manifesti, slogan, parole dei pezzi.

Galleria: `NPC=1 node strumenti_inverno/galleria_graffiti.js out.png "pezzo:-:8:201,throw:-:7:202" 4 80` disegna i lavori come li
pensano gli NPC (il campo tavolozza diventa la mano ×10); con `2` in fondo, dentro un vero Web Worker come nel gioco.

### Graffiti 4, seconda passata («di più»)
- **Personaggi a inchiostro** (`cartoon`): il ragazzo col berretto di lana e gli occhiali tondi, il mostro con l'occhio solo e i
  denti, la bomba arrabbiata con la miccia, la bomboletta con l'occhio che cola. Campiture piatte, mezzaluna d'ombra, contorno
  grosso, luce bianca. Stanno accanto ai throw-up (una volta su sette), ai pezzi (una su otto) e ai burner (una su tre); lo stile
  `mostro` (il personaggio da solo) ora è uno di loro con la nuvola o lo schizzo dietro (`characterArt`, prima `monsterArt`).
- **Le lettere dentro gli oggetti** (`objectBG`): la bomboletta coricata (fondo a coste, tappo, ugello), la sigaretta (filtro a
  puntini, brace, fumo); la bomba con la miccia accesa sull'ultima lettera; la corona di punte nere (`crownSpikes`).
- **Dentro le lettere**: gli occhi con le venette e la palpebra, gli scarabocchi (x, +, =, cuore, puntini, asterisco).
- **Attorno**: l'alone spruzzato morbido (`aura`), il contorno doppio colorato fra le lettere e il nero (`dbl`), la linea
  tratteggiata da sticker (`dash`); nei pezzi il riempimento `taglio` (due colori lungo una diagonale con la riga bianca).
- `fixInk`: la linea si vede sempre (inchiostro scuro su riempimenti chiari, chiaro su quelli scuri).
- **Le tag**: colori veri (quasi sempre nere, argento, bianche; a volte rosse, blu, un colore acceso) e la mano a scalpello per due
  writer su tre (aste alte, contrasto, colature: la mano «a movimento» sembrava stampatello); niente più tag tagliate in cima.

### Graffiti 4, terza passata: le lettere dai font veri
Le lettere costruite qui (bolle `BUB`, blocchi, scheletri a pennellata) restavano primitive per quanto si rifinisse la resa. Ora
la forma della lettera la dà un **font disegnato da una persona** (liberi: OFL 1.1 e Apache 2.0, da Google Fonts, ridotti alle
lettere latine; licenze in `assets/fonts_graffiti/licenze`, elenco in `assets/fonts_graffiti/LEGGIMI.md`).
- `strumenti_inverno/fonts_graffiti.py` → `src/fonts_graffiti.js` (base64, circa 930 KB). La pagina li carica come FontFace
  (`WriterArte.fontsReady`); al disegnatore a parte arrivano **con un messaggio** (`artWorker` manda `{ fonts }`), non copiati nel
  suo sorgente; il worker aspetta i font prima di disegnare. Finché i font non sono pronti si disegna coi motori di prima.
- **Tag** (`fontTagArt`): la mano del writer sceglie il suo font (Sedgwick Ave Display, Sedgwick Ave, Permanent Marker, Rock
  Salt, Mansalva, Marck Script, Lacquer, Knewave, Covered By Your Grace; col pennarello anche Reenie Beanie), maiuscole o miste,
  la prima lettera grande, l'inclinazione, l'altezza, la sovrapposizione, il rimbalzo: sempre gli stessi per lui. Lo spray con
  l'alone, a volte col contorno; le colature dalle lettere; la riga sotto a punta, la corona, l'aureola, l'asterisco, le virgolette
  secondo la sua mano. Le firme registrate nello studio vincono ancora su tutto.
- **Throw-up** (`bubbleInk`, quattro su cinque): Modak, Sniglet, Chewy, Freckle Face, Kavoon, Titan One, Luckiest Guy, Londrina
  Solid; le lettere storte, di misure diverse, molto sovrapposte e **gonfiate** (si fondono in una massa sola); i buchi e le
  rientranze che il gonfiaggio chiude tornano come **tagli d'inchiostro** dentro la bolla (`fontMasks(...).cuts`).
- **Pezzi** (`pieceInk`, tre su quattro): Knewave, Shrikhand, Bangers, Ranchers, Shojumaru, Carter One, Rubik Wet Paint, Kavoon,
  e le **mani da tag ingrassate** (Sedgwick Ave Display, Permanent Marker, Knewave): il pezzo «dalla tag», coi suoi tagli dentro.
- Galleria: aspetta i font (`?nofont=1` per vedere i motori di prima); in modalità worker manda i font al worker come il gioco.

### Graffiti 4, quarta passata: l'affinamento su tutti e il murale nuovo
- Le scritte piccole e accessorie passano dai font (`fontText`): la tag piccola dentro i pezzi, il rullo (`F_ROLL`, a celle o a una
  o due righe), l'estintore (`extinguisherFont`, alone e colature), la scritta politica (`scrittaFont`), la calligrafia
  (`calliFont`, pennino largo `broadNib`), il gotico (`goticoFont`), le bolle in verticale (`stackedFontBubble`), le scritte di
  stencil, manifesti e adesivi. Il pixo ha il tratto più pesante e quasi sempre nero.
- **Il murale** (`muralModern`) non ha più personaggi da cartone, tramonti né striscioni con lo slogan: è la composizione di un
  muralista su una tavolozza studiata di cinque tinte (`MPAL`), a campiture piatte col rullo e il nastro, firmato piccolo in basso:
  `bauhaus` (la griglia di cerchi, mezzelune, quarti, righe e puntini con una forma grande che la rompe), `onde` (le squame a
  ventaglio e il sole tagliato dalle righe), `ottico` (righe nere, la fascia a gradini di colore, i quadratini che si sciolgono),
  `fasce` (il nastro di fasce che corre dritto e piega giù, la supergrafica anni '70), `parola` (una parola sola, enorme, in un
  font pieno, con l'ombra lunga a 45 gradi e la metà alta in un'altra tinta). Il tipo lo sceglie il seme, o `w.mkind`; in
  galleria si forza col campo fam (`murale:fasce:6:821`). Senza font si torna al `muralArt` di prima.

### Graffiti 5 (23 ottobre): via quello che faceva «cringe»
Il problema non erano le lettere ma il contorno: pupazzi da clip-art, slogan, parole da poster, brillantini.
- **Niente personaggi accanto** a throw-up, pezzi, burner e treni (`who = null`; il treno ha di lato solo il throw-up della crew).
  Lo stile `mostro` resta nel gioco ma i writer NPC non lo scelgono più da soli (`writer_vita.js`).
- Il throw-up ha al massimo le punte (una volta su cinque): niente bomba con la miccia, sigaretta, bomboletta, pupazzo.
- **Niente slogan sotto i pezzi** (`choose`/`conceive`: `slogan` solo se dato a mano). La voce politica resta nelle scritte, nei
  rulli, negli stencil, nei manifesti; sul Muro un pezzo su tre e mezzo può ancora dire una parola (`POLW`).
- Il burner dice il **nome del writer**, a volte quello della crew; non più SOLE, RADICI, DISGELO.
- Stelline e aureole: una stellina su quattro pezzi, l'aureola quasi mai, un asterisco su tre throw-up, il cielo senza stelle.
  Niente fondo a scoppio da fumetto: solo la nuvola, a volte.

### Graffiti 5, seconda passata: il gradino di mestiere
- **Il 3D in due toni** (`inkRender`, `o.tone2`): le facce di lato (i bordi delle lettere rivolti a destra, trascinati lungo la
  direzione del 3D) più chiare o più scure di quelle di sotto; sul 3D nero il lato è grigio scuro.
- **Le luci del writer** nei pezzi: non più le due righe diagonali da vetro, ma un colpo di bianco che segue il bordo alto a sinistra
  di ogni lettera e si assottiglia, col punto; la riga di luce spezzata (`rim`) solo una volta su tre.
- **La sfumatura a bande** (`inkPAT` 'bande', ora la più frequente): tre o quattro tinte orizzontali, il passaggio stretto e
  spruzzato, a volte la riga bianca fra due bande, la grana sul passaggio. Le macchie sfocate sono rare.
- L'alone sfocato attorno al pezzo quasi sparito (5% pezzi, 8% throw-up): resta il contorno chiaro netto.
- **Il nome si legge**: meno sovrapposizione nei pezzi (.03–.09) e nei throw-up (.1–.2, meno rotazione e gonfiaggio); le mani da
  tag ingrassate poco (la E non si chiude in una B); Modak e Sedgwick più rari; i throw-up quasi sempre dai font.
- Via anche le faccine, i cuoricini, le stelline e le aureole dentro e sopra i throw-up.
- La galleria scrive nell'etichetta con cosa sono fatte le lettere (il font, «pennellate», «blocchi», «bolle»): `A.font`.

### Graffiti 5, terza passata: la pulizia di tutti gli stili
- **Tag**: il colore pescato da un seme mescolato bene (prima tag vicine uscivano dello stesso colore, spesso rosa), e i pesi verso
  nero, argento e bianco; l'alone dello spray stretto (la tag resta netta).
- **Gotico**: via i riccioli sparsi attorno. **Calligrafia**: via le pennellate che attraversavano la parola; al loro posto, a volte,
  uno svolazzo dello stesso colore che esce dall'ultima lettera e torna sotto.
- **Stencil**: niente rettangolo grigio dietro, ma un velo di spruzzo attorno alla figura; i ponticelli corti (1–2), non righe che
  tagliano tutto; via le figure che uscivano a pezzi (bboy, banchiere, skater, grigio); il cerchio dietro mai dello stesso colore
  della figura. In galleria la figura si sceglie col campo fam (`stencil:bici:6:701`).
- **Manifesti**: il «volto» è un ritratto a retino (testa e spalle dai punti, la luce da sinistra, la fascia degli occhiali);
  il retino col punto di domanda è diventato il manifesto tipografico (una parola grande, il retino che sale dal basso).
- **Adesivi**: via quello con la faccina. **Pixo verticale**: il margine, le lettere non escono più dal muro.
- Nota per la galleria: le cose piccole (tag, adesivi) vanno guardate a ppm alto (`... 4 200 2`), altrimenti il canvas è di
  pochi pixel stirati e sembrano sgranate anche se nel gioco non lo sono.

### Graffiti 5, quarta passata: la materia e la mano del writer
- **La materia** (`handify`): la vernice prende la grana del muro da due campi di rumore correlato (la superficie fine, le chiazze
  delle passate) al posto del rumore pixel per pixel; nei pori dell'intonaco lo spray non entra (puntini d'ombra). La nebbia
  sfocata dietro il lavoro scende dal 75% al 32% (inchiostro 18%), quella larga dal 20% al 10%; l'overspray sono puntini fitti
  vicino al bordo che si diradano (`r() * r()`), più numerosi.
- **Il contorno netto**: il contorno esterno e la linea interna non sono più ruvidi (rough .3 → .06, .12 → .04): è la parte più
  pulita di un pezzo, fatta per ultima.
- **`graffitize`** sulle lettere dai font: il calcio che esce dalla prima lettera in basso a sinistra (attaccato al pixel più basso
  della lettera) e la freccia che parte dall'ultima in alto a destra, solo se c'è spazio nel riquadro. I tagli attraverso il nome
  sono stati provati e tolti: sembravano un cross.
- Via il tratteggio a righe che si aggiungeva da solo a un riempimento su tre (sembrava un filtro).
- Da valutare: la risoluzione dei lavori grandi (`PPM` 100 per metro, `TKS` solo per gli stili piccoli). Un pezzo di 4,8 m è largo
  480 px; da vicino nel gioco viene stirato. Alzarla a ×1,5 costa circa 2,25 volte la memoria di ogni velo e delle sue 4 tappe.

### Graffiti 5, quinta passata: le luci al loro posto
- **Le luci non attraversano più le lettere**: la riga di luce (`rim`) e i colpi di bianco dei pezzi si disegnano sopra tutto, quindi
  quelli della lettera dietro passavano sopra quella davanti (gli archi bianchi da vetro sui throw-up). Ora `inkRender` passa
  `vis(i)`, la parte visibile della lettera i (la maschera meno quelle davanti), e le luci stanno lì dentro.
- Via la mini-tag dentro una lettera del throw-up, e le due aureole rimaste al 3% (il numero casuale si consuma lo stesso, così il
  resto del lavoro non cambia).
- Riempimenti: niente più macchie sfocate né tratteggio nei throw-up e nei pezzi (anche quando la tavolozza chiede le macchie:
  diventano bande).
- I pezzi dai font quasi nove volte su dieci (il motore a blocchi procedurali è il meno leggibile).

## Graffiti 6 (26 ottobre): i pennelli, l'aderenza, quello che dipingi resta — riga `[graffiti]`
**I pennelli** (`src/pennelli.js`, tutti procedurali, niente pennelli scaricati): la bomboletta (nuvola di puntini a densità
gaussiana, overspray, speckle e splatter, colature dove la vernice si accumula, spessore che cala con la velocità), il fat cap e
lo skinny cap, il rullo (banda piatta, copertura irregolare, strisce del rullo che si asciuga, creste ai bordi, segni di
partenza e fermata), il pennarello (punta a scalpello, inchiostro che si raccoglie, colature sottili del mop), l'adesivo (la
tag a pennarello su un'etichetta, l'angolo che si stacca) e la GRANA del muro (intonaco, mattoni con le fughe, cemento coi pori,
pietra, metallo, legno) con l'età (sbiadisce, si scrosta). Tutti i numeri in tabelle in cima al file: `PENNELLI` (size, flow,
pressure, drip, grit, cap…), `SUPERFICI`, `USO` (che pennello usa ogni lavoro: tag skinny, throw-up fat, pezzi e burner spray,
mostro e roller a rullo, mtag pennarello, adesivo), `ETA`. `Pennelli.art(w)` = il disegno di writer_arte.js + il passaggio del
pennello su ogni tappa; lo usa il disegnatore a parte (il Web Worker, `pv-artworker` in index.src.html) e, senza worker,
writing.js. Lavori nuovi: lo stile `rullo` (le lettere a rullo: heaven spot e muri lunghi; dopo l'unione le disegna writer_arte.js, vedi sotto) e gli adesivi (`w.sticker`, un terzo
delle tag a pennarello). La tavoletta ha il pennello (bomboletta, fat cap, skinny cap, rullo, pennarello) e le manopole
(spessore, flusso, colature).

**L'aderenza** (writing.js `fitWall`, `onPlane`, `placeWall`): galleggiavano perché il muro si cercava con un raggio a 1,4 m
e poi il lavoro saliva o scendeva alla sua quota senza guardare se lì il muro c'era ancora (zoccolo, portico, insegna, facciata
a gradoni); la prova accettava 28 cm di scarto e 36° di normale; il velo stava a 1,4 cm più 4 mm a strato; finestre e porte non
contavano. Adesso il raggio va alla quota del lavoro, una griglia di raggi (~40 cm e i bordi) vuole lo stesso piano entro 1,5 cm
con cos > .97, sopra la terra al piede del muro e fuori dalle aperture vere (`R.aperture`, render.js: finestre, porte, vetrine,
la fascia dell'insegna, da `b.__win`), e il lavoro prende il rettangolo più grande tutto buono; il velo sta a 3 mm (più 1 a
strato, al massimo 7) col polygonOffset. Sui mezzi la decalcomania (`decalGeo`): i triangoli della carrozzeria dentro il
riquadro, tagliati, nello spazio del gruppo del mezzo (segue le curve, si muove col mezzo).
Misura: `Writing._.galleggia()` e `node strumenti/graffiti_sonda.js [cartella] --nome=dopo` (nel gioco vero, con le foto da vicino).

**Resta** (`salva`/`carica`, localStorage `pv.graffiti.v1`): i lavori tuoi con la chiave del posto (muro: casa:faccia:lungo:altezza
più centro e normale; mezzo: id, lato, lungo, quota; treno: vettura e lato). Tornano a ogni partita (anche ricaricando la
pagina), si rifanno uguali tornando vicino (il riquadro resta nel lavoro, non dipende dai settori), il mezzo sparito dal traffico
se li porta via e li riporta quando ricompare (stesso id). Al massimo 220: oltre i tre quarti i più vecchi sbiadiscono.
**Memoria**: le tele dei veli si riusano (pila per misura), a metà lato sul telefono (`LeggeraMem.meta2`), al massimo 170 veli
vivi (70 sul telefono): i più lontani si liberano.

**La tavoletta**: l'anteprima guardava il cielo perché vinceva qualunque faccia verticale sul raggio (anche dietro o sotto la
terra) e la finestra trascinata usciva dal muro. Adesso il muro dietro vale solo a un passo dal primo colpo, la finestra si
stringe alla superficie (`tavFit`), la camera (`tavCam`) sta lungo la normale a 3 m, puntata al centro, col margine del 4%
(per terra dall'alto, sui mezzi dal lato scelto: fianco o muso, dritto sull'asse del mezzo).
Prove: `node test_graffiti.js --seme=12345` (aderenza, decalcomania, lontano e ritorno coi modelli rifatti, ricarica in un
processo nuovo, memoria, tavoletta); con `--file=<writing.js di prima>` conta i galleggianti della versione di prima.

## L'unione (26 ottobre, ramo `unione-graffiti`): le lettere di Graffiti 3-5, i pennelli di Graffiti 6 — riga `[unione-graffiti]`
Due lavori fatti in parallelo: Graffiti 3-5 è COSA si dipinge (le lettere dai font, gli stili, la grana della vernice, via pupazzi,
slogan e brillantini), Graffiti 6 è COME ci va sopra (i pennelli, la grana del muro, l'aderenza, i mezzi, la memoria, la tavoletta).
- **Il disegno** lo fa sempre writer_arte.js (`WriterArte.art`); `Pennelli.art` ci passa sopra, tappa per tappa, solo quello che lui non
  fa, e meno (`Pennelli.SU_ARTE`): la grana del MURO dove sta il lavoro (`w.sup`: intonaco, mattoni con le fughe, cemento, pietra, il
  metallo dei mezzi) al 60%, la polvere del tappo al 45% (fat cap largo nei throw-up, spray nei pezzi, skinny nelle tag), le colature al
  50%, niente schizzi (prendevano il bianco del bordo e lo spargevano sulle lettere). La sua resa della vernice (le passate, i pori, la
  nebbia stretta, i puntini, le colature disegnate nella forma, il contorno netto) resta: è migliore della nostra sulle lettere piene.
- **Che pennello** (`Pennelli.USO`): tag skinny, tag a pennarello marker, throw-up fat, pezzi e burner spray, rullo e murale rullo,
  verticale a rullo rullo (gli altri verticali spray), estintore fat, stencil, scritte e calligraffiti spray, manifesti e adesivi carta.
- **Il rullo**: le lettere sono i font a blocchi del suo `rollerArt` (Bungee, Erica One...); il rullo nostro le passa (`rullata`: bande
  dall'alto in basso larghe 22 cm, con le strisce dove si asciuga e la spugna a buchini, al 60%). Il nostro `rollerArt` a tratti resta
  solo se writer_arte.js non riesce a disegnarlo. Lo stile `rullo` è il suo (9 × 2,4, rango 3, `writing.js STYLES`).
- **I lavori vecchi** della storia hanno già la loro età (pioggia, crosta: `handify age`): i giorni sul muro dei pennelli contano dal terzo.
- **Il disegnatore a parte**: writer_mano.js + writer_arte.js + pennelli.js; riceve i font con un messaggio, li aspetta, poi `Pennelli.art`.
- Restano di Graffiti 6: `placeWall` con `fitWall`/`onPlane`/`R.aperture`, i mezzi, la memoria, la tavoletta (che ha i pennelli suoi).
  Da Graffiti 3 la misura dal sito (`w.W0`, `w.H0`) e la quota (`sp.h`, `EYE`, l'estintore da terra), con il seme e non `rnd()`.
- Restano tolti pupazzi, slogan e brillantini; l'adesivo con la tag a pennarello (`w.sticker`, un terzo delle mtag) è di Graffiti 6.
- **I font**: `assets/fonts_graffiti/*.woff2` con le licenze OFL/Apache in `licenze/`, incorporati in `src/fonts_graffiti.js` (base64,
  ~930 KB nella pagina): nessun file da chiedere a parte, quindi niente da aggiungere a `build.py`; su Vercel `assets/` va su com'è
  (anche i woff2 e le licenze), `src/` e `strumenti_inverno/` no (`.vercelignore`).
- Galleria: `Q="cmp=1&sup=mattoni" NPC=1 node strumenti_inverno/galleria_graffiti.js out.png "pezzo:-:8:201,rullo:-:6:301" 2 120`
  mette accanto «solo arte» e «+pennello» (`pen=1` solo coi pennelli).

## Graffiti 7 (28 ottobre): l'atlante, le tag delle vie, la tavoletta rifatta — righe `[atlante]` e `[tavoletta]`
**Perché i graffiti erano pochi.** Ogni lavoro era un velo: una mesh, un materiale e una texture, cioè un disegno trasparente a
fotogramma. Per questo c'era un tetto di 170 veli vivi (70 sul telefono) e la storia si fermava a 1500 lavori in memoria.
- **L'atlante** (`writing.js`, sezione «I LAVORI FINITI IN UNA TELA SOLA»). Un lavoro finito non cambia più: la sua tela si copia in
  una texture grande sulla scheda video (4096² sul computer, 2048² sul telefono, sRGB con le mipmap), il suo piano diventa
  un'istanza di una InstancedMesh che legge il suo riquadro dall'atlante (`aRect`). Due InstancedMesh: i lavori sul muro nudo e quelli
  sopra un altro (le tag sui pezzi), disegnati dopo. Tutti i lavori finiti costano due disegni. Le copie si fanno in un disegno solo per
  fotogramma (al più 8, `atlFlush`), le mipmap si rifanno una volta. Lo scaffale ha righe a gradini di 16 px; piena, si liberano i
  lavori più lontani (oltre 45 m). Restano veli i lavori in corso, sui mezzi, sul treno e sui carri. Senza WebGL2, o con
  `?noatlante`, tutto come prima. Il tetto dei veli (`VEIL_MAX`) ora conta solo i veli veri.
- **Le tag delle vie** (`writer_vita.js history`): dopo le produzioni, lungo i muri di strada, hall, ponti e ferrovia, gruppetti di
  tag, tag a pennarello, adesivi, qualche stencil e throw-up, tanti quanto è calda la zona (`heatOf`: bar, vicoli, sottopassi sì;
  regime quasi niente). Un muro con solo tag e adesivi resta libero per i writer (`freeSite`). Lavori in memoria: fino a 3500.
- **Misura**: `node strumenti/graffiti_sonda.js <cartella>` ora scrive anche `giro` (lavori entro 80 m, sul muro, nell'atlante,
  veli, falliti, le pagine dell'atlante, gli stili).

**La tavoletta** (`tavPad`, `tavShot`): non si capiva, a volte la foto sembrava vuota, il tratto non si vedeva, a volte non salvava.
- Un tocco sul muro basta (la finestra di un throw-up attorno al punto); trascinando si sceglie la misura a mano. Nel pannello la
  misura si cambia con un tocco (Tag, Throw-up, Pezzo, Burner): la foto si rifà attorno al punto, stretta alla superficie.
- La foto ha un margine di contesto attorno (scurito) e il riquadro giallo dove si dipinge; la luce si regola (contrasto allargato
  se il muro è piatto, schiarita di notte); il far della camera arriva a 9 m (prima 0,9-1,2: una strada in pendenza, un muro
  arretrato o un portico restavano fuori e la foto era vuota).
- Il tratto mentre disegni ha uno spessore minimo di 3 px a schermo e un bordo che lo stacca dal muro; staccato, la resa del pennello.
- «Salva sul muro» sempre in vista; se non può salvare dice perché. Il salvataggio non si ferma più se `nearestPlace` non trova
  niente o se la reazione della città sbaglia (prima il pannello restava aperto e il lavoro non c'era).
- Col pannello aperto il gioco non disegna la città (main.js `loop0`): il tratto resta fluido anche sul telefono.
- Game Boy (main.js `conMap`, `conKey`): A salva, B esce, la croce ◄ ► colore e ▲ ▼ spessore, il tasto bomboletta annulla.
- Prova nel gioco vero: `node strumenti/tavoletta_sonda.js <cartella>` (muri e pavimenti davanti alla camera: la foto, il tratto, il
  salvataggio).
