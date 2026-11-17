# Il tratteggio a mano ([tratteggio])

Ramo `tratteggio` (da `origin/claude/shader-styling-performance-wbvqfy`). Tavola: `_immagini/tratteggio/tratteggio.jpg`.
Colonne: oggi, a, b, c (stessa sessione, stesso istante, le mani cambiate dal vivo). Righe: la Piazza con alberi e ringhiere, l'angolo in
ombra del vicolo, il personaggio in ombra (dettaglio 2× della stessa ripresa del vicolo: le altre due vie provate mettevano la camera contro un
muro), tutte alla camera del gioco alle 11 col sereno; in fondo il telefono (profilo leggero, 873×393): oggi | b sulla Piazza e nel vicolo.

## Il problema

«Le campiture sono su tutto, anche su alberi e ringhiere; nell'ombra vanno bene, ma sono omogenee, regolari, piene, tutte uguali: sembra il
tratteggio di sezione di un disegno tecnico. E i contorni sulle cose fini sono troppi.» Le cause:

- **sul telefono** (dal gradino 2 del regolatore il tratteggio di luce3 è spento) torna quello del passo unico dello stile E: righe continue a
  passo fisso, un angolo per categoria, accese dal *valore* del pixel. Un muro arancio al sole, il disco della fontana, un palo: tutti rigati
  uguale. È il «retino CAD» della tavola (colonna «oggi», riga del telefono);
- **al computer** luce3 tratteggia nei materiali con le mappe dei toni: più fine, ma sempre lo stesso motivo ripetuto, e anche su tronchi e
  ringhiere;
- **il filo** (la sagoma dalla profondità, le pieghe, l'anello di D2) ha lo stesso peso su una casa e su una ringhiera o una chioma.

## Cosa cambia (prima passata: `?tratteggio=a|b|c`)

Un modulo nuovo, `src/tratteggio.js`, come luce3: solo shader, il testo del passo unico ritoccato alla compilazione. **Nessun passo nuovo,
nessun pixel in più**: tutto dentro il passo unico che c'è già (il telefono resta a 2 passi a tutta tela, 1 px per px CSS). render.js non
cambia, il modulo è fuori dall'impronta dei tasselli (`build.py` TASS_FUORI: l'impronta resta `9ac23628aedd6b75`). Senza l'interruttore il
gioco è identico.

- **Il tono dalla luce, non dal colore**: la normale del pixel (dalla profondità) contro il sole, l'ombra portata letta nella mappa d'ombra
  del sole (1 lettura) e, nell'ombra, quanto è vicina la luce (4 letture a ~1,3 m; **2 sul telefono**). In luce niente; sul terminatore
  pochi tratti singoli; nell'ombra più fitti; incrocio solo nel fondo. Di notte il valore del pixel, come prima.
- **Il segno dove succede qualcosa**: al bordo dell'ombra portata, al piede dei muri, sotto gronde e balconi. Dentro le ombre larghe il tratto
  si dirada a chiazze (un rumore largo fermo nel mondo): l'ombra la porta il colore.
- **Il tratto vivo**: righe a celle con un caso per cella invece della sinusoide: ogni tratto ha lunghezza, spessore, pendenza, tremolio suoi,
  l'attacco pieno e la coda sottile, i vuoti fra un tratto e l'altro. Fermo nel mondo, le ottave lo tengono a 4-7 px sullo schermo.
- **La direzione dalla forma**: il suolo in orizzontale sullo schermo, i muri dalla mano (diagonale, quasi verticale o lungo i corsi), i tetti
  giù per la falda, ogni faccia il suo angolo e il suo caso.
- **Niente segno sulle cose fini**: dove la profondità salta dentro 2 px (ringhiere, rami, pali, cavi) e sulle chiome (il verde) il tratteggio
  quasi sparisce. Persone e mezzi come prima: niente.
- **La carta fra i tratti**: dove la mano tratteggia, l'ombra si apre un poco (il valore lo dà l'inchiostro, non la pappa scura).
- **La gerarchia del filo**: pieno davanti (fino a +10/25%), più leggero lontano (al 40-55% oltre ~25 m dal personaggio), sulle cose fini
  (30-40%) e sulle chiome (−70/80%). Il contorno delle persone non cambia.

