# RIFINITURA SUOLO — il suolo e l'acqua per lo stile E («via di mezzo 55»)

Il committente: «la spiaggia risulta molto piatta, priva di dettaglio … superficie per superficie bisogna pensare come migliorare il look,
perché ancora certe cose sono un po' buttate lì come dettaglio, stile, texture … si deve vedere la cura per i singoli elementi e ambienti».

Riferimenti: `BIBBIA_STILE.md` del ramo fumetto2 (TERZA VERSIONE in cima, §0 le regole della qualità, §11 i modelli e i materiali), la tavola
approvata `tavola_via_di_mezzo.jpg` (colonna 55), il prototipo del passo `prototipo3.py`.

## Come si accende

- **Solo con lo stile E**: `?stile=E` nell'indirizzo, oppure `window.PV_STILE` che comincia per `E` (lo scrive render.js quando lo stile E
  ci sarà). **`?norifsuolo`** spegne tutto.
- Senza: il codice non entra negli shader. Negli shader del suolo `rsK` è la costante `0.` e il compilatore toglie i rami (lo shader fa
  esattamente quello di oggi, le chiavi dei programmi sono quelle di oggi); lo shader del mare non si tocca.
- Con: `rsK` è una uniform dal vivo, `window.__RIFS.k.value` (1 = rifinitura, 0 = com'era, nello stesso fotogramma: è quello che usano le
  sonde per le tavole prima | dopo).
- Il codice: `src/rifinitura_suolo.js` (i pezzi comuni: la riga antialiasata, la sabbia disegnata, il ritocco del mare), più i rami
  `rsK` in `src/pavimenti.js` (suolo dei blocchi, marciapiedi, strisce) e in `src/riva.js` (la riva fine). render.js **non è toccato**: il
  mare (`buildWater`) si ritocca nel testo dello shader dopo `R.init` (prima che main.js compili i programmi), il prato (`prato9`) nel testo
  che pavimenti.js riceve già trasformato.

## La regola comune (per tutte le superfici)

1. **Righe, non grana.** Il dettaglio è fatto di linee disegnate ancorate al mondo: increspature, giunti, crepe, la linea dell'alta marea,
   la cresta dell'onda, il bordo del bagnato, il filo del cordolo. Ogni riga è una distanza in pixel (`fwidth`) con un bordo di un pixel:
   liscia, nitida, mai a gradini.
2. **Si spengono prima di stringersi.** Ogni famiglia di righe svanisce quando il suo passo sullo schermo scende sotto 6–10 px (le
   increspature hanno un'ottava larga che resta quando le fini spariscono): da lontano resta la tinta, niente moiré né sfarfallio. È il
   «mipmap» dello shader.
3. **Via la grana.** I puntini (inerti dell'asfalto, ghiaietta della terra, granelli e conchiglie a rumore della sabbia, pori del travertino,
   la grana sotto la vernice) a zero: erano i «pois» e il frigge che la bibbia vieta (§0.1).
4. **Una tinta per tipo di suolo, un gradino di valore fra vicini** (§11.1): sabbia asciutta un gradino sotto la carta, sabbia bagnata
   due gradini sotto, la schiuma sopra a tutte; il lastrico a tre toni da pietra a pietra (non una nuvola); la terra a due toni a chiazze.
5. L'inchiostro delle righe si stende **dopo** le correzioni di tono del suolo (la «calma» di [sguardo] rimetteva il disegno a metà strada
   verso la tela sfocata: con E la calma è al 30%, le righe restano piene).

## Superficie per superficie

(le tavole: `_immagini/rifinitura_suolo/` — per ogni superficie prima | dopo, alla camera del gioco e da vicino, il materiale e l'anteprima
col passo E 55 di prototipo3.py)

### 1. La spiaggia e la battigia (`riva.js` + `rifinitura_suolo.js` rsSabbia; il mare per la battigia)

**Cos'è in Liguria**: una spiaggia stretta di sabbia grossa e ghiaietta, chiusa fra il muraglione del lungomare e il mare; la fascia
bagnata scura e liscia dove l'onda arriva, il pizzo bianco dell'onda che sale e si ritira, la linea dell'alta marea con la posidonia secca
(le «banquettes» brune), qualche ciottolo e conchiglia, le orme. Il vento disegna increspature parallele.

