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
