# Porto Vecchio — IL POOL DEI GRAFFITI: cosa c'è, quanto se ne vede, la proposta (?graffiti2)

Il committente: «servono più graffiti e disposti meglio, se ne vedono pochi e poi vorrei capire qual è il pool completo di graffiti che viene
usato». Poi: «voglio vedere i pezzi».

Tre parti: **il pool** (ogni stile, crew, writer, font, manifesto, adesivo, colore, e quanti ce ne sono nella città che si gioca); **la diagnosi**
(misurata dalla camera del gioco, camminando nel borgo); **la proposta** (regole, non coordinate, dietro `?graffiti2`; da approvare).

Tavole (`_immagini/graffiti_pool/`):
- `catalogo_1.jpg` … `catalogo_9.jpg` — **i pezzi veri**, grandi, disegnati col codice del gioco (writer_arte.js + pennelli.js, stile E di serie);
  etichetta: stile · crew · writer · font · misura. `catalogo.jpg` — l'indice: il conto di ogni stile e i nove fogli in piccolo.
- `diagnosi.jpg` — perché se ne vedono pochi (il tubo dei lavori, i lavori nel quadro posto per posto, cosa vede la camera dei muri davanti).
- `prima_dopo.jpg` — gli stessi posti del giro, la stessa camera, oggi | `?graffiti2`, coi costi.
- `ny.jpg` — **[graffiti_ny]** sei posti alla camera del gioco, oggi | `?graffiti2` NY, ventiquattro lavori a caso da vicino, gli stili tolti (§6).
- `ny2.jpg` — **[graffiti_ny2]** gli stessi sei posti, oggi | NY2 coi visibili di ogni posto, ventiquattro lavori a caso da vicino (§7).

Strumenti (ripetibili): `strumenti/graffiti_pool.js` (i conti, senza browser), `strumenti/graffiti_catalogo.js` (i fogli del catalogo),
`strumenti/graffiti_vista.js` (la sonda nel gioco vero), `strumenti/fogli_graffiti_pool.py` (le tavole). Prova: `node src/test_graffiti2.js`.

## 1. Da dove vengono i graffiti della città (la catena)

La città comincia con la **storia dei muri**: i lavori che i writer hanno già fatto prima di te. Con lo stile E (di serie da `integra1`) la sceglie
`strada_dipinta.js` a regole (zone, ritmo, fondali, porte, pali: `STRADA_DIPINTA.md`). Poi:

1. **la strada dipinta pianifica 919 lavori** (tutta l'isola; 857 nel borgo);
2. **la cottura dei tasselli ne piazza 499** (`strumenti/tassella_pagina.js`: i raggi di `placeWall` trovano il muro per 491 dei 919 pianificati,
   più 8 di contorno; i grandi: 22 su 68). La cottura gira con lo stile di serie, quindi **è già la strada dipinta**;
3. **nel gioco `rimodella` li dirada una seconda volta** per zona (`TIENI`: vie 35%, lungomare 30%, vicoli 70%...): ne restano **396**;
4. poi `storia(cotti)` **riaggiunge** porte (91), pali (27) e fondali (6) sopra quelli che la cottura aveva già: la passata delle porte si fa due volte;
5. **nella città che si gioca: 520 lavori** (510 nel borgo), di cui **17 grandi**. La storia di prima (senza stile E) ne aveva 1.525 (241 grandi).

Il diradamento di `rimodella` era pensato per una cottura senza stile E (la storia vecchia, carta da parati); da quando lo stile E è di serie la
cottura è già diradata, e il secondo taglio si somma al primo.

## 2. Il pool

### 2.1 Gli stili (`writing.js STYLES`, il disegno in `writer_arte.js`)

| stile | che cos'è | misura di partenza | città di serie | di cui borgo | senza tasselli | con ?graffiti2 | storia di prima |
|---|---|---|---|---|---|---|---|
| `tag` | la firma a spruzzo | 1,1 × 0,55 m | 112 | 110 | 234 | 446 | 522 |
| `mtag` | la firma a pennarello | 0,6 × 0,32 | 119 | 118 | 165 | 165 | 170 |
| `throw` | throw-up: lettere a bolla, due colori | 2,7 × 1,3 | 42 | 41 | 112 | 186 | 247 |
| `pezzo` | il pezzo: lettere costruite, riempimento, 3D | 4,8 × 2,05 | 12 | 11 | 27 | 42 | 62 |
| `burner` | il pezzo grande con lo sfondo | 6,6 × 2,5 | 0 | 0 | 1 | 1 | 19 |
| `gotico` | calligrafia verticale (piloni, spigoli) | 1,4 × 3,2 | 5 | 5 | 10 | 10 | 32 |
| `mostro` | il personaggio (a mano, non nella storia) | 3 × 2,6 | 0 | 0 | 0 | 0 | 2 |
| `wholecar` | il vagone intero (solo sui treni) | 16 × 2,9 | — | — | — | — | — |
| `rullo` | lettere a rullo (heaven spot, muri lunghi) | 9 × 2,4 | 1 | 1 | 4 | 4 | 11 |
| `verticale` | lettere una sopra l'altra sui fianchi dei palazzi | 2 × 7 | 2 | 2 | 13 | 13 | 120 |
| `estintore` | tag a estintore, colature lunghe | 3 × 4 | 7 | 7 | 19 | 19 | 27 |
| `stencil` | sagoma a mascherina (19 soggetti) | 1 × 1,1 | 28 | 24 | 58 | 80 | 98 |
| `scritta` | scritta a pennello (politica, amore, ultras, strada) | 4,5 × 0,75 | 11 | 11 | 39 | 39 | 65 |
| `calli` | calligraffiti a pennellessa | 4,2 × 2,2 | 2 | 2 | 8 | 8 | 23 |
| `murale` | il murale del muralista (5 composizioni) | 6,5 × 4 | 0 | 0 | 2 | 2 | 4 |
| `manifesto` | 1-3 fogli incollati | 1,2 × 1,4 | 17 | 17 | 60 | 137 | 21 |
| `adesivi` | grappolo di adesivi (5-13) | 0,6 × 0,5 | 158 | 157 | 159 | 252 | 102 |
| `buff` | la toppa grigia di chi ripulisce | 2,2 × 1,3 | 4 | 4 | 8 | 8 | 0 |
| **totale** | | | **520** | **510** | **919** | **1.412** | **1.525** |

(«città di serie» = stile E coi tasselli, quello che si gioca sul sito; «senza tasselli» = stile E quando la città si costruisce nel browser;
«con ?graffiti2» = la proposta, coi tasselli; «storia di prima» = senza stile E.)

### 2.2 Le crew, i writer, i territori (`strada_dipinta.js CREW`, `RE`)

| crew | nome | territorio | writer (il primo è il king) | lavori nella città di serie |
|---|---|---|---|---|
| PVK | Porto Vecchio Kings | vicoli, ritrovi, vie | CIAPA, ZENA, VERA, MOLO | 147 |
| BDS | Banda della Scogliera | porto, lungomare | MURE, GOZO, SALE, BRUMA | 115 |
| TNT | Treni Notte Tunnel | ferrovia, sottopassi | TREK, NAPO, FUMO, RIVA | 112 |
| TOY | i ragazzini | vie, vicoli, lungomare | PIX, GEKO, LUPO, TEO | 81 |
| KML | Camalli (i portuali) | porto, ferrovia | ZULU, TOKE, ORZO, BITTA | 48 |
| RSC | Risacca | il Muro | SUBA, KILO, MAREA, ONDA | 14 |
| OGS, FLM, SPK | crew sciolte (solo pezzi vecchi, sbiaditi) | dappertutto | RENZ, MASK, ASMA, NEMO · KAOS, DOGE · NEVA, RUGA | 3 |

Metà delle tag nuove le firmano **i writer NPC vivi** della crew (quelli che escono di notte: DUNE, DAKO, FUSE, SOLE per PVK; NOTE, NEMO, KASH,
RUSK, KRAN per BDS; RAZO, PIXO, KOMA, NEMO, MOSE per TNT...). I più presenti nella città di serie: DUNE 24, CIAPA 22, GEKO 22, TEO 21, NOTE 21,
MOLO 19, DAKO 19, RAZO 18, LUPO 18, PIX 18, TREK 17, ZENA 17. La Risacca (il Muro) ha solo 14 lavori: il Muro è quasi tutto fuori dai siti cotti.

### 2.3 I font (`assets/fonts_graffiti`, 28 font liberi OFL/Apache, `writer_arte.js` sezione «I FONT»)

| uso | font (peso nella scelta) |
|---|---|
| tag a spruzzo (`F_TAG`) | Sedgwick Ave Display (5), Sedgwick Ave (2), Permanent Marker (2), Rock Salt, Mansalva, Marck Script, Lacquer, Knewave, Covered By Your Grace |
| tag a pennarello (`F_MTAG`) | Sedgwick Ave (3), Sedgwick Ave Display (3), Rock Salt (2), Reenie Beanie (2), Covered By Your Grace (2), Permanent Marker, Mansalva |
| throw-up (`F_THROW`) | Sniglet (2), Chewy (2), Freckle Face (2), Modak, Kavoon, Titan One, Luckiest Guy, Londrina Solid |
| pezzi e burner (`F_PIECE`) | Knewave, Shrikhand, Bangers, Ranchers, Carter One (2 ciascuno), Shojumaru, Rubik Wet Paint, Kavoon; le mani da tag ingrassate (Sedgwick Ave Display, Permanent Marker, Knewave) |
| rullo, verticale a bolle (`F_ROLL`) | Bungee (3), Erica One (2), Londrina Solid (2), Titan One, Luckiest Guy, Black Ops One |
| stencil (le didascalie) | Black Ops One, Bungee |
| scritte (`F_SCRITTA`) | politica: Permanent Marker, Knewave, Black Ops One, Bangers · amore: Mansalva, Rock Salt, Covered By Your Grace, Sedgwick Ave, Marck Script · ultras: Bangers, Black Ops One, Knewave, Ranchers · strada: Sedgwick Ave Display, Permanent Marker... |
| murale «parola» | Shrikhand, Bungee, Black Ops One, Ranchers, Knewave |
| manifesti | titolo: Black Ops One, Bungee, Bangers, Ranchers, Shrikhand; il foglietto «cercasi» a mano: Permanent Marker; sottotitoli Bungee |
| adesivi | «CIAO MI CHIAMO» e i tondi delle crew: Bungee; il nome scritto: Sedgwick Ave e le mani da tag |
| estintore, gotico, calligraffiti | i font delle tag, ingrossati (`extinguisherFont`), a pennino largo (`calliFont`, `goticoFont`) |

Nei fogli del catalogo ogni campione dice il font che ha usato davvero (quello che il disegno ha messo nella tela).

### 2.4 I manifesti (`MAN`, per zona `MAN_Z`) e gli adesivi (`stickersE`)

- **Serate**: DUB AL MOLO (sound Cassa Marea), I GABBIANI ELETTRICI live al Bar Sirena, CANTINA PUNK (Muffa, Ruggine, Cortocircuito), BALERA LUNA,
  RADIO LUNA 98.4, NOTTE FUNK alla Discoteca Luna. **Strada**: JAM AL GLACIS, TORNEO DI SKATE, MERCATINO DEL BARATTO. **Porto**: AVVISO AI
  PESCATORI, SAGRA DELL'ACCIUGA, PALIO DEI GOZZI, i foglietti CERCASI MOZZO e VENDESI GOZZO. **Vicoli**: LEZIONI DI CHITARRA, SMARRITO CANE TOBIA,
  AFFITTASI CANTINA. **Piazze**: FESTA DI SAN ROCCO, CINEMA ASTOR, CORO DEL BORGO (un foglio nuovo, mai una pila). 20 manifesti diversi.
- Nella città di serie: **17 punti, 36 fogli** (8 titoli su 20: NOTTE FUNK 5, JAM AL GLACIS 4...). Senza tasselli 60 punti, 121 fogli, 17 titoli.
- **Adesivi** nella città di serie: 36 grappoli sui muri, 121 accanto alle porte (la passata delle porte fatta due volte: 30 della cottura + 91 rifatti), 30 strisce sui
  pali, 12 dietro i cartelli. I soggetti: «ciao mi chiamo» con la tag, i tondi delle crew, i riquadri col nome, i loghi (RADIO LUNA, CASSA MAREA,
  JAM GLACIS, SCOGLIO, FUORI ORARIO, TONNARA). Nessuna marca vera, nessun artista vero.

### 2.5 I colori (`writer_arte.js` `[stradadipinta]`, BIBBIA_STILE §1)

Una tavolozza sola, i 20 inchiostri della bibbia (carta, osso, sasso, lilla, piombo, lavagna, nero, pesca, ocra, cotto, mattone, cielo, acqua,
oltremare, notte, salvia, persiana, bosco, rosa, viola). Ogni tappa di un lavoro della città passa da una tabella 64³ (`lutE`): la tinta va verso
l'inchiostro più vicino, il valore resta; vermiglio (il personaggio), limone (gli obiettivi) e allarme (il pericolo) non escono mai (il più vicino a
0,061 in Oklab). Le carte dei manifesti e degli adesivi a coppie che si leggono (carta/nero, ocra/nero, rosa/carta, oltremare/carta...). Il bordo è
netto, la mano trema al 60%, i pennelli passano meno grana (.3), polvere (.15) e colature (.3). L'età (pioggia, crosta, sbiadito) per zona: porto
e campagna vecchi, ritrovi freschi; le crew sciolte sbiadite (.7-.9).

