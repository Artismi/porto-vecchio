# Il pianificatore urbano — Porto Vecchio, critica e proposta

## 1. Critica: com'è oggi

Ho guardato la pianta (x 1060-1680, y 220-470) e due foto 3D (borgo a 1420,350; metropoli a 1200,340).

- **Non c'è una gerarchia delle strade.** Le otto strade maestre sono tutte larghe 6-8 m, anche dentro il borgo. Il ventaglio dalla Porta taglia il borgo in sette o otto spicchi di asfalto: in pianta il grigio scuro è il disegno dominante, in 3D il borgo è un mare lilla con torri isolate. Un borgo genovese o pugliese ha **una sola** strada sopra i 4 m.
- **Le case sono oggetti isolati, non tessuto.** Le case stanno in piedi da sole con prato o ciottoli tutto intorno. Mancano fronti continui, muri in comune e isolati chiusi. Il verde nelle pance degli isolati è avanzo, non giardino. La copertura è circa la stessa (~45%) nel borgo, al centro e nella metropoli: il gradiente esiste solo nel codice (passo 10/13/18 m), l'occhio non lo vede.
- **Le tre maglie si toccano a caso.** Le cuciture del codice ("lega il nodo al più vicino") non producono un margine leggibile. Fra borgo e griglia non c'è un corso, né una piazza del mercato, né mura demolite.
- **Non c'è il tempo.** Tutto è generato nello stesso momento con la stessa logica. Nessuna strada taglia un tessuto più vecchio, e quindi non ci sono muri ciechi, mezze case, lotti a cuneo o cicatrici.
- **Lynch: zero.** Non c'è un landmark visibile dai vicoli, non c'è un percorso dominante e non ci sono nodi con un nome. La spianata è una striscia beige di pochi metri, la ferrovia una linea rossa staccata dalla città. La metropoli è fatta degli stessi palazzotti del borgo, solo più radi, e ha un parco che si mangia un terzo della città.

## 2. Principio: il generatore scrive la storia in ordine

Ogni epoca **scrive sulla griglia**, e quelle dopo **cancellano, tagliano e riempiono**. La stratificazione non va decorata: viene fuori da sola se il generatore lavora come la storia. Dove un'epoca taglia la precedente, il bordo del taglio produce sempre: muri ciechi (tela dei graffiti), case tagliate a metà, lotti triangolari residui, slarghi senza disegno.

Coordinate in metri finali. La città è piccola (390 × 220 m, circa Bari Vecchia), quindi ogni metro va progettato.

## 3. Le epoche (in ordine di generazione)

**E1 — Borgo medievale (XII-XVI sec.), x 1330-1445**
- **Dorsale** di cresta da ovest a est, larga 4 m, che serpeggia attorno a y≈320 (±12 m). Da lì partono **vicoli a pettine** (Molfetta) verso nord e verso sud, ogni 9-12 m, larghi 2 m, con curvature di ±15°: ognuno **finisce sul mare o sulle mura**, così l'orientamento è gratis.
- Case strette (fronte 4-6 m, profondità 8-12 m), **in aderenza**, 3-5 piani, ruotate fino a 30° lungo il vicolo. Copertura **70-75%**. Il vuoto sta solo in corti chiuse (6×8 m, COB, mai GRASS), in scalinate e in archi/sottopassi (una casa sopra un vicolo ogni ~40 m).
- **Quattro piazzette messe apposta**, non per caso: la Chiesa Madre col campanile (16×12 m, sulla dorsale), il Pozzo, il Forno, la Marina. Si arriva da vicoli larghi 2 m, così si aprono all'improvviso.
- Mura di tramontana sulla costa nord con camminamento; a sud la marina del porto vecchio (fronte colorato alla Procida, 6 m di calata).

**E2 — Seicento (1670-90): la Rocca e la spianata, x 1445-1610**
- La Rocca resta dov'è. La **spianata di 45 m (x 1445-1490) si genera DEMOLENDO** il bordo est del borgo E1: i vicoli finiscono di colpo nel vuoto e le case di testa hanno il **lato cieco** verso la Rocca. È la scena del regime e il primo vero margine.
- La Porta di Terra del borgo (a ovest, x≈1325, y≈345): due torrioni, è l'origine del mercato.

