# Porto Vecchio sul telefono: fluido, seconda passata ([fluido2])

Ramo `fluido2` (da `origin/claude/shader-styling-performance-wbvqfy`, 662899e). Tavola: `_immagini/fluido/fluido2.jpg` (inizio e porto,
prima | dopo, coi numeri sotto). Tutto dietro il profilo del telefono (`PHONE` di render.js, `PV_TELEFONO`, il regolatore `fluido_tel.js`):
il computer non cambia.

## Blocchi o lentezza?

La prima richiesta erano i blocchi («si blocca»). `strumenti/banco_blocchi.js` fa una passeggiata scritta (a piedi inizio → porto → Piazza
Grande, poi in BMX verso i luoghi lontani) col profilo del processore acceso e dà il colpevole di ogni fila di lavoro oltre 50 ms. Il primo giro
è servito poco: la macchina era carica di un altro banco (fotogrammi da secondi, tutti attese della scheda video: `texSubImage2D`,
`getProgramParameter` di peso_pronti) e il passo scritto agganciava `G.step`, che il gioco chiama dalla sua chiusura (il giocatore non si è
mosso; ora il passo va col `requestAnimationFrame`). Poi l'utente ha chiarito: **il gioco non si blocca, va a ~7 fps sempre**. Quindi la
priorità è diventata il costo medio del fotogramma. Il banco dei blocchi resta, non è stato rigirato.

## Cosa cambia sul telefono

1. **1 px per px CSS** (`render.js` resizeHD, `?telpr=`): la soglia era 1,25. Nel Game Boy 365 righe invece di 456 (−36% di pixel),
   minimo 260 righe. Il passo unico e i suoi fili restano in «pixel stabili».
2. **Due passi a tutta tela invece di quattro** (`eDist`, `?noedist1`): la distanza con segno dalla sagoma delle persone (il contorno e il
   bollino dello stile E) in un passo solo a mezza risoluzione: la copertura della maschera in un quadrato di 8×8 px (16 letture bilineari
   agli angoli dei texel, la media esatta), lineare per ±4 px attorno al bordo; il passo unico la usa fino a 3,5 px. Il quadrato si allarga
   se la risoluzione sale. Restano la scena e il passo unico.
3. **Nebbia più vicina e piano lontano subito dopo** (`nebbiaTel`, `?nonebbiatel`): la nebbia a 0,62 (era 0,8: a piedi vicina 49 m,
   lontana 146) e il piano lontano alla nebbia piena + 4 m (era almeno 170 m per la sfera del cielo). La cupola del cielo segue il piano
   lontano e all'orizzonte ha il colore della nebbia.
4. **Le case lontane come volumi** (`LODT`, `?nolodcase`): per ogni settore di 48 m tutto oltre il 40% della nebbia (~88 m a piedi), le case
   fuse si spengono nel solo disegno della scena e al loro posto c'è una mesh di scatole (la sagoma del caricamento ad anelli, `massaGeo1`:
   muro e tetto un po' più scuro). Le ombre restano quelle vere. All'inizio 36 settori su 49 lontani: fusione1 da 414k triangoli e 125
   disegni a 294k e 100.
5. **Le persone** (`genteTel`, `peso_gente.js`; `?nogentetel`, `?nosempltel`): oltre il 30% della nebbia o oltre le 22 più vicine non si
   disegnano (mai sotto i 25 m) e non si animano finché sono spente; la versione lontana (sotto 40 px) si semplifica a celle di 3,5 cm per
   osso e colore. Nei due posti misurati non è scattato: le persone in vista erano poche e vicine (il grosso di «Group» è il fogliame).
6. **Il braccio della camera** (`cast7`, `?nobracciotel`, `?nobvhpiccole`): un raggio quasi uguale a uno calcolato davvero nel fotogramma
   prima si riusa (25 cm, 1,8°: ogni raggio si rifà almeno a fotogrammi alterni) e l'indice dei raggi anche sulle mesh piccole da 32
   triangoli in su: le prove triangolo per triangolo all'inizio da 40.000 a 2.300 a fotogramma.