**Oggi**: una campitura chiara quasi bianca (più chiara del lungomare e della schiuma: non si staccava niente), con una grana fine di
granelli a rumore, ciocche di posidonia a macchie e la risacca come un'ombra sfumata.

**La finitura a fumetto**: la sabbia asciutta un *osso caldo* (un gradino sotto la carta: la schiuma, il muraglione e gli ombrelloni si
staccano); le **increspature** come righe d'inchiostro sottili, lunghe e appena curve (passo 70 cm, a tratti, con la luce sottovento
accanto; l'ottava a 1,4 m da lontano); il **bordo del bagnato** come un taglio netto (non una sfumatura) e dentro la sabbia bagnata *sasso
caldo* più scura verso l'acqua, con le **linee lasciate dall'onda** chiare e rotte; la **linea dell'alta marea** come un tratto bruno spezzato
di spessore variabile (la posidonia); **ciottoli e conchiglie** radi, ovali col contorno (sotto i 2 px non ci sono: niente pois); le **orme**
in piste dritte, solo da vicino. Sul bagnasciuga il **pizzo dell'onda** è un nastro bianco netto largo 3 px col suo filo d'ombra.

**Inchiostri**: osso `#D2C2A6` / pesca `#F0BE8C` (asciutta), sasso `#A89C92` caldo (bagnata), mattone/lavagna per la posidonia, carta per
la schiuma e le conchiglie. **Gradini di valore**: schiuma .93 > lungomare/muraglione .80 > sabbia asciutta ~.72 > bagnata ~.52 > acqua bassa.

### 2. Il mare e l'acqua del porto (lo shader del mare di render.js, ritoccato da `rifinitura_suolo.js`)

**Cos'è**: il Tirreno ligure: turchese chiaro sul fondo di sabbia, verde acqua al medio, blu oltremare al fondo; nel porto più torbido.
Da sopra il fumetto lo disegna **a fasce** con le creste come tratti bianchi.

**Oggi**: un gradiente continuo con caustiche e una grana fine di onde che frigge (la normale a rumore), la schiuma delle creste a macchie.

**La finitura**: **tre fasce di profondità** (1,1 m, 3,4 m, 7,5 m, il bordo mosso appena) con le tinte della tavolozza (cielo/acqua al
basso, acqua al medio, oltremare/notte al fondo; la tinta pesa il 55%, il valore resta quello di A) e una **riga chiara sul confine** di ogni
fascia; le **creste** come tratti bianchi netti (1,6 px) sulle creste di due treni d'onda (4,3 m e 8 m), a pezzi, più col vento, spenti
nell'acqua bassa; caustiche e grana fine della superficie a un quarto/un terzo. Il riflesso del cielo, il sole, la luna e le luci della riva
restano di A. Il porto torbido tiene la sua fascia più bruna.

### 3. Il lastrico delle piazze e i basoli dei vicoli (`pavimenti.js`, pietre a file: basoli, travertino, banchina, lastre)

**Cos'è**: basoli di arenaria e pietra di Finale, lastre di ardesia sotto i portici, travertino nelle piazze del regime; i giunti stretti
e scuri, qualche pietra rifatta in cemento, qualche pietra lucidata dai passi.

**Oggi**: le pietre c'erano, ma la calma del suolo le riduceva a una nuvola di toni con la grana fine sopra; i giunti a un terzo di forza.

**La finitura**: **tre toni** da pietra a pietra (un gradino netto, non un rumore), i **giunti come righe d'inchiostro** (≥1 px, nette), una
pietra su venti **rifatta** (più fredda e scura, col giunto più largo), una su venti **consumata** (più chiara e lucida); via la grana fine e
i pori. Il basolo di lava resta. Inchiostri: osso / sasso / lilla del lastrico (la bibbia: «lastrico osso/sasso»).

### 4. L'asfalto e le strisce (`pavimenti.js` asfalto, `Pavimenti.vernice`)

**Cos'è**: l'asfalto consumato e caldo delle vie del boom, con le toppe, le crepe, i giunti di ripresa; le strisce bianche scrostate.