**E3 — Ottocento (1860-1910): mura abbattute e griglia, x 1215-1330**
- Al posto delle mura di terra: la **Circonvallazione alberata, 14 m**, ad arco da costa a costa a x≈1325. È il margine fra borgo e città.
- Sulla Porta di Terra la **Piazza del Mercato**, ottagonale, 50 m (x 1290-1340, y 320-370), con tettoie in ghisa e mercato coperto.
- Griglia murattiana: **isolati a corte 36×28 m**, strade di 8 m, angolo 0°, case in aderenza di 3-4 piani, copertura 60%, corte interna con lavatoi, garage e laboratori. Un **corso porticato** da nord a sud porta alla **Stazione** sulla costa nord (x≈1260).

**E4 — Ventennio (1930-38): lo sventramento**
- **Via della Vittoria, 16 m, perfettamente dritta**, dal Mercato alla Porta della Rocca (1330,350 → 1490,340): **taglia il borgo E1** in diagonale. Ai lati ha portici e blocchi di 5 piani in pietra, e il **cannocchiale** punta sempre sulla Porta. Ai bordi del taglio ci sono monconi di vicoli, case tranciate e piccoli lotti a cuneo diventati bar, edicole e gradinate.
- La Casa del Fascio sul Mercato, che oggi è il Ministero dell'Ordine.

**E5 — Boom (1955-75): la metropoli, x 1100-1215**
- La griglia E3 continua, ma i lotti vengono **riempiti con torri di 8-14 piani** (copertura 40%, piante più profonde). I vuoti fra le torri sono **parcheggi e piazzali di asfalto**, non prato.
- La **sopraelevata** (viadotto su piloni, 10 m) corre parallela alla ferrovia a y≈265 e scende sulla Circonvallazione: la Jerome Avenue di Porto Vecchio, con sotto mercatini, officine e campetti.
- **Le Vele** sulla punta ovest (x 1100-1150): due stecche di 120 m **ruotate di 25°** rispetto alla griglia. È la regola rotta più grande e il landmark della periferia.
- Ferrovia sulla costa nord: fra binari e mare, una **striscia di baracche di 8-15 m** (lamiera, 1-2 piani, vicoli di 1 tile). Stessa cosa sui tetti delle Vele (superfetazioni): la favela cyberpunk.

**E6 — Il Garante (1978-86)**
- Il Muro sul bordo della spianata, posti di blocco su Via della Vittoria e sulla Circonvallazione.
- **Due isolati rasi al suolo** come punizione (uno in E3, uno nel borgo): oggi lotti vuoti, campetti e parcheggi recintati, sui muri ciechi i graffiti più grandi della città.
- L'unico **giardino pubblico** vero (40×30 m, a filari) sta sulla Circonvallazione. Il parco grande attuale va eliminato.

## 4. Lynch: la mappa mentale

- **Percorsi** (solo 3 dominanti): la Dorsale (storta), Via della Vittoria (dritta), la Circonvallazione (ad arco). Tutti gli altri sono secondari.
- **Margini**: il mare, la spianata, la Circonvallazione, la ferrovia con le baracche, la sopraelevata.
- **Quartieri**: Borgo, Città Murattiana, Torri, Baracche.
- **Nodi**: Mercato, Spianata, Stazione, Piazza della Marina.
- **Landmark**: il cavaliere della Rocca col riflettore, il campanile, le Vele, il gasometro alla stazione. Due di questi devono essere visibili da quasi ogni incrocio.

## 5. Regole generative e misure

- Larghezze: vicolo 2 m · dorsale/marina 4 m · strada E3 8 m · corso e Circonvallazione 14 m · Vittoria 16 m. **Nel borgo nessuna strada sopra i 4 m tranne la Vittoria.**
- Fronti: `walkFront` posa le case **in aderenza**, senza buchi. Varco di 1 tile solo ogni 3-5 case nel borgo, mai in E3.
- Avanzi: dentro gli isolati, niente prato. Si usano COB (corte), PIAZZA (cortile asfaltato) o una casa che riempie il buco.
- Tagli: quando E4 ed E6 attraversano un tessuto vecchio, ogni casa tagliata diventa un muro cieco (bandiera per i graffiti) e ogni lotto residuo sotto i 30 m² diventa uno slargo.
- Irregolarità controllata: il 10% delle case del borgo fuori dal filo di 1 tile, il 5% delle torri ruotate di 15-30°, una via E3 che piega (segue un vecchio sentiero).

## 6. Da evitare

Il ventaglio simmetrico di strade larghe; le torri del borgo staccate dal resto; il prato come riempitivo; le piazzette messe a caso per hash; lo stesso modulo di casa in tutte le epoche; un parco che occupa un terzo della città.
