# Porto Vecchio — I PEZZI GRANDI (graffiti_grandi, dietro `?graffiti2` come tutto graffiti2.js)

Il committente: «quasi tutti i graffiti sono piccoli. Le tag vanno bene piccole, ma ogni tanto un writer il suo nome lo fa GRANDE».
Tavola: `_immagini/graffiti/grandi.jpg`: due coppie prima | dopo dalla camera del gioco (SKAMBI 6,5 × 2,5 sulle saracinesche, lungo la via; SKID 4,6 × 2,1 sul muro della ferrovia) e due viste da vicino (SKID, DOGA 7,2 × 3,3), nella città costruita nel browser.

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

## Nel gioco (misurato, giro nel borgo con `?tassellivecchi&strade2&insegne4&graffiti2&facce3&luce3`)
Dei ~20 grandi provati nel borgo, l'aggancio ne tiene **grandi 4-5** (7,2 × 3,3 · 6,7 × 2,5 · 6 × 2,3 · 6,5 × 2,1 · 4,2 × 2,4 m), **8-10 diventano
medi** (2,6-4,6 × 1,1-2 m: il muro non tiene il grande senza finestre, insegne, tubi o un altro pezzo), gli altri non trovano il muro.
Il perché: `Graffiti2.misura().aggancio.grandiNo` e `grandiCelle` (aperture e sporgenze nel riquadro, i medi già sul muro).

## Il muro «pulito» (verificato)
Il grande sul muro pulito non era un disegno mancato (rifatto su SKAMBI, 4,4 × 2,1 m nella stessa prova): **il pezzo stava a mezz'aria in mezzo alla via**. Le prove giravano con
`?tassellivecchi`, cioè coi tasselli di un'altra build. I raggi dell'aggancio e del riquadro tollerante colpivano la città di quei tasselli
(una facciata in diagonale che nella città vera non c'è); la decalcomania sui triangoli veri non trovava niente (i dati del tassello
«mancano») e writing.js metteva il piano di riserva sul muro che non c'era. Senza tasselli vecchi (la città costruita nel browser,
coerente) i grandi stanno sul muro vero e si disegnano: DOGA 7,2 × 3,3, SCIA 5,2 × 2,7, SKAMBI 6,5 × 2,5, SKID 4,6 × 2,1, tutti sui
triangoli veri (300-4.400 vertici), nell'atlante, la tela a 125 px/m. Cambiati comunque, per non lasciare mai un pezzo in aria:
- l'aggancio e il riquadro tollerante cercano il muro solo nella città ferma: niente mezzi (anche parcheggiati, poi ripartono), niente persone;
- un lavoro del riquadro tollerante (`sdToll`) senza triangoli veri sotto non prende più il piano di riserva: non si mette.
Resta un rischio solo coi tasselli di un'altra build (le prove in locale): coi tasselli giusti i raggi e il disegno vedono la stessa città.

## La memoria sul telefono (3 grandi a 125 px/m)
La tela di un grande: al più 1500 × 488 px (12 × 3,9 m); sul telefono a 0,8 → 1200 × 390 = 0,47 Mpx = **1,9 MB** (RGBA) per tela, quindi al
più **5,6 MB** per tre, finché il disegno non passa nell'atlante (poi la tela torna nella pila). Nell'atlante (la pagina da 2048², già
allocata: 16 MB più le mipmap) nessuna memoria in più, ma i tre occupano al più un terzo della pagina (i lavori lontani escono prima). Il
disegnatore a parte fa una tappa sola per i grandi: 1500 × 488 × 4 = 2,9 MB per disegno, di passaggio. Prima (50 px/m) lo stesso muro
costava 0,47 MB di tela. I casi visti nel gioco sono più piccoli: 650-900 × 260-415 px (0,7-1,5 MB sul telefono).