**Oggi**: una pelle di inerti chiari e scuri a 4 cm (puntini), la grana fine, la ragnatela delle crepe a celle di 22 cm (a 5 cm a pixel una
rete fitta), la vernice con la grana sotto e le scrostature a rumore.

**La finitura**: niente inerti né grana; **le crepe come righe** d'inchiostro, la ragnatela solo dove l'asfalto è stanco davvero; **le toppe
col filo** del bitume disegnato; i giunti di ripresa come righe sottili; la **vernice piena e pulita** con poche scrostature larghe a bordo
netto. Inchiostri: piombo `#7C7186` (la bibbia: «asfalto»), carta per le strisce.

### 5. Il marciapiede e il cordolo (`pavimenti.js` lastre, il cordolo di granito)

**Cos'è**: lastre di pietra con il cordolo di granito chiaro sul ciglio.

**La finitura**: lastre a tre toni coi giunti d'inchiostro; il **cordolo un gradino più chiaro** e il **filo scuro del ciglio** verso la
strada (il passo E dalla profondità non lo vede: il gradino è di 15 cm).

### 6. La terra, la ghiaia e il prato (`pavimenti.js` terra/spianata; il prato9 di render.js nel testo)

**Cos'è**: terra battuta chiara dei sentieri e dei cortili, ghiaia sul ciglio, il prato secco e i giardini.

**Oggi**: ghiaietta a puntini, sassolini a celle, il prato a fili fitti (righe a 5 cm che friggono).

**La finitura**: la terra a **chiazze larghe a due toni col bordo netto**, qualche **sasso grande col contorno**, le **crepe della terra
secca** come righe rade (solo fuori dalle carreggiate), il **solco delle ruote** col bordo disegnato; il prato a **cespi a due toni** col
bordo netto e il filo scuro sul bordo del cespo, i fili a un quinto.

### 7. Le scale e i gradini

Non toccati: le scale vere sono pezzi (render.js `buildStairs`, i pezzi della città in `pezzi_citta.js`), cioè geometria del costruito, e i
loro gradini hanno già il salto di profondità che il passo E contorna. Da fare col costruito (vedi «Cosa resta»).

## Com'è venuta (le tavole, `_immagini/rifinitura_suolo/`)

Ogni tavola: prima (oggi) | dopo (`?stile=E`) col materiale com'è nel gioco, poi gli stessi due col passo E 55 di `prototipo3.py`
applicato sulle catture (anteprima: la categoria ricavata dalla normale, senza le maschere delle persone). Catture a 640×360 in SwiftShader
col profilo `leggera&memoria` (la macchina condivisa non regge di più), lo stesso istante con la manopola a 0 e a 1; righe «ritaglio ×2»
per il dettaglio. Strumenti: `strumenti/rifinitura_suolo_foto.js` (catture, `PROF=1` la distanza per il prototipo, `REPL=` la sonda dal
vivo), `strumenti/rifinitura_suolo_scene.json`, `strumenti/rifinitura_suolo_anteprima.py` (anteprima E55 e tavole).

- **1_spiaggia** (la prima): si vede il cambio più netto. Le increspature disegnate si leggono alla camera del gioco (all'ora d'oro sono il
  disegno della spiaggia), il bordo del bagnato è un taglio, il pizzo dell'onda un nastro bianco col filo, la sabbia un gradino sotto la
  carta; il mare si calma (niente più macchie di grana) e prende le creste a tratti. Col passo E 55 il «dopo» ha un fondo ordinato su cui il
  tratteggio e l'inchiostro lavorano, il «prima» una sabbia piatta con le macchie della tela.
- **2_mare**: fasce di profondità e creste a tratti rastremati; nel porto l'acqua più calma e più blu. Il riflesso del sole resta (è la luce
  di A): è il pezzo più grande della superficie del porto, da tarare col passo (vedi sotto).
- **3_lastrico**: il cambio più leggibile dopo la spiaggia: le lastre a tre toni coi giunti netti invece della nuvola sfumata; i basoli del
  vicolo si contano.
- **4_asfalto**: via la grana (gli inerti a puntini), le strisce pulite; le crepe si vedono solo nel ritaglio (alla camera del gioco sono rade:
  voluto, niente reticolo).
