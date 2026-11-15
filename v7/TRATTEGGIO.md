# Il tratteggio a mano ([tratteggio])

Ramo `tratteggio` (da `origin/claude/shader-styling-performance-wbvqfy`). Tavola: `_immagini/tratteggio/tratteggio.jpg`.

## Il problema

«Le campiture sono su tutto, anche su alberi e ringhiere; nell'ombra vanno bene, ma sono omogenee, regolari, piene, tutte uguali: sembra il
tratteggio di sezione di un disegno tecnico. E i contorni sulle cose fini sono troppi.» Le cause:

- **sul telefono** (dal gradino 2 del regolatore il tratteggio di luce3 è spento) torna quello del passo unico dello stile E: righe continue a
  passo fisso, un angolo per categoria, accese dal *valore* del pixel. Un muro arancio al sole, il disco della fontana, un palo: tutti rigati
  uguale. È il «retino CAD» della tavola (colonna «oggi», riga del telefono);
- **al computer** luce3 tratteggia nei materiali con le mappe dei toni: più fine, ma sempre lo stesso motivo ripetuto, e anche su tronchi e
  ringhiere;
- **il filo** (la sagoma dalla profondità, le pieghe, l'anello di D2) ha lo stesso peso su una casa e su una ringhiera o una chioma.

## Cosa cambia (solo con `?tratteggio=a|b|c`)

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

## Cosa resta

- La mappa d'ombra copre solo l'area attorno alla camera: oltre, il tono torna dalla sola normale e dal valore.
- I tronchi a cilindro non hanno ancora il tratto che gira attorno (il passo non conosce la normale liscia: solo quella delle facce).
- Non misurato sul telefono vero (fps); in SwiftShader il passo non cambia passi né risoluzione.

Interruttori: `?tratteggio=a|b|c`. Strumenti della tavola: `scratchpad/tratt/shoot.js` (una sessione, le mani cambiate dal vivo).
