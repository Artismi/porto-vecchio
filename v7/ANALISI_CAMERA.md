# Porto Vecchio — Analisi della camera ([camera2], 2 novembre)

Il committente, dal vivo (telefono e portatile, profilo leggero): «la visuale si riallinea e si riaggiusta in continuazione, a scatti,
senza focalizzare bene niente. È strano».

## 1. Chi muove la camera (prima di [camera2], commit 25ff176)

Tutto sta nel blocco «camera cinematografica» di `src/render.js` (righe 18945-19080) più qualche pezzo sparso. Gli ingressi:

| ingresso | dove | come si muoveva |
|---|---|---|
| **la regia** (yaw automatico, `LIBERA` di difetto) | `render.js:18498-18508`, `18523`, `19037`; `regia.js` | ogni 0,6 s rifà la scelta fra 5 scorci attorno al «dietro» della marcia (voto con i raggi verso le case); gira fino a 0,8 rad/s |
| lo sguardo avanti della levetta (`cam.lx/ly`) | `render.js:18962`, `18969` | 30% della mezza inquadratura nella direzione della levetta, dietro alla levetta in 0,06 s (k = 16/s) |
| la base della levetta (`camBasis`, `cam.lock`) | `render.js:18988`, `19233`; `main.js:233`, `241` | con la regia `cam.lock = 0`: la levetta è relativa alla camera di *questo* fotogramma; `stickB` non viene mai fissato (`main.js:182`, solo azzerato a `833`) |
| la mira col puntatore | `render.js:18950`; `main.js:202` | il punto sotto il puntatore sposta il punto guardato fino a 2,5 m anche a mani nude; W cammina verso il puntatore |
| lo scarto voluto (mira, dialogo, momenti) | `render.js:19008`, `19022` | i personaggi del momento entrano ed escono a 16 m secchi (niente isteresi); esponenziale τ 0,13-0,26 s |
| lo zoom | `render.js:19025` | quello del giocatore e quelli del gioco (×0,8 momenti, ×1,12 mira, ×0,6 dialogo) insieme, τ 0,33 s |
| la pendenza della stretta | `visuale.js` CAMERA4 (`tau .26`, `tEntra .2`, `resta 2.05`, `zoom .9`), `render.js:1874` | sale e scende ogni ~2 s nei vicoli, esponenziale (parte di colpo); con la regia la stretta si misurava su una visuale girata dall'asse di Inquadratura che *non* era quella vera |
| la montagna che copre (`cam.lift`) | `render.js:19054` | vero/falso, ~1 s |
| la lente che respira (PELL) | `render.js:14364-14369` | segue la velocità grezza (passo, sosta, corsa) in ~0,7 s |
| lo sbieco (rollio) | `render.js:19076-19079` | 0,9° per la velocità grezza, ~1,2 s |
| campo e distanza sui mezzi | `render.js:19058`, `19066` | il campo segue la velocità senza filtro (gli urti); la distanza si accorcia a 14/s (uno scatto) |
| la quota | `render.js:19026` | `min(1, dt·4)`: a 4 fotogrammi al secondo salta |

Le ombre (`profSole`, riquadro a passo di texel) e l'impronta dei tasselli non muovono la camera, ma la seguono: ogni giro della regia
cambia l'impronta (tasselli montati e smontati, fotogrammi lunghi) e il riquadro dell'ombra; meno giri vuol dire anche meno di questo.

## 2. Perché sembrava indecisa e a scatti

1. **Due controllori in anello chiuso.** La regia gira la camera dietro la marcia; la levetta (e W col puntatore) è relativa alla
   camera di adesso. Levetta tenuta di lato → la regia gira → la stessa levetta è un'altra direzione nel mondo → il personaggio gira →
   la regia rigira. Il personaggio va in tondo e la camera non si ferma mai. Col puntatore è lo stesso: il punto sotto il puntatore
   gira con la camera.
2. **La regia ci ripensa di continuo.** Una scelta ogni 0,6 s col voto delle case che cambia a ogni passo; la banda di 0,3 rad è più
   stretta dello scarto fra i candidati (0,4-0,75), quindi un'altra case davanti basta a passare da un tre quarti all'altro. Misurato:
   **10-15 scelte in 33 s** di passeggiata (una ogni 2-3 s), 5-7 partenze da sola, 8-11 rad di giro (500-650°).
   E quando ci si ferma la mossa si blocca a metà, di colpo (`regia.js` riga 52: «fermo» ritorna prima di muovere).
