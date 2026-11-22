# [pieno] Ricerca breve: che cosa fa sembrare «vissuta» una via di porto del Sud, e come i giochi stilizzati la riempiono senza pagarla

## 1. La via vera (Napoli, Palermo, il porto; anni '80)

- **I muri si scrivono addosso, a strati.** Il manifesto della processione incollato sopra l'annuncio funebre, a sua volta sopra uno
  slogan politico vecchio; carta strappata e intonaco scoperto uno accanto all'altro; vernice nuova sopra vernice vecchia; tubi e fili
  aggiunti quando servono ([Curto, «The City Writes on Itself»](https://jeffcurto.substack.com/p/naples-scratching-the-surface)).
  Regola per noi: **niente pezzo singolo pulito**, ogni punto di muro «abitato» è un gruppo a strati (manifesti 2-3 fogli, tag in colonna
  di mani diverse, adesivi a grappolo).
- **I manifesti funebri** (fogli bianchi bordati di nero, la croce, il nome grande) sono il segno più riconoscibile del Sud: stanno
  vicino alle chiese e nei vicoli, all'altezza degli occhi, e invecchiano ingialliti sotto quelli nuovi (stessa fonte).
- **Le edicole votive** sugli spigoli dei vicoli, coi lumini, i fiori di plastica o veri, i santini; spesso accese, curate dal vicinato
  ([DMO Napoli, «Votive Shrines and Neighbourhood Altars»](https://dmo-napoli.inera.it/en/article/votive-shrines-and-neighbourhood-altars-the-sacred-soul-of-the-alleys/);
  [Italy Segreta, «The altarini of Naples»](https://italysegreta.com/the-altarini-of-naples/)). Le edicole il gioco le ha già: mancano
  i lumini e i fiori ai piedi.
- **Le serrande abbassate** delle botteghe chiuse e dei magazzini sono la tela preferita della strada: tag, throw-up, la scritta
  «passo carrabile», a volte la serranda dipinta per intero su commissione del negoziante (osservazione comune nelle guide alla street art di
  [Napoli](https://www.italia.it/en/campania/naples/things-to-do/naples-itinerary-murals-and-street-art) e
  [Palermo](https://www.italia.it/en/sicily/palermo/things-to-do/street-art-palermo)).
- **La vita fuori dalla porta**: le sedie di plastica fuori dal bar e la sedia della signora accanto al portone, le cassette della frutta
  e del pesce, la cassa di birra vuota, i bidoni della differenziata ai piedi di una fontana, il bucato teso sopra il vicolo, la bici o il
  motorino appoggiati ([Curto](https://jeffcurto.substack.com/p/naples-scratching-the-surface); la tradizione pittoresca del bucato nei
  vicoli: [Writingplace, TU Delft](https://journals.open.tudelft.nl/writingplace/article/download/6353/5271/21163)). Il motorino
  parcheggiato c'è già (le Vespe vere e guidabili accanto ai bar, `game.js:615`): non lo si duplica con un finto.
- **Il suolo racconta**: i mozziconi e i tappi davanti al bar, la macchia d'olio, il gesso dei bambini (la campana), la vernice caduta sotto
  il muro dei writer.
- **L'epoca**: il gioco è il 1986 italiano (`render.js:3007`, «nomi inventati, il 1986 italiano»). Niente condizionatori a split sulle
  facciate basse né cartelli moderni; i nomi delle serate, delle crew e dei negozi sono quelli già inventati in `strada_dipinta.js`
  (CREW, MAN, LOGHI).

## 2. Come lo fanno i giochi stilizzati (densità a buon mercato)

- **Gruppi che raccontano, non spruzzi a caso**: le cose si mettono dove si accumulano davvero (angoli, piedi dei muri, accanto alle
  porte), a grappolo, con un perché ([80.lv, vicoli del Vietnam](https://80.lv/articles/creating-an-environment-to-capture-the-atmosphere-of-the-back-alleys-of-vietnam);
  [80.lv, angolo di strada «storytelling»](https://80.lv/articles/creating-a-storytelling-street-corner-scene-with-painterly-effects)).
  Le «piccole storie» di questo strato: bar (sedie, casse), bottega (cassette), vicolo (sedia), writer (cassa, bombolette), edicola (lumini).
- **Le decalcomanie rompono la ripetizione** dei moduli e la linea muro-suolo; desaturate e tinte nel motore
  ([80.lv, via italiana stilizzata](https://80.lv/articles/see-how-to-texture-cozy-stylized-street-of-italian-town);
  [80.lv, trim sheet e decal](https://80.lv/articles/005cg-001agt-sanxia-street-1940-modular-approach-trim-sheets-decals)).
- **Un atlante, un materiale, l'istanza dice il riquadro**: in three.js le istanze condividono materiale e trasformazione delle uv, quindi
  si mette tutto in un atlante e si passa un attributo per istanza (offset e scala del riquadro) rimappando `uv` nel vertex shader
  ([three.js forum, offset dell'atlante in InstancedMesh](https://discourse.threejs.org/t/how-to-apply-offsets-for-texture-atlas-in-instancedmesh/33191);
  [centinaia di piani con tessiture diverse](https://discourse.threejs.org/t/instancedmesh-can-it-be-used-to-draw-hundreds-of-planes-with-different-textures/13221)).
  Così centinaia di decalcomanie costano **un disegno**.
- **Le cose piccole in una geometria sola coi colori nei vertici**, rifatta attorno alla camera: un disegno per tutte, nessuna tessitura.
- **All'altezza degli occhi**: con la camera alta il dettaglio che conta sta fra 0 e 2,5 m sul muro e sul suolo davanti; sopra, basta il
  ritmo delle finestre.

## 3. Che cosa ne viene (le scelte di `src/pieno.js`)

1. Un atlante solo, disegnato in gioco coi pennelli che il gioco ha già (`writer_arte.js art`: tag, throw-up, adesivi, manifesti a strati
   nella tavolozza E) più pochi disegni a mano (serrande, funebri, civici di maiolica, colature, vernice a terra, gesso, mozziconi, macchie).
2. Due disegni in tutto: un InstancedMesh con il riquadro per istanza, una geometria di cose a vertici colorati.
3. Regole, non coordinate: le zone e il ritmo di `strada_dipinta.js`, i moduli di muro pieno del piano terra (`b.__win`), i raggi dei
   graffiti per l'aderenza, le zone libere davanti a porte, vetrine e tombini.
