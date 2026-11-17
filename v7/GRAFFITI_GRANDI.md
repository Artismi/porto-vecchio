# Porto Vecchio — I PEZZI GRANDI (graffiti_grandi, dietro `?graffiti2` come tutto graffiti2.js)

Il committente: «quasi tutti i graffiti sono piccoli. Le tag vanno bene piccole, ma ogni tanto un writer il suo nome lo fa GRANDE».
Tavola: `_immagini/graffiti/grandi.jpg` (prima | dopo dalla camera del gioco, e una vista larga lungo la via).

## Perché era tutto piccolo (la radice)
1. **Il piano**: nessuna regola chiedeva un lavoro alto più di 2,1 m. Il pezzo 4,8 × 2,05, il pezzo della fascia 3,2-4 × 1,4-1,7, il burner
   del muro d'arrivo 5,6-6,8 × 2,2-2,7; e il ritmo della fascia è fatto di tag, tag a pennarello, adesivi e throw-up (1.000 tag su 2.450 lavori).
2. **Il riquadro tollerante** (graffiti2.js regola 11): la finestra dei raggi si fermava a 3,2 m da terra e il lavoro si stringeva fino al 45%:
   un pezzo da 3,5 m diventava 1,6 m.
3. **La tela**: 100 px al metro, sul telefono la metà (50 px/m): un nome grande sarebbe stato sfocato.
Niente tetti nell'atlante (4096² / 2048²) né nell'aggancio: non erano quelli.

## Cosa cambia (src/graffiti2.js, writing.js, writer_arte.js)
- **Regola 12, il nome grande** (`grandi()`): ogni tanto, mai due a meno di 22 m, sui muri adatti — i tratti ciechi lunghi (writer_vita
  'hall'), i fianchi alti dei palazzi ('facciata', solo se senza porta nel tratto), il muro antirumore della ferrovia (anche fuori città: è la
  ferrovia), il Muro, sotto il ponte, stazione e case cantoniere, le banchine del porto, le file di saracinesche di 7,5 m e più, le facciate
  lunghe lungo la via (meno spesso). Più il burner del muro d'arrivo che diventa grande se non ce n'è un altro entro 16 m. Mai nel centro
  nobile, su piazze, chiesa, regime. Pezzo o burner, il nome del writer (mai la parola della crew), fatto da chi lo sa fare (qualità ≥ .78):
  lettere piene col contorno, il 3D, le luci, lo sfondo (nuvola, spruzzi, esplosione, skyline, sole, rullo). Il personaggio no (DECISIONI.md:
  niente facce). Alto 2,2-3,9 m, largo fino a 12 m. Nella città: ~31 grandi su ~2.460 lavori (tag, pennarelli, adesivi restano la maggioranza).
- **Il riquadro tollerante per il grande**: la finestra fino a 1,4 m sopra il lavoro (sopra lo zoccolo), raggi ogni 30-40 cm (al più 640, nel generatore a dosi:
  le fette da 1,2 ms del telefono restano), il grande almeno al 55% e alto almeno 2 m, sporgenze al più il 3%; se il muro non lo tiene, lo
  stesso pezzo medio (60%) sullo stesso muro. Per tutti: la prova esatta contro le aperture (finestre, porte, vetrine; sulle saracinesche le
  finestre sopra 1,8 m) e mai sopra un medio o grande già sul muro, anche quelli cotti nei tasselli. Nell'aggancio i grandi vanno per primi.
- **La tela**: il grande a 125 px/m (al più 1500 px di lato, `WriterArte.TKB`). In scena a piena tela al più 8 grandi sul computer e 3 sul
  telefono (100 px/m); oltre il tetto 100 e 56 px/m (`writing.js kqDi`). Gli altri lavori come prima.
- **La pulizia dei pezzi** (medi e grandi, nel riquadro tollerante): un margine di 12 cm dentro i punti buoni (le lettere mai tagliate dallo
  spigolo, dalla fine del muro o dall'angolo), proporzioni del riquadro al più 1,25 (prima 1,6; le lettere comunque si adattano senza
  stirarsi, writer_arte `fit`), sporgenze sotto il pezzo al più il 4% per i medi e il 3% per i grandi (la vernice non scavalca il tubo
  della grondaia, il gradino della cornice, il giunto che sporge). La stesura resta la decalcomania sui triangoli veri (né sospeso né dentro,
  col suo polygonOffset: niente z-fighting).
- **Le tag senza doppioni**: quando una crew ha finito le combinazioni (18 nomi × 14 colori) la tag passa a un writer di un'altra crew.

## Prove
`node src/test_graffiti2.js`: nuova prova «i pezzi grandi col nome» (31, misure, niente parola né personaggio); le tre prove che non passano
(doppioni sopra la cottura, recupero, regime 2 → 3) non passano uguali prima e dopo (i tasselli locali sono di un'altra build).
`node src/test_writing.js`: una prova che non passava già («nel menu: Writer: ZETA»), invariata.
L'impronta dei tasselli cambia (writing.js, writer_arte.js): i tasselli si ricuociono una volta.