3. **Lo sguardo avanti segue il pollice.** 0,06 s di ritardo: ogni tremito di direzione o di ampiezza della levetta sposta la visuale;
   lasciata la levetta torna al centro subito. 41-47 inversioni del punto guardato in 33 s.
4. **Esponenziali al posto delle molle.** Pendenza, zoom, quota, lente, rollio partono con la velocità piena (lo strappo): leggibili a
   60 Hz, a scatti a 4-15 Hz. Alcuni passi non usano bene il dt (`min(1, dt·k)`: a 250 ms saltano).
5. **Niente isteresi** sui momenti (16 m secchi) e sulla lente (la velocità grezza).

## 3. Come fanno i giochi simili

- **Isometrici e diorami** (Hades, Tunic, Death's Door, Diablo IV, The Ascent, Disco Elysium, Animal Crossing NH): l'orientamento è
  fisso o cambia solo con un comando del giocatore o un volume scritto a mano (Tunic e Death's Door allargano e girano piano in certi
  posti); Untitled Goose Game, Desperados III, Toem girano solo a mano (Toem a quarti, con la transizione morbida). GTA 2 tiene il nord
  in alto; Chinatown Wars gira dietro l'auto, piano, mai a piedi.
- **Cinemachine** (Unity): zona morta e zona morbida attorno al bersaglio, smorzamento per asse; lo sguardo avanti ha la sua
  levigatura («più alta: meno tremolio, più ritardo»), ed è dichiarato sensibile al rumore dell'animazione. Il ricentro ha un tempo di
  attesa e un tempo di ricentro separati.
- **John Nesky, «50 Game Camera Mistakes»** (GDC 2014): la camera si nota quando sbaglia; il giocatore ha la precedenza (se gira, la
  camera non gli contende la mano); cambiare l'asse di movimento sotto i piedi del giocatore lo fa andare dove non voleva; distanza,
  campo e inclinazione si cambiano insieme e piano; campo e scossa dinamici danno fastidio.
- **Mark Haigh-Hutchinson, «Real-Time Cameras»** e **SmoothDamp** (Game Programming Gems 4, 1.10): la molla smorzata al punto critico,
  integrata col dt, senza oltrepassare: lo stesso movimento a ogni frequenza di fotogrammi.

I principi che valgono per noi: zona morta (sulla direzione, sullo scorcio); smorzamento critico indipendente dal dt; sguardo avanti
molto levigato e con isteresi; niente giro automatico (o solo raro, deciso e su un segnale chiaro); zoom e campo lenti e rari; un
controllore solo con le priorità; la levetta che non cambia significato mentre la tieni.

## 4. Cosa cambia ([camera2]; `?camvecchia` torna a com'era)

Le manopole sono in `src/visuale.js` `CAMERA2` (dal vivo `window.__CAMERA2`).

- **La molla** (`Visuale.molla`, `mollaAng`): SmoothDamp; provata a 16, 66, 125 e 250 ms, la stessa curva (0,54 a 0,5 s, 0,88 a 1 s).
- **Un controllore, con le priorità**: il giocatore (gira, sposta, zoom) > dialogo, intro, editor > la regia > la pendenza della stretta
  > lente e rollio.
- **La regia calma** (`regia.js` `passoCalmo`, attiva con `K.molla`): sceglie solo dopo 2 s di marcia stabile, solo se lo scorcio
  migliore è oltre 0,5 rad dalla visuale (zona morta), fa la mossa intera con la molla (0,8 s, al più 0,65 rad/s) anche se ti fermi,
  poi riposa 5 s. **Col puntatore la visuale non gira mai da sola** (`ui.puntatore` da `main.js`).
- **La levetta tenuta non gira con la regia**: `cam.lock` accumula il giro automatico finché tieni la levetta (`camBasis`); la base
  si aggiorna quando la lasci. Spezza l'anello del punto 2.1.
- **Lo sguardo avanti**: 22% invece del 30%; la direzione cambia solo oltre 0,3 rad (il pollice che trema non conta); la molla va dove
  spingi in ~0,55 s (al più 9 m/s), lasciata la levetta resta 0,6 s e poi torna in ~1,1 s.
- **Mani nude**: il puntatore non trascina il punto guardato (le armi sì, come prima).
- **Momenti**: dentro a 16 m, fuori a 21 m (isteresi). Lo scarto voluto con la molla (0,45 s, 0,35 s sui mezzi).
- **Zoom**: quello del giocatore resta pronto come prima; quello del gioco (mira, dialogo, momenti, al chiuso) a parte, con la molla (0,7 s).
- **Pendenza della stretta**: entra dopo 0,5 s (era 0,2), esce dopo 1,4 s (era 0,8), al più un cambio ogni 4 s (era 2), banda 0,12,
  stretta di zoom 0,95 (era 0,9), la molla 0,75 s al posto dell'esponenziale. Con la regia la stretta si misura sulla visuale vera.
- **Lente**: la velocità smussata (1,2 s), la lente si muove in ~2,5 s e respira la metà attorno al gonfio di sempre. **Rollio**: la
  stessa velocità smussata, 65% dell'ampiezza, la molla 2 s. **Mezzi**: campo (0,8 s) e distanza (0,6 s) con la molla. **Quota**: molla 0,3 s.

## 5. Le misure (`node strumenti/sonda_camera.js`)

La sonda guida il gioco vero (profilo leggero, `?cittanuova&leggera&tassellivecchi`, piazza) con una passeggiata scritta di 33,5 s
(avanti, sosta, destra, diagonale, sosta, corsa, verso la camera, sosta, sinistra, diagonale, sosta) in due stili: **levetta**
(telefono/controller, relativa alla camera, col tremito del pollice) e **tastiera** (W verso un puntatore fermo sullo schermo). I
fotogrammi li fa lei, col dt scelto (anche oltre i 50 ms del gioco). Serie ricampionate a 20 Hz di tempo di gioco. «Corsa»: quanto si
muove al secondo; «inv»: inversioni; «episodi»: partenze da sola; «strappo»: RMS della derivata terza; «schermo»: il personaggio sullo
schermo (-1..1). `?camvecchia` sulla build nuova ridà gli stessi numeri della build vecchia con la levetta, quasi gli stessi con la tastiera (la
città viva cambia un poco fra una corsa e l'altra); il «prima» qui sotto è `?camvecchia`.

**Levetta** (prima → dopo):

| dt | yaw corsa rad/s | yaw episodi | scelte regia | yaw strappo | pendenza inv | lente inv | punto guardato inv | schermo inv | schermo AF | schermo strappo |
|---|---|---|---|---|---|---|---|---|---|---|
| 33 ms | 0,345 → 0,095 | 5 → 4 | 15 → 2 | 52 → 3,0 | 3 → 1 | 3 → 0 | 47 → 11 | 13 → 4 | 0,029 → 0,003 | 271 → 3,2 |
| 66 ms | 0,272 → 0,097 | 6 → 2 | 13 → 2 | 39 → 2,5 | 5 → 1 | 1 → 0 | 41 → 12 | 13 → 3 | 0,028 → 0,003 | 203 → 3,1 |
| 125 ms | 0,244 → 0,094 | 6 → 2 | 12 → 2 | 48 → 8,0 | 3 → 1 | 5 → 0 | 44 → 14 | 13 → 3 | 0,027 → 0,004 | 161 → 15 |
| 250 ms | 0,267 → 0,094 | 5 → 2 | 10 → 2 | 57 → 12,8 | 1 → 0 | 7 → 0 | 34 → 15 | 15 → 3 | 0,023 → 0,004 | 135 → 19 |

**Tastiera e puntatore** (prima → dopo):

| dt | yaw corsa rad/s | yaw episodi | scelte regia | pendenza inv | lente inv | schermo inv | schermo strappo |
|---|---|---|---|---|---|---|---|
| 33 ms | 0,248 → 0 | 7 → 0 | 15 → 0 | 3 → 1 | 3 → 0 | 7 → 0 | 38 → 4,2 |
| 66 ms | 0,199 → 0 | 6 → 0 | 11 → 0 | 3 → 1 | 5 → 0 | 7 → 0 | 29 → 5,9 |
| 125 ms | 0,227 → 0 | 5 → 0 | 13 → 0 | 4 → 0 | 3 → 0 | 7 → 0 | 24 → 3,3 |
| 250 ms | 0,258 → 0 | 7 → 0 | 11 → 0 | 3 → 0 | 9 → 0 | 3 → 0 | 28 → 4,0 |

La corsa della lente scende di 7-9 volte (0,005 → 0,0007 al secondo). Dopo, le misure della levetta sono quasi le stesse a 33 ms e a
250 ms (yaw 0,094-0,097 rad/s, 2 scelte): la camera non dipende più dalla frequenza dei fotogrammi. Prima variavano del 30%. Lo strappo
che resta a 125-250 ms è quello dei campioni stessi (4-8 posizioni al secondo).

## 6. Da provare a mano

- Telefono: tieni la levetta di lato per 3 s. Prima il personaggio andava in tondo; ora la camera gira una volta, piano, e si ferma.
- Portatile: W col puntatore. La visuale non gira mai da sola: si gira con `,` `.`, col bordo dello schermo o trascinando.
- Le manopole da toccare se serve: `__CAMERA2.regia.soglia` (più alta: gira ancora meno), `.stabile`, `.resta`; `__CAMERA2.sguardo`;
  `__CAMERA2.lenteAmpia`.

## 7. [camera3] La visuale bassa che va a scatti (`?nofixbassa`: com'era)

Il committente: «oltre un certo zoom, quando la camera comincia a scendere verso l'orizzonte, va molto a scatti». Misura con
`node strumenti/sonda_discesa.js` (profilo leggero, piazza; zoom da 2 a .12, 3 s per gradino; i disegni non vanno a SwiftShader ma three
li conta: disegni e triangoli sono quelli veri, sommati su tutte le passate, ombre comprese).

**È la frequenza dei fotogrammi, non la risposta della camera.** La pendenza arriva al 90% 0,6 s prima che finisca una discesa di 3 s,
senza salti, prima e dopo: le molle (`BASSA.k`, τ 0,2 s) sono pronte. Quello che cambia scendendo è quanto si disegna:

- **I mezzi passano al dettaglio pieno.** Il livello alto di un'auto (`V3LOD`, 70 m dalla *camera*) dall'alto non scatta quasi mai. Nella
  visuale bassa la camera sta a 5 m dal personaggio e guarda avanti, quindi ogni auto entro 70 m è al dettaglio pieno, ognuna con molti
  pezzi, nella passata principale e in quella delle ombre. Le ombre dei mezzi passavano da 10 a 101 disegni.
- **I mezzi entro `62/zoom`** (`render.js`, `VIEW_R`): a zoom .12 vuol dire 516 m, quindi 117 mezzi in scena invece di 73-83.
- **La nebbia si apriva** a 120 m (telefono) o 160 m (computer), invece dei 90-120 m di prima, e il piano lontano restava a 170 m.
  Con lei si allargano l'impronta dei tasselli, il cerchio dello streaming (`nebbia - distanza della camera + 40`: la camera bassa sta a
  5 m, non a 40) e gli anelli delle case.

Cosa cambia:

- **Nebbia e piano lontano.** Nella visuale bassa la nebbia chiude a 70 m (telefono) o 95 m (computer), e il piano lontano la segue a +6 m:
  la nebbia nasconde il taglio. Il cielo (una sfera di 160 m: conta solo la direzione) si rimpicciolisce per stare dentro il piano lontano.
- **Mezzi fino alla nebbia** (+15 m).
- **Dettaglio dei mezzi secondo la misura sullo schermo.** La soglia del livello basso si scala col campo: a 52° un'auto a 38 m è grande
  come a 70 m con 30°.

Si regolano dal vivo con `window.__BASSA2`. L'impronta dei tasselli, lo streaming e gli anelli si stringono da soli, perché seguono la
nebbia. Il riquadro delle ombre era già limitato (28 m di mezzo lato a quello zoom).

| zoom .12-.16, fermi | prima | dopo |
|---|---|---|
| disegni per fotogramma | 1177-1196 | 755-775 |
| triangoli | 1,82-1,83 M | 1,70-1,72 M |
| mezzi in scena | 113-117 | 73 |
| nebbia, piano lontano | 120 m, 170 m | 70 m, 76 m |
| tasselli in scena | 15 | 15 |

| 5 s di corsa nella visuale bassa | prima | dopo |
|---|---|---|
| disegni | 1091 | 709 |
| triangoli | 1,36 M | 1,24 M |
| mezzi | 117 | 66 |
| tasselli montati | 2 | 0 |
| caricamento verso la scheda video | 0,53 MB a fotogramma | 0,47 MB a fotogramma |

Dall'alto (zoom .4) i disegni sono 475-490, prima e dopo: scendendo i disegni salivano di 2,4 volte, ora di 1,6.

I ms del processore (SwiftShader) sono simili prima e dopo (mediana 105-130 ms): il guadagno è nella scheda video. Nelle foto a zoom .12,
prima e dopo, la scena vicina è la stessa e il cielo è intero; il lontano è appena più velato.

## 8. [camera4] Tagliare solo quando non c'è altro da fare

Il committente: «il taglio delle case solo quando è inevitabile; meglio inquadrature dall'alto, o abbastanza vicine da anticipare gli
ostacoli; senza correzioni continue o innaturali, né contro quello che vuole il giocatore». E poi: «può anche girare, purché la camera
resti rivolta dove va il personaggio: mai la sua faccia, mai quello che ha alle spalle; se gira il giocatore, vince lui».

**Com'era.** La regola [sempre] tagliava ogni casa che copriva il personaggio *o il suolo* attorno a lui: un disco di 5 m più una striscia
di 4 m dietro e 8 m davanti. Nel percorso di prova si tagliava il **99,5% del tempo** e il **98,5% dei tagli non serviva**: quelle case non
coprivano il personaggio dalla camera vera. All'avvio erano sei case tagliate, e nessuna lo copriva.

**Come fanno i giochi simili.**
- **Hades e Diablo:** l'orientamento è fisso. Ciò che sta davanti al personaggio si apre in un cerchio stretto (il muro diventa
  trasparente solo lì) e la sagoma resta visibile: niente case intere che spariscono.