Costo sul telefono: 1 lettura della mappa d'ombra dappertutto + 2 nell'ombra, due hash e qualche conto per tratto (una seconda famiglia solo
dove l'ottava sfuma o c'è l'incrocio). Il tratteggio di E che sostituisce aveva due famiglie di righe sempre.

## Le tre mani

| | `?tratteggio=a` matita leggera | `?tratteggio=b` inchiostro fumetto | `?tratteggio=c` manga/street |
|---|---|---|---|
| dove | quasi solo ai bordi dell'ombra portata, al piede, sotto | dal tono: rado in penombra, fitto nel fondo | dal tono, più aperto dentro |
| tratto | sottile, grafite (il colore della cosa scurito) | pieno, nero caldo, incrocio e neri pieni nelle tasche | lungo, lungo i corsi, sporco (pennello secco) |
| muri | diagonale ~60° | quasi verticale | orizzontale (i corsi) |
| retino | — | — | a punti, solo sul suolo in ombra |
| filo | il più leggero lontano e sulle cose fini | pieno davanti | in mezzo |

Dal vivo: `window.__TRATTEGGIO.imposta('a'|'b'|'c'|0)` (0 com'è oggi, anche il tratteggio di luce3 torna; solo uniform).

## La raccomandazione

**`b` — inchiostro fumetto.** È l'unica in cui il tratteggio fa il suo lavoro anche sul telefono (a 1 px per px CSS i tratti sottili di `a`
nell'ombra blu quasi spariscono), segue la luce e non il colore, e lascia puliti le cose al sole, le ringhiere e le chiome. `c` è la più
caratterizzata (il retino sul suolo funziona da vicino), ma lo sporco a passo piccolo sul telefono diventa rumore. Se si vuole meno
inchiostro, la stessa `b` con la forza (TH.y) a ~0,7.

## Seconda passata: D, la fusione di C e B (`?tratteggio=d1|d2`)

L'utente ha scelto C («manga/street»), con B buona anch'essa, ma «ancora troppo omogenea: non segue abbastanza superfici, forme e bisogni
espressivi». D parte dal tratto di C (lungo, lungo i corsi, sporco) e prende da B il tono e il peso (incrocio nel fondo, neri pieni nelle
tasche). Poi spinge l'espressività, sempre dentro il passo unico (nessun passo nuovo):

- **La forma**: sui muri il tratto va lungo i corsi, cioè in orizzontale nel mondo. Su tronchi, colonne, pali e paracarri diventano anelli
  che girano attorno, continui da faccia a faccia: la riga è la quota, non la faccia. Il suolo va in orizzontale sullo schermo, i tetti giù
  per la falda. La pendenza cambia per zone con un rumore largo e continuo, mai per faccia e mai un angolo unico.
- **Dove succede qualcosa**: oltre a bordo dell'ombra portata, piede dei muri e sotto (gronde, tende), D addensa il segno sul **lato in
  ombra dei volumi**, subito oltre il terminatore, e negli **angoli e contatti**. Questi si leggono dalla piega della profondità a ~35 cm:
  2 letture sul telefono, 4 al computer, solo nei pixel in ombra.
- **I vuoti veri**: dentro le ombre larghe il tratto c'è solo a chiazze (rumore largo con soglia), altrove resta il tono piatto.
- **La gerarchia**: più inchiostro attorno al giocatore (+25% entro 3 m), meno lontano (−50% oltre 16 m), meno sulle cose fini e sulle chiome.
- **La varietà**: lunghezza, spessore e passo dei tratti cambiano per zone (tre rumori larghi). Ogni tanto c'è un tratto d'accento pieno.
  Nel fondo ci sono i puntini e lo sporco da fumetto di strada.

`d1` è la versione **più pulita**: poco sporco, pochi puntini, niente retino. `d2` è la **più sporca**: pennello secco, puntini nel fondo,
più accenti, retino a punti sul suolo in ombra.

Tavola: `_immagini/tratteggio/tratteggio2.jpg`, colonne oggi | B | C | D1 | D2. Righe:
- la Piazza con alberi e ringhiere;
- un'altra piazza con facciate, volumi e persone in ombra;
- il personaggio in ombra nel vicolo;
- in fondo il telefono: oggi | D1 | D2 sulla piazza, D1 | D2 nel vicolo.

Nella seconda riga la colonna C viene da un'altra ripresa: nella stessa sessione la prima foto dopo l'arrivo usciva senza le ombre degli
alberi. Le altre colonne di ogni riga sono dello stesso istante.

**Consiglio: D1 come base.** Segue la forma e lascia respirare le ombre larghe, e sul telefono resta leggibile. D2 va bene da vicino e nei
vicoli; a distanza i puntini diventano grana. La prossima mossa, se piace: D1 con gli accenti e i puntini di D2 solo entro ~8 m dal
giocatore.

## Terza passata: D3 di serie

L'utente ha scelto D2 («sporca»), ma un poco più pulita. **D3** sta fra D1 e D2, più vicina a D2: lo stesso tratto, lo stesso tono e la
stessa forma. Lo sporco (il pennello secco), i puntini e il retino a punti sul suolo restano però solo **nell'ombra fonda** e **vicino al
giocatore e alla camera**: pieni entro ~5 m dal giocatore e ~4 m oltre il suo piano, spenti oltre ~16 e ~14 m. Così lontano non diventa
mai grana. Il costo sul telefono è lo stesso: due distanze in più, nessuna lettura nuova.

**D3 è di serie, sul computer e sul telefono**, senza interruttore. `?tratteggio=oggi` (o `?vecchio`) torna com'era: il modulo non tocca
niente. `?tratteggio=a|b|c|d1|d2` dà le altre mani. Il modulo resta fuori dall'impronta dei tasselli (l'impronta non cambia).
Tavola: `_immagini/tratteggio/tratteggio3.jpg`, D2 | D3 sulla piazza e nel vicolo, più il telefono sulla piazza (sulla piazza del computer D2 viene da una ripresa precedente). Prova di fumo con D3 di serie: `errori []`.

## Quarta passata: D3 a grappoli (sempre di serie)

L'utente su D3: «quasi, ma copre ancora tutto in modo omogeneo, si legge come rumore su tutta l'immagine, come se non ci fosse; più leggera
e molto più interrotta». D3 resta la mano di serie, ma ora:

- **Le ombre larghe sono tono piatto, senza tratti.** Il segno nasce solo a grappoli:
  - lungo il bordo dell'ombra portata e il terminatore, in una fascia che si spegne entro ~0,8 m;
  - negli angoli e nei contatti;
  - sotto gronde e tende;
  - al piede dei muri (ora entro 1,2 m).
- **Dentro i grappoli, interruzioni larghe**: un rumore a ~1,5 m spegne chiazze intere e i tratti si fermano.
- **Incrocio, neri pieni, puntini e retino solo nel cuore dei grappoli**, e i puntini sempre vicino al giocatore.

Il tratto, lo sporco e i puntini vicino al giocatore sono quelli di prima. Il costo sul telefono è lo stesso (le stesse letture). Tavola:
`_immagini/tratteggio/tratteggio4.jpg`, D3 prima | D3 ora sulla piazza, nel vicolo e sul telefono.

## Il «vicolo» delle tavole e l'aria

**I due rettangoli rosa/beige e il pavimento piatto del vicolo** (tutte le tavole fino a `tratteggio4.jpg`) non venivano dal tratteggio.
Lo strumento delle foto metteva il giocatore a (1420, 365) senza controllare il posto: è una casella `BLD`, cioè **dentro una casa**.
- La camera taglia la casa in cui sta il personaggio. Al posto del pavimento si vedeva il **coperchio piatto del taglio** (render.js VIS3,
  «la copertina»: tinta unita, niente lastricato), a 5,34 m.
- Il terreno lì è a 4,75 m: gambe e scarpe stavano sotto il coperchio. La **sagoma** del giocatore (VIS5, il modello ridisegnato dove è
  coperto) le mostrava come due macchie rosa/beige: la gamba col piede davanti e il piede dietro.

Nel gioco il giocatore non entra nelle caselle `BLD`. Il gioco non va corretto; ho corretto lo strumento (`scratchpad/tratt/shoot.js`):
ora porta il posto alla casella camminabile più vicina (`G.walkM`). Il vicolo della tavola `aria.jpg` è una via vera, col suo lastricato.

**L'aria** (`?aria=0` la spegne; di serie, anche con `?tratteggio=oggi`; `?vecchio` la spegne). È una velatura colorata dove due cose
si incontrano: muro e suolo, casa e casa, angoli e rientranze.
- Calda al sole (ocra-rosa), lilla/rosa in ombra, mai grigia; più tenue di notte.
- Morbida e a macchie (rumore largo, come un acquerello).
- Svanisce in ~1-1,5 m e lontano.
- Nel passo unico, nessun passo nuovo: per ogni pixel due letture della profondità (una coppia nella direzione che cambia per zone; quattro
  al computer). Il punto letto, se sta davanti al piano del pixel ed entro ~1,5 m, è una giuntura.
- Non è un SSAO pieno: niente sfocatura, niente rumore per pixel. È la stessa piega di D3 con un raggio più largo.
- Una distanza dalle sagome cotta nella mappa della città sarebbe più economica: non c'è ancora, ed è la prossima mossa se il telefono la
  sente.

Tavola `_immagini/tratteggio/aria.jpg`: prima | dopo, nel vicolo vero, sulla piazza, in un angolo fra due case e sul telefono. Al computer l'aria è discreta; sul telefono (meno pixel per metro) si legge di più. Prova di fumo con aria e D3 di serie: `errori []`.

## L'aria, seconda passata: su tutti i muri, cornici, finestre, colature

L'utente: «l'aria va bene: su tutti i muri, un po' più forte (al computer quasi non si vede), un alone disegnato che dia un bel 3D, con
sbavature e colature, attorno a cornici, finestre e porte».

- **Sotto ciò che sporge** (cornici, marcapiani, davanzali, gronde, balconi): per un pixel di muro si legge la profondità del punto 45 cm
  più in alto, proiettato sullo schermo; al computer anche 1 m più in alto. Se lì qualcosa sporge dal piano del muro, sotto nasce una
  macchia colorata che scende.
- **Le colature**: la macchia è rotta da strisce verticali ferme nel muro, di lunghezza diversa (pioggia, inchiostro che cola). Le cornici
  e i davanzali colano giù sul muro.
- **Finestre e porte**: la giuntura del vano (il riquadro rientrato) la prende la piega di prima. Sotto il davanzale c'è la macchia con le
  colature.
- **Piede dei muri e casa contro casa**: come prima.
- **Le sbavature**: il bordo della macchia è mangiato da un rumore più fine e il centro resta a chiazze larghe (acquerello). La tinta è la
  stessa: calda al sole, lilla in ombra, mai grigia.
- **Al computer più forte** (×1,35).
- **Costo sul telefono**: vedi sotto (le letture della piega).

Non ho usato termini per materiale, perché i muri fusi non sanno dove stanno le cornici: la quota dentro la facciata non c'è nei dati dei
materiali. La lettura «sopra» nel passo trova ogni cosa che sporge, su tutti i muri, senza cuocere niente.

**I puntini e gli archi arancio** sul suolo dell'angolo (`aria.jpg`, colonna dopo) erano dell'aria. Sul suolo piano la normale presa
dalla profondità trema a quadretti e lontano la profondità fa gradini (a 24 bit). Le coppie di letture prendevano quel tremolio per una
giuntura: la tinta calda del sole faceva trattini e anelli arancio. Correzione:
- le due letture opposte contano solo con la **somma** dei loro spostamenti fuori dal piano: su un piano si annullano, qualunque sia
  l'errore della normale;
- la normale è raddrizzata (il suolo in piano, i muri in piedi);
- la soglia sale con la distanza;
- la macchia sotto ciò che sporge confronta la profondità attesa sul piano del muro con quella letta, senza usare la normale.

Poi due coppie perpendicolari anche sul telefono: con una coppia sola, nella direzione che cambia per zone, la macchia attorno al
marciapiede e ai pali veniva ad archi e strisce. Una giuntura conta solo da ~40 cm in su: il gradino del marciapiede e i cespi d'erba (che facevano strisce arancio sul suolo) non fanno macchia; le cose sottili in piedi (i fili d'erba, dove la profondità salta già dentro un quadrato di 2 px) non si tingono.
L'aria vale solo su suolo, muri e tetti (le categorie 1-3 dell'alfa). L'erba e le cose minute (categoria 5) sono in piedi come muri: prendevano
le colature e facevano strisce arancio attorno ai cespi.
Letture sul telefono: quattro dappertutto e cinque sui muri (una sopra). Al computer: quattro e sei. Restano letture di profondità nel
passo che c'è già, nessun passo nuovo.

