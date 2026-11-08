# Porto Vecchio — la finitura di F1 (`?urbanistica2`): perché le zone nuove sembravano un'altra città, e cosa è cambiato

8 novembre 2026. Il committente ha camminato F1 e ha ragione: nelle zone nuove il selciato aveva errori e pezzi staccati, non si
distingueva l'asfalto dal selciato, i passaggi non sembravano vie, e in alcuni posti erano spariti dettagli curati della città di prima
(una bottega, un'insegna, un murale). Qui la diagnosi (difetto → causa → rimedio) e quello che resta diverso.

| Immagine (`_immagini/f1qualita/`) | Cosa mostra |
|---|---|
| `diagnosi.jpg` | i 11 luoghi di F1 e 3 punti di controllo fuori (più il Sottopasso Cavour di riferimento): il sito di oggi e `?urbanistica2` com'era, camera obliqua fissa e pianta dall'alto; ogni difetto cerchiato col suo codice |
| `dopo.jpg` | la stessa tavola dopo il lavoro |
| `stile_a.jpg` | due luoghi con `?stile=A`: oggi, F1 prima, F1 dopo |
| `uguale.jpg` | la prova che senza `?urbanistica2` la città è la stessa di `origin/main` al pixel (tre punti, stesso seme, stesso fotogramma) |

Come sono fatte le foto: 1600 × 900, senza `?leggera`, ore 11, seme fisso (Math.random di `strumenti/tassella.js`), i tasselli del sito
(`tasselli-48196fd63f899c14`, quelli che il sito usa davvero) per «oggi». La colonna «obliqua» è una camera fissa (dietro il personaggio,
22 m, 46°, campo 38°) invece della camera del gioco: nelle pose ferme la camera del gioco si chiudeva sul personaggio in metà dei punti (anche
di serie), e la foto non diceva niente del suolo. La pianta è una camera quasi a piombo a campo stretto (13°, da 160 m).

---

## 1. Le cause

### Causa 1 — la città del browser non è quella del sito (vera, anche fuori da F1)

Con `?urbanistica2` la pagina non usa il mondo cotto né i tasselli e costruisce tutto nel browser. I **dati del mondo** fuori da F1 sono
identici (misurato in Node: griglia, larghezze di via, quote, vertici: zero caselle diverse fuori dalla cornice di F1; il mondo cotto è solo
una cache dello stesso calcolo). Ma la **città che si vede** no, perché alcune cose il sito le prende dalla cottura dei tasselli e il browser le
rifà a modo suo:

- **i graffiti** (C1): coi tasselli la storia dei muri è la lista cotta (`tasselli/graffiti.json`), diradata da `strada_dipinta.js`
  (`rimodella`) più fondali, porte e pali; senza tasselli `writer_vita.js` fa la storia nel browser con `strada_dipinta.js storia` intera,
  un solo caso per tutti i muri in fila. Risultato: **un'altra distribuzione in tutta la città** (il murale blu della sala giochi, le scritte
  della Rua, i pezzi dell'Androne cambiano o spariscono). Con F1 in più: i muri tolti spostavano il caso di tutti i muri dopo;
- **alberi e pezzi** (C2, C3): fuori da F1 la città del browser ha qualche albero di piazza in più e il pezzo del Sottopasso Cavour (il blocco
  col fornice) che nei tasselli del sito non c'è (foto C1_rua, R_cavour, colonne «oggi» e «?urbanistica2»). Non sono cose di F1: sono
  differenze fra la cottura dei tasselli (`strumenti/tassella_pagina.js`: entra solo quello che è fermo e messo da una fase della città) e la
  costruzione nel browser;
- **le botteghe** (B3, B4): `economia.js` e il gioco danno il mestiere alle case a partita iniziata, dopo il mondo. F1 controllava «niente case
  con nome o bottega» quando il mondo nasce, quindi non le vedeva: la **Falegnameria Efisio** (casa_228, la toglieva `casette()` perché
  restava sola) e il **Supermercato «La Spiga»** con la bandiera SPESA (casa_37, accorciata dal passo del Flipper) sparivano o perdevano il fronte.

### Causa 2 — il suolo lasciato dalle case tolte non era progettato (vera)

- **le vie nuove erano disegnate diverse da tutte quelle del borgo** (A8, A10): 2,8 m di riga di basoli contro gli 1,7 m di tutti i vicoli di
  serie, e il Vico della Torre era una curva di Chaikin che attraversava il lastricato dritto della striscia: una riga storta su un selciato
  dritto. Alcune vie non stavano in asse col vuoto fra le case;
- **gli slarghi erano ellissi a caselle** con un'aiuola d'erba (A7, A9): bordi a scaletta, e `render.js` (`alberiCitta35`, «erbacce ai piedi dei
  muri», «al margine del verde») ci seminava da sé cespugli, erbacce e, nelle caselle di piazza, un pino o un leccio a caso (B2: il pino che
  copriva la Corte del Calzolaio);
- **il Sottopassino non stava nel rilevato** (A1, A2, A4): il rilevato lì è alto 3 m sul suolo; il pezzo `sottopasso` con la volta di 3,8 m
  (più 1,6 m di muratura, `pezzi_citta.js`) usciva 2 m sopra il binario, un blocco col tetto piatto che interrompeva la linea; i vertici
  abbassati per 15 m tagliavano il rilevato a scalini (le caselle di ghiaia diventate selciato, a scaletta), e la via, con un vertice ogni metro,
  faceva mettere a `writing.js` il suo impalcato, che alzava il binario di altri 2,4 m;
- **le passerelle dei tetti** (A5) andavano dal tetto delle case al tetto piatto del blocco, sopra l'Orto;
- **case tolte senza dirlo**: `casette()` toglieva dopo F1 altre tre casette rimaste sole (casa_228, 377, 384), fuori dal piano.

### Causa 3 — i fianchi scoperti (in buona parte falsa)

`render.js` mette le finestre su ogni faccia che dà su uno spazio aperto (piani alti su tutti i lati, piano terra sul fronte e su sud/est,
lo zoccolo, le grondaie, i pluviali): i fianchi che F1 scopre si vestono da soli come quelli di serie (Androne, Vico della Torre, Passo del
Calzolaio nelle foto). Resta che una faccia di fondo su un passaggio prende le finestre anche dove la regola dei muri di fondo
(URBANISTICA2.md) la vorrebbe cieca: `render.js` sta nell'impronta dei tasselli e qui non si tocca (la richiesta resta `b.muroFondale`).

---

## 2. I difetti (diagnosi.jpg) → la causa → il rimedio

| Cod. | Difetto | Causa | Rimedio (tutto in `src/urbanistica2.js`, solo con `?urbanistica2`) |
|---|---|---|---|
| A1 | il Sottopassino, un blocco 2 m sopra il binario; il binario sparisce sotto un tetto piatto | volta di 3,8 m in un rilevato di 3 m; l'impalcato di `writing.js` | volta pedonale di 2,4 × 4 m alla quota dell'Orto; il colmo del rilevato sale di quel che serve (0,7 m, col binario che lo segue al 3% in 22 m per parte) e il pezzo finisce sotto la massicciata: il treno passa sopra. La via non ha vertici sul binario (niente impalcato) |
| A2 | erbacce nel fornice | i vertici abbassati e le caselle di ghiaia diventate selciato accanto al pezzo | si toccano solo le caselle del passaggio (4 m), la rampa verso il Lungomare sotto il 12% |
| A4 | il suolo a scaletta accanto al fornice | come A2 | come A2 |
| A5 | le passerelle dei tetti verso il blocco | il tetto piatto del blocco era più alto delle case | il pezzo sta sotto il binario (le scale di ferro sul rilevato restano: sono quelle del Sottopasso Cavour, `tetti.js`) |
| A6, A7 | aiuole, cespugli e due alberi nella riga della via lungo l'Orto | l'aiuola d'erba (caselle GRASS) e il verde nuovo | via: l'Orto resta il lastricato di serie |
| A8 | la riga di basoli storta sul lastricato (Vico della Torre) | curva di Chaikin, 2,8 m | via dritta in asse con la striscia (1316) e con l'Orto (280,8), il gomito dentro lo slargo |
| A9 | erbacce sparse in mezzo agli slarghi, bordi a scaletta | ellissi a caselle, erba | slarghi a rettangolo come i due della Via delle Mura del pacchetto sicuro (`[urbanistica1]`, PIAZZA, niente casella di via); niente erba |
| A10 | la riga del Passo del Calzolaio larga e col gomito | 2,8 m | 1,7 m come i vicoli; esce sul sagrato (lastricato: la riga lì non si disegna) |
| B1 | fico e cespuglio sovrapposti nella Corte delle Monache | il fico del verde nuovo porta il suo cespuglio al piede | resta (il fico tiene nascosto il Covo, URBANISTICA2.md sez. 6): è il modo del verde nuovo |
| B2 | un pino a caso nella Corte del Calzolaio | `alberiCitta35` pianta un albero nel 5% delle caselle di piazza | le caselle dove `render.js` pianterebbe un albero restano selciato: ogni slargo ha la sua cosa sola |
| B3 | la Falegnameria Efisio sparita | casa_228 tolta da `casette()` | casa_228 resta; il passo le passa a ponente e scende sul sagrato |
| B4 | il Supermercato «La Spiga» senza fronte (SPESA) | casa_37 accorciata a est e a sud: da 18 a 8 caselle, `ordine.js` (a partita iniziata) sceglieva un'altra casa (casa_158, sulla Via delle Mura) | casa_37 si accorcia solo a est (il passo di 4 m; casa_330 accanto resta: regge il giro dei tetti, `test_percorsi`) e F1 la segna supermercato come la segnerebbe `ordine.js`, che la trova e non ne cerca un'altra; la porta e la bandiera restano sul passo. La corte va dietro la sala giochi (c'era già, chiusa), col pozzo |
| C1 | graffiti diversi in tutta la città (il murale della sala giochi, l'Androne, la Rua) | la storia dei muri del browser invece di quella cotta | con `?urbanistica2` la storia si fa come sul sito: la lista cotta intera (`tasselli/graffiti.json`), `rimodella`, fondali e porte; via solo i lavori sui muri che F1 toglie, accorcia o copre; quelli vanno sul muro nuovo più vicino (entro 12 m, uno ogni 2,5 m di muro, mai addosso a un altro: niente mucchi come gli 8 lavori sullo stesso metro di prima), altrimenti niente |
| C2, C3 | alberi in più, il pezzo del Sottopasso Cavour fuori da F1 | la costruzione nel browser contro la cottura dei tasselli | **non risolto**: sono differenze fra tasselli e browser che ci sono anche senza F1 (`?tasselli=0`); vedi sez. 4 |
| — | case tolte senza dirlo (228, 377, 384) | `casette()` dopo F1 | il piano le dice tutte: 377 e 384 tolte (la Corte del Flipper), 228 resta (la falegnameria) |

---

## 3. Le regole tenute

- **Le vie nuove passano per le stesse strade del generatore**: voci in `W.roads` di tipo `vicolo`, 1,7 m, epoca E0, la casella di via a 3 m
  come i vicoli di serie: la riga di basoli col bordo, la canaletta, le grate, il gesso, l'ordine dei suoli (`suolo.js`: i vicoli si fermano
  al bordo delle piazze, sotto l'asfalto e i marciapiedi), le erbacce al piede dei muri, i graffiti, le indicazioni le fanno i sistemi che ci
  sono. Dove sbocca di fronte a un vicolo di serie, la via nuova parte dal suo capo (un incrocio vero: `test_strade_integre` resta com'è).
- **Gli slarghi come quelli del pacchetto sicuro**: rettangoli di PIAZZA allineati alle case, niente voce in `W.sets` (le piazze del borgo
  restano quelle, a 34 m l'una dall'altra: `test_mappa_compatta`).
- **La regola del committente**: i passaggi restano 4 m fra i muri (il Passo della Corte 6), i gomiti dentro gli slarghi, le bocche larghe.
- **Le case**: 21 tolte e 3 accorciate, tutte nel piano (prima 19 tolte e 3 accorciate nel piano, più 3 tolte di nascosto da `casette()`).
  Nessuna che a partita iniziata diventa bottega sparisce o si sposta (controllato nel gioco: sez. 5).

---

## 4. Quello che resta diverso

- **C2, C3 — la città del browser contro i tasselli.** Fuori da F1, con `?urbanistica2` (e già con `?tasselli=0`, senza F1) qualche albero di
  piazza e il pezzo del Sottopasso Cavour non sono quelli del sito. Il rimedio vero è cuocere i tasselli con F1 (quando F1 diventa di serie,
  URBANISTICA2.md sez. 3) o far partire `?urbanistica2` coi tasselli di serie fuori dai settori di F1: `tasselli.js` e `render.js` oggi
  costruiscono o tutto o niente, e stanno nell'impronta.
- **I fianchi scoperti** prendono le finestre come ogni faccia libera; i muri di fondo che la strada dipinta vorrebbe ciechi aspettano
  `render.js` (`b.muroFondale`).
- **Il Sottopassino** è più basso (2,4 m di volta, pedonale) e il binario sale di 0,7 m per una ventina di metri per parte: si vede appena.
- **La camera** nelle pose ferme si chiude sul personaggio anche di serie (per questo le foto usano una camera fissa); il giro della camera nei
  passaggi (URBANISTICA2.md sez. 5) non è rifatto.
- **I graffiti dei muri tolti**: dei lavori cotti che stavano sui muri che F1 toglie, alcuni trovano posto sul muro nuovo, gli altri no.

## 5. Le prove

(riempita sotto)