- **Tunic:** cambia la camera solo per zone scritte a mano (si allarga o sale in certi posti) e lo fa lentamente.
- **Animal Crossing:** alza appena la camera quando si cammina verso il fondo dello schermo e non taglia mai: il mondo è costruito per la camera.

Da noi la città è generata, quindi la «zona scritta a mano» si legge sulla mappa.

**La gerarchia** (`Visuale.inquadra4`, `INQUADRA4` per le prove dal vivo):

1. **Anticipare, non reagire.** Il bisogno si legge sulla mappa (`Visuale.mappa`: l'altezza del pieno sul lato camera; le volte) dove si
   è e dove si sarà fra 0,6, 1,2 e 1,8 s, in una cache per cella di 1 m e per ottavo di giro. Il bisogno è la pendenza che libera il busto.
   Niente raggi per fotogramma: la camera è già alta quando il muro arriva.
2. **Prima scelta: più dall'alto.** La pendenza sale quanto basta, a gradini di 0,06 rad, fino a 1,1 rad (63°). Nella regia (solo con la
   levetta, ferma col puntatore) lo stesso bisogno pesa nella scelta fra visuali di poco diverse. Restano solo le visuali nel cono dietro
   la marcia (0, ±0,35, ±0,6 rad: mai di fronte né di lato), e la levetta tenuta resta nella base di quando l'hai presa (niente giro in tondo).