- **5_marciapiede**: lastre e cordolo coi giunti netti.
- **6_terra_prato**: **qui il cambio quasi non si vede**. Lo «sterrato» scelto è asfaltato (la via della Memoria) e il prato dei campi a
  ovest della città, nel profilo leggero, è una tinta liscia senza il disegno di `prato9`: il ritocco c'è nel codice (terra a chiazze, sassi
  col contorno, solchi, prato a cespi) ma queste due inquadrature non lo mostrano. Da rifare su una terra battuta vera (i sentieri della
  campagna) e col profilo pieno.

## Il costo

- **Nessuna chiamata di disegno in più, nessuna tessitura in più, nessuna mesh in più, nessun programma in più** (con lo stile gli stessi
  materiali compilano con `rsK`; la chiave del programma cambia, il numero no). Solo aritmetica negli shader che c'erano.
- **Senza lo stile E: zero.** Il codice non c'è (`rsK` costante 0, rami tolti dal compilatore; lo shader del mare intatto). Con
  `?shaderdebug` nessun errore di compilazione in nessuna delle 12 inquadrature, con e senza la rifinitura.
- **Con lo stile E, per pixel (stima dal codice)**: la sabbia ~70 operazioni e 6–8 hash (solo sulla riva e sulla sabbia della città); il
  lastrico ~12; l'asfalto **meno di oggi** (via due rumori a tessitura e tre hash: inerti, grana, puntini); la terra ~30 (un rumore in più);
  il prato ~8; il mare ~90 (due treni di creste, tre fasce, due rumori) contro ~25 risparmiati sulle caustiche. Sul quadro tipico (metà suolo,
  un quarto mare) **~+40 operazioni al pixel medio**, l'ordine di un decimo del passo E (~380, BIBBIA §8): su Iris Xe ≈ +0,03–0,05 ms a
  1137×640. Nel profilo leggero (telefoni) gira lo stesso codice (le righe sono poche operazioni; le orme e i ciottoli si spengono da soli
  sotto i 2–3 px).
- Le sonde di tempo sul GPU (`strumenti/banco_gpu_console.js`) chiedono una scheda vera: in SwiftShader i millisecondi non dicono niente
  (la sonda `TEMPI=1` qui non misura il fotogramma vero); da rifare su Iris Xe con `?stile=E` e `?stile=E&norifsuolo`.

## Cosa resta / per gli altri

- **Tasselli cotti**: i marciapiedi (e le strisce) nei tasselli hanno lo shader cotto nella build, senza `?stile=E`: con i tasselli il
  marciapiede resta A. La manopola `RIFS.k` è registrata fra le uniform di modulo (`Render.__tass.uni`), quindi basta cuocere i tasselli con
  il codice dentro (la pagina di cottura con `?stile=E`) perché la rifinitura si accenda e spenga dal vivo anche lì. Le superfici di questo
  lavoro fuori dai tasselli (il terreno a blocchi, la riva, il mare) sono vive e non chiedono ricottura.
- **Per render.js (il passo E)**: quando lo stile E sarà nel passo, render.js dovrebbe scrivere `window.PV_STILE = 'E…'` prima di `R.init`
  (lo fa già per le altre varianti): la rifinitura lo legge da sola. Se il passo vuole tarare la rifinitura insieme alla manopola k, basta
  `RifSuolo.k.value = k / .55` (0 = A).
- **Le scale**: i gradini disegnati (il naso chiaro, la riga d'ombra sotto) vanno nei pezzi del costruito.
- **La terra e il prato**: da verificare su un'inquadratura giusta (vedi sopra); il prato dei campi nel profilo leggero non ha il disegno.
- **Il riflesso del sole sul porto**: è una macchia grande e morbida; con lo stile E andrebbe a lame nette (render.js o qui nel ritocco del
  mare, `pow(g, 420.)` → soglia antialiasata): non fatto per non toccare la luce di A senza il passo accanto.
- **Prova pre-esistente rotta**: `src/test_tasselli.js` dà «l'impronta della pagina non è quella dei sorgenti» anche senza questo lavoro:
  la prova conta i modelli `.glb/.json/.png/.jpg/.webp` ma `build.py` conta anche i `.glb.gz` (con `gz` nella lista della prova passa).
