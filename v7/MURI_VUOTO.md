# MURI A VUOTO — [muri_vuoto]

Il direttore artistico, al Vico del Glacis verso l'arco (via `Vico del Glacis`, t = .1, verso 1; camera7, ore 15, città a tasselli):
«il muro che continua a vuoto sulla destra oltre la casa, un metro di muro senza nulla dietro».

## 1. La causa, in quel posto

Il muro è la **facciata nord di casa_473 (Casa Cocco)** che continua **1,60 m oltre il suo spigolo ovest**, verso il Viale della
Spianata: una lastra di moduli del kit (muro, zoccolo, fascia del piano, parapetto) alta due piani, col nucleo scuro, il tetto e la
facciata ovest (gialla, al sole) che finiscono 1,60 m prima. Dietro la lastra c'è il marciapiede: niente. È la lastra scura col
graffito tondo nella foto del direttore (`_immagini/muri_vuoto/diagnosi.jpg`, #0 e #1).

Perché: casa_473 è un **lotto di [pianta]**. Il sottopasso di Vico del Glacis (il pezzo `arco_sottopasso`) si posa dopo le case; la
regola [compenetra] di `world_cittanuova.js` arretra la casa che gli entra dentro: casa_473 passa da 3 caselle (6 m) a una scatola di
**4,40 m** (`lw = 4.4`, `cx = 1476.2`). `render.js` monta la casa attraverso la vista del lotto (`BLD()`, `vistaLotto`): `b.w = 2,2`
caselle. **`buildModular` posava i moduli da 2 m casella per casella, `for (k = 0; k < sd.n; k++)`, cioè k = 0, 1, 2 su n = 2,2: tre
moduli, 6 m di facciata su un lato di 4,40.** L'ultimo modulo esce dallo spigolo di (ceil(n) − n) × 2 m. Il lato nord conta da est
(`at(k) = x0 + w − 2k − 1`), quindi la lastra esce a ovest: da x = 1474 a 1472,4, sul fronte del Viale. Il lato sud di casa_473 esce
uguale a est (1478,4 → 1480,0), nel cortile dietro il sottopasso.

Lo stesso posto ha anche **casa_469 (lato W, 1,50 m)**: la casa sul lato nord del vicolo, arretrata a 2,5 m di fondo, ha la facciata
ovest che scende di 1,5 m oltre il suo spigolo sud, verso il vicolo (dietro casa_472: dalla camera non si vede).

### I candidati scartati

| candidato | verifica | esito |
|---|---|---|
| estrusione della facciata o del muro in comune oltre l'impronta | le case del borgo non hanno estrusioni: sono moduli del kit (`buildModular`), i rilievi d'epoca (`epDecora`) usano la lunghezza vera `L = w` | è proprio il filo dei moduli, non un'estrusione |
| muro di cinta / muro di confine | `buildWalls` (caselle muro: blocco pieno 2 × 2 m con la copertina, sempre dentro la sua casella); `strumenti/muri_vaganti.js` sui muri dei pezzi | in città 0 monconi, 0 cortine senza casa dietro, 0 muri dentro casa |
| zoccolo o fascia oltre lo spigolo | lo zoccolo è `w + 0,2` (10 cm per parte, voluto); le fasce (`border`) seguivano lo stesso filo dei moduli | le fasce sforavano con i moduli: stessa causa, stessa cura |
| `casette()` che lascia il muro del vicino | le case levate non lasciano geometria: `cieca4` cambia solo le finestre in muro pieno dove la casella accanto è di un'altra casa, non costruisce niente | escluso (17 casette tolte, nessun muro rimasto) |
| rifinitura dello stile E (`rifinitura_costruito.js`) | solo shader (tinte, righe dei giunti), nessuna geometria | escluso |
| tasselli diversi dalla città viva (`tasselli.js`) | l'impronta dei tasselli scaricati (`48196fd63f899c14`) è quella di main: i tasselli sono cotti con lo stesso `render.js`; un raggio orizzontale contro il filo della facciata, nel gioco coi tasselli, trova la lastra a 0,91 m (dove la scatola è già finita) | non è uno scarto di cottura: il difetto è nel sorgente, e quindi in tutti e due |

## 2. La città intera

`node strumenti/muri_vuoto.js` (in node, pochi secondi, sui dati del mondo): per ogni casa e ogni lato rifà il filo dei moduli di
`buildModular` e guarda **dietro** la parte che esce dallo spigolo (30 cm verso la casa): se lì non c'è un'altra casa alla sua
altezza né un pezzo pieno (le caselle BLD dei pezzi, il sottopasso), quel pezzo di muro è «di carta».

**Prima** (`PV_MURI_VUOTO=vecchio`, la regola di main; `reports/muri_vuoto_prima.json`):

| | |
|---|---|
| case misurate | 518 |
| lotti di [pianta] (scatola diversa dalle caselle) | 155 |
| con almeno un lato non multiplo di 2 m | 154 |
| lati frazionari | 406 — **tutti** coi moduli oltre lo spigolo |
| di cui **a vuoto** (≥ 25 cm di lastra senza niente dietro) | **149 lati**, tutti in città |
| lunghezza a vuoto al piano terra | 109,1 m |
| superficie di muro di carta (tutti i piani) | 515 m² |
| quanto escono (i 149) | ≥ 1,5 m: 11 · 1–1,5 m: 23 · 0,5–1 m: 71 · < 0,5 m: 44 |

Gli altri 257 lati escono dentro la casa accanto: non si vedono, ma sono compenetrazioni (spariscono con la stessa cura).
I peggiori: casa_99 N (Cartoleria Sanna, 1,75 m), casa_191 E (1,55), casa_415 N (1,65), casa_378 E (1,45), casa_140 E e W (1,25),
casa_255 E, casa_264 E, casa_142 N (Latteria Usai, tre piani), Condominio Mare E e W (1,05), casa_279 E (Circolo dei Lavoratori),
casa_442 N, Uffici del Garante E e W (1,80), casa_192 W, casa_473 N e S (1,60, il posto del direttore), casa_469 W (1,50).
L'elenco intero con le coordinate è nel rapporto.

**Le altre famiglie dello stesso difetto** (`node strumenti/muri_vaganti.js`): cortina dei portici senza casa dietro 0 m, monconi di
muro isolati 0 in città (1 sull'isola, fuori dalla città), muri dentro una casa 0, muri in carreggiata 2 (il Gradone del Mercato: è
una scalinata, voluto). E una famiglia piccola trovata leggendo `buildCase`: **le macchie grandi d'intonaco (1,6–2,6 m) e i manifesti
posati a cavallo dello spigolo**, fino a 1,3 m di decalcomania nel vuoto (sorteggiati: uno su quattro lati visti), anche sulle case a
caselle intere.

## 3. La cura (alla radice, nel percorso normale)

`render.js`, **solo la generazione dei muri delle case** (nessuna riga delle ombre né della triangolazione del suolo):

- `buildModular`, righe ~5898–5980: i lati prendono `nF` (moduli interi), `rem` (l'avanzo) e `sc`. Sul lato frazionario **i moduli
  interi restano dove erano** (u = 2k + 1: finestre, porte, `b.__win`, le aperture dei graffiti e delle scale non si muovono) e
  l'avanzo diventa **un modulo di muro pieno stretto quanto manca allo spigolo** (`fill`: lo stesso pezzo del kit, `scale.z = rem`),
  per il piano terra (muro e `wall-low`), le fasce, i piani sopra (anche le finestre a nastro, a coppie dentro i moduli interi) e il
  parapetto del lastrico. Il lato più corto di un modulo (le casette di 1,8 m) ha **un modulo solo, stretto a misura** (`sc`). La
  vetrina larga e le vetrine della bottega stanno sui moduli interi; la scala esterna della marina idem. Nessun modulo esce più dalla
  scatola: ogni muro appartiene a un volume.
- `buildCase`, righe ~17090–17096: il manifesto, la macchia grande e l'umido ai piedi del muro stanno tutti sul muro (centro e
  larghezza dentro `[0, L]`); gli stessi numeri a caso nello stesso ordine, la città resta disposta uguale.
- `tetti.js` (`apModuli4`, che rifà le aperture di `buildModular` per le scale dei tetti, `test_scale_finestre`): la stessa regola.

**Dopo**: `node strumenti/muri_vuoto.js` → 0 lati oltre lo spigolo, 0 m a vuoto (`reports/muri_vuoto.json`).

**Nel gioco, con i raggi** (`strumenti/muri_vuoto_foto.js`, tutti i 149 casi, `reports/muri_vuoto_raggi.json`): per ogni caso un raggio
orizzontale a piede + 1,5 m, da 1 m fuori dal filo della facciata verso il muro, nel mezzo del pezzo oltre lo spigolo, e uno di controllo
sul muro vero (0,8 m dentro lo spigolo).
- prima (main, tasselli): dove il tassello risponde ai raggi (il controllo trova il muro: 98 casi su 149) la lastra c'è in **80**;
- dopo (ramo, città dal vivo con `?tutto`): il controllo trova il muro in 149 su 149; dei 98 di prima la lastra è **sparita in 53**;
  in tutta la città restano 43 colpi oltre lo spigolo, nessuno dei quali è la lastra: 24 sono il muro della casa accanto, a filo davanti
  (il raggio parte dentro di lei: la lastra stava dietro, contro il suo muro, e si vedeva dal vuoto alle sue spalle), 16 sono il
  pilastrino d'angolo o il pluviale sugli sforamenti ≤ 40 cm (il raggio passa a 15–20 cm dallo spigolo), 3 cose davanti al muro (il
  portico della Palestra Nello, una tenda, un pluviale). Gli stessi 27 colpi c'erano anche prima.