3. **Poi un poco più vicini** (zoom 0,86), se neanche 1,1 rad basta.
4. **Il taglio, per ultimo.** Una casa si taglia solo se copre il busto o la testa, sia dalla camera dove sta andando sia da quella di
   adesso. Il suolo attorno non conta più. Il taglio resta morbido: scivola in 0,35 s e si richiude in 0,55 s. Sotto le volte (portici,
   archi) la pendenza non cambia: ci pensano il taglio a retino [ad] e la sagoma.
5. **Il giocatore vince.** Lo yaw lo gira solo la regia, dentro il cono; a mano vince il giocatore, e la regia aspetta 4 s. Se il giocatore
   tocca lo zoom o la pendenza, l'automatica cede per 6 s.
6. **Il budget.** Si sale dopo 0,2 s di bisogno e mai prima di 2,5 s dall'ultimo cambio. Si scende dopo 3 s di bisogno più basso di
   0,1 rad e mai prima di 6 s. Tutto va su `Visuale.molla` (1 s).

`?nofixinquadra` torna al taglio di [sempre]. Le prove sono in `src/test_inquadra4.js`.

**Misure** (`node strumenti/sonda_occlusione.js`; profilo leggero; a passo d'uomo lungo due vicoli vicino alla piazza, la piazza e un
portico; 69 s):