## 3. La diagnosi: perché se ne vedono pochi

### 3.1 Il doppio diradamento e i doppioni (il motivo principale: misurato in node, `strumenti/graffiti_pool.js`)

Il percorso nel codice, con lo stile E di serie e i tasselli:
1. **la cottura** (`strumenti/tassella_pagina.js` `__tassellaGraffiti`, ~riga 288): la pagina della cottura gira con lo stile di serie, quindi
   `writer_vita.js history` chiama **`StradaDipinta.storia` intera** (`writer_vita.js` riga 301): 919 lavori; ognuno prova **una volta** `Writing._.placeWall`
   (senza ripensamenti, senza le alternative, i fondali con `sdRun` aspettano le case e quindi falliscono): **499 entrano**, 420 no (i grandi: 22 su 68);
2. **nel gioco** `writer_vita.js` riga 298: `WR._.cotti(st, StradaDipinta.rimodella(st, L))` — **`rimodella` (`strada_dipinta.js` righe 320-329,
   `TIENI`) dirada di nuovo per zona** una lista che è già la strada dipinta: vie ×.35, lungomare ×.3, vicoli ×.7, ritrovi ×.75, porto ×.85, piazze
   ×.05, le tag e gli adesivi ancora per il ritmo, i verticali fuori dalle zone calde ×.15 → **396**;