**Prestazioni**: uguali o meglio. Ogni modulo che sforava è sostituito da un modulo stretto (stesso numero di oggetti; il muro pieno ha
meno vertici di un modulo con la finestra); le case si fondono come prima.

## 4. Le tavole

- `_immagini/muri_vuoto/diagnosi.jpg` — il posto del direttore (AD: la camera del gioco, come la sua foto) e 16 casi fra i peggiori
  col davanti libero, nel gioco di main (città a tasselli, 15:00), cerchiati, con la causa misurata (lato, lunghezza vera, moduli, metri
  oltre lo spigolo). Nei vicoli stretti la camera del gioco sbatte nei muri: per i 16 casi la sonda usa il renderer del gioco (materiali,
  luce, stile E) con la camera messa alta e di sbieco fuori dal muro.
- `_immagini/muri_vuoto/dopo.jpg` — gli stessi posti dalla stessa camera, prima (main, tasselli) e dopo (questo ramo; la città costruita
  dal vivo con `?tutto`, perché i tasselli vanno ricotti). Nel posto del direttore (AD, #1) la lastra scura col graffito tondo oltre la
  facciata gialla non c'è più; idem il Condominio Mare (#6), la Farmacia Tina (#12), casa_254 (#10) e gli altri.

Le foto: `strumenti/muri_vuoto_foto.js` (la sonda nel gioco, da far girare con lo slot condiviso dei browser) e
`strumenti/fogli_muri_vuoto.py` (le tavole).

## 5. L'impronta dei tasselli

**Cambia** (`render.js` e `tetti.js` sono nella città cotta): `IMPRONTA_TASS` da `48196fd63f899c14` a **`0be75535833d7c34`**. **Servono i tasselli ricotti**; finché non ci sono, il gioco costruisce la città dal vivo (come `?tasselli=0`).
Anche `mondo_cotto.js` è stato ricotto da `build.py` (i tetti vissuti leggono `tetti.js`).

## 6. Le prove

- `python3 build.py`: index.html, editor.html, mondo_cotto.js (ricotto: i tetti vissuti leggono `tetti.js`).
- Fumo: `fumo6.js` → `errori []`.
- `test_scale_finestre` (le aperture che `tetti.js` rifà da `buildModular`): tutte passate (0 scale su 156 davanti a un vano).
- Le prove in node: nessuna prova nuova fallita. Quelle che falliscono falliscono uguali su main: test_tetti4 9 (stesse righe; la
  copertura della marina sale da 3% a 45%, i giri da 4 a 5), test_percorsi 1 (main 2: il giro del Forno ora passa), test_tasselli 1, test_strade_integre 1,
  test_posa 6, test_imperfezioni 2, test_costa2 1; e, già fallite su main anche se non in elenco, test_campagna 2, test_citta_viva 2,
  test_vievive 1, test_writing 1 (stesse righe su main).