7. **Il regolatore** (`fluido_tel.js`, `?fluidotel2=0`): parte dal gradino 2 (insegne lontane spente, tratteggio di luce3 spento), scende ogni
   2 s invece di 3, e ha tre gradini nuovi: 4 la scena senza MSAA, 5 le righe all'85% (310 nel Game Boy), 6 al più 16 persone fino al 15%
   della nebbia e l'ombra del sole ogni 3 fotogrammi. A 7 fps arriva in fondo in ~8 s; risale se avanza margine.

## Prima e dopo (una passata, `banco_fluido.js --nf=120`, telefono, processore ×4)

Il regolatore non è fermato dal banco: prima era al gradino 4 (vecchio), dopo al 6 (nuovo), cioè il punto dove arriva un telefono lento.
La piazza non c'è: il banco di prima è stato fermato dal tetto di tempo dopo il porto.

| | inizio prima | inizio dopo | porto prima | porto dopo |
|---|---:|---:|---:|---:|
| JS per fotogramma, ms (×4) | 416 | 437 | 654 | 457 |
| · grafica / altro / simulazione | 345 / 54 / 17 | 359 / 58 / 20 | 558 / 76 / 21 | 378 / 61 / 18 |
| disegni (scena / ombra / passi) | 579 (522 / 53 / 4) | 549 (506 / 41 / 2) | 427 (331 / 91 / 4) | 419 (337 / 80 / 2) |
| triangoli (migliaia) | 1237 | 1046 | 689 | 738 |
| risoluzione della scena, MSAA | 769×456, 2× | 523×310, no | 769×456, 2× | 523×310, no |
| Mpx dei passi dopo la scena | 0,61 | 0,20 | 0,61 | 0,20 |
| SwiftShader ms: scena | 3804 | 858 | 2574 | 645 |
| SwiftShader ms: passi (mezzi + unico) | 107 + 234 | 4,5 + 53 | 147 + 198 | 5 + 61 |

**Il lato della scheda video** (quello che SwiftShader misura bene in proporzione): −75/−77% sulla scena, −81/−83% sui passi, cioè circa 4×
meno lavoro per pixel al gradino 6 (al gradino 2 di partenza: −36% di pixel e −2 passi, MSAA ancora acceso).
**Il processore**: all'inizio uguale (rumore della macchina condivisa, ±10%), al porto −30%. Triangoli −15% all'inizio, al porto più
gente e verde in vista nella passata dopo (+7%: lo stato del mondo non è identico fra due passate).

## Cosa resta (onesto)

- **Il processore non è sceso di 4 volte.** Il grosso è three: la proiezione delle ~29.000 mesh della città costruita nel browser, 550
  disegni e 110 programmi. Sull'APK la città arriva a tasselli (qui non misurata): è lì che va misurato il processore vero.
- **Il fogliame istanziato** (blob da 494 e 326 triangoli, ~150k all'inizio) e i tronchi: un blob più semplice sul telefono.
- **L'ombra del sole**: 16 letture per pixel (PCF morbido) e 40-90 disegni; la PCF semplice ne ha 13, non vale il cambio di programmi.
- **Materiali più semplici sul telefono** (meno programmi): non fatto.
- **Non misurati**: il telefono vero (fps, temperatura), i tasselli dell'APK, il gioco in movimento (banco_blocchi da rigirare a macchina
  scarica), la piazza. Lo smoke `fumo6.js`: `errori []` (la foto va in timeout come prima).

## Gli interruttori

`?telpr=1.25` (com'era) · `?noedist1` · `?nonebbiatel` · `?nolodcase` · `?nogentetel` · `?nosempltel` · `?nobracciotel` · `?nobvhpiccole` ·
`?fluidotel2=0`. Banchi: `strumenti/banco_fluido.js` (conta anche nebbia, case lontane, persone spente, TELQ, raggi riusati),
`strumenti/banco_blocchi.js`.