| | prima | dopo |
|---|---|---|
| tempo col taglio | 99,5% | 10,4% |
| tagli che non servivano (non coprono il personaggio dalla camera vera) | 98,5% | 2,7% |
| personaggio coperto senza taglio | 0,15% | 3,3% |
| cambi d'inquadratura al minuto (pendenza + distanza + yaw) | 16,5 (6,1 + 6,1 + 4,3) | 16,5 (6,9 + 5,2 + 4,3) |
| strappo della pendenza | 1,23 | 1,04 |
| strappo del personaggio sullo schermo | 0,23 | 0,21 |
| pendenza media | 0,88 rad | 0,93 rad |

Il personaggio resta coperto per il 3,3% del tempo. Quasi tutto è nel vicolo dei Gatti, mentre la camera sale (sulla molla) verso un
gradino che lo libera; lì restano anche il retino [ad] e la sagoma.

I cambi al minuto sono gli stessi di prima. Nei tratti di 20 s sono 2 o 3 gradini, a più di 3 s l'uno dall'altro. Nel vicolo dei Gatti
un cambio è la regia che gira dietro la marcia, e lì il bisogno scende a zero: la pendenza torna giù invece di tagliare.

Lo strappo della distanza sale (22,6 → 33,6): è il gradino 3, il poco più vicini.