3. subito dopo `StradaDipinta.storia(st, { cotti: true })`: le sezioni 2 e 3 (muri e palazzi) sono saltate (`if (!ctx.cotti)`, righe 253 e 290), ma
   **la sezione 1 (fondali, riga 208), la 4 (porte, riga 297) e la 5 (pali, riga 304) no**: si rifanno tutte, sopra quelle che la cottura aveva già
   (41 porte, 11 pali, 1 fondale): la passata delle porte e dei pali si fa due volte → 121 grappoli alle porte invece di 91, 42 sui pali invece di 23-27;
4. **520 lavori in tutta l'isola**, 17 grandi. Senza tasselli (la città costruita nel browser) 919, 55 grandi; la storia di prima 1.525, 241 grandi.

`rimodella` era giusto quando la cottura era la storia vecchia (1.350 lavori a carta da parati): con lo stile E di serie (`integra1`) la cottura
è diventata la strada dipinta e il taglio si fa due volte. **Correzione** (in `?graffiti2`, regole 1-2): un diradamento solo (quello della strada
dipinta, prima della cottura), niente doppioni; poi il recupero dei 420 che la cottura non ha piazzato (regola 3).

### 3.2 Dalla camera del gioco: il giro a piedi

`strumenti/graffiti_vista.js`, nel gioco vero (Chromium senza testa, SwiftShader, 960 × 540, ore 15 serene, coi tasselli di questa build,
impronta `5595e5b5f7acd772`): 14 posti nel borgo (Calata e Via della Marina, Via del Porto, Via di Mezzo due volte, Vico Lungo, Vicolo dei
Lanternini, Rua Maestra nei due versi, Caruggio dei Pescatori, Via della Vittoria a Piazza Grande, Via delle Mura, il Glacis verso l'arco, il
Sottopasso Cavour, Corso Garibaldi). In ogni posto il personaggio sull'asse della via girato nel verso della marcia, **la camera di serie
(camera7)** rifatta da capo dietro di lui e lasciata assestare (ferma entro 2 cm per 4 fotogrammi), i graffiti piazzati e disegnati dal gioco
stesso (lo scan forzato dallo stesso punto finché il disegnatore ha finito). Poi, per ogni lavoro col centro nel quadro (entro 70 m): piazzato?
disegnato? visibile (cinque raggi dalla camera a cinque punti del riquadro, contro tutta la scena)? **leggibile** = alto e largo almeno 24 px a
540 righe e non di taglio (la normale del muro a meno di 72° dalla camera)?

| | per fotogramma (media dei 14 posti) |
|---|---|
| lavori col centro nel quadro | **6,8** |
| visibili | **2,6** |
| leggibili | **0,5** (in 9 posti su 14 nessuno) |

Dei 95 nel quadro che non si leggono: **46 coperti** (dietro case, archi, tende, mezzi, il personaggio), **17 troppo piccoli** (le tag: 10-30 px
di altezza a 15-23 m dalla camera), **12 di taglio** (i muri ai lati della via, visti dall'alto quasi di striscio), **13 falliti** (i raggi di
`placeWall` non trovano il muro: 10 sono le porte rifatte da `storia(cotti)`, 2 fondali), **0 non disegnati**: l'atlante (una pagina), il tetto
dei veli (27 vivi in media) e il disegnatore a parte non sono un limite. Il secondo diradamento toglie, lungo questo giro, 2 lavori che si
vedrebbero (1 leggibile): pesa sulla città intera (396 su 499), poco su queste inquadrature, che stanno dove la strada dipinta è già fitta.

Le cause, in ordine di peso:
1. **La camera guarda in giù.** camera7: 34° sotto l'orizzonte, il bordo alto 11° sotto; nel giro a 5,9 m dal suolo (braccio 6,9 m; nei vicoli
   1,3-2 m, la camera sopra la testa). Dei muri davanti vede solo la fascia bassa e solo fino a ~30 m: un fondale a 40 m è fuori quadro, un
   verticale sopra il primo piano anche; i muri ai lati si vedono di taglio. `diagnosi.jpg` riquadro 3.
