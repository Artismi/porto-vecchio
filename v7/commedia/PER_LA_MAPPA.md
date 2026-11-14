# Per la chat della mappa (dalla regia della commedia)

Andrea mi ha chiesto di passarvi queste informazioni. Io non tocco la mappa.

## Le Lamiere (favela), approvata da Andrea come idea
- **Dove:** la striscia fra la ferrovia e il mare nella Periferia Ovest, dalla Discarica di levante alla torre dell'acqua (Discoteca Luna / Radio Luna). Più avanti può salire sulla Collina dei Pini verso le rovine del Paese Vecchio.
- **Cosa c'è già:**
  - 12 baracche, il Passo delle Baracche, la grata del vapore, l'autobus sepolto, il posto di missione n. 10;
  - vicino: la discarica e il cantiere navale, che danno i materiali;
  - sotto: la Città dei Topi, le vecchie carceri e la metro;
  - la Caserma della Guardia vicina.
- **Lo stile che vuole Andrea:** una struttura da favela, cioè un po' geometrica e un po' a caso (blocchi accatastati, scalette, terrazze, lamiere, colori), ma **pulita e senza compenetrazioni**. Ogni pezzo poggia su qualcosa e niente entra dentro altro.
- **Le bande** che la abiteranno (la logica la fa la regia, a voi solo lo spazio):
  - La Ciurma (porto, contrabbando);
  - I Lamierini (ricettazione);
  - I Saette (motorini, scippi);
  - I Carbonai (l'erba del Monte).

  Servono punti di ritrovo, muri per i tag, una piazzetta, ingressi al sottosuolo.

## Compenetrazioni trovate (dettagli in v7/banco/COMPENETRAZIONI.md)
- Due barche dentro i moli:
  - il peschereccio all'ormeggio 27 dentro il Molo Vecchio (0,39 m);
  - la nave cargo dentro molo_cargo_s2 (1,86 m).

  Le piazza world_cittanuova.js.
- Due barche «secca» una sopra l'altra a circa (894, 280).
- 18 coppie di auto parcheggiate una dentro l'altra intorno a (1294–1304, 309–344), da parkSpot in game.js.
- popolo.js mette gli NPC «affacciati sull'acqua» fuori dal pontile visibile: la zona camminabile è a quadretti di 2 m, ma il pontile è largo 2,5 m. Lato regia l'ho tamponato in unico_molo.js; la correzione vera va in popolo.js/game.js.
- I pali di legno non li ho potuti controllare: esistono solo come mesh di disegno.

## Mappa di oggi
v7/_immagini/commedia/mappa_oggi.jpg, disegnata dai dati veri del gioco. Il sottosuolo è grande: 42 tombini, 28 cantine con botola, 20 luoghi sotterranei, una metro a 2 fermate. Il testo è in v7/commedia/MONDO_PIENO.md, parte 1.