## 9. [camera4] L'avvio («sembra rotto»)

Il committente: «entrando sono tutte le case tagliate, il personaggio guarda un muro, sembra rotto; poi lento ti giri, la visuale segue a
scatti, si allunga piano se ti fermi e gira piano con la visuale».

Misura con `node strumenti/sonda_avvio_camera.js`: il gioco vero col suo giro e il disegno vero, i primi 20 s di gioco dopo «Gioca».

**Il perché, misurato prima:**
- **Sei case tagliate per il 99% del tempo, e nessuna copriva il personaggio.** Era la regola [sempre] del suolo attorno.
- **Il personaggio parte in un angolo fra le case.** Il punto di partenza, a (1259, 349), ha pieni a 1 m in sei direzioni su otto;
  guardava verso nord (`face` −π/2), dritto in un muro.
- **Lo zoom partiva da quello dell'intro e si allungava** (zoom 0,87 → 0,72, distanza 57 → 47 m). In tempo di gioco ci metteva
  1,35 s. Ma dopo il caricamento i fotogrammi sono lenti (0,1-5 s, mediana 1,8 s in SwiftShader) e il gioco taglia il dt a 50 ms: ogni
  molla andava al rallentatore, decine di secondi veri. Era il «si allunga piano».

**Cosa cambia** (`?nofixavvio`: com'era):
- **Le molle scattano.** All'inizio, dopo un salto di oltre 8 m in un fotogramma e entrando o uscendo da una casa, le molle vanno al
  bersaglio (valore e velocità a posto). Regia, mano e gerarchia ripartono da capo; il taglio si apre o si chiude subito.
- **La camera va col tempo vero del fotogramma** (`ui.reale` da main.js, al più 250 ms). Coi fotogrammi lenti non resta indietro, e un
  fotogramma lunghissimo non la scaglia. La marcia del personaggio resta misurata col tempo del gioco.
- **La prima visuale.** Fra gli otto orientamenti si sceglie prima quello che non chiede il taglio, poi quello che chiede meno pendenza,
  poi quello con più strada davanti, poi il più vicino all'orientamento dell'isola. Il personaggio guarda la via più libera dentro i 90°
  davanti alla camera: mai la faccia verso di lei.

| primi 20 s di gioco (fermi; 400 fotogrammi, 850-1190 s veri) | prima | dopo |
|---|---|---|
| tempo con case tagliate | 99% (6 case) | 0% |
| tagli che non coprivano il personaggio | 99% | 0% |
| personaggio coperto senza taglio | 0% | 0% |
| zoom: corsa totale e tempo per assestarsi | 0,15 in 1,35 s di gioco (42 s veri) | 0, subito |
| distanza della camera: corsa totale | 9,8 m (57 → 47 m) | 0 m |
| pendenza: corsa totale | 0 | 0 (0,90 rad dal primo fotogramma: gradino 1) |
| visuale e sguardo | isola (0,79 rad), guarda a nord (−1,57) contro un muro | 2,36 rad, lato camera libero; guarda verso la strada (0,79) |