2. **Coperti**: la metà di quello che è nel quadro sta dietro qualcosa (nei vicoli le case stesse; sul Glacis l'arco e le scale).
3. **Pochi**: 520 nell'isola (§3.1), e dove ci sono sono piccoli: dei 36 visibili, 28 sono tag, tag a pennarello e adesivi.
4. **I raggi non trovano il muro**: la cottura ne perde 420 su 919, il gioco i lavori aggiunti a runtime (porte). I raggi dei graffiti provano
   solo le mesh candidate (`bmbCands`), non le masse delle case, e i siti sono sulla griglia di 2 m (`STRADA_DIPINTA.md` §2.3, aperto (b)).
5. **Sbiaditi e chiari**: sul porto l'età .65 e la tavolozza chiara fanno pezzi color intonaco su intonaco (la foto del Glacis, posto 12).

Nel catalogo si vedono anche due difetti del disegno (da correggere in `writer_arte.js`, non qui): nei manifesti `posterE` le righe decorative
passano sopra la seconda riga del titolo (I GABBIANI ELETTRICI, CANTINA PUNK, PALIO DEI GOZZI, AVVISO AI PESCATORI col tondo); la tag a
estintore bianca su intonaco chiaro quasi non si vede (`catalogo_5.jpg`).

## 4. La proposta: ?graffiti2 (regole, non coordinate)

Tutto in `src/graffiti2.js`, sopra a `strada_dipinta.js` (che resta com'è). **Spento di serie**: niente cambia (la città, i tasselli, la scelta
della strada dipinta; `node src/test_graffiti2.js` lo prova lavoro per lavoro), e il file sta fuori dall'impronta dei tasselli (`build.py
TASS_FUORI`: l'impronta resta `5595e5b5f7acd772`). Acceso con `?graffiti2` nell'indirizzo. Le regole, in ordine:

1. **Niente secondo diradamento.** I lavori cotti dello stile E si tengono tutti: la scelta per zona l'ha già fatta la strada dipinta prima della
   cottura. (Una cottura vecchia, senza stile E, si dirada di meno dove si cammina: vie 80%, lungomare 70%; uguale su piazze, chiesa, regime.)
2. **Niente doppioni.** La seconda passata di porte, pali e fondali sopra la cottura non si fa (119 lavori tolti); le porte e i pali che la cottura non aveva piazzato tornano col recupero (regola 3), coi loro semi.
3. **Il recupero.** I lavori della strada dipinta che la cottura non ha saputo piazzare (423) si riprovano nel gioco **con le alternative**: la
   misura al 70-75%, più in basso, mezzo metro o un metro e mezzo di lato; il pezzo che non entra diventa un throw-up.
4. **Il muro d'arrivo** (dove la gente guarda): da ogni punto di una via, nei due versi, il primo muro dritto davanti fra 6 e 24 m — dove la via
   piega o finisce, quello a cui vai incontro e che la camera ha davanti — prende **un pezzo o un throw-up grande, nuovo, leggibile**: 3,6-4,6 m
   o 2,6-3,2 m di largo, **nella fascia bassa che la camera vede** (centro a 1,1-1,2 m), la nuvola chiara dietro le lettere, la crew del territorio.
   Uno ogni 5 m di muro, mai sopra un altro grande, mai a meno di 1,2 m da una porta, mai sulle botteghe (31 nella città).
5. **La fascia all'altezza degli occhi** (dove la gente cammina): lungo i muri del borgo — i siti di sempre più i muri presi ogni 2,5 m dai due
   lati di ogni via — throw-up (2,6 × 1,25 m), **tag grandi** (lettere da 70 cm: ×1,25-1,6), stencil, adesivi, manifesti, col centro fra 0,9 e
   1,7 m. Quanti: per 10 m di muro 4-5 nei vicoli, ritrovi, porto, sottopassi, ferrovia, sul Muro; 1,5 nelle vie e sul lungomare; per il ritmo dei
   posti (×0,6 fra un posto e l'altro, ×1,6 vicino a bar, sottopassi, scalinate). Sui muri lungo le vie il 60%, e **mai sulle facciate delle botteghe** (il pianterreno è vetrina, porta, insegna: lì i raggi
   fallivano tutti; 454 lavori nella fascia).
6. **Pulito** dove la bibbia lo vuole: piazze, chiesa, regime, campagna niente di nuovo (restano i pochi della strada dipinta: il manifesto della
   festa, le toppe grigie); mai a meno di 1,2 m da una porta (la bottega si legge).
7. **Leggibile prima di tutto**: una tavolozza (la stessa `lutE`), i lavori nuovi freschi (età .05-.3: niente pioggia, crosta, sbiadito), quelli
   cotti dove si cammina al più .4 (227 ringiovaniti); niente verticali, rulli o heaven spot nuovi (la camera non li vede). Il disegno non cambia
   (writer_arte.js e pennelli.js restano com'erano: la grana l'ha già tolta lo stile E).

**Quanti** (tutta l'isola, coi tasselli): 520 → **1.412** lavori (borgo 510 → 1.350); grandi 17 → 70 (pezzi 12 → 42); throw-up 42 → 186; tag
112 → 446; adesivi 158 → 252; manifesti 17 → 137 (244 fogli). Sono quasi quanti la storia di prima (1.525), ma messi dove si cammina e si guarda e non sulle
piazze, la chiesa, il regime e i fianchi alti dei palazzi (verticali 120 → 13).

**Misurato nel gioco** (stesso giro, stessa camera, `prima_dopo.jpg`; il gioco con `?graffiti2` ha 1.378 lavori in memoria contro 522):

| per fotogramma (14 posti) | di serie | ?graffiti2 |
|---|---|---|
| lavori col centro nel quadro | 6,8 | **19,6** |
| visibili | 2,6 | **4,5** (×1,75) |
| leggibili | 0,5 | **1,2** (×2,4) |
| falliti (i raggi non trovano il muro) | 13 | 95 |
| coperti | 46 | 116 |

| costo (media dei posti) | di serie | ?graffiti2 |
|---|---|---|
| disegni del fotogramma | 555 | 551 |
| pagine dell'atlante | 1 | 1 |
| grafiche di lavori (veli + atlante) | 127 | 244 |
| veli vivi (non ancora nell'atlante) | 27 | 93 |
| tessiture | 423 | 416 |
| memoria JS | 890 MB | 897 MB |

I disegni non crescono (i lavori finiti stanno nell'atlante: due disegni per tutti), l'atlante resta in una pagina, la memoria +7 MB. Cresce il
lavoro dei raggi a runtime (i lavori nuovi e il recupero si piazzano camminando; i millisecondi sotto SwiftShader non dicono niente: il banco va
rifatto sull'Iris Xe con e senza `?graffiti2`, stesso giro). Il guadagno è vero ma **piccolo in assoluto**: con la camera di serie anche il triplo
dei lavori nel quadro dà poco più di un lavoro leggibile per fotogramma. Il resto lo decidono la camera, le coperture e i raggi (§3.2 cause 1, 2,
4): sono le decisioni sotto.

## 5. Le decisioni del committente

1. **Correggere subito, di serie, il doppio diradamento e i doppioni** (regole 1-3 di `?graffiti2`: un diradamento solo, niente porte e pali
   rifatti, il recupero con le alternative): la città passa da 520 a ~920 lavori, quelli che la strada dipinta aveva già scelto. Rischio basso
   (cambia solo quali lavori si tengono), costo nullo sui disegni. Sì / no?
2. **Quanta vernice**: (a) solo la correzione, ~920 lavori; (b) `?graffiti2` intero, ~1.400 (quasi quanti la storia di prima, ma nella fascia
   bassa, sui muri d'arrivo e dove si cammina, mai su piazze, chiesa, regime, botteghe); (c) una via di mezzo (la fascia degli occhi a metà).
3. **Per quale camera si dispongono i graffiti?** Con camera7 (di serie, 34° in giù) contano la fascia bassa e i muri a cui vai incontro, i
   fondali a 40 m non si vedono mai; con la camera bassa (`?camera9`) tornano i fondali e i pezzi grandi in fondo alle vie. La camera vale più del
   numero di lavori: decide se il lavoro sui fondali (`STRADA_DIPINTA.md` §2.3) serve.
4. **I raggi che non trovano il muro** (420 su 919 nella cottura, 95 nel giro con `?graffiti2`): la cura è nel motore (`writing.js placeWall` che
   provi anche le masse delle case e il marciapiede vero, `render.js bmbCands`): tocca i moduli dell'impronta, quindi una ricottura dei tasselli.
   Autorizzare quel lavoro?

## 6. [graffiti_ny] Come New York: solo pezzi da writer, mai due uguali, agganciati al muro (sempre dietro `?graffiti2`)

Le decisioni (DECISIONI.md, «Graffiti»): pieni ma posati bene, senza esagerare; solo pezzi da writer; via i muri di simboli e le facce; i
colori che cambiano, mai lo stesso pezzo due volte. Tutto in `src/graffiti2.js` (regole 8-10 in testa al file); writing.js, writer_arte.js e
strada_dipinta.js non cambiano, **l'impronta dei tasselli resta `5595e5b5f7acd772`: niente ricottura**. Tavola: `_immagini/graffiti_pool/ny.jpg`.

- **Tolti** (guardando i fogli del catalogo): il **murale** (`catalogo_4`: righe, scacchi, cerchi, arcobaleni: i «muri interi di simboli»),
  il **personaggio** (`catalogo_7`: le facce), lo **stencil** (`catalogo_6`: bicicletta, occhio, bomboletta, radio: simboli, e due biciclette
  uguali di fila), la **scritta** a pennello (slogan, non writer), il **manifesto** (carta). Dove la strada dipinta li aveva messi, nello stesso
  posto c'è un lavoro da writer: scritta → throw-up 39, stencil → throw-up 28 / tag 30, manifesto → tag 21 / tag a pennarello 13 (26 spariti),
  murale → burner 2. La toppa grigia sopra i pezzi vecchi (sembrava un difetto del disegno) via. I fondali con la loro ricerca a raggi lungo la
  via (decine di raggi per giro, sempre per primi: a Piazza Grande il giro dei graffiti non arrivava agli altri) diventano lavori normali.
- **Restano**: tag 435, throw-up 235, tag a pennarello 215, adesivi (le «ciao mi chiamo» delle crew) 202, pezzi 35, gotico 20, estintore 19,
  verticali 13, toppe grigie 8, calligraffiti 8, rulli 4, burner 3 — **1.197 lavori nell'isola** (borgo 1.136; oggi 520), 63 grandi.
- **Mai due uguali** (`Graffiti2.unici`): ogni lavoro ha la sua combinazione stile · nome · tavolozza (i lavori a più colori; il cromo conta
  come una tavolozza sola) o colore (tag, pennarello, gotico, estintore, calligraffiti: 14 tinte, il nero e l'argento più spesso). Un nome che
  torna come throw-up o pezzo torna in un'altra tavolozza; il pezzo si tiene riservata anche la tavolozza del suo throw-up di riserva. Le crew
  hanno 6-8 writer in più (nomi inventati) scelti a turno. Cambiati per non ripetersi: 103 tavolozze, 180 colori, 24 nomi. **Doppioni: 0 su
  1.197; semi tutti diversi** (`node src/test_graffiti2.js`, che lo controlla).
- **Dove**: la fascia bassa (centro 0,9-1,7 m), i muri d'arrivo, vicoli, ritrovi, porto, sottopassi, ferrovia, il Muro; un quinto in meno di
  prima per 10 m di muro; il **centro nobile** (entro 14 m da piazze, chiesa, palazzi del governo) un terzo della vernice e niente pezzi;
  piazze, chiesa, regime, campagna niente di nuovo.
- **L'aggancio** (i raggi che fallivano): misurato nel gioco, il posto della griglia aveva il muro di lato o dietro (a un metro) e davanti il
  vuoto per 8 m, o stava dentro la casa. Ora, camminando, ogni lavoro nuovo o recuperato entro 95 m prima di essere provato fa un ventaglio di
  16 raggi e si sposta a 55 cm dal muro vero più vicino (alto almeno 2,4 m: non una macchina); poi le alternative lungo quel muro. Nel giro
  del collaudo: 324 agganciati (111 spostati), 113 senza muro vicino (restano dove erano).

Nella città, alla camera del gioco (6 posti, `strumenti/graffiti_vista.js` con `PV_POSTI=1,2,10,12,13,14`, per fotogramma):

| | oggi | `?graffiti2` di prima (stessi posti) | NY |
|---|---|---|---|
| nel quadro | 10,2 | 29,8 | 26,3 |
| visibili | 4,3 | 5,8 | 6,7 |
| leggibili | 0,8 | 1,7 | 1,5 |
| falliti (i raggi) | 0,5 | 9,8 | 5,7 |
| disegni / pagine dell'atlante | 726 / 1 | 689 / 1 | 681 / 1 |
| grafiche di lavori / veli vivi | 129 / 23 | 258 / 96 | 200 / 16 |
| memoria JS | 905 MB | 913 MB | 804 MB |

Il costo resta piatto: l'atlante una pagina, i disegni non crescono; i raggi dell'aggancio sono al più 32 per lavoro, una volta, a 1,5-12 ms
per fotogramma (sul telefono il tetto basso). Il banco vero va fatto sull'Iris Xe e sul telefono, stesso giro. Quello che non torna: con
camera7 si vede poco lo stesso (i muri di taglio, coperti, la camera dentro il vicolo): la vernice c'è, la camera la guarda poco; 5,7 falliti
per fotogramma restano (botteghe, muri corti, 113 senza muro trovato).


## 7. [graffiti_ny2] Più vernice dove la camera guarda (sempre dietro `?graffiti2`)

Il committente su `ny.jpg`: «troppo pochi graffiti sui muri». Poi: niente si gira, si sposta o si cambia nei muri e nelle case; «i muri
girati verso la camera» vuol dire solo quali muri esistenti prendono più vernice. I graffiti stanno piatti sulla superficie vera del muro,
nel suo verso (la decalcomania sui triangoli veri, come prima). Tutto in `src/graffiti2.js`; **impronta dei tasselli invariata
(`5595e5b5f7acd772`), niente ricottura**. Tavola: `_immagini/graffiti_pool/ny2.jpg` (gli stessi sei posti, oggi | NY2, i visibili di ogni posto).

- **Densità** nella fascia 0-3 m: per 10 m di muro sottopassi 9, vicoli e ritrovi 8, porto, ferrovia e Muro 7, vie 5, lungomare 4 (prima
  1,2-4,5); i muri lungo le vie quanto i muri liberi (prima 60%), fino a 14 m dall'asse della via (prima 8: nelle vie larghe e sul Glacis le
  facciate restavano fuori). Il centro nobile e le piazze l'80%, senza pezzi; pulite solo chiesa, regime, campagna.
- **Le porte della griglia**: un lavoro stava a 2,2 m dal centro di ogni porta; sulle file di case (una porta ogni 2-4 m) non restava muro.
  Ora 80 cm: la porta vera la evita comunque fitWall (le aperture della facciata).
- **Le saracinesche delle botteghe** (prima escluse): throw-up, pezzi e tag ci passano sopra (`sdNoOpen`: la vernice prende anche la serranda
  incassata fino a 25 cm, mai insegne e davanzali che sporgono). 303 lavori.
- **Muri d'arrivo** (il muro in fondo al tratto dritto, che la camera ha davanti): fra 4 e 30 m, uno ogni 3,5 m, anche sulle saracinesche:
  16 → **129**; il pezzo grande (3,8-5 m) o il burner (5,6-6,8 m), nel centro nobile un throw-up. Pezzi 35 → 87, burner 3 → 17.
- **Mai un lavoro fallito in giro**: le prove lungo il muro tornano a 5; quello che dopo tutte le prove non trova posto si toglie (181 nel giro
  del collaudo). Falliti per fotogramma 5,7 → **0**.
- **Mai due uguali** con più lavori: le crew hanno 10-14 writer in più (nomi inventati, a turno). Cambiati per non ripetersi: 344
  tavolozze, 542 colori, 226 nomi. **Doppioni 0 su 2.452, semi tutti diversi** (`node src/test_graffiti2.js`).

**Quanti**: 2.452 lavori nell'isola (borgo 2.391; oggi 520, NY 1.197), 129 grandi: tag 992, throw-up 570, tag a pennarello 420, adesivi 281,
pezzi 87, gotico 33, estintore 19, burner 17, verticali 13, toppe 8, calligraffiti 8, rulli 4.

| per fotogramma (6 posti) | oggi | NY | NY2 |
|---|---|---|---|
| nel quadro | 10,2 | 26,3 | 31,2 |
| visibili | 4,3 | 6,7 | **8,0** |
| leggibili | 0,8 | 1,5 | **2,5** |
| falliti | 0,5 | 5,7 | **0** |
| coperti | 5,3 | 14,0 | 23,2 |
| visibili posto per posto (1, 2, 10, 12, 13, 14) | 1, 0, 8, 9, 3, 5 | | 4, 0, 11, 15, 11, 7 |
| disegni / pagine dell'atlante | 726 / 1 | 681 / 1 | 591 / 1 |
| grafiche di lavori / veli vivi / tessiture | 129 / 23 / 433 | 200 / 16 / 362 | 178 / 20 / 413 |
| memoria JS | 905 MB | 804 MB | 712 MB |

Il costo resta sano: l'atlante una pagina, i disegni non crescono. Crescono i lavori in memoria (2.452 fondati sul seme) e i raggi
dell'aggancio camminando (una volta per lavoro).

**Quello che non torna, ancora**: dalla camera7 i visibili sono 8 per fotogramma, quasi tutti tag e tag a pennarello; nessun pezzo visibile
nei sei posti e la Via del Porto ancora a 0. Nel giro 1.111 lavori agganciati, 350 senza muro entro 4,5 m, 181 tolti perché nessuna prova entrava:
sulle facciate vere (zoccoli, cornici, tubi, gradini, la bugnatura) la prova del riquadro di writing.js (`fitWall`: lo stesso piano entro
1,5 cm, niente aperture) non trova posto per un throw-up o un pezzo. La facciata gialla del Glacis, che la camera ha davanti, resta quasi
pulita per questo. La cura sta in writing.js (una tolleranza più larga del piano, il rilievo basso ammesso): tocca i moduli dell'impronta,
quindi una ricottura dei tasselli. Da decidere.