Tavola `_immagini/tratteggio/aria2.jpg`, prima (senza aria) | dopo (aria2). Righe: una facciata da vicino (cornice, finestre, porta), il
vicolo, l'angolo, il telefono. L'aria della prima passata è in `aria.jpg`. Il vicolo e il telefono sono stati ripresi prima delle ultime due correzioni (categorie 1-3, cose sottili), che cambiano solo erba e cose minute. Prova di fumo: `errori []`.

## La grana a rettangoli sul telefono vero (precisione)

Sul telefono vero (APK) l'utente vede una grana orizzontale a rettangoli, come un disturbo. Non dipende dalle tessiture.
- **La causa principale**: il passo unico sul telefono è in `precision mediump float`, perché la profondità nel passo in highp c'è solo al
  computer (`PRO.prof`).
  - La grana d'emulsione di render.js (`[ad]`, `AD.grana` = 0,014 sul telefono) calcola `fract(sin(dot(gl_FragCoord + tempo×12…)) ×
    43758)`, e così il dither contro le bande. In mediump (16 bit sui Mali e sugli Adreno) l'argomento, decine di migliaia, ha passi
    di 16-32: due o tre pixel vicini nella stessa riga prendono lo stesso valore, e ogni riga cambia. Da qui i rettangoli orizzontali.
  - Il tempo × 12 cresce senza fine: dopo qualche minuto l'argomento trabocca.
- **In tratteggio.js**:
  - il caso era lo stesso `fract(sin(…))`, con argomenti fino a ~10⁵ (le celle dei tratti); i telefoni perdono le cifre del seno di
    argomenti grandi;
  - la coordinata delle colature stava in mediump (a 650, passi di mezzo metro).

Correzione, tutta in `tratteggio.js` (render.js non cambia e l'impronta dei tasselli resta quella):
- il caso è ora l'hash di Hoskins, senza seno, in highp e su coordinate avvolte (0-4096);
- la grana e il dither del passo sono riscritti con lo stesso caso, col tempo avvolto;
- le coordinate delle colature restano in highp.

`?simmediump` (solo per le prove) ridà dal vivo la grana e il dither di prima, con l'argomento arrotondato a mezza precisione:
`__SIMMEDIUMP.imposta(true)`. In SwiftShader, che calcola sempre in 32 bit, è l'unico modo di vedere il difetto.

Gli **aloni arancio** attorno al lampione e all'edicola dell'angolo (`aria2.jpg`) erano l'aria sul suolo al sole. Ora sul suolo al sole
la macchia è meno della metà e la tinta calda è più tenue (ocra chiaro invece di arancio).

In SwiftShader la grana simulata in mezza precisione si vede appena: la grana d'emulsione è debole (±0,7%). I quadratini e i
rettangoli più probabili sono altri due, tutti di D3 sul telefono:
- lo **sporco** del pennello secco, che spegneva il tratto a celle di 1/5 × 1/2,5 di fila, cioè rettangolini allungati lungo il tratto
  (in orizzontale sul suolo);
- i **puntini** a celle di ~3 px.

Sul telefono, a 1 px per px CSS, erano grandi 1-2 pixel e strisciavano a ogni passo della camera. Nella mano pulita del telefono non ci
sono più (vedi sotto).

## Pulito (l'utente al telefono: «sporco, rumorosissimo, lacrimano gli occhi»)

- **Fermo nel mondo.** Tratti, puntini e macchie usavano le coordinate meno l'origine `eO` del passo, che salta ogni 64 m: a ogni salto
  tutto il disegno cambiava di colpo. Ora usano il punto nel mondo così com'è (highp). Il caso è avvolto ogni 4096 celle.
- **Niente sotto i ~4,5 px.** Il passo dei tratti non scende sotto 4,5 px sullo schermo, anche quando il regolatore abbassa le righe;
  prima, a 310 righe, arrivava a 3 px e strisciava. Le colature (strisce di ~15 cm) svaniscono prima di diventare di 2 px. Le macchie
  dell'aria sono lavature larghe (~1-2 m), senza la sbavatura fine.
- **Meno rumore.**
  - La grana d'emulsione del passo (render.js `[ad]`, un valore nuovo per pixel 12 volte al secondo) è spenta; `?grana=1` la riaccende.
  - D3 ha meno tratti e più lunghi (passo 6,2, densità −15%).
  - Lo sporco e i puntini restano solo entro ~3-7 m dal giocatore, e radi.
  - Niente retino a punti.
- **Niente puntini dai tratti.** Un tratto visto di scorcio, più corto di ~10 px sullo schermo, svanisce invece di diventare un puntino
  che striscia; sotto ~1,5 px di spessore schiarisce invece di spezzarsi. Nelle prime foto di `d3t` i muri di sbieco erano pieni di
  puntini neri. E sui muri di sbieco (45°) la scelta del piano dei tratti cambiava da un pixel all'altro: ora in D la fila è la quota e
  il «lungo» è x + 0,37·z, uguali su tutte e due le facce; e dove il piano dei tratti si schiaccia sullo schermo (una coordinata quasi
  ferma: le file non si risolvono) il tratto svanisce: erano le file di puntini sotto le cornici.
- **La causa vera dei puntini** l'ho trovata spegnendo una parte alla volta. In D la densità dei tratti saliva negli angoli secondo la
  piega letta dalla profondità pixel per pixel, e sul lato in ombra secondo la normale dalla profondità. Tutte e due tremano da un pixel
  all'altro, e un tratto che c'è o non c'è a seconda del pixel diventa una fila di puntini. Ora la piega dei tratti è spenta (gli angoli
  li tinge l'aria) e il lato in ombra usa la normale raddrizzata.
- **Il filo non si rinforza più vicino** (d3, d3t): moltiplicato per 1,25 vicino al giocatore, il filo dei bordi (il salto di profondità, che lungo una cornice
  lontana scatta un pixel sì e uno no) diventava una fila di puntini sotto le cornici.
- **Il telefono di serie usa `d3t`, la mano pulita**: niente sporco, niente puntini, niente retino. `?tratteggio=d3` ridà quella del
  computer. Senza telefono resta `d3`, la versione calma.

Tavola `_immagini/tratteggio/pulito.jpg`: prima | dopo, telefono e computer, con i ritagli 2×.
- Prima: la build di prima, `d3`.
- Dopo: `d3t` sul telefono e `d3` al computer.
- Nella foto «prima» del computer il lastricato non era ancora arrivato: è un limite della ripresa.
- Al computer restano pochi puntini sui muri; sul telefono non si vedono più.

Prova di fumo: `errori []`.

## Cosa resta

- La mappa d'ombra copre solo l'area attorno alla camera: oltre, il tono torna dalla sola normale e dal valore.
- Il tratto che gira attorno ai cilindri (D) segue la quota: su un cilindro inclinato o su una sfera non gira (il passo conosce solo la normale delle facce).
- Non misurato sul telefono vero (fps); in SwiftShader il passo non cambia passi né risoluzione.

Interruttori: di serie d3 e l'aria; `?tratteggio=oggi|a|b|c|d1|d2|d3|d3t` (`d3t` di serie sul telefono), `?aria=0`, `?grana=1`, `?simmediump` (prove). Strumenti della tavola: `scratchpad/tratt/shoot.js` (una sessione, le mani cambiate dal vivo).
