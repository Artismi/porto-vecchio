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

## Cosa resta

- La mappa d'ombra copre solo l'area attorno alla camera: oltre, il tono torna dalla sola normale e dal valore.
- Il tratto che gira attorno ai cilindri (D) segue la quota: su un cilindro inclinato o su una sfera non gira (il passo conosce solo la normale delle facce).
- Non misurato sul telefono vero (fps); in SwiftShader il passo non cambia passi né risoluzione.

Interruttori: di serie d3; `?tratteggio=oggi|a|b|c|d1|d2|d3`. Strumenti della tavola: `scratchpad/tratt/shoot.js` (una sessione, le mani cambiate dal vivo).
