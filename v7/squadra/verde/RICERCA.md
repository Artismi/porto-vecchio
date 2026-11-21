# [verde] Ricerca breve: il verde di una città di porto del Sud, e la varietà a buon mercato

## Che cosa cresce in una città di porto del Sud
- **Lungomare: palme.** Nei lungomari del Sud la palma è la firma: il Falcomatà di Reggio Calabria (palme e ficus), il Trieste di
  Salerno (palme e aiuole fiorite), i viali di palme di San Benedetto del Tronto. Fenice (*Phoenix canariensis*, chioma larga) e
  washingtonia (alta e stretta) insieme fanno il ritmo. ([idealista](https://www.idealista.it/news/node/427669))
- **Viali: pini, lecci, bordure di oleandri.** Nella progettazione dei viali urbani campani ricorrono il filare di pini con lecci e la
  bordura di oleandri, e la riproposta dei filari di palme. ([tesi Viale Augusto, UniNa](https://www.iris.unina.it/retrieve/db12d786-38c9-45af-870d-58bfd31cb41c/LIBRO%20Viale%20Augusto%202020.PDF))
- **Muri: capperi, valeriana rossa, bocca di leone.** Il cappero (*Capparis spinosa*) è la pianta rupicola tipica delle mura antiche,
  delle torri e delle scogliere, coi semi portati nelle crepe dalle formiche e dalle lucertole
  ([Herbari virtual UIB](https://herbarivirtual.uib.cat/en/general/875/especie/taparera), [UniBa](https://ricerca.uniba.it/handle/11586/53631));
  sui muri dei centri storici italiani fioriscono *Centranthus ruber*, *Antirrhinum majus* ed *Erysimum cheiri*
  ([Micol. Veget. Medit., UnivAQ](https://ricerca.univaq.it/bitstream/11697/114826/1/Articolo%20sui%20muri%20Altipiani%20Micol.Veg.%20Medit..pdf)).
  Le stesse specie stanno nei muri a secco e sulle rocce ([UIB, habitat](https://herbarivirtual.uib.es/en/general/habitat/38/rocky-surfaces-and-dry-stone-walls/especies)).
- **Sui muri al sole la bouganville, all'ombra l'edera**; agavi e fichi d'India sulle rocce e sui bordi asciutti; tamerici sulla sabbia e
  sui piazzali al vento; agrumi nei cortili e nei giardini. (Conoscenza di dominio; non ho trovato un manuale di arredo del litorale
  con l'elenco delle specie: resta da cercare nei Piani del verde dei comuni, ad es. Reggio Calabria, Salerno, Bari.)

## Come i giochi stilizzati fanno varietà senza disegni in più
- **Attributi per istanza nello stesso disegno**: tinta, scala, giro per istanza in un buffer (instancing); è il modo indicato da Unity
  per rompere la ripetizione senza materiali nuovi ([Unity, GPU instancing](https://docs.unity3d.com/es/2018.3/Manual/GPUInstancing.html)).
  In Unreal lo stesso con *Per Instance Random* verso un giro di tinta
  ([forum Unreal](https://forums.unrealengine.com/t/color-variation-with-foliage-painting/124123)); in three.js una foresta istanziata
  con luminosità e tinta per albero precalcolate ([discourse three.js](https://discourse.threejs.org/t/procedural-instanced-forest-high-performance-real-trees/88610.md)).
  Attenzione: la tinta dal rumore della posizione nel mondo dà la stessa tinta alle piante vicine; serve un caso per istanza.
- **Pochi archetipi di sagoma × varianti di colore**: la sagoma si legge da lontano, il colore da vicino. Meglio 2 sagome per specie
  e 5 tinte che 8 modelli (ogni modello è un disegno).
- **A gruppi con un ritmo, non sparse**: macchie e vuoti (vie fiorite e vie spoglie), filari solo dove la città li vuole.
- **Gli accenti fioriti pochi e saturi** sopra una massa di verdi vicini: la scena si tiene, l'occhio va al fiore.
- **Rampicanti e vasi come verde di città**: dove non c'è terra, il verde sta sui muri, nelle crepe, nei vasi.

## Che cosa ne ho fatto (file:riga)
- `Vegetazione.citta(W, opz)` (src/vegetazione.js:477-582): le specie del kit messe in città dove stanno, coi loro ritmi (muri al
  sole/ombra, crepe e giunti, lungomare P-P-W, rocce, ghiaia, prati della Villa), lontane dai fronti (Chiarezza.davanti), dalla
  Vittoria spazzata, dalla Piazza della Rocca libera e dagli alberi di render.js; una variante per specie (due per palma e
  bouganville), cinque tinte di bouganville in `p.c`; le piante piccole senza sagoma a media distanza. Non si cuoce: si calcola alla
  posa, sempre uguale.
- `monta` (src/vegetazione.js `metti`, ≈1457): per ogni istanza di tutto il verde, dal posto: valore ±11%, caldo/freddo ±7%,
  altezza ±9% e larghezza ∓4%, piega ±2° (alberi) ±4° (arbusti, erba), i rampicanti dritti sul muro; la tinta della pianta sopra.
- Il materiale (src/vegetazione.js, `uAccento`, ≈1092 e ≈1146): i pixel saturi, chiari, non verdi (fiori, frutti) prendono dalla gamma
  solo il valore a fasce e tengono la tinta piena. Le fasce restano, il fumetto resta.
- render.js: gli alberi di città ognuno un po' suo (valore ±7%, oliva/azzurro ±5%, altezza ±7%, senza toccare i dadi delle varianti,
  `albero4` ≈8250); niente lecci sulla sabbia del Lido (ci vanno le palme, ≈8218); i ciuffi del kit con otto tinte invece di cinque
  (verde fresco, paglia); `vegMonta` passa a `monta` gli alberi di città da evitare (≈3435).
